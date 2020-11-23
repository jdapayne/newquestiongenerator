import { randBetween, randElem, scaledStr } from 'utilities'
import fraction from 'fraction.js'
import { QuestionOptions } from './types'

/**
 * A value for sides, areas and perimeters
 */
export interface Value {
  val: number, // the numerical value
  label?: string, // the label to display. e.g. "3.4cm"
  show: boolean, // whether that value is shown in the question or answer at all
  missing: boolean, // whether the value is shown in the question
}

export default class RectangleAreaData {
  readonly base : Value
  readonly height: Value
  readonly showOpposites: boolean
  private readonly dp: number
  private readonly denominator: number = 1
  private _area?: Partial<Value> // lazily calculated
  private _perimeter?: Partial<Value>

  constructor (base: Value, height: Value, showOpposites: boolean, dp: number, denominator: number, areaProperties?: Omit<Value, 'val'>, perimeterProperties?: Omit<Value, 'val'>) {
    this.base = base
    this.height = height
    this.showOpposites = showOpposites
    this.dp = dp
    this.denominator = denominator
    this._area = areaProperties
    this._perimeter = perimeterProperties
  }

  static random (options: QuestionOptions) : RectangleAreaData {
    options.maxLength = options.maxLength || 20 // default values
    const dp = options.dp || 0
    const denominator = options.fraction? randBetween(2,6) : 1

    const sides = {
      base: randBetween(1, options.maxLength),
      height: randBetween(1, options.maxLength)
    }

    const base : Value =
      { val: sides.base, show: true, missing: false, label: scaledStr(sides.base,dp) + "\\mathrm{cm}" }
    const height : Value =
      { val: sides.height, show: true, missing: false ,label: scaledStr(sides.height,dp) + "\\mathrm{cm}"}
    if (denominator > 1) {
      ;[base, height].forEach(v => {
        v.label = new fraction(v.val,denominator).toLatex(true) + '\\mathrm{cm}'
      })
    }
    let showOpposites : boolean
    const areaProperties : Partial<Omit<Value, 'val'>> = {}
    const perimeterProperties : Partial<Omit<Value, 'val'>> = {}

    // selectively hide/missing depending on type
    switch (options.questionType) {
      case 'area':
        areaProperties.show = true
        areaProperties.missing = true
        showOpposites = !options.noDistractors
        break
      case 'perimeter':
        perimeterProperties.show = true
        perimeterProperties.missing = true
        showOpposites = options.noDistractors
        break
      case 'reverseArea':
        areaProperties.show = true
        areaProperties.missing = false
        randElem([base, height]).missing = true
        showOpposites = false
        break
      case 'reversePerimeter':
      default:
        perimeterProperties.show = true
        perimeterProperties.missing = false
        randElem([base, height]).missing = true
        showOpposites = false
        break
    }

    return new this(base, height, showOpposites, dp, denominator, areaProperties as Omit<Value, 'val'>, perimeterProperties as Omit<Value, 'val'>)
  }

  get perimeter () : Value {
    if (!this._perimeter) {
      this._perimeter = {
        show: false,
        missing: true
      }
    }
    if (!this._perimeter.val) {
      this._perimeter.val = 2 * (this.base.val + this.height.val)
      if (this.denominator > 1) {
        this._perimeter.label = new fraction(this._perimeter.val, this.denominator).toLatex(true) + '\\mathrm{cm}'
      } else {
        this._perimeter.label = scaledStr(this._perimeter.val, this.dp) + '\\mathrm{cm}'
      }
    }
    return this._perimeter as Value
  }

  get area () : Value {
    if (!this._area) {
      this._area = {
        show: false,
        missing: true
      }
    }
    if (!this._area.val) {
      this._area.val = this.base.val * this.height.val
      if (this.denominator > 1) {
        this._area.label = new fraction(this._area.val, this.denominator**2).toLatex(true) + '\\mathrm{cm}^2'
      } else {
        this._area.label = scaledStr(this._area.val, 2 * this.dp) + '\\mathrm{cm}^2'
      }
    }
    return this._area as Value
  }
}
