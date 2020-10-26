export default class Monomial {
  constructor (c, vs) {
    if (!isNaN(c) && vs instanceof Map) {
      this.c = c
      this.vs = vs
    } else if (typeof c === 'string') {
      this.initStr(c)
    } else if (!isNaN(c)) {
      this.c = c
      this.vs = new Map()
    } else { // default as a test: 4x^2y
      this.c = 4
      this.vs = new Map([['x', 2], ['y', 1]])
    }
  }

  clone () {
    const vs = new Map(this.vs)
    return new Monomial(this.c, vs)
  }

  mul (that) {
    if (!(that instanceof Monomial)) {
      that = new Monomial(that)
    }
    const c = this.c * that.c
    let vs = new Map()
    this.vs.forEach((index, variable) => {
      if (that.vs.has(variable)) {
        vs.set(variable, this.vs.get(variable) + that.vs.get(variable))
      } else {
        vs.set(variable, this.vs.get(variable))
      }
    })

    that.vs.forEach((index, variable) => {
      if (!vs.has(variable)) {
        vs.set(variable, that.vs.get(variable))
      }
    })
    vs = new Map([...vs.entries()].sort())
    return new Monomial(c, vs)
  }

  toLatex () {
    if (this.vs.size === 0) return this.c.toString()
    let str = this.c === 1 ? ''
      : this.c === -1 ? '-'
        : this.c.toString()
    this.vs.forEach((index, variable) => {
      if (index === 1) {
        str += variable
      } else {
        str += variable + '^' + index
      }
    })
    return str
  }

  sort () {
    // sorts (modifies object)
    this.vs = new Map([...this.vs.entries()].sort())
  }

  cleanZeros () {
    this.vs.forEach((idx, v) => {
      if (idx === 0) this.vs.delete(v)
    })
  }

  like (that) {
    // return true if like terms, false if otherwise
    // not the most efficient at the moment, but good enough.
    if (!(that instanceof Monomial)) {
      that = new Monomial(that)
    }

    let like = true
    this.vs.forEach((index, variable) => {
      if (!that.vs.has(variable) || that.vs.get(variable) !== index) {
        like = false
      }
    })
    that.vs.forEach((index, variable) => {
      if (!this.vs.has(variable) || this.vs.get(variable) !== index) {
        like = false
      }
    })
    return like
  }

  add (that, checkLike) {
    if (!(that instanceof Monomial)) {
      that = new Monomial(that)
    }
    // adds two compatible monomials
    // checkLike (default true) will check first if they are like and throw an exception
    // undefined behaviour if checkLike is false
    if (checkLike === undefined) checkLike = true
    if (checkLike && !this.like(that)) throw new Error('Adding unlike terms')
    const c = this.c + that.c
    const vs = this.vs
    return new Monomial(c, vs)
  }

  initStr (str) {
    // currently no error checking and fragile
    // Things not to pass in:
    //  zero indices
    //  multi-character variables
    //  negative indices
    //  non-integer coefficients
    const lead = str.match(/^-?\d*/)[0]
    const c = lead === '' ? 1
      : lead === '-' ? -1
        : parseInt(lead)
    let vs = str.match(/([a-zA-Z])(\^\d+)?/g)
    if (!vs) vs = []
    for (let i = 0; i < vs.length; i++) {
      const v = vs[i].split('^')
      v[1] = v[1] ? parseInt(v[1]) : 1
      vs[i] = v
    }
    vs = vs.filter(v => v[1] !== 0)
    this.c = c
    this.vs = new Map(vs)
  }

  static var (v) {
    // factory for a single variable monomial
    const c = 1
    const vs = new Map([[v, 1]])
    return new Monomial(c, vs)
  }
}
