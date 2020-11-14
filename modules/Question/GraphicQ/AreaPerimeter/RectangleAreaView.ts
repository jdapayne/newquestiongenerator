import { drawRightAngle } from "drawing";
import Point from "Point";
import { GraphicQData, GraphicQView, Label } from "../GraphicQ";
import ViewOptions from "../ViewOptions";
import RectangleAreaData, { Value } from "./RectangleAreaData";

export default class RectangleAreaView extends GraphicQView {
  data!: RectangleAreaData // assigned in super
  A: Point
  B: Point
  C: Point
  D: Point

  constructor(A: Point,B: Point,C: Point,D: Point,labels: Label[],data: RectangleAreaData, viewOptions: ViewOptions) {
    /* Super does:
     *  Sets this.width and this.height
     *  Sets this.data
     *  Creates DOM elements, including canvas
     *  Creates empty this.labels list
     */
    super(data,viewOptions)  // initialises this.data
    this.A = A
    this.B = B
    this.C = C
    this.D = D
    this.labels = labels
  }

  /**
   * Static factory method returning view from data 
   * @param data A data object, which had details of width, height and area
   * @param viewOptions View options - containing width and height
   */
  static fromData(data: RectangleAreaData, viewOptions?: ViewOptions) : RectangleAreaView {
    // Defaults (NB: duplicates effort in constructor, given use of static factory constructor instead of GraphicQ's method)
    viewOptions = viewOptions ?? {}
    viewOptions.width = viewOptions.width ?? 300
    viewOptions.height = viewOptions.height ?? 300

    // initial points
    const A = new Point(0,0);
    const B = new Point(0,data.height.val);
    const C = new Point(data.base.val,data.height.val);
    const D = new Point(data.base.val,0);

    // rotate, scale and center
    const rotation = viewOptions.rotation ?? 2*Math.PI*Math.random()
    ;[A,B,C,D].forEach( pt => pt.rotate(rotation) )
    Point.scaleToFit([A,B,C,D],viewOptions.width,viewOptions.height,80)

    // Set up labels
    let labels : Label[] = [];

    const sides : [Point,Point,Value][] = [ //[1st point, 2nd point, length]
      [A,B,data.height],
      [B,C,data.base],
    ];

    if (data.showOpposites) {
      sides.push([C,D,data.height]);
      sides.push([D,A,data.base]);
    }

    for (let i = 0, n=sides.length; i < n; i++) { //sides
      if (!sides[i][2].show) continue;
      const offset = 20;
      let pos = Point.mean(sides[i][0],sides[i][1]);
      const unitvec = Point.unitVector(sides[i][0], sides[i][1]);
      
      pos.translate(-unitvec.y*offset, unitvec.x*offset); 

      const texta = sides[i][2].val.toString() + "\\mathrm{cm}";
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
      const texta = data.area.val.toString() + "\\mathrm{cm}^2";
      const textq = data.area.missing? "?" : texta;
      const styleq = "extra-info";
      const stylea = data.area.missing? "extra-answer" : "extra-info";
      labels.push(
        {
          texta: "Area = " + texta,
          textq: "Area = " + textq,
          text: "Area = " + textq,
          styleq: styleq,
          stylea: stylea,
          style: styleq,
          pos: new Point(10, viewOptions.height - 10 - 15*n_info),
        }
      );
      n_info++;
    }

    if (data.perimeter.show) {
      const texta = data.perimeter.val.toString() + "\\mathrm{cm}";
      const textq = data.perimeter.missing? "?" : texta;
      const styleq = "extra-info";
      const stylea = data.perimeter.missing? "extra-answer" : "extra-info";
      labels.push(
        {
          pos: new Point(10, viewOptions.height - 10 - 20*n_info),
          texta: "Perimeter = " + texta,
          textq: "Perimeter = " + textq,
          text: "Perimeter = " + textq,
          styleq: styleq,
          stylea: stylea,
          style: styleq,
        }
      );
    }

    return new RectangleAreaView(A,B,C,D,labels,data,viewOptions)
  }

  render(): void {
    const ctx = this.canvas.getContext("2d");
    if (ctx === null) {throw new Error('Could not get context')}
    ctx.clearRect(0,0,this.canvas.width,this.canvas.height); // clear
    ctx.setLineDash([]);

    // draw rectangle
    ctx.beginPath();
    ctx.moveTo(this.A.x,this.A.y);
    ctx.lineTo(this.B.x,this.B.y);
    ctx.lineTo(this.C.x,this.C.y);
    ctx.lineTo(this.D.x,this.D.y);
    ctx.lineTo(this.A.x,this.A.y);
    ctx.stroke();
    ctx.fillStyle="LightGrey";
    ctx.fill();
    ctx.closePath();

    // right angles
    const size = Math.min(
      15,
      Math.min(Point.distance(this.A,this.B),Point.distance(this.B,this.C))/3
    );
    ctx.beginPath();
    drawRightAngle(ctx,this.A,this.B,this.C, size);
    drawRightAngle(ctx,this.B,this.C,this.D, size);
    drawRightAngle(ctx,this.C,this.D,this.A, size);
    drawRightAngle(ctx,this.D,this.A,this.B, size);
    ctx.stroke();
    ctx.closePath();

    this.renderLabels()
  }

  

}