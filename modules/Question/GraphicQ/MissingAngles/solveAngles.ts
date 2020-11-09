import LinExpr from 'LinExpr'

/** Given a set of expressions, set their sum  */

export function solveAngles (expressions: LinExpr[], angleSum: number): { x: number; angles: number[]; } {
  const expressionSum = expressions.reduce((exp1, exp2) => exp1.add(exp2))
  const x = LinExpr.solve(expressionSum, new LinExpr(0, angleSum))

  const angles = []
  expressions.forEach(function (expr) {
    const angle = expr.eval(x)
    if (angle <= 0) {
      throw new Error('negative angle')
    } else {
      angles.push(expr.eval(x))
    }
  })

  return ({ x: x, angles: angles })
}
