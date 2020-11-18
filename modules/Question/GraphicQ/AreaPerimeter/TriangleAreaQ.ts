import { GraphicQ } from '../GraphicQ'
import ViewOptions from '../ViewOptions'
import TriangleAreaData from './TriangleAreaData'
import TriangleAreaView from './TriangleAreaView'
import { QuestionOptions } from './types'

export default class TriangleAreaQ extends GraphicQ {
  data!: TriangleAreaData | Promise<TriangleAreaData> // initialised in super()
  view!: TriangleAreaView

  constructor (data: TriangleAreaData | Promise<TriangleAreaData>, view: TriangleAreaView) {
    super(data, view)
  }

  static random (options: QuestionOptions, viewOptions: ViewOptions) {
    const data = TriangleAreaData.random(options)
    const view = TriangleAreaView.fromAsyncData(data, viewOptions)
    return new this(data, view)
  }

  static get commandWord () {
    return 'Find the missing values'
  }
}
