import { OptionsSpec } from 'OptionsSpec'
import Question from 'Question/Question'
import { randElem } from 'utilities'
import { GraphicQ, GraphicQView } from '../GraphicQ'
import ViewOptions from '../ViewOptions'
import ParallelogramAreaQ from './ParallelogramAreaQ'
import RectangleAreaQ from './RectangleAreaQ'
import TrapeziumAreaQ from './TrapeziumAreaQ'
import TriangleAreaQ from './TriangleAreaQ'
import { WrapperOptions, Shape, QuestionTypeSimple, QuestionOptions, QuestionType } from './types'

export default class AreaPerimeterQ extends Question {
  question: GraphicQ // make more precise with union of actual types
  // DOM: HTMLElement  // in base class
  // answered: boolean // in base class
  constructor (question: GraphicQ) {
    super()
    this.question = question
    this.DOM = question.DOM
  }

  static random (options: WrapperOptions) : AreaPerimeterQ {
    // TODO Add custom options
    const shape = randElem(options.shapes)
    return this.randomFromDifficulty(options.difficulty, shape, options.questionTypesSimple)
  }

  private static randomFromDifficulty (difficulty: number, shape: Shape, questionTypes: QuestionTypeSimple[]): AreaPerimeterQ {
    /** Difficulty guide
     *  1 - Forward, no distractors, small integers
     *  2 - Forward, distractors, small integers
     *  3 - Forward, distractors, larger integers
     *  4 - Forward, distractors, decimals and fractions
     *  5 - Forward, distractors, decimals and fractions - larger
     *  6 - Reverse small integers
     *  7 - Reverse large integers
     *  8 - Reverse decimals and fractions
     *  9 - Reverse decimals and fractions - larger
     * 10 - Pythagoras
    */
    const questionOptions: QuestionOptions = {
      questionType: randElem(questionTypes),
      dp: 0,
      fraction: false,
      noDistractors: true,
      maxLength: 20
    }
    const viewOptions: ViewOptions = {}

    switch (difficulty) {
      case 1:
        break;
      case 2:
        questionOptions.noDistractors = false
        break
      case 3:
        questionOptions.noDistractors = false
        questionOptions.maxLength = 100
        break
      case 4:
        if (Math.random()<0.5) {  // decimal
          questionOptions.dp = 1
          questionOptions.maxLength = 99
        } else { // fraction
          questionOptions.fraction = true
          questionOptions.maxLength = 15
        }
        questionOptions.noDistractors = false
        break
      case 5:
        if (Math.random()<0.5) {  // decimal
          questionOptions.dp = 1
          questionOptions.maxLength = 500
        } else {
          questionOptions.fraction = true
          questionOptions.maxLength = 100
        }
        questionOptions.noDistractors = false
        break
      case 6:
        questionOptions.dp = 0
        questionOptions.noDistractors = false
        questionOptions.questionType = randElem(questionTypes.map(t=>reversify(t)))
        questionOptions.maxLength = 20
        break
      case 7:
        questionOptions.dp = 0
        questionOptions.noDistractors = false
        questionOptions.questionType = randElem(questionTypes.map(t=>reversify(t)))
        questionOptions.maxLength = 99
        break
      case 8:
        questionOptions.dp = 1
        questionOptions.noDistractors = false
        questionOptions.questionType = randElem(questionTypes.map(t=>reversify(t)))
        questionOptions.maxLength = 99
        break
      case 9:
        questionOptions.dp = 1
        questionOptions.noDistractors = false
        questionOptions.questionType = randElem(questionTypes.map(t=>reversify(t)))
        questionOptions.maxLength = 500
        break
      case 10:
      default:
        shape = 'triangle'
        questionOptions.questionType = randElem(['pythagorasArea','pythagorasIsoscelesArea','pythagorasPerimeter'])
        break
    }

    return this.randomWithOptions(shape,questionOptions,viewOptions)
  }

  static randomWithOptions (shape: Shape, options: QuestionOptions, viewOptions: ViewOptions): AreaPerimeterQ {
    let question: GraphicQ
    switch(shape) {
      case 'rectangle':
        question = RectangleAreaQ.random(options,viewOptions)
        break
      case 'triangle':
        question = TriangleAreaQ.random(options,viewOptions)
        break
      case 'trapezium':
        question = TrapeziumAreaQ.random(options,viewOptions)
        break
      case 'parallelogram':
        question = ParallelogramAreaQ.random(options,viewOptions)
        break
      default:
        throw new Error('Not yet implemented')
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
          { id: 'rectangle', title: 'Rectangles' },
          { id: 'triangle', title: 'Triangles' },
          { id: 'parallelogram', title: 'Parallelograms' },
          { id: 'trapezium', title: 'Trapezia' }
        ],
        default: ['rectangle', 'triangle', 'parallelogram', 'trapezium'],
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

/**
 * Prepend 'reverse' to the beginning of a string then camel case it
 * e.g. reversify('area') === 'reverseArea'
 * @param str A string
 * @param prefix The prefix to use
 */
function reversify(str: QuestionTypeSimple, prefix: 'reverse' | 'pythagoras' = 'reverse') : QuestionType {
  return prefix + str[0].toUpperCase() + str.slice(1) as QuestionType
}