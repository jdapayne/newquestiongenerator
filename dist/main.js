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
      if (arr.length === 0)
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

  /**
   * Abstract class representing a text-based quesion. Subclasses are expected to either initialise questionLaTeX
   * and answerLaTeX in their constructor, or to pass these into their constructor from a static factory method
   */
  class TextQ extends Question {
      constructor(questionLaTeX, answerLaTeX, options) {
          super(); // creates/sets this.DOM, and initialises this.answered
          this.questionLaTeX = questionLaTeX; // NB may be undefined
          this.answerLaTeX = answerLaTeX;
          // Make the DOM tree for the element
          this.questionp = document.createElement('p');
          this.answerp = document.createElement('p');
          this.questionp.className = 'question';
          if (options === null || options === void 0 ? void 0 : options.questionClass)
              this.questionp.classList.add(options.questionClass);
          this.answerp.className = 'answer';
          if (options === null || options === void 0 ? void 0 : options.answerClass)
              this.answerp.classList.add(options.answerClass);
          this.answerp.classList.add('hidden');
          this.DOM.appendChild(this.questionp);
          this.DOM.appendChild(this.answerp);
      }
      render() {
          // update the DOM item with questionLaTeX and answerLaTeX
          if (!this.questionLaTeX || !this.answerLaTeX) {
              console.error('Attempt to render text question before question or answer set');
              return;
          }
          katex.render(this.questionLaTeX, this.questionp, { displayMode: true, strict: 'ignore' });
          katex.render(this.answerLaTeX, this.answerp, { displayMode: true });
      }
      getDOM() {
          return this.DOM;
      }
      showAnswer() {
          this.answerp.classList.remove('hidden');
          this.answered = true;
      }
      hideAnswer() {
          this.answerp.classList.add('hidden');
          this.answered = false;
      }
  }

  /* Main question class. This will be spun off into different file and generalised */
  class AlgebraicFractionQ extends TextQ {
    // 'extends' Question, but nothing to actually extend
    constructor (options) {
      super();

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
      super();

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

  var Fraction = /*@__PURE__*/getDefaultExportFromCjs(fraction);

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
          val: new Fraction(randBetweenFilter(
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
            val: new Fraction(num, den),
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
            val: new Fraction(num, den),
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
          val: new Fraction(n, d),
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

  /* Main question class. This will be spun off into different file and generalised */
  class EquationOfLine extends TextQ {
    // 'extends' Question, but nothing to actually extend
    constructor (options) {
      // boilerplate
      super();

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
          m = new Fraction(mn, md);
          x1 = new Fraction(randBetween(-10, 10));
          y1 = new Fraction(randBetween(-10, 10));
          c = new Fraction(y1).sub(m.mul(x1));
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
                  v.label = new Fraction(v.val, denominator).toLatex(true) + "\\mathrm{cm}";
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
                  this._perimeter.label = new Fraction(this._perimeter.val, this.denominator).toLatex(true) + '\\mathrm{cm}';
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
                  this._area.label = new Fraction(this._area.val, Math.pow(this.denominator, 2)).toLatex(true) + '\\mathrm{cm}^2';
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
                  v.label = new Fraction(v.val, denominator).toLatex(true) + '\\mathrm{cm}';
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
                  this._perimeter.label = new Fraction(this._perimeter.val, this.denominator).toLatex(true) + '\\mathrm{cm}';
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
                  this._area.label = new Fraction(this._area.val, Math.pow(this.denominator, 2)).toLatex(true) + '\\mathrm{cm}^2';
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
                  this._perimeter.label = new Fraction(this._perimeter.val, this.denominator).toLatex(true) + '\\mathrm{cm}';
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
                  this._area.label = new Fraction(this._area.val, Math.pow(this.denominator, 2)).toLatex(true) + '\\mathrm{cm}^2';
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
                  v.label = new Fraction(v.val, denominator).toLatex(true) + '\\mathrm{cm}';
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

  const pathRoot = '.';
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
                  this._perimeter.label = new Fraction(this._perimeter.val, this.denominator).toLatex(true) + '\\mathrm{cm}';
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
                  this._area.label = new Fraction(this._area.val, Math.pow(this.denominator, 2)).toLatex(true) + '\\mathrm{cm}^2';
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
                      v.label = new Fraction(v.val, denominator).toLatex(true) + "\\mathrm{cm}";
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
          // TODO Add custom options
          const shape = randElem(options.shapes);
          return this.randomFromDifficulty(options.difficulty, shape, options.questionTypesSimple);
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

  /**
   * The primes up to 30
   */
  const PRIMES30 = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
  const PRIMES50 = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 31, 43, 47];

  class FractionAddQ extends TextQ {
      /**
       * Random based on difficulty:
       * 1. Same denominator, proper, no simplifying
       * 2. Same denominator, proper, needs simplifying
       * 3. Denominator multiples, proper, may need simplifying (can I control this?)
       * 4. Denominator not multiples, proper, may need simplifying
       * 5. Small improper fractions, same denominator
       * 6. Improper, different denominator
       * 7. Three fractions, improper
       * 8. Three fractions with multiplication by integer
       * 9. ax + by a,b in |N, x, y in |Q
       * 10. Big numbers
       *
       * @param options difficulty
       */
      static random(options) {
          let addends;
          const subtract = (Math.random() < 0.5);
          switch (options.difficulty) {
              case 1: { // common denominator, no simplifying
                  const den = randElem(PRIMES30.filter(p => p < 20 && p > 3)); // denominator is a prime
                  const a = randBetween(1, den - 2) + (subtract ? 1 : 0); // If subtacting want 2->den-1
                  const b = subtract ? -randBetween(1, a - 1) : randBetween(1, den - a - 1);
                  addends = [new Fraction(a, den), new Fraction(b, den)];
                  break;
              }
              case 2: { // common denominator, simplifies
                  const den = randBetweenFilter(4, 20, n => !PRIMES30.includes(n)); // non-prime
                  const a = subtract ?
                      randBetweenFilter(2, den - 1, n => gcd(n, den) === 1) :
                      randBetweenFilter(1, den - 2, n => gcd(n, den) === 1); // non-simplifying. Guaranteed to exist since 1 works
                  const b = subtract ?
                      -randBetweenFilter(1, a - 1, n => gcd(n, den) === 1 && gcd(a - n, den) !== 1) :
                      randBetweenFilter(1, den - a - 1, n => gcd(n, den) === 1 && gcd(a + n, den) !== 1);
                  addends = [new Fraction(a, den), new Fraction(b, den)];
                  break;
              }
              case 3: { // One denominator a multiple of another. Might simplify
                  const den1 = randBetween(2, 10);
                  const multiplier = randBetween(2, 5);
                  const den2 = multiplier * den1;
                  let a;
                  let b;
                  if (Math.random() < 0.5) { // big denominator second
                      a = randBetweenFilter(1, den1 - 1, n => gcd(n, den1) === 1);
                      b = subtract ?
                          -randBetweenFilter(1, multiplier * a - 1, n => gcd(n, den2) === 1) :
                          randBetweenFilter(1, den2 - multiplier * a - 1, n => gcd(n, den2) === 1);
                      addends = [new Fraction(a, den1), new Fraction(b, den2)];
                  }
                  else { // big denominator first
                      a = subtract ?
                          randBetweenFilter(multiplier + 1, den2 - 1, n => gcd(n, den2) === 1) :
                          randBetweenFilter(1, den2 - multiplier - 1, n => gcd(n, den2) === 1);
                      b = subtract ?
                          -randBetweenFilter(1, Math.floor(a / multiplier), n => gcd(n, den1) === 1) :
                          randBetweenFilter(1, den1 - Math.ceil(a / multiplier), n => gcd(n, den1) === 1);
                      addends = [new Fraction(a, den2), new Fraction(b, den1)];
                  }
                  break;
              }
              case 4:
              default: { // Classic different denominators
                  // n1/m1b + n2/m2b where m1,m2 coprime
                  const b = randBetween(2, 5);
                  const m1 = randBetween(2, 4);
                  const m2 = randBetweenFilter(2, 4, n => gcd(m1, n) === 1);
                  const d1 = b * m1;
                  const d2 = b * m2;
                  let n1;
                  let n2;
                  if (subtract) {
                      n1 = randBetweenFilter(Math.ceil(m1 / m2), d1 - 1, n => gcd(n, d1) === 1); // use pen and paper to derive this minimum
                      n2 = -randBetweenFilter(1, d2 - 1, n => (gcd(n, d2) === 1 && (m2 * n1 - m1 * n > 0)));
                  }
                  else {
                      n1 = randBetweenFilter(1, Math.floor(m1 * b - m1 / m2), n => gcd(n, d2) === 1); // use pen and paper
                      n2 = randBetweenFilter(1, d2 - 1, n => (gcd(n, d2) === 1 && n1 * m2 + n * m1 < b * m1 * m2));
                  }
                  addends = [new Fraction(n1, d1), new Fraction(n2, d2)];
              }
          }
          const question = addends[0].toLatex(true) + addends.slice(1).map(toSignedMixedLaTex).join(''); // join with sign
          const answer = '=' + addends.reduce((prev, curr) => prev.add(curr)).toLatex(true);
          return new this(question, answer, { questionClass: 'adjacent', answerClass: 'adjacent' });
      }
      static randomPairWithOptions({ denominators, maxDenominator, maxIntegerPart, simplify, subtract }) {
          let f1;
          let f2;
          switch (denominators) {
              case 'same': {
                  const d = (simplify === true) ? randBetweenFilter(5, maxDenominator, n => PRIMES50.includes(n)) :
                      (simplify === false) ? randBetweenFilter(4, maxDenominator, n => !PRIMES50.includes(n)) :
                          /*undefined*/ randBetween(4, maxDenominator);
                  const maxNumerator = (maxIntegerPart + 1) * d - 1;
                  let n1;
                  let n2;
                  if (subtract) {
                      n1 = randBetweenFilter(2, maxNumerator, coPrimeWith(d));
                      n2 = -randBetweenFilter(1, n1 - 1, coPrimeWith(d));
                  }
                  else {
                      n1 = randBetweenFilter(1, maxNumerator, coPrimeWith(d));
                      const filter = (simplify === true) ? n => coPrimeWith(d)(n) && !coPrimeWith(d)(n1 + n) :
                          (simplify === false) ? n => coPrimeWith(d)(n) && coPrimeWith(d)(n1 + n) :
                              n => coPrimeWith(d)(n);
                      n2 = randBetweenFilter(1, maxNumerator - n1, filter);
                  }
                  f1 = new Fraction(n1, d);
                  f2 = new Fraction(n2, d);
                  break;
              }
              case 'multiple': {
                  const d1 = randBetween(2, 10);
                  const m = randBetween(2, 5);
                  const d2 = m * d1;
                  let n1;
                  let n2;
                  if (Math.random() < 0.5) { // big denominator second
                      n1 = randBetweenFilter(1, d1 - 1, n => gcd(n, d1) === 1);
                      n2 = subtract ?
                          -randBetweenFilter(1, m * n1 - 1, n => gcd(n, d2) === 1) :
                          randBetweenFilter(1, d2 - m * n1 - 1, n => gcd(n, d2) === 1);
                      f1 = new Fraction(n1, d1);
                      f2 = new Fraction(n2, d2);
                  }
                  else { // big denominator first
                      n1 = subtract ?
                          randBetweenFilter(m + 1, d2 - 1, n => gcd(n, d2) === 1) :
                          randBetweenFilter(1, d2 - m - 1, n => gcd(n, d2) === 1);
                      n2 = subtract ?
                          -randBetweenFilter(1, Math.floor(n1 / m), n => gcd(n, d1) === 1) :
                          randBetweenFilter(1, d1 - Math.ceil(n1 / m), n => gcd(n, d1) === 1);
                      f1 = new Fraction(n1, d2);
                      f2 = new Fraction(n2, d1);
                  }
                  break;
              }
              case 'sharedFactor': {
                  f1 = new Fraction(1, 2);
                  f2 = new Fraction(1, 2);
              }
          }
          return [f1, f2];
      }
      static get commandWord() { return 'Calculate'; }
  }
  function toSignedMixedLaTex(f) {
      let latex = f.toLatex(true);
      if (!latex.startsWith('-'))
          latex = '+' + latex;
      return latex;
  }
  /** Curried function for point-free filtering */
  function coPrimeWith(n) {
      return (m => gcd(m, n) === 1);
  }

  function isTopic(t) {
      return (t.id !== undefined);
  }
  const topicList = [
      { section: 'Number' },
      {
          id: 'integer-add',
          title: 'Integer addition',
          class: IntegerAddQ
      },
      {
          id: 'fraction-add',
          title: 'Fractions - addition',
          class: FractionAddQ
      },
      {
          id: 'barmodel',
          title: 'Partition problems (bar models)',
          class: PartitionQ
      },
      { section: 'Algebra' },
      {
          id: 'algebraic-fraction',
          title: 'Simplify algebraic fractions',
          class: AlgebraicFractionQ
      },
      {
          id: 'equation-of-line',
          title: 'Equation of a line (from two points)',
          class: EquationOfLine
      },
      { section: 'Geometry' },
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
      { section: 'Other' },
      {
          id: 'arithmagon-add',
          title: 'Arithmagons',
          class: ArithmagonQ
      }
  ];
  function getClass(id) {
      // Return the class given an id of a question
      // Obviously this is an inefficient search, but we don't need massive performance
      for (let i = 0; i < topicList.length; i++) {
          const topic = topicList[i];
          if (isTopic(topic) && topic.id === id) {
              return topic.class;
          }
      }
      return null;
  }
  function getTitle(id) {
      // Return title of a given id
      const topic = topicList.find(t => (isTopic(t) && t.id === id));
      if (topic !== undefined && isTopic(topic)) {
          return topic.title;
      }
      else {
          return undefined;
      }
  }
  /**
   * Gets command word from a topic id
   * @param {string} id The topic id
   * @returns {string} Command word. Returns "" if no topic with id
   */
  function getCommandWord(id) {
      const topicClass = getClass(id);
      if (topicClass === null) {
          return '';
      }
      else {
          return topicClass.commandWord;
      }
  }
  function getTopics() {
      // returns topics with classes stripped out
      return topicList.map(x => {
          if (isTopic(x)) {
              return { title: x.title, id: x.id };
          }
          else {
              return x;
          }
      });
  }
  function newQuestion(id, options) {
      // to avoid writing `let q = new (TopicChooser.getClass(id))(options)
      const QuestionClass = getClass(id);
      let question;
      if (QuestionClass && 'random' in QuestionClass) {
          question = QuestionClass.random(options);
      }
      else if (QuestionClass) {
          question = new QuestionClass(options);
      }
      return question;
  }
  function newOptionsSet(id) {
      var _a;
      const optionsSpec = ((_a = (getClass(id))) === null || _a === void 0 ? void 0 : _a.optionsSpec) || [];
      return new OptionsSet(optionsSpec);
  }
  function hasOptions(id) {
      const cl = getClass(id);
      if (cl === null)
          return false;
      return !!(cl.optionsSpec && cl.optionsSpec.length > 0);
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
              if ('section' in topic) {
                  optionsSpec.push({
                      type: 'heading',
                      title: topic.section
                  });
              }
              else {
                  optionsSpec.push({
                      title: topic.title,
                      id: topic.id,
                      type: 'bool',
                      default: false,
                      swapLabel: true
                  });
              }
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
          var _a;
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
              text = (_a = getTitle(id)) !== null && _a !== void 0 ? _a : '';
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
          if (!question)
              throw new Error(`Unable to make question with id ${topicId}`);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vbW9kdWxlcy92ZW5kb3IvcnNsaWRlci5qcyIsIi4uLy4uL21vZHVsZXMvUG9pbnQudHMiLCIuLi8uLi9tb2R1bGVzL3V0aWxpdGllcy50cyIsIi4uLy4uL21vZHVsZXMvT3B0aW9uc1NldC50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vUXVlc3Rpb24udHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL1RleHRRLnRzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9UZXh0US9BbGdlYnJhaWNGcmFjdGlvblEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0ludGVnZXJBZGQuanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRLnRzIiwiLi4vbm9kZV9tb2R1bGVzL2ZyYWN0aW9uLmpzL2ZyYWN0aW9uLmpzIiwiLi4vbW9kdWxlcy9Nb25vbWlhbC5qcyIsIi4uL21vZHVsZXMvUG9seW5vbWlhbC5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQXJpdGhtYWdvblEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0VxdWF0aW9uT2ZMaW5lLmpzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNOdW1iZXJEYXRhLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRRLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVRLnRzIiwiLi4vbW9kdWxlcy9MaW5FeHByLmpzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL3NvbHZlQW5nbGVzLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFRLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXcudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzV29yZGVkUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzV3JhcHBlci50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQXJlYVBlcmltZXRlci9QYXJhbGxlbG9ncmFtQXJlYURhdGEudHMiLCIuLi9tb2R1bGVzL2RyYXdpbmcuanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvdHlwZXMudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvUGFyYWxsZWxvZ3JhbUFyZWFWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL1BhcmFsbGVsb2dyYW1BcmVhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQXJlYVBlcmltZXRlci9SZWN0YW5nbGVBcmVhRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQXJlYVBlcmltZXRlci9SZWN0YW5nbGVBcmVhVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQXJlYVBlcmltZXRlci9SZWN0YW5nbGVBcmVhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQXJlYVBlcmltZXRlci9UcmFwZXppdW1BcmVhRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQXJlYVBlcmltZXRlci9UcmFwZXppdW1BcmVhVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQXJlYVBlcmltZXRlci9UcmFwZXppdW1BcmVhUS50cyIsIi4uL25vZGVfbW9kdWxlcy90c2xpYi90c2xpYi5lczYuanMiLCIuLi8uLi9tb2R1bGVzL3RyaWFuZ2xlRGF0YS1xdWV1ZS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQXJlYVBlcmltZXRlci9UcmlhbmdsZUFyZWFEYXRhLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL1RyaWFuZ2xlQXJlYVZpZXcudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvVHJpYW5nbGVBcmVhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQXJlYVBlcmltZXRlci9BcmVhV3JhcHBlci50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQmFyTW9kZWxzLnRzIiwiLi4vLi4vbW9kdWxlcy9wcmltZXMudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0ZyYWN0aW9uQWRkLnRzIiwiLi4vLi4vbW9kdWxlcy9Ub3BpY0Nob29zZXIudHMiLCIuLi9ub2RlX21vZHVsZXMvdGluZ2xlLmpzL2Rpc3QvdGluZ2xlLm1pbi5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb25TZXQudHMiLCIuLi9tYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIFJzbGlkZXIuIERvd25sb2FkZWQgZnJvbSBodHRwczovL3NsYXdvbWlyLXphemlhYmxvLmdpdGh1Yi5pby9yYW5nZS1zbGlkZXIvXG4gKiBNb2RpZmllZCB0byBtYWtlIGludG8gRVM2IG1vZHVsZSBhbmQgZml4IGEgZmV3IGJ1Z3NcbiAqL1xuXG52YXIgUlMgPSBmdW5jdGlvbiAoY29uZikge1xuICB0aGlzLmlucHV0ID0gbnVsbFxuICB0aGlzLmlucHV0RGlzcGxheSA9IG51bGxcbiAgdGhpcy5zbGlkZXIgPSBudWxsXG4gIHRoaXMuc2xpZGVyV2lkdGggPSAwXG4gIHRoaXMuc2xpZGVyTGVmdCA9IDBcbiAgdGhpcy5wb2ludGVyV2lkdGggPSAwXG4gIHRoaXMucG9pbnRlclIgPSBudWxsXG4gIHRoaXMucG9pbnRlckwgPSBudWxsXG4gIHRoaXMuYWN0aXZlUG9pbnRlciA9IG51bGxcbiAgdGhpcy5zZWxlY3RlZCA9IG51bGxcbiAgdGhpcy5zY2FsZSA9IG51bGxcbiAgdGhpcy5zdGVwID0gMFxuICB0aGlzLnRpcEwgPSBudWxsXG4gIHRoaXMudGlwUiA9IG51bGxcbiAgdGhpcy50aW1lb3V0ID0gbnVsbFxuICB0aGlzLnZhbFJhbmdlID0gZmFsc2VcblxuICB0aGlzLnZhbHVlcyA9IHtcbiAgICBzdGFydDogbnVsbCxcbiAgICBlbmQ6IG51bGxcbiAgfVxuICB0aGlzLmNvbmYgPSB7XG4gICAgdGFyZ2V0OiBudWxsLFxuICAgIHZhbHVlczogbnVsbCxcbiAgICBzZXQ6IG51bGwsXG4gICAgcmFuZ2U6IGZhbHNlLFxuICAgIHdpZHRoOiBudWxsLFxuICAgIHNjYWxlOiB0cnVlLFxuICAgIGxhYmVsczogdHJ1ZSxcbiAgICB0b29sdGlwOiB0cnVlLFxuICAgIHN0ZXA6IG51bGwsXG4gICAgZGlzYWJsZWQ6IGZhbHNlLFxuICAgIG9uQ2hhbmdlOiBudWxsXG4gIH1cblxuICB0aGlzLmNscyA9IHtcbiAgICBjb250YWluZXI6ICdycy1jb250YWluZXInLFxuICAgIGJhY2tncm91bmQ6ICdycy1iZycsXG4gICAgc2VsZWN0ZWQ6ICdycy1zZWxlY3RlZCcsXG4gICAgcG9pbnRlcjogJ3JzLXBvaW50ZXInLFxuICAgIHNjYWxlOiAncnMtc2NhbGUnLFxuICAgIG5vc2NhbGU6ICdycy1ub3NjYWxlJyxcbiAgICB0aXA6ICdycy10b29sdGlwJ1xuICB9XG5cbiAgZm9yICh2YXIgaSBpbiB0aGlzLmNvbmYpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb25mLCBpKSkgdGhpcy5jb25mW2ldID0gY29uZltpXSB9XG5cbiAgdGhpcy5pbml0KClcbn1cblxuUlMucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgdGhpcy5jb25mLnRhcmdldCA9PT0gJ29iamVjdCcpIHRoaXMuaW5wdXQgPSB0aGlzLmNvbmYudGFyZ2V0XG4gIGVsc2UgdGhpcy5pbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMuY29uZi50YXJnZXQucmVwbGFjZSgnIycsICcnKSlcblxuICBpZiAoIXRoaXMuaW5wdXQpIHJldHVybiBjb25zb2xlLmxvZygnQ2Fubm90IGZpbmQgdGFyZ2V0IGVsZW1lbnQuLi4nKVxuXG4gIHRoaXMuaW5wdXREaXNwbGF5ID0gZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLmlucHV0LCBudWxsKS5kaXNwbGF5XG4gIHRoaXMuaW5wdXQuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuICB0aGlzLnZhbFJhbmdlID0gISh0aGlzLmNvbmYudmFsdWVzIGluc3RhbmNlb2YgQXJyYXkpXG5cbiAgaWYgKHRoaXMudmFsUmFuZ2UpIHtcbiAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLmNvbmYudmFsdWVzLCAnbWluJykgfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLmNvbmYudmFsdWVzLCAnbWF4JykpIHsgcmV0dXJuIGNvbnNvbGUubG9nKCdNaXNzaW5nIG1pbiBvciBtYXggdmFsdWUuLi4nKSB9XG4gIH1cbiAgcmV0dXJuIHRoaXMuY3JlYXRlU2xpZGVyKClcbn1cblxuUlMucHJvdG90eXBlLmNyZWF0ZVNsaWRlciA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zbGlkZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy5jb250YWluZXIpXG4gIHRoaXMuc2xpZGVyLmlubmVySFRNTCA9ICc8ZGl2IGNsYXNzPVwicnMtYmdcIj48L2Rpdj4nXG4gIHRoaXMuc2VsZWN0ZWQgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy5zZWxlY3RlZClcbiAgdGhpcy5wb2ludGVyTCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnBvaW50ZXIsIFsnZGlyJywgJ2xlZnQnXSlcbiAgdGhpcy5zY2FsZSA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnNjYWxlKVxuXG4gIGlmICh0aGlzLmNvbmYudG9vbHRpcCkge1xuICAgIHRoaXMudGlwTCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnRpcClcbiAgICB0aGlzLnRpcFIgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy50aXApXG4gICAgdGhpcy5wb2ludGVyTC5hcHBlbmRDaGlsZCh0aGlzLnRpcEwpXG4gIH1cbiAgdGhpcy5zbGlkZXIuYXBwZW5kQ2hpbGQodGhpcy5zZWxlY3RlZClcbiAgdGhpcy5zbGlkZXIuYXBwZW5kQ2hpbGQodGhpcy5zY2FsZSlcbiAgdGhpcy5zbGlkZXIuYXBwZW5kQ2hpbGQodGhpcy5wb2ludGVyTClcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgdGhpcy5wb2ludGVyUiA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnBvaW50ZXIsIFsnZGlyJywgJ3JpZ2h0J10pXG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB0aGlzLnBvaW50ZXJSLmFwcGVuZENoaWxkKHRoaXMudGlwUilcbiAgICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnBvaW50ZXJSKVxuICB9XG5cbiAgdGhpcy5pbnB1dC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLnNsaWRlciwgdGhpcy5pbnB1dC5uZXh0U2libGluZylcblxuICBpZiAodGhpcy5jb25mLndpZHRoKSB0aGlzLnNsaWRlci5zdHlsZS53aWR0aCA9IHBhcnNlSW50KHRoaXMuY29uZi53aWR0aCkgKyAncHgnXG4gIHRoaXMuc2xpZGVyTGVmdCA9IHRoaXMuc2xpZGVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmxlZnRcbiAgdGhpcy5zbGlkZXJXaWR0aCA9IHRoaXMuc2xpZGVyLmNsaWVudFdpZHRoXG4gIHRoaXMucG9pbnRlcldpZHRoID0gdGhpcy5wb2ludGVyTC5jbGllbnRXaWR0aFxuXG4gIGlmICghdGhpcy5jb25mLnNjYWxlKSB0aGlzLnNsaWRlci5jbGFzc0xpc3QuYWRkKHRoaXMuY2xzLm5vc2NhbGUpXG5cbiAgcmV0dXJuIHRoaXMuc2V0SW5pdGlhbFZhbHVlcygpXG59XG5cblJTLnByb3RvdHlwZS5zZXRJbml0aWFsVmFsdWVzID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmRpc2FibGVkKHRoaXMuY29uZi5kaXNhYmxlZClcblxuICBpZiAodGhpcy52YWxSYW5nZSkgdGhpcy5jb25mLnZhbHVlcyA9IHByZXBhcmVBcnJheVZhbHVlcyh0aGlzLmNvbmYpXG5cbiAgdGhpcy52YWx1ZXMuc3RhcnQgPSAwXG4gIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi5yYW5nZSA/IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSA6IDBcblxuICBpZiAodGhpcy5jb25mLnNldCAmJiB0aGlzLmNvbmYuc2V0Lmxlbmd0aCAmJiBjaGVja0luaXRpYWwodGhpcy5jb25mKSkge1xuICAgIHZhciB2YWxzID0gdGhpcy5jb25mLnNldFxuXG4gICAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgICAgdGhpcy52YWx1ZXMuc3RhcnQgPSB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YodmFsc1swXSlcbiAgICAgIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi5zZXRbMV0gPyB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YodmFsc1sxXSkgOiBudWxsXG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzBdKVxuICB9XG4gIHJldHVybiB0aGlzLmNyZWF0ZVNjYWxlKClcbn1cblxuUlMucHJvdG90eXBlLmNyZWF0ZVNjYWxlID0gZnVuY3Rpb24gKHJlc2l6ZSkge1xuICB0aGlzLnN0ZXAgPSB0aGlzLnNsaWRlcldpZHRoIC8gKHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSlcblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7XG4gICAgdmFyIHNwYW4gPSBjcmVhdGVFbGVtZW50KCdzcGFuJylcbiAgICB2YXIgaW5zID0gY3JlYXRlRWxlbWVudCgnaW5zJylcblxuICAgIHNwYW4uYXBwZW5kQ2hpbGQoaW5zKVxuICAgIHRoaXMuc2NhbGUuYXBwZW5kQ2hpbGQoc3BhbilcblxuICAgIHNwYW4uc3R5bGUud2lkdGggPSBpID09PSBpTGVuIC0gMSA/IDAgOiB0aGlzLnN0ZXAgKyAncHgnXG5cbiAgICBpZiAoIXRoaXMuY29uZi5sYWJlbHMpIHtcbiAgICAgIGlmIChpID09PSAwIHx8IGkgPT09IGlMZW4gLSAxKSBpbnMuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1tpXVxuICAgIH0gZWxzZSBpbnMuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1tpXVxuXG4gICAgaW5zLnN0eWxlLm1hcmdpbkxlZnQgPSAoaW5zLmNsaWVudFdpZHRoIC8gMikgKiAtMSArICdweCdcbiAgfVxuICByZXR1cm4gdGhpcy5hZGRFdmVudHMoKVxufVxuXG5SUy5wcm90b3R5cGUudXBkYXRlU2NhbGUgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc3RlcCA9IHRoaXMuc2xpZGVyV2lkdGggLyAodGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKVxuXG4gIHZhciBwaWVjZXMgPSB0aGlzLnNsaWRlci5xdWVyeVNlbGVjdG9yQWxsKCdzcGFuJylcblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IHBpZWNlcy5sZW5ndGg7IGkgPCBpTGVuIC0gMTsgaSsrKSB7IHBpZWNlc1tpXS5zdHlsZS53aWR0aCA9IHRoaXMuc3RlcCArICdweCcgfVxuXG4gIHJldHVybiB0aGlzLnNldFZhbHVlcygpXG59XG5cblJTLnByb3RvdHlwZS5hZGRFdmVudHMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBwb2ludGVycyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy4nICsgdGhpcy5jbHMucG9pbnRlcilcbiAgdmFyIHBpZWNlcyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NwYW4nKVxuXG4gIGNyZWF0ZUV2ZW50cyhkb2N1bWVudCwgJ21vdXNlbW92ZSB0b3VjaG1vdmUnLCB0aGlzLm1vdmUuYmluZCh0aGlzKSlcbiAgY3JlYXRlRXZlbnRzKGRvY3VtZW50LCAnbW91c2V1cCB0b3VjaGVuZCB0b3VjaGNhbmNlbCcsIHRoaXMuZHJvcC5iaW5kKHRoaXMpKVxuXG4gIGZvciAobGV0IGkgPSAwLCBpTGVuID0gcG9pbnRlcnMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7IGNyZWF0ZUV2ZW50cyhwb2ludGVyc1tpXSwgJ21vdXNlZG93biB0b3VjaHN0YXJ0JywgdGhpcy5kcmFnLmJpbmQodGhpcykpIH1cblxuICBmb3IgKGxldCBpID0gMCwgaUxlbiA9IHBpZWNlcy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgY3JlYXRlRXZlbnRzKHBpZWNlc1tpXSwgJ2NsaWNrJywgdGhpcy5vbkNsaWNrUGllY2UuYmluZCh0aGlzKSkgfVxuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLm9uUmVzaXplLmJpbmQodGhpcykpXG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLmRyYWcgPSBmdW5jdGlvbiAoZSkge1xuICBlLnByZXZlbnREZWZhdWx0KClcblxuICBpZiAodGhpcy5jb25mLmRpc2FibGVkKSByZXR1cm5cblxuICB2YXIgZGlyID0gZS50YXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLWRpcicpXG4gIGlmIChkaXIgPT09ICdsZWZ0JykgdGhpcy5hY3RpdmVQb2ludGVyID0gdGhpcy5wb2ludGVyTFxuICBpZiAoZGlyID09PSAncmlnaHQnKSB0aGlzLmFjdGl2ZVBvaW50ZXIgPSB0aGlzLnBvaW50ZXJSXG5cbiAgcmV0dXJuIHRoaXMuc2xpZGVyLmNsYXNzTGlzdC5hZGQoJ3NsaWRpbmcnKVxufVxuXG5SUy5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uIChlKSB7XG4gIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgJiYgIXRoaXMuY29uZi5kaXNhYmxlZCkge1xuICAgIHRoaXMub25SZXNpemUoKSAvLyBuZWVkZWQgaW4gY2FzZSBhbnkgZWxlbWVudHMgaGF2ZSBtb3ZlZCB0aGUgc2xpZGVyIGluIHRoZSBtZWFudGltZVxuICAgIHZhciBjb29yZFggPSBlLnR5cGUgPT09ICd0b3VjaG1vdmUnID8gZS50b3VjaGVzWzBdLmNsaWVudFggOiBlLnBhZ2VYXG4gICAgdmFyIGluZGV4ID0gY29vcmRYIC0gdGhpcy5zbGlkZXJMZWZ0IC0gKHRoaXMucG9pbnRlcldpZHRoIC8gMikgLy8gcGl4ZWwgcG9zaXRpb24gZnJvbSBsZWZ0IG9mIHNsaWRlciAoc2hpZnRlZCBsZWZ0IGJ5IGhhbGYgd2lkdGgpXG5cbiAgICBpbmRleCA9IE1hdGguY2VpbChpbmRleCAvIHRoaXMuc3RlcClcblxuICAgIGlmIChpbmRleCA8PSAwKSBpbmRleCA9IDBcbiAgICBpZiAoaW5kZXggPiB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpIGluZGV4ID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG5cbiAgICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgICBpZiAodGhpcy5hY3RpdmVQb2ludGVyID09PSB0aGlzLnBvaW50ZXJMKSB0aGlzLnZhbHVlcy5zdGFydCA9IGluZGV4XG4gICAgICBpZiAodGhpcy5hY3RpdmVQb2ludGVyID09PSB0aGlzLnBvaW50ZXJSKSB0aGlzLnZhbHVlcy5lbmQgPSBpbmRleFxuICAgIH0gZWxzZSB0aGlzLnZhbHVlcy5lbmQgPSBpbmRleFxuXG4gICAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbiAgfVxufVxuXG5SUy5wcm90b3R5cGUuZHJvcCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5hY3RpdmVQb2ludGVyID0gbnVsbFxufVxuXG5SUy5wcm90b3R5cGUuc2V0VmFsdWVzID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGFjdGl2ZVBvaW50ZXIgPSB0aGlzLmNvbmYucmFuZ2UgPyAnc3RhcnQnIDogJ2VuZCdcblxuICBpZiAoc3RhcnQgJiYgdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHN0YXJ0KSA+IC0xKSB7IHRoaXMudmFsdWVzW2FjdGl2ZVBvaW50ZXJdID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHN0YXJ0KSB9XG5cbiAgaWYgKGVuZCAmJiB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YoZW5kKSA+IC0xKSB7IHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZihlbmQpIH1cblxuICBpZiAodGhpcy5jb25mLnJhbmdlICYmIHRoaXMudmFsdWVzLnN0YXJ0ID4gdGhpcy52YWx1ZXMuZW5kKSB7IHRoaXMudmFsdWVzLnN0YXJ0ID0gdGhpcy52YWx1ZXMuZW5kIH1cblxuICB0aGlzLnBvaW50ZXJMLnN0eWxlLmxlZnQgPSAodGhpcy52YWx1ZXNbYWN0aXZlUG9pbnRlcl0gKiB0aGlzLnN0ZXAgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKSkgKyAncHgnXG5cbiAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgIGlmICh0aGlzLmNvbmYudG9vbHRpcCkge1xuICAgICAgdGhpcy50aXBMLmlubmVySFRNTCA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdXG4gICAgICB0aGlzLnRpcFIuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG4gICAgfVxuICAgIHRoaXMuaW5wdXQudmFsdWUgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLnN0YXJ0XSArICcsJyArIHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxuICAgIHRoaXMucG9pbnRlclIuc3R5bGUubGVmdCA9ICh0aGlzLnZhbHVlcy5lbmQgKiB0aGlzLnN0ZXAgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKSkgKyAncHgnXG4gIH0gZWxzZSB7XG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7IHRoaXMudGlwTC5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF0gfVxuICAgIHRoaXMuaW5wdXQudmFsdWUgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1cbiAgfVxuXG4gIGlmICh0aGlzLnZhbHVlcy5lbmQgPiB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMVxuICBpZiAodGhpcy52YWx1ZXMuc3RhcnQgPCAwKSB0aGlzLnZhbHVlcy5zdGFydCA9IDBcblxuICB0aGlzLnNlbGVjdGVkLnN0eWxlLndpZHRoID0gKHRoaXMudmFsdWVzLmVuZCAtIHRoaXMudmFsdWVzLnN0YXJ0KSAqIHRoaXMuc3RlcCArICdweCdcbiAgdGhpcy5zZWxlY3RlZC5zdHlsZS5sZWZ0ID0gdGhpcy52YWx1ZXMuc3RhcnQgKiB0aGlzLnN0ZXAgKyAncHgnXG5cbiAgcmV0dXJuIHRoaXMub25DaGFuZ2UoKVxufVxuXG5SUy5wcm90b3R5cGUub25DbGlja1BpZWNlID0gZnVuY3Rpb24gKGUpIHtcbiAgaWYgKHRoaXMuY29uZi5kaXNhYmxlZCkgcmV0dXJuXG5cbiAgdmFyIGlkeCA9IE1hdGgucm91bmQoKGUuY2xpZW50WCAtIHRoaXMuc2xpZGVyTGVmdCkgLyB0aGlzLnN0ZXApXG5cbiAgaWYgKGlkeCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgaWR4ID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG4gIGlmIChpZHggPCAwKSBpZHggPSAwXG5cbiAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgIGlmIChpZHggLSB0aGlzLnZhbHVlcy5zdGFydCA8PSB0aGlzLnZhbHVlcy5lbmQgLSBpZHgpIHtcbiAgICAgIHRoaXMudmFsdWVzLnN0YXJ0ID0gaWR4XG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IGlkeFxuICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gaWR4XG5cbiAgdGhpcy5zbGlkZXIuY2xhc3NMaXN0LnJlbW92ZSgnc2xpZGluZycpXG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLm9uQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX3RoaXMgPSB0aGlzXG5cbiAgaWYgKHRoaXMudGltZW91dCkgY2xlYXJUaW1lb3V0KHRoaXMudGltZW91dClcblxuICB0aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoX3RoaXMuY29uZi5vbkNoYW5nZSAmJiB0eXBlb2YgX3RoaXMuY29uZi5vbkNoYW5nZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIF90aGlzLmNvbmYub25DaGFuZ2UoX3RoaXMuaW5wdXQudmFsdWUpXG4gICAgfVxuICB9LCA1MDApXG59XG5cblJTLnByb3RvdHlwZS5vblJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gdGhpcy5zbGlkZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdFxuICB0aGlzLnNsaWRlcldpZHRoID0gdGhpcy5zbGlkZXIuY2xpZW50V2lkdGhcbiAgcmV0dXJuIHRoaXMudXBkYXRlU2NhbGUoKVxufVxuXG5SUy5wcm90b3R5cGUuZGlzYWJsZWQgPSBmdW5jdGlvbiAoZGlzYWJsZWQpIHtcbiAgdGhpcy5jb25mLmRpc2FibGVkID0gZGlzYWJsZWRcbiAgdGhpcy5zbGlkZXIuY2xhc3NMaXN0W2Rpc2FibGVkID8gJ2FkZCcgOiAncmVtb3ZlJ10oJ2Rpc2FibGVkJylcbn1cblxuUlMucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAvLyBSZXR1cm4gbGlzdCBvZiBudW1iZXJzLCByYXRoZXIgdGhhbiBhIHN0cmluZywgd2hpY2ggd291bGQganVzdCBiZSBzaWxseVxuICAvLyAgcmV0dXJuIHRoaXMuaW5wdXQudmFsdWVcbiAgcmV0dXJuIFt0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLnN0YXJ0XSwgdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXVxufVxuXG5SUy5wcm90b3R5cGUuZ2V0VmFsdWVMID0gZnVuY3Rpb24gKCkge1xuICAvLyBHZXQgbGVmdCAoaS5lLiBzbWFsbGVzdCkgdmFsdWVcbiAgcmV0dXJuIHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdXG59XG5cblJTLnByb3RvdHlwZS5nZXRWYWx1ZVIgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIEdldCByaWdodCAoaS5lLiBzbWFsbGVzdCkgdmFsdWVcbiAgcmV0dXJuIHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxufVxuXG5SUy5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5pbnB1dC5zdHlsZS5kaXNwbGF5ID0gdGhpcy5pbnB1dERpc3BsYXlcbiAgdGhpcy5zbGlkZXIucmVtb3ZlKClcbn1cblxudmFyIGNyZWF0ZUVsZW1lbnQgPSBmdW5jdGlvbiAoZWwsIGNscywgZGF0YUF0dHIpIHtcbiAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGVsKVxuICBpZiAoY2xzKSBlbGVtZW50LmNsYXNzTmFtZSA9IGNsc1xuICBpZiAoZGF0YUF0dHIgJiYgZGF0YUF0dHIubGVuZ3RoID09PSAyKSB7IGVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLScgKyBkYXRhQXR0clswXSwgZGF0YUF0dHJbMV0pIH1cblxuICByZXR1cm4gZWxlbWVudFxufVxuXG52YXIgY3JlYXRlRXZlbnRzID0gZnVuY3Rpb24gKGVsLCBldiwgY2FsbGJhY2spIHtcbiAgdmFyIGV2ZW50cyA9IGV2LnNwbGl0KCcgJylcblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IGV2ZW50cy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudHNbaV0sIGNhbGxiYWNrKSB9XG59XG5cbnZhciBwcmVwYXJlQXJyYXlWYWx1ZXMgPSBmdW5jdGlvbiAoY29uZikge1xuICB2YXIgdmFsdWVzID0gW11cbiAgdmFyIHJhbmdlID0gY29uZi52YWx1ZXMubWF4IC0gY29uZi52YWx1ZXMubWluXG5cbiAgaWYgKCFjb25mLnN0ZXApIHtcbiAgICBjb25zb2xlLmxvZygnTm8gc3RlcCBkZWZpbmVkLi4uJylcbiAgICByZXR1cm4gW2NvbmYudmFsdWVzLm1pbiwgY29uZi52YWx1ZXMubWF4XVxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGlMZW4gPSAocmFuZ2UgLyBjb25mLnN0ZXApOyBpIDwgaUxlbjsgaSsrKSB7IHZhbHVlcy5wdXNoKGNvbmYudmFsdWVzLm1pbiArIGkgKiBjb25mLnN0ZXApIH1cblxuICBpZiAodmFsdWVzLmluZGV4T2YoY29uZi52YWx1ZXMubWF4KSA8IDApIHZhbHVlcy5wdXNoKGNvbmYudmFsdWVzLm1heClcblxuICByZXR1cm4gdmFsdWVzXG59XG5cbnZhciBjaGVja0luaXRpYWwgPSBmdW5jdGlvbiAoY29uZikge1xuICBpZiAoIWNvbmYuc2V0IHx8IGNvbmYuc2V0Lmxlbmd0aCA8IDEpIHJldHVybiBudWxsXG4gIGlmIChjb25mLnZhbHVlcy5pbmRleE9mKGNvbmYuc2V0WzBdKSA8IDApIHJldHVybiBudWxsXG5cbiAgaWYgKGNvbmYucmFuZ2UpIHtcbiAgICBpZiAoY29uZi5zZXQubGVuZ3RoIDwgMiB8fCBjb25mLnZhbHVlcy5pbmRleE9mKGNvbmYuc2V0WzFdKSA8IDApIHJldHVybiBudWxsXG4gIH1cbiAgcmV0dXJuIHRydWVcbn1cblxuZXhwb3J0IGRlZmF1bHQgUlNcbiIsIi8qKlxuICogQ2xhc3MgcmVwcmVzZW50aW5nIGEgcG9pbnQsIGFuZCBzdGF0aWMgdXRpdGxpdHkgbWV0aG9kc1xuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQb2ludCB7XG4gIHg6IG51bWJlclxuICB5OiBudW1iZXJcbiAgY29uc3RydWN0b3IgKHg6IG51bWJlciwgeTogbnVtYmVyKSB7XG4gICAgdGhpcy54ID0geFxuICAgIHRoaXMueSA9IHlcbiAgfVxuXG4gIHJvdGF0ZSAoYW5nbGU6IG51bWJlcikge1xuICAgIGNvbnN0IG5ld3ggPSBNYXRoLmNvcyhhbmdsZSkgKiB0aGlzLnggLSBNYXRoLnNpbihhbmdsZSkgKiB0aGlzLnlcbiAgICBjb25zdCBuZXd5ID0gTWF0aC5zaW4oYW5nbGUpICogdGhpcy54ICsgTWF0aC5jb3MoYW5nbGUpICogdGhpcy55XG4gICAgdGhpcy54ID0gbmV3eFxuICAgIHRoaXMueSA9IG5ld3lcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc2NhbGUgKHNmOiBudW1iZXIpIHtcbiAgICB0aGlzLnggPSB0aGlzLnggKiBzZlxuICAgIHRoaXMueSA9IHRoaXMueSAqIHNmXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHRyYW5zbGF0ZSAoeDogbnVtYmVyLCB5OiBudW1iZXIpIHtcbiAgICB0aGlzLnggKz0geFxuICAgIHRoaXMueSArPSB5XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIGNsb25lICgpIHtcbiAgICByZXR1cm4gbmV3IFBvaW50KHRoaXMueCwgdGhpcy55KVxuICB9XG5cbiAgZXF1YWxzICh0aGF0OiBQb2ludCkge1xuICAgIHJldHVybiAodGhpcy54ID09PSB0aGF0LnggJiYgdGhpcy55ID09PSB0aGF0LnkpXG4gIH1cblxuICBtb3ZlVG93YXJkICh0aGF0OiBQb2ludCwgZDogbnVtYmVyKSB7XG4gICAgLy8gbW92ZXMgW2RdIGluIHRoZSBkaXJlY3Rpb24gb2YgW3RoYXQ6OlBvaW50XVxuICAgIGNvbnN0IHV2ZWMgPSBQb2ludC51bml0VmVjdG9yKHRoaXMsIHRoYXQpXG4gICAgdGhpcy50cmFuc2xhdGUodXZlYy54ICogZCwgdXZlYy55ICogZClcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3RhdGljIGZyb21Qb2xhciAocjogbnVtYmVyLCB0aGV0YTogbnVtYmVyKSB7XG4gICAgcmV0dXJuIG5ldyBQb2ludChcbiAgICAgIE1hdGguY29zKHRoZXRhKSAqIHIsXG4gICAgICBNYXRoLnNpbih0aGV0YSkgKiByXG4gICAgKVxuICB9XG5cbiAgc3RhdGljIGZyb21Qb2xhckRlZyAocjogbnVtYmVyLCB0aGV0YTogbnVtYmVyKSB7XG4gICAgdGhldGEgPSB0aGV0YSAqIE1hdGguUEkgLyAxODBcbiAgICByZXR1cm4gUG9pbnQuZnJvbVBvbGFyKHIsIHRoZXRhKVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBwb2ludCByZXByZXNlbnRpbmcgdGhlIHBvc2l0aW9uIG9mIGFuIGVsZW1lbnQsIGVpdGhlciByZWxhdGl2ZSB0byBwYXJlbnQgb3Igdmlld3BvcnRcbiAgICogQHBhcmFtIGVsZW0gQW4gSFRNTCBlbGVtZW50XG4gICAqIEBwYXJhbSBhbmNob3IgV2hpY2ggY29ybmRlciBvZiB0aGUgYm91bmRpbmcgYm94IG9mIGVsZW0gdG8gcmV0dXJuLCBvciB0aGUgY2VudGVyXG4gICAqL1xuICBzdGF0aWMgZnJvbUVsZW1lbnQoZWxlbTogSFRNTEVsZW1lbnQsIGFuY2hvcjogJ3RvcGxlZnQnfCdib3R0b21sZWZ0J3wndG9wcmlnaHQnfCdib3R0b21yaWdodCd8J2NlbnRlcicgPSAndG9wbGVmdCcsIHJlbGF0aXZlVG9QYXJlbnQ6IGJvb2xlYW4gPSB0cnVlKSB7XG4gICAgY29uc3QgcmVjdCA9IGVsZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcbiAgICBsZXQgeSA9IGFuY2hvci5zdGFydHNXaXRoKCd0b3AnKSA/IHJlY3QudG9wIDpcbiAgICAgICAgICAgICAgYW5jaG9yLnN0YXJ0c1dpdGgoJ2JvdHRvbScpID8gcmVjdC5ib3R0b20gOlxuICAgICAgICAgICAgICAocmVjdC5ib3R0b20gKyByZWN0LnRvcCkvMlxuXG4gICAgbGV0IHggPSBhbmNob3IuZW5kc1dpdGgoJ2xlZnQnKSA/IHJlY3QubGVmdCA6XG4gICAgICAgICAgICAgIGFuY2hvci5lbmRzV2l0aCgncmlnaHQnKSA/IHJlY3QucmlnaHQgOlxuICAgICAgICAgICAgICAocmVjdC5yaWdodCArIHJlY3QubGVmdCkvMlxuXG4gICAgaWYgKHJlbGF0aXZlVG9QYXJlbnQgJiYgZWxlbS5wYXJlbnRFbGVtZW50KSB7XG4gICAgICBjb25zdCBwYXJlbnRQdCA9IFBvaW50LmZyb21FbGVtZW50KGVsZW0ucGFyZW50RWxlbWVudCwgJ3RvcGxlZnQnLCBmYWxzZSlcbiAgICAgIHggLT0gcGFyZW50UHQueFxuICAgICAgeSAtPSBwYXJlbnRQdC55XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQb2ludCh4LHkpXG4gIH1cblxuICAvKipcbiAgICogRmluZCB0aGUgbWVhbiBvZlxuICAgKiBAcGFyYW0gIHsuLi5Qb2ludH0gcG9pbnRzIFRoZSBwb2ludHMgdG8gZmluZCB0aGUgbWVhbiBvZlxuICAgKi9cbiAgc3RhdGljIG1lYW4gKC4uLnBvaW50cyA6IFBvaW50W10pIHtcbiAgICBjb25zdCBzdW14ID0gcG9pbnRzLm1hcChwID0+IHAueCkucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSlcbiAgICBjb25zdCBzdW15ID0gcG9pbnRzLm1hcChwID0+IHAueSkucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSlcbiAgICBjb25zdCBuID0gcG9pbnRzLmxlbmd0aFxuXG4gICAgcmV0dXJuIG5ldyBQb2ludChzdW14IC8gbiwgc3VteSAvIG4pXG4gIH1cblxuICBzdGF0aWMgaW5DZW50ZXIgKEE6IFBvaW50LCBCOiBQb2ludCwgQzogUG9pbnQpIHtcbiAgICAvLyBpbmNlbnRlciBvZiBhIHRyaWFuZ2xlIGdpdmVuIHZlcnRleCBwb2ludHMgQSwgQiBhbmQgQ1xuICAgIGNvbnN0IGEgPSBQb2ludC5kaXN0YW5jZShCLCBDKVxuICAgIGNvbnN0IGIgPSBQb2ludC5kaXN0YW5jZShBLCBDKVxuICAgIGNvbnN0IGMgPSBQb2ludC5kaXN0YW5jZShBLCBCKVxuXG4gICAgY29uc3QgcGVyaW1ldGVyID0gYSArIGIgKyBjXG4gICAgY29uc3Qgc3VteCA9IGEgKiBBLnggKyBiICogQi54ICsgYyAqIEMueFxuICAgIGNvbnN0IHN1bXkgPSBhICogQS55ICsgYiAqIEIueSArIGMgKiBDLnlcblxuICAgIHJldHVybiBuZXcgUG9pbnQoc3VteCAvIHBlcmltZXRlciwgc3VteSAvIHBlcmltZXRlcilcbiAgfVxuXG4gIHN0YXRpYyBtaW4gKHBvaW50cyA6IFBvaW50W10pIHtcbiAgICBjb25zdCBtaW54ID0gcG9pbnRzLnJlZHVjZSgoeCwgcCkgPT4gTWF0aC5taW4oeCwgcC54KSwgSW5maW5pdHkpXG4gICAgY29uc3QgbWlueSA9IHBvaW50cy5yZWR1Y2UoKHksIHApID0+IE1hdGgubWluKHksIHAueSksIEluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQobWlueCwgbWlueSlcbiAgfVxuXG4gIHN0YXRpYyBtYXggKHBvaW50czogUG9pbnRbXSkge1xuICAgIGNvbnN0IG1heHggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1heCh4LCBwLngpLCAtSW5maW5pdHkpXG4gICAgY29uc3QgbWF4eSA9IHBvaW50cy5yZWR1Y2UoKHksIHApID0+IE1hdGgubWF4KHksIHAueSksIC1JbmZpbml0eSlcbiAgICByZXR1cm4gbmV3IFBvaW50KG1heHgsIG1heHkpXG4gIH1cblxuICBzdGF0aWMgY2VudGVyIChwb2ludHM6IFBvaW50W10pIHtcbiAgICBjb25zdCBtaW54ID0gcG9pbnRzLnJlZHVjZSgoeCwgcCkgPT4gTWF0aC5taW4oeCwgcC54KSwgSW5maW5pdHkpXG4gICAgY29uc3QgbWlueSA9IHBvaW50cy5yZWR1Y2UoKHksIHApID0+IE1hdGgubWluKHksIHAueSksIEluZmluaXR5KVxuICAgIGNvbnN0IG1heHggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1heCh4LCBwLngpLCAtSW5maW5pdHkpXG4gICAgY29uc3QgbWF4eSA9IHBvaW50cy5yZWR1Y2UoKHksIHApID0+IE1hdGgubWF4KHksIHAueSksIC1JbmZpbml0eSlcbiAgICByZXR1cm4gbmV3IFBvaW50KChtYXh4ICsgbWlueCkgLyAyLCAobWF4eSArIG1pbnkpIC8gMilcbiAgfVxuXG4gIC8qKlxuICAgKiByZXR1cm5zIGEgdW5pdCB2ZWN0b3IgaW4gdGhlIGRpcmVjdGlvbiBvZiBwMSB0byBwMiBpbiB0aGUgZm9ybSB7eDouLi4sIHk6Li4ufVxuICAgKiBAcGFyYW0gcDEgQSBwb2ludFxuICAgKiBAcGFyYW0gcDIgQSBwb2ludFxuICAgKi9cbiAgc3RhdGljIHVuaXRWZWN0b3IgKHAxIDogUG9pbnQsIHAyIDogUG9pbnQpIHtcbiAgICBjb25zdCB2ZWN4ID0gcDIueCAtIHAxLnhcbiAgICBjb25zdCB2ZWN5ID0gcDIueSAtIHAxLnlcbiAgICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHZlY3gsIHZlY3kpXG4gICAgcmV0dXJuIHsgeDogdmVjeCAvIGxlbmd0aCwgeTogdmVjeSAvIGxlbmd0aCB9XG4gIH1cblxuICBzdGF0aWMgZGlzdGFuY2UgKHAxOiBQb2ludCwgcDI6IFBvaW50KSB7XG4gICAgcmV0dXJuIE1hdGguaHlwb3QocDEueCAtIHAyLngsIHAxLnkgLSBwMi55KVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGN1bGF0ZSB0aGUgYW5nbGUgaW4gcmFkaWFucyBmcm9tIGhvcml6b250YWwgdG8gcDIsIHdpdGggY2VudHJlIHAxLlxuICAgKiBFLmcuIGFuZ2xlRnJvbSggKDAsMCksICgxLDEpICkgPSBwaS8yXG4gICAqIEFuZ2xlIGlzIGZyb20gMCB0byAycGlcbiAgICogQHBhcmFtICBwMSBUaGUgc3RhcnQgcG9pbnRcbiAgICogQHBhcmFtICBwMiBUaGUgZW5kIHBvaW50XG4gICAqIEByZXR1cm5zICBUaGUgYW5nbGUgaW4gcmFkaWFuc1xuICAgKi9cbiAgc3RhdGljIGFuZ2xlRnJvbSAocDE6IFBvaW50LCBwMjogUG9pbnQpOiBudW1iZXIge1xuICAgIGNvbnN0IGFuZ2xlID0gTWF0aC5hdGFuMihwMi55IC0gcDEueSwgcDIueCAtIHAxLngpXG4gICAgcmV0dXJuIGFuZ2xlID49IDAgPyBhbmdsZSA6IDIgKiBNYXRoLlBJICsgYW5nbGVcbiAgfVxuXG4gIC8qKlxuICAgKiBXaGVuIHAxIGFuZCBwMiBhcmUgbGVzcyB0aGFuIFt0cmlnZ2VyXSBhcGFydCwgdGhleSBhcmVcbiAgICogbW92ZWQgc28gdGhhdCB0aGV5IGFyZSBbZGlzdGFuY2VdIGFwYXJ0XG4gICAqIEBwYXJhbSBwMSBBIHBvaW50XG4gICAqIEBwYXJhbSBwMiBBIHBvaW50XG4gICAqIEBwYXJhbSB0cmlnZ2VyIERpc3RhbmNlIHRyaWdnZXJpbmcgcmVwdWxzaW9uXG4gICAqIEBwYXJhbSBkaXN0YW5jZSBkaXN0YW5jZSB0byByZXBlbCB0b1xuICAgKi9cbiAgc3RhdGljIHJlcGVsIChwMTogUG9pbnQsIHAyOiBQb2ludCwgdHJpZ2dlcjogbnVtYmVyLCBkaXN0YW5jZTogbnVtYmVyKSB7XG4gICAgY29uc3QgZCA9IE1hdGguaHlwb3QocDEueCAtIHAyLngsIHAxLnkgLSBwMi55KVxuICAgIGlmIChkID49IHRyaWdnZXIpIHJldHVybiBmYWxzZVxuXG4gICAgY29uc3QgciA9IChkaXN0YW5jZSAtIGQpIC8gMiAvLyBkaXN0YW5jZSB0aGV5IG5lZWQgbW92aW5nXG4gICAgcDEubW92ZVRvd2FyZChwMiwgLXIpXG4gICAgcDIubW92ZVRvd2FyZChwMSwgLXIpXG4gICAgcmV0dXJuIHRydWVcbiAgfVxuXG4gIC8qKlxuICAgKiBTY2FsZSBhbiBjZW50ZXIgYSBzZXQgb2YgcG9pbnRzIHRvIGEgZ2l2ZW4gd2lkdGggb3IgaGVpZ2h0LiBOLkIuIFRoaXMgbXV0YXRlcyB0aGUgcG9pbnRzIGluIHRoZSBhcnJheSwgc28gY2xvbmUgZmlyc3QgaWYgbmVjZXNzYXJcbiAgICogQHBhcmFtIHBvaW50cyBBbiBhcnJheSBvZiBwb2ludHNcbiAgICogQHBhcmFtIHdpZHRoIFdpZHRoIG9mIGJvdW5kaW5nIGJveCB0byBzY2FsZSB0b1xuICAgKiBAcGFyYW0gaGVpZ2h0IEhlaWdodCBvZiBib3VuZGluZyBib3ggdG8gc2NhbGUgdG9cbiAgICogQHBhcmFtIG1hcmdpbiBNYXJnaW4gdG8gbGVhdmUgYXJvdW5kIHNjYWxlZCBwb2ludHNcbiAgICogQHBhcmFtIG9mZnNldCBPZmZzZXQgZnJvbSBjZW50ZXIgb2YgYm91bmRpbmcgYm94XG4gICAqIEByZXR1cm5zIFRoZSBzY2FsZSBmYWN0b3IgdGhhdCBwb2ludHMgd2VyZSBzY2FsZWQgYnlcbiAgICovXG4gIHN0YXRpYyBzY2FsZVRvRml0IChwb2ludHM6IFBvaW50W10sIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBtYXJnaW4gPSAwLCBvZmZzZXQ6IFtudW1iZXIsIG51bWJlcl0gPSBbMCwgMF0pIHtcbiAgICBsZXQgdG9wTGVmdCA6IFBvaW50ID0gUG9pbnQubWluKHBvaW50cylcbiAgICBsZXQgYm90dG9tUmlnaHQgOiBQb2ludCA9IFBvaW50Lm1heChwb2ludHMpXG4gICAgY29uc3QgdG90YWxXaWR0aCA6IG51bWJlciA9IGJvdHRvbVJpZ2h0LnggLSB0b3BMZWZ0LnhcbiAgICBjb25zdCB0b3RhbEhlaWdodCA6IG51bWJlciA9IGJvdHRvbVJpZ2h0LnkgLSB0b3BMZWZ0LnlcbiAgICBjb25zdCBzZiA9IE1hdGgubWluKCh3aWR0aCAtIG1hcmdpbikgLyB0b3RhbFdpZHRoLCAoaGVpZ2h0IC0gbWFyZ2luKSAvIHRvdGFsSGVpZ2h0KVxuICAgIHBvaW50cy5mb3JFYWNoKHB0ID0+IHsgcHQuc2NhbGUoc2YpIH0pXG5cbiAgICAvLyBjZW50cmVcbiAgICB0b3BMZWZ0ID0gUG9pbnQubWluKHBvaW50cylcbiAgICBib3R0b21SaWdodCA9IFBvaW50Lm1heChwb2ludHMpXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbih0b3BMZWZ0LCBib3R0b21SaWdodCkudHJhbnNsYXRlKC4uLm9mZnNldClcbiAgICBwb2ludHMuZm9yRWFjaChwdCA9PiB7IHB0LnRyYW5zbGF0ZSh3aWR0aCAvIDIgLSBjZW50ZXIueCwgaGVpZ2h0IC8gMiAtIGNlbnRlci55KSB9KSAvLyBjZW50cmVcblxuICAgIHJldHVybiBzZlxuICB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnLi9Qb2ludC5qcydcblxuLyoqXG4gKiBBcHByb3hpbWF0ZXMgYSBndWFzc2lhbiBkaXN0cmlidXRpb24gYnkgZmluZGluZyB0aGUgbWVhbiBvZiBuIHVuaWZvcm0gZGlzdHJpYnV0aW9uc1xuICogQHBhcmFtIHtudW1iZXJ9IG4gTnVtYmVyIG9mIHRpbWVzIHRvIHJvbGwgdGhlICdkaWNlJyAtIGhpZ2hlciBpcyBjbG9zZXIgdG8gZ2F1c3NpYW5cbiAqIEByZXR1cm5zIHtudW1iZXJ9IEEgbnVtYmVyIGJldHdlZW4gMCBhbmQgMVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2F1c3NpYW4gKG46IG51bWJlcik6IG51bWJlciB7XG4gIGxldCBybnVtID0gMFxuICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgIHJudW0gKz0gTWF0aC5yYW5kb20oKVxuICB9XG4gIHJldHVybiBybnVtIC8gblxufVxuXG4vKipcbiAqIEFwcHJveGltYXRlcyBhIGdhdXNzaWFuIGRpc3RyaWJ1dGlvbiBieSBmaW5kaW5nIHRoZSBtZWFuIG9mIG4gdW5pZm9ybSBkaXN0cmlidXRpb25zXG4gKiBSZXR1cm5zIGEgZnVuY3RpbyBcbiAqIEBwYXJhbSB7bnVtYmVyfSBuIE51bWJlciBvZiB1bmlmb3JtIGRpc3RyaWJ1dGlvbnMgdG8gYXZlcmFnZVxuICogQHJldHVybnMgeygpPT5udW1iZXJ9IEEgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhIHJhbmRvbSBudW1iZXJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdhdXNzaWFuQ3VycnkgKG46IG51bWJlcik6ICgpID0+IG51bWJlciB7XG4gIHJldHVybiAoKSA9PiBnYXVzc2lhbihuKVxufVxuXG4vKipcbiAqIHJldHVybiBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbiBhbmQgbSBpbmNsdXNpdmVcbiAqIGRpc3QgKG9wdGlvbmFsKSBpcyBhIGZ1bmN0aW9uIHJldHVybmluZyBhIHZhbHVlIGluIFswLDEpXG4gKiBAcGFyYW0ge251bWJlcn0gbiBUaGUgbWluaW11bSB2YWx1ZVxuICogQHBhcmFtIHtudW1iZXJ9IG0gVGhlIG1heGltdW0gdmFsdWVcbiAqIEBwYXJhbSB7KCk9Pm51bWJlcn0gW2Rpc3RdIEEgZGlzdHJpYnV0aW9uIHJldHVybmluZyBhIG51bWJlciBmcm9tIDAgdG8gMVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZEJldHdlZW4gKG46IG51bWJlciwgbTogbnVtYmVyLCBkaXN0PzogKCk9Pm51bWJlcikge1xuICBpZiAoIWRpc3QpIGRpc3QgPSBNYXRoLnJhbmRvbVxuICBuID0gTWF0aC5jZWlsKG4pXG4gIG0gPSBNYXRoLmZsb29yKG0pXG4gIHJldHVybiBuICsgTWF0aC5mbG9vcihkaXN0KCkgKiAobSAtIG4gKyAxKSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJhbmRCZXR3ZWVuRmlsdGVyIChuOiBudW1iZXIsIG06IG51bWJlciwgZmlsdGVyOiAobjpudW1iZXIpPT5ib29sZWFuKSB7XG4gIC8qIHJldHVybnMgYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIG4gYW5kIG0gaW5jbHVzaXZlIHdoaWNoIHNhdGlzZmllcyB0aGUgZmlsdGVyXG4gIC8gIG4sIG06IGludGVnZXJcbiAgLyAgZmlsdGVyOiBJbnQtPiBCb29sXG4gICovXG4gIGNvbnN0IGFyciA9IFtdXG4gIGZvciAobGV0IGkgPSBuOyBpIDwgbSArIDE7IGkrKykge1xuICAgIGlmIChmaWx0ZXIoaSkpIGFyci5wdXNoKGkpXG4gIH1cbiAgaWYgKGFyci5sZW5ndGg9PT0wKSB0aHJvdyBuZXcgRXJyb3IoJ292ZXJmaWx0ZXJlZCcpXG4gIGNvbnN0IGkgPSByYW5kQmV0d2VlbigwLCBhcnIubGVuZ3RoIC0gMSlcbiAgcmV0dXJuIGFycltpXVxufVxuXG4vKipcbiAqIFJldHVybnMgYSBtdWx0aXBsZSBvZiBuIGJldHdlZW4gbWluIGFuZCBtYXhcbiAqIEBwYXJhbSB7bnVtYmVyfSBtaW4gTWluaW11bSB2YWx1ZVxuICogQHBhcmFtIHtudW1iZXJ9IG1heCBNYXhpbXVtIHZhbHVlXG4gKiBAcGFyYW0ge251bWJlcn0gbiBDaG9vc2UgYSBtdWx0aXBsZSBvZiB0aGlzIHZhbHVlXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBBIG11bHRpcGxlb2YgbiBiZXR3ZWVuIG1pbiBhbmQgbWF4XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kTXVsdEJldHdlZW4gKG1pbjogbnVtYmVyLCBtYXg6IG51bWJlciwgbjogbnVtYmVyKTogbnVtYmVyIHtcbiAgLy8gcmV0dXJuIGEgcmFuZG9tIG11bHRpcGxlIG9mIG4gYmV0d2VlbiBuIGFuZCBtIChpbmNsdXNpdmUgaWYgcG9zc2libGUpXG4gIG1pbiA9IE1hdGguY2VpbChtaW4gLyBuKSAqIG5cbiAgbWF4ID0gTWF0aC5mbG9vcihtYXggLyBuKSAqIG4gLy8gY291bGQgY2hlY2sgZGl2aXNpYmlsaXR5IGZpcnN0IHRvIG1heGltaXNlIHBlcmZvcm1hY2UsIGJ1dCBJJ20gc3VyZSB0aGUgaGl0IGlzbid0IGJhZFxuXG4gIHJldHVybiByYW5kQmV0d2VlbihtaW4gLyBuLCBtYXggLyBuKSAqIG5cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgcmFuZG9tIGVsZW1lbnQgb2YgYW4gYXJyYXlcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge1RbXX0gYXJyYXkgQW4gYXJyYXkgb2Ygb2JqZWN0c1xuICogQHBhcmFtIHsoKT0+bnVtYmVyfSBbZGlzdF0gQSBkaXN0cmlidXRpb24gZnVuY3Rpb24gZm9yIHdlaWdodGluZywgcmV0dXJuaW5nIGEgbnVtYmVyIGJldHdlZW4gMCBhbmQgMS4gRGVmYXVsdCBpcyBNYXRoLnJhbmRvbVxuICogQHJldHVybnMge1R9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kRWxlbTxUPiAoYXJyYXk6IEFycmF5PFQ+LCBkaXN0PzogKCk9PiBudW1iZXIpIDogVCB7XG4gIGlmIChbLi4uYXJyYXldLmxlbmd0aCA9PT0gMCkgdGhyb3cgbmV3IEVycm9yKCdlbXB0eSBhcnJheScpXG4gIGlmICghZGlzdCkgZGlzdCA9IE1hdGgucmFuZG9tXG4gIGNvbnN0IG4gPSBhcnJheS5sZW5ndGhcbiAgY29uc3QgaSA9IHJhbmRCZXR3ZWVuKDAsIG4gLSAxLCBkaXN0KVxuICByZXR1cm4gWy4uLmFycmF5XVtpXVxufVxuXG4vKipcbiAqIFJhbmRvbWx5IHBhcnRpdGlvbnMgYSB0b3RhbCBpbnRvIG4gYW1vdW50c1xuICogQHBhcmFtIHRvdGFsIFRoZSB0b3RhbCBhbW91bnQgdG8gcGFydGl0aW9uXG4gKiBAcGFyYW0gbiBIb3cgbWFueSBwYXJ0cyB0byBwYXJ0aXRpb24gaW50b1xuICogQHBhcmFtIG1pblByb3BvcnRpb24gVGhlIHNtYWxsZXN0IHByb3BvcnRpb24gb2YgYSB3aG9sZSBmb3IgYSBwYXJ0aW9uXG4gKiBAcGFyYW0gbWluVmFsdWUgVGhlIHNtYWxsZXN0IHZhbHVlIGZvciBhIHBhcnRpdGlvbi4gT3ZlcnJpZGVzIG1pblByb3BvcnRpb25cbiAqIEByZXR1cm5zIEFuIGFycmF5IG9mIG4gbnVtYmVycyB3aGljaCBzdW0gdG8gdG90YWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmRQYXJ0aXRpb24oeyB0b3RhbCwgbiwgbWluUHJvcG9ydGlvbiwgbWluVmFsdWUsIGludGVnZXIgPSB0cnVlIH06IHsgdG90YWw6IG51bWJlcjsgbjogbnVtYmVyOyBtaW5Qcm9wb3J0aW9uPzogbnVtYmVyOyBtaW5WYWx1ZT86IG51bWJlcjsgaW50ZWdlcj86IGJvb2xlYW4gfSk6IG51bWJlcltdIHtcbiAgbWluVmFsdWUgPSBtaW5WYWx1ZSA/PyAobWluUHJvcG9ydGlvbiAhPT0gdW5kZWZpbmVkPyB0b3RhbCptaW5Qcm9wb3J0aW9uIDogMCkgIC8vIHdoeSBkb2VzIHR5cGVzY3JpcHQgcmVxdWlyZSAhIGhlcmU/IFxuICBcbiAgY29uc3QgcGFydGl0aW9uczogbnVtYmVyW10gPSBbXVxuICBsZXQgbGVmdCA9IHRvdGFsXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbiAtIDE7IGkrKykge1xuICAgIGNvbnN0IG1heFZhbHVlID0gbGVmdCAtIG1pblZhbHVlICogKG4gLSBpIC0gMSlcbiAgICBjb25zdCBuZXh0VmFsdWUgPSBpbnRlZ2VyPyByYW5kQmV0d2VlbihtaW5WYWx1ZSwgbWF4VmFsdWUpIDogbWluVmFsdWUgKyBNYXRoLnJhbmRvbSgpKihtYXhWYWx1ZS1taW5WYWx1ZSlcbiAgICBsZWZ0IC09IG5leHRWYWx1ZVxuICAgIHBhcnRpdGlvbnMucHVzaChuZXh0VmFsdWUpXG4gIH1cbiAgcGFydGl0aW9uc1tuIC0gMV0gPSBsZWZ0XG5cbiAgcmV0dXJuIHBhcnRpdGlvbnNcbn1cblxuLyoqXG4gKiBTZWxlY3RzIGFuIGVsZW1lbnRcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge1RbXX0gYXJyYXkgQW4gYXJyYXkgb2YgZWxlbWVudHNcbiAqIEBwYXJhbSB7bnVtYmVyW119IHByb2JhYmlsaXRpZXMgQW4gYXJyYXkgb2YgcHJvYmJpbGl0aWVzXG4gKiBAcmV0dXJucyB7VH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmRFbGVtV2l0aFByb2JhYmlsaXRpZXM8VD4gKGFycmF5OiBBcnJheTxUPiwgcHJvYmFiaWxpdGllczogQXJyYXk8bnVtYmVyPik6IFQge1xuICAvLyB2YWxpZGF0ZVxuICBpZiAoYXJyYXkubGVuZ3RoICE9PSBwcm9iYWJpbGl0aWVzLmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKCdBcnJheSBsZW5ndGhzIGRvIG5vdCBtYXRjaCcpXG5cbiAgY29uc3QgciA9IE1hdGgucmFuZG9tKClcbiAgbGV0IGN1bXVsYXRpdmVQcm9iID0gMFxuICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgY3VtdWxhdGl2ZVByb2IgKz0gcHJvYmFiaWxpdGllc1tpXVxuICAgIGlmIChyIDwgY3VtdWxhdGl2ZVByb2IpIHJldHVybiBhcnJheVtpXVxuICB9XG5cbiAgLy8gc2hvdWxkbid0IGdldCBoZXJlIGlmIHByb2JhYmlsaXRpZXMgc3VtIHRvIDEsIGJ1dCBjb3VsZCBiZSBhIHJvdW5kaW5nIGVycm9yXG4gIGNvbnNvbGUud2FybihgUHJvYmFiaWxpdGllcyBkb24ndCBzdW0gdG8gMT8gVG90YWwgd2FzICR7Y3VtdWxhdGl2ZVByb2J9YClcbiAgcmV0dXJuIChhcnJheVthcnJheS5sZW5ndGggLSAxXSlcbn1cblxuLyoqXG4gKiBGaW5kcyBhIHJhbmRvbSBweXRoYW9ncmVhbiB0cmlwbGUgd2l0aCBtYXhpbXVtIGh5cG90ZW51c2UgbGVuZ3QgXG4gKiBAcGFyYW0ge251bWJlcn0gbWF4IFRoZSBtYXhpbXVtIGxlbmd0aCBvZiB0aGUgaHlwb3RlbnVzZVxuICogQHJldHVybnMge3thOiBudW1iZXIsIGI6IG51bWJlciwgYzogbnVtYmVyfX0gVGhyZWUgdmFsdWVzIHN1Y2ggdGhhdCBhXjIrYl4yPWNeMlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZFB5dGhhZ1RyaXBsZShtYXg6IG51bWJlcik6IHsgYTogbnVtYmVyOyBiOiBudW1iZXI7IGM6IG51bWJlciB9IHtcbiAgY29uc3QgbiA9IHJhbmRCZXR3ZWVuKDIsIE1hdGguY2VpbChNYXRoLnNxcnQobWF4KSktMSk7XG4gIGNvbnN0IG0gPSByYW5kQmV0d2VlbigxLCBNYXRoLm1pbihuLTEsTWF0aC5mbG9vcihNYXRoLnNxcnQobWF4LW4qbikpKSk7XG4gIHJldHVybiB7YTogbipuLW0qbSwgYjogMipuKm0sIGM6bipuK20qbX07XG59XG5cbi8qKlxuICogUmFuZG9tIHB5dGhhZ29yZWFuIHRyaXBsZSB3aXRoIGEgZ2l2ZW4gbGVnXG4gKiBAcGFyYW0ge251bWJlcn0gYSBUaGUgbGVuZ3RoIG9mIHRoZSBmaXJzdCBsZWdcbiAqIEBwYXJhbSB7bnVtYmVyfSBtYXggVGhlIG1heGltdW0gbGVuZ3RoIG9mIHRoZSBoeXBvdGVudXNlXG4gKiBAcmV0dXJucyB7e2E6IG51bWJlciwgYjogbnVtYmVyLCBjOm51bWJlcn19IFRocmVlIHZhbHVlcyBzdWNoIHRoYXQgYV4yK2JeMiA9IGNeMiBhbmQgYSBpcyB0aGUgZmlyc3QgaW5wdXQgcGFyYW1ldGVyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kUHl0aGFnVHJpcGxlV2l0aExlZyhhOiBudW1iZXIsbWF4PzogbnVtYmVyKTogeyBhOiBudW1iZXI7IGI6IG51bWJlcjsgYzogbnVtYmVyIH0ge1xuICAvKiBSYW5kb20gcHl0aGFnb3JlYW4gdHJpcGxlIHdpdGggYSBnaXZlbiBsZWdcbiAgICogVGhhdCBsZWcgaXMgdGhlIGZpcnN0IG9uZSAqL1xuXG4gIGlmIChtYXg9PT11bmRlZmluZWQpIG1heCA9IDUwMDtcblxuICBpZiAoYSUyPT09MSkgeyAvL29kZDogYSA9IG5eMi1tXjJcbiAgICByZXR1cm4gcmFuZFB5dGhhZ25uX21tKGEsbWF4KTtcbiAgfSBlbHNlIHsgLy9ldmVuOiB0cnkgYSA9IDJtbiwgYnV0IGlmIHRoYXQgZmFpbHMsIHRyeSBhPW5eMi1tXjJcbiAgICBsZXQgdHJpcGxlO1xuICAgIGxldCBmMSwgZjI7XG4gICAgaWYgKE1hdGgucmFuZG9tKCk8MC41KSB7XG4gICAgICBmMSA9IHJhbmRQeXRoYWcybW4sIGYyPXJhbmRQeXRoYWdubl9tbTtcbiAgICB9IGVsc2Uge1xuICAgICAgZjIgPSByYW5kUHl0aGFnMm1uLCBmMT1yYW5kUHl0aGFnbm5fbW07XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICB0cmlwbGUgPSBmMShhLG1heCk7XG4gICAgfSBjYXRjaChlcnIpIHtcbiAgICAgIHRyaXBsZSA9IGYyKGEsbWF4KTtcbiAgICB9IFxuICAgIHJldHVybiB0cmlwbGU7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmFuZFB5dGhhZzJtbihhOiBudW1iZXIsbWF4OiBudW1iZXIpIHtcbiAgLy8gYXNzdW1lcyBhIGlzIDJtbiwgZmluZHMgYXBwcm9wcmlhdGUgcGFyYW1ldGVyc1xuICAvLyBsZXQgbSxuIGJlIGEgZmFjdG9yIHBhaXIgb2YgYS8yXG4gIGxldCBmYWN0b3JzID0gW107IC8vZmFjdG9ycyBvZiBuXG4gIGNvbnN0IG1heG0gPSBNYXRoLnNxcnQoYS8yKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgZm9yIChsZXQgbT0xOyBtPG1heG07IG0rKykge1xuICAgIGlmICggKGEvMiklbT09PTAgJiYgbSptKyhhKmEpLyg0Km0qbSk8PW1heCApIHtcbiAgICAgIGZhY3RvcnMucHVzaChtKTtcbiAgICB9XG4gIH1cbiAgaWYgKGZhY3RvcnMubGVuZ3RoPT09MCkgdGhyb3cgXCIybW4gbm8gb3B0aW9uc1wiO1xuXG4gIGxldCBtID0gcmFuZEVsZW0oZmFjdG9ycyk7XG4gIGxldCBuID0gYS8oMiptKTtcbiAgcmV0dXJuIHthOiAyKm4qbSwgYjogTWF0aC5hYnMobipuLW0qbSksIGM6bipuK20qbX07XG59XG5cbmZ1bmN0aW9uIHJhbmRQeXRoYWdubl9tbShhOiBudW1iZXIsbWF4OiBudW1iZXIpIHtcbiAgLy8gYXNzdW1lcyBhID0gbl4yLW1eMlxuICAvLyBtPXNxcnQoYStuXjIpXG4gIC8vIGN5Y2xlIHRocm91Z2ggMeKJpG3iiaRzcXJ0KChtYXgtYSkvMilcbiAgbGV0IHBvc3NpYmxlcyA9IFtdO1xuICBjb25zdCBtYXhtID0gTWF0aC5zcXJ0KChtYXgtYSkvMik7XG4gIGZvciAobGV0IG09MTsgbTw9bWF4bTsgbSsrKSB7XG4gICAgbGV0IG4gPSBNYXRoLnNxcnQoYSttKm0pO1xuICAgIGlmIChuPT09TWF0aC5mbG9vcihuKSkgcG9zc2libGVzLnB1c2goW24sbV0pO1xuICB9XG4gIGlmIChwb3NzaWJsZXMubGVuZ3RoPT09MCkgdGhyb3cgXCJuXjItbV4yIG5vIG9wdGlvbnNcIjtcblxuICBsZXQgW24sbV0gPSByYW5kRWxlbShwb3NzaWJsZXMpO1xuXG4gIHJldHVybiB7YTogbipuLW0qbSwgYjogMipuKm0sIGM6IG4qbittKm19O1xufVxuXG4vKiBNYXRocyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJvdW5kVG9UZW4gKG46IG51bWJlcikge1xuICByZXR1cm4gTWF0aC5yb3VuZChuIC8gMTApICogMTBcbn1cblxuLyoqXG4gKiBSb3VuZHMgYSBudW1iZXIgdG8gYSBnaXZlbiBudW1iZXIgb2YgZGVjaW1hbCBwbGFjZXNcbiAqIEBwYXJhbSB7bnVtYmVyfSB4IFRoZSBudW1iZXIgdG8gcm91bmRcbiAqIEBwYXJhbSB7bnVtYmVyfSBuIFRoZSBudW1iZXIgb2YgZGVjaW1hbCBwbGFjZXNcbiAqIEByZXR1cm5zIHtudW1iZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByb3VuZERQICh4OiBudW1iZXIsIG46IG51bWJlcik6IG51bWJlciB7XG4gIHJldHVybiBNYXRoLnJvdW5kKHggKiBNYXRoLnBvdygxMCwgbikpIC8gTWF0aC5wb3coMTAsIG4pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWdUb1JhZCAoeDogbnVtYmVyKSB7XG4gIHJldHVybiB4ICogTWF0aC5QSSAvIDE4MFxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2luRGVnICh4OiBudW1iZXIpIHtcbiAgcmV0dXJuIE1hdGguc2luKHggKiBNYXRoLlBJIC8gMTgwKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY29zRGVnICh4OiBudW1iZXIpIHtcbiAgcmV0dXJuIE1hdGguY29zKHggKiBNYXRoLlBJIC8gMTgwKVxufVxuXG4vKipcbiAqIFJldHVybnMgYSBzdHJpbmcgcmVwcmVzZW50aW5nIG4vMTBeZHBcbiAqIEUuZy4gc2NhbGVkU3RyKDMxNCwyKSA9IFwiMy4xNFwiXG4gKiBAcGFyYW0ge251bWJlcn0gbiBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgZGlnaXRzIG9mIGEgZml4ZWQgcG9pbnQgbnVtYmVyXG4gKiBAcGFyYW0ge251bWJlcn0gZHAgQW4gaW50ZWdlciBmb3IgbnVtYmVyIG9mIGRlY2ltYWwgcGxhY2VzXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2NhbGVkU3RyIChuOiBudW1iZXIsIGRwOiBudW1iZXIpOiBzdHJpbmcge1xuICBpZiAoZHAgPT09IDApIHJldHVybiBuLnRvU3RyaW5nKClcbiAgY29uc3QgZmFjdG9yID0gTWF0aC5wb3coMTAsIGRwKVxuICBjb25zdCBpbnRwYXJ0ID0gTWF0aC5mbG9vcihuIC8gZmFjdG9yKVxuICBjb25zdCBkZWNwYXJ0ID0gbiAlIGZhY3RvclxuICBpZiAoZGVjcGFydCA9PT0gMCkge1xuICAgIHJldHVybiBpbnRwYXJ0LnRvU3RyaW5nKClcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gaW50cGFydCArICcuJyArIGRlY3BhcnRcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2NkIChhOiBudW1iZXIsIGI6IG51bWJlcikgOiBudW1iZXIge1xuICAvLyB0YWtlbiBmcm9tIGZyYWN0aW9uLmpzXG4gIGlmICghYSkgeyByZXR1cm4gYiB9XG4gIGlmICghYikgeyByZXR1cm4gYSB9XG5cbiAgd2hpbGUgKDEpIHtcbiAgICBhICU9IGJcbiAgICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICAgIGIgJT0gYVxuICAgIGlmICghYikgeyByZXR1cm4gYSB9XG4gIH1cbiAgcmV0dXJuIDAgLy8gdW5yZWFjaGFibGUsIGFuZCBtYXRoZW1hdGljYWxseSBndWFyYW50ZWVkIG5vdCB0byBoYXBwZW4sIGJ1dCBtYWtlcyB0eXBlc2NyaXB0IHF1ZWl0XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsY20gKGE6IG51bWJlciwgYjogbnVtYmVyKSB7XG4gIHJldHVybiBhICogYiAvIGdjZChhLCBiKVxufVxuXG4vKiBBcnJheXMgYW5kIHNpbWlsYXIgKi9cblxuZnVuY3Rpb24gaXNBcnJheU9mTnVtYmVycyhhcnI6IHVua25vd25bXSkgOiBhcnIgaXMgbnVtYmVyW10ge1xuICByZXR1cm4gKHR5cGVvZiBhcnJbMF0gPT09ICdudW1iZXInKVxufVxuXG4vKipcbiAqIFNvcnRzIHR3byBhcnJheXMgdG9nZXRoZXIgYmFzZWQgb24gc29ydGluZyBhcnIwXG4gKiBAcGFyYW0geypbXX0gYXJyMFxuICogQHBhcmFtIHsqW119IGFycjFcbiAqIEBwYXJhbSB7Kn0gZlxuICovXG5leHBvcnQgZnVuY3Rpb24gc29ydFRvZ2V0aGVyIChhcnIwIDogdW5rbm93bltdLCBhcnIxOiB1bmtub3duW10sIGY6ICh4OiB1bmtub3duLCB5OnVua25vd24pPT5udW1iZXIpIDogW3Vua25vd25bXSx1bmtub3duW11dIHtcbiAgaWYgKGFycjAubGVuZ3RoICE9PSBhcnIxLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JvdGggYXJndW1lbnRzIG11c3QgYmUgYXJyYXlzIG9mIHRoZSBzYW1lIGxlbmd0aCcpXG4gIH1cblxuICBpZiAoIWYpIHtcbiAgICBmID0gZiB8fCAoKHgsIHkpID0+ICh4IGFzIG51bWJlcikgLSAoeSBhcyBudW1iZXIpKVxuICB9XG5cbiAgY29uc3QgbiA9IGFycjAubGVuZ3RoXG4gIGNvbnN0IGNvbWJpbmVkID0gW11cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICBjb21iaW5lZFtpXSA9IFthcnIwW2ldLCBhcnIxW2ldXVxuICB9XG5cbiAgY29tYmluZWQuc29ydCgoeCwgeSkgPT4gZih4WzBdLCB5WzBdKSlcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgIGFycjBbaV0gPSBjb21iaW5lZFtpXVswXVxuICAgIGFycjFbaV0gPSBjb21iaW5lZFtpXVsxXVxuICB9XG5cbiAgcmV0dXJuIFthcnIwLCBhcnIxXVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2h1ZmZsZTxUPiAoYXJyYXk6IFRbXSkge1xuICAvLyBLbnV0aC1GaXNoZXItWWF0ZXNcbiAgLy8gZnJvbSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjQ1MDk3Ni8zNzM3Mjk1XG4gIC8vIG5iLiBzaHVmZmxlcyBpbiBwbGFjZVxuICB2YXIgY3VycmVudEluZGV4ID0gYXJyYXkubGVuZ3RoOyB2YXIgdGVtcG9yYXJ5VmFsdWU7IHZhciByYW5kb21JbmRleFxuXG4gIC8vIFdoaWxlIHRoZXJlIHJlbWFpbiBlbGVtZW50cyB0byBzaHVmZmxlLi4uXG4gIHdoaWxlIChjdXJyZW50SW5kZXggIT09IDApIHtcbiAgICAvLyBQaWNrIGEgcmVtYWluaW5nIGVsZW1lbnQuLi5cbiAgICByYW5kb21JbmRleCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGN1cnJlbnRJbmRleClcbiAgICBjdXJyZW50SW5kZXggLT0gMVxuXG4gICAgLy8gQW5kIHN3YXAgaXQgd2l0aCB0aGUgY3VycmVudCBlbGVtZW50LlxuICAgIHRlbXBvcmFyeVZhbHVlID0gYXJyYXlbY3VycmVudEluZGV4XVxuICAgIGFycmF5W2N1cnJlbnRJbmRleF0gPSBhcnJheVtyYW5kb21JbmRleF1cbiAgICBhcnJheVtyYW5kb21JbmRleF0gPSB0ZW1wb3JhcnlWYWx1ZVxuICB9XG5cbiAgcmV0dXJuIGFycmF5XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIGEgaXMgYW4gYXJyYXkgY29udGFpbmluZyBlLCBmYWxzZSBvdGhlcndpc2UgKGluY2x1ZGluZyBpZiBhIGlzIG5vdCBhbiBhcnJheSlcbiAqIEBwYXJhbSB7Kn0gYSAgQW4gYXJyYXlcbiAqIEBwYXJhbSB7Kn0gZSBBbiBlbGVtZW50IHRvIGNoZWNrIGlmIGlzIGluIHRoZSBhcnJheVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3ZWFrSW5jbHVkZXMgKGE6IHVua25vd24sIGU6dW5rbm93bikgOiBib29sZWFuIHtcbiAgcmV0dXJuIChBcnJheS5pc0FycmF5KGEpICYmIGEuaW5jbHVkZXMoZSkpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaXJzdFVuaXF1ZUluZGV4PFQ+IChhcnJheTpUW10pOiBudW1iZXIge1xuICAvLyByZXR1cm5zIGluZGV4IG9mIGZpcnN0IHVuaXF1ZSBlbGVtZW50XG4gIC8vIGlmIG5vbmUsIHJldHVybnMgbGVuZ3RoIG9mIGFycmF5XG4gIGxldCBpID0gMFxuICB3aGlsZSAoaSA8IGFycmF5Lmxlbmd0aCkge1xuICAgIGlmIChhcnJheS5pbmRleE9mKGFycmF5W2ldKSA9PT0gYXJyYXkubGFzdEluZGV4T2YoYXJyYXlbaV0pKSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgICBpKytcbiAgfVxuICByZXR1cm4gaVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYm9vbE9iamVjdFRvQXJyYXk8VCBleHRlbmRzIHN0cmluZz4gKG9iajogUmVjb3JkPFQsdW5rbm93bj4pIDogVFtdIHtcbiAgLy8gR2l2ZW4gYW4gb2JqZWN0IHdoZXJlIGFsbCB2YWx1ZXMgYXJlIGJvb2xlYW4sIHJldHVybiBrZXlzIHdoZXJlIHRoZSB2YWx1ZSBpcyB0cnVlXG4gIGNvbnN0IHJlc3VsdCA9IFtdXG4gIGZvciAoY29uc3Qga2V5IGluIG9iaikge1xuICAgIGlmIChvYmpba2V5XSkgcmVzdWx0LnB1c2goa2V5KVxuICB9XG4gIHJldHVybiByZXN1bHRcbn1cblxuLyogT2JqZWN0IHByb3BlcnR5IGFjY2VzcyBieSBzdHJpbmcgKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm9wQnlTdHJpbmcgKG86IFJlY29yZDxzdHJpbmcsdW5rbm93bj4sIHM6IHN0cmluZywgeDogdW5rbm93bikge1xuICAvKiBFLmcuIGJ5U3RyaW5nKG15T2JqLFwiZm9vLmJhclwiKSAtPiBteU9iai5mb28uYmFyXG4gICAgICogYnlTdHJpbmcobXlPYmosXCJmb28uYmFyXCIsXCJiYXpcIikgLT4gbXlPYmouZm9vLmJhciA9IFwiYmF6XCJcbiAgICAgKi9cbiAgcyA9IHMucmVwbGFjZSgvXFxbKFxcdyspXFxdL2csICcuJDEnKSAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICBzID0gcy5yZXBsYWNlKC9eXFwuLywgJycpIC8vIHN0cmlwIGEgbGVhZGluZyBkb3RcbiAgdmFyIGEgPSBzLnNwbGl0KCcuJylcbiAgZm9yICh2YXIgaSA9IDAsIG4gPSBhLmxlbmd0aCAtIDE7IGkgPCBuOyArK2kpIHtcbiAgICB2YXIgayA9IGFbaV1cbiAgICBpZiAoayBpbiBvKSB7XG4gICAgICBvID0gb1trXSBhcyBSZWNvcmQ8c3RyaW5nLHVua25vd24+XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgfVxuICBpZiAoeCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gb1thW25dXVxuICBlbHNlIG9bYVtuXV0gPSB4XG59XG5cbi8qIExvZ2ljICovXG5leHBvcnQgZnVuY3Rpb24gbUlmIChwOiBib29sZWFuLCBxOiBib29sZWFuKSB7IC8vIG1hdGVyaWFsIGNvbmRpdGlvbmFsXG4gIHJldHVybiAoIXAgfHwgcSlcbn1cblxuLyogRE9NIG1hbmlwdWxhdGlvbiBhbmQgcXVlcnlpbmcgKi9cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IEhUTUwgZWxlbWVudCwgc2V0cyBjbGFzc2VzIGFuZCBhcHBlbmRzXG4gKiBAcGFyYW0ge3N0cmluZ30gdGFnTmFtZSBUYWcgbmFtZSBvZiBlbGVtZW50XG4gKiBAcGFyYW0ge3N0cmluZ3x1bmRlZmluZWR9IFtjbGFzc05hbWVdIEEgY2xhc3Mgb3IgY2xhc3NlcyB0byBhc3NpZ24gdG8gdGhlIGVsZW1lbnRcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IFtwYXJlbnRdIEEgcGFyZW50IGVsZW1lbnQgdG8gYXBwZW5kIHRoZSBlbGVtZW50IHRvXG4gKiBAcmV0dXJucyB7SFRNTEVsZW1lbnR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbGVtICh0YWdOYW1lOiBzdHJpbmcsIGNsYXNzTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBwYXJlbnQ/OiBIVE1MRWxlbWVudCk6IEhUTUxFbGVtZW50IHtcbiAgLy8gY3JlYXRlLCBzZXQgY2xhc3MgYW5kIGFwcGVuZCBpbiBvbmVcbiAgY29uc3QgZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSlcbiAgaWYgKGNsYXNzTmFtZSkgZWxlbS5jbGFzc05hbWUgPSBjbGFzc05hbWVcbiAgaWYgKHBhcmVudCkgcGFyZW50LmFwcGVuZENoaWxkKGVsZW0pXG4gIHJldHVybiBlbGVtXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoYXNBbmNlc3RvckNsYXNzIChlbGVtOiBIVE1MRWxlbWVudHxudWxsLCBjbGFzc05hbWU6IHN0cmluZykge1xuICAvLyBjaGVjayBpZiBhbiBlbGVtZW50IGVsZW0gb3IgYW55IG9mIGl0cyBhbmNlc3RvcnMgaGFzIGNsc3NcbiAgbGV0IHJlc3VsdCA9IGZhbHNlXG4gIGZvciAoO2VsZW0gJiYgZWxlbS5wYXJlbnROb2RlOyBlbGVtID0gZWxlbS5wYXJlbnRFbGVtZW50KSB7IC8vIHRyYXZlcnNlIERPTSB1cHdhcmRzXG4gICAgaWYgKGVsZW0uY2xhc3NMaXN0LmNvbnRhaW5zKGNsYXNzTmFtZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRydWVcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgdHdvIGVsZW1lbnRzIG92ZXJsYXBcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW0xIEFuIEhUTUwgZWxlbWVudFxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbTIgQW4gSFRNTCBlbGVtZW50XG4gKi9cbmZ1bmN0aW9uIG92ZXJsYXAoIGVsZW0xOiBIVE1MRWxlbWVudCwgZWxlbTI6IEhUTUxFbGVtZW50KSB7XG4gIGNvbnN0IHJlY3QxID0gZWxlbTEuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcbiAgY29uc3QgcmVjdDIgPSBlbGVtMi5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVxuICByZXR1cm4gIShyZWN0MS5yaWdodCA8IHJlY3QyLmxlZnQgfHwgXG4gICAgICAgICAgIHJlY3QxLmxlZnQgPiByZWN0Mi5yaWdodCB8fCBcbiAgICAgICAgICAgcmVjdDEuYm90dG9tIDwgcmVjdDIudG9wIHx8IFxuICAgICAgICAgICByZWN0MS50b3AgPiByZWN0Mi5ib3R0b20pXG59XG5cbi8qKlxuICogSWYgZWxlbTEgYW5kIGVsZW0yIG92ZXJsYXAsIG1vdmUgdGhlbSBhcGFydCB1bnRpbCB0aGV5IGRvbid0LlxuICogT25seSB3b3JrcyBmb3IgdGhvc2Ugd2l0aCBwb3NpdGlvbjphYnNvbHV0ZVxuICogVGhpcyBzdHJpcHMgdHJhbnNmb3JtYXRpb25zLCB3aGljaCBtYXkgYmUgYSBwcm9ibGVtXG4gKiBFbGVtZW50cyB3aXRoIGNsYXNzICdyZXBlbC1sb2NrZWQnIHdpbGwgbm90IGJlIG1vdmVkXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtMSBBbiBIVE1MIGVsZW1lbnRcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW0yIEFuIEhUTUwgZWxlbWVudFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVwZWxFbGVtZW50cyhlbGVtMTogSFRNTEVsZW1lbnQsIGVsZW0yOiBIVE1MRWxlbWVudCkgIHtcbiAgaWYgKCFvdmVybGFwKGVsZW0xLGVsZW0yKSkgcmV0dXJuXG4gIGlmIChnZXRDb21wdXRlZFN0eWxlKGVsZW0xKS5wb3NpdGlvbiAhPT0gXCJhYnNvbHV0ZVwiIHx8IGdldENvbXB1dGVkU3R5bGUoZWxlbTIpLnBvc2l0aW9uICE9PSAnYWJzb2x1dGUnKSB0aHJvdyBuZXcgRXJyb3IgKCdPbmx5IGNhbGwgb24gcG9zaXRpb246YWJzb2x1dGUnKVxuICBsZXQgdGwxID0gUG9pbnQuZnJvbUVsZW1lbnQoZWxlbTEpXG4gIGxldCB0bDIgPSBQb2ludC5mcm9tRWxlbWVudChlbGVtMilcbiAgXG4gIGNvbnN0IGMxID0gUG9pbnQuZnJvbUVsZW1lbnQoZWxlbTEsIFwiY2VudGVyXCIpXG4gIGNvbnN0IGMyID0gUG9pbnQuZnJvbUVsZW1lbnQoZWxlbTIsIFwiY2VudGVyXCIpXG4gIGNvbnN0IHZlYyA9IFBvaW50LnVuaXRWZWN0b3IoYzEsYzIpXG5cbiAgY29uc3QgbG9ja2VkMSA9IGVsZW0xLmNsYXNzTGlzdC5jb250YWlucygncmVwZWwtbG9ja2VkJylcbiAgY29uc3QgbG9ja2VkMiA9IGVsZW0yLmNsYXNzTGlzdC5jb250YWlucygncmVwZWwtbG9ja2VkJylcblxuICBsZXQgaSA9IDBcbiAgd2hpbGUob3ZlcmxhcChlbGVtMSxlbGVtMikgJiYgaTw1MDApIHtcbiAgICBpZiAoIWxvY2tlZDEpIHRsMS50cmFuc2xhdGUoLXZlYy54LC12ZWMueSlcbiAgICBpZiAoIWxvY2tlZDIpIHRsMi50cmFuc2xhdGUodmVjLngsdmVjLnkpXG4gICAgZWxlbTEuc3R5bGUubGVmdCA9IHRsMS54ICsgXCJweFwiXG4gICAgZWxlbTEuc3R5bGUudG9wID0gdGwxLnkgKyBcInB4XCJcbiAgICBlbGVtMS5zdHlsZS50cmFuc2Zvcm0gPSBcIm5vbmVcIlxuICAgIGVsZW0yLnN0eWxlLmxlZnQgPSB0bDIueCArIFwicHhcIlxuICAgIGVsZW0yLnN0eWxlLnRvcCA9IHRsMi55ICsgXCJweFwiXG4gICAgZWxlbTIuc3R5bGUudHJhbnNmb3JtID0gXCJub25lXCJcbiAgICBpKytcbiAgfVxuICBpZiAoaT09PTUwMCkgdGhyb3cgbmV3IEVycm9yKCdUb28gbXVjaCBtb3ZpbmcnKVxuICBjb25zb2xlLmxvZyhgUmVwZWxsZWQgd2l0aCAke2l9IGl0ZXJhdGlvbnNgKVxufVxuXG4vKiBDYW52YXMgZHJhd2luZyAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhc2hlZExpbmUgKGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCB4MTogbnVtYmVyLCB5MTogbnVtYmVyLCB4MjogbnVtYmVyLCB5MjogbnVtYmVyKSB7XG4gIGNvbnN0IGxlbmd0aCA9IE1hdGguaHlwb3QoeDIgLSB4MSwgeTIgLSB5MSlcbiAgY29uc3QgZGFzaHggPSAoeTEgLSB5MikgLyBsZW5ndGggLy8gdW5pdCB2ZWN0b3IgcGVycGVuZGljdWxhciB0byBsaW5lXG4gIGNvbnN0IGRhc2h5ID0gKHgyIC0geDEpIC8gbGVuZ3RoXG4gIGNvbnN0IG1pZHggPSAoeDEgKyB4MikgLyAyXG4gIGNvbnN0IG1pZHkgPSAoeTEgKyB5MikgLyAyXG5cbiAgLy8gZHJhdyB0aGUgYmFzZSBsaW5lXG4gIGN0eC5tb3ZlVG8oeDEsIHkxKVxuICBjdHgubGluZVRvKHgyLCB5MilcblxuICAvLyBkcmF3IHRoZSBkYXNoXG4gIGN0eC5tb3ZlVG8obWlkeCArIDUgKiBkYXNoeCwgbWlkeSArIDUgKiBkYXNoeSlcbiAgY3R4LmxpbmVUbyhtaWR4IC0gNSAqIGRhc2h4LCBtaWR5IC0gNSAqIGRhc2h5KVxuXG4gIGN0eC5tb3ZlVG8oeDIsIHkyKVxufVxuIiwiaW1wb3J0IHsgT3B0aW9uc1NwZWMsIE9wdGlvbiBhcyBPcHRpb25JLCBTZWxlY3RFeGNsdXNpdmVPcHRpb24sIFNlbGVjdEluY2x1c2l2ZU9wdGlvbiwgUmVhbE9wdGlvbiwgUmFuZ2VPcHRpb24sIEludGVnZXJPcHRpb24sIEJvb2xlYW5PcHRpb24gfSBmcm9tICdPcHRpb25zU3BlYydcbmltcG9ydCB7IGNyZWF0ZUVsZW0gfSBmcm9tICd1dGlsaXRpZXMnXG5cbi8qKiAgUmVjb3JkcyB0eXBzZSBvZiBvcHRpb24gYXZhaWxhYmlsdHksIGFuZCBsaW5rIHRvIFVJIGFuZCBmdXJ0aGVyIG9wdGlvbnMgc2V0cyAqL1xudHlwZSBPcHRpb25zcGVjMiA9IChPcHRpb25zU3BlY1swXSAmIHsgLy8gU3RhcnQgd2l0aCBzdGFuZGFyZCBvcHRpb25zIHNwZWMgLSB0YWtlbiBmcm9tIHF1ZXN0aW9uIGdlbmVyYXRvciBjbGFzc2VzXG4gIGVsZW1lbnQ/OiBIVE1MRWxlbWVudCwgLy8gbW9zdCB3aWxsIGFsc28gaGF2ZSBsaW5rcyB0byBhIFVJIGVsZW1lbnRcbiAgc3ViT3B0aW9uc1NldD86IE9wdGlvbnNTZXQgLy8gZm9yIG9wdGlvbi50eXBlPVwic3Vib3B0aW9uc1wiLCBob2xkIGxpbmsgdG8gdGhlIE9wdGlvbnNTZXQgZm9yIHRoYXRcbn0pW11cblxuLyoqXG4gKiBBIHNpbXBsZSBvYmplY3QgcmVwcmVzZW50aW5nIG9wdGlvbnMgdG8gc2VuZCB0byBhIHF1ZXN0aW9uIGdlbmVyYXRvclxuICogTkIuIFRoaXMgaXMgYSB2ZXJ5ICdsb29zZScgdHlwZVxuICovXG5pbnRlcmZhY2UgT3B0aW9ucyB7XG4gIFtrZXk6IHN0cmluZ106IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBzdHJpbmdbXSB8IE9wdGlvbnNcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgc2V0IG9mIG9wdGlvbnMsIHdpdGggbGluayB0byBVSSBlbGVtZW50cy4gU3RvcmVzIGludGVybmFsbHkgdGhlIG9wdGlvbnNcbiAqIGluIGEgc2ltcGxlIG9iamVjdCBzdWl0YWJsZSBmb3IgcGFzc2luZyB0byBxdWVzdGlvbiBnZW5lcmF0b3JzXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE9wdGlvbnNTZXQge1xuICBvcHRpb25zU3BlYyA6IE9wdGlvbnNwZWMyXG4gIG9wdGlvbnMgOiBPcHRpb25zXG4gIHRlbXBsYXRlPyA6IHN0cmluZ1xuICBnbG9iYWxJZDogc3RyaW5nXG4gIHN0YXRpYyBpZENvdW50ZXIgPSAwIC8vIGluY3JlbWVudCBlYWNoIHRpbWUgdG8gY3JlYXRlIHVuaXF1ZSBpZHMgdG8gdXNlIGluIGlkcy9uYW1lcyBvZiBlbGVtZW50c1xuXG4gIHN0YXRpYyBnZXRJZCAoKTogc3RyaW5nIHtcbiAgICBpZiAoT3B0aW9uc1NldC5pZENvdW50ZXIgPj0gMjYgKiogMikgdGhyb3cgbmV3IEVycm9yKCdUb28gbWFueSBvcHRpb25zIG9iamVjdHMhJylcbiAgICBjb25zdCBpZCA9IFN0cmluZy5mcm9tQ2hhckNvZGUofn4oT3B0aW9uc1NldC5pZENvdW50ZXIgLyAyNikgKyA5NykgK1xuICAgICAgU3RyaW5nLmZyb21DaGFyQ29kZShPcHRpb25zU2V0LmlkQ291bnRlciAlIDI2ICsgOTcpXG5cbiAgICBPcHRpb25zU2V0LmlkQ291bnRlciArPSAxXG5cbiAgICByZXR1cm4gaWRcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgb3B0aW9ucyBzcGVjXG4gICAqIEBwYXJhbSBvcHRpb25zU3BlYyBTcGVjaWZpY2F0aW9uIG9mIG9wdGlvbnNcbiAgICogQHBhcmFtIHRlbXBsYXRlIEEgdGVtcGxhdGUgZm9yIGRpc3BsYXlpbmcgb3B0aW9ucywgdXNpbmcge3ttdXN0YWNoZX19IHN5bnRheFxuICAgKi9cbiAgY29uc3RydWN0b3IgKG9wdGlvbnNTcGVjIDogT3B0aW9uc1NwZWMsIHRlbXBsYXRlPyA6IHN0cmluZykge1xuICAgIHRoaXMub3B0aW9uc1NwZWMgPSBvcHRpb25zU3BlYyBhcyBPcHRpb25zcGVjMlxuXG4gICAgdGhpcy5vcHRpb25zID0ge31cbiAgICB0aGlzLm9wdGlvbnNTcGVjLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgIGlmIChpc1JlYWxPcHRpb24ob3B0aW9uKSAmJiBvcHRpb24udHlwZSAhPT0gJ3N1Ym9wdGlvbnMnICYmIG9wdGlvbi50eXBlICE9PSAncmFuZ2UnKSB7XG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gb3B0aW9uLmRlZmF1bHRcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9uLnR5cGUgPT09ICdyYW5nZScpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZExCXSA9IG9wdGlvbi5kZWZhdWx0TEJcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZFVCXSA9IG9wdGlvbi5kZWZhdWx0VUJcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9uLnR5cGUgPT09ICdzdWJvcHRpb25zJykgeyAvLyBSZWN1cnNpdmVseSBidWlsZCBzdWJvcHRpb25zLiBUZXJtaW5hdGVzIGFzIGxvbmcgYXMgb3B0aW9uc1NwZWMgaXMgbm90IGNpcmN1bGFyXG4gICAgICAgIG9wdGlvbi5zdWJPcHRpb25zU2V0ID0gbmV3IE9wdGlvbnNTZXQob3B0aW9uLm9wdGlvbnNTcGVjKVxuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IG9wdGlvbi5zdWJPcHRpb25zU2V0Lm9wdGlvbnNcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhpcy50ZW1wbGF0ZSA9IHRlbXBsYXRlIC8vIGh0bWwgdGVtcGxhdGUgKG9wdGlvbmFsKVxuXG4gICAgLy8gc2V0IGFuIGlkIGJhc2VkIG9uIGEgY291bnRlciAtIHVzZWQgZm9yIG5hbWVzIG9mIGZvcm0gZWxlbWVudHNcbiAgICB0aGlzLmdsb2JhbElkID0gT3B0aW9uc1NldC5nZXRJZCgpXG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYW4gb3B0aW9uLCBmaW5kIGl0cyBVSSBlbGVtZW50IGFuZCB1cGRhdGUgdGhlIHN0YXRlIGZyb20gdGhhdFxuICAgKiBAcGFyYW0geyp9IG9wdGlvbiBBbiBlbGVtZW50IG9mIHRoaXMub3B0aW9uU3BlYyBvciBhbiBpZFxuICAgKi9cbiAgdXBkYXRlU3RhdGVGcm9tVUkgKG9wdGlvbiA6IE9wdGlvbnNwZWMyWzBdIHwgc3RyaW5nKSA6IHZvaWQge1xuICAgIC8vIGlucHV0IC0gZWl0aGVyIGFuIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25zU3BlYyBvciBhbiBvcHRpb24gaWRcbiAgICBpZiAodHlwZW9mIChvcHRpb24pID09PSAnc3RyaW5nJykge1xuICAgICAgY29uc3Qgb3B0aW9uc1NwZWMgOiBPcHRpb25zcGVjMlswXSB8IHVuZGVmaW5lZCA9IHRoaXMub3B0aW9uc1NwZWMuZmluZCh4ID0+ICgoeCBhcyBPcHRpb25JKS5pZCA9PT0gb3B0aW9uKSlcbiAgICAgIGlmIChvcHRpb25zU3BlYyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG9wdGlvbiA9IG9wdGlvbnNTcGVjXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYG5vIG9wdGlvbiB3aXRoIGlkICcke29wdGlvbn0nYClcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFvcHRpb24uZWxlbWVudCkgdGhyb3cgbmV3IEVycm9yKGBvcHRpb24gJHsob3B0aW9uIGFzIE9wdGlvbkkpLmlkfSBkb2Vzbid0IGhhdmUgYSBVSSBlbGVtZW50YClcblxuICAgIHN3aXRjaCAob3B0aW9uLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2ludCc6IHtcbiAgICAgICAgY29uc3QgaW5wdXQgOiBIVE1MSW5wdXRFbGVtZW50ID0gb3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JylbMF1cbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBOdW1iZXIoaW5wdXQudmFsdWUpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdib29sJzoge1xuICAgICAgICBjb25zdCBpbnB1dCA6IEhUTUxJbnB1dEVsZW1lbnQgPSBvcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKVswXVxuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IGlucHV0LmNoZWNrZWRcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NlbGVjdC1leGNsdXNpdmUnOiB7XG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gKG9wdGlvbi5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0OmNoZWNrZWQnKSBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAnc2VsZWN0LWluY2x1c2l2ZSc6IHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPVxuICAgICAgICAgIChBcnJheS5mcm9tKG9wdGlvbi5lbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0OmNoZWNrZWQnKSkgYXMgSFRNTElucHV0RWxlbWVudFtdKS5tYXAoeCA9PiB4LnZhbHVlKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAncmFuZ2UnOiB7XG4gICAgICAgIGNvbnN0IGlucHV0TEIgOiBIVE1MSW5wdXRFbGVtZW50ID0gb3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JylbMF1cbiAgICAgICAgY29uc3QgaW5wdXRVQiA6IEhUTUxJbnB1dEVsZW1lbnQgPSBvcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKVsxXVxuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkTEJdID0gTnVtYmVyKGlucHV0TEIudmFsdWUpXG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRVQl0gPSBOdW1iZXIoaW5wdXRVQi52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBvcHRpb24gd2l0aCBpZCAkeyhvcHRpb24gYXMgT3B0aW9uSSkuaWR9IGhhcyB1bnJlY29nbmlzZWQgb3B0aW9uIHR5cGUgJHtvcHRpb24udHlwZX1gKVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0aGlzLm9wdGlvbnMpXG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBzdHJpbmcsIHJldHVybiB0aGUgZWxlbWVudCBvZiB0aGlzLm9wdGlvbnMgd2l0aCB0aGF0IGlkXG4gICAqIEBwYXJhbSBpZCBUaGUgaWRcbiAgICovXG5cbiAgdXBkYXRlU3RhdGVGcm9tVUlBbGwgKCk6IHZvaWQge1xuICAgIHRoaXMub3B0aW9uc1NwZWMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgaWYgKGlzUmVhbE9wdGlvbihvcHRpb24pKSB7XG4gICAgICAgIHRoaXMudXBkYXRlU3RhdGVGcm9tVUkob3B0aW9uKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBkaXNhYmxlT3JFbmFibGVBbGwgKCk6IHZvaWQge1xuICAgIHRoaXMub3B0aW9uc1NwZWMuZm9yRWFjaChvcHRpb24gPT4gdGhpcy5kaXNhYmxlT3JFbmFibGUob3B0aW9uKSlcbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhbiBvcHRpb24sIGVuYWJsZSB0aGUgVUkgZWxlbWVudHMgaWYgYW5kIG9ubHkgaWYgYWxsIHRoZSBib29sZWFuXG4gICAqIG9wdGlvbnMgaW4gb3B0aW9uLmVuYWJsZWRJZiBhcmUgdHJ1ZVxuICAgKiBAcGFyYW0gb3B0aW9uIEFuIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25zU3BlYyBvciBhbiBvcHRpb24gaWRcbiAgICovXG4gIGRpc2FibGVPckVuYWJsZSAob3B0aW9uIDogc3RyaW5nIHwgT3B0aW9uc3BlYzJbMF0pOiB2b2lkIHtcbiAgICBpZiAodHlwZW9mIChvcHRpb24pID09PSAnc3RyaW5nJykge1xuICAgICAgY29uc3QgdGVtcE9wdGlvbiA6IE9wdGlvbnNwZWMyWzBdIHwgdW5kZWZpbmVkID0gdGhpcy5vcHRpb25zU3BlYy5maW5kKHggPT4gKGlzUmVhbE9wdGlvbih4KSAmJiB4LmlkID09PSBvcHRpb24pKVxuICAgICAgaWYgKHRlbXBPcHRpb24gIT09IHVuZGVmaW5lZCkgeyBvcHRpb24gPSB0ZW1wT3B0aW9uIH0gZWxzZSB7IHRocm93IG5ldyBFcnJvcihgbm8gb3B0aW9uIHdpdGggaWQgJyR7b3B0aW9ufSdgKSB9XG4gICAgfVxuXG4gICAgaWYgKCFpc1JlYWxPcHRpb24ob3B0aW9uKSB8fCAhb3B0aW9uLmVuYWJsZWRJZiB8fCBvcHRpb24uZWxlbWVudCA9PT0gdW5kZWZpbmVkKSByZXR1cm5cblxuICAgIGNvbnN0IGVuYWJsZXJMaXN0ID0gb3B0aW9uLmVuYWJsZWRJZi5zcGxpdCgnJicpIC8vXG4gICAgbGV0IGVuYWJsZSA9IHRydWUgLy8gd2lsbCBkaXNhYmxlIGlmIGp1c3Qgb25lIG9mIHRoZSBlbGVtZW50cyBvZiBlbmFibGVyTGlzdCBpcyBmYWxzZVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbmFibGVyTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IGVuYWJsZXJJZCA9IGVuYWJsZXJMaXN0W2ldXG4gICAgICBsZXQgbmVnYXRlID0gZmFsc2UgLy8gaWYgaXQgc3RhcnRzIHdpdGggISwgbmVnYXRpdmUgb3V0cHV0XG4gICAgICBpZiAoZW5hYmxlcklkLnN0YXJ0c1dpdGgoJyEnKSkge1xuICAgICAgICBuZWdhdGUgPSB0cnVlXG4gICAgICAgIGVuYWJsZXJJZCA9IGVuYWJsZXJJZC5zbGljZSgxKVxuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIHRoaXMub3B0aW9uc1tlbmFibGVySWRdICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkICdlbmFibGVkSWYnOiAke2VuYWJsZXJJZH0gaXMgbm90IGEgYm9vbGVhbiBvcHRpb25gKVxuICAgICAgfVxuXG4gICAgICBjb25zdCBlbmFibGVyVmFsdWUgOiBib29sZWFuID0gdGhpcy5vcHRpb25zW2VuYWJsZXJJZF0gYXMgYm9vbGVhbiAvLyEgPT0gbmVnYXRlIC8vICE9PSBlcXVpdmFsZW50IHRvIFhPUlxuXG4gICAgICBpZiAoIWVuYWJsZXJWYWx1ZSkge1xuICAgICAgICBlbmFibGUgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChlbmFibGUpIHtcbiAgICAgIG9wdGlvbi5lbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoJ2Rpc2FibGVkJylcbiAgICAgIDtbLi4ub3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JyldLmZvckVhY2goZSA9PiB7IGUuZGlzYWJsZWQgPSBmYWxzZSB9KVxuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb24uZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdkaXNhYmxlZCcpXG4gICAgICA7Wy4uLm9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpXS5mb3JFYWNoKGUgPT4geyBlLmRpc2FibGVkID0gdHJ1ZSB9KVxuICAgIH1cbiAgfVxuXG4gIHJlbmRlckluIChlbGVtZW50OiBIVE1MRWxlbWVudCwgdWxFeHRyYUNsYXNzPyA6IHN0cmluZykgOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3QgbGlzdCA9IGNyZWF0ZUVsZW0oJ3VsJywgJ29wdGlvbnMtbGlzdCcpXG4gICAgaWYgKHVsRXh0cmFDbGFzcykgbGlzdC5jbGFzc0xpc3QuYWRkKHVsRXh0cmFDbGFzcylcbiAgICBsZXQgY29sdW1uID0gY3JlYXRlRWxlbSgnZGl2JywgJ29wdGlvbnMtY29sdW1uJywgbGlzdClcblxuICAgIHRoaXMub3B0aW9uc1NwZWMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgaWYgKG9wdGlvbi50eXBlID09PSAnY29sdW1uLWJyZWFrJykgeyAvLyBzdGFydCBuZXcgY29sdW1uXG4gICAgICAgIGNvbHVtbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdvcHRpb25zLWNvbHVtbicsIGxpc3QpXG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbi50eXBlID09PSAnc3Vib3B0aW9ucycpIHtcbiAgICAgICAgY29uc3Qgc3ViT3B0aW9uc1NldCA9IG9wdGlvbi5zdWJPcHRpb25zU2V0XG4gICAgICAgIGlmIChzdWJPcHRpb25zU2V0ID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcignVGhpcyBzaG91bGQgbm90IGhhcHBlbiEnKVxuICAgICAgICBjb25zdCBzdWJPcHRpb25zRWxlbWVudCA9IHN1Yk9wdGlvbnNTZXQucmVuZGVySW4oY29sdW1uLCAnc3Vib3B0aW9ucycpXG4gICAgICAgIG9wdGlvbi5lbGVtZW50ID0gc3ViT3B0aW9uc0VsZW1lbnRcbiAgICAgIH0gZWxzZSB7IC8vIG1ha2UgbGlzdCBpdGVtXG4gICAgICAgIGNvbnN0IGxpID0gY3JlYXRlRWxlbSgnbGknLCB1bmRlZmluZWQsIGNvbHVtbilcbiAgICAgICAgaWYgKGlzUmVhbE9wdGlvbihvcHRpb24pKSB7XG4gICAgICAgICAgbGkuZGF0YXNldC5vcHRpb25JZCA9IG9wdGlvbi5pZFxuICAgICAgICB9XG5cbiAgICAgICAgc3dpdGNoIChvcHRpb24udHlwZSkge1xuICAgICAgICAgIGNhc2UgJ2hlYWRpbmcnOlxuICAgICAgICAgICAgcmVuZGVySGVhZGluZyhvcHRpb24udGl0bGUsIGxpKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdpbnQnOlxuICAgICAgICAgIGNhc2UgJ2Jvb2wnOlxuICAgICAgICAgICAgcmVuZGVyU2luZ2xlT3B0aW9uKG9wdGlvbiwgbGkpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3NlbGVjdC1pbmNsdXNpdmUnOlxuICAgICAgICAgIGNhc2UgJ3NlbGVjdC1leGNsdXNpdmUnOlxuICAgICAgICAgICAgdGhpcy5yZW5kZXJMaXN0T3B0aW9uKG9wdGlvbiwgbGkpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3JhbmdlJzpcbiAgICAgICAgICAgIHJlbmRlclJhbmdlT3B0aW9uKG9wdGlvbiwgbGkpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICAgIGxpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXRlRnJvbVVJKG9wdGlvbilcbiAgICAgICAgICB0aGlzLmRpc2FibGVPckVuYWJsZUFsbCgpIH0pXG4gICAgICAgIG9wdGlvbi5lbGVtZW50ID0gbGlcbiAgICAgIH1cbiAgICB9KVxuICAgIGVsZW1lbnQuYXBwZW5kKGxpc3QpXG5cbiAgICB0aGlzLmRpc2FibGVPckVuYWJsZUFsbCgpXG5cbiAgICByZXR1cm4gbGlzdFxuICB9XG5cbiAgLyogZXNsaW50LWRpc2FibGUgKi9cbiAgcmVuZGVyV2l0aFRlbXBsYXRlIChlbGVtZW50IDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICAvLyBjcmVhdGUgYXBwcm9wcmlhdGUgb2JqZWN0IGZvciBtdXN0YWNoZVxuICAgIGxldCBvcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCBPcHRpb25JPlxuICAgIHRoaXMub3B0aW9uc1NwZWMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgaWYgKGlzUmVhbE9wdGlvbihvcHRpb24pKSB7XG4gICAgICAgIG9wdGlvbnNbb3B0aW9uLmlkXSA9IG9wdGlvblxuICAgICAgfVxuICAgIH0pXG5cbiAgICBjb25zdCBodG1sU3RyaW5nID0gdGhpcy50ZW1wbGF0ZVxuICB9XG4gIC8qIGVzbGludC1lbmFibGUgKi9cblxuICByZW5kZXJMaXN0T3B0aW9uIChvcHRpb246IFNlbGVjdEV4Y2x1c2l2ZU9wdGlvbiB8IFNlbGVjdEluY2x1c2l2ZU9wdGlvbiwgbGkgOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGxpLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgb3B0aW9uLnRpdGxlICsgJzogJylcblxuICAgIGNvbnN0IHN1Ymxpc3QgPSBjcmVhdGVFbGVtKCd1bCcsICdvcHRpb25zLXN1Ymxpc3QnLCBsaSlcbiAgICBpZiAob3B0aW9uLnZlcnRpY2FsKSBzdWJsaXN0LmNsYXNzTGlzdC5hZGQoJ29wdGlvbnMtc3VibGlzdC12ZXJ0aWNhbCcpXG5cbiAgICBvcHRpb24uc2VsZWN0T3B0aW9ucy5mb3JFYWNoKHNlbGVjdE9wdGlvbiA9PiB7XG4gICAgICBjb25zdCBzdWJsaXN0TGkgPSBjcmVhdGVFbGVtKCdsaScsIHVuZGVmaW5lZCwgc3VibGlzdClcbiAgICAgIGNvbnN0IGxhYmVsID0gY3JlYXRlRWxlbSgnbGFiZWwnLCB1bmRlZmluZWQsIHN1Ymxpc3RMaSlcblxuICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpXG4gICAgICBpbnB1dC50eXBlID0gb3B0aW9uLnR5cGUgPT09ICdzZWxlY3QtZXhjbHVzaXZlJyA/ICdyYWRpbycgOiAnY2hlY2tib3gnXG4gICAgICBpbnB1dC5uYW1lID0gdGhpcy5nbG9iYWxJZCArICctJyArIG9wdGlvbi5pZFxuICAgICAgaW5wdXQudmFsdWUgPSBzZWxlY3RPcHRpb24uaWRcblxuICAgICAgaWYgKG9wdGlvbi50eXBlID09PSAnc2VsZWN0LWluY2x1c2l2ZScpIHsgLy8gZGVmYXVsdHMgd29yayBkaWZmZXJlbnQgZm9yIGluY2x1c2l2ZS9leGNsdXNpdmVcbiAgICAgICAgaW5wdXQuY2hlY2tlZCA9IG9wdGlvbi5kZWZhdWx0LmluY2x1ZGVzKHNlbGVjdE9wdGlvbi5pZClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlucHV0LmNoZWNrZWQgPSBvcHRpb24uZGVmYXVsdCA9PT0gc2VsZWN0T3B0aW9uLmlkXG4gICAgICB9XG5cbiAgICAgIGxhYmVsLmFwcGVuZChpbnB1dClcblxuICAgICAgaW5wdXQuY2xhc3NMaXN0LmFkZCgnb3B0aW9uJylcblxuICAgICAgbGFiZWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLCBzZWxlY3RPcHRpb24udGl0bGUpXG4gICAgfSlcbiAgfVxufVxuXG4vKipcbiAqIFJlbmRlcnMgYSBoZWFkaW5nIG9wdGlvblxuICogQHBhcmFtIHtzdHJpbmd9IHRpdGxlIFRoZSB0aXRsZSBvZiB0aGUgaGVhZGluZ1xuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gbGkgVGhlIGVsZW1lbnQgdG8gcmVuZGVyIGludG9cbiAqL1xuZnVuY3Rpb24gcmVuZGVySGVhZGluZyAodGl0bGU6IHN0cmluZywgbGk6IEhUTUxFbGVtZW50KSB7XG4gIGxpLmlubmVySFRNTCA9IHRpdGxlXG4gIGxpLmNsYXNzTGlzdC5hZGQoJ29wdGlvbnMtaGVhZGluZycpXG59XG5cbi8qKlxuICogUmVuZGVycyBzaW5nbGUgcGFyYW1ldGVyXG4gKiBAcGFyYW0geyp9IG9wdGlvblxuICogQHBhcmFtIHsqfSBsaVxuICovXG5mdW5jdGlvbiByZW5kZXJTaW5nbGVPcHRpb24gKG9wdGlvbjogSW50ZWdlck9wdGlvbiB8IEJvb2xlYW5PcHRpb24sIGxpOiBIVE1MRWxlbWVudCkge1xuICBjb25zdCBsYWJlbCA9IGNyZWF0ZUVsZW0oJ2xhYmVsJywgdW5kZWZpbmVkLCBsaSlcblxuICBpZiAoIW9wdGlvbi5zd2FwTGFiZWwgJiYgb3B0aW9uLnRpdGxlICE9PSAnJykgbGFiZWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLCBgJHtvcHRpb24udGl0bGV9OiBgKVxuXG4gIGNvbnN0IGlucHV0IDogSFRNTElucHV0RWxlbWVudCA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgJ29wdGlvbicsIGxhYmVsKSBhcyBIVE1MSW5wdXRFbGVtZW50XG4gIHN3aXRjaCAob3B0aW9uLnR5cGUpIHtcbiAgICBjYXNlICdpbnQnOlxuICAgICAgaW5wdXQudHlwZSA9ICdudW1iZXInXG4gICAgICBpbnB1dC5taW4gPSBvcHRpb24ubWluLnRvU3RyaW5nKClcbiAgICAgIGlucHV0Lm1heCA9IG9wdGlvbi5tYXgudG9TdHJpbmcoKVxuICAgICAgaW5wdXQudmFsdWUgPSBvcHRpb24uZGVmYXVsdC50b1N0cmluZygpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jvb2wnOlxuICAgICAgaW5wdXQudHlwZSA9ICdjaGVja2JveCdcbiAgICAgIGlucHV0LmNoZWNrZWQgPSBvcHRpb24uZGVmYXVsdFxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUeXBlc2NyaXB0IGlzIHByZXR0eSBzdXJlIEkgY2FuXFwndCBnZXQgaGVyZScpXG4gIH1cblxuICBpZiAob3B0aW9uLnN3YXBMYWJlbCAmJiBvcHRpb24udGl0bGUgIT09ICcnKSBsYWJlbC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIGAgJHtvcHRpb24udGl0bGV9YClcbn1cblxuZnVuY3Rpb24gcmVuZGVyUmFuZ2VPcHRpb24gKG9wdGlvbjogUmFuZ2VPcHRpb24sIGxpOiBIVE1MRWxlbWVudCkge1xuICBjb25zdCBsYWJlbCA9IGNyZWF0ZUVsZW0oJ2xhYmVsJywgdW5kZWZpbmVkLCBsaSlcbiAgY29uc3QgaW5wdXRMQiA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgJ29wdGlvbicsIGxhYmVsKSBhcyBIVE1MSW5wdXRFbGVtZW50XG4gIGlucHV0TEIudHlwZSA9ICdudW1iZXInXG4gIGlucHV0TEIubWluID0gb3B0aW9uLm1pbi50b1N0cmluZygpXG4gIGlucHV0TEIubWF4ID0gb3B0aW9uLm1heC50b1N0cmluZygpXG4gIGlucHV0TEIudmFsdWUgPSBvcHRpb24uZGVmYXVsdExCLnRvU3RyaW5nKClcblxuICBsYWJlbC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIGAgJmxlcTsgJHtvcHRpb24udGl0bGV9ICZsZXE7IGApXG5cbiAgY29uc3QgaW5wdXRVQiA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgJ29wdGlvbicsIGxhYmVsKSBhcyBIVE1MSW5wdXRFbGVtZW50XG4gIGlucHV0VUIudHlwZSA9ICdudW1iZXInXG4gIGlucHV0VUIubWluID0gb3B0aW9uLm1pbi50b1N0cmluZygpXG4gIGlucHV0VUIubWF4ID0gb3B0aW9uLm1heC50b1N0cmluZygpXG4gIGlucHV0VUIudmFsdWUgPSBvcHRpb24uZGVmYXVsdFVCLnRvU3RyaW5nKClcbn1cblxuLyoqIERldGVybWluZXMgaWYgYW4gb3B0aW9uIGluIE9wdGlvbnNTcGVjIGlzIGEgcmVhbCBvcHRpb24gYXMgb3Bwb3NlZCB0b1xuICogYSBoZWFkaW5nIG9yIGNvbHVtbiBicmVha1xuICovXG5mdW5jdGlvbiBpc1JlYWxPcHRpb24gKG9wdGlvbiA6IE9wdGlvbnNTcGVjWzBdKSA6IG9wdGlvbiBpcyBSZWFsT3B0aW9uIHtcbiAgcmV0dXJuIChvcHRpb24gYXMgT3B0aW9uSSkuaWQgIT09IHVuZGVmaW5lZFxufVxuXG5jb25zdCBkZW1vU3BlYyA6IE9wdGlvbnNTcGVjID0gW1xuICB7XG4gICAgdGl0bGU6ICdEaWZmaWN1bHR5JyxcbiAgICBpZDogJ2RpZmZpY3VsdHknLFxuICAgIHR5cGU6ICdpbnQnLFxuICAgIG1pbjogMSxcbiAgICBtYXg6IDEwLFxuICAgIGRlZmF1bHQ6IDVcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVHlwZScsXG4gICAgaWQ6ICd0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ1JlY3RhbmdsZScsIGlkOiAncmVjdGFuZ2xlJyB9LFxuICAgICAgeyB0aXRsZTogJ1RyaWFuZ2xlJywgaWQ6ICd0cmlhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdTcXVvdmFsJywgaWQ6ICdzcXVvdmFsJyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiAncmVjdGFuZ2xlJ1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdBIGhlYWRpbmcnLFxuICAgIHR5cGU6ICdoZWFkaW5nJ1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdTaGFwZScsXG4gICAgaWQ6ICdzaGFwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdSZWN0YW5nbGUgc2hhcGUgdGhpbmcnLCBpZDogJ3JlY3RhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdUcmlhbmdsZSBzaGFwZSB0aGluZycsIGlkOiAndHJpYW5nbGUnIH0sXG4gICAgICB7IHRpdGxlOiAnU3F1b3ZhbCBzaGFwZSBsb25nJywgaWQ6ICdzcXVvdmFsJyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiBbJ3JlY3RhbmdsZScsICdzcXVvdmFsJ10sXG4gICAgdmVydGljYWw6IHRydWUgLy8gbGF5b3V0IHZlcnRpY2FsbHksIHJhdGhlciB0aGFuIGhvcml6b250YWxseVxuICB9LFxuICB7XG4gICAgdHlwZTogJ2NvbHVtbi1icmVhaydcbiAgfSxcbiAge1xuICAgIHR5cGU6ICdoZWFkaW5nJyxcbiAgICB0aXRsZTogJ0EgbmV3IGNvbHVtbidcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnRG8gc29tZXRoaW5nJyxcbiAgICBpZDogJ3NvbWV0aGluZycsXG4gICAgdHlwZTogJ2Jvb2wnLFxuICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgc3dhcExhYmVsOiB0cnVlIC8vIHB1dCBjb250cm9sIGJlZm9yZSBsYWJlbFxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdPcHRpb25zIGZvciByZWN0YW5nbGVzJyxcbiAgICBpZDogJ3JlY3RhbmdsZS1vcHRpb25zJyxcbiAgICB0eXBlOiAnc3Vib3B0aW9ucycsXG4gICAgb3B0aW9uc1NwZWM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdNaW5pbXVtIHgnLFxuICAgICAgICBpZDogJ21pblgnLFxuICAgICAgICB0eXBlOiAnaW50JyxcbiAgICAgICAgbWluOiAwLFxuICAgICAgICBtYXg6IDEwLFxuICAgICAgICBkZWZhdWx0OiAyXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0aXRsZTogJ01heGltdW0geCcsXG4gICAgICAgIGlkOiAnbWF4WCcsXG4gICAgICAgIHR5cGU6ICdpbnQnLFxuICAgICAgICBtaW46IDAsXG4gICAgICAgIG1heDogMTAsXG4gICAgICAgIGRlZmF1bHQ6IDRcbiAgICAgIH1cbiAgICBdXG4gIH1cbl1cblxuY29uc3QgZGVtb1RlbXBsYXRlIDogc3RyaW5nID1cbic8bGk+e3tkaWZmaWN1bHR5LnJlbmRlcmVkfX08L2xpPlxcbicgKyAvLyBJbnNlcnRzIGZ1bGwgJ2RpZmZpdWx0eScgb3B0aW9uIGFzIGJlZm9yZVxuJzxsaT48Yj57e3R5cGUudGl0bGV9fTwvYj4gXFxuJyArIC8vIGp1c3QgdGhlIHRpdGxlXG4nPGxpPnt7dHlwZS5pbnB1dH19IFxcbicgKyAvLyB0aGUgaW5wdXQgZWxlbWVudFxuJ3t7dHlwZS5zZWxlY3RPcHRpb25zUmVuZGVyZWRBbGx9fTwvbGk+JyArIC8vIFRoZSBvcHRpb25zLCByZWRlcmVkIHVzdWFsbHlcbic8bGk+PHVsPnt7IyB0eXBlLnNlbGVjdE9wdGlvbnN9fScgKyAvLyBJbmRpdmlkdWFsIHNlbGVjdCBvcHRpb25zLCByZW5kZXJlZFxuICAnPGxpPiB7e3JlbmRlcmVkfX0gPC9saT4nICsgLy8gVGhlIHVzdWFsIHJlbmRlcmVkIG9wdGlvblxuJ3t7LyB0eXBlLnNlbGVjdE9wdGlvbnN9fTwvdWw+J1xuXG5jb25zdCBleGFtcGxlVGVtcGxhdGUgPSAvLyBBbm90aGVyIGV4YW1wbGUsIHdpdGggZmV3ZXIgY29tbWVudHNcbmA8ZGl2IGNsYXNzID0gXCJvcHRpb25zLWNvbHVtblwiPlxuICA8dWwgY2xhc3M9XCJvcHRpb25zLWxpc3RcIj5cbiAgICA8bGk+IDxiPlNvbWUgb3B0aW9ucyA8L2I+IDwvbGk+XG4gICAgPGxpPiB7e2RpZmZpY3VsdHkucmVuZGVyZWR9fSA8L2xpPlxuICAgIDxsaSBzdHlsZT1cImRpc3BsYXk6YmxvY2tcIj4ge3tzaW1wbGUudGl0bGV9fSB7e3NpbXBsZS5pbnB1dH19XG4gICAgICB7eyNzaW1wbGVNaW5YfX1cbmBcbiIsImV4cG9ydCBkZWZhdWx0IGFic3RyYWN0IGNsYXNzIFF1ZXN0aW9uIHtcbiAgRE9NOiBIVE1MRWxlbWVudFxuICBhbnN3ZXJlZDogYm9vbGVhblxuXG4gIGNvbnN0cnVjdG9yICgpIHtcbiAgICB0aGlzLkRPTSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgdGhpcy5ET00uY2xhc3NOYW1lID0gJ3F1ZXN0aW9uLWRpdidcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHtcbiAgICByZXR1cm4gdGhpcy5ET01cbiAgfVxuXG4gIGFic3RyYWN0IHJlbmRlciAoKSA6IHZvaWRcblxuICBzaG93QW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5hbnN3ZXJlZCA9IHRydWVcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxuXG4gIHRvZ2dsZUFuc3dlciAoKSA6IHZvaWQge1xuICAgIGlmICh0aGlzLmFuc3dlcmVkKSB7XG4gICAgICB0aGlzLmhpZGVBbnN3ZXIoKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNob3dBbnN3ZXIoKVxuICAgIH1cbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyAvLyBTaG91bGQgYmUgb3ZlcnJpZGRlblxuICAgIHJldHVybiAnJ1xuICB9XG59XG4iLCJkZWNsYXJlIGNvbnN0IGthdGV4IDoge3JlbmRlcihsYXRleDogc3RyaW5nLCBlbGVtZW50OiBIVE1MRWxlbWVudCwgb3B0aW9ucz86IFJlY29yZDxzdHJpbmcsdW5rbm93bj4pIDogdm9pZH1cbmltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbi9RdWVzdGlvbidcblxuLyoqXG4gKiBBYnN0cmFjdCBjbGFzcyByZXByZXNlbnRpbmcgYSB0ZXh0LWJhc2VkIHF1ZXNpb24uIFN1YmNsYXNzZXMgYXJlIGV4cGVjdGVkIHRvIGVpdGhlciBpbml0aWFsaXNlIHF1ZXN0aW9uTGFUZVhcbiAqIGFuZCBhbnN3ZXJMYVRlWCBpbiB0aGVpciBjb25zdHJ1Y3Rvciwgb3IgdG8gcGFzcyB0aGVzZSBpbnRvIHRoZWlyIGNvbnN0cnVjdG9yIGZyb20gYSBzdGF0aWMgZmFjdG9yeSBtZXRob2RcbiAqL1xuZXhwb3J0IGRlZmF1bHQgYWJzdHJhY3QgY2xhc3MgVGV4dFEgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIHF1ZXN0aW9ucDogSFRNTFBhcmFncmFwaEVsZW1lbnRcbiAgYW5zd2VycDogSFRNTFBhcmFncmFwaEVsZW1lbnRcbiAgcXVlc3Rpb25MYVRlWD86IHN0cmluZyAvLyBtYXkgYmUgaW5pdGlhbGlzZWQgaW4gc3ViY2xhc3MgaW4gY29uc3RydWN0b3IsIG9yIHBhc3NlZCB0byBjb25zdHJ1Y3RvciBmcm9tIHN0YXRpYyBmYWN0b3J5XG4gIGFuc3dlckxhVGVYPzogc3RyaW5nXG4gIGNvbnN0cnVjdG9yIChxdWVzdGlvbkxhVGVYPzogc3RyaW5nLCBhbnN3ZXJMYVRlWD86IHN0cmluZywgb3B0aW9ucz86IHthbnN3ZXJDbGFzcz86IHN0cmluZywgcXVlc3Rpb25DbGFzcz86IHN0cmluZ30pIHtcbiAgICBzdXBlcigpIC8vIGNyZWF0ZXMvc2V0cyB0aGlzLkRPTSwgYW5kIGluaXRpYWxpc2VzIHRoaXMuYW5zd2VyZWRcblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9IHF1ZXN0aW9uTGFUZVggIC8vIE5CIG1heSBiZSB1bmRlZmluZWRcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gYW5zd2VyTGFUZVhcblxuICAgIC8vIE1ha2UgdGhlIERPTSB0cmVlIGZvciB0aGUgZWxlbWVudFxuICAgIHRoaXMucXVlc3Rpb25wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpXG4gICAgdGhpcy5hbnN3ZXJwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpXG5cbiAgICB0aGlzLnF1ZXN0aW9ucC5jbGFzc05hbWUgPSAncXVlc3Rpb24nXG4gICAgaWYgKG9wdGlvbnM/LnF1ZXN0aW9uQ2xhc3MpIHRoaXMucXVlc3Rpb25wLmNsYXNzTGlzdC5hZGQob3B0aW9ucy5xdWVzdGlvbkNsYXNzKVxuICAgIHRoaXMuYW5zd2VycC5jbGFzc05hbWUgPSAnYW5zd2VyJ1xuICAgIGlmIChvcHRpb25zPy5hbnN3ZXJDbGFzcykgdGhpcy5hbnN3ZXJwLmNsYXNzTGlzdC5hZGQob3B0aW9ucy5hbnN3ZXJDbGFzcylcbiAgICB0aGlzLmFuc3dlcnAuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcblxuICAgIHRoaXMuRE9NLmFwcGVuZENoaWxkKHRoaXMucXVlc3Rpb25wKVxuICAgIHRoaXMuRE9NLmFwcGVuZENoaWxkKHRoaXMuYW5zd2VycClcbiAgfVxuXG4gIHJlbmRlciAoKSB7XG4gICAgLy8gdXBkYXRlIHRoZSBET00gaXRlbSB3aXRoIHF1ZXN0aW9uTGFUZVggYW5kIGFuc3dlckxhVGVYXG4gICAgaWYgKCF0aGlzLnF1ZXN0aW9uTGFUZVggfHwgIXRoaXMuYW5zd2VyTGFUZVgpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0F0dGVtcHQgdG8gcmVuZGVyIHRleHQgcXVlc3Rpb24gYmVmb3JlIHF1ZXN0aW9uIG9yIGFuc3dlciBzZXQnKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGthdGV4LnJlbmRlcih0aGlzLnF1ZXN0aW9uTGFUZVgsIHRoaXMucXVlc3Rpb25wLCB7IGRpc3BsYXlNb2RlOiB0cnVlLCBzdHJpY3Q6ICdpZ25vcmUnIH0pXG4gICAga2F0ZXgucmVuZGVyKHRoaXMuYW5zd2VyTGFUZVgsIHRoaXMuYW5zd2VycCwgeyBkaXNwbGF5TW9kZTogdHJ1ZSB9KVxuICB9XG5cbiAgZ2V0RE9NICgpIHtcbiAgICByZXR1cm4gdGhpcy5ET01cbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkge1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIHtcbiAgICB0aGlzLmFuc3dlcnAuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxufVxuIiwiaW1wb3J0IHsgcmFuZEJldHdlZW4sIGdjZCB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcblxuLyogTWFpbiBxdWVzdGlvbiBjbGFzcy4gVGhpcyB3aWxsIGJlIHNwdW4gb2ZmIGludG8gZGlmZmVyZW50IGZpbGUgYW5kIGdlbmVyYWxpc2VkICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBbGdlYnJhaWNGcmFjdGlvblEgZXh0ZW5kcyBUZXh0USB7XG4gIC8vICdleHRlbmRzJyBRdWVzdGlvbiwgYnV0IG5vdGhpbmcgdG8gYWN0dWFsbHkgZXh0ZW5kXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIoKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiAyXG4gICAgfVxuXG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcbiAgICBjb25zdCBkaWZmaWN1bHR5ID0gc2V0dGluZ3MuZGlmZmljdWx0eVxuXG4gICAgLy8gbG9naWMgZm9yIGdlbmVyYXRpbmcgdGhlIHF1ZXN0aW9uIGFuZCBhbnN3ZXIgc3RhcnRzIGhlcmVcbiAgICB2YXIgYSwgYiwgYywgZCwgZSwgZiAvLyAoYXgrYikoZXgrZikvKGN4K2QpKGV4K2YpID0gKHB4XjIrcXgrcikvKHR4XjIrdXgrdilcbiAgICB2YXIgcCwgcSwgciwgdCwgdSwgdlxuICAgIHZhciBtaW5Db2VmZiwgbWF4Q29lZmYsIG1pbkNvbnN0LCBtYXhDb25zdFxuXG4gICAgc3dpdGNoIChkaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIG1pbkNvZWZmID0gMTsgbWF4Q29lZmYgPSAxOyBtaW5Db25zdCA9IDE7IG1heENvbnN0ID0gNlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMTsgbWluQ29uc3QgPSAtNjsgbWF4Q29uc3QgPSA2XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDM6XG4gICAgICAgIG1pbkNvZWZmID0gMTsgbWF4Q29lZmYgPSAzOyBtaW5Db25zdCA9IC01OyBtYXhDb25zdCA9IDVcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNDpcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIG1pbkNvZWZmID0gLTM7IG1heENvZWZmID0gMzsgbWluQ29uc3QgPSAtNTsgbWF4Q29uc3QgPSA1XG4gICAgICAgIGJyZWFrXG4gICAgfVxuXG4gICAgLy8gUGljayBzb21lIGNvZWZmaWNpZW50c1xuICAgIHdoaWxlIChcbiAgICAgICgoIWEgJiYgIWIpIHx8ICghYyAmJiAhZCkgfHwgKCFlICYmICFmKSkgfHwgLy8gcmV0cnkgaWYgYW55IGV4cHJlc3Npb24gaXMgMFxuICAgICAgY2FuU2ltcGxpZnkoYSwgYiwgYywgZCkgLy8gcmV0cnkgaWYgdGhlcmUncyBhIGNvbW1vbiBudW1lcmljYWwgZmFjdG9yXG4gICAgKSB7XG4gICAgICBhID0gcmFuZEJldHdlZW4obWluQ29lZmYsIG1heENvZWZmKVxuICAgICAgYyA9IHJhbmRCZXR3ZWVuKG1pbkNvZWZmLCBtYXhDb2VmZilcbiAgICAgIGUgPSByYW5kQmV0d2VlbihtaW5Db2VmZiwgbWF4Q29lZmYpXG4gICAgICBiID0gcmFuZEJldHdlZW4obWluQ29uc3QsIG1heENvbnN0KVxuICAgICAgZCA9IHJhbmRCZXR3ZWVuKG1pbkNvbnN0LCBtYXhDb25zdClcbiAgICAgIGYgPSByYW5kQmV0d2VlbihtaW5Db25zdCwgbWF4Q29uc3QpXG4gICAgfVxuXG4gICAgLy8gaWYgdGhlIGRlbm9taW5hdG9yIGlzIG5lZ2F0aXZlIGZvciBlYWNoIHRlcm0sIHRoZW4gbWFrZSB0aGUgbnVtZXJhdG9yIG5lZ2F0aXZlIGluc3RlYWRcbiAgICBpZiAoYyA8PSAwICYmIGQgPD0gMCkge1xuICAgICAgYyA9IC1jXG4gICAgICBkID0gLWRcbiAgICAgIGEgPSAtYVxuICAgICAgYiA9IC1iXG4gICAgfVxuXG4gICAgcCA9IGEgKiBlOyBxID0gYSAqIGYgKyBiICogZTsgciA9IGIgKiBmXG4gICAgdCA9IGMgKiBlOyB1ID0gYyAqIGYgKyBkICogZTsgdiA9IGQgKiBmXG5cbiAgICAvLyBOb3cgcHV0IHRoZSBxdWVzdGlvbiBhbmQgYW5zd2VyIGluIGEgbmljZSBmb3JtYXQgaW50byBxdWVzdGlvbkxhVGVYIGFuZCBhbnN3ZXJMYVRlWFxuICAgIGNvbnN0IHF1ZXN0aW9uID0gYFxcXFxmcmFjeyR7cXVhZHJhdGljU3RyaW5nKHAsIHEsIHIpfX17JHtxdWFkcmF0aWNTdHJpbmcodCwgdSwgdil9fWBcbiAgICBpZiAoc2V0dGluZ3MudXNlQ29tbWFuZFdvcmQpIHtcbiAgICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICdcXFxcdGV4dHtTaW1wbGlmeX0gJyArIHF1ZXN0aW9uXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9IHF1ZXN0aW9uXG4gICAgfVxuICAgIHRoaXMuYW5zd2VyTGFUZVggPVxuICAgICAgKGMgPT09IDAgJiYgZCA9PT0gMSkgPyBxdWFkcmF0aWNTdHJpbmcoMCwgYSwgYilcbiAgICAgICAgOiBgXFxcXGZyYWN7JHtxdWFkcmF0aWNTdHJpbmcoMCwgYSwgYil9fXske3F1YWRyYXRpY1N0cmluZygwLCBjLCBkKX19YFxuXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICc9ICcgKyB0aGlzLmFuc3dlckxhVGVYXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ1NpbXBsaWZ5J1xuICB9XG59XG5cbi8qIFV0aWxpdHkgZnVuY3Rpb25zXG4gKiBBdCBzb21lIHBvaW50LCBJJ2xsIG1vdmUgc29tZSBvZiB0aGVzZSBpbnRvIGEgZ2VuZXJhbCB1dGlsaXRpZXMgbW9kdWxlXG4gKiBidXQgdGhpcyB3aWxsIGRvIGZvciBub3dcbiAqL1xuXG4vLyBUT0RPIEkgaGF2ZSBxdWFkcmF0aWNTdHJpbmcgaGVyZSBhbmQgYWxzbyBhIFBvbHlub21pYWwgY2xhc3MuIFdoYXQgaXMgYmVpbmcgcmVwbGljYXRlZD/Cp1xuZnVuY3Rpb24gcXVhZHJhdGljU3RyaW5nIChhLCBiLCBjKSB7XG4gIGlmIChhID09PSAwICYmIGIgPT09IDAgJiYgYyA9PT0gMCkgcmV0dXJuICcwJ1xuXG4gIHZhciB4MnN0cmluZyA9XG4gICAgYSA9PT0gMCA/ICcnXG4gICAgICA6IGEgPT09IDEgPyAneF4yJ1xuICAgICAgICA6IGEgPT09IC0xID8gJy14XjInXG4gICAgICAgICAgOiBhICsgJ3heMidcblxuICB2YXIgeHNpZ24gPVxuICAgIGIgPCAwID8gJy0nXG4gICAgICA6IChhID09PSAwIHx8IGIgPT09IDApID8gJydcbiAgICAgICAgOiAnKydcblxuICB2YXIgeHN0cmluZyA9XG4gICAgYiA9PT0gMCA/ICcnXG4gICAgICA6IChiID09PSAxIHx8IGIgPT09IC0xKSA/ICd4J1xuICAgICAgICA6IE1hdGguYWJzKGIpICsgJ3gnXG5cbiAgdmFyIGNvbnN0c2lnbiA9XG4gICAgYyA8IDAgPyAnLSdcbiAgICAgIDogKChhID09PSAwICYmIGIgPT09IDApIHx8IGMgPT09IDApID8gJydcbiAgICAgICAgOiAnKydcblxuICB2YXIgY29uc3RzdHJpbmcgPVxuICAgIGMgPT09IDAgPyAnJyA6IE1hdGguYWJzKGMpXG5cbiAgcmV0dXJuIHgyc3RyaW5nICsgeHNpZ24gKyB4c3RyaW5nICsgY29uc3RzaWduICsgY29uc3RzdHJpbmdcbn1cblxuZnVuY3Rpb24gY2FuU2ltcGxpZnkgKGExLCBiMSwgYTIsIGIyKSB7XG4gIC8vIGNhbiAoYTF4K2IxKS8oYTJ4K2IyKSBiZSBzaW1wbGlmaWVkP1xuICAvL1xuICAvLyBGaXJzdCwgdGFrZSBvdXQgZ2NkLCBhbmQgd3JpdGUgYXMgYzEoYTF4K2IxKSBldGNcblxuICB2YXIgYzEgPSBnY2QoYTEsIGIxKVxuICBhMSA9IGExIC8gYzFcbiAgYjEgPSBiMSAvIGMxXG5cbiAgdmFyIGMyID0gZ2NkKGEyLCBiMilcbiAgYTIgPSBhMiAvIGMyXG4gIGIyID0gYjIgLyBjMlxuXG4gIHZhciByZXN1bHQgPSBmYWxzZVxuXG4gIGlmIChnY2QoYzEsIGMyKSA+IDEgfHwgKGExID09PSBhMiAmJiBiMSA9PT0gYjIpKSB7XG4gICAgcmVzdWx0ID0gdHJ1ZVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdFxufVxuIiwiaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICd1dGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEludGVnZXJBZGRRIGV4dGVuZHMgVGV4dFEge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKClcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYSdcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIHRoaXMubGFiZWwgPSBzZXR0aW5ncy5sYWJlbFxuXG4gICAgLy8gVGhpcyBpcyBqdXN0IGEgZGVtbyBxdWVzdGlvbiB0eXBlIGZvciBub3csIHNvIG5vdCBwcm9jZXNzaW5nIGRpZmZpY3VsdHlcbiAgICBjb25zdCBhID0gcmFuZEJldHdlZW4oMTAsIDEwMDApXG4gICAgY29uc3QgYiA9IHJhbmRCZXR3ZWVuKDEwLCAxMDAwKVxuICAgIGNvbnN0IHN1bSA9IGEgKyBiXG5cbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSBhICsgJyArICcgKyBiXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICc9ICcgKyBzdW1cblxuICAgIHRoaXMucmVuZGVyKClcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRXZhbHVhdGUnXG4gIH1cbn1cbiIsImltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbi9RdWVzdGlvbidcbmltcG9ydCB7IGNyZWF0ZUVsZW0sIHJlcGVsRWxlbWVudHMgfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi9WaWV3T3B0aW9ucydcbmltcG9ydCBPcHRpb25zIGZyb20gJ09wdGlvbnMnXG5pbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuZGVjbGFyZSBjb25zdCBrYXRleCA6IHtyZW5kZXIgOiAoc3RyaW5nOiBzdHJpbmcsIGVsZW1lbnQ6IEhUTUxFbGVtZW50KSA9PiB2b2lkfVxuXG4vKiBHcmFwaGljUURhdGEgY2FuIGFsbCBiZSB2ZXJ5IGRpZmZlcmVudCwgc28gaW50ZXJmYWNlIGlzIGVtcHR5XG4gKiBIZXJlIGZvciBjb2RlIGRvY3VtZW50YXRpb24gcmF0aGVyIHRoYW4gdHlwZSBzYWZldHkgKHdoaWNoIGlzbid0IHByb3ZpZGVkKSAqL1xuXG4vKiBlc2xpbnQtZGlzYWJsZSAqL1xuZXhwb3J0IGludGVyZmFjZSBHcmFwaGljUURhdGEge1xufVxuLyogZXNsaW50LWVuYWJsZSAqL1xuXG4vKiBOb3Qgd29ydGggdGhlIGhhc3NseSB0cnlpbmcgdG8gZ2V0IGludGVyZmFjZXMgZm9yIHN0YXRpYyBtZXRob2RzXG4gKlxuICogZXhwb3J0IGludGVyZmFjZSBHcmFwaGljUURhdGFDb25zdHJ1Y3RvciB7XG4gKiAgIG5ldyguLi5hcmdzIDogdW5rbm93bltdKTogR3JhcGhpY1FEYXRhXG4gKiAgIHJhbmRvbShvcHRpb25zOiB1bmtub3duKSA6IEdyYXBoaWNRRGF0YVxuICogfVxuKi9cblxuZXhwb3J0IGludGVyZmFjZSBMYWJlbCB7XG4gIHBvczogUG9pbnQsXG4gIHRleHRxOiBzdHJpbmcsXG4gIHRleHRhOiBzdHJpbmcsXG4gIHN0eWxlcTogc3RyaW5nLFxuICBzdHlsZWE6IHN0cmluZyxcbiAgdGV4dDogc3RyaW5nLFxuICBzdHlsZTogc3RyaW5nXG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBHcmFwaGljUVZpZXcge1xuICBET006IEhUTUxFbGVtZW50XG4gIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnRcbiAgd2lkdGg6IG51bWJlclxuICBoZWlnaHQ6IG51bWJlclxuICBkYXRhOiBHcmFwaGljUURhdGFcbiAgbGFiZWxzOiBMYWJlbFtdXG4gIHJvdGF0aW9uPzogbnVtYmVyXG5cbiAgY29uc3RydWN0b3IgKGRhdGEgOiBHcmFwaGljUURhdGEsIHZpZXdPcHRpb25zIDogVmlld09wdGlvbnMpIHtcbiAgICB2aWV3T3B0aW9ucy53aWR0aCA9IHZpZXdPcHRpb25zLndpZHRoID8/IDMwMFxuICAgIHZpZXdPcHRpb25zLmhlaWdodCA9IHZpZXdPcHRpb25zLmhlaWdodCA/PyAzMDBcblxuICAgIHRoaXMud2lkdGggPSB2aWV3T3B0aW9ucy53aWR0aFxuICAgIHRoaXMuaGVpZ2h0ID0gdmlld09wdGlvbnMuaGVpZ2h0IC8vIG9ubHkgdGhpbmdzIEkgbmVlZCBmcm9tIHRoZSBvcHRpb25zLCBnZW5lcmFsbHk/XG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIHRoaXMucm90YXRpb24gPSB2aWV3T3B0aW9ucy5yb3RhdGlvblxuXG4gICAgdGhpcy5sYWJlbHMgPSBbXSAvLyBsYWJlbHMgb24gZGlhZ3JhbVxuXG4gICAgLy8gRE9NIGVsZW1lbnRzXG4gICAgdGhpcy5ET00gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tZGl2JylcbiAgICB0aGlzLmNhbnZhcyA9IGNyZWF0ZUVsZW0oJ2NhbnZhcycsICdxdWVzdGlvbi1jYW52YXMnLCB0aGlzLkRPTSkgYXMgSFRNTENhbnZhc0VsZW1lbnRcbiAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMud2lkdGhcbiAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodFxuICB9XG5cbiAgZ2V0RE9NICgpIDogSFRNTEVsZW1lbnQge1xuICAgIHJldHVybiB0aGlzLkRPTVxuICB9XG5cbiAgYWJzdHJhY3QgcmVuZGVyICgpIDogdm9pZFxuXG4gIHJlbmRlckxhYmVscyAobnVkZ2U/IDogYm9vbGVhbiwgcmVwZWw6IGJvb2xlYW4gPSB0cnVlKSA6IHZvaWQge1xuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuRE9NXG5cbiAgICAvLyByZW1vdmUgYW55IGV4aXN0aW5nIGxhYmVsc1xuICAgIGNvbnN0IG9sZExhYmVscyA9IGNvbnRhaW5lci5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdsYWJlbCcpXG4gICAgd2hpbGUgKG9sZExhYmVscy5sZW5ndGggPiAwKSB7XG4gICAgICBvbGRMYWJlbHNbMF0ucmVtb3ZlKClcbiAgICB9XG5cbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgY29uc3QgbGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgICAgY29uc3QgaW5uZXJsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgICBsYWJlbC5jbGFzc0xpc3QuYWRkKCdsYWJlbCcpXG4gICAgICBsYWJlbC5jbGFzc05hbWUgKz0gJyAnICsgbC5zdHlsZSAvLyB1c2luZyBjbGFzc05hbWUgb3ZlciBjbGFzc0xpc3Qgc2luY2UgbC5zdHlsZSBpcyBzcGFjZS1kZWxpbWl0ZWQgbGlzdCBvZiBjbGFzc2VzXG4gICAgICBsYWJlbC5zdHlsZS5sZWZ0ID0gbC5wb3MueCArICdweCdcbiAgICAgIGxhYmVsLnN0eWxlLnRvcCA9IGwucG9zLnkgKyAncHgnXG5cbiAgICAgIGthdGV4LnJlbmRlcihsLnRleHQsIGlubmVybGFiZWwpXG4gICAgICBsYWJlbC5hcHBlbmRDaGlsZChpbm5lcmxhYmVsKVxuICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGxhYmVsKVxuXG4gICAgICAvLyByZW1vdmUgc3BhY2UgaWYgdGhlIGlubmVyIGxhYmVsIGlzIHRvbyBiaWdcbiAgICAgIGlmIChpbm5lcmxhYmVsLm9mZnNldFdpZHRoIC8gaW5uZXJsYWJlbC5vZmZzZXRIZWlnaHQgPiAyKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coYHJlbW92ZWQgc3BhY2UgaW4gJHtsLnRleHR9YClcbiAgICAgICAgY29uc3QgbmV3bGFiZWx0ZXh0ID0gbC50ZXh0LnJlcGxhY2UoL1xcKy8sICdcXFxcIStcXFxcIScpLnJlcGxhY2UoLy0vLCAnXFxcXCEtXFxcXCEnKVxuICAgICAgICBrYXRleC5yZW5kZXIobmV3bGFiZWx0ZXh0LCBpbm5lcmxhYmVsKVxuICAgICAgfVxuXG4gICAgICAvLyBJIGRvbid0IHVuZGVyc3RhbmQgdGhpcyBhZGp1c3RtZW50LiBJIHRoaW5rIGl0IG1pZ2h0IGJlIG5lZWRlZCBpbiBhcml0aG1hZ29ucywgYnV0IGl0IG1ha2VzXG4gICAgICAvLyBvdGhlcnMgZ28gZnVubnkuXG5cbiAgICAgIGlmIChudWRnZSkge1xuICAgICAgICBjb25zdCBsd2lkdGggPSBsYWJlbC5vZmZzZXRXaWR0aFxuICAgICAgICBpZiAobC5wb3MueCA8IHRoaXMuY2FudmFzLndpZHRoIC8gMiAtIDUgJiYgbC5wb3MueCArIGx3aWR0aCAvIDIgPiB0aGlzLmNhbnZhcy53aWR0aCAvIDIpIHtcbiAgICAgICAgICBsYWJlbC5zdHlsZS5sZWZ0ID0gKHRoaXMuY2FudmFzLndpZHRoIC8gMiAtIGx3aWR0aCAtIDMpICsgJ3B4J1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBudWRnZWQgJyR7bC50ZXh0fSdgKVxuICAgICAgICB9XG4gICAgICAgIGlmIChsLnBvcy54ID4gdGhpcy5jYW52YXMud2lkdGggLyAyICsgNSAmJiBsLnBvcy54IC0gbHdpZHRoIC8gMiA8IHRoaXMuY2FudmFzLndpZHRoIC8gMikge1xuICAgICAgICAgIGxhYmVsLnN0eWxlLmxlZnQgPSAodGhpcy5jYW52YXMud2lkdGggLyAyICsgMykgKyAncHgnXG4gICAgICAgICAgY29uc29sZS5sb2coYG51ZGdlZCAnJHtsLnRleHR9J2ApXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy9yZXBlbCBpZiBnaXZlblxuICAgIGlmIChyZXBlbCkge1xuICAgIGNvbnN0IGxhYmVsRWxlbWVudHMgPSBbLi4udGhpcy5ET00uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnbGFiZWwnKV0gYXMgSFRNTEVsZW1lbnRbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGFiZWxFbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgZm9yIChsZXQgaiA9IGkrMTsgaiA8IGxhYmVsRWxlbWVudHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgcmVwZWxFbGVtZW50cyhsYWJlbEVsZW1lbnRzW2ldLGxhYmVsRWxlbWVudHNbal0pXG4gICAgICB9XG4gICAgfVxuICAgIH1cbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0YVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVhXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIC8vIFBvaW50IHRyYW5mb3JtYXRpb25zIG9mIGFsbCBwb2ludHNcblxuICBnZXQgYWxscG9pbnRzICgpIDogUG9pbnRbXSB7XG4gICAgcmV0dXJuIFtdXG4gIH1cblxuICBzY2FsZSAoc2YgOiBudW1iZXIpIDogdm9pZCB7XG4gICAgdGhpcy5hbGxwb2ludHMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgcC5zY2FsZShzZilcbiAgICB9KVxuICB9XG5cbiAgcm90YXRlIChhbmdsZSA6IG51bWJlcikgOiBudW1iZXIge1xuICAgIHRoaXMuYWxscG9pbnRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHAucm90YXRlKGFuZ2xlKVxuICAgIH0pXG4gICAgcmV0dXJuIGFuZ2xlXG4gIH1cblxuICB0cmFuc2xhdGUgKHggOiBudW1iZXIsIHkgOiBudW1iZXIpIDogdm9pZCB7XG4gICAgdGhpcy5hbGxwb2ludHMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgcC50cmFuc2xhdGUoeCwgeSlcbiAgICB9KVxuICB9XG5cbiAgcmFuZG9tUm90YXRlICgpIDogbnVtYmVyIHtcbiAgICBjb25zdCBhbmdsZSA9IDIgKiBNYXRoLlBJICogTWF0aC5yYW5kb20oKVxuICAgIHRoaXMucm90YXRlKGFuZ2xlKVxuICAgIHJldHVybiBhbmdsZVxuICB9XG5cbiAgLyoqXG4gICAqIFNjYWxlcyBhbGwgdGhlIHBvaW50cyB0byB3aXRoaW4gYSBnaXZlbiB3aWR0aCBhbmQgaGVpZ2h0LCBjZW50ZXJpbmcgdGhlIHJlc3VsdC4gUmV0dXJucyB0aGUgc2NhbGUgZmFjdG9yXG4gICAqIEBwYXJhbSB3aWR0aCBUaGUgd2lkdGggb2YgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSB0byBzY2FsZSB0b1xuICAgKiBAcGFyYW0gaGVpZ2h0IFRoZSBoZWlnaHQgb2YgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSB0byBzY2FsZSB0b1xuICAgKiBAcGFyYW0gbWFyZ2luIE1hcmdpbiB0byBsZWF2ZSBvdXRzaWRlIHRoZSByZWN0YW5nbGVcbiAgICogQHJldHVybnNcbiAgICovXG4gIHNjYWxlVG9GaXQgKHdpZHRoIDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgbWFyZ2luIDogbnVtYmVyKSA6IG51bWJlciB7XG4gICAgbGV0IHRvcExlZnQgOiBQb2ludCA9IFBvaW50Lm1pbih0aGlzLmFsbHBvaW50cylcbiAgICBsZXQgYm90dG9tUmlnaHQgOiBQb2ludCA9IFBvaW50Lm1heCh0aGlzLmFsbHBvaW50cylcbiAgICBjb25zdCB0b3RhbFdpZHRoIDogbnVtYmVyID0gYm90dG9tUmlnaHQueCAtIHRvcExlZnQueFxuICAgIGNvbnN0IHRvdGFsSGVpZ2h0IDogbnVtYmVyID0gYm90dG9tUmlnaHQueSAtIHRvcExlZnQueVxuICAgIGNvbnN0IHNmID0gTWF0aC5taW4oKHdpZHRoIC0gbWFyZ2luKSAvIHRvdGFsV2lkdGgsIChoZWlnaHQgLSBtYXJnaW4pIC8gdG90YWxIZWlnaHQpXG4gICAgdGhpcy5zY2FsZShzZilcblxuICAgIC8vIGNlbnRyZVxuICAgIHRvcExlZnQgPSBQb2ludC5taW4odGhpcy5hbGxwb2ludHMpXG4gICAgYm90dG9tUmlnaHQgPSBQb2ludC5tYXgodGhpcy5hbGxwb2ludHMpXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbih0b3BMZWZ0LCBib3R0b21SaWdodClcbiAgICB0aGlzLnRyYW5zbGF0ZSh3aWR0aCAvIDIgLSBjZW50ZXIueCwgaGVpZ2h0IC8gMiAtIGNlbnRlci55KSAvLyBjZW50cmVcblxuICAgIHJldHVybiBzZlxuICB9XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBHcmFwaGljUSBleHRlbmRzIFF1ZXN0aW9uIHtcbiAgZGF0YTogR3JhcGhpY1FEYXRhXG4gIHZpZXc6IEdyYXBoaWNRVmlld1xuXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBHcmFwaGljUURhdGEsIHZpZXc6IEdyYXBoaWNRVmlldykgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgIHN1cGVyKCkgLy8gdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIHRoaXMudmlldyA9IHZpZXdcbiAgICB0aGlzLkRPTSA9IHRoaXMudmlldy5ET01cblxuICAgIC8qIFRoZXNlIGFyZSBndWFyYW50ZWVkIHRvIGJlIG92ZXJyaWRkZW4sIHNvIG5vIHBvaW50IGluaXRpYWxpemluZyBoZXJlXG4gICAgICpcbiAgICAgKiAgdGhpcy5kYXRhID0gbmV3IEdyYXBoaWNRRGF0YShvcHRpb25zKVxuICAgICAqICB0aGlzLnZpZXcgPSBuZXcgR3JhcGhpY1FWaWV3KHRoaXMuZGF0YSwgb3B0aW9ucylcbiAgICAgKlxuICAgICAqL1xuICB9XG5cbiAgLyogTmVlZCB0byByZWZhY3RvciBzdWJjbGFzc2VzIHRvIGRvIHRoaXM6XG4gICAqIGNvbnN0cnVjdG9yIChkYXRhLCB2aWV3KSB7XG4gICAqICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICogICAgdGhpcy52aWV3ID0gdmlld1xuICAgKiB9XG4gICAqXG4gICAqIHN0YXRpYyByYW5kb20ob3B0aW9ucykge1xuICAgKiAgLy8gYW4gYXR0ZW1wdCBhdCBoYXZpbmcgYWJzdHJhY3Qgc3RhdGljIG1ldGhvZHMsIGFsYmVpdCBydW50aW1lIGVycm9yXG4gICAqICB0aHJvdyBuZXcgRXJyb3IoXCJgcmFuZG9tKClgIG11c3QgYmUgb3ZlcnJpZGRlbiBpbiBzdWJjbGFzcyBcIiArIHRoaXMubmFtZSlcbiAgICogfVxuICAgKlxuICAgKiB0eXBpY2FsIGltcGxlbWVudGF0aW9uOlxuICAgKiBzdGF0aWMgcmFuZG9tKG9wdGlvbnMpIHtcbiAgICogIGNvbnN0IGRhdGEgPSBuZXcgRGVyaXZlZFFEYXRhKG9wdGlvbnMpXG4gICAqICBjb25zdCB2aWV3ID0gbmV3IERlcml2ZWRRVmlldyhvcHRpb25zKVxuICAgKiAgcmV0dXJuIG5ldyBEZXJpdmVkUURhdGEoZGF0YSx2aWV3KVxuICAgKiB9XG4gICAqXG4gICAqL1xuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHsgcmV0dXJuIHRoaXMudmlldy5nZXRET00oKSB9XG5cbiAgcmVuZGVyICgpIDogdm9pZCB7IHRoaXMudmlldy5yZW5kZXIoKSB9XG5cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQge1xuICAgIHN1cGVyLnNob3dBbnN3ZXIoKVxuICAgIHRoaXMudmlldy5zaG93QW5zd2VyKClcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICBzdXBlci5oaWRlQW5zd2VyKClcbiAgICB0aGlzLnZpZXcuaGlkZUFuc3dlcigpXG4gIH1cbn1cbiIsIi8qKlxuICogQGxpY2Vuc2UgRnJhY3Rpb24uanMgdjQuMC4xMiAwOS8wOS8yMDE1XG4gKiBodHRwOi8vd3d3Lnhhcmcub3JnLzIwMTQvMDMvcmF0aW9uYWwtbnVtYmVycy1pbi1qYXZhc2NyaXB0L1xuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSwgUm9iZXJ0IEVpc2VsZSAocm9iZXJ0QHhhcmcub3JnKVxuICogRHVhbCBsaWNlbnNlZCB1bmRlciB0aGUgTUlUIG9yIEdQTCBWZXJzaW9uIDIgbGljZW5zZXMuXG4gKiovXG5cblxuLyoqXG4gKlxuICogVGhpcyBjbGFzcyBvZmZlcnMgdGhlIHBvc3NpYmlsaXR5IHRvIGNhbGN1bGF0ZSBmcmFjdGlvbnMuXG4gKiBZb3UgY2FuIHBhc3MgYSBmcmFjdGlvbiBpbiBkaWZmZXJlbnQgZm9ybWF0cy4gRWl0aGVyIGFzIGFycmF5LCBhcyBkb3VibGUsIGFzIHN0cmluZyBvciBhcyBhbiBpbnRlZ2VyLlxuICpcbiAqIEFycmF5L09iamVjdCBmb3JtXG4gKiBbIDAgPT4gPG5vbWluYXRvcj4sIDEgPT4gPGRlbm9taW5hdG9yPiBdXG4gKiBbIG4gPT4gPG5vbWluYXRvcj4sIGQgPT4gPGRlbm9taW5hdG9yPiBdXG4gKlxuICogSW50ZWdlciBmb3JtXG4gKiAtIFNpbmdsZSBpbnRlZ2VyIHZhbHVlXG4gKlxuICogRG91YmxlIGZvcm1cbiAqIC0gU2luZ2xlIGRvdWJsZSB2YWx1ZVxuICpcbiAqIFN0cmluZyBmb3JtXG4gKiAxMjMuNDU2IC0gYSBzaW1wbGUgZG91YmxlXG4gKiAxMjMvNDU2IC0gYSBzdHJpbmcgZnJhY3Rpb25cbiAqIDEyMy4nNDU2JyAtIGEgZG91YmxlIHdpdGggcmVwZWF0aW5nIGRlY2ltYWwgcGxhY2VzXG4gKiAxMjMuKDQ1NikgLSBzeW5vbnltXG4gKiAxMjMuNDUnNicgLSBhIGRvdWJsZSB3aXRoIHJlcGVhdGluZyBsYXN0IHBsYWNlXG4gKiAxMjMuNDUoNikgLSBzeW5vbnltXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiB2YXIgZiA9IG5ldyBGcmFjdGlvbihcIjkuNCczMSdcIik7XG4gKiBmLm11bChbLTQsIDNdKS5kaXYoNC45KTtcbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QpIHtcblxuICBcInVzZSBzdHJpY3RcIjtcblxuICAvLyBNYXhpbXVtIHNlYXJjaCBkZXB0aCBmb3IgY3ljbGljIHJhdGlvbmFsIG51bWJlcnMuIDIwMDAgc2hvdWxkIGJlIG1vcmUgdGhhbiBlbm91Z2guXG4gIC8vIEV4YW1wbGU6IDEvNyA9IDAuKDE0Mjg1NykgaGFzIDYgcmVwZWF0aW5nIGRlY2ltYWwgcGxhY2VzLlxuICAvLyBJZiBNQVhfQ1lDTEVfTEVOIGdldHMgcmVkdWNlZCwgbG9uZyBjeWNsZXMgd2lsbCBub3QgYmUgZGV0ZWN0ZWQgYW5kIHRvU3RyaW5nKCkgb25seSBnZXRzIHRoZSBmaXJzdCAxMCBkaWdpdHNcbiAgdmFyIE1BWF9DWUNMRV9MRU4gPSAyMDAwO1xuXG4gIC8vIFBhcnNlZCBkYXRhIHRvIGF2b2lkIGNhbGxpbmcgXCJuZXdcIiBhbGwgdGhlIHRpbWVcbiAgdmFyIFAgPSB7XG4gICAgXCJzXCI6IDEsXG4gICAgXCJuXCI6IDAsXG4gICAgXCJkXCI6IDFcbiAgfTtcblxuICBmdW5jdGlvbiBjcmVhdGVFcnJvcihuYW1lKSB7XG5cbiAgICBmdW5jdGlvbiBlcnJvckNvbnN0cnVjdG9yKCkge1xuICAgICAgdmFyIHRlbXAgPSBFcnJvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgdGVtcFsnbmFtZSddID0gdGhpc1snbmFtZSddID0gbmFtZTtcbiAgICAgIHRoaXNbJ3N0YWNrJ10gPSB0ZW1wWydzdGFjayddO1xuICAgICAgdGhpc1snbWVzc2FnZSddID0gdGVtcFsnbWVzc2FnZSddO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEVycm9yIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBJbnRlcm1lZGlhdGVJbmhlcml0b3IoKSB7fVxuICAgIEludGVybWVkaWF0ZUluaGVyaXRvci5wcm90b3R5cGUgPSBFcnJvci5wcm90b3R5cGU7XG4gICAgZXJyb3JDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBuZXcgSW50ZXJtZWRpYXRlSW5oZXJpdG9yKCk7XG5cbiAgICByZXR1cm4gZXJyb3JDb25zdHJ1Y3RvcjtcbiAgfVxuXG4gIHZhciBEaXZpc2lvbkJ5WmVybyA9IEZyYWN0aW9uWydEaXZpc2lvbkJ5WmVybyddID0gY3JlYXRlRXJyb3IoJ0RpdmlzaW9uQnlaZXJvJyk7XG4gIHZhciBJbnZhbGlkUGFyYW1ldGVyID0gRnJhY3Rpb25bJ0ludmFsaWRQYXJhbWV0ZXInXSA9IGNyZWF0ZUVycm9yKCdJbnZhbGlkUGFyYW1ldGVyJyk7XG5cbiAgZnVuY3Rpb24gYXNzaWduKG4sIHMpIHtcblxuICAgIGlmIChpc05hTihuID0gcGFyc2VJbnQobiwgMTApKSkge1xuICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKTtcbiAgICB9XG4gICAgcmV0dXJuIG4gKiBzO1xuICB9XG5cbiAgZnVuY3Rpb24gdGhyb3dJbnZhbGlkUGFyYW0oKSB7XG4gICAgdGhyb3cgbmV3IEludmFsaWRQYXJhbWV0ZXIoKTtcbiAgfVxuXG4gIHZhciBwYXJzZSA9IGZ1bmN0aW9uKHAxLCBwMikge1xuXG4gICAgdmFyIG4gPSAwLCBkID0gMSwgcyA9IDE7XG4gICAgdmFyIHYgPSAwLCB3ID0gMCwgeCA9IDAsIHkgPSAxLCB6ID0gMTtcblxuICAgIHZhciBBID0gMCwgQiA9IDE7XG4gICAgdmFyIEMgPSAxLCBEID0gMTtcblxuICAgIHZhciBOID0gMTAwMDAwMDA7XG4gICAgdmFyIE07XG5cbiAgICBpZiAocDEgPT09IHVuZGVmaW5lZCB8fCBwMSA9PT0gbnVsbCkge1xuICAgICAgLyogdm9pZCAqL1xuICAgIH0gZWxzZSBpZiAocDIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgbiA9IHAxO1xuICAgICAgZCA9IHAyO1xuICAgICAgcyA9IG4gKiBkO1xuICAgIH0gZWxzZVxuICAgICAgc3dpdGNoICh0eXBlb2YgcDEpIHtcblxuICAgICAgICBjYXNlIFwib2JqZWN0XCI6XG4gICAgICAgIHtcbiAgICAgICAgICBpZiAoXCJkXCIgaW4gcDEgJiYgXCJuXCIgaW4gcDEpIHtcbiAgICAgICAgICAgIG4gPSBwMVtcIm5cIl07XG4gICAgICAgICAgICBkID0gcDFbXCJkXCJdO1xuICAgICAgICAgICAgaWYgKFwic1wiIGluIHAxKVxuICAgICAgICAgICAgICBuICo9IHAxW1wic1wiXTtcbiAgICAgICAgICB9IGVsc2UgaWYgKDAgaW4gcDEpIHtcbiAgICAgICAgICAgIG4gPSBwMVswXTtcbiAgICAgICAgICAgIGlmICgxIGluIHAxKVxuICAgICAgICAgICAgICBkID0gcDFbMV07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93SW52YWxpZFBhcmFtKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHMgPSBuICogZDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFwibnVtYmVyXCI6XG4gICAgICAgIHtcbiAgICAgICAgICBpZiAocDEgPCAwKSB7XG4gICAgICAgICAgICBzID0gcDE7XG4gICAgICAgICAgICBwMSA9IC1wMTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAocDEgJSAxID09PSAwKSB7XG4gICAgICAgICAgICBuID0gcDE7XG4gICAgICAgICAgfSBlbHNlIGlmIChwMSA+IDApIHsgLy8gY2hlY2sgZm9yICE9IDAsIHNjYWxlIHdvdWxkIGJlY29tZSBOYU4gKGxvZygwKSksIHdoaWNoIGNvbnZlcmdlcyByZWFsbHkgc2xvd1xuXG4gICAgICAgICAgICBpZiAocDEgPj0gMSkge1xuICAgICAgICAgICAgICB6ID0gTWF0aC5wb3coMTAsIE1hdGguZmxvb3IoMSArIE1hdGgubG9nKHAxKSAvIE1hdGguTE4xMCkpO1xuICAgICAgICAgICAgICBwMSAvPSB6O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVc2luZyBGYXJleSBTZXF1ZW5jZXNcbiAgICAgICAgICAgIC8vIGh0dHA6Ly93d3cuam9obmRjb29rLmNvbS9ibG9nLzIwMTAvMTAvMjAvYmVzdC1yYXRpb25hbC1hcHByb3hpbWF0aW9uL1xuXG4gICAgICAgICAgICB3aGlsZSAoQiA8PSBOICYmIEQgPD0gTikge1xuICAgICAgICAgICAgICBNID0gKEEgKyBDKSAvIChCICsgRCk7XG5cbiAgICAgICAgICAgICAgaWYgKHAxID09PSBNKSB7XG4gICAgICAgICAgICAgICAgaWYgKEIgKyBEIDw9IE4pIHtcbiAgICAgICAgICAgICAgICAgIG4gPSBBICsgQztcbiAgICAgICAgICAgICAgICAgIGQgPSBCICsgRDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKEQgPiBCKSB7XG4gICAgICAgICAgICAgICAgICBuID0gQztcbiAgICAgICAgICAgICAgICAgIGQgPSBEO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBuID0gQTtcbiAgICAgICAgICAgICAgICAgIGQgPSBCO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgaWYgKHAxID4gTSkge1xuICAgICAgICAgICAgICAgICAgQSArPSBDO1xuICAgICAgICAgICAgICAgICAgQiArPSBEO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBDICs9IEE7XG4gICAgICAgICAgICAgICAgICBEICs9IEI7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKEIgPiBOKSB7XG4gICAgICAgICAgICAgICAgICBuID0gQztcbiAgICAgICAgICAgICAgICAgIGQgPSBEO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBuID0gQTtcbiAgICAgICAgICAgICAgICAgIGQgPSBCO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbiAqPSB6O1xuICAgICAgICAgIH0gZWxzZSBpZiAoaXNOYU4ocDEpIHx8IGlzTmFOKHAyKSkge1xuICAgICAgICAgICAgZCA9IG4gPSBOYU47XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgXCJzdHJpbmdcIjpcbiAgICAgICAge1xuICAgICAgICAgIEIgPSBwMS5tYXRjaCgvXFxkK3wuL2cpO1xuXG4gICAgICAgICAgaWYgKEIgPT09IG51bGwpXG4gICAgICAgICAgICB0aHJvd0ludmFsaWRQYXJhbSgpO1xuXG4gICAgICAgICAgaWYgKEJbQV0gPT09ICctJykgey8vIENoZWNrIGZvciBtaW51cyBzaWduIGF0IHRoZSBiZWdpbm5pbmdcbiAgICAgICAgICAgIHMgPSAtMTtcbiAgICAgICAgICAgIEErKztcbiAgICAgICAgICB9IGVsc2UgaWYgKEJbQV0gPT09ICcrJykgey8vIENoZWNrIGZvciBwbHVzIHNpZ24gYXQgdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgQSsrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChCLmxlbmd0aCA9PT0gQSArIDEpIHsgLy8gQ2hlY2sgaWYgaXQncyBqdXN0IGEgc2ltcGxlIG51bWJlciBcIjEyMzRcIlxuICAgICAgICAgICAgdyA9IGFzc2lnbihCW0ErK10sIHMpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoQltBICsgMV0gPT09ICcuJyB8fCBCW0FdID09PSAnLicpIHsgLy8gQ2hlY2sgaWYgaXQncyBhIGRlY2ltYWwgbnVtYmVyXG5cbiAgICAgICAgICAgIGlmIChCW0FdICE9PSAnLicpIHsgLy8gSGFuZGxlIDAuNSBhbmQgLjVcbiAgICAgICAgICAgICAgdiA9IGFzc2lnbihCW0ErK10sIHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQSsrO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgZGVjaW1hbCBwbGFjZXNcbiAgICAgICAgICAgIGlmIChBICsgMSA9PT0gQi5sZW5ndGggfHwgQltBICsgMV0gPT09ICcoJyAmJiBCW0EgKyAzXSA9PT0gJyknIHx8IEJbQSArIDFdID09PSBcIidcIiAmJiBCW0EgKyAzXSA9PT0gXCInXCIpIHtcbiAgICAgICAgICAgICAgdyA9IGFzc2lnbihCW0FdLCBzKTtcbiAgICAgICAgICAgICAgeSA9IE1hdGgucG93KDEwLCBCW0FdLmxlbmd0aCk7XG4gICAgICAgICAgICAgIEErKztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHJlcGVhdGluZyBwbGFjZXNcbiAgICAgICAgICAgIGlmIChCW0FdID09PSAnKCcgJiYgQltBICsgMl0gPT09ICcpJyB8fCBCW0FdID09PSBcIidcIiAmJiBCW0EgKyAyXSA9PT0gXCInXCIpIHtcbiAgICAgICAgICAgICAgeCA9IGFzc2lnbihCW0EgKyAxXSwgcyk7XG4gICAgICAgICAgICAgIHogPSBNYXRoLnBvdygxMCwgQltBICsgMV0ubGVuZ3RoKSAtIDE7XG4gICAgICAgICAgICAgIEEgKz0gMztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIH0gZWxzZSBpZiAoQltBICsgMV0gPT09ICcvJyB8fCBCW0EgKyAxXSA9PT0gJzonKSB7IC8vIENoZWNrIGZvciBhIHNpbXBsZSBmcmFjdGlvbiBcIjEyMy80NTZcIiBvciBcIjEyMzo0NTZcIlxuICAgICAgICAgICAgdyA9IGFzc2lnbihCW0FdLCBzKTtcbiAgICAgICAgICAgIHkgPSBhc3NpZ24oQltBICsgMl0sIDEpO1xuICAgICAgICAgICAgQSArPSAzO1xuICAgICAgICAgIH0gZWxzZSBpZiAoQltBICsgM10gPT09ICcvJyAmJiBCW0EgKyAxXSA9PT0gJyAnKSB7IC8vIENoZWNrIGZvciBhIGNvbXBsZXggZnJhY3Rpb24gXCIxMjMgMS8yXCJcbiAgICAgICAgICAgIHYgPSBhc3NpZ24oQltBXSwgcyk7XG4gICAgICAgICAgICB3ID0gYXNzaWduKEJbQSArIDJdLCBzKTtcbiAgICAgICAgICAgIHkgPSBhc3NpZ24oQltBICsgNF0sIDEpO1xuICAgICAgICAgICAgQSArPSA1O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChCLmxlbmd0aCA8PSBBKSB7IC8vIENoZWNrIGZvciBtb3JlIHRva2VucyBvbiB0aGUgc3RhY2tcbiAgICAgICAgICAgIGQgPSB5ICogejtcbiAgICAgICAgICAgIHMgPSAvKiB2b2lkICovXG4gICAgICAgICAgICAgICAgICAgIG4gPSB4ICsgZCAqIHYgKyB6ICogdztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8qIEZhbGwgdGhyb3VnaCBvbiBlcnJvciAqL1xuICAgICAgICB9XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKTtcbiAgICAgIH1cblxuICAgIGlmIChkID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRGl2aXNpb25CeVplcm8oKTtcbiAgICB9XG5cbiAgICBQW1wic1wiXSA9IHMgPCAwID8gLTEgOiAxO1xuICAgIFBbXCJuXCJdID0gTWF0aC5hYnMobik7XG4gICAgUFtcImRcIl0gPSBNYXRoLmFicyhkKTtcbiAgfTtcblxuICBmdW5jdGlvbiBtb2Rwb3coYiwgZSwgbSkge1xuXG4gICAgdmFyIHIgPSAxO1xuICAgIGZvciAoOyBlID4gMDsgYiA9IChiICogYikgJSBtLCBlID4+PSAxKSB7XG5cbiAgICAgIGlmIChlICYgMSkge1xuICAgICAgICByID0gKHIgKiBiKSAlIG07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByO1xuICB9XG5cblxuICBmdW5jdGlvbiBjeWNsZUxlbihuLCBkKSB7XG5cbiAgICBmb3IgKDsgZCAlIDIgPT09IDA7XG4gICAgICAgICAgICBkIC89IDIpIHtcbiAgICB9XG5cbiAgICBmb3IgKDsgZCAlIDUgPT09IDA7XG4gICAgICAgICAgICBkIC89IDUpIHtcbiAgICB9XG5cbiAgICBpZiAoZCA9PT0gMSkgLy8gQ2F0Y2ggbm9uLWN5Y2xpYyBudW1iZXJzXG4gICAgICByZXR1cm4gMDtcblxuICAgIC8vIElmIHdlIHdvdWxkIGxpa2UgdG8gY29tcHV0ZSByZWFsbHkgbGFyZ2UgbnVtYmVycyBxdWlja2VyLCB3ZSBjb3VsZCBtYWtlIHVzZSBvZiBGZXJtYXQncyBsaXR0bGUgdGhlb3JlbTpcbiAgICAvLyAxMF4oZC0xKSAlIGQgPT0gMVxuICAgIC8vIEhvd2V2ZXIsIHdlIGRvbid0IG5lZWQgc3VjaCBsYXJnZSBudW1iZXJzIGFuZCBNQVhfQ1lDTEVfTEVOIHNob3VsZCBiZSB0aGUgY2Fwc3RvbmUsXG4gICAgLy8gYXMgd2Ugd2FudCB0byB0cmFuc2xhdGUgdGhlIG51bWJlcnMgdG8gc3RyaW5ncy5cblxuICAgIHZhciByZW0gPSAxMCAlIGQ7XG4gICAgdmFyIHQgPSAxO1xuXG4gICAgZm9yICg7IHJlbSAhPT0gMTsgdCsrKSB7XG4gICAgICByZW0gPSByZW0gKiAxMCAlIGQ7XG5cbiAgICAgIGlmICh0ID4gTUFYX0NZQ0xFX0xFTilcbiAgICAgICAgcmV0dXJuIDA7IC8vIFJldHVybmluZyAwIGhlcmUgbWVhbnMgdGhhdCB3ZSBkb24ndCBwcmludCBpdCBhcyBhIGN5Y2xpYyBudW1iZXIuIEl0J3MgbGlrZWx5IHRoYXQgdGhlIGFuc3dlciBpcyBgZC0xYFxuICAgIH1cbiAgICByZXR1cm4gdDtcbiAgfVxuXG5cbiAgICAgZnVuY3Rpb24gY3ljbGVTdGFydChuLCBkLCBsZW4pIHtcblxuICAgIHZhciByZW0xID0gMTtcbiAgICB2YXIgcmVtMiA9IG1vZHBvdygxMCwgbGVuLCBkKTtcblxuICAgIGZvciAodmFyIHQgPSAwOyB0IDwgMzAwOyB0KyspIHsgLy8gcyA8IH5sb2cxMChOdW1iZXIuTUFYX1ZBTFVFKVxuICAgICAgLy8gU29sdmUgMTBecyA9PSAxMF4ocyt0KSAobW9kIGQpXG5cbiAgICAgIGlmIChyZW0xID09PSByZW0yKVxuICAgICAgICByZXR1cm4gdDtcblxuICAgICAgcmVtMSA9IHJlbTEgKiAxMCAlIGQ7XG4gICAgICByZW0yID0gcmVtMiAqIDEwICUgZDtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBmdW5jdGlvbiBnY2QoYSwgYikge1xuXG4gICAgaWYgKCFhKVxuICAgICAgcmV0dXJuIGI7XG4gICAgaWYgKCFiKVxuICAgICAgcmV0dXJuIGE7XG5cbiAgICB3aGlsZSAoMSkge1xuICAgICAgYSAlPSBiO1xuICAgICAgaWYgKCFhKVxuICAgICAgICByZXR1cm4gYjtcbiAgICAgIGIgJT0gYTtcbiAgICAgIGlmICghYilcbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBNb2R1bGUgY29uc3RydWN0b3JcbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7bnVtYmVyfEZyYWN0aW9uPX0gYVxuICAgKiBAcGFyYW0ge251bWJlcj19IGJcbiAgICovXG4gIGZ1bmN0aW9uIEZyYWN0aW9uKGEsIGIpIHtcblxuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGcmFjdGlvbikpIHtcbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oYSwgYik7XG4gICAgfVxuXG4gICAgcGFyc2UoYSwgYik7XG5cbiAgICBpZiAoRnJhY3Rpb25bJ1JFRFVDRSddKSB7XG4gICAgICBhID0gZ2NkKFBbXCJkXCJdLCBQW1wiblwiXSk7IC8vIEFidXNlIGFcbiAgICB9IGVsc2Uge1xuICAgICAgYSA9IDE7XG4gICAgfVxuXG4gICAgdGhpc1tcInNcIl0gPSBQW1wic1wiXTtcbiAgICB0aGlzW1wiblwiXSA9IFBbXCJuXCJdIC8gYTtcbiAgICB0aGlzW1wiZFwiXSA9IFBbXCJkXCJdIC8gYTtcbiAgfVxuXG4gIC8qKlxuICAgKiBCb29sZWFuIGdsb2JhbCB2YXJpYWJsZSB0byBiZSBhYmxlIHRvIGRpc2FibGUgYXV0b21hdGljIHJlZHVjdGlvbiBvZiB0aGUgZnJhY3Rpb25cbiAgICpcbiAgICovXG4gIEZyYWN0aW9uWydSRURVQ0UnXSA9IDE7XG5cbiAgRnJhY3Rpb24ucHJvdG90eXBlID0ge1xuXG4gICAgXCJzXCI6IDEsXG4gICAgXCJuXCI6IDAsXG4gICAgXCJkXCI6IDEsXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBhYnNvbHV0ZSB2YWx1ZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigtNCkuYWJzKCkgPT4gNFxuICAgICAqKi9cbiAgICBcImFic1wiOiBmdW5jdGlvbigpIHtcblxuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzW1wiblwiXSwgdGhpc1tcImRcIl0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbnZlcnRzIHRoZSBzaWduIG9mIHRoZSBjdXJyZW50IGZyYWN0aW9uXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKC00KS5uZWcoKSA9PiA0XG4gICAgICoqL1xuICAgIFwibmVnXCI6IGZ1bmN0aW9uKCkge1xuXG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKC10aGlzW1wic1wiXSAqIHRoaXNbXCJuXCJdLCB0aGlzW1wiZFwiXSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oe246IDIsIGQ6IDN9KS5hZGQoXCIxNC45XCIpID0+IDQ2NyAvIDMwXG4gICAgICoqL1xuICAgIFwiYWRkXCI6IGZ1bmN0aW9uKGEsIGIpIHtcblxuICAgICAgcGFyc2UoYSwgYik7XG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgICAgICB0aGlzW1wic1wiXSAqIHRoaXNbXCJuXCJdICogUFtcImRcIl0gKyBQW1wic1wiXSAqIHRoaXNbXCJkXCJdICogUFtcIm5cIl0sXG4gICAgICAgICAgICAgIHRoaXNbXCJkXCJdICogUFtcImRcIl1cbiAgICAgICAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3VidHJhY3RzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKHtuOiAyLCBkOiAzfSkuYWRkKFwiMTQuOVwiKSA9PiAtNDI3IC8gMzBcbiAgICAgKiovXG4gICAgXCJzdWJcIjogZnVuY3Rpb24oYSwgYikge1xuXG4gICAgICBwYXJzZShhLCBiKTtcbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgICAgIHRoaXNbXCJzXCJdICogdGhpc1tcIm5cIl0gKiBQW1wiZFwiXSAtIFBbXCJzXCJdICogdGhpc1tcImRcIl0gKiBQW1wiblwiXSxcbiAgICAgICAgICAgICAgdGhpc1tcImRcIl0gKiBQW1wiZFwiXVxuICAgICAgICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsaWVzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiLTE3LigzNDUpXCIpLm11bCgzKSA9PiA1Nzc2IC8gMTExXG4gICAgICoqL1xuICAgIFwibXVsXCI6IGZ1bmN0aW9uKGEsIGIpIHtcblxuICAgICAgcGFyc2UoYSwgYik7XG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgICAgICB0aGlzW1wic1wiXSAqIFBbXCJzXCJdICogdGhpc1tcIm5cIl0gKiBQW1wiblwiXSxcbiAgICAgICAgICAgICAgdGhpc1tcImRcIl0gKiBQW1wiZFwiXVxuICAgICAgICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaXZpZGVzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiLTE3LigzNDUpXCIpLmludmVyc2UoKS5kaXYoMylcbiAgICAgKiovXG4gICAgXCJkaXZcIjogZnVuY3Rpb24oYSwgYikge1xuXG4gICAgICBwYXJzZShhLCBiKTtcbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgICAgIHRoaXNbXCJzXCJdICogUFtcInNcIl0gKiB0aGlzW1wiblwiXSAqIFBbXCJkXCJdLFxuICAgICAgICAgICAgICB0aGlzW1wiZFwiXSAqIFBbXCJuXCJdXG4gICAgICAgICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsb25lcyB0aGUgYWN0dWFsIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIi0xNy4oMzQ1KVwiKS5jbG9uZSgpXG4gICAgICoqL1xuICAgIFwiY2xvbmVcIjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBtb2R1bG8gb2YgdHdvIHJhdGlvbmFsIG51bWJlcnMgLSBhIG1vcmUgcHJlY2lzZSBmbW9kXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLm1vZChbNywgOF0pID0+ICgxMy8zKSAlICg3LzgpID0gKDUvNilcbiAgICAgKiovXG4gICAgXCJtb2RcIjogZnVuY3Rpb24oYSwgYikge1xuXG4gICAgICBpZiAoaXNOYU4odGhpc1snbiddKSB8fCBpc05hTih0aGlzWydkJ10pKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXNbXCJzXCJdICogdGhpc1tcIm5cIl0gJSB0aGlzW1wiZFwiXSwgMSk7XG4gICAgICB9XG5cbiAgICAgIHBhcnNlKGEsIGIpO1xuICAgICAgaWYgKDAgPT09IFBbXCJuXCJdICYmIDAgPT09IHRoaXNbXCJkXCJdKSB7XG4gICAgICAgIEZyYWN0aW9uKDAsIDApOyAvLyBUaHJvdyBEaXZpc2lvbkJ5WmVyb1xuICAgICAgfVxuXG4gICAgICAvKlxuICAgICAgICogRmlyc3Qgc2lsbHkgYXR0ZW1wdCwga2luZGEgc2xvd1xuICAgICAgICpcbiAgICAgICByZXR1cm4gdGhhdFtcInN1YlwiXSh7XG4gICAgICAgXCJuXCI6IG51bVtcIm5cIl0gKiBNYXRoLmZsb29yKCh0aGlzLm4gLyB0aGlzLmQpIC8gKG51bS5uIC8gbnVtLmQpKSxcbiAgICAgICBcImRcIjogbnVtW1wiZFwiXSxcbiAgICAgICBcInNcIjogdGhpc1tcInNcIl1cbiAgICAgICB9KTsqL1xuXG4gICAgICAvKlxuICAgICAgICogTmV3IGF0dGVtcHQ6IGExIC8gYjEgPSBhMiAvIGIyICogcSArIHJcbiAgICAgICAqID0+IGIyICogYTEgPSBhMiAqIGIxICogcSArIGIxICogYjIgKiByXG4gICAgICAgKiA9PiAoYjIgKiBhMSAlIGEyICogYjEpIC8gKGIxICogYjIpXG4gICAgICAgKi9cbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgICAgIHRoaXNbXCJzXCJdICogKFBbXCJkXCJdICogdGhpc1tcIm5cIl0pICUgKFBbXCJuXCJdICogdGhpc1tcImRcIl0pLFxuICAgICAgICAgICAgICBQW1wiZFwiXSAqIHRoaXNbXCJkXCJdXG4gICAgICAgICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZyYWN0aW9uYWwgZ2NkIG9mIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDUsOCkuZ2NkKDMsNykgPT4gMS81NlxuICAgICAqL1xuICAgIFwiZ2NkXCI6IGZ1bmN0aW9uKGEsIGIpIHtcblxuICAgICAgcGFyc2UoYSwgYik7XG5cbiAgICAgIC8vIGdjZChhIC8gYiwgYyAvIGQpID0gZ2NkKGEsIGMpIC8gbGNtKGIsIGQpXG5cbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oZ2NkKFBbXCJuXCJdLCB0aGlzW1wiblwiXSkgKiBnY2QoUFtcImRcIl0sIHRoaXNbXCJkXCJdKSwgUFtcImRcIl0gKiB0aGlzW1wiZFwiXSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZyYWN0aW9uYWwgbGNtIG9mIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDUsOCkubGNtKDMsNykgPT4gMTVcbiAgICAgKi9cbiAgICBcImxjbVwiOiBmdW5jdGlvbihhLCBiKSB7XG5cbiAgICAgIHBhcnNlKGEsIGIpO1xuXG4gICAgICAvLyBsY20oYSAvIGIsIGMgLyBkKSA9IGxjbShhLCBjKSAvIGdjZChiLCBkKVxuXG4gICAgICBpZiAoUFtcIm5cIl0gPT09IDAgJiYgdGhpc1tcIm5cIl0gPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oUFtcIm5cIl0gKiB0aGlzW1wiblwiXSwgZ2NkKFBbXCJuXCJdLCB0aGlzW1wiblwiXSkgKiBnY2QoUFtcImRcIl0sIHRoaXNbXCJkXCJdKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGNlaWwgb2YgYSByYXRpb25hbCBudW1iZXJcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykuY2VpbCgpID0+ICg1IC8gMSlcbiAgICAgKiovXG4gICAgXCJjZWlsXCI6IGZ1bmN0aW9uKHBsYWNlcykge1xuXG4gICAgICBwbGFjZXMgPSBNYXRoLnBvdygxMCwgcGxhY2VzIHx8IDApO1xuXG4gICAgICBpZiAoaXNOYU4odGhpc1tcIm5cIl0pIHx8IGlzTmFOKHRoaXNbXCJkXCJdKSkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTik7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGguY2VpbChwbGFjZXMgKiB0aGlzW1wic1wiXSAqIHRoaXNbXCJuXCJdIC8gdGhpc1tcImRcIl0pLCBwbGFjZXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmbG9vciBvZiBhIHJhdGlvbmFsIG51bWJlclxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5mbG9vcigpID0+ICg0IC8gMSlcbiAgICAgKiovXG4gICAgXCJmbG9vclwiOiBmdW5jdGlvbihwbGFjZXMpIHtcblxuICAgICAgcGxhY2VzID0gTWF0aC5wb3coMTAsIHBsYWNlcyB8fCAwKTtcblxuICAgICAgaWYgKGlzTmFOKHRoaXNbXCJuXCJdKSB8fCBpc05hTih0aGlzW1wiZFwiXSkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLmZsb29yKHBsYWNlcyAqIHRoaXNbXCJzXCJdICogdGhpc1tcIm5cIl0gLyB0aGlzW1wiZFwiXSksIHBsYWNlcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJvdW5kcyBhIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykucm91bmQoKSA9PiAoNCAvIDEpXG4gICAgICoqL1xuICAgIFwicm91bmRcIjogZnVuY3Rpb24ocGxhY2VzKSB7XG5cbiAgICAgIHBsYWNlcyA9IE1hdGgucG93KDEwLCBwbGFjZXMgfHwgMCk7XG5cbiAgICAgIGlmIChpc05hTih0aGlzW1wiblwiXSkgfHwgaXNOYU4odGhpc1tcImRcIl0pKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5yb3VuZChwbGFjZXMgKiB0aGlzW1wic1wiXSAqIHRoaXNbXCJuXCJdIC8gdGhpc1tcImRcIl0pLCBwbGFjZXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBpbnZlcnNlIG9mIHRoZSBmcmFjdGlvbiwgbWVhbnMgbnVtZXJhdG9yIGFuZCBkZW51bWVyYXRvciBhcmUgZXhjaGFuZ2VkXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFstMywgNF0pLmludmVyc2UoKSA9PiAtNCAvIDNcbiAgICAgKiovXG4gICAgXCJpbnZlcnNlXCI6IGZ1bmN0aW9uKCkge1xuXG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXNbXCJzXCJdICogdGhpc1tcImRcIl0sIHRoaXNbXCJuXCJdKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZnJhY3Rpb24gdG8gc29tZSBpbnRlZ2VyIGV4cG9uZW50XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKC0xLDIpLnBvdygtMykgPT4gLThcbiAgICAgKi9cbiAgICBcInBvd1wiOiBmdW5jdGlvbihtKSB7XG5cbiAgICAgIGlmIChtIDwgMCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGgucG93KHRoaXNbJ3MnXSAqIHRoaXNbXCJkXCJdLCAtbSksIE1hdGgucG93KHRoaXNbXCJuXCJdLCAtbSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLnBvdyh0aGlzWydzJ10gKiB0aGlzW1wiblwiXSwgbSksIE1hdGgucG93KHRoaXNbXCJkXCJdLCBtKSk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHR3byByYXRpb25hbCBudW1iZXJzIGFyZSB0aGUgc2FtZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigxOS42KS5lcXVhbHMoWzk4LCA1XSk7XG4gICAgICoqL1xuICAgIFwiZXF1YWxzXCI6IGZ1bmN0aW9uKGEsIGIpIHtcblxuICAgICAgcGFyc2UoYSwgYik7XG4gICAgICByZXR1cm4gdGhpc1tcInNcIl0gKiB0aGlzW1wiblwiXSAqIFBbXCJkXCJdID09PSBQW1wic1wiXSAqIFBbXCJuXCJdICogdGhpc1tcImRcIl07IC8vIFNhbWUgYXMgY29tcGFyZSgpID09PSAwXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHR3byByYXRpb25hbCBudW1iZXJzIGFyZSB0aGUgc2FtZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigxOS42KS5lcXVhbHMoWzk4LCA1XSk7XG4gICAgICoqL1xuICAgIFwiY29tcGFyZVwiOiBmdW5jdGlvbihhLCBiKSB7XG5cbiAgICAgIHBhcnNlKGEsIGIpO1xuICAgICAgdmFyIHQgPSAodGhpc1tcInNcIl0gKiB0aGlzW1wiblwiXSAqIFBbXCJkXCJdIC0gUFtcInNcIl0gKiBQW1wiblwiXSAqIHRoaXNbXCJkXCJdKTtcbiAgICAgIHJldHVybiAoMCA8IHQpIC0gKHQgPCAwKTtcbiAgICB9LFxuXG4gICAgXCJzaW1wbGlmeVwiOiBmdW5jdGlvbihlcHMpIHtcblxuICAgICAgLy8gRmlyc3QgbmFpdmUgaW1wbGVtZW50YXRpb24sIG5lZWRzIGltcHJvdmVtZW50XG5cbiAgICAgIGlmIChpc05hTih0aGlzWyduJ10pIHx8IGlzTmFOKHRoaXNbJ2QnXSkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIHZhciBjb250ID0gdGhpc1snYWJzJ10oKVsndG9Db250aW51ZWQnXSgpO1xuXG4gICAgICBlcHMgPSBlcHMgfHwgMC4wMDE7XG5cbiAgICAgIGZ1bmN0aW9uIHJlYyhhKSB7XG4gICAgICAgIGlmIChhLmxlbmd0aCA9PT0gMSlcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKGFbMF0pO1xuICAgICAgICByZXR1cm4gcmVjKGEuc2xpY2UoMSkpWydpbnZlcnNlJ10oKVsnYWRkJ10oYVswXSk7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29udC5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgdG1wID0gcmVjKGNvbnQuc2xpY2UoMCwgaSArIDEpKTtcbiAgICAgICAgaWYgKHRtcFsnc3ViJ10odGhpc1snYWJzJ10oKSlbJ2FicyddKCkudmFsdWVPZigpIDwgZXBzKSB7XG4gICAgICAgICAgcmV0dXJuIHRtcFsnbXVsJ10odGhpc1sncyddKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHR3byByYXRpb25hbCBudW1iZXJzIGFyZSBkaXZpc2libGVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oMTkuNikuZGl2aXNpYmxlKDEuNSk7XG4gICAgICovXG4gICAgXCJkaXZpc2libGVcIjogZnVuY3Rpb24oYSwgYikge1xuXG4gICAgICBwYXJzZShhLCBiKTtcbiAgICAgIHJldHVybiAhKCEoUFtcIm5cIl0gKiB0aGlzW1wiZFwiXSkgfHwgKCh0aGlzW1wiblwiXSAqIFBbXCJkXCJdKSAlIChQW1wiblwiXSAqIHRoaXNbXCJkXCJdKSkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgZGVjaW1hbCByZXByZXNlbnRhdGlvbiBvZiB0aGUgZnJhY3Rpb25cbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxMDAuJzkxODIzJ1wiKS52YWx1ZU9mKCkgPT4gMTAwLjkxODIzOTE4MjM5MTgzXG4gICAgICoqL1xuICAgICd2YWx1ZU9mJzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHJldHVybiB0aGlzW1wic1wiXSAqIHRoaXNbXCJuXCJdIC8gdGhpc1tcImRcIl07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBzdHJpbmctZnJhY3Rpb24gcmVwcmVzZW50YXRpb24gb2YgYSBGcmFjdGlvbiBvYmplY3RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxLiczJ1wiKS50b0ZyYWN0aW9uKCkgPT4gXCI0IDEvM1wiXG4gICAgICoqL1xuICAgICd0b0ZyYWN0aW9uJzogZnVuY3Rpb24oZXhjbHVkZVdob2xlKSB7XG5cbiAgICAgIHZhciB3aG9sZSwgc3RyID0gXCJcIjtcbiAgICAgIHZhciBuID0gdGhpc1tcIm5cIl07XG4gICAgICB2YXIgZCA9IHRoaXNbXCJkXCJdO1xuICAgICAgaWYgKHRoaXNbXCJzXCJdIDwgMCkge1xuICAgICAgICBzdHIgKz0gJy0nO1xuICAgICAgfVxuXG4gICAgICBpZiAoZCA9PT0gMSkge1xuICAgICAgICBzdHIgKz0gbjtcbiAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgaWYgKGV4Y2x1ZGVXaG9sZSAmJiAod2hvbGUgPSBNYXRoLmZsb29yKG4gLyBkKSkgPiAwKSB7XG4gICAgICAgICAgc3RyICs9IHdob2xlO1xuICAgICAgICAgIHN0ciArPSBcIiBcIjtcbiAgICAgICAgICBuICU9IGQ7XG4gICAgICAgIH1cblxuICAgICAgICBzdHIgKz0gbjtcbiAgICAgICAgc3RyICs9ICcvJztcbiAgICAgICAgc3RyICs9IGQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgbGF0ZXggcmVwcmVzZW50YXRpb24gb2YgYSBGcmFjdGlvbiBvYmplY3RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxLiczJ1wiKS50b0xhdGV4KCkgPT4gXCJcXGZyYWN7NH17M31cIlxuICAgICAqKi9cbiAgICAndG9MYXRleCc6IGZ1bmN0aW9uKGV4Y2x1ZGVXaG9sZSkge1xuXG4gICAgICB2YXIgd2hvbGUsIHN0ciA9IFwiXCI7XG4gICAgICB2YXIgbiA9IHRoaXNbXCJuXCJdO1xuICAgICAgdmFyIGQgPSB0aGlzW1wiZFwiXTtcbiAgICAgIGlmICh0aGlzW1wic1wiXSA8IDApIHtcbiAgICAgICAgc3RyICs9ICctJztcbiAgICAgIH1cblxuICAgICAgaWYgKGQgPT09IDEpIHtcbiAgICAgICAgc3RyICs9IG47XG4gICAgICB9IGVsc2Uge1xuXG4gICAgICAgIGlmIChleGNsdWRlV2hvbGUgJiYgKHdob2xlID0gTWF0aC5mbG9vcihuIC8gZCkpID4gMCkge1xuICAgICAgICAgIHN0ciArPSB3aG9sZTtcbiAgICAgICAgICBuICU9IGQ7XG4gICAgICAgIH1cblxuICAgICAgICBzdHIgKz0gXCJcXFxcZnJhY3tcIjtcbiAgICAgICAgc3RyICs9IG47XG4gICAgICAgIHN0ciArPSAnfXsnO1xuICAgICAgICBzdHIgKz0gZDtcbiAgICAgICAgc3RyICs9ICd9JztcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YgY29udGludWVkIGZyYWN0aW9uIGVsZW1lbnRzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiNy84XCIpLnRvQ29udGludWVkKCkgPT4gWzAsMSw3XVxuICAgICAqL1xuICAgICd0b0NvbnRpbnVlZCc6IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgdDtcbiAgICAgIHZhciBhID0gdGhpc1snbiddO1xuICAgICAgdmFyIGIgPSB0aGlzWydkJ107XG4gICAgICB2YXIgcmVzID0gW107XG5cbiAgICAgIGlmIChpc05hTih0aGlzWyduJ10pIHx8IGlzTmFOKHRoaXNbJ2QnXSkpIHtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgIH1cblxuICAgICAgZG8ge1xuICAgICAgICByZXMucHVzaChNYXRoLmZsb29yKGEgLyBiKSk7XG4gICAgICAgIHQgPSBhICUgYjtcbiAgICAgICAgYSA9IGI7XG4gICAgICAgIGIgPSB0O1xuICAgICAgfSB3aGlsZSAoYSAhPT0gMSk7XG5cbiAgICAgIHJldHVybiByZXM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYSBmcmFjdGlvbiB3aXRoIGFsbCBkaWdpdHNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxMDAuJzkxODIzJ1wiKS50b1N0cmluZygpID0+IFwiMTAwLig5MTgyMylcIlxuICAgICAqKi9cbiAgICAndG9TdHJpbmcnOiBmdW5jdGlvbihkZWMpIHtcblxuICAgICAgdmFyIGc7XG4gICAgICB2YXIgTiA9IHRoaXNbXCJuXCJdO1xuICAgICAgdmFyIEQgPSB0aGlzW1wiZFwiXTtcblxuICAgICAgaWYgKGlzTmFOKE4pIHx8IGlzTmFOKEQpKSB7XG4gICAgICAgIHJldHVybiBcIk5hTlwiO1xuICAgICAgfVxuXG4gICAgICBpZiAoIUZyYWN0aW9uWydSRURVQ0UnXSkge1xuICAgICAgICBnID0gZ2NkKE4sIEQpO1xuICAgICAgICBOIC89IGc7XG4gICAgICAgIEQgLz0gZztcbiAgICAgIH1cblxuICAgICAgZGVjID0gZGVjIHx8IDE1OyAvLyAxNSA9IGRlY2ltYWwgcGxhY2VzIHdoZW4gbm8gcmVwaXRhdGlvblxuXG4gICAgICB2YXIgY3ljTGVuID0gY3ljbGVMZW4oTiwgRCk7IC8vIEN5Y2xlIGxlbmd0aFxuICAgICAgdmFyIGN5Y09mZiA9IGN5Y2xlU3RhcnQoTiwgRCwgY3ljTGVuKTsgLy8gQ3ljbGUgc3RhcnRcblxuICAgICAgdmFyIHN0ciA9IHRoaXNbJ3MnXSA9PT0gLTEgPyBcIi1cIiA6IFwiXCI7XG5cbiAgICAgIHN0ciArPSBOIC8gRCB8IDA7XG5cbiAgICAgIE4gJT0gRDtcbiAgICAgIE4gKj0gMTA7XG5cbiAgICAgIGlmIChOKVxuICAgICAgICBzdHIgKz0gXCIuXCI7XG5cbiAgICAgIGlmIChjeWNMZW4pIHtcblxuICAgICAgICBmb3IgKHZhciBpID0gY3ljT2ZmOyBpLS07ICkge1xuICAgICAgICAgIHN0ciArPSBOIC8gRCB8IDA7XG4gICAgICAgICAgTiAlPSBEO1xuICAgICAgICAgIE4gKj0gMTA7XG4gICAgICAgIH1cbiAgICAgICAgc3RyICs9IFwiKFwiO1xuICAgICAgICBmb3IgKHZhciBpID0gY3ljTGVuOyBpLS07ICkge1xuICAgICAgICAgIHN0ciArPSBOIC8gRCB8IDA7XG4gICAgICAgICAgTiAlPSBEO1xuICAgICAgICAgIE4gKj0gMTA7XG4gICAgICAgIH1cbiAgICAgICAgc3RyICs9IFwiKVwiO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IGRlYzsgTiAmJiBpLS07ICkge1xuICAgICAgICAgIHN0ciArPSBOIC8gRCB8IDA7XG4gICAgICAgICAgTiAlPSBEO1xuICAgICAgICAgIE4gKj0gMTA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICB9O1xuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lW1wiYW1kXCJdKSB7XG4gICAgZGVmaW5lKFtdLCBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBGcmFjdGlvbjtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gXCJvYmplY3RcIikge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyd2YWx1ZSc6IHRydWV9KTtcbiAgICBGcmFjdGlvblsnZGVmYXVsdCddID0gRnJhY3Rpb247XG4gICAgRnJhY3Rpb25bJ0ZyYWN0aW9uJ10gPSBGcmFjdGlvbjtcbiAgICBtb2R1bGVbJ2V4cG9ydHMnXSA9IEZyYWN0aW9uO1xuICB9IGVsc2Uge1xuICAgIHJvb3RbJ0ZyYWN0aW9uJ10gPSBGcmFjdGlvbjtcbiAgfVxuXG59KSh0aGlzKTtcbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIE1vbm9taWFsIHtcbiAgY29uc3RydWN0b3IgKGMsIHZzKSB7XG4gICAgaWYgKCFpc05hTihjKSAmJiB2cyBpbnN0YW5jZW9mIE1hcCkge1xuICAgICAgdGhpcy5jID0gY1xuICAgICAgdGhpcy52cyA9IHZzXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgYyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuaW5pdFN0cihjKVxuICAgIH0gZWxzZSBpZiAoIWlzTmFOKGMpKSB7XG4gICAgICB0aGlzLmMgPSBjXG4gICAgICB0aGlzLnZzID0gbmV3IE1hcCgpXG4gICAgfSBlbHNlIHsgLy8gZGVmYXVsdCBhcyBhIHRlc3Q6IDR4XjJ5XG4gICAgICB0aGlzLmMgPSA0XG4gICAgICB0aGlzLnZzID0gbmV3IE1hcChbWyd4JywgMl0sIFsneScsIDFdXSlcbiAgICB9XG4gIH1cblxuICBjbG9uZSAoKSB7XG4gICAgY29uc3QgdnMgPSBuZXcgTWFwKHRoaXMudnMpXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbCh0aGlzLmMsIHZzKVxuICB9XG5cbiAgbXVsICh0aGF0KSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIE1vbm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBNb25vbWlhbCh0aGF0KVxuICAgIH1cbiAgICBjb25zdCBjID0gdGhpcy5jICogdGhhdC5jXG4gICAgbGV0IHZzID0gbmV3IE1hcCgpXG4gICAgdGhpcy52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICh0aGF0LnZzLmhhcyh2YXJpYWJsZSkpIHtcbiAgICAgICAgdnMuc2V0KHZhcmlhYmxlLCB0aGlzLnZzLmdldCh2YXJpYWJsZSkgKyB0aGF0LnZzLmdldCh2YXJpYWJsZSkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2cy5zZXQodmFyaWFibGUsIHRoaXMudnMuZ2V0KHZhcmlhYmxlKSlcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhhdC52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICghdnMuaGFzKHZhcmlhYmxlKSkge1xuICAgICAgICB2cy5zZXQodmFyaWFibGUsIHRoYXQudnMuZ2V0KHZhcmlhYmxlKSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHZzID0gbmV3IE1hcChbLi4udnMuZW50cmllcygpXS5zb3J0KCkpXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbChjLCB2cylcbiAgfVxuXG4gIHRvTGF0ZXggKCkge1xuICAgIGlmICh0aGlzLnZzLnNpemUgPT09IDApIHJldHVybiB0aGlzLmMudG9TdHJpbmcoKVxuICAgIGxldCBzdHIgPSB0aGlzLmMgPT09IDEgPyAnJ1xuICAgICAgOiB0aGlzLmMgPT09IC0xID8gJy0nXG4gICAgICAgIDogdGhpcy5jLnRvU3RyaW5nKClcbiAgICB0aGlzLnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKGluZGV4ID09PSAxKSB7XG4gICAgICAgIHN0ciArPSB2YXJpYWJsZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyICs9IHZhcmlhYmxlICsgJ14nICsgaW5kZXhcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBzdHJcbiAgfVxuXG4gIHNvcnQgKCkge1xuICAgIC8vIHNvcnRzIChtb2RpZmllcyBvYmplY3QpXG4gICAgdGhpcy52cyA9IG5ldyBNYXAoWy4uLnRoaXMudnMuZW50cmllcygpXS5zb3J0KCkpXG4gIH1cblxuICBjbGVhblplcm9zICgpIHtcbiAgICB0aGlzLnZzLmZvckVhY2goKGlkeCwgdikgPT4ge1xuICAgICAgaWYgKGlkeCA9PT0gMCkgdGhpcy52cy5kZWxldGUodilcbiAgICB9KVxuICB9XG5cbiAgbGlrZSAodGhhdCkge1xuICAgIC8vIHJldHVybiB0cnVlIGlmIGxpa2UgdGVybXMsIGZhbHNlIGlmIG90aGVyd2lzZVxuICAgIC8vIG5vdCB0aGUgbW9zdCBlZmZpY2llbnQgYXQgdGhlIG1vbWVudCwgYnV0IGdvb2QgZW5vdWdoLlxuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgTW9ub21pYWwodGhhdClcbiAgICB9XG5cbiAgICBsZXQgbGlrZSA9IHRydWVcbiAgICB0aGlzLnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKCF0aGF0LnZzLmhhcyh2YXJpYWJsZSkgfHwgdGhhdC52cy5nZXQodmFyaWFibGUpICE9PSBpbmRleCkge1xuICAgICAgICBsaWtlID0gZmFsc2VcbiAgICAgIH1cbiAgICB9KVxuICAgIHRoYXQudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAoIXRoaXMudnMuaGFzKHZhcmlhYmxlKSB8fCB0aGlzLnZzLmdldCh2YXJpYWJsZSkgIT09IGluZGV4KSB7XG4gICAgICAgIGxpa2UgPSBmYWxzZVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGxpa2VcbiAgfVxuXG4gIGFkZCAodGhhdCwgY2hlY2tMaWtlKSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIE1vbm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBNb25vbWlhbCh0aGF0KVxuICAgIH1cbiAgICAvLyBhZGRzIHR3byBjb21wYXRpYmxlIG1vbm9taWFsc1xuICAgIC8vIGNoZWNrTGlrZSAoZGVmYXVsdCB0cnVlKSB3aWxsIGNoZWNrIGZpcnN0IGlmIHRoZXkgYXJlIGxpa2UgYW5kIHRocm93IGFuIGV4Y2VwdGlvblxuICAgIC8vIHVuZGVmaW5lZCBiZWhhdmlvdXIgaWYgY2hlY2tMaWtlIGlzIGZhbHNlXG4gICAgaWYgKGNoZWNrTGlrZSA9PT0gdW5kZWZpbmVkKSBjaGVja0xpa2UgPSB0cnVlXG4gICAgaWYgKGNoZWNrTGlrZSAmJiAhdGhpcy5saWtlKHRoYXQpKSB0aHJvdyBuZXcgRXJyb3IoJ0FkZGluZyB1bmxpa2UgdGVybXMnKVxuICAgIGNvbnN0IGMgPSB0aGlzLmMgKyB0aGF0LmNcbiAgICBjb25zdCB2cyA9IHRoaXMudnNcbiAgICByZXR1cm4gbmV3IE1vbm9taWFsKGMsIHZzKVxuICB9XG5cbiAgaW5pdFN0ciAoc3RyKSB7XG4gICAgLy8gY3VycmVudGx5IG5vIGVycm9yIGNoZWNraW5nIGFuZCBmcmFnaWxlXG4gICAgLy8gVGhpbmdzIG5vdCB0byBwYXNzIGluOlxuICAgIC8vICB6ZXJvIGluZGljZXNcbiAgICAvLyAgbXVsdGktY2hhcmFjdGVyIHZhcmlhYmxlc1xuICAgIC8vICBuZWdhdGl2ZSBpbmRpY2VzXG4gICAgLy8gIG5vbi1pbnRlZ2VyIGNvZWZmaWNpZW50c1xuICAgIGNvbnN0IGxlYWQgPSBzdHIubWF0Y2goL14tP1xcZCovKVswXVxuICAgIGNvbnN0IGMgPSBsZWFkID09PSAnJyA/IDFcbiAgICAgIDogbGVhZCA9PT0gJy0nID8gLTFcbiAgICAgICAgOiBwYXJzZUludChsZWFkKVxuICAgIGxldCB2cyA9IHN0ci5tYXRjaCgvKFthLXpBLVpdKShcXF5cXGQrKT8vZylcbiAgICBpZiAoIXZzKSB2cyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgdiA9IHZzW2ldLnNwbGl0KCdeJylcbiAgICAgIHZbMV0gPSB2WzFdID8gcGFyc2VJbnQodlsxXSkgOiAxXG4gICAgICB2c1tpXSA9IHZcbiAgICB9XG4gICAgdnMgPSB2cy5maWx0ZXIodiA9PiB2WzFdICE9PSAwKVxuICAgIHRoaXMuYyA9IGNcbiAgICB0aGlzLnZzID0gbmV3IE1hcCh2cylcbiAgfVxuXG4gIHN0YXRpYyB2YXIgKHYpIHtcbiAgICAvLyBmYWN0b3J5IGZvciBhIHNpbmdsZSB2YXJpYWJsZSBtb25vbWlhbFxuICAgIGNvbnN0IGMgPSAxXG4gICAgY29uc3QgdnMgPSBuZXcgTWFwKFtbdiwgMV1dKVxuICAgIHJldHVybiBuZXcgTW9ub21pYWwoYywgdnMpXG4gIH1cbn1cbiIsImltcG9ydCBNb25vbWlhbCBmcm9tICdNb25vbWlhbCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUG9seW5vbWlhbCB7XG4gIGNvbnN0cnVjdG9yICh0ZXJtcykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHRlcm1zKSAmJiAodGVybXNbMF0gaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRlcm1zLm1hcCh0ID0+IHQuY2xvbmUoKSlcbiAgICAgIHRoaXMudGVybXMgPSB0ZXJtc1xuICAgIH0gZWxzZSBpZiAoIWlzTmFOKHRlcm1zKSkge1xuICAgICAgdGhpcy5pbml0TnVtKHRlcm1zKVxuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRlcm1zID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5pbml0U3RyKHRlcm1zKVxuICAgIH1cbiAgfVxuXG4gIGluaXRTdHIgKHN0cikge1xuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9cXCstL2csICctJykgLy8gYSBob3JyaWJsZSBib2RnZVxuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC8tL2csICcrLScpIC8vIG1ha2UgbmVnYXRpdmUgdGVybXMgZXhwbGljaXQuXG4gICAgc3RyID0gc3RyLnJlcGxhY2UoL1xccy9nLCAnJykgLy8gc3RyaXAgd2hpdGVzcGFjZVxuICAgIHRoaXMudGVybXMgPSBzdHIuc3BsaXQoJysnKVxuICAgICAgLm1hcChzID0+IG5ldyBNb25vbWlhbChzKSlcbiAgICAgIC5maWx0ZXIodCA9PiB0LmMgIT09IDApXG4gIH1cblxuICBpbml0TnVtIChuKSB7XG4gICAgdGhpcy50ZXJtcyA9IFtuZXcgTW9ub21pYWwobildXG4gIH1cblxuICB0b0xhdGV4ICgpIHtcbiAgICBsZXQgc3RyID0gJydcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGVybXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChpID4gMCAmJiB0aGlzLnRlcm1zW2ldLmMgPj0gMCkge1xuICAgICAgICBzdHIgKz0gJysnXG4gICAgICB9XG4gICAgICBzdHIgKz0gdGhpcy50ZXJtc1tpXS50b0xhdGV4KClcbiAgICB9XG4gICAgcmV0dXJuIHN0clxuICB9XG5cbiAgdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiB0aGlzLnRvTGFUZVgoKVxuICB9XG5cbiAgY2xvbmUgKCkge1xuICAgIGNvbnN0IHRlcm1zID0gdGhpcy50ZXJtcy5tYXAodCA9PiB0LmNsb25lKCkpXG4gICAgcmV0dXJuIG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuICB9XG5cbiAgc2ltcGxpZnkgKCkge1xuICAgIC8vIGNvbGxlY3RzIGxpa2UgdGVybXMgYW5kIHJlbW92ZXMgemVybyB0ZXJtc1xuICAgIC8vIGRvZXMgbm90IG1vZGlmeSBvcmlnaW5hbFxuICAgIC8vIFRoaXMgc2VlbXMgcHJvYmFibHkgaW5lZmZpY2llbnQsIGdpdmVuIHRoZSBkYXRhIHN0cnVjdHVyZVxuICAgIC8vIFdvdWxkIGJlIGJldHRlciB0byB1c2Ugc29tZXRoaW5nIGxpa2UgYSBsaW5rZWQgbGlzdCBtYXliZT9cbiAgICBjb25zdCB0ZXJtcyA9IHRoaXMudGVybXMuc2xpY2UoKVxuICAgIGxldCBuZXd0ZXJtcyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0ZXJtcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCF0ZXJtc1tpXSkgY29udGludWVcbiAgICAgIGxldCBuZXd0ZXJtID0gdGVybXNbaV1cbiAgICAgIGZvciAobGV0IGogPSBpICsgMTsgaiA8IHRlcm1zLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmICghdGVybXNbal0pIGNvbnRpbnVlXG4gICAgICAgIGlmICh0ZXJtc1tqXS5saWtlKHRlcm1zW2ldKSkge1xuICAgICAgICAgIG5ld3Rlcm0gPSBuZXd0ZXJtLmFkZCh0ZXJtc1tqXSlcbiAgICAgICAgICB0ZXJtc1tqXSA9IG51bGxcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbmV3dGVybXMucHVzaChuZXd0ZXJtKVxuICAgICAgdGVybXNbaV0gPSBudWxsXG4gICAgfVxuICAgIG5ld3Rlcm1zID0gbmV3dGVybXMuZmlsdGVyKHQgPT4gdC5jICE9PSAwKVxuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbChuZXd0ZXJtcylcbiAgfVxuXG4gIGFkZCAodGhhdCwgc2ltcGxpZnkpIHtcbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgUG9seW5vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgUG9seW5vbWlhbCh0aGF0KVxuICAgIH1cbiAgICBpZiAoc2ltcGxpZnkgPT09IHVuZGVmaW5lZCkgc2ltcGxpZnkgPSB0cnVlXG4gICAgY29uc3QgdGVybXMgPSB0aGlzLnRlcm1zLmNvbmNhdCh0aGF0LnRlcm1zKVxuICAgIGxldCByZXN1bHQgPSBuZXcgUG9seW5vbWlhbCh0ZXJtcylcblxuICAgIGlmIChzaW1wbGlmeSkgcmVzdWx0ID0gcmVzdWx0LnNpbXBsaWZ5KClcblxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIG11bCAodGhhdCwgc2ltcGxpZnkpIHtcbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgUG9seW5vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgUG9seW5vbWlhbCh0aGF0KVxuICAgIH1cbiAgICBjb25zdCB0ZXJtcyA9IFtdXG4gICAgaWYgKHNpbXBsaWZ5ID09PSB1bmRlZmluZWQpIHNpbXBsaWZ5ID0gdHJ1ZVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50ZXJtcy5sZW5ndGg7IGkrKykge1xuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB0aGF0LnRlcm1zLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHRlcm1zLnB1c2godGhpcy50ZXJtc1tpXS5tdWwodGhhdC50ZXJtc1tqXSkpXG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IHJlc3VsdCA9IG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuICAgIGlmIChzaW1wbGlmeSkgcmVzdWx0ID0gcmVzdWx0LnNpbXBsaWZ5KClcblxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIHBvdyAobiwgc2ltcGxpZnkpIHtcbiAgICBsZXQgcmVzdWx0ID0gdGhpc1xuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbjsgaSsrKSB7XG4gICAgICByZXN1bHQgPSByZXN1bHQubXVsKHRoaXMpXG4gICAgfVxuICAgIGlmIChzaW1wbGlmeSkgcmVzdWx0ID0gcmVzdWx0LnNpbXBsaWZ5KClcbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICBzdGF0aWMgdmFyICh2KSB7XG4gICAgLy8gZmFjdG9yeSBmb3IgYSBzaW5nbGUgdmFyaWFibGUgcG9seW5vbWlhbFxuICAgIGNvbnN0IHRlcm1zID0gW01vbm9taWFsLnZhcih2KV1cbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwodGVybXMpXG4gIH1cblxuICBzdGF0aWMgeCAoKSB7XG4gICAgcmV0dXJuIFBvbHlub21pYWwudmFyKCd4JylcbiAgfVxuXG4gIHN0YXRpYyBjb25zdCAobikge1xuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbChuKVxuICB9XG59XG4iLCJpbXBvcnQgeyBHcmFwaGljUSwgR3JhcGhpY1FWaWV3IH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgRnJhY3Rpb24gZnJvbSAnZnJhY3Rpb24uanMnXG5pbXBvcnQgUG9seW5vbWlhbCBmcm9tICdQb2x5bm9taWFsJ1xuaW1wb3J0IHsgcmFuZEVsZW0sIHJhbmRCZXR3ZWVuLCByYW5kQmV0d2VlbkZpbHRlciwgZ2NkIH0gZnJvbSAndXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBcml0aG1hZ29uUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBjb25zdCBkYXRhID0gbmV3IEFyaXRobWFnb25RRGF0YShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgQXJpdGhtYWdvblFWaWV3KGRhdGEsIG9wdGlvbnMpXG4gICAgc3VwZXIoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgeyByZXR1cm4gJ0NvbXBsZXRlIHRoZSBhcml0aG1hZ29uOicgfVxufVxuXG5Bcml0aG1hZ29uUS5vcHRpb25zU3BlYyA9IFtcbiAge1xuICAgIHRpdGxlOiAnVmVydGljZXMnLFxuICAgIGlkOiAnbicsXG4gICAgdHlwZTogJ2ludCcsXG4gICAgbWluOiAzLFxuICAgIG1heDogMjAsXG4gICAgZGVmYXVsdDogM1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdUeXBlJyxcbiAgICBpZDogJ3R5cGUnLFxuICAgIHR5cGU6ICdzZWxlY3QtZXhjbHVzaXZlJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICB7IHRpdGxlOiAnSW50ZWdlciAoKyknLCBpZDogJ2ludGVnZXItYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0ludGVnZXIgKFxcdTAwZDcpJywgaWQ6ICdpbnRlZ2VyLW11bHRpcGx5JyB9LFxuICAgICAgeyB0aXRsZTogJ0ZyYWN0aW9uICgrKScsIGlkOiAnZnJhY3Rpb24tYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0ZyYWN0aW9uIChcXHUwMGQ3KScsIGlkOiAnZnJhY3Rpb24tbXVsdGlwbHknIH0sXG4gICAgICB7IHRpdGxlOiAnQWxnZWJyYSAoKyknLCBpZDogJ2FsZ2VicmEtYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0FsZ2VicmEgKFxcdTAwZDcpJywgaWQ6ICdhbGdlYnJhLW11bHRpcGx5JyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiAnaW50ZWdlci1hZGQnLFxuICAgIHZlcnRpY2FsOiB0cnVlXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1B1enpsZSB0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgaWQ6ICdwdXpfZGlmZicsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ01pc3NpbmcgZWRnZXMnLCBpZDogJzEnIH0sXG4gICAgICB7IHRpdGxlOiAnTWl4ZWQnLCBpZDogJzInIH0sXG4gICAgICB7IHRpdGxlOiAnTWlzc2luZyB2ZXJ0aWNlcycsIGlkOiAnMycgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogJzEnXG4gIH1cbl1cblxuY2xhc3MgQXJpdGhtYWdvblFEYXRhIC8qIGV4dGVuZHMgR3JhcGhpY1FEYXRhICovIHtcbiAgLy8gVE9ETyBzaW1wbGlmeSBjb25zdHJ1Y3Rvci4gTW92ZSBsb2dpYyBpbnRvIHN0YXRpYyBmYWN0b3J5IG1ldGhvZHNcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICAvLyAxLiBTZXQgcHJvcGVydGllcyBmcm9tIG9wdGlvbnNcbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIG46IDMsIC8vIG51bWJlciBvZiB2ZXJ0aWNlc1xuICAgICAgbWluOiAtMjAsXG4gICAgICBtYXg6IDIwLFxuICAgICAgbnVtX2RpZmY6IDEsIC8vIGNvbXBsZXhpdHkgb2Ygd2hhdCdzIGluIHZlcnRpY2VzL2VkZ2VzXG4gICAgICBwdXpfZGlmZjogMSwgLy8gMSAtIFZlcnRpY2VzIGdpdmVuLCAyIC0gdmVydGljZXMvZWRnZXM7IGdpdmVuIDMgLSBvbmx5IGVkZ2VzXG4gICAgICB0eXBlOiAnaW50ZWdlci1hZGQnIC8vIFt0eXBlXS1bb3BlcmF0aW9uXSB3aGVyZSBbdHlwZV0gPSBpbnRlZ2VyLCAuLi5cbiAgICAgIC8vIGFuZCBbb3BlcmF0aW9uXSA9IGFkZC9tdWx0aXBseVxuICAgIH1cblxuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgdGhpcy5zZXR0aW5ncywgb3B0aW9ucylcbiAgICB0aGlzLnNldHRpbmdzLm51bV9kaWZmID0gdGhpcy5zZXR0aW5ncy5kaWZmaWN1bHR5XG4gICAgdGhpcy5zZXR0aW5ncy5wdXpfZGlmZiA9IHBhcnNlSW50KHRoaXMuc2V0dGluZ3MucHV6X2RpZmYpIC8vISA/IFRoaXMgc2hvdWxkIGhhdmUgYmVlbiBkb25lIHVwc3RyZWFtLi4uXG5cbiAgICB0aGlzLm4gPSB0aGlzLnNldHRpbmdzLm5cbiAgICB0aGlzLnZlcnRpY2VzID0gW11cbiAgICB0aGlzLnNpZGVzID0gW11cblxuICAgIGlmICh0aGlzLnNldHRpbmdzLnR5cGUuZW5kc1dpdGgoJ2FkZCcpKSB7XG4gICAgICB0aGlzLm9wbmFtZSA9ICcrJ1xuICAgICAgdGhpcy5vcCA9ICh4LCB5KSA9PiB4LmFkZCh5KVxuICAgIH0gZWxzZSBpZiAodGhpcy5zZXR0aW5ncy50eXBlLmVuZHNXaXRoKCdtdWx0aXBseScpKSB7XG4gICAgICB0aGlzLm9wbmFtZSA9ICdcXHUwMGQ3J1xuICAgICAgdGhpcy5vcCA9ICh4LCB5KSA9PiB4Lm11bCh5KVxuICAgIH1cblxuICAgIC8vIDIuIEluaXRpYWxpc2UgYmFzZWQgb24gdHlwZVxuICAgIHN3aXRjaCAodGhpcy5zZXR0aW5ncy50eXBlKSB7XG4gICAgICBjYXNlICdpbnRlZ2VyLWFkZCc6XG4gICAgICBjYXNlICdpbnRlZ2VyLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0SW50ZWdlcih0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnZnJhY3Rpb24tYWRkJzpcbiAgICAgICAgdGhpcy5pbml0RnJhY3Rpb25BZGQodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2ZyYWN0aW9uLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0RnJhY3Rpb25NdWx0aXBseSh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnYWxnZWJyYS1hZGQnOlxuICAgICAgICB0aGlzLmluaXRBbGdlYnJhQWRkKHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdhbGdlYnJhLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0QWxnZWJyYU11bHRpcGx5KHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgc3dpdGNoIGRlZmF1bHQnKVxuICAgIH1cblxuICAgIHRoaXMuY2FsY3VsYXRlRWRnZXMoKSAvLyBVc2Ugb3AgZnVuY3Rpb25zIHRvIGZpbGwgaW4gdGhlIGVkZ2VzXG4gICAgdGhpcy5oaWRlTGFiZWxzKHRoaXMuc2V0dGluZ3MucHV6X2RpZmYpIC8vIHNldCBzb21lIHZlcnRpY2VzL2VkZ2VzIGFzIGhpZGRlbiBkZXBlbmRpbmcgb24gZGlmZmljdWx0eVxuICB9XG5cbiAgLyogTWV0aG9kcyBpbml0aWFsaXNpbmcgdmVydGljZXMgKi9cblxuICBpbml0SW50ZWdlciAoc2V0dGluZ3MpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihyYW5kQmV0d2VlbkZpbHRlcihcbiAgICAgICAgICBzZXR0aW5ncy5taW4sXG4gICAgICAgICAgc2V0dGluZ3MubWF4LFxuICAgICAgICAgIHggPT4gKHNldHRpbmdzLnR5cGUuZW5kc1dpdGgoJ2FkZCcpIHx8IHggIT09IDApXG4gICAgICAgICkpLFxuICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEZyYWN0aW9uQWRkIChzZXR0aW5ncykge1xuICAgIC8qIERpZmZpY3VsdHkgc2V0dGluZ3M6XG4gICAgICogMTogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIHNhbWUgZGVub21pbmF0b3IsIG5vIGNhbmNlbGxpbmcgYWZ0ZXIgRE9ORVxuICAgICAqIDI6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBzYW1lIGRlbm9taW5hdG9yLCBubyBjYW5jZWxsbGluZyBhbnN3ZXIgaW1wcm9wZXIgZnJhY3Rpb25cbiAgICAgKiAzOiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggb25lIGRlbm9taW5hdG9yIGEgbXVsdGlwbGUgb2YgYW5vdGhlciwgZ2l2ZXMgcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNDogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIG9uZSBkZW5vbWluYXRvciBhIG11bHRpcGxlIG9mIGFub3RoZXIsIGdpdmVzIGltcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNTogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIGRpZmZlcmVudCBkZW5vbWluYXRvcnMgKG5vdCBjby1wcmltZSksIGdpdmVzIGltcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNjogbWl4ZWQgbnVtYmVyc1xuICAgICAqIDc6IG1peGVkIG51bWJlcnMsIGJpZ2dlciBudW1lcmF0b3JzIGFuZCBkZW5vbWluYXRvcnNcbiAgICAgKiA4OiBtaXhlZCBudW1iZXJzLCBiaWcgaW50ZWdlciBwYXJ0c1xuICAgICAqL1xuXG4gICAgLy8gVE9ETyAtIGFueXRoaW5nIG90aGVyIHRoYW4gZGlmZmljdWx0eSAxLlxuICAgIGNvbnN0IGRpZmYgPSBzZXR0aW5ncy5udW1fZGlmZlxuICAgIGlmIChkaWZmIDwgMykge1xuICAgICAgY29uc3QgZGVuID0gcmFuZEVsZW0oWzUsIDcsIDksIDExLCAxMywgMTddKVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICBjb25zdCBwcmV2bnVtID0gdGhpcy52ZXJ0aWNlc1tpIC0gMV1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbaSAtIDFdLnZhbC5uIDogdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IG5leHRudW0gPSB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dLnZhbC5uIDogdW5kZWZpbmVkXG5cbiAgICAgICAgY29uc3QgbWF4bnVtID1cbiAgICAgICAgICBkaWZmID09PSAyID8gZGVuIC0gMVxuICAgICAgICAgICAgOiBuZXh0bnVtID8gZGVuIC0gTWF0aC5tYXgobmV4dG51bSwgcHJldm51bSlcbiAgICAgICAgICAgICAgOiBwcmV2bnVtID8gZGVuIC0gcHJldm51bVxuICAgICAgICAgICAgICAgIDogZGVuIC0gMVxuXG4gICAgICAgIGNvbnN0IG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKDEsIG1heG51bSwgeCA9PiAoXG4gICAgICAgICAgLy8gRW5zdXJlcyBubyBzaW1wbGlmaW5nIGFmdGVyd2FyZHMgaWYgZGlmZmljdWx0eSBpcyAxXG4gICAgICAgICAgZ2NkKHgsIGRlbikgPT09IDEgJiZcbiAgICAgICAgICAoIXByZXZudW0gfHwgZ2NkKHggKyBwcmV2bnVtLCBkZW4pID09PSAxIHx8IHggKyBwcmV2bnVtID09PSBkZW4pICYmXG4gICAgICAgICAgKCFuZXh0bnVtIHx8IGdjZCh4ICsgbmV4dG51bSwgZGVuKSA9PT0gMSB8fCB4ICsgbmV4dG51bSA9PT0gZGVuKVxuICAgICAgICApKVxuXG4gICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24obnVtLCBkZW4pLFxuICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBkZW5iYXNlID0gcmFuZEVsZW0oXG4gICAgICAgIGRpZmYgPCA3ID8gWzIsIDMsIDVdIDogWzIsIDMsIDQsIDUsIDYsIDcsIDgsIDksIDEwLCAxMV1cbiAgICAgIClcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgY29uc3QgcHJldiA9IHRoaXMudmVydGljZXNbaSAtIDFdXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzW2kgLSAxXS52YWwgOiB1bmRlZmluZWRcbiAgICAgICAgY29uc3QgbmV4dCA9IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl0udmFsIDogdW5kZWZpbmVkXG5cbiAgICAgICAgY29uc3QgbWF4bXVsdGlwbGllciA9IGRpZmYgPCA3ID8gNCA6IDhcblxuICAgICAgICBjb25zdCBtdWx0aXBsaWVyID1cbiAgICAgICAgICBpICUgMiA9PT0gMSB8fCBkaWZmID4gNCA/IHJhbmRCZXR3ZWVuRmlsdGVyKDIsIG1heG11bHRpcGxpZXIsIHggPT5cbiAgICAgICAgICAgICghcHJldiB8fCB4ICE9PSBwcmV2LmQgLyBkZW5iYXNlKSAmJlxuICAgICAgICAgICAgKCFuZXh0IHx8IHggIT09IG5leHQuZCAvIGRlbmJhc2UpXG4gICAgICAgICAgKSA6IDFcblxuICAgICAgICBjb25zdCBkZW4gPSBkZW5iYXNlICogbXVsdGlwbGllclxuXG4gICAgICAgIGxldCBudW1cbiAgICAgICAgaWYgKGRpZmYgPCA2KSB7XG4gICAgICAgICAgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoMSwgZGVuIC0gMSwgeCA9PiAoXG4gICAgICAgICAgICBnY2QoeCwgZGVuKSA9PT0gMSAmJlxuICAgICAgICAgICAgKGRpZmYgPj0gNCB8fCAhcHJldiB8fCBwcmV2LmFkZCh4LCBkZW4pIDw9IDEpICYmXG4gICAgICAgICAgICAoZGlmZiA+PSA0IHx8ICFuZXh0IHx8IG5leHQuYWRkKHgsIGRlbikgPD0gMSlcbiAgICAgICAgICApKVxuICAgICAgICB9IGVsc2UgaWYgKGRpZmYgPCA4KSB7XG4gICAgICAgICAgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoZGVuICsgMSwgZGVuICogNiwgeCA9PiBnY2QoeCwgZGVuKSA9PT0gMSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBudW0gPSByYW5kQmV0d2VlbkZpbHRlcihkZW4gKiAxMCwgZGVuICogMTAwLCB4ID0+IGdjZCh4LCBkZW4pID09PSAxKVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihudW0sIGRlbiksXG4gICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEZyYWN0aW9uTXVsdGlwbHkgKHNldHRpbmdzKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgY29uc3QgZCA9IHJhbmRCZXR3ZWVuKDIsIDEwKVxuICAgICAgY29uc3QgbiA9IHJhbmRCZXR3ZWVuKDEsIGQgLSAxKVxuICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24obiwgZCksXG4gICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0QWxnZWJyYUFkZCAoc2V0dGluZ3MpIHtcbiAgICBjb25zdCBkaWZmID0gc2V0dGluZ3MubnVtX2RpZmZcbiAgICBzd2l0Y2ggKGRpZmYpIHtcbiAgICAgIGNhc2UgMToge1xuICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2YXJpYWJsZSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDI6XG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGlmIChNYXRoLnJhbmRvbSgpIDwgMC41KSB7IC8vIHZhcmlhYmxlICsgY29uc3RhbnRcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgY29uc3RhbnQgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbChjb2VmZiArIHZhcmlhYmxlICsgJysnICsgY29uc3RhbnQpLFxuICAgICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IHZhcmlhYmxlMSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgICAgbGV0IHZhcmlhYmxlMiA9IHZhcmlhYmxlMVxuICAgICAgICAgIHdoaWxlICh2YXJpYWJsZTIgPT09IHZhcmlhYmxlMSkge1xuICAgICAgICAgICAgdmFyaWFibGUyID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBjb2VmZjEgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgY29lZmYyID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYxICsgdmFyaWFibGUxICsgJysnICsgY29lZmYyICsgdmFyaWFibGUyKSxcbiAgICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRBbGdlYnJhTXVsdGlwbHkgKHNldHRpbmdzKSB7XG4gICAgLyogRGlmZmljdWx0eTpcbiAgICAgKiAxOiBBbHRlcm5hdGUgM2Egd2l0aCA0XG4gICAgICogMjogQWxsIHRlcm1zIG9mIHRoZSBmb3JtIG52IC0gdXAgdG8gdHdvIHZhcmlhYmxlc1xuICAgICAqIDM6IEFsbCB0ZXJtcyBvZiB0aGUgZm9ybSBudl5tLiBPbmUgdmFyaWFibGUgb25seVxuICAgICAqIDQ6IEFMbCB0ZXJtcyBvZiB0aGUgZm9ybSBueF5rIHlebCB6XnAuIGssbCxwIDAtM1xuICAgICAqIDU6IEV4cGFuZCBicmFja2V0cyAzKDJ4KzUpXG4gICAgICogNjogRXhwYW5kIGJyYWNrZXRzIDN4KDJ4KzUpXG4gICAgICogNzogRXhwYW5kIGJyYWNrZXRzIDN4XjJ5KDJ4eSs1eV4yKVxuICAgICAqIDg6IEV4cGFuZCBicmFja2V0cyAoeCszKSh4KzIpXG4gICAgICogOTogRXhwYW5kIGJyYWNrZXRzICgyeC0zKSgzeCs0KVxuICAgICAqIDEwOiBFeHBhbmQgYnJhY2tldHMgKDJ4XjItM3grNCkoMngtNSlcbiAgICAgKi9cbiAgICBjb25zdCBkaWZmID0gc2V0dGluZ3MubnVtX2RpZmZcbiAgICBzd2l0Y2ggKGRpZmYpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgIHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IHRlcm0gPSBpICUgMiA9PT0gMCA/IGNvZWZmIDogY29lZmYgKyB2YXJpYWJsZVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDI6IHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUxID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgY29uc3QgdmFyaWFibGUyID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZSA9IHJhbmRFbGVtKFt2YXJpYWJsZTEsIHZhcmlhYmxlMl0pXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2YXJpYWJsZSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgMzoge1xuICAgICAgICBjb25zdCB2ID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBpZHggPSByYW5kQmV0d2VlbigxLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2ICsgJ14nICsgaWR4KSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSA0OiB7XG4gICAgICAgIGNvbnN0IHN0YXJ0QXNjaWkgPSByYW5kQmV0d2Vlbig5NywgMTIwKVxuICAgICAgICBjb25zdCB2MSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSlcbiAgICAgICAgY29uc3QgdjIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkgKyAxKVxuICAgICAgICBjb25zdCB2MyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSArIDIpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBhID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMSA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMiA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMyA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCB0ZXJtID0gYSArIHYxICsgbjEgKyB2MiArIG4yICsgdjMgKyBuM1xuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDU6XG4gICAgICBjYXNlIDY6IHsgLy8gZS5nLiAzKHgpICogKDJ4LTUpXG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBjb25zdGFudCA9IHJhbmRCZXR3ZWVuKC05LCA5KS50b1N0cmluZygpXG4gICAgICAgICAgbGV0IHRlcm0gPSBjb2VmZlxuICAgICAgICAgIGlmIChkaWZmID09PSA2IHx8IGkgJSAyID09PSAxKSB0ZXJtICs9IHZhcmlhYmxlXG4gICAgICAgICAgaWYgKGkgJSAyID09PSAxKSB0ZXJtICs9ICcrJyArIGNvbnN0YW50XG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgNzogeyAvLyBlLmcuIDN4XjJ5KDR4eV4yKzV4eSlcbiAgICAgICAgY29uc3Qgc3RhcnRBc2NpaSA9IHJhbmRCZXR3ZWVuKDk3LCAxMjApXG4gICAgICAgIGNvbnN0IHYxID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpKVxuICAgICAgICBjb25zdCB2MiA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSArIDEpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBhMSA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjExID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4xMiA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBsZXQgdGVybSA9IGExICsgdjEgKyBuMTEgKyB2MiArIG4xMlxuICAgICAgICAgIGlmIChpICUgMiA9PT0gMSkge1xuICAgICAgICAgICAgY29uc3QgYTIgPSByYW5kQmV0d2VlbigtOSwgOSkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgbjIxID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgbjIyID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgICAgdGVybSArPSAnKycgKyBhMiArIHYxICsgbjIxICsgdjIgKyBuMjJcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgODogLy8geyBlLmcuICh4KzUpICogKHgtMilcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29uc3RhbnQgPSByYW5kQmV0d2VlbigtOSwgOSkudG9TdHJpbmcoKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHZhcmlhYmxlICsgJysnICsgY29uc3RhbnQpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qIE1ldGhvZCB0byBjYWxjdWxhdGUgZWRnZXMgZnJvbSB2ZXJ0aWNlcyAqL1xuICBjYWxjdWxhdGVFZGdlcyAoKSB7XG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBlZGdlcyBnaXZlbiB0aGUgdmVydGljZXMgdXNpbmcgdGhpcy5vcFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIHRoaXMuc2lkZXNbaV0gPSB7XG4gICAgICAgIHZhbDogdGhpcy5vcCh0aGlzLnZlcnRpY2VzW2ldLnZhbCwgdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXS52YWwpLFxuICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyogTWFyayBoaWRkZW5kIGVkZ2VzL3ZlcnRpY2VzICovXG5cbiAgaGlkZUxhYmVscyAocHV6emxlRGlmZmljdWx0eSkge1xuICAgIC8vIEhpZGUgc29tZSBsYWJlbHMgdG8gbWFrZSBhIHB1enpsZVxuICAgIC8vIDEgLSBTaWRlcyBoaWRkZW4sIHZlcnRpY2VzIHNob3duXG4gICAgLy8gMiAtIFNvbWUgc2lkZXMgaGlkZGVuLCBzb21lIHZlcnRpY2VzIGhpZGRlblxuICAgIC8vIDMgLSBBbGwgdmVydGljZXMgaGlkZGVuXG4gICAgc3dpdGNoIChwdXp6bGVEaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHRoaXMuc2lkZXMuZm9yRWFjaCh4ID0+IHsgeC5oaWRkZW4gPSB0cnVlIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDI6IHtcbiAgICAgICAgdGhpcy5zaWRlcy5mb3JFYWNoKHggPT4geyB4LmhpZGRlbiA9IHRydWUgfSlcbiAgICAgICAgY29uc3Qgc2hvd3NpZGUgPSByYW5kQmV0d2VlbigwLCB0aGlzLm4gLSAxLCBNYXRoLnJhbmRvbSlcbiAgICAgICAgY29uc3QgaGlkZXZlcnQgPSBNYXRoLnJhbmRvbSgpIDwgMC41XG4gICAgICAgICAgPyBzaG93c2lkZSAvLyBwcmV2aW91cyB2ZXJ0ZXhcbiAgICAgICAgICA6IChzaG93c2lkZSArIDEpICUgdGhpcy5uIC8vIG5leHQgdmVydGV4O1xuXG4gICAgICAgIHRoaXMuc2lkZXNbc2hvd3NpZGVdLmhpZGRlbiA9IGZhbHNlXG4gICAgICAgIHRoaXMudmVydGljZXNbaGlkZXZlcnRdLmhpZGRlbiA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgMzpcbiAgICAgICAgdGhpcy52ZXJ0aWNlcy5mb3JFYWNoKHggPT4geyB4LmhpZGRlbiA9IHRydWUgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm9fZGlmZmljdWx0eScpXG4gICAgfVxuICB9XG59XG5cbmNsYXNzIEFyaXRobWFnb25RVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIGNvbnN0cnVjdG9yIChkYXRhLCBvcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc2V0cyB0aGlzLndpZHRoIHRoaXMuaGVpZ2h0LCBpbml0aWFsaXNlcyB0aGlzLmxhYmVscywgY3JlYXRlcyBkb20gZWxlbWVudHNcblxuICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aFxuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuaGVpZ2h0XG4gICAgY29uc3QgciA9IDAuMzUgKiBNYXRoLm1pbih3aWR0aCwgaGVpZ2h0KSAvLyByYWRpdXNcbiAgICBjb25zdCBuID0gdGhpcy5kYXRhLm5cblxuICAgIC8vIEEgcG9pbnQgdG8gbGFiZWwgd2l0aCB0aGUgb3BlcmF0aW9uXG4gICAgLy8gQWxsIHBvaW50cyBmaXJzdCBzZXQgdXAgd2l0aCAoMCwwKSBhdCBjZW50ZXJcbiAgICB0aGlzLm9wZXJhdGlvblBvaW50ID0gbmV3IFBvaW50KDAsIDApXG5cbiAgICAvLyBQb3NpdGlvbiBvZiB2ZXJ0aWNlc1xuICAgIHRoaXMudmVydGV4UG9pbnRzID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgY29uc3QgYW5nbGUgPSBpICogTWF0aC5QSSAqIDIgLyBuIC0gTWF0aC5QSSAvIDJcbiAgICAgIHRoaXMudmVydGV4UG9pbnRzW2ldID0gUG9pbnQuZnJvbVBvbGFyKHIsIGFuZ2xlKVxuICAgIH1cblxuICAgIC8vIFBvaXNpdGlvbiBvZiBzaWRlIGxhYmVsc1xuICAgIHRoaXMuc2lkZVBvaW50cyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIHRoaXMuc2lkZVBvaW50c1tpXSA9IFBvaW50Lm1lYW4odGhpcy52ZXJ0ZXhQb2ludHNbaV0sIHRoaXMudmVydGV4UG9pbnRzWyhpICsgMSkgJSBuXSlcbiAgICB9XG5cbiAgICB0aGlzLmFsbFBvaW50cyA9IFt0aGlzLm9wZXJhdGlvblBvaW50XS5jb25jYXQodGhpcy52ZXJ0ZXhQb2ludHMpLmNvbmNhdCh0aGlzLnNpZGVQb2ludHMpXG5cbiAgICB0aGlzLnJlQ2VudGVyKCkgLy8gUmVwb3NpdGlvbiBldmVyeXRoaW5nIHByb3Blcmx5XG5cbiAgICB0aGlzLm1ha2VMYWJlbHModHJ1ZSlcblxuICAgIC8vIERyYXcgaW50byBjYW52YXNcbiAgfVxuXG4gIHJlQ2VudGVyICgpIHtcbiAgICAvLyBGaW5kIHRoZSBjZW50ZXIgb2YgdGhlIGJvdW5kaW5nIGJveFxuICAgIGNvbnN0IHRvcGxlZnQgPSBQb2ludC5taW4odGhpcy5hbGxQb2ludHMpXG4gICAgY29uc3QgYm90dG9tcmlnaHQgPSBQb2ludC5tYXgodGhpcy5hbGxQb2ludHMpXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbih0b3BsZWZ0LCBib3R0b21yaWdodClcblxuICAgIC8vIHRyYW5zbGF0ZSB0byBwdXQgaW4gdGhlIGNlbnRlclxuICAgIHRoaXMuYWxsUG9pbnRzLmZvckVhY2gocCA9PiB7XG4gICAgICBwLnRyYW5zbGF0ZSh0aGlzLndpZHRoIC8gMiAtIGNlbnRlci54LCB0aGlzLmhlaWdodCAvIDIgLSBjZW50ZXIueSlcbiAgICB9KVxuICB9XG5cbiAgbWFrZUxhYmVscyAoKSB7XG4gICAgLy8gdmVydGljZXNcbiAgICB0aGlzLmRhdGEudmVydGljZXMuZm9yRWFjaCgodiwgaSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSB2LnZhbC50b0xhdGV4XG4gICAgICAgID8gdi52YWwudG9MYXRleCh0cnVlKVxuICAgICAgICA6IHYudmFsLnRvU3RyaW5nKClcbiAgICAgIHRoaXMubGFiZWxzLnB1c2goe1xuICAgICAgICBwb3M6IHRoaXMudmVydGV4UG9pbnRzW2ldLFxuICAgICAgICB0ZXh0cTogdi5oaWRkZW4gPyAnJyA6IHZhbHVlLFxuICAgICAgICB0ZXh0YTogdmFsdWUsXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCB2ZXJ0ZXgnLFxuICAgICAgICBzdHlsZWE6IHYuaGlkZGVuID8gJ2Fuc3dlciB2ZXJ0ZXgnIDogJ25vcm1hbCB2ZXJ0ZXgnXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBzaWRlc1xuICAgIHRoaXMuZGF0YS5zaWRlcy5mb3JFYWNoKCh2LCBpKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHYudmFsLnRvTGF0ZXhcbiAgICAgICAgPyB2LnZhbC50b0xhdGV4KHRydWUpXG4gICAgICAgIDogdi52YWwudG9TdHJpbmcoKVxuICAgICAgdGhpcy5sYWJlbHMucHVzaCh7XG4gICAgICAgIHBvczogdGhpcy5zaWRlUG9pbnRzW2ldLFxuICAgICAgICB0ZXh0cTogdi5oaWRkZW4gPyAnJyA6IHZhbHVlLFxuICAgICAgICB0ZXh0YTogdmFsdWUsXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCBzaWRlJyxcbiAgICAgICAgc3R5bGVhOiB2LmhpZGRlbiA/ICdhbnN3ZXIgc2lkZScgOiAnbm9ybWFsIHNpZGUnXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBvcGVyYXRpb25cbiAgICB0aGlzLmxhYmVscy5wdXNoKHtcbiAgICAgIHBvczogdGhpcy5vcGVyYXRpb25Qb2ludCxcbiAgICAgIHRleHRxOiB0aGlzLmRhdGEub3BuYW1lLFxuICAgICAgdGV4dGE6IHRoaXMuZGF0YS5vcG5hbWUsXG4gICAgICBzdHlsZXE6ICdub3JtYWwnLFxuICAgICAgc3R5bGVhOiAnbm9ybWFsJ1xuICAgIH0pXG5cbiAgICAvLyBzdHlsaW5nXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gIH1cblxuICByZW5kZXIgKCkge1xuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICBjb25zdCBuID0gdGhpcy5kYXRhLm5cblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBjb25zdCBwID0gdGhpcy52ZXJ0ZXhQb2ludHNbaV1cbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnZlcnRleFBvaW50c1soaSArIDEpICUgbl1cbiAgICAgIGN0eC5tb3ZlVG8ocC54LCBwLnkpXG4gICAgICBjdHgubGluZVRvKG5leHQueCwgbmV4dC55KVxuICAgIH1cbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIC8vIHBsYWNlIGxhYmVsc1xuICAgIHRoaXMucmVuZGVyTGFiZWxzKHRydWUpXG4gIH1cblxuICBzaG93QW5zd2VyICgpIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0YVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVhXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyh0cnVlKVxuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyh0cnVlKVxuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICB9XG59XG4iLCJpbXBvcnQgeyByYW5kQmV0d2VlbiB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCBGcmFjdGlvbiBmcm9tICdmcmFjdGlvbi5qcydcblxuLyogTWFpbiBxdWVzdGlvbiBjbGFzcy4gVGhpcyB3aWxsIGJlIHNwdW4gb2ZmIGludG8gZGlmZmVyZW50IGZpbGUgYW5kIGdlbmVyYWxpc2VkICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFcXVhdGlvbk9mTGluZSBleHRlbmRzIFRleHRRIHtcbiAgLy8gJ2V4dGVuZHMnIFF1ZXN0aW9uLCBidXQgbm90aGluZyB0byBhY3R1YWxseSBleHRlbmRcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICAvLyBib2lsZXJwbGF0ZVxuICAgIHN1cGVyKClcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogMlxuICAgIH1cblxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG4gICAgY29uc3QgZGlmZmljdWx0eSA9IE1hdGguY2VpbChzZXR0aW5ncy5kaWZmaWN1bHR5IC8gMikgLy8gaW5pdGlhbGx5IHdyaXR0ZW4gZm9yIGRpZmZpY3VsdHkgMS00LCBub3cgbmVlZCAxLTEwXG5cbiAgICAvLyBxdWVzdGlvbiBnZW5lcmF0aW9uIGJlZ2lucyBoZXJlXG4gICAgbGV0IG0sIGMsIHgxLCB5MSwgeDIsIHkyXG4gICAgbGV0IG1pbm0sIG1heG0sIG1pbmMsIG1heGNcblxuICAgIHN3aXRjaCAoZGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOiAvLyBtPjAsIGM+PTBcbiAgICAgIGNhc2UgMjpcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgbWlubSA9IGRpZmZpY3VsdHkgPCAzID8gMSA6IC01XG4gICAgICAgIG1heG0gPSA1XG4gICAgICAgIG1pbmMgPSBkaWZmaWN1bHR5IDwgMiA/IDAgOiAtMTBcbiAgICAgICAgbWF4YyA9IDEwXG4gICAgICAgIG0gPSByYW5kQmV0d2VlbihtaW5tLCBtYXhtKVxuICAgICAgICBjID0gcmFuZEJldHdlZW4obWluYywgbWF4YylcbiAgICAgICAgeDEgPSBkaWZmaWN1bHR5IDwgMyA/IHJhbmRCZXR3ZWVuKDAsIDEwKSA6IHJhbmRCZXR3ZWVuKC0xNSwgMTUpXG4gICAgICAgIHkxID0gbSAqIHgxICsgY1xuXG4gICAgICAgIGlmIChkaWZmaWN1bHR5IDwgMykge1xuICAgICAgICAgIHgyID0gcmFuZEJldHdlZW4oeDEgKyAxLCAxNSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB4MiA9IHgxXG4gICAgICAgICAgd2hpbGUgKHgyID09PSB4MSkgeyB4MiA9IHJhbmRCZXR3ZWVuKC0xNSwgMTUpIH07XG4gICAgICAgIH1cbiAgICAgICAgeTIgPSBtICogeDIgKyBjXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ6IC8vIG0gZnJhY3Rpb24sIHBvaW50cyBhcmUgaW50ZWdlcnNcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgY29uc3QgbWQgPSByYW5kQmV0d2VlbigxLCA1KVxuICAgICAgICBjb25zdCBtbiA9IHJhbmRCZXR3ZWVuKC01LCA1KVxuICAgICAgICBtID0gbmV3IEZyYWN0aW9uKG1uLCBtZClcbiAgICAgICAgeDEgPSBuZXcgRnJhY3Rpb24ocmFuZEJldHdlZW4oLTEwLCAxMCkpXG4gICAgICAgIHkxID0gbmV3IEZyYWN0aW9uKHJhbmRCZXR3ZWVuKC0xMCwgMTApKVxuICAgICAgICBjID0gbmV3IEZyYWN0aW9uKHkxKS5zdWIobS5tdWwoeDEpKVxuICAgICAgICB4MiA9IHgxLmFkZChyYW5kQmV0d2VlbigxLCA1KSAqIG0uZClcbiAgICAgICAgeTIgPSBtLm11bCh4MikuYWRkKGMpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgeHN0ciA9XG4gICAgICAobSA9PT0gMCB8fCAobS5lcXVhbHMgJiYgbS5lcXVhbHMoMCkpKSA/ICcnXG4gICAgICAgIDogKG0gPT09IDEgfHwgKG0uZXF1YWxzICYmIG0uZXF1YWxzKDEpKSkgPyAneCdcbiAgICAgICAgICA6IChtID09PSAtMSB8fCAobS5lcXVhbHMgJiYgbS5lcXVhbHMoLTEpKSkgPyAnLXgnXG4gICAgICAgICAgICA6IChtLnRvTGF0ZXgpID8gbS50b0xhdGV4KCkgKyAneCdcbiAgICAgICAgICAgICAgOiAobSArICd4JylcblxuICAgIGNvbnN0IGNvbnN0c3RyID0gLy8gVE9ETzogV2hlbiBtPWM9MFxuICAgICAgKGMgPT09IDAgfHwgKGMuZXF1YWxzICYmIGMuZXF1YWxzKDApKSkgPyAnJ1xuICAgICAgICA6IChjIDwgMCkgPyAoJyAtICcgKyAoYy5uZWcgPyBjLm5lZygpLnRvTGF0ZXgoKSA6IC1jKSlcbiAgICAgICAgICA6IChjLnRvTGF0ZXgpID8gKCcgKyAnICsgYy50b0xhdGV4KCkpXG4gICAgICAgICAgICA6ICgnICsgJyArIGMpXG5cbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnKCcgKyB4MSArICcsICcgKyB5MSArICcpXFxcXHRleHR7IGFuZCB9KCcgKyB4MiArICcsICcgKyB5MiArICcpJ1xuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAneSA9ICcgKyB4c3RyICsgY29uc3RzdHJcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRmluZCB0aGUgZXF1YXRpb24gb2YgdGhlIGxpbmUgdGhyb3VnaCdcbiAgfVxufVxuIiwiLyogUmVuZGVycyBtaXNzaW5nIGFuZ2xlcyBwcm9ibGVtIHdoZW4gdGhlIGFuZ2xlcyBhcmUgYXQgYSBwb2ludFxuICogSS5lLiBvbiBhIHN0cmFpZ2h0IGxpbmUgb3IgYXJvdW5kIGEgcG9pbnRcbiAqIENvdWxkIGFsc28gYmUgYWRhcHRlZCB0byBhbmdsZXMgZm9ybWluZyBhIHJpZ2h0IGFuZ2xlXG4gKlxuICogU2hvdWxkIGJlIGZsZXhpYmxlIGVub3VnaCBmb3IgbnVtZXJpY2FsIHByb2JsZW1zIG9yIGFsZ2VicmFpYyBvbmVzXG4gKlxuICovXG5cbmltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IEdyYXBoaWNRVmlldywgTGFiZWwgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCB7IHJvdW5kRFAgfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc051bWJlckRhdGEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICByYWRpdXM6IG51bWJlclxuICBPOiBQb2ludFxuICBBOiBQb2ludFxuICBDOiBQb2ludFtdXG4gIHZpZXdBbmdsZXM6IG51bWJlcltdIC8vICdmdWRnZWQnIHZlcnNpb25zIG9mIGRhdGEuYW5nbGVzIGZvciBkaXNwbGF5XG4gIGRhdGEhOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSAvLyBpbml0aWFsaXNlZCBpbiBzdXBlciBjYWxsXG4gIHJvdGF0aW9uOiBudW1iZXJcblxuICBjb25zdHJ1Y3RvciAoZGF0YSA6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhLCBvcHRpb25zIDogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc2V0cyB0aGlzLndpZHRoIHRoaXMuaGVpZ2h0LCBpbml0aWFsaXNlcyB0aGlzLmxhYmVscywgY3JlYXRlcyBkb20gZWxlbWVudHNcbiAgICBjb25zdCB3aWR0aCA9IHRoaXMud2lkdGhcbiAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmhlaWdodFxuICAgIGNvbnN0IHJhZGl1cyA9IHRoaXMucmFkaXVzID0gTWF0aC5taW4od2lkdGgsIGhlaWdodCkgLyAyLjVcbiAgICBjb25zdCBtaW5WaWV3QW5nbGUgPSBvcHRpb25zLm1pblZpZXdBbmdsZSB8fCAyNVxuXG4gICAgdGhpcy52aWV3QW5nbGVzID0gZnVkZ2VBbmdsZXModGhpcy5kYXRhLmFuZ2xlcywgbWluVmlld0FuZ2xlKVxuXG4gICAgLy8gU2V0IHVwIG1haW4gcG9pbnRzXG4gICAgdGhpcy5PID0gbmV3IFBvaW50KDAsIDApIC8vIGNlbnRlciBwb2ludFxuICAgIHRoaXMuQSA9IG5ldyBQb2ludChyYWRpdXMsIDApIC8vIGZpcnN0IHBvaW50XG4gICAgdGhpcy5DID0gW10gLy8gUG9pbnRzIGFyb3VuZCBvdXRzaWRlXG4gICAgbGV0IHRvdGFsYW5nbGUgPSAwIC8vIG5iIGluIHJhZGlhbnNcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZGF0YS5hbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRvdGFsYW5nbGUgKz0gdGhpcy52aWV3QW5nbGVzW2ldICogTWF0aC5QSSAvIDE4MFxuICAgICAgdGhpcy5DW2ldID0gUG9pbnQuZnJvbVBvbGFyKHJhZGl1cywgdG90YWxhbmdsZSlcbiAgICB9XG5cbiAgICAvLyBSYW5kb21seSByb3RhdGUgYW5kIGNlbnRlclxuICAgIHRoaXMucm90YXRpb24gPSAob3B0aW9ucy5yb3RhdGlvbiAhPT0gdW5kZWZpbmVkKSA/IHRoaXMucm90YXRlKG9wdGlvbnMucm90YXRpb24pIDogdGhpcy5yYW5kb21Sb3RhdGUoKVxuICAgIC8vIHRoaXMuc2NhbGVUb0ZpdCh3aWR0aCxoZWlnaHQsMTApXG4gICAgdGhpcy50cmFuc2xhdGUod2lkdGggLyAyLCBoZWlnaHQgLyAyKVxuXG4gICAgLy8gU2V0IHVwIGxhYmVscyAoYWZ0ZXIgc2NhbGluZyBhbmQgcm90YXRpbmcpXG4gICAgdG90YWxhbmdsZSA9IFBvaW50LmFuZ2xlRnJvbSh0aGlzLk8sIHRoaXMuQSkgKiAxODAgLyBNYXRoLlBJIC8vIGFuZ2xlIGZyb20gTyB0aGF0IEEgaXNcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudmlld0FuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gTGFiZWwgdGV4dFxuICAgICAgY29uc3QgbGFiZWwgOiBQYXJ0aWFsPExhYmVsPiA9IHt9XG4gICAgICBjb25zdCB0ZXh0cSA9IHRoaXMuZGF0YS5hbmdsZUxhYmVsc1tpXVxuICAgICAgY29uc3QgdGV4dGEgPSByb3VuZERQKHRoaXMuZGF0YS5hbmdsZXNbaV0sIDIpLnRvU3RyaW5nKCkgKyAnXlxcXFxjaXJjJ1xuXG4gICAgICAvLyBQb3NpdGlvbmluZ1xuICAgICAgY29uc3QgdGhldGEgPSB0aGlzLnZpZXdBbmdsZXNbaV1cbiAgICAgIC8qIGNvdWxkIGJlIHVzZWQgZm9yIG1vcmUgYWR2YW5jZWQgcG9zaXRpb25pbmdcbiAgICAgIGNvbnN0IG1pZEFuZ2xlID0gdG90YWxhbmdsZSArIHRoZXRhIC8gMlxuICAgICAgY29uc3QgbWluRGlzdGFuY2UgPSAwLjMgLy8gYXMgYSBmcmFjdGlvbiBvZiByYWRpdXNcbiAgICAgIGNvbnN0IGxhYmVsTGVuZ3RoID0gTWF0aC5tYXgodGV4dHEubGVuZ3RoLCB0ZXh0YS5sZW5ndGgpIC0gJ15cXFxcY2lyYycubGVuZ3RoIC8vIMKwIHRha2VzIHVwIHZlcnkgbGl0dGxlIHNwYWNlXG4gICAgICAqL1xuXG4gICAgICAvKiBFeHBsYW5hdGlvbjogRnVydGhlciBvdXQgaWY6XG4gICAgICAqICAgTW9yZSB2ZXJ0aWNhbCAoc2luKG1pZEFuZ2xlKSlcbiAgICAgICogICBMb25nZXIgbGFiZWxcbiAgICAgICogICBzbWFsbGVyIGFuZ2xlXG4gICAgICAqICAgRS5nLiB0b3RhbGx5IHZlcnRpY2FsLCA0NcKwLCBsZW5ndGggPSAzXG4gICAgICAqICAgZCA9IDAuMyArIDEqMy80NSA9IDAuMyArIDAuNyA9IDAuMzdcbiAgICAgICovXG4gICAgICAvLyBjb25zdCBmYWN0b3IgPSAxICAgICAgICAvLyBjb25zdGFudCBvZiBwcm9wb3J0aW9uYWxpdHkuIFNldCBieSB0cmlhbCBhbmQgZXJyb3JcbiAgICAgIC8vIGxldCBkaXN0YW5jZSA9IG1pbkRpc3RhbmNlICsgZmFjdG9yICogTWF0aC5hYnMoc2luRGVnKG1pZEFuZ2xlKSkgKiBsYWJlbExlbmd0aCAvIHRoZXRhXG5cbiAgICAgIC8vIEp1c3QgcmV2ZXJ0IHRvIG9sZCBtZXRob2RcblxuICAgICAgY29uc3QgZGlzdGFuY2UgPSAwLjQgKyA2IC8gdGhldGFcblxuICAgICAgbGFiZWwucG9zID0gUG9pbnQuZnJvbVBvbGFyRGVnKHJhZGl1cyAqIGRpc3RhbmNlLCB0b3RhbGFuZ2xlICsgdGhldGEgLyAyKS50cmFuc2xhdGUodGhpcy5PLngsIHRoaXMuTy55KVxuICAgICAgbGFiZWwudGV4dHEgPSB0ZXh0cVxuICAgICAgbGFiZWwuc3R5bGVxID0gJ25vcm1hbCdcblxuICAgICAgaWYgKHRoaXMuZGF0YS5taXNzaW5nW2ldKSB7XG4gICAgICAgIGxhYmVsLnRleHRhID0gdGV4dGFcbiAgICAgICAgbGFiZWwuc3R5bGVhID0gJ2Fuc3dlcidcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxhYmVsLnRleHRhID0gbGFiZWwudGV4dHFcbiAgICAgICAgbGFiZWwuc3R5bGVhID0gbGFiZWwuc3R5bGVxXG4gICAgICB9XG5cbiAgICAgIGxhYmVsLnRleHQgPSBsYWJlbC50ZXh0cVxuICAgICAgbGFiZWwuc3R5bGUgPSBsYWJlbC5zdHlsZXFcblxuICAgICAgdGhpcy5sYWJlbHNbaV0gPSBsYWJlbCBhcyBMYWJlbFxuXG4gICAgICB0b3RhbGFuZ2xlICs9IHRoZXRhXG4gICAgfVxuXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gIH1cblxuICByZW5kZXIgKCkgOiB2b2lkIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG4gICAgaWYgKGN0eCA9PT0gbnVsbCkgeyB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBnZXQgY2FudmFzIGNvbnRleHQnKSB9XG5cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpIC8vIGNsZWFyXG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBjdHgubW92ZVRvKHRoaXMuTy54LCB0aGlzLk8ueSkgLy8gZHJhdyBsaW5lc1xuICAgIGN0eC5saW5lVG8odGhpcy5BLngsIHRoaXMuQS55KVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5DLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjdHgubW92ZVRvKHRoaXMuTy54LCB0aGlzLk8ueSlcbiAgICAgIGN0eC5saW5lVG8odGhpcy5DW2ldLngsIHRoaXMuQ1tpXS55KVxuICAgIH1cbiAgICBjdHguc3Ryb2tlU3R5bGUgPSAnZ3JheSdcbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGxldCB0b3RhbGFuZ2xlID0gdGhpcy5yb3RhdGlvblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy52aWV3QW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCB0aGV0YSA9IHRoaXMudmlld0FuZ2xlc1tpXSAqIE1hdGguUEkgLyAxODBcbiAgICAgIC8vIDAuMDcvdGhldGEgcmFkaWFucyB+PSA0L3RoZXRhXG4gICAgICBjdHguYXJjKHRoaXMuTy54LCB0aGlzLk8ueSwgdGhpcy5yYWRpdXMgKiAoMC4yICsgMC4wNyAvIHRoZXRhKSwgdG90YWxhbmdsZSwgdG90YWxhbmdsZSArIHRoZXRhKVxuICAgICAgY3R4LnN0cm9rZSgpXG4gICAgICB0b3RhbGFuZ2xlICs9IHRoZXRhXG4gICAgfVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgLy8gdGVzdGluZyBsYWJlbCBwb3NpdGlvbmluZzpcbiAgICAvLyB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgIC8vIGN0eC5maWxsU3R5bGUgPSAncmVkJ1xuICAgIC8vIGN0eC5maWxsUmVjdChsLnBvcy54IC0gMSwgbC5wb3MueSAtIDEsIDMsIDMpXG4gICAgLy8gfSlcblxuICAgIHRoaXMucmVuZGVyTGFiZWxzKGZhbHNlKVxuICB9XG5cbiAgZ2V0IGFsbHBvaW50cyAoKSA6IFBvaW50W10ge1xuICAgIGxldCBhbGxwb2ludHMgPSBbdGhpcy5BLCB0aGlzLk9dXG4gICAgYWxscG9pbnRzID0gYWxscG9pbnRzLmNvbmNhdCh0aGlzLkMpXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChmdW5jdGlvbiAobCkge1xuICAgICAgYWxscG9pbnRzLnB1c2gobC5wb3MpXG4gICAgfSlcbiAgICByZXR1cm4gYWxscG9pbnRzXG4gIH1cbn1cblxuLyoqXG4gKiBBZGp1c3RzIGEgc2V0IG9mIGFuZ2xlcyBzbyB0aGF0IGFsbCBhbmdsZXMgYXJlIGdyZWF0ZXIgdGhhbiB7bWluQW5nbGV9IGJ5IHJlZHVjaW5nIG90aGVyIGFuZ2xlcyBpbiBwcm9wb3J0aW9uXG4gKiBAcGFyYW0gYW5nbGVzIFRoZSBzZXQgb2YgYW5nbGVzIHRvIGFkanVzdFxuICogQHBhcmFtIG1pbkFuZ2xlIFRoZSBzbWFsbGVzdCBhbmdsZSBpbiB0aGUgb3V0cHV0XG4gKi9cbmZ1bmN0aW9uIGZ1ZGdlQW5nbGVzIChhbmdsZXM6IG51bWJlcltdLCBtaW5BbmdsZTogbnVtYmVyKSA6IG51bWJlcltdIHtcbiAgY29uc3QgYW5nbGVTdW0gPSBhbmdsZXMucmVkdWNlKChhLCBjKSA9PiBhICsgYylcbiAgY29uc3QgbWFwcGVkQW5nbGVzID0gYW5nbGVzLm1hcCgoeCwgaSkgPT4gW3gsIGldKSAvLyByZW1lbWJlciBvcmlnaW5hbCBpbmRpY2VzXG4gIGNvbnN0IHNtYWxsQW5nbGVzID0gbWFwcGVkQW5nbGVzLmZpbHRlcih4ID0+IHhbMF0gPCBtaW5BbmdsZSkgLy8gc3BsaXQgb3V0IGFuZ2xlcyB3aGljaCBhcmUgdG9vIHNtYWxsXG4gIGNvbnN0IGxhcmdlQW5nbGVzID0gbWFwcGVkQW5nbGVzLmZpbHRlcih4ID0+IHhbMF0gPj0gbWluQW5nbGUpXG4gIGNvbnN0IGxhcmdlQW5nbGVTdW0gPSBsYXJnZUFuZ2xlcy5yZWR1Y2UoKGFjY3VtdWxhdG9yLCBjdXJyZW50VmFsdWUpID0+IGFjY3VtdWxhdG9yICsgY3VycmVudFZhbHVlWzBdLCAwKVxuXG4gIHNtYWxsQW5nbGVzLmZvckVhY2goc21hbGwgPT4ge1xuICAgIGNvbnN0IGRpZmZlcmVuY2UgPSBtaW5BbmdsZSAtIHNtYWxsWzBdXG4gICAgc21hbGxbMF0gKz0gZGlmZmVyZW5jZVxuICAgIGxhcmdlQW5nbGVzLmZvckVhY2gobGFyZ2UgPT4ge1xuICAgICAgY29uc3QgcmVkdWN0aW9uID0gZGlmZmVyZW5jZSAqIGxhcmdlWzBdIC8gbGFyZ2VBbmdsZVN1bVxuICAgICAgbGFyZ2VbMF0gPSBNYXRoLnJvdW5kKGxhcmdlWzBdIC0gcmVkdWN0aW9uKVxuICAgIH0pXG4gIH0pXG5cbiAgLy8gZml4IGFueSByb3VuZGluZyBlcnJvcnMgaW50cm9kdWNlZFxuXG4gIGNvbnN0IG5ld0FuZ2xlcyA9IHNtYWxsQW5nbGVzLmNvbmNhdChsYXJnZUFuZ2xlcykgLy8gY29tYmluZSB0b2dldGhlclxuICAgIC5zb3J0KCh4LCB5KSA9PiB4WzFdIC0geVsxXSkgLy8gc29ydCBieSBwcmV2aW91cyBpbmRleFxuICAgIC5tYXAoeCA9PiB4WzBdKSAvLyBzdHJpcCBvdXQgaW5kZXhcblxuICBsZXQgbmV3U3VtID0gbmV3QW5nbGVzLnJlZHVjZSgoYWNjLCBjdXJyKSA9PiBhY2MgKyBjdXJyKVxuICBpZiAobmV3U3VtICE9PSBhbmdsZVN1bSkge1xuICAgIGNvbnN0IGRpZmZlcmVuY2UgPSBhbmdsZVN1bSAtIG5ld1N1bVxuICAgIG5ld0FuZ2xlc1tuZXdBbmdsZXMuaW5kZXhPZihNYXRoLm1heCguLi5uZXdBbmdsZXMpKV0gKz0gZGlmZmVyZW5jZVxuICB9XG4gIG5ld1N1bSA9IG5ld0FuZ2xlcy5yZWR1Y2UoKGFjYywgY3VycikgPT4gYWNjICsgY3VycilcbiAgaWYgKG5ld1N1bSAhPT0gYW5nbGVTdW0pIHRocm93IG5ldyBFcnJvcihgRGlkbid0IGZpeCBhbmdsZXMuIE5ldyBzdW0gaXMgJHtuZXdTdW19LCBidXQgc2hvdWxkIGJlICR7YW5nbGVTdW19YClcblxuICByZXR1cm4gbmV3QW5nbGVzXG59XG4iLCIvKiogR2VuZXJhdGVzIGFuZCBob2xkcyBkYXRhIGZvciBhIG1pc3NpbmcgYW5nbGVzIHF1ZXN0aW9uLCB3aGVyZSB0aGVzZSBpcyBzb21lIGdpdmVuIGFuZ2xlIHN1bVxuICogIEFnbm9zdGljIGFzIHRvIGhvdyB0aGVzZSBhbmdsZXMgYXJlIGFycmFuZ2VkIChlLmcuIGluIGEgcG9seWdvbiBvciBhcm91bmQgc29tIHBvaW50KVxuICpcbiAqIE9wdGlvbnMgcGFzc2VkIHRvIGNvbnN0cnVjdG9yczpcbiAqICBhbmdsZVN1bTo6SW50IHRoZSBudW1iZXIgb2YgYW5nbGVzIHRvIGdlbmVyYXRlXG4gKiAgbWluQW5nbGU6OkludCB0aGUgc21hbGxlc3QgYW5nbGUgdG8gZ2VuZXJhdGVcbiAqICBtaW5OOjpJbnQgICAgIHRoZSBzbWFsbGVzdCBudW1iZXIgb2YgYW5nbGVzIHRvIGdlbmVyYXRlXG4gKiAgbWF4Tjo6SW50ICAgICB0aGUgbGFyZ2VzdCBudW1iZXIgb2YgYW5nbGVzIHRvIGdlbmVyYXRlXG4gKlxuICovXG5cbmltcG9ydCB7IHJhbmRCZXR3ZWVuLCByYW5kUGFydGl0aW9uIH0gZnJvbSAndXRpbGl0aWVzJ1xuaW1wb3J0IHsgR3JhcGhpY1FEYXRhIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzRGF0YSB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0RhdGEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVPcHRpb25zIGFzIE9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5cbmV4cG9ydCBjbGFzcyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSBpbXBsZW1lbnRzIE1pc3NpbmdBbmdsZXNEYXRhIHtcbiAgYW5nbGVzIDogbnVtYmVyW10gLy8gbGlzdCBvZiBhbmdsZXNcbiAgbWlzc2luZyA6IGJvb2xlYW5bXSAvLyB0cnVlIGlmIG1pc3NpbmdcbiAgYW5nbGVTdW0gOiBudW1iZXIgLy8gd2hhdCB0aGUgYW5nbGVzIGFkZCB1cCB0b1xuICBhbmdsZUxhYmVsczogc3RyaW5nW11cblxuICBjb25zdHJ1Y3RvciAoYW5nbGVTdW0gOiBudW1iZXIsIGFuZ2xlczogbnVtYmVyW10sIG1pc3Npbmc6IGJvb2xlYW5bXSwgYW5nbGVMYWJlbHM/OiBzdHJpbmdbXSkge1xuICAgIC8vIGluaXRpYWxpc2VzIHdpdGggYW5nbGVzIGdpdmVuIGV4cGxpY2l0bHlcbiAgICBpZiAoYW5nbGVzID09PSBbXSkgeyB0aHJvdyBuZXcgRXJyb3IoJ011c3QgZ2l2ZSBhbmdsZXMnKSB9XG4gICAgaWYgKE1hdGgucm91bmQoYW5nbGVzLnJlZHVjZSgoeCwgeSkgPT4geCArIHkpKSAhPT0gYW5nbGVTdW0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQW5nbGUgc3VtIG11c3QgYmUgJHthbmdsZVN1bX1gKVxuICAgIH1cblxuICAgIHRoaXMuYW5nbGVzID0gYW5nbGVzIC8vIGxpc3Qgb2YgYW5nbGVzXG4gICAgdGhpcy5taXNzaW5nID0gbWlzc2luZyAvLyB3aGljaCBhbmdsZXMgYXJlIG1pc3NpbmcgLSBhcnJheSBvZiBib29sZWFuc1xuICAgIHRoaXMuYW5nbGVTdW0gPSBhbmdsZVN1bSAvLyBzdW0gb2YgYW5nbGVzXG4gICAgdGhpcy5hbmdsZUxhYmVscyA9IGFuZ2xlTGFiZWxzIHx8IFtdXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBsZXQgcXVlc3Rpb24gOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YVxuICAgIGlmIChvcHRpb25zLnJlcGVhdGVkKSB7XG4gICAgICBxdWVzdGlvbiA9IHRoaXMucmFuZG9tUmVwZWF0ZWQob3B0aW9ucylcbiAgICB9IGVsc2Uge1xuICAgICAgcXVlc3Rpb24gPSB0aGlzLnJhbmRvbVNpbXBsZShvcHRpb25zKVxuICAgIH1cbiAgICBxdWVzdGlvbi5pbml0TGFiZWxzKClcbiAgICByZXR1cm4gcXVlc3Rpb25cbiAgfVxuXG4gIHN0YXRpYyByYW5kb21TaW1wbGUgKG9wdGlvbnM6IE9wdGlvbnMpOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB7XG4gICAgY29uc3QgYW5nbGVTdW0gPSBvcHRpb25zLmFuZ2xlU3VtXG4gICAgY29uc3QgbiA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTiwgb3B0aW9ucy5tYXhOKVxuICAgIGNvbnN0IG1pbkFuZ2xlID0gb3B0aW9ucy5taW5BbmdsZVxuXG4gICAgaWYgKG4gPCAyKSB0aHJvdyBuZXcgRXJyb3IoJ0NhblxcJ3QgaGF2ZSBtaXNzaW5nIGZld2VyIHRoYW4gMiBhbmdsZXMnKVxuXG4gICAgLy8gQnVpbGQgdXAgYW5nbGVzXG4gICAgLypcbiAgICBjb25zdCBhbmdsZXM6IG51bWJlcltdID0gW11cbiAgICBsZXQgbGVmdCA9IGFuZ2xlU3VtXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuIC0gMTsgaSsrKSB7XG4gICAgICBjb25zdCBtYXhBbmdsZSA9IGxlZnQgLSBtaW5BbmdsZSAqIChuIC0gaSAtIDEpXG4gICAgICBjb25zdCBuZXh0QW5nbGUgPSByYW5kQmV0d2VlbihtaW5BbmdsZSwgbWF4QW5nbGUpXG4gICAgICBsZWZ0IC09IG5leHRBbmdsZVxuICAgICAgYW5nbGVzLnB1c2gobmV4dEFuZ2xlKVxuICAgIH1cbiAgICBhbmdsZXNbbiAtIDFdID0gbGVmdFxuICAgICovXG5cbiAgICBjb25zdCBhbmdsZXMgPSByYW5kUGFydGl0aW9uKHt0b3RhbDogYW5nbGVTdW0sIG46IG4sIG1pblZhbHVlOiBtaW5BbmdsZX0pXG5cbiAgICAvLyBwaWNrIG9uZSB0byBiZSBtaXNzaW5nXG4gICAgY29uc3QgbWlzc2luZzogYm9vbGVhbltdID0gW11cbiAgICBtaXNzaW5nLmxlbmd0aCA9IG5cbiAgICBtaXNzaW5nLmZpbGwoZmFsc2UpXG4gICAgbWlzc2luZ1tyYW5kQmV0d2VlbigwLCBuIC0gMSldID0gdHJ1ZVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGFuZ2xlU3VtLCBhbmdsZXMsIG1pc3NpbmcpXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tUmVwZWF0ZWQgKG9wdGlvbnM6IE9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEge1xuICAgIGNvbnN0IGFuZ2xlU3VtOiBudW1iZXIgPSBvcHRpb25zLmFuZ2xlU3VtXG4gICAgY29uc3QgbWluQW5nbGU6IG51bWJlciA9IG9wdGlvbnMubWluQW5nbGVcblxuICAgIGNvbnN0IG46IG51bWJlciA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTiwgb3B0aW9ucy5tYXhOKVxuXG4gICAgY29uc3QgbTogbnVtYmVyID0gb3B0aW9ucy5uTWlzc2luZyB8fCAoTWF0aC5yYW5kb20oKSA8IDAuMSA/IG4gOiByYW5kQmV0d2VlbigyLCBuIC0gMSkpXG5cbiAgICBpZiAobiA8IDIgfHwgbSA8IDEgfHwgbSA+IG4pIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBhcmd1bWVudHM6IG49JHtufSwgbT0ke219YClcblxuICAgIC8vIEFsbCBtaXNzaW5nIC0gZG8gYXMgYSBzZXBhcmF0ZSBjYXNlXG4gICAgaWYgKG4gPT09IG0pIHtcbiAgICAgIGNvbnN0IGFuZ2xlczogbnVtYmVyW10gPSBbXVxuICAgICAgYW5nbGVzLmxlbmd0aCA9IG5cbiAgICAgIGFuZ2xlcy5maWxsKGFuZ2xlU3VtIC8gbilcblxuICAgICAgY29uc3QgbWlzc2luZzogYm9vbGVhbltdID0gW11cbiAgICAgIG1pc3NpbmcubGVuZ3RoID0gblxuICAgICAgbWlzc2luZy5maWxsKHRydWUpXG5cbiAgICAgIHJldHVybiBuZXcgdGhpcyhhbmdsZVN1bSwgYW5nbGVzLCBtaXNzaW5nKVxuICAgIH1cblxuICAgIGNvbnN0IGFuZ2xlczogbnVtYmVyW10gPSBbXVxuICAgIGNvbnN0IG1pc3Npbmc6IGJvb2xlYW5bXSA9IFtdXG4gICAgbWlzc2luZy5sZW5ndGggPSBuXG4gICAgbWlzc2luZy5maWxsKGZhbHNlKVxuXG4gICAgLy8gY2hvb3NlIGEgdmFsdWUgZm9yIHRoZSBtaXNzaW5nIGFuZ2xlc1xuICAgIGNvbnN0IG1heFJlcGVhdGVkQW5nbGUgPSAoYW5nbGVTdW0gLSBtaW5BbmdsZSAqIChuIC0gbSkpIC8gbVxuICAgIGNvbnN0IHJlcGVhdGVkQW5nbGUgPSByYW5kQmV0d2VlbihtaW5BbmdsZSwgbWF4UmVwZWF0ZWRBbmdsZSlcblxuICAgIC8vIGNob29zZSB2YWx1ZXMgZm9yIHRoZSBvdGhlciBhbmdsZXNcbiAgICBjb25zdCBvdGhlckFuZ2xlczogbnVtYmVyW10gPSBbXVxuICAgIGxldCBsZWZ0ID0gYW5nbGVTdW0gLSByZXBlYXRlZEFuZ2xlICogbVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbiAtIG0gLSAxOyBpKyspIHtcbiAgICAgIGNvbnN0IG1heEFuZ2xlID0gbGVmdCAtIG1pbkFuZ2xlICogKG4gLSBtIC0gaSAtIDEpXG4gICAgICBjb25zdCBuZXh0QW5nbGUgPSByYW5kQmV0d2VlbihtaW5BbmdsZSwgbWF4QW5nbGUpXG4gICAgICBsZWZ0IC09IG5leHRBbmdsZVxuICAgICAgb3RoZXJBbmdsZXMucHVzaChuZXh0QW5nbGUpXG4gICAgfVxuICAgIG90aGVyQW5nbGVzW24gLSBtIC0gMV0gPSBsZWZ0XG5cbiAgICAvLyBjaG9vc2Ugd2hlcmUgdGhlIG1pc3NpbmcgYW5nbGVzIGFyZVxuICAgIHtcbiAgICAgIGxldCBpID0gMFxuICAgICAgd2hpbGUgKGkgPCBtKSB7XG4gICAgICAgIGNvbnN0IGogPSByYW5kQmV0d2VlbigwLCBuIC0gMSlcbiAgICAgICAgaWYgKG1pc3Npbmdbal0gPT09IGZhbHNlKSB7XG4gICAgICAgICAgbWlzc2luZ1tqXSA9IHRydWVcbiAgICAgICAgICBhbmdsZXNbal0gPSByZXBlYXRlZEFuZ2xlXG4gICAgICAgICAgaSsrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBmaWxsIGluIHRoZSBvdGhlciBhbmdsZXNcbiAgICB7XG4gICAgICBsZXQgaiA9IDBcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGlmIChtaXNzaW5nW2ldID09PSBmYWxzZSkge1xuICAgICAgICAgIGFuZ2xlc1tpXSA9IG90aGVyQW5nbGVzW2pdXG4gICAgICAgICAgaisrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ldyB0aGlzKGFuZ2xlU3VtLCBhbmdsZXMsIG1pc3NpbmcpXG4gIH1cblxuICBpbml0TGFiZWxzICgpIDogdm9pZCB7XG4gICAgY29uc3QgbiA9IHRoaXMuYW5nbGVzLmxlbmd0aFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBpZiAoIXRoaXMubWlzc2luZ1tpXSkge1xuICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzW2ldID0gYCR7dGhpcy5hbmdsZXNbaV0udG9TdHJpbmcoKX1eXFxcXGNpcmNgXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzW2ldID0gJ3heXFxcXGNpcmMnXG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iLCIvKiBRdWVzdGlvbiB0eXBlIGNvbXByaXNpbmcgbnVtZXJpY2FsIG1pc3NpbmcgYW5nbGVzIGFyb3VuZCBhIHBvaW50IGFuZFxuICogYW5nbGVzIG9uIGEgc3RyYWlnaHQgbGluZSAoc2luY2UgdGhlc2UgYXJlIHZlcnkgc2ltaWxhciBudW1lcmljYWxseSBhcyB3ZWxsXG4gKiBhcyBncmFwaGljYWxseS5cbiAqXG4gKiBBbHNvIGNvdmVycyBjYXNlcyB3aGVyZSBtb3JlIHRoYW4gb25lIGFuZ2xlIGlzIGVxdWFsXG4gKlxuICovXG5cbmltcG9ydCB7IE9wdGlvbnNTcGVjIH0gZnJvbSAnT3B0aW9uc1NwZWMnXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc051bWJlckRhdGEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhITogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgLy8gaW5pdGlhbGlzZWQgaW4gc3VwZXIoKVxuICB2aWV3ITogTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXdcblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBQYXJ0aWFsPE1pc3NpbmdBbmdsZU9wdGlvbnM+LCB2aWV3T3B0aW9uczogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNBcm91bmRRIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IE1pc3NpbmdBbmdsZU9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDE1LFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDQsXG4gICAgICByZXBlYXRlZDogZmFsc2UsXG4gICAgICBuTWlzc2luZzogM1xuICAgIH1cbiAgICBjb25zdCBzZXR0aW5nczogTWlzc2luZ0FuZ2xlT3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhLnJhbmRvbShzZXR0aW5ncylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3KGRhdGEsIHZpZXdPcHRpb25zKSAvLyBUT0RPIGVsaW1pbmF0ZSBwdWJsaWMgY29uc3RydWN0b3JzXG5cbiAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRRKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBHcmFwaGljUVZpZXcsIExhYmVsIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgeyBzaW5EZWcsIGRhc2hlZExpbmUsIHJvdW5kRFAgfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICBBIDogUG9pbnQgLy8gdGhlIHZlcnRpY2VzIG9mIHRoZSB0cmlhbmdsZVxuICBCIDogUG9pbnRcbiAgQyA6IFBvaW50XG4gIHJvdGF0aW9uOiBudW1iZXJcbiAgLy8gSW5oZXJpdGVkIG1lbWJlcnMuIEFsbCBpbml0aWFsaXNlZCBpbiBjYWxsIHRvIHN1cGVyKClcbiAgbGFiZWxzITogTGFiZWxbXVxuICBjYW52YXMhOiBIVE1MQ2FudmFzRWxlbWVudFxuICBET00hOiBIVE1MRWxlbWVudFxuICB3aWR0aCE6IG51bWJlclxuICBoZWlnaHQhOiBudW1iZXJcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGFcblxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSwgb3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBzZXRzIHRoaXMud2lkdGggdGhpcy5oZWlnaHQsIHRoaXMuZGF0YSBpbml0aWFsaXNlcyB0aGlzLmxhYmVscywgY3JlYXRlcyBkb20gZWxlbWVudHNcbiAgICBjb25zdCB3aWR0aCA9IHRoaXMud2lkdGhcbiAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmhlaWdodFxuXG4gICAgLy8gZ2VuZXJhdGUgcG9pbnRzICh3aXRoIGxvbmdlc3Qgc2lkZSAxXG4gICAgdGhpcy5BID0gbmV3IFBvaW50KDAsIDApXG4gICAgdGhpcy5CID0gUG9pbnQuZnJvbVBvbGFyRGVnKDEsIGRhdGEuYW5nbGVzWzBdKVxuICAgIHRoaXMuQyA9IG5ldyBQb2ludChcbiAgICAgIHNpbkRlZyh0aGlzLmRhdGEuYW5nbGVzWzFdKSAvIHNpbkRlZyh0aGlzLmRhdGEuYW5nbGVzWzJdKSwgMFxuICAgIClcblxuICAgIC8vIENyZWF0ZSBsYWJlbHNcbiAgICBjb25zdCBpbkNlbnRlciA9IFBvaW50LmluQ2VudGVyKHRoaXMuQSwgdGhpcy5CLCB0aGlzLkMpXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgY29uc3QgcCA9IFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXVtpXVxuXG4gICAgICBjb25zdCBsYWJlbCA6IFBhcnRpYWw8TGFiZWw+ID0ge1xuICAgICAgICB0ZXh0cTogdGhpcy5kYXRhLmFuZ2xlTGFiZWxzW2ldLFxuICAgICAgICB0ZXh0OiB0aGlzLmRhdGEuYW5nbGVMYWJlbHNbaV0sXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCcsXG4gICAgICAgIHN0eWxlOiAnbm9ybWFsJyxcbiAgICAgICAgcG9zOiBQb2ludC5tZWFuKHAsIHAsIGluQ2VudGVyKVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5kYXRhLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSByb3VuZERQKHRoaXMuZGF0YS5hbmdsZXNbaV0sIDIpLnRvU3RyaW5nKCkgKyAnXlxcXFxjaXJjJ1xuICAgICAgICBsYWJlbC5zdHlsZWEgPSAnYW5zd2VyJ1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSBsYWJlbC50ZXh0cVxuICAgICAgICBsYWJlbC5zdHlsZWEgPSBsYWJlbC5zdHlsZXFcbiAgICAgIH1cblxuICAgICAgdGhpcy5sYWJlbHNbaV0gPSBsYWJlbCBhcyBMYWJlbFxuICAgIH1cblxuICAgIC8vIHJvdGF0ZSByYW5kb21seVxuICAgIHRoaXMucm90YXRpb24gPSAob3B0aW9ucy5yb3RhdGlvbiAhPT0gdW5kZWZpbmVkKSA/IHRoaXMucm90YXRlKG9wdGlvbnMucm90YXRpb24pIDogdGhpcy5yYW5kb21Sb3RhdGUoKVxuXG4gICAgLy8gc2NhbGUgYW5kIGZpdFxuICAgIC8vIHNjYWxlIHRvIHNpemVcbiAgICBjb25zdCBtYXJnaW4gPSAwXG4gICAgbGV0IHRvcGxlZnQgPSBQb2ludC5taW4oW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGxldCBib3R0b21yaWdodCA9IFBvaW50Lm1heChbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgY29uc3QgdG90YWxXaWR0aCA9IGJvdHRvbXJpZ2h0LnggLSB0b3BsZWZ0LnhcbiAgICBjb25zdCB0b3RhbEhlaWdodCA9IGJvdHRvbXJpZ2h0LnkgLSB0b3BsZWZ0LnlcbiAgICB0aGlzLnNjYWxlKE1hdGgubWluKCh3aWR0aCAtIG1hcmdpbikgLyB0b3RhbFdpZHRoLCAoaGVpZ2h0IC0gbWFyZ2luKSAvIHRvdGFsSGVpZ2h0KSkgLy8gMTVweCBtYXJnaW5cblxuICAgIC8vIG1vdmUgdG8gY2VudHJlXG4gICAgdG9wbGVmdCA9IFBvaW50Lm1pbihbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgYm90dG9tcmlnaHQgPSBQb2ludC5tYXgoW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGNvbnN0IGNlbnRlciA9IFBvaW50Lm1lYW4odG9wbGVmdCwgYm90dG9tcmlnaHQpXG4gICAgdGhpcy50cmFuc2xhdGUod2lkdGggLyAyIC0gY2VudGVyLngsIGhlaWdodCAvIDIgLSBjZW50ZXIueSkgLy8gY2VudHJlXG4gIH1cblxuICByZW5kZXIgKCkgOiB2b2lkIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG4gICAgaWYgKGN0eCA9PT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgZ2V0IGNhbnZhcyBjb250ZXh0JylcblxuICAgIGNvbnN0IHZlcnRpY2VzID0gW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdXG4gICAgY29uc3QgYXBleCA9IHRoaXMuZGF0YS5hcGV4IC8vIGhtbW1cblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGN0eC5tb3ZlVG8odGhpcy5BLngsIHRoaXMuQS55KVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGNvbnN0IHAgPSB2ZXJ0aWNlc1tpXVxuICAgICAgY29uc3QgbmV4dCA9IHZlcnRpY2VzWyhpICsgMSkgJSAzXVxuICAgICAgaWYgKGFwZXggPT09IGkgfHwgYXBleCA9PT0gKGkgKyAxKSAlIDMpIHsgLy8gdG8vZnJvbSBhcGV4IC0gZHJhdyBkYXNoZWQgbGluZVxuICAgICAgICBkYXNoZWRMaW5lKGN0eCwgcC54LCBwLnksIG5leHQueCwgbmV4dC55KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3R4LmxpbmVUbyhuZXh0LngsIG5leHQueSlcbiAgICAgIH1cbiAgICB9XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gJ2dyYXknXG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGdldCBhbGxwb2ludHMgKCkgOiBQb2ludFtdIHtcbiAgICBjb25zdCBhbGxwb2ludHMgPSBbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ11cbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4geyBhbGxwb2ludHMucHVzaChsLnBvcykgfSlcbiAgICByZXR1cm4gYWxscG9pbnRzXG4gIH1cbn1cbiIsIi8qIEV4dGVuZHMgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgaW4gb3JkZXIgdG8gZG8gaXNvc2NlbGVzIHRyaWFuZ2xlcywgd2hpY2ggZ2VuZXJhdGUgYSBiaXQgZGlmZmVyZW50bHkgKi9cblxuaW1wb3J0IHsgZmlyc3RVbmlxdWVJbmRleCB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5cbnR5cGUgT3B0aW9ucyA9IE1pc3NpbmdBbmdsZU9wdGlvbnMgJiB7Z2l2ZW5BbmdsZT86ICdhcGV4JyB8ICdiYXNlJ31cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBleHRlbmRzIE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBhcGV4PzogMCB8IDEgfCAyIHwgdW5kZWZpbmVkIC8vIHdoaWNoIG9mIHRoZSB0aHJlZSBnaXZlbiBhbmdsZXMgaXMgdGhlIGFwZXggb2YgYW4gaXNvc2NlbGVzIHRyaWFuZ2xlXG4gICAgY29uc3RydWN0b3IgKGFuZ2xlU3VtOiBudW1iZXIsIGFuZ2xlczogbnVtYmVyW10sIG1pc3Npbmc6IGJvb2xlYW5bXSwgYW5nbGVMYWJlbHM/OiBzdHJpbmdbXSwgYXBleD86IDB8MXwyfHVuZGVmaW5lZCkge1xuICAgICAgc3VwZXIoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZywgYW5nbGVMYWJlbHMpXG4gICAgICB0aGlzLmFwZXggPSBhcGV4XG4gICAgfVxuXG4gICAgc3RhdGljIHJhbmRvbVJlcGVhdGVkIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEge1xuICAgICAgb3B0aW9ucy5uTWlzc2luZyA9IDJcbiAgICAgIG9wdGlvbnMuZ2l2ZW5BbmdsZSA9IG9wdGlvbnMuZ2l2ZW5BbmdsZSB8fCBNYXRoLnJhbmRvbSgpIDwgMC41ID8gJ2FwZXgnIDogJ2Jhc2UnXG5cbiAgICAgIC8vIGdlbmVyYXRlIHRoZSByYW5kb20gYW5nbGVzIHdpdGggcmVwZXRpdGlvbiBmaXJzdCBiZWZvcmUgbWFya2luZyBhcGV4IGZvciBkcmF3aW5nXG4gICAgICBjb25zdCBxdWVzdGlvbiA9IHN1cGVyLnJhbmRvbVJlcGVhdGVkKG9wdGlvbnMpIGFzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEgLy8gYWxsb3dlZCBzaW5jZSB1bmRlZmluZWQgXFxpbiBhcGV4XG5cbiAgICAgIC8vIE9sZCBpbXBsZW1lbnRhdGlvbiBoYWQgc29ydGluZyB0aGUgYXJyYXkgLSBub3Qgc3VyZSB3aHlcbiAgICAgIC8vIHNvcnRUb2dldGhlcihxdWVzdGlvbi5hbmdsZXMscXVlc3Rpb24ubWlzc2luZywoeCx5KSA9PiB4IC0geSlcblxuICAgICAgcXVlc3Rpb24uYXBleCA9IGZpcnN0VW5pcXVlSW5kZXgocXVlc3Rpb24uYW5nbGVzKSBhcyAwIHwgMSB8IDJcbiAgICAgIHF1ZXN0aW9uLm1pc3NpbmcgPSBbdHJ1ZSwgdHJ1ZSwgdHJ1ZV1cblxuICAgICAgaWYgKG9wdGlvbnMuZ2l2ZW5BbmdsZSA9PT0gJ2FwZXgnKSB7XG4gICAgICAgIHF1ZXN0aW9uLm1pc3NpbmdbcXVlc3Rpb24uYXBleF0gPSBmYWxzZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcXVlc3Rpb24ubWlzc2luZ1socXVlc3Rpb24uYXBleCArIDEpICUgM10gPSBmYWxzZVxuICAgICAgfVxuXG4gICAgICBxdWVzdGlvbi5pbml0TGFiZWxzKClcblxuICAgICAgcmV0dXJuIHF1ZXN0aW9uXG4gICAgfVxuXG4gICAgaW5pdExhYmVscyAoKTogdm9pZCB7XG4gICAgICBjb25zdCBuID0gdGhpcy5hbmdsZXMubGVuZ3RoXG4gICAgICBsZXQgaiA9IDAgLy8ga2VlcCB0cmFjayBvZiB1bmtub3duc1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgaWYgKCF0aGlzLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzW2ldID0gYCR7dGhpcy5hbmdsZXNbaV0udG9TdHJpbmcoKX1eXFxcXGNpcmNgXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5hbmdsZUxhYmVsc1tpXSA9IGAke1N0cmluZy5mcm9tQ2hhckNvZGUoMTIwICsgail9XlxcXFxjaXJjYCAvLyAxMjAgPSAneCdcbiAgICAgICAgICBqKytcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbn1cbiIsIi8qIE1pc3NpbmcgYW5nbGVzIGluIHRyaWFuZ2xlIC0gbnVtZXJpY2FsICovXG5cbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc051bWJlckRhdGEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVPcHRpb25zIH0gZnJvbSAnLi9OdW1iZXJPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhITogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YVxuICB2aWV3ITogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlld1xuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFBhcnRpYWw8TWlzc2luZ0FuZ2xlT3B0aW9ucz4sIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucykge1xuICAgIGNvbnN0IG9wdGlvbnNPdmVycmlkZSA6IFBhcnRpYWw8TWlzc2luZ0FuZ2xlT3B0aW9ucz4gPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDI1LFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDNcbiAgICB9XG4gICAgY29uc3QgZGVmYXVsdHMgOiBNaXNzaW5nQW5nbGVPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAxNSxcbiAgICAgIG1pbk46IDIsXG4gICAgICBtYXhOOiA0LFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlLFxuICAgICAgbk1pc3Npbmc6IDFcbiAgICB9XG5cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zLCBvcHRpb25zT3ZlcnJpZGUpXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YS5yYW5kb20oc2V0dGluZ3MpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3KGRhdGEsIHZpZXdPcHRpb25zKVxuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBMaW5FeHByIHtcbi8vIGNsYXNzIExpbkV4cHIge1xuICBjb25zdHJ1Y3RvciAoYSwgYikge1xuICAgIHRoaXMuYSA9IGFcbiAgICB0aGlzLmIgPSBiXG4gIH1cblxuICBpc0NvbnN0YW50ICgpIHtcbiAgICByZXR1cm4gdGhpcy5hID09PSAwXG4gIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgbGV0IHN0cmluZyA9ICcnXG5cbiAgICAvLyB4IHRlcm1cbiAgICBpZiAodGhpcy5hID09PSAxKSB7IHN0cmluZyArPSAneCcgfSBlbHNlIGlmICh0aGlzLmEgPT09IC0xKSB7IHN0cmluZyArPSAnLXgnIH0gZWxzZSBpZiAodGhpcy5hICE9PSAwKSB7IHN0cmluZyArPSB0aGlzLmEgKyAneCcgfVxuXG4gICAgLy8gc2lnblxuICAgIGlmICh0aGlzLmEgIT09IDAgJiYgdGhpcy5iID4gMCkgeyBzdHJpbmcgKz0gJyArICcgfSBlbHNlIGlmICh0aGlzLmEgIT09IDAgJiYgdGhpcy5iIDwgMCkgeyBzdHJpbmcgKz0gJyAtICcgfVxuXG4gICAgLy8gY29uc3RhbnRcbiAgICBpZiAodGhpcy5iID4gMCkgeyBzdHJpbmcgKz0gdGhpcy5iIH0gZWxzZSBpZiAodGhpcy5iIDwgMCAmJiB0aGlzLmEgPT09IDApIHsgc3RyaW5nICs9IHRoaXMuYiB9IGVsc2UgaWYgKHRoaXMuYiA8IDApIHsgc3RyaW5nICs9IE1hdGguYWJzKHRoaXMuYikgfVxuXG4gICAgcmV0dXJuIHN0cmluZ1xuICB9XG5cbiAgdG9TdHJpbmdQICgpIHtcbiAgICAvLyByZXR1cm4gZXhwcmVzc2lvbiBhcyBhIHN0cmluZywgc3Vycm91bmRlZCBpbiBwYXJlbnRoZXNlcyBpZiBhIGJpbm9taWFsXG4gICAgaWYgKHRoaXMuYSA9PT0gMCB8fCB0aGlzLmIgPT09IDApIHJldHVybiB0aGlzLnRvU3RyaW5nKClcbiAgICBlbHNlIHJldHVybiAnKCcgKyB0aGlzLnRvU3RyaW5nKCkgKyAnKSdcbiAgfVxuXG4gIGV2YWwgKHgpIHtcbiAgICByZXR1cm4gdGhpcy5hICogeCArIHRoaXMuYlxuICB9XG5cbiAgYWRkICh0aGF0KSB7XG4gICAgLy8gYWRkIGVpdGhlciBhbiBleHByZXNzaW9uIG9yIGEgY29uc3RhbnRcbiAgICBpZiAodGhhdC5hICE9PSB1bmRlZmluZWQpIHJldHVybiBuZXcgTGluRXhwcih0aGlzLmEgKyB0aGF0LmEsIHRoaXMuYiArIHRoYXQuYilcbiAgICBlbHNlIHJldHVybiBuZXcgTGluRXhwcih0aGlzLmEsIHRoaXMuYiArIHRoYXQpXG4gIH1cblxuICB0aW1lcyAodGhhdCkge1xuICAgIHJldHVybiBuZXcgTGluRXhwcih0aGlzLmEgKiB0aGF0LCB0aGlzLmIgKiB0aGF0KVxuICB9XG5cbiAgc3RhdGljIHNvbHZlIChleHByMSwgZXhwcjIpIHtcbiAgICAvLyBzb2x2ZXMgdGhlIHR3byBleHByZXNzaW9ucyBzZXQgZXF1YWwgdG8gZWFjaCBvdGhlclxuICAgIHJldHVybiAoZXhwcjIuYiAtIGV4cHIxLmIpIC8gKGV4cHIxLmEgLSBleHByMi5hKVxuICB9XG59XG4iLCJpbXBvcnQgTGluRXhwciBmcm9tICdMaW5FeHByJ1xuXG4vKiogR2l2ZW4gYSBzZXQgb2YgZXhwcmVzc2lvbnMsIHNldCB0aGVpciBzdW0gICovXG5cbmV4cG9ydCBmdW5jdGlvbiBzb2x2ZUFuZ2xlcyAoZXhwcmVzc2lvbnM6IExpbkV4cHJbXSwgYW5nbGVTdW06IG51bWJlcik6IHsgeDogbnVtYmVyOyBhbmdsZXM6IG51bWJlcltdOyB9IHtcbiAgY29uc3QgZXhwcmVzc2lvblN1bSA9IGV4cHJlc3Npb25zLnJlZHVjZSgoZXhwMSwgZXhwMikgPT4gZXhwMS5hZGQoZXhwMikpXG4gIGNvbnN0IHggPSBMaW5FeHByLnNvbHZlKGV4cHJlc3Npb25TdW0sIG5ldyBMaW5FeHByKDAsIGFuZ2xlU3VtKSlcblxuICBjb25zdCBhbmdsZXMgOiBudW1iZXJbXSA9IFtdXG4gIGV4cHJlc3Npb25zLmZvckVhY2goZnVuY3Rpb24gKGV4cHIpIHtcbiAgICBjb25zdCBhbmdsZSA9IGV4cHIuZXZhbCh4KVxuICAgIGlmIChhbmdsZSA8PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ25lZ2F0aXZlIGFuZ2xlJylcbiAgICB9IGVsc2Uge1xuICAgICAgYW5nbGVzLnB1c2goZXhwci5ldmFsKHgpKVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gKHsgeDogeCwgYW5nbGVzOiBhbmdsZXMgfSlcbn1cbiIsImltcG9ydCBMaW5FeHByIGZyb20gJ0xpbkV4cHInXG5pbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4sIHJhbmRFbGVtLCByYW5kTXVsdEJldHdlZW4sIHNodWZmbGUsIHdlYWtJbmNsdWRlcyB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCB7IEFsZ2VicmFPcHRpb25zIH0gZnJvbSAnLi9BbGdlYnJhT3B0aW9ucydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzRGF0YSdcbmltcG9ydCB7IHNvbHZlQW5nbGVzIH0gZnJvbSAnLi9zb2x2ZUFuZ2xlcydcblxuZXhwb3J0IHR5cGUgRXhwcmVzc2lvblR5cGUgPSAnYWRkJyB8ICdtdWx0aXBseScgfCAnbWl4ZWQnXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgaW1wbGVtZW50cyBNaXNzaW5nQW5nbGVzRGF0YSB7XG4gICAgYW5nbGVzOiBudW1iZXJbXVxuICAgIG1pc3Npbmc6IGJvb2xlYW5bXVxuICAgIGFuZ2xlU3VtOiBudW1iZXJcbiAgICBhbmdsZUxhYmVsczogc3RyaW5nW11cbiAgICB4OiBudW1iZXIgLy9cblxuICAgIGNvbnN0cnVjdG9yIChhbmdsZXM6IG51bWJlcltdLCBtaXNzaW5nOiBib29sZWFuW10sIGFuZ2xlU3VtOiBudW1iZXIsIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSwgeDogbnVtYmVyKSB7XG4gICAgICB0aGlzLmFuZ2xlcyA9IGFuZ2xlc1xuICAgICAgdGhpcy5hbmdsZVN1bSA9IGFuZ2xlU3VtXG4gICAgICB0aGlzLmFuZ2xlTGFiZWxzID0gYW5nbGVMYWJlbHNcbiAgICAgIHRoaXMueCA9IHhcbiAgICAgIHRoaXMubWlzc2luZyA9IG1pc3NpbmdcbiAgICB9XG5cbiAgICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBBbGdlYnJhT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEge1xuICAgICAgLy8gY2FsY3VsYXRlZCBkZWZhdWx0cyBpZiBuZWNlc3NhcnlcbiAgICAgIG9wdGlvbnMubWF4Q29uc3RhbnQgPSBvcHRpb25zLm1heENvbnN0YW50IHx8IG9wdGlvbnMuYW5nbGVTdW0hIC8gMiAvLyBndWFyYW50ZWVkIG5vbi1udWxsIGZyb20gYWJvdmVcbiAgICAgIG9wdGlvbnMubWF4WFZhbHVlID0gb3B0aW9ucy5tYXhYVmFsdWUgfHwgb3B0aW9ucy5hbmdsZVN1bSEgLyA0XG5cbiAgICAgIC8vIFJhbmRvbWlzZS9zZXQgdXAgbWFpbiBmZWF0dXJlc1xuICAgICAgY29uc3QgbiA6IG51bWJlciA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTiwgb3B0aW9ucy5tYXhOKVxuXG4gICAgICBjb25zdCB0eXBlIDogRXhwcmVzc2lvblR5cGUgPSByYW5kRWxlbShvcHRpb25zLmV4cHJlc3Npb25UeXBlcyEpIC8vIGd1YXJhbnRlZWQgbm9uLW51bGwgZnJvbSBkZWZhdWwgYXNzaWdubWVudFxuXG4gICAgICAvLyBHZW5lcmF0ZSBleHByZXNzaW9ucy9hbmdsZXNcbiAgICAgIGxldCBleHByZXNzaW9ucyA6IExpbkV4cHJbXVxuICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ21peGVkJzpcbiAgICAgICAgICBleHByZXNzaW9ucyA9IG1ha2VNaXhlZEV4cHJlc3Npb25zKG4sIG9wdGlvbnMgYXMgUmVxdWlyZWQ8QWxnZWJyYU9wdGlvbnM+KVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ211bHRpcGx5JzpcbiAgICAgICAgICBleHByZXNzaW9ucyA9IG1ha2VNdWx0aXBsaWNhdGlvbkV4cHJlc3Npb25zKG4sIG9wdGlvbnMgYXMgUmVxdWlyZWQ8QWxnZWJyYU9wdGlvbnM+KVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ2FkZCc6XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgZXhwcmVzc2lvbnMgPSBtYWtlQWRkRXhwcmVzc2lvbnMobiwgb3B0aW9ucyBhcyBSZXF1aXJlZDxBbGdlYnJhT3B0aW9ucz4pXG4gICAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGV4cHJlc3Npb25zID0gc2h1ZmZsZShleHByZXNzaW9ucylcblxuICAgICAgLy8gU29sdmUgZm9yIHggYW5kIGFuZ2xlc1xuICAgICAgY29uc3QgeyB4LCBhbmdsZXMgfSA6IHt4Om51bWJlciwgYW5nbGVzOiBudW1iZXJbXX0gPSBzb2x2ZUFuZ2xlcyhleHByZXNzaW9ucywgb3B0aW9ucy5hbmdsZVN1bSEpIC8vIG5vbi1udWxsIGZyb20gZGVmYXVsdCBhc3NpZ25lbWVudFxuXG4gICAgICAvLyBsYWJlbHMgYXJlIGp1c3QgZXhwcmVzc2lvbnMgYXMgc3RyaW5nc1xuICAgICAgY29uc3QgbGFiZWxzID0gZXhwcmVzc2lvbnMubWFwKGUgPT4gYCR7ZS50b1N0cmluZ1AoKX1eXFxcXGNpcmNgKVxuXG4gICAgICAvLyBtaXNzaW5nIHZhbHVlcyBhcmUgdGhlIG9uZXMgd2hpY2ggYXJlbid0IGNvbnN0YW50XG4gICAgICBjb25zdCBtaXNzaW5nID0gZXhwcmVzc2lvbnMubWFwKGUgPT4gIWUuaXNDb25zdGFudCgpKVxuXG4gICAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YShhbmdsZXMsIG1pc3NpbmcsIG9wdGlvbnMuYW5nbGVTdW0hLCBsYWJlbHMsIHgpXG4gICAgfVxuXG4gICAgLy8gbWFrZXMgdHlwZXNjcmlwdCBzaHV0IHVwLCBtYWtlcyBlc2xpbnQgbm9pc3lcbiAgICBpbml0TGFiZWxzICgpIDogdm9pZCB7fSAgLy8gZXNsaW50LWRpc2FibGUtbGluZVxufVxuXG5mdW5jdGlvbiBtYWtlTWl4ZWRFeHByZXNzaW9ucyAobjogbnVtYmVyLCBvcHRpb25zOiBSZXF1aXJlZDxBbGdlYnJhT3B0aW9ucz4pIDogTGluRXhwcltdIHtcbiAgY29uc3QgZXhwcmVzc2lvbnM6IExpbkV4cHJbXSA9IFtdXG4gIGNvbnN0IHggPSByYW5kQmV0d2VlbihvcHRpb25zLm1pblhWYWx1ZSwgb3B0aW9ucy5tYXhYVmFsdWUpXG4gIGxldCBsZWZ0ID0gb3B0aW9ucy5hbmdsZVN1bVxuICBsZXQgYWxsY29uc3RhbnQgPSB0cnVlXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbiAtIDE7IGkrKykge1xuICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbigxLCBvcHRpb25zLm1heENvZWZmaWNpZW50KVxuICAgIGxlZnQgLT0gYSAqIHhcbiAgICBjb25zdCBtYXhiID0gTWF0aC5taW4obGVmdCAtIG9wdGlvbnMubWluQW5nbGUgKiAobiAtIGkgLSAxKSwgb3B0aW9ucy5tYXhDb25zdGFudClcbiAgICBjb25zdCBtaW5iID0gb3B0aW9ucy5taW5BbmdsZSAtIGEgKiB4XG4gICAgY29uc3QgYiA9IHJhbmRCZXR3ZWVuKG1pbmIsIG1heGIpXG4gICAgaWYgKGEgIT09IDApIHsgYWxsY29uc3RhbnQgPSBmYWxzZSB9XG4gICAgbGVmdCAtPSBiXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihhLCBiKSlcbiAgfVxuICBjb25zdCBsYXN0TWluWENvZWZmID0gYWxsY29uc3RhbnQgPyAxIDogb3B0aW9ucy5taW5Db2VmZmljaWVudFxuICBjb25zdCBhID0gcmFuZEJldHdlZW4obGFzdE1pblhDb2VmZiwgb3B0aW9ucy5tYXhDb2VmZmljaWVudClcbiAgY29uc3QgYiA9IGxlZnQgLSBhICogeFxuICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKGEsIGIpKVxuXG4gIHJldHVybiBleHByZXNzaW9uc1xufVxuXG5mdW5jdGlvbiBtYWtlQWRkRXhwcmVzc2lvbnMgKG46IG51bWJlciwgb3B0aW9uczogUmVxdWlyZWQ8QWxnZWJyYU9wdGlvbnM+KSA6IExpbkV4cHJbXSB7XG4gIGNvbnN0IGV4cHJlc3Npb25zOiBMaW5FeHByW10gPSBbXVxuICBjb25zdCBhbmdsZXM6IG51bWJlcltdID0gW11cbiAgY29uc3QgY29uc3RhbnRzID0gKG9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cyA9PT0gdHJ1ZSB8fCB3ZWFrSW5jbHVkZXMob3B0aW9ucy5pbmNsdWRlQ29uc3RhbnRzLCAnYWRkJykpXG4gIGlmIChuID09PSAyICYmIG9wdGlvbnMuZW5zdXJlWCAmJiBjb25zdGFudHMpIG4gPSAzXG5cbiAgY29uc3QgeCA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluWFZhbHVlLCBvcHRpb25zLm1heFhWYWx1ZSlcbiAgbGV0IGxlZnQgPSBvcHRpb25zLmFuZ2xlU3VtXG4gIGxldCBhbmdsZXNMZWZ0ID0gblxuXG4gIC8vIGZpcnN0IGRvIHRoZSBleHByZXNzaW9ucyBlbnN1cmVkIGJ5IGVuc3VyZV94IGFuZCBjb25zdGFudHNcbiAgaWYgKG9wdGlvbnMuZW5zdXJlWCkge1xuICAgIGFuZ2xlc0xlZnQtLVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgMCkpXG4gICAgYW5nbGVzLnB1c2goeClcbiAgICBsZWZ0IC09IHhcbiAgfVxuXG4gIGlmIChjb25zdGFudHMpIHtcbiAgICBhbmdsZXNMZWZ0LS1cbiAgICBjb25zdCBjID0gcmFuZEJldHdlZW4oXG4gICAgICBvcHRpb25zLm1pbkFuZ2xlLFxuICAgICAgbGVmdCAtIG9wdGlvbnMubWluQW5nbGUgKiBhbmdsZXNMZWZ0XG4gICAgKVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMCwgYykpXG4gICAgYW5nbGVzLnB1c2goYylcbiAgICBsZWZ0IC09IGNcbiAgfVxuXG4gIC8vIG1pZGRsZSBhbmdsZXNcbiAgd2hpbGUgKGFuZ2xlc0xlZnQgPiAxKSB7XG4gICAgLy8gYWRkICd4K2InIGFzIGFuIGV4cHJlc3Npb24uIE1ha2Ugc3VyZSBiIGdpdmVzIHNwYWNlXG4gICAgYW5nbGVzTGVmdC0tXG4gICAgbGVmdCAtPSB4XG4gICAgY29uc3QgbWF4YiA9IE1hdGgubWluKFxuICAgICAgbGVmdCAtIG9wdGlvbnMubWluQW5nbGUgKiBhbmdsZXNMZWZ0LFxuICAgICAgb3B0aW9ucy5tYXhDb25zdGFudFxuICAgIClcbiAgICBjb25zdCBtaW5iID0gTWF0aC5tYXgoXG4gICAgICBvcHRpb25zLm1pbkFuZ2xlIC0geCxcbiAgICAgIC1vcHRpb25zLm1heENvbnN0YW50XG4gICAgKVxuICAgIGNvbnN0IGIgPSByYW5kQmV0d2VlbihtaW5iLCBtYXhiKVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgYikpXG4gICAgYW5nbGVzLnB1c2goeCArIGIpXG4gICAgbGVmdCAtPSBiXG4gIH1cblxuICAvLyBsYXN0IGFuZ2xlXG4gIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgbGVmdCAtIHgpKVxuICBhbmdsZXMucHVzaChsZWZ0KVxuXG4gIHJldHVybiBleHByZXNzaW9uc1xufVxuXG5mdW5jdGlvbiBtYWtlTXVsdGlwbGljYXRpb25FeHByZXNzaW9ucyAobjogbnVtYmVyLCBvcHRpb25zOiBBbGdlYnJhT3B0aW9ucykgOiBMaW5FeHByW10ge1xuICBjb25zdCBleHByZXNzaW9ucyA6IExpbkV4cHJbXSA9IFtdXG5cbiAgY29uc3QgY29uc3RhbnRzIDogYm9vbGVhbiA9IChvcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPT09IHRydWUgfHwgd2Vha0luY2x1ZGVzKG9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cywgJ211bHQnKSlcbiAgaWYgKG4gPT09IDIgJiYgb3B0aW9ucy5lbnN1cmVYICYmIGNvbnN0YW50cykgbiA9IDMgLy8gbmVlZCBhdCBsZWFzdCAzIGFuZ2xlcyBmb3IgdGhpcyB0byBtYWtlIHNlbnNlXG5cbiAgLy8gY2hvb3NlIGEgdG90YWwgb2YgY29lZmZpY2llbnRzXG4gIC8vIHBpY2sgeCBiYXNlZCBvbiB0aGF0XG4gIGxldCBhbmdsZXNsZWZ0ID0gblxuICBjb25zdCB0b3RhbENvZWZmID0gY29uc3RhbnRzXG4gICAgPyByYW5kQmV0d2VlbihuLCAob3B0aW9ucy5hbmdsZVN1bSAtIG9wdGlvbnMubWluQW5nbGUpIC8gb3B0aW9ucy5taW5BbmdsZSwgTWF0aC5yYW5kb20pIC8vIGlmIGl0J3MgdG9vIGJpZywgYW5nbGVzIGdldCB0b28gc21hbGxcbiAgICA6IHJhbmRFbGVtKFszLCA0LCA1LCA2LCA4LCA5LCAxMF0uZmlsdGVyKHggPT4geCA+PSBuKSwgTWF0aC5yYW5kb20pXG4gIGxldCBjb2VmZmxlZnQgPSB0b3RhbENvZWZmXG5cbiAgLy8gZmlyc3QgMC8xLzJcbiAgaWYgKGNvbnN0YW50cykge1xuICAgIC8vIHJlZHVjZSB0byBtYWtlIHdoYXQncyBsZWZ0IGEgbXVsdGlwbGUgb2YgdG90YWxfY29lZmZcbiAgICBhbmdsZXNsZWZ0LS1cbiAgICBjb25zdCBuZXdsZWZ0ID0gcmFuZE11bHRCZXR3ZWVuKHRvdGFsQ29lZmYgKiBvcHRpb25zLm1pbkFuZ2xlLCBvcHRpb25zLmFuZ2xlU3VtIC0gb3B0aW9ucy5taW5BbmdsZSwgdG90YWxDb2VmZilcbiAgICBjb25zdCBjID0gb3B0aW9ucy5hbmdsZVN1bSAtIG5ld2xlZnRcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDAsIGMpKVxuICB9XG5cbiAgLy8gRG9uJ3QgdXNlIHggaGVyZSwgYnV0OlxuICAvLyB4ID0gbGVmdCAvIHRvdGFsQ29lZmZcblxuICBpZiAob3B0aW9ucy5lbnN1cmVYKSB7XG4gICAgYW5nbGVzbGVmdC0tXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCAwKSlcbiAgICBjb2VmZmxlZnQgLT0gMVxuICB9XG5cbiAgLy8gbWlkZGxlXG4gIHdoaWxlIChhbmdsZXNsZWZ0ID4gMSkge1xuICAgIGFuZ2xlc2xlZnQtLVxuICAgIGNvbnN0IG1pbmEgPSAxXG4gICAgY29uc3QgbWF4YSA9IGNvZWZmbGVmdCAtIGFuZ2xlc2xlZnQgLy8gbGVhdmUgZW5vdWdoIGZvciBvdGhlcnMgVE9ETzogYWRkIG1heF9jb2VmZlxuICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbihtaW5hLCBtYXhhKVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoYSwgMCkpXG4gICAgY29lZmZsZWZ0IC09IGFcbiAgfVxuXG4gIC8vIGxhc3RcbiAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihjb2VmZmxlZnQsIDApKVxuICByZXR1cm4gZXhwcmVzc2lvbnNcbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3IGV4dGVuZHMgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcge1xuICAvLyBPIDogUG9pbnQgICAgICBJbmhlcml0ZWQgZnJvbSBNaXNzaW5nQW5nbGVzQXJvdW5kVmlld1xuICAvLyBBOiBQb2ludCAgICAgICAgIHxcbiAgLy8gQzogUG9pbnRbXSAgICAgICB8XG4gIC8vIHJvdGF0aW9uOiBudW1iZXIgVlxuXG4gICAgLy8gbGFiZWxzOiBMYWJlbFtdICAgICAgICAgICAgSW5oZXJpdGVkIGZyb20gR3JhcGhpY1FWaWV3XG4gICAgLy8gY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCAgICAgIHxcbiAgICAvLyBET006IEhUTUxFbGVtZW50ICAgICAgICAgICAgICAgfFxuICAgIC8vIHdpZHRoOiBudW1iZXIgICAgICAgICAgICAgICAgICB8XG4gICAgLy8gaGVpZ2h0OiBudW1iZXIgICAgICAgICAgICAgICAgIFZcbiAgICBkYXRhITogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIC8vIGluaXRpYWxpc2VkIGJ5IHN1cGVyKClcblxuICAgIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEsIG9wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykge1xuICAgICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc3VwZXIgY29uc3RydWN0b3IgZG9lcyByZWFsIHdvcmtcbiAgICAgIGNvbnN0IHNvbHV0aW9uTGFiZWw6IFBhcnRpYWw8TGFiZWw+ID0ge1xuICAgICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdGhpcy5oZWlnaHQgLSAxMCksXG4gICAgICAgIHRleHRxOiAnJyxcbiAgICAgICAgdGV4dGE6IGB4ID0gJHt0aGlzLmRhdGEueH1eXFxcXGNpcmNgLFxuICAgICAgICBzdHlsZXE6ICdoaWRkZW4nLFxuICAgICAgICBzdHlsZWE6ICdleHRyYS1hbnN3ZXInXG4gICAgICB9XG4gICAgICBzb2x1dGlvbkxhYmVsLnN0eWxlID0gc29sdXRpb25MYWJlbC5zdHlsZXFcbiAgICAgIHNvbHV0aW9uTGFiZWwudGV4dCA9IHNvbHV0aW9uTGFiZWwudGV4dHFcblxuICAgICAgdGhpcy5sYWJlbHMucHVzaChzb2x1dGlvbkxhYmVsIGFzIExhYmVsKVxuICAgIH1cbn1cbiIsIi8qKiBNaXNzaW5nIGFuZ2xlcyBhcm91bmQgYSBwb2ludCBvciBvbiBhIHN0cmFpZ2h0IGxpbmUsIHVzaW5nIGFsZ2VicmFpYyBleHByZXNzaW9ucyAqL1xuXG5pbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCB7IEFsZ2VicmFPcHRpb25zIH0gZnJvbSAnLi9BbGdlYnJhT3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3J1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzVmlld09wdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSAvLyBpbml0aWFsaXNlZCBpbiBzdXBlcigpXG4gIHZpZXchOiBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXdcblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBQYXJ0aWFsPEFsZ2VicmFPcHRpb25zPiwgdmlld09wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEge1xuICAgIGNvbnN0IGRlZmF1bHRzIDogQWxnZWJyYU9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDE1LFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDQsXG4gICAgICByZXBlYXRlZDogZmFsc2UsXG4gICAgICBleHByZXNzaW9uVHlwZXM6IFsnYWRkJywgJ211bHRpcGx5JywgJ21peGVkJ10sXG4gICAgICBlbnN1cmVYOiB0cnVlLFxuICAgICAgaW5jbHVkZUNvbnN0YW50czogdHJ1ZSxcbiAgICAgIG1pbkNvZWZmaWNpZW50OiAxLFxuICAgICAgbWF4Q29lZmZpY2llbnQ6IDQsXG4gICAgICBtaW5YVmFsdWU6IDE1XG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzOiBBbGdlYnJhT3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YS5yYW5kb20oc2V0dGluZ3MpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcoZGF0YSwgdmlld09wdGlvbnMpIFxuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cblxuICBzdGF0aWMgZ2V0IG9wdGlvbnNTcGVjICgpIDogT3B0aW9uc1NwZWMge1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnZXhwcmVzc2lvblR5cGVzJyxcbiAgICAgICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgICAgICB0aXRsZTogJ1R5cGVzIG9mIGV4cHJlc3Npb24nLFxuICAgICAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICAgICAgeyB0aXRsZTogJzxlbT5hPC9lbT4rPGVtPng8L2VtPicsIGlkOiAnYWRkJyB9LFxuICAgICAgICAgIHsgdGl0bGU6ICc8ZW0+YXg8L2VtPicsIGlkOiAnbXVsdGlwbHknIH0sXG4gICAgICAgICAgeyB0aXRsZTogJ21peGVkJywgaWQ6ICdtaXhlZCcgfVxuICAgICAgICBdLFxuICAgICAgICBkZWZhdWx0OiBbJ2FkZCcsICdtdWx0aXBseScsICdtaXhlZCddXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogJ2Vuc3VyZVgnLFxuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnRW5zdXJlIG9uZSBhbmdsZSBpcyA8ZW0+eDwvZW0+JyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgaWQ6ICdpbmNsdWRlQ29uc3RhbnRzJyxcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJ0Vuc3VyZSBhIGNvbnN0YW50IGFuZ2xlJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgfVxuICAgIF1cbiAgfVxufVxuIiwiaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgTGFiZWwgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFWaWV3IGV4dGVuZHMgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyB7XG4gIGRhdGEhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgLy8gaW5pdGlhbGlzZWQgaW4gc3VwZXIuc3VwZXJcbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSwgb3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKVxuXG4gICAgY29uc3Qgc29sdXRpb25MYWJlbDogUGFydGlhbDxMYWJlbD4gPSB7XG4gICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdGhpcy5oZWlnaHQgLSAxMCksXG4gICAgICB0ZXh0cTogJycsXG4gICAgICB0ZXh0YTogYHggPSAke3RoaXMuZGF0YS54fV5cXFxcY2lyY2AsXG4gICAgICBzdHlsZXE6ICdoaWRkZW4nLFxuICAgICAgc3R5bGVhOiAnZXh0cmEtYW5zd2VyJ1xuICAgIH1cbiAgICBzb2x1dGlvbkxhYmVsLnN0eWxlID0gc29sdXRpb25MYWJlbC5zdHlsZXFcbiAgICBzb2x1dGlvbkxhYmVsLnRleHQgPSBzb2x1dGlvbkxhYmVsLnRleHRxXG5cbiAgICB0aGlzLmxhYmVscy5wdXNoKHNvbHV0aW9uTGFiZWwgYXMgTGFiZWwpXG4gIH1cbn1cbiIsImltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgeyBBbGdlYnJhT3B0aW9ucyB9IGZyb20gJy4vQWxnZWJyYU9wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVZpZXcnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhITogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhXG4gIHZpZXchOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogUGFydGlhbDxBbGdlYnJhT3B0aW9ucz4sIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUSB7XG4gICAgY29uc3Qgb3B0aW9uc092ZXJyaWRlIDogUGFydGlhbDxBbGdlYnJhT3B0aW9ucz4gPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDMsXG4gICAgICByZXBlYXRlZDogZmFsc2VcbiAgICB9XG4gICAgY29uc3QgZGVmYXVsdHMgOiBBbGdlYnJhT3B0aW9ucyA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5OOiAzLFxuICAgICAgbWF4TjogMyxcbiAgICAgIHJlcGVhdGVkOiBmYWxzZSxcbiAgICAgIG1pbkFuZ2xlOiAyNSxcbiAgICAgIGV4cHJlc3Npb25UeXBlczogWydhZGQnLCAnbXVsdGlwbHknLCAnbWl4ZWQnXSxcbiAgICAgIGVuc3VyZVg6IHRydWUsXG4gICAgICBpbmNsdWRlQ29uc3RhbnRzOiB0cnVlLFxuICAgICAgbWluQ29lZmZpY2llbnQ6IDEsXG4gICAgICBtYXhDb2VmZmljaWVudDogNCxcbiAgICAgIG1pblhWYWx1ZTogMTVcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3M6IEFsZ2VicmFPcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMsIG9wdGlvbnNPdmVycmlkZSlcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEucmFuZG9tKHNldHRpbmdzKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVZpZXcoZGF0YSwgdmlld09wdGlvbnMpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzV29yZGVkRGF0YSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkVmlldyBleHRlbmRzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcge1xuICBkYXRhITogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgLy8gaW5pdGlhbGlzZWQgaW4gc3VwZXJcbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLCBvcHRpb25zOiBWaWV3T3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpXG4gICAgc3VwZXIuc2NhbGVUb0ZpdCh0aGlzLndpZHRoLCB0aGlzLmhlaWdodCwgNDApXG4gICAgc3VwZXIudHJhbnNsYXRlKDAsIC0zMClcblxuICAgIGNvbnN0IGluc3RydWN0aW9uTGFiZWw6IExhYmVsID0ge1xuICAgICAgdGV4dHE6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHRleHRhOiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICB0ZXh0OiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICBzdHlsZXE6ICdleHRyYS1pbmZvJyxcbiAgICAgIHN0eWxlYTogJ2V4dHJhLWluZm8nLFxuICAgICAgc3R5bGU6ICdleHRyYS1pbmZvJyxcbiAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwKVxuICAgIH1cbiAgICB0aGlzLmxhYmVscy5wdXNoKGluc3RydWN0aW9uTGFiZWwpXG4gIH1cbn1cbiIsImltcG9ydCBMaW5FeHByIGZyb20gJ0xpbkV4cHInXG5pbXBvcnQgeyByYW5kQmV0d2VlbiwgcmFuZEVsZW0sIHJhbmRNdWx0QmV0d2VlbiB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCB7IEdyYXBoaWNRRGF0YSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSdcbmltcG9ydCB7IHNvbHZlQW5nbGVzIH0gZnJvbSAnLi9zb2x2ZUFuZ2xlcydcbmltcG9ydCB7IFdvcmRlZE9wdGlvbnMgfSBmcm9tICcuL1dvcmRlZE9wdGlvbnMnXG5cbmV4cG9ydCB0eXBlIFdvcmRlZFR5cGUgPSAnYWRkJyB8ICdtdWx0aXBseScgfCAncmF0aW8nIHwgJ3BlcmNlbnQnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGltcGxlbWVudHMgR3JhcGhpY1FEYXRhIHtcbiAgYW5nbGVzOiBudW1iZXJbXVxuICBtaXNzaW5nOiBib29sZWFuW11cbiAgYW5nbGVTdW06IG51bWJlclxuICBhbmdsZUxhYmVsczogc3RyaW5nW11cbiAgaW5zdHJ1Y3Rpb25zOiBzdHJpbmdbXSAvLyBUaGUgJ2luc3RydWN0aW9ucycgZ2l2ZW5cblxuICBjb25zdHJ1Y3RvciAoYW5nbGVzOiBudW1iZXJbXSwgbWlzc2luZzogYm9vbGVhbltdLCBhbmdsZVN1bTogbnVtYmVyLCBhbmdsZUxhYmVsczogc3RyaW5nW10sIGluc3RydWN0aW9uczogc3RyaW5nW10pIHtcbiAgICB0aGlzLmFuZ2xlcyA9IGFuZ2xlc1xuICAgIHRoaXMubWlzc2luZyA9IG1pc3NpbmdcbiAgICB0aGlzLmFuZ2xlU3VtID0gYW5nbGVTdW1cbiAgICB0aGlzLmFuZ2xlTGFiZWxzID0gYW5nbGVMYWJlbHNcbiAgICB0aGlzLmluc3RydWN0aW9ucyA9IGluc3RydWN0aW9uc1xuICAgIHRoaXMuaW5zdHJ1Y3Rpb25zID0gaW5zdHJ1Y3Rpb25zXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zIDogV29yZGVkT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSB7XG4gICAgY29uc3QgbiA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTiwgb3B0aW9ucy5tYXhOKVxuICAgIGNvbnN0IGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIGFuZ2xlTGFiZWxzW2ldID0gU3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpIC8vIDY1ID0gJ0EnXG4gICAgfVxuICAgIGxldCBleHByZXNzaW9uczogTGluRXhwcltdID0gW11cbiAgICBsZXQgaW5zdHJ1Y3Rpb25zOiBzdHJpbmdbXSA9IFtdXG5cbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKVxuXG4gICAgLy8gTG9vcCB0aWwgd2UgZ2V0IG9uZSB0aGF0IHdvcmtzXG4gICAgLy8gUHJvYmFibHkgcmVhbGx5IGluZWZmaWNpZW50ISFcblxuICAgIGxldCBzdWNjZXNzID0gZmFsc2VcbiAgICBsZXQgYXR0ZW1wdGNvdW50ID0gMFxuICAgIHdoaWxlICghc3VjY2Vzcykge1xuICAgICAgaWYgKGF0dGVtcHRjb3VudCA+IDIwKSB7XG4gICAgICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgMCkpXG4gICAgICAgIGNvbnNvbGUubG9nKCdHYXZlIHVwIGFmdGVyICcgKyBhdHRlbXB0Y291bnQgKyAnIGF0dGVtcHRzJylcbiAgICAgICAgc3VjY2VzcyA9IHRydWVcbiAgICAgIH1cbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSByYW5kRWxlbShvcHRpb25zLnR5cGVzKVxuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICBjYXNlICdhZGQnOiB7XG4gICAgICAgICAgICBjb25zdCBhZGRlbmQgPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbkFkZGVuZCwgb3B0aW9ucy5tYXhBZGRlbmQpXG4gICAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb25zW2kgLSAxXS5hZGQoYWRkZW5kKSlcbiAgICAgICAgICAgIGluc3RydWN0aW9ucy5wdXNoKGBcXFxcdGV4dHtBbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSl9JCBpcyAke2NvbXBhcmF0b3IoYWRkZW5kLCAnKycpfSBhbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY0ICsgaSl9JH1gKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSAnbXVsdGlwbHknOiB7XG4gICAgICAgICAgICBjb25zdCBtdWx0aXBsaWVyID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5NdWx0aXBsaWVyLCBvcHRpb25zLm1heE11bHRpcGxpZXIpXG4gICAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb25zW2kgLSAxXS50aW1lcyhtdWx0aXBsaWVyKSlcbiAgICAgICAgICAgIGluc3RydWN0aW9ucy5wdXNoKGBcXFxcdGV4dHtBbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSl9JCBpcyAke2NvbXBhcmF0b3IobXVsdGlwbGllciwgJyonKX0gYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NCArIGkpfSR9YClcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ3BlcmNlbnQnOiB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50YWdlID0gcmFuZE11bHRCZXR3ZWVuKDUsIDEwMCwgNSlcbiAgICAgICAgICAgIGNvbnN0IGluY3JlYXNlID0gTWF0aC5yYW5kb20oKSA8IDAuNVxuICAgICAgICAgICAgY29uc3QgbXVsdGlwbGllciA9IGluY3JlYXNlID8gMSArIHBlcmNlbnRhZ2UgLyAxMDAgOiAxIC0gcGVyY2VudGFnZSAvIDEwMFxuICAgICAgICAgICAgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uc1tpIC0gMV0udGltZXMobXVsdGlwbGllcikpXG4gICAgICAgICAgICBpbnN0cnVjdGlvbnMucHVzaChcbiAgICAgICAgICAgICAgYFxcXFx0ZXh0e0FuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKX0kIGlzICQke3BlcmNlbnRhZ2V9XFxcXCUkICR7aW5jcmVhc2UgPyAnYmlnZ2VyJyA6ICdzbWFsbGVyJ30gdGhhbiBhbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY0ICsgaSl9JH1gKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSAncmF0aW8nOiB7XG4gICAgICAgICAgICBjb25zdCBhID0gcmFuZEJldHdlZW4oMSwgMTApXG4gICAgICAgICAgICBjb25zdCBiID0gcmFuZEJldHdlZW4oMSwgMTApXG4gICAgICAgICAgICBjb25zdCBtdWx0aXBsaWVyID0gYiAvIGFcbiAgICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2goZXhwcmVzc2lvbnNbaSAtIDFdLnRpbWVzKG11bHRpcGxpZXIpKVxuICAgICAgICAgICAgaW5zdHJ1Y3Rpb25zLnB1c2goXG4gICAgICAgICAgICAgIGBcXFxcdGV4dHtUaGUgcmF0aW8gb2YgYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NCArIGkpfSQgdG8gYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpfSQgaXMgJCR7YX06JHtifSR9YFxuICAgICAgICAgICAgKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gY2hlY2sgaXQgbWFrZXMgc2Vuc2VcbiAgICAgIHN1Y2Nlc3MgPSB0cnVlXG4gICAgICBjb25zdCBleHByZXNzaW9uc3VtID0gZXhwcmVzc2lvbnMucmVkdWNlKChleHAxLCBleHAyKSA9PiBleHAxLmFkZChleHAyKSlcbiAgICAgIGNvbnN0IHggPSBMaW5FeHByLnNvbHZlKGV4cHJlc3Npb25zdW0sIG5ldyBMaW5FeHByKDAsIG9wdGlvbnMuYW5nbGVTdW0pKVxuXG4gICAgICBleHByZXNzaW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChleHByKSB7XG4gICAgICAgIGlmICghc3VjY2VzcyB8fCBleHByLmV2YWwoeCkgPCBvcHRpb25zLm1pbkFuZ2xlKSB7XG4gICAgICAgICAgc3VjY2VzcyA9IGZhbHNlXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zID0gW11cbiAgICAgICAgICBleHByZXNzaW9ucyA9IFtleHByZXNzaW9uc1swXV1cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgYXR0ZW1wdGNvdW50KytcbiAgICB9XG4gICAgY29uc29sZS5sb2coJ0F0dGVtcHRzOiAnICsgYXR0ZW1wdGNvdW50KVxuXG4gICAgY29uc3QgYW5nbGVzID0gc29sdmVBbmdsZXMoZXhwcmVzc2lvbnMsIG9wdGlvbnMuYW5nbGVTdW0pLmFuZ2xlc1xuICAgIGNvbnN0IG1pc3NpbmcgPSBhbmdsZXMubWFwKCgpID0+IHRydWUpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVzLCBtaXNzaW5nLCBvcHRpb25zLmFuZ2xlU3VtLCBhbmdsZUxhYmVscywgaW5zdHJ1Y3Rpb25zKVxuICB9XG5cbiAgLy8gbWFrZXMgdHlwZXNjcmlwdCBzaHV0IHVwLCBtYWtlcyBlc2xpbnQgbm9pc3lcbiAgaW5pdExhYmVscygpOiB2b2lkIHsgfSAgLy8gZXNsaW50LWRpc2FibGUtbGluZVxufVxuXG4vKipcbiAqIEdlbmVyYXRlcyB3b3JkZWQgdmVyc2lvbiBvZiBhbiBvcGVyYXRpb1xuICogQHBhcmFtIG51bWJlciBUaGUgbXVsdGlwbGllciBvciBhZGRlbmRcbiAqIEBwYXJhbSBvcGVyYXRvciBUaGUgb3BlcmF0b3IsIGUuZyBhZGRpbmcgJ21vcmUgdGhhbicsIG9yIG11bHRpcGx5aW5nICd0aW1lcyBsYXJnZXIgdGhhbidcbiAqL1xuZnVuY3Rpb24gY29tcGFyYXRvciAobnVtYmVyOiBudW1iZXIsIG9wZXJhdG9yOiAnKid8JysnKSB7XG4gIHN3aXRjaCAob3BlcmF0b3IpIHtcbiAgICBjYXNlICcqJzpcbiAgICAgIHN3aXRjaCAobnVtYmVyKSB7XG4gICAgICAgIGNhc2UgMTogcmV0dXJuICd0aGUgc2FtZSBhcydcbiAgICAgICAgY2FzZSAyOiByZXR1cm4gJ2RvdWJsZSdcbiAgICAgICAgZGVmYXVsdDogcmV0dXJuIGAkJHtudW1iZXJ9JCB0aW1lcyBsYXJnZXIgdGhhbmBcbiAgICAgIH1cbiAgICBjYXNlICcrJzpcbiAgICAgIHN3aXRjaCAobnVtYmVyKSB7XG4gICAgICAgIGNhc2UgMDogcmV0dXJuICd0aGUgc2FtZSBhcydcbiAgICAgICAgZGVmYXVsdDogcmV0dXJuIGAkJHtNYXRoLmFicyhudW1iZXIpLnRvU3RyaW5nKCl9XlxcXFxjaXJjJCAkeyhudW1iZXIgPCAwKSA/ICdsZXNzIHRoYW4nIDogJ21vcmUgdGhhbid9YFxuICAgICAgfVxuICB9XG59XG4iLCJpbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3J1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEnXG5pbXBvcnQgeyBXb3JkZWRPcHRpb25zIH0gZnJvbSAnLi9Xb3JkZWRPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhITogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGFcbiAgdmlldyE6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXdcblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBQYXJ0aWFsPFdvcmRlZE9wdGlvbnM+LCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkUSB7XG4gICAgY29uc3Qgb3B0aW9uc092ZXJyaWRlIDogUGFydGlhbDxXb3JkZWRPcHRpb25zPiA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5OOiAzLFxuICAgICAgbWF4TjogMyxcbiAgICAgIHJlcGVhdGVkOiBmYWxzZVxuICAgIH1cbiAgICBjb25zdCBkZWZhdWx0cyA6IFdvcmRlZE9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDI1LFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDMsXG4gICAgICByZXBlYXRlZDogZmFsc2UsXG4gICAgICBtaW5BZGRlbmQ6IC02MCxcbiAgICAgIG1heEFkZGVuZDogNjAsXG4gICAgICBtaW5NdWx0aXBsaWVyOiAxLFxuICAgICAgbWF4TXVsdGlwbGllcjogNSxcbiAgICAgIHR5cGVzOiBbJ2FkZCcsICdtdWx0aXBseScsICdwZXJjZW50JywgJ3JhdGlvJ11cbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3M6IFdvcmRlZE9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucywgb3B0aW9uc092ZXJyaWRlKVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLnJhbmRvbShzZXR0aW5ncylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXcoZGF0YSwgdmlld09wdGlvbnMpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3IGV4dGVuZHMgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcge1xuICBkYXRhITogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgLy8gaW5pdGlhbGlzZWQgaW4gY2FsbCB0byBzdXBlclxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEsIG9wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIGRvZXMgbW9zdCBvZiB0aGUgc2V0IHVwXG4gICAgc3VwZXIudHJhbnNsYXRlKDAsIC0xNSlcbiAgICBjb25zdCBpbnN0cnVjdGlvbkxhYmVsIDogTGFiZWwgPSB7XG4gICAgICB0ZXh0cTogdGhpcy5kYXRhLmluc3RydWN0aW9ucy5qb2luKCdcXFxcXFxcXCcpLFxuICAgICAgdGV4dGE6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHRleHQ6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHN0eWxlcTogJ2V4dHJhLWluZm8nLFxuICAgICAgc3R5bGVhOiAnZXh0cmEtaW5mbycsXG4gICAgICBzdHlsZTogJ2V4dHJhLWluZm8nLFxuICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIHRoaXMuaGVpZ2h0IC0gMTApXG4gICAgfVxuICAgIHRoaXMubGFiZWxzLnB1c2goaW5zdHJ1Y3Rpb25MYWJlbClcbiAgfVxufVxuIiwiaW1wb3J0IHsgT3B0aW9uc1NwZWMgfSBmcm9tICdPcHRpb25zU3BlYydcbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEnXG5pbXBvcnQgeyBXb3JkZWRPcHRpb25zIH0gZnJvbSAnLi9Xb3JkZWRPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzV29yZGVkUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhXG4gIHZpZXchOiBNaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlld1xuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFBhcnRpYWw8V29yZGVkT3B0aW9ucz4sIHZpZXdPcHRpb25zOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1dvcmRlZFEge1xuICAgIGNvbnN0IGRlZmF1bHRzIDogV29yZGVkT3B0aW9ucyA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5BbmdsZTogMTUsXG4gICAgICBtaW5OOiAyLFxuICAgICAgbWF4TjogMixcbiAgICAgIHJlcGVhdGVkOiBmYWxzZSxcbiAgICAgIG1pbkFkZGVuZDogLTkwLFxuICAgICAgbWF4QWRkZW5kOiA5MCxcbiAgICAgIG1pbk11bHRpcGxpZXI6IDEsXG4gICAgICBtYXhNdWx0aXBsaWVyOiA1LFxuICAgICAgdHlwZXM6IFsnYWRkJywgJ211bHRpcGx5JywgJ3BlcmNlbnQnLCAncmF0aW8nXVxuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLnJhbmRvbShzZXR0aW5ncylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3KGRhdGEsIHZpZXdPcHRpb25zKVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IG9wdGlvbnNTcGVjICgpOiBPcHRpb25zU3BlYyB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgICAgICB0aXRsZTogJ1F1ZXN0aW9uIHR5cGVzJyxcbiAgICAgICAgaWQ6ICd0eXBlcycsXG4gICAgICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgICAgICB7IHRpdGxlOiAnTW9yZSB0aGFuL2xlc3MgdGhhbicsIGlkOiAnYWRkJyB9LFxuICAgICAgICAgIHsgdGl0bGU6ICdNdWx0aXBsZXMnLCBpZDogJ211bHRpcGx5JyB9LFxuICAgICAgICAgIHsgdGl0bGU6ICdQZXJjZW50YWdlIGNoYW5nZScsIGlkOiAncGVyY2VudCcgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnUmF0aW9zJywgaWQ6ICdyYXRpbycgfVxuICAgICAgICBdLFxuICAgICAgICBkZWZhdWx0OiBbJ2FkZCcsICdtdWx0aXBseSddXG4gICAgICB9XG4gICAgXVxuICB9XG59XG4iLCIvKiogIENsYXNzIHRvIHdyYXAgdmFyaW91cyBtaXNzaW5nIGFuZ2xlcyBjbGFzc2VzXG4gKiBSZWFkcyBvcHRpb25zIGFuZCB0aGVuIHdyYXBzIHRoZSBhcHByb3ByaWF0ZSBvYmplY3QsIG1pcnJvcmluZyB0aGUgbWFpblxuICogcHVibGljIG1ldGhvZHNcbiAqXG4gKiBUaGlzIGNsYXNzIGRlYWxzIHdpdGggdHJhbnNsYXRpbmcgZGlmZmljdWx0eSBpbnRvIHF1ZXN0aW9uIHR5cGVzXG4qL1xuXG5pbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tICd1dGlsaXRpZXMnXG5cbmltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbi9RdWVzdGlvbidcbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5cbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVRJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSBmcm9tICcuL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFRJ1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tICcuL0FsZ2VicmFPcHRpb25zJ1xuXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkUSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1dvcmRlZFEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzV29yZGVkUSdcbmltcG9ydCB7IFdvcmRlZE9wdGlvbnMgfSBmcm9tICcuL1dvcmRlZE9wdGlvbnMnXG5cbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuXG50eXBlIFF1ZXN0aW9uVHlwZSA9ICdhb3NsJyB8ICdhYWFwJyB8ICd0cmlhbmdsZSdcbnR5cGUgUXVlc3Rpb25TdWJUeXBlID0gJ3NpbXBsZScgfCAncmVwZWF0ZWQnIHwgJ2FsZ2VicmEnIHwgJ3dvcmRlZCdcblxudHlwZSBRdWVzdGlvbk9wdGlvbnMgPSBNaXNzaW5nQW5nbGVPcHRpb25zICYgQWxnZWJyYU9wdGlvbnMgJiBXb3JkZWRPcHRpb25zIC8vIG9wdGlvbnMgdG8gcGFzcyB0byBxdWVzdGlvbnNcblxuLyoqIFRoZSBvcHRpb25zIHBhc3NlZCB1c2luZyBvcHRpb25zU3BlYyAqL1xuaW50ZXJmYWNlIFdyYXBwZXJPcHRpb25zIHtcbiAgZGlmZmljdWx0eTogbnVtYmVyLFxuICB0eXBlczogUXVlc3Rpb25UeXBlW10sXG4gIGN1c3RvbTogYm9vbGVhbixcbiAgbWluTjogbnVtYmVyLFxuICBtYXhOOiBudW1iZXIsXG4gIHNpbXBsZTogYm9vbGVhbixcbiAgcmVwZWF0ZWQ6IGJvb2xlYW4sXG4gIGFsZ2VicmE6IGJvb2xlYW4sXG4gIGFsZ2VicmFPcHRpb25zOiBBbGdlYnJhT3B0aW9uc1xuICB3b3JkZWQ6IGJvb2xlYW4sXG4gIHdvcmRlZE9wdGlvbnM6IFdvcmRlZE9wdGlvbnNcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1EgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIHF1ZXN0aW9uOiBHcmFwaGljUVxuXG4gIGNvbnN0cnVjdG9yIChxdWVzdGlvbjogR3JhcGhpY1EpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5xdWVzdGlvbiA9IHF1ZXN0aW9uXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBXcmFwcGVyT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzUSB7XG4gICAgaWYgKG9wdGlvbnMudHlwZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1R5cGVzIGxpc3QgbXVzdCBiZSBub24tZW1wdHknKVxuICAgIH1cbiAgICBjb25zdCB0eXBlIDogUXVlc3Rpb25UeXBlID0gcmFuZEVsZW0ob3B0aW9ucy50eXBlcylcblxuICAgIGlmICghb3B0aW9ucy5jdXN0b20pIHtcbiAgICAgIHJldHVybiBNaXNzaW5nQW5nbGVzUS5yYW5kb21Gcm9tRGlmZmljdWx0eSh0eXBlLCBvcHRpb25zLmRpZmZpY3VsdHkpXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGNob29zZSBzdWJ0eXBlXG4gICAgICBjb25zdCBhdmFpbGFibGVTdWJ0eXBlcyA6IFF1ZXN0aW9uU3ViVHlwZVtdID0gWydzaW1wbGUnLCAncmVwZWF0ZWQnLCAnYWxnZWJyYScsICd3b3JkZWQnXVxuICAgICAgY29uc3Qgc3VidHlwZXMgOiBRdWVzdGlvblN1YlR5cGVbXSA9IFtdXG4gICAgICBhdmFpbGFibGVTdWJ0eXBlcy5mb3JFYWNoKHN1YnR5cGUgPT4ge1xuICAgICAgICBpZiAob3B0aW9uc1tzdWJ0eXBlXSkgeyBzdWJ0eXBlcy5wdXNoKHN1YnR5cGUpIH1cbiAgICAgIH0pXG4gICAgICBjb25zdCBzdWJ0eXBlIDogUXVlc3Rpb25TdWJUeXBlID0gcmFuZEVsZW0oc3VidHlwZXMpXG5cbiAgICAgIC8vIGJ1aWxkIG9wdGlvbnMgb2JqZWN0XG4gICAgICBsZXQgcXVlc3Rpb25PcHRpb25zIDogUGFydGlhbDxRdWVzdGlvbk9wdGlvbnM+ID0ge31cbiAgICAgIGlmIChzdWJ0eXBlID09PSAnc2ltcGxlJyB8fCBzdWJ0eXBlID09PSAncmVwZWF0ZWQnKSB7XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucyA9IHt9XG4gICAgICB9IGVsc2UgaWYgKHN1YnR5cGUgPT09ICdhbGdlYnJhJykge1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMgPSBvcHRpb25zLmFsZ2VicmFPcHRpb25zXG4gICAgICB9IGVsc2UgaWYgKHN1YnR5cGUgPT09ICd3b3JkZWQnKSB7XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucyA9IG9wdGlvbnMud29yZGVkT3B0aW9uc1xuICAgICAgfVxuICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSBvcHRpb25zLm1pbk5cbiAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gb3B0aW9ucy5tYXhOXG5cbiAgICAgIHJldHVybiBNaXNzaW5nQW5nbGVzUS5yYW5kb21Gcm9tVHlwZVdpdGhPcHRpb25zKHR5cGUsIHN1YnR5cGUsIHF1ZXN0aW9uT3B0aW9ucylcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgcmFuZG9tRnJvbURpZmZpY3VsdHkgKHR5cGU6IFF1ZXN0aW9uVHlwZSwgZGlmZmljdWx0eTogbnVtYmVyKSB7XG4gICAgbGV0IHN1YnR5cGUgOiBRdWVzdGlvblN1YlR5cGVcbiAgICBjb25zdCBxdWVzdGlvbk9wdGlvbnMgOiBQYXJ0aWFsPFF1ZXN0aW9uT3B0aW9ucz4gPSB7fVxuICAgIHN3aXRjaCAoZGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICBzdWJ0eXBlID0gJ3NpbXBsZSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAyXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gMlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOlxuICAgICAgICBzdWJ0eXBlID0gJ3NpbXBsZSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAzXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gNFxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAzOlxuICAgICAgICBzdWJ0eXBlID0gJ3JlcGVhdGVkJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDNcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSA0XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ6XG4gICAgICAgIHN1YnR5cGUgPSAnYWxnZWJyYSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmV4cHJlc3Npb25UeXBlcyA9IFsnbXVsdGlwbHknXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cyA9IGZhbHNlXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDRcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNTpcbiAgICAgICAgc3VidHlwZSA9ICdhbGdlYnJhJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZXhwcmVzc2lvblR5cGVzID0gWydhZGQnLCAnbXVsdGlwbHknXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cyA9IFsnbXVsdGlwbHknXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZW5zdXJlWCA9IHRydWVcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAyXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA2OlxuICAgICAgICBzdWJ0eXBlID0gJ2FsZ2VicmEnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5leHByZXNzaW9uVHlwZXMgPSBbJ21peGVkJ11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAyXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA3OlxuICAgICAgICBzdWJ0eXBlID0gJ3dvcmRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnR5cGVzID0gW3JhbmRFbGVtKFsnYWRkJywgJ211bHRpcGx5J10pXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gMlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA4OlxuICAgICAgICBzdWJ0eXBlID0gJ3dvcmRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnR5cGVzID0gWydhZGQnLCAnbXVsdGlwbHknXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA5OlxuICAgICAgICBzdWJ0eXBlID0gJ3dvcmRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnR5cGVzID0gWydtdWx0aXBseScsICdyYXRpbyddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gcXVlc3Rpb25PcHRpb25zLm1heE4gPSAzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDEwOlxuICAgICAgICBzdWJ0eXBlID0gJ3dvcmRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnR5cGVzID0gWydtdWx0aXBseScsICdhZGQnLCAncmF0aW8nLCAncGVyY2VudCddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gcXVlc3Rpb25PcHRpb25zLm1heE4gPSAzXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbid0IGdlbmVyYXRlIGRpZmZpY3VsdHkgJHtkaWZmaWN1bHR5fWApXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmFuZG9tRnJvbVR5cGVXaXRoT3B0aW9ucyh0eXBlLCBzdWJ0eXBlLCBxdWVzdGlvbk9wdGlvbnMpXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tRnJvbVR5cGVXaXRoT3B0aW9ucyAodHlwZTogUXVlc3Rpb25UeXBlLCBzdWJ0eXBlPzogUXVlc3Rpb25TdWJUeXBlLCBxdWVzdGlvbk9wdGlvbnM/OiBQYXJ0aWFsPFF1ZXN0aW9uT3B0aW9ucz4sIHZpZXdPcHRpb25zPzogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNRIHtcbiAgICBsZXQgcXVlc3Rpb246IEdyYXBoaWNRXG4gICAgcXVlc3Rpb25PcHRpb25zID0gcXVlc3Rpb25PcHRpb25zIHx8IHt9XG4gICAgdmlld09wdGlvbnMgPSB2aWV3T3B0aW9ucyB8fCB7fVxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSAnYWFhcCc6XG4gICAgICBjYXNlICdhb3NsJzoge1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuYW5nbGVTdW0gPSAodHlwZSA9PT0gJ2FhYXAnKSA/IDM2MCA6IDE4MFxuICAgICAgICBzd2l0Y2ggKHN1YnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdzaW1wbGUnOlxuICAgICAgICAgIGNhc2UgJ3JlcGVhdGVkJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5yZXBlYXRlZCA9IHN1YnR5cGUgPT09ICdyZXBlYXRlZCdcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc0Fyb3VuZFEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ2FsZ2VicmEnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3dvcmRlZCc6XG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNXb3JkZWRRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bmV4cGVjdGVkIHN1YnR5cGUgJHtzdWJ0eXBlfWApXG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3RyaWFuZ2xlJzoge1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMucmVwZWF0ZWQgPSAoc3VidHlwZSA9PT0gJ3JlcGVhdGVkJylcbiAgICAgICAgc3dpdGNoIChzdWJ0eXBlKSB7XG4gICAgICAgICAgY2FzZSAnc2ltcGxlJzpcbiAgICAgICAgICBjYXNlICdyZXBlYXRlZCc6XG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ2FsZ2VicmEnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAnd29yZGVkJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgdW5leHBlY3RlZCBzdWJ0eXBlICR7c3VidHlwZX1gKVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdHlwZSAke3R5cGV9YClcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNRKHF1ZXN0aW9uKVxuICB9XG5cbiAgZ2V0RE9NICgpIDogSFRNTEVsZW1lbnQgeyByZXR1cm4gdGhpcy5xdWVzdGlvbi5nZXRET00oKSB9XG4gIHJlbmRlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLnJlbmRlcigpIH1cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLnNob3dBbnN3ZXIoKSB9XG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5oaWRlQW5zd2VyKCkgfVxuICB0b2dnbGVBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi50b2dnbGVBbnN3ZXIoKSB9XG5cbiAgc3RhdGljIGdldCBvcHRpb25zU3BlYyAoKTogT3B0aW9uc1NwZWMge1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdoZWFkaW5nJyxcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICB9LFxuXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnVHlwZXMnLFxuICAgICAgICBpZDogJ3R5cGVzJyxcbiAgICAgICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgICAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICAgICAgeyB0aXRsZTogJ09uIGEgc3RyYWlnaHQgbGluZScsIGlkOiAnYW9zbCcgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnQXJvdW5kIGEgcG9pbnQnLCBpZDogJ2FhYXAnIH0sXG4gICAgICAgICAgeyB0aXRsZTogJ1RyaWFuZ2xlJywgaWQ6ICd0cmlhbmdsZScgfVxuICAgICAgICBdLFxuICAgICAgICBkZWZhdWx0OiBbJ2Fvc2wnLCAnYWFhcCcsICd0cmlhbmdsZSddLFxuICAgICAgICB2ZXJ0aWNhbDogdHJ1ZVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2NvbHVtbi1icmVhaydcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgdGl0bGU6ICc8Yj5DdXN0b20gc2V0dGluZ3MgKGRpc2FibGVzIGRpZmZpY3VsdHkpPC9iPicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICBpZDogJ2N1c3RvbSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdyYW5nZScsXG4gICAgICAgIGlkOiAnbi1hbmdsZXMnLFxuICAgICAgICBpZExCOiAnbWluTicsXG4gICAgICAgIGlkVUI6ICdtYXhOJyxcbiAgICAgICAgZGVmYXVsdExCOiAyLFxuICAgICAgICBkZWZhdWx0VUI6IDQsXG4gICAgICAgIG1pbjogMixcbiAgICAgICAgbWF4OiA4LFxuICAgICAgICB0aXRsZTogJ051bWJlciBvZiBhbmdsZXMnLFxuICAgICAgICBlbmFibGVkSWY6ICdjdXN0b20nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnU2ltcGxlJyxcbiAgICAgICAgaWQ6ICdzaW1wbGUnLFxuICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICBlbmFibGVkSWY6ICdjdXN0b20nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnUmVwZWF0ZWQvSXNvc2NlbGVzJyxcbiAgICAgICAgaWQ6ICdyZXBlYXRlZCcsXG4gICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgIGVuYWJsZWRJZjogJ2N1c3RvbSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgdGl0bGU6ICdBbGdlYnJhaWMnLFxuICAgICAgICBpZDogJ2FsZ2VicmEnLFxuICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICBlbmFibGVkSWY6ICdjdXN0b20nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnc3Vib3B0aW9ucycsXG4gICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgaWQ6ICdhbGdlYnJhT3B0aW9ucycsXG4gICAgICAgIG9wdGlvbnNTcGVjOiBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEub3B0aW9uc1NwZWMsXG4gICAgICAgIGVuYWJsZWRJZjogJ2N1c3RvbSZhbGdlYnJhJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJ1dvcmRlZCcsXG4gICAgICAgIGlkOiAnd29yZGVkJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlZElmOiAnY3VzdG9tJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3N1Ym9wdGlvbnMnLFxuICAgICAgICB0aXRsZTogJycsXG4gICAgICAgIGlkOiAnd29yZGVkT3B0aW9ucycsXG4gICAgICAgIG9wdGlvbnNTcGVjOiBNaXNzaW5nQW5nbGVzV29yZGVkUS5vcHRpb25zU3BlYyxcbiAgICAgICAgZW5hYmxlZElmOiAnY3VzdG9tJndvcmRlZCdcbiAgICAgIH1cbiAgICBdXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpOiBzdHJpbmcge1xuICAgIHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZSdcbiAgfVxufVxuIiwiaW1wb3J0IHsgVmFsdWUgfSBmcm9tIFwiLi9SZWN0YW5nbGVBcmVhRGF0YVwiXG5pbXBvcnQgeyBRdWVzdGlvbk9wdGlvbnMgfSBmcm9tIFwiLi90eXBlc1wiXG5pbXBvcnQgZnJhY3Rpb24gZnJvbSAnZnJhY3Rpb24uanMnXG5pbXBvcnQgeyBnYXVzc2lhbkN1cnJ5LCByYW5kQmV0d2VlbiwgcmFuZEVsZW0sIHNjYWxlZFN0ciB9IGZyb20gXCJ1dGlsaXRpZXNcIlxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQYXJhbGxlbG9ncmFtQXJlYURhdGEge1xuICByZWFkb25seSBiYXNlOiBWYWx1ZVxuICByZWFkb25seSBoZWlnaHQ6IFZhbHVlXG4gIHJlYWRvbmx5IHNpZGU6IFZhbHVlXG4gIHJlYWRvbmx5IHNob3dPcHBvc2l0ZXM6IGJvb2xlYW5cbiAgcHJpdmF0ZSByZWFkb25seSBkcDogbnVtYmVyXG4gIHByaXZhdGUgcmVhZG9ubHkgZGVub21pbmF0b3I6IG51bWJlciA9IDFcbiAgcHJpdmF0ZSBfYXJlYT86IFBhcnRpYWw8VmFsdWU+IC8vIGxhemlseSBjYWxjdWxhdGVkXG4gIHByaXZhdGUgX3BlcmltZXRlcj86IFBhcnRpYWw8VmFsdWU+XG5cbiAgY29uc3RydWN0b3IoYmFzZTogVmFsdWUsIGhlaWdodDogVmFsdWUsIHNpZGU6IFZhbHVlLCBzaG93T3Bwb3NpdGVzOiBib29sZWFuLCBkcDogbnVtYmVyLCBkZW5vbWluYXRvcjogbnVtYmVyLCBhcmVhUHJvcGVydGllcz86IE9taXQ8VmFsdWUsICd2YWwnPiwgcGVyaW1ldGVyUHJvcGVydGllcz86IE9taXQ8VmFsdWUsICd2YWwnPikge1xuICAgIHRoaXMuYmFzZSA9IGJhc2VcbiAgICB0aGlzLmhlaWdodCA9IGhlaWdodFxuICAgIHRoaXMuc2lkZSA9IHNpZGVcbiAgICB0aGlzLnNob3dPcHBvc2l0ZXMgPSBzaG93T3Bwb3NpdGVzXG4gICAgdGhpcy5kcCA9IGRwXG4gICAgdGhpcy5kZW5vbWluYXRvciA9IGRlbm9taW5hdG9yXG4gICAgdGhpcy5fYXJlYSA9IGFyZWFQcm9wZXJ0aWVzXG4gICAgdGhpcy5fcGVyaW1ldGVyID0gcGVyaW1ldGVyUHJvcGVydGllc1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbShvcHRpb25zOiBRdWVzdGlvbk9wdGlvbnMpOiBQYXJhbGxlbG9ncmFtQXJlYURhdGEge1xuICAgIGNvbnN0IG1heExlbmd0aCA9IG9wdGlvbnMubWF4TGVuZ3RoXG4gICAgY29uc3QgZHAgPSBvcHRpb25zLmRwXG4gICAgY29uc3QgZGVub21pbmF0b3IgPSBvcHRpb25zLmZyYWN0aW9uID8gcmFuZEJldHdlZW4oMiwgNikgOiAxXG5cbiAgICAvLyBiYXNpYyB2YWx1ZXNcbiAgICBjb25zdCBiYXNlOiBWYWx1ZSA9IHtcbiAgICAgIHZhbDogcmFuZEJldHdlZW4oMSwgbWF4TGVuZ3RoKSxcbiAgICAgIHNob3c6IHRydWUsXG4gICAgICBtaXNzaW5nOiBmYWxzZVxuICAgIH1cbiAgICBjb25zdCBoZWlnaHQ6IFZhbHVlID0ge1xuICAgICAgdmFsOiByYW5kQmV0d2VlbihNYXRoLmNlaWwoYmFzZS52YWwvOCksIDIqYmFzZS52YWwrTWF0aC5jZWlsKGJhc2UudmFsLzgpLCBnYXVzc2lhbkN1cnJ5KDIpKSxcbiAgICAgIHNob3c6IHRydWUsXG4gICAgICBtaXNzaW5nOiBmYWxzZVxuICAgIH1cblxuICAgIGNvbnN0IHNpZGU6IFZhbHVlID0ge1xuICAgICAgdmFsOiByYW5kQmV0d2VlbihoZWlnaHQudmFsKzEsIGhlaWdodC52YWwqMywgKCk9PihNYXRoLnJhbmRvbSgpKSoqMiksIC8vIGRpc3RyaWJ1dGlvbiBpcyBiaWFzZWQgdG93YXJkcyBsb3dlciB2YWx1ZXNcbiAgICAgIHNob3c6IHRydWUsXG4gICAgICBtaXNzaW5nOiBmYWxzZVxuICAgIH1cblxuICAgIGNvbnN0IGFyZWFQcm9wZXJ0aWVzOiBPbWl0PFZhbHVlLCAndmFsJz4gPSB7XG4gICAgICBzaG93OiBmYWxzZSxcbiAgICAgIG1pc3Npbmc6IGZhbHNlXG4gICAgfVxuXG4gICAgY29uc3QgcGVyaW1ldGVyUHJvcGVydGllczogT21pdDxWYWx1ZSwgJ3ZhbCc+ID0ge1xuICAgICAgc2hvdzogZmFsc2UsXG4gICAgICBtaXNzaW5nOiBmYWxzZVxuICAgIH1cblxuICAgIC8vIExhYmVsc1xuICAgIGlmIChkZW5vbWluYXRvcj4xKSB7XG4gICAgICBbYmFzZSxoZWlnaHQsc2lkZV0uZm9yRWFjaCh2PT57XG4gICAgICAgIHYubGFiZWwgPSBuZXcgZnJhY3Rpb24odi52YWwsZGVub21pbmF0b3IpLnRvTGF0ZXgodHJ1ZSkgKyBcIlxcXFxtYXRocm17Y219XCJcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIFtiYXNlLGhlaWdodCxzaWRlXS5mb3JFYWNoKHY9PntcbiAgICAgICAgdi5sYWJlbCA9IHNjYWxlZFN0cih2LnZhbCxkcCkgKyBcIlxcXFxtYXRocm17Y219XCJcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLy8gYWRqdXN0IGZvciBxdWVzdGlvbiB0eXBlXG4gICAgbGV0IHNob3dPcHBvc2l0ZXMgPSBmYWxzZVxuICAgIHN3aXRjaCAob3B0aW9ucy5xdWVzdGlvblR5cGUpIHtcbiAgICAgIGNhc2UgJ2FyZWEnOlxuICAgICAgICBhcmVhUHJvcGVydGllcy5zaG93ID0gdHJ1ZVxuICAgICAgICBhcmVhUHJvcGVydGllcy5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBzaWRlLnNob3cgPSAhb3B0aW9ucy5ub0Rpc3RyYWN0b3JzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdwZXJpbWV0ZXInOlxuICAgICAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMubWlzc2luZyA9IHRydWVcbiAgICAgICAgc2hvd09wcG9zaXRlcyA9IG9wdGlvbnMubm9EaXN0cmFjdG9yc1xuICAgICAgICBoZWlnaHQuc2hvdyA9ICFvcHRpb25zLm5vRGlzdHJhY3RvcnNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3JldmVyc2VBcmVhJzpcbiAgICAgICAgYXJlYVByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgYXJlYVByb3BlcnRpZXMubWlzc2luZyA9IGZhbHNlXG4gICAgICAgIHJhbmRFbGVtKFtiYXNlLCBoZWlnaHRdKS5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAncmV2ZXJzZVBlcmltZXRlcic6XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMubWlzc2luZyA9IGZhbHNlXG4gICAgICAgIHJhbmRFbGVtKFtiYXNlLCBzaWRlXSkubWlzc2luZyA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFBhcmFsbGVsb2dyYW1BcmVhRGF0YShiYXNlLCBoZWlnaHQsIHNpZGUsIHNob3dPcHBvc2l0ZXMsIGRwLCBkZW5vbWluYXRvciwgYXJlYVByb3BlcnRpZXMsIHBlcmltZXRlclByb3BlcnRpZXMpXG4gIH1cblxuICBnZXQgcGVyaW1ldGVyKCk6IFZhbHVlIHtcbiAgICBpZiAoIXRoaXMuX3BlcmltZXRlcikge1xuICAgICAgdGhpcy5fcGVyaW1ldGVyID0ge1xuICAgICAgICBzaG93OiBmYWxzZSxcbiAgICAgICAgbWlzc2luZzogdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXRoaXMuX3BlcmltZXRlci52YWwpIHtcbiAgICAgIHRoaXMuX3BlcmltZXRlci52YWwgPSAyICogKHRoaXMuYmFzZS52YWwgKyB0aGlzLnNpZGUudmFsKVxuICAgICAgaWYgKHRoaXMuZGVub21pbmF0b3IgPiAxKSB7XG4gICAgICAgIHRoaXMuX3BlcmltZXRlci5sYWJlbCA9IG5ldyBmcmFjdGlvbih0aGlzLl9wZXJpbWV0ZXIudmFsLCB0aGlzLmRlbm9taW5hdG9yKS50b0xhdGV4KHRydWUpICsgJ1xcXFxtYXRocm17Y219J1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcGVyaW1ldGVyLmxhYmVsID0gc2NhbGVkU3RyKHRoaXMuX3BlcmltZXRlci52YWwsIHRoaXMuZHApICsgJ1xcXFxtYXRocm17Y219J1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcGVyaW1ldGVyIGFzIFZhbHVlXG4gIH1cblxuICBnZXQgYXJlYSgpOiBWYWx1ZSB7XG4gICAgaWYgKCF0aGlzLl9hcmVhKSB7XG4gICAgICB0aGlzLl9hcmVhID0ge1xuICAgICAgICBzaG93OiBmYWxzZSxcbiAgICAgICAgbWlzc2luZzogdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXRoaXMuX2FyZWEudmFsKSB7XG4gICAgICB0aGlzLl9hcmVhLnZhbCA9IHRoaXMuYmFzZS52YWwgKiB0aGlzLmhlaWdodC52YWxcbiAgICAgIGlmICh0aGlzLmRlbm9taW5hdG9yID4gMSkge1xuICAgICAgICB0aGlzLl9hcmVhLmxhYmVsID0gbmV3IGZyYWN0aW9uKHRoaXMuX2FyZWEudmFsLCB0aGlzLmRlbm9taW5hdG9yICoqIDIpLnRvTGF0ZXgodHJ1ZSkgKyAnXFxcXG1hdGhybXtjbX1eMidcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2FyZWEubGFiZWwgPSBzY2FsZWRTdHIodGhpcy5fYXJlYS52YWwsIDIgKiB0aGlzLmRwKSArICdcXFxcbWF0aHJte2NtfV4yJ1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fYXJlYSBhcyBWYWx1ZVxuICB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5cbi8qIENhbnZhcyBkcmF3aW5nLCB1c2luZyB0aGUgUG9pbnQgY2xhc3MgKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGRhc2hlZExpbmUgKGN0eCwgeDEsIHkxLCB4MiwgeTIpIHtcbiAgLy8gV29yayBpZiBnaXZlbiB0d28gcG9pbnRzIGluc3RlYWQ6XG4gIGlmICh4MSBpbnN0YW5jZW9mIFBvaW50ICYmIHgyIGluc3RhbmNlb2YgUG9pbnQpIHtcbiAgICBjb25zdCBwMSA9IHgxOyBjb25zdCBwMiA9IHgyXG4gICAgeDEgPSBwMS54XG4gICAgeTEgPSBwMS55XG4gICAgeDIgPSBwMi54XG4gICAgeTIgPSBwMi55XG4gIH1cblxuICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHgyIC0geDEsIHkyIC0geTEpXG4gIGNvbnN0IGRhc2h4ID0gKHkxIC0geTIpIC8gbGVuZ3RoIC8vIHVuaXQgdmVjdG9yIHBlcnBlbmRpY3VsYXIgdG8gbGluZVxuICBjb25zdCBkYXNoeSA9ICh4MiAtIHgxKSAvIGxlbmd0aFxuICBjb25zdCBtaWR4ID0gKHgxICsgeDIpIC8gMlxuICBjb25zdCBtaWR5ID0gKHkxICsgeTIpIC8gMlxuXG4gIC8vIGRyYXcgdGhlIGJhc2UgbGluZVxuICBjdHgubW92ZVRvKHgxLCB5MSlcbiAgY3R4LmxpbmVUbyh4MiwgeTIpXG5cbiAgLy8gZHJhdyB0aGUgZGFzaFxuICBjdHgubW92ZVRvKG1pZHggKyA1ICogZGFzaHgsIG1pZHkgKyA1ICogZGFzaHkpXG4gIGN0eC5saW5lVG8obWlkeCAtIDUgKiBkYXNoeCwgbWlkeSAtIDUgKiBkYXNoeSlcblxuICBjdHgubW92ZVRvKHgyLCB5Milcbn1cbi8qKlxuICogXG4gKiBAcGFyYW0ge0NhbnZhc1JlbmRlcmluZ0NvbnRleHQyRH0gY3R4IFRoZSBjb250ZXh0XG4gKiBAcGFyYW0ge1BvaW50fSBwdDEgQSBwb2ludFxuICogQHBhcmFtIHtQb2ludH0gcHQyIEEgcG9pbnRcbiAqIEBwYXJhbSB7bnVtYmVyfSBzaXplIFRoZSBzaXplIG9mIHRoZSBhcnJheSB0byBkcmF3XG4gKiBAcGFyYW0ge251bWJlcn0gW209MC41XSBUaGUgJ3NoYXJwbmVzcycgb2YgdGhlIHBvaW50LiBTbWFsbGVyIGlzIHBvaW50aWVyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcnJvd0xpbmUgKGN0eCwgcHQxLCBwdDIsIHNpemUsIG09MC41KSB7XG5cbiAgY29uc3QgdW5pdCA9IFBvaW50LnVuaXRWZWN0b3IocHQxLCBwdDIpXG4gIHVuaXQueCAqPSBzaXplXG4gIHVuaXQueSAqPSBzaXplXG4gIGNvbnN0IG5vcm1hbCA9IHsgeDogLXVuaXQueSwgeTogdW5pdC54IH1cbiAgbm9ybWFsLnggKj0gbVxuICBub3JtYWwueSAqPSBtXG5cbiAgY29uc3QgY29udHJvbDEgPSBwdDIuY2xvbmUoKVxuICAgIC50cmFuc2xhdGUoLXVuaXQueCwgLXVuaXQueSlcbiAgICAudHJhbnNsYXRlKG5vcm1hbC54LCBub3JtYWwueSlcblxuICBjb25zdCBjb250cm9sMiA9IHB0Mi5jbG9uZSgpXG4gICAgLnRyYW5zbGF0ZSgtdW5pdC54LCAtdW5pdC55KVxuICAgIC50cmFuc2xhdGUoLW5vcm1hbC54LCAtbm9ybWFsLnkpXG5cbiAgY3R4Lm1vdmVUbyhwdDEueCwgcHQxLnkpXG4gIGN0eC5saW5lVG8ocHQyLngsIHB0Mi55KVxuICBjdHgubGluZVRvKGNvbnRyb2wxLngsIGNvbnRyb2wxLnkpXG4gIGN0eC5tb3ZlVG8ocHQyLngsIHB0Mi55KVxuICBjdHgubGluZVRvKGNvbnRyb2wyLngsIGNvbnRyb2wyLnkpXG59XG5cbi8qKlxuICogRHJhdyBhIHJpZ2h0IGFuZ2xlIHN5bWJvbCBmb3IgYW5nbGUgQU9DLiBOQjogbm8gY2hlY2sgaXMgbWFkZSB0aGF0IEFPQyBpcyBpbmRlZWQgYSByaWdodCBhbmdsZVxuICogQHBhcmFtIHtDYW52YXNSZW5kZXJpbmdDb250ZXh0MkR9IGN0eCBUaGUgY29udGV4dCB0byBkcmF3IGluXG4gKiBAcGFyYW0ge1BvaW50fSBBIFN0YXJ0IHBvaW50XG4gKiBAcGFyYW0ge1BvaW50fSBPIFZlcnRleCBwb2ludFxuICogQHBhcmFtIHtQb2ludH0gQyBFbmQgcG9pbnRcbiAqIEBwYXJhbSB7bnVtYmVyfSBzaXplIFNpemUgb2YgcmlnaHQgYW5nbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRyYXdSaWdodEFuZ2xlIChjdHgsIEEsIE8sIEMsIHNpemUpIHtcbiAgY29uc3QgdW5pdE9BID0gUG9pbnQudW5pdFZlY3RvcihPLCBBKVxuICBjb25zdCB1bml0T0MgPSBQb2ludC51bml0VmVjdG9yKE8sIEMpXG4gIGNvbnN0IGN0bDEgPSBPLmNsb25lKCkudHJhbnNsYXRlKHVuaXRPQS54ICogc2l6ZSwgdW5pdE9BLnkgKiBzaXplKVxuICBjb25zdCBjdGwyID0gY3RsMS5jbG9uZSgpLnRyYW5zbGF0ZSh1bml0T0MueCAqIHNpemUsIHVuaXRPQy55ICogc2l6ZSlcbiAgY29uc3QgY3RsMyA9IE8uY2xvbmUoKS50cmFuc2xhdGUodW5pdE9DLnggKiBzaXplLCB1bml0T0MueSAqIHNpemUpXG4gIGN0eC5tb3ZlVG8oY3RsMS54LCBjdGwxLnkpXG4gIGN0eC5saW5lVG8oY3RsMi54LCBjdGwyLnkpXG4gIGN0eC5saW5lVG8oY3RsMy54LCBjdGwzLnkpXG59XG5cbi8qKlxuICogRHJhd3MgYSBkYXNoLCBvciBtdWx0aXBsZSBkYXNoZXMsIGF0IHRoZSBtaWRwb2ludCBvZiBBIGFuZCBCXG4gKiBAcGFyYW0ge0NhbnZhc1JlbmRlcmluZ0NvbnRleHQyRH0gY3R4IFRoZSBjYW52YXMgcmVuZGVyaW5nIGNvbnRleHRcbiAqIEBwYXJhbSB7UG9pbnR9IEEgQSBwb2ludFxuICogQHBhcmFtIHtQb2ludH0gQiBBIHBvaW50XG4gKiBAcGFyYW0ge251bWJlcn0gW3NpemU9MTBdICBUaGUgbGVuZ3RoIG9mIHRoZSBkYXNoZXMsIGluIHBpeGVsc1xuICogQHBhcmFtIHtudW1iZXJ9IFtudW1iZXI9MV0gSG93IG1hbnkgZGFzaGVzIHRvIGRyd1xuICogQHBhcmFtIHtudW1iZXJ9IFtnYXA9c2l6ZV0gVGhlIGdhcCBiZXR3ZWVuIGRhc2hlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyYWxsZWxTaWduIChjdHgsIEEsIEIsIHNpemU9MTAsIG51bWJlcj0xLCBnYXA9c2l6ZSkge1xuICBjb25zdCB1bml0ID0gUG9pbnQudW5pdFZlY3RvcihBLCBCKVxuICB1bml0LnggKj0gc2l6ZVxuICB1bml0LnkgKj0gc2l6ZVxuICBjb25zdCBub3JtYWwgPSB7IHg6IC11bml0LnksIHk6IHVuaXQueCB9XG5cbiAgY29uc3QgTSA9IFBvaW50Lm1lYW4oQSwgQilcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IG51bWJlcjsgaSsrKSB7XG4gICAgY29uc3QgY3RsMiA9IE0uY2xvbmUoKS5tb3ZlVG93YXJkKEIsIGkgKiBnYXApXG4gICAgY29uc3QgY3RsMSA9IGN0bDIuY2xvbmUoKVxuICAgICAgLnRyYW5zbGF0ZSgtdW5pdC54LCAtdW5pdC55KVxuICAgICAgLnRyYW5zbGF0ZShub3JtYWwueCwgbm9ybWFsLnkpXG4gICAgY29uc3QgY3RsMyA9IGN0bDIuY2xvbmUoKVxuICAgICAgLnRyYW5zbGF0ZSgtdW5pdC54LCAtdW5pdC55KVxuICAgICAgLnRyYW5zbGF0ZSgtbm9ybWFsLngsIC1ub3JtYWwueSlcblxuICAgIGN0eC5tb3ZlVG8oY3RsMS54LCBjdGwxLnkpXG4gICAgY3R4LmxpbmVUbyhjdGwyLngsIGN0bDIueSlcbiAgICBjdHgubGluZVRvKGN0bDMueCwgY3RsMy55KVxuICB9XG59XG4iLCJleHBvcnQgdHlwZSBTaGFwZSA9ICdyZWN0YW5nbGUnIHwgJ3RyaWFuZ2xlJyB8ICdwYXJhbGxlbG9ncmFtJyB8ICd0cmFwZXppdW0nO1xuXG5leHBvcnQgdHlwZSBRdWVzdGlvblR5cGVTaW1wbGUgPSAnYXJlYScgfCAncGVyaW1ldGVyJztcbmV4cG9ydCB0eXBlIFF1ZXN0aW9uVHlwZUN1c3RvbSA9ICdyZXZlcnNlQXJlYScgfCAncmV2ZXJzZVBlcmltZXRlcicgfCAncHl0aGFnb3Jhc0FyZWEnIHwgJ3B5dGhhZ29yYXNQZXJpbWV0ZXInIHwgJ3B5dGhhZ29yYXNJc29zY2VsZXNBcmVhJztcbmV4cG9ydCB0eXBlIFF1ZXN0aW9uVHlwZSA9IFF1ZXN0aW9uVHlwZVNpbXBsZSB8IFF1ZXN0aW9uVHlwZUN1c3RvbTtcblxuZXhwb3J0IGludGVyZmFjZSBRdWVzdGlvbk9wdGlvbnMge1xuICBub0Rpc3RyYWN0b3JzOiBib29sZWFuLCAvLyBhZGRzIGxheWVyIG9mIGRpZmZpY3VsdHkgd2hlbiB0cnVlIGJ5IGluY2x1ZGluZy9leGNsdWRpbmcgc2lkZXMgKGRlcGVuZGluZyBvbiBzaGFwZSB0eXBlKVxuICBkcDogbnVtYmVyLCAvLyBudW1iZXIgb2YgZGVjaW1hbCBwbGFjZXMgb2YgbGVuZ3Roc1xuICBmcmFjdGlvbjogYm9vbGVhbixcbiAgbWF4TGVuZ3RoOiBudW1iZXIsIC8vIHRoZSBtYXhpbXVtIGxlbmd0aCBvZiBhIHNpZGVcbiAgcXVlc3Rpb25UeXBlOiBRdWVzdGlvblR5cGVcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXcmFwcGVyT3B0aW9ucyB7XG4gIGRpZmZpY3VsdHk6IG51bWJlcjtcbiAgc2hhcGVzOiBTaGFwZVtdO1xuICBxdWVzdGlvblR5cGVzU2ltcGxlOiBRdWVzdGlvblR5cGVTaW1wbGVbXTtcbiAgY3VzdG9tOiBib29sZWFuO1xuICBxdWVzdGlvblR5cGVzQ3VzdG9tOiAoUXVlc3Rpb25UeXBlKVtdO1xuICBkcDogMCB8IDE7XG59XG5cbmV4cG9ydCBjb25zdCBjb2xvcnMgPSBbJ0xpZ2h0Q3lhbicsJ0xpZ2h0WWVsbG93JywnUGluaycsJ0xpZ2h0R3JlZW4nLCdMaWdodEJsdWUnLCdJdm9yeScsJ0xpZ2h0R3JheSddXG4iLCJpbXBvcnQgeyBhcnJvd0xpbmUsIGRyYXdSaWdodEFuZ2xlLCBwYXJhbGxlbFNpZ24gfSBmcm9tIFwiZHJhd2luZ1wiXG5pbXBvcnQgUG9pbnQgZnJvbSBcIlBvaW50XCJcbmltcG9ydCB7IHJhbmRCZXR3ZWVuLCByYW5kRWxlbSB9IGZyb20gXCJ1dGlsaXRpZXNcIlxuaW1wb3J0IHsgR3JhcGhpY1FWaWV3LCBMYWJlbCB9IGZyb20gXCIuLi9HcmFwaGljUVwiXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSBcIi4uL1ZpZXdPcHRpb25zXCJcbmltcG9ydCBQYXJhbGxlbG9ncmFtQXJlYURhdGEgZnJvbSBcIi4vUGFyYWxsZWxvZ3JhbUFyZWFEYXRhXCJcbmltcG9ydCBSZWN0YW5nbGVBcmVhRGF0YSwgeyBWYWx1ZSB9IGZyb20gXCIuL1JlY3RhbmdsZUFyZWFEYXRhXCJcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gXCIuL3R5cGVzXCJcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFyYWxsZWxvZ3JhbUFyZWFWaWV3IGV4dGVuZHMgR3JhcGhpY1FWaWV3IHtcbiAgZGF0YSE6IFBhcmFsbGVsb2dyYW1BcmVhRGF0YSAvLyBhc3NpZ25lZCBpbiBzdXBlclxuICBBOiBQb2ludFxuICBCOiBQb2ludFxuICBDOiBQb2ludFxuICBEOiBQb2ludFxuICBodDE6IFBvaW50XG4gIGh0MjogUG9pbnRcblxuICBjb25zdHJ1Y3RvciAoQTogUG9pbnQsIEI6IFBvaW50LCBDOiBQb2ludCwgRDogUG9pbnQsIGh0MTogUG9pbnQsIGh0MjogUG9pbnQsIGxhYmVsczogTGFiZWxbXSwgZGF0YTogUGFyYWxsZWxvZ3JhbUFyZWFEYXRhLCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICAvKiBTdXBlciBkb2VzOlxuICAgICAqICBTZXRzIHRoaXMud2lkdGggYW5kIHRoaXMuaGVpZ2h0XG4gICAgICogIFNldHMgdGhpcy5kYXRhXG4gICAgICogIENyZWF0ZXMgRE9NIGVsZW1lbnRzLCBpbmNsdWRpbmcgY2FudmFzXG4gICAgICogIENyZWF0ZXMgZW1wdHkgdGhpcy5sYWJlbHMgbGlzdFxuICAgICAqL1xuICAgIHN1cGVyKGRhdGEsIHZpZXdPcHRpb25zKSAvLyBpbml0aWFsaXNlcyB0aGlzLmRhdGFcbiAgICB0aGlzLkEgPSBBXG4gICAgdGhpcy5CID0gQlxuICAgIHRoaXMuQyA9IENcbiAgICB0aGlzLkQgPSBEXG4gICAgdGhpcy5odDEgPSBodDFcbiAgICB0aGlzLmh0MiA9IGh0MlxuICAgIHRoaXMubGFiZWxzID0gbGFiZWxzXG4gIH1cblxuICBzdGF0aWMgZnJvbURhdGEoZGF0YTogUGFyYWxsZWxvZ3JhbUFyZWFEYXRhLCB2aWV3T3B0aW9ucz86IFZpZXdPcHRpb25zKSB7XG4gICAgdmlld09wdGlvbnMgPSB2aWV3T3B0aW9ucyA/PyB7fVxuICAgIHZpZXdPcHRpb25zLndpZHRoID0gdmlld09wdGlvbnMud2lkdGggPz8gMzAwXG4gICAgdmlld09wdGlvbnMuaGVpZ2h0ID0gdmlld09wdGlvbnMuaGVpZ2h0ID8/IDMwMFxuICAgIGNvbnN0IHdpZHRoID0gdmlld09wdGlvbnMud2lkdGhcbiAgICBjb25zdCBoZWlnaHQgPSB2aWV3T3B0aW9ucy5oZWlnaHRcblxuICAgIC8vdXNlZnVsIHNob3J0aGFuZHM6XG4gICAgY29uc3QgcyA9IGRhdGEuc2lkZS52YWxcbiAgICBjb25zdCBiID0gZGF0YS5iYXNlLnZhbFxuICAgIGNvbnN0IGggPSBkYXRhLmhlaWdodC52YWxcblxuICAgIC8qIERlcml2YXRpb24gb2YgdGhpcy5CLCB0aGlzLkNcbiAgICAgKiAgQiBpcyBpbnRlcnNlY3Rpb24gb2ZcbiAgICAgKiAgICAgICAgICB4XjIgKyB5XjIgPSBzXjIgKDEpXG4gICAgICogICAgYW5kICAgeSA9IGggICAgICAgICAgICgyKVxuICAgICAqXG4gICAgICogICAgU3Vic3RpdHV0aW5nICgyKSBpbnRvICgxKSBhbmQgcmVhcnJhbmdpbmcgZ2l2ZXM6XG4gICAgICogICAgICAgICAgeCA9IHNxcnQoc14yLWheMikgKHRha2luZyBvbmx5IHRoZSArdmUgdmFsdWUpXG4gICAgICpcbiAgICAgKiAgQyBpcyBqdXN0IHRoaXMgc2hpZnRlZCBhY3Jvc3MgYlxuICAgICAqL1xuICAgIGNvbnN0IEEgPSBuZXcgUG9pbnQoMCwwKTtcbiAgICBjb25zdCBCID0gbmV3IFBvaW50KCBNYXRoLnNxcnQocypzIC0gaCpoKSwgaCk7XG4gICAgY29uc3QgQyA9IEIuY2xvbmUoKS50cmFuc2xhdGUoYiwwKTtcbiAgICBjb25zdCBEID0gbmV3IFBvaW50KGIsMCk7XG5cbiAgICAvLyBwb2ludHMgdG8gZHJhdyBoZWlnaHQgbGluZSBvblxuICAgIGNvbnN0IGh0MSA9IEMuY2xvbmUoKTtcbiAgICBjb25zdCBodDIgPSBDLmNsb25lKCkudHJhbnNsYXRlKDAsLWgpO1xuICAgIC8vIHNoaWZ0IHRoZW0gYXdheSBhIGxpdHRsZSBiaXRcbiAgICBodDEubW92ZVRvd2FyZChCLC1iLzEwKTtcbiAgICBodDIubW92ZVRvd2FyZChBLC1iLzEwKTtcblxuICAgIC8vIHJvdGF0ZVxuICAgIGNvbnN0IHJvdGF0aW9uOiBudW1iZXIgPSB2aWV3T3B0aW9ucz8ucm90YXRpb24gPz8gTWF0aC5yYW5kb20oKSoyKk1hdGguUElcbiAgICA7W0EsQixDLEQsaHQxLGh0Ml0uZm9yRWFjaCggcHQgPT4ge3B0LnJvdGF0ZShyb3RhdGlvbil9KVxuXG4gICAgLy8gU2NhbGUgYW5kIGNlbnRyZVxuICAgIFBvaW50LnNjYWxlVG9GaXQoW0EsQixDLEQsaHQxLGh0Ml0sd2lkdGgsaGVpZ2h0LDEwMCxbMCwyMF0pXG5cbiAgICAvLyBsYWJlbHNcbiAgICBjb25zdCBsYWJlbHMgOiBMYWJlbFtdID0gW107XG5cbiAgICBjb25zdCBzaWRlcyA6IFtQb2ludCwgUG9pbnQsIFZhbHVlXVtdID0gWyAvL1sxc3QgcG9pbnQsIDJuZCBwb2ludCwgaW5mb11cbiAgICAgIFtBLEIsZGF0YS5zaWRlXSxcbiAgICAgIFtELEEsZGF0YS5iYXNlXSxcbiAgICAgIFtodDEsaHQyLGRhdGEuaGVpZ2h0XVxuICAgIF07XG5cbiAgICBpZiAoZGF0YS5zaG93T3Bwb3NpdGVzKSB7XG4gICAgICBzaWRlcy5wdXNoKFtCLEMsZGF0YS5iYXNlXSk7XG4gICAgICBzaWRlcy5wdXNoKFtDLEQsZGF0YS5zaWRlXSk7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgaSA9IDAsIG49c2lkZXMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7IC8vc2lkZXNcbiAgICAgIGlmICghc2lkZXNbaV1bMl0uc2hvdykgY29udGludWU7XG4gICAgICBjb25zdCBvZmZzZXQgPSAyNTtcbiAgICAgIGxldCBwb3MgPSBQb2ludC5tZWFuKHNpZGVzW2ldWzBdLHNpZGVzW2ldWzFdKTtcbiAgICAgIGNvbnN0IHVuaXR2ZWMgPSBQb2ludC51bml0VmVjdG9yKHNpZGVzW2ldWzBdLCBzaWRlc1tpXVsxXSk7XG4gICAgICBcbiAgICAgIHBvcy50cmFuc2xhdGUoLXVuaXR2ZWMueSpvZmZzZXQsIHVuaXR2ZWMueCpvZmZzZXQpOyBcblxuICAgICAgY29uc3QgdGV4dGEgPSBzaWRlc1tpXVsyXS5sYWJlbCA/PyBzaWRlc1tpXVsyXS52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSBzaWRlc1tpXVsyXS5taXNzaW5nPyBcIj9cIiA6IHRleHRhO1xuICAgICAgY29uc3Qgc3R5bGVxID0gXCJub3JtYWxcIjtcbiAgICAgIGNvbnN0IHN0eWxlYSA9IHNpZGVzW2ldWzJdLm1pc3Npbmc/IFwiYW5zd2VyXCIgOiBcIm5vcm1hbFwiO1xuXG4gICAgICBsYWJlbHMucHVzaCh7XG4gICAgICAgIHBvczogcG9zLFxuICAgICAgICB0ZXh0YTogdGV4dGEsXG4gICAgICAgIHRleHRxOiB0ZXh0cSxcbiAgICAgICAgdGV4dDogdGV4dHEsXG4gICAgICAgIHN0eWxlYTogc3R5bGVhLFxuICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgc3R5bGU6IHN0eWxlcVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgbGV0IG5faW5mbyA9IDA7XG4gICAgaWYgKGRhdGEuYXJlYS5zaG93KSB7XG4gICAgICBjb25zdCB0ZXh0YSA9IGRhdGEuYXJlYS5sYWJlbCA/PyBkYXRhLmFyZWEudmFsLnRvU3RyaW5nKClcbiAgICAgIGNvbnN0IHRleHRxID0gZGF0YS5hcmVhLm1pc3Npbmc/IFwiP1wiIDogdGV4dGE7XG4gICAgICBjb25zdCBzdHlsZXEgPSBcImV4dHJhLWluZm9cIjtcbiAgICAgIGNvbnN0IHN0eWxlYSA9IGRhdGEuYXJlYS5taXNzaW5nPyBcImV4dHJhLWFuc3dlclwiIDogXCJleHRyYS1pbmZvXCI7XG4gICAgICBsYWJlbHMucHVzaChcbiAgICAgICAge1xuICAgICAgICAgIHRleHRhOiBgXFxcXHRleHR7QXJlYX0gPSAke3RleHRhfWAsXG4gICAgICAgICAgdGV4dHE6IGBcXFxcdGV4dHtBcmVhfSA9ICR7dGV4dHF9YCxcbiAgICAgICAgICB0ZXh0OiBgXFxcXHRleHR7QXJlYX0gPSAke3RleHRxfWAsXG4gICAgICAgICAgc3R5bGVxOiBzdHlsZXEsXG4gICAgICAgICAgc3R5bGVhOiBzdHlsZWEsXG4gICAgICAgICAgc3R5bGU6IHN0eWxlcSxcbiAgICAgICAgICBwb3M6IG5ldyBQb2ludCgxMCwgaGVpZ2h0IC0gMTAgLSAxNSpuX2luZm8pLFxuICAgICAgICB9XG4gICAgICApO1xuICAgICAgbl9pbmZvKys7XG4gICAgfVxuICAgIGlmIChkYXRhLnBlcmltZXRlci5zaG93KSB7XG4gICAgICBjb25zdCB0ZXh0YSA9IGRhdGEucGVyaW1ldGVyLmxhYmVsID8/IGRhdGEucGVyaW1ldGVyLnZhbC50b1N0cmluZygpXG4gICAgICBjb25zdCB0ZXh0cSA9IGRhdGEucGVyaW1ldGVyLm1pc3Npbmc/IFwiP1wiIDogdGV4dGE7XG4gICAgICBjb25zdCBzdHlsZXEgPSBcImV4dHJhLWluZm9cIjtcbiAgICAgIGNvbnN0IHN0eWxlYSA9IGRhdGEucGVyaW1ldGVyLm1pc3Npbmc/IFwiZXh0cmEtYW5zd2VyXCIgOiBcImV4dHJhLWluZm9cIjtcbiAgICAgIGxhYmVscy5wdXNoKFxuICAgICAgICB7XG4gICAgICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIGhlaWdodCAtIDEwIC0gMjAqbl9pbmZvKSxcbiAgICAgICAgICB0ZXh0YTogYFxcXFx0ZXh0e1BlcmltZXRlcn0gPSAke3RleHRhfWAsXG4gICAgICAgICAgdGV4dHE6IGBcXFxcdGV4dHtQZXJpbWV0ZXJ9ID0gJHt0ZXh0cX1gLFxuICAgICAgICAgIHRleHQ6IGBcXFxcdGV4dHtQZXJpbWV0ZXJ9ID0gJHt0ZXh0cX1gLFxuICAgICAgICAgIHN0eWxlcTogc3R5bGVxLFxuICAgICAgICAgIHN0eWxlYTogc3R5bGVhLFxuICAgICAgICAgIHN0eWxlOiBzdHlsZXEsXG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgUGFyYWxsZWxvZ3JhbUFyZWFWaWV3KEEsQixDLEQsaHQxLGh0MixsYWJlbHMsZGF0YSx2aWV3T3B0aW9ucylcbiAgfVxuXG4gIHJlbmRlcigpIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgaWYgKCFjdHgpIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGdldCBjYW52YXMgY29udGV4dCcpXG4gICAgY3R4LmNsZWFyUmVjdCgwLDAsdGhpcy5jYW52YXMud2lkdGgsdGhpcy5jYW52YXMuaGVpZ2h0KTsgLy8gY2xlYXJcbiAgICBjdHguc2V0TGluZURhc2goW10pO1xuXG4gICAgLy8gZHJhdyBwYXJhbGxlbG9ncmFtXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgIGN0eC5tb3ZlVG8odGhpcy5BLngsdGhpcy5BLnkpO1xuICAgIGN0eC5saW5lVG8odGhpcy5CLngsdGhpcy5CLnkpO1xuICAgIGN0eC5saW5lVG8odGhpcy5DLngsdGhpcy5DLnkpO1xuICAgIGN0eC5saW5lVG8odGhpcy5ELngsdGhpcy5ELnkpO1xuICAgIGN0eC5saW5lVG8odGhpcy5BLngsdGhpcy5BLnkpO1xuICAgIGN0eC5zdHJva2UoKTtcbiAgICBjdHguZmlsbFN0eWxlPSByYW5kRWxlbShjb2xvcnMpXG4gICAgY3R4LmZpbGwoKTtcbiAgICBjdHguY2xvc2VQYXRoKCk7XG5cbiAgICAvLyBwYXJhbGxlbCBzaWduc1xuICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICBwYXJhbGxlbFNpZ24oY3R4LHRoaXMuQSx0aGlzLkIsNSk7XG4gICAgcGFyYWxsZWxTaWduKGN0eCx0aGlzLkQsdGhpcy5DLDUpO1xuICAgIHBhcmFsbGVsU2lnbihjdHgsdGhpcy5CLHRoaXMuQyw1LDIpO1xuICAgIHBhcmFsbGVsU2lnbihjdHgsdGhpcy5BLHRoaXMuRCw1LDIpO1xuICAgIGN0eC5zdHJva2UoKTtcbiAgICBjdHguY2xvc2VQYXRoKCk7XG5cbiAgICAvLyBkcmF3IGhlaWdodFxuICAgIGlmICh0aGlzLmRhdGEuaGVpZ2h0LnNob3cpIHtcbiAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgIGFycm93TGluZShjdHgsIFBvaW50Lm1lYW4odGhpcy5odDEsdGhpcy5odDIpLHRoaXMuaHQxLCA4KTtcbiAgICAgIGFycm93TGluZShjdHgsIFBvaW50Lm1lYW4odGhpcy5odDEsdGhpcy5odDIpLHRoaXMuaHQyLCA4KTtcbiAgICAgIGN0eC5zdHJva2UoKTtcbiAgICAgIGN0eC5jbG9zZVBhdGgoKTtcblxuICAgICAgLy8gZGFzaGVkIGxpbmUgdG8gaGVpZ2h0XG4gICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICBjdHguc2V0TGluZURhc2goWzUsM10pO1xuICAgICAgY3R4Lm1vdmVUbyh0aGlzLkQueCx0aGlzLkQueSk7XG4gICAgICBjdHgubGluZVRvKHRoaXMuaHQyLngsdGhpcy5odDIueSk7XG4gICAgICBjdHguc3Ryb2tlKCk7XG4gICAgICBjdHguY2xvc2VQYXRoKCk7XG5cbiAgICAgIC8vIFJBIHN5bWJvbFxuICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgY3R4LnNldExpbmVEYXNoKFtdKTtcbiAgICAgIGRyYXdSaWdodEFuZ2xlKGN0eCx0aGlzLmh0MSx0aGlzLmh0Mix0aGlzLkQsIDEyKTtcbiAgICAgIGN0eC5zdHJva2UoKTtcbiAgICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgICB9XG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoKVxuICB9XG59IiwiaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCBQYXJhbGxlbG9ncmFtQXJlYURhdGEgZnJvbSAnLi9QYXJhbGxlbG9ncmFtQXJlYURhdGEnXG5pbXBvcnQgUGFyYWxsZWxvZ3JhbUFyZWFWaWV3IGZyb20gJy4vUGFyYWxsZWxvZ3JhbUFyZWFWaWV3J1xuaW1wb3J0IHsgUXVlc3Rpb25PcHRpb25zIH0gZnJvbSAnLi90eXBlcydcblxuLy8gUGFyYWxsZWxvZ3JhbSBuZWVkcyBubyBmdXJ0aGVyIG9wdGlvbnNcbi8vIFRyaWFuZ2xlIG5lZWRzIG5vIGZ1cnRoZXIgb3B0aW9ucyAtLSBuZWVkcyBwYXNzaW5nIGluXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcmFsbGVsb2dyYW1BcmVhUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YSE6IFBhcmFsbGVsb2dyYW1BcmVhRGF0YSAvLyBpbml0aWFsaXNlZCBpbiBzdXBlcigpXG4gIHZpZXchOiBQYXJhbGxlbG9ncmFtQXJlYVZpZXdcblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBRdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucykge1xuICAgIGNvbnN0IGRhdGEgPSBQYXJhbGxlbG9ncmFtQXJlYURhdGEucmFuZG9tKG9wdGlvbnMpXG4gICAgY29uc3QgdmlldyA9IFBhcmFsbGVsb2dyYW1BcmVhVmlldy5mcm9tRGF0YShkYXRhLCB2aWV3T3B0aW9ucylcbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZXMnXG4gIH1cbn1cblxuIiwiaW1wb3J0IHsgcmFuZEJldHdlZW4sIHJhbmRFbGVtLCBzY2FsZWRTdHIgfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgZnJhY3Rpb24gZnJvbSAnZnJhY3Rpb24uanMnXG5pbXBvcnQgeyBRdWVzdGlvbk9wdGlvbnMgfSBmcm9tICcuL3R5cGVzJ1xuXG4vKipcbiAqIEEgdmFsdWUgZm9yIHNpZGVzLCBhcmVhcyBhbmQgcGVyaW1ldGVyc1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFZhbHVlIHtcbiAgdmFsOiBudW1iZXIsIC8vIHRoZSBudW1lcmljYWwgdmFsdWVcbiAgbGFiZWw/OiBzdHJpbmcsIC8vIHRoZSBsYWJlbCB0byBkaXNwbGF5LiBlLmcuIFwiMy40Y21cIlxuICBzaG93OiBib29sZWFuLCAvLyB3aGV0aGVyIHRoYXQgdmFsdWUgaXMgc2hvd24gaW4gdGhlIHF1ZXN0aW9uIG9yIGFuc3dlciBhdCBhbGxcbiAgbWlzc2luZzogYm9vbGVhbiwgLy8gd2hldGhlciB0aGUgdmFsdWUgaXMgc2hvd24gaW4gdGhlIHF1ZXN0aW9uXG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlY3RhbmdsZUFyZWFEYXRhIHtcbiAgcmVhZG9ubHkgYmFzZSA6IFZhbHVlXG4gIHJlYWRvbmx5IGhlaWdodDogVmFsdWVcbiAgcmVhZG9ubHkgc2hvd09wcG9zaXRlczogYm9vbGVhblxuICBwcml2YXRlIHJlYWRvbmx5IGRwOiBudW1iZXJcbiAgcHJpdmF0ZSByZWFkb25seSBkZW5vbWluYXRvcjogbnVtYmVyID0gMVxuICBwcml2YXRlIF9hcmVhPzogUGFydGlhbDxWYWx1ZT4gLy8gbGF6aWx5IGNhbGN1bGF0ZWRcbiAgcHJpdmF0ZSBfcGVyaW1ldGVyPzogUGFydGlhbDxWYWx1ZT5cblxuICBjb25zdHJ1Y3RvciAoYmFzZTogVmFsdWUsIGhlaWdodDogVmFsdWUsIHNob3dPcHBvc2l0ZXM6IGJvb2xlYW4sIGRwOiBudW1iZXIsIGRlbm9taW5hdG9yOiBudW1iZXIsIGFyZWFQcm9wZXJ0aWVzPzogT21pdDxWYWx1ZSwgJ3ZhbCc+LCBwZXJpbWV0ZXJQcm9wZXJ0aWVzPzogT21pdDxWYWx1ZSwgJ3ZhbCc+KSB7XG4gICAgdGhpcy5iYXNlID0gYmFzZVxuICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0XG4gICAgdGhpcy5zaG93T3Bwb3NpdGVzID0gc2hvd09wcG9zaXRlc1xuICAgIHRoaXMuZHAgPSBkcFxuICAgIHRoaXMuZGVub21pbmF0b3IgPSBkZW5vbWluYXRvclxuICAgIHRoaXMuX2FyZWEgPSBhcmVhUHJvcGVydGllc1xuICAgIHRoaXMuX3BlcmltZXRlciA9IHBlcmltZXRlclByb3BlcnRpZXNcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFF1ZXN0aW9uT3B0aW9ucykgOiBSZWN0YW5nbGVBcmVhRGF0YSB7XG4gICAgb3B0aW9ucy5tYXhMZW5ndGggPSBvcHRpb25zLm1heExlbmd0aCB8fCAyMCAvLyBkZWZhdWx0IHZhbHVlc1xuICAgIGNvbnN0IGRwID0gb3B0aW9ucy5kcCB8fCAwXG4gICAgY29uc3QgZGVub21pbmF0b3IgPSBvcHRpb25zLmZyYWN0aW9uPyByYW5kQmV0d2VlbigyLDYpIDogMVxuXG4gICAgY29uc3Qgc2lkZXMgPSB7XG4gICAgICBiYXNlOiByYW5kQmV0d2VlbigxLCBvcHRpb25zLm1heExlbmd0aCksXG4gICAgICBoZWlnaHQ6IHJhbmRCZXR3ZWVuKDEsIG9wdGlvbnMubWF4TGVuZ3RoKVxuICAgIH1cblxuICAgIGNvbnN0IGJhc2UgOiBWYWx1ZSA9XG4gICAgICB7IHZhbDogc2lkZXMuYmFzZSwgc2hvdzogdHJ1ZSwgbWlzc2luZzogZmFsc2UsIGxhYmVsOiBzY2FsZWRTdHIoc2lkZXMuYmFzZSxkcCkgKyBcIlxcXFxtYXRocm17Y219XCIgfVxuICAgIGNvbnN0IGhlaWdodCA6IFZhbHVlID1cbiAgICAgIHsgdmFsOiBzaWRlcy5oZWlnaHQsIHNob3c6IHRydWUsIG1pc3Npbmc6IGZhbHNlICxsYWJlbDogc2NhbGVkU3RyKHNpZGVzLmhlaWdodCxkcCkgKyBcIlxcXFxtYXRocm17Y219XCJ9XG4gICAgaWYgKGRlbm9taW5hdG9yID4gMSkge1xuICAgICAgO1tiYXNlLCBoZWlnaHRdLmZvckVhY2godiA9PiB7XG4gICAgICAgIHYubGFiZWwgPSBuZXcgZnJhY3Rpb24odi52YWwsZGVub21pbmF0b3IpLnRvTGF0ZXgodHJ1ZSkgKyAnXFxcXG1hdGhybXtjbX0nXG4gICAgICB9KVxuICAgIH1cbiAgICBsZXQgc2hvd09wcG9zaXRlcyA6IGJvb2xlYW5cbiAgICBjb25zdCBhcmVhUHJvcGVydGllcyA6IFBhcnRpYWw8T21pdDxWYWx1ZSwgJ3ZhbCc+PiA9IHt9XG4gICAgY29uc3QgcGVyaW1ldGVyUHJvcGVydGllcyA6IFBhcnRpYWw8T21pdDxWYWx1ZSwgJ3ZhbCc+PiA9IHt9XG5cbiAgICAvLyBzZWxlY3RpdmVseSBoaWRlL21pc3NpbmcgZGVwZW5kaW5nIG9uIHR5cGVcbiAgICBzd2l0Y2ggKG9wdGlvbnMucXVlc3Rpb25UeXBlKSB7XG4gICAgICBjYXNlICdhcmVhJzpcbiAgICAgICAgYXJlYVByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgYXJlYVByb3BlcnRpZXMubWlzc2luZyA9IHRydWVcbiAgICAgICAgc2hvd09wcG9zaXRlcyA9ICFvcHRpb25zLm5vRGlzdHJhY3RvcnNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3BlcmltZXRlcic6XG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBzaG93T3Bwb3NpdGVzID0gb3B0aW9ucy5ub0Rpc3RyYWN0b3JzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdyZXZlcnNlQXJlYSc6XG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLm1pc3NpbmcgPSBmYWxzZVxuICAgICAgICByYW5kRWxlbShbYmFzZSwgaGVpZ2h0XSkubWlzc2luZyA9IHRydWVcbiAgICAgICAgc2hvd09wcG9zaXRlcyA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdyZXZlcnNlUGVyaW1ldGVyJzpcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nID0gZmFsc2VcbiAgICAgICAgcmFuZEVsZW0oW2Jhc2UsIGhlaWdodF0pLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIHNob3dPcHBvc2l0ZXMgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgdGhpcyhiYXNlLCBoZWlnaHQsIHNob3dPcHBvc2l0ZXMsIGRwLCBkZW5vbWluYXRvciwgYXJlYVByb3BlcnRpZXMgYXMgT21pdDxWYWx1ZSwgJ3ZhbCc+LCBwZXJpbWV0ZXJQcm9wZXJ0aWVzIGFzIE9taXQ8VmFsdWUsICd2YWwnPilcbiAgfVxuXG4gIGdldCBwZXJpbWV0ZXIgKCkgOiBWYWx1ZSB7XG4gICAgaWYgKCF0aGlzLl9wZXJpbWV0ZXIpIHtcbiAgICAgIHRoaXMuX3BlcmltZXRlciA9IHtcbiAgICAgICAgc2hvdzogZmFsc2UsXG4gICAgICAgIG1pc3Npbmc6IHRydWVcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0aGlzLl9wZXJpbWV0ZXIudmFsKSB7XG4gICAgICB0aGlzLl9wZXJpbWV0ZXIudmFsID0gMiAqICh0aGlzLmJhc2UudmFsICsgdGhpcy5oZWlnaHQudmFsKVxuICAgICAgaWYgKHRoaXMuZGVub21pbmF0b3IgPiAxKSB7XG4gICAgICAgIHRoaXMuX3BlcmltZXRlci5sYWJlbCA9IG5ldyBmcmFjdGlvbih0aGlzLl9wZXJpbWV0ZXIudmFsLCB0aGlzLmRlbm9taW5hdG9yKS50b0xhdGV4KHRydWUpICsgJ1xcXFxtYXRocm17Y219J1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcGVyaW1ldGVyLmxhYmVsID0gc2NhbGVkU3RyKHRoaXMuX3BlcmltZXRlci52YWwsIHRoaXMuZHApICsgJ1xcXFxtYXRocm17Y219J1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcGVyaW1ldGVyIGFzIFZhbHVlXG4gIH1cblxuICBnZXQgYXJlYSAoKSA6IFZhbHVlIHtcbiAgICBpZiAoIXRoaXMuX2FyZWEpIHtcbiAgICAgIHRoaXMuX2FyZWEgPSB7XG4gICAgICAgIHNob3c6IGZhbHNlLFxuICAgICAgICBtaXNzaW5nOiB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5fYXJlYS52YWwpIHtcbiAgICAgIHRoaXMuX2FyZWEudmFsID0gdGhpcy5iYXNlLnZhbCAqIHRoaXMuaGVpZ2h0LnZhbFxuICAgICAgaWYgKHRoaXMuZGVub21pbmF0b3IgPiAxKSB7XG4gICAgICAgIHRoaXMuX2FyZWEubGFiZWwgPSBuZXcgZnJhY3Rpb24odGhpcy5fYXJlYS52YWwsIHRoaXMuZGVub21pbmF0b3IqKjIpLnRvTGF0ZXgodHJ1ZSkgKyAnXFxcXG1hdGhybXtjbX1eMidcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2FyZWEubGFiZWwgPSBzY2FsZWRTdHIodGhpcy5fYXJlYS52YWwsIDIgKiB0aGlzLmRwKSArICdcXFxcbWF0aHJte2NtfV4yJ1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fYXJlYSBhcyBWYWx1ZVxuICB9XG59XG4iLCJpbXBvcnQgeyBkcmF3UmlnaHRBbmdsZSB9IGZyb20gJ2RyYXdpbmcnXG5pbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyByYW5kRWxlbSB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCB7IEdyYXBoaWNRRGF0YSwgR3JhcGhpY1FWaWV3LCBMYWJlbCB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IHsgY29sb3JzIH0gZnJvbSAnLi90eXBlcydcbmltcG9ydCBSZWN0YW5nbGVBcmVhRGF0YSwgeyBWYWx1ZSB9IGZyb20gJy4vUmVjdGFuZ2xlQXJlYURhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlY3RhbmdsZUFyZWFWaWV3IGV4dGVuZHMgR3JhcGhpY1FWaWV3IHtcbiAgZGF0YSE6IFJlY3RhbmdsZUFyZWFEYXRhIC8vIGFzc2lnbmVkIGluIHN1cGVyXG4gIEE6IFBvaW50XG4gIEI6IFBvaW50XG4gIEM6IFBvaW50XG4gIEQ6IFBvaW50XG5cbiAgY29uc3RydWN0b3IgKEE6IFBvaW50LCBCOiBQb2ludCwgQzogUG9pbnQsIEQ6IFBvaW50LCBsYWJlbHM6IExhYmVsW10sIGRhdGE6IFJlY3RhbmdsZUFyZWFEYXRhLCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICAvKiBTdXBlciBkb2VzOlxuICAgICAqICBTZXRzIHRoaXMud2lkdGggYW5kIHRoaXMuaGVpZ2h0XG4gICAgICogIFNldHMgdGhpcy5kYXRhXG4gICAgICogIENyZWF0ZXMgRE9NIGVsZW1lbnRzLCBpbmNsdWRpbmcgY2FudmFzXG4gICAgICogIENyZWF0ZXMgZW1wdHkgdGhpcy5sYWJlbHMgbGlzdFxuICAgICAqL1xuICAgIHN1cGVyKGRhdGEsIHZpZXdPcHRpb25zKSAvLyBpbml0aWFsaXNlcyB0aGlzLmRhdGFcbiAgICB0aGlzLkEgPSBBXG4gICAgdGhpcy5CID0gQlxuICAgIHRoaXMuQyA9IENcbiAgICB0aGlzLkQgPSBEXG4gICAgdGhpcy5sYWJlbHMgPSBsYWJlbHNcbiAgfVxuXG4gIC8qKlxuICAgKiBTdGF0aWMgZmFjdG9yeSBtZXRob2QgcmV0dXJuaW5nIHZpZXcgZnJvbSBkYXRhXG4gICAqIEBwYXJhbSBkYXRhIEEgZGF0YSBvYmplY3QsIHdoaWNoIGhhZCBkZXRhaWxzIG9mIHdpZHRoLCBoZWlnaHQgYW5kIGFyZWFcbiAgICogQHBhcmFtIHZpZXdPcHRpb25zIFZpZXcgb3B0aW9ucyAtIGNvbnRhaW5pbmcgd2lkdGggYW5kIGhlaWdodFxuICAgKi9cbiAgc3RhdGljIGZyb21EYXRhIChkYXRhOiBSZWN0YW5nbGVBcmVhRGF0YSwgdmlld09wdGlvbnM/OiBWaWV3T3B0aW9ucykgOiBSZWN0YW5nbGVBcmVhVmlldyB7XG4gICAgLy8gRGVmYXVsdHMgKE5COiBkdXBsaWNhdGVzIGVmZm9ydCBpbiBjb25zdHJ1Y3RvciwgZ2l2ZW4gdXNlIG9mIHN0YXRpYyBmYWN0b3J5IGNvbnN0cnVjdG9yIGluc3RlYWQgb2YgR3JhcGhpY1EncyBtZXRob2QpXG4gICAgdmlld09wdGlvbnMgPSB2aWV3T3B0aW9ucyA/PyB7fVxuICAgIHZpZXdPcHRpb25zLndpZHRoID0gdmlld09wdGlvbnMud2lkdGggPz8gMzAwXG4gICAgdmlld09wdGlvbnMuaGVpZ2h0ID0gdmlld09wdGlvbnMuaGVpZ2h0ID8/IDMwMFxuXG4gICAgLy8gaW5pdGlhbCBwb2ludHNcbiAgICBjb25zdCBBID0gbmV3IFBvaW50KDAsIDApXG4gICAgY29uc3QgQiA9IG5ldyBQb2ludCgwLCBkYXRhLmhlaWdodC52YWwpXG4gICAgY29uc3QgQyA9IG5ldyBQb2ludChkYXRhLmJhc2UudmFsLCBkYXRhLmhlaWdodC52YWwpXG4gICAgY29uc3QgRCA9IG5ldyBQb2ludChkYXRhLmJhc2UudmFsLCAwKVxuXG4gICAgLy8gcm90YXRlLCBzY2FsZSBhbmQgY2VudGVyXG4gICAgY29uc3Qgcm90YXRpb24gPSB2aWV3T3B0aW9ucy5yb3RhdGlvbiA/PyAyICogTWF0aC5QSSAqIE1hdGgucmFuZG9tKClcbiAgICA7W0EsIEIsIEMsIERdLmZvckVhY2gocHQgPT4gcHQucm90YXRlKHJvdGF0aW9uKSlcbiAgICBQb2ludC5zY2FsZVRvRml0KFtBLCBCLCBDLCBEXSwgdmlld09wdGlvbnMud2lkdGgsIHZpZXdPcHRpb25zLmhlaWdodCwgMTAwLCBbMCwyMF0pXG5cbiAgICAvLyBTZXQgdXAgbGFiZWxzXG4gICAgY29uc3QgbGFiZWxzIDogTGFiZWxbXSA9IFtdXG5cbiAgICBjb25zdCBzaWRlcyA6IFtQb2ludCwgUG9pbnQsIFZhbHVlXVtdID0gWyAvLyBbMXN0IHBvaW50LCAybmQgcG9pbnQsIGxlbmd0aF1cbiAgICAgIFtBLCBCLCBkYXRhLmhlaWdodF0sXG4gICAgICBbQiwgQywgZGF0YS5iYXNlXVxuICAgIF1cblxuICAgIGlmIChkYXRhLnNob3dPcHBvc2l0ZXMpIHtcbiAgICAgIHNpZGVzLnB1c2goW0MsIEQsIGRhdGEuaGVpZ2h0XSlcbiAgICAgIHNpZGVzLnB1c2goW0QsIEEsIGRhdGEuYmFzZV0pXG4gICAgfVxuXG4gICAgZm9yIChsZXQgaSA9IDAsIG4gPSBzaWRlcy5sZW5ndGg7IGkgPCBuOyBpKyspIHsgLy8gc2lkZXNcbiAgICAgIGlmICghc2lkZXNbaV1bMl0uc2hvdykgY29udGludWVcbiAgICAgIGNvbnN0IG9mZnNldCA9IDIwXG4gICAgICBjb25zdCBwb3MgPSBQb2ludC5tZWFuKHNpZGVzW2ldWzBdLCBzaWRlc1tpXVsxXSlcbiAgICAgIGNvbnN0IHVuaXR2ZWMgPSBQb2ludC51bml0VmVjdG9yKHNpZGVzW2ldWzBdLCBzaWRlc1tpXVsxXSlcblxuICAgICAgcG9zLnRyYW5zbGF0ZSgtdW5pdHZlYy55ICogb2Zmc2V0LCB1bml0dmVjLnggKiBvZmZzZXQpXG5cbiAgICAgIGNvbnN0IHRleHRhID0gc2lkZXNbaV1bMl0ubGFiZWwgPz8gc2lkZXNbaV1bMl0udmFsLnRvU3RyaW5nKClcbiAgICAgIGNvbnN0IHRleHRxID0gc2lkZXNbaV1bMl0ubWlzc2luZyA/ICc/JyA6IHRleHRhXG4gICAgICBjb25zdCBzdHlsZXEgPSAnbm9ybWFsJ1xuICAgICAgY29uc3Qgc3R5bGVhID0gc2lkZXNbaV1bMl0ubWlzc2luZyA/ICdhbnN3ZXInIDogJ25vcm1hbCdcblxuICAgICAgbGFiZWxzLnB1c2goe1xuICAgICAgICBwb3M6IHBvcyxcbiAgICAgICAgdGV4dGE6IHRleHRhLFxuICAgICAgICB0ZXh0cTogdGV4dHEsXG4gICAgICAgIHRleHQ6IHRleHRxLFxuICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgc3R5bGVxOiBzdHlsZXEsXG4gICAgICAgIHN0eWxlOiBzdHlsZXFcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgbGV0IG5JbmZvID0gMFxuICAgIGlmIChkYXRhLmFyZWEuc2hvdykge1xuICAgICAgY29uc3QgdGV4dGEgPSBkYXRhLmFyZWEubGFiZWwgPz8gZGF0YS5hcmVhLnZhbC50b1N0cmluZygpXG4gICAgICBjb25zdCB0ZXh0cSA9IGRhdGEuYXJlYS5taXNzaW5nID8gJz8nIDogdGV4dGFcbiAgICAgIGNvbnN0IHN0eWxlcSA9ICdleHRyYS1pbmZvJ1xuICAgICAgY29uc3Qgc3R5bGVhID0gZGF0YS5hcmVhLm1pc3NpbmcgPyAnZXh0cmEtYW5zd2VyJyA6ICdleHRyYS1pbmZvJ1xuICAgICAgbGFiZWxzLnB1c2goXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXh0YTogJ1xcXFx0ZXh0e0FyZWF9ID0gJyArIHRleHRhLFxuICAgICAgICAgIHRleHRxOiAnXFxcXHRleHR7QXJlYX0gPSAnICsgdGV4dHEsXG4gICAgICAgICAgdGV4dDogJ1xcXFx0ZXh0e0FyZWF9ID0gJyArIHRleHRxLFxuICAgICAgICAgIHN0eWxlcTogc3R5bGVxLFxuICAgICAgICAgIHN0eWxlYTogc3R5bGVhLFxuICAgICAgICAgIHN0eWxlOiBzdHlsZXEsXG4gICAgICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIHZpZXdPcHRpb25zLmhlaWdodCAtIDEwIC0gMTUgKiBuSW5mbylcbiAgICAgICAgfVxuICAgICAgKVxuICAgICAgbkluZm8rK1xuICAgIH1cblxuICAgIGlmIChkYXRhLnBlcmltZXRlci5zaG93KSB7XG4gICAgICBjb25zdCB0ZXh0YSA9IGRhdGEucGVyaW1ldGVyLmxhYmVsID8/IGRhdGEucGVyaW1ldGVyLnZhbC50b1N0cmluZygpXG4gICAgICBjb25zdCB0ZXh0cSA9IGRhdGEucGVyaW1ldGVyLm1pc3NpbmcgPyAnPycgOiB0ZXh0YVxuICAgICAgY29uc3Qgc3R5bGVxID0gJ2V4dHJhLWluZm8nXG4gICAgICBjb25zdCBzdHlsZWEgPSBkYXRhLnBlcmltZXRlci5taXNzaW5nID8gJ2V4dHJhLWFuc3dlcicgOiAnZXh0cmEtaW5mbydcbiAgICAgIGxhYmVscy5wdXNoKFxuICAgICAgICB7XG4gICAgICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIHZpZXdPcHRpb25zLmhlaWdodCAtIDEwIC0gMjAgKiBuSW5mbyksXG4gICAgICAgICAgdGV4dGE6ICdcXFxcdGV4dHtQZXJpbWV0ZXJ9ID0gJyArIHRleHRhLFxuICAgICAgICAgIHRleHRxOiAnXFxcXHRleHR7UGVyaW1ldGVyfSA9ICcgKyB0ZXh0cSxcbiAgICAgICAgICB0ZXh0OiAnXFxcXHRleHR7UGVyaW1ldGVyfSA9ICcgKyB0ZXh0cSxcbiAgICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgICBzdHlsZTogc3R5bGVxXG4gICAgICAgIH1cbiAgICAgIClcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJlY3RhbmdsZUFyZWFWaWV3KEEsIEIsIEMsIEQsIGxhYmVscywgZGF0YSwgdmlld09wdGlvbnMpXG4gIH1cblxuICByZW5kZXIgKCk6IHZvaWQge1xuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICBpZiAoY3R4ID09PSBudWxsKSB7IHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGdldCBjb250ZXh0JykgfVxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcbiAgICBjdHguc2V0TGluZURhc2goW10pXG5cbiAgICAvLyBkcmF3IHJlY3RhbmdsZVxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGN0eC5tb3ZlVG8odGhpcy5BLngsIHRoaXMuQS55KVxuICAgIGN0eC5saW5lVG8odGhpcy5CLngsIHRoaXMuQi55KVxuICAgIGN0eC5saW5lVG8odGhpcy5DLngsIHRoaXMuQy55KVxuICAgIGN0eC5saW5lVG8odGhpcy5ELngsIHRoaXMuRC55KVxuICAgIGN0eC5saW5lVG8odGhpcy5BLngsIHRoaXMuQS55KVxuICAgIGN0eC5zdHJva2UoKVxuICAgIGN0eC5maWxsU3R5bGUgPSByYW5kRWxlbShjb2xvcnMpXG4gICAgY3R4LmZpbGwoKVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgLy8gcmlnaHQgYW5nbGVzXG4gICAgY29uc3Qgc2l6ZSA9IE1hdGgubWluKFxuICAgICAgMTUsXG4gICAgICBNYXRoLm1pbihQb2ludC5kaXN0YW5jZSh0aGlzLkEsIHRoaXMuQiksIFBvaW50LmRpc3RhbmNlKHRoaXMuQiwgdGhpcy5DKSkgLyAzXG4gICAgKVxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGRyYXdSaWdodEFuZ2xlKGN0eCwgdGhpcy5BLCB0aGlzLkIsIHRoaXMuQywgc2l6ZSlcbiAgICBkcmF3UmlnaHRBbmdsZShjdHgsIHRoaXMuQiwgdGhpcy5DLCB0aGlzLkQsIHNpemUpXG4gICAgZHJhd1JpZ2h0QW5nbGUoY3R4LCB0aGlzLkMsIHRoaXMuRCwgdGhpcy5BLCBzaXplKVxuICAgIGRyYXdSaWdodEFuZ2xlKGN0eCwgdGhpcy5ELCB0aGlzLkEsIHRoaXMuQiwgc2l6ZSlcbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIHRoaXMucmVuZGVyTGFiZWxzKClcbiAgfVxufVxuIiwiaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCBSZWN0YW5nbGVBcmVhRGF0YSBmcm9tICcuL1JlY3RhbmdsZUFyZWFEYXRhJ1xuaW1wb3J0IFJlY3RhbmdsZUFyZWFWaWV3IGZyb20gJy4vUmVjdGFuZ2xlQXJlYVZpZXcnXG5pbXBvcnQgeyBRdWVzdGlvbk9wdGlvbnMgfSBmcm9tICcuL3R5cGVzJ1xuXG4vLyBSZWN0YW5nbGUgbmVlZHMgbm8gZnVydGhlciBvcHRpb25zXG4vLyBUcmlhbmdsZSBuZWVkcyBubyBmdXJ0aGVyIG9wdGlvbnMgLS0gbmVlZHMgcGFzc2luZyBpblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWN0YW5nbGVBcmVhUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YSE6IFJlY3RhbmdsZUFyZWFEYXRhIC8vIGluaXRpYWxpc2VkIGluIHN1cGVyKClcbiAgdmlldyE6IFJlY3RhbmdsZUFyZWFWaWV3XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogUXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICBjb25zdCBkYXRhID0gUmVjdGFuZ2xlQXJlYURhdGEucmFuZG9tKG9wdGlvbnMpXG4gICAgY29uc3QgdmlldyA9IFJlY3RhbmdsZUFyZWFWaWV3LmZyb21EYXRhKGRhdGEsIHZpZXdPcHRpb25zKVxuICAgIHJldHVybiBuZXcgdGhpcyhkYXRhLCB2aWV3KVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlcydcbiAgfVxufVxuIiwiaW1wb3J0IGZyYWN0aW9uIGZyb20gXCJmcmFjdGlvbi5qc1wiXG5pbXBvcnQgeyByYW5kQmV0d2VlbiwgcmFuZEVsZW0sIHJhbmRQeXRoYWdUcmlwbGUsIHJhbmRQeXRoYWdUcmlwbGVXaXRoTGVnLCBzY2FsZWRTdHIgfSBmcm9tIFwidXRpbGl0aWVzXCJcbmltcG9ydCB7IFZhbHVlIH0gZnJvbSBcIi4vUmVjdGFuZ2xlQXJlYURhdGFcIlxuaW1wb3J0IHsgUXVlc3Rpb25PcHRpb25zIH0gZnJvbSBcIi4vdHlwZXNcIlxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUcmFwZXppdW1BcmVhRGF0YSB7XG4gIGE6IFZhbHVlIC8vIHR3byBwYXJhbGxlbCBzaWRlc1xuICBiOiBWYWx1ZSAvLyAgXCIgICBcIlwiXG4gIGhlaWdodDogVmFsdWVcbiAgc2lkZTE6IFZhbHVlIC8vIFNsYW50ZWQgc2lkZXNcbiAgc2lkZTI6IFZhbHVlXG4gIGIxOiBudW1iZXJcbiAgYjI6IG51bWJlclxuICBwcml2YXRlIHJlYWRvbmx5IGRwOiBudW1iZXIgPSAwXG4gIHByaXZhdGUgcmVhZG9ubHkgZGVub21pbmF0b3I6IG51bWJlciA9IDFcbiAgcHJpdmF0ZSBfYXJlYT86IFBhcnRpYWw8VmFsdWU+XG4gIHByaXZhdGUgX3BlcmltZXRlcj86IFBhcnRpYWw8VmFsdWU+XG4gIGNvbnN0cnVjdG9yKGE6IFZhbHVlLGI6IFZhbHVlLGhlaWdodDogVmFsdWUsc2lkZTE6IFZhbHVlLHNpZGUyOiBWYWx1ZSwgYjE6IG51bWJlciwgYjI6IG51bWJlciwgZHA6IG51bWJlcixkZW5vbWluYXRvcjogbnVtYmVyLHBlcmltZXRlclByb3BlcnRpZXM/OiBQYXJ0aWFsPFZhbHVlPixhcmVhUHJvcGVydGllcz86IFBhcnRpYWw8VmFsdWU+KSB7XG4gICAgdGhpcy5hID0gYVxuICAgIHRoaXMuYiA9IGJcbiAgICB0aGlzLmhlaWdodCA9IGhlaWdodFxuICAgIHRoaXMuc2lkZTEgPSBzaWRlMVxuICAgIHRoaXMuc2lkZTIgPSBzaWRlMlxuICAgIHRoaXMuYjEgPSBiMVxuICAgIHRoaXMuYjIgPSBiMlxuICAgIHRoaXMuZHAgPSBkcFxuICAgIHRoaXMuZGVub21pbmF0b3IgPSBkZW5vbWluYXRvclxuICAgIHRoaXMuX3BlcmltZXRlciA9IHBlcmltZXRlclByb3BlcnRpZXNcbiAgICB0aGlzLl9hcmVhID0gYXJlYVByb3BlcnRpZXNcbiAgfVxuXG4gIGdldCBwZXJpbWV0ZXIgKCkgOiBWYWx1ZSB7XG4gICAgaWYgKCF0aGlzLl9wZXJpbWV0ZXIpIHtcbiAgICAgIHRoaXMuX3BlcmltZXRlciA9IHtcbiAgICAgICAgc2hvdzogZmFsc2UsXG4gICAgICAgIG1pc3Npbmc6IHRydWVcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0aGlzLl9wZXJpbWV0ZXIudmFsKSB7XG4gICAgICB0aGlzLl9wZXJpbWV0ZXIudmFsID0gdGhpcy5hLnZhbCArIHRoaXMuYi52YWwgKyB0aGlzLnNpZGUxLnZhbCArIHRoaXMuc2lkZTIudmFsXG4gICAgICBpZiAodGhpcy5kZW5vbWluYXRvciA+IDEpIHtcbiAgICAgICAgdGhpcy5fcGVyaW1ldGVyLmxhYmVsID0gbmV3IGZyYWN0aW9uKHRoaXMuX3BlcmltZXRlci52YWwsIHRoaXMuZGVub21pbmF0b3IpLnRvTGF0ZXgodHJ1ZSkgKyAnXFxcXG1hdGhybXtjbX0nXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9wZXJpbWV0ZXIubGFiZWwgPSBzY2FsZWRTdHIodGhpcy5fcGVyaW1ldGVyLnZhbCwgdGhpcy5kcCkgKyAnXFxcXG1hdGhybXtjbX0nXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9wZXJpbWV0ZXIgYXMgVmFsdWVcbiAgfVxuICBnZXQgYXJlYSAoKTogVmFsdWUge1xuICAgIGlmICghdGhpcy5fYXJlYSkge1xuICAgICAgdGhpcy5fYXJlYSA9IHtcbiAgICAgICAgc2hvdzogZmFsc2UsXG4gICAgICAgIG1pc3Npbmc6IHRydWVcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0aGlzLl9hcmVhLnZhbCkge1xuICAgICAgdGhpcy5fYXJlYS52YWwgPSB0aGlzLmhlaWdodC52YWwqKHRoaXMuYS52YWwrdGhpcy5iLnZhbCkvMlxuICAgICAgaWYgKHRoaXMuZGVub21pbmF0b3IgPiAxKSB7XG4gICAgICAgIHRoaXMuX2FyZWEubGFiZWwgPSBuZXcgZnJhY3Rpb24odGhpcy5fYXJlYS52YWwsIHRoaXMuZGVub21pbmF0b3IqKjIpLnRvTGF0ZXgodHJ1ZSkgKyAnXFxcXG1hdGhybXtjbX1eMidcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2FyZWEubGFiZWwgPSBzY2FsZWRTdHIodGhpcy5fYXJlYS52YWwsIDIgKiB0aGlzLmRwKSArICdcXFxcbWF0aHJte2NtfV4yJ1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fYXJlYSBhcyBWYWx1ZVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbShvcHRpb25zOiBSZXF1aXJlZDxRdWVzdGlvbk9wdGlvbnM+KSA6IFRyYXBleml1bUFyZWFEYXRhIHtcbiAgICBjb25zdCBkcDogbnVtYmVyID0gb3B0aW9ucy5kcCAvLyBkb24ndCBhY3R1YWxseSBzY2FsZSAtIGp1c3QgZG8gdGhpcyBpbiBkaXNwbGF5XG4gICAgY29uc3QgZGVub21pbmF0b3IgPSBvcHRpb25zLmZyYWN0aW9uPyByYW5kQmV0d2VlbigyLDYpIDogMVxuXG4gICAgbGV0IGFWYWx1ZSA6IG51bWJlciAvL3Nob3J0ZWQgcGFyYWxsZWwgc2lkZVxuICAgIGxldCBiVmFsdWUgOiBudW1iZXIgLy8gbG9uZ2VyIHBhcmFsbGVsIHNpZGVcbiAgICBsZXQgczFWYWx1ZSA6IG51bWJlclxuICAgIGxldCBzMlZhbHVlOiBudW1iZXJcbiAgICBsZXQgaFZhbHVlOiBudW1iZXIgLy8gZmluYWwgc2lkZXMgYW5kIGhlaWdodFxuICAgIGxldCBiMTogbnVtYmVyXG4gICAgbGV0IGIyOiBudW1iZXIgLy8gYml0cyBvZiBsb25nZXN0IHBhcmFsbGVsIHNpZGUuIGI9YStiMStiMlxuICAgIGxldCB0cmlhbmdsZTE6IHthOiBudW1iZXIsIGI6IG51bWJlciwgYzogbnVtYmVyfVxuICAgIGxldCB0cmlhbmdsZTI6IHthOiBudW1iZXIsIGI6IG51bWJlciwgYzogbnVtYmVyfSAvLyB0d28gcmEgdHJpYW5nbGVzXG5cbiAgICB0cmlhbmdsZTEgPSByYW5kUHl0aGFnVHJpcGxlKG9wdGlvbnMubWF4TGVuZ3RoKVxuICAgIHMxVmFsdWUgPSB0cmlhbmdsZTEuY1xuXG4gICAgaWYgKE1hdGgucmFuZG9tKCkgPCAwLjUpIHsgLy8gc3RpY2sgYSByYSB0cmlhbmdsZSBvbiBvbmUgc2lkZVxuICAgICAgaFZhbHVlID0gdHJpYW5nbGUxLmFcbiAgICAgIGIxID0gdHJpYW5nbGUxLmJcbiAgICB9IGVsc2Uge1xuICAgICAgaFZhbHVlID0gdHJpYW5nbGUxLmJcbiAgICAgIGIxID0gdHJpYW5nbGUxLmFcbiAgICB9XG5cbiAgICBpZiAoTWF0aC5yYW5kb20oKSA8IDAuOSkgeyAvLyBzdGljayBhIHRyaWFuZ2xlIG9uIHRoZSBvdGhlciBzaWRlXG4gICAgICB0cmlhbmdsZTIgPSByYW5kUHl0aGFnVHJpcGxlV2l0aExlZyhoVmFsdWUsIG9wdGlvbnMubWF4TGVuZ3RoKVxuICAgICAgczJWYWx1ZSA9IHRyaWFuZ2xlMi5jXG4gICAgICBiMiA9IHRyaWFuZ2xlMi5iIC8vIHRyaTIuYSA9OiBoXG4gICAgfSBlbHNlIHsgLy8gcmlnaHQtYW5nbGVkIHRyYXBleml1bVxuICAgICAgczJWYWx1ZSA9IGhWYWx1ZVxuICAgICAgYjIgPSAwXG4gICAgfVxuXG4gICAgLy8gRmluZCBhIHZhbHVlXG4gICAgY29uc3QgTUlOUFJPUCA9IDggLy8gdGhlIGZpbmFsIGxlbmd0aCBvZiBhIHdpdGhoIGJlIGF0IGxlYXN0ICgxL01JTlBST1ApIG9mIHRoZSBmaW5hbCBsZW5ndGggb2YgYi4gSS5lLiBhIGlzIG1vcmUgdGhhbiAxLzggb2YgYlxuICAgIGNvbnN0IG1heEFWYWx1ZSA9IE1hdGgubWluKG9wdGlvbnMubWF4TGVuZ3RoIC0gYjEgLSBiMiwgTUlOUFJPUCpoVmFsdWUpXG4gICAgY29uc3QgbWluQVZhbHVlID0gTWF0aC5jZWlsKChiMStiMikvKE1JTlBST1AtMSkpXG4gICAgY29uc29sZS5sb2coKVxuICAgIGlmIChtYXhBVmFsdWUgLSBtaW5BVmFsdWUgPCAxKSB7Ly8gd2lsbCBvdmVyc2hvb3QgbWF4TGVuZ3RoIGEgYmlcbiAgICAgIGFWYWx1ZSA9IE1hdGguZmxvb3IobWluQVZhbHVlKVxuICAgICAgY29uc29sZS53YXJuKGBPdmVyc2hvb3RpbmcgbWF4IGxlbmd0aCBieSBuZWNlc3NpdHkuIHMxPSR7czFWYWx1ZX0sIHMyPSR7czJWYWx1ZX0sIGE9JHthVmFsdWV9YClcbiAgICB9IGVsc2Uge1xuICAgICAgYVZhbHVlID0gcmFuZEJldHdlZW4obWluQVZhbHVlLG1heEFWYWx1ZSlcbiAgICB9IFxuICAgIGJWYWx1ZSA9IGIxICsgYjIgKyBhVmFsdWVcblxuICAgIGNvbnN0IGE6IFZhbHVlID0geyB2YWw6IGFWYWx1ZSwgc2hvdzogdHJ1ZSwgbWlzc2luZzogZmFsc2UgfVxuICAgIGNvbnN0IGI6IFZhbHVlID0geyB2YWw6IGJWYWx1ZSwgc2hvdzogdHJ1ZSwgbWlzc2luZzogZmFsc2UgfVxuICAgIGNvbnN0IGhlaWdodDogVmFsdWUgPSB7XG4gICAgICB2YWw6IGhWYWx1ZSxcbiAgICAgIHNob3c6IHMyVmFsdWUgIT09IGhWYWx1ZSwgLy8gZG9uJ3Qgc2hvdyBpZiByaWdodC1hbmdsZWRcbiAgICAgIG1pc3Npbmc6IGZhbHNlXG4gICAgfVxuICAgIGNvbnN0IHNpZGUxOiBWYWx1ZSA9IHsgdmFsOiBzMVZhbHVlLCBzaG93OiB0cnVlLCBtaXNzaW5nOiBmYWxzZSB9XG4gICAgY29uc3Qgc2lkZTI6IFZhbHVlID0geyB2YWw6IHMyVmFsdWUsIHNob3c6IHRydWUsIG1pc3Npbmc6IGZhbHNlIH1cbiAgICBjb25zdCBhcmVhUHJvcGVydGllczogUGFydGlhbDxWYWx1ZT4gPSB7c2hvdzogZmFsc2UsIG1pc3Npbmc6IGZhbHNlfVxuICAgIGNvbnN0IHBlcmltZXRlclByb3BlcnRpZXM6IFBhcnRpYWw8VmFsdWU+ID0ge3Nob3c6IGZhbHNlLCBtaXNzaW5nOiBmYWxzZX1cblxuICAgIC8vIHNlbGVjdGl2ZWx5IGhpZGUvbWlzc2luZyBkZXBlbmRpbmcgb24gdHlwZVxuICAgIHN3aXRjaCAob3B0aW9ucy5xdWVzdGlvblR5cGUpIHtcbiAgICAgIGNhc2UgJ2FyZWEnOlxuICAgICAgICBhcmVhUHJvcGVydGllcy5zaG93ID0gdHJ1ZVxuICAgICAgICBhcmVhUHJvcGVydGllcy5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAncGVyaW1ldGVyJzpcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5zaG93ID0gdHJ1ZVxuICAgICAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdyZXZlcnNlQXJlYSc6IC8vIGhpZGUgb25lIG9mIGIgb3IgaGVpZ2h0XG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLm1pc3NpbmcgPSBmYWxzZVxuICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSA8IDAuMykgaGVpZ2h0Lm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIGVsc2UgaWYgKE1hdGgucmFuZG9tKCkgPCAwLjUpIGIubWlzc2luZyA9IHRydWVcbiAgICAgICAgZWxzZSAgYS5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAncmV2ZXJzZVBlcmltZXRlcic6XG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nID0gZmFsc2VcbiAgICAgICAgcmFuZEVsZW0oW3NpZGUxLHNpZGUyLGEsYl0pLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gbGFiZWxzIGZvciBzaWRlcyBkZXBlbmRpbmcgb24gZHAgYW5kIGRlbm9taW5hdG9yIHNldHRpbmdzXG4gICAgaWYgKGRlbm9taW5hdG9yID09PSAxKSB7XG4gICAgICBbYSxiLHNpZGUxLHNpZGUyLGhlaWdodF0uZm9yRWFjaCggdiA9PiB7XG4gICAgICAgIHYubGFiZWwgPSBzY2FsZWRTdHIodi52YWwsIGRwKSArICdcXFxcbWF0aHJte2NtfSdcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIFthLGIsc2lkZTEsc2lkZTIsaGVpZ2h0XS5mb3JFYWNoKCB2ID0+IHtcbiAgICAgICAgdi5sYWJlbCA9IG5ldyBmcmFjdGlvbih2LnZhbCwgZGVub21pbmF0b3IpLnRvTGF0ZXgodHJ1ZSkgKyAnXFxcXG1hdGhybXtjbX0nXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vIHR1cm4gb2YgZGlzdHJhY3RvcnMgaWYgbmVjZXNzYXJ5XG4gICAgaWYgKG9wdGlvbnMubm9EaXN0cmFjdG9ycykge1xuICAgICAgaWYgKG9wdGlvbnMucXVlc3Rpb25UeXBlID09PSAnYXJlYScgfHwgb3B0aW9ucy5xdWVzdGlvblR5cGUgPT09ICdyZXZlcnNlQXJlYScpIHtcbiAgICAgICAgc2lkZTEuc2hvdyA9IGZhbHNlXG4gICAgICAgIHNpZGUyLnNob3cgPSAhaGVpZ2h0LnNob3cgLy8gc2hvdyBvbmx5IGlmIGhlaWdodCBpcyBhbHJlYWR5IGhpZGRlbiAoaS5lLiBpZiByaWdodCBhbmdsZWQpXG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbnMucXVlc3Rpb25UeXBlPT09ICdwZXJpbWV0ZXInIHx8IG9wdGlvbnMucXVlc3Rpb25UeXBlID09PSAncmV2ZXJzZVBlcmltZXRlcicpIHtcbiAgICAgICAgaGVpZ2h0LnNob3cgPSBmYWxzZVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgVHJhcGV6aXVtQXJlYURhdGEoYSxiLGhlaWdodCxzaWRlMSxzaWRlMixiMSxiMixkcCxkZW5vbWluYXRvcixwZXJpbWV0ZXJQcm9wZXJ0aWVzLGFyZWFQcm9wZXJ0aWVzKVxuXG4gIH1cbn1cbiIsImltcG9ydCB7IGFycm93TGluZSwgZHJhd1JpZ2h0QW5nbGUsIHBhcmFsbGVsU2lnbiB9IGZyb20gXCJkcmF3aW5nXCI7XG5pbXBvcnQgUG9pbnQgZnJvbSBcIlBvaW50XCI7XG5pbXBvcnQgeyByYW5kRWxlbSB9IGZyb20gXCJ1dGlsaXRpZXNcIjtcbmltcG9ydCB7IEdyYXBoaWNRVmlldywgTGFiZWwgfSBmcm9tIFwiLi4vR3JhcGhpY1FcIjtcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tIFwiLi4vVmlld09wdGlvbnNcIjtcbmltcG9ydCB7IFZhbHVlIH0gZnJvbSBcIi4vUmVjdGFuZ2xlQXJlYURhdGFcIjtcbmltcG9ydCBUcmFwZXppdW1BcmVhRGF0YSBmcm9tIFwiLi9UcmFwZXppdW1BcmVhRGF0YVwiO1xuaW1wb3J0IHsgY29sb3JzIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVHJhcGV6aXVtQXJlYVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICBkYXRhITogVHJhcGV6aXVtQXJlYURhdGFcbiAgQTogUG9pbnRcbiAgQjogUG9pbnRcbiAgQzogUG9pbnRcbiAgRDogUG9pbnRcbiAgaHQxOiBQb2ludFxuICBodDI6IFBvaW50XG4gIGNvbnN0cnVjdG9yKGRhdGE6IFRyYXBleml1bUFyZWFEYXRhLCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMsIEE6IFBvaW50LCBCOiBQb2ludCwgQzogUG9pbnQsIEQ6IFBvaW50LCBodDE6IFBvaW50LCBodDI6IFBvaW50LCBsYWJlbHM6IExhYmVsW10pIHtcbiAgICBzdXBlcihkYXRhLHZpZXdPcHRpb25zKVxuICAgIHRoaXMuQSA9IEFcbiAgICB0aGlzLkIgPSBCXG4gICAgdGhpcy5DID0gQ1xuICAgIHRoaXMuRCA9IERcbiAgICB0aGlzLmh0MSA9IGh0MVxuICAgIHRoaXMuaHQyID0gaHQyXG4gICAgdGhpcy5sYWJlbHMgPSBsYWJlbHNcbiAgfVxuXG4gIHN0YXRpYyBmcm9tRGF0YShkYXRhOiBUcmFwZXppdW1BcmVhRGF0YSwgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSA6IFRyYXBleml1bUFyZWFWaWV3IHtcbiAgICAvLyBEZWZhdWx0cyAoTkI6IGR1cGxpY2F0ZXMgZWZmb3J0IGluIGNvbnN0cnVjdG9yLCBnaXZlbiB1c2Ugb2Ygc3RhdGljIGZhY3RvcnkgY29uc3RydWN0b3IgaW5zdGVhZCBvZiBHcmFwaGljUSdzIG1ldGhvZClcbiAgICB2aWV3T3B0aW9ucyA9IHZpZXdPcHRpb25zID8/IHt9XG4gICAgdmlld09wdGlvbnMud2lkdGggPSB2aWV3T3B0aW9ucy53aWR0aCA/PyAzMDBcbiAgICB2aWV3T3B0aW9ucy5oZWlnaHQgPSB2aWV3T3B0aW9ucy5oZWlnaHQgPz8gMzAwXG5cbiAgICAvLyBpbml0aWFsIHBvaW50c1xuICAgIGNvbnN0IEEgPSBuZXcgUG9pbnQoMCwwKTtcbiAgICBjb25zdCBCID0gbmV3IFBvaW50KGRhdGEuYjEsZGF0YS5oZWlnaHQudmFsKTtcbiAgICBjb25zdCBDID0gbmV3IFBvaW50KGRhdGEuYjErZGF0YS5hLnZhbCxkYXRhLmhlaWdodC52YWwpO1xuICAgIGNvbnN0IEQgPSBuZXcgUG9pbnQoZGF0YS5iLnZhbCwwKTtcblxuICAgIGNvbnN0IGh0MSA9IG5ldyBQb2ludChkYXRhLmIxK2RhdGEuYS52YWwvMixkYXRhLmhlaWdodC52YWwpO1xuICAgIGNvbnN0IGh0MiA9IG5ldyBQb2ludChkYXRhLmIxK2RhdGEuYS52YWwvMiwwKTtcblxuICAgIC8vIHJvdGF0ZVxuXG4gICAgY29uc3Qgcm90YXRpb24gPSB2aWV3T3B0aW9ucy5yb3RhdGlvbiA/PyAyKk1hdGguUEkgKiBNYXRoLnJhbmRvbSgpXG4gICAgO1tBLEIsQyxELGh0MSxodDJdLmZvckVhY2gocHQgPT4gcHQucm90YXRlKHJvdGF0aW9uKSlcbiAgICBQb2ludC5zY2FsZVRvRml0KFtBLEIsQyxELGh0MSxodDJdLCB2aWV3T3B0aW9ucy53aWR0aCwgdmlld09wdGlvbnMuaGVpZ2h0LCAxMDAsIFswLDIwXSlcblxuXG4gICAgLy8gbGFiZWxzXG4gICAgY29uc3QgbGFiZWxzIDogTGFiZWxbXSA9IFtdO1xuXG4gICAgY29uc3Qgc2lkZXMgOiBbUG9pbnQsUG9pbnQsVmFsdWVdW109IFsgLy9bMXN0IHBvaW50LCAybmQgcG9pbnQsIGxlbmd0aF1cbiAgICAgIFtBLEIsZGF0YS5zaWRlMV0sXG4gICAgICBbQixDLGRhdGEuYV0sXG4gICAgICBbQyxELGRhdGEuc2lkZTJdLFxuICAgICAgW0QsQSxkYXRhLmJdLFxuICAgICAgW2h0MSxodDIsZGF0YS5oZWlnaHRdXG4gICAgXTtcblxuICAgIGZvciAobGV0IGkgPSAwLCBuPXNpZGVzLmxlbmd0aDsgaSA8IG47IGkrKykgeyAvL3NpZGVzXG4gICAgICBpZiAoIXNpZGVzW2ldWzJdLnNob3cpIGNvbnRpbnVlO1xuICAgICAgY29uc3Qgb2Zmc2V0ID0gMjU7XG4gICAgICBsZXQgcG9zID0gUG9pbnQubWVhbihzaWRlc1tpXVswXSxzaWRlc1tpXVsxXSk7XG4gICAgICBjb25zdCB1bml0dmVjID0gUG9pbnQudW5pdFZlY3RvcihzaWRlc1tpXVswXSwgc2lkZXNbaV1bMV0pO1xuICAgICAgXG4gICAgICBwb3MudHJhbnNsYXRlKC11bml0dmVjLnkqb2Zmc2V0LCB1bml0dmVjLngqb2Zmc2V0KTsgXG5cbiAgICAgIGNvbnN0IHRleHRhID0gc2lkZXNbaV1bMl0ubGFiZWwgPz8gc2lkZXNbaV1bMl0udmFsLnRvU3RyaW5nKClcbiAgICAgIGNvbnN0IHRleHRxID0gc2lkZXNbaV1bMl0ubWlzc2luZz8gXCI/XCIgOiB0ZXh0YTtcbiAgICAgIGNvbnN0IHN0eWxlcSA9IFwibm9ybWFsXCI7XG4gICAgICBjb25zdCBzdHlsZWEgPSBzaWRlc1tpXVsyXS5taXNzaW5nPyBcImFuc3dlclwiIDogXCJub3JtYWxcIjtcblxuICAgICAgbGFiZWxzLnB1c2goe1xuICAgICAgICBwb3M6IHBvcyxcbiAgICAgICAgdGV4dGE6IHRleHRhLFxuICAgICAgICB0ZXh0cTogdGV4dHEsXG4gICAgICAgIHRleHQ6IHRleHRxLFxuICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgc3R5bGVxOiBzdHlsZXEsXG4gICAgICAgIHN0eWxlOiBzdHlsZXFcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGxldCBuX2luZm8gPSAwO1xuICAgIGlmIChkYXRhLmFyZWEuc2hvdykge1xuICAgICAgY29uc3QgdGV4dGEgPSBkYXRhLmFyZWEubGFiZWwgPz8gZGF0YS5hcmVhLnZhbC50b1N0cmluZygpXG4gICAgICBjb25zdCB0ZXh0cSA9IGRhdGEuYXJlYS5taXNzaW5nPyBcIj9cIiA6IHRleHRhO1xuICAgICAgY29uc3Qgc3R5bGVxID0gXCJleHRyYS1pbmZvXCI7XG4gICAgICBjb25zdCBzdHlsZWEgPSBkYXRhLmFyZWEubWlzc2luZz8gXCJleHRyYS1hbnN3ZXJcIiA6IFwiZXh0cmEtaW5mb1wiO1xuICAgICAgbGFiZWxzLnB1c2goXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXh0YTogXCJcXFxcdGV4dHtBcmVhfSA9IFwiICsgdGV4dGEsXG4gICAgICAgICAgdGV4dHE6IFwiXFxcXHRleHR7QXJlYX0gPSBcIiArIHRleHRxLFxuICAgICAgICAgIHRleHQ6IFwiXFxcXHRleHR7QXJlYX0gPSBcIiArIHRleHRxLFxuICAgICAgICAgIHN0eWxlcTogc3R5bGVxLFxuICAgICAgICAgIHN0eWxlYTogc3R5bGVhLFxuICAgICAgICAgIHN0eWxlOiBzdHlsZXEsXG4gICAgICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIHZpZXdPcHRpb25zLmhlaWdodCAtIDEwIC0gMjAqbl9pbmZvKSxcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICAgIG5faW5mbysrO1xuICAgIH1cbiAgICBpZiAoZGF0YS5wZXJpbWV0ZXIuc2hvdykge1xuICAgICAgY29uc3QgdGV4dGEgPSBkYXRhLnBlcmltZXRlci5sYWJlbCA/PyBkYXRhLnBlcmltZXRlci52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSBkYXRhLnBlcmltZXRlci5taXNzaW5nPyBcIj9cIiA6IHRleHRhO1xuICAgICAgY29uc3Qgc3R5bGVxID0gXCJleHRyYS1pbmZvXCI7XG4gICAgICBjb25zdCBzdHlsZWEgPSBkYXRhLnBlcmltZXRlci5taXNzaW5nPyBcImV4dHJhLWFuc3dlclwiIDogXCJleHRyYS1pbmZvXCI7XG4gICAgICBsYWJlbHMucHVzaChcbiAgICAgICAge1xuICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB2aWV3T3B0aW9ucy5oZWlnaHQgLSAxMCAtIDIwKm5faW5mbyksXG4gICAgICAgICAgdGV4dGE6IFwiXFxcXHRleHR7UGVyaW1ldGVyfSA9IFwiICsgdGV4dGEsXG4gICAgICAgICAgdGV4dHE6IFwiXFxcXHRleHR7UGVyaW1ldGVyfSA9IFwiICsgdGV4dHEsXG4gICAgICAgICAgdGV4dDogXCJcXFxcdGV4dHtQZXJpbWV0ZXJ9ID0gXCIgKyB0ZXh0cSxcbiAgICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgICBzdHlsZTogc3R5bGVxLFxuICAgICAgICB9XG4gICAgICApXG4gICAgfVxuICAgIHJldHVybiBuZXcgVHJhcGV6aXVtQXJlYVZpZXcoZGF0YSx2aWV3T3B0aW9ucyxBLEIsQyxELGh0MSxodDIsbGFiZWxzKVxuICB9XG5cbiAgcmVuZGVyKCkgOiB2b2lkIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgaWYgKCFjdHgpIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGdldCBjYW52YXMgY29udGV4dCcpXG4gICAgY3R4LmNsZWFyUmVjdCgwLDAsdGhpcy5jYW52YXMud2lkdGgsdGhpcy5jYW52YXMuaGVpZ2h0KTsgLy8gY2xlYXJcbiAgICBjdHguc2V0TGluZURhc2goW10pO1xuXG4gICAgLy8gZHJhdyBwYXJhbGxlbG9ncmFtXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgIGN0eC5tb3ZlVG8odGhpcy5BLngsdGhpcy5BLnkpO1xuICAgIGN0eC5saW5lVG8odGhpcy5CLngsdGhpcy5CLnkpO1xuICAgIGN0eC5saW5lVG8odGhpcy5DLngsdGhpcy5DLnkpO1xuICAgIGN0eC5saW5lVG8odGhpcy5ELngsdGhpcy5ELnkpO1xuICAgIGN0eC5saW5lVG8odGhpcy5BLngsdGhpcy5BLnkpO1xuICAgIGN0eC5zdHJva2UoKTtcbiAgICBjdHguZmlsbFN0eWxlPXJhbmRFbGVtKGNvbG9ycylcbiAgICBjdHguZmlsbCgpO1xuICAgIGN0eC5jbG9zZVBhdGgoKTtcblxuICAgIC8vIHBhcmFsbGVsIHNpZ25zIFxuICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICBwYXJhbGxlbFNpZ24oY3R4LHRoaXMuQix0aGlzLmh0MSw1KTtcbiAgICBwYXJhbGxlbFNpZ24oY3R4LHRoaXMuQSx0aGlzLmh0Miw1KTtcbiAgICBjdHguc3Ryb2tlKCk7XG4gICAgY3R4LmNsb3NlUGF0aCgpO1xuXG4gICAgLy8gZHJhdyBoZWlnaHRcbiAgICBpZiAodGhpcy5kYXRhLmhlaWdodC5zaG93KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICBhcnJvd0xpbmUoY3R4LCBQb2ludC5tZWFuKHRoaXMuaHQxLHRoaXMuaHQyKSx0aGlzLmh0MSwgOCk7XG4gICAgICBhcnJvd0xpbmUoY3R4LCBQb2ludC5tZWFuKHRoaXMuaHQxLHRoaXMuaHQyKSx0aGlzLmh0MiwgOCk7XG4gICAgICBjdHguc3Ryb2tlKCk7XG4gICAgICBjdHguY2xvc2VQYXRoKCk7XG5cbiAgICAgIC8vIFJBIHN5bWJvbFxuICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgY3R4LnNldExpbmVEYXNoKFtdKTtcbiAgICAgIGRyYXdSaWdodEFuZ2xlKGN0eCx0aGlzLmh0MSx0aGlzLmh0Mix0aGlzLkQsIDEyKTtcbiAgICAgIGN0eC5zdHJva2UoKTtcbiAgICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgICB9XG5cbiAgICAvLyByYSBzeW1ib2wgZm9yIHJpZ2h0IGFuZ2xlZCB0cmFwZXppYVxuICAgIGlmKHRoaXMuZGF0YS5oZWlnaHQudmFsID09PSB0aGlzLmRhdGEuc2lkZTIudmFsKSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIGRyYXdSaWdodEFuZ2xlKGN0eCwgdGhpcy5CLCB0aGlzLkMsIHRoaXMuRCwgMTIpXG4gICAgICBkcmF3UmlnaHRBbmdsZShjdHgsIHRoaXMuQywgdGhpcy5ELCB0aGlzLkEsIDEyKVxuICAgICAgY3R4LnN0cm9rZSgpXG4gICAgfVxuXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoKVxuICB9XG59IiwiaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCBUcmFwZXppdW1BcmVhRGF0YSBmcm9tICcuL1RyYXBleml1bUFyZWFEYXRhJ1xuaW1wb3J0IFRyYXBleml1bUFyZWFWaWV3IGZyb20gJy4vVHJhcGV6aXVtQXJlYVZpZXcnXG5pbXBvcnQgeyBRdWVzdGlvbk9wdGlvbnMgfSBmcm9tICcuL3R5cGVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUcmFwZXppdW1BcmVhUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YSE6IFRyYXBleml1bUFyZWFEYXRhIC8vIGluaXRpYWxpc2VkIGluIHN1cGVyKClcbiAgdmlldyE6IFRyYXBleml1bUFyZWFWaWV3XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogUmVxdWlyZWQ8UXVlc3Rpb25PcHRpb25zPiwgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgY29uc3QgZGF0YSA9IFRyYXBleml1bUFyZWFEYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBUcmFwZXppdW1BcmVhVmlldy5mcm9tRGF0YShkYXRhLHZpZXdPcHRpb25zKVxuICAgIHJldHVybiBuZXcgdGhpcyhkYXRhLCB2aWV3KVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlcydcbiAgfVxufSIsIi8qISAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG5Db3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi5cclxuXHJcblBlcm1pc3Npb24gdG8gdXNlLCBjb3B5LCBtb2RpZnksIGFuZC9vciBkaXN0cmlidXRlIHRoaXMgc29mdHdhcmUgZm9yIGFueVxyXG5wdXJwb3NlIHdpdGggb3Igd2l0aG91dCBmZWUgaXMgaGVyZWJ5IGdyYW50ZWQuXHJcblxyXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiIEFORCBUSEUgQVVUSE9SIERJU0NMQUlNUyBBTEwgV0FSUkFOVElFUyBXSVRIXHJcblJFR0FSRCBUTyBUSElTIFNPRlRXQVJFIElOQ0xVRElORyBBTEwgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWVxyXG5BTkQgRklUTkVTUy4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUiBCRSBMSUFCTEUgRk9SIEFOWSBTUEVDSUFMLCBESVJFQ1QsXHJcbklORElSRUNULCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVMgT1IgQU5ZIERBTUFHRVMgV0hBVFNPRVZFUiBSRVNVTFRJTkcgRlJPTVxyXG5MT1NTIE9GIFVTRSwgREFUQSBPUiBQUk9GSVRTLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgTkVHTElHRU5DRSBPUlxyXG5PVEhFUiBUT1JUSU9VUyBBQ1RJT04sIEFSSVNJTkcgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgVVNFIE9SXHJcblBFUkZPUk1BTkNFIE9GIFRISVMgU09GVFdBUkUuXHJcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXHJcbi8qIGdsb2JhbCBSZWZsZWN0LCBQcm9taXNlICovXHJcblxyXG52YXIgZXh0ZW5kU3RhdGljcyA9IGZ1bmN0aW9uKGQsIGIpIHtcclxuICAgIGV4dGVuZFN0YXRpY3MgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHxcclxuICAgICAgICAoeyBfX3Byb3RvX186IFtdIH0gaW5zdGFuY2VvZiBBcnJheSAmJiBmdW5jdGlvbiAoZCwgYikgeyBkLl9fcHJvdG9fXyA9IGI7IH0pIHx8XHJcbiAgICAgICAgZnVuY3Rpb24gKGQsIGIpIHsgZm9yICh2YXIgcCBpbiBiKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGIsIHApKSBkW3BdID0gYltwXTsgfTtcclxuICAgIHJldHVybiBleHRlbmRTdGF0aWNzKGQsIGIpO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXh0ZW5kcyhkLCBiKSB7XHJcbiAgICBleHRlbmRTdGF0aWNzKGQsIGIpO1xyXG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XHJcbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19hc3NpZ24gPSBmdW5jdGlvbigpIHtcclxuICAgIF9fYXNzaWduID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiBfX2Fzc2lnbih0KSB7XHJcbiAgICAgICAgZm9yICh2YXIgcywgaSA9IDEsIG4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XHJcbiAgICAgICAgICAgIHMgPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSkgdFtwXSA9IHNbcF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIF9fYXNzaWduLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3Jlc3QocywgZSkge1xyXG4gICAgdmFyIHQgPSB7fTtcclxuICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSAmJiBlLmluZGV4T2YocCkgPCAwKVxyXG4gICAgICAgIHRbcF0gPSBzW3BdO1xyXG4gICAgaWYgKHMgIT0gbnVsbCAmJiB0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9PT0gXCJmdW5jdGlvblwiKVxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBwID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhzKTsgaSA8IHAubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKGUuaW5kZXhPZihwW2ldKSA8IDAgJiYgT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZS5jYWxsKHMsIHBbaV0pKVxyXG4gICAgICAgICAgICAgICAgdFtwW2ldXSA9IHNbcFtpXV07XHJcbiAgICAgICAgfVxyXG4gICAgcmV0dXJuIHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2RlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19wYXJhbShwYXJhbUluZGV4LCBkZWNvcmF0b3IpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHsgZGVjb3JhdG9yKHRhcmdldCwga2V5LCBwYXJhbUluZGV4KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSkge1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0Lm1ldGFkYXRhID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiBSZWZsZWN0Lm1ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXRlcih0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcclxuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxyXG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XHJcbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2dlbmVyYXRvcih0aGlzQXJnLCBib2R5KSB7XHJcbiAgICB2YXIgXyA9IHsgbGFiZWw6IDAsIHNlbnQ6IGZ1bmN0aW9uKCkgeyBpZiAodFswXSAmIDEpIHRocm93IHRbMV07IHJldHVybiB0WzFdOyB9LCB0cnlzOiBbXSwgb3BzOiBbXSB9LCBmLCB5LCB0LCBnO1xyXG4gICAgcmV0dXJuIGcgPSB7IG5leHQ6IHZlcmIoMCksIFwidGhyb3dcIjogdmVyYigxKSwgXCJyZXR1cm5cIjogdmVyYigyKSB9LCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBzdGVwKFtuLCB2XSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAob3ApIHtcclxuICAgICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XHJcbiAgICAgICAgd2hpbGUgKF8pIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChmID0gMSwgeSAmJiAodCA9IG9wWzBdICYgMiA/IHlbXCJyZXR1cm5cIl0gOiBvcFswXSA/IHlbXCJ0aHJvd1wiXSB8fCAoKHQgPSB5W1wicmV0dXJuXCJdKSAmJiB0LmNhbGwoeSksIDApIDogeS5uZXh0KSAmJiAhKHQgPSB0LmNhbGwoeSwgb3BbMV0pKS5kb25lKSByZXR1cm4gdDtcclxuICAgICAgICAgICAgaWYgKHkgPSAwLCB0KSBvcCA9IFtvcFswXSAmIDIsIHQudmFsdWVdO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKG9wWzBdKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDA6IGNhc2UgMTogdCA9IG9wOyBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNDogXy5sYWJlbCsrOyByZXR1cm4geyB2YWx1ZTogb3BbMV0sIGRvbmU6IGZhbHNlIH07XHJcbiAgICAgICAgICAgICAgICBjYXNlIDU6IF8ubGFiZWwrKzsgeSA9IG9wWzFdOyBvcCA9IFswXTsgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDc6IG9wID0gXy5vcHMucG9wKCk7IF8udHJ5cy5wb3AoKTsgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghKHQgPSBfLnRyeXMsIHQgPSB0Lmxlbmd0aCA+IDAgJiYgdFt0Lmxlbmd0aCAtIDFdKSAmJiAob3BbMF0gPT09IDYgfHwgb3BbMF0gPT09IDIpKSB7IF8gPSAwOyBjb250aW51ZTsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gMyAmJiAoIXQgfHwgKG9wWzFdID4gdFswXSAmJiBvcFsxXSA8IHRbM10pKSkgeyBfLmxhYmVsID0gb3BbMV07IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSA2ICYmIF8ubGFiZWwgPCB0WzFdKSB7IF8ubGFiZWwgPSB0WzFdOyB0ID0gb3A7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHQgJiYgXy5sYWJlbCA8IHRbMl0pIHsgXy5sYWJlbCA9IHRbMl07IF8ub3BzLnB1c2gob3ApOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0WzJdKSBfLm9wcy5wb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG9wID0gYm9keS5jYWxsKHRoaXNBcmcsIF8pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHsgb3AgPSBbNiwgZV07IHkgPSAwOyB9IGZpbmFsbHkgeyBmID0gdCA9IDA7IH1cclxuICAgICAgICBpZiAob3BbMF0gJiA1KSB0aHJvdyBvcFsxXTsgcmV0dXJuIHsgdmFsdWU6IG9wWzBdID8gb3BbMV0gOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IHZhciBfX2NyZWF0ZUJpbmRpbmcgPSBPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XHJcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIGsyLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH0pO1xyXG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIG9bazJdID0gbVtrXTtcclxufSk7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHBvcnRTdGFyKG0sIG8pIHtcclxuICAgIGZvciAodmFyIHAgaW4gbSkgaWYgKHAgIT09IFwiZGVmYXVsdFwiICYmICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobywgcCkpIF9fY3JlYXRlQmluZGluZyhvLCBtLCBwKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fdmFsdWVzKG8pIHtcclxuICAgIHZhciBzID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIFN5bWJvbC5pdGVyYXRvciwgbSA9IHMgJiYgb1tzXSwgaSA9IDA7XHJcbiAgICBpZiAobSkgcmV0dXJuIG0uY2FsbChvKTtcclxuICAgIGlmIChvICYmIHR5cGVvZiBvLmxlbmd0aCA9PT0gXCJudW1iZXJcIikgcmV0dXJuIHtcclxuICAgICAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmIChvICYmIGkgPj0gby5sZW5ndGgpIG8gPSB2b2lkIDA7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiBvICYmIG9baSsrXSwgZG9uZTogIW8gfTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihzID8gXCJPYmplY3QgaXMgbm90IGl0ZXJhYmxlLlwiIDogXCJTeW1ib2wuaXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZWFkKG8sIG4pIHtcclxuICAgIHZhciBtID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9bU3ltYm9sLml0ZXJhdG9yXTtcclxuICAgIGlmICghbSkgcmV0dXJuIG87XHJcbiAgICB2YXIgaSA9IG0uY2FsbChvKSwgciwgYXIgPSBbXSwgZTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgd2hpbGUgKChuID09PSB2b2lkIDAgfHwgbi0tID4gMCkgJiYgIShyID0gaS5uZXh0KCkpLmRvbmUpIGFyLnB1c2goci52YWx1ZSk7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZXJyb3IpIHsgZSA9IHsgZXJyb3I6IGVycm9yIH07IH1cclxuICAgIGZpbmFsbHkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChyICYmICFyLmRvbmUgJiYgKG0gPSBpW1wicmV0dXJuXCJdKSkgbS5jYWxsKGkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmaW5hbGx5IHsgaWYgKGUpIHRocm93IGUuZXJyb3I7IH1cclxuICAgIH1cclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkKCkge1xyXG4gICAgZm9yICh2YXIgYXIgPSBbXSwgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspXHJcbiAgICAgICAgYXIgPSBhci5jb25jYXQoX19yZWFkKGFyZ3VtZW50c1tpXSkpO1xyXG4gICAgcmV0dXJuIGFyO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheXMoKSB7XHJcbiAgICBmb3IgKHZhciBzID0gMCwgaSA9IDAsIGlsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHMgKz0gYXJndW1lbnRzW2ldLmxlbmd0aDtcclxuICAgIGZvciAodmFyIHIgPSBBcnJheShzKSwgayA9IDAsIGkgPSAwOyBpIDwgaWw7IGkrKylcclxuICAgICAgICBmb3IgKHZhciBhID0gYXJndW1lbnRzW2ldLCBqID0gMCwgamwgPSBhLmxlbmd0aDsgaiA8IGpsOyBqKyssIGsrKylcclxuICAgICAgICAgICAgcltrXSA9IGFbal07XHJcbiAgICByZXR1cm4gcjtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0KHYpIHtcclxuICAgIHJldHVybiB0aGlzIGluc3RhbmNlb2YgX19hd2FpdCA/ICh0aGlzLnYgPSB2LCB0aGlzKSA6IG5ldyBfX2F3YWl0KHYpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY0dlbmVyYXRvcih0aGlzQXJnLCBfYXJndW1lbnRzLCBnZW5lcmF0b3IpIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgZyA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSwgaSwgcSA9IFtdO1xyXG4gICAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiKSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlmIChnW25dKSBpW25dID0gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChhLCBiKSB7IHEucHVzaChbbiwgdiwgYSwgYl0pID4gMSB8fCByZXN1bWUobiwgdik7IH0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiByZXN1bWUobiwgdikgeyB0cnkgeyBzdGVwKGdbbl0odikpOyB9IGNhdGNoIChlKSB7IHNldHRsZShxWzBdWzNdLCBlKTsgfSB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKHIpIHsgci52YWx1ZSBpbnN0YW5jZW9mIF9fYXdhaXQgPyBQcm9taXNlLnJlc29sdmUoci52YWx1ZS52KS50aGVuKGZ1bGZpbGwsIHJlamVjdCkgOiBzZXR0bGUocVswXVsyXSwgcik7IH1cclxuICAgIGZ1bmN0aW9uIGZ1bGZpbGwodmFsdWUpIHsgcmVzdW1lKFwibmV4dFwiLCB2YWx1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHJlamVjdCh2YWx1ZSkgeyByZXN1bWUoXCJ0aHJvd1wiLCB2YWx1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHNldHRsZShmLCB2KSB7IGlmIChmKHYpLCBxLnNoaWZ0KCksIHEubGVuZ3RoKSByZXN1bWUocVswXVswXSwgcVswXVsxXSk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNEZWxlZ2F0b3Iobykge1xyXG4gICAgdmFyIGksIHA7XHJcbiAgICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIsIGZ1bmN0aW9uIChlKSB7IHRocm93IGU7IH0pLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuLCBmKSB7IGlbbl0gPSBvW25dID8gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIChwID0gIXApID8geyB2YWx1ZTogX19hd2FpdChvW25dKHYpKSwgZG9uZTogbiA9PT0gXCJyZXR1cm5cIiB9IDogZiA/IGYodikgOiB2OyB9IDogZjsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY1ZhbHVlcyhvKSB7XHJcbiAgICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgdmFyIG0gPSBvW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSwgaTtcclxuICAgIHJldHVybiBtID8gbS5jYWxsKG8pIDogKG8gPSB0eXBlb2YgX192YWx1ZXMgPT09IFwiZnVuY3Rpb25cIiA/IF9fdmFsdWVzKG8pIDogb1tTeW1ib2wuaXRlcmF0b3JdKCksIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiKSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpKTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobikgeyBpW25dID0gb1tuXSAmJiBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkgeyB2ID0gb1tuXSh2KSwgc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgdi5kb25lLCB2LnZhbHVlKTsgfSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHNldHRsZShyZXNvbHZlLCByZWplY3QsIGQsIHYpIHsgUHJvbWlzZS5yZXNvbHZlKHYpLnRoZW4oZnVuY3Rpb24odikgeyByZXNvbHZlKHsgdmFsdWU6IHYsIGRvbmU6IGQgfSk7IH0sIHJlamVjdCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWFrZVRlbXBsYXRlT2JqZWN0KGNvb2tlZCwgcmF3KSB7XHJcbiAgICBpZiAoT2JqZWN0LmRlZmluZVByb3BlcnR5KSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjb29rZWQsIFwicmF3XCIsIHsgdmFsdWU6IHJhdyB9KTsgfSBlbHNlIHsgY29va2VkLnJhdyA9IHJhdzsgfVxyXG4gICAgcmV0dXJuIGNvb2tlZDtcclxufTtcclxuXHJcbnZhciBfX3NldE1vZHVsZURlZmF1bHQgPSBPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBcImRlZmF1bHRcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdiB9KTtcclxufSkgOiBmdW5jdGlvbihvLCB2KSB7XHJcbiAgICBvW1wiZGVmYXVsdFwiXSA9IHY7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnRTdGFyKG1vZCkge1xyXG4gICAgaWYgKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgcmV0dXJuIG1vZDtcclxuICAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayBpbiBtb2QpIGlmIChrICE9PSBcImRlZmF1bHRcIiAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobW9kLCBrKSkgX19jcmVhdGVCaW5kaW5nKHJlc3VsdCwgbW9kLCBrKTtcclxuICAgIF9fc2V0TW9kdWxlRGVmYXVsdChyZXN1bHQsIG1vZCk7XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnREZWZhdWx0KG1vZCkge1xyXG4gICAgcmV0dXJuIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpID8gbW9kIDogeyBkZWZhdWx0OiBtb2QgfTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRHZXQocmVjZWl2ZXIsIHByaXZhdGVNYXApIHtcclxuICAgIGlmICghcHJpdmF0ZU1hcC5oYXMocmVjZWl2ZXIpKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImF0dGVtcHRlZCB0byBnZXQgcHJpdmF0ZSBmaWVsZCBvbiBub24taW5zdGFuY2VcIik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcHJpdmF0ZU1hcC5nZXQocmVjZWl2ZXIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZFNldChyZWNlaXZlciwgcHJpdmF0ZU1hcCwgdmFsdWUpIHtcclxuICAgIGlmICghcHJpdmF0ZU1hcC5oYXMocmVjZWl2ZXIpKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImF0dGVtcHRlZCB0byBzZXQgcHJpdmF0ZSBmaWVsZCBvbiBub24taW5zdGFuY2VcIik7XHJcbiAgICB9XHJcbiAgICBwcml2YXRlTWFwLnNldChyZWNlaXZlciwgdmFsdWUpO1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG59XHJcbiIsImltcG9ydCB7IHJhbmRFbGVtLCByYW5kTXVsdEJldHdlZW4gfSBmcm9tICcuL3V0aWxpdGllcy5qcydcblxuY29uc3QgcGF0aFJvb3QgPSAnLidcblxudHlwZSBpbmRleFZhbHMgPSAnMTAwJyB8ICcyMDAnIHwgJzMwMCcgfCAnNDAwJyB8ICc1MDAnXG5cbmV4cG9ydCBpbnRlcmZhY2UgVHJpYW5nbGV7XG4gIGI6IG51bWJlcixcbiAgczE6IG51bWJlcixcbiAgczI6IG51bWJlcixcbiAgaDogbnVtYmVyXG59XG5cbmludGVyZmFjZSBkYXRhU291cmNlIHtcbiAgcmVhZG9ubHkgbGVuZ3RoOiBudW1iZXIsXG4gIHJlYWRvbmx5IHBhdGg6IHN0cmluZyxcbiAgc3RhdHVzOiAndW5jYWNoZWQnIHwgJ2NhY2hlZCcgfCAncGVuZGluZycsXG4gIGRhdGE6IFRyaWFuZ2xlW10sXG4gIHF1ZXVlOiB7XG4gICAgY2FsbGJhY2s6ICh0OiBUcmlhbmdsZSkgPT4gdm9pZCxcbiAgICBtYXhMZW5ndGg6IG51bWJlcixcbiAgICBmaWx0ZXI/OiAodDogVHJpYW5nbGUpID0+IGJvb2xlYW5cbiAgfVtdXG59XG5cblxuY29uc3QgZGF0YVNvdXJjZXMgOiBSZWNvcmQ8aW5kZXhWYWxzLCBkYXRhU291cmNlPiA9IHtcbiAgMTAwOiB7XG4gICAgbGVuZ3RoOiAzNjEsXG4gICAgcGF0aDogJy9kYXRhL3RyaWFuZ2xlczAtMTAwLmpzb24nLFxuICAgIHN0YXR1czogJ3VuY2FjaGVkJyxcbiAgICBkYXRhOiBbXSxcbiAgICBxdWV1ZTogW11cbiAgfSxcbiAgMjAwOiB7XG4gICAgbGVuZ3RoOiA3MTUsXG4gICAgcGF0aDogJy9kYXRhL3RyaWFuZ2xlczEwMC0yMDAuanNvbicsXG4gICAgc3RhdHVzOiAndW5jYWNoZWQnLFxuICAgIGRhdGE6IFtdLFxuICAgIHF1ZXVlOiBbXVxuICB9LFxuICAzMDA6IHtcbiAgICBsZW5ndGg6IDkyNyxcbiAgICBwYXRoOiAnL2RhdGEvdHJpYW5nbGVzMjAwLTMwMC5qc29uJyxcbiAgICBzdGF0dXM6ICd1bmNhY2hlZCcsXG4gICAgZGF0YTogW10sXG4gICAgcXVldWU6IFtdXG4gIH0sXG4gIDQwMDoge1xuICAgIGxlbmd0aDogMTA0MyxcbiAgICBwYXRoOiAnL2RhdGEvdHJpYW5nbGVzMzAwLTQwMC5qc29uJyxcbiAgICBzdGF0dXM6ICd1bmNhY2hlZCcsXG4gICAgZGF0YTogW10sXG4gICAgcXVldWU6IFtdXG4gIH0sXG4gIDUwMDoge1xuICAgIGxlbmd0aDogMTE1MSxcbiAgICBwYXRoOiAnL2RhdGEvdHJpYW5nbGVzNDAwLTUwMC5qc29uJyxcbiAgICBzdGF0dXM6ICd1bmNhY2hlZCcsXG4gICAgZGF0YTogW10sXG4gICAgcXVldWU6IFtdXG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm4gYSBwcm9taXNlIHRvIGEgcmFuZG9tbHkgY2hvc2VuIHRyaWFuZ2xlIChzZWUgdHJpYW5nbGVEYXRhLlRyaWFuZ2xlIGludGVyZmFjZSBmb3IgZm9ybWF0KVxuICogQHBhcmFtIG1heExlbmd0aCBNYXh1bXVtIGxlbmd0aCBvZiBzaWRlXG4gKiBAcGFyYW0gZmlsdGVyUHJlZGljYXRlIFJlc3RyaWN0IHRvIHRyaWFuZ2xlcyB3aXRoIHRoaXMgcHJvcGVydHlcbiAqL1xuZnVuY3Rpb24gZ2V0VHJpYW5nbGUgKG1heExlbmd0aDogbnVtYmVyLCBmaWx0ZXJQcmVkaWNhdGU/OiAodDogVHJpYW5nbGUpID0+IGJvb2xlYW4pIDogUHJvbWlzZTxUcmlhbmdsZT4ge1xuICBsZXQgdHJpYW5nbGU6IFRyaWFuZ2xlXG4gIGZpbHRlclByZWRpY2F0ZSA9IGZpbHRlclByZWRpY2F0ZSA/PyAodCA9PiB0cnVlKSAvLyBkZWZhdWx0IHZhbHVlIGZvciBwcmVkaWNhdGUgaXMgdGF1dG9sb2d5XG5cbiAgLy8gQ2hvb3NlIG11bHRpcGxlIG9mIDUwIHRvIHNlbGVjdCBmcm9tIC0gc21vb3RocyBvdXQgZGlzdHJpYnV0aW9uLlxuICAvLyAoT3RoZXJ3aXNlIGl0J3MgYmlhc2VkIHRvd2FyZHMgaGlnaGVyIGxlbmd0aHMpXG4gIGlmIChtYXhMZW5ndGggPiA1MDApIG1heExlbmd0aCA9IDUwMFxuICBjb25zdCBiaW41MCA9IHJhbmRNdWx0QmV0d2VlbigwLCBtYXhMZW5ndGggLSAxLCA1MCkgKyA1MCAvLyBlLmcuIGlmIGJpbjUwID0gMTUwLCBjaG9vc2Ugd2l0aCBhIG1heGxlbmd0aCBiZXR3ZWVuIDEwMCBhbmQgMTUwXG4gIGNvbnN0IGJpbjEwMCA9IChNYXRoLmNlaWwoYmluNTAgLyAxMDApICogMTAwKS50b1N0cmluZygpIGFzIGluZGV4VmFscyAvLyBlLmcuIGlmIGJpbjUwID0gMTUwLCBiaW4xMDAgPSBNYXRoLmNlaWwoMS41KSoxMDAgPSAyMDBcbiAgY29uc3QgZGF0YVNvdXJjZSA9IGRhdGFTb3VyY2VzW2JpbjEwMF1cblxuICBpZiAoZGF0YVNvdXJjZS5zdGF0dXMgPT09ICdjYWNoZWQnKSB7IC8vIENhY2hlZCAtIGp1c3QgbG9hZCBkYXRhXG4gICAgY29uc29sZS5sb2coJ1VzaW5nIGNhY2hlZCBkYXRhJylcbiAgICB0cmlhbmdsZSA9IHJhbmRFbGVtKGRhdGFTb3VyY2UuZGF0YS5maWx0ZXIodCA9PiBtYXhTaWRlKHQpIDwgbWF4TGVuZ3RoICYmIGZpbHRlclByZWRpY2F0ZSEodCkpKVxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodHJpYW5nbGUpXG4gIH1cblxuICBlbHNlIGlmIChkYXRhU291cmNlLnN0YXR1cyA9PT0gJ3BlbmRpbmcnKSB7IC8vIHBlbmRpbmcgLSBwdXQgY2FsbGJhY2sgaW50byBxdWV1ZVxuICAgIGNvbnNvbGUubG9nKCdQZW5kaW5nOiBhZGRpbmcgcmVxdWVzdCB0byBxdWV1ZScpXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCkgPT4ge1xuICAgICAgZGF0YVNvdXJjZS5xdWV1ZS5wdXNoKHtjYWxsYmFjazogcmVzb2x2ZSwgbWF4TGVuZ3RoOiBtYXhMZW5ndGgsIGZpbHRlcjogZmlsdGVyUHJlZGljYXRlfSlcbiAgICB9KVxuICB9XG4gIFxuICBlbHNlIHsgLy8gbm9ib2R5IGhhcyBsb2FkZWQgeWV0XG4gICAgY29uc29sZS5sb2coJ0xvYWRpbmcgZGF0YSB3aXRoIFhIUicpXG4gICAgZGF0YVNvdXJjZS5zdGF0dXMgPSAncGVuZGluZydcbiAgICByZXR1cm4gZmV0Y2goYCR7cGF0aFJvb3R9JHtkYXRhU291cmNlLnBhdGh9YCkudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChyZXNwb25zZS5zdGF0dXNUZXh0KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFRyaWFuZ2xlW10+XG4gICAgICB9XG4gICAgfSkudGhlbihkYXRhID0+IHtcbiAgICAgIGRhdGFTb3VyY2UuZGF0YSA9IGRhdGFcbiAgICAgIGRhdGFTb3VyY2Uuc3RhdHVzID0gJ2NhY2hlZCdcbiAgICAgIGRhdGFTb3VyY2UucXVldWUuZm9yRWFjaCggKHtjYWxsYmFjayxtYXhMZW5ndGgsIGZpbHRlcn0pID0+IHtcbiAgICAgICAgZmlsdGVyID0gZmlsdGVyID8/ICh0PT50cnVlKVxuICAgICAgICBjb25zdCB0cmlhbmdsZSA9IHJhbmRFbGVtKGRhdGEuZmlsdGVyKCh0OiBUcmlhbmdsZSkgPT4gbWF4U2lkZSh0KSA8IG1heExlbmd0aCAmJiBmaWx0ZXIhKHQpKSlcbiAgICAgICAgY29uc29sZS5sb2coJ2xvYWRpbmcgZnJvbSBxdWV1ZScpXG4gICAgICAgIGNhbGxiYWNrKHRyaWFuZ2xlKVxuICAgICAgfSlcbiAgICAgIHRyaWFuZ2xlID0gcmFuZEVsZW0oZGF0YS5maWx0ZXIoKHQ6IFRyaWFuZ2xlKSA9PiBtYXhTaWRlKHQpIDwgbWF4TGVuZ3RoICYmIGZpbHRlclByZWRpY2F0ZSEodCkpKVxuICAgICAgcmV0dXJuIHRyaWFuZ2xlXG4gICAgfSlcbiAgfSBcbn1cblxuZnVuY3Rpb24gbWF4U2lkZSAodHJpYW5nbGU6IFRyaWFuZ2xlKSB7XG4gIHJldHVybiBNYXRoLm1heCh0cmlhbmdsZS5iLCB0cmlhbmdsZS5zMSwgdHJpYW5nbGUuczIpXG59XG5cbmV4cG9ydCB7IGdldFRyaWFuZ2xlLCBkYXRhU291cmNlcyB9XG4iLCJpbXBvcnQgeyByYW5kQmV0d2VlbiwgcmFuZEVsZW0sIHNjYWxlZFN0ciB9IGZyb20gJ3V0aWxpdGllcy5qcycgLy8gY2hhbmdlIHJlbGF0aXZlIHBhdGggYWZ0ZXIgdGVzdGluZ1xuaW1wb3J0IHsgVmFsdWUgfSBmcm9tICcuL1JlY3RhbmdsZUFyZWFEYXRhJ1xuaW1wb3J0IHsgUXVlc3Rpb25PcHRpb25zIH0gZnJvbSAnLi90eXBlcydcbmltcG9ydCAqIGFzIFREIGZyb20gJ3RyaWFuZ2xlRGF0YS1xdWV1ZSdcbmltcG9ydCBmcmFjdGlvbiBmcm9tICdmcmFjdGlvbi5qcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVHJpYW5nbGVBcmVhRGF0YSB7XG4gIHJlYWRvbmx5IGJhc2U6IFZhbHVlXG4gIHJlYWRvbmx5IHNpZGUxOiBWYWx1ZVxuICByZWFkb25seSBzaWRlMjogVmFsdWVcbiAgcmVhZG9ubHkgaGVpZ2h0OiBWYWx1ZVxuICBwcml2YXRlIHJlYWRvbmx5IGRwOiBudW1iZXJcbiAgcHJpdmF0ZSByZWFkb25seSBkZW5vbWluYXRvcjogbnVtYmVyID0gMVxuICBwcml2YXRlIF9hcmVhPzogUGFydGlhbDxWYWx1ZT5cbiAgcHJpdmF0ZSBfcGVyaW1ldGVyPzogUGFydGlhbDxWYWx1ZT5cblxuICBjb25zdHJ1Y3RvciAoXG4gICAgYmFzZTogVmFsdWUsXG4gICAgc2lkZTE6IFZhbHVlLFxuICAgIHNpZGUyOiBWYWx1ZSxcbiAgICBoZWlnaHQ6IFZhbHVlLFxuICAgIGRwOiBudW1iZXIsXG4gICAgZGVub21pbmF0b3I6IG51bWJlcixcbiAgICBhcmVhUHJvcGVydGllcz86IE9taXQ8VmFsdWUsICd2YWwnPixcbiAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzPzogT21pdDxWYWx1ZSwgJ3ZhbCc+KSB7XG4gICAgdGhpcy5iYXNlID0gYmFzZVxuICAgIHRoaXMuc2lkZTEgPSBzaWRlMVxuICAgIHRoaXMuc2lkZTIgPSBzaWRlMlxuICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0XG4gICAgdGhpcy5kcCA9IGRwXG4gICAgdGhpcy5kZW5vbWluYXRvciA9IGRlbm9taW5hdG9yXG4gICAgdGhpcy5fYXJlYSA9IGFyZWFQcm9wZXJ0aWVzXG4gICAgdGhpcy5fcGVyaW1ldGVyID0gcGVyaW1ldGVyUHJvcGVydGllc1xuICB9XG5cbiAgZ2V0IHBlcmltZXRlciAoKTogVmFsdWUge1xuICAgIGlmICghdGhpcy5fcGVyaW1ldGVyKSB7IC8vIGRlZmF1bHRzIGZvciBwcm9wZXJ0aWVzXG4gICAgICB0aGlzLl9wZXJpbWV0ZXIgPSB7XG4gICAgICAgIHNob3c6IGZhbHNlLFxuICAgICAgICBtaXNzaW5nOiB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5fcGVyaW1ldGVyLnZhbCkge1xuICAgICAgdGhpcy5fcGVyaW1ldGVyLnZhbCA9IHRoaXMuYmFzZS52YWwgKyB0aGlzLnNpZGUxLnZhbCArIHRoaXMuc2lkZTIudmFsXG4gICAgICBpZiAodGhpcy5kZW5vbWluYXRvciA+IDEpIHtcbiAgICAgICAgdGhpcy5fcGVyaW1ldGVyLmxhYmVsID0gbmV3IGZyYWN0aW9uKHRoaXMuX3BlcmltZXRlci52YWwsIHRoaXMuZGVub21pbmF0b3IpLnRvTGF0ZXgodHJ1ZSkgKyAnXFxcXG1hdGhybXtjbX0nXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9wZXJpbWV0ZXIubGFiZWwgPSBzY2FsZWRTdHIodGhpcy5fcGVyaW1ldGVyLnZhbCwgdGhpcy5kcCkgKyAnXFxcXG1hdGhybXtjbX0nXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3BlcmltZXRlciBhcyBWYWx1ZVxuICB9XG5cbiAgZ2V0IGFyZWEgKCk6IFZhbHVlIHtcbiAgICBpZiAoIXRoaXMuX2FyZWEpIHtcbiAgICAgIHRoaXMuX2FyZWEgPSB7XG4gICAgICAgIHNob3c6IGZhbHNlLFxuICAgICAgICBtaXNzaW5nOiB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5fYXJlYS52YWwpIHtcbiAgICAgIHRoaXMuX2FyZWEudmFsID0gdGhpcy5iYXNlLnZhbCAqIHRoaXMuaGVpZ2h0LnZhbCAvIDJcbiAgICAgIGlmICh0aGlzLmRlbm9taW5hdG9yID4gMSkge1xuICAgICAgICB0aGlzLl9hcmVhLmxhYmVsID0gbmV3IGZyYWN0aW9uKHRoaXMuX2FyZWEudmFsLCB0aGlzLmRlbm9taW5hdG9yKioyKS50b0xhdGV4KHRydWUpICsgJ1xcXFxtYXRocm17Y219XjInXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9hcmVhLmxhYmVsID0gc2NhbGVkU3RyKHRoaXMuX2FyZWEudmFsLCAyICogdGhpcy5kcCkgKyAnXFxcXG1hdGhybXtjbX1eMidcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2FyZWEgYXMgVmFsdWVcbiAgfVxuXG4gIGlzUmlnaHRBbmdsZWQgKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHRyaWFuZ2xlOiBURC5UcmlhbmdsZSA9IHtcbiAgICAgIGI6IHRoaXMuYmFzZS52YWwsXG4gICAgICBoOiB0aGlzLmhlaWdodC52YWwsXG4gICAgICBzMTogdGhpcy5zaWRlMS52YWwsXG4gICAgICBzMjogdGhpcy5zaWRlMi52YWxcbiAgICB9XG4gICAgcmV0dXJuIGlzUmlnaHRBbmdsZWQodHJpYW5nbGUpXG4gIH1cblxuICBzdGF0aWMgYXN5bmMgcmFuZG9tIChvcHRpb25zOiBRdWVzdGlvbk9wdGlvbnMpOiBQcm9taXNlPFRyaWFuZ2xlQXJlYURhdGE+IHtcbiAgICBvcHRpb25zLm1heExlbmd0aCA9IG9wdGlvbnMubWF4TGVuZ3RoIHx8IDIwXG4gICAgY29uc3QgZHAgPSBvcHRpb25zLmRwIHx8IDBcbiAgICBjb25zdCBkZW5vbWluYXRvciA9IG9wdGlvbnMuZnJhY3Rpb24/IHJhbmRCZXR3ZWVuKDIsNikgOiAxXG4gICAgY29uc3QgcmVxdWlyZUlzb3NjZWxlcyA9IChvcHRpb25zLnF1ZXN0aW9uVHlwZSA9PT0gJ3B5dGhhZ29yYXNJc29zY2VsZXNBcmVhJylcbiAgICBjb25zdCByZXF1aXJlUmlnaHRBbmdsZSA9IChvcHRpb25zLnF1ZXN0aW9uVHlwZSA9PT0gJ3B5dGhhZ29yYXNBcmVhJyB8fCBvcHRpb25zLnF1ZXN0aW9uVHlwZSA9PT0gJ3B5dGhhZ29yYXNQZXJpbWV0ZXInKVxuXG4gICAgLy8gZ2V0IGEgdHJpYW5nbGUuIFRELmdldFRyaWFuZ2xlIGlzIGFzeW5jLCBzbyBuZWVkIHRvIGF3YWl0XG4gICAgY29uc3QgdHJpYW5nbGU6IFRELlRyaWFuZ2xlID1cbiAgICAgIGF3YWl0IFRELmdldFRyaWFuZ2xlKG9wdGlvbnMubWF4TGVuZ3RoLCB0ID0+XG4gICAgICAgICghcmVxdWlyZUlzb3NjZWxlcyB8fCBpc0lzb3NjZWxlcyh0KSkgJiZcbiAgICAgICAgICAoIXJlcXVpcmVSaWdodEFuZ2xlIHx8IGlzUmlnaHRBbmdsZWQodCkpXG4gICAgICApXG5cbiAgICAvLyB1c2VmdWwgZm9yIHNvbWUgbG9naWMgbmV4dFxuICAgIC8vIG5iIG9ubHkgcmVmZXJzIHRvIFJBIHRyaWFuZ2xlcyB3aGVyIHRoZSBoeXBvdGVudXNlIGlzIG5vdCB0aGUgJ2Jhc2UnXG4gICAgY29uc3QgcmlnaHRBbmdsZWQgPSBpc1JpZ2h0QW5nbGVkKHRyaWFuZ2xlKVxuXG4gICAgY29uc3QgYmFzZSA6IFZhbHVlID0geyB2YWw6IHRyaWFuZ2xlLmIsIHNob3c6IHRydWUsIG1pc3Npbmc6IGZhbHNlIH1cbiAgICBjb25zdCBoZWlnaHQgOiBWYWx1ZSA9IHsgdmFsOiB0cmlhbmdsZS5oLCBzaG93OiAhcmlnaHRBbmdsZWQsIG1pc3Npbmc6IGZhbHNlIH0gLy8gaGlkZSBoZWlnaHQgaW4gUkEgdHJpYW5nbGVzXG4gICAgY29uc3Qgc2lkZTEgOiBWYWx1ZSA9IHsgdmFsOiB0cmlhbmdsZS5zMSwgc2hvdzogdHJ1ZSwgbWlzc2luZzogZmFsc2UgfVxuICAgIGNvbnN0IHNpZGUyIDogVmFsdWUgPSB7IHZhbDogdHJpYW5nbGUuczIsIHNob3c6IHRydWUsIG1pc3Npbmc6IGZhbHNlIH07XG4gICAgW2Jhc2UsIGhlaWdodCwgc2lkZTEsIHNpZGUyXS5mb3JFYWNoKHYgPT4ge1xuICAgICAgaWYgKGRlbm9taW5hdG9yID09PSAxKSB7XG4gICAgICAgIHYubGFiZWwgPSBzY2FsZWRTdHIodi52YWwsIGRwKSArICdcXFxcbWF0aHJte2NtfSdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHYubGFiZWwgPSBuZXcgZnJhY3Rpb24odi52YWwsZGVub21pbmF0b3IpLnRvTGF0ZXgodHJ1ZSkgKyBcIlxcXFxtYXRocm17Y219XCJcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gU29tZSBhbGlhc2VzIHVzZWZ1bCB3aGVuIHJlYXNvbmluZyBhYm91dCBSQSB0cmlhbmdsZXNcbiAgICAvLyBOQiAoYSkgdGhlc2UgYXJlIHJlZnMgdG8gc2FtZSBvYmplY3QsIG5vdCBjb3BpZXNcbiAgICAvLyAoYikgbm90IHZlcnkgbWVhbmluZ2Z1bCBmb3Igbm9uIFJBIHRyaWFuZ2xlc1xuICAgIGNvbnN0IGxlZzEgPSBiYXNlXG4gICAgY29uc3QgbGVnMiA9IChzaWRlMS52YWwgPiBzaWRlMi52YWwpID8gc2lkZTIgOiBzaWRlMVxuICAgIGNvbnN0IGh5cG90ZW51c2UgPSAoc2lkZTEudmFsID4gc2lkZTIudmFsKSA/IHNpZGUxIDogc2lkZTJcblxuICAgIGNvbnN0IGFyZWFQcm9wZXJ0aWVzID0geyBzaG93OiBmYWxzZSwgbWlzc2luZzogdHJ1ZSB9XG4gICAgY29uc3QgcGVyaW1ldGVyUHJvcGVydGllcyA9IHsgc2hvdzogZmFsc2UsIG1pc3Npbmc6IHRydWUgfVxuXG4gICAgLy8gc2hvdy9oaWRlIGJhc2VkIG9uIHR5cGVcbiAgICBzd2l0Y2ggKG9wdGlvbnMucXVlc3Rpb25UeXBlKSB7XG4gICAgICBjYXNlICdhcmVhJzpcbiAgICAgICAgYXJlYVByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgYXJlYVByb3BlcnRpZXMubWlzc2luZyA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3BlcmltZXRlcic6XG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAncmV2ZXJzZUFyZWEnOiB7XG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLm1pc3NpbmcgPSBmYWxzZVxuICAgICAgICBjb25zdCBjb2luVG9zcyA9IChNYXRoLnJhbmRvbSgpIDwgMC41KSAvLyA1MC81MCB0cnVlL2ZhbHNlXG4gICAgICAgIGlmIChyaWdodEFuZ2xlZCkgeyAvLyBoaWRlIG9uZSBvZiB0aGUgbGVnc1xuICAgICAgICAgIGlmIChjb2luVG9zcykgbGVnMS5taXNzaW5nID0gdHJ1ZVxuICAgICAgICAgIGVsc2UgbGVnMi5taXNzaW5nID0gdHJ1ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChjb2luVG9zcykgYmFzZS5taXNzaW5nID0gdHJ1ZVxuICAgICAgICAgIGVsc2UgaGVpZ2h0Lm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3JldmVyc2VQZXJpbWV0ZXInOiB7XG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nID0gZmFsc2VcbiAgICAgICAgcmFuZEVsZW0oW2Jhc2UsIHNpZGUxLCBzaWRlMl0pLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdweXRoYWdvcmFzQXJlYSc6XG4gICAgICAgIGlmICghcmlnaHRBbmdsZWQpIHRocm93IG5ldyBFcnJvcignU2hvdWxkIGhhdmUgUkEgdHJpYW5nbGUgaGVyZScpXG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIHJhbmRFbGVtKFtsZWcxLCBsZWcyXSkuc2hvdyA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdweXRoYWdvcmFzUGVyaW1ldGVyJzogeyAvLyBzaG91bGQgYWxyZWFkeSBoYXZlIFJBIHRyaWFuZ2xlXG4gICAgICAgIGlmICghcmlnaHRBbmdsZWQpIHRocm93IG5ldyBFcnJvcignU2hvdWxkIGhhdmUgUkEgdHJpYW5nbGUgaGVyZScpXG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nID0gdHJ1ZVxuICAgICAgICByYW5kRWxlbShbbGVnMSwgbGVnMiwgaHlwb3RlbnVzZV0pLnNob3cgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAncHl0aGFnb3Jhc0lzb3NjZWxlc0FyZWEnOlxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYXJlYVByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgYXJlYVByb3BlcnRpZXMubWlzc2luZyA9IHRydWVcbiAgICAgICAgaGVpZ2h0LnNob3cgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFRyaWFuZ2xlQXJlYURhdGEoYmFzZSwgc2lkZTEsIHNpZGUyLCBoZWlnaHQsIGRwLCBkZW5vbWluYXRvciwgYXJlYVByb3BlcnRpZXMsIHBlcmltZXRlclByb3BlcnRpZXMpXG4gIH1cbn1cblxuZnVuY3Rpb24gaXNJc29zY2VsZXMgKHRyaWFuZ2xlOiBURC5UcmlhbmdsZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gdHJpYW5nbGUuczEgPT09IHRyaWFuZ2xlLnMyXG59XG5cbmZ1bmN0aW9uIGlzUmlnaHRBbmdsZWQgKHRyaWFuZ2xlOiBURC5UcmlhbmdsZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gdHJpYW5nbGUuczEgPT09IHRyaWFuZ2xlLmggfHwgdHJpYW5nbGUuczIgPT09IHRyaWFuZ2xlLmhcbn1cbiIsImltcG9ydCB7IGFycm93TGluZSwgZHJhd1JpZ2h0QW5nbGUgfSBmcm9tICdkcmF3aW5nJ1xuaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgY3JlYXRlRWxlbSwgcmFuZEVsZW0sIHJlcGVsRWxlbWVudHMgfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUVZpZXcsIExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuL3R5cGVzJ1xuaW1wb3J0IHsgVmFsdWUgfSBmcm9tICcuL1JlY3RhbmdsZUFyZWFEYXRhJ1xuaW1wb3J0IFRyaWFuZ2xlQXJlYURhdGEgZnJvbSAnLi9UcmlhbmdsZUFyZWFEYXRhJ1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRyaWFuZ2xlQXJlYVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICBBPzogUG9pbnQgLy8gR2VuZXJhdGVkIGxhemlseSBvbiByZW5kZXJcbiAgQj86IFBvaW50XG4gIEM/OiBQb2ludFxuICBodD86IFBvaW50IC8vIGludGVyc2VjdGlvbiBvZiBoZWlnaHQgd2l0aCBiYXNlXG4gIG92ZXJoYW5nTGVmdD86IGJvb2xlYW5cbiAgb3ZlcmhhbmdSaWdodD86IGJvb2xlYW5cbiAgZGF0YSE6IFRyaWFuZ2xlQXJlYURhdGEgfCBQcm9taXNlPFRyaWFuZ2xlQXJlYURhdGE+XG4gIC8vIGxhYmVsczogTGFiZWxbXVxuICAvLyByb3RhdGlvbj86IG51bWJlclxuICBjb25zdHJ1Y3RvciAoZGF0YTogVHJpYW5nbGVBcmVhRGF0YSB8IFByb21pc2U8VHJpYW5nbGVBcmVhRGF0YT4sIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucywgQT86IFBvaW50LCBCPzogUG9pbnQsIEM/OlBvaW50LCBsYWJlbHM/OiBMYWJlbFtdKSB7XG4gICAgc3VwZXIoZGF0YSwgdmlld09wdGlvbnMpXG4gICAgdGhpcy5BID0gQVxuICAgIHRoaXMuQiA9IEJcbiAgICB0aGlzLkMgPSBDXG4gICAgdGhpcy5sYWJlbHMgPSBsYWJlbHMgPz8gW11cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW5kZXIgaW50byB0aGlzLmNhbnZhc1xuICAgKi9cbiAgYXN5bmMgcmVuZGVyICgpIHtcbiAgICAvLyBjcmVhdGUgbG9hZGluZyBpbWFnZVxuICAgIGNvbnN0IGxvYWRlciA9IGNyZWF0ZUVsZW0oJ2RpdicsICdsb2FkZXInLCB0aGlzLkRPTSlcbiAgICAvLyBmaXJzdCBpbml0IGlmIG5vdCBhbHJlYWR5XG4gICAgaWYgKHRoaXMuQSA9PT0gdW5kZWZpbmVkKSBhd2FpdCB0aGlzLmluaXQoKVxuXG4gICAgaWYgKCF0aGlzLkEgfHwgIXRoaXMuQiB8fCAhdGhpcy5DIHx8ICF0aGlzLmh0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludGlhbGlzYXRpb24gZmFpbGVkLiBQb2ludHMgYXJlOiAke1t0aGlzLkEsIHRoaXMuQiwgdGhpcy5DLCB0aGlzLmh0XX1gKVxuICAgIH1cbiAgICBpZiAodGhpcy5kYXRhIGluc3RhbmNlb2YgUHJvbWlzZSkgdGhyb3cgbmV3IEVycm9yKCdJbml0aWFsaXNhdGlvbiBmYWlsZWQ6IGRhdGEgaXMgc3RpbGwgYSBQcm9taXNlJylcblxuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICBpZiAoY3R4ID09PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBnZXQgY2FudmFzIGNvbnRleHQnKVxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcbiAgICBjdHguc2V0TGluZURhc2goW10pXG4gICAgLy8gZHJhdyB0cmlhbmdsZVxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGN0eC5tb3ZlVG8odGhpcy5BLngsIHRoaXMuQS55KVxuICAgIGN0eC5saW5lVG8odGhpcy5CLngsIHRoaXMuQi55KVxuICAgIGN0eC5saW5lVG8odGhpcy5DLngsIHRoaXMuQy55KVxuICAgIGN0eC5saW5lVG8odGhpcy5BLngsIHRoaXMuQS55KVxuICAgIGN0eC5zdHJva2UoKVxuICAgIGN0eC5maWxsU3R5bGUgPSByYW5kRWxlbShjb2xvcnMpXG4gICAgY3R4LmZpbGwoKVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgLy8gZHJhdyBoZWlnaHRcbiAgICBpZiAodGhpcy5kYXRhLmhlaWdodC5zaG93KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIC8vIGFycm93TGluZShjdHgsdGhpcy5DLHRoaXMuaHQsMTApO1xuICAgICAgYXJyb3dMaW5lKGN0eCxcbiAgICAgICAgUG9pbnQubWVhbih0aGlzLkMsIHRoaXMuaHQpLm1vdmVUb3dhcmQodGhpcy5DLCAxNSksXG4gICAgICAgIHRoaXMuQywgMTBcbiAgICAgIClcbiAgICAgIGFycm93TGluZShjdHgsXG4gICAgICAgIFBvaW50Lm1lYW4odGhpcy5DLCB0aGlzLmh0KS5tb3ZlVG93YXJkKHRoaXMuaHQsIDE1KSxcbiAgICAgICAgdGhpcy5odCwgMTBcbiAgICAgIClcbiAgICAgIGN0eC5zdHJva2UoKVxuICAgICAgY3R4LmNsb3NlUGF0aCgpXG4gICAgfVxuXG4gICAgLy8gcmlnaHQtYW5nbGUgc3ltYm9sXG4gICAgaWYgKHRoaXMuZGF0YS5pc1JpZ2h0QW5nbGVkKCkgfHwgdGhpcy5kYXRhLmhlaWdodC5zaG93KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIGlmICh0aGlzLkEuZXF1YWxzKHRoaXMuaHQpKSB7XG4gICAgICAgIGRyYXdSaWdodEFuZ2xlKGN0eCwgdGhpcy5CLCB0aGlzLmh0LCB0aGlzLkMsIDE1KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZHJhd1JpZ2h0QW5nbGUoY3R4LCB0aGlzLkEsIHRoaXMuaHQsIHRoaXMuQywgMTUpXG4gICAgICB9XG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIGN0eC5jbG9zZVBhdGgoKVxuICAgIH1cblxuICAgIGlmICh0aGlzLmRhdGEuaGVpZ2h0LnNob3cgJiYgdGhpcy5vdmVyaGFuZ1JpZ2h0KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIGN0eC5zZXRMaW5lRGFzaChbNSwgM10pXG4gICAgICBjdHgubW92ZVRvKHRoaXMuQi54LCB0aGlzLkIueSlcbiAgICAgIGN0eC5saW5lVG8odGhpcy5odC54LCB0aGlzLmh0LnkpXG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIGN0eC5jbG9zZVBhdGgoKVxuICAgIH1cbiAgICBpZiAodGhpcy5kYXRhLmhlaWdodC5zaG93ICYmIHRoaXMub3ZlcmhhbmdMZWZ0KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIGN0eC5zZXRMaW5lRGFzaChbNSwgM10pXG4gICAgICBjdHgubW92ZVRvKHRoaXMuQS54LCB0aGlzLkEueSlcbiAgICAgIGN0eC5saW5lVG8odGhpcy5odC54LCB0aGlzLmh0LnkpXG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIGN0eC5jbG9zZVBhdGgoKVxuICAgIH1cblxuICAgIHRoaXMucmVuZGVyTGFiZWxzKGZhbHNlLHRydWUpXG4gICAgbG9hZGVyLnJlbW92ZSgpXG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGlzZS4gSW5zdGFuY2UgbWV0aG9kIHJhdGhlciB0aGFuIHN0YXRpYyBmYWN0b3J5IG1ldGhvZCwgc28gaW5zdGFuY2UgY2FuIGNvbnRyb2wsIGUuZy4gbG9hZGluZyBpY29uXG4gICAqIGFzeW5jIHNpbmNlIGRhdGEgaXMgYSBwcm9taXNlXG4gICAqL1xuICBhc3luYyBpbml0ICgpIDogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5kYXRhID0gYXdhaXQgdGhpcy5kYXRhXG4gICAgY29uc3QgaCA9IHRoaXMuZGF0YS5oZWlnaHQudmFsXG4gICAgY29uc3QgYiA9IHRoaXMuZGF0YS5iYXNlLnZhbFxuICAgIGNvbnN0IHMxID0gdGhpcy5kYXRhLnNpZGUxLnZhbFxuICAgIGNvbnN0IHMyID0gdGhpcy5kYXRhLnNpZGUyLnZhbFxuXG4gICAgLy8gYnVpbGQgdXBzaWRlIGRvd25cbiAgICB0aGlzLkEgPSBuZXcgUG9pbnQoMCwgaClcbiAgICB0aGlzLkIgPSBuZXcgUG9pbnQoYiwgaClcbiAgICB0aGlzLkMgPSBuZXcgUG9pbnQoKGIgKiBiICsgczEgKiBzMSAtIHMyICogczIpIC8gKDIgKiBiKSwgMClcbiAgICB0aGlzLmh0ID0gbmV3IFBvaW50KHRoaXMuQy54LCB0aGlzLkEueSlcblxuICAgIHRoaXMub3ZlcmhhbmdSaWdodCA9IGZhbHNlXG4gICAgdGhpcy5vdmVyaGFuZ0xlZnQgPSBmYWxzZVxuICAgIGlmICh0aGlzLkMueCA+IHRoaXMuQi54KSB7IHRoaXMub3ZlcmhhbmdSaWdodCA9IHRydWUgfVxuICAgIGlmICh0aGlzLkMueCA8IHRoaXMuQS54KSB7IHRoaXMub3ZlcmhhbmdMZWZ0ID0gdHJ1ZSB9XG5cbiAgICAvLyByb3RhdGUsIHNjYWxlIGFuZCBjZW50ZXJcbiAgICB0aGlzLnJvdGF0aW9uID0gdGhpcy5yb3RhdGlvbiA/PyAyICogTWF0aC5QSSAqIE1hdGgucmFuZG9tKClcbiAgICA7W3RoaXMuQSwgdGhpcy5CLCB0aGlzLkMsIHRoaXMuaHRdLmZvckVhY2gocHQgPT4gcHQucm90YXRlKHRoaXMucm90YXRpb24hKSlcbiAgICBQb2ludC5zY2FsZVRvRml0KFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DLCB0aGlzLmh0XSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQsIDEwMCwgWzAsMjBdKVxuXG4gICAgLy8gTWFraW5nIGxhYmVscyAtIG1vcmUgaW52b2x2ZWQgdGhhbiBJIHJlbWVtYmVyZWQhXG4gICAgLy8gRmlyc3QgdGhlIGxhYmVscyBmb3IgdGhlIHNpZGVzXG4gICAgY29uc3Qgc2lkZXMgOiBbUG9pbnQsIFBvaW50LCBWYWx1ZV1bXSA9IFsgLy8gWzFzdCBwb2ludCwgMm5kIHBvaW50LCBkYXRhXVxuICAgICAgW3RoaXMuQSwgdGhpcy5CLCB0aGlzLmRhdGEuYmFzZV0sXG4gICAgICBbdGhpcy5DLCB0aGlzLkEsIHRoaXMuZGF0YS5zaWRlMV0sXG4gICAgICBbdGhpcy5CLCB0aGlzLkMsIHRoaXMuZGF0YS5zaWRlMl1cbiAgICBdXG5cbiAgICAvLyBvcmRlciBvZiBwdXR0aW5nIGluIGhlaWdodCBtYXR0ZXJzIGZvciBvZmZzZXRcbiAgICAvLyBUaGlzIGJyZWFrcyBpZiB3ZSBoYXZlIHJvdW5kaW5nIGVycm9yc1xuICAgIGlmICh0aGlzLmh0LmVxdWFscyh0aGlzLkIpKSB7IC8vXG4gICAgICBzaWRlcy5wdXNoKFt0aGlzLmh0LCB0aGlzLkMsIHRoaXMuZGF0YS5oZWlnaHRdKVxuICAgIH0gZWxzZSB7XG4gICAgICBzaWRlcy5wdXNoKFt0aGlzLkMsIHRoaXMuaHQsIHRoaXMuZGF0YS5oZWlnaHRdKVxuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgaSsrKSB7IC8vIHNpZGVzXG4gICAgICBpZiAoIXNpZGVzW2ldWzJdLnNob3cpIGNvbnRpbnVlXG4gICAgICBjb25zdCBvZmZzZXQgPSAyMCAvLyBvZmZzZXQgZnJvbSBsaW5lIGJ5IHRoaXMgbWFueSBwaXhlbHNcbiAgICAgIGNvbnN0IHBvcyA9IFBvaW50Lm1lYW4oc2lkZXNbaV1bMF0sIHNpZGVzW2ldWzFdKSAvLyBzdGFydCBhdCBtaWRwb2ludFxuICAgICAgY29uc3QgdW5pdHZlYyA9IFBvaW50LnVuaXRWZWN0b3Ioc2lkZXNbaV1bMF0sIHNpZGVzW2ldWzFdKVxuXG4gICAgICBpZiAoaSA8IDMgKSB7IHBvcy50cmFuc2xhdGUoLXVuaXR2ZWMueSAqIG9mZnNldCwgdW5pdHZlYy54ICogb2Zmc2V0KSB9XG5cbiAgICAgIGNvbnN0IHRleHRhIDogc3RyaW5nID0gc2lkZXNbaV1bMl0ubGFiZWwgPz8gc2lkZXNbaV1bMl0udmFsLnRvU3RyaW5nKClcbiAgICAgIGNvbnN0IHRleHRxID0gc2lkZXNbaV1bMl0ubWlzc2luZyA/ICc/JyA6IHRleHRhXG4gICAgICBjb25zdCBzdHlsZXEgPSBpPT09MyA/ICdub3JtYWwgcmVwZWwtbG9ja2VkJyA6ICdub3JtYWwnXG4gICAgICBjb25zdCBzdHlsZWEgPSBzaWRlc1tpXVsyXS5taXNzaW5nID9cbiAgICAgICAgICAgICAgICAgICAgICAoaT09PTMgPyAnYW5zd2VyIHJlcGVsLWxvY2tlZCcgOiAnYW5zd2VyJykgOlxuICAgICAgICAgICAgICAgICAgICAgIChpPT09MyA/ICdub3JtYWwgcmVwZWwtbG9ja2VkJyA6ICdub3JtYWwnKVxuXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKHtcbiAgICAgICAgcG9zOiBwb3MsXG4gICAgICAgIHRleHRhOiB0ZXh0YSxcbiAgICAgICAgdGV4dHE6IHRleHRxLFxuICAgICAgICB0ZXh0OiB0ZXh0cSxcbiAgICAgICAgc3R5bGVhOiBzdHlsZWEsXG4gICAgICAgIHN0eWxlcTogc3R5bGVxLFxuICAgICAgICBzdHlsZTogc3R5bGVxXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vIGFyZWEgYW5kIHBlcmltZXRlclxuICAgIGxldCBuSW5mbyA9IDBcbiAgICBpZiAodGhpcy5kYXRhLmFyZWEuc2hvdykge1xuICAgICAgY29uc3QgdGV4dGEgOiBzdHJpbmcgPSB0aGlzLmRhdGEuYXJlYS5sYWJlbCA/PyB0aGlzLmRhdGEuYXJlYS52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSB0aGlzLmRhdGEuYXJlYS5taXNzaW5nID8gJz8nIDogdGV4dGFcbiAgICAgIGNvbnN0IHN0eWxlcSA9ICdleHRyYS1pbmZvJ1xuICAgICAgY29uc3Qgc3R5bGVhID0gdGhpcy5kYXRhLmFyZWEubWlzc2luZyA/ICdleHRyYS1hbnN3ZXInIDogJ2V4dHJhLWluZm8nXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKFxuICAgICAgICB7XG4gICAgICAgICAgdGV4dGE6ICdcXFxcdGV4dHtBcmVhfSA9ICcgKyB0ZXh0YSxcbiAgICAgICAgICB0ZXh0cTogJ1xcXFx0ZXh0e0FyZWF9ID0gJyArIHRleHRxLFxuICAgICAgICAgIHRleHQ6ICdcXFxcdGV4dHtBcmVhfSA9ICcgKyB0ZXh0cSxcbiAgICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgICBzdHlsZTogc3R5bGVxLFxuICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwIC0gMTUgKiBuSW5mbylcbiAgICAgICAgfVxuICAgICAgKVxuICAgICAgbkluZm8rK1xuICAgIH1cbiAgICBpZiAodGhpcy5kYXRhLnBlcmltZXRlci5zaG93KSB7XG4gICAgICBjb25zdCB0ZXh0YSA9IHRoaXMuZGF0YS5wZXJpbWV0ZXIubGFiZWwgPz8gdGhpcy5kYXRhLnBlcmltZXRlci52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSB0aGlzLmRhdGEucGVyaW1ldGVyLm1pc3NpbmcgPyAnPycgOiB0ZXh0YVxuICAgICAgY29uc3Qgc3R5bGVxID0gJ2V4dHJhLWluZm8nXG4gICAgICBjb25zdCBzdHlsZWEgPSB0aGlzLmRhdGEucGVyaW1ldGVyLm1pc3NpbmcgPyAnZXh0cmEtYW5zd2VyJyA6ICdleHRyYS1pbmZvJ1xuICAgICAgdGhpcy5sYWJlbHMucHVzaChcbiAgICAgICAge1xuICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwIC0gMjAgKiBuSW5mbyksXG4gICAgICAgICAgdGV4dGE6ICdcXFxcdGV4dHtQZXJpbWV0ZXJ9ID0gJyArIHRleHRhLFxuICAgICAgICAgIHRleHRxOiAnXFxcXHRleHR7UGVyaW1ldGVyfSA9ICcgKyB0ZXh0cSxcbiAgICAgICAgICB0ZXh0OiAnXFxcXHRleHR7UGVyaW1ldGVyfSA9ICcgKyB0ZXh0cSxcbiAgICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgICBzdHlsZTogc3R5bGVxXG4gICAgICAgIH1cbiAgICAgIClcbiAgICB9XG5cbiAgICAvLyBzdG9wIHRoZW0gZnJvbSBjbGFzaGluZyAtIGhtbSwgbm90IHN1cmVcbiAgICAvKlxuICAgIHRoaXMuc3VjY2Vzcz10cnVlO1xuICAgIGZvciAobGV0IGkgPSAwLCBuPXRoaXMubGFiZWxzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBpOyBqKyspIHtcbiAgICAgICAgY29uc3QgbDE9dGhpcy5sYWJlbHNbaV0sIGwyPXRoaXMubGFiZWxzW2pdO1xuICAgICAgICBjb25zdCBkID0gUG9pbnQuZGlzdGFuY2UobDEucG9zLGwyLnBvcyk7XG4gICAgICAgIC8vY29uc29sZS5sb2coYGQoJyR7bDEudGV4dH0nLCcke2wyLnRleHR9JykgPSAke2R9YCk7XG4gICAgICAgIGlmIChkIDwgMjApIHtcbiAgICAgICAgICAvL2NvbnNvbGUubG9nKFwidG9vIGNsb3NlXCIpO1xuICAgICAgICAgIHRoaXMuc3VjY2Vzcz1mYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gKi9cbiAgfVxuXG4gIHN0YXRpYyBmcm9tQXN5bmNEYXRhIChkYXRhOiBQcm9taXNlPFRyaWFuZ2xlQXJlYURhdGE+LCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlld09wdGlvbnMpXG4gIH1cbn1cbiIsImltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgVHJpYW5nbGVBcmVhRGF0YSBmcm9tICcuL1RyaWFuZ2xlQXJlYURhdGEnXG5pbXBvcnQgVHJpYW5nbGVBcmVhVmlldyBmcm9tICcuL1RyaWFuZ2xlQXJlYVZpZXcnXG5pbXBvcnQgeyBRdWVzdGlvbk9wdGlvbnMgfSBmcm9tICcuL3R5cGVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUcmlhbmdsZUFyZWFRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhITogVHJpYW5nbGVBcmVhRGF0YSB8IFByb21pc2U8VHJpYW5nbGVBcmVhRGF0YT4gLy8gaW5pdGlhbGlzZWQgaW4gc3VwZXIoKVxuICB2aWV3ITogVHJpYW5nbGVBcmVhVmlld1xuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgY29uc3QgZGF0YSA9IFRyaWFuZ2xlQXJlYURhdGEucmFuZG9tKG9wdGlvbnMpXG4gICAgY29uc3QgdmlldyA9IFRyaWFuZ2xlQXJlYVZpZXcuZnJvbUFzeW5jRGF0YShkYXRhLCB2aWV3T3B0aW9ucylcbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZXMnXG4gIH1cbn1cbiIsImltcG9ydCB7IE9wdGlvbnNTcGVjIH0gZnJvbSAnT3B0aW9uc1NwZWMnXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5pbXBvcnQgeyByYW5kRWxlbSB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCB7IEdyYXBoaWNRLCBHcmFwaGljUVZpZXcgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCBQYXJhbGxlbG9ncmFtQXJlYVEgZnJvbSAnLi9QYXJhbGxlbG9ncmFtQXJlYVEnXG5pbXBvcnQgUmVjdGFuZ2xlQXJlYVEgZnJvbSAnLi9SZWN0YW5nbGVBcmVhUSdcbmltcG9ydCBUcmFwZXppdW1BcmVhUSBmcm9tICcuL1RyYXBleml1bUFyZWFRJ1xuaW1wb3J0IFRyaWFuZ2xlQXJlYVEgZnJvbSAnLi9UcmlhbmdsZUFyZWFRJ1xuaW1wb3J0IHsgV3JhcHBlck9wdGlvbnMsIFNoYXBlLCBRdWVzdGlvblR5cGVTaW1wbGUsIFF1ZXN0aW9uT3B0aW9ucywgUXVlc3Rpb25UeXBlIH0gZnJvbSAnLi90eXBlcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXJlYVBlcmltZXRlclEgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIHF1ZXN0aW9uOiBHcmFwaGljUSAvLyBtYWtlIG1vcmUgcHJlY2lzZSB3aXRoIHVuaW9uIG9mIGFjdHVhbCB0eXBlc1xuICAvLyBET006IEhUTUxFbGVtZW50ICAvLyBpbiBiYXNlIGNsYXNzXG4gIC8vIGFuc3dlcmVkOiBib29sZWFuIC8vIGluIGJhc2UgY2xhc3NcbiAgY29uc3RydWN0b3IgKHF1ZXN0aW9uOiBHcmFwaGljUSkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLnF1ZXN0aW9uID0gcXVlc3Rpb25cbiAgICB0aGlzLkRPTSA9IHF1ZXN0aW9uLkRPTVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogV3JhcHBlck9wdGlvbnMpIDogQXJlYVBlcmltZXRlclEge1xuICAgIC8vIFRPRE8gQWRkIGN1c3RvbSBvcHRpb25zXG4gICAgY29uc3Qgc2hhcGUgPSByYW5kRWxlbShvcHRpb25zLnNoYXBlcylcbiAgICByZXR1cm4gdGhpcy5yYW5kb21Gcm9tRGlmZmljdWx0eShvcHRpb25zLmRpZmZpY3VsdHksIHNoYXBlLCBvcHRpb25zLnF1ZXN0aW9uVHlwZXNTaW1wbGUpXG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyByYW5kb21Gcm9tRGlmZmljdWx0eSAoZGlmZmljdWx0eTogbnVtYmVyLCBzaGFwZTogU2hhcGUsIHF1ZXN0aW9uVHlwZXM6IFF1ZXN0aW9uVHlwZVNpbXBsZVtdKTogQXJlYVBlcmltZXRlclEge1xuICAgIC8qKiBEaWZmaWN1bHR5IGd1aWRlXG4gICAgICogIDEgLSBGb3J3YXJkLCBubyBkaXN0cmFjdG9ycywgc21hbGwgaW50ZWdlcnNcbiAgICAgKiAgMiAtIEZvcndhcmQsIGRpc3RyYWN0b3JzLCBzbWFsbCBpbnRlZ2Vyc1xuICAgICAqICAzIC0gRm9yd2FyZCwgZGlzdHJhY3RvcnMsIGxhcmdlciBpbnRlZ2Vyc1xuICAgICAqICA0IC0gRm9yd2FyZCwgZGlzdHJhY3RvcnMsIGRlY2ltYWxzIGFuZCBmcmFjdGlvbnNcbiAgICAgKiAgNSAtIEZvcndhcmQsIGRpc3RyYWN0b3JzLCBkZWNpbWFscyBhbmQgZnJhY3Rpb25zIC0gbGFyZ2VyXG4gICAgICogIDYgLSBSZXZlcnNlIHNtYWxsIGludGVnZXJzXG4gICAgICogIDcgLSBSZXZlcnNlIGxhcmdlIGludGVnZXJzXG4gICAgICogIDggLSBSZXZlcnNlIGRlY2ltYWxzIGFuZCBmcmFjdGlvbnNcbiAgICAgKiAgOSAtIFJldmVyc2UgZGVjaW1hbHMgYW5kIGZyYWN0aW9ucyAtIGxhcmdlclxuICAgICAqIDEwIC0gUHl0aGFnb3Jhc1xuICAgICovXG4gICAgY29uc3QgcXVlc3Rpb25PcHRpb25zOiBRdWVzdGlvbk9wdGlvbnMgPSB7XG4gICAgICBxdWVzdGlvblR5cGU6IHJhbmRFbGVtKHF1ZXN0aW9uVHlwZXMpLFxuICAgICAgZHA6IDAsXG4gICAgICBmcmFjdGlvbjogZmFsc2UsXG4gICAgICBub0Rpc3RyYWN0b3JzOiB0cnVlLFxuICAgICAgbWF4TGVuZ3RoOiAyMFxuICAgIH1cbiAgICBjb25zdCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMgPSB7fVxuXG4gICAgc3dpdGNoIChkaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubm9EaXN0cmFjdG9ycyA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDM6XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5ub0Rpc3RyYWN0b3JzID0gZmFsc2VcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heExlbmd0aCA9IDEwMFxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA0OlxuICAgICAgICBpZiAoTWF0aC5yYW5kb20oKTwwLjUpIHsgIC8vIGRlY2ltYWxcbiAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZHAgPSAxXG4gICAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heExlbmd0aCA9IDk5XG4gICAgICAgIH0gZWxzZSB7IC8vIGZyYWN0aW9uXG4gICAgICAgICAgcXVlc3Rpb25PcHRpb25zLmZyYWN0aW9uID0gdHJ1ZVxuICAgICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhMZW5ndGggPSAxNVxuICAgICAgICB9XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5ub0Rpc3RyYWN0b3JzID0gZmFsc2VcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNTpcbiAgICAgICAgaWYgKE1hdGgucmFuZG9tKCk8MC41KSB7ICAvLyBkZWNpbWFsXG4gICAgICAgICAgcXVlc3Rpb25PcHRpb25zLmRwID0gMVxuICAgICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhMZW5ndGggPSA1MDBcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZnJhY3Rpb24gPSB0cnVlXG4gICAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heExlbmd0aCA9IDEwMFxuICAgICAgICB9XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5ub0Rpc3RyYWN0b3JzID0gZmFsc2VcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNjpcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmRwID0gMFxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubm9EaXN0cmFjdG9ycyA9IGZhbHNlXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5xdWVzdGlvblR5cGUgPSByYW5kRWxlbShxdWVzdGlvblR5cGVzLm1hcCh0PT5yZXZlcnNpZnkodCkpKVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TGVuZ3RoID0gMjBcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNzpcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmRwID0gMFxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubm9EaXN0cmFjdG9ycyA9IGZhbHNlXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5xdWVzdGlvblR5cGUgPSByYW5kRWxlbShxdWVzdGlvblR5cGVzLm1hcCh0PT5yZXZlcnNpZnkodCkpKVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TGVuZ3RoID0gOTlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgODpcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmRwID0gMVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubm9EaXN0cmFjdG9ycyA9IGZhbHNlXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5xdWVzdGlvblR5cGUgPSByYW5kRWxlbShxdWVzdGlvblR5cGVzLm1hcCh0PT5yZXZlcnNpZnkodCkpKVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TGVuZ3RoID0gOTlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgOTpcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmRwID0gMVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubm9EaXN0cmFjdG9ycyA9IGZhbHNlXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5xdWVzdGlvblR5cGUgPSByYW5kRWxlbShxdWVzdGlvblR5cGVzLm1hcCh0PT5yZXZlcnNpZnkodCkpKVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TGVuZ3RoID0gNTAwXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDEwOlxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgc2hhcGUgPSAndHJpYW5nbGUnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5xdWVzdGlvblR5cGUgPSByYW5kRWxlbShbJ3B5dGhhZ29yYXNBcmVhJywncHl0aGFnb3Jhc0lzb3NjZWxlc0FyZWEnLCdweXRoYWdvcmFzUGVyaW1ldGVyJ10pXG4gICAgICAgIGJyZWFrXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmFuZG9tV2l0aE9wdGlvbnMoc2hhcGUscXVlc3Rpb25PcHRpb25zLHZpZXdPcHRpb25zKVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbVdpdGhPcHRpb25zIChzaGFwZTogU2hhcGUsIG9wdGlvbnM6IFF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKTogQXJlYVBlcmltZXRlclEge1xuICAgIGxldCBxdWVzdGlvbjogR3JhcGhpY1FcbiAgICBzd2l0Y2goc2hhcGUpIHtcbiAgICAgIGNhc2UgJ3JlY3RhbmdsZSc6XG4gICAgICAgIHF1ZXN0aW9uID0gUmVjdGFuZ2xlQXJlYVEucmFuZG9tKG9wdGlvbnMsdmlld09wdGlvbnMpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICd0cmlhbmdsZSc6XG4gICAgICAgIHF1ZXN0aW9uID0gVHJpYW5nbGVBcmVhUS5yYW5kb20ob3B0aW9ucyx2aWV3T3B0aW9ucylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3RyYXBleml1bSc6XG4gICAgICAgIHF1ZXN0aW9uID0gVHJhcGV6aXVtQXJlYVEucmFuZG9tKG9wdGlvbnMsdmlld09wdGlvbnMpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdwYXJhbGxlbG9ncmFtJzpcbiAgICAgICAgcXVlc3Rpb24gPSBQYXJhbGxlbG9ncmFtQXJlYVEucmFuZG9tKG9wdGlvbnMsdmlld09wdGlvbnMpXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCB5ZXQgaW1wbGVtZW50ZWQnKVxuICAgIH1cbiAgICByZXR1cm4gbmV3IHRoaXMocXVlc3Rpb24pXG4gIH1cblxuICAvKiBXcmFwcyB0aGUgbWV0aG9kcyBvZiB0aGUgd3JhcHBlZCBxdWVzdGlvbiAqL1xuICByZW5kZXIgKCk6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLnJlbmRlcigpIH1cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLnNob3dBbnN3ZXIoKSB9XG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5oaWRlQW5zd2VyKCkgfVxuICB0b2dnbGVBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi50b2dnbGVBbnN3ZXIoKSB9XG5cbiAgc3RhdGljIGdldCBvcHRpb25zU3BlYyAoKSA6IE9wdGlvbnNTcGVjIHtcbiAgICByZXR1cm4gW1xuICAgICAge1xuICAgICAgICBpZDogJ3NoYXBlcycsXG4gICAgICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICAgICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgICAgIHsgaWQ6ICdyZWN0YW5nbGUnLCB0aXRsZTogJ1JlY3RhbmdsZXMnIH0sXG4gICAgICAgICAgeyBpZDogJ3RyaWFuZ2xlJywgdGl0bGU6ICdUcmlhbmdsZXMnIH0sXG4gICAgICAgICAgeyBpZDogJ3BhcmFsbGVsb2dyYW0nLCB0aXRsZTogJ1BhcmFsbGVsb2dyYW1zJyB9LFxuICAgICAgICAgIHsgaWQ6ICd0cmFwZXppdW0nLCB0aXRsZTogJ1RyYXBlemlhJyB9XG4gICAgICAgIF0sXG4gICAgICAgIGRlZmF1bHQ6IFsncmVjdGFuZ2xlJywgJ3RyaWFuZ2xlJywgJ3BhcmFsbGVsb2dyYW0nLCAndHJhcGV6aXVtJ10sXG4gICAgICAgIHRpdGxlOiAnU2hhcGVzJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgaWQ6ICdxdWVzdGlvblR5cGVzU2ltcGxlJyxcbiAgICAgICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgICAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICAgICAgeyBpZDogJ2FyZWEnLCB0aXRsZTogJ0FyZWEnIH0sXG4gICAgICAgICAgeyBpZDogJ3BlcmltZXRlcicsIHRpdGxlOiAnUGVyaW1ldGVyJyB9XG4gICAgICAgIF0sXG4gICAgICAgIGRlZmF1bHQ6IFsnYXJlYScsICdwZXJpbWV0ZXInXSxcbiAgICAgICAgdGl0bGU6ICdUeXBlIG9mIHF1ZXN0aW9uJ1xuICAgICAgfVxuICAgIF1cbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcge1xuICAgIHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZSdcbiAgfVxufVxuXG4vKipcbiAqIFByZXBlbmQgJ3JldmVyc2UnIHRvIHRoZSBiZWdpbm5pbmcgb2YgYSBzdHJpbmcgdGhlbiBjYW1lbCBjYXNlIGl0XG4gKiBlLmcuIHJldmVyc2lmeSgnYXJlYScpID09PSAncmV2ZXJzZUFyZWEnXG4gKiBAcGFyYW0gc3RyIEEgc3RyaW5nXG4gKiBAcGFyYW0gcHJlZml4IFRoZSBwcmVmaXggdG8gdXNlXG4gKi9cbmZ1bmN0aW9uIHJldmVyc2lmeShzdHI6IFF1ZXN0aW9uVHlwZVNpbXBsZSwgcHJlZml4OiAncmV2ZXJzZScgfCAncHl0aGFnb3JhcycgPSAncmV2ZXJzZScpIDogUXVlc3Rpb25UeXBlIHtcbiAgcmV0dXJuIHByZWZpeCArIHN0clswXS50b1VwcGVyQ2FzZSgpICsgc3RyLnNsaWNlKDEpIGFzIFF1ZXN0aW9uVHlwZVxufSIsImRlY2xhcmUgY29uc3Qga2F0ZXggOiB7cmVuZGVyIDogKHN0cmluZzogc3RyaW5nLCBlbGVtZW50OiBIVE1MRWxlbWVudCkgPT4gdm9pZH1cbmltcG9ydCBRdWVzdGlvbiBmcm9tIFwiUXVlc3Rpb24vUXVlc3Rpb24uanNcIjtcbmltcG9ydCB7IGNyZWF0ZUVsZW0sIHJhbmRCZXR3ZWVuLCByYW5kRWxlbSwgcmFuZFBhcnRpdGlvbiB9IGZyb20gXCIuLi8uLi91dGlsaXRpZXMuanNcIjtcbmltcG9ydCAnLi9iYXJNb2RlbC5jc3MnXG5cbmludGVyZmFjZSBCYXJNb2RlbFBhcnQge1xuICBsZW5ndGg6IG51bWJlcixcbiAgbGFiZWw/OiBzdHJpbmcsXG4gIGxhdGV4PzogYm9vbGVhbixcbiAgc3R5bGU/OiBzdHJpbmcgLy8gYSBjbGFzc1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEJhck1vZGVsU3BlYyB7XG4gIHBhcnRzOiBCYXJNb2RlbFBhcnRbXVxuICB0b3RhbDogQmFyTW9kZWxQYXJ0XG59XG5cbmludGVyZmFjZSBQYXJ0aXRpb25PcHRpb25zIHtcbiAgZGlmZmljdWx0eTogbnVtYmVyLFxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQmFyTW9kZWwoc3BlYzogQmFyTW9kZWxTcGVjKSA6IEhUTUxFbGVtZW50IHtcbiAgY29uc3Qgb3V0ZXIgPSBjcmVhdGVFbGVtKCdkaXYnLCdiYXJNb2RlbC1vdXRlcicpXG4gIGNvbnN0IHRvdGFsID0gY3JlYXRlRWxlbSgnZGl2JywnYmFyTW9kZWwtdG90YWwnLG91dGVyKVxuICBjb25zdCBicmFja2V0ID0gY3JlYXRlRWxlbSgnZGl2JywnYmFyTW9kZWwtYnJhY2tldCcsb3V0ZXIpXG4gIGNvbnN0IGJhciA9IGNyZWF0ZUVsZW0oJ2RpdicsJ2Jhck1vZGVsLWJhcicsb3V0ZXIpXG5cbiAgc3BlYy5wYXJ0cy5mb3JFYWNoKCBwID0+IHtcbiAgICBjb25zdCBwYXJ0ID0gY3JlYXRlRWxlbSgnZGl2JywnYmFyTW9kZWwtcGFydCcsYmFyKVxuICAgIGlmIChwLnN0eWxlKSB7cGFydC5jbGFzc0xpc3QuYWRkKHAuc3R5bGUpfVxuICAgIHBhcnQuc3R5bGUuZmxleEdyb3cgPSBwLmxlbmd0aC50b1N0cmluZygpXG4gICAgaWYgKHAubGF0ZXgpIHtcbiAgICAgIGthdGV4LnJlbmRlcihwLmxhYmVsPz8gcC5sZW5ndGgudG9TdHJpbmcoKSxwYXJ0KVxuICAgIH0gZWxzZSB7XG4gICAgICBwYXJ0LmlubmVySFRNTCA9IHAubGFiZWwgPz8gcC5sZW5ndGgudG9TdHJpbmcoKVxuICAgIH1cbiAgfSlcblxuICBpZiAoc3BlYy50b3RhbC5sYXRleCkge1xuICAgIGthdGV4LnJlbmRlcihzcGVjLnRvdGFsLmxhYmVsID8/IHNwZWMudG90YWwubGVuZ3RoLnRvU3RyaW5nKCksIHRvdGFsKVxuICB9IGVsc2Uge1xuICAgIHRvdGFsLmlubmVySFRNTCA9IHNwZWMudG90YWwubGFiZWwgPz8gc3BlYy50b3RhbC5sZW5ndGgudG9TdHJpbmcoKVxuICB9XG5cbiAgcmV0dXJuIG91dGVyXG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcnRpdGlvblEgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIHByaXZhdGUgcmVhZG9ubHkgcXVlc3Rpb25TcGVjOiBCYXJNb2RlbFNwZWNcbiAgcHJpdmF0ZSByZWFkb25seSBhbnN3ZXJTcGVjOiBCYXJNb2RlbFNwZWNcbiAgcHJpdmF0ZSBfcXVlc3Rpb25EaXY/OiBIVE1MRWxlbWVudCAvLyBjb25zdHJ1Y3RlZCBsYXppbHlcbiAgcHJpdmF0ZSBfYW5zd2VyRGl2PzogSFRNTEVsZW1lbnRcbiAgY29uc3RydWN0b3IocXVlc3Rpb25TcGVjOiBCYXJNb2RlbFNwZWMsIGFuc3dlclNwZWM6IEJhck1vZGVsU3BlYykge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLnF1ZXN0aW9uU3BlYyA9IHF1ZXN0aW9uU3BlY1xuICAgIHRoaXMuYW5zd2VyU3BlYyA9IGFuc3dlclNwZWNcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20ob3B0aW9uczogUGFydGl0aW9uT3B0aW9ucykge1xuICAgIGxldCBtaW5Ub3RhbDogbnVtYmVyXG4gICAgbGV0IG1heFRvdGFsOiBudW1iZXJcbiAgICBsZXQgbiA6IG51bWJlclxuXG4gICAgc3dpdGNoKG9wdGlvbnMuZGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICBtaW5Ub3RhbCA9ICAxMFxuICAgICAgICBtYXhUb3RhbCA9IDEwXG4gICAgICAgIG4gPSAyXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDI6XG4gICAgICAgIG1pblRvdGFsID0gN1xuICAgICAgICBtYXhUb3RhbCA9IDMwXG4gICAgICAgIG4gPSAyXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDM6XG4gICAgICAgIG1pblRvdGFsID0gMjBcbiAgICAgICAgbWF4VG90YWwgPSAxMDBcbiAgICAgICAgbiA9IDJcbiAgICAgIGNhc2UgNDpcbiAgICAgICAgbWluVG90YWwgPSAyMFxuICAgICAgICBtYXhUb3RhbCA9IDIwMFxuICAgICAgICBuID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA1OlxuICAgICAgICBtaW5Ub3RhbCA9IDIwXG4gICAgICAgIG1heFRvdGFsID0gMjAwXG4gICAgICAgIG4gPSByYW5kQmV0d2VlbigyLDQpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDY6XG4gICAgICBjYXNlIDc6XG4gICAgICBjYXNlIDg6XG4gICAgICBjYXNlIDk6XG4gICAgICBjYXNlIDEwOlxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbWluVG90YWwgPSAxMDBcbiAgICAgICAgbWF4VG90YWwgPSAxMDAwXG4gICAgICAgIG4gPSByYW5kQmV0d2VlbigzLDQpXG4gICAgICAgIGJyZWFrXG4gICAgfVxuXG4gICAgY29uc3QgdG90YWwgPSByYW5kQmV0d2VlbihtaW5Ub3RhbCxtYXhUb3RhbClcbiAgICBjb25zdCBtaW5Qcm9wb3J0aW9uID0gMC4xXG4gICAgY29uc3QgcGFydGl0aW9uID0gcmFuZFBhcnRpdGlvbih7dG90YWwsIG4sIG1pblByb3BvcnRpb259KVxuICAgIGNvbnN0IHNwZWMgOiBCYXJNb2RlbFNwZWMgPSB7XG4gICAgICB0b3RhbDoge2xlbmd0aDogdG90YWx9LFxuICAgICAgcGFydHM6IHBhcnRpdGlvbi5tYXAoeCA9PiAoe2xlbmd0aDogeH0pKVxuICAgIH1cbiAgICBjb25zdCBhbnN3ZXJTcGVjIDogQmFyTW9kZWxTcGVjID0ge1xuICAgICAgdG90YWw6IHtsZW5ndGg6IHRvdGFsfSxcbiAgICAgIHBhcnRzOiBwYXJ0aXRpb24ubWFwKHggPT4gKHtsZW5ndGg6IHh9KSlcbiAgICB9XG5cbiAgICBpZiAoTWF0aC5yYW5kb20oKTwwLjUpIHsgLy8gaGlkZSB0b3RhbFxuICAgICAgc3BlYy50b3RhbC5sYWJlbCA9IFwiP1wiXG4gICAgICBhbnN3ZXJTcGVjLnRvdGFsLnN0eWxlID0gXCJhbnN3ZXJcIlxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBpID0gcmFuZEJldHdlZW4oMCxuLTEpXG4gICAgICBhbnN3ZXJTcGVjLnBhcnRzW2ldLnN0eWxlID0gJ2Fuc3dlcidcbiAgICAgIHNwZWMucGFydHNbaV0ubGFiZWwgPSBcIj9cIlxuICAgIH1cblxuICAgIHJldHVybiBuZXcgdGhpcyhzcGVjLGFuc3dlclNwZWMpXG4gIH1cblxuICBwdWJsaWMgcmVuZGVyKCkge1xuICAgIHRoaXMuRE9NLmlubmVySFRNTCA9ICcnXG4gICAgaWYgKCF0aGlzLmFuc3dlcmVkKSB7XG4gICAgICBjb25zdCBiYXJNb2RlbCA9IHRoaXMuX3F1ZXN0aW9uRGl2ID8/ICh0aGlzLl9xdWVzdGlvbkRpdiA9IGNyZWF0ZUJhck1vZGVsKHRoaXMucXVlc3Rpb25TcGVjKSlcbiAgICAgIHRoaXMuRE9NLmFwcGVuZChiYXJNb2RlbClcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgYmFyTW9kZWwgPSB0aGlzLl9hbnN3ZXJEaXYgPz8gKHRoaXMuX2Fuc3dlckRpdiA9IGNyZWF0ZUJhck1vZGVsKHRoaXMuYW5zd2VyU3BlYykpXG4gICAgICB0aGlzLkRPTS5hcHBlbmQoYmFyTW9kZWwpXG4gICAgfVxuICB9XG5cbiAgcHVibGljIHNob3dBbnN3ZXIoKSB7XG4gICAgc3VwZXIuc2hvd0Fuc3dlcigpXG4gICAgdGhpcy5yZW5kZXIoKVxuICB9XG5cbiAgcHVibGljIGhpZGVBbnN3ZXIoKSB7XG4gICAgc3VwZXIuaGlkZUFuc3dlcigpXG4gICAgdGhpcy5yZW5kZXIoKVxuICB9XG5cbn0iLCIvKipcbiAqIFRoZSBwcmltZXMgdXAgdG8gMzBcbiAqL1xuZXhwb3J0IGNvbnN0IFBSSU1FUzMwOiBudW1iZXJbXSA9IFsyLDMsNSw3LDExLDEzLDE3LDE5LDIzLDI5XVxuZXhwb3J0IGNvbnN0IFBSSU1FUzUwOiBudW1iZXJbXSA9IFsyLDMsNSw3LDExLDEzLDE3LDE5LDIzLDI5LDMxLDM3LDMxLDQzLDQ3XSIsImltcG9ydCBGcmFjdGlvbiBmcm9tIFwiZnJhY3Rpb24uanNcIjtcbmltcG9ydCBPcHRpb25zIGZyb20gXCJPcHRpb25zXCI7XG5pbXBvcnQgeyBQUklNRVMzMCwgUFJJTUVTNTAgfSBmcm9tIFwicHJpbWVzXCI7XG5pbXBvcnQgeyBnY2QsIHJhbmRCZXR3ZWVuLCByYW5kQmV0d2VlbkZpbHRlciwgcmFuZEVsZW0gfSBmcm9tIFwidXRpbGl0aWVzXCI7XG5pbXBvcnQgVGV4dFEgZnJvbSBcIi4vVGV4dFFcIjtcblxuaW50ZXJmYWNlIGN1c3RvbU9wdGlvbnMgeyAvLyBmb3IgaW50ZXJuYWwgdXNlXG4gIGRlbm9taW5hdG9yczogJ3NhbWUnIHwgJ211bHRpcGxlJyB8ICdzaGFyZWRGYWN0b3InLFxuICBzaW1wbGlmeTogYm9vbGVhbiB8IHVuZGVmaW5lZCxcbiAgbWF4RGVub21pbmF0b3I6IG51bWJlcixcbiAgbWF4SW50ZWdlclBhcnQ6IG51bWJlcixcbiAgc3VidHJhY3Q6IGJvb2xlYW5cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRnJhY3Rpb25BZGRRIGV4dGVuZHMgVGV4dFEge1xuICAvKipcbiAgICogUmFuZG9tIGJhc2VkIG9uIGRpZmZpY3VsdHk6XG4gICAqIDEuIFNhbWUgZGVub21pbmF0b3IsIHByb3Blciwgbm8gc2ltcGxpZnlpbmdcbiAgICogMi4gU2FtZSBkZW5vbWluYXRvciwgcHJvcGVyLCBuZWVkcyBzaW1wbGlmeWluZ1xuICAgKiAzLiBEZW5vbWluYXRvciBtdWx0aXBsZXMsIHByb3BlciwgbWF5IG5lZWQgc2ltcGxpZnlpbmcgKGNhbiBJIGNvbnRyb2wgdGhpcz8pXG4gICAqIDQuIERlbm9taW5hdG9yIG5vdCBtdWx0aXBsZXMsIHByb3BlciwgbWF5IG5lZWQgc2ltcGxpZnlpbmdcbiAgICogNS4gU21hbGwgaW1wcm9wZXIgZnJhY3Rpb25zLCBzYW1lIGRlbm9taW5hdG9yXG4gICAqIDYuIEltcHJvcGVyLCBkaWZmZXJlbnQgZGVub21pbmF0b3JcbiAgICogNy4gVGhyZWUgZnJhY3Rpb25zLCBpbXByb3BlclxuICAgKiA4LiBUaHJlZSBmcmFjdGlvbnMgd2l0aCBtdWx0aXBsaWNhdGlvbiBieSBpbnRlZ2VyXG4gICAqIDkuIGF4ICsgYnkgYSxiIGluIHxOLCB4LCB5IGluIHxRXG4gICAqIDEwLiBCaWcgbnVtYmVyc1xuICAgKiBcbiAgICogQHBhcmFtIG9wdGlvbnMgZGlmZmljdWx0eVxuICAgKi9cbiAgc3RhdGljIHJhbmRvbShvcHRpb25zOiBPcHRpb25zKSA6IEZyYWN0aW9uQWRkUXtcbiAgICBsZXQgYWRkZW5kczogRnJhY3Rpb25bXVxuICAgIGNvbnN0IHN1YnRyYWN0ID0gKE1hdGgucmFuZG9tKCkgPCAwLjUpXG4gICAgc3dpdGNoKG9wdGlvbnMuZGlmZmljdWx0eSl7XG4gICAgICBjYXNlIDE6IHsgLy8gY29tbW9uIGRlbm9taW5hdG9yLCBubyBzaW1wbGlmeWluZ1xuICAgICAgICBjb25zdCBkZW4gPSByYW5kRWxlbShQUklNRVMzMC5maWx0ZXIocD0+cDwyMCAmJiBwPjMpKSAvLyBkZW5vbWluYXRvciBpcyBhIHByaW1lXG4gICAgICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbigxLGRlbi0yKSArIChzdWJ0cmFjdD8xOjApIC8vIElmIHN1YnRhY3Rpbmcgd2FudCAyLT5kZW4tMVxuICAgICAgICBjb25zdCBiID0gc3VidHJhY3Q/IC1yYW5kQmV0d2VlbigxLCBhLTEpIDpyYW5kQmV0d2VlbigxLGRlbi1hLTEpXG4gICAgICAgIGFkZGVuZHMgPSBbbmV3IEZyYWN0aW9uKGEsZGVuKSxuZXcgRnJhY3Rpb24oYixkZW4pXVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAyOiB7IC8vIGNvbW1vbiBkZW5vbWluYXRvciwgc2ltcGxpZmllc1xuICAgICAgICBjb25zdCBkZW4gPSByYW5kQmV0d2VlbkZpbHRlcig0LDIwLCBuPT4gIVBSSU1FUzMwLmluY2x1ZGVzKG4pKSAvLyBub24tcHJpbWVcbiAgICAgICAgY29uc3QgYSA9IHN1YnRyYWN0P1xuICAgICAgICAgIHJhbmRCZXR3ZWVuRmlsdGVyKDIsZGVuLTEsbj0+Z2NkKG4sZGVuKT09PTEpIDpcbiAgICAgICAgICByYW5kQmV0d2VlbkZpbHRlcigxLGRlbi0yLG49PmdjZChuLGRlbik9PT0xKSAgICAgICAgIC8vIG5vbi1zaW1wbGlmeWluZy4gR3VhcmFudGVlZCB0byBleGlzdCBzaW5jZSAxIHdvcmtzXG4gICAgICAgIGNvbnN0IGIgPSBzdWJ0cmFjdD9cbiAgICAgICAgICAtcmFuZEJldHdlZW5GaWx0ZXIoMSxhLTEsIG49PiBnY2QobixkZW4pPT09MSAmJiBnY2QoYS1uLGRlbikhPT0xKSA6XG4gICAgICAgICAgcmFuZEJldHdlZW5GaWx0ZXIoMSxkZW4tYS0xLCBuPT4gZ2NkKG4sZGVuKT09PTEgJiYgZ2NkKGErbixkZW4pIT09MSlcbiAgICAgICAgYWRkZW5kcyA9IFtuZXcgRnJhY3Rpb24oYSxkZW4pLCBuZXcgRnJhY3Rpb24oYixkZW4pXVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAzOiB7IC8vIE9uZSBkZW5vbWluYXRvciBhIG11bHRpcGxlIG9mIGFub3RoZXIuIE1pZ2h0IHNpbXBsaWZ5XG4gICAgICAgIGNvbnN0IGRlbjEgPSByYW5kQmV0d2VlbigyLDEwKVxuICAgICAgICBjb25zdCBtdWx0aXBsaWVyID0gcmFuZEJldHdlZW4oMiw1KVxuICAgICAgICBjb25zdCBkZW4yID0gbXVsdGlwbGllciAqIGRlbjFcblxuICAgICAgICBsZXQgYTogbnVtYmVyXG4gICAgICAgIGxldCBiOiBudW1iZXJcbiAgICAgICAgaWYgKE1hdGgucmFuZG9tKCk8MC41KSB7IC8vIGJpZyBkZW5vbWluYXRvciBzZWNvbmRcbiAgICAgICAgICBhID0gcmFuZEJldHdlZW5GaWx0ZXIoMSxkZW4xLTEsIG49PiBnY2QobixkZW4xKT09PTEpIFxuICAgICAgICAgIGIgPSBzdWJ0cmFjdD9cbiAgICAgICAgICAgIC1yYW5kQmV0d2VlbkZpbHRlcigxLG11bHRpcGxpZXIqYS0xLCBuPT4gZ2NkKG4sZGVuMik9PT0xKSA6XG4gICAgICAgICAgICByYW5kQmV0d2VlbkZpbHRlcigxLGRlbjItbXVsdGlwbGllciphLTEsIG49PiBnY2QobixkZW4yKT09PTEpXG4gICAgICAgICAgYWRkZW5kcyA9IFtuZXcgRnJhY3Rpb24oYSxkZW4xKSwgbmV3IEZyYWN0aW9uKGIsIGRlbjIpXVxuICAgICAgICB9IGVsc2UgeyAvLyBiaWcgZGVub21pbmF0b3IgZmlyc3RcbiAgICAgICAgICBhID0gc3VidHJhY3Q/XG4gICAgICAgICAgICByYW5kQmV0d2VlbkZpbHRlcihtdWx0aXBsaWVyKzEsIGRlbjItMSwgbj0+IGdjZChuLGRlbjIpPT09MSkgOlxuICAgICAgICAgICAgcmFuZEJldHdlZW5GaWx0ZXIoMSxkZW4yLW11bHRpcGxpZXItMSwgbj0+IGdjZChuLGRlbjIpPT09MSlcbiAgICAgICAgICBiID0gc3VidHJhY3Q/XG4gICAgICAgICAgICAtcmFuZEJldHdlZW5GaWx0ZXIoMSwgTWF0aC5mbG9vcihhL211bHRpcGxpZXIpLCBuID0+IGdjZChuLGRlbjEpPT09MSk6XG4gICAgICAgICAgICByYW5kQmV0d2VlbkZpbHRlcigxLGRlbjEtTWF0aC5jZWlsKGEvbXVsdGlwbGllciksIG49PiBnY2QobixkZW4xKT09PTEpXG4gICAgICAgICAgYWRkZW5kcyA9IFtuZXcgRnJhY3Rpb24oYSxkZW4yKSwgbmV3IEZyYWN0aW9uKGIsIGRlbjEpXVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlIDQ6ZGVmYXVsdDp7IC8vIENsYXNzaWMgZGlmZmVyZW50IGRlbm9taW5hdG9yc1xuICAgICAgICAvLyBuMS9tMWIgKyBuMi9tMmIgd2hlcmUgbTEsbTIgY29wcmltZVxuICAgICAgICBjb25zdCBiID0gcmFuZEJldHdlZW4oMiw1KVxuICAgICAgICBjb25zdCBtMSA9IHJhbmRCZXR3ZWVuKDIsNClcbiAgICAgICAgY29uc3QgbTIgPSByYW5kQmV0d2VlbkZpbHRlcigyLDQsIG49PiBnY2QobTEsbik9PT0xKSBcblxuICAgICAgICBjb25zdCBkMSA9IGIgKiBtMVxuICAgICAgICBjb25zdCBkMiA9IGIgKiBtMlxuICAgICAgICBsZXQgbjE6IG51bWJlclxuICAgICAgICBsZXQgbjI6IG51bWJlclxuICAgICAgICBpZiAoc3VidHJhY3QpIHtcbiAgICAgICAgICBuMSA9IHJhbmRCZXR3ZWVuRmlsdGVyKE1hdGguY2VpbChtMS9tMiksZDEtMSwgbj0+IGdjZChuLGQxKT09PTEpIC8vIHVzZSBwZW4gYW5kIHBhcGVyIHRvIGRlcml2ZSB0aGlzIG1pbmltdW1cbiAgICAgICAgICBuMiA9IC1yYW5kQmV0d2VlbkZpbHRlcigxLGQyLTEsIG49PiAoZ2NkKG4sZDIpPT09MSAmJiAobTIqbjEgLSBtMSpuID4gMCkpKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG4xID0gcmFuZEJldHdlZW5GaWx0ZXIoMSxNYXRoLmZsb29yKG0xKmIgLSBtMS9tMiksIG49PiBnY2QobixkMik9PT0xKSAvLyB1c2UgcGVuIGFuZCBwYXBlclxuICAgICAgICAgIG4yID0gcmFuZEJldHdlZW5GaWx0ZXIoMSwgZDItMSwgbj0+IChnY2QobixkMik9PT0xICYmIG4xKm0yK24qbTEgPCBiKm0xKm0yKSlcbiAgICAgICAgfVxuICAgICAgICBhZGRlbmRzID0gW25ldyBGcmFjdGlvbihuMSxkMSksIG5ldyBGcmFjdGlvbihuMixkMildXG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHF1ZXN0aW9uIDogc3RyaW5nID0gYWRkZW5kc1swXS50b0xhdGV4KHRydWUpICsgYWRkZW5kcy5zbGljZSgxKS5tYXAodG9TaWduZWRNaXhlZExhVGV4KS5qb2luKCcnKSAvLyBqb2luIHdpdGggc2lnblxuICAgIGNvbnN0IGFuc3dlciA6IHN0cmluZyA9ICc9JyArIGFkZGVuZHMucmVkdWNlKChwcmV2LGN1cnIpPT5wcmV2LmFkZChjdXJyKSkudG9MYXRleCh0cnVlKVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKHF1ZXN0aW9uLCBhbnN3ZXIsIHtxdWVzdGlvbkNsYXNzOiAnYWRqYWNlbnQnLCBhbnN3ZXJDbGFzczogJ2FkamFjZW50J30pXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tUGFpcldpdGhPcHRpb25zKHtkZW5vbWluYXRvcnMsIG1heERlbm9taW5hdG9yLCBtYXhJbnRlZ2VyUGFydCwgc2ltcGxpZnksIHN1YnRyYWN0fTogY3VzdG9tT3B0aW9ucykgOiBbRnJhY3Rpb24sRnJhY3Rpb25de1xuICAgIGxldCBmMTogRnJhY3Rpb25cbiAgICBsZXQgZjI6IEZyYWN0aW9uXG4gICAgc3dpdGNoKGRlbm9taW5hdG9ycykge1xuICAgICAgY2FzZSAnc2FtZSc6IHtcbiAgICAgICAgY29uc3QgZCA9IFxuICAgICAgICAgIChzaW1wbGlmeT09PXRydWUpPyAgcmFuZEJldHdlZW5GaWx0ZXIoNSxtYXhEZW5vbWluYXRvcixuPT5QUklNRVM1MC5pbmNsdWRlcyhuKSkgOlxuICAgICAgICAgIChzaW1wbGlmeT09PWZhbHNlKT8gcmFuZEJldHdlZW5GaWx0ZXIoNCxtYXhEZW5vbWluYXRvcixuPT4hUFJJTUVTNTAuaW5jbHVkZXMobikpIDpcbiAgICAgICAgICAvKnVuZGVmaW5lZCovICAgICAgIHJhbmRCZXR3ZWVuKDQsbWF4RGVub21pbmF0b3IpICAgXG4gICAgICAgIGNvbnN0IG1heE51bWVyYXRvciA9IChtYXhJbnRlZ2VyUGFydCsxKSpkLTFcbiAgICAgICAgbGV0IG4xOiBudW1iZXJcbiAgICAgICAgbGV0IG4yOiBudW1iZXJcbiAgICAgICAgaWYgKHN1YnRyYWN0KSB7XG4gICAgICAgICAgbjEgPSByYW5kQmV0d2VlbkZpbHRlcigyLG1heE51bWVyYXRvciwgY29QcmltZVdpdGgoZCkpXG4gICAgICAgICAgbjIgPSAtcmFuZEJldHdlZW5GaWx0ZXIoMSxuMS0xLCBjb1ByaW1lV2l0aChkKSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuMSA9IHJhbmRCZXR3ZWVuRmlsdGVyKDEsbWF4TnVtZXJhdG9yLCBjb1ByaW1lV2l0aChkKSlcbiAgICAgICAgICBjb25zdCBmaWx0ZXI6IChuOiBudW1iZXIpID0+IGJvb2xlYW4gPVxuICAgICAgICAgICAgKHNpbXBsaWZ5PT09dHJ1ZSk/ICBuID0+IGNvUHJpbWVXaXRoKGQpKG4pICYmICFjb1ByaW1lV2l0aChkKShuMStuKTpcbiAgICAgICAgICAgIChzaW1wbGlmeT09PWZhbHNlKT8gbiA9PiBjb1ByaW1lV2l0aChkKShuKSAmJiBjb1ByaW1lV2l0aChkKShuMStuKTpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbiA9PiBjb1ByaW1lV2l0aChkKShuKVxuICAgICAgICAgIG4yID0gcmFuZEJldHdlZW5GaWx0ZXIoMSxtYXhOdW1lcmF0b3ItbjEsIGZpbHRlcilcbiAgICAgICAgfVxuICAgICAgICBmMSA9IG5ldyBGcmFjdGlvbihuMSxkKVxuICAgICAgICBmMiA9IG5ldyBGcmFjdGlvbihuMixkKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAnbXVsdGlwbGUnOiB7XG4gICAgICAgIGNvbnN0IGQxID0gcmFuZEJldHdlZW4oMiwxMClcbiAgICAgICAgY29uc3QgbSA9IHJhbmRCZXR3ZWVuKDIsNSlcbiAgICAgICAgY29uc3QgZDIgPSBtICogZDFcblxuICAgICAgICBsZXQgbjE6IG51bWJlclxuICAgICAgICBsZXQgbjI6IG51bWJlclxuICAgICAgICBpZiAoTWF0aC5yYW5kb20oKTwwLjUpIHsgLy8gYmlnIGRlbm9taW5hdG9yIHNlY29uZFxuICAgICAgICAgIG4xID0gcmFuZEJldHdlZW5GaWx0ZXIoMSxkMS0xLCBuPT4gZ2NkKG4sZDEpPT09MSkgXG4gICAgICAgICAgbjIgPSBzdWJ0cmFjdD9cbiAgICAgICAgICAgIC1yYW5kQmV0d2VlbkZpbHRlcigxLG0qbjEtMSwgbj0+IGdjZChuLGQyKT09PTEpIDpcbiAgICAgICAgICAgIHJhbmRCZXR3ZWVuRmlsdGVyKDEsZDItbSpuMS0xLCBuPT4gZ2NkKG4sZDIpPT09MSlcbiAgICAgICAgICBmMSA9IG5ldyBGcmFjdGlvbihuMSxkMSlcbiAgICAgICAgICBmMiA9IG5ldyBGcmFjdGlvbihuMixkMilcbiAgICAgICAgfSBlbHNlIHsgLy8gYmlnIGRlbm9taW5hdG9yIGZpcnN0XG4gICAgICAgICAgbjEgPSBzdWJ0cmFjdD9cbiAgICAgICAgICAgIHJhbmRCZXR3ZWVuRmlsdGVyKG0rMSwgZDItMSwgbj0+IGdjZChuLGQyKT09PTEpIDpcbiAgICAgICAgICAgIHJhbmRCZXR3ZWVuRmlsdGVyKDEsZDItbS0xLCBuPT4gZ2NkKG4sZDIpPT09MSlcbiAgICAgICAgICBuMiA9IHN1YnRyYWN0P1xuICAgICAgICAgICAgLXJhbmRCZXR3ZWVuRmlsdGVyKDEsIE1hdGguZmxvb3IobjEvbSksIG4gPT4gZ2NkKG4sZDEpPT09MSk6XG4gICAgICAgICAgICByYW5kQmV0d2VlbkZpbHRlcigxLGQxLU1hdGguY2VpbChuMS9tKSwgbj0+IGdjZChuLGQxKT09PTEpXG4gICAgICAgICAgZjEgPSBuZXcgRnJhY3Rpb24objEsZDIpXG4gICAgICAgICAgZjIgPSBuZXcgRnJhY3Rpb24objIsZDEpXG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NoYXJlZEZhY3Rvcic6IHtcbiAgICAgICAgZjEgPSBuZXcgRnJhY3Rpb24oMSwyKVxuICAgICAgICBmMiA9IG5ldyBGcmFjdGlvbigxLDIpXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBbZjEsZjJdXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkKCkge3JldHVybiAnQ2FsY3VsYXRlJ31cbn1cblxuZnVuY3Rpb24gdG9TaWduZWRNaXhlZExhVGV4KGY6IEZyYWN0aW9uKSA6IHN0cmluZ3tcbiAgbGV0IGxhdGV4ID0gZi50b0xhdGV4KHRydWUpXG4gIGlmICghbGF0ZXguc3RhcnRzV2l0aCgnLScpKSBsYXRleCA9ICcrJytsYXRleFxuICByZXR1cm4gbGF0ZXhcbn1cblxuLyoqIEN1cnJpZWQgZnVuY3Rpb24gZm9yIHBvaW50LWZyZWUgZmlsdGVyaW5nICovXG5mdW5jdGlvbiBjb1ByaW1lV2l0aChuOiBudW1iZXIpIDogKG06bnVtYmVyKT0+Ym9vbGVhbiB7XG4gIHJldHVybiAobSA9PiBnY2QobSxuKT09PTEpXG59IiwiaW1wb3J0IEFsZ2VicmFpY0ZyYWN0aW9uUSBmcm9tICdRdWVzdGlvbi9UZXh0US9BbGdlYnJhaWNGcmFjdGlvblEnXG5pbXBvcnQgSW50ZWdlckFkZFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvSW50ZWdlckFkZCdcbmltcG9ydCBBcml0aG1hZ29uUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9Bcml0aG1hZ29uUSdcbmltcG9ydCBUZXN0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXN0USdcbmltcG9ydCBBZGRBWmVybyBmcm9tICdRdWVzdGlvbi9UZXh0US9BZGRBWmVybydcbmltcG9ydCBFcXVhdGlvbk9mTGluZSBmcm9tICdRdWVzdGlvbi9UZXh0US9FcXVhdGlvbk9mTGluZSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNXcmFwcGVyJ1xuaW1wb3J0IEFyZWFQZXJpbWV0ZXJRIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvQXJlYVdyYXBwZXInXG5cbmltcG9ydCBPcHRpb25zU2V0IGZyb20gJ09wdGlvbnNTZXQnXG5pbXBvcnQgUGFydGl0aW9uUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9CYXJNb2RlbHMnXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5pbXBvcnQgT3B0aW9ucyBmcm9tICdPcHRpb25zJ1xuaW1wb3J0IHsgT3B0aW9uc1NwZWMgfSBmcm9tICdPcHRpb25zU3BlYydcbmltcG9ydCBGcmFjdGlvbkFkZFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvRnJhY3Rpb25BZGQnXG5cbmludGVyZmFjZSBRdWVzdGlvbkZhY3Rvcnkge1xuICByYW5kb20ob3B0aW9uczogT3B0aW9ucyk6IFF1ZXN0aW9uLFxuICBjb21tYW5kV29yZDogc3RyaW5nLFxuICBvcHRpb25zU3BlYz86IE9wdGlvbnNTcGVjXG59IFxuaW50ZXJmYWNlIFF1ZXN0aW9uQ2xhc3Mge1xuICBuZXcob3B0aW9uczogT3B0aW9ucyk6IFF1ZXN0aW9uXG4gIGNvbW1hbmRXb3JkOiBzdHJpbmcsXG4gIG9wdGlvbnNTcGVjPzogT3B0aW9uc1NwZWNcbn1cblxuaW50ZXJmYWNlIFNlY3Rpb25UaXRsZSB7c2VjdGlvbjogc3RyaW5nfVxuaW50ZXJmYWNlIFRvcGljIHtcbiAgaWQ6IHN0cmluZyxcbiAgdGl0bGU6IHN0cmluZyxcbiAgY2xhc3M6IFF1ZXN0aW9uRmFjdG9yeSB8IFF1ZXN0aW9uQ2xhc3Ncbn1cblxudHlwZSBUb3BpY0xpc3QgPSAoU2VjdGlvblRpdGxlIHwgVG9waWMpW11cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVG9waWModDogU2VjdGlvblRpdGxlIHwgVG9waWMpOiB0IGlzIFRvcGljIHtcbiAgcmV0dXJuICgodCBhcyBUb3BpYykuaWQgIT09IHVuZGVmaW5lZClcbn1cblxuY29uc3QgdG9waWNMaXN0OiBUb3BpY0xpc3QgPSBbXG4gIHtzZWN0aW9uOiAnTnVtYmVyJ30sXG4gIHtcbiAgICBpZDogJ2ludGVnZXItYWRkJyxcbiAgICB0aXRsZTogJ0ludGVnZXIgYWRkaXRpb24nLFxuICAgIGNsYXNzOiBJbnRlZ2VyQWRkUVxuICB9LFxuICB7XG4gICAgaWQ6ICdmcmFjdGlvbi1hZGQnLFxuICAgIHRpdGxlOiAnRnJhY3Rpb25zIC0gYWRkaXRpb24nLFxuICAgIGNsYXNzOiBGcmFjdGlvbkFkZFFcbiAgfSxcbiAge1xuICAgIGlkOiAnYmFybW9kZWwnLFxuICAgIHRpdGxlOiAnUGFydGl0aW9uIHByb2JsZW1zIChiYXIgbW9kZWxzKScsXG4gICAgY2xhc3M6IFBhcnRpdGlvblFcbiAgfSxcbiAge3NlY3Rpb246ICdBbGdlYnJhJ30sXG4gIHtcbiAgICBpZDogJ2FsZ2VicmFpYy1mcmFjdGlvbicsXG4gICAgdGl0bGU6ICdTaW1wbGlmeSBhbGdlYnJhaWMgZnJhY3Rpb25zJyxcbiAgICBjbGFzczogQWxnZWJyYWljRnJhY3Rpb25RXG4gIH0sXG4gIHtcbiAgICBpZDogJ2VxdWF0aW9uLW9mLWxpbmUnLFxuICAgIHRpdGxlOiAnRXF1YXRpb24gb2YgYSBsaW5lIChmcm9tIHR3byBwb2ludHMpJyxcbiAgICBjbGFzczogRXF1YXRpb25PZkxpbmVcbiAgfSxcbiAge3NlY3Rpb246ICdHZW9tZXRyeSd9LFxuICB7XG4gICAgaWQ6ICdtaXNzaW5nLWFuZ2xlcycsXG4gICAgdGl0bGU6ICdNaXNzaW5nIGFuZ2xlcycsXG4gICAgY2xhc3M6IE1pc3NpbmdBbmdsZXNRXG4gIH0sXG4gIHtcbiAgICBpZDogJ2FyZWEtcGVyaW10ZXInLFxuICAgIHRpdGxlOiAnQXJlYSBhbmQgcGVyaW1ldGVyIG9mIHNoYXBlcycsXG4gICAgY2xhc3M6IEFyZWFQZXJpbWV0ZXJRXG4gIH0sXG4gIHtzZWN0aW9uOiAnT3RoZXInfSxcbiAge1xuICAgIGlkOiAnYXJpdGhtYWdvbi1hZGQnLFxuICAgIHRpdGxlOiAnQXJpdGhtYWdvbnMnLFxuICAgIGNsYXNzOiAoQXJpdGhtYWdvblEgYXMgUXVlc3Rpb25DbGFzcylcbiAgfVxuXVxuXG5mdW5jdGlvbiBnZXRDbGFzcyAoaWQ6IHN0cmluZykge1xuICAvLyBSZXR1cm4gdGhlIGNsYXNzIGdpdmVuIGFuIGlkIG9mIGEgcXVlc3Rpb25cblxuICAvLyBPYnZpb3VzbHkgdGhpcyBpcyBhbiBpbmVmZmljaWVudCBzZWFyY2gsIGJ1dCB3ZSBkb24ndCBuZWVkIG1hc3NpdmUgcGVyZm9ybWFuY2VcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b3BpY0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCB0b3BpYyA9IHRvcGljTGlzdFtpXVxuICAgIGlmIChpc1RvcGljKHRvcGljKSAmJiB0b3BpYy5pZCA9PT0gaWQpIHtcbiAgICAgIHJldHVybiB0b3BpYy5jbGFzc1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbFxufVxuXG5mdW5jdGlvbiBnZXRUaXRsZSAoaWQ6IHN0cmluZykgOiBzdHJpbmd8dW5kZWZpbmVke1xuICAvLyBSZXR1cm4gdGl0bGUgb2YgYSBnaXZlbiBpZFxuICBjb25zdCB0b3BpYyA9IHRvcGljTGlzdC5maW5kKHQgPT4gKGlzVG9waWModCkgJiYgdC5pZCA9PT0gaWQpKVxuICBpZiAodG9waWMgIT09IHVuZGVmaW5lZCAmJiBpc1RvcGljKHRvcGljKSkge1xuICAgIHJldHVybiB0b3BpYy50aXRsZVxuICB9IGVsc2Uge1xuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxufVxuXG4vKipcbiAqIEdldHMgY29tbWFuZCB3b3JkIGZyb20gYSB0b3BpYyBpZFxuICogQHBhcmFtIHtzdHJpbmd9IGlkIFRoZSB0b3BpYyBpZFxuICogQHJldHVybnMge3N0cmluZ30gQ29tbWFuZCB3b3JkLiBSZXR1cm5zIFwiXCIgaWYgbm8gdG9waWMgd2l0aCBpZFxuICovXG5mdW5jdGlvbiBnZXRDb21tYW5kV29yZCAoaWQ6IHN0cmluZykge1xuICBjb25zdCB0b3BpY0NsYXNzID0gZ2V0Q2xhc3MoaWQpXG4gIGlmICh0b3BpY0NsYXNzID09PSBudWxsKSB7XG4gICAgcmV0dXJuICcnXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRvcGljQ2xhc3MuY29tbWFuZFdvcmRcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRUb3BpY3MgKCkgOiAoT21pdDxUb3BpYywnY2xhc3MnPiB8IFNlY3Rpb25UaXRsZSlbXSB7XG4gIC8vIHJldHVybnMgdG9waWNzIHdpdGggY2xhc3NlcyBzdHJpcHBlZCBvdXRcbiAgcmV0dXJuIHRvcGljTGlzdC5tYXAoeCA9PiB7XG4gICAgaWYgKGlzVG9waWMoeCkpIHtcbiAgICAgIHJldHVybiB7dGl0bGU6IHgudGl0bGUsIGlkOiB4LmlkfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4geFxuICAgIH1cbiAgfSlcbn1cblxuZnVuY3Rpb24gbmV3UXVlc3Rpb24gKGlkOiBzdHJpbmcsIG9wdGlvbnM6IE9wdGlvbnMpIDogUXVlc3Rpb24gfCB1bmRlZmluZWQge1xuICAvLyB0byBhdm9pZCB3cml0aW5nIGBsZXQgcSA9IG5ldyAoVG9waWNDaG9vc2VyLmdldENsYXNzKGlkKSkob3B0aW9ucylcbiAgY29uc3QgUXVlc3Rpb25DbGFzcyA9IGdldENsYXNzKGlkKVxuICBsZXQgcXVlc3Rpb25cbiAgaWYgKFF1ZXN0aW9uQ2xhc3MgJiYgJ3JhbmRvbScgaW4gUXVlc3Rpb25DbGFzcykge1xuICAgIHF1ZXN0aW9uID0gUXVlc3Rpb25DbGFzcy5yYW5kb20ob3B0aW9ucylcbiAgfSBlbHNlIGlmIChRdWVzdGlvbkNsYXNzKXtcbiAgICBxdWVzdGlvbiA9IG5ldyBRdWVzdGlvbkNsYXNzKG9wdGlvbnMpXG4gIH1cbiAgcmV0dXJuIHF1ZXN0aW9uXG59XG5cbmZ1bmN0aW9uIG5ld09wdGlvbnNTZXQgKGlkOiBzdHJpbmcpIHtcbiAgY29uc3Qgb3B0aW9uc1NwZWMgPSAoZ2V0Q2xhc3MoaWQpKT8ub3B0aW9uc1NwZWMgfHwgW11cbiAgcmV0dXJuIG5ldyBPcHRpb25zU2V0KG9wdGlvbnNTcGVjKVxufVxuXG5mdW5jdGlvbiBoYXNPcHRpb25zIChpZDogc3RyaW5nKSB7XG4gIGNvbnN0IGNsID0gZ2V0Q2xhc3MoaWQpXG4gIGlmIChjbD09PW51bGwpIHJldHVybiBmYWxzZVxuICByZXR1cm4gISEoY2wub3B0aW9uc1NwZWMgJiYgY2wub3B0aW9uc1NwZWMubGVuZ3RoID4gMClcbn1cblxuZXhwb3J0IHsgdG9waWNMaXN0LCBnZXRDbGFzcywgbmV3UXVlc3Rpb24sIGdldFRvcGljcywgZ2V0VGl0bGUsIG5ld09wdGlvbnNTZXQsIGdldENvbW1hbmRXb3JkLCBoYXNPcHRpb25zIH1cbiIsIiFmdW5jdGlvbih0LG8pe1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUobyk6XCJvYmplY3RcIj09dHlwZW9mIGV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9bygpOnQudGluZ2xlPW8oKX0odGhpcyxmdW5jdGlvbigpe3ZhciBvPSExO2Z1bmN0aW9uIHQodCl7dGhpcy5vcHRzPWZ1bmN0aW9uKCl7Zm9yKHZhciB0PTE7dDxhcmd1bWVudHMubGVuZ3RoO3QrKylmb3IodmFyIG8gaW4gYXJndW1lbnRzW3RdKWFyZ3VtZW50c1t0XS5oYXNPd25Qcm9wZXJ0eShvKSYmKGFyZ3VtZW50c1swXVtvXT1hcmd1bWVudHNbdF1bb10pO3JldHVybiBhcmd1bWVudHNbMF19KHt9LHtvbkNsb3NlOm51bGwsb25PcGVuOm51bGwsYmVmb3JlT3BlbjpudWxsLGJlZm9yZUNsb3NlOm51bGwsc3RpY2t5Rm9vdGVyOiExLGZvb3RlcjohMSxjc3NDbGFzczpbXSxjbG9zZUxhYmVsOlwiQ2xvc2VcIixjbG9zZU1ldGhvZHM6W1wib3ZlcmxheVwiLFwiYnV0dG9uXCIsXCJlc2NhcGVcIl19LHQpLHRoaXMuaW5pdCgpfWZ1bmN0aW9uIGUoKXt0aGlzLm1vZGFsQm94Rm9vdGVyJiYodGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS53aWR0aD10aGlzLm1vZGFsQm94LmNsaWVudFdpZHRoK1wicHhcIix0aGlzLm1vZGFsQm94Rm9vdGVyLnN0eWxlLmxlZnQ9dGhpcy5tb2RhbEJveC5vZmZzZXRMZWZ0K1wicHhcIil9cmV0dXJuIHQucHJvdG90eXBlLmluaXQ9ZnVuY3Rpb24oKXtpZighdGhpcy5tb2RhbClyZXR1cm4gZnVuY3Rpb24oKXt0aGlzLm1vZGFsPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiksdGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsXCIpLDAhPT10aGlzLm9wdHMuY2xvc2VNZXRob2RzLmxlbmd0aCYmLTEhPT10aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoXCJvdmVybGF5XCIpfHx0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoXCJ0aW5nbGUtbW9kYWwtLW5vT3ZlcmxheUNsb3NlXCIpO3RoaXMubW9kYWwuc3R5bGUuZGlzcGxheT1cIm5vbmVcIix0aGlzLm9wdHMuY3NzQ2xhc3MuZm9yRWFjaChmdW5jdGlvbih0KXtcInN0cmluZ1wiPT10eXBlb2YgdCYmdGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKHQpfSx0aGlzKSwtMSE9PXRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZihcImJ1dHRvblwiKSYmKHRoaXMubW9kYWxDbG9zZUJ0bj1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpLHRoaXMubW9kYWxDbG9zZUJ0bi50eXBlPVwiYnV0dG9uXCIsdGhpcy5tb2RhbENsb3NlQnRuLmNsYXNzTGlzdC5hZGQoXCJ0aW5nbGUtbW9kYWxfX2Nsb3NlXCIpLHRoaXMubW9kYWxDbG9zZUJ0bkljb249ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIiksdGhpcy5tb2RhbENsb3NlQnRuSWNvbi5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsX19jbG9zZUljb25cIiksdGhpcy5tb2RhbENsb3NlQnRuSWNvbi5pbm5lckhUTUw9Jzxzdmcgdmlld0JveD1cIjAgMCAxMCAxMFwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj48cGF0aCBkPVwiTS4zIDkuN2MuMi4yLjQuMy43LjMuMyAwIC41LS4xLjctLjNMNSA2LjRsMy4zIDMuM2MuMi4yLjUuMy43LjMuMiAwIC41LS4xLjctLjMuNC0uNC40LTEgMC0xLjRMNi40IDVsMy4zLTMuM2MuNC0uNC40LTEgMC0xLjQtLjQtLjQtMS0uNC0xLjQgMEw1IDMuNiAxLjcuM0MxLjMtLjEuNy0uMS4zLjNjLS40LjQtLjQgMSAwIDEuNEwzLjYgNSAuMyA4LjNjLS40LjQtLjQgMSAwIDEuNHpcIiBmaWxsPVwiIzAwMFwiIGZpbGwtcnVsZT1cIm5vbnplcm9cIi8+PC9zdmc+Jyx0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKSx0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbC5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsX19jbG9zZUxhYmVsXCIpLHRoaXMubW9kYWxDbG9zZUJ0bkxhYmVsLmlubmVySFRNTD10aGlzLm9wdHMuY2xvc2VMYWJlbCx0aGlzLm1vZGFsQ2xvc2VCdG4uYXBwZW5kQ2hpbGQodGhpcy5tb2RhbENsb3NlQnRuSWNvbiksdGhpcy5tb2RhbENsb3NlQnRuLmFwcGVuZENoaWxkKHRoaXMubW9kYWxDbG9zZUJ0bkxhYmVsKSk7dGhpcy5tb2RhbEJveD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpLHRoaXMubW9kYWxCb3guY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbC1ib3hcIiksdGhpcy5tb2RhbEJveENvbnRlbnQ9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKSx0aGlzLm1vZGFsQm94Q29udGVudC5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsLWJveF9fY29udGVudFwiKSx0aGlzLm1vZGFsQm94LmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3hDb250ZW50KSwtMSE9PXRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZihcImJ1dHRvblwiKSYmdGhpcy5tb2RhbC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQ2xvc2VCdG4pO3RoaXMubW9kYWwuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveCl9LmNhbGwodGhpcyksZnVuY3Rpb24oKXt0aGlzLl9ldmVudHM9e2NsaWNrQ2xvc2VCdG46dGhpcy5jbG9zZS5iaW5kKHRoaXMpLGNsaWNrT3ZlcmxheTpmdW5jdGlvbih0KXt2YXIgbz10aGlzLm1vZGFsLm9mZnNldFdpZHRoLXRoaXMubW9kYWwuY2xpZW50V2lkdGgsZT10LmNsaWVudFg+PXRoaXMubW9kYWwub2Zmc2V0V2lkdGgtMTUscz10aGlzLm1vZGFsLnNjcm9sbEhlaWdodCE9PXRoaXMubW9kYWwub2Zmc2V0SGVpZ2h0O2lmKFwiTWFjSW50ZWxcIj09PW5hdmlnYXRvci5wbGF0Zm9ybSYmMD09byYmZSYmcylyZXR1cm47LTEhPT10aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoXCJvdmVybGF5XCIpJiYhZnVuY3Rpb24odCxvKXtmb3IoOyh0PXQucGFyZW50RWxlbWVudCkmJiF0LmNsYXNzTGlzdC5jb250YWlucyhvKTspO3JldHVybiB0fSh0LnRhcmdldCxcInRpbmdsZS1tb2RhbFwiKSYmdC5jbGllbnRYPHRoaXMubW9kYWwuY2xpZW50V2lkdGgmJnRoaXMuY2xvc2UoKX0uYmluZCh0aGlzKSxyZXNpemU6dGhpcy5jaGVja092ZXJmbG93LmJpbmQodGhpcyksa2V5Ym9hcmROYXY6ZnVuY3Rpb24odCl7LTEhPT10aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoXCJlc2NhcGVcIikmJjI3PT09dC53aGljaCYmdGhpcy5pc09wZW4oKSYmdGhpcy5jbG9zZSgpfS5iaW5kKHRoaXMpfSwtMSE9PXRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZihcImJ1dHRvblwiKSYmdGhpcy5tb2RhbENsb3NlQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLHRoaXMuX2V2ZW50cy5jbGlja0Nsb3NlQnRuKTt0aGlzLm1vZGFsLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIix0aGlzLl9ldmVudHMuY2xpY2tPdmVybGF5KSx3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLHRoaXMuX2V2ZW50cy5yZXNpemUpLGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsdGhpcy5fZXZlbnRzLmtleWJvYXJkTmF2KX0uY2FsbCh0aGlzKSxkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMubW9kYWwsZG9jdW1lbnQuYm9keS5maXJzdENoaWxkKSx0aGlzLm9wdHMuZm9vdGVyJiZ0aGlzLmFkZEZvb3RlcigpLHRoaXN9LHQucHJvdG90eXBlLl9idXN5PWZ1bmN0aW9uKHQpe289dH0sdC5wcm90b3R5cGUuX2lzQnVzeT1mdW5jdGlvbigpe3JldHVybiBvfSx0LnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7bnVsbCE9PXRoaXMubW9kYWwmJih0aGlzLmlzT3BlbigpJiZ0aGlzLmNsb3NlKCEwKSxmdW5jdGlvbigpey0xIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKFwiYnV0dG9uXCIpJiZ0aGlzLm1vZGFsQ2xvc2VCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsdGhpcy5fZXZlbnRzLmNsaWNrQ2xvc2VCdG4pO3RoaXMubW9kYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLHRoaXMuX2V2ZW50cy5jbGlja092ZXJsYXkpLHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwicmVzaXplXCIsdGhpcy5fZXZlbnRzLnJlc2l6ZSksZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIix0aGlzLl9ldmVudHMua2V5Ym9hcmROYXYpfS5jYWxsKHRoaXMpLHRoaXMubW9kYWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLm1vZGFsKSx0aGlzLm1vZGFsPW51bGwpfSx0LnByb3RvdHlwZS5pc09wZW49ZnVuY3Rpb24oKXtyZXR1cm4hIXRoaXMubW9kYWwuY2xhc3NMaXN0LmNvbnRhaW5zKFwidGluZ2xlLW1vZGFsLS12aXNpYmxlXCIpfSx0LnByb3RvdHlwZS5vcGVuPWZ1bmN0aW9uKCl7aWYoIXRoaXMuX2lzQnVzeSgpKXt0aGlzLl9idXN5KCEwKTt2YXIgdD10aGlzO3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIHQub3B0cy5iZWZvcmVPcGVuJiZ0Lm9wdHMuYmVmb3JlT3BlbigpLHRoaXMubW9kYWwuc3R5bGUucmVtb3ZlUHJvcGVydHk/dGhpcy5tb2RhbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eShcImRpc3BsYXlcIik6dGhpcy5tb2RhbC5zdHlsZS5yZW1vdmVBdHRyaWJ1dGUoXCJkaXNwbGF5XCIpLHRoaXMuX3Njcm9sbFBvc2l0aW9uPXdpbmRvdy5wYWdlWU9mZnNldCxkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5hZGQoXCJ0aW5nbGUtZW5hYmxlZFwiKSxkb2N1bWVudC5ib2R5LnN0eWxlLnRvcD0tdGhpcy5fc2Nyb2xsUG9zaXRpb24rXCJweFwiLHRoaXMuc2V0U3RpY2t5Rm9vdGVyKHRoaXMub3B0cy5zdGlja3lGb290ZXIpLHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbC0tdmlzaWJsZVwiKSxcImZ1bmN0aW9uXCI9PXR5cGVvZiB0Lm9wdHMub25PcGVuJiZ0Lm9wdHMub25PcGVuLmNhbGwodCksdC5fYnVzeSghMSksdGhpcy5jaGVja092ZXJmbG93KCksdGhpc319LHQucHJvdG90eXBlLmNsb3NlPWZ1bmN0aW9uKHQpe2lmKCF0aGlzLl9pc0J1c3koKSl7aWYodGhpcy5fYnVzeSghMCksITEsXCJmdW5jdGlvblwiPT10eXBlb2YgdGhpcy5vcHRzLmJlZm9yZUNsb3NlKWlmKCF0aGlzLm9wdHMuYmVmb3JlQ2xvc2UuY2FsbCh0aGlzKSlyZXR1cm4gdm9pZCB0aGlzLl9idXN5KCExKTtkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoXCJ0aW5nbGUtZW5hYmxlZFwiKSxkb2N1bWVudC5ib2R5LnN0eWxlLnRvcD1udWxsLHdpbmRvdy5zY3JvbGxUbyh7dG9wOnRoaXMuX3Njcm9sbFBvc2l0aW9uLGJlaGF2aW9yOlwiaW5zdGFudFwifSksdGhpcy5tb2RhbC5jbGFzc0xpc3QucmVtb3ZlKFwidGluZ2xlLW1vZGFsLS12aXNpYmxlXCIpO3ZhciBvPXRoaXM7by5tb2RhbC5zdHlsZS5kaXNwbGF5PVwibm9uZVwiLFwiZnVuY3Rpb25cIj09dHlwZW9mIG8ub3B0cy5vbkNsb3NlJiZvLm9wdHMub25DbG9zZS5jYWxsKHRoaXMpLG8uX2J1c3koITEpfX0sdC5wcm90b3R5cGUuc2V0Q29udGVudD1mdW5jdGlvbih0KXtyZXR1cm5cInN0cmluZ1wiPT10eXBlb2YgdD90aGlzLm1vZGFsQm94Q29udGVudC5pbm5lckhUTUw9dDoodGhpcy5tb2RhbEJveENvbnRlbnQuaW5uZXJIVE1MPVwiXCIsdGhpcy5tb2RhbEJveENvbnRlbnQuYXBwZW5kQ2hpbGQodCkpLHRoaXMuaXNPcGVuKCkmJnRoaXMuY2hlY2tPdmVyZmxvdygpLHRoaXN9LHQucHJvdG90eXBlLmdldENvbnRlbnQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5tb2RhbEJveENvbnRlbnR9LHQucHJvdG90eXBlLmFkZEZvb3Rlcj1mdW5jdGlvbigpe3JldHVybiBmdW5jdGlvbigpe3RoaXMubW9kYWxCb3hGb290ZXI9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKSx0aGlzLm1vZGFsQm94Rm9vdGVyLmNsYXNzTGlzdC5hZGQoXCJ0aW5nbGUtbW9kYWwtYm94X19mb290ZXJcIiksdGhpcy5tb2RhbEJveC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKX0uY2FsbCh0aGlzKSx0aGlzfSx0LnByb3RvdHlwZS5zZXRGb290ZXJDb250ZW50PWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLm1vZGFsQm94Rm9vdGVyLmlubmVySFRNTD10LHRoaXN9LHQucHJvdG90eXBlLmdldEZvb3RlckNvbnRlbnQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5tb2RhbEJveEZvb3Rlcn0sdC5wcm90b3R5cGUuc2V0U3RpY2t5Rm9vdGVyPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmlzT3ZlcmZsb3coKXx8KHQ9ITEpLHQ/dGhpcy5tb2RhbEJveC5jb250YWlucyh0aGlzLm1vZGFsQm94Rm9vdGVyKSYmKHRoaXMubW9kYWxCb3gucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlciksdGhpcy5tb2RhbC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKSx0aGlzLm1vZGFsQm94Rm9vdGVyLmNsYXNzTGlzdC5hZGQoXCJ0aW5nbGUtbW9kYWwtYm94X19mb290ZXItLXN0aWNreVwiKSxlLmNhbGwodGhpcyksdGhpcy5tb2RhbEJveENvbnRlbnQuc3R5bGVbXCJwYWRkaW5nLWJvdHRvbVwiXT10aGlzLm1vZGFsQm94Rm9vdGVyLmNsaWVudEhlaWdodCsyMCtcInB4XCIpOnRoaXMubW9kYWxCb3hGb290ZXImJih0aGlzLm1vZGFsQm94LmNvbnRhaW5zKHRoaXMubW9kYWxCb3hGb290ZXIpfHwodGhpcy5tb2RhbC5yZW1vdmVDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKSx0aGlzLm1vZGFsQm94LmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpLHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUud2lkdGg9XCJhdXRvXCIsdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS5sZWZ0PVwiXCIsdGhpcy5tb2RhbEJveENvbnRlbnQuc3R5bGVbXCJwYWRkaW5nLWJvdHRvbVwiXT1cIlwiLHRoaXMubW9kYWxCb3hGb290ZXIuY2xhc3NMaXN0LnJlbW92ZShcInRpbmdsZS1tb2RhbC1ib3hfX2Zvb3Rlci0tc3RpY2t5XCIpKSksdGhpc30sdC5wcm90b3R5cGUuYWRkRm9vdGVyQnRuPWZ1bmN0aW9uKHQsbyxlKXt2YXIgcz1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO3JldHVybiBzLmlubmVySFRNTD10LHMuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsZSksXCJzdHJpbmdcIj09dHlwZW9mIG8mJm8ubGVuZ3RoJiZvLnNwbGl0KFwiIFwiKS5mb3JFYWNoKGZ1bmN0aW9uKHQpe3MuY2xhc3NMaXN0LmFkZCh0KX0pLHRoaXMubW9kYWxCb3hGb290ZXIuYXBwZW5kQ2hpbGQocyksc30sdC5wcm90b3R5cGUucmVzaXplPWZ1bmN0aW9uKCl7Y29uc29sZS53YXJuKFwiUmVzaXplIGlzIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiB2ZXJzaW9uIDEuMFwiKX0sdC5wcm90b3R5cGUuaXNPdmVyZmxvdz1mdW5jdGlvbigpe3JldHVybiB3aW5kb3cuaW5uZXJIZWlnaHQ8PXRoaXMubW9kYWxCb3guY2xpZW50SGVpZ2h0fSx0LnByb3RvdHlwZS5jaGVja092ZXJmbG93PWZ1bmN0aW9uKCl7dGhpcy5tb2RhbC5jbGFzc0xpc3QuY29udGFpbnMoXCJ0aW5nbGUtbW9kYWwtLXZpc2libGVcIikmJih0aGlzLmlzT3ZlcmZsb3coKT90aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoXCJ0aW5nbGUtbW9kYWwtLW92ZXJmbG93XCIpOnRoaXMubW9kYWwuY2xhc3NMaXN0LnJlbW92ZShcInRpbmdsZS1tb2RhbC0tb3ZlcmZsb3dcIiksIXRoaXMuaXNPdmVyZmxvdygpJiZ0aGlzLm9wdHMuc3RpY2t5Rm9vdGVyP3RoaXMuc2V0U3RpY2t5Rm9vdGVyKCExKTp0aGlzLmlzT3ZlcmZsb3coKSYmdGhpcy5vcHRzLnN0aWNreUZvb3RlciYmKGUuY2FsbCh0aGlzKSx0aGlzLnNldFN0aWNreUZvb3RlcighMCkpKX0se21vZGFsOnR9fSk7IiwiaW1wb3J0IFJTbGlkZXIgZnJvbSAndmVuZG9yL3JzbGlkZXInXG5pbXBvcnQgT3B0aW9uc1NldCBmcm9tICdPcHRpb25zU2V0J1xuaW1wb3J0ICogYXMgVG9waWNDaG9vc2VyIGZyb20gJ1RvcGljQ2hvb3NlcidcbmltcG9ydCB7IG1vZGFsIGFzIFRNb2RhbCB9IGZyb20gJ3RpbmdsZS5qcydcbmltcG9ydCB7IHJhbmRFbGVtLCBjcmVhdGVFbGVtLCBoYXNBbmNlc3RvckNsYXNzLCBib29sT2JqZWN0VG9BcnJheSB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbi9RdWVzdGlvbidcbmltcG9ydCB7IE9wdGlvbnNTcGVjIH0gZnJvbSAnT3B0aW9uc1NwZWMnXG5cbmRlY2xhcmUgZ2xvYmFsIHtcbiAgaW50ZXJmYWNlIFdpbmRvdyB7XG4gICAgU0hPV19ESUZGSUNVTFRZOiBib29sZWFuXG4gIH1cbn1cbndpbmRvdy5TSE9XX0RJRkZJQ1VMVFkgPSBmYWxzZSAvLyBmb3IgZGVidWdnaW5nIHF1ZXN0aW9uc1xuXG4vKiBUeXBlcyAqL1xuaW50ZXJmYWNlIFF1ZXN0aW9uSW5mbyB7XG4gIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXG4gIHF1ZXN0aW9uPzogUXVlc3Rpb24sXG4gIHRvcGljSWQ/OiBzdHJpbmcsXG59XG5cbi8vIE1ha2UgYW4gb3ZlcmxheSB0byBjYXB0dXJlIGFueSBjbGlja3Mgb3V0c2lkZSBib3hlcywgaWYgbmVjZXNzYXJ5XG5jcmVhdGVFbGVtKCdkaXYnLCAnb3ZlcmxheSBoaWRkZW4nLCBkb2N1bWVudC5ib2R5KS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGhpZGVBbGxBY3Rpb25zKVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBRdWVzdGlvblNldCB7XG4gIC8vIFRoZSBtYWluIHF1ZXN0aW9uXG4gIHFOdW1iZXI6IG51bWJlclxuICBhbnN3ZXJlZDogYm9vbGVhblxuICBjb21tYW5kV29yZDogc3RyaW5nXG4gIHVzZUNvbW1hbmRXb3JkOiBib29sZWFuXG5cbiAgLy8gcXVlc3Rpb25zIGFuZCB0aGVpciBvcHRpb25zXG4gIG46IG51bWJlciAvLyBOdW1iZXIgb2YgcXVlc3Rpb25zXG4gIHF1ZXN0aW9uczogUXVlc3Rpb25JbmZvW10gLy8gbGlzdCBvZiBxdWVzdGlvbnMgYW5kIHRoZSBET00gZWxlbWVudCB0aGV5J3JlIHJlbmRlcmVkIGluXG4gIHRvcGljc09wdGlvbnMhOiBPcHRpb25zU2V0IC8vIE9wdGlvbnNTZXQgb2JqZWN0IGZvciBjaG9vc2luZyB0b3BpY3NcbiAgdG9waWNzTW9kYWwhOiBUTW9kYWwgLy8gQSBtb2RhbCBkaWFsb2cgZm9yIGRpc3BsYXlpbmcgdG9waWNzT3B0aW9uc1xuICB0b3BpY3M6IHN0cmluZ1tdIC8vIExpc3Qgb2Ygc2VsZWN0ZWQgdG9waWMgSWRzXG4gIG9wdGlvbnNTZXRzOiBSZWNvcmQ8c3RyaW5nLCBPcHRpb25zU2V0PiAvLyBtYXAgZnJvbSB0b3BpYyBpZHMgdG8gdGhlaXIgb3B0aW9ucyBzZXRcblxuICAvLyBVSSBlbGVtZW50c1xuICB0b3BpY0Nob29zZXJCdXR0b24hOiBIVE1MRWxlbWVudCAvLyBUaGUgYnV0dG9uIHRvIG9wZW4gdGhlIHRvcGljIGNob29zZXJcbiAgZGlmZmljdWx0eVNsaWRlckVsZW1lbnQhOiBIVE1MSW5wdXRFbGVtZW50XG4gIGRpZmZpY3VsdHlTbGlkZXIhOiBSU2xpZGVyXG4gIGdlbmVyYXRlQnV0dG9uITogSFRNTEJ1dHRvbkVsZW1lbnRcbiAgYW5zd2VyQnV0dG9uITogSFRNTEVsZW1lbnRcblxuICAvLyBET00gZWxlbWVudHMgLSBpbml0aWFsaXNlZCBpbiBfYnVpbGQoKSwgY2FsbGVkIGZyb20gY29uc3RydWN0b3JcbiAgaGVhZGVyQm94ITogSFRNTEVsZW1lbnRcbiAgb3V0ZXJCb3ghOiBIVE1MRWxlbWVudFxuICBkaXNwbGF5Qm94ITogSFRNTEVsZW1lbnRcblxuICBjb25zdHJ1Y3RvciAocU51bWJlcjogbnVtYmVyKSB7XG4gICAgdGhpcy5xdWVzdGlvbnMgPSBbXSAvLyBsaXN0IG9mIHF1ZXN0aW9ucyBhbmQgdGhlIERPTSBlbGVtZW50IHRoZXkncmUgcmVuZGVyZWQgaW5cbiAgICB0aGlzLnRvcGljcyA9IFtdIC8vIGxpc3Qgb2YgdG9waWNzIHdoaWNoIGhhdmUgYmVlbiBzZWxlY3RlZCBmb3IgdGhpcyBzZXRcbiAgICB0aGlzLm9wdGlvbnNTZXRzID0ge30gLy8gbGlzdCBvZiBPcHRpb25zU2V0IG9iamVjdHMgY2Fycnlpbmcgb3B0aW9ucyBmb3IgdG9waWNzIHdpdGggb3B0aW9uc1xuICAgIHRoaXMucU51bWJlciA9IHFOdW1iZXIgfHwgMSAvLyBRdWVzdGlvbiBudW1iZXIgKHBhc3NlZCBpbiBieSBjYWxsZXIsIHdoaWNoIHdpbGwga2VlcCBjb3VudClcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2UgLy8gV2hldGhlciBhbnN3ZXJlZCBvciBub3RcbiAgICB0aGlzLmNvbW1hbmRXb3JkID0gJycgLy8gU29tZXRoaW5nIGxpa2UgJ3NpbXBsaWZ5J1xuICAgIHRoaXMudXNlQ29tbWFuZFdvcmQgPSB0cnVlIC8vIFVzZSB0aGUgY29tbWFuZCB3b3JkIGluIHRoZSBtYWluIHF1ZXN0aW9uLCBmYWxzZSBnaXZlIGNvbW1hbmQgd29yZCB3aXRoIGVhY2ggc3VicXVlc3Rpb25cbiAgICB0aGlzLm4gPSA4IC8vIE51bWJlciBvZiBxdWVzdGlvbnNcblxuICAgIHRoaXMuX2J1aWxkKClcbiAgfVxuXG4gIF9idWlsZCAoKSB7XG4gICAgdGhpcy5vdXRlckJveCA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1vdXRlcmJveCcpXG4gICAgdGhpcy5oZWFkZXJCb3ggPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24taGVhZGVyYm94JywgdGhpcy5vdXRlckJveClcbiAgICB0aGlzLmRpc3BsYXlCb3ggPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tZGlzcGxheWJveCcsIHRoaXMub3V0ZXJCb3gpXG5cbiAgICB0aGlzLl9idWlsZE9wdGlvbnNCb3goKVxuICAgIHRoaXMuX2J1aWxkVG9waWNDaG9vc2VyKClcbiAgfVxuXG4gIF9idWlsZE9wdGlvbnNCb3ggKCkge1xuICAgIGNvbnN0IHRvcGljU3BhbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCB1bmRlZmluZWQsIHRoaXMuaGVhZGVyQm94KVxuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uID0gY3JlYXRlRWxlbSgnc3BhbicsICd0b3BpYy1jaG9vc2VyIGJ1dHRvbicsIHRvcGljU3BhbilcbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbi5pbm5lckhUTUwgPSAnQ2hvb3NlIHRvcGljJ1xuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5jaG9vc2VUb3BpY3MoKSlcblxuICAgIGNvbnN0IGRpZmZpY3VsdHlTcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIHVuZGVmaW5lZCwgdGhpcy5oZWFkZXJCb3gpXG4gICAgZGlmZmljdWx0eVNwYW4uYXBwZW5kKCdEaWZmaWN1bHR5OiAnKVxuICAgIGNvbnN0IGRpZmZpY3VsdHlTbGlkZXJPdXRlciA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCAnc2xpZGVyLW91dGVyJywgZGlmZmljdWx0eVNwYW4pXG4gICAgdGhpcy5kaWZmaWN1bHR5U2xpZGVyRWxlbWVudCA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgdW5kZWZpbmVkLCBkaWZmaWN1bHR5U2xpZGVyT3V0ZXIpIGFzIEhUTUxJbnB1dEVsZW1lbnRcblxuICAgIGNvbnN0IG5TcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIHVuZGVmaW5lZCwgdGhpcy5oZWFkZXJCb3gpXG4gICAgblNwYW4uYXBwZW5kKCdOdW1iZXIgb2YgcXVlc3Rpb25zOiAnKVxuICAgIGNvbnN0IG5RdWVzdGlvbnNJbnB1dCA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgJ24tcXVlc3Rpb25zJywgblNwYW4pIGFzIEhUTUxJbnB1dEVsZW1lbnRcbiAgICBuUXVlc3Rpb25zSW5wdXQudHlwZSA9ICdudW1iZXInXG4gICAgblF1ZXN0aW9uc0lucHV0Lm1pbiA9ICcxJ1xuICAgIG5RdWVzdGlvbnNJbnB1dC52YWx1ZSA9ICc4J1xuICAgIG5RdWVzdGlvbnNJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICB0aGlzLm4gPSBwYXJzZUludChuUXVlc3Rpb25zSW5wdXQudmFsdWUpXG4gICAgfSlcblxuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24gPSBjcmVhdGVFbGVtKCdidXR0b24nLCAnZ2VuZXJhdGUtYnV0dG9uIGJ1dHRvbicsIHRoaXMuaGVhZGVyQm94KSBhcyBIVE1MQnV0dG9uRWxlbWVudFxuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uZGlzYWJsZWQgPSB0cnVlXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5pbm5lckhUTUwgPSAnR2VuZXJhdGUhJ1xuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLmdlbmVyYXRlQWxsKCkpXG4gIH1cblxuICBfaW5pdFNsaWRlciAoKSB7XG4gICAgdGhpcy5kaWZmaWN1bHR5U2xpZGVyID0gbmV3IFJTbGlkZXIoe1xuICAgICAgdGFyZ2V0OiB0aGlzLmRpZmZpY3VsdHlTbGlkZXJFbGVtZW50LFxuICAgICAgdmFsdWVzOiB7IG1pbjogMSwgbWF4OiAxMCB9LFxuICAgICAgcmFuZ2U6IHRydWUsXG4gICAgICBzZXQ6IFsyLCA2XSxcbiAgICAgIHN0ZXA6IDEsXG4gICAgICB0b29sdGlwOiBmYWxzZSxcbiAgICAgIHNjYWxlOiB0cnVlLFxuICAgICAgbGFiZWxzOiB0cnVlXG4gICAgfSlcbiAgfVxuXG4gIF9idWlsZFRvcGljQ2hvb3NlciAoKSB7XG4gICAgLy8gYnVpbGQgYW4gT3B0aW9uc1NldCBvYmplY3QgZm9yIHRoZSB0b3BpY3NcbiAgICBjb25zdCB0b3BpY3MgPSBUb3BpY0Nob29zZXIuZ2V0VG9waWNzKClcbiAgICBjb25zdCBvcHRpb25zU3BlYzogT3B0aW9uc1NwZWMgPSBbXVxuICAgIHRvcGljcy5mb3JFYWNoKHRvcGljID0+IHtcbiAgICAgIGlmICgnc2VjdGlvbicgaW4gdG9waWMpIHtcbiAgICAgICAgb3B0aW9uc1NwZWMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ2hlYWRpbmcnLFxuICAgICAgICAgIHRpdGxlOiB0b3BpYy5zZWN0aW9uXG4gICAgICAgIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvcHRpb25zU3BlYy5wdXNoKHtcbiAgICAgICAgICB0aXRsZTogdG9waWMudGl0bGUsXG4gICAgICAgICAgaWQ6IHRvcGljLmlkLFxuICAgICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgICBzd2FwTGFiZWw6IHRydWVcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHRoaXMudG9waWNzT3B0aW9ucyA9IG5ldyBPcHRpb25zU2V0KG9wdGlvbnNTcGVjKVxuXG4gICAgLy8gQnVpbGQgYSBtb2RhbCBkaWFsb2cgdG8gcHV0IHRoZW0gaW5cbiAgICB0aGlzLnRvcGljc01vZGFsID0gbmV3IFRNb2RhbCh7XG4gICAgICBmb290ZXI6IHRydWUsXG4gICAgICBzdGlja3lGb290ZXI6IGZhbHNlLFxuICAgICAgY2xvc2VNZXRob2RzOiBbJ292ZXJsYXknLCAnZXNjYXBlJ10sXG4gICAgICBjbG9zZUxhYmVsOiAnQ2xvc2UnLFxuICAgICAgb25DbG9zZTogKCkgPT4ge1xuICAgICAgICB0aGlzLnVwZGF0ZVRvcGljcygpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoaXMudG9waWNzTW9kYWwuYWRkRm9vdGVyQnRuKFxuICAgICAgJ09LJyxcbiAgICAgICdidXR0b24gbW9kYWwtYnV0dG9uJyxcbiAgICAgICgpID0+IHtcbiAgICAgICAgdGhpcy50b3BpY3NNb2RhbC5jbG9zZSgpXG4gICAgICB9KVxuXG4gICAgLy8gcmVuZGVyIG9wdGlvbnMgaW50byBtb2RhbFxuICAgIHRoaXMudG9waWNzT3B0aW9ucy5yZW5kZXJJbih0aGlzLnRvcGljc01vZGFsLmdldENvbnRlbnQoKSlcblxuICAgIC8vIEFkZCBmdXJ0aGVyIG9wdGlvbnMgYnV0dG9uc1xuICAgIC8vIFRoaXMgZmVlbHMgYSBiaXQgaWZmeSAtIGRlcGVuZHMgdG9vIG11Y2ggb24gaW1wbGVtZW50YXRpb24gb2YgT3B0aW9uc1NldFxuICAgIGNvbnN0IGxpcyA9IEFycmF5LmZyb20odGhpcy50b3BpY3NNb2RhbC5nZXRDb250ZW50KCkuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2xpJykpXG4gICAgbGlzLmZvckVhY2gobGkgPT4ge1xuICAgICAgY29uc3QgdG9waWNJZCA9IGxpLmRhdGFzZXQub3B0aW9uSWRcbiAgICAgIGlmICh0b3BpY0lkICE9PSB1bmRlZmluZWQgJiYgVG9waWNDaG9vc2VyLmhhc09wdGlvbnModG9waWNJZCkpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9uc0J1dHRvbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdpY29uLWJ1dHRvbiBleHRyYS1vcHRpb25zLWJ1dHRvbicsIGxpKVxuICAgICAgICB0aGlzLl9idWlsZFRvcGljT3B0aW9ucyh0b3BpY0lkLCBvcHRpb25zQnV0dG9uKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBfYnVpbGRUb3BpY09wdGlvbnMgKHRvcGljSWQ6IHN0cmluZywgb3B0aW9uc0J1dHRvbjogSFRNTEVsZW1lbnQpIHtcbiAgICAvLyBCdWlsZCB0aGUgVUkgYW5kIE9wdGlvbnNTZXQgb2JqZWN0IGxpbmtlZCB0byB0b3BpY0lkLiBQYXNzIGluIGEgYnV0dG9uIHdoaWNoIHNob3VsZCBsYXVuY2ggaXRcblxuICAgIC8vIE1ha2UgdGhlIE9wdGlvbnNTZXQgb2JqZWN0IGFuZCBzdG9yZSBhIHJlZmVyZW5jZSB0byBpdFxuICAgIC8vIE9ubHkgc3RvcmUgaWYgb2JqZWN0IGlzIGNyZWF0ZWQ/XG4gICAgY29uc3Qgb3B0aW9uc1NldCA9IFRvcGljQ2hvb3Nlci5uZXdPcHRpb25zU2V0KHRvcGljSWQpXG4gICAgdGhpcy5vcHRpb25zU2V0c1t0b3BpY0lkXSA9IG9wdGlvbnNTZXRcblxuICAgIC8vIE1ha2UgYSBtb2RhbCBkaWFsb2cgZm9yIGl0XG4gICAgY29uc3QgbW9kYWwgPSBuZXcgVE1vZGFsKHtcbiAgICAgIGZvb3RlcjogdHJ1ZSxcbiAgICAgIHN0aWNreUZvb3RlcjogZmFsc2UsXG4gICAgICBjbG9zZU1ldGhvZHM6IFsnb3ZlcmxheScsICdlc2NhcGUnXSxcbiAgICAgIGNsb3NlTGFiZWw6ICdDbG9zZSdcbiAgICB9KVxuXG4gICAgbW9kYWwuYWRkRm9vdGVyQnRuKFxuICAgICAgJ09LJyxcbiAgICAgICdidXR0b24gbW9kYWwtYnV0dG9uJyxcbiAgICAgICgpID0+IHtcbiAgICAgICAgbW9kYWwuY2xvc2UoKVxuICAgICAgfSlcblxuICAgIG9wdGlvbnNTZXQucmVuZGVySW4obW9kYWwuZ2V0Q29udGVudCgpKVxuXG4gICAgLy8gbGluayB0aGUgbW9kYWwgdG8gdGhlIGJ1dHRvblxuICAgIG9wdGlvbnNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICBtb2RhbC5vcGVuKClcbiAgICB9KVxuICB9XG5cbiAgY2hvb3NlVG9waWNzICgpIHtcbiAgICB0aGlzLnRvcGljc01vZGFsLm9wZW4oKVxuICB9XG5cbiAgdXBkYXRlVG9waWNzICgpIHtcbiAgICAvLyB0b3BpYyBjaG9pY2VzIGFyZSBzdG9yZWQgaW4gdGhpcy50b3BpY3NPcHRpb25zIGF1dG9tYXRpY2FsbHlcbiAgICAvLyBwdWxsIHRoaXMgaW50byB0aGlzLnRvcGljcyBhbmQgdXBkYXRlIGJ1dHRvbiBkaXNwbGF5c1xuXG4gICAgLy8gaGF2ZSBvYmplY3Qgd2l0aCBib29sZWFuIHByb3BlcnRpZXMuIEp1c3Qgd2FudCB0aGUgdHJ1ZSB2YWx1ZXNcbiAgICBjb25zdCB0b3BpY3MgPSBib29sT2JqZWN0VG9BcnJheSh0aGlzLnRvcGljc09wdGlvbnMub3B0aW9ucylcbiAgICB0aGlzLnRvcGljcyA9IHRvcGljc1xuXG4gICAgbGV0IHRleHQ6IHN0cmluZ1xuXG4gICAgaWYgKHRvcGljcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRleHQgPSAnQ2hvb3NlIHRvcGljJyAvLyBub3RoaW5nIHNlbGVjdGVkXG4gICAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmRpc2FibGVkID0gdHJ1ZVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBpZCA9IHRvcGljc1swXSAvLyBmaXJzdCBpdGVtIHNlbGVjdGVkXG4gICAgICB0ZXh0ID0gVG9waWNDaG9vc2VyLmdldFRpdGxlKGlkKSA/PyAnJ1xuICAgICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlXG4gICAgfVxuXG4gICAgaWYgKHRvcGljcy5sZW5ndGggPiAxKSB7IC8vIGFueSBhZGRpdGlvbmFsIHNob3cgYXMgZS5nLiAnICsgMVxuICAgICAgdGV4dCArPSAnICsnICsgKHRvcGljcy5sZW5ndGggLSAxKVxuICAgIH1cblxuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uLmlubmVySFRNTCA9IHRleHRcbiAgfVxuXG4gIHNldENvbW1hbmRXb3JkICgpIHtcbiAgICAvLyBmaXJzdCBzZXQgdG8gZmlyc3QgdG9waWMgY29tbWFuZCB3b3JkXG4gICAgbGV0IGNvbW1hbmRXb3JkID0gVG9waWNDaG9vc2VyLmdldENvbW1hbmRXb3JkKHRoaXMudG9waWNzWzBdKVxuXG4gICAgbGV0IHVzZUNvbW1hbmRXb3JkID0gdHJ1ZSAvLyB0cnVlIGlmIHNoYXJlZCBjb21tYW5kIHdvcmRcblxuICAgIC8vIGN5Y2xlIHRocm91Z2ggcmVzdCBvZiB0b3BpY3MsIHJlc2V0IGNvbW1hbmQgd29yZCBpZiB0aGV5IGRvbid0IG1hdGNoXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCB0aGlzLnRvcGljcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKFRvcGljQ2hvb3Nlci5nZXRDb21tYW5kV29yZCh0aGlzLnRvcGljc1tpXSkgIT09IGNvbW1hbmRXb3JkKSB7XG4gICAgICAgIGNvbW1hbmRXb3JkID0gJydcbiAgICAgICAgdXNlQ29tbWFuZFdvcmQgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY29tbWFuZFdvcmQgPSBjb21tYW5kV29yZFxuICAgIHRoaXMudXNlQ29tbWFuZFdvcmQgPSB1c2VDb21tYW5kV29yZFxuICB9XG5cbiAgZ2VuZXJhdGVBbGwgKCkge1xuICAgIC8vIENsZWFyIGRpc3BsYXktYm94IGFuZCBxdWVzdGlvbiBsaXN0XG4gICAgdGhpcy5kaXNwbGF5Qm94LmlubmVySFRNTCA9ICcnXG4gICAgdGhpcy5xdWVzdGlvbnMgPSBbXVxuICAgIHRoaXMuc2V0Q29tbWFuZFdvcmQoKVxuXG4gICAgLy8gU2V0IG51bWJlciBhbmQgbWFpbiBjb21tYW5kIHdvcmRcbiAgICBjb25zdCBtYWlucSA9IGNyZWF0ZUVsZW0oJ3AnLCAna2F0ZXggbWFpbnEnLCB0aGlzLmRpc3BsYXlCb3gpXG4gICAgbWFpbnEuaW5uZXJIVE1MID0gYCR7dGhpcy5xTnVtYmVyfS4gJHt0aGlzLmNvbW1hbmRXb3JkfWAgLy8gVE9ETzogZ2V0IGNvbW1hbmQgd29yZCBmcm9tIHF1ZXN0aW9uc1xuXG4gICAgLy8gTWFrZSBzaG93IGFuc3dlcnMgYnV0dG9uXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24gPSBjcmVhdGVFbGVtKCdwJywgJ2J1dHRvbiBzaG93LWFuc3dlcnMnLCB0aGlzLmRpc3BsYXlCb3gpXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLnRvZ2dsZUFuc3dlcnMoKVxuICAgIH0pXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24uaW5uZXJIVE1MID0gJ1Nob3cgYW5zd2VycydcblxuICAgIC8vIEdldCBkaWZmaWN1bHR5IGZyb20gc2xpZGVyXG4gICAgY29uc3QgbWluZGlmZiA9IHRoaXMuZGlmZmljdWx0eVNsaWRlci5nZXRWYWx1ZUwoKVxuICAgIGNvbnN0IG1heGRpZmYgPSB0aGlzLmRpZmZpY3VsdHlTbGlkZXIuZ2V0VmFsdWVSKClcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIC8vIE1ha2UgcXVlc3Rpb24gY29udGFpbmVyIERPTSBlbGVtZW50XG4gICAgICBjb25zdCBjb250YWluZXIgPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tY29udGFpbmVyJywgdGhpcy5kaXNwbGF5Qm94KVxuICAgICAgY29udGFpbmVyLmRhdGFzZXQucXVlc3Rpb25faW5kZXggPSBpICsgJycgLy8gbm90IHN1cmUgdGhpcyBpcyBhY3R1YWxseSBuZWVkZWRcblxuICAgICAgLy8gQWRkIGNvbnRhaW5lciBsaW5rIHRvIG9iamVjdCBpbiBxdWVzdGlvbnMgbGlzdFxuICAgICAgaWYgKCF0aGlzLnF1ZXN0aW9uc1tpXSkgdGhpcy5xdWVzdGlvbnNbaV0gPSB7IGNvbnRhaW5lcjogY29udGFpbmVyIH1cblxuICAgICAgLy8gY2hvb3NlIGEgZGlmZmljdWx0eSBhbmQgZ2VuZXJhdGVcbiAgICAgIGNvbnN0IGRpZmZpY3VsdHkgPSBtaW5kaWZmICsgTWF0aC5mbG9vcihpICogKG1heGRpZmYgLSBtaW5kaWZmICsgMSkgLyB0aGlzLm4pXG5cbiAgICAgIC8vIGNob29zZSBhIHRvcGljIGlkXG4gICAgICB0aGlzLmdlbmVyYXRlKGksIGRpZmZpY3VsdHkpXG4gICAgfVxuICB9XG5cbiAgZ2VuZXJhdGUgKGk6IG51bWJlciwgZGlmZmljdWx0eTogbnVtYmVyLCB0b3BpY0lkPzogc3RyaW5nKSB7XG4gICAgdG9waWNJZCA9IHRvcGljSWQgfHwgcmFuZEVsZW0odGhpcy50b3BpY3MpXG5cbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgbGFiZWw6ICcnLFxuICAgICAgZGlmZmljdWx0eTogZGlmZmljdWx0eSxcbiAgICAgIHVzZUNvbW1hbmRXb3JkOiBmYWxzZVxuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnNTZXRzW3RvcGljSWRdKSB7XG4gICAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHRoaXMub3B0aW9uc1NldHNbdG9waWNJZF0ub3B0aW9ucylcbiAgICB9XG5cbiAgICAvLyBjaG9vc2UgYSBxdWVzdGlvblxuICAgIGNvbnN0IHF1ZXN0aW9uID0gVG9waWNDaG9vc2VyLm5ld1F1ZXN0aW9uKHRvcGljSWQsIG9wdGlvbnMpXG4gICAgaWYgKCFxdWVzdGlvbikgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gbWFrZSBxdWVzdGlvbiB3aXRoIGlkICR7dG9waWNJZH1gKVxuXG4gICAgLy8gc2V0IHNvbWUgbW9yZSBkYXRhIGluIHRoZSBxdWVzdGlvbnNbXSBsaXN0XG4gICAgaWYgKCF0aGlzLnF1ZXN0aW9uc1tpXSkgdGhyb3cgbmV3IEVycm9yKCdxdWVzdGlvbiBub3QgbWFkZScpXG4gICAgdGhpcy5xdWVzdGlvbnNbaV0ucXVlc3Rpb24gPSBxdWVzdGlvblxuICAgIHRoaXMucXVlc3Rpb25zW2ldLnRvcGljSWQgPSB0b3BpY0lkXG5cbiAgICAvLyBSZW5kZXIgaW50byB0aGUgY29udGFpbmVyXG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5xdWVzdGlvbnNbaV0uY29udGFpbmVyXG4gICAgY29udGFpbmVyLmlubmVySFRNTCA9ICcnIC8vIGNsZWFyIGluIGNhc2Ugb2YgcmVmcmVzaFxuXG4gICAgLy8gbWFrZSBhbmQgcmVuZGVyIHF1ZXN0aW9uIG51bWJlciBhbmQgY29tbWFuZCB3b3JkIChpZiBuZWVkZWQpXG4gICAgbGV0IHFOdW1iZXJUZXh0ID0gcXVlc3Rpb25MZXR0ZXIoaSkgKyAnKSdcbiAgICBpZiAod2luZG93LlNIT1dfRElGRklDVUxUWSkgeyBxTnVtYmVyVGV4dCArPSBvcHRpb25zLmRpZmZpY3VsdHkgfVxuICAgIGlmICghdGhpcy51c2VDb21tYW5kV29yZCkge1xuICAgICAgcU51bWJlclRleHQgKz0gJyAnICsgVG9waWNDaG9vc2VyLmdldENvbW1hbmRXb3JkKHRvcGljSWQpXG4gICAgICBjb250YWluZXIuY2xhc3NMaXN0LmFkZCgnaW5kaXZpZHVhbC1jb21tYW5kLXdvcmQnKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZSgnaW5kaXZpZHVhbC1jb21tYW5kLXdvcmQnKVxuICAgIH1cblxuICAgIGNvbnN0IHF1ZXN0aW9uTnVtYmVyRGl2ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLW51bWJlciBrYXRleCcsIGNvbnRhaW5lcilcbiAgICBxdWVzdGlvbk51bWJlckRpdi5pbm5lckhUTUwgPSBxTnVtYmVyVGV4dFxuXG4gICAgLy8gcmVuZGVyIHRoZSBxdWVzdGlvblxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChxdWVzdGlvbi5nZXRET00oKSkgLy8gdGhpcyBpcyBhIC5xdWVzdGlvbi1kaXYgZWxlbWVudFxuICAgIHF1ZXN0aW9uLnJlbmRlcigpIC8vIHNvbWUgcXVlc3Rpb25zIG5lZWQgcmVuZGVyaW5nIGFmdGVyIGF0dGFjaGluZyB0byBET01cblxuICAgIC8vIG1ha2UgaGlkZGVuIGFjdGlvbnMgbWVudVxuICAgIGNvbnN0IGFjdGlvbnMgPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tYWN0aW9ucyBoaWRkZW4nLCBjb250YWluZXIpXG4gICAgY29uc3QgcmVmcmVzaEljb24gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tcmVmcmVzaCBpY29uLWJ1dHRvbicsIGFjdGlvbnMpXG4gICAgY29uc3QgYW5zd2VySWNvbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1hbnN3ZXIgaWNvbi1idXR0b24nLCBhY3Rpb25zKVxuXG4gICAgYW5zd2VySWNvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHF1ZXN0aW9uLnRvZ2dsZUFuc3dlcigpXG4gICAgICBoaWRlQWxsQWN0aW9ucygpXG4gICAgfSlcblxuICAgIHJlZnJlc2hJY29uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgdGhpcy5nZW5lcmF0ZShpLCBkaWZmaWN1bHR5KVxuICAgICAgaGlkZUFsbEFjdGlvbnMoKVxuICAgIH0pXG5cbiAgICAvLyBROiBpcyB0aGlzIGJlc3Qgd2F5IC0gb3IgYW4gZXZlbnQgbGlzdGVuZXIgb24gdGhlIHdob2xlIGRpc3BsYXlCb3g/XG4gICAgY29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZSA9PiB7XG4gICAgICBpZiAoIWhhc0FuY2VzdG9yQ2xhc3MoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQsICdxdWVzdGlvbi1hY3Rpb25zJykpIHtcbiAgICAgICAgLy8gb25seSBkbyB0aGlzIGlmIGl0IGRpZG4ndCBvcmlnaW5hdGUgaW4gYWN0aW9uIGJ1dHRvblxuICAgICAgICB0aGlzLnNob3dRdWVzdGlvbkFjdGlvbnMoaSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgdG9nZ2xlQW5zd2VycyAoKSB7XG4gICAgaWYgKHRoaXMuYW5zd2VyZWQpIHtcbiAgICAgIHRoaXMucXVlc3Rpb25zLmZvckVhY2gocSA9PiB7XG4gICAgICAgIGlmIChxLnF1ZXN0aW9uKSBxLnF1ZXN0aW9uLmhpZGVBbnN3ZXIoKVxuICAgICAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgICAgICAgdGhpcy5hbnN3ZXJCdXR0b24uaW5uZXJIVE1MID0gJ1Nob3cgYW5zd2VycydcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucXVlc3Rpb25zLmZvckVhY2gocSA9PiB7XG4gICAgICAgIGlmIChxLnF1ZXN0aW9uKSBxLnF1ZXN0aW9uLnNob3dBbnN3ZXIoKVxuICAgICAgICB0aGlzLmFuc3dlcmVkID0gdHJ1ZVxuICAgICAgICB0aGlzLmFuc3dlckJ1dHRvbi5pbm5lckhUTUwgPSAnSGlkZSBhbnN3ZXJzJ1xuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2NhbnMgZm9yIHdpZGVzdCBxdWVzdGlvbiBhbmQgdGhlbiBzZXRzIHRoZSBncmlkIHdpZHRoIHRvIHRoYXRcbiAgICovXG4gIC8qIGVzbGludC1kaXNhYmxlICovXG4gIGFkanVzdEdyaWRXaWR0aCAoKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgLyogZXNsaW50LWVuYWJsZSAqL1xuXG4gIHNob3dRdWVzdGlvbkFjdGlvbnMgKHF1ZXN0aW9uSW5kZXg6IG51bWJlcikge1xuICAgIC8vIGZpcnN0IGhpZGUgYW55IG90aGVyIGFjdGlvbnNcbiAgICBoaWRlQWxsQWN0aW9ucygpXG5cbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLnF1ZXN0aW9uc1txdWVzdGlvbkluZGV4XS5jb250YWluZXJcbiAgICBjb25zdCBhY3Rpb25zID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy5xdWVzdGlvbi1hY3Rpb25zJykgYXMgSFRNTEVsZW1lbnRcblxuICAgIC8vIFVuaGlkZSB0aGUgb3ZlcmxheVxuICAgIGNvbnN0IG92ZXJsYXkgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcub3ZlcmxheScpXG4gICAgaWYgKG92ZXJsYXkgIT09IG51bGwpIG92ZXJsYXkuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJylcbiAgICBhY3Rpb25zLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpXG4gICAgYWN0aW9ucy5zdHlsZS5sZWZ0ID0gKGNvbnRhaW5lci5vZmZzZXRXaWR0aCAvIDIgLSBhY3Rpb25zLm9mZnNldFdpZHRoIC8gMikgKyAncHgnXG4gICAgYWN0aW9ucy5zdHlsZS50b3AgPSAoY29udGFpbmVyLm9mZnNldEhlaWdodCAvIDIgLSBhY3Rpb25zLm9mZnNldEhlaWdodCAvIDIpICsgJ3B4J1xuICB9XG5cbiAgYXBwZW5kVG8gKGVsZW06IEhUTUxFbGVtZW50KSB7XG4gICAgZWxlbS5hcHBlbmRDaGlsZCh0aGlzLm91dGVyQm94KVxuICAgIHRoaXMuX2luaXRTbGlkZXIoKSAvLyBoYXMgdG8gYmUgaW4gZG9jdW1lbnQncyBET00gdG8gd29yayBwcm9wZXJseVxuICB9XG5cbiAgYXBwZW5kQmVmb3JlIChwYXJlbnQ6IEhUTUxFbGVtZW50LCBlbGVtOiBIVE1MRWxlbWVudCkge1xuICAgIHBhcmVudC5pbnNlcnRCZWZvcmUodGhpcy5vdXRlckJveCwgZWxlbSlcbiAgICB0aGlzLl9pbml0U2xpZGVyKCkgLy8gaGFzIHRvIGJlIGluIGRvY3VtZW50J3MgRE9NIHRvIHdvcmsgcHJvcGVybHlcbiAgfVxufVxuXG5mdW5jdGlvbiBxdWVzdGlvbkxldHRlciAoaTogbnVtYmVyKSB7XG4gIC8vIHJldHVybiBhIHF1ZXN0aW9uIG51bWJlci4gZS5nLiBxTnVtYmVyKDApPVwiYVwiLlxuICAvLyBBZnRlciBsZXR0ZXJzLCB3ZSBnZXQgb24gdG8gZ3JlZWtcbiAgY29uc3QgbGV0dGVyID1cbiAgICAgICAgaSA8IDI2ID8gU3RyaW5nLmZyb21DaGFyQ29kZSgweDYxICsgaSlcbiAgICAgICAgICA6IGkgPCA1MiA/IFN0cmluZy5mcm9tQ2hhckNvZGUoMHg0MSArIGkgLSAyNilcbiAgICAgICAgICAgIDogU3RyaW5nLmZyb21DaGFyQ29kZSgweDNCMSArIGkgLSA1MilcbiAgcmV0dXJuIGxldHRlclxufVxuXG5mdW5jdGlvbiBoaWRlQWxsQWN0aW9ucyAoKSB7XG4gIC8vIGhpZGUgYWxsIHF1ZXN0aW9uIGFjdGlvbnNcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnF1ZXN0aW9uLWFjdGlvbnMnKS5mb3JFYWNoKGVsID0+IHtcbiAgICBlbC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuICB9KVxuICBjb25zdCBvdmVybGF5ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm92ZXJsYXknKVxuICBpZiAob3ZlcmxheSAhPT0gbnVsbCkgeyBvdmVybGF5LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpIH0gZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBmaW5kIG92ZXJsYXkgd2hlbiBoaWRpbmcgYWN0aW9ucycpXG59XG4iLCJpbXBvcnQgUXVlc3Rpb25TZXQgZnJvbSAnUXVlc3Rpb25TZXQnXG5cbi8qIFRPRE86XG4gKiAuIFF1ZXN0aW9uIG51bWJlciBpbiBjb250cm9sc1xuICovXG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG4gIGNvbnN0IHFzID0gbmV3IFF1ZXN0aW9uU2V0KClcbiAgcXMuYXBwZW5kVG8oZG9jdW1lbnQuYm9keSlcbiAgcXMuY2hvb3NlVG9waWNzKClcblxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZnVsbHNjcmVlbicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICBpZiAoZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgIGRvY3VtZW50LmV4aXRGdWxsc2NyZWVuKCkudGhlbigoKSA9PiB7XG4gICAgICAgIGUudGFyZ2V0LmlubmVyVGV4dCA9ICdGdWxsIHNjcmVlbidcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZXF1ZXN0RnVsbHNjcmVlbigpLnRoZW4oKCkgPT4ge1xuICAgICAgICBlLnRhcmdldC5pbm5lclRleHQgPSBcIkV4aXQgZnVsbCBzY3JlZW5cIlxuICAgICAgfSlcbiAgICB9XG4gIH0pXG5cbiAgbGV0IGNvbnRyb2xzSGlkZGVuID0gZmFsc2VcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hpZGUtY29udHJvbHMnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgaWYgKCFjb250cm9sc0hpZGRlbikge1xuICAgICAgWy4uLmRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3F1ZXN0aW9uLWhlYWRlcmJveCcpXS5mb3JFYWNoKCBlbGVtID0+IHtcbiAgICAgICAgZWxlbS5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuICAgICAgfSlcbiAgICAgIGUudGFyZ2V0LmlubmVyVGV4dCA9ICdTaG93IGNvbnRyb2xzJ1xuICAgICAgY29udHJvbHNIaWRkZW4gPSB0cnVlXG4gICAgfSBlbHNlIHtcbiAgICAgIFsuLi5kb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdxdWVzdGlvbi1oZWFkZXJib3gnKV0uZm9yRWFjaCggZWxlbSA9PiB7XG4gICAgICAgIGVsZW0uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJylcbiAgICAgIH0pXG4gICAgICBlLnRhcmdldC5pbm5lclRleHQgPSAnSGlkZSBjb250cm9scydcbiAgICAgIGNvbnRyb2xzSGlkZGVuID0gZmFsc2VcbiAgICB9XG4gIH0pIFxuXG59KVxuIl0sIm5hbWVzIjpbImZyYWN0aW9uIiwiVEQuZ2V0VHJpYW5nbGUiLCJ0aGlzIiwiUlNsaWRlciIsIlRvcGljQ2hvb3Nlci5nZXRUb3BpY3MiLCJUTW9kYWwiLCJUb3BpY0Nob29zZXIuaGFzT3B0aW9ucyIsIlRvcGljQ2hvb3Nlci5uZXdPcHRpb25zU2V0IiwiVG9waWNDaG9vc2VyLmdldFRpdGxlIiwiVG9waWNDaG9vc2VyLmdldENvbW1hbmRXb3JkIiwiVG9waWNDaG9vc2VyLm5ld1F1ZXN0aW9uIl0sIm1hcHBpbmdzIjoiOzs7RUFBQTtFQUNBO0VBQ0E7QUFDQTtFQUNBLElBQUksRUFBRSxHQUFHLFVBQVUsSUFBSSxFQUFFO0VBQ3pCLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFJO0VBQ25CLEVBQUUsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFJO0VBQzFCLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFJO0VBQ3BCLEVBQUUsSUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFDO0VBQ3RCLEVBQUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFDO0VBQ3JCLEVBQUUsSUFBSSxDQUFDLFlBQVksR0FBRyxFQUFDO0VBQ3ZCLEVBQUUsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFJO0VBQ3RCLEVBQUUsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFJO0VBQ3RCLEVBQUUsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFJO0VBQzNCLEVBQUUsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFJO0VBQ3RCLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFJO0VBQ25CLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFDO0VBQ2YsRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUk7RUFDbEIsRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUk7RUFDbEIsRUFBRSxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUk7RUFDckIsRUFBRSxJQUFJLENBQUMsUUFB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RyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUMsRUFBRTtBQUNwRztFQUNBLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBRyxFQUFFO0FBQ3JHO0VBQ0EsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFJO0FBQ3RHO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO0VBQ3ZCLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtFQUMzQixNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFDO0VBQy9ELE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDN0QsS0FBSztFQUNMLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDcEcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSTtFQUM3RixHQUFHLE1BQU07RUFDVCxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQyxFQUFFO0VBQ3RGLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDeEQsR0FBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUM7RUFDbEcsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxFQUFDO0FBQ2xEO0VBQ0EsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUk7RUFDdEYsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFJO0FBQ2pFO0VBQ0EsRUFBRSxPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDeEIsRUFBQztBQUNEO0VBQ0EsRUFBRSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDLEVBQUU7RUFDekMsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU07QUFDaEM7RUFDQSxFQUFFLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLElBQUksRUFBQztBQUNqRTtFQUNBLEVBQUUsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUM7RUFDMUUsRUFBRSxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLEVBQUM7QUFDdEI7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7RUFDdkIsSUFBSSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxHQUFHLEVBQUU7RUFDMUQsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFHO0VBQzdCLEtBQUssTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFHO0VBQ2hDLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFHO0FBQzlCO0VBQ0EsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFDO0FBQ3pDO0VBQ0EsRUFBRSxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUU7RUFDekIsRUFBQztBQUNEO0VBQ0EsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsWUFBWTtFQUNwQyxFQUFFLElBQUksS0FBSyxHQUFHLEtBQUk7QUFDbEI7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQztBQUM5QztFQUNBLEVBQUUsSUFBSSxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUMsWUFBWTtFQUN4QyxJQUFJLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxVQUFVLEVBQUU7RUFDMUUsTUFBTSxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO0VBQ25ELEtBQUs7RUFDTCxHQUFHLEVBQUUsR0FBRyxFQUFDO0VBQ1QsRUFBQztBQUNEO0VBQ0EsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsWUFBWTtFQUNwQyxFQUFFLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLEtBQUk7RUFDNUQsRUFBRSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBVztFQUM1QyxFQUFFLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRTtFQUMzQixFQUFDO0FBQ0Q7RUFDQSxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxVQUFVLFFBQVEsRUFBRTtFQUM1QyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLFNBQVE7RUFDL0IsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsS0FBSyxHQUFHLFFBQVEsQ0FBQyxDQUFDLFVBQVUsRUFBQztFQUNoRSxFQUFDO0FBQ0Q7RUFDQSxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxZQUFZO0VBQ3BDO0VBQ0E7RUFDQSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDakYsRUFBQztBQUNEO0VBQ0EsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsWUFBWTtFQUNyQztFQUNBLEVBQUUsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztFQUM1QyxFQUFDO0FBQ0Q7RUFDQSxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxZQUFZO0VBQ3JDO0VBQ0EsRUFBRSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO0VBQzFDLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLFlBQVk7RUFDbkMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGFBQVk7RUFDOUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRTtFQUN0QixFQUFDO0FBQ0Q7RUFDQSxJQUFJLGFBQWEsR0FBRyxVQUFVLEVBQUUsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFO0VBQ2pELEVBQUUsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLEVBQUM7RUFDMUMsRUFBRSxJQUFJLEdBQUcsRUFBRSxPQUFPLENBQUMsU0FBUyxHQUFHLElBQUc7RUFDbEMsRUFBRSxJQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRTtBQUNyRztFQUNBLEVBQUUsT0FBTyxPQUFPO0VBQ2hCLEVBQUM7QUFDRDtFQUNBLElBQUksWUFBWSxHQUFHLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7RUFDL0MsRUFBRSxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBQztBQUM1QjtFQUNBLEVBQUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFDLEVBQUU7RUFDbkcsRUFBQztBQUNEO0VBQ0EsSUFBSSxrQkFBa0IsR0FBRyxVQUFVLElBQUksRUFBRTtFQUN6QyxFQUFFLElBQUksTUFBTSxHQUFHLEdBQUU7RUFDakIsRUFBRSxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUc7QUFDL0M7RUFDQSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO0VBQ2xCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBQztFQUNyQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztFQUM3QyxHQUFHO0FBQ0g7RUFDQSxFQUFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFDLEVBQUU7QUFDN0c7RUFDQSxFQUFFLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFDO0FBQ3ZFO0VBQ0EsRUFBRSxPQUFPLE1BQU07RUFDZixFQUFDO0FBQ0Q7RUFDQSxJQUFJLFlBQVksR0FBRyxVQUFVLElBQUksRUFBRTtFQUNuQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxPQUFPLElBQUk7RUFDbkQsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsT0FBTyxJQUFJO0FBQ3ZEO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7RUFDbEIsSUFBSSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLE9BQU8sSUFBSTtFQUNoRixHQUFHO0VBQ0gsRUFBRSxPQUFPLElBQUk7RUFDYjs7RUNwVkE7OztRQUdxQixLQUFLO01BR3hCLFlBQWEsQ0FBUyxFQUFFLENBQVM7VUFDL0IsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7VUFDVixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtPQUNYO01BRUQsTUFBTSxDQUFFLEtBQWE7VUFDbkIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQTtVQUNoRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFBO1VBQ2hFLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFBO1VBQ2IsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUE7VUFDYixPQUFPLElBQUksQ0FBQTtPQUNaO01BRUQsS0FBSyxDQUFFLEVBQVU7VUFDZixJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFBO1VBQ3BCLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUE7VUFDcEIsT0FBTyxJQUFJLENBQUE7T0FDWjtNQUVELFNBQVMsQ0FBRSxDQUFTLEVBQUUsQ0FBUztVQUM3QixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtVQUNYLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO1VBQ1gsT0FBTyxJQUFJLENBQUE7T0FDWjtNQUVELEtBQUs7VUFDSCxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQ2pDO01BRUQsTUFBTSxDQUFFLElBQVc7VUFDakIsUUFBUSxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxFQUFDO09BQ2hEO01BRUQsVUFBVSxDQUFFLElBQVcsRUFBRSxDQUFTOztVQUVoQyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtVQUN6QyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7VUFDdEMsT0FBTyxJQUFJLENBQUE7T0FDWjtNQUVELE9BQU8sU0FBUyxDQUFFLENBQVMsRUFBRSxLQUFhO1VBQ3hDLE9BQU8sSUFBSSxLQUFLLENBQ2QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQ25CLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUNwQixDQUFBO09BQ0Y7TUFFRCxPQUFPLFlBQVksQ0FBRSxDQUFTLEVBQUUsS0FBYTtVQUMzQyxLQUFLLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFBO1VBQzdCLE9BQU8sS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7T0FDakM7Ozs7OztNQU9ELE9BQU8sV0FBVyxDQUFDLElBQWlCLEVBQUUsU0FBbUUsU0FBUyxFQUFFLG1CQUE0QixJQUFJO1VBQ2xKLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1VBQ3pDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUc7Y0FDakMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTTtrQkFDekMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUUsQ0FBQyxDQUFBO1VBRXBDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUk7Y0FDakMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSztrQkFDckMsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFBO1VBRXBDLElBQUksZ0JBQWdCLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRTtjQUMxQyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO2NBQ3hFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFBO2NBQ2YsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUE7V0FDaEI7VUFFRCxPQUFPLElBQUksS0FBSyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUN0Qjs7Ozs7TUFNRCxPQUFPLElBQUksQ0FBRSxHQUFHLE1BQWdCO1VBQzlCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtVQUN6RCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7VUFDekQsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQTtVQUV2QixPQUFPLElBQUksS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFBO09BQ3JDO01BRUQsT0FBTyxRQUFRLENBQUUsQ0FBUSxFQUFFLENBQVEsRUFBRSxDQUFROztVQUUzQyxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtVQUM5QixNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtVQUM5QixNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtVQUU5QixNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtVQUMzQixNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtVQUN4QyxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtVQUV4QyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksR0FBRyxTQUFTLEVBQUUsSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFBO09BQ3JEO01BRUQsT0FBTyxHQUFHLENBQUUsTUFBZ0I7VUFDMUIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1VBQ2hFLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtVQUNoRSxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtPQUM3QjtNQUVELE9BQU8sR0FBRyxDQUFFLE1BQWU7VUFDekIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7VUFDakUsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7VUFDakUsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7T0FDN0I7TUFFRCxPQUFPLE1BQU0sQ0FBRSxNQUFlO1VBQzVCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtVQUNoRSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7VUFDaEUsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7VUFDakUsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7VUFDakUsT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FB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LEtBQUssQ0FBQyxDQUFDO0VBQ2IsTUFBTTtFQUNOLFFBQVEsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxFQUFDO0VBQ2hFLFFBQVEsS0FBSztFQUNiLEtBQUs7QUFDTDtFQUNBO0VBQ0EsSUFBSTtFQUNKLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDN0MsTUFBTSxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQzdCLE1BQU07RUFDTixNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxLQUFLO0FBQ0w7RUFDQTtFQUNBLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDMUIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osS0FBSztBQUNMO0VBQ0EsSUFBSSxDQUFD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QUNBLFlBQVksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7RUFDcEgsY0FBYyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNsQyxjQUFjLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7RUFDNUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztFQUNsQixhQUFhO0FBQ2I7RUFDQTtFQUNBLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7RUFDdEYsY0FBYyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDdEMsY0FBYyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDcEQsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ3JCLGFBQWE7QUFDYjtFQUNBLFdBQVcsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0VBQzNELFlBQVksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDaEMsWUFBWSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDcEMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ25CLFdBQVcsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0VBQzNELFlBQVksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDaEMsWUFBWSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDcEMsWUFBWSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDcEMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ25CLFdBQVc7QUFDWDtFQUNBLFVBQVUsSUFBSSxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtFQUM3QixZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQ3RCLFlBQVksQ0FBQztFQUNiLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUMxQyxZQUFZLE1BQU07RUFDbEIsV0FBVztBQUNYO0VBQ0E7RUFDQSxTQUFTO0VBQ1QsUUFBUTtFQUNSLFVBQVUsaUJBQWlCLEVBQUUsQ0FBQztFQUM5QixPQUFPO0FBQ1A7RUFDQSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtFQUNqQixNQUFNLE1BQU0sSUFBSSxjQUFjLEVBQUUsQ0FBQztFQUNqQyxLQUFLO0FBQ0w7RUFDQSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUM1QixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3pCLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDekIsR0FBRyxDQUFDO0FBQ0o7RUFDQSxFQUFFLFNBQVMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQzNCO0VBQ0EsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDZCxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFO0FBQzVDO0VBQ0EsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7RUFDakIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUN4QixPQUFPO0VBQ1AsS0FBSztFQUNMLElBQUksT0FBTyxDQUFDLENBQUM7RUFDYixHQUFHO0FBQ0g7QUFDQTtFQUNBLEVBQUUsU0FBUyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUMxQjtFQUNBLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7RUFDdEIsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQ3BCLEtBQUs7QUFDTDtFQUNBLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7RUFDdEIsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQ3BCLEtBQUs7QUFDTDtFQUNBLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQztFQUNmLE1BQU0sT0FBTyxDQUFDLENBQUM7QUFDZjtFQUNBO0VBQ0E7RUFDQTtFQUNBO0FBQ0E7RUFDQSxJQUFJLElBQUksR0FBRyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7RUFDckIsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDZDtFQUNBLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQzNCLE1BQU0sR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3pCO0VBQ0EsTUFBTSxJQUFJLENBQUMsR0FBRyxhQUFhO0VBQzNCLFFBQVEsT0FBTyxDQUFDLENBQUM7RUFDakIsS0FBSztFQUNMLElBQUksT0FBTyxDQUFDLENBQUM7RUFDYixHQUFHO0FBQ0g7QUFDQTtFQUNBLEtBQUssU0FBUyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7QUFDcEM7RUFDQSxJQUFJLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQztFQUNqQixJQUFJLElBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2xDO0VBQ0EsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ2xDO0FBQ0E7RUFDQSxNQUFNLElBQUksSUFBSSxLQUFLLElBQUk7RUFDdkIsUUFBUSxPQUFPLENBQUMsQ0FBQztBQUNqQjtFQUNBLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0VBQzNCLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0VBQzNCLEtBQUs7RUFDTCxJQUFJLE9BQU8sQ0FBQyxDQUFDO0VBQ2IsR0FBRztBQUNIO0VBQ0EsRUFBRSxTQUFTLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQ3JCO0VBQ0EsSUFBSSxJQUFJLENBQUMsQ0FBQztFQUNWLE1BQU0sT0FBTyxDQUFDLENBQUM7RUFDZixJQUFJLElBQUksQ0FBQyxDQUFDO0VBQ1YsTUFBTSxPQUFPLENBQUMsQ0FBQztBQUNmO0VBQ0EsSUFBSSxPQUFPLENBQUMsRUFBRTtFQUNkLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUNiLE1BQU0sSUFBSSxDQUFDLENBQUM7RUFDWixRQUFRLE9BQU8sQ0FBQyxDQUFDO0VBQ2pCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUNiLE1BQU0sSUFBSSxDQUFDLENBQUM7RUFDWixRQUFRLE9BQU8sQ0FBQyxDQUFDO0VBQ2pCLEtBQUs7RUFDTCxHQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxFQUFFLFNBQVMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDMUI7RUFDQSxJQUFJLElBQUksRUFBRSxJQUFJLFlBQVksUUFBUSxDQUFDLEVBQUU7RUFDckMsTUFBTSxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNoQyxLQUFLO0FBQ0w7RUFDQSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDaEI7RUFDQSxJQUFJLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFO0VBQzVCLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDOUIsS0FBSyxNQUFNO0VBQ1gsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQ1osS0FBSztBQUNMO0VBQ0EsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQ3ZCLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDM0IsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUMzQixHQUFHO0FBQ0g7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN6QjtFQUNBLEVBQUUsUUFBUSxDQUFDLFNBQVMsR0FBRztBQUN2QjtFQUNBLElBQUksR0FBRyxFQUFFLENBQUM7RUFDVixJQUFJLEdBQUcsRUFBRSxDQUFDO0VBQ1YsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUNWO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksS0FBSyxFQUFFLFdBQVc7QUFDdEI7RUFDQSxNQUFNLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ2hELEtBQUs7QUFDTDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxJQUFJLEtBQUssRUFBRSxXQUFXO0FBQ3RCO0VBQ0EsTUFBTSxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUM3RCxLQUFLO0FBQ0w7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsSUFBSSxLQUFLLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQzFCO0VBQ0EsTUFBTSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQ2xCLE1BQU0sT0FBTyxJQUFJLFFBQVE7RUFDekIsY0FBYyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7RUFDMUUsY0FBYyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztFQUNoQyxlQUFlLENBQUM7RUFDaEIsS0FBSztBQUNMO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksS0FBSyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUMxQjtFQUNBLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNsQixNQUFNLE9BQU8sSUFBSSxRQUFRO0VBQ3pCLGNBQWMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDO0VBQzFFLGNBQWMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7RUFDaEMsZUFBZSxDQUFDO0VBQ2hCLEtBQUs7QUFDTDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxJQUFJLEtBQUssRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDMUI7RUFDQSxNQUFNLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDbEIsTUFBTSxPQUFPLElBQUksUUFBUTtFQUN6QixjQUFjLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7RUFDckQsY0FBYyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztFQUNoQyxlQUFlLENBQUM7RUFDaEIsS0FBSztBQUNMO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksS0FBSyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUMxQjtFQUNBLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNsQixNQUFNLE9BQU8sSUFBSSxRQUFRO0VBQ3pCLGNBQWMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztFQUNyRCxjQUFjLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDO0VBQ2hDLGVBQWUsQ0FBQztFQUNoQixLQUFLO0FBQ0w7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsSUFBSSxPQUFPLEVBQUUsV0FBVztFQUN4QixNQUFNLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDaEMsS0FBSztBQUNMO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksS0FBSyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUMxQjtFQUNBLE1BQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO0VBQ2hELFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUNqQyxPQUFPO0FBQ1A7RUFDQSxNQUFNLElBQUksQ0FBQyxLQUFLLFNBQVMsRUFBRTtFQUMzQixRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDbEUsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQ2xCLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7RUFDM0MsUUFBUSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQ3ZCLE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7QUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLE9BQU8sSUFBSSxRQUFRO0VBQ3pCLGNBQWMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQ3JFLGNBQWMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7RUFDaEMsZUFBZSxDQUFDO0VBQ2hCLEtBQUs7QUFDTDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxJQUFJLEtBQUssRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDMUI7RUFDQSxNQUFNLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDbEI7RUFDQTtBQUNBO0VBQ0EsTUFBTSxPQUFPLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDL0YsS0FBSztBQUNMO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksS0FBSyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUMxQjtFQUNBLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNsQjtFQUNBO0FBQ0E7RUFDQSxNQUFNLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO0VBQzNDLFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQztFQUM1QixPQUFPO0VBQ1AsTUFBTSxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDL0YsS0FBSztBQUNMO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksTUFBTSxFQUFFLFNBQVMsTUFBTSxFQUFFO0FBQzdCO0VBQ0EsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3pDO0VBQ0EsTUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7RUFDaEQsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQ2pDLE9BQU87RUFDUCxNQUFNLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztFQUN6RixLQUFLO0FBQ0w7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsSUFBSSxPQUFPLEVBQUUsU0FBUyxNQUFNLEVBQUU7QUFDOUI7RUFDQSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDekM7RUFDQSxNQUFNLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtFQUNoRCxRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDakMsT0FBTztFQUNQLE1BQU0sT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0VBQzFGLEtBQUs7QUFDTDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxJQUFJLE9BQU8sRUFBRSxTQUFTLE1BQU0sRUFBRTtBQUM5QjtFQUNBLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN6QztFQUNBLE1BQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO0VBQ2hELFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUNqQyxPQUFPO0VBQ1AsTUFBTSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7RUFDMUYsS0FBSztBQUNMO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksU0FBUyxFQUFFLFdBQVc7QUFDMUI7RUFDQSxNQUFNLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUM1RCxLQUFLO0FBQ0w7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsSUFBSSxLQUFLLEVBQUUsU0FBUyxDQUFDLEVBQUU7QUFDdkI7RUFDQSxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtFQUNqQixRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzFGLE9BQU8sTUFBTTtFQUNiLFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUN4RixPQUFPO0VBQ1AsS0FBSztBQUNMO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUM3QjtFQUNBLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNsQixNQUFNLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDNUUsS0FBSztBQUNMO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUM5QjtFQUNBLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNsQixNQUFNLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDN0UsTUFBTSxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDL0IsS0FBSztBQUNMO0VBQ0EsSUFBSSxVQUFVLEVBQUUsU0FBUyxHQUFHLEVBQUU7QUFDOUI7RUFDQTtBQUNBO0VBQ0EsTUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7RUFDaEQsUUFBUSxPQUFPLElBQUksQ0FBQztFQUNwQixPQUFPO0FBQ1A7RUFDQSxNQUFNLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7QUFDaEQ7RUFDQSxNQUFNLEdBQUcsR0FBRyxHQUFHLElBQUksS0FBSyxDQUFDO0FBQ3pCO0VBQ0EsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLEVBQUU7RUFDdEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQztFQUMxQixVQUFVLE9BQU8sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDcEMsUUFBUSxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUN6RCxPQUFPO0FBQ1A7RUFDQSxNQUFNLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQzVDLFFBQVEsSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzVDLFFBQVEsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLEdBQUcsRUFBRTtFQUNoRSxVQUFVLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ3ZDLFNBQVM7RUFDVCxPQUFPO0VBQ1AsTUFBTSxPQUFPLElBQUksQ0FBQztFQUNsQixLQUFLO0FBQ0w7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsSUFBSSxXQUFXLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQ2hDO0VBQ0EsTUFBTSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQ2xCLE1BQU0sT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3ZGLEtBQUs7QUFDTDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxJQUFJLFNBQVMsRUFBRSxXQUFXO0FBQzFCO0VBQ0EsTUFBTSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQy9DLEtBQUs7QUFDTDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxJQUFJLFlBQVksRUFBRSxTQUFTLFlBQVksRUFBRTtBQUN6QztFQUNBLE1BQU0sSUFBSSxLQUFLLEVBQUUsR0FBRyxHQUFHLEVBQUUsQ0FBQztFQUMxQixNQUFNLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUN4QixNQUFNLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUN4QixNQUFNLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtFQUN6QixRQUFRLEdBQUcsSUFBSSxHQUFHLENBQUM7RUFDbkIsT0FBTztBQUNQO0VBQ0EsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDbkIsUUFBUSxHQUFHLElBQUksQ0FBQyxDQUFDO0VBQ2pCLE9BQU8sTUFBTTtBQUNiO0VBQ0EsUUFBUSxJQUFJLFlBQVksSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDN0QsVUFBVSxHQUFHLElBQUksS0FBSyxDQUFDO0VBQ3ZCLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQztFQUNyQixVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDakIsU0FBUztBQUNUO0VBQ0EsUUFBUSxHQUFHLElBQUksQ0FBQyxDQUFDO0VBQ2pCLFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBQztFQUNuQixRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUM7RUFDakIsT0FBTztFQUNQLE1BQU0sT0FBTyxHQUFHLENBQUM7RUFDakIsS0FBSztBQUNMO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksU0FBUyxFQUFFLFNBQVMsWUFBWSxFQUFFO0FBQ3RDO0VBQ0EsTUFBTSxJQUFJLEtBQUssRUFBRSxHQUFHLEdBQUcsRUFBRSxDQUFDO0VBQzFCLE1BQU0sSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQ3hCLE1BQU0sSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQ3hCLE1BQU0sSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0VBQ3pCLFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBQztFQUNuQixPQUFPO0FBQ1A7RUFDQSxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtFQUNuQixRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUM7RUFDakIsT0FBTyxNQUFNO0FBQ2I7RUFDQSxRQUFRLElBQUksWUFBWSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRTtFQUM3RCxVQUFVLEdBQUcsSUFBSSxLQUFLLENBQUM7RUFDdkIsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ2pCLFNBQVM7QUFDVDtFQUNBLFFBQVEsR0FBRyxJQUFJLFNBQVMsQ0FBQztFQUN6QixRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUM7RUFDakIsUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDO0VBQ3BCLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQztFQUNqQixRQUFRLEdBQUcsSUFBSSxHQUFHLENBQUM7RUFDbkIsT0FBTztFQUNQLE1BQU0sT0FBTyxHQUFHLENBQUM7RUFDakIsS0FBSztBQUNMO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksYUFBYSxFQUFFLFdBQVc7QUFDOUI7RUFDQSxNQUFNLElBQUksQ0FBQyxDQUFDO0VBQ1osTUFBTSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDeEIsTUFBTSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDeEIsTUFBTSxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7QUFDbkI7RUFDQSxNQUFNLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtFQUNoRCxRQUFRLE9BQU8sR0FBRyxDQUFDO0VBQ25CLE9BQU87QUFDUDtFQUNBLE1BQU0sR0FBRztFQUNULFFBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3BDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDbEIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQ2QsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQ2QsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7QUFDeEI7RUFDQSxNQUFNLE9BQU8sR0FBRyxDQUFDO0VBQ2pCLEtBQUs7QUFDTDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxJQUFJLFVBQVUsRUFBRSxTQUFTLEdBQUcsRUFBRTtBQUM5QjtFQUNBLE1BQU0sSUFBSSxDQUFDLENBQUM7RUFDWixNQUFNLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUN4QixNQUFNLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN4QjtFQUNBLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQ2hDLFFBQVEsT0FBTyxLQUFLLENBQUM7RUFDckIsT0FBTztBQUNQO0VBQ0EsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFO0VBQy9CLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDdEIsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ2YsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ2YsT0FBTztBQUNQO0VBQ0EsTUFBTSxHQUFHLEdBQUcsR0FBRyxJQUFJLEVBQUUsQ0FBQztBQUN0QjtFQUNBLE1BQU0sSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNsQyxNQUFNLElBQUksTUFBTSxHQUFHLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQzVDO0VBQ0EsTUFBTSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQztBQUM1QztFQUNBLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZCO0VBQ0EsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ2IsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ2Q7RUFDQSxNQUFNLElBQUksQ0FBQztFQUNYLFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBQztBQUNuQjtFQUNBLE1BQU0sSUFBSSxNQUFNLEVBQUU7QUFDbEI7RUFDQSxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJO0VBQ3BDLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQzNCLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUNqQixVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7RUFDbEIsU0FBUztFQUNULFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBQztFQUNuQixRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJO0VBQ3BDLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQzNCLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUNqQixVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7RUFDbEIsU0FBUztFQUNULFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBQztFQUNuQixPQUFPLE1BQU07RUFDYixRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSTtFQUN0QyxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUMzQixVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDakIsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO0VBQ2xCLFNBQVM7RUFDVCxPQUFPO0VBQ1AsTUFBTSxPQUFPLEdBQUcsQ0FBQztFQUNqQixLQUFLO0VBQ0wsR0FBRyxDQUFDO0FBQ0o7RUFDQSxFQUkwQztFQUMxQyxJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ2xFLElBQUksUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLFFBQVEsQ0FBQztFQUNuQyxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxRQUFRLENBQUM7RUFDcEMsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsUUFBUSxDQUFDO0VBQ2pDLEdBRUc7QUFDSDtFQUNBLENBQUMsRUFBTSxDQUFDOzs7OztFQ2owQk8sTUFBTSxRQUFRLENBQUM7RUFDOUIsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFO0VBQ3RCLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFlBQVksR0FBRyxFQUFFO0VBQ3hDLE1BQU0sSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFDO0VBQ2hCLE1BQU0sSUFBSSxDQUFDLEVBQUUsR0FBRyxHQUFFO0VBQ2xCLEtBQUssTUFBTSxJQUFJLE9BQU8sQ0FBQyxLQUFLLFFBQVEsRUFBRTtFQUN0QyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFDO0VBQ3JCLEtBQUssTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzFCLE1BQU0sSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFDO0VBQ2hCLE1BQU0sSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLEdBQUcsR0FBRTtFQUN6QixLQUFLLE1BQU07RUFDWCxNQUFNLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBQztFQUNoQixNQUFNLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQzdDLEtBQUs7RUFDTCxHQUFHO0FBQ0g7RUFDQSxFQUFFLEtBQUssQ0FBQyxHQUFHO0VBQ1gsSUFBSSxNQUFNLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFDO0VBQy9CLElBQUksT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztFQUNuQyxHQUFHO0FBQ0g7RUFDQSxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRTtFQUNiLElBQUksSUFBSSxFQUFFLElBQUksWUFBWSxRQUFRLENBQUMsRUFBRTtFQUNyQyxNQUFNLElBQUksR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUM7RUFDL0IsS0FBSztFQUNMLElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBQztFQUM3QixJQUFJLElBQUksRUFBRSxHQUFHLElBQUksR0FBRyxHQUFFO0VBQ3RCLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxLQUFLO0VBQ3pDLE1BQU0sSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtFQUNqQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFDO0VBQ3ZFLE9BQU8sTUFBTTtFQUNiLFFBQVEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUM7RUFDL0MsT0FBTztFQUNQLEtBQUssRUFBQztBQUNOO0VBQ0EsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEtBQUs7RUFDekMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtFQUM3QixRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFDO0VBQy9DLE9BQU87RUFDUCxLQUFLLEVBQUM7RUFDTixJQUFJLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUM7RUFDMUMsSUFBSSxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7RUFDOUIsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLENBQUMsR0FBRztFQUNiLElBQUksSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRTtFQUNwRCxJQUFJLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUU7RUFDL0IsUUFBUSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEdBQUc7RUFDM0IsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUMzQixJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsS0FBSztFQUN6QyxNQUFNLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRTtFQUN2QixRQUFRLEdBQUcsSUFBSSxTQUFRO0VBQ3ZCLE9BQU8sTUFBTTtFQUNiLFFBQVEsR0FBRyxJQUFJLFFBQVEsR0FBRyxHQUFHLEdBQUcsTUFBSztFQUNyQyxPQUFPO0VBQ1AsS0FBSyxFQUFDO0VBQ04sSUFBSSxPQUFPLEdBQUc7RUFDZCxHQUFHO0FBQ0g7RUFDQSxFQUFFLElBQUksQ0FBQyxHQUFHO0VBQ1Y7RUFDQSxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBQztFQUNwRCxHQUFHO0FBQ0g7RUFDQSxFQUFFLFVBQVUsQ0FBQyxHQUFHO0VBQ2hCLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLO0VBQ2hDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQztFQUN0QyxLQUFLLEVBQUM7RUFDTixHQUFHO0FBQ0g7RUFDQSxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRTtFQUNkO0VBQ0E7RUFDQSxJQUFJLElBQUksRUFBRSxJQUFJLFlBQVksUUFBUSxDQUFDLEVBQUU7RUFDckMsTUFBTSxJQUFJLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFDO0VBQy9CLEtBQUs7QUFDTDtFQUNBLElBQUksSUFBSSxJQUFJLEdBQUcsS0FBSTtFQUNuQixJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsS0FBSztFQUN6QyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxLQUFLLEVBQUU7RUFDckUsUUFBUSxJQUFJLEdBQUcsTUFBSztFQUNwQixPQUFPO0VBQ1AsS0FBSyxFQUFDO0VBQ04sSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEtBQUs7RUFDekMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssS0FBSyxFQUFFO0VBQ3JFLFFBQVEsSUFBSSxHQUFHLE1BQUs7RUFDcEIsT0FBTztFQUNQLEtBQUssRUFBQztFQUNOLElBQUksT0FBTyxJQUFJO0VBQ2YsR0FBRztBQUNIO0VBQ0EsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFO0VBQ3hCLElBQUksSUFBSSxFQUFFLElBQUksWUFBWSxRQUFRLENBQUMsRUFBRTtFQUNyQyxNQUFNLElBQUksR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUM7RUFDL0IsS0FBSztFQUNMO0VBQ0E7RUFDQTtFQUNBLElBQUksSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFLFNBQVMsR0FBRyxLQUFJO0VBQ2pELElBQUksSUFBSSxTQUFTLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLENBQUM7RUFDN0UsSUFBSSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFDO0VBQzdCLElBQUksTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUU7RUFDdEIsSUFBSSxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7RUFDOUIsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUU7RUFDaEI7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsSUFBSSxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBQztFQUN2QyxJQUFJLE1BQU0sQ0FBQyxHQUFHLElBQUksS0FBSyxFQUFFLEdBQUcsQ0FBQztFQUM3QixRQUFRLElBQUksS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0VBQ3pCLFVBQVUsUUFBUSxDQUFDLElBQUksRUFBQztFQUN4QixJQUFJLElBQUksRUFBRSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMscUJBQXFCLEVBQUM7RUFDN0MsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsR0FBRyxHQUFFO0VBQ3BCLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDeEMsTUFBTSxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBQztFQUNoQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUM7RUFDdEMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBQztFQUNmLEtBQUs7RUFDTCxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFDO0VBQ25DLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFDO0VBQ2QsSUFBSSxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksR0FBRyxDQUFDLEVBQUUsRUFBQztFQUN6QixHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQ2pCO0VBQ0EsSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFDO0VBQ2YsSUFBSSxNQUFNLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDaEMsSUFBSSxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7RUFDOUIsR0FBRztFQUNIOztFQ3BJZSxNQUFNLFVBQVUsQ0FBQztFQUNoQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEtBQUssRUFBRTtFQUN0QixJQUFJLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLFlBQVksUUFBUSxDQUFDLEVBQUU7RUFDaEUsTUFBTSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUM7RUFDL0IsTUFBTSxJQUFJLENBQUMsS0FBSyxHQUFHLE1BQUs7RUFDeEIsS0FBSyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDOUIsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBQztFQUN6QixLQUFLLE1BQU0sSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUU7RUFDMUMsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBQztFQUN6QixLQUFLO0VBQ0wsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUU7RUFDaEIsSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFDO0VBQ2xDLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksRUFBQztFQUNqQyxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUM7RUFDaEMsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0VBQy9CLE9BQU8sR0FBRyxDQUFDLENBQUMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNoQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUM7RUFDN0IsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDZCxJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBQztFQUNsQyxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sQ0FBQyxHQUFHO0VBQ2IsSUFBSSxJQUFJLEdBQUcsR0FBRyxHQUFFO0VBQ2hCLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ2hELE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRTtFQUN6QyxRQUFRLEdBQUcsSUFBSSxJQUFHO0VBQ2xCLE9BQU87RUFDUCxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRTtFQUNwQyxLQUFLO0VBQ0wsSUFBSSxPQUFPLEdBQUc7RUFDZCxHQUFHO0FBQ0g7RUFDQSxFQUFFLFFBQVEsQ0FBQyxHQUFHO0VBQ2QsSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUU7RUFDekIsR0FBRztBQUNIO0VBQ0EsRUFBRSxLQUFLLENBQUMsR0FBRztFQUNYLElBQUksTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBQztFQUNoRCxJQUFJLE9BQU8sSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDO0VBQ2hDLEdBQUc7QUFDSDtFQUNBLEVBQUUsUUFBUSxDQUFDLEdBQUc7RUFDZDtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUU7RUFDcEMsSUFBSSxJQUFJLFFBQVEsR0FBRyxHQUFFO0VBQ3JCLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDM0MsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVE7RUFDN0IsTUFBTSxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUMsQ0FBQyxFQUFDO0VBQzVCLE1BQU0sS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ2pELFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRO0VBQy9CLFFBQVEsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQ3JDLFVBQVUsT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQ3pDLFVBQVUsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUk7RUFDekIsU0FBUztFQUNULE9BQU87RUFDUCxNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDO0VBQzVCLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUk7RUFDckIsS0FBSztFQUNMLElBQUksUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJ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USxLQUFLO0VBQ2IsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsRUFBRTtFQUNkLFFBQVEsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFDO0VBQ25FLFFBQVEsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFDO0VBQ25FLFFBQVEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDekMsVUFBVSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUNyRCxVQUFVLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFBQztFQUMzRCxVQUFVLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUc7RUFDN0IsWUFBWSxHQUFHLEVBQUUsSUFBSSxVQUFVLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQztFQUNqRCxZQUFZLE1BQU0sRUFBRSxLQUFLO0VBQ3pCLFlBQVc7RUFDWCxTQUFTO0VBQ1QsUUFBUSxLQUFLO0VBQ2IsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsRUFBRTtFQUNkLFFBQVEsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFDO0VBQzNELFFBQVEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDekMsVUFBVSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUNyRCxVQUFVLE1BQU0sR0FBRyxHQUFHLFdB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QUksQ0FBQztFQUNyQyxZQUFZLE1BQU0sRUFBRSxLQUFLO0VBQ3pCLFlBQVc7RUFDWCxTQUFTO0VBQ1QsUUFBUSxLQUFLO0VBQ2IsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsRUFBRTtFQUNkLFFBQVEsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUM7RUFDL0MsUUFBUSxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBQztFQUNsRCxRQUFRLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBQztFQUN0RCxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3pDLFVBQVUsTUFBTSxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDbEQsVUFBVSxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDeEQsVUFBVSxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDeEQsVUFBVSxJQUFJLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBRztFQUM3QyxVQUFVLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDM0IsWUFBWSxNQUFNLEVBQUUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQ3BELFlBQVksTUFBTSxHQUFHLEdBQUcsR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQzFELFlBQVksTUFBTSxHQUFH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QUcsV0FBVyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFBO1VBQzVDLE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQTtVQUM3QyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxJQUFJLFVBQVUsRUFBRSxDQUFDLE1BQU0sR0FBRyxNQUFNLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQTs7VUFHcEYsT0FBTyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDN0MsV0FBVyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDakQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUE7VUFDL0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FDNUQ7TUFFRCxNQUFNO1VBQ0osTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7VUFDeEMsSUFBSSxHQUFHLEtBQUssSUFBSTtjQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQTtVQUVqRSxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDekMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFD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QUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ2hDLEtBQUssU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBQztBQUNsQztFQUNBLEVBQUUsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLEtBQUssRUFBRTtFQUM5QixLQUFLLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ2hDLEtBQUssU0FBUyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUM7QUFDcEM7RUFDQSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFDO0VBQzFCLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDMUIsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFBQztFQUNwQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFDO0VBQzFCLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUM7RUFDcEMsQ0FBQztBQUNEO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNPLFNBQVMsY0FBYyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUU7RUFDcEQsRUFBRSxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDdkMsRUFBRSxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDdkMsRUFBRSxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFDO0VBQ3BFLEVBQUUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBQztFQUN2RSxFQUFFLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLEVBQUM7RUFDcEUsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBQztFQUM1QixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFDO0VBQzVCLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUM7RUFDNUIsQ0FBQztBQUNEO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ08sU0FBUyxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUU7RUFDdEUsRUFBRSxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDckMsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUk7RUFDaEIsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUk7RUFDaEIsRUFB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QU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtXQUFFO1VBQzlELEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1VBQzFELEdBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUE7O1VBR25CLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtVQUNmLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtVQUM5QixHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDOUIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1VBQzlCLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtVQUM5QixHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDOUIsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFBO1VBQ1osR0FBRyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7VUFDaEMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFBO1VBQ1YsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFBOztVQUdmLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQ25CLEVBQUUsRUFDRixJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FB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QUFJLEdBQUcsQ0FBQTtVQUM1QyxXQUFXLENBQUMsTUFBTSxTQUFHLFdBQVcsQ0FBQyxNQUFNLG1DQUFJLEdBQUcsQ0FBQTs7VUFHOUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO1VBQ3pCLE1BQU0sQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztVQUM3QyxNQUFNLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7VUFDeEQsTUFBTSxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDLENBQUM7VUFFbEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztVQUM1RCxNQUFNLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQzs7VUFJOUMsTUFBTSxRQUFRLFNBQUcsV0FBVyxDQUFDLFFBQVEsbUNBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUNqRTtVQUFBLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEdBQUcsRUFBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FB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QUFJLENBQUMsRUFBRSxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7Y0FFdkMsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUE7Y0FDMUIsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUE7Y0FDekIsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtrQkFBRSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQTtlQUFFO2NBQ3RELElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7a0JBQUUsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUE7ZUFBRTs7Y0FHckQsSUFBSSxDQUFDLFFBQVEsU0FBRyxJQUFJLENBQUMsUUFBUSxtQ0FBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQzNEO2NBQUEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFTLENBQUMsQ0FBQyxDQUFBO2NBQzNFLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFBOzs7Y0FJekYsTUFBTSxLQUFLLEdBQTZCO2tCQUN0QyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztrQkFDaEMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7a0JBQ2pDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO2VBQ2xDLENBQUE7OztjQUlELElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO2tCQUMxQixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtlQUNoRDttQkFBTTtrQkFDTCxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtlQUNoRDtjQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7a0JBQzFCLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtzQkFBRSxTQUFRO2tCQUMvQixNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUE7a0JBQ2pCLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2tCQUNoRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLEtB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LEtBQUcsQ0FBQyxDQUFDLENBQUE7c0JBQ3BELENBQUMsR0FBRyxRQUFROzBCQUNWLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFDLFVBQVUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsSUFBRyxHQUFHLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQzswQkFDekQsaUJBQWlCLENBQUMsQ0FBQyxFQUFDLElBQUksR0FBQyxVQUFVLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLElBQUcsR0FBRyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQTtzQkFDL0QsT0FBTyxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO21CQUN4RDt1QkFBTTtzQkFDTCxDQUFDLEdBQUcsUUFBUTswQkFDVixpQkFBaUIsQ0FBQyxVQUFVLEdBQUMsQ0FBQyxFQUFFLElBQUksR0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDOzBCQUM1RCxpQkFBaUIsQ0FBQyxDQUFDLEVBQUMsSUFBSSxHQUFDLFVBQVUsR0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUE7c0JBQzdELENBQUMsR0FBRyxRQUFROzBCQUNWLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQzswQkFDckUsaUJBQWlCLENBQUMsQ0FBQyxFQUFDLElBQUksR0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxVQUFVLENBQUMsRUFB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QUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksRUFBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLHVVQUF1VSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsR0FBRyxVQUFVLEdBQUcsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFNLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFJLFVBQVUsRUFBRSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU0sUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGtDQUFrQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHlEQUF5RCxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsT0FBTyxNQUFNLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxD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
