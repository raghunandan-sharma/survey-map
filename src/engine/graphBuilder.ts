import { Node, Edge } from "reactflow";
import { Question, QuestionLogic, LoopBlock } from "../types/logic";

// Helper to extract parent ID from AST
const extractParentId = (node: any): string | null => {
  if (!node) return null;
  if (node.type === "leaf") return node.questionId?.toString() || null;
  if (node.type === "branch" && node.children?.length > 0)
    return extractParentId(node.children[0]);
  return null;
};

export function calculateAllPaths(nodes: Node[], edges: Edge[]): string[][] {
  const adjList: Record<string, string[]> = {};
  nodes.forEach((n) => (adjList[n.id] = []));

  edges.forEach((e) => {
    if (e.source && e.target && adjList[e.source]) {
      adjList[e.source].push(e.target);
    }
  });

  // Find the root node (usually the first node with no incoming edges)
  const inDegree: Record<string, number> = {};
  nodes.forEach((n) => (inDegree[n.id] = 0));
  edges.forEach((e) => {
    if (e.target && inDegree[e.target] !== undefined) inDegree[e.target]++;
  });

  // Get root nodes, excluding TERMINATE nodes
  const roots = nodes
    .filter((n) => inDegree[n.id] === 0 && !n.id.startsWith("TERM-"))
    .map((n) => n.id);

  if (roots.length === 0 && nodes.length > 0) roots.push(nodes[0].id);

  const paths: string[][] = [];

  function dfs(current: string, currentPath: string[]) {
    const nextNodes = adjList[current];
    const termNode = edges.find(
      (e) => e.source === current && e.target.startsWith("TERM-")
    )?.target;

    // If a node terminates the survey, that path ends here
    if (termNode) {
      paths.push([...currentPath, termNode]);
    }

    // If it's a leaf node (end of the survey)
    if (!nextNodes || nextNodes.length === 0) {
      if (!termNode) paths.push([...currentPath]);
      return;
    }

    nextNodes.forEach((next) => {
      if (next.startsWith("TERM-")) return; // Handled above

      // Prevent infinite loops if your survey has loop blocks
      if (!currentPath.includes(next)) {
        dfs(next, [...currentPath, next]);
      }
    });
  }

  roots.forEach((r) => dfs(r, [r]));
  return paths;
}

