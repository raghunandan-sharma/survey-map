import React from "react";
import { useSurveyStore } from "../../store/useSurveyStore";
import NodeEditor from "./NodeEditor";

interface LogicSidebarProps {
  selectedNodeId: string | null;
}

const LogicSidebar: React.FC<LogicSidebarProps> = ({ selectedNodeId }) => {
  const { refinedQuestions, logicMap, updateLogic } = useSurveyStore();

  if (!selectedNodeId) {
    return (
      <div className="p-5 w-100 text-gray-400 italic">
        Select a question to edit logic.
      </div>
    );
  }

  const targetQ = refinedQuestions.find(
    (q) => q.id.toString() === selectedNodeId
  );
  if (!targetQ) return <div className="p-5">Invalid question selection.</div>;

  const qLogic = logicMap[selectedNodeId] || { show: null, terminate: null };

  return (
    <div className="w-[320px] h-full overflow-y-auto bg-gray-50 border-l border-gray-200 p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-800">
          {targetQ.fullName}
        </h3>
        <p className="text-[11px] text-gray-400 uppercase">{targetQ.type}</p>
      </div>

      <section className="space-y-3">
        <h4 className="text-[11px] font-semibold text-gray-400 uppercase border-b pb-1">
          Visibility Logic (Show If)
        </h4>
        <NodeEditor
          isRoot
          node={qLogic.show || null}
          onChange={(node) => updateLogic(selectedNodeId, { show: node })}
          availableQuestions={refinedQuestions.filter(
            (q) => q.listOrder < targetQ.listOrder
          )}
        />
      </section>

      <section className="space-y-3">
        <h4 className="text-[11px] font-semibold text-gray-400 uppercase border-b pb-1">
          Termination Logic
        </h4>
        <NodeEditor
          isRoot
          node={qLogic.terminate || null}
          onChange={(node) => updateLogic(selectedNodeId, { terminate: node })}
          availableQuestions={refinedQuestions.filter(
            (q) => q.listOrder <= targetQ.listOrder
          )}
        />
      </section>
    </div>
  );
};

export default LogicSidebar;
