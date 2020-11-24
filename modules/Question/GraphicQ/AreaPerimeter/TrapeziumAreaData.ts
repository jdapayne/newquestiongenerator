import fraction from "fraction.js"
import { randBetween, randElem, randPythagTriple, randPythagTripleWithLeg, scaledStr } from "utilities"
import { Value } from "./RectangleAreaData"
import { QuestionOptions } from "./types"

export default class TrapeziumAreaData {
  a: Value // two parallel sides
  b: Value //  "   ""
  height: Value
  side1: Value // Slanted sides
  side2: Value
  b1: number
  b2: number
  private readonly dp: number = 0
  private readonly denominator: number = 1
  private _area?: Partial<Value>
  private _perimeter?: Partial<Value>
  constructor(a: Value,b: Value,height: Value,side1: Value,side2: Value, b1: number, b2: number, dp: number,denominator: number,perimeterProperties?: Partial<Value>,areaProperties?: Partial<Value>) {
    this.a = a
    this.b = b
    this.height = height
    this.side1 = side1
    this.side2 = side2
    this.b1 = b1
    this.b2 = b2
    this.dp = dp
    this.denominator = denominator
    this._perimeter = perimeterProperties
    this._area = areaProperties
  }

  get perimeter () : Value {
    if (!this._perimeter) {
      this._perimeter = {
        show: false,
        missing: true
      }
    }
    if (!this._perimeter.val) {
      this._perimeter.val = this.a.val + this.b.val + this.side1.val + this.side2.val
      if (this.denominator > 1) {
        this._perimeter.label = new fraction(this._perimeter.val, this.denominator).toLatex(true) + '\\mathrm{cm}'
      } else {
        this._perimeter.label = scaledStr(this._perimeter.val, this.dp) + '\\mathrm{cm}'
      }
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
      this._area.val = this.height.val*(this.a.val+this.b.val)/2
      if (this.denominator > 1) {
        this._area.label = new fraction(this._area.val, this.denominator**2).toLatex(true) + '\\mathrm{cm}^2'
      } else {
        this._area.label = scaledStr(this._area.val, 2 * this.dp) + '\\mathrm{cm}^2'
      }
    }
    return this._area as Value
  }

  static random(options: Required<QuestionOptions>) : TrapeziumAreaData {
    const dp: number = options.dp // don't actually scale - just do this in display
    const denominator = options.fraction? randBetween(2,6) : 1

    let aValue : number //shorted parallel side
    let bValue : number // longer parallel side
    let s1Value : number
    let s2Value: number
    let hValue: number // final sides and height
    let b1: number
    let b2: number // bits of longest parallel side. b=a+b1+b2
    let triangle1: {a: number, b: number, c: number}
    let triangle2: {a: number, b: number, c: number} // two ra triangles

    triangle1 = randPythagTriple(options.maxLength)
    s1Value = triangle1.c

    if (Math.random() < 0.5) { // stick a ra triangle on one side
      hValue = triangle1.a
      b1 = triangle1.b
    } else {
      hValue = triangle1.b
      b1 = triangle1.a
    }

    if (Math.random() < 0.9) { // stick a triangle on the other side
      triangle2 = randPythagTripleWithLeg(hValue, options.maxLength)
      s2Value = triangle2.c
      b2 = triangle2.b // tri2.a =: h
    } else { // right-angled trapezium
      s2Value = hValue
      b2 = 0
    }

    // Find a value
    const MINPROP = 8 // the final length of a withh be at least (1/MINPROP) of the final length of b. I.e. a is more than 1/8 of b
    const maxAValue = Math.min(options.maxLength - b1 - b2, MINPROP*hValue)
    const minAValue = Math.ceil((b1+b2)/(MINPROP-1))
    console.log()
    if (maxAValue - minAValue < 1) {// will overshoot maxLength a bi
      aValue = Math.floor(minAValue)
      console.warn(`Overshooting max length by necessity. s1=${s1Value}, s2=${s2Value}, a=${aValue}`)
    } else {
      aValue = randBetween(minAValue,maxAValue)
    } 
    bValue = b1 + b2 + aValue

    const a: Value = { val: aValue, show: true, missing: false }
    const b: Value = { val: bValue, show: true, missing: false }
    const height: Value = {
      val: hValue,
      show: s2Value !== hValue, // don't show if right-angled
      missing: false
    }
    const side1: Value = { val: s1Value, show: true, missing: false }
    const side2: Value = { val: s2Value, show: true, missing: false }
    const areaProperties: Partial<Value> = {show: false, missing: false}
    const perimeterProperties: Partial<Value> = {show: false, missing: false}

    // selectively hide/missing depending on type
    switch (options.questionType) {
      case 'area':
        areaProperties.show = true
        areaProperties.missing = true
        break
      case 'perimeter':
        perimeterProperties.show = true
        perimeterProperties.missing = true
        break
      case 'reverseArea': // hide one of b or height
        areaProperties.show = true
        areaProperties.missing = false
        if (Math.random() < 0.3) height.missing = true
        else if (Math.random() < 0.5) b.missing = true
        else  a.missing = true
        break
      case 'reversePerimeter':
      default: {
        perimeterProperties.show = true
        perimeterProperties.missing = false
        randElem([side1,side2,a,b]).missing = true
        break
      }
    }

    // labels for sides depending on dp and denominator settings
    if (denominator === 1) {
      [a,b,side1,side2,height].forEach( v => {
        v.label = scaledStr(v.val, dp) + '\\mathrm{cm}'
      })
    } else {
      [a,b,side1,side2,height].forEach( v => {
        v.label = new fraction(v.val, denominator).toLatex(true) + '\\mathrm{cm}'
      })
    }

    // turn of distractors if necessary
    if (options.noDistractors) {
      if (options.questionType === 'area' || options.questionType === 'reverseArea') {
        side1.show = false
        side2.show = !height.show // show only if height is already hidden (i.e. if right angled)
      } else if (options.questionType=== 'perimeter' || options.questionType === 'reversePerimeter') {
        height.show = false
      }
    }

    return new TrapeziumAreaData(a,b,height,side1,side2,b1,b2,dp,denominator,perimeterProperties,areaProperties)

  }
}