export function buildGraphLevelLayout(
  refinedQuestions: Question[],
  logicMap: Record<string, QuestionLogic>,
  loopBlocks: LoopBlock[],
  readableCondition: (node: any) => string,
  MAX_NODES_PER_LEVEL = 5,
  X_SPACING = 320,
  Y_SPACING = 220,
  ROW_SPACING = 120
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const branchChildren: Record<string, string[]> = {};
  const isBranchChild = new Set<string>();

  // 1. Map all branches to their parents
  refinedQuestions.forEach((q) => {
    const qId = q.id.toString();
    const parentId = extractParentId(logicMap[qId]?.show);
    if (parentId) {
      if (!branchChildren[parentId]) branchChildren[parentId] = [];
      branchChildren[parentId].push(qId);
      isBranchChild.add(qId);
    }
  });

  // 2. Layout State
  let curX = 0;
  let curY = 0;
  let dir = 1; // 1 = Right, -1 = Left
  const positions: Record<string, { x: number; y: number }> = {};

  let previousTrunkId: string | null = null;
  let prevPos: { x: number; y: number } | null = null;
  let previousBranches: string[] = []; // Tracks if we need to converge edges

  // Helper for snake routing handles
  const getHandles = (
    fromPos: { x: number; y: number },
    toPos: { x: number; y: number }
  ) => {
    if (toPos.y > fromPos.y) return { s: "bottom-s", t: "top-t" }; // Dropped a row
    if (toPos.x > fromPos.x) return { s: "right-s", t: "left-t" }; // Flowing right
    return { s: "left-s", t: "right-t" }; // Flowing left
  };

  refinedQuestions.forEach((q) => {
    const qId = q.id.toString();

    // Branch children are positioned when their parent is processed
    if (isBranchChild.has(qId)) return;

    // A. Position the Trunk Node
    const currentPos = { x: curX * X_SPACING, y: curY * Y_SPACING };
    positions[qId] = currentPos;

    // B. Draw Sequential Edges (Convergence or Trunk-to-Trunk)
    if (previousBranches.length > 0) {
      // Connect all previous branched children to this new trunk node
      previousBranches.forEach((bId) => {
        edges.push({
          id: `seq-${bId}-${qId}`,
          source: bId,
          target: qId,
          sourceHandle: "bottom-s",
          targetHandle: "top-t", // Connect cleanly to the top of the new row
          type: "smoothstep",
          style: { stroke: "#9ca3af", strokeWidth: 2 },
        });
      });
    } else if (previousTrunkId && prevPos) {
      // Connect previous trunk node to this trunk node
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

    // C. Handle branches if this node has them
    const branches = branchChildren[qId] || [];
    if (branches.length > 0) {
      // Drop one level down strictly for branches
      const branchY = currentPos.y + Y_SPACING;
      // Center branches directly under the parent
      const totalWidth = (branches.length - 1) * X_SPACING;
      const startX = currentPos.x - totalWidth / 2;

      branches.forEach((bId, idx) => {
        positions[bId] = { x: startX + idx * X_SPACING, y: branchY };

        // Edge from Parent -> Branch
        edges.push({
          id: `branch-${qId}-${bId}`,
          source: qId,
          target: bId,
          sourceHandle: "bottom-s",
          targetHandle: "top-t",
          label: readableCondition(logicMap[bId]?.show),
          type: "smoothstep",
          animated: true,
          style: { stroke: "#3b82f6", strokeWidth: 2 },
          labelStyle: {
            fill: "#1d4ed8",
            fontWeight: 700,
            fontSize: 11,
            background: "#fff",
          },
        });
      });

      // Crucial: Break the snake path so the NEXT trunk node goes beneath the branches
      curY += 2;
      curX = 0;
      dir = 1; // Reset to flow Right

      previousBranches = branches;
      previousTrunkId = qId;
      prevPos = currentPos;
    } else {
      // Standard snake pagination
      if (dir === 1) {
        if (curX >= MAX_NODES_PER_LEVEL - 1) {
          curY++;
          dir = -1;
        } else {
          curX++;
        }
      } else {
        if (curX <= 0) {
          curY++;
          dir = 1;
        } else {
          curX--;
        }
      }

      previousBranches = [];
      previousTrunkId = qId;
      prevPos = currentPos;
    }
  });

  // 3. Hydrate Node Objects
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
        isInLoop,
      },
      className: isInLoop
        ? "border-2 border-dashed border-orange-500 bg-orange-50"
        : "",
    });

    // Termination Node (Moved offset to the top-right to avoid overlapping children)
    if (logic?.terminate) {
      const termId = `TERM-${qId}`;
      nodes.push({
        id: termId,
        type: "output",
        // Change from y: pos.y - 70 to y: pos.y + 80 to place it below
        position: { x: pos.x + 130, y: pos.y + 80 },
        data: { label: "🛑 TERMINATE" },
        className:
          "bg-red-50 border border-red-500 text-red-700 text-xs w-[110px] text-center rounded z-10",
      });

      edges.push({
        id: `e-term-${qId}`,
        source: qId,
        target: termId,
        // Change sourceHandle to 'bottom-s' so the line comes out the bottom
        sourceHandle: "bottom-s",
        targetHandle: "left-t",
        label: readableCondition(logic.terminate),
        type: "smoothstep",
        style: { stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "4 4" },
        labelStyle: { fill: "#b91c1c", fontSize: 11, background: "#fff" },
      });
    }
  });

  // 4. Loop Edges
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

  return { nodes, edges };
}
