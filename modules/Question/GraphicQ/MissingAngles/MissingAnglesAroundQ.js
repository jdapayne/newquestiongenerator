/* Question type comprising numerical missing angles around a point and
 * angles on a straight line (since these are very similar numerically as well
 * as graphically.
 *
 * Also covers cases where more than one angle is equal
 *
 */

import { GraphicQ } from 'Question/GraphicQ/GraphicQ'
import MissingAnglesAroundView from 'Question/GraphicQ/MissingAngles/MissingAnglesAroundView'
import MissingAnglesNumberData from 'Question/GraphicQ/MissingAngles/MissingAnglesNumberData'

export default class MissingAnglesAroundQ extends GraphicQ {
  constructor (data, view, options) { // effectively private
    super(options) // want to reform GraphicQ.
    this.data = data
    this.view = view
  }

  static random (options) {
    const defaults = {
      angleSum: 180,
      minAngle: 10,
      minN: 2,
      maxN: 4
    }
    options = Object.assign({}, defaults, options)

    const data = MissingAnglesNumberData.random(options)
    const view = new MissingAnglesAroundView(data, options) // TODO eliminate public constructors

    return new MissingAnglesAroundQ(data, view)
  }

  static get commandWord () { return 'Find the missing value' }
}
