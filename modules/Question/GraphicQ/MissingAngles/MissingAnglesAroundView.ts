/* Renders missing angles problem when the angles are at a point
 * I.e. on a straight line or around a point
 * Could also be adapted to angles forming a right angle
 *
 * Should be flexible enough for numerical problems or algebraic ones
 *
 */

import Point from 'Point'
import { GraphicQView, Label } from 'Question/GraphicQ/GraphicQ'
import { roundDP } from 'utilities'
import { MissingAnglesNumberData } from './MissingAnglesNumberData'
import { MissingAnglesViewOptions } from './MissingAnglesViewOptions'

export default class MissingAnglesAroundView extends GraphicQView {
  radius: number
  O: Point
  A: Point
  C: Point[]
  viewAngles: number[] // 'fudged' versions of data.angles for display
  data!: MissingAnglesNumberData // initialised in super call
  rotation: number

  constructor (data : MissingAnglesNumberData, options : MissingAnglesViewOptions) {
    super(data, options) // sets this.width this.height, initialises this.labels, creates dom elements
    const width = this.width
    const height = this.height
    const radius = this.radius = Math.min(width, height) / 2.5
    const minViewAngle = options.minViewAngle || 25

    this.viewAngles = fudgeAngles(this.data.angles, minViewAngle)

    // Set up main points
    this.O = new Point(0, 0) // center point
    this.A = new Point(radius, 0) // first point
    this.C = [] // Points around outside
    let totalangle = 0 // nb in radians
    for (let i = 0; i < this.data.angles.length; i++) {
      totalangle += this.viewAngles[i] * Math.PI / 180
      this.C[i] = Point.fromPolar(radius, totalangle)
    }

    // Randomly rotate and center
    this.rotation = (options.rotation !== undefined) ? this.rotate(options.rotation) : this.randomRotate()
    // this.scaleToFit(width,height,10)
    this.translate(width / 2, height / 2)

    // Set up labels (after scaling and rotating)
    totalangle = Point.angleFrom(this.O, this.A) * 180 / Math.PI // angle from O that A is
    for (let i = 0; i < this.viewAngles.length; i++) {
      // Label text
      const label : Partial<Label> = {}
      const textq = this.data.angleLabels[i]
      const texta = roundDP(this.data.angles[i], 2).toString() + '^\\circ'

      // Positioning
      const theta = this.viewAngles[i]
      /* could be used for more advanced positioning
      const midAngle = totalangle + theta / 2
      const minDistance = 0.3 // as a fraction of radius
      const labelLength = Math.max(textq.length, texta.length) - '^\\circ'.length // ° takes up very little space
      */

      /* Explanation: Further out if:
      *   More vertical (sin(midAngle))
      *   Longer label
      *   smaller angle
      *   E.g. totally vertical, 45°, length = 3
      *   d = 0.3 + 1*3/45 = 0.3 + 0.7 = 0.37
      */
      // const factor = 1        // constant of proportionality. Set by trial and error
      // let distance = minDistance + factor * Math.abs(sinDeg(midAngle)) * labelLength / theta

      // Just revert to old method

      const distance = 0.4 + 6 / theta

      label.pos = Point.fromPolarDeg(radius * distance, totalangle + theta / 2).translate(this.O.x, this.O.y)
      label.textq = textq
      label.styleq = 'normal'

      if (this.data.missing[i]) {
        label.texta = texta
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
  }

  render () : void {
    const ctx = this.canvas.getContext('2d')
    if (ctx === null) {throw new Error("Could not get canvas context")}

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
    for (let i = 0; i < this.viewAngles.length; i++) {
      const theta = this.viewAngles[i] * Math.PI / 180
      // 0.07/theta radians ~= 4/theta
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

  get allpoints () : Point[] {
    let allpoints = [this.A, this.O]
    allpoints = allpoints.concat(this.C)
    this.labels.forEach(function (l) {
      allpoints.push(l.pos)
    })
    return allpoints
  }
}

/**
 * Adjusts a set of angles so that all angles are greater than {minAngle} by reducing other angles in proportion
 * @param angles The set of angles to adjust
 * @param minAngle The smallest angle in the output
 */
function fudgeAngles (angles: number[], minAngle: number) : number[] {

  const angleSum = angles.reduce((a,c)=>a+c)
  const mappedAngles = angles.map((x, i) => [x, i]) // remember original indices
  const smallAngles = mappedAngles.filter(x => x[0] < minAngle)  // split out angles which are too small
  const largeAngles = mappedAngles.filter(x => x[0] >= minAngle) 
  const largeAngleSum = largeAngles.reduce((accumulator, currentValue) => accumulator + currentValue[0], 0)

  smallAngles.forEach(small => {
    const difference = minAngle - small[0]
    small[0] += difference
    largeAngles.forEach(large => {
      const reduction = difference * large[0] / largeAngleSum
      large[0] = Math.round(large[0] - reduction)
    })
  })

  // fix any rounding errors introduced

  let newAngles =  smallAngles.concat(largeAngles) // combine together
    .sort((x, y) => x[1] - y[1]) // sort by previous index
    .map(x => x[0]) // strip out index

  let newSum = newAngles.reduce((acc,curr) => acc + curr)
  if (newSum !== angleSum) {
    const difference = angleSum - newSum
    newAngles[newAngles.indexOf(Math.max(...newAngles))] += difference
  }
  newSum = newAngles.reduce((acc,curr) => acc + curr)
  if (newSum !== angleSum) throw new Error (`Didn't fix angles. New sum is ${newSum}, but should be ${angleSum}`)

  return newAngles
}
