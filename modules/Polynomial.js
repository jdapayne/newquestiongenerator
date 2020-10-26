import Monomial from 'Monomial'

export default class Polynomial {
  constructor (terms) {
    if (Array.isArray(terms) && (terms[0] instanceof Monomial)) {
      terms.map(t => t.clone())
      this.terms = terms
    } else if (!isNaN(terms)) {
      this.initNum(terms)
    } else if (typeof terms === 'string') {
      this.initStr(terms)
    }
  }

  initStr (str) {
    str = str.replace(/\+-/g, '-') // a horrible bodge
    str = str.replace(/-/g, '+-') // make negative terms explicit.
    str = str.replace(/\s/g, '') // strip whitespace
    this.terms = str.split('+')
      .map(s => new Monomial(s))
      .filter(t => t.c !== 0)
  }

  initNum (n) {
    this.terms = [new Monomial(n)]
  }

  toLatex () {
    let str = ''
    for (let i = 0; i < this.terms.length; i++) {
      if (i > 0 && this.terms[i].c >= 0) {
        str += '+'
      }
      str += this.terms[i].toLatex()
    }
    return str
  }

  toString () {
    return this.toLaTeX()
  }

  clone () {
    const terms = this.terms.map(t => t.clone())
    return new Polynomial(terms)
  }

  simplify () {
    // collects like terms and removes zero terms
    // does not modify original
    // This seems probably inefficient, given the data structure
    // Would be better to use something like a linked list maybe?
    const terms = this.terms.slice()
    let newterms = []
    for (let i = 0; i < terms.length; i++) {
      if (!terms[i]) continue
      let newterm = terms[i]
      for (let j = i + 1; j < terms.length; j++) {
        if (!terms[j]) continue
        if (terms[j].like(terms[i])) {
          newterm = newterm.add(terms[j])
          terms[j] = null
        }
      }
      newterms.push(newterm)
      terms[i] = null
    }
    newterms = newterms.filter(t => t.c !== 0)
    return new Polynomial(newterms)
  }

  add (that, simplify) {
    if (!(that instanceof Polynomial)) {
      that = new Polynomial(that)
    }
    if (simplify === undefined) simplify = true
    const terms = this.terms.concat(that.terms)
    let result = new Polynomial(terms)

    if (simplify) result = result.simplify()

    return result
  }

  mul (that, simplify) {
    if (!(that instanceof Polynomial)) {
      that = new Polynomial(that)
    }
    const terms = []
    if (simplify === undefined) simplify = true
    for (let i = 0; i < this.terms.length; i++) {
      for (let j = 0; j < that.terms.length; j++) {
        terms.push(this.terms[i].mul(that.terms[j]))
      }
    }

    let result = new Polynomial(terms)
    if (simplify) result = result.simplify()

    return result
  }

  pow (n, simplify) {
    let result = this
    for (let i = 1; i < n; i++) {
      result = result.mul(this)
    }
    if (simplify) result = result.simplify()
    return result
  }

  static var (v) {
    // factory for a single variable polynomial
    const terms = [Monomial.var(v)]
    return new Polynomial(terms)
  }

  static x () {
    return Polynomial.var('x')
  }

  static const (n) {
    return new Polynomial(n)
  }
}
