/**
 * Class representing a point, and static utitlity methods
 */
export default class Point {
  x: number
  y: number
  constructor (x: number, y: number) {
    this.x = x
    this.y = y
  }

  rotate (angle: number) {
    const newx = Math.cos(angle) * this.x - Math.sin(angle) * this.y
    const newy = Math.sin(angle) * this.x + Math.cos(angle) * this.y
    this.x = newx
    this.y = newy
    return this
  }

  scale (sf: number) {
    this.x = this.x * sf
    this.y = this.y * sf
    return this
  }

  translate (x: number, y: number) {
    this.x += x
    this.y += y
    return this
  }

  clone () {
    return new Point(this.x, this.y)
  }

  equals (that: Point) {
    return (this.x === that.x && this.y === that.y)
  }

  moveToward (that: Point, d: number) {
    // moves [d] in the direction of [that::Point]
    const uvec = Point.unitVector(this, that)
    this.translate(uvec.x * d, uvec.y * d)
    return this
  }

  static fromPolar (r: number, theta: number) {
    return new Point(
      Math.cos(theta) * r,
      Math.sin(theta) * r
    )
  }

  static fromPolarDeg (r: number, theta: number) {
    theta = theta * Math.PI / 180
    return Point.fromPolar(r, theta)
  }

  /**
   * Find the mean of
   * @param  {...Point} points The points to find the mean of
   */
  static mean (...points : Point[]) {
    const sumx = points.map(p => p.x).reduce((x, y) => x + y)
    const sumy = points.map(p => p.y).reduce((x, y) => x + y)
    const n = points.length

    return new Point(sumx / n, sumy / n)
  }

  static inCenter (A: Point, B: Point, C: Point) {
    // incenter of a triangle given vertex points A, B and C
    const a = Point.distance(B, C)
    const b = Point.distance(A, C)
    const c = Point.distance(A, B)

    const perimeter = a + b + c
    const sumx = a * A.x + b * B.x + c * C.x
    const sumy = a * A.y + b * B.y + c * C.y

    return new Point(sumx / perimeter, sumy / perimeter)
  }

  static min (points : Point[]) {
    const minx = points.reduce((x, p) => Math.min(x, p.x), Infinity)
    const miny = points.reduce((y, p) => Math.min(y, p.y), Infinity)
    return new Point(minx, miny)
  }

  static max (points: Point[]) {
    const maxx = points.reduce((x, p) => Math.max(x, p.x), -Infinity)
    const maxy = points.reduce((y, p) => Math.max(y, p.y), -Infinity)
    return new Point(maxx, maxy)
  }

  static center (points: Point[]) {
    const minx = points.reduce((x, p) => Math.min(x, p.x), Infinity)
    const miny = points.reduce((y, p) => Math.min(y, p.y), Infinity)
    const maxx = points.reduce((x, p) => Math.max(x, p.x), -Infinity)
    const maxy = points.reduce((y, p) => Math.max(y, p.y), -Infinity)
    return new Point((maxx + minx) / 2, (maxy + miny) / 2)
  }

  static unitVector (p1 : Point, p2 : Point) {
    // returns a unit vector in the direction of p1 to p2
    // in the form {x:..., y:...}
    const vecx = p2.x - p1.x
    const vecy = p2.y - p1.y
    const length = Math.hypot(vecx, vecy)
    return { x: vecx / length, y: vecy / length }
  }

  static distance (p1: Point, p2: Point) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y)
  }

  /**
   * Calculate the angle in radians from horizontal to p2, with centre p1.
   * E.g. angleFrom( (0,0), (1,1) ) = pi/2
   * Angle is from 0 to 2pi
   * @param  p1 The start point
   * @param  p2 The end point
   * @returns  The angle in radians
   */
  static angleFrom (p1: Point, p2: Point): number {
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x)
    return angle >= 0 ? angle : 2 * Math.PI + angle
  }

  /**
   * When p1 and p2 are less than [trigger] apart, they are
   * moved so that they are [distance] apart
   * @param p1 A point
   * @param p2 A point
   * @param trigger Distance triggering repulsion
   * @param distance distance to repel to
   */
  static repel (p1: Point, p2: Point, trigger: number, distance: number) {
    const d = Math.hypot(p1.x - p2.x, p1.y - p2.y)
    if (d >= trigger) return false

    const r = (distance - d) / 2 // distance they need moving
    p1.moveToward(p2, -r)
    p2.moveToward(p1, -r)
    return true
  }

  /**
   * Scale an center a set of points to a given width or height. N.B. This mutates the points in the array, so clone first if necessar
   * @param points An array of points
   * @param width Width of bounding box to scale to
   * @param height Height of bounding box to scale to
   * @param margin Margin to leave around scaled points
   * @param offset Offset from center of bounding box
   * @returns The scale factor that points were scaled by
   */
  static scaleToFit (points: Point[], width: number, height: number, margin = 0, offset: [number, number] = [0, 0]) {
    let topLeft : Point = Point.min(points)
    let bottomRight : Point = Point.max(points)
    const totalWidth : number = bottomRight.x - topLeft.x
    const totalHeight : number = bottomRight.y - topLeft.y
    const sf = Math.min((width - margin) / totalWidth, (height - margin) / totalHeight)
    points.forEach(pt => { pt.scale(sf) })

    // centre
    topLeft = Point.min(points)
    bottomRight = Point.max(points)
    const center = Point.mean(topLeft, bottomRight).translate(...offset)
    points.forEach(pt => { pt.translate(width / 2 - center.x, height / 2 - center.y) }) // centre

    return sf
  }
}
