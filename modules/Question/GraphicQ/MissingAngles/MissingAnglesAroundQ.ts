/* Question type comprising numerical missing angles around a point and
 * angles on a straight line (since these are very similar numerically as well
 * as graphically.
 *
 * Also covers cases where more than one angle is equal
 *
 */

import { OptionsSpec } from 'OptionsSpec'
import { GraphicQ } from 'Question/GraphicQ/GraphicQ'
import MissingAnglesAroundView from 'Question/GraphicQ/MissingAngles/MissingAnglesAroundView'
import { MissingAnglesNumberData } from 'Question/GraphicQ/MissingAngles/MissingAnglesNumberData'
import { MissingAnglesViewOptions } from './MissingAnglesViewOptions'
import { MissingAngleOptions } from './NumberOptions'

export default class MissingAnglesAroundQ extends GraphicQ {
  data: MissingAnglesNumberData
  view: MissingAnglesAroundView

  constructor (data: MissingAnglesNumberData, view: MissingAnglesAroundView) { // effectively private
    super() // bubbles to Q
    this.data = data
    this.view = view
  }

  static random (options: Partial<MissingAngleOptions>, viewOptions: MissingAnglesViewOptions) : MissingAnglesAroundQ {
    const defaults : MissingAngleOptions = {
      angleSum: 180,
      minAngle: 15,
      minN: 2,
      maxN: 4,
      repeated: false,
      nMissing: 3
    }
    const settings: MissingAngleOptions = Object.assign({}, defaults, options)

    const data = MissingAnglesNumberData.random(settings)
    const view = new MissingAnglesAroundView(data, viewOptions) // TODO eliminate public constructors

    return new MissingAnglesAroundQ(data, view)
  }

  static get commandWord () : string { return 'Find the missing value' }
}
