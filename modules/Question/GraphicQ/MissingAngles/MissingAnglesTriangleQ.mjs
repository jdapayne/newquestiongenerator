/* Missing angles in triangle - numerical */

import { GraphicQ } from 'GraphicQ'
import MissingAnglesTriangleView from 'MissingAngles/MissingAnglesTriangleView'
import MissingAnglesNumberData from 'MissingAngles/MissingAnglesNumberData'

export default class AnglesFormingQ extends GraphicQ {
  constructor (options) {
    super() // processes options into this.settings

    const defaults = {
      angleSum: 180,
      minAngle: 25,
      minN: 3,
      maxN: 3
    }

    // Order of importance
    // (1) options passed to this constructor
    // (2) defaults for this constructor
    // (3) any options set from parent constructor
    //
    Object.assign(this.settings, defaults, options)

    this.data = MissingAnglesNumberData.random(this.settings)
    this.view = new MissingAnglesTriangleView(this.data, this.settings)
  }

  static get commandWord () { return 'Find the missing value' }
}
