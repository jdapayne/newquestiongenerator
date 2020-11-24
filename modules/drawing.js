import Point from 'Point'

/* Canvas drawing, using the Point class */

export function dashedLine (ctx, x1, y1, x2, y2) {
  // Work if given two points instead:
  if (x1 instanceof Point && x2 instanceof Point) {
    const p1 = x1; const p2 = x2
    x1 = p1.x
    y1 = p1.y
    x2 = p2.x
    y2 = p2.y
  }

  const length = Math.hypot(x2 - x1, y2 - y1)
  const dashx = (y1 - y2) / length // unit vector perpendicular to line
  const dashy = (x2 - x1) / length
  const midx = (x1 + x2) / 2
  const midy = (y1 + y2) / 2

  // draw the base line
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)

  // draw the dash
  ctx.moveTo(midx + 5 * dashx, midy + 5 * dashy)
  ctx.lineTo(midx - 5 * dashx, midy - 5 * dashy)

  ctx.moveTo(x2, y2)
}
/**
 * 
 * @param {CanvasRenderingContext2D} ctx The context
 * @param {Point} pt1 A point
 * @param {Point} pt2 A point
 * @param {number} size The size of the array to draw
 * @param {number} [m=0.5] The 'sharpness' of the point. Smaller is pointier
 */
export function arrowLine (ctx, pt1, pt2, size, m=0.5) {

  const unit = Point.unitVector(pt1, pt2)
  unit.x *= size
  unit.y *= size
  const normal = { x: -unit.y, y: unit.x }
  normal.x *= m
  normal.y *= m

  const control1 = pt2.clone()
    .translate(-unit.x, -unit.y)
    .translate(normal.x, normal.y)

  const control2 = pt2.clone()
    .translate(-unit.x, -unit.y)
    .translate(-normal.x, -normal.y)

  ctx.moveTo(pt1.x, pt1.y)
  ctx.lineTo(pt2.x, pt2.y)
  ctx.lineTo(control1.x, control1.y)
  ctx.moveTo(pt2.x, pt2.y)
  ctx.lineTo(control2.x, control2.y)
}

/**
 * Draw a right angle symbol for angle AOC. NB: no check is made that AOC is indeed a right angle
 * @param {CanvasRenderingContext2D} ctx The context to draw in
 * @param {Point} A Start point
 * @param {Point} O Vertex point
 * @param {Point} C End point
 * @param {number} size Size of right angle
 */
export function drawRightAngle (ctx, A, O, C, size) {
  const unitOA = Point.unitVector(O, A)
  const unitOC = Point.unitVector(O, C)
  const ctl1 = O.clone().translate(unitOA.x * size, unitOA.y * size)
  const ctl2 = ctl1.clone().translate(unitOC.x * size, unitOC.y * size)
  const ctl3 = O.clone().translate(unitOC.x * size, unitOC.y * size)
  ctx.moveTo(ctl1.x, ctl1.y)
  ctx.lineTo(ctl2.x, ctl2.y)
  ctx.lineTo(ctl3.x, ctl3.y)
}

/**
 * Draws a dash, or multiple dashes, at the midpoint of A and B
 * @param {CanvasRenderingContext2D} ctx The canvas rendering context
 * @param {Point} A A point
 * @param {Point} B A point
 * @param {number} [size=10]  The length of the dashes, in pixels
 * @param {number} [number=1] How many dashes to drw
 * @param {number} [gap=size] The gap between dashes
 */
export function parallelSign (ctx, A, B, size=10, number=1, gap=size) {
  const unit = Point.unitVector(A, B)
  unit.x *= size
  unit.y *= size
  const normal = { x: -unit.y, y: unit.x }

  const M = Point.mean(A, B)

  for (let i = 0; i < number; i++) {
    const ctl2 = M.clone().moveToward(B, i * gap)
    const ctl1 = ctl2.clone()
      .translate(-unit.x, -unit.y)
      .translate(normal.x, normal.y)
    const ctl3 = ctl2.clone()
      .translate(-unit.x, -unit.y)
      .translate(-normal.x, -normal.y)

    ctx.moveTo(ctl1.x, ctl1.y)
    ctx.lineTo(ctl2.x, ctl2.y)
    ctx.lineTo(ctl3.x, ctl3.y)
  }
}
