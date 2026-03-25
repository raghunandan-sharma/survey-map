import { LogicNode } from "../types/logic";

export const readableCondition = (
  node: LogicNode | null | undefined
): string => {
  if (!node) return "Logic";

  if (node.type === "leaf") {
    let valStr = String(node.value);
    // Format arrays neatly for "IN" operators
    if (Array.isArray(node.value)) {
      valStr = `[${node.value.join(", ")}]`;
    }
    return `${node.questionFullName || node.questionId} ${
      node.operator
    } ${valStr}`;
  }

  if (node.type === "branch") {
    // Recursively parse AND/OR branches
    const childStrs = node.children.map((c) => readableCondition(c));
    const joined = childStrs.join(` ${node.operator} `);
    return node.isNegated ? `NOT (${joined})` : `(${joined})`;
  }

  return "Complex Logic";
};
