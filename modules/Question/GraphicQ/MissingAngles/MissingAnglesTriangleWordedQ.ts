import { GraphicQ } from "../GraphicQ";
import MissingAnglesTriangleWordedView from "./MissingAnglesTriangleWordedView";
import MissingAnglesWordedData from "./MissingAnglesWordedData";
import { WordedOptions } from "./WordedOptions";

export default class MissingAnglesTriangleWordedQ extends GraphicQ {
  data: MissingAnglesWordedData
  view: MissingAnglesTriangleWordedView
  constructor(data, view) {
    super()
    this.data = data
    this.view = view
  }

  static random(options, viewOptions) {
    const optionsOverride : WordedOptions = {
      angleSum: 180,
      minN: 3,
      maxN: 3,
      repeated: false,
    }
    Object.assign(options,optionsOverride)

    const data = MissingAnglesWordedData.random(options)
    const view = new MissingAnglesTriangleWordedView(data, viewOptions)
    
    return new this(data,view)
  }

  static get commandWord() { return 'Find the missing value'}
}