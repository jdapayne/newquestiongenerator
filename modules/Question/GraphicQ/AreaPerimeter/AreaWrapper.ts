import { OptionsSpec } from "OptionsSpec";
import Question from "Question/Question";
import { randElem } from "utilities";
import { GraphicQ } from "../GraphicQ";
import ViewOptions from "../ViewOptions";
import RectangleAreaQ from "./RectangleAreaQ";
import { WrapperOptions, Shape, QuestionTypeSimple, QuestionOptions } from "./types";

export default class AreaPerimeterQ extends Question {
  question: GraphicQ // make more precise with union of actual types
  DOM: HTMLElement
  answered: boolean
  constructor(question) {
    super()
    this.question = question
    this.DOM = question.DOM
  }

  static random(options: WrapperOptions) {
    const questionOptions : QuestionOptions = {
      noDistractors: false,
      questionType: "area",
      dp: 0,
      maxLength: 20
    }
    const viewOptions: ViewOptions  = {
      height: 300,
      width: 300,
    }
    return RectangleAreaQ.random(questionOptions,viewOptions)
    
    /* More logic - to reinstate later
    const shape = randElem(options.shapes)
    let question : Question
    if (!options.custom) {
      return this.randomFromDifficulty(options.difficulty, shape, options.questionTypesSimple)
    } else {
      const questionType = randElem(options.questionTypesCustom)
      const questionOptions: QuestionOptions = {
        questionType: questionType,
        dp : 0,
        noDistractors : true
      }
      const viewOptions: ViewOptions = {}
      const question = RectangleAreaQ.random(questionOptions,viewOptions)
      return new this(question)
    }
    */
  }

  private static randomFromDifficulty(difficulty: number, shape: Shape, questionTypes: QuestionTypeSimple[]): AreaPerimeterQ {
    const questionOptions: QuestionOptions = {
      questionType: randElem(questionTypes),
      dp: 0,
      noDistractors: true
    }
    const viewOptions: ViewOptions = {}
    const question = RectangleAreaQ.random(questionOptions, viewOptions)
    return new this(question)
  }

  /* Wraps the methods of the wrapped question */
  render(): void { this.question.render()}      
  showAnswer() : void {this.question.showAnswer()}
  hideAnswer() : void {this.question.hideAnswer()}
  toggleAnswer() : void {this.question.toggleAnswer()}

  static get optionsSpec() : OptionsSpec{
    return [
      {
        id: 'shapes',
        type: 'select-inclusive',
        selectOptions: [
          {id: 'rectangle', title: 'Rectangle'}
        ],
        default: ['rectangle'],
        title: 'Shapes'
      },
      {
        id: 'questionTypesSimple',
        type: 'select-inclusive',
        selectOptions: [
          {id: 'area', title: 'Area'},
          {id: 'perimeter', title: 'Perimeter'}
        ],
        default: ['area', 'perimeter'],
        title: 'Type of question'
      }
    ]
  }

  static get commandWord() : string {
    return 'Find the missing value'
  }

}