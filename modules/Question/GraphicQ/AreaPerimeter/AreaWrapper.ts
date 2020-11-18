import { OptionsSpec } from 'OptionsSpec'
import Question from 'Question/Question'
import { randElem } from 'utilities'
import { GraphicQ } from '../GraphicQ'
import ViewOptions from '../ViewOptions'
import RectangleAreaQ from './RectangleAreaQ'
import TriangleAreaQ from './TriangleAreaQ'
import { WrapperOptions, Shape, QuestionTypeSimple, QuestionOptions } from './types'

export default class AreaPerimeterQ extends Question {
  question: GraphicQ // make more precise with union of actual types
  // DOM: HTMLElement  // in base class
  // answered: boolean // in base class
  constructor (question: GraphicQ) {
    super()
    this.question = question
    this.DOM = question.DOM
  }

  static random (options: WrapperOptions) {
    if (!options.custom) {
      const shape = randElem(options.shapes)
      return this.randomFromDifficulty(options.difficulty, shape, options.questionTypesSimple)
    }
  }

  private static randomFromDifficulty (difficulty: number, shape: Shape, questionTypes: QuestionTypeSimple[]): AreaPerimeterQ {
    const questionOptions: QuestionOptions = {
      questionType: randElem(questionTypes),
      dp: 0,
      noDistractors: true
    }
    const viewOptions: ViewOptions = {}

    let question : GraphicQ
    switch (shape) {
      case 'rectangle':
        question = RectangleAreaQ.random(questionOptions, viewOptions)
        break
      case 'triangle':
      default:
        question = TriangleAreaQ.random(questionOptions, viewOptions)
        break
    }

    return new this(question)
  }

  /* Wraps the methods of the wrapped question */
  render (): void { this.question.render() }
  showAnswer () : void { this.question.showAnswer() }
  hideAnswer () : void { this.question.hideAnswer() }
  toggleAnswer () : void { this.question.toggleAnswer() }

  static get optionsSpec () : OptionsSpec {
    return [
      {
        id: 'shapes',
        type: 'select-inclusive',
        selectOptions: [
          { id: 'rectangle', title: 'Rectangle' },
          { id: 'triangle', title: 'Triangle' }
        ],
        default: ['rectangle'],
        title: 'Shapes'
      },
      {
        id: 'questionTypesSimple',
        type: 'select-inclusive',
        selectOptions: [
          { id: 'area', title: 'Area' },
          { id: 'perimeter', title: 'Perimeter' }
        ],
        default: ['area', 'perimeter'],
        title: 'Type of question'
      }
    ]
  }

  static get commandWord () : string {
    return 'Find the missing value'
  }
}
