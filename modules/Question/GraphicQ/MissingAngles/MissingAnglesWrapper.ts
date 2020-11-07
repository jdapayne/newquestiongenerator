/**  Class to wrap various missing angles classes
 * Reads options and then wraps the appropriate object, mirroring the main
 * public methods
 *
 * This class deals with translating difficulty into question types
*/

import MissingAnglesAroundQ from 'Question/GraphicQ/MissingAngles/MissingAnglesAroundQ'
import MissingAnglesTriangleQ from 'Question/GraphicQ/MissingAngles/MissingAnglesTriangleQ'
import Question from 'Question/Question'
import { randElem } from 'Utilities'
import { GraphicQ } from '../GraphicQ'
import ViewOptions from '../ViewOptions'
import { AlgebraOptions } from './AlgebraOptions'
import MissingAnglesAroundAlgebraQ from './MissingAnglesAroundAlgebraQ'
import { MissingAnglesViewOptions } from './MissingAnglesViewOptions'
import { MissingAngleOptions } from './NumberOptions'

type QuestionType = 'aosl' | 'aaap' | 'triangle'
type QuestionSubType = 'simple' | 'repeated' | 'algebra' | 'worded'

type QuestionOptions = MissingAngleOptions & AlgebraOptions

export default class MissingAnglesQ extends Question {
  question: GraphicQ

  constructor (question: GraphicQ) {
    super()
    this.question = question
  }

  static random (
    options: {
      types: QuestionType[],
      difficulty: number,
      custom: boolean,
      subtype?: QuestionSubType
    }) : MissingAnglesQ {
    if (options.types.length === 0) {
      throw new Error('Types list must be non-empty')
    }

    const type = randElem(options.types)
    let subtype : QuestionSubType
    let questionOptions : QuestionOptions = {}

    switch (options.difficulty) {
      case 1:
        subtype = 'simple'
        questionOptions.minN = 2
        questionOptions.maxN = 2
        break
      case 2:
        subtype = 'simple'
        questionOptions.minN = 3
        questionOptions.maxN = 4
        break
      case 3:
        subtype = 'repeated'
        questionOptions.minN = 3
        questionOptions.maxN = 4
        break
      case 4:
        subtype = 'algebra'
        questionOptions.expressionTypes = ['multiply']
        questionOptions.includeConstants = false
        questionOptions.minN = 2
        questionOptions.maxN = 4
        break
      case 5:
        subtype='algebra'
        questionOptions.expressionTypes = ['add','multiply']
        questionOptions.includeConstants = ['multiply']
        questionOptions.ensureX = true
        questionOptions.minN = 2
        questionOptions.maxN = 3
        break
      case 6:
      default:
        subtype = 'algebra'
        questionOptions.expressionTypes = ['mixed']
        questionOptions.minN = 2
        questionOptions.maxN = 3
        break
    }

    return this.randomFromTypeWithOptions(type, subtype, questionOptions)
  }

  static randomFromTypeWithOptions (type: QuestionType, subtype?: QuestionSubType, questionOptions?: QuestionOptions, viewOptions?: MissingAnglesViewOptions) : MissingAnglesQ {
    let question: GraphicQ
    questionOptions = questionOptions || {}
    viewOptions = viewOptions || {}
    switch (type) {
      case 'aaap':
      case 'aosl': {
        questionOptions.angleSum = (type === 'aaap') ? 360 : 180
        switch (subtype) {
          case 'simple':
          case 'repeated':
            questionOptions.repeated = subtype === 'repeated'
            question = MissingAnglesAroundQ.random(questionOptions, viewOptions)
            break
          case 'algebra':
            question = MissingAnglesAroundAlgebraQ.random(questionOptions, viewOptions)
            break
          default:
            throw new Error (`unexpected subtype ${subtype}`)
        }
        break
      }
      case 'triangle': {
        questionOptions.repeated = (subtype === "repeated")
        question = MissingAnglesTriangleQ.random(questionOptions, viewOptions)
        break
      }
      default:
        throw new Error(`Unknown type ${type}`)
    }

    return new MissingAnglesQ(question)
  }

  getDOM () : HTMLElement { return this.question.getDOM() }
  render () : void { this.question.render() }
  showAnswer () : void { this.question.showAnswer() }
  hideAnswer () : void { this.question.hideAnswer() }
  toggleAnswer () : void { this.question.toggleAnswer() }

  static get optionsSpec () : unknown[] {
    return [
      {
        title: '',
        id: 'types',
        type: 'select-inclusive',
        selectOptions: [
          { title: 'On a straight line', id: 'aosl' },
          { title: 'Around a point', id: 'aaap' },
          { title: 'Triangle', id: 'triangle' }
        ],
        default: ['aosl', 'aaap', 'triangle'],
        vertical: true
      }
    ]
  }

  static get commandWord () : string {
    return 'Find the missing value'
  }
}
