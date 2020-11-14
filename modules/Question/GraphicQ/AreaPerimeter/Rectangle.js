import {randElem, randBetween} from "Utilities/Utilities";

export default class Rectangle {
  constructor (x,type,options) {
    /** documenting what is used from options
     * interface Options { 
     *   noDistractors: boolean   // when true, give all sides on P, give two sides on A
     *   maxSideLength: number    // actually a separate parameter here, but should be in options
     *   mixUnits
     * }
     */
    
    this.shape="rectangle";
    // members: b, h, area, perimeter, show_opposites
    if (!options) options = {};

    let sides;
    if ( x.b && x.h ) sides = x;
    else {
      sides = {
        b: randBetween(1,x),
        h: randBetween(1,x)
      };
    }

    this.b = {val: sides.b, show: true, missing: false};
    this.h = {val: sides.h, show: true, missing: false};
    this.area = {
      val: this.b.val*this.h.val,
      show: false,
      missing: true
    };
    this.perimeter = {
      val: this.b.val+this.b.val+this.h.val+this.h.val,
      show: false,
      missing: true
    };

    //selectively hide/missing depending on type
    switch(type) {
    case "area":
      this.area.show=true;
      this.area.missing=true;
      this.show_opposites=!options.no_distractors;
      break;
    case "perimeter":
      this.perimeter.show=true;
      this.perimeter.missing=true;
      this.show_opposites=options.no_distractors;
      break;
    case "rev-area":
      this.area.show=true;
      this.area.missing=false;
      randElem([this.b,this.h]).missing = true;
      this.show_opposites=false;
      break;
    case "rev-perimeter":
    default:
      this.perimeter.show=true;
      this.perimeter.missing=false;
      randElem([this.b,this.h]).missing = true;
      this.show_opposites=false;
      break;
    }
  }
}
