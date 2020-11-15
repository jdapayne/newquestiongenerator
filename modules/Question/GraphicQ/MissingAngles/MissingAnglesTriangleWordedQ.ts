import { GraphicQ } from '../GraphicQ'
import ViewOptions from '../ViewOptions'
import MissingAnglesTriangleWordedView from './MissingAnglesTriangleWordedView'
import MissingAnglesWordedData from './MissingAnglesWordedData'
import { WordedOptions } from './WordedOptions'

export default class MissingAnglesTriangleWordedQ extends GraphicQ {
  data!: MissingAnglesWordedData
  view!: MissingAnglesTriangleWordedView
  constructor (data: MissingAnglesWordedData, view: MissingAnglesTriangleWordedView) {
    super(data,view)
  }

  static random (options: Partial<WordedOptions>, viewOptions: ViewOptions) : MissingAnglesTriangleWordedQ {
    const optionsOverride : Partial<WordedOptions> = {
      angleSum: 180,
      minN: 3,
      maxN: 3,
      repeated: false
    }
    const defaults : WordedOptions = {
      angleSum: 180,
      minAngle: 25,
      minN: 3,
      maxN: 3,
      repeated: false,
      minAddend: -60,
      maxAddend: 60,
      minMultiplier: 1,
      maxMultiplier: 5,
      types: ['add', 'multiply', 'percent', 'ratio']
    }
    const settings: WordedOptions = Object.assign({},defaults,options, optionsOverride)

    const data = MissingAnglesWordedData.random(settings)
    const view = new MissingAnglesTriangleWordedView(data, viewOptions)

    return new this(data, view)
  }

  static get commandWord () : string { return 'Find the missing value' }
}
