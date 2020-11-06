/** Generates and holds data for a missing angles question, where these is some given angle sum
 *  Agnostic as to how these angles are arranged (e.g. in a polygon or around som point)
 *
 * Options passed to constructors:
 *  angleSum::Int the number of angles to generate
 *  minAngle::Int the smallest angle to generate
 *  minN::Int     the smallest number of angles to generate
 *  maxN::Int     the largest number of angles to generate
 *
 */

import { randBetween } from 'Utilities'
import { GraphicQData} from '../GraphicQ'
import { MissingAnglesData } from './MissingAnglesData'
import {NumberOptions as Options} from './NumberOptions' 

export class MissingAnglesNumberData implements MissingAnglesData {
  angles : number[] // list of angles
  missing : boolean[] // true if missing
  angleSum : number // what the angles add up to
  angleLabels: string[]

  constructor (angleSum : number, angles: number[], missing: boolean[], angleLabels?: string[]) {
    // initialises with angles given explicitly
    if (angles === []) { throw new Error('Must give angles') }
    if (Math.round(angles.reduce((x, y) => x + y)) !== angleSum) {
      throw new Error(`Angle sum must be ${angleSum}`)
    }

    this.angles = angles // list of angles
    this.missing = missing // which angles are missing - array of booleans
    this.angleSum = angleSum // sum of angles
    this.angleLabels = angleLabels || []
  }

  static random (options: Options) : MissingAnglesNumberData {
    const defaults : Options = {
      /* angleSum: 180 */ // must be set by caller
      minAngle: 15,
      minN: 2,
      maxN: 4
    }

    options = Object.assign({}, defaults, options)

    let question : MissingAnglesNumberData
    if (options.repeated) {
      question = this.randomRepeated(options)
    } else {
      question = this.randomSimple(options)
    }
    question.initLabels()
    return question
  }

  static randomSimple (options: Options): MissingAnglesNumberData {

    if (!options.angleSum) { throw new Error('No angle sum given') }

    const angleSum = options.angleSum
    const n = randBetween(options.minN, options.maxN)
    const minAngle = options.minAngle

    if (n < 2) throw new Error('Can\'t have missing fewer than 2 angles')

    // Build up angles
    const angles = []
    let left = angleSum
    for (let i = 0; i < n - 1; i++) {
      const maxAngle = left - minAngle * (n - i - 1)
      const nextAngle = randBetween(minAngle, maxAngle)
      left -= nextAngle
      angles.push(nextAngle)
    }
    angles[n - 1] = left

    // pick one to be missing
    const missing = []
    missing.length = n
    missing.fill(false)
    missing[randBetween(0, n - 1)] = true

    return new this(angleSum, angles, missing)
  }

  static randomRepeated (options: Options) : MissingAnglesNumberData {
    const angleSum: number = options.angleSum
    const minAngle: number = options.minAngle

    const n: number = randBetween(options.minN, options.maxN)

    const m: number = options.nMissing || (Math.random() < 0.1 ? n : randBetween(2, n - 1))

    if (n < 2 || m < 1 || m > n) throw new Error(`Invalid arguments: n=${n}, m=${m}`)

    // All missing - do as a separate case
    if (n === m) {
      const angles = []
      angles.length = n
      angles.fill(angleSum / n)

      const missing = []
      missing.length = n
      missing.fill(true)

      return new this(angleSum, angles, missing)
    }

    const angles: number[] = []
    const missing: boolean[] = []
    missing.length = n
    missing.fill(false)

    // choose a value for the missing angles
    const maxRepeatedAngle = (angleSum - minAngle * (n - m)) / m
    const repeatedAngle = randBetween(minAngle, maxRepeatedAngle)

    // choose values for the other angles
    const otherAngles: number[] = []
    let left = angleSum - repeatedAngle * m
    for (let i = 0; i < n - m - 1; i++) {
      const maxAngle = left - minAngle * (n - m - i - 1)
      const nextAngle = randBetween(minAngle, maxAngle)
      left -= nextAngle
      otherAngles.push(nextAngle)
    }
    otherAngles[n - m - 1] = left

    // choose where the missing angles are
    {
      let i = 0
      while (i < m) {
        const j = randBetween(0, n - 1)
        if (missing[j] === false) {
          missing[j] = true
          angles[j] = repeatedAngle
          i++
        }
      }
    }

    // fill in the other angles
    {
      let j = 0
      for (let i = 0; i < n; i++) {
        if (missing[i] === false) {
          angles[i] = otherAngles[j]
          j++
        }
      }
    }
    return new MissingAnglesNumberData(angleSum, angles, missing)
  }

  initLabels() : void {
    const n = this.angles.length
    for (let i = 0; i < n; i++) {
      if (!this.missing[i]) {
        this.angleLabels[i] = `${this.angles[i].toString()}^\\circ`
      } else {
        this.angleLabels[i] = 'x^\\circ'
      }
    }
  }
}
