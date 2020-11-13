import { randBetween } from 'utilities'
import TextQ from 'Question/TextQ/TextQ'
import Fraction from 'vendor/fraction'

/* Main question class. This will be spun off into different file and generalised */
export default class EquationOfLine extends TextQ {
  // 'extends' Question, but nothing to actually extend
  constructor (options) {
    // boilerplate
    super(options)

    const defaults = {
      difficulty: 2
    }

    const settings = Object.assign({}, defaults, options)
    const difficulty = Math.ceil(settings.difficulty / 2) // initially written for difficulty 1-4, now need 1-10

    // question generation begins here
    let m, c, x1, y1, x2, y2
    let minm, maxm, minc, maxc

    switch (difficulty) {
      case 1: // m>0, c>=0
      case 2:
      case 3:
        minm = difficulty < 3 ? 1 : -5
        maxm = 5
        minc = difficulty < 2 ? 0 : -10
        maxc = 10
        m = randBetween(minm, maxm)
        c = randBetween(minc, maxc)
        x1 = difficulty < 3 ? randBetween(0, 10) : randBetween(-15, 15)
        y1 = m * x1 + c

        if (difficulty < 3) {
          x2 = randBetween(x1 + 1, 15)
        } else {
          x2 = x1
          while (x2 === x1) { x2 = randBetween(-15, 15) };
        }
        y2 = m * x2 + c
        break
      case 4: // m fraction, points are integers
      default: {
        const md = randBetween(1, 5)
        const mn = randBetween(-5, 5)
        m = new Fraction(mn, md)
        x1 = new Fraction(randBetween(-10, 10))
        y1 = new Fraction(randBetween(-10, 10))
        c = new Fraction(y1).sub(m.mul(x1))
        x2 = x1.add(randBetween(1, 5) * m.d)
        y2 = m.mul(x2).add(c)
        break
      }
    }

    const xstr =
      (m === 0 || (m.equals && m.equals(0))) ? ''
        : (m === 1 || (m.equals && m.equals(1))) ? 'x'
          : (m === -1 || (m.equals && m.equals(-1))) ? '-x'
            : (m.toLatex) ? m.toLatex() + 'x'
              : (m + 'x')

    const conststr = // TODO: When m=c=0
      (c === 0 || (c.equals && c.equals(0))) ? ''
        : (c < 0) ? (' - ' + (c.neg ? c.neg().toLatex() : -c))
          : (c.toLatex) ? (' + ' + c.toLatex())
            : (' + ' + c)

    this.questionLaTeX = '(' + x1 + ', ' + y1 + ')\\text{ and }(' + x2 + ', ' + y2 + ')'
    this.answerLaTeX = 'y = ' + xstr + conststr
  }

  static get commandWord () {
    return 'Find the equation of the line through'
  }
}
