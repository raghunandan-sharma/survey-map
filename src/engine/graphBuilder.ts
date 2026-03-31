import { Node, Edge } from "reactflow";
import {
  Question,
  QuestionLogic,
  SurveyBlock,
  LogicNode,
} from "../types/logic";

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
    node.children.forEach((child) => extractAllParentIds(child, ids));
  }
  return Array.from(ids);
};

// ============================================================================
// PATH CALCULATOR ENGINE
// ============================================================================

function buildPathAdjacencyList(nodes: Node[], edges: Edge[]) {
  const adjacencyList: Record<string, string[]> = {};
  const inDegreeTracker: Record<string, number> = {};

  nodes.forEach((node) => {
    if (!node.id.startsWith("TERM-")) {
      adjacencyList[node.id] = [];
      inDegreeTracker[node.id] = 0;
    }
  });

  edges.forEach((edge) => {
    if (
      edge.source &&
      edge.target &&
      adjacencyList[edge.source] &&
      !edge.target.startsWith("TERM-") &&
      !edge.id.startsWith("loop-") &&
      !edge.id.startsWith("ld-logic-")
    ) {
      if (!adjacencyList[edge.source].includes(edge.target)) {
        adjacencyList[edge.source].push(edge.target);
        if (inDegreeTracker[edge.target] !== undefined) {
          inDegreeTracker[edge.target]++;
        }
      }
    }
  });

  return { adjacencyList, inDegreeTracker };
}

function findPathRoots(
  adjacencyList: Record<string, string[]>,
  inDegreeTracker: Record<string, number>
): string[] {
  const rootNodes = Object.keys(inDegreeTracker).filter(
    (id) => inDegreeTracker[id] === 0
  );
  if (rootNodes.length === 0 && Object.keys(adjacencyList).length > 0) {
    rootNodes.push(Object.keys(adjacencyList)[0]);
  }
  return rootNodes;
}

function extractPathsUsingDFS(
  rootNodes: string[],
  adjacencyList: Record<string, string[]>
): string[][] {
  const validPaths: string[][] = [];

  function performDepthFirstSearch(
    currentNodeId: string,
    currentPath: string[]
  ) {
    const nextNodeIds = adjacencyList[currentNodeId];

    if (!nextNodeIds || nextNodeIds.length === 0) {
      validPaths.push([...currentPath]);
      return;
    }

    nextNodeIds.forEach((nextNodeId) => {
      if (!currentPath.includes(nextNodeId)) {
        performDepthFirstSearch(nextNodeId, [...currentPath, nextNodeId]);
      }
    });
  }

  rootNodes.forEach((rootId) => performDepthFirstSearch(rootId, [rootId]));
  return validPaths;
}

export function calculateAllPaths(nodes: Node[], edges: Edge[]): string[][] {
  const { adjacencyList, inDegreeTracker } = buildPathAdjacencyList(
    nodes,
    edges
  );
  const rootNodes = findPathRoots(adjacencyList, inDegreeTracker);
  return extractPathsUsingDFS(rootNodes, adjacencyList);
}

// ============================================================================
// GRAPH LAYOUT ENGINE
// ============================================================================

