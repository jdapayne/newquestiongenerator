/* Missing angles in triangle - numerical */

import { GraphicQ } from 'Question/GraphicQ/GraphicQ'
import MissingAnglesTriangleView from 'Question/GraphicQ/MissingAngles/MissingAnglesTriangleView'
import ViewOptions from '../ViewOptions'
import { MissingAnglesNumberData } from './MissingAnglesNumberData'
import MissingAnglesTriangleData from './MissingAnglesTriangleData'
import { MissingAngleOptions } from './NumberOptions'

export default class MissingAnglesTriangleQ extends GraphicQ {
  data!: MissingAnglesTriangleData
  view!: MissingAnglesTriangleView
  constructor (data: MissingAnglesNumberData, view: MissingAnglesTriangleView) {
    super(data,view) // this should be all that's required when refactored
  }

  static random (options: Partial<MissingAngleOptions>, viewOptions: ViewOptions) {
    const optionsOverride : Partial<MissingAngleOptions> = {
      angleSum: 180,
      minAngle: 25,
      minN: 3,
      maxN: 3
    }
    const defaults : MissingAngleOptions = {
      angleSum: 180,
      minAngle: 15,
      minN: 2,
      maxN: 4,
      repeated: false,
      nMissing: 1
    }

    const settings = Object.assign({},defaults,options,optionsOverride)

    const data = MissingAnglesTriangleData.random(settings)
    const view = new MissingAnglesTriangleView(data, viewOptions)

    return new MissingAnglesTriangleQ(data, view)
  }

  static get commandWord () { return 'Find the missing value' }
}
