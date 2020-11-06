/** Missing angles around a point or on a straight line, using algebraic expressions */

import { GraphicQ } from 'Question/GraphicQ/GraphicQ'
import { AlgebraOptions } from './AlgebraOptions'
import MissingAnglesAlgebraData from './MissingAnglesAlgebraData'
import MissingAnglesAroundAlgebraView from './MissingAnglesAroundAlgebraView'

export default class MissingAnglesAroundAlgebraQ extends GraphicQ {
  data: MissingAnglesAlgebraData
  view: MissingAnglesAroundAlgebraView

  constructor (data: MissingAnglesAlgebraData, view: MissingAnglesAroundAlgebraView) { // effectively private
    super() // bubbles to Q
    this.data = data
    this.view = view
  }

  static random (options: AlgebraOptions) : MissingAnglesAroundAlgebraQ {
    const defaults : AlgebraOptions = {
      angleSum: 180,
      minAngle: 10,
      minN: 2,
      maxN: 4,
      repeated: false,
      width: 250,
      height: 250
    }
    options = Object.assign({}, defaults, options)

    const data = MissingAnglesAlgebraData.random(options)
    const view = new MissingAnglesAroundAlgebraView(data, options as {width: number, height: number}) // TODO eliminate public constructors

    return new MissingAnglesAroundAlgebraQ(data, view)
  }

  static get commandWord () : string { return 'Find the missing value' }
}
