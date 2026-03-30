import { memo } from "react";
import { Handle, Position } from "reactflow";

interface QuestionNodeData {
  label: string;
  fullName: string;
  type: string;
  text?: string;
  hasLogic?: boolean;
  logicText?: string; // Add the string field here
  sectionName?: string;
  isInLoop?: boolean;
}

const QuestionNode = ({ data }: { data: QuestionNodeData }) => {
  const isScreener = data.sectionName === "Screener";

  const base =
    "relative rounded-md border-2 shadow-sm px-3 py-2 text-xs min-w-[170px] max-w-[240px]"; // Added max-width for long logic strings

  const screenerStyle = "bg-sky-50 border-sky-800";
  const mainStyle = "bg-lime-50 border-lime-800";
  const logicHighlight = data.hasLogic ? "border-blue-300" : "";
  const loopStyle = data.isInLoop ? "border-dashed border-orange-500" : "";

  const nodeStyle = `
    ${base}
    ${isScreener ? screenerStyle : mainStyle}
    ${logicHighlight}
    ${loopStyle}
  `;

  const hiddenHandle = "opacity-0";

  return (
    <div className={nodeStyle}>
      {/* Targets */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-t"
        className={hiddenHandle}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-t"
        className={hiddenHandle}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-t"
        className={hiddenHandle}
      />

      {/* Sources */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-s"
        className={hiddenHandle}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-s"
        className={hiddenHandle}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-s"
        className={hiddenHandle}
      />

      <div className="flex flex-col gap-1">
        <div className="font-semibold text-black truncate">
          {data.fullName || data.label}
        </div>

        <div className="text-[10px] text-gray-600">{data.type}</div>

        {data.sectionName && (
          <div className="text-[9px] text-gray-500">
            Section: {data.sectionName}
          </div>
        )}

        {/* Instead of generic text, we render the actual condition */}
        {data.hasLogic && data.logicText && (
          <div className="mt-1 p-1 bg-blue-50/50 rounded text-[9px] text-blue-700 font-medium leading-tight">
            {data.logicText}
          </div>
        )}

        {data.isInLoop && (
          <div className="text-[9px] text-orange-600 font-medium">
            Loop Block
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(QuestionNode);
