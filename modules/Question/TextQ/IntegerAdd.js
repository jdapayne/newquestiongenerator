import TextQ from 'Question/TextQ/TextQ'
import { randBetween } from 'utilities'

export default class IntegerAddQ extends TextQ {
  constructor (options) {
    super(options)

    const defaults = {
      difficulty: 5,
      label: 'a'
    }
    const settings = Object.assign({}, defaults, options)

    this.label = settings.label

    // This is just a demo question type for now, so not processing difficulty
    const a = randBetween(10, 1000)
    const b = randBetween(10, 1000)
    const sum = a + b

    this.questionLaTeX = a + ' + ' + b
    this.answerLaTeX = '= ' + sum

    this.render()
  }

  static get commandWord () {
    return 'Evaluate'
  }
}