function analyzeDependencies(
  refinedQuestions: Question[],
  logicMap: Record<string, QuestionLogic>
) {
  const branchChildrenMap: Record<string, string[]> = {};
  const branchChildSet = new Set<string>();
  const longDistanceDependencies: { source: string; target: string }[] = [];

  refinedQuestions.forEach((currentQuestion, currentIndex) => {
    const questionId = currentQuestion.id.toString();
    const allParentIds = extractAllParentIds(logicMap[questionId]?.show);

    if (allParentIds.length > 0) {
      const parentInformationList = allParentIds
        .map((parentId) => ({
          id: parentId,
          index: refinedQuestions.findIndex(
            (question) => question.id.toString() === parentId
          ),
        }))
        .filter((parentInfo) => parentInfo.index !== -1)
        .sort((a, b) => b.index - a.index);

      if (parentInformationList.length > 0) {
        const primaryParent = parentInformationList[0];
        let hasUnconditionalQuestionBetween = false;

        for (let i = primaryParent.index + 1; i < currentIndex; i++) {
          const middleQuestionId = refinedQuestions[i].id.toString();
          const middleQuestionParents = extractAllParentIds(
            logicMap[middleQuestionId]?.show
          );

          if (middleQuestionParents.length === 0) {
            hasUnconditionalQuestionBetween = true;
            break;
          }
        }

        if (hasUnconditionalQuestionBetween) {
          longDistanceDependencies.push({
            source: primaryParent.id,
            target: questionId,
          });
        } else {
          if (!branchChildrenMap[primaryParent.id])
            branchChildrenMap[primaryParent.id] = [];
          branchChildrenMap[primaryParent.id].push(questionId);
          branchChildSet.add(questionId);
        }

        for (let i = 1; i < parentInformationList.length; i++) {
          longDistanceDependencies.push({
            source: parentInformationList[i].id,
            target: questionId,
          });
        }
      }
    }
  });

  return { branchChildrenMap, branchChildSet, longDistanceDependencies };
}

