export default class Point {
  constructor (x, y) {
    this.x = x
    this.y = y
  }

  rotate (angle) {
    var newx, newy
    newx = Math.cos(angle) * this.x - Math.sin(angle) * this.y
    newy = Math.sin(angle) * this.x + Math.cos(angle) * this.y
    this.x = newx
    this.y = newy
    return this
  }

  scale (sf) {
    this.x = this.x * sf
    this.y = this.y * sf
    return this
  }

  translate (x, y) {
    this.x += x
    this.y += y
    return this
  }

  clone () {
    return new Point(this.x, this.y)
  }

  equals (that) {
    return (this.x === that.x && this.y === that.y)
  }

  moveToward (that, d) {
    // moves [d] in the direction of [that::Point]
    const uvec = Point.unitVector(this, that)
    this.translate(uvec.x * d, uvec.y * d)
    return this
  }

  static fromPolar (r, theta) {
    return new Point(
      Math.cos(theta) * r,
      Math.sin(theta) * r
    )
  }

  static fromPolarDeg (r, theta) {
    theta = theta * Math.PI / 180
    return Point.fromPolar(r, theta)
  }

  static mean (...points) {
    const sumx = points.map(p => p.x).reduce((x, y) => x + y)
    const sumy = points.map(p => p.y).reduce((x, y) => x + y)
    const n = points.length

    return new Point(sumx / n, sumy / n)
  }



  static min (points) {
    const minx = points.reduce((x, p) => Math.min(x, p.x), Infinity)
    const miny = points.reduce((y, p) => Math.min(y, p.y), Infinity)
    return new Point(minx, miny)
  }

  static max (points) {
    const maxx = points.reduce((x, p) => Math.max(x, p.x), -Infinity)
    const maxy = points.reduce((y, p) => Math.max(y, p.y), -Infinity)
    return new Point(maxx, maxy)
  }

  static center (points) {
    const minx = points.reduce((x, p) => Math.min(x, p.x), Infinity)
    const miny = points.reduce((y, p) => Math.min(y, p.y), Infinity)
    const maxx = points.reduce((x, p) => Math.max(x, p.x), -Infinity)
    const maxy = points.reduce((y, p) => Math.max(y, p.y), -Infinity)
    return new Point((maxx + minx) / 2, (maxy + miny) / 2)
  }

  static unitVector (p1, p2) {
    // returns a unit vector in the direction of p1 to p2
    // in the form {x:..., y:...}
    const vecx = p2.x - p1.x
    const vecy = p2.y - p1.y
    const length = Math.hypot(vecx, vecy)
    return { x: vecx / length, y: vecy / length }
  }

  static distance (p1, p2) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y)
  }

  static repel (p1, p2, trigger, distance) {
    // When p1 and p2 are less than [trigger] apart, they are
    // moved so that they are [distance] apart
    const d = Math.hypot(p1.x - p2.x, p1.y - p2.y)
    if (d >= trigger) return false

    const r = (distance - d) / 2 // distance they need moving
    p1.moveToward(p2, -r)
    p2.moveToward(p1, -r)
    return true
  }
}
