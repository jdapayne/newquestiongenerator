import { OptionsSpec } from 'OptionsSpec'
import { GraphicQ } from '../GraphicQ'
import MissingAnglesAroundWordedView from './MissingAnglesAroundWordedView'
import { MissingAnglesViewOptions } from './MissingAnglesViewOptions'
import MissingAnglesWordedData from './MissingAnglesWordedData'
import { WordedOptions } from './WordedOptions'

export default class MissingAnglesWordedQ extends GraphicQ {
  data!: MissingAnglesWordedData
  view!: MissingAnglesAroundWordedView

  static random (options: Partial<WordedOptions>, viewOptions: MissingAnglesViewOptions) : MissingAnglesWordedQ {
    const defaults : WordedOptions = {
      angleSum: 180,
      minAngle: 15,
      minN: 2,
      maxN: 2,
      repeated: false,
      minAddend: -90,
      maxAddend: 90,
      minMultiplier: 1,
      maxMultiplier: 5,
      types: ['add', 'multiply', 'percent', 'ratio']
    }
    const settings = Object.assign({}, defaults, options)

    const data = MissingAnglesWordedData.random(settings)
    const view = new MissingAnglesAroundWordedView(data, viewOptions)

    return new this(data, view)
  }

  static get optionsSpec (): OptionsSpec {
    return [
      {
        type: 'select-inclusive',
        title: 'Question types',
        id: 'types',
        selectOptions: [
          { title: 'More than/less than', id: 'add' },
          { title: 'Multiples', id: 'multiply' },
          { title: 'Percentage change', id: 'percent' },
          { title: 'Ratios', id: 'ratio' }
        ],
        default: ['add', 'multiply']
      }
    ]
  }
}