function calculatePositionsAndBaseEdges(
  refinedQuestions: Question[],
  branchChildrenMap: Record<string, string[]>,
  branchChildSet: Set<string>,
  config: {
    maxNodesPerLevel: number;
    horizontalSpacing: number;
    verticalBranchSpacing: number;
    verticalRowSpacing: number;
  }
) {
  const calculatedPositions: Record<string, { x: number; y: number }> = {};
  const generatedEdges: Edge[] = [];

  let currentHorizontalIndex = 0;
  let currentVerticalPixel = 0;
  let snakeDirection = 1;

  let previousTrunkNodeId: string | null = null;
  let previousTrunkPosition: { x: number; y: number } | null = null;
  let previousConvergingLeaves: string[] = [];

  const getEdgeHandles = (
    fromPosition: { x: number; y: number },
    toPosition: { x: number; y: number }
  ) => {
    if (toPosition.y > fromPosition.y)
      return { sourceHandle: "bottom-s", targetHandle: "top-t" };
    if (toPosition.x > fromPosition.x)
      return { sourceHandle: "right-s", targetHandle: "left-t" };
    return { sourceHandle: "left-s", targetHandle: "right-t" };
  };

  refinedQuestions.forEach((currentQuestion) => {
    const questionId = currentQuestion.id.toString();

    if (branchChildSet.has(questionId)) return;

    const currentPosition = {
      x: currentHorizontalIndex * config.horizontalSpacing,
      y: currentVerticalPixel,
    };
    calculatedPositions[questionId] = currentPosition;

    // Connect previous leaves back to this new trunk node
    if (previousConvergingLeaves.length > 0) {
      previousConvergingLeaves.forEach((leafId) => {
        generatedEdges.push({
          id: `seq-${leafId}-${questionId}`,
          source: leafId,
          target: questionId,
          sourceHandle: "bottom-s",
          targetHandle: "top-t",
          type: "step", // Changed to "step" so parallel converging lines perfectly overlap into one single line
          style: { stroke: "#9ca3af", strokeWidth: 2 },
        });
      });
    } else if (previousTrunkNodeId && previousTrunkPosition) {
      const handles = getEdgeHandles(previousTrunkPosition, currentPosition);
      generatedEdges.push({
        id: `seq-${previousTrunkNodeId}-${questionId}`,
        source: previousTrunkNodeId,
        target: questionId,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        type: "smoothstep",
        style: { stroke: "#9ca3af", strokeWidth: 2 },
      });
    }

    const childBranches = branchChildrenMap[questionId] || [];

    if (childBranches.length > 0) {
      let maximumClusterVerticalPixel = currentVerticalPixel;
      let currentClusterLeaves: string[] = [];

      function placeBranchesRecursively(
        parentId: string,
        parentPosition: { x: number; y: number }
      ) {
        const nestedChildren = branchChildrenMap[parentId] || [];

        if (nestedChildren.length === 0) {
          currentClusterLeaves.push(parentId);
          maximumClusterVerticalPixel = Math.max(
            maximumClusterVerticalPixel,
            parentPosition.y
          );
          return;
        }

        const branchVerticalPixel =
          parentPosition.y + config.verticalBranchSpacing;
        const totalBranchWidth =
          (nestedChildren.length - 1) * config.horizontalSpacing;
        const startHorizontalPixel = Math.max(
          0,
          parentPosition.x - totalBranchWidth / 2
        );

        nestedChildren.forEach((childId, index) => {
          const childPosition = {
            x: startHorizontalPixel + index * config.horizontalSpacing,
            y: branchVerticalPixel,
          };
          calculatedPositions[childId] = childPosition;

          generatedEdges.push({
            id: `branch-${parentId}-${childId}`,
            source: parentId,
            target: childId,
            sourceHandle: "bottom-s",
            targetHandle: "top-t",
            type: "smoothstep",
            animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 2 },
          });

          placeBranchesRecursively(childId, childPosition);
        });
      }

      const topLevelBranchVerticalPixel =
        currentVerticalPixel + config.verticalBranchSpacing;
      const topLevelTotalWidth =
        (childBranches.length - 1) * config.horizontalSpacing;
      const topLevelStartHorizontalPixel = Math.max(
        0,
        currentPosition.x - topLevelTotalWidth / 2
      );

      childBranches.forEach((branchId, index) => {
        const branchPosition = {
          x: topLevelStartHorizontalPixel + index * config.horizontalSpacing,
          y: topLevelBranchVerticalPixel,
        };
        calculatedPositions[branchId] = branchPosition;

        generatedEdges.push({
          id: `branch-${questionId}-${branchId}`,
          source: questionId,
          target: branchId,
          sourceHandle: "bottom-s",
          targetHandle: "top-t",
          type: "smoothstep",
          animated: true,
          style: { stroke: "#3b82f6", strokeWidth: 2 },
        });

        placeBranchesRecursively(branchId, branchPosition);
      });

      currentVerticalPixel =
        maximumClusterVerticalPixel + config.verticalRowSpacing;
      currentHorizontalIndex = 0;
      snakeDirection = 1;

      previousConvergingLeaves = currentClusterLeaves;
      previousTrunkNodeId = questionId;
      previousTrunkPosition = currentPosition;
    } else {
      if (snakeDirection === 1) {
        if (currentHorizontalIndex >= config.maxNodesPerLevel - 1) {
          currentVerticalPixel += config.verticalRowSpacing;
          snakeDirection = -1;
        } else {
          currentHorizontalIndex++;
        }
      } else {
        if (currentHorizontalIndex <= 0) {
          currentVerticalPixel += config.verticalRowSpacing;
          snakeDirection = 1;
        } else {
          currentHorizontalIndex--;
        }
      }

      previousConvergingLeaves = [];
      previousTrunkNodeId = questionId;
      previousTrunkPosition = currentPosition;
    }
  });

  return { calculatedPositions, generatedEdges };
}

