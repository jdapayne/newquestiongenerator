import { GraphicQ } from '../GraphicQ'
import ViewOptions from '../ViewOptions'
import TrapeziumAreaData from './TrapeziumAreaData'
import TrapeziumAreaView from './TrapeziumAreaView'
import { QuestionOptions } from './types'

export default class TrapeziumAreaQ extends GraphicQ {
  data!: TrapeziumAreaData // initialised in super()
  view!: TrapeziumAreaView

  static random (options: Required<QuestionOptions>, viewOptions: ViewOptions) {
    const data = TrapeziumAreaData.random(options)
    const view = TrapeziumAreaView.fromData(data,viewOptions)
    return new this(data, view)
  }

  static get commandWord () {
    return 'Find the missing values'
  }
}