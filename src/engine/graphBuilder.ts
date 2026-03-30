import { Node, Edge } from "reactflow";
import { Question, QuestionLogic, LoopBlock, LogicNode } from "../types/logic";

// ============================================================================
// UTILITIES
// ============================================================================

const extractAllParentIds = (
  node: LogicNode | null | undefined,
  ids = new Set<string>()
): string[] => {
  if (!node) return [];
  if (node.type === "leaf" && node.questionId) {
    ids.add(node.questionId.toString());
  } else if (node.type === "branch" && node.children) {
    node.children.forEach((c) => extractAllParentIds(c, ids));
  }
  return Array.from(ids);
};

// ============================================================================
// PATH CALCULATOR ENGINE
// ============================================================================

function buildPathAdjacencyList(nodes: Node[], edges: Edge[]) {
  const adjList: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};

  nodes.forEach((n) => {
    if (!n.id.startsWith("TERM-")) {
      adjList[n.id] = [];
      inDegree[n.id] = 0;
    }
  });

  edges.forEach((e) => {
    if (
      e.source &&
      e.target &&
      adjList[e.source] &&
      !e.target.startsWith("TERM-") &&
      !e.id.startsWith("loop-") &&
      !e.id.startsWith("ld-logic-")
    ) {
      if (!adjList[e.source].includes(e.target)) {
        adjList[e.source].push(e.target);
        if (inDegree[e.target] !== undefined) inDegree[e.target]++;
      }
    }
  });

  return { adjList, inDegree };
}

function findPathRoots(
  adjList: Record<string, string[]>,
  inDegree: Record<string, number>
): string[] {
  const roots = Object.keys(inDegree).filter((id) => inDegree[id] === 0);
  if (roots.length === 0 && Object.keys(adjList).length > 0) {
    roots.push(Object.keys(adjList)[0]);
  }
  return roots;
}

function extractPathsUsingDFS(
  roots: string[],
  adjList: Record<string, string[]>
): string[][] {
  const paths: string[][] = [];

  function dfs(current: string, currentPath: string[]) {
    const nextNodes = adjList[current];

    if (!nextNodes || nextNodes.length === 0) {
      paths.push([...currentPath]);
      return;
    }

    nextNodes.forEach((next) => {
      if (!currentPath.includes(next)) {
        dfs(next, [...currentPath, next]);
      }
    });
  }

  roots.forEach((r) => dfs(r, [r]));
  return paths;
}

export function calculateAllPaths(nodes: Node[], edges: Edge[]): string[][] {
  const { adjList, inDegree } = buildPathAdjacencyList(nodes, edges);
  const roots = findPathRoots(adjList, inDegree);
  return extractPathsUsingDFS(roots, adjList);
}

// ============================================================================
// GRAPH LAYOUT ENGINE
// ============================================================================

function analyzeDependencies(
  refinedQuestions: Question[],
  logicMap: Record<string, QuestionLogic>
) {
  const branchChildren: Record<string, string[]> = {};
  const isBranchChild = new Set<string>();
  const longDistanceDependencies: { source: string; target: string }[] = [];

  refinedQuestions.forEach((q, currentIndex) => {
    const qId = q.id.toString();
    const allParents = extractAllParentIds(logicMap[qId]?.show);

    if (allParents.length > 0) {
      const parentInfos = allParents
        .map((pId) => ({
          id: pId,
          index: refinedQuestions.findIndex((rq) => rq.id.toString() === pId),
        }))
        .filter((p) => p.index !== -1)
        .sort((a, b) => b.index - a.index);

      if (parentInfos.length > 0) {
        const primaryParent = parentInfos[0];
        let hasUnconditionalBetween = false;

        for (let i = primaryParent.index + 1; i < currentIndex; i++) {
          const middleId = refinedQuestions[i].id.toString();
          const middleParents = extractAllParentIds(logicMap[middleId]?.show);
          if (middleParents.length === 0) {
            hasUnconditionalBetween = true;
            break;
          }
        }

        if (hasUnconditionalBetween) {
          longDistanceDependencies.push({
            source: primaryParent.id,
            target: qId,
          });
        } else {
          if (!branchChildren[primaryParent.id])
            branchChildren[primaryParent.id] = [];
          branchChildren[primaryParent.id].push(qId);
          isBranchChild.add(qId);
        }

        for (let i = 1; i < parentInfos.length; i++) {
          longDistanceDependencies.push({
            source: parentInfos[i].id,
            target: qId,
          });
        }
      }
    }
  });

  return { branchChildren, isBranchChild, longDistanceDependencies };
}

