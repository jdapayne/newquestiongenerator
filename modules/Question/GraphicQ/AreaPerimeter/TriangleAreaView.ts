import { arrowLine, drawRightAngle } from "drawing";
import Point from "Point";
import { couldStartTrivia } from "typescript";
import { createElem } from "utilities";
import {GraphicQView, Label } from "../GraphicQ";
import ViewOptions from "../ViewOptions";
import { Value } from "./RectangleAreaData";
import TriangleAreaData from "./TriangleAreaData";

export default class TriangleAreaView extends GraphicQView {
  A?: Point // Generated lazily on render
  B?: Point
  C?: Point
  ht?: Point // intersection of height with base
  overhangLeft?: boolean
  overhangRight?: boolean
  data!: TriangleAreaData | Promise<TriangleAreaData>
  // labels: Label[]
  // rotation?: number
  constructor(data: TriangleAreaData | Promise<TriangleAreaData>, viewOptions: ViewOptions, A?: Point, B?: Point, C?:Point, labels?: Label[]) {
    super(data,viewOptions)
    this.A = A
    this.B = B
    this.C = C
    this.labels = labels ?? []
  }

  /**
   * Render into this.canvas
   */
  async render() {
    // create loading image
    const loader = createElem('div','loader',this.DOM)
    // first init if not already
    if (this.A === undefined) await this.init()

    if (!this.A || !this.B || !this.C || !this.ht ) {
      throw new Error(`Intialisation failed. Points are: ${[this.A,this.B,this.C,this.ht]}`)
    }
    if (this.data instanceof Promise) throw new Error("Initialisation failed: data is still a Promise")

    const ctx = this.canvas.getContext("2d");
    if (ctx === null) throw new Error("Could not get canvas context")
    ctx.clearRect(0,0,this.canvas.width,this.canvas.height); // clear
    ctx.setLineDash([]);
    // draw triangle
    ctx.beginPath();
    ctx.moveTo(this.A.x,this.A.y);
    ctx.lineTo(this.B.x,this.B.y);
    ctx.lineTo(this.C.x,this.C.y);
    ctx.lineTo(this.A.x,this.A.y);
    ctx.stroke();
    ctx.fillStyle="LightGrey";
    ctx.fill();
    ctx.closePath();

    // draw height
    if (this.data.height.show) {
      ctx.beginPath();
      //arrowLine(ctx,this.C,this.ht,10);
      arrowLine(ctx,
        Point.mean(this.C,this.ht).moveToward(this.C,15),
        this.C, 10
      );
      arrowLine(ctx,
        Point.mean(this.C,this.ht).moveToward(this.ht,15),
        this.ht, 10
      );
      ctx.stroke();
      ctx.closePath();
    }

    // right-angle symbol
    if (this.data.isRightAngled() || this.data.height.show) {
      ctx.beginPath();
      if (this.A.equals(this.ht)) {
        drawRightAngle(ctx, this.B, this.ht, this.C, 15);
      } else {
        drawRightAngle(ctx, this.A, this.ht, this.C, 15);
      }
      ctx.stroke();
      ctx.closePath();
    }

    if (this.data.height.show && this.overhangRight) {
      ctx.beginPath();
      ctx.setLineDash([5,3]);
      ctx.moveTo(this.B.x,this.B.y);
      ctx.lineTo(this.ht.x,this.ht.y);
      ctx.stroke();
      ctx.closePath();
    }
    if (this.data.height.show && this.overhangLeft) {
      ctx.beginPath();
      ctx.setLineDash([5,3]);
      ctx.moveTo(this.A.x,this.A.y);
      ctx.lineTo(this.ht.x,this.ht.y);
      ctx.stroke();
      ctx.closePath();
    }

    this.renderLabels()
    loader.remove()
  }

