import { Question, SurveyBlock, BlockType } from "../types/logic";
import _ from "lodash";

export function parseSurveyData(rawData: any) {
  let allElements: any[] = [];

  if (Array.isArray(rawData)) {
    allElements = rawData;
  } else if (rawData && rawData.sections) {
    allElements = _.flatMap(rawData.sections, (section: any) =>
      _.flatMap(
        section.modules,
        (moduleItem: any) => moduleItem.questions || []
      )
    );
  }

  const refinedQuestions: Question[] = [];
  const blocks: Record<string, SurveyBlock> = {};
  const activeStack: SurveyBlock[] = [];

  allElements.forEach((element, index) => {
    if (element.type.endsWith("Start")) {
      const baseType = element.type.replace("Start", "") as BlockType;
      const blockId = `${baseType.toLowerCase()}_${element.id}`;

      const newBlock: SurveyBlock = {
        id: blockId,
        type: baseType,
        name: element.name,
        firstQuestionId: null,
        lastQuestionId: null,
      };

      blocks[blockId] = newBlock;
      activeStack.push(newBlock);
    } else if (element.type.endsWith("End")) {
      const baseType = element.type.replace("End", "");
      for (
        let stackIndex = activeStack.length - 1;
        stackIndex >= 0;
        stackIndex--
      ) {
        if (activeStack[stackIndex].type === baseType) {
          activeStack.splice(stackIndex, 1);
          break;
        }
      }
    } else {
      const questionId = element.id.toString();
      const parentBlockIds = activeStack.map((block) => block.id);

      // Update block boundaries dynamically
      activeStack.forEach((block) => {
        if (!block.firstQuestionId) {
          blocks[block.id].firstQuestionId = questionId;
        }
        blocks[block.id].lastQuestionId = questionId;
      });

      const parentSection = [...activeStack]
        .reverse()
        .find((block) => block.type === "Section");

      refinedQuestions.push({
        ...element,
        id: questionId,
        uniqueKey: `${element.id}-${index}`,
        listOrder: refinedQuestions.length,
        parentBlocks: parentBlockIds,
        isInLoop: activeStack.some((block) => block.type === "Loop"),
        sectionName: parentSection ? parentSection.name : undefined,
      });
    }
  });

  return { refinedQuestions, blocks };
}
