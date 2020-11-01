/* Class to wrap various missing angles classes
 * Reads options and then wraps the appropriate object, mirroring the main
 * public methods
*/
import MissingAnglesAroundQ from 'MissingAngles/MissingAnglesAroundQ'
import MissingAnglesTriangleQ from 'MissingAngles/MissingAnglesTriangleQ'
import { randElem } from 'Utilities'

export default class MissingAnglesQ {
  constructor (options) {
    // options.types = ['aosl' | 'aaap' | 'triangle']
    // options.difficulty :: integer
    // options.custom :: Boolean
    // options.subtype :: 'simple' | 'repeated' | 'algebra' | 'worded'

    if (!options.types || !Array.isArray(options.types) || options.types.length === 0) {
      throw new Error(`Unsupported types list ${options.types}`)
    }
    const type = randElem(options.types)

    this.init(type)
  }

  init (type, subtype) {
    // Initialise given both a type and a subtype
    // Currently ignoring subtype
    switch (type) {
      case 'aosl': {
        const options = { angleSum: 180 }
        this.question = MissingAnglesAroundQ.random(options)
        break
      }
      case 'aaap': {
        const options = { angleSum: 360 }
        this.question = MissingAnglesAroundQ.random(options)
        break
      }
      case 'triangle': {
        this.question = new MissingAnglesTriangleQ()
        break
      }
      default:
        throw new Error(`Unknown type ${type}`)
    }
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
