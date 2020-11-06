import Point from 'Point'
import { GraphicQView, Label } from 'Question/GraphicQ/GraphicQ'
import { sinDeg, dashedLine } from 'Utilities'
import MissingAnglesTriangleData from './MissingAnglesTriangleData'

export default class MissingAnglesTriangleView extends GraphicQView {
  A : Point // the vertices of the triangle
  B : Point
  C : Point
  rotation: number
  // Inherited members:
  labels: Label[]
  canvas: HTMLCanvasElement
  DOM: HTMLElement
  width: number
  height: number
  data: MissingAnglesTriangleData

  constructor (data, options) {
    super(data, options) // sets this.width this.height, this.data initialises this.labels, creates dom elements
    const width = this.width
    const height = this.height

    const displayAngles : number[] = []

    // generate points (with longest side 1
    this.A = new Point(0, 0)
    this.B = Point.fromPolarDeg(1, data.angles[0])
    this.C = new Point(
      sinDeg(this.data.angles[1]) / sinDeg(this.data.angles[2]), 0
    )

    // Create labels
    const inCenter = Point.inCenter(this.A, this.B, this.C)

    let j = 0 // keeps track of 'x' and 'y' as labels
    for (let i = 0; i < 3; i++) {
      const p = [this.A, this.B, this.C][i]

      const label : Partial<Label> = {}

      // question text
      let textq
      if (this.data.missing[i]) {
        textq = String.fromCharCode(120+j) // 120 = 'x'
        j++
      } else {
        textq = this.data.angles[i].toString()
      }
      textq += '^\\circ'

      label.pos = Point.mean(p, p, inCenter) 
      label.textq = textq
      label.styleq = 'normal'

      if (this.data.missing[i]) {
        label.texta = this.data.angles[i].toString() + '^\\circ'
        label.stylea = 'answer'
      } else {
        label.texta = label.textq
        label.stylea = label.styleq
      }
      label.text = label.textq
      label.style = label.styleq

      this.labels[i] = label as Label
    }

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
