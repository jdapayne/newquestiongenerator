import { Value } from "./RectangleAreaData"
import { QuestionOptions } from "./types"
import fraction from 'fraction.js'
import { gaussianCurry, randBetween, randElem, scaledStr } from "utilities"

export default class ParallelogramAreaData {
  readonly base: Value
  readonly height: Value
  readonly side: Value
  readonly showOpposites: boolean
  private readonly dp: number
  private readonly denominator: number = 1
  private _area?: Partial<Value> // lazily calculated
  private _perimeter?: Partial<Value>

  constructor(base: Value, height: Value, side: Value, showOpposites: boolean, dp: number, denominator: number, areaProperties?: Omit<Value, 'val'>, perimeterProperties?: Omit<Value, 'val'>) {
    this.base = base
    this.height = height
    this.side = side
    this.showOpposites = showOpposites
    this.dp = dp
    this.denominator = denominator
    this._area = areaProperties
    this._perimeter = perimeterProperties
  }

  static random(options: QuestionOptions): ParallelogramAreaData {
    const maxLength = options.maxLength
    const dp = options.dp
    const denominator = options.fraction ? randBetween(2, 6) : 1

    // basic values
    const base: Value = {
      val: randBetween(1, maxLength),
      show: true,
      missing: false
    }
    const height: Value = {
      val: randBetween(Math.ceil(base.val/8), 2*base.val+Math.ceil(base.val/8), gaussianCurry(2)),
      show: true,
      missing: false
    }

    const side: Value = {
      val: randBetween(height.val+1, height.val*3, ()=>(Math.random())**2), // distribution is biased towards lower values
      show: true,
      missing: false
    }

    const areaProperties: Omit<Value, 'val'> = {
      show: false,
      missing: false
    }

    const perimeterProperties: Omit<Value, 'val'> = {
      show: false,
      missing: false
    }

    // Labels
    if (denominator>1) {
      [base,height,side].forEach(v=>{
        v.label = new fraction(v.val,denominator).toLatex(true) + "\\mathrm{cm}"
      })
    } else {
      [base,height,side].forEach(v=>{
        v.label = scaledStr(v.val,dp) + "\\mathrm{cm}"
      })
    }

    // adjust for question type
    let showOpposites = false
    switch (options.questionType) {
      case 'area':
        areaProperties.show = true
        areaProperties.missing = true
        side.show = !options.noDistractors
        break
      case 'perimeter':
        perimeterProperties.show = true
        perimeterProperties.missing = true
        showOpposites = options.noDistractors
        height.show = !options.noDistractors
        break
      case 'reverseArea':
        areaProperties.show = true
        areaProperties.missing = false
        randElem([base, height]).missing = true
        break
      case 'reversePerimeter':
      default:
        perimeterProperties.show = true
        perimeterProperties.missing = false
        randElem([base, side]).missing = true
        break
    }

    return new ParallelogramAreaData(base, height, side, showOpposites, dp, denominator, areaProperties, perimeterProperties)
  }

  get perimeter(): Value {
    if (!this._perimeter) {
      this._perimeter = {
        show: false,
        missing: true
      }
    }
    if (!this._perimeter.val) {
      this._perimeter.val = 2 * (this.base.val + this.side.val)
      if (this.denominator > 1) {
        this._perimeter.label = new fraction(this._perimeter.val, this.denominator).toLatex(true) + '\\mathrm{cm}'
      } else {
        this._perimeter.label = scaledStr(this._perimeter.val, this.dp) + '\\mathrm{cm}'
      }
    }
    return this._perimeter as Value
  }

  get area(): Value {
    if (!this._area) {
      this._area = {
        show: false,
        missing: true
      }
    }
    if (!this._area.val) {
      this._area.val = this.base.val * this.height.val
      if (this.denominator > 1) {
        this._area.label = new fraction(this._area.val, this.denominator ** 2).toLatex(true) + '\\mathrm{cm}^2'
      } else {
        this._area.label = scaledStr(this._area.val, 2 * this.dp) + '\\mathrm{cm}^2'
      }
    }
    return this._area as Value
  }
}
