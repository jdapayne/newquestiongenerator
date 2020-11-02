import TextQ from 'TextQ'
import { randBetween } from 'Utilities'

export default class AddAZero extends TextQ {
  constructor (options) {
    super(options)

    const defaults = {
      difficulty: 5,
      label: 'a'
    }
    const settings = Object.assign({}, defaults, options)

    this.label = settings.label

    // random 2 digit 'decimal'
    const q = String(randBetween(1, 9)) + String(randBetween(0, 9)) + '.' + String(randBetween(0, 9))
    const a = q + '0'

    this.questionLaTeX = q + '\\times 10'
    this.answerLaTeX = '= ' + a

    this.render()
  }

  static get commandWord () {
    return 'Evaluate'
  }
}

AddAZero.optionsSpec = [
]