function calculatePositionsAndBaseEdges(
  refinedQuestions: Question[],
  branchChildren: Record<string, string[]>,
  isBranchChild: Set<string>,
  config: {
    MAX_NODES: number;
    X_SPACE: number;
    Y_SPACE: number;
    ROW_SPACE: number;
  }
) {
  const positions: Record<string, { x: number; y: number }> = {};
  const edges: Edge[] = [];

  let curXIndex = 0;
  let currentYPixel = 0;
  let dir = 1;

  let previousTrunkId: string | null = null;
  let prevPos: { x: number; y: number } | null = null;
  let previousLeaves: string[] = [];

  const getHandles = (
    fromPos: { x: number; y: number },
    toPos: { x: number; y: number }
  ) => {
    if (toPos.y > fromPos.y) return { s: "bottom-s", t: "top-t" };
    if (toPos.x > fromPos.x) return { s: "right-s", t: "left-t" };
    return { s: "left-s", t: "right-t" };
  };

  refinedQuestions.forEach((q) => {
    const qId = q.id.toString();

    // Only process main trunk nodes in this top-level loop
    if (isBranchChild.has(qId)) return;

    const currentPos = { x: curXIndex * config.X_SPACE, y: currentYPixel };
    positions[qId] = currentPos;

    // Connect Trunk to previous Convergence Leaves (e.g., DT1 to DV)
    if (previousLeaves.length > 0) {
      previousLeaves.forEach((leafId) => {
        edges.push({
          id: `seq-${leafId}-${qId}`,
          source: leafId,
          target: qId,
          sourceHandle: "bottom-s",
          targetHandle: "top-t",
          type: "smoothstep",
          style: { stroke: "#9ca3af", strokeWidth: 2 },
        });
      });
    } else if (previousTrunkId && prevPos) {
      const handles = getHandles(prevPos, currentPos);
      edges.push({
        id: `seq-${previousTrunkId}-${qId}`,
        source: previousTrunkId,
        target: qId,
        sourceHandle: handles.s,
        targetHandle: handles.t,
        type: "smoothstep",
        style: { stroke: "#9ca3af", strokeWidth: 2 },
      });
    }

    const branches = branchChildren[qId] || [];

    if (branches.length > 0) {
      let maxClusterY = currentYPixel;
      let currentClusterLeaves: string[] = [];

      // THE FIX: Recursive function to deeply place all nested branches (e.g., S6 -> S8 -> DT1)
      function placeBranchesRecursively(
        pId: string,
        pPos: { x: number; y: number }
      ) {
        const children = branchChildren[pId] || [];

        // If it has no children, it is a dead end (leaf). Mark it for convergence!
        if (children.length === 0) {
          currentClusterLeaves.push(pId);
          maxClusterY = Math.max(maxClusterY, pPos.y);
          return;
        }

        const bY = pPos.y + config.Y_SPACE;
        const tWidth = (children.length - 1) * config.X_SPACE;
        const sX = Math.max(0, pPos.x - tWidth / 2);

        children.forEach((childId, idx) => {
          const cPos = { x: sX + idx * config.X_SPACE, y: bY };
          positions[childId] = cPos;

          edges.push({
            id: `branch-${pId}-${childId}`,
            source: pId,
            target: childId,
            sourceHandle: "bottom-s",
            targetHandle: "top-t",
            type: "smoothstep",
            animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 2 },
          });

          placeBranchesRecursively(childId, cPos); // Recurse deeper!
        });
      }

      // Trigger recursion for the first level of branches
      const branchY = currentYPixel + config.Y_SPACE;
      const totalWidth = (branches.length - 1) * config.X_SPACE;
      const startX = Math.max(0, currentPos.x - totalWidth / 2);

      branches.forEach((bId, idx) => {
        const bPos = { x: startX + idx * config.X_SPACE, y: branchY };
        positions[bId] = bPos;
        edges.push({
          id: `branch-${qId}-${bId}`,
          source: qId,
          target: bId,
          sourceHandle: "bottom-s",
          targetHandle: "top-t",
          type: "smoothstep",
          animated: true,
          style: { stroke: "#3b82f6", strokeWidth: 2 },
        });
        placeBranchesRecursively(bId, bPos);
      });

      // Break the snake path, skip down below the deepest nested branch, and reset
      currentYPixel = maxClusterY + config.ROW_SPACE;
      curXIndex = 0;
      dir = 1;

      previousLeaves = currentClusterLeaves; // The leaves will converge to the next Trunk
      previousTrunkId = qId;
      prevPos = currentPos;
    } else {
      // Standard snake pagination wrap
      if (dir === 1) {
        if (curXIndex >= config.MAX_NODES - 1) {
          currentYPixel += config.ROW_SPACE;
          dir = -1;
        } else {
          curXIndex++;
        }
      } else {
        if (curXIndex <= 0) {
          currentYPixel += config.ROW_SPACE;
          dir = 1;
        } else {
          curXIndex--;
        }
      }

      previousLeaves = [];
      previousTrunkId = qId;
      prevPos = currentPos;
    }
  });

  return { positions, baseEdges: edges };
}

