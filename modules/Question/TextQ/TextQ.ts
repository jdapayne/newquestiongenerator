declare const katex : {render(latex: string, element: HTMLElement, options?: Record<string,unknown>) : void}
import Question from 'Question/Question'

/**
 * Abstract class representing a text-based quesion. Subclasses are expected to either initialise questionLaTeX
 * and answerLaTeX in their constructor, or to pass these into their constructor from a static factory method
 */
export default abstract class TextQ extends Question {
  questionp: HTMLParagraphElement
  answerp: HTMLParagraphElement
  questionLaTeX?: string // may be initialised in subclass in constructor, or passed to constructor from static factory
  answerLaTeX?: string
  constructor (questionLaTeX?: string, answerLaTeX?: string, options?: {answerClass?: string, questionClass?: string}) {
    super() // creates/sets this.DOM, and initialises this.answered

    this.questionLaTeX = questionLaTeX  // NB may be undefined
    this.answerLaTeX = answerLaTeX

    // Make the DOM tree for the element
    this.questionp = document.createElement('p')
    this.answerp = document.createElement('p')

    this.questionp.className = 'question'
    if (options?.questionClass) this.questionp.classList.add(options.questionClass)
    this.answerp.className = 'answer'
    if (options?.answerClass) this.answerp.classList.add(options.answerClass)
    this.answerp.classList.add('hidden')

    this.DOM.appendChild(this.questionp)
    this.DOM.appendChild(this.answerp)
  }

  render () {
    // update the DOM item with questionLaTeX and answerLaTeX
    if (!this.questionLaTeX || !this.answerLaTeX) {
      console.error('Attempt to render text question before question or answer set')
      return
    }
    katex.render(this.questionLaTeX, this.questionp, { displayMode: true, strict: 'ignore' })
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
