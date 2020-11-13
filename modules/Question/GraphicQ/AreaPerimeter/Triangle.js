import {randElem} from "Utilities/Utilities";
import triangle_data from "./triangle_data.json";

export default class Triangle {
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

    this.shape="triangle";
    this.dp = settings.dp; // don't actually scale - just do this in display

    let sides;
    if ( x.b && x.s1 && x.s2 ) sides = x;
    else {
      const right_angle = type.startsWith("pythag-") || settings.right_angle;
      const isosceles = type === "iso-pythag-area" || settings.isosceles;
      const max_side = Number.isInteger(x) ? x : 500;
      sides = randElem(triangle_data.filter(t => 
        Math.max(t.b,t.s1,t.s2) <= max_side &&
        ( !right_angle || (t.s1===t.h || t.s2===t.h) ) &&
        ( !isosceles || t.s1 === t.s2)
      ));
    }

    this.b = {val: sides.b, show: true, missing: false};
    this.h = {val: sides.h, show: true, missing: false};
    this.s1 = {val: sides.s1, show: sides.s1 !== sides.h, missing: false};
    this.s2 = {val: sides.s2, show: sides.s2 !== sides.h, missing: false};
    this.area = {
      val: this.b.val*this.h.val/2,
      show: false,
      missing: true
    };
    this.perimeter = {
      val: this.b.val+this.s1.val+this.s2.val,
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
    case "rev-perimeter":{
      this.perimeter.show=true;
      this.perimeter.missing=false;
      let sides = [this.b,this.h];
      if (this.s1===this.h) sides.push(this.s2);
      else sides.push(this.s1);
      randElem(sides).missing=true;
      break;
    }
    case "pythag-area":
      this.area.show=true;
      this.area.missing=true;
      randElem([this.b,this.h]).show=false;
      break;
    case "pythag-perimeter": {
      this.perimeter.show=true;
      this.perimeter.missing=true;
      let sides = [this.b];
      if (this.s1===this.h) {
        sides.push(this.s2);
        sides.push(this.h);
      }
      else if (this.s2===this.h) {
        sides.push(this.s1);
        sides.push(this.h);
      } else {
        sides.push(this.s1);
        sides.push(this.s2);
      }
      randElem(sides).show=false;
      break;
    }
    case "iso-pythag-area":
    default:
      this.area.show=true;
      this.area.missing=true;
      this.h.show=false;
      this.includeHeight=false;
      break;
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
    return Math.max(this.b,this.s1,this.s2);
  }

  isRightAngled () {
    return (this.h.val === this.s1.val || this.h.val === this.s2.val);
  }

}
