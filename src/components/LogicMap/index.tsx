import ReactFlow, {
  Background,
  Controls,
  BackgroundVariant,
  MiniMap,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";

import { useSurveyStore } from "../../store/useSurveyStore";
import QuestionNode from "./QuestionNode";
import PathSelector from "./PathSelector";

const nodeTypes = {
  questionNode: QuestionNode,
};

const LogicMap = () => {
  const { nodes, edges } = useSurveyStore();

  return (
    <div className="grow h-full bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: "smoothstep",
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Panel position="top-left" className="m-4">
          <PathSelector />
        </Panel>

        <MiniMap nodeStrokeWidth={3} zoomable pannable className="bg-white" />
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default LogicMap;
