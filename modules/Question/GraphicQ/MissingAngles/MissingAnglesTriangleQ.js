/* Missing angles in triangle - numerical */

import { GraphicQ } from 'Question/GraphicQ/GraphicQ'
import MissingAnglesTriangleView from 'Question/GraphicQ/MissingAngles/MissingAnglesTriangleView'
import MissingAnglesTriangleData from './MissingAnglesTriangleData'

export default class MissingAnglesTriangleQ extends GraphicQ {
  constructor (data, view, options) {
    super(options) // this should be all that's required when refactored
    this.data = data
    this.view = view
  }

  static random (options, viewOptions) {
    const optionsOverride = {
      angleSum: 180,
      minAngle: 25,
      minN: 3,
      maxN: 3,
    }
    options = Object.assign(options,optionsOverride)
    options.repeated  = options.repeated || false

    const data = MissingAnglesTriangleData.random(options)
    const view = new MissingAnglesTriangleView(data, viewOptions)

    return new MissingAnglesTriangleQ(data, view, options)
  }

  static get commandWord () { return 'Find the missing value' }
}
