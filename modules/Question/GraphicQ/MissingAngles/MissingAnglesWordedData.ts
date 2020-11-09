import LinExpr from 'LinExpr'
import { randBetween, randElem, randMultBetween } from 'Utilities'
import MissingAnglesAlgebraData from './MissingAnglesAlgebraData'
import { solveAngles } from './solveAngles'
import { WordedOptions } from './WordedOptions'

export type WordedType = 'add' | 'multiply' | 'ratio' | 'percent'

export default class MissingAnglesWordedData extends MissingAnglesAlgebraData {
  angles: number[] // Inherited
  missing: boolean[] //    |
  angleSum: number //    |
  angleLabels: string[] //    v
  instructions: string[] // The 'instructions' given
  x: number // unused but inherited

  constructor (angles: number[], missing: boolean[], angleSum: number, angleLabels: string[], instructions: string[]) {
    super(angles, missing, angleSum, angleLabels, null)
    this.instructions = instructions
  }

  static random (options : WordedOptions) : MissingAnglesWordedData {
    const defaults : WordedOptions = {
      minN: 2,
      maxN: 2,
      minAngle: 10,
      minAddend: -90,
      maxAddend: 90,
      minMultiplier: 1,
      maxMultiplier: 5,
      types: ['add', 'multiply', 'percent', 'ratio']
    }
    options = Object.assign({}, defaults, options)

    const n = randBetween(options.minN, options.maxN)
    const angleLabels: string[] = []
    for (let i = 0; i < n; i++) {
      angleLabels[i] = String.fromCharCode(65 + i) // 65 = 'A'
    }
    let expressions: LinExpr[] = []
    let instructions: string[] = []

    expressions.push(new LinExpr(1, 0))

    // Loop til we get one that works
    // Probably really inefficient!!

    let success = false
    let attemptcount = 0
    while (!success) {
      if (attemptcount > 20) {
        expressions.push(new LinExpr(1, 0))
        console.log('Gave up after ' + attemptcount + ' attempts')
        success = true
      }
      for (let i = 1; i < n; i++) {
        const type = randElem(options.types)
        switch (type) {
          case 'add': {
            const addend = randBetween(options.minAddend, options.maxAddend)
            expressions.push(expressions[i - 1].add(addend))
            instructions.push(`\\text{Angle $${String.fromCharCode(65 + i)}$ is ${comparator(addend, '+')} angle $${String.fromCharCode(64 + i)}$}`)
            break
          }
          case 'multiply': {
            const multiplier = randBetween(options.minMultiplier, options.maxMultiplier)
            expressions.push(expressions[i - 1].times(multiplier))
            instructions.push(`\\text{Angle $${String.fromCharCode(65 + i)}$ is ${comparator(multiplier, '*')} angle $${String.fromCharCode(64 + i)}$}`)
            break
          }
          case 'percent': {
            const percentage = randMultBetween(5, 100, 5)
            const increase = Math.random() < 0.5
            const multiplier = increase ? 1 + percentage / 100 : 1 - percentage / 100
            expressions.push(expressions[i - 1].times(multiplier))
            instructions.push(
              `\\text{Angle $${String.fromCharCode(65 + i)}$ is $${percentage}\\%$ ${increase ? 'bigger' : 'smaller'} than angle $${String.fromCharCode(64 + i)}$}`)
            break
          }
          case 'ratio': {
            const a = randBetween(1, 10)
            const b = randBetween(1, 10)
            const multiplier = b / a
            expressions.push(expressions[i - 1].times(multiplier))
            instructions.push(
              `\\text{The ratio of angle $${String.fromCharCode(64 + i)}$ to angle $${String.fromCharCode(65 + i)}$ is $${a}:${b}$}`
            )
          }
        }
      }
      // check it makes sense
      success = true
      const expressionsum = expressions.reduce((exp1, exp2) => exp1.add(exp2))
      const x = LinExpr.solve(expressionsum, new LinExpr(0, options.angleSum))

      expressions.forEach(function (expr) {
        if (!success || expr.eval(x) < options.minAngle) {
          success = false
          instructions = []
          expressions = [expressions[0]]
        }
      })

      attemptcount++
    }
    console.log('Attempts: ' + attemptcount)

    const angles = solveAngles(expressions, options.angleSum).angles
    const missing = angles.map(() => true)

    return new this(angles, missing, options.angleSum, angleLabels, instructions)
  }
}

/**
 * Generates worded version of an operatio
 * @param number The multiplier or addend
 * @param operator The operator, e.g adding 'more than', or multiplying 'times larger than'
 */
function comparator (number: number, operator: '*'|'+') {
  switch (operator) {
    case '*':
      switch (number) {
        case 1: return 'the same as'
        case 2: return 'double'
        default: return `$${number}$ times larger than`
      }
    case '+':
      switch (number) {
        case 0: return 'the same as'
        default: return `$${Math.abs(number).toString()}^\\circ$ ${(number < 0) ? 'less than' : 'more than'}`
      }
  }
}
