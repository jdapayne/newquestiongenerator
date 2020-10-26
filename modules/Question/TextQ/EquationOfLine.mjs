import { randBetween, gcd } from 'Utilities'
import TextQ from 'TextQ'

/* Main question class. This will be spun off into different file and generalised */
export default class AlgebraicFractionQ extends TextQ {
  // 'extends' Question, but nothing to actually extend
  constructor (options) {
    super(options)

    const defaults = {
      difficulty: 2
    }

    const settings = Object.assign({}, defaults, options)
    const difficulty = settings.difficulty


    // Now put the question and answer in a nice format into questionLaTeX and answerLaTeX
    const question = `\\frac{${quadraticString(p, q, r)}}{${quadraticString(t, u, v)}}`

    if (settings.useCommandWord) {
      this.questionLaTeX = '\\text{Simplify} ' + question
    } else {
      this.questionLaTeX = question
    }

    this.answerLaTeX = ''
  }

  static get commandWord () {
    return 'Find the equation of the line through'
  }
}

/* Utility functions
 * At some point, I'll move some of these into a general utilities module
 * but this will do for now
 */

// TODO I have quadraticString here and also a Polynomial class. What is being replicated?§
