export default class Question {
  // 'Abstract' class for questions
  // For now, this does nothing other than document the expected methods
  constructor (options) {
    this.DOM = document.createElement('div')
    this.DOM.className = 'question-div'
    this.answered = false
  }

  getDOM () {
    return this.DOM
  }

  render () {
    // render into the DOM
  }

  showAnswer () {
    this.answered = true
  }

  hideAnswer () {
    this.answered = false
  }

  toggleAnswer () {
    if (this.answered) {
      this.hideAnswer()
    } else {
      this.showAnswer()
    }
  }

  static get commandWord () { return '' }
}
