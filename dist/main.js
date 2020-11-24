(function () {
  'use strict';

  /* Rslider. Downloaded from https://slawomir-zaziablo.github.io/range-slider/
   * Modified to make into ES6 module and fix a few bugs
   */

  var RS = function (conf) {
    this.input = null;
    this.inputDisplay = null;
    this.slider = null;
    this.sliderWidth = 0;
    this.sliderLeft = 0;
    this.pointerWidth = 0;
    this.pointerR = null;
    this.pointerL = null;
    this.activePointer = null;
    this.selected = null;
    this.scale = null;
    this.step = 0;
    this.tipL = null;
    this.tipR = null;
    this.timeout = null;
    this.valRange = false;

    this.values = {
      start: null,
      end: null
    };
    this.conf = {
      target: null,
      values: null,
      set: null,
      range: false,
      width: null,
      scale: true,
      labels: true,
      tooltip: true,
      step: null,
      disabled: false,
      onChange: null
    };

    this.cls = {
      container: 'rs-container',
      background: 'rs-bg',
      selected: 'rs-selected',
      pointer: 'rs-pointer',
      scale: 'rs-scale',
      noscale: 'rs-noscale',
      tip: 'rs-tooltip'
    };

    for (var i in this.conf) { if (Object.prototype.hasOwnProperty.call(conf, i)) this.conf[i] = conf[i]; }

    this.init();
  };

  RS.prototype.init = function () {
    if (typeof this.conf.target === 'object') this.input = this.conf.target;
    else this.input = document.getElementById(this.conf.target.replace('#', ''));

    if (!this.input) return console.log('Cannot find target element...')

    this.inputDisplay = getComputedStyle(this.input, null).display;
    this.input.style.display = 'none';
    this.valRange = !(this.conf.values instanceof Array);

    if (this.valRange) {
      if (!Object.prototype.hasOwnProperty.call(this.conf.values, 'min') || !Object.prototype.hasOwnProperty.call(this.conf.values, 'max')) { return console.log('Missing min or max value...') }
    }
    return this.createSlider()
  };

  RS.prototype.createSlider = function () {
    this.slider = createElement('div', this.cls.container);
    this.slider.innerHTML = '<div class="rs-bg"></div>';
    this.selected = createElement('div', this.cls.selected);
    this.pointerL = createElement('div', this.cls.pointer, ['dir', 'left']);
    this.scale = createElement('div', this.cls.scale);

    if (this.conf.tooltip) {
      this.tipL = createElement('div', this.cls.tip);
      this.tipR = createElement('div', this.cls.tip);
      this.pointerL.appendChild(this.tipL);
    }
    this.slider.appendChild(this.selected);
    this.slider.appendChild(this.scale);
    this.slider.appendChild(this.pointerL);

    if (this.conf.range) {
      this.pointerR = createElement('div', this.cls.pointer, ['dir', 'right']);
      if (this.conf.tooltip) this.pointerR.appendChild(this.tipR);
      this.slider.appendChild(this.pointerR);
    }

    this.input.parentNode.insertBefore(this.slider, this.input.nextSibling);

    if (this.conf.width) this.slider.style.width = parseInt(this.conf.width) + 'px';
    this.sliderLeft = this.slider.getBoundingClientRect().left;
    this.sliderWidth = this.slider.clientWidth;
    this.pointerWidth = this.pointerL.clientWidth;

    if (!this.conf.scale) this.slider.classList.add(this.cls.noscale);

    return this.setInitialValues()
  };

  RS.prototype.setInitialValues = function () {
    this.disabled(this.conf.disabled);

    if (this.valRange) this.conf.values = prepareArrayValues(this.conf);

    this.values.start = 0;
    this.values.end = this.conf.range ? this.conf.values.length - 1 : 0;

    if (this.conf.set && this.conf.set.length && checkInitial(this.conf)) {
      var vals = this.conf.set;

      if (this.conf.range) {
        this.values.start = this.conf.values.indexOf(vals[0]);
        this.values.end = this.conf.set[1] ? this.conf.values.indexOf(vals[1]) : null;
      } else this.values.end = this.conf.values.indexOf(vals[0]);
    }
    return this.createScale()
  };

  RS.prototype.createScale = function (resize) {
    this.step = this.sliderWidth / (this.conf.values.length - 1);

    for (var i = 0, iLen = this.conf.values.length; i < iLen; i++) {
      var span = createElement('span');
      var ins = createElement('ins');

      span.appendChild(ins);
      this.scale.appendChild(span);

      span.style.width = i === iLen - 1 ? 0 : this.step + 'px';

      if (!this.conf.labels) {
        if (i === 0 || i === iLen - 1) ins.innerHTML = this.conf.values[i];
      } else ins.innerHTML = this.conf.values[i];

      ins.style.marginLeft = (ins.clientWidth / 2) * -1 + 'px';
    }
    return this.addEvents()
  };

  RS.prototype.updateScale = function () {
    this.step = this.sliderWidth / (this.conf.values.length - 1);

    var pieces = this.slider.querySelectorAll('span');

    for (var i = 0, iLen = pieces.length; i < iLen - 1; i++) { pieces[i].style.width = this.step + 'px'; }

    return this.setValues()
  };

  RS.prototype.addEvents = function () {
    var pointers = this.slider.querySelectorAll('.' + this.cls.pointer);
    var pieces = this.slider.querySelectorAll('span');

    createEvents(document, 'mousemove touchmove', this.move.bind(this));
    createEvents(document, 'mouseup touchend touchcancel', this.drop.bind(this));

    for (let i = 0, iLen = pointers.length; i < iLen; i++) { createEvents(pointers[i], 'mousedown touchstart', this.drag.bind(this)); }

    for (let i = 0, iLen = pieces.length; i < iLen; i++) { createEvents(pieces[i], 'click', this.onClickPiece.bind(this)); }

    window.addEventListener('resize', this.onResize.bind(this));

    return this.setValues()
  };

  RS.prototype.drag = function (e) {
    e.preventDefault();

    if (this.conf.disabled) return

    var dir = e.target.getAttribute('data-dir');
    if (dir === 'left') this.activePointer = this.pointerL;
    if (dir === 'right') this.activePointer = this.pointerR;

    return this.slider.classList.add('sliding')
  };

  RS.prototype.move = function (e) {
    if (this.activePointer && !this.conf.disabled) {
      this.onResize(); // needed in case any elements have moved the slider in the meantime
      var coordX = e.type === 'touchmove' ? e.touches[0].clientX : e.pageX;
      var index = coordX - this.sliderLeft - (this.pointerWidth / 2); // pixel position from left of slider (shifted left by half width)

      index = Math.ceil(index / this.step);

      if (index <= 0) index = 0;
      if (index > this.conf.values.length - 1) index = this.conf.values.length - 1;

      if (this.conf.range) {
        if (this.activePointer === this.pointerL) this.values.start = index;
        if (this.activePointer === this.pointerR) this.values.end = index;
      } else this.values.end = index;

      return this.setValues()
    }
  };

  RS.prototype.drop = function () {
    this.activePointer = null;
  };

  RS.prototype.setValues = function (start, end) {
    var activePointer = this.conf.range ? 'start' : 'end';

    if (start && this.conf.values.indexOf(start) > -1) { this.values[activePointer] = this.conf.values.indexOf(start); }

    if (end && this.conf.values.indexOf(end) > -1) { this.values.end = this.conf.values.indexOf(end); }

    if (this.conf.range && this.values.start > this.values.end) { this.values.start = this.values.end; }

    this.pointerL.style.left = (this.values[activePointer] * this.step - (this.pointerWidth / 2)) + 'px';

    if (this.conf.range) {
      if (this.conf.tooltip) {
        this.tipL.innerHTML = this.conf.values[this.values.start];
        this.tipR.innerHTML = this.conf.values[this.values.end];
      }
      this.input.value = this.conf.values[this.values.start] + ',' + this.conf.values[this.values.end];
      this.pointerR.style.left = (this.values.end * this.step - (this.pointerWidth / 2)) + 'px';
    } else {
      if (this.conf.tooltip) { this.tipL.innerHTML = this.conf.values[this.values.end]; }
      this.input.value = this.conf.values[this.values.end];
    }

    if (this.values.end > this.conf.values.length - 1) this.values.end = this.conf.values.length - 1;
    if (this.values.start < 0) this.values.start = 0;

    this.selected.style.width = (this.values.end - this.values.start) * this.step + 'px';
    this.selected.style.left = this.values.start * this.step + 'px';

    return this.onChange()
  };

  RS.prototype.onClickPiece = function (e) {
    if (this.conf.disabled) return

    var idx = Math.round((e.clientX - this.sliderLeft) / this.step);

    if (idx > this.conf.values.length - 1) idx = this.conf.values.length - 1;
    if (idx < 0) idx = 0;

    if (this.conf.range) {
      if (idx - this.values.start <= this.values.end - idx) {
        this.values.start = idx;
      } else this.values.end = idx;
    } else this.values.end = idx;

    this.slider.classList.remove('sliding');

    return this.setValues()
  };

  RS.prototype.onChange = function () {
    var _this = this;

    if (this.timeout) clearTimeout(this.timeout);

    this.timeout = setTimeout(function () {
      if (_this.conf.onChange && typeof _this.conf.onChange === 'function') {
        return _this.conf.onChange(_this.input.value)
      }
    }, 500);
  };

  RS.prototype.onResize = function () {
    this.sliderLeft = this.slider.getBoundingClientRect().left;
    this.sliderWidth = this.slider.clientWidth;
    return this.updateScale()
  };

  RS.prototype.disabled = function (disabled) {
    this.conf.disabled = disabled;
    this.slider.classList[disabled ? 'add' : 'remove']('disabled');
  };

  RS.prototype.getValue = function () {
    // Return list of numbers, rather than a string, which would just be silly
    //  return this.input.value
    return [this.conf.values[this.values.start], this.conf.values[this.values.end]]
  };

  RS.prototype.getValueL = function () {
    // Get left (i.e. smallest) value
    return this.conf.values[this.values.start]
  };

  RS.prototype.getValueR = function () {
    // Get right (i.e. smallest) value
    return this.conf.values[this.values.end]
  };

  RS.prototype.destroy = function () {
    this.input.style.display = this.inputDisplay;
    this.slider.remove();
  };

  var createElement = function (el, cls, dataAttr) {
    var element = document.createElement(el);
    if (cls) element.className = cls;
    if (dataAttr && dataAttr.length === 2) { element.setAttribute('data-' + dataAttr[0], dataAttr[1]); }

    return element
  };

  var createEvents = function (el, ev, callback) {
    var events = ev.split(' ');

    for (var i = 0, iLen = events.length; i < iLen; i++) { el.addEventListener(events[i], callback); }
  };

  var prepareArrayValues = function (conf) {
    var values = [];
    var range = conf.values.max - conf.values.min;

    if (!conf.step) {
      console.log('No step defined...');
      return [conf.values.min, conf.values.max]
    }

    for (var i = 0, iLen = (range / conf.step); i < iLen; i++) { values.push(conf.values.min + i * conf.step); }

    if (values.indexOf(conf.values.max) < 0) values.push(conf.values.max);

    return values
  };

  var checkInitial = function (conf) {
    if (!conf.set || conf.set.length < 1) return null
    if (conf.values.indexOf(conf.set[0]) < 0) return null

    if (conf.range) {
      if (conf.set.length < 2 || conf.values.indexOf(conf.set[1]) < 0) return null
    }
    return true
  };

  /**
   * Class representing a point, and static utitlity methods
   */
  class Point {
      constructor(x, y) {
          this.x = x;
          this.y = y;
      }
      rotate(angle) {
          const newx = Math.cos(angle) * this.x - Math.sin(angle) * this.y;
          const newy = Math.sin(angle) * this.x + Math.cos(angle) * this.y;
          this.x = newx;
          this.y = newy;
          return this;
      }
      scale(sf) {
          this.x = this.x * sf;
          this.y = this.y * sf;
          return this;
      }
      translate(x, y) {
          this.x += x;
          this.y += y;
          return this;
      }
      clone() {
          return new Point(this.x, this.y);
      }
      equals(that) {
          return (this.x === that.x && this.y === that.y);
      }
      moveToward(that, d) {
          // moves [d] in the direction of [that::Point]
          const uvec = Point.unitVector(this, that);
          this.translate(uvec.x * d, uvec.y * d);
          return this;
      }
      static fromPolar(r, theta) {
          return new Point(Math.cos(theta) * r, Math.sin(theta) * r);
      }
      static fromPolarDeg(r, theta) {
          theta = theta * Math.PI / 180;
          return Point.fromPolar(r, theta);
      }
      /**
       * Returns a point representing the position of an element, either relative to parent or viewport
       * @param elem An HTML element
       * @param anchor Which cornder of the bounding box of elem to return, or the center
       */
      static fromElement(elem, anchor = 'topleft', relativeToParent = true) {
          const rect = elem.getBoundingClientRect();
          let y = anchor.startsWith('top') ? rect.top :
              anchor.startsWith('bottom') ? rect.bottom :
                  (rect.bottom + rect.top) / 2;
          let x = anchor.endsWith('left') ? rect.left :
              anchor.endsWith('right') ? rect.right :
                  (rect.right + rect.left) / 2;
          if (relativeToParent && elem.parentElement) {
              const parentPt = Point.fromElement(elem.parentElement, 'topleft', false);
              x -= parentPt.x;
              y -= parentPt.y;
          }
          return new Point(x, y);
      }
      /**
       * Find the mean of
       * @param  {...Point} points The points to find the mean of
       */
      static mean(...points) {
          const sumx = points.map(p => p.x).reduce((x, y) => x + y);
          const sumy = points.map(p => p.y).reduce((x, y) => x + y);
          const n = points.length;
          return new Point(sumx / n, sumy / n);
      }
      static inCenter(A, B, C) {
          // incenter of a triangle given vertex points A, B and C
          const a = Point.distance(B, C);
          const b = Point.distance(A, C);
          const c = Point.distance(A, B);
          const perimeter = a + b + c;
          const sumx = a * A.x + b * B.x + c * C.x;
          const sumy = a * A.y + b * B.y + c * C.y;
          return new Point(sumx / perimeter, sumy / perimeter);
      }
      static min(points) {
          const minx = points.reduce((x, p) => Math.min(x, p.x), Infinity);
          const miny = points.reduce((y, p) => Math.min(y, p.y), Infinity);
          return new Point(minx, miny);
      }
      static max(points) {
          const maxx = points.reduce((x, p) => Math.max(x, p.x), -Infinity);
          const maxy = points.reduce((y, p) => Math.max(y, p.y), -Infinity);
          return new Point(maxx, maxy);
      }
      static center(points) {
          const minx = points.reduce((x, p) => Math.min(x, p.x), Infinity);
          const miny = points.reduce((y, p) => Math.min(y, p.y), Infinity);
          const maxx = points.reduce((x, p) => Math.max(x, p.x), -Infinity);
          const maxy = points.reduce((y, p) => Math.max(y, p.y), -Infinity);
          return new Point((maxx + minx) / 2, (maxy + miny) / 2);
      }
      /**
       * returns a unit vector in the direction of p1 to p2 in the form {x:..., y:...}
       * @param p1 A point
       * @param p2 A point
       */
      static unitVector(p1, p2) {
          const vecx = p2.x - p1.x;
          const vecy = p2.y - p1.y;
          const length = Math.hypot(vecx, vecy);
          return { x: vecx / length, y: vecy / length };
      }
      static distance(p1, p2) {
          return Math.hypot(p1.x - p2.x, p1.y - p2.y);
      }
      /**
       * Calculate the angle in radians from horizontal to p2, with centre p1.
       * E.g. angleFrom( (0,0), (1,1) ) = pi/2
       * Angle is from 0 to 2pi
       * @param  p1 The start point
       * @param  p2 The end point
       * @returns  The angle in radians
       */
      static angleFrom(p1, p2) {
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          return angle >= 0 ? angle : 2 * Math.PI + angle;
      }
      /**
       * When p1 and p2 are less than [trigger] apart, they are
       * moved so that they are [distance] apart
       * @param p1 A point
       * @param p2 A point
       * @param trigger Distance triggering repulsion
       * @param distance distance to repel to
       */
      static repel(p1, p2, trigger, distance) {
          const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (d >= trigger)
              return false;
          const r = (distance - d) / 2; // distance they need moving
          p1.moveToward(p2, -r);
          p2.moveToward(p1, -r);
          return true;
      }
      /**
       * Scale an center a set of points to a given width or height. N.B. This mutates the points in the array, so clone first if necessar
       * @param points An array of points
       * @param width Width of bounding box to scale to
       * @param height Height of bounding box to scale to
       * @param margin Margin to leave around scaled points
       * @param offset Offset from center of bounding box
       * @returns The scale factor that points were scaled by
       */
      static scaleToFit(points, width, height, margin = 0, offset = [0, 0]) {
          let topLeft = Point.min(points);
          let bottomRight = Point.max(points);
          const totalWidth = bottomRight.x - topLeft.x;
          const totalHeight = bottomRight.y - topLeft.y;
          const sf = Math.min((width - margin) / totalWidth, (height - margin) / totalHeight);
          points.forEach(pt => { pt.scale(sf); });
          // centre
          topLeft = Point.min(points);
          bottomRight = Point.max(points);
          const center = Point.mean(topLeft, bottomRight).translate(...offset);
          points.forEach(pt => { pt.translate(width / 2 - center.x, height / 2 - center.y); }); // centre
          return sf;
      }
  }

  /**
   * return a random integer between n and m inclusive
   * dist (optional) is a function returning a value in [0,1)
   * @param {number} n The minimum value
   * @param {number} m The maximum value
   * @param {()=>number} [dist] A distribution returning a number from 0 to 1
   */
  function randBetween (n, m, dist) {
    // return a random integer between n and m inclusive
    // dist (optional) is a function returning a value in [0,1)
    // default is slightly biased towards middle
    if (!dist) dist = Math.random;
    return n + Math.floor(dist() * (m - n + 1))
  }

  function randBetweenFilter (n, m, filter) {
    /* returns a random integer between n and m inclusive which satisfies the filter
    /  n, m: integer
    /  filter: Int-> Bool
    */
    const arr = [];
    for (let i = n; i < m + 1; i++) {
      if (filter(i)) arr.push(i);
    }
    if (arr === []) throw new Error('overfiltered')
    const i = randBetween(0, arr.length - 1);
    return arr[i]
  }

  /**
   * Returns a multiple of n between min and max
   * @param {number} min Minimum value
   * @param {number} max Maximum value
   * @param {number} n Choose a multiple of this value
   * @returns {number} A multipleof n between min and max
   */
  function randMultBetween (min, max, n) {
    // return a random multiple of n between n and m (inclusive if possible)
    min = Math.ceil(min / n) * n;
    max = Math.floor(max / n) * n; // could check divisibility first to maximise performace, but I'm sure the hit isn't bad

    return randBetween(min / n, max / n) * n
  }

  /**
   * Returns a random element of an array
   * @template T
   * @param {T[]} array An array of objects
   * @param {()=>number} [dist] A distribution function for weighting, returning a number between 0 and 1. Default is Math.random
   * @returns {T}
   */
  function randElem (array, dist) {
    if ([...array].length === 0) throw new Error('empty array')
    if (!dist) dist = Math.random;
    const n = array.length || array.size;
    const i = randBetween(0, n - 1, dist);
    return [...array][i]
  }

  /**
   * Finds a random pythaogrean triple with maximum hypotenuse lengt 
   * @param {number} max The maximum length of the hypotenuse
   * @returns {{a: number, b: number, c: number}} Three values such that a^2+b^2=c^2
   */
  function randPythagTriple(max) {
    const n = randBetween(2, Math.ceil(Math.sqrt(max))-1);
    const m = randBetween(1, Math.min(n-1,Math.floor(Math.sqrt(max-n*n))));
    return {a: n*n-m*m, b: 2*n*m, c:n*n+m*m};
  }

  /**
   * Random pythagorean triple with a given leg
   * @param {number} a The length of the first leg
   * @param {number} max The maximum length of the hypotenuse
   * @returns {{a: number, b: number, c:number}} Three values such that a^2+b^2 = c^2 and a is the first input parameter
   */
  function randPythagTripleWithLeg(a,max) {
    /* Random pythagorean triple with a given leg
     * That leg is the first one */

    if (max===undefined) max = 500;

    if (a%2===1) { //odd: a = n^2-m^2
      return randPythagnn_mm(a,max);
    } else { //even: try a = 2mn, but if that fails, try a=n^2-m^2
      let triple;
      let f1, f2;
      if (Math.random()<0.5) {
        f1 = randPythag2mn, f2=randPythagnn_mm;
      } else {
        f2 = randPythag2mn, f1=randPythagnn_mm;
      }
      try {
        triple = f1(a,max);
      } catch(err) {
        triple = f2(a,max);
      } 
      return triple;
    }
  }

  function randPythag2mn(a,max) {
    // assumes a is 2mn, finds appropriate parameters
    // let m,n be a factor pair of a/2
    let factors = []; //factors of n
    const maxm = Math.sqrt(a/2);                              
    for (let m=1; m<maxm; m++) {
      if ( (a/2)%m===0 && m*m+(a*a)/(4*m*m)<=max ) {
        factors.push(m);
      }
    }
    if (factors.length===0) throw "2mn no options";

    let m = randElem(factors);
    let n = a/(2*m);
    return {a: 2*n*m, b: Math.abs(n*n-m*m), c:n*n+m*m};
  }

  function randPythagnn_mm(a,max) {
    // assumes a = n^2-m^2
    // m=sqrt(a+n^2)
    // cycle through 1≤m≤sqrt((max-a)/2)
    let possibles = [];
    const maxm = Math.sqrt((max-a)/2);
    for (let m=1; m<=maxm; m++) {
      let n = Math.sqrt(a+m*m);
      if (n===Math.floor(n)) possibles.push([n,m]);
    }
    if (possibles.length===0) throw "n^2-m^2 no options";

    let [n,m] = randElem(possibles);

    return {a: n*n-m*m, b: 2*n*m, c: n*n+m*m};
  }

  /**
   * Rounds a number to a given number of decimal places
   * @param {number} x The number to round
   * @param {number} n The number of decimal places
   * @returns {number}
   */
  function roundDP (x, n) {
    return Math.round(x * Math.pow(10, n)) / Math.pow(10, n)
  }

  function sinDeg (x) {
    return Math.sin(x * Math.PI / 180)
  }

  /**
   * Returns a string representing n/10^dp
   * E.g. scaledStr(314,2) = "3.14"
   * @param {number} n An integer representing the digits of a fixed point number
   * @param {number} dp An integer for number of decimal places
   * @returns {string}
   */
  function scaledStr (n, dp) {
    if (dp === 0) return n
    const factor = Math.pow(10, dp);
    const intpart = Math.floor(n / factor);
    const decpart = n % factor;
    if (decpart === 0) {
      return intpart
    } else {
      return intpart + '.' + decpart
    }
  }

  function gcd (a, b) {
    // taken from fraction.js
    if (!a) { return b }
    if (!b) { return a }

    while (1) {
      a %= b;
      if (!a) { return b }
      b %= a;
      if (!b) { return a }
    }
  }

  function shuffle (array) {
    // Knuth-Fisher-Yates
    // from https://stackoverflow.com/a/2450976/3737295
    // nb. shuffles in place
    var currentIndex = array.length; var temporaryValue; var randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex !== 0) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array
  }

  /**
   * Returns true if a is an array containing e, false otherwise (including if a is not an array)
   * @param {*} a  An array
   * @param {*} e An element to check if is in the array
   * @returns {boolean}
   */
  function weakIncludes (a, e) {
    return (Array.isArray(a) && a.includes(e))
  }

  function firstUniqueIndex (array) {
    // returns index of first unique element
    // if none, returns length of array
    let i = 0;
    while (i < array.length) {
      if (array.indexOf(array[i]) === array.lastIndexOf(array[i])) {
        break
      }
      i++;
    }
    return i
  }

  function boolObjectToArray (obj) {
    // Given an object where all values are boolean, return keys where the value is true
    const result = [];
    for (const key in obj) {
      if (obj[key]) result.push(key);
    }
    return result
  }

  /* DOM manipulation and querying */

  /**
   * Creates a new HTML element, sets classes and appends
   * @param {string} tagName Tag name of element
   * @param {string|undefined} [className] A class or classes to assign to the element
   * @param {HTMLElement} [parent] A parent element to append the element to
   * @returns {HTMLElement}
   */
  function createElem (tagName, className, parent) {
    // create, set class and append in one
    const elem = document.createElement(tagName);
    if (className) elem.className = className;
    if (parent) parent.appendChild(elem);
    return elem
  }

  function hasAncestorClass (elem, className) {
    // check if an element elem or any of its ancestors has clss
    let result = false;
    for (;elem && elem !== document; elem = elem.parentNode) { // traverse DOM upwards
      if (elem.classList.contains(className)) {
        result = true;
      }
    }
    return result
  }

  /**
   * Determines if two elements overlap
   * @param {HTMLElement} elem1 An HTML element
   * @param {HTMLElement} elem2 An HTML element
   */
  function overlap( elem1, elem2) {
    const rect1 = elem1.getBoundingClientRect();
    const rect2 = elem2.getBoundingClientRect();
    return !(rect1.right < rect2.left || 
             rect1.left > rect2.right || 
             rect1.bottom < rect2.top || 
             rect1.top > rect2.bottom)
  }

  /**
   * If elem1 and elem2 overlap, move them apart until they don't.
   * Only works for those with position:absolute
   * This strips transformations, which may be a problem
   * Elements with class 'repel-locked' will not be moved
   * @param {HTMLElement} elem1 An HTML element
   * @param {HTMLElement} elem2 An HTML element
   */
  function repelElements(elem1, elem2)  {
    if (!overlap(elem1,elem2)) return
    if (getComputedStyle(elem1).position !== "absolute" || getComputedStyle(elem2).position !== 'absolute') throw new Error ('Only call on position:absolute')
    let tl1 = Point.fromElement(elem1);
    let tl2 = Point.fromElement(elem2);
    
    const c1 = Point.fromElement(elem1, "center");
    const c2 = Point.fromElement(elem2, "center");
    const vec = Point.unitVector(c1,c2);

    const locked1 = elem1.classList.contains('repel-locked');
    const locked2 = elem2.classList.contains('repel-locked');

    let i = 0;
    while(overlap(elem1,elem2) && i<500) {
      if (!locked1) tl1.translate(-vec.x,-vec.y);
      if (!locked2) tl2.translate(vec.x,vec.y);
      elem1.style.left = tl1.x + "px";
      elem1.style.top = tl1.y + "px";
      elem1.style.transform = "none";
      elem2.style.left = tl2.x + "px";
      elem2.style.top = tl2.y + "px";
      elem2.style.transform = "none";
      i++;
    }
    if (i===500) throw new Error('Too much moving')
    console.log(`Repelled with ${i} iterations`);
  }

  /* Canvas drawing */
  function dashedLine (ctx, x1, y1, x2, y2) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const dashx = (y1 - y2) / length; // unit vector perpendicular to line
    const dashy = (x2 - x1) / length;
    const midx = (x1 + x2) / 2;
    const midy = (y1 + y2) / 2;

    // draw the base line
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    // draw the dash
    ctx.moveTo(midx + 5 * dashx, midy + 5 * dashy);
    ctx.lineTo(midx - 5 * dashx, midy - 5 * dashy);

    ctx.moveTo(x2, y2);
  }

  /**
   * Represents a set of options, with link to UI elements. Stores internally the options
   * in a simple object suitable for passing to question generators
   */
  class OptionsSet {
      /**
       * Create a new options spec
       * @param optionsSpec Specification of options
       * @param template A template for displaying options, using {{mustache}} syntax
       */
      constructor(optionsSpec, template) {
          this.optionsSpec = optionsSpec;
          this.options = {};
          this.optionsSpec.forEach(option => {
              if (isRealOption(option) && option.type !== 'suboptions' && option.type !== 'range') {
                  this.options[option.id] = option.default;
              }
              else if (option.type === 'range') {
                  this.options[option.idLB] = option.defaultLB;
                  this.options[option.idUB] = option.defaultUB;
              }
              else if (option.type === 'suboptions') { // Recursively build suboptions. Terminates as long as optionsSpec is not circular
                  option.subOptionsSet = new OptionsSet(option.optionsSpec);
                  this.options[option.id] = option.subOptionsSet.options;
              }
          });
          this.template = template; // html template (optional)
          // set an id based on a counter - used for names of form elements
          this.globalId = OptionsSet.getId();
      }
      static getId() {
          if (OptionsSet.idCounter >= Math.pow(26, 2))
              throw new Error('Too many options objects!');
          const id = String.fromCharCode(~~(OptionsSet.idCounter / 26) + 97) +
              String.fromCharCode(OptionsSet.idCounter % 26 + 97);
          OptionsSet.idCounter += 1;
          return id;
      }
      /**
       * Given an option, find its UI element and update the state from that
       * @param {*} option An element of this.optionSpec or an id
       */
      updateStateFromUI(option) {
          // input - either an element of this.optionsSpec or an option id
          if (typeof (option) === 'string') {
              const optionsSpec = this.optionsSpec.find(x => (x.id === option));
              if (optionsSpec !== undefined) {
                  option = optionsSpec;
              }
              else {
                  throw new Error(`no option with id '${option}'`);
              }
          }
          if (!option.element)
              throw new Error(`option ${option.id} doesn't have a UI element`);
          switch (option.type) {
              case 'int': {
                  const input = option.element.getElementsByTagName('input')[0];
                  this.options[option.id] = Number(input.value);
                  break;
              }
              case 'bool': {
                  const input = option.element.getElementsByTagName('input')[0];
                  this.options[option.id] = input.checked;
                  break;
              }
              case 'select-exclusive': {
                  this.options[option.id] = option.element.querySelector('input:checked').value;
                  break;
              }
              case 'select-inclusive': {
                  this.options[option.id] =
                      Array.from(option.element.querySelectorAll('input:checked')).map(x => x.value);
                  break;
              }
              case 'range': {
                  const inputLB = option.element.getElementsByTagName('input')[0];
                  const inputUB = option.element.getElementsByTagName('input')[1];
                  this.options[option.idLB] = Number(inputLB.value);
                  this.options[option.idUB] = Number(inputUB.value);
                  break;
              }
              default:
                  throw new Error(`option with id ${option.id} has unrecognised option type ${option.type}`);
          }
          console.log(this.options);
      }
      /**
       * Given a string, return the element of this.options with that id
       * @param id The id
       */
      updateStateFromUIAll() {
          this.optionsSpec.forEach(option => {
              if (isRealOption(option)) {
                  this.updateStateFromUI(option);
              }
          });
      }
      disableOrEnableAll() {
          this.optionsSpec.forEach(option => this.disableOrEnable(option));
      }
      /**
       * Given an option, enable the UI elements if and only if all the boolean
       * options in option.enabledIf are true
       * @param option An element of this.optionsSpec or an option id
       */
      disableOrEnable(option) {
          if (typeof (option) === 'string') {
              const tempOption = this.optionsSpec.find(x => (isRealOption(x) && x.id === option));
              if (tempOption !== undefined) {
                  option = tempOption;
              }
              else {
                  throw new Error(`no option with id '${option}'`);
              }
          }
          if (!isRealOption(option) || !option.enabledIf || option.element === undefined)
              return;
          const enablerList = option.enabledIf.split('&'); //
          let enable = true; // will disable if just one of the elements of enablerList is false
          for (let i = 0; i < enablerList.length; i++) {
              let enablerId = enablerList[i];
              if (enablerId.startsWith('!')) {
                  enablerId = enablerId.slice(1);
              }
              if (typeof this.options[enablerId] !== 'boolean') {
                  throw new Error(`Invalid 'enabledIf': ${enablerId} is not a boolean option`);
              }
              const enablerValue = this.options[enablerId]; //! == negate // !== equivalent to XOR
              if (!enablerValue) {
                  enable = false;
                  break;
              }
          }
          if (enable) {
              option.element.classList.remove('disabled');
              [...option.element.getElementsByTagName('input')].forEach(e => { e.disabled = false; });
          }
          else {
              option.element.classList.add('disabled');
              [...option.element.getElementsByTagName('input')].forEach(e => { e.disabled = true; });
          }
      }
      renderIn(element, ulExtraClass) {
          const list = createElem('ul', 'options-list');
          if (ulExtraClass)
              list.classList.add(ulExtraClass);
          let column = createElem('div', 'options-column', list);
          this.optionsSpec.forEach(option => {
              if (option.type === 'column-break') { // start new column
                  column = createElem('div', 'options-column', list);
              }
              else if (option.type === 'suboptions') {
                  const subOptionsSet = option.subOptionsSet;
                  if (subOptionsSet === undefined)
                      throw new Error('This should not happen!');
                  const subOptionsElement = subOptionsSet.renderIn(column, 'suboptions');
                  option.element = subOptionsElement;
              }
              else { // make list item
                  const li = createElem('li', undefined, column);
                  if (isRealOption(option)) {
                      li.dataset.optionId = option.id;
                  }
                  switch (option.type) {
                      case 'heading':
                          renderHeading(option.title, li);
                          break;
                      case 'int':
                      case 'bool':
                          renderSingleOption(option, li);
                          break;
                      case 'select-inclusive':
                      case 'select-exclusive':
                          this.renderListOption(option, li);
                          break;
                      case 'range':
                          renderRangeOption(option, li);
                          break;
                  }
                  li.addEventListener('change', () => {
                      this.updateStateFromUI(option);
                      this.disableOrEnableAll();
                  });
                  option.element = li;
              }
          });
          element.append(list);
          this.disableOrEnableAll();
          return list;
      }
      /* eslint-disable */
      renderWithTemplate(element) {
          // create appropriate object for mustache
          let options;
          this.optionsSpec.forEach(option => {
              if (isRealOption(option)) {
                  options[option.id] = option;
              }
          });
          const htmlString = this.template;
      }
      /* eslint-enable */
      renderListOption(option, li) {
          li.insertAdjacentHTML('beforeend', option.title + ': ');
          const sublist = createElem('ul', 'options-sublist', li);
          if (option.vertical)
              sublist.classList.add('options-sublist-vertical');
          option.selectOptions.forEach(selectOption => {
              const sublistLi = createElem('li', undefined, sublist);
              const label = createElem('label', undefined, sublistLi);
              const input = document.createElement('input');
              input.type = option.type === 'select-exclusive' ? 'radio' : 'checkbox';
              input.name = this.globalId + '-' + option.id;
              input.value = selectOption.id;
              if (option.type === 'select-inclusive') { // defaults work different for inclusive/exclusive
                  input.checked = option.default.includes(selectOption.id);
              }
              else {
                  input.checked = option.default === selectOption.id;
              }
              label.append(input);
              input.classList.add('option');
              label.insertAdjacentHTML('beforeend', selectOption.title);
          });
      }
  }
  OptionsSet.idCounter = 0; // increment each time to create unique ids to use in ids/names of elements
  /**
   * Renders a heading option
   * @param {string} title The title of the heading
   * @param {HTMLElement} li The element to render into
   */
  function renderHeading(title, li) {
      li.innerHTML = title;
      li.classList.add('options-heading');
  }
  /**
   * Renders single parameter
   * @param {*} option
   * @param {*} li
   */
  function renderSingleOption(option, li) {
      const label = createElem('label', undefined, li);
      if (!option.swapLabel && option.title !== '')
          label.insertAdjacentHTML('beforeend', `${option.title}: `);
      const input = createElem('input', 'option', label);
      switch (option.type) {
          case 'int':
              input.type = 'number';
              input.min = option.min.toString();
              input.max = option.max.toString();
              input.value = option.default.toString();
              break;
          case 'bool':
              input.type = 'checkbox';
              input.checked = option.default;
              break;
          default:
              throw new Error('Typescript is pretty sure I can\'t get here');
      }
      if (option.swapLabel && option.title !== '')
          label.insertAdjacentHTML('beforeend', ` ${option.title}`);
  }
  function renderRangeOption(option, li) {
      const label = createElem('label', undefined, li);
      const inputLB = createElem('input', 'option', label);
      inputLB.type = 'number';
      inputLB.min = option.min.toString();
      inputLB.max = option.max.toString();
      inputLB.value = option.defaultLB.toString();
      label.insertAdjacentHTML('beforeend', ` &leq; ${option.title} &leq; `);
      const inputUB = createElem('input', 'option', label);
      inputUB.type = 'number';
      inputUB.min = option.min.toString();
      inputUB.max = option.max.toString();
      inputUB.value = option.defaultUB.toString();
  }
  /** Determines if an option in OptionsSpec is a real option as opposed to
   * a heading or column break
   */
  function isRealOption(option) {
      return option.id !== undefined;
  }

  class Question {
      constructor() {
          this.DOM = document.createElement('div');
          this.DOM.className = 'question-div';
          this.answered = false;
      }
      getDOM() {
          return this.DOM;
      }
      showAnswer() {
          this.answered = true;
      }
      hideAnswer() {
          this.answered = false;
      }
      toggleAnswer() {
          if (this.answered) {
              this.hideAnswer();
          }
          else {
              this.showAnswer();
          }
      }
      static get commandWord() {
          return '';
      }
  }

  /* global katex */

  class TextQ extends Question {
    constructor (options) {
      super();

      const defaults = {
        difficulty: 5,
        label: 'a'
      };
      const settings = Object.assign({}, defaults, options);

      // store the label for future rendering
      this.label = settings.label;

      // Dummy question generating - subclasses do something substantial here
      this.questionLaTeX = '2+2';
      this.answerLaTeX = '=5';

      // Make the DOM tree for the element
      this.questionp = document.createElement('p');
      this.answerp = document.createElement('p');

      this.questionp.className = 'question';
      this.answerp.className = 'answer';
      this.answerp.classList.add('hidden');

      this.DOM.appendChild(this.questionp);
      this.DOM.appendChild(this.answerp);

      // subclasses should generate questionLaTeX and answerLaTeX,
      // .render() will be called by user
    }

    render () {
      // update the DOM item with questionLaTeX and answerLaTeX
      var qnum = this.label
        ? '\\text{' + this.label + ') }'
        : '';
      katex.render(qnum + this.questionLaTeX, this.questionp, { displayMode: true, strict: 'ignore' });
      katex.render(this.answerLaTeX, this.answerp, { displayMode: true });
    }

    getDOM () {
      return this.DOM
    }

    showAnswer () {
      this.answerp.classList.remove('hidden');
      this.answered = true;
    }

    hideAnswer () {
      this.answerp.classList.add('hidden');
      this.answered = false;
    }
  }

  /* Main question class. This will be spun off into different file and generalised */
  class AlgebraicFractionQ extends TextQ {
    // 'extends' Question, but nothing to actually extend
    constructor (options) {
      super(options);

      const defaults = {
        difficulty: 2
      };

      const settings = Object.assign({}, defaults, options);
      const difficulty = settings.difficulty;

      // logic for generating the question and answer starts here
      var a, b, c, d, e, f; // (ax+b)(ex+f)/(cx+d)(ex+f) = (px^2+qx+r)/(tx^2+ux+v)
      var p, q, r, t, u, v;
      var minCoeff, maxCoeff, minConst, maxConst;

      switch (difficulty) {
        case 1:
          minCoeff = 1; maxCoeff = 1; minConst = 1; maxConst = 6;
          break
        case 2:
          minCoeff = 1; maxCoeff = 1; minConst = -6; maxConst = 6;
          break
        case 3:
          minCoeff = 1; maxCoeff = 3; minConst = -5; maxConst = 5;
          break
        case 4:
        default:
          minCoeff = -3; maxCoeff = 3; minConst = -5; maxConst = 5;
          break
      }

      // Pick some coefficients
      while (
        ((!a && !b) || (!c && !d) || (!e && !f)) || // retry if any expression is 0
        canSimplify(a, b, c, d) // retry if there's a common numerical factor
      ) {
        a = randBetween(minCoeff, maxCoeff);
        c = randBetween(minCoeff, maxCoeff);
        e = randBetween(minCoeff, maxCoeff);
        b = randBetween(minConst, maxConst);
        d = randBetween(minConst, maxConst);
        f = randBetween(minConst, maxConst);
      }

      // if the denominator is negative for each term, then make the numerator negative instead
      if (c <= 0 && d <= 0) {
        c = -c;
        d = -d;
        a = -a;
        b = -b;
      }

      p = a * e; q = a * f + b * e; r = b * f;
      t = c * e; u = c * f + d * e; v = d * f;

      // Now put the question and answer in a nice format into questionLaTeX and answerLaTeX
      const question = `\\frac{${quadraticString(p, q, r)}}{${quadraticString(t, u, v)}}`;
      if (settings.useCommandWord) {
        this.questionLaTeX = '\\text{Simplify} ' + question;
      } else {
        this.questionLaTeX = question;
      }
      this.answerLaTeX =
        (c === 0 && d === 1) ? quadraticString(0, a, b)
          : `\\frac{${quadraticString(0, a, b)}}{${quadraticString(0, c, d)}}`;

      this.answerLaTeX = '= ' + this.answerLaTeX;
    }

    static get commandWord () {
      return 'Simplify'
    }
  }

  /* Utility functions
   * At some point, I'll move some of these into a general utilities module
   * but this will do for now
   */

  // TODO I have quadraticString here and also a Polynomial class. What is being replicated?§
  function quadraticString (a, b, c) {
    if (a === 0 && b === 0 && c === 0) return '0'

    var x2string =
      a === 0 ? ''
        : a === 1 ? 'x^2'
          : a === -1 ? '-x^2'
            : a + 'x^2';

    var xsign =
      b < 0 ? '-'
        : (a === 0 || b === 0) ? ''
          : '+';

    var xstring =
      b === 0 ? ''
        : (b === 1 || b === -1) ? 'x'
          : Math.abs(b) + 'x';

    var constsign =
      c < 0 ? '-'
        : ((a === 0 && b === 0) || c === 0) ? ''
          : '+';

    var conststring =
      c === 0 ? '' : Math.abs(c);

    return x2string + xsign + xstring + constsign + conststring
  }

  function canSimplify (a1, b1, a2, b2) {
    // can (a1x+b1)/(a2x+b2) be simplified?
    //
    // First, take out gcd, and write as c1(a1x+b1) etc

    var c1 = gcd(a1, b1);
    a1 = a1 / c1;
    b1 = b1 / c1;

    var c2 = gcd(a2, b2);
    a2 = a2 / c2;
    b2 = b2 / c2;

    var result = false;

    if (gcd(c1, c2) > 1 || (a1 === a2 && b1 === b2)) {
      result = true;
    }

    return result
  }

  class IntegerAddQ extends TextQ {
    constructor (options) {
      super(options);

      const defaults = {
        difficulty: 5,
        label: 'a'
      };
      const settings = Object.assign({}, defaults, options);

      this.label = settings.label;

      // This is just a demo question type for now, so not processing difficulty
      const a = randBetween(10, 1000);
      const b = randBetween(10, 1000);
      const sum = a + b;

      this.questionLaTeX = a + ' + ' + b;
      this.answerLaTeX = '= ' + sum;

      this.render();
    }

    static get commandWord () {
      return 'Evaluate'
    }
  }

  class GraphicQView {
      constructor(data, viewOptions) {
          var _a, _b;
          viewOptions.width = (_a = viewOptions.width) !== null && _a !== void 0 ? _a : 300;
          viewOptions.height = (_b = viewOptions.height) !== null && _b !== void 0 ? _b : 300;
          this.width = viewOptions.width;
          this.height = viewOptions.height; // only things I need from the options, generally?
          this.data = data;
          this.rotation = viewOptions.rotation;
          this.labels = []; // labels on diagram
          // DOM elements
          this.DOM = createElem('div', 'question-div');
          this.canvas = createElem('canvas', 'question-canvas', this.DOM);
          this.canvas.width = this.width;
          this.canvas.height = this.height;
      }
      getDOM() {
          return this.DOM;
      }
      renderLabels(nudge, repel = true) {
          const container = this.DOM;
          // remove any existing labels
          const oldLabels = container.getElementsByClassName('label');
          while (oldLabels.length > 0) {
              oldLabels[0].remove();
          }
          this.labels.forEach(l => {
              const label = document.createElement('div');
              const innerlabel = document.createElement('div');
              label.classList.add('label');
              label.className += ' ' + l.style; // using className over classList since l.style is space-delimited list of classes
              label.style.left = l.pos.x + 'px';
              label.style.top = l.pos.y + 'px';
              katex.render(l.text, innerlabel);
              label.appendChild(innerlabel);
              container.appendChild(label);
              // remove space if the inner label is too big
              if (innerlabel.offsetWidth / innerlabel.offsetHeight > 2) {
                  //console.log(`removed space in ${l.text}`)
                  const newlabeltext = l.text.replace(/\+/, '\\!+\\!').replace(/-/, '\\!-\\!');
                  katex.render(newlabeltext, innerlabel);
              }
              // I don't understand this adjustment. I think it might be needed in arithmagons, but it makes
              // others go funny.
              if (nudge) {
                  const lwidth = label.offsetWidth;
                  if (l.pos.x < this.canvas.width / 2 - 5 && l.pos.x + lwidth / 2 > this.canvas.width / 2) {
                      label.style.left = (this.canvas.width / 2 - lwidth - 3) + 'px';
                      console.log(`nudged '${l.text}'`);
                  }
                  if (l.pos.x > this.canvas.width / 2 + 5 && l.pos.x - lwidth / 2 < this.canvas.width / 2) {
                      label.style.left = (this.canvas.width / 2 + 3) + 'px';
                      console.log(`nudged '${l.text}'`);
                  }
              }
          });
          //repel if given
          if (repel) {
              const labelElements = [...this.DOM.getElementsByClassName('label')];
              for (let i = 0; i < labelElements.length; i++) {
                  for (let j = i + 1; j < labelElements.length; j++) {
                      repelElements(labelElements[i], labelElements[j]);
                  }
              }
          }
      }
      showAnswer() {
          this.labels.forEach(l => {
              l.text = l.texta;
              l.style = l.stylea;
          });
          this.renderLabels(false);
      }
      hideAnswer() {
          this.labels.forEach(l => {
              l.text = l.textq;
              l.style = l.styleq;
          });
          this.renderLabels(false);
      }
      // Point tranformations of all points
      get allpoints() {
          return [];
      }
      scale(sf) {
          this.allpoints.forEach(function (p) {
              p.scale(sf);
          });
      }
      rotate(angle) {
          this.allpoints.forEach(function (p) {
              p.rotate(angle);
          });
          return angle;
      }
      translate(x, y) {
          this.allpoints.forEach(function (p) {
              p.translate(x, y);
          });
      }
      randomRotate() {
          const angle = 2 * Math.PI * Math.random();
          this.rotate(angle);
          return angle;
      }
      /**
       * Scales all the points to within a given width and height, centering the result. Returns the scale factor
       * @param width The width of the bounding rectangle to scale to
       * @param height The height of the bounding rectangle to scale to
       * @param margin Margin to leave outside the rectangle
       * @returns
       */
      scaleToFit(width, height, margin) {
          let topLeft = Point.min(this.allpoints);
          let bottomRight = Point.max(this.allpoints);
          const totalWidth = bottomRight.x - topLeft.x;
          const totalHeight = bottomRight.y - topLeft.y;
          const sf = Math.min((width - margin) / totalWidth, (height - margin) / totalHeight);
          this.scale(sf);
          // centre
          topLeft = Point.min(this.allpoints);
          bottomRight = Point.max(this.allpoints);
          const center = Point.mean(topLeft, bottomRight);
          this.translate(width / 2 - center.x, height / 2 - center.y); // centre
          return sf;
      }
  }
  class GraphicQ extends Question {
      constructor(data, view) {
          super(); // this.answered = false
          this.data = data;
          this.view = view;
          this.DOM = this.view.DOM;
          /* These are guaranteed to be overridden, so no point initializing here
           *
           *  this.data = new GraphicQData(options)
           *  this.view = new GraphicQView(this.data, options)
           *
           */
      }
      /* Need to refactor subclasses to do this:
       * constructor (data, view) {
       *    this.data = data
       *    this.view = view
       * }
       *
       * static random(options) {
       *  // an attempt at having abstract static methods, albeit runtime error
       *  throw new Error("`random()` must be overridden in subclass " + this.name)
       * }
       *
       * typical implementation:
       * static random(options) {
       *  const data = new DerivedQData(options)
       *  const view = new DerivedQView(options)
       *  return new DerivedQData(data,view)
       * }
       *
       */
      getDOM() { return this.view.getDOM(); }
      render() { this.view.render(); }
      showAnswer() {
          super.showAnswer();
          this.view.showAnswer();
      }
      hideAnswer() {
          super.hideAnswer();
          this.view.hideAnswer();
      }
  }

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function getDefaultExportFromCjs (x) {
  	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
  }

  function createCommonjsModule(fn, basedir, module) {
  	return module = {
  	  path: basedir,
  	  exports: {},
  	  require: function (path, base) {
        return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
      }
  	}, fn(module, module.exports), module.exports;
  }

  function commonjsRequire () {
  	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
  }

  var fraction = createCommonjsModule(function (module, exports) {
  /**
   * @license Fraction.js v4.0.12 09/09/2015
   * http://www.xarg.org/2014/03/rational-numbers-in-javascript/
   *
   * Copyright (c) 2015, Robert Eisele (robert@xarg.org)
   * Dual licensed under the MIT or GPL Version 2 licenses.
   **/


  /**
   *
   * This class offers the possibility to calculate fractions.
   * You can pass a fraction in different formats. Either as array, as double, as string or as an integer.
   *
   * Array/Object form
   * [ 0 => <nominator>, 1 => <denominator> ]
   * [ n => <nominator>, d => <denominator> ]
   *
   * Integer form
   * - Single integer value
   *
   * Double form
   * - Single double value
   *
   * String form
   * 123.456 - a simple double
   * 123/456 - a string fraction
   * 123.'456' - a double with repeating decimal places
   * 123.(456) - synonym
   * 123.45'6' - a double with repeating last place
   * 123.45(6) - synonym
   *
   * Example:
   *
   * var f = new Fraction("9.4'31'");
   * f.mul([-4, 3]).div(4.9);
   *
   */

  (function(root) {

    // Maximum search depth for cyclic rational numbers. 2000 should be more than enough.
    // Example: 1/7 = 0.(142857) has 6 repeating decimal places.
    // If MAX_CYCLE_LEN gets reduced, long cycles will not be detected and toString() only gets the first 10 digits
    var MAX_CYCLE_LEN = 2000;

    // Parsed data to avoid calling "new" all the time
    var P = {
      "s": 1,
      "n": 0,
      "d": 1
    };

    function createError(name) {

      function errorConstructor() {
        var temp = Error.apply(this, arguments);
        temp['name'] = this['name'] = name;
        this['stack'] = temp['stack'];
        this['message'] = temp['message'];
      }

      /**
       * Error constructor
       *
       * @constructor
       */
      function IntermediateInheritor() {}
      IntermediateInheritor.prototype = Error.prototype;
      errorConstructor.prototype = new IntermediateInheritor();

      return errorConstructor;
    }

    var DivisionByZero = Fraction['DivisionByZero'] = createError('DivisionByZero');
    var InvalidParameter = Fraction['InvalidParameter'] = createError('InvalidParameter');

    function assign(n, s) {

      if (isNaN(n = parseInt(n, 10))) {
        throwInvalidParam();
      }
      return n * s;
    }

    function throwInvalidParam() {
      throw new InvalidParameter();
    }

    var parse = function(p1, p2) {

      var n = 0, d = 1, s = 1;
      var v = 0, w = 0, x = 0, y = 1, z = 1;

      var A = 0, B = 1;
      var C = 1, D = 1;

      var N = 10000000;
      var M;

      if (p1 === undefined || p1 === null) ; else if (p2 !== undefined) {
        n = p1;
        d = p2;
        s = n * d;
      } else
        switch (typeof p1) {

          case "object":
          {
            if ("d" in p1 && "n" in p1) {
              n = p1["n"];
              d = p1["d"];
              if ("s" in p1)
                n *= p1["s"];
            } else if (0 in p1) {
              n = p1[0];
              if (1 in p1)
                d = p1[1];
            } else {
              throwInvalidParam();
            }
            s = n * d;
            break;
          }
          case "number":
          {
            if (p1 < 0) {
              s = p1;
              p1 = -p1;
            }

            if (p1 % 1 === 0) {
              n = p1;
            } else if (p1 > 0) { // check for != 0, scale would become NaN (log(0)), which converges really slow

              if (p1 >= 1) {
                z = Math.pow(10, Math.floor(1 + Math.log(p1) / Math.LN10));
                p1 /= z;
              }

              // Using Farey Sequences
              // http://www.johndcook.com/blog/2010/10/20/best-rational-approximation/

              while (B <= N && D <= N) {
                M = (A + C) / (B + D);

                if (p1 === M) {
                  if (B + D <= N) {
                    n = A + C;
                    d = B + D;
                  } else if (D > B) {
                    n = C;
                    d = D;
                  } else {
                    n = A;
                    d = B;
                  }
                  break;

                } else {

                  if (p1 > M) {
                    A += C;
                    B += D;
                  } else {
                    C += A;
                    D += B;
                  }

                  if (B > N) {
                    n = C;
                    d = D;
                  } else {
                    n = A;
                    d = B;
                  }
                }
              }
              n *= z;
            } else if (isNaN(p1) || isNaN(p2)) {
              d = n = NaN;
            }
            break;
          }
          case "string":
          {
            B = p1.match(/\d+|./g);

            if (B === null)
              throwInvalidParam();

            if (B[A] === '-') {// Check for minus sign at the beginning
              s = -1;
              A++;
            } else if (B[A] === '+') {// Check for plus sign at the beginning
              A++;
            }

            if (B.length === A + 1) { // Check if it's just a simple number "1234"
              w = assign(B[A++], s);
            } else if (B[A + 1] === '.' || B[A] === '.') { // Check if it's a decimal number

              if (B[A] !== '.') { // Handle 0.5 and .5
                v = assign(B[A++], s);
              }
              A++;

              // Check for decimal places
              if (A + 1 === B.length || B[A + 1] === '(' && B[A + 3] === ')' || B[A + 1] === "'" && B[A + 3] === "'") {
                w = assign(B[A], s);
                y = Math.pow(10, B[A].length);
                A++;
              }

              // Check for repeating places
              if (B[A] === '(' && B[A + 2] === ')' || B[A] === "'" && B[A + 2] === "'") {
                x = assign(B[A + 1], s);
                z = Math.pow(10, B[A + 1].length) - 1;
                A += 3;
              }

            } else if (B[A + 1] === '/' || B[A + 1] === ':') { // Check for a simple fraction "123/456" or "123:456"
              w = assign(B[A], s);
              y = assign(B[A + 2], 1);
              A += 3;
            } else if (B[A + 3] === '/' && B[A + 1] === ' ') { // Check for a complex fraction "123 1/2"
              v = assign(B[A], s);
              w = assign(B[A + 2], s);
              y = assign(B[A + 4], 1);
              A += 5;
            }

            if (B.length <= A) { // Check for more tokens on the stack
              d = y * z;
              s = /* void */
                      n = x + d * v + z * w;
              break;
            }

            /* Fall through on error */
          }
          default:
            throwInvalidParam();
        }

      if (d === 0) {
        throw new DivisionByZero();
      }

      P["s"] = s < 0 ? -1 : 1;
      P["n"] = Math.abs(n);
      P["d"] = Math.abs(d);
    };

    function modpow(b, e, m) {

      var r = 1;
      for (; e > 0; b = (b * b) % m, e >>= 1) {

        if (e & 1) {
          r = (r * b) % m;
        }
      }
      return r;
    }


    function cycleLen(n, d) {

      for (; d % 2 === 0;
              d /= 2) {
      }

      for (; d % 5 === 0;
              d /= 5) {
      }

      if (d === 1) // Catch non-cyclic numbers
        return 0;

      // If we would like to compute really large numbers quicker, we could make use of Fermat's little theorem:
      // 10^(d-1) % d == 1
      // However, we don't need such large numbers and MAX_CYCLE_LEN should be the capstone,
      // as we want to translate the numbers to strings.

      var rem = 10 % d;
      var t = 1;

      for (; rem !== 1; t++) {
        rem = rem * 10 % d;

        if (t > MAX_CYCLE_LEN)
          return 0; // Returning 0 here means that we don't print it as a cyclic number. It's likely that the answer is `d-1`
      }
      return t;
    }


       function cycleStart(n, d, len) {

      var rem1 = 1;
      var rem2 = modpow(10, len, d);

      for (var t = 0; t < 300; t++) { // s < ~log10(Number.MAX_VALUE)
        // Solve 10^s == 10^(s+t) (mod d)

        if (rem1 === rem2)
          return t;

        rem1 = rem1 * 10 % d;
        rem2 = rem2 * 10 % d;
      }
      return 0;
    }

    function gcd(a, b) {

      if (!a)
        return b;
      if (!b)
        return a;

      while (1) {
        a %= b;
        if (!a)
          return b;
        b %= a;
        if (!b)
          return a;
      }
    }
    /**
     * Module constructor
     *
     * @constructor
     * @param {number|Fraction=} a
     * @param {number=} b
     */
    function Fraction(a, b) {

      if (!(this instanceof Fraction)) {
        return new Fraction(a, b);
      }

      parse(a, b);

      if (Fraction['REDUCE']) {
        a = gcd(P["d"], P["n"]); // Abuse a
      } else {
        a = 1;
      }

      this["s"] = P["s"];
      this["n"] = P["n"] / a;
      this["d"] = P["d"] / a;
    }

    /**
     * Boolean global variable to be able to disable automatic reduction of the fraction
     *
     */
    Fraction['REDUCE'] = 1;

    Fraction.prototype = {

      "s": 1,
      "n": 0,
      "d": 1,

      /**
       * Calculates the absolute value
       *
       * Ex: new Fraction(-4).abs() => 4
       **/
      "abs": function() {

        return new Fraction(this["n"], this["d"]);
      },

      /**
       * Inverts the sign of the current fraction
       *
       * Ex: new Fraction(-4).neg() => 4
       **/
      "neg": function() {

        return new Fraction(-this["s"] * this["n"], this["d"]);
      },

      /**
       * Adds two rational numbers
       *
       * Ex: new Fraction({n: 2, d: 3}).add("14.9") => 467 / 30
       **/
      "add": function(a, b) {

        parse(a, b);
        return new Fraction(
                this["s"] * this["n"] * P["d"] + P["s"] * this["d"] * P["n"],
                this["d"] * P["d"]
                );
      },

      /**
       * Subtracts two rational numbers
       *
       * Ex: new Fraction({n: 2, d: 3}).add("14.9") => -427 / 30
       **/
      "sub": function(a, b) {

        parse(a, b);
        return new Fraction(
                this["s"] * this["n"] * P["d"] - P["s"] * this["d"] * P["n"],
                this["d"] * P["d"]
                );
      },

      /**
       * Multiplies two rational numbers
       *
       * Ex: new Fraction("-17.(345)").mul(3) => 5776 / 111
       **/
      "mul": function(a, b) {

        parse(a, b);
        return new Fraction(
                this["s"] * P["s"] * this["n"] * P["n"],
                this["d"] * P["d"]
                );
      },

      /**
       * Divides two rational numbers
       *
       * Ex: new Fraction("-17.(345)").inverse().div(3)
       **/
      "div": function(a, b) {

        parse(a, b);
        return new Fraction(
                this["s"] * P["s"] * this["n"] * P["d"],
                this["d"] * P["n"]
                );
      },

      /**
       * Clones the actual object
       *
       * Ex: new Fraction("-17.(345)").clone()
       **/
      "clone": function() {
        return new Fraction(this);
      },

      /**
       * Calculates the modulo of two rational numbers - a more precise fmod
       *
       * Ex: new Fraction('4.(3)').mod([7, 8]) => (13/3) % (7/8) = (5/6)
       **/
      "mod": function(a, b) {

        if (isNaN(this['n']) || isNaN(this['d'])) {
          return new Fraction(NaN);
        }

        if (a === undefined) {
          return new Fraction(this["s"] * this["n"] % this["d"], 1);
        }

        parse(a, b);
        if (0 === P["n"] && 0 === this["d"]) {
          Fraction(0, 0); // Throw DivisionByZero
        }

        /*
         * First silly attempt, kinda slow
         *
         return that["sub"]({
         "n": num["n"] * Math.floor((this.n / this.d) / (num.n / num.d)),
         "d": num["d"],
         "s": this["s"]
         });*/

        /*
         * New attempt: a1 / b1 = a2 / b2 * q + r
         * => b2 * a1 = a2 * b1 * q + b1 * b2 * r
         * => (b2 * a1 % a2 * b1) / (b1 * b2)
         */
        return new Fraction(
                this["s"] * (P["d"] * this["n"]) % (P["n"] * this["d"]),
                P["d"] * this["d"]
                );
      },

      /**
       * Calculates the fractional gcd of two rational numbers
       *
       * Ex: new Fraction(5,8).gcd(3,7) => 1/56
       */
      "gcd": function(a, b) {

        parse(a, b);

        // gcd(a / b, c / d) = gcd(a, c) / lcm(b, d)

        return new Fraction(gcd(P["n"], this["n"]) * gcd(P["d"], this["d"]), P["d"] * this["d"]);
      },

      /**
       * Calculates the fractional lcm of two rational numbers
       *
       * Ex: new Fraction(5,8).lcm(3,7) => 15
       */
      "lcm": function(a, b) {

        parse(a, b);

        // lcm(a / b, c / d) = lcm(a, c) / gcd(b, d)

        if (P["n"] === 0 && this["n"] === 0) {
          return new Fraction;
        }
        return new Fraction(P["n"] * this["n"], gcd(P["n"], this["n"]) * gcd(P["d"], this["d"]));
      },

      /**
       * Calculates the ceil of a rational number
       *
       * Ex: new Fraction('4.(3)').ceil() => (5 / 1)
       **/
      "ceil": function(places) {

        places = Math.pow(10, places || 0);

        if (isNaN(this["n"]) || isNaN(this["d"])) {
          return new Fraction(NaN);
        }
        return new Fraction(Math.ceil(places * this["s"] * this["n"] / this["d"]), places);
      },

      /**
       * Calculates the floor of a rational number
       *
       * Ex: new Fraction('4.(3)').floor() => (4 / 1)
       **/
      "floor": function(places) {

        places = Math.pow(10, places || 0);

        if (isNaN(this["n"]) || isNaN(this["d"])) {
          return new Fraction(NaN);
        }
        return new Fraction(Math.floor(places * this["s"] * this["n"] / this["d"]), places);
      },

      /**
       * Rounds a rational numbers
       *
       * Ex: new Fraction('4.(3)').round() => (4 / 1)
       **/
      "round": function(places) {

        places = Math.pow(10, places || 0);

        if (isNaN(this["n"]) || isNaN(this["d"])) {
          return new Fraction(NaN);
        }
        return new Fraction(Math.round(places * this["s"] * this["n"] / this["d"]), places);
      },

      /**
       * Gets the inverse of the fraction, means numerator and denumerator are exchanged
       *
       * Ex: new Fraction([-3, 4]).inverse() => -4 / 3
       **/
      "inverse": function() {

        return new Fraction(this["s"] * this["d"], this["n"]);
      },

      /**
       * Calculates the fraction to some integer exponent
       *
       * Ex: new Fraction(-1,2).pow(-3) => -8
       */
      "pow": function(m) {

        if (m < 0) {
          return new Fraction(Math.pow(this['s'] * this["d"], -m), Math.pow(this["n"], -m));
        } else {
          return new Fraction(Math.pow(this['s'] * this["n"], m), Math.pow(this["d"], m));
        }
      },

      /**
       * Check if two rational numbers are the same
       *
       * Ex: new Fraction(19.6).equals([98, 5]);
       **/
      "equals": function(a, b) {

        parse(a, b);
        return this["s"] * this["n"] * P["d"] === P["s"] * P["n"] * this["d"]; // Same as compare() === 0
      },

      /**
       * Check if two rational numbers are the same
       *
       * Ex: new Fraction(19.6).equals([98, 5]);
       **/
      "compare": function(a, b) {

        parse(a, b);
        var t = (this["s"] * this["n"] * P["d"] - P["s"] * P["n"] * this["d"]);
        return (0 < t) - (t < 0);
      },

      "simplify": function(eps) {

        // First naive implementation, needs improvement

        if (isNaN(this['n']) || isNaN(this['d'])) {
          return this;
        }

        var cont = this['abs']()['toContinued']();

        eps = eps || 0.001;

        function rec(a) {
          if (a.length === 1)
            return new Fraction(a[0]);
          return rec(a.slice(1))['inverse']()['add'](a[0]);
        }

        for (var i = 0; i < cont.length; i++) {
          var tmp = rec(cont.slice(0, i + 1));
          if (tmp['sub'](this['abs']())['abs']().valueOf() < eps) {
            return tmp['mul'](this['s']);
          }
        }
        return this;
      },

      /**
       * Check if two rational numbers are divisible
       *
       * Ex: new Fraction(19.6).divisible(1.5);
       */
      "divisible": function(a, b) {

        parse(a, b);
        return !(!(P["n"] * this["d"]) || ((this["n"] * P["d"]) % (P["n"] * this["d"])));
      },

      /**
       * Returns a decimal representation of the fraction
       *
       * Ex: new Fraction("100.'91823'").valueOf() => 100.91823918239183
       **/
      'valueOf': function() {

        return this["s"] * this["n"] / this["d"];
      },

      /**
       * Returns a string-fraction representation of a Fraction object
       *
       * Ex: new Fraction("1.'3'").toFraction() => "4 1/3"
       **/
      'toFraction': function(excludeWhole) {

        var whole, str = "";
        var n = this["n"];
        var d = this["d"];
        if (this["s"] < 0) {
          str += '-';
        }

        if (d === 1) {
          str += n;
        } else {

          if (excludeWhole && (whole = Math.floor(n / d)) > 0) {
            str += whole;
            str += " ";
            n %= d;
          }

          str += n;
          str += '/';
          str += d;
        }
        return str;
      },

      /**
       * Returns a latex representation of a Fraction object
       *
       * Ex: new Fraction("1.'3'").toLatex() => "\frac{4}{3}"
       **/
      'toLatex': function(excludeWhole) {

        var whole, str = "";
        var n = this["n"];
        var d = this["d"];
        if (this["s"] < 0) {
          str += '-';
        }

        if (d === 1) {
          str += n;
        } else {

          if (excludeWhole && (whole = Math.floor(n / d)) > 0) {
            str += whole;
            n %= d;
          }

          str += "\\frac{";
          str += n;
          str += '}{';
          str += d;
          str += '}';
        }
        return str;
      },

      /**
       * Returns an array of continued fraction elements
       *
       * Ex: new Fraction("7/8").toContinued() => [0,1,7]
       */
      'toContinued': function() {

        var t;
        var a = this['n'];
        var b = this['d'];
        var res = [];

        if (isNaN(this['n']) || isNaN(this['d'])) {
          return res;
        }

        do {
          res.push(Math.floor(a / b));
          t = a % b;
          a = b;
          b = t;
        } while (a !== 1);

        return res;
      },

      /**
       * Creates a string representation of a fraction with all digits
       *
       * Ex: new Fraction("100.'91823'").toString() => "100.(91823)"
       **/
      'toString': function(dec) {

        var g;
        var N = this["n"];
        var D = this["d"];

        if (isNaN(N) || isNaN(D)) {
          return "NaN";
        }

        if (!Fraction['REDUCE']) {
          g = gcd(N, D);
          N /= g;
          D /= g;
        }

        dec = dec || 15; // 15 = decimal places when no repitation

        var cycLen = cycleLen(N, D); // Cycle length
        var cycOff = cycleStart(N, D, cycLen); // Cycle start

        var str = this['s'] === -1 ? "-" : "";

        str += N / D | 0;

        N %= D;
        N *= 10;

        if (N)
          str += ".";

        if (cycLen) {

          for (var i = cycOff; i--; ) {
            str += N / D | 0;
            N %= D;
            N *= 10;
          }
          str += "(";
          for (var i = cycLen; i--; ) {
            str += N / D | 0;
            N %= D;
            N *= 10;
          }
          str += ")";
        } else {
          for (var i = dec; N && i--; ) {
            str += N / D | 0;
            N %= D;
            N *= 10;
          }
        }
        return str;
      }
    };

    {
      Object.defineProperty(exports, "__esModule", {'value': true});
      Fraction['default'] = Fraction;
      Fraction['Fraction'] = Fraction;
      module['exports'] = Fraction;
    }

  })();
  });

  var fraction$1 = /*@__PURE__*/getDefaultExportFromCjs(fraction);

  class Monomial {
    constructor (c, vs) {
      if (!isNaN(c) && vs instanceof Map) {
        this.c = c;
        this.vs = vs;
      } else if (typeof c === 'string') {
        this.initStr(c);
      } else if (!isNaN(c)) {
        this.c = c;
        this.vs = new Map();
      } else { // default as a test: 4x^2y
        this.c = 4;
        this.vs = new Map([['x', 2], ['y', 1]]);
      }
    }

    clone () {
      const vs = new Map(this.vs);
      return new Monomial(this.c, vs)
    }

    mul (that) {
      if (!(that instanceof Monomial)) {
        that = new Monomial(that);
      }
      const c = this.c * that.c;
      let vs = new Map();
      this.vs.forEach((index, variable) => {
        if (that.vs.has(variable)) {
          vs.set(variable, this.vs.get(variable) + that.vs.get(variable));
        } else {
          vs.set(variable, this.vs.get(variable));
        }
      });

      that.vs.forEach((index, variable) => {
        if (!vs.has(variable)) {
          vs.set(variable, that.vs.get(variable));
        }
      });
      vs = new Map([...vs.entries()].sort());
      return new Monomial(c, vs)
    }

    toLatex () {
      if (this.vs.size === 0) return this.c.toString()
      let str = this.c === 1 ? ''
        : this.c === -1 ? '-'
          : this.c.toString();
      this.vs.forEach((index, variable) => {
        if (index === 1) {
          str += variable;
        } else {
          str += variable + '^' + index;
        }
      });
      return str
    }

    sort () {
      // sorts (modifies object)
      this.vs = new Map([...this.vs.entries()].sort());
    }

    cleanZeros () {
      this.vs.forEach((idx, v) => {
        if (idx === 0) this.vs.delete(v);
      });
    }

    like (that) {
      // return true if like terms, false if otherwise
      // not the most efficient at the moment, but good enough.
      if (!(that instanceof Monomial)) {
        that = new Monomial(that);
      }

      let like = true;
      this.vs.forEach((index, variable) => {
        if (!that.vs.has(variable) || that.vs.get(variable) !== index) {
          like = false;
        }
      });
      that.vs.forEach((index, variable) => {
        if (!this.vs.has(variable) || this.vs.get(variable) !== index) {
          like = false;
        }
      });
      return like
    }

    add (that, checkLike) {
      if (!(that instanceof Monomial)) {
        that = new Monomial(that);
      }
      // adds two compatible monomials
      // checkLike (default true) will check first if they are like and throw an exception
      // undefined behaviour if checkLike is false
      if (checkLike === undefined) checkLike = true;
      if (checkLike && !this.like(that)) throw new Error('Adding unlike terms')
      const c = this.c + that.c;
      const vs = this.vs;
      return new Monomial(c, vs)
    }

    initStr (str) {
      // currently no error checking and fragile
      // Things not to pass in:
      //  zero indices
      //  multi-character variables
      //  negative indices
      //  non-integer coefficients
      const lead = str.match(/^-?\d*/)[0];
      const c = lead === '' ? 1
        : lead === '-' ? -1
          : parseInt(lead);
      let vs = str.match(/([a-zA-Z])(\^\d+)?/g);
      if (!vs) vs = [];
      for (let i = 0; i < vs.length; i++) {
        const v = vs[i].split('^');
        v[1] = v[1] ? parseInt(v[1]) : 1;
        vs[i] = v;
      }
      vs = vs.filter(v => v[1] !== 0);
      this.c = c;
      this.vs = new Map(vs);
    }

    static var (v) {
      // factory for a single variable monomial
      const c = 1;
      const vs = new Map([[v, 1]]);
      return new Monomial(c, vs)
    }
  }

  class Polynomial {
    constructor (terms) {
      if (Array.isArray(terms) && (terms[0] instanceof Monomial)) {
        terms.map(t => t.clone());
        this.terms = terms;
      } else if (!isNaN(terms)) {
        this.initNum(terms);
      } else if (typeof terms === 'string') {
        this.initStr(terms);
      }
    }

    initStr (str) {
      str = str.replace(/\+-/g, '-'); // a horrible bodge
      str = str.replace(/-/g, '+-'); // make negative terms explicit.
      str = str.replace(/\s/g, ''); // strip whitespace
      this.terms = str.split('+')
        .map(s => new Monomial(s))
        .filter(t => t.c !== 0);
    }

    initNum (n) {
      this.terms = [new Monomial(n)];
    }

    toLatex () {
      let str = '';
      for (let i = 0; i < this.terms.length; i++) {
        if (i > 0 && this.terms[i].c >= 0) {
          str += '+';
        }
        str += this.terms[i].toLatex();
      }
      return str
    }

    toString () {
      return this.toLaTeX()
    }

    clone () {
      const terms = this.terms.map(t => t.clone());
      return new Polynomial(terms)
    }

    simplify () {
      // collects like terms and removes zero terms
      // does not modify original
      // This seems probably inefficient, given the data structure
      // Would be better to use something like a linked list maybe?
      const terms = this.terms.slice();
      let newterms = [];
      for (let i = 0; i < terms.length; i++) {
        if (!terms[i]) continue
        let newterm = terms[i];
        for (let j = i + 1; j < terms.length; j++) {
          if (!terms[j]) continue
          if (terms[j].like(terms[i])) {
            newterm = newterm.add(terms[j]);
            terms[j] = null;
          }
        }
        newterms.push(newterm);
        terms[i] = null;
      }
      newterms = newterms.filter(t => t.c !== 0);
      return new Polynomial(newterms)
    }

    add (that, simplify) {
      if (!(that instanceof Polynomial)) {
        that = new Polynomial(that);
      }
      if (simplify === undefined) simplify = true;
      const terms = this.terms.concat(that.terms);
      let result = new Polynomial(terms);

      if (simplify) result = result.simplify();

      return result
    }

    mul (that, simplify) {
      if (!(that instanceof Polynomial)) {
        that = new Polynomial(that);
      }
      const terms = [];
      if (simplify === undefined) simplify = true;
      for (let i = 0; i < this.terms.length; i++) {
        for (let j = 0; j < that.terms.length; j++) {
          terms.push(this.terms[i].mul(that.terms[j]));
        }
      }

      let result = new Polynomial(terms);
      if (simplify) result = result.simplify();

      return result
    }

    pow (n, simplify) {
      let result = this;
      for (let i = 1; i < n; i++) {
        result = result.mul(this);
      }
      if (simplify) result = result.simplify();
      return result
    }

    static var (v) {
      // factory for a single variable polynomial
      const terms = [Monomial.var(v)];
      return new Polynomial(terms)
    }

    static x () {
      return Polynomial.var('x')
    }

    static const (n) {
      return new Polynomial(n)
    }
  }

  class ArithmagonQ extends GraphicQ {
    constructor (options) {
      const data = new ArithmagonQData(options);
      const view = new ArithmagonQView(data, options);
      super(data, view);
    }

    static get commandWord () { return 'Complete the arithmagon:' }
  }

  ArithmagonQ.optionsSpec = [
    {
      title: 'Vertices',
      id: 'n',
      type: 'int',
      min: 3,
      max: 20,
      default: 3
    },
    {
      title: 'Type',
      id: 'type',
      type: 'select-exclusive',
      selectOptions: [
        { title: 'Integer (+)', id: 'integer-add' },
        { title: 'Integer (\u00d7)', id: 'integer-multiply' },
        { title: 'Fraction (+)', id: 'fraction-add' },
        { title: 'Fraction (\u00d7)', id: 'fraction-multiply' },
        { title: 'Algebra (+)', id: 'algebra-add' },
        { title: 'Algebra (\u00d7)', id: 'algebra-multiply' }
      ],
      default: 'integer-add',
      vertical: true
    },
    {
      title: 'Puzzle type',
      type: 'select-exclusive',
      id: 'puz_diff',
      selectOptions: [
        { title: 'Missing edges', id: '1' },
        { title: 'Mixed', id: '2' },
        { title: 'Missing vertices', id: '3' }
      ],
      default: '1'
    }
  ];

  class ArithmagonQData /* extends GraphicQData */ {
    // TODO simplify constructor. Move logic into static factory methods
    constructor (options) {
      // 1. Set properties from options
      const defaults = {
        n: 3, // number of vertices
        min: -20,
        max: 20,
        num_diff: 1, // complexity of what's in vertices/edges
        puz_diff: 1, // 1 - Vertices given, 2 - vertices/edges; given 3 - only edges
        type: 'integer-add' // [type]-[operation] where [type] = integer, ...
        // and [operation] = add/multiply
      };

      this.settings = Object.assign({}, defaults, this.settings, options);
      this.settings.num_diff = this.settings.difficulty;
      this.settings.puz_diff = parseInt(this.settings.puz_diff); //! ? This should have been done upstream...

      this.n = this.settings.n;
      this.vertices = [];
      this.sides = [];

      if (this.settings.type.endsWith('add')) {
        this.opname = '+';
        this.op = (x, y) => x.add(y);
      } else if (this.settings.type.endsWith('multiply')) {
        this.opname = '\u00d7';
        this.op = (x, y) => x.mul(y);
      }

      // 2. Initialise based on type
      switch (this.settings.type) {
        case 'integer-add':
        case 'integer-multiply':
          this.initInteger(this.settings);
          break
        case 'fraction-add':
          this.initFractionAdd(this.settings);
          break
        case 'fraction-multiply':
          this.initFractionMultiply(this.settings);
          break
        case 'algebra-add':
          this.initAlgebraAdd(this.settings);
          break
        case 'algebra-multiply':
          this.initAlgebraMultiply(this.settings);
          break
        default:
          throw new Error('Unexpected switch default')
      }

      this.calculateEdges(); // Use op functions to fill in the edges
      this.hideLabels(this.settings.puz_diff); // set some vertices/edges as hidden depending on difficulty
    }

    /* Methods initialising vertices */

    initInteger (settings) {
      for (let i = 0; i < this.n; i++) {
        this.vertices[i] = {
          val: new fraction$1(randBetweenFilter(
            settings.min,
            settings.max,
            x => (settings.type.endsWith('add') || x !== 0)
          )),
          hidden: false
        };
      }
    }

    initFractionAdd (settings) {
      /* Difficulty settings:
       * 1: proper fractions with same denominator, no cancelling after DONE
       * 2: proper fractions with same denominator, no cancellling answer improper fraction
       * 3: proper fractions with one denominator a multiple of another, gives proper fraction
       * 4: proper fractions with one denominator a multiple of another, gives improper fraction
       * 5: proper fractions with different denominators (not co-prime), gives improper fraction
       * 6: mixed numbers
       * 7: mixed numbers, bigger numerators and denominators
       * 8: mixed numbers, big integer parts
       */

      // TODO - anything other than difficulty 1.
      const diff = settings.num_diff;
      if (diff < 3) {
        const den = randElem([5, 7, 9, 11, 13, 17]);
        for (let i = 0; i < this.n; i++) {
          const prevnum = this.vertices[i - 1]
            ? this.vertices[i - 1].val.n : undefined;
          const nextnum = this.vertices[(i + 1) % this.n]
            ? this.vertices[(i + 1) % this.n].val.n : undefined;

          const maxnum =
            diff === 2 ? den - 1
              : nextnum ? den - Math.max(nextnum, prevnum)
                : prevnum ? den - prevnum
                  : den - 1;

          const num = randBetweenFilter(1, maxnum, x => (
            // Ensures no simplifing afterwards if difficulty is 1
            gcd(x, den) === 1 &&
            (!prevnum || gcd(x + prevnum, den) === 1 || x + prevnum === den) &&
            (!nextnum || gcd(x + nextnum, den) === 1 || x + nextnum === den)
          ));

          this.vertices[i] = {
            val: new fraction$1(num, den),
            hidden: false
          };
        }
      } else {
        const denbase = randElem(
          diff < 7 ? [2, 3, 5] : [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        );
        for (let i = 0; i < this.n; i++) {
          const prev = this.vertices[i - 1]
            ? this.vertices[i - 1].val : undefined;
          const next = this.vertices[(i + 1) % this.n]
            ? this.vertices[(i + 1) % this.n].val : undefined;

          const maxmultiplier = diff < 7 ? 4 : 8;

          const multiplier =
            i % 2 === 1 || diff > 4 ? randBetweenFilter(2, maxmultiplier, x =>
              (!prev || x !== prev.d / denbase) &&
              (!next || x !== next.d / denbase)
            ) : 1;

          const den = denbase * multiplier;

          let num;
          if (diff < 6) {
            num = randBetweenFilter(1, den - 1, x => (
              gcd(x, den) === 1 &&
              (diff >= 4 || !prev || prev.add(x, den) <= 1) &&
              (diff >= 4 || !next || next.add(x, den) <= 1)
            ));
          } else if (diff < 8) {
            num = randBetweenFilter(den + 1, den * 6, x => gcd(x, den) === 1);
          } else {
            num = randBetweenFilter(den * 10, den * 100, x => gcd(x, den) === 1);
          }

          this.vertices[i] = {
            val: new fraction$1(num, den),
            hidden: false
          };
        }
      }
    }

    initFractionMultiply (settings) {
      for (let i = 0; i < this.n; i++) {
        const d = randBetween(2, 10);
        const n = randBetween(1, d - 1);
        this.vertices[i] = {
          val: new fraction$1(n, d),
          hidden: false
        };
      }
    }

    initAlgebraAdd (settings) {
      const diff = settings.num_diff;
      switch (diff) {
        case 1: {
          const variable = String.fromCharCode(randBetween(97, 122));
          for (let i = 0; i < this.n; i++) {
            const coeff = randBetween(1, 10).toString();
            this.vertices[i] = {
              val: new Polynomial(coeff + variable),
              hidden: false
            };
          }
        }
          break
        case 2:
        default: {
          if (Math.random() < 0.5) { // variable + constant
            const variable = String.fromCharCode(randBetween(97, 122));
            for (let i = 0; i < this.n; i++) {
              const coeff = randBetween(1, 10).toString();
              const constant = randBetween(1, 10).toString();
              this.vertices[i] = {
                val: new Polynomial(coeff + variable + '+' + constant),
                hidden: false
              };
            }
          } else {
            const variable1 = String.fromCharCode(randBetween(97, 122));
            let variable2 = variable1;
            while (variable2 === variable1) {
              variable2 = String.fromCharCode(randBetween(97, 122));
            }

            for (let i = 0; i < this.n; i++) {
              const coeff1 = randBetween(1, 10).toString();
              const coeff2 = randBetween(1, 10).toString();
              this.vertices[i] = {
                val: new Polynomial(coeff1 + variable1 + '+' + coeff2 + variable2),
                hidden: false
              };
            }
          }
          break
        }
      }
    }

    initAlgebraMultiply (settings) {
      /* Difficulty:
       * 1: Alternate 3a with 4
       * 2: All terms of the form nv - up to two variables
       * 3: All terms of the form nv^m. One variable only
       * 4: ALl terms of the form nx^k y^l z^p. k,l,p 0-3
       * 5: Expand brackets 3(2x+5)
       * 6: Expand brackets 3x(2x+5)
       * 7: Expand brackets 3x^2y(2xy+5y^2)
       * 8: Expand brackets (x+3)(x+2)
       * 9: Expand brackets (2x-3)(3x+4)
       * 10: Expand brackets (2x^2-3x+4)(2x-5)
       */
      const diff = settings.num_diff;
      switch (diff) {
        case 1:
        {
          const variable = String.fromCharCode(randBetween(97, 122));
          for (let i = 0; i < this.n; i++) {
            const coeff = randBetween(1, 10).toString();
            const term = i % 2 === 0 ? coeff : coeff + variable;
            this.vertices[i] = {
              val: new Polynomial(term),
              hidden: false
            };
          }
          break
        }

        case 2: {
          const variable1 = String.fromCharCode(randBetween(97, 122));
          const variable2 = String.fromCharCode(randBetween(97, 122));
          for (let i = 0; i < this.n; i++) {
            const coeff = randBetween(1, 10).toString();
            const variable = randElem([variable1, variable2]);
            this.vertices[i] = {
              val: new Polynomial(coeff + variable),
              hidden: false
            };
          }
          break
        }

        case 3: {
          const v = String.fromCharCode(randBetween(97, 122));
          for (let i = 0; i < this.n; i++) {
            const coeff = randBetween(1, 10).toString();
            const idx = randBetween(1, 3).toString();
            this.vertices[i] = {
              val: new Polynomial(coeff + v + '^' + idx),
              hidden: false
            };
          }
          break
        }

        case 4: {
          const startAscii = randBetween(97, 120);
          const v1 = String.fromCharCode(startAscii);
          const v2 = String.fromCharCode(startAscii + 1);
          const v3 = String.fromCharCode(startAscii + 2);
          for (let i = 0; i < this.n; i++) {
            const a = randBetween(1, 10).toString();
            const n1 = '^' + randBetween(0, 3).toString();
            const n2 = '^' + randBetween(0, 3).toString();
            const n3 = '^' + randBetween(0, 3).toString();
            const term = a + v1 + n1 + v2 + n2 + v3 + n3;
            this.vertices[i] = {
              val: new Polynomial(term),
              hidden: false
            };
          }
          break
        }

        case 5:
        case 6: { // e.g. 3(x) * (2x-5)
          const variable = String.fromCharCode(randBetween(97, 122));
          for (let i = 0; i < this.n; i++) {
            const coeff = randBetween(1, 10).toString();
            const constant = randBetween(-9, 9).toString();
            let term = coeff;
            if (diff === 6 || i % 2 === 1) term += variable;
            if (i % 2 === 1) term += '+' + constant;
            this.vertices[i] = {
              val: new Polynomial(term),
              hidden: false
            };
          }
          break
        }

        case 7: { // e.g. 3x^2y(4xy^2+5xy)
          const startAscii = randBetween(97, 120);
          const v1 = String.fromCharCode(startAscii);
          const v2 = String.fromCharCode(startAscii + 1);
          for (let i = 0; i < this.n; i++) {
            const a1 = randBetween(1, 10).toString();
            const n11 = '^' + randBetween(0, 3).toString();
            const n12 = '^' + randBetween(0, 3).toString();
            let term = a1 + v1 + n11 + v2 + n12;
            if (i % 2 === 1) {
              const a2 = randBetween(-9, 9).toString();
              const n21 = '^' + randBetween(0, 3).toString();
              const n22 = '^' + randBetween(0, 3).toString();
              term += '+' + a2 + v1 + n21 + v2 + n22;
            }
            this.vertices[i] = {
              val: new Polynomial(term),
              hidden: false
            };
          }
          break
        }

        case 8: // { e.g. (x+5) * (x-2)
        default: {
          const variable = String.fromCharCode(randBetween(97, 122));
          for (let i = 0; i < this.n; i++) {
            const constant = randBetween(-9, 9).toString();
            this.vertices[i] = {
              val: new Polynomial(variable + '+' + constant),
              hidden: false
            };
          }
        }
      }
    }

    /* Method to calculate edges from vertices */
    calculateEdges () {
      // Calculate the edges given the vertices using this.op
      for (let i = 0; i < this.n; i++) {
        this.sides[i] = {
          val: this.op(this.vertices[i].val, this.vertices[(i + 1) % this.n].val),
          hidden: false
        };
      }
    }

    /* Mark hiddend edges/vertices */

    hideLabels (puzzleDifficulty) {
      // Hide some labels to make a puzzle
      // 1 - Sides hidden, vertices shown
      // 2 - Some sides hidden, some vertices hidden
      // 3 - All vertices hidden
      switch (puzzleDifficulty) {
        case 1:
          this.sides.forEach(x => { x.hidden = true; });
          break
        case 2: {
          this.sides.forEach(x => { x.hidden = true; });
          const showside = randBetween(0, this.n - 1, Math.random);
          const hidevert = Math.random() < 0.5
            ? showside // previous vertex
            : (showside + 1) % this.n; // next vertex;

          this.sides[showside].hidden = false;
          this.vertices[hidevert].hidden = true;
          break
        }
        case 3:
          this.vertices.forEach(x => { x.hidden = true; });
          break
        default:
          throw new Error('no_difficulty')
      }
    }
  }

  class ArithmagonQView extends GraphicQView {
    constructor (data, options) {
      super(data, options); // sets this.width this.height, initialises this.labels, creates dom elements

      const width = this.width;
      const height = this.height;
      const r = 0.35 * Math.min(width, height); // radius
      const n = this.data.n;

      // A point to label with the operation
      // All points first set up with (0,0) at center
      this.operationPoint = new Point(0, 0);

      // Position of vertices
      this.vertexPoints = [];
      for (let i = 0; i < n; i++) {
        const angle = i * Math.PI * 2 / n - Math.PI / 2;
        this.vertexPoints[i] = Point.fromPolar(r, angle);
      }

      // Poisition of side labels
      this.sidePoints = [];
      for (let i = 0; i < n; i++) {
        this.sidePoints[i] = Point.mean(this.vertexPoints[i], this.vertexPoints[(i + 1) % n]);
      }

      this.allPoints = [this.operationPoint].concat(this.vertexPoints).concat(this.sidePoints);

      this.reCenter(); // Reposition everything properly

      this.makeLabels(true);

      // Draw into canvas
    }

    reCenter () {
      // Find the center of the bounding box
      const topleft = Point.min(this.allPoints);
      const bottomright = Point.max(this.allPoints);
      const center = Point.mean(topleft, bottomright);

      // translate to put in the center
      this.allPoints.forEach(p => {
        p.translate(this.width / 2 - center.x, this.height / 2 - center.y);
      });
    }

    makeLabels () {
      // vertices
      this.data.vertices.forEach((v, i) => {
        const value = v.val.toLatex
          ? v.val.toLatex(true)
          : v.val.toString();
        this.labels.push({
          pos: this.vertexPoints[i],
          textq: v.hidden ? '' : value,
          texta: value,
          styleq: 'normal vertex',
          stylea: v.hidden ? 'answer vertex' : 'normal vertex'
        });
      });

      // sides
      this.data.sides.forEach((v, i) => {
        const value = v.val.toLatex
          ? v.val.toLatex(true)
          : v.val.toString();
        this.labels.push({
          pos: this.sidePoints[i],
          textq: v.hidden ? '' : value,
          texta: value,
          styleq: 'normal side',
          stylea: v.hidden ? 'answer side' : 'normal side'
        });
      });

      // operation
      this.labels.push({
        pos: this.operationPoint,
        textq: this.data.opname,
        texta: this.data.opname,
        styleq: 'normal',
        stylea: 'normal'
      });

      // styling
      this.labels.forEach(l => {
        l.text = l.textq;
        l.style = l.styleq;
      });
    }

    render () {
      const ctx = this.canvas.getContext('2d');
      const n = this.data.n;

      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // clear

      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p = this.vertexPoints[i];
        const next = this.vertexPoints[(i + 1) % n];
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(next.x, next.y);
      }
      ctx.stroke();
      ctx.closePath();

      // place labels
      this.renderLabels(true);
    }

    showAnswer () {
      this.labels.forEach(l => {
        l.text = l.texta;
        l.style = l.stylea;
      });
      this.renderLabels(true);
      this.answered = true;
    }

    hideAnswer () {
      this.labels.forEach(l => {
        l.text = l.textq;
        l.style = l.styleq;
      });
      this.renderLabels(true);
      this.answered = false;
    }
  }

  class TestQ extends TextQ {
    constructor (options) {
      super(options);

      const defaults = {
        difficulty: 5,
        label: 'a',
        test1: ['foo'],
        test2: true
      };
      const settings = Object.assign({}, defaults, options);

      this.label = settings.label;

      // pick a random one of the selected
      let test1;
      if (settings.test1.length === 0) {
        test1 = 'none';
      } else {
        test1 = randElem(settings.test1);
      }

      this.questionLaTeX = 'd: ' + settings.difficulty + '\\\\ test1: ' + test1;
      this.answerLaTeX = 'test2: ' + settings.test2;

      this.render();
    }

    static get commandWord () { return 'Test command word' }
  }

  TestQ.optionsSpec = [
    {
      title: 'Test option 1',
      id: 'test1',
      type: 'select-inclusive',
      selectOptions: ['foo', 'bar', 'wizz'],
      default: []
    },
    {
      title: 'Test option 2',
      id: 'test2',
      type: 'bool',
      default: true
    }
  ];

  class AddAZero extends TextQ {
    constructor (options) {
      super(options);

      const defaults = {
        difficulty: 5,
        label: 'a'
      };
      const settings = Object.assign({}, defaults, options);

      this.label = settings.label;

      // random 2 digit 'decimal'
      const q = String(randBetween(1, 9)) + String(randBetween(0, 9)) + '.' + String(randBetween(0, 9));
      const a = q + '0';

      this.questionLaTeX = q + '\\times 10';
      this.answerLaTeX = '= ' + a;

      this.render();
    }

    static get commandWord () {
      return 'Evaluate'
    }
  }

  AddAZero.optionsSpec = [
  ];

  /* Main question class. This will be spun off into different file and generalised */
  class EquationOfLine extends TextQ {
    // 'extends' Question, but nothing to actually extend
    constructor (options) {
      // boilerplate
      super(options);

      const defaults = {
        difficulty: 2
      };

      const settings = Object.assign({}, defaults, options);
      const difficulty = Math.ceil(settings.difficulty / 2); // initially written for difficulty 1-4, now need 1-10

      // question generation begins here
      let m, c, x1, y1, x2, y2;
      let minm, maxm, minc, maxc;

      switch (difficulty) {
        case 1: // m>0, c>=0
        case 2:
        case 3:
          minm = difficulty < 3 ? 1 : -5;
          maxm = 5;
          minc = difficulty < 2 ? 0 : -10;
          maxc = 10;
          m = randBetween(minm, maxm);
          c = randBetween(minc, maxc);
          x1 = difficulty < 3 ? randBetween(0, 10) : randBetween(-15, 15);
          y1 = m * x1 + c;

          if (difficulty < 3) {
            x2 = randBetween(x1 + 1, 15);
          } else {
            x2 = x1;
            while (x2 === x1) { x2 = randBetween(-15, 15); }        }
          y2 = m * x2 + c;
          break
        case 4: // m fraction, points are integers
        default: {
          const md = randBetween(1, 5);
          const mn = randBetween(-5, 5);
          m = new fraction$1(mn, md);
          x1 = new fraction$1(randBetween(-10, 10));
          y1 = new fraction$1(randBetween(-10, 10));
          c = new fraction$1(y1).sub(m.mul(x1));
          x2 = x1.add(randBetween(1, 5) * m.d);
          y2 = m.mul(x2).add(c);
          break
        }
      }

      const xstr =
        (m === 0 || (m.equals && m.equals(0))) ? ''
          : (m === 1 || (m.equals && m.equals(1))) ? 'x'
            : (m === -1 || (m.equals && m.equals(-1))) ? '-x'
              : (m.toLatex) ? m.toLatex() + 'x'
                : (m + 'x');

      const conststr = // TODO: When m=c=0
        (c === 0 || (c.equals && c.equals(0))) ? ''
          : (c < 0) ? (' - ' + (c.neg ? c.neg().toLatex() : -c))
            : (c.toLatex) ? (' + ' + c.toLatex())
              : (' + ' + c);

      this.questionLaTeX = '(' + x1 + ', ' + y1 + ')\\text{ and }(' + x2 + ', ' + y2 + ')';
      this.answerLaTeX = 'y = ' + xstr + conststr;
    }

    static get commandWord () {
      return 'Find the equation of the line through'
    }
  }

  /* Renders missing angles problem when the angles are at a point
   * I.e. on a straight line or around a point
   * Could also be adapted to angles forming a right angle
   *
   * Should be flexible enough for numerical problems or algebraic ones
   *
   */
  class MissingAnglesAroundView extends GraphicQView {
      constructor(data, options) {
          super(data, options); // sets this.width this.height, initialises this.labels, creates dom elements
          const width = this.width;
          const height = this.height;
          const radius = this.radius = Math.min(width, height) / 2.5;
          const minViewAngle = options.minViewAngle || 25;
          this.viewAngles = fudgeAngles(this.data.angles, minViewAngle);
          // Set up main points
          this.O = new Point(0, 0); // center point
          this.A = new Point(radius, 0); // first point
          this.C = []; // Points around outside
          let totalangle = 0; // nb in radians
          for (let i = 0; i < this.data.angles.length; i++) {
              totalangle += this.viewAngles[i] * Math.PI / 180;
              this.C[i] = Point.fromPolar(radius, totalangle);
          }
          // Randomly rotate and center
          this.rotation = (options.rotation !== undefined) ? this.rotate(options.rotation) : this.randomRotate();
          // this.scaleToFit(width,height,10)
          this.translate(width / 2, height / 2);
          // Set up labels (after scaling and rotating)
          totalangle = Point.angleFrom(this.O, this.A) * 180 / Math.PI; // angle from O that A is
          for (let i = 0; i < this.viewAngles.length; i++) {
              // Label text
              const label = {};
              const textq = this.data.angleLabels[i];
              const texta = roundDP(this.data.angles[i], 2).toString() + '^\\circ';
              // Positioning
              const theta = this.viewAngles[i];
              /* could be used for more advanced positioning
              const midAngle = totalangle + theta / 2
              const minDistance = 0.3 // as a fraction of radius
              const labelLength = Math.max(textq.length, texta.length) - '^\\circ'.length // ° takes up very little space
              */
              /* Explanation: Further out if:
              *   More vertical (sin(midAngle))
              *   Longer label
              *   smaller angle
              *   E.g. totally vertical, 45°, length = 3
              *   d = 0.3 + 1*3/45 = 0.3 + 0.7 = 0.37
              */
              // const factor = 1        // constant of proportionality. Set by trial and error
              // let distance = minDistance + factor * Math.abs(sinDeg(midAngle)) * labelLength / theta
              // Just revert to old method
              const distance = 0.4 + 6 / theta;
              label.pos = Point.fromPolarDeg(radius * distance, totalangle + theta / 2).translate(this.O.x, this.O.y);
              label.textq = textq;
              label.styleq = 'normal';
              if (this.data.missing[i]) {
                  label.texta = texta;
                  label.stylea = 'answer';
              }
              else {
                  label.texta = label.textq;
                  label.stylea = label.styleq;
              }
              label.text = label.textq;
              label.style = label.styleq;
              this.labels[i] = label;
              totalangle += theta;
          }
          this.labels.forEach(l => {
              l.text = l.textq;
              l.style = l.styleq;
          });
      }
      render() {
          const ctx = this.canvas.getContext('2d');
          if (ctx === null) {
              throw new Error('Could not get canvas context');
          }
          ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // clear
          ctx.beginPath();
          ctx.moveTo(this.O.x, this.O.y); // draw lines
          ctx.lineTo(this.A.x, this.A.y);
          for (let i = 0; i < this.C.length; i++) {
              ctx.moveTo(this.O.x, this.O.y);
              ctx.lineTo(this.C[i].x, this.C[i].y);
          }
          ctx.strokeStyle = 'gray';
          ctx.stroke();
          ctx.closePath();
          ctx.beginPath();
          let totalangle = this.rotation;
          for (let i = 0; i < this.viewAngles.length; i++) {
              const theta = this.viewAngles[i] * Math.PI / 180;
              // 0.07/theta radians ~= 4/theta
              ctx.arc(this.O.x, this.O.y, this.radius * (0.2 + 0.07 / theta), totalangle, totalangle + theta);
              ctx.stroke();
              totalangle += theta;
          }
          ctx.closePath();
          // testing label positioning:
          // this.labels.forEach(l => {
          // ctx.fillStyle = 'red'
          // ctx.fillRect(l.pos.x - 1, l.pos.y - 1, 3, 3)
          // })
          this.renderLabels(false);
      }
      get allpoints() {
          let allpoints = [this.A, this.O];
          allpoints = allpoints.concat(this.C);
          this.labels.forEach(function (l) {
              allpoints.push(l.pos);
          });
          return allpoints;
      }
  }
  /**
   * Adjusts a set of angles so that all angles are greater than {minAngle} by reducing other angles in proportion
   * @param angles The set of angles to adjust
   * @param minAngle The smallest angle in the output
   */
  function fudgeAngles(angles, minAngle) {
      const angleSum = angles.reduce((a, c) => a + c);
      const mappedAngles = angles.map((x, i) => [x, i]); // remember original indices
      const smallAngles = mappedAngles.filter(x => x[0] < minAngle); // split out angles which are too small
      const largeAngles = mappedAngles.filter(x => x[0] >= minAngle);
      const largeAngleSum = largeAngles.reduce((accumulator, currentValue) => accumulator + currentValue[0], 0);
      smallAngles.forEach(small => {
          const difference = minAngle - small[0];
          small[0] += difference;
          largeAngles.forEach(large => {
              const reduction = difference * large[0] / largeAngleSum;
              large[0] = Math.round(large[0] - reduction);
          });
      });
      // fix any rounding errors introduced
      const newAngles = smallAngles.concat(largeAngles) // combine together
          .sort((x, y) => x[1] - y[1]) // sort by previous index
          .map(x => x[0]); // strip out index
      let newSum = newAngles.reduce((acc, curr) => acc + curr);
      if (newSum !== angleSum) {
          const difference = angleSum - newSum;
          newAngles[newAngles.indexOf(Math.max(...newAngles))] += difference;
      }
      newSum = newAngles.reduce((acc, curr) => acc + curr);
      if (newSum !== angleSum)
          throw new Error(`Didn't fix angles. New sum is ${newSum}, but should be ${angleSum}`);
      return newAngles;
  }

  /** Generates and holds data for a missing angles question, where these is some given angle sum
   *  Agnostic as to how these angles are arranged (e.g. in a polygon or around som point)
   *
   * Options passed to constructors:
   *  angleSum::Int the number of angles to generate
   *  minAngle::Int the smallest angle to generate
   *  minN::Int     the smallest number of angles to generate
   *  maxN::Int     the largest number of angles to generate
   *
   */
  class MissingAnglesNumberData {
      constructor(angleSum, angles, missing, angleLabels) {
          // initialises with angles given explicitly
          if (angles === []) {
              throw new Error('Must give angles');
          }
          if (Math.round(angles.reduce((x, y) => x + y)) !== angleSum) {
              throw new Error(`Angle sum must be ${angleSum}`);
          }
          this.angles = angles; // list of angles
          this.missing = missing; // which angles are missing - array of booleans
          this.angleSum = angleSum; // sum of angles
          this.angleLabels = angleLabels || [];
      }
      static random(options) {
          let question;
          if (options.repeated) {
              question = this.randomRepeated(options);
          }
          else {
              question = this.randomSimple(options);
          }
          question.initLabels();
          return question;
      }
      static randomSimple(options) {
          const angleSum = options.angleSum;
          const n = randBetween(options.minN, options.maxN);
          const minAngle = options.minAngle;
          if (n < 2)
              throw new Error('Can\'t have missing fewer than 2 angles');
          // Build up angles
          const angles = [];
          let left = angleSum;
          for (let i = 0; i < n - 1; i++) {
              const maxAngle = left - minAngle * (n - i - 1);
              const nextAngle = randBetween(minAngle, maxAngle);
              left -= nextAngle;
              angles.push(nextAngle);
          }
          angles[n - 1] = left;
          // pick one to be missing
          const missing = [];
          missing.length = n;
          missing.fill(false);
          missing[randBetween(0, n - 1)] = true;
          return new this(angleSum, angles, missing);
      }
      static randomRepeated(options) {
          const angleSum = options.angleSum;
          const minAngle = options.minAngle;
          const n = randBetween(options.minN, options.maxN);
          const m = options.nMissing || (Math.random() < 0.1 ? n : randBetween(2, n - 1));
          if (n < 2 || m < 1 || m > n)
              throw new Error(`Invalid arguments: n=${n}, m=${m}`);
          // All missing - do as a separate case
          if (n === m) {
              const angles = [];
              angles.length = n;
              angles.fill(angleSum / n);
              const missing = [];
              missing.length = n;
              missing.fill(true);
              return new this(angleSum, angles, missing);
          }
          const angles = [];
          const missing = [];
          missing.length = n;
          missing.fill(false);
          // choose a value for the missing angles
          const maxRepeatedAngle = (angleSum - minAngle * (n - m)) / m;
          const repeatedAngle = randBetween(minAngle, maxRepeatedAngle);
          // choose values for the other angles
          const otherAngles = [];
          let left = angleSum - repeatedAngle * m;
          for (let i = 0; i < n - m - 1; i++) {
              const maxAngle = left - minAngle * (n - m - i - 1);
              const nextAngle = randBetween(minAngle, maxAngle);
              left -= nextAngle;
              otherAngles.push(nextAngle);
          }
          otherAngles[n - m - 1] = left;
          // choose where the missing angles are
          {
              let i = 0;
              while (i < m) {
                  const j = randBetween(0, n - 1);
                  if (missing[j] === false) {
                      missing[j] = true;
                      angles[j] = repeatedAngle;
                      i++;
                  }
              }
          }
          // fill in the other angles
          {
              let j = 0;
              for (let i = 0; i < n; i++) {
                  if (missing[i] === false) {
                      angles[i] = otherAngles[j];
                      j++;
                  }
              }
          }
          return new this(angleSum, angles, missing);
      }
      initLabels() {
          const n = this.angles.length;
          for (let i = 0; i < n; i++) {
              if (!this.missing[i]) {
                  this.angleLabels[i] = `${this.angles[i].toString()}^\\circ`;
              }
              else {
                  this.angleLabels[i] = 'x^\\circ';
              }
          }
      }
  }

  /* Question type comprising numerical missing angles around a point and
   * angles on a straight line (since these are very similar numerically as well
   * as graphically.
   *
   * Also covers cases where more than one angle is equal
   *
   */
  class MissingAnglesAroundQ extends GraphicQ {
      static random(options, viewOptions) {
          const defaults = {
              angleSum: 180,
              minAngle: 15,
              minN: 2,
              maxN: 4,
              repeated: false,
              nMissing: 3
          };
          const settings = Object.assign({}, defaults, options);
          const data = MissingAnglesNumberData.random(settings);
          const view = new MissingAnglesAroundView(data, viewOptions); // TODO eliminate public constructors
          return new MissingAnglesAroundQ(data, view);
      }
      static get commandWord() { return 'Find the missing value'; }
  }

  class MissingAnglesTriangleView extends GraphicQView {
      constructor(data, options) {
          super(data, options); // sets this.width this.height, this.data initialises this.labels, creates dom elements
          const width = this.width;
          const height = this.height;
          // generate points (with longest side 1
          this.A = new Point(0, 0);
          this.B = Point.fromPolarDeg(1, data.angles[0]);
          this.C = new Point(sinDeg(this.data.angles[1]) / sinDeg(this.data.angles[2]), 0);
          // Create labels
          const inCenter = Point.inCenter(this.A, this.B, this.C);
          for (let i = 0; i < 3; i++) {
              const p = [this.A, this.B, this.C][i];
              const label = {
                  textq: this.data.angleLabels[i],
                  text: this.data.angleLabels[i],
                  styleq: 'normal',
                  style: 'normal',
                  pos: Point.mean(p, p, inCenter)
              };
              if (this.data.missing[i]) {
                  label.texta = roundDP(this.data.angles[i], 2).toString() + '^\\circ';
                  label.stylea = 'answer';
              }
              else {
                  label.texta = label.textq;
                  label.stylea = label.styleq;
              }
              this.labels[i] = label;
          }
          // rotate randomly
          this.rotation = (options.rotation !== undefined) ? this.rotate(options.rotation) : this.randomRotate();
          // scale and fit
          // scale to size
          const margin = 0;
          let topleft = Point.min([this.A, this.B, this.C]);
          let bottomright = Point.max([this.A, this.B, this.C]);
          const totalWidth = bottomright.x - topleft.x;
          const totalHeight = bottomright.y - topleft.y;
          this.scale(Math.min((width - margin) / totalWidth, (height - margin) / totalHeight)); // 15px margin
          // move to centre
          topleft = Point.min([this.A, this.B, this.C]);
          bottomright = Point.max([this.A, this.B, this.C]);
          const center = Point.mean(topleft, bottomright);
          this.translate(width / 2 - center.x, height / 2 - center.y); // centre
      }
      render() {
          const ctx = this.canvas.getContext('2d');
          if (ctx === null)
              throw new Error('Could not get canvas context');
          const vertices = [this.A, this.B, this.C];
          const apex = this.data.apex; // hmmm
          ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // clear
          ctx.beginPath();
          ctx.moveTo(this.A.x, this.A.y);
          for (let i = 0; i < 3; i++) {
              const p = vertices[i];
              const next = vertices[(i + 1) % 3];
              if (apex === i || apex === (i + 1) % 3) { // to/from apex - draw dashed line
                  dashedLine(ctx, p.x, p.y, next.x, next.y);
              }
              else {
                  ctx.lineTo(next.x, next.y);
              }
          }
          ctx.strokeStyle = 'gray';
          ctx.stroke();
          ctx.closePath();
          this.renderLabels(false);
      }
      get allpoints() {
          const allpoints = [this.A, this.B, this.C];
          this.labels.forEach(l => { allpoints.push(l.pos); });
          return allpoints;
      }
  }

  /* Extends MissingAnglesNumberData in order to do isosceles triangles, which generate a bit differently */
  class MissingAnglesTriangleData extends MissingAnglesNumberData {
      constructor(angleSum, angles, missing, angleLabels, apex) {
          super(angleSum, angles, missing, angleLabels);
          this.apex = apex;
      }
      static randomRepeated(options) {
          options.nMissing = 2;
          options.givenAngle = options.givenAngle || Math.random() < 0.5 ? 'apex' : 'base';
          // generate the random angles with repetition first before marking apex for drawing
          const question = super.randomRepeated(options); // allowed since undefined \in apex
          // Old implementation had sorting the array - not sure why
          // sortTogether(question.angles,question.missing,(x,y) => x - y)
          question.apex = firstUniqueIndex(question.angles);
          question.missing = [true, true, true];
          if (options.givenAngle === 'apex') {
              question.missing[question.apex] = false;
          }
          else {
              question.missing[(question.apex + 1) % 3] = false;
          }
          question.initLabels();
          return question;
      }
      initLabels() {
          const n = this.angles.length;
          let j = 0; // keep track of unknowns
          for (let i = 0; i < n; i++) {
              if (!this.missing[i]) {
                  this.angleLabels[i] = `${this.angles[i].toString()}^\\circ`;
              }
              else {
                  this.angleLabels[i] = `${String.fromCharCode(120 + j)}^\\circ`; // 120 = 'x'
                  j++;
              }
          }
      }
  }

  /* Missing angles in triangle - numerical */
  class MissingAnglesTriangleQ extends GraphicQ {
      static random(options, viewOptions) {
          const optionsOverride = {
              angleSum: 180,
              minAngle: 25,
              minN: 3,
              maxN: 3
          };
          const defaults = {
              angleSum: 180,
              minAngle: 15,
              minN: 2,
              maxN: 4,
              repeated: false,
              nMissing: 1
          };
          const settings = Object.assign({}, defaults, options, optionsOverride);
          const data = MissingAnglesTriangleData.random(settings);
          const view = new MissingAnglesTriangleView(data, viewOptions);
          return new MissingAnglesTriangleQ(data, view);
      }
      static get commandWord() { return 'Find the missing value'; }
  }

  class LinExpr {
  // class LinExpr {
    constructor (a, b) {
      this.a = a;
      this.b = b;
    }

    isConstant () {
      return this.a === 0
    }

    toString () {
      let string = '';

      // x term
      if (this.a === 1) { string += 'x'; } else if (this.a === -1) { string += '-x'; } else if (this.a !== 0) { string += this.a + 'x'; }

      // sign
      if (this.a !== 0 && this.b > 0) { string += ' + '; } else if (this.a !== 0 && this.b < 0) { string += ' - '; }

      // constant
      if (this.b > 0) { string += this.b; } else if (this.b < 0 && this.a === 0) { string += this.b; } else if (this.b < 0) { string += Math.abs(this.b); }

      return string
    }

    toStringP () {
      // return expression as a string, surrounded in parentheses if a binomial
      if (this.a === 0 || this.b === 0) return this.toString()
      else return '(' + this.toString() + ')'
    }

    eval (x) {
      return this.a * x + this.b
    }

    add (that) {
      // add either an expression or a constant
      if (that.a !== undefined) return new LinExpr(this.a + that.a, this.b + that.b)
      else return new LinExpr(this.a, this.b + that)
    }

    times (that) {
      return new LinExpr(this.a * that, this.b * that)
    }

    static solve (expr1, expr2) {
      // solves the two expressions set equal to each other
      return (expr2.b - expr1.b) / (expr1.a - expr2.a)
    }
  }

  /** Given a set of expressions, set their sum  */
  function solveAngles(expressions, angleSum) {
      const expressionSum = expressions.reduce((exp1, exp2) => exp1.add(exp2));
      const x = LinExpr.solve(expressionSum, new LinExpr(0, angleSum));
      const angles = [];
      expressions.forEach(function (expr) {
          const angle = expr.eval(x);
          if (angle <= 0) {
              throw new Error('negative angle');
          }
          else {
              angles.push(expr.eval(x));
          }
      });
      return ({ x: x, angles: angles });
  }

  class MissingAnglesAlgebraData {
      constructor(angles, missing, angleSum, angleLabels, x) {
          this.angles = angles;
          this.angleSum = angleSum;
          this.angleLabels = angleLabels;
          this.x = x;
          this.missing = missing;
      }
      static random(options) {
          // calculated defaults if necessary
          options.maxConstant = options.maxConstant || options.angleSum / 2; // guaranteed non-null from above
          options.maxXValue = options.maxXValue || options.angleSum / 4;
          // Randomise/set up main features
          const n = randBetween(options.minN, options.maxN);
          const type = randElem(options.expressionTypes); // guaranteed non-null from defaul assignment
          // Generate expressions/angles
          let expressions;
          switch (type) {
              case 'mixed':
                  expressions = makeMixedExpressions(n, options);
                  break;
              case 'multiply':
                  expressions = makeMultiplicationExpressions(n, options);
                  break;
              case 'add':
              default:
                  expressions = makeAddExpressions(n, options);
                  break;
          }
          expressions = shuffle(expressions);
          // Solve for x and angles
          const { x, angles } = solveAngles(expressions, options.angleSum); // non-null from default assignement
          // labels are just expressions as strings
          const labels = expressions.map(e => `${e.toStringP()}^\\circ`);
          // missing values are the ones which aren't constant
          const missing = expressions.map(e => !e.isConstant());
          return new MissingAnglesAlgebraData(angles, missing, options.angleSum, labels, x);
      }
      // makes typescript shut up, makes eslint noisy
      initLabels() { } // eslint-disable-line
  }
  function makeMixedExpressions(n, options) {
      const expressions = [];
      const x = randBetween(options.minXValue, options.maxXValue);
      let left = options.angleSum;
      let allconstant = true;
      for (let i = 0; i < n - 1; i++) {
          const a = randBetween(1, options.maxCoefficient);
          left -= a * x;
          const maxb = Math.min(left - options.minAngle * (n - i - 1), options.maxConstant);
          const minb = options.minAngle - a * x;
          const b = randBetween(minb, maxb);
          if (a !== 0) {
              allconstant = false;
          }
          left -= b;
          expressions.push(new LinExpr(a, b));
      }
      const lastMinXCoeff = allconstant ? 1 : options.minCoefficient;
      const a = randBetween(lastMinXCoeff, options.maxCoefficient);
      const b = left - a * x;
      expressions.push(new LinExpr(a, b));
      return expressions;
  }
  function makeAddExpressions(n, options) {
      const expressions = [];
      const constants = (options.includeConstants === true || weakIncludes(options.includeConstants, 'add'));
      if (n === 2 && options.ensureX && constants)
          n = 3;
      const x = randBetween(options.minXValue, options.maxXValue);
      let left = options.angleSum;
      let anglesLeft = n;
      // first do the expressions ensured by ensure_x and constants
      if (options.ensureX) {
          anglesLeft--;
          expressions.push(new LinExpr(1, 0));
          left -= x;
      }
      if (constants) {
          anglesLeft--;
          const c = randBetween(options.minAngle, left - options.minAngle * anglesLeft);
          expressions.push(new LinExpr(0, c));
          left -= c;
      }
      // middle angles
      while (anglesLeft > 1) {
          // add 'x+b' as an expression. Make sure b gives space
          anglesLeft--;
          left -= x;
          const maxb = Math.min(left - options.minAngle * anglesLeft, options.maxConstant);
          const minb = Math.max(options.minAngle - x, -options.maxConstant);
          const b = randBetween(minb, maxb);
          expressions.push(new LinExpr(1, b));
          left -= b;
      }
      // last angle
      expressions.push(new LinExpr(1, left - x));
      return expressions;
  }
  function makeMultiplicationExpressions(n, options) {
      const expressions = [];
      const constants = (options.includeConstants === true || weakIncludes(options.includeConstants, 'mult'));
      if (n === 2 && options.ensureX && constants)
          n = 3; // need at least 3 angles for this to make sense
      // choose a total of coefficients
      // pick x based on that
      let anglesleft = n;
      const totalCoeff = constants
          ? randBetween(n, (options.angleSum - options.minAngle) / options.minAngle, Math.random) // if it's too big, angles get too small
          : randElem([3, 4, 5, 6, 8, 9, 10].filter(x => x >= n), Math.random);
      let coeffleft = totalCoeff;
      // first 0/1/2
      if (constants) {
          // reduce to make what's left a multiple of total_coeff
          anglesleft--;
          const newleft = randMultBetween(totalCoeff * options.minAngle, options.angleSum - options.minAngle, totalCoeff);
          const c = options.angleSum - newleft;
          expressions.push(new LinExpr(0, c));
      }
      // Don't use x here, but:
      // x = left / totalCoeff
      if (options.ensureX) {
          anglesleft--;
          expressions.push(new LinExpr(1, 0));
          coeffleft -= 1;
      }
      // middle
      while (anglesleft > 1) {
          anglesleft--;
          const mina = 1;
          const maxa = coeffleft - anglesleft; // leave enough for others TODO: add max_coeff
          const a = randBetween(mina, maxa);
          expressions.push(new LinExpr(a, 0));
          coeffleft -= a;
      }
      // last
      expressions.push(new LinExpr(coeffleft, 0));
      return expressions;
  }

  class MissingAnglesAroundAlgebraView extends MissingAnglesAroundView {
      constructor(data, options) {
          super(data, options); // super constructor does real work
          const solutionLabel = {
              pos: new Point(10, this.height - 10),
              textq: '',
              texta: `x = ${this.data.x}^\\circ`,
              styleq: 'hidden',
              stylea: 'extra-answer'
          };
          solutionLabel.style = solutionLabel.styleq;
          solutionLabel.text = solutionLabel.textq;
          this.labels.push(solutionLabel);
      }
  }

  /** Missing angles around a point or on a straight line, using algebraic expressions */
  class MissingAnglesAroundAlgebraQ extends GraphicQ {
      static random(options, viewOptions) {
          const defaults = {
              angleSum: 180,
              minAngle: 15,
              minN: 2,
              maxN: 4,
              repeated: false,
              expressionTypes: ['add', 'multiply', 'mixed'],
              ensureX: true,
              includeConstants: true,
              minCoefficient: 1,
              maxCoefficient: 4,
              minXValue: 15
          };
          const settings = Object.assign({}, defaults, options);
          const data = MissingAnglesAlgebraData.random(settings);
          const view = new MissingAnglesAroundAlgebraView(data, viewOptions); // TODO eliminate public constructors
          return new MissingAnglesAroundAlgebraQ(data, view);
      }
      static get commandWord() { return 'Find the missing value'; }
      static get optionsSpec() {
          return [
              {
                  id: 'expressionTypes',
                  type: 'select-inclusive',
                  title: 'Types of expression',
                  selectOptions: [
                      { title: '<em>a</em>+<em>x</em>', id: 'add' },
                      { title: '<em>ax</em>', id: 'multiply' },
                      { title: 'mixed', id: 'mixed' }
                  ],
                  default: ['add', 'multiply', 'mixed']
              },
              {
                  id: 'ensureX',
                  type: 'bool',
                  title: 'Ensure one angle is <em>x</em>',
                  default: true
              },
              {
                  id: 'includeConstants',
                  type: 'bool',
                  title: 'Ensure a constant angle',
                  default: true
              }
          ];
      }
  }

  class MissingAnglesTriangleAlgebraView extends MissingAnglesTriangleView {
      constructor(data, options) {
          super(data, options);
          const solutionLabel = {
              pos: new Point(10, this.height - 10),
              textq: '',
              texta: `x = ${this.data.x}^\\circ`,
              styleq: 'hidden',
              stylea: 'extra-answer'
          };
          solutionLabel.style = solutionLabel.styleq;
          solutionLabel.text = solutionLabel.textq;
          this.labels.push(solutionLabel);
      }
  }

  class MissingAnglesTriangleAlgebraQ extends GraphicQ {
      static random(options, viewOptions) {
          const optionsOverride = {
              angleSum: 180,
              minN: 3,
              maxN: 3,
              repeated: false
          };
          const defaults = {
              angleSum: 180,
              minN: 3,
              maxN: 3,
              repeated: false,
              minAngle: 25,
              expressionTypes: ['add', 'multiply', 'mixed'],
              ensureX: true,
              includeConstants: true,
              minCoefficient: 1,
              maxCoefficient: 4,
              minXValue: 15
          };
          const settings = Object.assign({}, defaults, options, optionsOverride);
          const data = MissingAnglesAlgebraData.random(settings);
          const view = new MissingAnglesTriangleAlgebraView(data, viewOptions);
          return new this(data, view);
      }
      static get commandWord() { return 'Find the missing value'; }
  }

  class MissingAnglesTriangleWordedView extends MissingAnglesTriangleView {
      constructor(data, options) {
          super(data, options);
          super.scaleToFit(this.width, this.height, 40);
          super.translate(0, -30);
          const instructionLabel = {
              textq: this.data.instructions.join('\\\\'),
              texta: this.data.instructions.join('\\\\'),
              text: this.data.instructions.join('\\\\'),
              styleq: 'extra-info',
              stylea: 'extra-info',
              style: 'extra-info',
              pos: new Point(10, this.height - 10)
          };
          this.labels.push(instructionLabel);
      }
  }

  class MissingAnglesWordedData {
      constructor(angles, missing, angleSum, angleLabels, instructions) {
          this.angles = angles;
          this.missing = missing;
          this.angleSum = angleSum;
          this.angleLabels = angleLabels;
          this.instructions = instructions;
          this.instructions = instructions;
      }
      static random(options) {
          const n = randBetween(options.minN, options.maxN);
          const angleLabels = [];
          for (let i = 0; i < n; i++) {
              angleLabels[i] = String.fromCharCode(65 + i); // 65 = 'A'
          }
          let expressions = [];
          let instructions = [];
          expressions.push(new LinExpr(1, 0));
          // Loop til we get one that works
          // Probably really inefficient!!
          let success = false;
          let attemptcount = 0;
          while (!success) {
              if (attemptcount > 20) {
                  expressions.push(new LinExpr(1, 0));
                  console.log('Gave up after ' + attemptcount + ' attempts');
                  success = true;
              }
              for (let i = 1; i < n; i++) {
                  const type = randElem(options.types);
                  switch (type) {
                      case 'add': {
                          const addend = randBetween(options.minAddend, options.maxAddend);
                          expressions.push(expressions[i - 1].add(addend));
                          instructions.push(`\\text{Angle $${String.fromCharCode(65 + i)}$ is ${comparator(addend, '+')} angle $${String.fromCharCode(64 + i)}$}`);
                          break;
                      }
                      case 'multiply': {
                          const multiplier = randBetween(options.minMultiplier, options.maxMultiplier);
                          expressions.push(expressions[i - 1].times(multiplier));
                          instructions.push(`\\text{Angle $${String.fromCharCode(65 + i)}$ is ${comparator(multiplier, '*')} angle $${String.fromCharCode(64 + i)}$}`);
                          break;
                      }
                      case 'percent': {
                          const percentage = randMultBetween(5, 100, 5);
                          const increase = Math.random() < 0.5;
                          const multiplier = increase ? 1 + percentage / 100 : 1 - percentage / 100;
                          expressions.push(expressions[i - 1].times(multiplier));
                          instructions.push(`\\text{Angle $${String.fromCharCode(65 + i)}$ is $${percentage}\\%$ ${increase ? 'bigger' : 'smaller'} than angle $${String.fromCharCode(64 + i)}$}`);
                          break;
                      }
                      case 'ratio': {
                          const a = randBetween(1, 10);
                          const b = randBetween(1, 10);
                          const multiplier = b / a;
                          expressions.push(expressions[i - 1].times(multiplier));
                          instructions.push(`\\text{The ratio of angle $${String.fromCharCode(64 + i)}$ to angle $${String.fromCharCode(65 + i)}$ is $${a}:${b}$}`);
                      }
                  }
              }
              // check it makes sense
              success = true;
              const expressionsum = expressions.reduce((exp1, exp2) => exp1.add(exp2));
              const x = LinExpr.solve(expressionsum, new LinExpr(0, options.angleSum));
              expressions.forEach(function (expr) {
                  if (!success || expr.eval(x) < options.minAngle) {
                      success = false;
                      instructions = [];
                      expressions = [expressions[0]];
                  }
              });
              attemptcount++;
          }
          console.log('Attempts: ' + attemptcount);
          const angles = solveAngles(expressions, options.angleSum).angles;
          const missing = angles.map(() => true);
          return new this(angles, missing, options.angleSum, angleLabels, instructions);
      }
      // makes typescript shut up, makes eslint noisy
      initLabels() { } // eslint-disable-line
  }
  /**
   * Generates worded version of an operatio
   * @param number The multiplier or addend
   * @param operator The operator, e.g adding 'more than', or multiplying 'times larger than'
   */
  function comparator(number, operator) {
      switch (operator) {
          case '*':
              switch (number) {
                  case 1: return 'the same as';
                  case 2: return 'double';
                  default: return `$${number}$ times larger than`;
              }
          case '+':
              switch (number) {
                  case 0: return 'the same as';
                  default: return `$${Math.abs(number).toString()}^\\circ$ ${(number < 0) ? 'less than' : 'more than'}`;
              }
      }
  }

  class MissingAnglesTriangleWordedQ extends GraphicQ {
      static random(options, viewOptions) {
          const optionsOverride = {
              angleSum: 180,
              minN: 3,
              maxN: 3,
              repeated: false
          };
          const defaults = {
              angleSum: 180,
              minAngle: 25,
              minN: 3,
              maxN: 3,
              repeated: false,
              minAddend: -60,
              maxAddend: 60,
              minMultiplier: 1,
              maxMultiplier: 5,
              types: ['add', 'multiply', 'percent', 'ratio']
          };
          const settings = Object.assign({}, defaults, options, optionsOverride);
          const data = MissingAnglesWordedData.random(settings);
          const view = new MissingAnglesTriangleWordedView(data, viewOptions);
          return new this(data, view);
      }
      static get commandWord() { return 'Find the missing value'; }
  }

  class MissingAnglesAroundWordedView extends MissingAnglesAroundView {
      constructor(data, options) {
          super(data, options); // does most of the set up
          super.translate(0, -15);
          const instructionLabel = {
              textq: this.data.instructions.join('\\\\'),
              texta: this.data.instructions.join('\\\\'),
              text: this.data.instructions.join('\\\\'),
              styleq: 'extra-info',
              stylea: 'extra-info',
              style: 'extra-info',
              pos: new Point(10, this.height - 10)
          };
          this.labels.push(instructionLabel);
      }
  }

  class MissingAnglesWordedQ extends GraphicQ {
      static random(options, viewOptions) {
          const defaults = {
              angleSum: 180,
              minAngle: 15,
              minN: 2,
              maxN: 2,
              repeated: false,
              minAddend: -90,
              maxAddend: 90,
              minMultiplier: 1,
              maxMultiplier: 5,
              types: ['add', 'multiply', 'percent', 'ratio']
          };
          const settings = Object.assign({}, defaults, options);
          const data = MissingAnglesWordedData.random(settings);
          const view = new MissingAnglesAroundWordedView(data, viewOptions);
          return new this(data, view);
      }
      static get optionsSpec() {
          return [
              {
                  type: 'select-inclusive',
                  title: 'Question types',
                  id: 'types',
                  selectOptions: [
                      { title: 'More than/less than', id: 'add' },
                      { title: 'Multiples', id: 'multiply' },
                      { title: 'Percentage change', id: 'percent' },
                      { title: 'Ratios', id: 'ratio' }
                  ],
                  default: ['add', 'multiply']
              }
          ];
      }
  }

  /**  Class to wrap various missing angles classes
   * Reads options and then wraps the appropriate object, mirroring the main
   * public methods
   *
   * This class deals with translating difficulty into question types
  */
  class MissingAnglesQ extends Question {
      constructor(question) {
          super();
          this.question = question;
      }
      static random(options) {
          if (options.types.length === 0) {
              throw new Error('Types list must be non-empty');
          }
          const type = randElem(options.types);
          if (!options.custom) {
              return MissingAnglesQ.randomFromDifficulty(type, options.difficulty);
          }
          else {
              // choose subtype
              const availableSubtypes = ['simple', 'repeated', 'algebra', 'worded'];
              const subtypes = [];
              availableSubtypes.forEach(subtype => {
                  if (options[subtype]) {
                      subtypes.push(subtype);
                  }
              });
              const subtype = randElem(subtypes);
              // build options object
              let questionOptions = {};
              if (subtype === 'simple' || subtype === 'repeated') {
                  questionOptions = {};
              }
              else if (subtype === 'algebra') {
                  questionOptions = options.algebraOptions;
              }
              else if (subtype === 'worded') {
                  questionOptions = options.wordedOptions;
              }
              questionOptions.minN = options.minN;
              questionOptions.maxN = options.maxN;
              return MissingAnglesQ.randomFromTypeWithOptions(type, subtype, questionOptions);
          }
      }
      static randomFromDifficulty(type, difficulty) {
          let subtype;
          const questionOptions = {};
          switch (difficulty) {
              case 1:
                  subtype = 'simple';
                  questionOptions.minN = 2;
                  questionOptions.maxN = 2;
                  break;
              case 2:
                  subtype = 'simple';
                  questionOptions.minN = 3;
                  questionOptions.maxN = 4;
                  break;
              case 3:
                  subtype = 'repeated';
                  questionOptions.minN = 3;
                  questionOptions.maxN = 4;
                  break;
              case 4:
                  subtype = 'algebra';
                  questionOptions.expressionTypes = ['multiply'];
                  questionOptions.includeConstants = false;
                  questionOptions.minN = 2;
                  questionOptions.maxN = 4;
                  break;
              case 5:
                  subtype = 'algebra';
                  questionOptions.expressionTypes = ['add', 'multiply'];
                  questionOptions.includeConstants = ['multiply'];
                  questionOptions.ensureX = true;
                  questionOptions.minN = 2;
                  questionOptions.maxN = 3;
                  break;
              case 6:
                  subtype = 'algebra';
                  questionOptions.expressionTypes = ['mixed'];
                  questionOptions.minN = 2;
                  questionOptions.maxN = 3;
                  break;
              case 7:
                  subtype = 'worded';
                  questionOptions.types = [randElem(['add', 'multiply'])];
                  questionOptions.minN = questionOptions.maxN = 2;
                  break;
              case 8:
                  subtype = 'worded';
                  questionOptions.types = ['add', 'multiply'];
                  questionOptions.minN = questionOptions.maxN = 3;
                  break;
              case 9:
                  subtype = 'worded';
                  questionOptions.types = ['multiply', 'ratio'];
                  questionOptions.minN = questionOptions.maxN = 3;
                  break;
              case 10:
                  subtype = 'worded';
                  questionOptions.types = ['multiply', 'add', 'ratio', 'percent'];
                  questionOptions.minN = questionOptions.maxN = 3;
                  break;
              default:
                  throw new Error(`Can't generate difficulty ${difficulty}`);
          }
          return this.randomFromTypeWithOptions(type, subtype, questionOptions);
      }
      static randomFromTypeWithOptions(type, subtype, questionOptions, viewOptions) {
          let question;
          questionOptions = questionOptions || {};
          viewOptions = viewOptions || {};
          switch (type) {
              case 'aaap':
              case 'aosl': {
                  questionOptions.angleSum = (type === 'aaap') ? 360 : 180;
                  switch (subtype) {
                      case 'simple':
                      case 'repeated':
                          questionOptions.repeated = subtype === 'repeated';
                          question = MissingAnglesAroundQ.random(questionOptions, viewOptions);
                          break;
                      case 'algebra':
                          question = MissingAnglesAroundAlgebraQ.random(questionOptions, viewOptions);
                          break;
                      case 'worded':
                          question = MissingAnglesWordedQ.random(questionOptions, viewOptions);
                          break;
                      default:
                          throw new Error(`unexpected subtype ${subtype}`);
                  }
                  break;
              }
              case 'triangle': {
                  questionOptions.repeated = (subtype === 'repeated');
                  switch (subtype) {
                      case 'simple':
                      case 'repeated':
                          question = MissingAnglesTriangleQ.random(questionOptions, viewOptions);
                          break;
                      case 'algebra':
                          question = MissingAnglesTriangleAlgebraQ.random(questionOptions, viewOptions);
                          break;
                      case 'worded':
                          question = MissingAnglesTriangleWordedQ.random(questionOptions, viewOptions);
                          break;
                      default:
                          throw new Error(`unexpected subtype ${subtype}`);
                  }
                  break;
              }
              default:
                  throw new Error(`Unknown type ${type}`);
          }
          return new MissingAnglesQ(question);
      }
      getDOM() { return this.question.getDOM(); }
      render() { this.question.render(); }
      showAnswer() { this.question.showAnswer(); }
      hideAnswer() { this.question.hideAnswer(); }
      toggleAnswer() { this.question.toggleAnswer(); }
      static get optionsSpec() {
          return [
              {
                  type: 'heading',
                  title: ''
              },
              {
                  title: 'Types',
                  id: 'types',
                  type: 'select-inclusive',
                  selectOptions: [
                      { title: 'On a straight line', id: 'aosl' },
                      { title: 'Around a point', id: 'aaap' },
                      { title: 'Triangle', id: 'triangle' }
                  ],
                  default: ['aosl', 'aaap', 'triangle'],
                  vertical: true
              },
              {
                  type: 'column-break'
              },
              {
                  type: 'bool',
                  title: '<b>Custom settings (disables difficulty)</b>',
                  default: false,
                  id: 'custom'
              },
              {
                  type: 'range',
                  id: 'n-angles',
                  idLB: 'minN',
                  idUB: 'maxN',
                  defaultLB: 2,
                  defaultUB: 4,
                  min: 2,
                  max: 8,
                  title: 'Number of angles',
                  enabledIf: 'custom'
              },
              {
                  type: 'bool',
                  title: 'Simple',
                  id: 'simple',
                  default: true,
                  enabledIf: 'custom'
              },
              {
                  type: 'bool',
                  title: 'Repeated/Isosceles',
                  id: 'repeated',
                  default: true,
                  enabledIf: 'custom'
              },
              {
                  type: 'bool',
                  title: 'Algebraic',
                  id: 'algebra',
                  default: true,
                  enabledIf: 'custom'
              },
              {
                  type: 'suboptions',
                  title: '',
                  id: 'algebraOptions',
                  optionsSpec: MissingAnglesAroundAlgebraQ.optionsSpec,
                  enabledIf: 'custom&algebra'
              },
              {
                  type: 'bool',
                  title: 'Worded',
                  id: 'worded',
                  default: true,
                  enabledIf: 'custom'
              },
              {
                  type: 'suboptions',
                  title: '',
                  id: 'wordedOptions',
                  optionsSpec: MissingAnglesWordedQ.optionsSpec,
                  enabledIf: 'custom&worded'
              }
          ];
      }
      static get commandWord() {
          return 'Find the missing value';
      }
  }

  class RectangleAreaData {
      constructor(base, height, showOpposites, dp, denominator, areaProperties, perimeterProperties) {
          this.denominator = 1;
          this.base = base;
          this.height = height;
          this.showOpposites = showOpposites;
          this.dp = dp;
          this.denominator = denominator;
          this._area = areaProperties;
          this._perimeter = perimeterProperties;
      }
      static random(options) {
          options.maxLength = options.maxLength || 20; // default values
          const dp = options.dp || 0;
          const denominator = options.fraction ? randBetween(2, 6) : 1;
          const sides = {
              base: randBetween(1, options.maxLength),
              height: randBetween(1, options.maxLength)
          };
          const base = { val: sides.base, show: true, missing: false, label: scaledStr(sides.base, dp) + "\\mathrm{cm}" };
          const height = { val: sides.height, show: true, missing: false, label: scaledStr(sides.height, dp) + "\\mathrm{cm}" };
          if (denominator > 1) {
              [base, height].forEach(v => {
                  v.label = new fraction$1(v.val, denominator).toLatex(true) + '\\mathrm{cm}';
              });
          }
          let showOpposites;
          const areaProperties = {};
          const perimeterProperties = {};
          // selectively hide/missing depending on type
          switch (options.questionType) {
              case 'area':
                  areaProperties.show = true;
                  areaProperties.missing = true;
                  showOpposites = !options.noDistractors;
                  break;
              case 'perimeter':
                  perimeterProperties.show = true;
                  perimeterProperties.missing = true;
                  showOpposites = options.noDistractors;
                  break;
              case 'reverseArea':
                  areaProperties.show = true;
                  areaProperties.missing = false;
                  randElem([base, height]).missing = true;
                  showOpposites = false;
                  break;
              case 'reversePerimeter':
              default:
                  perimeterProperties.show = true;
                  perimeterProperties.missing = false;
                  randElem([base, height]).missing = true;
                  showOpposites = false;
                  break;
          }
          return new this(base, height, showOpposites, dp, denominator, areaProperties, perimeterProperties);
      }
      get perimeter() {
          if (!this._perimeter) {
              this._perimeter = {
                  show: false,
                  missing: true
              };
          }
          if (!this._perimeter.val) {
              this._perimeter.val = 2 * (this.base.val + this.height.val);
              if (this.denominator > 1) {
                  this._perimeter.label = new fraction$1(this._perimeter.val, this.denominator).toLatex(true) + '\\mathrm{cm}';
              }
              else {
                  this._perimeter.label = scaledStr(this._perimeter.val, this.dp) + '\\mathrm{cm}';
              }
          }
          return this._perimeter;
      }
      get area() {
          if (!this._area) {
              this._area = {
                  show: false,
                  missing: true
              };
          }
          if (!this._area.val) {
              this._area.val = this.base.val * this.height.val;
              if (this.denominator > 1) {
                  this._area.label = new fraction$1(this._area.val, Math.pow(this.denominator, 2)).toLatex(true) + '\\mathrm{cm}^2';
              }
              else {
                  this._area.label = scaledStr(this._area.val, 2 * this.dp) + '\\mathrm{cm}^2';
              }
          }
          return this._area;
      }
  }

  /**
   * 
   * @param {CanvasRenderingContext2D} ctx The context
   * @param {Point} pt1 A point
   * @param {Point} pt2 A point
   * @param {number} size The size of the array to draw
   * @param {number} [m=0.5] The 'sharpness' of the point. Smaller is pointier
   */
  function arrowLine (ctx, pt1, pt2, size, m=0.5) {

    const unit = Point.unitVector(pt1, pt2);
    unit.x *= size;
    unit.y *= size;
    const normal = { x: -unit.y, y: unit.x };
    normal.x *= m;
    normal.y *= m;

    const control1 = pt2.clone()
      .translate(-unit.x, -unit.y)
      .translate(normal.x, normal.y);

    const control2 = pt2.clone()
      .translate(-unit.x, -unit.y)
      .translate(-normal.x, -normal.y);

    ctx.moveTo(pt1.x, pt1.y);
    ctx.lineTo(pt2.x, pt2.y);
    ctx.lineTo(control1.x, control1.y);
    ctx.moveTo(pt2.x, pt2.y);
    ctx.lineTo(control2.x, control2.y);
  }

  /**
   * Draw a right angle symbol for angle AOC. NB: no check is made that AOC is indeed a right angle
   * @param {CanvasRenderingContext2D} ctx The context to draw in
   * @param {Point} A Start point
   * @param {Point} O Vertex point
   * @param {Point} C End point
   * @param {number} size Size of right angle
   */
  function drawRightAngle (ctx, A, O, C, size) {
    const unitOA = Point.unitVector(O, A);
    const unitOC = Point.unitVector(O, C);
    const ctl1 = O.clone().translate(unitOA.x * size, unitOA.y * size);
    const ctl2 = ctl1.clone().translate(unitOC.x * size, unitOC.y * size);
    const ctl3 = O.clone().translate(unitOC.x * size, unitOC.y * size);
    ctx.moveTo(ctl1.x, ctl1.y);
    ctx.lineTo(ctl2.x, ctl2.y);
    ctx.lineTo(ctl3.x, ctl3.y);
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
  function parallelSign (ctx, A, B, size=10, number=1, gap=size) {
    const unit = Point.unitVector(A, B);
    unit.x *= size;
    unit.y *= size;
    const normal = { x: -unit.y, y: unit.x };

    const M = Point.mean(A, B);

    for (let i = 0; i < number; i++) {
      const ctl2 = M.clone().moveToward(B, i * gap);
      const ctl1 = ctl2.clone()
        .translate(-unit.x, -unit.y)
        .translate(normal.x, normal.y);
      const ctl3 = ctl2.clone()
        .translate(-unit.x, -unit.y)
        .translate(-normal.x, -normal.y);

      ctx.moveTo(ctl1.x, ctl1.y);
      ctx.lineTo(ctl2.x, ctl2.y);
      ctx.lineTo(ctl3.x, ctl3.y);
    }
  }

  const colors = ['LightCyan', 'LightYellow', 'Pink', 'LightGreen', 'LightBlue', 'Ivory', 'LightGray'];

  class RectangleAreaView extends GraphicQView {
      constructor(A, B, C, D, labels, data, viewOptions) {
          /* Super does:
           *  Sets this.width and this.height
           *  Sets this.data
           *  Creates DOM elements, including canvas
           *  Creates empty this.labels list
           */
          super(data, viewOptions); // initialises this.data
          this.A = A;
          this.B = B;
          this.C = C;
          this.D = D;
          this.labels = labels;
      }
      /**
       * Static factory method returning view from data
       * @param data A data object, which had details of width, height and area
       * @param viewOptions View options - containing width and height
       */
      static fromData(data, viewOptions) {
          var _a, _b, _c, _d, _e, _f;
          // Defaults (NB: duplicates effort in constructor, given use of static factory constructor instead of GraphicQ's method)
          viewOptions = viewOptions !== null && viewOptions !== void 0 ? viewOptions : {};
          viewOptions.width = (_a = viewOptions.width) !== null && _a !== void 0 ? _a : 300;
          viewOptions.height = (_b = viewOptions.height) !== null && _b !== void 0 ? _b : 300;
          // initial points
          const A = new Point(0, 0);
          const B = new Point(0, data.height.val);
          const C = new Point(data.base.val, data.height.val);
          const D = new Point(data.base.val, 0);
          // rotate, scale and center
          const rotation = (_c = viewOptions.rotation) !== null && _c !== void 0 ? _c : 2 * Math.PI * Math.random();
          [A, B, C, D].forEach(pt => pt.rotate(rotation));
          Point.scaleToFit([A, B, C, D], viewOptions.width, viewOptions.height, 100, [0, 20]);
          // Set up labels
          const labels = [];
          const sides = [
              [A, B, data.height],
              [B, C, data.base]
          ];
          if (data.showOpposites) {
              sides.push([C, D, data.height]);
              sides.push([D, A, data.base]);
          }
          for (let i = 0, n = sides.length; i < n; i++) { // sides
              if (!sides[i][2].show)
                  continue;
              const offset = 20;
              const pos = Point.mean(sides[i][0], sides[i][1]);
              const unitvec = Point.unitVector(sides[i][0], sides[i][1]);
              pos.translate(-unitvec.y * offset, unitvec.x * offset);
              const texta = (_d = sides[i][2].label) !== null && _d !== void 0 ? _d : sides[i][2].val.toString();
              const textq = sides[i][2].missing ? '?' : texta;
              const styleq = 'normal';
              const stylea = sides[i][2].missing ? 'answer' : 'normal';
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
          let nInfo = 0;
          if (data.area.show) {
              const texta = (_e = data.area.label) !== null && _e !== void 0 ? _e : data.area.val.toString();
              const textq = data.area.missing ? '?' : texta;
              const styleq = 'extra-info';
              const stylea = data.area.missing ? 'extra-answer' : 'extra-info';
              labels.push({
                  texta: '\\text{Area} = ' + texta,
                  textq: '\\text{Area} = ' + textq,
                  text: '\\text{Area} = ' + textq,
                  styleq: styleq,
                  stylea: stylea,
                  style: styleq,
                  pos: new Point(10, viewOptions.height - 10 - 15 * nInfo)
              });
              nInfo++;
          }
          if (data.perimeter.show) {
              const texta = (_f = data.perimeter.label) !== null && _f !== void 0 ? _f : data.perimeter.val.toString();
              const textq = data.perimeter.missing ? '?' : texta;
              const styleq = 'extra-info';
              const stylea = data.perimeter.missing ? 'extra-answer' : 'extra-info';
              labels.push({
                  pos: new Point(10, viewOptions.height - 10 - 20 * nInfo),
                  texta: '\\text{Perimeter} = ' + texta,
                  textq: '\\text{Perimeter} = ' + textq,
                  text: '\\text{Perimeter} = ' + textq,
                  styleq: styleq,
                  stylea: stylea,
                  style: styleq
              });
          }
          return new RectangleAreaView(A, B, C, D, labels, data, viewOptions);
      }
      render() {
          const ctx = this.canvas.getContext('2d');
          if (ctx === null) {
              throw new Error('Could not get context');
          }
          ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // clear
          ctx.setLineDash([]);
          // draw rectangle
          ctx.beginPath();
          ctx.moveTo(this.A.x, this.A.y);
          ctx.lineTo(this.B.x, this.B.y);
          ctx.lineTo(this.C.x, this.C.y);
          ctx.lineTo(this.D.x, this.D.y);
          ctx.lineTo(this.A.x, this.A.y);
          ctx.stroke();
          ctx.fillStyle = randElem(colors);
          ctx.fill();
          ctx.closePath();
          // right angles
          const size = Math.min(15, Math.min(Point.distance(this.A, this.B), Point.distance(this.B, this.C)) / 3);
          ctx.beginPath();
          drawRightAngle(ctx, this.A, this.B, this.C, size);
          drawRightAngle(ctx, this.B, this.C, this.D, size);
          drawRightAngle(ctx, this.C, this.D, this.A, size);
          drawRightAngle(ctx, this.D, this.A, this.B, size);
          ctx.stroke();
          ctx.closePath();
          this.renderLabels();
      }
  }

  // Rectangle needs no further options
  // Triangle needs no further options -- needs passing in
  class RectangleAreaQ extends GraphicQ {
      static random(options, viewOptions) {
          const data = RectangleAreaData.random(options);
          const view = RectangleAreaView.fromData(data, viewOptions);
          return new this(data, view);
      }
      static get commandWord() {
          return 'Find the missing values';
      }
  }

  class TrapeziumAreaData {
      constructor(a, b, height, side1, side2, b1, b2, dp, denominator, perimeterProperties, areaProperties) {
          this.dp = 0;
          this.denominator = 1;
          this.a = a;
          this.b = b;
          this.height = height;
          this.side1 = side1;
          this.side2 = side2;
          this.b1 = b1;
          this.b2 = b2;
          this.dp = dp;
          this.denominator = denominator;
          this._perimeter = perimeterProperties;
          this._area = areaProperties;
      }
      get perimeter() {
          if (!this._perimeter) {
              this._perimeter = {
                  show: false,
                  missing: true
              };
          }
          if (!this._perimeter.val) {
              this._perimeter.val = this.a.val + this.b.val + this.side1.val + this.side2.val;
              if (this.denominator > 1) {
                  this._perimeter.label = new fraction$1(this._perimeter.val, this.denominator).toLatex(true) + '\\mathrm{cm}';
              }
              else {
                  this._perimeter.label = scaledStr(this._perimeter.val, this.dp) + '\\mathrm{cm}';
              }
          }
          return this._perimeter;
      }
      get area() {
          if (!this._area) {
              this._area = {
                  show: false,
                  missing: true
              };
          }
          if (!this._area.val) {
              this._area.val = this.height.val * (this.a.val + this.b.val) / 2;
              if (this.denominator > 1) {
                  this._area.label = new fraction$1(this._area.val, Math.pow(this.denominator, 2)).toLatex(true) + '\\mathrm{cm}^2';
              }
              else {
                  this._area.label = scaledStr(this._area.val, 2 * this.dp) + '\\mathrm{cm}^2';
              }
          }
          return this._area;
      }
      static random(options) {
          const dp = options.dp; // don't actually scale - just do this in display
          const denominator = options.fraction ? randBetween(2, 6) : 1;
          let aValue; //shorted parallel side
          let bValue; // longer parallel side
          let s1Value;
          let s2Value;
          let hValue; // final sides and height
          let b1;
          let b2; // bits of longest parallel side. b=a+b1+b2
          let triangle1;
          let triangle2; // two ra triangles
          triangle1 = randPythagTriple(options.maxLength);
          s1Value = triangle1.c;
          if (Math.random() < 0.5) { // stick a ra triangle on one side
              hValue = triangle1.a;
              b1 = triangle1.b;
          }
          else {
              hValue = triangle1.b;
              b1 = triangle1.a;
          }
          if (Math.random() < 0.9) { // stick a triangle on the other side
              triangle2 = randPythagTripleWithLeg(hValue, options.maxLength);
              s2Value = triangle2.c;
              b2 = triangle2.b; // tri2.a =: h
          }
          else { // right-angled trapezium
              s2Value = hValue;
              b2 = 0;
          }
          // Find a value
          const MINPROP = 8; // the final length of a withh be at least (1/MINPROP) of the final length of b. I.e. a is more than 1/8 of b
          const maxAValue = Math.min(options.maxLength - b1 - b2, MINPROP * hValue);
          const minAValue = Math.ceil((b1 + b2) / (MINPROP - 1));
          console.log();
          if (maxAValue - minAValue < 1) { // will overshoot maxLength a bi
              aValue = Math.floor(minAValue);
              console.warn(`Overshooting max length by necessity. s1=${s1Value}, s2=${s2Value}, a=${aValue}`);
          }
          else {
              aValue = randBetween(minAValue, maxAValue);
          }
          bValue = b1 + b2 + aValue;
          const a = { val: aValue, show: true, missing: false };
          const b = { val: bValue, show: true, missing: false };
          const height = {
              val: hValue,
              show: s2Value !== hValue,
              missing: false
          };
          const side1 = { val: s1Value, show: true, missing: false };
          const side2 = { val: s2Value, show: true, missing: false };
          const areaProperties = { show: false, missing: false };
          const perimeterProperties = { show: false, missing: false };
          // selectively hide/missing depending on type
          switch (options.questionType) {
              case 'area':
                  areaProperties.show = true;
                  areaProperties.missing = true;
                  break;
              case 'perimeter':
                  perimeterProperties.show = true;
                  perimeterProperties.missing = true;
                  break;
              case 'reverseArea': // hide one of b or height
                  areaProperties.show = true;
                  areaProperties.missing = false;
                  if (Math.random() < 0.3)
                      height.missing = true;
                  else if (Math.random() < 0.5)
                      b.missing = true;
                  else
                      a.missing = true;
                  break;
              case 'reversePerimeter':
              default: {
                  perimeterProperties.show = true;
                  perimeterProperties.missing = false;
                  randElem([side1, side2, a, b]).missing = true;
                  break;
              }
          }
          // labels for sides depending on dp and denominator settings
          if (denominator === 1) {
              [a, b, side1, side2, height].forEach(v => {
                  v.label = scaledStr(v.val, dp) + '\\mathrm{cm}';
              });
          }
          else {
              [a, b, side1, side2, height].forEach(v => {
                  v.label = new fraction$1(v.val, denominator).toLatex(true) + '\\mathrm{cm}';
              });
          }
          // turn of distractors if necessary
          if (options.noDistractors) {
              if (options.questionType === 'area' || options.questionType === 'reverseArea') {
                  side1.show = false;
                  side2.show = !height.show; // show only if height is already hidden (i.e. if right angled)
              }
              else if (options.questionType === 'perimeter' || options.questionType === 'reversePerimeter') {
                  height.show = false;
              }
          }
          return new TrapeziumAreaData(a, b, height, side1, side2, b1, b2, dp, denominator, perimeterProperties, areaProperties);
      }
  }

  class TrapeziumAreaView extends GraphicQView {
      constructor(data, viewOptions, A, B, C, D, ht1, ht2, labels) {
          super(data, viewOptions);
          this.A = A;
          this.B = B;
          this.C = C;
          this.D = D;
          this.ht1 = ht1;
          this.ht2 = ht2;
          this.labels = labels;
      }
      static fromData(data, viewOptions) {
          var _a, _b, _c, _d, _e, _f;
          // Defaults (NB: duplicates effort in constructor, given use of static factory constructor instead of GraphicQ's method)
          viewOptions = viewOptions !== null && viewOptions !== void 0 ? viewOptions : {};
          viewOptions.width = (_a = viewOptions.width) !== null && _a !== void 0 ? _a : 300;
          viewOptions.height = (_b = viewOptions.height) !== null && _b !== void 0 ? _b : 300;
          // initial points
          const A = new Point(0, 0);
          const B = new Point(data.b1, data.height.val);
          const C = new Point(data.b1 + data.a.val, data.height.val);
          const D = new Point(data.b.val, 0);
          const ht1 = new Point(data.b1 + data.a.val / 2, data.height.val);
          const ht2 = new Point(data.b1 + data.a.val / 2, 0);
          // rotate
          const rotation = (_c = viewOptions.rotation) !== null && _c !== void 0 ? _c : 2 * Math.PI * Math.random();
          [A, B, C, D, ht1, ht2].forEach(pt => pt.rotate(rotation));
          Point.scaleToFit([A, B, C, D, ht1, ht2], viewOptions.width, viewOptions.height, 100, [0, 20]);
          // labels
          const labels = [];
          const sides = [
              [A, B, data.side1],
              [B, C, data.a],
              [C, D, data.side2],
              [D, A, data.b],
              [ht1, ht2, data.height]
          ];
          for (let i = 0, n = sides.length; i < n; i++) { //sides
              if (!sides[i][2].show)
                  continue;
              const offset = 25;
              let pos = Point.mean(sides[i][0], sides[i][1]);
              const unitvec = Point.unitVector(sides[i][0], sides[i][1]);
              pos.translate(-unitvec.y * offset, unitvec.x * offset);
              const texta = (_d = sides[i][2].label) !== null && _d !== void 0 ? _d : sides[i][2].val.toString();
              const textq = sides[i][2].missing ? "?" : texta;
              const styleq = "normal";
              const stylea = sides[i][2].missing ? "answer" : "normal";
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
              const texta = (_e = data.area.label) !== null && _e !== void 0 ? _e : data.area.val.toString();
              const textq = data.area.missing ? "?" : texta;
              const styleq = "extra-info";
              const stylea = data.area.missing ? "extra-answer" : "extra-info";
              labels.push({
                  texta: "\\text{Area} = " + texta,
                  textq: "\\text{Area} = " + textq,
                  text: "\\text{Area} = " + textq,
                  styleq: styleq,
                  stylea: stylea,
                  style: styleq,
                  pos: new Point(10, viewOptions.height - 10 - 20 * n_info),
              });
              n_info++;
          }
          if (data.perimeter.show) {
              const texta = (_f = data.perimeter.label) !== null && _f !== void 0 ? _f : data.perimeter.val.toString();
              const textq = data.perimeter.missing ? "?" : texta;
              const styleq = "extra-info";
              const stylea = data.perimeter.missing ? "extra-answer" : "extra-info";
              labels.push({
                  pos: new Point(10, viewOptions.height - 10 - 20 * n_info),
                  texta: "\\text{Perimeter} = " + texta,
                  textq: "\\text{Perimeter} = " + textq,
                  text: "\\text{Perimeter} = " + textq,
                  styleq: styleq,
                  stylea: stylea,
                  style: styleq,
              });
          }
          return new TrapeziumAreaView(data, viewOptions, A, B, C, D, ht1, ht2, labels);
      }
      render() {
          const ctx = this.canvas.getContext("2d");
          if (!ctx)
              throw new Error('Could not get canvas context');
          ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // clear
          ctx.setLineDash([]);
          // draw parallelogram
          ctx.beginPath();
          ctx.moveTo(this.A.x, this.A.y);
          ctx.lineTo(this.B.x, this.B.y);
          ctx.lineTo(this.C.x, this.C.y);
          ctx.lineTo(this.D.x, this.D.y);
          ctx.lineTo(this.A.x, this.A.y);
          ctx.stroke();
          ctx.fillStyle = randElem(colors);
          ctx.fill();
          ctx.closePath();
          // parallel signs 
          ctx.beginPath();
          parallelSign(ctx, this.B, this.ht1, 5);
          parallelSign(ctx, this.A, this.ht2, 5);
          ctx.stroke();
          ctx.closePath();
          // draw height
          if (this.data.height.show) {
              ctx.beginPath();
              arrowLine(ctx, Point.mean(this.ht1, this.ht2), this.ht1, 8);
              arrowLine(ctx, Point.mean(this.ht1, this.ht2), this.ht2, 8);
              ctx.stroke();
              ctx.closePath();
              // RA symbol
              ctx.beginPath();
              ctx.setLineDash([]);
              drawRightAngle(ctx, this.ht1, this.ht2, this.D, 12);
              ctx.stroke();
              ctx.closePath();
          }
          // ra symbol for right angled trapezia
          if (this.data.height.val === this.data.side2.val) {
              ctx.beginPath();
              drawRightAngle(ctx, this.B, this.C, this.D, 12);
              drawRightAngle(ctx, this.C, this.D, this.A, 12);
              ctx.stroke();
          }
          this.renderLabels();
      }
  }

  class TrapeziumAreaQ extends GraphicQ {
      static random(options, viewOptions) {
          const data = TrapeziumAreaData.random(options);
          const view = TrapeziumAreaView.fromData(data, viewOptions);
          return new this(data, view);
      }
      static get commandWord() {
          return 'Find the missing values';
      }
  }

  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation.

  Permission to use, copy, modify, and/or distribute this software for any
  purpose with or without fee is hereby granted.

  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  PERFORMANCE OF THIS SOFTWARE.
  ***************************************************************************** */

  function __awaiter(thisArg, _arguments, P, generator) {
      function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
      return new (P || (P = Promise))(function (resolve, reject) {
          function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
          function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
          function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
  }

  const pathRoot = '/dist/';
  const dataSources = {
      100: {
          length: 361,
          path: '/data/triangles0-100.json',
          status: 'uncached',
          data: [],
          queue: []
      },
      200: {
          length: 715,
          path: '/data/triangles100-200.json',
          status: 'uncached',
          data: [],
          queue: []
      },
      300: {
          length: 927,
          path: '/data/triangles200-300.json',
          status: 'uncached',
          data: [],
          queue: []
      },
      400: {
          length: 1043,
          path: '/data/triangles300-400.json',
          status: 'uncached',
          data: [],
          queue: []
      },
      500: {
          length: 1151,
          path: '/data/triangles400-500.json',
          status: 'uncached',
          data: [],
          queue: []
      }
  };
  /**
   * Return a promise to a randomly chosen triangle (see triangleData.Triangle interface for format)
   * @param maxLength Maxumum length of side
   * @param filterPredicate Restrict to triangles with this property
   */
  function getTriangle(maxLength, filterPredicate) {
      let triangle;
      filterPredicate = filterPredicate !== null && filterPredicate !== void 0 ? filterPredicate : (t => true); // default value for predicate is tautology
      // Choose multiple of 50 to select from - smooths out distribution.
      // (Otherwise it's biased towards higher lengths)
      if (maxLength > 500)
          maxLength = 500;
      const bin50 = randMultBetween(0, maxLength - 1, 50) + 50; // e.g. if bin50 = 150, choose with a maxlength between 100 and 150
      const bin100 = (Math.ceil(bin50 / 100) * 100).toString(); // e.g. if bin50 = 150, bin100 = Math.ceil(1.5)*100 = 200
      const dataSource = dataSources[bin100];
      if (dataSource.status === 'cached') { // Cached - just load data
          console.log('Using cached data');
          triangle = randElem(dataSource.data.filter(t => maxSide(t) < maxLength && filterPredicate(t)));
          return Promise.resolve(triangle);
      }
      else if (dataSource.status === 'pending') { // pending - put callback into queue
          console.log('Pending: adding request to queue');
          return new Promise((resolve, reject) => {
              dataSource.queue.push({ callback: resolve, maxLength: maxLength, filter: filterPredicate });
          });
      }
      else { // nobody has loaded yet
          console.log('Loading data with XHR');
          dataSource.status = 'pending';
          return fetch(`${pathRoot}${dataSource.path}`).then(response => {
              if (!response.ok) {
                  return Promise.reject(response.statusText);
              }
              else {
                  return response.json();
              }
          }).then(data => {
              dataSource.data = data;
              dataSource.status = 'cached';
              dataSource.queue.forEach(({ callback, maxLength, filter }) => {
                  filter = filter !== null && filter !== void 0 ? filter : (t => true);
                  const triangle = randElem(data.filter((t) => maxSide(t) < maxLength && filter(t)));
                  console.log('loading from queue');
                  callback(triangle);
              });
              triangle = randElem(data.filter((t) => maxSide(t) < maxLength && filterPredicate(t)));
              return triangle;
          });
      }
  }
  function maxSide(triangle) {
      return Math.max(triangle.b, triangle.s1, triangle.s2);
  }

  class TriangleAreaData {
      constructor(base, side1, side2, height, dp, denominator, areaProperties, perimeterProperties) {
          this.denominator = 1;
          this.base = base;
          this.side1 = side1;
          this.side2 = side2;
          this.height = height;
          this.dp = dp;
          this.denominator = denominator;
          this._area = areaProperties;
          this._perimeter = perimeterProperties;
      }
      get perimeter() {
          if (!this._perimeter) { // defaults for properties
              this._perimeter = {
                  show: false,
                  missing: true
              };
          }
          if (!this._perimeter.val) {
              this._perimeter.val = this.base.val + this.side1.val + this.side2.val;
              if (this.denominator > 1) {
                  this._perimeter.label = new fraction$1(this._perimeter.val, this.denominator).toLatex(true) + '\\mathrm{cm}';
              }
              else {
                  this._perimeter.label = scaledStr(this._perimeter.val, this.dp) + '\\mathrm{cm}';
              }
          }
          return this._perimeter;
      }
      get area() {
          if (!this._area) {
              this._area = {
                  show: false,
                  missing: true
              };
          }
          if (!this._area.val) {
              this._area.val = this.base.val * this.height.val / 2;
              if (this.denominator > 1) {
                  this._area.label = new fraction$1(this._area.val, Math.pow(this.denominator, 2)).toLatex(true) + '\\mathrm{cm}^2';
              }
              else {
                  this._area.label = scaledStr(this._area.val, 2 * this.dp) + '\\mathrm{cm}^2';
              }
          }
          return this._area;
      }
      isRightAngled() {
          const triangle = {
              b: this.base.val,
              h: this.height.val,
              s1: this.side1.val,
              s2: this.side2.val
          };
          return isRightAngled(triangle);
      }
      static random(options) {
          return __awaiter(this, void 0, void 0, function* () {
              options.maxLength = options.maxLength || 20;
              const dp = options.dp || 0;
              const denominator = options.fraction ? randBetween(2, 6) : 1;
              const requireIsosceles = (options.questionType === 'pythagorasIsoscelesArea');
              const requireRightAngle = (options.questionType === 'pythagorasArea' || options.questionType === 'pythagorasPerimeter');
              // get a triangle. TD.getTriangle is async, so need to await
              const triangle = yield getTriangle(options.maxLength, t => (!requireIsosceles || isIsosceles(t)) &&
                  (!requireRightAngle || isRightAngled(t)));
              // useful for some logic next
              // nb only refers to RA triangles wher the hypotenuse is not the 'base'
              const rightAngled = isRightAngled(triangle);
              const base = { val: triangle.b, show: true, missing: false };
              const height = { val: triangle.h, show: !rightAngled, missing: false }; // hide height in RA triangles
              const side1 = { val: triangle.s1, show: true, missing: false };
              const side2 = { val: triangle.s2, show: true, missing: false };
              [base, height, side1, side2].forEach(v => {
                  if (denominator === 1) {
                      v.label = scaledStr(v.val, dp) + '\\mathrm{cm}';
                  }
                  else {
                      v.label = new fraction$1(v.val, denominator).toLatex(true) + "\\mathrm{cm}";
                  }
              });
              // Some aliases useful when reasoning about RA triangles
              // NB (a) these are refs to same object, not copies
              // (b) not very meaningful for non RA triangles
              const leg1 = base;
              const leg2 = (side1.val > side2.val) ? side2 : side1;
              const hypotenuse = (side1.val > side2.val) ? side1 : side2;
              const areaProperties = { show: false, missing: true };
              const perimeterProperties = { show: false, missing: true };
              // show/hide based on type
              switch (options.questionType) {
                  case 'area':
                      areaProperties.show = true;
                      areaProperties.missing = true;
                      break;
                  case 'perimeter':
                      perimeterProperties.show = true;
                      perimeterProperties.missing = true;
                      break;
                  case 'reverseArea': {
                      areaProperties.show = true;
                      areaProperties.missing = false;
                      const coinToss = (Math.random() < 0.5); // 50/50 true/false
                      if (rightAngled) { // hide one of the legs
                          if (coinToss)
                              leg1.missing = true;
                          else
                              leg2.missing = true;
                      }
                      else {
                          if (coinToss)
                              base.missing = true;
                          else
                              height.missing = true;
                      }
                      break;
                  }
                  case 'reversePerimeter': {
                      perimeterProperties.show = true;
                      perimeterProperties.missing = false;
                      randElem([base, side1, side2]).missing = true;
                      break;
                  }
                  case 'pythagorasArea':
                      if (!rightAngled)
                          throw new Error('Should have RA triangle here');
                      areaProperties.show = true;
                      areaProperties.missing = true;
                      randElem([leg1, leg2]).show = false;
                      break;
                  case 'pythagorasPerimeter': { // should already have RA triangle
                      if (!rightAngled)
                          throw new Error('Should have RA triangle here');
                      perimeterProperties.show = true;
                      perimeterProperties.missing = true;
                      randElem([leg1, leg2, hypotenuse]).show = false;
                      break;
                  }
                  case 'pythagorasIsoscelesArea':
                  default:
                      areaProperties.show = true;
                      areaProperties.missing = true;
                      height.show = false;
                      break;
              }
              return new TriangleAreaData(base, side1, side2, height, dp, denominator, areaProperties, perimeterProperties);
          });
      }
  }
  function isIsosceles(triangle) {
      return triangle.s1 === triangle.s2;
  }
  function isRightAngled(triangle) {
      return triangle.s1 === triangle.h || triangle.s2 === triangle.h;
  }

  class TriangleAreaView extends GraphicQView {
      // labels: Label[]
      // rotation?: number
      constructor(data, viewOptions, A, B, C, labels) {
          super(data, viewOptions);
          this.A = A;
          this.B = B;
          this.C = C;
          this.labels = labels !== null && labels !== void 0 ? labels : [];
      }
      /**
       * Render into this.canvas
       */
      render() {
          return __awaiter(this, void 0, void 0, function* () {
              // create loading image
              const loader = createElem('div', 'loader', this.DOM);
              // first init if not already
              if (this.A === undefined)
                  yield this.init();
              if (!this.A || !this.B || !this.C || !this.ht) {
                  throw new Error(`Intialisation failed. Points are: ${[this.A, this.B, this.C, this.ht]}`);
              }
              if (this.data instanceof Promise)
                  throw new Error('Initialisation failed: data is still a Promise');
              const ctx = this.canvas.getContext('2d');
              if (ctx === null)
                  throw new Error('Could not get canvas context');
              ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // clear
              ctx.setLineDash([]);
              // draw triangle
              ctx.beginPath();
              ctx.moveTo(this.A.x, this.A.y);
              ctx.lineTo(this.B.x, this.B.y);
              ctx.lineTo(this.C.x, this.C.y);
              ctx.lineTo(this.A.x, this.A.y);
              ctx.stroke();
              ctx.fillStyle = randElem(colors);
              ctx.fill();
              ctx.closePath();
              // draw height
              if (this.data.height.show) {
                  ctx.beginPath();
                  // arrowLine(ctx,this.C,this.ht,10);
                  arrowLine(ctx, Point.mean(this.C, this.ht).moveToward(this.C, 15), this.C, 10);
                  arrowLine(ctx, Point.mean(this.C, this.ht).moveToward(this.ht, 15), this.ht, 10);
                  ctx.stroke();
                  ctx.closePath();
              }
              // right-angle symbol
              if (this.data.isRightAngled() || this.data.height.show) {
                  ctx.beginPath();
                  if (this.A.equals(this.ht)) {
                      drawRightAngle(ctx, this.B, this.ht, this.C, 15);
                  }
                  else {
                      drawRightAngle(ctx, this.A, this.ht, this.C, 15);
                  }
                  ctx.stroke();
                  ctx.closePath();
              }
              if (this.data.height.show && this.overhangRight) {
                  ctx.beginPath();
                  ctx.setLineDash([5, 3]);
                  ctx.moveTo(this.B.x, this.B.y);
                  ctx.lineTo(this.ht.x, this.ht.y);
                  ctx.stroke();
                  ctx.closePath();
              }
              if (this.data.height.show && this.overhangLeft) {
                  ctx.beginPath();
                  ctx.setLineDash([5, 3]);
                  ctx.moveTo(this.A.x, this.A.y);
                  ctx.lineTo(this.ht.x, this.ht.y);
                  ctx.stroke();
                  ctx.closePath();
              }
              this.renderLabels(false, true);
              loader.remove();
          });
      }
      /**
       * Initialise. Instance method rather than static factory method, so instance can control, e.g. loading icon
       * async since data is a promise
       */
      init() {
          var _a, _b, _c, _d;
          return __awaiter(this, void 0, void 0, function* () {
              this.data = yield this.data;
              const h = this.data.height.val;
              const b = this.data.base.val;
              const s1 = this.data.side1.val;
              const s2 = this.data.side2.val;
              // build upside down
              this.A = new Point(0, h);
              this.B = new Point(b, h);
              this.C = new Point((b * b + s1 * s1 - s2 * s2) / (2 * b), 0);
              this.ht = new Point(this.C.x, this.A.y);
              this.overhangRight = false;
              this.overhangLeft = false;
              if (this.C.x > this.B.x) {
                  this.overhangRight = true;
              }
              if (this.C.x < this.A.x) {
                  this.overhangLeft = true;
              }
              // rotate, scale and center
              this.rotation = (_a = this.rotation) !== null && _a !== void 0 ? _a : 2 * Math.PI * Math.random();
              [this.A, this.B, this.C, this.ht].forEach(pt => pt.rotate(this.rotation));
              Point.scaleToFit([this.A, this.B, this.C, this.ht], this.width, this.height, 100, [0, 20]);
              // Making labels - more involved than I remembered!
              // First the labels for the sides
              const sides = [
                  [this.A, this.B, this.data.base],
                  [this.C, this.A, this.data.side1],
                  [this.B, this.C, this.data.side2]
              ];
              // order of putting in height matters for offset
              // This breaks if we have rounding errors
              if (this.ht.equals(this.B)) { //
                  sides.push([this.ht, this.C, this.data.height]);
              }
              else {
                  sides.push([this.C, this.ht, this.data.height]);
              }
              for (let i = 0; i < 4; i++) { // sides
                  if (!sides[i][2].show)
                      continue;
                  const offset = 20; // offset from line by this many pixels
                  const pos = Point.mean(sides[i][0], sides[i][1]); // start at midpoint
                  const unitvec = Point.unitVector(sides[i][0], sides[i][1]);
                  if (i < 3) {
                      pos.translate(-unitvec.y * offset, unitvec.x * offset);
                  }
                  const texta = (_b = sides[i][2].label) !== null && _b !== void 0 ? _b : sides[i][2].val.toString();
                  const textq = sides[i][2].missing ? '?' : texta;
                  const styleq = i === 3 ? 'normal repel-locked' : 'normal';
                  const stylea = sides[i][2].missing ?
                      (i === 3 ? 'answer repel-locked' : 'answer') :
                      (i === 3 ? 'normal repel-locked' : 'normal');
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
              // area and perimeter
              let nInfo = 0;
              if (this.data.area.show) {
                  const texta = (_c = this.data.area.label) !== null && _c !== void 0 ? _c : this.data.area.val.toString();
                  const textq = this.data.area.missing ? '?' : texta;
                  const styleq = 'extra-info';
                  const stylea = this.data.area.missing ? 'extra-answer' : 'extra-info';
                  this.labels.push({
                      texta: '\\text{Area} = ' + texta,
                      textq: '\\text{Area} = ' + textq,
                      text: '\\text{Area} = ' + textq,
                      styleq: styleq,
                      stylea: stylea,
                      style: styleq,
                      pos: new Point(10, this.height - 10 - 15 * nInfo)
                  });
                  nInfo++;
              }
              if (this.data.perimeter.show) {
                  const texta = (_d = this.data.perimeter.label) !== null && _d !== void 0 ? _d : this.data.perimeter.val.toString();
                  const textq = this.data.perimeter.missing ? '?' : texta;
                  const styleq = 'extra-info';
                  const stylea = this.data.perimeter.missing ? 'extra-answer' : 'extra-info';
                  this.labels.push({
                      pos: new Point(10, this.height - 10 - 20 * nInfo),
                      texta: '\\text{Perimeter} = ' + texta,
                      textq: '\\text{Perimeter} = ' + textq,
                      text: '\\text{Perimeter} = ' + textq,
                      styleq: styleq,
                      stylea: stylea,
                      style: styleq
                  });
              }
          });
      }
      static fromAsyncData(data, viewOptions) {
          return new this(data, viewOptions);
      }
  }

  class TriangleAreaQ extends GraphicQ {
      static random(options, viewOptions) {
          const data = TriangleAreaData.random(options);
          const view = TriangleAreaView.fromAsyncData(data, viewOptions);
          return new this(data, view);
      }
      static get commandWord() {
          return 'Find the missing values';
      }
  }

  class AreaPerimeterQ extends Question {
      // DOM: HTMLElement  // in base class
      // answered: boolean // in base class
      constructor(question) {
          super();
          this.question = question;
          this.DOM = question.DOM;
      }
      static random(options) {
          if (!options.custom) {
              const shape = randElem(options.shapes);
              return this.randomFromDifficulty(options.difficulty, shape, options.questionTypesSimple);
          }
      }
      static randomFromDifficulty(difficulty, shape, questionTypes) {
          /** Difficulty guide
           *  1 - Forward, no distractors, small integers
           *  2 - Forward, distractors, small integers
           *  3 - Forward, distractors, larger integers
           *  4 - Forward, distractors, decimals and fractions
           *  5 - Forward, distractors, decimals and fractions - larger
           *  6 - Reverse small integers
           *  7 - Reverse large integers
           *  8 - Reverse decimals and fractions
           *  9 - Reverse decimals and fractions - larger
           * 10 - Pythagoras
          */
          const questionOptions = {
              questionType: randElem(questionTypes),
              dp: 0,
              fraction: false,
              noDistractors: true,
              maxLength: 20
          };
          const viewOptions = {};
          switch (difficulty) {
              case 1:
                  break;
              case 2:
                  questionOptions.noDistractors = false;
                  break;
              case 3:
                  questionOptions.noDistractors = false;
                  questionOptions.maxLength = 100;
                  break;
              case 4: // TODO: fraction
                  if (Math.random() < 0.5) { // decimal
                      questionOptions.dp = 1;
                      questionOptions.maxLength = 99;
                  }
                  else { // fraction
                      questionOptions.fraction = true;
                      questionOptions.maxLength = 15;
                  }
                  questionOptions.noDistractors = false;
                  break;
              case 5:
                  if (Math.random() < 0.5) { // decimal
                      questionOptions.dp = 1;
                      questionOptions.maxLength = 500;
                  }
                  else {
                      questionOptions.fraction = true;
                      questionOptions.maxLength = 100;
                  }
                  questionOptions.noDistractors = false;
                  break;
              case 6:
                  questionOptions.dp = 0;
                  questionOptions.noDistractors = false;
                  questionOptions.questionType = randElem(questionTypes.map(t => reversify(t)));
                  questionOptions.maxLength = 20;
                  break;
              case 7:
                  questionOptions.dp = 0;
                  questionOptions.noDistractors = false;
                  questionOptions.questionType = randElem(questionTypes.map(t => reversify(t)));
                  questionOptions.maxLength = 99;
                  break;
              case 8:
                  questionOptions.dp = 1;
                  questionOptions.noDistractors = false;
                  questionOptions.questionType = randElem(questionTypes.map(t => reversify(t)));
                  questionOptions.maxLength = 99;
                  break;
              case 9:
                  questionOptions.dp = 1;
                  questionOptions.noDistractors = false;
                  questionOptions.questionType = randElem(questionTypes.map(t => reversify(t)));
                  questionOptions.maxLength = 500;
                  break;
              case 10:
              default: // TODO fix this
                  shape = 'triangle';
                  questionOptions.questionType = randElem(['pythagorasArea', 'pythagorasIsoscelesArea', 'pythagorasPerimeter']);
                  break;
          }
          return this.randomWithOptions(shape, questionOptions, viewOptions);
      }
      static randomWithOptions(shape, options, viewOptions) {
          let question;
          switch (shape) {
              case 'rectangle':
                  question = RectangleAreaQ.random(options, viewOptions);
                  break;
              case 'triangle':
                  question = TriangleAreaQ.random(options, viewOptions);
                  break;
              case 'trapezium':
                  question = TrapeziumAreaQ.random(options, viewOptions);
                  break;
              case 'parallelogram':
                  throw new Error('Not yet implemented');
          }
          return new this(question);
      }
      /* Wraps the methods of the wrapped question */
      render() { this.question.render(); }
      showAnswer() { this.question.showAnswer(); }
      hideAnswer() { this.question.hideAnswer(); }
      toggleAnswer() { this.question.toggleAnswer(); }
      static get optionsSpec() {
          return [
              {
                  id: 'shapes',
                  type: 'select-inclusive',
                  selectOptions: [
                      { id: 'rectangle', title: 'Rectangles' },
                      { id: 'triangle', title: 'Triangles' },
                      { id: 'trapezium', title: 'Trapezia' }
                  ],
                  default: ['rectangle', 'triangle', 'trapezium'],
                  title: 'Shapes'
              },
              {
                  id: 'questionTypesSimple',
                  type: 'select-inclusive',
                  selectOptions: [
                      { id: 'area', title: 'Area' },
                      { id: 'perimeter', title: 'Perimeter' }
                  ],
                  default: ['area', 'perimeter'],
                  title: 'Type of question'
              }
          ];
      }
      static get commandWord() {
          return 'Find the missing value';
      }
  }
  /**
   * Prepend 'reverse' to the beginning of a string then camel case it
   * e.g. reversify('area') === 'reverseArea'
   * @param str A string
   * @param prefix The prefix to use
   */
  function reversify(str, prefix = 'reverse') {
      return prefix + str[0].toUpperCase() + str.slice(1);
  }

  const topicList = [
    {
      id: 'algebraic-fraction',
      title: 'Simplify algebraic fractions',
      class: AlgebraicFractionQ
    },
    {
      id: 'add-a-zero',
      title: 'Multiply by 10 (honest!)',
      class: AddAZero
    },
    {
      id: 'integer-add',
      title: 'Add integers (v simple)',
      class: IntegerAddQ
    },
    {
      id: 'missing-angles',
      title: 'Missing angles',
      class: MissingAnglesQ
    },
    {
      id: 'area-perimter',
      title: 'Area and perimeter of shapes',
      class: AreaPerimeterQ
    },
    {
      id: 'equation-of-line',
      title: 'Equation of a line (from two points)',
      class: EquationOfLine
    },
    {
      id: 'arithmagon-add',
      title: 'Arithmagons',
      class: ArithmagonQ
    },
    {
      id: 'test',
      title: 'Test questions',
      class: TestQ
    }
  ];

  function getClass (id) {
    // Return the class given an id of a question

    // Obviously this is an inefficient search, but we don't need massive performance
    for (let i = 0; i < topicList.length; i++) {
      if (topicList[i].id === id) {
        return topicList[i].class
      }
    }

    return null
  }

  function getTitle (id) {
    // Return title of a given id
    //
    return topicList.find(t => (t.id === id)).title
  }

  /**
   * Gets command word from a topic id
   * @param {string} id The topic id
   * @returns {string} Command word. Returns "" if no topic with id
   */
  function getCommandWord (id) {
    const topicClass = getClass(id);
    if (topicClass === null) {
      return ''
    } else {
      return getClass(id).commandWord
    }
  }

  function getTopics () {
    // returns topics with classes stripped out
    return topicList.map(x => ({ id: x.id, title: x.title }))
  }

  function newQuestion (id, options) {
    // to avoid writing `let q = new (TopicChooser.getClass(id))(options)
    const QuestionClass = getClass(id);
    let question;
    if (QuestionClass.random) {
      question = QuestionClass.random(options);
    } else {
      question = new QuestionClass(options);
    }
    return question
  }

  function newOptionsSet (id) {
    const optionsSpec = (getClass(id)).optionsSpec || [];
    return new OptionsSet(optionsSpec)
  }

  function hasOptions (id) {
    return !!(getClass(id).optionsSpec && getClass(id).optionsSpec.length > 0) // weird bool typcasting woo!
  }

  var tingle_min = createCommonjsModule(function (module, exports) {
  !function(t,o){module.exports=o();}(commonjsGlobal,function(){var o=!1;function t(t){this.opts=function(){for(var t=1;t<arguments.length;t++)for(var o in arguments[t])arguments[t].hasOwnProperty(o)&&(arguments[0][o]=arguments[t][o]);return arguments[0]}({},{onClose:null,onOpen:null,beforeOpen:null,beforeClose:null,stickyFooter:!1,footer:!1,cssClass:[],closeLabel:"Close",closeMethods:["overlay","button","escape"]},t),this.init();}function e(){this.modalBoxFooter&&(this.modalBoxFooter.style.width=this.modalBox.clientWidth+"px",this.modalBoxFooter.style.left=this.modalBox.offsetLeft+"px");}return t.prototype.init=function(){if(!this.modal)return function(){this.modal=document.createElement("div"),this.modal.classList.add("tingle-modal"),0!==this.opts.closeMethods.length&&-1!==this.opts.closeMethods.indexOf("overlay")||this.modal.classList.add("tingle-modal--noOverlayClose");this.modal.style.display="none",this.opts.cssClass.forEach(function(t){"string"==typeof t&&this.modal.classList.add(t);},this),-1!==this.opts.closeMethods.indexOf("button")&&(this.modalCloseBtn=document.createElement("button"),this.modalCloseBtn.type="button",this.modalCloseBtn.classList.add("tingle-modal__close"),this.modalCloseBtnIcon=document.createElement("span"),this.modalCloseBtnIcon.classList.add("tingle-modal__closeIcon"),this.modalCloseBtnIcon.innerHTML='<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M.3 9.7c.2.2.4.3.7.3.3 0 .5-.1.7-.3L5 6.4l3.3 3.3c.2.2.5.3.7.3.2 0 .5-.1.7-.3.4-.4.4-1 0-1.4L6.4 5l3.3-3.3c.4-.4.4-1 0-1.4-.4-.4-1-.4-1.4 0L5 3.6 1.7.3C1.3-.1.7-.1.3.3c-.4.4-.4 1 0 1.4L3.6 5 .3 8.3c-.4.4-.4 1 0 1.4z" fill="#000" fill-rule="nonzero"/></svg>',this.modalCloseBtnLabel=document.createElement("span"),this.modalCloseBtnLabel.classList.add("tingle-modal__closeLabel"),this.modalCloseBtnLabel.innerHTML=this.opts.closeLabel,this.modalCloseBtn.appendChild(this.modalCloseBtnIcon),this.modalCloseBtn.appendChild(this.modalCloseBtnLabel));this.modalBox=document.createElement("div"),this.modalBox.classList.add("tingle-modal-box"),this.modalBoxContent=document.createElement("div"),this.modalBoxContent.classList.add("tingle-modal-box__content"),this.modalBox.appendChild(this.modalBoxContent),-1!==this.opts.closeMethods.indexOf("button")&&this.modal.appendChild(this.modalCloseBtn);this.modal.appendChild(this.modalBox);}.call(this),function(){this._events={clickCloseBtn:this.close.bind(this),clickOverlay:function(t){var o=this.modal.offsetWidth-this.modal.clientWidth,e=t.clientX>=this.modal.offsetWidth-15,s=this.modal.scrollHeight!==this.modal.offsetHeight;if("MacIntel"===navigator.platform&&0==o&&e&&s)return;-1!==this.opts.closeMethods.indexOf("overlay")&&!function(t,o){for(;(t=t.parentElement)&&!t.classList.contains(o););return t}(t.target,"tingle-modal")&&t.clientX<this.modal.clientWidth&&this.close();}.bind(this),resize:this.checkOverflow.bind(this),keyboardNav:function(t){-1!==this.opts.closeMethods.indexOf("escape")&&27===t.which&&this.isOpen()&&this.close();}.bind(this)},-1!==this.opts.closeMethods.indexOf("button")&&this.modalCloseBtn.addEventListener("click",this._events.clickCloseBtn);this.modal.addEventListener("mousedown",this._events.clickOverlay),window.addEventListener("resize",this._events.resize),document.addEventListener("keydown",this._events.keyboardNav);}.call(this),document.body.appendChild(this.modal,document.body.firstChild),this.opts.footer&&this.addFooter(),this},t.prototype._busy=function(t){o=t;},t.prototype._isBusy=function(){return o},t.prototype.destroy=function(){null!==this.modal&&(this.isOpen()&&this.close(!0),function(){-1!==this.opts.closeMethods.indexOf("button")&&this.modalCloseBtn.removeEventListener("click",this._events.clickCloseBtn);this.modal.removeEventListener("mousedown",this._events.clickOverlay),window.removeEventListener("resize",this._events.resize),document.removeEventListener("keydown",this._events.keyboardNav);}.call(this),this.modal.parentNode.removeChild(this.modal),this.modal=null);},t.prototype.isOpen=function(){return !!this.modal.classList.contains("tingle-modal--visible")},t.prototype.open=function(){if(!this._isBusy()){this._busy(!0);var t=this;return "function"==typeof t.opts.beforeOpen&&t.opts.beforeOpen(),this.modal.style.removeProperty?this.modal.style.removeProperty("display"):this.modal.style.removeAttribute("display"),this._scrollPosition=window.pageYOffset,document.body.classList.add("tingle-enabled"),document.body.style.top=-this._scrollPosition+"px",this.setStickyFooter(this.opts.stickyFooter),this.modal.classList.add("tingle-modal--visible"),"function"==typeof t.opts.onOpen&&t.opts.onOpen.call(t),t._busy(!1),this.checkOverflow(),this}},t.prototype.close=function(t){if(!this._isBusy()){if(this._busy(!0),"function"==typeof this.opts.beforeClose)if(!this.opts.beforeClose.call(this))return void this._busy(!1);document.body.classList.remove("tingle-enabled"),document.body.style.top=null,window.scrollTo({top:this._scrollPosition,behavior:"instant"}),this.modal.classList.remove("tingle-modal--visible");var o=this;o.modal.style.display="none","function"==typeof o.opts.onClose&&o.opts.onClose.call(this),o._busy(!1);}},t.prototype.setContent=function(t){return "string"==typeof t?this.modalBoxContent.innerHTML=t:(this.modalBoxContent.innerHTML="",this.modalBoxContent.appendChild(t)),this.isOpen()&&this.checkOverflow(),this},t.prototype.getContent=function(){return this.modalBoxContent},t.prototype.addFooter=function(){return function(){this.modalBoxFooter=document.createElement("div"),this.modalBoxFooter.classList.add("tingle-modal-box__footer"),this.modalBox.appendChild(this.modalBoxFooter);}.call(this),this},t.prototype.setFooterContent=function(t){return this.modalBoxFooter.innerHTML=t,this},t.prototype.getFooterContent=function(){return this.modalBoxFooter},t.prototype.setStickyFooter=function(t){return this.isOverflow()||(t=!1),t?this.modalBox.contains(this.modalBoxFooter)&&(this.modalBox.removeChild(this.modalBoxFooter),this.modal.appendChild(this.modalBoxFooter),this.modalBoxFooter.classList.add("tingle-modal-box__footer--sticky"),e.call(this),this.modalBoxContent.style["padding-bottom"]=this.modalBoxFooter.clientHeight+20+"px"):this.modalBoxFooter&&(this.modalBox.contains(this.modalBoxFooter)||(this.modal.removeChild(this.modalBoxFooter),this.modalBox.appendChild(this.modalBoxFooter),this.modalBoxFooter.style.width="auto",this.modalBoxFooter.style.left="",this.modalBoxContent.style["padding-bottom"]="",this.modalBoxFooter.classList.remove("tingle-modal-box__footer--sticky"))),this},t.prototype.addFooterBtn=function(t,o,e){var s=document.createElement("button");return s.innerHTML=t,s.addEventListener("click",e),"string"==typeof o&&o.length&&o.split(" ").forEach(function(t){s.classList.add(t);}),this.modalBoxFooter.appendChild(s),s},t.prototype.resize=function(){console.warn("Resize is deprecated and will be removed in version 1.0");},t.prototype.isOverflow=function(){return window.innerHeight<=this.modalBox.clientHeight},t.prototype.checkOverflow=function(){this.modal.classList.contains("tingle-modal--visible")&&(this.isOverflow()?this.modal.classList.add("tingle-modal--overflow"):this.modal.classList.remove("tingle-modal--overflow"),!this.isOverflow()&&this.opts.stickyFooter?this.setStickyFooter(!1):this.isOverflow()&&this.opts.stickyFooter&&(e.call(this),this.setStickyFooter(!0)));},{modal:t}});
  });

  window.SHOW_DIFFICULTY = false; // for debugging questions
  // Make an overlay to capture any clicks outside boxes, if necessary
  createElem('div', 'overlay hidden', document.body).addEventListener('click', hideAllActions);
  class QuestionSet {
      constructor(qNumber) {
          this.questions = []; // list of questions and the DOM element they're rendered in
          this.topics = []; // list of topics which have been selected for this set
          this.optionsSets = {}; // list of OptionsSet objects carrying options for topics with options
          this.qNumber = qNumber || 1; // Question number (passed in by caller, which will keep count)
          this.answered = false; // Whether answered or not
          this.commandWord = ''; // Something like 'simplify'
          this.useCommandWord = true; // Use the command word in the main question, false give command word with each subquestion
          this.n = 8; // Number of questions
          this._build();
      }
      _build() {
          this.outerBox = createElem('div', 'question-outerbox');
          this.headerBox = createElem('div', 'question-headerbox', this.outerBox);
          this.displayBox = createElem('div', 'question-displaybox', this.outerBox);
          this._buildOptionsBox();
          this._buildTopicChooser();
      }
      _buildOptionsBox() {
          const topicSpan = createElem('span', undefined, this.headerBox);
          this.topicChooserButton = createElem('span', 'topic-chooser button', topicSpan);
          this.topicChooserButton.innerHTML = 'Choose topic';
          this.topicChooserButton.addEventListener('click', () => this.chooseTopics());
          const difficultySpan = createElem('span', undefined, this.headerBox);
          difficultySpan.append('Difficulty: ');
          const difficultySliderOuter = createElem('span', 'slider-outer', difficultySpan);
          this.difficultySliderElement = createElem('input', undefined, difficultySliderOuter);
          const nSpan = createElem('span', undefined, this.headerBox);
          nSpan.append('Number of questions: ');
          const nQuestionsInput = createElem('input', 'n-questions', nSpan);
          nQuestionsInput.type = 'number';
          nQuestionsInput.min = '1';
          nQuestionsInput.value = '8';
          nQuestionsInput.addEventListener('change', () => {
              this.n = parseInt(nQuestionsInput.value);
          });
          this.generateButton = createElem('button', 'generate-button button', this.headerBox);
          this.generateButton.disabled = true;
          this.generateButton.innerHTML = 'Generate!';
          this.generateButton.addEventListener('click', () => this.generateAll());
      }
      _initSlider() {
          this.difficultySlider = new RS({
              target: this.difficultySliderElement,
              values: { min: 1, max: 10 },
              range: true,
              set: [2, 6],
              step: 1,
              tooltip: false,
              scale: true,
              labels: true
          });
      }
      _buildTopicChooser() {
          // build an OptionsSet object for the topics
          const topics = getTopics();
          const optionsSpec = [];
          topics.forEach(topic => {
              optionsSpec.push({
                  title: topic.title,
                  id: topic.id,
                  type: 'bool',
                  default: false,
                  swapLabel: true
              });
          });
          this.topicsOptions = new OptionsSet(optionsSpec);
          // Build a modal dialog to put them in
          this.topicsModal = new tingle_min.modal({
              footer: true,
              stickyFooter: false,
              closeMethods: ['overlay', 'escape'],
              closeLabel: 'Close',
              onClose: () => {
                  this.updateTopics();
              }
          });
          this.topicsModal.addFooterBtn('OK', 'button modal-button', () => {
              this.topicsModal.close();
          });
          // render options into modal
          this.topicsOptions.renderIn(this.topicsModal.getContent());
          // Add further options buttons
          // This feels a bit iffy - depends too much on implementation of OptionsSet
          const lis = Array.from(this.topicsModal.getContent().getElementsByTagName('li'));
          lis.forEach(li => {
              const topicId = li.dataset.optionId;
              if (topicId !== undefined && hasOptions(topicId)) {
                  const optionsButton = createElem('div', 'icon-button extra-options-button', li);
                  this._buildTopicOptions(topicId, optionsButton);
              }
          });
      }
      _buildTopicOptions(topicId, optionsButton) {
          // Build the UI and OptionsSet object linked to topicId. Pass in a button which should launch it
          // Make the OptionsSet object and store a reference to it
          // Only store if object is created?
          const optionsSet = newOptionsSet(topicId);
          this.optionsSets[topicId] = optionsSet;
          // Make a modal dialog for it
          const modal = new tingle_min.modal({
              footer: true,
              stickyFooter: false,
              closeMethods: ['overlay', 'escape'],
              closeLabel: 'Close'
          });
          modal.addFooterBtn('OK', 'button modal-button', () => {
              modal.close();
          });
          optionsSet.renderIn(modal.getContent());
          // link the modal to the button
          optionsButton.addEventListener('click', () => {
              modal.open();
          });
      }
      chooseTopics() {
          this.topicsModal.open();
      }
      updateTopics() {
          // topic choices are stored in this.topicsOptions automatically
          // pull this into this.topics and update button displays
          // have object with boolean properties. Just want the true values
          const topics = boolObjectToArray(this.topicsOptions.options);
          this.topics = topics;
          let text;
          if (topics.length === 0) {
              text = 'Choose topic'; // nothing selected
              this.generateButton.disabled = true;
          }
          else {
              const id = topics[0]; // first item selected
              text = getTitle(id);
              this.generateButton.disabled = false;
          }
          if (topics.length > 1) { // any additional show as e.g. ' + 1
              text += ' +' + (topics.length - 1);
          }
          this.topicChooserButton.innerHTML = text;
      }
      setCommandWord() {
          // first set to first topic command word
          let commandWord = getCommandWord(this.topics[0]);
          let useCommandWord = true; // true if shared command word
          // cycle through rest of topics, reset command word if they don't match
          for (let i = 1; i < this.topics.length; i++) {
              if (getCommandWord(this.topics[i]) !== commandWord) {
                  commandWord = '';
                  useCommandWord = false;
                  break;
              }
          }
          this.commandWord = commandWord;
          this.useCommandWord = useCommandWord;
      }
      generateAll() {
          // Clear display-box and question list
          this.displayBox.innerHTML = '';
          this.questions = [];
          this.setCommandWord();
          // Set number and main command word
          const mainq = createElem('p', 'katex mainq', this.displayBox);
          mainq.innerHTML = `${this.qNumber}. ${this.commandWord}`; // TODO: get command word from questions
          // Make show answers button
          this.answerButton = createElem('p', 'button show-answers', this.displayBox);
          this.answerButton.addEventListener('click', () => {
              this.toggleAnswers();
          });
          this.answerButton.innerHTML = 'Show answers';
          // Get difficulty from slider
          const mindiff = this.difficultySlider.getValueL();
          const maxdiff = this.difficultySlider.getValueR();
          for (let i = 0; i < this.n; i++) {
              // Make question container DOM element
              const container = createElem('div', 'question-container', this.displayBox);
              container.dataset.question_index = i + ''; // not sure this is actually needed
              // Add container link to object in questions list
              if (!this.questions[i])
                  this.questions[i] = { container: container };
              // choose a difficulty and generate
              const difficulty = mindiff + Math.floor(i * (maxdiff - mindiff + 1) / this.n);
              // choose a topic id
              this.generate(i, difficulty);
          }
      }
      generate(i, difficulty, topicId) {
          // TODO get options properly
          topicId = topicId || randElem(this.topics);
          const options = {
              label: '',
              difficulty: difficulty,
              useCommandWord: false
          };
          if (this.optionsSets[topicId]) {
              Object.assign(options, this.optionsSets[topicId].options);
          }
          // choose a question
          const question = newQuestion(topicId, options);
          // set some more data in the questions[] list
          if (!this.questions[i])
              throw new Error('question not made');
          this.questions[i].question = question;
          this.questions[i].topicId = topicId;
          // Render into the container
          const container = this.questions[i].container;
          container.innerHTML = ''; // clear in case of refresh
          // make and render question number and command word (if needed)
          let qNumberText = questionLetter(i) + ')';
          if (window.SHOW_DIFFICULTY) {
              qNumberText += options.difficulty;
          }
          if (!this.useCommandWord) {
              qNumberText += ' ' + getCommandWord(topicId);
              container.classList.add('individual-command-word');
          }
          else {
              container.classList.remove('individual-command-word');
          }
          const questionNumberDiv = createElem('div', 'question-number katex', container);
          questionNumberDiv.innerHTML = qNumberText;
          // render the question
          container.appendChild(question.getDOM()); // this is a .question-div element
          question.render(); // some questions need rendering after attaching to DOM
          // make hidden actions menu
          const actions = createElem('div', 'question-actions hidden', container);
          const refreshIcon = createElem('div', 'question-refresh icon-button', actions);
          const answerIcon = createElem('div', 'question-answer icon-button', actions);
          answerIcon.addEventListener('click', () => {
              question.toggleAnswer();
              hideAllActions();
          });
          refreshIcon.addEventListener('click', () => {
              this.generate(i, difficulty);
              hideAllActions();
          });
          // Q: is this best way - or an event listener on the whole displayBox?
          container.addEventListener('click', e => {
              if (!hasAncestorClass(e.target, 'question-actions')) {
                  // only do this if it didn't originate in action button
                  this.showQuestionActions(i);
              }
          });
      }
      toggleAnswers() {
          if (this.answered) {
              this.questions.forEach(q => {
                  if (q.question)
                      q.question.hideAnswer();
                  this.answered = false;
                  this.answerButton.innerHTML = 'Show answers';
              });
          }
          else {
              this.questions.forEach(q => {
                  if (q.question)
                      q.question.showAnswer();
                  this.answered = true;
                  this.answerButton.innerHTML = 'Hide answers';
              });
          }
      }
      /**
       * Scans for widest question and then sets the grid width to that
       */
      /* eslint-disable */
      adjustGridWidth() {
          return;
      }
      /* eslint-enable */
      showQuestionActions(questionIndex) {
          // first hide any other actions
          hideAllActions();
          const container = this.questions[questionIndex].container;
          const actions = container.querySelector('.question-actions');
          // Unhide the overlay
          const overlay = document.querySelector('.overlay');
          if (overlay !== null)
              overlay.classList.remove('hidden');
          actions.classList.remove('hidden');
          actions.style.left = (container.offsetWidth / 2 - actions.offsetWidth / 2) + 'px';
          actions.style.top = (container.offsetHeight / 2 - actions.offsetHeight / 2) + 'px';
      }
      appendTo(elem) {
          elem.appendChild(this.outerBox);
          this._initSlider(); // has to be in document's DOM to work properly
      }
      appendBefore(parent, elem) {
          parent.insertBefore(this.outerBox, elem);
          this._initSlider(); // has to be in document's DOM to work properly
      }
  }
  function questionLetter(i) {
      // return a question number. e.g. qNumber(0)="a".
      // After letters, we get on to greek
      const letter = i < 26 ? String.fromCharCode(0x61 + i)
          : i < 52 ? String.fromCharCode(0x41 + i - 26)
              : String.fromCharCode(0x3B1 + i - 52);
      return letter;
  }
  function hideAllActions() {
      // hide all question actions
      document.querySelectorAll('.question-actions').forEach(el => {
          el.classList.add('hidden');
      });
      const overlay = document.querySelector('.overlay');
      if (overlay !== null) {
          overlay.classList.add('hidden');
      }
      else
          throw new Error('Could not find overlay when hiding actions');
  }

  // TODO:
  //  - Import existing question types (G - graphic, T - text
  //    - G area

  document.addEventListener('DOMContentLoaded', () => {
    const qs = new QuestionSet();
    qs.appendTo(document.body);
    qs.chooseTopics();
  });

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vbW9kdWxlcy92ZW5kb3IvcnNsaWRlci5qcyIsIi4uLy4uL21vZHVsZXMvUG9pbnQudHMiLCIuLi9tb2R1bGVzL3V0aWxpdGllcy5qcyIsIi4uLy4uL21vZHVsZXMvT3B0aW9uc1NldC50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vUXVlc3Rpb24udHMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL1RleHRRLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9UZXh0US9BbGdlYnJhaWNGcmFjdGlvblEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0ludGVnZXJBZGQuanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRLnRzIiwiLi4vbm9kZV9tb2R1bGVzL2ZyYWN0aW9uLmpzL2ZyYWN0aW9uLmpzIiwiLi4vbW9kdWxlcy9Nb25vbWlhbC5qcyIsIi4uL21vZHVsZXMvUG9seW5vbWlhbC5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQXJpdGhtYWdvblEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL1Rlc3RRLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9UZXh0US9BZGRBWmVyby5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvRXF1YXRpb25PZkxpbmUuanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc051bWJlckRhdGEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZFEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVEudHMiLCIuLi9tb2R1bGVzL0xpbkV4cHIuanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvc29sdmVBbmdsZXMudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVZpZXcudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzV29yZGVkRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRRLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNXb3JkZWRRLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNXcmFwcGVyLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL1JlY3RhbmdsZUFyZWFEYXRhLnRzIiwiLi4vbW9kdWxlcy9kcmF3aW5nLmpzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL3R5cGVzLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL1JlY3RhbmdsZUFyZWFWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL1JlY3RhbmdsZUFyZWFRLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL1RyYXBleml1bUFyZWFEYXRhLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL1RyYXBleml1bUFyZWFWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL1RyYXBleml1bUFyZWFRLnRzIiwiLi4vbm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsIi4uLy4uL21vZHVsZXMvdHJpYW5nbGVEYXRhLXF1ZXVlLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL1RyaWFuZ2xlQXJlYURhdGEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvVHJpYW5nbGVBcmVhVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQXJlYVBlcmltZXRlci9UcmlhbmdsZUFyZWFRLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL0FyZWFXcmFwcGVyLnRzIiwiLi4vbW9kdWxlcy9Ub3BpY0Nob29zZXIuanMiLCIuLi9ub2RlX21vZHVsZXMvdGluZ2xlLmpzL2Rpc3QvdGluZ2xlLm1pbi5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb25TZXQudHMiLCIuLi9tYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIFJzbGlkZXIuIERvd25sb2FkZWQgZnJvbSBodHRwczovL3NsYXdvbWlyLXphemlhYmxvLmdpdGh1Yi5pby9yYW5nZS1zbGlkZXIvXG4gKiBNb2RpZmllZCB0byBtYWtlIGludG8gRVM2IG1vZHVsZSBhbmQgZml4IGEgZmV3IGJ1Z3NcbiAqL1xuXG52YXIgUlMgPSBmdW5jdGlvbiAoY29uZikge1xuICB0aGlzLmlucHV0ID0gbnVsbFxuICB0aGlzLmlucHV0RGlzcGxheSA9IG51bGxcbiAgdGhpcy5zbGlkZXIgPSBudWxsXG4gIHRoaXMuc2xpZGVyV2lkdGggPSAwXG4gIHRoaXMuc2xpZGVyTGVmdCA9IDBcbiAgdGhpcy5wb2ludGVyV2lkdGggPSAwXG4gIHRoaXMucG9pbnRlclIgPSBudWxsXG4gIHRoaXMucG9pbnRlckwgPSBudWxsXG4gIHRoaXMuYWN0aXZlUG9pbnRlciA9IG51bGxcbiAgdGhpcy5zZWxlY3RlZCA9IG51bGxcbiAgdGhpcy5zY2FsZSA9IG51bGxcbiAgdGhpcy5zdGVwID0gMFxuICB0aGlzLnRpcEwgPSBudWxsXG4gIHRoaXMudGlwUiA9IG51bGxcbiAgdGhpcy50aW1lb3V0ID0gbnVsbFxuICB0aGlzLnZhbFJhbmdlID0gZmFsc2VcblxuICB0aGlzLnZhbHVlcyA9IHtcbiAgICBzdGFydDogbnVsbCxcbiAgICBlbmQ6IG51bGxcbiAgfVxuICB0aGlzLmNvbmYgPSB7XG4gICAgdGFyZ2V0OiBudWxsLFxuICAgIHZhbHVlczogbnVsbCxcbiAgICBzZXQ6IG51bGwsXG4gICAgcmFuZ2U6IGZhbHNlLFxuICAgIHdpZHRoOiBudWxsLFxuICAgIHNjYWxlOiB0cnVlLFxuICAgIGxhYmVsczogdHJ1ZSxcbiAgICB0b29sdGlwOiB0cnVlLFxuICAgIHN0ZXA6IG51bGwsXG4gICAgZGlzYWJsZWQ6IGZhbHNlLFxuICAgIG9uQ2hhbmdlOiBudWxsXG4gIH1cblxuICB0aGlzLmNscyA9IHtcbiAgICBjb250YWluZXI6ICdycy1jb250YWluZXInLFxuICAgIGJhY2tncm91bmQ6ICdycy1iZycsXG4gICAgc2VsZWN0ZWQ6ICdycy1zZWxlY3RlZCcsXG4gICAgcG9pbnRlcjogJ3JzLXBvaW50ZXInLFxuICAgIHNjYWxlOiAncnMtc2NhbGUnLFxuICAgIG5vc2NhbGU6ICdycy1ub3NjYWxlJyxcbiAgICB0aXA6ICdycy10b29sdGlwJ1xuICB9XG5cbiAgZm9yICh2YXIgaSBpbiB0aGlzLmNvbmYpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb25mLCBpKSkgdGhpcy5jb25mW2ldID0gY29uZltpXSB9XG5cbiAgdGhpcy5pbml0KClcbn1cblxuUlMucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgdGhpcy5jb25mLnRhcmdldCA9PT0gJ29iamVjdCcpIHRoaXMuaW5wdXQgPSB0aGlzLmNvbmYudGFyZ2V0XG4gIGVsc2UgdGhpcy5pbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMuY29uZi50YXJnZXQucmVwbGFjZSgnIycsICcnKSlcblxuICBpZiAoIXRoaXMuaW5wdXQpIHJldHVybiBjb25zb2xlLmxvZygnQ2Fubm90IGZpbmQgdGFyZ2V0IGVsZW1lbnQuLi4nKVxuXG4gIHRoaXMuaW5wdXREaXNwbGF5ID0gZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLmlucHV0LCBudWxsKS5kaXNwbGF5XG4gIHRoaXMuaW5wdXQuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuICB0aGlzLnZhbFJhbmdlID0gISh0aGlzLmNvbmYudmFsdWVzIGluc3RhbmNlb2YgQXJyYXkpXG5cbiAgaWYgKHRoaXMudmFsUmFuZ2UpIHtcbiAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLmNvbmYudmFsdWVzLCAnbWluJykgfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLmNvbmYudmFsdWVzLCAnbWF4JykpIHsgcmV0dXJuIGNvbnNvbGUubG9nKCdNaXNzaW5nIG1pbiBvciBtYXggdmFsdWUuLi4nKSB9XG4gIH1cbiAgcmV0dXJuIHRoaXMuY3JlYXRlU2xpZGVyKClcbn1cblxuUlMucHJvdG90eXBlLmNyZWF0ZVNsaWRlciA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zbGlkZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy5jb250YWluZXIpXG4gIHRoaXMuc2xpZGVyLmlubmVySFRNTCA9ICc8ZGl2IGNsYXNzPVwicnMtYmdcIj48L2Rpdj4nXG4gIHRoaXMuc2VsZWN0ZWQgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy5zZWxlY3RlZClcbiAgdGhpcy5wb2ludGVyTCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnBvaW50ZXIsIFsnZGlyJywgJ2xlZnQnXSlcbiAgdGhpcy5zY2FsZSA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnNjYWxlKVxuXG4gIGlmICh0aGlzLmNvbmYudG9vbHRpcCkge1xuICAgIHRoaXMudGlwTCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnRpcClcbiAgICB0aGlzLnRpcFIgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy50aXApXG4gICAgdGhpcy5wb2ludGVyTC5hcHBlbmRDaGlsZCh0aGlzLnRpcEwpXG4gIH1cbiAgdGhpcy5zbGlkZXIuYXBwZW5kQ2hpbGQodGhpcy5zZWxlY3RlZClcbiAgdGhpcy5zbGlkZXIuYXBwZW5kQ2hpbGQodGhpcy5zY2FsZSlcbiAgdGhpcy5zbGlkZXIuYXBwZW5kQ2hpbGQodGhpcy5wb2ludGVyTClcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgdGhpcy5wb2ludGVyUiA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnBvaW50ZXIsIFsnZGlyJywgJ3JpZ2h0J10pXG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB0aGlzLnBvaW50ZXJSLmFwcGVuZENoaWxkKHRoaXMudGlwUilcbiAgICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnBvaW50ZXJSKVxuICB9XG5cbiAgdGhpcy5pbnB1dC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLnNsaWRlciwgdGhpcy5pbnB1dC5uZXh0U2libGluZylcblxuICBpZiAodGhpcy5jb25mLndpZHRoKSB0aGlzLnNsaWRlci5zdHlsZS53aWR0aCA9IHBhcnNlSW50KHRoaXMuY29uZi53aWR0aCkgKyAncHgnXG4gIHRoaXMuc2xpZGVyTGVmdCA9IHRoaXMuc2xpZGVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmxlZnRcbiAgdGhpcy5zbGlkZXJXaWR0aCA9IHRoaXMuc2xpZGVyLmNsaWVudFdpZHRoXG4gIHRoaXMucG9pbnRlcldpZHRoID0gdGhpcy5wb2ludGVyTC5jbGllbnRXaWR0aFxuXG4gIGlmICghdGhpcy5jb25mLnNjYWxlKSB0aGlzLnNsaWRlci5jbGFzc0xpc3QuYWRkKHRoaXMuY2xzLm5vc2NhbGUpXG5cbiAgcmV0dXJuIHRoaXMuc2V0SW5pdGlhbFZhbHVlcygpXG59XG5cblJTLnByb3RvdHlwZS5zZXRJbml0aWFsVmFsdWVzID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmRpc2FibGVkKHRoaXMuY29uZi5kaXNhYmxlZClcblxuICBpZiAodGhpcy52YWxSYW5nZSkgdGhpcy5jb25mLnZhbHVlcyA9IHByZXBhcmVBcnJheVZhbHVlcyh0aGlzLmNvbmYpXG5cbiAgdGhpcy52YWx1ZXMuc3RhcnQgPSAwXG4gIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi5yYW5nZSA/IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSA6IDBcblxuICBpZiAodGhpcy5jb25mLnNldCAmJiB0aGlzLmNvbmYuc2V0Lmxlbmd0aCAmJiBjaGVja0luaXRpYWwodGhpcy5jb25mKSkge1xuICAgIHZhciB2YWxzID0gdGhpcy5jb25mLnNldFxuXG4gICAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgICAgdGhpcy52YWx1ZXMuc3RhcnQgPSB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YodmFsc1swXSlcbiAgICAgIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi5zZXRbMV0gPyB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YodmFsc1sxXSkgOiBudWxsXG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzBdKVxuICB9XG4gIHJldHVybiB0aGlzLmNyZWF0ZVNjYWxlKClcbn1cblxuUlMucHJvdG90eXBlLmNyZWF0ZVNjYWxlID0gZnVuY3Rpb24gKHJlc2l6ZSkge1xuICB0aGlzLnN0ZXAgPSB0aGlzLnNsaWRlcldpZHRoIC8gKHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSlcblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7XG4gICAgdmFyIHNwYW4gPSBjcmVhdGVFbGVtZW50KCdzcGFuJylcbiAgICB2YXIgaW5zID0gY3JlYXRlRWxlbWVudCgnaW5zJylcblxuICAgIHNwYW4uYXBwZW5kQ2hpbGQoaW5zKVxuICAgIHRoaXMuc2NhbGUuYXBwZW5kQ2hpbGQoc3BhbilcblxuICAgIHNwYW4uc3R5bGUud2lkdGggPSBpID09PSBpTGVuIC0gMSA/IDAgOiB0aGlzLnN0ZXAgKyAncHgnXG5cbiAgICBpZiAoIXRoaXMuY29uZi5sYWJlbHMpIHtcbiAgICAgIGlmIChpID09PSAwIHx8IGkgPT09IGlMZW4gLSAxKSBpbnMuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1tpXVxuICAgIH0gZWxzZSBpbnMuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1tpXVxuXG4gICAgaW5zLnN0eWxlLm1hcmdpbkxlZnQgPSAoaW5zLmNsaWVudFdpZHRoIC8gMikgKiAtMSArICdweCdcbiAgfVxuICByZXR1cm4gdGhpcy5hZGRFdmVudHMoKVxufVxuXG5SUy5wcm90b3R5cGUudXBkYXRlU2NhbGUgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc3RlcCA9IHRoaXMuc2xpZGVyV2lkdGggLyAodGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKVxuXG4gIHZhciBwaWVjZXMgPSB0aGlzLnNsaWRlci5xdWVyeVNlbGVjdG9yQWxsKCdzcGFuJylcblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IHBpZWNlcy5sZW5ndGg7IGkgPCBpTGVuIC0gMTsgaSsrKSB7IHBpZWNlc1tpXS5zdHlsZS53aWR0aCA9IHRoaXMuc3RlcCArICdweCcgfVxuXG4gIHJldHVybiB0aGlzLnNldFZhbHVlcygpXG59XG5cblJTLnByb3RvdHlwZS5hZGRFdmVudHMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBwb2ludGVycyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy4nICsgdGhpcy5jbHMucG9pbnRlcilcbiAgdmFyIHBpZWNlcyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NwYW4nKVxuXG4gIGNyZWF0ZUV2ZW50cyhkb2N1bWVudCwgJ21vdXNlbW92ZSB0b3VjaG1vdmUnLCB0aGlzLm1vdmUuYmluZCh0aGlzKSlcbiAgY3JlYXRlRXZlbnRzKGRvY3VtZW50LCAnbW91c2V1cCB0b3VjaGVuZCB0b3VjaGNhbmNlbCcsIHRoaXMuZHJvcC5iaW5kKHRoaXMpKVxuXG4gIGZvciAobGV0IGkgPSAwLCBpTGVuID0gcG9pbnRlcnMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7IGNyZWF0ZUV2ZW50cyhwb2ludGVyc1tpXSwgJ21vdXNlZG93biB0b3VjaHN0YXJ0JywgdGhpcy5kcmFnLmJpbmQodGhpcykpIH1cblxuICBmb3IgKGxldCBpID0gMCwgaUxlbiA9IHBpZWNlcy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgY3JlYXRlRXZlbnRzKHBpZWNlc1tpXSwgJ2NsaWNrJywgdGhpcy5vbkNsaWNrUGllY2UuYmluZCh0aGlzKSkgfVxuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLm9uUmVzaXplLmJpbmQodGhpcykpXG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLmRyYWcgPSBmdW5jdGlvbiAoZSkge1xuICBlLnByZXZlbnREZWZhdWx0KClcblxuICBpZiAodGhpcy5jb25mLmRpc2FibGVkKSByZXR1cm5cblxuICB2YXIgZGlyID0gZS50YXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLWRpcicpXG4gIGlmIChkaXIgPT09ICdsZWZ0JykgdGhpcy5hY3RpdmVQb2ludGVyID0gdGhpcy5wb2ludGVyTFxuICBpZiAoZGlyID09PSAncmlnaHQnKSB0aGlzLmFjdGl2ZVBvaW50ZXIgPSB0aGlzLnBvaW50ZXJSXG5cbiAgcmV0dXJuIHRoaXMuc2xpZGVyLmNsYXNzTGlzdC5hZGQoJ3NsaWRpbmcnKVxufVxuXG5SUy5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uIChlKSB7XG4gIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgJiYgIXRoaXMuY29uZi5kaXNhYmxlZCkge1xuICAgIHRoaXMub25SZXNpemUoKSAvLyBuZWVkZWQgaW4gY2FzZSBhbnkgZWxlbWVudHMgaGF2ZSBtb3ZlZCB0aGUgc2xpZGVyIGluIHRoZSBtZWFudGltZVxuICAgIHZhciBjb29yZFggPSBlLnR5cGUgPT09ICd0b3VjaG1vdmUnID8gZS50b3VjaGVzWzBdLmNsaWVudFggOiBlLnBhZ2VYXG4gICAgdmFyIGluZGV4ID0gY29vcmRYIC0gdGhpcy5zbGlkZXJMZWZ0IC0gKHRoaXMucG9pbnRlcldpZHRoIC8gMikgLy8gcGl4ZWwgcG9zaXRpb24gZnJvbSBsZWZ0IG9mIHNsaWRlciAoc2hpZnRlZCBsZWZ0IGJ5IGhhbGYgd2lkdGgpXG5cbiAgICBpbmRleCA9IE1hdGguY2VpbChpbmRleCAvIHRoaXMuc3RlcClcblxuICAgIGlmIChpbmRleCA8PSAwKSBpbmRleCA9IDBcbiAgICBpZiAoaW5kZXggPiB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpIGluZGV4ID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG5cbiAgICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgICBpZiAodGhpcy5hY3RpdmVQb2ludGVyID09PSB0aGlzLnBvaW50ZXJMKSB0aGlzLnZhbHVlcy5zdGFydCA9IGluZGV4XG4gICAgICBpZiAodGhpcy5hY3RpdmVQb2ludGVyID09PSB0aGlzLnBvaW50ZXJSKSB0aGlzLnZhbHVlcy5lbmQgPSBpbmRleFxuICAgIH0gZWxzZSB0aGlzLnZhbHVlcy5lbmQgPSBpbmRleFxuXG4gICAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbiAgfVxufVxuXG5SUy5wcm90b3R5cGUuZHJvcCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5hY3RpdmVQb2ludGVyID0gbnVsbFxufVxuXG5SUy5wcm90b3R5cGUuc2V0VmFsdWVzID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGFjdGl2ZVBvaW50ZXIgPSB0aGlzLmNvbmYucmFuZ2UgPyAnc3RhcnQnIDogJ2VuZCdcblxuICBpZiAoc3RhcnQgJiYgdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHN0YXJ0KSA+IC0xKSB7IHRoaXMudmFsdWVzW2FjdGl2ZVBvaW50ZXJdID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHN0YXJ0KSB9XG5cbiAgaWYgKGVuZCAmJiB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YoZW5kKSA+IC0xKSB7IHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZihlbmQpIH1cblxuICBpZiAodGhpcy5jb25mLnJhbmdlICYmIHRoaXMudmFsdWVzLnN0YXJ0ID4gdGhpcy52YWx1ZXMuZW5kKSB7IHRoaXMudmFsdWVzLnN0YXJ0ID0gdGhpcy52YWx1ZXMuZW5kIH1cblxuICB0aGlzLnBvaW50ZXJMLnN0eWxlLmxlZnQgPSAodGhpcy52YWx1ZXNbYWN0aXZlUG9pbnRlcl0gKiB0aGlzLnN0ZXAgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKSkgKyAncHgnXG5cbiAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgIGlmICh0aGlzLmNvbmYudG9vbHRpcCkge1xuICAgICAgdGhpcy50aXBMLmlubmVySFRNTCA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdXG4gICAgICB0aGlzLnRpcFIuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG4gICAgfVxuICAgIHRoaXMuaW5wdXQudmFsdWUgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLnN0YXJ0XSArICcsJyArIHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxuICAgIHRoaXMucG9pbnRlclIuc3R5bGUubGVmdCA9ICh0aGlzLnZhbHVlcy5lbmQgKiB0aGlzLnN0ZXAgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKSkgKyAncHgnXG4gIH0gZWxzZSB7XG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7IHRoaXMudGlwTC5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF0gfVxuICAgIHRoaXMuaW5wdXQudmFsdWUgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1cbiAgfVxuXG4gIGlmICh0aGlzLnZhbHVlcy5lbmQgPiB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMVxuICBpZiAodGhpcy52YWx1ZXMuc3RhcnQgPCAwKSB0aGlzLnZhbHVlcy5zdGFydCA9IDBcblxuICB0aGlzLnNlbGVjdGVkLnN0eWxlLndpZHRoID0gKHRoaXMudmFsdWVzLmVuZCAtIHRoaXMudmFsdWVzLnN0YXJ0KSAqIHRoaXMuc3RlcCArICdweCdcbiAgdGhpcy5zZWxlY3RlZC5zdHlsZS5sZWZ0ID0gdGhpcy52YWx1ZXMuc3RhcnQgKiB0aGlzLnN0ZXAgKyAncHgnXG5cbiAgcmV0dXJuIHRoaXMub25DaGFuZ2UoKVxufVxuXG5SUy5wcm90b3R5cGUub25DbGlja1BpZWNlID0gZnVuY3Rpb24gKGUpIHtcbiAgaWYgKHRoaXMuY29uZi5kaXNhYmxlZCkgcmV0dXJuXG5cbiAgdmFyIGlkeCA9IE1hdGgucm91bmQoKGUuY2xpZW50WCAtIHRoaXMuc2xpZGVyTGVmdCkgLyB0aGlzLnN0ZXApXG5cbiAgaWYgKGlkeCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgaWR4ID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG4gIGlmIChpZHggPCAwKSBpZHggPSAwXG5cbiAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgIGlmIChpZHggLSB0aGlzLnZhbHVlcy5zdGFydCA8PSB0aGlzLnZhbHVlcy5lbmQgLSBpZHgpIHtcbiAgICAgIHRoaXMudmFsdWVzLnN0YXJ0ID0gaWR4XG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IGlkeFxuICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gaWR4XG5cbiAgdGhpcy5zbGlkZXIuY2xhc3NMaXN0LnJlbW92ZSgnc2xpZGluZycpXG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLm9uQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX3RoaXMgPSB0aGlzXG5cbiAgaWYgKHRoaXMudGltZW91dCkgY2xlYXJUaW1lb3V0KHRoaXMudGltZW91dClcblxuICB0aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoX3RoaXMuY29uZi5vbkNoYW5nZSAmJiB0eXBlb2YgX3RoaXMuY29uZi5vbkNoYW5nZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIF90aGlzLmNvbmYub25DaGFuZ2UoX3RoaXMuaW5wdXQudmFsdWUpXG4gICAgfVxuICB9LCA1MDApXG59XG5cblJTLnByb3RvdHlwZS5vblJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gdGhpcy5zbGlkZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdFxuICB0aGlzLnNsaWRlcldpZHRoID0gdGhpcy5zbGlkZXIuY2xpZW50V2lkdGhcbiAgcmV0dXJuIHRoaXMudXBkYXRlU2NhbGUoKVxufVxuXG5SUy5wcm90b3R5cGUuZGlzYWJsZWQgPSBmdW5jdGlvbiAoZGlzYWJsZWQpIHtcbiAgdGhpcy5jb25mLmRpc2FibGVkID0gZGlzYWJsZWRcbiAgdGhpcy5zbGlkZXIuY2xhc3NMaXN0W2Rpc2FibGVkID8gJ2FkZCcgOiAncmVtb3ZlJ10oJ2Rpc2FibGVkJylcbn1cblxuUlMucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAvLyBSZXR1cm4gbGlzdCBvZiBudW1iZXJzLCByYXRoZXIgdGhhbiBhIHN0cmluZywgd2hpY2ggd291bGQganVzdCBiZSBzaWxseVxuICAvLyAgcmV0dXJuIHRoaXMuaW5wdXQudmFsdWVcbiAgcmV0dXJuIFt0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLnN0YXJ0XSwgdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXVxufVxuXG5SUy5wcm90b3R5cGUuZ2V0VmFsdWVMID0gZnVuY3Rpb24gKCkge1xuICAvLyBHZXQgbGVmdCAoaS5lLiBzbWFsbGVzdCkgdmFsdWVcbiAgcmV0dXJuIHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdXG59XG5cblJTLnByb3RvdHlwZS5nZXRWYWx1ZVIgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIEdldCByaWdodCAoaS5lLiBzbWFsbGVzdCkgdmFsdWVcbiAgcmV0dXJuIHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxufVxuXG5SUy5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5pbnB1dC5zdHlsZS5kaXNwbGF5ID0gdGhpcy5pbnB1dERpc3BsYXlcbiAgdGhpcy5zbGlkZXIucmVtb3ZlKClcbn1cblxudmFyIGNyZWF0ZUVsZW1lbnQgPSBmdW5jdGlvbiAoZWwsIGNscywgZGF0YUF0dHIpIHtcbiAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGVsKVxuICBpZiAoY2xzKSBlbGVtZW50LmNsYXNzTmFtZSA9IGNsc1xuICBpZiAoZGF0YUF0dHIgJiYgZGF0YUF0dHIubGVuZ3RoID09PSAyKSB7IGVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLScgKyBkYXRhQXR0clswXSwgZGF0YUF0dHJbMV0pIH1cblxuICByZXR1cm4gZWxlbWVudFxufVxuXG52YXIgY3JlYXRlRXZlbnRzID0gZnVuY3Rpb24gKGVsLCBldiwgY2FsbGJhY2spIHtcbiAgdmFyIGV2ZW50cyA9IGV2LnNwbGl0KCcgJylcblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IGV2ZW50cy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudHNbaV0sIGNhbGxiYWNrKSB9XG59XG5cbnZhciBwcmVwYXJlQXJyYXlWYWx1ZXMgPSBmdW5jdGlvbiAoY29uZikge1xuICB2YXIgdmFsdWVzID0gW11cbiAgdmFyIHJhbmdlID0gY29uZi52YWx1ZXMubWF4IC0gY29uZi52YWx1ZXMubWluXG5cbiAgaWYgKCFjb25mLnN0ZXApIHtcbiAgICBjb25zb2xlLmxvZygnTm8gc3RlcCBkZWZpbmVkLi4uJylcbiAgICByZXR1cm4gW2NvbmYudmFsdWVzLm1pbiwgY29uZi52YWx1ZXMubWF4XVxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGlMZW4gPSAocmFuZ2UgLyBjb25mLnN0ZXApOyBpIDwgaUxlbjsgaSsrKSB7IHZhbHVlcy5wdXNoKGNvbmYudmFsdWVzLm1pbiArIGkgKiBjb25mLnN0ZXApIH1cblxuICBpZiAodmFsdWVzLmluZGV4T2YoY29uZi52YWx1ZXMubWF4KSA8IDApIHZhbHVlcy5wdXNoKGNvbmYudmFsdWVzLm1heClcblxuICByZXR1cm4gdmFsdWVzXG59XG5cbnZhciBjaGVja0luaXRpYWwgPSBmdW5jdGlvbiAoY29uZikge1xuICBpZiAoIWNvbmYuc2V0IHx8IGNvbmYuc2V0Lmxlbmd0aCA8IDEpIHJldHVybiBudWxsXG4gIGlmIChjb25mLnZhbHVlcy5pbmRleE9mKGNvbmYuc2V0WzBdKSA8IDApIHJldHVybiBudWxsXG5cbiAgaWYgKGNvbmYucmFuZ2UpIHtcbiAgICBpZiAoY29uZi5zZXQubGVuZ3RoIDwgMiB8fCBjb25mLnZhbHVlcy5pbmRleE9mKGNvbmYuc2V0WzFdKSA8IDApIHJldHVybiBudWxsXG4gIH1cbiAgcmV0dXJuIHRydWVcbn1cblxuZXhwb3J0IGRlZmF1bHQgUlNcbiIsIi8qKlxuICogQ2xhc3MgcmVwcmVzZW50aW5nIGEgcG9pbnQsIGFuZCBzdGF0aWMgdXRpdGxpdHkgbWV0aG9kc1xuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQb2ludCB7XG4gIHg6IG51bWJlclxuICB5OiBudW1iZXJcbiAgY29uc3RydWN0b3IgKHg6IG51bWJlciwgeTogbnVtYmVyKSB7XG4gICAgdGhpcy54ID0geFxuICAgIHRoaXMueSA9IHlcbiAgfVxuXG4gIHJvdGF0ZSAoYW5nbGU6IG51bWJlcikge1xuICAgIGNvbnN0IG5ld3ggPSBNYXRoLmNvcyhhbmdsZSkgKiB0aGlzLnggLSBNYXRoLnNpbihhbmdsZSkgKiB0aGlzLnlcbiAgICBjb25zdCBuZXd5ID0gTWF0aC5zaW4oYW5nbGUpICogdGhpcy54ICsgTWF0aC5jb3MoYW5nbGUpICogdGhpcy55XG4gICAgdGhpcy54ID0gbmV3eFxuICAgIHRoaXMueSA9IG5ld3lcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc2NhbGUgKHNmOiBudW1iZXIpIHtcbiAgICB0aGlzLnggPSB0aGlzLnggKiBzZlxuICAgIHRoaXMueSA9IHRoaXMueSAqIHNmXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHRyYW5zbGF0ZSAoeDogbnVtYmVyLCB5OiBudW1iZXIpIHtcbiAgICB0aGlzLnggKz0geFxuICAgIHRoaXMueSArPSB5XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIGNsb25lICgpIHtcbiAgICByZXR1cm4gbmV3IFBvaW50KHRoaXMueCwgdGhpcy55KVxuICB9XG5cbiAgZXF1YWxzICh0aGF0OiBQb2ludCkge1xuICAgIHJldHVybiAodGhpcy54ID09PSB0aGF0LnggJiYgdGhpcy55ID09PSB0aGF0LnkpXG4gIH1cblxuICBtb3ZlVG93YXJkICh0aGF0OiBQb2ludCwgZDogbnVtYmVyKSB7XG4gICAgLy8gbW92ZXMgW2RdIGluIHRoZSBkaXJlY3Rpb24gb2YgW3RoYXQ6OlBvaW50XVxuICAgIGNvbnN0IHV2ZWMgPSBQb2ludC51bml0VmVjdG9yKHRoaXMsIHRoYXQpXG4gICAgdGhpcy50cmFuc2xhdGUodXZlYy54ICogZCwgdXZlYy55ICogZClcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3RhdGljIGZyb21Qb2xhciAocjogbnVtYmVyLCB0aGV0YTogbnVtYmVyKSB7XG4gICAgcmV0dXJuIG5ldyBQb2ludChcbiAgICAgIE1hdGguY29zKHRoZXRhKSAqIHIsXG4gICAgICBNYXRoLnNpbih0aGV0YSkgKiByXG4gICAgKVxuICB9XG5cbiAgc3RhdGljIGZyb21Qb2xhckRlZyAocjogbnVtYmVyLCB0aGV0YTogbnVtYmVyKSB7XG4gICAgdGhldGEgPSB0aGV0YSAqIE1hdGguUEkgLyAxODBcbiAgICByZXR1cm4gUG9pbnQuZnJvbVBvbGFyKHIsIHRoZXRhKVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBwb2ludCByZXByZXNlbnRpbmcgdGhlIHBvc2l0aW9uIG9mIGFuIGVsZW1lbnQsIGVpdGhlciByZWxhdGl2ZSB0byBwYXJlbnQgb3Igdmlld3BvcnRcbiAgICogQHBhcmFtIGVsZW0gQW4gSFRNTCBlbGVtZW50XG4gICAqIEBwYXJhbSBhbmNob3IgV2hpY2ggY29ybmRlciBvZiB0aGUgYm91bmRpbmcgYm94IG9mIGVsZW0gdG8gcmV0dXJuLCBvciB0aGUgY2VudGVyXG4gICAqL1xuICBzdGF0aWMgZnJvbUVsZW1lbnQoZWxlbTogSFRNTEVsZW1lbnQsIGFuY2hvcjogJ3RvcGxlZnQnfCdib3R0b21sZWZ0J3wndG9wcmlnaHQnfCdib3R0b21yaWdodCd8J2NlbnRlcicgPSAndG9wbGVmdCcsIHJlbGF0aXZlVG9QYXJlbnQ6IGJvb2xlYW4gPSB0cnVlKSB7XG4gICAgY29uc3QgcmVjdCA9IGVsZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcbiAgICBsZXQgeSA9IGFuY2hvci5zdGFydHNXaXRoKCd0b3AnKSA/IHJlY3QudG9wIDpcbiAgICAgICAgICAgICAgYW5jaG9yLnN0YXJ0c1dpdGgoJ2JvdHRvbScpID8gcmVjdC5ib3R0b20gOlxuICAgICAgICAgICAgICAocmVjdC5ib3R0b20gKyByZWN0LnRvcCkvMlxuXG4gICAgbGV0IHggPSBhbmNob3IuZW5kc1dpdGgoJ2xlZnQnKSA/IHJlY3QubGVmdCA6XG4gICAgICAgICAgICAgIGFuY2hvci5lbmRzV2l0aCgncmlnaHQnKSA/IHJlY3QucmlnaHQgOlxuICAgICAgICAgICAgICAocmVjdC5yaWdodCArIHJlY3QubGVmdCkvMlxuXG4gICAgaWYgKHJlbGF0aXZlVG9QYXJlbnQgJiYgZWxlbS5wYXJlbnRFbGVtZW50KSB7XG4gICAgICBjb25zdCBwYXJlbnRQdCA9IFBvaW50LmZyb21FbGVtZW50KGVsZW0ucGFyZW50RWxlbWVudCwgJ3RvcGxlZnQnLCBmYWxzZSlcbiAgICAgIHggLT0gcGFyZW50UHQueFxuICAgICAgeSAtPSBwYXJlbnRQdC55XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQb2ludCh4LHkpXG4gIH1cblxuICAvKipcbiAgICogRmluZCB0aGUgbWVhbiBvZlxuICAgKiBAcGFyYW0gIHsuLi5Qb2ludH0gcG9pbnRzIFRoZSBwb2ludHMgdG8gZmluZCB0aGUgbWVhbiBvZlxuICAgKi9cbiAgc3RhdGljIG1lYW4gKC4uLnBvaW50cyA6IFBvaW50W10pIHtcbiAgICBjb25zdCBzdW14ID0gcG9pbnRzLm1hcChwID0+IHAueCkucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSlcbiAgICBjb25zdCBzdW15ID0gcG9pbnRzLm1hcChwID0+IHAueSkucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSlcbiAgICBjb25zdCBuID0gcG9pbnRzLmxlbmd0aFxuXG4gICAgcmV0dXJuIG5ldyBQb2ludChzdW14IC8gbiwgc3VteSAvIG4pXG4gIH1cblxuICBzdGF0aWMgaW5DZW50ZXIgKEE6IFBvaW50LCBCOiBQb2ludCwgQzogUG9pbnQpIHtcbiAgICAvLyBpbmNlbnRlciBvZiBhIHRyaWFuZ2xlIGdpdmVuIHZlcnRleCBwb2ludHMgQSwgQiBhbmQgQ1xuICAgIGNvbnN0IGEgPSBQb2ludC5kaXN0YW5jZShCLCBDKVxuICAgIGNvbnN0IGIgPSBQb2ludC5kaXN0YW5jZShBLCBDKVxuICAgIGNvbnN0IGMgPSBQb2ludC5kaXN0YW5jZShBLCBCKVxuXG4gICAgY29uc3QgcGVyaW1ldGVyID0gYSArIGIgKyBjXG4gICAgY29uc3Qgc3VteCA9IGEgKiBBLnggKyBiICogQi54ICsgYyAqIEMueFxuICAgIGNvbnN0IHN1bXkgPSBhICogQS55ICsgYiAqIEIueSArIGMgKiBDLnlcblxuICAgIHJldHVybiBuZXcgUG9pbnQoc3VteCAvIHBlcmltZXRlciwgc3VteSAvIHBlcmltZXRlcilcbiAgfVxuXG4gIHN0YXRpYyBtaW4gKHBvaW50cyA6IFBvaW50W10pIHtcbiAgICBjb25zdCBtaW54ID0gcG9pbnRzLnJlZHVjZSgoeCwgcCkgPT4gTWF0aC5taW4oeCwgcC54KSwgSW5maW5pdHkpXG4gICAgY29uc3QgbWlueSA9IHBvaW50cy5yZWR1Y2UoKHksIHApID0+IE1hdGgubWluKHksIHAueSksIEluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQobWlueCwgbWlueSlcbiAgfVxuXG4gIHN0YXRpYyBtYXggKHBvaW50czogUG9pbnRbXSkge1xuICAgIGNvbnN0IG1heHggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1heCh4LCBwLngpLCAtSW5maW5pdHkpXG4gICAgY29uc3QgbWF4eSA9IHBvaW50cy5yZWR1Y2UoKHksIHApID0+IE1hdGgubWF4KHksIHAueSksIC1JbmZpbml0eSlcbiAgICByZXR1cm4gbmV3IFBvaW50KG1heHgsIG1heHkpXG4gIH1cblxuICBzdGF0aWMgY2VudGVyIChwb2ludHM6IFBvaW50W10pIHtcbiAgICBjb25zdCBtaW54ID0gcG9pbnRzLnJlZHVjZSgoeCwgcCkgPT4gTWF0aC5taW4oeCwgcC54KSwgSW5maW5pdHkpXG4gICAgY29uc3QgbWlueSA9IHBvaW50cy5yZWR1Y2UoKHksIHApID0+IE1hdGgubWluKHksIHAueSksIEluZmluaXR5KVxuICAgIGNvbnN0IG1heHggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1heCh4LCBwLngpLCAtSW5maW5pdHkpXG4gICAgY29uc3QgbWF4eSA9IHBvaW50cy5yZWR1Y2UoKHksIHApID0+IE1hdGgubWF4KHksIHAueSksIC1JbmZpbml0eSlcbiAgICByZXR1cm4gbmV3IFBvaW50KChtYXh4ICsgbWlueCkgLyAyLCAobWF4eSArIG1pbnkpIC8gMilcbiAgfVxuXG4gIC8qKlxuICAgKiByZXR1cm5zIGEgdW5pdCB2ZWN0b3IgaW4gdGhlIGRpcmVjdGlvbiBvZiBwMSB0byBwMiBpbiB0aGUgZm9ybSB7eDouLi4sIHk6Li4ufVxuICAgKiBAcGFyYW0gcDEgQSBwb2ludFxuICAgKiBAcGFyYW0gcDIgQSBwb2ludFxuICAgKi9cbiAgc3RhdGljIHVuaXRWZWN0b3IgKHAxIDogUG9pbnQsIHAyIDogUG9pbnQpIHtcbiAgICBjb25zdCB2ZWN4ID0gcDIueCAtIHAxLnhcbiAgICBjb25zdCB2ZWN5ID0gcDIueSAtIHAxLnlcbiAgICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHZlY3gsIHZlY3kpXG4gICAgcmV0dXJuIHsgeDogdmVjeCAvIGxlbmd0aCwgeTogdmVjeSAvIGxlbmd0aCB9XG4gIH1cblxuICBzdGF0aWMgZGlzdGFuY2UgKHAxOiBQb2ludCwgcDI6IFBvaW50KSB7XG4gICAgcmV0dXJuIE1hdGguaHlwb3QocDEueCAtIHAyLngsIHAxLnkgLSBwMi55KVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGN1bGF0ZSB0aGUgYW5nbGUgaW4gcmFkaWFucyBmcm9tIGhvcml6b250YWwgdG8gcDIsIHdpdGggY2VudHJlIHAxLlxuICAgKiBFLmcuIGFuZ2xlRnJvbSggKDAsMCksICgxLDEpICkgPSBwaS8yXG4gICAqIEFuZ2xlIGlzIGZyb20gMCB0byAycGlcbiAgICogQHBhcmFtICBwMSBUaGUgc3RhcnQgcG9pbnRcbiAgICogQHBhcmFtICBwMiBUaGUgZW5kIHBvaW50XG4gICAqIEByZXR1cm5zICBUaGUgYW5nbGUgaW4gcmFkaWFuc1xuICAgKi9cbiAgc3RhdGljIGFuZ2xlRnJvbSAocDE6IFBvaW50LCBwMjogUG9pbnQpOiBudW1iZXIge1xuICAgIGNvbnN0IGFuZ2xlID0gTWF0aC5hdGFuMihwMi55IC0gcDEueSwgcDIueCAtIHAxLngpXG4gICAgcmV0dXJuIGFuZ2xlID49IDAgPyBhbmdsZSA6IDIgKiBNYXRoLlBJICsgYW5nbGVcbiAgfVxuXG4gIC8qKlxuICAgKiBXaGVuIHAxIGFuZCBwMiBhcmUgbGVzcyB0aGFuIFt0cmlnZ2VyXSBhcGFydCwgdGhleSBhcmVcbiAgICogbW92ZWQgc28gdGhhdCB0aGV5IGFyZSBbZGlzdGFuY2VdIGFwYXJ0XG4gICAqIEBwYXJhbSBwMSBBIHBvaW50XG4gICAqIEBwYXJhbSBwMiBBIHBvaW50XG4gICAqIEBwYXJhbSB0cmlnZ2VyIERpc3RhbmNlIHRyaWdnZXJpbmcgcmVwdWxzaW9uXG4gICAqIEBwYXJhbSBkaXN0YW5jZSBkaXN0YW5jZSB0byByZXBlbCB0b1xuICAgKi9cbiAgc3RhdGljIHJlcGVsIChwMTogUG9pbnQsIHAyOiBQb2ludCwgdHJpZ2dlcjogbnVtYmVyLCBkaXN0YW5jZTogbnVtYmVyKSB7XG4gICAgY29uc3QgZCA9IE1hdGguaHlwb3QocDEueCAtIHAyLngsIHAxLnkgLSBwMi55KVxuICAgIGlmIChkID49IHRyaWdnZXIpIHJldHVybiBmYWxzZVxuXG4gICAgY29uc3QgciA9IChkaXN0YW5jZSAtIGQpIC8gMiAvLyBkaXN0YW5jZSB0aGV5IG5lZWQgbW92aW5nXG4gICAgcDEubW92ZVRvd2FyZChwMiwgLXIpXG4gICAgcDIubW92ZVRvd2FyZChwMSwgLXIpXG4gICAgcmV0dXJuIHRydWVcbiAgfVxuXG4gIC8qKlxuICAgKiBTY2FsZSBhbiBjZW50ZXIgYSBzZXQgb2YgcG9pbnRzIHRvIGEgZ2l2ZW4gd2lkdGggb3IgaGVpZ2h0LiBOLkIuIFRoaXMgbXV0YXRlcyB0aGUgcG9pbnRzIGluIHRoZSBhcnJheSwgc28gY2xvbmUgZmlyc3QgaWYgbmVjZXNzYXJcbiAgICogQHBhcmFtIHBvaW50cyBBbiBhcnJheSBvZiBwb2ludHNcbiAgICogQHBhcmFtIHdpZHRoIFdpZHRoIG9mIGJvdW5kaW5nIGJveCB0byBzY2FsZSB0b1xuICAgKiBAcGFyYW0gaGVpZ2h0IEhlaWdodCBvZiBib3VuZGluZyBib3ggdG8gc2NhbGUgdG9cbiAgICogQHBhcmFtIG1hcmdpbiBNYXJnaW4gdG8gbGVhdmUgYXJvdW5kIHNjYWxlZCBwb2ludHNcbiAgICogQHBhcmFtIG9mZnNldCBPZmZzZXQgZnJvbSBjZW50ZXIgb2YgYm91bmRpbmcgYm94XG4gICAqIEByZXR1cm5zIFRoZSBzY2FsZSBmYWN0b3IgdGhhdCBwb2ludHMgd2VyZSBzY2FsZWQgYnlcbiAgICovXG4gIHN0YXRpYyBzY2FsZVRvRml0IChwb2ludHM6IFBvaW50W10sIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBtYXJnaW4gPSAwLCBvZmZzZXQ6IFtudW1iZXIsIG51bWJlcl0gPSBbMCwgMF0pIHtcbiAgICBsZXQgdG9wTGVmdCA6IFBvaW50ID0gUG9pbnQubWluKHBvaW50cylcbiAgICBsZXQgYm90dG9tUmlnaHQgOiBQb2ludCA9IFBvaW50Lm1heChwb2ludHMpXG4gICAgY29uc3QgdG90YWxXaWR0aCA6IG51bWJlciA9IGJvdHRvbVJpZ2h0LnggLSB0b3BMZWZ0LnhcbiAgICBjb25zdCB0b3RhbEhlaWdodCA6IG51bWJlciA9IGJvdHRvbVJpZ2h0LnkgLSB0b3BMZWZ0LnlcbiAgICBjb25zdCBzZiA9IE1hdGgubWluKCh3aWR0aCAtIG1hcmdpbikgLyB0b3RhbFdpZHRoLCAoaGVpZ2h0IC0gbWFyZ2luKSAvIHRvdGFsSGVpZ2h0KVxuICAgIHBvaW50cy5mb3JFYWNoKHB0ID0+IHsgcHQuc2NhbGUoc2YpIH0pXG5cbiAgICAvLyBjZW50cmVcbiAgICB0b3BMZWZ0ID0gUG9pbnQubWluKHBvaW50cylcbiAgICBib3R0b21SaWdodCA9IFBvaW50Lm1heChwb2ludHMpXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbih0b3BMZWZ0LCBib3R0b21SaWdodCkudHJhbnNsYXRlKC4uLm9mZnNldClcbiAgICBwb2ludHMuZm9yRWFjaChwdCA9PiB7IHB0LnRyYW5zbGF0ZSh3aWR0aCAvIDIgLSBjZW50ZXIueCwgaGVpZ2h0IC8gMiAtIGNlbnRlci55KSB9KSAvLyBjZW50cmVcblxuICAgIHJldHVybiBzZlxuICB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnLi9Qb2ludC5qcydcblxuLyogUk5HcyAvIHNlbGVjdG9ycyAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdhdXNzaWFuIChuKSB7XG4gIGxldCBybnVtID0gMFxuICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgIHJudW0gKz0gTWF0aC5yYW5kb20oKVxuICB9XG4gIHJldHVybiBybnVtIC8gblxufVxuXG4vKipcbiAqIHJldHVybiBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbiBhbmQgbSBpbmNsdXNpdmVcbiAqIGRpc3QgKG9wdGlvbmFsKSBpcyBhIGZ1bmN0aW9uIHJldHVybmluZyBhIHZhbHVlIGluIFswLDEpXG4gKiBAcGFyYW0ge251bWJlcn0gbiBUaGUgbWluaW11bSB2YWx1ZVxuICogQHBhcmFtIHtudW1iZXJ9IG0gVGhlIG1heGltdW0gdmFsdWVcbiAqIEBwYXJhbSB7KCk9Pm51bWJlcn0gW2Rpc3RdIEEgZGlzdHJpYnV0aW9uIHJldHVybmluZyBhIG51bWJlciBmcm9tIDAgdG8gMVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZEJldHdlZW4gKG4sIG0sIGRpc3QpIHtcbiAgLy8gcmV0dXJuIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBuIGFuZCBtIGluY2x1c2l2ZVxuICAvLyBkaXN0IChvcHRpb25hbCkgaXMgYSBmdW5jdGlvbiByZXR1cm5pbmcgYSB2YWx1ZSBpbiBbMCwxKVxuICAvLyBkZWZhdWx0IGlzIHNsaWdodGx5IGJpYXNlZCB0b3dhcmRzIG1pZGRsZVxuICBpZiAoIWRpc3QpIGRpc3QgPSBNYXRoLnJhbmRvbVxuICByZXR1cm4gbiArIE1hdGguZmxvb3IoZGlzdCgpICogKG0gLSBuICsgMSkpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kQmV0d2VlbkZpbHRlciAobiwgbSwgZmlsdGVyKSB7XG4gIC8qIHJldHVybnMgYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIG4gYW5kIG0gaW5jbHVzaXZlIHdoaWNoIHNhdGlzZmllcyB0aGUgZmlsdGVyXG4gIC8gIG4sIG06IGludGVnZXJcbiAgLyAgZmlsdGVyOiBJbnQtPiBCb29sXG4gICovXG4gIGNvbnN0IGFyciA9IFtdXG4gIGZvciAobGV0IGkgPSBuOyBpIDwgbSArIDE7IGkrKykge1xuICAgIGlmIChmaWx0ZXIoaSkpIGFyci5wdXNoKGkpXG4gIH1cbiAgaWYgKGFyciA9PT0gW10pIHRocm93IG5ldyBFcnJvcignb3ZlcmZpbHRlcmVkJylcbiAgY29uc3QgaSA9IHJhbmRCZXR3ZWVuKDAsIGFyci5sZW5ndGggLSAxKVxuICByZXR1cm4gYXJyW2ldXG59XG5cbi8qKlxuICogUmV0dXJucyBhIG11bHRpcGxlIG9mIG4gYmV0d2VlbiBtaW4gYW5kIG1heFxuICogQHBhcmFtIHtudW1iZXJ9IG1pbiBNaW5pbXVtIHZhbHVlXG4gKiBAcGFyYW0ge251bWJlcn0gbWF4IE1heGltdW0gdmFsdWVcbiAqIEBwYXJhbSB7bnVtYmVyfSBuIENob29zZSBhIG11bHRpcGxlIG9mIHRoaXMgdmFsdWVcbiAqIEByZXR1cm5zIHtudW1iZXJ9IEEgbXVsdGlwbGVvZiBuIGJldHdlZW4gbWluIGFuZCBtYXhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmRNdWx0QmV0d2VlbiAobWluLCBtYXgsIG4pIHtcbiAgLy8gcmV0dXJuIGEgcmFuZG9tIG11bHRpcGxlIG9mIG4gYmV0d2VlbiBuIGFuZCBtIChpbmNsdXNpdmUgaWYgcG9zc2libGUpXG4gIG1pbiA9IE1hdGguY2VpbChtaW4gLyBuKSAqIG5cbiAgbWF4ID0gTWF0aC5mbG9vcihtYXggLyBuKSAqIG4gLy8gY291bGQgY2hlY2sgZGl2aXNpYmlsaXR5IGZpcnN0IHRvIG1heGltaXNlIHBlcmZvcm1hY2UsIGJ1dCBJJ20gc3VyZSB0aGUgaGl0IGlzbid0IGJhZFxuXG4gIHJldHVybiByYW5kQmV0d2VlbihtaW4gLyBuLCBtYXggLyBuKSAqIG5cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgcmFuZG9tIGVsZW1lbnQgb2YgYW4gYXJyYXlcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge1RbXX0gYXJyYXkgQW4gYXJyYXkgb2Ygb2JqZWN0c1xuICogQHBhcmFtIHsoKT0+bnVtYmVyfSBbZGlzdF0gQSBkaXN0cmlidXRpb24gZnVuY3Rpb24gZm9yIHdlaWdodGluZywgcmV0dXJuaW5nIGEgbnVtYmVyIGJldHdlZW4gMCBhbmQgMS4gRGVmYXVsdCBpcyBNYXRoLnJhbmRvbVxuICogQHJldHVybnMge1R9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kRWxlbSAoYXJyYXksIGRpc3QpIHtcbiAgaWYgKFsuLi5hcnJheV0ubGVuZ3RoID09PSAwKSB0aHJvdyBuZXcgRXJyb3IoJ2VtcHR5IGFycmF5JylcbiAgaWYgKCFkaXN0KSBkaXN0ID0gTWF0aC5yYW5kb21cbiAgY29uc3QgbiA9IGFycmF5Lmxlbmd0aCB8fCBhcnJheS5zaXplXG4gIGNvbnN0IGkgPSByYW5kQmV0d2VlbigwLCBuIC0gMSwgZGlzdClcbiAgcmV0dXJuIFsuLi5hcnJheV1baV1cbn1cblxuLyoqXG4gKiBTZWxlY3RzIGFuIGVsZW1lbnRcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge1RbXX0gYXJyYXkgQW4gYXJyYXkgb2YgZWxlbWVudHNcbiAqIEBwYXJhbSB7bnVtYmVyW119IHByb2JhYmlsaXRpZXMgQW4gYXJyYXkgb2YgcHJvYmJpbGl0aWVzXG4gKiBAcmV0dXJucyB7VH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmRFbGVtV2l0aFByb2JhYmlsaXRpZXMgKGFycmF5LCBwcm9iYWJpbGl0aWVzKSB7XG4gIC8vIHZhbGlkYXRlXG4gIGlmIChhcnJheS5sZW5ndGggIT09IHByb2JhYmlsaXRpZXMubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoJ0FycmF5IGxlbmd0aHMgZG8gbm90IG1hdGNoJylcblxuICBjb25zdCByID0gTWF0aC5yYW5kb20oKVxuICBsZXQgY3VtdWxhdGl2ZVByb2IgPSAwXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICBjdW11bGF0aXZlUHJvYiArPSBwcm9iYWJpbGl0aWVzW2ldXG4gICAgaWYgKHIgPCBjdW11bGF0aXZlUHJvYikgcmV0dXJuIGFycmF5W2ldXG4gIH1cblxuICAvLyBzaG91bGRuJ3QgZ2V0IGhlcmUgaWYgcHJvYmFiaWxpdGllcyBzdW0gdG8gMSwgYnV0IGNvdWxkIGJlIGEgcm91bmRpbmcgZXJyb3JcbiAgY29uc29sZS53YXJuKGBQcm9iYWJpbGl0aWVzIGRvbid0IHN1bSB0byAxPyBUb3RhbCB3YXMgJHtjdW11bGF0aXZlUHJvYn1gKVxuICByZXR1cm4gKGFycmF5W2FycmF5Lmxlbmd0aCAtIDFdKVxufVxuXG4vKipcbiAqIEZpbmRzIGEgcmFuZG9tIHB5dGhhb2dyZWFuIHRyaXBsZSB3aXRoIG1heGltdW0gaHlwb3RlbnVzZSBsZW5ndCBcbiAqIEBwYXJhbSB7bnVtYmVyfSBtYXggVGhlIG1heGltdW0gbGVuZ3RoIG9mIHRoZSBoeXBvdGVudXNlXG4gKiBAcmV0dXJucyB7e2E6IG51bWJlciwgYjogbnVtYmVyLCBjOiBudW1iZXJ9fSBUaHJlZSB2YWx1ZXMgc3VjaCB0aGF0IGFeMitiXjI9Y14yXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kUHl0aGFnVHJpcGxlKG1heCkge1xuICBjb25zdCBuID0gcmFuZEJldHdlZW4oMiwgTWF0aC5jZWlsKE1hdGguc3FydChtYXgpKS0xKTtcbiAgY29uc3QgbSA9IHJhbmRCZXR3ZWVuKDEsIE1hdGgubWluKG4tMSxNYXRoLmZsb29yKE1hdGguc3FydChtYXgtbipuKSkpKTtcbiAgcmV0dXJuIHthOiBuKm4tbSptLCBiOiAyKm4qbSwgYzpuKm4rbSptfTtcbn1cblxuLyoqXG4gKiBSYW5kb20gcHl0aGFnb3JlYW4gdHJpcGxlIHdpdGggYSBnaXZlbiBsZWdcbiAqIEBwYXJhbSB7bnVtYmVyfSBhIFRoZSBsZW5ndGggb2YgdGhlIGZpcnN0IGxlZ1xuICogQHBhcmFtIHtudW1iZXJ9IG1heCBUaGUgbWF4aW11bSBsZW5ndGggb2YgdGhlIGh5cG90ZW51c2VcbiAqIEByZXR1cm5zIHt7YTogbnVtYmVyLCBiOiBudW1iZXIsIGM6bnVtYmVyfX0gVGhyZWUgdmFsdWVzIHN1Y2ggdGhhdCBhXjIrYl4yID0gY14yIGFuZCBhIGlzIHRoZSBmaXJzdCBpbnB1dCBwYXJhbWV0ZXJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmRQeXRoYWdUcmlwbGVXaXRoTGVnKGEsbWF4KSB7XG4gIC8qIFJhbmRvbSBweXRoYWdvcmVhbiB0cmlwbGUgd2l0aCBhIGdpdmVuIGxlZ1xuICAgKiBUaGF0IGxlZyBpcyB0aGUgZmlyc3Qgb25lICovXG5cbiAgaWYgKG1heD09PXVuZGVmaW5lZCkgbWF4ID0gNTAwO1xuXG4gIGlmIChhJTI9PT0xKSB7IC8vb2RkOiBhID0gbl4yLW1eMlxuICAgIHJldHVybiByYW5kUHl0aGFnbm5fbW0oYSxtYXgpO1xuICB9IGVsc2UgeyAvL2V2ZW46IHRyeSBhID0gMm1uLCBidXQgaWYgdGhhdCBmYWlscywgdHJ5IGE9bl4yLW1eMlxuICAgIGxldCB0cmlwbGU7XG4gICAgbGV0IGYxLCBmMjtcbiAgICBpZiAoTWF0aC5yYW5kb20oKTwwLjUpIHtcbiAgICAgIGYxID0gcmFuZFB5dGhhZzJtbiwgZjI9cmFuZFB5dGhhZ25uX21tO1xuICAgIH0gZWxzZSB7XG4gICAgICBmMiA9IHJhbmRQeXRoYWcybW4sIGYxPXJhbmRQeXRoYWdubl9tbTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIHRyaXBsZSA9IGYxKGEsbWF4KTtcbiAgICB9IGNhdGNoKGVycikge1xuICAgICAgdHJpcGxlID0gZjIoYSxtYXgpO1xuICAgIH0gXG4gICAgcmV0dXJuIHRyaXBsZTtcbiAgfVxufVxuXG5mdW5jdGlvbiByYW5kUHl0aGFnMm1uKGEsbWF4KSB7XG4gIC8vIGFzc3VtZXMgYSBpcyAybW4sIGZpbmRzIGFwcHJvcHJpYXRlIHBhcmFtZXRlcnNcbiAgLy8gbGV0IG0sbiBiZSBhIGZhY3RvciBwYWlyIG9mIGEvMlxuICBsZXQgZmFjdG9ycyA9IFtdOyAvL2ZhY3RvcnMgb2YgblxuICBjb25zdCBtYXhtID0gTWF0aC5zcXJ0KGEvMik7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gIGZvciAobGV0IG09MTsgbTxtYXhtOyBtKyspIHtcbiAgICBpZiAoIChhLzIpJW09PT0wICYmIG0qbSsoYSphKS8oNCptKm0pPD1tYXggKSB7XG4gICAgICBmYWN0b3JzLnB1c2gobSk7XG4gICAgfVxuICB9XG4gIGlmIChmYWN0b3JzLmxlbmd0aD09PTApIHRocm93IFwiMm1uIG5vIG9wdGlvbnNcIjtcblxuICBsZXQgbSA9IHJhbmRFbGVtKGZhY3RvcnMpO1xuICBsZXQgbiA9IGEvKDIqbSk7XG4gIHJldHVybiB7YTogMipuKm0sIGI6IE1hdGguYWJzKG4qbi1tKm0pLCBjOm4qbittKm19O1xufVxuXG5mdW5jdGlvbiByYW5kUHl0aGFnbm5fbW0oYSxtYXgpIHtcbiAgLy8gYXNzdW1lcyBhID0gbl4yLW1eMlxuICAvLyBtPXNxcnQoYStuXjIpXG4gIC8vIGN5Y2xlIHRocm91Z2ggMeKJpG3iiaRzcXJ0KChtYXgtYSkvMilcbiAgbGV0IHBvc3NpYmxlcyA9IFtdO1xuICBjb25zdCBtYXhtID0gTWF0aC5zcXJ0KChtYXgtYSkvMik7XG4gIGZvciAobGV0IG09MTsgbTw9bWF4bTsgbSsrKSB7XG4gICAgbGV0IG4gPSBNYXRoLnNxcnQoYSttKm0pO1xuICAgIGlmIChuPT09TWF0aC5mbG9vcihuKSkgcG9zc2libGVzLnB1c2goW24sbV0pO1xuICB9XG4gIGlmIChwb3NzaWJsZXMubGVuZ3RoPT09MCkgdGhyb3cgXCJuXjItbV4yIG5vIG9wdGlvbnNcIjtcblxuICBsZXQgW24sbV0gPSByYW5kRWxlbShwb3NzaWJsZXMpO1xuXG4gIHJldHVybiB7YTogbipuLW0qbSwgYjogMipuKm0sIGM6IG4qbittKm19O1xufVxuXG4vKiBNYXRocyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJvdW5kVG9UZW4gKG4pIHtcbiAgcmV0dXJuIE1hdGgucm91bmQobiAvIDEwKSAqIDEwXG59XG5cbi8qKlxuICogUm91bmRzIGEgbnVtYmVyIHRvIGEgZ2l2ZW4gbnVtYmVyIG9mIGRlY2ltYWwgcGxhY2VzXG4gKiBAcGFyYW0ge251bWJlcn0geCBUaGUgbnVtYmVyIHRvIHJvdW5kXG4gKiBAcGFyYW0ge251bWJlcn0gbiBUaGUgbnVtYmVyIG9mIGRlY2ltYWwgcGxhY2VzXG4gKiBAcmV0dXJucyB7bnVtYmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcm91bmREUCAoeCwgbikge1xuICByZXR1cm4gTWF0aC5yb3VuZCh4ICogTWF0aC5wb3coMTAsIG4pKSAvIE1hdGgucG93KDEwLCBuKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVnVG9SYWQgKHgpIHtcbiAgcmV0dXJuIHggKiBNYXRoLlBJIC8gMTgwXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaW5EZWcgKHgpIHtcbiAgcmV0dXJuIE1hdGguc2luKHggKiBNYXRoLlBJIC8gMTgwKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY29zRGVnICh4KSB7XG4gIHJldHVybiBNYXRoLmNvcyh4ICogTWF0aC5QSSAvIDE4MClcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGluZyBuLzEwXmRwXG4gKiBFLmcuIHNjYWxlZFN0cigzMTQsMikgPSBcIjMuMTRcIlxuICogQHBhcmFtIHtudW1iZXJ9IG4gQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIGRpZ2l0cyBvZiBhIGZpeGVkIHBvaW50IG51bWJlclxuICogQHBhcmFtIHtudW1iZXJ9IGRwIEFuIGludGVnZXIgZm9yIG51bWJlciBvZiBkZWNpbWFsIHBsYWNlc1xuICogQHJldHVybnMge3N0cmluZ31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNjYWxlZFN0ciAobiwgZHApIHtcbiAgaWYgKGRwID09PSAwKSByZXR1cm4gblxuICBjb25zdCBmYWN0b3IgPSBNYXRoLnBvdygxMCwgZHApXG4gIGNvbnN0IGludHBhcnQgPSBNYXRoLmZsb29yKG4gLyBmYWN0b3IpXG4gIGNvbnN0IGRlY3BhcnQgPSBuICUgZmFjdG9yXG4gIGlmIChkZWNwYXJ0ID09PSAwKSB7XG4gICAgcmV0dXJuIGludHBhcnRcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gaW50cGFydCArICcuJyArIGRlY3BhcnRcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2NkIChhLCBiKSB7XG4gIC8vIHRha2VuIGZyb20gZnJhY3Rpb24uanNcbiAgaWYgKCFhKSB7IHJldHVybiBiIH1cbiAgaWYgKCFiKSB7IHJldHVybiBhIH1cblxuICB3aGlsZSAoMSkge1xuICAgIGEgJT0gYlxuICAgIGlmICghYSkgeyByZXR1cm4gYiB9XG4gICAgYiAlPSBhXG4gICAgaWYgKCFiKSB7IHJldHVybiBhIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbGNtIChhLCBiKSB7XG4gIHJldHVybiBhICogYiAvIGdjZChhLCBiKVxufVxuXG4vKiBBcnJheXMgYW5kIHNpbWlsYXIgKi9cblxuLyoqXG4gKiBTb3J0cyB0d28gYXJyYXlzIHRvZ2V0aGVyIGJhc2VkIG9uIHNvcnRpbmcgYXJyMFxuICogQHBhcmFtIHsqW119IGFycjBcbiAqIEBwYXJhbSB7KltdfSBhcnIxXG4gKiBAcGFyYW0geyp9IGZcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNvcnRUb2dldGhlciAoYXJyMCwgYXJyMSwgZikge1xuICBpZiAoYXJyMC5sZW5ndGggIT09IGFycjEubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm90aCBhcmd1bWVudHMgbXVzdCBiZSBhcnJheXMgb2YgdGhlIHNhbWUgbGVuZ3RoJylcbiAgfVxuXG4gIGYgPSBmIHx8ICgoeCwgeSkgPT4geCAtIHkpXG5cbiAgY29uc3QgbiA9IGFycjAubGVuZ3RoXG4gIGNvbnN0IGNvbWJpbmVkID0gW11cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICBjb21iaW5lZFtpXSA9IFthcnIwW2ldLCBhcnIxW2ldXVxuICB9XG5cbiAgY29tYmluZWQuc29ydCgoeCwgeSkgPT4gZih4WzBdLCB5WzBdKSlcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgIGFycjBbaV0gPSBjb21iaW5lZFtpXVswXVxuICAgIGFycjFbaV0gPSBjb21iaW5lZFtpXVsxXVxuICB9XG5cbiAgcmV0dXJuIFthcnIwLCBhcnIxXVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2h1ZmZsZSAoYXJyYXkpIHtcbiAgLy8gS251dGgtRmlzaGVyLVlhdGVzXG4gIC8vIGZyb20gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzI0NTA5NzYvMzczNzI5NVxuICAvLyBuYi4gc2h1ZmZsZXMgaW4gcGxhY2VcbiAgdmFyIGN1cnJlbnRJbmRleCA9IGFycmF5Lmxlbmd0aDsgdmFyIHRlbXBvcmFyeVZhbHVlOyB2YXIgcmFuZG9tSW5kZXhcblxuICAvLyBXaGlsZSB0aGVyZSByZW1haW4gZWxlbWVudHMgdG8gc2h1ZmZsZS4uLlxuICB3aGlsZSAoY3VycmVudEluZGV4ICE9PSAwKSB7XG4gICAgLy8gUGljayBhIHJlbWFpbmluZyBlbGVtZW50Li4uXG4gICAgcmFuZG9tSW5kZXggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjdXJyZW50SW5kZXgpXG4gICAgY3VycmVudEluZGV4IC09IDFcblxuICAgIC8vIEFuZCBzd2FwIGl0IHdpdGggdGhlIGN1cnJlbnQgZWxlbWVudC5cbiAgICB0ZW1wb3JhcnlWYWx1ZSA9IGFycmF5W2N1cnJlbnRJbmRleF1cbiAgICBhcnJheVtjdXJyZW50SW5kZXhdID0gYXJyYXlbcmFuZG9tSW5kZXhdXG4gICAgYXJyYXlbcmFuZG9tSW5kZXhdID0gdGVtcG9yYXJ5VmFsdWVcbiAgfVxuXG4gIHJldHVybiBhcnJheVxufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBhIGlzIGFuIGFycmF5IGNvbnRhaW5pbmcgZSwgZmFsc2Ugb3RoZXJ3aXNlIChpbmNsdWRpbmcgaWYgYSBpcyBub3QgYW4gYXJyYXkpXG4gKiBAcGFyYW0geyp9IGEgIEFuIGFycmF5XG4gKiBAcGFyYW0geyp9IGUgQW4gZWxlbWVudCB0byBjaGVjayBpZiBpcyBpbiB0aGUgYXJyYXlcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5leHBvcnQgZnVuY3Rpb24gd2Vha0luY2x1ZGVzIChhLCBlKSB7XG4gIHJldHVybiAoQXJyYXkuaXNBcnJheShhKSAmJiBhLmluY2x1ZGVzKGUpKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlyc3RVbmlxdWVJbmRleCAoYXJyYXkpIHtcbiAgLy8gcmV0dXJucyBpbmRleCBvZiBmaXJzdCB1bmlxdWUgZWxlbWVudFxuICAvLyBpZiBub25lLCByZXR1cm5zIGxlbmd0aCBvZiBhcnJheVxuICBsZXQgaSA9IDBcbiAgd2hpbGUgKGkgPCBhcnJheS5sZW5ndGgpIHtcbiAgICBpZiAoYXJyYXkuaW5kZXhPZihhcnJheVtpXSkgPT09IGFycmF5Lmxhc3RJbmRleE9mKGFycmF5W2ldKSkge1xuICAgICAgYnJlYWtcbiAgICB9XG4gICAgaSsrXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJvb2xPYmplY3RUb0FycmF5IChvYmopIHtcbiAgLy8gR2l2ZW4gYW4gb2JqZWN0IHdoZXJlIGFsbCB2YWx1ZXMgYXJlIGJvb2xlYW4sIHJldHVybiBrZXlzIHdoZXJlIHRoZSB2YWx1ZSBpcyB0cnVlXG4gIGNvbnN0IHJlc3VsdCA9IFtdXG4gIGZvciAoY29uc3Qga2V5IGluIG9iaikge1xuICAgIGlmIChvYmpba2V5XSkgcmVzdWx0LnB1c2goa2V5KVxuICB9XG4gIHJldHVybiByZXN1bHRcbn1cblxuLyogT2JqZWN0IHByb3BlcnR5IGFjY2VzcyBieSBzdHJpbmcgKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm9wQnlTdHJpbmcgKG8sIHMsIHgpIHtcbiAgLyogRS5nLiBieVN0cmluZyhteU9iaixcImZvby5iYXJcIikgLT4gbXlPYmouZm9vLmJhclxuICAgICAqIGJ5U3RyaW5nKG15T2JqLFwiZm9vLmJhclwiLFwiYmF6XCIpIC0+IG15T2JqLmZvby5iYXIgPSBcImJhelwiXG4gICAgICovXG4gIHMgPSBzLnJlcGxhY2UoL1xcWyhcXHcrKVxcXS9nLCAnLiQxJykgLy8gY29udmVydCBpbmRleGVzIHRvIHByb3BlcnRpZXNcbiAgcyA9IHMucmVwbGFjZSgvXlxcLi8sICcnKSAvLyBzdHJpcCBhIGxlYWRpbmcgZG90XG4gIHZhciBhID0gcy5zcGxpdCgnLicpXG4gIGZvciAodmFyIGkgPSAwLCBuID0gYS5sZW5ndGggLSAxOyBpIDwgbjsgKytpKSB7XG4gICAgdmFyIGsgPSBhW2ldXG4gICAgaWYgKGsgaW4gbykge1xuICAgICAgbyA9IG9ba11cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICB9XG4gIGlmICh4ID09PSB1bmRlZmluZWQpIHJldHVybiBvW2Fbbl1dXG4gIGVsc2Ugb1thW25dXSA9IHhcbn1cblxuLyogTG9naWMgKi9cbmV4cG9ydCBmdW5jdGlvbiBtSWYgKHAsIHEpIHsgLy8gbWF0ZXJpYWwgY29uZGl0aW9uYWxcbiAgcmV0dXJuICghcCB8fCBxKVxufVxuXG4vKiBET00gbWFuaXB1bGF0aW9uIGFuZCBxdWVyeWluZyAqL1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgSFRNTCBlbGVtZW50LCBzZXRzIGNsYXNzZXMgYW5kIGFwcGVuZHNcbiAqIEBwYXJhbSB7c3RyaW5nfSB0YWdOYW1lIFRhZyBuYW1lIG9mIGVsZW1lbnRcbiAqIEBwYXJhbSB7c3RyaW5nfHVuZGVmaW5lZH0gW2NsYXNzTmFtZV0gQSBjbGFzcyBvciBjbGFzc2VzIHRvIGFzc2lnbiB0byB0aGUgZWxlbWVudFxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gW3BhcmVudF0gQSBwYXJlbnQgZWxlbWVudCB0byBhcHBlbmQgdGhlIGVsZW1lbnQgdG9cbiAqIEByZXR1cm5zIHtIVE1MRWxlbWVudH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVsZW0gKHRhZ05hbWUsIGNsYXNzTmFtZSwgcGFyZW50KSB7XG4gIC8vIGNyZWF0ZSwgc2V0IGNsYXNzIGFuZCBhcHBlbmQgaW4gb25lXG4gIGNvbnN0IGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpXG4gIGlmIChjbGFzc05hbWUpIGVsZW0uY2xhc3NOYW1lID0gY2xhc3NOYW1lXG4gIGlmIChwYXJlbnQpIHBhcmVudC5hcHBlbmRDaGlsZChlbGVtKVxuICByZXR1cm4gZWxlbVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFzQW5jZXN0b3JDbGFzcyAoZWxlbSwgY2xhc3NOYW1lKSB7XG4gIC8vIGNoZWNrIGlmIGFuIGVsZW1lbnQgZWxlbSBvciBhbnkgb2YgaXRzIGFuY2VzdG9ycyBoYXMgY2xzc1xuICBsZXQgcmVzdWx0ID0gZmFsc2VcbiAgZm9yICg7ZWxlbSAmJiBlbGVtICE9PSBkb2N1bWVudDsgZWxlbSA9IGVsZW0ucGFyZW50Tm9kZSkgeyAvLyB0cmF2ZXJzZSBET00gdXB3YXJkc1xuICAgIGlmIChlbGVtLmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpKSB7XG4gICAgICByZXN1bHQgPSB0cnVlXG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHRcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIGlmIHR3byBlbGVtZW50cyBvdmVybGFwXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtMSBBbiBIVE1MIGVsZW1lbnRcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW0yIEFuIEhUTUwgZWxlbWVudFxuICovXG5mdW5jdGlvbiBvdmVybGFwKCBlbGVtMSwgZWxlbTIpIHtcbiAgY29uc3QgcmVjdDEgPSBlbGVtMS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVxuICBjb25zdCByZWN0MiA9IGVsZW0yLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpXG4gIHJldHVybiAhKHJlY3QxLnJpZ2h0IDwgcmVjdDIubGVmdCB8fCBcbiAgICAgICAgICAgcmVjdDEubGVmdCA+IHJlY3QyLnJpZ2h0IHx8IFxuICAgICAgICAgICByZWN0MS5ib3R0b20gPCByZWN0Mi50b3AgfHwgXG4gICAgICAgICAgIHJlY3QxLnRvcCA+IHJlY3QyLmJvdHRvbSlcbn1cblxuLyoqXG4gKiBJZiBlbGVtMSBhbmQgZWxlbTIgb3ZlcmxhcCwgbW92ZSB0aGVtIGFwYXJ0IHVudGlsIHRoZXkgZG9uJ3QuXG4gKiBPbmx5IHdvcmtzIGZvciB0aG9zZSB3aXRoIHBvc2l0aW9uOmFic29sdXRlXG4gKiBUaGlzIHN0cmlwcyB0cmFuc2Zvcm1hdGlvbnMsIHdoaWNoIG1heSBiZSBhIHByb2JsZW1cbiAqIEVsZW1lbnRzIHdpdGggY2xhc3MgJ3JlcGVsLWxvY2tlZCcgd2lsbCBub3QgYmUgbW92ZWRcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW0xIEFuIEhUTUwgZWxlbWVudFxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbTIgQW4gSFRNTCBlbGVtZW50XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXBlbEVsZW1lbnRzKGVsZW0xLCBlbGVtMikgIHtcbiAgaWYgKCFvdmVybGFwKGVsZW0xLGVsZW0yKSkgcmV0dXJuXG4gIGlmIChnZXRDb21wdXRlZFN0eWxlKGVsZW0xKS5wb3NpdGlvbiAhPT0gXCJhYnNvbHV0ZVwiIHx8IGdldENvbXB1dGVkU3R5bGUoZWxlbTIpLnBvc2l0aW9uICE9PSAnYWJzb2x1dGUnKSB0aHJvdyBuZXcgRXJyb3IgKCdPbmx5IGNhbGwgb24gcG9zaXRpb246YWJzb2x1dGUnKVxuICBsZXQgdGwxID0gUG9pbnQuZnJvbUVsZW1lbnQoZWxlbTEpXG4gIGxldCB0bDIgPSBQb2ludC5mcm9tRWxlbWVudChlbGVtMilcbiAgXG4gIGNvbnN0IGMxID0gUG9pbnQuZnJvbUVsZW1lbnQoZWxlbTEsIFwiY2VudGVyXCIpXG4gIGNvbnN0IGMyID0gUG9pbnQuZnJvbUVsZW1lbnQoZWxlbTIsIFwiY2VudGVyXCIpXG4gIGNvbnN0IHZlYyA9IFBvaW50LnVuaXRWZWN0b3IoYzEsYzIpXG5cbiAgY29uc3QgbG9ja2VkMSA9IGVsZW0xLmNsYXNzTGlzdC5jb250YWlucygncmVwZWwtbG9ja2VkJylcbiAgY29uc3QgbG9ja2VkMiA9IGVsZW0yLmNsYXNzTGlzdC5jb250YWlucygncmVwZWwtbG9ja2VkJylcblxuICBsZXQgaSA9IDBcbiAgd2hpbGUob3ZlcmxhcChlbGVtMSxlbGVtMikgJiYgaTw1MDApIHtcbiAgICBpZiAoIWxvY2tlZDEpIHRsMS50cmFuc2xhdGUoLXZlYy54LC12ZWMueSlcbiAgICBpZiAoIWxvY2tlZDIpIHRsMi50cmFuc2xhdGUodmVjLngsdmVjLnkpXG4gICAgZWxlbTEuc3R5bGUubGVmdCA9IHRsMS54ICsgXCJweFwiXG4gICAgZWxlbTEuc3R5bGUudG9wID0gdGwxLnkgKyBcInB4XCJcbiAgICBlbGVtMS5zdHlsZS50cmFuc2Zvcm0gPSBcIm5vbmVcIlxuICAgIGVsZW0yLnN0eWxlLmxlZnQgPSB0bDIueCArIFwicHhcIlxuICAgIGVsZW0yLnN0eWxlLnRvcCA9IHRsMi55ICsgXCJweFwiXG4gICAgZWxlbTIuc3R5bGUudHJhbnNmb3JtID0gXCJub25lXCJcbiAgICBpKytcbiAgfVxuICBpZiAoaT09PTUwMCkgdGhyb3cgbmV3IEVycm9yKCdUb28gbXVjaCBtb3ZpbmcnKVxuICBjb25zb2xlLmxvZyhgUmVwZWxsZWQgd2l0aCAke2l9IGl0ZXJhdGlvbnNgKVxufVxuXG4vKiBDYW52YXMgZHJhd2luZyAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhc2hlZExpbmUgKGN0eCwgeDEsIHkxLCB4MiwgeTIpIHtcbiAgY29uc3QgbGVuZ3RoID0gTWF0aC5oeXBvdCh4MiAtIHgxLCB5MiAtIHkxKVxuICBjb25zdCBkYXNoeCA9ICh5MSAtIHkyKSAvIGxlbmd0aCAvLyB1bml0IHZlY3RvciBwZXJwZW5kaWN1bGFyIHRvIGxpbmVcbiAgY29uc3QgZGFzaHkgPSAoeDIgLSB4MSkgLyBsZW5ndGhcbiAgY29uc3QgbWlkeCA9ICh4MSArIHgyKSAvIDJcbiAgY29uc3QgbWlkeSA9ICh5MSArIHkyKSAvIDJcblxuICAvLyBkcmF3IHRoZSBiYXNlIGxpbmVcbiAgY3R4Lm1vdmVUbyh4MSwgeTEpXG4gIGN0eC5saW5lVG8oeDIsIHkyKVxuXG4gIC8vIGRyYXcgdGhlIGRhc2hcbiAgY3R4Lm1vdmVUbyhtaWR4ICsgNSAqIGRhc2h4LCBtaWR5ICsgNSAqIGRhc2h5KVxuICBjdHgubGluZVRvKG1pZHggLSA1ICogZGFzaHgsIG1pZHkgLSA1ICogZGFzaHkpXG5cbiAgY3R4Lm1vdmVUbyh4MiwgeTIpXG59XG4iLCJpbXBvcnQgeyBPcHRpb25zU3BlYywgT3B0aW9uIGFzIE9wdGlvbkksIFNlbGVjdEV4Y2x1c2l2ZU9wdGlvbiwgU2VsZWN0SW5jbHVzaXZlT3B0aW9uLCBSZWFsT3B0aW9uLCBSYW5nZU9wdGlvbiwgSW50ZWdlck9wdGlvbiwgQm9vbGVhbk9wdGlvbiB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuaW1wb3J0IHsgY3JlYXRlRWxlbSB9IGZyb20gJ3V0aWxpdGllcydcblxuLyoqICBSZWNvcmRzIHR5cHNlIG9mIG9wdGlvbiBhdmFpbGFiaWx0eSwgYW5kIGxpbmsgdG8gVUkgYW5kIGZ1cnRoZXIgb3B0aW9ucyBzZXRzICovXG50eXBlIE9wdGlvbnNwZWMyID0gKE9wdGlvbnNTcGVjWzBdICYgeyAvLyBTdGFydCB3aXRoIHN0YW5kYXJkIG9wdGlvbnMgc3BlYyAtIHRha2VuIGZyb20gcXVlc3Rpb24gZ2VuZXJhdG9yIGNsYXNzZXNcbiAgZWxlbWVudD86IEhUTUxFbGVtZW50LCAvLyBtb3N0IHdpbGwgYWxzbyBoYXZlIGxpbmtzIHRvIGEgVUkgZWxlbWVudFxuICBzdWJPcHRpb25zU2V0PzogT3B0aW9uc1NldCAvLyBmb3Igb3B0aW9uLnR5cGU9XCJzdWJvcHRpb25zXCIsIGhvbGQgbGluayB0byB0aGUgT3B0aW9uc1NldCBmb3IgdGhhdFxufSlbXVxuXG4vKipcbiAqIEEgc2ltcGxlIG9iamVjdCByZXByZXNlbnRpbmcgb3B0aW9ucyB0byBzZW5kIHRvIGEgcXVlc3Rpb24gZ2VuZXJhdG9yXG4gKiBOQi4gVGhpcyBpcyBhIHZlcnkgJ2xvb3NlJyB0eXBlXG4gKi9cbmludGVyZmFjZSBPcHRpb25zIHtcbiAgW2tleTogc3RyaW5nXTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IHN0cmluZ1tdIHwgT3B0aW9uc1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBzZXQgb2Ygb3B0aW9ucywgd2l0aCBsaW5rIHRvIFVJIGVsZW1lbnRzLiBTdG9yZXMgaW50ZXJuYWxseSB0aGUgb3B0aW9uc1xuICogaW4gYSBzaW1wbGUgb2JqZWN0IHN1aXRhYmxlIGZvciBwYXNzaW5nIHRvIHF1ZXN0aW9uIGdlbmVyYXRvcnNcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgT3B0aW9uc1NldCB7XG4gIG9wdGlvbnNTcGVjIDogT3B0aW9uc3BlYzJcbiAgb3B0aW9ucyA6IE9wdGlvbnNcbiAgdGVtcGxhdGU/IDogc3RyaW5nXG4gIGdsb2JhbElkOiBzdHJpbmdcbiAgc3RhdGljIGlkQ291bnRlciA9IDAgLy8gaW5jcmVtZW50IGVhY2ggdGltZSB0byBjcmVhdGUgdW5pcXVlIGlkcyB0byB1c2UgaW4gaWRzL25hbWVzIG9mIGVsZW1lbnRzXG5cbiAgc3RhdGljIGdldElkICgpOiBzdHJpbmcge1xuICAgIGlmIChPcHRpb25zU2V0LmlkQ291bnRlciA+PSAyNiAqKiAyKSB0aHJvdyBuZXcgRXJyb3IoJ1RvbyBtYW55IG9wdGlvbnMgb2JqZWN0cyEnKVxuICAgIGNvbnN0IGlkID0gU3RyaW5nLmZyb21DaGFyQ29kZSh+fihPcHRpb25zU2V0LmlkQ291bnRlciAvIDI2KSArIDk3KSArXG4gICAgICBTdHJpbmcuZnJvbUNoYXJDb2RlKE9wdGlvbnNTZXQuaWRDb3VudGVyICUgMjYgKyA5NylcblxuICAgIE9wdGlvbnNTZXQuaWRDb3VudGVyICs9IDFcblxuICAgIHJldHVybiBpZFxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBvcHRpb25zIHNwZWNcbiAgICogQHBhcmFtIG9wdGlvbnNTcGVjIFNwZWNpZmljYXRpb24gb2Ygb3B0aW9uc1xuICAgKiBAcGFyYW0gdGVtcGxhdGUgQSB0ZW1wbGF0ZSBmb3IgZGlzcGxheWluZyBvcHRpb25zLCB1c2luZyB7e211c3RhY2hlfX0gc3ludGF4XG4gICAqL1xuICBjb25zdHJ1Y3RvciAob3B0aW9uc1NwZWMgOiBPcHRpb25zU3BlYywgdGVtcGxhdGU/IDogc3RyaW5nKSB7XG4gICAgdGhpcy5vcHRpb25zU3BlYyA9IG9wdGlvbnNTcGVjIGFzIE9wdGlvbnNwZWMyXG5cbiAgICB0aGlzLm9wdGlvbnMgPSB7fVxuICAgIHRoaXMub3B0aW9uc1NwZWMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgaWYgKGlzUmVhbE9wdGlvbihvcHRpb24pICYmIG9wdGlvbi50eXBlICE9PSAnc3Vib3B0aW9ucycgJiYgb3B0aW9uLnR5cGUgIT09ICdyYW5nZScpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBvcHRpb24uZGVmYXVsdFxuICAgICAgfSBlbHNlIGlmIChvcHRpb24udHlwZSA9PT0gJ3JhbmdlJykge1xuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkTEJdID0gb3B0aW9uLmRlZmF1bHRMQlxuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkVUJdID0gb3B0aW9uLmRlZmF1bHRVQlxuICAgICAgfSBlbHNlIGlmIChvcHRpb24udHlwZSA9PT0gJ3N1Ym9wdGlvbnMnKSB7IC8vIFJlY3Vyc2l2ZWx5IGJ1aWxkIHN1Ym9wdGlvbnMuIFRlcm1pbmF0ZXMgYXMgbG9uZyBhcyBvcHRpb25zU3BlYyBpcyBub3QgY2lyY3VsYXJcbiAgICAgICAgb3B0aW9uLnN1Yk9wdGlvbnNTZXQgPSBuZXcgT3B0aW9uc1NldChvcHRpb24ub3B0aW9uc1NwZWMpXG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gb3B0aW9uLnN1Yk9wdGlvbnNTZXQub3B0aW9uc1xuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGUgLy8gaHRtbCB0ZW1wbGF0ZSAob3B0aW9uYWwpXG5cbiAgICAvLyBzZXQgYW4gaWQgYmFzZWQgb24gYSBjb3VudGVyIC0gdXNlZCBmb3IgbmFtZXMgb2YgZm9ybSBlbGVtZW50c1xuICAgIHRoaXMuZ2xvYmFsSWQgPSBPcHRpb25zU2V0LmdldElkKClcbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhbiBvcHRpb24sIGZpbmQgaXRzIFVJIGVsZW1lbnQgYW5kIHVwZGF0ZSB0aGUgc3RhdGUgZnJvbSB0aGF0XG4gICAqIEBwYXJhbSB7Kn0gb3B0aW9uIEFuIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25TcGVjIG9yIGFuIGlkXG4gICAqL1xuICB1cGRhdGVTdGF0ZUZyb21VSSAob3B0aW9uIDogT3B0aW9uc3BlYzJbMF0gfCBzdHJpbmcpIDogdm9pZCB7XG4gICAgLy8gaW5wdXQgLSBlaXRoZXIgYW4gZWxlbWVudCBvZiB0aGlzLm9wdGlvbnNTcGVjIG9yIGFuIG9wdGlvbiBpZFxuICAgIGlmICh0eXBlb2YgKG9wdGlvbikgPT09ICdzdHJpbmcnKSB7XG4gICAgICBjb25zdCBvcHRpb25zU3BlYyA6IE9wdGlvbnNwZWMyWzBdIHwgdW5kZWZpbmVkID0gdGhpcy5vcHRpb25zU3BlYy5maW5kKHggPT4gKCh4IGFzIE9wdGlvbkkpLmlkID09PSBvcHRpb24pKVxuICAgICAgaWYgKG9wdGlvbnNTcGVjICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgb3B0aW9uID0gb3B0aW9uc1NwZWNcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgbm8gb3B0aW9uIHdpdGggaWQgJyR7b3B0aW9ufSdgKVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIW9wdGlvbi5lbGVtZW50KSB0aHJvdyBuZXcgRXJyb3IoYG9wdGlvbiAkeyhvcHRpb24gYXMgT3B0aW9uSSkuaWR9IGRvZXNuJ3QgaGF2ZSBhIFVJIGVsZW1lbnRgKVxuXG4gICAgc3dpdGNoIChvcHRpb24udHlwZSkge1xuICAgICAgY2FzZSAnaW50Jzoge1xuICAgICAgICBjb25zdCBpbnB1dCA6IEhUTUxJbnB1dEVsZW1lbnQgPSBvcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKVswXVxuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IE51bWJlcihpbnB1dC52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2Jvb2wnOiB7XG4gICAgICAgIGNvbnN0IGlucHV0IDogSFRNTElucHV0RWxlbWVudCA9IG9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpWzBdXG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gaW5wdXQuY2hlY2tlZFxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAnc2VsZWN0LWV4Y2x1c2l2ZSc6IHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSAob3B0aW9uLmVsZW1lbnQucXVlcnlTZWxlY3RvcignaW5wdXQ6Y2hlY2tlZCcpIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdzZWxlY3QtaW5jbHVzaXZlJzoge1xuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9XG4gICAgICAgICAgKEFycmF5LmZyb20ob3B0aW9uLmVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnaW5wdXQ6Y2hlY2tlZCcpKSBhcyBIVE1MSW5wdXRFbGVtZW50W10pLm1hcCh4ID0+IHgudmFsdWUpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdyYW5nZSc6IHtcbiAgICAgICAgY29uc3QgaW5wdXRMQiA6IEhUTUxJbnB1dEVsZW1lbnQgPSBvcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKVswXVxuICAgICAgICBjb25zdCBpbnB1dFVCIDogSFRNTElucHV0RWxlbWVudCA9IG9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpWzFdXG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRMQl0gPSBOdW1iZXIoaW5wdXRMQi52YWx1ZSlcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZFVCXSA9IE51bWJlcihpbnB1dFVCLnZhbHVlKVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYG9wdGlvbiB3aXRoIGlkICR7KG9wdGlvbiBhcyBPcHRpb25JKS5pZH0gaGFzIHVucmVjb2duaXNlZCBvcHRpb24gdHlwZSAke29wdGlvbi50eXBlfWApXG4gICAgfVxuICAgIGNvbnNvbGUubG9nKHRoaXMub3B0aW9ucylcbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIHN0cmluZywgcmV0dXJuIHRoZSBlbGVtZW50IG9mIHRoaXMub3B0aW9ucyB3aXRoIHRoYXQgaWRcbiAgICogQHBhcmFtIGlkIFRoZSBpZFxuICAgKi9cblxuICB1cGRhdGVTdGF0ZUZyb21VSUFsbCAoKTogdm9pZCB7XG4gICAgdGhpcy5vcHRpb25zU3BlYy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICBpZiAoaXNSZWFsT3B0aW9uKG9wdGlvbikpIHtcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0ZUZyb21VSShvcHRpb24pXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGRpc2FibGVPckVuYWJsZUFsbCAoKTogdm9pZCB7XG4gICAgdGhpcy5vcHRpb25zU3BlYy5mb3JFYWNoKG9wdGlvbiA9PiB0aGlzLmRpc2FibGVPckVuYWJsZShvcHRpb24pKVxuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIGFuIG9wdGlvbiwgZW5hYmxlIHRoZSBVSSBlbGVtZW50cyBpZiBhbmQgb25seSBpZiBhbGwgdGhlIGJvb2xlYW5cbiAgICogb3B0aW9ucyBpbiBvcHRpb24uZW5hYmxlZElmIGFyZSB0cnVlXG4gICAqIEBwYXJhbSBvcHRpb24gQW4gZWxlbWVudCBvZiB0aGlzLm9wdGlvbnNTcGVjIG9yIGFuIG9wdGlvbiBpZFxuICAgKi9cbiAgZGlzYWJsZU9yRW5hYmxlIChvcHRpb24gOiBzdHJpbmcgfCBPcHRpb25zcGVjMlswXSk6IHZvaWQge1xuICAgIGlmICh0eXBlb2YgKG9wdGlvbikgPT09ICdzdHJpbmcnKSB7XG4gICAgICBjb25zdCB0ZW1wT3B0aW9uIDogT3B0aW9uc3BlYzJbMF0gfCB1bmRlZmluZWQgPSB0aGlzLm9wdGlvbnNTcGVjLmZpbmQoeCA9PiAoaXNSZWFsT3B0aW9uKHgpICYmIHguaWQgPT09IG9wdGlvbikpXG4gICAgICBpZiAodGVtcE9wdGlvbiAhPT0gdW5kZWZpbmVkKSB7IG9wdGlvbiA9IHRlbXBPcHRpb24gfSBlbHNlIHsgdGhyb3cgbmV3IEVycm9yKGBubyBvcHRpb24gd2l0aCBpZCAnJHtvcHRpb259J2ApIH1cbiAgICB9XG5cbiAgICBpZiAoIWlzUmVhbE9wdGlvbihvcHRpb24pIHx8ICFvcHRpb24uZW5hYmxlZElmIHx8IG9wdGlvbi5lbGVtZW50ID09PSB1bmRlZmluZWQpIHJldHVyblxuXG4gICAgY29uc3QgZW5hYmxlckxpc3QgPSBvcHRpb24uZW5hYmxlZElmLnNwbGl0KCcmJykgLy9cbiAgICBsZXQgZW5hYmxlID0gdHJ1ZSAvLyB3aWxsIGRpc2FibGUgaWYganVzdCBvbmUgb2YgdGhlIGVsZW1lbnRzIG9mIGVuYWJsZXJMaXN0IGlzIGZhbHNlXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVuYWJsZXJMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQgZW5hYmxlcklkID0gZW5hYmxlckxpc3RbaV1cbiAgICAgIGxldCBuZWdhdGUgPSBmYWxzZSAvLyBpZiBpdCBzdGFydHMgd2l0aCAhLCBuZWdhdGl2ZSBvdXRwdXRcbiAgICAgIGlmIChlbmFibGVySWQuc3RhcnRzV2l0aCgnIScpKSB7XG4gICAgICAgIG5lZ2F0ZSA9IHRydWVcbiAgICAgICAgZW5hYmxlcklkID0gZW5hYmxlcklkLnNsaWNlKDEpXG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgdGhpcy5vcHRpb25zW2VuYWJsZXJJZF0gIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJ2VuYWJsZWRJZic6ICR7ZW5hYmxlcklkfSBpcyBub3QgYSBib29sZWFuIG9wdGlvbmApXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGVuYWJsZXJWYWx1ZSA6IGJvb2xlYW4gPSB0aGlzLm9wdGlvbnNbZW5hYmxlcklkXSBhcyBib29sZWFuIC8vISA9PSBuZWdhdGUgLy8gIT09IGVxdWl2YWxlbnQgdG8gWE9SXG5cbiAgICAgIGlmICghZW5hYmxlclZhbHVlKSB7XG4gICAgICAgIGVuYWJsZSA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGVuYWJsZSkge1xuICAgICAgb3B0aW9uLmVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSgnZGlzYWJsZWQnKVxuICAgICAgO1suLi5vcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKV0uZm9yRWFjaChlID0+IHsgZS5kaXNhYmxlZCA9IGZhbHNlIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIG9wdGlvbi5lbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2Rpc2FibGVkJylcbiAgICAgIDtbLi4ub3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JyldLmZvckVhY2goZSA9PiB7IGUuZGlzYWJsZWQgPSB0cnVlIH0pXG4gICAgfVxuICB9XG5cbiAgcmVuZGVySW4gKGVsZW1lbnQ6IEhUTUxFbGVtZW50LCB1bEV4dHJhQ2xhc3M/IDogc3RyaW5nKSA6IEhUTUxFbGVtZW50IHtcbiAgICBjb25zdCBsaXN0ID0gY3JlYXRlRWxlbSgndWwnLCAnb3B0aW9ucy1saXN0JylcbiAgICBpZiAodWxFeHRyYUNsYXNzKSBsaXN0LmNsYXNzTGlzdC5hZGQodWxFeHRyYUNsYXNzKVxuICAgIGxldCBjb2x1bW4gPSBjcmVhdGVFbGVtKCdkaXYnLCAnb3B0aW9ucy1jb2x1bW4nLCBsaXN0KVxuXG4gICAgdGhpcy5vcHRpb25zU3BlYy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICBpZiAob3B0aW9uLnR5cGUgPT09ICdjb2x1bW4tYnJlYWsnKSB7IC8vIHN0YXJ0IG5ldyBjb2x1bW5cbiAgICAgICAgY29sdW1uID0gY3JlYXRlRWxlbSgnZGl2JywgJ29wdGlvbnMtY29sdW1uJywgbGlzdClcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9uLnR5cGUgPT09ICdzdWJvcHRpb25zJykge1xuICAgICAgICBjb25zdCBzdWJPcHRpb25zU2V0ID0gb3B0aW9uLnN1Yk9wdGlvbnNTZXRcbiAgICAgICAgaWYgKHN1Yk9wdGlvbnNTZXQgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCdUaGlzIHNob3VsZCBub3QgaGFwcGVuIScpXG4gICAgICAgIGNvbnN0IHN1Yk9wdGlvbnNFbGVtZW50ID0gc3ViT3B0aW9uc1NldC5yZW5kZXJJbihjb2x1bW4sICdzdWJvcHRpb25zJylcbiAgICAgICAgb3B0aW9uLmVsZW1lbnQgPSBzdWJPcHRpb25zRWxlbWVudFxuICAgICAgfSBlbHNlIHsgLy8gbWFrZSBsaXN0IGl0ZW1cbiAgICAgICAgY29uc3QgbGkgPSBjcmVhdGVFbGVtKCdsaScsIHVuZGVmaW5lZCwgY29sdW1uKVxuICAgICAgICBpZiAoaXNSZWFsT3B0aW9uKG9wdGlvbikpIHtcbiAgICAgICAgICBsaS5kYXRhc2V0Lm9wdGlvbklkID0gb3B0aW9uLmlkXG4gICAgICAgIH1cblxuICAgICAgICBzd2l0Y2ggKG9wdGlvbi50eXBlKSB7XG4gICAgICAgICAgY2FzZSAnaGVhZGluZyc6XG4gICAgICAgICAgICByZW5kZXJIZWFkaW5nKG9wdGlvbi50aXRsZSwgbGkpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ2ludCc6XG4gICAgICAgICAgY2FzZSAnYm9vbCc6XG4gICAgICAgICAgICByZW5kZXJTaW5nbGVPcHRpb24ob3B0aW9uLCBsaSlcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAnc2VsZWN0LWluY2x1c2l2ZSc6XG4gICAgICAgICAgY2FzZSAnc2VsZWN0LWV4Y2x1c2l2ZSc6XG4gICAgICAgICAgICB0aGlzLnJlbmRlckxpc3RPcHRpb24ob3B0aW9uLCBsaSlcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAncmFuZ2UnOlxuICAgICAgICAgICAgcmVuZGVyUmFuZ2VPcHRpb24ob3B0aW9uLCBsaSlcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgICAgbGkuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgIHRoaXMudXBkYXRlU3RhdGVGcm9tVUkob3B0aW9uKVxuICAgICAgICAgIHRoaXMuZGlzYWJsZU9yRW5hYmxlQWxsKCkgfSlcbiAgICAgICAgb3B0aW9uLmVsZW1lbnQgPSBsaVxuICAgICAgfVxuICAgIH0pXG4gICAgZWxlbWVudC5hcHBlbmQobGlzdClcblxuICAgIHRoaXMuZGlzYWJsZU9yRW5hYmxlQWxsKClcblxuICAgIHJldHVybiBsaXN0XG4gIH1cblxuICAvKiBlc2xpbnQtZGlzYWJsZSAqL1xuICByZW5kZXJXaXRoVGVtcGxhdGUgKGVsZW1lbnQgOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIC8vIGNyZWF0ZSBhcHByb3ByaWF0ZSBvYmplY3QgZm9yIG11c3RhY2hlXG4gICAgbGV0IG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIE9wdGlvbkk+XG4gICAgdGhpcy5vcHRpb25zU3BlYy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICBpZiAoaXNSZWFsT3B0aW9uKG9wdGlvbikpIHtcbiAgICAgICAgb3B0aW9uc1tvcHRpb24uaWRdID0gb3B0aW9uXG4gICAgICB9XG4gICAgfSlcblxuICAgIGNvbnN0IGh0bWxTdHJpbmcgPSB0aGlzLnRlbXBsYXRlXG4gIH1cbiAgLyogZXNsaW50LWVuYWJsZSAqL1xuXG4gIHJlbmRlckxpc3RPcHRpb24gKG9wdGlvbjogU2VsZWN0RXhjbHVzaXZlT3B0aW9uIHwgU2VsZWN0SW5jbHVzaXZlT3B0aW9uLCBsaSA6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgbGkuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLCBvcHRpb24udGl0bGUgKyAnOiAnKVxuXG4gICAgY29uc3Qgc3VibGlzdCA9IGNyZWF0ZUVsZW0oJ3VsJywgJ29wdGlvbnMtc3VibGlzdCcsIGxpKVxuICAgIGlmIChvcHRpb24udmVydGljYWwpIHN1Ymxpc3QuY2xhc3NMaXN0LmFkZCgnb3B0aW9ucy1zdWJsaXN0LXZlcnRpY2FsJylcblxuICAgIG9wdGlvbi5zZWxlY3RPcHRpb25zLmZvckVhY2goc2VsZWN0T3B0aW9uID0+IHtcbiAgICAgIGNvbnN0IHN1Ymxpc3RMaSA9IGNyZWF0ZUVsZW0oJ2xpJywgdW5kZWZpbmVkLCBzdWJsaXN0KVxuICAgICAgY29uc3QgbGFiZWwgPSBjcmVhdGVFbGVtKCdsYWJlbCcsIHVuZGVmaW5lZCwgc3VibGlzdExpKVxuXG4gICAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0JylcbiAgICAgIGlucHV0LnR5cGUgPSBvcHRpb24udHlwZSA9PT0gJ3NlbGVjdC1leGNsdXNpdmUnID8gJ3JhZGlvJyA6ICdjaGVja2JveCdcbiAgICAgIGlucHV0Lm5hbWUgPSB0aGlzLmdsb2JhbElkICsgJy0nICsgb3B0aW9uLmlkXG4gICAgICBpbnB1dC52YWx1ZSA9IHNlbGVjdE9wdGlvbi5pZFxuXG4gICAgICBpZiAob3B0aW9uLnR5cGUgPT09ICdzZWxlY3QtaW5jbHVzaXZlJykgeyAvLyBkZWZhdWx0cyB3b3JrIGRpZmZlcmVudCBmb3IgaW5jbHVzaXZlL2V4Y2x1c2l2ZVxuICAgICAgICBpbnB1dC5jaGVja2VkID0gb3B0aW9uLmRlZmF1bHQuaW5jbHVkZXMoc2VsZWN0T3B0aW9uLmlkKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5wdXQuY2hlY2tlZCA9IG9wdGlvbi5kZWZhdWx0ID09PSBzZWxlY3RPcHRpb24uaWRcbiAgICAgIH1cblxuICAgICAgbGFiZWwuYXBwZW5kKGlucHV0KVxuXG4gICAgICBpbnB1dC5jbGFzc0xpc3QuYWRkKCdvcHRpb24nKVxuXG4gICAgICBsYWJlbC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIHNlbGVjdE9wdGlvbi50aXRsZSlcbiAgICB9KVxuICB9XG59XG5cbi8qKlxuICogUmVuZGVycyBhIGhlYWRpbmcgb3B0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gdGl0bGUgVGhlIHRpdGxlIG9mIHRoZSBoZWFkaW5nXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBsaSBUaGUgZWxlbWVudCB0byByZW5kZXIgaW50b1xuICovXG5mdW5jdGlvbiByZW5kZXJIZWFkaW5nICh0aXRsZTogc3RyaW5nLCBsaTogSFRNTEVsZW1lbnQpIHtcbiAgbGkuaW5uZXJIVE1MID0gdGl0bGVcbiAgbGkuY2xhc3NMaXN0LmFkZCgnb3B0aW9ucy1oZWFkaW5nJylcbn1cblxuLyoqXG4gKiBSZW5kZXJzIHNpbmdsZSBwYXJhbWV0ZXJcbiAqIEBwYXJhbSB7Kn0gb3B0aW9uXG4gKiBAcGFyYW0geyp9IGxpXG4gKi9cbmZ1bmN0aW9uIHJlbmRlclNpbmdsZU9wdGlvbiAob3B0aW9uOiBJbnRlZ2VyT3B0aW9uIHwgQm9vbGVhbk9wdGlvbiwgbGk6IEhUTUxFbGVtZW50KSB7XG4gIGNvbnN0IGxhYmVsID0gY3JlYXRlRWxlbSgnbGFiZWwnLCB1bmRlZmluZWQsIGxpKVxuXG4gIGlmICghb3B0aW9uLnN3YXBMYWJlbCAmJiBvcHRpb24udGl0bGUgIT09ICcnKSBsYWJlbC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIGAke29wdGlvbi50aXRsZX06IGApXG5cbiAgY29uc3QgaW5wdXQgOiBIVE1MSW5wdXRFbGVtZW50ID0gY3JlYXRlRWxlbSgnaW5wdXQnLCAnb3B0aW9uJywgbGFiZWwpIGFzIEhUTUxJbnB1dEVsZW1lbnRcbiAgc3dpdGNoIChvcHRpb24udHlwZSkge1xuICAgIGNhc2UgJ2ludCc6XG4gICAgICBpbnB1dC50eXBlID0gJ251bWJlcidcbiAgICAgIGlucHV0Lm1pbiA9IG9wdGlvbi5taW4udG9TdHJpbmcoKVxuICAgICAgaW5wdXQubWF4ID0gb3B0aW9uLm1heC50b1N0cmluZygpXG4gICAgICBpbnB1dC52YWx1ZSA9IG9wdGlvbi5kZWZhdWx0LnRvU3RyaW5nKClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYm9vbCc6XG4gICAgICBpbnB1dC50eXBlID0gJ2NoZWNrYm94J1xuICAgICAgaW5wdXQuY2hlY2tlZCA9IG9wdGlvbi5kZWZhdWx0XG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1R5cGVzY3JpcHQgaXMgcHJldHR5IHN1cmUgSSBjYW5cXCd0IGdldCBoZXJlJylcbiAgfVxuXG4gIGlmIChvcHRpb24uc3dhcExhYmVsICYmIG9wdGlvbi50aXRsZSAhPT0gJycpIGxhYmVsLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgYCAke29wdGlvbi50aXRsZX1gKVxufVxuXG5mdW5jdGlvbiByZW5kZXJSYW5nZU9wdGlvbiAob3B0aW9uOiBSYW5nZU9wdGlvbiwgbGk6IEhUTUxFbGVtZW50KSB7XG4gIGNvbnN0IGxhYmVsID0gY3JlYXRlRWxlbSgnbGFiZWwnLCB1bmRlZmluZWQsIGxpKVxuICBjb25zdCBpbnB1dExCID0gY3JlYXRlRWxlbSgnaW5wdXQnLCAnb3B0aW9uJywgbGFiZWwpIGFzIEhUTUxJbnB1dEVsZW1lbnRcbiAgaW5wdXRMQi50eXBlID0gJ251bWJlcidcbiAgaW5wdXRMQi5taW4gPSBvcHRpb24ubWluLnRvU3RyaW5nKClcbiAgaW5wdXRMQi5tYXggPSBvcHRpb24ubWF4LnRvU3RyaW5nKClcbiAgaW5wdXRMQi52YWx1ZSA9IG9wdGlvbi5kZWZhdWx0TEIudG9TdHJpbmcoKVxuXG4gIGxhYmVsLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgYCAmbGVxOyAke29wdGlvbi50aXRsZX0gJmxlcTsgYClcblxuICBjb25zdCBpbnB1dFVCID0gY3JlYXRlRWxlbSgnaW5wdXQnLCAnb3B0aW9uJywgbGFiZWwpIGFzIEhUTUxJbnB1dEVsZW1lbnRcbiAgaW5wdXRVQi50eXBlID0gJ251bWJlcidcbiAgaW5wdXRVQi5taW4gPSBvcHRpb24ubWluLnRvU3RyaW5nKClcbiAgaW5wdXRVQi5tYXggPSBvcHRpb24ubWF4LnRvU3RyaW5nKClcbiAgaW5wdXRVQi52YWx1ZSA9IG9wdGlvbi5kZWZhdWx0VUIudG9TdHJpbmcoKVxufVxuXG4vKiogRGV0ZXJtaW5lcyBpZiBhbiBvcHRpb24gaW4gT3B0aW9uc1NwZWMgaXMgYSByZWFsIG9wdGlvbiBhcyBvcHBvc2VkIHRvXG4gKiBhIGhlYWRpbmcgb3IgY29sdW1uIGJyZWFrXG4gKi9cbmZ1bmN0aW9uIGlzUmVhbE9wdGlvbiAob3B0aW9uIDogT3B0aW9uc1NwZWNbMF0pIDogb3B0aW9uIGlzIFJlYWxPcHRpb24ge1xuICByZXR1cm4gKG9wdGlvbiBhcyBPcHRpb25JKS5pZCAhPT0gdW5kZWZpbmVkXG59XG5cbmNvbnN0IGRlbW9TcGVjIDogT3B0aW9uc1NwZWMgPSBbXG4gIHtcbiAgICB0aXRsZTogJ0RpZmZpY3VsdHknLFxuICAgIGlkOiAnZGlmZmljdWx0eScsXG4gICAgdHlwZTogJ2ludCcsXG4gICAgbWluOiAxLFxuICAgIG1heDogMTAsXG4gICAgZGVmYXVsdDogNVxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdUeXBlJyxcbiAgICBpZDogJ3R5cGUnLFxuICAgIHR5cGU6ICdzZWxlY3QtZXhjbHVzaXZlJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICB7IHRpdGxlOiAnUmVjdGFuZ2xlJywgaWQ6ICdyZWN0YW5nbGUnIH0sXG4gICAgICB7IHRpdGxlOiAnVHJpYW5nbGUnLCBpZDogJ3RyaWFuZ2xlJyB9LFxuICAgICAgeyB0aXRsZTogJ1NxdW92YWwnLCBpZDogJ3NxdW92YWwnIH1cbiAgICBdLFxuICAgIGRlZmF1bHQ6ICdyZWN0YW5nbGUnXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ0EgaGVhZGluZycsXG4gICAgdHlwZTogJ2hlYWRpbmcnXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1NoYXBlJyxcbiAgICBpZDogJ3NoYXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWluY2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ1JlY3RhbmdsZSBzaGFwZSB0aGluZycsIGlkOiAncmVjdGFuZ2xlJyB9LFxuICAgICAgeyB0aXRsZTogJ1RyaWFuZ2xlIHNoYXBlIHRoaW5nJywgaWQ6ICd0cmlhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdTcXVvdmFsIHNoYXBlIGxvbmcnLCBpZDogJ3NxdW92YWwnIH1cbiAgICBdLFxuICAgIGRlZmF1bHQ6IFsncmVjdGFuZ2xlJywgJ3NxdW92YWwnXSxcbiAgICB2ZXJ0aWNhbDogdHJ1ZSAvLyBsYXlvdXQgdmVydGljYWxseSwgcmF0aGVyIHRoYW4gaG9yaXpvbnRhbGx5XG4gIH0sXG4gIHtcbiAgICB0eXBlOiAnY29sdW1uLWJyZWFrJ1xuICB9LFxuICB7XG4gICAgdHlwZTogJ2hlYWRpbmcnLFxuICAgIHRpdGxlOiAnQSBuZXcgY29sdW1uJ1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdEbyBzb21ldGhpbmcnLFxuICAgIGlkOiAnc29tZXRoaW5nJyxcbiAgICB0eXBlOiAnYm9vbCcsXG4gICAgZGVmYXVsdDogdHJ1ZSxcbiAgICBzd2FwTGFiZWw6IHRydWUgLy8gcHV0IGNvbnRyb2wgYmVmb3JlIGxhYmVsXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ09wdGlvbnMgZm9yIHJlY3RhbmdsZXMnLFxuICAgIGlkOiAncmVjdGFuZ2xlLW9wdGlvbnMnLFxuICAgIHR5cGU6ICdzdWJvcHRpb25zJyxcbiAgICBvcHRpb25zU3BlYzogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJ01pbmltdW0geCcsXG4gICAgICAgIGlkOiAnbWluWCcsXG4gICAgICAgIHR5cGU6ICdpbnQnLFxuICAgICAgICBtaW46IDAsXG4gICAgICAgIG1heDogMTAsXG4gICAgICAgIGRlZmF1bHQ6IDJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnTWF4aW11bSB4JyxcbiAgICAgICAgaWQ6ICdtYXhYJyxcbiAgICAgICAgdHlwZTogJ2ludCcsXG4gICAgICAgIG1pbjogMCxcbiAgICAgICAgbWF4OiAxMCxcbiAgICAgICAgZGVmYXVsdDogNFxuICAgICAgfVxuICAgIF1cbiAgfVxuXVxuXG5jb25zdCBkZW1vVGVtcGxhdGUgOiBzdHJpbmcgPVxuJzxsaT57e2RpZmZpY3VsdHkucmVuZGVyZWR9fTwvbGk+XFxuJyArIC8vIEluc2VydHMgZnVsbCAnZGlmZml1bHR5JyBvcHRpb24gYXMgYmVmb3JlXG4nPGxpPjxiPnt7dHlwZS50aXRsZX19PC9iPiBcXG4nICsgLy8ganVzdCB0aGUgdGl0bGVcbic8bGk+e3t0eXBlLmlucHV0fX0gXFxuJyArIC8vIHRoZSBpbnB1dCBlbGVtZW50XG4ne3t0eXBlLnNlbGVjdE9wdGlvbnNSZW5kZXJlZEFsbH19PC9saT4nICsgLy8gVGhlIG9wdGlvbnMsIHJlZGVyZWQgdXN1YWxseVxuJzxsaT48dWw+e3sjIHR5cGUuc2VsZWN0T3B0aW9uc319JyArIC8vIEluZGl2aWR1YWwgc2VsZWN0IG9wdGlvbnMsIHJlbmRlcmVkXG4gICc8bGk+IHt7cmVuZGVyZWR9fSA8L2xpPicgKyAvLyBUaGUgdXN1YWwgcmVuZGVyZWQgb3B0aW9uXG4ne3svIHR5cGUuc2VsZWN0T3B0aW9uc319PC91bD4nXG5cbmNvbnN0IGV4YW1wbGVUZW1wbGF0ZSA9IC8vIEFub3RoZXIgZXhhbXBsZSwgd2l0aCBmZXdlciBjb21tZW50c1xuYDxkaXYgY2xhc3MgPSBcIm9wdGlvbnMtY29sdW1uXCI+XG4gIDx1bCBjbGFzcz1cIm9wdGlvbnMtbGlzdFwiPlxuICAgIDxsaT4gPGI+U29tZSBvcHRpb25zIDwvYj4gPC9saT5cbiAgICA8bGk+IHt7ZGlmZmljdWx0eS5yZW5kZXJlZH19IDwvbGk+XG4gICAgPGxpIHN0eWxlPVwiZGlzcGxheTpibG9ja1wiPiB7e3NpbXBsZS50aXRsZX19IHt7c2ltcGxlLmlucHV0fX1cbiAgICAgIHt7I3NpbXBsZU1pblh9fVxuYFxuIiwiZXhwb3J0IGRlZmF1bHQgYWJzdHJhY3QgY2xhc3MgUXVlc3Rpb24ge1xuICBET006IEhUTUxFbGVtZW50XG4gIGFuc3dlcmVkOiBib29sZWFuXG5cbiAgY29uc3RydWN0b3IgKCkge1xuICAgIHRoaXMuRE9NID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICB0aGlzLkRPTS5jbGFzc05hbWUgPSAncXVlc3Rpb24tZGl2J1xuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICB9XG5cbiAgZ2V0RE9NICgpIDogSFRNTEVsZW1lbnQge1xuICAgIHJldHVybiB0aGlzLkRPTVxuICB9XG5cbiAgYWJzdHJhY3QgcmVuZGVyICgpIDogdm9pZFxuXG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmFuc3dlcmVkID0gdHJ1ZVxuICB9XG5cbiAgaGlkZUFuc3dlciAoKSA6IHZvaWQge1xuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICB9XG5cbiAgdG9nZ2xlQW5zd2VyICgpIDogdm9pZCB7XG4gICAgaWYgKHRoaXMuYW5zd2VyZWQpIHtcbiAgICAgIHRoaXMuaGlkZUFuc3dlcigpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2hvd0Fuc3dlcigpXG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSA6IHN0cmluZyB7IC8vIFNob3VsZCBiZSBvdmVycmlkZGVuXG4gICAgcmV0dXJuICcnXG4gIH1cbn1cbiIsIi8qIGdsb2JhbCBrYXRleCAqL1xuaW1wb3J0IFF1ZXN0aW9uIGZyb20gJ1F1ZXN0aW9uL1F1ZXN0aW9uJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUZXh0USBleHRlbmRzIFF1ZXN0aW9uIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcigpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDUsXG4gICAgICBsYWJlbDogJ2EnXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICAvLyBzdG9yZSB0aGUgbGFiZWwgZm9yIGZ1dHVyZSByZW5kZXJpbmdcbiAgICB0aGlzLmxhYmVsID0gc2V0dGluZ3MubGFiZWxcblxuICAgIC8vIER1bW15IHF1ZXN0aW9uIGdlbmVyYXRpbmcgLSBzdWJjbGFzc2VzIGRvIHNvbWV0aGluZyBzdWJzdGFudGlhbCBoZXJlXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gJzIrMidcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJz01J1xuXG4gICAgLy8gTWFrZSB0aGUgRE9NIHRyZWUgZm9yIHRoZSBlbGVtZW50XG4gICAgdGhpcy5xdWVzdGlvbnAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJylcbiAgICB0aGlzLmFuc3dlcnAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJylcblxuICAgIHRoaXMucXVlc3Rpb25wLmNsYXNzTmFtZSA9ICdxdWVzdGlvbidcbiAgICB0aGlzLmFuc3dlcnAuY2xhc3NOYW1lID0gJ2Fuc3dlcidcbiAgICB0aGlzLmFuc3dlcnAuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcblxuICAgIHRoaXMuRE9NLmFwcGVuZENoaWxkKHRoaXMucXVlc3Rpb25wKVxuICAgIHRoaXMuRE9NLmFwcGVuZENoaWxkKHRoaXMuYW5zd2VycClcblxuICAgIC8vIHN1YmNsYXNzZXMgc2hvdWxkIGdlbmVyYXRlIHF1ZXN0aW9uTGFUZVggYW5kIGFuc3dlckxhVGVYLFxuICAgIC8vIC5yZW5kZXIoKSB3aWxsIGJlIGNhbGxlZCBieSB1c2VyXG4gIH1cblxuICByZW5kZXIgKCkge1xuICAgIC8vIHVwZGF0ZSB0aGUgRE9NIGl0ZW0gd2l0aCBxdWVzdGlvbkxhVGVYIGFuZCBhbnN3ZXJMYVRlWFxuICAgIHZhciBxbnVtID0gdGhpcy5sYWJlbFxuICAgICAgPyAnXFxcXHRleHR7JyArIHRoaXMubGFiZWwgKyAnKSB9J1xuICAgICAgOiAnJ1xuICAgIGthdGV4LnJlbmRlcihxbnVtICsgdGhpcy5xdWVzdGlvbkxhVGVYLCB0aGlzLnF1ZXN0aW9ucCwgeyBkaXNwbGF5TW9kZTogdHJ1ZSwgc3RyaWN0OiAnaWdub3JlJyB9KVxuICAgIGthdGV4LnJlbmRlcih0aGlzLmFuc3dlckxhVGVYLCB0aGlzLmFuc3dlcnAsIHsgZGlzcGxheU1vZGU6IHRydWUgfSlcbiAgfVxuXG4gIGdldERPTSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuRE9NXG4gIH1cblxuICBzaG93QW5zd2VyICgpIHtcbiAgICB0aGlzLmFuc3dlcnAuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJylcbiAgICB0aGlzLmFuc3dlcmVkID0gdHJ1ZVxuICB9XG5cbiAgaGlkZUFuc3dlciAoKSB7XG4gICAgdGhpcy5hbnN3ZXJwLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gIH1cbn1cbiIsImltcG9ydCB7IHJhbmRCZXR3ZWVuLCBnY2QgfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5cbi8qIE1haW4gcXVlc3Rpb24gY2xhc3MuIFRoaXMgd2lsbCBiZSBzcHVuIG9mZiBpbnRvIGRpZmZlcmVudCBmaWxlIGFuZCBnZW5lcmFsaXNlZCAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQWxnZWJyYWljRnJhY3Rpb25RIGV4dGVuZHMgVGV4dFEge1xuICAvLyAnZXh0ZW5kcycgUXVlc3Rpb24sIGJ1dCBub3RoaW5nIHRvIGFjdHVhbGx5IGV4dGVuZFxuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDJcbiAgICB9XG5cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuICAgIGNvbnN0IGRpZmZpY3VsdHkgPSBzZXR0aW5ncy5kaWZmaWN1bHR5XG5cbiAgICAvLyBsb2dpYyBmb3IgZ2VuZXJhdGluZyB0aGUgcXVlc3Rpb24gYW5kIGFuc3dlciBzdGFydHMgaGVyZVxuICAgIHZhciBhLCBiLCBjLCBkLCBlLCBmIC8vIChheCtiKShleCtmKS8oY3grZCkoZXgrZikgPSAocHheMitxeCtyKS8odHheMit1eCt2KVxuICAgIHZhciBwLCBxLCByLCB0LCB1LCB2XG4gICAgdmFyIG1pbkNvZWZmLCBtYXhDb2VmZiwgbWluQ29uc3QsIG1heENvbnN0XG5cbiAgICBzd2l0Y2ggKGRpZmZpY3VsdHkpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgbWluQ29lZmYgPSAxOyBtYXhDb2VmZiA9IDE7IG1pbkNvbnN0ID0gMTsgbWF4Q29uc3QgPSA2XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDI6XG4gICAgICAgIG1pbkNvZWZmID0gMTsgbWF4Q29lZmYgPSAxOyBtaW5Db25zdCA9IC02OyBtYXhDb25zdCA9IDZcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgbWluQ29lZmYgPSAxOyBtYXhDb2VmZiA9IDM7IG1pbkNvbnN0ID0gLTU7IG1heENvbnN0ID0gNVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA0OlxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbWluQ29lZmYgPSAtMzsgbWF4Q29lZmYgPSAzOyBtaW5Db25zdCA9IC01OyBtYXhDb25zdCA9IDVcbiAgICAgICAgYnJlYWtcbiAgICB9XG5cbiAgICAvLyBQaWNrIHNvbWUgY29lZmZpY2llbnRzXG4gICAgd2hpbGUgKFxuICAgICAgKCghYSAmJiAhYikgfHwgKCFjICYmICFkKSB8fCAoIWUgJiYgIWYpKSB8fCAvLyByZXRyeSBpZiBhbnkgZXhwcmVzc2lvbiBpcyAwXG4gICAgICBjYW5TaW1wbGlmeShhLCBiLCBjLCBkKSAvLyByZXRyeSBpZiB0aGVyZSdzIGEgY29tbW9uIG51bWVyaWNhbCBmYWN0b3JcbiAgICApIHtcbiAgICAgIGEgPSByYW5kQmV0d2VlbihtaW5Db2VmZiwgbWF4Q29lZmYpXG4gICAgICBjID0gcmFuZEJldHdlZW4obWluQ29lZmYsIG1heENvZWZmKVxuICAgICAgZSA9IHJhbmRCZXR3ZWVuKG1pbkNvZWZmLCBtYXhDb2VmZilcbiAgICAgIGIgPSByYW5kQmV0d2VlbihtaW5Db25zdCwgbWF4Q29uc3QpXG4gICAgICBkID0gcmFuZEJldHdlZW4obWluQ29uc3QsIG1heENvbnN0KVxuICAgICAgZiA9IHJhbmRCZXR3ZWVuKG1pbkNvbnN0LCBtYXhDb25zdClcbiAgICB9XG5cbiAgICAvLyBpZiB0aGUgZGVub21pbmF0b3IgaXMgbmVnYXRpdmUgZm9yIGVhY2ggdGVybSwgdGhlbiBtYWtlIHRoZSBudW1lcmF0b3IgbmVnYXRpdmUgaW5zdGVhZFxuICAgIGlmIChjIDw9IDAgJiYgZCA8PSAwKSB7XG4gICAgICBjID0gLWNcbiAgICAgIGQgPSAtZFxuICAgICAgYSA9IC1hXG4gICAgICBiID0gLWJcbiAgICB9XG5cbiAgICBwID0gYSAqIGU7IHEgPSBhICogZiArIGIgKiBlOyByID0gYiAqIGZcbiAgICB0ID0gYyAqIGU7IHUgPSBjICogZiArIGQgKiBlOyB2ID0gZCAqIGZcblxuICAgIC8vIE5vdyBwdXQgdGhlIHF1ZXN0aW9uIGFuZCBhbnN3ZXIgaW4gYSBuaWNlIGZvcm1hdCBpbnRvIHF1ZXN0aW9uTGFUZVggYW5kIGFuc3dlckxhVGVYXG4gICAgY29uc3QgcXVlc3Rpb24gPSBgXFxcXGZyYWN7JHtxdWFkcmF0aWNTdHJpbmcocCwgcSwgcil9fXske3F1YWRyYXRpY1N0cmluZyh0LCB1LCB2KX19YFxuICAgIGlmIChzZXR0aW5ncy51c2VDb21tYW5kV29yZCkge1xuICAgICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gJ1xcXFx0ZXh0e1NpbXBsaWZ5fSAnICsgcXVlc3Rpb25cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gcXVlc3Rpb25cbiAgICB9XG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9XG4gICAgICAoYyA9PT0gMCAmJiBkID09PSAxKSA/IHF1YWRyYXRpY1N0cmluZygwLCBhLCBiKVxuICAgICAgICA6IGBcXFxcZnJhY3ske3F1YWRyYXRpY1N0cmluZygwLCBhLCBiKX19eyR7cXVhZHJhdGljU3RyaW5nKDAsIGMsIGQpfX1gXG5cbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJz0gJyArIHRoaXMuYW5zd2VyTGFUZVhcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnU2ltcGxpZnknXG4gIH1cbn1cblxuLyogVXRpbGl0eSBmdW5jdGlvbnNcbiAqIEF0IHNvbWUgcG9pbnQsIEknbGwgbW92ZSBzb21lIG9mIHRoZXNlIGludG8gYSBnZW5lcmFsIHV0aWxpdGllcyBtb2R1bGVcbiAqIGJ1dCB0aGlzIHdpbGwgZG8gZm9yIG5vd1xuICovXG5cbi8vIFRPRE8gSSBoYXZlIHF1YWRyYXRpY1N0cmluZyBoZXJlIGFuZCBhbHNvIGEgUG9seW5vbWlhbCBjbGFzcy4gV2hhdCBpcyBiZWluZyByZXBsaWNhdGVkP8KnXG5mdW5jdGlvbiBxdWFkcmF0aWNTdHJpbmcgKGEsIGIsIGMpIHtcbiAgaWYgKGEgPT09IDAgJiYgYiA9PT0gMCAmJiBjID09PSAwKSByZXR1cm4gJzAnXG5cbiAgdmFyIHgyc3RyaW5nID1cbiAgICBhID09PSAwID8gJydcbiAgICAgIDogYSA9PT0gMSA/ICd4XjInXG4gICAgICAgIDogYSA9PT0gLTEgPyAnLXheMidcbiAgICAgICAgICA6IGEgKyAneF4yJ1xuXG4gIHZhciB4c2lnbiA9XG4gICAgYiA8IDAgPyAnLSdcbiAgICAgIDogKGEgPT09IDAgfHwgYiA9PT0gMCkgPyAnJ1xuICAgICAgICA6ICcrJ1xuXG4gIHZhciB4c3RyaW5nID1cbiAgICBiID09PSAwID8gJydcbiAgICAgIDogKGIgPT09IDEgfHwgYiA9PT0gLTEpID8gJ3gnXG4gICAgICAgIDogTWF0aC5hYnMoYikgKyAneCdcblxuICB2YXIgY29uc3RzaWduID1cbiAgICBjIDwgMCA/ICctJ1xuICAgICAgOiAoKGEgPT09IDAgJiYgYiA9PT0gMCkgfHwgYyA9PT0gMCkgPyAnJ1xuICAgICAgICA6ICcrJ1xuXG4gIHZhciBjb25zdHN0cmluZyA9XG4gICAgYyA9PT0gMCA/ICcnIDogTWF0aC5hYnMoYylcblxuICByZXR1cm4geDJzdHJpbmcgKyB4c2lnbiArIHhzdHJpbmcgKyBjb25zdHNpZ24gKyBjb25zdHN0cmluZ1xufVxuXG5mdW5jdGlvbiBjYW5TaW1wbGlmeSAoYTEsIGIxLCBhMiwgYjIpIHtcbiAgLy8gY2FuIChhMXgrYjEpLyhhMngrYjIpIGJlIHNpbXBsaWZpZWQ/XG4gIC8vXG4gIC8vIEZpcnN0LCB0YWtlIG91dCBnY2QsIGFuZCB3cml0ZSBhcyBjMShhMXgrYjEpIGV0Y1xuXG4gIHZhciBjMSA9IGdjZChhMSwgYjEpXG4gIGExID0gYTEgLyBjMVxuICBiMSA9IGIxIC8gYzFcblxuICB2YXIgYzIgPSBnY2QoYTIsIGIyKVxuICBhMiA9IGEyIC8gYzJcbiAgYjIgPSBiMiAvIGMyXG5cbiAgdmFyIHJlc3VsdCA9IGZhbHNlXG5cbiAgaWYgKGdjZChjMSwgYzIpID4gMSB8fCAoYTEgPT09IGEyICYmIGIxID09PSBiMikpIHtcbiAgICByZXN1bHQgPSB0cnVlXG4gIH1cblxuICByZXR1cm4gcmVzdWx0XG59XG4iLCJpbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5pbXBvcnQgeyByYW5kQmV0d2VlbiB9IGZyb20gJ3V0aWxpdGllcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSW50ZWdlckFkZFEgZXh0ZW5kcyBUZXh0USB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYSdcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIHRoaXMubGFiZWwgPSBzZXR0aW5ncy5sYWJlbFxuXG4gICAgLy8gVGhpcyBpcyBqdXN0IGEgZGVtbyBxdWVzdGlvbiB0eXBlIGZvciBub3csIHNvIG5vdCBwcm9jZXNzaW5nIGRpZmZpY3VsdHlcbiAgICBjb25zdCBhID0gcmFuZEJldHdlZW4oMTAsIDEwMDApXG4gICAgY29uc3QgYiA9IHJhbmRCZXR3ZWVuKDEwLCAxMDAwKVxuICAgIGNvbnN0IHN1bSA9IGEgKyBiXG5cbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSBhICsgJyArICcgKyBiXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICc9ICcgKyBzdW1cblxuICAgIHRoaXMucmVuZGVyKClcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRXZhbHVhdGUnXG4gIH1cbn1cbiIsImltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbi9RdWVzdGlvbidcbmltcG9ydCB7IGNyZWF0ZUVsZW0sIHJlcGVsRWxlbWVudHMgfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi9WaWV3T3B0aW9ucydcbmRlY2xhcmUgY29uc3Qga2F0ZXggOiB7cmVuZGVyIDogKHN0cmluZzogc3RyaW5nLCBlbGVtZW50OiBIVE1MRWxlbWVudCkgPT4gdm9pZH1cblxuLyogR3JhcGhpY1FEYXRhIGNhbiBhbGwgYmUgdmVyeSBkaWZmZXJlbnQsIHNvIGludGVyZmFjZSBpcyBlbXB0eVxuICogSGVyZSBmb3IgY29kZSBkb2N1bWVudGF0aW9uIHJhdGhlciB0aGFuIHR5cGUgc2FmZXR5ICh3aGljaCBpc24ndCBwcm92aWRlZCkgKi9cblxuLyogZXNsaW50LWRpc2FibGUgKi9cbmV4cG9ydCBpbnRlcmZhY2UgR3JhcGhpY1FEYXRhIHtcbn1cbi8qIGVzbGludC1lbmFibGUgKi9cblxuLyogTm90IHdvcnRoIHRoZSBoYXNzbHkgdHJ5aW5nIHRvIGdldCBpbnRlcmZhY2VzIGZvciBzdGF0aWMgbWV0aG9kc1xuICpcbiAqIGV4cG9ydCBpbnRlcmZhY2UgR3JhcGhpY1FEYXRhQ29uc3RydWN0b3Ige1xuICogICBuZXcoLi4uYXJncyA6IHVua25vd25bXSk6IEdyYXBoaWNRRGF0YVxuICogICByYW5kb20ob3B0aW9uczogdW5rbm93bikgOiBHcmFwaGljUURhdGFcbiAqIH1cbiovXG5cbmV4cG9ydCBpbnRlcmZhY2UgTGFiZWwge1xuICBwb3M6IFBvaW50LFxuICB0ZXh0cTogc3RyaW5nLFxuICB0ZXh0YTogc3RyaW5nLFxuICBzdHlsZXE6IHN0cmluZyxcbiAgc3R5bGVhOiBzdHJpbmcsXG4gIHRleHQ6IHN0cmluZyxcbiAgc3R5bGU6IHN0cmluZ1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgR3JhcGhpY1FWaWV3IHtcbiAgRE9NOiBIVE1MRWxlbWVudFxuICBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50XG4gIHdpZHRoOiBudW1iZXJcbiAgaGVpZ2h0OiBudW1iZXJcbiAgZGF0YTogR3JhcGhpY1FEYXRhXG4gIGxhYmVsczogTGFiZWxbXVxuICByb3RhdGlvbj86IG51bWJlclxuXG4gIGNvbnN0cnVjdG9yIChkYXRhIDogR3JhcGhpY1FEYXRhLCB2aWV3T3B0aW9ucyA6IFZpZXdPcHRpb25zKSB7XG4gICAgdmlld09wdGlvbnMud2lkdGggPSB2aWV3T3B0aW9ucy53aWR0aCA/PyAzMDBcbiAgICB2aWV3T3B0aW9ucy5oZWlnaHQgPSB2aWV3T3B0aW9ucy5oZWlnaHQgPz8gMzAwXG5cbiAgICB0aGlzLndpZHRoID0gdmlld09wdGlvbnMud2lkdGhcbiAgICB0aGlzLmhlaWdodCA9IHZpZXdPcHRpb25zLmhlaWdodCAvLyBvbmx5IHRoaW5ncyBJIG5lZWQgZnJvbSB0aGUgb3B0aW9ucywgZ2VuZXJhbGx5P1xuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICB0aGlzLnJvdGF0aW9uID0gdmlld09wdGlvbnMucm90YXRpb25cblxuICAgIHRoaXMubGFiZWxzID0gW10gLy8gbGFiZWxzIG9uIGRpYWdyYW1cblxuICAgIC8vIERPTSBlbGVtZW50c1xuICAgIHRoaXMuRE9NID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWRpdicpXG4gICAgdGhpcy5jYW52YXMgPSBjcmVhdGVFbGVtKCdjYW52YXMnLCAncXVlc3Rpb24tY2FudmFzJywgdGhpcy5ET00pIGFzIEhUTUxDYW52YXNFbGVtZW50XG4gICAgdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLndpZHRoXG4gICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHRcbiAgfVxuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHtcbiAgICByZXR1cm4gdGhpcy5ET01cbiAgfVxuXG4gIGFic3RyYWN0IHJlbmRlciAoKSA6IHZvaWRcblxuICByZW5kZXJMYWJlbHMgKG51ZGdlPyA6IGJvb2xlYW4sIHJlcGVsOiBib29sZWFuID0gdHJ1ZSkgOiB2b2lkIHtcbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLkRPTVxuXG4gICAgLy8gcmVtb3ZlIGFueSBleGlzdGluZyBsYWJlbHNcbiAgICBjb25zdCBvbGRMYWJlbHMgPSBjb250YWluZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnbGFiZWwnKVxuICAgIHdoaWxlIChvbGRMYWJlbHMubGVuZ3RoID4gMCkge1xuICAgICAgb2xkTGFiZWxzWzBdLnJlbW92ZSgpXG4gICAgfVxuXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICAgIGNvbnN0IGlubmVybGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgICAgbGFiZWwuY2xhc3NMaXN0LmFkZCgnbGFiZWwnKVxuICAgICAgbGFiZWwuY2xhc3NOYW1lICs9ICcgJyArIGwuc3R5bGUgLy8gdXNpbmcgY2xhc3NOYW1lIG92ZXIgY2xhc3NMaXN0IHNpbmNlIGwuc3R5bGUgaXMgc3BhY2UtZGVsaW1pdGVkIGxpc3Qgb2YgY2xhc3Nlc1xuICAgICAgbGFiZWwuc3R5bGUubGVmdCA9IGwucG9zLnggKyAncHgnXG4gICAgICBsYWJlbC5zdHlsZS50b3AgPSBsLnBvcy55ICsgJ3B4J1xuXG4gICAgICBrYXRleC5yZW5kZXIobC50ZXh0LCBpbm5lcmxhYmVsKVxuICAgICAgbGFiZWwuYXBwZW5kQ2hpbGQoaW5uZXJsYWJlbClcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChsYWJlbClcblxuICAgICAgLy8gcmVtb3ZlIHNwYWNlIGlmIHRoZSBpbm5lciBsYWJlbCBpcyB0b28gYmlnXG4gICAgICBpZiAoaW5uZXJsYWJlbC5vZmZzZXRXaWR0aCAvIGlubmVybGFiZWwub2Zmc2V0SGVpZ2h0ID4gMikge1xuICAgICAgICAvL2NvbnNvbGUubG9nKGByZW1vdmVkIHNwYWNlIGluICR7bC50ZXh0fWApXG4gICAgICAgIGNvbnN0IG5ld2xhYmVsdGV4dCA9IGwudGV4dC5yZXBsYWNlKC9cXCsvLCAnXFxcXCErXFxcXCEnKS5yZXBsYWNlKC8tLywgJ1xcXFwhLVxcXFwhJylcbiAgICAgICAga2F0ZXgucmVuZGVyKG5ld2xhYmVsdGV4dCwgaW5uZXJsYWJlbClcbiAgICAgIH1cblxuICAgICAgLy8gSSBkb24ndCB1bmRlcnN0YW5kIHRoaXMgYWRqdXN0bWVudC4gSSB0aGluayBpdCBtaWdodCBiZSBuZWVkZWQgaW4gYXJpdGhtYWdvbnMsIGJ1dCBpdCBtYWtlc1xuICAgICAgLy8gb3RoZXJzIGdvIGZ1bm55LlxuXG4gICAgICBpZiAobnVkZ2UpIHtcbiAgICAgICAgY29uc3QgbHdpZHRoID0gbGFiZWwub2Zmc2V0V2lkdGhcbiAgICAgICAgaWYgKGwucG9zLnggPCB0aGlzLmNhbnZhcy53aWR0aCAvIDIgLSA1ICYmIGwucG9zLnggKyBsd2lkdGggLyAyID4gdGhpcy5jYW52YXMud2lkdGggLyAyKSB7XG4gICAgICAgICAgbGFiZWwuc3R5bGUubGVmdCA9ICh0aGlzLmNhbnZhcy53aWR0aCAvIDIgLSBsd2lkdGggLSAzKSArICdweCdcbiAgICAgICAgICBjb25zb2xlLmxvZyhgbnVkZ2VkICcke2wudGV4dH0nYClcbiAgICAgICAgfVxuICAgICAgICBpZiAobC5wb3MueCA+IHRoaXMuY2FudmFzLndpZHRoIC8gMiArIDUgJiYgbC5wb3MueCAtIGx3aWR0aCAvIDIgPCB0aGlzLmNhbnZhcy53aWR0aCAvIDIpIHtcbiAgICAgICAgICBsYWJlbC5zdHlsZS5sZWZ0ID0gKHRoaXMuY2FudmFzLndpZHRoIC8gMiArIDMpICsgJ3B4J1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBudWRnZWQgJyR7bC50ZXh0fSdgKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vcmVwZWwgaWYgZ2l2ZW5cbiAgICBpZiAocmVwZWwpIHtcbiAgICBjb25zdCBsYWJlbEVsZW1lbnRzID0gWy4uLnRoaXMuRE9NLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2xhYmVsJyldIGFzIEhUTUxFbGVtZW50W11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxhYmVsRWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGZvciAobGV0IGogPSBpKzE7IGogPCBsYWJlbEVsZW1lbnRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHJlcGVsRWxlbWVudHMobGFiZWxFbGVtZW50c1tpXSxsYWJlbEVsZW1lbnRzW2pdKVxuICAgICAgfVxuICAgIH1cbiAgICB9XG4gIH1cblxuICBzaG93QW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dGFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlYVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoZmFsc2UpXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoZmFsc2UpXG4gIH1cblxuICAvLyBQb2ludCB0cmFuZm9ybWF0aW9ucyBvZiBhbGwgcG9pbnRzXG5cbiAgZ2V0IGFsbHBvaW50cyAoKSA6IFBvaW50W10ge1xuICAgIHJldHVybiBbXVxuICB9XG5cbiAgc2NhbGUgKHNmIDogbnVtYmVyKSA6IHZvaWQge1xuICAgIHRoaXMuYWxscG9pbnRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHAuc2NhbGUoc2YpXG4gICAgfSlcbiAgfVxuXG4gIHJvdGF0ZSAoYW5nbGUgOiBudW1iZXIpIDogbnVtYmVyIHtcbiAgICB0aGlzLmFsbHBvaW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICBwLnJvdGF0ZShhbmdsZSlcbiAgICB9KVxuICAgIHJldHVybiBhbmdsZVxuICB9XG5cbiAgdHJhbnNsYXRlICh4IDogbnVtYmVyLCB5IDogbnVtYmVyKSA6IHZvaWQge1xuICAgIHRoaXMuYWxscG9pbnRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHAudHJhbnNsYXRlKHgsIHkpXG4gICAgfSlcbiAgfVxuXG4gIHJhbmRvbVJvdGF0ZSAoKSA6IG51bWJlciB7XG4gICAgY29uc3QgYW5nbGUgPSAyICogTWF0aC5QSSAqIE1hdGgucmFuZG9tKClcbiAgICB0aGlzLnJvdGF0ZShhbmdsZSlcbiAgICByZXR1cm4gYW5nbGVcbiAgfVxuXG4gIC8qKlxuICAgKiBTY2FsZXMgYWxsIHRoZSBwb2ludHMgdG8gd2l0aGluIGEgZ2l2ZW4gd2lkdGggYW5kIGhlaWdodCwgY2VudGVyaW5nIHRoZSByZXN1bHQuIFJldHVybnMgdGhlIHNjYWxlIGZhY3RvclxuICAgKiBAcGFyYW0gd2lkdGggVGhlIHdpZHRoIG9mIHRoZSBib3VuZGluZyByZWN0YW5nbGUgdG8gc2NhbGUgdG9cbiAgICogQHBhcmFtIGhlaWdodCBUaGUgaGVpZ2h0IG9mIHRoZSBib3VuZGluZyByZWN0YW5nbGUgdG8gc2NhbGUgdG9cbiAgICogQHBhcmFtIG1hcmdpbiBNYXJnaW4gdG8gbGVhdmUgb3V0c2lkZSB0aGUgcmVjdGFuZ2xlXG4gICAqIEByZXR1cm5zXG4gICAqL1xuICBzY2FsZVRvRml0ICh3aWR0aCA6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIG1hcmdpbiA6IG51bWJlcikgOiBudW1iZXIge1xuICAgIGxldCB0b3BMZWZ0IDogUG9pbnQgPSBQb2ludC5taW4odGhpcy5hbGxwb2ludHMpXG4gICAgbGV0IGJvdHRvbVJpZ2h0IDogUG9pbnQgPSBQb2ludC5tYXgodGhpcy5hbGxwb2ludHMpXG4gICAgY29uc3QgdG90YWxXaWR0aCA6IG51bWJlciA9IGJvdHRvbVJpZ2h0LnggLSB0b3BMZWZ0LnhcbiAgICBjb25zdCB0b3RhbEhlaWdodCA6IG51bWJlciA9IGJvdHRvbVJpZ2h0LnkgLSB0b3BMZWZ0LnlcbiAgICBjb25zdCBzZiA9IE1hdGgubWluKCh3aWR0aCAtIG1hcmdpbikgLyB0b3RhbFdpZHRoLCAoaGVpZ2h0IC0gbWFyZ2luKSAvIHRvdGFsSGVpZ2h0KVxuICAgIHRoaXMuc2NhbGUoc2YpXG5cbiAgICAvLyBjZW50cmVcbiAgICB0b3BMZWZ0ID0gUG9pbnQubWluKHRoaXMuYWxscG9pbnRzKVxuICAgIGJvdHRvbVJpZ2h0ID0gUG9pbnQubWF4KHRoaXMuYWxscG9pbnRzKVxuICAgIGNvbnN0IGNlbnRlciA9IFBvaW50Lm1lYW4odG9wTGVmdCwgYm90dG9tUmlnaHQpXG4gICAgdGhpcy50cmFuc2xhdGUod2lkdGggLyAyIC0gY2VudGVyLngsIGhlaWdodCAvIDIgLSBjZW50ZXIueSkgLy8gY2VudHJlXG5cbiAgICByZXR1cm4gc2ZcbiAgfVxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgR3JhcGhpY1EgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIGRhdGE6IEdyYXBoaWNRRGF0YVxuICB2aWV3OiBHcmFwaGljUVZpZXdcblxuICBjb25zdHJ1Y3RvciAoZGF0YTogR3JhcGhpY1FEYXRhLCB2aWV3OiBHcmFwaGljUVZpZXcpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICBzdXBlcigpIC8vIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICB0aGlzLnZpZXcgPSB2aWV3XG4gICAgdGhpcy5ET00gPSB0aGlzLnZpZXcuRE9NXG5cbiAgICAvKiBUaGVzZSBhcmUgZ3VhcmFudGVlZCB0byBiZSBvdmVycmlkZGVuLCBzbyBubyBwb2ludCBpbml0aWFsaXppbmcgaGVyZVxuICAgICAqXG4gICAgICogIHRoaXMuZGF0YSA9IG5ldyBHcmFwaGljUURhdGEob3B0aW9ucylcbiAgICAgKiAgdGhpcy52aWV3ID0gbmV3IEdyYXBoaWNRVmlldyh0aGlzLmRhdGEsIG9wdGlvbnMpXG4gICAgICpcbiAgICAgKi9cbiAgfVxuXG4gIC8qIE5lZWQgdG8gcmVmYWN0b3Igc3ViY2xhc3NlcyB0byBkbyB0aGlzOlxuICAgKiBjb25zdHJ1Y3RvciAoZGF0YSwgdmlldykge1xuICAgKiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAqICAgIHRoaXMudmlldyA9IHZpZXdcbiAgICogfVxuICAgKlxuICAgKiBzdGF0aWMgcmFuZG9tKG9wdGlvbnMpIHtcbiAgICogIC8vIGFuIGF0dGVtcHQgYXQgaGF2aW5nIGFic3RyYWN0IHN0YXRpYyBtZXRob2RzLCBhbGJlaXQgcnVudGltZSBlcnJvclxuICAgKiAgdGhyb3cgbmV3IEVycm9yKFwiYHJhbmRvbSgpYCBtdXN0IGJlIG92ZXJyaWRkZW4gaW4gc3ViY2xhc3MgXCIgKyB0aGlzLm5hbWUpXG4gICAqIH1cbiAgICpcbiAgICogdHlwaWNhbCBpbXBsZW1lbnRhdGlvbjpcbiAgICogc3RhdGljIHJhbmRvbShvcHRpb25zKSB7XG4gICAqICBjb25zdCBkYXRhID0gbmV3IERlcml2ZWRRRGF0YShvcHRpb25zKVxuICAgKiAgY29uc3QgdmlldyA9IG5ldyBEZXJpdmVkUVZpZXcob3B0aW9ucylcbiAgICogIHJldHVybiBuZXcgRGVyaXZlZFFEYXRhKGRhdGEsdmlldylcbiAgICogfVxuICAgKlxuICAgKi9cblxuICBnZXRET00gKCkgOiBIVE1MRWxlbWVudCB7IHJldHVybiB0aGlzLnZpZXcuZ2V0RE9NKCkgfVxuXG4gIHJlbmRlciAoKSA6IHZvaWQgeyB0aGlzLnZpZXcucmVuZGVyKCkgfVxuXG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICBzdXBlci5zaG93QW5zd2VyKClcbiAgICB0aGlzLnZpZXcuc2hvd0Fuc3dlcigpXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7XG4gICAgc3VwZXIuaGlkZUFuc3dlcigpXG4gICAgdGhpcy52aWV3LmhpZGVBbnN3ZXIoKVxuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlIEZyYWN0aW9uLmpzIHY0LjAuMTIgMDkvMDkvMjAxNVxuICogaHR0cDovL3d3dy54YXJnLm9yZy8yMDE0LzAzL3JhdGlvbmFsLW51bWJlcnMtaW4tamF2YXNjcmlwdC9cbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUsIFJvYmVydCBFaXNlbGUgKHJvYmVydEB4YXJnLm9yZylcbiAqIER1YWwgbGljZW5zZWQgdW5kZXIgdGhlIE1JVCBvciBHUEwgVmVyc2lvbiAyIGxpY2Vuc2VzLlxuICoqL1xuXG5cbi8qKlxuICpcbiAqIFRoaXMgY2xhc3Mgb2ZmZXJzIHRoZSBwb3NzaWJpbGl0eSB0byBjYWxjdWxhdGUgZnJhY3Rpb25zLlxuICogWW91IGNhbiBwYXNzIGEgZnJhY3Rpb24gaW4gZGlmZmVyZW50IGZvcm1hdHMuIEVpdGhlciBhcyBhcnJheSwgYXMgZG91YmxlLCBhcyBzdHJpbmcgb3IgYXMgYW4gaW50ZWdlci5cbiAqXG4gKiBBcnJheS9PYmplY3QgZm9ybVxuICogWyAwID0+IDxub21pbmF0b3I+LCAxID0+IDxkZW5vbWluYXRvcj4gXVxuICogWyBuID0+IDxub21pbmF0b3I+LCBkID0+IDxkZW5vbWluYXRvcj4gXVxuICpcbiAqIEludGVnZXIgZm9ybVxuICogLSBTaW5nbGUgaW50ZWdlciB2YWx1ZVxuICpcbiAqIERvdWJsZSBmb3JtXG4gKiAtIFNpbmdsZSBkb3VibGUgdmFsdWVcbiAqXG4gKiBTdHJpbmcgZm9ybVxuICogMTIzLjQ1NiAtIGEgc2ltcGxlIGRvdWJsZVxuICogMTIzLzQ1NiAtIGEgc3RyaW5nIGZyYWN0aW9uXG4gKiAxMjMuJzQ1NicgLSBhIGRvdWJsZSB3aXRoIHJlcGVhdGluZyBkZWNpbWFsIHBsYWNlc1xuICogMTIzLig0NTYpIC0gc3lub255bVxuICogMTIzLjQ1JzYnIC0gYSBkb3VibGUgd2l0aCByZXBlYXRpbmcgbGFzdCBwbGFjZVxuICogMTIzLjQ1KDYpIC0gc3lub255bVxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogdmFyIGYgPSBuZXcgRnJhY3Rpb24oXCI5LjQnMzEnXCIpO1xuICogZi5tdWwoWy00LCAzXSkuZGl2KDQuOSk7XG4gKlxuICovXG5cbihmdW5jdGlvbihyb290KSB7XG5cbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgLy8gTWF4aW11bSBzZWFyY2ggZGVwdGggZm9yIGN5Y2xpYyByYXRpb25hbCBudW1iZXJzLiAyMDAwIHNob3VsZCBiZSBtb3JlIHRoYW4gZW5vdWdoLlxuICAvLyBFeGFtcGxlOiAxLzcgPSAwLigxNDI4NTcpIGhhcyA2IHJlcGVhdGluZyBkZWNpbWFsIHBsYWNlcy5cbiAgLy8gSWYgTUFYX0NZQ0xFX0xFTiBnZXRzIHJlZHVjZWQsIGxvbmcgY3ljbGVzIHdpbGwgbm90IGJlIGRldGVjdGVkIGFuZCB0b1N0cmluZygpIG9ubHkgZ2V0cyB0aGUgZmlyc3QgMTAgZGlnaXRzXG4gIHZhciBNQVhfQ1lDTEVfTEVOID0gMjAwMDtcblxuICAvLyBQYXJzZWQgZGF0YSB0byBhdm9pZCBjYWxsaW5nIFwibmV3XCIgYWxsIHRoZSB0aW1lXG4gIHZhciBQID0ge1xuICAgIFwic1wiOiAxLFxuICAgIFwiblwiOiAwLFxuICAgIFwiZFwiOiAxXG4gIH07XG5cbiAgZnVuY3Rpb24gY3JlYXRlRXJyb3IobmFtZSkge1xuXG4gICAgZnVuY3Rpb24gZXJyb3JDb25zdHJ1Y3RvcigpIHtcbiAgICAgIHZhciB0ZW1wID0gRXJyb3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHRlbXBbJ25hbWUnXSA9IHRoaXNbJ25hbWUnXSA9IG5hbWU7XG4gICAgICB0aGlzWydzdGFjayddID0gdGVtcFsnc3RhY2snXTtcbiAgICAgIHRoaXNbJ21lc3NhZ2UnXSA9IHRlbXBbJ21lc3NhZ2UnXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFcnJvciBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gSW50ZXJtZWRpYXRlSW5oZXJpdG9yKCkge31cbiAgICBJbnRlcm1lZGlhdGVJbmhlcml0b3IucHJvdG90eXBlID0gRXJyb3IucHJvdG90eXBlO1xuICAgIGVycm9yQ29uc3RydWN0b3IucHJvdG90eXBlID0gbmV3IEludGVybWVkaWF0ZUluaGVyaXRvcigpO1xuXG4gICAgcmV0dXJuIGVycm9yQ29uc3RydWN0b3I7XG4gIH1cblxuICB2YXIgRGl2aXNpb25CeVplcm8gPSBGcmFjdGlvblsnRGl2aXNpb25CeVplcm8nXSA9IGNyZWF0ZUVycm9yKCdEaXZpc2lvbkJ5WmVybycpO1xuICB2YXIgSW52YWxpZFBhcmFtZXRlciA9IEZyYWN0aW9uWydJbnZhbGlkUGFyYW1ldGVyJ10gPSBjcmVhdGVFcnJvcignSW52YWxpZFBhcmFtZXRlcicpO1xuXG4gIGZ1bmN0aW9uIGFzc2lnbihuLCBzKSB7XG5cbiAgICBpZiAoaXNOYU4obiA9IHBhcnNlSW50KG4sIDEwKSkpIHtcbiAgICAgIHRocm93SW52YWxpZFBhcmFtKCk7XG4gICAgfVxuICAgIHJldHVybiBuICogcztcbiAgfVxuXG4gIGZ1bmN0aW9uIHRocm93SW52YWxpZFBhcmFtKCkge1xuICAgIHRocm93IG5ldyBJbnZhbGlkUGFyYW1ldGVyKCk7XG4gIH1cblxuICB2YXIgcGFyc2UgPSBmdW5jdGlvbihwMSwgcDIpIHtcblxuICAgIHZhciBuID0gMCwgZCA9IDEsIHMgPSAxO1xuICAgIHZhciB2ID0gMCwgdyA9IDAsIHggPSAwLCB5ID0gMSwgeiA9IDE7XG5cbiAgICB2YXIgQSA9IDAsIEIgPSAxO1xuICAgIHZhciBDID0gMSwgRCA9IDE7XG5cbiAgICB2YXIgTiA9IDEwMDAwMDAwO1xuICAgIHZhciBNO1xuXG4gICAgaWYgKHAxID09PSB1bmRlZmluZWQgfHwgcDEgPT09IG51bGwpIHtcbiAgICAgIC8qIHZvaWQgKi9cbiAgICB9IGVsc2UgaWYgKHAyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG4gPSBwMTtcbiAgICAgIGQgPSBwMjtcbiAgICAgIHMgPSBuICogZDtcbiAgICB9IGVsc2VcbiAgICAgIHN3aXRjaCAodHlwZW9mIHAxKSB7XG5cbiAgICAgICAgY2FzZSBcIm9iamVjdFwiOlxuICAgICAgICB7XG4gICAgICAgICAgaWYgKFwiZFwiIGluIHAxICYmIFwiblwiIGluIHAxKSB7XG4gICAgICAgICAgICBuID0gcDFbXCJuXCJdO1xuICAgICAgICAgICAgZCA9IHAxW1wiZFwiXTtcbiAgICAgICAgICAgIGlmIChcInNcIiBpbiBwMSlcbiAgICAgICAgICAgICAgbiAqPSBwMVtcInNcIl07XG4gICAgICAgICAgfSBlbHNlIGlmICgwIGluIHAxKSB7XG4gICAgICAgICAgICBuID0gcDFbMF07XG4gICAgICAgICAgICBpZiAoMSBpbiBwMSlcbiAgICAgICAgICAgICAgZCA9IHAxWzFdO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvd0ludmFsaWRQYXJhbSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzID0gbiAqIGQ7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBcIm51bWJlclwiOlxuICAgICAgICB7XG4gICAgICAgICAgaWYgKHAxIDwgMCkge1xuICAgICAgICAgICAgcyA9IHAxO1xuICAgICAgICAgICAgcDEgPSAtcDE7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHAxICUgMSA9PT0gMCkge1xuICAgICAgICAgICAgbiA9IHAxO1xuICAgICAgICAgIH0gZWxzZSBpZiAocDEgPiAwKSB7IC8vIGNoZWNrIGZvciAhPSAwLCBzY2FsZSB3b3VsZCBiZWNvbWUgTmFOIChsb2coMCkpLCB3aGljaCBjb252ZXJnZXMgcmVhbGx5IHNsb3dcblxuICAgICAgICAgICAgaWYgKHAxID49IDEpIHtcbiAgICAgICAgICAgICAgeiA9IE1hdGgucG93KDEwLCBNYXRoLmZsb29yKDEgKyBNYXRoLmxvZyhwMSkgLyBNYXRoLkxOMTApKTtcbiAgICAgICAgICAgICAgcDEgLz0gejtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXNpbmcgRmFyZXkgU2VxdWVuY2VzXG4gICAgICAgICAgICAvLyBodHRwOi8vd3d3LmpvaG5kY29vay5jb20vYmxvZy8yMDEwLzEwLzIwL2Jlc3QtcmF0aW9uYWwtYXBwcm94aW1hdGlvbi9cblxuICAgICAgICAgICAgd2hpbGUgKEIgPD0gTiAmJiBEIDw9IE4pIHtcbiAgICAgICAgICAgICAgTSA9IChBICsgQykgLyAoQiArIEQpO1xuXG4gICAgICAgICAgICAgIGlmIChwMSA9PT0gTSkge1xuICAgICAgICAgICAgICAgIGlmIChCICsgRCA8PSBOKSB7XG4gICAgICAgICAgICAgICAgICBuID0gQSArIEM7XG4gICAgICAgICAgICAgICAgICBkID0gQiArIEQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChEID4gQikge1xuICAgICAgICAgICAgICAgICAgbiA9IEM7XG4gICAgICAgICAgICAgICAgICBkID0gRDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgbiA9IEE7XG4gICAgICAgICAgICAgICAgICBkID0gQjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgIGlmIChwMSA+IE0pIHtcbiAgICAgICAgICAgICAgICAgIEEgKz0gQztcbiAgICAgICAgICAgICAgICAgIEIgKz0gRDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgQyArPSBBO1xuICAgICAgICAgICAgICAgICAgRCArPSBCO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChCID4gTikge1xuICAgICAgICAgICAgICAgICAgbiA9IEM7XG4gICAgICAgICAgICAgICAgICBkID0gRDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgbiA9IEE7XG4gICAgICAgICAgICAgICAgICBkID0gQjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG4gKj0gejtcbiAgICAgICAgICB9IGVsc2UgaWYgKGlzTmFOKHAxKSB8fCBpc05hTihwMikpIHtcbiAgICAgICAgICAgIGQgPSBuID0gTmFOO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICAgIHtcbiAgICAgICAgICBCID0gcDEubWF0Y2goL1xcZCt8Li9nKTtcblxuICAgICAgICAgIGlmIChCID09PSBudWxsKVxuICAgICAgICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKTtcblxuICAgICAgICAgIGlmIChCW0FdID09PSAnLScpIHsvLyBDaGVjayBmb3IgbWludXMgc2lnbiBhdCB0aGUgYmVnaW5uaW5nXG4gICAgICAgICAgICBzID0gLTE7XG4gICAgICAgICAgICBBKys7XG4gICAgICAgICAgfSBlbHNlIGlmIChCW0FdID09PSAnKycpIHsvLyBDaGVjayBmb3IgcGx1cyBzaWduIGF0IHRoZSBiZWdpbm5pbmdcbiAgICAgICAgICAgIEErKztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoQi5sZW5ndGggPT09IEEgKyAxKSB7IC8vIENoZWNrIGlmIGl0J3MganVzdCBhIHNpbXBsZSBudW1iZXIgXCIxMjM0XCJcbiAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBKytdLCBzKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKEJbQSArIDFdID09PSAnLicgfHwgQltBXSA9PT0gJy4nKSB7IC8vIENoZWNrIGlmIGl0J3MgYSBkZWNpbWFsIG51bWJlclxuXG4gICAgICAgICAgICBpZiAoQltBXSAhPT0gJy4nKSB7IC8vIEhhbmRsZSAwLjUgYW5kIC41XG4gICAgICAgICAgICAgIHYgPSBhc3NpZ24oQltBKytdLCBzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIEErKztcblxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGRlY2ltYWwgcGxhY2VzXG4gICAgICAgICAgICBpZiAoQSArIDEgPT09IEIubGVuZ3RoIHx8IEJbQSArIDFdID09PSAnKCcgJiYgQltBICsgM10gPT09ICcpJyB8fCBCW0EgKyAxXSA9PT0gXCInXCIgJiYgQltBICsgM10gPT09IFwiJ1wiKSB7XG4gICAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBXSwgcyk7XG4gICAgICAgICAgICAgIHkgPSBNYXRoLnBvdygxMCwgQltBXS5sZW5ndGgpO1xuICAgICAgICAgICAgICBBKys7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGZvciByZXBlYXRpbmcgcGxhY2VzXG4gICAgICAgICAgICBpZiAoQltBXSA9PT0gJygnICYmIEJbQSArIDJdID09PSAnKScgfHwgQltBXSA9PT0gXCInXCIgJiYgQltBICsgMl0gPT09IFwiJ1wiKSB7XG4gICAgICAgICAgICAgIHggPSBhc3NpZ24oQltBICsgMV0sIHMpO1xuICAgICAgICAgICAgICB6ID0gTWF0aC5wb3coMTAsIEJbQSArIDFdLmxlbmd0aCkgLSAxO1xuICAgICAgICAgICAgICBBICs9IDM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICB9IGVsc2UgaWYgKEJbQSArIDFdID09PSAnLycgfHwgQltBICsgMV0gPT09ICc6JykgeyAvLyBDaGVjayBmb3IgYSBzaW1wbGUgZnJhY3Rpb24gXCIxMjMvNDU2XCIgb3IgXCIxMjM6NDU2XCJcbiAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBXSwgcyk7XG4gICAgICAgICAgICB5ID0gYXNzaWduKEJbQSArIDJdLCAxKTtcbiAgICAgICAgICAgIEEgKz0gMztcbiAgICAgICAgICB9IGVsc2UgaWYgKEJbQSArIDNdID09PSAnLycgJiYgQltBICsgMV0gPT09ICcgJykgeyAvLyBDaGVjayBmb3IgYSBjb21wbGV4IGZyYWN0aW9uIFwiMTIzIDEvMlwiXG4gICAgICAgICAgICB2ID0gYXNzaWduKEJbQV0sIHMpO1xuICAgICAgICAgICAgdyA9IGFzc2lnbihCW0EgKyAyXSwgcyk7XG4gICAgICAgICAgICB5ID0gYXNzaWduKEJbQSArIDRdLCAxKTtcbiAgICAgICAgICAgIEEgKz0gNTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoQi5sZW5ndGggPD0gQSkgeyAvLyBDaGVjayBmb3IgbW9yZSB0b2tlbnMgb24gdGhlIHN0YWNrXG4gICAgICAgICAgICBkID0geSAqIHo7XG4gICAgICAgICAgICBzID0gLyogdm9pZCAqL1xuICAgICAgICAgICAgICAgICAgICBuID0geCArIGQgKiB2ICsgeiAqIHc7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvKiBGYWxsIHRocm91Z2ggb24gZXJyb3IgKi9cbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93SW52YWxpZFBhcmFtKCk7XG4gICAgICB9XG5cbiAgICBpZiAoZCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IERpdmlzaW9uQnlaZXJvKCk7XG4gICAgfVxuXG4gICAgUFtcInNcIl0gPSBzIDwgMCA/IC0xIDogMTtcbiAgICBQW1wiblwiXSA9IE1hdGguYWJzKG4pO1xuICAgIFBbXCJkXCJdID0gTWF0aC5hYnMoZCk7XG4gIH07XG5cbiAgZnVuY3Rpb24gbW9kcG93KGIsIGUsIG0pIHtcblxuICAgIHZhciByID0gMTtcbiAgICBmb3IgKDsgZSA+IDA7IGIgPSAoYiAqIGIpICUgbSwgZSA+Pj0gMSkge1xuXG4gICAgICBpZiAoZSAmIDEpIHtcbiAgICAgICAgciA9IChyICogYikgJSBtO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcjtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gY3ljbGVMZW4obiwgZCkge1xuXG4gICAgZm9yICg7IGQgJSAyID09PSAwO1xuICAgICAgICAgICAgZCAvPSAyKSB7XG4gICAgfVxuXG4gICAgZm9yICg7IGQgJSA1ID09PSAwO1xuICAgICAgICAgICAgZCAvPSA1KSB7XG4gICAgfVxuXG4gICAgaWYgKGQgPT09IDEpIC8vIENhdGNoIG5vbi1jeWNsaWMgbnVtYmVyc1xuICAgICAgcmV0dXJuIDA7XG5cbiAgICAvLyBJZiB3ZSB3b3VsZCBsaWtlIHRvIGNvbXB1dGUgcmVhbGx5IGxhcmdlIG51bWJlcnMgcXVpY2tlciwgd2UgY291bGQgbWFrZSB1c2Ugb2YgRmVybWF0J3MgbGl0dGxlIHRoZW9yZW06XG4gICAgLy8gMTBeKGQtMSkgJSBkID09IDFcbiAgICAvLyBIb3dldmVyLCB3ZSBkb24ndCBuZWVkIHN1Y2ggbGFyZ2UgbnVtYmVycyBhbmQgTUFYX0NZQ0xFX0xFTiBzaG91bGQgYmUgdGhlIGNhcHN0b25lLFxuICAgIC8vIGFzIHdlIHdhbnQgdG8gdHJhbnNsYXRlIHRoZSBudW1iZXJzIHRvIHN0cmluZ3MuXG5cbiAgICB2YXIgcmVtID0gMTAgJSBkO1xuICAgIHZhciB0ID0gMTtcblxuICAgIGZvciAoOyByZW0gIT09IDE7IHQrKykge1xuICAgICAgcmVtID0gcmVtICogMTAgJSBkO1xuXG4gICAgICBpZiAodCA+IE1BWF9DWUNMRV9MRU4pXG4gICAgICAgIHJldHVybiAwOyAvLyBSZXR1cm5pbmcgMCBoZXJlIG1lYW5zIHRoYXQgd2UgZG9uJ3QgcHJpbnQgaXQgYXMgYSBjeWNsaWMgbnVtYmVyLiBJdCdzIGxpa2VseSB0aGF0IHRoZSBhbnN3ZXIgaXMgYGQtMWBcbiAgICB9XG4gICAgcmV0dXJuIHQ7XG4gIH1cblxuXG4gICAgIGZ1bmN0aW9uIGN5Y2xlU3RhcnQobiwgZCwgbGVuKSB7XG5cbiAgICB2YXIgcmVtMSA9IDE7XG4gICAgdmFyIHJlbTIgPSBtb2Rwb3coMTAsIGxlbiwgZCk7XG5cbiAgICBmb3IgKHZhciB0ID0gMDsgdCA8IDMwMDsgdCsrKSB7IC8vIHMgPCB+bG9nMTAoTnVtYmVyLk1BWF9WQUxVRSlcbiAgICAgIC8vIFNvbHZlIDEwXnMgPT0gMTBeKHMrdCkgKG1vZCBkKVxuXG4gICAgICBpZiAocmVtMSA9PT0gcmVtMilcbiAgICAgICAgcmV0dXJuIHQ7XG5cbiAgICAgIHJlbTEgPSByZW0xICogMTAgJSBkO1xuICAgICAgcmVtMiA9IHJlbTIgKiAxMCAlIGQ7XG4gICAgfVxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2NkKGEsIGIpIHtcblxuICAgIGlmICghYSlcbiAgICAgIHJldHVybiBiO1xuICAgIGlmICghYilcbiAgICAgIHJldHVybiBhO1xuXG4gICAgd2hpbGUgKDEpIHtcbiAgICAgIGEgJT0gYjtcbiAgICAgIGlmICghYSlcbiAgICAgICAgcmV0dXJuIGI7XG4gICAgICBiICU9IGE7XG4gICAgICBpZiAoIWIpXG4gICAgICAgIHJldHVybiBhO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogTW9kdWxlIGNvbnN0cnVjdG9yXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge251bWJlcnxGcmFjdGlvbj19IGFcbiAgICogQHBhcmFtIHtudW1iZXI9fSBiXG4gICAqL1xuICBmdW5jdGlvbiBGcmFjdGlvbihhLCBiKSB7XG5cbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRnJhY3Rpb24pKSB7XG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKGEsIGIpO1xuICAgIH1cblxuICAgIHBhcnNlKGEsIGIpO1xuXG4gICAgaWYgKEZyYWN0aW9uWydSRURVQ0UnXSkge1xuICAgICAgYSA9IGdjZChQW1wiZFwiXSwgUFtcIm5cIl0pOyAvLyBBYnVzZSBhXG4gICAgfSBlbHNlIHtcbiAgICAgIGEgPSAxO1xuICAgIH1cblxuICAgIHRoaXNbXCJzXCJdID0gUFtcInNcIl07XG4gICAgdGhpc1tcIm5cIl0gPSBQW1wiblwiXSAvIGE7XG4gICAgdGhpc1tcImRcIl0gPSBQW1wiZFwiXSAvIGE7XG4gIH1cblxuICAvKipcbiAgICogQm9vbGVhbiBnbG9iYWwgdmFyaWFibGUgdG8gYmUgYWJsZSB0byBkaXNhYmxlIGF1dG9tYXRpYyByZWR1Y3Rpb24gb2YgdGhlIGZyYWN0aW9uXG4gICAqXG4gICAqL1xuICBGcmFjdGlvblsnUkVEVUNFJ10gPSAxO1xuXG4gIEZyYWN0aW9uLnByb3RvdHlwZSA9IHtcblxuICAgIFwic1wiOiAxLFxuICAgIFwiblwiOiAwLFxuICAgIFwiZFwiOiAxLFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgYWJzb2x1dGUgdmFsdWVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oLTQpLmFicygpID0+IDRcbiAgICAgKiovXG4gICAgXCJhYnNcIjogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24odGhpc1tcIm5cIl0sIHRoaXNbXCJkXCJdKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW52ZXJ0cyB0aGUgc2lnbiBvZiB0aGUgY3VycmVudCBmcmFjdGlvblxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigtNCkubmVnKCkgPT4gNFxuICAgICAqKi9cbiAgICBcIm5lZ1wiOiBmdW5jdGlvbigpIHtcblxuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbigtdGhpc1tcInNcIl0gKiB0aGlzW1wiblwiXSwgdGhpc1tcImRcIl0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKHtuOiAyLCBkOiAzfSkuYWRkKFwiMTQuOVwiKSA9PiA0NjcgLyAzMFxuICAgICAqKi9cbiAgICBcImFkZFwiOiBmdW5jdGlvbihhLCBiKSB7XG5cbiAgICAgIHBhcnNlKGEsIGIpO1xuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICAgICAgdGhpc1tcInNcIl0gKiB0aGlzW1wiblwiXSAqIFBbXCJkXCJdICsgUFtcInNcIl0gKiB0aGlzW1wiZFwiXSAqIFBbXCJuXCJdLFxuICAgICAgICAgICAgICB0aGlzW1wiZFwiXSAqIFBbXCJkXCJdXG4gICAgICAgICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN1YnRyYWN0cyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbih7bjogMiwgZDogM30pLmFkZChcIjE0LjlcIikgPT4gLTQyNyAvIDMwXG4gICAgICoqL1xuICAgIFwic3ViXCI6IGZ1bmN0aW9uKGEsIGIpIHtcblxuICAgICAgcGFyc2UoYSwgYik7XG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgICAgICB0aGlzW1wic1wiXSAqIHRoaXNbXCJuXCJdICogUFtcImRcIl0gLSBQW1wic1wiXSAqIHRoaXNbXCJkXCJdICogUFtcIm5cIl0sXG4gICAgICAgICAgICAgIHRoaXNbXCJkXCJdICogUFtcImRcIl1cbiAgICAgICAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTXVsdGlwbGllcyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIi0xNy4oMzQ1KVwiKS5tdWwoMykgPT4gNTc3NiAvIDExMVxuICAgICAqKi9cbiAgICBcIm11bFwiOiBmdW5jdGlvbihhLCBiKSB7XG5cbiAgICAgIHBhcnNlKGEsIGIpO1xuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICAgICAgdGhpc1tcInNcIl0gKiBQW1wic1wiXSAqIHRoaXNbXCJuXCJdICogUFtcIm5cIl0sXG4gICAgICAgICAgICAgIHRoaXNbXCJkXCJdICogUFtcImRcIl1cbiAgICAgICAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGl2aWRlcyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIi0xNy4oMzQ1KVwiKS5pbnZlcnNlKCkuZGl2KDMpXG4gICAgICoqL1xuICAgIFwiZGl2XCI6IGZ1bmN0aW9uKGEsIGIpIHtcblxuICAgICAgcGFyc2UoYSwgYik7XG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgICAgICB0aGlzW1wic1wiXSAqIFBbXCJzXCJdICogdGhpc1tcIm5cIl0gKiBQW1wiZFwiXSxcbiAgICAgICAgICAgICAgdGhpc1tcImRcIl0gKiBQW1wiblwiXVxuICAgICAgICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbG9uZXMgdGhlIGFjdHVhbCBvYmplY3RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCItMTcuKDM0NSlcIikuY2xvbmUoKVxuICAgICAqKi9cbiAgICBcImNsb25lXCI6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgbW9kdWxvIG9mIHR3byByYXRpb25hbCBudW1iZXJzIC0gYSBtb3JlIHByZWNpc2UgZm1vZFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5tb2QoWzcsIDhdKSA9PiAoMTMvMykgJSAoNy84KSA9ICg1LzYpXG4gICAgICoqL1xuICAgIFwibW9kXCI6IGZ1bmN0aW9uKGEsIGIpIHtcblxuICAgICAgaWYgKGlzTmFOKHRoaXNbJ24nXSkgfHwgaXNOYU4odGhpc1snZCddKSkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTik7XG4gICAgICB9XG5cbiAgICAgIGlmIChhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzW1wic1wiXSAqIHRoaXNbXCJuXCJdICUgdGhpc1tcImRcIl0sIDEpO1xuICAgICAgfVxuXG4gICAgICBwYXJzZShhLCBiKTtcbiAgICAgIGlmICgwID09PSBQW1wiblwiXSAmJiAwID09PSB0aGlzW1wiZFwiXSkge1xuICAgICAgICBGcmFjdGlvbigwLCAwKTsgLy8gVGhyb3cgRGl2aXNpb25CeVplcm9cbiAgICAgIH1cblxuICAgICAgLypcbiAgICAgICAqIEZpcnN0IHNpbGx5IGF0dGVtcHQsIGtpbmRhIHNsb3dcbiAgICAgICAqXG4gICAgICAgcmV0dXJuIHRoYXRbXCJzdWJcIl0oe1xuICAgICAgIFwiblwiOiBudW1bXCJuXCJdICogTWF0aC5mbG9vcigodGhpcy5uIC8gdGhpcy5kKSAvIChudW0ubiAvIG51bS5kKSksXG4gICAgICAgXCJkXCI6IG51bVtcImRcIl0sXG4gICAgICAgXCJzXCI6IHRoaXNbXCJzXCJdXG4gICAgICAgfSk7Ki9cblxuICAgICAgLypcbiAgICAgICAqIE5ldyBhdHRlbXB0OiBhMSAvIGIxID0gYTIgLyBiMiAqIHEgKyByXG4gICAgICAgKiA9PiBiMiAqIGExID0gYTIgKiBiMSAqIHEgKyBiMSAqIGIyICogclxuICAgICAgICogPT4gKGIyICogYTEgJSBhMiAqIGIxKSAvIChiMSAqIGIyKVxuICAgICAgICovXG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgICAgICB0aGlzW1wic1wiXSAqIChQW1wiZFwiXSAqIHRoaXNbXCJuXCJdKSAlIChQW1wiblwiXSAqIHRoaXNbXCJkXCJdKSxcbiAgICAgICAgICAgICAgUFtcImRcIl0gKiB0aGlzW1wiZFwiXVxuICAgICAgICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmcmFjdGlvbmFsIGdjZCBvZiB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbig1LDgpLmdjZCgzLDcpID0+IDEvNTZcbiAgICAgKi9cbiAgICBcImdjZFwiOiBmdW5jdGlvbihhLCBiKSB7XG5cbiAgICAgIHBhcnNlKGEsIGIpO1xuXG4gICAgICAvLyBnY2QoYSAvIGIsIGMgLyBkKSA9IGdjZChhLCBjKSAvIGxjbShiLCBkKVxuXG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKGdjZChQW1wiblwiXSwgdGhpc1tcIm5cIl0pICogZ2NkKFBbXCJkXCJdLCB0aGlzW1wiZFwiXSksIFBbXCJkXCJdICogdGhpc1tcImRcIl0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmcmFjdGlvbmFsIGxjbSBvZiB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbig1LDgpLmxjbSgzLDcpID0+IDE1XG4gICAgICovXG4gICAgXCJsY21cIjogZnVuY3Rpb24oYSwgYikge1xuXG4gICAgICBwYXJzZShhLCBiKTtcblxuICAgICAgLy8gbGNtKGEgLyBiLCBjIC8gZCkgPSBsY20oYSwgYykgLyBnY2QoYiwgZClcblxuICAgICAgaWYgKFBbXCJuXCJdID09PSAwICYmIHRoaXNbXCJuXCJdID09PSAwKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb247XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFBbXCJuXCJdICogdGhpc1tcIm5cIl0sIGdjZChQW1wiblwiXSwgdGhpc1tcIm5cIl0pICogZ2NkKFBbXCJkXCJdLCB0aGlzW1wiZFwiXSkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBjZWlsIG9mIGEgcmF0aW9uYWwgbnVtYmVyXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLmNlaWwoKSA9PiAoNSAvIDEpXG4gICAgICoqL1xuICAgIFwiY2VpbFwiOiBmdW5jdGlvbihwbGFjZXMpIHtcblxuICAgICAgcGxhY2VzID0gTWF0aC5wb3coMTAsIHBsYWNlcyB8fCAwKTtcblxuICAgICAgaWYgKGlzTmFOKHRoaXNbXCJuXCJdKSB8fCBpc05hTih0aGlzW1wiZFwiXSkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLmNlaWwocGxhY2VzICogdGhpc1tcInNcIl0gKiB0aGlzW1wiblwiXSAvIHRoaXNbXCJkXCJdKSwgcGxhY2VzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZmxvb3Igb2YgYSByYXRpb25hbCBudW1iZXJcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykuZmxvb3IoKSA9PiAoNCAvIDEpXG4gICAgICoqL1xuICAgIFwiZmxvb3JcIjogZnVuY3Rpb24ocGxhY2VzKSB7XG5cbiAgICAgIHBsYWNlcyA9IE1hdGgucG93KDEwLCBwbGFjZXMgfHwgMCk7XG5cbiAgICAgIGlmIChpc05hTih0aGlzW1wiblwiXSkgfHwgaXNOYU4odGhpc1tcImRcIl0pKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5mbG9vcihwbGFjZXMgKiB0aGlzW1wic1wiXSAqIHRoaXNbXCJuXCJdIC8gdGhpc1tcImRcIl0pLCBwbGFjZXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSb3VuZHMgYSByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLnJvdW5kKCkgPT4gKDQgLyAxKVxuICAgICAqKi9cbiAgICBcInJvdW5kXCI6IGZ1bmN0aW9uKHBsYWNlcykge1xuXG4gICAgICBwbGFjZXMgPSBNYXRoLnBvdygxMCwgcGxhY2VzIHx8IDApO1xuXG4gICAgICBpZiAoaXNOYU4odGhpc1tcIm5cIl0pIHx8IGlzTmFOKHRoaXNbXCJkXCJdKSkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTik7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGgucm91bmQocGxhY2VzICogdGhpc1tcInNcIl0gKiB0aGlzW1wiblwiXSAvIHRoaXNbXCJkXCJdKSwgcGxhY2VzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgaW52ZXJzZSBvZiB0aGUgZnJhY3Rpb24sIG1lYW5zIG51bWVyYXRvciBhbmQgZGVudW1lcmF0b3IgYXJlIGV4Y2hhbmdlZFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihbLTMsIDRdKS5pbnZlcnNlKCkgPT4gLTQgLyAzXG4gICAgICoqL1xuICAgIFwiaW52ZXJzZVwiOiBmdW5jdGlvbigpIHtcblxuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzW1wic1wiXSAqIHRoaXNbXCJkXCJdLCB0aGlzW1wiblwiXSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZyYWN0aW9uIHRvIHNvbWUgaW50ZWdlciBleHBvbmVudFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigtMSwyKS5wb3coLTMpID0+IC04XG4gICAgICovXG4gICAgXCJwb3dcIjogZnVuY3Rpb24obSkge1xuXG4gICAgICBpZiAobSA8IDApIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLnBvdyh0aGlzWydzJ10gKiB0aGlzW1wiZFwiXSwgLW0pLCBNYXRoLnBvdyh0aGlzW1wiblwiXSwgLW0pKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5wb3codGhpc1sncyddICogdGhpc1tcIm5cIl0sIG0pLCBNYXRoLnBvdyh0aGlzW1wiZFwiXSwgbSkpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0d28gcmF0aW9uYWwgbnVtYmVycyBhcmUgdGhlIHNhbWVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oMTkuNikuZXF1YWxzKFs5OCwgNV0pO1xuICAgICAqKi9cbiAgICBcImVxdWFsc1wiOiBmdW5jdGlvbihhLCBiKSB7XG5cbiAgICAgIHBhcnNlKGEsIGIpO1xuICAgICAgcmV0dXJuIHRoaXNbXCJzXCJdICogdGhpc1tcIm5cIl0gKiBQW1wiZFwiXSA9PT0gUFtcInNcIl0gKiBQW1wiblwiXSAqIHRoaXNbXCJkXCJdOyAvLyBTYW1lIGFzIGNvbXBhcmUoKSA9PT0gMFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0d28gcmF0aW9uYWwgbnVtYmVycyBhcmUgdGhlIHNhbWVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oMTkuNikuZXF1YWxzKFs5OCwgNV0pO1xuICAgICAqKi9cbiAgICBcImNvbXBhcmVcIjogZnVuY3Rpb24oYSwgYikge1xuXG4gICAgICBwYXJzZShhLCBiKTtcbiAgICAgIHZhciB0ID0gKHRoaXNbXCJzXCJdICogdGhpc1tcIm5cIl0gKiBQW1wiZFwiXSAtIFBbXCJzXCJdICogUFtcIm5cIl0gKiB0aGlzW1wiZFwiXSk7XG4gICAgICByZXR1cm4gKDAgPCB0KSAtICh0IDwgMCk7XG4gICAgfSxcblxuICAgIFwic2ltcGxpZnlcIjogZnVuY3Rpb24oZXBzKSB7XG5cbiAgICAgIC8vIEZpcnN0IG5haXZlIGltcGxlbWVudGF0aW9uLCBuZWVkcyBpbXByb3ZlbWVudFxuXG4gICAgICBpZiAoaXNOYU4odGhpc1snbiddKSB8fCBpc05hTih0aGlzWydkJ10pKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuXG4gICAgICB2YXIgY29udCA9IHRoaXNbJ2FicyddKClbJ3RvQ29udGludWVkJ10oKTtcblxuICAgICAgZXBzID0gZXBzIHx8IDAuMDAxO1xuXG4gICAgICBmdW5jdGlvbiByZWMoYSkge1xuICAgICAgICBpZiAoYS5sZW5ndGggPT09IDEpXG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihhWzBdKTtcbiAgICAgICAgcmV0dXJuIHJlYyhhLnNsaWNlKDEpKVsnaW52ZXJzZSddKClbJ2FkZCddKGFbMF0pO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbnQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHRtcCA9IHJlYyhjb250LnNsaWNlKDAsIGkgKyAxKSk7XG4gICAgICAgIGlmICh0bXBbJ3N1YiddKHRoaXNbJ2FicyddKCkpWydhYnMnXSgpLnZhbHVlT2YoKSA8IGVwcykge1xuICAgICAgICAgIHJldHVybiB0bXBbJ211bCddKHRoaXNbJ3MnXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0d28gcmF0aW9uYWwgbnVtYmVycyBhcmUgZGl2aXNpYmxlXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDE5LjYpLmRpdmlzaWJsZSgxLjUpO1xuICAgICAqL1xuICAgIFwiZGl2aXNpYmxlXCI6IGZ1bmN0aW9uKGEsIGIpIHtcblxuICAgICAgcGFyc2UoYSwgYik7XG4gICAgICByZXR1cm4gISghKFBbXCJuXCJdICogdGhpc1tcImRcIl0pIHx8ICgodGhpc1tcIm5cIl0gKiBQW1wiZFwiXSkgJSAoUFtcIm5cIl0gKiB0aGlzW1wiZFwiXSkpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIGRlY2ltYWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGZyYWN0aW9uXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiMTAwLic5MTgyMydcIikudmFsdWVPZigpID0+IDEwMC45MTgyMzkxODIzOTE4M1xuICAgICAqKi9cbiAgICAndmFsdWVPZic6IGZ1bmN0aW9uKCkge1xuXG4gICAgICByZXR1cm4gdGhpc1tcInNcIl0gKiB0aGlzW1wiblwiXSAvIHRoaXNbXCJkXCJdO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgc3RyaW5nLWZyYWN0aW9uIHJlcHJlc2VudGF0aW9uIG9mIGEgRnJhY3Rpb24gb2JqZWN0XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiMS4nMydcIikudG9GcmFjdGlvbigpID0+IFwiNCAxLzNcIlxuICAgICAqKi9cbiAgICAndG9GcmFjdGlvbic6IGZ1bmN0aW9uKGV4Y2x1ZGVXaG9sZSkge1xuXG4gICAgICB2YXIgd2hvbGUsIHN0ciA9IFwiXCI7XG4gICAgICB2YXIgbiA9IHRoaXNbXCJuXCJdO1xuICAgICAgdmFyIGQgPSB0aGlzW1wiZFwiXTtcbiAgICAgIGlmICh0aGlzW1wic1wiXSA8IDApIHtcbiAgICAgICAgc3RyICs9ICctJztcbiAgICAgIH1cblxuICAgICAgaWYgKGQgPT09IDEpIHtcbiAgICAgICAgc3RyICs9IG47XG4gICAgICB9IGVsc2Uge1xuXG4gICAgICAgIGlmIChleGNsdWRlV2hvbGUgJiYgKHdob2xlID0gTWF0aC5mbG9vcihuIC8gZCkpID4gMCkge1xuICAgICAgICAgIHN0ciArPSB3aG9sZTtcbiAgICAgICAgICBzdHIgKz0gXCIgXCI7XG4gICAgICAgICAgbiAlPSBkO1xuICAgICAgICB9XG5cbiAgICAgICAgc3RyICs9IG47XG4gICAgICAgIHN0ciArPSAnLyc7XG4gICAgICAgIHN0ciArPSBkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIGxhdGV4IHJlcHJlc2VudGF0aW9uIG9mIGEgRnJhY3Rpb24gb2JqZWN0XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiMS4nMydcIikudG9MYXRleCgpID0+IFwiXFxmcmFjezR9ezN9XCJcbiAgICAgKiovXG4gICAgJ3RvTGF0ZXgnOiBmdW5jdGlvbihleGNsdWRlV2hvbGUpIHtcblxuICAgICAgdmFyIHdob2xlLCBzdHIgPSBcIlwiO1xuICAgICAgdmFyIG4gPSB0aGlzW1wiblwiXTtcbiAgICAgIHZhciBkID0gdGhpc1tcImRcIl07XG4gICAgICBpZiAodGhpc1tcInNcIl0gPCAwKSB7XG4gICAgICAgIHN0ciArPSAnLSc7XG4gICAgICB9XG5cbiAgICAgIGlmIChkID09PSAxKSB7XG4gICAgICAgIHN0ciArPSBuO1xuICAgICAgfSBlbHNlIHtcblxuICAgICAgICBpZiAoZXhjbHVkZVdob2xlICYmICh3aG9sZSA9IE1hdGguZmxvb3IobiAvIGQpKSA+IDApIHtcbiAgICAgICAgICBzdHIgKz0gd2hvbGU7XG4gICAgICAgICAgbiAlPSBkO1xuICAgICAgICB9XG5cbiAgICAgICAgc3RyICs9IFwiXFxcXGZyYWN7XCI7XG4gICAgICAgIHN0ciArPSBuO1xuICAgICAgICBzdHIgKz0gJ317JztcbiAgICAgICAgc3RyICs9IGQ7XG4gICAgICAgIHN0ciArPSAnfSc7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIGNvbnRpbnVlZCBmcmFjdGlvbiBlbGVtZW50c1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjcvOFwiKS50b0NvbnRpbnVlZCgpID0+IFswLDEsN11cbiAgICAgKi9cbiAgICAndG9Db250aW51ZWQnOiBmdW5jdGlvbigpIHtcblxuICAgICAgdmFyIHQ7XG4gICAgICB2YXIgYSA9IHRoaXNbJ24nXTtcbiAgICAgIHZhciBiID0gdGhpc1snZCddO1xuICAgICAgdmFyIHJlcyA9IFtdO1xuXG4gICAgICBpZiAoaXNOYU4odGhpc1snbiddKSB8fCBpc05hTih0aGlzWydkJ10pKSB7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgICB9XG5cbiAgICAgIGRvIHtcbiAgICAgICAgcmVzLnB1c2goTWF0aC5mbG9vcihhIC8gYikpO1xuICAgICAgICB0ID0gYSAlIGI7XG4gICAgICAgIGEgPSBiO1xuICAgICAgICBiID0gdDtcbiAgICAgIH0gd2hpbGUgKGEgIT09IDEpO1xuXG4gICAgICByZXR1cm4gcmVzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGEgZnJhY3Rpb24gd2l0aCBhbGwgZGlnaXRzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiMTAwLic5MTgyMydcIikudG9TdHJpbmcoKSA9PiBcIjEwMC4oOTE4MjMpXCJcbiAgICAgKiovXG4gICAgJ3RvU3RyaW5nJzogZnVuY3Rpb24oZGVjKSB7XG5cbiAgICAgIHZhciBnO1xuICAgICAgdmFyIE4gPSB0aGlzW1wiblwiXTtcbiAgICAgIHZhciBEID0gdGhpc1tcImRcIl07XG5cbiAgICAgIGlmIChpc05hTihOKSB8fCBpc05hTihEKSkge1xuICAgICAgICByZXR1cm4gXCJOYU5cIjtcbiAgICAgIH1cblxuICAgICAgaWYgKCFGcmFjdGlvblsnUkVEVUNFJ10pIHtcbiAgICAgICAgZyA9IGdjZChOLCBEKTtcbiAgICAgICAgTiAvPSBnO1xuICAgICAgICBEIC89IGc7XG4gICAgICB9XG5cbiAgICAgIGRlYyA9IGRlYyB8fCAxNTsgLy8gMTUgPSBkZWNpbWFsIHBsYWNlcyB3aGVuIG5vIHJlcGl0YXRpb25cblxuICAgICAgdmFyIGN5Y0xlbiA9IGN5Y2xlTGVuKE4sIEQpOyAvLyBDeWNsZSBsZW5ndGhcbiAgICAgIHZhciBjeWNPZmYgPSBjeWNsZVN0YXJ0KE4sIEQsIGN5Y0xlbik7IC8vIEN5Y2xlIHN0YXJ0XG5cbiAgICAgIHZhciBzdHIgPSB0aGlzWydzJ10gPT09IC0xID8gXCItXCIgOiBcIlwiO1xuXG4gICAgICBzdHIgKz0gTiAvIEQgfCAwO1xuXG4gICAgICBOICU9IEQ7XG4gICAgICBOICo9IDEwO1xuXG4gICAgICBpZiAoTilcbiAgICAgICAgc3RyICs9IFwiLlwiO1xuXG4gICAgICBpZiAoY3ljTGVuKSB7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IGN5Y09mZjsgaS0tOyApIHtcbiAgICAgICAgICBzdHIgKz0gTiAvIEQgfCAwO1xuICAgICAgICAgIE4gJT0gRDtcbiAgICAgICAgICBOICo9IDEwO1xuICAgICAgICB9XG4gICAgICAgIHN0ciArPSBcIihcIjtcbiAgICAgICAgZm9yICh2YXIgaSA9IGN5Y0xlbjsgaS0tOyApIHtcbiAgICAgICAgICBzdHIgKz0gTiAvIEQgfCAwO1xuICAgICAgICAgIE4gJT0gRDtcbiAgICAgICAgICBOICo9IDEwO1xuICAgICAgICB9XG4gICAgICAgIHN0ciArPSBcIilcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGkgPSBkZWM7IE4gJiYgaS0tOyApIHtcbiAgICAgICAgICBzdHIgKz0gTiAvIEQgfCAwO1xuICAgICAgICAgIE4gJT0gRDtcbiAgICAgICAgICBOICo9IDEwO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgfTtcblxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZVtcImFtZFwiXSkge1xuICAgIGRlZmluZShbXSwgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gRnJhY3Rpb247XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsndmFsdWUnOiB0cnVlfSk7XG4gICAgRnJhY3Rpb25bJ2RlZmF1bHQnXSA9IEZyYWN0aW9uO1xuICAgIEZyYWN0aW9uWydGcmFjdGlvbiddID0gRnJhY3Rpb247XG4gICAgbW9kdWxlWydleHBvcnRzJ10gPSBGcmFjdGlvbjtcbiAgfSBlbHNlIHtcbiAgICByb290WydGcmFjdGlvbiddID0gRnJhY3Rpb247XG4gIH1cblxufSkodGhpcyk7XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBNb25vbWlhbCB7XG4gIGNvbnN0cnVjdG9yIChjLCB2cykge1xuICAgIGlmICghaXNOYU4oYykgJiYgdnMgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgIHRoaXMuYyA9IGNcbiAgICAgIHRoaXMudnMgPSB2c1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGMgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmluaXRTdHIoYylcbiAgICB9IGVsc2UgaWYgKCFpc05hTihjKSkge1xuICAgICAgdGhpcy5jID0gY1xuICAgICAgdGhpcy52cyA9IG5ldyBNYXAoKVxuICAgIH0gZWxzZSB7IC8vIGRlZmF1bHQgYXMgYSB0ZXN0OiA0eF4yeVxuICAgICAgdGhpcy5jID0gNFxuICAgICAgdGhpcy52cyA9IG5ldyBNYXAoW1sneCcsIDJdLCBbJ3knLCAxXV0pXG4gICAgfVxuICB9XG5cbiAgY2xvbmUgKCkge1xuICAgIGNvbnN0IHZzID0gbmV3IE1hcCh0aGlzLnZzKVxuICAgIHJldHVybiBuZXcgTW9ub21pYWwodGhpcy5jLCB2cylcbiAgfVxuXG4gIG11bCAodGhhdCkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgTW9ub21pYWwodGhhdClcbiAgICB9XG4gICAgY29uc3QgYyA9IHRoaXMuYyAqIHRoYXQuY1xuICAgIGxldCB2cyA9IG5ldyBNYXAoKVxuICAgIHRoaXMudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAodGhhdC52cy5oYXModmFyaWFibGUpKSB7XG4gICAgICAgIHZzLnNldCh2YXJpYWJsZSwgdGhpcy52cy5nZXQodmFyaWFibGUpICsgdGhhdC52cy5nZXQodmFyaWFibGUpKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdnMuc2V0KHZhcmlhYmxlLCB0aGlzLnZzLmdldCh2YXJpYWJsZSkpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoYXQudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAoIXZzLmhhcyh2YXJpYWJsZSkpIHtcbiAgICAgICAgdnMuc2V0KHZhcmlhYmxlLCB0aGF0LnZzLmdldCh2YXJpYWJsZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICB2cyA9IG5ldyBNYXAoWy4uLnZzLmVudHJpZXMoKV0uc29ydCgpKVxuICAgIHJldHVybiBuZXcgTW9ub21pYWwoYywgdnMpXG4gIH1cblxuICB0b0xhdGV4ICgpIHtcbiAgICBpZiAodGhpcy52cy5zaXplID09PSAwKSByZXR1cm4gdGhpcy5jLnRvU3RyaW5nKClcbiAgICBsZXQgc3RyID0gdGhpcy5jID09PSAxID8gJydcbiAgICAgIDogdGhpcy5jID09PSAtMSA/ICctJ1xuICAgICAgICA6IHRoaXMuYy50b1N0cmluZygpXG4gICAgdGhpcy52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmIChpbmRleCA9PT0gMSkge1xuICAgICAgICBzdHIgKz0gdmFyaWFibGVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciArPSB2YXJpYWJsZSArICdeJyArIGluZGV4XG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gc3RyXG4gIH1cblxuICBzb3J0ICgpIHtcbiAgICAvLyBzb3J0cyAobW9kaWZpZXMgb2JqZWN0KVxuICAgIHRoaXMudnMgPSBuZXcgTWFwKFsuLi50aGlzLnZzLmVudHJpZXMoKV0uc29ydCgpKVxuICB9XG5cbiAgY2xlYW5aZXJvcyAoKSB7XG4gICAgdGhpcy52cy5mb3JFYWNoKChpZHgsIHYpID0+IHtcbiAgICAgIGlmIChpZHggPT09IDApIHRoaXMudnMuZGVsZXRlKHYpXG4gICAgfSlcbiAgfVxuXG4gIGxpa2UgKHRoYXQpIHtcbiAgICAvLyByZXR1cm4gdHJ1ZSBpZiBsaWtlIHRlcm1zLCBmYWxzZSBpZiBvdGhlcndpc2VcbiAgICAvLyBub3QgdGhlIG1vc3QgZWZmaWNpZW50IGF0IHRoZSBtb21lbnQsIGJ1dCBnb29kIGVub3VnaC5cbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IE1vbm9taWFsKHRoYXQpXG4gICAgfVxuXG4gICAgbGV0IGxpa2UgPSB0cnVlXG4gICAgdGhpcy52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICghdGhhdC52cy5oYXModmFyaWFibGUpIHx8IHRoYXQudnMuZ2V0KHZhcmlhYmxlKSAhPT0gaW5kZXgpIHtcbiAgICAgICAgbGlrZSA9IGZhbHNlXG4gICAgICB9XG4gICAgfSlcbiAgICB0aGF0LnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKCF0aGlzLnZzLmhhcyh2YXJpYWJsZSkgfHwgdGhpcy52cy5nZXQodmFyaWFibGUpICE9PSBpbmRleCkge1xuICAgICAgICBsaWtlID0gZmFsc2VcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBsaWtlXG4gIH1cblxuICBhZGQgKHRoYXQsIGNoZWNrTGlrZSkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgTW9ub21pYWwodGhhdClcbiAgICB9XG4gICAgLy8gYWRkcyB0d28gY29tcGF0aWJsZSBtb25vbWlhbHNcbiAgICAvLyBjaGVja0xpa2UgKGRlZmF1bHQgdHJ1ZSkgd2lsbCBjaGVjayBmaXJzdCBpZiB0aGV5IGFyZSBsaWtlIGFuZCB0aHJvdyBhbiBleGNlcHRpb25cbiAgICAvLyB1bmRlZmluZWQgYmVoYXZpb3VyIGlmIGNoZWNrTGlrZSBpcyBmYWxzZVxuICAgIGlmIChjaGVja0xpa2UgPT09IHVuZGVmaW5lZCkgY2hlY2tMaWtlID0gdHJ1ZVxuICAgIGlmIChjaGVja0xpa2UgJiYgIXRoaXMubGlrZSh0aGF0KSkgdGhyb3cgbmV3IEVycm9yKCdBZGRpbmcgdW5saWtlIHRlcm1zJylcbiAgICBjb25zdCBjID0gdGhpcy5jICsgdGhhdC5jXG4gICAgY29uc3QgdnMgPSB0aGlzLnZzXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbChjLCB2cylcbiAgfVxuXG4gIGluaXRTdHIgKHN0cikge1xuICAgIC8vIGN1cnJlbnRseSBubyBlcnJvciBjaGVja2luZyBhbmQgZnJhZ2lsZVxuICAgIC8vIFRoaW5ncyBub3QgdG8gcGFzcyBpbjpcbiAgICAvLyAgemVybyBpbmRpY2VzXG4gICAgLy8gIG11bHRpLWNoYXJhY3RlciB2YXJpYWJsZXNcbiAgICAvLyAgbmVnYXRpdmUgaW5kaWNlc1xuICAgIC8vICBub24taW50ZWdlciBjb2VmZmljaWVudHNcbiAgICBjb25zdCBsZWFkID0gc3RyLm1hdGNoKC9eLT9cXGQqLylbMF1cbiAgICBjb25zdCBjID0gbGVhZCA9PT0gJycgPyAxXG4gICAgICA6IGxlYWQgPT09ICctJyA/IC0xXG4gICAgICAgIDogcGFyc2VJbnQobGVhZClcbiAgICBsZXQgdnMgPSBzdHIubWF0Y2goLyhbYS16QS1aXSkoXFxeXFxkKyk/L2cpXG4gICAgaWYgKCF2cykgdnMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHYgPSB2c1tpXS5zcGxpdCgnXicpXG4gICAgICB2WzFdID0gdlsxXSA/IHBhcnNlSW50KHZbMV0pIDogMVxuICAgICAgdnNbaV0gPSB2XG4gICAgfVxuICAgIHZzID0gdnMuZmlsdGVyKHYgPT4gdlsxXSAhPT0gMClcbiAgICB0aGlzLmMgPSBjXG4gICAgdGhpcy52cyA9IG5ldyBNYXAodnMpXG4gIH1cblxuICBzdGF0aWMgdmFyICh2KSB7XG4gICAgLy8gZmFjdG9yeSBmb3IgYSBzaW5nbGUgdmFyaWFibGUgbW9ub21pYWxcbiAgICBjb25zdCBjID0gMVxuICAgIGNvbnN0IHZzID0gbmV3IE1hcChbW3YsIDFdXSlcbiAgICByZXR1cm4gbmV3IE1vbm9taWFsKGMsIHZzKVxuICB9XG59XG4iLCJpbXBvcnQgTW9ub21pYWwgZnJvbSAnTW9ub21pYWwnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBvbHlub21pYWwge1xuICBjb25zdHJ1Y3RvciAodGVybXMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0ZXJtcykgJiYgKHRlcm1zWzBdIGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0ZXJtcy5tYXAodCA9PiB0LmNsb25lKCkpXG4gICAgICB0aGlzLnRlcm1zID0gdGVybXNcbiAgICB9IGVsc2UgaWYgKCFpc05hTih0ZXJtcykpIHtcbiAgICAgIHRoaXMuaW5pdE51bSh0ZXJtcylcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0ZXJtcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuaW5pdFN0cih0ZXJtcylcbiAgICB9XG4gIH1cblxuICBpbml0U3RyIChzdHIpIHtcbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvXFwrLS9nLCAnLScpIC8vIGEgaG9ycmlibGUgYm9kZ2VcbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvLS9nLCAnKy0nKSAvLyBtYWtlIG5lZ2F0aXZlIHRlcm1zIGV4cGxpY2l0LlxuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9cXHMvZywgJycpIC8vIHN0cmlwIHdoaXRlc3BhY2VcbiAgICB0aGlzLnRlcm1zID0gc3RyLnNwbGl0KCcrJylcbiAgICAgIC5tYXAocyA9PiBuZXcgTW9ub21pYWwocykpXG4gICAgICAuZmlsdGVyKHQgPT4gdC5jICE9PSAwKVxuICB9XG5cbiAgaW5pdE51bSAobikge1xuICAgIHRoaXMudGVybXMgPSBbbmV3IE1vbm9taWFsKG4pXVxuICB9XG5cbiAgdG9MYXRleCAoKSB7XG4gICAgbGV0IHN0ciA9ICcnXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRlcm1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoaSA+IDAgJiYgdGhpcy50ZXJtc1tpXS5jID49IDApIHtcbiAgICAgICAgc3RyICs9ICcrJ1xuICAgICAgfVxuICAgICAgc3RyICs9IHRoaXMudGVybXNbaV0udG9MYXRleCgpXG4gICAgfVxuICAgIHJldHVybiBzdHJcbiAgfVxuXG4gIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gdGhpcy50b0xhVGVYKClcbiAgfVxuXG4gIGNsb25lICgpIHtcbiAgICBjb25zdCB0ZXJtcyA9IHRoaXMudGVybXMubWFwKHQgPT4gdC5jbG9uZSgpKVxuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbCh0ZXJtcylcbiAgfVxuXG4gIHNpbXBsaWZ5ICgpIHtcbiAgICAvLyBjb2xsZWN0cyBsaWtlIHRlcm1zIGFuZCByZW1vdmVzIHplcm8gdGVybXNcbiAgICAvLyBkb2VzIG5vdCBtb2RpZnkgb3JpZ2luYWxcbiAgICAvLyBUaGlzIHNlZW1zIHByb2JhYmx5IGluZWZmaWNpZW50LCBnaXZlbiB0aGUgZGF0YSBzdHJ1Y3R1cmVcbiAgICAvLyBXb3VsZCBiZSBiZXR0ZXIgdG8gdXNlIHNvbWV0aGluZyBsaWtlIGEgbGlua2VkIGxpc3QgbWF5YmU/XG4gICAgY29uc3QgdGVybXMgPSB0aGlzLnRlcm1zLnNsaWNlKClcbiAgICBsZXQgbmV3dGVybXMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGVybXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghdGVybXNbaV0pIGNvbnRpbnVlXG4gICAgICBsZXQgbmV3dGVybSA9IHRlcm1zW2ldXG4gICAgICBmb3IgKGxldCBqID0gaSArIDE7IGogPCB0ZXJtcy5sZW5ndGg7IGorKykge1xuICAgICAgICBpZiAoIXRlcm1zW2pdKSBjb250aW51ZVxuICAgICAgICBpZiAodGVybXNbal0ubGlrZSh0ZXJtc1tpXSkpIHtcbiAgICAgICAgICBuZXd0ZXJtID0gbmV3dGVybS5hZGQodGVybXNbal0pXG4gICAgICAgICAgdGVybXNbal0gPSBudWxsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG5ld3Rlcm1zLnB1c2gobmV3dGVybSlcbiAgICAgIHRlcm1zW2ldID0gbnVsbFxuICAgIH1cbiAgICBuZXd0ZXJtcyA9IG5ld3Rlcm1zLmZpbHRlcih0ID0+IHQuYyAhPT0gMClcbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwobmV3dGVybXMpXG4gIH1cblxuICBhZGQgKHRoYXQsIHNpbXBsaWZ5KSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIFBvbHlub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IFBvbHlub21pYWwodGhhdClcbiAgICB9XG4gICAgaWYgKHNpbXBsaWZ5ID09PSB1bmRlZmluZWQpIHNpbXBsaWZ5ID0gdHJ1ZVxuICAgIGNvbnN0IHRlcm1zID0gdGhpcy50ZXJtcy5jb25jYXQodGhhdC50ZXJtcylcbiAgICBsZXQgcmVzdWx0ID0gbmV3IFBvbHlub21pYWwodGVybXMpXG5cbiAgICBpZiAoc2ltcGxpZnkpIHJlc3VsdCA9IHJlc3VsdC5zaW1wbGlmeSgpXG5cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICBtdWwgKHRoYXQsIHNpbXBsaWZ5KSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIFBvbHlub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IFBvbHlub21pYWwodGhhdClcbiAgICB9XG4gICAgY29uc3QgdGVybXMgPSBbXVxuICAgIGlmIChzaW1wbGlmeSA9PT0gdW5kZWZpbmVkKSBzaW1wbGlmeSA9IHRydWVcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGVybXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhhdC50ZXJtcy5sZW5ndGg7IGorKykge1xuICAgICAgICB0ZXJtcy5wdXNoKHRoaXMudGVybXNbaV0ubXVsKHRoYXQudGVybXNbal0pKVxuICAgICAgfVxuICAgIH1cblxuICAgIGxldCByZXN1bHQgPSBuZXcgUG9seW5vbWlhbCh0ZXJtcylcbiAgICBpZiAoc2ltcGxpZnkpIHJlc3VsdCA9IHJlc3VsdC5zaW1wbGlmeSgpXG5cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICBwb3cgKG4sIHNpbXBsaWZ5KSB7XG4gICAgbGV0IHJlc3VsdCA9IHRoaXNcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IG47IGkrKykge1xuICAgICAgcmVzdWx0ID0gcmVzdWx0Lm11bCh0aGlzKVxuICAgIH1cbiAgICBpZiAoc2ltcGxpZnkpIHJlc3VsdCA9IHJlc3VsdC5zaW1wbGlmeSgpXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG5cbiAgc3RhdGljIHZhciAodikge1xuICAgIC8vIGZhY3RvcnkgZm9yIGEgc2luZ2xlIHZhcmlhYmxlIHBvbHlub21pYWxcbiAgICBjb25zdCB0ZXJtcyA9IFtNb25vbWlhbC52YXIodildXG4gICAgcmV0dXJuIG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuICB9XG5cbiAgc3RhdGljIHggKCkge1xuICAgIHJldHVybiBQb2x5bm9taWFsLnZhcigneCcpXG4gIH1cblxuICBzdGF0aWMgY29uc3QgKG4pIHtcbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwobilcbiAgfVxufVxuIiwiaW1wb3J0IHsgR3JhcGhpY1EsIEdyYXBoaWNRVmlldyB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IEZyYWN0aW9uIGZyb20gJ2ZyYWN0aW9uLmpzJ1xuaW1wb3J0IFBvbHlub21pYWwgZnJvbSAnUG9seW5vbWlhbCdcbmltcG9ydCB7IHJhbmRFbGVtLCByYW5kQmV0d2VlbiwgcmFuZEJldHdlZW5GaWx0ZXIsIGdjZCB9IGZyb20gJ3V0aWxpdGllcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXJpdGhtYWdvblEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgY29uc3QgZGF0YSA9IG5ldyBBcml0aG1hZ29uUURhdGEob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IEFyaXRobWFnb25RVmlldyhkYXRhLCBvcHRpb25zKVxuICAgIHN1cGVyKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHsgcmV0dXJuICdDb21wbGV0ZSB0aGUgYXJpdGhtYWdvbjonIH1cbn1cblxuQXJpdGhtYWdvblEub3B0aW9uc1NwZWMgPSBbXG4gIHtcbiAgICB0aXRsZTogJ1ZlcnRpY2VzJyxcbiAgICBpZDogJ24nLFxuICAgIHR5cGU6ICdpbnQnLFxuICAgIG1pbjogMyxcbiAgICBtYXg6IDIwLFxuICAgIGRlZmF1bHQ6IDNcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVHlwZScsXG4gICAgaWQ6ICd0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ0ludGVnZXIgKCspJywgaWQ6ICdpbnRlZ2VyLWFkZCcgfSxcbiAgICAgIHsgdGl0bGU6ICdJbnRlZ2VyIChcXHUwMGQ3KScsIGlkOiAnaW50ZWdlci1tdWx0aXBseScgfSxcbiAgICAgIHsgdGl0bGU6ICdGcmFjdGlvbiAoKyknLCBpZDogJ2ZyYWN0aW9uLWFkZCcgfSxcbiAgICAgIHsgdGl0bGU6ICdGcmFjdGlvbiAoXFx1MDBkNyknLCBpZDogJ2ZyYWN0aW9uLW11bHRpcGx5JyB9LFxuICAgICAgeyB0aXRsZTogJ0FsZ2VicmEgKCspJywgaWQ6ICdhbGdlYnJhLWFkZCcgfSxcbiAgICAgIHsgdGl0bGU6ICdBbGdlYnJhIChcXHUwMGQ3KScsIGlkOiAnYWxnZWJyYS1tdWx0aXBseScgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogJ2ludGVnZXItYWRkJyxcbiAgICB2ZXJ0aWNhbDogdHJ1ZVxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdQdXp6bGUgdHlwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1leGNsdXNpdmUnLFxuICAgIGlkOiAncHV6X2RpZmYnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdNaXNzaW5nIGVkZ2VzJywgaWQ6ICcxJyB9LFxuICAgICAgeyB0aXRsZTogJ01peGVkJywgaWQ6ICcyJyB9LFxuICAgICAgeyB0aXRsZTogJ01pc3NpbmcgdmVydGljZXMnLCBpZDogJzMnIH1cbiAgICBdLFxuICAgIGRlZmF1bHQ6ICcxJ1xuICB9XG5dXG5cbmNsYXNzIEFyaXRobWFnb25RRGF0YSAvKiBleHRlbmRzIEdyYXBoaWNRRGF0YSAqLyB7XG4gIC8vIFRPRE8gc2ltcGxpZnkgY29uc3RydWN0b3IuIE1vdmUgbG9naWMgaW50byBzdGF0aWMgZmFjdG9yeSBtZXRob2RzXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgLy8gMS4gU2V0IHByb3BlcnRpZXMgZnJvbSBvcHRpb25zXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBuOiAzLCAvLyBudW1iZXIgb2YgdmVydGljZXNcbiAgICAgIG1pbjogLTIwLFxuICAgICAgbWF4OiAyMCxcbiAgICAgIG51bV9kaWZmOiAxLCAvLyBjb21wbGV4aXR5IG9mIHdoYXQncyBpbiB2ZXJ0aWNlcy9lZGdlc1xuICAgICAgcHV6X2RpZmY6IDEsIC8vIDEgLSBWZXJ0aWNlcyBnaXZlbiwgMiAtIHZlcnRpY2VzL2VkZ2VzOyBnaXZlbiAzIC0gb25seSBlZGdlc1xuICAgICAgdHlwZTogJ2ludGVnZXItYWRkJyAvLyBbdHlwZV0tW29wZXJhdGlvbl0gd2hlcmUgW3R5cGVdID0gaW50ZWdlciwgLi4uXG4gICAgICAvLyBhbmQgW29wZXJhdGlvbl0gPSBhZGQvbXVsdGlwbHlcbiAgICB9XG5cbiAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIHRoaXMuc2V0dGluZ3MsIG9wdGlvbnMpXG4gICAgdGhpcy5zZXR0aW5ncy5udW1fZGlmZiA9IHRoaXMuc2V0dGluZ3MuZGlmZmljdWx0eVxuICAgIHRoaXMuc2V0dGluZ3MucHV6X2RpZmYgPSBwYXJzZUludCh0aGlzLnNldHRpbmdzLnB1el9kaWZmKSAvLyEgPyBUaGlzIHNob3VsZCBoYXZlIGJlZW4gZG9uZSB1cHN0cmVhbS4uLlxuXG4gICAgdGhpcy5uID0gdGhpcy5zZXR0aW5ncy5uXG4gICAgdGhpcy52ZXJ0aWNlcyA9IFtdXG4gICAgdGhpcy5zaWRlcyA9IFtdXG5cbiAgICBpZiAodGhpcy5zZXR0aW5ncy50eXBlLmVuZHNXaXRoKCdhZGQnKSkge1xuICAgICAgdGhpcy5vcG5hbWUgPSAnKydcbiAgICAgIHRoaXMub3AgPSAoeCwgeSkgPT4geC5hZGQoeSlcbiAgICB9IGVsc2UgaWYgKHRoaXMuc2V0dGluZ3MudHlwZS5lbmRzV2l0aCgnbXVsdGlwbHknKSkge1xuICAgICAgdGhpcy5vcG5hbWUgPSAnXFx1MDBkNydcbiAgICAgIHRoaXMub3AgPSAoeCwgeSkgPT4geC5tdWwoeSlcbiAgICB9XG5cbiAgICAvLyAyLiBJbml0aWFsaXNlIGJhc2VkIG9uIHR5cGVcbiAgICBzd2l0Y2ggKHRoaXMuc2V0dGluZ3MudHlwZSkge1xuICAgICAgY2FzZSAnaW50ZWdlci1hZGQnOlxuICAgICAgY2FzZSAnaW50ZWdlci1tdWx0aXBseSc6XG4gICAgICAgIHRoaXMuaW5pdEludGVnZXIodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2ZyYWN0aW9uLWFkZCc6XG4gICAgICAgIHRoaXMuaW5pdEZyYWN0aW9uQWRkKHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdmcmFjdGlvbi1tdWx0aXBseSc6XG4gICAgICAgIHRoaXMuaW5pdEZyYWN0aW9uTXVsdGlwbHkodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2FsZ2VicmEtYWRkJzpcbiAgICAgICAgdGhpcy5pbml0QWxnZWJyYUFkZCh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnYWxnZWJyYS1tdWx0aXBseSc6XG4gICAgICAgIHRoaXMuaW5pdEFsZ2VicmFNdWx0aXBseSh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdGVkIHN3aXRjaCBkZWZhdWx0JylcbiAgICB9XG5cbiAgICB0aGlzLmNhbGN1bGF0ZUVkZ2VzKCkgLy8gVXNlIG9wIGZ1bmN0aW9ucyB0byBmaWxsIGluIHRoZSBlZGdlc1xuICAgIHRoaXMuaGlkZUxhYmVscyh0aGlzLnNldHRpbmdzLnB1el9kaWZmKSAvLyBzZXQgc29tZSB2ZXJ0aWNlcy9lZGdlcyBhcyBoaWRkZW4gZGVwZW5kaW5nIG9uIGRpZmZpY3VsdHlcbiAgfVxuXG4gIC8qIE1ldGhvZHMgaW5pdGlhbGlzaW5nIHZlcnRpY2VzICovXG5cbiAgaW5pdEludGVnZXIgKHNldHRpbmdzKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24ocmFuZEJldHdlZW5GaWx0ZXIoXG4gICAgICAgICAgc2V0dGluZ3MubWluLFxuICAgICAgICAgIHNldHRpbmdzLm1heCxcbiAgICAgICAgICB4ID0+IChzZXR0aW5ncy50eXBlLmVuZHNXaXRoKCdhZGQnKSB8fCB4ICE9PSAwKVxuICAgICAgICApKSxcbiAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRGcmFjdGlvbkFkZCAoc2V0dGluZ3MpIHtcbiAgICAvKiBEaWZmaWN1bHR5IHNldHRpbmdzOlxuICAgICAqIDE6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBzYW1lIGRlbm9taW5hdG9yLCBubyBjYW5jZWxsaW5nIGFmdGVyIERPTkVcbiAgICAgKiAyOiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggc2FtZSBkZW5vbWluYXRvciwgbm8gY2FuY2VsbGxpbmcgYW5zd2VyIGltcHJvcGVyIGZyYWN0aW9uXG4gICAgICogMzogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIG9uZSBkZW5vbWluYXRvciBhIG11bHRpcGxlIG9mIGFub3RoZXIsIGdpdmVzIHByb3BlciBmcmFjdGlvblxuICAgICAqIDQ6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBvbmUgZGVub21pbmF0b3IgYSBtdWx0aXBsZSBvZiBhbm90aGVyLCBnaXZlcyBpbXByb3BlciBmcmFjdGlvblxuICAgICAqIDU6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBkaWZmZXJlbnQgZGVub21pbmF0b3JzIChub3QgY28tcHJpbWUpLCBnaXZlcyBpbXByb3BlciBmcmFjdGlvblxuICAgICAqIDY6IG1peGVkIG51bWJlcnNcbiAgICAgKiA3OiBtaXhlZCBudW1iZXJzLCBiaWdnZXIgbnVtZXJhdG9ycyBhbmQgZGVub21pbmF0b3JzXG4gICAgICogODogbWl4ZWQgbnVtYmVycywgYmlnIGludGVnZXIgcGFydHNcbiAgICAgKi9cblxuICAgIC8vIFRPRE8gLSBhbnl0aGluZyBvdGhlciB0aGFuIGRpZmZpY3VsdHkgMS5cbiAgICBjb25zdCBkaWZmID0gc2V0dGluZ3MubnVtX2RpZmZcbiAgICBpZiAoZGlmZiA8IDMpIHtcbiAgICAgIGNvbnN0IGRlbiA9IHJhbmRFbGVtKFs1LCA3LCA5LCAxMSwgMTMsIDE3XSlcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgY29uc3QgcHJldm51bSA9IHRoaXMudmVydGljZXNbaSAtIDFdXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzW2kgLSAxXS52YWwubiA6IHVuZGVmaW5lZFxuICAgICAgICBjb25zdCBuZXh0bnVtID0gdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXVxuICAgICAgICAgID8gdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXS52YWwubiA6IHVuZGVmaW5lZFxuXG4gICAgICAgIGNvbnN0IG1heG51bSA9XG4gICAgICAgICAgZGlmZiA9PT0gMiA/IGRlbiAtIDFcbiAgICAgICAgICAgIDogbmV4dG51bSA/IGRlbiAtIE1hdGgubWF4KG5leHRudW0sIHByZXZudW0pXG4gICAgICAgICAgICAgIDogcHJldm51bSA/IGRlbiAtIHByZXZudW1cbiAgICAgICAgICAgICAgICA6IGRlbiAtIDFcblxuICAgICAgICBjb25zdCBudW0gPSByYW5kQmV0d2VlbkZpbHRlcigxLCBtYXhudW0sIHggPT4gKFxuICAgICAgICAgIC8vIEVuc3VyZXMgbm8gc2ltcGxpZmluZyBhZnRlcndhcmRzIGlmIGRpZmZpY3VsdHkgaXMgMVxuICAgICAgICAgIGdjZCh4LCBkZW4pID09PSAxICYmXG4gICAgICAgICAgKCFwcmV2bnVtIHx8IGdjZCh4ICsgcHJldm51bSwgZGVuKSA9PT0gMSB8fCB4ICsgcHJldm51bSA9PT0gZGVuKSAmJlxuICAgICAgICAgICghbmV4dG51bSB8fCBnY2QoeCArIG5leHRudW0sIGRlbikgPT09IDEgfHwgeCArIG5leHRudW0gPT09IGRlbilcbiAgICAgICAgKSlcblxuICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgIHZhbDogbmV3IEZyYWN0aW9uKG51bSwgZGVuKSxcbiAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZGVuYmFzZSA9IHJhbmRFbGVtKFxuICAgICAgICBkaWZmIDwgNyA/IFsyLCAzLCA1XSA6IFsyLCAzLCA0LCA1LCA2LCA3LCA4LCA5LCAxMCwgMTFdXG4gICAgICApXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHByZXYgPSB0aGlzLnZlcnRpY2VzW2kgLSAxXVxuICAgICAgICAgID8gdGhpcy52ZXJ0aWNlc1tpIC0gMV0udmFsIDogdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dLnZhbCA6IHVuZGVmaW5lZFxuXG4gICAgICAgIGNvbnN0IG1heG11bHRpcGxpZXIgPSBkaWZmIDwgNyA/IDQgOiA4XG5cbiAgICAgICAgY29uc3QgbXVsdGlwbGllciA9XG4gICAgICAgICAgaSAlIDIgPT09IDEgfHwgZGlmZiA+IDQgPyByYW5kQmV0d2VlbkZpbHRlcigyLCBtYXhtdWx0aXBsaWVyLCB4ID0+XG4gICAgICAgICAgICAoIXByZXYgfHwgeCAhPT0gcHJldi5kIC8gZGVuYmFzZSkgJiZcbiAgICAgICAgICAgICghbmV4dCB8fCB4ICE9PSBuZXh0LmQgLyBkZW5iYXNlKVxuICAgICAgICAgICkgOiAxXG5cbiAgICAgICAgY29uc3QgZGVuID0gZGVuYmFzZSAqIG11bHRpcGxpZXJcblxuICAgICAgICBsZXQgbnVtXG4gICAgICAgIGlmIChkaWZmIDwgNikge1xuICAgICAgICAgIG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKDEsIGRlbiAtIDEsIHggPT4gKFxuICAgICAgICAgICAgZ2NkKHgsIGRlbikgPT09IDEgJiZcbiAgICAgICAgICAgIChkaWZmID49IDQgfHwgIXByZXYgfHwgcHJldi5hZGQoeCwgZGVuKSA8PSAxKSAmJlxuICAgICAgICAgICAgKGRpZmYgPj0gNCB8fCAhbmV4dCB8fCBuZXh0LmFkZCh4LCBkZW4pIDw9IDEpXG4gICAgICAgICAgKSlcbiAgICAgICAgfSBlbHNlIGlmIChkaWZmIDwgOCkge1xuICAgICAgICAgIG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKGRlbiArIDEsIGRlbiAqIDYsIHggPT4gZ2NkKHgsIGRlbikgPT09IDEpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoZGVuICogMTAsIGRlbiAqIDEwMCwgeCA9PiBnY2QoeCwgZGVuKSA9PT0gMSlcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24obnVtLCBkZW4pLFxuICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRGcmFjdGlvbk11bHRpcGx5IChzZXR0aW5ncykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIGNvbnN0IGQgPSByYW5kQmV0d2VlbigyLCAxMClcbiAgICAgIGNvbnN0IG4gPSByYW5kQmV0d2VlbigxLCBkIC0gMSlcbiAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgIHZhbDogbmV3IEZyYWN0aW9uKG4sIGQpLFxuICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEFsZ2VicmFBZGQgKHNldHRpbmdzKSB7XG4gICAgY29uc3QgZGlmZiA9IHNldHRpbmdzLm51bV9kaWZmXG4gICAgc3dpdGNoIChkaWZmKSB7XG4gICAgICBjYXNlIDE6IHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmICsgdmFyaWFibGUpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOlxuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSA8IDAuNSkgeyAvLyB2YXJpYWJsZSArIGNvbnN0YW50XG4gICAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IGNvbnN0YW50ID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2YXJpYWJsZSArICcrJyArIGNvbnN0YW50KSxcbiAgICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZTEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICAgIGxldCB2YXJpYWJsZTIgPSB2YXJpYWJsZTFcbiAgICAgICAgICB3aGlsZSAodmFyaWFibGUyID09PSB2YXJpYWJsZTEpIHtcbiAgICAgICAgICAgIHZhcmlhYmxlMiA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgICAgY29uc3QgY29lZmYxID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IGNvZWZmMiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmMSArIHZhcmlhYmxlMSArICcrJyArIGNvZWZmMiArIHZhcmlhYmxlMiksXG4gICAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0QWxnZWJyYU11bHRpcGx5IChzZXR0aW5ncykge1xuICAgIC8qIERpZmZpY3VsdHk6XG4gICAgICogMTogQWx0ZXJuYXRlIDNhIHdpdGggNFxuICAgICAqIDI6IEFsbCB0ZXJtcyBvZiB0aGUgZm9ybSBudiAtIHVwIHRvIHR3byB2YXJpYWJsZXNcbiAgICAgKiAzOiBBbGwgdGVybXMgb2YgdGhlIGZvcm0gbnZebS4gT25lIHZhcmlhYmxlIG9ubHlcbiAgICAgKiA0OiBBTGwgdGVybXMgb2YgdGhlIGZvcm0gbnheayB5Xmwgel5wLiBrLGwscCAwLTNcbiAgICAgKiA1OiBFeHBhbmQgYnJhY2tldHMgMygyeCs1KVxuICAgICAqIDY6IEV4cGFuZCBicmFja2V0cyAzeCgyeCs1KVxuICAgICAqIDc6IEV4cGFuZCBicmFja2V0cyAzeF4yeSgyeHkrNXleMilcbiAgICAgKiA4OiBFeHBhbmQgYnJhY2tldHMgKHgrMykoeCsyKVxuICAgICAqIDk6IEV4cGFuZCBicmFja2V0cyAoMngtMykoM3grNClcbiAgICAgKiAxMDogRXhwYW5kIGJyYWNrZXRzICgyeF4yLTN4KzQpKDJ4LTUpXG4gICAgICovXG4gICAgY29uc3QgZGlmZiA9IHNldHRpbmdzLm51bV9kaWZmXG4gICAgc3dpdGNoIChkaWZmKSB7XG4gICAgICBjYXNlIDE6XG4gICAgICB7XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCB0ZXJtID0gaSAlIDIgPT09IDAgPyBjb2VmZiA6IGNvZWZmICsgdmFyaWFibGVcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh0ZXJtKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSAyOiB7XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlMSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGNvbnN0IHZhcmlhYmxlMiA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgdmFyaWFibGUgPSByYW5kRWxlbShbdmFyaWFibGUxLCB2YXJpYWJsZTJdKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmICsgdmFyaWFibGUpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDM6IHtcbiAgICAgICAgY29uc3QgdiA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgaWR4ID0gcmFuZEJldHdlZW4oMSwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmICsgdiArICdeJyArIGlkeCksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgNDoge1xuICAgICAgICBjb25zdCBzdGFydEFzY2lpID0gcmFuZEJldHdlZW4oOTcsIDEyMClcbiAgICAgICAgY29uc3QgdjEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkpXG4gICAgICAgIGNvbnN0IHYyID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpICsgMSlcbiAgICAgICAgY29uc3QgdjMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkgKyAyKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjEgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjIgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjMgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgdGVybSA9IGEgKyB2MSArIG4xICsgdjIgKyBuMiArIHYzICsgbjNcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh0ZXJtKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSA1OlxuICAgICAgY2FzZSA2OiB7IC8vIGUuZy4gMyh4KSAqICgyeC01KVxuICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgY29uc3RhbnQgPSByYW5kQmV0d2VlbigtOSwgOSkudG9TdHJpbmcoKVxuICAgICAgICAgIGxldCB0ZXJtID0gY29lZmZcbiAgICAgICAgICBpZiAoZGlmZiA9PT0gNiB8fCBpICUgMiA9PT0gMSkgdGVybSArPSB2YXJpYWJsZVxuICAgICAgICAgIGlmIChpICUgMiA9PT0gMSkgdGVybSArPSAnKycgKyBjb25zdGFudFxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDc6IHsgLy8gZS5nLiAzeF4yeSg0eHleMis1eHkpXG4gICAgICAgIGNvbnN0IHN0YXJ0QXNjaWkgPSByYW5kQmV0d2Vlbig5NywgMTIwKVxuICAgICAgICBjb25zdCB2MSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSlcbiAgICAgICAgY29uc3QgdjIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkgKyAxKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgYTEgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4xMSA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMTIgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgbGV0IHRlcm0gPSBhMSArIHYxICsgbjExICsgdjIgKyBuMTJcbiAgICAgICAgICBpZiAoaSAlIDIgPT09IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGEyID0gcmFuZEJldHdlZW4oLTksIDkpLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IG4yMSA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IG4yMiA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICAgIHRlcm0gKz0gJysnICsgYTIgKyB2MSArIG4yMSArIHYyICsgbjIyXG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDg6IC8vIHsgZS5nLiAoeCs1KSAqICh4LTIpXG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvbnN0YW50ID0gcmFuZEJldHdlZW4oLTksIDkpLnRvU3RyaW5nKClcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh2YXJpYWJsZSArICcrJyArIGNvbnN0YW50KSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiBNZXRob2QgdG8gY2FsY3VsYXRlIGVkZ2VzIGZyb20gdmVydGljZXMgKi9cbiAgY2FsY3VsYXRlRWRnZXMgKCkge1xuICAgIC8vIENhbGN1bGF0ZSB0aGUgZWRnZXMgZ2l2ZW4gdGhlIHZlcnRpY2VzIHVzaW5nIHRoaXMub3BcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICB0aGlzLnNpZGVzW2ldID0ge1xuICAgICAgICB2YWw6IHRoaXMub3AodGhpcy52ZXJ0aWNlc1tpXS52YWwsIHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl0udmFsKSxcbiAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qIE1hcmsgaGlkZGVuZCBlZGdlcy92ZXJ0aWNlcyAqL1xuXG4gIGhpZGVMYWJlbHMgKHB1enpsZURpZmZpY3VsdHkpIHtcbiAgICAvLyBIaWRlIHNvbWUgbGFiZWxzIHRvIG1ha2UgYSBwdXp6bGVcbiAgICAvLyAxIC0gU2lkZXMgaGlkZGVuLCB2ZXJ0aWNlcyBzaG93blxuICAgIC8vIDIgLSBTb21lIHNpZGVzIGhpZGRlbiwgc29tZSB2ZXJ0aWNlcyBoaWRkZW5cbiAgICAvLyAzIC0gQWxsIHZlcnRpY2VzIGhpZGRlblxuICAgIHN3aXRjaCAocHV6emxlRGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICB0aGlzLnNpZGVzLmZvckVhY2goeCA9PiB7IHguaGlkZGVuID0gdHJ1ZSB9KVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOiB7XG4gICAgICAgIHRoaXMuc2lkZXMuZm9yRWFjaCh4ID0+IHsgeC5oaWRkZW4gPSB0cnVlIH0pXG4gICAgICAgIGNvbnN0IHNob3dzaWRlID0gcmFuZEJldHdlZW4oMCwgdGhpcy5uIC0gMSwgTWF0aC5yYW5kb20pXG4gICAgICAgIGNvbnN0IGhpZGV2ZXJ0ID0gTWF0aC5yYW5kb20oKSA8IDAuNVxuICAgICAgICAgID8gc2hvd3NpZGUgLy8gcHJldmlvdXMgdmVydGV4XG4gICAgICAgICAgOiAoc2hvd3NpZGUgKyAxKSAlIHRoaXMubiAvLyBuZXh0IHZlcnRleDtcblxuICAgICAgICB0aGlzLnNpZGVzW3Nob3dzaWRlXS5oaWRkZW4gPSBmYWxzZVxuICAgICAgICB0aGlzLnZlcnRpY2VzW2hpZGV2ZXJ0XS5oaWRkZW4gPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlIDM6XG4gICAgICAgIHRoaXMudmVydGljZXMuZm9yRWFjaCh4ID0+IHsgeC5oaWRkZW4gPSB0cnVlIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vX2RpZmZpY3VsdHknKVxuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBBcml0aG1hZ29uUVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICBjb25zdHJ1Y3RvciAoZGF0YSwgb3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIHNldHMgdGhpcy53aWR0aCB0aGlzLmhlaWdodCwgaW5pdGlhbGlzZXMgdGhpcy5sYWJlbHMsIGNyZWF0ZXMgZG9tIGVsZW1lbnRzXG5cbiAgICBjb25zdCB3aWR0aCA9IHRoaXMud2lkdGhcbiAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmhlaWdodFxuICAgIGNvbnN0IHIgPSAwLjM1ICogTWF0aC5taW4od2lkdGgsIGhlaWdodCkgLy8gcmFkaXVzXG4gICAgY29uc3QgbiA9IHRoaXMuZGF0YS5uXG5cbiAgICAvLyBBIHBvaW50IHRvIGxhYmVsIHdpdGggdGhlIG9wZXJhdGlvblxuICAgIC8vIEFsbCBwb2ludHMgZmlyc3Qgc2V0IHVwIHdpdGggKDAsMCkgYXQgY2VudGVyXG4gICAgdGhpcy5vcGVyYXRpb25Qb2ludCA9IG5ldyBQb2ludCgwLCAwKVxuXG4gICAgLy8gUG9zaXRpb24gb2YgdmVydGljZXNcbiAgICB0aGlzLnZlcnRleFBvaW50cyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIGNvbnN0IGFuZ2xlID0gaSAqIE1hdGguUEkgKiAyIC8gbiAtIE1hdGguUEkgLyAyXG4gICAgICB0aGlzLnZlcnRleFBvaW50c1tpXSA9IFBvaW50LmZyb21Qb2xhcihyLCBhbmdsZSlcbiAgICB9XG5cbiAgICAvLyBQb2lzaXRpb24gb2Ygc2lkZSBsYWJlbHNcbiAgICB0aGlzLnNpZGVQb2ludHMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICB0aGlzLnNpZGVQb2ludHNbaV0gPSBQb2ludC5tZWFuKHRoaXMudmVydGV4UG9pbnRzW2ldLCB0aGlzLnZlcnRleFBvaW50c1soaSArIDEpICUgbl0pXG4gICAgfVxuXG4gICAgdGhpcy5hbGxQb2ludHMgPSBbdGhpcy5vcGVyYXRpb25Qb2ludF0uY29uY2F0KHRoaXMudmVydGV4UG9pbnRzKS5jb25jYXQodGhpcy5zaWRlUG9pbnRzKVxuXG4gICAgdGhpcy5yZUNlbnRlcigpIC8vIFJlcG9zaXRpb24gZXZlcnl0aGluZyBwcm9wZXJseVxuXG4gICAgdGhpcy5tYWtlTGFiZWxzKHRydWUpXG5cbiAgICAvLyBEcmF3IGludG8gY2FudmFzXG4gIH1cblxuICByZUNlbnRlciAoKSB7XG4gICAgLy8gRmluZCB0aGUgY2VudGVyIG9mIHRoZSBib3VuZGluZyBib3hcbiAgICBjb25zdCB0b3BsZWZ0ID0gUG9pbnQubWluKHRoaXMuYWxsUG9pbnRzKVxuICAgIGNvbnN0IGJvdHRvbXJpZ2h0ID0gUG9pbnQubWF4KHRoaXMuYWxsUG9pbnRzKVxuICAgIGNvbnN0IGNlbnRlciA9IFBvaW50Lm1lYW4odG9wbGVmdCwgYm90dG9tcmlnaHQpXG5cbiAgICAvLyB0cmFuc2xhdGUgdG8gcHV0IGluIHRoZSBjZW50ZXJcbiAgICB0aGlzLmFsbFBvaW50cy5mb3JFYWNoKHAgPT4ge1xuICAgICAgcC50cmFuc2xhdGUodGhpcy53aWR0aCAvIDIgLSBjZW50ZXIueCwgdGhpcy5oZWlnaHQgLyAyIC0gY2VudGVyLnkpXG4gICAgfSlcbiAgfVxuXG4gIG1ha2VMYWJlbHMgKCkge1xuICAgIC8vIHZlcnRpY2VzXG4gICAgdGhpcy5kYXRhLnZlcnRpY2VzLmZvckVhY2goKHYsIGkpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gdi52YWwudG9MYXRleFxuICAgICAgICA/IHYudmFsLnRvTGF0ZXgodHJ1ZSlcbiAgICAgICAgOiB2LnZhbC50b1N0cmluZygpXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKHtcbiAgICAgICAgcG9zOiB0aGlzLnZlcnRleFBvaW50c1tpXSxcbiAgICAgICAgdGV4dHE6IHYuaGlkZGVuID8gJycgOiB2YWx1ZSxcbiAgICAgICAgdGV4dGE6IHZhbHVlLFxuICAgICAgICBzdHlsZXE6ICdub3JtYWwgdmVydGV4JyxcbiAgICAgICAgc3R5bGVhOiB2LmhpZGRlbiA/ICdhbnN3ZXIgdmVydGV4JyA6ICdub3JtYWwgdmVydGV4J1xuICAgICAgfSlcbiAgICB9KVxuXG4gICAgLy8gc2lkZXNcbiAgICB0aGlzLmRhdGEuc2lkZXMuZm9yRWFjaCgodiwgaSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSB2LnZhbC50b0xhdGV4XG4gICAgICAgID8gdi52YWwudG9MYXRleCh0cnVlKVxuICAgICAgICA6IHYudmFsLnRvU3RyaW5nKClcbiAgICAgIHRoaXMubGFiZWxzLnB1c2goe1xuICAgICAgICBwb3M6IHRoaXMuc2lkZVBvaW50c1tpXSxcbiAgICAgICAgdGV4dHE6IHYuaGlkZGVuID8gJycgOiB2YWx1ZSxcbiAgICAgICAgdGV4dGE6IHZhbHVlLFxuICAgICAgICBzdHlsZXE6ICdub3JtYWwgc2lkZScsXG4gICAgICAgIHN0eWxlYTogdi5oaWRkZW4gPyAnYW5zd2VyIHNpZGUnIDogJ25vcm1hbCBzaWRlJ1xuICAgICAgfSlcbiAgICB9KVxuXG4gICAgLy8gb3BlcmF0aW9uXG4gICAgdGhpcy5sYWJlbHMucHVzaCh7XG4gICAgICBwb3M6IHRoaXMub3BlcmF0aW9uUG9pbnQsXG4gICAgICB0ZXh0cTogdGhpcy5kYXRhLm9wbmFtZSxcbiAgICAgIHRleHRhOiB0aGlzLmRhdGEub3BuYW1lLFxuICAgICAgc3R5bGVxOiAnbm9ybWFsJyxcbiAgICAgIHN0eWxlYTogJ25vcm1hbCdcbiAgICB9KVxuXG4gICAgLy8gc3R5bGluZ1xuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRxXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZXFcbiAgICB9KVxuICB9XG5cbiAgcmVuZGVyICgpIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG4gICAgY29uc3QgbiA9IHRoaXMuZGF0YS5uXG5cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpIC8vIGNsZWFyXG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgY29uc3QgcCA9IHRoaXMudmVydGV4UG9pbnRzW2ldXG4gICAgICBjb25zdCBuZXh0ID0gdGhpcy52ZXJ0ZXhQb2ludHNbKGkgKyAxKSAlIG5dXG4gICAgICBjdHgubW92ZVRvKHAueCwgcC55KVxuICAgICAgY3R4LmxpbmVUbyhuZXh0LngsIG5leHQueSlcbiAgICB9XG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICAvLyBwbGFjZSBsYWJlbHNcbiAgICB0aGlzLnJlbmRlckxhYmVscyh0cnVlKVxuICB9XG5cbiAgc2hvd0Fuc3dlciAoKSB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dGFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlYVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHModHJ1ZSlcbiAgICB0aGlzLmFuc3dlcmVkID0gdHJ1ZVxuICB9XG5cbiAgaGlkZUFuc3dlciAoKSB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHModHJ1ZSlcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxufVxuIiwiaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tICd1dGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRlc3RRIGV4dGVuZHMgVGV4dFEge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDUsXG4gICAgICBsYWJlbDogJ2EnLFxuICAgICAgdGVzdDE6IFsnZm9vJ10sXG4gICAgICB0ZXN0MjogdHJ1ZVxuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyBwaWNrIGEgcmFuZG9tIG9uZSBvZiB0aGUgc2VsZWN0ZWRcbiAgICBsZXQgdGVzdDFcbiAgICBpZiAoc2V0dGluZ3MudGVzdDEubGVuZ3RoID09PSAwKSB7XG4gICAgICB0ZXN0MSA9ICdub25lJ1xuICAgIH0gZWxzZSB7XG4gICAgICB0ZXN0MSA9IHJhbmRFbGVtKHNldHRpbmdzLnRlc3QxKVxuICAgIH1cblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICdkOiAnICsgc2V0dGluZ3MuZGlmZmljdWx0eSArICdcXFxcXFxcXCB0ZXN0MTogJyArIHRlc3QxXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICd0ZXN0MjogJyArIHNldHRpbmdzLnRlc3QyXG5cbiAgICB0aGlzLnJlbmRlcigpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHsgcmV0dXJuICdUZXN0IGNvbW1hbmQgd29yZCcgfVxufVxuXG5UZXN0US5vcHRpb25zU3BlYyA9IFtcbiAge1xuICAgIHRpdGxlOiAnVGVzdCBvcHRpb24gMScsXG4gICAgaWQ6ICd0ZXN0MScsXG4gICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFsnZm9vJywgJ2JhcicsICd3aXp6J10sXG4gICAgZGVmYXVsdDogW11cbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVGVzdCBvcHRpb24gMicsXG4gICAgaWQ6ICd0ZXN0MicsXG4gICAgdHlwZTogJ2Jvb2wnLFxuICAgIGRlZmF1bHQ6IHRydWVcbiAgfVxuXVxuIiwiaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICd1dGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFkZEFaZXJvIGV4dGVuZHMgVGV4dFEge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDUsXG4gICAgICBsYWJlbDogJ2EnXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICB0aGlzLmxhYmVsID0gc2V0dGluZ3MubGFiZWxcblxuICAgIC8vIHJhbmRvbSAyIGRpZ2l0ICdkZWNpbWFsJ1xuICAgIGNvbnN0IHEgPSBTdHJpbmcocmFuZEJldHdlZW4oMSwgOSkpICsgU3RyaW5nKHJhbmRCZXR3ZWVuKDAsIDkpKSArICcuJyArIFN0cmluZyhyYW5kQmV0d2VlbigwLCA5KSlcbiAgICBjb25zdCBhID0gcSArICcwJ1xuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gcSArICdcXFxcdGltZXMgMTAnXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICc9ICcgKyBhXG5cbiAgICB0aGlzLnJlbmRlcigpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ0V2YWx1YXRlJ1xuICB9XG59XG5cbkFkZEFaZXJvLm9wdGlvbnNTcGVjID0gW1xuXVxuIiwiaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5pbXBvcnQgRnJhY3Rpb24gZnJvbSAnZnJhY3Rpb24uanMnXG5cbi8qIE1haW4gcXVlc3Rpb24gY2xhc3MuIFRoaXMgd2lsbCBiZSBzcHVuIG9mZiBpbnRvIGRpZmZlcmVudCBmaWxlIGFuZCBnZW5lcmFsaXNlZCAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRXF1YXRpb25PZkxpbmUgZXh0ZW5kcyBUZXh0USB7XG4gIC8vICdleHRlbmRzJyBRdWVzdGlvbiwgYnV0IG5vdGhpbmcgdG8gYWN0dWFsbHkgZXh0ZW5kXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgLy8gYm9pbGVycGxhdGVcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiAyXG4gICAgfVxuXG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcbiAgICBjb25zdCBkaWZmaWN1bHR5ID0gTWF0aC5jZWlsKHNldHRpbmdzLmRpZmZpY3VsdHkgLyAyKSAvLyBpbml0aWFsbHkgd3JpdHRlbiBmb3IgZGlmZmljdWx0eSAxLTQsIG5vdyBuZWVkIDEtMTBcblxuICAgIC8vIHF1ZXN0aW9uIGdlbmVyYXRpb24gYmVnaW5zIGhlcmVcbiAgICBsZXQgbSwgYywgeDEsIHkxLCB4MiwgeTJcbiAgICBsZXQgbWlubSwgbWF4bSwgbWluYywgbWF4Y1xuXG4gICAgc3dpdGNoIChkaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6IC8vIG0+MCwgYz49MFxuICAgICAgY2FzZSAyOlxuICAgICAgY2FzZSAzOlxuICAgICAgICBtaW5tID0gZGlmZmljdWx0eSA8IDMgPyAxIDogLTVcbiAgICAgICAgbWF4bSA9IDVcbiAgICAgICAgbWluYyA9IGRpZmZpY3VsdHkgPCAyID8gMCA6IC0xMFxuICAgICAgICBtYXhjID0gMTBcbiAgICAgICAgbSA9IHJhbmRCZXR3ZWVuKG1pbm0sIG1heG0pXG4gICAgICAgIGMgPSByYW5kQmV0d2VlbihtaW5jLCBtYXhjKVxuICAgICAgICB4MSA9IGRpZmZpY3VsdHkgPCAzID8gcmFuZEJldHdlZW4oMCwgMTApIDogcmFuZEJldHdlZW4oLTE1LCAxNSlcbiAgICAgICAgeTEgPSBtICogeDEgKyBjXG5cbiAgICAgICAgaWYgKGRpZmZpY3VsdHkgPCAzKSB7XG4gICAgICAgICAgeDIgPSByYW5kQmV0d2Vlbih4MSArIDEsIDE1KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHgyID0geDFcbiAgICAgICAgICB3aGlsZSAoeDIgPT09IHgxKSB7IHgyID0gcmFuZEJldHdlZW4oLTE1LCAxNSkgfTtcbiAgICAgICAgfVxuICAgICAgICB5MiA9IG0gKiB4MiArIGNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNDogLy8gbSBmcmFjdGlvbiwgcG9pbnRzIGFyZSBpbnRlZ2Vyc1xuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBjb25zdCBtZCA9IHJhbmRCZXR3ZWVuKDEsIDUpXG4gICAgICAgIGNvbnN0IG1uID0gcmFuZEJldHdlZW4oLTUsIDUpXG4gICAgICAgIG0gPSBuZXcgRnJhY3Rpb24obW4sIG1kKVxuICAgICAgICB4MSA9IG5ldyBGcmFjdGlvbihyYW5kQmV0d2VlbigtMTAsIDEwKSlcbiAgICAgICAgeTEgPSBuZXcgRnJhY3Rpb24ocmFuZEJldHdlZW4oLTEwLCAxMCkpXG4gICAgICAgIGMgPSBuZXcgRnJhY3Rpb24oeTEpLnN1YihtLm11bCh4MSkpXG4gICAgICAgIHgyID0geDEuYWRkKHJhbmRCZXR3ZWVuKDEsIDUpICogbS5kKVxuICAgICAgICB5MiA9IG0ubXVsKHgyKS5hZGQoYylcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB4c3RyID1cbiAgICAgIChtID09PSAwIHx8IChtLmVxdWFscyAmJiBtLmVxdWFscygwKSkpID8gJydcbiAgICAgICAgOiAobSA9PT0gMSB8fCAobS5lcXVhbHMgJiYgbS5lcXVhbHMoMSkpKSA/ICd4J1xuICAgICAgICAgIDogKG0gPT09IC0xIHx8IChtLmVxdWFscyAmJiBtLmVxdWFscygtMSkpKSA/ICcteCdcbiAgICAgICAgICAgIDogKG0udG9MYXRleCkgPyBtLnRvTGF0ZXgoKSArICd4J1xuICAgICAgICAgICAgICA6IChtICsgJ3gnKVxuXG4gICAgY29uc3QgY29uc3RzdHIgPSAvLyBUT0RPOiBXaGVuIG09Yz0wXG4gICAgICAoYyA9PT0gMCB8fCAoYy5lcXVhbHMgJiYgYy5lcXVhbHMoMCkpKSA/ICcnXG4gICAgICAgIDogKGMgPCAwKSA/ICgnIC0gJyArIChjLm5lZyA/IGMubmVnKCkudG9MYXRleCgpIDogLWMpKVxuICAgICAgICAgIDogKGMudG9MYXRleCkgPyAoJyArICcgKyBjLnRvTGF0ZXgoKSlcbiAgICAgICAgICAgIDogKCcgKyAnICsgYylcblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICcoJyArIHgxICsgJywgJyArIHkxICsgJylcXFxcdGV4dHsgYW5kIH0oJyArIHgyICsgJywgJyArIHkyICsgJyknXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICd5ID0gJyArIHhzdHIgKyBjb25zdHN0clxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdGaW5kIHRoZSBlcXVhdGlvbiBvZiB0aGUgbGluZSB0aHJvdWdoJ1xuICB9XG59XG4iLCIvKiBSZW5kZXJzIG1pc3NpbmcgYW5nbGVzIHByb2JsZW0gd2hlbiB0aGUgYW5nbGVzIGFyZSBhdCBhIHBvaW50XG4gKiBJLmUuIG9uIGEgc3RyYWlnaHQgbGluZSBvciBhcm91bmQgYSBwb2ludFxuICogQ291bGQgYWxzbyBiZSBhZGFwdGVkIHRvIGFuZ2xlcyBmb3JtaW5nIGEgcmlnaHQgYW5nbGVcbiAqXG4gKiBTaG91bGQgYmUgZmxleGlibGUgZW5vdWdoIGZvciBudW1lcmljYWwgcHJvYmxlbXMgb3IgYWxnZWJyYWljIG9uZXNcbiAqXG4gKi9cblxuaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgR3JhcGhpY1FWaWV3LCBMYWJlbCB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IHsgcm91bmREUCB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIHJhZGl1czogbnVtYmVyXG4gIE86IFBvaW50XG4gIEE6IFBvaW50XG4gIEM6IFBvaW50W11cbiAgdmlld0FuZ2xlczogbnVtYmVyW10gLy8gJ2Z1ZGdlZCcgdmVyc2lvbnMgb2YgZGF0YS5hbmdsZXMgZm9yIGRpc3BsYXlcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIC8vIGluaXRpYWxpc2VkIGluIHN1cGVyIGNhbGxcbiAgcm90YXRpb246IG51bWJlclxuXG4gIGNvbnN0cnVjdG9yIChkYXRhIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEsIG9wdGlvbnMgOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBzZXRzIHRoaXMud2lkdGggdGhpcy5oZWlnaHQsIGluaXRpYWxpc2VzIHRoaXMubGFiZWxzLCBjcmVhdGVzIGRvbSBlbGVtZW50c1xuICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aFxuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuaGVpZ2h0XG4gICAgY29uc3QgcmFkaXVzID0gdGhpcy5yYWRpdXMgPSBNYXRoLm1pbih3aWR0aCwgaGVpZ2h0KSAvIDIuNVxuICAgIGNvbnN0IG1pblZpZXdBbmdsZSA9IG9wdGlvbnMubWluVmlld0FuZ2xlIHx8IDI1XG5cbiAgICB0aGlzLnZpZXdBbmdsZXMgPSBmdWRnZUFuZ2xlcyh0aGlzLmRhdGEuYW5nbGVzLCBtaW5WaWV3QW5nbGUpXG5cbiAgICAvLyBTZXQgdXAgbWFpbiBwb2ludHNcbiAgICB0aGlzLk8gPSBuZXcgUG9pbnQoMCwgMCkgLy8gY2VudGVyIHBvaW50XG4gICAgdGhpcy5BID0gbmV3IFBvaW50KHJhZGl1cywgMCkgLy8gZmlyc3QgcG9pbnRcbiAgICB0aGlzLkMgPSBbXSAvLyBQb2ludHMgYXJvdW5kIG91dHNpZGVcbiAgICBsZXQgdG90YWxhbmdsZSA9IDAgLy8gbmIgaW4gcmFkaWFuc1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5kYXRhLmFuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdG90YWxhbmdsZSArPSB0aGlzLnZpZXdBbmdsZXNbaV0gKiBNYXRoLlBJIC8gMTgwXG4gICAgICB0aGlzLkNbaV0gPSBQb2ludC5mcm9tUG9sYXIocmFkaXVzLCB0b3RhbGFuZ2xlKVxuICAgIH1cblxuICAgIC8vIFJhbmRvbWx5IHJvdGF0ZSBhbmQgY2VudGVyXG4gICAgdGhpcy5yb3RhdGlvbiA9IChvcHRpb25zLnJvdGF0aW9uICE9PSB1bmRlZmluZWQpID8gdGhpcy5yb3RhdGUob3B0aW9ucy5yb3RhdGlvbikgOiB0aGlzLnJhbmRvbVJvdGF0ZSgpXG4gICAgLy8gdGhpcy5zY2FsZVRvRml0KHdpZHRoLGhlaWdodCwxMClcbiAgICB0aGlzLnRyYW5zbGF0ZSh3aWR0aCAvIDIsIGhlaWdodCAvIDIpXG5cbiAgICAvLyBTZXQgdXAgbGFiZWxzIChhZnRlciBzY2FsaW5nIGFuZCByb3RhdGluZylcbiAgICB0b3RhbGFuZ2xlID0gUG9pbnQuYW5nbGVGcm9tKHRoaXMuTywgdGhpcy5BKSAqIDE4MCAvIE1hdGguUEkgLy8gYW5nbGUgZnJvbSBPIHRoYXQgQSBpc1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy52aWV3QW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAvLyBMYWJlbCB0ZXh0XG4gICAgICBjb25zdCBsYWJlbCA6IFBhcnRpYWw8TGFiZWw+ID0ge31cbiAgICAgIGNvbnN0IHRleHRxID0gdGhpcy5kYXRhLmFuZ2xlTGFiZWxzW2ldXG4gICAgICBjb25zdCB0ZXh0YSA9IHJvdW5kRFAodGhpcy5kYXRhLmFuZ2xlc1tpXSwgMikudG9TdHJpbmcoKSArICdeXFxcXGNpcmMnXG5cbiAgICAgIC8vIFBvc2l0aW9uaW5nXG4gICAgICBjb25zdCB0aGV0YSA9IHRoaXMudmlld0FuZ2xlc1tpXVxuICAgICAgLyogY291bGQgYmUgdXNlZCBmb3IgbW9yZSBhZHZhbmNlZCBwb3NpdGlvbmluZ1xuICAgICAgY29uc3QgbWlkQW5nbGUgPSB0b3RhbGFuZ2xlICsgdGhldGEgLyAyXG4gICAgICBjb25zdCBtaW5EaXN0YW5jZSA9IDAuMyAvLyBhcyBhIGZyYWN0aW9uIG9mIHJhZGl1c1xuICAgICAgY29uc3QgbGFiZWxMZW5ndGggPSBNYXRoLm1heCh0ZXh0cS5sZW5ndGgsIHRleHRhLmxlbmd0aCkgLSAnXlxcXFxjaXJjJy5sZW5ndGggLy8gwrAgdGFrZXMgdXAgdmVyeSBsaXR0bGUgc3BhY2VcbiAgICAgICovXG5cbiAgICAgIC8qIEV4cGxhbmF0aW9uOiBGdXJ0aGVyIG91dCBpZjpcbiAgICAgICogICBNb3JlIHZlcnRpY2FsIChzaW4obWlkQW5nbGUpKVxuICAgICAgKiAgIExvbmdlciBsYWJlbFxuICAgICAgKiAgIHNtYWxsZXIgYW5nbGVcbiAgICAgICogICBFLmcuIHRvdGFsbHkgdmVydGljYWwsIDQ1wrAsIGxlbmd0aCA9IDNcbiAgICAgICogICBkID0gMC4zICsgMSozLzQ1ID0gMC4zICsgMC43ID0gMC4zN1xuICAgICAgKi9cbiAgICAgIC8vIGNvbnN0IGZhY3RvciA9IDEgICAgICAgIC8vIGNvbnN0YW50IG9mIHByb3BvcnRpb25hbGl0eS4gU2V0IGJ5IHRyaWFsIGFuZCBlcnJvclxuICAgICAgLy8gbGV0IGRpc3RhbmNlID0gbWluRGlzdGFuY2UgKyBmYWN0b3IgKiBNYXRoLmFicyhzaW5EZWcobWlkQW5nbGUpKSAqIGxhYmVsTGVuZ3RoIC8gdGhldGFcblxuICAgICAgLy8gSnVzdCByZXZlcnQgdG8gb2xkIG1ldGhvZFxuXG4gICAgICBjb25zdCBkaXN0YW5jZSA9IDAuNCArIDYgLyB0aGV0YVxuXG4gICAgICBsYWJlbC5wb3MgPSBQb2ludC5mcm9tUG9sYXJEZWcocmFkaXVzICogZGlzdGFuY2UsIHRvdGFsYW5nbGUgKyB0aGV0YSAvIDIpLnRyYW5zbGF0ZSh0aGlzLk8ueCwgdGhpcy5PLnkpXG4gICAgICBsYWJlbC50ZXh0cSA9IHRleHRxXG4gICAgICBsYWJlbC5zdHlsZXEgPSAnbm9ybWFsJ1xuXG4gICAgICBpZiAodGhpcy5kYXRhLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSB0ZXh0YVxuICAgICAgICBsYWJlbC5zdHlsZWEgPSAnYW5zd2VyJ1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSBsYWJlbC50ZXh0cVxuICAgICAgICBsYWJlbC5zdHlsZWEgPSBsYWJlbC5zdHlsZXFcbiAgICAgIH1cblxuICAgICAgbGFiZWwudGV4dCA9IGxhYmVsLnRleHRxXG4gICAgICBsYWJlbC5zdHlsZSA9IGxhYmVsLnN0eWxlcVxuXG4gICAgICB0aGlzLmxhYmVsc1tpXSA9IGxhYmVsIGFzIExhYmVsXG5cbiAgICAgIHRvdGFsYW5nbGUgKz0gdGhldGFcbiAgICB9XG5cbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgfVxuXG4gIHJlbmRlciAoKSA6IHZvaWQge1xuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICBpZiAoY3R4ID09PSBudWxsKSB7IHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGdldCBjYW52YXMgY29udGV4dCcpIH1cblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGN0eC5tb3ZlVG8odGhpcy5PLngsIHRoaXMuTy55KSAvLyBkcmF3IGxpbmVzXG4gICAgY3R4LmxpbmVUbyh0aGlzLkEueCwgdGhpcy5BLnkpXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLkMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGN0eC5tb3ZlVG8odGhpcy5PLngsIHRoaXMuTy55KVxuICAgICAgY3R4LmxpbmVUbyh0aGlzLkNbaV0ueCwgdGhpcy5DW2ldLnkpXG4gICAgfVxuICAgIGN0eC5zdHJva2VTdHlsZSA9ICdncmF5J1xuICAgIGN0eC5zdHJva2UoKVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgY3R4LmJlZ2luUGF0aCgpXG4gICAgbGV0IHRvdGFsYW5nbGUgPSB0aGlzLnJvdGF0aW9uXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnZpZXdBbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHRoZXRhID0gdGhpcy52aWV3QW5nbGVzW2ldICogTWF0aC5QSSAvIDE4MFxuICAgICAgLy8gMC4wNy90aGV0YSByYWRpYW5zIH49IDQvdGhldGFcbiAgICAgIGN0eC5hcmModGhpcy5PLngsIHRoaXMuTy55LCB0aGlzLnJhZGl1cyAqICgwLjIgKyAwLjA3IC8gdGhldGEpLCB0b3RhbGFuZ2xlLCB0b3RhbGFuZ2xlICsgdGhldGEpXG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIHRvdGFsYW5nbGUgKz0gdGhldGFcbiAgICB9XG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICAvLyB0ZXN0aW5nIGxhYmVsIHBvc2l0aW9uaW5nOlxuICAgIC8vIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgLy8gY3R4LmZpbGxTdHlsZSA9ICdyZWQnXG4gICAgLy8gY3R4LmZpbGxSZWN0KGwucG9zLnggLSAxLCBsLnBvcy55IC0gMSwgMywgMylcbiAgICAvLyB9KVxuXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoZmFsc2UpXG4gIH1cblxuICBnZXQgYWxscG9pbnRzICgpIDogUG9pbnRbXSB7XG4gICAgbGV0IGFsbHBvaW50cyA9IFt0aGlzLkEsIHRoaXMuT11cbiAgICBhbGxwb2ludHMgPSBhbGxwb2ludHMuY29uY2F0KHRoaXMuQylcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGZ1bmN0aW9uIChsKSB7XG4gICAgICBhbGxwb2ludHMucHVzaChsLnBvcylcbiAgICB9KVxuICAgIHJldHVybiBhbGxwb2ludHNcbiAgfVxufVxuXG4vKipcbiAqIEFkanVzdHMgYSBzZXQgb2YgYW5nbGVzIHNvIHRoYXQgYWxsIGFuZ2xlcyBhcmUgZ3JlYXRlciB0aGFuIHttaW5BbmdsZX0gYnkgcmVkdWNpbmcgb3RoZXIgYW5nbGVzIGluIHByb3BvcnRpb25cbiAqIEBwYXJhbSBhbmdsZXMgVGhlIHNldCBvZiBhbmdsZXMgdG8gYWRqdXN0XG4gKiBAcGFyYW0gbWluQW5nbGUgVGhlIHNtYWxsZXN0IGFuZ2xlIGluIHRoZSBvdXRwdXRcbiAqL1xuZnVuY3Rpb24gZnVkZ2VBbmdsZXMgKGFuZ2xlczogbnVtYmVyW10sIG1pbkFuZ2xlOiBudW1iZXIpIDogbnVtYmVyW10ge1xuICBjb25zdCBhbmdsZVN1bSA9IGFuZ2xlcy5yZWR1Y2UoKGEsIGMpID0+IGEgKyBjKVxuICBjb25zdCBtYXBwZWRBbmdsZXMgPSBhbmdsZXMubWFwKCh4LCBpKSA9PiBbeCwgaV0pIC8vIHJlbWVtYmVyIG9yaWdpbmFsIGluZGljZXNcbiAgY29uc3Qgc21hbGxBbmdsZXMgPSBtYXBwZWRBbmdsZXMuZmlsdGVyKHggPT4geFswXSA8IG1pbkFuZ2xlKSAvLyBzcGxpdCBvdXQgYW5nbGVzIHdoaWNoIGFyZSB0b28gc21hbGxcbiAgY29uc3QgbGFyZ2VBbmdsZXMgPSBtYXBwZWRBbmdsZXMuZmlsdGVyKHggPT4geFswXSA+PSBtaW5BbmdsZSlcbiAgY29uc3QgbGFyZ2VBbmdsZVN1bSA9IGxhcmdlQW5nbGVzLnJlZHVjZSgoYWNjdW11bGF0b3IsIGN1cnJlbnRWYWx1ZSkgPT4gYWNjdW11bGF0b3IgKyBjdXJyZW50VmFsdWVbMF0sIDApXG5cbiAgc21hbGxBbmdsZXMuZm9yRWFjaChzbWFsbCA9PiB7XG4gICAgY29uc3QgZGlmZmVyZW5jZSA9IG1pbkFuZ2xlIC0gc21hbGxbMF1cbiAgICBzbWFsbFswXSArPSBkaWZmZXJlbmNlXG4gICAgbGFyZ2VBbmdsZXMuZm9yRWFjaChsYXJnZSA9PiB7XG4gICAgICBjb25zdCByZWR1Y3Rpb24gPSBkaWZmZXJlbmNlICogbGFyZ2VbMF0gLyBsYXJnZUFuZ2xlU3VtXG4gICAgICBsYXJnZVswXSA9IE1hdGgucm91bmQobGFyZ2VbMF0gLSByZWR1Y3Rpb24pXG4gICAgfSlcbiAgfSlcblxuICAvLyBmaXggYW55IHJvdW5kaW5nIGVycm9ycyBpbnRyb2R1Y2VkXG5cbiAgY29uc3QgbmV3QW5nbGVzID0gc21hbGxBbmdsZXMuY29uY2F0KGxhcmdlQW5nbGVzKSAvLyBjb21iaW5lIHRvZ2V0aGVyXG4gICAgLnNvcnQoKHgsIHkpID0+IHhbMV0gLSB5WzFdKSAvLyBzb3J0IGJ5IHByZXZpb3VzIGluZGV4XG4gICAgLm1hcCh4ID0+IHhbMF0pIC8vIHN0cmlwIG91dCBpbmRleFxuXG4gIGxldCBuZXdTdW0gPSBuZXdBbmdsZXMucmVkdWNlKChhY2MsIGN1cnIpID0+IGFjYyArIGN1cnIpXG4gIGlmIChuZXdTdW0gIT09IGFuZ2xlU3VtKSB7XG4gICAgY29uc3QgZGlmZmVyZW5jZSA9IGFuZ2xlU3VtIC0gbmV3U3VtXG4gICAgbmV3QW5nbGVzW25ld0FuZ2xlcy5pbmRleE9mKE1hdGgubWF4KC4uLm5ld0FuZ2xlcykpXSArPSBkaWZmZXJlbmNlXG4gIH1cbiAgbmV3U3VtID0gbmV3QW5nbGVzLnJlZHVjZSgoYWNjLCBjdXJyKSA9PiBhY2MgKyBjdXJyKVxuICBpZiAobmV3U3VtICE9PSBhbmdsZVN1bSkgdGhyb3cgbmV3IEVycm9yKGBEaWRuJ3QgZml4IGFuZ2xlcy4gTmV3IHN1bSBpcyAke25ld1N1bX0sIGJ1dCBzaG91bGQgYmUgJHthbmdsZVN1bX1gKVxuXG4gIHJldHVybiBuZXdBbmdsZXNcbn1cbiIsIi8qKiBHZW5lcmF0ZXMgYW5kIGhvbGRzIGRhdGEgZm9yIGEgbWlzc2luZyBhbmdsZXMgcXVlc3Rpb24sIHdoZXJlIHRoZXNlIGlzIHNvbWUgZ2l2ZW4gYW5nbGUgc3VtXG4gKiAgQWdub3N0aWMgYXMgdG8gaG93IHRoZXNlIGFuZ2xlcyBhcmUgYXJyYW5nZWQgKGUuZy4gaW4gYSBwb2x5Z29uIG9yIGFyb3VuZCBzb20gcG9pbnQpXG4gKlxuICogT3B0aW9ucyBwYXNzZWQgdG8gY29uc3RydWN0b3JzOlxuICogIGFuZ2xlU3VtOjpJbnQgdGhlIG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqICBtaW5BbmdsZTo6SW50IHRoZSBzbWFsbGVzdCBhbmdsZSB0byBnZW5lcmF0ZVxuICogIG1pbk46OkludCAgICAgdGhlIHNtYWxsZXN0IG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqICBtYXhOOjpJbnQgICAgIHRoZSBsYXJnZXN0IG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqXG4gKi9cblxuaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUURhdGEgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgYXMgT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxuZXhwb3J0IGNsYXNzIE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIGltcGxlbWVudHMgTWlzc2luZ0FuZ2xlc0RhdGEge1xuICBhbmdsZXMgOiBudW1iZXJbXSAvLyBsaXN0IG9mIGFuZ2xlc1xuICBtaXNzaW5nIDogYm9vbGVhbltdIC8vIHRydWUgaWYgbWlzc2luZ1xuICBhbmdsZVN1bSA6IG51bWJlciAvLyB3aGF0IHRoZSBhbmdsZXMgYWRkIHVwIHRvXG4gIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXVxuXG4gIGNvbnN0cnVjdG9yIChhbmdsZVN1bSA6IG51bWJlciwgYW5nbGVzOiBudW1iZXJbXSwgbWlzc2luZzogYm9vbGVhbltdLCBhbmdsZUxhYmVscz86IHN0cmluZ1tdKSB7XG4gICAgLy8gaW5pdGlhbGlzZXMgd2l0aCBhbmdsZXMgZ2l2ZW4gZXhwbGljaXRseVxuICAgIGlmIChhbmdsZXMgPT09IFtdKSB7IHRocm93IG5ldyBFcnJvcignTXVzdCBnaXZlIGFuZ2xlcycpIH1cbiAgICBpZiAoTWF0aC5yb3VuZChhbmdsZXMucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSkpICE9PSBhbmdsZVN1bSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBbmdsZSBzdW0gbXVzdCBiZSAke2FuZ2xlU3VtfWApXG4gICAgfVxuXG4gICAgdGhpcy5hbmdsZXMgPSBhbmdsZXMgLy8gbGlzdCBvZiBhbmdsZXNcbiAgICB0aGlzLm1pc3NpbmcgPSBtaXNzaW5nIC8vIHdoaWNoIGFuZ2xlcyBhcmUgbWlzc2luZyAtIGFycmF5IG9mIGJvb2xlYW5zXG4gICAgdGhpcy5hbmdsZVN1bSA9IGFuZ2xlU3VtIC8vIHN1bSBvZiBhbmdsZXNcbiAgICB0aGlzLmFuZ2xlTGFiZWxzID0gYW5nbGVMYWJlbHMgfHwgW11cbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IE9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEge1xuICAgIGxldCBxdWVzdGlvbiA6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhXG4gICAgaWYgKG9wdGlvbnMucmVwZWF0ZWQpIHtcbiAgICAgIHF1ZXN0aW9uID0gdGhpcy5yYW5kb21SZXBlYXRlZChvcHRpb25zKVxuICAgIH0gZWxzZSB7XG4gICAgICBxdWVzdGlvbiA9IHRoaXMucmFuZG9tU2ltcGxlKG9wdGlvbnMpXG4gICAgfVxuICAgIHF1ZXN0aW9uLmluaXRMYWJlbHMoKVxuICAgIHJldHVybiBxdWVzdGlvblxuICB9XG5cbiAgc3RhdGljIHJhbmRvbVNpbXBsZSAob3B0aW9uczogT3B0aW9ucyk6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBjb25zdCBhbmdsZVN1bSA9IG9wdGlvbnMuYW5nbGVTdW1cbiAgICBjb25zdCBuID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5OLCBvcHRpb25zLm1heE4pXG4gICAgY29uc3QgbWluQW5nbGUgPSBvcHRpb25zLm1pbkFuZ2xlXG5cbiAgICBpZiAobiA8IDIpIHRocm93IG5ldyBFcnJvcignQ2FuXFwndCBoYXZlIG1pc3NpbmcgZmV3ZXIgdGhhbiAyIGFuZ2xlcycpXG5cbiAgICAvLyBCdWlsZCB1cCBhbmdsZXNcbiAgICBjb25zdCBhbmdsZXMgPSBbXVxuICAgIGxldCBsZWZ0ID0gYW5nbGVTdW1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG4gLSAxOyBpKyspIHtcbiAgICAgIGNvbnN0IG1heEFuZ2xlID0gbGVmdCAtIG1pbkFuZ2xlICogKG4gLSBpIC0gMSlcbiAgICAgIGNvbnN0IG5leHRBbmdsZSA9IHJhbmRCZXR3ZWVuKG1pbkFuZ2xlLCBtYXhBbmdsZSlcbiAgICAgIGxlZnQgLT0gbmV4dEFuZ2xlXG4gICAgICBhbmdsZXMucHVzaChuZXh0QW5nbGUpXG4gICAgfVxuICAgIGFuZ2xlc1tuIC0gMV0gPSBsZWZ0XG5cbiAgICAvLyBwaWNrIG9uZSB0byBiZSBtaXNzaW5nXG4gICAgY29uc3QgbWlzc2luZzogYm9vbGVhbltdID0gW11cbiAgICBtaXNzaW5nLmxlbmd0aCA9IG5cbiAgICBtaXNzaW5nLmZpbGwoZmFsc2UpXG4gICAgbWlzc2luZ1tyYW5kQmV0d2VlbigwLCBuIC0gMSldID0gdHJ1ZVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGFuZ2xlU3VtLCBhbmdsZXMsIG1pc3NpbmcpXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tUmVwZWF0ZWQgKG9wdGlvbnM6IE9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEge1xuICAgIGNvbnN0IGFuZ2xlU3VtOiBudW1iZXIgPSBvcHRpb25zLmFuZ2xlU3VtXG4gICAgY29uc3QgbWluQW5nbGU6IG51bWJlciA9IG9wdGlvbnMubWluQW5nbGVcblxuICAgIGNvbnN0IG46IG51bWJlciA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTiwgb3B0aW9ucy5tYXhOKVxuXG4gICAgY29uc3QgbTogbnVtYmVyID0gb3B0aW9ucy5uTWlzc2luZyB8fCAoTWF0aC5yYW5kb20oKSA8IDAuMSA/IG4gOiByYW5kQmV0d2VlbigyLCBuIC0gMSkpXG5cbiAgICBpZiAobiA8IDIgfHwgbSA8IDEgfHwgbSA+IG4pIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBhcmd1bWVudHM6IG49JHtufSwgbT0ke219YClcblxuICAgIC8vIEFsbCBtaXNzaW5nIC0gZG8gYXMgYSBzZXBhcmF0ZSBjYXNlXG4gICAgaWYgKG4gPT09IG0pIHtcbiAgICAgIGNvbnN0IGFuZ2xlczogbnVtYmVyW10gPSBbXVxuICAgICAgYW5nbGVzLmxlbmd0aCA9IG5cbiAgICAgIGFuZ2xlcy5maWxsKGFuZ2xlU3VtIC8gbilcblxuICAgICAgY29uc3QgbWlzc2luZzogYm9vbGVhbltdID0gW11cbiAgICAgIG1pc3NpbmcubGVuZ3RoID0gblxuICAgICAgbWlzc2luZy5maWxsKHRydWUpXG5cbiAgICAgIHJldHVybiBuZXcgdGhpcyhhbmdsZVN1bSwgYW5nbGVzLCBtaXNzaW5nKVxuICAgIH1cblxuICAgIGNvbnN0IGFuZ2xlczogbnVtYmVyW10gPSBbXVxuICAgIGNvbnN0IG1pc3Npbmc6IGJvb2xlYW5bXSA9IFtdXG4gICAgbWlzc2luZy5sZW5ndGggPSBuXG4gICAgbWlzc2luZy5maWxsKGZhbHNlKVxuXG4gICAgLy8gY2hvb3NlIGEgdmFsdWUgZm9yIHRoZSBtaXNzaW5nIGFuZ2xlc1xuICAgIGNvbnN0IG1heFJlcGVhdGVkQW5nbGUgPSAoYW5nbGVTdW0gLSBtaW5BbmdsZSAqIChuIC0gbSkpIC8gbVxuICAgIGNvbnN0IHJlcGVhdGVkQW5nbGUgPSByYW5kQmV0d2VlbihtaW5BbmdsZSwgbWF4UmVwZWF0ZWRBbmdsZSlcblxuICAgIC8vIGNob29zZSB2YWx1ZXMgZm9yIHRoZSBvdGhlciBhbmdsZXNcbiAgICBjb25zdCBvdGhlckFuZ2xlczogbnVtYmVyW10gPSBbXVxuICAgIGxldCBsZWZ0ID0gYW5nbGVTdW0gLSByZXBlYXRlZEFuZ2xlICogbVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbiAtIG0gLSAxOyBpKyspIHtcbiAgICAgIGNvbnN0IG1heEFuZ2xlID0gbGVmdCAtIG1pbkFuZ2xlICogKG4gLSBtIC0gaSAtIDEpXG4gICAgICBjb25zdCBuZXh0QW5nbGUgPSByYW5kQmV0d2VlbihtaW5BbmdsZSwgbWF4QW5nbGUpXG4gICAgICBsZWZ0IC09IG5leHRBbmdsZVxuICAgICAgb3RoZXJBbmdsZXMucHVzaChuZXh0QW5nbGUpXG4gICAgfVxuICAgIG90aGVyQW5nbGVzW24gLSBtIC0gMV0gPSBsZWZ0XG5cbiAgICAvLyBjaG9vc2Ugd2hlcmUgdGhlIG1pc3NpbmcgYW5nbGVzIGFyZVxuICAgIHtcbiAgICAgIGxldCBpID0gMFxuICAgICAgd2hpbGUgKGkgPCBtKSB7XG4gICAgICAgIGNvbnN0IGogPSByYW5kQmV0d2VlbigwLCBuIC0gMSlcbiAgICAgICAgaWYgKG1pc3Npbmdbal0gPT09IGZhbHNlKSB7XG4gICAgICAgICAgbWlzc2luZ1tqXSA9IHRydWVcbiAgICAgICAgICBhbmdsZXNbal0gPSByZXBlYXRlZEFuZ2xlXG4gICAgICAgICAgaSsrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBmaWxsIGluIHRoZSBvdGhlciBhbmdsZXNcbiAgICB7XG4gICAgICBsZXQgaiA9IDBcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGlmIChtaXNzaW5nW2ldID09PSBmYWxzZSkge1xuICAgICAgICAgIGFuZ2xlc1tpXSA9IG90aGVyQW5nbGVzW2pdXG4gICAgICAgICAgaisrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ldyB0aGlzKGFuZ2xlU3VtLCBhbmdsZXMsIG1pc3NpbmcpXG4gIH1cblxuICBpbml0TGFiZWxzICgpIDogdm9pZCB7XG4gICAgY29uc3QgbiA9IHRoaXMuYW5nbGVzLmxlbmd0aFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBpZiAoIXRoaXMubWlzc2luZ1tpXSkge1xuICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzW2ldID0gYCR7dGhpcy5hbmdsZXNbaV0udG9TdHJpbmcoKX1eXFxcXGNpcmNgXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzW2ldID0gJ3heXFxcXGNpcmMnXG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iLCIvKiBRdWVzdGlvbiB0eXBlIGNvbXByaXNpbmcgbnVtZXJpY2FsIG1pc3NpbmcgYW5nbGVzIGFyb3VuZCBhIHBvaW50IGFuZFxuICogYW5nbGVzIG9uIGEgc3RyYWlnaHQgbGluZSAoc2luY2UgdGhlc2UgYXJlIHZlcnkgc2ltaWxhciBudW1lcmljYWxseSBhcyB3ZWxsXG4gKiBhcyBncmFwaGljYWxseS5cbiAqXG4gKiBBbHNvIGNvdmVycyBjYXNlcyB3aGVyZSBtb3JlIHRoYW4gb25lIGFuZ2xlIGlzIGVxdWFsXG4gKlxuICovXG5cbmltcG9ydCB7IE9wdGlvbnNTcGVjIH0gZnJvbSAnT3B0aW9uc1NwZWMnXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc051bWJlckRhdGEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhITogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgLy8gaW5pdGlhbGlzZWQgaW4gc3VwZXIoKVxuICB2aWV3ITogTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXdcblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBQYXJ0aWFsPE1pc3NpbmdBbmdsZU9wdGlvbnM+LCB2aWV3T3B0aW9uczogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNBcm91bmRRIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IE1pc3NpbmdBbmdsZU9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDE1LFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDQsXG4gICAgICByZXBlYXRlZDogZmFsc2UsXG4gICAgICBuTWlzc2luZzogM1xuICAgIH1cbiAgICBjb25zdCBzZXR0aW5nczogTWlzc2luZ0FuZ2xlT3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhLnJhbmRvbShzZXR0aW5ncylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3KGRhdGEsIHZpZXdPcHRpb25zKSAvLyBUT0RPIGVsaW1pbmF0ZSBwdWJsaWMgY29uc3RydWN0b3JzXG5cbiAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRRKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBHcmFwaGljUVZpZXcsIExhYmVsIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgeyBzaW5EZWcsIGRhc2hlZExpbmUsIHJvdW5kRFAgfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICBBIDogUG9pbnQgLy8gdGhlIHZlcnRpY2VzIG9mIHRoZSB0cmlhbmdsZVxuICBCIDogUG9pbnRcbiAgQyA6IFBvaW50XG4gIHJvdGF0aW9uOiBudW1iZXJcbiAgLy8gSW5oZXJpdGVkIG1lbWJlcnMuIEFsbCBpbml0aWFsaXNlZCBpbiBjYWxsIHRvIHN1cGVyKClcbiAgbGFiZWxzITogTGFiZWxbXVxuICBjYW52YXMhOiBIVE1MQ2FudmFzRWxlbWVudFxuICBET00hOiBIVE1MRWxlbWVudFxuICB3aWR0aCE6IG51bWJlclxuICBoZWlnaHQhOiBudW1iZXJcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGFcblxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSwgb3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBzZXRzIHRoaXMud2lkdGggdGhpcy5oZWlnaHQsIHRoaXMuZGF0YSBpbml0aWFsaXNlcyB0aGlzLmxhYmVscywgY3JlYXRlcyBkb20gZWxlbWVudHNcbiAgICBjb25zdCB3aWR0aCA9IHRoaXMud2lkdGhcbiAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmhlaWdodFxuXG4gICAgLy8gZ2VuZXJhdGUgcG9pbnRzICh3aXRoIGxvbmdlc3Qgc2lkZSAxXG4gICAgdGhpcy5BID0gbmV3IFBvaW50KDAsIDApXG4gICAgdGhpcy5CID0gUG9pbnQuZnJvbVBvbGFyRGVnKDEsIGRhdGEuYW5nbGVzWzBdKVxuICAgIHRoaXMuQyA9IG5ldyBQb2ludChcbiAgICAgIHNpbkRlZyh0aGlzLmRhdGEuYW5nbGVzWzFdKSAvIHNpbkRlZyh0aGlzLmRhdGEuYW5nbGVzWzJdKSwgMFxuICAgIClcblxuICAgIC8vIENyZWF0ZSBsYWJlbHNcbiAgICBjb25zdCBpbkNlbnRlciA9IFBvaW50LmluQ2VudGVyKHRoaXMuQSwgdGhpcy5CLCB0aGlzLkMpXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgY29uc3QgcCA9IFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXVtpXVxuXG4gICAgICBjb25zdCBsYWJlbCA6IFBhcnRpYWw8TGFiZWw+ID0ge1xuICAgICAgICB0ZXh0cTogdGhpcy5kYXRhLmFuZ2xlTGFiZWxzW2ldLFxuICAgICAgICB0ZXh0OiB0aGlzLmRhdGEuYW5nbGVMYWJlbHNbaV0sXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCcsXG4gICAgICAgIHN0eWxlOiAnbm9ybWFsJyxcbiAgICAgICAgcG9zOiBQb2ludC5tZWFuKHAsIHAsIGluQ2VudGVyKVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5kYXRhLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSByb3VuZERQKHRoaXMuZGF0YS5hbmdsZXNbaV0sIDIpLnRvU3RyaW5nKCkgKyAnXlxcXFxjaXJjJ1xuICAgICAgICBsYWJlbC5zdHlsZWEgPSAnYW5zd2VyJ1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSBsYWJlbC50ZXh0cVxuICAgICAgICBsYWJlbC5zdHlsZWEgPSBsYWJlbC5zdHlsZXFcbiAgICAgIH1cblxuICAgICAgdGhpcy5sYWJlbHNbaV0gPSBsYWJlbCBhcyBMYWJlbFxuICAgIH1cblxuICAgIC8vIHJvdGF0ZSByYW5kb21seVxuICAgIHRoaXMucm90YXRpb24gPSAob3B0aW9ucy5yb3RhdGlvbiAhPT0gdW5kZWZpbmVkKSA/IHRoaXMucm90YXRlKG9wdGlvbnMucm90YXRpb24pIDogdGhpcy5yYW5kb21Sb3RhdGUoKVxuXG4gICAgLy8gc2NhbGUgYW5kIGZpdFxuICAgIC8vIHNjYWxlIHRvIHNpemVcbiAgICBjb25zdCBtYXJnaW4gPSAwXG4gICAgbGV0IHRvcGxlZnQgPSBQb2ludC5taW4oW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGxldCBib3R0b21yaWdodCA9IFBvaW50Lm1heChbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgY29uc3QgdG90YWxXaWR0aCA9IGJvdHRvbXJpZ2h0LnggLSB0b3BsZWZ0LnhcbiAgICBjb25zdCB0b3RhbEhlaWdodCA9IGJvdHRvbXJpZ2h0LnkgLSB0b3BsZWZ0LnlcbiAgICB0aGlzLnNjYWxlKE1hdGgubWluKCh3aWR0aCAtIG1hcmdpbikgLyB0b3RhbFdpZHRoLCAoaGVpZ2h0IC0gbWFyZ2luKSAvIHRvdGFsSGVpZ2h0KSkgLy8gMTVweCBtYXJnaW5cblxuICAgIC8vIG1vdmUgdG8gY2VudHJlXG4gICAgdG9wbGVmdCA9IFBvaW50Lm1pbihbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgYm90dG9tcmlnaHQgPSBQb2ludC5tYXgoW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGNvbnN0IGNlbnRlciA9IFBvaW50Lm1lYW4odG9wbGVmdCwgYm90dG9tcmlnaHQpXG4gICAgdGhpcy50cmFuc2xhdGUod2lkdGggLyAyIC0gY2VudGVyLngsIGhlaWdodCAvIDIgLSBjZW50ZXIueSkgLy8gY2VudHJlXG4gIH1cblxuICByZW5kZXIgKCkgOiB2b2lkIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG4gICAgaWYgKGN0eCA9PT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgZ2V0IGNhbnZhcyBjb250ZXh0JylcblxuICAgIGNvbnN0IHZlcnRpY2VzID0gW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdXG4gICAgY29uc3QgYXBleCA9IHRoaXMuZGF0YS5hcGV4IC8vIGhtbW1cblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGN0eC5tb3ZlVG8odGhpcy5BLngsIHRoaXMuQS55KVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGNvbnN0IHAgPSB2ZXJ0aWNlc1tpXVxuICAgICAgY29uc3QgbmV4dCA9IHZlcnRpY2VzWyhpICsgMSkgJSAzXVxuICAgICAgaWYgKGFwZXggPT09IGkgfHwgYXBleCA9PT0gKGkgKyAxKSAlIDMpIHsgLy8gdG8vZnJvbSBhcGV4IC0gZHJhdyBkYXNoZWQgbGluZVxuICAgICAgICBkYXNoZWRMaW5lKGN0eCwgcC54LCBwLnksIG5leHQueCwgbmV4dC55KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3R4LmxpbmVUbyhuZXh0LngsIG5leHQueSlcbiAgICAgIH1cbiAgICB9XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gJ2dyYXknXG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGdldCBhbGxwb2ludHMgKCkgOiBQb2ludFtdIHtcbiAgICBjb25zdCBhbGxwb2ludHMgPSBbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ11cbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4geyBhbGxwb2ludHMucHVzaChsLnBvcykgfSlcbiAgICByZXR1cm4gYWxscG9pbnRzXG4gIH1cbn1cbiIsIi8qIEV4dGVuZHMgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgaW4gb3JkZXIgdG8gZG8gaXNvc2NlbGVzIHRyaWFuZ2xlcywgd2hpY2ggZ2VuZXJhdGUgYSBiaXQgZGlmZmVyZW50bHkgKi9cblxuaW1wb3J0IHsgZmlyc3RVbmlxdWVJbmRleCB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5cbnR5cGUgT3B0aW9ucyA9IE1pc3NpbmdBbmdsZU9wdGlvbnMgJiB7Z2l2ZW5BbmdsZT86ICdhcGV4JyB8ICdiYXNlJ31cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBleHRlbmRzIE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBhcGV4PzogMCB8IDEgfCAyIHwgdW5kZWZpbmVkIC8vIHdoaWNoIG9mIHRoZSB0aHJlZSBnaXZlbiBhbmdsZXMgaXMgdGhlIGFwZXggb2YgYW4gaXNvc2NlbGVzIHRyaWFuZ2xlXG4gICAgY29uc3RydWN0b3IgKGFuZ2xlU3VtOiBudW1iZXIsIGFuZ2xlczogbnVtYmVyW10sIG1pc3Npbmc6IGJvb2xlYW5bXSwgYW5nbGVMYWJlbHM/OiBzdHJpbmdbXSwgYXBleD86IDB8MXwyfHVuZGVmaW5lZCkge1xuICAgICAgc3VwZXIoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZywgYW5nbGVMYWJlbHMpXG4gICAgICB0aGlzLmFwZXggPSBhcGV4XG4gICAgfVxuXG4gICAgc3RhdGljIHJhbmRvbVJlcGVhdGVkIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEge1xuICAgICAgb3B0aW9ucy5uTWlzc2luZyA9IDJcbiAgICAgIG9wdGlvbnMuZ2l2ZW5BbmdsZSA9IG9wdGlvbnMuZ2l2ZW5BbmdsZSB8fCBNYXRoLnJhbmRvbSgpIDwgMC41ID8gJ2FwZXgnIDogJ2Jhc2UnXG5cbiAgICAgIC8vIGdlbmVyYXRlIHRoZSByYW5kb20gYW5nbGVzIHdpdGggcmVwZXRpdGlvbiBmaXJzdCBiZWZvcmUgbWFya2luZyBhcGV4IGZvciBkcmF3aW5nXG4gICAgICBjb25zdCBxdWVzdGlvbiA9IHN1cGVyLnJhbmRvbVJlcGVhdGVkKG9wdGlvbnMpIGFzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEgLy8gYWxsb3dlZCBzaW5jZSB1bmRlZmluZWQgXFxpbiBhcGV4XG5cbiAgICAgIC8vIE9sZCBpbXBsZW1lbnRhdGlvbiBoYWQgc29ydGluZyB0aGUgYXJyYXkgLSBub3Qgc3VyZSB3aHlcbiAgICAgIC8vIHNvcnRUb2dldGhlcihxdWVzdGlvbi5hbmdsZXMscXVlc3Rpb24ubWlzc2luZywoeCx5KSA9PiB4IC0geSlcblxuICAgICAgcXVlc3Rpb24uYXBleCA9IGZpcnN0VW5pcXVlSW5kZXgocXVlc3Rpb24uYW5nbGVzKSBhcyAwIHwgMSB8IDJcbiAgICAgIHF1ZXN0aW9uLm1pc3NpbmcgPSBbdHJ1ZSwgdHJ1ZSwgdHJ1ZV1cblxuICAgICAgaWYgKG9wdGlvbnMuZ2l2ZW5BbmdsZSA9PT0gJ2FwZXgnKSB7XG4gICAgICAgIHF1ZXN0aW9uLm1pc3NpbmdbcXVlc3Rpb24uYXBleF0gPSBmYWxzZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcXVlc3Rpb24ubWlzc2luZ1socXVlc3Rpb24uYXBleCArIDEpICUgM10gPSBmYWxzZVxuICAgICAgfVxuXG4gICAgICBxdWVzdGlvbi5pbml0TGFiZWxzKClcblxuICAgICAgcmV0dXJuIHF1ZXN0aW9uXG4gICAgfVxuXG4gICAgaW5pdExhYmVscyAoKTogdm9pZCB7XG4gICAgICBjb25zdCBuID0gdGhpcy5hbmdsZXMubGVuZ3RoXG4gICAgICBsZXQgaiA9IDAgLy8ga2VlcCB0cmFjayBvZiB1bmtub3duc1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgaWYgKCF0aGlzLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzW2ldID0gYCR7dGhpcy5hbmdsZXNbaV0udG9TdHJpbmcoKX1eXFxcXGNpcmNgXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5hbmdsZUxhYmVsc1tpXSA9IGAke1N0cmluZy5mcm9tQ2hhckNvZGUoMTIwICsgail9XlxcXFxjaXJjYCAvLyAxMjAgPSAneCdcbiAgICAgICAgICBqKytcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbn1cbiIsIi8qIE1pc3NpbmcgYW5nbGVzIGluIHRyaWFuZ2xlIC0gbnVtZXJpY2FsICovXG5cbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc051bWJlckRhdGEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVPcHRpb25zIH0gZnJvbSAnLi9OdW1iZXJPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhITogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YVxuICB2aWV3ITogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlld1xuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFBhcnRpYWw8TWlzc2luZ0FuZ2xlT3B0aW9ucz4sIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucykge1xuICAgIGNvbnN0IG9wdGlvbnNPdmVycmlkZSA6IFBhcnRpYWw8TWlzc2luZ0FuZ2xlT3B0aW9ucz4gPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDI1LFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDNcbiAgICB9XG4gICAgY29uc3QgZGVmYXVsdHMgOiBNaXNzaW5nQW5nbGVPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAxNSxcbiAgICAgIG1pbk46IDIsXG4gICAgICBtYXhOOiA0LFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlLFxuICAgICAgbk1pc3Npbmc6IDFcbiAgICB9XG5cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zLCBvcHRpb25zT3ZlcnJpZGUpXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YS5yYW5kb20oc2V0dGluZ3MpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3KGRhdGEsIHZpZXdPcHRpb25zKVxuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBMaW5FeHByIHtcbi8vIGNsYXNzIExpbkV4cHIge1xuICBjb25zdHJ1Y3RvciAoYSwgYikge1xuICAgIHRoaXMuYSA9IGFcbiAgICB0aGlzLmIgPSBiXG4gIH1cblxuICBpc0NvbnN0YW50ICgpIHtcbiAgICByZXR1cm4gdGhpcy5hID09PSAwXG4gIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgbGV0IHN0cmluZyA9ICcnXG5cbiAgICAvLyB4IHRlcm1cbiAgICBpZiAodGhpcy5hID09PSAxKSB7IHN0cmluZyArPSAneCcgfSBlbHNlIGlmICh0aGlzLmEgPT09IC0xKSB7IHN0cmluZyArPSAnLXgnIH0gZWxzZSBpZiAodGhpcy5hICE9PSAwKSB7IHN0cmluZyArPSB0aGlzLmEgKyAneCcgfVxuXG4gICAgLy8gc2lnblxuICAgIGlmICh0aGlzLmEgIT09IDAgJiYgdGhpcy5iID4gMCkgeyBzdHJpbmcgKz0gJyArICcgfSBlbHNlIGlmICh0aGlzLmEgIT09IDAgJiYgdGhpcy5iIDwgMCkgeyBzdHJpbmcgKz0gJyAtICcgfVxuXG4gICAgLy8gY29uc3RhbnRcbiAgICBpZiAodGhpcy5iID4gMCkgeyBzdHJpbmcgKz0gdGhpcy5iIH0gZWxzZSBpZiAodGhpcy5iIDwgMCAmJiB0aGlzLmEgPT09IDApIHsgc3RyaW5nICs9IHRoaXMuYiB9IGVsc2UgaWYgKHRoaXMuYiA8IDApIHsgc3RyaW5nICs9IE1hdGguYWJzKHRoaXMuYikgfVxuXG4gICAgcmV0dXJuIHN0cmluZ1xuICB9XG5cbiAgdG9TdHJpbmdQICgpIHtcbiAgICAvLyByZXR1cm4gZXhwcmVzc2lvbiBhcyBhIHN0cmluZywgc3Vycm91bmRlZCBpbiBwYXJlbnRoZXNlcyBpZiBhIGJpbm9taWFsXG4gICAgaWYgKHRoaXMuYSA9PT0gMCB8fCB0aGlzLmIgPT09IDApIHJldHVybiB0aGlzLnRvU3RyaW5nKClcbiAgICBlbHNlIHJldHVybiAnKCcgKyB0aGlzLnRvU3RyaW5nKCkgKyAnKSdcbiAgfVxuXG4gIGV2YWwgKHgpIHtcbiAgICByZXR1cm4gdGhpcy5hICogeCArIHRoaXMuYlxuICB9XG5cbiAgYWRkICh0aGF0KSB7XG4gICAgLy8gYWRkIGVpdGhlciBhbiBleHByZXNzaW9uIG9yIGEgY29uc3RhbnRcbiAgICBpZiAodGhhdC5hICE9PSB1bmRlZmluZWQpIHJldHVybiBuZXcgTGluRXhwcih0aGlzLmEgKyB0aGF0LmEsIHRoaXMuYiArIHRoYXQuYilcbiAgICBlbHNlIHJldHVybiBuZXcgTGluRXhwcih0aGlzLmEsIHRoaXMuYiArIHRoYXQpXG4gIH1cblxuICB0aW1lcyAodGhhdCkge1xuICAgIHJldHVybiBuZXcgTGluRXhwcih0aGlzLmEgKiB0aGF0LCB0aGlzLmIgKiB0aGF0KVxuICB9XG5cbiAgc3RhdGljIHNvbHZlIChleHByMSwgZXhwcjIpIHtcbiAgICAvLyBzb2x2ZXMgdGhlIHR3byBleHByZXNzaW9ucyBzZXQgZXF1YWwgdG8gZWFjaCBvdGhlclxuICAgIHJldHVybiAoZXhwcjIuYiAtIGV4cHIxLmIpIC8gKGV4cHIxLmEgLSBleHByMi5hKVxuICB9XG59XG4iLCJpbXBvcnQgTGluRXhwciBmcm9tICdMaW5FeHByJ1xuXG4vKiogR2l2ZW4gYSBzZXQgb2YgZXhwcmVzc2lvbnMsIHNldCB0aGVpciBzdW0gICovXG5cbmV4cG9ydCBmdW5jdGlvbiBzb2x2ZUFuZ2xlcyAoZXhwcmVzc2lvbnM6IExpbkV4cHJbXSwgYW5nbGVTdW06IG51bWJlcik6IHsgeDogbnVtYmVyOyBhbmdsZXM6IG51bWJlcltdOyB9IHtcbiAgY29uc3QgZXhwcmVzc2lvblN1bSA9IGV4cHJlc3Npb25zLnJlZHVjZSgoZXhwMSwgZXhwMikgPT4gZXhwMS5hZGQoZXhwMikpXG4gIGNvbnN0IHggPSBMaW5FeHByLnNvbHZlKGV4cHJlc3Npb25TdW0sIG5ldyBMaW5FeHByKDAsIGFuZ2xlU3VtKSlcblxuICBjb25zdCBhbmdsZXMgOiBudW1iZXJbXSA9IFtdXG4gIGV4cHJlc3Npb25zLmZvckVhY2goZnVuY3Rpb24gKGV4cHIpIHtcbiAgICBjb25zdCBhbmdsZSA9IGV4cHIuZXZhbCh4KVxuICAgIGlmIChhbmdsZSA8PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ25lZ2F0aXZlIGFuZ2xlJylcbiAgICB9IGVsc2Uge1xuICAgICAgYW5nbGVzLnB1c2goZXhwci5ldmFsKHgpKVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gKHsgeDogeCwgYW5nbGVzOiBhbmdsZXMgfSlcbn1cbiIsImltcG9ydCBMaW5FeHByIGZyb20gJ0xpbkV4cHInXG5pbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4sIHJhbmRFbGVtLCByYW5kTXVsdEJldHdlZW4sIHNodWZmbGUsIHdlYWtJbmNsdWRlcyB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCB7IEFsZ2VicmFPcHRpb25zIH0gZnJvbSAnLi9BbGdlYnJhT3B0aW9ucydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzRGF0YSdcbmltcG9ydCB7IHNvbHZlQW5nbGVzIH0gZnJvbSAnLi9zb2x2ZUFuZ2xlcydcblxuZXhwb3J0IHR5cGUgRXhwcmVzc2lvblR5cGUgPSAnYWRkJyB8ICdtdWx0aXBseScgfCAnbWl4ZWQnXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgaW1wbGVtZW50cyBNaXNzaW5nQW5nbGVzRGF0YSB7XG4gICAgYW5nbGVzOiBudW1iZXJbXVxuICAgIG1pc3Npbmc6IGJvb2xlYW5bXVxuICAgIGFuZ2xlU3VtOiBudW1iZXJcbiAgICBhbmdsZUxhYmVsczogc3RyaW5nW11cbiAgICB4OiBudW1iZXIgLy9cblxuICAgIGNvbnN0cnVjdG9yIChhbmdsZXM6IG51bWJlcltdLCBtaXNzaW5nOiBib29sZWFuW10sIGFuZ2xlU3VtOiBudW1iZXIsIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSwgeDogbnVtYmVyKSB7XG4gICAgICB0aGlzLmFuZ2xlcyA9IGFuZ2xlc1xuICAgICAgdGhpcy5hbmdsZVN1bSA9IGFuZ2xlU3VtXG4gICAgICB0aGlzLmFuZ2xlTGFiZWxzID0gYW5nbGVMYWJlbHNcbiAgICAgIHRoaXMueCA9IHhcbiAgICAgIHRoaXMubWlzc2luZyA9IG1pc3NpbmdcbiAgICB9XG5cbiAgICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBBbGdlYnJhT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEge1xuICAgICAgLy8gY2FsY3VsYXRlZCBkZWZhdWx0cyBpZiBuZWNlc3NhcnlcbiAgICAgIG9wdGlvbnMubWF4Q29uc3RhbnQgPSBvcHRpb25zLm1heENvbnN0YW50IHx8IG9wdGlvbnMuYW5nbGVTdW0hIC8gMiAvLyBndWFyYW50ZWVkIG5vbi1udWxsIGZyb20gYWJvdmVcbiAgICAgIG9wdGlvbnMubWF4WFZhbHVlID0gb3B0aW9ucy5tYXhYVmFsdWUgfHwgb3B0aW9ucy5hbmdsZVN1bSEgLyA0XG5cbiAgICAgIC8vIFJhbmRvbWlzZS9zZXQgdXAgbWFpbiBmZWF0dXJlc1xuICAgICAgY29uc3QgbiA6IG51bWJlciA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTiwgb3B0aW9ucy5tYXhOKVxuXG4gICAgICBjb25zdCB0eXBlIDogRXhwcmVzc2lvblR5cGUgPSByYW5kRWxlbShvcHRpb25zLmV4cHJlc3Npb25UeXBlcyEpIC8vIGd1YXJhbnRlZWQgbm9uLW51bGwgZnJvbSBkZWZhdWwgYXNzaWdubWVudFxuXG4gICAgICAvLyBHZW5lcmF0ZSBleHByZXNzaW9ucy9hbmdsZXNcbiAgICAgIGxldCBleHByZXNzaW9ucyA6IExpbkV4cHJbXVxuICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ21peGVkJzpcbiAgICAgICAgICBleHByZXNzaW9ucyA9IG1ha2VNaXhlZEV4cHJlc3Npb25zKG4sIG9wdGlvbnMgYXMgUmVxdWlyZWQ8QWxnZWJyYU9wdGlvbnM+KVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ211bHRpcGx5JzpcbiAgICAgICAgICBleHByZXNzaW9ucyA9IG1ha2VNdWx0aXBsaWNhdGlvbkV4cHJlc3Npb25zKG4sIG9wdGlvbnMgYXMgUmVxdWlyZWQ8QWxnZWJyYU9wdGlvbnM+KVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ2FkZCc6XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgZXhwcmVzc2lvbnMgPSBtYWtlQWRkRXhwcmVzc2lvbnMobiwgb3B0aW9ucyBhcyBSZXF1aXJlZDxBbGdlYnJhT3B0aW9ucz4pXG4gICAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGV4cHJlc3Npb25zID0gc2h1ZmZsZShleHByZXNzaW9ucylcblxuICAgICAgLy8gU29sdmUgZm9yIHggYW5kIGFuZ2xlc1xuICAgICAgY29uc3QgeyB4LCBhbmdsZXMgfSA6IHt4Om51bWJlciwgYW5nbGVzOiBudW1iZXJbXX0gPSBzb2x2ZUFuZ2xlcyhleHByZXNzaW9ucywgb3B0aW9ucy5hbmdsZVN1bSEpIC8vIG5vbi1udWxsIGZyb20gZGVmYXVsdCBhc3NpZ25lbWVudFxuXG4gICAgICAvLyBsYWJlbHMgYXJlIGp1c3QgZXhwcmVzc2lvbnMgYXMgc3RyaW5nc1xuICAgICAgY29uc3QgbGFiZWxzID0gZXhwcmVzc2lvbnMubWFwKGUgPT4gYCR7ZS50b1N0cmluZ1AoKX1eXFxcXGNpcmNgKVxuXG4gICAgICAvLyBtaXNzaW5nIHZhbHVlcyBhcmUgdGhlIG9uZXMgd2hpY2ggYXJlbid0IGNvbnN0YW50XG4gICAgICBjb25zdCBtaXNzaW5nID0gZXhwcmVzc2lvbnMubWFwKGUgPT4gIWUuaXNDb25zdGFudCgpKVxuXG4gICAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YShhbmdsZXMsIG1pc3NpbmcsIG9wdGlvbnMuYW5nbGVTdW0hLCBsYWJlbHMsIHgpXG4gICAgfVxuXG4gICAgLy8gbWFrZXMgdHlwZXNjcmlwdCBzaHV0IHVwLCBtYWtlcyBlc2xpbnQgbm9pc3lcbiAgICBpbml0TGFiZWxzICgpIDogdm9pZCB7fSAgLy8gZXNsaW50LWRpc2FibGUtbGluZVxufVxuXG5mdW5jdGlvbiBtYWtlTWl4ZWRFeHByZXNzaW9ucyAobjogbnVtYmVyLCBvcHRpb25zOiBSZXF1aXJlZDxBbGdlYnJhT3B0aW9ucz4pIDogTGluRXhwcltdIHtcbiAgY29uc3QgZXhwcmVzc2lvbnM6IExpbkV4cHJbXSA9IFtdXG4gIGNvbnN0IHggPSByYW5kQmV0d2VlbihvcHRpb25zLm1pblhWYWx1ZSwgb3B0aW9ucy5tYXhYVmFsdWUpXG4gIGxldCBsZWZ0ID0gb3B0aW9ucy5hbmdsZVN1bVxuICBsZXQgYWxsY29uc3RhbnQgPSB0cnVlXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbiAtIDE7IGkrKykge1xuICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbigxLCBvcHRpb25zLm1heENvZWZmaWNpZW50KVxuICAgIGxlZnQgLT0gYSAqIHhcbiAgICBjb25zdCBtYXhiID0gTWF0aC5taW4obGVmdCAtIG9wdGlvbnMubWluQW5nbGUgKiAobiAtIGkgLSAxKSwgb3B0aW9ucy5tYXhDb25zdGFudClcbiAgICBjb25zdCBtaW5iID0gb3B0aW9ucy5taW5BbmdsZSAtIGEgKiB4XG4gICAgY29uc3QgYiA9IHJhbmRCZXR3ZWVuKG1pbmIsIG1heGIpXG4gICAgaWYgKGEgIT09IDApIHsgYWxsY29uc3RhbnQgPSBmYWxzZSB9XG4gICAgbGVmdCAtPSBiXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihhLCBiKSlcbiAgfVxuICBjb25zdCBsYXN0TWluWENvZWZmID0gYWxsY29uc3RhbnQgPyAxIDogb3B0aW9ucy5taW5Db2VmZmljaWVudFxuICBjb25zdCBhID0gcmFuZEJldHdlZW4obGFzdE1pblhDb2VmZiwgb3B0aW9ucy5tYXhDb2VmZmljaWVudClcbiAgY29uc3QgYiA9IGxlZnQgLSBhICogeFxuICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKGEsIGIpKVxuXG4gIHJldHVybiBleHByZXNzaW9uc1xufVxuXG5mdW5jdGlvbiBtYWtlQWRkRXhwcmVzc2lvbnMgKG46IG51bWJlciwgb3B0aW9uczogUmVxdWlyZWQ8QWxnZWJyYU9wdGlvbnM+KSA6IExpbkV4cHJbXSB7XG4gIGNvbnN0IGV4cHJlc3Npb25zOiBMaW5FeHByW10gPSBbXVxuICBjb25zdCBhbmdsZXM6IG51bWJlcltdID0gW11cbiAgY29uc3QgY29uc3RhbnRzID0gKG9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cyA9PT0gdHJ1ZSB8fCB3ZWFrSW5jbHVkZXMob3B0aW9ucy5pbmNsdWRlQ29uc3RhbnRzLCAnYWRkJykpXG4gIGlmIChuID09PSAyICYmIG9wdGlvbnMuZW5zdXJlWCAmJiBjb25zdGFudHMpIG4gPSAzXG5cbiAgY29uc3QgeCA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluWFZhbHVlLCBvcHRpb25zLm1heFhWYWx1ZSlcbiAgbGV0IGxlZnQgPSBvcHRpb25zLmFuZ2xlU3VtXG4gIGxldCBhbmdsZXNMZWZ0ID0gblxuXG4gIC8vIGZpcnN0IGRvIHRoZSBleHByZXNzaW9ucyBlbnN1cmVkIGJ5IGVuc3VyZV94IGFuZCBjb25zdGFudHNcbiAgaWYgKG9wdGlvbnMuZW5zdXJlWCkge1xuICAgIGFuZ2xlc0xlZnQtLVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgMCkpXG4gICAgYW5nbGVzLnB1c2goeClcbiAgICBsZWZ0IC09IHhcbiAgfVxuXG4gIGlmIChjb25zdGFudHMpIHtcbiAgICBhbmdsZXNMZWZ0LS1cbiAgICBjb25zdCBjID0gcmFuZEJldHdlZW4oXG4gICAgICBvcHRpb25zLm1pbkFuZ2xlLFxuICAgICAgbGVmdCAtIG9wdGlvbnMubWluQW5nbGUgKiBhbmdsZXNMZWZ0XG4gICAgKVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMCwgYykpXG4gICAgYW5nbGVzLnB1c2goYylcbiAgICBsZWZ0IC09IGNcbiAgfVxuXG4gIC8vIG1pZGRsZSBhbmdsZXNcbiAgd2hpbGUgKGFuZ2xlc0xlZnQgPiAxKSB7XG4gICAgLy8gYWRkICd4K2InIGFzIGFuIGV4cHJlc3Npb24uIE1ha2Ugc3VyZSBiIGdpdmVzIHNwYWNlXG4gICAgYW5nbGVzTGVmdC0tXG4gICAgbGVmdCAtPSB4XG4gICAgY29uc3QgbWF4YiA9IE1hdGgubWluKFxuICAgICAgbGVmdCAtIG9wdGlvbnMubWluQW5nbGUgKiBhbmdsZXNMZWZ0LFxuICAgICAgb3B0aW9ucy5tYXhDb25zdGFudFxuICAgIClcbiAgICBjb25zdCBtaW5iID0gTWF0aC5tYXgoXG4gICAgICBvcHRpb25zLm1pbkFuZ2xlIC0geCxcbiAgICAgIC1vcHRpb25zLm1heENvbnN0YW50XG4gICAgKVxuICAgIGNvbnN0IGIgPSByYW5kQmV0d2VlbihtaW5iLCBtYXhiKVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgYikpXG4gICAgYW5nbGVzLnB1c2goeCArIGIpXG4gICAgbGVmdCAtPSBiXG4gIH1cblxuICAvLyBsYXN0IGFuZ2xlXG4gIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgbGVmdCAtIHgpKVxuICBhbmdsZXMucHVzaChsZWZ0KVxuXG4gIHJldHVybiBleHByZXNzaW9uc1xufVxuXG5mdW5jdGlvbiBtYWtlTXVsdGlwbGljYXRpb25FeHByZXNzaW9ucyAobjogbnVtYmVyLCBvcHRpb25zOiBBbGdlYnJhT3B0aW9ucykgOiBMaW5FeHByW10ge1xuICBjb25zdCBleHByZXNzaW9ucyA6IExpbkV4cHJbXSA9IFtdXG5cbiAgY29uc3QgY29uc3RhbnRzIDogYm9vbGVhbiA9IChvcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPT09IHRydWUgfHwgd2Vha0luY2x1ZGVzKG9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cywgJ211bHQnKSlcbiAgaWYgKG4gPT09IDIgJiYgb3B0aW9ucy5lbnN1cmVYICYmIGNvbnN0YW50cykgbiA9IDMgLy8gbmVlZCBhdCBsZWFzdCAzIGFuZ2xlcyBmb3IgdGhpcyB0byBtYWtlIHNlbnNlXG5cbiAgLy8gY2hvb3NlIGEgdG90YWwgb2YgY29lZmZpY2llbnRzXG4gIC8vIHBpY2sgeCBiYXNlZCBvbiB0aGF0XG4gIGxldCBhbmdsZXNsZWZ0ID0gblxuICBjb25zdCB0b3RhbENvZWZmID0gY29uc3RhbnRzXG4gICAgPyByYW5kQmV0d2VlbihuLCAob3B0aW9ucy5hbmdsZVN1bSAtIG9wdGlvbnMubWluQW5nbGUpIC8gb3B0aW9ucy5taW5BbmdsZSwgTWF0aC5yYW5kb20pIC8vIGlmIGl0J3MgdG9vIGJpZywgYW5nbGVzIGdldCB0b28gc21hbGxcbiAgICA6IHJhbmRFbGVtKFszLCA0LCA1LCA2LCA4LCA5LCAxMF0uZmlsdGVyKHggPT4geCA+PSBuKSwgTWF0aC5yYW5kb20pXG4gIGxldCBjb2VmZmxlZnQgPSB0b3RhbENvZWZmXG5cbiAgLy8gZmlyc3QgMC8xLzJcbiAgaWYgKGNvbnN0YW50cykge1xuICAgIC8vIHJlZHVjZSB0byBtYWtlIHdoYXQncyBsZWZ0IGEgbXVsdGlwbGUgb2YgdG90YWxfY29lZmZcbiAgICBhbmdsZXNsZWZ0LS1cbiAgICBjb25zdCBuZXdsZWZ0ID0gcmFuZE11bHRCZXR3ZWVuKHRvdGFsQ29lZmYgKiBvcHRpb25zLm1pbkFuZ2xlLCBvcHRpb25zLmFuZ2xlU3VtIC0gb3B0aW9ucy5taW5BbmdsZSwgdG90YWxDb2VmZilcbiAgICBjb25zdCBjID0gb3B0aW9ucy5hbmdsZVN1bSAtIG5ld2xlZnRcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDAsIGMpKVxuICB9XG5cbiAgLy8gRG9uJ3QgdXNlIHggaGVyZSwgYnV0OlxuICAvLyB4ID0gbGVmdCAvIHRvdGFsQ29lZmZcblxuICBpZiAob3B0aW9ucy5lbnN1cmVYKSB7XG4gICAgYW5nbGVzbGVmdC0tXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCAwKSlcbiAgICBjb2VmZmxlZnQgLT0gMVxuICB9XG5cbiAgLy8gbWlkZGxlXG4gIHdoaWxlIChhbmdsZXNsZWZ0ID4gMSkge1xuICAgIGFuZ2xlc2xlZnQtLVxuICAgIGNvbnN0IG1pbmEgPSAxXG4gICAgY29uc3QgbWF4YSA9IGNvZWZmbGVmdCAtIGFuZ2xlc2xlZnQgLy8gbGVhdmUgZW5vdWdoIGZvciBvdGhlcnMgVE9ETzogYWRkIG1heF9jb2VmZlxuICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbihtaW5hLCBtYXhhKVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoYSwgMCkpXG4gICAgY29lZmZsZWZ0IC09IGFcbiAgfVxuXG4gIC8vIGxhc3RcbiAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihjb2VmZmxlZnQsIDApKVxuICByZXR1cm4gZXhwcmVzc2lvbnNcbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3IGV4dGVuZHMgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcge1xuICAvLyBPIDogUG9pbnQgICAgICBJbmhlcml0ZWQgZnJvbSBNaXNzaW5nQW5nbGVzQXJvdW5kVmlld1xuICAvLyBBOiBQb2ludCAgICAgICAgIHxcbiAgLy8gQzogUG9pbnRbXSAgICAgICB8XG4gIC8vIHJvdGF0aW9uOiBudW1iZXIgVlxuXG4gICAgLy8gbGFiZWxzOiBMYWJlbFtdICAgICAgICAgICAgSW5oZXJpdGVkIGZyb20gR3JhcGhpY1FWaWV3XG4gICAgLy8gY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCAgICAgIHxcbiAgICAvLyBET006IEhUTUxFbGVtZW50ICAgICAgICAgICAgICAgfFxuICAgIC8vIHdpZHRoOiBudW1iZXIgICAgICAgICAgICAgICAgICB8XG4gICAgLy8gaGVpZ2h0OiBudW1iZXIgICAgICAgICAgICAgICAgIFZcbiAgICBkYXRhITogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIC8vIGluaXRpYWxpc2VkIGJ5IHN1cGVyKClcblxuICAgIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEsIG9wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykge1xuICAgICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc3VwZXIgY29uc3RydWN0b3IgZG9lcyByZWFsIHdvcmtcbiAgICAgIGNvbnN0IHNvbHV0aW9uTGFiZWw6IFBhcnRpYWw8TGFiZWw+ID0ge1xuICAgICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdGhpcy5oZWlnaHQgLSAxMCksXG4gICAgICAgIHRleHRxOiAnJyxcbiAgICAgICAgdGV4dGE6IGB4ID0gJHt0aGlzLmRhdGEueH1eXFxcXGNpcmNgLFxuICAgICAgICBzdHlsZXE6ICdoaWRkZW4nLFxuICAgICAgICBzdHlsZWE6ICdleHRyYS1hbnN3ZXInXG4gICAgICB9XG4gICAgICBzb2x1dGlvbkxhYmVsLnN0eWxlID0gc29sdXRpb25MYWJlbC5zdHlsZXFcbiAgICAgIHNvbHV0aW9uTGFiZWwudGV4dCA9IHNvbHV0aW9uTGFiZWwudGV4dHFcblxuICAgICAgdGhpcy5sYWJlbHMucHVzaChzb2x1dGlvbkxhYmVsIGFzIExhYmVsKVxuICAgIH1cbn1cbiIsIi8qKiBNaXNzaW5nIGFuZ2xlcyBhcm91bmQgYSBwb2ludCBvciBvbiBhIHN0cmFpZ2h0IGxpbmUsIHVzaW5nIGFsZ2VicmFpYyBleHByZXNzaW9ucyAqL1xuXG5pbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCB7IEFsZ2VicmFPcHRpb25zIH0gZnJvbSAnLi9BbGdlYnJhT3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3J1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzVmlld09wdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSAvLyBpbml0aWFsaXNlZCBpbiBzdXBlcigpXG4gIHZpZXchOiBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXdcblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBQYXJ0aWFsPEFsZ2VicmFPcHRpb25zPiwgdmlld09wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEge1xuICAgIGNvbnN0IGRlZmF1bHRzIDogQWxnZWJyYU9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDE1LFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDQsXG4gICAgICByZXBlYXRlZDogZmFsc2UsXG4gICAgICBleHByZXNzaW9uVHlwZXM6IFsnYWRkJywgJ211bHRpcGx5JywgJ21peGVkJ10sXG4gICAgICBlbnN1cmVYOiB0cnVlLFxuICAgICAgaW5jbHVkZUNvbnN0YW50czogdHJ1ZSxcbiAgICAgIG1pbkNvZWZmaWNpZW50OiAxLFxuICAgICAgbWF4Q29lZmZpY2llbnQ6IDQsXG4gICAgICBtaW5YVmFsdWU6IDE1XG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzOiBBbGdlYnJhT3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YS5yYW5kb20oc2V0dGluZ3MpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcoZGF0YSwgdmlld09wdGlvbnMpIC8vIFRPRE8gZWxpbWluYXRlIHB1YmxpYyBjb25zdHJ1Y3RvcnNcblxuICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG5cbiAgc3RhdGljIGdldCBvcHRpb25zU3BlYyAoKSA6IE9wdGlvbnNTcGVjIHtcbiAgICByZXR1cm4gW1xuICAgICAge1xuICAgICAgICBpZDogJ2V4cHJlc3Npb25UeXBlcycsXG4gICAgICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICAgICAgdGl0bGU6ICdUeXBlcyBvZiBleHByZXNzaW9uJyxcbiAgICAgICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgICAgIHsgdGl0bGU6ICc8ZW0+YTwvZW0+KzxlbT54PC9lbT4nLCBpZDogJ2FkZCcgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnPGVtPmF4PC9lbT4nLCBpZDogJ211bHRpcGx5JyB9LFxuICAgICAgICAgIHsgdGl0bGU6ICdtaXhlZCcsIGlkOiAnbWl4ZWQnIH1cbiAgICAgICAgXSxcbiAgICAgICAgZGVmYXVsdDogWydhZGQnLCAnbXVsdGlwbHknLCAnbWl4ZWQnXVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgaWQ6ICdlbnN1cmVYJyxcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJ0Vuc3VyZSBvbmUgYW5nbGUgaXMgPGVtPng8L2VtPicsXG4gICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiAnaW5jbHVkZUNvbnN0YW50cycsXG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgdGl0bGU6ICdFbnN1cmUgYSBjb25zdGFudCBhbmdsZScsXG4gICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgIH1cbiAgICBdXG4gIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3J1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldyBleHRlbmRzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcge1xuICBkYXRhITogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIC8vIGluaXRpYWxpc2VkIGluIHN1cGVyLnN1cGVyXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEsIG9wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucylcblxuICAgIGNvbnN0IHNvbHV0aW9uTGFiZWw6IFBhcnRpYWw8TGFiZWw+ID0ge1xuICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIHRoaXMuaGVpZ2h0IC0gMTApLFxuICAgICAgdGV4dHE6ICcnLFxuICAgICAgdGV4dGE6IGB4ID0gJHt0aGlzLmRhdGEueH1eXFxcXGNpcmNgLFxuICAgICAgc3R5bGVxOiAnaGlkZGVuJyxcbiAgICAgIHN0eWxlYTogJ2V4dHJhLWFuc3dlcidcbiAgICB9XG4gICAgc29sdXRpb25MYWJlbC5zdHlsZSA9IHNvbHV0aW9uTGFiZWwuc3R5bGVxXG4gICAgc29sdXRpb25MYWJlbC50ZXh0ID0gc29sdXRpb25MYWJlbC50ZXh0cVxuXG4gICAgdGhpcy5sYWJlbHMucHVzaChzb2x1dGlvbkxhYmVsIGFzIExhYmVsKVxuICB9XG59XG4iLCJpbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tICcuL0FsZ2VicmFPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFWaWV3J1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3J1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YVxuICB2aWV3ITogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlld1xuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFBhcnRpYWw8QWxnZWJyYU9wdGlvbnM+LCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEge1xuICAgIGNvbnN0IG9wdGlvbnNPdmVycmlkZSA6IFBhcnRpYWw8QWxnZWJyYU9wdGlvbnM+ID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbk46IDMsXG4gICAgICBtYXhOOiAzLFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlXG4gICAgfVxuICAgIGNvbnN0IGRlZmF1bHRzIDogQWxnZWJyYU9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDMsXG4gICAgICByZXBlYXRlZDogZmFsc2UsXG4gICAgICBtaW5BbmdsZTogMjUsXG4gICAgICBleHByZXNzaW9uVHlwZXM6IFsnYWRkJywgJ211bHRpcGx5JywgJ21peGVkJ10sXG4gICAgICBlbnN1cmVYOiB0cnVlLFxuICAgICAgaW5jbHVkZUNvbnN0YW50czogdHJ1ZSxcbiAgICAgIG1pbkNvZWZmaWNpZW50OiAxLFxuICAgICAgbWF4Q29lZmZpY2llbnQ6IDQsXG4gICAgICBtaW5YVmFsdWU6IDE1XG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzOiBBbGdlYnJhT3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zLCBvcHRpb25zT3ZlcnJpZGUpXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLnJhbmRvbShzZXR0aW5ncylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFWaWV3KGRhdGEsIHZpZXdPcHRpb25zKVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBMYWJlbCB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3J1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXcgZXh0ZW5kcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IHtcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIC8vIGluaXRpYWxpc2VkIGluIHN1cGVyXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSwgb3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKVxuICAgIHN1cGVyLnNjYWxlVG9GaXQodGhpcy53aWR0aCwgdGhpcy5oZWlnaHQsIDQwKVxuICAgIHN1cGVyLnRyYW5zbGF0ZSgwLCAtMzApXG5cbiAgICBjb25zdCBpbnN0cnVjdGlvbkxhYmVsOiBMYWJlbCA9IHtcbiAgICAgIHRleHRxOiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICB0ZXh0YTogdGhpcy5kYXRhLmluc3RydWN0aW9ucy5qb2luKCdcXFxcXFxcXCcpLFxuICAgICAgdGV4dDogdGhpcy5kYXRhLmluc3RydWN0aW9ucy5qb2luKCdcXFxcXFxcXCcpLFxuICAgICAgc3R5bGVxOiAnZXh0cmEtaW5mbycsXG4gICAgICBzdHlsZWE6ICdleHRyYS1pbmZvJyxcbiAgICAgIHN0eWxlOiAnZXh0cmEtaW5mbycsXG4gICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdGhpcy5oZWlnaHQgLSAxMClcbiAgICB9XG4gICAgdGhpcy5sYWJlbHMucHVzaChpbnN0cnVjdGlvbkxhYmVsKVxuICB9XG59XG4iLCJpbXBvcnQgTGluRXhwciBmcm9tICdMaW5FeHByJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4sIHJhbmRFbGVtLCByYW5kTXVsdEJldHdlZW4gfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUURhdGEgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEnXG5pbXBvcnQgeyBzb2x2ZUFuZ2xlcyB9IGZyb20gJy4vc29sdmVBbmdsZXMnXG5pbXBvcnQgeyBXb3JkZWRPcHRpb25zIH0gZnJvbSAnLi9Xb3JkZWRPcHRpb25zJ1xuXG5leHBvcnQgdHlwZSBXb3JkZWRUeXBlID0gJ2FkZCcgfCAnbXVsdGlwbHknIHwgJ3JhdGlvJyB8ICdwZXJjZW50J1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSBpbXBsZW1lbnRzIEdyYXBoaWNRRGF0YSB7XG4gIGFuZ2xlczogbnVtYmVyW11cbiAgbWlzc2luZzogYm9vbGVhbltdXG4gIGFuZ2xlU3VtOiBudW1iZXJcbiAgYW5nbGVMYWJlbHM6IHN0cmluZ1tdXG4gIGluc3RydWN0aW9uczogc3RyaW5nW10gLy8gVGhlICdpbnN0cnVjdGlvbnMnIGdpdmVuXG5cbiAgY29uc3RydWN0b3IgKGFuZ2xlczogbnVtYmVyW10sIG1pc3Npbmc6IGJvb2xlYW5bXSwgYW5nbGVTdW06IG51bWJlciwgYW5nbGVMYWJlbHM6IHN0cmluZ1tdLCBpbnN0cnVjdGlvbnM6IHN0cmluZ1tdKSB7XG4gICAgdGhpcy5hbmdsZXMgPSBhbmdsZXNcbiAgICB0aGlzLm1pc3NpbmcgPSBtaXNzaW5nXG4gICAgdGhpcy5hbmdsZVN1bSA9IGFuZ2xlU3VtXG4gICAgdGhpcy5hbmdsZUxhYmVscyA9IGFuZ2xlTGFiZWxzXG4gICAgdGhpcy5pbnN0cnVjdGlvbnMgPSBpbnN0cnVjdGlvbnNcbiAgICB0aGlzLmluc3RydWN0aW9ucyA9IGluc3RydWN0aW9uc1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9ucyA6IFdvcmRlZE9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEge1xuICAgIGNvbnN0IG4gPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbk4sIG9wdGlvbnMubWF4TilcbiAgICBjb25zdCBhbmdsZUxhYmVsczogc3RyaW5nW10gPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBhbmdsZUxhYmVsc1tpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKSAvLyA2NSA9ICdBJ1xuICAgIH1cbiAgICBsZXQgZXhwcmVzc2lvbnM6IExpbkV4cHJbXSA9IFtdXG4gICAgbGV0IGluc3RydWN0aW9uczogc3RyaW5nW10gPSBbXVxuXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCAwKSlcblxuICAgIC8vIExvb3AgdGlsIHdlIGdldCBvbmUgdGhhdCB3b3Jrc1xuICAgIC8vIFByb2JhYmx5IHJlYWxseSBpbmVmZmljaWVudCEhXG5cbiAgICBsZXQgc3VjY2VzcyA9IGZhbHNlXG4gICAgbGV0IGF0dGVtcHRjb3VudCA9IDBcbiAgICB3aGlsZSAoIXN1Y2Nlc3MpIHtcbiAgICAgIGlmIChhdHRlbXB0Y291bnQgPiAyMCkge1xuICAgICAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKVxuICAgICAgICBjb25zb2xlLmxvZygnR2F2ZSB1cCBhZnRlciAnICsgYXR0ZW1wdGNvdW50ICsgJyBhdHRlbXB0cycpXG4gICAgICAgIHN1Y2Nlc3MgPSB0cnVlXG4gICAgICB9XG4gICAgICBmb3IgKGxldCBpID0gMTsgaSA8IG47IGkrKykge1xuICAgICAgICBjb25zdCB0eXBlID0gcmFuZEVsZW0ob3B0aW9ucy50eXBlcylcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgY2FzZSAnYWRkJzoge1xuICAgICAgICAgICAgY29uc3QgYWRkZW5kID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5BZGRlbmQsIG9wdGlvbnMubWF4QWRkZW5kKVxuICAgICAgICAgICAgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uc1tpIC0gMV0uYWRkKGFkZGVuZCkpXG4gICAgICAgICAgICBpbnN0cnVjdGlvbnMucHVzaChgXFxcXHRleHR7QW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpfSQgaXMgJHtjb21wYXJhdG9yKGFkZGVuZCwgJysnKX0gYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NCArIGkpfSR9YClcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ211bHRpcGx5Jzoge1xuICAgICAgICAgICAgY29uc3QgbXVsdGlwbGllciA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTXVsdGlwbGllciwgb3B0aW9ucy5tYXhNdWx0aXBsaWVyKVxuICAgICAgICAgICAgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uc1tpIC0gMV0udGltZXMobXVsdGlwbGllcikpXG4gICAgICAgICAgICBpbnN0cnVjdGlvbnMucHVzaChgXFxcXHRleHR7QW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpfSQgaXMgJHtjb21wYXJhdG9yKG11bHRpcGxpZXIsICcqJyl9IGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjQgKyBpKX0kfWApXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlICdwZXJjZW50Jzoge1xuICAgICAgICAgICAgY29uc3QgcGVyY2VudGFnZSA9IHJhbmRNdWx0QmV0d2Vlbig1LCAxMDAsIDUpXG4gICAgICAgICAgICBjb25zdCBpbmNyZWFzZSA9IE1hdGgucmFuZG9tKCkgPCAwLjVcbiAgICAgICAgICAgIGNvbnN0IG11bHRpcGxpZXIgPSBpbmNyZWFzZSA/IDEgKyBwZXJjZW50YWdlIC8gMTAwIDogMSAtIHBlcmNlbnRhZ2UgLyAxMDBcbiAgICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2goZXhwcmVzc2lvbnNbaSAtIDFdLnRpbWVzKG11bHRpcGxpZXIpKVxuICAgICAgICAgICAgaW5zdHJ1Y3Rpb25zLnB1c2goXG4gICAgICAgICAgICAgIGBcXFxcdGV4dHtBbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSl9JCBpcyAkJHtwZXJjZW50YWdlfVxcXFwlJCAke2luY3JlYXNlID8gJ2JpZ2dlcicgOiAnc21hbGxlcid9IHRoYW4gYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NCArIGkpfSR9YClcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ3JhdGlvJzoge1xuICAgICAgICAgICAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKDEsIDEwKVxuICAgICAgICAgICAgY29uc3QgYiA9IHJhbmRCZXR3ZWVuKDEsIDEwKVxuICAgICAgICAgICAgY29uc3QgbXVsdGlwbGllciA9IGIgLyBhXG4gICAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb25zW2kgLSAxXS50aW1lcyhtdWx0aXBsaWVyKSlcbiAgICAgICAgICAgIGluc3RydWN0aW9ucy5wdXNoKFxuICAgICAgICAgICAgICBgXFxcXHRleHR7VGhlIHJhdGlvIG9mIGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjQgKyBpKX0kIHRvIGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKX0kIGlzICQke2F9OiR7Yn0kfWBcbiAgICAgICAgICAgIClcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGNoZWNrIGl0IG1ha2VzIHNlbnNlXG4gICAgICBzdWNjZXNzID0gdHJ1ZVxuICAgICAgY29uc3QgZXhwcmVzc2lvbnN1bSA9IGV4cHJlc3Npb25zLnJlZHVjZSgoZXhwMSwgZXhwMikgPT4gZXhwMS5hZGQoZXhwMikpXG4gICAgICBjb25zdCB4ID0gTGluRXhwci5zb2x2ZShleHByZXNzaW9uc3VtLCBuZXcgTGluRXhwcigwLCBvcHRpb25zLmFuZ2xlU3VtKSlcblxuICAgICAgZXhwcmVzc2lvbnMuZm9yRWFjaChmdW5jdGlvbiAoZXhwcikge1xuICAgICAgICBpZiAoIXN1Y2Nlc3MgfHwgZXhwci5ldmFsKHgpIDwgb3B0aW9ucy5taW5BbmdsZSkge1xuICAgICAgICAgIHN1Y2Nlc3MgPSBmYWxzZVxuICAgICAgICAgIGluc3RydWN0aW9ucyA9IFtdXG4gICAgICAgICAgZXhwcmVzc2lvbnMgPSBbZXhwcmVzc2lvbnNbMF1dXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIGF0dGVtcHRjb3VudCsrXG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdBdHRlbXB0czogJyArIGF0dGVtcHRjb3VudClcblxuICAgIGNvbnN0IGFuZ2xlcyA9IHNvbHZlQW5nbGVzKGV4cHJlc3Npb25zLCBvcHRpb25zLmFuZ2xlU3VtKS5hbmdsZXNcbiAgICBjb25zdCBtaXNzaW5nID0gYW5nbGVzLm1hcCgoKSA9PiB0cnVlKVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGFuZ2xlcywgbWlzc2luZywgb3B0aW9ucy5hbmdsZVN1bSwgYW5nbGVMYWJlbHMsIGluc3RydWN0aW9ucylcbiAgfVxuXG4gIC8vIG1ha2VzIHR5cGVzY3JpcHQgc2h1dCB1cCwgbWFrZXMgZXNsaW50IG5vaXN5XG4gIGluaXRMYWJlbHMoKTogdm9pZCB7IH0gIC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZXMgd29yZGVkIHZlcnNpb24gb2YgYW4gb3BlcmF0aW9cbiAqIEBwYXJhbSBudW1iZXIgVGhlIG11bHRpcGxpZXIgb3IgYWRkZW5kXG4gKiBAcGFyYW0gb3BlcmF0b3IgVGhlIG9wZXJhdG9yLCBlLmcgYWRkaW5nICdtb3JlIHRoYW4nLCBvciBtdWx0aXBseWluZyAndGltZXMgbGFyZ2VyIHRoYW4nXG4gKi9cbmZ1bmN0aW9uIGNvbXBhcmF0b3IgKG51bWJlcjogbnVtYmVyLCBvcGVyYXRvcjogJyonfCcrJykge1xuICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgY2FzZSAnKic6XG4gICAgICBzd2l0Y2ggKG51bWJlcikge1xuICAgICAgICBjYXNlIDE6IHJldHVybiAndGhlIHNhbWUgYXMnXG4gICAgICAgIGNhc2UgMjogcmV0dXJuICdkb3VibGUnXG4gICAgICAgIGRlZmF1bHQ6IHJldHVybiBgJCR7bnVtYmVyfSQgdGltZXMgbGFyZ2VyIHRoYW5gXG4gICAgICB9XG4gICAgY2FzZSAnKyc6XG4gICAgICBzd2l0Y2ggKG51bWJlcikge1xuICAgICAgICBjYXNlIDA6IHJldHVybiAndGhlIHNhbWUgYXMnXG4gICAgICAgIGRlZmF1bHQ6IHJldHVybiBgJCR7TWF0aC5hYnMobnVtYmVyKS50b1N0cmluZygpfV5cXFxcY2lyYyQgJHsobnVtYmVyIDwgMCkgPyAnbGVzcyB0aGFuJyA6ICdtb3JlIHRoYW4nfWBcbiAgICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkVmlldydcbmltcG9ydCBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhJ1xuaW1wb3J0IHsgV29yZGVkT3B0aW9ucyB9IGZyb20gJy4vV29yZGVkT3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhXG4gIHZpZXchOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogUGFydGlhbDxXb3JkZWRPcHRpb25zPiwgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEge1xuICAgIGNvbnN0IG9wdGlvbnNPdmVycmlkZSA6IFBhcnRpYWw8V29yZGVkT3B0aW9ucz4gPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDMsXG4gICAgICByZXBlYXRlZDogZmFsc2VcbiAgICB9XG4gICAgY29uc3QgZGVmYXVsdHMgOiBXb3JkZWRPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAyNSxcbiAgICAgIG1pbk46IDMsXG4gICAgICBtYXhOOiAzLFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlLFxuICAgICAgbWluQWRkZW5kOiAtNjAsXG4gICAgICBtYXhBZGRlbmQ6IDYwLFxuICAgICAgbWluTXVsdGlwbGllcjogMSxcbiAgICAgIG1heE11bHRpcGxpZXI6IDUsXG4gICAgICB0eXBlczogWydhZGQnLCAnbXVsdGlwbHknLCAncGVyY2VudCcsICdyYXRpbyddXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzOiBXb3JkZWRPcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMsIG9wdGlvbnNPdmVycmlkZSlcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YS5yYW5kb20oc2V0dGluZ3MpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3KGRhdGEsIHZpZXdPcHRpb25zKVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBMYWJlbCB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldyBleHRlbmRzIE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IHtcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIC8vIGluaXRpYWxpc2VkIGluIGNhbGwgdG8gc3VwZXJcbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLCBvcHRpb25zOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBkb2VzIG1vc3Qgb2YgdGhlIHNldCB1cFxuICAgIHN1cGVyLnRyYW5zbGF0ZSgwLCAtMTUpXG4gICAgY29uc3QgaW5zdHJ1Y3Rpb25MYWJlbCA6IExhYmVsID0ge1xuICAgICAgdGV4dHE6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHRleHRhOiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICB0ZXh0OiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICBzdHlsZXE6ICdleHRyYS1pbmZvJyxcbiAgICAgIHN0eWxlYTogJ2V4dHJhLWluZm8nLFxuICAgICAgc3R5bGU6ICdleHRyYS1pbmZvJyxcbiAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwKVxuICAgIH1cbiAgICB0aGlzLmxhYmVscy5wdXNoKGluc3RydWN0aW9uTGFiZWwpXG4gIH1cbn1cbiIsImltcG9ydCB7IE9wdGlvbnNTcGVjIH0gZnJvbSAnT3B0aW9uc1NwZWMnXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhJ1xuaW1wb3J0IHsgV29yZGVkT3B0aW9ucyB9IGZyb20gJy4vV29yZGVkT3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1dvcmRlZFEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGEhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YVxuICB2aWV3ITogTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXdcblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBQYXJ0aWFsPFdvcmRlZE9wdGlvbnM+LCB2aWV3T3B0aW9uczogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNXb3JkZWRRIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IFdvcmRlZE9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDE1LFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDIsXG4gICAgICByZXBlYXRlZDogZmFsc2UsXG4gICAgICBtaW5BZGRlbmQ6IC05MCxcbiAgICAgIG1heEFkZGVuZDogOTAsXG4gICAgICBtaW5NdWx0aXBsaWVyOiAxLFxuICAgICAgbWF4TXVsdGlwbGllcjogNSxcbiAgICAgIHR5cGVzOiBbJ2FkZCcsICdtdWx0aXBseScsICdwZXJjZW50JywgJ3JhdGlvJ11cbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YS5yYW5kb20oc2V0dGluZ3MpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldyhkYXRhLCB2aWV3T3B0aW9ucylcblxuICAgIHJldHVybiBuZXcgdGhpcyhkYXRhLCB2aWV3KVxuICB9XG5cbiAgc3RhdGljIGdldCBvcHRpb25zU3BlYyAoKTogT3B0aW9uc1NwZWMge1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICAgICAgdGl0bGU6ICdRdWVzdGlvbiB0eXBlcycsXG4gICAgICAgIGlkOiAndHlwZXMnLFxuICAgICAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICAgICAgeyB0aXRsZTogJ01vcmUgdGhhbi9sZXNzIHRoYW4nLCBpZDogJ2FkZCcgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnTXVsdGlwbGVzJywgaWQ6ICdtdWx0aXBseScgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnUGVyY2VudGFnZSBjaGFuZ2UnLCBpZDogJ3BlcmNlbnQnIH0sXG4gICAgICAgICAgeyB0aXRsZTogJ1JhdGlvcycsIGlkOiAncmF0aW8nIH1cbiAgICAgICAgXSxcbiAgICAgICAgZGVmYXVsdDogWydhZGQnLCAnbXVsdGlwbHknXVxuICAgICAgfVxuICAgIF1cbiAgfVxufVxuIiwiLyoqICBDbGFzcyB0byB3cmFwIHZhcmlvdXMgbWlzc2luZyBhbmdsZXMgY2xhc3Nlc1xuICogUmVhZHMgb3B0aW9ucyBhbmQgdGhlbiB3cmFwcyB0aGUgYXBwcm9wcmlhdGUgb2JqZWN0LCBtaXJyb3JpbmcgdGhlIG1haW5cbiAqIHB1YmxpYyBtZXRob2RzXG4gKlxuICogVGhpcyBjbGFzcyBkZWFscyB3aXRoIHRyYW5zbGF0aW5nIGRpZmZpY3VsdHkgaW50byBxdWVzdGlvbiB0eXBlc1xuKi9cblxuaW1wb3J0IHsgT3B0aW9uc1NwZWMgfSBmcm9tICdPcHRpb25zU3BlYydcbmltcG9ydCB7IHJhbmRFbGVtIH0gZnJvbSAndXRpbGl0aWVzJ1xuXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFEgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5cbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUSdcbmltcG9ydCB7IEFsZ2VicmFPcHRpb25zIH0gZnJvbSAnLi9BbGdlYnJhT3B0aW9ucydcblxuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWRRIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZFEnXG5pbXBvcnQgeyBXb3JkZWRPcHRpb25zIH0gZnJvbSAnLi9Xb3JkZWRPcHRpb25zJ1xuXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxudHlwZSBRdWVzdGlvblR5cGUgPSAnYW9zbCcgfCAnYWFhcCcgfCAndHJpYW5nbGUnXG50eXBlIFF1ZXN0aW9uU3ViVHlwZSA9ICdzaW1wbGUnIHwgJ3JlcGVhdGVkJyB8ICdhbGdlYnJhJyB8ICd3b3JkZWQnXG5cbnR5cGUgUXVlc3Rpb25PcHRpb25zID0gTWlzc2luZ0FuZ2xlT3B0aW9ucyAmIEFsZ2VicmFPcHRpb25zICYgV29yZGVkT3B0aW9ucyAvLyBvcHRpb25zIHRvIHBhc3MgdG8gcXVlc3Rpb25zXG5cbi8qKiBUaGUgb3B0aW9ucyBwYXNzZWQgdXNpbmcgb3B0aW9uc1NwZWMgKi9cbmludGVyZmFjZSBXcmFwcGVyT3B0aW9ucyB7XG4gIGRpZmZpY3VsdHk6IG51bWJlcixcbiAgdHlwZXM6IFF1ZXN0aW9uVHlwZVtdLFxuICBjdXN0b206IGJvb2xlYW4sXG4gIG1pbk46IG51bWJlcixcbiAgbWF4TjogbnVtYmVyLFxuICBzaW1wbGU6IGJvb2xlYW4sXG4gIHJlcGVhdGVkOiBib29sZWFuLFxuICBhbGdlYnJhOiBib29sZWFuLFxuICBhbGdlYnJhT3B0aW9uczogQWxnZWJyYU9wdGlvbnNcbiAgd29yZGVkOiBib29sZWFuLFxuICB3b3JkZWRPcHRpb25zOiBXb3JkZWRPcHRpb25zXG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBxdWVzdGlvbjogR3JhcGhpY1FcblxuICBjb25zdHJ1Y3RvciAocXVlc3Rpb246IEdyYXBoaWNRKSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMucXVlc3Rpb24gPSBxdWVzdGlvblxuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogV3JhcHBlck9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1Ege1xuICAgIGlmIChvcHRpb25zLnR5cGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUeXBlcyBsaXN0IG11c3QgYmUgbm9uLWVtcHR5JylcbiAgICB9XG4gICAgY29uc3QgdHlwZSA6IFF1ZXN0aW9uVHlwZSA9IHJhbmRFbGVtKG9wdGlvbnMudHlwZXMpXG5cbiAgICBpZiAoIW9wdGlvbnMuY3VzdG9tKSB7XG4gICAgICByZXR1cm4gTWlzc2luZ0FuZ2xlc1EucmFuZG9tRnJvbURpZmZpY3VsdHkodHlwZSwgb3B0aW9ucy5kaWZmaWN1bHR5KVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjaG9vc2Ugc3VidHlwZVxuICAgICAgY29uc3QgYXZhaWxhYmxlU3VidHlwZXMgOiBRdWVzdGlvblN1YlR5cGVbXSA9IFsnc2ltcGxlJywgJ3JlcGVhdGVkJywgJ2FsZ2VicmEnLCAnd29yZGVkJ11cbiAgICAgIGNvbnN0IHN1YnR5cGVzIDogUXVlc3Rpb25TdWJUeXBlW10gPSBbXVxuICAgICAgYXZhaWxhYmxlU3VidHlwZXMuZm9yRWFjaChzdWJ0eXBlID0+IHtcbiAgICAgICAgaWYgKG9wdGlvbnNbc3VidHlwZV0pIHsgc3VidHlwZXMucHVzaChzdWJ0eXBlKSB9XG4gICAgICB9KVxuICAgICAgY29uc3Qgc3VidHlwZSA6IFF1ZXN0aW9uU3ViVHlwZSA9IHJhbmRFbGVtKHN1YnR5cGVzKVxuXG4gICAgICAvLyBidWlsZCBvcHRpb25zIG9iamVjdFxuICAgICAgbGV0IHF1ZXN0aW9uT3B0aW9ucyA6IFBhcnRpYWw8UXVlc3Rpb25PcHRpb25zPiA9IHt9XG4gICAgICBpZiAoc3VidHlwZSA9PT0gJ3NpbXBsZScgfHwgc3VidHlwZSA9PT0gJ3JlcGVhdGVkJykge1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMgPSB7fVxuICAgICAgfSBlbHNlIGlmIChzdWJ0eXBlID09PSAnYWxnZWJyYScpIHtcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zID0gb3B0aW9ucy5hbGdlYnJhT3B0aW9uc1xuICAgICAgfSBlbHNlIGlmIChzdWJ0eXBlID09PSAnd29yZGVkJykge1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMgPSBvcHRpb25zLndvcmRlZE9wdGlvbnNcbiAgICAgIH1cbiAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gb3B0aW9ucy5taW5OXG4gICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IG9wdGlvbnMubWF4TlxuXG4gICAgICByZXR1cm4gTWlzc2luZ0FuZ2xlc1EucmFuZG9tRnJvbVR5cGVXaXRoT3B0aW9ucyh0eXBlLCBzdWJ0eXBlLCBxdWVzdGlvbk9wdGlvbnMpXG4gICAgfVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbUZyb21EaWZmaWN1bHR5ICh0eXBlOiBRdWVzdGlvblR5cGUsIGRpZmZpY3VsdHk6IG51bWJlcikge1xuICAgIGxldCBzdWJ0eXBlIDogUXVlc3Rpb25TdWJUeXBlXG4gICAgY29uc3QgcXVlc3Rpb25PcHRpb25zIDogUGFydGlhbDxRdWVzdGlvbk9wdGlvbnM+ID0ge31cbiAgICBzd2l0Y2ggKGRpZmZpY3VsdHkpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgc3VidHlwZSA9ICdzaW1wbGUnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDJcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgc3VidHlwZSA9ICdzaW1wbGUnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gM1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDRcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgc3VidHlwZSA9ICdyZXBlYXRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAzXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gNFxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA0OlxuICAgICAgICBzdWJ0eXBlID0gJ2FsZ2VicmEnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5leHByZXNzaW9uVHlwZXMgPSBbJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPSBmYWxzZVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDJcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSA0XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDU6XG4gICAgICAgIHN1YnR5cGUgPSAnYWxnZWJyYSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmV4cHJlc3Npb25UeXBlcyA9IFsnYWRkJywgJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPSBbJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmVuc3VyZVggPSB0cnVlXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNjpcbiAgICAgICAgc3VidHlwZSA9ICdhbGdlYnJhJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZXhwcmVzc2lvblR5cGVzID0gWydtaXhlZCddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNzpcbiAgICAgICAgc3VidHlwZSA9ICd3b3JkZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy50eXBlcyA9IFtyYW5kRWxlbShbJ2FkZCcsICdtdWx0aXBseSddKV1cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDJcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgODpcbiAgICAgICAgc3VidHlwZSA9ICd3b3JkZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy50eXBlcyA9IFsnYWRkJywgJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgOTpcbiAgICAgICAgc3VidHlwZSA9ICd3b3JkZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy50eXBlcyA9IFsnbXVsdGlwbHknLCAncmF0aW8nXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSAxMDpcbiAgICAgICAgc3VidHlwZSA9ICd3b3JkZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy50eXBlcyA9IFsnbXVsdGlwbHknLCAnYWRkJywgJ3JhdGlvJywgJ3BlcmNlbnQnXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4ndCBnZW5lcmF0ZSBkaWZmaWN1bHR5ICR7ZGlmZmljdWx0eX1gKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJhbmRvbUZyb21UeXBlV2l0aE9wdGlvbnModHlwZSwgc3VidHlwZSwgcXVlc3Rpb25PcHRpb25zKVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbUZyb21UeXBlV2l0aE9wdGlvbnMgKHR5cGU6IFF1ZXN0aW9uVHlwZSwgc3VidHlwZT86IFF1ZXN0aW9uU3ViVHlwZSwgcXVlc3Rpb25PcHRpb25zPzogUGFydGlhbDxRdWVzdGlvbk9wdGlvbnM+LCB2aWV3T3B0aW9ucz86IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzUSB7XG4gICAgbGV0IHF1ZXN0aW9uOiBHcmFwaGljUVxuICAgIHF1ZXN0aW9uT3B0aW9ucyA9IHF1ZXN0aW9uT3B0aW9ucyB8fCB7fVxuICAgIHZpZXdPcHRpb25zID0gdmlld09wdGlvbnMgfHwge31cbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ2FhYXAnOlxuICAgICAgY2FzZSAnYW9zbCc6IHtcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmFuZ2xlU3VtID0gKHR5cGUgPT09ICdhYWFwJykgPyAzNjAgOiAxODBcbiAgICAgICAgc3dpdGNoIChzdWJ0eXBlKSB7XG4gICAgICAgICAgY2FzZSAnc2ltcGxlJzpcbiAgICAgICAgICBjYXNlICdyZXBlYXRlZCc6XG4gICAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMucmVwZWF0ZWQgPSBzdWJ0eXBlID09PSAncmVwZWF0ZWQnXG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNBcm91bmRRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdhbGdlYnJhJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICd3b3JkZWQnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzV29yZGVkUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgdW5leHBlY3RlZCBzdWJ0eXBlICR7c3VidHlwZX1gKVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICd0cmlhbmdsZSc6IHtcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnJlcGVhdGVkID0gKHN1YnR5cGUgPT09ICdyZXBlYXRlZCcpXG4gICAgICAgIHN3aXRjaCAoc3VidHlwZSkge1xuICAgICAgICAgIGNhc2UgJ3NpbXBsZSc6XG4gICAgICAgICAgY2FzZSAncmVwZWF0ZWQnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdhbGdlYnJhJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3dvcmRlZCc6XG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHVuZXhwZWN0ZWQgc3VidHlwZSAke3N1YnR5cGV9YClcbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHR5cGUgJHt0eXBlfWApXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzUShxdWVzdGlvbilcbiAgfVxuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHsgcmV0dXJuIHRoaXMucXVlc3Rpb24uZ2V0RE9NKCkgfVxuICByZW5kZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5yZW5kZXIoKSB9XG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5zaG93QW5zd2VyKCkgfVxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24uaGlkZUFuc3dlcigpIH1cbiAgdG9nZ2xlQW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24udG9nZ2xlQW5zd2VyKCkgfVxuXG4gIHN0YXRpYyBnZXQgb3B0aW9uc1NwZWMgKCk6IE9wdGlvbnNTcGVjIHtcbiAgICByZXR1cm4gW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnaGVhZGluZycsXG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgfSxcblxuICAgICAge1xuICAgICAgICB0aXRsZTogJ1R5cGVzJyxcbiAgICAgICAgaWQ6ICd0eXBlcycsXG4gICAgICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICAgICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgICAgIHsgdGl0bGU6ICdPbiBhIHN0cmFpZ2h0IGxpbmUnLCBpZDogJ2Fvc2wnIH0sXG4gICAgICAgICAgeyB0aXRsZTogJ0Fyb3VuZCBhIHBvaW50JywgaWQ6ICdhYWFwJyB9LFxuICAgICAgICAgIHsgdGl0bGU6ICdUcmlhbmdsZScsIGlkOiAndHJpYW5nbGUnIH1cbiAgICAgICAgXSxcbiAgICAgICAgZGVmYXVsdDogWydhb3NsJywgJ2FhYXAnLCAndHJpYW5nbGUnXSxcbiAgICAgICAgdmVydGljYWw6IHRydWVcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjb2x1bW4tYnJlYWsnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnPGI+Q3VzdG9tIHNldHRpbmdzIChkaXNhYmxlcyBkaWZmaWN1bHR5KTwvYj4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgaWQ6ICdjdXN0b20nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAncmFuZ2UnLFxuICAgICAgICBpZDogJ24tYW5nbGVzJyxcbiAgICAgICAgaWRMQjogJ21pbk4nLFxuICAgICAgICBpZFVCOiAnbWF4TicsXG4gICAgICAgIGRlZmF1bHRMQjogMixcbiAgICAgICAgZGVmYXVsdFVCOiA0LFxuICAgICAgICBtaW46IDIsXG4gICAgICAgIG1heDogOCxcbiAgICAgICAgdGl0bGU6ICdOdW1iZXIgb2YgYW5nbGVzJyxcbiAgICAgICAgZW5hYmxlZElmOiAnY3VzdG9tJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJ1NpbXBsZScsXG4gICAgICAgIGlkOiAnc2ltcGxlJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlZElmOiAnY3VzdG9tJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJ1JlcGVhdGVkL0lzb3NjZWxlcycsXG4gICAgICAgIGlkOiAncmVwZWF0ZWQnLFxuICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICBlbmFibGVkSWY6ICdjdXN0b20nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnQWxnZWJyYWljJyxcbiAgICAgICAgaWQ6ICdhbGdlYnJhJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlZElmOiAnY3VzdG9tJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3N1Ym9wdGlvbnMnLFxuICAgICAgICB0aXRsZTogJycsXG4gICAgICAgIGlkOiAnYWxnZWJyYU9wdGlvbnMnLFxuICAgICAgICBvcHRpb25zU3BlYzogTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRLm9wdGlvbnNTcGVjLFxuICAgICAgICBlbmFibGVkSWY6ICdjdXN0b20mYWxnZWJyYSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgdGl0bGU6ICdXb3JkZWQnLFxuICAgICAgICBpZDogJ3dvcmRlZCcsXG4gICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgIGVuYWJsZWRJZjogJ2N1c3RvbSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdzdWJvcHRpb25zJyxcbiAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICBpZDogJ3dvcmRlZE9wdGlvbnMnLFxuICAgICAgICBvcHRpb25zU3BlYzogTWlzc2luZ0FuZ2xlc1dvcmRlZFEub3B0aW9uc1NwZWMsXG4gICAgICAgIGVuYWJsZWRJZjogJ2N1c3RvbSZ3b3JkZWQnXG4gICAgICB9XG4gICAgXVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnXG4gIH1cbn1cbiIsImltcG9ydCB7IHJhbmRCZXR3ZWVuLCByYW5kRWxlbSwgc2NhbGVkU3RyIH0gZnJvbSAndXRpbGl0aWVzJ1xuaW1wb3J0IGZyYWN0aW9uIGZyb20gJ2ZyYWN0aW9uLmpzJ1xuaW1wb3J0IHsgUXVlc3Rpb25PcHRpb25zIH0gZnJvbSAnLi90eXBlcydcblxuLyoqXG4gKiBBIHZhbHVlIGZvciBzaWRlcywgYXJlYXMgYW5kIHBlcmltZXRlcnNcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBWYWx1ZSB7XG4gIHZhbDogbnVtYmVyLCAvLyB0aGUgbnVtZXJpY2FsIHZhbHVlXG4gIGxhYmVsPzogc3RyaW5nLCAvLyB0aGUgbGFiZWwgdG8gZGlzcGxheS4gZS5nLiBcIjMuNGNtXCJcbiAgc2hvdzogYm9vbGVhbiwgLy8gd2hldGhlciB0aGF0IHZhbHVlIGlzIHNob3duIGluIHRoZSBxdWVzdGlvbiBvciBhbnN3ZXIgYXQgYWxsXG4gIG1pc3Npbmc6IGJvb2xlYW4sIC8vIHdoZXRoZXIgdGhlIHZhbHVlIGlzIHNob3duIGluIHRoZSBxdWVzdGlvblxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWN0YW5nbGVBcmVhRGF0YSB7XG4gIHJlYWRvbmx5IGJhc2UgOiBWYWx1ZVxuICByZWFkb25seSBoZWlnaHQ6IFZhbHVlXG4gIHJlYWRvbmx5IHNob3dPcHBvc2l0ZXM6IGJvb2xlYW5cbiAgcHJpdmF0ZSByZWFkb25seSBkcDogbnVtYmVyXG4gIHByaXZhdGUgcmVhZG9ubHkgZGVub21pbmF0b3I6IG51bWJlciA9IDFcbiAgcHJpdmF0ZSBfYXJlYT86IFBhcnRpYWw8VmFsdWU+IC8vIGxhemlseSBjYWxjdWxhdGVkXG4gIHByaXZhdGUgX3BlcmltZXRlcj86IFBhcnRpYWw8VmFsdWU+XG5cbiAgY29uc3RydWN0b3IgKGJhc2U6IFZhbHVlLCBoZWlnaHQ6IFZhbHVlLCBzaG93T3Bwb3NpdGVzOiBib29sZWFuLCBkcDogbnVtYmVyLCBkZW5vbWluYXRvcjogbnVtYmVyLCBhcmVhUHJvcGVydGllcz86IE9taXQ8VmFsdWUsICd2YWwnPiwgcGVyaW1ldGVyUHJvcGVydGllcz86IE9taXQ8VmFsdWUsICd2YWwnPikge1xuICAgIHRoaXMuYmFzZSA9IGJhc2VcbiAgICB0aGlzLmhlaWdodCA9IGhlaWdodFxuICAgIHRoaXMuc2hvd09wcG9zaXRlcyA9IHNob3dPcHBvc2l0ZXNcbiAgICB0aGlzLmRwID0gZHBcbiAgICB0aGlzLmRlbm9taW5hdG9yID0gZGVub21pbmF0b3JcbiAgICB0aGlzLl9hcmVhID0gYXJlYVByb3BlcnRpZXNcbiAgICB0aGlzLl9wZXJpbWV0ZXIgPSBwZXJpbWV0ZXJQcm9wZXJ0aWVzXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBRdWVzdGlvbk9wdGlvbnMpIDogUmVjdGFuZ2xlQXJlYURhdGEge1xuICAgIG9wdGlvbnMubWF4TGVuZ3RoID0gb3B0aW9ucy5tYXhMZW5ndGggfHwgMjAgLy8gZGVmYXVsdCB2YWx1ZXNcbiAgICBjb25zdCBkcCA9IG9wdGlvbnMuZHAgfHwgMFxuICAgIGNvbnN0IGRlbm9taW5hdG9yID0gb3B0aW9ucy5mcmFjdGlvbj8gcmFuZEJldHdlZW4oMiw2KSA6IDFcblxuICAgIGNvbnN0IHNpZGVzID0ge1xuICAgICAgYmFzZTogcmFuZEJldHdlZW4oMSwgb3B0aW9ucy5tYXhMZW5ndGgpLFxuICAgICAgaGVpZ2h0OiByYW5kQmV0d2VlbigxLCBvcHRpb25zLm1heExlbmd0aClcbiAgICB9XG5cbiAgICBjb25zdCBiYXNlIDogVmFsdWUgPVxuICAgICAgeyB2YWw6IHNpZGVzLmJhc2UsIHNob3c6IHRydWUsIG1pc3Npbmc6IGZhbHNlLCBsYWJlbDogc2NhbGVkU3RyKHNpZGVzLmJhc2UsZHApICsgXCJcXFxcbWF0aHJte2NtfVwiIH1cbiAgICBjb25zdCBoZWlnaHQgOiBWYWx1ZSA9XG4gICAgICB7IHZhbDogc2lkZXMuaGVpZ2h0LCBzaG93OiB0cnVlLCBtaXNzaW5nOiBmYWxzZSAsbGFiZWw6IHNjYWxlZFN0cihzaWRlcy5oZWlnaHQsZHApICsgXCJcXFxcbWF0aHJte2NtfVwifVxuICAgIGlmIChkZW5vbWluYXRvciA+IDEpIHtcbiAgICAgIDtbYmFzZSwgaGVpZ2h0XS5mb3JFYWNoKHYgPT4ge1xuICAgICAgICB2LmxhYmVsID0gbmV3IGZyYWN0aW9uKHYudmFsLGRlbm9taW5hdG9yKS50b0xhdGV4KHRydWUpICsgJ1xcXFxtYXRocm17Y219J1xuICAgICAgfSlcbiAgICB9XG4gICAgbGV0IHNob3dPcHBvc2l0ZXMgOiBib29sZWFuXG4gICAgY29uc3QgYXJlYVByb3BlcnRpZXMgOiBQYXJ0aWFsPE9taXQ8VmFsdWUsICd2YWwnPj4gPSB7fVxuICAgIGNvbnN0IHBlcmltZXRlclByb3BlcnRpZXMgOiBQYXJ0aWFsPE9taXQ8VmFsdWUsICd2YWwnPj4gPSB7fVxuXG4gICAgLy8gc2VsZWN0aXZlbHkgaGlkZS9taXNzaW5nIGRlcGVuZGluZyBvbiB0eXBlXG4gICAgc3dpdGNoIChvcHRpb25zLnF1ZXN0aW9uVHlwZSkge1xuICAgICAgY2FzZSAnYXJlYSc6XG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIHNob3dPcHBvc2l0ZXMgPSAhb3B0aW9ucy5ub0Rpc3RyYWN0b3JzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdwZXJpbWV0ZXInOlxuICAgICAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMubWlzc2luZyA9IHRydWVcbiAgICAgICAgc2hvd09wcG9zaXRlcyA9IG9wdGlvbnMubm9EaXN0cmFjdG9yc1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSAncmV2ZXJzZUFyZWEnOlxuICAgICAgICBhcmVhUHJvcGVydGllcy5zaG93ID0gdHJ1ZVxuICAgICAgICBhcmVhUHJvcGVydGllcy5taXNzaW5nID0gZmFsc2VcbiAgICAgICAgcmFuZEVsZW0oW2Jhc2UsIGhlaWdodF0pLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIHNob3dPcHBvc2l0ZXMgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAncmV2ZXJzZVBlcmltZXRlcic6XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMubWlzc2luZyA9IGZhbHNlXG4gICAgICAgIHJhbmRFbGVtKFtiYXNlLCBoZWlnaHRdKS5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBzaG93T3Bwb3NpdGVzID0gZmFsc2VcbiAgICAgICAgYnJlYWtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IHRoaXMoYmFzZSwgaGVpZ2h0LCBzaG93T3Bwb3NpdGVzLCBkcCwgZGVub21pbmF0b3IsIGFyZWFQcm9wZXJ0aWVzIGFzIE9taXQ8VmFsdWUsICd2YWwnPiwgcGVyaW1ldGVyUHJvcGVydGllcyBhcyBPbWl0PFZhbHVlLCAndmFsJz4pXG4gIH1cblxuICBnZXQgcGVyaW1ldGVyICgpIDogVmFsdWUge1xuICAgIGlmICghdGhpcy5fcGVyaW1ldGVyKSB7XG4gICAgICB0aGlzLl9wZXJpbWV0ZXIgPSB7XG4gICAgICAgIHNob3c6IGZhbHNlLFxuICAgICAgICBtaXNzaW5nOiB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5fcGVyaW1ldGVyLnZhbCkge1xuICAgICAgdGhpcy5fcGVyaW1ldGVyLnZhbCA9IDIgKiAodGhpcy5iYXNlLnZhbCArIHRoaXMuaGVpZ2h0LnZhbClcbiAgICAgIGlmICh0aGlzLmRlbm9taW5hdG9yID4gMSkge1xuICAgICAgICB0aGlzLl9wZXJpbWV0ZXIubGFiZWwgPSBuZXcgZnJhY3Rpb24odGhpcy5fcGVyaW1ldGVyLnZhbCwgdGhpcy5kZW5vbWluYXRvcikudG9MYXRleCh0cnVlKSArICdcXFxcbWF0aHJte2NtfSdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3BlcmltZXRlci5sYWJlbCA9IHNjYWxlZFN0cih0aGlzLl9wZXJpbWV0ZXIudmFsLCB0aGlzLmRwKSArICdcXFxcbWF0aHJte2NtfSdcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3BlcmltZXRlciBhcyBWYWx1ZVxuICB9XG5cbiAgZ2V0IGFyZWEgKCkgOiBWYWx1ZSB7XG4gICAgaWYgKCF0aGlzLl9hcmVhKSB7XG4gICAgICB0aGlzLl9hcmVhID0ge1xuICAgICAgICBzaG93OiBmYWxzZSxcbiAgICAgICAgbWlzc2luZzogdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXRoaXMuX2FyZWEudmFsKSB7XG4gICAgICB0aGlzLl9hcmVhLnZhbCA9IHRoaXMuYmFzZS52YWwgKiB0aGlzLmhlaWdodC52YWxcbiAgICAgIGlmICh0aGlzLmRlbm9taW5hdG9yID4gMSkge1xuICAgICAgICB0aGlzLl9hcmVhLmxhYmVsID0gbmV3IGZyYWN0aW9uKHRoaXMuX2FyZWEudmFsLCB0aGlzLmRlbm9taW5hdG9yKioyKS50b0xhdGV4KHRydWUpICsgJ1xcXFxtYXRocm17Y219XjInXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9hcmVhLmxhYmVsID0gc2NhbGVkU3RyKHRoaXMuX2FyZWEudmFsLCAyICogdGhpcy5kcCkgKyAnXFxcXG1hdGhybXtjbX1eMidcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2FyZWEgYXMgVmFsdWVcbiAgfVxufVxuIiwiaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuXG4vKiBDYW52YXMgZHJhd2luZywgdXNpbmcgdGhlIFBvaW50IGNsYXNzICovXG5cbmV4cG9ydCBmdW5jdGlvbiBkYXNoZWRMaW5lIChjdHgsIHgxLCB5MSwgeDIsIHkyKSB7XG4gIC8vIFdvcmsgaWYgZ2l2ZW4gdHdvIHBvaW50cyBpbnN0ZWFkOlxuICBpZiAoeDEgaW5zdGFuY2VvZiBQb2ludCAmJiB4MiBpbnN0YW5jZW9mIFBvaW50KSB7XG4gICAgY29uc3QgcDEgPSB4MTsgY29uc3QgcDIgPSB4MlxuICAgIHgxID0gcDEueFxuICAgIHkxID0gcDEueVxuICAgIHgyID0gcDIueFxuICAgIHkyID0gcDIueVxuICB9XG5cbiAgY29uc3QgbGVuZ3RoID0gTWF0aC5oeXBvdCh4MiAtIHgxLCB5MiAtIHkxKVxuICBjb25zdCBkYXNoeCA9ICh5MSAtIHkyKSAvIGxlbmd0aCAvLyB1bml0IHZlY3RvciBwZXJwZW5kaWN1bGFyIHRvIGxpbmVcbiAgY29uc3QgZGFzaHkgPSAoeDIgLSB4MSkgLyBsZW5ndGhcbiAgY29uc3QgbWlkeCA9ICh4MSArIHgyKSAvIDJcbiAgY29uc3QgbWlkeSA9ICh5MSArIHkyKSAvIDJcblxuICAvLyBkcmF3IHRoZSBiYXNlIGxpbmVcbiAgY3R4Lm1vdmVUbyh4MSwgeTEpXG4gIGN0eC5saW5lVG8oeDIsIHkyKVxuXG4gIC8vIGRyYXcgdGhlIGRhc2hcbiAgY3R4Lm1vdmVUbyhtaWR4ICsgNSAqIGRhc2h4LCBtaWR5ICsgNSAqIGRhc2h5KVxuICBjdHgubGluZVRvKG1pZHggLSA1ICogZGFzaHgsIG1pZHkgLSA1ICogZGFzaHkpXG5cbiAgY3R4Lm1vdmVUbyh4MiwgeTIpXG59XG4vKipcbiAqIFxuICogQHBhcmFtIHtDYW52YXNSZW5kZXJpbmdDb250ZXh0MkR9IGN0eCBUaGUgY29udGV4dFxuICogQHBhcmFtIHtQb2ludH0gcHQxIEEgcG9pbnRcbiAqIEBwYXJhbSB7UG9pbnR9IHB0MiBBIHBvaW50XG4gKiBAcGFyYW0ge251bWJlcn0gc2l6ZSBUaGUgc2l6ZSBvZiB0aGUgYXJyYXkgdG8gZHJhd1xuICogQHBhcmFtIHtudW1iZXJ9IFttPTAuNV0gVGhlICdzaGFycG5lc3MnIG9mIHRoZSBwb2ludC4gU21hbGxlciBpcyBwb2ludGllclxuICovXG5leHBvcnQgZnVuY3Rpb24gYXJyb3dMaW5lIChjdHgsIHB0MSwgcHQyLCBzaXplLCBtPTAuNSkge1xuXG4gIGNvbnN0IHVuaXQgPSBQb2ludC51bml0VmVjdG9yKHB0MSwgcHQyKVxuICB1bml0LnggKj0gc2l6ZVxuICB1bml0LnkgKj0gc2l6ZVxuICBjb25zdCBub3JtYWwgPSB7IHg6IC11bml0LnksIHk6IHVuaXQueCB9XG4gIG5vcm1hbC54ICo9IG1cbiAgbm9ybWFsLnkgKj0gbVxuXG4gIGNvbnN0IGNvbnRyb2wxID0gcHQyLmNsb25lKClcbiAgICAudHJhbnNsYXRlKC11bml0LngsIC11bml0LnkpXG4gICAgLnRyYW5zbGF0ZShub3JtYWwueCwgbm9ybWFsLnkpXG5cbiAgY29uc3QgY29udHJvbDIgPSBwdDIuY2xvbmUoKVxuICAgIC50cmFuc2xhdGUoLXVuaXQueCwgLXVuaXQueSlcbiAgICAudHJhbnNsYXRlKC1ub3JtYWwueCwgLW5vcm1hbC55KVxuXG4gIGN0eC5tb3ZlVG8ocHQxLngsIHB0MS55KVxuICBjdHgubGluZVRvKHB0Mi54LCBwdDIueSlcbiAgY3R4LmxpbmVUbyhjb250cm9sMS54LCBjb250cm9sMS55KVxuICBjdHgubW92ZVRvKHB0Mi54LCBwdDIueSlcbiAgY3R4LmxpbmVUbyhjb250cm9sMi54LCBjb250cm9sMi55KVxufVxuXG4vKipcbiAqIERyYXcgYSByaWdodCBhbmdsZSBzeW1ib2wgZm9yIGFuZ2xlIEFPQy4gTkI6IG5vIGNoZWNrIGlzIG1hZGUgdGhhdCBBT0MgaXMgaW5kZWVkIGEgcmlnaHQgYW5nbGVcbiAqIEBwYXJhbSB7Q2FudmFzUmVuZGVyaW5nQ29udGV4dDJEfSBjdHggVGhlIGNvbnRleHQgdG8gZHJhdyBpblxuICogQHBhcmFtIHtQb2ludH0gQSBTdGFydCBwb2ludFxuICogQHBhcmFtIHtQb2ludH0gTyBWZXJ0ZXggcG9pbnRcbiAqIEBwYXJhbSB7UG9pbnR9IEMgRW5kIHBvaW50XG4gKiBAcGFyYW0ge251bWJlcn0gc2l6ZSBTaXplIG9mIHJpZ2h0IGFuZ2xlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkcmF3UmlnaHRBbmdsZSAoY3R4LCBBLCBPLCBDLCBzaXplKSB7XG4gIGNvbnN0IHVuaXRPQSA9IFBvaW50LnVuaXRWZWN0b3IoTywgQSlcbiAgY29uc3QgdW5pdE9DID0gUG9pbnQudW5pdFZlY3RvcihPLCBDKVxuICBjb25zdCBjdGwxID0gTy5jbG9uZSgpLnRyYW5zbGF0ZSh1bml0T0EueCAqIHNpemUsIHVuaXRPQS55ICogc2l6ZSlcbiAgY29uc3QgY3RsMiA9IGN0bDEuY2xvbmUoKS50cmFuc2xhdGUodW5pdE9DLnggKiBzaXplLCB1bml0T0MueSAqIHNpemUpXG4gIGNvbnN0IGN0bDMgPSBPLmNsb25lKCkudHJhbnNsYXRlKHVuaXRPQy54ICogc2l6ZSwgdW5pdE9DLnkgKiBzaXplKVxuICBjdHgubW92ZVRvKGN0bDEueCwgY3RsMS55KVxuICBjdHgubGluZVRvKGN0bDIueCwgY3RsMi55KVxuICBjdHgubGluZVRvKGN0bDMueCwgY3RsMy55KVxufVxuXG4vKipcbiAqIERyYXdzIGEgZGFzaCwgb3IgbXVsdGlwbGUgZGFzaGVzLCBhdCB0aGUgbWlkcG9pbnQgb2YgQSBhbmQgQlxuICogQHBhcmFtIHtDYW52YXNSZW5kZXJpbmdDb250ZXh0MkR9IGN0eCBUaGUgY2FudmFzIHJlbmRlcmluZyBjb250ZXh0XG4gKiBAcGFyYW0ge1BvaW50fSBBIEEgcG9pbnRcbiAqIEBwYXJhbSB7UG9pbnR9IEIgQSBwb2ludFxuICogQHBhcmFtIHtudW1iZXJ9IFtzaXplPTEwXSAgVGhlIGxlbmd0aCBvZiB0aGUgZGFzaGVzLCBpbiBwaXhlbHNcbiAqIEBwYXJhbSB7bnVtYmVyfSBbbnVtYmVyPTFdIEhvdyBtYW55IGRhc2hlcyB0byBkcndcbiAqIEBwYXJhbSB7bnVtYmVyfSBbZ2FwPXNpemVdIFRoZSBnYXAgYmV0d2VlbiBkYXNoZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcmFsbGVsU2lnbiAoY3R4LCBBLCBCLCBzaXplPTEwLCBudW1iZXI9MSwgZ2FwPXNpemUpIHtcbiAgY29uc3QgdW5pdCA9IFBvaW50LnVuaXRWZWN0b3IoQSwgQilcbiAgdW5pdC54ICo9IHNpemVcbiAgdW5pdC55ICo9IHNpemVcbiAgY29uc3Qgbm9ybWFsID0geyB4OiAtdW5pdC55LCB5OiB1bml0LnggfVxuXG4gIGNvbnN0IE0gPSBQb2ludC5tZWFuKEEsIEIpXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1iZXI7IGkrKykge1xuICAgIGNvbnN0IGN0bDIgPSBNLmNsb25lKCkubW92ZVRvd2FyZChCLCBpICogZ2FwKVxuICAgIGNvbnN0IGN0bDEgPSBjdGwyLmNsb25lKClcbiAgICAgIC50cmFuc2xhdGUoLXVuaXQueCwgLXVuaXQueSlcbiAgICAgIC50cmFuc2xhdGUobm9ybWFsLngsIG5vcm1hbC55KVxuICAgIGNvbnN0IGN0bDMgPSBjdGwyLmNsb25lKClcbiAgICAgIC50cmFuc2xhdGUoLXVuaXQueCwgLXVuaXQueSlcbiAgICAgIC50cmFuc2xhdGUoLW5vcm1hbC54LCAtbm9ybWFsLnkpXG5cbiAgICBjdHgubW92ZVRvKGN0bDEueCwgY3RsMS55KVxuICAgIGN0eC5saW5lVG8oY3RsMi54LCBjdGwyLnkpXG4gICAgY3R4LmxpbmVUbyhjdGwzLngsIGN0bDMueSlcbiAgfVxufVxuIiwiZXhwb3J0IHR5cGUgU2hhcGUgPSAncmVjdGFuZ2xlJyB8ICd0cmlhbmdsZScgfCAncGFyYWxsZWxvZ3JhbScgfCAndHJhcGV6aXVtJztcblxuZXhwb3J0IHR5cGUgUXVlc3Rpb25UeXBlU2ltcGxlID0gJ2FyZWEnIHwgJ3BlcmltZXRlcic7XG5leHBvcnQgdHlwZSBRdWVzdGlvblR5cGVDdXN0b20gPSAncmV2ZXJzZUFyZWEnIHwgJ3JldmVyc2VQZXJpbWV0ZXInIHwgJ3B5dGhhZ29yYXNBcmVhJyB8ICdweXRoYWdvcmFzUGVyaW1ldGVyJyB8ICdweXRoYWdvcmFzSXNvc2NlbGVzQXJlYSc7XG5leHBvcnQgdHlwZSBRdWVzdGlvblR5cGUgPSBRdWVzdGlvblR5cGVTaW1wbGUgfCBRdWVzdGlvblR5cGVDdXN0b207XG5cbmV4cG9ydCBpbnRlcmZhY2UgUXVlc3Rpb25PcHRpb25zIHtcbiAgbm9EaXN0cmFjdG9yczogYm9vbGVhbiwgLy8gYWRkcyBsYXllciBvZiBkaWZmaWN1bHR5IHdoZW4gdHJ1ZSBieSBpbmNsdWRpbmcvZXhjbHVkaW5nIHNpZGVzIChkZXBlbmRpbmcgb24gc2hhcGUgdHlwZSlcbiAgZHA6IG51bWJlciwgLy8gbnVtYmVyIG9mIGRlY2ltYWwgcGxhY2VzIG9mIGxlbmd0aHNcbiAgZnJhY3Rpb246IGJvb2xlYW4sXG4gIG1heExlbmd0aDogbnVtYmVyLCAvLyB0aGUgbWF4aW11bSBsZW5ndGggb2YgYSBzaWRlXG4gIHF1ZXN0aW9uVHlwZTogUXVlc3Rpb25UeXBlXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV3JhcHBlck9wdGlvbnMge1xuICBkaWZmaWN1bHR5OiBudW1iZXI7XG4gIHNoYXBlczogU2hhcGVbXTtcbiAgcXVlc3Rpb25UeXBlc1NpbXBsZTogUXVlc3Rpb25UeXBlU2ltcGxlW107XG4gIGN1c3RvbTogYm9vbGVhbjtcbiAgcXVlc3Rpb25UeXBlc0N1c3RvbTogKFF1ZXN0aW9uVHlwZSlbXTtcbiAgZHA6IDAgfCAxO1xufVxuXG5leHBvcnQgY29uc3QgY29sb3JzID0gWydMaWdodEN5YW4nLCdMaWdodFllbGxvdycsJ1BpbmsnLCdMaWdodEdyZWVuJywnTGlnaHRCbHVlJywnSXZvcnknLCdMaWdodEdyYXknXVxuIiwiaW1wb3J0IHsgZHJhd1JpZ2h0QW5nbGUgfSBmcm9tICdkcmF3aW5nJ1xuaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUURhdGEsIEdyYXBoaWNRVmlldywgTGFiZWwgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4vdHlwZXMnXG5pbXBvcnQgUmVjdGFuZ2xlQXJlYURhdGEsIHsgVmFsdWUgfSBmcm9tICcuL1JlY3RhbmdsZUFyZWFEYXRhJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWN0YW5nbGVBcmVhVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIGRhdGEhOiBSZWN0YW5nbGVBcmVhRGF0YSAvLyBhc3NpZ25lZCBpbiBzdXBlclxuICBBOiBQb2ludFxuICBCOiBQb2ludFxuICBDOiBQb2ludFxuICBEOiBQb2ludFxuXG4gIGNvbnN0cnVjdG9yIChBOiBQb2ludCwgQjogUG9pbnQsIEM6IFBvaW50LCBEOiBQb2ludCwgbGFiZWxzOiBMYWJlbFtdLCBkYXRhOiBSZWN0YW5nbGVBcmVhRGF0YSwgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgLyogU3VwZXIgZG9lczpcbiAgICAgKiAgU2V0cyB0aGlzLndpZHRoIGFuZCB0aGlzLmhlaWdodFxuICAgICAqICBTZXRzIHRoaXMuZGF0YVxuICAgICAqICBDcmVhdGVzIERPTSBlbGVtZW50cywgaW5jbHVkaW5nIGNhbnZhc1xuICAgICAqICBDcmVhdGVzIGVtcHR5IHRoaXMubGFiZWxzIGxpc3RcbiAgICAgKi9cbiAgICBzdXBlcihkYXRhLCB2aWV3T3B0aW9ucykgLy8gaW5pdGlhbGlzZXMgdGhpcy5kYXRhXG4gICAgdGhpcy5BID0gQVxuICAgIHRoaXMuQiA9IEJcbiAgICB0aGlzLkMgPSBDXG4gICAgdGhpcy5EID0gRFxuICAgIHRoaXMubGFiZWxzID0gbGFiZWxzXG4gIH1cblxuICAvKipcbiAgICogU3RhdGljIGZhY3RvcnkgbWV0aG9kIHJldHVybmluZyB2aWV3IGZyb20gZGF0YVxuICAgKiBAcGFyYW0gZGF0YSBBIGRhdGEgb2JqZWN0LCB3aGljaCBoYWQgZGV0YWlscyBvZiB3aWR0aCwgaGVpZ2h0IGFuZCBhcmVhXG4gICAqIEBwYXJhbSB2aWV3T3B0aW9ucyBWaWV3IG9wdGlvbnMgLSBjb250YWluaW5nIHdpZHRoIGFuZCBoZWlnaHRcbiAgICovXG4gIHN0YXRpYyBmcm9tRGF0YSAoZGF0YTogUmVjdGFuZ2xlQXJlYURhdGEsIHZpZXdPcHRpb25zPzogVmlld09wdGlvbnMpIDogUmVjdGFuZ2xlQXJlYVZpZXcge1xuICAgIC8vIERlZmF1bHRzIChOQjogZHVwbGljYXRlcyBlZmZvcnQgaW4gY29uc3RydWN0b3IsIGdpdmVuIHVzZSBvZiBzdGF0aWMgZmFjdG9yeSBjb25zdHJ1Y3RvciBpbnN0ZWFkIG9mIEdyYXBoaWNRJ3MgbWV0aG9kKVxuICAgIHZpZXdPcHRpb25zID0gdmlld09wdGlvbnMgPz8ge31cbiAgICB2aWV3T3B0aW9ucy53aWR0aCA9IHZpZXdPcHRpb25zLndpZHRoID8/IDMwMFxuICAgIHZpZXdPcHRpb25zLmhlaWdodCA9IHZpZXdPcHRpb25zLmhlaWdodCA/PyAzMDBcblxuICAgIC8vIGluaXRpYWwgcG9pbnRzXG4gICAgY29uc3QgQSA9IG5ldyBQb2ludCgwLCAwKVxuICAgIGNvbnN0IEIgPSBuZXcgUG9pbnQoMCwgZGF0YS5oZWlnaHQudmFsKVxuICAgIGNvbnN0IEMgPSBuZXcgUG9pbnQoZGF0YS5iYXNlLnZhbCwgZGF0YS5oZWlnaHQudmFsKVxuICAgIGNvbnN0IEQgPSBuZXcgUG9pbnQoZGF0YS5iYXNlLnZhbCwgMClcblxuICAgIC8vIHJvdGF0ZSwgc2NhbGUgYW5kIGNlbnRlclxuICAgIGNvbnN0IHJvdGF0aW9uID0gdmlld09wdGlvbnMucm90YXRpb24gPz8gMiAqIE1hdGguUEkgKiBNYXRoLnJhbmRvbSgpXG4gICAgO1tBLCBCLCBDLCBEXS5mb3JFYWNoKHB0ID0+IHB0LnJvdGF0ZShyb3RhdGlvbikpXG4gICAgUG9pbnQuc2NhbGVUb0ZpdChbQSwgQiwgQywgRF0sIHZpZXdPcHRpb25zLndpZHRoLCB2aWV3T3B0aW9ucy5oZWlnaHQsIDEwMCwgWzAsMjBdKVxuXG4gICAgLy8gU2V0IHVwIGxhYmVsc1xuICAgIGNvbnN0IGxhYmVscyA6IExhYmVsW10gPSBbXVxuXG4gICAgY29uc3Qgc2lkZXMgOiBbUG9pbnQsIFBvaW50LCBWYWx1ZV1bXSA9IFsgLy8gWzFzdCBwb2ludCwgMm5kIHBvaW50LCBsZW5ndGhdXG4gICAgICBbQSwgQiwgZGF0YS5oZWlnaHRdLFxuICAgICAgW0IsIEMsIGRhdGEuYmFzZV1cbiAgICBdXG5cbiAgICBpZiAoZGF0YS5zaG93T3Bwb3NpdGVzKSB7XG4gICAgICBzaWRlcy5wdXNoKFtDLCBELCBkYXRhLmhlaWdodF0pXG4gICAgICBzaWRlcy5wdXNoKFtELCBBLCBkYXRhLmJhc2VdKVxuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwLCBuID0gc2lkZXMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7IC8vIHNpZGVzXG4gICAgICBpZiAoIXNpZGVzW2ldWzJdLnNob3cpIGNvbnRpbnVlXG4gICAgICBjb25zdCBvZmZzZXQgPSAyMFxuICAgICAgY29uc3QgcG9zID0gUG9pbnQubWVhbihzaWRlc1tpXVswXSwgc2lkZXNbaV1bMV0pXG4gICAgICBjb25zdCB1bml0dmVjID0gUG9pbnQudW5pdFZlY3RvcihzaWRlc1tpXVswXSwgc2lkZXNbaV1bMV0pXG5cbiAgICAgIHBvcy50cmFuc2xhdGUoLXVuaXR2ZWMueSAqIG9mZnNldCwgdW5pdHZlYy54ICogb2Zmc2V0KVxuXG4gICAgICBjb25zdCB0ZXh0YSA9IHNpZGVzW2ldWzJdLmxhYmVsID8/IHNpZGVzW2ldWzJdLnZhbC50b1N0cmluZygpXG4gICAgICBjb25zdCB0ZXh0cSA9IHNpZGVzW2ldWzJdLm1pc3NpbmcgPyAnPycgOiB0ZXh0YVxuICAgICAgY29uc3Qgc3R5bGVxID0gJ25vcm1hbCdcbiAgICAgIGNvbnN0IHN0eWxlYSA9IHNpZGVzW2ldWzJdLm1pc3NpbmcgPyAnYW5zd2VyJyA6ICdub3JtYWwnXG5cbiAgICAgIGxhYmVscy5wdXNoKHtcbiAgICAgICAgcG9zOiBwb3MsXG4gICAgICAgIHRleHRhOiB0ZXh0YSxcbiAgICAgICAgdGV4dHE6IHRleHRxLFxuICAgICAgICB0ZXh0OiB0ZXh0cSxcbiAgICAgICAgc3R5bGVhOiBzdHlsZWEsXG4gICAgICAgIHN0eWxlcTogc3R5bGVxLFxuICAgICAgICBzdHlsZTogc3R5bGVxXG4gICAgICB9KVxuICAgIH1cblxuICAgIGxldCBuSW5mbyA9IDBcbiAgICBpZiAoZGF0YS5hcmVhLnNob3cpIHtcbiAgICAgIGNvbnN0IHRleHRhID0gZGF0YS5hcmVhLmxhYmVsID8/IGRhdGEuYXJlYS52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSBkYXRhLmFyZWEubWlzc2luZyA/ICc/JyA6IHRleHRhXG4gICAgICBjb25zdCBzdHlsZXEgPSAnZXh0cmEtaW5mbydcbiAgICAgIGNvbnN0IHN0eWxlYSA9IGRhdGEuYXJlYS5taXNzaW5nID8gJ2V4dHJhLWFuc3dlcicgOiAnZXh0cmEtaW5mbydcbiAgICAgIGxhYmVscy5wdXNoKFxuICAgICAgICB7XG4gICAgICAgICAgdGV4dGE6ICdcXFxcdGV4dHtBcmVhfSA9ICcgKyB0ZXh0YSxcbiAgICAgICAgICB0ZXh0cTogJ1xcXFx0ZXh0e0FyZWF9ID0gJyArIHRleHRxLFxuICAgICAgICAgIHRleHQ6ICdcXFxcdGV4dHtBcmVhfSA9ICcgKyB0ZXh0cSxcbiAgICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgICBzdHlsZTogc3R5bGVxLFxuICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB2aWV3T3B0aW9ucy5oZWlnaHQgLSAxMCAtIDE1ICogbkluZm8pXG4gICAgICAgIH1cbiAgICAgIClcbiAgICAgIG5JbmZvKytcbiAgICB9XG5cbiAgICBpZiAoZGF0YS5wZXJpbWV0ZXIuc2hvdykge1xuICAgICAgY29uc3QgdGV4dGEgPSBkYXRhLnBlcmltZXRlci5sYWJlbCA/PyBkYXRhLnBlcmltZXRlci52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSBkYXRhLnBlcmltZXRlci5taXNzaW5nID8gJz8nIDogdGV4dGFcbiAgICAgIGNvbnN0IHN0eWxlcSA9ICdleHRyYS1pbmZvJ1xuICAgICAgY29uc3Qgc3R5bGVhID0gZGF0YS5wZXJpbWV0ZXIubWlzc2luZyA/ICdleHRyYS1hbnN3ZXInIDogJ2V4dHJhLWluZm8nXG4gICAgICBsYWJlbHMucHVzaChcbiAgICAgICAge1xuICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB2aWV3T3B0aW9ucy5oZWlnaHQgLSAxMCAtIDIwICogbkluZm8pLFxuICAgICAgICAgIHRleHRhOiAnXFxcXHRleHR7UGVyaW1ldGVyfSA9ICcgKyB0ZXh0YSxcbiAgICAgICAgICB0ZXh0cTogJ1xcXFx0ZXh0e1BlcmltZXRlcn0gPSAnICsgdGV4dHEsXG4gICAgICAgICAgdGV4dDogJ1xcXFx0ZXh0e1BlcmltZXRlcn0gPSAnICsgdGV4dHEsXG4gICAgICAgICAgc3R5bGVxOiBzdHlsZXEsXG4gICAgICAgICAgc3R5bGVhOiBzdHlsZWEsXG4gICAgICAgICAgc3R5bGU6IHN0eWxlcVxuICAgICAgICB9XG4gICAgICApXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBSZWN0YW5nbGVBcmVhVmlldyhBLCBCLCBDLCBELCBsYWJlbHMsIGRhdGEsIHZpZXdPcHRpb25zKVxuICB9XG5cbiAgcmVuZGVyICgpOiB2b2lkIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG4gICAgaWYgKGN0eCA9PT0gbnVsbCkgeyB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBnZXQgY29udGV4dCcpIH1cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpIC8vIGNsZWFyXG4gICAgY3R4LnNldExpbmVEYXNoKFtdKVxuXG4gICAgLy8gZHJhdyByZWN0YW5nbGVcbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBjdHgubW92ZVRvKHRoaXMuQS54LCB0aGlzLkEueSlcbiAgICBjdHgubGluZVRvKHRoaXMuQi54LCB0aGlzLkIueSlcbiAgICBjdHgubGluZVRvKHRoaXMuQy54LCB0aGlzLkMueSlcbiAgICBjdHgubGluZVRvKHRoaXMuRC54LCB0aGlzLkQueSlcbiAgICBjdHgubGluZVRvKHRoaXMuQS54LCB0aGlzLkEueSlcbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguZmlsbFN0eWxlID0gcmFuZEVsZW0oY29sb3JzKVxuICAgIGN0eC5maWxsKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIC8vIHJpZ2h0IGFuZ2xlc1xuICAgIGNvbnN0IHNpemUgPSBNYXRoLm1pbihcbiAgICAgIDE1LFxuICAgICAgTWF0aC5taW4oUG9pbnQuZGlzdGFuY2UodGhpcy5BLCB0aGlzLkIpLCBQb2ludC5kaXN0YW5jZSh0aGlzLkIsIHRoaXMuQykpIC8gM1xuICAgIClcbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBkcmF3UmlnaHRBbmdsZShjdHgsIHRoaXMuQSwgdGhpcy5CLCB0aGlzLkMsIHNpemUpXG4gICAgZHJhd1JpZ2h0QW5nbGUoY3R4LCB0aGlzLkIsIHRoaXMuQywgdGhpcy5ELCBzaXplKVxuICAgIGRyYXdSaWdodEFuZ2xlKGN0eCwgdGhpcy5DLCB0aGlzLkQsIHRoaXMuQSwgc2l6ZSlcbiAgICBkcmF3UmlnaHRBbmdsZShjdHgsIHRoaXMuRCwgdGhpcy5BLCB0aGlzLkIsIHNpemUpXG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICB0aGlzLnJlbmRlckxhYmVscygpXG4gIH1cbn1cbiIsImltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgUmVjdGFuZ2xlQXJlYURhdGEgZnJvbSAnLi9SZWN0YW5nbGVBcmVhRGF0YSdcbmltcG9ydCBSZWN0YW5nbGVBcmVhVmlldyBmcm9tICcuL1JlY3RhbmdsZUFyZWFWaWV3J1xuaW1wb3J0IHsgUXVlc3Rpb25PcHRpb25zIH0gZnJvbSAnLi90eXBlcydcblxuLy8gUmVjdGFuZ2xlIG5lZWRzIG5vIGZ1cnRoZXIgb3B0aW9uc1xuLy8gVHJpYW5nbGUgbmVlZHMgbm8gZnVydGhlciBvcHRpb25zIC0tIG5lZWRzIHBhc3NpbmcgaW5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjdGFuZ2xlQXJlYVEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGEhOiBSZWN0YW5nbGVBcmVhRGF0YSAvLyBpbml0aWFsaXNlZCBpbiBzdXBlcigpXG4gIHZpZXchOiBSZWN0YW5nbGVBcmVhVmlld1xuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgY29uc3QgZGF0YSA9IFJlY3RhbmdsZUFyZWFEYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBSZWN0YW5nbGVBcmVhVmlldy5mcm9tRGF0YShkYXRhLCB2aWV3T3B0aW9ucylcbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZXMnXG4gIH1cbn1cbiIsImltcG9ydCBmcmFjdGlvbiBmcm9tIFwiZnJhY3Rpb24uanNcIlxuaW1wb3J0IHsgcmFuZEJldHdlZW4sIHJhbmRFbGVtLCByYW5kUHl0aGFnVHJpcGxlLCByYW5kUHl0aGFnVHJpcGxlV2l0aExlZywgc2NhbGVkU3RyIH0gZnJvbSBcInV0aWxpdGllc1wiXG5pbXBvcnQgeyBWYWx1ZSB9IGZyb20gXCIuL1JlY3RhbmdsZUFyZWFEYXRhXCJcbmltcG9ydCB7IFF1ZXN0aW9uT3B0aW9ucyB9IGZyb20gXCIuL3R5cGVzXCJcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVHJhcGV6aXVtQXJlYURhdGEge1xuICBhOiBWYWx1ZSAvLyB0d28gcGFyYWxsZWwgc2lkZXNcbiAgYjogVmFsdWUgLy8gIFwiICAgXCJcIlxuICBoZWlnaHQ6IFZhbHVlXG4gIHNpZGUxOiBWYWx1ZSAvLyBTbGFudGVkIHNpZGVzXG4gIHNpZGUyOiBWYWx1ZVxuICBiMTogbnVtYmVyXG4gIGIyOiBudW1iZXJcbiAgcHJpdmF0ZSByZWFkb25seSBkcDogbnVtYmVyID0gMFxuICBwcml2YXRlIHJlYWRvbmx5IGRlbm9taW5hdG9yOiBudW1iZXIgPSAxXG4gIHByaXZhdGUgX2FyZWE/OiBQYXJ0aWFsPFZhbHVlPlxuICBwcml2YXRlIF9wZXJpbWV0ZXI/OiBQYXJ0aWFsPFZhbHVlPlxuICBjb25zdHJ1Y3RvcihhOiBWYWx1ZSxiOiBWYWx1ZSxoZWlnaHQ6IFZhbHVlLHNpZGUxOiBWYWx1ZSxzaWRlMjogVmFsdWUsIGIxOiBudW1iZXIsIGIyOiBudW1iZXIsIGRwOiBudW1iZXIsZGVub21pbmF0b3I6IG51bWJlcixwZXJpbWV0ZXJQcm9wZXJ0aWVzPzogUGFydGlhbDxWYWx1ZT4sYXJlYVByb3BlcnRpZXM/OiBQYXJ0aWFsPFZhbHVlPikge1xuICAgIHRoaXMuYSA9IGFcbiAgICB0aGlzLmIgPSBiXG4gICAgdGhpcy5oZWlnaHQgPSBoZWlnaHRcbiAgICB0aGlzLnNpZGUxID0gc2lkZTFcbiAgICB0aGlzLnNpZGUyID0gc2lkZTJcbiAgICB0aGlzLmIxID0gYjFcbiAgICB0aGlzLmIyID0gYjJcbiAgICB0aGlzLmRwID0gZHBcbiAgICB0aGlzLmRlbm9taW5hdG9yID0gZGVub21pbmF0b3JcbiAgICB0aGlzLl9wZXJpbWV0ZXIgPSBwZXJpbWV0ZXJQcm9wZXJ0aWVzXG4gICAgdGhpcy5fYXJlYSA9IGFyZWFQcm9wZXJ0aWVzXG4gIH1cblxuICBnZXQgcGVyaW1ldGVyICgpIDogVmFsdWUge1xuICAgIGlmICghdGhpcy5fcGVyaW1ldGVyKSB7XG4gICAgICB0aGlzLl9wZXJpbWV0ZXIgPSB7XG4gICAgICAgIHNob3c6IGZhbHNlLFxuICAgICAgICBtaXNzaW5nOiB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5fcGVyaW1ldGVyLnZhbCkge1xuICAgICAgdGhpcy5fcGVyaW1ldGVyLnZhbCA9IHRoaXMuYS52YWwgKyB0aGlzLmIudmFsICsgdGhpcy5zaWRlMS52YWwgKyB0aGlzLnNpZGUyLnZhbFxuICAgICAgaWYgKHRoaXMuZGVub21pbmF0b3IgPiAxKSB7XG4gICAgICAgIHRoaXMuX3BlcmltZXRlci5sYWJlbCA9IG5ldyBmcmFjdGlvbih0aGlzLl9wZXJpbWV0ZXIudmFsLCB0aGlzLmRlbm9taW5hdG9yKS50b0xhdGV4KHRydWUpICsgJ1xcXFxtYXRocm17Y219J1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcGVyaW1ldGVyLmxhYmVsID0gc2NhbGVkU3RyKHRoaXMuX3BlcmltZXRlci52YWwsIHRoaXMuZHApICsgJ1xcXFxtYXRocm17Y219J1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcGVyaW1ldGVyIGFzIFZhbHVlXG4gIH1cbiAgZ2V0IGFyZWEgKCk6IFZhbHVlIHtcbiAgICBpZiAoIXRoaXMuX2FyZWEpIHtcbiAgICAgIHRoaXMuX2FyZWEgPSB7XG4gICAgICAgIHNob3c6IGZhbHNlLFxuICAgICAgICBtaXNzaW5nOiB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5fYXJlYS52YWwpIHtcbiAgICAgIHRoaXMuX2FyZWEudmFsID0gdGhpcy5oZWlnaHQudmFsKih0aGlzLmEudmFsK3RoaXMuYi52YWwpLzJcbiAgICAgIGlmICh0aGlzLmRlbm9taW5hdG9yID4gMSkge1xuICAgICAgICB0aGlzLl9hcmVhLmxhYmVsID0gbmV3IGZyYWN0aW9uKHRoaXMuX2FyZWEudmFsLCB0aGlzLmRlbm9taW5hdG9yKioyKS50b0xhdGV4KHRydWUpICsgJ1xcXFxtYXRocm17Y219XjInXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9hcmVhLmxhYmVsID0gc2NhbGVkU3RyKHRoaXMuX2FyZWEudmFsLCAyICogdGhpcy5kcCkgKyAnXFxcXG1hdGhybXtjbX1eMidcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2FyZWEgYXMgVmFsdWVcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20ob3B0aW9uczogUmVxdWlyZWQ8UXVlc3Rpb25PcHRpb25zPikgOiBUcmFwZXppdW1BcmVhRGF0YSB7XG4gICAgY29uc3QgZHA6IG51bWJlciA9IG9wdGlvbnMuZHAgLy8gZG9uJ3QgYWN0dWFsbHkgc2NhbGUgLSBqdXN0IGRvIHRoaXMgaW4gZGlzcGxheVxuICAgIGNvbnN0IGRlbm9taW5hdG9yID0gb3B0aW9ucy5mcmFjdGlvbj8gcmFuZEJldHdlZW4oMiw2KSA6IDFcblxuICAgIGxldCBhVmFsdWUgOiBudW1iZXIgLy9zaG9ydGVkIHBhcmFsbGVsIHNpZGVcbiAgICBsZXQgYlZhbHVlIDogbnVtYmVyIC8vIGxvbmdlciBwYXJhbGxlbCBzaWRlXG4gICAgbGV0IHMxVmFsdWUgOiBudW1iZXJcbiAgICBsZXQgczJWYWx1ZTogbnVtYmVyXG4gICAgbGV0IGhWYWx1ZTogbnVtYmVyIC8vIGZpbmFsIHNpZGVzIGFuZCBoZWlnaHRcbiAgICBsZXQgYjE6IG51bWJlclxuICAgIGxldCBiMjogbnVtYmVyIC8vIGJpdHMgb2YgbG9uZ2VzdCBwYXJhbGxlbCBzaWRlLiBiPWErYjErYjJcbiAgICBsZXQgdHJpYW5nbGUxOiB7YTogbnVtYmVyLCBiOiBudW1iZXIsIGM6IG51bWJlcn1cbiAgICBsZXQgdHJpYW5nbGUyOiB7YTogbnVtYmVyLCBiOiBudW1iZXIsIGM6IG51bWJlcn0gLy8gdHdvIHJhIHRyaWFuZ2xlc1xuXG4gICAgdHJpYW5nbGUxID0gcmFuZFB5dGhhZ1RyaXBsZShvcHRpb25zLm1heExlbmd0aClcbiAgICBzMVZhbHVlID0gdHJpYW5nbGUxLmNcblxuICAgIGlmIChNYXRoLnJhbmRvbSgpIDwgMC41KSB7IC8vIHN0aWNrIGEgcmEgdHJpYW5nbGUgb24gb25lIHNpZGVcbiAgICAgIGhWYWx1ZSA9IHRyaWFuZ2xlMS5hXG4gICAgICBiMSA9IHRyaWFuZ2xlMS5iXG4gICAgfSBlbHNlIHtcbiAgICAgIGhWYWx1ZSA9IHRyaWFuZ2xlMS5iXG4gICAgICBiMSA9IHRyaWFuZ2xlMS5hXG4gICAgfVxuXG4gICAgaWYgKE1hdGgucmFuZG9tKCkgPCAwLjkpIHsgLy8gc3RpY2sgYSB0cmlhbmdsZSBvbiB0aGUgb3RoZXIgc2lkZVxuICAgICAgdHJpYW5nbGUyID0gcmFuZFB5dGhhZ1RyaXBsZVdpdGhMZWcoaFZhbHVlLCBvcHRpb25zLm1heExlbmd0aClcbiAgICAgIHMyVmFsdWUgPSB0cmlhbmdsZTIuY1xuICAgICAgYjIgPSB0cmlhbmdsZTIuYiAvLyB0cmkyLmEgPTogaFxuICAgIH0gZWxzZSB7IC8vIHJpZ2h0LWFuZ2xlZCB0cmFwZXppdW1cbiAgICAgIHMyVmFsdWUgPSBoVmFsdWVcbiAgICAgIGIyID0gMFxuICAgIH1cblxuICAgIC8vIEZpbmQgYSB2YWx1ZVxuICAgIGNvbnN0IE1JTlBST1AgPSA4IC8vIHRoZSBmaW5hbCBsZW5ndGggb2YgYSB3aXRoaCBiZSBhdCBsZWFzdCAoMS9NSU5QUk9QKSBvZiB0aGUgZmluYWwgbGVuZ3RoIG9mIGIuIEkuZS4gYSBpcyBtb3JlIHRoYW4gMS84IG9mIGJcbiAgICBjb25zdCBtYXhBVmFsdWUgPSBNYXRoLm1pbihvcHRpb25zLm1heExlbmd0aCAtIGIxIC0gYjIsIE1JTlBST1AqaFZhbHVlKVxuICAgIGNvbnN0IG1pbkFWYWx1ZSA9IE1hdGguY2VpbCgoYjErYjIpLyhNSU5QUk9QLTEpKVxuICAgIGNvbnNvbGUubG9nKClcbiAgICBpZiAobWF4QVZhbHVlIC0gbWluQVZhbHVlIDwgMSkgey8vIHdpbGwgb3ZlcnNob290IG1heExlbmd0aCBhIGJpXG4gICAgICBhVmFsdWUgPSBNYXRoLmZsb29yKG1pbkFWYWx1ZSlcbiAgICAgIGNvbnNvbGUud2FybihgT3ZlcnNob290aW5nIG1heCBsZW5ndGggYnkgbmVjZXNzaXR5LiBzMT0ke3MxVmFsdWV9LCBzMj0ke3MyVmFsdWV9LCBhPSR7YVZhbHVlfWApXG4gICAgfSBlbHNlIHtcbiAgICAgIGFWYWx1ZSA9IHJhbmRCZXR3ZWVuKG1pbkFWYWx1ZSxtYXhBVmFsdWUpXG4gICAgfSBcbiAgICBiVmFsdWUgPSBiMSArIGIyICsgYVZhbHVlXG5cbiAgICBjb25zdCBhOiBWYWx1ZSA9IHsgdmFsOiBhVmFsdWUsIHNob3c6IHRydWUsIG1pc3Npbmc6IGZhbHNlIH1cbiAgICBjb25zdCBiOiBWYWx1ZSA9IHsgdmFsOiBiVmFsdWUsIHNob3c6IHRydWUsIG1pc3Npbmc6IGZhbHNlIH1cbiAgICBjb25zdCBoZWlnaHQ6IFZhbHVlID0ge1xuICAgICAgdmFsOiBoVmFsdWUsXG4gICAgICBzaG93OiBzMlZhbHVlICE9PSBoVmFsdWUsIC8vIGRvbid0IHNob3cgaWYgcmlnaHQtYW5nbGVkXG4gICAgICBtaXNzaW5nOiBmYWxzZVxuICAgIH1cbiAgICBjb25zdCBzaWRlMTogVmFsdWUgPSB7IHZhbDogczFWYWx1ZSwgc2hvdzogdHJ1ZSwgbWlzc2luZzogZmFsc2UgfVxuICAgIGNvbnN0IHNpZGUyOiBWYWx1ZSA9IHsgdmFsOiBzMlZhbHVlLCBzaG93OiB0cnVlLCBtaXNzaW5nOiBmYWxzZSB9XG4gICAgY29uc3QgYXJlYVByb3BlcnRpZXM6IFBhcnRpYWw8VmFsdWU+ID0ge3Nob3c6IGZhbHNlLCBtaXNzaW5nOiBmYWxzZX1cbiAgICBjb25zdCBwZXJpbWV0ZXJQcm9wZXJ0aWVzOiBQYXJ0aWFsPFZhbHVlPiA9IHtzaG93OiBmYWxzZSwgbWlzc2luZzogZmFsc2V9XG5cbiAgICAvLyBzZWxlY3RpdmVseSBoaWRlL21pc3NpbmcgZGVwZW5kaW5nIG9uIHR5cGVcbiAgICBzd2l0Y2ggKG9wdGlvbnMucXVlc3Rpb25UeXBlKSB7XG4gICAgICBjYXNlICdhcmVhJzpcbiAgICAgICAgYXJlYVByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgYXJlYVByb3BlcnRpZXMubWlzc2luZyA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3BlcmltZXRlcic6XG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAncmV2ZXJzZUFyZWEnOiAvLyBoaWRlIG9uZSBvZiBiIG9yIGhlaWdodFxuICAgICAgICBhcmVhUHJvcGVydGllcy5zaG93ID0gdHJ1ZVxuICAgICAgICBhcmVhUHJvcGVydGllcy5taXNzaW5nID0gZmFsc2VcbiAgICAgICAgaWYgKE1hdGgucmFuZG9tKCkgPCAwLjMpIGhlaWdodC5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBlbHNlIGlmIChNYXRoLnJhbmRvbSgpIDwgMC41KSBiLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIGVsc2UgIGEubWlzc2luZyA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3JldmVyc2VQZXJpbWV0ZXInOlxuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMubWlzc2luZyA9IGZhbHNlXG4gICAgICAgIHJhbmRFbGVtKFtzaWRlMSxzaWRlMixhLGJdKS5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGxhYmVscyBmb3Igc2lkZXMgZGVwZW5kaW5nIG9uIGRwIGFuZCBkZW5vbWluYXRvciBzZXR0aW5nc1xuICAgIGlmIChkZW5vbWluYXRvciA9PT0gMSkge1xuICAgICAgW2EsYixzaWRlMSxzaWRlMixoZWlnaHRdLmZvckVhY2goIHYgPT4ge1xuICAgICAgICB2LmxhYmVsID0gc2NhbGVkU3RyKHYudmFsLCBkcCkgKyAnXFxcXG1hdGhybXtjbX0nXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICBbYSxiLHNpZGUxLHNpZGUyLGhlaWdodF0uZm9yRWFjaCggdiA9PiB7XG4gICAgICAgIHYubGFiZWwgPSBuZXcgZnJhY3Rpb24odi52YWwsIGRlbm9taW5hdG9yKS50b0xhdGV4KHRydWUpICsgJ1xcXFxtYXRocm17Y219J1xuICAgICAgfSlcbiAgICB9XG5cbiAgICAvLyB0dXJuIG9mIGRpc3RyYWN0b3JzIGlmIG5lY2Vzc2FyeVxuICAgIGlmIChvcHRpb25zLm5vRGlzdHJhY3RvcnMpIHtcbiAgICAgIGlmIChvcHRpb25zLnF1ZXN0aW9uVHlwZSA9PT0gJ2FyZWEnIHx8IG9wdGlvbnMucXVlc3Rpb25UeXBlID09PSAncmV2ZXJzZUFyZWEnKSB7XG4gICAgICAgIHNpZGUxLnNob3cgPSBmYWxzZVxuICAgICAgICBzaWRlMi5zaG93ID0gIWhlaWdodC5zaG93IC8vIHNob3cgb25seSBpZiBoZWlnaHQgaXMgYWxyZWFkeSBoaWRkZW4gKGkuZS4gaWYgcmlnaHQgYW5nbGVkKVxuICAgICAgfSBlbHNlIGlmIChvcHRpb25zLnF1ZXN0aW9uVHlwZT09PSAncGVyaW1ldGVyJyB8fCBvcHRpb25zLnF1ZXN0aW9uVHlwZSA9PT0gJ3JldmVyc2VQZXJpbWV0ZXInKSB7XG4gICAgICAgIGhlaWdodC5zaG93ID0gZmFsc2VcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFRyYXBleml1bUFyZWFEYXRhKGEsYixoZWlnaHQsc2lkZTEsc2lkZTIsYjEsYjIsZHAsZGVub21pbmF0b3IscGVyaW1ldGVyUHJvcGVydGllcyxhcmVhUHJvcGVydGllcylcblxuICB9XG59XG4iLCJpbXBvcnQgeyBhcnJvd0xpbmUsIGRyYXdSaWdodEFuZ2xlLCBwYXJhbGxlbFNpZ24gfSBmcm9tIFwiZHJhd2luZ1wiO1xuaW1wb3J0IFBvaW50IGZyb20gXCJQb2ludFwiO1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tIFwidXRpbGl0aWVzXCI7XG5pbXBvcnQgeyBHcmFwaGljUVZpZXcsIExhYmVsIH0gZnJvbSBcIi4uL0dyYXBoaWNRXCI7XG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSBcIi4uL1ZpZXdPcHRpb25zXCI7XG5pbXBvcnQgeyBWYWx1ZSB9IGZyb20gXCIuL1JlY3RhbmdsZUFyZWFEYXRhXCI7XG5pbXBvcnQgVHJhcGV6aXVtQXJlYURhdGEgZnJvbSBcIi4vVHJhcGV6aXVtQXJlYURhdGFcIjtcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRyYXBleml1bUFyZWFWaWV3IGV4dGVuZHMgR3JhcGhpY1FWaWV3IHtcbiAgZGF0YSE6IFRyYXBleml1bUFyZWFEYXRhXG4gIEE6IFBvaW50XG4gIEI6IFBvaW50XG4gIEM6IFBvaW50XG4gIEQ6IFBvaW50XG4gIGh0MTogUG9pbnRcbiAgaHQyOiBQb2ludFxuICBjb25zdHJ1Y3RvcihkYXRhOiBUcmFwZXppdW1BcmVhRGF0YSwgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zLCBBOiBQb2ludCwgQjogUG9pbnQsIEM6IFBvaW50LCBEOiBQb2ludCwgaHQxOiBQb2ludCwgaHQyOiBQb2ludCwgbGFiZWxzOiBMYWJlbFtdKSB7XG4gICAgc3VwZXIoZGF0YSx2aWV3T3B0aW9ucylcbiAgICB0aGlzLkEgPSBBXG4gICAgdGhpcy5CID0gQlxuICAgIHRoaXMuQyA9IENcbiAgICB0aGlzLkQgPSBEXG4gICAgdGhpcy5odDEgPSBodDFcbiAgICB0aGlzLmh0MiA9IGh0MlxuICAgIHRoaXMubGFiZWxzID0gbGFiZWxzXG4gIH1cblxuICBzdGF0aWMgZnJvbURhdGEoZGF0YTogVHJhcGV6aXVtQXJlYURhdGEsIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucykgOiBUcmFwZXppdW1BcmVhVmlldyB7XG4gICAgLy8gRGVmYXVsdHMgKE5COiBkdXBsaWNhdGVzIGVmZm9ydCBpbiBjb25zdHJ1Y3RvciwgZ2l2ZW4gdXNlIG9mIHN0YXRpYyBmYWN0b3J5IGNvbnN0cnVjdG9yIGluc3RlYWQgb2YgR3JhcGhpY1EncyBtZXRob2QpXG4gICAgdmlld09wdGlvbnMgPSB2aWV3T3B0aW9ucyA/PyB7fVxuICAgIHZpZXdPcHRpb25zLndpZHRoID0gdmlld09wdGlvbnMud2lkdGggPz8gMzAwXG4gICAgdmlld09wdGlvbnMuaGVpZ2h0ID0gdmlld09wdGlvbnMuaGVpZ2h0ID8/IDMwMFxuXG4gICAgLy8gaW5pdGlhbCBwb2ludHNcbiAgICBjb25zdCBBID0gbmV3IFBvaW50KDAsMCk7XG4gICAgY29uc3QgQiA9IG5ldyBQb2ludChkYXRhLmIxLGRhdGEuaGVpZ2h0LnZhbCk7XG4gICAgY29uc3QgQyA9IG5ldyBQb2ludChkYXRhLmIxK2RhdGEuYS52YWwsZGF0YS5oZWlnaHQudmFsKTtcbiAgICBjb25zdCBEID0gbmV3IFBvaW50KGRhdGEuYi52YWwsMCk7XG5cbiAgICBjb25zdCBodDEgPSBuZXcgUG9pbnQoZGF0YS5iMStkYXRhLmEudmFsLzIsZGF0YS5oZWlnaHQudmFsKTtcbiAgICBjb25zdCBodDIgPSBuZXcgUG9pbnQoZGF0YS5iMStkYXRhLmEudmFsLzIsMCk7XG5cbiAgICAvLyByb3RhdGVcblxuICAgIGNvbnN0IHJvdGF0aW9uID0gdmlld09wdGlvbnMucm90YXRpb24gPz8gMipNYXRoLlBJICogTWF0aC5yYW5kb20oKVxuICAgIDtbQSxCLEMsRCxodDEsaHQyXS5mb3JFYWNoKHB0ID0+IHB0LnJvdGF0ZShyb3RhdGlvbikpXG4gICAgUG9pbnQuc2NhbGVUb0ZpdChbQSxCLEMsRCxodDEsaHQyXSwgdmlld09wdGlvbnMud2lkdGgsIHZpZXdPcHRpb25zLmhlaWdodCwgMTAwLCBbMCwyMF0pXG5cblxuICAgIC8vIGxhYmVsc1xuICAgIGNvbnN0IGxhYmVscyA6IExhYmVsW10gPSBbXTtcblxuICAgIGNvbnN0IHNpZGVzIDogW1BvaW50LFBvaW50LFZhbHVlXVtdPSBbIC8vWzFzdCBwb2ludCwgMm5kIHBvaW50LCBsZW5ndGhdXG4gICAgICBbQSxCLGRhdGEuc2lkZTFdLFxuICAgICAgW0IsQyxkYXRhLmFdLFxuICAgICAgW0MsRCxkYXRhLnNpZGUyXSxcbiAgICAgIFtELEEsZGF0YS5iXSxcbiAgICAgIFtodDEsaHQyLGRhdGEuaGVpZ2h0XVxuICAgIF07XG5cbiAgICBmb3IgKGxldCBpID0gMCwgbj1zaWRlcy5sZW5ndGg7IGkgPCBuOyBpKyspIHsgLy9zaWRlc1xuICAgICAgaWYgKCFzaWRlc1tpXVsyXS5zaG93KSBjb250aW51ZTtcbiAgICAgIGNvbnN0IG9mZnNldCA9IDI1O1xuICAgICAgbGV0IHBvcyA9IFBvaW50Lm1lYW4oc2lkZXNbaV1bMF0sc2lkZXNbaV1bMV0pO1xuICAgICAgY29uc3QgdW5pdHZlYyA9IFBvaW50LnVuaXRWZWN0b3Ioc2lkZXNbaV1bMF0sIHNpZGVzW2ldWzFdKTtcbiAgICAgIFxuICAgICAgcG9zLnRyYW5zbGF0ZSgtdW5pdHZlYy55Km9mZnNldCwgdW5pdHZlYy54Km9mZnNldCk7IFxuXG4gICAgICBjb25zdCB0ZXh0YSA9IHNpZGVzW2ldWzJdLmxhYmVsID8/IHNpZGVzW2ldWzJdLnZhbC50b1N0cmluZygpXG4gICAgICBjb25zdCB0ZXh0cSA9IHNpZGVzW2ldWzJdLm1pc3Npbmc/IFwiP1wiIDogdGV4dGE7XG4gICAgICBjb25zdCBzdHlsZXEgPSBcIm5vcm1hbFwiO1xuICAgICAgY29uc3Qgc3R5bGVhID0gc2lkZXNbaV1bMl0ubWlzc2luZz8gXCJhbnN3ZXJcIiA6IFwibm9ybWFsXCI7XG5cbiAgICAgIGxhYmVscy5wdXNoKHtcbiAgICAgICAgcG9zOiBwb3MsXG4gICAgICAgIHRleHRhOiB0ZXh0YSxcbiAgICAgICAgdGV4dHE6IHRleHRxLFxuICAgICAgICB0ZXh0OiB0ZXh0cSxcbiAgICAgICAgc3R5bGVhOiBzdHlsZWEsXG4gICAgICAgIHN0eWxlcTogc3R5bGVxLFxuICAgICAgICBzdHlsZTogc3R5bGVxXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBsZXQgbl9pbmZvID0gMDtcbiAgICBpZiAoZGF0YS5hcmVhLnNob3cpIHtcbiAgICAgIGNvbnN0IHRleHRhID0gZGF0YS5hcmVhLmxhYmVsID8/IGRhdGEuYXJlYS52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSBkYXRhLmFyZWEubWlzc2luZz8gXCI/XCIgOiB0ZXh0YTtcbiAgICAgIGNvbnN0IHN0eWxlcSA9IFwiZXh0cmEtaW5mb1wiO1xuICAgICAgY29uc3Qgc3R5bGVhID0gZGF0YS5hcmVhLm1pc3Npbmc/IFwiZXh0cmEtYW5zd2VyXCIgOiBcImV4dHJhLWluZm9cIjtcbiAgICAgIGxhYmVscy5wdXNoKFxuICAgICAgICB7XG4gICAgICAgICAgdGV4dGE6IFwiXFxcXHRleHR7QXJlYX0gPSBcIiArIHRleHRhLFxuICAgICAgICAgIHRleHRxOiBcIlxcXFx0ZXh0e0FyZWF9ID0gXCIgKyB0ZXh0cSxcbiAgICAgICAgICB0ZXh0OiBcIlxcXFx0ZXh0e0FyZWF9ID0gXCIgKyB0ZXh0cSxcbiAgICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgICBzdHlsZTogc3R5bGVxLFxuICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB2aWV3T3B0aW9ucy5oZWlnaHQgLSAxMCAtIDIwKm5faW5mbyksXG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgICBuX2luZm8rKztcbiAgICB9XG4gICAgaWYgKGRhdGEucGVyaW1ldGVyLnNob3cpIHtcbiAgICAgIGNvbnN0IHRleHRhID0gZGF0YS5wZXJpbWV0ZXIubGFiZWwgPz8gZGF0YS5wZXJpbWV0ZXIudmFsLnRvU3RyaW5nKClcbiAgICAgIGNvbnN0IHRleHRxID0gZGF0YS5wZXJpbWV0ZXIubWlzc2luZz8gXCI/XCIgOiB0ZXh0YTtcbiAgICAgIGNvbnN0IHN0eWxlcSA9IFwiZXh0cmEtaW5mb1wiO1xuICAgICAgY29uc3Qgc3R5bGVhID0gZGF0YS5wZXJpbWV0ZXIubWlzc2luZz8gXCJleHRyYS1hbnN3ZXJcIiA6IFwiZXh0cmEtaW5mb1wiO1xuICAgICAgbGFiZWxzLnB1c2goXG4gICAgICAgIHtcbiAgICAgICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdmlld09wdGlvbnMuaGVpZ2h0IC0gMTAgLSAyMCpuX2luZm8pLFxuICAgICAgICAgIHRleHRhOiBcIlxcXFx0ZXh0e1BlcmltZXRlcn0gPSBcIiArIHRleHRhLFxuICAgICAgICAgIHRleHRxOiBcIlxcXFx0ZXh0e1BlcmltZXRlcn0gPSBcIiArIHRleHRxLFxuICAgICAgICAgIHRleHQ6IFwiXFxcXHRleHR7UGVyaW1ldGVyfSA9IFwiICsgdGV4dHEsXG4gICAgICAgICAgc3R5bGVxOiBzdHlsZXEsXG4gICAgICAgICAgc3R5bGVhOiBzdHlsZWEsXG4gICAgICAgICAgc3R5bGU6IHN0eWxlcSxcbiAgICAgICAgfVxuICAgICAgKVxuICAgIH1cbiAgICByZXR1cm4gbmV3IFRyYXBleml1bUFyZWFWaWV3KGRhdGEsdmlld09wdGlvbnMsQSxCLEMsRCxodDEsaHQyLGxhYmVscylcbiAgfVxuXG4gIHJlbmRlcigpIDogdm9pZCB7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuICAgIGlmICghY3R4KSB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBnZXQgY2FudmFzIGNvbnRleHQnKVxuICAgIGN0eC5jbGVhclJlY3QoMCwwLHRoaXMuY2FudmFzLndpZHRoLHRoaXMuY2FudmFzLmhlaWdodCk7IC8vIGNsZWFyXG4gICAgY3R4LnNldExpbmVEYXNoKFtdKTtcblxuICAgIC8vIGRyYXcgcGFyYWxsZWxvZ3JhbVxuICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICBjdHgubW92ZVRvKHRoaXMuQS54LHRoaXMuQS55KTtcbiAgICBjdHgubGluZVRvKHRoaXMuQi54LHRoaXMuQi55KTtcbiAgICBjdHgubGluZVRvKHRoaXMuQy54LHRoaXMuQy55KTtcbiAgICBjdHgubGluZVRvKHRoaXMuRC54LHRoaXMuRC55KTtcbiAgICBjdHgubGluZVRvKHRoaXMuQS54LHRoaXMuQS55KTtcbiAgICBjdHguc3Ryb2tlKCk7XG4gICAgY3R4LmZpbGxTdHlsZT1yYW5kRWxlbShjb2xvcnMpXG4gICAgY3R4LmZpbGwoKTtcbiAgICBjdHguY2xvc2VQYXRoKCk7XG5cbiAgICAvLyBwYXJhbGxlbCBzaWducyBcbiAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgcGFyYWxsZWxTaWduKGN0eCx0aGlzLkIsdGhpcy5odDEsNSk7XG4gICAgcGFyYWxsZWxTaWduKGN0eCx0aGlzLkEsdGhpcy5odDIsNSk7XG4gICAgY3R4LnN0cm9rZSgpO1xuICAgIGN0eC5jbG9zZVBhdGgoKTtcblxuICAgIC8vIGRyYXcgaGVpZ2h0XG4gICAgaWYgKHRoaXMuZGF0YS5oZWlnaHQuc2hvdykge1xuICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgYXJyb3dMaW5lKGN0eCwgUG9pbnQubWVhbih0aGlzLmh0MSx0aGlzLmh0MiksdGhpcy5odDEsIDgpO1xuICAgICAgYXJyb3dMaW5lKGN0eCwgUG9pbnQubWVhbih0aGlzLmh0MSx0aGlzLmh0MiksdGhpcy5odDIsIDgpO1xuICAgICAgY3R4LnN0cm9rZSgpO1xuICAgICAgY3R4LmNsb3NlUGF0aCgpO1xuXG4gICAgICAvLyBSQSBzeW1ib2xcbiAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgIGN0eC5zZXRMaW5lRGFzaChbXSk7XG4gICAgICBkcmF3UmlnaHRBbmdsZShjdHgsdGhpcy5odDEsdGhpcy5odDIsdGhpcy5ELCAxMik7XG4gICAgICBjdHguc3Ryb2tlKCk7XG4gICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgfVxuXG4gICAgLy8gcmEgc3ltYm9sIGZvciByaWdodCBhbmdsZWQgdHJhcGV6aWFcbiAgICBpZih0aGlzLmRhdGEuaGVpZ2h0LnZhbCA9PT0gdGhpcy5kYXRhLnNpZGUyLnZhbCkge1xuICAgICAgY3R4LmJlZ2luUGF0aCgpXG4gICAgICBkcmF3UmlnaHRBbmdsZShjdHgsIHRoaXMuQiwgdGhpcy5DLCB0aGlzLkQsIDEyKVxuICAgICAgZHJhd1JpZ2h0QW5nbGUoY3R4LCB0aGlzLkMsIHRoaXMuRCwgdGhpcy5BLCAxMilcbiAgICAgIGN0eC5zdHJva2UoKVxuICAgIH1cblxuICAgIHRoaXMucmVuZGVyTGFiZWxzKClcbiAgfVxufSIsImltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgVHJhcGV6aXVtQXJlYURhdGEgZnJvbSAnLi9UcmFwZXppdW1BcmVhRGF0YSdcbmltcG9ydCBUcmFwZXppdW1BcmVhVmlldyBmcm9tICcuL1RyYXBleml1bUFyZWFWaWV3J1xuaW1wb3J0IHsgUXVlc3Rpb25PcHRpb25zIH0gZnJvbSAnLi90eXBlcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVHJhcGV6aXVtQXJlYVEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGEhOiBUcmFwZXppdW1BcmVhRGF0YSAvLyBpbml0aWFsaXNlZCBpbiBzdXBlcigpXG4gIHZpZXchOiBUcmFwZXppdW1BcmVhVmlld1xuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFJlcXVpcmVkPFF1ZXN0aW9uT3B0aW9ucz4sIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucykge1xuICAgIGNvbnN0IGRhdGEgPSBUcmFwZXppdW1BcmVhRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gVHJhcGV6aXVtQXJlYVZpZXcuZnJvbURhdGEoZGF0YSx2aWV3T3B0aW9ucylcbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZXMnXG4gIH1cbn0iLCIvKiEgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcclxuQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uXHJcblxyXG5QZXJtaXNzaW9uIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBhbmQvb3IgZGlzdHJpYnV0ZSB0aGlzIHNvZnR3YXJlIGZvciBhbnlcclxucHVycG9zZSB3aXRoIG9yIHdpdGhvdXQgZmVlIGlzIGhlcmVieSBncmFudGVkLlxyXG5cclxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiBBTkQgVEhFIEFVVEhPUiBESVNDTEFJTVMgQUxMIFdBUlJBTlRJRVMgV0lUSFxyXG5SRUdBUkQgVE8gVEhJUyBTT0ZUV0FSRSBJTkNMVURJTkcgQUxMIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFlcclxuQU5EIEZJVE5FU1MuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1IgQkUgTElBQkxFIEZPUiBBTlkgU1BFQ0lBTCwgRElSRUNULFxyXG5JTkRJUkVDVCwgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTIE9SIEFOWSBEQU1BR0VTIFdIQVRTT0VWRVIgUkVTVUxUSU5HIEZST01cclxuTE9TUyBPRiBVU0UsIERBVEEgT1IgUFJPRklUUywgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIE5FR0xJR0VOQ0UgT1JcclxuT1RIRVIgVE9SVElPVVMgQUNUSU9OLCBBUklTSU5HIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFVTRSBPUlxyXG5QRVJGT1JNQU5DRSBPRiBUSElTIFNPRlRXQVJFLlxyXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiAqL1xyXG4vKiBnbG9iYWwgUmVmbGVjdCwgUHJvbWlzZSAqL1xyXG5cclxudmFyIGV4dGVuZFN0YXRpY3MgPSBmdW5jdGlvbihkLCBiKSB7XHJcbiAgICBleHRlbmRTdGF0aWNzID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8XHJcbiAgICAgICAgKHsgX19wcm90b19fOiBbXSB9IGluc3RhbmNlb2YgQXJyYXkgJiYgZnVuY3Rpb24gKGQsIGIpIHsgZC5fX3Byb3RvX18gPSBiOyB9KSB8fFxyXG4gICAgICAgIGZ1bmN0aW9uIChkLCBiKSB7IGZvciAodmFyIHAgaW4gYikgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChiLCBwKSkgZFtwXSA9IGJbcF07IH07XHJcbiAgICByZXR1cm4gZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2V4dGVuZHMoZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xyXG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcclxuICAgIHZhciB0ID0ge307XHJcbiAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICB0W3BdID0gc1twXTtcclxuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcclxuICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgIH1cclxuICAgIHJldHVybiB0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5tZXRhZGF0YSA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gUmVmbGVjdC5tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0ZXIodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19nZW5lcmF0b3IodGhpc0FyZywgYm9keSkge1xyXG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZztcclxuICAgIHJldHVybiBnID0geyBuZXh0OiB2ZXJiKDApLCBcInRocm93XCI6IHZlcmIoMSksIFwicmV0dXJuXCI6IHZlcmIoMikgfSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKG9wKSB7XHJcbiAgICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xyXG4gICAgICAgIHdoaWxlIChfKSB0cnkge1xyXG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XHJcbiAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcclxuICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XHJcbiAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19jcmVhdGVCaW5kaW5nID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9KTtcclxufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICBvW2syXSA9IG1ba107XHJcbn0pO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXhwb3J0U3RhcihtLCBvKSB7XHJcbiAgICBmb3IgKHZhciBwIGluIG0pIGlmIChwICE9PSBcImRlZmF1bHRcIiAmJiAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIHApKSBfX2NyZWF0ZUJpbmRpbmcobywgbSwgcCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3ZhbHVlcyhvKSB7XHJcbiAgICB2YXIgcyA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBTeW1ib2wuaXRlcmF0b3IsIG0gPSBzICYmIG9bc10sIGkgPSAwO1xyXG4gICAgaWYgKG0pIHJldHVybiBtLmNhbGwobyk7XHJcbiAgICBpZiAobyAmJiB0eXBlb2Ygby5sZW5ndGggPT09IFwibnVtYmVyXCIpIHJldHVybiB7XHJcbiAgICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAobyAmJiBpID49IG8ubGVuZ3RoKSBvID0gdm9pZCAwO1xyXG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogbyAmJiBvW2krK10sIGRvbmU6ICFvIH07XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IocyA/IFwiT2JqZWN0IGlzIG5vdCBpdGVyYWJsZS5cIiA6IFwiU3ltYm9sLml0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVhZChvLCBuKSB7XHJcbiAgICB2YXIgbSA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvW1N5bWJvbC5pdGVyYXRvcl07XHJcbiAgICBpZiAoIW0pIHJldHVybiBvO1xyXG4gICAgdmFyIGkgPSBtLmNhbGwobyksIHIsIGFyID0gW10sIGU7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHdoaWxlICgobiA9PT0gdm9pZCAwIHx8IG4tLSA+IDApICYmICEociA9IGkubmV4dCgpKS5kb25lKSBhci5wdXNoKHIudmFsdWUpO1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGVycm9yKSB7IGUgPSB7IGVycm9yOiBlcnJvciB9OyB9XHJcbiAgICBmaW5hbGx5IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAociAmJiAhci5kb25lICYmIChtID0gaVtcInJldHVyblwiXSkpIG0uY2FsbChpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZmluYWxseSB7IGlmIChlKSB0aHJvdyBlLmVycm9yOyB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZCgpIHtcclxuICAgIGZvciAodmFyIGFyID0gW10sIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgIGFyID0gYXIuY29uY2F0KF9fcmVhZChhcmd1bWVudHNbaV0pKTtcclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXlzKCkge1xyXG4gICAgZm9yICh2YXIgcyA9IDAsIGkgPSAwLCBpbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBpbDsgaSsrKSBzICs9IGFyZ3VtZW50c1tpXS5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciByID0gQXJyYXkocyksIGsgPSAwLCBpID0gMDsgaSA8IGlsOyBpKyspXHJcbiAgICAgICAgZm9yICh2YXIgYSA9IGFyZ3VtZW50c1tpXSwgaiA9IDAsIGpsID0gYS5sZW5ndGg7IGogPCBqbDsgaisrLCBrKyspXHJcbiAgICAgICAgICAgIHJba10gPSBhW2pdO1xyXG4gICAgcmV0dXJuIHI7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdCh2KSB7XHJcbiAgICByZXR1cm4gdGhpcyBpbnN0YW5jZW9mIF9fYXdhaXQgPyAodGhpcy52ID0gdiwgdGhpcykgOiBuZXcgX19hd2FpdCh2KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNHZW5lcmF0b3IodGhpc0FyZywgX2FyZ3VtZW50cywgZ2VuZXJhdG9yKSB7XHJcbiAgICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgdmFyIGcgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSksIGksIHEgPSBbXTtcclxuICAgIHJldHVybiBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobikgeyBpZiAoZ1tuXSkgaVtuXSA9IGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAoYSwgYikgeyBxLnB1c2goW24sIHYsIGEsIGJdKSA+IDEgfHwgcmVzdW1lKG4sIHYpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gcmVzdW1lKG4sIHYpIHsgdHJ5IHsgc3RlcChnW25dKHYpKTsgfSBjYXRjaCAoZSkgeyBzZXR0bGUocVswXVszXSwgZSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gc3RlcChyKSB7IHIudmFsdWUgaW5zdGFuY2VvZiBfX2F3YWl0ID8gUHJvbWlzZS5yZXNvbHZlKHIudmFsdWUudikudGhlbihmdWxmaWxsLCByZWplY3QpIDogc2V0dGxlKHFbMF1bMl0sIHIpOyB9XHJcbiAgICBmdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7IHJlc3VtZShcIm5leHRcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiByZWplY3QodmFsdWUpIHsgcmVzdW1lKFwidGhyb3dcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUoZiwgdikgeyBpZiAoZih2KSwgcS5zaGlmdCgpLCBxLmxlbmd0aCkgcmVzdW1lKHFbMF1bMF0sIHFbMF1bMV0pOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jRGVsZWdhdG9yKG8pIHtcclxuICAgIHZhciBpLCBwO1xyXG4gICAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiLCBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9KSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpW25dID0gb1tuXSA/IGZ1bmN0aW9uICh2KSB7IHJldHVybiAocCA9ICFwKSA/IHsgdmFsdWU6IF9fYXdhaXQob1tuXSh2KSksIGRvbmU6IG4gPT09IFwicmV0dXJuXCIgfSA6IGYgPyBmKHYpIDogdjsgfSA6IGY7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNWYWx1ZXMobykge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBtID0gb1tTeW1ib2wuYXN5bmNJdGVyYXRvcl0sIGk7XHJcbiAgICByZXR1cm4gbSA/IG0uY2FsbChvKSA6IChvID0gdHlwZW9mIF9fdmFsdWVzID09PSBcImZ1bmN0aW9uXCIgPyBfX3ZhbHVlcyhvKSA6IG9bU3ltYm9sLml0ZXJhdG9yXSgpLCBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaSk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaVtuXSA9IG9bbl0gJiYgZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHsgdiA9IG9bbl0odiksIHNldHRsZShyZXNvbHZlLCByZWplY3QsIHYuZG9uZSwgdi52YWx1ZSk7IH0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCBkLCB2KSB7IFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGZ1bmN0aW9uKHYpIHsgcmVzb2x2ZSh7IHZhbHVlOiB2LCBkb25lOiBkIH0pOyB9LCByZWplY3QpOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX21ha2VUZW1wbGF0ZU9iamVjdChjb29rZWQsIHJhdykge1xyXG4gICAgaWYgKE9iamVjdC5kZWZpbmVQcm9wZXJ0eSkgeyBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29va2VkLCBcInJhd1wiLCB7IHZhbHVlOiByYXcgfSk7IH0gZWxzZSB7IGNvb2tlZC5yYXcgPSByYXc7IH1cclxuICAgIHJldHVybiBjb29rZWQ7XHJcbn07XHJcblxyXG52YXIgX19zZXRNb2R1bGVEZWZhdWx0ID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XHJcbn0pIDogZnVuY3Rpb24obywgdikge1xyXG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0U3Rhcihtb2QpIHtcclxuICAgIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XHJcbiAgICB2YXIgcmVzdWx0ID0ge307XHJcbiAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgaW4gbW9kKSBpZiAoayAhPT0gXCJkZWZhdWx0XCIgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1vZCwgaykpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwgayk7XHJcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0RGVmYXVsdChtb2QpIHtcclxuICAgIHJldHVybiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSA/IG1vZCA6IHsgZGVmYXVsdDogbW9kIH07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0KHJlY2VpdmVyLCBwcml2YXRlTWFwKSB7XHJcbiAgICBpZiAoIXByaXZhdGVNYXAuaGFzKHJlY2VpdmVyKSkge1xyXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJhdHRlbXB0ZWQgdG8gZ2V0IHByaXZhdGUgZmllbGQgb24gbm9uLWluc3RhbmNlXCIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHByaXZhdGVNYXAuZ2V0KHJlY2VpdmVyKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRTZXQocmVjZWl2ZXIsIHByaXZhdGVNYXAsIHZhbHVlKSB7XHJcbiAgICBpZiAoIXByaXZhdGVNYXAuaGFzKHJlY2VpdmVyKSkge1xyXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJhdHRlbXB0ZWQgdG8gc2V0IHByaXZhdGUgZmllbGQgb24gbm9uLWluc3RhbmNlXCIpO1xyXG4gICAgfVxyXG4gICAgcHJpdmF0ZU1hcC5zZXQocmVjZWl2ZXIsIHZhbHVlKTtcclxuICAgIHJldHVybiB2YWx1ZTtcclxufVxyXG4iLCJpbXBvcnQgeyByYW5kRWxlbSwgcmFuZE11bHRCZXR3ZWVuIH0gZnJvbSAnLi91dGlsaXRpZXMuanMnXG5cbmNvbnN0IHBhdGhSb290ID0gJy9kaXN0LydcblxudHlwZSBpbmRleFZhbHMgPSAnMTAwJyB8ICcyMDAnIHwgJzMwMCcgfCAnNDAwJyB8ICc1MDAnXG5cbmV4cG9ydCBpbnRlcmZhY2UgVHJpYW5nbGV7XG4gIGI6IG51bWJlcixcbiAgczE6IG51bWJlcixcbiAgczI6IG51bWJlcixcbiAgaDogbnVtYmVyXG59XG5cbmludGVyZmFjZSBkYXRhU291cmNlIHtcbiAgcmVhZG9ubHkgbGVuZ3RoOiBudW1iZXIsXG4gIHJlYWRvbmx5IHBhdGg6IHN0cmluZyxcbiAgc3RhdHVzOiAndW5jYWNoZWQnIHwgJ2NhY2hlZCcgfCAncGVuZGluZycsXG4gIGRhdGE6IFRyaWFuZ2xlW10sXG4gIHF1ZXVlOiB7XG4gICAgY2FsbGJhY2s6ICh0OiBUcmlhbmdsZSkgPT4gdm9pZCxcbiAgICBtYXhMZW5ndGg6IG51bWJlcixcbiAgICBmaWx0ZXI/OiAodDogVHJpYW5nbGUpID0+IGJvb2xlYW5cbiAgfVtdXG59XG5cblxuY29uc3QgZGF0YVNvdXJjZXMgOiBSZWNvcmQ8aW5kZXhWYWxzLCBkYXRhU291cmNlPiA9IHtcbiAgMTAwOiB7XG4gICAgbGVuZ3RoOiAzNjEsXG4gICAgcGF0aDogJy9kYXRhL3RyaWFuZ2xlczAtMTAwLmpzb24nLFxuICAgIHN0YXR1czogJ3VuY2FjaGVkJyxcbiAgICBkYXRhOiBbXSxcbiAgICBxdWV1ZTogW11cbiAgfSxcbiAgMjAwOiB7XG4gICAgbGVuZ3RoOiA3MTUsXG4gICAgcGF0aDogJy9kYXRhL3RyaWFuZ2xlczEwMC0yMDAuanNvbicsXG4gICAgc3RhdHVzOiAndW5jYWNoZWQnLFxuICAgIGRhdGE6IFtdLFxuICAgIHF1ZXVlOiBbXVxuICB9LFxuICAzMDA6IHtcbiAgICBsZW5ndGg6IDkyNyxcbiAgICBwYXRoOiAnL2RhdGEvdHJpYW5nbGVzMjAwLTMwMC5qc29uJyxcbiAgICBzdGF0dXM6ICd1bmNhY2hlZCcsXG4gICAgZGF0YTogW10sXG4gICAgcXVldWU6IFtdXG4gIH0sXG4gIDQwMDoge1xuICAgIGxlbmd0aDogMTA0MyxcbiAgICBwYXRoOiAnL2RhdGEvdHJpYW5nbGVzMzAwLTQwMC5qc29uJyxcbiAgICBzdGF0dXM6ICd1bmNhY2hlZCcsXG4gICAgZGF0YTogW10sXG4gICAgcXVldWU6IFtdXG4gIH0sXG4gIDUwMDoge1xuICAgIGxlbmd0aDogMTE1MSxcbiAgICBwYXRoOiAnL2RhdGEvdHJpYW5nbGVzNDAwLTUwMC5qc29uJyxcbiAgICBzdGF0dXM6ICd1bmNhY2hlZCcsXG4gICAgZGF0YTogW10sXG4gICAgcXVldWU6IFtdXG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm4gYSBwcm9taXNlIHRvIGEgcmFuZG9tbHkgY2hvc2VuIHRyaWFuZ2xlIChzZWUgdHJpYW5nbGVEYXRhLlRyaWFuZ2xlIGludGVyZmFjZSBmb3IgZm9ybWF0KVxuICogQHBhcmFtIG1heExlbmd0aCBNYXh1bXVtIGxlbmd0aCBvZiBzaWRlXG4gKiBAcGFyYW0gZmlsdGVyUHJlZGljYXRlIFJlc3RyaWN0IHRvIHRyaWFuZ2xlcyB3aXRoIHRoaXMgcHJvcGVydHlcbiAqL1xuZnVuY3Rpb24gZ2V0VHJpYW5nbGUgKG1heExlbmd0aDogbnVtYmVyLCBmaWx0ZXJQcmVkaWNhdGU/OiAodDogVHJpYW5nbGUpID0+IGJvb2xlYW4pIDogUHJvbWlzZTxUcmlhbmdsZT4ge1xuICBsZXQgdHJpYW5nbGU6IFRyaWFuZ2xlXG4gIGZpbHRlclByZWRpY2F0ZSA9IGZpbHRlclByZWRpY2F0ZSA/PyAodCA9PiB0cnVlKSAvLyBkZWZhdWx0IHZhbHVlIGZvciBwcmVkaWNhdGUgaXMgdGF1dG9sb2d5XG5cbiAgLy8gQ2hvb3NlIG11bHRpcGxlIG9mIDUwIHRvIHNlbGVjdCBmcm9tIC0gc21vb3RocyBvdXQgZGlzdHJpYnV0aW9uLlxuICAvLyAoT3RoZXJ3aXNlIGl0J3MgYmlhc2VkIHRvd2FyZHMgaGlnaGVyIGxlbmd0aHMpXG4gIGlmIChtYXhMZW5ndGggPiA1MDApIG1heExlbmd0aCA9IDUwMFxuICBjb25zdCBiaW41MCA9IHJhbmRNdWx0QmV0d2VlbigwLCBtYXhMZW5ndGggLSAxLCA1MCkgKyA1MCAvLyBlLmcuIGlmIGJpbjUwID0gMTUwLCBjaG9vc2Ugd2l0aCBhIG1heGxlbmd0aCBiZXR3ZWVuIDEwMCBhbmQgMTUwXG4gIGNvbnN0IGJpbjEwMCA9IChNYXRoLmNlaWwoYmluNTAgLyAxMDApICogMTAwKS50b1N0cmluZygpIGFzIGluZGV4VmFscyAvLyBlLmcuIGlmIGJpbjUwID0gMTUwLCBiaW4xMDAgPSBNYXRoLmNlaWwoMS41KSoxMDAgPSAyMDBcbiAgY29uc3QgZGF0YVNvdXJjZSA9IGRhdGFTb3VyY2VzW2JpbjEwMF1cblxuICBpZiAoZGF0YVNvdXJjZS5zdGF0dXMgPT09ICdjYWNoZWQnKSB7IC8vIENhY2hlZCAtIGp1c3QgbG9hZCBkYXRhXG4gICAgY29uc29sZS5sb2coJ1VzaW5nIGNhY2hlZCBkYXRhJylcbiAgICB0cmlhbmdsZSA9IHJhbmRFbGVtKGRhdGFTb3VyY2UuZGF0YS5maWx0ZXIodCA9PiBtYXhTaWRlKHQpIDwgbWF4TGVuZ3RoICYmIGZpbHRlclByZWRpY2F0ZSEodCkpKVxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodHJpYW5nbGUpXG4gIH1cblxuICBlbHNlIGlmIChkYXRhU291cmNlLnN0YXR1cyA9PT0gJ3BlbmRpbmcnKSB7IC8vIHBlbmRpbmcgLSBwdXQgY2FsbGJhY2sgaW50byBxdWV1ZVxuICAgIGNvbnNvbGUubG9nKCdQZW5kaW5nOiBhZGRpbmcgcmVxdWVzdCB0byBxdWV1ZScpXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCkgPT4ge1xuICAgICAgZGF0YVNvdXJjZS5xdWV1ZS5wdXNoKHtjYWxsYmFjazogcmVzb2x2ZSwgbWF4TGVuZ3RoOiBtYXhMZW5ndGgsIGZpbHRlcjogZmlsdGVyUHJlZGljYXRlfSlcbiAgICB9KVxuICB9XG4gIFxuICBlbHNlIHsgLy8gbm9ib2R5IGhhcyBsb2FkZWQgeWV0XG4gICAgY29uc29sZS5sb2coJ0xvYWRpbmcgZGF0YSB3aXRoIFhIUicpXG4gICAgZGF0YVNvdXJjZS5zdGF0dXMgPSAncGVuZGluZydcbiAgICByZXR1cm4gZmV0Y2goYCR7cGF0aFJvb3R9JHtkYXRhU291cmNlLnBhdGh9YCkudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChyZXNwb25zZS5zdGF0dXNUZXh0KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFRyaWFuZ2xlW10+XG4gICAgICB9XG4gICAgfSkudGhlbihkYXRhID0+IHtcbiAgICAgIGRhdGFTb3VyY2UuZGF0YSA9IGRhdGFcbiAgICAgIGRhdGFTb3VyY2Uuc3RhdHVzID0gJ2NhY2hlZCdcbiAgICAgIGRhdGFTb3VyY2UucXVldWUuZm9yRWFjaCggKHtjYWxsYmFjayxtYXhMZW5ndGgsIGZpbHRlcn0pID0+IHtcbiAgICAgICAgZmlsdGVyID0gZmlsdGVyID8/ICh0PT50cnVlKVxuICAgICAgICBjb25zdCB0cmlhbmdsZSA9IHJhbmRFbGVtKGRhdGEuZmlsdGVyKCh0OiBUcmlhbmdsZSkgPT4gbWF4U2lkZSh0KSA8IG1heExlbmd0aCAmJiBmaWx0ZXIhKHQpKSlcbiAgICAgICAgY29uc29sZS5sb2coJ2xvYWRpbmcgZnJvbSBxdWV1ZScpXG4gICAgICAgIGNhbGxiYWNrKHRyaWFuZ2xlKVxuICAgICAgfSlcbiAgICAgIHRyaWFuZ2xlID0gcmFuZEVsZW0oZGF0YS5maWx0ZXIoKHQ6IFRyaWFuZ2xlKSA9PiBtYXhTaWRlKHQpIDwgbWF4TGVuZ3RoICYmIGZpbHRlclByZWRpY2F0ZSEodCkpKVxuICAgICAgcmV0dXJuIHRyaWFuZ2xlXG4gICAgfSlcbiAgfSBcbn1cblxuZnVuY3Rpb24gbWF4U2lkZSAodHJpYW5nbGU6IFRyaWFuZ2xlKSB7XG4gIHJldHVybiBNYXRoLm1heCh0cmlhbmdsZS5iLCB0cmlhbmdsZS5zMSwgdHJpYW5nbGUuczIpXG59XG5cbmV4cG9ydCB7IGdldFRyaWFuZ2xlLCBkYXRhU291cmNlcyB9XG4iLCJpbXBvcnQgeyByYW5kQmV0d2VlbiwgcmFuZEVsZW0sIHNjYWxlZFN0ciB9IGZyb20gJ3V0aWxpdGllcy5qcycgLy8gY2hhbmdlIHJlbGF0aXZlIHBhdGggYWZ0ZXIgdGVzdGluZ1xuaW1wb3J0IHsgVmFsdWUgfSBmcm9tICcuL1JlY3RhbmdsZUFyZWFEYXRhJ1xuaW1wb3J0IHsgUXVlc3Rpb25PcHRpb25zIH0gZnJvbSAnLi90eXBlcydcbmltcG9ydCAqIGFzIFREIGZyb20gJ3RyaWFuZ2xlRGF0YS1xdWV1ZSdcbmltcG9ydCBmcmFjdGlvbiBmcm9tICdmcmFjdGlvbi5qcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVHJpYW5nbGVBcmVhRGF0YSB7XG4gIHJlYWRvbmx5IGJhc2U6IFZhbHVlXG4gIHJlYWRvbmx5IHNpZGUxOiBWYWx1ZVxuICByZWFkb25seSBzaWRlMjogVmFsdWVcbiAgcmVhZG9ubHkgaGVpZ2h0OiBWYWx1ZVxuICBwcml2YXRlIHJlYWRvbmx5IGRwOiBudW1iZXJcbiAgcHJpdmF0ZSByZWFkb25seSBkZW5vbWluYXRvcjogbnVtYmVyID0gMVxuICBwcml2YXRlIF9hcmVhPzogUGFydGlhbDxWYWx1ZT5cbiAgcHJpdmF0ZSBfcGVyaW1ldGVyPzogUGFydGlhbDxWYWx1ZT5cblxuICBjb25zdHJ1Y3RvciAoXG4gICAgYmFzZTogVmFsdWUsXG4gICAgc2lkZTE6IFZhbHVlLFxuICAgIHNpZGUyOiBWYWx1ZSxcbiAgICBoZWlnaHQ6IFZhbHVlLFxuICAgIGRwOiBudW1iZXIsXG4gICAgZGVub21pbmF0b3I6IG51bWJlcixcbiAgICBhcmVhUHJvcGVydGllcz86IE9taXQ8VmFsdWUsICd2YWwnPixcbiAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzPzogT21pdDxWYWx1ZSwgJ3ZhbCc+KSB7XG4gICAgdGhpcy5iYXNlID0gYmFzZVxuICAgIHRoaXMuc2lkZTEgPSBzaWRlMVxuICAgIHRoaXMuc2lkZTIgPSBzaWRlMlxuICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0XG4gICAgdGhpcy5kcCA9IGRwXG4gICAgdGhpcy5kZW5vbWluYXRvciA9IGRlbm9taW5hdG9yXG4gICAgdGhpcy5fYXJlYSA9IGFyZWFQcm9wZXJ0aWVzXG4gICAgdGhpcy5fcGVyaW1ldGVyID0gcGVyaW1ldGVyUHJvcGVydGllc1xuICB9XG5cbiAgZ2V0IHBlcmltZXRlciAoKTogVmFsdWUge1xuICAgIGlmICghdGhpcy5fcGVyaW1ldGVyKSB7IC8vIGRlZmF1bHRzIGZvciBwcm9wZXJ0aWVzXG4gICAgICB0aGlzLl9wZXJpbWV0ZXIgPSB7XG4gICAgICAgIHNob3c6IGZhbHNlLFxuICAgICAgICBtaXNzaW5nOiB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5fcGVyaW1ldGVyLnZhbCkge1xuICAgICAgdGhpcy5fcGVyaW1ldGVyLnZhbCA9IHRoaXMuYmFzZS52YWwgKyB0aGlzLnNpZGUxLnZhbCArIHRoaXMuc2lkZTIudmFsXG4gICAgICBpZiAodGhpcy5kZW5vbWluYXRvciA+IDEpIHtcbiAgICAgICAgdGhpcy5fcGVyaW1ldGVyLmxhYmVsID0gbmV3IGZyYWN0aW9uKHRoaXMuX3BlcmltZXRlci52YWwsIHRoaXMuZGVub21pbmF0b3IpLnRvTGF0ZXgodHJ1ZSkgKyAnXFxcXG1hdGhybXtjbX0nXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9wZXJpbWV0ZXIubGFiZWwgPSBzY2FsZWRTdHIodGhpcy5fcGVyaW1ldGVyLnZhbCwgdGhpcy5kcCkgKyAnXFxcXG1hdGhybXtjbX0nXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3BlcmltZXRlciBhcyBWYWx1ZVxuICB9XG5cbiAgZ2V0IGFyZWEgKCk6IFZhbHVlIHtcbiAgICBpZiAoIXRoaXMuX2FyZWEpIHtcbiAgICAgIHRoaXMuX2FyZWEgPSB7XG4gICAgICAgIHNob3c6IGZhbHNlLFxuICAgICAgICBtaXNzaW5nOiB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5fYXJlYS52YWwpIHtcbiAgICAgIHRoaXMuX2FyZWEudmFsID0gdGhpcy5iYXNlLnZhbCAqIHRoaXMuaGVpZ2h0LnZhbCAvIDJcbiAgICAgIGlmICh0aGlzLmRlbm9taW5hdG9yID4gMSkge1xuICAgICAgICB0aGlzLl9hcmVhLmxhYmVsID0gbmV3IGZyYWN0aW9uKHRoaXMuX2FyZWEudmFsLCB0aGlzLmRlbm9taW5hdG9yKioyKS50b0xhdGV4KHRydWUpICsgJ1xcXFxtYXRocm17Y219XjInXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9hcmVhLmxhYmVsID0gc2NhbGVkU3RyKHRoaXMuX2FyZWEudmFsLCAyICogdGhpcy5kcCkgKyAnXFxcXG1hdGhybXtjbX1eMidcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2FyZWEgYXMgVmFsdWVcbiAgfVxuXG4gIGlzUmlnaHRBbmdsZWQgKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHRyaWFuZ2xlOiBURC5UcmlhbmdsZSA9IHtcbiAgICAgIGI6IHRoaXMuYmFzZS52YWwsXG4gICAgICBoOiB0aGlzLmhlaWdodC52YWwsXG4gICAgICBzMTogdGhpcy5zaWRlMS52YWwsXG4gICAgICBzMjogdGhpcy5zaWRlMi52YWxcbiAgICB9XG4gICAgcmV0dXJuIGlzUmlnaHRBbmdsZWQodHJpYW5nbGUpXG4gIH1cblxuICBzdGF0aWMgYXN5bmMgcmFuZG9tIChvcHRpb25zOiBRdWVzdGlvbk9wdGlvbnMpOiBQcm9taXNlPFRyaWFuZ2xlQXJlYURhdGE+IHtcbiAgICBvcHRpb25zLm1heExlbmd0aCA9IG9wdGlvbnMubWF4TGVuZ3RoIHx8IDIwXG4gICAgY29uc3QgZHAgPSBvcHRpb25zLmRwIHx8IDBcbiAgICBjb25zdCBkZW5vbWluYXRvciA9IG9wdGlvbnMuZnJhY3Rpb24/IHJhbmRCZXR3ZWVuKDIsNikgOiAxXG4gICAgY29uc3QgcmVxdWlyZUlzb3NjZWxlcyA9IChvcHRpb25zLnF1ZXN0aW9uVHlwZSA9PT0gJ3B5dGhhZ29yYXNJc29zY2VsZXNBcmVhJylcbiAgICBjb25zdCByZXF1aXJlUmlnaHRBbmdsZSA9IChvcHRpb25zLnF1ZXN0aW9uVHlwZSA9PT0gJ3B5dGhhZ29yYXNBcmVhJyB8fCBvcHRpb25zLnF1ZXN0aW9uVHlwZSA9PT0gJ3B5dGhhZ29yYXNQZXJpbWV0ZXInKVxuXG4gICAgLy8gZ2V0IGEgdHJpYW5nbGUuIFRELmdldFRyaWFuZ2xlIGlzIGFzeW5jLCBzbyBuZWVkIHRvIGF3YWl0XG4gICAgY29uc3QgdHJpYW5nbGU6IFRELlRyaWFuZ2xlID1cbiAgICAgIGF3YWl0IFRELmdldFRyaWFuZ2xlKG9wdGlvbnMubWF4TGVuZ3RoLCB0ID0+XG4gICAgICAgICghcmVxdWlyZUlzb3NjZWxlcyB8fCBpc0lzb3NjZWxlcyh0KSkgJiZcbiAgICAgICAgICAoIXJlcXVpcmVSaWdodEFuZ2xlIHx8IGlzUmlnaHRBbmdsZWQodCkpXG4gICAgICApXG5cbiAgICAvLyB1c2VmdWwgZm9yIHNvbWUgbG9naWMgbmV4dFxuICAgIC8vIG5iIG9ubHkgcmVmZXJzIHRvIFJBIHRyaWFuZ2xlcyB3aGVyIHRoZSBoeXBvdGVudXNlIGlzIG5vdCB0aGUgJ2Jhc2UnXG4gICAgY29uc3QgcmlnaHRBbmdsZWQgPSBpc1JpZ2h0QW5nbGVkKHRyaWFuZ2xlKVxuXG4gICAgY29uc3QgYmFzZSA6IFZhbHVlID0geyB2YWw6IHRyaWFuZ2xlLmIsIHNob3c6IHRydWUsIG1pc3Npbmc6IGZhbHNlIH1cbiAgICBjb25zdCBoZWlnaHQgOiBWYWx1ZSA9IHsgdmFsOiB0cmlhbmdsZS5oLCBzaG93OiAhcmlnaHRBbmdsZWQsIG1pc3Npbmc6IGZhbHNlIH0gLy8gaGlkZSBoZWlnaHQgaW4gUkEgdHJpYW5nbGVzXG4gICAgY29uc3Qgc2lkZTEgOiBWYWx1ZSA9IHsgdmFsOiB0cmlhbmdsZS5zMSwgc2hvdzogdHJ1ZSwgbWlzc2luZzogZmFsc2UgfVxuICAgIGNvbnN0IHNpZGUyIDogVmFsdWUgPSB7IHZhbDogdHJpYW5nbGUuczIsIHNob3c6IHRydWUsIG1pc3Npbmc6IGZhbHNlIH07XG4gICAgW2Jhc2UsIGhlaWdodCwgc2lkZTEsIHNpZGUyXS5mb3JFYWNoKHYgPT4ge1xuICAgICAgaWYgKGRlbm9taW5hdG9yID09PSAxKSB7XG4gICAgICAgIHYubGFiZWwgPSBzY2FsZWRTdHIodi52YWwsIGRwKSArICdcXFxcbWF0aHJte2NtfSdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHYubGFiZWwgPSBuZXcgZnJhY3Rpb24odi52YWwsZGVub21pbmF0b3IpLnRvTGF0ZXgodHJ1ZSkgKyBcIlxcXFxtYXRocm17Y219XCJcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gU29tZSBhbGlhc2VzIHVzZWZ1bCB3aGVuIHJlYXNvbmluZyBhYm91dCBSQSB0cmlhbmdsZXNcbiAgICAvLyBOQiAoYSkgdGhlc2UgYXJlIHJlZnMgdG8gc2FtZSBvYmplY3QsIG5vdCBjb3BpZXNcbiAgICAvLyAoYikgbm90IHZlcnkgbWVhbmluZ2Z1bCBmb3Igbm9uIFJBIHRyaWFuZ2xlc1xuICAgIGNvbnN0IGxlZzEgPSBiYXNlXG4gICAgY29uc3QgbGVnMiA9IChzaWRlMS52YWwgPiBzaWRlMi52YWwpID8gc2lkZTIgOiBzaWRlMVxuICAgIGNvbnN0IGh5cG90ZW51c2UgPSAoc2lkZTEudmFsID4gc2lkZTIudmFsKSA/IHNpZGUxIDogc2lkZTJcblxuICAgIGNvbnN0IGFyZWFQcm9wZXJ0aWVzID0geyBzaG93OiBmYWxzZSwgbWlzc2luZzogdHJ1ZSB9XG4gICAgY29uc3QgcGVyaW1ldGVyUHJvcGVydGllcyA9IHsgc2hvdzogZmFsc2UsIG1pc3Npbmc6IHRydWUgfVxuXG4gICAgLy8gc2hvdy9oaWRlIGJhc2VkIG9uIHR5cGVcbiAgICBzd2l0Y2ggKG9wdGlvbnMucXVlc3Rpb25UeXBlKSB7XG4gICAgICBjYXNlICdhcmVhJzpcbiAgICAgICAgYXJlYVByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgYXJlYVByb3BlcnRpZXMubWlzc2luZyA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3BlcmltZXRlcic6XG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAncmV2ZXJzZUFyZWEnOiB7XG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLm1pc3NpbmcgPSBmYWxzZVxuICAgICAgICBjb25zdCBjb2luVG9zcyA9IChNYXRoLnJhbmRvbSgpIDwgMC41KSAvLyA1MC81MCB0cnVlL2ZhbHNlXG4gICAgICAgIGlmIChyaWdodEFuZ2xlZCkgeyAvLyBoaWRlIG9uZSBvZiB0aGUgbGVnc1xuICAgICAgICAgIGlmIChjb2luVG9zcykgbGVnMS5taXNzaW5nID0gdHJ1ZVxuICAgICAgICAgIGVsc2UgbGVnMi5taXNzaW5nID0gdHJ1ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChjb2luVG9zcykgYmFzZS5taXNzaW5nID0gdHJ1ZVxuICAgICAgICAgIGVsc2UgaGVpZ2h0Lm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3JldmVyc2VQZXJpbWV0ZXInOiB7XG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nID0gZmFsc2VcbiAgICAgICAgcmFuZEVsZW0oW2Jhc2UsIHNpZGUxLCBzaWRlMl0pLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdweXRoYWdvcmFzQXJlYSc6XG4gICAgICAgIGlmICghcmlnaHRBbmdsZWQpIHRocm93IG5ldyBFcnJvcignU2hvdWxkIGhhdmUgUkEgdHJpYW5nbGUgaGVyZScpXG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIHJhbmRFbGVtKFtsZWcxLCBsZWcyXSkuc2hvdyA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdweXRoYWdvcmFzUGVyaW1ldGVyJzogeyAvLyBzaG91bGQgYWxyZWFkeSBoYXZlIFJBIHRyaWFuZ2xlXG4gICAgICAgIGlmICghcmlnaHRBbmdsZWQpIHRocm93IG5ldyBFcnJvcignU2hvdWxkIGhhdmUgUkEgdHJpYW5nbGUgaGVyZScpXG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nID0gdHJ1ZVxuICAgICAgICByYW5kRWxlbShbbGVnMSwgbGVnMiwgaHlwb3RlbnVzZV0pLnNob3cgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAncHl0aGFnb3Jhc0lzb3NjZWxlc0FyZWEnOlxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYXJlYVByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgYXJlYVByb3BlcnRpZXMubWlzc2luZyA9IHRydWVcbiAgICAgICAgaGVpZ2h0LnNob3cgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFRyaWFuZ2xlQXJlYURhdGEoYmFzZSwgc2lkZTEsIHNpZGUyLCBoZWlnaHQsIGRwLCBkZW5vbWluYXRvciwgYXJlYVByb3BlcnRpZXMsIHBlcmltZXRlclByb3BlcnRpZXMpXG4gIH1cbn1cblxuZnVuY3Rpb24gaXNJc29zY2VsZXMgKHRyaWFuZ2xlOiBURC5UcmlhbmdsZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gdHJpYW5nbGUuczEgPT09IHRyaWFuZ2xlLnMyXG59XG5cbmZ1bmN0aW9uIGlzUmlnaHRBbmdsZWQgKHRyaWFuZ2xlOiBURC5UcmlhbmdsZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gdHJpYW5nbGUuczEgPT09IHRyaWFuZ2xlLmggfHwgdHJpYW5nbGUuczIgPT09IHRyaWFuZ2xlLmhcbn1cbiIsImltcG9ydCB7IGFycm93TGluZSwgZHJhd1JpZ2h0QW5nbGUgfSBmcm9tICdkcmF3aW5nJ1xuaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgY3JlYXRlRWxlbSwgcmFuZEVsZW0sIHJlcGVsRWxlbWVudHMgfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUVZpZXcsIExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuL3R5cGVzJ1xuaW1wb3J0IHsgVmFsdWUgfSBmcm9tICcuL1JlY3RhbmdsZUFyZWFEYXRhJ1xuaW1wb3J0IFRyaWFuZ2xlQXJlYURhdGEgZnJvbSAnLi9UcmlhbmdsZUFyZWFEYXRhJ1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRyaWFuZ2xlQXJlYVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICBBPzogUG9pbnQgLy8gR2VuZXJhdGVkIGxhemlseSBvbiByZW5kZXJcbiAgQj86IFBvaW50XG4gIEM/OiBQb2ludFxuICBodD86IFBvaW50IC8vIGludGVyc2VjdGlvbiBvZiBoZWlnaHQgd2l0aCBiYXNlXG4gIG92ZXJoYW5nTGVmdD86IGJvb2xlYW5cbiAgb3ZlcmhhbmdSaWdodD86IGJvb2xlYW5cbiAgZGF0YSE6IFRyaWFuZ2xlQXJlYURhdGEgfCBQcm9taXNlPFRyaWFuZ2xlQXJlYURhdGE+XG4gIC8vIGxhYmVsczogTGFiZWxbXVxuICAvLyByb3RhdGlvbj86IG51bWJlclxuICBjb25zdHJ1Y3RvciAoZGF0YTogVHJpYW5nbGVBcmVhRGF0YSB8IFByb21pc2U8VHJpYW5nbGVBcmVhRGF0YT4sIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucywgQT86IFBvaW50LCBCPzogUG9pbnQsIEM/OlBvaW50LCBsYWJlbHM/OiBMYWJlbFtdKSB7XG4gICAgc3VwZXIoZGF0YSwgdmlld09wdGlvbnMpXG4gICAgdGhpcy5BID0gQVxuICAgIHRoaXMuQiA9IEJcbiAgICB0aGlzLkMgPSBDXG4gICAgdGhpcy5sYWJlbHMgPSBsYWJlbHMgPz8gW11cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW5kZXIgaW50byB0aGlzLmNhbnZhc1xuICAgKi9cbiAgYXN5bmMgcmVuZGVyICgpIHtcbiAgICAvLyBjcmVhdGUgbG9hZGluZyBpbWFnZVxuICAgIGNvbnN0IGxvYWRlciA9IGNyZWF0ZUVsZW0oJ2RpdicsICdsb2FkZXInLCB0aGlzLkRPTSlcbiAgICAvLyBmaXJzdCBpbml0IGlmIG5vdCBhbHJlYWR5XG4gICAgaWYgKHRoaXMuQSA9PT0gdW5kZWZpbmVkKSBhd2FpdCB0aGlzLmluaXQoKVxuXG4gICAgaWYgKCF0aGlzLkEgfHwgIXRoaXMuQiB8fCAhdGhpcy5DIHx8ICF0aGlzLmh0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludGlhbGlzYXRpb24gZmFpbGVkLiBQb2ludHMgYXJlOiAke1t0aGlzLkEsIHRoaXMuQiwgdGhpcy5DLCB0aGlzLmh0XX1gKVxuICAgIH1cbiAgICBpZiAodGhpcy5kYXRhIGluc3RhbmNlb2YgUHJvbWlzZSkgdGhyb3cgbmV3IEVycm9yKCdJbml0aWFsaXNhdGlvbiBmYWlsZWQ6IGRhdGEgaXMgc3RpbGwgYSBQcm9taXNlJylcblxuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICBpZiAoY3R4ID09PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBnZXQgY2FudmFzIGNvbnRleHQnKVxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcbiAgICBjdHguc2V0TGluZURhc2goW10pXG4gICAgLy8gZHJhdyB0cmlhbmdsZVxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGN0eC5tb3ZlVG8odGhpcy5BLngsIHRoaXMuQS55KVxuICAgIGN0eC5saW5lVG8odGhpcy5CLngsIHRoaXMuQi55KVxuICAgIGN0eC5saW5lVG8odGhpcy5DLngsIHRoaXMuQy55KVxuICAgIGN0eC5saW5lVG8odGhpcy5BLngsIHRoaXMuQS55KVxuICAgIGN0eC5zdHJva2UoKVxuICAgIGN0eC5maWxsU3R5bGUgPSByYW5kRWxlbShjb2xvcnMpXG4gICAgY3R4LmZpbGwoKVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgLy8gZHJhdyBoZWlnaHRcbiAgICBpZiAodGhpcy5kYXRhLmhlaWdodC5zaG93KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIC8vIGFycm93TGluZShjdHgsdGhpcy5DLHRoaXMuaHQsMTApO1xuICAgICAgYXJyb3dMaW5lKGN0eCxcbiAgICAgICAgUG9pbnQubWVhbih0aGlzLkMsIHRoaXMuaHQpLm1vdmVUb3dhcmQodGhpcy5DLCAxNSksXG4gICAgICAgIHRoaXMuQywgMTBcbiAgICAgIClcbiAgICAgIGFycm93TGluZShjdHgsXG4gICAgICAgIFBvaW50Lm1lYW4odGhpcy5DLCB0aGlzLmh0KS5tb3ZlVG93YXJkKHRoaXMuaHQsIDE1KSxcbiAgICAgICAgdGhpcy5odCwgMTBcbiAgICAgIClcbiAgICAgIGN0eC5zdHJva2UoKVxuICAgICAgY3R4LmNsb3NlUGF0aCgpXG4gICAgfVxuXG4gICAgLy8gcmlnaHQtYW5nbGUgc3ltYm9sXG4gICAgaWYgKHRoaXMuZGF0YS5pc1JpZ2h0QW5nbGVkKCkgfHwgdGhpcy5kYXRhLmhlaWdodC5zaG93KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIGlmICh0aGlzLkEuZXF1YWxzKHRoaXMuaHQpKSB7XG4gICAgICAgIGRyYXdSaWdodEFuZ2xlKGN0eCwgdGhpcy5CLCB0aGlzLmh0LCB0aGlzLkMsIDE1KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZHJhd1JpZ2h0QW5nbGUoY3R4LCB0aGlzLkEsIHRoaXMuaHQsIHRoaXMuQywgMTUpXG4gICAgICB9XG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIGN0eC5jbG9zZVBhdGgoKVxuICAgIH1cblxuICAgIGlmICh0aGlzLmRhdGEuaGVpZ2h0LnNob3cgJiYgdGhpcy5vdmVyaGFuZ1JpZ2h0KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIGN0eC5zZXRMaW5lRGFzaChbNSwgM10pXG4gICAgICBjdHgubW92ZVRvKHRoaXMuQi54LCB0aGlzLkIueSlcbiAgICAgIGN0eC5saW5lVG8odGhpcy5odC54LCB0aGlzLmh0LnkpXG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIGN0eC5jbG9zZVBhdGgoKVxuICAgIH1cbiAgICBpZiAodGhpcy5kYXRhLmhlaWdodC5zaG93ICYmIHRoaXMub3ZlcmhhbmdMZWZ0KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIGN0eC5zZXRMaW5lRGFzaChbNSwgM10pXG4gICAgICBjdHgubW92ZVRvKHRoaXMuQS54LCB0aGlzLkEueSlcbiAgICAgIGN0eC5saW5lVG8odGhpcy5odC54LCB0aGlzLmh0LnkpXG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIGN0eC5jbG9zZVBhdGgoKVxuICAgIH1cblxuICAgIHRoaXMucmVuZGVyTGFiZWxzKGZhbHNlLHRydWUpXG4gICAgbG9hZGVyLnJlbW92ZSgpXG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGlzZS4gSW5zdGFuY2UgbWV0aG9kIHJhdGhlciB0aGFuIHN0YXRpYyBmYWN0b3J5IG1ldGhvZCwgc28gaW5zdGFuY2UgY2FuIGNvbnRyb2wsIGUuZy4gbG9hZGluZyBpY29uXG4gICAqIGFzeW5jIHNpbmNlIGRhdGEgaXMgYSBwcm9taXNlXG4gICAqL1xuICBhc3luYyBpbml0ICgpIDogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5kYXRhID0gYXdhaXQgdGhpcy5kYXRhXG4gICAgY29uc3QgaCA9IHRoaXMuZGF0YS5oZWlnaHQudmFsXG4gICAgY29uc3QgYiA9IHRoaXMuZGF0YS5iYXNlLnZhbFxuICAgIGNvbnN0IHMxID0gdGhpcy5kYXRhLnNpZGUxLnZhbFxuICAgIGNvbnN0IHMyID0gdGhpcy5kYXRhLnNpZGUyLnZhbFxuXG4gICAgLy8gYnVpbGQgdXBzaWRlIGRvd25cbiAgICB0aGlzLkEgPSBuZXcgUG9pbnQoMCwgaClcbiAgICB0aGlzLkIgPSBuZXcgUG9pbnQoYiwgaClcbiAgICB0aGlzLkMgPSBuZXcgUG9pbnQoKGIgKiBiICsgczEgKiBzMSAtIHMyICogczIpIC8gKDIgKiBiKSwgMClcbiAgICB0aGlzLmh0ID0gbmV3IFBvaW50KHRoaXMuQy54LCB0aGlzLkEueSlcblxuICAgIHRoaXMub3ZlcmhhbmdSaWdodCA9IGZhbHNlXG4gICAgdGhpcy5vdmVyaGFuZ0xlZnQgPSBmYWxzZVxuICAgIGlmICh0aGlzLkMueCA+IHRoaXMuQi54KSB7IHRoaXMub3ZlcmhhbmdSaWdodCA9IHRydWUgfVxuICAgIGlmICh0aGlzLkMueCA8IHRoaXMuQS54KSB7IHRoaXMub3ZlcmhhbmdMZWZ0ID0gdHJ1ZSB9XG5cbiAgICAvLyByb3RhdGUsIHNjYWxlIGFuZCBjZW50ZXJcbiAgICB0aGlzLnJvdGF0aW9uID0gdGhpcy5yb3RhdGlvbiA/PyAyICogTWF0aC5QSSAqIE1hdGgucmFuZG9tKClcbiAgICA7W3RoaXMuQSwgdGhpcy5CLCB0aGlzLkMsIHRoaXMuaHRdLmZvckVhY2gocHQgPT4gcHQucm90YXRlKHRoaXMucm90YXRpb24hKSlcbiAgICBQb2ludC5zY2FsZVRvRml0KFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DLCB0aGlzLmh0XSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQsIDEwMCwgWzAsMjBdKVxuXG4gICAgLy8gTWFraW5nIGxhYmVscyAtIG1vcmUgaW52b2x2ZWQgdGhhbiBJIHJlbWVtYmVyZWQhXG4gICAgLy8gRmlyc3QgdGhlIGxhYmVscyBmb3IgdGhlIHNpZGVzXG4gICAgY29uc3Qgc2lkZXMgOiBbUG9pbnQsIFBvaW50LCBWYWx1ZV1bXSA9IFsgLy8gWzFzdCBwb2ludCwgMm5kIHBvaW50LCBkYXRhXVxuICAgICAgW3RoaXMuQSwgdGhpcy5CLCB0aGlzLmRhdGEuYmFzZV0sXG4gICAgICBbdGhpcy5DLCB0aGlzLkEsIHRoaXMuZGF0YS5zaWRlMV0sXG4gICAgICBbdGhpcy5CLCB0aGlzLkMsIHRoaXMuZGF0YS5zaWRlMl1cbiAgICBdXG5cbiAgICAvLyBvcmRlciBvZiBwdXR0aW5nIGluIGhlaWdodCBtYXR0ZXJzIGZvciBvZmZzZXRcbiAgICAvLyBUaGlzIGJyZWFrcyBpZiB3ZSBoYXZlIHJvdW5kaW5nIGVycm9yc1xuICAgIGlmICh0aGlzLmh0LmVxdWFscyh0aGlzLkIpKSB7IC8vXG4gICAgICBzaWRlcy5wdXNoKFt0aGlzLmh0LCB0aGlzLkMsIHRoaXMuZGF0YS5oZWlnaHRdKVxuICAgIH0gZWxzZSB7XG4gICAgICBzaWRlcy5wdXNoKFt0aGlzLkMsIHRoaXMuaHQsIHRoaXMuZGF0YS5oZWlnaHRdKVxuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgaSsrKSB7IC8vIHNpZGVzXG4gICAgICBpZiAoIXNpZGVzW2ldWzJdLnNob3cpIGNvbnRpbnVlXG4gICAgICBjb25zdCBvZmZzZXQgPSAyMCAvLyBvZmZzZXQgZnJvbSBsaW5lIGJ5IHRoaXMgbWFueSBwaXhlbHNcbiAgICAgIGNvbnN0IHBvcyA9IFBvaW50Lm1lYW4oc2lkZXNbaV1bMF0sIHNpZGVzW2ldWzFdKSAvLyBzdGFydCBhdCBtaWRwb2ludFxuICAgICAgY29uc3QgdW5pdHZlYyA9IFBvaW50LnVuaXRWZWN0b3Ioc2lkZXNbaV1bMF0sIHNpZGVzW2ldWzFdKVxuXG4gICAgICBpZiAoaSA8IDMgKSB7IHBvcy50cmFuc2xhdGUoLXVuaXR2ZWMueSAqIG9mZnNldCwgdW5pdHZlYy54ICogb2Zmc2V0KSB9XG5cbiAgICAgIGNvbnN0IHRleHRhIDogc3RyaW5nID0gc2lkZXNbaV1bMl0ubGFiZWwgPz8gc2lkZXNbaV1bMl0udmFsLnRvU3RyaW5nKClcbiAgICAgIGNvbnN0IHRleHRxID0gc2lkZXNbaV1bMl0ubWlzc2luZyA/ICc/JyA6IHRleHRhXG4gICAgICBjb25zdCBzdHlsZXEgPSBpPT09MyA/ICdub3JtYWwgcmVwZWwtbG9ja2VkJyA6ICdub3JtYWwnXG4gICAgICBjb25zdCBzdHlsZWEgPSBzaWRlc1tpXVsyXS5taXNzaW5nID9cbiAgICAgICAgICAgICAgICAgICAgICAoaT09PTMgPyAnYW5zd2VyIHJlcGVsLWxvY2tlZCcgOiAnYW5zd2VyJykgOlxuICAgICAgICAgICAgICAgICAgICAgIChpPT09MyA/ICdub3JtYWwgcmVwZWwtbG9ja2VkJyA6ICdub3JtYWwnKVxuXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKHtcbiAgICAgICAgcG9zOiBwb3MsXG4gICAgICAgIHRleHRhOiB0ZXh0YSxcbiAgICAgICAgdGV4dHE6IHRleHRxLFxuICAgICAgICB0ZXh0OiB0ZXh0cSxcbiAgICAgICAgc3R5bGVhOiBzdHlsZWEsXG4gICAgICAgIHN0eWxlcTogc3R5bGVxLFxuICAgICAgICBzdHlsZTogc3R5bGVxXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vIGFyZWEgYW5kIHBlcmltZXRlclxuICAgIGxldCBuSW5mbyA9IDBcbiAgICBpZiAodGhpcy5kYXRhLmFyZWEuc2hvdykge1xuICAgICAgY29uc3QgdGV4dGEgOiBzdHJpbmcgPSB0aGlzLmRhdGEuYXJlYS5sYWJlbCA/PyB0aGlzLmRhdGEuYXJlYS52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSB0aGlzLmRhdGEuYXJlYS5taXNzaW5nID8gJz8nIDogdGV4dGFcbiAgICAgIGNvbnN0IHN0eWxlcSA9ICdleHRyYS1pbmZvJ1xuICAgICAgY29uc3Qgc3R5bGVhID0gdGhpcy5kYXRhLmFyZWEubWlzc2luZyA/ICdleHRyYS1hbnN3ZXInIDogJ2V4dHJhLWluZm8nXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKFxuICAgICAgICB7XG4gICAgICAgICAgdGV4dGE6ICdcXFxcdGV4dHtBcmVhfSA9ICcgKyB0ZXh0YSxcbiAgICAgICAgICB0ZXh0cTogJ1xcXFx0ZXh0e0FyZWF9ID0gJyArIHRleHRxLFxuICAgICAgICAgIHRleHQ6ICdcXFxcdGV4dHtBcmVhfSA9ICcgKyB0ZXh0cSxcbiAgICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgICBzdHlsZTogc3R5bGVxLFxuICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwIC0gMTUgKiBuSW5mbylcbiAgICAgICAgfVxuICAgICAgKVxuICAgICAgbkluZm8rK1xuICAgIH1cbiAgICBpZiAodGhpcy5kYXRhLnBlcmltZXRlci5zaG93KSB7XG4gICAgICBjb25zdCB0ZXh0YSA9IHRoaXMuZGF0YS5wZXJpbWV0ZXIubGFiZWwgPz8gdGhpcy5kYXRhLnBlcmltZXRlci52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSB0aGlzLmRhdGEucGVyaW1ldGVyLm1pc3NpbmcgPyAnPycgOiB0ZXh0YVxuICAgICAgY29uc3Qgc3R5bGVxID0gJ2V4dHJhLWluZm8nXG4gICAgICBjb25zdCBzdHlsZWEgPSB0aGlzLmRhdGEucGVyaW1ldGVyLm1pc3NpbmcgPyAnZXh0cmEtYW5zd2VyJyA6ICdleHRyYS1pbmZvJ1xuICAgICAgdGhpcy5sYWJlbHMucHVzaChcbiAgICAgICAge1xuICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwIC0gMjAgKiBuSW5mbyksXG4gICAgICAgICAgdGV4dGE6ICdcXFxcdGV4dHtQZXJpbWV0ZXJ9ID0gJyArIHRleHRhLFxuICAgICAgICAgIHRleHRxOiAnXFxcXHRleHR7UGVyaW1ldGVyfSA9ICcgKyB0ZXh0cSxcbiAgICAgICAgICB0ZXh0OiAnXFxcXHRleHR7UGVyaW1ldGVyfSA9ICcgKyB0ZXh0cSxcbiAgICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgICBzdHlsZTogc3R5bGVxXG4gICAgICAgIH1cbiAgICAgIClcbiAgICB9XG5cbiAgICAvLyBzdG9wIHRoZW0gZnJvbSBjbGFzaGluZyAtIGhtbSwgbm90IHN1cmVcbiAgICAvKlxuICAgIHRoaXMuc3VjY2Vzcz10cnVlO1xuICAgIGZvciAobGV0IGkgPSAwLCBuPXRoaXMubGFiZWxzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBpOyBqKyspIHtcbiAgICAgICAgY29uc3QgbDE9dGhpcy5sYWJlbHNbaV0sIGwyPXRoaXMubGFiZWxzW2pdO1xuICAgICAgICBjb25zdCBkID0gUG9pbnQuZGlzdGFuY2UobDEucG9zLGwyLnBvcyk7XG4gICAgICAgIC8vY29uc29sZS5sb2coYGQoJyR7bDEudGV4dH0nLCcke2wyLnRleHR9JykgPSAke2R9YCk7XG4gICAgICAgIGlmIChkIDwgMjApIHtcbiAgICAgICAgICAvL2NvbnNvbGUubG9nKFwidG9vIGNsb3NlXCIpO1xuICAgICAgICAgIHRoaXMuc3VjY2Vzcz1mYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gKi9cbiAgfVxuXG4gIHN0YXRpYyBmcm9tQXN5bmNEYXRhIChkYXRhOiBQcm9taXNlPFRyaWFuZ2xlQXJlYURhdGE+LCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlld09wdGlvbnMpXG4gIH1cbn1cbiIsImltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgVHJpYW5nbGVBcmVhRGF0YSBmcm9tICcuL1RyaWFuZ2xlQXJlYURhdGEnXG5pbXBvcnQgVHJpYW5nbGVBcmVhVmlldyBmcm9tICcuL1RyaWFuZ2xlQXJlYVZpZXcnXG5pbXBvcnQgeyBRdWVzdGlvbk9wdGlvbnMgfSBmcm9tICcuL3R5cGVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUcmlhbmdsZUFyZWFRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhITogVHJpYW5nbGVBcmVhRGF0YSB8IFByb21pc2U8VHJpYW5nbGVBcmVhRGF0YT4gLy8gaW5pdGlhbGlzZWQgaW4gc3VwZXIoKVxuICB2aWV3ITogVHJpYW5nbGVBcmVhVmlld1xuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgY29uc3QgZGF0YSA9IFRyaWFuZ2xlQXJlYURhdGEucmFuZG9tKG9wdGlvbnMpXG4gICAgY29uc3QgdmlldyA9IFRyaWFuZ2xlQXJlYVZpZXcuZnJvbUFzeW5jRGF0YShkYXRhLCB2aWV3T3B0aW9ucylcbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZXMnXG4gIH1cbn1cbiIsImltcG9ydCB7IE9wdGlvbnNTcGVjIH0gZnJvbSAnT3B0aW9uc1NwZWMnXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5pbXBvcnQgeyByYW5kRWxlbSB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCB7IEdyYXBoaWNRLCBHcmFwaGljUVZpZXcgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCBSZWN0YW5nbGVBcmVhUSBmcm9tICcuL1JlY3RhbmdsZUFyZWFRJ1xuaW1wb3J0IFRyYXBleml1bUFyZWFRIGZyb20gJy4vVHJhcGV6aXVtQXJlYVEnXG5pbXBvcnQgVHJpYW5nbGVBcmVhUSBmcm9tICcuL1RyaWFuZ2xlQXJlYVEnXG5pbXBvcnQgeyBXcmFwcGVyT3B0aW9ucywgU2hhcGUsIFF1ZXN0aW9uVHlwZVNpbXBsZSwgUXVlc3Rpb25PcHRpb25zLCBRdWVzdGlvblR5cGUgfSBmcm9tICcuL3R5cGVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBcmVhUGVyaW1ldGVyUSBleHRlbmRzIFF1ZXN0aW9uIHtcbiAgcXVlc3Rpb246IEdyYXBoaWNRIC8vIG1ha2UgbW9yZSBwcmVjaXNlIHdpdGggdW5pb24gb2YgYWN0dWFsIHR5cGVzXG4gIC8vIERPTTogSFRNTEVsZW1lbnQgIC8vIGluIGJhc2UgY2xhc3NcbiAgLy8gYW5zd2VyZWQ6IGJvb2xlYW4gLy8gaW4gYmFzZSBjbGFzc1xuICBjb25zdHJ1Y3RvciAocXVlc3Rpb246IEdyYXBoaWNRKSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMucXVlc3Rpb24gPSBxdWVzdGlvblxuICAgIHRoaXMuRE9NID0gcXVlc3Rpb24uRE9NXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBXcmFwcGVyT3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucy5jdXN0b20pIHtcbiAgICAgIGNvbnN0IHNoYXBlID0gcmFuZEVsZW0ob3B0aW9ucy5zaGFwZXMpXG4gICAgICByZXR1cm4gdGhpcy5yYW5kb21Gcm9tRGlmZmljdWx0eShvcHRpb25zLmRpZmZpY3VsdHksIHNoYXBlLCBvcHRpb25zLnF1ZXN0aW9uVHlwZXNTaW1wbGUpXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgcmFuZG9tRnJvbURpZmZpY3VsdHkgKGRpZmZpY3VsdHk6IG51bWJlciwgc2hhcGU6IFNoYXBlLCBxdWVzdGlvblR5cGVzOiBRdWVzdGlvblR5cGVTaW1wbGVbXSk6IEFyZWFQZXJpbWV0ZXJRIHtcbiAgICAvKiogRGlmZmljdWx0eSBndWlkZVxuICAgICAqICAxIC0gRm9yd2FyZCwgbm8gZGlzdHJhY3RvcnMsIHNtYWxsIGludGVnZXJzXG4gICAgICogIDIgLSBGb3J3YXJkLCBkaXN0cmFjdG9ycywgc21hbGwgaW50ZWdlcnNcbiAgICAgKiAgMyAtIEZvcndhcmQsIGRpc3RyYWN0b3JzLCBsYXJnZXIgaW50ZWdlcnNcbiAgICAgKiAgNCAtIEZvcndhcmQsIGRpc3RyYWN0b3JzLCBkZWNpbWFscyBhbmQgZnJhY3Rpb25zXG4gICAgICogIDUgLSBGb3J3YXJkLCBkaXN0cmFjdG9ycywgZGVjaW1hbHMgYW5kIGZyYWN0aW9ucyAtIGxhcmdlclxuICAgICAqICA2IC0gUmV2ZXJzZSBzbWFsbCBpbnRlZ2Vyc1xuICAgICAqICA3IC0gUmV2ZXJzZSBsYXJnZSBpbnRlZ2Vyc1xuICAgICAqICA4IC0gUmV2ZXJzZSBkZWNpbWFscyBhbmQgZnJhY3Rpb25zXG4gICAgICogIDkgLSBSZXZlcnNlIGRlY2ltYWxzIGFuZCBmcmFjdGlvbnMgLSBsYXJnZXJcbiAgICAgKiAxMCAtIFB5dGhhZ29yYXNcbiAgICAqL1xuICAgIGNvbnN0IHF1ZXN0aW9uT3B0aW9uczogUXVlc3Rpb25PcHRpb25zID0ge1xuICAgICAgcXVlc3Rpb25UeXBlOiByYW5kRWxlbShxdWVzdGlvblR5cGVzKSxcbiAgICAgIGRwOiAwLFxuICAgICAgZnJhY3Rpb246IGZhbHNlLFxuICAgICAgbm9EaXN0cmFjdG9yczogdHJ1ZSxcbiAgICAgIG1heExlbmd0aDogMjBcbiAgICB9XG4gICAgY29uc3Qgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zID0ge31cblxuICAgIHN3aXRjaCAoZGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm5vRGlzdHJhY3RvcnMgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAzOlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubm9EaXN0cmFjdG9ycyA9IGZhbHNlXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhMZW5ndGggPSAxMDBcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNDogLy8gVE9ETzogZnJhY3Rpb25cbiAgICAgICAgaWYgKE1hdGgucmFuZG9tKCk8MC41KSB7ICAvLyBkZWNpbWFsXG4gICAgICAgICAgcXVlc3Rpb25PcHRpb25zLmRwID0gMVxuICAgICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhMZW5ndGggPSA5OVxuICAgICAgICB9IGVsc2UgeyAvLyBmcmFjdGlvblxuICAgICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5mcmFjdGlvbiA9IHRydWVcbiAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TGVuZ3RoID0gMTVcbiAgICAgICAgfVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubm9EaXN0cmFjdG9ycyA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDU6XG4gICAgICAgIGlmIChNYXRoLnJhbmRvbSgpPDAuNSkgeyAgLy8gZGVjaW1hbFxuICAgICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5kcCA9IDFcbiAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TGVuZ3RoID0gNTAwXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcXVlc3Rpb25PcHRpb25zLmZyYWN0aW9uID0gdHJ1ZVxuICAgICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhMZW5ndGggPSAxMDBcbiAgICAgICAgfVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubm9EaXN0cmFjdG9ycyA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDY6XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5kcCA9IDBcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm5vRGlzdHJhY3RvcnMgPSBmYWxzZVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMucXVlc3Rpb25UeXBlID0gcmFuZEVsZW0ocXVlc3Rpb25UeXBlcy5tYXAodD0+cmV2ZXJzaWZ5KHQpKSlcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heExlbmd0aCA9IDIwXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDc6XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5kcCA9IDBcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm5vRGlzdHJhY3RvcnMgPSBmYWxzZVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMucXVlc3Rpb25UeXBlID0gcmFuZEVsZW0ocXVlc3Rpb25UeXBlcy5tYXAodD0+cmV2ZXJzaWZ5KHQpKSlcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heExlbmd0aCA9IDk5XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDg6XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5kcCA9IDFcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm5vRGlzdHJhY3RvcnMgPSBmYWxzZVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMucXVlc3Rpb25UeXBlID0gcmFuZEVsZW0ocXVlc3Rpb25UeXBlcy5tYXAodD0+cmV2ZXJzaWZ5KHQpKSlcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heExlbmd0aCA9IDk5XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDk6XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5kcCA9IDFcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm5vRGlzdHJhY3RvcnMgPSBmYWxzZVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMucXVlc3Rpb25UeXBlID0gcmFuZEVsZW0ocXVlc3Rpb25UeXBlcy5tYXAodD0+cmV2ZXJzaWZ5KHQpKSlcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heExlbmd0aCA9IDUwMFxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAxMDpcbiAgICAgIGRlZmF1bHQ6IC8vIFRPRE8gZml4IHRoaXNcbiAgICAgICAgc2hhcGUgPSAndHJpYW5nbGUnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5xdWVzdGlvblR5cGUgPSByYW5kRWxlbShbJ3B5dGhhZ29yYXNBcmVhJywncHl0aGFnb3Jhc0lzb3NjZWxlc0FyZWEnLCdweXRoYWdvcmFzUGVyaW1ldGVyJ10pXG4gICAgICAgIGJyZWFrXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmFuZG9tV2l0aE9wdGlvbnMoc2hhcGUscXVlc3Rpb25PcHRpb25zLHZpZXdPcHRpb25zKVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbVdpdGhPcHRpb25zIChzaGFwZTogU2hhcGUsIG9wdGlvbnM6IFF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKTogQXJlYVBlcmltZXRlclEge1xuICAgIGxldCBxdWVzdGlvbjogR3JhcGhpY1FcbiAgICBzd2l0Y2goc2hhcGUpIHtcbiAgICAgIGNhc2UgJ3JlY3RhbmdsZSc6XG4gICAgICAgIHF1ZXN0aW9uID0gUmVjdGFuZ2xlQXJlYVEucmFuZG9tKG9wdGlvbnMsdmlld09wdGlvbnMpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICd0cmlhbmdsZSc6XG4gICAgICAgIHF1ZXN0aW9uID0gVHJpYW5nbGVBcmVhUS5yYW5kb20ob3B0aW9ucyx2aWV3T3B0aW9ucylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3RyYXBleml1bSc6XG4gICAgICAgIHF1ZXN0aW9uID0gVHJhcGV6aXVtQXJlYVEucmFuZG9tKG9wdGlvbnMsdmlld09wdGlvbnMpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdwYXJhbGxlbG9ncmFtJzpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgeWV0IGltcGxlbWVudGVkJylcbiAgICB9XG4gICAgcmV0dXJuIG5ldyB0aGlzKHF1ZXN0aW9uKVxuICB9XG5cbiAgLyogV3JhcHMgdGhlIG1ldGhvZHMgb2YgdGhlIHdyYXBwZWQgcXVlc3Rpb24gKi9cbiAgcmVuZGVyICgpOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5yZW5kZXIoKSB9XG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5zaG93QW5zd2VyKCkgfVxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24uaGlkZUFuc3dlcigpIH1cbiAgdG9nZ2xlQW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24udG9nZ2xlQW5zd2VyKCkgfVxuXG4gIHN0YXRpYyBnZXQgb3B0aW9uc1NwZWMgKCkgOiBPcHRpb25zU3BlYyB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHtcbiAgICAgICAgaWQ6ICdzaGFwZXMnLFxuICAgICAgICB0eXBlOiAnc2VsZWN0LWluY2x1c2l2ZScsXG4gICAgICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgICAgICB7IGlkOiAncmVjdGFuZ2xlJywgdGl0bGU6ICdSZWN0YW5nbGVzJyB9LFxuICAgICAgICAgIHsgaWQ6ICd0cmlhbmdsZScsIHRpdGxlOiAnVHJpYW5nbGVzJyB9LFxuICAgICAgICAgIHsgaWQ6ICd0cmFwZXppdW0nLCB0aXRsZTogJ1RyYXBlemlhJyB9XG4gICAgICAgIF0sXG4gICAgICAgIGRlZmF1bHQ6IFsncmVjdGFuZ2xlJywgJ3RyaWFuZ2xlJywgJ3RyYXBleml1bSddLFxuICAgICAgICB0aXRsZTogJ1NoYXBlcydcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiAncXVlc3Rpb25UeXBlc1NpbXBsZScsXG4gICAgICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICAgICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgICAgIHsgaWQ6ICdhcmVhJywgdGl0bGU6ICdBcmVhJyB9LFxuICAgICAgICAgIHsgaWQ6ICdwZXJpbWV0ZXInLCB0aXRsZTogJ1BlcmltZXRlcicgfVxuICAgICAgICBdLFxuICAgICAgICBkZWZhdWx0OiBbJ2FyZWEnLCAncGVyaW1ldGVyJ10sXG4gICAgICAgIHRpdGxlOiAnVHlwZSBvZiBxdWVzdGlvbidcbiAgICAgIH1cbiAgICBdXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHtcbiAgICByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnXG4gIH1cbn1cblxuLyoqXG4gKiBQcmVwZW5kICdyZXZlcnNlJyB0byB0aGUgYmVnaW5uaW5nIG9mIGEgc3RyaW5nIHRoZW4gY2FtZWwgY2FzZSBpdFxuICogZS5nLiByZXZlcnNpZnkoJ2FyZWEnKSA9PT0gJ3JldmVyc2VBcmVhJ1xuICogQHBhcmFtIHN0ciBBIHN0cmluZ1xuICogQHBhcmFtIHByZWZpeCBUaGUgcHJlZml4IHRvIHVzZVxuICovXG5mdW5jdGlvbiByZXZlcnNpZnkoc3RyOiBRdWVzdGlvblR5cGVTaW1wbGUsIHByZWZpeDogJ3JldmVyc2UnIHwgJ3B5dGhhZ29yYXMnID0gJ3JldmVyc2UnKSA6IFF1ZXN0aW9uVHlwZSB7XG4gIHJldHVybiBwcmVmaXggKyBzdHJbMF0udG9VcHBlckNhc2UoKSArIHN0ci5zbGljZSgxKSBhcyBRdWVzdGlvblR5cGVcbn0iLCJpbXBvcnQgQWxnZWJyYWljRnJhY3Rpb25RIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0FsZ2VicmFpY0ZyYWN0aW9uUSdcbmltcG9ydCBJbnRlZ2VyQWRkUSBmcm9tICdRdWVzdGlvbi9UZXh0US9JbnRlZ2VyQWRkJ1xuaW1wb3J0IEFyaXRobWFnb25RIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0FyaXRobWFnb25RJ1xuaW1wb3J0IFRlc3RRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1Rlc3RRJ1xuaW1wb3J0IEFkZEFaZXJvIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0FkZEFaZXJvJ1xuaW1wb3J0IEVxdWF0aW9uT2ZMaW5lIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0VxdWF0aW9uT2ZMaW5lJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNRIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dyYXBwZXInXG5pbXBvcnQgQXJlYVBlcmltZXRlclEgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvQXJlYVBlcmltZXRlci9BcmVhV3JhcHBlcidcblxuaW1wb3J0IE9wdGlvbnNTZXQgZnJvbSAnT3B0aW9uc1NldCdcblxuY29uc3QgdG9waWNMaXN0ID0gW1xuICB7XG4gICAgaWQ6ICdhbGdlYnJhaWMtZnJhY3Rpb24nLFxuICAgIHRpdGxlOiAnU2ltcGxpZnkgYWxnZWJyYWljIGZyYWN0aW9ucycsXG4gICAgY2xhc3M6IEFsZ2VicmFpY0ZyYWN0aW9uUVxuICB9LFxuICB7XG4gICAgaWQ6ICdhZGQtYS16ZXJvJyxcbiAgICB0aXRsZTogJ011bHRpcGx5IGJ5IDEwIChob25lc3QhKScsXG4gICAgY2xhc3M6IEFkZEFaZXJvXG4gIH0sXG4gIHtcbiAgICBpZDogJ2ludGVnZXItYWRkJyxcbiAgICB0aXRsZTogJ0FkZCBpbnRlZ2VycyAodiBzaW1wbGUpJyxcbiAgICBjbGFzczogSW50ZWdlckFkZFFcbiAgfSxcbiAge1xuICAgIGlkOiAnbWlzc2luZy1hbmdsZXMnLFxuICAgIHRpdGxlOiAnTWlzc2luZyBhbmdsZXMnLFxuICAgIGNsYXNzOiBNaXNzaW5nQW5nbGVzUVxuICB9LFxuICB7XG4gICAgaWQ6ICdhcmVhLXBlcmltdGVyJyxcbiAgICB0aXRsZTogJ0FyZWEgYW5kIHBlcmltZXRlciBvZiBzaGFwZXMnLFxuICAgIGNsYXNzOiBBcmVhUGVyaW1ldGVyUVxuICB9LFxuICB7XG4gICAgaWQ6ICdlcXVhdGlvbi1vZi1saW5lJyxcbiAgICB0aXRsZTogJ0VxdWF0aW9uIG9mIGEgbGluZSAoZnJvbSB0d28gcG9pbnRzKScsXG4gICAgY2xhc3M6IEVxdWF0aW9uT2ZMaW5lXG4gIH0sXG4gIHtcbiAgICBpZDogJ2FyaXRobWFnb24tYWRkJyxcbiAgICB0aXRsZTogJ0FyaXRobWFnb25zJyxcbiAgICBjbGFzczogQXJpdGhtYWdvblFcbiAgfSxcbiAge1xuICAgIGlkOiAndGVzdCcsXG4gICAgdGl0bGU6ICdUZXN0IHF1ZXN0aW9ucycsXG4gICAgY2xhc3M6IFRlc3RRXG4gIH1cbl1cblxuZnVuY3Rpb24gZ2V0Q2xhc3MgKGlkKSB7XG4gIC8vIFJldHVybiB0aGUgY2xhc3MgZ2l2ZW4gYW4gaWQgb2YgYSBxdWVzdGlvblxuXG4gIC8vIE9idmlvdXNseSB0aGlzIGlzIGFuIGluZWZmaWNpZW50IHNlYXJjaCwgYnV0IHdlIGRvbid0IG5lZWQgbWFzc2l2ZSBwZXJmb3JtYW5jZVxuICBmb3IgKGxldCBpID0gMDsgaSA8IHRvcGljTGlzdC5sZW5ndGg7IGkrKykge1xuICAgIGlmICh0b3BpY0xpc3RbaV0uaWQgPT09IGlkKSB7XG4gICAgICByZXR1cm4gdG9waWNMaXN0W2ldLmNsYXNzXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGxcbn1cblxuZnVuY3Rpb24gZ2V0VGl0bGUgKGlkKSB7XG4gIC8vIFJldHVybiB0aXRsZSBvZiBhIGdpdmVuIGlkXG4gIC8vXG4gIHJldHVybiB0b3BpY0xpc3QuZmluZCh0ID0+ICh0LmlkID09PSBpZCkpLnRpdGxlXG59XG5cbi8qKlxuICogR2V0cyBjb21tYW5kIHdvcmQgZnJvbSBhIHRvcGljIGlkXG4gKiBAcGFyYW0ge3N0cmluZ30gaWQgVGhlIHRvcGljIGlkXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBDb21tYW5kIHdvcmQuIFJldHVybnMgXCJcIiBpZiBubyB0b3BpYyB3aXRoIGlkXG4gKi9cbmZ1bmN0aW9uIGdldENvbW1hbmRXb3JkIChpZCkge1xuICBjb25zdCB0b3BpY0NsYXNzID0gZ2V0Q2xhc3MoaWQpXG4gIGlmICh0b3BpY0NsYXNzID09PSBudWxsKSB7XG4gICAgcmV0dXJuICcnXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGdldENsYXNzKGlkKS5jb21tYW5kV29yZFxuICB9XG59XG5cbmZ1bmN0aW9uIGdldFRvcGljcyAoKSB7XG4gIC8vIHJldHVybnMgdG9waWNzIHdpdGggY2xhc3NlcyBzdHJpcHBlZCBvdXRcbiAgcmV0dXJuIHRvcGljTGlzdC5tYXAoeCA9PiAoeyBpZDogeC5pZCwgdGl0bGU6IHgudGl0bGUgfSkpXG59XG5cbmZ1bmN0aW9uIG5ld1F1ZXN0aW9uIChpZCwgb3B0aW9ucykge1xuICAvLyB0byBhdm9pZCB3cml0aW5nIGBsZXQgcSA9IG5ldyAoVG9waWNDaG9vc2VyLmdldENsYXNzKGlkKSkob3B0aW9ucylcbiAgY29uc3QgUXVlc3Rpb25DbGFzcyA9IGdldENsYXNzKGlkKVxuICBsZXQgcXVlc3Rpb25cbiAgaWYgKFF1ZXN0aW9uQ2xhc3MucmFuZG9tKSB7XG4gICAgcXVlc3Rpb24gPSBRdWVzdGlvbkNsYXNzLnJhbmRvbShvcHRpb25zKVxuICB9IGVsc2Uge1xuICAgIHF1ZXN0aW9uID0gbmV3IFF1ZXN0aW9uQ2xhc3Mob3B0aW9ucylcbiAgfVxuICByZXR1cm4gcXVlc3Rpb25cbn1cblxuZnVuY3Rpb24gbmV3T3B0aW9uc1NldCAoaWQpIHtcbiAgY29uc3Qgb3B0aW9uc1NwZWMgPSAoZ2V0Q2xhc3MoaWQpKS5vcHRpb25zU3BlYyB8fCBbXVxuICByZXR1cm4gbmV3IE9wdGlvbnNTZXQob3B0aW9uc1NwZWMpXG59XG5cbmZ1bmN0aW9uIGhhc09wdGlvbnMgKGlkKSB7XG4gIHJldHVybiAhIShnZXRDbGFzcyhpZCkub3B0aW9uc1NwZWMgJiYgZ2V0Q2xhc3MoaWQpLm9wdGlvbnNTcGVjLmxlbmd0aCA+IDApIC8vIHdlaXJkIGJvb2wgdHlwY2FzdGluZyB3b28hXG59XG5cbmV4cG9ydCB7IHRvcGljTGlzdCwgZ2V0Q2xhc3MsIG5ld1F1ZXN0aW9uLCBnZXRUb3BpY3MsIGdldFRpdGxlLCBuZXdPcHRpb25zU2V0LCBnZXRDb21tYW5kV29yZCwgaGFzT3B0aW9ucyB9XG4iLCIhZnVuY3Rpb24odCxvKXtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKG8pOlwib2JqZWN0XCI9PXR5cGVvZiBleHBvcnRzP21vZHVsZS5leHBvcnRzPW8oKTp0LnRpbmdsZT1vKCl9KHRoaXMsZnVuY3Rpb24oKXt2YXIgbz0hMTtmdW5jdGlvbiB0KHQpe3RoaXMub3B0cz1mdW5jdGlvbigpe2Zvcih2YXIgdD0xO3Q8YXJndW1lbnRzLmxlbmd0aDt0KyspZm9yKHZhciBvIGluIGFyZ3VtZW50c1t0XSlhcmd1bWVudHNbdF0uaGFzT3duUHJvcGVydHkobykmJihhcmd1bWVudHNbMF1bb109YXJndW1lbnRzW3RdW29dKTtyZXR1cm4gYXJndW1lbnRzWzBdfSh7fSx7b25DbG9zZTpudWxsLG9uT3BlbjpudWxsLGJlZm9yZU9wZW46bnVsbCxiZWZvcmVDbG9zZTpudWxsLHN0aWNreUZvb3RlcjohMSxmb290ZXI6ITEsY3NzQ2xhc3M6W10sY2xvc2VMYWJlbDpcIkNsb3NlXCIsY2xvc2VNZXRob2RzOltcIm92ZXJsYXlcIixcImJ1dHRvblwiLFwiZXNjYXBlXCJdfSx0KSx0aGlzLmluaXQoKX1mdW5jdGlvbiBlKCl7dGhpcy5tb2RhbEJveEZvb3RlciYmKHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUud2lkdGg9dGhpcy5tb2RhbEJveC5jbGllbnRXaWR0aCtcInB4XCIsdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS5sZWZ0PXRoaXMubW9kYWxCb3gub2Zmc2V0TGVmdCtcInB4XCIpfXJldHVybiB0LnByb3RvdHlwZS5pbml0PWZ1bmN0aW9uKCl7aWYoIXRoaXMubW9kYWwpcmV0dXJuIGZ1bmN0aW9uKCl7dGhpcy5tb2RhbD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpLHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbFwiKSwwIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5sZW5ndGgmJi0xIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKFwib3ZlcmxheVwiKXx8dGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsLS1ub092ZXJsYXlDbG9zZVwiKTt0aGlzLm1vZGFsLnN0eWxlLmRpc3BsYXk9XCJub25lXCIsdGhpcy5vcHRzLmNzc0NsYXNzLmZvckVhY2goZnVuY3Rpb24odCl7XCJzdHJpbmdcIj09dHlwZW9mIHQmJnRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZCh0KX0sdGhpcyksLTEhPT10aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoXCJidXR0b25cIikmJih0aGlzLm1vZGFsQ2xvc2VCdG49ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKSx0aGlzLm1vZGFsQ2xvc2VCdG4udHlwZT1cImJ1dHRvblwiLHRoaXMubW9kYWxDbG9zZUJ0bi5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsX19jbG9zZVwiKSx0aGlzLm1vZGFsQ2xvc2VCdG5JY29uPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpLHRoaXMubW9kYWxDbG9zZUJ0bkljb24uY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbF9fY2xvc2VJY29uXCIpLHRoaXMubW9kYWxDbG9zZUJ0bkljb24uaW5uZXJIVE1MPSc8c3ZnIHZpZXdCb3g9XCIwIDAgMTAgMTBcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+PHBhdGggZD1cIk0uMyA5LjdjLjIuMi40LjMuNy4zLjMgMCAuNS0uMS43LS4zTDUgNi40bDMuMyAzLjNjLjIuMi41LjMuNy4zLjIgMCAuNS0uMS43LS4zLjQtLjQuNC0xIDAtMS40TDYuNCA1bDMuMy0zLjNjLjQtLjQuNC0xIDAtMS40LS40LS40LTEtLjQtMS40IDBMNSAzLjYgMS43LjNDMS4zLS4xLjctLjEuMy4zYy0uNC40LS40IDEgMCAxLjRMMy42IDUgLjMgOC4zYy0uNC40LS40IDEgMCAxLjR6XCIgZmlsbD1cIiMwMDBcIiBmaWxsLXJ1bGU9XCJub256ZXJvXCIvPjwvc3ZnPicsdGhpcy5tb2RhbENsb3NlQnRuTGFiZWw9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIiksdGhpcy5tb2RhbENsb3NlQnRuTGFiZWwuY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbF9fY2xvc2VMYWJlbFwiKSx0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbC5pbm5lckhUTUw9dGhpcy5vcHRzLmNsb3NlTGFiZWwsdGhpcy5tb2RhbENsb3NlQnRuLmFwcGVuZENoaWxkKHRoaXMubW9kYWxDbG9zZUJ0bkljb24pLHRoaXMubW9kYWxDbG9zZUJ0bi5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbCkpO3RoaXMubW9kYWxCb3g9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKSx0aGlzLm1vZGFsQm94LmNsYXNzTGlzdC5hZGQoXCJ0aW5nbGUtbW9kYWwtYm94XCIpLHRoaXMubW9kYWxCb3hDb250ZW50PWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiksdGhpcy5tb2RhbEJveENvbnRlbnQuY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbC1ib3hfX2NvbnRlbnRcIiksdGhpcy5tb2RhbEJveC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Q29udGVudCksLTEhPT10aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoXCJidXR0b25cIikmJnRoaXMubW9kYWwuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbENsb3NlQnRuKTt0aGlzLm1vZGFsLmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3gpfS5jYWxsKHRoaXMpLGZ1bmN0aW9uKCl7dGhpcy5fZXZlbnRzPXtjbGlja0Nsb3NlQnRuOnRoaXMuY2xvc2UuYmluZCh0aGlzKSxjbGlja092ZXJsYXk6ZnVuY3Rpb24odCl7dmFyIG89dGhpcy5tb2RhbC5vZmZzZXRXaWR0aC10aGlzLm1vZGFsLmNsaWVudFdpZHRoLGU9dC5jbGllbnRYPj10aGlzLm1vZGFsLm9mZnNldFdpZHRoLTE1LHM9dGhpcy5tb2RhbC5zY3JvbGxIZWlnaHQhPT10aGlzLm1vZGFsLm9mZnNldEhlaWdodDtpZihcIk1hY0ludGVsXCI9PT1uYXZpZ2F0b3IucGxhdGZvcm0mJjA9PW8mJmUmJnMpcmV0dXJuOy0xIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKFwib3ZlcmxheVwiKSYmIWZ1bmN0aW9uKHQsbyl7Zm9yKDsodD10LnBhcmVudEVsZW1lbnQpJiYhdC5jbGFzc0xpc3QuY29udGFpbnMobyk7KTtyZXR1cm4gdH0odC50YXJnZXQsXCJ0aW5nbGUtbW9kYWxcIikmJnQuY2xpZW50WDx0aGlzLm1vZGFsLmNsaWVudFdpZHRoJiZ0aGlzLmNsb3NlKCl9LmJpbmQodGhpcykscmVzaXplOnRoaXMuY2hlY2tPdmVyZmxvdy5iaW5kKHRoaXMpLGtleWJvYXJkTmF2OmZ1bmN0aW9uKHQpey0xIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKFwiZXNjYXBlXCIpJiYyNz09PXQud2hpY2gmJnRoaXMuaXNPcGVuKCkmJnRoaXMuY2xvc2UoKX0uYmluZCh0aGlzKX0sLTEhPT10aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoXCJidXR0b25cIikmJnRoaXMubW9kYWxDbG9zZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIix0aGlzLl9ldmVudHMuY2xpY2tDbG9zZUJ0bik7dGhpcy5tb2RhbC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsdGhpcy5fZXZlbnRzLmNsaWNrT3ZlcmxheSksd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIix0aGlzLl9ldmVudHMucmVzaXplKSxkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLHRoaXMuX2V2ZW50cy5rZXlib2FyZE5hdil9LmNhbGwodGhpcyksZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsLGRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZCksdGhpcy5vcHRzLmZvb3RlciYmdGhpcy5hZGRGb290ZXIoKSx0aGlzfSx0LnByb3RvdHlwZS5fYnVzeT1mdW5jdGlvbih0KXtvPXR9LHQucHJvdG90eXBlLl9pc0J1c3k9ZnVuY3Rpb24oKXtyZXR1cm4gb30sdC5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe251bGwhPT10aGlzLm1vZGFsJiYodGhpcy5pc09wZW4oKSYmdGhpcy5jbG9zZSghMCksZnVuY3Rpb24oKXstMSE9PXRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZihcImJ1dHRvblwiKSYmdGhpcy5tb2RhbENsb3NlQnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLHRoaXMuX2V2ZW50cy5jbGlja0Nsb3NlQnRuKTt0aGlzLm1vZGFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIix0aGlzLl9ldmVudHMuY2xpY2tPdmVybGF5KSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLHRoaXMuX2V2ZW50cy5yZXNpemUpLGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsdGhpcy5fZXZlbnRzLmtleWJvYXJkTmF2KX0uY2FsbCh0aGlzKSx0aGlzLm1vZGFsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbCksdGhpcy5tb2RhbD1udWxsKX0sdC5wcm90b3R5cGUuaXNPcGVuPWZ1bmN0aW9uKCl7cmV0dXJuISF0aGlzLm1vZGFsLmNsYXNzTGlzdC5jb250YWlucyhcInRpbmdsZS1tb2RhbC0tdmlzaWJsZVwiKX0sdC5wcm90b3R5cGUub3Blbj1mdW5jdGlvbigpe2lmKCF0aGlzLl9pc0J1c3koKSl7dGhpcy5fYnVzeSghMCk7dmFyIHQ9dGhpcztyZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiB0Lm9wdHMuYmVmb3JlT3BlbiYmdC5vcHRzLmJlZm9yZU9wZW4oKSx0aGlzLm1vZGFsLnN0eWxlLnJlbW92ZVByb3BlcnR5P3RoaXMubW9kYWwuc3R5bGUucmVtb3ZlUHJvcGVydHkoXCJkaXNwbGF5XCIpOnRoaXMubW9kYWwuc3R5bGUucmVtb3ZlQXR0cmlidXRlKFwiZGlzcGxheVwiKSx0aGlzLl9zY3JvbGxQb3NpdGlvbj13aW5kb3cucGFnZVlPZmZzZXQsZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLWVuYWJsZWRcIiksZG9jdW1lbnQuYm9keS5zdHlsZS50b3A9LXRoaXMuX3Njcm9sbFBvc2l0aW9uK1wicHhcIix0aGlzLnNldFN0aWNreUZvb3Rlcih0aGlzLm9wdHMuc3RpY2t5Rm9vdGVyKSx0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoXCJ0aW5nbGUtbW9kYWwtLXZpc2libGVcIiksXCJmdW5jdGlvblwiPT10eXBlb2YgdC5vcHRzLm9uT3BlbiYmdC5vcHRzLm9uT3Blbi5jYWxsKHQpLHQuX2J1c3koITEpLHRoaXMuY2hlY2tPdmVyZmxvdygpLHRoaXN9fSx0LnByb3RvdHlwZS5jbG9zZT1mdW5jdGlvbih0KXtpZighdGhpcy5faXNCdXN5KCkpe2lmKHRoaXMuX2J1c3koITApLCExLFwiZnVuY3Rpb25cIj09dHlwZW9mIHRoaXMub3B0cy5iZWZvcmVDbG9zZSlpZighdGhpcy5vcHRzLmJlZm9yZUNsb3NlLmNhbGwodGhpcykpcmV0dXJuIHZvaWQgdGhpcy5fYnVzeSghMSk7ZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwidGluZ2xlLWVuYWJsZWRcIiksZG9jdW1lbnQuYm9keS5zdHlsZS50b3A9bnVsbCx3aW5kb3cuc2Nyb2xsVG8oe3RvcDp0aGlzLl9zY3JvbGxQb3NpdGlvbixiZWhhdmlvcjpcImluc3RhbnRcIn0pLHRoaXMubW9kYWwuY2xhc3NMaXN0LnJlbW92ZShcInRpbmdsZS1tb2RhbC0tdmlzaWJsZVwiKTt2YXIgbz10aGlzO28ubW9kYWwuc3R5bGUuZGlzcGxheT1cIm5vbmVcIixcImZ1bmN0aW9uXCI9PXR5cGVvZiBvLm9wdHMub25DbG9zZSYmby5vcHRzLm9uQ2xvc2UuY2FsbCh0aGlzKSxvLl9idXN5KCExKX19LHQucHJvdG90eXBlLnNldENvbnRlbnQ9ZnVuY3Rpb24odCl7cmV0dXJuXCJzdHJpbmdcIj09dHlwZW9mIHQ/dGhpcy5tb2RhbEJveENvbnRlbnQuaW5uZXJIVE1MPXQ6KHRoaXMubW9kYWxCb3hDb250ZW50LmlubmVySFRNTD1cIlwiLHRoaXMubW9kYWxCb3hDb250ZW50LmFwcGVuZENoaWxkKHQpKSx0aGlzLmlzT3BlbigpJiZ0aGlzLmNoZWNrT3ZlcmZsb3coKSx0aGlzfSx0LnByb3RvdHlwZS5nZXRDb250ZW50PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMubW9kYWxCb3hDb250ZW50fSx0LnByb3RvdHlwZS5hZGRGb290ZXI9ZnVuY3Rpb24oKXtyZXR1cm4gZnVuY3Rpb24oKXt0aGlzLm1vZGFsQm94Rm9vdGVyPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiksdGhpcy5tb2RhbEJveEZvb3Rlci5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsLWJveF9fZm9vdGVyXCIpLHRoaXMubW9kYWxCb3guYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveEZvb3Rlcil9LmNhbGwodGhpcyksdGhpc30sdC5wcm90b3R5cGUuc2V0Rm9vdGVyQ29udGVudD1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5tb2RhbEJveEZvb3Rlci5pbm5lckhUTUw9dCx0aGlzfSx0LnByb3RvdHlwZS5nZXRGb290ZXJDb250ZW50PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMubW9kYWxCb3hGb290ZXJ9LHQucHJvdG90eXBlLnNldFN0aWNreUZvb3Rlcj1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5pc092ZXJmbG93KCl8fCh0PSExKSx0P3RoaXMubW9kYWxCb3guY29udGFpbnModGhpcy5tb2RhbEJveEZvb3RlcikmJih0aGlzLm1vZGFsQm94LnJlbW92ZUNoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpLHRoaXMubW9kYWwuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlciksdGhpcy5tb2RhbEJveEZvb3Rlci5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsLWJveF9fZm9vdGVyLS1zdGlja3lcIiksZS5jYWxsKHRoaXMpLHRoaXMubW9kYWxCb3hDb250ZW50LnN0eWxlW1wicGFkZGluZy1ib3R0b21cIl09dGhpcy5tb2RhbEJveEZvb3Rlci5jbGllbnRIZWlnaHQrMjArXCJweFwiKTp0aGlzLm1vZGFsQm94Rm9vdGVyJiYodGhpcy5tb2RhbEJveC5jb250YWlucyh0aGlzLm1vZGFsQm94Rm9vdGVyKXx8KHRoaXMubW9kYWwucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlciksdGhpcy5tb2RhbEJveC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKSx0aGlzLm1vZGFsQm94Rm9vdGVyLnN0eWxlLndpZHRoPVwiYXV0b1wiLHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUubGVmdD1cIlwiLHRoaXMubW9kYWxCb3hDb250ZW50LnN0eWxlW1wicGFkZGluZy1ib3R0b21cIl09XCJcIix0aGlzLm1vZGFsQm94Rm9vdGVyLmNsYXNzTGlzdC5yZW1vdmUoXCJ0aW5nbGUtbW9kYWwtYm94X19mb290ZXItLXN0aWNreVwiKSkpLHRoaXN9LHQucHJvdG90eXBlLmFkZEZvb3RlckJ0bj1mdW5jdGlvbih0LG8sZSl7dmFyIHM9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtyZXR1cm4gcy5pbm5lckhUTUw9dCxzLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLGUpLFwic3RyaW5nXCI9PXR5cGVvZiBvJiZvLmxlbmd0aCYmby5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbih0KXtzLmNsYXNzTGlzdC5hZGQodCl9KSx0aGlzLm1vZGFsQm94Rm9vdGVyLmFwcGVuZENoaWxkKHMpLHN9LHQucHJvdG90eXBlLnJlc2l6ZT1mdW5jdGlvbigpe2NvbnNvbGUud2FybihcIlJlc2l6ZSBpcyBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gdmVyc2lvbiAxLjBcIil9LHQucHJvdG90eXBlLmlzT3ZlcmZsb3c9ZnVuY3Rpb24oKXtyZXR1cm4gd2luZG93LmlubmVySGVpZ2h0PD10aGlzLm1vZGFsQm94LmNsaWVudEhlaWdodH0sdC5wcm90b3R5cGUuY2hlY2tPdmVyZmxvdz1mdW5jdGlvbigpe3RoaXMubW9kYWwuY2xhc3NMaXN0LmNvbnRhaW5zKFwidGluZ2xlLW1vZGFsLS12aXNpYmxlXCIpJiYodGhpcy5pc092ZXJmbG93KCk/dGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsLS1vdmVyZmxvd1wiKTp0aGlzLm1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoXCJ0aW5nbGUtbW9kYWwtLW92ZXJmbG93XCIpLCF0aGlzLmlzT3ZlcmZsb3coKSYmdGhpcy5vcHRzLnN0aWNreUZvb3Rlcj90aGlzLnNldFN0aWNreUZvb3RlcighMSk6dGhpcy5pc092ZXJmbG93KCkmJnRoaXMub3B0cy5zdGlja3lGb290ZXImJihlLmNhbGwodGhpcyksdGhpcy5zZXRTdGlja3lGb290ZXIoITApKSl9LHttb2RhbDp0fX0pOyIsImltcG9ydCBSU2xpZGVyIGZyb20gJ3ZlbmRvci9yc2xpZGVyJ1xuaW1wb3J0IE9wdGlvbnNTZXQgZnJvbSAnT3B0aW9uc1NldCdcbmltcG9ydCAqIGFzIFRvcGljQ2hvb3NlciBmcm9tICdUb3BpY0Nob29zZXInXG5pbXBvcnQgeyBtb2RhbCBhcyBUTW9kYWwgfSBmcm9tICd0aW5nbGUuanMnXG5pbXBvcnQgeyByYW5kRWxlbSwgY3JlYXRlRWxlbSwgaGFzQW5jZXN0b3JDbGFzcywgYm9vbE9iamVjdFRvQXJyYXkgfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5pbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIGludGVyZmFjZSBXaW5kb3cge1xuICAgIFNIT1dfRElGRklDVUxUWTogYm9vbGVhblxuICB9XG59XG53aW5kb3cuU0hPV19ESUZGSUNVTFRZID0gZmFsc2UgLy8gZm9yIGRlYnVnZ2luZyBxdWVzdGlvbnNcblxuLyogVHlwZXMgKi9cbmludGVyZmFjZSBRdWVzdGlvbkluZm8ge1xuICBjb250YWluZXI6IEhUTUxFbGVtZW50LFxuICBxdWVzdGlvbj86IFF1ZXN0aW9uLFxuICB0b3BpY0lkPzogc3RyaW5nLFxufVxuXG4vLyBNYWtlIGFuIG92ZXJsYXkgdG8gY2FwdHVyZSBhbnkgY2xpY2tzIG91dHNpZGUgYm94ZXMsIGlmIG5lY2Vzc2FyeVxuY3JlYXRlRWxlbSgnZGl2JywgJ292ZXJsYXkgaGlkZGVuJywgZG9jdW1lbnQuYm9keSkuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBoaWRlQWxsQWN0aW9ucylcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUXVlc3Rpb25TZXQge1xuICAvLyBUaGUgbWFpbiBxdWVzdGlvblxuICBxTnVtYmVyOiBudW1iZXJcbiAgYW5zd2VyZWQ6IGJvb2xlYW5cbiAgY29tbWFuZFdvcmQ6IHN0cmluZ1xuICB1c2VDb21tYW5kV29yZDogYm9vbGVhblxuXG4gIC8vIHF1ZXN0aW9ucyBhbmQgdGhlaXIgb3B0aW9uc1xuICBuOiBudW1iZXIgLy8gTnVtYmVyIG9mIHF1ZXN0aW9uc1xuICBxdWVzdGlvbnM6IFF1ZXN0aW9uSW5mb1tdIC8vIGxpc3Qgb2YgcXVlc3Rpb25zIGFuZCB0aGUgRE9NIGVsZW1lbnQgdGhleSdyZSByZW5kZXJlZCBpblxuICB0b3BpY3NPcHRpb25zITogT3B0aW9uc1NldCAvLyBPcHRpb25zU2V0IG9iamVjdCBmb3IgY2hvb3NpbmcgdG9waWNzXG4gIHRvcGljc01vZGFsITogVE1vZGFsIC8vIEEgbW9kYWwgZGlhbG9nIGZvciBkaXNwbGF5aW5nIHRvcGljc09wdGlvbnNcbiAgdG9waWNzOiBzdHJpbmdbXSAvLyBMaXN0IG9mIHNlbGVjdGVkIHRvcGljIElkc1xuICBvcHRpb25zU2V0czogUmVjb3JkPHN0cmluZywgT3B0aW9uc1NldD4gLy8gbWFwIGZyb20gdG9waWMgaWRzIHRvIHRoZWlyIG9wdGlvbnMgc2V0XG5cbiAgLy8gVUkgZWxlbWVudHNcbiAgdG9waWNDaG9vc2VyQnV0dG9uITogSFRNTEVsZW1lbnQgLy8gVGhlIGJ1dHRvbiB0byBvcGVuIHRoZSB0b3BpYyBjaG9vc2VyXG4gIGRpZmZpY3VsdHlTbGlkZXJFbGVtZW50ITogSFRNTElucHV0RWxlbWVudFxuICBkaWZmaWN1bHR5U2xpZGVyITogUlNsaWRlclxuICBnZW5lcmF0ZUJ1dHRvbiE6IEhUTUxCdXR0b25FbGVtZW50XG4gIGFuc3dlckJ1dHRvbiE6IEhUTUxFbGVtZW50XG5cbiAgLy8gRE9NIGVsZW1lbnRzIC0gaW5pdGlhbGlzZWQgaW4gX2J1aWxkKCksIGNhbGxlZCBmcm9tIGNvbnN0cnVjdG9yXG4gIGhlYWRlckJveCE6IEhUTUxFbGVtZW50XG4gIG91dGVyQm94ITogSFRNTEVsZW1lbnRcbiAgZGlzcGxheUJveCE6IEhUTUxFbGVtZW50XG5cbiAgY29uc3RydWN0b3IgKHFOdW1iZXI6IG51bWJlcikge1xuICAgIHRoaXMucXVlc3Rpb25zID0gW10gLy8gbGlzdCBvZiBxdWVzdGlvbnMgYW5kIHRoZSBET00gZWxlbWVudCB0aGV5J3JlIHJlbmRlcmVkIGluXG4gICAgdGhpcy50b3BpY3MgPSBbXSAvLyBsaXN0IG9mIHRvcGljcyB3aGljaCBoYXZlIGJlZW4gc2VsZWN0ZWQgZm9yIHRoaXMgc2V0XG4gICAgdGhpcy5vcHRpb25zU2V0cyA9IHt9IC8vIGxpc3Qgb2YgT3B0aW9uc1NldCBvYmplY3RzIGNhcnJ5aW5nIG9wdGlvbnMgZm9yIHRvcGljcyB3aXRoIG9wdGlvbnNcbiAgICB0aGlzLnFOdW1iZXIgPSBxTnVtYmVyIHx8IDEgLy8gUXVlc3Rpb24gbnVtYmVyIChwYXNzZWQgaW4gYnkgY2FsbGVyLCB3aGljaCB3aWxsIGtlZXAgY291bnQpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlIC8vIFdoZXRoZXIgYW5zd2VyZWQgb3Igbm90XG4gICAgdGhpcy5jb21tYW5kV29yZCA9ICcnIC8vIFNvbWV0aGluZyBsaWtlICdzaW1wbGlmeSdcbiAgICB0aGlzLnVzZUNvbW1hbmRXb3JkID0gdHJ1ZSAvLyBVc2UgdGhlIGNvbW1hbmQgd29yZCBpbiB0aGUgbWFpbiBxdWVzdGlvbiwgZmFsc2UgZ2l2ZSBjb21tYW5kIHdvcmQgd2l0aCBlYWNoIHN1YnF1ZXN0aW9uXG4gICAgdGhpcy5uID0gOCAvLyBOdW1iZXIgb2YgcXVlc3Rpb25zXG5cbiAgICB0aGlzLl9idWlsZCgpXG4gIH1cblxuICBfYnVpbGQgKCkge1xuICAgIHRoaXMub3V0ZXJCb3ggPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tb3V0ZXJib3gnKVxuICAgIHRoaXMuaGVhZGVyQm94ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWhlYWRlcmJveCcsIHRoaXMub3V0ZXJCb3gpXG4gICAgdGhpcy5kaXNwbGF5Qm94ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWRpc3BsYXlib3gnLCB0aGlzLm91dGVyQm94KVxuXG4gICAgdGhpcy5fYnVpbGRPcHRpb25zQm94KClcblxuICAgIHRoaXMuX2J1aWxkVG9waWNDaG9vc2VyKClcbiAgfVxuXG4gIF9idWlsZE9wdGlvbnNCb3ggKCkge1xuICAgIGNvbnN0IHRvcGljU3BhbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCB1bmRlZmluZWQsIHRoaXMuaGVhZGVyQm94KVxuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uID0gY3JlYXRlRWxlbSgnc3BhbicsICd0b3BpYy1jaG9vc2VyIGJ1dHRvbicsIHRvcGljU3BhbilcbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbi5pbm5lckhUTUwgPSAnQ2hvb3NlIHRvcGljJ1xuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5jaG9vc2VUb3BpY3MoKSlcblxuICAgIGNvbnN0IGRpZmZpY3VsdHlTcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIHVuZGVmaW5lZCwgdGhpcy5oZWFkZXJCb3gpXG4gICAgZGlmZmljdWx0eVNwYW4uYXBwZW5kKCdEaWZmaWN1bHR5OiAnKVxuICAgIGNvbnN0IGRpZmZpY3VsdHlTbGlkZXJPdXRlciA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCAnc2xpZGVyLW91dGVyJywgZGlmZmljdWx0eVNwYW4pXG4gICAgdGhpcy5kaWZmaWN1bHR5U2xpZGVyRWxlbWVudCA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgdW5kZWZpbmVkLCBkaWZmaWN1bHR5U2xpZGVyT3V0ZXIpIGFzIEhUTUxJbnB1dEVsZW1lbnRcblxuICAgIGNvbnN0IG5TcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIHVuZGVmaW5lZCwgdGhpcy5oZWFkZXJCb3gpXG4gICAgblNwYW4uYXBwZW5kKCdOdW1iZXIgb2YgcXVlc3Rpb25zOiAnKVxuICAgIGNvbnN0IG5RdWVzdGlvbnNJbnB1dCA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgJ24tcXVlc3Rpb25zJywgblNwYW4pIGFzIEhUTUxJbnB1dEVsZW1lbnRcbiAgICBuUXVlc3Rpb25zSW5wdXQudHlwZSA9ICdudW1iZXInXG4gICAgblF1ZXN0aW9uc0lucHV0Lm1pbiA9ICcxJ1xuICAgIG5RdWVzdGlvbnNJbnB1dC52YWx1ZSA9ICc4J1xuICAgIG5RdWVzdGlvbnNJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICB0aGlzLm4gPSBwYXJzZUludChuUXVlc3Rpb25zSW5wdXQudmFsdWUpXG4gICAgfSlcblxuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24gPSBjcmVhdGVFbGVtKCdidXR0b24nLCAnZ2VuZXJhdGUtYnV0dG9uIGJ1dHRvbicsIHRoaXMuaGVhZGVyQm94KSBhcyBIVE1MQnV0dG9uRWxlbWVudFxuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uZGlzYWJsZWQgPSB0cnVlXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5pbm5lckhUTUwgPSAnR2VuZXJhdGUhJ1xuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLmdlbmVyYXRlQWxsKCkpXG4gIH1cblxuICBfaW5pdFNsaWRlciAoKSB7XG4gICAgdGhpcy5kaWZmaWN1bHR5U2xpZGVyID0gbmV3IFJTbGlkZXIoe1xuICAgICAgdGFyZ2V0OiB0aGlzLmRpZmZpY3VsdHlTbGlkZXJFbGVtZW50LFxuICAgICAgdmFsdWVzOiB7IG1pbjogMSwgbWF4OiAxMCB9LFxuICAgICAgcmFuZ2U6IHRydWUsXG4gICAgICBzZXQ6IFsyLCA2XSxcbiAgICAgIHN0ZXA6IDEsXG4gICAgICB0b29sdGlwOiBmYWxzZSxcbiAgICAgIHNjYWxlOiB0cnVlLFxuICAgICAgbGFiZWxzOiB0cnVlXG4gICAgfSlcbiAgfVxuXG4gIF9idWlsZFRvcGljQ2hvb3NlciAoKSB7XG4gICAgLy8gYnVpbGQgYW4gT3B0aW9uc1NldCBvYmplY3QgZm9yIHRoZSB0b3BpY3NcbiAgICBjb25zdCB0b3BpY3MgPSBUb3BpY0Nob29zZXIuZ2V0VG9waWNzKClcbiAgICBjb25zdCBvcHRpb25zU3BlYzogT3B0aW9uc1NwZWMgPSBbXVxuICAgIHRvcGljcy5mb3JFYWNoKHRvcGljID0+IHtcbiAgICAgIG9wdGlvbnNTcGVjLnB1c2goe1xuICAgICAgICB0aXRsZTogdG9waWMudGl0bGUsXG4gICAgICAgIGlkOiB0b3BpYy5pZCxcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgc3dhcExhYmVsOiB0cnVlXG4gICAgICB9KVxuICAgIH0pXG4gICAgdGhpcy50b3BpY3NPcHRpb25zID0gbmV3IE9wdGlvbnNTZXQob3B0aW9uc1NwZWMpXG5cbiAgICAvLyBCdWlsZCBhIG1vZGFsIGRpYWxvZyB0byBwdXQgdGhlbSBpblxuICAgIHRoaXMudG9waWNzTW9kYWwgPSBuZXcgVE1vZGFsKHtcbiAgICAgIGZvb3RlcjogdHJ1ZSxcbiAgICAgIHN0aWNreUZvb3RlcjogZmFsc2UsXG4gICAgICBjbG9zZU1ldGhvZHM6IFsnb3ZlcmxheScsICdlc2NhcGUnXSxcbiAgICAgIGNsb3NlTGFiZWw6ICdDbG9zZScsXG4gICAgICBvbkNsb3NlOiAoKSA9PiB7XG4gICAgICAgIHRoaXMudXBkYXRlVG9waWNzKClcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhpcy50b3BpY3NNb2RhbC5hZGRGb290ZXJCdG4oXG4gICAgICAnT0snLFxuICAgICAgJ2J1dHRvbiBtb2RhbC1idXR0b24nLFxuICAgICAgKCkgPT4ge1xuICAgICAgICB0aGlzLnRvcGljc01vZGFsLmNsb3NlKClcbiAgICAgIH0pXG5cbiAgICAvLyByZW5kZXIgb3B0aW9ucyBpbnRvIG1vZGFsXG4gICAgdGhpcy50b3BpY3NPcHRpb25zLnJlbmRlckluKHRoaXMudG9waWNzTW9kYWwuZ2V0Q29udGVudCgpKVxuXG4gICAgLy8gQWRkIGZ1cnRoZXIgb3B0aW9ucyBidXR0b25zXG4gICAgLy8gVGhpcyBmZWVscyBhIGJpdCBpZmZ5IC0gZGVwZW5kcyB0b28gbXVjaCBvbiBpbXBsZW1lbnRhdGlvbiBvZiBPcHRpb25zU2V0XG4gICAgY29uc3QgbGlzID0gQXJyYXkuZnJvbSh0aGlzLnRvcGljc01vZGFsLmdldENvbnRlbnQoKS5nZXRFbGVtZW50c0J5VGFnTmFtZSgnbGknKSlcbiAgICBsaXMuZm9yRWFjaChsaSA9PiB7XG4gICAgICBjb25zdCB0b3BpY0lkID0gbGkuZGF0YXNldC5vcHRpb25JZFxuICAgICAgaWYgKHRvcGljSWQgIT09IHVuZGVmaW5lZCAmJiBUb3BpY0Nob29zZXIuaGFzT3B0aW9ucyh0b3BpY0lkKSkge1xuICAgICAgICBjb25zdCBvcHRpb25zQnV0dG9uID0gY3JlYXRlRWxlbSgnZGl2JywgJ2ljb24tYnV0dG9uIGV4dHJhLW9wdGlvbnMtYnV0dG9uJywgbGkpXG4gICAgICAgIHRoaXMuX2J1aWxkVG9waWNPcHRpb25zKHRvcGljSWQsIG9wdGlvbnNCdXR0b24pXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIF9idWlsZFRvcGljT3B0aW9ucyAodG9waWNJZDogc3RyaW5nLCBvcHRpb25zQnV0dG9uOiBIVE1MRWxlbWVudCkge1xuICAgIC8vIEJ1aWxkIHRoZSBVSSBhbmQgT3B0aW9uc1NldCBvYmplY3QgbGlua2VkIHRvIHRvcGljSWQuIFBhc3MgaW4gYSBidXR0b24gd2hpY2ggc2hvdWxkIGxhdW5jaCBpdFxuXG4gICAgLy8gTWFrZSB0aGUgT3B0aW9uc1NldCBvYmplY3QgYW5kIHN0b3JlIGEgcmVmZXJlbmNlIHRvIGl0XG4gICAgLy8gT25seSBzdG9yZSBpZiBvYmplY3QgaXMgY3JlYXRlZD9cbiAgICBjb25zdCBvcHRpb25zU2V0ID0gVG9waWNDaG9vc2VyLm5ld09wdGlvbnNTZXQodG9waWNJZClcbiAgICB0aGlzLm9wdGlvbnNTZXRzW3RvcGljSWRdID0gb3B0aW9uc1NldFxuXG4gICAgLy8gTWFrZSBhIG1vZGFsIGRpYWxvZyBmb3IgaXRcbiAgICBjb25zdCBtb2RhbCA9IG5ldyBUTW9kYWwoe1xuICAgICAgZm9vdGVyOiB0cnVlLFxuICAgICAgc3RpY2t5Rm9vdGVyOiBmYWxzZSxcbiAgICAgIGNsb3NlTWV0aG9kczogWydvdmVybGF5JywgJ2VzY2FwZSddLFxuICAgICAgY2xvc2VMYWJlbDogJ0Nsb3NlJ1xuICAgIH0pXG5cbiAgICBtb2RhbC5hZGRGb290ZXJCdG4oXG4gICAgICAnT0snLFxuICAgICAgJ2J1dHRvbiBtb2RhbC1idXR0b24nLFxuICAgICAgKCkgPT4ge1xuICAgICAgICBtb2RhbC5jbG9zZSgpXG4gICAgICB9KVxuXG4gICAgb3B0aW9uc1NldC5yZW5kZXJJbihtb2RhbC5nZXRDb250ZW50KCkpXG5cbiAgICAvLyBsaW5rIHRoZSBtb2RhbCB0byB0aGUgYnV0dG9uXG4gICAgb3B0aW9uc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIG1vZGFsLm9wZW4oKVxuICAgIH0pXG4gIH1cblxuICBjaG9vc2VUb3BpY3MgKCkge1xuICAgIHRoaXMudG9waWNzTW9kYWwub3BlbigpXG4gIH1cblxuICB1cGRhdGVUb3BpY3MgKCkge1xuICAgIC8vIHRvcGljIGNob2ljZXMgYXJlIHN0b3JlZCBpbiB0aGlzLnRvcGljc09wdGlvbnMgYXV0b21hdGljYWxseVxuICAgIC8vIHB1bGwgdGhpcyBpbnRvIHRoaXMudG9waWNzIGFuZCB1cGRhdGUgYnV0dG9uIGRpc3BsYXlzXG5cbiAgICAvLyBoYXZlIG9iamVjdCB3aXRoIGJvb2xlYW4gcHJvcGVydGllcy4gSnVzdCB3YW50IHRoZSB0cnVlIHZhbHVlc1xuICAgIGNvbnN0IHRvcGljcyA9IGJvb2xPYmplY3RUb0FycmF5KHRoaXMudG9waWNzT3B0aW9ucy5vcHRpb25zKVxuICAgIHRoaXMudG9waWNzID0gdG9waWNzXG5cbiAgICBsZXQgdGV4dFxuXG4gICAgaWYgKHRvcGljcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRleHQgPSAnQ2hvb3NlIHRvcGljJyAvLyBub3RoaW5nIHNlbGVjdGVkXG4gICAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmRpc2FibGVkID0gdHJ1ZVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBpZCA9IHRvcGljc1swXSAvLyBmaXJzdCBpdGVtIHNlbGVjdGVkXG4gICAgICB0ZXh0ID0gVG9waWNDaG9vc2VyLmdldFRpdGxlKGlkKVxuICAgICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlXG4gICAgfVxuXG4gICAgaWYgKHRvcGljcy5sZW5ndGggPiAxKSB7IC8vIGFueSBhZGRpdGlvbmFsIHNob3cgYXMgZS5nLiAnICsgMVxuICAgICAgdGV4dCArPSAnICsnICsgKHRvcGljcy5sZW5ndGggLSAxKVxuICAgIH1cblxuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uLmlubmVySFRNTCA9IHRleHRcbiAgfVxuXG4gIHNldENvbW1hbmRXb3JkICgpIHtcbiAgICAvLyBmaXJzdCBzZXQgdG8gZmlyc3QgdG9waWMgY29tbWFuZCB3b3JkXG4gICAgbGV0IGNvbW1hbmRXb3JkID0gVG9waWNDaG9vc2VyLmdldENvbW1hbmRXb3JkKHRoaXMudG9waWNzWzBdKVxuXG4gICAgbGV0IHVzZUNvbW1hbmRXb3JkID0gdHJ1ZSAvLyB0cnVlIGlmIHNoYXJlZCBjb21tYW5kIHdvcmRcblxuICAgIC8vIGN5Y2xlIHRocm91Z2ggcmVzdCBvZiB0b3BpY3MsIHJlc2V0IGNvbW1hbmQgd29yZCBpZiB0aGV5IGRvbid0IG1hdGNoXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCB0aGlzLnRvcGljcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKFRvcGljQ2hvb3Nlci5nZXRDb21tYW5kV29yZCh0aGlzLnRvcGljc1tpXSkgIT09IGNvbW1hbmRXb3JkKSB7XG4gICAgICAgIGNvbW1hbmRXb3JkID0gJydcbiAgICAgICAgdXNlQ29tbWFuZFdvcmQgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY29tbWFuZFdvcmQgPSBjb21tYW5kV29yZFxuICAgIHRoaXMudXNlQ29tbWFuZFdvcmQgPSB1c2VDb21tYW5kV29yZFxuICB9XG5cbiAgZ2VuZXJhdGVBbGwgKCkge1xuICAgIC8vIENsZWFyIGRpc3BsYXktYm94IGFuZCBxdWVzdGlvbiBsaXN0XG4gICAgdGhpcy5kaXNwbGF5Qm94LmlubmVySFRNTCA9ICcnXG4gICAgdGhpcy5xdWVzdGlvbnMgPSBbXVxuICAgIHRoaXMuc2V0Q29tbWFuZFdvcmQoKVxuXG4gICAgLy8gU2V0IG51bWJlciBhbmQgbWFpbiBjb21tYW5kIHdvcmRcbiAgICBjb25zdCBtYWlucSA9IGNyZWF0ZUVsZW0oJ3AnLCAna2F0ZXggbWFpbnEnLCB0aGlzLmRpc3BsYXlCb3gpXG4gICAgbWFpbnEuaW5uZXJIVE1MID0gYCR7dGhpcy5xTnVtYmVyfS4gJHt0aGlzLmNvbW1hbmRXb3JkfWAgLy8gVE9ETzogZ2V0IGNvbW1hbmQgd29yZCBmcm9tIHF1ZXN0aW9uc1xuXG4gICAgLy8gTWFrZSBzaG93IGFuc3dlcnMgYnV0dG9uXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24gPSBjcmVhdGVFbGVtKCdwJywgJ2J1dHRvbiBzaG93LWFuc3dlcnMnLCB0aGlzLmRpc3BsYXlCb3gpXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLnRvZ2dsZUFuc3dlcnMoKVxuICAgIH0pXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24uaW5uZXJIVE1MID0gJ1Nob3cgYW5zd2VycydcblxuICAgIC8vIEdldCBkaWZmaWN1bHR5IGZyb20gc2xpZGVyXG4gICAgY29uc3QgbWluZGlmZiA9IHRoaXMuZGlmZmljdWx0eVNsaWRlci5nZXRWYWx1ZUwoKVxuICAgIGNvbnN0IG1heGRpZmYgPSB0aGlzLmRpZmZpY3VsdHlTbGlkZXIuZ2V0VmFsdWVSKClcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIC8vIE1ha2UgcXVlc3Rpb24gY29udGFpbmVyIERPTSBlbGVtZW50XG4gICAgICBjb25zdCBjb250YWluZXIgPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tY29udGFpbmVyJywgdGhpcy5kaXNwbGF5Qm94KVxuICAgICAgY29udGFpbmVyLmRhdGFzZXQucXVlc3Rpb25faW5kZXggPSBpICsgJycgLy8gbm90IHN1cmUgdGhpcyBpcyBhY3R1YWxseSBuZWVkZWRcblxuICAgICAgLy8gQWRkIGNvbnRhaW5lciBsaW5rIHRvIG9iamVjdCBpbiBxdWVzdGlvbnMgbGlzdFxuICAgICAgaWYgKCF0aGlzLnF1ZXN0aW9uc1tpXSkgdGhpcy5xdWVzdGlvbnNbaV0gPSB7IGNvbnRhaW5lcjogY29udGFpbmVyIH1cblxuICAgICAgLy8gY2hvb3NlIGEgZGlmZmljdWx0eSBhbmQgZ2VuZXJhdGVcbiAgICAgIGNvbnN0IGRpZmZpY3VsdHkgPSBtaW5kaWZmICsgTWF0aC5mbG9vcihpICogKG1heGRpZmYgLSBtaW5kaWZmICsgMSkgLyB0aGlzLm4pXG5cbiAgICAgIC8vIGNob29zZSBhIHRvcGljIGlkXG4gICAgICB0aGlzLmdlbmVyYXRlKGksIGRpZmZpY3VsdHkpXG4gICAgfVxuICB9XG5cbiAgZ2VuZXJhdGUgKGk6IG51bWJlciwgZGlmZmljdWx0eTogbnVtYmVyLCB0b3BpY0lkPzogc3RyaW5nKSB7XG4gICAgLy8gVE9ETyBnZXQgb3B0aW9ucyBwcm9wZXJseVxuICAgIHRvcGljSWQgPSB0b3BpY0lkIHx8IHJhbmRFbGVtKHRoaXMudG9waWNzKVxuXG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgIGxhYmVsOiAnJyxcbiAgICAgIGRpZmZpY3VsdHk6IGRpZmZpY3VsdHksXG4gICAgICB1c2VDb21tYW5kV29yZDogZmFsc2VcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zU2V0c1t0b3BpY0lkXSkge1xuICAgICAgT2JqZWN0LmFzc2lnbihvcHRpb25zLCB0aGlzLm9wdGlvbnNTZXRzW3RvcGljSWRdLm9wdGlvbnMpXG4gICAgfVxuXG4gICAgLy8gY2hvb3NlIGEgcXVlc3Rpb25cbiAgICBjb25zdCBxdWVzdGlvbiA9IFRvcGljQ2hvb3Nlci5uZXdRdWVzdGlvbih0b3BpY0lkLCBvcHRpb25zKVxuXG4gICAgLy8gc2V0IHNvbWUgbW9yZSBkYXRhIGluIHRoZSBxdWVzdGlvbnNbXSBsaXN0XG4gICAgaWYgKCF0aGlzLnF1ZXN0aW9uc1tpXSkgdGhyb3cgbmV3IEVycm9yKCdxdWVzdGlvbiBub3QgbWFkZScpXG4gICAgdGhpcy5xdWVzdGlvbnNbaV0ucXVlc3Rpb24gPSBxdWVzdGlvblxuICAgIHRoaXMucXVlc3Rpb25zW2ldLnRvcGljSWQgPSB0b3BpY0lkXG5cbiAgICAvLyBSZW5kZXIgaW50byB0aGUgY29udGFpbmVyXG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5xdWVzdGlvbnNbaV0uY29udGFpbmVyXG4gICAgY29udGFpbmVyLmlubmVySFRNTCA9ICcnIC8vIGNsZWFyIGluIGNhc2Ugb2YgcmVmcmVzaFxuXG4gICAgLy8gbWFrZSBhbmQgcmVuZGVyIHF1ZXN0aW9uIG51bWJlciBhbmQgY29tbWFuZCB3b3JkIChpZiBuZWVkZWQpXG4gICAgbGV0IHFOdW1iZXJUZXh0ID0gcXVlc3Rpb25MZXR0ZXIoaSkgKyAnKSdcbiAgICBpZiAod2luZG93LlNIT1dfRElGRklDVUxUWSkgeyBxTnVtYmVyVGV4dCArPSBvcHRpb25zLmRpZmZpY3VsdHkgfVxuICAgIGlmICghdGhpcy51c2VDb21tYW5kV29yZCkge1xuICAgICAgcU51bWJlclRleHQgKz0gJyAnICsgVG9waWNDaG9vc2VyLmdldENvbW1hbmRXb3JkKHRvcGljSWQpXG4gICAgICBjb250YWluZXIuY2xhc3NMaXN0LmFkZCgnaW5kaXZpZHVhbC1jb21tYW5kLXdvcmQnKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZSgnaW5kaXZpZHVhbC1jb21tYW5kLXdvcmQnKVxuICAgIH1cblxuICAgIGNvbnN0IHF1ZXN0aW9uTnVtYmVyRGl2ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLW51bWJlciBrYXRleCcsIGNvbnRhaW5lcilcbiAgICBxdWVzdGlvbk51bWJlckRpdi5pbm5lckhUTUwgPSBxTnVtYmVyVGV4dFxuXG4gICAgLy8gcmVuZGVyIHRoZSBxdWVzdGlvblxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChxdWVzdGlvbi5nZXRET00oKSkgLy8gdGhpcyBpcyBhIC5xdWVzdGlvbi1kaXYgZWxlbWVudFxuICAgIHF1ZXN0aW9uLnJlbmRlcigpIC8vIHNvbWUgcXVlc3Rpb25zIG5lZWQgcmVuZGVyaW5nIGFmdGVyIGF0dGFjaGluZyB0byBET01cblxuICAgIC8vIG1ha2UgaGlkZGVuIGFjdGlvbnMgbWVudVxuICAgIGNvbnN0IGFjdGlvbnMgPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tYWN0aW9ucyBoaWRkZW4nLCBjb250YWluZXIpXG4gICAgY29uc3QgcmVmcmVzaEljb24gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tcmVmcmVzaCBpY29uLWJ1dHRvbicsIGFjdGlvbnMpXG4gICAgY29uc3QgYW5zd2VySWNvbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1hbnN3ZXIgaWNvbi1idXR0b24nLCBhY3Rpb25zKVxuXG4gICAgYW5zd2VySWNvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHF1ZXN0aW9uLnRvZ2dsZUFuc3dlcigpXG4gICAgICBoaWRlQWxsQWN0aW9ucygpXG4gICAgfSlcblxuICAgIHJlZnJlc2hJY29uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgdGhpcy5nZW5lcmF0ZShpLCBkaWZmaWN1bHR5KVxuICAgICAgaGlkZUFsbEFjdGlvbnMoKVxuICAgIH0pXG5cbiAgICAvLyBROiBpcyB0aGlzIGJlc3Qgd2F5IC0gb3IgYW4gZXZlbnQgbGlzdGVuZXIgb24gdGhlIHdob2xlIGRpc3BsYXlCb3g/XG4gICAgY29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZSA9PiB7XG4gICAgICBpZiAoIWhhc0FuY2VzdG9yQ2xhc3MoZS50YXJnZXQsICdxdWVzdGlvbi1hY3Rpb25zJykpIHtcbiAgICAgICAgLy8gb25seSBkbyB0aGlzIGlmIGl0IGRpZG4ndCBvcmlnaW5hdGUgaW4gYWN0aW9uIGJ1dHRvblxuICAgICAgICB0aGlzLnNob3dRdWVzdGlvbkFjdGlvbnMoaSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgdG9nZ2xlQW5zd2VycyAoKSB7XG4gICAgaWYgKHRoaXMuYW5zd2VyZWQpIHtcbiAgICAgIHRoaXMucXVlc3Rpb25zLmZvckVhY2gocSA9PiB7XG4gICAgICAgIGlmIChxLnF1ZXN0aW9uKSBxLnF1ZXN0aW9uLmhpZGVBbnN3ZXIoKVxuICAgICAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgICAgICAgdGhpcy5hbnN3ZXJCdXR0b24uaW5uZXJIVE1MID0gJ1Nob3cgYW5zd2VycydcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucXVlc3Rpb25zLmZvckVhY2gocSA9PiB7XG4gICAgICAgIGlmIChxLnF1ZXN0aW9uKSBxLnF1ZXN0aW9uLnNob3dBbnN3ZXIoKVxuICAgICAgICB0aGlzLmFuc3dlcmVkID0gdHJ1ZVxuICAgICAgICB0aGlzLmFuc3dlckJ1dHRvbi5pbm5lckhUTUwgPSAnSGlkZSBhbnN3ZXJzJ1xuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2NhbnMgZm9yIHdpZGVzdCBxdWVzdGlvbiBhbmQgdGhlbiBzZXRzIHRoZSBncmlkIHdpZHRoIHRvIHRoYXRcbiAgICovXG4gIC8qIGVzbGludC1kaXNhYmxlICovXG4gIGFkanVzdEdyaWRXaWR0aCAoKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgLyogZXNsaW50LWVuYWJsZSAqL1xuXG4gIHNob3dRdWVzdGlvbkFjdGlvbnMgKHF1ZXN0aW9uSW5kZXg6IG51bWJlcikge1xuICAgIC8vIGZpcnN0IGhpZGUgYW55IG90aGVyIGFjdGlvbnNcbiAgICBoaWRlQWxsQWN0aW9ucygpXG5cbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLnF1ZXN0aW9uc1txdWVzdGlvbkluZGV4XS5jb250YWluZXJcbiAgICBjb25zdCBhY3Rpb25zID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy5xdWVzdGlvbi1hY3Rpb25zJykgYXMgSFRNTEVsZW1lbnRcblxuICAgIC8vIFVuaGlkZSB0aGUgb3ZlcmxheVxuICAgIGNvbnN0IG92ZXJsYXkgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcub3ZlcmxheScpXG4gICAgaWYgKG92ZXJsYXkgIT09IG51bGwpIG92ZXJsYXkuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJylcbiAgICBhY3Rpb25zLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpXG4gICAgYWN0aW9ucy5zdHlsZS5sZWZ0ID0gKGNvbnRhaW5lci5vZmZzZXRXaWR0aCAvIDIgLSBhY3Rpb25zLm9mZnNldFdpZHRoIC8gMikgKyAncHgnXG4gICAgYWN0aW9ucy5zdHlsZS50b3AgPSAoY29udGFpbmVyLm9mZnNldEhlaWdodCAvIDIgLSBhY3Rpb25zLm9mZnNldEhlaWdodCAvIDIpICsgJ3B4J1xuICB9XG5cbiAgYXBwZW5kVG8gKGVsZW06IEhUTUxFbGVtZW50KSB7XG4gICAgZWxlbS5hcHBlbmRDaGlsZCh0aGlzLm91dGVyQm94KVxuICAgIHRoaXMuX2luaXRTbGlkZXIoKSAvLyBoYXMgdG8gYmUgaW4gZG9jdW1lbnQncyBET00gdG8gd29yayBwcm9wZXJseVxuICB9XG5cbiAgYXBwZW5kQmVmb3JlIChwYXJlbnQ6IEhUTUxFbGVtZW50LCBlbGVtOiBIVE1MRWxlbWVudCkge1xuICAgIHBhcmVudC5pbnNlcnRCZWZvcmUodGhpcy5vdXRlckJveCwgZWxlbSlcbiAgICB0aGlzLl9pbml0U2xpZGVyKCkgLy8gaGFzIHRvIGJlIGluIGRvY3VtZW50J3MgRE9NIHRvIHdvcmsgcHJvcGVybHlcbiAgfVxufVxuXG5mdW5jdGlvbiBxdWVzdGlvbkxldHRlciAoaTogbnVtYmVyKSB7XG4gIC8vIHJldHVybiBhIHF1ZXN0aW9uIG51bWJlci4gZS5nLiBxTnVtYmVyKDApPVwiYVwiLlxuICAvLyBBZnRlciBsZXR0ZXJzLCB3ZSBnZXQgb24gdG8gZ3JlZWtcbiAgY29uc3QgbGV0dGVyID1cbiAgICAgICAgaSA8IDI2ID8gU3RyaW5nLmZyb21DaGFyQ29kZSgweDYxICsgaSlcbiAgICAgICAgICA6IGkgPCA1MiA/IFN0cmluZy5mcm9tQ2hhckNvZGUoMHg0MSArIGkgLSAyNilcbiAgICAgICAgICAgIDogU3RyaW5nLmZyb21DaGFyQ29kZSgweDNCMSArIGkgLSA1MilcbiAgcmV0dXJuIGxldHRlclxufVxuXG5mdW5jdGlvbiBoaWRlQWxsQWN0aW9ucyAoKSB7XG4gIC8vIGhpZGUgYWxsIHF1ZXN0aW9uIGFjdGlvbnNcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnF1ZXN0aW9uLWFjdGlvbnMnKS5mb3JFYWNoKGVsID0+IHtcbiAgICBlbC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuICB9KVxuICBjb25zdCBvdmVybGF5ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm92ZXJsYXknKVxuICBpZiAob3ZlcmxheSAhPT0gbnVsbCkgeyBvdmVybGF5LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpIH0gZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBmaW5kIG92ZXJsYXkgd2hlbiBoaWRpbmcgYWN0aW9ucycpXG59XG4iLCJpbXBvcnQgUXVlc3Rpb25TZXQgZnJvbSAnUXVlc3Rpb25TZXQnXG5cbi8vIFRPRE86XG4vLyAgLSBJbXBvcnQgZXhpc3RpbmcgcXVlc3Rpb24gdHlwZXMgKEcgLSBncmFwaGljLCBUIC0gdGV4dFxuLy8gICAgLSBHIGFyZWFcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsICgpID0+IHtcbiAgY29uc3QgcXMgPSBuZXcgUXVlc3Rpb25TZXQoKVxuICBxcy5hcHBlbmRUbyhkb2N1bWVudC5ib2R5KVxuICBxcy5jaG9vc2VUb3BpY3MoKVxufSlcbiJdLCJuYW1lcyI6WyJGcmFjdGlvbiIsImZyYWN0aW9uIiwiVEQuZ2V0VHJpYW5nbGUiLCJ0aGlzIiwiUlNsaWRlciIsIlRvcGljQ2hvb3Nlci5nZXRUb3BpY3MiLCJUTW9kYWwiLCJUb3BpY0Nob29zZXIuaGFzT3B0aW9ucyIsIlRvcGljQ2hvb3Nlci5uZXdPcHRpb25zU2V0IiwiVG9waWNDaG9vc2VyLmdldFRpdGxlIiwiVG9waWNDaG9vc2VyLmdldENvbW1hbmRXb3JkIiwiVG9waWNDaG9vc2VyLm5ld1F1ZXN0aW9uIl0sIm1hcHBpbmdzIjoiOzs7RUFBQTtFQUNBO0VBQ0E7QUFDQTtFQUNBLElBQUksRUFBRSxHQUFHLFVBQVUsSUFBSSxFQUFFO0VBQ3pCLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFJO0VBQ25CLEVBQUUsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFJO0VBQzFCLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFJO0VBQ3BCLEVBQUUsSUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFDO0VBQ3RCLEVBQUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFDO0VBQ3JCLEVBQUUsSUFBSSxDQUFDLFlBQVksR0FBRyxFQUFDO0VBQ3ZCLEVBQUUsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFJO0VBQ3RCLEVBQUUsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFJO0VBQ3RCLEVBQUUsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFJO0VBQzNCLEVBQUUsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFJO0VBQ3RCLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFJO0VBQ25CLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFDO0VBQ2YsRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUk7RUFDbEIsRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUk7RUFDbEIsRUFBRSxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUk7RUFDckIsRUFBRSxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQUs7QUFDdkI7RUFDQSxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUc7RUFDaEIsSUFBSSxLQUFLLEVBQUUsSUFBSTtFQUNmLElBQUksR0FBRyxFQUFFLElBQUk7RUFDYixJQUFHO0VBQ0gsRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHO0VBQ2QsSUFBSSxNQUFNLEVBQUUsSUFBSTtFQUNoQixJQUFJLE1BQU0sRUFBRSxJQUFJO0VBQ2hCLElBQUksR0FBRyxFQUFFLElBQUk7RUFDYixJQUFJLEtBQUssRUFBRSxLQUFLO0VBQ2hCLElBQUksS0FBSyxFQUFFLElBQUk7RUFDZixJQUFJLEtBQUssRUFBRSxJQUFJO0VBQ2YsSUFBSSxNQUFNLEVBQUUsSUFBSTtFQUNoQixJQUFJLE9BQU8sRUFBRSxJQUFJO0VBQ2pCLElBQUksSUFBSSxFQUFFLElBQUk7RUFDZCxJQUFJLFFBQVEsRUFBRSxLQUFLO0VBQ25CLElBQUksUUFBUSxFQUFFLElBQUk7RUFDbEIsSUFBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLENBQUMsR0FBRyxHQUFHO0VBQ2IsSUFBSSxTQUFTLEVBQUUsY0FBYztFQUM3QixJQUFJLFVBQVUsRUFBRSxPQUFPO0VBQ3ZCLElBQUksUUFBUSxFQUFFLGFBQWE7RUFDM0IsSUFBSSxPQUFPLEVBQUUsWUFBWTtFQUN6QixJQUFJLEtBQUssRUFBRSxVQUFVO0VBQ3JCLElBQUksT0FBTyxFQUFFLFlBQVk7RUFDekIsSUFBSSxHQUFHLEVBQUUsWUFBWTtFQUNyQixJQUFHO0FBQ0g7RUFDQSxFQUFFLEtBQUssSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUMsRUFBRTtBQUN4RztFQUNBLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRTtFQUNiLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFHLFlBQVk7RUFDaEMsRUFBRSxJQUFJLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssUUFBUSxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFNO0VBQ3pFLE9BQU8sSUFBSSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUM7QUFDOUU7RUFDQSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsQ0FBQztBQUN0RTtFQUNBLEVBQUUsSUFBSSxDQUFDLFlBQVksR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLFFBQU87RUFDaEUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsT0FBTTtFQUNuQyxFQUFFLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sWUFBWSxLQUFLLEVBQUM7QUFDdEQ7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtFQUNyQixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsRUFBRTtFQUMvTCxHQUFHO0VBQ0gsRUFBRSxPQUFPLElBQUksQ0FBQyxZQUFZLEVBQUU7RUFDNUIsRUFBQztBQUNEO0VBQ0EsRUFBRSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsWUFBWTtFQUN4QyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBQztFQUN4RCxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLDRCQUEyQjtFQUNyRCxFQUFFLElBQUksQ0FBQyxRQUFRLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBQztFQUN6RCxFQUFFLElBQUksQ0FBQyxRQUFRLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsRUFBQztFQUN6RSxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBQztBQUNuRDtFQUNBLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtFQUN6QixJQUFJLElBQUksQ0FBQyxJQUFJLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztFQUNsRCxJQUFJLElBQUksQ0FBQyxJQUFJLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztFQUNsRCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUM7RUFDeEMsR0FBRztFQUNILEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBQztFQUN4QyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUM7RUFDckMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFDO0FBQ3hDO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO0VBQ3ZCLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxhQUFhLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxFQUFDO0VBQzVFLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDO0VBQy9ELElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBQztFQUMxQyxHQUFHO0FBQ0g7RUFDQSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFDO0FBQ3pFO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxLQUFJO0VBQ2pGLEVBQUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLHFCQUFxQixFQUFFLENBQUMsS0FBSTtFQUM1RCxFQUFFLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFXO0VBQzVDLEVBQUUsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVc7QUFDL0M7RUFDQSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUM7QUFDbkU7RUFDQSxFQUFFLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixFQUFFO0VBQ2hDLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEdBQUcsWUFBWTtFQUM1QyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUM7QUFDbkM7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDO0FBQ3JFO0VBQ0EsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxFQUFDO0VBQ3ZCLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxFQUFDO0FBQ3JFO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQ3hFLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFHO0FBQzVCO0VBQ0EsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO0VBQ3pCLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQztFQUMzRCxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFJO0VBQ25GLEtBQUssTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQzlELEdBQUc7RUFDSCxFQUFFLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRTtFQUMzQixFQUFDO0FBQ0Q7RUFDQSxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBRyxVQUFVLE1BQU0sRUFBRTtFQUM3QyxFQUFFLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFDO0FBQzlEO0VBQ0EsRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDakUsSUFBSSxJQUFJLElBQUksR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFDO0VBQ3BDLElBQUksSUFBSSxHQUFHLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBQztBQUNsQztFQUNBLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUM7RUFDekIsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUM7QUFDaEM7RUFDQSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUk7QUFDNUQ7RUFDQSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtFQUMzQixNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQztFQUN4RSxLQUFLLE1BQU0sR0FBRyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUM7QUFDOUM7RUFDQSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSTtFQUM1RCxHQUFHO0VBQ0gsRUFBRSxPQUFPLElBQUksQ0FBQyxTQUFT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LENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBRyxFQUFFO0FBQ3JHO0VBQ0EsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFJO0FBQ3RHO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO0VBQ3ZCLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtFQUMzQixNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFDO0VBQy9ELE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDN0QsS0FBSztFQUNMLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDcEcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSTtFQUM3RixHQUFHLE1BQU07RUFDVCxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQyxFQUFFO0VBQ3RGLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDeEQsR0FBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUM7RUFDbEcsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxFQUFDO0FBQ2xEO0VBQ0EsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUk7RUFDdEYsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFJO0FBQ2pFO0VBQ0EsRUFBRSxPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDeEIsRUFBQztBQUNEO0VBQ0EsRUFBRSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDLEVBQUU7RUFDekMsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU07QUFDaEM7RUFDQSxFQUFFLElB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LElBQUksQ0FBRSxHQUFHLE1BQWdCO1VBQzlCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtVQUN6RCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7VUFDekQsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQTtVQUV2QixPQUFPLElBQUksS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFBO09BQ3JDO01BRUQsT0FBTyxRQUFRLENBQUUsQ0FBUSxFQUFFLENBQVEsRUFBRSxDQUFROztVQUUzQyxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtVQUM5QixNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtVQUM5QixNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtVQUU5QixNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtVQUMzQixNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtVQUN4QyxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtVQUV4QyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksR0FBRyxTQUFTLEVBQUUsSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFBO09BQ3JEO01BRUQsT0FBTyxHQUFHLENBQUUsTUFBZ0I7VUFDMUIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1VBQ2hFLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtVQUNoRSxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtPQUM3QjtNQUVELE9BQU8sR0FBRyxDQUFFLE1BQWU7VUFDekIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7VUFDakUsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7VUFDakUsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7T0FDN0I7TUFFRCxPQUFPLE1BQU0sQ0FBRSxNQUFlO1VBQzVCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtVQUNoRSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7VUFDaEUsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7VUFDakUsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7VUFDakUsT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQTtPQUN2RDs7Ozs7O01BT0QsT0FBTyxVQUFVLENBQUUsRUFBVSxFQUFFLEVBQVU7VUFDdkMsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1VBQ3hCLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtVQUN4QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtVQUNyQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksR0FBRyxNQUFNLEVBQUUsQ0FBQyxFQUFFLElBQUksR0FBRyxNQUFNLEVBQUUsQ0FBQTtPQUM5QztNQUVELE9BQU8sUUFBUSxDQUFFLEVBQVMsRUFBRSxFQUFTO1VBQ25DLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FDNUM7Ozs7Ozs7OztNQVVELE9BQU8sU0FBUyxDQUFFLEVBQVMsRUFBRSxFQUFTO1VBQ3BDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1VBQ2xELE9BQU8sS0FBSyxJQUFJLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsS0FBSyxDQUFBO09BQ2hEOzs7Ozs7Ozs7TUFVRCxPQUFPLEtBQUssQ0FBRSxFQUFTLEVBQUUsRUFBUyxFQUFFLE9BQWUsRUFBRSxRQUFnQjtVQUNuRSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtVQUM5QyxJQUFJLENBQUMsSUFBSSxPQUFPO2NBQUUsT0FBTyxLQUFLLENBQUE7VUFFOUIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtVQUM1QixFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1VBQ3JCLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDckIsT0FBTyxJQUFJLENBQUE7T0FDWjs7Ozs7Ozs7OztNQVdELE9BQU8sVUFBVSxDQUFFLE1BQWUsRUFBRSxLQUFhLEVBQUUsTUFBYyxFQUFFLE1BQU0sR0FBRyxDQUFDLEVBQUUsU0FBMkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1VBQzlHLElBQUksT0FBTyxHQUFXLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7VUFDdkMsSUFBSSxXQUFXLEdBQVcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtVQUMzQyxNQUFNLFVBQVUsR0FBWSxXQUFXLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUE7VUFDckQsTUFBTSxXQUFXLEdBQVksV0FBVyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFBO1VBQ3RELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxJQUFJLFVBQVUsRUFBRSxDQUFDLE1BQU0sR0FBRyxNQUFNLElBQUksV0FBVyxDQUFDLENBQUE7VUFDbkYsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQSxFQUFFLENBQUMsQ0FBQTs7VUFHdEMsT0FBTyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7VUFDM0IsV0FBVyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7VUFDL0IsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUE7VUFDcEUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUEsRUFBRSxDQUFDLENBQUE7VUFFbkYsT0FBTyxFQUFFLENBQUE7T0FDVjs7O0VD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Q0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBQztFQUMvQyxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBQztFQUMvQyxFQUFFLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBQztBQUNyQztFQUNBLEVBQUUsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFDO0VBQzFELEVBQUUsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFDO0FBQzFEO0VBQ0EsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFDO0VBQ1gsRUFBRSxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRTtFQUN2QyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDO0VBQzlDLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQztFQUM1QyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSTtFQUNuQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSTtFQUNsQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLE9BQU07RUFDbEMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUk7RUFDbkMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FB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QUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDN0MsTUFBTSxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQzdCLE1BQU07RUFDTixNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxLQUFLO0FBQ0w7RUFDQTtFQUNBLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDMUIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osS0FBSztBQUNMO0VBQ0EsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDM0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxD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SSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtFQUNwSCxjQUFjLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQ2xDLGNBQWMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztFQUM1QyxjQUFjLENBQUMsRUFBRSxDQUFDO0VBQ2xCLGFBQWE7QUFDYjtFQUNBO0VBQ0EsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtFQUN0RixjQUFjLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUN0QyxjQUFjLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUNwRCxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDckIsYUFBYTtBQUNiO0VBQ0EsV0FBVyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7RUFDM0QsWUFBWSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNoQyxZQUFZLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FB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LE9BQU87QUFDUDtFQUNBLE1BQU0sS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDNUMsUUFBUSxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDNUMsUUFBUSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsR0FBRyxFQUFFO0VBQ2hFLFVBQVUsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDdkMsU0FBUztFQUNULE9BQU87RUFDUCxNQUFNLE9BQU8sSUFBSSxDQUFDO0VBQ2xCLEtBQUs7QUFDTDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxJQUFJLFdBQVcsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDaEM7RUFDQSxNQUFNLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDbEIsTUFBTSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDdkYsS0FBSztBQUNMO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksU0FBUyxFQUFFLFdBQVc7QUFDMUI7RUFDQSxNQUFNLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMs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RTtFQUNwQyxJQUFJLElBQUksUUFBUSxHQUFHLEdBQUU7RUFDckIsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUMzQyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUTtFQUM3QixNQUFNLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUM7RUFDNUIsTUFBTSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDakQsUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVE7RUFDL0IsUUFBUSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDckMsVUFBVSxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDekMsVUFBVSxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSTtFQUN6QixTQUFTO0VBQ1QsT0FBTztFQUNQLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUM7RUFDNUIsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSTtFQUNyQixLQUFLO0VBQ0wsSUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUM7RUFDOUMsSUFBSSxPQUFPLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQztFQUNuQyxHQUFHO0FBQ0g7RUFDQSxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7RUFDdkIsSUFBSSxJQUFJLEVBQUUsSUFBSSxZQUFZLFVBQVUsQ0FBQyxFQUFFO0VBQ3ZDLE1B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QUUsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBQztFQUNsRCxRQUFRLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBQztFQUN0RCxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3pDLFVBQVUsTUFBTSxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDbEQsVUFBVSxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDeEQsVUFBVSxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDeEQsVUFBVSxJQUFJLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBRztFQUM3QyxVQUFVLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDM0IsWUFBWSxNQUFNLEVBQUUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQ3BELFlBQVksTUFBTSxHQUFHLEdBQUcsR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQzFELFlBQVksTUFBTSxHQUFHLEdBQUcsR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQzFELFlBQVksSUFBSSxJQUFJLEdBQUcsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBRztFQUNsRCxXQUFXO0VBQ1gsVUFBVSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMs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Q0E7RUFDQSxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxNQUFNLElBQUksSUFBRyxFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsTUFBTSxJQUFJLEtBQUksRUFBRSxNQUFNLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxNQUFNLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFHLEVBQUU7QUFDcEk7RUFDQTtFQUNBLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxNQUFLLEVBQUUsTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxJQUFJLE1BQUssRUFBRTtBQUNoSDtFQUNBO0VBQ0EsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxJQUFJLElBQUksQ0FBQyxFQUFDLEVBQUUsTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsTUFBTSxJQUFJLElBQUksQ0FBQyxFQUFDLEVBQUUsTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxFQUFFO0FBQ3RKO0VBQ0EsSUFBSSxPQUFPLE1BQU07RUFDakIsR0FBRztBQUNIO0VBQ0EsRUFBRSxTQUFTLENBQUMsR0FBRztFQUNmO0VBQ0EsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFB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LEVBQUU7RUFDOUIsS0FBSyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUNoQyxLQUFLLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDO0FBQ3BDO0VBQ0EsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBQztFQUMxQixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFDO0VBQzFCLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUM7RUFDcEMsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBQztFQUMxQixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFDO0VBQ3BDLENBQUM7QUFDRDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDTyxTQUFTLGNBQWMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFO0VBQ3BELEVBQUUsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3ZDLEVBQUUsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3ZDLEVBQUUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBQztFQUNwRSxFQUFFLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLEVBQUM7RUFDdkUsRUFBRSxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFDO0VBQ3BFLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUM7RUFDNUIsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBQztFQUM1QixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFDO0VBQzVCLENBQUM7QUFDRDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNPLFNBQVMsWUFBWSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFO0VBQ3RFLEVBQUUsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3JDLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFJO0VBQ2hCLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFJO0VBQ2hCLEVBQUUsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFFO0FBQzFDO0VBQ0EsRUFBRSxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENB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QTtVQUM5QixHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDOUIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1VBQzlCLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtVQUM5QixHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDOUIsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFBO1VBQ1osR0FBRyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7VUFDaEMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFBO1VBQ1YsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFBOztVQUdmLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQ25CLEVBQUUsRUFDRixJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDN0UsQ0FBQTtVQUNELEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtVQUNmLGNBQWMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7VUFDakQsY0FBYyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FB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SSxDQUFDLENBQUMsVUFBVSxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtFQUNoSCxJQUFJLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLFVBQVUsT0FBTyxFQUFFLE1BQU0sRUFBRTtFQUMvRCxRQUFRLFNBQVMsU0FBUyxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7RUFDbkcsUUFBUSxTQUFTLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7RUFDdEcsUUFBUSxTQUFTLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUU7RUFDdEgsUUFBUSxJQUFJLENBQUMsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsVUFBVSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7RUFDOUUsS0FBSyxDQUFDLENBQUM7RUFDUDs7RUN6RUEsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFBO0VBd0J6QixNQUFNLFdBQVcsR0FBbUM7TUFDbEQsR0FBRyxFQUFFO1VBQ0gsTUFBTSxFQUFFLEdBQUc7VUFDWCxJ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QyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7a0JBQUUsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUE7ZUFBRTs7Y0FHckQsSUFBSSxDQUFDLFFBQVEsU0FBRyxJQUFJLENBQUMsUUFBUSxtQ0FBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQzNEO2NBQUEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFTLENBQUMsQ0FBQyxDQUFBO2NBQzNFLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFBOzs7Y0FJekYsTUFBTSxLQUFLLEdBQTZCO2tCQUN0QyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztrQkFDaEMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7a0JBQ2pDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO2VBQ2xDLENBQUE7OztjQUlELElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFF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SUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksRUFBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLHVVQUF1VSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsR0FBRyxVQUFVLEdBQUcsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFNLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFJLFVBQVUsRUFBRSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU0sUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGtDQUFrQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHlEQUF5RCxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsT0FBTyxNQUFNLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFH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
