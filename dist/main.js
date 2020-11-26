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
   * Approximates a guassian distribution by finding the mean of n uniform distributions
   * @param {number} n Number of times to roll the 'dice' - higher is closer to gaussian
   * @returns {number} A number between 0 and 1
   */
  function gaussian(n) {
      let rnum = 0;
      for (let i = 0; i < n; i++) {
          rnum += Math.random();
      }
      return rnum / n;
  }
  /**
   * Approximates a gaussian distribution by finding the mean of n uniform distributions
   * Returns a functio
   * @param {number} n Number of uniform distributions to average
   * @returns {()=>number} A function which returns a random number
   */
  function gaussianCurry(n) {
      return () => gaussian(n);
  }
  /**
   * return a random integer between n and m inclusive
   * dist (optional) is a function returning a value in [0,1)
   * @param {number} n The minimum value
   * @param {number} m The maximum value
   * @param {()=>number} [dist] A distribution returning a number from 0 to 1
   */
  function randBetween(n, m, dist) {
      if (!dist)
          dist = Math.random;
      n = Math.ceil(n);
      m = Math.floor(m);
      return n + Math.floor(dist() * (m - n + 1));
  }
  function randBetweenFilter(n, m, filter) {
      /* returns a random integer between n and m inclusive which satisfies the filter
      /  n, m: integer
      /  filter: Int-> Bool
      */
      const arr = [];
      for (let i = n; i < m + 1; i++) {
          if (filter(i))
              arr.push(i);
      }
      if (arr === [])
          throw new Error('overfiltered');
      const i = randBetween(0, arr.length - 1);
      return arr[i];
  }
  /**
   * Returns a multiple of n between min and max
   * @param {number} min Minimum value
   * @param {number} max Maximum value
   * @param {number} n Choose a multiple of this value
   * @returns {number} A multipleof n between min and max
   */
  function randMultBetween(min, max, n) {
      // return a random multiple of n between n and m (inclusive if possible)
      min = Math.ceil(min / n) * n;
      max = Math.floor(max / n) * n; // could check divisibility first to maximise performace, but I'm sure the hit isn't bad
      return randBetween(min / n, max / n) * n;
  }
  /**
   * Returns a random element of an array
   * @template T
   * @param {T[]} array An array of objects
   * @param {()=>number} [dist] A distribution function for weighting, returning a number between 0 and 1. Default is Math.random
   * @returns {T}
   */
  function randElem(array, dist) {
      if ([...array].length === 0)
          throw new Error('empty array');
      if (!dist)
          dist = Math.random;
      const n = array.length;
      const i = randBetween(0, n - 1, dist);
      return [...array][i];
  }
  /**
   * Randomly partitions a total into n amounts
   * @param total The total amount to partition
   * @param n How many parts to partition into
   * @param minProportion The smallest proportion of a whole for a partion
   * @param minValue The smallest value for a partition. Overrides minProportion
   * @returns An array of n numbers which sum to total
   */
  function randPartition({ total, n, minProportion, minValue, integer = true }) {
      minValue = minValue !== null && minValue !== void 0 ? minValue : (minProportion !== undefined ? total * minProportion : 0); // why does typescript require ! here? 
      const partitions = [];
      let left = total;
      for (let i = 0; i < n - 1; i++) {
          const maxValue = left - minValue * (n - i - 1);
          const nextValue = integer ? randBetween(minValue, maxValue) : minValue + Math.random() * (maxValue - minValue);
          left -= nextValue;
          partitions.push(nextValue);
      }
      partitions[n - 1] = left;
      return partitions;
  }
  /**
   * Finds a random pythaogrean triple with maximum hypotenuse lengt
   * @param {number} max The maximum length of the hypotenuse
   * @returns {{a: number, b: number, c: number}} Three values such that a^2+b^2=c^2
   */
  function randPythagTriple(max) {
      const n = randBetween(2, Math.ceil(Math.sqrt(max)) - 1);
      const m = randBetween(1, Math.min(n - 1, Math.floor(Math.sqrt(max - n * n))));
      return { a: n * n - m * m, b: 2 * n * m, c: n * n + m * m };
  }
  /**
   * Random pythagorean triple with a given leg
   * @param {number} a The length of the first leg
   * @param {number} max The maximum length of the hypotenuse
   * @returns {{a: number, b: number, c:number}} Three values such that a^2+b^2 = c^2 and a is the first input parameter
   */
  function randPythagTripleWithLeg(a, max) {
      /* Random pythagorean triple with a given leg
       * That leg is the first one */
      if (max === undefined)
          max = 500;
      if (a % 2 === 1) { //odd: a = n^2-m^2
          return randPythagnn_mm(a, max);
      }
      else { //even: try a = 2mn, but if that fails, try a=n^2-m^2
          let triple;
          let f1, f2;
          if (Math.random() < 0.5) {
              f1 = randPythag2mn, f2 = randPythagnn_mm;
          }
          else {
              f2 = randPythag2mn, f1 = randPythagnn_mm;
          }
          try {
              triple = f1(a, max);
          }
          catch (err) {
              triple = f2(a, max);
          }
          return triple;
      }
  }
  function randPythag2mn(a, max) {
      // assumes a is 2mn, finds appropriate parameters
      // let m,n be a factor pair of a/2
      let factors = []; //factors of n
      const maxm = Math.sqrt(a / 2);
      for (let m = 1; m < maxm; m++) {
          if ((a / 2) % m === 0 && m * m + (a * a) / (4 * m * m) <= max) {
              factors.push(m);
          }
      }
      if (factors.length === 0)
          throw "2mn no options";
      let m = randElem(factors);
      let n = a / (2 * m);
      return { a: 2 * n * m, b: Math.abs(n * n - m * m), c: n * n + m * m };
  }
  function randPythagnn_mm(a, max) {
      // assumes a = n^2-m^2
      // m=sqrt(a+n^2)
      // cycle through 1≤m≤sqrt((max-a)/2)
      let possibles = [];
      const maxm = Math.sqrt((max - a) / 2);
      for (let m = 1; m <= maxm; m++) {
          let n = Math.sqrt(a + m * m);
          if (n === Math.floor(n))
              possibles.push([n, m]);
      }
      if (possibles.length === 0)
          throw "n^2-m^2 no options";
      let [n, m] = randElem(possibles);
      return { a: n * n - m * m, b: 2 * n * m, c: n * n + m * m };
  }
  /**
   * Rounds a number to a given number of decimal places
   * @param {number} x The number to round
   * @param {number} n The number of decimal places
   * @returns {number}
   */
  function roundDP(x, n) {
      return Math.round(x * Math.pow(10, n)) / Math.pow(10, n);
  }
  function sinDeg(x) {
      return Math.sin(x * Math.PI / 180);
  }
  /**
   * Returns a string representing n/10^dp
   * E.g. scaledStr(314,2) = "3.14"
   * @param {number} n An integer representing the digits of a fixed point number
   * @param {number} dp An integer for number of decimal places
   * @returns {string}
   */
  function scaledStr(n, dp) {
      if (dp === 0)
          return n.toString();
      const factor = Math.pow(10, dp);
      const intpart = Math.floor(n / factor);
      const decpart = n % factor;
      if (decpart === 0) {
          return intpart.toString();
      }
      else {
          return intpart + '.' + decpart;
      }
  }
  function gcd(a, b) {
      // taken from fraction.js
      if (!a) {
          return b;
      }
      if (!b) {
          return a;
      }
      while (1) {
          a %= b;
          if (!a) {
              return b;
          }
          b %= a;
          if (!b) {
              return a;
          }
      }
      return 0; // unreachable, and mathematically guaranteed not to happen, but makes typescript queit
  }
  function shuffle(array) {
      // Knuth-Fisher-Yates
      // from https://stackoverflow.com/a/2450976/3737295
      // nb. shuffles in place
      var currentIndex = array.length;
      var temporaryValue;
      var randomIndex;
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
      return array;
  }
  /**
   * Returns true if a is an array containing e, false otherwise (including if a is not an array)
   * @param {*} a  An array
   * @param {*} e An element to check if is in the array
   * @returns {boolean}
   */
  function weakIncludes(a, e) {
      return (Array.isArray(a) && a.includes(e));
  }
  function firstUniqueIndex(array) {
      // returns index of first unique element
      // if none, returns length of array
      let i = 0;
      while (i < array.length) {
          if (array.indexOf(array[i]) === array.lastIndexOf(array[i])) {
              break;
          }
          i++;
      }
      return i;
  }
  function boolObjectToArray(obj) {
      // Given an object where all values are boolean, return keys where the value is true
      const result = [];
      for (const key in obj) {
          if (obj[key])
              result.push(key);
      }
      return result;
  }
  /* DOM manipulation and querying */
  /**
   * Creates a new HTML element, sets classes and appends
   * @param {string} tagName Tag name of element
   * @param {string|undefined} [className] A class or classes to assign to the element
   * @param {HTMLElement} [parent] A parent element to append the element to
   * @returns {HTMLElement}
   */
  function createElem(tagName, className, parent) {
      // create, set class and append in one
      const elem = document.createElement(tagName);
      if (className)
          elem.className = className;
      if (parent)
          parent.appendChild(elem);
      return elem;
  }
  function hasAncestorClass(elem, className) {
      // check if an element elem or any of its ancestors has clss
      let result = false;
      for (; elem && elem.parentNode; elem = elem.parentElement) { // traverse DOM upwards
          if (elem.classList.contains(className)) {
              result = true;
          }
      }
      return result;
  }
  /**
   * Determines if two elements overlap
   * @param {HTMLElement} elem1 An HTML element
   * @param {HTMLElement} elem2 An HTML element
   */
  function overlap(elem1, elem2) {
      const rect1 = elem1.getBoundingClientRect();
      const rect2 = elem2.getBoundingClientRect();
      return !(rect1.right < rect2.left ||
          rect1.left > rect2.right ||
          rect1.bottom < rect2.top ||
          rect1.top > rect2.bottom);
  }
  /**
   * If elem1 and elem2 overlap, move them apart until they don't.
   * Only works for those with position:absolute
   * This strips transformations, which may be a problem
   * Elements with class 'repel-locked' will not be moved
   * @param {HTMLElement} elem1 An HTML element
   * @param {HTMLElement} elem2 An HTML element
   */
  function repelElements(elem1, elem2) {
      if (!overlap(elem1, elem2))
          return;
      if (getComputedStyle(elem1).position !== "absolute" || getComputedStyle(elem2).position !== 'absolute')
          throw new Error('Only call on position:absolute');
      let tl1 = Point.fromElement(elem1);
      let tl2 = Point.fromElement(elem2);
      const c1 = Point.fromElement(elem1, "center");
      const c2 = Point.fromElement(elem2, "center");
      const vec = Point.unitVector(c1, c2);
      const locked1 = elem1.classList.contains('repel-locked');
      const locked2 = elem2.classList.contains('repel-locked');
      let i = 0;
      while (overlap(elem1, elem2) && i < 500) {
          if (!locked1)
              tl1.translate(-vec.x, -vec.y);
          if (!locked2)
              tl2.translate(vec.x, vec.y);
          elem1.style.left = tl1.x + "px";
          elem1.style.top = tl1.y + "px";
          elem1.style.transform = "none";
          elem2.style.left = tl2.x + "px";
          elem2.style.top = tl2.y + "px";
          elem2.style.transform = "none";
          i++;
      }
      if (i === 500)
          throw new Error('Too much moving');
      console.log(`Repelled with ${i} iterations`);
  }
  /* Canvas drawing */
  function dashedLine(ctx, x1, y1, x2, y2) {
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
          /*
          const angles: number[] = []
          let left = angleSum
          for (let i = 0; i < n - 1; i++) {
            const maxAngle = left - minAngle * (n - i - 1)
            const nextAngle = randBetween(minAngle, maxAngle)
            left -= nextAngle
            angles.push(nextAngle)
          }
          angles[n - 1] = left
          */
          const angles = randPartition({ total: angleSum, n: n, minValue: minAngle });
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
          const view = new MissingAnglesAroundAlgebraView(data, viewOptions);
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

  class ParallelogramAreaData {
      constructor(base, height, side, showOpposites, dp, denominator, areaProperties, perimeterProperties) {
          this.denominator = 1;
          this.base = base;
          this.height = height;
          this.side = side;
          this.showOpposites = showOpposites;
          this.dp = dp;
          this.denominator = denominator;
          this._area = areaProperties;
          this._perimeter = perimeterProperties;
      }
      static random(options) {
          const maxLength = options.maxLength;
          const dp = options.dp;
          const denominator = options.fraction ? randBetween(2, 6) : 1;
          // basic values
          const base = {
              val: randBetween(1, maxLength),
              show: true,
              missing: false
          };
          const height = {
              val: randBetween(Math.ceil(base.val / 8), 2 * base.val + Math.ceil(base.val / 8), gaussianCurry(2)),
              show: true,
              missing: false
          };
          const side = {
              val: randBetween(height.val + 1, height.val * 3, () => Math.pow((Math.random()), 2)),
              show: true,
              missing: false
          };
          const areaProperties = {
              show: false,
              missing: false
          };
          const perimeterProperties = {
              show: false,
              missing: false
          };
          // Labels
          if (denominator > 1) {
              [base, height, side].forEach(v => {
                  v.label = new fraction$1(v.val, denominator).toLatex(true) + "\\mathrm{cm}";
              });
          }
          else {
              [base, height, side].forEach(v => {
                  v.label = scaledStr(v.val, dp) + "\\mathrm{cm}";
              });
          }
          // adjust for question type
          let showOpposites = false;
          switch (options.questionType) {
              case 'area':
                  areaProperties.show = true;
                  areaProperties.missing = true;
                  side.show = !options.noDistractors;
                  break;
              case 'perimeter':
                  perimeterProperties.show = true;
                  perimeterProperties.missing = true;
                  showOpposites = options.noDistractors;
                  height.show = !options.noDistractors;
                  break;
              case 'reverseArea':
                  areaProperties.show = true;
                  areaProperties.missing = false;
                  randElem([base, height]).missing = true;
                  break;
              case 'reversePerimeter':
              default:
                  perimeterProperties.show = true;
                  perimeterProperties.missing = false;
                  randElem([base, side]).missing = true;
                  break;
          }
          return new ParallelogramAreaData(base, height, side, showOpposites, dp, denominator, areaProperties, perimeterProperties);
      }
      get perimeter() {
          if (!this._perimeter) {
              this._perimeter = {
                  show: false,
                  missing: true
              };
          }
          if (!this._perimeter.val) {
              this._perimeter.val = 2 * (this.base.val + this.side.val);
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

  class ParallelogramAreaView extends GraphicQView {
      constructor(A, B, C, D, ht1, ht2, labels, data, viewOptions) {
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
          this.ht1 = ht1;
          this.ht2 = ht2;
          this.labels = labels;
      }
      static fromData(data, viewOptions) {
          var _a, _b, _c, _d, _e, _f;
          viewOptions = viewOptions !== null && viewOptions !== void 0 ? viewOptions : {};
          viewOptions.width = (_a = viewOptions.width) !== null && _a !== void 0 ? _a : 300;
          viewOptions.height = (_b = viewOptions.height) !== null && _b !== void 0 ? _b : 300;
          const width = viewOptions.width;
          const height = viewOptions.height;
          //useful shorthands:
          const s = data.side.val;
          const b = data.base.val;
          const h = data.height.val;
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
          const A = new Point(0, 0);
          const B = new Point(Math.sqrt(s * s - h * h), h);
          const C = B.clone().translate(b, 0);
          const D = new Point(b, 0);
          // points to draw height line on
          const ht1 = C.clone();
          const ht2 = C.clone().translate(0, -h);
          // shift them away a little bit
          ht1.moveToward(B, -b / 10);
          ht2.moveToward(A, -b / 10);
          // rotate
          const rotation = (_c = viewOptions === null || viewOptions === void 0 ? void 0 : viewOptions.rotation) !== null && _c !== void 0 ? _c : Math.random() * 2 * Math.PI;
          [A, B, C, D, ht1, ht2].forEach(pt => { pt.rotate(rotation); });
          // Scale and centre
          Point.scaleToFit([A, B, C, D, ht1, ht2], width, height, 100, [0, 20]);
          // labels
          const labels = [];
          const sides = [
              [A, B, data.side],
              [D, A, data.base],
              [ht1, ht2, data.height]
          ];
          if (data.showOpposites) {
              sides.push([B, C, data.base]);
              sides.push([C, D, data.side]);
          }
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
                  texta: `\\text{Area} = ${texta}`,
                  textq: `\\text{Area} = ${textq}`,
                  text: `\\text{Area} = ${textq}`,
                  styleq: styleq,
                  stylea: stylea,
                  style: styleq,
                  pos: new Point(10, height - 10 - 15 * n_info),
              });
              n_info++;
          }
          if (data.perimeter.show) {
              const texta = (_f = data.perimeter.label) !== null && _f !== void 0 ? _f : data.perimeter.val.toString();
              const textq = data.perimeter.missing ? "?" : texta;
              const styleq = "extra-info";
              const stylea = data.perimeter.missing ? "extra-answer" : "extra-info";
              labels.push({
                  pos: new Point(10, height - 10 - 20 * n_info),
                  texta: `\\text{Perimeter} = ${texta}`,
                  textq: `\\text{Perimeter} = ${textq}`,
                  text: `\\text{Perimeter} = ${textq}`,
                  styleq: styleq,
                  stylea: stylea,
                  style: styleq,
              });
          }
          return new ParallelogramAreaView(A, B, C, D, ht1, ht2, labels, data, viewOptions);
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
          parallelSign(ctx, this.A, this.B, 5);
          parallelSign(ctx, this.D, this.C, 5);
          parallelSign(ctx, this.B, this.C, 5, 2);
          parallelSign(ctx, this.A, this.D, 5, 2);
          ctx.stroke();
          ctx.closePath();
          // draw height
          if (this.data.height.show) {
              ctx.beginPath();
              arrowLine(ctx, Point.mean(this.ht1, this.ht2), this.ht1, 8);
              arrowLine(ctx, Point.mean(this.ht1, this.ht2), this.ht2, 8);
              ctx.stroke();
              ctx.closePath();
              // dashed line to height
              ctx.beginPath();
              ctx.setLineDash([5, 3]);
              ctx.moveTo(this.D.x, this.D.y);
              ctx.lineTo(this.ht2.x, this.ht2.y);
              ctx.stroke();
              ctx.closePath();
              // RA symbol
              ctx.beginPath();
              ctx.setLineDash([]);
              drawRightAngle(ctx, this.ht1, this.ht2, this.D, 12);
              ctx.stroke();
              ctx.closePath();
          }
          this.renderLabels();
      }
  }

  // Parallelogram needs no further options
  // Triangle needs no further options -- needs passing in
  class ParallelogramAreaQ extends GraphicQ {
      static random(options, viewOptions) {
          const data = ParallelogramAreaData.random(options);
          const view = ParallelogramAreaView.fromData(data, viewOptions);
          return new this(data, view);
      }
      static get commandWord() {
          return 'Find the missing values';
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
              case 4:
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
              default:
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
                  question = ParallelogramAreaQ.random(options, viewOptions);
                  break;
              default:
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
                      { id: 'parallelogram', title: 'Parallelograms' },
                      { id: 'trapezium', title: 'Trapezia' }
                  ],
                  default: ['rectangle', 'triangle', 'parallelogram', 'trapezium'],
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

  function createBarModel(spec) {
      var _a, _b;
      const outer = createElem('div', 'barModel-outer');
      const total = createElem('div', 'barModel-total', outer);
      const bracket = createElem('div', 'barModel-bracket', outer);
      const bar = createElem('div', 'barModel-bar', outer);
      spec.parts.forEach(p => {
          var _a, _b;
          const part = createElem('div', 'barModel-part', bar);
          if (p.style) {
              part.classList.add(p.style);
          }
          part.style.flexGrow = p.length.toString();
          if (p.latex) {
              katex.render((_a = p.label) !== null && _a !== void 0 ? _a : p.length.toString(), part);
          }
          else {
              part.innerHTML = (_b = p.label) !== null && _b !== void 0 ? _b : p.length.toString();
          }
      });
      if (spec.total.latex) {
          katex.render((_a = spec.total.label) !== null && _a !== void 0 ? _a : spec.total.length.toString(), total);
      }
      else {
          total.innerHTML = (_b = spec.total.label) !== null && _b !== void 0 ? _b : spec.total.length.toString();
      }
      return outer;
  }
  class PartitionQ extends Question {
      constructor(questionSpec, answerSpec) {
          super();
          this.questionSpec = questionSpec;
          this.answerSpec = answerSpec;
      }
      static random(options) {
          let minTotal;
          let maxTotal;
          let n;
          switch (options.difficulty) {
              case 1:
                  minTotal = 10;
                  maxTotal = 10;
                  n = 2;
                  break;
              case 2:
                  minTotal = 7;
                  maxTotal = 30;
                  n = 2;
                  break;
              case 3:
                  minTotal = 20;
                  maxTotal = 100;
                  n = 2;
              case 4:
                  minTotal = 20;
                  maxTotal = 200;
                  n = 3;
                  break;
              case 5:
                  minTotal = 20;
                  maxTotal = 200;
                  n = randBetween(2, 4);
                  break;
              case 6:
              case 7:
              case 8:
              case 9:
              case 10:
              default:
                  minTotal = 100;
                  maxTotal = 1000;
                  n = randBetween(3, 4);
                  break;
          }
          const total = randBetween(minTotal, maxTotal);
          const minProportion = 0.1;
          const partition = randPartition({ total, n, minProportion });
          const spec = {
              total: { length: total },
              parts: partition.map(x => ({ length: x }))
          };
          const answerSpec = {
              total: { length: total },
              parts: partition.map(x => ({ length: x }))
          };
          if (Math.random() < 0.5) { // hide total
              spec.total.label = "?";
              answerSpec.total.style = "answer";
          }
          else {
              const i = randBetween(0, n - 1);
              answerSpec.parts[i].style = 'answer';
              spec.parts[i].label = "?";
          }
          return new this(spec, answerSpec);
      }
      render() {
          var _a, _b;
          this.DOM.innerHTML = '';
          if (!this.answered) {
              const barModel = (_a = this._questionDiv) !== null && _a !== void 0 ? _a : (this._questionDiv = createBarModel(this.questionSpec));
              this.DOM.append(barModel);
          }
          else {
              const barModel = (_b = this._answerDiv) !== null && _b !== void 0 ? _b : (this._answerDiv = createBarModel(this.answerSpec));
              this.DOM.append(barModel);
          }
      }
      showAnswer() {
          super.showAnswer();
          this.render();
      }
      hideAnswer() {
          super.hideAnswer();
          this.render();
      }
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
    },
    {
      id: 'barmodel',
      title: 'Partitions with bar models',
      class: PartitionQ
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

  /* TODO:
   * . Question number in controls
   */

  document.addEventListener('DOMContentLoaded', () => {
    const qs = new QuestionSet();
    qs.appendTo(document.body);
    qs.chooseTopics();

    document.getElementById('fullscreen').addEventListener('click', (e) => {
      if (document.fullscreenElement) {
        document.exitFullscreen().then(() => {
          e.target.innerText = 'Full screen';
        });
      } else {
        document.documentElement.requestFullscreen().then(() => {
          e.target.innerText = "Exit full screen";
        });
      }
    });

    let controlsHidden = false;
    document.getElementById('hide-controls').addEventListener('click', (e) => {
      if (!controlsHidden) {
        [...document.getElementsByClassName('question-headerbox')].forEach( elem => {
          elem.classList.add('hidden');
        });
        e.target.innerText = 'Show controls';
        controlsHidden = true;
      } else {
        [...document.getElementsByClassName('question-headerbox')].forEach( elem => {
          elem.classList.remove('hidden');
        });
        e.target.innerText = 'Hide controls';
        controlsHidden = false;
      }
    }); 

  });

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vbW9kdWxlcy92ZW5kb3IvcnNsaWRlci5qcyIsIi4uLy4uL21vZHVsZXMvUG9pbnQudHMiLCIuLi8uLi9tb2R1bGVzL3V0aWxpdGllcy50cyIsIi4uLy4uL21vZHVsZXMvT3B0aW9uc1NldC50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vUXVlc3Rpb24udHMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL1RleHRRLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9UZXh0US9BbGdlYnJhaWNGcmFjdGlvblEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0ludGVnZXJBZGQuanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRLnRzIiwiLi4vbm9kZV9tb2R1bGVzL2ZyYWN0aW9uLmpzL2ZyYWN0aW9uLmpzIiwiLi4vbW9kdWxlcy9Nb25vbWlhbC5qcyIsIi4uL21vZHVsZXMvUG9seW5vbWlhbC5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQXJpdGhtYWdvblEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL1Rlc3RRLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9UZXh0US9BZGRBWmVyby5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvRXF1YXRpb25PZkxpbmUuanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc051bWJlckRhdGEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZFEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVEudHMiLCIuLi9tb2R1bGVzL0xpbkV4cHIuanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvc29sdmVBbmdsZXMudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVZpZXcudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzV29yZGVkRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRRLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNXb3JkZWRRLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNXcmFwcGVyLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL1BhcmFsbGVsb2dyYW1BcmVhRGF0YS50cyIsIi4uL21vZHVsZXMvZHJhd2luZy5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQXJlYVBlcmltZXRlci90eXBlcy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQXJlYVBlcmltZXRlci9QYXJhbGxlbG9ncmFtQXJlYVZpZXcudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvUGFyYWxsZWxvZ3JhbUFyZWFRLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL1JlY3RhbmdsZUFyZWFEYXRhLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL1JlY3RhbmdsZUFyZWFWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL1JlY3RhbmdsZUFyZWFRLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL1RyYXBleml1bUFyZWFEYXRhLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL1RyYXBleml1bUFyZWFWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL1RyYXBleml1bUFyZWFRLnRzIiwiLi4vbm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsIi4uLy4uL21vZHVsZXMvdHJpYW5nbGVEYXRhLXF1ZXVlLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL1RyaWFuZ2xlQXJlYURhdGEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvVHJpYW5nbGVBcmVhVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQXJlYVBlcmltZXRlci9UcmlhbmdsZUFyZWFRLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL0FyZWFXcmFwcGVyLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9CYXJNb2RlbHMudHMiLCIuLi9tb2R1bGVzL1RvcGljQ2hvb3Nlci5qcyIsIi4uL25vZGVfbW9kdWxlcy90aW5nbGUuanMvZGlzdC90aW5nbGUubWluLmpzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvblNldC50cyIsIi4uL21haW4uanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogUnNsaWRlci4gRG93bmxvYWRlZCBmcm9tIGh0dHBzOi8vc2xhd29taXItemF6aWFibG8uZ2l0aHViLmlvL3JhbmdlLXNsaWRlci9cbiAqIE1vZGlmaWVkIHRvIG1ha2UgaW50byBFUzYgbW9kdWxlIGFuZCBmaXggYSBmZXcgYnVnc1xuICovXG5cbnZhciBSUyA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIHRoaXMuaW5wdXQgPSBudWxsXG4gIHRoaXMuaW5wdXREaXNwbGF5ID0gbnVsbFxuICB0aGlzLnNsaWRlciA9IG51bGxcbiAgdGhpcy5zbGlkZXJXaWR0aCA9IDBcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gMFxuICB0aGlzLnBvaW50ZXJXaWR0aCA9IDBcbiAgdGhpcy5wb2ludGVyUiA9IG51bGxcbiAgdGhpcy5wb2ludGVyTCA9IG51bGxcbiAgdGhpcy5hY3RpdmVQb2ludGVyID0gbnVsbFxuICB0aGlzLnNlbGVjdGVkID0gbnVsbFxuICB0aGlzLnNjYWxlID0gbnVsbFxuICB0aGlzLnN0ZXAgPSAwXG4gIHRoaXMudGlwTCA9IG51bGxcbiAgdGhpcy50aXBSID0gbnVsbFxuICB0aGlzLnRpbWVvdXQgPSBudWxsXG4gIHRoaXMudmFsUmFuZ2UgPSBmYWxzZVxuXG4gIHRoaXMudmFsdWVzID0ge1xuICAgIHN0YXJ0OiBudWxsLFxuICAgIGVuZDogbnVsbFxuICB9XG4gIHRoaXMuY29uZiA9IHtcbiAgICB0YXJnZXQ6IG51bGwsXG4gICAgdmFsdWVzOiBudWxsLFxuICAgIHNldDogbnVsbCxcbiAgICByYW5nZTogZmFsc2UsXG4gICAgd2lkdGg6IG51bGwsXG4gICAgc2NhbGU6IHRydWUsXG4gICAgbGFiZWxzOiB0cnVlLFxuICAgIHRvb2x0aXA6IHRydWUsXG4gICAgc3RlcDogbnVsbCxcbiAgICBkaXNhYmxlZDogZmFsc2UsXG4gICAgb25DaGFuZ2U6IG51bGxcbiAgfVxuXG4gIHRoaXMuY2xzID0ge1xuICAgIGNvbnRhaW5lcjogJ3JzLWNvbnRhaW5lcicsXG4gICAgYmFja2dyb3VuZDogJ3JzLWJnJyxcbiAgICBzZWxlY3RlZDogJ3JzLXNlbGVjdGVkJyxcbiAgICBwb2ludGVyOiAncnMtcG9pbnRlcicsXG4gICAgc2NhbGU6ICdycy1zY2FsZScsXG4gICAgbm9zY2FsZTogJ3JzLW5vc2NhbGUnLFxuICAgIHRpcDogJ3JzLXRvb2x0aXAnXG4gIH1cblxuICBmb3IgKHZhciBpIGluIHRoaXMuY29uZikgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbmYsIGkpKSB0aGlzLmNvbmZbaV0gPSBjb25mW2ldIH1cblxuICB0aGlzLmluaXQoKVxufVxuXG5SUy5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHR5cGVvZiB0aGlzLmNvbmYudGFyZ2V0ID09PSAnb2JqZWN0JykgdGhpcy5pbnB1dCA9IHRoaXMuY29uZi50YXJnZXRcbiAgZWxzZSB0aGlzLmlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5jb25mLnRhcmdldC5yZXBsYWNlKCcjJywgJycpKVxuXG4gIGlmICghdGhpcy5pbnB1dCkgcmV0dXJuIGNvbnNvbGUubG9nKCdDYW5ub3QgZmluZCB0YXJnZXQgZWxlbWVudC4uLicpXG5cbiAgdGhpcy5pbnB1dERpc3BsYXkgPSBnZXRDb21wdXRlZFN0eWxlKHRoaXMuaW5wdXQsIG51bGwpLmRpc3BsYXlcbiAgdGhpcy5pbnB1dC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG4gIHRoaXMudmFsUmFuZ2UgPSAhKHRoaXMuY29uZi52YWx1ZXMgaW5zdGFuY2VvZiBBcnJheSlcblxuICBpZiAodGhpcy52YWxSYW5nZSkge1xuICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuY29uZi52YWx1ZXMsICdtaW4nKSB8fCAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuY29uZi52YWx1ZXMsICdtYXgnKSkgeyByZXR1cm4gY29uc29sZS5sb2coJ01pc3NpbmcgbWluIG9yIG1heCB2YWx1ZS4uLicpIH1cbiAgfVxuICByZXR1cm4gdGhpcy5jcmVhdGVTbGlkZXIoKVxufVxuXG5SUy5wcm90b3R5cGUuY3JlYXRlU2xpZGVyID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNsaWRlciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLmNvbnRhaW5lcilcbiAgdGhpcy5zbGlkZXIuaW5uZXJIVE1MID0gJzxkaXYgY2xhc3M9XCJycy1iZ1wiPjwvZGl2PidcbiAgdGhpcy5zZWxlY3RlZCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnNlbGVjdGVkKVxuICB0aGlzLnBvaW50ZXJMID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMucG9pbnRlciwgWydkaXInLCAnbGVmdCddKVxuICB0aGlzLnNjYWxlID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMuc2NhbGUpXG5cbiAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7XG4gICAgdGhpcy50aXBMID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMudGlwKVxuICAgIHRoaXMudGlwUiA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnRpcClcbiAgICB0aGlzLnBvaW50ZXJMLmFwcGVuZENoaWxkKHRoaXMudGlwTClcbiAgfVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnNlbGVjdGVkKVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnNjYWxlKVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnBvaW50ZXJMKVxuXG4gIGlmICh0aGlzLmNvbmYucmFuZ2UpIHtcbiAgICB0aGlzLnBvaW50ZXJSID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMucG9pbnRlciwgWydkaXInLCAncmlnaHQnXSlcbiAgICBpZiAodGhpcy5jb25mLnRvb2x0aXApIHRoaXMucG9pbnRlclIuYXBwZW5kQ2hpbGQodGhpcy50aXBSKVxuICAgIHRoaXMuc2xpZGVyLmFwcGVuZENoaWxkKHRoaXMucG9pbnRlclIpXG4gIH1cblxuICB0aGlzLmlucHV0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuc2xpZGVyLCB0aGlzLmlucHV0Lm5leHRTaWJsaW5nKVxuXG4gIGlmICh0aGlzLmNvbmYud2lkdGgpIHRoaXMuc2xpZGVyLnN0eWxlLndpZHRoID0gcGFyc2VJbnQodGhpcy5jb25mLndpZHRoKSArICdweCdcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gdGhpcy5zbGlkZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdFxuICB0aGlzLnNsaWRlcldpZHRoID0gdGhpcy5zbGlkZXIuY2xpZW50V2lkdGhcbiAgdGhpcy5wb2ludGVyV2lkdGggPSB0aGlzLnBvaW50ZXJMLmNsaWVudFdpZHRoXG5cbiAgaWYgKCF0aGlzLmNvbmYuc2NhbGUpIHRoaXMuc2xpZGVyLmNsYXNzTGlzdC5hZGQodGhpcy5jbHMubm9zY2FsZSlcblxuICByZXR1cm4gdGhpcy5zZXRJbml0aWFsVmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLnNldEluaXRpYWxWYWx1ZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZGlzYWJsZWQodGhpcy5jb25mLmRpc2FibGVkKVxuXG4gIGlmICh0aGlzLnZhbFJhbmdlKSB0aGlzLmNvbmYudmFsdWVzID0gcHJlcGFyZUFycmF5VmFsdWVzKHRoaXMuY29uZilcblxuICB0aGlzLnZhbHVlcy5zdGFydCA9IDBcbiAgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnJhbmdlID8gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxIDogMFxuXG4gIGlmICh0aGlzLmNvbmYuc2V0ICYmIHRoaXMuY29uZi5zZXQubGVuZ3RoICYmIGNoZWNrSW5pdGlhbCh0aGlzLmNvbmYpKSB7XG4gICAgdmFyIHZhbHMgPSB0aGlzLmNvbmYuc2V0XG5cbiAgICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgICB0aGlzLnZhbHVlcy5zdGFydCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzBdKVxuICAgICAgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnNldFsxXSA/IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzFdKSA6IG51bGxcbiAgICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHZhbHNbMF0pXG4gIH1cbiAgcmV0dXJuIHRoaXMuY3JlYXRlU2NhbGUoKVxufVxuXG5SUy5wcm90b3R5cGUuY3JlYXRlU2NhbGUgPSBmdW5jdGlvbiAocmVzaXplKSB7XG4gIHRoaXMuc3RlcCA9IHRoaXMuc2xpZGVyV2lkdGggLyAodGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHtcbiAgICB2YXIgc3BhbiA9IGNyZWF0ZUVsZW1lbnQoJ3NwYW4nKVxuICAgIHZhciBpbnMgPSBjcmVhdGVFbGVtZW50KCdpbnMnKVxuXG4gICAgc3Bhbi5hcHBlbmRDaGlsZChpbnMpXG4gICAgdGhpcy5zY2FsZS5hcHBlbmRDaGlsZChzcGFuKVxuXG4gICAgc3Bhbi5zdHlsZS53aWR0aCA9IGkgPT09IGlMZW4gLSAxID8gMCA6IHRoaXMuc3RlcCArICdweCdcblxuICAgIGlmICghdGhpcy5jb25mLmxhYmVscykge1xuICAgICAgaWYgKGkgPT09IDAgfHwgaSA9PT0gaUxlbiAtIDEpIGlucy5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW2ldXG4gICAgfSBlbHNlIGlucy5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW2ldXG5cbiAgICBpbnMuc3R5bGUubWFyZ2luTGVmdCA9IChpbnMuY2xpZW50V2lkdGggLyAyKSAqIC0xICsgJ3B4J1xuICB9XG4gIHJldHVybiB0aGlzLmFkZEV2ZW50cygpXG59XG5cblJTLnByb3RvdHlwZS51cGRhdGVTY2FsZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zdGVwID0gdGhpcy5zbGlkZXJXaWR0aCAvICh0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpXG5cbiAgdmFyIHBpZWNlcyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NwYW4nKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gcGllY2VzLmxlbmd0aDsgaSA8IGlMZW4gLSAxOyBpKyspIHsgcGllY2VzW2ldLnN0eWxlLndpZHRoID0gdGhpcy5zdGVwICsgJ3B4JyB9XG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLmFkZEV2ZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHBvaW50ZXJzID0gdGhpcy5zbGlkZXIucXVlcnlTZWxlY3RvckFsbCgnLicgKyB0aGlzLmNscy5wb2ludGVyKVxuICB2YXIgcGllY2VzID0gdGhpcy5zbGlkZXIucXVlcnlTZWxlY3RvckFsbCgnc3BhbicpXG5cbiAgY3JlYXRlRXZlbnRzKGRvY3VtZW50LCAnbW91c2Vtb3ZlIHRvdWNobW92ZScsIHRoaXMubW92ZS5iaW5kKHRoaXMpKVxuICBjcmVhdGVFdmVudHMoZG9jdW1lbnQsICdtb3VzZXVwIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgdGhpcy5kcm9wLmJpbmQodGhpcykpXG5cbiAgZm9yIChsZXQgaSA9IDAsIGlMZW4gPSBwb2ludGVycy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgY3JlYXRlRXZlbnRzKHBvaW50ZXJzW2ldLCAnbW91c2Vkb3duIHRvdWNoc3RhcnQnLCB0aGlzLmRyYWcuYmluZCh0aGlzKSkgfVxuXG4gIGZvciAobGV0IGkgPSAwLCBpTGVuID0gcGllY2VzLmxlbmd0aDsgaSA8IGlMZW47IGkrKykgeyBjcmVhdGVFdmVudHMocGllY2VzW2ldLCAnY2xpY2snLCB0aGlzLm9uQ2xpY2tQaWVjZS5iaW5kKHRoaXMpKSB9XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMub25SZXNpemUuYmluZCh0aGlzKSlcblxuICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxufVxuXG5SUy5wcm90b3R5cGUuZHJhZyA9IGZ1bmN0aW9uIChlKSB7XG4gIGUucHJldmVudERlZmF1bHQoKVxuXG4gIGlmICh0aGlzLmNvbmYuZGlzYWJsZWQpIHJldHVyblxuXG4gIHZhciBkaXIgPSBlLnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtZGlyJylcbiAgaWYgKGRpciA9PT0gJ2xlZnQnKSB0aGlzLmFjdGl2ZVBvaW50ZXIgPSB0aGlzLnBvaW50ZXJMXG4gIGlmIChkaXIgPT09ICdyaWdodCcpIHRoaXMuYWN0aXZlUG9pbnRlciA9IHRoaXMucG9pbnRlclJcblxuICByZXR1cm4gdGhpcy5zbGlkZXIuY2xhc3NMaXN0LmFkZCgnc2xpZGluZycpXG59XG5cblJTLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24gKGUpIHtcbiAgaWYgKHRoaXMuYWN0aXZlUG9pbnRlciAmJiAhdGhpcy5jb25mLmRpc2FibGVkKSB7XG4gICAgdGhpcy5vblJlc2l6ZSgpIC8vIG5lZWRlZCBpbiBjYXNlIGFueSBlbGVtZW50cyBoYXZlIG1vdmVkIHRoZSBzbGlkZXIgaW4gdGhlIG1lYW50aW1lXG4gICAgdmFyIGNvb3JkWCA9IGUudHlwZSA9PT0gJ3RvdWNobW92ZScgPyBlLnRvdWNoZXNbMF0uY2xpZW50WCA6IGUucGFnZVhcbiAgICB2YXIgaW5kZXggPSBjb29yZFggLSB0aGlzLnNsaWRlckxlZnQgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKSAvLyBwaXhlbCBwb3NpdGlvbiBmcm9tIGxlZnQgb2Ygc2xpZGVyIChzaGlmdGVkIGxlZnQgYnkgaGFsZiB3aWR0aClcblxuICAgIGluZGV4ID0gTWF0aC5jZWlsKGluZGV4IC8gdGhpcy5zdGVwKVxuXG4gICAgaWYgKGluZGV4IDw9IDApIGluZGV4ID0gMFxuICAgIGlmIChpbmRleCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgaW5kZXggPSB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDFcblxuICAgIGlmICh0aGlzLmNvbmYucmFuZ2UpIHtcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgPT09IHRoaXMucG9pbnRlckwpIHRoaXMudmFsdWVzLnN0YXJ0ID0gaW5kZXhcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgPT09IHRoaXMucG9pbnRlclIpIHRoaXMudmFsdWVzLmVuZCA9IGluZGV4XG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IGluZGV4XG5cbiAgICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxuICB9XG59XG5cblJTLnByb3RvdHlwZS5kcm9wID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmFjdGl2ZVBvaW50ZXIgPSBudWxsXG59XG5cblJTLnByb3RvdHlwZS5zZXRWYWx1ZXMgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICB2YXIgYWN0aXZlUG9pbnRlciA9IHRoaXMuY29uZi5yYW5nZSA/ICdzdGFydCcgOiAnZW5kJ1xuXG4gIGlmIChzdGFydCAmJiB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2Yoc3RhcnQpID4gLTEpIHsgdGhpcy52YWx1ZXNbYWN0aXZlUG9pbnRlcl0gPSB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2Yoc3RhcnQpIH1cblxuICBpZiAoZW5kICYmIHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZihlbmQpID4gLTEpIHsgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKGVuZCkgfVxuXG4gIGlmICh0aGlzLmNvbmYucmFuZ2UgJiYgdGhpcy52YWx1ZXMuc3RhcnQgPiB0aGlzLnZhbHVlcy5lbmQpIHsgdGhpcy52YWx1ZXMuc3RhcnQgPSB0aGlzLnZhbHVlcy5lbmQgfVxuXG4gIHRoaXMucG9pbnRlckwuc3R5bGUubGVmdCA9ICh0aGlzLnZhbHVlc1thY3RpdmVQb2ludGVyXSAqIHRoaXMuc3RlcCAtICh0aGlzLnBvaW50ZXJXaWR0aCAvIDIpKSArICdweCdcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7XG4gICAgICB0aGlzLnRpcEwuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5zdGFydF1cbiAgICAgIHRoaXMudGlwUi5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1cbiAgICB9XG4gICAgdGhpcy5pbnB1dC52YWx1ZSA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdICsgJywnICsgdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG4gICAgdGhpcy5wb2ludGVyUi5zdHlsZS5sZWZ0ID0gKHRoaXMudmFsdWVzLmVuZCAqIHRoaXMuc3RlcCAtICh0aGlzLnBvaW50ZXJXaWR0aCAvIDIpKSArICdweCdcbiAgfSBlbHNlIHtcbiAgICBpZiAodGhpcy5jb25mLnRvb2x0aXApIHsgdGhpcy50aXBMLmlubmVySFRNTCA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXSB9XG4gICAgdGhpcy5pbnB1dC52YWx1ZSA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxuICB9XG5cbiAgaWYgKHRoaXMudmFsdWVzLmVuZCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG4gIGlmICh0aGlzLnZhbHVlcy5zdGFydCA8IDApIHRoaXMudmFsdWVzLnN0YXJ0ID0gMFxuXG4gIHRoaXMuc2VsZWN0ZWQuc3R5bGUud2lkdGggPSAodGhpcy52YWx1ZXMuZW5kIC0gdGhpcy52YWx1ZXMuc3RhcnQpICogdGhpcy5zdGVwICsgJ3B4J1xuICB0aGlzLnNlbGVjdGVkLnN0eWxlLmxlZnQgPSB0aGlzLnZhbHVlcy5zdGFydCAqIHRoaXMuc3RlcCArICdweCdcblxuICByZXR1cm4gdGhpcy5vbkNoYW5nZSgpXG59XG5cblJTLnByb3RvdHlwZS5vbkNsaWNrUGllY2UgPSBmdW5jdGlvbiAoZSkge1xuICBpZiAodGhpcy5jb25mLmRpc2FibGVkKSByZXR1cm5cblxuICB2YXIgaWR4ID0gTWF0aC5yb3VuZCgoZS5jbGllbnRYIC0gdGhpcy5zbGlkZXJMZWZ0KSAvIHRoaXMuc3RlcClcblxuICBpZiAoaWR4ID4gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKSBpZHggPSB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDFcbiAgaWYgKGlkeCA8IDApIGlkeCA9IDBcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgaWYgKGlkeCAtIHRoaXMudmFsdWVzLnN0YXJ0IDw9IHRoaXMudmFsdWVzLmVuZCAtIGlkeCkge1xuICAgICAgdGhpcy52YWx1ZXMuc3RhcnQgPSBpZHhcbiAgICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gaWR4XG4gIH0gZWxzZSB0aGlzLnZhbHVlcy5lbmQgPSBpZHhcblxuICB0aGlzLnNsaWRlci5jbGFzc0xpc3QucmVtb3ZlKCdzbGlkaW5nJylcblxuICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxufVxuXG5SUy5wcm90b3R5cGUub25DaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBfdGhpcyA9IHRoaXNcblxuICBpZiAodGhpcy50aW1lb3V0KSBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0KVxuXG4gIHRoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIGlmIChfdGhpcy5jb25mLm9uQ2hhbmdlICYmIHR5cGVvZiBfdGhpcy5jb25mLm9uQ2hhbmdlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gX3RoaXMuY29uZi5vbkNoYW5nZShfdGhpcy5pbnB1dC52YWx1ZSlcbiAgICB9XG4gIH0sIDUwMClcbn1cblxuUlMucHJvdG90eXBlLm9uUmVzaXplID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNsaWRlckxlZnQgPSB0aGlzLnNsaWRlci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0XG4gIHRoaXMuc2xpZGVyV2lkdGggPSB0aGlzLnNsaWRlci5jbGllbnRXaWR0aFxuICByZXR1cm4gdGhpcy51cGRhdGVTY2FsZSgpXG59XG5cblJTLnByb3RvdHlwZS5kaXNhYmxlZCA9IGZ1bmN0aW9uIChkaXNhYmxlZCkge1xuICB0aGlzLmNvbmYuZGlzYWJsZWQgPSBkaXNhYmxlZFxuICB0aGlzLnNsaWRlci5jbGFzc0xpc3RbZGlzYWJsZWQgPyAnYWRkJyA6ICdyZW1vdmUnXSgnZGlzYWJsZWQnKVxufVxuXG5SUy5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIFJldHVybiBsaXN0IG9mIG51bWJlcnMsIHJhdGhlciB0aGFuIGEgc3RyaW5nLCB3aGljaCB3b3VsZCBqdXN0IGJlIHNpbGx5XG4gIC8vICByZXR1cm4gdGhpcy5pbnB1dC52YWx1ZVxuICByZXR1cm4gW3RoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdLCB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1dXG59XG5cblJTLnByb3RvdHlwZS5nZXRWYWx1ZUwgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIEdldCBsZWZ0IChpLmUuIHNtYWxsZXN0KSB2YWx1ZVxuICByZXR1cm4gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5zdGFydF1cbn1cblxuUlMucHJvdG90eXBlLmdldFZhbHVlUiA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gR2V0IHJpZ2h0IChpLmUuIHNtYWxsZXN0KSB2YWx1ZVxuICByZXR1cm4gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG59XG5cblJTLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmlucHV0LnN0eWxlLmRpc3BsYXkgPSB0aGlzLmlucHV0RGlzcGxheVxuICB0aGlzLnNsaWRlci5yZW1vdmUoKVxufVxuXG52YXIgY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uIChlbCwgY2xzLCBkYXRhQXR0cikge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZWwpXG4gIGlmIChjbHMpIGVsZW1lbnQuY2xhc3NOYW1lID0gY2xzXG4gIGlmIChkYXRhQXR0ciAmJiBkYXRhQXR0ci5sZW5ndGggPT09IDIpIHsgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2RhdGEtJyArIGRhdGFBdHRyWzBdLCBkYXRhQXR0clsxXSkgfVxuXG4gIHJldHVybiBlbGVtZW50XG59XG5cbnZhciBjcmVhdGVFdmVudHMgPSBmdW5jdGlvbiAoZWwsIGV2LCBjYWxsYmFjaykge1xuICB2YXIgZXZlbnRzID0gZXYuc3BsaXQoJyAnKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gZXZlbnRzLmxlbmd0aDsgaSA8IGlMZW47IGkrKykgeyBlbC5hZGRFdmVudExpc3RlbmVyKGV2ZW50c1tpXSwgY2FsbGJhY2spIH1cbn1cblxudmFyIHByZXBhcmVBcnJheVZhbHVlcyA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIHZhciB2YWx1ZXMgPSBbXVxuICB2YXIgcmFuZ2UgPSBjb25mLnZhbHVlcy5tYXggLSBjb25mLnZhbHVlcy5taW5cblxuICBpZiAoIWNvbmYuc3RlcCkge1xuICAgIGNvbnNvbGUubG9nKCdObyBzdGVwIGRlZmluZWQuLi4nKVxuICAgIHJldHVybiBbY29uZi52YWx1ZXMubWluLCBjb25mLnZhbHVlcy5tYXhdXG4gIH1cblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IChyYW5nZSAvIGNvbmYuc3RlcCk7IGkgPCBpTGVuOyBpKyspIHsgdmFsdWVzLnB1c2goY29uZi52YWx1ZXMubWluICsgaSAqIGNvbmYuc3RlcCkgfVxuXG4gIGlmICh2YWx1ZXMuaW5kZXhPZihjb25mLnZhbHVlcy5tYXgpIDwgMCkgdmFsdWVzLnB1c2goY29uZi52YWx1ZXMubWF4KVxuXG4gIHJldHVybiB2YWx1ZXNcbn1cblxudmFyIGNoZWNrSW5pdGlhbCA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIGlmICghY29uZi5zZXQgfHwgY29uZi5zZXQubGVuZ3RoIDwgMSkgcmV0dXJuIG51bGxcbiAgaWYgKGNvbmYudmFsdWVzLmluZGV4T2YoY29uZi5zZXRbMF0pIDwgMCkgcmV0dXJuIG51bGxcblxuICBpZiAoY29uZi5yYW5nZSkge1xuICAgIGlmIChjb25mLnNldC5sZW5ndGggPCAyIHx8IGNvbmYudmFsdWVzLmluZGV4T2YoY29uZi5zZXRbMV0pIDwgMCkgcmV0dXJuIG51bGxcbiAgfVxuICByZXR1cm4gdHJ1ZVxufVxuXG5leHBvcnQgZGVmYXVsdCBSU1xuIiwiLyoqXG4gKiBDbGFzcyByZXByZXNlbnRpbmcgYSBwb2ludCwgYW5kIHN0YXRpYyB1dGl0bGl0eSBtZXRob2RzXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBvaW50IHtcbiAgeDogbnVtYmVyXG4gIHk6IG51bWJlclxuICBjb25zdHJ1Y3RvciAoeDogbnVtYmVyLCB5OiBudW1iZXIpIHtcbiAgICB0aGlzLnggPSB4XG4gICAgdGhpcy55ID0geVxuICB9XG5cbiAgcm90YXRlIChhbmdsZTogbnVtYmVyKSB7XG4gICAgY29uc3QgbmV3eCA9IE1hdGguY29zKGFuZ2xlKSAqIHRoaXMueCAtIE1hdGguc2luKGFuZ2xlKSAqIHRoaXMueVxuICAgIGNvbnN0IG5ld3kgPSBNYXRoLnNpbihhbmdsZSkgKiB0aGlzLnggKyBNYXRoLmNvcyhhbmdsZSkgKiB0aGlzLnlcbiAgICB0aGlzLnggPSBuZXd4XG4gICAgdGhpcy55ID0gbmV3eVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzY2FsZSAoc2Y6IG51bWJlcikge1xuICAgIHRoaXMueCA9IHRoaXMueCAqIHNmXG4gICAgdGhpcy55ID0gdGhpcy55ICogc2ZcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgdHJhbnNsYXRlICh4OiBudW1iZXIsIHk6IG51bWJlcikge1xuICAgIHRoaXMueCArPSB4XG4gICAgdGhpcy55ICs9IHlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgY2xvbmUgKCkge1xuICAgIHJldHVybiBuZXcgUG9pbnQodGhpcy54LCB0aGlzLnkpXG4gIH1cblxuICBlcXVhbHMgKHRoYXQ6IFBvaW50KSB7XG4gICAgcmV0dXJuICh0aGlzLnggPT09IHRoYXQueCAmJiB0aGlzLnkgPT09IHRoYXQueSlcbiAgfVxuXG4gIG1vdmVUb3dhcmQgKHRoYXQ6IFBvaW50LCBkOiBudW1iZXIpIHtcbiAgICAvLyBtb3ZlcyBbZF0gaW4gdGhlIGRpcmVjdGlvbiBvZiBbdGhhdDo6UG9pbnRdXG4gICAgY29uc3QgdXZlYyA9IFBvaW50LnVuaXRWZWN0b3IodGhpcywgdGhhdClcbiAgICB0aGlzLnRyYW5zbGF0ZSh1dmVjLnggKiBkLCB1dmVjLnkgKiBkKVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzdGF0aWMgZnJvbVBvbGFyIChyOiBudW1iZXIsIHRoZXRhOiBudW1iZXIpIHtcbiAgICByZXR1cm4gbmV3IFBvaW50KFxuICAgICAgTWF0aC5jb3ModGhldGEpICogcixcbiAgICAgIE1hdGguc2luKHRoZXRhKSAqIHJcbiAgICApXG4gIH1cblxuICBzdGF0aWMgZnJvbVBvbGFyRGVnIChyOiBudW1iZXIsIHRoZXRhOiBudW1iZXIpIHtcbiAgICB0aGV0YSA9IHRoZXRhICogTWF0aC5QSSAvIDE4MFxuICAgIHJldHVybiBQb2ludC5mcm9tUG9sYXIociwgdGhldGEpXG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIHBvaW50IHJlcHJlc2VudGluZyB0aGUgcG9zaXRpb24gb2YgYW4gZWxlbWVudCwgZWl0aGVyIHJlbGF0aXZlIHRvIHBhcmVudCBvciB2aWV3cG9ydFxuICAgKiBAcGFyYW0gZWxlbSBBbiBIVE1MIGVsZW1lbnRcbiAgICogQHBhcmFtIGFuY2hvciBXaGljaCBjb3JuZGVyIG9mIHRoZSBib3VuZGluZyBib3ggb2YgZWxlbSB0byByZXR1cm4sIG9yIHRoZSBjZW50ZXJcbiAgICovXG4gIHN0YXRpYyBmcm9tRWxlbWVudChlbGVtOiBIVE1MRWxlbWVudCwgYW5jaG9yOiAndG9wbGVmdCd8J2JvdHRvbWxlZnQnfCd0b3ByaWdodCd8J2JvdHRvbXJpZ2h0J3wnY2VudGVyJyA9ICd0b3BsZWZ0JywgcmVsYXRpdmVUb1BhcmVudDogYm9vbGVhbiA9IHRydWUpIHtcbiAgICBjb25zdCByZWN0ID0gZWxlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVxuICAgIGxldCB5ID0gYW5jaG9yLnN0YXJ0c1dpdGgoJ3RvcCcpID8gcmVjdC50b3AgOlxuICAgICAgICAgICAgICBhbmNob3Iuc3RhcnRzV2l0aCgnYm90dG9tJykgPyByZWN0LmJvdHRvbSA6XG4gICAgICAgICAgICAgIChyZWN0LmJvdHRvbSArIHJlY3QudG9wKS8yXG5cbiAgICBsZXQgeCA9IGFuY2hvci5lbmRzV2l0aCgnbGVmdCcpID8gcmVjdC5sZWZ0IDpcbiAgICAgICAgICAgICAgYW5jaG9yLmVuZHNXaXRoKCdyaWdodCcpID8gcmVjdC5yaWdodCA6XG4gICAgICAgICAgICAgIChyZWN0LnJpZ2h0ICsgcmVjdC5sZWZ0KS8yXG5cbiAgICBpZiAocmVsYXRpdmVUb1BhcmVudCAmJiBlbGVtLnBhcmVudEVsZW1lbnQpIHtcbiAgICAgIGNvbnN0IHBhcmVudFB0ID0gUG9pbnQuZnJvbUVsZW1lbnQoZWxlbS5wYXJlbnRFbGVtZW50LCAndG9wbGVmdCcsIGZhbHNlKVxuICAgICAgeCAtPSBwYXJlbnRQdC54XG4gICAgICB5IC09IHBhcmVudFB0LnlcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFBvaW50KHgseSlcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBtZWFuIG9mXG4gICAqIEBwYXJhbSAgey4uLlBvaW50fSBwb2ludHMgVGhlIHBvaW50cyB0byBmaW5kIHRoZSBtZWFuIG9mXG4gICAqL1xuICBzdGF0aWMgbWVhbiAoLi4ucG9pbnRzIDogUG9pbnRbXSkge1xuICAgIGNvbnN0IHN1bXggPSBwb2ludHMubWFwKHAgPT4gcC54KS5yZWR1Y2UoKHgsIHkpID0+IHggKyB5KVxuICAgIGNvbnN0IHN1bXkgPSBwb2ludHMubWFwKHAgPT4gcC55KS5yZWR1Y2UoKHgsIHkpID0+IHggKyB5KVxuICAgIGNvbnN0IG4gPSBwb2ludHMubGVuZ3RoXG5cbiAgICByZXR1cm4gbmV3IFBvaW50KHN1bXggLyBuLCBzdW15IC8gbilcbiAgfVxuXG4gIHN0YXRpYyBpbkNlbnRlciAoQTogUG9pbnQsIEI6IFBvaW50LCBDOiBQb2ludCkge1xuICAgIC8vIGluY2VudGVyIG9mIGEgdHJpYW5nbGUgZ2l2ZW4gdmVydGV4IHBvaW50cyBBLCBCIGFuZCBDXG4gICAgY29uc3QgYSA9IFBvaW50LmRpc3RhbmNlKEIsIEMpXG4gICAgY29uc3QgYiA9IFBvaW50LmRpc3RhbmNlKEEsIEMpXG4gICAgY29uc3QgYyA9IFBvaW50LmRpc3RhbmNlKEEsIEIpXG5cbiAgICBjb25zdCBwZXJpbWV0ZXIgPSBhICsgYiArIGNcbiAgICBjb25zdCBzdW14ID0gYSAqIEEueCArIGIgKiBCLnggKyBjICogQy54XG4gICAgY29uc3Qgc3VteSA9IGEgKiBBLnkgKyBiICogQi55ICsgYyAqIEMueVxuXG4gICAgcmV0dXJuIG5ldyBQb2ludChzdW14IC8gcGVyaW1ldGVyLCBzdW15IC8gcGVyaW1ldGVyKVxuICB9XG5cbiAgc3RhdGljIG1pbiAocG9pbnRzIDogUG9pbnRbXSkge1xuICAgIGNvbnN0IG1pbnggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1pbih4LCBwLngpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtaW55ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5taW4oeSwgcC55KSwgSW5maW5pdHkpXG4gICAgcmV0dXJuIG5ldyBQb2ludChtaW54LCBtaW55KVxuICB9XG5cbiAgc3RhdGljIG1heCAocG9pbnRzOiBQb2ludFtdKSB7XG4gICAgY29uc3QgbWF4eCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWF4KHgsIHAueCksIC1JbmZpbml0eSlcbiAgICBjb25zdCBtYXh5ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5tYXgoeSwgcC55KSwgLUluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQobWF4eCwgbWF4eSlcbiAgfVxuXG4gIHN0YXRpYyBjZW50ZXIgKHBvaW50czogUG9pbnRbXSkge1xuICAgIGNvbnN0IG1pbnggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1pbih4LCBwLngpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtaW55ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5taW4oeSwgcC55KSwgSW5maW5pdHkpXG4gICAgY29uc3QgbWF4eCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWF4KHgsIHAueCksIC1JbmZpbml0eSlcbiAgICBjb25zdCBtYXh5ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5tYXgoeSwgcC55KSwgLUluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQoKG1heHggKyBtaW54KSAvIDIsIChtYXh5ICsgbWlueSkgLyAyKVxuICB9XG5cbiAgLyoqXG4gICAqIHJldHVybnMgYSB1bml0IHZlY3RvciBpbiB0aGUgZGlyZWN0aW9uIG9mIHAxIHRvIHAyIGluIHRoZSBmb3JtIHt4Oi4uLiwgeTouLi59XG4gICAqIEBwYXJhbSBwMSBBIHBvaW50XG4gICAqIEBwYXJhbSBwMiBBIHBvaW50XG4gICAqL1xuICBzdGF0aWMgdW5pdFZlY3RvciAocDEgOiBQb2ludCwgcDIgOiBQb2ludCkge1xuICAgIGNvbnN0IHZlY3ggPSBwMi54IC0gcDEueFxuICAgIGNvbnN0IHZlY3kgPSBwMi55IC0gcDEueVxuICAgIGNvbnN0IGxlbmd0aCA9IE1hdGguaHlwb3QodmVjeCwgdmVjeSlcbiAgICByZXR1cm4geyB4OiB2ZWN4IC8gbGVuZ3RoLCB5OiB2ZWN5IC8gbGVuZ3RoIH1cbiAgfVxuXG4gIHN0YXRpYyBkaXN0YW5jZSAocDE6IFBvaW50LCBwMjogUG9pbnQpIHtcbiAgICByZXR1cm4gTWF0aC5oeXBvdChwMS54IC0gcDIueCwgcDEueSAtIHAyLnkpXG4gIH1cblxuICAvKipcbiAgICogQ2FsY3VsYXRlIHRoZSBhbmdsZSBpbiByYWRpYW5zIGZyb20gaG9yaXpvbnRhbCB0byBwMiwgd2l0aCBjZW50cmUgcDEuXG4gICAqIEUuZy4gYW5nbGVGcm9tKCAoMCwwKSwgKDEsMSkgKSA9IHBpLzJcbiAgICogQW5nbGUgaXMgZnJvbSAwIHRvIDJwaVxuICAgKiBAcGFyYW0gIHAxIFRoZSBzdGFydCBwb2ludFxuICAgKiBAcGFyYW0gIHAyIFRoZSBlbmQgcG9pbnRcbiAgICogQHJldHVybnMgIFRoZSBhbmdsZSBpbiByYWRpYW5zXG4gICAqL1xuICBzdGF0aWMgYW5nbGVGcm9tIChwMTogUG9pbnQsIHAyOiBQb2ludCk6IG51bWJlciB7XG4gICAgY29uc3QgYW5nbGUgPSBNYXRoLmF0YW4yKHAyLnkgLSBwMS55LCBwMi54IC0gcDEueClcbiAgICByZXR1cm4gYW5nbGUgPj0gMCA/IGFuZ2xlIDogMiAqIE1hdGguUEkgKyBhbmdsZVxuICB9XG5cbiAgLyoqXG4gICAqIFdoZW4gcDEgYW5kIHAyIGFyZSBsZXNzIHRoYW4gW3RyaWdnZXJdIGFwYXJ0LCB0aGV5IGFyZVxuICAgKiBtb3ZlZCBzbyB0aGF0IHRoZXkgYXJlIFtkaXN0YW5jZV0gYXBhcnRcbiAgICogQHBhcmFtIHAxIEEgcG9pbnRcbiAgICogQHBhcmFtIHAyIEEgcG9pbnRcbiAgICogQHBhcmFtIHRyaWdnZXIgRGlzdGFuY2UgdHJpZ2dlcmluZyByZXB1bHNpb25cbiAgICogQHBhcmFtIGRpc3RhbmNlIGRpc3RhbmNlIHRvIHJlcGVsIHRvXG4gICAqL1xuICBzdGF0aWMgcmVwZWwgKHAxOiBQb2ludCwgcDI6IFBvaW50LCB0cmlnZ2VyOiBudW1iZXIsIGRpc3RhbmNlOiBudW1iZXIpIHtcbiAgICBjb25zdCBkID0gTWF0aC5oeXBvdChwMS54IC0gcDIueCwgcDEueSAtIHAyLnkpXG4gICAgaWYgKGQgPj0gdHJpZ2dlcikgcmV0dXJuIGZhbHNlXG5cbiAgICBjb25zdCByID0gKGRpc3RhbmNlIC0gZCkgLyAyIC8vIGRpc3RhbmNlIHRoZXkgbmVlZCBtb3ZpbmdcbiAgICBwMS5tb3ZlVG93YXJkKHAyLCAtcilcbiAgICBwMi5tb3ZlVG93YXJkKHAxLCAtcilcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgLyoqXG4gICAqIFNjYWxlIGFuIGNlbnRlciBhIHNldCBvZiBwb2ludHMgdG8gYSBnaXZlbiB3aWR0aCBvciBoZWlnaHQuIE4uQi4gVGhpcyBtdXRhdGVzIHRoZSBwb2ludHMgaW4gdGhlIGFycmF5LCBzbyBjbG9uZSBmaXJzdCBpZiBuZWNlc3NhclxuICAgKiBAcGFyYW0gcG9pbnRzIEFuIGFycmF5IG9mIHBvaW50c1xuICAgKiBAcGFyYW0gd2lkdGggV2lkdGggb2YgYm91bmRpbmcgYm94IHRvIHNjYWxlIHRvXG4gICAqIEBwYXJhbSBoZWlnaHQgSGVpZ2h0IG9mIGJvdW5kaW5nIGJveCB0byBzY2FsZSB0b1xuICAgKiBAcGFyYW0gbWFyZ2luIE1hcmdpbiB0byBsZWF2ZSBhcm91bmQgc2NhbGVkIHBvaW50c1xuICAgKiBAcGFyYW0gb2Zmc2V0IE9mZnNldCBmcm9tIGNlbnRlciBvZiBib3VuZGluZyBib3hcbiAgICogQHJldHVybnMgVGhlIHNjYWxlIGZhY3RvciB0aGF0IHBvaW50cyB3ZXJlIHNjYWxlZCBieVxuICAgKi9cbiAgc3RhdGljIHNjYWxlVG9GaXQgKHBvaW50czogUG9pbnRbXSwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIG1hcmdpbiA9IDAsIG9mZnNldDogW251bWJlciwgbnVtYmVyXSA9IFswLCAwXSkge1xuICAgIGxldCB0b3BMZWZ0IDogUG9pbnQgPSBQb2ludC5taW4ocG9pbnRzKVxuICAgIGxldCBib3R0b21SaWdodCA6IFBvaW50ID0gUG9pbnQubWF4KHBvaW50cylcbiAgICBjb25zdCB0b3RhbFdpZHRoIDogbnVtYmVyID0gYm90dG9tUmlnaHQueCAtIHRvcExlZnQueFxuICAgIGNvbnN0IHRvdGFsSGVpZ2h0IDogbnVtYmVyID0gYm90dG9tUmlnaHQueSAtIHRvcExlZnQueVxuICAgIGNvbnN0IHNmID0gTWF0aC5taW4oKHdpZHRoIC0gbWFyZ2luKSAvIHRvdGFsV2lkdGgsIChoZWlnaHQgLSBtYXJnaW4pIC8gdG90YWxIZWlnaHQpXG4gICAgcG9pbnRzLmZvckVhY2gocHQgPT4geyBwdC5zY2FsZShzZikgfSlcblxuICAgIC8vIGNlbnRyZVxuICAgIHRvcExlZnQgPSBQb2ludC5taW4ocG9pbnRzKVxuICAgIGJvdHRvbVJpZ2h0ID0gUG9pbnQubWF4KHBvaW50cylcbiAgICBjb25zdCBjZW50ZXIgPSBQb2ludC5tZWFuKHRvcExlZnQsIGJvdHRvbVJpZ2h0KS50cmFuc2xhdGUoLi4ub2Zmc2V0KVxuICAgIHBvaW50cy5mb3JFYWNoKHB0ID0+IHsgcHQudHJhbnNsYXRlKHdpZHRoIC8gMiAtIGNlbnRlci54LCBoZWlnaHQgLyAyIC0gY2VudGVyLnkpIH0pIC8vIGNlbnRyZVxuXG4gICAgcmV0dXJuIHNmXG4gIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICcuL1BvaW50LmpzJ1xuXG4vKipcbiAqIEFwcHJveGltYXRlcyBhIGd1YXNzaWFuIGRpc3RyaWJ1dGlvbiBieSBmaW5kaW5nIHRoZSBtZWFuIG9mIG4gdW5pZm9ybSBkaXN0cmlidXRpb25zXG4gKiBAcGFyYW0ge251bWJlcn0gbiBOdW1iZXIgb2YgdGltZXMgdG8gcm9sbCB0aGUgJ2RpY2UnIC0gaGlnaGVyIGlzIGNsb3NlciB0byBnYXVzc2lhblxuICogQHJldHVybnMge251bWJlcn0gQSBudW1iZXIgYmV0d2VlbiAwIGFuZCAxXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnYXVzc2lhbiAobjogbnVtYmVyKTogbnVtYmVyIHtcbiAgbGV0IHJudW0gPSAwXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgcm51bSArPSBNYXRoLnJhbmRvbSgpXG4gIH1cbiAgcmV0dXJuIHJudW0gLyBuXG59XG5cbi8qKlxuICogQXBwcm94aW1hdGVzIGEgZ2F1c3NpYW4gZGlzdHJpYnV0aW9uIGJ5IGZpbmRpbmcgdGhlIG1lYW4gb2YgbiB1bmlmb3JtIGRpc3RyaWJ1dGlvbnNcbiAqIFJldHVybnMgYSBmdW5jdGlvIFxuICogQHBhcmFtIHtudW1iZXJ9IG4gTnVtYmVyIG9mIHVuaWZvcm0gZGlzdHJpYnV0aW9ucyB0byBhdmVyYWdlXG4gKiBAcmV0dXJucyB7KCk9Pm51bWJlcn0gQSBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGEgcmFuZG9tIG51bWJlclxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2F1c3NpYW5DdXJyeSAobjogbnVtYmVyKTogKCkgPT4gbnVtYmVyIHtcbiAgcmV0dXJuICgpID0+IGdhdXNzaWFuKG4pXG59XG5cbi8qKlxuICogcmV0dXJuIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBuIGFuZCBtIGluY2x1c2l2ZVxuICogZGlzdCAob3B0aW9uYWwpIGlzIGEgZnVuY3Rpb24gcmV0dXJuaW5nIGEgdmFsdWUgaW4gWzAsMSlcbiAqIEBwYXJhbSB7bnVtYmVyfSBuIFRoZSBtaW5pbXVtIHZhbHVlXG4gKiBAcGFyYW0ge251bWJlcn0gbSBUaGUgbWF4aW11bSB2YWx1ZVxuICogQHBhcmFtIHsoKT0+bnVtYmVyfSBbZGlzdF0gQSBkaXN0cmlidXRpb24gcmV0dXJuaW5nIGEgbnVtYmVyIGZyb20gMCB0byAxXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kQmV0d2VlbiAobjogbnVtYmVyLCBtOiBudW1iZXIsIGRpc3Q/OiAoKT0+bnVtYmVyKSB7XG4gIGlmICghZGlzdCkgZGlzdCA9IE1hdGgucmFuZG9tXG4gIG4gPSBNYXRoLmNlaWwobilcbiAgbSA9IE1hdGguZmxvb3IobSlcbiAgcmV0dXJuIG4gKyBNYXRoLmZsb29yKGRpc3QoKSAqIChtIC0gbiArIDEpKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZEJldHdlZW5GaWx0ZXIgKG46IG51bWJlciwgbTogbnVtYmVyLCBmaWx0ZXI6IChuOm51bWJlcik9PmJvb2xlYW4pIHtcbiAgLyogcmV0dXJucyBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbiBhbmQgbSBpbmNsdXNpdmUgd2hpY2ggc2F0aXNmaWVzIHRoZSBmaWx0ZXJcbiAgLyAgbiwgbTogaW50ZWdlclxuICAvICBmaWx0ZXI6IEludC0+IEJvb2xcbiAgKi9cbiAgY29uc3QgYXJyID0gW11cbiAgZm9yIChsZXQgaSA9IG47IGkgPCBtICsgMTsgaSsrKSB7XG4gICAgaWYgKGZpbHRlcihpKSkgYXJyLnB1c2goaSlcbiAgfVxuICBpZiAoYXJyID09PSBbXSkgdGhyb3cgbmV3IEVycm9yKCdvdmVyZmlsdGVyZWQnKVxuICBjb25zdCBpID0gcmFuZEJldHdlZW4oMCwgYXJyLmxlbmd0aCAtIDEpXG4gIHJldHVybiBhcnJbaV1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgbXVsdGlwbGUgb2YgbiBiZXR3ZWVuIG1pbiBhbmQgbWF4XG4gKiBAcGFyYW0ge251bWJlcn0gbWluIE1pbmltdW0gdmFsdWVcbiAqIEBwYXJhbSB7bnVtYmVyfSBtYXggTWF4aW11bSB2YWx1ZVxuICogQHBhcmFtIHtudW1iZXJ9IG4gQ2hvb3NlIGEgbXVsdGlwbGUgb2YgdGhpcyB2YWx1ZVxuICogQHJldHVybnMge251bWJlcn0gQSBtdWx0aXBsZW9mIG4gYmV0d2VlbiBtaW4gYW5kIG1heFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZE11bHRCZXR3ZWVuIChtaW46IG51bWJlciwgbWF4OiBudW1iZXIsIG46IG51bWJlcik6IG51bWJlciB7XG4gIC8vIHJldHVybiBhIHJhbmRvbSBtdWx0aXBsZSBvZiBuIGJldHdlZW4gbiBhbmQgbSAoaW5jbHVzaXZlIGlmIHBvc3NpYmxlKVxuICBtaW4gPSBNYXRoLmNlaWwobWluIC8gbikgKiBuXG4gIG1heCA9IE1hdGguZmxvb3IobWF4IC8gbikgKiBuIC8vIGNvdWxkIGNoZWNrIGRpdmlzaWJpbGl0eSBmaXJzdCB0byBtYXhpbWlzZSBwZXJmb3JtYWNlLCBidXQgSSdtIHN1cmUgdGhlIGhpdCBpc24ndCBiYWRcblxuICByZXR1cm4gcmFuZEJldHdlZW4obWluIC8gbiwgbWF4IC8gbikgKiBuXG59XG5cbi8qKlxuICogUmV0dXJucyBhIHJhbmRvbSBlbGVtZW50IG9mIGFuIGFycmF5XG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtUW119IGFycmF5IEFuIGFycmF5IG9mIG9iamVjdHNcbiAqIEBwYXJhbSB7KCk9Pm51bWJlcn0gW2Rpc3RdIEEgZGlzdHJpYnV0aW9uIGZ1bmN0aW9uIGZvciB3ZWlnaHRpbmcsIHJldHVybmluZyBhIG51bWJlciBiZXR3ZWVuIDAgYW5kIDEuIERlZmF1bHQgaXMgTWF0aC5yYW5kb21cbiAqIEByZXR1cm5zIHtUfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZEVsZW08VD4gKGFycmF5OiBBcnJheTxUPiwgZGlzdD86ICgpPT4gbnVtYmVyKSA6IFQge1xuICBpZiAoWy4uLmFycmF5XS5sZW5ndGggPT09IDApIHRocm93IG5ldyBFcnJvcignZW1wdHkgYXJyYXknKVxuICBpZiAoIWRpc3QpIGRpc3QgPSBNYXRoLnJhbmRvbVxuICBjb25zdCBuID0gYXJyYXkubGVuZ3RoXG4gIGNvbnN0IGkgPSByYW5kQmV0d2VlbigwLCBuIC0gMSwgZGlzdClcbiAgcmV0dXJuIFsuLi5hcnJheV1baV1cbn1cblxuLyoqXG4gKiBSYW5kb21seSBwYXJ0aXRpb25zIGEgdG90YWwgaW50byBuIGFtb3VudHNcbiAqIEBwYXJhbSB0b3RhbCBUaGUgdG90YWwgYW1vdW50IHRvIHBhcnRpdGlvblxuICogQHBhcmFtIG4gSG93IG1hbnkgcGFydHMgdG8gcGFydGl0aW9uIGludG9cbiAqIEBwYXJhbSBtaW5Qcm9wb3J0aW9uIFRoZSBzbWFsbGVzdCBwcm9wb3J0aW9uIG9mIGEgd2hvbGUgZm9yIGEgcGFydGlvblxuICogQHBhcmFtIG1pblZhbHVlIFRoZSBzbWFsbGVzdCB2YWx1ZSBmb3IgYSBwYXJ0aXRpb24uIE92ZXJyaWRlcyBtaW5Qcm9wb3J0aW9uXG4gKiBAcmV0dXJucyBBbiBhcnJheSBvZiBuIG51bWJlcnMgd2hpY2ggc3VtIHRvIHRvdGFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kUGFydGl0aW9uKHsgdG90YWwsIG4sIG1pblByb3BvcnRpb24sIG1pblZhbHVlLCBpbnRlZ2VyID0gdHJ1ZSB9OiB7IHRvdGFsOiBudW1iZXI7IG46IG51bWJlcjsgbWluUHJvcG9ydGlvbj86IG51bWJlcjsgbWluVmFsdWU/OiBudW1iZXI7IGludGVnZXI/OiBib29sZWFuIH0pOiBudW1iZXJbXSB7XG4gIG1pblZhbHVlID0gbWluVmFsdWUgPz8gKG1pblByb3BvcnRpb24gIT09IHVuZGVmaW5lZD8gdG90YWwqbWluUHJvcG9ydGlvbiA6IDApICAvLyB3aHkgZG9lcyB0eXBlc2NyaXB0IHJlcXVpcmUgISBoZXJlPyBcbiAgXG4gIGNvbnN0IHBhcnRpdGlvbnM6IG51bWJlcltdID0gW11cbiAgbGV0IGxlZnQgPSB0b3RhbFxuICBmb3IgKGxldCBpID0gMDsgaSA8IG4gLSAxOyBpKyspIHtcbiAgICBjb25zdCBtYXhWYWx1ZSA9IGxlZnQgLSBtaW5WYWx1ZSAqIChuIC0gaSAtIDEpXG4gICAgY29uc3QgbmV4dFZhbHVlID0gaW50ZWdlcj8gcmFuZEJldHdlZW4obWluVmFsdWUsIG1heFZhbHVlKSA6IG1pblZhbHVlICsgTWF0aC5yYW5kb20oKSoobWF4VmFsdWUtbWluVmFsdWUpXG4gICAgbGVmdCAtPSBuZXh0VmFsdWVcbiAgICBwYXJ0aXRpb25zLnB1c2gobmV4dFZhbHVlKVxuICB9XG4gIHBhcnRpdGlvbnNbbiAtIDFdID0gbGVmdFxuXG4gIHJldHVybiBwYXJ0aXRpb25zXG59XG5cbi8qKlxuICogU2VsZWN0cyBhbiBlbGVtZW50XG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtUW119IGFycmF5IEFuIGFycmF5IG9mIGVsZW1lbnRzXG4gKiBAcGFyYW0ge251bWJlcltdfSBwcm9iYWJpbGl0aWVzIEFuIGFycmF5IG9mIHByb2JiaWxpdGllc1xuICogQHJldHVybnMge1R9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kRWxlbVdpdGhQcm9iYWJpbGl0aWVzPFQ+IChhcnJheTogQXJyYXk8VD4sIHByb2JhYmlsaXRpZXM6IEFycmF5PG51bWJlcj4pOiBUIHtcbiAgLy8gdmFsaWRhdGVcbiAgaWYgKGFycmF5Lmxlbmd0aCAhPT0gcHJvYmFiaWxpdGllcy5sZW5ndGgpIHRocm93IG5ldyBFcnJvcignQXJyYXkgbGVuZ3RocyBkbyBub3QgbWF0Y2gnKVxuXG4gIGNvbnN0IHIgPSBNYXRoLnJhbmRvbSgpXG4gIGxldCBjdW11bGF0aXZlUHJvYiA9IDBcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgIGN1bXVsYXRpdmVQcm9iICs9IHByb2JhYmlsaXRpZXNbaV1cbiAgICBpZiAociA8IGN1bXVsYXRpdmVQcm9iKSByZXR1cm4gYXJyYXlbaV1cbiAgfVxuXG4gIC8vIHNob3VsZG4ndCBnZXQgaGVyZSBpZiBwcm9iYWJpbGl0aWVzIHN1bSB0byAxLCBidXQgY291bGQgYmUgYSByb3VuZGluZyBlcnJvclxuICBjb25zb2xlLndhcm4oYFByb2JhYmlsaXRpZXMgZG9uJ3Qgc3VtIHRvIDE/IFRvdGFsIHdhcyAke2N1bXVsYXRpdmVQcm9ifWApXG4gIHJldHVybiAoYXJyYXlbYXJyYXkubGVuZ3RoIC0gMV0pXG59XG5cbi8qKlxuICogRmluZHMgYSByYW5kb20gcHl0aGFvZ3JlYW4gdHJpcGxlIHdpdGggbWF4aW11bSBoeXBvdGVudXNlIGxlbmd0IFxuICogQHBhcmFtIHtudW1iZXJ9IG1heCBUaGUgbWF4aW11bSBsZW5ndGggb2YgdGhlIGh5cG90ZW51c2VcbiAqIEByZXR1cm5zIHt7YTogbnVtYmVyLCBiOiBudW1iZXIsIGM6IG51bWJlcn19IFRocmVlIHZhbHVlcyBzdWNoIHRoYXQgYV4yK2JeMj1jXjJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmRQeXRoYWdUcmlwbGUobWF4OiBudW1iZXIpOiB7IGE6IG51bWJlcjsgYjogbnVtYmVyOyBjOiBudW1iZXIgfSB7XG4gIGNvbnN0IG4gPSByYW5kQmV0d2VlbigyLCBNYXRoLmNlaWwoTWF0aC5zcXJ0KG1heCkpLTEpO1xuICBjb25zdCBtID0gcmFuZEJldHdlZW4oMSwgTWF0aC5taW4obi0xLE1hdGguZmxvb3IoTWF0aC5zcXJ0KG1heC1uKm4pKSkpO1xuICByZXR1cm4ge2E6IG4qbi1tKm0sIGI6IDIqbiptLCBjOm4qbittKm19O1xufVxuXG4vKipcbiAqIFJhbmRvbSBweXRoYWdvcmVhbiB0cmlwbGUgd2l0aCBhIGdpdmVuIGxlZ1xuICogQHBhcmFtIHtudW1iZXJ9IGEgVGhlIGxlbmd0aCBvZiB0aGUgZmlyc3QgbGVnXG4gKiBAcGFyYW0ge251bWJlcn0gbWF4IFRoZSBtYXhpbXVtIGxlbmd0aCBvZiB0aGUgaHlwb3RlbnVzZVxuICogQHJldHVybnMge3thOiBudW1iZXIsIGI6IG51bWJlciwgYzpudW1iZXJ9fSBUaHJlZSB2YWx1ZXMgc3VjaCB0aGF0IGFeMitiXjIgPSBjXjIgYW5kIGEgaXMgdGhlIGZpcnN0IGlucHV0IHBhcmFtZXRlclxuICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZFB5dGhhZ1RyaXBsZVdpdGhMZWcoYTogbnVtYmVyLG1heD86IG51bWJlcik6IHsgYTogbnVtYmVyOyBiOiBudW1iZXI7IGM6IG51bWJlciB9IHtcbiAgLyogUmFuZG9tIHB5dGhhZ29yZWFuIHRyaXBsZSB3aXRoIGEgZ2l2ZW4gbGVnXG4gICAqIFRoYXQgbGVnIGlzIHRoZSBmaXJzdCBvbmUgKi9cblxuICBpZiAobWF4PT09dW5kZWZpbmVkKSBtYXggPSA1MDA7XG5cbiAgaWYgKGElMj09PTEpIHsgLy9vZGQ6IGEgPSBuXjItbV4yXG4gICAgcmV0dXJuIHJhbmRQeXRoYWdubl9tbShhLG1heCk7XG4gIH0gZWxzZSB7IC8vZXZlbjogdHJ5IGEgPSAybW4sIGJ1dCBpZiB0aGF0IGZhaWxzLCB0cnkgYT1uXjItbV4yXG4gICAgbGV0IHRyaXBsZTtcbiAgICBsZXQgZjEsIGYyO1xuICAgIGlmIChNYXRoLnJhbmRvbSgpPDAuNSkge1xuICAgICAgZjEgPSByYW5kUHl0aGFnMm1uLCBmMj1yYW5kUHl0aGFnbm5fbW07XG4gICAgfSBlbHNlIHtcbiAgICAgIGYyID0gcmFuZFB5dGhhZzJtbiwgZjE9cmFuZFB5dGhhZ25uX21tO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgdHJpcGxlID0gZjEoYSxtYXgpO1xuICAgIH0gY2F0Y2goZXJyKSB7XG4gICAgICB0cmlwbGUgPSBmMihhLG1heCk7XG4gICAgfSBcbiAgICByZXR1cm4gdHJpcGxlO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJhbmRQeXRoYWcybW4oYTogbnVtYmVyLG1heDogbnVtYmVyKSB7XG4gIC8vIGFzc3VtZXMgYSBpcyAybW4sIGZpbmRzIGFwcHJvcHJpYXRlIHBhcmFtZXRlcnNcbiAgLy8gbGV0IG0sbiBiZSBhIGZhY3RvciBwYWlyIG9mIGEvMlxuICBsZXQgZmFjdG9ycyA9IFtdOyAvL2ZhY3RvcnMgb2YgblxuICBjb25zdCBtYXhtID0gTWF0aC5zcXJ0KGEvMik7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gIGZvciAobGV0IG09MTsgbTxtYXhtOyBtKyspIHtcbiAgICBpZiAoIChhLzIpJW09PT0wICYmIG0qbSsoYSphKS8oNCptKm0pPD1tYXggKSB7XG4gICAgICBmYWN0b3JzLnB1c2gobSk7XG4gICAgfVxuICB9XG4gIGlmIChmYWN0b3JzLmxlbmd0aD09PTApIHRocm93IFwiMm1uIG5vIG9wdGlvbnNcIjtcblxuICBsZXQgbSA9IHJhbmRFbGVtKGZhY3RvcnMpO1xuICBsZXQgbiA9IGEvKDIqbSk7XG4gIHJldHVybiB7YTogMipuKm0sIGI6IE1hdGguYWJzKG4qbi1tKm0pLCBjOm4qbittKm19O1xufVxuXG5mdW5jdGlvbiByYW5kUHl0aGFnbm5fbW0oYTogbnVtYmVyLG1heDogbnVtYmVyKSB7XG4gIC8vIGFzc3VtZXMgYSA9IG5eMi1tXjJcbiAgLy8gbT1zcXJ0KGErbl4yKVxuICAvLyBjeWNsZSB0aHJvdWdoIDHiiaRt4omkc3FydCgobWF4LWEpLzIpXG4gIGxldCBwb3NzaWJsZXMgPSBbXTtcbiAgY29uc3QgbWF4bSA9IE1hdGguc3FydCgobWF4LWEpLzIpO1xuICBmb3IgKGxldCBtPTE7IG08PW1heG07IG0rKykge1xuICAgIGxldCBuID0gTWF0aC5zcXJ0KGErbSptKTtcbiAgICBpZiAobj09PU1hdGguZmxvb3IobikpIHBvc3NpYmxlcy5wdXNoKFtuLG1dKTtcbiAgfVxuICBpZiAocG9zc2libGVzLmxlbmd0aD09PTApIHRocm93IFwibl4yLW1eMiBubyBvcHRpb25zXCI7XG5cbiAgbGV0IFtuLG1dID0gcmFuZEVsZW0ocG9zc2libGVzKTtcblxuICByZXR1cm4ge2E6IG4qbi1tKm0sIGI6IDIqbiptLCBjOiBuKm4rbSptfTtcbn1cblxuLyogTWF0aHMgKi9cbmV4cG9ydCBmdW5jdGlvbiByb3VuZFRvVGVuIChuOiBudW1iZXIpIHtcbiAgcmV0dXJuIE1hdGgucm91bmQobiAvIDEwKSAqIDEwXG59XG5cbi8qKlxuICogUm91bmRzIGEgbnVtYmVyIHRvIGEgZ2l2ZW4gbnVtYmVyIG9mIGRlY2ltYWwgcGxhY2VzXG4gKiBAcGFyYW0ge251bWJlcn0geCBUaGUgbnVtYmVyIHRvIHJvdW5kXG4gKiBAcGFyYW0ge251bWJlcn0gbiBUaGUgbnVtYmVyIG9mIGRlY2ltYWwgcGxhY2VzXG4gKiBAcmV0dXJucyB7bnVtYmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcm91bmREUCAoeDogbnVtYmVyLCBuOiBudW1iZXIpOiBudW1iZXIge1xuICByZXR1cm4gTWF0aC5yb3VuZCh4ICogTWF0aC5wb3coMTAsIG4pKSAvIE1hdGgucG93KDEwLCBuKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVnVG9SYWQgKHg6IG51bWJlcikge1xuICByZXR1cm4geCAqIE1hdGguUEkgLyAxODBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNpbkRlZyAoeDogbnVtYmVyKSB7XG4gIHJldHVybiBNYXRoLnNpbih4ICogTWF0aC5QSSAvIDE4MClcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvc0RlZyAoeDogbnVtYmVyKSB7XG4gIHJldHVybiBNYXRoLmNvcyh4ICogTWF0aC5QSSAvIDE4MClcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGluZyBuLzEwXmRwXG4gKiBFLmcuIHNjYWxlZFN0cigzMTQsMikgPSBcIjMuMTRcIlxuICogQHBhcmFtIHtudW1iZXJ9IG4gQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIGRpZ2l0cyBvZiBhIGZpeGVkIHBvaW50IG51bWJlclxuICogQHBhcmFtIHtudW1iZXJ9IGRwIEFuIGludGVnZXIgZm9yIG51bWJlciBvZiBkZWNpbWFsIHBsYWNlc1xuICogQHJldHVybnMge3N0cmluZ31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNjYWxlZFN0ciAobjogbnVtYmVyLCBkcDogbnVtYmVyKTogc3RyaW5nIHtcbiAgaWYgKGRwID09PSAwKSByZXR1cm4gbi50b1N0cmluZygpXG4gIGNvbnN0IGZhY3RvciA9IE1hdGgucG93KDEwLCBkcClcbiAgY29uc3QgaW50cGFydCA9IE1hdGguZmxvb3IobiAvIGZhY3RvcilcbiAgY29uc3QgZGVjcGFydCA9IG4gJSBmYWN0b3JcbiAgaWYgKGRlY3BhcnQgPT09IDApIHtcbiAgICByZXR1cm4gaW50cGFydC50b1N0cmluZygpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGludHBhcnQgKyAnLicgKyBkZWNwYXJ0XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdjZCAoYTogbnVtYmVyLCBiOiBudW1iZXIpIDogbnVtYmVyIHtcbiAgLy8gdGFrZW4gZnJvbSBmcmFjdGlvbi5qc1xuICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICBpZiAoIWIpIHsgcmV0dXJuIGEgfVxuXG4gIHdoaWxlICgxKSB7XG4gICAgYSAlPSBiXG4gICAgaWYgKCFhKSB7IHJldHVybiBiIH1cbiAgICBiICU9IGFcbiAgICBpZiAoIWIpIHsgcmV0dXJuIGEgfVxuICB9XG4gIHJldHVybiAwIC8vIHVucmVhY2hhYmxlLCBhbmQgbWF0aGVtYXRpY2FsbHkgZ3VhcmFudGVlZCBub3QgdG8gaGFwcGVuLCBidXQgbWFrZXMgdHlwZXNjcmlwdCBxdWVpdFxufVxuXG5leHBvcnQgZnVuY3Rpb24gbGNtIChhOiBudW1iZXIsIGI6IG51bWJlcikge1xuICByZXR1cm4gYSAqIGIgLyBnY2QoYSwgYilcbn1cblxuLyogQXJyYXlzIGFuZCBzaW1pbGFyICovXG5cbmZ1bmN0aW9uIGlzQXJyYXlPZk51bWJlcnMoYXJyOiB1bmtub3duW10pIDogYXJyIGlzIG51bWJlcltdIHtcbiAgcmV0dXJuICh0eXBlb2YgYXJyWzBdID09PSAnbnVtYmVyJylcbn1cblxuLyoqXG4gKiBTb3J0cyB0d28gYXJyYXlzIHRvZ2V0aGVyIGJhc2VkIG9uIHNvcnRpbmcgYXJyMFxuICogQHBhcmFtIHsqW119IGFycjBcbiAqIEBwYXJhbSB7KltdfSBhcnIxXG4gKiBAcGFyYW0geyp9IGZcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNvcnRUb2dldGhlciAoYXJyMCA6IHVua25vd25bXSwgYXJyMTogdW5rbm93bltdLCBmOiAoeDogdW5rbm93biwgeTp1bmtub3duKT0+bnVtYmVyKSA6IFt1bmtub3duW10sdW5rbm93bltdXSB7XG4gIGlmIChhcnIwLmxlbmd0aCAhPT0gYXJyMS5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb3RoIGFyZ3VtZW50cyBtdXN0IGJlIGFycmF5cyBvZiB0aGUgc2FtZSBsZW5ndGgnKVxuICB9XG5cbiAgaWYgKCFmKSB7XG4gICAgZiA9IGYgfHwgKCh4LCB5KSA9PiAoeCBhcyBudW1iZXIpIC0gKHkgYXMgbnVtYmVyKSlcbiAgfVxuXG4gIGNvbnN0IG4gPSBhcnIwLmxlbmd0aFxuICBjb25zdCBjb21iaW5lZCA9IFtdXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgY29tYmluZWRbaV0gPSBbYXJyMFtpXSwgYXJyMVtpXV1cbiAgfVxuXG4gIGNvbWJpbmVkLnNvcnQoKHgsIHkpID0+IGYoeFswXSwgeVswXSkpXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICBhcnIwW2ldID0gY29tYmluZWRbaV1bMF1cbiAgICBhcnIxW2ldID0gY29tYmluZWRbaV1bMV1cbiAgfVxuXG4gIHJldHVybiBbYXJyMCwgYXJyMV1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGU8VD4gKGFycmF5OiBUW10pIHtcbiAgLy8gS251dGgtRmlzaGVyLVlhdGVzXG4gIC8vIGZyb20gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzI0NTA5NzYvMzczNzI5NVxuICAvLyBuYi4gc2h1ZmZsZXMgaW4gcGxhY2VcbiAgdmFyIGN1cnJlbnRJbmRleCA9IGFycmF5Lmxlbmd0aDsgdmFyIHRlbXBvcmFyeVZhbHVlOyB2YXIgcmFuZG9tSW5kZXhcblxuICAvLyBXaGlsZSB0aGVyZSByZW1haW4gZWxlbWVudHMgdG8gc2h1ZmZsZS4uLlxuICB3aGlsZSAoY3VycmVudEluZGV4ICE9PSAwKSB7XG4gICAgLy8gUGljayBhIHJlbWFpbmluZyBlbGVtZW50Li4uXG4gICAgcmFuZG9tSW5kZXggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjdXJyZW50SW5kZXgpXG4gICAgY3VycmVudEluZGV4IC09IDFcblxuICAgIC8vIEFuZCBzd2FwIGl0IHdpdGggdGhlIGN1cnJlbnQgZWxlbWVudC5cbiAgICB0ZW1wb3JhcnlWYWx1ZSA9IGFycmF5W2N1cnJlbnRJbmRleF1cbiAgICBhcnJheVtjdXJyZW50SW5kZXhdID0gYXJyYXlbcmFuZG9tSW5kZXhdXG4gICAgYXJyYXlbcmFuZG9tSW5kZXhdID0gdGVtcG9yYXJ5VmFsdWVcbiAgfVxuXG4gIHJldHVybiBhcnJheVxufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBhIGlzIGFuIGFycmF5IGNvbnRhaW5pbmcgZSwgZmFsc2Ugb3RoZXJ3aXNlIChpbmNsdWRpbmcgaWYgYSBpcyBub3QgYW4gYXJyYXkpXG4gKiBAcGFyYW0geyp9IGEgIEFuIGFycmF5XG4gKiBAcGFyYW0geyp9IGUgQW4gZWxlbWVudCB0byBjaGVjayBpZiBpcyBpbiB0aGUgYXJyYXlcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5leHBvcnQgZnVuY3Rpb24gd2Vha0luY2x1ZGVzIChhOiB1bmtub3duLCBlOnVua25vd24pIDogYm9vbGVhbiB7XG4gIHJldHVybiAoQXJyYXkuaXNBcnJheShhKSAmJiBhLmluY2x1ZGVzKGUpKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlyc3RVbmlxdWVJbmRleDxUPiAoYXJyYXk6VFtdKTogbnVtYmVyIHtcbiAgLy8gcmV0dXJucyBpbmRleCBvZiBmaXJzdCB1bmlxdWUgZWxlbWVudFxuICAvLyBpZiBub25lLCByZXR1cm5zIGxlbmd0aCBvZiBhcnJheVxuICBsZXQgaSA9IDBcbiAgd2hpbGUgKGkgPCBhcnJheS5sZW5ndGgpIHtcbiAgICBpZiAoYXJyYXkuaW5kZXhPZihhcnJheVtpXSkgPT09IGFycmF5Lmxhc3RJbmRleE9mKGFycmF5W2ldKSkge1xuICAgICAgYnJlYWtcbiAgICB9XG4gICAgaSsrXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJvb2xPYmplY3RUb0FycmF5PFQgZXh0ZW5kcyBzdHJpbmc+IChvYmo6IFJlY29yZDxULHVua25vd24+KSA6IFRbXSB7XG4gIC8vIEdpdmVuIGFuIG9iamVjdCB3aGVyZSBhbGwgdmFsdWVzIGFyZSBib29sZWFuLCByZXR1cm4ga2V5cyB3aGVyZSB0aGUgdmFsdWUgaXMgdHJ1ZVxuICBjb25zdCByZXN1bHQgPSBbXVxuICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHtcbiAgICBpZiAob2JqW2tleV0pIHJlc3VsdC5wdXNoKGtleSlcbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qIE9iamVjdCBwcm9wZXJ0eSBhY2Nlc3MgYnkgc3RyaW5nICovXG5leHBvcnQgZnVuY3Rpb24gcHJvcEJ5U3RyaW5nIChvOiBSZWNvcmQ8c3RyaW5nLHVua25vd24+LCBzOiBzdHJpbmcsIHg6IHVua25vd24pIHtcbiAgLyogRS5nLiBieVN0cmluZyhteU9iaixcImZvby5iYXJcIikgLT4gbXlPYmouZm9vLmJhclxuICAgICAqIGJ5U3RyaW5nKG15T2JqLFwiZm9vLmJhclwiLFwiYmF6XCIpIC0+IG15T2JqLmZvby5iYXIgPSBcImJhelwiXG4gICAgICovXG4gIHMgPSBzLnJlcGxhY2UoL1xcWyhcXHcrKVxcXS9nLCAnLiQxJykgLy8gY29udmVydCBpbmRleGVzIHRvIHByb3BlcnRpZXNcbiAgcyA9IHMucmVwbGFjZSgvXlxcLi8sICcnKSAvLyBzdHJpcCBhIGxlYWRpbmcgZG90XG4gIHZhciBhID0gcy5zcGxpdCgnLicpXG4gIGZvciAodmFyIGkgPSAwLCBuID0gYS5sZW5ndGggLSAxOyBpIDwgbjsgKytpKSB7XG4gICAgdmFyIGsgPSBhW2ldXG4gICAgaWYgKGsgaW4gbykge1xuICAgICAgbyA9IG9ba10gYXMgUmVjb3JkPHN0cmluZyx1bmtub3duPlxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gIH1cbiAgaWYgKHggPT09IHVuZGVmaW5lZCkgcmV0dXJuIG9bYVtuXV1cbiAgZWxzZSBvW2Fbbl1dID0geFxufVxuXG4vKiBMb2dpYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1JZiAocDogYm9vbGVhbiwgcTogYm9vbGVhbikgeyAvLyBtYXRlcmlhbCBjb25kaXRpb25hbFxuICByZXR1cm4gKCFwIHx8IHEpXG59XG5cbi8qIERPTSBtYW5pcHVsYXRpb24gYW5kIHF1ZXJ5aW5nICovXG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBIVE1MIGVsZW1lbnQsIHNldHMgY2xhc3NlcyBhbmQgYXBwZW5kc1xuICogQHBhcmFtIHtzdHJpbmd9IHRhZ05hbWUgVGFnIG5hbWUgb2YgZWxlbWVudFxuICogQHBhcmFtIHtzdHJpbmd8dW5kZWZpbmVkfSBbY2xhc3NOYW1lXSBBIGNsYXNzIG9yIGNsYXNzZXMgdG8gYXNzaWduIHRvIHRoZSBlbGVtZW50XG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBbcGFyZW50XSBBIHBhcmVudCBlbGVtZW50IHRvIGFwcGVuZCB0aGUgZWxlbWVudCB0b1xuICogQHJldHVybnMge0hUTUxFbGVtZW50fVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRWxlbSAodGFnTmFtZTogc3RyaW5nLCBjbGFzc05hbWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgcGFyZW50PzogSFRNTEVsZW1lbnQpOiBIVE1MRWxlbWVudCB7XG4gIC8vIGNyZWF0ZSwgc2V0IGNsYXNzIGFuZCBhcHBlbmQgaW4gb25lXG4gIGNvbnN0IGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpXG4gIGlmIChjbGFzc05hbWUpIGVsZW0uY2xhc3NOYW1lID0gY2xhc3NOYW1lXG4gIGlmIChwYXJlbnQpIHBhcmVudC5hcHBlbmRDaGlsZChlbGVtKVxuICByZXR1cm4gZWxlbVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFzQW5jZXN0b3JDbGFzcyAoZWxlbTogSFRNTEVsZW1lbnR8bnVsbCwgY2xhc3NOYW1lOiBzdHJpbmcpIHtcbiAgLy8gY2hlY2sgaWYgYW4gZWxlbWVudCBlbGVtIG9yIGFueSBvZiBpdHMgYW5jZXN0b3JzIGhhcyBjbHNzXG4gIGxldCByZXN1bHQgPSBmYWxzZVxuICBmb3IgKDtlbGVtICYmIGVsZW0ucGFyZW50Tm9kZTsgZWxlbSA9IGVsZW0ucGFyZW50RWxlbWVudCkgeyAvLyB0cmF2ZXJzZSBET00gdXB3YXJkc1xuICAgIGlmIChlbGVtLmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpKSB7XG4gICAgICByZXN1bHQgPSB0cnVlXG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHRcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIGlmIHR3byBlbGVtZW50cyBvdmVybGFwXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtMSBBbiBIVE1MIGVsZW1lbnRcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW0yIEFuIEhUTUwgZWxlbWVudFxuICovXG5mdW5jdGlvbiBvdmVybGFwKCBlbGVtMTogSFRNTEVsZW1lbnQsIGVsZW0yOiBIVE1MRWxlbWVudCkge1xuICBjb25zdCByZWN0MSA9IGVsZW0xLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpXG4gIGNvbnN0IHJlY3QyID0gZWxlbTIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcbiAgcmV0dXJuICEocmVjdDEucmlnaHQgPCByZWN0Mi5sZWZ0IHx8IFxuICAgICAgICAgICByZWN0MS5sZWZ0ID4gcmVjdDIucmlnaHQgfHwgXG4gICAgICAgICAgIHJlY3QxLmJvdHRvbSA8IHJlY3QyLnRvcCB8fCBcbiAgICAgICAgICAgcmVjdDEudG9wID4gcmVjdDIuYm90dG9tKVxufVxuXG4vKipcbiAqIElmIGVsZW0xIGFuZCBlbGVtMiBvdmVybGFwLCBtb3ZlIHRoZW0gYXBhcnQgdW50aWwgdGhleSBkb24ndC5cbiAqIE9ubHkgd29ya3MgZm9yIHRob3NlIHdpdGggcG9zaXRpb246YWJzb2x1dGVcbiAqIFRoaXMgc3RyaXBzIHRyYW5zZm9ybWF0aW9ucywgd2hpY2ggbWF5IGJlIGEgcHJvYmxlbVxuICogRWxlbWVudHMgd2l0aCBjbGFzcyAncmVwZWwtbG9ja2VkJyB3aWxsIG5vdCBiZSBtb3ZlZFxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbTEgQW4gSFRNTCBlbGVtZW50XG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtMiBBbiBIVE1MIGVsZW1lbnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlcGVsRWxlbWVudHMoZWxlbTE6IEhUTUxFbGVtZW50LCBlbGVtMjogSFRNTEVsZW1lbnQpICB7XG4gIGlmICghb3ZlcmxhcChlbGVtMSxlbGVtMikpIHJldHVyblxuICBpZiAoZ2V0Q29tcHV0ZWRTdHlsZShlbGVtMSkucG9zaXRpb24gIT09IFwiYWJzb2x1dGVcIiB8fCBnZXRDb21wdXRlZFN0eWxlKGVsZW0yKS5wb3NpdGlvbiAhPT0gJ2Fic29sdXRlJykgdGhyb3cgbmV3IEVycm9yICgnT25seSBjYWxsIG9uIHBvc2l0aW9uOmFic29sdXRlJylcbiAgbGV0IHRsMSA9IFBvaW50LmZyb21FbGVtZW50KGVsZW0xKVxuICBsZXQgdGwyID0gUG9pbnQuZnJvbUVsZW1lbnQoZWxlbTIpXG4gIFxuICBjb25zdCBjMSA9IFBvaW50LmZyb21FbGVtZW50KGVsZW0xLCBcImNlbnRlclwiKVxuICBjb25zdCBjMiA9IFBvaW50LmZyb21FbGVtZW50KGVsZW0yLCBcImNlbnRlclwiKVxuICBjb25zdCB2ZWMgPSBQb2ludC51bml0VmVjdG9yKGMxLGMyKVxuXG4gIGNvbnN0IGxvY2tlZDEgPSBlbGVtMS5jbGFzc0xpc3QuY29udGFpbnMoJ3JlcGVsLWxvY2tlZCcpXG4gIGNvbnN0IGxvY2tlZDIgPSBlbGVtMi5jbGFzc0xpc3QuY29udGFpbnMoJ3JlcGVsLWxvY2tlZCcpXG5cbiAgbGV0IGkgPSAwXG4gIHdoaWxlKG92ZXJsYXAoZWxlbTEsZWxlbTIpICYmIGk8NTAwKSB7XG4gICAgaWYgKCFsb2NrZWQxKSB0bDEudHJhbnNsYXRlKC12ZWMueCwtdmVjLnkpXG4gICAgaWYgKCFsb2NrZWQyKSB0bDIudHJhbnNsYXRlKHZlYy54LHZlYy55KVxuICAgIGVsZW0xLnN0eWxlLmxlZnQgPSB0bDEueCArIFwicHhcIlxuICAgIGVsZW0xLnN0eWxlLnRvcCA9IHRsMS55ICsgXCJweFwiXG4gICAgZWxlbTEuc3R5bGUudHJhbnNmb3JtID0gXCJub25lXCJcbiAgICBlbGVtMi5zdHlsZS5sZWZ0ID0gdGwyLnggKyBcInB4XCJcbiAgICBlbGVtMi5zdHlsZS50b3AgPSB0bDIueSArIFwicHhcIlxuICAgIGVsZW0yLnN0eWxlLnRyYW5zZm9ybSA9IFwibm9uZVwiXG4gICAgaSsrXG4gIH1cbiAgaWYgKGk9PT01MDApIHRocm93IG5ldyBFcnJvcignVG9vIG11Y2ggbW92aW5nJylcbiAgY29uc29sZS5sb2coYFJlcGVsbGVkIHdpdGggJHtpfSBpdGVyYXRpb25zYClcbn1cblxuLyogQ2FudmFzIGRyYXdpbmcgKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXNoZWRMaW5lIChjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgeDE6IG51bWJlciwgeTE6IG51bWJlciwgeDI6IG51bWJlciwgeTI6IG51bWJlcikge1xuICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHgyIC0geDEsIHkyIC0geTEpXG4gIGNvbnN0IGRhc2h4ID0gKHkxIC0geTIpIC8gbGVuZ3RoIC8vIHVuaXQgdmVjdG9yIHBlcnBlbmRpY3VsYXIgdG8gbGluZVxuICBjb25zdCBkYXNoeSA9ICh4MiAtIHgxKSAvIGxlbmd0aFxuICBjb25zdCBtaWR4ID0gKHgxICsgeDIpIC8gMlxuICBjb25zdCBtaWR5ID0gKHkxICsgeTIpIC8gMlxuXG4gIC8vIGRyYXcgdGhlIGJhc2UgbGluZVxuICBjdHgubW92ZVRvKHgxLCB5MSlcbiAgY3R4LmxpbmVUbyh4MiwgeTIpXG5cbiAgLy8gZHJhdyB0aGUgZGFzaFxuICBjdHgubW92ZVRvKG1pZHggKyA1ICogZGFzaHgsIG1pZHkgKyA1ICogZGFzaHkpXG4gIGN0eC5saW5lVG8obWlkeCAtIDUgKiBkYXNoeCwgbWlkeSAtIDUgKiBkYXNoeSlcblxuICBjdHgubW92ZVRvKHgyLCB5Milcbn1cbiIsImltcG9ydCB7IE9wdGlvbnNTcGVjLCBPcHRpb24gYXMgT3B0aW9uSSwgU2VsZWN0RXhjbHVzaXZlT3B0aW9uLCBTZWxlY3RJbmNsdXNpdmVPcHRpb24sIFJlYWxPcHRpb24sIFJhbmdlT3B0aW9uLCBJbnRlZ2VyT3B0aW9uLCBCb29sZWFuT3B0aW9uIH0gZnJvbSAnT3B0aW9uc1NwZWMnXG5pbXBvcnQgeyBjcmVhdGVFbGVtIH0gZnJvbSAndXRpbGl0aWVzJ1xuXG4vKiogIFJlY29yZHMgdHlwc2Ugb2Ygb3B0aW9uIGF2YWlsYWJpbHR5LCBhbmQgbGluayB0byBVSSBhbmQgZnVydGhlciBvcHRpb25zIHNldHMgKi9cbnR5cGUgT3B0aW9uc3BlYzIgPSAoT3B0aW9uc1NwZWNbMF0gJiB7IC8vIFN0YXJ0IHdpdGggc3RhbmRhcmQgb3B0aW9ucyBzcGVjIC0gdGFrZW4gZnJvbSBxdWVzdGlvbiBnZW5lcmF0b3IgY2xhc3Nlc1xuICBlbGVtZW50PzogSFRNTEVsZW1lbnQsIC8vIG1vc3Qgd2lsbCBhbHNvIGhhdmUgbGlua3MgdG8gYSBVSSBlbGVtZW50XG4gIHN1Yk9wdGlvbnNTZXQ/OiBPcHRpb25zU2V0IC8vIGZvciBvcHRpb24udHlwZT1cInN1Ym9wdGlvbnNcIiwgaG9sZCBsaW5rIHRvIHRoZSBPcHRpb25zU2V0IGZvciB0aGF0XG59KVtdXG5cbi8qKlxuICogQSBzaW1wbGUgb2JqZWN0IHJlcHJlc2VudGluZyBvcHRpb25zIHRvIHNlbmQgdG8gYSBxdWVzdGlvbiBnZW5lcmF0b3JcbiAqIE5CLiBUaGlzIGlzIGEgdmVyeSAnbG9vc2UnIHR5cGVcbiAqL1xuaW50ZXJmYWNlIE9wdGlvbnMge1xuICBba2V5OiBzdHJpbmddOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgc3RyaW5nW10gfCBPcHRpb25zXG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIHNldCBvZiBvcHRpb25zLCB3aXRoIGxpbmsgdG8gVUkgZWxlbWVudHMuIFN0b3JlcyBpbnRlcm5hbGx5IHRoZSBvcHRpb25zXG4gKiBpbiBhIHNpbXBsZSBvYmplY3Qgc3VpdGFibGUgZm9yIHBhc3NpbmcgdG8gcXVlc3Rpb24gZ2VuZXJhdG9yc1xuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBPcHRpb25zU2V0IHtcbiAgb3B0aW9uc1NwZWMgOiBPcHRpb25zcGVjMlxuICBvcHRpb25zIDogT3B0aW9uc1xuICB0ZW1wbGF0ZT8gOiBzdHJpbmdcbiAgZ2xvYmFsSWQ6IHN0cmluZ1xuICBzdGF0aWMgaWRDb3VudGVyID0gMCAvLyBpbmNyZW1lbnQgZWFjaCB0aW1lIHRvIGNyZWF0ZSB1bmlxdWUgaWRzIHRvIHVzZSBpbiBpZHMvbmFtZXMgb2YgZWxlbWVudHNcblxuICBzdGF0aWMgZ2V0SWQgKCk6IHN0cmluZyB7XG4gICAgaWYgKE9wdGlvbnNTZXQuaWRDb3VudGVyID49IDI2ICoqIDIpIHRocm93IG5ldyBFcnJvcignVG9vIG1hbnkgb3B0aW9ucyBvYmplY3RzIScpXG4gICAgY29uc3QgaWQgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKH5+KE9wdGlvbnNTZXQuaWRDb3VudGVyIC8gMjYpICsgOTcpICtcbiAgICAgIFN0cmluZy5mcm9tQ2hhckNvZGUoT3B0aW9uc1NldC5pZENvdW50ZXIgJSAyNiArIDk3KVxuXG4gICAgT3B0aW9uc1NldC5pZENvdW50ZXIgKz0gMVxuXG4gICAgcmV0dXJuIGlkXG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IG9wdGlvbnMgc3BlY1xuICAgKiBAcGFyYW0gb3B0aW9uc1NwZWMgU3BlY2lmaWNhdGlvbiBvZiBvcHRpb25zXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZSBBIHRlbXBsYXRlIGZvciBkaXNwbGF5aW5nIG9wdGlvbnMsIHVzaW5nIHt7bXVzdGFjaGV9fSBzeW50YXhcbiAgICovXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zU3BlYyA6IE9wdGlvbnNTcGVjLCB0ZW1wbGF0ZT8gOiBzdHJpbmcpIHtcbiAgICB0aGlzLm9wdGlvbnNTcGVjID0gb3B0aW9uc1NwZWMgYXMgT3B0aW9uc3BlYzJcblxuICAgIHRoaXMub3B0aW9ucyA9IHt9XG4gICAgdGhpcy5vcHRpb25zU3BlYy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICBpZiAoaXNSZWFsT3B0aW9uKG9wdGlvbikgJiYgb3B0aW9uLnR5cGUgIT09ICdzdWJvcHRpb25zJyAmJiBvcHRpb24udHlwZSAhPT0gJ3JhbmdlJykge1xuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IG9wdGlvbi5kZWZhdWx0XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbi50eXBlID09PSAncmFuZ2UnKSB7XG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRMQl0gPSBvcHRpb24uZGVmYXVsdExCXG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRVQl0gPSBvcHRpb24uZGVmYXVsdFVCXG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbi50eXBlID09PSAnc3Vib3B0aW9ucycpIHsgLy8gUmVjdXJzaXZlbHkgYnVpbGQgc3Vib3B0aW9ucy4gVGVybWluYXRlcyBhcyBsb25nIGFzIG9wdGlvbnNTcGVjIGlzIG5vdCBjaXJjdWxhclxuICAgICAgICBvcHRpb24uc3ViT3B0aW9uc1NldCA9IG5ldyBPcHRpb25zU2V0KG9wdGlvbi5vcHRpb25zU3BlYylcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBvcHRpb24uc3ViT3B0aW9uc1NldC5vcHRpb25zXG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZSAvLyBodG1sIHRlbXBsYXRlIChvcHRpb25hbClcblxuICAgIC8vIHNldCBhbiBpZCBiYXNlZCBvbiBhIGNvdW50ZXIgLSB1c2VkIGZvciBuYW1lcyBvZiBmb3JtIGVsZW1lbnRzXG4gICAgdGhpcy5nbG9iYWxJZCA9IE9wdGlvbnNTZXQuZ2V0SWQoKVxuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIGFuIG9wdGlvbiwgZmluZCBpdHMgVUkgZWxlbWVudCBhbmQgdXBkYXRlIHRoZSBzdGF0ZSBmcm9tIHRoYXRcbiAgICogQHBhcmFtIHsqfSBvcHRpb24gQW4gZWxlbWVudCBvZiB0aGlzLm9wdGlvblNwZWMgb3IgYW4gaWRcbiAgICovXG4gIHVwZGF0ZVN0YXRlRnJvbVVJIChvcHRpb24gOiBPcHRpb25zcGVjMlswXSB8IHN0cmluZykgOiB2b2lkIHtcbiAgICAvLyBpbnB1dCAtIGVpdGhlciBhbiBlbGVtZW50IG9mIHRoaXMub3B0aW9uc1NwZWMgb3IgYW4gb3B0aW9uIGlkXG4gICAgaWYgKHR5cGVvZiAob3B0aW9uKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNvbnN0IG9wdGlvbnNTcGVjIDogT3B0aW9uc3BlYzJbMF0gfCB1bmRlZmluZWQgPSB0aGlzLm9wdGlvbnNTcGVjLmZpbmQoeCA9PiAoKHggYXMgT3B0aW9uSSkuaWQgPT09IG9wdGlvbikpXG4gICAgICBpZiAob3B0aW9uc1NwZWMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBvcHRpb24gPSBvcHRpb25zU3BlY1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBubyBvcHRpb24gd2l0aCBpZCAnJHtvcHRpb259J2ApXG4gICAgICB9XG4gICAgfVxuICAgIGlmICghb3B0aW9uLmVsZW1lbnQpIHRocm93IG5ldyBFcnJvcihgb3B0aW9uICR7KG9wdGlvbiBhcyBPcHRpb25JKS5pZH0gZG9lc24ndCBoYXZlIGEgVUkgZWxlbWVudGApXG5cbiAgICBzd2l0Y2ggKG9wdGlvbi50eXBlKSB7XG4gICAgICBjYXNlICdpbnQnOiB7XG4gICAgICAgIGNvbnN0IGlucHV0IDogSFRNTElucHV0RWxlbWVudCA9IG9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpWzBdXG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gTnVtYmVyKGlucHV0LnZhbHVlKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAnYm9vbCc6IHtcbiAgICAgICAgY29uc3QgaW5wdXQgOiBIVE1MSW5wdXRFbGVtZW50ID0gb3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JylbMF1cbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBpbnB1dC5jaGVja2VkXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdzZWxlY3QtZXhjbHVzaXZlJzoge1xuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IChvcHRpb24uZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdpbnB1dDpjaGVja2VkJykgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWVcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NlbGVjdC1pbmNsdXNpdmUnOiB7XG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID1cbiAgICAgICAgICAoQXJyYXkuZnJvbShvcHRpb24uZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dDpjaGVja2VkJykpIGFzIEhUTUxJbnB1dEVsZW1lbnRbXSkubWFwKHggPT4geC52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3JhbmdlJzoge1xuICAgICAgICBjb25zdCBpbnB1dExCIDogSFRNTElucHV0RWxlbWVudCA9IG9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpWzBdXG4gICAgICAgIGNvbnN0IGlucHV0VUIgOiBIVE1MSW5wdXRFbGVtZW50ID0gb3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JylbMV1cbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZExCXSA9IE51bWJlcihpbnB1dExCLnZhbHVlKVxuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkVUJdID0gTnVtYmVyKGlucHV0VUIudmFsdWUpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgb3B0aW9uIHdpdGggaWQgJHsob3B0aW9uIGFzIE9wdGlvbkkpLmlkfSBoYXMgdW5yZWNvZ25pc2VkIG9wdGlvbiB0eXBlICR7b3B0aW9uLnR5cGV9YClcbiAgICB9XG4gICAgY29uc29sZS5sb2codGhpcy5vcHRpb25zKVxuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIGEgc3RyaW5nLCByZXR1cm4gdGhlIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25zIHdpdGggdGhhdCBpZFxuICAgKiBAcGFyYW0gaWQgVGhlIGlkXG4gICAqL1xuXG4gIHVwZGF0ZVN0YXRlRnJvbVVJQWxsICgpOiB2b2lkIHtcbiAgICB0aGlzLm9wdGlvbnNTcGVjLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgIGlmIChpc1JlYWxPcHRpb24ob3B0aW9uKSkge1xuICAgICAgICB0aGlzLnVwZGF0ZVN0YXRlRnJvbVVJKG9wdGlvbilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZGlzYWJsZU9yRW5hYmxlQWxsICgpOiB2b2lkIHtcbiAgICB0aGlzLm9wdGlvbnNTcGVjLmZvckVhY2gob3B0aW9uID0+IHRoaXMuZGlzYWJsZU9yRW5hYmxlKG9wdGlvbikpXG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYW4gb3B0aW9uLCBlbmFibGUgdGhlIFVJIGVsZW1lbnRzIGlmIGFuZCBvbmx5IGlmIGFsbCB0aGUgYm9vbGVhblxuICAgKiBvcHRpb25zIGluIG9wdGlvbi5lbmFibGVkSWYgYXJlIHRydWVcbiAgICogQHBhcmFtIG9wdGlvbiBBbiBlbGVtZW50IG9mIHRoaXMub3B0aW9uc1NwZWMgb3IgYW4gb3B0aW9uIGlkXG4gICAqL1xuICBkaXNhYmxlT3JFbmFibGUgKG9wdGlvbiA6IHN0cmluZyB8IE9wdGlvbnNwZWMyWzBdKTogdm9pZCB7XG4gICAgaWYgKHR5cGVvZiAob3B0aW9uKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNvbnN0IHRlbXBPcHRpb24gOiBPcHRpb25zcGVjMlswXSB8IHVuZGVmaW5lZCA9IHRoaXMub3B0aW9uc1NwZWMuZmluZCh4ID0+IChpc1JlYWxPcHRpb24oeCkgJiYgeC5pZCA9PT0gb3B0aW9uKSlcbiAgICAgIGlmICh0ZW1wT3B0aW9uICE9PSB1bmRlZmluZWQpIHsgb3B0aW9uID0gdGVtcE9wdGlvbiB9IGVsc2UgeyB0aHJvdyBuZXcgRXJyb3IoYG5vIG9wdGlvbiB3aXRoIGlkICcke29wdGlvbn0nYCkgfVxuICAgIH1cblxuICAgIGlmICghaXNSZWFsT3B0aW9uKG9wdGlvbikgfHwgIW9wdGlvbi5lbmFibGVkSWYgfHwgb3B0aW9uLmVsZW1lbnQgPT09IHVuZGVmaW5lZCkgcmV0dXJuXG5cbiAgICBjb25zdCBlbmFibGVyTGlzdCA9IG9wdGlvbi5lbmFibGVkSWYuc3BsaXQoJyYnKSAvL1xuICAgIGxldCBlbmFibGUgPSB0cnVlIC8vIHdpbGwgZGlzYWJsZSBpZiBqdXN0IG9uZSBvZiB0aGUgZWxlbWVudHMgb2YgZW5hYmxlckxpc3QgaXMgZmFsc2VcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZW5hYmxlckxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBlbmFibGVySWQgPSBlbmFibGVyTGlzdFtpXVxuICAgICAgbGV0IG5lZ2F0ZSA9IGZhbHNlIC8vIGlmIGl0IHN0YXJ0cyB3aXRoICEsIG5lZ2F0aXZlIG91dHB1dFxuICAgICAgaWYgKGVuYWJsZXJJZC5zdGFydHNXaXRoKCchJykpIHtcbiAgICAgICAgbmVnYXRlID0gdHJ1ZVxuICAgICAgICBlbmFibGVySWQgPSBlbmFibGVySWQuc2xpY2UoMSlcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB0aGlzLm9wdGlvbnNbZW5hYmxlcklkXSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAnZW5hYmxlZElmJzogJHtlbmFibGVySWR9IGlzIG5vdCBhIGJvb2xlYW4gb3B0aW9uYClcbiAgICAgIH1cblxuICAgICAgY29uc3QgZW5hYmxlclZhbHVlIDogYm9vbGVhbiA9IHRoaXMub3B0aW9uc1tlbmFibGVySWRdIGFzIGJvb2xlYW4gLy8hID09IG5lZ2F0ZSAvLyAhPT0gZXF1aXZhbGVudCB0byBYT1JcblxuICAgICAgaWYgKCFlbmFibGVyVmFsdWUpIHtcbiAgICAgICAgZW5hYmxlID0gZmFsc2VcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZW5hYmxlKSB7XG4gICAgICBvcHRpb24uZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKCdkaXNhYmxlZCcpXG4gICAgICA7Wy4uLm9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpXS5mb3JFYWNoKGUgPT4geyBlLmRpc2FibGVkID0gZmFsc2UgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9uLmVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnZGlzYWJsZWQnKVxuICAgICAgO1suLi5vcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKV0uZm9yRWFjaChlID0+IHsgZS5kaXNhYmxlZCA9IHRydWUgfSlcbiAgICB9XG4gIH1cblxuICByZW5kZXJJbiAoZWxlbWVudDogSFRNTEVsZW1lbnQsIHVsRXh0cmFDbGFzcz8gOiBzdHJpbmcpIDogSFRNTEVsZW1lbnQge1xuICAgIGNvbnN0IGxpc3QgPSBjcmVhdGVFbGVtKCd1bCcsICdvcHRpb25zLWxpc3QnKVxuICAgIGlmICh1bEV4dHJhQ2xhc3MpIGxpc3QuY2xhc3NMaXN0LmFkZCh1bEV4dHJhQ2xhc3MpXG4gICAgbGV0IGNvbHVtbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdvcHRpb25zLWNvbHVtbicsIGxpc3QpXG5cbiAgICB0aGlzLm9wdGlvbnNTcGVjLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgIGlmIChvcHRpb24udHlwZSA9PT0gJ2NvbHVtbi1icmVhaycpIHsgLy8gc3RhcnQgbmV3IGNvbHVtblxuICAgICAgICBjb2x1bW4gPSBjcmVhdGVFbGVtKCdkaXYnLCAnb3B0aW9ucy1jb2x1bW4nLCBsaXN0KVxuICAgICAgfSBlbHNlIGlmIChvcHRpb24udHlwZSA9PT0gJ3N1Ym9wdGlvbnMnKSB7XG4gICAgICAgIGNvbnN0IHN1Yk9wdGlvbnNTZXQgPSBvcHRpb24uc3ViT3B0aW9uc1NldFxuICAgICAgICBpZiAoc3ViT3B0aW9uc1NldCA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoJ1RoaXMgc2hvdWxkIG5vdCBoYXBwZW4hJylcbiAgICAgICAgY29uc3Qgc3ViT3B0aW9uc0VsZW1lbnQgPSBzdWJPcHRpb25zU2V0LnJlbmRlckluKGNvbHVtbiwgJ3N1Ym9wdGlvbnMnKVxuICAgICAgICBvcHRpb24uZWxlbWVudCA9IHN1Yk9wdGlvbnNFbGVtZW50XG4gICAgICB9IGVsc2UgeyAvLyBtYWtlIGxpc3QgaXRlbVxuICAgICAgICBjb25zdCBsaSA9IGNyZWF0ZUVsZW0oJ2xpJywgdW5kZWZpbmVkLCBjb2x1bW4pXG4gICAgICAgIGlmIChpc1JlYWxPcHRpb24ob3B0aW9uKSkge1xuICAgICAgICAgIGxpLmRhdGFzZXQub3B0aW9uSWQgPSBvcHRpb24uaWRcbiAgICAgICAgfVxuXG4gICAgICAgIHN3aXRjaCAob3B0aW9uLnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdoZWFkaW5nJzpcbiAgICAgICAgICAgIHJlbmRlckhlYWRpbmcob3B0aW9uLnRpdGxlLCBsaSlcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAnaW50JzpcbiAgICAgICAgICBjYXNlICdib29sJzpcbiAgICAgICAgICAgIHJlbmRlclNpbmdsZU9wdGlvbihvcHRpb24sIGxpKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdzZWxlY3QtaW5jbHVzaXZlJzpcbiAgICAgICAgICBjYXNlICdzZWxlY3QtZXhjbHVzaXZlJzpcbiAgICAgICAgICAgIHRoaXMucmVuZGVyTGlzdE9wdGlvbihvcHRpb24sIGxpKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdyYW5nZSc6XG4gICAgICAgICAgICByZW5kZXJSYW5nZU9wdGlvbihvcHRpb24sIGxpKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgICBsaS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgdGhpcy51cGRhdGVTdGF0ZUZyb21VSShvcHRpb24pXG4gICAgICAgICAgdGhpcy5kaXNhYmxlT3JFbmFibGVBbGwoKSB9KVxuICAgICAgICBvcHRpb24uZWxlbWVudCA9IGxpXG4gICAgICB9XG4gICAgfSlcbiAgICBlbGVtZW50LmFwcGVuZChsaXN0KVxuXG4gICAgdGhpcy5kaXNhYmxlT3JFbmFibGVBbGwoKVxuXG4gICAgcmV0dXJuIGxpc3RcbiAgfVxuXG4gIC8qIGVzbGludC1kaXNhYmxlICovXG4gIHJlbmRlcldpdGhUZW1wbGF0ZSAoZWxlbWVudCA6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgLy8gY3JlYXRlIGFwcHJvcHJpYXRlIG9iamVjdCBmb3IgbXVzdGFjaGVcbiAgICBsZXQgb3B0aW9uczogUmVjb3JkPHN0cmluZywgT3B0aW9uST5cbiAgICB0aGlzLm9wdGlvbnNTcGVjLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgIGlmIChpc1JlYWxPcHRpb24ob3B0aW9uKSkge1xuICAgICAgICBvcHRpb25zW29wdGlvbi5pZF0gPSBvcHRpb25cbiAgICAgIH1cbiAgICB9KVxuXG4gICAgY29uc3QgaHRtbFN0cmluZyA9IHRoaXMudGVtcGxhdGVcbiAgfVxuICAvKiBlc2xpbnQtZW5hYmxlICovXG5cbiAgcmVuZGVyTGlzdE9wdGlvbiAob3B0aW9uOiBTZWxlY3RFeGNsdXNpdmVPcHRpb24gfCBTZWxlY3RJbmNsdXNpdmVPcHRpb24sIGxpIDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBsaS5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIG9wdGlvbi50aXRsZSArICc6ICcpXG5cbiAgICBjb25zdCBzdWJsaXN0ID0gY3JlYXRlRWxlbSgndWwnLCAnb3B0aW9ucy1zdWJsaXN0JywgbGkpXG4gICAgaWYgKG9wdGlvbi52ZXJ0aWNhbCkgc3VibGlzdC5jbGFzc0xpc3QuYWRkKCdvcHRpb25zLXN1Ymxpc3QtdmVydGljYWwnKVxuXG4gICAgb3B0aW9uLnNlbGVjdE9wdGlvbnMuZm9yRWFjaChzZWxlY3RPcHRpb24gPT4ge1xuICAgICAgY29uc3Qgc3VibGlzdExpID0gY3JlYXRlRWxlbSgnbGknLCB1bmRlZmluZWQsIHN1Ymxpc3QpXG4gICAgICBjb25zdCBsYWJlbCA9IGNyZWF0ZUVsZW0oJ2xhYmVsJywgdW5kZWZpbmVkLCBzdWJsaXN0TGkpXG5cbiAgICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKVxuICAgICAgaW5wdXQudHlwZSA9IG9wdGlvbi50eXBlID09PSAnc2VsZWN0LWV4Y2x1c2l2ZScgPyAncmFkaW8nIDogJ2NoZWNrYm94J1xuICAgICAgaW5wdXQubmFtZSA9IHRoaXMuZ2xvYmFsSWQgKyAnLScgKyBvcHRpb24uaWRcbiAgICAgIGlucHV0LnZhbHVlID0gc2VsZWN0T3B0aW9uLmlkXG5cbiAgICAgIGlmIChvcHRpb24udHlwZSA9PT0gJ3NlbGVjdC1pbmNsdXNpdmUnKSB7IC8vIGRlZmF1bHRzIHdvcmsgZGlmZmVyZW50IGZvciBpbmNsdXNpdmUvZXhjbHVzaXZlXG4gICAgICAgIGlucHV0LmNoZWNrZWQgPSBvcHRpb24uZGVmYXVsdC5pbmNsdWRlcyhzZWxlY3RPcHRpb24uaWQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbnB1dC5jaGVja2VkID0gb3B0aW9uLmRlZmF1bHQgPT09IHNlbGVjdE9wdGlvbi5pZFxuICAgICAgfVxuXG4gICAgICBsYWJlbC5hcHBlbmQoaW5wdXQpXG5cbiAgICAgIGlucHV0LmNsYXNzTGlzdC5hZGQoJ29wdGlvbicpXG5cbiAgICAgIGxhYmVsLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgc2VsZWN0T3B0aW9uLnRpdGxlKVxuICAgIH0pXG4gIH1cbn1cblxuLyoqXG4gKiBSZW5kZXJzIGEgaGVhZGluZyBvcHRpb25cbiAqIEBwYXJhbSB7c3RyaW5nfSB0aXRsZSBUaGUgdGl0bGUgb2YgdGhlIGhlYWRpbmdcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGxpIFRoZSBlbGVtZW50IHRvIHJlbmRlciBpbnRvXG4gKi9cbmZ1bmN0aW9uIHJlbmRlckhlYWRpbmcgKHRpdGxlOiBzdHJpbmcsIGxpOiBIVE1MRWxlbWVudCkge1xuICBsaS5pbm5lckhUTUwgPSB0aXRsZVxuICBsaS5jbGFzc0xpc3QuYWRkKCdvcHRpb25zLWhlYWRpbmcnKVxufVxuXG4vKipcbiAqIFJlbmRlcnMgc2luZ2xlIHBhcmFtZXRlclxuICogQHBhcmFtIHsqfSBvcHRpb25cbiAqIEBwYXJhbSB7Kn0gbGlcbiAqL1xuZnVuY3Rpb24gcmVuZGVyU2luZ2xlT3B0aW9uIChvcHRpb246IEludGVnZXJPcHRpb24gfCBCb29sZWFuT3B0aW9uLCBsaTogSFRNTEVsZW1lbnQpIHtcbiAgY29uc3QgbGFiZWwgPSBjcmVhdGVFbGVtKCdsYWJlbCcsIHVuZGVmaW5lZCwgbGkpXG5cbiAgaWYgKCFvcHRpb24uc3dhcExhYmVsICYmIG9wdGlvbi50aXRsZSAhPT0gJycpIGxhYmVsLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgYCR7b3B0aW9uLnRpdGxlfTogYClcblxuICBjb25zdCBpbnB1dCA6IEhUTUxJbnB1dEVsZW1lbnQgPSBjcmVhdGVFbGVtKCdpbnB1dCcsICdvcHRpb24nLCBsYWJlbCkgYXMgSFRNTElucHV0RWxlbWVudFxuICBzd2l0Y2ggKG9wdGlvbi50eXBlKSB7XG4gICAgY2FzZSAnaW50JzpcbiAgICAgIGlucHV0LnR5cGUgPSAnbnVtYmVyJ1xuICAgICAgaW5wdXQubWluID0gb3B0aW9uLm1pbi50b1N0cmluZygpXG4gICAgICBpbnB1dC5tYXggPSBvcHRpb24ubWF4LnRvU3RyaW5nKClcbiAgICAgIGlucHV0LnZhbHVlID0gb3B0aW9uLmRlZmF1bHQudG9TdHJpbmcoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdib29sJzpcbiAgICAgIGlucHV0LnR5cGUgPSAnY2hlY2tib3gnXG4gICAgICBpbnB1dC5jaGVja2VkID0gb3B0aW9uLmRlZmF1bHRcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVHlwZXNjcmlwdCBpcyBwcmV0dHkgc3VyZSBJIGNhblxcJ3QgZ2V0IGhlcmUnKVxuICB9XG5cbiAgaWYgKG9wdGlvbi5zd2FwTGFiZWwgJiYgb3B0aW9uLnRpdGxlICE9PSAnJykgbGFiZWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLCBgICR7b3B0aW9uLnRpdGxlfWApXG59XG5cbmZ1bmN0aW9uIHJlbmRlclJhbmdlT3B0aW9uIChvcHRpb246IFJhbmdlT3B0aW9uLCBsaTogSFRNTEVsZW1lbnQpIHtcbiAgY29uc3QgbGFiZWwgPSBjcmVhdGVFbGVtKCdsYWJlbCcsIHVuZGVmaW5lZCwgbGkpXG4gIGNvbnN0IGlucHV0TEIgPSBjcmVhdGVFbGVtKCdpbnB1dCcsICdvcHRpb24nLCBsYWJlbCkgYXMgSFRNTElucHV0RWxlbWVudFxuICBpbnB1dExCLnR5cGUgPSAnbnVtYmVyJ1xuICBpbnB1dExCLm1pbiA9IG9wdGlvbi5taW4udG9TdHJpbmcoKVxuICBpbnB1dExCLm1heCA9IG9wdGlvbi5tYXgudG9TdHJpbmcoKVxuICBpbnB1dExCLnZhbHVlID0gb3B0aW9uLmRlZmF1bHRMQi50b1N0cmluZygpXG5cbiAgbGFiZWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLCBgICZsZXE7ICR7b3B0aW9uLnRpdGxlfSAmbGVxOyBgKVxuXG4gIGNvbnN0IGlucHV0VUIgPSBjcmVhdGVFbGVtKCdpbnB1dCcsICdvcHRpb24nLCBsYWJlbCkgYXMgSFRNTElucHV0RWxlbWVudFxuICBpbnB1dFVCLnR5cGUgPSAnbnVtYmVyJ1xuICBpbnB1dFVCLm1pbiA9IG9wdGlvbi5taW4udG9TdHJpbmcoKVxuICBpbnB1dFVCLm1heCA9IG9wdGlvbi5tYXgudG9TdHJpbmcoKVxuICBpbnB1dFVCLnZhbHVlID0gb3B0aW9uLmRlZmF1bHRVQi50b1N0cmluZygpXG59XG5cbi8qKiBEZXRlcm1pbmVzIGlmIGFuIG9wdGlvbiBpbiBPcHRpb25zU3BlYyBpcyBhIHJlYWwgb3B0aW9uIGFzIG9wcG9zZWQgdG9cbiAqIGEgaGVhZGluZyBvciBjb2x1bW4gYnJlYWtcbiAqL1xuZnVuY3Rpb24gaXNSZWFsT3B0aW9uIChvcHRpb24gOiBPcHRpb25zU3BlY1swXSkgOiBvcHRpb24gaXMgUmVhbE9wdGlvbiB7XG4gIHJldHVybiAob3B0aW9uIGFzIE9wdGlvbkkpLmlkICE9PSB1bmRlZmluZWRcbn1cblxuY29uc3QgZGVtb1NwZWMgOiBPcHRpb25zU3BlYyA9IFtcbiAge1xuICAgIHRpdGxlOiAnRGlmZmljdWx0eScsXG4gICAgaWQ6ICdkaWZmaWN1bHR5JyxcbiAgICB0eXBlOiAnaW50JyxcbiAgICBtaW46IDEsXG4gICAgbWF4OiAxMCxcbiAgICBkZWZhdWx0OiA1XG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1R5cGUnLFxuICAgIGlkOiAndHlwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1leGNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdSZWN0YW5nbGUnLCBpZDogJ3JlY3RhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdUcmlhbmdsZScsIGlkOiAndHJpYW5nbGUnIH0sXG4gICAgICB7IHRpdGxlOiAnU3F1b3ZhbCcsIGlkOiAnc3F1b3ZhbCcgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogJ3JlY3RhbmdsZSdcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnQSBoZWFkaW5nJyxcbiAgICB0eXBlOiAnaGVhZGluZydcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnU2hhcGUnLFxuICAgIGlkOiAnc2hhcGUnLFxuICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICB7IHRpdGxlOiAnUmVjdGFuZ2xlIHNoYXBlIHRoaW5nJywgaWQ6ICdyZWN0YW5nbGUnIH0sXG4gICAgICB7IHRpdGxlOiAnVHJpYW5nbGUgc2hhcGUgdGhpbmcnLCBpZDogJ3RyaWFuZ2xlJyB9LFxuICAgICAgeyB0aXRsZTogJ1NxdW92YWwgc2hhcGUgbG9uZycsIGlkOiAnc3F1b3ZhbCcgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogWydyZWN0YW5nbGUnLCAnc3F1b3ZhbCddLFxuICAgIHZlcnRpY2FsOiB0cnVlIC8vIGxheW91dCB2ZXJ0aWNhbGx5LCByYXRoZXIgdGhhbiBob3Jpem9udGFsbHlcbiAgfSxcbiAge1xuICAgIHR5cGU6ICdjb2x1bW4tYnJlYWsnXG4gIH0sXG4gIHtcbiAgICB0eXBlOiAnaGVhZGluZycsXG4gICAgdGl0bGU6ICdBIG5ldyBjb2x1bW4nXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ0RvIHNvbWV0aGluZycsXG4gICAgaWQ6ICdzb21ldGhpbmcnLFxuICAgIHR5cGU6ICdib29sJyxcbiAgICBkZWZhdWx0OiB0cnVlLFxuICAgIHN3YXBMYWJlbDogdHJ1ZSAvLyBwdXQgY29udHJvbCBiZWZvcmUgbGFiZWxcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnT3B0aW9ucyBmb3IgcmVjdGFuZ2xlcycsXG4gICAgaWQ6ICdyZWN0YW5nbGUtb3B0aW9ucycsXG4gICAgdHlwZTogJ3N1Ym9wdGlvbnMnLFxuICAgIG9wdGlvbnNTcGVjOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnTWluaW11bSB4JyxcbiAgICAgICAgaWQ6ICdtaW5YJyxcbiAgICAgICAgdHlwZTogJ2ludCcsXG4gICAgICAgIG1pbjogMCxcbiAgICAgICAgbWF4OiAxMCxcbiAgICAgICAgZGVmYXVsdDogMlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdNYXhpbXVtIHgnLFxuICAgICAgICBpZDogJ21heFgnLFxuICAgICAgICB0eXBlOiAnaW50JyxcbiAgICAgICAgbWluOiAwLFxuICAgICAgICBtYXg6IDEwLFxuICAgICAgICBkZWZhdWx0OiA0XG4gICAgICB9XG4gICAgXVxuICB9XG5dXG5cbmNvbnN0IGRlbW9UZW1wbGF0ZSA6IHN0cmluZyA9XG4nPGxpPnt7ZGlmZmljdWx0eS5yZW5kZXJlZH19PC9saT5cXG4nICsgLy8gSW5zZXJ0cyBmdWxsICdkaWZmaXVsdHknIG9wdGlvbiBhcyBiZWZvcmVcbic8bGk+PGI+e3t0eXBlLnRpdGxlfX08L2I+IFxcbicgKyAvLyBqdXN0IHRoZSB0aXRsZVxuJzxsaT57e3R5cGUuaW5wdXR9fSBcXG4nICsgLy8gdGhlIGlucHV0IGVsZW1lbnRcbid7e3R5cGUuc2VsZWN0T3B0aW9uc1JlbmRlcmVkQWxsfX08L2xpPicgKyAvLyBUaGUgb3B0aW9ucywgcmVkZXJlZCB1c3VhbGx5XG4nPGxpPjx1bD57eyMgdHlwZS5zZWxlY3RPcHRpb25zfX0nICsgLy8gSW5kaXZpZHVhbCBzZWxlY3Qgb3B0aW9ucywgcmVuZGVyZWRcbiAgJzxsaT4ge3tyZW5kZXJlZH19IDwvbGk+JyArIC8vIFRoZSB1c3VhbCByZW5kZXJlZCBvcHRpb25cbid7ey8gdHlwZS5zZWxlY3RPcHRpb25zfX08L3VsPidcblxuY29uc3QgZXhhbXBsZVRlbXBsYXRlID0gLy8gQW5vdGhlciBleGFtcGxlLCB3aXRoIGZld2VyIGNvbW1lbnRzXG5gPGRpdiBjbGFzcyA9IFwib3B0aW9ucy1jb2x1bW5cIj5cbiAgPHVsIGNsYXNzPVwib3B0aW9ucy1saXN0XCI+XG4gICAgPGxpPiA8Yj5Tb21lIG9wdGlvbnMgPC9iPiA8L2xpPlxuICAgIDxsaT4ge3tkaWZmaWN1bHR5LnJlbmRlcmVkfX0gPC9saT5cbiAgICA8bGkgc3R5bGU9XCJkaXNwbGF5OmJsb2NrXCI+IHt7c2ltcGxlLnRpdGxlfX0ge3tzaW1wbGUuaW5wdXR9fVxuICAgICAge3sjc2ltcGxlTWluWH19XG5gXG4iLCJleHBvcnQgZGVmYXVsdCBhYnN0cmFjdCBjbGFzcyBRdWVzdGlvbiB7XG4gIERPTTogSFRNTEVsZW1lbnRcbiAgYW5zd2VyZWQ6IGJvb2xlYW5cblxuICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgdGhpcy5ET00gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgIHRoaXMuRE9NLmNsYXNzTmFtZSA9ICdxdWVzdGlvbi1kaXYnXG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gIH1cblxuICBnZXRET00gKCkgOiBIVE1MRWxlbWVudCB7XG4gICAgcmV0dXJuIHRoaXMuRE9NXG4gIH1cblxuICBhYnN0cmFjdCByZW5kZXIgKCkgOiB2b2lkXG5cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQge1xuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gIH1cblxuICB0b2dnbGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICBpZiAodGhpcy5hbnN3ZXJlZCkge1xuICAgICAgdGhpcy5oaWRlQW5zd2VyKClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaG93QW5zd2VyKClcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgLy8gU2hvdWxkIGJlIG92ZXJyaWRkZW5cbiAgICByZXR1cm4gJydcbiAgfVxufVxuIiwiLyogZ2xvYmFsIGthdGV4ICovXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRleHRRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKClcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYSdcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIC8vIHN0b3JlIHRoZSBsYWJlbCBmb3IgZnV0dXJlIHJlbmRlcmluZ1xuICAgIHRoaXMubGFiZWwgPSBzZXR0aW5ncy5sYWJlbFxuXG4gICAgLy8gRHVtbXkgcXVlc3Rpb24gZ2VuZXJhdGluZyAtIHN1YmNsYXNzZXMgZG8gc29tZXRoaW5nIHN1YnN0YW50aWFsIGhlcmVcbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnMisyJ1xuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPTUnXG5cbiAgICAvLyBNYWtlIHRoZSBET00gdHJlZSBmb3IgdGhlIGVsZW1lbnRcbiAgICB0aGlzLnF1ZXN0aW9ucCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKVxuICAgIHRoaXMuYW5zd2VycCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKVxuXG4gICAgdGhpcy5xdWVzdGlvbnAuY2xhc3NOYW1lID0gJ3F1ZXN0aW9uJ1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc05hbWUgPSAnYW5zd2VyJ1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuXG4gICAgdGhpcy5ET00uYXBwZW5kQ2hpbGQodGhpcy5xdWVzdGlvbnApXG4gICAgdGhpcy5ET00uYXBwZW5kQ2hpbGQodGhpcy5hbnN3ZXJwKVxuXG4gICAgLy8gc3ViY2xhc3NlcyBzaG91bGQgZ2VuZXJhdGUgcXVlc3Rpb25MYVRlWCBhbmQgYW5zd2VyTGFUZVgsXG4gICAgLy8gLnJlbmRlcigpIHdpbGwgYmUgY2FsbGVkIGJ5IHVzZXJcbiAgfVxuXG4gIHJlbmRlciAoKSB7XG4gICAgLy8gdXBkYXRlIHRoZSBET00gaXRlbSB3aXRoIHF1ZXN0aW9uTGFUZVggYW5kIGFuc3dlckxhVGVYXG4gICAgdmFyIHFudW0gPSB0aGlzLmxhYmVsXG4gICAgICA/ICdcXFxcdGV4dHsnICsgdGhpcy5sYWJlbCArICcpIH0nXG4gICAgICA6ICcnXG4gICAga2F0ZXgucmVuZGVyKHFudW0gKyB0aGlzLnF1ZXN0aW9uTGFUZVgsIHRoaXMucXVlc3Rpb25wLCB7IGRpc3BsYXlNb2RlOiB0cnVlLCBzdHJpY3Q6ICdpZ25vcmUnIH0pXG4gICAga2F0ZXgucmVuZGVyKHRoaXMuYW5zd2VyTGFUZVgsIHRoaXMuYW5zd2VycCwgeyBkaXNwbGF5TW9kZTogdHJ1ZSB9KVxuICB9XG5cbiAgZ2V0RE9NICgpIHtcbiAgICByZXR1cm4gdGhpcy5ET01cbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkge1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIHtcbiAgICB0aGlzLmFuc3dlcnAuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxufVxuIiwiaW1wb3J0IHsgcmFuZEJldHdlZW4sIGdjZCB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcblxuLyogTWFpbiBxdWVzdGlvbiBjbGFzcy4gVGhpcyB3aWxsIGJlIHNwdW4gb2ZmIGludG8gZGlmZmVyZW50IGZpbGUgYW5kIGdlbmVyYWxpc2VkICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBbGdlYnJhaWNGcmFjdGlvblEgZXh0ZW5kcyBUZXh0USB7XG4gIC8vICdleHRlbmRzJyBRdWVzdGlvbiwgYnV0IG5vdGhpbmcgdG8gYWN0dWFsbHkgZXh0ZW5kXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogMlxuICAgIH1cblxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG4gICAgY29uc3QgZGlmZmljdWx0eSA9IHNldHRpbmdzLmRpZmZpY3VsdHlcblxuICAgIC8vIGxvZ2ljIGZvciBnZW5lcmF0aW5nIHRoZSBxdWVzdGlvbiBhbmQgYW5zd2VyIHN0YXJ0cyBoZXJlXG4gICAgdmFyIGEsIGIsIGMsIGQsIGUsIGYgLy8gKGF4K2IpKGV4K2YpLyhjeCtkKShleCtmKSA9IChweF4yK3F4K3IpLyh0eF4yK3V4K3YpXG4gICAgdmFyIHAsIHEsIHIsIHQsIHUsIHZcbiAgICB2YXIgbWluQ29lZmYsIG1heENvZWZmLCBtaW5Db25zdCwgbWF4Q29uc3RcblxuICAgIHN3aXRjaCAoZGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMTsgbWluQ29uc3QgPSAxOyBtYXhDb25zdCA9IDZcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgbWluQ29lZmYgPSAxOyBtYXhDb2VmZiA9IDE7IG1pbkNvbnN0ID0gLTY7IG1heENvbnN0ID0gNlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAzOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMzsgbWluQ29uc3QgPSAtNTsgbWF4Q29uc3QgPSA1XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ6XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBtaW5Db2VmZiA9IC0zOyBtYXhDb2VmZiA9IDM7IG1pbkNvbnN0ID0gLTU7IG1heENvbnN0ID0gNVxuICAgICAgICBicmVha1xuICAgIH1cblxuICAgIC8vIFBpY2sgc29tZSBjb2VmZmljaWVudHNcbiAgICB3aGlsZSAoXG4gICAgICAoKCFhICYmICFiKSB8fCAoIWMgJiYgIWQpIHx8ICghZSAmJiAhZikpIHx8IC8vIHJldHJ5IGlmIGFueSBleHByZXNzaW9uIGlzIDBcbiAgICAgIGNhblNpbXBsaWZ5KGEsIGIsIGMsIGQpIC8vIHJldHJ5IGlmIHRoZXJlJ3MgYSBjb21tb24gbnVtZXJpY2FsIGZhY3RvclxuICAgICkge1xuICAgICAgYSA9IHJhbmRCZXR3ZWVuKG1pbkNvZWZmLCBtYXhDb2VmZilcbiAgICAgIGMgPSByYW5kQmV0d2VlbihtaW5Db2VmZiwgbWF4Q29lZmYpXG4gICAgICBlID0gcmFuZEJldHdlZW4obWluQ29lZmYsIG1heENvZWZmKVxuICAgICAgYiA9IHJhbmRCZXR3ZWVuKG1pbkNvbnN0LCBtYXhDb25zdClcbiAgICAgIGQgPSByYW5kQmV0d2VlbihtaW5Db25zdCwgbWF4Q29uc3QpXG4gICAgICBmID0gcmFuZEJldHdlZW4obWluQ29uc3QsIG1heENvbnN0KVxuICAgIH1cblxuICAgIC8vIGlmIHRoZSBkZW5vbWluYXRvciBpcyBuZWdhdGl2ZSBmb3IgZWFjaCB0ZXJtLCB0aGVuIG1ha2UgdGhlIG51bWVyYXRvciBuZWdhdGl2ZSBpbnN0ZWFkXG4gICAgaWYgKGMgPD0gMCAmJiBkIDw9IDApIHtcbiAgICAgIGMgPSAtY1xuICAgICAgZCA9IC1kXG4gICAgICBhID0gLWFcbiAgICAgIGIgPSAtYlxuICAgIH1cblxuICAgIHAgPSBhICogZTsgcSA9IGEgKiBmICsgYiAqIGU7IHIgPSBiICogZlxuICAgIHQgPSBjICogZTsgdSA9IGMgKiBmICsgZCAqIGU7IHYgPSBkICogZlxuXG4gICAgLy8gTm93IHB1dCB0aGUgcXVlc3Rpb24gYW5kIGFuc3dlciBpbiBhIG5pY2UgZm9ybWF0IGludG8gcXVlc3Rpb25MYVRlWCBhbmQgYW5zd2VyTGFUZVhcbiAgICBjb25zdCBxdWVzdGlvbiA9IGBcXFxcZnJhY3ske3F1YWRyYXRpY1N0cmluZyhwLCBxLCByKX19eyR7cXVhZHJhdGljU3RyaW5nKHQsIHUsIHYpfX1gXG4gICAgaWYgKHNldHRpbmdzLnVzZUNvbW1hbmRXb3JkKSB7XG4gICAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnXFxcXHRleHR7U2ltcGxpZnl9ICcgKyBxdWVzdGlvblxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSBxdWVzdGlvblxuICAgIH1cbiAgICB0aGlzLmFuc3dlckxhVGVYID1cbiAgICAgIChjID09PSAwICYmIGQgPT09IDEpID8gcXVhZHJhdGljU3RyaW5nKDAsIGEsIGIpXG4gICAgICAgIDogYFxcXFxmcmFjeyR7cXVhZHJhdGljU3RyaW5nKDAsIGEsIGIpfX17JHtxdWFkcmF0aWNTdHJpbmcoMCwgYywgZCl9fWBcblxuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPSAnICsgdGhpcy5hbnN3ZXJMYVRlWFxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdTaW1wbGlmeSdcbiAgfVxufVxuXG4vKiBVdGlsaXR5IGZ1bmN0aW9uc1xuICogQXQgc29tZSBwb2ludCwgSSdsbCBtb3ZlIHNvbWUgb2YgdGhlc2UgaW50byBhIGdlbmVyYWwgdXRpbGl0aWVzIG1vZHVsZVxuICogYnV0IHRoaXMgd2lsbCBkbyBmb3Igbm93XG4gKi9cblxuLy8gVE9ETyBJIGhhdmUgcXVhZHJhdGljU3RyaW5nIGhlcmUgYW5kIGFsc28gYSBQb2x5bm9taWFsIGNsYXNzLiBXaGF0IGlzIGJlaW5nIHJlcGxpY2F0ZWQ/wqdcbmZ1bmN0aW9uIHF1YWRyYXRpY1N0cmluZyAoYSwgYiwgYykge1xuICBpZiAoYSA9PT0gMCAmJiBiID09PSAwICYmIGMgPT09IDApIHJldHVybiAnMCdcblxuICB2YXIgeDJzdHJpbmcgPVxuICAgIGEgPT09IDAgPyAnJ1xuICAgICAgOiBhID09PSAxID8gJ3heMidcbiAgICAgICAgOiBhID09PSAtMSA/ICcteF4yJ1xuICAgICAgICAgIDogYSArICd4XjInXG5cbiAgdmFyIHhzaWduID1cbiAgICBiIDwgMCA/ICctJ1xuICAgICAgOiAoYSA9PT0gMCB8fCBiID09PSAwKSA/ICcnXG4gICAgICAgIDogJysnXG5cbiAgdmFyIHhzdHJpbmcgPVxuICAgIGIgPT09IDAgPyAnJ1xuICAgICAgOiAoYiA9PT0gMSB8fCBiID09PSAtMSkgPyAneCdcbiAgICAgICAgOiBNYXRoLmFicyhiKSArICd4J1xuXG4gIHZhciBjb25zdHNpZ24gPVxuICAgIGMgPCAwID8gJy0nXG4gICAgICA6ICgoYSA9PT0gMCAmJiBiID09PSAwKSB8fCBjID09PSAwKSA/ICcnXG4gICAgICAgIDogJysnXG5cbiAgdmFyIGNvbnN0c3RyaW5nID1cbiAgICBjID09PSAwID8gJycgOiBNYXRoLmFicyhjKVxuXG4gIHJldHVybiB4MnN0cmluZyArIHhzaWduICsgeHN0cmluZyArIGNvbnN0c2lnbiArIGNvbnN0c3RyaW5nXG59XG5cbmZ1bmN0aW9uIGNhblNpbXBsaWZ5IChhMSwgYjEsIGEyLCBiMikge1xuICAvLyBjYW4gKGExeCtiMSkvKGEyeCtiMikgYmUgc2ltcGxpZmllZD9cbiAgLy9cbiAgLy8gRmlyc3QsIHRha2Ugb3V0IGdjZCwgYW5kIHdyaXRlIGFzIGMxKGExeCtiMSkgZXRjXG5cbiAgdmFyIGMxID0gZ2NkKGExLCBiMSlcbiAgYTEgPSBhMSAvIGMxXG4gIGIxID0gYjEgLyBjMVxuXG4gIHZhciBjMiA9IGdjZChhMiwgYjIpXG4gIGEyID0gYTIgLyBjMlxuICBiMiA9IGIyIC8gYzJcblxuICB2YXIgcmVzdWx0ID0gZmFsc2VcblxuICBpZiAoZ2NkKGMxLCBjMikgPiAxIHx8IChhMSA9PT0gYTIgJiYgYjEgPT09IGIyKSkge1xuICAgIHJlc3VsdCA9IHRydWVcbiAgfVxuXG4gIHJldHVybiByZXN1bHRcbn1cbiIsImltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCB7IHJhbmRCZXR3ZWVuIH0gZnJvbSAndXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJbnRlZ2VyQWRkUSBleHRlbmRzIFRleHRRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiA1LFxuICAgICAgbGFiZWw6ICdhJ1xuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyBUaGlzIGlzIGp1c3QgYSBkZW1vIHF1ZXN0aW9uIHR5cGUgZm9yIG5vdywgc28gbm90IHByb2Nlc3NpbmcgZGlmZmljdWx0eVxuICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbigxMCwgMTAwMClcbiAgICBjb25zdCBiID0gcmFuZEJldHdlZW4oMTAsIDEwMDApXG4gICAgY29uc3Qgc3VtID0gYSArIGJcblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9IGEgKyAnICsgJyArIGJcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJz0gJyArIHN1bVxuXG4gICAgdGhpcy5yZW5kZXIoKVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdFdmFsdWF0ZSdcbiAgfVxufVxuIiwiaW1wb3J0IFF1ZXN0aW9uIGZyb20gJ1F1ZXN0aW9uL1F1ZXN0aW9uJ1xuaW1wb3J0IHsgY3JlYXRlRWxlbSwgcmVwZWxFbGVtZW50cyB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuL1ZpZXdPcHRpb25zJ1xuZGVjbGFyZSBjb25zdCBrYXRleCA6IHtyZW5kZXIgOiAoc3RyaW5nOiBzdHJpbmcsIGVsZW1lbnQ6IEhUTUxFbGVtZW50KSA9PiB2b2lkfVxuXG4vKiBHcmFwaGljUURhdGEgY2FuIGFsbCBiZSB2ZXJ5IGRpZmZlcmVudCwgc28gaW50ZXJmYWNlIGlzIGVtcHR5XG4gKiBIZXJlIGZvciBjb2RlIGRvY3VtZW50YXRpb24gcmF0aGVyIHRoYW4gdHlwZSBzYWZldHkgKHdoaWNoIGlzbid0IHByb3ZpZGVkKSAqL1xuXG4vKiBlc2xpbnQtZGlzYWJsZSAqL1xuZXhwb3J0IGludGVyZmFjZSBHcmFwaGljUURhdGEge1xufVxuLyogZXNsaW50LWVuYWJsZSAqL1xuXG4vKiBOb3Qgd29ydGggdGhlIGhhc3NseSB0cnlpbmcgdG8gZ2V0IGludGVyZmFjZXMgZm9yIHN0YXRpYyBtZXRob2RzXG4gKlxuICogZXhwb3J0IGludGVyZmFjZSBHcmFwaGljUURhdGFDb25zdHJ1Y3RvciB7XG4gKiAgIG5ldyguLi5hcmdzIDogdW5rbm93bltdKTogR3JhcGhpY1FEYXRhXG4gKiAgIHJhbmRvbShvcHRpb25zOiB1bmtub3duKSA6IEdyYXBoaWNRRGF0YVxuICogfVxuKi9cblxuZXhwb3J0IGludGVyZmFjZSBMYWJlbCB7XG4gIHBvczogUG9pbnQsXG4gIHRleHRxOiBzdHJpbmcsXG4gIHRleHRhOiBzdHJpbmcsXG4gIHN0eWxlcTogc3RyaW5nLFxuICBzdHlsZWE6IHN0cmluZyxcbiAgdGV4dDogc3RyaW5nLFxuICBzdHlsZTogc3RyaW5nXG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBHcmFwaGljUVZpZXcge1xuICBET006IEhUTUxFbGVtZW50XG4gIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnRcbiAgd2lkdGg6IG51bWJlclxuICBoZWlnaHQ6IG51bWJlclxuICBkYXRhOiBHcmFwaGljUURhdGFcbiAgbGFiZWxzOiBMYWJlbFtdXG4gIHJvdGF0aW9uPzogbnVtYmVyXG5cbiAgY29uc3RydWN0b3IgKGRhdGEgOiBHcmFwaGljUURhdGEsIHZpZXdPcHRpb25zIDogVmlld09wdGlvbnMpIHtcbiAgICB2aWV3T3B0aW9ucy53aWR0aCA9IHZpZXdPcHRpb25zLndpZHRoID8/IDMwMFxuICAgIHZpZXdPcHRpb25zLmhlaWdodCA9IHZpZXdPcHRpb25zLmhlaWdodCA/PyAzMDBcblxuICAgIHRoaXMud2lkdGggPSB2aWV3T3B0aW9ucy53aWR0aFxuICAgIHRoaXMuaGVpZ2h0ID0gdmlld09wdGlvbnMuaGVpZ2h0IC8vIG9ubHkgdGhpbmdzIEkgbmVlZCBmcm9tIHRoZSBvcHRpb25zLCBnZW5lcmFsbHk/XG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIHRoaXMucm90YXRpb24gPSB2aWV3T3B0aW9ucy5yb3RhdGlvblxuXG4gICAgdGhpcy5sYWJlbHMgPSBbXSAvLyBsYWJlbHMgb24gZGlhZ3JhbVxuXG4gICAgLy8gRE9NIGVsZW1lbnRzXG4gICAgdGhpcy5ET00gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tZGl2JylcbiAgICB0aGlzLmNhbnZhcyA9IGNyZWF0ZUVsZW0oJ2NhbnZhcycsICdxdWVzdGlvbi1jYW52YXMnLCB0aGlzLkRPTSkgYXMgSFRNTENhbnZhc0VsZW1lbnRcbiAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMud2lkdGhcbiAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodFxuICB9XG5cbiAgZ2V0RE9NICgpIDogSFRNTEVsZW1lbnQge1xuICAgIHJldHVybiB0aGlzLkRPTVxuICB9XG5cbiAgYWJzdHJhY3QgcmVuZGVyICgpIDogdm9pZFxuXG4gIHJlbmRlckxhYmVscyAobnVkZ2U/IDogYm9vbGVhbiwgcmVwZWw6IGJvb2xlYW4gPSB0cnVlKSA6IHZvaWQge1xuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuRE9NXG5cbiAgICAvLyByZW1vdmUgYW55IGV4aXN0aW5nIGxhYmVsc1xuICAgIGNvbnN0IG9sZExhYmVscyA9IGNvbnRhaW5lci5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdsYWJlbCcpXG4gICAgd2hpbGUgKG9sZExhYmVscy5sZW5ndGggPiAwKSB7XG4gICAgICBvbGRMYWJlbHNbMF0ucmVtb3ZlKClcbiAgICB9XG5cbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgY29uc3QgbGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgICAgY29uc3QgaW5uZXJsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgICBsYWJlbC5jbGFzc0xpc3QuYWRkKCdsYWJlbCcpXG4gICAgICBsYWJlbC5jbGFzc05hbWUgKz0gJyAnICsgbC5zdHlsZSAvLyB1c2luZyBjbGFzc05hbWUgb3ZlciBjbGFzc0xpc3Qgc2luY2UgbC5zdHlsZSBpcyBzcGFjZS1kZWxpbWl0ZWQgbGlzdCBvZiBjbGFzc2VzXG4gICAgICBsYWJlbC5zdHlsZS5sZWZ0ID0gbC5wb3MueCArICdweCdcbiAgICAgIGxhYmVsLnN0eWxlLnRvcCA9IGwucG9zLnkgKyAncHgnXG5cbiAgICAgIGthdGV4LnJlbmRlcihsLnRleHQsIGlubmVybGFiZWwpXG4gICAgICBsYWJlbC5hcHBlbmRDaGlsZChpbm5lcmxhYmVsKVxuICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGxhYmVsKVxuXG4gICAgICAvLyByZW1vdmUgc3BhY2UgaWYgdGhlIGlubmVyIGxhYmVsIGlzIHRvbyBiaWdcbiAgICAgIGlmIChpbm5lcmxhYmVsLm9mZnNldFdpZHRoIC8gaW5uZXJsYWJlbC5vZmZzZXRIZWlnaHQgPiAyKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coYHJlbW92ZWQgc3BhY2UgaW4gJHtsLnRleHR9YClcbiAgICAgICAgY29uc3QgbmV3bGFiZWx0ZXh0ID0gbC50ZXh0LnJlcGxhY2UoL1xcKy8sICdcXFxcIStcXFxcIScpLnJlcGxhY2UoLy0vLCAnXFxcXCEtXFxcXCEnKVxuICAgICAgICBrYXRleC5yZW5kZXIobmV3bGFiZWx0ZXh0LCBpbm5lcmxhYmVsKVxuICAgICAgfVxuXG4gICAgICAvLyBJIGRvbid0IHVuZGVyc3RhbmQgdGhpcyBhZGp1c3RtZW50LiBJIHRoaW5rIGl0IG1pZ2h0IGJlIG5lZWRlZCBpbiBhcml0aG1hZ29ucywgYnV0IGl0IG1ha2VzXG4gICAgICAvLyBvdGhlcnMgZ28gZnVubnkuXG5cbiAgICAgIGlmIChudWRnZSkge1xuICAgICAgICBjb25zdCBsd2lkdGggPSBsYWJlbC5vZmZzZXRXaWR0aFxuICAgICAgICBpZiAobC5wb3MueCA8IHRoaXMuY2FudmFzLndpZHRoIC8gMiAtIDUgJiYgbC5wb3MueCArIGx3aWR0aCAvIDIgPiB0aGlzLmNhbnZhcy53aWR0aCAvIDIpIHtcbiAgICAgICAgICBsYWJlbC5zdHlsZS5sZWZ0ID0gKHRoaXMuY2FudmFzLndpZHRoIC8gMiAtIGx3aWR0aCAtIDMpICsgJ3B4J1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBudWRnZWQgJyR7bC50ZXh0fSdgKVxuICAgICAgICB9XG4gICAgICAgIGlmIChsLnBvcy54ID4gdGhpcy5jYW52YXMud2lkdGggLyAyICsgNSAmJiBsLnBvcy54IC0gbHdpZHRoIC8gMiA8IHRoaXMuY2FudmFzLndpZHRoIC8gMikge1xuICAgICAgICAgIGxhYmVsLnN0eWxlLmxlZnQgPSAodGhpcy5jYW52YXMud2lkdGggLyAyICsgMykgKyAncHgnXG4gICAgICAgICAgY29uc29sZS5sb2coYG51ZGdlZCAnJHtsLnRleHR9J2ApXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy9yZXBlbCBpZiBnaXZlblxuICAgIGlmIChyZXBlbCkge1xuICAgIGNvbnN0IGxhYmVsRWxlbWVudHMgPSBbLi4udGhpcy5ET00uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnbGFiZWwnKV0gYXMgSFRNTEVsZW1lbnRbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGFiZWxFbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgZm9yIChsZXQgaiA9IGkrMTsgaiA8IGxhYmVsRWxlbWVudHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgcmVwZWxFbGVtZW50cyhsYWJlbEVsZW1lbnRzW2ldLGxhYmVsRWxlbWVudHNbal0pXG4gICAgICB9XG4gICAgfVxuICAgIH1cbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0YVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVhXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIC8vIFBvaW50IHRyYW5mb3JtYXRpb25zIG9mIGFsbCBwb2ludHNcblxuICBnZXQgYWxscG9pbnRzICgpIDogUG9pbnRbXSB7XG4gICAgcmV0dXJuIFtdXG4gIH1cblxuICBzY2FsZSAoc2YgOiBudW1iZXIpIDogdm9pZCB7XG4gICAgdGhpcy5hbGxwb2ludHMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgcC5zY2FsZShzZilcbiAgICB9KVxuICB9XG5cbiAgcm90YXRlIChhbmdsZSA6IG51bWJlcikgOiBudW1iZXIge1xuICAgIHRoaXMuYWxscG9pbnRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHAucm90YXRlKGFuZ2xlKVxuICAgIH0pXG4gICAgcmV0dXJuIGFuZ2xlXG4gIH1cblxuICB0cmFuc2xhdGUgKHggOiBudW1iZXIsIHkgOiBudW1iZXIpIDogdm9pZCB7XG4gICAgdGhpcy5hbGxwb2ludHMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgcC50cmFuc2xhdGUoeCwgeSlcbiAgICB9KVxuICB9XG5cbiAgcmFuZG9tUm90YXRlICgpIDogbnVtYmVyIHtcbiAgICBjb25zdCBhbmdsZSA9IDIgKiBNYXRoLlBJICogTWF0aC5yYW5kb20oKVxuICAgIHRoaXMucm90YXRlKGFuZ2xlKVxuICAgIHJldHVybiBhbmdsZVxuICB9XG5cbiAgLyoqXG4gICAqIFNjYWxlcyBhbGwgdGhlIHBvaW50cyB0byB3aXRoaW4gYSBnaXZlbiB3aWR0aCBhbmQgaGVpZ2h0LCBjZW50ZXJpbmcgdGhlIHJlc3VsdC4gUmV0dXJucyB0aGUgc2NhbGUgZmFjdG9yXG4gICAqIEBwYXJhbSB3aWR0aCBUaGUgd2lkdGggb2YgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSB0byBzY2FsZSB0b1xuICAgKiBAcGFyYW0gaGVpZ2h0IFRoZSBoZWlnaHQgb2YgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSB0byBzY2FsZSB0b1xuICAgKiBAcGFyYW0gbWFyZ2luIE1hcmdpbiB0byBsZWF2ZSBvdXRzaWRlIHRoZSByZWN0YW5nbGVcbiAgICogQHJldHVybnNcbiAgICovXG4gIHNjYWxlVG9GaXQgKHdpZHRoIDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgbWFyZ2luIDogbnVtYmVyKSA6IG51bWJlciB7XG4gICAgbGV0IHRvcExlZnQgOiBQb2ludCA9IFBvaW50Lm1pbih0aGlzLmFsbHBvaW50cylcbiAgICBsZXQgYm90dG9tUmlnaHQgOiBQb2ludCA9IFBvaW50Lm1heCh0aGlzLmFsbHBvaW50cylcbiAgICBjb25zdCB0b3RhbFdpZHRoIDogbnVtYmVyID0gYm90dG9tUmlnaHQueCAtIHRvcExlZnQueFxuICAgIGNvbnN0IHRvdGFsSGVpZ2h0IDogbnVtYmVyID0gYm90dG9tUmlnaHQueSAtIHRvcExlZnQueVxuICAgIGNvbnN0IHNmID0gTWF0aC5taW4oKHdpZHRoIC0gbWFyZ2luKSAvIHRvdGFsV2lkdGgsIChoZWlnaHQgLSBtYXJnaW4pIC8gdG90YWxIZWlnaHQpXG4gICAgdGhpcy5zY2FsZShzZilcblxuICAgIC8vIGNlbnRyZVxuICAgIHRvcExlZnQgPSBQb2ludC5taW4odGhpcy5hbGxwb2ludHMpXG4gICAgYm90dG9tUmlnaHQgPSBQb2ludC5tYXgodGhpcy5hbGxwb2ludHMpXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbih0b3BMZWZ0LCBib3R0b21SaWdodClcbiAgICB0aGlzLnRyYW5zbGF0ZSh3aWR0aCAvIDIgLSBjZW50ZXIueCwgaGVpZ2h0IC8gMiAtIGNlbnRlci55KSAvLyBjZW50cmVcblxuICAgIHJldHVybiBzZlxuICB9XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBHcmFwaGljUSBleHRlbmRzIFF1ZXN0aW9uIHtcbiAgZGF0YTogR3JhcGhpY1FEYXRhXG4gIHZpZXc6IEdyYXBoaWNRVmlld1xuXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBHcmFwaGljUURhdGEsIHZpZXc6IEdyYXBoaWNRVmlldykgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgIHN1cGVyKCkgLy8gdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIHRoaXMudmlldyA9IHZpZXdcbiAgICB0aGlzLkRPTSA9IHRoaXMudmlldy5ET01cblxuICAgIC8qIFRoZXNlIGFyZSBndWFyYW50ZWVkIHRvIGJlIG92ZXJyaWRkZW4sIHNvIG5vIHBvaW50IGluaXRpYWxpemluZyBoZXJlXG4gICAgICpcbiAgICAgKiAgdGhpcy5kYXRhID0gbmV3IEdyYXBoaWNRRGF0YShvcHRpb25zKVxuICAgICAqICB0aGlzLnZpZXcgPSBuZXcgR3JhcGhpY1FWaWV3KHRoaXMuZGF0YSwgb3B0aW9ucylcbiAgICAgKlxuICAgICAqL1xuICB9XG5cbiAgLyogTmVlZCB0byByZWZhY3RvciBzdWJjbGFzc2VzIHRvIGRvIHRoaXM6XG4gICAqIGNvbnN0cnVjdG9yIChkYXRhLCB2aWV3KSB7XG4gICAqICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICogICAgdGhpcy52aWV3ID0gdmlld1xuICAgKiB9XG4gICAqXG4gICAqIHN0YXRpYyByYW5kb20ob3B0aW9ucykge1xuICAgKiAgLy8gYW4gYXR0ZW1wdCBhdCBoYXZpbmcgYWJzdHJhY3Qgc3RhdGljIG1ldGhvZHMsIGFsYmVpdCBydW50aW1lIGVycm9yXG4gICAqICB0aHJvdyBuZXcgRXJyb3IoXCJgcmFuZG9tKClgIG11c3QgYmUgb3ZlcnJpZGRlbiBpbiBzdWJjbGFzcyBcIiArIHRoaXMubmFtZSlcbiAgICogfVxuICAgKlxuICAgKiB0eXBpY2FsIGltcGxlbWVudGF0aW9uOlxuICAgKiBzdGF0aWMgcmFuZG9tKG9wdGlvbnMpIHtcbiAgICogIGNvbnN0IGRhdGEgPSBuZXcgRGVyaXZlZFFEYXRhKG9wdGlvbnMpXG4gICAqICBjb25zdCB2aWV3ID0gbmV3IERlcml2ZWRRVmlldyhvcHRpb25zKVxuICAgKiAgcmV0dXJuIG5ldyBEZXJpdmVkUURhdGEoZGF0YSx2aWV3KVxuICAgKiB9XG4gICAqXG4gICAqL1xuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHsgcmV0dXJuIHRoaXMudmlldy5nZXRET00oKSB9XG5cbiAgcmVuZGVyICgpIDogdm9pZCB7IHRoaXMudmlldy5yZW5kZXIoKSB9XG5cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQge1xuICAgIHN1cGVyLnNob3dBbnN3ZXIoKVxuICAgIHRoaXMudmlldy5zaG93QW5zd2VyKClcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICBzdXBlci5oaWRlQW5zd2VyKClcbiAgICB0aGlzLnZpZXcuaGlkZUFuc3dlcigpXG4gIH1cbn1cbiIsIi8qKlxuICogQGxpY2Vuc2UgRnJhY3Rpb24uanMgdjQuMC4xMiAwOS8wOS8yMDE1XG4gKiBodHRwOi8vd3d3Lnhhcmcub3JnLzIwMTQvMDMvcmF0aW9uYWwtbnVtYmVycy1pbi1qYXZhc2NyaXB0L1xuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSwgUm9iZXJ0IEVpc2VsZSAocm9iZXJ0QHhhcmcub3JnKVxuICogRHVhbCBsaWNlbnNlZCB1bmRlciB0aGUgTUlUIG9yIEdQTCBWZXJzaW9uIDIgbGljZW5zZXMuXG4gKiovXG5cblxuLyoqXG4gKlxuICogVGhpcyBjbGFzcyBvZmZlcnMgdGhlIHBvc3NpYmlsaXR5IHRvIGNhbGN1bGF0ZSBmcmFjdGlvbnMuXG4gKiBZb3UgY2FuIHBhc3MgYSBmcmFjdGlvbiBpbiBkaWZmZXJlbnQgZm9ybWF0cy4gRWl0aGVyIGFzIGFycmF5LCBhcyBkb3VibGUsIGFzIHN0cmluZyBvciBhcyBhbiBpbnRlZ2VyLlxuICpcbiAqIEFycmF5L09iamVjdCBmb3JtXG4gKiBbIDAgPT4gPG5vbWluYXRvcj4sIDEgPT4gPGRlbm9taW5hdG9yPiBdXG4gKiBbIG4gPT4gPG5vbWluYXRvcj4sIGQgPT4gPGRlbm9taW5hdG9yPiBdXG4gKlxuICogSW50ZWdlciBmb3JtXG4gKiAtIFNpbmdsZSBpbnRlZ2VyIHZhbHVlXG4gKlxuICogRG91YmxlIGZvcm1cbiAqIC0gU2luZ2xlIGRvdWJsZSB2YWx1ZVxuICpcbiAqIFN0cmluZyBmb3JtXG4gKiAxMjMuNDU2IC0gYSBzaW1wbGUgZG91YmxlXG4gKiAxMjMvNDU2IC0gYSBzdHJpbmcgZnJhY3Rpb25cbiAqIDEyMy4nNDU2JyAtIGEgZG91YmxlIHdpdGggcmVwZWF0aW5nIGRlY2ltYWwgcGxhY2VzXG4gKiAxMjMuKDQ1NikgLSBzeW5vbnltXG4gKiAxMjMuNDUnNicgLSBhIGRvdWJsZSB3aXRoIHJlcGVhdGluZyBsYXN0IHBsYWNlXG4gKiAxMjMuNDUoNikgLSBzeW5vbnltXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiB2YXIgZiA9IG5ldyBGcmFjdGlvbihcIjkuNCczMSdcIik7XG4gKiBmLm11bChbLTQsIDNdKS5kaXYoNC45KTtcbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QpIHtcblxuICBcInVzZSBzdHJpY3RcIjtcblxuICAvLyBNYXhpbXVtIHNlYXJjaCBkZXB0aCBmb3IgY3ljbGljIHJhdGlvbmFsIG51bWJlcnMuIDIwMDAgc2hvdWxkIGJlIG1vcmUgdGhhbiBlbm91Z2guXG4gIC8vIEV4YW1wbGU6IDEvNyA9IDAuKDE0Mjg1NykgaGFzIDYgcmVwZWF0aW5nIGRlY2ltYWwgcGxhY2VzLlxuICAvLyBJZiBNQVhfQ1lDTEVfTEVOIGdldHMgcmVkdWNlZCwgbG9uZyBjeWNsZXMgd2lsbCBub3QgYmUgZGV0ZWN0ZWQgYW5kIHRvU3RyaW5nKCkgb25seSBnZXRzIHRoZSBmaXJzdCAxMCBkaWdpdHNcbiAgdmFyIE1BWF9DWUNMRV9MRU4gPSAyMDAwO1xuXG4gIC8vIFBhcnNlZCBkYXRhIHRvIGF2b2lkIGNhbGxpbmcgXCJuZXdcIiBhbGwgdGhlIHRpbWVcbiAgdmFyIFAgPSB7XG4gICAgXCJzXCI6IDEsXG4gICAgXCJuXCI6IDAsXG4gICAgXCJkXCI6IDFcbiAgfTtcblxuICBmdW5jdGlvbiBjcmVhdGVFcnJvcihuYW1lKSB7XG5cbiAgICBmdW5jdGlvbiBlcnJvckNvbnN0cnVjdG9yKCkge1xuICAgICAgdmFyIHRlbXAgPSBFcnJvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgdGVtcFsnbmFtZSddID0gdGhpc1snbmFtZSddID0gbmFtZTtcbiAgICAgIHRoaXNbJ3N0YWNrJ10gPSB0ZW1wWydzdGFjayddO1xuICAgICAgdGhpc1snbWVzc2FnZSddID0gdGVtcFsnbWVzc2FnZSddO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEVycm9yIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBJbnRlcm1lZGlhdGVJbmhlcml0b3IoKSB7fVxuICAgIEludGVybWVkaWF0ZUluaGVyaXRvci5wcm90b3R5cGUgPSBFcnJvci5wcm90b3R5cGU7XG4gICAgZXJyb3JDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBuZXcgSW50ZXJtZWRpYXRlSW5oZXJpdG9yKCk7XG5cbiAgICByZXR1cm4gZXJyb3JDb25zdHJ1Y3RvcjtcbiAgfVxuXG4gIHZhciBEaXZpc2lvbkJ5WmVybyA9IEZyYWN0aW9uWydEaXZpc2lvbkJ5WmVybyddID0gY3JlYXRlRXJyb3IoJ0RpdmlzaW9uQnlaZXJvJyk7XG4gIHZhciBJbnZhbGlkUGFyYW1ldGVyID0gRnJhY3Rpb25bJ0ludmFsaWRQYXJhbWV0ZXInXSA9IGNyZWF0ZUVycm9yKCdJbnZhbGlkUGFyYW1ldGVyJyk7XG5cbiAgZnVuY3Rpb24gYXNzaWduKG4sIHMpIHtcblxuICAgIGlmIChpc05hTihuID0gcGFyc2VJbnQobiwgMTApKSkge1xuICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKTtcbiAgICB9XG4gICAgcmV0dXJuIG4gKiBzO1xuICB9XG5cbiAgZnVuY3Rpb24gdGhyb3dJbnZhbGlkUGFyYW0oKSB7XG4gICAgdGhyb3cgbmV3IEludmFsaWRQYXJhbWV0ZXIoKTtcbiAgfVxuXG4gIHZhciBwYXJzZSA9IGZ1bmN0aW9uKHAxLCBwMikge1xuXG4gICAgdmFyIG4gPSAwLCBkID0gMSwgcyA9IDE7XG4gICAgdmFyIHYgPSAwLCB3ID0gMCwgeCA9IDAsIHkgPSAxLCB6ID0gMTtcblxuICAgIHZhciBBID0gMCwgQiA9IDE7XG4gICAgdmFyIEMgPSAxLCBEID0gMTtcblxuICAgIHZhciBOID0gMTAwMDAwMDA7XG4gICAgdmFyIE07XG5cbiAgICBpZiAocDEgPT09IHVuZGVmaW5lZCB8fCBwMSA9PT0gbnVsbCkge1xuICAgICAgLyogdm9pZCAqL1xuICAgIH0gZWxzZSBpZiAocDIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgbiA9IHAxO1xuICAgICAgZCA9IHAyO1xuICAgICAgcyA9IG4gKiBkO1xuICAgIH0gZWxzZVxuICAgICAgc3dpdGNoICh0eXBlb2YgcDEpIHtcblxuICAgICAgICBjYXNlIFwib2JqZWN0XCI6XG4gICAgICAgIHtcbiAgICAgICAgICBpZiAoXCJkXCIgaW4gcDEgJiYgXCJuXCIgaW4gcDEpIHtcbiAgICAgICAgICAgIG4gPSBwMVtcIm5cIl07XG4gICAgICAgICAgICBkID0gcDFbXCJkXCJdO1xuICAgICAgICAgICAgaWYgKFwic1wiIGluIHAxKVxuICAgICAgICAgICAgICBuICo9IHAxW1wic1wiXTtcbiAgICAgICAgICB9IGVsc2UgaWYgKDAgaW4gcDEpIHtcbiAgICAgICAgICAgIG4gPSBwMVswXTtcbiAgICAgICAgICAgIGlmICgxIGluIHAxKVxuICAgICAgICAgICAgICBkID0gcDFbMV07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93SW52YWxpZFBhcmFtKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHMgPSBuICogZDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFwibnVtYmVyXCI6XG4gICAgICAgIHtcbiAgICAgICAgICBpZiAocDEgPCAwKSB7XG4gICAgICAgICAgICBzID0gcDE7XG4gICAgICAgICAgICBwMSA9IC1wMTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAocDEgJSAxID09PSAwKSB7XG4gICAgICAgICAgICBuID0gcDE7XG4gICAgICAgICAgfSBlbHNlIGlmIChwMSA+IDApIHsgLy8gY2hlY2sgZm9yICE9IDAsIHNjYWxlIHdvdWxkIGJlY29tZSBOYU4gKGxvZygwKSksIHdoaWNoIGNvbnZlcmdlcyByZWFsbHkgc2xvd1xuXG4gICAgICAgICAgICBpZiAocDEgPj0gMSkge1xuICAgICAgICAgICAgICB6ID0gTWF0aC5wb3coMTAsIE1hdGguZmxvb3IoMSArIE1hdGgubG9nKHAxKSAvIE1hdGguTE4xMCkpO1xuICAgICAgICAgICAgICBwMSAvPSB6O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVc2luZyBGYXJleSBTZXF1ZW5jZXNcbiAgICAgICAgICAgIC8vIGh0dHA6Ly93d3cuam9obmRjb29rLmNvbS9ibG9nLzIwMTAvMTAvMjAvYmVzdC1yYXRpb25hbC1hcHByb3hpbWF0aW9uL1xuXG4gICAgICAgICAgICB3aGlsZSAoQiA8PSBOICYmIEQgPD0gTikge1xuICAgICAgICAgICAgICBNID0gKEEgKyBDKSAvIChCICsgRCk7XG5cbiAgICAgICAgICAgICAgaWYgKHAxID09PSBNKSB7XG4gICAgICAgICAgICAgICAgaWYgKEIgKyBEIDw9IE4pIHtcbiAgICAgICAgICAgICAgICAgIG4gPSBBICsgQztcbiAgICAgICAgICAgICAgICAgIGQgPSBCICsgRDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKEQgPiBCKSB7XG4gICAgICAgICAgICAgICAgICBuID0gQztcbiAgICAgICAgICAgICAgICAgIGQgPSBEO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBuID0gQTtcbiAgICAgICAgICAgICAgICAgIGQgPSBCO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgaWYgKHAxID4gTSkge1xuICAgICAgICAgICAgICAgICAgQSArPSBDO1xuICAgICAgICAgICAgICAgICAgQiArPSBEO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBDICs9IEE7XG4gICAgICAgICAgICAgICAgICBEICs9IEI7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKEIgPiBOKSB7XG4gICAgICAgICAgICAgICAgICBuID0gQztcbiAgICAgICAgICAgICAgICAgIGQgPSBEO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBuID0gQTtcbiAgICAgICAgICAgICAgICAgIGQgPSBCO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbiAqPSB6O1xuICAgICAgICAgIH0gZWxzZSBpZiAoaXNOYU4ocDEpIHx8IGlzTmFOKHAyKSkge1xuICAgICAgICAgICAgZCA9IG4gPSBOYU47XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgXCJzdHJpbmdcIjpcbiAgICAgICAge1xuICAgICAgICAgIEIgPSBwMS5tYXRjaCgvXFxkK3wuL2cpO1xuXG4gICAgICAgICAgaWYgKEIgPT09IG51bGwpXG4gICAgICAgICAgICB0aHJvd0ludmFsaWRQYXJhbSgpO1xuXG4gICAgICAgICAgaWYgKEJbQV0gPT09ICctJykgey8vIENoZWNrIGZvciBtaW51cyBzaWduIGF0IHRoZSBiZWdpbm5pbmdcbiAgICAgICAgICAgIHMgPSAtMTtcbiAgICAgICAgICAgIEErKztcbiAgICAgICAgICB9IGVsc2UgaWYgKEJbQV0gPT09ICcrJykgey8vIENoZWNrIGZvciBwbHVzIHNpZ24gYXQgdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgQSsrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChCLmxlbmd0aCA9PT0gQSArIDEpIHsgLy8gQ2hlY2sgaWYgaXQncyBqdXN0IGEgc2ltcGxlIG51bWJlciBcIjEyMzRcIlxuICAgICAgICAgICAgdyA9IGFzc2lnbihCW0ErK10sIHMpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoQltBICsgMV0gPT09ICcuJyB8fCBCW0FdID09PSAnLicpIHsgLy8gQ2hlY2sgaWYgaXQncyBhIGRlY2ltYWwgbnVtYmVyXG5cbiAgICAgICAgICAgIGlmIChCW0FdICE9PSAnLicpIHsgLy8gSGFuZGxlIDAuNSBhbmQgLjVcbiAgICAgICAgICAgICAgdiA9IGFzc2lnbihCW0ErK10sIHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQSsrO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgZGVjaW1hbCBwbGFjZXNcbiAgICAgICAgICAgIGlmIChBICsgMSA9PT0gQi5sZW5ndGggfHwgQltBICsgMV0gPT09ICcoJyAmJiBCW0EgKyAzXSA9PT0gJyknIHx8IEJbQSArIDFdID09PSBcIidcIiAmJiBCW0EgKyAzXSA9PT0gXCInXCIpIHtcbiAgICAgICAgICAgICAgdyA9IGFzc2lnbihCW0FdLCBzKTtcbiAgICAgICAgICAgICAgeSA9IE1hdGgucG93KDEwLCBCW0FdLmxlbmd0aCk7XG4gICAgICAgICAgICAgIEErKztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHJlcGVhdGluZyBwbGFjZXNcbiAgICAgICAgICAgIGlmIChCW0FdID09PSAnKCcgJiYgQltBICsgMl0gPT09ICcpJyB8fCBCW0FdID09PSBcIidcIiAmJiBCW0EgKyAyXSA9PT0gXCInXCIpIHtcbiAgICAgICAgICAgICAgeCA9IGFzc2lnbihCW0EgKyAxXSwgcyk7XG4gICAgICAgICAgICAgIHogPSBNYXRoLnBvdygxMCwgQltBICsgMV0ubGVuZ3RoKSAtIDE7XG4gICAgICAgICAgICAgIEEgKz0gMztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIH0gZWxzZSBpZiAoQltBICsgMV0gPT09ICcvJyB8fCBCW0EgKyAxXSA9PT0gJzonKSB7IC8vIENoZWNrIGZvciBhIHNpbXBsZSBmcmFjdGlvbiBcIjEyMy80NTZcIiBvciBcIjEyMzo0NTZcIlxuICAgICAgICAgICAgdyA9IGFzc2lnbihCW0FdLCBzKTtcbiAgICAgICAgICAgIHkgPSBhc3NpZ24oQltBICsgMl0sIDEpO1xuICAgICAgICAgICAgQSArPSAzO1xuICAgICAgICAgIH0gZWxzZSBpZiAoQltBICsgM10gPT09ICcvJyAmJiBCW0EgKyAxXSA9PT0gJyAnKSB7IC8vIENoZWNrIGZvciBhIGNvbXBsZXggZnJhY3Rpb24gXCIxMjMgMS8yXCJcbiAgICAgICAgICAgIHYgPSBhc3NpZ24oQltBXSwgcyk7XG4gICAgICAgICAgICB3ID0gYXNzaWduKEJbQSArIDJdLCBzKTtcbiAgICAgICAgICAgIHkgPSBhc3NpZ24oQltBICsgNF0sIDEpO1xuICAgICAgICAgICAgQSArPSA1O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChCLmxlbmd0aCA8PSBBKSB7IC8vIENoZWNrIGZvciBtb3JlIHRva2VucyBvbiB0aGUgc3RhY2tcbiAgICAgICAgICAgIGQgPSB5ICogejtcbiAgICAgICAgICAgIHMgPSAvKiB2b2lkICovXG4gICAgICAgICAgICAgICAgICAgIG4gPSB4ICsgZCAqIHYgKyB6ICogdztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8qIEZhbGwgdGhyb3VnaCBvbiBlcnJvciAqL1xuICAgICAgICB9XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKTtcbiAgICAgIH1cblxuICAgIGlmIChkID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRGl2aXNpb25CeVplcm8oKTtcbiAgICB9XG5cbiAgICBQW1wic1wiXSA9IHMgPCAwID8gLTEgOiAxO1xuICAgIFBbXCJuXCJdID0gTWF0aC5hYnMobik7XG4gICAgUFtcImRcIl0gPSBNYXRoLmFicyhkKTtcbiAgfTtcblxuICBmdW5jdGlvbiBtb2Rwb3coYiwgZSwgbSkge1xuXG4gICAgdmFyIHIgPSAxO1xuICAgIGZvciAoOyBlID4gMDsgYiA9IChiICogYikgJSBtLCBlID4+PSAxKSB7XG5cbiAgICAgIGlmIChlICYgMSkge1xuICAgICAgICByID0gKHIgKiBiKSAlIG07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByO1xuICB9XG5cblxuICBmdW5jdGlvbiBjeWNsZUxlbihuLCBkKSB7XG5cbiAgICBmb3IgKDsgZCAlIDIgPT09IDA7XG4gICAgICAgICAgICBkIC89IDIpIHtcbiAgICB9XG5cbiAgICBmb3IgKDsgZCAlIDUgPT09IDA7XG4gICAgICAgICAgICBkIC89IDUpIHtcbiAgICB9XG5cbiAgICBpZiAoZCA9PT0gMSkgLy8gQ2F0Y2ggbm9uLWN5Y2xpYyBudW1iZXJzXG4gICAgICByZXR1cm4gMDtcblxuICAgIC8vIElmIHdlIHdvdWxkIGxpa2UgdG8gY29tcHV0ZSByZWFsbHkgbGFyZ2UgbnVtYmVycyBxdWlja2VyLCB3ZSBjb3VsZCBtYWtlIHVzZSBvZiBGZXJtYXQncyBsaXR0bGUgdGhlb3JlbTpcbiAgICAvLyAxMF4oZC0xKSAlIGQgPT0gMVxuICAgIC8vIEhvd2V2ZXIsIHdlIGRvbid0IG5lZWQgc3VjaCBsYXJnZSBudW1iZXJzIGFuZCBNQVhfQ1lDTEVfTEVOIHNob3VsZCBiZSB0aGUgY2Fwc3RvbmUsXG4gICAgLy8gYXMgd2Ugd2FudCB0byB0cmFuc2xhdGUgdGhlIG51bWJlcnMgdG8gc3RyaW5ncy5cblxuICAgIHZhciByZW0gPSAxMCAlIGQ7XG4gICAgdmFyIHQgPSAxO1xuXG4gICAgZm9yICg7IHJlbSAhPT0gMTsgdCsrKSB7XG4gICAgICByZW0gPSByZW0gKiAxMCAlIGQ7XG5cbiAgICAgIGlmICh0ID4gTUFYX0NZQ0xFX0xFTilcbiAgICAgICAgcmV0dXJuIDA7IC8vIFJldHVybmluZyAwIGhlcmUgbWVhbnMgdGhhdCB3ZSBkb24ndCBwcmludCBpdCBhcyBhIGN5Y2xpYyBudW1iZXIuIEl0J3MgbGlrZWx5IHRoYXQgdGhlIGFuc3dlciBpcyBgZC0xYFxuICAgIH1cbiAgICByZXR1cm4gdDtcbiAgfVxuXG5cbiAgICAgZnVuY3Rpb24gY3ljbGVTdGFydChuLCBkLCBsZW4pIHtcblxuICAgIHZhciByZW0xID0gMTtcbiAgICB2YXIgcmVtMiA9IG1vZHBvdygxMCwgbGVuLCBkKTtcblxuICAgIGZvciAodmFyIHQgPSAwOyB0IDwgMzAwOyB0KyspIHsgLy8gcyA8IH5sb2cxMChOdW1iZXIuTUFYX1ZBTFVFKVxuICAgICAgLy8gU29sdmUgMTBecyA9PSAxMF4ocyt0KSAobW9kIGQpXG5cbiAgICAgIGlmIChyZW0xID09PSByZW0yKVxuICAgICAgICByZXR1cm4gdDtcblxuICAgICAgcmVtMSA9IHJlbTEgKiAxMCAlIGQ7XG4gICAgICByZW0yID0gcmVtMiAqIDEwICUgZDtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBmdW5jdGlvbiBnY2QoYSwgYikge1xuXG4gICAgaWYgKCFhKVxuICAgICAgcmV0dXJuIGI7XG4gICAgaWYgKCFiKVxuICAgICAgcmV0dXJuIGE7XG5cbiAgICB3aGlsZSAoMSkge1xuICAgICAgYSAlPSBiO1xuICAgICAgaWYgKCFhKVxuICAgICAgICByZXR1cm4gYjtcbiAgICAgIGIgJT0gYTtcbiAgICAgIGlmICghYilcbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBNb2R1bGUgY29uc3RydWN0b3JcbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7bnVtYmVyfEZyYWN0aW9uPX0gYVxuICAgKiBAcGFyYW0ge251bWJlcj19IGJcbiAgICovXG4gIGZ1bmN0aW9uIEZyYWN0aW9uKGEsIGIpIHtcblxuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGcmFjdGlvbikpIHtcbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oYSwgYik7XG4gICAgfVxuXG4gICAgcGFyc2UoYSwgYik7XG5cbiAgICBpZiAoRnJhY3Rpb25bJ1JFRFVDRSddKSB7XG4gICAgICBhID0gZ2NkKFBbXCJkXCJdLCBQW1wiblwiXSk7IC8vIEFidXNlIGFcbiAgICB9IGVsc2Uge1xuICAgICAgYSA9IDE7XG4gICAgfVxuXG4gICAgdGhpc1tcInNcIl0gPSBQW1wic1wiXTtcbiAgICB0aGlzW1wiblwiXSA9IFBbXCJuXCJdIC8gYTtcbiAgICB0aGlzW1wiZFwiXSA9IFBbXCJkXCJdIC8gYTtcbiAgfVxuXG4gIC8qKlxuICAgKiBCb29sZWFuIGdsb2JhbCB2YXJpYWJsZSB0byBiZSBhYmxlIHRvIGRpc2FibGUgYXV0b21hdGljIHJlZHVjdGlvbiBvZiB0aGUgZnJhY3Rpb25cbiAgICpcbiAgICovXG4gIEZyYWN0aW9uWydSRURVQ0UnXSA9IDE7XG5cbiAgRnJhY3Rpb24ucHJvdG90eXBlID0ge1xuXG4gICAgXCJzXCI6IDEsXG4gICAgXCJuXCI6IDAsXG4gICAgXCJkXCI6IDEsXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBhYnNvbHV0ZSB2YWx1ZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigtNCkuYWJzKCkgPT4gNFxuICAgICAqKi9cbiAgICBcImFic1wiOiBmdW5jdGlvbigpIHtcblxuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzW1wiblwiXSwgdGhpc1tcImRcIl0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbnZlcnRzIHRoZSBzaWduIG9mIHRoZSBjdXJyZW50IGZyYWN0aW9uXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKC00KS5uZWcoKSA9PiA0XG4gICAgICoqL1xuICAgIFwibmVnXCI6IGZ1bmN0aW9uKCkge1xuXG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKC10aGlzW1wic1wiXSAqIHRoaXNbXCJuXCJdLCB0aGlzW1wiZFwiXSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oe246IDIsIGQ6IDN9KS5hZGQoXCIxNC45XCIpID0+IDQ2NyAvIDMwXG4gICAgICoqL1xuICAgIFwiYWRkXCI6IGZ1bmN0aW9uKGEsIGIpIHtcblxuICAgICAgcGFyc2UoYSwgYik7XG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgICAgICB0aGlzW1wic1wiXSAqIHRoaXNbXCJuXCJdICogUFtcImRcIl0gKyBQW1wic1wiXSAqIHRoaXNbXCJkXCJdICogUFtcIm5cIl0sXG4gICAgICAgICAgICAgIHRoaXNbXCJkXCJdICogUFtcImRcIl1cbiAgICAgICAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3VidHJhY3RzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKHtuOiAyLCBkOiAzfSkuYWRkKFwiMTQuOVwiKSA9PiAtNDI3IC8gMzBcbiAgICAgKiovXG4gICAgXCJzdWJcIjogZnVuY3Rpb24oYSwgYikge1xuXG4gICAgICBwYXJzZShhLCBiKTtcbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgICAgIHRoaXNbXCJzXCJdICogdGhpc1tcIm5cIl0gKiBQW1wiZFwiXSAtIFBbXCJzXCJdICogdGhpc1tcImRcIl0gKiBQW1wiblwiXSxcbiAgICAgICAgICAgICAgdGhpc1tcImRcIl0gKiBQW1wiZFwiXVxuICAgICAgICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsaWVzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiLTE3LigzNDUpXCIpLm11bCgzKSA9PiA1Nzc2IC8gMTExXG4gICAgICoqL1xuICAgIFwibXVsXCI6IGZ1bmN0aW9uKGEsIGIpIHtcblxuICAgICAgcGFyc2UoYSwgYik7XG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgICAgICB0aGlzW1wic1wiXSAqIFBbXCJzXCJdICogdGhpc1tcIm5cIl0gKiBQW1wiblwiXSxcbiAgICAgICAgICAgICAgdGhpc1tcImRcIl0gKiBQW1wiZFwiXVxuICAgICAgICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaXZpZGVzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiLTE3LigzNDUpXCIpLmludmVyc2UoKS5kaXYoMylcbiAgICAgKiovXG4gICAgXCJkaXZcIjogZnVuY3Rpb24oYSwgYikge1xuXG4gICAgICBwYXJzZShhLCBiKTtcbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgICAgIHRoaXNbXCJzXCJdICogUFtcInNcIl0gKiB0aGlzW1wiblwiXSAqIFBbXCJkXCJdLFxuICAgICAgICAgICAgICB0aGlzW1wiZFwiXSAqIFBbXCJuXCJdXG4gICAgICAgICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsb25lcyB0aGUgYWN0dWFsIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIi0xNy4oMzQ1KVwiKS5jbG9uZSgpXG4gICAgICoqL1xuICAgIFwiY2xvbmVcIjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBtb2R1bG8gb2YgdHdvIHJhdGlvbmFsIG51bWJlcnMgLSBhIG1vcmUgcHJlY2lzZSBmbW9kXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLm1vZChbNywgOF0pID0+ICgxMy8zKSAlICg3LzgpID0gKDUvNilcbiAgICAgKiovXG4gICAgXCJtb2RcIjogZnVuY3Rpb24oYSwgYikge1xuXG4gICAgICBpZiAoaXNOYU4odGhpc1snbiddKSB8fCBpc05hTih0aGlzWydkJ10pKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXNbXCJzXCJdICogdGhpc1tcIm5cIl0gJSB0aGlzW1wiZFwiXSwgMSk7XG4gICAgICB9XG5cbiAgICAgIHBhcnNlKGEsIGIpO1xuICAgICAgaWYgKDAgPT09IFBbXCJuXCJdICYmIDAgPT09IHRoaXNbXCJkXCJdKSB7XG4gICAgICAgIEZyYWN0aW9uKDAsIDApOyAvLyBUaHJvdyBEaXZpc2lvbkJ5WmVyb1xuICAgICAgfVxuXG4gICAgICAvKlxuICAgICAgICogRmlyc3Qgc2lsbHkgYXR0ZW1wdCwga2luZGEgc2xvd1xuICAgICAgICpcbiAgICAgICByZXR1cm4gdGhhdFtcInN1YlwiXSh7XG4gICAgICAgXCJuXCI6IG51bVtcIm5cIl0gKiBNYXRoLmZsb29yKCh0aGlzLm4gLyB0aGlzLmQpIC8gKG51bS5uIC8gbnVtLmQpKSxcbiAgICAgICBcImRcIjogbnVtW1wiZFwiXSxcbiAgICAgICBcInNcIjogdGhpc1tcInNcIl1cbiAgICAgICB9KTsqL1xuXG4gICAgICAvKlxuICAgICAgICogTmV3IGF0dGVtcHQ6IGExIC8gYjEgPSBhMiAvIGIyICogcSArIHJcbiAgICAgICAqID0+IGIyICogYTEgPSBhMiAqIGIxICogcSArIGIxICogYjIgKiByXG4gICAgICAgKiA9PiAoYjIgKiBhMSAlIGEyICogYjEpIC8gKGIxICogYjIpXG4gICAgICAgKi9cbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgICAgIHRoaXNbXCJzXCJdICogKFBbXCJkXCJdICogdGhpc1tcIm5cIl0pICUgKFBbXCJuXCJdICogdGhpc1tcImRcIl0pLFxuICAgICAgICAgICAgICBQW1wiZFwiXSAqIHRoaXNbXCJkXCJdXG4gICAgICAgICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZyYWN0aW9uYWwgZ2NkIG9mIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDUsOCkuZ2NkKDMsNykgPT4gMS81NlxuICAgICAqL1xuICAgIFwiZ2NkXCI6IGZ1bmN0aW9uKGEsIGIpIHtcblxuICAgICAgcGFyc2UoYSwgYik7XG5cbiAgICAgIC8vIGdjZChhIC8gYiwgYyAvIGQpID0gZ2NkKGEsIGMpIC8gbGNtKGIsIGQpXG5cbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oZ2NkKFBbXCJuXCJdLCB0aGlzW1wiblwiXSkgKiBnY2QoUFtcImRcIl0sIHRoaXNbXCJkXCJdKSwgUFtcImRcIl0gKiB0aGlzW1wiZFwiXSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZyYWN0aW9uYWwgbGNtIG9mIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDUsOCkubGNtKDMsNykgPT4gMTVcbiAgICAgKi9cbiAgICBcImxjbVwiOiBmdW5jdGlvbihhLCBiKSB7XG5cbiAgICAgIHBhcnNlKGEsIGIpO1xuXG4gICAgICAvLyBsY20oYSAvIGIsIGMgLyBkKSA9IGxjbShhLCBjKSAvIGdjZChiLCBkKVxuXG4gICAgICBpZiAoUFtcIm5cIl0gPT09IDAgJiYgdGhpc1tcIm5cIl0gPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oUFtcIm5cIl0gKiB0aGlzW1wiblwiXSwgZ2NkKFBbXCJuXCJdLCB0aGlzW1wiblwiXSkgKiBnY2QoUFtcImRcIl0sIHRoaXNbXCJkXCJdKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGNlaWwgb2YgYSByYXRpb25hbCBudW1iZXJcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykuY2VpbCgpID0+ICg1IC8gMSlcbiAgICAgKiovXG4gICAgXCJjZWlsXCI6IGZ1bmN0aW9uKHBsYWNlcykge1xuXG4gICAgICBwbGFjZXMgPSBNYXRoLnBvdygxMCwgcGxhY2VzIHx8IDApO1xuXG4gICAgICBpZiAoaXNOYU4odGhpc1tcIm5cIl0pIHx8IGlzTmFOKHRoaXNbXCJkXCJdKSkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTik7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGguY2VpbChwbGFjZXMgKiB0aGlzW1wic1wiXSAqIHRoaXNbXCJuXCJdIC8gdGhpc1tcImRcIl0pLCBwbGFjZXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmbG9vciBvZiBhIHJhdGlvbmFsIG51bWJlclxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5mbG9vcigpID0+ICg0IC8gMSlcbiAgICAgKiovXG4gICAgXCJmbG9vclwiOiBmdW5jdGlvbihwbGFjZXMpIHtcblxuICAgICAgcGxhY2VzID0gTWF0aC5wb3coMTAsIHBsYWNlcyB8fCAwKTtcblxuICAgICAgaWYgKGlzTmFOKHRoaXNbXCJuXCJdKSB8fCBpc05hTih0aGlzW1wiZFwiXSkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLmZsb29yKHBsYWNlcyAqIHRoaXNbXCJzXCJdICogdGhpc1tcIm5cIl0gLyB0aGlzW1wiZFwiXSksIHBsYWNlcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJvdW5kcyBhIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykucm91bmQoKSA9PiAoNCAvIDEpXG4gICAgICoqL1xuICAgIFwicm91bmRcIjogZnVuY3Rpb24ocGxhY2VzKSB7XG5cbiAgICAgIHBsYWNlcyA9IE1hdGgucG93KDEwLCBwbGFjZXMgfHwgMCk7XG5cbiAgICAgIGlmIChpc05hTih0aGlzW1wiblwiXSkgfHwgaXNOYU4odGhpc1tcImRcIl0pKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5yb3VuZChwbGFjZXMgKiB0aGlzW1wic1wiXSAqIHRoaXNbXCJuXCJdIC8gdGhpc1tcImRcIl0pLCBwbGFjZXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBpbnZlcnNlIG9mIHRoZSBmcmFjdGlvbiwgbWVhbnMgbnVtZXJhdG9yIGFuZCBkZW51bWVyYXRvciBhcmUgZXhjaGFuZ2VkXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFstMywgNF0pLmludmVyc2UoKSA9PiAtNCAvIDNcbiAgICAgKiovXG4gICAgXCJpbnZlcnNlXCI6IGZ1bmN0aW9uKCkge1xuXG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXNbXCJzXCJdICogdGhpc1tcImRcIl0sIHRoaXNbXCJuXCJdKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZnJhY3Rpb24gdG8gc29tZSBpbnRlZ2VyIGV4cG9uZW50XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKC0xLDIpLnBvdygtMykgPT4gLThcbiAgICAgKi9cbiAgICBcInBvd1wiOiBmdW5jdGlvbihtKSB7XG5cbiAgICAgIGlmIChtIDwgMCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGgucG93KHRoaXNbJ3MnXSAqIHRoaXNbXCJkXCJdLCAtbSksIE1hdGgucG93KHRoaXNbXCJuXCJdLCAtbSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLnBvdyh0aGlzWydzJ10gKiB0aGlzW1wiblwiXSwgbSksIE1hdGgucG93KHRoaXNbXCJkXCJdLCBtKSk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHR3byByYXRpb25hbCBudW1iZXJzIGFyZSB0aGUgc2FtZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigxOS42KS5lcXVhbHMoWzk4LCA1XSk7XG4gICAgICoqL1xuICAgIFwiZXF1YWxzXCI6IGZ1bmN0aW9uKGEsIGIpIHtcblxuICAgICAgcGFyc2UoYSwgYik7XG4gICAgICByZXR1cm4gdGhpc1tcInNcIl0gKiB0aGlzW1wiblwiXSAqIFBbXCJkXCJdID09PSBQW1wic1wiXSAqIFBbXCJuXCJdICogdGhpc1tcImRcIl07IC8vIFNhbWUgYXMgY29tcGFyZSgpID09PSAwXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHR3byByYXRpb25hbCBudW1iZXJzIGFyZSB0aGUgc2FtZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigxOS42KS5lcXVhbHMoWzk4LCA1XSk7XG4gICAgICoqL1xuICAgIFwiY29tcGFyZVwiOiBmdW5jdGlvbihhLCBiKSB7XG5cbiAgICAgIHBhcnNlKGEsIGIpO1xuICAgICAgdmFyIHQgPSAodGhpc1tcInNcIl0gKiB0aGlzW1wiblwiXSAqIFBbXCJkXCJdIC0gUFtcInNcIl0gKiBQW1wiblwiXSAqIHRoaXNbXCJkXCJdKTtcbiAgICAgIHJldHVybiAoMCA8IHQpIC0gKHQgPCAwKTtcbiAgICB9LFxuXG4gICAgXCJzaW1wbGlmeVwiOiBmdW5jdGlvbihlcHMpIHtcblxuICAgICAgLy8gRmlyc3QgbmFpdmUgaW1wbGVtZW50YXRpb24sIG5lZWRzIGltcHJvdmVtZW50XG5cbiAgICAgIGlmIChpc05hTih0aGlzWyduJ10pIHx8IGlzTmFOKHRoaXNbJ2QnXSkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIHZhciBjb250ID0gdGhpc1snYWJzJ10oKVsndG9Db250aW51ZWQnXSgpO1xuXG4gICAgICBlcHMgPSBlcHMgfHwgMC4wMDE7XG5cbiAgICAgIGZ1bmN0aW9uIHJlYyhhKSB7XG4gICAgICAgIGlmIChhLmxlbmd0aCA9PT0gMSlcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKGFbMF0pO1xuICAgICAgICByZXR1cm4gcmVjKGEuc2xpY2UoMSkpWydpbnZlcnNlJ10oKVsnYWRkJ10oYVswXSk7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29udC5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgdG1wID0gcmVjKGNvbnQuc2xpY2UoMCwgaSArIDEpKTtcbiAgICAgICAgaWYgKHRtcFsnc3ViJ10odGhpc1snYWJzJ10oKSlbJ2FicyddKCkudmFsdWVPZigpIDwgZXBzKSB7XG4gICAgICAgICAgcmV0dXJuIHRtcFsnbXVsJ10odGhpc1sncyddKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHR3byByYXRpb25hbCBudW1iZXJzIGFyZSBkaXZpc2libGVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oMTkuNikuZGl2aXNpYmxlKDEuNSk7XG4gICAgICovXG4gICAgXCJkaXZpc2libGVcIjogZnVuY3Rpb24oYSwgYikge1xuXG4gICAgICBwYXJzZShhLCBiKTtcbiAgICAgIHJldHVybiAhKCEoUFtcIm5cIl0gKiB0aGlzW1wiZFwiXSkgfHwgKCh0aGlzW1wiblwiXSAqIFBbXCJkXCJdKSAlIChQW1wiblwiXSAqIHRoaXNbXCJkXCJdKSkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgZGVjaW1hbCByZXByZXNlbnRhdGlvbiBvZiB0aGUgZnJhY3Rpb25cbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxMDAuJzkxODIzJ1wiKS52YWx1ZU9mKCkgPT4gMTAwLjkxODIzOTE4MjM5MTgzXG4gICAgICoqL1xuICAgICd2YWx1ZU9mJzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHJldHVybiB0aGlzW1wic1wiXSAqIHRoaXNbXCJuXCJdIC8gdGhpc1tcImRcIl07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBzdHJpbmctZnJhY3Rpb24gcmVwcmVzZW50YXRpb24gb2YgYSBGcmFjdGlvbiBvYmplY3RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxLiczJ1wiKS50b0ZyYWN0aW9uKCkgPT4gXCI0IDEvM1wiXG4gICAgICoqL1xuICAgICd0b0ZyYWN0aW9uJzogZnVuY3Rpb24oZXhjbHVkZVdob2xlKSB7XG5cbiAgICAgIHZhciB3aG9sZSwgc3RyID0gXCJcIjtcbiAgICAgIHZhciBuID0gdGhpc1tcIm5cIl07XG4gICAgICB2YXIgZCA9IHRoaXNbXCJkXCJdO1xuICAgICAgaWYgKHRoaXNbXCJzXCJdIDwgMCkge1xuICAgICAgICBzdHIgKz0gJy0nO1xuICAgICAgfVxuXG4gICAgICBpZiAoZCA9PT0gMSkge1xuICAgICAgICBzdHIgKz0gbjtcbiAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgaWYgKGV4Y2x1ZGVXaG9sZSAmJiAod2hvbGUgPSBNYXRoLmZsb29yKG4gLyBkKSkgPiAwKSB7XG4gICAgICAgICAgc3RyICs9IHdob2xlO1xuICAgICAgICAgIHN0ciArPSBcIiBcIjtcbiAgICAgICAgICBuICU9IGQ7XG4gICAgICAgIH1cblxuICAgICAgICBzdHIgKz0gbjtcbiAgICAgICAgc3RyICs9ICcvJztcbiAgICAgICAgc3RyICs9IGQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgbGF0ZXggcmVwcmVzZW50YXRpb24gb2YgYSBGcmFjdGlvbiBvYmplY3RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxLiczJ1wiKS50b0xhdGV4KCkgPT4gXCJcXGZyYWN7NH17M31cIlxuICAgICAqKi9cbiAgICAndG9MYXRleCc6IGZ1bmN0aW9uKGV4Y2x1ZGVXaG9sZSkge1xuXG4gICAgICB2YXIgd2hvbGUsIHN0ciA9IFwiXCI7XG4gICAgICB2YXIgbiA9IHRoaXNbXCJuXCJdO1xuICAgICAgdmFyIGQgPSB0aGlzW1wiZFwiXTtcbiAgICAgIGlmICh0aGlzW1wic1wiXSA8IDApIHtcbiAgICAgICAgc3RyICs9ICctJztcbiAgICAgIH1cblxuICAgICAgaWYgKGQgPT09IDEpIHtcbiAgICAgICAgc3RyICs9IG47XG4gICAgICB9IGVsc2Uge1xuXG4gICAgICAgIGlmIChleGNsdWRlV2hvbGUgJiYgKHdob2xlID0gTWF0aC5mbG9vcihuIC8gZCkpID4gMCkge1xuICAgICAgICAgIHN0ciArPSB3aG9sZTtcbiAgICAgICAgICBuICU9IGQ7XG4gICAgICAgIH1cblxuICAgICAgICBzdHIgKz0gXCJcXFxcZnJhY3tcIjtcbiAgICAgICAgc3RyICs9IG47XG4gICAgICAgIHN0ciArPSAnfXsnO1xuICAgICAgICBzdHIgKz0gZDtcbiAgICAgICAgc3RyICs9ICd9JztcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YgY29udGludWVkIGZyYWN0aW9uIGVsZW1lbnRzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiNy84XCIpLnRvQ29udGludWVkKCkgPT4gWzAsMSw3XVxuICAgICAqL1xuICAgICd0b0NvbnRpbnVlZCc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgdDtcbiAgICAgIHZhciBhID0gdGhpc1snbiddO1xuICAgICAgdmFyIGIgPSB0aGlzWydkJ107XG4gICAgICB2YXIgcmVzID0gW107XG5cbiAgICAgIGlmIChpc05hTih0aGlzWyduJ10pIHx8IGlzTmFOKHRoaXNbJ2QnXSkpIHtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgIH1cblxuICAgICAgZG8ge1xuICAgICAgICByZXMucHVzaChNYXRoLmZsb29yKGEgLyBiKSk7XG4gICAgICAgIHQgPSBhICUgYjtcbiAgICAgICAgYSA9IGI7XG4gICAgICAgIGIgPSB0O1xuICAgICAgfSB3aGlsZSAoYSAhPT0gMSk7XG5cbiAgICAgIHJldHVybiByZXM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYSBmcmFjdGlvbiB3aXRoIGFsbCBkaWdpdHNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxMDAuJzkxODIzJ1wiKS50b1N0cmluZygpID0+IFwiMTAwLig5MTgyMylcIlxuICAgICAqKi9cbiAgICAndG9TdHJpbmcnOiBmdW5jdGlvbihkZWMpIHtcblxuICAgICAgdmFyIGc7XG4gICAgICB2YXIgTiA9IHRoaXNbXCJuXCJdO1xuICAgICAgdmFyIEQgPSB0aGlzW1wiZFwiXTtcblxuICAgICAgaWYgKGlzTmFOKE4pIHx8IGlzTmFOKEQpKSB7XG4gICAgICAgIHJldHVybiBcIk5hTlwiO1xuICAgICAgfVxuXG4gICAgICBpZiAoIUZyYWN0aW9uWydSRURVQ0UnXSkge1xuICAgICAgICBnID0gZ2NkKE4sIEQpO1xuICAgICAgICBOIC89IGc7XG4gICAgICAgIEQgLz0gZztcbiAgICAgIH1cblxuICAgICAgZGVjID0gZGVjIHx8IDE1OyAvLyAxNSA9IGRlY2ltYWwgcGxhY2VzIHdoZW4gbm8gcmVwaXRhdGlvblxuXG4gICAgICB2YXIgY3ljTGVuID0gY3ljbGVMZW4oTiwgRCk7IC8vIEN5Y2xlIGxlbmd0aFxuICAgICAgdmFyIGN5Y09mZiA9IGN5Y2xlU3RhcnQoTiwgRCwgY3ljTGVuKTsgLy8gQ3ljbGUgc3RhcnRcblxuICAgICAgdmFyIHN0ciA9IHRoaXNbJ3MnXSA9PT0gLTEgPyBcIi1cIiA6IFwiXCI7XG5cbiAgICAgIHN0ciArPSBOIC8gRCB8IDA7XG5cbiAgICAgIE4gJT0gRDtcbiAgICAgIE4gKj0gMTA7XG5cbiAgICAgIGlmIChOKVxuICAgICAgICBzdHIgKz0gXCIuXCI7XG5cbiAgICAgIGlmIChjeWNMZW4pIHtcblxuICAgICAgICBmb3IgKHZhciBpID0gY3ljT2ZmOyBpLS07ICkge1xuICAgICAgICAgIHN0ciArPSBOIC8gRCB8IDA7XG4gICAgICAgICAgTiAlPSBEO1xuICAgICAgICAgIE4gKj0gMTA7XG4gICAgICAgIH1cbiAgICAgICAgc3RyICs9IFwiKFwiO1xuICAgICAgICBmb3IgKHZhciBpID0gY3ljTGVuOyBpLS07ICkge1xuICAgICAgICAgIHN0ciArPSBOIC8gRCB8IDA7XG4gICAgICAgICAgTiAlPSBEO1xuICAgICAgICAgIE4gKj0gMTA7XG4gICAgICAgIH1cbiAgICAgICAgc3RyICs9IFwiKVwiO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IGRlYzsgTiAmJiBpLS07ICkge1xuICAgICAgICAgIHN0ciArPSBOIC8gRCB8IDA7XG4gICAgICAgICAgTiAlPSBEO1xuICAgICAgICAgIE4gKj0gMTA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICB9O1xuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lW1wiYW1kXCJdKSB7XG4gICAgZGVmaW5lKFtdLCBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBGcmFjdGlvbjtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gXCJvYmplY3RcIikge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyd2YWx1ZSc6IHRydWV9KTtcbiAgICBGcmFjdGlvblsnZGVmYXVsdCddID0gRnJhY3Rpb247XG4gICAgRnJhY3Rpb25bJ0ZyYWN0aW9uJ10gPSBGcmFjdGlvbjtcbiAgICBtb2R1bGVbJ2V4cG9ydHMnXSA9IEZyYWN0aW9uO1xuICB9IGVsc2Uge1xuICAgIHJvb3RbJ0ZyYWN0aW9uJ10gPSBGcmFjdGlvbjtcbiAgfVxuXG59KSh0aGlzKTtcbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIE1vbm9taWFsIHtcbiAgY29uc3RydWN0b3IgKGMsIHZzKSB7XG4gICAgaWYgKCFpc05hTihjKSAmJiB2cyBpbnN0YW5jZW9mIE1hcCkge1xuICAgICAgdGhpcy5jID0gY1xuICAgICAgdGhpcy52cyA9IHZzXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgYyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuaW5pdFN0cihjKVxuICAgIH0gZWxzZSBpZiAoIWlzTmFOKGMpKSB7XG4gICAgICB0aGlzLmMgPSBjXG4gICAgICB0aGlzLnZzID0gbmV3IE1hcCgpXG4gICAgfSBlbHNlIHsgLy8gZGVmYXVsdCBhcyBhIHRlc3Q6IDR4XjJ5XG4gICAgICB0aGlzLmMgPSA0XG4gICAgICB0aGlzLnZzID0gbmV3IE1hcChbWyd4JywgMl0sIFsneScsIDFdXSlcbiAgICB9XG4gIH1cblxuICBjbG9uZSAoKSB7XG4gICAgY29uc3QgdnMgPSBuZXcgTWFwKHRoaXMudnMpXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbCh0aGlzLmMsIHZzKVxuICB9XG5cbiAgbXVsICh0aGF0KSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIE1vbm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBNb25vbWlhbCh0aGF0KVxuICAgIH1cbiAgICBjb25zdCBjID0gdGhpcy5jICogdGhhdC5jXG4gICAgbGV0IHZzID0gbmV3IE1hcCgpXG4gICAgdGhpcy52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICh0aGF0LnZzLmhhcyh2YXJpYWJsZSkpIHtcbiAgICAgICAgdnMuc2V0KHZhcmlhYmxlLCB0aGlzLnZzLmdldCh2YXJpYWJsZSkgKyB0aGF0LnZzLmdldCh2YXJpYWJsZSkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2cy5zZXQodmFyaWFibGUsIHRoaXMudnMuZ2V0KHZhcmlhYmxlKSlcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhhdC52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICghdnMuaGFzKHZhcmlhYmxlKSkge1xuICAgICAgICB2cy5zZXQodmFyaWFibGUsIHRoYXQudnMuZ2V0KHZhcmlhYmxlKSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHZzID0gbmV3IE1hcChbLi4udnMuZW50cmllcygpXS5zb3J0KCkpXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbChjLCB2cylcbiAgfVxuXG4gIHRvTGF0ZXggKCkge1xuICAgIGlmICh0aGlzLnZzLnNpemUgPT09IDApIHJldHVybiB0aGlzLmMudG9TdHJpbmcoKVxuICAgIGxldCBzdHIgPSB0aGlzLmMgPT09IDEgPyAnJ1xuICAgICAgOiB0aGlzLmMgPT09IC0xID8gJy0nXG4gICAgICAgIDogdGhpcy5jLnRvU3RyaW5nKClcbiAgICB0aGlzLnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKGluZGV4ID09PSAxKSB7XG4gICAgICAgIHN0ciArPSB2YXJpYWJsZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyICs9IHZhcmlhYmxlICsgJ14nICsgaW5kZXhcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBzdHJcbiAgfVxuXG4gIHNvcnQgKCkge1xuICAgIC8vIHNvcnRzIChtb2RpZmllcyBvYmplY3QpXG4gICAgdGhpcy52cyA9IG5ldyBNYXAoWy4uLnRoaXMudnMuZW50cmllcygpXS5zb3J0KCkpXG4gIH1cblxuICBjbGVhblplcm9zICgpIHtcbiAgICB0aGlzLnZzLmZvckVhY2goKGlkeCwgdikgPT4ge1xuICAgICAgaWYgKGlkeCA9PT0gMCkgdGhpcy52cy5kZWxldGUodilcbiAgICB9KVxuICB9XG5cbiAgbGlrZSAodGhhdCkge1xuICAgIC8vIHJldHVybiB0cnVlIGlmIGxpa2UgdGVybXMsIGZhbHNlIGlmIG90aGVyd2lzZVxuICAgIC8vIG5vdCB0aGUgbW9zdCBlZmZpY2llbnQgYXQgdGhlIG1vbWVudCwgYnV0IGdvb2QgZW5vdWdoLlxuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgTW9ub21pYWwodGhhdClcbiAgICB9XG5cbiAgICBsZXQgbGlrZSA9IHRydWVcbiAgICB0aGlzLnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKCF0aGF0LnZzLmhhcyh2YXJpYWJsZSkgfHwgdGhhdC52cy5nZXQodmFyaWFibGUpICE9PSBpbmRleCkge1xuICAgICAgICBsaWtlID0gZmFsc2VcbiAgICAgIH1cbiAgICB9KVxuICAgIHRoYXQudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAoIXRoaXMudnMuaGFzKHZhcmlhYmxlKSB8fCB0aGlzLnZzLmdldCh2YXJpYWJsZSkgIT09IGluZGV4KSB7XG4gICAgICAgIGxpa2UgPSBmYWxzZVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGxpa2VcbiAgfVxuXG4gIGFkZCAodGhhdCwgY2hlY2tMaWtlKSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIE1vbm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBNb25vbWlhbCh0aGF0KVxuICAgIH1cbiAgICAvLyBhZGRzIHR3byBjb21wYXRpYmxlIG1vbm9taWFsc1xuICAgIC8vIGNoZWNrTGlrZSAoZGVmYXVsdCB0cnVlKSB3aWxsIGNoZWNrIGZpcnN0IGlmIHRoZXkgYXJlIGxpa2UgYW5kIHRocm93IGFuIGV4Y2VwdGlvblxuICAgIC8vIHVuZGVmaW5lZCBiZWhhdmlvdXIgaWYgY2hlY2tMaWtlIGlzIGZhbHNlXG4gICAgaWYgKGNoZWNrTGlrZSA9PT0gdW5kZWZpbmVkKSBjaGVja0xpa2UgPSB0cnVlXG4gICAgaWYgKGNoZWNrTGlrZSAmJiAhdGhpcy5saWtlKHRoYXQpKSB0aHJvdyBuZXcgRXJyb3IoJ0FkZGluZyB1bmxpa2UgdGVybXMnKVxuICAgIGNvbnN0IGMgPSB0aGlzLmMgKyB0aGF0LmNcbiAgICBjb25zdCB2cyA9IHRoaXMudnNcbiAgICByZXR1cm4gbmV3IE1vbm9taWFsKGMsIHZzKVxuICB9XG5cbiAgaW5pdFN0ciAoc3RyKSB7XG4gICAgLy8gY3VycmVudGx5IG5vIGVycm9yIGNoZWNraW5nIGFuZCBmcmFnaWxlXG4gICAgLy8gVGhpbmdzIG5vdCB0byBwYXNzIGluOlxuICAgIC8vICB6ZXJvIGluZGljZXNcbiAgICAvLyAgbXVsdGktY2hhcmFjdGVyIHZhcmlhYmxlc1xuICAgIC8vICBuZWdhdGl2ZSBpbmRpY2VzXG4gICAgLy8gIG5vbi1pbnRlZ2VyIGNvZWZmaWNpZW50c1xuICAgIGNvbnN0IGxlYWQgPSBzdHIubWF0Y2goL14tP1xcZCovKVswXVxuICAgIGNvbnN0IGMgPSBsZWFkID09PSAnJyA/IDFcbiAgICAgIDogbGVhZCA9PT0gJy0nID8gLTFcbiAgICAgICAgOiBwYXJzZUludChsZWFkKVxuICAgIGxldCB2cyA9IHN0ci5tYXRjaCgvKFthLXpBLVpdKShcXF5cXGQrKT8vZylcbiAgICBpZiAoIXZzKSB2cyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgdiA9IHZzW2ldLnNwbGl0KCdeJylcbiAgICAgIHZbMV0gPSB2WzFdID8gcGFyc2VJbnQodlsxXSkgOiAxXG4gICAgICB2c1tpXSA9IHZcbiAgICB9XG4gICAgdnMgPSB2cy5maWx0ZXIodiA9PiB2WzFdICE9PSAwKVxuICAgIHRoaXMuYyA9IGNcbiAgICB0aGlzLnZzID0gbmV3IE1hcCh2cylcbiAgfVxuXG4gIHN0YXRpYyB2YXIgKHYpIHtcbiAgICAvLyBmYWN0b3J5IGZvciBhIHNpbmdsZSB2YXJpYWJsZSBtb25vbWlhbFxuICAgIGNvbnN0IGMgPSAxXG4gICAgY29uc3QgdnMgPSBuZXcgTWFwKFtbdiwgMV1dKVxuICAgIHJldHVybiBuZXcgTW9ub21pYWwoYywgdnMpXG4gIH1cbn1cbiIsImltcG9ydCBNb25vbWlhbCBmcm9tICdNb25vbWlhbCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUG9seW5vbWlhbCB7XG4gIGNvbnN0cnVjdG9yICh0ZXJtcykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHRlcm1zKSAmJiAodGVybXNbMF0gaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRlcm1zLm1hcCh0ID0+IHQuY2xvbmUoKSlcbiAgICAgIHRoaXMudGVybXMgPSB0ZXJtc1xuICAgIH0gZWxzZSBpZiAoIWlzTmFOKHRlcm1zKSkge1xuICAgICAgdGhpcy5pbml0TnVtKHRlcm1zKVxuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRlcm1zID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5pbml0U3RyKHRlcm1zKVxuICAgIH1cbiAgfVxuXG4gIGluaXRTdHIgKHN0cikge1xuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9cXCstL2csICctJykgLy8gYSBob3JyaWJsZSBib2RnZVxuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC8tL2csICcrLScpIC8vIG1ha2UgbmVnYXRpdmUgdGVybXMgZXhwbGljaXQuXG4gICAgc3RyID0gc3RyLnJlcGxhY2UoL1xccy9nLCAnJykgLy8gc3RyaXAgd2hpdGVzcGFjZVxuICAgIHRoaXMudGVybXMgPSBzdHIuc3BsaXQoJysnKVxuICAgICAgLm1hcChzID0+IG5ldyBNb25vbWlhbChzKSlcbiAgICAgIC5maWx0ZXIodCA9PiB0LmMgIT09IDApXG4gIH1cblxuICBpbml0TnVtIChuKSB7XG4gICAgdGhpcy50ZXJtcyA9IFtuZXcgTW9ub21pYWwobildXG4gIH1cblxuICB0b0xhdGV4ICgpIHtcbiAgICBsZXQgc3RyID0gJydcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGVybXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChpID4gMCAmJiB0aGlzLnRlcm1zW2ldLmMgPj0gMCkge1xuICAgICAgICBzdHIgKz0gJysnXG4gICAgICB9XG4gICAgICBzdHIgKz0gdGhpcy50ZXJtc1tpXS50b0xhdGV4KClcbiAgICB9XG4gICAgcmV0dXJuIHN0clxuICB9XG5cbiAgdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiB0aGlzLnRvTGFUZVgoKVxuICB9XG5cbiAgY2xvbmUgKCkge1xuICAgIGNvbnN0IHRlcm1zID0gdGhpcy50ZXJtcy5tYXAodCA9PiB0LmNsb25lKCkpXG4gICAgcmV0dXJuIG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuICB9XG5cbiAgc2ltcGxpZnkgKCkge1xuICAgIC8vIGNvbGxlY3RzIGxpa2UgdGVybXMgYW5kIHJlbW92ZXMgemVybyB0ZXJtc1xuICAgIC8vIGRvZXMgbm90IG1vZGlmeSBvcmlnaW5hbFxuICAgIC8vIFRoaXMgc2VlbXMgcHJvYmFibHkgaW5lZmZpY2llbnQsIGdpdmVuIHRoZSBkYXRhIHN0cnVjdHVyZVxuICAgIC8vIFdvdWxkIGJlIGJldHRlciB0byB1c2Ugc29tZXRoaW5nIGxpa2UgYSBsaW5rZWQgbGlzdCBtYXliZT9cbiAgICBjb25zdCB0ZXJtcyA9IHRoaXMudGVybXMuc2xpY2UoKVxuICAgIGxldCBuZXd0ZXJtcyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0ZXJtcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCF0ZXJtc1tpXSkgY29udGludWVcbiAgICAgIGxldCBuZXd0ZXJtID0gdGVybXNbaV1cbiAgICAgIGZvciAobGV0IGogPSBpICsgMTsgaiA8IHRlcm1zLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmICghdGVybXNbal0pIGNvbnRpbnVlXG4gICAgICAgIGlmICh0ZXJtc1tqXS5saWtlKHRlcm1zW2ldKSkge1xuICAgICAgICAgIG5ld3Rlcm0gPSBuZXd0ZXJtLmFkZCh0ZXJtc1tqXSlcbiAgICAgICAgICB0ZXJtc1tqXSA9IG51bGxcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbmV3dGVybXMucHVzaChuZXd0ZXJtKVxuICAgICAgdGVybXNbaV0gPSBudWxsXG4gICAgfVxuICAgIG5ld3Rlcm1zID0gbmV3dGVybXMuZmlsdGVyKHQgPT4gdC5jICE9PSAwKVxuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbChuZXd0ZXJtcylcbiAgfVxuXG4gIGFkZCAodGhhdCwgc2ltcGxpZnkpIHtcbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgUG9seW5vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgUG9seW5vbWlhbCh0aGF0KVxuICAgIH1cbiAgICBpZiAoc2ltcGxpZnkgPT09IHVuZGVmaW5lZCkgc2ltcGxpZnkgPSB0cnVlXG4gICAgY29uc3QgdGVybXMgPSB0aGlzLnRlcm1zLmNvbmNhdCh0aGF0LnRlcm1zKVxuICAgIGxldCByZXN1bHQgPSBuZXcgUG9seW5vbWlhbCh0ZXJtcylcblxuICAgIGlmIChzaW1wbGlmeSkgcmVzdWx0ID0gcmVzdWx0LnNpbXBsaWZ5KClcblxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIG11bCAodGhhdCwgc2ltcGxpZnkpIHtcbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgUG9seW5vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgUG9seW5vbWlhbCh0aGF0KVxuICAgIH1cbiAgICBjb25zdCB0ZXJtcyA9IFtdXG4gICAgaWYgKHNpbXBsaWZ5ID09PSB1bmRlZmluZWQpIHNpbXBsaWZ5ID0gdHJ1ZVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50ZXJtcy5sZW5ndGg7IGkrKykge1xuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB0aGF0LnRlcm1zLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHRlcm1zLnB1c2godGhpcy50ZXJtc1tpXS5tdWwodGhhdC50ZXJtc1tqXSkpXG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IHJlc3VsdCA9IG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuICAgIGlmIChzaW1wbGlmeSkgcmVzdWx0ID0gcmVzdWx0LnNpbXBsaWZ5KClcblxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIHBvdyAobiwgc2ltcGxpZnkpIHtcbiAgICBsZXQgcmVzdWx0ID0gdGhpc1xuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbjsgaSsrKSB7XG4gICAgICByZXN1bHQgPSByZXN1bHQubXVsKHRoaXMpXG4gICAgfVxuICAgIGlmIChzaW1wbGlmeSkgcmVzdWx0ID0gcmVzdWx0LnNpbXBsaWZ5KClcbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICBzdGF0aWMgdmFyICh2KSB7XG4gICAgLy8gZmFjdG9yeSBmb3IgYSBzaW5nbGUgdmFyaWFibGUgcG9seW5vbWlhbFxuICAgIGNvbnN0IHRlcm1zID0gW01vbm9taWFsLnZhcih2KV1cbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwodGVybXMpXG4gIH1cblxuICBzdGF0aWMgeCAoKSB7XG4gICAgcmV0dXJuIFBvbHlub21pYWwudmFyKCd4JylcbiAgfVxuXG4gIHN0YXRpYyBjb25zdCAobikge1xuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbChuKVxuICB9XG59XG4iLCJpbXBvcnQgeyBHcmFwaGljUSwgR3JhcGhpY1FWaWV3IH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgRnJhY3Rpb24gZnJvbSAnZnJhY3Rpb24uanMnXG5pbXBvcnQgUG9seW5vbWlhbCBmcm9tICdQb2x5bm9taWFsJ1xuaW1wb3J0IHsgcmFuZEVsZW0sIHJhbmRCZXR3ZWVuLCByYW5kQmV0d2VlbkZpbHRlciwgZ2NkIH0gZnJvbSAndXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBcml0aG1hZ29uUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBjb25zdCBkYXRhID0gbmV3IEFyaXRobWFnb25RRGF0YShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgQXJpdGhtYWdvblFWaWV3KGRhdGEsIG9wdGlvbnMpXG4gICAgc3VwZXIoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgeyByZXR1cm4gJ0NvbXBsZXRlIHRoZSBhcml0aG1hZ29uOicgfVxufVxuXG5Bcml0aG1hZ29uUS5vcHRpb25zU3BlYyA9IFtcbiAge1xuICAgIHRpdGxlOiAnVmVydGljZXMnLFxuICAgIGlkOiAnbicsXG4gICAgdHlwZTogJ2ludCcsXG4gICAgbWluOiAzLFxuICAgIG1heDogMjAsXG4gICAgZGVmYXVsdDogM1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdUeXBlJyxcbiAgICBpZDogJ3R5cGUnLFxuICAgIHR5cGU6ICdzZWxlY3QtZXhjbHVzaXZlJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICB7IHRpdGxlOiAnSW50ZWdlciAoKyknLCBpZDogJ2ludGVnZXItYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0ludGVnZXIgKFxcdTAwZDcpJywgaWQ6ICdpbnRlZ2VyLW11bHRpcGx5JyB9LFxuICAgICAgeyB0aXRsZTogJ0ZyYWN0aW9uICgrKScsIGlkOiAnZnJhY3Rpb24tYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0ZyYWN0aW9uIChcXHUwMGQ3KScsIGlkOiAnZnJhY3Rpb24tbXVsdGlwbHknIH0sXG4gICAgICB7IHRpdGxlOiAnQWxnZWJyYSAoKyknLCBpZDogJ2FsZ2VicmEtYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0FsZ2VicmEgKFxcdTAwZDcpJywgaWQ6ICdhbGdlYnJhLW11bHRpcGx5JyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiAnaW50ZWdlci1hZGQnLFxuICAgIHZlcnRpY2FsOiB0cnVlXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1B1enpsZSB0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgaWQ6ICdwdXpfZGlmZicsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ01pc3NpbmcgZWRnZXMnLCBpZDogJzEnIH0sXG4gICAgICB7IHRpdGxlOiAnTWl4ZWQnLCBpZDogJzInIH0sXG4gICAgICB7IHRpdGxlOiAnTWlzc2luZyB2ZXJ0aWNlcycsIGlkOiAnMycgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogJzEnXG4gIH1cbl1cblxuY2xhc3MgQXJpdGhtYWdvblFEYXRhIC8qIGV4dGVuZHMgR3JhcGhpY1FEYXRhICovIHtcbiAgLy8gVE9ETyBzaW1wbGlmeSBjb25zdHJ1Y3Rvci4gTW92ZSBsb2dpYyBpbnRvIHN0YXRpYyBmYWN0b3J5IG1ldGhvZHNcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICAvLyAxLiBTZXQgcHJvcGVydGllcyBmcm9tIG9wdGlvbnNcbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIG46IDMsIC8vIG51bWJlciBvZiB2ZXJ0aWNlc1xuICAgICAgbWluOiAtMjAsXG4gICAgICBtYXg6IDIwLFxuICAgICAgbnVtX2RpZmY6IDEsIC8vIGNvbXBsZXhpdHkgb2Ygd2hhdCdzIGluIHZlcnRpY2VzL2VkZ2VzXG4gICAgICBwdXpfZGlmZjogMSwgLy8gMSAtIFZlcnRpY2VzIGdpdmVuLCAyIC0gdmVydGljZXMvZWRnZXM7IGdpdmVuIDMgLSBvbmx5IGVkZ2VzXG4gICAgICB0eXBlOiAnaW50ZWdlci1hZGQnIC8vIFt0eXBlXS1bb3BlcmF0aW9uXSB3aGVyZSBbdHlwZV0gPSBpbnRlZ2VyLCAuLi5cbiAgICAgIC8vIGFuZCBbb3BlcmF0aW9uXSA9IGFkZC9tdWx0aXBseVxuICAgIH1cblxuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgdGhpcy5zZXR0aW5ncywgb3B0aW9ucylcbiAgICB0aGlzLnNldHRpbmdzLm51bV9kaWZmID0gdGhpcy5zZXR0aW5ncy5kaWZmaWN1bHR5XG4gICAgdGhpcy5zZXR0aW5ncy5wdXpfZGlmZiA9IHBhcnNlSW50KHRoaXMuc2V0dGluZ3MucHV6X2RpZmYpIC8vISA/IFRoaXMgc2hvdWxkIGhhdmUgYmVlbiBkb25lIHVwc3RyZWFtLi4uXG5cbiAgICB0aGlzLm4gPSB0aGlzLnNldHRpbmdzLm5cbiAgICB0aGlzLnZlcnRpY2VzID0gW11cbiAgICB0aGlzLnNpZGVzID0gW11cblxuICAgIGlmICh0aGlzLnNldHRpbmdzLnR5cGUuZW5kc1dpdGgoJ2FkZCcpKSB7XG4gICAgICB0aGlzLm9wbmFtZSA9ICcrJ1xuICAgICAgdGhpcy5vcCA9ICh4LCB5KSA9PiB4LmFkZCh5KVxuICAgIH0gZWxzZSBpZiAodGhpcy5zZXR0aW5ncy50eXBlLmVuZHNXaXRoKCdtdWx0aXBseScpKSB7XG4gICAgICB0aGlzLm9wbmFtZSA9ICdcXHUwMGQ3J1xuICAgICAgdGhpcy5vcCA9ICh4LCB5KSA9PiB4Lm11bCh5KVxuICAgIH1cblxuICAgIC8vIDIuIEluaXRpYWxpc2UgYmFzZWQgb24gdHlwZVxuICAgIHN3aXRjaCAodGhpcy5zZXR0aW5ncy50eXBlKSB7XG4gICAgICBjYXNlICdpbnRlZ2VyLWFkZCc6XG4gICAgICBjYXNlICdpbnRlZ2VyLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0SW50ZWdlcih0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnZnJhY3Rpb24tYWRkJzpcbiAgICAgICAgdGhpcy5pbml0RnJhY3Rpb25BZGQodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2ZyYWN0aW9uLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0RnJhY3Rpb25NdWx0aXBseSh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnYWxnZWJyYS1hZGQnOlxuICAgICAgICB0aGlzLmluaXRBbGdlYnJhQWRkKHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdhbGdlYnJhLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0QWxnZWJyYU11bHRpcGx5KHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgc3dpdGNoIGRlZmF1bHQnKVxuICAgIH1cblxuICAgIHRoaXMuY2FsY3VsYXRlRWRnZXMoKSAvLyBVc2Ugb3AgZnVuY3Rpb25zIHRvIGZpbGwgaW4gdGhlIGVkZ2VzXG4gICAgdGhpcy5oaWRlTGFiZWxzKHRoaXMuc2V0dGluZ3MucHV6X2RpZmYpIC8vIHNldCBzb21lIHZlcnRpY2VzL2VkZ2VzIGFzIGhpZGRlbiBkZXBlbmRpbmcgb24gZGlmZmljdWx0eVxuICB9XG5cbiAgLyogTWV0aG9kcyBpbml0aWFsaXNpbmcgdmVydGljZXMgKi9cblxuICBpbml0SW50ZWdlciAoc2V0dGluZ3MpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihyYW5kQmV0d2VlbkZpbHRlcihcbiAgICAgICAgICBzZXR0aW5ncy5taW4sXG4gICAgICAgICAgc2V0dGluZ3MubWF4LFxuICAgICAgICAgIHggPT4gKHNldHRpbmdzLnR5cGUuZW5kc1dpdGgoJ2FkZCcpIHx8IHggIT09IDApXG4gICAgICAgICkpLFxuICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEZyYWN0aW9uQWRkIChzZXR0aW5ncykge1xuICAgIC8qIERpZmZpY3VsdHkgc2V0dGluZ3M6XG4gICAgICogMTogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIHNhbWUgZGVub21pbmF0b3IsIG5vIGNhbmNlbGxpbmcgYWZ0ZXIgRE9ORVxuICAgICAqIDI6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBzYW1lIGRlbm9taW5hdG9yLCBubyBjYW5jZWxsbGluZyBhbnN3ZXIgaW1wcm9wZXIgZnJhY3Rpb25cbiAgICAgKiAzOiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggb25lIGRlbm9taW5hdG9yIGEgbXVsdGlwbGUgb2YgYW5vdGhlciwgZ2l2ZXMgcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNDogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIG9uZSBkZW5vbWluYXRvciBhIG11bHRpcGxlIG9mIGFub3RoZXIsIGdpdmVzIGltcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNTogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIGRpZmZlcmVudCBkZW5vbWluYXRvcnMgKG5vdCBjby1wcmltZSksIGdpdmVzIGltcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNjogbWl4ZWQgbnVtYmVyc1xuICAgICAqIDc6IG1peGVkIG51bWJlcnMsIGJpZ2dlciBudW1lcmF0b3JzIGFuZCBkZW5vbWluYXRvcnNcbiAgICAgKiA4OiBtaXhlZCBudW1iZXJzLCBiaWcgaW50ZWdlciBwYXJ0c1xuICAgICAqL1xuXG4gICAgLy8gVE9ETyAtIGFueXRoaW5nIG90aGVyIHRoYW4gZGlmZmljdWx0eSAxLlxuICAgIGNvbnN0IGRpZmYgPSBzZXR0aW5ncy5udW1fZGlmZlxuICAgIGlmIChkaWZmIDwgMykge1xuICAgICAgY29uc3QgZGVuID0gcmFuZEVsZW0oWzUsIDcsIDksIDExLCAxMywgMTddKVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICBjb25zdCBwcmV2bnVtID0gdGhpcy52ZXJ0aWNlc1tpIC0gMV1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbaSAtIDFdLnZhbC5uIDogdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IG5leHRudW0gPSB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dLnZhbC5uIDogdW5kZWZpbmVkXG5cbiAgICAgICAgY29uc3QgbWF4bnVtID1cbiAgICAgICAgICBkaWZmID09PSAyID8gZGVuIC0gMVxuICAgICAgICAgICAgOiBuZXh0bnVtID8gZGVuIC0gTWF0aC5tYXgobmV4dG51bSwgcHJldm51bSlcbiAgICAgICAgICAgICAgOiBwcmV2bnVtID8gZGVuIC0gcHJldm51bVxuICAgICAgICAgICAgICAgIDogZGVuIC0gMVxuXG4gICAgICAgIGNvbnN0IG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKDEsIG1heG51bSwgeCA9PiAoXG4gICAgICAgICAgLy8gRW5zdXJlcyBubyBzaW1wbGlmaW5nIGFmdGVyd2FyZHMgaWYgZGlmZmljdWx0eSBpcyAxXG4gICAgICAgICAgZ2NkKHgsIGRlbikgPT09IDEgJiZcbiAgICAgICAgICAoIXByZXZudW0gfHwgZ2NkKHggKyBwcmV2bnVtLCBkZW4pID09PSAxIHx8IHggKyBwcmV2bnVtID09PSBkZW4pICYmXG4gICAgICAgICAgKCFuZXh0bnVtIHx8IGdjZCh4ICsgbmV4dG51bSwgZGVuKSA9PT0gMSB8fCB4ICsgbmV4dG51bSA9PT0gZGVuKVxuICAgICAgICApKVxuXG4gICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24obnVtLCBkZW4pLFxuICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBkZW5iYXNlID0gcmFuZEVsZW0oXG4gICAgICAgIGRpZmYgPCA3ID8gWzIsIDMsIDVdIDogWzIsIDMsIDQsIDUsIDYsIDcsIDgsIDksIDEwLCAxMV1cbiAgICAgIClcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgY29uc3QgcHJldiA9IHRoaXMudmVydGljZXNbaSAtIDFdXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzW2kgLSAxXS52YWwgOiB1bmRlZmluZWRcbiAgICAgICAgY29uc3QgbmV4dCA9IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl0udmFsIDogdW5kZWZpbmVkXG5cbiAgICAgICAgY29uc3QgbWF4bXVsdGlwbGllciA9IGRpZmYgPCA3ID8gNCA6IDhcblxuICAgICAgICBjb25zdCBtdWx0aXBsaWVyID1cbiAgICAgICAgICBpICUgMiA9PT0gMSB8fCBkaWZmID4gNCA/IHJhbmRCZXR3ZWVuRmlsdGVyKDIsIG1heG11bHRpcGxpZXIsIHggPT5cbiAgICAgICAgICAgICghcHJldiB8fCB4ICE9PSBwcmV2LmQgLyBkZW5iYXNlKSAmJlxuICAgICAgICAgICAgKCFuZXh0IHx8IHggIT09IG5leHQuZCAvIGRlbmJhc2UpXG4gICAgICAgICAgKSA6IDFcblxuICAgICAgICBjb25zdCBkZW4gPSBkZW5iYXNlICogbXVsdGlwbGllclxuXG4gICAgICAgIGxldCBudW1cbiAgICAgICAgaWYgKGRpZmYgPCA2KSB7XG4gICAgICAgICAgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoMSwgZGVuIC0gMSwgeCA9PiAoXG4gICAgICAgICAgICBnY2QoeCwgZGVuKSA9PT0gMSAmJlxuICAgICAgICAgICAgKGRpZmYgPj0gNCB8fCAhcHJldiB8fCBwcmV2LmFkZCh4LCBkZW4pIDw9IDEpICYmXG4gICAgICAgICAgICAoZGlmZiA+PSA0IHx8ICFuZXh0IHx8IG5leHQuYWRkKHgsIGRlbikgPD0gMSlcbiAgICAgICAgICApKVxuICAgICAgICB9IGVsc2UgaWYgKGRpZmYgPCA4KSB7XG4gICAgICAgICAgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoZGVuICsgMSwgZGVuICogNiwgeCA9PiBnY2QoeCwgZGVuKSA9PT0gMSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBudW0gPSByYW5kQmV0d2VlbkZpbHRlcihkZW4gKiAxMCwgZGVuICogMTAwLCB4ID0+IGdjZCh4LCBkZW4pID09PSAxKVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihudW0sIGRlbiksXG4gICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEZyYWN0aW9uTXVsdGlwbHkgKHNldHRpbmdzKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgY29uc3QgZCA9IHJhbmRCZXR3ZWVuKDIsIDEwKVxuICAgICAgY29uc3QgbiA9IHJhbmRCZXR3ZWVuKDEsIGQgLSAxKVxuICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24obiwgZCksXG4gICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0QWxnZWJyYUFkZCAoc2V0dGluZ3MpIHtcbiAgICBjb25zdCBkaWZmID0gc2V0dGluZ3MubnVtX2RpZmZcbiAgICBzd2l0Y2ggKGRpZmYpIHtcbiAgICAgIGNhc2UgMToge1xuICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2YXJpYWJsZSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDI6XG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGlmIChNYXRoLnJhbmRvbSgpIDwgMC41KSB7IC8vIHZhcmlhYmxlICsgY29uc3RhbnRcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgY29uc3RhbnQgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbChjb2VmZiArIHZhcmlhYmxlICsgJysnICsgY29uc3RhbnQpLFxuICAgICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IHZhcmlhYmxlMSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgICAgbGV0IHZhcmlhYmxlMiA9IHZhcmlhYmxlMVxuICAgICAgICAgIHdoaWxlICh2YXJpYWJsZTIgPT09IHZhcmlhYmxlMSkge1xuICAgICAgICAgICAgdmFyaWFibGUyID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBjb2VmZjEgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgY29lZmYyID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYxICsgdmFyaWFibGUxICsgJysnICsgY29lZmYyICsgdmFyaWFibGUyKSxcbiAgICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRBbGdlYnJhTXVsdGlwbHkgKHNldHRpbmdzKSB7XG4gICAgLyogRGlmZmljdWx0eTpcbiAgICAgKiAxOiBBbHRlcm5hdGUgM2Egd2l0aCA0XG4gICAgICogMjogQWxsIHRlcm1zIG9mIHRoZSBmb3JtIG52IC0gdXAgdG8gdHdvIHZhcmlhYmxlc1xuICAgICAqIDM6IEFsbCB0ZXJtcyBvZiB0aGUgZm9ybSBudl5tLiBPbmUgdmFyaWFibGUgb25seVxuICAgICAqIDQ6IEFMbCB0ZXJtcyBvZiB0aGUgZm9ybSBueF5rIHlebCB6XnAuIGssbCxwIDAtM1xuICAgICAqIDU6IEV4cGFuZCBicmFja2V0cyAzKDJ4KzUpXG4gICAgICogNjogRXhwYW5kIGJyYWNrZXRzIDN4KDJ4KzUpXG4gICAgICogNzogRXhwYW5kIGJyYWNrZXRzIDN4XjJ5KDJ4eSs1eV4yKVxuICAgICAqIDg6IEV4cGFuZCBicmFja2V0cyAoeCszKSh4KzIpXG4gICAgICogOTogRXhwYW5kIGJyYWNrZXRzICgyeC0zKSgzeCs0KVxuICAgICAqIDEwOiBFeHBhbmQgYnJhY2tldHMgKDJ4XjItM3grNCkoMngtNSlcbiAgICAgKi9cbiAgICBjb25zdCBkaWZmID0gc2V0dGluZ3MubnVtX2RpZmZcbiAgICBzd2l0Y2ggKGRpZmYpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgIHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IHRlcm0gPSBpICUgMiA9PT0gMCA/IGNvZWZmIDogY29lZmYgKyB2YXJpYWJsZVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDI6IHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUxID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgY29uc3QgdmFyaWFibGUyID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZSA9IHJhbmRFbGVtKFt2YXJpYWJsZTEsIHZhcmlhYmxlMl0pXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2YXJpYWJsZSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgMzoge1xuICAgICAgICBjb25zdCB2ID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBpZHggPSByYW5kQmV0d2VlbigxLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2ICsgJ14nICsgaWR4KSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSA0OiB7XG4gICAgICAgIGNvbnN0IHN0YXJ0QXNjaWkgPSByYW5kQmV0d2Vlbig5NywgMTIwKVxuICAgICAgICBjb25zdCB2MSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSlcbiAgICAgICAgY29uc3QgdjIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkgKyAxKVxuICAgICAgICBjb25zdCB2MyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSArIDIpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBhID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMSA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMiA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMyA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCB0ZXJtID0gYSArIHYxICsgbjEgKyB2MiArIG4yICsgdjMgKyBuM1xuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDU6XG4gICAgICBjYXNlIDY6IHsgLy8gZS5nLiAzKHgpICogKDJ4LTUpXG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBjb25zdGFudCA9IHJhbmRCZXR3ZWVuKC05LCA5KS50b1N0cmluZygpXG4gICAgICAgICAgbGV0IHRlcm0gPSBjb2VmZlxuICAgICAgICAgIGlmIChkaWZmID09PSA2IHx8IGkgJSAyID09PSAxKSB0ZXJtICs9IHZhcmlhYmxlXG4gICAgICAgICAgaWYgKGkgJSAyID09PSAxKSB0ZXJtICs9ICcrJyArIGNvbnN0YW50XG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgNzogeyAvLyBlLmcuIDN4XjJ5KDR4eV4yKzV4eSlcbiAgICAgICAgY29uc3Qgc3RhcnRBc2NpaSA9IHJhbmRCZXR3ZWVuKDk3LCAxMjApXG4gICAgICAgIGNvbnN0IHYxID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpKVxuICAgICAgICBjb25zdCB2MiA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSArIDEpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBhMSA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjExID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4xMiA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBsZXQgdGVybSA9IGExICsgdjEgKyBuMTEgKyB2MiArIG4xMlxuICAgICAgICAgIGlmIChpICUgMiA9PT0gMSkge1xuICAgICAgICAgICAgY29uc3QgYTIgPSByYW5kQmV0d2VlbigtOSwgOSkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgbjIxID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgbjIyID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgICAgdGVybSArPSAnKycgKyBhMiArIHYxICsgbjIxICsgdjIgKyBuMjJcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgODogLy8geyBlLmcuICh4KzUpICogKHgtMilcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29uc3RhbnQgPSByYW5kQmV0d2VlbigtOSwgOSkudG9TdHJpbmcoKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHZhcmlhYmxlICsgJysnICsgY29uc3RhbnQpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qIE1ldGhvZCB0byBjYWxjdWxhdGUgZWRnZXMgZnJvbSB2ZXJ0aWNlcyAqL1xuICBjYWxjdWxhdGVFZGdlcyAoKSB7XG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBlZGdlcyBnaXZlbiB0aGUgdmVydGljZXMgdXNpbmcgdGhpcy5vcFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIHRoaXMuc2lkZXNbaV0gPSB7XG4gICAgICAgIHZhbDogdGhpcy5vcCh0aGlzLnZlcnRpY2VzW2ldLnZhbCwgdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXS52YWwpLFxuICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyogTWFyayBoaWRkZW5kIGVkZ2VzL3ZlcnRpY2VzICovXG5cbiAgaGlkZUxhYmVscyAocHV6emxlRGlmZmljdWx0eSkge1xuICAgIC8vIEhpZGUgc29tZSBsYWJlbHMgdG8gbWFrZSBhIHB1enpsZVxuICAgIC8vIDEgLSBTaWRlcyBoaWRkZW4sIHZlcnRpY2VzIHNob3duXG4gICAgLy8gMiAtIFNvbWUgc2lkZXMgaGlkZGVuLCBzb21lIHZlcnRpY2VzIGhpZGRlblxuICAgIC8vIDMgLSBBbGwgdmVydGljZXMgaGlkZGVuXG4gICAgc3dpdGNoIChwdXp6bGVEaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHRoaXMuc2lkZXMuZm9yRWFjaCh4ID0+IHsgeC5oaWRkZW4gPSB0cnVlIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDI6IHtcbiAgICAgICAgdGhpcy5zaWRlcy5mb3JFYWNoKHggPT4geyB4LmhpZGRlbiA9IHRydWUgfSlcbiAgICAgICAgY29uc3Qgc2hvd3NpZGUgPSByYW5kQmV0d2VlbigwLCB0aGlzLm4gLSAxLCBNYXRoLnJhbmRvbSlcbiAgICAgICAgY29uc3QgaGlkZXZlcnQgPSBNYXRoLnJhbmRvbSgpIDwgMC41XG4gICAgICAgICAgPyBzaG93c2lkZSAvLyBwcmV2aW91cyB2ZXJ0ZXhcbiAgICAgICAgICA6IChzaG93c2lkZSArIDEpICUgdGhpcy5uIC8vIG5leHQgdmVydGV4O1xuXG4gICAgICAgIHRoaXMuc2lkZXNbc2hvd3NpZGVdLmhpZGRlbiA9IGZhbHNlXG4gICAgICAgIHRoaXMudmVydGljZXNbaGlkZXZlcnRdLmhpZGRlbiA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgMzpcbiAgICAgICAgdGhpcy52ZXJ0aWNlcy5mb3JFYWNoKHggPT4geyB4LmhpZGRlbiA9IHRydWUgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm9fZGlmZmljdWx0eScpXG4gICAgfVxuICB9XG59XG5cbmNsYXNzIEFyaXRobWFnb25RVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIGNvbnN0cnVjdG9yIChkYXRhLCBvcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc2V0cyB0aGlzLndpZHRoIHRoaXMuaGVpZ2h0LCBpbml0aWFsaXNlcyB0aGlzLmxhYmVscywgY3JlYXRlcyBkb20gZWxlbWVudHNcblxuICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aFxuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuaGVpZ2h0XG4gICAgY29uc3QgciA9IDAuMzUgKiBNYXRoLm1pbih3aWR0aCwgaGVpZ2h0KSAvLyByYWRpdXNcbiAgICBjb25zdCBuID0gdGhpcy5kYXRhLm5cblxuICAgIC8vIEEgcG9pbnQgdG8gbGFiZWwgd2l0aCB0aGUgb3BlcmF0aW9uXG4gICAgLy8gQWxsIHBvaW50cyBmaXJzdCBzZXQgdXAgd2l0aCAoMCwwKSBhdCBjZW50ZXJcbiAgICB0aGlzLm9wZXJhdGlvblBvaW50ID0gbmV3IFBvaW50KDAsIDApXG5cbiAgICAvLyBQb3NpdGlvbiBvZiB2ZXJ0aWNlc1xuICAgIHRoaXMudmVydGV4UG9pbnRzID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgY29uc3QgYW5nbGUgPSBpICogTWF0aC5QSSAqIDIgLyBuIC0gTWF0aC5QSSAvIDJcbiAgICAgIHRoaXMudmVydGV4UG9pbnRzW2ldID0gUG9pbnQuZnJvbVBvbGFyKHIsIGFuZ2xlKVxuICAgIH1cblxuICAgIC8vIFBvaXNpdGlvbiBvZiBzaWRlIGxhYmVsc1xuICAgIHRoaXMuc2lkZVBvaW50cyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIHRoaXMuc2lkZVBvaW50c1tpXSA9IFBvaW50Lm1lYW4odGhpcy52ZXJ0ZXhQb2ludHNbaV0sIHRoaXMudmVydGV4UG9pbnRzWyhpICsgMSkgJSBuXSlcbiAgICB9XG5cbiAgICB0aGlzLmFsbFBvaW50cyA9IFt0aGlzLm9wZXJhdGlvblBvaW50XS5jb25jYXQodGhpcy52ZXJ0ZXhQb2ludHMpLmNvbmNhdCh0aGlzLnNpZGVQb2ludHMpXG5cbiAgICB0aGlzLnJlQ2VudGVyKCkgLy8gUmVwb3NpdGlvbiBldmVyeXRoaW5nIHByb3Blcmx5XG5cbiAgICB0aGlzLm1ha2VMYWJlbHModHJ1ZSlcblxuICAgIC8vIERyYXcgaW50byBjYW52YXNcbiAgfVxuXG4gIHJlQ2VudGVyICgpIHtcbiAgICAvLyBGaW5kIHRoZSBjZW50ZXIgb2YgdGhlIGJvdW5kaW5nIGJveFxuICAgIGNvbnN0IHRvcGxlZnQgPSBQb2ludC5taW4odGhpcy5hbGxQb2ludHMpXG4gICAgY29uc3QgYm90dG9tcmlnaHQgPSBQb2ludC5tYXgodGhpcy5hbGxQb2ludHMpXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbih0b3BsZWZ0LCBib3R0b21yaWdodClcblxuICAgIC8vIHRyYW5zbGF0ZSB0byBwdXQgaW4gdGhlIGNlbnRlclxuICAgIHRoaXMuYWxsUG9pbnRzLmZvckVhY2gocCA9PiB7XG4gICAgICBwLnRyYW5zbGF0ZSh0aGlzLndpZHRoIC8gMiAtIGNlbnRlci54LCB0aGlzLmhlaWdodCAvIDIgLSBjZW50ZXIueSlcbiAgICB9KVxuICB9XG5cbiAgbWFrZUxhYmVscyAoKSB7XG4gICAgLy8gdmVydGljZXNcbiAgICB0aGlzLmRhdGEudmVydGljZXMuZm9yRWFjaCgodiwgaSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSB2LnZhbC50b0xhdGV4XG4gICAgICAgID8gdi52YWwudG9MYXRleCh0cnVlKVxuICAgICAgICA6IHYudmFsLnRvU3RyaW5nKClcbiAgICAgIHRoaXMubGFiZWxzLnB1c2goe1xuICAgICAgICBwb3M6IHRoaXMudmVydGV4UG9pbnRzW2ldLFxuICAgICAgICB0ZXh0cTogdi5oaWRkZW4gPyAnJyA6IHZhbHVlLFxuICAgICAgICB0ZXh0YTogdmFsdWUsXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCB2ZXJ0ZXgnLFxuICAgICAgICBzdHlsZWE6IHYuaGlkZGVuID8gJ2Fuc3dlciB2ZXJ0ZXgnIDogJ25vcm1hbCB2ZXJ0ZXgnXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBzaWRlc1xuICAgIHRoaXMuZGF0YS5zaWRlcy5mb3JFYWNoKCh2LCBpKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHYudmFsLnRvTGF0ZXhcbiAgICAgICAgPyB2LnZhbC50b0xhdGV4KHRydWUpXG4gICAgICAgIDogdi52YWwudG9TdHJpbmcoKVxuICAgICAgdGhpcy5sYWJlbHMucHVzaCh7XG4gICAgICAgIHBvczogdGhpcy5zaWRlUG9pbnRzW2ldLFxuICAgICAgICB0ZXh0cTogdi5oaWRkZW4gPyAnJyA6IHZhbHVlLFxuICAgICAgICB0ZXh0YTogdmFsdWUsXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCBzaWRlJyxcbiAgICAgICAgc3R5bGVhOiB2LmhpZGRlbiA/ICdhbnN3ZXIgc2lkZScgOiAnbm9ybWFsIHNpZGUnXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBvcGVyYXRpb25cbiAgICB0aGlzLmxhYmVscy5wdXNoKHtcbiAgICAgIHBvczogdGhpcy5vcGVyYXRpb25Qb2ludCxcbiAgICAgIHRleHRxOiB0aGlzLmRhdGEub3BuYW1lLFxuICAgICAgdGV4dGE6IHRoaXMuZGF0YS5vcG5hbWUsXG4gICAgICBzdHlsZXE6ICdub3JtYWwnLFxuICAgICAgc3R5bGVhOiAnbm9ybWFsJ1xuICAgIH0pXG5cbiAgICAvLyBzdHlsaW5nXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gIH1cblxuICByZW5kZXIgKCkge1xuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICBjb25zdCBuID0gdGhpcy5kYXRhLm5cblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBjb25zdCBwID0gdGhpcy52ZXJ0ZXhQb2ludHNbaV1cbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnZlcnRleFBvaW50c1soaSArIDEpICUgbl1cbiAgICAgIGN0eC5tb3ZlVG8ocC54LCBwLnkpXG4gICAgICBjdHgubGluZVRvKG5leHQueCwgbmV4dC55KVxuICAgIH1cbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIC8vIHBsYWNlIGxhYmVsc1xuICAgIHRoaXMucmVuZGVyTGFiZWxzKHRydWUpXG4gIH1cblxuICBzaG93QW5zd2VyICgpIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0YVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVhXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyh0cnVlKVxuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyh0cnVlKVxuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICB9XG59XG4iLCJpbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5pbXBvcnQgeyByYW5kRWxlbSB9IGZyb20gJ3V0aWxpdGllcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGVzdFEgZXh0ZW5kcyBUZXh0USB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYScsXG4gICAgICB0ZXN0MTogWydmb28nXSxcbiAgICAgIHRlc3QyOiB0cnVlXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICB0aGlzLmxhYmVsID0gc2V0dGluZ3MubGFiZWxcblxuICAgIC8vIHBpY2sgYSByYW5kb20gb25lIG9mIHRoZSBzZWxlY3RlZFxuICAgIGxldCB0ZXN0MVxuICAgIGlmIChzZXR0aW5ncy50ZXN0MS5sZW5ndGggPT09IDApIHtcbiAgICAgIHRlc3QxID0gJ25vbmUnXG4gICAgfSBlbHNlIHtcbiAgICAgIHRlc3QxID0gcmFuZEVsZW0oc2V0dGluZ3MudGVzdDEpXG4gICAgfVxuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gJ2Q6ICcgKyBzZXR0aW5ncy5kaWZmaWN1bHR5ICsgJ1xcXFxcXFxcIHRlc3QxOiAnICsgdGVzdDFcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJ3Rlc3QyOiAnICsgc2V0dGluZ3MudGVzdDJcblxuICAgIHRoaXMucmVuZGVyKClcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgeyByZXR1cm4gJ1Rlc3QgY29tbWFuZCB3b3JkJyB9XG59XG5cblRlc3RRLm9wdGlvbnNTcGVjID0gW1xuICB7XG4gICAgdGl0bGU6ICdUZXN0IG9wdGlvbiAxJyxcbiAgICBpZDogJ3Rlc3QxJyxcbiAgICB0eXBlOiAnc2VsZWN0LWluY2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogWydmb28nLCAnYmFyJywgJ3dpenonXSxcbiAgICBkZWZhdWx0OiBbXVxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdUZXN0IG9wdGlvbiAyJyxcbiAgICBpZDogJ3Rlc3QyJyxcbiAgICB0eXBlOiAnYm9vbCcsXG4gICAgZGVmYXVsdDogdHJ1ZVxuICB9XG5dXG4iLCJpbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5pbXBvcnQgeyByYW5kQmV0d2VlbiB9IGZyb20gJ3V0aWxpdGllcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQWRkQVplcm8gZXh0ZW5kcyBUZXh0USB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYSdcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIHRoaXMubGFiZWwgPSBzZXR0aW5ncy5sYWJlbFxuXG4gICAgLy8gcmFuZG9tIDIgZGlnaXQgJ2RlY2ltYWwnXG4gICAgY29uc3QgcSA9IFN0cmluZyhyYW5kQmV0d2VlbigxLCA5KSkgKyBTdHJpbmcocmFuZEJldHdlZW4oMCwgOSkpICsgJy4nICsgU3RyaW5nKHJhbmRCZXR3ZWVuKDAsIDkpKVxuICAgIGNvbnN0IGEgPSBxICsgJzAnXG5cbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSBxICsgJ1xcXFx0aW1lcyAxMCdcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJz0gJyArIGFcblxuICAgIHRoaXMucmVuZGVyKClcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRXZhbHVhdGUnXG4gIH1cbn1cblxuQWRkQVplcm8ub3B0aW9uc1NwZWMgPSBbXG5dXG4iLCJpbXBvcnQgeyByYW5kQmV0d2VlbiB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCBGcmFjdGlvbiBmcm9tICdmcmFjdGlvbi5qcydcblxuLyogTWFpbiBxdWVzdGlvbiBjbGFzcy4gVGhpcyB3aWxsIGJlIHNwdW4gb2ZmIGludG8gZGlmZmVyZW50IGZpbGUgYW5kIGdlbmVyYWxpc2VkICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFcXVhdGlvbk9mTGluZSBleHRlbmRzIFRleHRRIHtcbiAgLy8gJ2V4dGVuZHMnIFF1ZXN0aW9uLCBidXQgbm90aGluZyB0byBhY3R1YWxseSBleHRlbmRcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICAvLyBib2lsZXJwbGF0ZVxuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDJcbiAgICB9XG5cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuICAgIGNvbnN0IGRpZmZpY3VsdHkgPSBNYXRoLmNlaWwoc2V0dGluZ3MuZGlmZmljdWx0eSAvIDIpIC8vIGluaXRpYWxseSB3cml0dGVuIGZvciBkaWZmaWN1bHR5IDEtNCwgbm93IG5lZWQgMS0xMFxuXG4gICAgLy8gcXVlc3Rpb24gZ2VuZXJhdGlvbiBiZWdpbnMgaGVyZVxuICAgIGxldCBtLCBjLCB4MSwgeTEsIHgyLCB5MlxuICAgIGxldCBtaW5tLCBtYXhtLCBtaW5jLCBtYXhjXG5cbiAgICBzd2l0Y2ggKGRpZmZpY3VsdHkpIHtcbiAgICAgIGNhc2UgMTogLy8gbT4wLCBjPj0wXG4gICAgICBjYXNlIDI6XG4gICAgICBjYXNlIDM6XG4gICAgICAgIG1pbm0gPSBkaWZmaWN1bHR5IDwgMyA/IDEgOiAtNVxuICAgICAgICBtYXhtID0gNVxuICAgICAgICBtaW5jID0gZGlmZmljdWx0eSA8IDIgPyAwIDogLTEwXG4gICAgICAgIG1heGMgPSAxMFxuICAgICAgICBtID0gcmFuZEJldHdlZW4obWlubSwgbWF4bSlcbiAgICAgICAgYyA9IHJhbmRCZXR3ZWVuKG1pbmMsIG1heGMpXG4gICAgICAgIHgxID0gZGlmZmljdWx0eSA8IDMgPyByYW5kQmV0d2VlbigwLCAxMCkgOiByYW5kQmV0d2VlbigtMTUsIDE1KVxuICAgICAgICB5MSA9IG0gKiB4MSArIGNcblxuICAgICAgICBpZiAoZGlmZmljdWx0eSA8IDMpIHtcbiAgICAgICAgICB4MiA9IHJhbmRCZXR3ZWVuKHgxICsgMSwgMTUpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgeDIgPSB4MVxuICAgICAgICAgIHdoaWxlICh4MiA9PT0geDEpIHsgeDIgPSByYW5kQmV0d2VlbigtMTUsIDE1KSB9O1xuICAgICAgICB9XG4gICAgICAgIHkyID0gbSAqIHgyICsgY1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA0OiAvLyBtIGZyYWN0aW9uLCBwb2ludHMgYXJlIGludGVnZXJzXG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGNvbnN0IG1kID0gcmFuZEJldHdlZW4oMSwgNSlcbiAgICAgICAgY29uc3QgbW4gPSByYW5kQmV0d2VlbigtNSwgNSlcbiAgICAgICAgbSA9IG5ldyBGcmFjdGlvbihtbiwgbWQpXG4gICAgICAgIHgxID0gbmV3IEZyYWN0aW9uKHJhbmRCZXR3ZWVuKC0xMCwgMTApKVxuICAgICAgICB5MSA9IG5ldyBGcmFjdGlvbihyYW5kQmV0d2VlbigtMTAsIDEwKSlcbiAgICAgICAgYyA9IG5ldyBGcmFjdGlvbih5MSkuc3ViKG0ubXVsKHgxKSlcbiAgICAgICAgeDIgPSB4MS5hZGQocmFuZEJldHdlZW4oMSwgNSkgKiBtLmQpXG4gICAgICAgIHkyID0gbS5tdWwoeDIpLmFkZChjKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHhzdHIgPVxuICAgICAgKG0gPT09IDAgfHwgKG0uZXF1YWxzICYmIG0uZXF1YWxzKDApKSkgPyAnJ1xuICAgICAgICA6IChtID09PSAxIHx8IChtLmVxdWFscyAmJiBtLmVxdWFscygxKSkpID8gJ3gnXG4gICAgICAgICAgOiAobSA9PT0gLTEgfHwgKG0uZXF1YWxzICYmIG0uZXF1YWxzKC0xKSkpID8gJy14J1xuICAgICAgICAgICAgOiAobS50b0xhdGV4KSA/IG0udG9MYXRleCgpICsgJ3gnXG4gICAgICAgICAgICAgIDogKG0gKyAneCcpXG5cbiAgICBjb25zdCBjb25zdHN0ciA9IC8vIFRPRE86IFdoZW4gbT1jPTBcbiAgICAgIChjID09PSAwIHx8IChjLmVxdWFscyAmJiBjLmVxdWFscygwKSkpID8gJydcbiAgICAgICAgOiAoYyA8IDApID8gKCcgLSAnICsgKGMubmVnID8gYy5uZWcoKS50b0xhdGV4KCkgOiAtYykpXG4gICAgICAgICAgOiAoYy50b0xhdGV4KSA/ICgnICsgJyArIGMudG9MYXRleCgpKVxuICAgICAgICAgICAgOiAoJyArICcgKyBjKVxuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gJygnICsgeDEgKyAnLCAnICsgeTEgKyAnKVxcXFx0ZXh0eyBhbmQgfSgnICsgeDIgKyAnLCAnICsgeTIgKyAnKSdcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJ3kgPSAnICsgeHN0ciArIGNvbnN0c3RyXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ0ZpbmQgdGhlIGVxdWF0aW9uIG9mIHRoZSBsaW5lIHRocm91Z2gnXG4gIH1cbn1cbiIsIi8qIFJlbmRlcnMgbWlzc2luZyBhbmdsZXMgcHJvYmxlbSB3aGVuIHRoZSBhbmdsZXMgYXJlIGF0IGEgcG9pbnRcbiAqIEkuZS4gb24gYSBzdHJhaWdodCBsaW5lIG9yIGFyb3VuZCBhIHBvaW50XG4gKiBDb3VsZCBhbHNvIGJlIGFkYXB0ZWQgdG8gYW5nbGVzIGZvcm1pbmcgYSByaWdodCBhbmdsZVxuICpcbiAqIFNob3VsZCBiZSBmbGV4aWJsZSBlbm91Z2ggZm9yIG51bWVyaWNhbCBwcm9ibGVtcyBvciBhbGdlYnJhaWMgb25lc1xuICpcbiAqL1xuXG5pbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBHcmFwaGljUVZpZXcsIExhYmVsIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgeyByb3VuZERQIH0gZnJvbSAndXRpbGl0aWVzJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNOdW1iZXJEYXRhJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzVmlld09wdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGV4dGVuZHMgR3JhcGhpY1FWaWV3IHtcbiAgcmFkaXVzOiBudW1iZXJcbiAgTzogUG9pbnRcbiAgQTogUG9pbnRcbiAgQzogUG9pbnRbXVxuICB2aWV3QW5nbGVzOiBudW1iZXJbXSAvLyAnZnVkZ2VkJyB2ZXJzaW9ucyBvZiBkYXRhLmFuZ2xlcyBmb3IgZGlzcGxheVxuICBkYXRhITogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgLy8gaW5pdGlhbGlzZWQgaW4gc3VwZXIgY2FsbFxuICByb3RhdGlvbjogbnVtYmVyXG5cbiAgY29uc3RydWN0b3IgKGRhdGEgOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSwgb3B0aW9ucyA6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIHNldHMgdGhpcy53aWR0aCB0aGlzLmhlaWdodCwgaW5pdGlhbGlzZXMgdGhpcy5sYWJlbHMsIGNyZWF0ZXMgZG9tIGVsZW1lbnRzXG4gICAgY29uc3Qgd2lkdGggPSB0aGlzLndpZHRoXG4gICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5oZWlnaHRcbiAgICBjb25zdCByYWRpdXMgPSB0aGlzLnJhZGl1cyA9IE1hdGgubWluKHdpZHRoLCBoZWlnaHQpIC8gMi41XG4gICAgY29uc3QgbWluVmlld0FuZ2xlID0gb3B0aW9ucy5taW5WaWV3QW5nbGUgfHwgMjVcblxuICAgIHRoaXMudmlld0FuZ2xlcyA9IGZ1ZGdlQW5nbGVzKHRoaXMuZGF0YS5hbmdsZXMsIG1pblZpZXdBbmdsZSlcblxuICAgIC8vIFNldCB1cCBtYWluIHBvaW50c1xuICAgIHRoaXMuTyA9IG5ldyBQb2ludCgwLCAwKSAvLyBjZW50ZXIgcG9pbnRcbiAgICB0aGlzLkEgPSBuZXcgUG9pbnQocmFkaXVzLCAwKSAvLyBmaXJzdCBwb2ludFxuICAgIHRoaXMuQyA9IFtdIC8vIFBvaW50cyBhcm91bmQgb3V0c2lkZVxuICAgIGxldCB0b3RhbGFuZ2xlID0gMCAvLyBuYiBpbiByYWRpYW5zXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmRhdGEuYW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0b3RhbGFuZ2xlICs9IHRoaXMudmlld0FuZ2xlc1tpXSAqIE1hdGguUEkgLyAxODBcbiAgICAgIHRoaXMuQ1tpXSA9IFBvaW50LmZyb21Qb2xhcihyYWRpdXMsIHRvdGFsYW5nbGUpXG4gICAgfVxuXG4gICAgLy8gUmFuZG9tbHkgcm90YXRlIGFuZCBjZW50ZXJcbiAgICB0aGlzLnJvdGF0aW9uID0gKG9wdGlvbnMucm90YXRpb24gIT09IHVuZGVmaW5lZCkgPyB0aGlzLnJvdGF0ZShvcHRpb25zLnJvdGF0aW9uKSA6IHRoaXMucmFuZG9tUm90YXRlKClcbiAgICAvLyB0aGlzLnNjYWxlVG9GaXQod2lkdGgsaGVpZ2h0LDEwKVxuICAgIHRoaXMudHJhbnNsYXRlKHdpZHRoIC8gMiwgaGVpZ2h0IC8gMilcblxuICAgIC8vIFNldCB1cCBsYWJlbHMgKGFmdGVyIHNjYWxpbmcgYW5kIHJvdGF0aW5nKVxuICAgIHRvdGFsYW5nbGUgPSBQb2ludC5hbmdsZUZyb20odGhpcy5PLCB0aGlzLkEpICogMTgwIC8gTWF0aC5QSSAvLyBhbmdsZSBmcm9tIE8gdGhhdCBBIGlzXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnZpZXdBbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIC8vIExhYmVsIHRleHRcbiAgICAgIGNvbnN0IGxhYmVsIDogUGFydGlhbDxMYWJlbD4gPSB7fVxuICAgICAgY29uc3QgdGV4dHEgPSB0aGlzLmRhdGEuYW5nbGVMYWJlbHNbaV1cbiAgICAgIGNvbnN0IHRleHRhID0gcm91bmREUCh0aGlzLmRhdGEuYW5nbGVzW2ldLCAyKS50b1N0cmluZygpICsgJ15cXFxcY2lyYydcblxuICAgICAgLy8gUG9zaXRpb25pbmdcbiAgICAgIGNvbnN0IHRoZXRhID0gdGhpcy52aWV3QW5nbGVzW2ldXG4gICAgICAvKiBjb3VsZCBiZSB1c2VkIGZvciBtb3JlIGFkdmFuY2VkIHBvc2l0aW9uaW5nXG4gICAgICBjb25zdCBtaWRBbmdsZSA9IHRvdGFsYW5nbGUgKyB0aGV0YSAvIDJcbiAgICAgIGNvbnN0IG1pbkRpc3RhbmNlID0gMC4zIC8vIGFzIGEgZnJhY3Rpb24gb2YgcmFkaXVzXG4gICAgICBjb25zdCBsYWJlbExlbmd0aCA9IE1hdGgubWF4KHRleHRxLmxlbmd0aCwgdGV4dGEubGVuZ3RoKSAtICdeXFxcXGNpcmMnLmxlbmd0aCAvLyDCsCB0YWtlcyB1cCB2ZXJ5IGxpdHRsZSBzcGFjZVxuICAgICAgKi9cblxuICAgICAgLyogRXhwbGFuYXRpb246IEZ1cnRoZXIgb3V0IGlmOlxuICAgICAgKiAgIE1vcmUgdmVydGljYWwgKHNpbihtaWRBbmdsZSkpXG4gICAgICAqICAgTG9uZ2VyIGxhYmVsXG4gICAgICAqICAgc21hbGxlciBhbmdsZVxuICAgICAgKiAgIEUuZy4gdG90YWxseSB2ZXJ0aWNhbCwgNDXCsCwgbGVuZ3RoID0gM1xuICAgICAgKiAgIGQgPSAwLjMgKyAxKjMvNDUgPSAwLjMgKyAwLjcgPSAwLjM3XG4gICAgICAqL1xuICAgICAgLy8gY29uc3QgZmFjdG9yID0gMSAgICAgICAgLy8gY29uc3RhbnQgb2YgcHJvcG9ydGlvbmFsaXR5LiBTZXQgYnkgdHJpYWwgYW5kIGVycm9yXG4gICAgICAvLyBsZXQgZGlzdGFuY2UgPSBtaW5EaXN0YW5jZSArIGZhY3RvciAqIE1hdGguYWJzKHNpbkRlZyhtaWRBbmdsZSkpICogbGFiZWxMZW5ndGggLyB0aGV0YVxuXG4gICAgICAvLyBKdXN0IHJldmVydCB0byBvbGQgbWV0aG9kXG5cbiAgICAgIGNvbnN0IGRpc3RhbmNlID0gMC40ICsgNiAvIHRoZXRhXG5cbiAgICAgIGxhYmVsLnBvcyA9IFBvaW50LmZyb21Qb2xhckRlZyhyYWRpdXMgKiBkaXN0YW5jZSwgdG90YWxhbmdsZSArIHRoZXRhIC8gMikudHJhbnNsYXRlKHRoaXMuTy54LCB0aGlzLk8ueSlcbiAgICAgIGxhYmVsLnRleHRxID0gdGV4dHFcbiAgICAgIGxhYmVsLnN0eWxlcSA9ICdub3JtYWwnXG5cbiAgICAgIGlmICh0aGlzLmRhdGEubWlzc2luZ1tpXSkge1xuICAgICAgICBsYWJlbC50ZXh0YSA9IHRleHRhXG4gICAgICAgIGxhYmVsLnN0eWxlYSA9ICdhbnN3ZXInXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsYWJlbC50ZXh0YSA9IGxhYmVsLnRleHRxXG4gICAgICAgIGxhYmVsLnN0eWxlYSA9IGxhYmVsLnN0eWxlcVxuICAgICAgfVxuXG4gICAgICBsYWJlbC50ZXh0ID0gbGFiZWwudGV4dHFcbiAgICAgIGxhYmVsLnN0eWxlID0gbGFiZWwuc3R5bGVxXG5cbiAgICAgIHRoaXMubGFiZWxzW2ldID0gbGFiZWwgYXMgTGFiZWxcblxuICAgICAgdG90YWxhbmdsZSArPSB0aGV0YVxuICAgIH1cblxuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRxXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZXFcbiAgICB9KVxuICB9XG5cbiAgcmVuZGVyICgpIDogdm9pZCB7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICAgIGlmIChjdHggPT09IG51bGwpIHsgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgZ2V0IGNhbnZhcyBjb250ZXh0JykgfVxuXG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KSAvLyBjbGVhclxuXG4gICAgY3R4LmJlZ2luUGF0aCgpXG4gICAgY3R4Lm1vdmVUbyh0aGlzLk8ueCwgdGhpcy5PLnkpIC8vIGRyYXcgbGluZXNcbiAgICBjdHgubGluZVRvKHRoaXMuQS54LCB0aGlzLkEueSlcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuQy5sZW5ndGg7IGkrKykge1xuICAgICAgY3R4Lm1vdmVUbyh0aGlzLk8ueCwgdGhpcy5PLnkpXG4gICAgICBjdHgubGluZVRvKHRoaXMuQ1tpXS54LCB0aGlzLkNbaV0ueSlcbiAgICB9XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gJ2dyYXknXG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBsZXQgdG90YWxhbmdsZSA9IHRoaXMucm90YXRpb25cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudmlld0FuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgdGhldGEgPSB0aGlzLnZpZXdBbmdsZXNbaV0gKiBNYXRoLlBJIC8gMTgwXG4gICAgICAvLyAwLjA3L3RoZXRhIHJhZGlhbnMgfj0gNC90aGV0YVxuICAgICAgY3R4LmFyYyh0aGlzLk8ueCwgdGhpcy5PLnksIHRoaXMucmFkaXVzICogKDAuMiArIDAuMDcgLyB0aGV0YSksIHRvdGFsYW5nbGUsIHRvdGFsYW5nbGUgKyB0aGV0YSlcbiAgICAgIGN0eC5zdHJva2UoKVxuICAgICAgdG90YWxhbmdsZSArPSB0aGV0YVxuICAgIH1cbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIC8vIHRlc3RpbmcgbGFiZWwgcG9zaXRpb25pbmc6XG4gICAgLy8gdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAvLyBjdHguZmlsbFN0eWxlID0gJ3JlZCdcbiAgICAvLyBjdHguZmlsbFJlY3QobC5wb3MueCAtIDEsIGwucG9zLnkgLSAxLCAzLCAzKVxuICAgIC8vIH0pXG5cbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGdldCBhbGxwb2ludHMgKCkgOiBQb2ludFtdIHtcbiAgICBsZXQgYWxscG9pbnRzID0gW3RoaXMuQSwgdGhpcy5PXVxuICAgIGFsbHBvaW50cyA9IGFsbHBvaW50cy5jb25jYXQodGhpcy5DKVxuICAgIHRoaXMubGFiZWxzLmZvckVhY2goZnVuY3Rpb24gKGwpIHtcbiAgICAgIGFsbHBvaW50cy5wdXNoKGwucG9zKVxuICAgIH0pXG4gICAgcmV0dXJuIGFsbHBvaW50c1xuICB9XG59XG5cbi8qKlxuICogQWRqdXN0cyBhIHNldCBvZiBhbmdsZXMgc28gdGhhdCBhbGwgYW5nbGVzIGFyZSBncmVhdGVyIHRoYW4ge21pbkFuZ2xlfSBieSByZWR1Y2luZyBvdGhlciBhbmdsZXMgaW4gcHJvcG9ydGlvblxuICogQHBhcmFtIGFuZ2xlcyBUaGUgc2V0IG9mIGFuZ2xlcyB0byBhZGp1c3RcbiAqIEBwYXJhbSBtaW5BbmdsZSBUaGUgc21hbGxlc3QgYW5nbGUgaW4gdGhlIG91dHB1dFxuICovXG5mdW5jdGlvbiBmdWRnZUFuZ2xlcyAoYW5nbGVzOiBudW1iZXJbXSwgbWluQW5nbGU6IG51bWJlcikgOiBudW1iZXJbXSB7XG4gIGNvbnN0IGFuZ2xlU3VtID0gYW5nbGVzLnJlZHVjZSgoYSwgYykgPT4gYSArIGMpXG4gIGNvbnN0IG1hcHBlZEFuZ2xlcyA9IGFuZ2xlcy5tYXAoKHgsIGkpID0+IFt4LCBpXSkgLy8gcmVtZW1iZXIgb3JpZ2luYWwgaW5kaWNlc1xuICBjb25zdCBzbWFsbEFuZ2xlcyA9IG1hcHBlZEFuZ2xlcy5maWx0ZXIoeCA9PiB4WzBdIDwgbWluQW5nbGUpIC8vIHNwbGl0IG91dCBhbmdsZXMgd2hpY2ggYXJlIHRvbyBzbWFsbFxuICBjb25zdCBsYXJnZUFuZ2xlcyA9IG1hcHBlZEFuZ2xlcy5maWx0ZXIoeCA9PiB4WzBdID49IG1pbkFuZ2xlKVxuICBjb25zdCBsYXJnZUFuZ2xlU3VtID0gbGFyZ2VBbmdsZXMucmVkdWNlKChhY2N1bXVsYXRvciwgY3VycmVudFZhbHVlKSA9PiBhY2N1bXVsYXRvciArIGN1cnJlbnRWYWx1ZVswXSwgMClcblxuICBzbWFsbEFuZ2xlcy5mb3JFYWNoKHNtYWxsID0+IHtcbiAgICBjb25zdCBkaWZmZXJlbmNlID0gbWluQW5nbGUgLSBzbWFsbFswXVxuICAgIHNtYWxsWzBdICs9IGRpZmZlcmVuY2VcbiAgICBsYXJnZUFuZ2xlcy5mb3JFYWNoKGxhcmdlID0+IHtcbiAgICAgIGNvbnN0IHJlZHVjdGlvbiA9IGRpZmZlcmVuY2UgKiBsYXJnZVswXSAvIGxhcmdlQW5nbGVTdW1cbiAgICAgIGxhcmdlWzBdID0gTWF0aC5yb3VuZChsYXJnZVswXSAtIHJlZHVjdGlvbilcbiAgICB9KVxuICB9KVxuXG4gIC8vIGZpeCBhbnkgcm91bmRpbmcgZXJyb3JzIGludHJvZHVjZWRcblxuICBjb25zdCBuZXdBbmdsZXMgPSBzbWFsbEFuZ2xlcy5jb25jYXQobGFyZ2VBbmdsZXMpIC8vIGNvbWJpbmUgdG9nZXRoZXJcbiAgICAuc29ydCgoeCwgeSkgPT4geFsxXSAtIHlbMV0pIC8vIHNvcnQgYnkgcHJldmlvdXMgaW5kZXhcbiAgICAubWFwKHggPT4geFswXSkgLy8gc3RyaXAgb3V0IGluZGV4XG5cbiAgbGV0IG5ld1N1bSA9IG5ld0FuZ2xlcy5yZWR1Y2UoKGFjYywgY3VycikgPT4gYWNjICsgY3VycilcbiAgaWYgKG5ld1N1bSAhPT0gYW5nbGVTdW0pIHtcbiAgICBjb25zdCBkaWZmZXJlbmNlID0gYW5nbGVTdW0gLSBuZXdTdW1cbiAgICBuZXdBbmdsZXNbbmV3QW5nbGVzLmluZGV4T2YoTWF0aC5tYXgoLi4ubmV3QW5nbGVzKSldICs9IGRpZmZlcmVuY2VcbiAgfVxuICBuZXdTdW0gPSBuZXdBbmdsZXMucmVkdWNlKChhY2MsIGN1cnIpID0+IGFjYyArIGN1cnIpXG4gIGlmIChuZXdTdW0gIT09IGFuZ2xlU3VtKSB0aHJvdyBuZXcgRXJyb3IoYERpZG4ndCBmaXggYW5nbGVzLiBOZXcgc3VtIGlzICR7bmV3U3VtfSwgYnV0IHNob3VsZCBiZSAke2FuZ2xlU3VtfWApXG5cbiAgcmV0dXJuIG5ld0FuZ2xlc1xufVxuIiwiLyoqIEdlbmVyYXRlcyBhbmQgaG9sZHMgZGF0YSBmb3IgYSBtaXNzaW5nIGFuZ2xlcyBxdWVzdGlvbiwgd2hlcmUgdGhlc2UgaXMgc29tZSBnaXZlbiBhbmdsZSBzdW1cbiAqICBBZ25vc3RpYyBhcyB0byBob3cgdGhlc2UgYW5nbGVzIGFyZSBhcnJhbmdlZCAoZS5nLiBpbiBhIHBvbHlnb24gb3IgYXJvdW5kIHNvbSBwb2ludClcbiAqXG4gKiBPcHRpb25zIHBhc3NlZCB0byBjb25zdHJ1Y3RvcnM6XG4gKiAgYW5nbGVTdW06OkludCB0aGUgbnVtYmVyIG9mIGFuZ2xlcyB0byBnZW5lcmF0ZVxuICogIG1pbkFuZ2xlOjpJbnQgdGhlIHNtYWxsZXN0IGFuZ2xlIHRvIGdlbmVyYXRlXG4gKiAgbWluTjo6SW50ICAgICB0aGUgc21hbGxlc3QgbnVtYmVyIG9mIGFuZ2xlcyB0byBnZW5lcmF0ZVxuICogIG1heE46OkludCAgICAgdGhlIGxhcmdlc3QgbnVtYmVyIG9mIGFuZ2xlcyB0byBnZW5lcmF0ZVxuICpcbiAqL1xuXG5pbXBvcnQgeyByYW5kQmV0d2VlbiwgcmFuZFBhcnRpdGlvbiB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCB7IEdyYXBoaWNRRGF0YSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc0RhdGEgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNEYXRhJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlT3B0aW9ucyBhcyBPcHRpb25zIH0gZnJvbSAnLi9OdW1iZXJPcHRpb25zJ1xuXG5leHBvcnQgY2xhc3MgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgaW1wbGVtZW50cyBNaXNzaW5nQW5nbGVzRGF0YSB7XG4gIGFuZ2xlcyA6IG51bWJlcltdIC8vIGxpc3Qgb2YgYW5nbGVzXG4gIG1pc3NpbmcgOiBib29sZWFuW10gLy8gdHJ1ZSBpZiBtaXNzaW5nXG4gIGFuZ2xlU3VtIDogbnVtYmVyIC8vIHdoYXQgdGhlIGFuZ2xlcyBhZGQgdXAgdG9cbiAgYW5nbGVMYWJlbHM6IHN0cmluZ1tdXG5cbiAgY29uc3RydWN0b3IgKGFuZ2xlU3VtIDogbnVtYmVyLCBhbmdsZXM6IG51bWJlcltdLCBtaXNzaW5nOiBib29sZWFuW10sIGFuZ2xlTGFiZWxzPzogc3RyaW5nW10pIHtcbiAgICAvLyBpbml0aWFsaXNlcyB3aXRoIGFuZ2xlcyBnaXZlbiBleHBsaWNpdGx5XG4gICAgaWYgKGFuZ2xlcyA9PT0gW10pIHsgdGhyb3cgbmV3IEVycm9yKCdNdXN0IGdpdmUgYW5nbGVzJykgfVxuICAgIGlmIChNYXRoLnJvdW5kKGFuZ2xlcy5yZWR1Y2UoKHgsIHkpID0+IHggKyB5KSkgIT09IGFuZ2xlU3VtKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFuZ2xlIHN1bSBtdXN0IGJlICR7YW5nbGVTdW19YClcbiAgICB9XG5cbiAgICB0aGlzLmFuZ2xlcyA9IGFuZ2xlcyAvLyBsaXN0IG9mIGFuZ2xlc1xuICAgIHRoaXMubWlzc2luZyA9IG1pc3NpbmcgLy8gd2hpY2ggYW5nbGVzIGFyZSBtaXNzaW5nIC0gYXJyYXkgb2YgYm9vbGVhbnNcbiAgICB0aGlzLmFuZ2xlU3VtID0gYW5nbGVTdW0gLy8gc3VtIG9mIGFuZ2xlc1xuICAgIHRoaXMuYW5nbGVMYWJlbHMgPSBhbmdsZUxhYmVscyB8fCBbXVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB7XG4gICAgbGV0IHF1ZXN0aW9uIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGFcbiAgICBpZiAob3B0aW9ucy5yZXBlYXRlZCkge1xuICAgICAgcXVlc3Rpb24gPSB0aGlzLnJhbmRvbVJlcGVhdGVkKG9wdGlvbnMpXG4gICAgfSBlbHNlIHtcbiAgICAgIHF1ZXN0aW9uID0gdGhpcy5yYW5kb21TaW1wbGUob3B0aW9ucylcbiAgICB9XG4gICAgcXVlc3Rpb24uaW5pdExhYmVscygpXG4gICAgcmV0dXJuIHF1ZXN0aW9uXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tU2ltcGxlIChvcHRpb25zOiBPcHRpb25zKTogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEge1xuICAgIGNvbnN0IGFuZ2xlU3VtID0gb3B0aW9ucy5hbmdsZVN1bVxuICAgIGNvbnN0IG4gPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbk4sIG9wdGlvbnMubWF4TilcbiAgICBjb25zdCBtaW5BbmdsZSA9IG9wdGlvbnMubWluQW5nbGVcblxuICAgIGlmIChuIDwgMikgdGhyb3cgbmV3IEVycm9yKCdDYW5cXCd0IGhhdmUgbWlzc2luZyBmZXdlciB0aGFuIDIgYW5nbGVzJylcblxuICAgIC8vIEJ1aWxkIHVwIGFuZ2xlc1xuICAgIC8qXG4gICAgY29uc3QgYW5nbGVzOiBudW1iZXJbXSA9IFtdXG4gICAgbGV0IGxlZnQgPSBhbmdsZVN1bVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbiAtIDE7IGkrKykge1xuICAgICAgY29uc3QgbWF4QW5nbGUgPSBsZWZ0IC0gbWluQW5nbGUgKiAobiAtIGkgLSAxKVxuICAgICAgY29uc3QgbmV4dEFuZ2xlID0gcmFuZEJldHdlZW4obWluQW5nbGUsIG1heEFuZ2xlKVxuICAgICAgbGVmdCAtPSBuZXh0QW5nbGVcbiAgICAgIGFuZ2xlcy5wdXNoKG5leHRBbmdsZSlcbiAgICB9XG4gICAgYW5nbGVzW24gLSAxXSA9IGxlZnRcbiAgICAqL1xuXG4gICAgY29uc3QgYW5nbGVzID0gcmFuZFBhcnRpdGlvbih7dG90YWw6IGFuZ2xlU3VtLCBuOiBuLCBtaW5WYWx1ZTogbWluQW5nbGV9KVxuXG4gICAgLy8gcGljayBvbmUgdG8gYmUgbWlzc2luZ1xuICAgIGNvbnN0IG1pc3Npbmc6IGJvb2xlYW5bXSA9IFtdXG4gICAgbWlzc2luZy5sZW5ndGggPSBuXG4gICAgbWlzc2luZy5maWxsKGZhbHNlKVxuICAgIG1pc3NpbmdbcmFuZEJldHdlZW4oMCwgbiAtIDEpXSA9IHRydWVcblxuICAgIHJldHVybiBuZXcgdGhpcyhhbmdsZVN1bSwgYW5nbGVzLCBtaXNzaW5nKVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbVJlcGVhdGVkIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBjb25zdCBhbmdsZVN1bTogbnVtYmVyID0gb3B0aW9ucy5hbmdsZVN1bVxuICAgIGNvbnN0IG1pbkFuZ2xlOiBudW1iZXIgPSBvcHRpb25zLm1pbkFuZ2xlXG5cbiAgICBjb25zdCBuOiBudW1iZXIgPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbk4sIG9wdGlvbnMubWF4TilcblxuICAgIGNvbnN0IG06IG51bWJlciA9IG9wdGlvbnMubk1pc3NpbmcgfHwgKE1hdGgucmFuZG9tKCkgPCAwLjEgPyBuIDogcmFuZEJldHdlZW4oMiwgbiAtIDEpKVxuXG4gICAgaWYgKG4gPCAyIHx8IG0gPCAxIHx8IG0gPiBuKSB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgYXJndW1lbnRzOiBuPSR7bn0sIG09JHttfWApXG5cbiAgICAvLyBBbGwgbWlzc2luZyAtIGRvIGFzIGEgc2VwYXJhdGUgY2FzZVxuICAgIGlmIChuID09PSBtKSB7XG4gICAgICBjb25zdCBhbmdsZXM6IG51bWJlcltdID0gW11cbiAgICAgIGFuZ2xlcy5sZW5ndGggPSBuXG4gICAgICBhbmdsZXMuZmlsbChhbmdsZVN1bSAvIG4pXG5cbiAgICAgIGNvbnN0IG1pc3Npbmc6IGJvb2xlYW5bXSA9IFtdXG4gICAgICBtaXNzaW5nLmxlbmd0aCA9IG5cbiAgICAgIG1pc3NpbmcuZmlsbCh0cnVlKVxuXG4gICAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZylcbiAgICB9XG5cbiAgICBjb25zdCBhbmdsZXM6IG51bWJlcltdID0gW11cbiAgICBjb25zdCBtaXNzaW5nOiBib29sZWFuW10gPSBbXVxuICAgIG1pc3NpbmcubGVuZ3RoID0gblxuICAgIG1pc3NpbmcuZmlsbChmYWxzZSlcblxuICAgIC8vIGNob29zZSBhIHZhbHVlIGZvciB0aGUgbWlzc2luZyBhbmdsZXNcbiAgICBjb25zdCBtYXhSZXBlYXRlZEFuZ2xlID0gKGFuZ2xlU3VtIC0gbWluQW5nbGUgKiAobiAtIG0pKSAvIG1cbiAgICBjb25zdCByZXBlYXRlZEFuZ2xlID0gcmFuZEJldHdlZW4obWluQW5nbGUsIG1heFJlcGVhdGVkQW5nbGUpXG5cbiAgICAvLyBjaG9vc2UgdmFsdWVzIGZvciB0aGUgb3RoZXIgYW5nbGVzXG4gICAgY29uc3Qgb3RoZXJBbmdsZXM6IG51bWJlcltdID0gW11cbiAgICBsZXQgbGVmdCA9IGFuZ2xlU3VtIC0gcmVwZWF0ZWRBbmdsZSAqIG1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG4gLSBtIC0gMTsgaSsrKSB7XG4gICAgICBjb25zdCBtYXhBbmdsZSA9IGxlZnQgLSBtaW5BbmdsZSAqIChuIC0gbSAtIGkgLSAxKVxuICAgICAgY29uc3QgbmV4dEFuZ2xlID0gcmFuZEJldHdlZW4obWluQW5nbGUsIG1heEFuZ2xlKVxuICAgICAgbGVmdCAtPSBuZXh0QW5nbGVcbiAgICAgIG90aGVyQW5nbGVzLnB1c2gobmV4dEFuZ2xlKVxuICAgIH1cbiAgICBvdGhlckFuZ2xlc1tuIC0gbSAtIDFdID0gbGVmdFxuXG4gICAgLy8gY2hvb3NlIHdoZXJlIHRoZSBtaXNzaW5nIGFuZ2xlcyBhcmVcbiAgICB7XG4gICAgICBsZXQgaSA9IDBcbiAgICAgIHdoaWxlIChpIDwgbSkge1xuICAgICAgICBjb25zdCBqID0gcmFuZEJldHdlZW4oMCwgbiAtIDEpXG4gICAgICAgIGlmIChtaXNzaW5nW2pdID09PSBmYWxzZSkge1xuICAgICAgICAgIG1pc3Npbmdbal0gPSB0cnVlXG4gICAgICAgICAgYW5nbGVzW2pdID0gcmVwZWF0ZWRBbmdsZVxuICAgICAgICAgIGkrK1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZmlsbCBpbiB0aGUgb3RoZXIgYW5nbGVzXG4gICAge1xuICAgICAgbGV0IGogPSAwXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICBpZiAobWlzc2luZ1tpXSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBhbmdsZXNbaV0gPSBvdGhlckFuZ2xlc1tqXVxuICAgICAgICAgIGorK1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgdGhpcyhhbmdsZVN1bSwgYW5nbGVzLCBtaXNzaW5nKVxuICB9XG5cbiAgaW5pdExhYmVscyAoKSA6IHZvaWQge1xuICAgIGNvbnN0IG4gPSB0aGlzLmFuZ2xlcy5sZW5ndGhcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgaWYgKCF0aGlzLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgdGhpcy5hbmdsZUxhYmVsc1tpXSA9IGAke3RoaXMuYW5nbGVzW2ldLnRvU3RyaW5nKCl9XlxcXFxjaXJjYFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5hbmdsZUxhYmVsc1tpXSA9ICd4XlxcXFxjaXJjJ1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwiLyogUXVlc3Rpb24gdHlwZSBjb21wcmlzaW5nIG51bWVyaWNhbCBtaXNzaW5nIGFuZ2xlcyBhcm91bmQgYSBwb2ludCBhbmRcbiAqIGFuZ2xlcyBvbiBhIHN0cmFpZ2h0IGxpbmUgKHNpbmNlIHRoZXNlIGFyZSB2ZXJ5IHNpbWlsYXIgbnVtZXJpY2FsbHkgYXMgd2VsbFxuICogYXMgZ3JhcGhpY2FsbHkuXG4gKlxuICogQWxzbyBjb3ZlcnMgY2FzZXMgd2hlcmUgbW9yZSB0aGFuIG9uZSBhbmdsZSBpcyBlcXVhbFxuICpcbiAqL1xuXG5pbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRWaWV3J1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNOdW1iZXJEYXRhJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzVmlld09wdGlvbnMnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVPcHRpb25zIH0gZnJvbSAnLi9OdW1iZXJPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIC8vIGluaXRpYWxpc2VkIGluIHN1cGVyKClcbiAgdmlldyE6IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogUGFydGlhbDxNaXNzaW5nQW5nbGVPcHRpb25zPiwgdmlld09wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzQXJvdW5kUSB7XG4gICAgY29uc3QgZGVmYXVsdHMgOiBNaXNzaW5nQW5nbGVPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAxNSxcbiAgICAgIG1pbk46IDIsXG4gICAgICBtYXhOOiA0LFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlLFxuICAgICAgbk1pc3Npbmc6IDNcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3M6IE1pc3NpbmdBbmdsZU9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YS5yYW5kb20oc2V0dGluZ3MpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyhkYXRhLCB2aWV3T3B0aW9ucykgLy8gVE9ETyBlbGltaW5hdGUgcHVibGljIGNvbnN0cnVjdG9yc1xuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kUShkYXRhLCB2aWV3KVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSA6IHN0cmluZyB7IHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZScgfVxufVxuIiwiaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgR3JhcGhpY1FWaWV3LCBMYWJlbCB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IHsgc2luRGVnLCBkYXNoZWRMaW5lLCByb3VuZERQIH0gZnJvbSAndXRpbGl0aWVzJ1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IGV4dGVuZHMgR3JhcGhpY1FWaWV3IHtcbiAgQSA6IFBvaW50IC8vIHRoZSB2ZXJ0aWNlcyBvZiB0aGUgdHJpYW5nbGVcbiAgQiA6IFBvaW50XG4gIEMgOiBQb2ludFxuICByb3RhdGlvbjogbnVtYmVyXG4gIC8vIEluaGVyaXRlZCBtZW1iZXJzLiBBbGwgaW5pdGlhbGlzZWQgaW4gY2FsbCB0byBzdXBlcigpXG4gIGxhYmVscyE6IExhYmVsW11cbiAgY2FudmFzITogSFRNTENhbnZhc0VsZW1lbnRcbiAgRE9NITogSFRNTEVsZW1lbnRcbiAgd2lkdGghOiBudW1iZXJcbiAgaGVpZ2h0ITogbnVtYmVyXG4gIGRhdGEhOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhXG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEsIG9wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc2V0cyB0aGlzLndpZHRoIHRoaXMuaGVpZ2h0LCB0aGlzLmRhdGEgaW5pdGlhbGlzZXMgdGhpcy5sYWJlbHMsIGNyZWF0ZXMgZG9tIGVsZW1lbnRzXG4gICAgY29uc3Qgd2lkdGggPSB0aGlzLndpZHRoXG4gICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5oZWlnaHRcblxuICAgIC8vIGdlbmVyYXRlIHBvaW50cyAod2l0aCBsb25nZXN0IHNpZGUgMVxuICAgIHRoaXMuQSA9IG5ldyBQb2ludCgwLCAwKVxuICAgIHRoaXMuQiA9IFBvaW50LmZyb21Qb2xhckRlZygxLCBkYXRhLmFuZ2xlc1swXSlcbiAgICB0aGlzLkMgPSBuZXcgUG9pbnQoXG4gICAgICBzaW5EZWcodGhpcy5kYXRhLmFuZ2xlc1sxXSkgLyBzaW5EZWcodGhpcy5kYXRhLmFuZ2xlc1syXSksIDBcbiAgICApXG5cbiAgICAvLyBDcmVhdGUgbGFiZWxzXG4gICAgY29uc3QgaW5DZW50ZXIgPSBQb2ludC5pbkNlbnRlcih0aGlzLkEsIHRoaXMuQiwgdGhpcy5DKVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGNvbnN0IHAgPSBbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ11baV1cblxuICAgICAgY29uc3QgbGFiZWwgOiBQYXJ0aWFsPExhYmVsPiA9IHtcbiAgICAgICAgdGV4dHE6IHRoaXMuZGF0YS5hbmdsZUxhYmVsc1tpXSxcbiAgICAgICAgdGV4dDogdGhpcy5kYXRhLmFuZ2xlTGFiZWxzW2ldLFxuICAgICAgICBzdHlsZXE6ICdub3JtYWwnLFxuICAgICAgICBzdHlsZTogJ25vcm1hbCcsXG4gICAgICAgIHBvczogUG9pbnQubWVhbihwLCBwLCBpbkNlbnRlcilcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuZGF0YS5taXNzaW5nW2ldKSB7XG4gICAgICAgIGxhYmVsLnRleHRhID0gcm91bmREUCh0aGlzLmRhdGEuYW5nbGVzW2ldLCAyKS50b1N0cmluZygpICsgJ15cXFxcY2lyYydcbiAgICAgICAgbGFiZWwuc3R5bGVhID0gJ2Fuc3dlcidcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxhYmVsLnRleHRhID0gbGFiZWwudGV4dHFcbiAgICAgICAgbGFiZWwuc3R5bGVhID0gbGFiZWwuc3R5bGVxXG4gICAgICB9XG5cbiAgICAgIHRoaXMubGFiZWxzW2ldID0gbGFiZWwgYXMgTGFiZWxcbiAgICB9XG5cbiAgICAvLyByb3RhdGUgcmFuZG9tbHlcbiAgICB0aGlzLnJvdGF0aW9uID0gKG9wdGlvbnMucm90YXRpb24gIT09IHVuZGVmaW5lZCkgPyB0aGlzLnJvdGF0ZShvcHRpb25zLnJvdGF0aW9uKSA6IHRoaXMucmFuZG9tUm90YXRlKClcblxuICAgIC8vIHNjYWxlIGFuZCBmaXRcbiAgICAvLyBzY2FsZSB0byBzaXplXG4gICAgY29uc3QgbWFyZ2luID0gMFxuICAgIGxldCB0b3BsZWZ0ID0gUG9pbnQubWluKFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBsZXQgYm90dG9tcmlnaHQgPSBQb2ludC5tYXgoW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGNvbnN0IHRvdGFsV2lkdGggPSBib3R0b21yaWdodC54IC0gdG9wbGVmdC54XG4gICAgY29uc3QgdG90YWxIZWlnaHQgPSBib3R0b21yaWdodC55IC0gdG9wbGVmdC55XG4gICAgdGhpcy5zY2FsZShNYXRoLm1pbigod2lkdGggLSBtYXJnaW4pIC8gdG90YWxXaWR0aCwgKGhlaWdodCAtIG1hcmdpbikgLyB0b3RhbEhlaWdodCkpIC8vIDE1cHggbWFyZ2luXG5cbiAgICAvLyBtb3ZlIHRvIGNlbnRyZVxuICAgIHRvcGxlZnQgPSBQb2ludC5taW4oW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGJvdHRvbXJpZ2h0ID0gUG9pbnQubWF4KFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBjb25zdCBjZW50ZXIgPSBQb2ludC5tZWFuKHRvcGxlZnQsIGJvdHRvbXJpZ2h0KVxuICAgIHRoaXMudHJhbnNsYXRlKHdpZHRoIC8gMiAtIGNlbnRlci54LCBoZWlnaHQgLyAyIC0gY2VudGVyLnkpIC8vIGNlbnRyZVxuICB9XG5cbiAgcmVuZGVyICgpIDogdm9pZCB7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICAgIGlmIChjdHggPT09IG51bGwpIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGdldCBjYW52YXMgY29udGV4dCcpXG5cbiAgICBjb25zdCB2ZXJ0aWNlcyA9IFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXVxuICAgIGNvbnN0IGFwZXggPSB0aGlzLmRhdGEuYXBleCAvLyBobW1tXG5cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpIC8vIGNsZWFyXG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBjdHgubW92ZVRvKHRoaXMuQS54LCB0aGlzLkEueSlcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICBjb25zdCBwID0gdmVydGljZXNbaV1cbiAgICAgIGNvbnN0IG5leHQgPSB2ZXJ0aWNlc1soaSArIDEpICUgM11cbiAgICAgIGlmIChhcGV4ID09PSBpIHx8IGFwZXggPT09IChpICsgMSkgJSAzKSB7IC8vIHRvL2Zyb20gYXBleCAtIGRyYXcgZGFzaGVkIGxpbmVcbiAgICAgICAgZGFzaGVkTGluZShjdHgsIHAueCwgcC55LCBuZXh0LngsIG5leHQueSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGN0eC5saW5lVG8obmV4dC54LCBuZXh0LnkpXG4gICAgICB9XG4gICAgfVxuICAgIGN0eC5zdHJva2VTdHlsZSA9ICdncmF5J1xuICAgIGN0eC5zdHJva2UoKVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoZmFsc2UpXG4gIH1cblxuICBnZXQgYWxscG9pbnRzICgpIDogUG9pbnRbXSB7XG4gICAgY29uc3QgYWxscG9pbnRzID0gW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHsgYWxscG9pbnRzLnB1c2gobC5wb3MpIH0pXG4gICAgcmV0dXJuIGFsbHBvaW50c1xuICB9XG59XG4iLCIvKiBFeHRlbmRzIE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIGluIG9yZGVyIHRvIGRvIGlzb3NjZWxlcyB0cmlhbmdsZXMsIHdoaWNoIGdlbmVyYXRlIGEgYml0IGRpZmZlcmVudGx5ICovXG5cbmltcG9ydCB7IGZpcnN0VW5pcXVlSW5kZXggfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc051bWJlckRhdGEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVPcHRpb25zIH0gZnJvbSAnLi9OdW1iZXJPcHRpb25zJ1xuXG50eXBlIE9wdGlvbnMgPSBNaXNzaW5nQW5nbGVPcHRpb25zICYge2dpdmVuQW5nbGU/OiAnYXBleCcgfCAnYmFzZSd9XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEgZXh0ZW5kcyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB7XG4gICAgYXBleD86IDAgfCAxIHwgMiB8IHVuZGVmaW5lZCAvLyB3aGljaCBvZiB0aGUgdGhyZWUgZ2l2ZW4gYW5nbGVzIGlzIHRoZSBhcGV4IG9mIGFuIGlzb3NjZWxlcyB0cmlhbmdsZVxuICAgIGNvbnN0cnVjdG9yIChhbmdsZVN1bTogbnVtYmVyLCBhbmdsZXM6IG51bWJlcltdLCBtaXNzaW5nOiBib29sZWFuW10sIGFuZ2xlTGFiZWxzPzogc3RyaW5nW10sIGFwZXg/OiAwfDF8Mnx1bmRlZmluZWQpIHtcbiAgICAgIHN1cGVyKGFuZ2xlU3VtLCBhbmdsZXMsIG1pc3NpbmcsIGFuZ2xlTGFiZWxzKVxuICAgICAgdGhpcy5hcGV4ID0gYXBleFxuICAgIH1cblxuICAgIHN0YXRpYyByYW5kb21SZXBlYXRlZCAob3B0aW9uczogT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhIHtcbiAgICAgIG9wdGlvbnMubk1pc3NpbmcgPSAyXG4gICAgICBvcHRpb25zLmdpdmVuQW5nbGUgPSBvcHRpb25zLmdpdmVuQW5nbGUgfHwgTWF0aC5yYW5kb20oKSA8IDAuNSA/ICdhcGV4JyA6ICdiYXNlJ1xuXG4gICAgICAvLyBnZW5lcmF0ZSB0aGUgcmFuZG9tIGFuZ2xlcyB3aXRoIHJlcGV0aXRpb24gZmlyc3QgYmVmb3JlIG1hcmtpbmcgYXBleCBmb3IgZHJhd2luZ1xuICAgICAgY29uc3QgcXVlc3Rpb24gPSBzdXBlci5yYW5kb21SZXBlYXRlZChvcHRpb25zKSBhcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhIC8vIGFsbG93ZWQgc2luY2UgdW5kZWZpbmVkIFxcaW4gYXBleFxuXG4gICAgICAvLyBPbGQgaW1wbGVtZW50YXRpb24gaGFkIHNvcnRpbmcgdGhlIGFycmF5IC0gbm90IHN1cmUgd2h5XG4gICAgICAvLyBzb3J0VG9nZXRoZXIocXVlc3Rpb24uYW5nbGVzLHF1ZXN0aW9uLm1pc3NpbmcsKHgseSkgPT4geCAtIHkpXG5cbiAgICAgIHF1ZXN0aW9uLmFwZXggPSBmaXJzdFVuaXF1ZUluZGV4KHF1ZXN0aW9uLmFuZ2xlcykgYXMgMCB8IDEgfCAyXG4gICAgICBxdWVzdGlvbi5taXNzaW5nID0gW3RydWUsIHRydWUsIHRydWVdXG5cbiAgICAgIGlmIChvcHRpb25zLmdpdmVuQW5nbGUgPT09ICdhcGV4Jykge1xuICAgICAgICBxdWVzdGlvbi5taXNzaW5nW3F1ZXN0aW9uLmFwZXhdID0gZmFsc2VcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXN0aW9uLm1pc3NpbmdbKHF1ZXN0aW9uLmFwZXggKyAxKSAlIDNdID0gZmFsc2VcbiAgICAgIH1cblxuICAgICAgcXVlc3Rpb24uaW5pdExhYmVscygpXG5cbiAgICAgIHJldHVybiBxdWVzdGlvblxuICAgIH1cblxuICAgIGluaXRMYWJlbHMgKCk6IHZvaWQge1xuICAgICAgY29uc3QgbiA9IHRoaXMuYW5nbGVzLmxlbmd0aFxuICAgICAgbGV0IGogPSAwIC8vIGtlZXAgdHJhY2sgb2YgdW5rbm93bnNcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGlmICghdGhpcy5taXNzaW5nW2ldKSB7XG4gICAgICAgICAgdGhpcy5hbmdsZUxhYmVsc1tpXSA9IGAke3RoaXMuYW5nbGVzW2ldLnRvU3RyaW5nKCl9XlxcXFxjaXJjYFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuYW5nbGVMYWJlbHNbaV0gPSBgJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDEyMCArIGopfV5cXFxcY2lyY2AgLy8gMTIwID0gJ3gnXG4gICAgICAgICAgaisrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG59XG4iLCIvKiBNaXNzaW5nIGFuZ2xlcyBpbiB0cmlhbmdsZSAtIG51bWVyaWNhbCAqL1xuXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3J1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNOdW1iZXJEYXRhJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGFcbiAgdmlldyE6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXdcblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBQYXJ0aWFsPE1pc3NpbmdBbmdsZU9wdGlvbnM+LCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICBjb25zdCBvcHRpb25zT3ZlcnJpZGUgOiBQYXJ0aWFsPE1pc3NpbmdBbmdsZU9wdGlvbnM+ID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAyNSxcbiAgICAgIG1pbk46IDMsXG4gICAgICBtYXhOOiAzXG4gICAgfVxuICAgIGNvbnN0IGRlZmF1bHRzIDogTWlzc2luZ0FuZ2xlT3B0aW9ucyA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5BbmdsZTogMTUsXG4gICAgICBtaW5OOiAyLFxuICAgICAgbWF4TjogNCxcbiAgICAgIHJlcGVhdGVkOiBmYWxzZSxcbiAgICAgIG5NaXNzaW5nOiAxXG4gICAgfVxuXG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucywgb3B0aW9uc092ZXJyaWRlKVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEucmFuZG9tKHNldHRpbmdzKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyhkYXRhLCB2aWV3T3B0aW9ucylcblxuICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUShkYXRhLCB2aWV3KVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7IHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZScgfVxufVxuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgTGluRXhwciB7XG4vLyBjbGFzcyBMaW5FeHByIHtcbiAgY29uc3RydWN0b3IgKGEsIGIpIHtcbiAgICB0aGlzLmEgPSBhXG4gICAgdGhpcy5iID0gYlxuICB9XG5cbiAgaXNDb25zdGFudCAoKSB7XG4gICAgcmV0dXJuIHRoaXMuYSA9PT0gMFxuICB9XG5cbiAgdG9TdHJpbmcgKCkge1xuICAgIGxldCBzdHJpbmcgPSAnJ1xuXG4gICAgLy8geCB0ZXJtXG4gICAgaWYgKHRoaXMuYSA9PT0gMSkgeyBzdHJpbmcgKz0gJ3gnIH0gZWxzZSBpZiAodGhpcy5hID09PSAtMSkgeyBzdHJpbmcgKz0gJy14JyB9IGVsc2UgaWYgKHRoaXMuYSAhPT0gMCkgeyBzdHJpbmcgKz0gdGhpcy5hICsgJ3gnIH1cblxuICAgIC8vIHNpZ25cbiAgICBpZiAodGhpcy5hICE9PSAwICYmIHRoaXMuYiA+IDApIHsgc3RyaW5nICs9ICcgKyAnIH0gZWxzZSBpZiAodGhpcy5hICE9PSAwICYmIHRoaXMuYiA8IDApIHsgc3RyaW5nICs9ICcgLSAnIH1cblxuICAgIC8vIGNvbnN0YW50XG4gICAgaWYgKHRoaXMuYiA+IDApIHsgc3RyaW5nICs9IHRoaXMuYiB9IGVsc2UgaWYgKHRoaXMuYiA8IDAgJiYgdGhpcy5hID09PSAwKSB7IHN0cmluZyArPSB0aGlzLmIgfSBlbHNlIGlmICh0aGlzLmIgPCAwKSB7IHN0cmluZyArPSBNYXRoLmFicyh0aGlzLmIpIH1cblxuICAgIHJldHVybiBzdHJpbmdcbiAgfVxuXG4gIHRvU3RyaW5nUCAoKSB7XG4gICAgLy8gcmV0dXJuIGV4cHJlc3Npb24gYXMgYSBzdHJpbmcsIHN1cnJvdW5kZWQgaW4gcGFyZW50aGVzZXMgaWYgYSBiaW5vbWlhbFxuICAgIGlmICh0aGlzLmEgPT09IDAgfHwgdGhpcy5iID09PSAwKSByZXR1cm4gdGhpcy50b1N0cmluZygpXG4gICAgZWxzZSByZXR1cm4gJygnICsgdGhpcy50b1N0cmluZygpICsgJyknXG4gIH1cblxuICBldmFsICh4KSB7XG4gICAgcmV0dXJuIHRoaXMuYSAqIHggKyB0aGlzLmJcbiAgfVxuXG4gIGFkZCAodGhhdCkge1xuICAgIC8vIGFkZCBlaXRoZXIgYW4gZXhwcmVzc2lvbiBvciBhIGNvbnN0YW50XG4gICAgaWYgKHRoYXQuYSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gbmV3IExpbkV4cHIodGhpcy5hICsgdGhhdC5hLCB0aGlzLmIgKyB0aGF0LmIpXG4gICAgZWxzZSByZXR1cm4gbmV3IExpbkV4cHIodGhpcy5hLCB0aGlzLmIgKyB0aGF0KVxuICB9XG5cbiAgdGltZXMgKHRoYXQpIHtcbiAgICByZXR1cm4gbmV3IExpbkV4cHIodGhpcy5hICogdGhhdCwgdGhpcy5iICogdGhhdClcbiAgfVxuXG4gIHN0YXRpYyBzb2x2ZSAoZXhwcjEsIGV4cHIyKSB7XG4gICAgLy8gc29sdmVzIHRoZSB0d28gZXhwcmVzc2lvbnMgc2V0IGVxdWFsIHRvIGVhY2ggb3RoZXJcbiAgICByZXR1cm4gKGV4cHIyLmIgLSBleHByMS5iKSAvIChleHByMS5hIC0gZXhwcjIuYSlcbiAgfVxufVxuIiwiaW1wb3J0IExpbkV4cHIgZnJvbSAnTGluRXhwcidcblxuLyoqIEdpdmVuIGEgc2V0IG9mIGV4cHJlc3Npb25zLCBzZXQgdGhlaXIgc3VtICAqL1xuXG5leHBvcnQgZnVuY3Rpb24gc29sdmVBbmdsZXMgKGV4cHJlc3Npb25zOiBMaW5FeHByW10sIGFuZ2xlU3VtOiBudW1iZXIpOiB7IHg6IG51bWJlcjsgYW5nbGVzOiBudW1iZXJbXTsgfSB7XG4gIGNvbnN0IGV4cHJlc3Npb25TdW0gPSBleHByZXNzaW9ucy5yZWR1Y2UoKGV4cDEsIGV4cDIpID0+IGV4cDEuYWRkKGV4cDIpKVxuICBjb25zdCB4ID0gTGluRXhwci5zb2x2ZShleHByZXNzaW9uU3VtLCBuZXcgTGluRXhwcigwLCBhbmdsZVN1bSkpXG5cbiAgY29uc3QgYW5nbGVzIDogbnVtYmVyW10gPSBbXVxuICBleHByZXNzaW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChleHByKSB7XG4gICAgY29uc3QgYW5nbGUgPSBleHByLmV2YWwoeClcbiAgICBpZiAoYW5nbGUgPD0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCduZWdhdGl2ZSBhbmdsZScpXG4gICAgfSBlbHNlIHtcbiAgICAgIGFuZ2xlcy5wdXNoKGV4cHIuZXZhbCh4KSlcbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuICh7IHg6IHgsIGFuZ2xlczogYW5nbGVzIH0pXG59XG4iLCJpbXBvcnQgTGluRXhwciBmcm9tICdMaW5FeHByJ1xuaW1wb3J0IHsgT3B0aW9uc1NwZWMgfSBmcm9tICdPcHRpb25zU3BlYydcbmltcG9ydCB7IHJhbmRCZXR3ZWVuLCByYW5kRWxlbSwgcmFuZE11bHRCZXR3ZWVuLCBzaHVmZmxlLCB3ZWFrSW5jbHVkZXMgfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgeyBBbGdlYnJhT3B0aW9ucyB9IGZyb20gJy4vQWxnZWJyYU9wdGlvbnMnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzRGF0YSB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0RhdGEnXG5pbXBvcnQgeyBzb2x2ZUFuZ2xlcyB9IGZyb20gJy4vc29sdmVBbmdsZXMnXG5cbmV4cG9ydCB0eXBlIEV4cHJlc3Npb25UeXBlID0gJ2FkZCcgfCAnbXVsdGlwbHknIHwgJ21peGVkJ1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGltcGxlbWVudHMgTWlzc2luZ0FuZ2xlc0RhdGEge1xuICAgIGFuZ2xlczogbnVtYmVyW11cbiAgICBtaXNzaW5nOiBib29sZWFuW11cbiAgICBhbmdsZVN1bTogbnVtYmVyXG4gICAgYW5nbGVMYWJlbHM6IHN0cmluZ1tdXG4gICAgeDogbnVtYmVyIC8vXG5cbiAgICBjb25zdHJ1Y3RvciAoYW5nbGVzOiBudW1iZXJbXSwgbWlzc2luZzogYm9vbGVhbltdLCBhbmdsZVN1bTogbnVtYmVyLCBhbmdsZUxhYmVsczogc3RyaW5nW10sIHg6IG51bWJlcikge1xuICAgICAgdGhpcy5hbmdsZXMgPSBhbmdsZXNcbiAgICAgIHRoaXMuYW5nbGVTdW0gPSBhbmdsZVN1bVxuICAgICAgdGhpcy5hbmdsZUxhYmVscyA9IGFuZ2xlTGFiZWxzXG4gICAgICB0aGlzLnggPSB4XG4gICAgICB0aGlzLm1pc3NpbmcgPSBtaXNzaW5nXG4gICAgfVxuXG4gICAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogQWxnZWJyYU9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIHtcbiAgICAgIC8vIGNhbGN1bGF0ZWQgZGVmYXVsdHMgaWYgbmVjZXNzYXJ5XG4gICAgICBvcHRpb25zLm1heENvbnN0YW50ID0gb3B0aW9ucy5tYXhDb25zdGFudCB8fCBvcHRpb25zLmFuZ2xlU3VtISAvIDIgLy8gZ3VhcmFudGVlZCBub24tbnVsbCBmcm9tIGFib3ZlXG4gICAgICBvcHRpb25zLm1heFhWYWx1ZSA9IG9wdGlvbnMubWF4WFZhbHVlIHx8IG9wdGlvbnMuYW5nbGVTdW0hIC8gNFxuXG4gICAgICAvLyBSYW5kb21pc2Uvc2V0IHVwIG1haW4gZmVhdHVyZXNcbiAgICAgIGNvbnN0IG4gOiBudW1iZXIgPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbk4sIG9wdGlvbnMubWF4TilcblxuICAgICAgY29uc3QgdHlwZSA6IEV4cHJlc3Npb25UeXBlID0gcmFuZEVsZW0ob3B0aW9ucy5leHByZXNzaW9uVHlwZXMhKSAvLyBndWFyYW50ZWVkIG5vbi1udWxsIGZyb20gZGVmYXVsIGFzc2lnbm1lbnRcblxuICAgICAgLy8gR2VuZXJhdGUgZXhwcmVzc2lvbnMvYW5nbGVzXG4gICAgICBsZXQgZXhwcmVzc2lvbnMgOiBMaW5FeHByW11cbiAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlICdtaXhlZCc6XG4gICAgICAgICAgZXhwcmVzc2lvbnMgPSBtYWtlTWl4ZWRFeHByZXNzaW9ucyhuLCBvcHRpb25zIGFzIFJlcXVpcmVkPEFsZ2VicmFPcHRpb25zPilcbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICdtdWx0aXBseSc6XG4gICAgICAgICAgZXhwcmVzc2lvbnMgPSBtYWtlTXVsdGlwbGljYXRpb25FeHByZXNzaW9ucyhuLCBvcHRpb25zIGFzIFJlcXVpcmVkPEFsZ2VicmFPcHRpb25zPilcbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICdhZGQnOlxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGV4cHJlc3Npb25zID0gbWFrZUFkZEV4cHJlc3Npb25zKG4sIG9wdGlvbnMgYXMgUmVxdWlyZWQ8QWxnZWJyYU9wdGlvbnM+KVxuICAgICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBleHByZXNzaW9ucyA9IHNodWZmbGUoZXhwcmVzc2lvbnMpXG5cbiAgICAgIC8vIFNvbHZlIGZvciB4IGFuZCBhbmdsZXNcbiAgICAgIGNvbnN0IHsgeCwgYW5nbGVzIH0gOiB7eDpudW1iZXIsIGFuZ2xlczogbnVtYmVyW119ID0gc29sdmVBbmdsZXMoZXhwcmVzc2lvbnMsIG9wdGlvbnMuYW5nbGVTdW0hKSAvLyBub24tbnVsbCBmcm9tIGRlZmF1bHQgYXNzaWduZW1lbnRcblxuICAgICAgLy8gbGFiZWxzIGFyZSBqdXN0IGV4cHJlc3Npb25zIGFzIHN0cmluZ3NcbiAgICAgIGNvbnN0IGxhYmVscyA9IGV4cHJlc3Npb25zLm1hcChlID0+IGAke2UudG9TdHJpbmdQKCl9XlxcXFxjaXJjYClcblxuICAgICAgLy8gbWlzc2luZyB2YWx1ZXMgYXJlIHRoZSBvbmVzIHdoaWNoIGFyZW4ndCBjb25zdGFudFxuICAgICAgY29uc3QgbWlzc2luZyA9IGV4cHJlc3Npb25zLm1hcChlID0+ICFlLmlzQ29uc3RhbnQoKSlcblxuICAgICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEoYW5nbGVzLCBtaXNzaW5nLCBvcHRpb25zLmFuZ2xlU3VtISwgbGFiZWxzLCB4KVxuICAgIH1cblxuICAgIC8vIG1ha2VzIHR5cGVzY3JpcHQgc2h1dCB1cCwgbWFrZXMgZXNsaW50IG5vaXN5XG4gICAgaW5pdExhYmVscyAoKSA6IHZvaWQge30gIC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbn1cblxuZnVuY3Rpb24gbWFrZU1peGVkRXhwcmVzc2lvbnMgKG46IG51bWJlciwgb3B0aW9uczogUmVxdWlyZWQ8QWxnZWJyYU9wdGlvbnM+KSA6IExpbkV4cHJbXSB7XG4gIGNvbnN0IGV4cHJlc3Npb25zOiBMaW5FeHByW10gPSBbXVxuICBjb25zdCB4ID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5YVmFsdWUsIG9wdGlvbnMubWF4WFZhbHVlKVxuICBsZXQgbGVmdCA9IG9wdGlvbnMuYW5nbGVTdW1cbiAgbGV0IGFsbGNvbnN0YW50ID0gdHJ1ZVxuICBmb3IgKGxldCBpID0gMDsgaSA8IG4gLSAxOyBpKyspIHtcbiAgICBjb25zdCBhID0gcmFuZEJldHdlZW4oMSwgb3B0aW9ucy5tYXhDb2VmZmljaWVudClcbiAgICBsZWZ0IC09IGEgKiB4XG4gICAgY29uc3QgbWF4YiA9IE1hdGgubWluKGxlZnQgLSBvcHRpb25zLm1pbkFuZ2xlICogKG4gLSBpIC0gMSksIG9wdGlvbnMubWF4Q29uc3RhbnQpXG4gICAgY29uc3QgbWluYiA9IG9wdGlvbnMubWluQW5nbGUgLSBhICogeFxuICAgIGNvbnN0IGIgPSByYW5kQmV0d2VlbihtaW5iLCBtYXhiKVxuICAgIGlmIChhICE9PSAwKSB7IGFsbGNvbnN0YW50ID0gZmFsc2UgfVxuICAgIGxlZnQgLT0gYlxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoYSwgYikpXG4gIH1cbiAgY29uc3QgbGFzdE1pblhDb2VmZiA9IGFsbGNvbnN0YW50ID8gMSA6IG9wdGlvbnMubWluQ29lZmZpY2llbnRcbiAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKGxhc3RNaW5YQ29lZmYsIG9wdGlvbnMubWF4Q29lZmZpY2llbnQpXG4gIGNvbnN0IGIgPSBsZWZ0IC0gYSAqIHhcbiAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihhLCBiKSlcblxuICByZXR1cm4gZXhwcmVzc2lvbnNcbn1cblxuZnVuY3Rpb24gbWFrZUFkZEV4cHJlc3Npb25zIChuOiBudW1iZXIsIG9wdGlvbnM6IFJlcXVpcmVkPEFsZ2VicmFPcHRpb25zPikgOiBMaW5FeHByW10ge1xuICBjb25zdCBleHByZXNzaW9uczogTGluRXhwcltdID0gW11cbiAgY29uc3QgYW5nbGVzOiBudW1iZXJbXSA9IFtdXG4gIGNvbnN0IGNvbnN0YW50cyA9IChvcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPT09IHRydWUgfHwgd2Vha0luY2x1ZGVzKG9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cywgJ2FkZCcpKVxuICBpZiAobiA9PT0gMiAmJiBvcHRpb25zLmVuc3VyZVggJiYgY29uc3RhbnRzKSBuID0gM1xuXG4gIGNvbnN0IHggPSByYW5kQmV0d2VlbihvcHRpb25zLm1pblhWYWx1ZSwgb3B0aW9ucy5tYXhYVmFsdWUpXG4gIGxldCBsZWZ0ID0gb3B0aW9ucy5hbmdsZVN1bVxuICBsZXQgYW5nbGVzTGVmdCA9IG5cblxuICAvLyBmaXJzdCBkbyB0aGUgZXhwcmVzc2lvbnMgZW5zdXJlZCBieSBlbnN1cmVfeCBhbmQgY29uc3RhbnRzXG4gIGlmIChvcHRpb25zLmVuc3VyZVgpIHtcbiAgICBhbmdsZXNMZWZ0LS1cbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKVxuICAgIGFuZ2xlcy5wdXNoKHgpXG4gICAgbGVmdCAtPSB4XG4gIH1cblxuICBpZiAoY29uc3RhbnRzKSB7XG4gICAgYW5nbGVzTGVmdC0tXG4gICAgY29uc3QgYyA9IHJhbmRCZXR3ZWVuKFxuICAgICAgb3B0aW9ucy5taW5BbmdsZSxcbiAgICAgIGxlZnQgLSBvcHRpb25zLm1pbkFuZ2xlICogYW5nbGVzTGVmdFxuICAgIClcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDAsIGMpKVxuICAgIGFuZ2xlcy5wdXNoKGMpXG4gICAgbGVmdCAtPSBjXG4gIH1cblxuICAvLyBtaWRkbGUgYW5nbGVzXG4gIHdoaWxlIChhbmdsZXNMZWZ0ID4gMSkge1xuICAgIC8vIGFkZCAneCtiJyBhcyBhbiBleHByZXNzaW9uLiBNYWtlIHN1cmUgYiBnaXZlcyBzcGFjZVxuICAgIGFuZ2xlc0xlZnQtLVxuICAgIGxlZnQgLT0geFxuICAgIGNvbnN0IG1heGIgPSBNYXRoLm1pbihcbiAgICAgIGxlZnQgLSBvcHRpb25zLm1pbkFuZ2xlICogYW5nbGVzTGVmdCxcbiAgICAgIG9wdGlvbnMubWF4Q29uc3RhbnRcbiAgICApXG4gICAgY29uc3QgbWluYiA9IE1hdGgubWF4KFxuICAgICAgb3B0aW9ucy5taW5BbmdsZSAtIHgsXG4gICAgICAtb3B0aW9ucy5tYXhDb25zdGFudFxuICAgIClcbiAgICBjb25zdCBiID0gcmFuZEJldHdlZW4obWluYiwgbWF4YilcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIGIpKVxuICAgIGFuZ2xlcy5wdXNoKHggKyBiKVxuICAgIGxlZnQgLT0gYlxuICB9XG5cbiAgLy8gbGFzdCBhbmdsZVxuICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIGxlZnQgLSB4KSlcbiAgYW5nbGVzLnB1c2gobGVmdClcblxuICByZXR1cm4gZXhwcmVzc2lvbnNcbn1cblxuZnVuY3Rpb24gbWFrZU11bHRpcGxpY2F0aW9uRXhwcmVzc2lvbnMgKG46IG51bWJlciwgb3B0aW9uczogQWxnZWJyYU9wdGlvbnMpIDogTGluRXhwcltdIHtcbiAgY29uc3QgZXhwcmVzc2lvbnMgOiBMaW5FeHByW10gPSBbXVxuXG4gIGNvbnN0IGNvbnN0YW50cyA6IGJvb2xlYW4gPSAob3B0aW9ucy5pbmNsdWRlQ29uc3RhbnRzID09PSB0cnVlIHx8IHdlYWtJbmNsdWRlcyhvcHRpb25zLmluY2x1ZGVDb25zdGFudHMsICdtdWx0JykpXG4gIGlmIChuID09PSAyICYmIG9wdGlvbnMuZW5zdXJlWCAmJiBjb25zdGFudHMpIG4gPSAzIC8vIG5lZWQgYXQgbGVhc3QgMyBhbmdsZXMgZm9yIHRoaXMgdG8gbWFrZSBzZW5zZVxuXG4gIC8vIGNob29zZSBhIHRvdGFsIG9mIGNvZWZmaWNpZW50c1xuICAvLyBwaWNrIHggYmFzZWQgb24gdGhhdFxuICBsZXQgYW5nbGVzbGVmdCA9IG5cbiAgY29uc3QgdG90YWxDb2VmZiA9IGNvbnN0YW50c1xuICAgID8gcmFuZEJldHdlZW4obiwgKG9wdGlvbnMuYW5nbGVTdW0gLSBvcHRpb25zLm1pbkFuZ2xlKSAvIG9wdGlvbnMubWluQW5nbGUsIE1hdGgucmFuZG9tKSAvLyBpZiBpdCdzIHRvbyBiaWcsIGFuZ2xlcyBnZXQgdG9vIHNtYWxsXG4gICAgOiByYW5kRWxlbShbMywgNCwgNSwgNiwgOCwgOSwgMTBdLmZpbHRlcih4ID0+IHggPj0gbiksIE1hdGgucmFuZG9tKVxuICBsZXQgY29lZmZsZWZ0ID0gdG90YWxDb2VmZlxuXG4gIC8vIGZpcnN0IDAvMS8yXG4gIGlmIChjb25zdGFudHMpIHtcbiAgICAvLyByZWR1Y2UgdG8gbWFrZSB3aGF0J3MgbGVmdCBhIG11bHRpcGxlIG9mIHRvdGFsX2NvZWZmXG4gICAgYW5nbGVzbGVmdC0tXG4gICAgY29uc3QgbmV3bGVmdCA9IHJhbmRNdWx0QmV0d2Vlbih0b3RhbENvZWZmICogb3B0aW9ucy5taW5BbmdsZSwgb3B0aW9ucy5hbmdsZVN1bSAtIG9wdGlvbnMubWluQW5nbGUsIHRvdGFsQ29lZmYpXG4gICAgY29uc3QgYyA9IG9wdGlvbnMuYW5nbGVTdW0gLSBuZXdsZWZ0XG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigwLCBjKSlcbiAgfVxuXG4gIC8vIERvbid0IHVzZSB4IGhlcmUsIGJ1dDpcbiAgLy8geCA9IGxlZnQgLyB0b3RhbENvZWZmXG5cbiAgaWYgKG9wdGlvbnMuZW5zdXJlWCkge1xuICAgIGFuZ2xlc2xlZnQtLVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgMCkpXG4gICAgY29lZmZsZWZ0IC09IDFcbiAgfVxuXG4gIC8vIG1pZGRsZVxuICB3aGlsZSAoYW5nbGVzbGVmdCA+IDEpIHtcbiAgICBhbmdsZXNsZWZ0LS1cbiAgICBjb25zdCBtaW5hID0gMVxuICAgIGNvbnN0IG1heGEgPSBjb2VmZmxlZnQgLSBhbmdsZXNsZWZ0IC8vIGxlYXZlIGVub3VnaCBmb3Igb3RoZXJzIFRPRE86IGFkZCBtYXhfY29lZmZcbiAgICBjb25zdCBhID0gcmFuZEJldHdlZW4obWluYSwgbWF4YSlcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKGEsIDApKVxuICAgIGNvZWZmbGVmdCAtPSBhXG4gIH1cblxuICAvLyBsYXN0XG4gIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoY29lZmZsZWZ0LCAwKSlcbiAgcmV0dXJuIGV4cHJlc3Npb25zXG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBMYWJlbCB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNBcm91bmRWaWV3J1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzVmlld09wdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlldyBleHRlbmRzIE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IHtcbiAgLy8gTyA6IFBvaW50ICAgICAgSW5oZXJpdGVkIGZyb20gTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXdcbiAgLy8gQTogUG9pbnQgICAgICAgICB8XG4gIC8vIEM6IFBvaW50W10gICAgICAgfFxuICAvLyByb3RhdGlvbjogbnVtYmVyIFZcblxuICAgIC8vIGxhYmVsczogTGFiZWxbXSAgICAgICAgICAgIEluaGVyaXRlZCBmcm9tIEdyYXBoaWNRVmlld1xuICAgIC8vIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQgICAgICB8XG4gICAgLy8gRE9NOiBIVE1MRWxlbWVudCAgICAgICAgICAgICAgIHxcbiAgICAvLyB3aWR0aDogbnVtYmVyICAgICAgICAgICAgICAgICAgfFxuICAgIC8vIGhlaWdodDogbnVtYmVyICAgICAgICAgICAgICAgICBWXG4gICAgZGF0YSE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSAvLyBpbml0aWFsaXNlZCBieSBzdXBlcigpXG5cbiAgICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLCBvcHRpb25zOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIHtcbiAgICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIHN1cGVyIGNvbnN0cnVjdG9yIGRvZXMgcmVhbCB3b3JrXG4gICAgICBjb25zdCBzb2x1dGlvbkxhYmVsOiBQYXJ0aWFsPExhYmVsPiA9IHtcbiAgICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIHRoaXMuaGVpZ2h0IC0gMTApLFxuICAgICAgICB0ZXh0cTogJycsXG4gICAgICAgIHRleHRhOiBgeCA9ICR7dGhpcy5kYXRhLnh9XlxcXFxjaXJjYCxcbiAgICAgICAgc3R5bGVxOiAnaGlkZGVuJyxcbiAgICAgICAgc3R5bGVhOiAnZXh0cmEtYW5zd2VyJ1xuICAgICAgfVxuICAgICAgc29sdXRpb25MYWJlbC5zdHlsZSA9IHNvbHV0aW9uTGFiZWwuc3R5bGVxXG4gICAgICBzb2x1dGlvbkxhYmVsLnRleHQgPSBzb2x1dGlvbkxhYmVsLnRleHRxXG5cbiAgICAgIHRoaXMubGFiZWxzLnB1c2goc29sdXRpb25MYWJlbCBhcyBMYWJlbClcbiAgICB9XG59XG4iLCIvKiogTWlzc2luZyBhbmdsZXMgYXJvdW5kIGEgcG9pbnQgb3Igb24gYSBzdHJhaWdodCBsaW5lLCB1c2luZyBhbGdlYnJhaWMgZXhwcmVzc2lvbnMgKi9cblxuaW1wb3J0IHsgT3B0aW9uc1NwZWMgfSBmcm9tICdPcHRpb25zU3BlYydcbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgeyBBbGdlYnJhT3B0aW9ucyB9IGZyb20gJy4vQWxnZWJyYU9wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGEhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgLy8gaW5pdGlhbGlzZWQgaW4gc3VwZXIoKVxuICB2aWV3ITogTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogUGFydGlhbDxBbGdlYnJhT3B0aW9ucz4sIHZpZXdPcHRpb25zOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IEFsZ2VicmFPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAxNSxcbiAgICAgIG1pbk46IDIsXG4gICAgICBtYXhOOiA0LFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlLFxuICAgICAgZXhwcmVzc2lvblR5cGVzOiBbJ2FkZCcsICdtdWx0aXBseScsICdtaXhlZCddLFxuICAgICAgZW5zdXJlWDogdHJ1ZSxcbiAgICAgIGluY2x1ZGVDb25zdGFudHM6IHRydWUsXG4gICAgICBtaW5Db2VmZmljaWVudDogMSxcbiAgICAgIG1heENvZWZmaWNpZW50OiA0LFxuICAgICAgbWluWFZhbHVlOiAxNVxuICAgIH1cbiAgICBjb25zdCBzZXR0aW5nczogQWxnZWJyYU9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEucmFuZG9tKHNldHRpbmdzKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3KGRhdGEsIHZpZXdPcHRpb25zKSBcblxuICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG5cbiAgc3RhdGljIGdldCBvcHRpb25zU3BlYyAoKSA6IE9wdGlvbnNTcGVjIHtcbiAgICByZXR1cm4gW1xuICAgICAge1xuICAgICAgICBpZDogJ2V4cHJlc3Npb25UeXBlcycsXG4gICAgICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICAgICAgdGl0bGU6ICdUeXBlcyBvZiBleHByZXNzaW9uJyxcbiAgICAgICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgICAgIHsgdGl0bGU6ICc8ZW0+YTwvZW0+KzxlbT54PC9lbT4nLCBpZDogJ2FkZCcgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnPGVtPmF4PC9lbT4nLCBpZDogJ211bHRpcGx5JyB9LFxuICAgICAgICAgIHsgdGl0bGU6ICdtaXhlZCcsIGlkOiAnbWl4ZWQnIH1cbiAgICAgICAgXSxcbiAgICAgICAgZGVmYXVsdDogWydhZGQnLCAnbXVsdGlwbHknLCAnbWl4ZWQnXVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgaWQ6ICdlbnN1cmVYJyxcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJ0Vuc3VyZSBvbmUgYW5nbGUgaXMgPGVtPng8L2VtPicsXG4gICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiAnaW5jbHVkZUNvbnN0YW50cycsXG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgdGl0bGU6ICdFbnN1cmUgYSBjb25zdGFudCBhbmdsZScsXG4gICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgIH1cbiAgICBdXG4gIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3J1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldyBleHRlbmRzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcge1xuICBkYXRhITogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIC8vIGluaXRpYWxpc2VkIGluIHN1cGVyLnN1cGVyXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEsIG9wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucylcblxuICAgIGNvbnN0IHNvbHV0aW9uTGFiZWw6IFBhcnRpYWw8TGFiZWw+ID0ge1xuICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIHRoaXMuaGVpZ2h0IC0gMTApLFxuICAgICAgdGV4dHE6ICcnLFxuICAgICAgdGV4dGE6IGB4ID0gJHt0aGlzLmRhdGEueH1eXFxcXGNpcmNgLFxuICAgICAgc3R5bGVxOiAnaGlkZGVuJyxcbiAgICAgIHN0eWxlYTogJ2V4dHJhLWFuc3dlcidcbiAgICB9XG4gICAgc29sdXRpb25MYWJlbC5zdHlsZSA9IHNvbHV0aW9uTGFiZWwuc3R5bGVxXG4gICAgc29sdXRpb25MYWJlbC50ZXh0ID0gc29sdXRpb25MYWJlbC50ZXh0cVxuXG4gICAgdGhpcy5sYWJlbHMucHVzaChzb2x1dGlvbkxhYmVsIGFzIExhYmVsKVxuICB9XG59XG4iLCJpbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tICcuL0FsZ2VicmFPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFWaWV3J1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3J1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YVxuICB2aWV3ITogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlld1xuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFBhcnRpYWw8QWxnZWJyYU9wdGlvbnM+LCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEge1xuICAgIGNvbnN0IG9wdGlvbnNPdmVycmlkZSA6IFBhcnRpYWw8QWxnZWJyYU9wdGlvbnM+ID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbk46IDMsXG4gICAgICBtYXhOOiAzLFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlXG4gICAgfVxuICAgIGNvbnN0IGRlZmF1bHRzIDogQWxnZWJyYU9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDMsXG4gICAgICByZXBlYXRlZDogZmFsc2UsXG4gICAgICBtaW5BbmdsZTogMjUsXG4gICAgICBleHByZXNzaW9uVHlwZXM6IFsnYWRkJywgJ211bHRpcGx5JywgJ21peGVkJ10sXG4gICAgICBlbnN1cmVYOiB0cnVlLFxuICAgICAgaW5jbHVkZUNvbnN0YW50czogdHJ1ZSxcbiAgICAgIG1pbkNvZWZmaWNpZW50OiAxLFxuICAgICAgbWF4Q29lZmZpY2llbnQ6IDQsXG4gICAgICBtaW5YVmFsdWU6IDE1XG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzOiBBbGdlYnJhT3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zLCBvcHRpb25zT3ZlcnJpZGUpXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLnJhbmRvbShzZXR0aW5ncylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFWaWV3KGRhdGEsIHZpZXdPcHRpb25zKVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBMYWJlbCB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3J1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXcgZXh0ZW5kcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IHtcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIC8vIGluaXRpYWxpc2VkIGluIHN1cGVyXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSwgb3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKVxuICAgIHN1cGVyLnNjYWxlVG9GaXQodGhpcy53aWR0aCwgdGhpcy5oZWlnaHQsIDQwKVxuICAgIHN1cGVyLnRyYW5zbGF0ZSgwLCAtMzApXG5cbiAgICBjb25zdCBpbnN0cnVjdGlvbkxhYmVsOiBMYWJlbCA9IHtcbiAgICAgIHRleHRxOiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICB0ZXh0YTogdGhpcy5kYXRhLmluc3RydWN0aW9ucy5qb2luKCdcXFxcXFxcXCcpLFxuICAgICAgdGV4dDogdGhpcy5kYXRhLmluc3RydWN0aW9ucy5qb2luKCdcXFxcXFxcXCcpLFxuICAgICAgc3R5bGVxOiAnZXh0cmEtaW5mbycsXG4gICAgICBzdHlsZWE6ICdleHRyYS1pbmZvJyxcbiAgICAgIHN0eWxlOiAnZXh0cmEtaW5mbycsXG4gICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdGhpcy5oZWlnaHQgLSAxMClcbiAgICB9XG4gICAgdGhpcy5sYWJlbHMucHVzaChpbnN0cnVjdGlvbkxhYmVsKVxuICB9XG59XG4iLCJpbXBvcnQgTGluRXhwciBmcm9tICdMaW5FeHByJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4sIHJhbmRFbGVtLCByYW5kTXVsdEJldHdlZW4gfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUURhdGEgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEnXG5pbXBvcnQgeyBzb2x2ZUFuZ2xlcyB9IGZyb20gJy4vc29sdmVBbmdsZXMnXG5pbXBvcnQgeyBXb3JkZWRPcHRpb25zIH0gZnJvbSAnLi9Xb3JkZWRPcHRpb25zJ1xuXG5leHBvcnQgdHlwZSBXb3JkZWRUeXBlID0gJ2FkZCcgfCAnbXVsdGlwbHknIHwgJ3JhdGlvJyB8ICdwZXJjZW50J1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSBpbXBsZW1lbnRzIEdyYXBoaWNRRGF0YSB7XG4gIGFuZ2xlczogbnVtYmVyW11cbiAgbWlzc2luZzogYm9vbGVhbltdXG4gIGFuZ2xlU3VtOiBudW1iZXJcbiAgYW5nbGVMYWJlbHM6IHN0cmluZ1tdXG4gIGluc3RydWN0aW9uczogc3RyaW5nW10gLy8gVGhlICdpbnN0cnVjdGlvbnMnIGdpdmVuXG5cbiAgY29uc3RydWN0b3IgKGFuZ2xlczogbnVtYmVyW10sIG1pc3Npbmc6IGJvb2xlYW5bXSwgYW5nbGVTdW06IG51bWJlciwgYW5nbGVMYWJlbHM6IHN0cmluZ1tdLCBpbnN0cnVjdGlvbnM6IHN0cmluZ1tdKSB7XG4gICAgdGhpcy5hbmdsZXMgPSBhbmdsZXNcbiAgICB0aGlzLm1pc3NpbmcgPSBtaXNzaW5nXG4gICAgdGhpcy5hbmdsZVN1bSA9IGFuZ2xlU3VtXG4gICAgdGhpcy5hbmdsZUxhYmVscyA9IGFuZ2xlTGFiZWxzXG4gICAgdGhpcy5pbnN0cnVjdGlvbnMgPSBpbnN0cnVjdGlvbnNcbiAgICB0aGlzLmluc3RydWN0aW9ucyA9IGluc3RydWN0aW9uc1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9ucyA6IFdvcmRlZE9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEge1xuICAgIGNvbnN0IG4gPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbk4sIG9wdGlvbnMubWF4TilcbiAgICBjb25zdCBhbmdsZUxhYmVsczogc3RyaW5nW10gPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBhbmdsZUxhYmVsc1tpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKSAvLyA2NSA9ICdBJ1xuICAgIH1cbiAgICBsZXQgZXhwcmVzc2lvbnM6IExpbkV4cHJbXSA9IFtdXG4gICAgbGV0IGluc3RydWN0aW9uczogc3RyaW5nW10gPSBbXVxuXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCAwKSlcblxuICAgIC8vIExvb3AgdGlsIHdlIGdldCBvbmUgdGhhdCB3b3Jrc1xuICAgIC8vIFByb2JhYmx5IHJlYWxseSBpbmVmZmljaWVudCEhXG5cbiAgICBsZXQgc3VjY2VzcyA9IGZhbHNlXG4gICAgbGV0IGF0dGVtcHRjb3VudCA9IDBcbiAgICB3aGlsZSAoIXN1Y2Nlc3MpIHtcbiAgICAgIGlmIChhdHRlbXB0Y291bnQgPiAyMCkge1xuICAgICAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKVxuICAgICAgICBjb25zb2xlLmxvZygnR2F2ZSB1cCBhZnRlciAnICsgYXR0ZW1wdGNvdW50ICsgJyBhdHRlbXB0cycpXG4gICAgICAgIHN1Y2Nlc3MgPSB0cnVlXG4gICAgICB9XG4gICAgICBmb3IgKGxldCBpID0gMTsgaSA8IG47IGkrKykge1xuICAgICAgICBjb25zdCB0eXBlID0gcmFuZEVsZW0ob3B0aW9ucy50eXBlcylcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgY2FzZSAnYWRkJzoge1xuICAgICAgICAgICAgY29uc3QgYWRkZW5kID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5BZGRlbmQsIG9wdGlvbnMubWF4QWRkZW5kKVxuICAgICAgICAgICAgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uc1tpIC0gMV0uYWRkKGFkZGVuZCkpXG4gICAgICAgICAgICBpbnN0cnVjdGlvbnMucHVzaChgXFxcXHRleHR7QW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpfSQgaXMgJHtjb21wYXJhdG9yKGFkZGVuZCwgJysnKX0gYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NCArIGkpfSR9YClcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ211bHRpcGx5Jzoge1xuICAgICAgICAgICAgY29uc3QgbXVsdGlwbGllciA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTXVsdGlwbGllciwgb3B0aW9ucy5tYXhNdWx0aXBsaWVyKVxuICAgICAgICAgICAgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uc1tpIC0gMV0udGltZXMobXVsdGlwbGllcikpXG4gICAgICAgICAgICBpbnN0cnVjdGlvbnMucHVzaChgXFxcXHRleHR7QW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpfSQgaXMgJHtjb21wYXJhdG9yKG11bHRpcGxpZXIsICcqJyl9IGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjQgKyBpKX0kfWApXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlICdwZXJjZW50Jzoge1xuICAgICAgICAgICAgY29uc3QgcGVyY2VudGFnZSA9IHJhbmRNdWx0QmV0d2Vlbig1LCAxMDAsIDUpXG4gICAgICAgICAgICBjb25zdCBpbmNyZWFzZSA9IE1hdGgucmFuZG9tKCkgPCAwLjVcbiAgICAgICAgICAgIGNvbnN0IG11bHRpcGxpZXIgPSBpbmNyZWFzZSA/IDEgKyBwZXJjZW50YWdlIC8gMTAwIDogMSAtIHBlcmNlbnRhZ2UgLyAxMDBcbiAgICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2goZXhwcmVzc2lvbnNbaSAtIDFdLnRpbWVzKG11bHRpcGxpZXIpKVxuICAgICAgICAgICAgaW5zdHJ1Y3Rpb25zLnB1c2goXG4gICAgICAgICAgICAgIGBcXFxcdGV4dHtBbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSl9JCBpcyAkJHtwZXJjZW50YWdlfVxcXFwlJCAke2luY3JlYXNlID8gJ2JpZ2dlcicgOiAnc21hbGxlcid9IHRoYW4gYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NCArIGkpfSR9YClcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ3JhdGlvJzoge1xuICAgICAgICAgICAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKDEsIDEwKVxuICAgICAgICAgICAgY29uc3QgYiA9IHJhbmRCZXR3ZWVuKDEsIDEwKVxuICAgICAgICAgICAgY29uc3QgbXVsdGlwbGllciA9IGIgLyBhXG4gICAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb25zW2kgLSAxXS50aW1lcyhtdWx0aXBsaWVyKSlcbiAgICAgICAgICAgIGluc3RydWN0aW9ucy5wdXNoKFxuICAgICAgICAgICAgICBgXFxcXHRleHR7VGhlIHJhdGlvIG9mIGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjQgKyBpKX0kIHRvIGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKX0kIGlzICQke2F9OiR7Yn0kfWBcbiAgICAgICAgICAgIClcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGNoZWNrIGl0IG1ha2VzIHNlbnNlXG4gICAgICBzdWNjZXNzID0gdHJ1ZVxuICAgICAgY29uc3QgZXhwcmVzc2lvbnN1bSA9IGV4cHJlc3Npb25zLnJlZHVjZSgoZXhwMSwgZXhwMikgPT4gZXhwMS5hZGQoZXhwMikpXG4gICAgICBjb25zdCB4ID0gTGluRXhwci5zb2x2ZShleHByZXNzaW9uc3VtLCBuZXcgTGluRXhwcigwLCBvcHRpb25zLmFuZ2xlU3VtKSlcblxuICAgICAgZXhwcmVzc2lvbnMuZm9yRWFjaChmdW5jdGlvbiAoZXhwcikge1xuICAgICAgICBpZiAoIXN1Y2Nlc3MgfHwgZXhwci5ldmFsKHgpIDwgb3B0aW9ucy5taW5BbmdsZSkge1xuICAgICAgICAgIHN1Y2Nlc3MgPSBmYWxzZVxuICAgICAgICAgIGluc3RydWN0aW9ucyA9IFtdXG4gICAgICAgICAgZXhwcmVzc2lvbnMgPSBbZXhwcmVzc2lvbnNbMF1dXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIGF0dGVtcHRjb3VudCsrXG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdBdHRlbXB0czogJyArIGF0dGVtcHRjb3VudClcblxuICAgIGNvbnN0IGFuZ2xlcyA9IHNvbHZlQW5nbGVzKGV4cHJlc3Npb25zLCBvcHRpb25zLmFuZ2xlU3VtKS5hbmdsZXNcbiAgICBjb25zdCBtaXNzaW5nID0gYW5nbGVzLm1hcCgoKSA9PiB0cnVlKVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGFuZ2xlcywgbWlzc2luZywgb3B0aW9ucy5hbmdsZVN1bSwgYW5nbGVMYWJlbHMsIGluc3RydWN0aW9ucylcbiAgfVxuXG4gIC8vIG1ha2VzIHR5cGVzY3JpcHQgc2h1dCB1cCwgbWFrZXMgZXNsaW50IG5vaXN5XG4gIGluaXRMYWJlbHMoKTogdm9pZCB7IH0gIC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZXMgd29yZGVkIHZlcnNpb24gb2YgYW4gb3BlcmF0aW9cbiAqIEBwYXJhbSBudW1iZXIgVGhlIG11bHRpcGxpZXIgb3IgYWRkZW5kXG4gKiBAcGFyYW0gb3BlcmF0b3IgVGhlIG9wZXJhdG9yLCBlLmcgYWRkaW5nICdtb3JlIHRoYW4nLCBvciBtdWx0aXBseWluZyAndGltZXMgbGFyZ2VyIHRoYW4nXG4gKi9cbmZ1bmN0aW9uIGNvbXBhcmF0b3IgKG51bWJlcjogbnVtYmVyLCBvcGVyYXRvcjogJyonfCcrJykge1xuICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgY2FzZSAnKic6XG4gICAgICBzd2l0Y2ggKG51bWJlcikge1xuICAgICAgICBjYXNlIDE6IHJldHVybiAndGhlIHNhbWUgYXMnXG4gICAgICAgIGNhc2UgMjogcmV0dXJuICdkb3VibGUnXG4gICAgICAgIGRlZmF1bHQ6IHJldHVybiBgJCR7bnVtYmVyfSQgdGltZXMgbGFyZ2VyIHRoYW5gXG4gICAgICB9XG4gICAgY2FzZSAnKyc6XG4gICAgICBzd2l0Y2ggKG51bWJlcikge1xuICAgICAgICBjYXNlIDA6IHJldHVybiAndGhlIHNhbWUgYXMnXG4gICAgICAgIGRlZmF1bHQ6IHJldHVybiBgJCR7TWF0aC5hYnMobnVtYmVyKS50b1N0cmluZygpfV5cXFxcY2lyYyQgJHsobnVtYmVyIDwgMCkgPyAnbGVzcyB0aGFuJyA6ICdtb3JlIHRoYW4nfWBcbiAgICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkVmlldydcbmltcG9ydCBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhJ1xuaW1wb3J0IHsgV29yZGVkT3B0aW9ucyB9IGZyb20gJy4vV29yZGVkT3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhXG4gIHZpZXchOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogUGFydGlhbDxXb3JkZWRPcHRpb25zPiwgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEge1xuICAgIGNvbnN0IG9wdGlvbnNPdmVycmlkZSA6IFBhcnRpYWw8V29yZGVkT3B0aW9ucz4gPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDMsXG4gICAgICByZXBlYXRlZDogZmFsc2VcbiAgICB9XG4gICAgY29uc3QgZGVmYXVsdHMgOiBXb3JkZWRPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAyNSxcbiAgICAgIG1pbk46IDMsXG4gICAgICBtYXhOOiAzLFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlLFxuICAgICAgbWluQWRkZW5kOiAtNjAsXG4gICAgICBtYXhBZGRlbmQ6IDYwLFxuICAgICAgbWluTXVsdGlwbGllcjogMSxcbiAgICAgIG1heE11bHRpcGxpZXI6IDUsXG4gICAgICB0eXBlczogWydhZGQnLCAnbXVsdGlwbHknLCAncGVyY2VudCcsICdyYXRpbyddXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzOiBXb3JkZWRPcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMsIG9wdGlvbnNPdmVycmlkZSlcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YS5yYW5kb20oc2V0dGluZ3MpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3KGRhdGEsIHZpZXdPcHRpb25zKVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBMYWJlbCB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldyBleHRlbmRzIE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IHtcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIC8vIGluaXRpYWxpc2VkIGluIGNhbGwgdG8gc3VwZXJcbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLCBvcHRpb25zOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBkb2VzIG1vc3Qgb2YgdGhlIHNldCB1cFxuICAgIHN1cGVyLnRyYW5zbGF0ZSgwLCAtMTUpXG4gICAgY29uc3QgaW5zdHJ1Y3Rpb25MYWJlbCA6IExhYmVsID0ge1xuICAgICAgdGV4dHE6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHRleHRhOiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICB0ZXh0OiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICBzdHlsZXE6ICdleHRyYS1pbmZvJyxcbiAgICAgIHN0eWxlYTogJ2V4dHJhLWluZm8nLFxuICAgICAgc3R5bGU6ICdleHRyYS1pbmZvJyxcbiAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwKVxuICAgIH1cbiAgICB0aGlzLmxhYmVscy5wdXNoKGluc3RydWN0aW9uTGFiZWwpXG4gIH1cbn1cbiIsImltcG9ydCB7IE9wdGlvbnNTcGVjIH0gZnJvbSAnT3B0aW9uc1NwZWMnXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhJ1xuaW1wb3J0IHsgV29yZGVkT3B0aW9ucyB9IGZyb20gJy4vV29yZGVkT3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1dvcmRlZFEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGEhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YVxuICB2aWV3ITogTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXdcblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBQYXJ0aWFsPFdvcmRlZE9wdGlvbnM+LCB2aWV3T3B0aW9uczogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNXb3JkZWRRIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IFdvcmRlZE9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDE1LFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDIsXG4gICAgICByZXBlYXRlZDogZmFsc2UsXG4gICAgICBtaW5BZGRlbmQ6IC05MCxcbiAgICAgIG1heEFkZGVuZDogOTAsXG4gICAgICBtaW5NdWx0aXBsaWVyOiAxLFxuICAgICAgbWF4TXVsdGlwbGllcjogNSxcbiAgICAgIHR5cGVzOiBbJ2FkZCcsICdtdWx0aXBseScsICdwZXJjZW50JywgJ3JhdGlvJ11cbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YS5yYW5kb20oc2V0dGluZ3MpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldyhkYXRhLCB2aWV3T3B0aW9ucylcblxuICAgIHJldHVybiBuZXcgdGhpcyhkYXRhLCB2aWV3KVxuICB9XG5cbiAgc3RhdGljIGdldCBvcHRpb25zU3BlYyAoKTogT3B0aW9uc1NwZWMge1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICAgICAgdGl0bGU6ICdRdWVzdGlvbiB0eXBlcycsXG4gICAgICAgIGlkOiAndHlwZXMnLFxuICAgICAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICAgICAgeyB0aXRsZTogJ01vcmUgdGhhbi9sZXNzIHRoYW4nLCBpZDogJ2FkZCcgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnTXVsdGlwbGVzJywgaWQ6ICdtdWx0aXBseScgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnUGVyY2VudGFnZSBjaGFuZ2UnLCBpZDogJ3BlcmNlbnQnIH0sXG4gICAgICAgICAgeyB0aXRsZTogJ1JhdGlvcycsIGlkOiAncmF0aW8nIH1cbiAgICAgICAgXSxcbiAgICAgICAgZGVmYXVsdDogWydhZGQnLCAnbXVsdGlwbHknXVxuICAgICAgfVxuICAgIF1cbiAgfVxufVxuIiwiLyoqICBDbGFzcyB0byB3cmFwIHZhcmlvdXMgbWlzc2luZyBhbmdsZXMgY2xhc3Nlc1xuICogUmVhZHMgb3B0aW9ucyBhbmQgdGhlbiB3cmFwcyB0aGUgYXBwcm9wcmlhdGUgb2JqZWN0LCBtaXJyb3JpbmcgdGhlIG1haW5cbiAqIHB1YmxpYyBtZXRob2RzXG4gKlxuICogVGhpcyBjbGFzcyBkZWFscyB3aXRoIHRyYW5zbGF0aW5nIGRpZmZpY3VsdHkgaW50byBxdWVzdGlvbiB0eXBlc1xuKi9cblxuaW1wb3J0IHsgT3B0aW9uc1NwZWMgfSBmcm9tICdPcHRpb25zU3BlYydcbmltcG9ydCB7IHJhbmRFbGVtIH0gZnJvbSAndXRpbGl0aWVzJ1xuXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFEgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5cbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUSdcbmltcG9ydCB7IEFsZ2VicmFPcHRpb25zIH0gZnJvbSAnLi9BbGdlYnJhT3B0aW9ucydcblxuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWRRIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZFEnXG5pbXBvcnQgeyBXb3JkZWRPcHRpb25zIH0gZnJvbSAnLi9Xb3JkZWRPcHRpb25zJ1xuXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxudHlwZSBRdWVzdGlvblR5cGUgPSAnYW9zbCcgfCAnYWFhcCcgfCAndHJpYW5nbGUnXG50eXBlIFF1ZXN0aW9uU3ViVHlwZSA9ICdzaW1wbGUnIHwgJ3JlcGVhdGVkJyB8ICdhbGdlYnJhJyB8ICd3b3JkZWQnXG5cbnR5cGUgUXVlc3Rpb25PcHRpb25zID0gTWlzc2luZ0FuZ2xlT3B0aW9ucyAmIEFsZ2VicmFPcHRpb25zICYgV29yZGVkT3B0aW9ucyAvLyBvcHRpb25zIHRvIHBhc3MgdG8gcXVlc3Rpb25zXG5cbi8qKiBUaGUgb3B0aW9ucyBwYXNzZWQgdXNpbmcgb3B0aW9uc1NwZWMgKi9cbmludGVyZmFjZSBXcmFwcGVyT3B0aW9ucyB7XG4gIGRpZmZpY3VsdHk6IG51bWJlcixcbiAgdHlwZXM6IFF1ZXN0aW9uVHlwZVtdLFxuICBjdXN0b206IGJvb2xlYW4sXG4gIG1pbk46IG51bWJlcixcbiAgbWF4TjogbnVtYmVyLFxuICBzaW1wbGU6IGJvb2xlYW4sXG4gIHJlcGVhdGVkOiBib29sZWFuLFxuICBhbGdlYnJhOiBib29sZWFuLFxuICBhbGdlYnJhT3B0aW9uczogQWxnZWJyYU9wdGlvbnNcbiAgd29yZGVkOiBib29sZWFuLFxuICB3b3JkZWRPcHRpb25zOiBXb3JkZWRPcHRpb25zXG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBxdWVzdGlvbjogR3JhcGhpY1FcblxuICBjb25zdHJ1Y3RvciAocXVlc3Rpb246IEdyYXBoaWNRKSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMucXVlc3Rpb24gPSBxdWVzdGlvblxuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogV3JhcHBlck9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1Ege1xuICAgIGlmIChvcHRpb25zLnR5cGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUeXBlcyBsaXN0IG11c3QgYmUgbm9uLWVtcHR5JylcbiAgICB9XG4gICAgY29uc3QgdHlwZSA6IFF1ZXN0aW9uVHlwZSA9IHJhbmRFbGVtKG9wdGlvbnMudHlwZXMpXG5cbiAgICBpZiAoIW9wdGlvbnMuY3VzdG9tKSB7XG4gICAgICByZXR1cm4gTWlzc2luZ0FuZ2xlc1EucmFuZG9tRnJvbURpZmZpY3VsdHkodHlwZSwgb3B0aW9ucy5kaWZmaWN1bHR5KVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjaG9vc2Ugc3VidHlwZVxuICAgICAgY29uc3QgYXZhaWxhYmxlU3VidHlwZXMgOiBRdWVzdGlvblN1YlR5cGVbXSA9IFsnc2ltcGxlJywgJ3JlcGVhdGVkJywgJ2FsZ2VicmEnLCAnd29yZGVkJ11cbiAgICAgIGNvbnN0IHN1YnR5cGVzIDogUXVlc3Rpb25TdWJUeXBlW10gPSBbXVxuICAgICAgYXZhaWxhYmxlU3VidHlwZXMuZm9yRWFjaChzdWJ0eXBlID0+IHtcbiAgICAgICAgaWYgKG9wdGlvbnNbc3VidHlwZV0pIHsgc3VidHlwZXMucHVzaChzdWJ0eXBlKSB9XG4gICAgICB9KVxuICAgICAgY29uc3Qgc3VidHlwZSA6IFF1ZXN0aW9uU3ViVHlwZSA9IHJhbmRFbGVtKHN1YnR5cGVzKVxuXG4gICAgICAvLyBidWlsZCBvcHRpb25zIG9iamVjdFxuICAgICAgbGV0IHF1ZXN0aW9uT3B0aW9ucyA6IFBhcnRpYWw8UXVlc3Rpb25PcHRpb25zPiA9IHt9XG4gICAgICBpZiAoc3VidHlwZSA9PT0gJ3NpbXBsZScgfHwgc3VidHlwZSA9PT0gJ3JlcGVhdGVkJykge1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMgPSB7fVxuICAgICAgfSBlbHNlIGlmIChzdWJ0eXBlID09PSAnYWxnZWJyYScpIHtcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zID0gb3B0aW9ucy5hbGdlYnJhT3B0aW9uc1xuICAgICAgfSBlbHNlIGlmIChzdWJ0eXBlID09PSAnd29yZGVkJykge1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMgPSBvcHRpb25zLndvcmRlZE9wdGlvbnNcbiAgICAgIH1cbiAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gb3B0aW9ucy5taW5OXG4gICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IG9wdGlvbnMubWF4TlxuXG4gICAgICByZXR1cm4gTWlzc2luZ0FuZ2xlc1EucmFuZG9tRnJvbVR5cGVXaXRoT3B0aW9ucyh0eXBlLCBzdWJ0eXBlLCBxdWVzdGlvbk9wdGlvbnMpXG4gICAgfVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbUZyb21EaWZmaWN1bHR5ICh0eXBlOiBRdWVzdGlvblR5cGUsIGRpZmZpY3VsdHk6IG51bWJlcikge1xuICAgIGxldCBzdWJ0eXBlIDogUXVlc3Rpb25TdWJUeXBlXG4gICAgY29uc3QgcXVlc3Rpb25PcHRpb25zIDogUGFydGlhbDxRdWVzdGlvbk9wdGlvbnM+ID0ge31cbiAgICBzd2l0Y2ggKGRpZmZpY3VsdHkpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgc3VidHlwZSA9ICdzaW1wbGUnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDJcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgc3VidHlwZSA9ICdzaW1wbGUnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gM1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDRcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgc3VidHlwZSA9ICdyZXBlYXRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAzXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gNFxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA0OlxuICAgICAgICBzdWJ0eXBlID0gJ2FsZ2VicmEnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5leHByZXNzaW9uVHlwZXMgPSBbJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPSBmYWxzZVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDJcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSA0XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDU6XG4gICAgICAgIHN1YnR5cGUgPSAnYWxnZWJyYSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmV4cHJlc3Npb25UeXBlcyA9IFsnYWRkJywgJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPSBbJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmVuc3VyZVggPSB0cnVlXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNjpcbiAgICAgICAgc3VidHlwZSA9ICdhbGdlYnJhJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZXhwcmVzc2lvblR5cGVzID0gWydtaXhlZCddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNzpcbiAgICAgICAgc3VidHlwZSA9ICd3b3JkZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy50eXBlcyA9IFtyYW5kRWxlbShbJ2FkZCcsICdtdWx0aXBseSddKV1cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDJcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgODpcbiAgICAgICAgc3VidHlwZSA9ICd3b3JkZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy50eXBlcyA9IFsnYWRkJywgJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgOTpcbiAgICAgICAgc3VidHlwZSA9ICd3b3JkZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy50eXBlcyA9IFsnbXVsdGlwbHknLCAncmF0aW8nXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSAxMDpcbiAgICAgICAgc3VidHlwZSA9ICd3b3JkZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy50eXBlcyA9IFsnbXVsdGlwbHknLCAnYWRkJywgJ3JhdGlvJywgJ3BlcmNlbnQnXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4ndCBnZW5lcmF0ZSBkaWZmaWN1bHR5ICR7ZGlmZmljdWx0eX1gKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJhbmRvbUZyb21UeXBlV2l0aE9wdGlvbnModHlwZSwgc3VidHlwZSwgcXVlc3Rpb25PcHRpb25zKVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbUZyb21UeXBlV2l0aE9wdGlvbnMgKHR5cGU6IFF1ZXN0aW9uVHlwZSwgc3VidHlwZT86IFF1ZXN0aW9uU3ViVHlwZSwgcXVlc3Rpb25PcHRpb25zPzogUGFydGlhbDxRdWVzdGlvbk9wdGlvbnM+LCB2aWV3T3B0aW9ucz86IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzUSB7XG4gICAgbGV0IHF1ZXN0aW9uOiBHcmFwaGljUVxuICAgIHF1ZXN0aW9uT3B0aW9ucyA9IHF1ZXN0aW9uT3B0aW9ucyB8fCB7fVxuICAgIHZpZXdPcHRpb25zID0gdmlld09wdGlvbnMgfHwge31cbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ2FhYXAnOlxuICAgICAgY2FzZSAnYW9zbCc6IHtcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmFuZ2xlU3VtID0gKHR5cGUgPT09ICdhYWFwJykgPyAzNjAgOiAxODBcbiAgICAgICAgc3dpdGNoIChzdWJ0eXBlKSB7XG4gICAgICAgICAgY2FzZSAnc2ltcGxlJzpcbiAgICAgICAgICBjYXNlICdyZXBlYXRlZCc6XG4gICAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMucmVwZWF0ZWQgPSBzdWJ0eXBlID09PSAncmVwZWF0ZWQnXG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNBcm91bmRRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdhbGdlYnJhJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICd3b3JkZWQnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzV29yZGVkUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgdW5leHBlY3RlZCBzdWJ0eXBlICR7c3VidHlwZX1gKVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICd0cmlhbmdsZSc6IHtcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnJlcGVhdGVkID0gKHN1YnR5cGUgPT09ICdyZXBlYXRlZCcpXG4gICAgICAgIHN3aXRjaCAoc3VidHlwZSkge1xuICAgICAgICAgIGNhc2UgJ3NpbXBsZSc6XG4gICAgICAgICAgY2FzZSAncmVwZWF0ZWQnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdhbGdlYnJhJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3dvcmRlZCc6XG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHVuZXhwZWN0ZWQgc3VidHlwZSAke3N1YnR5cGV9YClcbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHR5cGUgJHt0eXBlfWApXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzUShxdWVzdGlvbilcbiAgfVxuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHsgcmV0dXJuIHRoaXMucXVlc3Rpb24uZ2V0RE9NKCkgfVxuICByZW5kZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5yZW5kZXIoKSB9XG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5zaG93QW5zd2VyKCkgfVxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24uaGlkZUFuc3dlcigpIH1cbiAgdG9nZ2xlQW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24udG9nZ2xlQW5zd2VyKCkgfVxuXG4gIHN0YXRpYyBnZXQgb3B0aW9uc1NwZWMgKCk6IE9wdGlvbnNTcGVjIHtcbiAgICByZXR1cm4gW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnaGVhZGluZycsXG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgfSxcblxuICAgICAge1xuICAgICAgICB0aXRsZTogJ1R5cGVzJyxcbiAgICAgICAgaWQ6ICd0eXBlcycsXG4gICAgICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICAgICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgICAgIHsgdGl0bGU6ICdPbiBhIHN0cmFpZ2h0IGxpbmUnLCBpZDogJ2Fvc2wnIH0sXG4gICAgICAgICAgeyB0aXRsZTogJ0Fyb3VuZCBhIHBvaW50JywgaWQ6ICdhYWFwJyB9LFxuICAgICAgICAgIHsgdGl0bGU6ICdUcmlhbmdsZScsIGlkOiAndHJpYW5nbGUnIH1cbiAgICAgICAgXSxcbiAgICAgICAgZGVmYXVsdDogWydhb3NsJywgJ2FhYXAnLCAndHJpYW5nbGUnXSxcbiAgICAgICAgdmVydGljYWw6IHRydWVcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjb2x1bW4tYnJlYWsnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnPGI+Q3VzdG9tIHNldHRpbmdzIChkaXNhYmxlcyBkaWZmaWN1bHR5KTwvYj4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgaWQ6ICdjdXN0b20nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAncmFuZ2UnLFxuICAgICAgICBpZDogJ24tYW5nbGVzJyxcbiAgICAgICAgaWRMQjogJ21pbk4nLFxuICAgICAgICBpZFVCOiAnbWF4TicsXG4gICAgICAgIGRlZmF1bHRMQjogMixcbiAgICAgICAgZGVmYXVsdFVCOiA0LFxuICAgICAgICBtaW46IDIsXG4gICAgICAgIG1heDogOCxcbiAgICAgICAgdGl0bGU6ICdOdW1iZXIgb2YgYW5nbGVzJyxcbiAgICAgICAgZW5hYmxlZElmOiAnY3VzdG9tJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJ1NpbXBsZScsXG4gICAgICAgIGlkOiAnc2ltcGxlJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlZElmOiAnY3VzdG9tJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJ1JlcGVhdGVkL0lzb3NjZWxlcycsXG4gICAgICAgIGlkOiAncmVwZWF0ZWQnLFxuICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICBlbmFibGVkSWY6ICdjdXN0b20nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnQWxnZWJyYWljJyxcbiAgICAgICAgaWQ6ICdhbGdlYnJhJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlZElmOiAnY3VzdG9tJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3N1Ym9wdGlvbnMnLFxuICAgICAgICB0aXRsZTogJycsXG4gICAgICAgIGlkOiAnYWxnZWJyYU9wdGlvbnMnLFxuICAgICAgICBvcHRpb25zU3BlYzogTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRLm9wdGlvbnNTcGVjLFxuICAgICAgICBlbmFibGVkSWY6ICdjdXN0b20mYWxnZWJyYSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgdGl0bGU6ICdXb3JkZWQnLFxuICAgICAgICBpZDogJ3dvcmRlZCcsXG4gICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgIGVuYWJsZWRJZjogJ2N1c3RvbSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdzdWJvcHRpb25zJyxcbiAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICBpZDogJ3dvcmRlZE9wdGlvbnMnLFxuICAgICAgICBvcHRpb25zU3BlYzogTWlzc2luZ0FuZ2xlc1dvcmRlZFEub3B0aW9uc1NwZWMsXG4gICAgICAgIGVuYWJsZWRJZjogJ2N1c3RvbSZ3b3JkZWQnXG4gICAgICB9XG4gICAgXVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnXG4gIH1cbn1cbiIsImltcG9ydCB7IFZhbHVlIH0gZnJvbSBcIi4vUmVjdGFuZ2xlQXJlYURhdGFcIlxuaW1wb3J0IHsgUXVlc3Rpb25PcHRpb25zIH0gZnJvbSBcIi4vdHlwZXNcIlxuaW1wb3J0IGZyYWN0aW9uIGZyb20gJ2ZyYWN0aW9uLmpzJ1xuaW1wb3J0IHsgZ2F1c3NpYW5DdXJyeSwgcmFuZEJldHdlZW4sIHJhbmRFbGVtLCBzY2FsZWRTdHIgfSBmcm9tIFwidXRpbGl0aWVzXCJcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFyYWxsZWxvZ3JhbUFyZWFEYXRhIHtcbiAgcmVhZG9ubHkgYmFzZTogVmFsdWVcbiAgcmVhZG9ubHkgaGVpZ2h0OiBWYWx1ZVxuICByZWFkb25seSBzaWRlOiBWYWx1ZVxuICByZWFkb25seSBzaG93T3Bwb3NpdGVzOiBib29sZWFuXG4gIHByaXZhdGUgcmVhZG9ubHkgZHA6IG51bWJlclxuICBwcml2YXRlIHJlYWRvbmx5IGRlbm9taW5hdG9yOiBudW1iZXIgPSAxXG4gIHByaXZhdGUgX2FyZWE/OiBQYXJ0aWFsPFZhbHVlPiAvLyBsYXppbHkgY2FsY3VsYXRlZFxuICBwcml2YXRlIF9wZXJpbWV0ZXI/OiBQYXJ0aWFsPFZhbHVlPlxuXG4gIGNvbnN0cnVjdG9yKGJhc2U6IFZhbHVlLCBoZWlnaHQ6IFZhbHVlLCBzaWRlOiBWYWx1ZSwgc2hvd09wcG9zaXRlczogYm9vbGVhbiwgZHA6IG51bWJlciwgZGVub21pbmF0b3I6IG51bWJlciwgYXJlYVByb3BlcnRpZXM/OiBPbWl0PFZhbHVlLCAndmFsJz4sIHBlcmltZXRlclByb3BlcnRpZXM/OiBPbWl0PFZhbHVlLCAndmFsJz4pIHtcbiAgICB0aGlzLmJhc2UgPSBiYXNlXG4gICAgdGhpcy5oZWlnaHQgPSBoZWlnaHRcbiAgICB0aGlzLnNpZGUgPSBzaWRlXG4gICAgdGhpcy5zaG93T3Bwb3NpdGVzID0gc2hvd09wcG9zaXRlc1xuICAgIHRoaXMuZHAgPSBkcFxuICAgIHRoaXMuZGVub21pbmF0b3IgPSBkZW5vbWluYXRvclxuICAgIHRoaXMuX2FyZWEgPSBhcmVhUHJvcGVydGllc1xuICAgIHRoaXMuX3BlcmltZXRlciA9IHBlcmltZXRlclByb3BlcnRpZXNcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20ob3B0aW9uczogUXVlc3Rpb25PcHRpb25zKTogUGFyYWxsZWxvZ3JhbUFyZWFEYXRhIHtcbiAgICBjb25zdCBtYXhMZW5ndGggPSBvcHRpb25zLm1heExlbmd0aFxuICAgIGNvbnN0IGRwID0gb3B0aW9ucy5kcFxuICAgIGNvbnN0IGRlbm9taW5hdG9yID0gb3B0aW9ucy5mcmFjdGlvbiA/IHJhbmRCZXR3ZWVuKDIsIDYpIDogMVxuXG4gICAgLy8gYmFzaWMgdmFsdWVzXG4gICAgY29uc3QgYmFzZTogVmFsdWUgPSB7XG4gICAgICB2YWw6IHJhbmRCZXR3ZWVuKDEsIG1heExlbmd0aCksXG4gICAgICBzaG93OiB0cnVlLFxuICAgICAgbWlzc2luZzogZmFsc2VcbiAgICB9XG4gICAgY29uc3QgaGVpZ2h0OiBWYWx1ZSA9IHtcbiAgICAgIHZhbDogcmFuZEJldHdlZW4oTWF0aC5jZWlsKGJhc2UudmFsLzgpLCAyKmJhc2UudmFsK01hdGguY2VpbChiYXNlLnZhbC84KSwgZ2F1c3NpYW5DdXJyeSgyKSksXG4gICAgICBzaG93OiB0cnVlLFxuICAgICAgbWlzc2luZzogZmFsc2VcbiAgICB9XG5cbiAgICBjb25zdCBzaWRlOiBWYWx1ZSA9IHtcbiAgICAgIHZhbDogcmFuZEJldHdlZW4oaGVpZ2h0LnZhbCsxLCBoZWlnaHQudmFsKjMsICgpPT4oTWF0aC5yYW5kb20oKSkqKjIpLCAvLyBkaXN0cmlidXRpb24gaXMgYmlhc2VkIHRvd2FyZHMgbG93ZXIgdmFsdWVzXG4gICAgICBzaG93OiB0cnVlLFxuICAgICAgbWlzc2luZzogZmFsc2VcbiAgICB9XG5cbiAgICBjb25zdCBhcmVhUHJvcGVydGllczogT21pdDxWYWx1ZSwgJ3ZhbCc+ID0ge1xuICAgICAgc2hvdzogZmFsc2UsXG4gICAgICBtaXNzaW5nOiBmYWxzZVxuICAgIH1cblxuICAgIGNvbnN0IHBlcmltZXRlclByb3BlcnRpZXM6IE9taXQ8VmFsdWUsICd2YWwnPiA9IHtcbiAgICAgIHNob3c6IGZhbHNlLFxuICAgICAgbWlzc2luZzogZmFsc2VcbiAgICB9XG5cbiAgICAvLyBMYWJlbHNcbiAgICBpZiAoZGVub21pbmF0b3I+MSkge1xuICAgICAgW2Jhc2UsaGVpZ2h0LHNpZGVdLmZvckVhY2godj0+e1xuICAgICAgICB2LmxhYmVsID0gbmV3IGZyYWN0aW9uKHYudmFsLGRlbm9taW5hdG9yKS50b0xhdGV4KHRydWUpICsgXCJcXFxcbWF0aHJte2NtfVwiXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICBbYmFzZSxoZWlnaHQsc2lkZV0uZm9yRWFjaCh2PT57XG4gICAgICAgIHYubGFiZWwgPSBzY2FsZWRTdHIodi52YWwsZHApICsgXCJcXFxcbWF0aHJte2NtfVwiXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vIGFkanVzdCBmb3IgcXVlc3Rpb24gdHlwZVxuICAgIGxldCBzaG93T3Bwb3NpdGVzID0gZmFsc2VcbiAgICBzd2l0Y2ggKG9wdGlvbnMucXVlc3Rpb25UeXBlKSB7XG4gICAgICBjYXNlICdhcmVhJzpcbiAgICAgICAgYXJlYVByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgYXJlYVByb3BlcnRpZXMubWlzc2luZyA9IHRydWVcbiAgICAgICAgc2lkZS5zaG93ID0gIW9wdGlvbnMubm9EaXN0cmFjdG9yc1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSAncGVyaW1ldGVyJzpcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5zaG93ID0gdHJ1ZVxuICAgICAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIHNob3dPcHBvc2l0ZXMgPSBvcHRpb25zLm5vRGlzdHJhY3RvcnNcbiAgICAgICAgaGVpZ2h0LnNob3cgPSAhb3B0aW9ucy5ub0Rpc3RyYWN0b3JzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdyZXZlcnNlQXJlYSc6XG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLm1pc3NpbmcgPSBmYWxzZVxuICAgICAgICByYW5kRWxlbShbYmFzZSwgaGVpZ2h0XSkubWlzc2luZyA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3JldmVyc2VQZXJpbWV0ZXInOlxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5zaG93ID0gdHJ1ZVxuICAgICAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzLm1pc3NpbmcgPSBmYWxzZVxuICAgICAgICByYW5kRWxlbShbYmFzZSwgc2lkZV0pLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQYXJhbGxlbG9ncmFtQXJlYURhdGEoYmFzZSwgaGVpZ2h0LCBzaWRlLCBzaG93T3Bwb3NpdGVzLCBkcCwgZGVub21pbmF0b3IsIGFyZWFQcm9wZXJ0aWVzLCBwZXJpbWV0ZXJQcm9wZXJ0aWVzKVxuICB9XG5cbiAgZ2V0IHBlcmltZXRlcigpOiBWYWx1ZSB7XG4gICAgaWYgKCF0aGlzLl9wZXJpbWV0ZXIpIHtcbiAgICAgIHRoaXMuX3BlcmltZXRlciA9IHtcbiAgICAgICAgc2hvdzogZmFsc2UsXG4gICAgICAgIG1pc3Npbmc6IHRydWVcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0aGlzLl9wZXJpbWV0ZXIudmFsKSB7XG4gICAgICB0aGlzLl9wZXJpbWV0ZXIudmFsID0gMiAqICh0aGlzLmJhc2UudmFsICsgdGhpcy5zaWRlLnZhbClcbiAgICAgIGlmICh0aGlzLmRlbm9taW5hdG9yID4gMSkge1xuICAgICAgICB0aGlzLl9wZXJpbWV0ZXIubGFiZWwgPSBuZXcgZnJhY3Rpb24odGhpcy5fcGVyaW1ldGVyLnZhbCwgdGhpcy5kZW5vbWluYXRvcikudG9MYXRleCh0cnVlKSArICdcXFxcbWF0aHJte2NtfSdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3BlcmltZXRlci5sYWJlbCA9IHNjYWxlZFN0cih0aGlzLl9wZXJpbWV0ZXIudmFsLCB0aGlzLmRwKSArICdcXFxcbWF0aHJte2NtfSdcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3BlcmltZXRlciBhcyBWYWx1ZVxuICB9XG5cbiAgZ2V0IGFyZWEoKTogVmFsdWUge1xuICAgIGlmICghdGhpcy5fYXJlYSkge1xuICAgICAgdGhpcy5fYXJlYSA9IHtcbiAgICAgICAgc2hvdzogZmFsc2UsXG4gICAgICAgIG1pc3Npbmc6IHRydWVcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0aGlzLl9hcmVhLnZhbCkge1xuICAgICAgdGhpcy5fYXJlYS52YWwgPSB0aGlzLmJhc2UudmFsICogdGhpcy5oZWlnaHQudmFsXG4gICAgICBpZiAodGhpcy5kZW5vbWluYXRvciA+IDEpIHtcbiAgICAgICAgdGhpcy5fYXJlYS5sYWJlbCA9IG5ldyBmcmFjdGlvbih0aGlzLl9hcmVhLnZhbCwgdGhpcy5kZW5vbWluYXRvciAqKiAyKS50b0xhdGV4KHRydWUpICsgJ1xcXFxtYXRocm17Y219XjInXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9hcmVhLmxhYmVsID0gc2NhbGVkU3RyKHRoaXMuX2FyZWEudmFsLCAyICogdGhpcy5kcCkgKyAnXFxcXG1hdGhybXtjbX1eMidcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2FyZWEgYXMgVmFsdWVcbiAgfVxufVxuIiwiaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuXG4vKiBDYW52YXMgZHJhd2luZywgdXNpbmcgdGhlIFBvaW50IGNsYXNzICovXG5cbmV4cG9ydCBmdW5jdGlvbiBkYXNoZWRMaW5lIChjdHgsIHgxLCB5MSwgeDIsIHkyKSB7XG4gIC8vIFdvcmsgaWYgZ2l2ZW4gdHdvIHBvaW50cyBpbnN0ZWFkOlxuICBpZiAoeDEgaW5zdGFuY2VvZiBQb2ludCAmJiB4MiBpbnN0YW5jZW9mIFBvaW50KSB7XG4gICAgY29uc3QgcDEgPSB4MTsgY29uc3QgcDIgPSB4MlxuICAgIHgxID0gcDEueFxuICAgIHkxID0gcDEueVxuICAgIHgyID0gcDIueFxuICAgIHkyID0gcDIueVxuICB9XG5cbiAgY29uc3QgbGVuZ3RoID0gTWF0aC5oeXBvdCh4MiAtIHgxLCB5MiAtIHkxKVxuICBjb25zdCBkYXNoeCA9ICh5MSAtIHkyKSAvIGxlbmd0aCAvLyB1bml0IHZlY3RvciBwZXJwZW5kaWN1bGFyIHRvIGxpbmVcbiAgY29uc3QgZGFzaHkgPSAoeDIgLSB4MSkgLyBsZW5ndGhcbiAgY29uc3QgbWlkeCA9ICh4MSArIHgyKSAvIDJcbiAgY29uc3QgbWlkeSA9ICh5MSArIHkyKSAvIDJcblxuICAvLyBkcmF3IHRoZSBiYXNlIGxpbmVcbiAgY3R4Lm1vdmVUbyh4MSwgeTEpXG4gIGN0eC5saW5lVG8oeDIsIHkyKVxuXG4gIC8vIGRyYXcgdGhlIGRhc2hcbiAgY3R4Lm1vdmVUbyhtaWR4ICsgNSAqIGRhc2h4LCBtaWR5ICsgNSAqIGRhc2h5KVxuICBjdHgubGluZVRvKG1pZHggLSA1ICogZGFzaHgsIG1pZHkgLSA1ICogZGFzaHkpXG5cbiAgY3R4Lm1vdmVUbyh4MiwgeTIpXG59XG4vKipcbiAqIFxuICogQHBhcmFtIHtDYW52YXNSZW5kZXJpbmdDb250ZXh0MkR9IGN0eCBUaGUgY29udGV4dFxuICogQHBhcmFtIHtQb2ludH0gcHQxIEEgcG9pbnRcbiAqIEBwYXJhbSB7UG9pbnR9IHB0MiBBIHBvaW50XG4gKiBAcGFyYW0ge251bWJlcn0gc2l6ZSBUaGUgc2l6ZSBvZiB0aGUgYXJyYXkgdG8gZHJhd1xuICogQHBhcmFtIHtudW1iZXJ9IFttPTAuNV0gVGhlICdzaGFycG5lc3MnIG9mIHRoZSBwb2ludC4gU21hbGxlciBpcyBwb2ludGllclxuICovXG5leHBvcnQgZnVuY3Rpb24gYXJyb3dMaW5lIChjdHgsIHB0MSwgcHQyLCBzaXplLCBtPTAuNSkge1xuXG4gIGNvbnN0IHVuaXQgPSBQb2ludC51bml0VmVjdG9yKHB0MSwgcHQyKVxuICB1bml0LnggKj0gc2l6ZVxuICB1bml0LnkgKj0gc2l6ZVxuICBjb25zdCBub3JtYWwgPSB7IHg6IC11bml0LnksIHk6IHVuaXQueCB9XG4gIG5vcm1hbC54ICo9IG1cbiAgbm9ybWFsLnkgKj0gbVxuXG4gIGNvbnN0IGNvbnRyb2wxID0gcHQyLmNsb25lKClcbiAgICAudHJhbnNsYXRlKC11bml0LngsIC11bml0LnkpXG4gICAgLnRyYW5zbGF0ZShub3JtYWwueCwgbm9ybWFsLnkpXG5cbiAgY29uc3QgY29udHJvbDIgPSBwdDIuY2xvbmUoKVxuICAgIC50cmFuc2xhdGUoLXVuaXQueCwgLXVuaXQueSlcbiAgICAudHJhbnNsYXRlKC1ub3JtYWwueCwgLW5vcm1hbC55KVxuXG4gIGN0eC5tb3ZlVG8ocHQxLngsIHB0MS55KVxuICBjdHgubGluZVRvKHB0Mi54LCBwdDIueSlcbiAgY3R4LmxpbmVUbyhjb250cm9sMS54LCBjb250cm9sMS55KVxuICBjdHgubW92ZVRvKHB0Mi54LCBwdDIueSlcbiAgY3R4LmxpbmVUbyhjb250cm9sMi54LCBjb250cm9sMi55KVxufVxuXG4vKipcbiAqIERyYXcgYSByaWdodCBhbmdsZSBzeW1ib2wgZm9yIGFuZ2xlIEFPQy4gTkI6IG5vIGNoZWNrIGlzIG1hZGUgdGhhdCBBT0MgaXMgaW5kZWVkIGEgcmlnaHQgYW5nbGVcbiAqIEBwYXJhbSB7Q2FudmFzUmVuZGVyaW5nQ29udGV4dDJEfSBjdHggVGhlIGNvbnRleHQgdG8gZHJhdyBpblxuICogQHBhcmFtIHtQb2ludH0gQSBTdGFydCBwb2ludFxuICogQHBhcmFtIHtQb2ludH0gTyBWZXJ0ZXggcG9pbnRcbiAqIEBwYXJhbSB7UG9pbnR9IEMgRW5kIHBvaW50XG4gKiBAcGFyYW0ge251bWJlcn0gc2l6ZSBTaXplIG9mIHJpZ2h0IGFuZ2xlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkcmF3UmlnaHRBbmdsZSAoY3R4LCBBLCBPLCBDLCBzaXplKSB7XG4gIGNvbnN0IHVuaXRPQSA9IFBvaW50LnVuaXRWZWN0b3IoTywgQSlcbiAgY29uc3QgdW5pdE9DID0gUG9pbnQudW5pdFZlY3RvcihPLCBDKVxuICBjb25zdCBjdGwxID0gTy5jbG9uZSgpLnRyYW5zbGF0ZSh1bml0T0EueCAqIHNpemUsIHVuaXRPQS55ICogc2l6ZSlcbiAgY29uc3QgY3RsMiA9IGN0bDEuY2xvbmUoKS50cmFuc2xhdGUodW5pdE9DLnggKiBzaXplLCB1bml0T0MueSAqIHNpemUpXG4gIGNvbnN0IGN0bDMgPSBPLmNsb25lKCkudHJhbnNsYXRlKHVuaXRPQy54ICogc2l6ZSwgdW5pdE9DLnkgKiBzaXplKVxuICBjdHgubW92ZVRvKGN0bDEueCwgY3RsMS55KVxuICBjdHgubGluZVRvKGN0bDIueCwgY3RsMi55KVxuICBjdHgubGluZVRvKGN0bDMueCwgY3RsMy55KVxufVxuXG4vKipcbiAqIERyYXdzIGEgZGFzaCwgb3IgbXVsdGlwbGUgZGFzaGVzLCBhdCB0aGUgbWlkcG9pbnQgb2YgQSBhbmQgQlxuICogQHBhcmFtIHtDYW52YXNSZW5kZXJpbmdDb250ZXh0MkR9IGN0eCBUaGUgY2FudmFzIHJlbmRlcmluZyBjb250ZXh0XG4gKiBAcGFyYW0ge1BvaW50fSBBIEEgcG9pbnRcbiAqIEBwYXJhbSB7UG9pbnR9IEIgQSBwb2ludFxuICogQHBhcmFtIHtudW1iZXJ9IFtzaXplPTEwXSAgVGhlIGxlbmd0aCBvZiB0aGUgZGFzaGVzLCBpbiBwaXhlbHNcbiAqIEBwYXJhbSB7bnVtYmVyfSBbbnVtYmVyPTFdIEhvdyBtYW55IGRhc2hlcyB0byBkcndcbiAqIEBwYXJhbSB7bnVtYmVyfSBbZ2FwPXNpemVdIFRoZSBnYXAgYmV0d2VlbiBkYXNoZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcmFsbGVsU2lnbiAoY3R4LCBBLCBCLCBzaXplPTEwLCBudW1iZXI9MSwgZ2FwPXNpemUpIHtcbiAgY29uc3QgdW5pdCA9IFBvaW50LnVuaXRWZWN0b3IoQSwgQilcbiAgdW5pdC54ICo9IHNpemVcbiAgdW5pdC55ICo9IHNpemVcbiAgY29uc3Qgbm9ybWFsID0geyB4OiAtdW5pdC55LCB5OiB1bml0LnggfVxuXG4gIGNvbnN0IE0gPSBQb2ludC5tZWFuKEEsIEIpXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1iZXI7IGkrKykge1xuICAgIGNvbnN0IGN0bDIgPSBNLmNsb25lKCkubW92ZVRvd2FyZChCLCBpICogZ2FwKVxuICAgIGNvbnN0IGN0bDEgPSBjdGwyLmNsb25lKClcbiAgICAgIC50cmFuc2xhdGUoLXVuaXQueCwgLXVuaXQueSlcbiAgICAgIC50cmFuc2xhdGUobm9ybWFsLngsIG5vcm1hbC55KVxuICAgIGNvbnN0IGN0bDMgPSBjdGwyLmNsb25lKClcbiAgICAgIC50cmFuc2xhdGUoLXVuaXQueCwgLXVuaXQueSlcbiAgICAgIC50cmFuc2xhdGUoLW5vcm1hbC54LCAtbm9ybWFsLnkpXG5cbiAgICBjdHgubW92ZVRvKGN0bDEueCwgY3RsMS55KVxuICAgIGN0eC5saW5lVG8oY3RsMi54LCBjdGwyLnkpXG4gICAgY3R4LmxpbmVUbyhjdGwzLngsIGN0bDMueSlcbiAgfVxufVxuIiwiZXhwb3J0IHR5cGUgU2hhcGUgPSAncmVjdGFuZ2xlJyB8ICd0cmlhbmdsZScgfCAncGFyYWxsZWxvZ3JhbScgfCAndHJhcGV6aXVtJztcblxuZXhwb3J0IHR5cGUgUXVlc3Rpb25UeXBlU2ltcGxlID0gJ2FyZWEnIHwgJ3BlcmltZXRlcic7XG5leHBvcnQgdHlwZSBRdWVzdGlvblR5cGVDdXN0b20gPSAncmV2ZXJzZUFyZWEnIHwgJ3JldmVyc2VQZXJpbWV0ZXInIHwgJ3B5dGhhZ29yYXNBcmVhJyB8ICdweXRoYWdvcmFzUGVyaW1ldGVyJyB8ICdweXRoYWdvcmFzSXNvc2NlbGVzQXJlYSc7XG5leHBvcnQgdHlwZSBRdWVzdGlvblR5cGUgPSBRdWVzdGlvblR5cGVTaW1wbGUgfCBRdWVzdGlvblR5cGVDdXN0b207XG5cbmV4cG9ydCBpbnRlcmZhY2UgUXVlc3Rpb25PcHRpb25zIHtcbiAgbm9EaXN0cmFjdG9yczogYm9vbGVhbiwgLy8gYWRkcyBsYXllciBvZiBkaWZmaWN1bHR5IHdoZW4gdHJ1ZSBieSBpbmNsdWRpbmcvZXhjbHVkaW5nIHNpZGVzIChkZXBlbmRpbmcgb24gc2hhcGUgdHlwZSlcbiAgZHA6IG51bWJlciwgLy8gbnVtYmVyIG9mIGRlY2ltYWwgcGxhY2VzIG9mIGxlbmd0aHNcbiAgZnJhY3Rpb246IGJvb2xlYW4sXG4gIG1heExlbmd0aDogbnVtYmVyLCAvLyB0aGUgbWF4aW11bSBsZW5ndGggb2YgYSBzaWRlXG4gIHF1ZXN0aW9uVHlwZTogUXVlc3Rpb25UeXBlXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV3JhcHBlck9wdGlvbnMge1xuICBkaWZmaWN1bHR5OiBudW1iZXI7XG4gIHNoYXBlczogU2hhcGVbXTtcbiAgcXVlc3Rpb25UeXBlc1NpbXBsZTogUXVlc3Rpb25UeXBlU2ltcGxlW107XG4gIGN1c3RvbTogYm9vbGVhbjtcbiAgcXVlc3Rpb25UeXBlc0N1c3RvbTogKFF1ZXN0aW9uVHlwZSlbXTtcbiAgZHA6IDAgfCAxO1xufVxuXG5leHBvcnQgY29uc3QgY29sb3JzID0gWydMaWdodEN5YW4nLCdMaWdodFllbGxvdycsJ1BpbmsnLCdMaWdodEdyZWVuJywnTGlnaHRCbHVlJywnSXZvcnknLCdMaWdodEdyYXknXVxuIiwiaW1wb3J0IHsgYXJyb3dMaW5lLCBkcmF3UmlnaHRBbmdsZSwgcGFyYWxsZWxTaWduIH0gZnJvbSBcImRyYXdpbmdcIlxuaW1wb3J0IFBvaW50IGZyb20gXCJQb2ludFwiXG5pbXBvcnQgeyByYW5kQmV0d2VlbiwgcmFuZEVsZW0gfSBmcm9tIFwidXRpbGl0aWVzXCJcbmltcG9ydCB7IEdyYXBoaWNRVmlldywgTGFiZWwgfSBmcm9tIFwiLi4vR3JhcGhpY1FcIlxuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gXCIuLi9WaWV3T3B0aW9uc1wiXG5pbXBvcnQgUGFyYWxsZWxvZ3JhbUFyZWFEYXRhIGZyb20gXCIuL1BhcmFsbGVsb2dyYW1BcmVhRGF0YVwiXG5pbXBvcnQgUmVjdGFuZ2xlQXJlYURhdGEsIHsgVmFsdWUgfSBmcm9tIFwiLi9SZWN0YW5nbGVBcmVhRGF0YVwiXG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tIFwiLi90eXBlc1wiXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcmFsbGVsb2dyYW1BcmVhVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIGRhdGEhOiBQYXJhbGxlbG9ncmFtQXJlYURhdGEgLy8gYXNzaWduZWQgaW4gc3VwZXJcbiAgQTogUG9pbnRcbiAgQjogUG9pbnRcbiAgQzogUG9pbnRcbiAgRDogUG9pbnRcbiAgaHQxOiBQb2ludFxuICBodDI6IFBvaW50XG5cbiAgY29uc3RydWN0b3IgKEE6IFBvaW50LCBCOiBQb2ludCwgQzogUG9pbnQsIEQ6IFBvaW50LCBodDE6IFBvaW50LCBodDI6IFBvaW50LCBsYWJlbHM6IExhYmVsW10sIGRhdGE6IFBhcmFsbGVsb2dyYW1BcmVhRGF0YSwgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgLyogU3VwZXIgZG9lczpcbiAgICAgKiAgU2V0cyB0aGlzLndpZHRoIGFuZCB0aGlzLmhlaWdodFxuICAgICAqICBTZXRzIHRoaXMuZGF0YVxuICAgICAqICBDcmVhdGVzIERPTSBlbGVtZW50cywgaW5jbHVkaW5nIGNhbnZhc1xuICAgICAqICBDcmVhdGVzIGVtcHR5IHRoaXMubGFiZWxzIGxpc3RcbiAgICAgKi9cbiAgICBzdXBlcihkYXRhLCB2aWV3T3B0aW9ucykgLy8gaW5pdGlhbGlzZXMgdGhpcy5kYXRhXG4gICAgdGhpcy5BID0gQVxuICAgIHRoaXMuQiA9IEJcbiAgICB0aGlzLkMgPSBDXG4gICAgdGhpcy5EID0gRFxuICAgIHRoaXMuaHQxID0gaHQxXG4gICAgdGhpcy5odDIgPSBodDJcbiAgICB0aGlzLmxhYmVscyA9IGxhYmVsc1xuICB9XG5cbiAgc3RhdGljIGZyb21EYXRhKGRhdGE6IFBhcmFsbGVsb2dyYW1BcmVhRGF0YSwgdmlld09wdGlvbnM/OiBWaWV3T3B0aW9ucykge1xuICAgIHZpZXdPcHRpb25zID0gdmlld09wdGlvbnMgPz8ge31cbiAgICB2aWV3T3B0aW9ucy53aWR0aCA9IHZpZXdPcHRpb25zLndpZHRoID8/IDMwMFxuICAgIHZpZXdPcHRpb25zLmhlaWdodCA9IHZpZXdPcHRpb25zLmhlaWdodCA/PyAzMDBcbiAgICBjb25zdCB3aWR0aCA9IHZpZXdPcHRpb25zLndpZHRoXG4gICAgY29uc3QgaGVpZ2h0ID0gdmlld09wdGlvbnMuaGVpZ2h0XG5cbiAgICAvL3VzZWZ1bCBzaG9ydGhhbmRzOlxuICAgIGNvbnN0IHMgPSBkYXRhLnNpZGUudmFsXG4gICAgY29uc3QgYiA9IGRhdGEuYmFzZS52YWxcbiAgICBjb25zdCBoID0gZGF0YS5oZWlnaHQudmFsXG5cbiAgICAvKiBEZXJpdmF0aW9uIG9mIHRoaXMuQiwgdGhpcy5DXG4gICAgICogIEIgaXMgaW50ZXJzZWN0aW9uIG9mXG4gICAgICogICAgICAgICAgeF4yICsgeV4yID0gc14yICgxKVxuICAgICAqICAgIGFuZCAgIHkgPSBoICAgICAgICAgICAoMilcbiAgICAgKlxuICAgICAqICAgIFN1YnN0aXR1dGluZyAoMikgaW50byAoMSkgYW5kIHJlYXJyYW5naW5nIGdpdmVzOlxuICAgICAqICAgICAgICAgIHggPSBzcXJ0KHNeMi1oXjIpICh0YWtpbmcgb25seSB0aGUgK3ZlIHZhbHVlKVxuICAgICAqXG4gICAgICogIEMgaXMganVzdCB0aGlzIHNoaWZ0ZWQgYWNyb3NzIGJcbiAgICAgKi9cbiAgICBjb25zdCBBID0gbmV3IFBvaW50KDAsMCk7XG4gICAgY29uc3QgQiA9IG5ldyBQb2ludCggTWF0aC5zcXJ0KHMqcyAtIGgqaCksIGgpO1xuICAgIGNvbnN0IEMgPSBCLmNsb25lKCkudHJhbnNsYXRlKGIsMCk7XG4gICAgY29uc3QgRCA9IG5ldyBQb2ludChiLDApO1xuXG4gICAgLy8gcG9pbnRzIHRvIGRyYXcgaGVpZ2h0IGxpbmUgb25cbiAgICBjb25zdCBodDEgPSBDLmNsb25lKCk7XG4gICAgY29uc3QgaHQyID0gQy5jbG9uZSgpLnRyYW5zbGF0ZSgwLC1oKTtcbiAgICAvLyBzaGlmdCB0aGVtIGF3YXkgYSBsaXR0bGUgYml0XG4gICAgaHQxLm1vdmVUb3dhcmQoQiwtYi8xMCk7XG4gICAgaHQyLm1vdmVUb3dhcmQoQSwtYi8xMCk7XG5cbiAgICAvLyByb3RhdGVcbiAgICBjb25zdCByb3RhdGlvbjogbnVtYmVyID0gdmlld09wdGlvbnM/LnJvdGF0aW9uID8/IE1hdGgucmFuZG9tKCkqMipNYXRoLlBJXG4gICAgO1tBLEIsQyxELGh0MSxodDJdLmZvckVhY2goIHB0ID0+IHtwdC5yb3RhdGUocm90YXRpb24pfSlcblxuICAgIC8vIFNjYWxlIGFuZCBjZW50cmVcbiAgICBQb2ludC5zY2FsZVRvRml0KFtBLEIsQyxELGh0MSxodDJdLHdpZHRoLGhlaWdodCwxMDAsWzAsMjBdKVxuXG4gICAgLy8gbGFiZWxzXG4gICAgY29uc3QgbGFiZWxzIDogTGFiZWxbXSA9IFtdO1xuXG4gICAgY29uc3Qgc2lkZXMgOiBbUG9pbnQsIFBvaW50LCBWYWx1ZV1bXSA9IFsgLy9bMXN0IHBvaW50LCAybmQgcG9pbnQsIGluZm9dXG4gICAgICBbQSxCLGRhdGEuc2lkZV0sXG4gICAgICBbRCxBLGRhdGEuYmFzZV0sXG4gICAgICBbaHQxLGh0MixkYXRhLmhlaWdodF1cbiAgICBdO1xuXG4gICAgaWYgKGRhdGEuc2hvd09wcG9zaXRlcykge1xuICAgICAgc2lkZXMucHVzaChbQixDLGRhdGEuYmFzZV0pO1xuICAgICAgc2lkZXMucHVzaChbQyxELGRhdGEuc2lkZV0pO1xuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwLCBuPXNpZGVzLmxlbmd0aDsgaSA8IG47IGkrKykgeyAvL3NpZGVzXG4gICAgICBpZiAoIXNpZGVzW2ldWzJdLnNob3cpIGNvbnRpbnVlO1xuICAgICAgY29uc3Qgb2Zmc2V0ID0gMjU7XG4gICAgICBsZXQgcG9zID0gUG9pbnQubWVhbihzaWRlc1tpXVswXSxzaWRlc1tpXVsxXSk7XG4gICAgICBjb25zdCB1bml0dmVjID0gUG9pbnQudW5pdFZlY3RvcihzaWRlc1tpXVswXSwgc2lkZXNbaV1bMV0pO1xuICAgICAgXG4gICAgICBwb3MudHJhbnNsYXRlKC11bml0dmVjLnkqb2Zmc2V0LCB1bml0dmVjLngqb2Zmc2V0KTsgXG5cbiAgICAgIGNvbnN0IHRleHRhID0gc2lkZXNbaV1bMl0ubGFiZWwgPz8gc2lkZXNbaV1bMl0udmFsLnRvU3RyaW5nKClcbiAgICAgIGNvbnN0IHRleHRxID0gc2lkZXNbaV1bMl0ubWlzc2luZz8gXCI/XCIgOiB0ZXh0YTtcbiAgICAgIGNvbnN0IHN0eWxlcSA9IFwibm9ybWFsXCI7XG4gICAgICBjb25zdCBzdHlsZWEgPSBzaWRlc1tpXVsyXS5taXNzaW5nPyBcImFuc3dlclwiIDogXCJub3JtYWxcIjtcblxuICAgICAgbGFiZWxzLnB1c2goe1xuICAgICAgICBwb3M6IHBvcyxcbiAgICAgICAgdGV4dGE6IHRleHRhLFxuICAgICAgICB0ZXh0cTogdGV4dHEsXG4gICAgICAgIHRleHQ6IHRleHRxLFxuICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgc3R5bGVxOiBzdHlsZXEsXG4gICAgICAgIHN0eWxlOiBzdHlsZXFcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGxldCBuX2luZm8gPSAwO1xuICAgIGlmIChkYXRhLmFyZWEuc2hvdykge1xuICAgICAgY29uc3QgdGV4dGEgPSBkYXRhLmFyZWEubGFiZWwgPz8gZGF0YS5hcmVhLnZhbC50b1N0cmluZygpXG4gICAgICBjb25zdCB0ZXh0cSA9IGRhdGEuYXJlYS5taXNzaW5nPyBcIj9cIiA6IHRleHRhO1xuICAgICAgY29uc3Qgc3R5bGVxID0gXCJleHRyYS1pbmZvXCI7XG4gICAgICBjb25zdCBzdHlsZWEgPSBkYXRhLmFyZWEubWlzc2luZz8gXCJleHRyYS1hbnN3ZXJcIiA6IFwiZXh0cmEtaW5mb1wiO1xuICAgICAgbGFiZWxzLnB1c2goXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXh0YTogYFxcXFx0ZXh0e0FyZWF9ID0gJHt0ZXh0YX1gLFxuICAgICAgICAgIHRleHRxOiBgXFxcXHRleHR7QXJlYX0gPSAke3RleHRxfWAsXG4gICAgICAgICAgdGV4dDogYFxcXFx0ZXh0e0FyZWF9ID0gJHt0ZXh0cX1gLFxuICAgICAgICAgIHN0eWxlcTogc3R5bGVxLFxuICAgICAgICAgIHN0eWxlYTogc3R5bGVhLFxuICAgICAgICAgIHN0eWxlOiBzdHlsZXEsXG4gICAgICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIGhlaWdodCAtIDEwIC0gMTUqbl9pbmZvKSxcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICAgIG5faW5mbysrO1xuICAgIH1cbiAgICBpZiAoZGF0YS5wZXJpbWV0ZXIuc2hvdykge1xuICAgICAgY29uc3QgdGV4dGEgPSBkYXRhLnBlcmltZXRlci5sYWJlbCA/PyBkYXRhLnBlcmltZXRlci52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSBkYXRhLnBlcmltZXRlci5taXNzaW5nPyBcIj9cIiA6IHRleHRhO1xuICAgICAgY29uc3Qgc3R5bGVxID0gXCJleHRyYS1pbmZvXCI7XG4gICAgICBjb25zdCBzdHlsZWEgPSBkYXRhLnBlcmltZXRlci5taXNzaW5nPyBcImV4dHJhLWFuc3dlclwiIDogXCJleHRyYS1pbmZvXCI7XG4gICAgICBsYWJlbHMucHVzaChcbiAgICAgICAge1xuICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCBoZWlnaHQgLSAxMCAtIDIwKm5faW5mbyksXG4gICAgICAgICAgdGV4dGE6IGBcXFxcdGV4dHtQZXJpbWV0ZXJ9ID0gJHt0ZXh0YX1gLFxuICAgICAgICAgIHRleHRxOiBgXFxcXHRleHR7UGVyaW1ldGVyfSA9ICR7dGV4dHF9YCxcbiAgICAgICAgICB0ZXh0OiBgXFxcXHRleHR7UGVyaW1ldGVyfSA9ICR7dGV4dHF9YCxcbiAgICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgICBzdHlsZTogc3R5bGVxLFxuICAgICAgICB9XG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFBhcmFsbGVsb2dyYW1BcmVhVmlldyhBLEIsQyxELGh0MSxodDIsbGFiZWxzLGRhdGEsdmlld09wdGlvbnMpXG4gIH1cblxuICByZW5kZXIoKSB7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuICAgIGlmICghY3R4KSB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBnZXQgY2FudmFzIGNvbnRleHQnKVxuICAgIGN0eC5jbGVhclJlY3QoMCwwLHRoaXMuY2FudmFzLndpZHRoLHRoaXMuY2FudmFzLmhlaWdodCk7IC8vIGNsZWFyXG4gICAgY3R4LnNldExpbmVEYXNoKFtdKTtcblxuICAgIC8vIGRyYXcgcGFyYWxsZWxvZ3JhbVxuICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICBjdHgubW92ZVRvKHRoaXMuQS54LHRoaXMuQS55KTtcbiAgICBjdHgubGluZVRvKHRoaXMuQi54LHRoaXMuQi55KTtcbiAgICBjdHgubGluZVRvKHRoaXMuQy54LHRoaXMuQy55KTtcbiAgICBjdHgubGluZVRvKHRoaXMuRC54LHRoaXMuRC55KTtcbiAgICBjdHgubGluZVRvKHRoaXMuQS54LHRoaXMuQS55KTtcbiAgICBjdHguc3Ryb2tlKCk7XG4gICAgY3R4LmZpbGxTdHlsZT0gcmFuZEVsZW0oY29sb3JzKVxuICAgIGN0eC5maWxsKCk7XG4gICAgY3R4LmNsb3NlUGF0aCgpO1xuXG4gICAgLy8gcGFyYWxsZWwgc2lnbnNcbiAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgcGFyYWxsZWxTaWduKGN0eCx0aGlzLkEsdGhpcy5CLDUpO1xuICAgIHBhcmFsbGVsU2lnbihjdHgsdGhpcy5ELHRoaXMuQyw1KTtcbiAgICBwYXJhbGxlbFNpZ24oY3R4LHRoaXMuQix0aGlzLkMsNSwyKTtcbiAgICBwYXJhbGxlbFNpZ24oY3R4LHRoaXMuQSx0aGlzLkQsNSwyKTtcbiAgICBjdHguc3Ryb2tlKCk7XG4gICAgY3R4LmNsb3NlUGF0aCgpO1xuXG4gICAgLy8gZHJhdyBoZWlnaHRcbiAgICBpZiAodGhpcy5kYXRhLmhlaWdodC5zaG93KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICBhcnJvd0xpbmUoY3R4LCBQb2ludC5tZWFuKHRoaXMuaHQxLHRoaXMuaHQyKSx0aGlzLmh0MSwgOCk7XG4gICAgICBhcnJvd0xpbmUoY3R4LCBQb2ludC5tZWFuKHRoaXMuaHQxLHRoaXMuaHQyKSx0aGlzLmh0MiwgOCk7XG4gICAgICBjdHguc3Ryb2tlKCk7XG4gICAgICBjdHguY2xvc2VQYXRoKCk7XG5cbiAgICAgIC8vIGRhc2hlZCBsaW5lIHRvIGhlaWdodFxuICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgY3R4LnNldExpbmVEYXNoKFs1LDNdKTtcbiAgICAgIGN0eC5tb3ZlVG8odGhpcy5ELngsdGhpcy5ELnkpO1xuICAgICAgY3R4LmxpbmVUbyh0aGlzLmh0Mi54LHRoaXMuaHQyLnkpO1xuICAgICAgY3R4LnN0cm9rZSgpO1xuICAgICAgY3R4LmNsb3NlUGF0aCgpO1xuXG4gICAgICAvLyBSQSBzeW1ib2xcbiAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgIGN0eC5zZXRMaW5lRGFzaChbXSk7XG4gICAgICBkcmF3UmlnaHRBbmdsZShjdHgsdGhpcy5odDEsdGhpcy5odDIsdGhpcy5ELCAxMik7XG4gICAgICBjdHguc3Ryb2tlKCk7XG4gICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgfVxuICAgIHRoaXMucmVuZGVyTGFiZWxzKClcbiAgfVxufSIsImltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgUGFyYWxsZWxvZ3JhbUFyZWFEYXRhIGZyb20gJy4vUGFyYWxsZWxvZ3JhbUFyZWFEYXRhJ1xuaW1wb3J0IFBhcmFsbGVsb2dyYW1BcmVhVmlldyBmcm9tICcuL1BhcmFsbGVsb2dyYW1BcmVhVmlldydcbmltcG9ydCB7IFF1ZXN0aW9uT3B0aW9ucyB9IGZyb20gJy4vdHlwZXMnXG5cbi8vIFBhcmFsbGVsb2dyYW0gbmVlZHMgbm8gZnVydGhlciBvcHRpb25zXG4vLyBUcmlhbmdsZSBuZWVkcyBubyBmdXJ0aGVyIG9wdGlvbnMgLS0gbmVlZHMgcGFzc2luZyBpblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQYXJhbGxlbG9ncmFtQXJlYVEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGEhOiBQYXJhbGxlbG9ncmFtQXJlYURhdGEgLy8gaW5pdGlhbGlzZWQgaW4gc3VwZXIoKVxuICB2aWV3ITogUGFyYWxsZWxvZ3JhbUFyZWFWaWV3XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogUXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICBjb25zdCBkYXRhID0gUGFyYWxsZWxvZ3JhbUFyZWFEYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBQYXJhbGxlbG9ncmFtQXJlYVZpZXcuZnJvbURhdGEoZGF0YSwgdmlld09wdGlvbnMpXG4gICAgcmV0dXJuIG5ldyB0aGlzKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWVzJ1xuICB9XG59XG5cbiIsImltcG9ydCB7IHJhbmRCZXR3ZWVuLCByYW5kRWxlbSwgc2NhbGVkU3RyIH0gZnJvbSAndXRpbGl0aWVzJ1xuaW1wb3J0IGZyYWN0aW9uIGZyb20gJ2ZyYWN0aW9uLmpzJ1xuaW1wb3J0IHsgUXVlc3Rpb25PcHRpb25zIH0gZnJvbSAnLi90eXBlcydcblxuLyoqXG4gKiBBIHZhbHVlIGZvciBzaWRlcywgYXJlYXMgYW5kIHBlcmltZXRlcnNcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBWYWx1ZSB7XG4gIHZhbDogbnVtYmVyLCAvLyB0aGUgbnVtZXJpY2FsIHZhbHVlXG4gIGxhYmVsPzogc3RyaW5nLCAvLyB0aGUgbGFiZWwgdG8gZGlzcGxheS4gZS5nLiBcIjMuNGNtXCJcbiAgc2hvdzogYm9vbGVhbiwgLy8gd2hldGhlciB0aGF0IHZhbHVlIGlzIHNob3duIGluIHRoZSBxdWVzdGlvbiBvciBhbnN3ZXIgYXQgYWxsXG4gIG1pc3Npbmc6IGJvb2xlYW4sIC8vIHdoZXRoZXIgdGhlIHZhbHVlIGlzIHNob3duIGluIHRoZSBxdWVzdGlvblxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWN0YW5nbGVBcmVhRGF0YSB7XG4gIHJlYWRvbmx5IGJhc2UgOiBWYWx1ZVxuICByZWFkb25seSBoZWlnaHQ6IFZhbHVlXG4gIHJlYWRvbmx5IHNob3dPcHBvc2l0ZXM6IGJvb2xlYW5cbiAgcHJpdmF0ZSByZWFkb25seSBkcDogbnVtYmVyXG4gIHByaXZhdGUgcmVhZG9ubHkgZGVub21pbmF0b3I6IG51bWJlciA9IDFcbiAgcHJpdmF0ZSBfYXJlYT86IFBhcnRpYWw8VmFsdWU+IC8vIGxhemlseSBjYWxjdWxhdGVkXG4gIHByaXZhdGUgX3BlcmltZXRlcj86IFBhcnRpYWw8VmFsdWU+XG5cbiAgY29uc3RydWN0b3IgKGJhc2U6IFZhbHVlLCBoZWlnaHQ6IFZhbHVlLCBzaG93T3Bwb3NpdGVzOiBib29sZWFuLCBkcDogbnVtYmVyLCBkZW5vbWluYXRvcjogbnVtYmVyLCBhcmVhUHJvcGVydGllcz86IE9taXQ8VmFsdWUsICd2YWwnPiwgcGVyaW1ldGVyUHJvcGVydGllcz86IE9taXQ8VmFsdWUsICd2YWwnPikge1xuICAgIHRoaXMuYmFzZSA9IGJhc2VcbiAgICB0aGlzLmhlaWdodCA9IGhlaWdodFxuICAgIHRoaXMuc2hvd09wcG9zaXRlcyA9IHNob3dPcHBvc2l0ZXNcbiAgICB0aGlzLmRwID0gZHBcbiAgICB0aGlzLmRlbm9taW5hdG9yID0gZGVub21pbmF0b3JcbiAgICB0aGlzLl9hcmVhID0gYXJlYVByb3BlcnRpZXNcbiAgICB0aGlzLl9wZXJpbWV0ZXIgPSBwZXJpbWV0ZXJQcm9wZXJ0aWVzXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBRdWVzdGlvbk9wdGlvbnMpIDogUmVjdGFuZ2xlQXJlYURhdGEge1xuICAgIG9wdGlvbnMubWF4TGVuZ3RoID0gb3B0aW9ucy5tYXhMZW5ndGggfHwgMjAgLy8gZGVmYXVsdCB2YWx1ZXNcbiAgICBjb25zdCBkcCA9IG9wdGlvbnMuZHAgfHwgMFxuICAgIGNvbnN0IGRlbm9taW5hdG9yID0gb3B0aW9ucy5mcmFjdGlvbj8gcmFuZEJldHdlZW4oMiw2KSA6IDFcblxuICAgIGNvbnN0IHNpZGVzID0ge1xuICAgICAgYmFzZTogcmFuZEJldHdlZW4oMSwgb3B0aW9ucy5tYXhMZW5ndGgpLFxuICAgICAgaGVpZ2h0OiByYW5kQmV0d2VlbigxLCBvcHRpb25zLm1heExlbmd0aClcbiAgICB9XG5cbiAgICBjb25zdCBiYXNlIDogVmFsdWUgPVxuICAgICAgeyB2YWw6IHNpZGVzLmJhc2UsIHNob3c6IHRydWUsIG1pc3Npbmc6IGZhbHNlLCBsYWJlbDogc2NhbGVkU3RyKHNpZGVzLmJhc2UsZHApICsgXCJcXFxcbWF0aHJte2NtfVwiIH1cbiAgICBjb25zdCBoZWlnaHQgOiBWYWx1ZSA9XG4gICAgICB7IHZhbDogc2lkZXMuaGVpZ2h0LCBzaG93OiB0cnVlLCBtaXNzaW5nOiBmYWxzZSAsbGFiZWw6IHNjYWxlZFN0cihzaWRlcy5oZWlnaHQsZHApICsgXCJcXFxcbWF0aHJte2NtfVwifVxuICAgIGlmIChkZW5vbWluYXRvciA+IDEpIHtcbiAgICAgIDtbYmFzZSwgaGVpZ2h0XS5mb3JFYWNoKHYgPT4ge1xuICAgICAgICB2LmxhYmVsID0gbmV3IGZyYWN0aW9uKHYudmFsLGRlbm9taW5hdG9yKS50b0xhdGV4KHRydWUpICsgJ1xcXFxtYXRocm17Y219J1xuICAgICAgfSlcbiAgICB9XG4gICAgbGV0IHNob3dPcHBvc2l0ZXMgOiBib29sZWFuXG4gICAgY29uc3QgYXJlYVByb3BlcnRpZXMgOiBQYXJ0aWFsPE9taXQ8VmFsdWUsICd2YWwnPj4gPSB7fVxuICAgIGNvbnN0IHBlcmltZXRlclByb3BlcnRpZXMgOiBQYXJ0aWFsPE9taXQ8VmFsdWUsICd2YWwnPj4gPSB7fVxuXG4gICAgLy8gc2VsZWN0aXZlbHkgaGlkZS9taXNzaW5nIGRlcGVuZGluZyBvbiB0eXBlXG4gICAgc3dpdGNoIChvcHRpb25zLnF1ZXN0aW9uVHlwZSkge1xuICAgICAgY2FzZSAnYXJlYSc6XG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIHNob3dPcHBvc2l0ZXMgPSAhb3B0aW9ucy5ub0Rpc3RyYWN0b3JzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdwZXJpbWV0ZXInOlxuICAgICAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMubWlzc2luZyA9IHRydWVcbiAgICAgICAgc2hvd09wcG9zaXRlcyA9IG9wdGlvbnMubm9EaXN0cmFjdG9yc1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSAncmV2ZXJzZUFyZWEnOlxuICAgICAgICBhcmVhUHJvcGVydGllcy5zaG93ID0gdHJ1ZVxuICAgICAgICBhcmVhUHJvcGVydGllcy5taXNzaW5nID0gZmFsc2VcbiAgICAgICAgcmFuZEVsZW0oW2Jhc2UsIGhlaWdodF0pLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIHNob3dPcHBvc2l0ZXMgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAncmV2ZXJzZVBlcmltZXRlcic6XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMubWlzc2luZyA9IGZhbHNlXG4gICAgICAgIHJhbmRFbGVtKFtiYXNlLCBoZWlnaHRdKS5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBzaG93T3Bwb3NpdGVzID0gZmFsc2VcbiAgICAgICAgYnJlYWtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IHRoaXMoYmFzZSwgaGVpZ2h0LCBzaG93T3Bwb3NpdGVzLCBkcCwgZGVub21pbmF0b3IsIGFyZWFQcm9wZXJ0aWVzIGFzIE9taXQ8VmFsdWUsICd2YWwnPiwgcGVyaW1ldGVyUHJvcGVydGllcyBhcyBPbWl0PFZhbHVlLCAndmFsJz4pXG4gIH1cblxuICBnZXQgcGVyaW1ldGVyICgpIDogVmFsdWUge1xuICAgIGlmICghdGhpcy5fcGVyaW1ldGVyKSB7XG4gICAgICB0aGlzLl9wZXJpbWV0ZXIgPSB7XG4gICAgICAgIHNob3c6IGZhbHNlLFxuICAgICAgICBtaXNzaW5nOiB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5fcGVyaW1ldGVyLnZhbCkge1xuICAgICAgdGhpcy5fcGVyaW1ldGVyLnZhbCA9IDIgKiAodGhpcy5iYXNlLnZhbCArIHRoaXMuaGVpZ2h0LnZhbClcbiAgICAgIGlmICh0aGlzLmRlbm9taW5hdG9yID4gMSkge1xuICAgICAgICB0aGlzLl9wZXJpbWV0ZXIubGFiZWwgPSBuZXcgZnJhY3Rpb24odGhpcy5fcGVyaW1ldGVyLnZhbCwgdGhpcy5kZW5vbWluYXRvcikudG9MYXRleCh0cnVlKSArICdcXFxcbWF0aHJte2NtfSdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3BlcmltZXRlci5sYWJlbCA9IHNjYWxlZFN0cih0aGlzLl9wZXJpbWV0ZXIudmFsLCB0aGlzLmRwKSArICdcXFxcbWF0aHJte2NtfSdcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3BlcmltZXRlciBhcyBWYWx1ZVxuICB9XG5cbiAgZ2V0IGFyZWEgKCkgOiBWYWx1ZSB7XG4gICAgaWYgKCF0aGlzLl9hcmVhKSB7XG4gICAgICB0aGlzLl9hcmVhID0ge1xuICAgICAgICBzaG93OiBmYWxzZSxcbiAgICAgICAgbWlzc2luZzogdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXRoaXMuX2FyZWEudmFsKSB7XG4gICAgICB0aGlzLl9hcmVhLnZhbCA9IHRoaXMuYmFzZS52YWwgKiB0aGlzLmhlaWdodC52YWxcbiAgICAgIGlmICh0aGlzLmRlbm9taW5hdG9yID4gMSkge1xuICAgICAgICB0aGlzLl9hcmVhLmxhYmVsID0gbmV3IGZyYWN0aW9uKHRoaXMuX2FyZWEudmFsLCB0aGlzLmRlbm9taW5hdG9yKioyKS50b0xhdGV4KHRydWUpICsgJ1xcXFxtYXRocm17Y219XjInXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9hcmVhLmxhYmVsID0gc2NhbGVkU3RyKHRoaXMuX2FyZWEudmFsLCAyICogdGhpcy5kcCkgKyAnXFxcXG1hdGhybXtjbX1eMidcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2FyZWEgYXMgVmFsdWVcbiAgfVxufVxuIiwiaW1wb3J0IHsgZHJhd1JpZ2h0QW5nbGUgfSBmcm9tICdkcmF3aW5nJ1xuaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUURhdGEsIEdyYXBoaWNRVmlldywgTGFiZWwgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4vdHlwZXMnXG5pbXBvcnQgUmVjdGFuZ2xlQXJlYURhdGEsIHsgVmFsdWUgfSBmcm9tICcuL1JlY3RhbmdsZUFyZWFEYXRhJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWN0YW5nbGVBcmVhVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIGRhdGEhOiBSZWN0YW5nbGVBcmVhRGF0YSAvLyBhc3NpZ25lZCBpbiBzdXBlclxuICBBOiBQb2ludFxuICBCOiBQb2ludFxuICBDOiBQb2ludFxuICBEOiBQb2ludFxuXG4gIGNvbnN0cnVjdG9yIChBOiBQb2ludCwgQjogUG9pbnQsIEM6IFBvaW50LCBEOiBQb2ludCwgbGFiZWxzOiBMYWJlbFtdLCBkYXRhOiBSZWN0YW5nbGVBcmVhRGF0YSwgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgLyogU3VwZXIgZG9lczpcbiAgICAgKiAgU2V0cyB0aGlzLndpZHRoIGFuZCB0aGlzLmhlaWdodFxuICAgICAqICBTZXRzIHRoaXMuZGF0YVxuICAgICAqICBDcmVhdGVzIERPTSBlbGVtZW50cywgaW5jbHVkaW5nIGNhbnZhc1xuICAgICAqICBDcmVhdGVzIGVtcHR5IHRoaXMubGFiZWxzIGxpc3RcbiAgICAgKi9cbiAgICBzdXBlcihkYXRhLCB2aWV3T3B0aW9ucykgLy8gaW5pdGlhbGlzZXMgdGhpcy5kYXRhXG4gICAgdGhpcy5BID0gQVxuICAgIHRoaXMuQiA9IEJcbiAgICB0aGlzLkMgPSBDXG4gICAgdGhpcy5EID0gRFxuICAgIHRoaXMubGFiZWxzID0gbGFiZWxzXG4gIH1cblxuICAvKipcbiAgICogU3RhdGljIGZhY3RvcnkgbWV0aG9kIHJldHVybmluZyB2aWV3IGZyb20gZGF0YVxuICAgKiBAcGFyYW0gZGF0YSBBIGRhdGEgb2JqZWN0LCB3aGljaCBoYWQgZGV0YWlscyBvZiB3aWR0aCwgaGVpZ2h0IGFuZCBhcmVhXG4gICAqIEBwYXJhbSB2aWV3T3B0aW9ucyBWaWV3IG9wdGlvbnMgLSBjb250YWluaW5nIHdpZHRoIGFuZCBoZWlnaHRcbiAgICovXG4gIHN0YXRpYyBmcm9tRGF0YSAoZGF0YTogUmVjdGFuZ2xlQXJlYURhdGEsIHZpZXdPcHRpb25zPzogVmlld09wdGlvbnMpIDogUmVjdGFuZ2xlQXJlYVZpZXcge1xuICAgIC8vIERlZmF1bHRzIChOQjogZHVwbGljYXRlcyBlZmZvcnQgaW4gY29uc3RydWN0b3IsIGdpdmVuIHVzZSBvZiBzdGF0aWMgZmFjdG9yeSBjb25zdHJ1Y3RvciBpbnN0ZWFkIG9mIEdyYXBoaWNRJ3MgbWV0aG9kKVxuICAgIHZpZXdPcHRpb25zID0gdmlld09wdGlvbnMgPz8ge31cbiAgICB2aWV3T3B0aW9ucy53aWR0aCA9IHZpZXdPcHRpb25zLndpZHRoID8/IDMwMFxuICAgIHZpZXdPcHRpb25zLmhlaWdodCA9IHZpZXdPcHRpb25zLmhlaWdodCA/PyAzMDBcblxuICAgIC8vIGluaXRpYWwgcG9pbnRzXG4gICAgY29uc3QgQSA9IG5ldyBQb2ludCgwLCAwKVxuICAgIGNvbnN0IEIgPSBuZXcgUG9pbnQoMCwgZGF0YS5oZWlnaHQudmFsKVxuICAgIGNvbnN0IEMgPSBuZXcgUG9pbnQoZGF0YS5iYXNlLnZhbCwgZGF0YS5oZWlnaHQudmFsKVxuICAgIGNvbnN0IEQgPSBuZXcgUG9pbnQoZGF0YS5iYXNlLnZhbCwgMClcblxuICAgIC8vIHJvdGF0ZSwgc2NhbGUgYW5kIGNlbnRlclxuICAgIGNvbnN0IHJvdGF0aW9uID0gdmlld09wdGlvbnMucm90YXRpb24gPz8gMiAqIE1hdGguUEkgKiBNYXRoLnJhbmRvbSgpXG4gICAgO1tBLCBCLCBDLCBEXS5mb3JFYWNoKHB0ID0+IHB0LnJvdGF0ZShyb3RhdGlvbikpXG4gICAgUG9pbnQuc2NhbGVUb0ZpdChbQSwgQiwgQywgRF0sIHZpZXdPcHRpb25zLndpZHRoLCB2aWV3T3B0aW9ucy5oZWlnaHQsIDEwMCwgWzAsMjBdKVxuXG4gICAgLy8gU2V0IHVwIGxhYmVsc1xuICAgIGNvbnN0IGxhYmVscyA6IExhYmVsW10gPSBbXVxuXG4gICAgY29uc3Qgc2lkZXMgOiBbUG9pbnQsIFBvaW50LCBWYWx1ZV1bXSA9IFsgLy8gWzFzdCBwb2ludCwgMm5kIHBvaW50LCBsZW5ndGhdXG4gICAgICBbQSwgQiwgZGF0YS5oZWlnaHRdLFxuICAgICAgW0IsIEMsIGRhdGEuYmFzZV1cbiAgICBdXG5cbiAgICBpZiAoZGF0YS5zaG93T3Bwb3NpdGVzKSB7XG4gICAgICBzaWRlcy5wdXNoKFtDLCBELCBkYXRhLmhlaWdodF0pXG4gICAgICBzaWRlcy5wdXNoKFtELCBBLCBkYXRhLmJhc2VdKVxuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwLCBuID0gc2lkZXMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7IC8vIHNpZGVzXG4gICAgICBpZiAoIXNpZGVzW2ldWzJdLnNob3cpIGNvbnRpbnVlXG4gICAgICBjb25zdCBvZmZzZXQgPSAyMFxuICAgICAgY29uc3QgcG9zID0gUG9pbnQubWVhbihzaWRlc1tpXVswXSwgc2lkZXNbaV1bMV0pXG4gICAgICBjb25zdCB1bml0dmVjID0gUG9pbnQudW5pdFZlY3RvcihzaWRlc1tpXVswXSwgc2lkZXNbaV1bMV0pXG5cbiAgICAgIHBvcy50cmFuc2xhdGUoLXVuaXR2ZWMueSAqIG9mZnNldCwgdW5pdHZlYy54ICogb2Zmc2V0KVxuXG4gICAgICBjb25zdCB0ZXh0YSA9IHNpZGVzW2ldWzJdLmxhYmVsID8/IHNpZGVzW2ldWzJdLnZhbC50b1N0cmluZygpXG4gICAgICBjb25zdCB0ZXh0cSA9IHNpZGVzW2ldWzJdLm1pc3NpbmcgPyAnPycgOiB0ZXh0YVxuICAgICAgY29uc3Qgc3R5bGVxID0gJ25vcm1hbCdcbiAgICAgIGNvbnN0IHN0eWxlYSA9IHNpZGVzW2ldWzJdLm1pc3NpbmcgPyAnYW5zd2VyJyA6ICdub3JtYWwnXG5cbiAgICAgIGxhYmVscy5wdXNoKHtcbiAgICAgICAgcG9zOiBwb3MsXG4gICAgICAgIHRleHRhOiB0ZXh0YSxcbiAgICAgICAgdGV4dHE6IHRleHRxLFxuICAgICAgICB0ZXh0OiB0ZXh0cSxcbiAgICAgICAgc3R5bGVhOiBzdHlsZWEsXG4gICAgICAgIHN0eWxlcTogc3R5bGVxLFxuICAgICAgICBzdHlsZTogc3R5bGVxXG4gICAgICB9KVxuICAgIH1cblxuICAgIGxldCBuSW5mbyA9IDBcbiAgICBpZiAoZGF0YS5hcmVhLnNob3cpIHtcbiAgICAgIGNvbnN0IHRleHRhID0gZGF0YS5hcmVhLmxhYmVsID8/IGRhdGEuYXJlYS52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSBkYXRhLmFyZWEubWlzc2luZyA/ICc/JyA6IHRleHRhXG4gICAgICBjb25zdCBzdHlsZXEgPSAnZXh0cmEtaW5mbydcbiAgICAgIGNvbnN0IHN0eWxlYSA9IGRhdGEuYXJlYS5taXNzaW5nID8gJ2V4dHJhLWFuc3dlcicgOiAnZXh0cmEtaW5mbydcbiAgICAgIGxhYmVscy5wdXNoKFxuICAgICAgICB7XG4gICAgICAgICAgdGV4dGE6ICdcXFxcdGV4dHtBcmVhfSA9ICcgKyB0ZXh0YSxcbiAgICAgICAgICB0ZXh0cTogJ1xcXFx0ZXh0e0FyZWF9ID0gJyArIHRleHRxLFxuICAgICAgICAgIHRleHQ6ICdcXFxcdGV4dHtBcmVhfSA9ICcgKyB0ZXh0cSxcbiAgICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgICBzdHlsZTogc3R5bGVxLFxuICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB2aWV3T3B0aW9ucy5oZWlnaHQgLSAxMCAtIDE1ICogbkluZm8pXG4gICAgICAgIH1cbiAgICAgIClcbiAgICAgIG5JbmZvKytcbiAgICB9XG5cbiAgICBpZiAoZGF0YS5wZXJpbWV0ZXIuc2hvdykge1xuICAgICAgY29uc3QgdGV4dGEgPSBkYXRhLnBlcmltZXRlci5sYWJlbCA/PyBkYXRhLnBlcmltZXRlci52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSBkYXRhLnBlcmltZXRlci5taXNzaW5nID8gJz8nIDogdGV4dGFcbiAgICAgIGNvbnN0IHN0eWxlcSA9ICdleHRyYS1pbmZvJ1xuICAgICAgY29uc3Qgc3R5bGVhID0gZGF0YS5wZXJpbWV0ZXIubWlzc2luZyA/ICdleHRyYS1hbnN3ZXInIDogJ2V4dHJhLWluZm8nXG4gICAgICBsYWJlbHMucHVzaChcbiAgICAgICAge1xuICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB2aWV3T3B0aW9ucy5oZWlnaHQgLSAxMCAtIDIwICogbkluZm8pLFxuICAgICAgICAgIHRleHRhOiAnXFxcXHRleHR7UGVyaW1ldGVyfSA9ICcgKyB0ZXh0YSxcbiAgICAgICAgICB0ZXh0cTogJ1xcXFx0ZXh0e1BlcmltZXRlcn0gPSAnICsgdGV4dHEsXG4gICAgICAgICAgdGV4dDogJ1xcXFx0ZXh0e1BlcmltZXRlcn0gPSAnICsgdGV4dHEsXG4gICAgICAgICAgc3R5bGVxOiBzdHlsZXEsXG4gICAgICAgICAgc3R5bGVhOiBzdHlsZWEsXG4gICAgICAgICAgc3R5bGU6IHN0eWxlcVxuICAgICAgICB9XG4gICAgICApXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBSZWN0YW5nbGVBcmVhVmlldyhBLCBCLCBDLCBELCBsYWJlbHMsIGRhdGEsIHZpZXdPcHRpb25zKVxuICB9XG5cbiAgcmVuZGVyICgpOiB2b2lkIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG4gICAgaWYgKGN0eCA9PT0gbnVsbCkgeyB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBnZXQgY29udGV4dCcpIH1cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpIC8vIGNsZWFyXG4gICAgY3R4LnNldExpbmVEYXNoKFtdKVxuXG4gICAgLy8gZHJhdyByZWN0YW5nbGVcbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBjdHgubW92ZVRvKHRoaXMuQS54LCB0aGlzLkEueSlcbiAgICBjdHgubGluZVRvKHRoaXMuQi54LCB0aGlzLkIueSlcbiAgICBjdHgubGluZVRvKHRoaXMuQy54LCB0aGlzLkMueSlcbiAgICBjdHgubGluZVRvKHRoaXMuRC54LCB0aGlzLkQueSlcbiAgICBjdHgubGluZVRvKHRoaXMuQS54LCB0aGlzLkEueSlcbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguZmlsbFN0eWxlID0gcmFuZEVsZW0oY29sb3JzKVxuICAgIGN0eC5maWxsKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIC8vIHJpZ2h0IGFuZ2xlc1xuICAgIGNvbnN0IHNpemUgPSBNYXRoLm1pbihcbiAgICAgIDE1LFxuICAgICAgTWF0aC5taW4oUG9pbnQuZGlzdGFuY2UodGhpcy5BLCB0aGlzLkIpLCBQb2ludC5kaXN0YW5jZSh0aGlzLkIsIHRoaXMuQykpIC8gM1xuICAgIClcbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBkcmF3UmlnaHRBbmdsZShjdHgsIHRoaXMuQSwgdGhpcy5CLCB0aGlzLkMsIHNpemUpXG4gICAgZHJhd1JpZ2h0QW5nbGUoY3R4LCB0aGlzLkIsIHRoaXMuQywgdGhpcy5ELCBzaXplKVxuICAgIGRyYXdSaWdodEFuZ2xlKGN0eCwgdGhpcy5DLCB0aGlzLkQsIHRoaXMuQSwgc2l6ZSlcbiAgICBkcmF3UmlnaHRBbmdsZShjdHgsIHRoaXMuRCwgdGhpcy5BLCB0aGlzLkIsIHNpemUpXG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICB0aGlzLnJlbmRlckxhYmVscygpXG4gIH1cbn1cbiIsImltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgUmVjdGFuZ2xlQXJlYURhdGEgZnJvbSAnLi9SZWN0YW5nbGVBcmVhRGF0YSdcbmltcG9ydCBSZWN0YW5nbGVBcmVhVmlldyBmcm9tICcuL1JlY3RhbmdsZUFyZWFWaWV3J1xuaW1wb3J0IHsgUXVlc3Rpb25PcHRpb25zIH0gZnJvbSAnLi90eXBlcydcblxuLy8gUmVjdGFuZ2xlIG5lZWRzIG5vIGZ1cnRoZXIgb3B0aW9uc1xuLy8gVHJpYW5nbGUgbmVlZHMgbm8gZnVydGhlciBvcHRpb25zIC0tIG5lZWRzIHBhc3NpbmcgaW5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjdGFuZ2xlQXJlYVEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGEhOiBSZWN0YW5nbGVBcmVhRGF0YSAvLyBpbml0aWFsaXNlZCBpbiBzdXBlcigpXG4gIHZpZXchOiBSZWN0YW5nbGVBcmVhVmlld1xuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgY29uc3QgZGF0YSA9IFJlY3RhbmdsZUFyZWFEYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBSZWN0YW5nbGVBcmVhVmlldy5mcm9tRGF0YShkYXRhLCB2aWV3T3B0aW9ucylcbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZXMnXG4gIH1cbn1cbiIsImltcG9ydCBmcmFjdGlvbiBmcm9tIFwiZnJhY3Rpb24uanNcIlxuaW1wb3J0IHsgcmFuZEJldHdlZW4sIHJhbmRFbGVtLCByYW5kUHl0aGFnVHJpcGxlLCByYW5kUHl0aGFnVHJpcGxlV2l0aExlZywgc2NhbGVkU3RyIH0gZnJvbSBcInV0aWxpdGllc1wiXG5pbXBvcnQgeyBWYWx1ZSB9IGZyb20gXCIuL1JlY3RhbmdsZUFyZWFEYXRhXCJcbmltcG9ydCB7IFF1ZXN0aW9uT3B0aW9ucyB9IGZyb20gXCIuL3R5cGVzXCJcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVHJhcGV6aXVtQXJlYURhdGEge1xuICBhOiBWYWx1ZSAvLyB0d28gcGFyYWxsZWwgc2lkZXNcbiAgYjogVmFsdWUgLy8gIFwiICAgXCJcIlxuICBoZWlnaHQ6IFZhbHVlXG4gIHNpZGUxOiBWYWx1ZSAvLyBTbGFudGVkIHNpZGVzXG4gIHNpZGUyOiBWYWx1ZVxuICBiMTogbnVtYmVyXG4gIGIyOiBudW1iZXJcbiAgcHJpdmF0ZSByZWFkb25seSBkcDogbnVtYmVyID0gMFxuICBwcml2YXRlIHJlYWRvbmx5IGRlbm9taW5hdG9yOiBudW1iZXIgPSAxXG4gIHByaXZhdGUgX2FyZWE/OiBQYXJ0aWFsPFZhbHVlPlxuICBwcml2YXRlIF9wZXJpbWV0ZXI/OiBQYXJ0aWFsPFZhbHVlPlxuICBjb25zdHJ1Y3RvcihhOiBWYWx1ZSxiOiBWYWx1ZSxoZWlnaHQ6IFZhbHVlLHNpZGUxOiBWYWx1ZSxzaWRlMjogVmFsdWUsIGIxOiBudW1iZXIsIGIyOiBudW1iZXIsIGRwOiBudW1iZXIsZGVub21pbmF0b3I6IG51bWJlcixwZXJpbWV0ZXJQcm9wZXJ0aWVzPzogUGFydGlhbDxWYWx1ZT4sYXJlYVByb3BlcnRpZXM/OiBQYXJ0aWFsPFZhbHVlPikge1xuICAgIHRoaXMuYSA9IGFcbiAgICB0aGlzLmIgPSBiXG4gICAgdGhpcy5oZWlnaHQgPSBoZWlnaHRcbiAgICB0aGlzLnNpZGUxID0gc2lkZTFcbiAgICB0aGlzLnNpZGUyID0gc2lkZTJcbiAgICB0aGlzLmIxID0gYjFcbiAgICB0aGlzLmIyID0gYjJcbiAgICB0aGlzLmRwID0gZHBcbiAgICB0aGlzLmRlbm9taW5hdG9yID0gZGVub21pbmF0b3JcbiAgICB0aGlzLl9wZXJpbWV0ZXIgPSBwZXJpbWV0ZXJQcm9wZXJ0aWVzXG4gICAgdGhpcy5fYXJlYSA9IGFyZWFQcm9wZXJ0aWVzXG4gIH1cblxuICBnZXQgcGVyaW1ldGVyICgpIDogVmFsdWUge1xuICAgIGlmICghdGhpcy5fcGVyaW1ldGVyKSB7XG4gICAgICB0aGlzLl9wZXJpbWV0ZXIgPSB7XG4gICAgICAgIHNob3c6IGZhbHNlLFxuICAgICAgICBtaXNzaW5nOiB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5fcGVyaW1ldGVyLnZhbCkge1xuICAgICAgdGhpcy5fcGVyaW1ldGVyLnZhbCA9IHRoaXMuYS52YWwgKyB0aGlzLmIudmFsICsgdGhpcy5zaWRlMS52YWwgKyB0aGlzLnNpZGUyLnZhbFxuICAgICAgaWYgKHRoaXMuZGVub21pbmF0b3IgPiAxKSB7XG4gICAgICAgIHRoaXMuX3BlcmltZXRlci5sYWJlbCA9IG5ldyBmcmFjdGlvbih0aGlzLl9wZXJpbWV0ZXIudmFsLCB0aGlzLmRlbm9taW5hdG9yKS50b0xhdGV4KHRydWUpICsgJ1xcXFxtYXRocm17Y219J1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcGVyaW1ldGVyLmxhYmVsID0gc2NhbGVkU3RyKHRoaXMuX3BlcmltZXRlci52YWwsIHRoaXMuZHApICsgJ1xcXFxtYXRocm17Y219J1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcGVyaW1ldGVyIGFzIFZhbHVlXG4gIH1cbiAgZ2V0IGFyZWEgKCk6IFZhbHVlIHtcbiAgICBpZiAoIXRoaXMuX2FyZWEpIHtcbiAgICAgIHRoaXMuX2FyZWEgPSB7XG4gICAgICAgIHNob3c6IGZhbHNlLFxuICAgICAgICBtaXNzaW5nOiB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5fYXJlYS52YWwpIHtcbiAgICAgIHRoaXMuX2FyZWEudmFsID0gdGhpcy5oZWlnaHQudmFsKih0aGlzLmEudmFsK3RoaXMuYi52YWwpLzJcbiAgICAgIGlmICh0aGlzLmRlbm9taW5hdG9yID4gMSkge1xuICAgICAgICB0aGlzLl9hcmVhLmxhYmVsID0gbmV3IGZyYWN0aW9uKHRoaXMuX2FyZWEudmFsLCB0aGlzLmRlbm9taW5hdG9yKioyKS50b0xhdGV4KHRydWUpICsgJ1xcXFxtYXRocm17Y219XjInXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9hcmVhLmxhYmVsID0gc2NhbGVkU3RyKHRoaXMuX2FyZWEudmFsLCAyICogdGhpcy5kcCkgKyAnXFxcXG1hdGhybXtjbX1eMidcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2FyZWEgYXMgVmFsdWVcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20ob3B0aW9uczogUmVxdWlyZWQ8UXVlc3Rpb25PcHRpb25zPikgOiBUcmFwZXppdW1BcmVhRGF0YSB7XG4gICAgY29uc3QgZHA6IG51bWJlciA9IG9wdGlvbnMuZHAgLy8gZG9uJ3QgYWN0dWFsbHkgc2NhbGUgLSBqdXN0IGRvIHRoaXMgaW4gZGlzcGxheVxuICAgIGNvbnN0IGRlbm9taW5hdG9yID0gb3B0aW9ucy5mcmFjdGlvbj8gcmFuZEJldHdlZW4oMiw2KSA6IDFcblxuICAgIGxldCBhVmFsdWUgOiBudW1iZXIgLy9zaG9ydGVkIHBhcmFsbGVsIHNpZGVcbiAgICBsZXQgYlZhbHVlIDogbnVtYmVyIC8vIGxvbmdlciBwYXJhbGxlbCBzaWRlXG4gICAgbGV0IHMxVmFsdWUgOiBudW1iZXJcbiAgICBsZXQgczJWYWx1ZTogbnVtYmVyXG4gICAgbGV0IGhWYWx1ZTogbnVtYmVyIC8vIGZpbmFsIHNpZGVzIGFuZCBoZWlnaHRcbiAgICBsZXQgYjE6IG51bWJlclxuICAgIGxldCBiMjogbnVtYmVyIC8vIGJpdHMgb2YgbG9uZ2VzdCBwYXJhbGxlbCBzaWRlLiBiPWErYjErYjJcbiAgICBsZXQgdHJpYW5nbGUxOiB7YTogbnVtYmVyLCBiOiBudW1iZXIsIGM6IG51bWJlcn1cbiAgICBsZXQgdHJpYW5nbGUyOiB7YTogbnVtYmVyLCBiOiBudW1iZXIsIGM6IG51bWJlcn0gLy8gdHdvIHJhIHRyaWFuZ2xlc1xuXG4gICAgdHJpYW5nbGUxID0gcmFuZFB5dGhhZ1RyaXBsZShvcHRpb25zLm1heExlbmd0aClcbiAgICBzMVZhbHVlID0gdHJpYW5nbGUxLmNcblxuICAgIGlmIChNYXRoLnJhbmRvbSgpIDwgMC41KSB7IC8vIHN0aWNrIGEgcmEgdHJpYW5nbGUgb24gb25lIHNpZGVcbiAgICAgIGhWYWx1ZSA9IHRyaWFuZ2xlMS5hXG4gICAgICBiMSA9IHRyaWFuZ2xlMS5iXG4gICAgfSBlbHNlIHtcbiAgICAgIGhWYWx1ZSA9IHRyaWFuZ2xlMS5iXG4gICAgICBiMSA9IHRyaWFuZ2xlMS5hXG4gICAgfVxuXG4gICAgaWYgKE1hdGgucmFuZG9tKCkgPCAwLjkpIHsgLy8gc3RpY2sgYSB0cmlhbmdsZSBvbiB0aGUgb3RoZXIgc2lkZVxuICAgICAgdHJpYW5nbGUyID0gcmFuZFB5dGhhZ1RyaXBsZVdpdGhMZWcoaFZhbHVlLCBvcHRpb25zLm1heExlbmd0aClcbiAgICAgIHMyVmFsdWUgPSB0cmlhbmdsZTIuY1xuICAgICAgYjIgPSB0cmlhbmdsZTIuYiAvLyB0cmkyLmEgPTogaFxuICAgIH0gZWxzZSB7IC8vIHJpZ2h0LWFuZ2xlZCB0cmFwZXppdW1cbiAgICAgIHMyVmFsdWUgPSBoVmFsdWVcbiAgICAgIGIyID0gMFxuICAgIH1cblxuICAgIC8vIEZpbmQgYSB2YWx1ZVxuICAgIGNvbnN0IE1JTlBST1AgPSA4IC8vIHRoZSBmaW5hbCBsZW5ndGggb2YgYSB3aXRoaCBiZSBhdCBsZWFzdCAoMS9NSU5QUk9QKSBvZiB0aGUgZmluYWwgbGVuZ3RoIG9mIGIuIEkuZS4gYSBpcyBtb3JlIHRoYW4gMS84IG9mIGJcbiAgICBjb25zdCBtYXhBVmFsdWUgPSBNYXRoLm1pbihvcHRpb25zLm1heExlbmd0aCAtIGIxIC0gYjIsIE1JTlBST1AqaFZhbHVlKVxuICAgIGNvbnN0IG1pbkFWYWx1ZSA9IE1hdGguY2VpbCgoYjErYjIpLyhNSU5QUk9QLTEpKVxuICAgIGNvbnNvbGUubG9nKClcbiAgICBpZiAobWF4QVZhbHVlIC0gbWluQVZhbHVlIDwgMSkgey8vIHdpbGwgb3ZlcnNob290IG1heExlbmd0aCBhIGJpXG4gICAgICBhVmFsdWUgPSBNYXRoLmZsb29yKG1pbkFWYWx1ZSlcbiAgICAgIGNvbnNvbGUud2FybihgT3ZlcnNob290aW5nIG1heCBsZW5ndGggYnkgbmVjZXNzaXR5LiBzMT0ke3MxVmFsdWV9LCBzMj0ke3MyVmFsdWV9LCBhPSR7YVZhbHVlfWApXG4gICAgfSBlbHNlIHtcbiAgICAgIGFWYWx1ZSA9IHJhbmRCZXR3ZWVuKG1pbkFWYWx1ZSxtYXhBVmFsdWUpXG4gICAgfSBcbiAgICBiVmFsdWUgPSBiMSArIGIyICsgYVZhbHVlXG5cbiAgICBjb25zdCBhOiBWYWx1ZSA9IHsgdmFsOiBhVmFsdWUsIHNob3c6IHRydWUsIG1pc3Npbmc6IGZhbHNlIH1cbiAgICBjb25zdCBiOiBWYWx1ZSA9IHsgdmFsOiBiVmFsdWUsIHNob3c6IHRydWUsIG1pc3Npbmc6IGZhbHNlIH1cbiAgICBjb25zdCBoZWlnaHQ6IFZhbHVlID0ge1xuICAgICAgdmFsOiBoVmFsdWUsXG4gICAgICBzaG93OiBzMlZhbHVlICE9PSBoVmFsdWUsIC8vIGRvbid0IHNob3cgaWYgcmlnaHQtYW5nbGVkXG4gICAgICBtaXNzaW5nOiBmYWxzZVxuICAgIH1cbiAgICBjb25zdCBzaWRlMTogVmFsdWUgPSB7IHZhbDogczFWYWx1ZSwgc2hvdzogdHJ1ZSwgbWlzc2luZzogZmFsc2UgfVxuICAgIGNvbnN0IHNpZGUyOiBWYWx1ZSA9IHsgdmFsOiBzMlZhbHVlLCBzaG93OiB0cnVlLCBtaXNzaW5nOiBmYWxzZSB9XG4gICAgY29uc3QgYXJlYVByb3BlcnRpZXM6IFBhcnRpYWw8VmFsdWU+ID0ge3Nob3c6IGZhbHNlLCBtaXNzaW5nOiBmYWxzZX1cbiAgICBjb25zdCBwZXJpbWV0ZXJQcm9wZXJ0aWVzOiBQYXJ0aWFsPFZhbHVlPiA9IHtzaG93OiBmYWxzZSwgbWlzc2luZzogZmFsc2V9XG5cbiAgICAvLyBzZWxlY3RpdmVseSBoaWRlL21pc3NpbmcgZGVwZW5kaW5nIG9uIHR5cGVcbiAgICBzd2l0Y2ggKG9wdGlvbnMucXVlc3Rpb25UeXBlKSB7XG4gICAgICBjYXNlICdhcmVhJzpcbiAgICAgICAgYXJlYVByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgYXJlYVByb3BlcnRpZXMubWlzc2luZyA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3BlcmltZXRlcic6XG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAncmV2ZXJzZUFyZWEnOiAvLyBoaWRlIG9uZSBvZiBiIG9yIGhlaWdodFxuICAgICAgICBhcmVhUHJvcGVydGllcy5zaG93ID0gdHJ1ZVxuICAgICAgICBhcmVhUHJvcGVydGllcy5taXNzaW5nID0gZmFsc2VcbiAgICAgICAgaWYgKE1hdGgucmFuZG9tKCkgPCAwLjMpIGhlaWdodC5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBlbHNlIGlmIChNYXRoLnJhbmRvbSgpIDwgMC41KSBiLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIGVsc2UgIGEubWlzc2luZyA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3JldmVyc2VQZXJpbWV0ZXInOlxuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMubWlzc2luZyA9IGZhbHNlXG4gICAgICAgIHJhbmRFbGVtKFtzaWRlMSxzaWRlMixhLGJdKS5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGxhYmVscyBmb3Igc2lkZXMgZGVwZW5kaW5nIG9uIGRwIGFuZCBkZW5vbWluYXRvciBzZXR0aW5nc1xuICAgIGlmIChkZW5vbWluYXRvciA9PT0gMSkge1xuICAgICAgW2EsYixzaWRlMSxzaWRlMixoZWlnaHRdLmZvckVhY2goIHYgPT4ge1xuICAgICAgICB2LmxhYmVsID0gc2NhbGVkU3RyKHYudmFsLCBkcCkgKyAnXFxcXG1hdGhybXtjbX0nXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICBbYSxiLHNpZGUxLHNpZGUyLGhlaWdodF0uZm9yRWFjaCggdiA9PiB7XG4gICAgICAgIHYubGFiZWwgPSBuZXcgZnJhY3Rpb24odi52YWwsIGRlbm9taW5hdG9yKS50b0xhdGV4KHRydWUpICsgJ1xcXFxtYXRocm17Y219J1xuICAgICAgfSlcbiAgICB9XG5cbiAgICAvLyB0dXJuIG9mIGRpc3RyYWN0b3JzIGlmIG5lY2Vzc2FyeVxuICAgIGlmIChvcHRpb25zLm5vRGlzdHJhY3RvcnMpIHtcbiAgICAgIGlmIChvcHRpb25zLnF1ZXN0aW9uVHlwZSA9PT0gJ2FyZWEnIHx8IG9wdGlvbnMucXVlc3Rpb25UeXBlID09PSAncmV2ZXJzZUFyZWEnKSB7XG4gICAgICAgIHNpZGUxLnNob3cgPSBmYWxzZVxuICAgICAgICBzaWRlMi5zaG93ID0gIWhlaWdodC5zaG93IC8vIHNob3cgb25seSBpZiBoZWlnaHQgaXMgYWxyZWFkeSBoaWRkZW4gKGkuZS4gaWYgcmlnaHQgYW5nbGVkKVxuICAgICAgfSBlbHNlIGlmIChvcHRpb25zLnF1ZXN0aW9uVHlwZT09PSAncGVyaW1ldGVyJyB8fCBvcHRpb25zLnF1ZXN0aW9uVHlwZSA9PT0gJ3JldmVyc2VQZXJpbWV0ZXInKSB7XG4gICAgICAgIGhlaWdodC5zaG93ID0gZmFsc2VcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFRyYXBleml1bUFyZWFEYXRhKGEsYixoZWlnaHQsc2lkZTEsc2lkZTIsYjEsYjIsZHAsZGVub21pbmF0b3IscGVyaW1ldGVyUHJvcGVydGllcyxhcmVhUHJvcGVydGllcylcblxuICB9XG59XG4iLCJpbXBvcnQgeyBhcnJvd0xpbmUsIGRyYXdSaWdodEFuZ2xlLCBwYXJhbGxlbFNpZ24gfSBmcm9tIFwiZHJhd2luZ1wiO1xuaW1wb3J0IFBvaW50IGZyb20gXCJQb2ludFwiO1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tIFwidXRpbGl0aWVzXCI7XG5pbXBvcnQgeyBHcmFwaGljUVZpZXcsIExhYmVsIH0gZnJvbSBcIi4uL0dyYXBoaWNRXCI7XG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSBcIi4uL1ZpZXdPcHRpb25zXCI7XG5pbXBvcnQgeyBWYWx1ZSB9IGZyb20gXCIuL1JlY3RhbmdsZUFyZWFEYXRhXCI7XG5pbXBvcnQgVHJhcGV6aXVtQXJlYURhdGEgZnJvbSBcIi4vVHJhcGV6aXVtQXJlYURhdGFcIjtcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRyYXBleml1bUFyZWFWaWV3IGV4dGVuZHMgR3JhcGhpY1FWaWV3IHtcbiAgZGF0YSE6IFRyYXBleml1bUFyZWFEYXRhXG4gIEE6IFBvaW50XG4gIEI6IFBvaW50XG4gIEM6IFBvaW50XG4gIEQ6IFBvaW50XG4gIGh0MTogUG9pbnRcbiAgaHQyOiBQb2ludFxuICBjb25zdHJ1Y3RvcihkYXRhOiBUcmFwZXppdW1BcmVhRGF0YSwgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zLCBBOiBQb2ludCwgQjogUG9pbnQsIEM6IFBvaW50LCBEOiBQb2ludCwgaHQxOiBQb2ludCwgaHQyOiBQb2ludCwgbGFiZWxzOiBMYWJlbFtdKSB7XG4gICAgc3VwZXIoZGF0YSx2aWV3T3B0aW9ucylcbiAgICB0aGlzLkEgPSBBXG4gICAgdGhpcy5CID0gQlxuICAgIHRoaXMuQyA9IENcbiAgICB0aGlzLkQgPSBEXG4gICAgdGhpcy5odDEgPSBodDFcbiAgICB0aGlzLmh0MiA9IGh0MlxuICAgIHRoaXMubGFiZWxzID0gbGFiZWxzXG4gIH1cblxuICBzdGF0aWMgZnJvbURhdGEoZGF0YTogVHJhcGV6aXVtQXJlYURhdGEsIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucykgOiBUcmFwZXppdW1BcmVhVmlldyB7XG4gICAgLy8gRGVmYXVsdHMgKE5COiBkdXBsaWNhdGVzIGVmZm9ydCBpbiBjb25zdHJ1Y3RvciwgZ2l2ZW4gdXNlIG9mIHN0YXRpYyBmYWN0b3J5IGNvbnN0cnVjdG9yIGluc3RlYWQgb2YgR3JhcGhpY1EncyBtZXRob2QpXG4gICAgdmlld09wdGlvbnMgPSB2aWV3T3B0aW9ucyA/PyB7fVxuICAgIHZpZXdPcHRpb25zLndpZHRoID0gdmlld09wdGlvbnMud2lkdGggPz8gMzAwXG4gICAgdmlld09wdGlvbnMuaGVpZ2h0ID0gdmlld09wdGlvbnMuaGVpZ2h0ID8/IDMwMFxuXG4gICAgLy8gaW5pdGlhbCBwb2ludHNcbiAgICBjb25zdCBBID0gbmV3IFBvaW50KDAsMCk7XG4gICAgY29uc3QgQiA9IG5ldyBQb2ludChkYXRhLmIxLGRhdGEuaGVpZ2h0LnZhbCk7XG4gICAgY29uc3QgQyA9IG5ldyBQb2ludChkYXRhLmIxK2RhdGEuYS52YWwsZGF0YS5oZWlnaHQudmFsKTtcbiAgICBjb25zdCBEID0gbmV3IFBvaW50KGRhdGEuYi52YWwsMCk7XG5cbiAgICBjb25zdCBodDEgPSBuZXcgUG9pbnQoZGF0YS5iMStkYXRhLmEudmFsLzIsZGF0YS5oZWlnaHQudmFsKTtcbiAgICBjb25zdCBodDIgPSBuZXcgUG9pbnQoZGF0YS5iMStkYXRhLmEudmFsLzIsMCk7XG5cbiAgICAvLyByb3RhdGVcblxuICAgIGNvbnN0IHJvdGF0aW9uID0gdmlld09wdGlvbnMucm90YXRpb24gPz8gMipNYXRoLlBJICogTWF0aC5yYW5kb20oKVxuICAgIDtbQSxCLEMsRCxodDEsaHQyXS5mb3JFYWNoKHB0ID0+IHB0LnJvdGF0ZShyb3RhdGlvbikpXG4gICAgUG9pbnQuc2NhbGVUb0ZpdChbQSxCLEMsRCxodDEsaHQyXSwgdmlld09wdGlvbnMud2lkdGgsIHZpZXdPcHRpb25zLmhlaWdodCwgMTAwLCBbMCwyMF0pXG5cblxuICAgIC8vIGxhYmVsc1xuICAgIGNvbnN0IGxhYmVscyA6IExhYmVsW10gPSBbXTtcblxuICAgIGNvbnN0IHNpZGVzIDogW1BvaW50LFBvaW50LFZhbHVlXVtdPSBbIC8vWzFzdCBwb2ludCwgMm5kIHBvaW50LCBsZW5ndGhdXG4gICAgICBbQSxCLGRhdGEuc2lkZTFdLFxuICAgICAgW0IsQyxkYXRhLmFdLFxuICAgICAgW0MsRCxkYXRhLnNpZGUyXSxcbiAgICAgIFtELEEsZGF0YS5iXSxcbiAgICAgIFtodDEsaHQyLGRhdGEuaGVpZ2h0XVxuICAgIF07XG5cbiAgICBmb3IgKGxldCBpID0gMCwgbj1zaWRlcy5sZW5ndGg7IGkgPCBuOyBpKyspIHsgLy9zaWRlc1xuICAgICAgaWYgKCFzaWRlc1tpXVsyXS5zaG93KSBjb250aW51ZTtcbiAgICAgIGNvbnN0IG9mZnNldCA9IDI1O1xuICAgICAgbGV0IHBvcyA9IFBvaW50Lm1lYW4oc2lkZXNbaV1bMF0sc2lkZXNbaV1bMV0pO1xuICAgICAgY29uc3QgdW5pdHZlYyA9IFBvaW50LnVuaXRWZWN0b3Ioc2lkZXNbaV1bMF0sIHNpZGVzW2ldWzFdKTtcbiAgICAgIFxuICAgICAgcG9zLnRyYW5zbGF0ZSgtdW5pdHZlYy55Km9mZnNldCwgdW5pdHZlYy54Km9mZnNldCk7IFxuXG4gICAgICBjb25zdCB0ZXh0YSA9IHNpZGVzW2ldWzJdLmxhYmVsID8/IHNpZGVzW2ldWzJdLnZhbC50b1N0cmluZygpXG4gICAgICBjb25zdCB0ZXh0cSA9IHNpZGVzW2ldWzJdLm1pc3Npbmc/IFwiP1wiIDogdGV4dGE7XG4gICAgICBjb25zdCBzdHlsZXEgPSBcIm5vcm1hbFwiO1xuICAgICAgY29uc3Qgc3R5bGVhID0gc2lkZXNbaV1bMl0ubWlzc2luZz8gXCJhbnN3ZXJcIiA6IFwibm9ybWFsXCI7XG5cbiAgICAgIGxhYmVscy5wdXNoKHtcbiAgICAgICAgcG9zOiBwb3MsXG4gICAgICAgIHRleHRhOiB0ZXh0YSxcbiAgICAgICAgdGV4dHE6IHRleHRxLFxuICAgICAgICB0ZXh0OiB0ZXh0cSxcbiAgICAgICAgc3R5bGVhOiBzdHlsZWEsXG4gICAgICAgIHN0eWxlcTogc3R5bGVxLFxuICAgICAgICBzdHlsZTogc3R5bGVxXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBsZXQgbl9pbmZvID0gMDtcbiAgICBpZiAoZGF0YS5hcmVhLnNob3cpIHtcbiAgICAgIGNvbnN0IHRleHRhID0gZGF0YS5hcmVhLmxhYmVsID8/IGRhdGEuYXJlYS52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSBkYXRhLmFyZWEubWlzc2luZz8gXCI/XCIgOiB0ZXh0YTtcbiAgICAgIGNvbnN0IHN0eWxlcSA9IFwiZXh0cmEtaW5mb1wiO1xuICAgICAgY29uc3Qgc3R5bGVhID0gZGF0YS5hcmVhLm1pc3Npbmc/IFwiZXh0cmEtYW5zd2VyXCIgOiBcImV4dHJhLWluZm9cIjtcbiAgICAgIGxhYmVscy5wdXNoKFxuICAgICAgICB7XG4gICAgICAgICAgdGV4dGE6IFwiXFxcXHRleHR7QXJlYX0gPSBcIiArIHRleHRhLFxuICAgICAgICAgIHRleHRxOiBcIlxcXFx0ZXh0e0FyZWF9ID0gXCIgKyB0ZXh0cSxcbiAgICAgICAgICB0ZXh0OiBcIlxcXFx0ZXh0e0FyZWF9ID0gXCIgKyB0ZXh0cSxcbiAgICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgICBzdHlsZTogc3R5bGVxLFxuICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB2aWV3T3B0aW9ucy5oZWlnaHQgLSAxMCAtIDIwKm5faW5mbyksXG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgICBuX2luZm8rKztcbiAgICB9XG4gICAgaWYgKGRhdGEucGVyaW1ldGVyLnNob3cpIHtcbiAgICAgIGNvbnN0IHRleHRhID0gZGF0YS5wZXJpbWV0ZXIubGFiZWwgPz8gZGF0YS5wZXJpbWV0ZXIudmFsLnRvU3RyaW5nKClcbiAgICAgIGNvbnN0IHRleHRxID0gZGF0YS5wZXJpbWV0ZXIubWlzc2luZz8gXCI/XCIgOiB0ZXh0YTtcbiAgICAgIGNvbnN0IHN0eWxlcSA9IFwiZXh0cmEtaW5mb1wiO1xuICAgICAgY29uc3Qgc3R5bGVhID0gZGF0YS5wZXJpbWV0ZXIubWlzc2luZz8gXCJleHRyYS1hbnN3ZXJcIiA6IFwiZXh0cmEtaW5mb1wiO1xuICAgICAgbGFiZWxzLnB1c2goXG4gICAgICAgIHtcbiAgICAgICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdmlld09wdGlvbnMuaGVpZ2h0IC0gMTAgLSAyMCpuX2luZm8pLFxuICAgICAgICAgIHRleHRhOiBcIlxcXFx0ZXh0e1BlcmltZXRlcn0gPSBcIiArIHRleHRhLFxuICAgICAgICAgIHRleHRxOiBcIlxcXFx0ZXh0e1BlcmltZXRlcn0gPSBcIiArIHRleHRxLFxuICAgICAgICAgIHRleHQ6IFwiXFxcXHRleHR7UGVyaW1ldGVyfSA9IFwiICsgdGV4dHEsXG4gICAgICAgICAgc3R5bGVxOiBzdHlsZXEsXG4gICAgICAgICAgc3R5bGVhOiBzdHlsZWEsXG4gICAgICAgICAgc3R5bGU6IHN0eWxlcSxcbiAgICAgICAgfVxuICAgICAgKVxuICAgIH1cbiAgICByZXR1cm4gbmV3IFRyYXBleml1bUFyZWFWaWV3KGRhdGEsdmlld09wdGlvbnMsQSxCLEMsRCxodDEsaHQyLGxhYmVscylcbiAgfVxuXG4gIHJlbmRlcigpIDogdm9pZCB7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuICAgIGlmICghY3R4KSB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBnZXQgY2FudmFzIGNvbnRleHQnKVxuICAgIGN0eC5jbGVhclJlY3QoMCwwLHRoaXMuY2FudmFzLndpZHRoLHRoaXMuY2FudmFzLmhlaWdodCk7IC8vIGNsZWFyXG4gICAgY3R4LnNldExpbmVEYXNoKFtdKTtcblxuICAgIC8vIGRyYXcgcGFyYWxsZWxvZ3JhbVxuICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICBjdHgubW92ZVRvKHRoaXMuQS54LHRoaXMuQS55KTtcbiAgICBjdHgubGluZVRvKHRoaXMuQi54LHRoaXMuQi55KTtcbiAgICBjdHgubGluZVRvKHRoaXMuQy54LHRoaXMuQy55KTtcbiAgICBjdHgubGluZVRvKHRoaXMuRC54LHRoaXMuRC55KTtcbiAgICBjdHgubGluZVRvKHRoaXMuQS54LHRoaXMuQS55KTtcbiAgICBjdHguc3Ryb2tlKCk7XG4gICAgY3R4LmZpbGxTdHlsZT1yYW5kRWxlbShjb2xvcnMpXG4gICAgY3R4LmZpbGwoKTtcbiAgICBjdHguY2xvc2VQYXRoKCk7XG5cbiAgICAvLyBwYXJhbGxlbCBzaWducyBcbiAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgcGFyYWxsZWxTaWduKGN0eCx0aGlzLkIsdGhpcy5odDEsNSk7XG4gICAgcGFyYWxsZWxTaWduKGN0eCx0aGlzLkEsdGhpcy5odDIsNSk7XG4gICAgY3R4LnN0cm9rZSgpO1xuICAgIGN0eC5jbG9zZVBhdGgoKTtcblxuICAgIC8vIGRyYXcgaGVpZ2h0XG4gICAgaWYgKHRoaXMuZGF0YS5oZWlnaHQuc2hvdykge1xuICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgYXJyb3dMaW5lKGN0eCwgUG9pbnQubWVhbih0aGlzLmh0MSx0aGlzLmh0MiksdGhpcy5odDEsIDgpO1xuICAgICAgYXJyb3dMaW5lKGN0eCwgUG9pbnQubWVhbih0aGlzLmh0MSx0aGlzLmh0MiksdGhpcy5odDIsIDgpO1xuICAgICAgY3R4LnN0cm9rZSgpO1xuICAgICAgY3R4LmNsb3NlUGF0aCgpO1xuXG4gICAgICAvLyBSQSBzeW1ib2xcbiAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgIGN0eC5zZXRMaW5lRGFzaChbXSk7XG4gICAgICBkcmF3UmlnaHRBbmdsZShjdHgsdGhpcy5odDEsdGhpcy5odDIsdGhpcy5ELCAxMik7XG4gICAgICBjdHguc3Ryb2tlKCk7XG4gICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgfVxuXG4gICAgLy8gcmEgc3ltYm9sIGZvciByaWdodCBhbmdsZWQgdHJhcGV6aWFcbiAgICBpZih0aGlzLmRhdGEuaGVpZ2h0LnZhbCA9PT0gdGhpcy5kYXRhLnNpZGUyLnZhbCkge1xuICAgICAgY3R4LmJlZ2luUGF0aCgpXG4gICAgICBkcmF3UmlnaHRBbmdsZShjdHgsIHRoaXMuQiwgdGhpcy5DLCB0aGlzLkQsIDEyKVxuICAgICAgZHJhd1JpZ2h0QW5nbGUoY3R4LCB0aGlzLkMsIHRoaXMuRCwgdGhpcy5BLCAxMilcbiAgICAgIGN0eC5zdHJva2UoKVxuICAgIH1cblxuICAgIHRoaXMucmVuZGVyTGFiZWxzKClcbiAgfVxufSIsImltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgVHJhcGV6aXVtQXJlYURhdGEgZnJvbSAnLi9UcmFwZXppdW1BcmVhRGF0YSdcbmltcG9ydCBUcmFwZXppdW1BcmVhVmlldyBmcm9tICcuL1RyYXBleml1bUFyZWFWaWV3J1xuaW1wb3J0IHsgUXVlc3Rpb25PcHRpb25zIH0gZnJvbSAnLi90eXBlcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVHJhcGV6aXVtQXJlYVEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGEhOiBUcmFwZXppdW1BcmVhRGF0YSAvLyBpbml0aWFsaXNlZCBpbiBzdXBlcigpXG4gIHZpZXchOiBUcmFwZXppdW1BcmVhVmlld1xuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFJlcXVpcmVkPFF1ZXN0aW9uT3B0aW9ucz4sIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucykge1xuICAgIGNvbnN0IGRhdGEgPSBUcmFwZXppdW1BcmVhRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gVHJhcGV6aXVtQXJlYVZpZXcuZnJvbURhdGEoZGF0YSx2aWV3T3B0aW9ucylcbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZXMnXG4gIH1cbn0iLCIvKiEgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcclxuQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uXHJcblxyXG5QZXJtaXNzaW9uIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBhbmQvb3IgZGlzdHJpYnV0ZSB0aGlzIHNvZnR3YXJlIGZvciBhbnlcclxucHVycG9zZSB3aXRoIG9yIHdpdGhvdXQgZmVlIGlzIGhlcmVieSBncmFudGVkLlxyXG5cclxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiBBTkQgVEhFIEFVVEhPUiBESVNDTEFJTVMgQUxMIFdBUlJBTlRJRVMgV0lUSFxyXG5SRUdBUkQgVE8gVEhJUyBTT0ZUV0FSRSBJTkNMVURJTkcgQUxMIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFlcclxuQU5EIEZJVE5FU1MuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1IgQkUgTElBQkxFIEZPUiBBTlkgU1BFQ0lBTCwgRElSRUNULFxyXG5JTkRJUkVDVCwgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTIE9SIEFOWSBEQU1BR0VTIFdIQVRTT0VWRVIgUkVTVUxUSU5HIEZST01cclxuTE9TUyBPRiBVU0UsIERBVEEgT1IgUFJPRklUUywgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIE5FR0xJR0VOQ0UgT1JcclxuT1RIRVIgVE9SVElPVVMgQUNUSU9OLCBBUklTSU5HIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFVTRSBPUlxyXG5QRVJGT1JNQU5DRSBPRiBUSElTIFNPRlRXQVJFLlxyXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiAqL1xyXG4vKiBnbG9iYWwgUmVmbGVjdCwgUHJvbWlzZSAqL1xyXG5cclxudmFyIGV4dGVuZFN0YXRpY3MgPSBmdW5jdGlvbihkLCBiKSB7XHJcbiAgICBleHRlbmRTdGF0aWNzID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8XHJcbiAgICAgICAgKHsgX19wcm90b19fOiBbXSB9IGluc3RhbmNlb2YgQXJyYXkgJiYgZnVuY3Rpb24gKGQsIGIpIHsgZC5fX3Byb3RvX18gPSBiOyB9KSB8fFxyXG4gICAgICAgIGZ1bmN0aW9uIChkLCBiKSB7IGZvciAodmFyIHAgaW4gYikgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChiLCBwKSkgZFtwXSA9IGJbcF07IH07XHJcbiAgICByZXR1cm4gZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2V4dGVuZHMoZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xyXG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcclxuICAgIHZhciB0ID0ge307XHJcbiAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICB0W3BdID0gc1twXTtcclxuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcclxuICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgIH1cclxuICAgIHJldHVybiB0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5tZXRhZGF0YSA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gUmVmbGVjdC5tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0ZXIodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19nZW5lcmF0b3IodGhpc0FyZywgYm9keSkge1xyXG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZztcclxuICAgIHJldHVybiBnID0geyBuZXh0OiB2ZXJiKDApLCBcInRocm93XCI6IHZlcmIoMSksIFwicmV0dXJuXCI6IHZlcmIoMikgfSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKG9wKSB7XHJcbiAgICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xyXG4gICAgICAgIHdoaWxlIChfKSB0cnkge1xyXG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XHJcbiAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcclxuICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XHJcbiAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19jcmVhdGVCaW5kaW5nID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9KTtcclxufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICBvW2syXSA9IG1ba107XHJcbn0pO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXhwb3J0U3RhcihtLCBvKSB7XHJcbiAgICBmb3IgKHZhciBwIGluIG0pIGlmIChwICE9PSBcImRlZmF1bHRcIiAmJiAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIHApKSBfX2NyZWF0ZUJpbmRpbmcobywgbSwgcCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3ZhbHVlcyhvKSB7XHJcbiAgICB2YXIgcyA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBTeW1ib2wuaXRlcmF0b3IsIG0gPSBzICYmIG9bc10sIGkgPSAwO1xyXG4gICAgaWYgKG0pIHJldHVybiBtLmNhbGwobyk7XHJcbiAgICBpZiAobyAmJiB0eXBlb2Ygby5sZW5ndGggPT09IFwibnVtYmVyXCIpIHJldHVybiB7XHJcbiAgICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAobyAmJiBpID49IG8ubGVuZ3RoKSBvID0gdm9pZCAwO1xyXG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogbyAmJiBvW2krK10sIGRvbmU6ICFvIH07XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IocyA/IFwiT2JqZWN0IGlzIG5vdCBpdGVyYWJsZS5cIiA6IFwiU3ltYm9sLml0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVhZChvLCBuKSB7XHJcbiAgICB2YXIgbSA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvW1N5bWJvbC5pdGVyYXRvcl07XHJcbiAgICBpZiAoIW0pIHJldHVybiBvO1xyXG4gICAgdmFyIGkgPSBtLmNhbGwobyksIHIsIGFyID0gW10sIGU7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHdoaWxlICgobiA9PT0gdm9pZCAwIHx8IG4tLSA+IDApICYmICEociA9IGkubmV4dCgpKS5kb25lKSBhci5wdXNoKHIudmFsdWUpO1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGVycm9yKSB7IGUgPSB7IGVycm9yOiBlcnJvciB9OyB9XHJcbiAgICBmaW5hbGx5IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAociAmJiAhci5kb25lICYmIChtID0gaVtcInJldHVyblwiXSkpIG0uY2FsbChpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZmluYWxseSB7IGlmIChlKSB0aHJvdyBlLmVycm9yOyB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZCgpIHtcclxuICAgIGZvciAodmFyIGFyID0gW10sIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgIGFyID0gYXIuY29uY2F0KF9fcmVhZChhcmd1bWVudHNbaV0pKTtcclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXlzKCkge1xyXG4gICAgZm9yICh2YXIgcyA9IDAsIGkgPSAwLCBpbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBpbDsgaSsrKSBzICs9IGFyZ3VtZW50c1tpXS5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciByID0gQXJyYXkocyksIGsgPSAwLCBpID0gMDsgaSA8IGlsOyBpKyspXHJcbiAgICAgICAgZm9yICh2YXIgYSA9IGFyZ3VtZW50c1tpXSwgaiA9IDAsIGpsID0gYS5sZW5ndGg7IGogPCBqbDsgaisrLCBrKyspXHJcbiAgICAgICAgICAgIHJba10gPSBhW2pdO1xyXG4gICAgcmV0dXJuIHI7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdCh2KSB7XHJcbiAgICByZXR1cm4gdGhpcyBpbnN0YW5jZW9mIF9fYXdhaXQgPyAodGhpcy52ID0gdiwgdGhpcykgOiBuZXcgX19hd2FpdCh2KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNHZW5lcmF0b3IodGhpc0FyZywgX2FyZ3VtZW50cywgZ2VuZXJhdG9yKSB7XHJcbiAgICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgdmFyIGcgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSksIGksIHEgPSBbXTtcclxuICAgIHJldHVybiBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobikgeyBpZiAoZ1tuXSkgaVtuXSA9IGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAoYSwgYikgeyBxLnB1c2goW24sIHYsIGEsIGJdKSA+IDEgfHwgcmVzdW1lKG4sIHYpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gcmVzdW1lKG4sIHYpIHsgdHJ5IHsgc3RlcChnW25dKHYpKTsgfSBjYXRjaCAoZSkgeyBzZXR0bGUocVswXVszXSwgZSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gc3RlcChyKSB7IHIudmFsdWUgaW5zdGFuY2VvZiBfX2F3YWl0ID8gUHJvbWlzZS5yZXNvbHZlKHIudmFsdWUudikudGhlbihmdWxmaWxsLCByZWplY3QpIDogc2V0dGxlKHFbMF1bMl0sIHIpOyB9XHJcbiAgICBmdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7IHJlc3VtZShcIm5leHRcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiByZWplY3QodmFsdWUpIHsgcmVzdW1lKFwidGhyb3dcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUoZiwgdikgeyBpZiAoZih2KSwgcS5zaGlmdCgpLCBxLmxlbmd0aCkgcmVzdW1lKHFbMF1bMF0sIHFbMF1bMV0pOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jRGVsZWdhdG9yKG8pIHtcclxuICAgIHZhciBpLCBwO1xyXG4gICAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiLCBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9KSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpW25dID0gb1tuXSA/IGZ1bmN0aW9uICh2KSB7IHJldHVybiAocCA9ICFwKSA/IHsgdmFsdWU6IF9fYXdhaXQob1tuXSh2KSksIGRvbmU6IG4gPT09IFwicmV0dXJuXCIgfSA6IGYgPyBmKHYpIDogdjsgfSA6IGY7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNWYWx1ZXMobykge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBtID0gb1tTeW1ib2wuYXN5bmNJdGVyYXRvcl0sIGk7XHJcbiAgICByZXR1cm4gbSA/IG0uY2FsbChvKSA6IChvID0gdHlwZW9mIF9fdmFsdWVzID09PSBcImZ1bmN0aW9uXCIgPyBfX3ZhbHVlcyhvKSA6IG9bU3ltYm9sLml0ZXJhdG9yXSgpLCBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaSk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaVtuXSA9IG9bbl0gJiYgZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHsgdiA9IG9bbl0odiksIHNldHRsZShyZXNvbHZlLCByZWplY3QsIHYuZG9uZSwgdi52YWx1ZSk7IH0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCBkLCB2KSB7IFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGZ1bmN0aW9uKHYpIHsgcmVzb2x2ZSh7IHZhbHVlOiB2LCBkb25lOiBkIH0pOyB9LCByZWplY3QpOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX21ha2VUZW1wbGF0ZU9iamVjdChjb29rZWQsIHJhdykge1xyXG4gICAgaWYgKE9iamVjdC5kZWZpbmVQcm9wZXJ0eSkgeyBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29va2VkLCBcInJhd1wiLCB7IHZhbHVlOiByYXcgfSk7IH0gZWxzZSB7IGNvb2tlZC5yYXcgPSByYXc7IH1cclxuICAgIHJldHVybiBjb29rZWQ7XHJcbn07XHJcblxyXG52YXIgX19zZXRNb2R1bGVEZWZhdWx0ID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XHJcbn0pIDogZnVuY3Rpb24obywgdikge1xyXG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0U3Rhcihtb2QpIHtcclxuICAgIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XHJcbiAgICB2YXIgcmVzdWx0ID0ge307XHJcbiAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgaW4gbW9kKSBpZiAoayAhPT0gXCJkZWZhdWx0XCIgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1vZCwgaykpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwgayk7XHJcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0RGVmYXVsdChtb2QpIHtcclxuICAgIHJldHVybiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSA/IG1vZCA6IHsgZGVmYXVsdDogbW9kIH07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0KHJlY2VpdmVyLCBwcml2YXRlTWFwKSB7XHJcbiAgICBpZiAoIXByaXZhdGVNYXAuaGFzKHJlY2VpdmVyKSkge1xyXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJhdHRlbXB0ZWQgdG8gZ2V0IHByaXZhdGUgZmllbGQgb24gbm9uLWluc3RhbmNlXCIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHByaXZhdGVNYXAuZ2V0KHJlY2VpdmVyKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRTZXQocmVjZWl2ZXIsIHByaXZhdGVNYXAsIHZhbHVlKSB7XHJcbiAgICBpZiAoIXByaXZhdGVNYXAuaGFzKHJlY2VpdmVyKSkge1xyXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJhdHRlbXB0ZWQgdG8gc2V0IHByaXZhdGUgZmllbGQgb24gbm9uLWluc3RhbmNlXCIpO1xyXG4gICAgfVxyXG4gICAgcHJpdmF0ZU1hcC5zZXQocmVjZWl2ZXIsIHZhbHVlKTtcclxuICAgIHJldHVybiB2YWx1ZTtcclxufVxyXG4iLCJpbXBvcnQgeyByYW5kRWxlbSwgcmFuZE11bHRCZXR3ZWVuIH0gZnJvbSAnLi91dGlsaXRpZXMuanMnXG5cbmNvbnN0IHBhdGhSb290ID0gJy9kaXN0LydcblxudHlwZSBpbmRleFZhbHMgPSAnMTAwJyB8ICcyMDAnIHwgJzMwMCcgfCAnNDAwJyB8ICc1MDAnXG5cbmV4cG9ydCBpbnRlcmZhY2UgVHJpYW5nbGV7XG4gIGI6IG51bWJlcixcbiAgczE6IG51bWJlcixcbiAgczI6IG51bWJlcixcbiAgaDogbnVtYmVyXG59XG5cbmludGVyZmFjZSBkYXRhU291cmNlIHtcbiAgcmVhZG9ubHkgbGVuZ3RoOiBudW1iZXIsXG4gIHJlYWRvbmx5IHBhdGg6IHN0cmluZyxcbiAgc3RhdHVzOiAndW5jYWNoZWQnIHwgJ2NhY2hlZCcgfCAncGVuZGluZycsXG4gIGRhdGE6IFRyaWFuZ2xlW10sXG4gIHF1ZXVlOiB7XG4gICAgY2FsbGJhY2s6ICh0OiBUcmlhbmdsZSkgPT4gdm9pZCxcbiAgICBtYXhMZW5ndGg6IG51bWJlcixcbiAgICBmaWx0ZXI/OiAodDogVHJpYW5nbGUpID0+IGJvb2xlYW5cbiAgfVtdXG59XG5cblxuY29uc3QgZGF0YVNvdXJjZXMgOiBSZWNvcmQ8aW5kZXhWYWxzLCBkYXRhU291cmNlPiA9IHtcbiAgMTAwOiB7XG4gICAgbGVuZ3RoOiAzNjEsXG4gICAgcGF0aDogJy9kYXRhL3RyaWFuZ2xlczAtMTAwLmpzb24nLFxuICAgIHN0YXR1czogJ3VuY2FjaGVkJyxcbiAgICBkYXRhOiBbXSxcbiAgICBxdWV1ZTogW11cbiAgfSxcbiAgMjAwOiB7XG4gICAgbGVuZ3RoOiA3MTUsXG4gICAgcGF0aDogJy9kYXRhL3RyaWFuZ2xlczEwMC0yMDAuanNvbicsXG4gICAgc3RhdHVzOiAndW5jYWNoZWQnLFxuICAgIGRhdGE6IFtdLFxuICAgIHF1ZXVlOiBbXVxuICB9LFxuICAzMDA6IHtcbiAgICBsZW5ndGg6IDkyNyxcbiAgICBwYXRoOiAnL2RhdGEvdHJpYW5nbGVzMjAwLTMwMC5qc29uJyxcbiAgICBzdGF0dXM6ICd1bmNhY2hlZCcsXG4gICAgZGF0YTogW10sXG4gICAgcXVldWU6IFtdXG4gIH0sXG4gIDQwMDoge1xuICAgIGxlbmd0aDogMTA0MyxcbiAgICBwYXRoOiAnL2RhdGEvdHJpYW5nbGVzMzAwLTQwMC5qc29uJyxcbiAgICBzdGF0dXM6ICd1bmNhY2hlZCcsXG4gICAgZGF0YTogW10sXG4gICAgcXVldWU6IFtdXG4gIH0sXG4gIDUwMDoge1xuICAgIGxlbmd0aDogMTE1MSxcbiAgICBwYXRoOiAnL2RhdGEvdHJpYW5nbGVzNDAwLTUwMC5qc29uJyxcbiAgICBzdGF0dXM6ICd1bmNhY2hlZCcsXG4gICAgZGF0YTogW10sXG4gICAgcXVldWU6IFtdXG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm4gYSBwcm9taXNlIHRvIGEgcmFuZG9tbHkgY2hvc2VuIHRyaWFuZ2xlIChzZWUgdHJpYW5nbGVEYXRhLlRyaWFuZ2xlIGludGVyZmFjZSBmb3IgZm9ybWF0KVxuICogQHBhcmFtIG1heExlbmd0aCBNYXh1bXVtIGxlbmd0aCBvZiBzaWRlXG4gKiBAcGFyYW0gZmlsdGVyUHJlZGljYXRlIFJlc3RyaWN0IHRvIHRyaWFuZ2xlcyB3aXRoIHRoaXMgcHJvcGVydHlcbiAqL1xuZnVuY3Rpb24gZ2V0VHJpYW5nbGUgKG1heExlbmd0aDogbnVtYmVyLCBmaWx0ZXJQcmVkaWNhdGU/OiAodDogVHJpYW5nbGUpID0+IGJvb2xlYW4pIDogUHJvbWlzZTxUcmlhbmdsZT4ge1xuICBsZXQgdHJpYW5nbGU6IFRyaWFuZ2xlXG4gIGZpbHRlclByZWRpY2F0ZSA9IGZpbHRlclByZWRpY2F0ZSA/PyAodCA9PiB0cnVlKSAvLyBkZWZhdWx0IHZhbHVlIGZvciBwcmVkaWNhdGUgaXMgdGF1dG9sb2d5XG5cbiAgLy8gQ2hvb3NlIG11bHRpcGxlIG9mIDUwIHRvIHNlbGVjdCBmcm9tIC0gc21vb3RocyBvdXQgZGlzdHJpYnV0aW9uLlxuICAvLyAoT3RoZXJ3aXNlIGl0J3MgYmlhc2VkIHRvd2FyZHMgaGlnaGVyIGxlbmd0aHMpXG4gIGlmIChtYXhMZW5ndGggPiA1MDApIG1heExlbmd0aCA9IDUwMFxuICBjb25zdCBiaW41MCA9IHJhbmRNdWx0QmV0d2VlbigwLCBtYXhMZW5ndGggLSAxLCA1MCkgKyA1MCAvLyBlLmcuIGlmIGJpbjUwID0gMTUwLCBjaG9vc2Ugd2l0aCBhIG1heGxlbmd0aCBiZXR3ZWVuIDEwMCBhbmQgMTUwXG4gIGNvbnN0IGJpbjEwMCA9IChNYXRoLmNlaWwoYmluNTAgLyAxMDApICogMTAwKS50b1N0cmluZygpIGFzIGluZGV4VmFscyAvLyBlLmcuIGlmIGJpbjUwID0gMTUwLCBiaW4xMDAgPSBNYXRoLmNlaWwoMS41KSoxMDAgPSAyMDBcbiAgY29uc3QgZGF0YVNvdXJjZSA9IGRhdGFTb3VyY2VzW2JpbjEwMF1cblxuICBpZiAoZGF0YVNvdXJjZS5zdGF0dXMgPT09ICdjYWNoZWQnKSB7IC8vIENhY2hlZCAtIGp1c3QgbG9hZCBkYXRhXG4gICAgY29uc29sZS5sb2coJ1VzaW5nIGNhY2hlZCBkYXRhJylcbiAgICB0cmlhbmdsZSA9IHJhbmRFbGVtKGRhdGFTb3VyY2UuZGF0YS5maWx0ZXIodCA9PiBtYXhTaWRlKHQpIDwgbWF4TGVuZ3RoICYmIGZpbHRlclByZWRpY2F0ZSEodCkpKVxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodHJpYW5nbGUpXG4gIH1cblxuICBlbHNlIGlmIChkYXRhU291cmNlLnN0YXR1cyA9PT0gJ3BlbmRpbmcnKSB7IC8vIHBlbmRpbmcgLSBwdXQgY2FsbGJhY2sgaW50byBxdWV1ZVxuICAgIGNvbnNvbGUubG9nKCdQZW5kaW5nOiBhZGRpbmcgcmVxdWVzdCB0byBxdWV1ZScpXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCkgPT4ge1xuICAgICAgZGF0YVNvdXJjZS5xdWV1ZS5wdXNoKHtjYWxsYmFjazogcmVzb2x2ZSwgbWF4TGVuZ3RoOiBtYXhMZW5ndGgsIGZpbHRlcjogZmlsdGVyUHJlZGljYXRlfSlcbiAgICB9KVxuICB9XG4gIFxuICBlbHNlIHsgLy8gbm9ib2R5IGhhcyBsb2FkZWQgeWV0XG4gICAgY29uc29sZS5sb2coJ0xvYWRpbmcgZGF0YSB3aXRoIFhIUicpXG4gICAgZGF0YVNvdXJjZS5zdGF0dXMgPSAncGVuZGluZydcbiAgICByZXR1cm4gZmV0Y2goYCR7cGF0aFJvb3R9JHtkYXRhU291cmNlLnBhdGh9YCkudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChyZXNwb25zZS5zdGF0dXNUZXh0KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFRyaWFuZ2xlW10+XG4gICAgICB9XG4gICAgfSkudGhlbihkYXRhID0+IHtcbiAgICAgIGRhdGFTb3VyY2UuZGF0YSA9IGRhdGFcbiAgICAgIGRhdGFTb3VyY2Uuc3RhdHVzID0gJ2NhY2hlZCdcbiAgICAgIGRhdGFTb3VyY2UucXVldWUuZm9yRWFjaCggKHtjYWxsYmFjayxtYXhMZW5ndGgsIGZpbHRlcn0pID0+IHtcbiAgICAgICAgZmlsdGVyID0gZmlsdGVyID8/ICh0PT50cnVlKVxuICAgICAgICBjb25zdCB0cmlhbmdsZSA9IHJhbmRFbGVtKGRhdGEuZmlsdGVyKCh0OiBUcmlhbmdsZSkgPT4gbWF4U2lkZSh0KSA8IG1heExlbmd0aCAmJiBmaWx0ZXIhKHQpKSlcbiAgICAgICAgY29uc29sZS5sb2coJ2xvYWRpbmcgZnJvbSBxdWV1ZScpXG4gICAgICAgIGNhbGxiYWNrKHRyaWFuZ2xlKVxuICAgICAgfSlcbiAgICAgIHRyaWFuZ2xlID0gcmFuZEVsZW0oZGF0YS5maWx0ZXIoKHQ6IFRyaWFuZ2xlKSA9PiBtYXhTaWRlKHQpIDwgbWF4TGVuZ3RoICYmIGZpbHRlclByZWRpY2F0ZSEodCkpKVxuICAgICAgcmV0dXJuIHRyaWFuZ2xlXG4gICAgfSlcbiAgfSBcbn1cblxuZnVuY3Rpb24gbWF4U2lkZSAodHJpYW5nbGU6IFRyaWFuZ2xlKSB7XG4gIHJldHVybiBNYXRoLm1heCh0cmlhbmdsZS5iLCB0cmlhbmdsZS5zMSwgdHJpYW5nbGUuczIpXG59XG5cbmV4cG9ydCB7IGdldFRyaWFuZ2xlLCBkYXRhU291cmNlcyB9XG4iLCJpbXBvcnQgeyByYW5kQmV0d2VlbiwgcmFuZEVsZW0sIHNjYWxlZFN0ciB9IGZyb20gJ3V0aWxpdGllcy5qcycgLy8gY2hhbmdlIHJlbGF0aXZlIHBhdGggYWZ0ZXIgdGVzdGluZ1xuaW1wb3J0IHsgVmFsdWUgfSBmcm9tICcuL1JlY3RhbmdsZUFyZWFEYXRhJ1xuaW1wb3J0IHsgUXVlc3Rpb25PcHRpb25zIH0gZnJvbSAnLi90eXBlcydcbmltcG9ydCAqIGFzIFREIGZyb20gJ3RyaWFuZ2xlRGF0YS1xdWV1ZSdcbmltcG9ydCBmcmFjdGlvbiBmcm9tICdmcmFjdGlvbi5qcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVHJpYW5nbGVBcmVhRGF0YSB7XG4gIHJlYWRvbmx5IGJhc2U6IFZhbHVlXG4gIHJlYWRvbmx5IHNpZGUxOiBWYWx1ZVxuICByZWFkb25seSBzaWRlMjogVmFsdWVcbiAgcmVhZG9ubHkgaGVpZ2h0OiBWYWx1ZVxuICBwcml2YXRlIHJlYWRvbmx5IGRwOiBudW1iZXJcbiAgcHJpdmF0ZSByZWFkb25seSBkZW5vbWluYXRvcjogbnVtYmVyID0gMVxuICBwcml2YXRlIF9hcmVhPzogUGFydGlhbDxWYWx1ZT5cbiAgcHJpdmF0ZSBfcGVyaW1ldGVyPzogUGFydGlhbDxWYWx1ZT5cblxuICBjb25zdHJ1Y3RvciAoXG4gICAgYmFzZTogVmFsdWUsXG4gICAgc2lkZTE6IFZhbHVlLFxuICAgIHNpZGUyOiBWYWx1ZSxcbiAgICBoZWlnaHQ6IFZhbHVlLFxuICAgIGRwOiBudW1iZXIsXG4gICAgZGVub21pbmF0b3I6IG51bWJlcixcbiAgICBhcmVhUHJvcGVydGllcz86IE9taXQ8VmFsdWUsICd2YWwnPixcbiAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzPzogT21pdDxWYWx1ZSwgJ3ZhbCc+KSB7XG4gICAgdGhpcy5iYXNlID0gYmFzZVxuICAgIHRoaXMuc2lkZTEgPSBzaWRlMVxuICAgIHRoaXMuc2lkZTIgPSBzaWRlMlxuICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0XG4gICAgdGhpcy5kcCA9IGRwXG4gICAgdGhpcy5kZW5vbWluYXRvciA9IGRlbm9taW5hdG9yXG4gICAgdGhpcy5fYXJlYSA9IGFyZWFQcm9wZXJ0aWVzXG4gICAgdGhpcy5fcGVyaW1ldGVyID0gcGVyaW1ldGVyUHJvcGVydGllc1xuICB9XG5cbiAgZ2V0IHBlcmltZXRlciAoKTogVmFsdWUge1xuICAgIGlmICghdGhpcy5fcGVyaW1ldGVyKSB7IC8vIGRlZmF1bHRzIGZvciBwcm9wZXJ0aWVzXG4gICAgICB0aGlzLl9wZXJpbWV0ZXIgPSB7XG4gICAgICAgIHNob3c6IGZhbHNlLFxuICAgICAgICBtaXNzaW5nOiB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5fcGVyaW1ldGVyLnZhbCkge1xuICAgICAgdGhpcy5fcGVyaW1ldGVyLnZhbCA9IHRoaXMuYmFzZS52YWwgKyB0aGlzLnNpZGUxLnZhbCArIHRoaXMuc2lkZTIudmFsXG4gICAgICBpZiAodGhpcy5kZW5vbWluYXRvciA+IDEpIHtcbiAgICAgICAgdGhpcy5fcGVyaW1ldGVyLmxhYmVsID0gbmV3IGZyYWN0aW9uKHRoaXMuX3BlcmltZXRlci52YWwsIHRoaXMuZGVub21pbmF0b3IpLnRvTGF0ZXgodHJ1ZSkgKyAnXFxcXG1hdGhybXtjbX0nXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9wZXJpbWV0ZXIubGFiZWwgPSBzY2FsZWRTdHIodGhpcy5fcGVyaW1ldGVyLnZhbCwgdGhpcy5kcCkgKyAnXFxcXG1hdGhybXtjbX0nXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3BlcmltZXRlciBhcyBWYWx1ZVxuICB9XG5cbiAgZ2V0IGFyZWEgKCk6IFZhbHVlIHtcbiAgICBpZiAoIXRoaXMuX2FyZWEpIHtcbiAgICAgIHRoaXMuX2FyZWEgPSB7XG4gICAgICAgIHNob3c6IGZhbHNlLFxuICAgICAgICBtaXNzaW5nOiB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5fYXJlYS52YWwpIHtcbiAgICAgIHRoaXMuX2FyZWEudmFsID0gdGhpcy5iYXNlLnZhbCAqIHRoaXMuaGVpZ2h0LnZhbCAvIDJcbiAgICAgIGlmICh0aGlzLmRlbm9taW5hdG9yID4gMSkge1xuICAgICAgICB0aGlzLl9hcmVhLmxhYmVsID0gbmV3IGZyYWN0aW9uKHRoaXMuX2FyZWEudmFsLCB0aGlzLmRlbm9taW5hdG9yKioyKS50b0xhdGV4KHRydWUpICsgJ1xcXFxtYXRocm17Y219XjInXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9hcmVhLmxhYmVsID0gc2NhbGVkU3RyKHRoaXMuX2FyZWEudmFsLCAyICogdGhpcy5kcCkgKyAnXFxcXG1hdGhybXtjbX1eMidcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2FyZWEgYXMgVmFsdWVcbiAgfVxuXG4gIGlzUmlnaHRBbmdsZWQgKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHRyaWFuZ2xlOiBURC5UcmlhbmdsZSA9IHtcbiAgICAgIGI6IHRoaXMuYmFzZS52YWwsXG4gICAgICBoOiB0aGlzLmhlaWdodC52YWwsXG4gICAgICBzMTogdGhpcy5zaWRlMS52YWwsXG4gICAgICBzMjogdGhpcy5zaWRlMi52YWxcbiAgICB9XG4gICAgcmV0dXJuIGlzUmlnaHRBbmdsZWQodHJpYW5nbGUpXG4gIH1cblxuICBzdGF0aWMgYXN5bmMgcmFuZG9tIChvcHRpb25zOiBRdWVzdGlvbk9wdGlvbnMpOiBQcm9taXNlPFRyaWFuZ2xlQXJlYURhdGE+IHtcbiAgICBvcHRpb25zLm1heExlbmd0aCA9IG9wdGlvbnMubWF4TGVuZ3RoIHx8IDIwXG4gICAgY29uc3QgZHAgPSBvcHRpb25zLmRwIHx8IDBcbiAgICBjb25zdCBkZW5vbWluYXRvciA9IG9wdGlvbnMuZnJhY3Rpb24/IHJhbmRCZXR3ZWVuKDIsNikgOiAxXG4gICAgY29uc3QgcmVxdWlyZUlzb3NjZWxlcyA9IChvcHRpb25zLnF1ZXN0aW9uVHlwZSA9PT0gJ3B5dGhhZ29yYXNJc29zY2VsZXNBcmVhJylcbiAgICBjb25zdCByZXF1aXJlUmlnaHRBbmdsZSA9IChvcHRpb25zLnF1ZXN0aW9uVHlwZSA9PT0gJ3B5dGhhZ29yYXNBcmVhJyB8fCBvcHRpb25zLnF1ZXN0aW9uVHlwZSA9PT0gJ3B5dGhhZ29yYXNQZXJpbWV0ZXInKVxuXG4gICAgLy8gZ2V0IGEgdHJpYW5nbGUuIFRELmdldFRyaWFuZ2xlIGlzIGFzeW5jLCBzbyBuZWVkIHRvIGF3YWl0XG4gICAgY29uc3QgdHJpYW5nbGU6IFRELlRyaWFuZ2xlID1cbiAgICAgIGF3YWl0IFRELmdldFRyaWFuZ2xlKG9wdGlvbnMubWF4TGVuZ3RoLCB0ID0+XG4gICAgICAgICghcmVxdWlyZUlzb3NjZWxlcyB8fCBpc0lzb3NjZWxlcyh0KSkgJiZcbiAgICAgICAgICAoIXJlcXVpcmVSaWdodEFuZ2xlIHx8IGlzUmlnaHRBbmdsZWQodCkpXG4gICAgICApXG5cbiAgICAvLyB1c2VmdWwgZm9yIHNvbWUgbG9naWMgbmV4dFxuICAgIC8vIG5iIG9ubHkgcmVmZXJzIHRvIFJBIHRyaWFuZ2xlcyB3aGVyIHRoZSBoeXBvdGVudXNlIGlzIG5vdCB0aGUgJ2Jhc2UnXG4gICAgY29uc3QgcmlnaHRBbmdsZWQgPSBpc1JpZ2h0QW5nbGVkKHRyaWFuZ2xlKVxuXG4gICAgY29uc3QgYmFzZSA6IFZhbHVlID0geyB2YWw6IHRyaWFuZ2xlLmIsIHNob3c6IHRydWUsIG1pc3Npbmc6IGZhbHNlIH1cbiAgICBjb25zdCBoZWlnaHQgOiBWYWx1ZSA9IHsgdmFsOiB0cmlhbmdsZS5oLCBzaG93OiAhcmlnaHRBbmdsZWQsIG1pc3Npbmc6IGZhbHNlIH0gLy8gaGlkZSBoZWlnaHQgaW4gUkEgdHJpYW5nbGVzXG4gICAgY29uc3Qgc2lkZTEgOiBWYWx1ZSA9IHsgdmFsOiB0cmlhbmdsZS5zMSwgc2hvdzogdHJ1ZSwgbWlzc2luZzogZmFsc2UgfVxuICAgIGNvbnN0IHNpZGUyIDogVmFsdWUgPSB7IHZhbDogdHJpYW5nbGUuczIsIHNob3c6IHRydWUsIG1pc3Npbmc6IGZhbHNlIH07XG4gICAgW2Jhc2UsIGhlaWdodCwgc2lkZTEsIHNpZGUyXS5mb3JFYWNoKHYgPT4ge1xuICAgICAgaWYgKGRlbm9taW5hdG9yID09PSAxKSB7XG4gICAgICAgIHYubGFiZWwgPSBzY2FsZWRTdHIodi52YWwsIGRwKSArICdcXFxcbWF0aHJte2NtfSdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHYubGFiZWwgPSBuZXcgZnJhY3Rpb24odi52YWwsZGVub21pbmF0b3IpLnRvTGF0ZXgodHJ1ZSkgKyBcIlxcXFxtYXRocm17Y219XCJcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gU29tZSBhbGlhc2VzIHVzZWZ1bCB3aGVuIHJlYXNvbmluZyBhYm91dCBSQSB0cmlhbmdsZXNcbiAgICAvLyBOQiAoYSkgdGhlc2UgYXJlIHJlZnMgdG8gc2FtZSBvYmplY3QsIG5vdCBjb3BpZXNcbiAgICAvLyAoYikgbm90IHZlcnkgbWVhbmluZ2Z1bCBmb3Igbm9uIFJBIHRyaWFuZ2xlc1xuICAgIGNvbnN0IGxlZzEgPSBiYXNlXG4gICAgY29uc3QgbGVnMiA9IChzaWRlMS52YWwgPiBzaWRlMi52YWwpID8gc2lkZTIgOiBzaWRlMVxuICAgIGNvbnN0IGh5cG90ZW51c2UgPSAoc2lkZTEudmFsID4gc2lkZTIudmFsKSA/IHNpZGUxIDogc2lkZTJcblxuICAgIGNvbnN0IGFyZWFQcm9wZXJ0aWVzID0geyBzaG93OiBmYWxzZSwgbWlzc2luZzogdHJ1ZSB9XG4gICAgY29uc3QgcGVyaW1ldGVyUHJvcGVydGllcyA9IHsgc2hvdzogZmFsc2UsIG1pc3Npbmc6IHRydWUgfVxuXG4gICAgLy8gc2hvdy9oaWRlIGJhc2VkIG9uIHR5cGVcbiAgICBzd2l0Y2ggKG9wdGlvbnMucXVlc3Rpb25UeXBlKSB7XG4gICAgICBjYXNlICdhcmVhJzpcbiAgICAgICAgYXJlYVByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgYXJlYVByb3BlcnRpZXMubWlzc2luZyA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3BlcmltZXRlcic6XG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAncmV2ZXJzZUFyZWEnOiB7XG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLm1pc3NpbmcgPSBmYWxzZVxuICAgICAgICBjb25zdCBjb2luVG9zcyA9IChNYXRoLnJhbmRvbSgpIDwgMC41KSAvLyA1MC81MCB0cnVlL2ZhbHNlXG4gICAgICAgIGlmIChyaWdodEFuZ2xlZCkgeyAvLyBoaWRlIG9uZSBvZiB0aGUgbGVnc1xuICAgICAgICAgIGlmIChjb2luVG9zcykgbGVnMS5taXNzaW5nID0gdHJ1ZVxuICAgICAgICAgIGVsc2UgbGVnMi5taXNzaW5nID0gdHJ1ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChjb2luVG9zcykgYmFzZS5taXNzaW5nID0gdHJ1ZVxuICAgICAgICAgIGVsc2UgaGVpZ2h0Lm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3JldmVyc2VQZXJpbWV0ZXInOiB7XG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nID0gZmFsc2VcbiAgICAgICAgcmFuZEVsZW0oW2Jhc2UsIHNpZGUxLCBzaWRlMl0pLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdweXRoYWdvcmFzQXJlYSc6XG4gICAgICAgIGlmICghcmlnaHRBbmdsZWQpIHRocm93IG5ldyBFcnJvcignU2hvdWxkIGhhdmUgUkEgdHJpYW5nbGUgaGVyZScpXG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIHJhbmRFbGVtKFtsZWcxLCBsZWcyXSkuc2hvdyA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdweXRoYWdvcmFzUGVyaW1ldGVyJzogeyAvLyBzaG91bGQgYWxyZWFkeSBoYXZlIFJBIHRyaWFuZ2xlXG4gICAgICAgIGlmICghcmlnaHRBbmdsZWQpIHRocm93IG5ldyBFcnJvcignU2hvdWxkIGhhdmUgUkEgdHJpYW5nbGUgaGVyZScpXG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nID0gdHJ1ZVxuICAgICAgICByYW5kRWxlbShbbGVnMSwgbGVnMiwgaHlwb3RlbnVzZV0pLnNob3cgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAncHl0aGFnb3Jhc0lzb3NjZWxlc0FyZWEnOlxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYXJlYVByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgYXJlYVByb3BlcnRpZXMubWlzc2luZyA9IHRydWVcbiAgICAgICAgaGVpZ2h0LnNob3cgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFRyaWFuZ2xlQXJlYURhdGEoYmFzZSwgc2lkZTEsIHNpZGUyLCBoZWlnaHQsIGRwLCBkZW5vbWluYXRvciwgYXJlYVByb3BlcnRpZXMsIHBlcmltZXRlclByb3BlcnRpZXMpXG4gIH1cbn1cblxuZnVuY3Rpb24gaXNJc29zY2VsZXMgKHRyaWFuZ2xlOiBURC5UcmlhbmdsZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gdHJpYW5nbGUuczEgPT09IHRyaWFuZ2xlLnMyXG59XG5cbmZ1bmN0aW9uIGlzUmlnaHRBbmdsZWQgKHRyaWFuZ2xlOiBURC5UcmlhbmdsZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gdHJpYW5nbGUuczEgPT09IHRyaWFuZ2xlLmggfHwgdHJpYW5nbGUuczIgPT09IHRyaWFuZ2xlLmhcbn1cbiIsImltcG9ydCB7IGFycm93TGluZSwgZHJhd1JpZ2h0QW5nbGUgfSBmcm9tICdkcmF3aW5nJ1xuaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgY3JlYXRlRWxlbSwgcmFuZEVsZW0sIHJlcGVsRWxlbWVudHMgfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUVZpZXcsIExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuL3R5cGVzJ1xuaW1wb3J0IHsgVmFsdWUgfSBmcm9tICcuL1JlY3RhbmdsZUFyZWFEYXRhJ1xuaW1wb3J0IFRyaWFuZ2xlQXJlYURhdGEgZnJvbSAnLi9UcmlhbmdsZUFyZWFEYXRhJ1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRyaWFuZ2xlQXJlYVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICBBPzogUG9pbnQgLy8gR2VuZXJhdGVkIGxhemlseSBvbiByZW5kZXJcbiAgQj86IFBvaW50XG4gIEM/OiBQb2ludFxuICBodD86IFBvaW50IC8vIGludGVyc2VjdGlvbiBvZiBoZWlnaHQgd2l0aCBiYXNlXG4gIG92ZXJoYW5nTGVmdD86IGJvb2xlYW5cbiAgb3ZlcmhhbmdSaWdodD86IGJvb2xlYW5cbiAgZGF0YSE6IFRyaWFuZ2xlQXJlYURhdGEgfCBQcm9taXNlPFRyaWFuZ2xlQXJlYURhdGE+XG4gIC8vIGxhYmVsczogTGFiZWxbXVxuICAvLyByb3RhdGlvbj86IG51bWJlclxuICBjb25zdHJ1Y3RvciAoZGF0YTogVHJpYW5nbGVBcmVhRGF0YSB8IFByb21pc2U8VHJpYW5nbGVBcmVhRGF0YT4sIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucywgQT86IFBvaW50LCBCPzogUG9pbnQsIEM/OlBvaW50LCBsYWJlbHM/OiBMYWJlbFtdKSB7XG4gICAgc3VwZXIoZGF0YSwgdmlld09wdGlvbnMpXG4gICAgdGhpcy5BID0gQVxuICAgIHRoaXMuQiA9IEJcbiAgICB0aGlzLkMgPSBDXG4gICAgdGhpcy5sYWJlbHMgPSBsYWJlbHMgPz8gW11cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW5kZXIgaW50byB0aGlzLmNhbnZhc1xuICAgKi9cbiAgYXN5bmMgcmVuZGVyICgpIHtcbiAgICAvLyBjcmVhdGUgbG9hZGluZyBpbWFnZVxuICAgIGNvbnN0IGxvYWRlciA9IGNyZWF0ZUVsZW0oJ2RpdicsICdsb2FkZXInLCB0aGlzLkRPTSlcbiAgICAvLyBmaXJzdCBpbml0IGlmIG5vdCBhbHJlYWR5XG4gICAgaWYgKHRoaXMuQSA9PT0gdW5kZWZpbmVkKSBhd2FpdCB0aGlzLmluaXQoKVxuXG4gICAgaWYgKCF0aGlzLkEgfHwgIXRoaXMuQiB8fCAhdGhpcy5DIHx8ICF0aGlzLmh0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludGlhbGlzYXRpb24gZmFpbGVkLiBQb2ludHMgYXJlOiAke1t0aGlzLkEsIHRoaXMuQiwgdGhpcy5DLCB0aGlzLmh0XX1gKVxuICAgIH1cbiAgICBpZiAodGhpcy5kYXRhIGluc3RhbmNlb2YgUHJvbWlzZSkgdGhyb3cgbmV3IEVycm9yKCdJbml0aWFsaXNhdGlvbiBmYWlsZWQ6IGRhdGEgaXMgc3RpbGwgYSBQcm9taXNlJylcblxuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICBpZiAoY3R4ID09PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBnZXQgY2FudmFzIGNvbnRleHQnKVxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcbiAgICBjdHguc2V0TGluZURhc2goW10pXG4gICAgLy8gZHJhdyB0cmlhbmdsZVxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGN0eC5tb3ZlVG8odGhpcy5BLngsIHRoaXMuQS55KVxuICAgIGN0eC5saW5lVG8odGhpcy5CLngsIHRoaXMuQi55KVxuICAgIGN0eC5saW5lVG8odGhpcy5DLngsIHRoaXMuQy55KVxuICAgIGN0eC5saW5lVG8odGhpcy5BLngsIHRoaXMuQS55KVxuICAgIGN0eC5zdHJva2UoKVxuICAgIGN0eC5maWxsU3R5bGUgPSByYW5kRWxlbShjb2xvcnMpXG4gICAgY3R4LmZpbGwoKVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgLy8gZHJhdyBoZWlnaHRcbiAgICBpZiAodGhpcy5kYXRhLmhlaWdodC5zaG93KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIC8vIGFycm93TGluZShjdHgsdGhpcy5DLHRoaXMuaHQsMTApO1xuICAgICAgYXJyb3dMaW5lKGN0eCxcbiAgICAgICAgUG9pbnQubWVhbih0aGlzLkMsIHRoaXMuaHQpLm1vdmVUb3dhcmQodGhpcy5DLCAxNSksXG4gICAgICAgIHRoaXMuQywgMTBcbiAgICAgIClcbiAgICAgIGFycm93TGluZShjdHgsXG4gICAgICAgIFBvaW50Lm1lYW4odGhpcy5DLCB0aGlzLmh0KS5tb3ZlVG93YXJkKHRoaXMuaHQsIDE1KSxcbiAgICAgICAgdGhpcy5odCwgMTBcbiAgICAgIClcbiAgICAgIGN0eC5zdHJva2UoKVxuICAgICAgY3R4LmNsb3NlUGF0aCgpXG4gICAgfVxuXG4gICAgLy8gcmlnaHQtYW5nbGUgc3ltYm9sXG4gICAgaWYgKHRoaXMuZGF0YS5pc1JpZ2h0QW5nbGVkKCkgfHwgdGhpcy5kYXRhLmhlaWdodC5zaG93KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIGlmICh0aGlzLkEuZXF1YWxzKHRoaXMuaHQpKSB7XG4gICAgICAgIGRyYXdSaWdodEFuZ2xlKGN0eCwgdGhpcy5CLCB0aGlzLmh0LCB0aGlzLkMsIDE1KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZHJhd1JpZ2h0QW5nbGUoY3R4LCB0aGlzLkEsIHRoaXMuaHQsIHRoaXMuQywgMTUpXG4gICAgICB9XG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIGN0eC5jbG9zZVBhdGgoKVxuICAgIH1cblxuICAgIGlmICh0aGlzLmRhdGEuaGVpZ2h0LnNob3cgJiYgdGhpcy5vdmVyaGFuZ1JpZ2h0KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIGN0eC5zZXRMaW5lRGFzaChbNSwgM10pXG4gICAgICBjdHgubW92ZVRvKHRoaXMuQi54LCB0aGlzLkIueSlcbiAgICAgIGN0eC5saW5lVG8odGhpcy5odC54LCB0aGlzLmh0LnkpXG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIGN0eC5jbG9zZVBhdGgoKVxuICAgIH1cbiAgICBpZiAodGhpcy5kYXRhLmhlaWdodC5zaG93ICYmIHRoaXMub3ZlcmhhbmdMZWZ0KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIGN0eC5zZXRMaW5lRGFzaChbNSwgM10pXG4gICAgICBjdHgubW92ZVRvKHRoaXMuQS54LCB0aGlzLkEueSlcbiAgICAgIGN0eC5saW5lVG8odGhpcy5odC54LCB0aGlzLmh0LnkpXG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIGN0eC5jbG9zZVBhdGgoKVxuICAgIH1cblxuICAgIHRoaXMucmVuZGVyTGFiZWxzKGZhbHNlLHRydWUpXG4gICAgbG9hZGVyLnJlbW92ZSgpXG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGlzZS4gSW5zdGFuY2UgbWV0aG9kIHJhdGhlciB0aGFuIHN0YXRpYyBmYWN0b3J5IG1ldGhvZCwgc28gaW5zdGFuY2UgY2FuIGNvbnRyb2wsIGUuZy4gbG9hZGluZyBpY29uXG4gICAqIGFzeW5jIHNpbmNlIGRhdGEgaXMgYSBwcm9taXNlXG4gICAqL1xuICBhc3luYyBpbml0ICgpIDogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5kYXRhID0gYXdhaXQgdGhpcy5kYXRhXG4gICAgY29uc3QgaCA9IHRoaXMuZGF0YS5oZWlnaHQudmFsXG4gICAgY29uc3QgYiA9IHRoaXMuZGF0YS5iYXNlLnZhbFxuICAgIGNvbnN0IHMxID0gdGhpcy5kYXRhLnNpZGUxLnZhbFxuICAgIGNvbnN0IHMyID0gdGhpcy5kYXRhLnNpZGUyLnZhbFxuXG4gICAgLy8gYnVpbGQgdXBzaWRlIGRvd25cbiAgICB0aGlzLkEgPSBuZXcgUG9pbnQoMCwgaClcbiAgICB0aGlzLkIgPSBuZXcgUG9pbnQoYiwgaClcbiAgICB0aGlzLkMgPSBuZXcgUG9pbnQoKGIgKiBiICsgczEgKiBzMSAtIHMyICogczIpIC8gKDIgKiBiKSwgMClcbiAgICB0aGlzLmh0ID0gbmV3IFBvaW50KHRoaXMuQy54LCB0aGlzLkEueSlcblxuICAgIHRoaXMub3ZlcmhhbmdSaWdodCA9IGZhbHNlXG4gICAgdGhpcy5vdmVyaGFuZ0xlZnQgPSBmYWxzZVxuICAgIGlmICh0aGlzLkMueCA+IHRoaXMuQi54KSB7IHRoaXMub3ZlcmhhbmdSaWdodCA9IHRydWUgfVxuICAgIGlmICh0aGlzLkMueCA8IHRoaXMuQS54KSB7IHRoaXMub3ZlcmhhbmdMZWZ0ID0gdHJ1ZSB9XG5cbiAgICAvLyByb3RhdGUsIHNjYWxlIGFuZCBjZW50ZXJcbiAgICB0aGlzLnJvdGF0aW9uID0gdGhpcy5yb3RhdGlvbiA/PyAyICogTWF0aC5QSSAqIE1hdGgucmFuZG9tKClcbiAgICA7W3RoaXMuQSwgdGhpcy5CLCB0aGlzLkMsIHRoaXMuaHRdLmZvckVhY2gocHQgPT4gcHQucm90YXRlKHRoaXMucm90YXRpb24hKSlcbiAgICBQb2ludC5zY2FsZVRvRml0KFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DLCB0aGlzLmh0XSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQsIDEwMCwgWzAsMjBdKVxuXG4gICAgLy8gTWFraW5nIGxhYmVscyAtIG1vcmUgaW52b2x2ZWQgdGhhbiBJIHJlbWVtYmVyZWQhXG4gICAgLy8gRmlyc3QgdGhlIGxhYmVscyBmb3IgdGhlIHNpZGVzXG4gICAgY29uc3Qgc2lkZXMgOiBbUG9pbnQsIFBvaW50LCBWYWx1ZV1bXSA9IFsgLy8gWzFzdCBwb2ludCwgMm5kIHBvaW50LCBkYXRhXVxuICAgICAgW3RoaXMuQSwgdGhpcy5CLCB0aGlzLmRhdGEuYmFzZV0sXG4gICAgICBbdGhpcy5DLCB0aGlzLkEsIHRoaXMuZGF0YS5zaWRlMV0sXG4gICAgICBbdGhpcy5CLCB0aGlzLkMsIHRoaXMuZGF0YS5zaWRlMl1cbiAgICBdXG5cbiAgICAvLyBvcmRlciBvZiBwdXR0aW5nIGluIGhlaWdodCBtYXR0ZXJzIGZvciBvZmZzZXRcbiAgICAvLyBUaGlzIGJyZWFrcyBpZiB3ZSBoYXZlIHJvdW5kaW5nIGVycm9yc1xuICAgIGlmICh0aGlzLmh0LmVxdWFscyh0aGlzLkIpKSB7IC8vXG4gICAgICBzaWRlcy5wdXNoKFt0aGlzLmh0LCB0aGlzLkMsIHRoaXMuZGF0YS5oZWlnaHRdKVxuICAgIH0gZWxzZSB7XG4gICAgICBzaWRlcy5wdXNoKFt0aGlzLkMsIHRoaXMuaHQsIHRoaXMuZGF0YS5oZWlnaHRdKVxuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgaSsrKSB7IC8vIHNpZGVzXG4gICAgICBpZiAoIXNpZGVzW2ldWzJdLnNob3cpIGNvbnRpbnVlXG4gICAgICBjb25zdCBvZmZzZXQgPSAyMCAvLyBvZmZzZXQgZnJvbSBsaW5lIGJ5IHRoaXMgbWFueSBwaXhlbHNcbiAgICAgIGNvbnN0IHBvcyA9IFBvaW50Lm1lYW4oc2lkZXNbaV1bMF0sIHNpZGVzW2ldWzFdKSAvLyBzdGFydCBhdCBtaWRwb2ludFxuICAgICAgY29uc3QgdW5pdHZlYyA9IFBvaW50LnVuaXRWZWN0b3Ioc2lkZXNbaV1bMF0sIHNpZGVzW2ldWzFdKVxuXG4gICAgICBpZiAoaSA8IDMgKSB7IHBvcy50cmFuc2xhdGUoLXVuaXR2ZWMueSAqIG9mZnNldCwgdW5pdHZlYy54ICogb2Zmc2V0KSB9XG5cbiAgICAgIGNvbnN0IHRleHRhIDogc3RyaW5nID0gc2lkZXNbaV1bMl0ubGFiZWwgPz8gc2lkZXNbaV1bMl0udmFsLnRvU3RyaW5nKClcbiAgICAgIGNvbnN0IHRleHRxID0gc2lkZXNbaV1bMl0ubWlzc2luZyA/ICc/JyA6IHRleHRhXG4gICAgICBjb25zdCBzdHlsZXEgPSBpPT09MyA/ICdub3JtYWwgcmVwZWwtbG9ja2VkJyA6ICdub3JtYWwnXG4gICAgICBjb25zdCBzdHlsZWEgPSBzaWRlc1tpXVsyXS5taXNzaW5nID9cbiAgICAgICAgICAgICAgICAgICAgICAoaT09PTMgPyAnYW5zd2VyIHJlcGVsLWxvY2tlZCcgOiAnYW5zd2VyJykgOlxuICAgICAgICAgICAgICAgICAgICAgIChpPT09MyA/ICdub3JtYWwgcmVwZWwtbG9ja2VkJyA6ICdub3JtYWwnKVxuXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKHtcbiAgICAgICAgcG9zOiBwb3MsXG4gICAgICAgIHRleHRhOiB0ZXh0YSxcbiAgICAgICAgdGV4dHE6IHRleHRxLFxuICAgICAgICB0ZXh0OiB0ZXh0cSxcbiAgICAgICAgc3R5bGVhOiBzdHlsZWEsXG4gICAgICAgIHN0eWxlcTogc3R5bGVxLFxuICAgICAgICBzdHlsZTogc3R5bGVxXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vIGFyZWEgYW5kIHBlcmltZXRlclxuICAgIGxldCBuSW5mbyA9IDBcbiAgICBpZiAodGhpcy5kYXRhLmFyZWEuc2hvdykge1xuICAgICAgY29uc3QgdGV4dGEgOiBzdHJpbmcgPSB0aGlzLmRhdGEuYXJlYS5sYWJlbCA/PyB0aGlzLmRhdGEuYXJlYS52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSB0aGlzLmRhdGEuYXJlYS5taXNzaW5nID8gJz8nIDogdGV4dGFcbiAgICAgIGNvbnN0IHN0eWxlcSA9ICdleHRyYS1pbmZvJ1xuICAgICAgY29uc3Qgc3R5bGVhID0gdGhpcy5kYXRhLmFyZWEubWlzc2luZyA/ICdleHRyYS1hbnN3ZXInIDogJ2V4dHJhLWluZm8nXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKFxuICAgICAgICB7XG4gICAgICAgICAgdGV4dGE6ICdcXFxcdGV4dHtBcmVhfSA9ICcgKyB0ZXh0YSxcbiAgICAgICAgICB0ZXh0cTogJ1xcXFx0ZXh0e0FyZWF9ID0gJyArIHRleHRxLFxuICAgICAgICAgIHRleHQ6ICdcXFxcdGV4dHtBcmVhfSA9ICcgKyB0ZXh0cSxcbiAgICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgICBzdHlsZTogc3R5bGVxLFxuICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwIC0gMTUgKiBuSW5mbylcbiAgICAgICAgfVxuICAgICAgKVxuICAgICAgbkluZm8rK1xuICAgIH1cbiAgICBpZiAodGhpcy5kYXRhLnBlcmltZXRlci5zaG93KSB7XG4gICAgICBjb25zdCB0ZXh0YSA9IHRoaXMuZGF0YS5wZXJpbWV0ZXIubGFiZWwgPz8gdGhpcy5kYXRhLnBlcmltZXRlci52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSB0aGlzLmRhdGEucGVyaW1ldGVyLm1pc3NpbmcgPyAnPycgOiB0ZXh0YVxuICAgICAgY29uc3Qgc3R5bGVxID0gJ2V4dHJhLWluZm8nXG4gICAgICBjb25zdCBzdHlsZWEgPSB0aGlzLmRhdGEucGVyaW1ldGVyLm1pc3NpbmcgPyAnZXh0cmEtYW5zd2VyJyA6ICdleHRyYS1pbmZvJ1xuICAgICAgdGhpcy5sYWJlbHMucHVzaChcbiAgICAgICAge1xuICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwIC0gMjAgKiBuSW5mbyksXG4gICAgICAgICAgdGV4dGE6ICdcXFxcdGV4dHtQZXJpbWV0ZXJ9ID0gJyArIHRleHRhLFxuICAgICAgICAgIHRleHRxOiAnXFxcXHRleHR7UGVyaW1ldGVyfSA9ICcgKyB0ZXh0cSxcbiAgICAgICAgICB0ZXh0OiAnXFxcXHRleHR7UGVyaW1ldGVyfSA9ICcgKyB0ZXh0cSxcbiAgICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgICBzdHlsZTogc3R5bGVxXG4gICAgICAgIH1cbiAgICAgIClcbiAgICB9XG5cbiAgICAvLyBzdG9wIHRoZW0gZnJvbSBjbGFzaGluZyAtIGhtbSwgbm90IHN1cmVcbiAgICAvKlxuICAgIHRoaXMuc3VjY2Vzcz10cnVlO1xuICAgIGZvciAobGV0IGkgPSAwLCBuPXRoaXMubGFiZWxzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBpOyBqKyspIHtcbiAgICAgICAgY29uc3QgbDE9dGhpcy5sYWJlbHNbaV0sIGwyPXRoaXMubGFiZWxzW2pdO1xuICAgICAgICBjb25zdCBkID0gUG9pbnQuZGlzdGFuY2UobDEucG9zLGwyLnBvcyk7XG4gICAgICAgIC8vY29uc29sZS5sb2coYGQoJyR7bDEudGV4dH0nLCcke2wyLnRleHR9JykgPSAke2R9YCk7XG4gICAgICAgIGlmIChkIDwgMjApIHtcbiAgICAgICAgICAvL2NvbnNvbGUubG9nKFwidG9vIGNsb3NlXCIpO1xuICAgICAgICAgIHRoaXMuc3VjY2Vzcz1mYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gKi9cbiAgfVxuXG4gIHN0YXRpYyBmcm9tQXN5bmNEYXRhIChkYXRhOiBQcm9taXNlPFRyaWFuZ2xlQXJlYURhdGE+LCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlld09wdGlvbnMpXG4gIH1cbn1cbiIsImltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgVHJpYW5nbGVBcmVhRGF0YSBmcm9tICcuL1RyaWFuZ2xlQXJlYURhdGEnXG5pbXBvcnQgVHJpYW5nbGVBcmVhVmlldyBmcm9tICcuL1RyaWFuZ2xlQXJlYVZpZXcnXG5pbXBvcnQgeyBRdWVzdGlvbk9wdGlvbnMgfSBmcm9tICcuL3R5cGVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUcmlhbmdsZUFyZWFRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhITogVHJpYW5nbGVBcmVhRGF0YSB8IFByb21pc2U8VHJpYW5nbGVBcmVhRGF0YT4gLy8gaW5pdGlhbGlzZWQgaW4gc3VwZXIoKVxuICB2aWV3ITogVHJpYW5nbGVBcmVhVmlld1xuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgY29uc3QgZGF0YSA9IFRyaWFuZ2xlQXJlYURhdGEucmFuZG9tKG9wdGlvbnMpXG4gICAgY29uc3QgdmlldyA9IFRyaWFuZ2xlQXJlYVZpZXcuZnJvbUFzeW5jRGF0YShkYXRhLCB2aWV3T3B0aW9ucylcbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZXMnXG4gIH1cbn1cbiIsImltcG9ydCB7IE9wdGlvbnNTcGVjIH0gZnJvbSAnT3B0aW9uc1NwZWMnXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5pbXBvcnQgeyByYW5kRWxlbSB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCB7IEdyYXBoaWNRLCBHcmFwaGljUVZpZXcgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCBQYXJhbGxlbG9ncmFtQXJlYVEgZnJvbSAnLi9QYXJhbGxlbG9ncmFtQXJlYVEnXG5pbXBvcnQgUmVjdGFuZ2xlQXJlYVEgZnJvbSAnLi9SZWN0YW5nbGVBcmVhUSdcbmltcG9ydCBUcmFwZXppdW1BcmVhUSBmcm9tICcuL1RyYXBleml1bUFyZWFRJ1xuaW1wb3J0IFRyaWFuZ2xlQXJlYVEgZnJvbSAnLi9UcmlhbmdsZUFyZWFRJ1xuaW1wb3J0IHsgV3JhcHBlck9wdGlvbnMsIFNoYXBlLCBRdWVzdGlvblR5cGVTaW1wbGUsIFF1ZXN0aW9uT3B0aW9ucywgUXVlc3Rpb25UeXBlIH0gZnJvbSAnLi90eXBlcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXJlYVBlcmltZXRlclEgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIHF1ZXN0aW9uOiBHcmFwaGljUSAvLyBtYWtlIG1vcmUgcHJlY2lzZSB3aXRoIHVuaW9uIG9mIGFjdHVhbCB0eXBlc1xuICAvLyBET006IEhUTUxFbGVtZW50ICAvLyBpbiBiYXNlIGNsYXNzXG4gIC8vIGFuc3dlcmVkOiBib29sZWFuIC8vIGluIGJhc2UgY2xhc3NcbiAgY29uc3RydWN0b3IgKHF1ZXN0aW9uOiBHcmFwaGljUSkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLnF1ZXN0aW9uID0gcXVlc3Rpb25cbiAgICB0aGlzLkRPTSA9IHF1ZXN0aW9uLkRPTVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogV3JhcHBlck9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMuY3VzdG9tKSB7XG4gICAgICBjb25zdCBzaGFwZSA9IHJhbmRFbGVtKG9wdGlvbnMuc2hhcGVzKVxuICAgICAgcmV0dXJuIHRoaXMucmFuZG9tRnJvbURpZmZpY3VsdHkob3B0aW9ucy5kaWZmaWN1bHR5LCBzaGFwZSwgb3B0aW9ucy5xdWVzdGlvblR5cGVzU2ltcGxlKVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIHJhbmRvbUZyb21EaWZmaWN1bHR5IChkaWZmaWN1bHR5OiBudW1iZXIsIHNoYXBlOiBTaGFwZSwgcXVlc3Rpb25UeXBlczogUXVlc3Rpb25UeXBlU2ltcGxlW10pOiBBcmVhUGVyaW1ldGVyUSB7XG4gICAgLyoqIERpZmZpY3VsdHkgZ3VpZGVcbiAgICAgKiAgMSAtIEZvcndhcmQsIG5vIGRpc3RyYWN0b3JzLCBzbWFsbCBpbnRlZ2Vyc1xuICAgICAqICAyIC0gRm9yd2FyZCwgZGlzdHJhY3RvcnMsIHNtYWxsIGludGVnZXJzXG4gICAgICogIDMgLSBGb3J3YXJkLCBkaXN0cmFjdG9ycywgbGFyZ2VyIGludGVnZXJzXG4gICAgICogIDQgLSBGb3J3YXJkLCBkaXN0cmFjdG9ycywgZGVjaW1hbHMgYW5kIGZyYWN0aW9uc1xuICAgICAqICA1IC0gRm9yd2FyZCwgZGlzdHJhY3RvcnMsIGRlY2ltYWxzIGFuZCBmcmFjdGlvbnMgLSBsYXJnZXJcbiAgICAgKiAgNiAtIFJldmVyc2Ugc21hbGwgaW50ZWdlcnNcbiAgICAgKiAgNyAtIFJldmVyc2UgbGFyZ2UgaW50ZWdlcnNcbiAgICAgKiAgOCAtIFJldmVyc2UgZGVjaW1hbHMgYW5kIGZyYWN0aW9uc1xuICAgICAqICA5IC0gUmV2ZXJzZSBkZWNpbWFscyBhbmQgZnJhY3Rpb25zIC0gbGFyZ2VyXG4gICAgICogMTAgLSBQeXRoYWdvcmFzXG4gICAgKi9cbiAgICBjb25zdCBxdWVzdGlvbk9wdGlvbnM6IFF1ZXN0aW9uT3B0aW9ucyA9IHtcbiAgICAgIHF1ZXN0aW9uVHlwZTogcmFuZEVsZW0ocXVlc3Rpb25UeXBlcyksXG4gICAgICBkcDogMCxcbiAgICAgIGZyYWN0aW9uOiBmYWxzZSxcbiAgICAgIG5vRGlzdHJhY3RvcnM6IHRydWUsXG4gICAgICBtYXhMZW5ndGg6IDIwXG4gICAgfVxuICAgIGNvbnN0IHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucyA9IHt9XG5cbiAgICBzd2l0Y2ggKGRpZmZpY3VsdHkpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5ub0Rpc3RyYWN0b3JzID0gZmFsc2VcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm5vRGlzdHJhY3RvcnMgPSBmYWxzZVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TGVuZ3RoID0gMTAwXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ6XG4gICAgICAgIGlmIChNYXRoLnJhbmRvbSgpPDAuNSkgeyAgLy8gZGVjaW1hbFxuICAgICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5kcCA9IDFcbiAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TGVuZ3RoID0gOTlcbiAgICAgICAgfSBlbHNlIHsgLy8gZnJhY3Rpb25cbiAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZnJhY3Rpb24gPSB0cnVlXG4gICAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heExlbmd0aCA9IDE1XG4gICAgICAgIH1cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm5vRGlzdHJhY3RvcnMgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA1OlxuICAgICAgICBpZiAoTWF0aC5yYW5kb20oKTwwLjUpIHsgIC8vIGRlY2ltYWxcbiAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZHAgPSAxXG4gICAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heExlbmd0aCA9IDUwMFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5mcmFjdGlvbiA9IHRydWVcbiAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TGVuZ3RoID0gMTAwXG4gICAgICAgIH1cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm5vRGlzdHJhY3RvcnMgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA2OlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZHAgPSAwXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5ub0Rpc3RyYWN0b3JzID0gZmFsc2VcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnF1ZXN0aW9uVHlwZSA9IHJhbmRFbGVtKHF1ZXN0aW9uVHlwZXMubWFwKHQ9PnJldmVyc2lmeSh0KSkpXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhMZW5ndGggPSAyMFxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA3OlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZHAgPSAwXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5ub0Rpc3RyYWN0b3JzID0gZmFsc2VcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnF1ZXN0aW9uVHlwZSA9IHJhbmRFbGVtKHF1ZXN0aW9uVHlwZXMubWFwKHQ9PnJldmVyc2lmeSh0KSkpXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhMZW5ndGggPSA5OVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA4OlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZHAgPSAxXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5ub0Rpc3RyYWN0b3JzID0gZmFsc2VcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnF1ZXN0aW9uVHlwZSA9IHJhbmRFbGVtKHF1ZXN0aW9uVHlwZXMubWFwKHQ9PnJldmVyc2lmeSh0KSkpXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhMZW5ndGggPSA5OVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA5OlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZHAgPSAxXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5ub0Rpc3RyYWN0b3JzID0gZmFsc2VcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnF1ZXN0aW9uVHlwZSA9IHJhbmRFbGVtKHF1ZXN0aW9uVHlwZXMubWFwKHQ9PnJldmVyc2lmeSh0KSkpXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhMZW5ndGggPSA1MDBcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMTA6XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBzaGFwZSA9ICd0cmlhbmdsZSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnF1ZXN0aW9uVHlwZSA9IHJhbmRFbGVtKFsncHl0aGFnb3Jhc0FyZWEnLCdweXRoYWdvcmFzSXNvc2NlbGVzQXJlYScsJ3B5dGhhZ29yYXNQZXJpbWV0ZXInXSlcbiAgICAgICAgYnJlYWtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5yYW5kb21XaXRoT3B0aW9ucyhzaGFwZSxxdWVzdGlvbk9wdGlvbnMsdmlld09wdGlvbnMpXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tV2l0aE9wdGlvbnMgKHNoYXBlOiBTaGFwZSwgb3B0aW9uczogUXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpOiBBcmVhUGVyaW1ldGVyUSB7XG4gICAgbGV0IHF1ZXN0aW9uOiBHcmFwaGljUVxuICAgIHN3aXRjaChzaGFwZSkge1xuICAgICAgY2FzZSAncmVjdGFuZ2xlJzpcbiAgICAgICAgcXVlc3Rpb24gPSBSZWN0YW5nbGVBcmVhUS5yYW5kb20ob3B0aW9ucyx2aWV3T3B0aW9ucylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3RyaWFuZ2xlJzpcbiAgICAgICAgcXVlc3Rpb24gPSBUcmlhbmdsZUFyZWFRLnJhbmRvbShvcHRpb25zLHZpZXdPcHRpb25zKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAndHJhcGV6aXVtJzpcbiAgICAgICAgcXVlc3Rpb24gPSBUcmFwZXppdW1BcmVhUS5yYW5kb20ob3B0aW9ucyx2aWV3T3B0aW9ucylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3BhcmFsbGVsb2dyYW0nOlxuICAgICAgICBxdWVzdGlvbiA9IFBhcmFsbGVsb2dyYW1BcmVhUS5yYW5kb20ob3B0aW9ucyx2aWV3T3B0aW9ucylcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm90IHlldCBpbXBsZW1lbnRlZCcpXG4gICAgfVxuICAgIHJldHVybiBuZXcgdGhpcyhxdWVzdGlvbilcbiAgfVxuXG4gIC8qIFdyYXBzIHRoZSBtZXRob2RzIG9mIHRoZSB3cmFwcGVkIHF1ZXN0aW9uICovXG4gIHJlbmRlciAoKTogdm9pZCB7IHRoaXMucXVlc3Rpb24ucmVuZGVyKCkgfVxuICBzaG93QW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24uc2hvd0Fuc3dlcigpIH1cbiAgaGlkZUFuc3dlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLmhpZGVBbnN3ZXIoKSB9XG4gIHRvZ2dsZUFuc3dlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLnRvZ2dsZUFuc3dlcigpIH1cblxuICBzdGF0aWMgZ2V0IG9wdGlvbnNTcGVjICgpIDogT3B0aW9uc1NwZWMge1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnc2hhcGVzJyxcbiAgICAgICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgICAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICAgICAgeyBpZDogJ3JlY3RhbmdsZScsIHRpdGxlOiAnUmVjdGFuZ2xlcycgfSxcbiAgICAgICAgICB7IGlkOiAndHJpYW5nbGUnLCB0aXRsZTogJ1RyaWFuZ2xlcycgfSxcbiAgICAgICAgICB7IGlkOiAncGFyYWxsZWxvZ3JhbScsIHRpdGxlOiAnUGFyYWxsZWxvZ3JhbXMnIH0sXG4gICAgICAgICAgeyBpZDogJ3RyYXBleml1bScsIHRpdGxlOiAnVHJhcGV6aWEnIH1cbiAgICAgICAgXSxcbiAgICAgICAgZGVmYXVsdDogWydyZWN0YW5nbGUnLCAndHJpYW5nbGUnLCAncGFyYWxsZWxvZ3JhbScsICd0cmFwZXppdW0nXSxcbiAgICAgICAgdGl0bGU6ICdTaGFwZXMnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogJ3F1ZXN0aW9uVHlwZXNTaW1wbGUnLFxuICAgICAgICB0eXBlOiAnc2VsZWN0LWluY2x1c2l2ZScsXG4gICAgICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgICAgICB7IGlkOiAnYXJlYScsIHRpdGxlOiAnQXJlYScgfSxcbiAgICAgICAgICB7IGlkOiAncGVyaW1ldGVyJywgdGl0bGU6ICdQZXJpbWV0ZXInIH1cbiAgICAgICAgXSxcbiAgICAgICAgZGVmYXVsdDogWydhcmVhJywgJ3BlcmltZXRlciddLFxuICAgICAgICB0aXRsZTogJ1R5cGUgb2YgcXVlc3Rpb24nXG4gICAgICB9XG4gICAgXVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSA6IHN0cmluZyB7XG4gICAgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJ1xuICB9XG59XG5cbi8qKlxuICogUHJlcGVuZCAncmV2ZXJzZScgdG8gdGhlIGJlZ2lubmluZyBvZiBhIHN0cmluZyB0aGVuIGNhbWVsIGNhc2UgaXRcbiAqIGUuZy4gcmV2ZXJzaWZ5KCdhcmVhJykgPT09ICdyZXZlcnNlQXJlYSdcbiAqIEBwYXJhbSBzdHIgQSBzdHJpbmdcbiAqIEBwYXJhbSBwcmVmaXggVGhlIHByZWZpeCB0byB1c2VcbiAqL1xuZnVuY3Rpb24gcmV2ZXJzaWZ5KHN0cjogUXVlc3Rpb25UeXBlU2ltcGxlLCBwcmVmaXg6ICdyZXZlcnNlJyB8ICdweXRoYWdvcmFzJyA9ICdyZXZlcnNlJykgOiBRdWVzdGlvblR5cGUge1xuICByZXR1cm4gcHJlZml4ICsgc3RyWzBdLnRvVXBwZXJDYXNlKCkgKyBzdHIuc2xpY2UoMSkgYXMgUXVlc3Rpb25UeXBlXG59IiwiZGVjbGFyZSBjb25zdCBrYXRleCA6IHtyZW5kZXIgOiAoc3RyaW5nOiBzdHJpbmcsIGVsZW1lbnQ6IEhUTUxFbGVtZW50KSA9PiB2b2lkfVxuaW1wb3J0IFF1ZXN0aW9uIGZyb20gXCJRdWVzdGlvbi9RdWVzdGlvbi5qc1wiO1xuaW1wb3J0IHsgY3JlYXRlRWxlbSwgcmFuZEJldHdlZW4sIHJhbmRFbGVtLCByYW5kUGFydGl0aW9uIH0gZnJvbSBcIi4uLy4uL3V0aWxpdGllcy5qc1wiO1xuaW1wb3J0ICcuL2Jhck1vZGVsLmNzcydcblxuaW50ZXJmYWNlIEJhck1vZGVsUGFydCB7XG4gIGxlbmd0aDogbnVtYmVyLFxuICBsYWJlbD86IHN0cmluZyxcbiAgbGF0ZXg/OiBib29sZWFuLFxuICBzdHlsZT86IHN0cmluZyAvLyBhIGNsYXNzXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQmFyTW9kZWxTcGVjIHtcbiAgcGFydHM6IEJhck1vZGVsUGFydFtdXG4gIHRvdGFsOiBCYXJNb2RlbFBhcnRcbn1cblxuaW50ZXJmYWNlIFBhcnRpdGlvbk9wdGlvbnMge1xuICBkaWZmaWN1bHR5OiBudW1iZXIsXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVCYXJNb2RlbChzcGVjOiBCYXJNb2RlbFNwZWMpIDogSFRNTEVsZW1lbnQge1xuICBjb25zdCBvdXRlciA9IGNyZWF0ZUVsZW0oJ2RpdicsJ2Jhck1vZGVsLW91dGVyJylcbiAgY29uc3QgdG90YWwgPSBjcmVhdGVFbGVtKCdkaXYnLCdiYXJNb2RlbC10b3RhbCcsb3V0ZXIpXG4gIGNvbnN0IGJyYWNrZXQgPSBjcmVhdGVFbGVtKCdkaXYnLCdiYXJNb2RlbC1icmFja2V0JyxvdXRlcilcbiAgY29uc3QgYmFyID0gY3JlYXRlRWxlbSgnZGl2JywnYmFyTW9kZWwtYmFyJyxvdXRlcilcblxuICBzcGVjLnBhcnRzLmZvckVhY2goIHAgPT4ge1xuICAgIGNvbnN0IHBhcnQgPSBjcmVhdGVFbGVtKCdkaXYnLCdiYXJNb2RlbC1wYXJ0JyxiYXIpXG4gICAgaWYgKHAuc3R5bGUpIHtwYXJ0LmNsYXNzTGlzdC5hZGQocC5zdHlsZSl9XG4gICAgcGFydC5zdHlsZS5mbGV4R3JvdyA9IHAubGVuZ3RoLnRvU3RyaW5nKClcbiAgICBpZiAocC5sYXRleCkge1xuICAgICAga2F0ZXgucmVuZGVyKHAubGFiZWw/PyBwLmxlbmd0aC50b1N0cmluZygpLHBhcnQpXG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcnQuaW5uZXJIVE1MID0gcC5sYWJlbCA/PyBwLmxlbmd0aC50b1N0cmluZygpXG4gICAgfVxuICB9KVxuXG4gIGlmIChzcGVjLnRvdGFsLmxhdGV4KSB7XG4gICAga2F0ZXgucmVuZGVyKHNwZWMudG90YWwubGFiZWwgPz8gc3BlYy50b3RhbC5sZW5ndGgudG9TdHJpbmcoKSwgdG90YWwpXG4gIH0gZWxzZSB7XG4gICAgdG90YWwuaW5uZXJIVE1MID0gc3BlYy50b3RhbC5sYWJlbCA/PyBzcGVjLnRvdGFsLmxlbmd0aC50b1N0cmluZygpXG4gIH1cblxuICByZXR1cm4gb3V0ZXJcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFydGl0aW9uUSBleHRlbmRzIFF1ZXN0aW9uIHtcbiAgcHJpdmF0ZSByZWFkb25seSBxdWVzdGlvblNwZWM6IEJhck1vZGVsU3BlY1xuICBwcml2YXRlIHJlYWRvbmx5IGFuc3dlclNwZWM6IEJhck1vZGVsU3BlY1xuICBwcml2YXRlIF9xdWVzdGlvbkRpdj86IEhUTUxFbGVtZW50IC8vIGNvbnN0cnVjdGVkIGxhemlseVxuICBwcml2YXRlIF9hbnN3ZXJEaXY/OiBIVE1MRWxlbWVudFxuICBjb25zdHJ1Y3RvcihxdWVzdGlvblNwZWM6IEJhck1vZGVsU3BlYywgYW5zd2VyU3BlYzogQmFyTW9kZWxTcGVjKSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMucXVlc3Rpb25TcGVjID0gcXVlc3Rpb25TcGVjXG4gICAgdGhpcy5hbnN3ZXJTcGVjID0gYW5zd2VyU3BlY1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbShvcHRpb25zOiBQYXJ0aXRpb25PcHRpb25zKSB7XG4gICAgbGV0IG1pblRvdGFsOiBudW1iZXJcbiAgICBsZXQgbWF4VG90YWw6IG51bWJlclxuICAgIGxldCBuIDogbnVtYmVyXG5cbiAgICBzd2l0Y2gob3B0aW9ucy5kaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIG1pblRvdGFsID0gIDEwXG4gICAgICAgIG1heFRvdGFsID0gMTBcbiAgICAgICAgbiA9IDJcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgbWluVG90YWwgPSA3XG4gICAgICAgIG1heFRvdGFsID0gMzBcbiAgICAgICAgbiA9IDJcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgbWluVG90YWwgPSAyMFxuICAgICAgICBtYXhUb3RhbCA9IDEwMFxuICAgICAgICBuID0gMlxuICAgICAgY2FzZSA0OlxuICAgICAgICBtaW5Ub3RhbCA9IDIwXG4gICAgICAgIG1heFRvdGFsID0gMjAwXG4gICAgICAgIG4gPSAzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDU6XG4gICAgICAgIG1pblRvdGFsID0gMjBcbiAgICAgICAgbWF4VG90YWwgPSAyMDBcbiAgICAgICAgbiA9IHJhbmRCZXR3ZWVuKDIsNClcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNjpcbiAgICAgIGNhc2UgNzpcbiAgICAgIGNhc2UgODpcbiAgICAgIGNhc2UgOTpcbiAgICAgIGNhc2UgMTA6XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBtaW5Ub3RhbCA9IDEwMFxuICAgICAgICBtYXhUb3RhbCA9IDEwMDBcbiAgICAgICAgbiA9IHJhbmRCZXR3ZWVuKDMsNClcbiAgICAgICAgYnJlYWtcbiAgICB9XG5cbiAgICBjb25zdCB0b3RhbCA9IHJhbmRCZXR3ZWVuKG1pblRvdGFsLG1heFRvdGFsKVxuICAgIGNvbnN0IG1pblByb3BvcnRpb24gPSAwLjFcbiAgICBjb25zdCBwYXJ0aXRpb24gPSByYW5kUGFydGl0aW9uKHt0b3RhbCwgbiwgbWluUHJvcG9ydGlvbn0pXG4gICAgY29uc3Qgc3BlYyA6IEJhck1vZGVsU3BlYyA9IHtcbiAgICAgIHRvdGFsOiB7bGVuZ3RoOiB0b3RhbH0sXG4gICAgICBwYXJ0czogcGFydGl0aW9uLm1hcCh4ID0+ICh7bGVuZ3RoOiB4fSkpXG4gICAgfVxuICAgIGNvbnN0IGFuc3dlclNwZWMgOiBCYXJNb2RlbFNwZWMgPSB7XG4gICAgICB0b3RhbDoge2xlbmd0aDogdG90YWx9LFxuICAgICAgcGFydHM6IHBhcnRpdGlvbi5tYXAoeCA9PiAoe2xlbmd0aDogeH0pKVxuICAgIH1cblxuICAgIGlmIChNYXRoLnJhbmRvbSgpPDAuNSkgeyAvLyBoaWRlIHRvdGFsXG4gICAgICBzcGVjLnRvdGFsLmxhYmVsID0gXCI/XCJcbiAgICAgIGFuc3dlclNwZWMudG90YWwuc3R5bGUgPSBcImFuc3dlclwiXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGkgPSByYW5kQmV0d2VlbigwLG4tMSlcbiAgICAgIGFuc3dlclNwZWMucGFydHNbaV0uc3R5bGUgPSAnYW5zd2VyJ1xuICAgICAgc3BlYy5wYXJ0c1tpXS5sYWJlbCA9IFwiP1wiXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKHNwZWMsYW5zd2VyU3BlYylcbiAgfVxuXG4gIHB1YmxpYyByZW5kZXIoKSB7XG4gICAgdGhpcy5ET00uaW5uZXJIVE1MID0gJydcbiAgICBpZiAoIXRoaXMuYW5zd2VyZWQpIHtcbiAgICAgIGNvbnN0IGJhck1vZGVsID0gdGhpcy5fcXVlc3Rpb25EaXYgPz8gKHRoaXMuX3F1ZXN0aW9uRGl2ID0gY3JlYXRlQmFyTW9kZWwodGhpcy5xdWVzdGlvblNwZWMpKVxuICAgICAgdGhpcy5ET00uYXBwZW5kKGJhck1vZGVsKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBiYXJNb2RlbCA9IHRoaXMuX2Fuc3dlckRpdiA/PyAodGhpcy5fYW5zd2VyRGl2ID0gY3JlYXRlQmFyTW9kZWwodGhpcy5hbnN3ZXJTcGVjKSlcbiAgICAgIHRoaXMuRE9NLmFwcGVuZChiYXJNb2RlbClcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgc2hvd0Fuc3dlcigpIHtcbiAgICBzdXBlci5zaG93QW5zd2VyKClcbiAgICB0aGlzLnJlbmRlcigpXG4gIH1cblxuICBwdWJsaWMgaGlkZUFuc3dlcigpIHtcbiAgICBzdXBlci5oaWRlQW5zd2VyKClcbiAgICB0aGlzLnJlbmRlcigpXG4gIH1cblxufSIsImltcG9ydCBBbGdlYnJhaWNGcmFjdGlvblEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvQWxnZWJyYWljRnJhY3Rpb25RJ1xuaW1wb3J0IEludGVnZXJBZGRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0ludGVnZXJBZGQnXG5pbXBvcnQgQXJpdGhtYWdvblEgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvQXJpdGhtYWdvblEnXG5pbXBvcnQgVGVzdFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGVzdFEnXG5pbXBvcnQgQWRkQVplcm8gZnJvbSAnUXVlc3Rpb24vVGV4dFEvQWRkQVplcm8nXG5pbXBvcnQgRXF1YXRpb25PZkxpbmUgZnJvbSAnUXVlc3Rpb24vVGV4dFEvRXF1YXRpb25PZkxpbmUnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1EgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzV3JhcHBlcidcbmltcG9ydCBBcmVhUGVyaW1ldGVyUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL0FyZWFXcmFwcGVyJ1xuXG5pbXBvcnQgT3B0aW9uc1NldCBmcm9tICdPcHRpb25zU2V0J1xuaW1wb3J0IFBhcnRpdGlvblEgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvQmFyTW9kZWxzJ1xuXG5jb25zdCB0b3BpY0xpc3QgPSBbXG4gIHtcbiAgICBpZDogJ2FsZ2VicmFpYy1mcmFjdGlvbicsXG4gICAgdGl0bGU6ICdTaW1wbGlmeSBhbGdlYnJhaWMgZnJhY3Rpb25zJyxcbiAgICBjbGFzczogQWxnZWJyYWljRnJhY3Rpb25RXG4gIH0sXG4gIHtcbiAgICBpZDogJ2FkZC1hLXplcm8nLFxuICAgIHRpdGxlOiAnTXVsdGlwbHkgYnkgMTAgKGhvbmVzdCEpJyxcbiAgICBjbGFzczogQWRkQVplcm9cbiAgfSxcbiAge1xuICAgIGlkOiAnaW50ZWdlci1hZGQnLFxuICAgIHRpdGxlOiAnQWRkIGludGVnZXJzICh2IHNpbXBsZSknLFxuICAgIGNsYXNzOiBJbnRlZ2VyQWRkUVxuICB9LFxuICB7XG4gICAgaWQ6ICdtaXNzaW5nLWFuZ2xlcycsXG4gICAgdGl0bGU6ICdNaXNzaW5nIGFuZ2xlcycsXG4gICAgY2xhc3M6IE1pc3NpbmdBbmdsZXNRXG4gIH0sXG4gIHtcbiAgICBpZDogJ2FyZWEtcGVyaW10ZXInLFxuICAgIHRpdGxlOiAnQXJlYSBhbmQgcGVyaW1ldGVyIG9mIHNoYXBlcycsXG4gICAgY2xhc3M6IEFyZWFQZXJpbWV0ZXJRXG4gIH0sXG4gIHtcbiAgICBpZDogJ2VxdWF0aW9uLW9mLWxpbmUnLFxuICAgIHRpdGxlOiAnRXF1YXRpb24gb2YgYSBsaW5lIChmcm9tIHR3byBwb2ludHMpJyxcbiAgICBjbGFzczogRXF1YXRpb25PZkxpbmVcbiAgfSxcbiAge1xuICAgIGlkOiAnYXJpdGhtYWdvbi1hZGQnLFxuICAgIHRpdGxlOiAnQXJpdGhtYWdvbnMnLFxuICAgIGNsYXNzOiBBcml0aG1hZ29uUVxuICB9LFxuICB7XG4gICAgaWQ6ICd0ZXN0JyxcbiAgICB0aXRsZTogJ1Rlc3QgcXVlc3Rpb25zJyxcbiAgICBjbGFzczogVGVzdFFcbiAgfSxcbiAge1xuICAgIGlkOiAnYmFybW9kZWwnLFxuICAgIHRpdGxlOiAnUGFydGl0aW9ucyB3aXRoIGJhciBtb2RlbHMnLFxuICAgIGNsYXNzOiBQYXJ0aXRpb25RXG4gIH1cbl1cblxuZnVuY3Rpb24gZ2V0Q2xhc3MgKGlkKSB7XG4gIC8vIFJldHVybiB0aGUgY2xhc3MgZ2l2ZW4gYW4gaWQgb2YgYSBxdWVzdGlvblxuXG4gIC8vIE9idmlvdXNseSB0aGlzIGlzIGFuIGluZWZmaWNpZW50IHNlYXJjaCwgYnV0IHdlIGRvbid0IG5lZWQgbWFzc2l2ZSBwZXJmb3JtYW5jZVxuICBmb3IgKGxldCBpID0gMDsgaSA8IHRvcGljTGlzdC5sZW5ndGg7IGkrKykge1xuICAgIGlmICh0b3BpY0xpc3RbaV0uaWQgPT09IGlkKSB7XG4gICAgICByZXR1cm4gdG9waWNMaXN0W2ldLmNsYXNzXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGxcbn1cblxuZnVuY3Rpb24gZ2V0VGl0bGUgKGlkKSB7XG4gIC8vIFJldHVybiB0aXRsZSBvZiBhIGdpdmVuIGlkXG4gIC8vXG4gIHJldHVybiB0b3BpY0xpc3QuZmluZCh0ID0+ICh0LmlkID09PSBpZCkpLnRpdGxlXG59XG5cbi8qKlxuICogR2V0cyBjb21tYW5kIHdvcmQgZnJvbSBhIHRvcGljIGlkXG4gKiBAcGFyYW0ge3N0cmluZ30gaWQgVGhlIHRvcGljIGlkXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBDb21tYW5kIHdvcmQuIFJldHVybnMgXCJcIiBpZiBubyB0b3BpYyB3aXRoIGlkXG4gKi9cbmZ1bmN0aW9uIGdldENvbW1hbmRXb3JkIChpZCkge1xuICBjb25zdCB0b3BpY0NsYXNzID0gZ2V0Q2xhc3MoaWQpXG4gIGlmICh0b3BpY0NsYXNzID09PSBudWxsKSB7XG4gICAgcmV0dXJuICcnXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGdldENsYXNzKGlkKS5jb21tYW5kV29yZFxuICB9XG59XG5cbmZ1bmN0aW9uIGdldFRvcGljcyAoKSB7XG4gIC8vIHJldHVybnMgdG9waWNzIHdpdGggY2xhc3NlcyBzdHJpcHBlZCBvdXRcbiAgcmV0dXJuIHRvcGljTGlzdC5tYXAoeCA9PiAoeyBpZDogeC5pZCwgdGl0bGU6IHgudGl0bGUgfSkpXG59XG5cbmZ1bmN0aW9uIG5ld1F1ZXN0aW9uIChpZCwgb3B0aW9ucykge1xuICAvLyB0byBhdm9pZCB3cml0aW5nIGBsZXQgcSA9IG5ldyAoVG9waWNDaG9vc2VyLmdldENsYXNzKGlkKSkob3B0aW9ucylcbiAgY29uc3QgUXVlc3Rpb25DbGFzcyA9IGdldENsYXNzKGlkKVxuICBsZXQgcXVlc3Rpb25cbiAgaWYgKFF1ZXN0aW9uQ2xhc3MucmFuZG9tKSB7XG4gICAgcXVlc3Rpb24gPSBRdWVzdGlvbkNsYXNzLnJhbmRvbShvcHRpb25zKVxuICB9IGVsc2Uge1xuICAgIHF1ZXN0aW9uID0gbmV3IFF1ZXN0aW9uQ2xhc3Mob3B0aW9ucylcbiAgfVxuICByZXR1cm4gcXVlc3Rpb25cbn1cblxuZnVuY3Rpb24gbmV3T3B0aW9uc1NldCAoaWQpIHtcbiAgY29uc3Qgb3B0aW9uc1NwZWMgPSAoZ2V0Q2xhc3MoaWQpKS5vcHRpb25zU3BlYyB8fCBbXVxuICByZXR1cm4gbmV3IE9wdGlvbnNTZXQob3B0aW9uc1NwZWMpXG59XG5cbmZ1bmN0aW9uIGhhc09wdGlvbnMgKGlkKSB7XG4gIHJldHVybiAhIShnZXRDbGFzcyhpZCkub3B0aW9uc1NwZWMgJiYgZ2V0Q2xhc3MoaWQpLm9wdGlvbnNTcGVjLmxlbmd0aCA+IDApIC8vIHdlaXJkIGJvb2wgdHlwY2FzdGluZyB3b28hXG59XG5cbmV4cG9ydCB7IHRvcGljTGlzdCwgZ2V0Q2xhc3MsIG5ld1F1ZXN0aW9uLCBnZXRUb3BpY3MsIGdldFRpdGxlLCBuZXdPcHRpb25zU2V0LCBnZXRDb21tYW5kV29yZCwgaGFzT3B0aW9ucyB9XG4iLCIhZnVuY3Rpb24odCxvKXtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKG8pOlwib2JqZWN0XCI9PXR5cGVvZiBleHBvcnRzP21vZHVsZS5leHBvcnRzPW8oKTp0LnRpbmdsZT1vKCl9KHRoaXMsZnVuY3Rpb24oKXt2YXIgbz0hMTtmdW5jdGlvbiB0KHQpe3RoaXMub3B0cz1mdW5jdGlvbigpe2Zvcih2YXIgdD0xO3Q8YXJndW1lbnRzLmxlbmd0aDt0KyspZm9yKHZhciBvIGluIGFyZ3VtZW50c1t0XSlhcmd1bWVudHNbdF0uaGFzT3duUHJvcGVydHkobykmJihhcmd1bWVudHNbMF1bb109YXJndW1lbnRzW3RdW29dKTtyZXR1cm4gYXJndW1lbnRzWzBdfSh7fSx7b25DbG9zZTpudWxsLG9uT3BlbjpudWxsLGJlZm9yZU9wZW46bnVsbCxiZWZvcmVDbG9zZTpudWxsLHN0aWNreUZvb3RlcjohMSxmb290ZXI6ITEsY3NzQ2xhc3M6W10sY2xvc2VMYWJlbDpcIkNsb3NlXCIsY2xvc2VNZXRob2RzOltcIm92ZXJsYXlcIixcImJ1dHRvblwiLFwiZXNjYXBlXCJdfSx0KSx0aGlzLmluaXQoKX1mdW5jdGlvbiBlKCl7dGhpcy5tb2RhbEJveEZvb3RlciYmKHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUud2lkdGg9dGhpcy5tb2RhbEJveC5jbGllbnRXaWR0aCtcInB4XCIsdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS5sZWZ0PXRoaXMubW9kYWxCb3gub2Zmc2V0TGVmdCtcInB4XCIpfXJldHVybiB0LnByb3RvdHlwZS5pbml0PWZ1bmN0aW9uKCl7aWYoIXRoaXMubW9kYWwpcmV0dXJuIGZ1bmN0aW9uKCl7dGhpcy5tb2RhbD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpLHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbFwiKSwwIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5sZW5ndGgmJi0xIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKFwib3ZlcmxheVwiKXx8dGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsLS1ub092ZXJsYXlDbG9zZVwiKTt0aGlzLm1vZGFsLnN0eWxlLmRpc3BsYXk9XCJub25lXCIsdGhpcy5vcHRzLmNzc0NsYXNzLmZvckVhY2goZnVuY3Rpb24odCl7XCJzdHJpbmdcIj09dHlwZW9mIHQmJnRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZCh0KX0sdGhpcyksLTEhPT10aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoXCJidXR0b25cIikmJih0aGlzLm1vZGFsQ2xvc2VCdG49ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKSx0aGlzLm1vZGFsQ2xvc2VCdG4udHlwZT1cImJ1dHRvblwiLHRoaXMubW9kYWxDbG9zZUJ0bi5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsX19jbG9zZVwiKSx0aGlzLm1vZGFsQ2xvc2VCdG5JY29uPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpLHRoaXMubW9kYWxDbG9zZUJ0bkljb24uY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbF9fY2xvc2VJY29uXCIpLHRoaXMubW9kYWxDbG9zZUJ0bkljb24uaW5uZXJIVE1MPSc8c3ZnIHZpZXdCb3g9XCIwIDAgMTAgMTBcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+PHBhdGggZD1cIk0uMyA5LjdjLjIuMi40LjMuNy4zLjMgMCAuNS0uMS43LS4zTDUgNi40bDMuMyAzLjNjLjIuMi41LjMuNy4zLjIgMCAuNS0uMS43LS4zLjQtLjQuNC0xIDAtMS40TDYuNCA1bDMuMy0zLjNjLjQtLjQuNC0xIDAtMS40LS40LS40LTEtLjQtMS40IDBMNSAzLjYgMS43LjNDMS4zLS4xLjctLjEuMy4zYy0uNC40LS40IDEgMCAxLjRMMy42IDUgLjMgOC4zYy0uNC40LS40IDEgMCAxLjR6XCIgZmlsbD1cIiMwMDBcIiBmaWxsLXJ1bGU9XCJub256ZXJvXCIvPjwvc3ZnPicsdGhpcy5tb2RhbENsb3NlQnRuTGFiZWw9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIiksdGhpcy5tb2RhbENsb3NlQnRuTGFiZWwuY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbF9fY2xvc2VMYWJlbFwiKSx0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbC5pbm5lckhUTUw9dGhpcy5vcHRzLmNsb3NlTGFiZWwsdGhpcy5tb2RhbENsb3NlQnRuLmFwcGVuZENoaWxkKHRoaXMubW9kYWxDbG9zZUJ0bkljb24pLHRoaXMubW9kYWxDbG9zZUJ0bi5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbCkpO3RoaXMubW9kYWxCb3g9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKSx0aGlzLm1vZGFsQm94LmNsYXNzTGlzdC5hZGQoXCJ0aW5nbGUtbW9kYWwtYm94XCIpLHRoaXMubW9kYWxCb3hDb250ZW50PWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiksdGhpcy5tb2RhbEJveENvbnRlbnQuY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbC1ib3hfX2NvbnRlbnRcIiksdGhpcy5tb2RhbEJveC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Q29udGVudCksLTEhPT10aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoXCJidXR0b25cIikmJnRoaXMubW9kYWwuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbENsb3NlQnRuKTt0aGlzLm1vZGFsLmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3gpfS5jYWxsKHRoaXMpLGZ1bmN0aW9uKCl7dGhpcy5fZXZlbnRzPXtjbGlja0Nsb3NlQnRuOnRoaXMuY2xvc2UuYmluZCh0aGlzKSxjbGlja092ZXJsYXk6ZnVuY3Rpb24odCl7dmFyIG89dGhpcy5tb2RhbC5vZmZzZXRXaWR0aC10aGlzLm1vZGFsLmNsaWVudFdpZHRoLGU9dC5jbGllbnRYPj10aGlzLm1vZGFsLm9mZnNldFdpZHRoLTE1LHM9dGhpcy5tb2RhbC5zY3JvbGxIZWlnaHQhPT10aGlzLm1vZGFsLm9mZnNldEhlaWdodDtpZihcIk1hY0ludGVsXCI9PT1uYXZpZ2F0b3IucGxhdGZvcm0mJjA9PW8mJmUmJnMpcmV0dXJuOy0xIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKFwib3ZlcmxheVwiKSYmIWZ1bmN0aW9uKHQsbyl7Zm9yKDsodD10LnBhcmVudEVsZW1lbnQpJiYhdC5jbGFzc0xpc3QuY29udGFpbnMobyk7KTtyZXR1cm4gdH0odC50YXJnZXQsXCJ0aW5nbGUtbW9kYWxcIikmJnQuY2xpZW50WDx0aGlzLm1vZGFsLmNsaWVudFdpZHRoJiZ0aGlzLmNsb3NlKCl9LmJpbmQodGhpcykscmVzaXplOnRoaXMuY2hlY2tPdmVyZmxvdy5iaW5kKHRoaXMpLGtleWJvYXJkTmF2OmZ1bmN0aW9uKHQpey0xIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKFwiZXNjYXBlXCIpJiYyNz09PXQud2hpY2gmJnRoaXMuaXNPcGVuKCkmJnRoaXMuY2xvc2UoKX0uYmluZCh0aGlzKX0sLTEhPT10aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoXCJidXR0b25cIikmJnRoaXMubW9kYWxDbG9zZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIix0aGlzLl9ldmVudHMuY2xpY2tDbG9zZUJ0bik7dGhpcy5tb2RhbC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsdGhpcy5fZXZlbnRzLmNsaWNrT3ZlcmxheSksd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIix0aGlzLl9ldmVudHMucmVzaXplKSxkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLHRoaXMuX2V2ZW50cy5rZXlib2FyZE5hdil9LmNhbGwodGhpcyksZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsLGRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZCksdGhpcy5vcHRzLmZvb3RlciYmdGhpcy5hZGRGb290ZXIoKSx0aGlzfSx0LnByb3RvdHlwZS5fYnVzeT1mdW5jdGlvbih0KXtvPXR9LHQucHJvdG90eXBlLl9pc0J1c3k9ZnVuY3Rpb24oKXtyZXR1cm4gb30sdC5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe251bGwhPT10aGlzLm1vZGFsJiYodGhpcy5pc09wZW4oKSYmdGhpcy5jbG9zZSghMCksZnVuY3Rpb24oKXstMSE9PXRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZihcImJ1dHRvblwiKSYmdGhpcy5tb2RhbENsb3NlQnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLHRoaXMuX2V2ZW50cy5jbGlja0Nsb3NlQnRuKTt0aGlzLm1vZGFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIix0aGlzLl9ldmVudHMuY2xpY2tPdmVybGF5KSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLHRoaXMuX2V2ZW50cy5yZXNpemUpLGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsdGhpcy5fZXZlbnRzLmtleWJvYXJkTmF2KX0uY2FsbCh0aGlzKSx0aGlzLm1vZGFsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbCksdGhpcy5tb2RhbD1udWxsKX0sdC5wcm90b3R5cGUuaXNPcGVuPWZ1bmN0aW9uKCl7cmV0dXJuISF0aGlzLm1vZGFsLmNsYXNzTGlzdC5jb250YWlucyhcInRpbmdsZS1tb2RhbC0tdmlzaWJsZVwiKX0sdC5wcm90b3R5cGUub3Blbj1mdW5jdGlvbigpe2lmKCF0aGlzLl9pc0J1c3koKSl7dGhpcy5fYnVzeSghMCk7dmFyIHQ9dGhpcztyZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiB0Lm9wdHMuYmVmb3JlT3BlbiYmdC5vcHRzLmJlZm9yZU9wZW4oKSx0aGlzLm1vZGFsLnN0eWxlLnJlbW92ZVByb3BlcnR5P3RoaXMubW9kYWwuc3R5bGUucmVtb3ZlUHJvcGVydHkoXCJkaXNwbGF5XCIpOnRoaXMubW9kYWwuc3R5bGUucmVtb3ZlQXR0cmlidXRlKFwiZGlzcGxheVwiKSx0aGlzLl9zY3JvbGxQb3NpdGlvbj13aW5kb3cucGFnZVlPZmZzZXQsZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLWVuYWJsZWRcIiksZG9jdW1lbnQuYm9keS5zdHlsZS50b3A9LXRoaXMuX3Njcm9sbFBvc2l0aW9uK1wicHhcIix0aGlzLnNldFN0aWNreUZvb3Rlcih0aGlzLm9wdHMuc3RpY2t5Rm9vdGVyKSx0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoXCJ0aW5nbGUtbW9kYWwtLXZpc2libGVcIiksXCJmdW5jdGlvblwiPT10eXBlb2YgdC5vcHRzLm9uT3BlbiYmdC5vcHRzLm9uT3Blbi5jYWxsKHQpLHQuX2J1c3koITEpLHRoaXMuY2hlY2tPdmVyZmxvdygpLHRoaXN9fSx0LnByb3RvdHlwZS5jbG9zZT1mdW5jdGlvbih0KXtpZighdGhpcy5faXNCdXN5KCkpe2lmKHRoaXMuX2J1c3koITApLCExLFwiZnVuY3Rpb25cIj09dHlwZW9mIHRoaXMub3B0cy5iZWZvcmVDbG9zZSlpZighdGhpcy5vcHRzLmJlZm9yZUNsb3NlLmNhbGwodGhpcykpcmV0dXJuIHZvaWQgdGhpcy5fYnVzeSghMSk7ZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwidGluZ2xlLWVuYWJsZWRcIiksZG9jdW1lbnQuYm9keS5zdHlsZS50b3A9bnVsbCx3aW5kb3cuc2Nyb2xsVG8oe3RvcDp0aGlzLl9zY3JvbGxQb3NpdGlvbixiZWhhdmlvcjpcImluc3RhbnRcIn0pLHRoaXMubW9kYWwuY2xhc3NMaXN0LnJlbW92ZShcInRpbmdsZS1tb2RhbC0tdmlzaWJsZVwiKTt2YXIgbz10aGlzO28ubW9kYWwuc3R5bGUuZGlzcGxheT1cIm5vbmVcIixcImZ1bmN0aW9uXCI9PXR5cGVvZiBvLm9wdHMub25DbG9zZSYmby5vcHRzLm9uQ2xvc2UuY2FsbCh0aGlzKSxvLl9idXN5KCExKX19LHQucHJvdG90eXBlLnNldENvbnRlbnQ9ZnVuY3Rpb24odCl7cmV0dXJuXCJzdHJpbmdcIj09dHlwZW9mIHQ/dGhpcy5tb2RhbEJveENvbnRlbnQuaW5uZXJIVE1MPXQ6KHRoaXMubW9kYWxCb3hDb250ZW50LmlubmVySFRNTD1cIlwiLHRoaXMubW9kYWxCb3hDb250ZW50LmFwcGVuZENoaWxkKHQpKSx0aGlzLmlzT3BlbigpJiZ0aGlzLmNoZWNrT3ZlcmZsb3coKSx0aGlzfSx0LnByb3RvdHlwZS5nZXRDb250ZW50PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMubW9kYWxCb3hDb250ZW50fSx0LnByb3RvdHlwZS5hZGRGb290ZXI9ZnVuY3Rpb24oKXtyZXR1cm4gZnVuY3Rpb24oKXt0aGlzLm1vZGFsQm94Rm9vdGVyPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiksdGhpcy5tb2RhbEJveEZvb3Rlci5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsLWJveF9fZm9vdGVyXCIpLHRoaXMubW9kYWxCb3guYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveEZvb3Rlcil9LmNhbGwodGhpcyksdGhpc30sdC5wcm90b3R5cGUuc2V0Rm9vdGVyQ29udGVudD1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5tb2RhbEJveEZvb3Rlci5pbm5lckhUTUw9dCx0aGlzfSx0LnByb3RvdHlwZS5nZXRGb290ZXJDb250ZW50PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMubW9kYWxCb3hGb290ZXJ9LHQucHJvdG90eXBlLnNldFN0aWNreUZvb3Rlcj1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5pc092ZXJmbG93KCl8fCh0PSExKSx0P3RoaXMubW9kYWxCb3guY29udGFpbnModGhpcy5tb2RhbEJveEZvb3RlcikmJih0aGlzLm1vZGFsQm94LnJlbW92ZUNoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpLHRoaXMubW9kYWwuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlciksdGhpcy5tb2RhbEJveEZvb3Rlci5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsLWJveF9fZm9vdGVyLS1zdGlja3lcIiksZS5jYWxsKHRoaXMpLHRoaXMubW9kYWxCb3hDb250ZW50LnN0eWxlW1wicGFkZGluZy1ib3R0b21cIl09dGhpcy5tb2RhbEJveEZvb3Rlci5jbGllbnRIZWlnaHQrMjArXCJweFwiKTp0aGlzLm1vZGFsQm94Rm9vdGVyJiYodGhpcy5tb2RhbEJveC5jb250YWlucyh0aGlzLm1vZGFsQm94Rm9vdGVyKXx8KHRoaXMubW9kYWwucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlciksdGhpcy5tb2RhbEJveC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKSx0aGlzLm1vZGFsQm94Rm9vdGVyLnN0eWxlLndpZHRoPVwiYXV0b1wiLHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUubGVmdD1cIlwiLHRoaXMubW9kYWxCb3hDb250ZW50LnN0eWxlW1wicGFkZGluZy1ib3R0b21cIl09XCJcIix0aGlzLm1vZGFsQm94Rm9vdGVyLmNsYXNzTGlzdC5yZW1vdmUoXCJ0aW5nbGUtbW9kYWwtYm94X19mb290ZXItLXN0aWNreVwiKSkpLHRoaXN9LHQucHJvdG90eXBlLmFkZEZvb3RlckJ0bj1mdW5jdGlvbih0LG8sZSl7dmFyIHM9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtyZXR1cm4gcy5pbm5lckhUTUw9dCxzLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLGUpLFwic3RyaW5nXCI9PXR5cGVvZiBvJiZvLmxlbmd0aCYmby5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbih0KXtzLmNsYXNzTGlzdC5hZGQodCl9KSx0aGlzLm1vZGFsQm94Rm9vdGVyLmFwcGVuZENoaWxkKHMpLHN9LHQucHJvdG90eXBlLnJlc2l6ZT1mdW5jdGlvbigpe2NvbnNvbGUud2FybihcIlJlc2l6ZSBpcyBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gdmVyc2lvbiAxLjBcIil9LHQucHJvdG90eXBlLmlzT3ZlcmZsb3c9ZnVuY3Rpb24oKXtyZXR1cm4gd2luZG93LmlubmVySGVpZ2h0PD10aGlzLm1vZGFsQm94LmNsaWVudEhlaWdodH0sdC5wcm90b3R5cGUuY2hlY2tPdmVyZmxvdz1mdW5jdGlvbigpe3RoaXMubW9kYWwuY2xhc3NMaXN0LmNvbnRhaW5zKFwidGluZ2xlLW1vZGFsLS12aXNpYmxlXCIpJiYodGhpcy5pc092ZXJmbG93KCk/dGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsLS1vdmVyZmxvd1wiKTp0aGlzLm1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoXCJ0aW5nbGUtbW9kYWwtLW92ZXJmbG93XCIpLCF0aGlzLmlzT3ZlcmZsb3coKSYmdGhpcy5vcHRzLnN0aWNreUZvb3Rlcj90aGlzLnNldFN0aWNreUZvb3RlcighMSk6dGhpcy5pc092ZXJmbG93KCkmJnRoaXMub3B0cy5zdGlja3lGb290ZXImJihlLmNhbGwodGhpcyksdGhpcy5zZXRTdGlja3lGb290ZXIoITApKSl9LHttb2RhbDp0fX0pOyIsImltcG9ydCBSU2xpZGVyIGZyb20gJ3ZlbmRvci9yc2xpZGVyJ1xuaW1wb3J0IE9wdGlvbnNTZXQgZnJvbSAnT3B0aW9uc1NldCdcbmltcG9ydCAqIGFzIFRvcGljQ2hvb3NlciBmcm9tICdUb3BpY0Nob29zZXInXG5pbXBvcnQgeyBtb2RhbCBhcyBUTW9kYWwgfSBmcm9tICd0aW5nbGUuanMnXG5pbXBvcnQgeyByYW5kRWxlbSwgY3JlYXRlRWxlbSwgaGFzQW5jZXN0b3JDbGFzcywgYm9vbE9iamVjdFRvQXJyYXkgfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5pbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIGludGVyZmFjZSBXaW5kb3cge1xuICAgIFNIT1dfRElGRklDVUxUWTogYm9vbGVhblxuICB9XG59XG53aW5kb3cuU0hPV19ESUZGSUNVTFRZID0gZmFsc2UgLy8gZm9yIGRlYnVnZ2luZyBxdWVzdGlvbnNcblxuLyogVHlwZXMgKi9cbmludGVyZmFjZSBRdWVzdGlvbkluZm8ge1xuICBjb250YWluZXI6IEhUTUxFbGVtZW50LFxuICBxdWVzdGlvbj86IFF1ZXN0aW9uLFxuICB0b3BpY0lkPzogc3RyaW5nLFxufVxuXG4vLyBNYWtlIGFuIG92ZXJsYXkgdG8gY2FwdHVyZSBhbnkgY2xpY2tzIG91dHNpZGUgYm94ZXMsIGlmIG5lY2Vzc2FyeVxuY3JlYXRlRWxlbSgnZGl2JywgJ292ZXJsYXkgaGlkZGVuJywgZG9jdW1lbnQuYm9keSkuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBoaWRlQWxsQWN0aW9ucylcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUXVlc3Rpb25TZXQge1xuICAvLyBUaGUgbWFpbiBxdWVzdGlvblxuICBxTnVtYmVyOiBudW1iZXJcbiAgYW5zd2VyZWQ6IGJvb2xlYW5cbiAgY29tbWFuZFdvcmQ6IHN0cmluZ1xuICB1c2VDb21tYW5kV29yZDogYm9vbGVhblxuXG4gIC8vIHF1ZXN0aW9ucyBhbmQgdGhlaXIgb3B0aW9uc1xuICBuOiBudW1iZXIgLy8gTnVtYmVyIG9mIHF1ZXN0aW9uc1xuICBxdWVzdGlvbnM6IFF1ZXN0aW9uSW5mb1tdIC8vIGxpc3Qgb2YgcXVlc3Rpb25zIGFuZCB0aGUgRE9NIGVsZW1lbnQgdGhleSdyZSByZW5kZXJlZCBpblxuICB0b3BpY3NPcHRpb25zITogT3B0aW9uc1NldCAvLyBPcHRpb25zU2V0IG9iamVjdCBmb3IgY2hvb3NpbmcgdG9waWNzXG4gIHRvcGljc01vZGFsITogVE1vZGFsIC8vIEEgbW9kYWwgZGlhbG9nIGZvciBkaXNwbGF5aW5nIHRvcGljc09wdGlvbnNcbiAgdG9waWNzOiBzdHJpbmdbXSAvLyBMaXN0IG9mIHNlbGVjdGVkIHRvcGljIElkc1xuICBvcHRpb25zU2V0czogUmVjb3JkPHN0cmluZywgT3B0aW9uc1NldD4gLy8gbWFwIGZyb20gdG9waWMgaWRzIHRvIHRoZWlyIG9wdGlvbnMgc2V0XG5cbiAgLy8gVUkgZWxlbWVudHNcbiAgdG9waWNDaG9vc2VyQnV0dG9uITogSFRNTEVsZW1lbnQgLy8gVGhlIGJ1dHRvbiB0byBvcGVuIHRoZSB0b3BpYyBjaG9vc2VyXG4gIGRpZmZpY3VsdHlTbGlkZXJFbGVtZW50ITogSFRNTElucHV0RWxlbWVudFxuICBkaWZmaWN1bHR5U2xpZGVyITogUlNsaWRlclxuICBnZW5lcmF0ZUJ1dHRvbiE6IEhUTUxCdXR0b25FbGVtZW50XG4gIGFuc3dlckJ1dHRvbiE6IEhUTUxFbGVtZW50XG5cbiAgLy8gRE9NIGVsZW1lbnRzIC0gaW5pdGlhbGlzZWQgaW4gX2J1aWxkKCksIGNhbGxlZCBmcm9tIGNvbnN0cnVjdG9yXG4gIGhlYWRlckJveCE6IEhUTUxFbGVtZW50XG4gIG91dGVyQm94ITogSFRNTEVsZW1lbnRcbiAgZGlzcGxheUJveCE6IEhUTUxFbGVtZW50XG5cbiAgY29uc3RydWN0b3IgKHFOdW1iZXI6IG51bWJlcikge1xuICAgIHRoaXMucXVlc3Rpb25zID0gW10gLy8gbGlzdCBvZiBxdWVzdGlvbnMgYW5kIHRoZSBET00gZWxlbWVudCB0aGV5J3JlIHJlbmRlcmVkIGluXG4gICAgdGhpcy50b3BpY3MgPSBbXSAvLyBsaXN0IG9mIHRvcGljcyB3aGljaCBoYXZlIGJlZW4gc2VsZWN0ZWQgZm9yIHRoaXMgc2V0XG4gICAgdGhpcy5vcHRpb25zU2V0cyA9IHt9IC8vIGxpc3Qgb2YgT3B0aW9uc1NldCBvYmplY3RzIGNhcnJ5aW5nIG9wdGlvbnMgZm9yIHRvcGljcyB3aXRoIG9wdGlvbnNcbiAgICB0aGlzLnFOdW1iZXIgPSBxTnVtYmVyIHx8IDEgLy8gUXVlc3Rpb24gbnVtYmVyIChwYXNzZWQgaW4gYnkgY2FsbGVyLCB3aGljaCB3aWxsIGtlZXAgY291bnQpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlIC8vIFdoZXRoZXIgYW5zd2VyZWQgb3Igbm90XG4gICAgdGhpcy5jb21tYW5kV29yZCA9ICcnIC8vIFNvbWV0aGluZyBsaWtlICdzaW1wbGlmeSdcbiAgICB0aGlzLnVzZUNvbW1hbmRXb3JkID0gdHJ1ZSAvLyBVc2UgdGhlIGNvbW1hbmQgd29yZCBpbiB0aGUgbWFpbiBxdWVzdGlvbiwgZmFsc2UgZ2l2ZSBjb21tYW5kIHdvcmQgd2l0aCBlYWNoIHN1YnF1ZXN0aW9uXG4gICAgdGhpcy5uID0gOCAvLyBOdW1iZXIgb2YgcXVlc3Rpb25zXG5cbiAgICB0aGlzLl9idWlsZCgpXG4gIH1cblxuICBfYnVpbGQgKCkge1xuICAgIHRoaXMub3V0ZXJCb3ggPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tb3V0ZXJib3gnKVxuICAgIHRoaXMuaGVhZGVyQm94ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWhlYWRlcmJveCcsIHRoaXMub3V0ZXJCb3gpXG4gICAgdGhpcy5kaXNwbGF5Qm94ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWRpc3BsYXlib3gnLCB0aGlzLm91dGVyQm94KVxuXG4gICAgdGhpcy5fYnVpbGRPcHRpb25zQm94KClcblxuICAgIHRoaXMuX2J1aWxkVG9waWNDaG9vc2VyKClcbiAgfVxuXG4gIF9idWlsZE9wdGlvbnNCb3ggKCkge1xuICAgIGNvbnN0IHRvcGljU3BhbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCB1bmRlZmluZWQsIHRoaXMuaGVhZGVyQm94KVxuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uID0gY3JlYXRlRWxlbSgnc3BhbicsICd0b3BpYy1jaG9vc2VyIGJ1dHRvbicsIHRvcGljU3BhbilcbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbi5pbm5lckhUTUwgPSAnQ2hvb3NlIHRvcGljJ1xuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5jaG9vc2VUb3BpY3MoKSlcblxuICAgIGNvbnN0IGRpZmZpY3VsdHlTcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIHVuZGVmaW5lZCwgdGhpcy5oZWFkZXJCb3gpXG4gICAgZGlmZmljdWx0eVNwYW4uYXBwZW5kKCdEaWZmaWN1bHR5OiAnKVxuICAgIGNvbnN0IGRpZmZpY3VsdHlTbGlkZXJPdXRlciA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCAnc2xpZGVyLW91dGVyJywgZGlmZmljdWx0eVNwYW4pXG4gICAgdGhpcy5kaWZmaWN1bHR5U2xpZGVyRWxlbWVudCA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgdW5kZWZpbmVkLCBkaWZmaWN1bHR5U2xpZGVyT3V0ZXIpIGFzIEhUTUxJbnB1dEVsZW1lbnRcblxuICAgIGNvbnN0IG5TcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIHVuZGVmaW5lZCwgdGhpcy5oZWFkZXJCb3gpXG4gICAgblNwYW4uYXBwZW5kKCdOdW1iZXIgb2YgcXVlc3Rpb25zOiAnKVxuICAgIGNvbnN0IG5RdWVzdGlvbnNJbnB1dCA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgJ24tcXVlc3Rpb25zJywgblNwYW4pIGFzIEhUTUxJbnB1dEVsZW1lbnRcbiAgICBuUXVlc3Rpb25zSW5wdXQudHlwZSA9ICdudW1iZXInXG4gICAgblF1ZXN0aW9uc0lucHV0Lm1pbiA9ICcxJ1xuICAgIG5RdWVzdGlvbnNJbnB1dC52YWx1ZSA9ICc4J1xuICAgIG5RdWVzdGlvbnNJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICB0aGlzLm4gPSBwYXJzZUludChuUXVlc3Rpb25zSW5wdXQudmFsdWUpXG4gICAgfSlcblxuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24gPSBjcmVhdGVFbGVtKCdidXR0b24nLCAnZ2VuZXJhdGUtYnV0dG9uIGJ1dHRvbicsIHRoaXMuaGVhZGVyQm94KSBhcyBIVE1MQnV0dG9uRWxlbWVudFxuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uZGlzYWJsZWQgPSB0cnVlXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5pbm5lckhUTUwgPSAnR2VuZXJhdGUhJ1xuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLmdlbmVyYXRlQWxsKCkpXG4gIH1cblxuICBfaW5pdFNsaWRlciAoKSB7XG4gICAgdGhpcy5kaWZmaWN1bHR5U2xpZGVyID0gbmV3IFJTbGlkZXIoe1xuICAgICAgdGFyZ2V0OiB0aGlzLmRpZmZpY3VsdHlTbGlkZXJFbGVtZW50LFxuICAgICAgdmFsdWVzOiB7IG1pbjogMSwgbWF4OiAxMCB9LFxuICAgICAgcmFuZ2U6IHRydWUsXG4gICAgICBzZXQ6IFsyLCA2XSxcbiAgICAgIHN0ZXA6IDEsXG4gICAgICB0b29sdGlwOiBmYWxzZSxcbiAgICAgIHNjYWxlOiB0cnVlLFxuICAgICAgbGFiZWxzOiB0cnVlXG4gICAgfSlcbiAgfVxuXG4gIF9idWlsZFRvcGljQ2hvb3NlciAoKSB7XG4gICAgLy8gYnVpbGQgYW4gT3B0aW9uc1NldCBvYmplY3QgZm9yIHRoZSB0b3BpY3NcbiAgICBjb25zdCB0b3BpY3MgPSBUb3BpY0Nob29zZXIuZ2V0VG9waWNzKClcbiAgICBjb25zdCBvcHRpb25zU3BlYzogT3B0aW9uc1NwZWMgPSBbXVxuICAgIHRvcGljcy5mb3JFYWNoKHRvcGljID0+IHtcbiAgICAgIG9wdGlvbnNTcGVjLnB1c2goe1xuICAgICAgICB0aXRsZTogdG9waWMudGl0bGUsXG4gICAgICAgIGlkOiB0b3BpYy5pZCxcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgc3dhcExhYmVsOiB0cnVlXG4gICAgICB9KVxuICAgIH0pXG4gICAgdGhpcy50b3BpY3NPcHRpb25zID0gbmV3IE9wdGlvbnNTZXQob3B0aW9uc1NwZWMpXG5cbiAgICAvLyBCdWlsZCBhIG1vZGFsIGRpYWxvZyB0byBwdXQgdGhlbSBpblxuICAgIHRoaXMudG9waWNzTW9kYWwgPSBuZXcgVE1vZGFsKHtcbiAgICAgIGZvb3RlcjogdHJ1ZSxcbiAgICAgIHN0aWNreUZvb3RlcjogZmFsc2UsXG4gICAgICBjbG9zZU1ldGhvZHM6IFsnb3ZlcmxheScsICdlc2NhcGUnXSxcbiAgICAgIGNsb3NlTGFiZWw6ICdDbG9zZScsXG4gICAgICBvbkNsb3NlOiAoKSA9PiB7XG4gICAgICAgIHRoaXMudXBkYXRlVG9waWNzKClcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhpcy50b3BpY3NNb2RhbC5hZGRGb290ZXJCdG4oXG4gICAgICAnT0snLFxuICAgICAgJ2J1dHRvbiBtb2RhbC1idXR0b24nLFxuICAgICAgKCkgPT4ge1xuICAgICAgICB0aGlzLnRvcGljc01vZGFsLmNsb3NlKClcbiAgICAgIH0pXG5cbiAgICAvLyByZW5kZXIgb3B0aW9ucyBpbnRvIG1vZGFsXG4gICAgdGhpcy50b3BpY3NPcHRpb25zLnJlbmRlckluKHRoaXMudG9waWNzTW9kYWwuZ2V0Q29udGVudCgpKVxuXG4gICAgLy8gQWRkIGZ1cnRoZXIgb3B0aW9ucyBidXR0b25zXG4gICAgLy8gVGhpcyBmZWVscyBhIGJpdCBpZmZ5IC0gZGVwZW5kcyB0b28gbXVjaCBvbiBpbXBsZW1lbnRhdGlvbiBvZiBPcHRpb25zU2V0XG4gICAgY29uc3QgbGlzID0gQXJyYXkuZnJvbSh0aGlzLnRvcGljc01vZGFsLmdldENvbnRlbnQoKS5nZXRFbGVtZW50c0J5VGFnTmFtZSgnbGknKSlcbiAgICBsaXMuZm9yRWFjaChsaSA9PiB7XG4gICAgICBjb25zdCB0b3BpY0lkID0gbGkuZGF0YXNldC5vcHRpb25JZFxuICAgICAgaWYgKHRvcGljSWQgIT09IHVuZGVmaW5lZCAmJiBUb3BpY0Nob29zZXIuaGFzT3B0aW9ucyh0b3BpY0lkKSkge1xuICAgICAgICBjb25zdCBvcHRpb25zQnV0dG9uID0gY3JlYXRlRWxlbSgnZGl2JywgJ2ljb24tYnV0dG9uIGV4dHJhLW9wdGlvbnMtYnV0dG9uJywgbGkpXG4gICAgICAgIHRoaXMuX2J1aWxkVG9waWNPcHRpb25zKHRvcGljSWQsIG9wdGlvbnNCdXR0b24pXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIF9idWlsZFRvcGljT3B0aW9ucyAodG9waWNJZDogc3RyaW5nLCBvcHRpb25zQnV0dG9uOiBIVE1MRWxlbWVudCkge1xuICAgIC8vIEJ1aWxkIHRoZSBVSSBhbmQgT3B0aW9uc1NldCBvYmplY3QgbGlua2VkIHRvIHRvcGljSWQuIFBhc3MgaW4gYSBidXR0b24gd2hpY2ggc2hvdWxkIGxhdW5jaCBpdFxuXG4gICAgLy8gTWFrZSB0aGUgT3B0aW9uc1NldCBvYmplY3QgYW5kIHN0b3JlIGEgcmVmZXJlbmNlIHRvIGl0XG4gICAgLy8gT25seSBzdG9yZSBpZiBvYmplY3QgaXMgY3JlYXRlZD9cbiAgICBjb25zdCBvcHRpb25zU2V0ID0gVG9waWNDaG9vc2VyLm5ld09wdGlvbnNTZXQodG9waWNJZClcbiAgICB0aGlzLm9wdGlvbnNTZXRzW3RvcGljSWRdID0gb3B0aW9uc1NldFxuXG4gICAgLy8gTWFrZSBhIG1vZGFsIGRpYWxvZyBmb3IgaXRcbiAgICBjb25zdCBtb2RhbCA9IG5ldyBUTW9kYWwoe1xuICAgICAgZm9vdGVyOiB0cnVlLFxuICAgICAgc3RpY2t5Rm9vdGVyOiBmYWxzZSxcbiAgICAgIGNsb3NlTWV0aG9kczogWydvdmVybGF5JywgJ2VzY2FwZSddLFxuICAgICAgY2xvc2VMYWJlbDogJ0Nsb3NlJ1xuICAgIH0pXG5cbiAgICBtb2RhbC5hZGRGb290ZXJCdG4oXG4gICAgICAnT0snLFxuICAgICAgJ2J1dHRvbiBtb2RhbC1idXR0b24nLFxuICAgICAgKCkgPT4ge1xuICAgICAgICBtb2RhbC5jbG9zZSgpXG4gICAgICB9KVxuXG4gICAgb3B0aW9uc1NldC5yZW5kZXJJbihtb2RhbC5nZXRDb250ZW50KCkpXG5cbiAgICAvLyBsaW5rIHRoZSBtb2RhbCB0byB0aGUgYnV0dG9uXG4gICAgb3B0aW9uc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIG1vZGFsLm9wZW4oKVxuICAgIH0pXG4gIH1cblxuICBjaG9vc2VUb3BpY3MgKCkge1xuICAgIHRoaXMudG9waWNzTW9kYWwub3BlbigpXG4gIH1cblxuICB1cGRhdGVUb3BpY3MgKCkge1xuICAgIC8vIHRvcGljIGNob2ljZXMgYXJlIHN0b3JlZCBpbiB0aGlzLnRvcGljc09wdGlvbnMgYXV0b21hdGljYWxseVxuICAgIC8vIHB1bGwgdGhpcyBpbnRvIHRoaXMudG9waWNzIGFuZCB1cGRhdGUgYnV0dG9uIGRpc3BsYXlzXG5cbiAgICAvLyBoYXZlIG9iamVjdCB3aXRoIGJvb2xlYW4gcHJvcGVydGllcy4gSnVzdCB3YW50IHRoZSB0cnVlIHZhbHVlc1xuICAgIGNvbnN0IHRvcGljcyA9IGJvb2xPYmplY3RUb0FycmF5KHRoaXMudG9waWNzT3B0aW9ucy5vcHRpb25zKVxuICAgIHRoaXMudG9waWNzID0gdG9waWNzXG5cbiAgICBsZXQgdGV4dFxuXG4gICAgaWYgKHRvcGljcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRleHQgPSAnQ2hvb3NlIHRvcGljJyAvLyBub3RoaW5nIHNlbGVjdGVkXG4gICAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmRpc2FibGVkID0gdHJ1ZVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBpZCA9IHRvcGljc1swXSAvLyBmaXJzdCBpdGVtIHNlbGVjdGVkXG4gICAgICB0ZXh0ID0gVG9waWNDaG9vc2VyLmdldFRpdGxlKGlkKVxuICAgICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlXG4gICAgfVxuXG4gICAgaWYgKHRvcGljcy5sZW5ndGggPiAxKSB7IC8vIGFueSBhZGRpdGlvbmFsIHNob3cgYXMgZS5nLiAnICsgMVxuICAgICAgdGV4dCArPSAnICsnICsgKHRvcGljcy5sZW5ndGggLSAxKVxuICAgIH1cblxuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uLmlubmVySFRNTCA9IHRleHRcbiAgfVxuXG4gIHNldENvbW1hbmRXb3JkICgpIHtcbiAgICAvLyBmaXJzdCBzZXQgdG8gZmlyc3QgdG9waWMgY29tbWFuZCB3b3JkXG4gICAgbGV0IGNvbW1hbmRXb3JkID0gVG9waWNDaG9vc2VyLmdldENvbW1hbmRXb3JkKHRoaXMudG9waWNzWzBdKVxuXG4gICAgbGV0IHVzZUNvbW1hbmRXb3JkID0gdHJ1ZSAvLyB0cnVlIGlmIHNoYXJlZCBjb21tYW5kIHdvcmRcblxuICAgIC8vIGN5Y2xlIHRocm91Z2ggcmVzdCBvZiB0b3BpY3MsIHJlc2V0IGNvbW1hbmQgd29yZCBpZiB0aGV5IGRvbid0IG1hdGNoXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCB0aGlzLnRvcGljcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKFRvcGljQ2hvb3Nlci5nZXRDb21tYW5kV29yZCh0aGlzLnRvcGljc1tpXSkgIT09IGNvbW1hbmRXb3JkKSB7XG4gICAgICAgIGNvbW1hbmRXb3JkID0gJydcbiAgICAgICAgdXNlQ29tbWFuZFdvcmQgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY29tbWFuZFdvcmQgPSBjb21tYW5kV29yZFxuICAgIHRoaXMudXNlQ29tbWFuZFdvcmQgPSB1c2VDb21tYW5kV29yZFxuICB9XG5cbiAgZ2VuZXJhdGVBbGwgKCkge1xuICAgIC8vIENsZWFyIGRpc3BsYXktYm94IGFuZCBxdWVzdGlvbiBsaXN0XG4gICAgdGhpcy5kaXNwbGF5Qm94LmlubmVySFRNTCA9ICcnXG4gICAgdGhpcy5xdWVzdGlvbnMgPSBbXVxuICAgIHRoaXMuc2V0Q29tbWFuZFdvcmQoKVxuXG4gICAgLy8gU2V0IG51bWJlciBhbmQgbWFpbiBjb21tYW5kIHdvcmRcbiAgICBjb25zdCBtYWlucSA9IGNyZWF0ZUVsZW0oJ3AnLCAna2F0ZXggbWFpbnEnLCB0aGlzLmRpc3BsYXlCb3gpXG4gICAgbWFpbnEuaW5uZXJIVE1MID0gYCR7dGhpcy5xTnVtYmVyfS4gJHt0aGlzLmNvbW1hbmRXb3JkfWAgLy8gVE9ETzogZ2V0IGNvbW1hbmQgd29yZCBmcm9tIHF1ZXN0aW9uc1xuXG4gICAgLy8gTWFrZSBzaG93IGFuc3dlcnMgYnV0dG9uXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24gPSBjcmVhdGVFbGVtKCdwJywgJ2J1dHRvbiBzaG93LWFuc3dlcnMnLCB0aGlzLmRpc3BsYXlCb3gpXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLnRvZ2dsZUFuc3dlcnMoKVxuICAgIH0pXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24uaW5uZXJIVE1MID0gJ1Nob3cgYW5zd2VycydcblxuICAgIC8vIEdldCBkaWZmaWN1bHR5IGZyb20gc2xpZGVyXG4gICAgY29uc3QgbWluZGlmZiA9IHRoaXMuZGlmZmljdWx0eVNsaWRlci5nZXRWYWx1ZUwoKVxuICAgIGNvbnN0IG1heGRpZmYgPSB0aGlzLmRpZmZpY3VsdHlTbGlkZXIuZ2V0VmFsdWVSKClcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIC8vIE1ha2UgcXVlc3Rpb24gY29udGFpbmVyIERPTSBlbGVtZW50XG4gICAgICBjb25zdCBjb250YWluZXIgPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tY29udGFpbmVyJywgdGhpcy5kaXNwbGF5Qm94KVxuICAgICAgY29udGFpbmVyLmRhdGFzZXQucXVlc3Rpb25faW5kZXggPSBpICsgJycgLy8gbm90IHN1cmUgdGhpcyBpcyBhY3R1YWxseSBuZWVkZWRcblxuICAgICAgLy8gQWRkIGNvbnRhaW5lciBsaW5rIHRvIG9iamVjdCBpbiBxdWVzdGlvbnMgbGlzdFxuICAgICAgaWYgKCF0aGlzLnF1ZXN0aW9uc1tpXSkgdGhpcy5xdWVzdGlvbnNbaV0gPSB7IGNvbnRhaW5lcjogY29udGFpbmVyIH1cblxuICAgICAgLy8gY2hvb3NlIGEgZGlmZmljdWx0eSBhbmQgZ2VuZXJhdGVcbiAgICAgIGNvbnN0IGRpZmZpY3VsdHkgPSBtaW5kaWZmICsgTWF0aC5mbG9vcihpICogKG1heGRpZmYgLSBtaW5kaWZmICsgMSkgLyB0aGlzLm4pXG5cbiAgICAgIC8vIGNob29zZSBhIHRvcGljIGlkXG4gICAgICB0aGlzLmdlbmVyYXRlKGksIGRpZmZpY3VsdHkpXG4gICAgfVxuICB9XG5cbiAgZ2VuZXJhdGUgKGk6IG51bWJlciwgZGlmZmljdWx0eTogbnVtYmVyLCB0b3BpY0lkPzogc3RyaW5nKSB7XG4gICAgdG9waWNJZCA9IHRvcGljSWQgfHwgcmFuZEVsZW0odGhpcy50b3BpY3MpXG5cbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgbGFiZWw6ICcnLFxuICAgICAgZGlmZmljdWx0eTogZGlmZmljdWx0eSxcbiAgICAgIHVzZUNvbW1hbmRXb3JkOiBmYWxzZVxuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnNTZXRzW3RvcGljSWRdKSB7XG4gICAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHRoaXMub3B0aW9uc1NldHNbdG9waWNJZF0ub3B0aW9ucylcbiAgICB9XG5cbiAgICAvLyBjaG9vc2UgYSBxdWVzdGlvblxuICAgIGNvbnN0IHF1ZXN0aW9uID0gVG9waWNDaG9vc2VyLm5ld1F1ZXN0aW9uKHRvcGljSWQsIG9wdGlvbnMpXG5cbiAgICAvLyBzZXQgc29tZSBtb3JlIGRhdGEgaW4gdGhlIHF1ZXN0aW9uc1tdIGxpc3RcbiAgICBpZiAoIXRoaXMucXVlc3Rpb25zW2ldKSB0aHJvdyBuZXcgRXJyb3IoJ3F1ZXN0aW9uIG5vdCBtYWRlJylcbiAgICB0aGlzLnF1ZXN0aW9uc1tpXS5xdWVzdGlvbiA9IHF1ZXN0aW9uXG4gICAgdGhpcy5xdWVzdGlvbnNbaV0udG9waWNJZCA9IHRvcGljSWRcblxuICAgIC8vIFJlbmRlciBpbnRvIHRoZSBjb250YWluZXJcbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLnF1ZXN0aW9uc1tpXS5jb250YWluZXJcbiAgICBjb250YWluZXIuaW5uZXJIVE1MID0gJycgLy8gY2xlYXIgaW4gY2FzZSBvZiByZWZyZXNoXG5cbiAgICAvLyBtYWtlIGFuZCByZW5kZXIgcXVlc3Rpb24gbnVtYmVyIGFuZCBjb21tYW5kIHdvcmQgKGlmIG5lZWRlZClcbiAgICBsZXQgcU51bWJlclRleHQgPSBxdWVzdGlvbkxldHRlcihpKSArICcpJ1xuICAgIGlmICh3aW5kb3cuU0hPV19ESUZGSUNVTFRZKSB7IHFOdW1iZXJUZXh0ICs9IG9wdGlvbnMuZGlmZmljdWx0eSB9XG4gICAgaWYgKCF0aGlzLnVzZUNvbW1hbmRXb3JkKSB7XG4gICAgICBxTnVtYmVyVGV4dCArPSAnICcgKyBUb3BpY0Nob29zZXIuZ2V0Q29tbWFuZFdvcmQodG9waWNJZClcbiAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdpbmRpdmlkdWFsLWNvbW1hbmQtd29yZCcpXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QucmVtb3ZlKCdpbmRpdmlkdWFsLWNvbW1hbmQtd29yZCcpXG4gICAgfVxuXG4gICAgY29uc3QgcXVlc3Rpb25OdW1iZXJEaXYgPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tbnVtYmVyIGthdGV4JywgY29udGFpbmVyKVxuICAgIHF1ZXN0aW9uTnVtYmVyRGl2LmlubmVySFRNTCA9IHFOdW1iZXJUZXh0XG5cbiAgICAvLyByZW5kZXIgdGhlIHF1ZXN0aW9uXG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHF1ZXN0aW9uLmdldERPTSgpKSAvLyB0aGlzIGlzIGEgLnF1ZXN0aW9uLWRpdiBlbGVtZW50XG4gICAgcXVlc3Rpb24ucmVuZGVyKCkgLy8gc29tZSBxdWVzdGlvbnMgbmVlZCByZW5kZXJpbmcgYWZ0ZXIgYXR0YWNoaW5nIHRvIERPTVxuXG4gICAgLy8gbWFrZSBoaWRkZW4gYWN0aW9ucyBtZW51XG4gICAgY29uc3QgYWN0aW9ucyA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1hY3Rpb25zIGhpZGRlbicsIGNvbnRhaW5lcilcbiAgICBjb25zdCByZWZyZXNoSWNvbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1yZWZyZXNoIGljb24tYnV0dG9uJywgYWN0aW9ucylcbiAgICBjb25zdCBhbnN3ZXJJY29uID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWFuc3dlciBpY29uLWJ1dHRvbicsIGFjdGlvbnMpXG5cbiAgICBhbnN3ZXJJY29uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgcXVlc3Rpb24udG9nZ2xlQW5zd2VyKClcbiAgICAgIGhpZGVBbGxBY3Rpb25zKClcbiAgICB9KVxuXG4gICAgcmVmcmVzaEljb24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLmdlbmVyYXRlKGksIGRpZmZpY3VsdHkpXG4gICAgICBoaWRlQWxsQWN0aW9ucygpXG4gICAgfSlcblxuICAgIC8vIFE6IGlzIHRoaXMgYmVzdCB3YXkgLSBvciBhbiBldmVudCBsaXN0ZW5lciBvbiB0aGUgd2hvbGUgZGlzcGxheUJveD9cbiAgICBjb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBlID0+IHtcbiAgICAgIGlmICghaGFzQW5jZXN0b3JDbGFzcyhlLnRhcmdldCBhcyBIVE1MRWxlbWVudCwgJ3F1ZXN0aW9uLWFjdGlvbnMnKSkge1xuICAgICAgICAvLyBvbmx5IGRvIHRoaXMgaWYgaXQgZGlkbid0IG9yaWdpbmF0ZSBpbiBhY3Rpb24gYnV0dG9uXG4gICAgICAgIHRoaXMuc2hvd1F1ZXN0aW9uQWN0aW9ucyhpKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICB0b2dnbGVBbnN3ZXJzICgpIHtcbiAgICBpZiAodGhpcy5hbnN3ZXJlZCkge1xuICAgICAgdGhpcy5xdWVzdGlvbnMuZm9yRWFjaChxID0+IHtcbiAgICAgICAgaWYgKHEucXVlc3Rpb24pIHEucXVlc3Rpb24uaGlkZUFuc3dlcigpXG4gICAgICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICAgICAgICB0aGlzLmFuc3dlckJ1dHRvbi5pbm5lckhUTUwgPSAnU2hvdyBhbnN3ZXJzJ1xuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5xdWVzdGlvbnMuZm9yRWFjaChxID0+IHtcbiAgICAgICAgaWYgKHEucXVlc3Rpb24pIHEucXVlc3Rpb24uc2hvd0Fuc3dlcigpXG4gICAgICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gICAgICAgIHRoaXMuYW5zd2VyQnV0dG9uLmlubmVySFRNTCA9ICdIaWRlIGFuc3dlcnMnXG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTY2FucyBmb3Igd2lkZXN0IHF1ZXN0aW9uIGFuZCB0aGVuIHNldHMgdGhlIGdyaWQgd2lkdGggdG8gdGhhdFxuICAgKi9cbiAgLyogZXNsaW50LWRpc2FibGUgKi9cbiAgYWRqdXN0R3JpZFdpZHRoICgpIHtcbiAgICByZXR1cm5cbiAgfVxuICAvKiBlc2xpbnQtZW5hYmxlICovXG5cbiAgc2hvd1F1ZXN0aW9uQWN0aW9ucyAocXVlc3Rpb25JbmRleDogbnVtYmVyKSB7XG4gICAgLy8gZmlyc3QgaGlkZSBhbnkgb3RoZXIgYWN0aW9uc1xuICAgIGhpZGVBbGxBY3Rpb25zKClcblxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMucXVlc3Rpb25zW3F1ZXN0aW9uSW5kZXhdLmNvbnRhaW5lclxuICAgIGNvbnN0IGFjdGlvbnMgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcignLnF1ZXN0aW9uLWFjdGlvbnMnKSBhcyBIVE1MRWxlbWVudFxuXG4gICAgLy8gVW5oaWRlIHRoZSBvdmVybGF5XG4gICAgY29uc3Qgb3ZlcmxheSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5vdmVybGF5JylcbiAgICBpZiAob3ZlcmxheSAhPT0gbnVsbCkgb3ZlcmxheS5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgIGFjdGlvbnMuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJylcbiAgICBhY3Rpb25zLnN0eWxlLmxlZnQgPSAoY29udGFpbmVyLm9mZnNldFdpZHRoIC8gMiAtIGFjdGlvbnMub2Zmc2V0V2lkdGggLyAyKSArICdweCdcbiAgICBhY3Rpb25zLnN0eWxlLnRvcCA9IChjb250YWluZXIub2Zmc2V0SGVpZ2h0IC8gMiAtIGFjdGlvbnMub2Zmc2V0SGVpZ2h0IC8gMikgKyAncHgnXG4gIH1cblxuICBhcHBlbmRUbyAoZWxlbTogSFRNTEVsZW1lbnQpIHtcbiAgICBlbGVtLmFwcGVuZENoaWxkKHRoaXMub3V0ZXJCb3gpXG4gICAgdGhpcy5faW5pdFNsaWRlcigpIC8vIGhhcyB0byBiZSBpbiBkb2N1bWVudCdzIERPTSB0byB3b3JrIHByb3Blcmx5XG4gIH1cblxuICBhcHBlbmRCZWZvcmUgKHBhcmVudDogSFRNTEVsZW1lbnQsIGVsZW06IEhUTUxFbGVtZW50KSB7XG4gICAgcGFyZW50Lmluc2VydEJlZm9yZSh0aGlzLm91dGVyQm94LCBlbGVtKVxuICAgIHRoaXMuX2luaXRTbGlkZXIoKSAvLyBoYXMgdG8gYmUgaW4gZG9jdW1lbnQncyBET00gdG8gd29yayBwcm9wZXJseVxuICB9XG59XG5cbmZ1bmN0aW9uIHF1ZXN0aW9uTGV0dGVyIChpOiBudW1iZXIpIHtcbiAgLy8gcmV0dXJuIGEgcXVlc3Rpb24gbnVtYmVyLiBlLmcuIHFOdW1iZXIoMCk9XCJhXCIuXG4gIC8vIEFmdGVyIGxldHRlcnMsIHdlIGdldCBvbiB0byBncmVla1xuICBjb25zdCBsZXR0ZXIgPVxuICAgICAgICBpIDwgMjYgPyBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4NjEgKyBpKVxuICAgICAgICAgIDogaSA8IDUyID8gU3RyaW5nLmZyb21DaGFyQ29kZSgweDQxICsgaSAtIDI2KVxuICAgICAgICAgICAgOiBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4M0IxICsgaSAtIDUyKVxuICByZXR1cm4gbGV0dGVyXG59XG5cbmZ1bmN0aW9uIGhpZGVBbGxBY3Rpb25zICgpIHtcbiAgLy8gaGlkZSBhbGwgcXVlc3Rpb24gYWN0aW9uc1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucXVlc3Rpb24tYWN0aW9ucycpLmZvckVhY2goZWwgPT4ge1xuICAgIGVsLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpXG4gIH0pXG4gIGNvbnN0IG92ZXJsYXkgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcub3ZlcmxheScpXG4gIGlmIChvdmVybGF5ICE9PSBudWxsKSB7IG92ZXJsYXkuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJykgfSBlbHNlIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGZpbmQgb3ZlcmxheSB3aGVuIGhpZGluZyBhY3Rpb25zJylcbn1cbiIsImltcG9ydCBRdWVzdGlvblNldCBmcm9tICdRdWVzdGlvblNldCdcblxuLyogVE9ETzpcbiAqIC4gUXVlc3Rpb24gbnVtYmVyIGluIGNvbnRyb2xzXG4gKi9cblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsICgpID0+IHtcbiAgY29uc3QgcXMgPSBuZXcgUXVlc3Rpb25TZXQoKVxuICBxcy5hcHBlbmRUbyhkb2N1bWVudC5ib2R5KVxuICBxcy5jaG9vc2VUb3BpY3MoKVxuXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmdWxsc2NyZWVuJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgIGlmIChkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCkge1xuICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKS50aGVuKCgpID0+IHtcbiAgICAgICAgZS50YXJnZXQuaW5uZXJUZXh0ID0gJ0Z1bGwgc2NyZWVuJ1xuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlcXVlc3RGdWxsc2NyZWVuKCkudGhlbigoKSA9PiB7XG4gICAgICAgIGUudGFyZ2V0LmlubmVyVGV4dCA9IFwiRXhpdCBmdWxsIHNjcmVlblwiXG4gICAgICB9KVxuICAgIH1cbiAgfSlcblxuICBsZXQgY29udHJvbHNIaWRkZW4gPSBmYWxzZVxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaGlkZS1jb250cm9scycpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICBpZiAoIWNvbnRyb2xzSGlkZGVuKSB7XG4gICAgICBbLi4uZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgncXVlc3Rpb24taGVhZGVyYm94JyldLmZvckVhY2goIGVsZW0gPT4ge1xuICAgICAgICBlbGVtLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpXG4gICAgICB9KVxuICAgICAgZS50YXJnZXQuaW5uZXJUZXh0ID0gJ1Nob3cgY29udHJvbHMnXG4gICAgICBjb250cm9sc0hpZGRlbiA9IHRydWVcbiAgICB9IGVsc2Uge1xuICAgICAgWy4uLmRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3F1ZXN0aW9uLWhlYWRlcmJveCcpXS5mb3JFYWNoKCBlbGVtID0+IHtcbiAgICAgICAgZWxlbS5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgICAgfSlcbiAgICAgIGUudGFyZ2V0LmlubmVyVGV4dCA9ICdIaWRlIGNvbnRyb2xzJ1xuICAgICAgY29udHJvbHNIaWRkZW4gPSBmYWxzZVxuICAgIH1cbiAgfSkgXG5cbn0pXG4iXSwibmFtZXMiOlsiRnJhY3Rpb24iLCJmcmFjdGlvbiIsIlRELmdldFRyaWFuZ2xlIiwidGhpcyIsIlJTbGlkZXIiLCJUb3BpY0Nob29zZXIuZ2V0VG9waWNzIiwiVE1vZGFsIiwiVG9waWNDaG9vc2VyLmhhc09wdGlvbnMiLCJUb3BpY0Nob29zZXIubmV3T3B0aW9uc1NldCIsIlRvcGljQ2hvb3Nlci5nZXRUaXRsZSIsIlRvcGljQ2hvb3Nlci5nZXRDb21tYW5kV29yZCIsIlRvcGljQ2hvb3Nlci5uZXdRdWVzdGlvbiJdLCJtYXBwaW5ncyI6Ijs7O0VBQUE7RUFDQTtFQUNBO0FBQ0E7RUFDQSxJQUFJLEVBQUUsR0FBRyxVQUFVLElBQUksRUFBRTtFQUN6QixFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSTtFQUNuQixFQUFFLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSTtFQUMxQixFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSTtFQUNwQixFQUFFLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBQztFQUN0QixFQUFFLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBQztFQUNyQixFQUFFLElBQUksQ0FBQyxZQUFZLEdBQUcsRUFBQztFQUN2QixFQUFFLElBQUksQ0FBQyxRQUFRLEdBQUcs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LElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDckIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLEVBQUU7RUFDL0wsR0FBRztFQUNILEVBQUUsT0FBTyxJQUFJLENBQUMsWUFBWSxFQUFFO0VBQzVCLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLFlBQVk7RUFDeEMsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUM7RUFDeEQsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyw0QkFBMkI7RUFDckQsRUFBRSxJQUFJLENBQUMsUUFBUSxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUM7RUFDekQsRUFBRSxJQUFJLENBQUMsUUFBUSxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEVBQUM7RUFDekUsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUM7QUFDbkQ7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7RUFDekIsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7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VUFBVSxLQUFLLEVBQUUsR0FBRyxFQUFFO0VBQy9DLEVBQUUsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxHQUFHLE1BQUs7QUFDdkQ7RUFDQSxFQUFFLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBQyxFQUFFO0FBQ3JIO0VBQ0EsRUFBRSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFDLEVBQUU7QUFDcEc7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUcsRUFBRTtBQUNyRztFQUNBLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSTtBQUN0RztFQUNBLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRTtFQUN2QixJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7RUFDM0IsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBQztFQUMvRCxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFDO0VBQzdELEtBQUs7RUFDTCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFDO0VBQ3BHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUk7RUFDN0YsR0FBRyxNQUFNO0VBQ1QsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUMsRUFBRTtFQUN0RixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFDO0VBQ3hELEdBQUc7QUFDSDtFQUNBLEVBQUUsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxFQUFDO0VBQ2xHLEVBQUUsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsRUFBQztBQUNsRDtFQUNBLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxLQUFJO0VBQ3RGLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSTtBQUNqRTtFQUNBLEVBQUUsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFO0VBQ3hCLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLFVBQVUsQ0FBQyxFQUFFO0VBQ3pDLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNO0FBQ2hDO0VBQ0EsRUFBRSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUM7QUFDakU7RUFDQSxFQUFFLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxFQUFDO0VBQzFFLEVBQUUsSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxFQUFDO0FB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QyxDQUFBO1VBQ3pELE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUE7VUFFdkIsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxFQUFFLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQTtPQUNyQztNQUVELE9BQU8sUUFBUSxDQUFFLENBQVEsRUFBRSxDQUFRLEVBQUUsQ0FBUTs7VUFFM0MsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7VUFDOUIsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7VUFDOUIsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7VUFFOUIsTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7VUFDM0IsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDeEMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFFeEMsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLEdBQUcsU0FBUyxFQUFFLElBQUksR0FBRyxTQUFTLENBQUMsQ0FBQTtPQUNyRDtNQUVELE9BQU8sR0FBRyxDQUFFLE1BQWdCO1VBQzFCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtVQUNoRSxNQUFNLElBQUksR0FB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QUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxLQUFLO0FBQ0w7RUFDQTtFQUNBLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDMUIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osS0FBSztBQUNMO0VBQ0EsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDM0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7QUFDM0M7RUFDQTtFQUNBLElBQUksTUFBTSxRQUFRLEdBQUcsQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQztFQUN2RixJQUFJLElBQUksUUFBUSxDQUFDLGNBQWMsRUFB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LENBQUM7RUFDaEIsS0FBSztBQUNMO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksS0FBSyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUMxQjtFQUNBLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNsQjtFQUNBO0FBQ0E7RUFDQSxNQUFNLE9BQU8sSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUMvRixLQUFLO0FBQ0w7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsSUFBSSxLQUFLLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQzFCO0VBQ0EsTUFBTSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2xCO0VBQ0E7QUFDQTtFQUNBLE1BQU0sSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDM0MsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDO0VBQzVCLE9BQU87RUFDUCxNQUFNLE9BQU8sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUMvRixLQUFLO0FBQ0w7RUFDQTtFQUNBO0VBQ0E7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QUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDMUYsT0FBTyxNQUFNO0VBQ2IsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3hGLE9BQU87RUFDUCxLQUFLO0FBQ0w7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsSUFBSSxRQUFRLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQzdCO0VBQ0EsTUFBTSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQ2xCLE1BQU0sT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUM1RSxLQUFLO0FBQ0w7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsSUFBSSxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQzlCO0VBQ0EsTUFBTSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQ2xCLE1BQU0sSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUM3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Q0EsSUFBSSxJQUFJLFFBQVEsRUFBRSxNQUFNLEdBQUcsTUFBTSxDQUFDLFFBQVEsR0FBRTtBQUM1QztFQUNBLElBQUksT0FBTyxNQUFNO0VBQ2pCLEdBQUc7QUFDSDtFQUNBLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtFQUN2QixJQUFJLElBQUksRUFBRSxJQUFJLFlBQVksVUFBVSxDQUFDLEVBQUU7RUFDdkMsTUFBTSxJQUFJLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFDO0VBQ2pDLEtBQUs7RUFDTCxJQUFJLE1BQU0sS0FBSyxHQUFHLEdBQUU7RUFDcEIsSUFBSSxJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUUsUUFBUSxHQUFHLEtBQUk7RUFDL0MsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDaEQsTUFBTSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDbEQsUUFBUSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQztFQUNwRCxPQUFPO0VBQ1AsS0FBSztBQUNMO0VBQ0EsSUFBSSxJQUFJLE1BQU0sR0FBRyxJQUFJLFVBQVUsQ0FBQyxLQUFLLEVBQUM7RUFDdEMsSUFBSSxJQUFJLFFBQVEsRUFBRSxNQUFNLEdBQUcsTUFBTSxDQUFDLFFBQVEsR0FBRTtBQUM1QztFQUNBLElBQUksT0FBTyxNQUFNO0VBQ2pCLEdBQUc7QUFDSDtFQUNBLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRTtFQUNwQixJQUFJLElBQUksTUFBTSxHQUFHLEtBQUk7RUFDckIsSUFBSSxLQUFLLElB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QUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDekMsVUFBVSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUNyRCxVQUFVLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDeEQsVUFBVSxJQUFJLElBQUksR0FBRyxNQUFLO0VBQzFCLFVBQVUsSUFBSSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksSUFBSSxTQUFRO0VBQ3pELFVBQVUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLElBQUksR0FBRyxHQUFHLFNBQVE7RUFDakQsVUFBVSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHO0VBQzdCLFlBQVksR0FBRyxFQUFFLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQztFQUNyQyxZQUFZLE1BQU0sRUFBRSxLQUFLO0VBQ3pCLFlBQVc7RUFDWCxTQUFTO0VBQ1QsUUFBUSxLQUFLO0VBQ2IsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsRUFBRTtFQUNkLFFBQVEsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUM7RUFDL0MsUUFBUSxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBQztFQUNsRCxRQUFRLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBQztFQUN0RCxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3pDLFVBQVUsTUFBTSxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFB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QyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1VBQzdCLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFBO1VBQ1gsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFBO1VBQ2xCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Y0FDaEQsVUFBVSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUE7Y0FDaEQsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQTtXQUNoRDs7VUFHRCxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBOztVQUV0RyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBOztVQUdyQyxVQUFVLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQTtVQUM1RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7O2NBRS9DLE1BQU0sS0FBSyxHQUFvQixFQUFFLENBQUE7Y0FDakMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7Y0FD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cEYsT0FBTyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDN0MsV0FBVyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDakQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUE7VUFDL0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FDNUQ7TUFFRCxNQUFNO1VBQ0osTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7VUFDeEMsSUFBSSxHQUFHLEtBQUssSUFBSTtjQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQTtVQUVqRSxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDekMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUE7VUFFM0IsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7VUFFMUQsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFBO1VBQ2YsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxD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QUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUM7QUFDcEM7RUFDQSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFDO0VBQzFCLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDMUIsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFBQztFQUNwQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFDO0VBQzFCLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUM7RUFDcEMsQ0FBQztBQUNEO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNPLFNBQVMsY0FBYyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUU7RUFDcEQsRUFBRSxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDdkMsRUFBRSxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDdkMsRUFBRSxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFDO0VBQ3BFLEVBQUUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBQztFQUN2RSxFQUFFLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLEVBQUM7RUFDcEUsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBQztFQUM1QixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFDO0VBQzVCLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUM7RUFDNUIsQ0FBQztBQUNEO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ08sU0FBUyxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUU7RUFDdEUsRUFBRSxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDckMsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUk7RUFDaEIsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUk7RUFDaEIsRUFBRSxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUU7QUFDMUM7RUFDQSxFQUFFLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztBQUM1QjtFQUNBLEVBQUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUs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Q0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtVQUM5QixHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDOUIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1VBQzlCLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtVQUM5QixHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDOUIsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFBO1VBQ1osR0FBRyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7VUFDaEMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFBO1VBQ1YsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFBOztVQUdmLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQ25CLEVBQUUsRUFDRixJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDN0UsQ0FBQTtVQUNELEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtVQUNmLGNBQWMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxF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LENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7VUFDeEQsTUFBTSxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDLENBQUM7VUFFbEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztVQUM1RCxNQUFNLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQzs7VUFJOUMsTUFBTSxRQUFRLFNBQUcsV0FBVyxDQUFDLFFBQVEsbUNBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUNqRTtVQUFBLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEdBQUcsRUFBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtVQUNyRCxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEdBQUcsRUFBQyxHQUFHLENBQUMsRUFBRSxXQUFXLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7O1VBSXZGLE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztVQUU1QixNQUFNLEtBQUssR0FB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QUM3RCxJQUFJLFNBQVMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sS0FBSyxZQUFZLENBQUMsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsVUFBVSxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtFQUNoSCxJQUFJLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLFVBQVUsT0FBTyxFQUFFLE1BQU0sRUFBRTtFQUMvRCxRQUFRLFNBQVMsU0FBUyxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7RUFDbkcsUUFBUSxTQUFTLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7RUFDdEcsUUFBUSxTQUFTLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUU7RUFDdEgsUUFBUSxJQUFJLENBQUMsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsVUFBVSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7RUFDOUUsS0FBSyxDQUFDLENBQUM7RUFDUDs7RUN6RUEsTUFBTSxRQUFRLEdB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QUMsRUFBRTtrQkFBRSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQTtlQUFFO2NBQ3RELElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7a0JBQUUsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUE7ZUFBRTs7Y0FHckQsSUFBSSxDQUFDLFFBQVEsU0FBRyxJQUFJLENBQUMsUUFBUSxtQ0FBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQzNEO2NBQUEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFTLENBQUMsQ0FBQyxDQUFBO2NBQzNFLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFBOzs7Y0FJekYsTUFBTSxLQUFLLEdBQTZCO2tCQUN0QyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztrQkFDaEMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7a0JBQ2pDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFD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Q0FBQyxDQUFDO0VBQzVFOzs7RUNySEEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBMEUsY0FBYyxDQUFDLENBQUMsR0FBZSxDQUFDLENBQUNFLGNBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksRUFBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLHVVQUF1VSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsR0FBRyxVQUFVLEdBQUcsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFNLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFJLFVBQVUsRUFBRSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU0sUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGtDQUFrQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENB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
