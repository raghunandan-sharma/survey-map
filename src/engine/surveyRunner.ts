import { Question, QuestionLogic, SurveyAnswers } from "../types/logic";
import { evaluate } from "./evaluator";

/**
 * Determines if a specific question should be shown based on its AST logic.
 */
export function shouldShow(
  questionId: string,
  logicMap: Record<string, QuestionLogic>,
  answers: SurveyAnswers
): boolean {
  const logic = logicMap[questionId];

  // If no logic is defined or no 'show' node exists, defaults to visible.
  if (!logic || !logic.show) {
    return true;
  }

  return evaluate(logic.show, answers);
}

/**
 * Determines if the current response triggers a termination event for this question.
 */
export function shouldTerminate(
  questionId: string,
  logicMap: Record<string, QuestionLogic>,
  answers: SurveyAnswers
): boolean {
  const logic = logicMap[questionId];

  // If no termination logic is defined, the survey continues.
  if (!logic || !logic.terminate) {
    return false;
  }

  return evaluate(logic.terminate, answers);
}

/**
 * Iterates through the questionnaire in order, applying visibility and termination rules.
 * * @returns An array of visible questions up to the point of termination or survey end.
 */
export function getVisibleSurvey(
  refinedQuestions: Question[],
  logicMap: Record<string, QuestionLogic>,
  answers: SurveyAnswers
): Question[] {
  const visibleQuestions: Question[] = [];

  for (const question of refinedQuestions) {
    const qIdStr = question.id.toString();

    // 1. Check Visibility Logic
    if (shouldShow(qIdStr, logicMap, answers)) {
      visibleQuestions.push(question);

      // 2. Check Termination Logic
      // If a visible question triggers a termination, we stop the survey execution here.
      if (shouldTerminate(qIdStr, logicMap, answers)) {
        break;
      }
    }
    // If shouldShow is false, the question is skipped, facilitating bypass routes (e.g., Q1 -> Q3).
  }

  return visibleQuestions;
}
