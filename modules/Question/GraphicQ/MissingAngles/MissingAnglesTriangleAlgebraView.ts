import Point from 'Point'
import { Label } from '../GraphicQ'
import ViewOptions from '../ViewOptions'
import MissingAnglesAlgebraData from './MissingAnglesAlgebraData'
import MissingAnglesTriangleView from './MissingAnglesTriangleView'

export default class MissingAnglesTriangleAlgebraView extends MissingAnglesTriangleView {
  data!: MissingAnglesAlgebraData // initialised in super.super
  constructor (data: MissingAnglesAlgebraData, options: ViewOptions) {
    super(data, options)

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
