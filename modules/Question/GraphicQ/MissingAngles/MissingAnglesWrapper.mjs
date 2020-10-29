/* Class to wrap various missing angles classes
 * Reads options and then wraps the appropriate object, mirroring the main
 * public methods
*/
import AnglesFormingQ from 'AnglesFormingQ'
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

    switch (type) {
      case 'aosl': {
        const options = { angleSum: 180 }
        this.question = new AnglesFormingQ(options)
        break
      }
      case 'aaap': {
        const options = { angleSum: 360 }
        this.question = new AnglesFormingQ(options)
        break
      }
      default:
        throw new Error(`Unknown type ${type} chosen from ${options.types}`)
    }
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
          { title: 'Around a point', id: 'aaap' }
        ],
        default: ['aosl', 'aaap'],
        vertical: true
      }
    ]
  }

  static get commandWord () {
    return 'Find the missing value'
  }
}
