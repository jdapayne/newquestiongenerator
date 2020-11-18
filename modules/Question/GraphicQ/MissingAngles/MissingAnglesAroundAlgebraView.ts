import Point from 'Point'
import { Label } from '../GraphicQ'
import MissingAnglesAlgebraData from './MissingAnglesAlgebraData'
import MissingAnglesAroundView from './MissingAnglesAroundView'
import { MissingAnglesViewOptions } from './MissingAnglesViewOptions'

export default class MissingAnglesAroundAlgebraView extends MissingAnglesAroundView {
  // O : Point      Inherited from MissingAnglesAroundView
  // A: Point         |
  // C: Point[]       |
  // rotation: number V

    // labels: Label[]            Inherited from GraphicQView
    // canvas: HTMLCanvasElement      |
    // DOM: HTMLElement               |
    // width: number                  |
    // height: number                 V
    data!: MissingAnglesAlgebraData // initialised by super()

    constructor (data: MissingAnglesAlgebraData, options: MissingAnglesViewOptions) {
      super(data, options) // super constructor does real work
      const solutionLabel: Partial<Label> = {
        pos: new Point(10, this.height - 10),
        textq: '',
        texta: `x = ${this.data.x}^\\circ`,
        styleq: 'hidden',
        stylea: 'extra-answer'
      }
      solutionLabel.style = solutionLabel.styleq
      solutionLabel.text = solutionLabel.textq

      this.labels.push(solutionLabel as Label)
    }
}
