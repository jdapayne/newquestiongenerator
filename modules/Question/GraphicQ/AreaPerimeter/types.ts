export type Shape = 'rectangle' | 'triangle' | 'parallelogram' | 'trapezium';

export type QuestionTypeSimple = 'area' | 'perimeter';
export type QuestionTypeCustom = 'reverseArea' | 'reversePerimeter' | 'pythagorasArea' | 'pythagorasPerimeter' | 'pythagorasIsoscelesArea';
export type QuestionType = QuestionTypeSimple | QuestionTypeCustom;

export interface QuestionOptions {
  noDistractors: boolean, // adds layer of difficulty when true by including/excluding sides (depending on shape type)
  dp: number, // number of decimal places of lengths
  fraction: boolean,
  maxLength: number, // the maximum length of a side
  questionType: QuestionType
}

export interface WrapperOptions {
  difficulty: number;
  shapes: Shape[];
  questionTypesSimple: QuestionTypeSimple[];
  custom: boolean;
  questionTypesCustom: (QuestionType)[];
  dp: 0 | 1;
}

export const colors = ['LightCyan','LightYellow','Pink','LightGreen','LightBlue','Ivory','LightGray']
