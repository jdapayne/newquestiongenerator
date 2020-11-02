export default abstract class Question {
  DOM: HTMLElement
  answered: boolean

  constructor () {
    this.DOM = document.createElement('div')
    this.DOM.className = 'question-div'
    this.answered = false
  }

  getDOM () : HTMLElement {
    return this.DOM
  }

  abstract render () : void

  showAnswer () : void {
    this.answered = true
  }

  hideAnswer () : void {
    this.answered = false
  }

  toggleAnswer () : void {
    if (this.answered) {
      this.hideAnswer()
    } else {
      this.showAnswer()
    }
  }

  static get commandWord () : string { // Should be overridden
    return ''
  }
}
