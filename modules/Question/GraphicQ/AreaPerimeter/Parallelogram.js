import {randElem, randBetween} from "Utilities/Utilities";

export default class Parallelogram {
  constructor (x,type,options) {
    this.shape="parallelogram";
    // members: b, s, h, area, perimeter, show_opposites
    if (!options) options = {};

    let sides;
    if ( x.b && x.h && x.s ) sides = x;
    else {
      const b = randBetween(1,x);
      const h = randBetween(1,x);
      const s = randBetween(h,x);
      sides = {b: b,h: h,s: s};
    }

    this.b = {val: sides.b, show: true, missing: false};
    this.h = {val: sides.h, show: true, missing: false};
    this.s = {val: sides.s, show: true, missing: false};

    this.area = {
      val: this.b.val*this.h.val,
      show: false,
      missing: true
    };
    this.perimeter = {
      val: this.b.val+this.b.val+this.s.val+this.s.val,
      show: false,
      missing: true
    };

    /*selectively hide/missing depending on type
    no_distractors:
        Hide side for area
        Show opposites and hide height for perimeter
        Otherwise don't show opposites (looks wrong to me)
    */
    this.show_opposites = false;
    switch(type) {
    case "area":
      this.area.show = true;
      this.area.missing = true;
      this.s.show = !options.no_distractors;
      break;
    case "perimeter":
      this.perimeter.show = true;
      this.perimeter.missing = true;
      this.show_opposites = options.no_distractors;
      this.h.show = !options.no_distractors;
      break;
    case "rev-area":
      this.area.show = true;
      this.area.missing = false;
      randElem([this.b,this.h]).missing = true;
      break;
    case "rev-perimeter":
    default:
      this.perimeter.show=true;
      this.perimeter.missing=false;
      randElem([this.b,this.s]).missing = true;
      break;
    }
  }
}
