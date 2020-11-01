import { GraphicQ, GraphicQView } from 'Question/GraphicQ/GraphicQ'
import Point from 'Point'
import Fraction from 'fraction.js'
import Polynomial from 'Polynomial'
import { randElem, randBetween, randBetweenFilter, gcd } from 'Utilities'

export default class ArithmagonQ extends GraphicQ {
  constructor (options) {
    super(options) // processes options into this.settings
    this.data = new ArithmagonQData(this.settings)
    this.view = new ArithmagonQView(this.data, this.settings)
  }

  static get commandWord () { return 'Complete the arithmagon:' }
}

ArithmagonQ.optionsSpec = [
  {
    title: 'Vertices',
    id: 'n',
    type: 'int',
    min: 3,
    max: 20,
    default: 3
  },
  {
    title: 'Type',
    id: 'type',
    type: 'select-exclusive',
    selectOptions: [
      { title: 'Integer (+)', id: 'integer-add' },
      { title: 'Integer (\u00d7)', id: 'integer-multiply' },
      { title: 'Fraction (+)', id: 'fraction-add' },
      { title: 'Fraction (\u00d7)', id: 'fraction-multiply' },
      { title: 'Algebra (+)', id: 'algebra-add' },
      { title: 'Algebra (\u00d7)', id: 'algebra-multiply' }
    ],
    default: 'integer-add',
    vertical: true
  },
  {
    title: 'Puzzle type',
    type: 'select-exclusive',
    id: 'puz_diff',
    selectOptions: [
      { title: 'Missing edges', id: '1' },
      { title: 'Mixed', id: '2' },
      { title: 'Missing vertices', id: '3' }
    ],
    default: '1'
  }
]

class ArithmagonQData /* extends GraphicQData */ {
  // TODO simplify constructor. Move logic into static factory methods
  constructor (options) {
    // 1. Set properties from options
    const defaults = {
      n: 3, // number of vertices
      min: -20,
      max: 20,
      num_diff: 1, // complexity of what's in vertices/edges
      puz_diff: 1, // 1 - Vertices given, 2 - vertices/edges; given 3 - only edges
      type: 'integer-add' // [type]-[operation] where [type] = integer, ...
      // and [operation] = add/multiply
    }

    this.settings = Object.assign({}, defaults, this.settings, options)
    this.settings.num_diff = this.settings.difficulty
    this.settings.puz_diff = parseInt(this.settings.puz_diff) //! ? This should have been done upstream...

    this.n = this.settings.n
    this.vertices = []
    this.sides = []

    if (this.settings.type.endsWith('add')) {
      this.opname = '+'
      this.op = (x, y) => x.add(y)
    } else if (this.settings.type.endsWith('multiply')) {
      this.opname = '\u00d7'
      this.op = (x, y) => x.mul(y)
    }

    // 2. Initialise based on type
    switch (this.settings.type) {
      case 'integer-add':
      case 'integer-multiply':
        this.initInteger(this.settings)
        break
      case 'fraction-add':
        this.initFractionAdd(this.settings)
        break
      case 'fraction-multiply':
        this.initFractionMultiply(this.settings)
        break
      case 'algebra-add':
        this.initAlgebraAdd(this.settings)
        break
      case 'algebra-multiply':
        this.initAlgebraMultiply(this.settings)
        break
      default:
        throw new Error('Unexpected switch default')
    }

    this.calculateEdges() // Use op functions to fill in the edges
    this.hideLabels(this.settings.puz_diff) // set some vertices/edges as hidden depending on difficulty
  }

  /* Methods initialising vertices */

  initInteger (settings) {
    for (let i = 0; i < this.n; i++) {
      this.vertices[i] = {
        val: new Fraction(randBetweenFilter(
          settings.min,
          settings.max,
          x => (settings.type.endsWith('add') || x !== 0)
        )),
        hidden: false
      }
    }
  }

