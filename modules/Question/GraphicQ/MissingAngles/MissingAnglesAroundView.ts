/* Renders missing angles problem when the angles are at a point
 * I.e. on a straight line or around a point
 * Could also be adapted to angles forming a right angle
 *
 * Should be flexible enough for numerical problems or algebraic ones
 *
 */

import Point from 'Point'
import { GraphicQView, Label } from 'Question/GraphicQ/GraphicQ'
import { MissingAnglesNumberData } from './MissingAnglesNumberData'

export default class MissingAnglesAroundView extends GraphicQView {
  radius: number
  O: Point
  A: Point
  C: Point[]
  data: MissingAnglesNumberData
  rotation: number
  
  constructor (data, options) {
    super(data, options) // sets this.width this.height, initialises this.labels, creates dom elements
    const width = this.width
    const height = this.height
    const radius = this.radius = Math.min(width, height) / 2.5

    // Set up main points
    this.O = new Point(0, 0) // center point
    this.A = new Point(radius, 0) // first point
    this.C = [] // Points around outside
    let totalangle = 0 // nb in radians
    for (let i = 0; i < this.data.angles.length; i++) {
      totalangle += this.data.angles[i] * Math.PI / 180
      this.C[i] = Point.fromPolar(radius, totalangle)
    }

    // Set up labels
    totalangle = 0
    for (let i = 0; i < this.data.angles.length; i++) {
      const label : Partial<Label> = {}
      const theta = this.data.angles[i]

      /* calculate distance out from center of label */
      let d = 0.4
      const labelLength = this.data.angleLabels[i].length - '^\\circ'.length
      d += 3*labelLength/theta // inversely proportional to angle, proportional to lenght of label
      d = Math.min(d,1)

      label.pos = Point.fromPolarDeg(radius * d, totalangle + theta / 2),
      label.textq = this.data.angleLabels[i],
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

      totalangle += theta
    }

    this.labels.forEach(l => {
      l.text = l.textq
      l.style = l.styleq
    })

    // Randomly rotate and center
    this.rotation = (options.rotation !== undefined) ? this.rotate(options.rotation) : this.randomRotate()
    this.translate(width / 2 - this.O.x, height / 2 - this.O.y) // centre
  }

  render () {
    const ctx = this.canvas.getContext('2d')

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height) // clear

    ctx.beginPath()
    ctx.moveTo(this.O.x, this.O.y) // draw lines
    ctx.lineTo(this.A.x, this.A.y)
    for (let i = 0; i < this.C.length; i++) {
      ctx.moveTo(this.O.x, this.O.y)
      ctx.lineTo(this.C[i].x, this.C[i].y)
    }
    ctx.strokeStyle = 'gray'
    ctx.stroke()
    ctx.closePath()

    ctx.beginPath()
    let totalangle = this.rotation
    for (let i = 0; i < this.data.angles.length; i++) {
      const theta = this.data.angles[i] * Math.PI / 180
      ctx.arc(this.O.x, this.O.y, this.radius * (0.2 + 0.07 / theta), totalangle, totalangle + theta)
      ctx.stroke()
      totalangle += theta
    }
    ctx.closePath()

    // testing label positioning:
    // this.labels.forEach(l => {
    // ctx.fillStyle = 'red'
    // ctx.fillRect(l.pos.x - 1, l.pos.y - 1, 3, 3)
    // })

    this.renderLabels(false)
  }

  get allpoints () {
    let allpoints = [this.A, this.O]
    allpoints = allpoints.concat(this.C)
    this.labels.forEach(function (l) {
      allpoints.push(l.pos)
    })
    return allpoints
  }
}
