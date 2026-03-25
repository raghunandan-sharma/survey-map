import {
  LogicNode,
  LogicalOperator,
  ComparisonOperator,
  SurveyAnswers,
} from "../types/logic";

/**
 * Recursively evaluates a LogicNode against the current survey answers.
 */
export function evaluate(node: LogicNode, answers: SurveyAnswers): boolean {
  if (node.type === "branch") {
    return evaluateBranch(
      node.operator,
      node.children,
      node.isNegated ?? false,
      answers
    );
  }

  return evaluateLeaf(node, answers);
}

/**
 * Processes Logical Groups (AND/OR) with support for NOT negation.
 */
function evaluateBranch(
  operator: LogicalOperator,
  children: LogicNode[],
  isNegated: boolean,
  answers: SurveyAnswers
): boolean {
  let result: boolean;

  if (operator === LogicalOperator.AND) {
    result = children.every((child) => evaluate(child, answers));
  } else {
    result = children.some((child) => evaluate(child, answers));
  }

  return isNegated ? !result : result;
}

/**
 * Evaluates individual leaf nodes (Numeric, Selection, Grid).
 */
function evaluateLeaf(node: any, answers: SurveyAnswers): boolean {
  const answer = answers[node.questionId];

  // If no answer exists, check if logic expects NOT_SELECTED.
  if (!answer || answer.data === undefined || answer.data === null) {
    return node.operator === ComparisonOperator.NOT_SELECTED;
  }

  const data = answer.data;

  switch (node.operator) {
    case ComparisonOperator.SELECTED:
      return checkEquality(data, node.path, node.value, true);

    case ComparisonOperator.NOT_SELECTED:
      // Fixed: Now explicitly uses the boolean flag for equality.
      return checkEquality(data, node.path, node.value, false);

    case ComparisonOperator.GT:
      return typeof data === "number" && data > (node.value as number);

    case ComparisonOperator.LT:
      return typeof data === "number" && data < (node.value as number);

    case ComparisonOperator.GTE:
      return typeof data === "number" && data >= (node.value as number);

    case ComparisonOperator.LTE:
      return typeof data === "number" && data <= (node.value as number);

    case ComparisonOperator.IN:
      return checkIn(data, node.value);

    case ComparisonOperator.ALL:
      return checkAll(data, node.value);

    default:
      return false;
  }
}

/**
 * Helper to check equality. Uses 'isEqual' to flip logic for NOT_SELECTED.
 */
function checkEquality(
  data: number | string[],
  path: string | null,
  targetValue: any,
  isEqual: boolean
): boolean {
  let match: boolean;

  if (path && Array.isArray(data)) {
    // Check if the specific path (r1, r1.c1) is in the selected set.
    match = data.includes(path);
  } else {
    // Direct value comparison for numeric or simple text.
    match = data === targetValue;
  }

  return isEqual ? match : !match;
}

function checkIn(data: number | string[], target: any): boolean {
  const targetArray = Array.isArray(target) ? target : [target];
  if (Array.isArray(data)) {
    return targetArray.some((val) => data.includes(val.toString()));
  }
  return targetArray.includes(data);
}

function checkAll(data: number | string[], target: any): boolean {
  if (!Array.isArray(data)) return false;
  const targetArray = Array.isArray(target) ? target : [target];
  return targetArray.every((val) => data.includes(val.toString()));
}
