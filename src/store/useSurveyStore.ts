import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Node, Edge } from "reactflow";
import { Question, QuestionLogic, LoopBlock } from "../types/logic";
import {
  buildGraphLevelLayout,
  calculateAllPaths,
} from "../engine/graphBuilder";
import _ from "lodash";
import { readableCondition } from "../utils/logicHelpers";

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

    setSurveyData: (rawData: any) => {
      let allElements: any[] = [];

      if (Array.isArray(rawData)) {
        allElements = rawData;
      } else if (rawData && rawData.sections) {
        allElements = _.flatMap(rawData.sections, (s: any) =>
          _.flatMap(s.modules, (m: any) => m.questions || [])
        );
      } else {
        console.error("Unrecognized survey data format", rawData);
        return;
      }

      const loopBlocks: LoopBlock[] = [];
      const activeLoopStack: any[] = [];

      allElements.forEach((el) => {
        if (el.type === "LoopStart") {
          activeLoopStack.push(el);
        } else if (el.type === "LoopEnd") {
          const startMarker = activeLoopStack.pop();
          if (startMarker) {
            loopBlocks.push({
              id: `loop-${startMarker.id}`,
              startQuestionId: startMarker.id.toString(),
              endQuestionId: el.id.toString(),
            });
          }
        }
      });

      // ---------------------------------------------------------
      // THE FIX: Comprehensive filter & uniqueKey assignment
      // ---------------------------------------------------------
      const structuralTypes = [
        "PageStart",
        "PageEnd",
        "SubsectionStart",
        "SubsectionEnd",
        "SectionStart",
        "SectionEnd",
        "LoopStart",
        "LoopEnd",
      ];

      const refinedQuestions = allElements
        .filter((el) => !structuralTypes.includes(el.type))
        .map((q, index) => ({
          ...q,
          id: q.id ? q.id.toString() : `fallback-id-${index}`, // Safety fallback
          listOrder: index,
          uniqueKey: `${q.id}-${index}`, // Use this as your React key prop!
        }));

      const initialLogicMap: Record<string, QuestionLogic> = {};

      set({
        data: rawData,
        refinedQuestions,
        loopBlocks,
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
      const { refinedQuestions, logicMap, loopBlocks, activePathIndex } = get();
      if (refinedQuestions.length === 0) return;

      const { nodes, edges } = buildGraphLevelLayout(
        refinedQuestions,
        logicMap,
        loopBlocks,
        readableCondition
      );

      // Calculate all possible paths through the graph
      const paths = calculateAllPaths(nodes, edges);

      set({ nodes, edges, paths });

      // Re-apply the dimming logic if the user edits the graph while a path is highlighted
      if (activePathIndex !== null) {
        get().setActivePath(activePathIndex);
      }
    },
  }))
);
