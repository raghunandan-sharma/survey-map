import {
  Question,
  SurveyBlock,
  QuestionLogic,
  LogicNode,
  LogicBranch,
  LogicalOperator,
} from "../types/logic";

export function resolveEffectiveLogic(
  targetQuestionId: string,
  refinedQuestions: Question[],
  blocks: Record<string, SurveyBlock>,
  logicMap: Record<string, QuestionLogic>
): QuestionLogic {
  // Fix 1: Ensure both IDs are compared as strings to avoid number vs string overlap errors
  const targetQuestion = refinedQuestions.find(
    (question) => question.id.toString() === targetQuestionId.toString()
  );

  if (!targetQuestion) return {};

  const inheritedConditions: LogicNode[] = [];

  // 1. Traverse up the tree and gather Block-level logic (Pages, Sections, Loops)
  targetQuestion.parentBlocks.forEach((blockId) => {
    const blockLogic = logicMap[blockId]?.show;
    if (blockLogic) {
      inheritedConditions.push(blockLogic);
    }
  });

  // 2. Gather Question-level logic
  const questionOwnLogic = logicMap[targetQuestionId]?.show;
  if (questionOwnLogic) {
    inheritedConditions.push(questionOwnLogic);
  }

  // 3. Merge them securely
  const terminateLogic = logicMap[targetQuestionId]?.terminate;

  if (inheritedConditions.length === 0) {
    return { show: null, terminate: terminateLogic };
  }

  if (inheritedConditions.length === 1) {
    return { show: inheritedConditions[0], terminate: terminateLogic };
  }

  // If there are multiple conditions, we wrap them in a master "AND" branch
  const mergedShowLogic: LogicBranch = {
    type: "branch",
    operator: LogicalOperator.AND,
    children: inheritedConditions,
  };

  return { show: mergedShowLogic, terminate: terminateLogic };
}

export const readableCondition = (
  node: LogicNode | null | undefined
): string => {
  if (!node) return "";

  if (node.type === "leaf") {
    let targetStr = "";

    // 1. If it's an array of values (e.g., IN operator)
    if (Array.isArray(node.value) && node.value.length > 0) {
      targetStr = `[${node.value.join(", ")}]`;
    }
    // 2. If it's a standard numeric/text value (e.g., GTE 22)
    else if (
      node.value !== undefined &&
      node.value !== null &&
      node.value !== ""
    ) {
      targetStr = String(node.value);
    }
    // 3. THE FIX: If value is empty, use the path (e.g., SELECTED r2)
    else if (node.path) {
      targetStr = node.path;
    }

    // Combine them, and trim just in case targetStr is completely empty
    return `${node.questionFullName || node.questionId} ${
      node.operator
    } ${targetStr}`.trim();
  }

  if (node.type === "branch") {
    const childStrs = node.children.map((c) => readableCondition(c));
    const joined = childStrs.join(` ${node.operator} `);

    // Optional: Add a safety check to avoid rendering empty parenthesis like "()"
    if (!joined) return "";

    return node.isNegated ? `NOT (${joined})` : `(${joined})`;
  }

  return "";
};
