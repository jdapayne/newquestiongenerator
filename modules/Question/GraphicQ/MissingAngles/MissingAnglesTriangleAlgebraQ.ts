import { GraphicQ } from '../GraphicQ'
import ViewOptions from '../ViewOptions'
import { AlgebraOptions } from './AlgebraOptions'
import MissingAnglesAlgebraData from './MissingAnglesAlgebraData'
import MissingAnglesTriangleAlgebraView from './MissingAnglesTriangleAlgebraView'
import MissingAnglesTriangleView from './MissingAnglesTriangleView'

export default class MissingAnglesTriangleAlgebraQ extends GraphicQ {
  data!: MissingAnglesAlgebraData
  view!: MissingAnglesTriangleView

  static random (options: Partial<AlgebraOptions>, viewOptions: ViewOptions) : MissingAnglesTriangleAlgebraQ {
    const optionsOverride : Partial<AlgebraOptions> = {
      angleSum: 180,
      minN: 3,
      maxN: 3,
      repeated: false
    }
    const defaults : AlgebraOptions = {
      angleSum: 180,
      minN: 3,
      maxN: 3,
      repeated: false,
      minAngle: 25,
      expressionTypes: ['add', 'multiply', 'mixed'],
      ensureX: true,
      includeConstants: true,
      minCoefficient: 1,
      maxCoefficient: 4,
      minXValue: 15
    }
    const settings: AlgebraOptions = Object.assign({}, defaults, options, optionsOverride)

    const data = MissingAnglesAlgebraData.random(settings)
    const view = new MissingAnglesTriangleAlgebraView(data, viewOptions)

    return new this(data, view)
  }

  static get commandWord () : string { return 'Find the missing value' }
}
