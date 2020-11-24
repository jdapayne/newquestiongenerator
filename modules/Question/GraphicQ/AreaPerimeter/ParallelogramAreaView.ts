import { arrowLine, drawRightAngle, parallelSign } from "drawing"
import Point from "Point"
import { randBetween, randElem } from "utilities"
import { GraphicQView, Label } from "../GraphicQ"
import ViewOptions from "../ViewOptions"
import ParallelogramAreaData from "./ParallelogramAreaData"
import RectangleAreaData, { Value } from "./RectangleAreaData"
import { colors } from "./types"

export default class ParallelogramAreaView extends GraphicQView {
  data!: ParallelogramAreaData // assigned in super
  A: Point
  B: Point
  C: Point
  D: Point
  ht1: Point
  ht2: Point

  constructor (A: Point, B: Point, C: Point, D: Point, ht1: Point, ht2: Point, labels: Label[], data: ParallelogramAreaData, viewOptions: ViewOptions) {
    /* Super does:
     *  Sets this.width and this.height
     *  Sets this.data
     *  Creates DOM elements, including canvas
     *  Creates empty this.labels list
     */
    super(data, viewOptions) // initialises this.data
    this.A = A
    this.B = B
    this.C = C
    this.D = D
    this.ht1 = ht1
    this.ht2 = ht2
    this.labels = labels
  }

  static fromData(data: ParallelogramAreaData, viewOptions?: ViewOptions) {
    viewOptions = viewOptions ?? {}
    viewOptions.width = viewOptions.width ?? 300
    viewOptions.height = viewOptions.height ?? 300
    const width = viewOptions.width
    const height = viewOptions.height

    //useful shorthands:
    const s = data.side.val
    const b = data.base.val
    const h = data.height.val

    /* Derivation of this.B, this.C
     *  B is intersection of
     *          x^2 + y^2 = s^2 (1)
     *    and   y = h           (2)
     *
     *    Substituting (2) into (1) and rearranging gives:
     *          x = sqrt(s^2-h^2) (taking only the +ve value)
     *
     *  C is just this shifted across b
     */
    const A = new Point(0,0);
    const B = new Point( Math.sqrt(s*s - h*h), h);
    const C = B.clone().translate(b,0);
    const D = new Point(b,0);

    // points to draw height line on
    const ht1 = C.clone();
    const ht2 = C.clone().translate(0,-h);
    // shift them away a little bit
    ht1.moveToward(B,-b/10);
    ht2.moveToward(A,-b/10);

    // rotate
    const rotation: number = viewOptions?.rotation ?? Math.random()*2*Math.PI
    ;[A,B,C,D,ht1,ht2].forEach( pt => {pt.rotate(rotation)})

    // Scale and centre
    Point.scaleToFit([A,B,C,D,ht1,ht2],width,height,100,[0,20])

    // labels
    const labels : Label[] = [];

    const sides : [Point, Point, Value][] = [ //[1st point, 2nd point, info]
      [A,B,data.side],
      [D,A,data.base],
      [ht1,ht2,data.height]
    ];

    if (data.showOpposites) {
      sides.push([B,C,data.base]);
      sides.push([C,D,data.side]);
    }

    for (let i = 0, n=sides.length; i < n; i++) { //sides
      if (!sides[i][2].show) continue;
      const offset = 25;
      let pos = Point.mean(sides[i][0],sides[i][1]);
      const unitvec = Point.unitVector(sides[i][0], sides[i][1]);
      
      pos.translate(-unitvec.y*offset, unitvec.x*offset); 

      const texta = sides[i][2].label ?? sides[i][2].val.toString()
      const textq = sides[i][2].missing? "?" : texta;
      const styleq = "normal";
      const stylea = sides[i][2].missing? "answer" : "normal";

      labels.push({
        pos: pos,
        texta: texta,
        textq: textq,
        text: textq,
        stylea: stylea,
        styleq: styleq,
        style: styleq
      });
    }

    let n_info = 0;
    if (data.area.show) {
      const texta = data.area.label ?? data.area.val.toString()
      const textq = data.area.missing? "?" : texta;
      const styleq = "extra-info";
      const stylea = data.area.missing? "extra-answer" : "extra-info";
      labels.push(
        {
          texta: `\\text{Area} = ${texta}`,
          textq: `\\text{Area} = ${textq}`,
          text: `\\text{Area} = ${textq}`,
          styleq: styleq,
          stylea: stylea,
          style: styleq,
          pos: new Point(10, height - 10 - 15*n_info),
        }
      );
      n_info++;
    }
    if (data.perimeter.show) {
      const texta = data.perimeter.label ?? data.perimeter.val.toString()
      const textq = data.perimeter.missing? "?" : texta;
      const styleq = "extra-info";
      const stylea = data.perimeter.missing? "extra-answer" : "extra-info";
      labels.push(
        {
          pos: new Point(10, height - 10 - 20*n_info),
          texta: `\\text{Perimeter} = ${texta}`,
          textq: `\\text{Perimeter} = ${textq}`,
          text: `\\text{Perimeter} = ${textq}`,
          styleq: styleq,
          stylea: stylea,
          style: styleq,
        }
      );
    }
    return new ParallelogramAreaView(A,B,C,D,ht1,ht2,labels,data,viewOptions)
  }

  render() {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error('Could not get canvas context')
    ctx.clearRect(0,0,this.canvas.width,this.canvas.height); // clear
    ctx.setLineDash([]);

    // draw parallelogram
    ctx.beginPath();
    ctx.moveTo(this.A.x,this.A.y);
    ctx.lineTo(this.B.x,this.B.y);
    ctx.lineTo(this.C.x,this.C.y);
    ctx.lineTo(this.D.x,this.D.y);
    ctx.lineTo(this.A.x,this.A.y);
    ctx.stroke();
    ctx.fillStyle= randElem(colors)
    ctx.fill();
    ctx.closePath();

    // parallel signs
    ctx.beginPath();
    parallelSign(ctx,this.A,this.B,5);
    parallelSign(ctx,this.D,this.C,5);
    parallelSign(ctx,this.B,this.C,5,2);
    parallelSign(ctx,this.A,this.D,5,2);
    ctx.stroke();
    ctx.closePath();

    // draw height
    if (this.data.height.show) {
      ctx.beginPath();
      arrowLine(ctx, Point.mean(this.ht1,this.ht2),this.ht1, 8);
      arrowLine(ctx, Point.mean(this.ht1,this.ht2),this.ht2, 8);
      ctx.stroke();
      ctx.closePath();

      // dashed line to height
      ctx.beginPath();
      ctx.setLineDash([5,3]);
      ctx.moveTo(this.D.x,this.D.y);
      ctx.lineTo(this.ht2.x,this.ht2.y);
      ctx.stroke();
      ctx.closePath();

      // RA symbol
      ctx.beginPath();
      ctx.setLineDash([]);
      drawRightAngle(ctx,this.ht1,this.ht2,this.D, 12);
      ctx.stroke();
      ctx.closePath();
    }
    this.renderLabels()
  }
}