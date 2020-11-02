import Point from 'Point'
import { GraphicQView } from 'GraphicQ'
import { sinDeg, dashedLine } from 'Utilities'

export default class MissingAnglesTriangleView extends GraphicQView {
  // this.A, this.B, this.C :: Point -- the vertices of the triangle
  // this.labels = []
  // this.canvas
  // this.DOM
  // this.rotation
  constructor (data, options) {
    super(data, options) // sets this.width this.height, this.data initialises this.labels, creates dom elements
    const width = this.width
    const height = this.height

    // generate points (with longest side 1
    this.A = new Point(0, 0)
    this.B = Point.fromPolarDeg(1, data.angles[0])
    this.C = new Point(
      sinDeg(this.data.angles[1]) / sinDeg(this.data.angles[2]), 0
    )

    // Create labels
    const inCenter = Point.inCenter(this.A, this.B, this.C)

    for (let i = 0; i < 3; i++) {
      const p = [this.A, this.B, this.C][i]

      // nudging label toward center
      // const nudgeDistance = this.data.angles[i]
      // const position = p.clone().moveToward(inCenter,
      this.labels[i] = {
        pos: Point.mean(p, p, inCenter), // weighted mean - position from inCenter
        textq: this.data.missing[i] ? 'x^\\circ' : this.data.angles[i].toString() + '^\\circ',
        styleq: 'normal'
      }
      if (this.data.missing[i]) {
        this.labels[i].texta = this.data.angles[i].toString() + '^\\circ'
        this.labels[i].stylea = 'answer'
      } else {
        this.labels[i].texta = this.labels[i].textq
        this.labels[i].stylea = this.labels[i].styleq
      }
    }

    this.labels.forEach(l => {
      l.text = l.textq
      l.style = l.styleq
    })

    // rotate randomly
    this.rotation = (options.rotation !== undefined) ? this.rotate(options.rotation) : this.randomRotate()

    // scale and fit
    // scale to size
    const margin = 0
    let topleft = Point.min([this.A, this.B, this.C])
    let bottomright = Point.max([this.A, this.B, this.C])
    const totalWidth = bottomright.x - topleft.x
    const totalHeight = bottomright.y - topleft.y
    this.scale(Math.min((width - margin) / totalWidth, (height - margin) / totalHeight)) // 15px margin

    // move to centre
    topleft = Point.min([this.A, this.B, this.C])
    bottomright = Point.max([this.A, this.B, this.C])
    const center = Point.mean(topleft, bottomright)
    this.translate(width / 2 - center.x, height / 2 - center.y) // centre
  }

  render () {
    const ctx = this.canvas.getContext('2d')
    const vertices = [this.A, this.B, this.C]
    const apex = this.data.apex // hmmm

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height) // clear

    ctx.beginPath()
    ctx.moveTo(this.A.x, this.A.y)

    for (let i = 0; i < 3; i++) {
      const p = vertices[i]
      const next = vertices[(i + 1) % 3]
      if (apex === i || apex === (i + 1) % 3) { // to/from apex - draw dashed line
        dashedLine(ctx, p.x, p.y, next.x, next.y)
      } else {
        ctx.lineTo(next.x, next.y)
      }
    }
    ctx.strokeStyle = 'gray'
    ctx.stroke()
    ctx.closePath()

    this.renderLabels(false)
  }

  get allpoints () {
    const allpoints = [this.A, this.B, this.C]
    this.labels.forEach(l => { allpoints.push(l.pos) })
    return allpoints
  }
}