function createReactFlowNodesAndTerminations(
  refinedQuestions: Question[],
  positions: Record<string, { x: number; y: number }>,
  logicMap: Record<string, QuestionLogic>,
  loopBlocks: LoopBlock[],
  readableCondition: (node: LogicNode | null | undefined) => string
) {
  const nodes: Node[] = [];
  const terminationEdges: Edge[] = [];

  refinedQuestions.forEach((q) => {
    const qId = q.id.toString();
    const pos = positions[qId];
    if (!pos) return;

    const logic = logicMap[qId];
    const isInLoop = loopBlocks.some((loop) => {
      const startIdx = refinedQuestions.findIndex(
        (rq) => rq.id.toString() === loop.startQuestionId
      );
      const endIdx = refinedQuestions.findIndex(
        (rq) => rq.id.toString() === loop.endQuestionId
      );
      const qIdx = refinedQuestions.findIndex((rq) => rq.id.toString() === qId);
      return qIdx >= startIdx && qIdx <= endIdx;
    });

    // Main Question Node
    nodes.push({
      id: qId,
      type: "questionNode",
      position: pos,
      data: {
        label: q.name,
        fullName: q.fullName,
        type: q.type,
        sectionName: q.sectionName,
        hasLogic: !!logic?.show,
        logicText: logic?.show ? readableCondition(logic.show) : undefined,
        isInLoop,
      },
      className: isInLoop
        ? "border-2 border-dashed border-orange-500 bg-orange-50"
        : "",
    });

    // Termination Node
    if (logic?.terminate) {
      const termId = `TERM-${qId}`;
      nodes.push({
        id: termId,
        type: "output",
        position: { x: pos.x + 130, y: pos.y + 80 },
        data: { label: "🛑 TERMINATE" },
        className:
          "bg-red-50 border border-red-500 text-red-700 text-xs w-[110px] text-center rounded z-10",
      });

      terminationEdges.push({
        id: `e-term-${qId}`,
        source: qId,
        target: termId,
        sourceHandle: "bottom-s",
        targetHandle: "left-t",
        type: "smoothstep",
        style: { stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "4 4" },
      });
    }
  });

  return { mappedNodes: nodes, terminationEdges };
}

function createSpecialEdges(
  longDistanceDependencies: { source: string; target: string }[],
  loopBlocks: LoopBlock[]
) {
  const edges: Edge[] = [];

  longDistanceDependencies.forEach((dep) => {
    edges.push({
      id: `ld-logic-${dep.source}-${dep.target}`,
      source: dep.source,
      target: dep.target,
      sourceHandle: "bottom-s",
      targetHandle: "top-t",
      type: "smoothstep",
      animated: true,
      style: {
        stroke: "#3b82f6",
        strokeWidth: 2,
        strokeDasharray: "5 5",
        opacity: 0.6,
      },
    });
  });

  loopBlocks.forEach((loop) => {
    edges.push({
      id: `loop-${loop.id}`,
      source: loop.endQuestionId,
      target: loop.startQuestionId,
      label: "Next Iteration",
      type: "step",
      animated: true,
      style: { stroke: "#f97316", strokeWidth: 3, strokeDasharray: "5 5" },
      labelStyle: {
        fill: "#c2410c",
        fontWeight: "bold",
        fontSize: 12,
        background: "#fff",
      },
      sourceHandle: "left-s",
      targetHandle: "left-t",
    });
  });

  return edges;
}

// ============================================================================
// MAIN EXPORT (ORCHESTRATOR)
// ============================================================================

export function buildGraphLevelLayout(
  refinedQuestions: Question[],
  logicMap: Record<string, QuestionLogic>,
  loopBlocks: LoopBlock[],
  readableCondition: (node: LogicNode | null | undefined) => string,
  MAX_NODES_PER_LEVEL = 5,
  X_SPACING = 320,
  Y_SPACING = 220,
  ROW_SPACING = 120
): { nodes: Node[]; edges: Edge[] } {
  const { branchChildren, isBranchChild, longDistanceDependencies } =
    analyzeDependencies(refinedQuestions, logicMap);

  const { positions, baseEdges } = calculatePositionsAndBaseEdges(
    refinedQuestions,
    branchChildren,
    isBranchChild,
    {
      MAX_NODES: MAX_NODES_PER_LEVEL,
      X_SPACE: X_SPACING,
      Y_SPACE: Y_SPACING,
      ROW_SPACE: ROW_SPACING,
    }
  );

  const { mappedNodes, terminationEdges } = createReactFlowNodesAndTerminations(
    refinedQuestions,
    positions,
    logicMap,
    loopBlocks,
    readableCondition
  );

  const specialEdges = createSpecialEdges(longDistanceDependencies, loopBlocks);

  return {
    nodes: mappedNodes,
    edges: [...baseEdges, ...terminationEdges, ...specialEdges],
  };
}
