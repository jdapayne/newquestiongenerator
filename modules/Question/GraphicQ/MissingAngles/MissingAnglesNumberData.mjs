/* Generates and holds data for a missing angles question, where these is some given angle sum
 * Agnostic as to how these angles are arranged (e.g. in a polygon or around som point)
 */
import { randBetween } from 'Utilities'

export default class MissingAnglesNumberData /* extends GraphicQData */ {
  constructor (options) {
    const defaults = {
      /* angleSum: 180 */ // must be set by caller
      minAngle: 10,
      minN: 2,
      maxN: 4
    }
    this.settings = Object.assign({}, defaults, options)

    if (!this.settings.angleSum) { throw new Error('No angle sum given') }

    this.initRandom()
  }

  init (angleSum, angles, missing) {
    // initialises with angles given explicitly
    if (angles === []) { throw new Error('argument must not be empty') }
    if (Math.round(angles.reduce((x, y) => x + y)) !== angleSum) {
      throw new Error('Angle sum must be ' + angleSum)
    }

    this.angles = angles // list of angles
    this.missing = missing // which angles are missing - array of booleans
    this.angleSum = angleSum // sum of angles
  }

  initRandom () {
    const angleSum = this.settings.angleSum
    const n = this.settings.n
      ? this.settings.n
      : randBetween(this.settings.minN, this.settings.maxN)
    const minAngle = this.settings.minAngle

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

    const missing = []
    missing.length = n
    missing.fill(false)
    missing[randBetween(0, n - 1)] = true

    this.init(angleSum, angles, missing)
  }
}
