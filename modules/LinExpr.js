export default class LinExpr {
// class LinExpr {
  constructor (a, b) {
    this.a = a
    this.b = b
  }

  isConstant () {
    return this.a === 0
  }

  toString () {
    let string = ''

    // x term
    if (this.a === 1) { string += 'x' } else if (this.a === -1) { string += '-x' } else if (this.a !== 0) { string += this.a + 'x' }

    // sign
    if (this.a !== 0 && this.b > 0) { string += ' + ' } else if (this.a !== 0 && this.b < 0) { string += ' - ' }

    // constant
    if (this.b > 0) { string += this.b } else if (this.b < 0 && this.a === 0) { string += this.b } else if (this.b < 0) { string += Math.abs(this.b) }

    return string
  }

  toStringP () {
    // return expression as a string, surrounded in parentheses if a binomial
    if (this.a === 0 || this.b === 0) return this.toString()
    else return '(' + this.toString() + ')'
  }

  eval (x) {
    return this.a * x + this.b
  }

  add (that) {
    // add either an expression or a constant
    if (that.a !== undefined) return new LinExpr(this.a + that.a, this.b + that.b)
    else return new LinExpr(this.a, this.b + that)
  }

  times (that) {
    return new LinExpr(this.a * that, this.b * that)
  }

  static solve (expr1, expr2) {
    // solves the two expressions set equal to each other
    return (expr2.b - expr1.b) / (expr1.a - expr2.a)
  }
}
