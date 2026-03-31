import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Node, Edge } from "reactflow";
import {
  Question,
  QuestionLogic,
  LoopBlock,
  SurveyBlock,
} from "../types/logic";
import {
  buildGraphLevelLayout,
  calculateAllPaths,
} from "../engine/graphBuilder";
import _ from "lodash";
import {
  readableCondition,
  resolveEffectiveLogic,
} from "../utils/logicHelpers";
import { parseSurveyData } from "../engine/surveyParser";

interface SurveyStore {
  data: any[];
  refinedQuestions: Question[];
  logicMap: Record<string, QuestionLogic>;
  loopBlocks: LoopBlock[];
  nodes: Node[];
  edges: Edge[];

  // 1. ADD THESE BACK TO THE INTERFACE
  currentView: "editor" | "map";
  setView: (view: "editor" | "map") => void;

  setSurveyData: (data: any[]) => void;
  updateLogic: (id: string, logic: Partial<QuestionLogic>) => void;
  getFlowElements: () => void;

  paths: string[][];
  activePathIndex: number | null; // null means "All Paths"
  setActivePath: (index: number | null) => void;

  blocks: Record<string, SurveyBlock>;
}

export const useSurveyStore = create<SurveyStore>()(
  devtools((set, get) => ({
    data: [],
    refinedQuestions: [],
    logicMap: {},
    loopBlocks: [],
    nodes: [],
    edges: [],
    paths: [],
    activePathIndex: null,

    // 2. ADD THE INITIAL STATE
    currentView: "editor",

    // 3. ADD THE FUNCTION IMPLEMENTATION
    setView: (view) => set({ currentView: view }),

    setSurveyData: (rawData) => {
      // Use the new parser!
      const { refinedQuestions, blocks } = parseSurveyData(rawData);

      const initialLogicMap: Record<string, QuestionLogic> = {};

      set({
        data: rawData,
        refinedQuestions,
        blocks, // Save the structural blocks to the store!
        logicMap: initialLogicMap,
      });

      get().getFlowElements();
    },

    updateLogic: (id, logic) => {
      set((state) => ({
        logicMap: {
          ...state.logicMap,
          [id]: {
            ...(state.logicMap[id] || {}),
            ...logic,
          },
        },
      }));

      get().getFlowElements();
    },
    setActivePath: (index) => {
      set((state) => {
        const activePath = index !== null ? state.paths[index] : null;

        const updatedNodes = state.nodes.map((node) => ({
          ...node,
          style: {
            ...node.style,
            opacity:
              activePath === null || activePath.includes(node.id) ? 1 : 0.2,
            transition: "opacity 0.3s ease", // Smooth fade effect
          },
        }));

        const updatedEdges = state.edges.map((edge) => {
          const isActive =
            activePath === null ||
            (activePath.includes(edge.source) &&
              activePath.includes(edge.target));

          return {
            ...edge,
            style: {
              ...edge.style,
              opacity: isActive ? 1 : 0.1,
              transition: "opacity 0.3s ease",
            },
          };
        });

        return {
          activePathIndex: index,
          nodes: updatedNodes,
          edges: updatedEdges,
        };
      });
    },
    getFlowElements: () => {
      const { refinedQuestions, logicMap, blocks } = get();
      if (refinedQuestions.length === 0) return;

      const resolvedLogicMap: Record<string, QuestionLogic> = {};
      refinedQuestions.forEach((question) => {
        resolvedLogicMap[question.id] = resolveEffectiveLogic(
          question.id.toString(),
          refinedQuestions,
          blocks,
          logicMap
        );
      });

      // Passing `blocks` as the 3rd argument, not loopBlocks!
      const { nodes, edges } = buildGraphLevelLayout(
        refinedQuestions,
        resolvedLogicMap,
        blocks,
        readableCondition
      );

      const paths = calculateAllPaths(nodes, edges);
      set({ nodes, edges, paths });
    },
  }))
);