  initFractionAdd (settings) {
    /* Difficulty settings:
     * 1: proper fractions with same denominator, no cancelling after DONE
     * 2: proper fractions with same denominator, no cancellling answer improper fraction
     * 3: proper fractions with one denominator a multiple of another, gives proper fraction
     * 4: proper fractions with one denominator a multiple of another, gives improper fraction
     * 5: proper fractions with different denominators (not co-prime), gives improper fraction
     * 6: mixed numbers
     * 7: mixed numbers, bigger numerators and denominators
     * 8: mixed numbers, big integer parts
     */

    // TODO - anything other than difficulty 1.
    const diff = settings.num_diff
    if (diff < 3) {
      const den = randElem([5, 7, 9, 11, 13, 17])
      for (let i = 0; i < this.n; i++) {
        const prevnum = this.vertices[i - 1]
          ? this.vertices[i - 1].val.n : undefined
        const nextnum = this.vertices[(i + 1) % this.n]
          ? this.vertices[(i + 1) % this.n].val.n : undefined

        const maxnum =
          diff === 2 ? den - 1
            : nextnum ? den - Math.max(nextnum, prevnum)
              : prevnum ? den - prevnum
                : den - 1

        const num = randBetweenFilter(1, maxnum, x => (
          // Ensures no simplifing afterwards if difficulty is 1
          gcd(x, den) === 1 &&
          (!prevnum || gcd(x + prevnum, den) === 1 || x + prevnum === den) &&
          (!nextnum || gcd(x + nextnum, den) === 1 || x + nextnum === den)
        ))

        this.vertices[i] = {
          val: new Fraction(num, den),
          hidden: false
        }
      }
    } else {
      const denbase = randElem(
        diff < 7 ? [2, 3, 5] : [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      )
      for (let i = 0; i < this.n; i++) {
        const prev = this.vertices[i - 1]
          ? this.vertices[i - 1].val : undefined
        const next = this.vertices[(i + 1) % this.n]
          ? this.vertices[(i + 1) % this.n].val : undefined

        const maxmultiplier = diff < 7 ? 4 : 8

        const multiplier =
          i % 2 === 1 || diff > 4 ? randBetweenFilter(2, maxmultiplier, x =>
            (!prev || x !== prev.d / denbase) &&
            (!next || x !== next.d / denbase)
          ) : 1

        const den = denbase * multiplier

        let num
        if (diff < 6) {
          num = randBetweenFilter(1, den - 1, x => (
            gcd(x, den) === 1 &&
            (diff >= 4 || !prev || prev.add(x, den) <= 1) &&
            (diff >= 4 || !next || next.add(x, den) <= 1)
          ))
        } else if (diff < 8) {
          num = randBetweenFilter(den + 1, den * 6, x => gcd(x, den) === 1)
        } else {
          num = randBetweenFilter(den * 10, den * 100, x => gcd(x, den) === 1)
        }

        this.vertices[i] = {
          val: new Fraction(num, den),
          hidden: false
        }
      }
    }
  }

  initFractionMultiply (settings) {
    for (let i = 0; i < this.n; i++) {
      const d = randBetween(2, 10)
      const n = randBetween(1, d - 1)
      this.vertices[i] = {
        val: new Fraction(n, d),
        hidden: false
      }
    }
  }

  initAlgebraAdd (settings) {
    const diff = settings.num_diff
    switch (diff) {
      case 1: {
        const variable = String.fromCharCode(randBetween(97, 122))
        for (let i = 0; i < this.n; i++) {
          const coeff = randBetween(1, 10).toString()
          this.vertices[i] = {
            val: new Polynomial(coeff + variable),
            hidden: false
          }
        }
      }
        break
      case 2:
      default: {
        if (Math.random() < 0.5) { // variable + constant
          const variable = String.fromCharCode(randBetween(97, 122))
          for (let i = 0; i < this.n; i++) {
            const coeff = randBetween(1, 10).toString()
            const constant = randBetween(1, 10).toString()
            this.vertices[i] = {
              val: new Polynomial(coeff + variable + '+' + constant),
              hidden: false
            }
          }
        } else {
          const variable1 = String.fromCharCode(randBetween(97, 122))
          let variable2 = variable1
          while (variable2 === variable1) {
            variable2 = String.fromCharCode(randBetween(97, 122))
          }

          for (let i = 0; i < this.n; i++) {
            const coeff1 = randBetween(1, 10).toString()
            const coeff2 = randBetween(1, 10).toString()
            this.vertices[i] = {
              val: new Polynomial(coeff1 + variable1 + '+' + coeff2 + variable2),
              hidden: false
            }
          }
        }
        break
      }
    }
  }

  initAlgebraMultiply (settings) {
    /* Difficulty:
     * 1: Alternate 3a with 4
     * 2: All terms of the form nv - up to two variables
     * 3: All terms of the form nv^m. One variable only
     * 4: ALl terms of the form nx^k y^l z^p. k,l,p 0-3
     * 5: Expand brackets 3(2x+5)
     * 6: Expand brackets 3x(2x+5)
     * 7: Expand brackets 3x^2y(2xy+5y^2)
     * 8: Expand brackets (x+3)(x+2)
     * 9: Expand brackets (2x-3)(3x+4)
     * 10: Expand brackets (2x^2-3x+4)(2x-5)
     */
    const diff = settings.num_diff
    switch (diff) {
      case 1:
      {
        const variable = String.fromCharCode(randBetween(97, 122))
        for (let i = 0; i < this.n; i++) {
          const coeff = randBetween(1, 10).toString()
          const term = i % 2 === 0 ? coeff : coeff + variable
          this.vertices[i] = {
            val: new Polynomial(term),
            hidden: false
          }
        }
        break
      }

      case 2: {
        const variable1 = String.fromCharCode(randBetween(97, 122))
        const variable2 = String.fromCharCode(randBetween(97, 122))
        for (let i = 0; i < this.n; i++) {
          const coeff = randBetween(1, 10).toString()
          const variable = randElem([variable1, variable2])
          this.vertices[i] = {
            val: new Polynomial(coeff + variable),
            hidden: false
          }
        }
        break
      }

      case 3: {
        const v = String.fromCharCode(randBetween(97, 122))
        for (let i = 0; i < this.n; i++) {
          const coeff = randBetween(1, 10).toString()
          const idx = randBetween(1, 3).toString()
          this.vertices[i] = {
            val: new Polynomial(coeff + v + '^' + idx),
            hidden: false
          }
        }
        break
      }

      case 4: {
        const startAscii = randBetween(97, 120)
        const v1 = String.fromCharCode(startAscii)
        const v2 = String.fromCharCode(startAscii + 1)
        const v3 = String.fromCharCode(startAscii + 2)
        for (let i = 0; i < this.n; i++) {
          const a = randBetween(1, 10).toString()
          const n1 = '^' + randBetween(0, 3).toString()
          const n2 = '^' + randBetween(0, 3).toString()
          const n3 = '^' + randBetween(0, 3).toString()
          const term = a + v1 + n1 + v2 + n2 + v3 + n3
          this.vertices[i] = {
            val: new Polynomial(term),
            hidden: false
          }
        }
        break
      }

      case 5:
      case 6: { // e.g. 3(x) * (2x-5)
        const variable = String.fromCharCode(randBetween(97, 122))
        for (let i = 0; i < this.n; i++) {
          const coeff = randBetween(1, 10).toString()
          const constant = randBetween(-9, 9).toString()
          let term = coeff
          if (diff === 6 || i % 2 === 1) term += variable
          if (i % 2 === 1) term += '+' + constant
          this.vertices[i] = {
            val: new Polynomial(term),
            hidden: false
          }
        }
        break
      }

      case 7: { // e.g. 3x^2y(4xy^2+5xy)
        const startAscii = randBetween(97, 120)
        const v1 = String.fromCharCode(startAscii)
        const v2 = String.fromCharCode(startAscii + 1)
        for (let i = 0; i < this.n; i++) {
          const a1 = randBetween(1, 10).toString()
          const n11 = '^' + randBetween(0, 3).toString()
          const n12 = '^' + randBetween(0, 3).toString()
          let term = a1 + v1 + n11 + v2 + n12
          if (i % 2 === 1) {
            const a2 = randBetween(-9, 9).toString()
            const n21 = '^' + randBetween(0, 3).toString()
            const n22 = '^' + randBetween(0, 3).toString()
            term += '+' + a2 + v1 + n21 + v2 + n22
          }
          this.vertices[i] = {
            val: new Polynomial(term),
            hidden: false
          }
        }
        break
      }

      case 8: // { e.g. (x+5) * (x-2)
      default: {
        const variable = String.fromCharCode(randBetween(97, 122))
        for (let i = 0; i < this.n; i++) {
          const constant = randBetween(-9, 9).toString()
          this.vertices[i] = {
            val: new Polynomial(variable + '+' + constant),
            hidden: false
          }
        }
      }
    }
  }

  /* Method to calculate edges from vertices */
  calculateEdges () {
    // Calculate the edges given the vertices using this.op
    for (let i = 0; i < this.n; i++) {
      this.sides[i] = {
        val: this.op(this.vertices[i].val, this.vertices[(i + 1) % this.n].val),
        hidden: false
      }
    }
  }

  /* Mark hiddend edges/vertices */

  hideLabels (puzzleDifficulty) {
    // Hide some labels to make a puzzle
    // 1 - Sides hidden, vertices shown
    // 2 - Some sides hidden, some vertices hidden
    // 3 - All vertices hidden
    switch (puzzleDifficulty) {
      case 1:
        this.sides.forEach(x => { x.hidden = true })
        break
      case 2: {
        this.sides.forEach(x => { x.hidden = true })
        const showside = randBetween(0, this.n - 1, Math.random)
        const hidevert = Math.random() < 0.5
          ? showside // previous vertex
          : (showside + 1) % this.n // next vertex;

        this.sides[showside].hidden = false
        this.vertices[hidevert].hidden = true
        break
      }
      case 3:
        this.vertices.forEach(x => { x.hidden = true })
        break
      default:
        throw new Error('no_difficulty')
    }
  }
}

class ArithmagonQView extends GraphicQView {
  constructor (data, options) {
    super(data, options) // sets this.width this.height, initialises this.labels, creates dom elements

    const width = this.width
    const height = this.height
    const r = 0.35 * Math.min(width, height) // radius
    const n = this.data.n

    // A point to label with the operation
    // All points first set up with (0,0) at center
    this.operationPoint = new Point(0, 0)

    // Position of vertices
    this.vertexPoints = []
    for (let i = 0; i < n; i++) {
      const angle = i * Math.PI * 2 / n - Math.PI / 2
      this.vertexPoints[i] = Point.fromPolar(r, angle)
    }

    // Poisition of side labels
    this.sidePoints = []
    for (let i = 0; i < n; i++) {
      this.sidePoints[i] = Point.mean(this.vertexPoints[i], this.vertexPoints[(i + 1) % n])
    }

    this.allPoints = [this.operationPoint].concat(this.vertexPoints).concat(this.sidePoints)

    this.reCenter() // Reposition everything properly

    this.makeLabels(true)

    // Draw into canvas
  }