  /**
   * Initialise. Instance method rather than static factory method, so instance can control, e.g. loading icon
   * async since data is a promise
   */
  async init() : Promise<void> {
    this.data = await this.data
    const h = this.data.height.val
    const b = this.data.base.val
    const s1 = this.data.side1.val
    const s2 = this.data.side2.val

    //build upside down
    this.A = new Point(0, h);
    this.B = new Point(b, h);
    this.C = new Point( (b*b + s1*s1 - s2*s2)/(2*b) , 0 );
    this.ht = new Point(this.C.x, this.A.y);

    this.overhangRight=false, this.overhangLeft=false;
    if (this.C.x > this.B.x) {this.overhangRight = true;}
    if (this.C.x < this.A.x) {this.overhangLeft = true;}

    // rotate, scale and center
    this.rotation = this.rotation ?? 2*Math.PI*Math.random()
    ;[this.A,this.B,this.C,this.ht].forEach( pt => pt.rotate(this.rotation!) )
    Point.scaleToFit([this.A,this.B,this.C,this.ht],this.width,this.height,80)

    // Making labels - more involved than I remembered!
    // First the labels for the sides
    const sides : [Point,Point, Value][] = [ //[1st point, 2nd point, data]
      [this.A,this.B,this.data.base],
      [this.C,this.A,this.data.side1],
      [this.B,this.C,this.data.side2],
    ];

    // order of putting in height matters for offset
    // This breaks if we have rounding errors
    if (this.ht.equals(this.B)) { //
      sides.push([this.ht,this.C,this.data.height]);
    } else {
      sides.push([this.C,this.ht,this.data.height]);
    }

    for (let i = 0; i < 4; i++) { //sides
      if (!sides[i][2].show) continue;
      const offset = 20; // offset from line by this many pixels
      let pos = Point.mean(sides[i][0],sides[i][1]);  // start at midpoint
      const unitvec = Point.unitVector(sides[i][0], sides[i][1]);
      
      if ( i < 3 || this.data.isRightAngled() )
        pos.translate(-unitvec.y*offset, unitvec.x*offset); 

      const texta : string = sides[i][2].label ?? sides[i][2].val.toString()
      const textq = sides[i][2].missing? "?" : texta;
      const styleq = "normal";
      const stylea = sides[i][2].missing? "answer" : "normal";

      this.labels.push({
        pos: pos,
        texta: texta,
        textq: textq,
        text: textq,
        stylea: stylea,
        styleq: styleq,
        style: styleq
      });
    }

    //area and perimeter
    let n_info = 0;
    if (this.data.area.show) {
      const texta : string = this.data.area.label ?? this.data.area.val.toString()
      const textq = this.data.area.missing? "?" : texta;
      const styleq = "extra-info";
      const stylea = this.data.area.missing? "extra-answer" : "extra-info";
      this.labels.push(
        {
          texta: "Area = " + texta,
          textq: "Area = " + textq,
          text: "Area = " + textq,
          styleq: styleq,
          stylea: stylea,
          style: styleq,
          pos: new Point(10, this.height - 10 - 15*n_info),
        }
      );
      n_info++;
    }
    if (this.data.perimeter.show) {
      const texta = this.data.perimeter.label ?? this.data.perimeter.val.toString()
      const textq = this.data.perimeter.missing? "?" : texta;
      const styleq = "extra-info";
      const stylea = this.data.perimeter.missing? "extra-answer" : "extra-info";
      this.labels.push(
        {
          pos: new Point(10, this.height - 10 - 20*n_info),
          texta: "Perimeter = " + texta,
          textq: "Perimeter = " + textq,
          text: "Perimeter = " + textq,
          styleq: styleq,
          stylea: stylea,
          style: styleq,
        }
      );
    }
    
    // stop them from clashing - hmm, not sure
    /*
    this.success=true;
    for (let i = 0, n=this.labels.length; i < n; i++) {
      for (let j = 0; j < i; j++) {
        const l1=this.labels[i], l2=this.labels[j];
        const d = Point.distance(l1.pos,l2.pos);
        //console.log(`d('${l1.text}','${l2.text}') = ${d}`);
        if (d < 20) {
          //console.log("too close");
          this.success=false;
        }
      }
    }*/
  }

  static fromAsyncData(data: Promise<TriangleAreaData>,viewOptions: ViewOptions) {
    return new this(data,viewOptions)
  }
}