function createReactFlowNodesAndTerminations(
  refinedQuestions: Question[],
  calculatedPositions: Record<string, { x: number; y: number }>,
  logicMap: Record<string, QuestionLogic>,
  blocks: Record<string, SurveyBlock>,
  readableCondition: (node: LogicNode | null | undefined) => string
) {
  const reactFlowNodes: Node[] = [];
  const terminationEdges: Edge[] = [];

  refinedQuestions.forEach((question) => {
    const questionId = question.id.toString();
    const position = calculatedPositions[questionId];
    if (!position) return;

    const logic = logicMap[questionId];
    const isQuestionInLoop = question.parentBlocks.some(
      (blockId) => blocks[blockId]?.type === "Loop"
    );

    reactFlowNodes.push({
      id: questionId,
      type: "questionNode",
      position: position,
      data: {
        label: question.name,
        fullName: question.fullName,
        type: question.type,
        sectionName: question.sectionName,
        hasLogic: !!logic?.show,
        logicText: logic?.show ? readableCondition(logic.show) : undefined,
        isInLoop: isQuestionInLoop,
      },
      className: isQuestionInLoop
        ? "border-2 border-dashed border-orange-500 bg-orange-50"
        : "",
    });

    // Pushed Terminate Node further right and down so it doesn't crowd the parent node
    if (logic?.terminate) {
      const terminationId = `TERM-${questionId}`;
      reactFlowNodes.push({
        id: terminationId,
        type: "output",
        position: { x: position.x + 200, y: position.y + 90 },
        data: { label: "🛑 TERMINATE" },
        className:
          "bg-red-50 border border-red-500 text-red-700 text-xs w-[110px] text-center rounded z-10",
      });

      terminationEdges.push({
        id: `e-term-${questionId}`,
        source: questionId,
        target: terminationId,
        sourceHandle: "right-s", // Out the right side...
        targetHandle: "top-t", // ...into the top, preventing overlap
        type: "step", // Strict angles look cleaner for termination jumps
        style: { stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "4 4" },
      });
    }
  });

  return { mappedNodes: reactFlowNodes, terminationEdges };
}

function createSpecialEdges(
  longDistanceDependencies: { source: string; target: string }[],
  blocks: Record<string, SurveyBlock>
) {
  const specialEdges: Edge[] = [];

  longDistanceDependencies.forEach((dependency) => {
    specialEdges.push({
      id: `ld-logic-${dependency.source}-${dependency.target}`,
      source: dependency.source,
      target: dependency.target,
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

  const loopBlocksArray = Object.values(blocks).filter(
    (block) => block.type === "Loop"
  );

  loopBlocksArray.forEach((loop) => {
    if (!loop.firstQuestionId || !loop.lastQuestionId) return;

    specialEdges.push({
      id: `loop-${loop.id}`,
      source: loop.lastQuestionId,
      target: loop.firstQuestionId,
      type: "step",
      animated: true,
      style: { stroke: "#f97316", strokeWidth: 3, strokeDasharray: "5 5" },

      // CHANGED THESE TWO LINES TO TOP-TO-TOP
      sourceHandle: "top-s",
      targetHandle: "top-t",
    });
  });

  return specialEdges;
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export function buildGraphLevelLayout(
  refinedQuestions: Question[],
  logicMap: Record<string, QuestionLogic>,
  blocks: Record<string, SurveyBlock>,
  readableCondition: (node: LogicNode | null | undefined) => string,
  maxNodesPerLevel = 5,
  horizontalSpacing = 320,
  verticalBranchSpacing = 220,
  verticalRowSpacing = 120
): { nodes: Node[]; edges: Edge[] } {
  const { branchChildrenMap, branchChildSet, longDistanceDependencies } =
    analyzeDependencies(refinedQuestions, logicMap);

  const { calculatedPositions, generatedEdges } =
    calculatePositionsAndBaseEdges(
      refinedQuestions,
      branchChildrenMap,
      branchChildSet,
      {
        maxNodesPerLevel,
        horizontalSpacing,
        verticalBranchSpacing,
        verticalRowSpacing,
      }
    );

  const { mappedNodes, terminationEdges } = createReactFlowNodesAndTerminations(
    refinedQuestions,
    calculatedPositions,
    logicMap,
    blocks,
    readableCondition
  );

  const specialEdges = createSpecialEdges(longDistanceDependencies, blocks);

  return {
    nodes: mappedNodes,
    edges: [...generatedEdges, ...terminationEdges, ...specialEdges],
  };
}
