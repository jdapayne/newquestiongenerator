import {randElem, randBetween, randPythagTriple, randPythagTripleWithLeg} from "Utilities/Utilities";

export default class Trapezium {
  /* Polymorphic constructor:
   * Triangle({b:Number,s1:Number,s2:Number,h:Number},options)
   *   Returns triangle with given sides
   * Triangle(maxside:Number,options)
   *   Returns random triangle with side lengths up to that side
   */

  constructor (x,type,options) {
    const defaults = {
      no_distractors: false,
      dp: 0, // decimal places
      right_angle: false,
      isosceles: false
    };
    const settings = Object.assign({},defaults,options);
    const max_side = Number.isInteger(x) ? x : 500;

    this.shape="trapezium";
    this.dp = settings.dp; // don't actually scale - just do this in display

    let a, b, s1, s2, h; // final sides and height
    let b1, b2; // bits of longest parallel side. b=a+b1+b2
    let tri1, tri2; // two ra triangles

    tri1 = randPythagTriple(max_side);
    s1 = tri1.c;

    if (Math.random()<0.5) {
      h = tri1.a;
      b1 = tri1.b;
    } else {
      h = tri1.b;
      b1 = tri1.a;
    }

    tri2 = randPythagTripleWithLeg(h,max_side);
    s2 = tri2.c;
    b2 = tri2.b; //tri2.a =: h

    a = randBetween(Math.floor(Math.min(s1,s2)*0.75),max_side-b1-b2);
    b = b1 + b2 + a;

    this.a = {val: a, show: true, missing: false};
    this.b = {val: b, show: true, missing: false};
    this.h = {val: h, show: true, missing: false};
    this.s1 = {val: s1, show: true, missing: false};
    this.s2 = {val: s2, show: true, missing: false};

    this.b1 = b1;
    this.b2 = b2; // never shown - useful for drawing

    this.area = {
      val: (a+b)*h/2,
      show: false,
      missing: true
    };
    this.perimeter = {
      val: a + b + s1 + s2,
      show: false,
      missing: true
    };

    //selectively hide/missing depending on type
    switch(type) {
    case "area":
      this.area.show=true;
      this.area.missing=true;
      break;
    case "perimeter":
      this.perimeter.show=true;
      this.perimeter.missing=true;
      break;
    case "rev-area":
      this.area.show=true;
      this.area.missing=false;
      if (Math.random()<0.5) this.h.missing=true;
      else this.b.missing=true;
      break;
    case "rev-perimeter":
    default: {
      this.perimeter.show=true;
      this.perimeter.missing=false;
      let sides = [this.b,this.h];
      if (this.s1===this.h) sides.push(this.s2);
      else sides.push(this.s1);
      randElem(sides).missing=true;
      break;
    }
    }

    //process options
    if (settings.no_distractors) {
      if (type === "area" || type === "rev-area") {
        this.s1.show=false;
        this.s2.show=false;
      } else if (!this.isRightAngled() && type === "perimeter" || type === "rev-perimeter") {
        this.h.show = false;
      }
    }

  }

  get maxSide () {
    return Math.max(this.a,this.b,this.s1,this.s2);
  }

  isRightAngled () {
    return (this.h.val === this.s1.val || this.h.val === this.s2.val);
  }

}
