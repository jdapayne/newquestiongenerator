import GraphicQ from 'GraphicQ'
import Point from 'Point'
import { randElem, randBetween, randBetweenFilter, gcd } from 'Utilities'

export default class ArithmagonQ extends GraphicQ {
  /* Members:
   *
   * Relating to the question itself:
   *   this.op:: Num -> Num .  The operator
   *   this.opname :: String.  The name of the operator
   *   this.vertices :: [{val: Num, hidden: Bool}]. The vertices
   *   this.sides :: [{val: Num, hidden: Bool}]
   *
   * Relating to the graphic:
   */

  constructor (options) {
    super(options)
    // TODO: Have more than two.

    //Choose type:
    //   Type | Given   | Description
    //   0    | O, A    | Pythagoras missing hypotenuse
    //   1    | A, H    | Pythagoras missing leg
    //   2    | θ, A    | Trig using tan (unknown on numerator) or cos (unknown on denominator)
    //   3    | θ, O    | Trig using tan or sin (both unknown on denominator) 
    //   4    | θ, H    | Trig using cos or sin (both unknown on numerator)
    
    const triangle1Type = randBetween(0,4)
    let triangle1Options = {}
    // set O
    if (triangle1Type === 0 || triangle1Type === 3) {
      triangle1Options.O = randBetween(1,20)
    }
    // set A
    if (triangle1Type === 0 || triangle1Type === 1 || triangle1Type === 2) {
      triangle1Options.A = randBetween(1,20)
    }
    // set H
    if (triangle1Type === 1 || triangle1Type === 4) {
      triangle1Options.H = randBetween(1,20)
    }
    // set θ
    if (triangle1Type === 2 || triangle1Type === 3 || triangle1Type === 4) {
      triangle1Options.theta = randBetween(1,20)
    }

    const triangle1 = new RightAngledTriangle(triangle1Options)

    // choose a non-given side

  }

  render () {
    const width = this.settings.width
    const height = this.settings.height

    const r = 0.35 * Math.min(width, height)
    const n = this.n

    // A point to label with the operation
    // All points first set up with (0,0) at center
    const operationPoint = new Point(0, 0)

    // Position of vertices
    const vertexPoints = []
    for (let i = 0; i < n; i++) {
      const angle = i * Math.PI * 2 / n - Math.PI / 2
      vertexPoints[i] = Point.fromPolar(r, angle)
    }

    // Poisition of side labels
    const sidePoints = []
    for (let i = 0; i < n; i++) {
      sidePoints[i] = Point.mean(vertexPoints[i], vertexPoints[(i + 1) % n])
    }

    // Reposition everything properly
    // Find the center of the bounding box
    const allPoints = [operationPoint].concat(vertexPoints).concat(sidePoints)

    const topleft = Point.min(allPoints)
    const bottomright = Point.max(allPoints)
    const center = Point.mean(topleft, bottomright)

    // translate to put in the center
    allPoints.forEach(p => {
      p.translate(width / 2 - center.x, height / 2 - center.y)
    })

    // make labels list
    this.labels = []

    // vertices
    this.vertices.forEach((v, i) => {
      const value = v.val.toLatex
        ? v.val.toLatex(true)
        : v.val.toString()
      this.labels.push({
        pos: vertexPoints[i],
        textq: v.hidden ? '' : value,
        texta: value,
        styleq: 'normal vertex',
        stylea: v.hidden ? 'answer vertex' : 'normal vertex'
      })
    })

    // sides
    this.sides.forEach((v, i) => {
      const value = v.val.toLatex
        ? v.val.toLatex(true)
        : v.val.toString()
      this.labels.push({
        pos: sidePoints[i],
        textq: v.hidden ? '' : value,
        texta: value,
        styleq: 'normal side',
        stylea: v.hidden ? 'answer side' : 'normal side'
      })
    })

    // point
    this.labels.push({
      pos: operationPoint,
      textq: this.opname,
      texta: this.opname,
      styleq: 'normal',
      stylea: 'normal'
    })

    this.labels.push({
      pos: new Point(15, 15),
      textq: `(${this.label})`,
      texta: `(${this.label})`,
      styleq: 'normal',
      stylea: 'normal'
    })

    this.labels.forEach(l => {
      l.text = l.textq
      l.style = l.styleq
    })

    // Draw into canvas
    const ctx = this.canvas.getContext('2d')

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height) // clear

    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const p = vertexPoints[i]
      const next = vertexPoints[(i + 1) % n]
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(next.x, next.y)
    }
    ctx.stroke()
    ctx.closePath()

    // place labels
    this.renderLabels()
  }

  static get commandWord () {
    return 'Find $x$'
  }
}

class RightAngledTriangle {
  /* Properties:
   *  theta: a given angle
   *  phi: equal to 2pi-theta
   *  O, A, H: sides opposite to adjacent to theta and the hypotenuse
   */
  constructor(options) {
    // whether to use degrees
    const degrees = (options.degrees === false)? false : true

    this.known = []

    // given side and angle
    if (options.theta) {
      this.theta = degrees? options.theta*Math.PI/180 : options.theta
      this.phi = Math.PI - this.theta
      this.known.push('theta')
      if (options.H) {
        this.H = options.H
        this.known.push('H')
        this.O = this.H * Math.sin(this.theta)
        this.A = this.H * Math.cos(this.theta)
      }
      else if (options.A) {
        this.A = options.A
        this.known.push('A')
        this.O = this.A * Math.tan(this.theta) // tan(θ)=O/A
        this.H = this.A / Math.cos(this.theta) // cos(θ)=A/H
      }
      else if (options.O) {
        this.O = options.O
        this.known.push('O')
        this.A = this.O / Math.tan(this.theta) // tan(θ)=O/A
        this.H = this.O / Math.sin(this.theta) // sin(θ)=O/H
      }
      else {
        throw new Error('Angle given but no sides')
      }
    }
    else { // should have two sides now
      if (options.A && options.O) {
        this.A = options.A
        this.O = options.O
        this.known.push('A')
        this.known.push('O')
        this.H = Math.hypot(this.A,this.O)
      }
      else if (options.A && options.H) {
        this.A = options.A
        this.H = options.H
        this.known.push('A')
        this.known.push('H')
        this.O = Math.sqrt(this.H**2 - this.A**2)
      }
      else if (options.O && options.H) {
        this.O = options.O
        this.H = options.H
        this.known.push('O')
        this.known.push('H')
        this.A = Math.sqrt(this.H**2 - this.O**2)
      }
      else {
        throw new Error('No angle given but <2 sides given')
      }
      this.theta = Math.atan(this.O/this.A)
      this.phi = Math.PI = this.theta
    }

    if (!this.A || !this.O || !this.H || !this.theta || !this.phi) {
      throw new Error(`Not all parameters initialised. ${options}`)
    }
  }

}

RightAngleQ.optionsSpec = [
]
