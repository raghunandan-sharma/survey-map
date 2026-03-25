import React from "react";
import { LogicNode, LogicalOperator, Question } from "../../types/logic";
import BranchEditor from "./BranchEditor";
import LeafEditor from "./LeafEditor";

interface NodeEditorProps {
  node: LogicNode | null;
  onChange: (node: LogicNode | null) => void;
  availableQuestions: Question[];
  isRoot?: boolean;
}

const NodeEditor: React.FC<NodeEditorProps> = ({
  node,
  onChange,
  availableQuestions,
  isRoot,
}) => {
  if (!node) {
    return (
      <button
        className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        onClick={() =>
          onChange({
            type: "branch",
            operator: LogicalOperator.AND,
            children: [],
          })
        }
      >
        + Create Logic Group
      </button>
    );
  }

  return (
    <div
      className={`${
        !isRoot ? "ml-3 border-l border-gray-200 pl-3" : ""
      } space-y-2`}
    >
      {node.type === "branch" ? (
        <BranchEditor
          branch={node}
          onChange={onChange}
          availableQuestions={availableQuestions}
        />
      ) : (
        <LeafEditor
          leaf={node}
          onChange={onChange}
          availableQuestions={availableQuestions}
        />
      )}
      <button
        className="text-[11px] text-red-400 hover:text-red-600 bg-red-100 rounded p-1"
        onClick={() => onChange(null)}
      >
        Delete {node.type === "branch" ? "Group" : "Rule"}
      </button>
    </div>
  );
};

export default NodeEditor;
