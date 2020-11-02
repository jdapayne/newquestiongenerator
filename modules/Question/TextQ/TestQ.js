import TextQ from 'Question/TextQ/TextQ'
import { randElem } from 'Utilities'

export default class TestQ extends TextQ {
  constructor (options) {
    super(options)

    const defaults = {
      difficulty: 5,
      label: 'a',
      test1: ['foo'],
      test2: true
    }
    const settings = Object.assign({}, defaults, options)

    this.label = settings.label

    // pick a random one of the selected
    let test1
    if (settings.test1.length === 0) {
      test1 = 'none'
    } else {
      test1 = randElem(settings.test1)
    }

    this.questionLaTeX = 'd: ' + settings.difficulty + '\\\\ test1: ' + test1
    this.answerLaTeX = 'test2: ' + settings.test2

    this.render()
  }

  static get commandWord () { return 'Test command word' }
}

TestQ.optionsSpec = [
  {
    title: 'Test option 1',
    id: 'test1',
    type: 'select-inclusive',
    selectOptions: ['foo', 'bar', 'wizz'],
    default: []
  },
  {
    title: 'Test option 2',
    id: 'test2',
    type: 'bool',
    default: true
  }
]
