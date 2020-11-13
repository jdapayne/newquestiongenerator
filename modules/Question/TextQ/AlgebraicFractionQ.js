import { randBetween, gcd } from 'utilities'
import TextQ from 'Question/TextQ/TextQ'

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

    // logic for generating the question and answer starts here
    var a, b, c, d, e, f // (ax+b)(ex+f)/(cx+d)(ex+f) = (px^2+qx+r)/(tx^2+ux+v)
    var p, q, r, t, u, v
    var minCoeff, maxCoeff, minConst, maxConst

    switch (difficulty) {
      case 1:
        minCoeff = 1; maxCoeff = 1; minConst = 1; maxConst = 6
        break
      case 2:
        minCoeff = 1; maxCoeff = 1; minConst = -6; maxConst = 6
        break
      case 3:
        minCoeff = 1; maxCoeff = 3; minConst = -5; maxConst = 5
        break
      case 4:
      default:
        minCoeff = -3; maxCoeff = 3; minConst = -5; maxConst = 5
        break
    }

    // Pick some coefficients
    while (
      ((!a && !b) || (!c && !d) || (!e && !f)) || // retry if any expression is 0
      canSimplify(a, b, c, d) // retry if there's a common numerical factor
    ) {
      a = randBetween(minCoeff, maxCoeff)
      c = randBetween(minCoeff, maxCoeff)
      e = randBetween(minCoeff, maxCoeff)
      b = randBetween(minConst, maxConst)
      d = randBetween(minConst, maxConst)
      f = randBetween(minConst, maxConst)
    }

    // if the denominator is negative for each term, then make the numerator negative instead
    if (c <= 0 && d <= 0) {
      c = -c
      d = -d
      a = -a
      b = -b
    }

    p = a * e; q = a * f + b * e; r = b * f
    t = c * e; u = c * f + d * e; v = d * f

    // Now put the question and answer in a nice format into questionLaTeX and answerLaTeX
    const question = `\\frac{${quadraticString(p, q, r)}}{${quadraticString(t, u, v)}}`
    if (settings.useCommandWord) {
      this.questionLaTeX = '\\text{Simplify} ' + question
    } else {
      this.questionLaTeX = question
    }
    this.answerLaTeX =
      (c === 0 && d === 1) ? quadraticString(0, a, b)
        : `\\frac{${quadraticString(0, a, b)}}{${quadraticString(0, c, d)}}`

    this.answerLaTeX = '= ' + this.answerLaTeX
  }

  static get commandWord () {
    return 'Simplify'
  }
}

/* Utility functions
 * At some point, I'll move some of these into a general utilities module
 * but this will do for now
 */

// TODO I have quadraticString here and also a Polynomial class. What is being replicated?§
function quadraticString (a, b, c) {
  if (a === 0 && b === 0 && c === 0) return '0'

  var x2string =
    a === 0 ? ''
      : a === 1 ? 'x^2'
        : a === -1 ? '-x^2'
          : a + 'x^2'

  var xsign =
    b < 0 ? '-'
      : (a === 0 || b === 0) ? ''
        : '+'

  var xstring =
    b === 0 ? ''
      : (b === 1 || b === -1) ? 'x'
        : Math.abs(b) + 'x'

  var constsign =
    c < 0 ? '-'
      : ((a === 0 && b === 0) || c === 0) ? ''
        : '+'

  var conststring =
    c === 0 ? '' : Math.abs(c)

  return x2string + xsign + xstring + constsign + conststring
}

function canSimplify (a1, b1, a2, b2) {
  // can (a1x+b1)/(a2x+b2) be simplified?
  //
  // First, take out gcd, and write as c1(a1x+b1) etc

  var c1 = gcd(a1, b1)
  a1 = a1 / c1
  b1 = b1 / c1

  var c2 = gcd(a2, b2)
  a2 = a2 / c2
  b2 = b2 / c2

  var result = false

  if (gcd(c1, c2) > 1 || (a1 === a2 && b1 === b2)) {
    result = true
  }

  return result
}
