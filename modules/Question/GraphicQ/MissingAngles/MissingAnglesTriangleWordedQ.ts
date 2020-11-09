import { GraphicQ } from '../GraphicQ'
import ViewOptions from '../ViewOptions'
import MissingAnglesTriangleWordedView from './MissingAnglesTriangleWordedView'
import MissingAnglesWordedData from './MissingAnglesWordedData'
import { WordedOptions } from './WordedOptions'

export default class MissingAnglesTriangleWordedQ extends GraphicQ {
  data: MissingAnglesWordedData
  view: MissingAnglesTriangleWordedView
  constructor (data: MissingAnglesWordedData, view: MissingAnglesTriangleWordedView) {
    super()
    this.data = data
    this.view = view
  }

  static random (options: WordedOptions, viewOptions: ViewOptions) : MissingAnglesTriangleWordedQ {
    const optionsOverride : WordedOptions = {
      angleSum: 180,
      minN: 3,
      maxN: 3,
      repeated: false
    }
    Object.assign(options, optionsOverride)

    const data = MissingAnglesWordedData.random(options)
    const view = new MissingAnglesTriangleWordedView(data, viewOptions)

    return new this(data, view)
  }

  static get commandWord () : string { return 'Find the missing value' }
}
