import { OptionsSpec } from 'OptionsSpec'
import { GraphicQ } from '../GraphicQ'
import MissingAnglesAroundWordedView from './MissingAnglesAroundWordedView'
import { MissingAnglesViewOptions } from './MissingAnglesViewOptions'
import MissingAnglesWordedData from './MissingAnglesWordedData'
import { WordedOptions } from './WordedOptions'

export default class MissingAnglesWordedQ extends GraphicQ {
  data: MissingAnglesWordedData
  view: MissingAnglesAroundWordedView

  constructor (data: MissingAnglesWordedData, view: MissingAnglesAroundWordedView) {
    super()
    this.data = data
    this.view = view
  }

  static random (options: WordedOptions, viewOptions: MissingAnglesViewOptions) : MissingAnglesWordedQ {
    const defaults : WordedOptions = {
      angleSum: 180,
      minAngle: 10,
      minN: 2,
      maxN: 2,
      repeated: false
    }
    options = Object.assign({}, defaults, options)

    viewOptions = viewOptions || {}

    const data = MissingAnglesWordedData.random(options)
    const view = new MissingAnglesAroundWordedView(data, viewOptions)

    return new this(data, view)
  }

  static get optionsSpec(): OptionsSpec {
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
