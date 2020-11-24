import { GraphicQ } from '../GraphicQ'
import ViewOptions from '../ViewOptions'
import ParallelogramAreaData from './ParallelogramAreaData'
import ParallelogramAreaView from './ParallelogramAreaView'
import { QuestionOptions } from './types'

// Parallelogram needs no further options
// Triangle needs no further options -- needs passing in

export default class ParallelogramAreaQ extends GraphicQ {
  data!: ParallelogramAreaData // initialised in super()
  view!: ParallelogramAreaView

  static random (options: QuestionOptions, viewOptions: ViewOptions) {
    const data = ParallelogramAreaData.random(options)
    const view = ParallelogramAreaView.fromData(data, viewOptions)
    return new this(data, view)
  }

  static get commandWord () {
    return 'Find the missing values'
  }
}

