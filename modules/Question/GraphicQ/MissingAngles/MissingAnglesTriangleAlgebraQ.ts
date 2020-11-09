import { GraphicQ } from '../GraphicQ'
import ViewOptions from '../ViewOptions'
import { AlgebraOptions } from './AlgebraOptions'
import MissingAnglesAlgebraData from './MissingAnglesAlgebraData'
import MissingAnglesTriangleAlgebraView from './MissingAnglesTriangleAlgebraView'
import MissingAnglesTriangleView from './MissingAnglesTriangleView'

export default class MissingAnglesTriangleAlgebraQ extends GraphicQ {
  data: MissingAnglesAlgebraData
  view: MissingAnglesTriangleView

  constructor (data: MissingAnglesAlgebraData, view: MissingAnglesTriangleView) {
    super()
    this.data = data
    this.view = view
  }

  static random (options: AlgebraOptions, viewOptions: ViewOptions) : MissingAnglesTriangleAlgebraQ {
    const optionsOverride : AlgebraOptions = {
      angleSum: 180,
      minN: 3,
      maxN: 3,
      repeated: false
    }
    Object.assign(options, optionsOverride)

    const data = MissingAnglesAlgebraData.random(options)
    const view = new MissingAnglesTriangleAlgebraView(data, viewOptions)

    return new this(data, view)
  }

  static get commandWord () : string { return 'Find the missing value' }
}
