/* Question type comprising numerical missing angles around a point and
 * angles on a straight line (since these are very similar numerically as well
 * as graphically.
 *
 * Also covers cases where more than one angle is equal
 *
 */

import { GraphicQ } from 'GraphicQ'
import MissingAnglesAroundView from 'MissingAngles/MissingAnglesAroundView'
import MissingAnglesNumberData from 'MissingAngles/MissingAnglesNumberData'

export default class AnglesFormingQ extends GraphicQ {
  constructor (options) {
    super() // processes options into this.settings

    const defaults = {
      angleSum: 180,
      minAngle: 10,
      minN: 2,
      maxN: 4
    }

    // Order of importance
    // (1) options passed to this constructor
    // (2) defaults for this constructor
    // (3) any options set from parent constructor
    //
    Object.assign(this.settings, defaults, options)

    this.data = new MissingAnglesNumberData(this.settings)
    this.view = new MissingAnglesAroundView(this.data, this.settings)
  }

  static get commandWord () { return 'Find the missing value' }
}
