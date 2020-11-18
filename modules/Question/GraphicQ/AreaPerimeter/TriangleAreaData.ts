import { randElem, scaledStr } from 'utilities.js' // change relative path after testing
import { Value } from './RectangleAreaData'
import { QuestionOptions } from './types'
import * as TD from 'triangleData'

export default class TriangleAreaData {
  readonly base: Value
  readonly side1: Value
  readonly side2: Value
  readonly height: Value
  private readonly dp: number
  private _area?: Partial<Value>
  private _perimeter?: Partial<Value>

  constructor (
    base: Value,
    side1: Value,
    side2: Value,
    height: Value,
    dp: number,
    areaProperties?: Omit<Value, 'val'>,
    perimeterProperties?: Omit<Value, 'val'>) {
    this.base = base
    this.side1 = side1
    this.side2 = side2
    this.height = height
    this.dp = dp
    this._area = areaProperties
    this._perimeter = perimeterProperties
  }

  get perimeter (): Value {
    if (!this._perimeter) { // defaults for properties
      this._perimeter = {
        show: false,
        missing: true
      }
    }
    if (!this._perimeter.val) {
      this._perimeter.val = this.base.val + this.side1.val + this.side2.val
      this._perimeter.label = scaledStr(this._perimeter.val, this.dp) + '\\mathrm{cm}'
    }

    return this._perimeter as Value
  }

  get area (): Value {
    if (!this._area) {
      this._area = {
        show: false,
        missing: true
      }
    }
    if (!this._area.val) {
      this._area.val = this.base.val * this.height.val / 2
      this._area.label = scaledStr(this._area.val, 2 * this.dp) + '\\mathrm{cm}^2'
    }
    return this._area as Value
  }

  isRightAngled (): boolean {
    const triangle: TD.Triangle = {
      b: this.base.val,
      h: this.height.val,
      s1: this.side1.val,
      s2: this.side2.val
    }
    return isRightAngled(triangle)
  }

  static async random (options: QuestionOptions): Promise<TriangleAreaData> {
    options.maxLength = options.maxLength || 20
    const dp = options.dp || 0
    const requireIsosceles = (options.questionType === 'pythagorasIsoscelesArea')
    const requireRightAngle = (options.questionType === 'pythagorasArea' || options.questionType === 'pythagorasPerimeter')

    // get a triangle. TD.getTriangle is async, so need to await
    const triangle: TD.Triangle =
      await TD.getTriangle(options.maxLength, t =>
        (!requireIsosceles || isIsosceles(t)) &&
          (!requireRightAngle || isRightAngled(t))
      )

    // useful for some logic next
    // nb only refers to RA triangles wher the hypotenuse is not the 'base'
    const rightAngled = isRightAngled(triangle)

    const base : Value = { val: triangle.b, show: true, missing: false }
    const height : Value = { val: triangle.h, show: !rightAngled, missing: false } // hide height in RA triangles
    const side1 : Value = { val: triangle.s1, show: true, missing: false }
    const side2 : Value = { val: triangle.s2, show: true, missing: false };
    [base, height, side1, side2].forEach(v => {
      v.label = scaledStr(v.val, dp) + '\\mathrm{cm}'
    })

    // Some aliases useful when reasoning about RA triangles
    // NB (a) these are refs to same object, not copies
    // (b) not very meaningful for non RA triangles
    const leg1 = base
    const leg2 = (side1.val > side2.val) ? side2 : side1
    const hypotenuse = (side1.val > side2.val) ? side1 : side2

    const areaProperties = { show: false, missing: true }
    const perimeterProperties = { show: false, missing: true }

    // show/hide based on type
    switch (options.questionType) {
      case 'area':
        areaProperties.show = true
        areaProperties.missing = true
        break
      case 'perimeter':
        perimeterProperties.show = true
        perimeterProperties.missing = true
        break
      case 'reverseArea': {
        areaProperties.show = true
        areaProperties.missing = false
        const coinToss = (Math.random() < 0.5) // 50/50 true/false
        if (rightAngled) { // hide one of the legs
          if (coinToss) leg1.missing = true
          else leg2.missing = true
        } else {
          if (coinToss) base.missing = true
          else height.missing = true
        }
        break
      }
      case 'reversePerimeter': {
        perimeterProperties.show = true
        perimeterProperties.missing = false
        randElem([base, side1, side2]).missing = true
        break
      }
      case 'pythagorasArea':
        if (!rightAngled) throw new Error('Should have RA triangle here')
        areaProperties.show = true
        areaProperties.missing = true
        randElem([leg1, leg2]).show = false
        break
      case 'pythagorasPerimeter': { // should already have RA triangle
        if (!rightAngled) throw new Error('Should have RA triangle here')
        perimeterProperties.show = true
        perimeterProperties.missing = true
        randElem([leg1, leg2, hypotenuse]).show = false
        break
      }
      case 'pythagorasIsoscelesArea':
      default:
        areaProperties.show = true
        areaProperties.missing = true
        height.show = false
        break
    }
    return new TriangleAreaData(base, side1, side2, height, dp, areaProperties, perimeterProperties)
  }
}

function isIsosceles (triangle: TD.Triangle): boolean {
  return triangle.s1 === triangle.s2
}

function isRightAngled (triangle: TD.Triangle): boolean {
  return triangle.s1 === triangle.h || triangle.s2 === triangle.h
}
