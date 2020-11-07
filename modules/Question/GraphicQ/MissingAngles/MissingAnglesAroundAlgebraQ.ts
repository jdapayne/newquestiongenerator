/** Missing angles around a point or on a straight line, using algebraic expressions */

import { GraphicQ } from 'Question/GraphicQ/GraphicQ'
import { AlgebraOptions } from './AlgebraOptions'
import MissingAnglesAlgebraData from './MissingAnglesAlgebraData'
import MissingAnglesAroundAlgebraView from './MissingAnglesAroundAlgebraView'
import { MissingAnglesViewOptions } from './MissingAnglesViewOptions'

export default class MissingAnglesAroundAlgebraQ extends GraphicQ {
  data: MissingAnglesAlgebraData
  view: MissingAnglesAroundAlgebraView

  constructor (data: MissingAnglesAlgebraData, view: MissingAnglesAroundAlgebraView) { // effectively private
    super() // bubbles to Q
    this.data = data
    this.view = view
  }

  static random (options: AlgebraOptions, viewOptions: MissingAnglesViewOptions) : MissingAnglesAroundAlgebraQ {
    const defaults : AlgebraOptions = {
      angleSum: 180,
      minAngle: 10,
      minN: 2,
      maxN: 4,
      repeated: false,
    }
    options = Object.assign({}, defaults, options)

    const data = MissingAnglesAlgebraData.random(options)
    const view = new MissingAnglesAroundAlgebraView(data, viewOptions) // TODO eliminate public constructors

    return new MissingAnglesAroundAlgebraQ(data, view)
  }

  static get commandWord () : string { return 'Find the missing value' }
}
