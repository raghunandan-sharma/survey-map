import { LogicNode } from "../types/logic";

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
