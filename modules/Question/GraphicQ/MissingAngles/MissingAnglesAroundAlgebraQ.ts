/** Missing angles around a point or on a straight line, using algebraic expressions */

import { OptionsSpec } from 'OptionsSpec'
import { GraphicQ } from 'Question/GraphicQ/GraphicQ'
import { AlgebraOptions } from './AlgebraOptions'
import MissingAnglesAlgebraData from './MissingAnglesAlgebraData'
import MissingAnglesAroundAlgebraView from './MissingAnglesAroundAlgebraView'
import { MissingAnglesViewOptions } from './MissingAnglesViewOptions'

export default class MissingAnglesAroundAlgebraQ extends GraphicQ {
  data!: MissingAnglesAlgebraData       // initialised in super()
  view!: MissingAnglesAroundAlgebraView

  constructor (data: MissingAnglesAlgebraData, view: MissingAnglesAroundAlgebraView) { // effectively private
    super(data, view) // bubbles to Q
  }

  static random (options: Partial<AlgebraOptions>, viewOptions: MissingAnglesViewOptions) : MissingAnglesAroundAlgebraQ {
    const defaults : AlgebraOptions = {
      angleSum: 180,
      minAngle: 15,
      minN: 2,
      maxN: 4,
      repeated: false,
      expressionTypes: ['add', 'multiply', 'mixed'],
      ensureX: true,
      includeConstants: true,
      minCoefficient: 1,
      maxCoefficient: 4,
      minXValue: 15
    }
    const settings: AlgebraOptions = Object.assign({}, defaults, options)

    const data = MissingAnglesAlgebraData.random(settings)
    const view = new MissingAnglesAroundAlgebraView(data, viewOptions) // TODO eliminate public constructors

    return new MissingAnglesAroundAlgebraQ(data, view)
  }

  static get commandWord () : string { return 'Find the missing value' }

  static get optionsSpec () : OptionsSpec {
    return [
      {
        id: 'expressionTypes',
        type: 'select-inclusive',
        title: 'Types of expression',
        selectOptions: [
          {title: '<em>a</em>+<em>x</em>', id:'add'},
          {title: '<em>ax</em>', id: 'multiply'},
          {title: 'mixed', id: 'mixed'}
        ],
        default: ['add','multiply','mixed']
      },
      {
        id: 'ensureX',
        type: 'bool',
        title: 'Ensure one angle is <em>x</em>',
        default: true
      },
      {
        id: 'includeConstants',
        type: 'bool',
        title: 'Ensure a constant angle',
        default: true
      }
    ]
  }
}
