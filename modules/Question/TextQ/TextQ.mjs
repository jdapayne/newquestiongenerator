/* global katex */
import Question from 'Question'

export default class TextQ extends Question {
  constructor (options) {
    super()

    const defaults = {
      difficulty: 5,
      label: 'a'
    }
    const settings = Object.assign({}, defaults, options)

    // store the label for future rendering
    this.label = settings.label

    // Dummy question generating - subclasses do something substantial here
    this.questionLaTeX = '2+2'
    this.answerLaTeX = '=5'

    // Make the DOM tree for the element
    this.questionp = document.createElement('p')
    this.answerp = document.createElement('p')

    this.questionp.className = 'question'
    this.answerp.className = 'answer'
    this.answerp.classList.add('hidden')

    this.DOM.appendChild(this.questionp)
    this.DOM.appendChild(this.answerp)

    // subclasses should generate questionLaTeX and answerLaTeX,
    // .render() will be called by user
  }

  render () {
    // update the DOM item with questionLaTeX and answerLaTeX
    var qnum = this.label
      ? '\\text{' + this.label + ') }'
      : ''
    katex.render(qnum + this.questionLaTeX, this.questionp, { displayMode: true, strict: 'ignore' })
    katex.render(this.answerLaTeX, this.answerp, { displayMode: true })
  }

  getDOM () {
    return this.DOM
  }

  showAnswer () {
    this.answerp.classList.remove('hidden')
    this.answered = true
  }

  hideAnswer () {
    this.answerp.classList.add('hidden')
    this.answered = false
  }
}