  reCenter () {
    // Find the center of the bounding box
    const topleft = Point.min(this.allPoints)
    const bottomright = Point.max(this.allPoints)
    const center = Point.mean(topleft, bottomright)

    // translate to put in the center
    this.allPoints.forEach(p => {
      p.translate(this.width / 2 - center.x, this.height / 2 - center.y)
    })
  }

  makeLabels () {
    // vertices
    this.data.vertices.forEach((v, i) => {
      const value = v.val.toLatex
        ? v.val.toLatex(true)
        : v.val.toString()
      this.labels.push({
        pos: this.vertexPoints[i],
        textq: v.hidden ? '' : value,
        texta: value,
        styleq: 'normal vertex',
        stylea: v.hidden ? 'answer vertex' : 'normal vertex'
      })
    })

    // sides
    this.data.sides.forEach((v, i) => {
      const value = v.val.toLatex
        ? v.val.toLatex(true)
        : v.val.toString()
      this.labels.push({
        pos: this.sidePoints[i],
        textq: v.hidden ? '' : value,
        texta: value,
        styleq: 'normal side',
        stylea: v.hidden ? 'answer side' : 'normal side'
      })
    })

    // operation
    this.labels.push({
      pos: this.operationPoint,
      textq: this.data.opname,
      texta: this.data.opname,
      styleq: 'normal',
      stylea: 'normal'
    })

    // styling
    this.labels.forEach(l => {
      l.text = l.textq
      l.style = l.styleq
    })
  }

  render () {
    const ctx = this.canvas.getContext('2d')
    const n = this.data.n

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height) // clear

    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const p = this.vertexPoints[i]
      const next = this.vertexPoints[(i + 1) % n]
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(next.x, next.y)
    }
    ctx.stroke()
    ctx.closePath()

    // place labels
    this.renderLabels(true)
  }

  showAnswer () {
    this.labels.forEach(l => {
      l.text = l.texta
      l.style = l.stylea
    })
    this.renderLabels(true)
    this.answered = true
  }

  hideAnswer () {
    this.labels.forEach(l => {
      l.text = l.textq
      l.style = l.styleq
    })
    this.renderLabels(true)
    this.answered = false
  }
}
