/**  Class to wrap various missing angles classes
 * Reads options and then wraps the appropriate object, mirroring the main
 * public methods
 * 
 * This class deals with translating difficulty into question types
*/

import MissingAnglesAroundQ from 'Question/GraphicQ/MissingAngles/MissingAnglesAroundQ'
import MissingAnglesTriangleQ from 'Question/GraphicQ/MissingAngles/MissingAnglesTriangleQ'
import { randElem } from 'Utilities'
import { GraphicQ } from '../GraphicQ'

type QuestionType = 'aosl' | 'aaap' | 'triangle'
type QuestionSubType = 'simple' | 'repeated' | 'algebra' | 'worded'

interface QuestionOptions { //anything that can be passed to a subclass
  repeated?: boolean
  angleSum?: number
}

export default class MissingAnglesQ {
  question: GraphicQ

  constructor (question: GraphicQ) {
    this.question = question
  }

  static random(
    options: {
      types: QuestionType[],
      difficulty: number,
      custom: boolean,
      subtype?: QuestionSubType
    }) {

    if (options.types.length === 0) {
      throw new Error(`Types list must be non-empty`)
    }
    const type = randElem(options.types)

    let question: GraphicQ
    let subtype : QuestionSubType
    if (options.difficulty > 5) {
      subtype = 'repeated'
    } else {
      subtype = 'simple'
    }
    return this.randomFromTypeWithOptions (type, subtype)
  }

  static randomFromTypeWithOptions ( type: QuestionType, subtype?: QuestionSubType, options?: QuestionOptions) : MissingAnglesQ {

    let question: GraphicQ
    let questionOptions : QuestionOptions = {}
    switch (type) {
      case 'aaap':
      case 'aosl': {
        questionOptions.angleSum =  (type==='aaap') ? 360 : 180
        if (subtype === 'repeated') {
          questionOptions.repeated = true
        }
        question = MissingAnglesAroundQ.random(questionOptions)
        break
      }
      case 'triangle': {
        question = MissingAnglesTriangleQ.random(questionOptions)
        break
      }
      default:
        throw new Error(`Unknown type ${type}`)
    }

    return new MissingAnglesQ(question)
  }

  initDifficulty (type, difficulty) {
    // Initialised based on a type and a difficulty
  }

  getDOM () { return this.question.getDOM() }
  render () { return this.question.render() }
  showAnswer () { return this.question.showAnswer() }
  hideAnswer () { return this.question.hideAnswer() }
  toggleAnswer () { return this.question.toggleAnswer() }

  static get optionsSpec () {
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

  static get commandWord () {
    return 'Find the missing value'
  }
}
