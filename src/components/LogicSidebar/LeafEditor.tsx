import React from "react";
import {
  LogicLeaf,
  LogicNode,
  ComparisonOperator,
  Question,
} from "../../types/logic";

interface LeafEditorProps {
  leaf: LogicLeaf;
  onChange: (node: LogicNode) => void;
  availableQuestions: Question[];
}

const LeafEditor: React.FC<LeafEditorProps> = ({
  leaf,
  onChange,
  availableQuestions,
}) => {
  const updateLeaf = (updates: Partial<LogicLeaf>) => {
    onChange({ ...leaf, ...updates } as LogicLeaf);
  };

  const selectedQ = availableQuestions.find(
    (q) => q.id.toString() === leaf.questionId
  );
  const isNumeric = selectedQ?.type === "Numeric";

  return (
    <div className="flex flex-col gap-2 bg-white border border-gray-200 rounded-md p-2">
      <select
        className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-black bg-white focus:outline-none"
        value={leaf.questionId}
        onChange={(e) => {
          const q = availableQuestions.find(
            (aq) => aq.id.toString() === e.target.value
          );
          updateLeaf({
            questionId: e.target.value,
            questionFullName: q?.fullName || "",
            path: null,
            value: "",
          });
        }}
      >
        <option className="text-black" value="">
          Select Question...
        </option>
        {availableQuestions.map((q) => (
          <option className="text-black" key={q.uniqueKey} value={q.id}>
            {q.fullName}
          </option>
        ))}
      </select>

      <div className="flex gap-2 items-center">
        <select
          className="border border-gray-200 rounded px-2 py-1 text-xs text-black bg-white"
          value={leaf.operator}
          onChange={(e) =>
            updateLeaf({ operator: e.target.value as ComparisonOperator })
          }
        >
          {Object.values(ComparisonOperator).map((op) => (
            <option className="text-black" key={op} value={op}>
              {op}
            </option>
          ))}
        </select>

        {isNumeric ? (
          <input
            className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs text-gray-800"
            type="number"
            placeholder="Value"
            value={leaf.value as string}
            onChange={(e) => updateLeaf({ value: e.target.value })}
          />
        ) : selectedQ ? (
          <div className="flex flex-1 gap-2">
            <select
              className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs text-black bg-white"
              value={leaf.path || ""}
              onChange={(e) => updateLeaf({ path: e.target.value })}
            >
              <option className="text-black" value="">
                Row
              </option>
              {selectedQ.rows.map((r, i) => (
                <option className="text-black" key={i} value={`r${i + 1}`}>
                  {r}
                </option>
              ))}
            </select>

            {selectedQ.columns?.length > 0 && (
              <select
                className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs text-black bg-white"
                value={leaf.value as string}
                onChange={(e) => updateLeaf({ value: e.target.value })}
              >
                <option className="text-black" value="">
                  Column
                </option>
                {selectedQ.columns.map((c, i) => (
                  <option className="text-black" key={i} value={`c${i + 1}`}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default LeafEditor;
