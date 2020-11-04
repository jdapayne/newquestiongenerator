/**  Class to wrap various missing angles classes
 * Reads options and then wraps the appropriate object, mirroring the main
 * public methods
 *
 * This class deals with translating difficulty into question types
*/

import MissingAnglesAroundQ, * as AnglesAround from 'Question/GraphicQ/MissingAngles/MissingAnglesAroundQ'
import MissingAnglesTriangleQ from 'Question/GraphicQ/MissingAngles/MissingAnglesTriangleQ'
import Question from 'Question/Question'
import { randElem } from 'Utilities'
import { GraphicQ } from '../GraphicQ'

type QuestionType = 'aosl' | 'aaap' | 'triangle'
type QuestionSubType = 'simple' | 'repeated' | 'algebra' | 'worded'

type QuestionOptions = AnglesAround.Options // to be &ed with other options types

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
      default:
        subtype = 'repeated'
        questionOptions.minN = 3
        questionOptions.maxN = 4
        break
    }

    return this.randomFromTypeWithOptions(type, subtype, questionOptions)
  }

  static randomFromTypeWithOptions (type: QuestionType, subtype?: QuestionSubType, questionOptions?: QuestionOptions) : MissingAnglesQ {
    let question: GraphicQ
    questionOptions = questionOptions || {}
    switch (type) {
      case 'aaap':
      case 'aosl': {
        questionOptions.angleSum = (type === 'aaap') ? 360 : 180
        if (subtype === 'repeated') {
          questionOptions.repeated = true
        }
        question = MissingAnglesAroundQ.random(questionOptions)
        break
      }
      case 'triangle': {
        questionOptions.repeated = (subtype === "repeated")
        question = MissingAnglesTriangleQ.random(questionOptions)
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
