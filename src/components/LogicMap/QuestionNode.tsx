import { memo } from "react";
import { Handle, Position } from "reactflow";

interface QuestionNodeData {
  label: string;
  fullName: string;
  type: string;
  text?: string;
  hasLogic?: boolean;
  sectionName?: string;
  isInLoop?: boolean;
}

const QuestionNode = ({ data }: { data: QuestionNodeData }) => {
  const isScreener = data.sectionName === "Screener";

  const base =
    "relative rounded-md border-2 shadow-sm px-3 py-2 text-xs min-w-[170px] transition-all";

  const screenerStyle = "bg-sky-50 border-sky-800";
  const mainStyle = "bg-lime-50 border-lime-800";

  // Removed the thick blue ring. Subtle logic styling handled via text below.
  const logicStyle = data.hasLogic ? "border-blue-300" : "";
  const loopStyle = data.isInLoop ? "border-dashed border-orange-500" : "";

  const nodeStyle = `
    ${base}
    ${isScreener ? screenerStyle : mainStyle}
    ${logicStyle}
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

        {/* Small badge to indicate it's a branch, rather than a jarring border highlight */}
        {data.hasLogic && (
          <div className="text-[9px] text-blue-600 font-medium">
            Depends on Logic
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
