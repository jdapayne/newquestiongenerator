import { randBetween, randElem } from "utilities"
import { QuestionOptions } from "./types"

/**
 * A value for sides, areas and perimeters
 */
export interface Value {
  val: number,      // the numerical value
  show: boolean,    // whether that value is shown in the question or answer at all
  missing: boolean  // whether the value is shown in the question
}


export default class RectangleAreaData {
  readonly base : Value
  readonly height: Value
  readonly showOpposites: boolean
  private _area?: Partial<Value>       // lazily calculated
  private _perimeter?: Partial<Value>

  constructor(base: Value, height: Value, showOpposites: boolean, areaProperties?: Omit<Value,'val'>, perimeterProperties?: Omit<Value,'val'> ) {
    this.base = base
    this.height = height
    this.showOpposites = showOpposites
    this._area = areaProperties
    this._perimeter = perimeterProperties
  }

  static random(options: QuestionOptions) : RectangleAreaData {
    options.maxLength = options.maxLength || 20 // default values
    options.dp = options.dp || 0

    const sides = {
      base: randBetween(1,options.maxLength),
      height: randBetween(1,options.maxLength)
    }

    const base : Value = {val: sides.base, show: true, missing: false};
    const height : Value = {val: sides.height, show: true, missing: false};
    let showOpposites : boolean
    let areaProperties : Partial<Omit<Value, 'val'>> = {}
    let perimeterProperties : Partial<Omit<Value, 'val'>> = {}

    //selectively hide/missing depending on type
    switch(options.questionType) {
    case "area":
      areaProperties.show=true;
      areaProperties.missing=true;
      showOpposites=!options.noDistractors;
      break;
    case "perimeter":
      perimeterProperties.show=true;
      perimeterProperties.missing=true;
      showOpposites=options.noDistractors;
      break;
    case "reverseArea":
      areaProperties.show=true;
      areaProperties.missing=false;
      randElem([base,height]).missing = true;
      showOpposites=false;
      break;
    case "reversePerimeter":
    default:
      perimeterProperties.show=true;
      perimeterProperties.missing=false;
      randElem([base,height]).missing = true;
      showOpposites=false;
      break;
    }

    return new this(base,height,showOpposites,areaProperties as Omit<Value, 'val'>,perimeterProperties as Omit<Value, 'val'>)
  }

  get perimeter() : Value {
    if (!this._perimeter) {
      this._perimeter = {
        show: false,
        missing: true
      }
    }
    if (!this._perimeter.val) {
      this._perimeter.val = 2*(this.base.val+this.height.val)
    }
    return this._perimeter as Value
  }

  get area() : Value {
    if (!this._area) {
      this._area = {
        show: false,
        missing: true
      }
    }
    if (!this._area.val) {
      this._area.val = this.base.val * this.height.val
    }
    return this._area as Value
  }
}