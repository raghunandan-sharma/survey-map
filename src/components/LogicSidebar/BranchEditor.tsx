import React from "react";
import {
  LogicBranch,
  LogicNode,
  LogicalOperator,
  ComparisonOperator,
  Question,
} from "../../types/logic";
import NodeEditor from "./NodeEditor";

interface BranchEditorProps {
  branch: LogicBranch;
  onChange: (node: LogicNode) => void;
  availableQuestions: Question[];
}

const BranchEditor: React.FC<BranchEditorProps> = ({
  branch,
  onChange,
  availableQuestions,
}) => {
  const updateBranch = (updates: Partial<LogicBranch>) => {
    onChange({ ...branch, ...updates });
  };

  const addChild = (type: "leaf" | "branch") => {
    const newNode: LogicNode =
      type === "branch"
        ? { type: "branch", operator: LogicalOperator.AND, children: [] }
        : {
            type: "leaf",
            questionId: "",
            questionFullName: "",
            operator: ComparisonOperator.SELECTED,
            path: null,
            value: "",
          };
    updateBranch({ children: [...branch.children, newNode] });
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md p-2 space-y-2">
      <div className="flex items-center gap-2">
        {branch.children.length > 1 && (
          <select
            className="border border-gray-200 rounded px-2 py-1 text-xs bg-white text-black focus:outline-none"
            value={branch.operator}
            onChange={(e) =>
              updateBranch({ operator: e.target.value as LogicalOperator })
            }
          >
            <option className="text-black" value={LogicalOperator.AND}>
              AND
            </option>
            <option className="text-black" value={LogicalOperator.OR}>
              OR
            </option>
          </select>
        )}

        <label className="flex items-center gap-1 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={!!branch.isNegated}
            onChange={(e) => updateBranch({ isNegated: e.target.checked })}
          />
          NOT
        </label>
      </div>

      <div className="space-y-2">
        {branch.children.map((child, idx) => (
          <NodeEditor
            key={idx}
            node={child}
            onChange={(newNode) => {
              const newChildren = [...branch.children];
              if (newNode) newChildren[idx] = newNode;
              else newChildren.splice(idx, 1);
              updateBranch({ children: newChildren });
            }}
            availableQuestions={availableQuestions}
          />
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => addChild("leaf")}
          className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
        >
          + Condition
        </button>
        <button
          onClick={() => addChild("branch")}
          className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded hover:bg-purple-100"
        >
          + Group
        </button>
      </div>
    </div>
  );
};

export default BranchEditor;
