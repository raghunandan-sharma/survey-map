export enum LogicalOperator {
  AND = "AND",
  OR = "OR",
}

export enum ComparisonOperator {
  // Selection / Equality
  SELECTED = "SELECTED", // Equivalent to '==' for stubs
  NOT_SELECTED = "NOT_SELECTED", // Equivalent to '!=' or 'NOT'

  // Numeric Comparisons
  GT = "GT", // >
  LT = "LT", // <
  GTE = "GTE", // >=
  LTE = "LTE", // <=

  // Multi-select Logic
  IN = "IN", // Any of these selected
  ALL = "ALL", // All of these selected
}

export interface Question {
  id: number;
  uniqueKey: string;
  name: string;
  fullName: string;
  type: string;
  text: string | null;
  rows: string[];
  columns: string[];
  listOrder: number;

  isInLoop?: boolean;
  loopId?: string | null;
  isEndOfLoop?: boolean;
  loopReturnTarget?: string | null;
  sectionName?: string;
}

export type LogicNode = LogicBranch | LogicLeaf;

export interface LogicBranch {
  type: "branch";
  operator: LogicalOperator;
  children: LogicNode[];
  isNegated?: boolean; // Supports "NOT (A AND B)"
}

export interface LogicLeaf {
  type: "leaf";
  questionId: string;
  questionFullName: string; // Helpful for debugging/UI without lookups
  operator: ComparisonOperator;
  /**
   * The path to the response.
   * Standard: 'r1'
   * Grid: 'r1.c2'
   * Numeric: null (comparisons happen on the question value itself)
   */
  path: string | null;
  value: string | number | (string | number)[]; // The expected value or threshold
}

export enum TerminationType {
  IMMEDIATE = "IMMEDIATE",
  DELAYED = "DELAYED", // Terminate at end of current section
}

export interface TerminationRule {
  logic: LogicNode;
  type: TerminationType;
}

export interface QuestionLogic {
  show?: LogicNode | null;
  terminate?: LogicNode | null;
}

/**
 * The logicMap stored in Zustand
 */
export interface SurveyLogicState {
  [questionId: string]: QuestionLogic;
}

export interface AnswerValue {
  // For Numeric: the raw number
  // For Single/Multi: array of selected paths ['r1', 'r2']
  // For Grid: array of paths ['r1.c1', 'r2.c5']
  data: number | string[];
}

export interface SurveyAnswers {
  [questionId: string]: AnswerValue;
}

export interface LoopBlock {
  id: string;
  startQuestionId: string;
  endQuestionId: string;
  loopName?: string; // Optional: e.g., "Brand Loop"
}
