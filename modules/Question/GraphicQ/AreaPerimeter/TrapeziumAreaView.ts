import { arrowLine, drawRightAngle, parallelSign } from "drawing";
import Point from "Point";
import { randElem } from "utilities";
import { GraphicQView, Label } from "../GraphicQ";
import ViewOptions from "../ViewOptions";
import { Value } from "./RectangleAreaData";
import TrapeziumAreaData from "./TrapeziumAreaData";
import { colors } from "./types";

export default class TrapeziumAreaView extends GraphicQView {
  data!: TrapeziumAreaData
  A: Point
  B: Point
  C: Point
  D: Point
  ht1: Point
  ht2: Point
  constructor(data: TrapeziumAreaData, viewOptions: ViewOptions, A: Point, B: Point, C: Point, D: Point, ht1: Point, ht2: Point, labels: Label[]) {
    super(data,viewOptions)
    this.A = A
    this.B = B
    this.C = C
    this.D = D
    this.ht1 = ht1
    this.ht2 = ht2
    this.labels = labels
  }

  static fromData(data: TrapeziumAreaData, viewOptions: ViewOptions) : TrapeziumAreaView {
    // Defaults (NB: duplicates effort in constructor, given use of static factory constructor instead of GraphicQ's method)
    viewOptions = viewOptions ?? {}
    viewOptions.width = viewOptions.width ?? 300
    viewOptions.height = viewOptions.height ?? 300

    // initial points
    const A = new Point(0,0);
    const B = new Point(data.b1,data.height.val);
    const C = new Point(data.b1+data.a.val,data.height.val);
    const D = new Point(data.b.val,0);

    const ht1 = new Point(data.b1+data.a.val/2,data.height.val);
    const ht2 = new Point(data.b1+data.a.val/2,0);

    // rotate

    const rotation = viewOptions.rotation ?? 2*Math.PI * Math.random()
    ;[A,B,C,D,ht1,ht2].forEach(pt => pt.rotate(rotation))
    Point.scaleToFit([A,B,C,D,ht1,ht2], viewOptions.width, viewOptions.height, 100, [0,20])


    // labels
    const labels : Label[] = [];

    const sides : [Point,Point,Value][]= [ //[1st point, 2nd point, length]
      [A,B,data.side1],
      [B,C,data.a],
      [C,D,data.side2],
      [D,A,data.b],
      [ht1,ht2,data.height]
    ];

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
          texta: "\\text{Area} = " + texta,
          textq: "\\text{Area} = " + textq,
          text: "\\text{Area} = " + textq,
          styleq: styleq,
          stylea: stylea,
          style: styleq,
          pos: new Point(10, viewOptions.height - 10 - 20*n_info),
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
          pos: new Point(10, viewOptions.height - 10 - 20*n_info),
          texta: "\\text{Perimeter} = " + texta,
          textq: "\\text{Perimeter} = " + textq,
          text: "\\text{Perimeter} = " + textq,
          styleq: styleq,
          stylea: stylea,
          style: styleq,
        }
      )
    }
    return new TrapeziumAreaView(data,viewOptions,A,B,C,D,ht1,ht2,labels)
  }

  render() : void {
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
    ctx.fillStyle=randElem(colors)
    ctx.fill();
    ctx.closePath();

    // parallel signs 
    ctx.beginPath();
    parallelSign(ctx,this.B,this.ht1,5);
    parallelSign(ctx,this.A,this.ht2,5);
    ctx.stroke();
    ctx.closePath();

    // draw height
    if (this.data.height.show) {
      ctx.beginPath();
      arrowLine(ctx, Point.mean(this.ht1,this.ht2),this.ht1, 8);
      arrowLine(ctx, Point.mean(this.ht1,this.ht2),this.ht2, 8);
      ctx.stroke();
      ctx.closePath();

      // RA symbol
      ctx.beginPath();
      ctx.setLineDash([]);
      drawRightAngle(ctx,this.ht1,this.ht2,this.D, 12);
      ctx.stroke();
      ctx.closePath();
    }

    // ra symbol for right angled trapezia
    if(this.data.height.val === this.data.side2.val) {
      ctx.beginPath()
      drawRightAngle(ctx, this.B, this.C, this.D, 12)
      drawRightAngle(ctx, this.C, this.D, this.A, 12)
      ctx.stroke()
    }

    this.renderLabels()
  }
}