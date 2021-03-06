import LinExpr from 'LinExpr'
import { OptionsSpec } from 'OptionsSpec'
import { randBetween, randElem, randMultBetween, shuffle, weakIncludes } from 'utilities'
import { AlgebraOptions } from './AlgebraOptions'
import { MissingAnglesData } from './MissingAnglesData'
import { solveAngles } from './solveAngles'

export type ExpressionType = 'add' | 'multiply' | 'mixed'
export default class MissingAnglesAlgebraData implements MissingAnglesData {
    angles: number[]
    missing: boolean[]
    angleSum: number
    angleLabels: string[]
    x: number //

    constructor (angles: number[], missing: boolean[], angleSum: number, angleLabels: string[], x: number) {
      this.angles = angles
      this.angleSum = angleSum
      this.angleLabels = angleLabels
      this.x = x
      this.missing = missing
    }

    static random (options: AlgebraOptions) : MissingAnglesAlgebraData {
      // calculated defaults if necessary
      options.maxConstant = options.maxConstant || options.angleSum! / 2 // guaranteed non-null from above
      options.maxXValue = options.maxXValue || options.angleSum! / 4

      // Randomise/set up main features
      const n : number = randBetween(options.minN, options.maxN)

      const type : ExpressionType = randElem(options.expressionTypes!) // guaranteed non-null from defaul assignment

      // Generate expressions/angles
      let expressions : LinExpr[]
      switch (type) {
        case 'mixed':
          expressions = makeMixedExpressions(n, options as Required<AlgebraOptions>)
          break
        case 'multiply':
          expressions = makeMultiplicationExpressions(n, options as Required<AlgebraOptions>)
          break
        case 'add':
        default:
          expressions = makeAddExpressions(n, options as Required<AlgebraOptions>)
          break
      }
      expressions = shuffle(expressions)

      // Solve for x and angles
      const { x, angles } : {x:number, angles: number[]} = solveAngles(expressions, options.angleSum!) // non-null from default assignement

      // labels are just expressions as strings
      const labels = expressions.map(e => `${e.toStringP()}^\\circ`)

      // missing values are the ones which aren't constant
      const missing = expressions.map(e => !e.isConstant())

      return new MissingAnglesAlgebraData(angles, missing, options.angleSum!, labels, x)
    }

    // makes typescript shut up, makes eslint noisy
    initLabels () : void {}  // eslint-disable-line
}

function makeMixedExpressions (n: number, options: Required<AlgebraOptions>) : LinExpr[] {
  const expressions: LinExpr[] = []
  const x = randBetween(options.minXValue, options.maxXValue)
  let left = options.angleSum
  let allconstant = true
  for (let i = 0; i < n - 1; i++) {
    const a = randBetween(1, options.maxCoefficient)
    left -= a * x
    const maxb = Math.min(left - options.minAngle * (n - i - 1), options.maxConstant)
    const minb = options.minAngle - a * x
    const b = randBetween(minb, maxb)
    if (a !== 0) { allconstant = false }
    left -= b
    expressions.push(new LinExpr(a, b))
  }
  const lastMinXCoeff = allconstant ? 1 : options.minCoefficient
  const a = randBetween(lastMinXCoeff, options.maxCoefficient)
  const b = left - a * x
  expressions.push(new LinExpr(a, b))

  return expressions
}

function makeAddExpressions (n: number, options: Required<AlgebraOptions>) : LinExpr[] {
  const expressions: LinExpr[] = []
  const angles: number[] = []
  const constants = (options.includeConstants === true || weakIncludes(options.includeConstants, 'add'))
  if (n === 2 && options.ensureX && constants) n = 3

  const x = randBetween(options.minXValue, options.maxXValue)
  let left = options.angleSum
  let anglesLeft = n

  // first do the expressions ensured by ensure_x and constants
  if (options.ensureX) {
    anglesLeft--
    expressions.push(new LinExpr(1, 0))
    angles.push(x)
    left -= x
  }

  if (constants) {
    anglesLeft--
    const c = randBetween(
      options.minAngle,
      left - options.minAngle * anglesLeft
    )
    expressions.push(new LinExpr(0, c))
    angles.push(c)
    left -= c
  }

  // middle angles
  while (anglesLeft > 1) {
    // add 'x+b' as an expression. Make sure b gives space
    anglesLeft--
    left -= x
    const maxb = Math.min(
      left - options.minAngle * anglesLeft,
      options.maxConstant
    )
    const minb = Math.max(
      options.minAngle - x,
      -options.maxConstant
    )
    const b = randBetween(minb, maxb)
    expressions.push(new LinExpr(1, b))
    angles.push(x + b)
    left -= b
  }

  // last angle
  expressions.push(new LinExpr(1, left - x))
  angles.push(left)

  return expressions
}

function makeMultiplicationExpressions (n: number, options: AlgebraOptions) : LinExpr[] {
  const expressions : LinExpr[] = []

  const constants : boolean = (options.includeConstants === true || weakIncludes(options.includeConstants, 'mult'))
  if (n === 2 && options.ensureX && constants) n = 3 // need at least 3 angles for this to make sense

  // choose a total of coefficients
  // pick x based on that
  let anglesleft = n
  const totalCoeff = constants
    ? randBetween(n, (options.angleSum - options.minAngle) / options.minAngle, Math.random) // if it's too big, angles get too small
    : randElem([3, 4, 5, 6, 8, 9, 10].filter(x => x >= n), Math.random)
  let coeffleft = totalCoeff

  // first 0/1/2
  if (constants) {
    // reduce to make what's left a multiple of total_coeff
    anglesleft--
    const newleft = randMultBetween(totalCoeff * options.minAngle, options.angleSum - options.minAngle, totalCoeff)
    const c = options.angleSum - newleft
    expressions.push(new LinExpr(0, c))
  }

  // Don't use x here, but:
  // x = left / totalCoeff

  if (options.ensureX) {
    anglesleft--
    expressions.push(new LinExpr(1, 0))
    coeffleft -= 1
  }

  // middle
  while (anglesleft > 1) {
    anglesleft--
    const mina = 1
    const maxa = coeffleft - anglesleft // leave enough for others TODO: add max_coeff
    const a = randBetween(mina, maxa)
    expressions.push(new LinExpr(a, 0))
    coeffleft -= a
  }

  // last
  expressions.push(new LinExpr(coeffleft, 0))
  return expressions
}
