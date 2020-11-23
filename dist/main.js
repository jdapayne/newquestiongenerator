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
   * @license Fraction.js v4.0.9 09/09/2015
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

    (function (root) {

      // Maximum search depth for cyclic rational numbers. 2000 should be more than enough.
      // Example: 1/7 = 0.(142857) has 6 repeating decimal places.
      // If MAX_CYCLE_LEN gets reduced, long cycles will not be detected and toString() only gets the first 10 digits
      var MAX_CYCLE_LEN = 2000;

      // Parsed data to avoid calling "new" all the time
      var P = {
        s: 1,
        n: 0,
        d: 1
      };

      function createError (name) {
        function errorConstructor () {
          var temp = Error.apply(this, arguments);
          temp.name = this.name = name;
          this.stack = temp.stack;
          this.message = temp.message;
        }

        /**
       * Error constructor
       *
       * @constructor
       */
        function IntermediateInheritor () {}
        IntermediateInheritor.prototype = Error.prototype;
        errorConstructor.prototype = new IntermediateInheritor();

        return errorConstructor
      }

      var DivisionByZero = Fraction.DivisionByZero = createError('DivisionByZero');
      var InvalidParameter = Fraction.InvalidParameter = createError('InvalidParameter');

      function assign (n, s) {
        if (isNaN(n = parseInt(n, 10))) {
          throwInvalidParam();
        }
        return n * s
      }

      function throwInvalidParam () {
        throw new InvalidParameter()
      }

      var parse = function (p1, p2) {
        var n = 0; var d = 1; var s = 1;
        var v = 0; var w = 0; var x = 0; var y = 1; var z = 1;

        var A = 0; var B = 1;
        var C = 1; var D = 1;

        var N = 10000000;
        var M;

        if (p1 === undefined || p1 === null) ; else if (p2 !== undefined) {
          n = p1;
          d = p2;
          s = n * d;
        } else {
          switch (typeof p1) {
            case 'object':
            {
              if ('d' in p1 && 'n' in p1) {
                n = p1.n;
                d = p1.d;
                if ('s' in p1) { n *= p1.s; }
              } else if (0 in p1) {
                n = p1[0];
                if (1 in p1) { d = p1[1]; }
              } else {
                throwInvalidParam();
              }
              s = n * d;
              break
            }
            case 'number':
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
                    break
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
              break
            }
            case 'string':
            {
              B = p1.match(/\d+|./g);

              if (B === null) { throwInvalidParam(); }

              if (B[A] === '-') { // Check for minus sign at the beginning
                s = -1;
                A++;
              } else if (B[A] === '+') { // Check for plus sign at the beginning
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
                break
              }

            /* Fall through on error */
            }
            default:
              throwInvalidParam();
          }
        }

        if (d === 0) {
          throw new DivisionByZero()
        }

        P.s = s < 0 ? -1 : 1;
        P.n = Math.abs(n);
        P.d = Math.abs(d);
      };

      function modpow (b, e, m) {
        var r = 1;
        for (; e > 0; b = (b * b) % m, e >>= 1) {
          if (e & 1) {
            r = (r * b) % m;
          }
        }
        return r
      }

      function cycleLen (n, d) {
        for (; d % 2 === 0;
          d /= 2) {
        }

        for (; d % 5 === 0;
          d /= 5) {
        }

        if (d === 1) // Catch non-cyclic numbers
        { return 0 }

        // If we would like to compute really large numbers quicker, we could make use of Fermat's little theorem:
        // 10^(d-1) % d == 1
        // However, we don't need such large numbers and MAX_CYCLE_LEN should be the capstone,
        // as we want to translate the numbers to strings.

        var rem = 10 % d;
        var t = 1;

        for (; rem !== 1; t++) {
          rem = rem * 10 % d;

          if (t > MAX_CYCLE_LEN) { return 0 } // Returning 0 here means that we don't print it as a cyclic number. It's likely that the answer is `d-1`
        }
        return t
      }

      function cycleStart (n, d, len) {
        var rem1 = 1;
        var rem2 = modpow(10, len, d);

        for (var t = 0; t < 300; t++) { // s < ~log10(Number.MAX_VALUE)
        // Solve 10^s == 10^(s+t) (mod d)

          if (rem1 === rem2) { return t }

          rem1 = rem1 * 10 % d;
          rem2 = rem2 * 10 % d;
        }
        return 0
      }

      function gcd (a, b) {
        if (!a) { return b }
        if (!b) { return a }

        while (1) {
          a %= b;
          if (!a) { return b }
          b %= a;
          if (!b) { return a }
        }
      }
      /**
     * Module constructor
     *
     * @constructor
     * @param {number|Fraction=} a
     * @param {number=} b
     */
      function Fraction (a, b) {
        if (!(this instanceof Fraction)) {
          return new Fraction(a, b)
        }

        parse(a, b);

        if (Fraction.REDUCE) {
          a = gcd(P.d, P.n); // Abuse a
        } else {
          a = 1;
        }

        this.s = P.s;
        this.n = P.n / a;
        this.d = P.d / a;
      }

      /**
     * Boolean global variable to be able to disable automatic reduction of the fraction
     *
     */
      Fraction.REDUCE = 1;

      Fraction.prototype = {

        s: 1,
        n: 0,
        d: 1,

        /**
       * Calculates the absolute value
       *
       * Ex: new Fraction(-4).abs() => 4
       **/
        abs: function () {
          return new Fraction(this.n, this.d)
        },

        /**
       * Inverts the sign of the current fraction
       *
       * Ex: new Fraction(-4).neg() => 4
       **/
        neg: function () {
          return new Fraction(-this.s * this.n, this.d)
        },

        /**
       * Adds two rational numbers
       *
       * Ex: new Fraction({n: 2, d: 3}).add("14.9") => 467 / 30
       **/
        add: function (a, b) {
          parse(a, b);
          return new Fraction(
            this.s * this.n * P.d + P.s * this.d * P.n,
            this.d * P.d
          )
        },

        /**
       * Subtracts two rational numbers
       *
       * Ex: new Fraction({n: 2, d: 3}).add("14.9") => -427 / 30
       **/
        sub: function (a, b) {
          parse(a, b);
          return new Fraction(
            this.s * this.n * P.d - P.s * this.d * P.n,
            this.d * P.d
          )
        },

        /**
       * Multiplies two rational numbers
       *
       * Ex: new Fraction("-17.(345)").mul(3) => 5776 / 111
       **/
        mul: function (a, b) {
          parse(a, b);
          return new Fraction(
            this.s * P.s * this.n * P.n,
            this.d * P.d
          )
        },

        /**
       * Divides two rational numbers
       *
       * Ex: new Fraction("-17.(345)").inverse().div(3)
       **/
        div: function (a, b) {
          parse(a, b);
          return new Fraction(
            this.s * P.s * this.n * P.d,
            this.d * P.n
          )
        },

        /**
       * Clones the actual object
       *
       * Ex: new Fraction("-17.(345)").clone()
       **/
        clone: function () {
          return new Fraction(this)
        },

        /**
       * Calculates the modulo of two rational numbers - a more precise fmod
       *
       * Ex: new Fraction('4.(3)').mod([7, 8]) => (13/3) % (7/8) = (5/6)
       **/
        mod: function (a, b) {
          if (isNaN(this.n) || isNaN(this.d)) {
            return new Fraction(NaN)
          }

          if (a === undefined) {
            return new Fraction(this.s * this.n % this.d, 1)
          }

          parse(a, b);
          if (P.n === 0 && this.d === 0) {
            Fraction(0, 0); // Throw DivisionByZero
          }

          /*
         * First silly attempt, kinda slow
         *
         return that["sub"]({
         "n": num["n"] * Math.floor((this.n / this.d) / (num.n / num.d)),
         "d": num["d"],
         "s": this["s"]
         }); */

          /*
         * New attempt: a1 / b1 = a2 / b2 * q + r
         * => b2 * a1 = a2 * b1 * q + b1 * b2 * r
         * => (b2 * a1 % a2 * b1) / (b1 * b2)
         */
          return new Fraction(
            this.s * (P.d * this.n) % (P.n * this.d),
            P.d * this.d
          )
        },

        /**
       * Calculates the fractional gcd of two rational numbers
       *
       * Ex: new Fraction(5,8).gcd(3,7) => 1/56
       */
        gcd: function (a, b) {
          parse(a, b);

          // gcd(a / b, c / d) = gcd(a, c) / lcm(b, d)

          return new Fraction(gcd(P.n, this.n) * gcd(P.d, this.d), P.d * this.d)
        },

        /**
       * Calculates the fractional lcm of two rational numbers
       *
       * Ex: new Fraction(5,8).lcm(3,7) => 15
       */
        lcm: function (a, b) {
          parse(a, b);

          // lcm(a / b, c / d) = lcm(a, c) / gcd(b, d)

          if (P.n === 0 && this.n === 0) {
            return new Fraction()
          }
          return new Fraction(P.n * this.n, gcd(P.n, this.n) * gcd(P.d, this.d))
        },

        /**
       * Calculates the ceil of a rational number
       *
       * Ex: new Fraction('4.(3)').ceil() => (5 / 1)
       **/
        ceil: function (places) {
          places = Math.pow(10, places || 0);

          if (isNaN(this.n) || isNaN(this.d)) {
            return new Fraction(NaN)
          }
          return new Fraction(Math.ceil(places * this.s * this.n / this.d), places)
        },

        /**
       * Calculates the floor of a rational number
       *
       * Ex: new Fraction('4.(3)').floor() => (4 / 1)
       **/
        floor: function (places) {
          places = Math.pow(10, places || 0);

          if (isNaN(this.n) || isNaN(this.d)) {
            return new Fraction(NaN)
          }
          return new Fraction(Math.floor(places * this.s * this.n / this.d), places)
        },

        /**
       * Rounds a rational numbers
       *
       * Ex: new Fraction('4.(3)').round() => (4 / 1)
       **/
        round: function (places) {
          places = Math.pow(10, places || 0);

          if (isNaN(this.n) || isNaN(this.d)) {
            return new Fraction(NaN)
          }
          return new Fraction(Math.round(places * this.s * this.n / this.d), places)
        },

        /**
       * Gets the inverse of the fraction, means numerator and denumerator are exchanged
       *
       * Ex: new Fraction([-3, 4]).inverse() => -4 / 3
       **/
        inverse: function () {
          return new Fraction(this.s * this.d, this.n)
        },

        /**
       * Calculates the fraction to some integer exponent
       *
       * Ex: new Fraction(-1,2).pow(-3) => -8
       */
        pow: function (m) {
          if (m < 0) {
            return new Fraction(Math.pow(this.s * this.d, -m), Math.pow(this.n, -m))
          } else {
            return new Fraction(Math.pow(this.s * this.n, m), Math.pow(this.d, m))
          }
        },

        /**
       * Check if two rational numbers are the same
       *
       * Ex: new Fraction(19.6).equals([98, 5]);
       **/
        equals: function (a, b) {
          parse(a, b);
          return this.s * this.n * P.d === P.s * P.n * this.d // Same as compare() === 0
        },

        /**
       * Check if two rational numbers are the same
       *
       * Ex: new Fraction(19.6).equals([98, 5]);
       **/
        compare: function (a, b) {
          parse(a, b);
          var t = (this.s * this.n * P.d - P.s * P.n * this.d);
          return (t > 0) - (t < 0)
        },

        simplify: function (eps) {
        // First naive implementation, needs improvement

          if (isNaN(this.n) || isNaN(this.d)) {
            return this
          }

          var cont = this.abs().toContinued();

          eps = eps || 0.001;

          function rec (a) {
            if (a.length === 1) { return new Fraction(a[0]) }
            return rec(a.slice(1)).inverse().add(a[0])
          }

          for (var i = 0; i < cont.length; i++) {
            var tmp = rec(cont.slice(0, i + 1));
            if (tmp.sub(this.abs()).abs().valueOf() < eps) {
              return tmp.mul(this.s)
            }
          }
          return this
        },

        /**
       * Check if two rational numbers are divisible
       *
       * Ex: new Fraction(19.6).divisible(1.5);
       */
        divisible: function (a, b) {
          parse(a, b);
          return !(!(P.n * this.d) || ((this.n * P.d) % (P.n * this.d)))
        },

        /**
       * Returns a decimal representation of the fraction
       *
       * Ex: new Fraction("100.'91823'").valueOf() => 100.91823918239183
       **/
        valueOf: function () {
          return this.s * this.n / this.d
        },

        /**
       * Returns a string-fraction representation of a Fraction object
       *
       * Ex: new Fraction("1.'3'").toFraction() => "4 1/3"
       **/
        toFraction: function (excludeWhole) {
          var whole; var str = '';
          var n = this.n;
          var d = this.d;
          if (this.s < 0) {
            str += '-';
          }

          if (d === 1) {
            str += n;
          } else {
            if (excludeWhole && (whole = Math.floor(n / d)) > 0) {
              str += whole;
              str += ' ';
              n %= d;
            }

            str += n;
            str += '/';
            str += d;
          }
          return str
        },

        /**
       * Returns a latex representation of a Fraction object
       *
       * Ex: new Fraction("1.'3'").toLatex() => "\frac{4}{3}"
       **/
        toLatex: function (excludeWhole) {
          var whole; var str = '';
          var n = this.n;
          var d = this.d;
          if (this.s < 0) {
            str += '-';
          }

          if (d === 1) {
            str += n;
          } else {
            if (excludeWhole && (whole = Math.floor(n / d)) > 0) {
              str += whole;
              n %= d;
            }

            str += '\\frac{';
            str += n;
            str += '}{';
            str += d;
            str += '}';
          }
          return str
        },

        /**
       * Returns an array of continued fraction elements
       *
       * Ex: new Fraction("7/8").toContinued() => [0,1,7]
       */
        toContinued: function () {
          var t;
          var a = this.n;
          var b = this.d;
          var res = [];

          if (isNaN(this.n) || isNaN(this.d)) {
            return res
          }

          do {
            res.push(Math.floor(a / b));
            t = a % b;
            a = b;
            b = t;
          } while (a !== 1)

          return res
        },

        /**
       * Creates a string representation of a fraction with all digits
       *
       * Ex: new Fraction("100.'91823'").toString() => "100.(91823)"
       **/
        toString: function (dec) {
          var g;
          var N = this.n;
          var D = this.d;

          if (isNaN(N) || isNaN(D)) {
            return 'NaN'
          }

          if (!Fraction.REDUCE) {
            g = gcd(N, D);
            N /= g;
            D /= g;
          }

          dec = dec || 15; // 15 = decimal places when no repitation

          var cycLen = cycleLen(N, D); // Cycle length
          var cycOff = cycleStart(N, D, cycLen); // Cycle start

          var str = this.s === -1 ? '-' : '';

          str += N / D | 0;

          N %= D;
          N *= 10;

          if (N) { str += '.'; }

          if (cycLen) {
            for (var i = cycOff; i--;) {
              str += N / D | 0;
              N %= D;
              N *= 10;
            }
            str += '(';
            for (var i = cycLen; i--;) {
              str += N / D | 0;
              N %= D;
              N *= 10;
            }
            str += ')';
          } else {
            for (var i = dec; N && i--;) {
              str += N / D | 0;
              N %= D;
              N *= 10;
            }
          }
          return str
        }
      };

      {
        Object.defineProperty(exports, '__esModule', { value: true });
        Fraction.default = Fraction;
        Fraction.Fraction = Fraction;
        module.exports = Fraction;
      }
    })();
  });

  var Fraction = /* @__PURE__ */getDefaultExportFromCjs(fraction);

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

  var fraction$1 = createCommonjsModule(function (module, exports) {
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

  var fraction$2 = /*@__PURE__*/getDefaultExportFromCjs(fraction$1);

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
                  v.label = new fraction$2(v.val, denominator).toLatex(true) + '\\mathrm{cm}';
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
                  this._perimeter.label = new fraction$2(this._perimeter.val, this.denominator).toLatex(true) + '\\mathrm{cm}';
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
                  this._area.label = new fraction$2(this._area.val, Math.pow(this.denominator, 2)).toLatex(true) + '\\mathrm{cm}^2';
              }
              else {
                  this._area.label = scaledStr(this._area.val, 2 * this.dp) + '\\mathrm{cm}^2';
              }
          }
          return this._area;
      }
  }

  function arrowLine (ctx, pt1, pt2, size, m) {
    if (!m) m = 0.5;

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
          Point.scaleToFit([A, B, C, D], viewOptions.width, viewOptions.height, 80);
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
                  this._perimeter.label = new fraction$2(this._perimeter.val, this.denominator).toLatex(true) + '\\mathrm{cm}';
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
                  this._area.label = new fraction$2(this._area.val, Math.pow(this.denominator, 2)).toLatex(true) + '\\mathrm{cm}^2';
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
                      v.label = new fraction$2(v.val, denominator).toLatex(true) + "\\mathrm{cm}";
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
              Point.scaleToFit([this.A, this.B, this.C, this.ht], this.width, this.height, 80);
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
                  const stylea = sides[i][2].missing ? 'answer' : 'normal';
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
                  questionOptions.questionType = 'pythagorasArea';
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
              case 'parallelogram':
              case 'trapezium':
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
                      { id: 'rectangle', title: 'Rectangle' },
                      { id: 'triangle', title: 'Triangle' }
                  ],
                  default: ['rectangle'],
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vbW9kdWxlcy92ZW5kb3IvcnNsaWRlci5qcyIsIi4uLy4uL21vZHVsZXMvUG9pbnQudHMiLCIuLi9tb2R1bGVzL3V0aWxpdGllcy5qcyIsIi4uLy4uL21vZHVsZXMvT3B0aW9uc1NldC50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vUXVlc3Rpb24udHMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL1RleHRRLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9UZXh0US9BbGdlYnJhaWNGcmFjdGlvblEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0ludGVnZXJBZGQuanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRLnRzIiwiLi4vbW9kdWxlcy92ZW5kb3IvZnJhY3Rpb24uanMiLCIuLi9tb2R1bGVzL01vbm9taWFsLmpzIiwiLi4vbW9kdWxlcy9Qb2x5bm9taWFsLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9Bcml0aG1hZ29uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGVzdFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FkZEFaZXJvLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9UZXh0US9FcXVhdGlvbk9mTGluZS5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUS50cyIsIi4uL21vZHVsZXMvTGluRXhwci5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9zb2x2ZUFuZ2xlcy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dvcmRlZFEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dyYXBwZXIudHMiLCIuLi9ub2RlX21vZHVsZXMvZnJhY3Rpb24uanMvZnJhY3Rpb24uanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvUmVjdGFuZ2xlQXJlYURhdGEudHMiLCIuLi9tb2R1bGVzL2RyYXdpbmcuanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvdHlwZXMudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvUmVjdGFuZ2xlQXJlYVZpZXcudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvUmVjdGFuZ2xlQXJlYVEudHMiLCIuLi9ub2RlX21vZHVsZXMvdHNsaWIvdHNsaWIuZXM2LmpzIiwiLi4vLi4vbW9kdWxlcy90cmlhbmdsZURhdGEtcXVldWUudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvVHJpYW5nbGVBcmVhRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQXJlYVBlcmltZXRlci9UcmlhbmdsZUFyZWFWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL1RyaWFuZ2xlQXJlYVEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvQXJlYVdyYXBwZXIudHMiLCIuLi9tb2R1bGVzL1RvcGljQ2hvb3Nlci5qcyIsIi4uL25vZGVfbW9kdWxlcy90aW5nbGUuanMvZGlzdC90aW5nbGUubWluLmpzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvblNldC50cyIsIi4uL21haW4uanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogUnNsaWRlci4gRG93bmxvYWRlZCBmcm9tIGh0dHBzOi8vc2xhd29taXItemF6aWFibG8uZ2l0aHViLmlvL3JhbmdlLXNsaWRlci9cbiAqIE1vZGlmaWVkIHRvIG1ha2UgaW50byBFUzYgbW9kdWxlIGFuZCBmaXggYSBmZXcgYnVnc1xuICovXG5cbnZhciBSUyA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIHRoaXMuaW5wdXQgPSBudWxsXG4gIHRoaXMuaW5wdXREaXNwbGF5ID0gbnVsbFxuICB0aGlzLnNsaWRlciA9IG51bGxcbiAgdGhpcy5zbGlkZXJXaWR0aCA9IDBcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gMFxuICB0aGlzLnBvaW50ZXJXaWR0aCA9IDBcbiAgdGhpcy5wb2ludGVyUiA9IG51bGxcbiAgdGhpcy5wb2ludGVyTCA9IG51bGxcbiAgdGhpcy5hY3RpdmVQb2ludGVyID0gbnVsbFxuICB0aGlzLnNlbGVjdGVkID0gbnVsbFxuICB0aGlzLnNjYWxlID0gbnVsbFxuICB0aGlzLnN0ZXAgPSAwXG4gIHRoaXMudGlwTCA9IG51bGxcbiAgdGhpcy50aXBSID0gbnVsbFxuICB0aGlzLnRpbWVvdXQgPSBudWxsXG4gIHRoaXMudmFsUmFuZ2UgPSBmYWxzZVxuXG4gIHRoaXMudmFsdWVzID0ge1xuICAgIHN0YXJ0OiBudWxsLFxuICAgIGVuZDogbnVsbFxuICB9XG4gIHRoaXMuY29uZiA9IHtcbiAgICB0YXJnZXQ6IG51bGwsXG4gICAgdmFsdWVzOiBudWxsLFxuICAgIHNldDogbnVsbCxcbiAgICByYW5nZTogZmFsc2UsXG4gICAgd2lkdGg6IG51bGwsXG4gICAgc2NhbGU6IHRydWUsXG4gICAgbGFiZWxzOiB0cnVlLFxuICAgIHRvb2x0aXA6IHRydWUsXG4gICAgc3RlcDogbnVsbCxcbiAgICBkaXNhYmxlZDogZmFsc2UsXG4gICAgb25DaGFuZ2U6IG51bGxcbiAgfVxuXG4gIHRoaXMuY2xzID0ge1xuICAgIGNvbnRhaW5lcjogJ3JzLWNvbnRhaW5lcicsXG4gICAgYmFja2dyb3VuZDogJ3JzLWJnJyxcbiAgICBzZWxlY3RlZDogJ3JzLXNlbGVjdGVkJyxcbiAgICBwb2ludGVyOiAncnMtcG9pbnRlcicsXG4gICAgc2NhbGU6ICdycy1zY2FsZScsXG4gICAgbm9zY2FsZTogJ3JzLW5vc2NhbGUnLFxuICAgIHRpcDogJ3JzLXRvb2x0aXAnXG4gIH1cblxuICBmb3IgKHZhciBpIGluIHRoaXMuY29uZikgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbmYsIGkpKSB0aGlzLmNvbmZbaV0gPSBjb25mW2ldIH1cblxuICB0aGlzLmluaXQoKVxufVxuXG5SUy5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHR5cGVvZiB0aGlzLmNvbmYudGFyZ2V0ID09PSAnb2JqZWN0JykgdGhpcy5pbnB1dCA9IHRoaXMuY29uZi50YXJnZXRcbiAgZWxzZSB0aGlzLmlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5jb25mLnRhcmdldC5yZXBsYWNlKCcjJywgJycpKVxuXG4gIGlmICghdGhpcy5pbnB1dCkgcmV0dXJuIGNvbnNvbGUubG9nKCdDYW5ub3QgZmluZCB0YXJnZXQgZWxlbWVudC4uLicpXG5cbiAgdGhpcy5pbnB1dERpc3BsYXkgPSBnZXRDb21wdXRlZFN0eWxlKHRoaXMuaW5wdXQsIG51bGwpLmRpc3BsYXlcbiAgdGhpcy5pbnB1dC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG4gIHRoaXMudmFsUmFuZ2UgPSAhKHRoaXMuY29uZi52YWx1ZXMgaW5zdGFuY2VvZiBBcnJheSlcblxuICBpZiAodGhpcy52YWxSYW5nZSkge1xuICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuY29uZi52YWx1ZXMsICdtaW4nKSB8fCAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuY29uZi52YWx1ZXMsICdtYXgnKSkgeyByZXR1cm4gY29uc29sZS5sb2coJ01pc3NpbmcgbWluIG9yIG1heCB2YWx1ZS4uLicpIH1cbiAgfVxuICByZXR1cm4gdGhpcy5jcmVhdGVTbGlkZXIoKVxufVxuXG5SUy5wcm90b3R5cGUuY3JlYXRlU2xpZGVyID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNsaWRlciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLmNvbnRhaW5lcilcbiAgdGhpcy5zbGlkZXIuaW5uZXJIVE1MID0gJzxkaXYgY2xhc3M9XCJycy1iZ1wiPjwvZGl2PidcbiAgdGhpcy5zZWxlY3RlZCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnNlbGVjdGVkKVxuICB0aGlzLnBvaW50ZXJMID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMucG9pbnRlciwgWydkaXInLCAnbGVmdCddKVxuICB0aGlzLnNjYWxlID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMuc2NhbGUpXG5cbiAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7XG4gICAgdGhpcy50aXBMID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMudGlwKVxuICAgIHRoaXMudGlwUiA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnRpcClcbiAgICB0aGlzLnBvaW50ZXJMLmFwcGVuZENoaWxkKHRoaXMudGlwTClcbiAgfVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnNlbGVjdGVkKVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnNjYWxlKVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnBvaW50ZXJMKVxuXG4gIGlmICh0aGlzLmNvbmYucmFuZ2UpIHtcbiAgICB0aGlzLnBvaW50ZXJSID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMucG9pbnRlciwgWydkaXInLCAncmlnaHQnXSlcbiAgICBpZiAodGhpcy5jb25mLnRvb2x0aXApIHRoaXMucG9pbnRlclIuYXBwZW5kQ2hpbGQodGhpcy50aXBSKVxuICAgIHRoaXMuc2xpZGVyLmFwcGVuZENoaWxkKHRoaXMucG9pbnRlclIpXG4gIH1cblxuICB0aGlzLmlucHV0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuc2xpZGVyLCB0aGlzLmlucHV0Lm5leHRTaWJsaW5nKVxuXG4gIGlmICh0aGlzLmNvbmYud2lkdGgpIHRoaXMuc2xpZGVyLnN0eWxlLndpZHRoID0gcGFyc2VJbnQodGhpcy5jb25mLndpZHRoKSArICdweCdcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gdGhpcy5zbGlkZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdFxuICB0aGlzLnNsaWRlcldpZHRoID0gdGhpcy5zbGlkZXIuY2xpZW50V2lkdGhcbiAgdGhpcy5wb2ludGVyV2lkdGggPSB0aGlzLnBvaW50ZXJMLmNsaWVudFdpZHRoXG5cbiAgaWYgKCF0aGlzLmNvbmYuc2NhbGUpIHRoaXMuc2xpZGVyLmNsYXNzTGlzdC5hZGQodGhpcy5jbHMubm9zY2FsZSlcblxuICByZXR1cm4gdGhpcy5zZXRJbml0aWFsVmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLnNldEluaXRpYWxWYWx1ZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZGlzYWJsZWQodGhpcy5jb25mLmRpc2FibGVkKVxuXG4gIGlmICh0aGlzLnZhbFJhbmdlKSB0aGlzLmNvbmYudmFsdWVzID0gcHJlcGFyZUFycmF5VmFsdWVzKHRoaXMuY29uZilcblxuICB0aGlzLnZhbHVlcy5zdGFydCA9IDBcbiAgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnJhbmdlID8gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxIDogMFxuXG4gIGlmICh0aGlzLmNvbmYuc2V0ICYmIHRoaXMuY29uZi5zZXQubGVuZ3RoICYmIGNoZWNrSW5pdGlhbCh0aGlzLmNvbmYpKSB7XG4gICAgdmFyIHZhbHMgPSB0aGlzLmNvbmYuc2V0XG5cbiAgICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgICB0aGlzLnZhbHVlcy5zdGFydCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzBdKVxuICAgICAgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnNldFsxXSA/IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzFdKSA6IG51bGxcbiAgICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHZhbHNbMF0pXG4gIH1cbiAgcmV0dXJuIHRoaXMuY3JlYXRlU2NhbGUoKVxufVxuXG5SUy5wcm90b3R5cGUuY3JlYXRlU2NhbGUgPSBmdW5jdGlvbiAocmVzaXplKSB7XG4gIHRoaXMuc3RlcCA9IHRoaXMuc2xpZGVyV2lkdGggLyAodGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHtcbiAgICB2YXIgc3BhbiA9IGNyZWF0ZUVsZW1lbnQoJ3NwYW4nKVxuICAgIHZhciBpbnMgPSBjcmVhdGVFbGVtZW50KCdpbnMnKVxuXG4gICAgc3Bhbi5hcHBlbmRDaGlsZChpbnMpXG4gICAgdGhpcy5zY2FsZS5hcHBlbmRDaGlsZChzcGFuKVxuXG4gICAgc3Bhbi5zdHlsZS53aWR0aCA9IGkgPT09IGlMZW4gLSAxID8gMCA6IHRoaXMuc3RlcCArICdweCdcblxuICAgIGlmICghdGhpcy5jb25mLmxhYmVscykge1xuICAgICAgaWYgKGkgPT09IDAgfHwgaSA9PT0gaUxlbiAtIDEpIGlucy5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW2ldXG4gICAgfSBlbHNlIGlucy5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW2ldXG5cbiAgICBpbnMuc3R5bGUubWFyZ2luTGVmdCA9IChpbnMuY2xpZW50V2lkdGggLyAyKSAqIC0xICsgJ3B4J1xuICB9XG4gIHJldHVybiB0aGlzLmFkZEV2ZW50cygpXG59XG5cblJTLnByb3RvdHlwZS51cGRhdGVTY2FsZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zdGVwID0gdGhpcy5zbGlkZXJXaWR0aCAvICh0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpXG5cbiAgdmFyIHBpZWNlcyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NwYW4nKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gcGllY2VzLmxlbmd0aDsgaSA8IGlMZW4gLSAxOyBpKyspIHsgcGllY2VzW2ldLnN0eWxlLndpZHRoID0gdGhpcy5zdGVwICsgJ3B4JyB9XG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLmFkZEV2ZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHBvaW50ZXJzID0gdGhpcy5zbGlkZXIucXVlcnlTZWxlY3RvckFsbCgnLicgKyB0aGlzLmNscy5wb2ludGVyKVxuICB2YXIgcGllY2VzID0gdGhpcy5zbGlkZXIucXVlcnlTZWxlY3RvckFsbCgnc3BhbicpXG5cbiAgY3JlYXRlRXZlbnRzKGRvY3VtZW50LCAnbW91c2Vtb3ZlIHRvdWNobW92ZScsIHRoaXMubW92ZS5iaW5kKHRoaXMpKVxuICBjcmVhdGVFdmVudHMoZG9jdW1lbnQsICdtb3VzZXVwIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgdGhpcy5kcm9wLmJpbmQodGhpcykpXG5cbiAgZm9yIChsZXQgaSA9IDAsIGlMZW4gPSBwb2ludGVycy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgY3JlYXRlRXZlbnRzKHBvaW50ZXJzW2ldLCAnbW91c2Vkb3duIHRvdWNoc3RhcnQnLCB0aGlzLmRyYWcuYmluZCh0aGlzKSkgfVxuXG4gIGZvciAobGV0IGkgPSAwLCBpTGVuID0gcGllY2VzLmxlbmd0aDsgaSA8IGlMZW47IGkrKykgeyBjcmVhdGVFdmVudHMocGllY2VzW2ldLCAnY2xpY2snLCB0aGlzLm9uQ2xpY2tQaWVjZS5iaW5kKHRoaXMpKSB9XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMub25SZXNpemUuYmluZCh0aGlzKSlcblxuICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxufVxuXG5SUy5wcm90b3R5cGUuZHJhZyA9IGZ1bmN0aW9uIChlKSB7XG4gIGUucHJldmVudERlZmF1bHQoKVxuXG4gIGlmICh0aGlzLmNvbmYuZGlzYWJsZWQpIHJldHVyblxuXG4gIHZhciBkaXIgPSBlLnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtZGlyJylcbiAgaWYgKGRpciA9PT0gJ2xlZnQnKSB0aGlzLmFjdGl2ZVBvaW50ZXIgPSB0aGlzLnBvaW50ZXJMXG4gIGlmIChkaXIgPT09ICdyaWdodCcpIHRoaXMuYWN0aXZlUG9pbnRlciA9IHRoaXMucG9pbnRlclJcblxuICByZXR1cm4gdGhpcy5zbGlkZXIuY2xhc3NMaXN0LmFkZCgnc2xpZGluZycpXG59XG5cblJTLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24gKGUpIHtcbiAgaWYgKHRoaXMuYWN0aXZlUG9pbnRlciAmJiAhdGhpcy5jb25mLmRpc2FibGVkKSB7XG4gICAgdGhpcy5vblJlc2l6ZSgpIC8vIG5lZWRlZCBpbiBjYXNlIGFueSBlbGVtZW50cyBoYXZlIG1vdmVkIHRoZSBzbGlkZXIgaW4gdGhlIG1lYW50aW1lXG4gICAgdmFyIGNvb3JkWCA9IGUudHlwZSA9PT0gJ3RvdWNobW92ZScgPyBlLnRvdWNoZXNbMF0uY2xpZW50WCA6IGUucGFnZVhcbiAgICB2YXIgaW5kZXggPSBjb29yZFggLSB0aGlzLnNsaWRlckxlZnQgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKSAvLyBwaXhlbCBwb3NpdGlvbiBmcm9tIGxlZnQgb2Ygc2xpZGVyIChzaGlmdGVkIGxlZnQgYnkgaGFsZiB3aWR0aClcblxuICAgIGluZGV4ID0gTWF0aC5jZWlsKGluZGV4IC8gdGhpcy5zdGVwKVxuXG4gICAgaWYgKGluZGV4IDw9IDApIGluZGV4ID0gMFxuICAgIGlmIChpbmRleCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgaW5kZXggPSB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDFcblxuICAgIGlmICh0aGlzLmNvbmYucmFuZ2UpIHtcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgPT09IHRoaXMucG9pbnRlckwpIHRoaXMudmFsdWVzLnN0YXJ0ID0gaW5kZXhcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgPT09IHRoaXMucG9pbnRlclIpIHRoaXMudmFsdWVzLmVuZCA9IGluZGV4XG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IGluZGV4XG5cbiAgICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxuICB9XG59XG5cblJTLnByb3RvdHlwZS5kcm9wID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmFjdGl2ZVBvaW50ZXIgPSBudWxsXG59XG5cblJTLnByb3RvdHlwZS5zZXRWYWx1ZXMgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICB2YXIgYWN0aXZlUG9pbnRlciA9IHRoaXMuY29uZi5yYW5nZSA/ICdzdGFydCcgOiAnZW5kJ1xuXG4gIGlmIChzdGFydCAmJiB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2Yoc3RhcnQpID4gLTEpIHsgdGhpcy52YWx1ZXNbYWN0aXZlUG9pbnRlcl0gPSB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2Yoc3RhcnQpIH1cblxuICBpZiAoZW5kICYmIHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZihlbmQpID4gLTEpIHsgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKGVuZCkgfVxuXG4gIGlmICh0aGlzLmNvbmYucmFuZ2UgJiYgdGhpcy52YWx1ZXMuc3RhcnQgPiB0aGlzLnZhbHVlcy5lbmQpIHsgdGhpcy52YWx1ZXMuc3RhcnQgPSB0aGlzLnZhbHVlcy5lbmQgfVxuXG4gIHRoaXMucG9pbnRlckwuc3R5bGUubGVmdCA9ICh0aGlzLnZhbHVlc1thY3RpdmVQb2ludGVyXSAqIHRoaXMuc3RlcCAtICh0aGlzLnBvaW50ZXJXaWR0aCAvIDIpKSArICdweCdcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7XG4gICAgICB0aGlzLnRpcEwuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5zdGFydF1cbiAgICAgIHRoaXMudGlwUi5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1cbiAgICB9XG4gICAgdGhpcy5pbnB1dC52YWx1ZSA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdICsgJywnICsgdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG4gICAgdGhpcy5wb2ludGVyUi5zdHlsZS5sZWZ0ID0gKHRoaXMudmFsdWVzLmVuZCAqIHRoaXMuc3RlcCAtICh0aGlzLnBvaW50ZXJXaWR0aCAvIDIpKSArICdweCdcbiAgfSBlbHNlIHtcbiAgICBpZiAodGhpcy5jb25mLnRvb2x0aXApIHsgdGhpcy50aXBMLmlubmVySFRNTCA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXSB9XG4gICAgdGhpcy5pbnB1dC52YWx1ZSA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxuICB9XG5cbiAgaWYgKHRoaXMudmFsdWVzLmVuZCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG4gIGlmICh0aGlzLnZhbHVlcy5zdGFydCA8IDApIHRoaXMudmFsdWVzLnN0YXJ0ID0gMFxuXG4gIHRoaXMuc2VsZWN0ZWQuc3R5bGUud2lkdGggPSAodGhpcy52YWx1ZXMuZW5kIC0gdGhpcy52YWx1ZXMuc3RhcnQpICogdGhpcy5zdGVwICsgJ3B4J1xuICB0aGlzLnNlbGVjdGVkLnN0eWxlLmxlZnQgPSB0aGlzLnZhbHVlcy5zdGFydCAqIHRoaXMuc3RlcCArICdweCdcblxuICByZXR1cm4gdGhpcy5vbkNoYW5nZSgpXG59XG5cblJTLnByb3RvdHlwZS5vbkNsaWNrUGllY2UgPSBmdW5jdGlvbiAoZSkge1xuICBpZiAodGhpcy5jb25mLmRpc2FibGVkKSByZXR1cm5cblxuICB2YXIgaWR4ID0gTWF0aC5yb3VuZCgoZS5jbGllbnRYIC0gdGhpcy5zbGlkZXJMZWZ0KSAvIHRoaXMuc3RlcClcblxuICBpZiAoaWR4ID4gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKSBpZHggPSB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDFcbiAgaWYgKGlkeCA8IDApIGlkeCA9IDBcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgaWYgKGlkeCAtIHRoaXMudmFsdWVzLnN0YXJ0IDw9IHRoaXMudmFsdWVzLmVuZCAtIGlkeCkge1xuICAgICAgdGhpcy52YWx1ZXMuc3RhcnQgPSBpZHhcbiAgICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gaWR4XG4gIH0gZWxzZSB0aGlzLnZhbHVlcy5lbmQgPSBpZHhcblxuICB0aGlzLnNsaWRlci5jbGFzc0xpc3QucmVtb3ZlKCdzbGlkaW5nJylcblxuICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxufVxuXG5SUy5wcm90b3R5cGUub25DaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBfdGhpcyA9IHRoaXNcblxuICBpZiAodGhpcy50aW1lb3V0KSBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0KVxuXG4gIHRoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIGlmIChfdGhpcy5jb25mLm9uQ2hhbmdlICYmIHR5cGVvZiBfdGhpcy5jb25mLm9uQ2hhbmdlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gX3RoaXMuY29uZi5vbkNoYW5nZShfdGhpcy5pbnB1dC52YWx1ZSlcbiAgICB9XG4gIH0sIDUwMClcbn1cblxuUlMucHJvdG90eXBlLm9uUmVzaXplID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNsaWRlckxlZnQgPSB0aGlzLnNsaWRlci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0XG4gIHRoaXMuc2xpZGVyV2lkdGggPSB0aGlzLnNsaWRlci5jbGllbnRXaWR0aFxuICByZXR1cm4gdGhpcy51cGRhdGVTY2FsZSgpXG59XG5cblJTLnByb3RvdHlwZS5kaXNhYmxlZCA9IGZ1bmN0aW9uIChkaXNhYmxlZCkge1xuICB0aGlzLmNvbmYuZGlzYWJsZWQgPSBkaXNhYmxlZFxuICB0aGlzLnNsaWRlci5jbGFzc0xpc3RbZGlzYWJsZWQgPyAnYWRkJyA6ICdyZW1vdmUnXSgnZGlzYWJsZWQnKVxufVxuXG5SUy5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIFJldHVybiBsaXN0IG9mIG51bWJlcnMsIHJhdGhlciB0aGFuIGEgc3RyaW5nLCB3aGljaCB3b3VsZCBqdXN0IGJlIHNpbGx5XG4gIC8vICByZXR1cm4gdGhpcy5pbnB1dC52YWx1ZVxuICByZXR1cm4gW3RoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdLCB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1dXG59XG5cblJTLnByb3RvdHlwZS5nZXRWYWx1ZUwgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIEdldCBsZWZ0IChpLmUuIHNtYWxsZXN0KSB2YWx1ZVxuICByZXR1cm4gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5zdGFydF1cbn1cblxuUlMucHJvdG90eXBlLmdldFZhbHVlUiA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gR2V0IHJpZ2h0IChpLmUuIHNtYWxsZXN0KSB2YWx1ZVxuICByZXR1cm4gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG59XG5cblJTLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmlucHV0LnN0eWxlLmRpc3BsYXkgPSB0aGlzLmlucHV0RGlzcGxheVxuICB0aGlzLnNsaWRlci5yZW1vdmUoKVxufVxuXG52YXIgY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uIChlbCwgY2xzLCBkYXRhQXR0cikge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZWwpXG4gIGlmIChjbHMpIGVsZW1lbnQuY2xhc3NOYW1lID0gY2xzXG4gIGlmIChkYXRhQXR0ciAmJiBkYXRhQXR0ci5sZW5ndGggPT09IDIpIHsgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2RhdGEtJyArIGRhdGFBdHRyWzBdLCBkYXRhQXR0clsxXSkgfVxuXG4gIHJldHVybiBlbGVtZW50XG59XG5cbnZhciBjcmVhdGVFdmVudHMgPSBmdW5jdGlvbiAoZWwsIGV2LCBjYWxsYmFjaykge1xuICB2YXIgZXZlbnRzID0gZXYuc3BsaXQoJyAnKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gZXZlbnRzLmxlbmd0aDsgaSA8IGlMZW47IGkrKykgeyBlbC5hZGRFdmVudExpc3RlbmVyKGV2ZW50c1tpXSwgY2FsbGJhY2spIH1cbn1cblxudmFyIHByZXBhcmVBcnJheVZhbHVlcyA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIHZhciB2YWx1ZXMgPSBbXVxuICB2YXIgcmFuZ2UgPSBjb25mLnZhbHVlcy5tYXggLSBjb25mLnZhbHVlcy5taW5cblxuICBpZiAoIWNvbmYuc3RlcCkge1xuICAgIGNvbnNvbGUubG9nKCdObyBzdGVwIGRlZmluZWQuLi4nKVxuICAgIHJldHVybiBbY29uZi52YWx1ZXMubWluLCBjb25mLnZhbHVlcy5tYXhdXG4gIH1cblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IChyYW5nZSAvIGNvbmYuc3RlcCk7IGkgPCBpTGVuOyBpKyspIHsgdmFsdWVzLnB1c2goY29uZi52YWx1ZXMubWluICsgaSAqIGNvbmYuc3RlcCkgfVxuXG4gIGlmICh2YWx1ZXMuaW5kZXhPZihjb25mLnZhbHVlcy5tYXgpIDwgMCkgdmFsdWVzLnB1c2goY29uZi52YWx1ZXMubWF4KVxuXG4gIHJldHVybiB2YWx1ZXNcbn1cblxudmFyIGNoZWNrSW5pdGlhbCA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIGlmICghY29uZi5zZXQgfHwgY29uZi5zZXQubGVuZ3RoIDwgMSkgcmV0dXJuIG51bGxcbiAgaWYgKGNvbmYudmFsdWVzLmluZGV4T2YoY29uZi5zZXRbMF0pIDwgMCkgcmV0dXJuIG51bGxcblxuICBpZiAoY29uZi5yYW5nZSkge1xuICAgIGlmIChjb25mLnNldC5sZW5ndGggPCAyIHx8IGNvbmYudmFsdWVzLmluZGV4T2YoY29uZi5zZXRbMV0pIDwgMCkgcmV0dXJuIG51bGxcbiAgfVxuICByZXR1cm4gdHJ1ZVxufVxuXG5leHBvcnQgZGVmYXVsdCBSU1xuIiwiLyoqXG4gKiBDbGFzcyByZXByZXNlbnRpbmcgYSBwb2ludCwgYW5kIHN0YXRpYyB1dGl0bGl0eSBtZXRob2RzXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBvaW50IHtcbiAgeDogbnVtYmVyXG4gIHk6IG51bWJlclxuICBjb25zdHJ1Y3RvciAoeDogbnVtYmVyLCB5OiBudW1iZXIpIHtcbiAgICB0aGlzLnggPSB4XG4gICAgdGhpcy55ID0geVxuICB9XG5cbiAgcm90YXRlIChhbmdsZTogbnVtYmVyKSB7XG4gICAgY29uc3QgbmV3eCA9IE1hdGguY29zKGFuZ2xlKSAqIHRoaXMueCAtIE1hdGguc2luKGFuZ2xlKSAqIHRoaXMueVxuICAgIGNvbnN0IG5ld3kgPSBNYXRoLnNpbihhbmdsZSkgKiB0aGlzLnggKyBNYXRoLmNvcyhhbmdsZSkgKiB0aGlzLnlcbiAgICB0aGlzLnggPSBuZXd4XG4gICAgdGhpcy55ID0gbmV3eVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzY2FsZSAoc2Y6IG51bWJlcikge1xuICAgIHRoaXMueCA9IHRoaXMueCAqIHNmXG4gICAgdGhpcy55ID0gdGhpcy55ICogc2ZcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgdHJhbnNsYXRlICh4OiBudW1iZXIsIHk6IG51bWJlcikge1xuICAgIHRoaXMueCArPSB4XG4gICAgdGhpcy55ICs9IHlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgY2xvbmUgKCkge1xuICAgIHJldHVybiBuZXcgUG9pbnQodGhpcy54LCB0aGlzLnkpXG4gIH1cblxuICBlcXVhbHMgKHRoYXQ6IFBvaW50KSB7XG4gICAgcmV0dXJuICh0aGlzLnggPT09IHRoYXQueCAmJiB0aGlzLnkgPT09IHRoYXQueSlcbiAgfVxuXG4gIG1vdmVUb3dhcmQgKHRoYXQ6IFBvaW50LCBkOiBudW1iZXIpIHtcbiAgICAvLyBtb3ZlcyBbZF0gaW4gdGhlIGRpcmVjdGlvbiBvZiBbdGhhdDo6UG9pbnRdXG4gICAgY29uc3QgdXZlYyA9IFBvaW50LnVuaXRWZWN0b3IodGhpcywgdGhhdClcbiAgICB0aGlzLnRyYW5zbGF0ZSh1dmVjLnggKiBkLCB1dmVjLnkgKiBkKVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzdGF0aWMgZnJvbVBvbGFyIChyOiBudW1iZXIsIHRoZXRhOiBudW1iZXIpIHtcbiAgICByZXR1cm4gbmV3IFBvaW50KFxuICAgICAgTWF0aC5jb3ModGhldGEpICogcixcbiAgICAgIE1hdGguc2luKHRoZXRhKSAqIHJcbiAgICApXG4gIH1cblxuICBzdGF0aWMgZnJvbVBvbGFyRGVnIChyOiBudW1iZXIsIHRoZXRhOiBudW1iZXIpIHtcbiAgICB0aGV0YSA9IHRoZXRhICogTWF0aC5QSSAvIDE4MFxuICAgIHJldHVybiBQb2ludC5mcm9tUG9sYXIociwgdGhldGEpXG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIHBvaW50IHJlcHJlc2VudGluZyB0aGUgcG9zaXRpb24gb2YgYW4gZWxlbWVudCwgZWl0aGVyIHJlbGF0aXZlIHRvIHBhcmVudCBvciB2aWV3cG9ydFxuICAgKiBAcGFyYW0gZWxlbSBBbiBIVE1MIGVsZW1lbnRcbiAgICogQHBhcmFtIGFuY2hvciBXaGljaCBjb3JuZGVyIG9mIHRoZSBib3VuZGluZyBib3ggb2YgZWxlbSB0byByZXR1cm4sIG9yIHRoZSBjZW50ZXJcbiAgICovXG4gIHN0YXRpYyBmcm9tRWxlbWVudChlbGVtOiBIVE1MRWxlbWVudCwgYW5jaG9yOiAndG9wbGVmdCd8J2JvdHRvbWxlZnQnfCd0b3ByaWdodCd8J2JvdHRvbXJpZ2h0J3wnY2VudGVyJyA9ICd0b3BsZWZ0JywgcmVsYXRpdmVUb1BhcmVudDogYm9vbGVhbiA9IHRydWUpIHtcbiAgICBjb25zdCByZWN0ID0gZWxlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVxuICAgIGxldCB5ID0gYW5jaG9yLnN0YXJ0c1dpdGgoJ3RvcCcpID8gcmVjdC50b3AgOlxuICAgICAgICAgICAgICBhbmNob3Iuc3RhcnRzV2l0aCgnYm90dG9tJykgPyByZWN0LmJvdHRvbSA6XG4gICAgICAgICAgICAgIChyZWN0LmJvdHRvbSArIHJlY3QudG9wKS8yXG5cbiAgICBsZXQgeCA9IGFuY2hvci5lbmRzV2l0aCgnbGVmdCcpID8gcmVjdC5sZWZ0IDpcbiAgICAgICAgICAgICAgYW5jaG9yLmVuZHNXaXRoKCdyaWdodCcpID8gcmVjdC5yaWdodCA6XG4gICAgICAgICAgICAgIChyZWN0LnJpZ2h0ICsgcmVjdC5sZWZ0KS8yXG5cbiAgICBpZiAocmVsYXRpdmVUb1BhcmVudCAmJiBlbGVtLnBhcmVudEVsZW1lbnQpIHtcbiAgICAgIGNvbnN0IHBhcmVudFB0ID0gUG9pbnQuZnJvbUVsZW1lbnQoZWxlbS5wYXJlbnRFbGVtZW50LCAndG9wbGVmdCcsIGZhbHNlKVxuICAgICAgeCAtPSBwYXJlbnRQdC54XG4gICAgICB5IC09IHBhcmVudFB0LnlcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFBvaW50KHgseSlcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBtZWFuIG9mXG4gICAqIEBwYXJhbSAgey4uLlBvaW50fSBwb2ludHMgVGhlIHBvaW50cyB0byBmaW5kIHRoZSBtZWFuIG9mXG4gICAqL1xuICBzdGF0aWMgbWVhbiAoLi4ucG9pbnRzIDogUG9pbnRbXSkge1xuICAgIGNvbnN0IHN1bXggPSBwb2ludHMubWFwKHAgPT4gcC54KS5yZWR1Y2UoKHgsIHkpID0+IHggKyB5KVxuICAgIGNvbnN0IHN1bXkgPSBwb2ludHMubWFwKHAgPT4gcC55KS5yZWR1Y2UoKHgsIHkpID0+IHggKyB5KVxuICAgIGNvbnN0IG4gPSBwb2ludHMubGVuZ3RoXG5cbiAgICByZXR1cm4gbmV3IFBvaW50KHN1bXggLyBuLCBzdW15IC8gbilcbiAgfVxuXG4gIHN0YXRpYyBpbkNlbnRlciAoQTogUG9pbnQsIEI6IFBvaW50LCBDOiBQb2ludCkge1xuICAgIC8vIGluY2VudGVyIG9mIGEgdHJpYW5nbGUgZ2l2ZW4gdmVydGV4IHBvaW50cyBBLCBCIGFuZCBDXG4gICAgY29uc3QgYSA9IFBvaW50LmRpc3RhbmNlKEIsIEMpXG4gICAgY29uc3QgYiA9IFBvaW50LmRpc3RhbmNlKEEsIEMpXG4gICAgY29uc3QgYyA9IFBvaW50LmRpc3RhbmNlKEEsIEIpXG5cbiAgICBjb25zdCBwZXJpbWV0ZXIgPSBhICsgYiArIGNcbiAgICBjb25zdCBzdW14ID0gYSAqIEEueCArIGIgKiBCLnggKyBjICogQy54XG4gICAgY29uc3Qgc3VteSA9IGEgKiBBLnkgKyBiICogQi55ICsgYyAqIEMueVxuXG4gICAgcmV0dXJuIG5ldyBQb2ludChzdW14IC8gcGVyaW1ldGVyLCBzdW15IC8gcGVyaW1ldGVyKVxuICB9XG5cbiAgc3RhdGljIG1pbiAocG9pbnRzIDogUG9pbnRbXSkge1xuICAgIGNvbnN0IG1pbnggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1pbih4LCBwLngpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtaW55ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5taW4oeSwgcC55KSwgSW5maW5pdHkpXG4gICAgcmV0dXJuIG5ldyBQb2ludChtaW54LCBtaW55KVxuICB9XG5cbiAgc3RhdGljIG1heCAocG9pbnRzOiBQb2ludFtdKSB7XG4gICAgY29uc3QgbWF4eCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWF4KHgsIHAueCksIC1JbmZpbml0eSlcbiAgICBjb25zdCBtYXh5ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5tYXgoeSwgcC55KSwgLUluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQobWF4eCwgbWF4eSlcbiAgfVxuXG4gIHN0YXRpYyBjZW50ZXIgKHBvaW50czogUG9pbnRbXSkge1xuICAgIGNvbnN0IG1pbnggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1pbih4LCBwLngpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtaW55ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5taW4oeSwgcC55KSwgSW5maW5pdHkpXG4gICAgY29uc3QgbWF4eCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWF4KHgsIHAueCksIC1JbmZpbml0eSlcbiAgICBjb25zdCBtYXh5ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5tYXgoeSwgcC55KSwgLUluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQoKG1heHggKyBtaW54KSAvIDIsIChtYXh5ICsgbWlueSkgLyAyKVxuICB9XG5cbiAgLyoqXG4gICAqIHJldHVybnMgYSB1bml0IHZlY3RvciBpbiB0aGUgZGlyZWN0aW9uIG9mIHAxIHRvIHAyIGluIHRoZSBmb3JtIHt4Oi4uLiwgeTouLi59XG4gICAqIEBwYXJhbSBwMSBBIHBvaW50XG4gICAqIEBwYXJhbSBwMiBBIHBvaW50XG4gICAqL1xuICBzdGF0aWMgdW5pdFZlY3RvciAocDEgOiBQb2ludCwgcDIgOiBQb2ludCkge1xuICAgIGNvbnN0IHZlY3ggPSBwMi54IC0gcDEueFxuICAgIGNvbnN0IHZlY3kgPSBwMi55IC0gcDEueVxuICAgIGNvbnN0IGxlbmd0aCA9IE1hdGguaHlwb3QodmVjeCwgdmVjeSlcbiAgICByZXR1cm4geyB4OiB2ZWN4IC8gbGVuZ3RoLCB5OiB2ZWN5IC8gbGVuZ3RoIH1cbiAgfVxuXG4gIHN0YXRpYyBkaXN0YW5jZSAocDE6IFBvaW50LCBwMjogUG9pbnQpIHtcbiAgICByZXR1cm4gTWF0aC5oeXBvdChwMS54IC0gcDIueCwgcDEueSAtIHAyLnkpXG4gIH1cblxuICAvKipcbiAgICogQ2FsY3VsYXRlIHRoZSBhbmdsZSBpbiByYWRpYW5zIGZyb20gaG9yaXpvbnRhbCB0byBwMiwgd2l0aCBjZW50cmUgcDEuXG4gICAqIEUuZy4gYW5nbGVGcm9tKCAoMCwwKSwgKDEsMSkgKSA9IHBpLzJcbiAgICogQW5nbGUgaXMgZnJvbSAwIHRvIDJwaVxuICAgKiBAcGFyYW0gIHAxIFRoZSBzdGFydCBwb2ludFxuICAgKiBAcGFyYW0gIHAyIFRoZSBlbmQgcG9pbnRcbiAgICogQHJldHVybnMgIFRoZSBhbmdsZSBpbiByYWRpYW5zXG4gICAqL1xuICBzdGF0aWMgYW5nbGVGcm9tIChwMTogUG9pbnQsIHAyOiBQb2ludCk6IG51bWJlciB7XG4gICAgY29uc3QgYW5nbGUgPSBNYXRoLmF0YW4yKHAyLnkgLSBwMS55LCBwMi54IC0gcDEueClcbiAgICByZXR1cm4gYW5nbGUgPj0gMCA/IGFuZ2xlIDogMiAqIE1hdGguUEkgKyBhbmdsZVxuICB9XG5cbiAgLyoqXG4gICAqIFdoZW4gcDEgYW5kIHAyIGFyZSBsZXNzIHRoYW4gW3RyaWdnZXJdIGFwYXJ0LCB0aGV5IGFyZVxuICAgKiBtb3ZlZCBzbyB0aGF0IHRoZXkgYXJlIFtkaXN0YW5jZV0gYXBhcnRcbiAgICogQHBhcmFtIHAxIEEgcG9pbnRcbiAgICogQHBhcmFtIHAyIEEgcG9pbnRcbiAgICogQHBhcmFtIHRyaWdnZXIgRGlzdGFuY2UgdHJpZ2dlcmluZyByZXB1bHNpb25cbiAgICogQHBhcmFtIGRpc3RhbmNlIGRpc3RhbmNlIHRvIHJlcGVsIHRvXG4gICAqL1xuICBzdGF0aWMgcmVwZWwgKHAxOiBQb2ludCwgcDI6IFBvaW50LCB0cmlnZ2VyOiBudW1iZXIsIGRpc3RhbmNlOiBudW1iZXIpIHtcbiAgICBjb25zdCBkID0gTWF0aC5oeXBvdChwMS54IC0gcDIueCwgcDEueSAtIHAyLnkpXG4gICAgaWYgKGQgPj0gdHJpZ2dlcikgcmV0dXJuIGZhbHNlXG5cbiAgICBjb25zdCByID0gKGRpc3RhbmNlIC0gZCkgLyAyIC8vIGRpc3RhbmNlIHRoZXkgbmVlZCBtb3ZpbmdcbiAgICBwMS5tb3ZlVG93YXJkKHAyLCAtcilcbiAgICBwMi5tb3ZlVG93YXJkKHAxLCAtcilcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgLyoqXG4gICAqIFNjYWxlIGFuIGNlbnRlciBhIHNldCBvZiBwb2ludHMgdG8gYSBnaXZlbiB3aWR0aCBvciBoZWlnaHQuIE4uQi4gVGhpcyBtdXRhdGVzIHRoZSBwb2ludHMgaW4gdGhlIGFycmF5LCBzbyBjbG9uZSBmaXJzdCBpZiBuZWNlc3NhclxuICAgKiBAcGFyYW0gcG9pbnRzIEFuIGFycmF5IG9mIHBvaW50c1xuICAgKiBAcGFyYW0gd2lkdGggV2lkdGggb2YgYm91bmRpbmcgYm94IHRvIHNjYWxlIHRvXG4gICAqIEBwYXJhbSBoZWlnaHQgSGVpZ2h0IG9mIGJvdW5kaW5nIGJveCB0byBzY2FsZSB0b1xuICAgKiBAcGFyYW0gbWFyZ2luIE1hcmdpbiB0byBsZWF2ZSBhcm91bmQgc2NhbGVkIHBvaW50c1xuICAgKiBAcGFyYW0gb2Zmc2V0IE9mZnNldCBmcm9tIGNlbnRlciBvZiBib3VuZGluZyBib3hcbiAgICogQHJldHVybnMgVGhlIHNjYWxlIGZhY3RvciB0aGF0IHBvaW50cyB3ZXJlIHNjYWxlZCBieVxuICAgKi9cbiAgc3RhdGljIHNjYWxlVG9GaXQgKHBvaW50czogUG9pbnRbXSwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIG1hcmdpbiA9IDAsIG9mZnNldDogW251bWJlciwgbnVtYmVyXSA9IFswLCAwXSkge1xuICAgIGxldCB0b3BMZWZ0IDogUG9pbnQgPSBQb2ludC5taW4ocG9pbnRzKVxuICAgIGxldCBib3R0b21SaWdodCA6IFBvaW50ID0gUG9pbnQubWF4KHBvaW50cylcbiAgICBjb25zdCB0b3RhbFdpZHRoIDogbnVtYmVyID0gYm90dG9tUmlnaHQueCAtIHRvcExlZnQueFxuICAgIGNvbnN0IHRvdGFsSGVpZ2h0IDogbnVtYmVyID0gYm90dG9tUmlnaHQueSAtIHRvcExlZnQueVxuICAgIGNvbnN0IHNmID0gTWF0aC5taW4oKHdpZHRoIC0gbWFyZ2luKSAvIHRvdGFsV2lkdGgsIChoZWlnaHQgLSBtYXJnaW4pIC8gdG90YWxIZWlnaHQpXG4gICAgcG9pbnRzLmZvckVhY2gocHQgPT4geyBwdC5zY2FsZShzZikgfSlcblxuICAgIC8vIGNlbnRyZVxuICAgIHRvcExlZnQgPSBQb2ludC5taW4ocG9pbnRzKVxuICAgIGJvdHRvbVJpZ2h0ID0gUG9pbnQubWF4KHBvaW50cylcbiAgICBjb25zdCBjZW50ZXIgPSBQb2ludC5tZWFuKHRvcExlZnQsIGJvdHRvbVJpZ2h0KS50cmFuc2xhdGUoLi4ub2Zmc2V0KVxuICAgIHBvaW50cy5mb3JFYWNoKHB0ID0+IHsgcHQudHJhbnNsYXRlKHdpZHRoIC8gMiAtIGNlbnRlci54LCBoZWlnaHQgLyAyIC0gY2VudGVyLnkpIH0pIC8vIGNlbnRyZVxuXG4gICAgcmV0dXJuIHNmXG4gIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICcuL1BvaW50LmpzJ1xuXG4vKiBSTkdzIC8gc2VsZWN0b3JzICovXG5leHBvcnQgZnVuY3Rpb24gZ2F1c3NpYW4gKG4pIHtcbiAgbGV0IHJudW0gPSAwXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgcm51bSArPSBNYXRoLnJhbmRvbSgpXG4gIH1cbiAgcmV0dXJuIHJudW0gLyBuXG59XG5cbi8qKlxuICogcmV0dXJuIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBuIGFuZCBtIGluY2x1c2l2ZVxuICogZGlzdCAob3B0aW9uYWwpIGlzIGEgZnVuY3Rpb24gcmV0dXJuaW5nIGEgdmFsdWUgaW4gWzAsMSlcbiAqIEBwYXJhbSB7bnVtYmVyfSBuIFRoZSBtaW5pbXVtIHZhbHVlXG4gKiBAcGFyYW0ge251bWJlcn0gbSBUaGUgbWF4aW11bSB2YWx1ZVxuICogQHBhcmFtIHsoKT0+bnVtYmVyfSBbZGlzdF0gQSBkaXN0cmlidXRpb24gcmV0dXJuaW5nIGEgbnVtYmVyIGZyb20gMCB0byAxXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kQmV0d2VlbiAobiwgbSwgZGlzdCkge1xuICAvLyByZXR1cm4gYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIG4gYW5kIG0gaW5jbHVzaXZlXG4gIC8vIGRpc3QgKG9wdGlvbmFsKSBpcyBhIGZ1bmN0aW9uIHJldHVybmluZyBhIHZhbHVlIGluIFswLDEpXG4gIC8vIGRlZmF1bHQgaXMgc2xpZ2h0bHkgYmlhc2VkIHRvd2FyZHMgbWlkZGxlXG4gIGlmICghZGlzdCkgZGlzdCA9IE1hdGgucmFuZG9tXG4gIHJldHVybiBuICsgTWF0aC5mbG9vcihkaXN0KCkgKiAobSAtIG4gKyAxKSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJhbmRCZXR3ZWVuRmlsdGVyIChuLCBtLCBmaWx0ZXIpIHtcbiAgLyogcmV0dXJucyBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbiBhbmQgbSBpbmNsdXNpdmUgd2hpY2ggc2F0aXNmaWVzIHRoZSBmaWx0ZXJcbiAgLyAgbiwgbTogaW50ZWdlclxuICAvICBmaWx0ZXI6IEludC0+IEJvb2xcbiAgKi9cbiAgY29uc3QgYXJyID0gW11cbiAgZm9yIChsZXQgaSA9IG47IGkgPCBtICsgMTsgaSsrKSB7XG4gICAgaWYgKGZpbHRlcihpKSkgYXJyLnB1c2goaSlcbiAgfVxuICBpZiAoYXJyID09PSBbXSkgdGhyb3cgbmV3IEVycm9yKCdvdmVyZmlsdGVyZWQnKVxuICBjb25zdCBpID0gcmFuZEJldHdlZW4oMCwgYXJyLmxlbmd0aCAtIDEpXG4gIHJldHVybiBhcnJbaV1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgbXVsdGlwbGUgb2YgbiBiZXR3ZWVuIG1pbiBhbmQgbWF4XG4gKiBAcGFyYW0ge251bWJlcn0gbWluIE1pbmltdW0gdmFsdWVcbiAqIEBwYXJhbSB7bnVtYmVyfSBtYXggTWF4aW11bSB2YWx1ZVxuICogQHBhcmFtIHtudW1iZXJ9IG4gQ2hvb3NlIGEgbXVsdGlwbGUgb2YgdGhpcyB2YWx1ZVxuICogQHJldHVybnMge251bWJlcn0gQSBtdWx0aXBsZW9mIG4gYmV0d2VlbiBtaW4gYW5kIG1heFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZE11bHRCZXR3ZWVuIChtaW4sIG1heCwgbikge1xuICAvLyByZXR1cm4gYSByYW5kb20gbXVsdGlwbGUgb2YgbiBiZXR3ZWVuIG4gYW5kIG0gKGluY2x1c2l2ZSBpZiBwb3NzaWJsZSlcbiAgbWluID0gTWF0aC5jZWlsKG1pbiAvIG4pICogblxuICBtYXggPSBNYXRoLmZsb29yKG1heCAvIG4pICogbiAvLyBjb3VsZCBjaGVjayBkaXZpc2liaWxpdHkgZmlyc3QgdG8gbWF4aW1pc2UgcGVyZm9ybWFjZSwgYnV0IEknbSBzdXJlIHRoZSBoaXQgaXNuJ3QgYmFkXG5cbiAgcmV0dXJuIHJhbmRCZXR3ZWVuKG1pbiAvIG4sIG1heCAvIG4pICogblxufVxuXG4vKipcbiAqIFJldHVybnMgYSByYW5kb20gZWxlbWVudCBvZiBhbiBhcnJheVxuICogQHRlbXBsYXRlIFRcbiAqIEBwYXJhbSB7VFtdfSBhcnJheSBBbiBhcnJheSBvZiBvYmplY3RzXG4gKiBAcGFyYW0geygpPT5udW1iZXJ9IFtkaXN0XSBBIGRpc3RyaWJ1dGlvbiBmdW5jdGlvbiBmb3Igd2VpZ2h0aW5nLCByZXR1cm5pbmcgYSBudW1iZXIgYmV0d2VlbiAwIGFuZCAxLiBEZWZhdWx0IGlzIE1hdGgucmFuZG9tXG4gKiBAcmV0dXJucyB7VH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmRFbGVtIChhcnJheSwgZGlzdCkge1xuICBpZiAoWy4uLmFycmF5XS5sZW5ndGggPT09IDApIHRocm93IG5ldyBFcnJvcignZW1wdHkgYXJyYXknKVxuICBpZiAoIWRpc3QpIGRpc3QgPSBNYXRoLnJhbmRvbVxuICBjb25zdCBuID0gYXJyYXkubGVuZ3RoIHx8IGFycmF5LnNpemVcbiAgY29uc3QgaSA9IHJhbmRCZXR3ZWVuKDAsIG4gLSAxLCBkaXN0KVxuICByZXR1cm4gWy4uLmFycmF5XVtpXVxufVxuXG4vKipcbiAqIFNlbGVjdHMgYW4gZWxlbWVudFxuICogQHRlbXBsYXRlIFRcbiAqIEBwYXJhbSB7VFtdfSBhcnJheSBBbiBhcnJheSBvZiBlbGVtZW50c1xuICogQHBhcmFtIHtudW1iZXJbXX0gcHJvYmFiaWxpdGllcyBBbiBhcnJheSBvZiBwcm9iYmlsaXRpZXNcbiAqIEByZXR1cm5zIHtUfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZEVsZW1XaXRoUHJvYmFiaWxpdGllcyAoYXJyYXksIHByb2JhYmlsaXRpZXMpIHtcbiAgLy8gdmFsaWRhdGVcbiAgaWYgKGFycmF5Lmxlbmd0aCAhPT0gcHJvYmFiaWxpdGllcy5sZW5ndGgpIHRocm93IG5ldyBFcnJvcignQXJyYXkgbGVuZ3RocyBkbyBub3QgbWF0Y2gnKVxuXG4gIGNvbnN0IHIgPSBNYXRoLnJhbmRvbSgpXG4gIGxldCBjdW11bGF0aXZlUHJvYiA9IDBcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgIGN1bXVsYXRpdmVQcm9iICs9IHByb2JhYmlsaXRpZXNbaV1cbiAgICBpZiAociA8IGN1bXVsYXRpdmVQcm9iKSByZXR1cm4gYXJyYXlbaV1cbiAgfVxuXG4gIC8vIHNob3VsZG4ndCBnZXQgaGVyZSBpZiBwcm9iYWJpbGl0aWVzIHN1bSB0byAxLCBidXQgY291bGQgYmUgYSByb3VuZGluZyBlcnJvclxuICBjb25zb2xlLndhcm4oYFByb2JhYmlsaXRpZXMgZG9uJ3Qgc3VtIHRvIDE/IFRvdGFsIHdhcyAke2N1bXVsYXRpdmVQcm9ifWApXG4gIHJldHVybiAoYXJyYXlbYXJyYXkubGVuZ3RoIC0gMV0pXG59XG5cbi8qIE1hdGhzICovXG5leHBvcnQgZnVuY3Rpb24gcm91bmRUb1RlbiAobikge1xuICByZXR1cm4gTWF0aC5yb3VuZChuIC8gMTApICogMTBcbn1cblxuLyoqXG4gKiBSb3VuZHMgYSBudW1iZXIgdG8gYSBnaXZlbiBudW1iZXIgb2YgZGVjaW1hbCBwbGFjZXNcbiAqIEBwYXJhbSB7bnVtYmVyfSB4IFRoZSBudW1iZXIgdG8gcm91bmRcbiAqIEBwYXJhbSB7bnVtYmVyfSBuIFRoZSBudW1iZXIgb2YgZGVjaW1hbCBwbGFjZXNcbiAqIEByZXR1cm5zIHtudW1iZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByb3VuZERQICh4LCBuKSB7XG4gIHJldHVybiBNYXRoLnJvdW5kKHggKiBNYXRoLnBvdygxMCwgbikpIC8gTWF0aC5wb3coMTAsIG4pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWdUb1JhZCAoeCkge1xuICByZXR1cm4geCAqIE1hdGguUEkgLyAxODBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNpbkRlZyAoeCkge1xuICByZXR1cm4gTWF0aC5zaW4oeCAqIE1hdGguUEkgLyAxODApXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb3NEZWcgKHgpIHtcbiAgcmV0dXJuIE1hdGguY29zKHggKiBNYXRoLlBJIC8gMTgwKVxufVxuXG4vKipcbiAqIFJldHVybnMgYSBzdHJpbmcgcmVwcmVzZW50aW5nIG4vMTBeZHBcbiAqIEUuZy4gc2NhbGVkU3RyKDMxNCwyKSA9IFwiMy4xNFwiXG4gKiBAcGFyYW0ge251bWJlcn0gbiBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgZGlnaXRzIG9mIGEgZml4ZWQgcG9pbnQgbnVtYmVyXG4gKiBAcGFyYW0ge251bWJlcn0gZHAgQW4gaW50ZWdlciBmb3IgbnVtYmVyIG9mIGRlY2ltYWwgcGxhY2VzXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2NhbGVkU3RyIChuLCBkcCkge1xuICBpZiAoZHAgPT09IDApIHJldHVybiBuXG4gIGNvbnN0IGZhY3RvciA9IE1hdGgucG93KDEwLCBkcClcbiAgY29uc3QgaW50cGFydCA9IE1hdGguZmxvb3IobiAvIGZhY3RvcilcbiAgY29uc3QgZGVjcGFydCA9IG4gJSBmYWN0b3JcbiAgaWYgKGRlY3BhcnQgPT09IDApIHtcbiAgICByZXR1cm4gaW50cGFydFxuICB9IGVsc2Uge1xuICAgIHJldHVybiBpbnRwYXJ0ICsgJy4nICsgZGVjcGFydFxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnY2QgKGEsIGIpIHtcbiAgLy8gdGFrZW4gZnJvbSBmcmFjdGlvbi5qc1xuICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICBpZiAoIWIpIHsgcmV0dXJuIGEgfVxuXG4gIHdoaWxlICgxKSB7XG4gICAgYSAlPSBiXG4gICAgaWYgKCFhKSB7IHJldHVybiBiIH1cbiAgICBiICU9IGFcbiAgICBpZiAoIWIpIHsgcmV0dXJuIGEgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsY20gKGEsIGIpIHtcbiAgcmV0dXJuIGEgKiBiIC8gZ2NkKGEsIGIpXG59XG5cbi8qIEFycmF5cyBhbmQgc2ltaWxhciAqL1xuXG4vKipcbiAqIFNvcnRzIHR3byBhcnJheXMgdG9nZXRoZXIgYmFzZWQgb24gc29ydGluZyBhcnIwXG4gKiBAcGFyYW0geypbXX0gYXJyMFxuICogQHBhcmFtIHsqW119IGFycjFcbiAqIEBwYXJhbSB7Kn0gZlxuICovXG5leHBvcnQgZnVuY3Rpb24gc29ydFRvZ2V0aGVyIChhcnIwLCBhcnIxLCBmKSB7XG4gIGlmIChhcnIwLmxlbmd0aCAhPT0gYXJyMS5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb3RoIGFyZ3VtZW50cyBtdXN0IGJlIGFycmF5cyBvZiB0aGUgc2FtZSBsZW5ndGgnKVxuICB9XG5cbiAgZiA9IGYgfHwgKCh4LCB5KSA9PiB4IC0geSlcblxuICBjb25zdCBuID0gYXJyMC5sZW5ndGhcbiAgY29uc3QgY29tYmluZWQgPSBbXVxuICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgIGNvbWJpbmVkW2ldID0gW2FycjBbaV0sIGFycjFbaV1dXG4gIH1cblxuICBjb21iaW5lZC5zb3J0KCh4LCB5KSA9PiBmKHhbMF0sIHlbMF0pKVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgYXJyMFtpXSA9IGNvbWJpbmVkW2ldWzBdXG4gICAgYXJyMVtpXSA9IGNvbWJpbmVkW2ldWzFdXG4gIH1cblxuICByZXR1cm4gW2FycjAsIGFycjFdXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaHVmZmxlIChhcnJheSkge1xuICAvLyBLbnV0aC1GaXNoZXItWWF0ZXNcbiAgLy8gZnJvbSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjQ1MDk3Ni8zNzM3Mjk1XG4gIC8vIG5iLiBzaHVmZmxlcyBpbiBwbGFjZVxuICB2YXIgY3VycmVudEluZGV4ID0gYXJyYXkubGVuZ3RoOyB2YXIgdGVtcG9yYXJ5VmFsdWU7IHZhciByYW5kb21JbmRleFxuXG4gIC8vIFdoaWxlIHRoZXJlIHJlbWFpbiBlbGVtZW50cyB0byBzaHVmZmxlLi4uXG4gIHdoaWxlIChjdXJyZW50SW5kZXggIT09IDApIHtcbiAgICAvLyBQaWNrIGEgcmVtYWluaW5nIGVsZW1lbnQuLi5cbiAgICByYW5kb21JbmRleCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGN1cnJlbnRJbmRleClcbiAgICBjdXJyZW50SW5kZXggLT0gMVxuXG4gICAgLy8gQW5kIHN3YXAgaXQgd2l0aCB0aGUgY3VycmVudCBlbGVtZW50LlxuICAgIHRlbXBvcmFyeVZhbHVlID0gYXJyYXlbY3VycmVudEluZGV4XVxuICAgIGFycmF5W2N1cnJlbnRJbmRleF0gPSBhcnJheVtyYW5kb21JbmRleF1cbiAgICBhcnJheVtyYW5kb21JbmRleF0gPSB0ZW1wb3JhcnlWYWx1ZVxuICB9XG5cbiAgcmV0dXJuIGFycmF5XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIGEgaXMgYW4gYXJyYXkgY29udGFpbmluZyBlLCBmYWxzZSBvdGhlcndpc2UgKGluY2x1ZGluZyBpZiBhIGlzIG5vdCBhbiBhcnJheSlcbiAqIEBwYXJhbSB7Kn0gYSAgQW4gYXJyYXlcbiAqIEBwYXJhbSB7Kn0gZSBBbiBlbGVtZW50IHRvIGNoZWNrIGlmIGlzIGluIHRoZSBhcnJheVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3ZWFrSW5jbHVkZXMgKGEsIGUpIHtcbiAgcmV0dXJuIChBcnJheS5pc0FycmF5KGEpICYmIGEuaW5jbHVkZXMoZSkpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaXJzdFVuaXF1ZUluZGV4IChhcnJheSkge1xuICAvLyByZXR1cm5zIGluZGV4IG9mIGZpcnN0IHVuaXF1ZSBlbGVtZW50XG4gIC8vIGlmIG5vbmUsIHJldHVybnMgbGVuZ3RoIG9mIGFycmF5XG4gIGxldCBpID0gMFxuICB3aGlsZSAoaSA8IGFycmF5Lmxlbmd0aCkge1xuICAgIGlmIChhcnJheS5pbmRleE9mKGFycmF5W2ldKSA9PT0gYXJyYXkubGFzdEluZGV4T2YoYXJyYXlbaV0pKSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgICBpKytcbiAgfVxuICByZXR1cm4gaVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYm9vbE9iamVjdFRvQXJyYXkgKG9iaikge1xuICAvLyBHaXZlbiBhbiBvYmplY3Qgd2hlcmUgYWxsIHZhbHVlcyBhcmUgYm9vbGVhbiwgcmV0dXJuIGtleXMgd2hlcmUgdGhlIHZhbHVlIGlzIHRydWVcbiAgY29uc3QgcmVzdWx0ID0gW11cbiAgZm9yIChjb25zdCBrZXkgaW4gb2JqKSB7XG4gICAgaWYgKG9ialtrZXldKSByZXN1bHQucHVzaChrZXkpXG4gIH1cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG4vKiBPYmplY3QgcHJvcGVydHkgYWNjZXNzIGJ5IHN0cmluZyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb3BCeVN0cmluZyAobywgcywgeCkge1xuICAvKiBFLmcuIGJ5U3RyaW5nKG15T2JqLFwiZm9vLmJhclwiKSAtPiBteU9iai5mb28uYmFyXG4gICAgICogYnlTdHJpbmcobXlPYmosXCJmb28uYmFyXCIsXCJiYXpcIikgLT4gbXlPYmouZm9vLmJhciA9IFwiYmF6XCJcbiAgICAgKi9cbiAgcyA9IHMucmVwbGFjZSgvXFxbKFxcdyspXFxdL2csICcuJDEnKSAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICBzID0gcy5yZXBsYWNlKC9eXFwuLywgJycpIC8vIHN0cmlwIGEgbGVhZGluZyBkb3RcbiAgdmFyIGEgPSBzLnNwbGl0KCcuJylcbiAgZm9yICh2YXIgaSA9IDAsIG4gPSBhLmxlbmd0aCAtIDE7IGkgPCBuOyArK2kpIHtcbiAgICB2YXIgayA9IGFbaV1cbiAgICBpZiAoayBpbiBvKSB7XG4gICAgICBvID0gb1trXVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gIH1cbiAgaWYgKHggPT09IHVuZGVmaW5lZCkgcmV0dXJuIG9bYVtuXV1cbiAgZWxzZSBvW2Fbbl1dID0geFxufVxuXG4vKiBMb2dpYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1JZiAocCwgcSkgeyAvLyBtYXRlcmlhbCBjb25kaXRpb25hbFxuICByZXR1cm4gKCFwIHx8IHEpXG59XG5cbi8qIERPTSBtYW5pcHVsYXRpb24gYW5kIHF1ZXJ5aW5nICovXG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBIVE1MIGVsZW1lbnQsIHNldHMgY2xhc3NlcyBhbmQgYXBwZW5kc1xuICogQHBhcmFtIHtzdHJpbmd9IHRhZ05hbWUgVGFnIG5hbWUgb2YgZWxlbWVudFxuICogQHBhcmFtIHtzdHJpbmd8dW5kZWZpbmVkfSBbY2xhc3NOYW1lXSBBIGNsYXNzIG9yIGNsYXNzZXMgdG8gYXNzaWduIHRvIHRoZSBlbGVtZW50XG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBbcGFyZW50XSBBIHBhcmVudCBlbGVtZW50IHRvIGFwcGVuZCB0aGUgZWxlbWVudCB0b1xuICogQHJldHVybnMge0hUTUxFbGVtZW50fVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRWxlbSAodGFnTmFtZSwgY2xhc3NOYW1lLCBwYXJlbnQpIHtcbiAgLy8gY3JlYXRlLCBzZXQgY2xhc3MgYW5kIGFwcGVuZCBpbiBvbmVcbiAgY29uc3QgZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSlcbiAgaWYgKGNsYXNzTmFtZSkgZWxlbS5jbGFzc05hbWUgPSBjbGFzc05hbWVcbiAgaWYgKHBhcmVudCkgcGFyZW50LmFwcGVuZENoaWxkKGVsZW0pXG4gIHJldHVybiBlbGVtXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoYXNBbmNlc3RvckNsYXNzIChlbGVtLCBjbGFzc05hbWUpIHtcbiAgLy8gY2hlY2sgaWYgYW4gZWxlbWVudCBlbGVtIG9yIGFueSBvZiBpdHMgYW5jZXN0b3JzIGhhcyBjbHNzXG4gIGxldCByZXN1bHQgPSBmYWxzZVxuICBmb3IgKDtlbGVtICYmIGVsZW0gIT09IGRvY3VtZW50OyBlbGVtID0gZWxlbS5wYXJlbnROb2RlKSB7IC8vIHRyYXZlcnNlIERPTSB1cHdhcmRzXG4gICAgaWYgKGVsZW0uY2xhc3NMaXN0LmNvbnRhaW5zKGNsYXNzTmFtZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRydWVcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgdHdvIGVsZW1lbnRzIG92ZXJsYXBcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW0xIEFuIEhUTUwgZWxlbWVudFxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbTIgQW4gSFRNTCBlbGVtZW50XG4gKi9cbmZ1bmN0aW9uIG92ZXJsYXAoIGVsZW0xLCBlbGVtMikge1xuICBjb25zdCByZWN0MSA9IGVsZW0xLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpXG4gIGNvbnN0IHJlY3QyID0gZWxlbTIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcbiAgcmV0dXJuICEocmVjdDEucmlnaHQgPCByZWN0Mi5sZWZ0IHx8IFxuICAgICAgICAgICByZWN0MS5sZWZ0ID4gcmVjdDIucmlnaHQgfHwgXG4gICAgICAgICAgIHJlY3QxLmJvdHRvbSA8IHJlY3QyLnRvcCB8fCBcbiAgICAgICAgICAgcmVjdDEudG9wID4gcmVjdDIuYm90dG9tKVxufVxuXG4vKipcbiAqIElmIGVsZW0xIGFuZCBlbGVtMiBvdmVybGFwLCBtb3ZlIHRoZW0gYXBhcnQgdW50aWwgdGhleSBkb24ndC5cbiAqIE9ubHkgd29ya3MgZm9yIHRob3NlIHdpdGggcG9zaXRpb246YWJzb2x1dGVcbiAqIFRoaXMgc3RyaXBzIHRyYW5zZm9ybWF0aW9ucywgd2hpY2ggbWF5IGJlIGEgcHJvYmxlbVxuICogRWxlbWVudHMgd2l0aCBjbGFzcyAncmVwZWwtbG9ja2VkJyB3aWxsIG5vdCBiZSBtb3ZlZFxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbTEgQW4gSFRNTCBlbGVtZW50XG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtMiBBbiBIVE1MIGVsZW1lbnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlcGVsRWxlbWVudHMoZWxlbTEsIGVsZW0yKSAge1xuICBpZiAoIW92ZXJsYXAoZWxlbTEsZWxlbTIpKSByZXR1cm5cbiAgaWYgKGdldENvbXB1dGVkU3R5bGUoZWxlbTEpLnBvc2l0aW9uICE9PSBcImFic29sdXRlXCIgfHwgZ2V0Q29tcHV0ZWRTdHlsZShlbGVtMikucG9zaXRpb24gIT09ICdhYnNvbHV0ZScpIHRocm93IG5ldyBFcnJvciAoJ09ubHkgY2FsbCBvbiBwb3NpdGlvbjphYnNvbHV0ZScpXG4gIGxldCB0bDEgPSBQb2ludC5mcm9tRWxlbWVudChlbGVtMSlcbiAgbGV0IHRsMiA9IFBvaW50LmZyb21FbGVtZW50KGVsZW0yKVxuICBcbiAgY29uc3QgYzEgPSBQb2ludC5mcm9tRWxlbWVudChlbGVtMSwgXCJjZW50ZXJcIilcbiAgY29uc3QgYzIgPSBQb2ludC5mcm9tRWxlbWVudChlbGVtMiwgXCJjZW50ZXJcIilcbiAgY29uc3QgdmVjID0gUG9pbnQudW5pdFZlY3RvcihjMSxjMilcblxuICBjb25zdCBsb2NrZWQxID0gZWxlbTEuY2xhc3NMaXN0LmNvbnRhaW5zKCdyZXBlbC1sb2NrZWQnKVxuICBjb25zdCBsb2NrZWQyID0gZWxlbTIuY2xhc3NMaXN0LmNvbnRhaW5zKCdyZXBlbC1sb2NrZWQnKVxuXG4gIGxldCBpID0gMFxuICB3aGlsZShvdmVybGFwKGVsZW0xLGVsZW0yKSAmJiBpPDUwMCkge1xuICAgIGlmICghbG9ja2VkMSkgdGwxLnRyYW5zbGF0ZSgtdmVjLngsLXZlYy55KVxuICAgIGlmICghbG9ja2VkMikgdGwyLnRyYW5zbGF0ZSh2ZWMueCx2ZWMueSlcbiAgICBlbGVtMS5zdHlsZS5sZWZ0ID0gdGwxLnggKyBcInB4XCJcbiAgICBlbGVtMS5zdHlsZS50b3AgPSB0bDEueSArIFwicHhcIlxuICAgIGVsZW0xLnN0eWxlLnRyYW5zZm9ybSA9IFwibm9uZVwiXG4gICAgZWxlbTIuc3R5bGUubGVmdCA9IHRsMi54ICsgXCJweFwiXG4gICAgZWxlbTIuc3R5bGUudG9wID0gdGwyLnkgKyBcInB4XCJcbiAgICBlbGVtMi5zdHlsZS50cmFuc2Zvcm0gPSBcIm5vbmVcIlxuICAgIGkrK1xuICB9XG4gIGlmIChpPT09NTAwKSB0aHJvdyBuZXcgRXJyb3IoJ1RvbyBtdWNoIG1vdmluZycpXG4gIGNvbnNvbGUubG9nKGBSZXBlbGxlZCB3aXRoICR7aX0gaXRlcmF0aW9uc2ApXG59XG5cbi8qIENhbnZhcyBkcmF3aW5nICovXG5leHBvcnQgZnVuY3Rpb24gZGFzaGVkTGluZSAoY3R4LCB4MSwgeTEsIHgyLCB5Mikge1xuICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHgyIC0geDEsIHkyIC0geTEpXG4gIGNvbnN0IGRhc2h4ID0gKHkxIC0geTIpIC8gbGVuZ3RoIC8vIHVuaXQgdmVjdG9yIHBlcnBlbmRpY3VsYXIgdG8gbGluZVxuICBjb25zdCBkYXNoeSA9ICh4MiAtIHgxKSAvIGxlbmd0aFxuICBjb25zdCBtaWR4ID0gKHgxICsgeDIpIC8gMlxuICBjb25zdCBtaWR5ID0gKHkxICsgeTIpIC8gMlxuXG4gIC8vIGRyYXcgdGhlIGJhc2UgbGluZVxuICBjdHgubW92ZVRvKHgxLCB5MSlcbiAgY3R4LmxpbmVUbyh4MiwgeTIpXG5cbiAgLy8gZHJhdyB0aGUgZGFzaFxuICBjdHgubW92ZVRvKG1pZHggKyA1ICogZGFzaHgsIG1pZHkgKyA1ICogZGFzaHkpXG4gIGN0eC5saW5lVG8obWlkeCAtIDUgKiBkYXNoeCwgbWlkeSAtIDUgKiBkYXNoeSlcblxuICBjdHgubW92ZVRvKHgyLCB5Milcbn1cbiIsImltcG9ydCB7IE9wdGlvbnNTcGVjLCBPcHRpb24gYXMgT3B0aW9uSSwgU2VsZWN0RXhjbHVzaXZlT3B0aW9uLCBTZWxlY3RJbmNsdXNpdmVPcHRpb24sIFJlYWxPcHRpb24sIFJhbmdlT3B0aW9uLCBJbnRlZ2VyT3B0aW9uLCBCb29sZWFuT3B0aW9uIH0gZnJvbSAnT3B0aW9uc1NwZWMnXG5pbXBvcnQgeyBjcmVhdGVFbGVtIH0gZnJvbSAndXRpbGl0aWVzJ1xuXG4vKiogIFJlY29yZHMgdHlwc2Ugb2Ygb3B0aW9uIGF2YWlsYWJpbHR5LCBhbmQgbGluayB0byBVSSBhbmQgZnVydGhlciBvcHRpb25zIHNldHMgKi9cbnR5cGUgT3B0aW9uc3BlYzIgPSAoT3B0aW9uc1NwZWNbMF0gJiB7IC8vIFN0YXJ0IHdpdGggc3RhbmRhcmQgb3B0aW9ucyBzcGVjIC0gdGFrZW4gZnJvbSBxdWVzdGlvbiBnZW5lcmF0b3IgY2xhc3Nlc1xuICBlbGVtZW50PzogSFRNTEVsZW1lbnQsIC8vIG1vc3Qgd2lsbCBhbHNvIGhhdmUgbGlua3MgdG8gYSBVSSBlbGVtZW50XG4gIHN1Yk9wdGlvbnNTZXQ/OiBPcHRpb25zU2V0IC8vIGZvciBvcHRpb24udHlwZT1cInN1Ym9wdGlvbnNcIiwgaG9sZCBsaW5rIHRvIHRoZSBPcHRpb25zU2V0IGZvciB0aGF0XG59KVtdXG5cbi8qKlxuICogQSBzaW1wbGUgb2JqZWN0IHJlcHJlc2VudGluZyBvcHRpb25zIHRvIHNlbmQgdG8gYSBxdWVzdGlvbiBnZW5lcmF0b3JcbiAqIE5CLiBUaGlzIGlzIGEgdmVyeSAnbG9vc2UnIHR5cGVcbiAqL1xuaW50ZXJmYWNlIE9wdGlvbnMge1xuICBba2V5OiBzdHJpbmddOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgc3RyaW5nW10gfCBPcHRpb25zXG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIHNldCBvZiBvcHRpb25zLCB3aXRoIGxpbmsgdG8gVUkgZWxlbWVudHMuIFN0b3JlcyBpbnRlcm5hbGx5IHRoZSBvcHRpb25zXG4gKiBpbiBhIHNpbXBsZSBvYmplY3Qgc3VpdGFibGUgZm9yIHBhc3NpbmcgdG8gcXVlc3Rpb24gZ2VuZXJhdG9yc1xuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBPcHRpb25zU2V0IHtcbiAgb3B0aW9uc1NwZWMgOiBPcHRpb25zcGVjMlxuICBvcHRpb25zIDogT3B0aW9uc1xuICB0ZW1wbGF0ZT8gOiBzdHJpbmdcbiAgZ2xvYmFsSWQ6IHN0cmluZ1xuICBzdGF0aWMgaWRDb3VudGVyID0gMCAvLyBpbmNyZW1lbnQgZWFjaCB0aW1lIHRvIGNyZWF0ZSB1bmlxdWUgaWRzIHRvIHVzZSBpbiBpZHMvbmFtZXMgb2YgZWxlbWVudHNcblxuICBzdGF0aWMgZ2V0SWQgKCk6IHN0cmluZyB7XG4gICAgaWYgKE9wdGlvbnNTZXQuaWRDb3VudGVyID49IDI2ICoqIDIpIHRocm93IG5ldyBFcnJvcignVG9vIG1hbnkgb3B0aW9ucyBvYmplY3RzIScpXG4gICAgY29uc3QgaWQgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKH5+KE9wdGlvbnNTZXQuaWRDb3VudGVyIC8gMjYpICsgOTcpICtcbiAgICAgIFN0cmluZy5mcm9tQ2hhckNvZGUoT3B0aW9uc1NldC5pZENvdW50ZXIgJSAyNiArIDk3KVxuXG4gICAgT3B0aW9uc1NldC5pZENvdW50ZXIgKz0gMVxuXG4gICAgcmV0dXJuIGlkXG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IG9wdGlvbnMgc3BlY1xuICAgKiBAcGFyYW0gb3B0aW9uc1NwZWMgU3BlY2lmaWNhdGlvbiBvZiBvcHRpb25zXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZSBBIHRlbXBsYXRlIGZvciBkaXNwbGF5aW5nIG9wdGlvbnMsIHVzaW5nIHt7bXVzdGFjaGV9fSBzeW50YXhcbiAgICovXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zU3BlYyA6IE9wdGlvbnNTcGVjLCB0ZW1wbGF0ZT8gOiBzdHJpbmcpIHtcbiAgICB0aGlzLm9wdGlvbnNTcGVjID0gb3B0aW9uc1NwZWMgYXMgT3B0aW9uc3BlYzJcblxuICAgIHRoaXMub3B0aW9ucyA9IHt9XG4gICAgdGhpcy5vcHRpb25zU3BlYy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICBpZiAoaXNSZWFsT3B0aW9uKG9wdGlvbikgJiYgb3B0aW9uLnR5cGUgIT09ICdzdWJvcHRpb25zJyAmJiBvcHRpb24udHlwZSAhPT0gJ3JhbmdlJykge1xuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IG9wdGlvbi5kZWZhdWx0XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbi50eXBlID09PSAncmFuZ2UnKSB7XG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRMQl0gPSBvcHRpb24uZGVmYXVsdExCXG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRVQl0gPSBvcHRpb24uZGVmYXVsdFVCXG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbi50eXBlID09PSAnc3Vib3B0aW9ucycpIHsgLy8gUmVjdXJzaXZlbHkgYnVpbGQgc3Vib3B0aW9ucy4gVGVybWluYXRlcyBhcyBsb25nIGFzIG9wdGlvbnNTcGVjIGlzIG5vdCBjaXJjdWxhclxuICAgICAgICBvcHRpb24uc3ViT3B0aW9uc1NldCA9IG5ldyBPcHRpb25zU2V0KG9wdGlvbi5vcHRpb25zU3BlYylcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBvcHRpb24uc3ViT3B0aW9uc1NldC5vcHRpb25zXG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZSAvLyBodG1sIHRlbXBsYXRlIChvcHRpb25hbClcblxuICAgIC8vIHNldCBhbiBpZCBiYXNlZCBvbiBhIGNvdW50ZXIgLSB1c2VkIGZvciBuYW1lcyBvZiBmb3JtIGVsZW1lbnRzXG4gICAgdGhpcy5nbG9iYWxJZCA9IE9wdGlvbnNTZXQuZ2V0SWQoKVxuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIGFuIG9wdGlvbiwgZmluZCBpdHMgVUkgZWxlbWVudCBhbmQgdXBkYXRlIHRoZSBzdGF0ZSBmcm9tIHRoYXRcbiAgICogQHBhcmFtIHsqfSBvcHRpb24gQW4gZWxlbWVudCBvZiB0aGlzLm9wdGlvblNwZWMgb3IgYW4gaWRcbiAgICovXG4gIHVwZGF0ZVN0YXRlRnJvbVVJIChvcHRpb24gOiBPcHRpb25zcGVjMlswXSB8IHN0cmluZykgOiB2b2lkIHtcbiAgICAvLyBpbnB1dCAtIGVpdGhlciBhbiBlbGVtZW50IG9mIHRoaXMub3B0aW9uc1NwZWMgb3IgYW4gb3B0aW9uIGlkXG4gICAgaWYgKHR5cGVvZiAob3B0aW9uKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNvbnN0IG9wdGlvbnNTcGVjIDogT3B0aW9uc3BlYzJbMF0gfCB1bmRlZmluZWQgPSB0aGlzLm9wdGlvbnNTcGVjLmZpbmQoeCA9PiAoKHggYXMgT3B0aW9uSSkuaWQgPT09IG9wdGlvbikpXG4gICAgICBpZiAob3B0aW9uc1NwZWMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBvcHRpb24gPSBvcHRpb25zU3BlY1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBubyBvcHRpb24gd2l0aCBpZCAnJHtvcHRpb259J2ApXG4gICAgICB9XG4gICAgfVxuICAgIGlmICghb3B0aW9uLmVsZW1lbnQpIHRocm93IG5ldyBFcnJvcihgb3B0aW9uICR7KG9wdGlvbiBhcyBPcHRpb25JKS5pZH0gZG9lc24ndCBoYXZlIGEgVUkgZWxlbWVudGApXG5cbiAgICBzd2l0Y2ggKG9wdGlvbi50eXBlKSB7XG4gICAgICBjYXNlICdpbnQnOiB7XG4gICAgICAgIGNvbnN0IGlucHV0IDogSFRNTElucHV0RWxlbWVudCA9IG9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpWzBdXG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gTnVtYmVyKGlucHV0LnZhbHVlKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAnYm9vbCc6IHtcbiAgICAgICAgY29uc3QgaW5wdXQgOiBIVE1MSW5wdXRFbGVtZW50ID0gb3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JylbMF1cbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBpbnB1dC5jaGVja2VkXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdzZWxlY3QtZXhjbHVzaXZlJzoge1xuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IChvcHRpb24uZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdpbnB1dDpjaGVja2VkJykgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWVcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NlbGVjdC1pbmNsdXNpdmUnOiB7XG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID1cbiAgICAgICAgICAoQXJyYXkuZnJvbShvcHRpb24uZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dDpjaGVja2VkJykpIGFzIEhUTUxJbnB1dEVsZW1lbnRbXSkubWFwKHggPT4geC52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3JhbmdlJzoge1xuICAgICAgICBjb25zdCBpbnB1dExCIDogSFRNTElucHV0RWxlbWVudCA9IG9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpWzBdXG4gICAgICAgIGNvbnN0IGlucHV0VUIgOiBIVE1MSW5wdXRFbGVtZW50ID0gb3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JylbMV1cbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZExCXSA9IE51bWJlcihpbnB1dExCLnZhbHVlKVxuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkVUJdID0gTnVtYmVyKGlucHV0VUIudmFsdWUpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgb3B0aW9uIHdpdGggaWQgJHsob3B0aW9uIGFzIE9wdGlvbkkpLmlkfSBoYXMgdW5yZWNvZ25pc2VkIG9wdGlvbiB0eXBlICR7b3B0aW9uLnR5cGV9YClcbiAgICB9XG4gICAgY29uc29sZS5sb2codGhpcy5vcHRpb25zKVxuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIGEgc3RyaW5nLCByZXR1cm4gdGhlIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25zIHdpdGggdGhhdCBpZFxuICAgKiBAcGFyYW0gaWQgVGhlIGlkXG4gICAqL1xuXG4gIHVwZGF0ZVN0YXRlRnJvbVVJQWxsICgpOiB2b2lkIHtcbiAgICB0aGlzLm9wdGlvbnNTcGVjLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgIGlmIChpc1JlYWxPcHRpb24ob3B0aW9uKSkge1xuICAgICAgICB0aGlzLnVwZGF0ZVN0YXRlRnJvbVVJKG9wdGlvbilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZGlzYWJsZU9yRW5hYmxlQWxsICgpOiB2b2lkIHtcbiAgICB0aGlzLm9wdGlvbnNTcGVjLmZvckVhY2gob3B0aW9uID0+IHRoaXMuZGlzYWJsZU9yRW5hYmxlKG9wdGlvbikpXG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYW4gb3B0aW9uLCBlbmFibGUgdGhlIFVJIGVsZW1lbnRzIGlmIGFuZCBvbmx5IGlmIGFsbCB0aGUgYm9vbGVhblxuICAgKiBvcHRpb25zIGluIG9wdGlvbi5lbmFibGVkSWYgYXJlIHRydWVcbiAgICogQHBhcmFtIG9wdGlvbiBBbiBlbGVtZW50IG9mIHRoaXMub3B0aW9uc1NwZWMgb3IgYW4gb3B0aW9uIGlkXG4gICAqL1xuICBkaXNhYmxlT3JFbmFibGUgKG9wdGlvbiA6IHN0cmluZyB8IE9wdGlvbnNwZWMyWzBdKTogdm9pZCB7XG4gICAgaWYgKHR5cGVvZiAob3B0aW9uKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNvbnN0IHRlbXBPcHRpb24gOiBPcHRpb25zcGVjMlswXSB8IHVuZGVmaW5lZCA9IHRoaXMub3B0aW9uc1NwZWMuZmluZCh4ID0+IChpc1JlYWxPcHRpb24oeCkgJiYgeC5pZCA9PT0gb3B0aW9uKSlcbiAgICAgIGlmICh0ZW1wT3B0aW9uICE9PSB1bmRlZmluZWQpIHsgb3B0aW9uID0gdGVtcE9wdGlvbiB9IGVsc2UgeyB0aHJvdyBuZXcgRXJyb3IoYG5vIG9wdGlvbiB3aXRoIGlkICcke29wdGlvbn0nYCkgfVxuICAgIH1cblxuICAgIGlmICghaXNSZWFsT3B0aW9uKG9wdGlvbikgfHwgIW9wdGlvbi5lbmFibGVkSWYgfHwgb3B0aW9uLmVsZW1lbnQgPT09IHVuZGVmaW5lZCkgcmV0dXJuXG5cbiAgICBjb25zdCBlbmFibGVyTGlzdCA9IG9wdGlvbi5lbmFibGVkSWYuc3BsaXQoJyYnKSAvL1xuICAgIGxldCBlbmFibGUgPSB0cnVlIC8vIHdpbGwgZGlzYWJsZSBpZiBqdXN0IG9uZSBvZiB0aGUgZWxlbWVudHMgb2YgZW5hYmxlckxpc3QgaXMgZmFsc2VcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZW5hYmxlckxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBlbmFibGVySWQgPSBlbmFibGVyTGlzdFtpXVxuICAgICAgbGV0IG5lZ2F0ZSA9IGZhbHNlIC8vIGlmIGl0IHN0YXJ0cyB3aXRoICEsIG5lZ2F0aXZlIG91dHB1dFxuICAgICAgaWYgKGVuYWJsZXJJZC5zdGFydHNXaXRoKCchJykpIHtcbiAgICAgICAgbmVnYXRlID0gdHJ1ZVxuICAgICAgICBlbmFibGVySWQgPSBlbmFibGVySWQuc2xpY2UoMSlcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB0aGlzLm9wdGlvbnNbZW5hYmxlcklkXSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAnZW5hYmxlZElmJzogJHtlbmFibGVySWR9IGlzIG5vdCBhIGJvb2xlYW4gb3B0aW9uYClcbiAgICAgIH1cblxuICAgICAgY29uc3QgZW5hYmxlclZhbHVlIDogYm9vbGVhbiA9IHRoaXMub3B0aW9uc1tlbmFibGVySWRdIGFzIGJvb2xlYW4gLy8hID09IG5lZ2F0ZSAvLyAhPT0gZXF1aXZhbGVudCB0byBYT1JcblxuICAgICAgaWYgKCFlbmFibGVyVmFsdWUpIHtcbiAgICAgICAgZW5hYmxlID0gZmFsc2VcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZW5hYmxlKSB7XG4gICAgICBvcHRpb24uZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKCdkaXNhYmxlZCcpXG4gICAgICA7Wy4uLm9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpXS5mb3JFYWNoKGUgPT4geyBlLmRpc2FibGVkID0gZmFsc2UgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9uLmVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnZGlzYWJsZWQnKVxuICAgICAgO1suLi5vcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKV0uZm9yRWFjaChlID0+IHsgZS5kaXNhYmxlZCA9IHRydWUgfSlcbiAgICB9XG4gIH1cblxuICByZW5kZXJJbiAoZWxlbWVudDogSFRNTEVsZW1lbnQsIHVsRXh0cmFDbGFzcz8gOiBzdHJpbmcpIDogSFRNTEVsZW1lbnQge1xuICAgIGNvbnN0IGxpc3QgPSBjcmVhdGVFbGVtKCd1bCcsICdvcHRpb25zLWxpc3QnKVxuICAgIGlmICh1bEV4dHJhQ2xhc3MpIGxpc3QuY2xhc3NMaXN0LmFkZCh1bEV4dHJhQ2xhc3MpXG4gICAgbGV0IGNvbHVtbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdvcHRpb25zLWNvbHVtbicsIGxpc3QpXG5cbiAgICB0aGlzLm9wdGlvbnNTcGVjLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgIGlmIChvcHRpb24udHlwZSA9PT0gJ2NvbHVtbi1icmVhaycpIHsgLy8gc3RhcnQgbmV3IGNvbHVtblxuICAgICAgICBjb2x1bW4gPSBjcmVhdGVFbGVtKCdkaXYnLCAnb3B0aW9ucy1jb2x1bW4nLCBsaXN0KVxuICAgICAgfSBlbHNlIGlmIChvcHRpb24udHlwZSA9PT0gJ3N1Ym9wdGlvbnMnKSB7XG4gICAgICAgIGNvbnN0IHN1Yk9wdGlvbnNTZXQgPSBvcHRpb24uc3ViT3B0aW9uc1NldFxuICAgICAgICBpZiAoc3ViT3B0aW9uc1NldCA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoJ1RoaXMgc2hvdWxkIG5vdCBoYXBwZW4hJylcbiAgICAgICAgY29uc3Qgc3ViT3B0aW9uc0VsZW1lbnQgPSBzdWJPcHRpb25zU2V0LnJlbmRlckluKGNvbHVtbiwgJ3N1Ym9wdGlvbnMnKVxuICAgICAgICBvcHRpb24uZWxlbWVudCA9IHN1Yk9wdGlvbnNFbGVtZW50XG4gICAgICB9IGVsc2UgeyAvLyBtYWtlIGxpc3QgaXRlbVxuICAgICAgICBjb25zdCBsaSA9IGNyZWF0ZUVsZW0oJ2xpJywgdW5kZWZpbmVkLCBjb2x1bW4pXG4gICAgICAgIGlmIChpc1JlYWxPcHRpb24ob3B0aW9uKSkge1xuICAgICAgICAgIGxpLmRhdGFzZXQub3B0aW9uSWQgPSBvcHRpb24uaWRcbiAgICAgICAgfVxuXG4gICAgICAgIHN3aXRjaCAob3B0aW9uLnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdoZWFkaW5nJzpcbiAgICAgICAgICAgIHJlbmRlckhlYWRpbmcob3B0aW9uLnRpdGxlLCBsaSlcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAnaW50JzpcbiAgICAgICAgICBjYXNlICdib29sJzpcbiAgICAgICAgICAgIHJlbmRlclNpbmdsZU9wdGlvbihvcHRpb24sIGxpKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdzZWxlY3QtaW5jbHVzaXZlJzpcbiAgICAgICAgICBjYXNlICdzZWxlY3QtZXhjbHVzaXZlJzpcbiAgICAgICAgICAgIHRoaXMucmVuZGVyTGlzdE9wdGlvbihvcHRpb24sIGxpKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdyYW5nZSc6XG4gICAgICAgICAgICByZW5kZXJSYW5nZU9wdGlvbihvcHRpb24sIGxpKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgICBsaS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgdGhpcy51cGRhdGVTdGF0ZUZyb21VSShvcHRpb24pXG4gICAgICAgICAgdGhpcy5kaXNhYmxlT3JFbmFibGVBbGwoKSB9KVxuICAgICAgICBvcHRpb24uZWxlbWVudCA9IGxpXG4gICAgICB9XG4gICAgfSlcbiAgICBlbGVtZW50LmFwcGVuZChsaXN0KVxuXG4gICAgdGhpcy5kaXNhYmxlT3JFbmFibGVBbGwoKVxuXG4gICAgcmV0dXJuIGxpc3RcbiAgfVxuXG4gIC8qIGVzbGludC1kaXNhYmxlICovXG4gIHJlbmRlcldpdGhUZW1wbGF0ZSAoZWxlbWVudCA6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgLy8gY3JlYXRlIGFwcHJvcHJpYXRlIG9iamVjdCBmb3IgbXVzdGFjaGVcbiAgICBsZXQgb3B0aW9uczogUmVjb3JkPHN0cmluZywgT3B0aW9uST5cbiAgICB0aGlzLm9wdGlvbnNTcGVjLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgIGlmIChpc1JlYWxPcHRpb24ob3B0aW9uKSkge1xuICAgICAgICBvcHRpb25zW29wdGlvbi5pZF0gPSBvcHRpb25cbiAgICAgIH1cbiAgICB9KVxuXG4gICAgY29uc3QgaHRtbFN0cmluZyA9IHRoaXMudGVtcGxhdGVcbiAgfVxuICAvKiBlc2xpbnQtZW5hYmxlICovXG5cbiAgcmVuZGVyTGlzdE9wdGlvbiAob3B0aW9uOiBTZWxlY3RFeGNsdXNpdmVPcHRpb24gfCBTZWxlY3RJbmNsdXNpdmVPcHRpb24sIGxpIDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBsaS5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIG9wdGlvbi50aXRsZSArICc6ICcpXG5cbiAgICBjb25zdCBzdWJsaXN0ID0gY3JlYXRlRWxlbSgndWwnLCAnb3B0aW9ucy1zdWJsaXN0JywgbGkpXG4gICAgaWYgKG9wdGlvbi52ZXJ0aWNhbCkgc3VibGlzdC5jbGFzc0xpc3QuYWRkKCdvcHRpb25zLXN1Ymxpc3QtdmVydGljYWwnKVxuXG4gICAgb3B0aW9uLnNlbGVjdE9wdGlvbnMuZm9yRWFjaChzZWxlY3RPcHRpb24gPT4ge1xuICAgICAgY29uc3Qgc3VibGlzdExpID0gY3JlYXRlRWxlbSgnbGknLCB1bmRlZmluZWQsIHN1Ymxpc3QpXG4gICAgICBjb25zdCBsYWJlbCA9IGNyZWF0ZUVsZW0oJ2xhYmVsJywgdW5kZWZpbmVkLCBzdWJsaXN0TGkpXG5cbiAgICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKVxuICAgICAgaW5wdXQudHlwZSA9IG9wdGlvbi50eXBlID09PSAnc2VsZWN0LWV4Y2x1c2l2ZScgPyAncmFkaW8nIDogJ2NoZWNrYm94J1xuICAgICAgaW5wdXQubmFtZSA9IHRoaXMuZ2xvYmFsSWQgKyAnLScgKyBvcHRpb24uaWRcbiAgICAgIGlucHV0LnZhbHVlID0gc2VsZWN0T3B0aW9uLmlkXG5cbiAgICAgIGlmIChvcHRpb24udHlwZSA9PT0gJ3NlbGVjdC1pbmNsdXNpdmUnKSB7IC8vIGRlZmF1bHRzIHdvcmsgZGlmZmVyZW50IGZvciBpbmNsdXNpdmUvZXhjbHVzaXZlXG4gICAgICAgIGlucHV0LmNoZWNrZWQgPSBvcHRpb24uZGVmYXVsdC5pbmNsdWRlcyhzZWxlY3RPcHRpb24uaWQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbnB1dC5jaGVja2VkID0gb3B0aW9uLmRlZmF1bHQgPT09IHNlbGVjdE9wdGlvbi5pZFxuICAgICAgfVxuXG4gICAgICBsYWJlbC5hcHBlbmQoaW5wdXQpXG5cbiAgICAgIGlucHV0LmNsYXNzTGlzdC5hZGQoJ29wdGlvbicpXG5cbiAgICAgIGxhYmVsLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgc2VsZWN0T3B0aW9uLnRpdGxlKVxuICAgIH0pXG4gIH1cbn1cblxuLyoqXG4gKiBSZW5kZXJzIGEgaGVhZGluZyBvcHRpb25cbiAqIEBwYXJhbSB7c3RyaW5nfSB0aXRsZSBUaGUgdGl0bGUgb2YgdGhlIGhlYWRpbmdcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGxpIFRoZSBlbGVtZW50IHRvIHJlbmRlciBpbnRvXG4gKi9cbmZ1bmN0aW9uIHJlbmRlckhlYWRpbmcgKHRpdGxlOiBzdHJpbmcsIGxpOiBIVE1MRWxlbWVudCkge1xuICBsaS5pbm5lckhUTUwgPSB0aXRsZVxuICBsaS5jbGFzc0xpc3QuYWRkKCdvcHRpb25zLWhlYWRpbmcnKVxufVxuXG4vKipcbiAqIFJlbmRlcnMgc2luZ2xlIHBhcmFtZXRlclxuICogQHBhcmFtIHsqfSBvcHRpb25cbiAqIEBwYXJhbSB7Kn0gbGlcbiAqL1xuZnVuY3Rpb24gcmVuZGVyU2luZ2xlT3B0aW9uIChvcHRpb246IEludGVnZXJPcHRpb24gfCBCb29sZWFuT3B0aW9uLCBsaTogSFRNTEVsZW1lbnQpIHtcbiAgY29uc3QgbGFiZWwgPSBjcmVhdGVFbGVtKCdsYWJlbCcsIHVuZGVmaW5lZCwgbGkpXG5cbiAgaWYgKCFvcHRpb24uc3dhcExhYmVsICYmIG9wdGlvbi50aXRsZSAhPT0gJycpIGxhYmVsLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgYCR7b3B0aW9uLnRpdGxlfTogYClcblxuICBjb25zdCBpbnB1dCA6IEhUTUxJbnB1dEVsZW1lbnQgPSBjcmVhdGVFbGVtKCdpbnB1dCcsICdvcHRpb24nLCBsYWJlbCkgYXMgSFRNTElucHV0RWxlbWVudFxuICBzd2l0Y2ggKG9wdGlvbi50eXBlKSB7XG4gICAgY2FzZSAnaW50JzpcbiAgICAgIGlucHV0LnR5cGUgPSAnbnVtYmVyJ1xuICAgICAgaW5wdXQubWluID0gb3B0aW9uLm1pbi50b1N0cmluZygpXG4gICAgICBpbnB1dC5tYXggPSBvcHRpb24ubWF4LnRvU3RyaW5nKClcbiAgICAgIGlucHV0LnZhbHVlID0gb3B0aW9uLmRlZmF1bHQudG9TdHJpbmcoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdib29sJzpcbiAgICAgIGlucHV0LnR5cGUgPSAnY2hlY2tib3gnXG4gICAgICBpbnB1dC5jaGVja2VkID0gb3B0aW9uLmRlZmF1bHRcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVHlwZXNjcmlwdCBpcyBwcmV0dHkgc3VyZSBJIGNhblxcJ3QgZ2V0IGhlcmUnKVxuICB9XG5cbiAgaWYgKG9wdGlvbi5zd2FwTGFiZWwgJiYgb3B0aW9uLnRpdGxlICE9PSAnJykgbGFiZWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLCBgICR7b3B0aW9uLnRpdGxlfWApXG59XG5cbmZ1bmN0aW9uIHJlbmRlclJhbmdlT3B0aW9uIChvcHRpb246IFJhbmdlT3B0aW9uLCBsaTogSFRNTEVsZW1lbnQpIHtcbiAgY29uc3QgbGFiZWwgPSBjcmVhdGVFbGVtKCdsYWJlbCcsIHVuZGVmaW5lZCwgbGkpXG4gIGNvbnN0IGlucHV0TEIgPSBjcmVhdGVFbGVtKCdpbnB1dCcsICdvcHRpb24nLCBsYWJlbCkgYXMgSFRNTElucHV0RWxlbWVudFxuICBpbnB1dExCLnR5cGUgPSAnbnVtYmVyJ1xuICBpbnB1dExCLm1pbiA9IG9wdGlvbi5taW4udG9TdHJpbmcoKVxuICBpbnB1dExCLm1heCA9IG9wdGlvbi5tYXgudG9TdHJpbmcoKVxuICBpbnB1dExCLnZhbHVlID0gb3B0aW9uLmRlZmF1bHRMQi50b1N0cmluZygpXG5cbiAgbGFiZWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLCBgICZsZXE7ICR7b3B0aW9uLnRpdGxlfSAmbGVxOyBgKVxuXG4gIGNvbnN0IGlucHV0VUIgPSBjcmVhdGVFbGVtKCdpbnB1dCcsICdvcHRpb24nLCBsYWJlbCkgYXMgSFRNTElucHV0RWxlbWVudFxuICBpbnB1dFVCLnR5cGUgPSAnbnVtYmVyJ1xuICBpbnB1dFVCLm1pbiA9IG9wdGlvbi5taW4udG9TdHJpbmcoKVxuICBpbnB1dFVCLm1heCA9IG9wdGlvbi5tYXgudG9TdHJpbmcoKVxuICBpbnB1dFVCLnZhbHVlID0gb3B0aW9uLmRlZmF1bHRVQi50b1N0cmluZygpXG59XG5cbi8qKiBEZXRlcm1pbmVzIGlmIGFuIG9wdGlvbiBpbiBPcHRpb25zU3BlYyBpcyBhIHJlYWwgb3B0aW9uIGFzIG9wcG9zZWQgdG9cbiAqIGEgaGVhZGluZyBvciBjb2x1bW4gYnJlYWtcbiAqL1xuZnVuY3Rpb24gaXNSZWFsT3B0aW9uIChvcHRpb24gOiBPcHRpb25zU3BlY1swXSkgOiBvcHRpb24gaXMgUmVhbE9wdGlvbiB7XG4gIHJldHVybiAob3B0aW9uIGFzIE9wdGlvbkkpLmlkICE9PSB1bmRlZmluZWRcbn1cblxuY29uc3QgZGVtb1NwZWMgOiBPcHRpb25zU3BlYyA9IFtcbiAge1xuICAgIHRpdGxlOiAnRGlmZmljdWx0eScsXG4gICAgaWQ6ICdkaWZmaWN1bHR5JyxcbiAgICB0eXBlOiAnaW50JyxcbiAgICBtaW46IDEsXG4gICAgbWF4OiAxMCxcbiAgICBkZWZhdWx0OiA1XG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1R5cGUnLFxuICAgIGlkOiAndHlwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1leGNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdSZWN0YW5nbGUnLCBpZDogJ3JlY3RhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdUcmlhbmdsZScsIGlkOiAndHJpYW5nbGUnIH0sXG4gICAgICB7IHRpdGxlOiAnU3F1b3ZhbCcsIGlkOiAnc3F1b3ZhbCcgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogJ3JlY3RhbmdsZSdcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnQSBoZWFkaW5nJyxcbiAgICB0eXBlOiAnaGVhZGluZydcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnU2hhcGUnLFxuICAgIGlkOiAnc2hhcGUnLFxuICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICB7IHRpdGxlOiAnUmVjdGFuZ2xlIHNoYXBlIHRoaW5nJywgaWQ6ICdyZWN0YW5nbGUnIH0sXG4gICAgICB7IHRpdGxlOiAnVHJpYW5nbGUgc2hhcGUgdGhpbmcnLCBpZDogJ3RyaWFuZ2xlJyB9LFxuICAgICAgeyB0aXRsZTogJ1NxdW92YWwgc2hhcGUgbG9uZycsIGlkOiAnc3F1b3ZhbCcgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogWydyZWN0YW5nbGUnLCAnc3F1b3ZhbCddLFxuICAgIHZlcnRpY2FsOiB0cnVlIC8vIGxheW91dCB2ZXJ0aWNhbGx5LCByYXRoZXIgdGhhbiBob3Jpem9udGFsbHlcbiAgfSxcbiAge1xuICAgIHR5cGU6ICdjb2x1bW4tYnJlYWsnXG4gIH0sXG4gIHtcbiAgICB0eXBlOiAnaGVhZGluZycsXG4gICAgdGl0bGU6ICdBIG5ldyBjb2x1bW4nXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ0RvIHNvbWV0aGluZycsXG4gICAgaWQ6ICdzb21ldGhpbmcnLFxuICAgIHR5cGU6ICdib29sJyxcbiAgICBkZWZhdWx0OiB0cnVlLFxuICAgIHN3YXBMYWJlbDogdHJ1ZSAvLyBwdXQgY29udHJvbCBiZWZvcmUgbGFiZWxcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnT3B0aW9ucyBmb3IgcmVjdGFuZ2xlcycsXG4gICAgaWQ6ICdyZWN0YW5nbGUtb3B0aW9ucycsXG4gICAgdHlwZTogJ3N1Ym9wdGlvbnMnLFxuICAgIG9wdGlvbnNTcGVjOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnTWluaW11bSB4JyxcbiAgICAgICAgaWQ6ICdtaW5YJyxcbiAgICAgICAgdHlwZTogJ2ludCcsXG4gICAgICAgIG1pbjogMCxcbiAgICAgICAgbWF4OiAxMCxcbiAgICAgICAgZGVmYXVsdDogMlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdNYXhpbXVtIHgnLFxuICAgICAgICBpZDogJ21heFgnLFxuICAgICAgICB0eXBlOiAnaW50JyxcbiAgICAgICAgbWluOiAwLFxuICAgICAgICBtYXg6IDEwLFxuICAgICAgICBkZWZhdWx0OiA0XG4gICAgICB9XG4gICAgXVxuICB9XG5dXG5cbmNvbnN0IGRlbW9UZW1wbGF0ZSA6IHN0cmluZyA9XG4nPGxpPnt7ZGlmZmljdWx0eS5yZW5kZXJlZH19PC9saT5cXG4nICsgLy8gSW5zZXJ0cyBmdWxsICdkaWZmaXVsdHknIG9wdGlvbiBhcyBiZWZvcmVcbic8bGk+PGI+e3t0eXBlLnRpdGxlfX08L2I+IFxcbicgKyAvLyBqdXN0IHRoZSB0aXRsZVxuJzxsaT57e3R5cGUuaW5wdXR9fSBcXG4nICsgLy8gdGhlIGlucHV0IGVsZW1lbnRcbid7e3R5cGUuc2VsZWN0T3B0aW9uc1JlbmRlcmVkQWxsfX08L2xpPicgKyAvLyBUaGUgb3B0aW9ucywgcmVkZXJlZCB1c3VhbGx5XG4nPGxpPjx1bD57eyMgdHlwZS5zZWxlY3RPcHRpb25zfX0nICsgLy8gSW5kaXZpZHVhbCBzZWxlY3Qgb3B0aW9ucywgcmVuZGVyZWRcbiAgJzxsaT4ge3tyZW5kZXJlZH19IDwvbGk+JyArIC8vIFRoZSB1c3VhbCByZW5kZXJlZCBvcHRpb25cbid7ey8gdHlwZS5zZWxlY3RPcHRpb25zfX08L3VsPidcblxuY29uc3QgZXhhbXBsZVRlbXBsYXRlID0gLy8gQW5vdGhlciBleGFtcGxlLCB3aXRoIGZld2VyIGNvbW1lbnRzXG5gPGRpdiBjbGFzcyA9IFwib3B0aW9ucy1jb2x1bW5cIj5cbiAgPHVsIGNsYXNzPVwib3B0aW9ucy1saXN0XCI+XG4gICAgPGxpPiA8Yj5Tb21lIG9wdGlvbnMgPC9iPiA8L2xpPlxuICAgIDxsaT4ge3tkaWZmaWN1bHR5LnJlbmRlcmVkfX0gPC9saT5cbiAgICA8bGkgc3R5bGU9XCJkaXNwbGF5OmJsb2NrXCI+IHt7c2ltcGxlLnRpdGxlfX0ge3tzaW1wbGUuaW5wdXR9fVxuICAgICAge3sjc2ltcGxlTWluWH19XG5gXG4iLCJleHBvcnQgZGVmYXVsdCBhYnN0cmFjdCBjbGFzcyBRdWVzdGlvbiB7XG4gIERPTTogSFRNTEVsZW1lbnRcbiAgYW5zd2VyZWQ6IGJvb2xlYW5cblxuICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgdGhpcy5ET00gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgIHRoaXMuRE9NLmNsYXNzTmFtZSA9ICdxdWVzdGlvbi1kaXYnXG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gIH1cblxuICBnZXRET00gKCkgOiBIVE1MRWxlbWVudCB7XG4gICAgcmV0dXJuIHRoaXMuRE9NXG4gIH1cblxuICBhYnN0cmFjdCByZW5kZXIgKCkgOiB2b2lkXG5cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQge1xuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gIH1cblxuICB0b2dnbGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICBpZiAodGhpcy5hbnN3ZXJlZCkge1xuICAgICAgdGhpcy5oaWRlQW5zd2VyKClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaG93QW5zd2VyKClcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgLy8gU2hvdWxkIGJlIG92ZXJyaWRkZW5cbiAgICByZXR1cm4gJydcbiAgfVxufVxuIiwiLyogZ2xvYmFsIGthdGV4ICovXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRleHRRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKClcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYSdcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIC8vIHN0b3JlIHRoZSBsYWJlbCBmb3IgZnV0dXJlIHJlbmRlcmluZ1xuICAgIHRoaXMubGFiZWwgPSBzZXR0aW5ncy5sYWJlbFxuXG4gICAgLy8gRHVtbXkgcXVlc3Rpb24gZ2VuZXJhdGluZyAtIHN1YmNsYXNzZXMgZG8gc29tZXRoaW5nIHN1YnN0YW50aWFsIGhlcmVcbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnMisyJ1xuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPTUnXG5cbiAgICAvLyBNYWtlIHRoZSBET00gdHJlZSBmb3IgdGhlIGVsZW1lbnRcbiAgICB0aGlzLnF1ZXN0aW9ucCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKVxuICAgIHRoaXMuYW5zd2VycCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKVxuXG4gICAgdGhpcy5xdWVzdGlvbnAuY2xhc3NOYW1lID0gJ3F1ZXN0aW9uJ1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc05hbWUgPSAnYW5zd2VyJ1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuXG4gICAgdGhpcy5ET00uYXBwZW5kQ2hpbGQodGhpcy5xdWVzdGlvbnApXG4gICAgdGhpcy5ET00uYXBwZW5kQ2hpbGQodGhpcy5hbnN3ZXJwKVxuXG4gICAgLy8gc3ViY2xhc3NlcyBzaG91bGQgZ2VuZXJhdGUgcXVlc3Rpb25MYVRlWCBhbmQgYW5zd2VyTGFUZVgsXG4gICAgLy8gLnJlbmRlcigpIHdpbGwgYmUgY2FsbGVkIGJ5IHVzZXJcbiAgfVxuXG4gIHJlbmRlciAoKSB7XG4gICAgLy8gdXBkYXRlIHRoZSBET00gaXRlbSB3aXRoIHF1ZXN0aW9uTGFUZVggYW5kIGFuc3dlckxhVGVYXG4gICAgdmFyIHFudW0gPSB0aGlzLmxhYmVsXG4gICAgICA/ICdcXFxcdGV4dHsnICsgdGhpcy5sYWJlbCArICcpIH0nXG4gICAgICA6ICcnXG4gICAga2F0ZXgucmVuZGVyKHFudW0gKyB0aGlzLnF1ZXN0aW9uTGFUZVgsIHRoaXMucXVlc3Rpb25wLCB7IGRpc3BsYXlNb2RlOiB0cnVlLCBzdHJpY3Q6ICdpZ25vcmUnIH0pXG4gICAga2F0ZXgucmVuZGVyKHRoaXMuYW5zd2VyTGFUZVgsIHRoaXMuYW5zd2VycCwgeyBkaXNwbGF5TW9kZTogdHJ1ZSB9KVxuICB9XG5cbiAgZ2V0RE9NICgpIHtcbiAgICByZXR1cm4gdGhpcy5ET01cbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkge1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIHtcbiAgICB0aGlzLmFuc3dlcnAuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxufVxuIiwiaW1wb3J0IHsgcmFuZEJldHdlZW4sIGdjZCB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcblxuLyogTWFpbiBxdWVzdGlvbiBjbGFzcy4gVGhpcyB3aWxsIGJlIHNwdW4gb2ZmIGludG8gZGlmZmVyZW50IGZpbGUgYW5kIGdlbmVyYWxpc2VkICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBbGdlYnJhaWNGcmFjdGlvblEgZXh0ZW5kcyBUZXh0USB7XG4gIC8vICdleHRlbmRzJyBRdWVzdGlvbiwgYnV0IG5vdGhpbmcgdG8gYWN0dWFsbHkgZXh0ZW5kXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogMlxuICAgIH1cblxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG4gICAgY29uc3QgZGlmZmljdWx0eSA9IHNldHRpbmdzLmRpZmZpY3VsdHlcblxuICAgIC8vIGxvZ2ljIGZvciBnZW5lcmF0aW5nIHRoZSBxdWVzdGlvbiBhbmQgYW5zd2VyIHN0YXJ0cyBoZXJlXG4gICAgdmFyIGEsIGIsIGMsIGQsIGUsIGYgLy8gKGF4K2IpKGV4K2YpLyhjeCtkKShleCtmKSA9IChweF4yK3F4K3IpLyh0eF4yK3V4K3YpXG4gICAgdmFyIHAsIHEsIHIsIHQsIHUsIHZcbiAgICB2YXIgbWluQ29lZmYsIG1heENvZWZmLCBtaW5Db25zdCwgbWF4Q29uc3RcblxuICAgIHN3aXRjaCAoZGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMTsgbWluQ29uc3QgPSAxOyBtYXhDb25zdCA9IDZcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgbWluQ29lZmYgPSAxOyBtYXhDb2VmZiA9IDE7IG1pbkNvbnN0ID0gLTY7IG1heENvbnN0ID0gNlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAzOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMzsgbWluQ29uc3QgPSAtNTsgbWF4Q29uc3QgPSA1XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ6XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBtaW5Db2VmZiA9IC0zOyBtYXhDb2VmZiA9IDM7IG1pbkNvbnN0ID0gLTU7IG1heENvbnN0ID0gNVxuICAgICAgICBicmVha1xuICAgIH1cblxuICAgIC8vIFBpY2sgc29tZSBjb2VmZmljaWVudHNcbiAgICB3aGlsZSAoXG4gICAgICAoKCFhICYmICFiKSB8fCAoIWMgJiYgIWQpIHx8ICghZSAmJiAhZikpIHx8IC8vIHJldHJ5IGlmIGFueSBleHByZXNzaW9uIGlzIDBcbiAgICAgIGNhblNpbXBsaWZ5KGEsIGIsIGMsIGQpIC8vIHJldHJ5IGlmIHRoZXJlJ3MgYSBjb21tb24gbnVtZXJpY2FsIGZhY3RvclxuICAgICkge1xuICAgICAgYSA9IHJhbmRCZXR3ZWVuKG1pbkNvZWZmLCBtYXhDb2VmZilcbiAgICAgIGMgPSByYW5kQmV0d2VlbihtaW5Db2VmZiwgbWF4Q29lZmYpXG4gICAgICBlID0gcmFuZEJldHdlZW4obWluQ29lZmYsIG1heENvZWZmKVxuICAgICAgYiA9IHJhbmRCZXR3ZWVuKG1pbkNvbnN0LCBtYXhDb25zdClcbiAgICAgIGQgPSByYW5kQmV0d2VlbihtaW5Db25zdCwgbWF4Q29uc3QpXG4gICAgICBmID0gcmFuZEJldHdlZW4obWluQ29uc3QsIG1heENvbnN0KVxuICAgIH1cblxuICAgIC8vIGlmIHRoZSBkZW5vbWluYXRvciBpcyBuZWdhdGl2ZSBmb3IgZWFjaCB0ZXJtLCB0aGVuIG1ha2UgdGhlIG51bWVyYXRvciBuZWdhdGl2ZSBpbnN0ZWFkXG4gICAgaWYgKGMgPD0gMCAmJiBkIDw9IDApIHtcbiAgICAgIGMgPSAtY1xuICAgICAgZCA9IC1kXG4gICAgICBhID0gLWFcbiAgICAgIGIgPSAtYlxuICAgIH1cblxuICAgIHAgPSBhICogZTsgcSA9IGEgKiBmICsgYiAqIGU7IHIgPSBiICogZlxuICAgIHQgPSBjICogZTsgdSA9IGMgKiBmICsgZCAqIGU7IHYgPSBkICogZlxuXG4gICAgLy8gTm93IHB1dCB0aGUgcXVlc3Rpb24gYW5kIGFuc3dlciBpbiBhIG5pY2UgZm9ybWF0IGludG8gcXVlc3Rpb25MYVRlWCBhbmQgYW5zd2VyTGFUZVhcbiAgICBjb25zdCBxdWVzdGlvbiA9IGBcXFxcZnJhY3ske3F1YWRyYXRpY1N0cmluZyhwLCBxLCByKX19eyR7cXVhZHJhdGljU3RyaW5nKHQsIHUsIHYpfX1gXG4gICAgaWYgKHNldHRpbmdzLnVzZUNvbW1hbmRXb3JkKSB7XG4gICAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnXFxcXHRleHR7U2ltcGxpZnl9ICcgKyBxdWVzdGlvblxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSBxdWVzdGlvblxuICAgIH1cbiAgICB0aGlzLmFuc3dlckxhVGVYID1cbiAgICAgIChjID09PSAwICYmIGQgPT09IDEpID8gcXVhZHJhdGljU3RyaW5nKDAsIGEsIGIpXG4gICAgICAgIDogYFxcXFxmcmFjeyR7cXVhZHJhdGljU3RyaW5nKDAsIGEsIGIpfX17JHtxdWFkcmF0aWNTdHJpbmcoMCwgYywgZCl9fWBcblxuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPSAnICsgdGhpcy5hbnN3ZXJMYVRlWFxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdTaW1wbGlmeSdcbiAgfVxufVxuXG4vKiBVdGlsaXR5IGZ1bmN0aW9uc1xuICogQXQgc29tZSBwb2ludCwgSSdsbCBtb3ZlIHNvbWUgb2YgdGhlc2UgaW50byBhIGdlbmVyYWwgdXRpbGl0aWVzIG1vZHVsZVxuICogYnV0IHRoaXMgd2lsbCBkbyBmb3Igbm93XG4gKi9cblxuLy8gVE9ETyBJIGhhdmUgcXVhZHJhdGljU3RyaW5nIGhlcmUgYW5kIGFsc28gYSBQb2x5bm9taWFsIGNsYXNzLiBXaGF0IGlzIGJlaW5nIHJlcGxpY2F0ZWQ/wqdcbmZ1bmN0aW9uIHF1YWRyYXRpY1N0cmluZyAoYSwgYiwgYykge1xuICBpZiAoYSA9PT0gMCAmJiBiID09PSAwICYmIGMgPT09IDApIHJldHVybiAnMCdcblxuICB2YXIgeDJzdHJpbmcgPVxuICAgIGEgPT09IDAgPyAnJ1xuICAgICAgOiBhID09PSAxID8gJ3heMidcbiAgICAgICAgOiBhID09PSAtMSA/ICcteF4yJ1xuICAgICAgICAgIDogYSArICd4XjInXG5cbiAgdmFyIHhzaWduID1cbiAgICBiIDwgMCA/ICctJ1xuICAgICAgOiAoYSA9PT0gMCB8fCBiID09PSAwKSA/ICcnXG4gICAgICAgIDogJysnXG5cbiAgdmFyIHhzdHJpbmcgPVxuICAgIGIgPT09IDAgPyAnJ1xuICAgICAgOiAoYiA9PT0gMSB8fCBiID09PSAtMSkgPyAneCdcbiAgICAgICAgOiBNYXRoLmFicyhiKSArICd4J1xuXG4gIHZhciBjb25zdHNpZ24gPVxuICAgIGMgPCAwID8gJy0nXG4gICAgICA6ICgoYSA9PT0gMCAmJiBiID09PSAwKSB8fCBjID09PSAwKSA/ICcnXG4gICAgICAgIDogJysnXG5cbiAgdmFyIGNvbnN0c3RyaW5nID1cbiAgICBjID09PSAwID8gJycgOiBNYXRoLmFicyhjKVxuXG4gIHJldHVybiB4MnN0cmluZyArIHhzaWduICsgeHN0cmluZyArIGNvbnN0c2lnbiArIGNvbnN0c3RyaW5nXG59XG5cbmZ1bmN0aW9uIGNhblNpbXBsaWZ5IChhMSwgYjEsIGEyLCBiMikge1xuICAvLyBjYW4gKGExeCtiMSkvKGEyeCtiMikgYmUgc2ltcGxpZmllZD9cbiAgLy9cbiAgLy8gRmlyc3QsIHRha2Ugb3V0IGdjZCwgYW5kIHdyaXRlIGFzIGMxKGExeCtiMSkgZXRjXG5cbiAgdmFyIGMxID0gZ2NkKGExLCBiMSlcbiAgYTEgPSBhMSAvIGMxXG4gIGIxID0gYjEgLyBjMVxuXG4gIHZhciBjMiA9IGdjZChhMiwgYjIpXG4gIGEyID0gYTIgLyBjMlxuICBiMiA9IGIyIC8gYzJcblxuICB2YXIgcmVzdWx0ID0gZmFsc2VcblxuICBpZiAoZ2NkKGMxLCBjMikgPiAxIHx8IChhMSA9PT0gYTIgJiYgYjEgPT09IGIyKSkge1xuICAgIHJlc3VsdCA9IHRydWVcbiAgfVxuXG4gIHJldHVybiByZXN1bHRcbn1cbiIsImltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCB7IHJhbmRCZXR3ZWVuIH0gZnJvbSAndXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJbnRlZ2VyQWRkUSBleHRlbmRzIFRleHRRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiA1LFxuICAgICAgbGFiZWw6ICdhJ1xuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyBUaGlzIGlzIGp1c3QgYSBkZW1vIHF1ZXN0aW9uIHR5cGUgZm9yIG5vdywgc28gbm90IHByb2Nlc3NpbmcgZGlmZmljdWx0eVxuICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbigxMCwgMTAwMClcbiAgICBjb25zdCBiID0gcmFuZEJldHdlZW4oMTAsIDEwMDApXG4gICAgY29uc3Qgc3VtID0gYSArIGJcblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9IGEgKyAnICsgJyArIGJcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJz0gJyArIHN1bVxuXG4gICAgdGhpcy5yZW5kZXIoKVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdFdmFsdWF0ZSdcbiAgfVxufVxuIiwiaW1wb3J0IFF1ZXN0aW9uIGZyb20gJ1F1ZXN0aW9uL1F1ZXN0aW9uJ1xuaW1wb3J0IHsgY3JlYXRlRWxlbSwgcmVwZWxFbGVtZW50cyB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuL1ZpZXdPcHRpb25zJ1xuZGVjbGFyZSBjb25zdCBrYXRleCA6IHtyZW5kZXIgOiAoc3RyaW5nOiBzdHJpbmcsIGVsZW1lbnQ6IEhUTUxFbGVtZW50KSA9PiB2b2lkfVxuXG4vKiBHcmFwaGljUURhdGEgY2FuIGFsbCBiZSB2ZXJ5IGRpZmZlcmVudCwgc28gaW50ZXJmYWNlIGlzIGVtcHR5XG4gKiBIZXJlIGZvciBjb2RlIGRvY3VtZW50YXRpb24gcmF0aGVyIHRoYW4gdHlwZSBzYWZldHkgKHdoaWNoIGlzbid0IHByb3ZpZGVkKSAqL1xuXG4vKiBlc2xpbnQtZGlzYWJsZSAqL1xuZXhwb3J0IGludGVyZmFjZSBHcmFwaGljUURhdGEge1xufVxuLyogZXNsaW50LWVuYWJsZSAqL1xuXG4vKiBOb3Qgd29ydGggdGhlIGhhc3NseSB0cnlpbmcgdG8gZ2V0IGludGVyZmFjZXMgZm9yIHN0YXRpYyBtZXRob2RzXG4gKlxuICogZXhwb3J0IGludGVyZmFjZSBHcmFwaGljUURhdGFDb25zdHJ1Y3RvciB7XG4gKiAgIG5ldyguLi5hcmdzIDogdW5rbm93bltdKTogR3JhcGhpY1FEYXRhXG4gKiAgIHJhbmRvbShvcHRpb25zOiB1bmtub3duKSA6IEdyYXBoaWNRRGF0YVxuICogfVxuKi9cblxuZXhwb3J0IGludGVyZmFjZSBMYWJlbCB7XG4gIHBvczogUG9pbnQsXG4gIHRleHRxOiBzdHJpbmcsXG4gIHRleHRhOiBzdHJpbmcsXG4gIHN0eWxlcTogc3RyaW5nLFxuICBzdHlsZWE6IHN0cmluZyxcbiAgdGV4dDogc3RyaW5nLFxuICBzdHlsZTogc3RyaW5nXG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBHcmFwaGljUVZpZXcge1xuICBET006IEhUTUxFbGVtZW50XG4gIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnRcbiAgd2lkdGg6IG51bWJlclxuICBoZWlnaHQ6IG51bWJlclxuICBkYXRhOiBHcmFwaGljUURhdGFcbiAgbGFiZWxzOiBMYWJlbFtdXG4gIHJvdGF0aW9uPzogbnVtYmVyXG5cbiAgY29uc3RydWN0b3IgKGRhdGEgOiBHcmFwaGljUURhdGEsIHZpZXdPcHRpb25zIDogVmlld09wdGlvbnMpIHtcbiAgICB2aWV3T3B0aW9ucy53aWR0aCA9IHZpZXdPcHRpb25zLndpZHRoID8/IDMwMFxuICAgIHZpZXdPcHRpb25zLmhlaWdodCA9IHZpZXdPcHRpb25zLmhlaWdodCA/PyAzMDBcblxuICAgIHRoaXMud2lkdGggPSB2aWV3T3B0aW9ucy53aWR0aFxuICAgIHRoaXMuaGVpZ2h0ID0gdmlld09wdGlvbnMuaGVpZ2h0IC8vIG9ubHkgdGhpbmdzIEkgbmVlZCBmcm9tIHRoZSBvcHRpb25zLCBnZW5lcmFsbHk/XG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIHRoaXMucm90YXRpb24gPSB2aWV3T3B0aW9ucy5yb3RhdGlvblxuXG4gICAgdGhpcy5sYWJlbHMgPSBbXSAvLyBsYWJlbHMgb24gZGlhZ3JhbVxuXG4gICAgLy8gRE9NIGVsZW1lbnRzXG4gICAgdGhpcy5ET00gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tZGl2JylcbiAgICB0aGlzLmNhbnZhcyA9IGNyZWF0ZUVsZW0oJ2NhbnZhcycsICdxdWVzdGlvbi1jYW52YXMnLCB0aGlzLkRPTSkgYXMgSFRNTENhbnZhc0VsZW1lbnRcbiAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMud2lkdGhcbiAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodFxuICB9XG5cbiAgZ2V0RE9NICgpIDogSFRNTEVsZW1lbnQge1xuICAgIHJldHVybiB0aGlzLkRPTVxuICB9XG5cbiAgYWJzdHJhY3QgcmVuZGVyICgpIDogdm9pZFxuXG4gIHJlbmRlckxhYmVscyAobnVkZ2U/IDogYm9vbGVhbiwgcmVwZWw6IGJvb2xlYW4gPSB0cnVlKSA6IHZvaWQge1xuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuRE9NXG5cbiAgICAvLyByZW1vdmUgYW55IGV4aXN0aW5nIGxhYmVsc1xuICAgIGNvbnN0IG9sZExhYmVscyA9IGNvbnRhaW5lci5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdsYWJlbCcpXG4gICAgd2hpbGUgKG9sZExhYmVscy5sZW5ndGggPiAwKSB7XG4gICAgICBvbGRMYWJlbHNbMF0ucmVtb3ZlKClcbiAgICB9XG5cbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgY29uc3QgbGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgICAgY29uc3QgaW5uZXJsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgICBsYWJlbC5jbGFzc0xpc3QuYWRkKCdsYWJlbCcpXG4gICAgICBsYWJlbC5jbGFzc05hbWUgKz0gJyAnICsgbC5zdHlsZSAvLyB1c2luZyBjbGFzc05hbWUgb3ZlciBjbGFzc0xpc3Qgc2luY2UgbC5zdHlsZSBpcyBzcGFjZS1kZWxpbWl0ZWQgbGlzdCBvZiBjbGFzc2VzXG4gICAgICBsYWJlbC5zdHlsZS5sZWZ0ID0gbC5wb3MueCArICdweCdcbiAgICAgIGxhYmVsLnN0eWxlLnRvcCA9IGwucG9zLnkgKyAncHgnXG5cbiAgICAgIGthdGV4LnJlbmRlcihsLnRleHQsIGlubmVybGFiZWwpXG4gICAgICBsYWJlbC5hcHBlbmRDaGlsZChpbm5lcmxhYmVsKVxuICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGxhYmVsKVxuXG4gICAgICAvLyByZW1vdmUgc3BhY2UgaWYgdGhlIGlubmVyIGxhYmVsIGlzIHRvbyBiaWdcbiAgICAgIGlmIChpbm5lcmxhYmVsLm9mZnNldFdpZHRoIC8gaW5uZXJsYWJlbC5vZmZzZXRIZWlnaHQgPiAyKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coYHJlbW92ZWQgc3BhY2UgaW4gJHtsLnRleHR9YClcbiAgICAgICAgY29uc3QgbmV3bGFiZWx0ZXh0ID0gbC50ZXh0LnJlcGxhY2UoL1xcKy8sICdcXFxcIStcXFxcIScpLnJlcGxhY2UoLy0vLCAnXFxcXCEtXFxcXCEnKVxuICAgICAgICBrYXRleC5yZW5kZXIobmV3bGFiZWx0ZXh0LCBpbm5lcmxhYmVsKVxuICAgICAgfVxuXG4gICAgICAvLyBJIGRvbid0IHVuZGVyc3RhbmQgdGhpcyBhZGp1c3RtZW50LiBJIHRoaW5rIGl0IG1pZ2h0IGJlIG5lZWRlZCBpbiBhcml0aG1hZ29ucywgYnV0IGl0IG1ha2VzXG4gICAgICAvLyBvdGhlcnMgZ28gZnVubnkuXG5cbiAgICAgIGlmIChudWRnZSkge1xuICAgICAgICBjb25zdCBsd2lkdGggPSBsYWJlbC5vZmZzZXRXaWR0aFxuICAgICAgICBpZiAobC5wb3MueCA8IHRoaXMuY2FudmFzLndpZHRoIC8gMiAtIDUgJiYgbC5wb3MueCArIGx3aWR0aCAvIDIgPiB0aGlzLmNhbnZhcy53aWR0aCAvIDIpIHtcbiAgICAgICAgICBsYWJlbC5zdHlsZS5sZWZ0ID0gKHRoaXMuY2FudmFzLndpZHRoIC8gMiAtIGx3aWR0aCAtIDMpICsgJ3B4J1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBudWRnZWQgJyR7bC50ZXh0fSdgKVxuICAgICAgICB9XG4gICAgICAgIGlmIChsLnBvcy54ID4gdGhpcy5jYW52YXMud2lkdGggLyAyICsgNSAmJiBsLnBvcy54IC0gbHdpZHRoIC8gMiA8IHRoaXMuY2FudmFzLndpZHRoIC8gMikge1xuICAgICAgICAgIGxhYmVsLnN0eWxlLmxlZnQgPSAodGhpcy5jYW52YXMud2lkdGggLyAyICsgMykgKyAncHgnXG4gICAgICAgICAgY29uc29sZS5sb2coYG51ZGdlZCAnJHtsLnRleHR9J2ApXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy9yZXBlbCBpZiBnaXZlblxuICAgIGlmIChyZXBlbCkge1xuICAgIGNvbnN0IGxhYmVsRWxlbWVudHMgPSBbLi4udGhpcy5ET00uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnbGFiZWwnKV0gYXMgSFRNTEVsZW1lbnRbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGFiZWxFbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgZm9yIChsZXQgaiA9IGkrMTsgaiA8IGxhYmVsRWxlbWVudHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgcmVwZWxFbGVtZW50cyhsYWJlbEVsZW1lbnRzW2ldLGxhYmVsRWxlbWVudHNbal0pXG4gICAgICB9XG4gICAgfVxuICAgIH1cbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0YVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVhXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIC8vIFBvaW50IHRyYW5mb3JtYXRpb25zIG9mIGFsbCBwb2ludHNcblxuICBnZXQgYWxscG9pbnRzICgpIDogUG9pbnRbXSB7XG4gICAgcmV0dXJuIFtdXG4gIH1cblxuICBzY2FsZSAoc2YgOiBudW1iZXIpIDogdm9pZCB7XG4gICAgdGhpcy5hbGxwb2ludHMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgcC5zY2FsZShzZilcbiAgICB9KVxuICB9XG5cbiAgcm90YXRlIChhbmdsZSA6IG51bWJlcikgOiBudW1iZXIge1xuICAgIHRoaXMuYWxscG9pbnRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHAucm90YXRlKGFuZ2xlKVxuICAgIH0pXG4gICAgcmV0dXJuIGFuZ2xlXG4gIH1cblxuICB0cmFuc2xhdGUgKHggOiBudW1iZXIsIHkgOiBudW1iZXIpIDogdm9pZCB7XG4gICAgdGhpcy5hbGxwb2ludHMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgcC50cmFuc2xhdGUoeCwgeSlcbiAgICB9KVxuICB9XG5cbiAgcmFuZG9tUm90YXRlICgpIDogbnVtYmVyIHtcbiAgICBjb25zdCBhbmdsZSA9IDIgKiBNYXRoLlBJICogTWF0aC5yYW5kb20oKVxuICAgIHRoaXMucm90YXRlKGFuZ2xlKVxuICAgIHJldHVybiBhbmdsZVxuICB9XG5cbiAgLyoqXG4gICAqIFNjYWxlcyBhbGwgdGhlIHBvaW50cyB0byB3aXRoaW4gYSBnaXZlbiB3aWR0aCBhbmQgaGVpZ2h0LCBjZW50ZXJpbmcgdGhlIHJlc3VsdC4gUmV0dXJucyB0aGUgc2NhbGUgZmFjdG9yXG4gICAqIEBwYXJhbSB3aWR0aCBUaGUgd2lkdGggb2YgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSB0byBzY2FsZSB0b1xuICAgKiBAcGFyYW0gaGVpZ2h0IFRoZSBoZWlnaHQgb2YgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSB0byBzY2FsZSB0b1xuICAgKiBAcGFyYW0gbWFyZ2luIE1hcmdpbiB0byBsZWF2ZSBvdXRzaWRlIHRoZSByZWN0YW5nbGVcbiAgICogQHJldHVybnNcbiAgICovXG4gIHNjYWxlVG9GaXQgKHdpZHRoIDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgbWFyZ2luIDogbnVtYmVyKSA6IG51bWJlciB7XG4gICAgbGV0IHRvcExlZnQgOiBQb2ludCA9IFBvaW50Lm1pbih0aGlzLmFsbHBvaW50cylcbiAgICBsZXQgYm90dG9tUmlnaHQgOiBQb2ludCA9IFBvaW50Lm1heCh0aGlzLmFsbHBvaW50cylcbiAgICBjb25zdCB0b3RhbFdpZHRoIDogbnVtYmVyID0gYm90dG9tUmlnaHQueCAtIHRvcExlZnQueFxuICAgIGNvbnN0IHRvdGFsSGVpZ2h0IDogbnVtYmVyID0gYm90dG9tUmlnaHQueSAtIHRvcExlZnQueVxuICAgIGNvbnN0IHNmID0gTWF0aC5taW4oKHdpZHRoIC0gbWFyZ2luKSAvIHRvdGFsV2lkdGgsIChoZWlnaHQgLSBtYXJnaW4pIC8gdG90YWxIZWlnaHQpXG4gICAgdGhpcy5zY2FsZShzZilcblxuICAgIC8vIGNlbnRyZVxuICAgIHRvcExlZnQgPSBQb2ludC5taW4odGhpcy5hbGxwb2ludHMpXG4gICAgYm90dG9tUmlnaHQgPSBQb2ludC5tYXgodGhpcy5hbGxwb2ludHMpXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbih0b3BMZWZ0LCBib3R0b21SaWdodClcbiAgICB0aGlzLnRyYW5zbGF0ZSh3aWR0aCAvIDIgLSBjZW50ZXIueCwgaGVpZ2h0IC8gMiAtIGNlbnRlci55KSAvLyBjZW50cmVcblxuICAgIHJldHVybiBzZlxuICB9XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBHcmFwaGljUSBleHRlbmRzIFF1ZXN0aW9uIHtcbiAgZGF0YTogR3JhcGhpY1FEYXRhXG4gIHZpZXc6IEdyYXBoaWNRVmlld1xuXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBHcmFwaGljUURhdGEsIHZpZXc6IEdyYXBoaWNRVmlldykgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgIHN1cGVyKCkgLy8gdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIHRoaXMudmlldyA9IHZpZXdcbiAgICB0aGlzLkRPTSA9IHRoaXMudmlldy5ET01cblxuICAgIC8qIFRoZXNlIGFyZSBndWFyYW50ZWVkIHRvIGJlIG92ZXJyaWRkZW4sIHNvIG5vIHBvaW50IGluaXRpYWxpemluZyBoZXJlXG4gICAgICpcbiAgICAgKiAgdGhpcy5kYXRhID0gbmV3IEdyYXBoaWNRRGF0YShvcHRpb25zKVxuICAgICAqICB0aGlzLnZpZXcgPSBuZXcgR3JhcGhpY1FWaWV3KHRoaXMuZGF0YSwgb3B0aW9ucylcbiAgICAgKlxuICAgICAqL1xuICB9XG5cbiAgLyogTmVlZCB0byByZWZhY3RvciBzdWJjbGFzc2VzIHRvIGRvIHRoaXM6XG4gICAqIGNvbnN0cnVjdG9yIChkYXRhLCB2aWV3KSB7XG4gICAqICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICogICAgdGhpcy52aWV3ID0gdmlld1xuICAgKiB9XG4gICAqXG4gICAqIHN0YXRpYyByYW5kb20ob3B0aW9ucykge1xuICAgKiAgLy8gYW4gYXR0ZW1wdCBhdCBoYXZpbmcgYWJzdHJhY3Qgc3RhdGljIG1ldGhvZHMsIGFsYmVpdCBydW50aW1lIGVycm9yXG4gICAqICB0aHJvdyBuZXcgRXJyb3IoXCJgcmFuZG9tKClgIG11c3QgYmUgb3ZlcnJpZGRlbiBpbiBzdWJjbGFzcyBcIiArIHRoaXMubmFtZSlcbiAgICogfVxuICAgKlxuICAgKiB0eXBpY2FsIGltcGxlbWVudGF0aW9uOlxuICAgKiBzdGF0aWMgcmFuZG9tKG9wdGlvbnMpIHtcbiAgICogIGNvbnN0IGRhdGEgPSBuZXcgRGVyaXZlZFFEYXRhKG9wdGlvbnMpXG4gICAqICBjb25zdCB2aWV3ID0gbmV3IERlcml2ZWRRVmlldyhvcHRpb25zKVxuICAgKiAgcmV0dXJuIG5ldyBEZXJpdmVkUURhdGEoZGF0YSx2aWV3KVxuICAgKiB9XG4gICAqXG4gICAqL1xuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHsgcmV0dXJuIHRoaXMudmlldy5nZXRET00oKSB9XG5cbiAgcmVuZGVyICgpIDogdm9pZCB7IHRoaXMudmlldy5yZW5kZXIoKSB9XG5cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQge1xuICAgIHN1cGVyLnNob3dBbnN3ZXIoKVxuICAgIHRoaXMudmlldy5zaG93QW5zd2VyKClcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICBzdXBlci5oaWRlQW5zd2VyKClcbiAgICB0aGlzLnZpZXcuaGlkZUFuc3dlcigpXG4gIH1cbn1cbiIsImltcG9ydCAqIGFzIGNvbW1vbmpzSGVscGVycyBmcm9tICdcdTAwMDBjb21tb25qc0hlbHBlcnMuanMnXG5cbnZhciBmcmFjdGlvbiA9IGNvbW1vbmpzSGVscGVycy5jcmVhdGVDb21tb25qc01vZHVsZShmdW5jdGlvbiAobW9kdWxlLCBleHBvcnRzKSB7XG4vKipcbiAqIEBsaWNlbnNlIEZyYWN0aW9uLmpzIHY0LjAuOSAwOS8wOS8yMDE1XG4gKiBodHRwOi8vd3d3Lnhhcmcub3JnLzIwMTQvMDMvcmF0aW9uYWwtbnVtYmVycy1pbi1qYXZhc2NyaXB0L1xuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSwgUm9iZXJ0IEVpc2VsZSAocm9iZXJ0QHhhcmcub3JnKVxuICogRHVhbCBsaWNlbnNlZCB1bmRlciB0aGUgTUlUIG9yIEdQTCBWZXJzaW9uIDIgbGljZW5zZXMuXG4gKiovXG5cbiAgLyoqXG4gKlxuICogVGhpcyBjbGFzcyBvZmZlcnMgdGhlIHBvc3NpYmlsaXR5IHRvIGNhbGN1bGF0ZSBmcmFjdGlvbnMuXG4gKiBZb3UgY2FuIHBhc3MgYSBmcmFjdGlvbiBpbiBkaWZmZXJlbnQgZm9ybWF0cy4gRWl0aGVyIGFzIGFycmF5LCBhcyBkb3VibGUsIGFzIHN0cmluZyBvciBhcyBhbiBpbnRlZ2VyLlxuICpcbiAqIEFycmF5L09iamVjdCBmb3JtXG4gKiBbIDAgPT4gPG5vbWluYXRvcj4sIDEgPT4gPGRlbm9taW5hdG9yPiBdXG4gKiBbIG4gPT4gPG5vbWluYXRvcj4sIGQgPT4gPGRlbm9taW5hdG9yPiBdXG4gKlxuICogSW50ZWdlciBmb3JtXG4gKiAtIFNpbmdsZSBpbnRlZ2VyIHZhbHVlXG4gKlxuICogRG91YmxlIGZvcm1cbiAqIC0gU2luZ2xlIGRvdWJsZSB2YWx1ZVxuICpcbiAqIFN0cmluZyBmb3JtXG4gKiAxMjMuNDU2IC0gYSBzaW1wbGUgZG91YmxlXG4gKiAxMjMvNDU2IC0gYSBzdHJpbmcgZnJhY3Rpb25cbiAqIDEyMy4nNDU2JyAtIGEgZG91YmxlIHdpdGggcmVwZWF0aW5nIGRlY2ltYWwgcGxhY2VzXG4gKiAxMjMuKDQ1NikgLSBzeW5vbnltXG4gKiAxMjMuNDUnNicgLSBhIGRvdWJsZSB3aXRoIHJlcGVhdGluZyBsYXN0IHBsYWNlXG4gKiAxMjMuNDUoNikgLSBzeW5vbnltXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiB2YXIgZiA9IG5ldyBGcmFjdGlvbihcIjkuNCczMSdcIik7XG4gKiBmLm11bChbLTQsIDNdKS5kaXYoNC45KTtcbiAqXG4gKi9cblxuICAoZnVuY3Rpb24gKHJvb3QpIHtcbiAgICAndXNlIHN0cmljdCdcblxuICAgIC8vIE1heGltdW0gc2VhcmNoIGRlcHRoIGZvciBjeWNsaWMgcmF0aW9uYWwgbnVtYmVycy4gMjAwMCBzaG91bGQgYmUgbW9yZSB0aGFuIGVub3VnaC5cbiAgICAvLyBFeGFtcGxlOiAxLzcgPSAwLigxNDI4NTcpIGhhcyA2IHJlcGVhdGluZyBkZWNpbWFsIHBsYWNlcy5cbiAgICAvLyBJZiBNQVhfQ1lDTEVfTEVOIGdldHMgcmVkdWNlZCwgbG9uZyBjeWNsZXMgd2lsbCBub3QgYmUgZGV0ZWN0ZWQgYW5kIHRvU3RyaW5nKCkgb25seSBnZXRzIHRoZSBmaXJzdCAxMCBkaWdpdHNcbiAgICB2YXIgTUFYX0NZQ0xFX0xFTiA9IDIwMDBcblxuICAgIC8vIFBhcnNlZCBkYXRhIHRvIGF2b2lkIGNhbGxpbmcgXCJuZXdcIiBhbGwgdGhlIHRpbWVcbiAgICB2YXIgUCA9IHtcbiAgICAgIHM6IDEsXG4gICAgICBuOiAwLFxuICAgICAgZDogMVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUVycm9yIChuYW1lKSB7XG4gICAgICBmdW5jdGlvbiBlcnJvckNvbnN0cnVjdG9yICgpIHtcbiAgICAgICAgdmFyIHRlbXAgPSBFcnJvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgICAgIHRlbXAubmFtZSA9IHRoaXMubmFtZSA9IG5hbWVcbiAgICAgICAgdGhpcy5zdGFjayA9IHRlbXAuc3RhY2tcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gdGVtcC5tZXNzYWdlXG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAqIEVycm9yIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICAgIGZ1bmN0aW9uIEludGVybWVkaWF0ZUluaGVyaXRvciAoKSB7fVxuICAgICAgSW50ZXJtZWRpYXRlSW5oZXJpdG9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZVxuICAgICAgZXJyb3JDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBuZXcgSW50ZXJtZWRpYXRlSW5oZXJpdG9yKClcblxuICAgICAgcmV0dXJuIGVycm9yQ29uc3RydWN0b3JcbiAgICB9XG5cbiAgICB2YXIgRGl2aXNpb25CeVplcm8gPSBGcmFjdGlvbi5EaXZpc2lvbkJ5WmVybyA9IGNyZWF0ZUVycm9yKCdEaXZpc2lvbkJ5WmVybycpXG4gICAgdmFyIEludmFsaWRQYXJhbWV0ZXIgPSBGcmFjdGlvbi5JbnZhbGlkUGFyYW1ldGVyID0gY3JlYXRlRXJyb3IoJ0ludmFsaWRQYXJhbWV0ZXInKVxuXG4gICAgZnVuY3Rpb24gYXNzaWduIChuLCBzKSB7XG4gICAgICBpZiAoaXNOYU4obiA9IHBhcnNlSW50KG4sIDEwKSkpIHtcbiAgICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKVxuICAgICAgfVxuICAgICAgcmV0dXJuIG4gKiBzXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdGhyb3dJbnZhbGlkUGFyYW0gKCkge1xuICAgICAgdGhyb3cgbmV3IEludmFsaWRQYXJhbWV0ZXIoKVxuICAgIH1cblxuICAgIHZhciBwYXJzZSA9IGZ1bmN0aW9uIChwMSwgcDIpIHtcbiAgICAgIHZhciBuID0gMDsgdmFyIGQgPSAxOyB2YXIgcyA9IDFcbiAgICAgIHZhciB2ID0gMDsgdmFyIHcgPSAwOyB2YXIgeCA9IDA7IHZhciB5ID0gMTsgdmFyIHogPSAxXG5cbiAgICAgIHZhciBBID0gMDsgdmFyIEIgPSAxXG4gICAgICB2YXIgQyA9IDE7IHZhciBEID0gMVxuXG4gICAgICB2YXIgTiA9IDEwMDAwMDAwXG4gICAgICB2YXIgTVxuXG4gICAgICBpZiAocDEgPT09IHVuZGVmaW5lZCB8fCBwMSA9PT0gbnVsbCkge1xuICAgICAgLyogdm9pZCAqL1xuICAgICAgfSBlbHNlIGlmIChwMiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG4gPSBwMVxuICAgICAgICBkID0gcDJcbiAgICAgICAgcyA9IG4gKiBkXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzd2l0Y2ggKHR5cGVvZiBwMSkge1xuICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAge1xuICAgICAgICAgICAgaWYgKCdkJyBpbiBwMSAmJiAnbicgaW4gcDEpIHtcbiAgICAgICAgICAgICAgbiA9IHAxLm5cbiAgICAgICAgICAgICAgZCA9IHAxLmRcbiAgICAgICAgICAgICAgaWYgKCdzJyBpbiBwMSkgeyBuICo9IHAxLnMgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICgwIGluIHAxKSB7XG4gICAgICAgICAgICAgIG4gPSBwMVswXVxuICAgICAgICAgICAgICBpZiAoMSBpbiBwMSkgeyBkID0gcDFbMV0gfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcyA9IG4gKiBkXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlmIChwMSA8IDApIHtcbiAgICAgICAgICAgICAgcyA9IHAxXG4gICAgICAgICAgICAgIHAxID0gLXAxXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwMSAlIDEgPT09IDApIHtcbiAgICAgICAgICAgICAgbiA9IHAxXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHAxID4gMCkgeyAvLyBjaGVjayBmb3IgIT0gMCwgc2NhbGUgd291bGQgYmVjb21lIE5hTiAobG9nKDApKSwgd2hpY2ggY29udmVyZ2VzIHJlYWxseSBzbG93XG4gICAgICAgICAgICAgIGlmIChwMSA+PSAxKSB7XG4gICAgICAgICAgICAgICAgeiA9IE1hdGgucG93KDEwLCBNYXRoLmZsb29yKDEgKyBNYXRoLmxvZyhwMSkgLyBNYXRoLkxOMTApKVxuICAgICAgICAgICAgICAgIHAxIC89IHpcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIFVzaW5nIEZhcmV5IFNlcXVlbmNlc1xuICAgICAgICAgICAgICAvLyBodHRwOi8vd3d3LmpvaG5kY29vay5jb20vYmxvZy8yMDEwLzEwLzIwL2Jlc3QtcmF0aW9uYWwtYXBwcm94aW1hdGlvbi9cblxuICAgICAgICAgICAgICB3aGlsZSAoQiA8PSBOICYmIEQgPD0gTikge1xuICAgICAgICAgICAgICAgIE0gPSAoQSArIEMpIC8gKEIgKyBEKVxuXG4gICAgICAgICAgICAgICAgaWYgKHAxID09PSBNKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoQiArIEQgPD0gTikge1xuICAgICAgICAgICAgICAgICAgICBuID0gQSArIENcbiAgICAgICAgICAgICAgICAgICAgZCA9IEIgKyBEXG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKEQgPiBCKSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBDXG4gICAgICAgICAgICAgICAgICAgIGQgPSBEXG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBuID0gQVxuICAgICAgICAgICAgICAgICAgICBkID0gQlxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgaWYgKHAxID4gTSkge1xuICAgICAgICAgICAgICAgICAgICBBICs9IENcbiAgICAgICAgICAgICAgICAgICAgQiArPSBEXG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBDICs9IEFcbiAgICAgICAgICAgICAgICAgICAgRCArPSBCXG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGlmIChCID4gTikge1xuICAgICAgICAgICAgICAgICAgICBuID0gQ1xuICAgICAgICAgICAgICAgICAgICBkID0gRFxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IEFcbiAgICAgICAgICAgICAgICAgICAgZCA9IEJcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbiAqPSB6XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzTmFOKHAxKSB8fCBpc05hTihwMikpIHtcbiAgICAgICAgICAgICAgZCA9IG4gPSBOYU5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAge1xuICAgICAgICAgICAgQiA9IHAxLm1hdGNoKC9cXGQrfC4vZylcblxuICAgICAgICAgICAgaWYgKEIgPT09IG51bGwpIHsgdGhyb3dJbnZhbGlkUGFyYW0oKSB9XG5cbiAgICAgICAgICAgIGlmIChCW0FdID09PSAnLScpIHsgLy8gQ2hlY2sgZm9yIG1pbnVzIHNpZ24gYXQgdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgICBzID0gLTFcbiAgICAgICAgICAgICAgQSsrXG4gICAgICAgICAgICB9IGVsc2UgaWYgKEJbQV0gPT09ICcrJykgeyAvLyBDaGVjayBmb3IgcGx1cyBzaWduIGF0IHRoZSBiZWdpbm5pbmdcbiAgICAgICAgICAgICAgQSsrXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChCLmxlbmd0aCA9PT0gQSArIDEpIHsgLy8gQ2hlY2sgaWYgaXQncyBqdXN0IGEgc2ltcGxlIG51bWJlciBcIjEyMzRcIlxuICAgICAgICAgICAgICB3ID0gYXNzaWduKEJbQSsrXSwgcylcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQltBICsgMV0gPT09ICcuJyB8fCBCW0FdID09PSAnLicpIHsgLy8gQ2hlY2sgaWYgaXQncyBhIGRlY2ltYWwgbnVtYmVyXG4gICAgICAgICAgICAgIGlmIChCW0FdICE9PSAnLicpIHsgLy8gSGFuZGxlIDAuNSBhbmQgLjVcbiAgICAgICAgICAgICAgICB2ID0gYXNzaWduKEJbQSsrXSwgcylcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBBKytcblxuICAgICAgICAgICAgICAvLyBDaGVjayBmb3IgZGVjaW1hbCBwbGFjZXNcbiAgICAgICAgICAgICAgaWYgKEEgKyAxID09PSBCLmxlbmd0aCB8fCBCW0EgKyAxXSA9PT0gJygnICYmIEJbQSArIDNdID09PSAnKScgfHwgQltBICsgMV0gPT09IFwiJ1wiICYmIEJbQSArIDNdID09PSBcIidcIikge1xuICAgICAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBXSwgcylcbiAgICAgICAgICAgICAgICB5ID0gTWF0aC5wb3coMTAsIEJbQV0ubGVuZ3RoKVxuICAgICAgICAgICAgICAgIEErK1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHJlcGVhdGluZyBwbGFjZXNcbiAgICAgICAgICAgICAgaWYgKEJbQV0gPT09ICcoJyAmJiBCW0EgKyAyXSA9PT0gJyknIHx8IEJbQV0gPT09IFwiJ1wiICYmIEJbQSArIDJdID09PSBcIidcIikge1xuICAgICAgICAgICAgICAgIHggPSBhc3NpZ24oQltBICsgMV0sIHMpXG4gICAgICAgICAgICAgICAgeiA9IE1hdGgucG93KDEwLCBCW0EgKyAxXS5sZW5ndGgpIC0gMVxuICAgICAgICAgICAgICAgIEEgKz0gM1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKEJbQSArIDFdID09PSAnLycgfHwgQltBICsgMV0gPT09ICc6JykgeyAvLyBDaGVjayBmb3IgYSBzaW1wbGUgZnJhY3Rpb24gXCIxMjMvNDU2XCIgb3IgXCIxMjM6NDU2XCJcbiAgICAgICAgICAgICAgdyA9IGFzc2lnbihCW0FdLCBzKVxuICAgICAgICAgICAgICB5ID0gYXNzaWduKEJbQSArIDJdLCAxKVxuICAgICAgICAgICAgICBBICs9IDNcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQltBICsgM10gPT09ICcvJyAmJiBCW0EgKyAxXSA9PT0gJyAnKSB7IC8vIENoZWNrIGZvciBhIGNvbXBsZXggZnJhY3Rpb24gXCIxMjMgMS8yXCJcbiAgICAgICAgICAgICAgdiA9IGFzc2lnbihCW0FdLCBzKVxuICAgICAgICAgICAgICB3ID0gYXNzaWduKEJbQSArIDJdLCBzKVxuICAgICAgICAgICAgICB5ID0gYXNzaWduKEJbQSArIDRdLCAxKVxuICAgICAgICAgICAgICBBICs9IDVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKEIubGVuZ3RoIDw9IEEpIHsgLy8gQ2hlY2sgZm9yIG1vcmUgdG9rZW5zIG9uIHRoZSBzdGFja1xuICAgICAgICAgICAgICBkID0geSAqIHpcbiAgICAgICAgICAgICAgcyA9IC8qIHZvaWQgKi9cbiAgICAgICAgICAgICAgICAgICAgbiA9IHggKyBkICogdiArIHogKiB3XG4gICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAvKiBGYWxsIHRocm91Z2ggb24gZXJyb3IgKi9cbiAgICAgICAgICB9XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93SW52YWxpZFBhcmFtKClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRGl2aXNpb25CeVplcm8oKVxuICAgICAgfVxuXG4gICAgICBQLnMgPSBzIDwgMCA/IC0xIDogMVxuICAgICAgUC5uID0gTWF0aC5hYnMobilcbiAgICAgIFAuZCA9IE1hdGguYWJzKGQpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW9kcG93IChiLCBlLCBtKSB7XG4gICAgICB2YXIgciA9IDFcbiAgICAgIGZvciAoOyBlID4gMDsgYiA9IChiICogYikgJSBtLCBlID4+PSAxKSB7XG4gICAgICAgIGlmIChlICYgMSkge1xuICAgICAgICAgIHIgPSAociAqIGIpICUgbVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gclxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGN5Y2xlTGVuIChuLCBkKSB7XG4gICAgICBmb3IgKDsgZCAlIDIgPT09IDA7XG4gICAgICAgIGQgLz0gMikge1xuICAgICAgfVxuXG4gICAgICBmb3IgKDsgZCAlIDUgPT09IDA7XG4gICAgICAgIGQgLz0gNSkge1xuICAgICAgfVxuXG4gICAgICBpZiAoZCA9PT0gMSkgLy8gQ2F0Y2ggbm9uLWN5Y2xpYyBudW1iZXJzXG4gICAgICB7IHJldHVybiAwIH1cblxuICAgICAgLy8gSWYgd2Ugd291bGQgbGlrZSB0byBjb21wdXRlIHJlYWxseSBsYXJnZSBudW1iZXJzIHF1aWNrZXIsIHdlIGNvdWxkIG1ha2UgdXNlIG9mIEZlcm1hdCdzIGxpdHRsZSB0aGVvcmVtOlxuICAgICAgLy8gMTBeKGQtMSkgJSBkID09IDFcbiAgICAgIC8vIEhvd2V2ZXIsIHdlIGRvbid0IG5lZWQgc3VjaCBsYXJnZSBudW1iZXJzIGFuZCBNQVhfQ1lDTEVfTEVOIHNob3VsZCBiZSB0aGUgY2Fwc3RvbmUsXG4gICAgICAvLyBhcyB3ZSB3YW50IHRvIHRyYW5zbGF0ZSB0aGUgbnVtYmVycyB0byBzdHJpbmdzLlxuXG4gICAgICB2YXIgcmVtID0gMTAgJSBkXG4gICAgICB2YXIgdCA9IDFcblxuICAgICAgZm9yICg7IHJlbSAhPT0gMTsgdCsrKSB7XG4gICAgICAgIHJlbSA9IHJlbSAqIDEwICUgZFxuXG4gICAgICAgIGlmICh0ID4gTUFYX0NZQ0xFX0xFTikgeyByZXR1cm4gMCB9IC8vIFJldHVybmluZyAwIGhlcmUgbWVhbnMgdGhhdCB3ZSBkb24ndCBwcmludCBpdCBhcyBhIGN5Y2xpYyBudW1iZXIuIEl0J3MgbGlrZWx5IHRoYXQgdGhlIGFuc3dlciBpcyBgZC0xYFxuICAgICAgfVxuICAgICAgcmV0dXJuIHRcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjeWNsZVN0YXJ0IChuLCBkLCBsZW4pIHtcbiAgICAgIHZhciByZW0xID0gMVxuICAgICAgdmFyIHJlbTIgPSBtb2Rwb3coMTAsIGxlbiwgZClcblxuICAgICAgZm9yICh2YXIgdCA9IDA7IHQgPCAzMDA7IHQrKykgeyAvLyBzIDwgfmxvZzEwKE51bWJlci5NQVhfVkFMVUUpXG4gICAgICAvLyBTb2x2ZSAxMF5zID09IDEwXihzK3QpIChtb2QgZClcblxuICAgICAgICBpZiAocmVtMSA9PT0gcmVtMikgeyByZXR1cm4gdCB9XG5cbiAgICAgICAgcmVtMSA9IHJlbTEgKiAxMCAlIGRcbiAgICAgICAgcmVtMiA9IHJlbTIgKiAxMCAlIGRcbiAgICAgIH1cbiAgICAgIHJldHVybiAwXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2NkIChhLCBiKSB7XG4gICAgICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICAgICAgaWYgKCFiKSB7IHJldHVybiBhIH1cblxuICAgICAgd2hpbGUgKDEpIHtcbiAgICAgICAgYSAlPSBiXG4gICAgICAgIGlmICghYSkgeyByZXR1cm4gYiB9XG4gICAgICAgIGIgJT0gYVxuICAgICAgICBpZiAoIWIpIHsgcmV0dXJuIGEgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICogTW9kdWxlIGNvbnN0cnVjdG9yXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge251bWJlcnxGcmFjdGlvbj19IGFcbiAgICogQHBhcmFtIHtudW1iZXI9fSBiXG4gICAqL1xuICAgIGZ1bmN0aW9uIEZyYWN0aW9uIChhLCBiKSB7XG4gICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRnJhY3Rpb24pKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oYSwgYilcbiAgICAgIH1cblxuICAgICAgcGFyc2UoYSwgYilcblxuICAgICAgaWYgKEZyYWN0aW9uLlJFRFVDRSkge1xuICAgICAgICBhID0gZ2NkKFAuZCwgUC5uKSAvLyBBYnVzZSBhXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhID0gMVxuICAgICAgfVxuXG4gICAgICB0aGlzLnMgPSBQLnNcbiAgICAgIHRoaXMubiA9IFAubiAvIGFcbiAgICAgIHRoaXMuZCA9IFAuZCAvIGFcbiAgICB9XG5cbiAgICAvKipcbiAgICogQm9vbGVhbiBnbG9iYWwgdmFyaWFibGUgdG8gYmUgYWJsZSB0byBkaXNhYmxlIGF1dG9tYXRpYyByZWR1Y3Rpb24gb2YgdGhlIGZyYWN0aW9uXG4gICAqXG4gICAqL1xuICAgIEZyYWN0aW9uLlJFRFVDRSA9IDFcblxuICAgIEZyYWN0aW9uLnByb3RvdHlwZSA9IHtcblxuICAgICAgczogMSxcbiAgICAgIG46IDAsXG4gICAgICBkOiAxLFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBhYnNvbHV0ZSB2YWx1ZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigtNCkuYWJzKCkgPT4gNFxuICAgICAqKi9cbiAgICAgIGFiczogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMubiwgdGhpcy5kKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogSW52ZXJ0cyB0aGUgc2lnbiBvZiB0aGUgY3VycmVudCBmcmFjdGlvblxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigtNCkubmVnKCkgPT4gNFxuICAgICAqKi9cbiAgICAgIG5lZzogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKC10aGlzLnMgKiB0aGlzLm4sIHRoaXMuZClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIEFkZHMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oe246IDIsIGQ6IDN9KS5hZGQoXCIxNC45XCIpID0+IDQ2NyAvIDMwXG4gICAgICoqL1xuICAgICAgYWRkOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIHRoaXMubiAqIFAuZCArIFAucyAqIHRoaXMuZCAqIFAubixcbiAgICAgICAgICB0aGlzLmQgKiBQLmRcbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogU3VidHJhY3RzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKHtuOiAyLCBkOiAzfSkuYWRkKFwiMTQuOVwiKSA9PiAtNDI3IC8gMzBcbiAgICAgKiovXG4gICAgICBzdWI6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgdGhpcy5zICogdGhpcy5uICogUC5kIC0gUC5zICogdGhpcy5kICogUC5uLFxuICAgICAgICAgIHRoaXMuZCAqIFAuZFxuICAgICAgICApXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBNdWx0aXBsaWVzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiLTE3LigzNDUpXCIpLm11bCgzKSA9PiA1Nzc2IC8gMTExXG4gICAgICoqL1xuICAgICAgbXVsOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIFAucyAqIHRoaXMubiAqIFAubixcbiAgICAgICAgICB0aGlzLmQgKiBQLmRcbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogRGl2aWRlcyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIi0xNy4oMzQ1KVwiKS5pbnZlcnNlKCkuZGl2KDMpXG4gICAgICoqL1xuICAgICAgZGl2OiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIFAucyAqIHRoaXMubiAqIFAuZCxcbiAgICAgICAgICB0aGlzLmQgKiBQLm5cbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2xvbmVzIHRoZSBhY3R1YWwgb2JqZWN0XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiLTE3LigzNDUpXCIpLmNsb25lKClcbiAgICAgKiovXG4gICAgICBjbG9uZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBtb2R1bG8gb2YgdHdvIHJhdGlvbmFsIG51bWJlcnMgLSBhIG1vcmUgcHJlY2lzZSBmbW9kXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLm1vZChbNywgOF0pID0+ICgxMy8zKSAlICg3LzgpID0gKDUvNilcbiAgICAgKiovXG4gICAgICBtb2Q6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTilcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMucyAqIHRoaXMubiAlIHRoaXMuZCwgMSlcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIGlmIChQLm4gPT09IDAgJiYgdGhpcy5kID09PSAwKSB7XG4gICAgICAgICAgRnJhY3Rpb24oMCwgMCkgLy8gVGhyb3cgRGl2aXNpb25CeVplcm9cbiAgICAgICAgfVxuXG4gICAgICAgIC8qXG4gICAgICAgKiBGaXJzdCBzaWxseSBhdHRlbXB0LCBraW5kYSBzbG93XG4gICAgICAgKlxuICAgICAgIHJldHVybiB0aGF0W1wic3ViXCJdKHtcbiAgICAgICBcIm5cIjogbnVtW1wiblwiXSAqIE1hdGguZmxvb3IoKHRoaXMubiAvIHRoaXMuZCkgLyAobnVtLm4gLyBudW0uZCkpLFxuICAgICAgIFwiZFwiOiBudW1bXCJkXCJdLFxuICAgICAgIFwic1wiOiB0aGlzW1wic1wiXVxuICAgICAgIH0pOyAqL1xuXG4gICAgICAgIC8qXG4gICAgICAgKiBOZXcgYXR0ZW1wdDogYTEgLyBiMSA9IGEyIC8gYjIgKiBxICsgclxuICAgICAgICogPT4gYjIgKiBhMSA9IGEyICogYjEgKiBxICsgYjEgKiBiMiAqIHJcbiAgICAgICAqID0+IChiMiAqIGExICUgYTIgKiBiMSkgLyAoYjEgKiBiMilcbiAgICAgICAqL1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIChQLmQgKiB0aGlzLm4pICUgKFAubiAqIHRoaXMuZCksXG4gICAgICAgICAgUC5kICogdGhpcy5kXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZyYWN0aW9uYWwgZ2NkIG9mIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDUsOCkuZ2NkKDMsNykgPT4gMS81NlxuICAgICAqL1xuICAgICAgZ2NkOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuXG4gICAgICAgIC8vIGdjZChhIC8gYiwgYyAvIGQpID0gZ2NkKGEsIGMpIC8gbGNtKGIsIGQpXG5cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihnY2QoUC5uLCB0aGlzLm4pICogZ2NkKFAuZCwgdGhpcy5kKSwgUC5kICogdGhpcy5kKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZnJhY3Rpb25hbCBsY20gb2YgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oNSw4KS5sY20oMyw3KSA9PiAxNVxuICAgICAqL1xuICAgICAgbGNtOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuXG4gICAgICAgIC8vIGxjbShhIC8gYiwgYyAvIGQpID0gbGNtKGEsIGMpIC8gZ2NkKGIsIGQpXG5cbiAgICAgICAgaWYgKFAubiA9PT0gMCAmJiB0aGlzLm4gPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFAubiAqIHRoaXMubiwgZ2NkKFAubiwgdGhpcy5uKSAqIGdjZChQLmQsIHRoaXMuZCkpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBjZWlsIG9mIGEgcmF0aW9uYWwgbnVtYmVyXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLmNlaWwoKSA9PiAoNSAvIDEpXG4gICAgICoqL1xuICAgICAgY2VpbDogZnVuY3Rpb24gKHBsYWNlcykge1xuICAgICAgICBwbGFjZXMgPSBNYXRoLnBvdygxMCwgcGxhY2VzIHx8IDApXG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5jZWlsKHBsYWNlcyAqIHRoaXMucyAqIHRoaXMubiAvIHRoaXMuZCksIHBsYWNlcylcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZsb29yIG9mIGEgcmF0aW9uYWwgbnVtYmVyXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLmZsb29yKCkgPT4gKDQgLyAxKVxuICAgICAqKi9cbiAgICAgIGZsb29yOiBmdW5jdGlvbiAocGxhY2VzKSB7XG4gICAgICAgIHBsYWNlcyA9IE1hdGgucG93KDEwLCBwbGFjZXMgfHwgMClcblxuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLmZsb29yKHBsYWNlcyAqIHRoaXMucyAqIHRoaXMubiAvIHRoaXMuZCksIHBsYWNlcylcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJvdW5kcyBhIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykucm91bmQoKSA9PiAoNCAvIDEpXG4gICAgICoqL1xuICAgICAgcm91bmQ6IGZ1bmN0aW9uIChwbGFjZXMpIHtcbiAgICAgICAgcGxhY2VzID0gTWF0aC5wb3coMTAsIHBsYWNlcyB8fCAwKVxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGgucm91bmQocGxhY2VzICogdGhpcy5zICogdGhpcy5uIC8gdGhpcy5kKSwgcGxhY2VzKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogR2V0cyB0aGUgaW52ZXJzZSBvZiB0aGUgZnJhY3Rpb24sIG1lYW5zIG51bWVyYXRvciBhbmQgZGVudW1lcmF0b3IgYXJlIGV4Y2hhbmdlZFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihbLTMsIDRdKS5pbnZlcnNlKCkgPT4gLTQgLyAzXG4gICAgICoqL1xuICAgICAgaW52ZXJzZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMucyAqIHRoaXMuZCwgdGhpcy5uKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZnJhY3Rpb24gdG8gc29tZSBpbnRlZ2VyIGV4cG9uZW50XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKC0xLDIpLnBvdygtMykgPT4gLThcbiAgICAgKi9cbiAgICAgIHBvdzogZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgaWYgKG0gPCAwKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLnBvdyh0aGlzLnMgKiB0aGlzLmQsIC1tKSwgTWF0aC5wb3codGhpcy5uLCAtbSkpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLnBvdyh0aGlzLnMgKiB0aGlzLm4sIG0pLCBNYXRoLnBvdyh0aGlzLmQsIG0pKVxuICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0d28gcmF0aW9uYWwgbnVtYmVycyBhcmUgdGhlIHNhbWVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oMTkuNikuZXF1YWxzKFs5OCwgNV0pO1xuICAgICAqKi9cbiAgICAgIGVxdWFsczogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIHRoaXMucyAqIHRoaXMubiAqIFAuZCA9PT0gUC5zICogUC5uICogdGhpcy5kIC8vIFNhbWUgYXMgY29tcGFyZSgpID09PSAwXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0d28gcmF0aW9uYWwgbnVtYmVycyBhcmUgdGhlIHNhbWVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oMTkuNikuZXF1YWxzKFs5OCwgNV0pO1xuICAgICAqKi9cbiAgICAgIGNvbXBhcmU6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHZhciB0ID0gKHRoaXMucyAqIHRoaXMubiAqIFAuZCAtIFAucyAqIFAubiAqIHRoaXMuZClcbiAgICAgICAgcmV0dXJuICh0ID4gMCkgLSAodCA8IDApXG4gICAgICB9LFxuXG4gICAgICBzaW1wbGlmeTogZnVuY3Rpb24gKGVwcykge1xuICAgICAgLy8gRmlyc3QgbmFpdmUgaW1wbGVtZW50YXRpb24sIG5lZWRzIGltcHJvdmVtZW50XG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiB0aGlzXG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY29udCA9IHRoaXMuYWJzKCkudG9Db250aW51ZWQoKVxuXG4gICAgICAgIGVwcyA9IGVwcyB8fCAwLjAwMVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlYyAoYSkge1xuICAgICAgICAgIGlmIChhLmxlbmd0aCA9PT0gMSkgeyByZXR1cm4gbmV3IEZyYWN0aW9uKGFbMF0pIH1cbiAgICAgICAgICByZXR1cm4gcmVjKGEuc2xpY2UoMSkpLmludmVyc2UoKS5hZGQoYVswXSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29udC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHZhciB0bXAgPSByZWMoY29udC5zbGljZSgwLCBpICsgMSkpXG4gICAgICAgICAgaWYgKHRtcC5zdWIodGhpcy5hYnMoKSkuYWJzKCkudmFsdWVPZigpIDwgZXBzKSB7XG4gICAgICAgICAgICByZXR1cm4gdG1wLm11bCh0aGlzLnMpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0d28gcmF0aW9uYWwgbnVtYmVycyBhcmUgZGl2aXNpYmxlXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDE5LjYpLmRpdmlzaWJsZSgxLjUpO1xuICAgICAqL1xuICAgICAgZGl2aXNpYmxlOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gISghKFAubiAqIHRoaXMuZCkgfHwgKCh0aGlzLm4gKiBQLmQpICUgKFAubiAqIHRoaXMuZCkpKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogUmV0dXJucyBhIGRlY2ltYWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGZyYWN0aW9uXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiMTAwLic5MTgyMydcIikudmFsdWVPZigpID0+IDEwMC45MTgyMzkxODIzOTE4M1xuICAgICAqKi9cbiAgICAgIHZhbHVlT2Y6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucyAqIHRoaXMubiAvIHRoaXMuZFxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogUmV0dXJucyBhIHN0cmluZy1mcmFjdGlvbiByZXByZXNlbnRhdGlvbiBvZiBhIEZyYWN0aW9uIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEuJzMnXCIpLnRvRnJhY3Rpb24oKSA9PiBcIjQgMS8zXCJcbiAgICAgKiovXG4gICAgICB0b0ZyYWN0aW9uOiBmdW5jdGlvbiAoZXhjbHVkZVdob2xlKSB7XG4gICAgICAgIHZhciB3aG9sZTsgdmFyIHN0ciA9ICcnXG4gICAgICAgIHZhciBuID0gdGhpcy5uXG4gICAgICAgIHZhciBkID0gdGhpcy5kXG4gICAgICAgIGlmICh0aGlzLnMgPCAwKSB7XG4gICAgICAgICAgc3RyICs9ICctJ1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGQgPT09IDEpIHtcbiAgICAgICAgICBzdHIgKz0gblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChleGNsdWRlV2hvbGUgJiYgKHdob2xlID0gTWF0aC5mbG9vcihuIC8gZCkpID4gMCkge1xuICAgICAgICAgICAgc3RyICs9IHdob2xlXG4gICAgICAgICAgICBzdHIgKz0gJyAnXG4gICAgICAgICAgICBuICU9IGRcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzdHIgKz0gblxuICAgICAgICAgIHN0ciArPSAnLydcbiAgICAgICAgICBzdHIgKz0gZFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHJcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBsYXRleCByZXByZXNlbnRhdGlvbiBvZiBhIEZyYWN0aW9uIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEuJzMnXCIpLnRvTGF0ZXgoKSA9PiBcIlxcZnJhY3s0fXszfVwiXG4gICAgICoqL1xuICAgICAgdG9MYXRleDogZnVuY3Rpb24gKGV4Y2x1ZGVXaG9sZSkge1xuICAgICAgICB2YXIgd2hvbGU7IHZhciBzdHIgPSAnJ1xuICAgICAgICB2YXIgbiA9IHRoaXMublxuICAgICAgICB2YXIgZCA9IHRoaXMuZFxuICAgICAgICBpZiAodGhpcy5zIDwgMCkge1xuICAgICAgICAgIHN0ciArPSAnLSdcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkID09PSAxKSB7XG4gICAgICAgICAgc3RyICs9IG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZXhjbHVkZVdob2xlICYmICh3aG9sZSA9IE1hdGguZmxvb3IobiAvIGQpKSA+IDApIHtcbiAgICAgICAgICAgIHN0ciArPSB3aG9sZVxuICAgICAgICAgICAgbiAlPSBkXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc3RyICs9ICdcXFxcZnJhY3snXG4gICAgICAgICAgc3RyICs9IG5cbiAgICAgICAgICBzdHIgKz0gJ317J1xuICAgICAgICAgIHN0ciArPSBkXG4gICAgICAgICAgc3RyICs9ICd9J1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHJcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YgY29udGludWVkIGZyYWN0aW9uIGVsZW1lbnRzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiNy84XCIpLnRvQ29udGludWVkKCkgPT4gWzAsMSw3XVxuICAgICAqL1xuICAgICAgdG9Db250aW51ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRcbiAgICAgICAgdmFyIGEgPSB0aGlzLm5cbiAgICAgICAgdmFyIGIgPSB0aGlzLmRcbiAgICAgICAgdmFyIHJlcyA9IFtdXG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiByZXNcbiAgICAgICAgfVxuXG4gICAgICAgIGRvIHtcbiAgICAgICAgICByZXMucHVzaChNYXRoLmZsb29yKGEgLyBiKSlcbiAgICAgICAgICB0ID0gYSAlIGJcbiAgICAgICAgICBhID0gYlxuICAgICAgICAgIGIgPSB0XG4gICAgICAgIH0gd2hpbGUgKGEgIT09IDEpXG5cbiAgICAgICAgcmV0dXJuIHJlc1xuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhIGZyYWN0aW9uIHdpdGggYWxsIGRpZ2l0c1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEwMC4nOTE4MjMnXCIpLnRvU3RyaW5nKCkgPT4gXCIxMDAuKDkxODIzKVwiXG4gICAgICoqL1xuICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uIChkZWMpIHtcbiAgICAgICAgdmFyIGdcbiAgICAgICAgdmFyIE4gPSB0aGlzLm5cbiAgICAgICAgdmFyIEQgPSB0aGlzLmRcblxuICAgICAgICBpZiAoaXNOYU4oTikgfHwgaXNOYU4oRCkpIHtcbiAgICAgICAgICByZXR1cm4gJ05hTidcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghRnJhY3Rpb24uUkVEVUNFKSB7XG4gICAgICAgICAgZyA9IGdjZChOLCBEKVxuICAgICAgICAgIE4gLz0gZ1xuICAgICAgICAgIEQgLz0gZ1xuICAgICAgICB9XG5cbiAgICAgICAgZGVjID0gZGVjIHx8IDE1IC8vIDE1ID0gZGVjaW1hbCBwbGFjZXMgd2hlbiBubyByZXBpdGF0aW9uXG5cbiAgICAgICAgdmFyIGN5Y0xlbiA9IGN5Y2xlTGVuKE4sIEQpIC8vIEN5Y2xlIGxlbmd0aFxuICAgICAgICB2YXIgY3ljT2ZmID0gY3ljbGVTdGFydChOLCBELCBjeWNMZW4pIC8vIEN5Y2xlIHN0YXJ0XG5cbiAgICAgICAgdmFyIHN0ciA9IHRoaXMucyA9PT0gLTEgPyAnLScgOiAnJ1xuXG4gICAgICAgIHN0ciArPSBOIC8gRCB8IDBcblxuICAgICAgICBOICU9IERcbiAgICAgICAgTiAqPSAxMFxuXG4gICAgICAgIGlmIChOKSB7IHN0ciArPSAnLicgfVxuXG4gICAgICAgIGlmIChjeWNMZW4pIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gY3ljT2ZmOyBpLS07KSB7XG4gICAgICAgICAgICBzdHIgKz0gTiAvIEQgfCAwXG4gICAgICAgICAgICBOICU9IERcbiAgICAgICAgICAgIE4gKj0gMTBcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RyICs9ICcoJ1xuICAgICAgICAgIGZvciAodmFyIGkgPSBjeWNMZW47IGktLTspIHtcbiAgICAgICAgICAgIHN0ciArPSBOIC8gRCB8IDBcbiAgICAgICAgICAgIE4gJT0gRFxuICAgICAgICAgICAgTiAqPSAxMFxuICAgICAgICAgIH1cbiAgICAgICAgICBzdHIgKz0gJyknXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IGRlYzsgTiAmJiBpLS07KSB7XG4gICAgICAgICAgICBzdHIgKz0gTiAvIEQgfCAwXG4gICAgICAgICAgICBOICU9IERcbiAgICAgICAgICAgIE4gKj0gMTBcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0clxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdW5kZWZpbmVkID09PSAnZnVuY3Rpb24nICYmIHVuZGVmaW5lZC5hbWQpIHtcbiAgICAgIHVuZGVmaW5lZChbXSwgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gRnJhY3Rpb25cbiAgICAgIH0pXG4gICAgfSBlbHNlIGlmICgnb2JqZWN0JyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSlcbiAgICAgIEZyYWN0aW9uLmRlZmF1bHQgPSBGcmFjdGlvblxuICAgICAgRnJhY3Rpb24uRnJhY3Rpb24gPSBGcmFjdGlvblxuICAgICAgbW9kdWxlLmV4cG9ydHMgPSBGcmFjdGlvblxuICAgIH0gZWxzZSB7XG4gICAgICByb290LkZyYWN0aW9uID0gRnJhY3Rpb25cbiAgICB9XG4gIH0pKGNvbW1vbmpzSGVscGVycy5jb21tb25qc0dsb2JhbClcbn0pXG5cbmV4cG9ydCBkZWZhdWx0IC8qIEBfX1BVUkVfXyAqL2NvbW1vbmpzSGVscGVycy5nZXREZWZhdWx0RXhwb3J0RnJvbUNqcyhmcmFjdGlvbilcbmV4cG9ydCB7IGZyYWN0aW9uIGFzIF9fbW9kdWxlRXhwb3J0cyB9XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBNb25vbWlhbCB7XG4gIGNvbnN0cnVjdG9yIChjLCB2cykge1xuICAgIGlmICghaXNOYU4oYykgJiYgdnMgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgIHRoaXMuYyA9IGNcbiAgICAgIHRoaXMudnMgPSB2c1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGMgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmluaXRTdHIoYylcbiAgICB9IGVsc2UgaWYgKCFpc05hTihjKSkge1xuICAgICAgdGhpcy5jID0gY1xuICAgICAgdGhpcy52cyA9IG5ldyBNYXAoKVxuICAgIH0gZWxzZSB7IC8vIGRlZmF1bHQgYXMgYSB0ZXN0OiA0eF4yeVxuICAgICAgdGhpcy5jID0gNFxuICAgICAgdGhpcy52cyA9IG5ldyBNYXAoW1sneCcsIDJdLCBbJ3knLCAxXV0pXG4gICAgfVxuICB9XG5cbiAgY2xvbmUgKCkge1xuICAgIGNvbnN0IHZzID0gbmV3IE1hcCh0aGlzLnZzKVxuICAgIHJldHVybiBuZXcgTW9ub21pYWwodGhpcy5jLCB2cylcbiAgfVxuXG4gIG11bCAodGhhdCkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgTW9ub21pYWwodGhhdClcbiAgICB9XG4gICAgY29uc3QgYyA9IHRoaXMuYyAqIHRoYXQuY1xuICAgIGxldCB2cyA9IG5ldyBNYXAoKVxuICAgIHRoaXMudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAodGhhdC52cy5oYXModmFyaWFibGUpKSB7XG4gICAgICAgIHZzLnNldCh2YXJpYWJsZSwgdGhpcy52cy5nZXQodmFyaWFibGUpICsgdGhhdC52cy5nZXQodmFyaWFibGUpKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdnMuc2V0KHZhcmlhYmxlLCB0aGlzLnZzLmdldCh2YXJpYWJsZSkpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoYXQudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAoIXZzLmhhcyh2YXJpYWJsZSkpIHtcbiAgICAgICAgdnMuc2V0KHZhcmlhYmxlLCB0aGF0LnZzLmdldCh2YXJpYWJsZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICB2cyA9IG5ldyBNYXAoWy4uLnZzLmVudHJpZXMoKV0uc29ydCgpKVxuICAgIHJldHVybiBuZXcgTW9ub21pYWwoYywgdnMpXG4gIH1cblxuICB0b0xhdGV4ICgpIHtcbiAgICBpZiAodGhpcy52cy5zaXplID09PSAwKSByZXR1cm4gdGhpcy5jLnRvU3RyaW5nKClcbiAgICBsZXQgc3RyID0gdGhpcy5jID09PSAxID8gJydcbiAgICAgIDogdGhpcy5jID09PSAtMSA/ICctJ1xuICAgICAgICA6IHRoaXMuYy50b1N0cmluZygpXG4gICAgdGhpcy52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmIChpbmRleCA9PT0gMSkge1xuICAgICAgICBzdHIgKz0gdmFyaWFibGVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciArPSB2YXJpYWJsZSArICdeJyArIGluZGV4XG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gc3RyXG4gIH1cblxuICBzb3J0ICgpIHtcbiAgICAvLyBzb3J0cyAobW9kaWZpZXMgb2JqZWN0KVxuICAgIHRoaXMudnMgPSBuZXcgTWFwKFsuLi50aGlzLnZzLmVudHJpZXMoKV0uc29ydCgpKVxuICB9XG5cbiAgY2xlYW5aZXJvcyAoKSB7XG4gICAgdGhpcy52cy5mb3JFYWNoKChpZHgsIHYpID0+IHtcbiAgICAgIGlmIChpZHggPT09IDApIHRoaXMudnMuZGVsZXRlKHYpXG4gICAgfSlcbiAgfVxuXG4gIGxpa2UgKHRoYXQpIHtcbiAgICAvLyByZXR1cm4gdHJ1ZSBpZiBsaWtlIHRlcm1zLCBmYWxzZSBpZiBvdGhlcndpc2VcbiAgICAvLyBub3QgdGhlIG1vc3QgZWZmaWNpZW50IGF0IHRoZSBtb21lbnQsIGJ1dCBnb29kIGVub3VnaC5cbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IE1vbm9taWFsKHRoYXQpXG4gICAgfVxuXG4gICAgbGV0IGxpa2UgPSB0cnVlXG4gICAgdGhpcy52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICghdGhhdC52cy5oYXModmFyaWFibGUpIHx8IHRoYXQudnMuZ2V0KHZhcmlhYmxlKSAhPT0gaW5kZXgpIHtcbiAgICAgICAgbGlrZSA9IGZhbHNlXG4gICAgICB9XG4gICAgfSlcbiAgICB0aGF0LnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKCF0aGlzLnZzLmhhcyh2YXJpYWJsZSkgfHwgdGhpcy52cy5nZXQodmFyaWFibGUpICE9PSBpbmRleCkge1xuICAgICAgICBsaWtlID0gZmFsc2VcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBsaWtlXG4gIH1cblxuICBhZGQgKHRoYXQsIGNoZWNrTGlrZSkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgTW9ub21pYWwodGhhdClcbiAgICB9XG4gICAgLy8gYWRkcyB0d28gY29tcGF0aWJsZSBtb25vbWlhbHNcbiAgICAvLyBjaGVja0xpa2UgKGRlZmF1bHQgdHJ1ZSkgd2lsbCBjaGVjayBmaXJzdCBpZiB0aGV5IGFyZSBsaWtlIGFuZCB0aHJvdyBhbiBleGNlcHRpb25cbiAgICAvLyB1bmRlZmluZWQgYmVoYXZpb3VyIGlmIGNoZWNrTGlrZSBpcyBmYWxzZVxuICAgIGlmIChjaGVja0xpa2UgPT09IHVuZGVmaW5lZCkgY2hlY2tMaWtlID0gdHJ1ZVxuICAgIGlmIChjaGVja0xpa2UgJiYgIXRoaXMubGlrZSh0aGF0KSkgdGhyb3cgbmV3IEVycm9yKCdBZGRpbmcgdW5saWtlIHRlcm1zJylcbiAgICBjb25zdCBjID0gdGhpcy5jICsgdGhhdC5jXG4gICAgY29uc3QgdnMgPSB0aGlzLnZzXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbChjLCB2cylcbiAgfVxuXG4gIGluaXRTdHIgKHN0cikge1xuICAgIC8vIGN1cnJlbnRseSBubyBlcnJvciBjaGVja2luZyBhbmQgZnJhZ2lsZVxuICAgIC8vIFRoaW5ncyBub3QgdG8gcGFzcyBpbjpcbiAgICAvLyAgemVybyBpbmRpY2VzXG4gICAgLy8gIG11bHRpLWNoYXJhY3RlciB2YXJpYWJsZXNcbiAgICAvLyAgbmVnYXRpdmUgaW5kaWNlc1xuICAgIC8vICBub24taW50ZWdlciBjb2VmZmljaWVudHNcbiAgICBjb25zdCBsZWFkID0gc3RyLm1hdGNoKC9eLT9cXGQqLylbMF1cbiAgICBjb25zdCBjID0gbGVhZCA9PT0gJycgPyAxXG4gICAgICA6IGxlYWQgPT09ICctJyA/IC0xXG4gICAgICAgIDogcGFyc2VJbnQobGVhZClcbiAgICBsZXQgdnMgPSBzdHIubWF0Y2goLyhbYS16QS1aXSkoXFxeXFxkKyk/L2cpXG4gICAgaWYgKCF2cykgdnMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHYgPSB2c1tpXS5zcGxpdCgnXicpXG4gICAgICB2WzFdID0gdlsxXSA/IHBhcnNlSW50KHZbMV0pIDogMVxuICAgICAgdnNbaV0gPSB2XG4gICAgfVxuICAgIHZzID0gdnMuZmlsdGVyKHYgPT4gdlsxXSAhPT0gMClcbiAgICB0aGlzLmMgPSBjXG4gICAgdGhpcy52cyA9IG5ldyBNYXAodnMpXG4gIH1cblxuICBzdGF0aWMgdmFyICh2KSB7XG4gICAgLy8gZmFjdG9yeSBmb3IgYSBzaW5nbGUgdmFyaWFibGUgbW9ub21pYWxcbiAgICBjb25zdCBjID0gMVxuICAgIGNvbnN0IHZzID0gbmV3IE1hcChbW3YsIDFdXSlcbiAgICByZXR1cm4gbmV3IE1vbm9taWFsKGMsIHZzKVxuICB9XG59XG4iLCJpbXBvcnQgTW9ub21pYWwgZnJvbSAnTW9ub21pYWwnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBvbHlub21pYWwge1xuICBjb25zdHJ1Y3RvciAodGVybXMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0ZXJtcykgJiYgKHRlcm1zWzBdIGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0ZXJtcy5tYXAodCA9PiB0LmNsb25lKCkpXG4gICAgICB0aGlzLnRlcm1zID0gdGVybXNcbiAgICB9IGVsc2UgaWYgKCFpc05hTih0ZXJtcykpIHtcbiAgICAgIHRoaXMuaW5pdE51bSh0ZXJtcylcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0ZXJtcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuaW5pdFN0cih0ZXJtcylcbiAgICB9XG4gIH1cblxuICBpbml0U3RyIChzdHIpIHtcbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvXFwrLS9nLCAnLScpIC8vIGEgaG9ycmlibGUgYm9kZ2VcbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvLS9nLCAnKy0nKSAvLyBtYWtlIG5lZ2F0aXZlIHRlcm1zIGV4cGxpY2l0LlxuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9cXHMvZywgJycpIC8vIHN0cmlwIHdoaXRlc3BhY2VcbiAgICB0aGlzLnRlcm1zID0gc3RyLnNwbGl0KCcrJylcbiAgICAgIC5tYXAocyA9PiBuZXcgTW9ub21pYWwocykpXG4gICAgICAuZmlsdGVyKHQgPT4gdC5jICE9PSAwKVxuICB9XG5cbiAgaW5pdE51bSAobikge1xuICAgIHRoaXMudGVybXMgPSBbbmV3IE1vbm9taWFsKG4pXVxuICB9XG5cbiAgdG9MYXRleCAoKSB7XG4gICAgbGV0IHN0ciA9ICcnXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRlcm1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoaSA+IDAgJiYgdGhpcy50ZXJtc1tpXS5jID49IDApIHtcbiAgICAgICAgc3RyICs9ICcrJ1xuICAgICAgfVxuICAgICAgc3RyICs9IHRoaXMudGVybXNbaV0udG9MYXRleCgpXG4gICAgfVxuICAgIHJldHVybiBzdHJcbiAgfVxuXG4gIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gdGhpcy50b0xhVGVYKClcbiAgfVxuXG4gIGNsb25lICgpIHtcbiAgICBjb25zdCB0ZXJtcyA9IHRoaXMudGVybXMubWFwKHQgPT4gdC5jbG9uZSgpKVxuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbCh0ZXJtcylcbiAgfVxuXG4gIHNpbXBsaWZ5ICgpIHtcbiAgICAvLyBjb2xsZWN0cyBsaWtlIHRlcm1zIGFuZCByZW1vdmVzIHplcm8gdGVybXNcbiAgICAvLyBkb2VzIG5vdCBtb2RpZnkgb3JpZ2luYWxcbiAgICAvLyBUaGlzIHNlZW1zIHByb2JhYmx5IGluZWZmaWNpZW50LCBnaXZlbiB0aGUgZGF0YSBzdHJ1Y3R1cmVcbiAgICAvLyBXb3VsZCBiZSBiZXR0ZXIgdG8gdXNlIHNvbWV0aGluZyBsaWtlIGEgbGlua2VkIGxpc3QgbWF5YmU/XG4gICAgY29uc3QgdGVybXMgPSB0aGlzLnRlcm1zLnNsaWNlKClcbiAgICBsZXQgbmV3dGVybXMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGVybXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghdGVybXNbaV0pIGNvbnRpbnVlXG4gICAgICBsZXQgbmV3dGVybSA9IHRlcm1zW2ldXG4gICAgICBmb3IgKGxldCBqID0gaSArIDE7IGogPCB0ZXJtcy5sZW5ndGg7IGorKykge1xuICAgICAgICBpZiAoIXRlcm1zW2pdKSBjb250aW51ZVxuICAgICAgICBpZiAodGVybXNbal0ubGlrZSh0ZXJtc1tpXSkpIHtcbiAgICAgICAgICBuZXd0ZXJtID0gbmV3dGVybS5hZGQodGVybXNbal0pXG4gICAgICAgICAgdGVybXNbal0gPSBudWxsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG5ld3Rlcm1zLnB1c2gobmV3dGVybSlcbiAgICAgIHRlcm1zW2ldID0gbnVsbFxuICAgIH1cbiAgICBuZXd0ZXJtcyA9IG5ld3Rlcm1zLmZpbHRlcih0ID0+IHQuYyAhPT0gMClcbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwobmV3dGVybXMpXG4gIH1cblxuICBhZGQgKHRoYXQsIHNpbXBsaWZ5KSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIFBvbHlub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IFBvbHlub21pYWwodGhhdClcbiAgICB9XG4gICAgaWYgKHNpbXBsaWZ5ID09PSB1bmRlZmluZWQpIHNpbXBsaWZ5ID0gdHJ1ZVxuICAgIGNvbnN0IHRlcm1zID0gdGhpcy50ZXJtcy5jb25jYXQodGhhdC50ZXJtcylcbiAgICBsZXQgcmVzdWx0ID0gbmV3IFBvbHlub21pYWwodGVybXMpXG5cbiAgICBpZiAoc2ltcGxpZnkpIHJlc3VsdCA9IHJlc3VsdC5zaW1wbGlmeSgpXG5cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICBtdWwgKHRoYXQsIHNpbXBsaWZ5KSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIFBvbHlub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IFBvbHlub21pYWwodGhhdClcbiAgICB9XG4gICAgY29uc3QgdGVybXMgPSBbXVxuICAgIGlmIChzaW1wbGlmeSA9PT0gdW5kZWZpbmVkKSBzaW1wbGlmeSA9IHRydWVcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGVybXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhhdC50ZXJtcy5sZW5ndGg7IGorKykge1xuICAgICAgICB0ZXJtcy5wdXNoKHRoaXMudGVybXNbaV0ubXVsKHRoYXQudGVybXNbal0pKVxuICAgICAgfVxuICAgIH1cblxuICAgIGxldCByZXN1bHQgPSBuZXcgUG9seW5vbWlhbCh0ZXJtcylcbiAgICBpZiAoc2ltcGxpZnkpIHJlc3VsdCA9IHJlc3VsdC5zaW1wbGlmeSgpXG5cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICBwb3cgKG4sIHNpbXBsaWZ5KSB7XG4gICAgbGV0IHJlc3VsdCA9IHRoaXNcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IG47IGkrKykge1xuICAgICAgcmVzdWx0ID0gcmVzdWx0Lm11bCh0aGlzKVxuICAgIH1cbiAgICBpZiAoc2ltcGxpZnkpIHJlc3VsdCA9IHJlc3VsdC5zaW1wbGlmeSgpXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG5cbiAgc3RhdGljIHZhciAodikge1xuICAgIC8vIGZhY3RvcnkgZm9yIGEgc2luZ2xlIHZhcmlhYmxlIHBvbHlub21pYWxcbiAgICBjb25zdCB0ZXJtcyA9IFtNb25vbWlhbC52YXIodildXG4gICAgcmV0dXJuIG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuICB9XG5cbiAgc3RhdGljIHggKCkge1xuICAgIHJldHVybiBQb2x5bm9taWFsLnZhcigneCcpXG4gIH1cblxuICBzdGF0aWMgY29uc3QgKG4pIHtcbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwobilcbiAgfVxufVxuIiwiaW1wb3J0IHsgR3JhcGhpY1EsIEdyYXBoaWNRVmlldyB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IEZyYWN0aW9uIGZyb20gJ3ZlbmRvci9mcmFjdGlvbidcbmltcG9ydCBQb2x5bm9taWFsIGZyb20gJ1BvbHlub21pYWwnXG5pbXBvcnQgeyByYW5kRWxlbSwgcmFuZEJldHdlZW4sIHJhbmRCZXR3ZWVuRmlsdGVyLCBnY2QgfSBmcm9tICd1dGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFyaXRobWFnb25RIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIGNvbnN0IGRhdGEgPSBuZXcgQXJpdGhtYWdvblFEYXRhKG9wdGlvbnMpXG4gICAgY29uc3QgdmlldyA9IG5ldyBBcml0aG1hZ29uUVZpZXcoZGF0YSwgb3B0aW9ucylcbiAgICBzdXBlcihkYXRhLCB2aWV3KVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7IHJldHVybiAnQ29tcGxldGUgdGhlIGFyaXRobWFnb246JyB9XG59XG5cbkFyaXRobWFnb25RLm9wdGlvbnNTcGVjID0gW1xuICB7XG4gICAgdGl0bGU6ICdWZXJ0aWNlcycsXG4gICAgaWQ6ICduJyxcbiAgICB0eXBlOiAnaW50JyxcbiAgICBtaW46IDMsXG4gICAgbWF4OiAyMCxcbiAgICBkZWZhdWx0OiAzXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1R5cGUnLFxuICAgIGlkOiAndHlwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1leGNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdJbnRlZ2VyICgrKScsIGlkOiAnaW50ZWdlci1hZGQnIH0sXG4gICAgICB7IHRpdGxlOiAnSW50ZWdlciAoXFx1MDBkNyknLCBpZDogJ2ludGVnZXItbXVsdGlwbHknIH0sXG4gICAgICB7IHRpdGxlOiAnRnJhY3Rpb24gKCspJywgaWQ6ICdmcmFjdGlvbi1hZGQnIH0sXG4gICAgICB7IHRpdGxlOiAnRnJhY3Rpb24gKFxcdTAwZDcpJywgaWQ6ICdmcmFjdGlvbi1tdWx0aXBseScgfSxcbiAgICAgIHsgdGl0bGU6ICdBbGdlYnJhICgrKScsIGlkOiAnYWxnZWJyYS1hZGQnIH0sXG4gICAgICB7IHRpdGxlOiAnQWxnZWJyYSAoXFx1MDBkNyknLCBpZDogJ2FsZ2VicmEtbXVsdGlwbHknIH1cbiAgICBdLFxuICAgIGRlZmF1bHQ6ICdpbnRlZ2VyLWFkZCcsXG4gICAgdmVydGljYWw6IHRydWVcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnUHV6emxlIHR5cGUnLFxuICAgIHR5cGU6ICdzZWxlY3QtZXhjbHVzaXZlJyxcbiAgICBpZDogJ3B1el9kaWZmJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICB7IHRpdGxlOiAnTWlzc2luZyBlZGdlcycsIGlkOiAnMScgfSxcbiAgICAgIHsgdGl0bGU6ICdNaXhlZCcsIGlkOiAnMicgfSxcbiAgICAgIHsgdGl0bGU6ICdNaXNzaW5nIHZlcnRpY2VzJywgaWQ6ICczJyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiAnMSdcbiAgfVxuXVxuXG5jbGFzcyBBcml0aG1hZ29uUURhdGEgLyogZXh0ZW5kcyBHcmFwaGljUURhdGEgKi8ge1xuICAvLyBUT0RPIHNpbXBsaWZ5IGNvbnN0cnVjdG9yLiBNb3ZlIGxvZ2ljIGludG8gc3RhdGljIGZhY3RvcnkgbWV0aG9kc1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIC8vIDEuIFNldCBwcm9wZXJ0aWVzIGZyb20gb3B0aW9uc1xuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgbjogMywgLy8gbnVtYmVyIG9mIHZlcnRpY2VzXG4gICAgICBtaW46IC0yMCxcbiAgICAgIG1heDogMjAsXG4gICAgICBudW1fZGlmZjogMSwgLy8gY29tcGxleGl0eSBvZiB3aGF0J3MgaW4gdmVydGljZXMvZWRnZXNcbiAgICAgIHB1el9kaWZmOiAxLCAvLyAxIC0gVmVydGljZXMgZ2l2ZW4sIDIgLSB2ZXJ0aWNlcy9lZGdlczsgZ2l2ZW4gMyAtIG9ubHkgZWRnZXNcbiAgICAgIHR5cGU6ICdpbnRlZ2VyLWFkZCcgLy8gW3R5cGVdLVtvcGVyYXRpb25dIHdoZXJlIFt0eXBlXSA9IGludGVnZXIsIC4uLlxuICAgICAgLy8gYW5kIFtvcGVyYXRpb25dID0gYWRkL211bHRpcGx5XG4gICAgfVxuXG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCB0aGlzLnNldHRpbmdzLCBvcHRpb25zKVxuICAgIHRoaXMuc2V0dGluZ3MubnVtX2RpZmYgPSB0aGlzLnNldHRpbmdzLmRpZmZpY3VsdHlcbiAgICB0aGlzLnNldHRpbmdzLnB1el9kaWZmID0gcGFyc2VJbnQodGhpcy5zZXR0aW5ncy5wdXpfZGlmZikgLy8hID8gVGhpcyBzaG91bGQgaGF2ZSBiZWVuIGRvbmUgdXBzdHJlYW0uLi5cblxuICAgIHRoaXMubiA9IHRoaXMuc2V0dGluZ3MublxuICAgIHRoaXMudmVydGljZXMgPSBbXVxuICAgIHRoaXMuc2lkZXMgPSBbXVxuXG4gICAgaWYgKHRoaXMuc2V0dGluZ3MudHlwZS5lbmRzV2l0aCgnYWRkJykpIHtcbiAgICAgIHRoaXMub3BuYW1lID0gJysnXG4gICAgICB0aGlzLm9wID0gKHgsIHkpID0+IHguYWRkKHkpXG4gICAgfSBlbHNlIGlmICh0aGlzLnNldHRpbmdzLnR5cGUuZW5kc1dpdGgoJ211bHRpcGx5JykpIHtcbiAgICAgIHRoaXMub3BuYW1lID0gJ1xcdTAwZDcnXG4gICAgICB0aGlzLm9wID0gKHgsIHkpID0+IHgubXVsKHkpXG4gICAgfVxuXG4gICAgLy8gMi4gSW5pdGlhbGlzZSBiYXNlZCBvbiB0eXBlXG4gICAgc3dpdGNoICh0aGlzLnNldHRpbmdzLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2ludGVnZXItYWRkJzpcbiAgICAgIGNhc2UgJ2ludGVnZXItbXVsdGlwbHknOlxuICAgICAgICB0aGlzLmluaXRJbnRlZ2VyKHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdmcmFjdGlvbi1hZGQnOlxuICAgICAgICB0aGlzLmluaXRGcmFjdGlvbkFkZCh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnZnJhY3Rpb24tbXVsdGlwbHknOlxuICAgICAgICB0aGlzLmluaXRGcmFjdGlvbk11bHRpcGx5KHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdhbGdlYnJhLWFkZCc6XG4gICAgICAgIHRoaXMuaW5pdEFsZ2VicmFBZGQodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2FsZ2VicmEtbXVsdGlwbHknOlxuICAgICAgICB0aGlzLmluaXRBbGdlYnJhTXVsdGlwbHkodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5leHBlY3RlZCBzd2l0Y2ggZGVmYXVsdCcpXG4gICAgfVxuXG4gICAgdGhpcy5jYWxjdWxhdGVFZGdlcygpIC8vIFVzZSBvcCBmdW5jdGlvbnMgdG8gZmlsbCBpbiB0aGUgZWRnZXNcbiAgICB0aGlzLmhpZGVMYWJlbHModGhpcy5zZXR0aW5ncy5wdXpfZGlmZikgLy8gc2V0IHNvbWUgdmVydGljZXMvZWRnZXMgYXMgaGlkZGVuIGRlcGVuZGluZyBvbiBkaWZmaWN1bHR5XG4gIH1cblxuICAvKiBNZXRob2RzIGluaXRpYWxpc2luZyB2ZXJ0aWNlcyAqL1xuXG4gIGluaXRJbnRlZ2VyIChzZXR0aW5ncykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgIHZhbDogbmV3IEZyYWN0aW9uKHJhbmRCZXR3ZWVuRmlsdGVyKFxuICAgICAgICAgIHNldHRpbmdzLm1pbixcbiAgICAgICAgICBzZXR0aW5ncy5tYXgsXG4gICAgICAgICAgeCA9PiAoc2V0dGluZ3MudHlwZS5lbmRzV2l0aCgnYWRkJykgfHwgeCAhPT0gMClcbiAgICAgICAgKSksXG4gICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0RnJhY3Rpb25BZGQgKHNldHRpbmdzKSB7XG4gICAgLyogRGlmZmljdWx0eSBzZXR0aW5nczpcbiAgICAgKiAxOiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggc2FtZSBkZW5vbWluYXRvciwgbm8gY2FuY2VsbGluZyBhZnRlciBET05FXG4gICAgICogMjogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIHNhbWUgZGVub21pbmF0b3IsIG5vIGNhbmNlbGxsaW5nIGFuc3dlciBpbXByb3BlciBmcmFjdGlvblxuICAgICAqIDM6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBvbmUgZGVub21pbmF0b3IgYSBtdWx0aXBsZSBvZiBhbm90aGVyLCBnaXZlcyBwcm9wZXIgZnJhY3Rpb25cbiAgICAgKiA0OiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggb25lIGRlbm9taW5hdG9yIGEgbXVsdGlwbGUgb2YgYW5vdGhlciwgZ2l2ZXMgaW1wcm9wZXIgZnJhY3Rpb25cbiAgICAgKiA1OiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggZGlmZmVyZW50IGRlbm9taW5hdG9ycyAobm90IGNvLXByaW1lKSwgZ2l2ZXMgaW1wcm9wZXIgZnJhY3Rpb25cbiAgICAgKiA2OiBtaXhlZCBudW1iZXJzXG4gICAgICogNzogbWl4ZWQgbnVtYmVycywgYmlnZ2VyIG51bWVyYXRvcnMgYW5kIGRlbm9taW5hdG9yc1xuICAgICAqIDg6IG1peGVkIG51bWJlcnMsIGJpZyBpbnRlZ2VyIHBhcnRzXG4gICAgICovXG5cbiAgICAvLyBUT0RPIC0gYW55dGhpbmcgb3RoZXIgdGhhbiBkaWZmaWN1bHR5IDEuXG4gICAgY29uc3QgZGlmZiA9IHNldHRpbmdzLm51bV9kaWZmXG4gICAgaWYgKGRpZmYgPCAzKSB7XG4gICAgICBjb25zdCBkZW4gPSByYW5kRWxlbShbNSwgNywgOSwgMTEsIDEzLCAxN10pXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHByZXZudW0gPSB0aGlzLnZlcnRpY2VzW2kgLSAxXVxuICAgICAgICAgID8gdGhpcy52ZXJ0aWNlc1tpIC0gMV0udmFsLm4gOiB1bmRlZmluZWRcbiAgICAgICAgY29uc3QgbmV4dG51bSA9IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl0udmFsLm4gOiB1bmRlZmluZWRcblxuICAgICAgICBjb25zdCBtYXhudW0gPVxuICAgICAgICAgIGRpZmYgPT09IDIgPyBkZW4gLSAxXG4gICAgICAgICAgICA6IG5leHRudW0gPyBkZW4gLSBNYXRoLm1heChuZXh0bnVtLCBwcmV2bnVtKVxuICAgICAgICAgICAgICA6IHByZXZudW0gPyBkZW4gLSBwcmV2bnVtXG4gICAgICAgICAgICAgICAgOiBkZW4gLSAxXG5cbiAgICAgICAgY29uc3QgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoMSwgbWF4bnVtLCB4ID0+IChcbiAgICAgICAgICAvLyBFbnN1cmVzIG5vIHNpbXBsaWZpbmcgYWZ0ZXJ3YXJkcyBpZiBkaWZmaWN1bHR5IGlzIDFcbiAgICAgICAgICBnY2QoeCwgZGVuKSA9PT0gMSAmJlxuICAgICAgICAgICghcHJldm51bSB8fCBnY2QoeCArIHByZXZudW0sIGRlbikgPT09IDEgfHwgeCArIHByZXZudW0gPT09IGRlbikgJiZcbiAgICAgICAgICAoIW5leHRudW0gfHwgZ2NkKHggKyBuZXh0bnVtLCBkZW4pID09PSAxIHx8IHggKyBuZXh0bnVtID09PSBkZW4pXG4gICAgICAgICkpXG5cbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihudW0sIGRlbiksXG4gICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGRlbmJhc2UgPSByYW5kRWxlbShcbiAgICAgICAgZGlmZiA8IDcgPyBbMiwgMywgNV0gOiBbMiwgMywgNCwgNSwgNiwgNywgOCwgOSwgMTAsIDExXVxuICAgICAgKVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICBjb25zdCBwcmV2ID0gdGhpcy52ZXJ0aWNlc1tpIC0gMV1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbaSAtIDFdLnZhbCA6IHVuZGVmaW5lZFxuICAgICAgICBjb25zdCBuZXh0ID0gdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXVxuICAgICAgICAgID8gdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXS52YWwgOiB1bmRlZmluZWRcblxuICAgICAgICBjb25zdCBtYXhtdWx0aXBsaWVyID0gZGlmZiA8IDcgPyA0IDogOFxuXG4gICAgICAgIGNvbnN0IG11bHRpcGxpZXIgPVxuICAgICAgICAgIGkgJSAyID09PSAxIHx8IGRpZmYgPiA0ID8gcmFuZEJldHdlZW5GaWx0ZXIoMiwgbWF4bXVsdGlwbGllciwgeCA9PlxuICAgICAgICAgICAgKCFwcmV2IHx8IHggIT09IHByZXYuZCAvIGRlbmJhc2UpICYmXG4gICAgICAgICAgICAoIW5leHQgfHwgeCAhPT0gbmV4dC5kIC8gZGVuYmFzZSlcbiAgICAgICAgICApIDogMVxuXG4gICAgICAgIGNvbnN0IGRlbiA9IGRlbmJhc2UgKiBtdWx0aXBsaWVyXG5cbiAgICAgICAgbGV0IG51bVxuICAgICAgICBpZiAoZGlmZiA8IDYpIHtcbiAgICAgICAgICBudW0gPSByYW5kQmV0d2VlbkZpbHRlcigxLCBkZW4gLSAxLCB4ID0+IChcbiAgICAgICAgICAgIGdjZCh4LCBkZW4pID09PSAxICYmXG4gICAgICAgICAgICAoZGlmZiA+PSA0IHx8ICFwcmV2IHx8IHByZXYuYWRkKHgsIGRlbikgPD0gMSkgJiZcbiAgICAgICAgICAgIChkaWZmID49IDQgfHwgIW5leHQgfHwgbmV4dC5hZGQoeCwgZGVuKSA8PSAxKVxuICAgICAgICAgICkpXG4gICAgICAgIH0gZWxzZSBpZiAoZGlmZiA8IDgpIHtcbiAgICAgICAgICBudW0gPSByYW5kQmV0d2VlbkZpbHRlcihkZW4gKyAxLCBkZW4gKiA2LCB4ID0+IGdjZCh4LCBkZW4pID09PSAxKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKGRlbiAqIDEwLCBkZW4gKiAxMDAsIHggPT4gZ2NkKHgsIGRlbikgPT09IDEpXG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgIHZhbDogbmV3IEZyYWN0aW9uKG51bSwgZGVuKSxcbiAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0RnJhY3Rpb25NdWx0aXBseSAoc2V0dGluZ3MpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICBjb25zdCBkID0gcmFuZEJldHdlZW4oMiwgMTApXG4gICAgICBjb25zdCBuID0gcmFuZEJldHdlZW4oMSwgZCAtIDEpXG4gICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihuLCBkKSxcbiAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRBbGdlYnJhQWRkIChzZXR0aW5ncykge1xuICAgIGNvbnN0IGRpZmYgPSBzZXR0aW5ncy5udW1fZGlmZlxuICAgIHN3aXRjaCAoZGlmZikge1xuICAgICAgY2FzZSAxOiB7XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbChjb2VmZiArIHZhcmlhYmxlKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjpcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgaWYgKE1hdGgucmFuZG9tKCkgPCAwLjUpIHsgLy8gdmFyaWFibGUgKyBjb25zdGFudFxuICAgICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgICBjb25zdCBjb25zdGFudCA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmICsgdmFyaWFibGUgKyAnKycgKyBjb25zdGFudCksXG4gICAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgdmFyaWFibGUxID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgICBsZXQgdmFyaWFibGUyID0gdmFyaWFibGUxXG4gICAgICAgICAgd2hpbGUgKHZhcmlhYmxlMiA9PT0gdmFyaWFibGUxKSB7XG4gICAgICAgICAgICB2YXJpYWJsZTIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGNvZWZmMSA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgICBjb25zdCBjb2VmZjIgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbChjb2VmZjEgKyB2YXJpYWJsZTEgKyAnKycgKyBjb2VmZjIgKyB2YXJpYWJsZTIpLFxuICAgICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEFsZ2VicmFNdWx0aXBseSAoc2V0dGluZ3MpIHtcbiAgICAvKiBEaWZmaWN1bHR5OlxuICAgICAqIDE6IEFsdGVybmF0ZSAzYSB3aXRoIDRcbiAgICAgKiAyOiBBbGwgdGVybXMgb2YgdGhlIGZvcm0gbnYgLSB1cCB0byB0d28gdmFyaWFibGVzXG4gICAgICogMzogQWxsIHRlcm1zIG9mIHRoZSBmb3JtIG52Xm0uIE9uZSB2YXJpYWJsZSBvbmx5XG4gICAgICogNDogQUxsIHRlcm1zIG9mIHRoZSBmb3JtIG54XmsgeV5sIHpecC4gayxsLHAgMC0zXG4gICAgICogNTogRXhwYW5kIGJyYWNrZXRzIDMoMngrNSlcbiAgICAgKiA2OiBFeHBhbmQgYnJhY2tldHMgM3goMngrNSlcbiAgICAgKiA3OiBFeHBhbmQgYnJhY2tldHMgM3heMnkoMnh5KzV5XjIpXG4gICAgICogODogRXhwYW5kIGJyYWNrZXRzICh4KzMpKHgrMilcbiAgICAgKiA5OiBFeHBhbmQgYnJhY2tldHMgKDJ4LTMpKDN4KzQpXG4gICAgICogMTA6IEV4cGFuZCBicmFja2V0cyAoMnheMi0zeCs0KSgyeC01KVxuICAgICAqL1xuICAgIGNvbnN0IGRpZmYgPSBzZXR0aW5ncy5udW1fZGlmZlxuICAgIHN3aXRjaCAoZGlmZikge1xuICAgICAgY2FzZSAxOlxuICAgICAge1xuICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgdGVybSA9IGkgJSAyID09PSAwID8gY29lZmYgOiBjb2VmZiArIHZhcmlhYmxlXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgMjoge1xuICAgICAgICBjb25zdCB2YXJpYWJsZTEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBjb25zdCB2YXJpYWJsZTIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IHZhcmlhYmxlID0gcmFuZEVsZW0oW3ZhcmlhYmxlMSwgdmFyaWFibGUyXSlcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbChjb2VmZiArIHZhcmlhYmxlKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSAzOiB7XG4gICAgICAgIGNvbnN0IHYgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IGlkeCA9IHJhbmRCZXR3ZWVuKDEsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbChjb2VmZiArIHYgKyAnXicgKyBpZHgpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDQ6IHtcbiAgICAgICAgY29uc3Qgc3RhcnRBc2NpaSA9IHJhbmRCZXR3ZWVuKDk3LCAxMjApXG4gICAgICAgIGNvbnN0IHYxID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpKVxuICAgICAgICBjb25zdCB2MiA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSArIDEpXG4gICAgICAgIGNvbnN0IHYzID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpICsgMilcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4xID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4yID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4zID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IHRlcm0gPSBhICsgdjEgKyBuMSArIHYyICsgbjIgKyB2MyArIG4zXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgNTpcbiAgICAgIGNhc2UgNjogeyAvLyBlLmcuIDMoeCkgKiAoMngtNSlcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IGNvbnN0YW50ID0gcmFuZEJldHdlZW4oLTksIDkpLnRvU3RyaW5nKClcbiAgICAgICAgICBsZXQgdGVybSA9IGNvZWZmXG4gICAgICAgICAgaWYgKGRpZmYgPT09IDYgfHwgaSAlIDIgPT09IDEpIHRlcm0gKz0gdmFyaWFibGVcbiAgICAgICAgICBpZiAoaSAlIDIgPT09IDEpIHRlcm0gKz0gJysnICsgY29uc3RhbnRcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh0ZXJtKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSA3OiB7IC8vIGUuZy4gM3heMnkoNHh5XjIrNXh5KVxuICAgICAgICBjb25zdCBzdGFydEFzY2lpID0gcmFuZEJldHdlZW4oOTcsIDEyMClcbiAgICAgICAgY29uc3QgdjEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkpXG4gICAgICAgIGNvbnN0IHYyID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpICsgMSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGExID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMTEgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjEyID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIGxldCB0ZXJtID0gYTEgKyB2MSArIG4xMSArIHYyICsgbjEyXG4gICAgICAgICAgaWYgKGkgJSAyID09PSAxKSB7XG4gICAgICAgICAgICBjb25zdCBhMiA9IHJhbmRCZXR3ZWVuKC05LCA5KS50b1N0cmluZygpXG4gICAgICAgICAgICBjb25zdCBuMjEgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgICBjb25zdCBuMjIgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgICB0ZXJtICs9ICcrJyArIGEyICsgdjEgKyBuMjEgKyB2MiArIG4yMlxuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh0ZXJtKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSA4OiAvLyB7IGUuZy4gKHgrNSkgKiAoeC0yKVxuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb25zdGFudCA9IHJhbmRCZXR3ZWVuKC05LCA5KS50b1N0cmluZygpXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodmFyaWFibGUgKyAnKycgKyBjb25zdGFudCksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyogTWV0aG9kIHRvIGNhbGN1bGF0ZSBlZGdlcyBmcm9tIHZlcnRpY2VzICovXG4gIGNhbGN1bGF0ZUVkZ2VzICgpIHtcbiAgICAvLyBDYWxjdWxhdGUgdGhlIGVkZ2VzIGdpdmVuIHRoZSB2ZXJ0aWNlcyB1c2luZyB0aGlzLm9wXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgdGhpcy5zaWRlc1tpXSA9IHtcbiAgICAgICAgdmFsOiB0aGlzLm9wKHRoaXMudmVydGljZXNbaV0udmFsLCB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dLnZhbCksXG4gICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiBNYXJrIGhpZGRlbmQgZWRnZXMvdmVydGljZXMgKi9cblxuICBoaWRlTGFiZWxzIChwdXp6bGVEaWZmaWN1bHR5KSB7XG4gICAgLy8gSGlkZSBzb21lIGxhYmVscyB0byBtYWtlIGEgcHV6emxlXG4gICAgLy8gMSAtIFNpZGVzIGhpZGRlbiwgdmVydGljZXMgc2hvd25cbiAgICAvLyAyIC0gU29tZSBzaWRlcyBoaWRkZW4sIHNvbWUgdmVydGljZXMgaGlkZGVuXG4gICAgLy8gMyAtIEFsbCB2ZXJ0aWNlcyBoaWRkZW5cbiAgICBzd2l0Y2ggKHB1enpsZURpZmZpY3VsdHkpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgdGhpcy5zaWRlcy5mb3JFYWNoKHggPT4geyB4LmhpZGRlbiA9IHRydWUgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjoge1xuICAgICAgICB0aGlzLnNpZGVzLmZvckVhY2goeCA9PiB7IHguaGlkZGVuID0gdHJ1ZSB9KVxuICAgICAgICBjb25zdCBzaG93c2lkZSA9IHJhbmRCZXR3ZWVuKDAsIHRoaXMubiAtIDEsIE1hdGgucmFuZG9tKVxuICAgICAgICBjb25zdCBoaWRldmVydCA9IE1hdGgucmFuZG9tKCkgPCAwLjVcbiAgICAgICAgICA/IHNob3dzaWRlIC8vIHByZXZpb3VzIHZlcnRleFxuICAgICAgICAgIDogKHNob3dzaWRlICsgMSkgJSB0aGlzLm4gLy8gbmV4dCB2ZXJ0ZXg7XG5cbiAgICAgICAgdGhpcy5zaWRlc1tzaG93c2lkZV0uaGlkZGVuID0gZmFsc2VcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1toaWRldmVydF0uaGlkZGVuID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAzOlxuICAgICAgICB0aGlzLnZlcnRpY2VzLmZvckVhY2goeCA9PiB7IHguaGlkZGVuID0gdHJ1ZSB9KVxuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdub19kaWZmaWN1bHR5JylcbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgQXJpdGhtYWdvblFWaWV3IGV4dGVuZHMgR3JhcGhpY1FWaWV3IHtcbiAgY29uc3RydWN0b3IgKGRhdGEsIG9wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBzZXRzIHRoaXMud2lkdGggdGhpcy5oZWlnaHQsIGluaXRpYWxpc2VzIHRoaXMubGFiZWxzLCBjcmVhdGVzIGRvbSBlbGVtZW50c1xuXG4gICAgY29uc3Qgd2lkdGggPSB0aGlzLndpZHRoXG4gICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5oZWlnaHRcbiAgICBjb25zdCByID0gMC4zNSAqIE1hdGgubWluKHdpZHRoLCBoZWlnaHQpIC8vIHJhZGl1c1xuICAgIGNvbnN0IG4gPSB0aGlzLmRhdGEublxuXG4gICAgLy8gQSBwb2ludCB0byBsYWJlbCB3aXRoIHRoZSBvcGVyYXRpb25cbiAgICAvLyBBbGwgcG9pbnRzIGZpcnN0IHNldCB1cCB3aXRoICgwLDApIGF0IGNlbnRlclxuICAgIHRoaXMub3BlcmF0aW9uUG9pbnQgPSBuZXcgUG9pbnQoMCwgMClcblxuICAgIC8vIFBvc2l0aW9uIG9mIHZlcnRpY2VzXG4gICAgdGhpcy52ZXJ0ZXhQb2ludHMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBjb25zdCBhbmdsZSA9IGkgKiBNYXRoLlBJICogMiAvIG4gLSBNYXRoLlBJIC8gMlxuICAgICAgdGhpcy52ZXJ0ZXhQb2ludHNbaV0gPSBQb2ludC5mcm9tUG9sYXIociwgYW5nbGUpXG4gICAgfVxuXG4gICAgLy8gUG9pc2l0aW9uIG9mIHNpZGUgbGFiZWxzXG4gICAgdGhpcy5zaWRlUG9pbnRzID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgdGhpcy5zaWRlUG9pbnRzW2ldID0gUG9pbnQubWVhbih0aGlzLnZlcnRleFBvaW50c1tpXSwgdGhpcy52ZXJ0ZXhQb2ludHNbKGkgKyAxKSAlIG5dKVxuICAgIH1cblxuICAgIHRoaXMuYWxsUG9pbnRzID0gW3RoaXMub3BlcmF0aW9uUG9pbnRdLmNvbmNhdCh0aGlzLnZlcnRleFBvaW50cykuY29uY2F0KHRoaXMuc2lkZVBvaW50cylcblxuICAgIHRoaXMucmVDZW50ZXIoKSAvLyBSZXBvc2l0aW9uIGV2ZXJ5dGhpbmcgcHJvcGVybHlcblxuICAgIHRoaXMubWFrZUxhYmVscyh0cnVlKVxuXG4gICAgLy8gRHJhdyBpbnRvIGNhbnZhc1xuICB9XG5cbiAgcmVDZW50ZXIgKCkge1xuICAgIC8vIEZpbmQgdGhlIGNlbnRlciBvZiB0aGUgYm91bmRpbmcgYm94XG4gICAgY29uc3QgdG9wbGVmdCA9IFBvaW50Lm1pbih0aGlzLmFsbFBvaW50cylcbiAgICBjb25zdCBib3R0b21yaWdodCA9IFBvaW50Lm1heCh0aGlzLmFsbFBvaW50cylcbiAgICBjb25zdCBjZW50ZXIgPSBQb2ludC5tZWFuKHRvcGxlZnQsIGJvdHRvbXJpZ2h0KVxuXG4gICAgLy8gdHJhbnNsYXRlIHRvIHB1dCBpbiB0aGUgY2VudGVyXG4gICAgdGhpcy5hbGxQb2ludHMuZm9yRWFjaChwID0+IHtcbiAgICAgIHAudHJhbnNsYXRlKHRoaXMud2lkdGggLyAyIC0gY2VudGVyLngsIHRoaXMuaGVpZ2h0IC8gMiAtIGNlbnRlci55KVxuICAgIH0pXG4gIH1cblxuICBtYWtlTGFiZWxzICgpIHtcbiAgICAvLyB2ZXJ0aWNlc1xuICAgIHRoaXMuZGF0YS52ZXJ0aWNlcy5mb3JFYWNoKCh2LCBpKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHYudmFsLnRvTGF0ZXhcbiAgICAgICAgPyB2LnZhbC50b0xhdGV4KHRydWUpXG4gICAgICAgIDogdi52YWwudG9TdHJpbmcoKVxuICAgICAgdGhpcy5sYWJlbHMucHVzaCh7XG4gICAgICAgIHBvczogdGhpcy52ZXJ0ZXhQb2ludHNbaV0sXG4gICAgICAgIHRleHRxOiB2LmhpZGRlbiA/ICcnIDogdmFsdWUsXG4gICAgICAgIHRleHRhOiB2YWx1ZSxcbiAgICAgICAgc3R5bGVxOiAnbm9ybWFsIHZlcnRleCcsXG4gICAgICAgIHN0eWxlYTogdi5oaWRkZW4gPyAnYW5zd2VyIHZlcnRleCcgOiAnbm9ybWFsIHZlcnRleCdcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIC8vIHNpZGVzXG4gICAgdGhpcy5kYXRhLnNpZGVzLmZvckVhY2goKHYsIGkpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gdi52YWwudG9MYXRleFxuICAgICAgICA/IHYudmFsLnRvTGF0ZXgodHJ1ZSlcbiAgICAgICAgOiB2LnZhbC50b1N0cmluZygpXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKHtcbiAgICAgICAgcG9zOiB0aGlzLnNpZGVQb2ludHNbaV0sXG4gICAgICAgIHRleHRxOiB2LmhpZGRlbiA/ICcnIDogdmFsdWUsXG4gICAgICAgIHRleHRhOiB2YWx1ZSxcbiAgICAgICAgc3R5bGVxOiAnbm9ybWFsIHNpZGUnLFxuICAgICAgICBzdHlsZWE6IHYuaGlkZGVuID8gJ2Fuc3dlciBzaWRlJyA6ICdub3JtYWwgc2lkZSdcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIC8vIG9wZXJhdGlvblxuICAgIHRoaXMubGFiZWxzLnB1c2goe1xuICAgICAgcG9zOiB0aGlzLm9wZXJhdGlvblBvaW50LFxuICAgICAgdGV4dHE6IHRoaXMuZGF0YS5vcG5hbWUsXG4gICAgICB0ZXh0YTogdGhpcy5kYXRhLm9wbmFtZSxcbiAgICAgIHN0eWxlcTogJ25vcm1hbCcsXG4gICAgICBzdHlsZWE6ICdub3JtYWwnXG4gICAgfSlcblxuICAgIC8vIHN0eWxpbmdcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgfVxuXG4gIHJlbmRlciAoKSB7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICAgIGNvbnN0IG4gPSB0aGlzLmRhdGEublxuXG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KSAvLyBjbGVhclxuXG4gICAgY3R4LmJlZ2luUGF0aCgpXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIGNvbnN0IHAgPSB0aGlzLnZlcnRleFBvaW50c1tpXVxuICAgICAgY29uc3QgbmV4dCA9IHRoaXMudmVydGV4UG9pbnRzWyhpICsgMSkgJSBuXVxuICAgICAgY3R4Lm1vdmVUbyhwLngsIHAueSlcbiAgICAgIGN0eC5saW5lVG8obmV4dC54LCBuZXh0LnkpXG4gICAgfVxuICAgIGN0eC5zdHJva2UoKVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgLy8gcGxhY2UgbGFiZWxzXG4gICAgdGhpcy5yZW5kZXJMYWJlbHModHJ1ZSlcbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkge1xuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRhXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZWFcbiAgICB9KVxuICAgIHRoaXMucmVuZGVyTGFiZWxzKHRydWUpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IHRydWVcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkge1xuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRxXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZXFcbiAgICB9KVxuICAgIHRoaXMucmVuZGVyTGFiZWxzKHRydWUpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gIH1cbn1cbiIsImltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCB7IHJhbmRFbGVtIH0gZnJvbSAndXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUZXN0USBleHRlbmRzIFRleHRRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiA1LFxuICAgICAgbGFiZWw6ICdhJyxcbiAgICAgIHRlc3QxOiBbJ2ZvbyddLFxuICAgICAgdGVzdDI6IHRydWVcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIHRoaXMubGFiZWwgPSBzZXR0aW5ncy5sYWJlbFxuXG4gICAgLy8gcGljayBhIHJhbmRvbSBvbmUgb2YgdGhlIHNlbGVjdGVkXG4gICAgbGV0IHRlc3QxXG4gICAgaWYgKHNldHRpbmdzLnRlc3QxLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGVzdDEgPSAnbm9uZSdcbiAgICB9IGVsc2Uge1xuICAgICAgdGVzdDEgPSByYW5kRWxlbShzZXR0aW5ncy50ZXN0MSlcbiAgICB9XG5cbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnZDogJyArIHNldHRpbmdzLmRpZmZpY3VsdHkgKyAnXFxcXFxcXFwgdGVzdDE6ICcgKyB0ZXN0MVxuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAndGVzdDI6ICcgKyBzZXR0aW5ncy50ZXN0MlxuXG4gICAgdGhpcy5yZW5kZXIoKVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7IHJldHVybiAnVGVzdCBjb21tYW5kIHdvcmQnIH1cbn1cblxuVGVzdFEub3B0aW9uc1NwZWMgPSBbXG4gIHtcbiAgICB0aXRsZTogJ1Rlc3Qgb3B0aW9uIDEnLFxuICAgIGlkOiAndGVzdDEnLFxuICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbJ2ZvbycsICdiYXInLCAnd2l6eiddLFxuICAgIGRlZmF1bHQ6IFtdXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1Rlc3Qgb3B0aW9uIDInLFxuICAgIGlkOiAndGVzdDInLFxuICAgIHR5cGU6ICdib29sJyxcbiAgICBkZWZhdWx0OiB0cnVlXG4gIH1cbl1cbiIsImltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCB7IHJhbmRCZXR3ZWVuIH0gZnJvbSAndXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBZGRBWmVybyBleHRlbmRzIFRleHRRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiA1LFxuICAgICAgbGFiZWw6ICdhJ1xuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyByYW5kb20gMiBkaWdpdCAnZGVjaW1hbCdcbiAgICBjb25zdCBxID0gU3RyaW5nKHJhbmRCZXR3ZWVuKDEsIDkpKSArIFN0cmluZyhyYW5kQmV0d2VlbigwLCA5KSkgKyAnLicgKyBTdHJpbmcocmFuZEJldHdlZW4oMCwgOSkpXG4gICAgY29uc3QgYSA9IHEgKyAnMCdcblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9IHEgKyAnXFxcXHRpbWVzIDEwJ1xuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPSAnICsgYVxuXG4gICAgdGhpcy5yZW5kZXIoKVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdFdmFsdWF0ZSdcbiAgfVxufVxuXG5BZGRBWmVyby5vcHRpb25zU3BlYyA9IFtcbl1cbiIsImltcG9ydCB7IHJhbmRCZXR3ZWVuIH0gZnJvbSAndXRpbGl0aWVzJ1xuaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuaW1wb3J0IEZyYWN0aW9uIGZyb20gJ3ZlbmRvci9mcmFjdGlvbidcblxuLyogTWFpbiBxdWVzdGlvbiBjbGFzcy4gVGhpcyB3aWxsIGJlIHNwdW4gb2ZmIGludG8gZGlmZmVyZW50IGZpbGUgYW5kIGdlbmVyYWxpc2VkICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFcXVhdGlvbk9mTGluZSBleHRlbmRzIFRleHRRIHtcbiAgLy8gJ2V4dGVuZHMnIFF1ZXN0aW9uLCBidXQgbm90aGluZyB0byBhY3R1YWxseSBleHRlbmRcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICAvLyBib2lsZXJwbGF0ZVxuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDJcbiAgICB9XG5cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuICAgIGNvbnN0IGRpZmZpY3VsdHkgPSBNYXRoLmNlaWwoc2V0dGluZ3MuZGlmZmljdWx0eSAvIDIpIC8vIGluaXRpYWxseSB3cml0dGVuIGZvciBkaWZmaWN1bHR5IDEtNCwgbm93IG5lZWQgMS0xMFxuXG4gICAgLy8gcXVlc3Rpb24gZ2VuZXJhdGlvbiBiZWdpbnMgaGVyZVxuICAgIGxldCBtLCBjLCB4MSwgeTEsIHgyLCB5MlxuICAgIGxldCBtaW5tLCBtYXhtLCBtaW5jLCBtYXhjXG5cbiAgICBzd2l0Y2ggKGRpZmZpY3VsdHkpIHtcbiAgICAgIGNhc2UgMTogLy8gbT4wLCBjPj0wXG4gICAgICBjYXNlIDI6XG4gICAgICBjYXNlIDM6XG4gICAgICAgIG1pbm0gPSBkaWZmaWN1bHR5IDwgMyA/IDEgOiAtNVxuICAgICAgICBtYXhtID0gNVxuICAgICAgICBtaW5jID0gZGlmZmljdWx0eSA8IDIgPyAwIDogLTEwXG4gICAgICAgIG1heGMgPSAxMFxuICAgICAgICBtID0gcmFuZEJldHdlZW4obWlubSwgbWF4bSlcbiAgICAgICAgYyA9IHJhbmRCZXR3ZWVuKG1pbmMsIG1heGMpXG4gICAgICAgIHgxID0gZGlmZmljdWx0eSA8IDMgPyByYW5kQmV0d2VlbigwLCAxMCkgOiByYW5kQmV0d2VlbigtMTUsIDE1KVxuICAgICAgICB5MSA9IG0gKiB4MSArIGNcblxuICAgICAgICBpZiAoZGlmZmljdWx0eSA8IDMpIHtcbiAgICAgICAgICB4MiA9IHJhbmRCZXR3ZWVuKHgxICsgMSwgMTUpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgeDIgPSB4MVxuICAgICAgICAgIHdoaWxlICh4MiA9PT0geDEpIHsgeDIgPSByYW5kQmV0d2VlbigtMTUsIDE1KSB9O1xuICAgICAgICB9XG4gICAgICAgIHkyID0gbSAqIHgyICsgY1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA0OiAvLyBtIGZyYWN0aW9uLCBwb2ludHMgYXJlIGludGVnZXJzXG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGNvbnN0IG1kID0gcmFuZEJldHdlZW4oMSwgNSlcbiAgICAgICAgY29uc3QgbW4gPSByYW5kQmV0d2VlbigtNSwgNSlcbiAgICAgICAgbSA9IG5ldyBGcmFjdGlvbihtbiwgbWQpXG4gICAgICAgIHgxID0gbmV3IEZyYWN0aW9uKHJhbmRCZXR3ZWVuKC0xMCwgMTApKVxuICAgICAgICB5MSA9IG5ldyBGcmFjdGlvbihyYW5kQmV0d2VlbigtMTAsIDEwKSlcbiAgICAgICAgYyA9IG5ldyBGcmFjdGlvbih5MSkuc3ViKG0ubXVsKHgxKSlcbiAgICAgICAgeDIgPSB4MS5hZGQocmFuZEJldHdlZW4oMSwgNSkgKiBtLmQpXG4gICAgICAgIHkyID0gbS5tdWwoeDIpLmFkZChjKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHhzdHIgPVxuICAgICAgKG0gPT09IDAgfHwgKG0uZXF1YWxzICYmIG0uZXF1YWxzKDApKSkgPyAnJ1xuICAgICAgICA6IChtID09PSAxIHx8IChtLmVxdWFscyAmJiBtLmVxdWFscygxKSkpID8gJ3gnXG4gICAgICAgICAgOiAobSA9PT0gLTEgfHwgKG0uZXF1YWxzICYmIG0uZXF1YWxzKC0xKSkpID8gJy14J1xuICAgICAgICAgICAgOiAobS50b0xhdGV4KSA/IG0udG9MYXRleCgpICsgJ3gnXG4gICAgICAgICAgICAgIDogKG0gKyAneCcpXG5cbiAgICBjb25zdCBjb25zdHN0ciA9IC8vIFRPRE86IFdoZW4gbT1jPTBcbiAgICAgIChjID09PSAwIHx8IChjLmVxdWFscyAmJiBjLmVxdWFscygwKSkpID8gJydcbiAgICAgICAgOiAoYyA8IDApID8gKCcgLSAnICsgKGMubmVnID8gYy5uZWcoKS50b0xhdGV4KCkgOiAtYykpXG4gICAgICAgICAgOiAoYy50b0xhdGV4KSA/ICgnICsgJyArIGMudG9MYXRleCgpKVxuICAgICAgICAgICAgOiAoJyArICcgKyBjKVxuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gJygnICsgeDEgKyAnLCAnICsgeTEgKyAnKVxcXFx0ZXh0eyBhbmQgfSgnICsgeDIgKyAnLCAnICsgeTIgKyAnKSdcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJ3kgPSAnICsgeHN0ciArIGNvbnN0c3RyXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ0ZpbmQgdGhlIGVxdWF0aW9uIG9mIHRoZSBsaW5lIHRocm91Z2gnXG4gIH1cbn1cbiIsIi8qIFJlbmRlcnMgbWlzc2luZyBhbmdsZXMgcHJvYmxlbSB3aGVuIHRoZSBhbmdsZXMgYXJlIGF0IGEgcG9pbnRcbiAqIEkuZS4gb24gYSBzdHJhaWdodCBsaW5lIG9yIGFyb3VuZCBhIHBvaW50XG4gKiBDb3VsZCBhbHNvIGJlIGFkYXB0ZWQgdG8gYW5nbGVzIGZvcm1pbmcgYSByaWdodCBhbmdsZVxuICpcbiAqIFNob3VsZCBiZSBmbGV4aWJsZSBlbm91Z2ggZm9yIG51bWVyaWNhbCBwcm9ibGVtcyBvciBhbGdlYnJhaWMgb25lc1xuICpcbiAqL1xuXG5pbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBHcmFwaGljUVZpZXcsIExhYmVsIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgeyByb3VuZERQIH0gZnJvbSAndXRpbGl0aWVzJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNOdW1iZXJEYXRhJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzVmlld09wdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGV4dGVuZHMgR3JhcGhpY1FWaWV3IHtcbiAgcmFkaXVzOiBudW1iZXJcbiAgTzogUG9pbnRcbiAgQTogUG9pbnRcbiAgQzogUG9pbnRbXVxuICB2aWV3QW5nbGVzOiBudW1iZXJbXSAvLyAnZnVkZ2VkJyB2ZXJzaW9ucyBvZiBkYXRhLmFuZ2xlcyBmb3IgZGlzcGxheVxuICBkYXRhITogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgLy8gaW5pdGlhbGlzZWQgaW4gc3VwZXIgY2FsbFxuICByb3RhdGlvbjogbnVtYmVyXG5cbiAgY29uc3RydWN0b3IgKGRhdGEgOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSwgb3B0aW9ucyA6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIHNldHMgdGhpcy53aWR0aCB0aGlzLmhlaWdodCwgaW5pdGlhbGlzZXMgdGhpcy5sYWJlbHMsIGNyZWF0ZXMgZG9tIGVsZW1lbnRzXG4gICAgY29uc3Qgd2lkdGggPSB0aGlzLndpZHRoXG4gICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5oZWlnaHRcbiAgICBjb25zdCByYWRpdXMgPSB0aGlzLnJhZGl1cyA9IE1hdGgubWluKHdpZHRoLCBoZWlnaHQpIC8gMi41XG4gICAgY29uc3QgbWluVmlld0FuZ2xlID0gb3B0aW9ucy5taW5WaWV3QW5nbGUgfHwgMjVcblxuICAgIHRoaXMudmlld0FuZ2xlcyA9IGZ1ZGdlQW5nbGVzKHRoaXMuZGF0YS5hbmdsZXMsIG1pblZpZXdBbmdsZSlcblxuICAgIC8vIFNldCB1cCBtYWluIHBvaW50c1xuICAgIHRoaXMuTyA9IG5ldyBQb2ludCgwLCAwKSAvLyBjZW50ZXIgcG9pbnRcbiAgICB0aGlzLkEgPSBuZXcgUG9pbnQocmFkaXVzLCAwKSAvLyBmaXJzdCBwb2ludFxuICAgIHRoaXMuQyA9IFtdIC8vIFBvaW50cyBhcm91bmQgb3V0c2lkZVxuICAgIGxldCB0b3RhbGFuZ2xlID0gMCAvLyBuYiBpbiByYWRpYW5zXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmRhdGEuYW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0b3RhbGFuZ2xlICs9IHRoaXMudmlld0FuZ2xlc1tpXSAqIE1hdGguUEkgLyAxODBcbiAgICAgIHRoaXMuQ1tpXSA9IFBvaW50LmZyb21Qb2xhcihyYWRpdXMsIHRvdGFsYW5nbGUpXG4gICAgfVxuXG4gICAgLy8gUmFuZG9tbHkgcm90YXRlIGFuZCBjZW50ZXJcbiAgICB0aGlzLnJvdGF0aW9uID0gKG9wdGlvbnMucm90YXRpb24gIT09IHVuZGVmaW5lZCkgPyB0aGlzLnJvdGF0ZShvcHRpb25zLnJvdGF0aW9uKSA6IHRoaXMucmFuZG9tUm90YXRlKClcbiAgICAvLyB0aGlzLnNjYWxlVG9GaXQod2lkdGgsaGVpZ2h0LDEwKVxuICAgIHRoaXMudHJhbnNsYXRlKHdpZHRoIC8gMiwgaGVpZ2h0IC8gMilcblxuICAgIC8vIFNldCB1cCBsYWJlbHMgKGFmdGVyIHNjYWxpbmcgYW5kIHJvdGF0aW5nKVxuICAgIHRvdGFsYW5nbGUgPSBQb2ludC5hbmdsZUZyb20odGhpcy5PLCB0aGlzLkEpICogMTgwIC8gTWF0aC5QSSAvLyBhbmdsZSBmcm9tIE8gdGhhdCBBIGlzXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnZpZXdBbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIC8vIExhYmVsIHRleHRcbiAgICAgIGNvbnN0IGxhYmVsIDogUGFydGlhbDxMYWJlbD4gPSB7fVxuICAgICAgY29uc3QgdGV4dHEgPSB0aGlzLmRhdGEuYW5nbGVMYWJlbHNbaV1cbiAgICAgIGNvbnN0IHRleHRhID0gcm91bmREUCh0aGlzLmRhdGEuYW5nbGVzW2ldLCAyKS50b1N0cmluZygpICsgJ15cXFxcY2lyYydcblxuICAgICAgLy8gUG9zaXRpb25pbmdcbiAgICAgIGNvbnN0IHRoZXRhID0gdGhpcy52aWV3QW5nbGVzW2ldXG4gICAgICAvKiBjb3VsZCBiZSB1c2VkIGZvciBtb3JlIGFkdmFuY2VkIHBvc2l0aW9uaW5nXG4gICAgICBjb25zdCBtaWRBbmdsZSA9IHRvdGFsYW5nbGUgKyB0aGV0YSAvIDJcbiAgICAgIGNvbnN0IG1pbkRpc3RhbmNlID0gMC4zIC8vIGFzIGEgZnJhY3Rpb24gb2YgcmFkaXVzXG4gICAgICBjb25zdCBsYWJlbExlbmd0aCA9IE1hdGgubWF4KHRleHRxLmxlbmd0aCwgdGV4dGEubGVuZ3RoKSAtICdeXFxcXGNpcmMnLmxlbmd0aCAvLyDCsCB0YWtlcyB1cCB2ZXJ5IGxpdHRsZSBzcGFjZVxuICAgICAgKi9cblxuICAgICAgLyogRXhwbGFuYXRpb246IEZ1cnRoZXIgb3V0IGlmOlxuICAgICAgKiAgIE1vcmUgdmVydGljYWwgKHNpbihtaWRBbmdsZSkpXG4gICAgICAqICAgTG9uZ2VyIGxhYmVsXG4gICAgICAqICAgc21hbGxlciBhbmdsZVxuICAgICAgKiAgIEUuZy4gdG90YWxseSB2ZXJ0aWNhbCwgNDXCsCwgbGVuZ3RoID0gM1xuICAgICAgKiAgIGQgPSAwLjMgKyAxKjMvNDUgPSAwLjMgKyAwLjcgPSAwLjM3XG4gICAgICAqL1xuICAgICAgLy8gY29uc3QgZmFjdG9yID0gMSAgICAgICAgLy8gY29uc3RhbnQgb2YgcHJvcG9ydGlvbmFsaXR5LiBTZXQgYnkgdHJpYWwgYW5kIGVycm9yXG4gICAgICAvLyBsZXQgZGlzdGFuY2UgPSBtaW5EaXN0YW5jZSArIGZhY3RvciAqIE1hdGguYWJzKHNpbkRlZyhtaWRBbmdsZSkpICogbGFiZWxMZW5ndGggLyB0aGV0YVxuXG4gICAgICAvLyBKdXN0IHJldmVydCB0byBvbGQgbWV0aG9kXG5cbiAgICAgIGNvbnN0IGRpc3RhbmNlID0gMC40ICsgNiAvIHRoZXRhXG5cbiAgICAgIGxhYmVsLnBvcyA9IFBvaW50LmZyb21Qb2xhckRlZyhyYWRpdXMgKiBkaXN0YW5jZSwgdG90YWxhbmdsZSArIHRoZXRhIC8gMikudHJhbnNsYXRlKHRoaXMuTy54LCB0aGlzLk8ueSlcbiAgICAgIGxhYmVsLnRleHRxID0gdGV4dHFcbiAgICAgIGxhYmVsLnN0eWxlcSA9ICdub3JtYWwnXG5cbiAgICAgIGlmICh0aGlzLmRhdGEubWlzc2luZ1tpXSkge1xuICAgICAgICBsYWJlbC50ZXh0YSA9IHRleHRhXG4gICAgICAgIGxhYmVsLnN0eWxlYSA9ICdhbnN3ZXInXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsYWJlbC50ZXh0YSA9IGxhYmVsLnRleHRxXG4gICAgICAgIGxhYmVsLnN0eWxlYSA9IGxhYmVsLnN0eWxlcVxuICAgICAgfVxuXG4gICAgICBsYWJlbC50ZXh0ID0gbGFiZWwudGV4dHFcbiAgICAgIGxhYmVsLnN0eWxlID0gbGFiZWwuc3R5bGVxXG5cbiAgICAgIHRoaXMubGFiZWxzW2ldID0gbGFiZWwgYXMgTGFiZWxcblxuICAgICAgdG90YWxhbmdsZSArPSB0aGV0YVxuICAgIH1cblxuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRxXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZXFcbiAgICB9KVxuICB9XG5cbiAgcmVuZGVyICgpIDogdm9pZCB7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICAgIGlmIChjdHggPT09IG51bGwpIHsgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgZ2V0IGNhbnZhcyBjb250ZXh0JykgfVxuXG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KSAvLyBjbGVhclxuXG4gICAgY3R4LmJlZ2luUGF0aCgpXG4gICAgY3R4Lm1vdmVUbyh0aGlzLk8ueCwgdGhpcy5PLnkpIC8vIGRyYXcgbGluZXNcbiAgICBjdHgubGluZVRvKHRoaXMuQS54LCB0aGlzLkEueSlcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuQy5sZW5ndGg7IGkrKykge1xuICAgICAgY3R4Lm1vdmVUbyh0aGlzLk8ueCwgdGhpcy5PLnkpXG4gICAgICBjdHgubGluZVRvKHRoaXMuQ1tpXS54LCB0aGlzLkNbaV0ueSlcbiAgICB9XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gJ2dyYXknXG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBsZXQgdG90YWxhbmdsZSA9IHRoaXMucm90YXRpb25cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudmlld0FuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgdGhldGEgPSB0aGlzLnZpZXdBbmdsZXNbaV0gKiBNYXRoLlBJIC8gMTgwXG4gICAgICAvLyAwLjA3L3RoZXRhIHJhZGlhbnMgfj0gNC90aGV0YVxuICAgICAgY3R4LmFyYyh0aGlzLk8ueCwgdGhpcy5PLnksIHRoaXMucmFkaXVzICogKDAuMiArIDAuMDcgLyB0aGV0YSksIHRvdGFsYW5nbGUsIHRvdGFsYW5nbGUgKyB0aGV0YSlcbiAgICAgIGN0eC5zdHJva2UoKVxuICAgICAgdG90YWxhbmdsZSArPSB0aGV0YVxuICAgIH1cbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIC8vIHRlc3RpbmcgbGFiZWwgcG9zaXRpb25pbmc6XG4gICAgLy8gdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAvLyBjdHguZmlsbFN0eWxlID0gJ3JlZCdcbiAgICAvLyBjdHguZmlsbFJlY3QobC5wb3MueCAtIDEsIGwucG9zLnkgLSAxLCAzLCAzKVxuICAgIC8vIH0pXG5cbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGdldCBhbGxwb2ludHMgKCkgOiBQb2ludFtdIHtcbiAgICBsZXQgYWxscG9pbnRzID0gW3RoaXMuQSwgdGhpcy5PXVxuICAgIGFsbHBvaW50cyA9IGFsbHBvaW50cy5jb25jYXQodGhpcy5DKVxuICAgIHRoaXMubGFiZWxzLmZvckVhY2goZnVuY3Rpb24gKGwpIHtcbiAgICAgIGFsbHBvaW50cy5wdXNoKGwucG9zKVxuICAgIH0pXG4gICAgcmV0dXJuIGFsbHBvaW50c1xuICB9XG59XG5cbi8qKlxuICogQWRqdXN0cyBhIHNldCBvZiBhbmdsZXMgc28gdGhhdCBhbGwgYW5nbGVzIGFyZSBncmVhdGVyIHRoYW4ge21pbkFuZ2xlfSBieSByZWR1Y2luZyBvdGhlciBhbmdsZXMgaW4gcHJvcG9ydGlvblxuICogQHBhcmFtIGFuZ2xlcyBUaGUgc2V0IG9mIGFuZ2xlcyB0byBhZGp1c3RcbiAqIEBwYXJhbSBtaW5BbmdsZSBUaGUgc21hbGxlc3QgYW5nbGUgaW4gdGhlIG91dHB1dFxuICovXG5mdW5jdGlvbiBmdWRnZUFuZ2xlcyAoYW5nbGVzOiBudW1iZXJbXSwgbWluQW5nbGU6IG51bWJlcikgOiBudW1iZXJbXSB7XG4gIGNvbnN0IGFuZ2xlU3VtID0gYW5nbGVzLnJlZHVjZSgoYSwgYykgPT4gYSArIGMpXG4gIGNvbnN0IG1hcHBlZEFuZ2xlcyA9IGFuZ2xlcy5tYXAoKHgsIGkpID0+IFt4LCBpXSkgLy8gcmVtZW1iZXIgb3JpZ2luYWwgaW5kaWNlc1xuICBjb25zdCBzbWFsbEFuZ2xlcyA9IG1hcHBlZEFuZ2xlcy5maWx0ZXIoeCA9PiB4WzBdIDwgbWluQW5nbGUpIC8vIHNwbGl0IG91dCBhbmdsZXMgd2hpY2ggYXJlIHRvbyBzbWFsbFxuICBjb25zdCBsYXJnZUFuZ2xlcyA9IG1hcHBlZEFuZ2xlcy5maWx0ZXIoeCA9PiB4WzBdID49IG1pbkFuZ2xlKVxuICBjb25zdCBsYXJnZUFuZ2xlU3VtID0gbGFyZ2VBbmdsZXMucmVkdWNlKChhY2N1bXVsYXRvciwgY3VycmVudFZhbHVlKSA9PiBhY2N1bXVsYXRvciArIGN1cnJlbnRWYWx1ZVswXSwgMClcblxuICBzbWFsbEFuZ2xlcy5mb3JFYWNoKHNtYWxsID0+IHtcbiAgICBjb25zdCBkaWZmZXJlbmNlID0gbWluQW5nbGUgLSBzbWFsbFswXVxuICAgIHNtYWxsWzBdICs9IGRpZmZlcmVuY2VcbiAgICBsYXJnZUFuZ2xlcy5mb3JFYWNoKGxhcmdlID0+IHtcbiAgICAgIGNvbnN0IHJlZHVjdGlvbiA9IGRpZmZlcmVuY2UgKiBsYXJnZVswXSAvIGxhcmdlQW5nbGVTdW1cbiAgICAgIGxhcmdlWzBdID0gTWF0aC5yb3VuZChsYXJnZVswXSAtIHJlZHVjdGlvbilcbiAgICB9KVxuICB9KVxuXG4gIC8vIGZpeCBhbnkgcm91bmRpbmcgZXJyb3JzIGludHJvZHVjZWRcblxuICBjb25zdCBuZXdBbmdsZXMgPSBzbWFsbEFuZ2xlcy5jb25jYXQobGFyZ2VBbmdsZXMpIC8vIGNvbWJpbmUgdG9nZXRoZXJcbiAgICAuc29ydCgoeCwgeSkgPT4geFsxXSAtIHlbMV0pIC8vIHNvcnQgYnkgcHJldmlvdXMgaW5kZXhcbiAgICAubWFwKHggPT4geFswXSkgLy8gc3RyaXAgb3V0IGluZGV4XG5cbiAgbGV0IG5ld1N1bSA9IG5ld0FuZ2xlcy5yZWR1Y2UoKGFjYywgY3VycikgPT4gYWNjICsgY3VycilcbiAgaWYgKG5ld1N1bSAhPT0gYW5nbGVTdW0pIHtcbiAgICBjb25zdCBkaWZmZXJlbmNlID0gYW5nbGVTdW0gLSBuZXdTdW1cbiAgICBuZXdBbmdsZXNbbmV3QW5nbGVzLmluZGV4T2YoTWF0aC5tYXgoLi4ubmV3QW5nbGVzKSldICs9IGRpZmZlcmVuY2VcbiAgfVxuICBuZXdTdW0gPSBuZXdBbmdsZXMucmVkdWNlKChhY2MsIGN1cnIpID0+IGFjYyArIGN1cnIpXG4gIGlmIChuZXdTdW0gIT09IGFuZ2xlU3VtKSB0aHJvdyBuZXcgRXJyb3IoYERpZG4ndCBmaXggYW5nbGVzLiBOZXcgc3VtIGlzICR7bmV3U3VtfSwgYnV0IHNob3VsZCBiZSAke2FuZ2xlU3VtfWApXG5cbiAgcmV0dXJuIG5ld0FuZ2xlc1xufVxuIiwiLyoqIEdlbmVyYXRlcyBhbmQgaG9sZHMgZGF0YSBmb3IgYSBtaXNzaW5nIGFuZ2xlcyBxdWVzdGlvbiwgd2hlcmUgdGhlc2UgaXMgc29tZSBnaXZlbiBhbmdsZSBzdW1cbiAqICBBZ25vc3RpYyBhcyB0byBob3cgdGhlc2UgYW5nbGVzIGFyZSBhcnJhbmdlZCAoZS5nLiBpbiBhIHBvbHlnb24gb3IgYXJvdW5kIHNvbSBwb2ludClcbiAqXG4gKiBPcHRpb25zIHBhc3NlZCB0byBjb25zdHJ1Y3RvcnM6XG4gKiAgYW5nbGVTdW06OkludCB0aGUgbnVtYmVyIG9mIGFuZ2xlcyB0byBnZW5lcmF0ZVxuICogIG1pbkFuZ2xlOjpJbnQgdGhlIHNtYWxsZXN0IGFuZ2xlIHRvIGdlbmVyYXRlXG4gKiAgbWluTjo6SW50ICAgICB0aGUgc21hbGxlc3QgbnVtYmVyIG9mIGFuZ2xlcyB0byBnZW5lcmF0ZVxuICogIG1heE46OkludCAgICAgdGhlIGxhcmdlc3QgbnVtYmVyIG9mIGFuZ2xlcyB0byBnZW5lcmF0ZVxuICpcbiAqL1xuXG5pbXBvcnQgeyByYW5kQmV0d2VlbiB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCB7IEdyYXBoaWNRRGF0YSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc0RhdGEgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNEYXRhJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlT3B0aW9ucyBhcyBPcHRpb25zIH0gZnJvbSAnLi9OdW1iZXJPcHRpb25zJ1xuXG5leHBvcnQgY2xhc3MgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgaW1wbGVtZW50cyBNaXNzaW5nQW5nbGVzRGF0YSB7XG4gIGFuZ2xlcyA6IG51bWJlcltdIC8vIGxpc3Qgb2YgYW5nbGVzXG4gIG1pc3NpbmcgOiBib29sZWFuW10gLy8gdHJ1ZSBpZiBtaXNzaW5nXG4gIGFuZ2xlU3VtIDogbnVtYmVyIC8vIHdoYXQgdGhlIGFuZ2xlcyBhZGQgdXAgdG9cbiAgYW5nbGVMYWJlbHM6IHN0cmluZ1tdXG5cbiAgY29uc3RydWN0b3IgKGFuZ2xlU3VtIDogbnVtYmVyLCBhbmdsZXM6IG51bWJlcltdLCBtaXNzaW5nOiBib29sZWFuW10sIGFuZ2xlTGFiZWxzPzogc3RyaW5nW10pIHtcbiAgICAvLyBpbml0aWFsaXNlcyB3aXRoIGFuZ2xlcyBnaXZlbiBleHBsaWNpdGx5XG4gICAgaWYgKGFuZ2xlcyA9PT0gW10pIHsgdGhyb3cgbmV3IEVycm9yKCdNdXN0IGdpdmUgYW5nbGVzJykgfVxuICAgIGlmIChNYXRoLnJvdW5kKGFuZ2xlcy5yZWR1Y2UoKHgsIHkpID0+IHggKyB5KSkgIT09IGFuZ2xlU3VtKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFuZ2xlIHN1bSBtdXN0IGJlICR7YW5nbGVTdW19YClcbiAgICB9XG5cbiAgICB0aGlzLmFuZ2xlcyA9IGFuZ2xlcyAvLyBsaXN0IG9mIGFuZ2xlc1xuICAgIHRoaXMubWlzc2luZyA9IG1pc3NpbmcgLy8gd2hpY2ggYW5nbGVzIGFyZSBtaXNzaW5nIC0gYXJyYXkgb2YgYm9vbGVhbnNcbiAgICB0aGlzLmFuZ2xlU3VtID0gYW5nbGVTdW0gLy8gc3VtIG9mIGFuZ2xlc1xuICAgIHRoaXMuYW5nbGVMYWJlbHMgPSBhbmdsZUxhYmVscyB8fCBbXVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB7XG4gICAgbGV0IHF1ZXN0aW9uIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGFcbiAgICBpZiAob3B0aW9ucy5yZXBlYXRlZCkge1xuICAgICAgcXVlc3Rpb24gPSB0aGlzLnJhbmRvbVJlcGVhdGVkKG9wdGlvbnMpXG4gICAgfSBlbHNlIHtcbiAgICAgIHF1ZXN0aW9uID0gdGhpcy5yYW5kb21TaW1wbGUob3B0aW9ucylcbiAgICB9XG4gICAgcXVlc3Rpb24uaW5pdExhYmVscygpXG4gICAgcmV0dXJuIHF1ZXN0aW9uXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tU2ltcGxlIChvcHRpb25zOiBPcHRpb25zKTogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEge1xuICAgIGNvbnN0IGFuZ2xlU3VtID0gb3B0aW9ucy5hbmdsZVN1bVxuICAgIGNvbnN0IG4gPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbk4sIG9wdGlvbnMubWF4TilcbiAgICBjb25zdCBtaW5BbmdsZSA9IG9wdGlvbnMubWluQW5nbGVcblxuICAgIGlmIChuIDwgMikgdGhyb3cgbmV3IEVycm9yKCdDYW5cXCd0IGhhdmUgbWlzc2luZyBmZXdlciB0aGFuIDIgYW5nbGVzJylcblxuICAgIC8vIEJ1aWxkIHVwIGFuZ2xlc1xuICAgIGNvbnN0IGFuZ2xlcyA9IFtdXG4gICAgbGV0IGxlZnQgPSBhbmdsZVN1bVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbiAtIDE7IGkrKykge1xuICAgICAgY29uc3QgbWF4QW5nbGUgPSBsZWZ0IC0gbWluQW5nbGUgKiAobiAtIGkgLSAxKVxuICAgICAgY29uc3QgbmV4dEFuZ2xlID0gcmFuZEJldHdlZW4obWluQW5nbGUsIG1heEFuZ2xlKVxuICAgICAgbGVmdCAtPSBuZXh0QW5nbGVcbiAgICAgIGFuZ2xlcy5wdXNoKG5leHRBbmdsZSlcbiAgICB9XG4gICAgYW5nbGVzW24gLSAxXSA9IGxlZnRcblxuICAgIC8vIHBpY2sgb25lIHRvIGJlIG1pc3NpbmdcbiAgICBjb25zdCBtaXNzaW5nOiBib29sZWFuW10gPSBbXVxuICAgIG1pc3NpbmcubGVuZ3RoID0gblxuICAgIG1pc3NpbmcuZmlsbChmYWxzZSlcbiAgICBtaXNzaW5nW3JhbmRCZXR3ZWVuKDAsIG4gLSAxKV0gPSB0cnVlXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZylcbiAgfVxuXG4gIHN0YXRpYyByYW5kb21SZXBlYXRlZCAob3B0aW9uczogT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB7XG4gICAgY29uc3QgYW5nbGVTdW06IG51bWJlciA9IG9wdGlvbnMuYW5nbGVTdW1cbiAgICBjb25zdCBtaW5BbmdsZTogbnVtYmVyID0gb3B0aW9ucy5taW5BbmdsZVxuXG4gICAgY29uc3QgbjogbnVtYmVyID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5OLCBvcHRpb25zLm1heE4pXG5cbiAgICBjb25zdCBtOiBudW1iZXIgPSBvcHRpb25zLm5NaXNzaW5nIHx8IChNYXRoLnJhbmRvbSgpIDwgMC4xID8gbiA6IHJhbmRCZXR3ZWVuKDIsIG4gLSAxKSlcblxuICAgIGlmIChuIDwgMiB8fCBtIDwgMSB8fCBtID4gbikgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGFyZ3VtZW50czogbj0ke259LCBtPSR7bX1gKVxuXG4gICAgLy8gQWxsIG1pc3NpbmcgLSBkbyBhcyBhIHNlcGFyYXRlIGNhc2VcbiAgICBpZiAobiA9PT0gbSkge1xuICAgICAgY29uc3QgYW5nbGVzOiBudW1iZXJbXSA9IFtdXG4gICAgICBhbmdsZXMubGVuZ3RoID0gblxuICAgICAgYW5nbGVzLmZpbGwoYW5nbGVTdW0gLyBuKVxuXG4gICAgICBjb25zdCBtaXNzaW5nOiBib29sZWFuW10gPSBbXVxuICAgICAgbWlzc2luZy5sZW5ndGggPSBuXG4gICAgICBtaXNzaW5nLmZpbGwodHJ1ZSlcblxuICAgICAgcmV0dXJuIG5ldyB0aGlzKGFuZ2xlU3VtLCBhbmdsZXMsIG1pc3NpbmcpXG4gICAgfVxuXG4gICAgY29uc3QgYW5nbGVzOiBudW1iZXJbXSA9IFtdXG4gICAgY29uc3QgbWlzc2luZzogYm9vbGVhbltdID0gW11cbiAgICBtaXNzaW5nLmxlbmd0aCA9IG5cbiAgICBtaXNzaW5nLmZpbGwoZmFsc2UpXG5cbiAgICAvLyBjaG9vc2UgYSB2YWx1ZSBmb3IgdGhlIG1pc3NpbmcgYW5nbGVzXG4gICAgY29uc3QgbWF4UmVwZWF0ZWRBbmdsZSA9IChhbmdsZVN1bSAtIG1pbkFuZ2xlICogKG4gLSBtKSkgLyBtXG4gICAgY29uc3QgcmVwZWF0ZWRBbmdsZSA9IHJhbmRCZXR3ZWVuKG1pbkFuZ2xlLCBtYXhSZXBlYXRlZEFuZ2xlKVxuXG4gICAgLy8gY2hvb3NlIHZhbHVlcyBmb3IgdGhlIG90aGVyIGFuZ2xlc1xuICAgIGNvbnN0IG90aGVyQW5nbGVzOiBudW1iZXJbXSA9IFtdXG4gICAgbGV0IGxlZnQgPSBhbmdsZVN1bSAtIHJlcGVhdGVkQW5nbGUgKiBtXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuIC0gbSAtIDE7IGkrKykge1xuICAgICAgY29uc3QgbWF4QW5nbGUgPSBsZWZ0IC0gbWluQW5nbGUgKiAobiAtIG0gLSBpIC0gMSlcbiAgICAgIGNvbnN0IG5leHRBbmdsZSA9IHJhbmRCZXR3ZWVuKG1pbkFuZ2xlLCBtYXhBbmdsZSlcbiAgICAgIGxlZnQgLT0gbmV4dEFuZ2xlXG4gICAgICBvdGhlckFuZ2xlcy5wdXNoKG5leHRBbmdsZSlcbiAgICB9XG4gICAgb3RoZXJBbmdsZXNbbiAtIG0gLSAxXSA9IGxlZnRcblxuICAgIC8vIGNob29zZSB3aGVyZSB0aGUgbWlzc2luZyBhbmdsZXMgYXJlXG4gICAge1xuICAgICAgbGV0IGkgPSAwXG4gICAgICB3aGlsZSAoaSA8IG0pIHtcbiAgICAgICAgY29uc3QgaiA9IHJhbmRCZXR3ZWVuKDAsIG4gLSAxKVxuICAgICAgICBpZiAobWlzc2luZ1tqXSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBtaXNzaW5nW2pdID0gdHJ1ZVxuICAgICAgICAgIGFuZ2xlc1tqXSA9IHJlcGVhdGVkQW5nbGVcbiAgICAgICAgICBpKytcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGZpbGwgaW4gdGhlIG90aGVyIGFuZ2xlc1xuICAgIHtcbiAgICAgIGxldCBqID0gMFxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgaWYgKG1pc3NpbmdbaV0gPT09IGZhbHNlKSB7XG4gICAgICAgICAgYW5nbGVzW2ldID0gb3RoZXJBbmdsZXNbal1cbiAgICAgICAgICBqKytcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZylcbiAgfVxuXG4gIGluaXRMYWJlbHMgKCkgOiB2b2lkIHtcbiAgICBjb25zdCBuID0gdGhpcy5hbmdsZXMubGVuZ3RoXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIGlmICghdGhpcy5taXNzaW5nW2ldKSB7XG4gICAgICAgIHRoaXMuYW5nbGVMYWJlbHNbaV0gPSBgJHt0aGlzLmFuZ2xlc1tpXS50b1N0cmluZygpfV5cXFxcY2lyY2BcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYW5nbGVMYWJlbHNbaV0gPSAneF5cXFxcY2lyYydcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiIsIi8qIFF1ZXN0aW9uIHR5cGUgY29tcHJpc2luZyBudW1lcmljYWwgbWlzc2luZyBhbmdsZXMgYXJvdW5kIGEgcG9pbnQgYW5kXG4gKiBhbmdsZXMgb24gYSBzdHJhaWdodCBsaW5lIChzaW5jZSB0aGVzZSBhcmUgdmVyeSBzaW1pbGFyIG51bWVyaWNhbGx5IGFzIHdlbGxcbiAqIGFzIGdyYXBoaWNhbGx5LlxuICpcbiAqIEFsc28gY292ZXJzIGNhc2VzIHdoZXJlIG1vcmUgdGhhbiBvbmUgYW5nbGUgaXMgZXF1YWxcbiAqXG4gKi9cblxuaW1wb3J0IHsgT3B0aW9uc1NwZWMgfSBmcm9tICdPcHRpb25zU3BlYydcbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZFEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGEhOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSAvLyBpbml0aWFsaXNlZCBpbiBzdXBlcigpXG4gIHZpZXchOiBNaXNzaW5nQW5nbGVzQXJvdW5kVmlld1xuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFBhcnRpYWw8TWlzc2luZ0FuZ2xlT3B0aW9ucz4sIHZpZXdPcHRpb25zOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc0Fyb3VuZFEge1xuICAgIGNvbnN0IGRlZmF1bHRzIDogTWlzc2luZ0FuZ2xlT3B0aW9ucyA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5BbmdsZTogMTUsXG4gICAgICBtaW5OOiAyLFxuICAgICAgbWF4TjogNCxcbiAgICAgIHJlcGVhdGVkOiBmYWxzZSxcbiAgICAgIG5NaXNzaW5nOiAzXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzOiBNaXNzaW5nQW5nbGVPcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc051bWJlckRhdGEucmFuZG9tKHNldHRpbmdzKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcoZGF0YSwgdmlld09wdGlvbnMpIC8vIFRPRE8gZWxpbWluYXRlIHB1YmxpYyBjb25zdHJ1Y3RvcnNcblxuICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZFEoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IEdyYXBoaWNRVmlldywgTGFiZWwgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCB7IHNpbkRlZywgZGFzaGVkTGluZSwgcm91bmREUCB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIEEgOiBQb2ludCAvLyB0aGUgdmVydGljZXMgb2YgdGhlIHRyaWFuZ2xlXG4gIEIgOiBQb2ludFxuICBDIDogUG9pbnRcbiAgcm90YXRpb246IG51bWJlclxuICAvLyBJbmhlcml0ZWQgbWVtYmVycy4gQWxsIGluaXRpYWxpc2VkIGluIGNhbGwgdG8gc3VwZXIoKVxuICBsYWJlbHMhOiBMYWJlbFtdXG4gIGNhbnZhcyE6IEhUTUxDYW52YXNFbGVtZW50XG4gIERPTSE6IEhUTUxFbGVtZW50XG4gIHdpZHRoITogbnVtYmVyXG4gIGhlaWdodCE6IG51bWJlclxuICBkYXRhITogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YVxuXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhLCBvcHRpb25zOiBWaWV3T3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIHNldHMgdGhpcy53aWR0aCB0aGlzLmhlaWdodCwgdGhpcy5kYXRhIGluaXRpYWxpc2VzIHRoaXMubGFiZWxzLCBjcmVhdGVzIGRvbSBlbGVtZW50c1xuICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aFxuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuaGVpZ2h0XG5cbiAgICAvLyBnZW5lcmF0ZSBwb2ludHMgKHdpdGggbG9uZ2VzdCBzaWRlIDFcbiAgICB0aGlzLkEgPSBuZXcgUG9pbnQoMCwgMClcbiAgICB0aGlzLkIgPSBQb2ludC5mcm9tUG9sYXJEZWcoMSwgZGF0YS5hbmdsZXNbMF0pXG4gICAgdGhpcy5DID0gbmV3IFBvaW50KFxuICAgICAgc2luRGVnKHRoaXMuZGF0YS5hbmdsZXNbMV0pIC8gc2luRGVnKHRoaXMuZGF0YS5hbmdsZXNbMl0pLCAwXG4gICAgKVxuXG4gICAgLy8gQ3JlYXRlIGxhYmVsc1xuICAgIGNvbnN0IGluQ2VudGVyID0gUG9pbnQuaW5DZW50ZXIodGhpcy5BLCB0aGlzLkIsIHRoaXMuQylcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICBjb25zdCBwID0gW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdW2ldXG5cbiAgICAgIGNvbnN0IGxhYmVsIDogUGFydGlhbDxMYWJlbD4gPSB7XG4gICAgICAgIHRleHRxOiB0aGlzLmRhdGEuYW5nbGVMYWJlbHNbaV0sXG4gICAgICAgIHRleHQ6IHRoaXMuZGF0YS5hbmdsZUxhYmVsc1tpXSxcbiAgICAgICAgc3R5bGVxOiAnbm9ybWFsJyxcbiAgICAgICAgc3R5bGU6ICdub3JtYWwnLFxuICAgICAgICBwb3M6IFBvaW50Lm1lYW4ocCwgcCwgaW5DZW50ZXIpXG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmRhdGEubWlzc2luZ1tpXSkge1xuICAgICAgICBsYWJlbC50ZXh0YSA9IHJvdW5kRFAodGhpcy5kYXRhLmFuZ2xlc1tpXSwgMikudG9TdHJpbmcoKSArICdeXFxcXGNpcmMnXG4gICAgICAgIGxhYmVsLnN0eWxlYSA9ICdhbnN3ZXInXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsYWJlbC50ZXh0YSA9IGxhYmVsLnRleHRxXG4gICAgICAgIGxhYmVsLnN0eWxlYSA9IGxhYmVsLnN0eWxlcVxuICAgICAgfVxuXG4gICAgICB0aGlzLmxhYmVsc1tpXSA9IGxhYmVsIGFzIExhYmVsXG4gICAgfVxuXG4gICAgLy8gcm90YXRlIHJhbmRvbWx5XG4gICAgdGhpcy5yb3RhdGlvbiA9IChvcHRpb25zLnJvdGF0aW9uICE9PSB1bmRlZmluZWQpID8gdGhpcy5yb3RhdGUob3B0aW9ucy5yb3RhdGlvbikgOiB0aGlzLnJhbmRvbVJvdGF0ZSgpXG5cbiAgICAvLyBzY2FsZSBhbmQgZml0XG4gICAgLy8gc2NhbGUgdG8gc2l6ZVxuICAgIGNvbnN0IG1hcmdpbiA9IDBcbiAgICBsZXQgdG9wbGVmdCA9IFBvaW50Lm1pbihbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgbGV0IGJvdHRvbXJpZ2h0ID0gUG9pbnQubWF4KFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBjb25zdCB0b3RhbFdpZHRoID0gYm90dG9tcmlnaHQueCAtIHRvcGxlZnQueFxuICAgIGNvbnN0IHRvdGFsSGVpZ2h0ID0gYm90dG9tcmlnaHQueSAtIHRvcGxlZnQueVxuICAgIHRoaXMuc2NhbGUoTWF0aC5taW4oKHdpZHRoIC0gbWFyZ2luKSAvIHRvdGFsV2lkdGgsIChoZWlnaHQgLSBtYXJnaW4pIC8gdG90YWxIZWlnaHQpKSAvLyAxNXB4IG1hcmdpblxuXG4gICAgLy8gbW92ZSB0byBjZW50cmVcbiAgICB0b3BsZWZ0ID0gUG9pbnQubWluKFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBib3R0b21yaWdodCA9IFBvaW50Lm1heChbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbih0b3BsZWZ0LCBib3R0b21yaWdodClcbiAgICB0aGlzLnRyYW5zbGF0ZSh3aWR0aCAvIDIgLSBjZW50ZXIueCwgaGVpZ2h0IC8gMiAtIGNlbnRlci55KSAvLyBjZW50cmVcbiAgfVxuXG4gIHJlbmRlciAoKSA6IHZvaWQge1xuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICBpZiAoY3R4ID09PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBnZXQgY2FudmFzIGNvbnRleHQnKVxuXG4gICAgY29uc3QgdmVydGljZXMgPSBbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ11cbiAgICBjb25zdCBhcGV4ID0gdGhpcy5kYXRhLmFwZXggLy8gaG1tbVxuXG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KSAvLyBjbGVhclxuXG4gICAgY3R4LmJlZ2luUGF0aCgpXG4gICAgY3R4Lm1vdmVUbyh0aGlzLkEueCwgdGhpcy5BLnkpXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgY29uc3QgcCA9IHZlcnRpY2VzW2ldXG4gICAgICBjb25zdCBuZXh0ID0gdmVydGljZXNbKGkgKyAxKSAlIDNdXG4gICAgICBpZiAoYXBleCA9PT0gaSB8fCBhcGV4ID09PSAoaSArIDEpICUgMykgeyAvLyB0by9mcm9tIGFwZXggLSBkcmF3IGRhc2hlZCBsaW5lXG4gICAgICAgIGRhc2hlZExpbmUoY3R4LCBwLngsIHAueSwgbmV4dC54LCBuZXh0LnkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjdHgubGluZVRvKG5leHQueCwgbmV4dC55KVxuICAgICAgfVxuICAgIH1cbiAgICBjdHguc3Ryb2tlU3R5bGUgPSAnZ3JheSdcbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIHRoaXMucmVuZGVyTGFiZWxzKGZhbHNlKVxuICB9XG5cbiAgZ2V0IGFsbHBvaW50cyAoKSA6IFBvaW50W10ge1xuICAgIGNvbnN0IGFsbHBvaW50cyA9IFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXVxuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7IGFsbHBvaW50cy5wdXNoKGwucG9zKSB9KVxuICAgIHJldHVybiBhbGxwb2ludHNcbiAgfVxufVxuIiwiLyogRXh0ZW5kcyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSBpbiBvcmRlciB0byBkbyBpc29zY2VsZXMgdHJpYW5nbGVzLCB3aGljaCBnZW5lcmF0ZSBhIGJpdCBkaWZmZXJlbnRseSAqL1xuXG5pbXBvcnQgeyBmaXJzdFVuaXF1ZUluZGV4IH0gZnJvbSAndXRpbGl0aWVzJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNOdW1iZXJEYXRhJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxudHlwZSBPcHRpb25zID0gTWlzc2luZ0FuZ2xlT3B0aW9ucyAmIHtnaXZlbkFuZ2xlPzogJ2FwZXgnIHwgJ2Jhc2UnfVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhIGV4dGVuZHMgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEge1xuICAgIGFwZXg/OiAwIHwgMSB8IDIgfCB1bmRlZmluZWQgLy8gd2hpY2ggb2YgdGhlIHRocmVlIGdpdmVuIGFuZ2xlcyBpcyB0aGUgYXBleCBvZiBhbiBpc29zY2VsZXMgdHJpYW5nbGVcbiAgICBjb25zdHJ1Y3RvciAoYW5nbGVTdW06IG51bWJlciwgYW5nbGVzOiBudW1iZXJbXSwgbWlzc2luZzogYm9vbGVhbltdLCBhbmdsZUxhYmVscz86IHN0cmluZ1tdLCBhcGV4PzogMHwxfDJ8dW5kZWZpbmVkKSB7XG4gICAgICBzdXBlcihhbmdsZVN1bSwgYW5nbGVzLCBtaXNzaW5nLCBhbmdsZUxhYmVscylcbiAgICAgIHRoaXMuYXBleCA9IGFwZXhcbiAgICB9XG5cbiAgICBzdGF0aWMgcmFuZG9tUmVwZWF0ZWQgKG9wdGlvbnM6IE9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSB7XG4gICAgICBvcHRpb25zLm5NaXNzaW5nID0gMlxuICAgICAgb3B0aW9ucy5naXZlbkFuZ2xlID0gb3B0aW9ucy5naXZlbkFuZ2xlIHx8IE1hdGgucmFuZG9tKCkgPCAwLjUgPyAnYXBleCcgOiAnYmFzZSdcblxuICAgICAgLy8gZ2VuZXJhdGUgdGhlIHJhbmRvbSBhbmdsZXMgd2l0aCByZXBldGl0aW9uIGZpcnN0IGJlZm9yZSBtYXJraW5nIGFwZXggZm9yIGRyYXdpbmdcbiAgICAgIGNvbnN0IHF1ZXN0aW9uID0gc3VwZXIucmFuZG9tUmVwZWF0ZWQob3B0aW9ucykgYXMgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSAvLyBhbGxvd2VkIHNpbmNlIHVuZGVmaW5lZCBcXGluIGFwZXhcblxuICAgICAgLy8gT2xkIGltcGxlbWVudGF0aW9uIGhhZCBzb3J0aW5nIHRoZSBhcnJheSAtIG5vdCBzdXJlIHdoeVxuICAgICAgLy8gc29ydFRvZ2V0aGVyKHF1ZXN0aW9uLmFuZ2xlcyxxdWVzdGlvbi5taXNzaW5nLCh4LHkpID0+IHggLSB5KVxuXG4gICAgICBxdWVzdGlvbi5hcGV4ID0gZmlyc3RVbmlxdWVJbmRleChxdWVzdGlvbi5hbmdsZXMpIGFzIDAgfCAxIHwgMlxuICAgICAgcXVlc3Rpb24ubWlzc2luZyA9IFt0cnVlLCB0cnVlLCB0cnVlXVxuXG4gICAgICBpZiAob3B0aW9ucy5naXZlbkFuZ2xlID09PSAnYXBleCcpIHtcbiAgICAgICAgcXVlc3Rpb24ubWlzc2luZ1txdWVzdGlvbi5hcGV4XSA9IGZhbHNlXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBxdWVzdGlvbi5taXNzaW5nWyhxdWVzdGlvbi5hcGV4ICsgMSkgJSAzXSA9IGZhbHNlXG4gICAgICB9XG5cbiAgICAgIHF1ZXN0aW9uLmluaXRMYWJlbHMoKVxuXG4gICAgICByZXR1cm4gcXVlc3Rpb25cbiAgICB9XG5cbiAgICBpbml0TGFiZWxzICgpOiB2b2lkIHtcbiAgICAgIGNvbnN0IG4gPSB0aGlzLmFuZ2xlcy5sZW5ndGhcbiAgICAgIGxldCBqID0gMCAvLyBrZWVwIHRyYWNrIG9mIHVua25vd25zXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICBpZiAoIXRoaXMubWlzc2luZ1tpXSkge1xuICAgICAgICAgIHRoaXMuYW5nbGVMYWJlbHNbaV0gPSBgJHt0aGlzLmFuZ2xlc1tpXS50b1N0cmluZygpfV5cXFxcY2lyY2BcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzW2ldID0gYCR7U3RyaW5nLmZyb21DaGFyQ29kZSgxMjAgKyBqKX1eXFxcXGNpcmNgIC8vIDEyMCA9ICd4J1xuICAgICAgICAgIGorK1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxufVxuIiwiLyogTWlzc2luZyBhbmdsZXMgaW4gdHJpYW5nbGUgLSBudW1lcmljYWwgKi9cblxuaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldydcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGEhOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhXG4gIHZpZXchOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogUGFydGlhbDxNaXNzaW5nQW5nbGVPcHRpb25zPiwgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgY29uc3Qgb3B0aW9uc092ZXJyaWRlIDogUGFydGlhbDxNaXNzaW5nQW5nbGVPcHRpb25zPiA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5BbmdsZTogMjUsXG4gICAgICBtaW5OOiAzLFxuICAgICAgbWF4TjogM1xuICAgIH1cbiAgICBjb25zdCBkZWZhdWx0cyA6IE1pc3NpbmdBbmdsZU9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDE1LFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDQsXG4gICAgICByZXBlYXRlZDogZmFsc2UsXG4gICAgICBuTWlzc2luZzogMVxuICAgIH1cblxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMsIG9wdGlvbnNPdmVycmlkZSlcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhLnJhbmRvbShzZXR0aW5ncylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcoZGF0YSwgdmlld09wdGlvbnMpXG5cbiAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIExpbkV4cHIge1xuLy8gY2xhc3MgTGluRXhwciB7XG4gIGNvbnN0cnVjdG9yIChhLCBiKSB7XG4gICAgdGhpcy5hID0gYVxuICAgIHRoaXMuYiA9IGJcbiAgfVxuXG4gIGlzQ29uc3RhbnQgKCkge1xuICAgIHJldHVybiB0aGlzLmEgPT09IDBcbiAgfVxuXG4gIHRvU3RyaW5nICgpIHtcbiAgICBsZXQgc3RyaW5nID0gJydcblxuICAgIC8vIHggdGVybVxuICAgIGlmICh0aGlzLmEgPT09IDEpIHsgc3RyaW5nICs9ICd4JyB9IGVsc2UgaWYgKHRoaXMuYSA9PT0gLTEpIHsgc3RyaW5nICs9ICcteCcgfSBlbHNlIGlmICh0aGlzLmEgIT09IDApIHsgc3RyaW5nICs9IHRoaXMuYSArICd4JyB9XG5cbiAgICAvLyBzaWduXG4gICAgaWYgKHRoaXMuYSAhPT0gMCAmJiB0aGlzLmIgPiAwKSB7IHN0cmluZyArPSAnICsgJyB9IGVsc2UgaWYgKHRoaXMuYSAhPT0gMCAmJiB0aGlzLmIgPCAwKSB7IHN0cmluZyArPSAnIC0gJyB9XG5cbiAgICAvLyBjb25zdGFudFxuICAgIGlmICh0aGlzLmIgPiAwKSB7IHN0cmluZyArPSB0aGlzLmIgfSBlbHNlIGlmICh0aGlzLmIgPCAwICYmIHRoaXMuYSA9PT0gMCkgeyBzdHJpbmcgKz0gdGhpcy5iIH0gZWxzZSBpZiAodGhpcy5iIDwgMCkgeyBzdHJpbmcgKz0gTWF0aC5hYnModGhpcy5iKSB9XG5cbiAgICByZXR1cm4gc3RyaW5nXG4gIH1cblxuICB0b1N0cmluZ1AgKCkge1xuICAgIC8vIHJldHVybiBleHByZXNzaW9uIGFzIGEgc3RyaW5nLCBzdXJyb3VuZGVkIGluIHBhcmVudGhlc2VzIGlmIGEgYmlub21pYWxcbiAgICBpZiAodGhpcy5hID09PSAwIHx8IHRoaXMuYiA9PT0gMCkgcmV0dXJuIHRoaXMudG9TdHJpbmcoKVxuICAgIGVsc2UgcmV0dXJuICcoJyArIHRoaXMudG9TdHJpbmcoKSArICcpJ1xuICB9XG5cbiAgZXZhbCAoeCkge1xuICAgIHJldHVybiB0aGlzLmEgKiB4ICsgdGhpcy5iXG4gIH1cblxuICBhZGQgKHRoYXQpIHtcbiAgICAvLyBhZGQgZWl0aGVyIGFuIGV4cHJlc3Npb24gb3IgYSBjb25zdGFudFxuICAgIGlmICh0aGF0LmEgIT09IHVuZGVmaW5lZCkgcmV0dXJuIG5ldyBMaW5FeHByKHRoaXMuYSArIHRoYXQuYSwgdGhpcy5iICsgdGhhdC5iKVxuICAgIGVsc2UgcmV0dXJuIG5ldyBMaW5FeHByKHRoaXMuYSwgdGhpcy5iICsgdGhhdClcbiAgfVxuXG4gIHRpbWVzICh0aGF0KSB7XG4gICAgcmV0dXJuIG5ldyBMaW5FeHByKHRoaXMuYSAqIHRoYXQsIHRoaXMuYiAqIHRoYXQpXG4gIH1cblxuICBzdGF0aWMgc29sdmUgKGV4cHIxLCBleHByMikge1xuICAgIC8vIHNvbHZlcyB0aGUgdHdvIGV4cHJlc3Npb25zIHNldCBlcXVhbCB0byBlYWNoIG90aGVyXG4gICAgcmV0dXJuIChleHByMi5iIC0gZXhwcjEuYikgLyAoZXhwcjEuYSAtIGV4cHIyLmEpXG4gIH1cbn1cbiIsImltcG9ydCBMaW5FeHByIGZyb20gJ0xpbkV4cHInXG5cbi8qKiBHaXZlbiBhIHNldCBvZiBleHByZXNzaW9ucywgc2V0IHRoZWlyIHN1bSAgKi9cblxuZXhwb3J0IGZ1bmN0aW9uIHNvbHZlQW5nbGVzIChleHByZXNzaW9uczogTGluRXhwcltdLCBhbmdsZVN1bTogbnVtYmVyKTogeyB4OiBudW1iZXI7IGFuZ2xlczogbnVtYmVyW107IH0ge1xuICBjb25zdCBleHByZXNzaW9uU3VtID0gZXhwcmVzc2lvbnMucmVkdWNlKChleHAxLCBleHAyKSA9PiBleHAxLmFkZChleHAyKSlcbiAgY29uc3QgeCA9IExpbkV4cHIuc29sdmUoZXhwcmVzc2lvblN1bSwgbmV3IExpbkV4cHIoMCwgYW5nbGVTdW0pKVxuXG4gIGNvbnN0IGFuZ2xlcyA6IG51bWJlcltdID0gW11cbiAgZXhwcmVzc2lvbnMuZm9yRWFjaChmdW5jdGlvbiAoZXhwcikge1xuICAgIGNvbnN0IGFuZ2xlID0gZXhwci5ldmFsKHgpXG4gICAgaWYgKGFuZ2xlIDw9IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignbmVnYXRpdmUgYW5nbGUnKVxuICAgIH0gZWxzZSB7XG4gICAgICBhbmdsZXMucHVzaChleHByLmV2YWwoeCkpXG4gICAgfVxuICB9KVxuXG4gIHJldHVybiAoeyB4OiB4LCBhbmdsZXM6IGFuZ2xlcyB9KVxufVxuIiwiaW1wb3J0IExpbkV4cHIgZnJvbSAnTGluRXhwcidcbmltcG9ydCB7IE9wdGlvbnNTcGVjIH0gZnJvbSAnT3B0aW9uc1NwZWMnXG5pbXBvcnQgeyByYW5kQmV0d2VlbiwgcmFuZEVsZW0sIHJhbmRNdWx0QmV0d2Vlbiwgc2h1ZmZsZSwgd2Vha0luY2x1ZGVzIH0gZnJvbSAndXRpbGl0aWVzJ1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tICcuL0FsZ2VicmFPcHRpb25zJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc0RhdGEgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNEYXRhJ1xuaW1wb3J0IHsgc29sdmVBbmdsZXMgfSBmcm9tICcuL3NvbHZlQW5nbGVzJ1xuXG5leHBvcnQgdHlwZSBFeHByZXNzaW9uVHlwZSA9ICdhZGQnIHwgJ211bHRpcGx5JyB8ICdtaXhlZCdcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBpbXBsZW1lbnRzIE1pc3NpbmdBbmdsZXNEYXRhIHtcbiAgICBhbmdsZXM6IG51bWJlcltdXG4gICAgbWlzc2luZzogYm9vbGVhbltdXG4gICAgYW5nbGVTdW06IG51bWJlclxuICAgIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXVxuICAgIHg6IG51bWJlciAvL1xuXG4gICAgY29uc3RydWN0b3IgKGFuZ2xlczogbnVtYmVyW10sIG1pc3Npbmc6IGJvb2xlYW5bXSwgYW5nbGVTdW06IG51bWJlciwgYW5nbGVMYWJlbHM6IHN0cmluZ1tdLCB4OiBudW1iZXIpIHtcbiAgICAgIHRoaXMuYW5nbGVzID0gYW5nbGVzXG4gICAgICB0aGlzLmFuZ2xlU3VtID0gYW5nbGVTdW1cbiAgICAgIHRoaXMuYW5nbGVMYWJlbHMgPSBhbmdsZUxhYmVsc1xuICAgICAgdGhpcy54ID0geFxuICAgICAgdGhpcy5taXNzaW5nID0gbWlzc2luZ1xuICAgIH1cblxuICAgIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IEFsZ2VicmFPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSB7XG4gICAgICAvLyBjYWxjdWxhdGVkIGRlZmF1bHRzIGlmIG5lY2Vzc2FyeVxuICAgICAgb3B0aW9ucy5tYXhDb25zdGFudCA9IG9wdGlvbnMubWF4Q29uc3RhbnQgfHwgb3B0aW9ucy5hbmdsZVN1bSEgLyAyIC8vIGd1YXJhbnRlZWQgbm9uLW51bGwgZnJvbSBhYm92ZVxuICAgICAgb3B0aW9ucy5tYXhYVmFsdWUgPSBvcHRpb25zLm1heFhWYWx1ZSB8fCBvcHRpb25zLmFuZ2xlU3VtISAvIDRcblxuICAgICAgLy8gUmFuZG9taXNlL3NldCB1cCBtYWluIGZlYXR1cmVzXG4gICAgICBjb25zdCBuIDogbnVtYmVyID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5OLCBvcHRpb25zLm1heE4pXG5cbiAgICAgIGNvbnN0IHR5cGUgOiBFeHByZXNzaW9uVHlwZSA9IHJhbmRFbGVtKG9wdGlvbnMuZXhwcmVzc2lvblR5cGVzISkgLy8gZ3VhcmFudGVlZCBub24tbnVsbCBmcm9tIGRlZmF1bCBhc3NpZ25tZW50XG5cbiAgICAgIC8vIEdlbmVyYXRlIGV4cHJlc3Npb25zL2FuZ2xlc1xuICAgICAgbGV0IGV4cHJlc3Npb25zIDogTGluRXhwcltdXG4gICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSAnbWl4ZWQnOlxuICAgICAgICAgIGV4cHJlc3Npb25zID0gbWFrZU1peGVkRXhwcmVzc2lvbnMobiwgb3B0aW9ucyBhcyBSZXF1aXJlZDxBbGdlYnJhT3B0aW9ucz4pXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAnbXVsdGlwbHknOlxuICAgICAgICAgIGV4cHJlc3Npb25zID0gbWFrZU11bHRpcGxpY2F0aW9uRXhwcmVzc2lvbnMobiwgb3B0aW9ucyBhcyBSZXF1aXJlZDxBbGdlYnJhT3B0aW9ucz4pXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAnYWRkJzpcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBleHByZXNzaW9ucyA9IG1ha2VBZGRFeHByZXNzaW9ucyhuLCBvcHRpb25zIGFzIFJlcXVpcmVkPEFsZ2VicmFPcHRpb25zPilcbiAgICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgZXhwcmVzc2lvbnMgPSBzaHVmZmxlKGV4cHJlc3Npb25zKVxuXG4gICAgICAvLyBTb2x2ZSBmb3IgeCBhbmQgYW5nbGVzXG4gICAgICBjb25zdCB7IHgsIGFuZ2xlcyB9IDoge3g6bnVtYmVyLCBhbmdsZXM6IG51bWJlcltdfSA9IHNvbHZlQW5nbGVzKGV4cHJlc3Npb25zLCBvcHRpb25zLmFuZ2xlU3VtISkgLy8gbm9uLW51bGwgZnJvbSBkZWZhdWx0IGFzc2lnbmVtZW50XG5cbiAgICAgIC8vIGxhYmVscyBhcmUganVzdCBleHByZXNzaW9ucyBhcyBzdHJpbmdzXG4gICAgICBjb25zdCBsYWJlbHMgPSBleHByZXNzaW9ucy5tYXAoZSA9PiBgJHtlLnRvU3RyaW5nUCgpfV5cXFxcY2lyY2ApXG5cbiAgICAgIC8vIG1pc3NpbmcgdmFsdWVzIGFyZSB0aGUgb25lcyB3aGljaCBhcmVuJ3QgY29uc3RhbnRcbiAgICAgIGNvbnN0IG1pc3NpbmcgPSBleHByZXNzaW9ucy5tYXAoZSA9PiAhZS5pc0NvbnN0YW50KCkpXG5cbiAgICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhKGFuZ2xlcywgbWlzc2luZywgb3B0aW9ucy5hbmdsZVN1bSEsIGxhYmVscywgeClcbiAgICB9XG5cbiAgICAvLyBtYWtlcyB0eXBlc2NyaXB0IHNodXQgdXAsIG1ha2VzIGVzbGludCBub2lzeVxuICAgIGluaXRMYWJlbHMgKCkgOiB2b2lkIHt9ICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG59XG5cbmZ1bmN0aW9uIG1ha2VNaXhlZEV4cHJlc3Npb25zIChuOiBudW1iZXIsIG9wdGlvbnM6IFJlcXVpcmVkPEFsZ2VicmFPcHRpb25zPikgOiBMaW5FeHByW10ge1xuICBjb25zdCBleHByZXNzaW9uczogTGluRXhwcltdID0gW11cbiAgY29uc3QgeCA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluWFZhbHVlLCBvcHRpb25zLm1heFhWYWx1ZSlcbiAgbGV0IGxlZnQgPSBvcHRpb25zLmFuZ2xlU3VtXG4gIGxldCBhbGxjb25zdGFudCA9IHRydWVcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuIC0gMTsgaSsrKSB7XG4gICAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKDEsIG9wdGlvbnMubWF4Q29lZmZpY2llbnQpXG4gICAgbGVmdCAtPSBhICogeFxuICAgIGNvbnN0IG1heGIgPSBNYXRoLm1pbihsZWZ0IC0gb3B0aW9ucy5taW5BbmdsZSAqIChuIC0gaSAtIDEpLCBvcHRpb25zLm1heENvbnN0YW50KVxuICAgIGNvbnN0IG1pbmIgPSBvcHRpb25zLm1pbkFuZ2xlIC0gYSAqIHhcbiAgICBjb25zdCBiID0gcmFuZEJldHdlZW4obWluYiwgbWF4YilcbiAgICBpZiAoYSAhPT0gMCkgeyBhbGxjb25zdGFudCA9IGZhbHNlIH1cbiAgICBsZWZ0IC09IGJcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKGEsIGIpKVxuICB9XG4gIGNvbnN0IGxhc3RNaW5YQ29lZmYgPSBhbGxjb25zdGFudCA/IDEgOiBvcHRpb25zLm1pbkNvZWZmaWNpZW50XG4gIGNvbnN0IGEgPSByYW5kQmV0d2VlbihsYXN0TWluWENvZWZmLCBvcHRpb25zLm1heENvZWZmaWNpZW50KVxuICBjb25zdCBiID0gbGVmdCAtIGEgKiB4XG4gIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoYSwgYikpXG5cbiAgcmV0dXJuIGV4cHJlc3Npb25zXG59XG5cbmZ1bmN0aW9uIG1ha2VBZGRFeHByZXNzaW9ucyAobjogbnVtYmVyLCBvcHRpb25zOiBSZXF1aXJlZDxBbGdlYnJhT3B0aW9ucz4pIDogTGluRXhwcltdIHtcbiAgY29uc3QgZXhwcmVzc2lvbnM6IExpbkV4cHJbXSA9IFtdXG4gIGNvbnN0IGFuZ2xlczogbnVtYmVyW10gPSBbXVxuICBjb25zdCBjb25zdGFudHMgPSAob3B0aW9ucy5pbmNsdWRlQ29uc3RhbnRzID09PSB0cnVlIHx8IHdlYWtJbmNsdWRlcyhvcHRpb25zLmluY2x1ZGVDb25zdGFudHMsICdhZGQnKSlcbiAgaWYgKG4gPT09IDIgJiYgb3B0aW9ucy5lbnN1cmVYICYmIGNvbnN0YW50cykgbiA9IDNcblxuICBjb25zdCB4ID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5YVmFsdWUsIG9wdGlvbnMubWF4WFZhbHVlKVxuICBsZXQgbGVmdCA9IG9wdGlvbnMuYW5nbGVTdW1cbiAgbGV0IGFuZ2xlc0xlZnQgPSBuXG5cbiAgLy8gZmlyc3QgZG8gdGhlIGV4cHJlc3Npb25zIGVuc3VyZWQgYnkgZW5zdXJlX3ggYW5kIGNvbnN0YW50c1xuICBpZiAob3B0aW9ucy5lbnN1cmVYKSB7XG4gICAgYW5nbGVzTGVmdC0tXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCAwKSlcbiAgICBhbmdsZXMucHVzaCh4KVxuICAgIGxlZnQgLT0geFxuICB9XG5cbiAgaWYgKGNvbnN0YW50cykge1xuICAgIGFuZ2xlc0xlZnQtLVxuICAgIGNvbnN0IGMgPSByYW5kQmV0d2VlbihcbiAgICAgIG9wdGlvbnMubWluQW5nbGUsXG4gICAgICBsZWZ0IC0gb3B0aW9ucy5taW5BbmdsZSAqIGFuZ2xlc0xlZnRcbiAgICApXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigwLCBjKSlcbiAgICBhbmdsZXMucHVzaChjKVxuICAgIGxlZnQgLT0gY1xuICB9XG5cbiAgLy8gbWlkZGxlIGFuZ2xlc1xuICB3aGlsZSAoYW5nbGVzTGVmdCA+IDEpIHtcbiAgICAvLyBhZGQgJ3grYicgYXMgYW4gZXhwcmVzc2lvbi4gTWFrZSBzdXJlIGIgZ2l2ZXMgc3BhY2VcbiAgICBhbmdsZXNMZWZ0LS1cbiAgICBsZWZ0IC09IHhcbiAgICBjb25zdCBtYXhiID0gTWF0aC5taW4oXG4gICAgICBsZWZ0IC0gb3B0aW9ucy5taW5BbmdsZSAqIGFuZ2xlc0xlZnQsXG4gICAgICBvcHRpb25zLm1heENvbnN0YW50XG4gICAgKVxuICAgIGNvbnN0IG1pbmIgPSBNYXRoLm1heChcbiAgICAgIG9wdGlvbnMubWluQW5nbGUgLSB4LFxuICAgICAgLW9wdGlvbnMubWF4Q29uc3RhbnRcbiAgICApXG4gICAgY29uc3QgYiA9IHJhbmRCZXR3ZWVuKG1pbmIsIG1heGIpXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCBiKSlcbiAgICBhbmdsZXMucHVzaCh4ICsgYilcbiAgICBsZWZ0IC09IGJcbiAgfVxuXG4gIC8vIGxhc3QgYW5nbGVcbiAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCBsZWZ0IC0geCkpXG4gIGFuZ2xlcy5wdXNoKGxlZnQpXG5cbiAgcmV0dXJuIGV4cHJlc3Npb25zXG59XG5cbmZ1bmN0aW9uIG1ha2VNdWx0aXBsaWNhdGlvbkV4cHJlc3Npb25zIChuOiBudW1iZXIsIG9wdGlvbnM6IEFsZ2VicmFPcHRpb25zKSA6IExpbkV4cHJbXSB7XG4gIGNvbnN0IGV4cHJlc3Npb25zIDogTGluRXhwcltdID0gW11cblxuICBjb25zdCBjb25zdGFudHMgOiBib29sZWFuID0gKG9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cyA9PT0gdHJ1ZSB8fCB3ZWFrSW5jbHVkZXMob3B0aW9ucy5pbmNsdWRlQ29uc3RhbnRzLCAnbXVsdCcpKVxuICBpZiAobiA9PT0gMiAmJiBvcHRpb25zLmVuc3VyZVggJiYgY29uc3RhbnRzKSBuID0gMyAvLyBuZWVkIGF0IGxlYXN0IDMgYW5nbGVzIGZvciB0aGlzIHRvIG1ha2Ugc2Vuc2VcblxuICAvLyBjaG9vc2UgYSB0b3RhbCBvZiBjb2VmZmljaWVudHNcbiAgLy8gcGljayB4IGJhc2VkIG9uIHRoYXRcbiAgbGV0IGFuZ2xlc2xlZnQgPSBuXG4gIGNvbnN0IHRvdGFsQ29lZmYgPSBjb25zdGFudHNcbiAgICA/IHJhbmRCZXR3ZWVuKG4sIChvcHRpb25zLmFuZ2xlU3VtIC0gb3B0aW9ucy5taW5BbmdsZSkgLyBvcHRpb25zLm1pbkFuZ2xlLCBNYXRoLnJhbmRvbSkgLy8gaWYgaXQncyB0b28gYmlnLCBhbmdsZXMgZ2V0IHRvbyBzbWFsbFxuICAgIDogcmFuZEVsZW0oWzMsIDQsIDUsIDYsIDgsIDksIDEwXS5maWx0ZXIoeCA9PiB4ID49IG4pLCBNYXRoLnJhbmRvbSlcbiAgbGV0IGNvZWZmbGVmdCA9IHRvdGFsQ29lZmZcblxuICAvLyBmaXJzdCAwLzEvMlxuICBpZiAoY29uc3RhbnRzKSB7XG4gICAgLy8gcmVkdWNlIHRvIG1ha2Ugd2hhdCdzIGxlZnQgYSBtdWx0aXBsZSBvZiB0b3RhbF9jb2VmZlxuICAgIGFuZ2xlc2xlZnQtLVxuICAgIGNvbnN0IG5ld2xlZnQgPSByYW5kTXVsdEJldHdlZW4odG90YWxDb2VmZiAqIG9wdGlvbnMubWluQW5nbGUsIG9wdGlvbnMuYW5nbGVTdW0gLSBvcHRpb25zLm1pbkFuZ2xlLCB0b3RhbENvZWZmKVxuICAgIGNvbnN0IGMgPSBvcHRpb25zLmFuZ2xlU3VtIC0gbmV3bGVmdFxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMCwgYykpXG4gIH1cblxuICAvLyBEb24ndCB1c2UgeCBoZXJlLCBidXQ6XG4gIC8vIHggPSBsZWZ0IC8gdG90YWxDb2VmZlxuXG4gIGlmIChvcHRpb25zLmVuc3VyZVgpIHtcbiAgICBhbmdsZXNsZWZ0LS1cbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKVxuICAgIGNvZWZmbGVmdCAtPSAxXG4gIH1cblxuICAvLyBtaWRkbGVcbiAgd2hpbGUgKGFuZ2xlc2xlZnQgPiAxKSB7XG4gICAgYW5nbGVzbGVmdC0tXG4gICAgY29uc3QgbWluYSA9IDFcbiAgICBjb25zdCBtYXhhID0gY29lZmZsZWZ0IC0gYW5nbGVzbGVmdCAvLyBsZWF2ZSBlbm91Z2ggZm9yIG90aGVycyBUT0RPOiBhZGQgbWF4X2NvZWZmXG4gICAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKG1pbmEsIG1heGEpXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihhLCAwKSlcbiAgICBjb2VmZmxlZnQgLT0gYVxuICB9XG5cbiAgLy8gbGFzdFxuICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKGNvZWZmbGVmdCwgMCkpXG4gIHJldHVybiBleHByZXNzaW9uc1xufVxuIiwiaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgTGFiZWwgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcgZXh0ZW5kcyBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyB7XG4gIC8vIE8gOiBQb2ludCAgICAgIEluaGVyaXRlZCBmcm9tIE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3XG4gIC8vIEE6IFBvaW50ICAgICAgICAgfFxuICAvLyBDOiBQb2ludFtdICAgICAgIHxcbiAgLy8gcm90YXRpb246IG51bWJlciBWXG5cbiAgICAvLyBsYWJlbHM6IExhYmVsW10gICAgICAgICAgICBJbmhlcml0ZWQgZnJvbSBHcmFwaGljUVZpZXdcbiAgICAvLyBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50ICAgICAgfFxuICAgIC8vIERPTTogSFRNTEVsZW1lbnQgICAgICAgICAgICAgICB8XG4gICAgLy8gd2lkdGg6IG51bWJlciAgICAgICAgICAgICAgICAgIHxcbiAgICAvLyBoZWlnaHQ6IG51bWJlciAgICAgICAgICAgICAgICAgVlxuICAgIGRhdGEhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgLy8gaW5pdGlhbGlzZWQgYnkgc3VwZXIoKVxuXG4gICAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSwgb3B0aW9uczogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSB7XG4gICAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBzdXBlciBjb25zdHJ1Y3RvciBkb2VzIHJlYWwgd29ya1xuICAgICAgY29uc3Qgc29sdXRpb25MYWJlbDogUGFydGlhbDxMYWJlbD4gPSB7XG4gICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwKSxcbiAgICAgICAgdGV4dHE6ICcnLFxuICAgICAgICB0ZXh0YTogYHggPSAke3RoaXMuZGF0YS54fV5cXFxcY2lyY2AsXG4gICAgICAgIHN0eWxlcTogJ2hpZGRlbicsXG4gICAgICAgIHN0eWxlYTogJ2V4dHJhLWFuc3dlcidcbiAgICAgIH1cbiAgICAgIHNvbHV0aW9uTGFiZWwuc3R5bGUgPSBzb2x1dGlvbkxhYmVsLnN0eWxlcVxuICAgICAgc29sdXRpb25MYWJlbC50ZXh0ID0gc29sdXRpb25MYWJlbC50ZXh0cVxuXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKHNvbHV0aW9uTGFiZWwgYXMgTGFiZWwpXG4gICAgfVxufVxuIiwiLyoqIE1pc3NpbmcgYW5nbGVzIGFyb3VuZCBhIHBvaW50IG9yIG9uIGEgc3RyYWlnaHQgbGluZSwgdXNpbmcgYWxnZWJyYWljIGV4cHJlc3Npb25zICovXG5cbmltcG9ydCB7IE9wdGlvbnNTcGVjIH0gZnJvbSAnT3B0aW9uc1NwZWMnXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tICcuL0FsZ2VicmFPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhITogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIC8vIGluaXRpYWxpc2VkIGluIHN1cGVyKClcbiAgdmlldyE6IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlld1xuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFBhcnRpYWw8QWxnZWJyYU9wdGlvbnM+LCB2aWV3T3B0aW9uczogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSB7XG4gICAgY29uc3QgZGVmYXVsdHMgOiBBbGdlYnJhT3B0aW9ucyA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5BbmdsZTogMTUsXG4gICAgICBtaW5OOiAyLFxuICAgICAgbWF4TjogNCxcbiAgICAgIHJlcGVhdGVkOiBmYWxzZSxcbiAgICAgIGV4cHJlc3Npb25UeXBlczogWydhZGQnLCAnbXVsdGlwbHknLCAnbWl4ZWQnXSxcbiAgICAgIGVuc3VyZVg6IHRydWUsXG4gICAgICBpbmNsdWRlQ29uc3RhbnRzOiB0cnVlLFxuICAgICAgbWluQ29lZmZpY2llbnQ6IDEsXG4gICAgICBtYXhDb2VmZmljaWVudDogNCxcbiAgICAgIG1pblhWYWx1ZTogMTVcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3M6IEFsZ2VicmFPcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLnJhbmRvbShzZXR0aW5ncylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlldyhkYXRhLCB2aWV3T3B0aW9ucykgLy8gVE9ETyBlbGltaW5hdGUgcHVibGljIGNvbnN0cnVjdG9yc1xuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cblxuICBzdGF0aWMgZ2V0IG9wdGlvbnNTcGVjICgpIDogT3B0aW9uc1NwZWMge1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnZXhwcmVzc2lvblR5cGVzJyxcbiAgICAgICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgICAgICB0aXRsZTogJ1R5cGVzIG9mIGV4cHJlc3Npb24nLFxuICAgICAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICAgICAgeyB0aXRsZTogJzxlbT5hPC9lbT4rPGVtPng8L2VtPicsIGlkOiAnYWRkJyB9LFxuICAgICAgICAgIHsgdGl0bGU6ICc8ZW0+YXg8L2VtPicsIGlkOiAnbXVsdGlwbHknIH0sXG4gICAgICAgICAgeyB0aXRsZTogJ21peGVkJywgaWQ6ICdtaXhlZCcgfVxuICAgICAgICBdLFxuICAgICAgICBkZWZhdWx0OiBbJ2FkZCcsICdtdWx0aXBseScsICdtaXhlZCddXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogJ2Vuc3VyZVgnLFxuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnRW5zdXJlIG9uZSBhbmdsZSBpcyA8ZW0+eDwvZW0+JyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgaWQ6ICdpbmNsdWRlQ29uc3RhbnRzJyxcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJ0Vuc3VyZSBhIGNvbnN0YW50IGFuZ2xlJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgfVxuICAgIF1cbiAgfVxufVxuIiwiaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgTGFiZWwgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFWaWV3IGV4dGVuZHMgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyB7XG4gIGRhdGEhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgLy8gaW5pdGlhbGlzZWQgaW4gc3VwZXIuc3VwZXJcbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSwgb3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKVxuXG4gICAgY29uc3Qgc29sdXRpb25MYWJlbDogUGFydGlhbDxMYWJlbD4gPSB7XG4gICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdGhpcy5oZWlnaHQgLSAxMCksXG4gICAgICB0ZXh0cTogJycsXG4gICAgICB0ZXh0YTogYHggPSAke3RoaXMuZGF0YS54fV5cXFxcY2lyY2AsXG4gICAgICBzdHlsZXE6ICdoaWRkZW4nLFxuICAgICAgc3R5bGVhOiAnZXh0cmEtYW5zd2VyJ1xuICAgIH1cbiAgICBzb2x1dGlvbkxhYmVsLnN0eWxlID0gc29sdXRpb25MYWJlbC5zdHlsZXFcbiAgICBzb2x1dGlvbkxhYmVsLnRleHQgPSBzb2x1dGlvbkxhYmVsLnRleHRxXG5cbiAgICB0aGlzLmxhYmVscy5wdXNoKHNvbHV0aW9uTGFiZWwgYXMgTGFiZWwpXG4gIH1cbn1cbiIsImltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgeyBBbGdlYnJhT3B0aW9ucyB9IGZyb20gJy4vQWxnZWJyYU9wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVZpZXcnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhITogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhXG4gIHZpZXchOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogUGFydGlhbDxBbGdlYnJhT3B0aW9ucz4sIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUSB7XG4gICAgY29uc3Qgb3B0aW9uc092ZXJyaWRlIDogUGFydGlhbDxBbGdlYnJhT3B0aW9ucz4gPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDMsXG4gICAgICByZXBlYXRlZDogZmFsc2VcbiAgICB9XG4gICAgY29uc3QgZGVmYXVsdHMgOiBBbGdlYnJhT3B0aW9ucyA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5OOiAzLFxuICAgICAgbWF4TjogMyxcbiAgICAgIHJlcGVhdGVkOiBmYWxzZSxcbiAgICAgIG1pbkFuZ2xlOiAyNSxcbiAgICAgIGV4cHJlc3Npb25UeXBlczogWydhZGQnLCAnbXVsdGlwbHknLCAnbWl4ZWQnXSxcbiAgICAgIGVuc3VyZVg6IHRydWUsXG4gICAgICBpbmNsdWRlQ29uc3RhbnRzOiB0cnVlLFxuICAgICAgbWluQ29lZmZpY2llbnQ6IDEsXG4gICAgICBtYXhDb2VmZmljaWVudDogNCxcbiAgICAgIG1pblhWYWx1ZTogMTVcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3M6IEFsZ2VicmFPcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMsIG9wdGlvbnNPdmVycmlkZSlcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEucmFuZG9tKHNldHRpbmdzKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVZpZXcoZGF0YSwgdmlld09wdGlvbnMpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzV29yZGVkRGF0YSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkVmlldyBleHRlbmRzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcge1xuICBkYXRhITogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgLy8gaW5pdGlhbGlzZWQgaW4gc3VwZXJcbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLCBvcHRpb25zOiBWaWV3T3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpXG4gICAgc3VwZXIuc2NhbGVUb0ZpdCh0aGlzLndpZHRoLCB0aGlzLmhlaWdodCwgNDApXG4gICAgc3VwZXIudHJhbnNsYXRlKDAsIC0zMClcblxuICAgIGNvbnN0IGluc3RydWN0aW9uTGFiZWw6IExhYmVsID0ge1xuICAgICAgdGV4dHE6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHRleHRhOiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICB0ZXh0OiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICBzdHlsZXE6ICdleHRyYS1pbmZvJyxcbiAgICAgIHN0eWxlYTogJ2V4dHJhLWluZm8nLFxuICAgICAgc3R5bGU6ICdleHRyYS1pbmZvJyxcbiAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwKVxuICAgIH1cbiAgICB0aGlzLmxhYmVscy5wdXNoKGluc3RydWN0aW9uTGFiZWwpXG4gIH1cbn1cbiIsImltcG9ydCBMaW5FeHByIGZyb20gJ0xpbkV4cHInXG5pbXBvcnQgeyByYW5kQmV0d2VlbiwgcmFuZEVsZW0sIHJhbmRNdWx0QmV0d2VlbiB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCB7IEdyYXBoaWNRRGF0YSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSdcbmltcG9ydCB7IHNvbHZlQW5nbGVzIH0gZnJvbSAnLi9zb2x2ZUFuZ2xlcydcbmltcG9ydCB7IFdvcmRlZE9wdGlvbnMgfSBmcm9tICcuL1dvcmRlZE9wdGlvbnMnXG5cbmV4cG9ydCB0eXBlIFdvcmRlZFR5cGUgPSAnYWRkJyB8ICdtdWx0aXBseScgfCAncmF0aW8nIHwgJ3BlcmNlbnQnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGltcGxlbWVudHMgR3JhcGhpY1FEYXRhIHtcbiAgYW5nbGVzOiBudW1iZXJbXVxuICBtaXNzaW5nOiBib29sZWFuW11cbiAgYW5nbGVTdW06IG51bWJlclxuICBhbmdsZUxhYmVsczogc3RyaW5nW11cbiAgaW5zdHJ1Y3Rpb25zOiBzdHJpbmdbXSAvLyBUaGUgJ2luc3RydWN0aW9ucycgZ2l2ZW5cblxuICBjb25zdHJ1Y3RvciAoYW5nbGVzOiBudW1iZXJbXSwgbWlzc2luZzogYm9vbGVhbltdLCBhbmdsZVN1bTogbnVtYmVyLCBhbmdsZUxhYmVsczogc3RyaW5nW10sIGluc3RydWN0aW9uczogc3RyaW5nW10pIHtcbiAgICB0aGlzLmFuZ2xlcyA9IGFuZ2xlc1xuICAgIHRoaXMubWlzc2luZyA9IG1pc3NpbmdcbiAgICB0aGlzLmFuZ2xlU3VtID0gYW5nbGVTdW1cbiAgICB0aGlzLmFuZ2xlTGFiZWxzID0gYW5nbGVMYWJlbHNcbiAgICB0aGlzLmluc3RydWN0aW9ucyA9IGluc3RydWN0aW9uc1xuICAgIHRoaXMuaW5zdHJ1Y3Rpb25zID0gaW5zdHJ1Y3Rpb25zXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zIDogV29yZGVkT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSB7XG4gICAgY29uc3QgbiA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTiwgb3B0aW9ucy5tYXhOKVxuICAgIGNvbnN0IGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIGFuZ2xlTGFiZWxzW2ldID0gU3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpIC8vIDY1ID0gJ0EnXG4gICAgfVxuICAgIGxldCBleHByZXNzaW9uczogTGluRXhwcltdID0gW11cbiAgICBsZXQgaW5zdHJ1Y3Rpb25zOiBzdHJpbmdbXSA9IFtdXG5cbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKVxuXG4gICAgLy8gTG9vcCB0aWwgd2UgZ2V0IG9uZSB0aGF0IHdvcmtzXG4gICAgLy8gUHJvYmFibHkgcmVhbGx5IGluZWZmaWNpZW50ISFcblxuICAgIGxldCBzdWNjZXNzID0gZmFsc2VcbiAgICBsZXQgYXR0ZW1wdGNvdW50ID0gMFxuICAgIHdoaWxlICghc3VjY2Vzcykge1xuICAgICAgaWYgKGF0dGVtcHRjb3VudCA+IDIwKSB7XG4gICAgICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgMCkpXG4gICAgICAgIGNvbnNvbGUubG9nKCdHYXZlIHVwIGFmdGVyICcgKyBhdHRlbXB0Y291bnQgKyAnIGF0dGVtcHRzJylcbiAgICAgICAgc3VjY2VzcyA9IHRydWVcbiAgICAgIH1cbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSByYW5kRWxlbShvcHRpb25zLnR5cGVzKVxuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICBjYXNlICdhZGQnOiB7XG4gICAgICAgICAgICBjb25zdCBhZGRlbmQgPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbkFkZGVuZCwgb3B0aW9ucy5tYXhBZGRlbmQpXG4gICAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb25zW2kgLSAxXS5hZGQoYWRkZW5kKSlcbiAgICAgICAgICAgIGluc3RydWN0aW9ucy5wdXNoKGBcXFxcdGV4dHtBbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSl9JCBpcyAke2NvbXBhcmF0b3IoYWRkZW5kLCAnKycpfSBhbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY0ICsgaSl9JH1gKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSAnbXVsdGlwbHknOiB7XG4gICAgICAgICAgICBjb25zdCBtdWx0aXBsaWVyID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5NdWx0aXBsaWVyLCBvcHRpb25zLm1heE11bHRpcGxpZXIpXG4gICAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb25zW2kgLSAxXS50aW1lcyhtdWx0aXBsaWVyKSlcbiAgICAgICAgICAgIGluc3RydWN0aW9ucy5wdXNoKGBcXFxcdGV4dHtBbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSl9JCBpcyAke2NvbXBhcmF0b3IobXVsdGlwbGllciwgJyonKX0gYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NCArIGkpfSR9YClcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ3BlcmNlbnQnOiB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50YWdlID0gcmFuZE11bHRCZXR3ZWVuKDUsIDEwMCwgNSlcbiAgICAgICAgICAgIGNvbnN0IGluY3JlYXNlID0gTWF0aC5yYW5kb20oKSA8IDAuNVxuICAgICAgICAgICAgY29uc3QgbXVsdGlwbGllciA9IGluY3JlYXNlID8gMSArIHBlcmNlbnRhZ2UgLyAxMDAgOiAxIC0gcGVyY2VudGFnZSAvIDEwMFxuICAgICAgICAgICAgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uc1tpIC0gMV0udGltZXMobXVsdGlwbGllcikpXG4gICAgICAgICAgICBpbnN0cnVjdGlvbnMucHVzaChcbiAgICAgICAgICAgICAgYFxcXFx0ZXh0e0FuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKX0kIGlzICQke3BlcmNlbnRhZ2V9XFxcXCUkICR7aW5jcmVhc2UgPyAnYmlnZ2VyJyA6ICdzbWFsbGVyJ30gdGhhbiBhbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY0ICsgaSl9JH1gKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSAncmF0aW8nOiB7XG4gICAgICAgICAgICBjb25zdCBhID0gcmFuZEJldHdlZW4oMSwgMTApXG4gICAgICAgICAgICBjb25zdCBiID0gcmFuZEJldHdlZW4oMSwgMTApXG4gICAgICAgICAgICBjb25zdCBtdWx0aXBsaWVyID0gYiAvIGFcbiAgICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2goZXhwcmVzc2lvbnNbaSAtIDFdLnRpbWVzKG11bHRpcGxpZXIpKVxuICAgICAgICAgICAgaW5zdHJ1Y3Rpb25zLnB1c2goXG4gICAgICAgICAgICAgIGBcXFxcdGV4dHtUaGUgcmF0aW8gb2YgYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NCArIGkpfSQgdG8gYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpfSQgaXMgJCR7YX06JHtifSR9YFxuICAgICAgICAgICAgKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gY2hlY2sgaXQgbWFrZXMgc2Vuc2VcbiAgICAgIHN1Y2Nlc3MgPSB0cnVlXG4gICAgICBjb25zdCBleHByZXNzaW9uc3VtID0gZXhwcmVzc2lvbnMucmVkdWNlKChleHAxLCBleHAyKSA9PiBleHAxLmFkZChleHAyKSlcbiAgICAgIGNvbnN0IHggPSBMaW5FeHByLnNvbHZlKGV4cHJlc3Npb25zdW0sIG5ldyBMaW5FeHByKDAsIG9wdGlvbnMuYW5nbGVTdW0pKVxuXG4gICAgICBleHByZXNzaW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChleHByKSB7XG4gICAgICAgIGlmICghc3VjY2VzcyB8fCBleHByLmV2YWwoeCkgPCBvcHRpb25zLm1pbkFuZ2xlKSB7XG4gICAgICAgICAgc3VjY2VzcyA9IGZhbHNlXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zID0gW11cbiAgICAgICAgICBleHByZXNzaW9ucyA9IFtleHByZXNzaW9uc1swXV1cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgYXR0ZW1wdGNvdW50KytcbiAgICB9XG4gICAgY29uc29sZS5sb2coJ0F0dGVtcHRzOiAnICsgYXR0ZW1wdGNvdW50KVxuXG4gICAgY29uc3QgYW5nbGVzID0gc29sdmVBbmdsZXMoZXhwcmVzc2lvbnMsIG9wdGlvbnMuYW5nbGVTdW0pLmFuZ2xlc1xuICAgIGNvbnN0IG1pc3NpbmcgPSBhbmdsZXMubWFwKCgpID0+IHRydWUpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVzLCBtaXNzaW5nLCBvcHRpb25zLmFuZ2xlU3VtLCBhbmdsZUxhYmVscywgaW5zdHJ1Y3Rpb25zKVxuICB9XG5cbiAgLy8gbWFrZXMgdHlwZXNjcmlwdCBzaHV0IHVwLCBtYWtlcyBlc2xpbnQgbm9pc3lcbiAgaW5pdExhYmVscygpOiB2b2lkIHsgfSAgLy8gZXNsaW50LWRpc2FibGUtbGluZVxufVxuXG4vKipcbiAqIEdlbmVyYXRlcyB3b3JkZWQgdmVyc2lvbiBvZiBhbiBvcGVyYXRpb1xuICogQHBhcmFtIG51bWJlciBUaGUgbXVsdGlwbGllciBvciBhZGRlbmRcbiAqIEBwYXJhbSBvcGVyYXRvciBUaGUgb3BlcmF0b3IsIGUuZyBhZGRpbmcgJ21vcmUgdGhhbicsIG9yIG11bHRpcGx5aW5nICd0aW1lcyBsYXJnZXIgdGhhbidcbiAqL1xuZnVuY3Rpb24gY29tcGFyYXRvciAobnVtYmVyOiBudW1iZXIsIG9wZXJhdG9yOiAnKid8JysnKSB7XG4gIHN3aXRjaCAob3BlcmF0b3IpIHtcbiAgICBjYXNlICcqJzpcbiAgICAgIHN3aXRjaCAobnVtYmVyKSB7XG4gICAgICAgIGNhc2UgMTogcmV0dXJuICd0aGUgc2FtZSBhcydcbiAgICAgICAgY2FzZSAyOiByZXR1cm4gJ2RvdWJsZSdcbiAgICAgICAgZGVmYXVsdDogcmV0dXJuIGAkJHtudW1iZXJ9JCB0aW1lcyBsYXJnZXIgdGhhbmBcbiAgICAgIH1cbiAgICBjYXNlICcrJzpcbiAgICAgIHN3aXRjaCAobnVtYmVyKSB7XG4gICAgICAgIGNhc2UgMDogcmV0dXJuICd0aGUgc2FtZSBhcydcbiAgICAgICAgZGVmYXVsdDogcmV0dXJuIGAkJHtNYXRoLmFicyhudW1iZXIpLnRvU3RyaW5nKCl9XlxcXFxjaXJjJCAkeyhudW1iZXIgPCAwKSA/ICdsZXNzIHRoYW4nIDogJ21vcmUgdGhhbid9YFxuICAgICAgfVxuICB9XG59XG4iLCJpbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3J1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEnXG5pbXBvcnQgeyBXb3JkZWRPcHRpb25zIH0gZnJvbSAnLi9Xb3JkZWRPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhITogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGFcbiAgdmlldyE6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXdcblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBQYXJ0aWFsPFdvcmRlZE9wdGlvbnM+LCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkUSB7XG4gICAgY29uc3Qgb3B0aW9uc092ZXJyaWRlIDogUGFydGlhbDxXb3JkZWRPcHRpb25zPiA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5OOiAzLFxuICAgICAgbWF4TjogMyxcbiAgICAgIHJlcGVhdGVkOiBmYWxzZVxuICAgIH1cbiAgICBjb25zdCBkZWZhdWx0cyA6IFdvcmRlZE9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDI1LFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDMsXG4gICAgICByZXBlYXRlZDogZmFsc2UsXG4gICAgICBtaW5BZGRlbmQ6IC02MCxcbiAgICAgIG1heEFkZGVuZDogNjAsXG4gICAgICBtaW5NdWx0aXBsaWVyOiAxLFxuICAgICAgbWF4TXVsdGlwbGllcjogNSxcbiAgICAgIHR5cGVzOiBbJ2FkZCcsICdtdWx0aXBseScsICdwZXJjZW50JywgJ3JhdGlvJ11cbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3M6IFdvcmRlZE9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucywgb3B0aW9uc092ZXJyaWRlKVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLnJhbmRvbShzZXR0aW5ncylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXcoZGF0YSwgdmlld09wdGlvbnMpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3IGV4dGVuZHMgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcge1xuICBkYXRhITogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgLy8gaW5pdGlhbGlzZWQgaW4gY2FsbCB0byBzdXBlclxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEsIG9wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIGRvZXMgbW9zdCBvZiB0aGUgc2V0IHVwXG4gICAgc3VwZXIudHJhbnNsYXRlKDAsIC0xNSlcbiAgICBjb25zdCBpbnN0cnVjdGlvbkxhYmVsIDogTGFiZWwgPSB7XG4gICAgICB0ZXh0cTogdGhpcy5kYXRhLmluc3RydWN0aW9ucy5qb2luKCdcXFxcXFxcXCcpLFxuICAgICAgdGV4dGE6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHRleHQ6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHN0eWxlcTogJ2V4dHJhLWluZm8nLFxuICAgICAgc3R5bGVhOiAnZXh0cmEtaW5mbycsXG4gICAgICBzdHlsZTogJ2V4dHJhLWluZm8nLFxuICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIHRoaXMuaGVpZ2h0IC0gMTApXG4gICAgfVxuICAgIHRoaXMubGFiZWxzLnB1c2goaW5zdHJ1Y3Rpb25MYWJlbClcbiAgfVxufVxuIiwiaW1wb3J0IHsgT3B0aW9uc1NwZWMgfSBmcm9tICdPcHRpb25zU3BlYydcbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEnXG5pbXBvcnQgeyBXb3JkZWRPcHRpb25zIH0gZnJvbSAnLi9Xb3JkZWRPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzV29yZGVkUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhXG4gIHZpZXchOiBNaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlld1xuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFBhcnRpYWw8V29yZGVkT3B0aW9ucz4sIHZpZXdPcHRpb25zOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1dvcmRlZFEge1xuICAgIGNvbnN0IGRlZmF1bHRzIDogV29yZGVkT3B0aW9ucyA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5BbmdsZTogMTUsXG4gICAgICBtaW5OOiAyLFxuICAgICAgbWF4TjogMixcbiAgICAgIHJlcGVhdGVkOiBmYWxzZSxcbiAgICAgIG1pbkFkZGVuZDogLTkwLFxuICAgICAgbWF4QWRkZW5kOiA5MCxcbiAgICAgIG1pbk11bHRpcGxpZXI6IDEsXG4gICAgICBtYXhNdWx0aXBsaWVyOiA1LFxuICAgICAgdHlwZXM6IFsnYWRkJywgJ211bHRpcGx5JywgJ3BlcmNlbnQnLCAncmF0aW8nXVxuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLnJhbmRvbShzZXR0aW5ncylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3KGRhdGEsIHZpZXdPcHRpb25zKVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IG9wdGlvbnNTcGVjICgpOiBPcHRpb25zU3BlYyB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgICAgICB0aXRsZTogJ1F1ZXN0aW9uIHR5cGVzJyxcbiAgICAgICAgaWQ6ICd0eXBlcycsXG4gICAgICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgICAgICB7IHRpdGxlOiAnTW9yZSB0aGFuL2xlc3MgdGhhbicsIGlkOiAnYWRkJyB9LFxuICAgICAgICAgIHsgdGl0bGU6ICdNdWx0aXBsZXMnLCBpZDogJ211bHRpcGx5JyB9LFxuICAgICAgICAgIHsgdGl0bGU6ICdQZXJjZW50YWdlIGNoYW5nZScsIGlkOiAncGVyY2VudCcgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnUmF0aW9zJywgaWQ6ICdyYXRpbycgfVxuICAgICAgICBdLFxuICAgICAgICBkZWZhdWx0OiBbJ2FkZCcsICdtdWx0aXBseSddXG4gICAgICB9XG4gICAgXVxuICB9XG59XG4iLCIvKiogIENsYXNzIHRvIHdyYXAgdmFyaW91cyBtaXNzaW5nIGFuZ2xlcyBjbGFzc2VzXG4gKiBSZWFkcyBvcHRpb25zIGFuZCB0aGVuIHdyYXBzIHRoZSBhcHByb3ByaWF0ZSBvYmplY3QsIG1pcnJvcmluZyB0aGUgbWFpblxuICogcHVibGljIG1ldGhvZHNcbiAqXG4gKiBUaGlzIGNsYXNzIGRlYWxzIHdpdGggdHJhbnNsYXRpbmcgZGlmZmljdWx0eSBpbnRvIHF1ZXN0aW9uIHR5cGVzXG4qL1xuXG5pbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tICd1dGlsaXRpZXMnXG5cbmltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbi9RdWVzdGlvbidcbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5cbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVRJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSBmcm9tICcuL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFRJ1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tICcuL0FsZ2VicmFPcHRpb25zJ1xuXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkUSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1dvcmRlZFEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzV29yZGVkUSdcbmltcG9ydCB7IFdvcmRlZE9wdGlvbnMgfSBmcm9tICcuL1dvcmRlZE9wdGlvbnMnXG5cbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuXG50eXBlIFF1ZXN0aW9uVHlwZSA9ICdhb3NsJyB8ICdhYWFwJyB8ICd0cmlhbmdsZSdcbnR5cGUgUXVlc3Rpb25TdWJUeXBlID0gJ3NpbXBsZScgfCAncmVwZWF0ZWQnIHwgJ2FsZ2VicmEnIHwgJ3dvcmRlZCdcblxudHlwZSBRdWVzdGlvbk9wdGlvbnMgPSBNaXNzaW5nQW5nbGVPcHRpb25zICYgQWxnZWJyYU9wdGlvbnMgJiBXb3JkZWRPcHRpb25zIC8vIG9wdGlvbnMgdG8gcGFzcyB0byBxdWVzdGlvbnNcblxuLyoqIFRoZSBvcHRpb25zIHBhc3NlZCB1c2luZyBvcHRpb25zU3BlYyAqL1xuaW50ZXJmYWNlIFdyYXBwZXJPcHRpb25zIHtcbiAgZGlmZmljdWx0eTogbnVtYmVyLFxuICB0eXBlczogUXVlc3Rpb25UeXBlW10sXG4gIGN1c3RvbTogYm9vbGVhbixcbiAgbWluTjogbnVtYmVyLFxuICBtYXhOOiBudW1iZXIsXG4gIHNpbXBsZTogYm9vbGVhbixcbiAgcmVwZWF0ZWQ6IGJvb2xlYW4sXG4gIGFsZ2VicmE6IGJvb2xlYW4sXG4gIGFsZ2VicmFPcHRpb25zOiBBbGdlYnJhT3B0aW9uc1xuICB3b3JkZWQ6IGJvb2xlYW4sXG4gIHdvcmRlZE9wdGlvbnM6IFdvcmRlZE9wdGlvbnNcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1EgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIHF1ZXN0aW9uOiBHcmFwaGljUVxuXG4gIGNvbnN0cnVjdG9yIChxdWVzdGlvbjogR3JhcGhpY1EpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5xdWVzdGlvbiA9IHF1ZXN0aW9uXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBXcmFwcGVyT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzUSB7XG4gICAgaWYgKG9wdGlvbnMudHlwZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1R5cGVzIGxpc3QgbXVzdCBiZSBub24tZW1wdHknKVxuICAgIH1cbiAgICBjb25zdCB0eXBlIDogUXVlc3Rpb25UeXBlID0gcmFuZEVsZW0ob3B0aW9ucy50eXBlcylcblxuICAgIGlmICghb3B0aW9ucy5jdXN0b20pIHtcbiAgICAgIHJldHVybiBNaXNzaW5nQW5nbGVzUS5yYW5kb21Gcm9tRGlmZmljdWx0eSh0eXBlLCBvcHRpb25zLmRpZmZpY3VsdHkpXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGNob29zZSBzdWJ0eXBlXG4gICAgICBjb25zdCBhdmFpbGFibGVTdWJ0eXBlcyA6IFF1ZXN0aW9uU3ViVHlwZVtdID0gWydzaW1wbGUnLCAncmVwZWF0ZWQnLCAnYWxnZWJyYScsICd3b3JkZWQnXVxuICAgICAgY29uc3Qgc3VidHlwZXMgOiBRdWVzdGlvblN1YlR5cGVbXSA9IFtdXG4gICAgICBhdmFpbGFibGVTdWJ0eXBlcy5mb3JFYWNoKHN1YnR5cGUgPT4ge1xuICAgICAgICBpZiAob3B0aW9uc1tzdWJ0eXBlXSkgeyBzdWJ0eXBlcy5wdXNoKHN1YnR5cGUpIH1cbiAgICAgIH0pXG4gICAgICBjb25zdCBzdWJ0eXBlIDogUXVlc3Rpb25TdWJUeXBlID0gcmFuZEVsZW0oc3VidHlwZXMpXG5cbiAgICAgIC8vIGJ1aWxkIG9wdGlvbnMgb2JqZWN0XG4gICAgICBsZXQgcXVlc3Rpb25PcHRpb25zIDogUGFydGlhbDxRdWVzdGlvbk9wdGlvbnM+ID0ge31cbiAgICAgIGlmIChzdWJ0eXBlID09PSAnc2ltcGxlJyB8fCBzdWJ0eXBlID09PSAncmVwZWF0ZWQnKSB7XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucyA9IHt9XG4gICAgICB9IGVsc2UgaWYgKHN1YnR5cGUgPT09ICdhbGdlYnJhJykge1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMgPSBvcHRpb25zLmFsZ2VicmFPcHRpb25zXG4gICAgICB9IGVsc2UgaWYgKHN1YnR5cGUgPT09ICd3b3JkZWQnKSB7XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucyA9IG9wdGlvbnMud29yZGVkT3B0aW9uc1xuICAgICAgfVxuICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSBvcHRpb25zLm1pbk5cbiAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gb3B0aW9ucy5tYXhOXG5cbiAgICAgIHJldHVybiBNaXNzaW5nQW5nbGVzUS5yYW5kb21Gcm9tVHlwZVdpdGhPcHRpb25zKHR5cGUsIHN1YnR5cGUsIHF1ZXN0aW9uT3B0aW9ucylcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgcmFuZG9tRnJvbURpZmZpY3VsdHkgKHR5cGU6IFF1ZXN0aW9uVHlwZSwgZGlmZmljdWx0eTogbnVtYmVyKSB7XG4gICAgbGV0IHN1YnR5cGUgOiBRdWVzdGlvblN1YlR5cGVcbiAgICBjb25zdCBxdWVzdGlvbk9wdGlvbnMgOiBQYXJ0aWFsPFF1ZXN0aW9uT3B0aW9ucz4gPSB7fVxuICAgIHN3aXRjaCAoZGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICBzdWJ0eXBlID0gJ3NpbXBsZSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAyXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gMlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOlxuICAgICAgICBzdWJ0eXBlID0gJ3NpbXBsZSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAzXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gNFxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAzOlxuICAgICAgICBzdWJ0eXBlID0gJ3JlcGVhdGVkJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDNcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSA0XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ6XG4gICAgICAgIHN1YnR5cGUgPSAnYWxnZWJyYSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmV4cHJlc3Npb25UeXBlcyA9IFsnbXVsdGlwbHknXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cyA9IGZhbHNlXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDRcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNTpcbiAgICAgICAgc3VidHlwZSA9ICdhbGdlYnJhJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZXhwcmVzc2lvblR5cGVzID0gWydhZGQnLCAnbXVsdGlwbHknXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cyA9IFsnbXVsdGlwbHknXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZW5zdXJlWCA9IHRydWVcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAyXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA2OlxuICAgICAgICBzdWJ0eXBlID0gJ2FsZ2VicmEnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5leHByZXNzaW9uVHlwZXMgPSBbJ21peGVkJ11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAyXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA3OlxuICAgICAgICBzdWJ0eXBlID0gJ3dvcmRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnR5cGVzID0gW3JhbmRFbGVtKFsnYWRkJywgJ211bHRpcGx5J10pXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gMlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA4OlxuICAgICAgICBzdWJ0eXBlID0gJ3dvcmRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnR5cGVzID0gWydhZGQnLCAnbXVsdGlwbHknXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA5OlxuICAgICAgICBzdWJ0eXBlID0gJ3dvcmRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnR5cGVzID0gWydtdWx0aXBseScsICdyYXRpbyddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gcXVlc3Rpb25PcHRpb25zLm1heE4gPSAzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDEwOlxuICAgICAgICBzdWJ0eXBlID0gJ3dvcmRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnR5cGVzID0gWydtdWx0aXBseScsICdhZGQnLCAncmF0aW8nLCAncGVyY2VudCddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gcXVlc3Rpb25PcHRpb25zLm1heE4gPSAzXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbid0IGdlbmVyYXRlIGRpZmZpY3VsdHkgJHtkaWZmaWN1bHR5fWApXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmFuZG9tRnJvbVR5cGVXaXRoT3B0aW9ucyh0eXBlLCBzdWJ0eXBlLCBxdWVzdGlvbk9wdGlvbnMpXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tRnJvbVR5cGVXaXRoT3B0aW9ucyAodHlwZTogUXVlc3Rpb25UeXBlLCBzdWJ0eXBlPzogUXVlc3Rpb25TdWJUeXBlLCBxdWVzdGlvbk9wdGlvbnM/OiBQYXJ0aWFsPFF1ZXN0aW9uT3B0aW9ucz4sIHZpZXdPcHRpb25zPzogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNRIHtcbiAgICBsZXQgcXVlc3Rpb246IEdyYXBoaWNRXG4gICAgcXVlc3Rpb25PcHRpb25zID0gcXVlc3Rpb25PcHRpb25zIHx8IHt9XG4gICAgdmlld09wdGlvbnMgPSB2aWV3T3B0aW9ucyB8fCB7fVxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSAnYWFhcCc6XG4gICAgICBjYXNlICdhb3NsJzoge1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuYW5nbGVTdW0gPSAodHlwZSA9PT0gJ2FhYXAnKSA/IDM2MCA6IDE4MFxuICAgICAgICBzd2l0Y2ggKHN1YnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdzaW1wbGUnOlxuICAgICAgICAgIGNhc2UgJ3JlcGVhdGVkJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5yZXBlYXRlZCA9IHN1YnR5cGUgPT09ICdyZXBlYXRlZCdcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc0Fyb3VuZFEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ2FsZ2VicmEnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3dvcmRlZCc6XG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNXb3JkZWRRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bmV4cGVjdGVkIHN1YnR5cGUgJHtzdWJ0eXBlfWApXG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3RyaWFuZ2xlJzoge1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMucmVwZWF0ZWQgPSAoc3VidHlwZSA9PT0gJ3JlcGVhdGVkJylcbiAgICAgICAgc3dpdGNoIChzdWJ0eXBlKSB7XG4gICAgICAgICAgY2FzZSAnc2ltcGxlJzpcbiAgICAgICAgICBjYXNlICdyZXBlYXRlZCc6XG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ2FsZ2VicmEnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAnd29yZGVkJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgdW5leHBlY3RlZCBzdWJ0eXBlICR7c3VidHlwZX1gKVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdHlwZSAke3R5cGV9YClcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNRKHF1ZXN0aW9uKVxuICB9XG5cbiAgZ2V0RE9NICgpIDogSFRNTEVsZW1lbnQgeyByZXR1cm4gdGhpcy5xdWVzdGlvbi5nZXRET00oKSB9XG4gIHJlbmRlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLnJlbmRlcigpIH1cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLnNob3dBbnN3ZXIoKSB9XG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5oaWRlQW5zd2VyKCkgfVxuICB0b2dnbGVBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi50b2dnbGVBbnN3ZXIoKSB9XG5cbiAgc3RhdGljIGdldCBvcHRpb25zU3BlYyAoKTogT3B0aW9uc1NwZWMge1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdoZWFkaW5nJyxcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICB9LFxuXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnVHlwZXMnLFxuICAgICAgICBpZDogJ3R5cGVzJyxcbiAgICAgICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgICAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICAgICAgeyB0aXRsZTogJ09uIGEgc3RyYWlnaHQgbGluZScsIGlkOiAnYW9zbCcgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnQXJvdW5kIGEgcG9pbnQnLCBpZDogJ2FhYXAnIH0sXG4gICAgICAgICAgeyB0aXRsZTogJ1RyaWFuZ2xlJywgaWQ6ICd0cmlhbmdsZScgfVxuICAgICAgICBdLFxuICAgICAgICBkZWZhdWx0OiBbJ2Fvc2wnLCAnYWFhcCcsICd0cmlhbmdsZSddLFxuICAgICAgICB2ZXJ0aWNhbDogdHJ1ZVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2NvbHVtbi1icmVhaydcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgdGl0bGU6ICc8Yj5DdXN0b20gc2V0dGluZ3MgKGRpc2FibGVzIGRpZmZpY3VsdHkpPC9iPicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICBpZDogJ2N1c3RvbSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdyYW5nZScsXG4gICAgICAgIGlkOiAnbi1hbmdsZXMnLFxuICAgICAgICBpZExCOiAnbWluTicsXG4gICAgICAgIGlkVUI6ICdtYXhOJyxcbiAgICAgICAgZGVmYXVsdExCOiAyLFxuICAgICAgICBkZWZhdWx0VUI6IDQsXG4gICAgICAgIG1pbjogMixcbiAgICAgICAgbWF4OiA4LFxuICAgICAgICB0aXRsZTogJ051bWJlciBvZiBhbmdsZXMnLFxuICAgICAgICBlbmFibGVkSWY6ICdjdXN0b20nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnU2ltcGxlJyxcbiAgICAgICAgaWQ6ICdzaW1wbGUnLFxuICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICBlbmFibGVkSWY6ICdjdXN0b20nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnUmVwZWF0ZWQvSXNvc2NlbGVzJyxcbiAgICAgICAgaWQ6ICdyZXBlYXRlZCcsXG4gICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgIGVuYWJsZWRJZjogJ2N1c3RvbSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgdGl0bGU6ICdBbGdlYnJhaWMnLFxuICAgICAgICBpZDogJ2FsZ2VicmEnLFxuICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICBlbmFibGVkSWY6ICdjdXN0b20nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnc3Vib3B0aW9ucycsXG4gICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgaWQ6ICdhbGdlYnJhT3B0aW9ucycsXG4gICAgICAgIG9wdGlvbnNTcGVjOiBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEub3B0aW9uc1NwZWMsXG4gICAgICAgIGVuYWJsZWRJZjogJ2N1c3RvbSZhbGdlYnJhJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJ1dvcmRlZCcsXG4gICAgICAgIGlkOiAnd29yZGVkJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlZElmOiAnY3VzdG9tJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3N1Ym9wdGlvbnMnLFxuICAgICAgICB0aXRsZTogJycsXG4gICAgICAgIGlkOiAnd29yZGVkT3B0aW9ucycsXG4gICAgICAgIG9wdGlvbnNTcGVjOiBNaXNzaW5nQW5nbGVzV29yZGVkUS5vcHRpb25zU3BlYyxcbiAgICAgICAgZW5hYmxlZElmOiAnY3VzdG9tJndvcmRlZCdcbiAgICAgIH1cbiAgICBdXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpOiBzdHJpbmcge1xuICAgIHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZSdcbiAgfVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZSBGcmFjdGlvbi5qcyB2NC4wLjEyIDA5LzA5LzIwMTVcbiAqIGh0dHA6Ly93d3cueGFyZy5vcmcvMjAxNC8wMy9yYXRpb25hbC1udW1iZXJzLWluLWphdmFzY3JpcHQvXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1LCBSb2JlcnQgRWlzZWxlIChyb2JlcnRAeGFyZy5vcmcpXG4gKiBEdWFsIGxpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgb3IgR1BMIFZlcnNpb24gMiBsaWNlbnNlcy5cbiAqKi9cblxuXG4vKipcbiAqXG4gKiBUaGlzIGNsYXNzIG9mZmVycyB0aGUgcG9zc2liaWxpdHkgdG8gY2FsY3VsYXRlIGZyYWN0aW9ucy5cbiAqIFlvdSBjYW4gcGFzcyBhIGZyYWN0aW9uIGluIGRpZmZlcmVudCBmb3JtYXRzLiBFaXRoZXIgYXMgYXJyYXksIGFzIGRvdWJsZSwgYXMgc3RyaW5nIG9yIGFzIGFuIGludGVnZXIuXG4gKlxuICogQXJyYXkvT2JqZWN0IGZvcm1cbiAqIFsgMCA9PiA8bm9taW5hdG9yPiwgMSA9PiA8ZGVub21pbmF0b3I+IF1cbiAqIFsgbiA9PiA8bm9taW5hdG9yPiwgZCA9PiA8ZGVub21pbmF0b3I+IF1cbiAqXG4gKiBJbnRlZ2VyIGZvcm1cbiAqIC0gU2luZ2xlIGludGVnZXIgdmFsdWVcbiAqXG4gKiBEb3VibGUgZm9ybVxuICogLSBTaW5nbGUgZG91YmxlIHZhbHVlXG4gKlxuICogU3RyaW5nIGZvcm1cbiAqIDEyMy40NTYgLSBhIHNpbXBsZSBkb3VibGVcbiAqIDEyMy80NTYgLSBhIHN0cmluZyBmcmFjdGlvblxuICogMTIzLic0NTYnIC0gYSBkb3VibGUgd2l0aCByZXBlYXRpbmcgZGVjaW1hbCBwbGFjZXNcbiAqIDEyMy4oNDU2KSAtIHN5bm9ueW1cbiAqIDEyMy40NSc2JyAtIGEgZG91YmxlIHdpdGggcmVwZWF0aW5nIGxhc3QgcGxhY2VcbiAqIDEyMy40NSg2KSAtIHN5bm9ueW1cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIHZhciBmID0gbmV3IEZyYWN0aW9uKFwiOS40JzMxJ1wiKTtcbiAqIGYubXVsKFstNCwgM10pLmRpdig0LjkpO1xuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCkge1xuXG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIC8vIE1heGltdW0gc2VhcmNoIGRlcHRoIGZvciBjeWNsaWMgcmF0aW9uYWwgbnVtYmVycy4gMjAwMCBzaG91bGQgYmUgbW9yZSB0aGFuIGVub3VnaC5cbiAgLy8gRXhhbXBsZTogMS83ID0gMC4oMTQyODU3KSBoYXMgNiByZXBlYXRpbmcgZGVjaW1hbCBwbGFjZXMuXG4gIC8vIElmIE1BWF9DWUNMRV9MRU4gZ2V0cyByZWR1Y2VkLCBsb25nIGN5Y2xlcyB3aWxsIG5vdCBiZSBkZXRlY3RlZCBhbmQgdG9TdHJpbmcoKSBvbmx5IGdldHMgdGhlIGZpcnN0IDEwIGRpZ2l0c1xuICB2YXIgTUFYX0NZQ0xFX0xFTiA9IDIwMDA7XG5cbiAgLy8gUGFyc2VkIGRhdGEgdG8gYXZvaWQgY2FsbGluZyBcIm5ld1wiIGFsbCB0aGUgdGltZVxuICB2YXIgUCA9IHtcbiAgICBcInNcIjogMSxcbiAgICBcIm5cIjogMCxcbiAgICBcImRcIjogMVxuICB9O1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZUVycm9yKG5hbWUpIHtcblxuICAgIGZ1bmN0aW9uIGVycm9yQ29uc3RydWN0b3IoKSB7XG4gICAgICB2YXIgdGVtcCA9IEVycm9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB0ZW1wWyduYW1lJ10gPSB0aGlzWyduYW1lJ10gPSBuYW1lO1xuICAgICAgdGhpc1snc3RhY2snXSA9IHRlbXBbJ3N0YWNrJ107XG4gICAgICB0aGlzWydtZXNzYWdlJ10gPSB0ZW1wWydtZXNzYWdlJ107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXJyb3IgY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIEludGVybWVkaWF0ZUluaGVyaXRvcigpIHt9XG4gICAgSW50ZXJtZWRpYXRlSW5oZXJpdG9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZTtcbiAgICBlcnJvckNvbnN0cnVjdG9yLnByb3RvdHlwZSA9IG5ldyBJbnRlcm1lZGlhdGVJbmhlcml0b3IoKTtcblxuICAgIHJldHVybiBlcnJvckNvbnN0cnVjdG9yO1xuICB9XG5cbiAgdmFyIERpdmlzaW9uQnlaZXJvID0gRnJhY3Rpb25bJ0RpdmlzaW9uQnlaZXJvJ10gPSBjcmVhdGVFcnJvcignRGl2aXNpb25CeVplcm8nKTtcbiAgdmFyIEludmFsaWRQYXJhbWV0ZXIgPSBGcmFjdGlvblsnSW52YWxpZFBhcmFtZXRlciddID0gY3JlYXRlRXJyb3IoJ0ludmFsaWRQYXJhbWV0ZXInKTtcblxuICBmdW5jdGlvbiBhc3NpZ24obiwgcykge1xuXG4gICAgaWYgKGlzTmFOKG4gPSBwYXJzZUludChuLCAxMCkpKSB7XG4gICAgICB0aHJvd0ludmFsaWRQYXJhbSgpO1xuICAgIH1cbiAgICByZXR1cm4gbiAqIHM7XG4gIH1cblxuICBmdW5jdGlvbiB0aHJvd0ludmFsaWRQYXJhbSgpIHtcbiAgICB0aHJvdyBuZXcgSW52YWxpZFBhcmFtZXRlcigpO1xuICB9XG5cbiAgdmFyIHBhcnNlID0gZnVuY3Rpb24ocDEsIHAyKSB7XG5cbiAgICB2YXIgbiA9IDAsIGQgPSAxLCBzID0gMTtcbiAgICB2YXIgdiA9IDAsIHcgPSAwLCB4ID0gMCwgeSA9IDEsIHogPSAxO1xuXG4gICAgdmFyIEEgPSAwLCBCID0gMTtcbiAgICB2YXIgQyA9IDEsIEQgPSAxO1xuXG4gICAgdmFyIE4gPSAxMDAwMDAwMDtcbiAgICB2YXIgTTtcblxuICAgIGlmIChwMSA9PT0gdW5kZWZpbmVkIHx8IHAxID09PSBudWxsKSB7XG4gICAgICAvKiB2b2lkICovXG4gICAgfSBlbHNlIGlmIChwMiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBuID0gcDE7XG4gICAgICBkID0gcDI7XG4gICAgICBzID0gbiAqIGQ7XG4gICAgfSBlbHNlXG4gICAgICBzd2l0Y2ggKHR5cGVvZiBwMSkge1xuXG4gICAgICAgIGNhc2UgXCJvYmplY3RcIjpcbiAgICAgICAge1xuICAgICAgICAgIGlmIChcImRcIiBpbiBwMSAmJiBcIm5cIiBpbiBwMSkge1xuICAgICAgICAgICAgbiA9IHAxW1wiblwiXTtcbiAgICAgICAgICAgIGQgPSBwMVtcImRcIl07XG4gICAgICAgICAgICBpZiAoXCJzXCIgaW4gcDEpXG4gICAgICAgICAgICAgIG4gKj0gcDFbXCJzXCJdO1xuICAgICAgICAgIH0gZWxzZSBpZiAoMCBpbiBwMSkge1xuICAgICAgICAgICAgbiA9IHAxWzBdO1xuICAgICAgICAgICAgaWYgKDEgaW4gcDEpXG4gICAgICAgICAgICAgIGQgPSBwMVsxXTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcyA9IG4gKiBkO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgICAge1xuICAgICAgICAgIGlmIChwMSA8IDApIHtcbiAgICAgICAgICAgIHMgPSBwMTtcbiAgICAgICAgICAgIHAxID0gLXAxO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChwMSAlIDEgPT09IDApIHtcbiAgICAgICAgICAgIG4gPSBwMTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHAxID4gMCkgeyAvLyBjaGVjayBmb3IgIT0gMCwgc2NhbGUgd291bGQgYmVjb21lIE5hTiAobG9nKDApKSwgd2hpY2ggY29udmVyZ2VzIHJlYWxseSBzbG93XG5cbiAgICAgICAgICAgIGlmIChwMSA+PSAxKSB7XG4gICAgICAgICAgICAgIHogPSBNYXRoLnBvdygxMCwgTWF0aC5mbG9vcigxICsgTWF0aC5sb2cocDEpIC8gTWF0aC5MTjEwKSk7XG4gICAgICAgICAgICAgIHAxIC89IHo7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVzaW5nIEZhcmV5IFNlcXVlbmNlc1xuICAgICAgICAgICAgLy8gaHR0cDovL3d3dy5qb2huZGNvb2suY29tL2Jsb2cvMjAxMC8xMC8yMC9iZXN0LXJhdGlvbmFsLWFwcHJveGltYXRpb24vXG5cbiAgICAgICAgICAgIHdoaWxlIChCIDw9IE4gJiYgRCA8PSBOKSB7XG4gICAgICAgICAgICAgIE0gPSAoQSArIEMpIC8gKEIgKyBEKTtcblxuICAgICAgICAgICAgICBpZiAocDEgPT09IE0pIHtcbiAgICAgICAgICAgICAgICBpZiAoQiArIEQgPD0gTikge1xuICAgICAgICAgICAgICAgICAgbiA9IEEgKyBDO1xuICAgICAgICAgICAgICAgICAgZCA9IEIgKyBEO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoRCA+IEIpIHtcbiAgICAgICAgICAgICAgICAgIG4gPSBDO1xuICAgICAgICAgICAgICAgICAgZCA9IEQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIG4gPSBBO1xuICAgICAgICAgICAgICAgICAgZCA9IEI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICBpZiAocDEgPiBNKSB7XG4gICAgICAgICAgICAgICAgICBBICs9IEM7XG4gICAgICAgICAgICAgICAgICBCICs9IEQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIEMgKz0gQTtcbiAgICAgICAgICAgICAgICAgIEQgKz0gQjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoQiA+IE4pIHtcbiAgICAgICAgICAgICAgICAgIG4gPSBDO1xuICAgICAgICAgICAgICAgICAgZCA9IEQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIG4gPSBBO1xuICAgICAgICAgICAgICAgICAgZCA9IEI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuICo9IHo7XG4gICAgICAgICAgfSBlbHNlIGlmIChpc05hTihwMSkgfHwgaXNOYU4ocDIpKSB7XG4gICAgICAgICAgICBkID0gbiA9IE5hTjtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBcInN0cmluZ1wiOlxuICAgICAgICB7XG4gICAgICAgICAgQiA9IHAxLm1hdGNoKC9cXGQrfC4vZyk7XG5cbiAgICAgICAgICBpZiAoQiA9PT0gbnVsbClcbiAgICAgICAgICAgIHRocm93SW52YWxpZFBhcmFtKCk7XG5cbiAgICAgICAgICBpZiAoQltBXSA9PT0gJy0nKSB7Ly8gQ2hlY2sgZm9yIG1pbnVzIHNpZ24gYXQgdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgcyA9IC0xO1xuICAgICAgICAgICAgQSsrO1xuICAgICAgICAgIH0gZWxzZSBpZiAoQltBXSA9PT0gJysnKSB7Ly8gQ2hlY2sgZm9yIHBsdXMgc2lnbiBhdCB0aGUgYmVnaW5uaW5nXG4gICAgICAgICAgICBBKys7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKEIubGVuZ3RoID09PSBBICsgMSkgeyAvLyBDaGVjayBpZiBpdCdzIGp1c3QgYSBzaW1wbGUgbnVtYmVyIFwiMTIzNFwiXG4gICAgICAgICAgICB3ID0gYXNzaWduKEJbQSsrXSwgcyk7XG4gICAgICAgICAgfSBlbHNlIGlmIChCW0EgKyAxXSA9PT0gJy4nIHx8IEJbQV0gPT09ICcuJykgeyAvLyBDaGVjayBpZiBpdCdzIGEgZGVjaW1hbCBudW1iZXJcblxuICAgICAgICAgICAgaWYgKEJbQV0gIT09ICcuJykgeyAvLyBIYW5kbGUgMC41IGFuZCAuNVxuICAgICAgICAgICAgICB2ID0gYXNzaWduKEJbQSsrXSwgcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBBKys7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBkZWNpbWFsIHBsYWNlc1xuICAgICAgICAgICAgaWYgKEEgKyAxID09PSBCLmxlbmd0aCB8fCBCW0EgKyAxXSA9PT0gJygnICYmIEJbQSArIDNdID09PSAnKScgfHwgQltBICsgMV0gPT09IFwiJ1wiICYmIEJbQSArIDNdID09PSBcIidcIikge1xuICAgICAgICAgICAgICB3ID0gYXNzaWduKEJbQV0sIHMpO1xuICAgICAgICAgICAgICB5ID0gTWF0aC5wb3coMTAsIEJbQV0ubGVuZ3RoKTtcbiAgICAgICAgICAgICAgQSsrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgcmVwZWF0aW5nIHBsYWNlc1xuICAgICAgICAgICAgaWYgKEJbQV0gPT09ICcoJyAmJiBCW0EgKyAyXSA9PT0gJyknIHx8IEJbQV0gPT09IFwiJ1wiICYmIEJbQSArIDJdID09PSBcIidcIikge1xuICAgICAgICAgICAgICB4ID0gYXNzaWduKEJbQSArIDFdLCBzKTtcbiAgICAgICAgICAgICAgeiA9IE1hdGgucG93KDEwLCBCW0EgKyAxXS5sZW5ndGgpIC0gMTtcbiAgICAgICAgICAgICAgQSArPSAzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfSBlbHNlIGlmIChCW0EgKyAxXSA9PT0gJy8nIHx8IEJbQSArIDFdID09PSAnOicpIHsgLy8gQ2hlY2sgZm9yIGEgc2ltcGxlIGZyYWN0aW9uIFwiMTIzLzQ1NlwiIG9yIFwiMTIzOjQ1NlwiXG4gICAgICAgICAgICB3ID0gYXNzaWduKEJbQV0sIHMpO1xuICAgICAgICAgICAgeSA9IGFzc2lnbihCW0EgKyAyXSwgMSk7XG4gICAgICAgICAgICBBICs9IDM7XG4gICAgICAgICAgfSBlbHNlIGlmIChCW0EgKyAzXSA9PT0gJy8nICYmIEJbQSArIDFdID09PSAnICcpIHsgLy8gQ2hlY2sgZm9yIGEgY29tcGxleCBmcmFjdGlvbiBcIjEyMyAxLzJcIlxuICAgICAgICAgICAgdiA9IGFzc2lnbihCW0FdLCBzKTtcbiAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBICsgMl0sIHMpO1xuICAgICAgICAgICAgeSA9IGFzc2lnbihCW0EgKyA0XSwgMSk7XG4gICAgICAgICAgICBBICs9IDU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKEIubGVuZ3RoIDw9IEEpIHsgLy8gQ2hlY2sgZm9yIG1vcmUgdG9rZW5zIG9uIHRoZSBzdGFja1xuICAgICAgICAgICAgZCA9IHkgKiB6O1xuICAgICAgICAgICAgcyA9IC8qIHZvaWQgKi9cbiAgICAgICAgICAgICAgICAgICAgbiA9IHggKyBkICogdiArIHogKiB3O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLyogRmFsbCB0aHJvdWdoIG9uIGVycm9yICovXG4gICAgICAgIH1cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0aHJvd0ludmFsaWRQYXJhbSgpO1xuICAgICAgfVxuXG4gICAgaWYgKGQgPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBEaXZpc2lvbkJ5WmVybygpO1xuICAgIH1cblxuICAgIFBbXCJzXCJdID0gcyA8IDAgPyAtMSA6IDE7XG4gICAgUFtcIm5cIl0gPSBNYXRoLmFicyhuKTtcbiAgICBQW1wiZFwiXSA9IE1hdGguYWJzKGQpO1xuICB9O1xuXG4gIGZ1bmN0aW9uIG1vZHBvdyhiLCBlLCBtKSB7XG5cbiAgICB2YXIgciA9IDE7XG4gICAgZm9yICg7IGUgPiAwOyBiID0gKGIgKiBiKSAlIG0sIGUgPj49IDEpIHtcblxuICAgICAgaWYgKGUgJiAxKSB7XG4gICAgICAgIHIgPSAociAqIGIpICUgbTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHI7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGN5Y2xlTGVuKG4sIGQpIHtcblxuICAgIGZvciAoOyBkICUgMiA9PT0gMDtcbiAgICAgICAgICAgIGQgLz0gMikge1xuICAgIH1cblxuICAgIGZvciAoOyBkICUgNSA9PT0gMDtcbiAgICAgICAgICAgIGQgLz0gNSkge1xuICAgIH1cblxuICAgIGlmIChkID09PSAxKSAvLyBDYXRjaCBub24tY3ljbGljIG51bWJlcnNcbiAgICAgIHJldHVybiAwO1xuXG4gICAgLy8gSWYgd2Ugd291bGQgbGlrZSB0byBjb21wdXRlIHJlYWxseSBsYXJnZSBudW1iZXJzIHF1aWNrZXIsIHdlIGNvdWxkIG1ha2UgdXNlIG9mIEZlcm1hdCdzIGxpdHRsZSB0aGVvcmVtOlxuICAgIC8vIDEwXihkLTEpICUgZCA9PSAxXG4gICAgLy8gSG93ZXZlciwgd2UgZG9uJ3QgbmVlZCBzdWNoIGxhcmdlIG51bWJlcnMgYW5kIE1BWF9DWUNMRV9MRU4gc2hvdWxkIGJlIHRoZSBjYXBzdG9uZSxcbiAgICAvLyBhcyB3ZSB3YW50IHRvIHRyYW5zbGF0ZSB0aGUgbnVtYmVycyB0byBzdHJpbmdzLlxuXG4gICAgdmFyIHJlbSA9IDEwICUgZDtcbiAgICB2YXIgdCA9IDE7XG5cbiAgICBmb3IgKDsgcmVtICE9PSAxOyB0KyspIHtcbiAgICAgIHJlbSA9IHJlbSAqIDEwICUgZDtcblxuICAgICAgaWYgKHQgPiBNQVhfQ1lDTEVfTEVOKVxuICAgICAgICByZXR1cm4gMDsgLy8gUmV0dXJuaW5nIDAgaGVyZSBtZWFucyB0aGF0IHdlIGRvbid0IHByaW50IGl0IGFzIGEgY3ljbGljIG51bWJlci4gSXQncyBsaWtlbHkgdGhhdCB0aGUgYW5zd2VyIGlzIGBkLTFgXG4gICAgfVxuICAgIHJldHVybiB0O1xuICB9XG5cblxuICAgICBmdW5jdGlvbiBjeWNsZVN0YXJ0KG4sIGQsIGxlbikge1xuXG4gICAgdmFyIHJlbTEgPSAxO1xuICAgIHZhciByZW0yID0gbW9kcG93KDEwLCBsZW4sIGQpO1xuXG4gICAgZm9yICh2YXIgdCA9IDA7IHQgPCAzMDA7IHQrKykgeyAvLyBzIDwgfmxvZzEwKE51bWJlci5NQVhfVkFMVUUpXG4gICAgICAvLyBTb2x2ZSAxMF5zID09IDEwXihzK3QpIChtb2QgZClcblxuICAgICAgaWYgKHJlbTEgPT09IHJlbTIpXG4gICAgICAgIHJldHVybiB0O1xuXG4gICAgICByZW0xID0gcmVtMSAqIDEwICUgZDtcbiAgICAgIHJlbTIgPSByZW0yICogMTAgJSBkO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdjZChhLCBiKSB7XG5cbiAgICBpZiAoIWEpXG4gICAgICByZXR1cm4gYjtcbiAgICBpZiAoIWIpXG4gICAgICByZXR1cm4gYTtcblxuICAgIHdoaWxlICgxKSB7XG4gICAgICBhICU9IGI7XG4gICAgICBpZiAoIWEpXG4gICAgICAgIHJldHVybiBiO1xuICAgICAgYiAlPSBhO1xuICAgICAgaWYgKCFiKVxuICAgICAgICByZXR1cm4gYTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIE1vZHVsZSBjb25zdHJ1Y3RvclxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtudW1iZXJ8RnJhY3Rpb249fSBhXG4gICAqIEBwYXJhbSB7bnVtYmVyPX0gYlxuICAgKi9cbiAgZnVuY3Rpb24gRnJhY3Rpb24oYSwgYikge1xuXG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZyYWN0aW9uKSkge1xuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihhLCBiKTtcbiAgICB9XG5cbiAgICBwYXJzZShhLCBiKTtcblxuICAgIGlmIChGcmFjdGlvblsnUkVEVUNFJ10pIHtcbiAgICAgIGEgPSBnY2QoUFtcImRcIl0sIFBbXCJuXCJdKTsgLy8gQWJ1c2UgYVxuICAgIH0gZWxzZSB7XG4gICAgICBhID0gMTtcbiAgICB9XG5cbiAgICB0aGlzW1wic1wiXSA9IFBbXCJzXCJdO1xuICAgIHRoaXNbXCJuXCJdID0gUFtcIm5cIl0gLyBhO1xuICAgIHRoaXNbXCJkXCJdID0gUFtcImRcIl0gLyBhO1xuICB9XG5cbiAgLyoqXG4gICAqIEJvb2xlYW4gZ2xvYmFsIHZhcmlhYmxlIHRvIGJlIGFibGUgdG8gZGlzYWJsZSBhdXRvbWF0aWMgcmVkdWN0aW9uIG9mIHRoZSBmcmFjdGlvblxuICAgKlxuICAgKi9cbiAgRnJhY3Rpb25bJ1JFRFVDRSddID0gMTtcblxuICBGcmFjdGlvbi5wcm90b3R5cGUgPSB7XG5cbiAgICBcInNcIjogMSxcbiAgICBcIm5cIjogMCxcbiAgICBcImRcIjogMSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGFic29sdXRlIHZhbHVlXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKC00KS5hYnMoKSA9PiA0XG4gICAgICoqL1xuICAgIFwiYWJzXCI6IGZ1bmN0aW9uKCkge1xuXG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXNbXCJuXCJdLCB0aGlzW1wiZFwiXSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEludmVydHMgdGhlIHNpZ24gb2YgdGhlIGN1cnJlbnQgZnJhY3Rpb25cbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oLTQpLm5lZygpID0+IDRcbiAgICAgKiovXG4gICAgXCJuZWdcIjogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oLXRoaXNbXCJzXCJdICogdGhpc1tcIm5cIl0sIHRoaXNbXCJkXCJdKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbih7bjogMiwgZDogM30pLmFkZChcIjE0LjlcIikgPT4gNDY3IC8gMzBcbiAgICAgKiovXG4gICAgXCJhZGRcIjogZnVuY3Rpb24oYSwgYikge1xuXG4gICAgICBwYXJzZShhLCBiKTtcbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgICAgIHRoaXNbXCJzXCJdICogdGhpc1tcIm5cIl0gKiBQW1wiZFwiXSArIFBbXCJzXCJdICogdGhpc1tcImRcIl0gKiBQW1wiblwiXSxcbiAgICAgICAgICAgICAgdGhpc1tcImRcIl0gKiBQW1wiZFwiXVxuICAgICAgICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdWJ0cmFjdHMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oe246IDIsIGQ6IDN9KS5hZGQoXCIxNC45XCIpID0+IC00MjcgLyAzMFxuICAgICAqKi9cbiAgICBcInN1YlwiOiBmdW5jdGlvbihhLCBiKSB7XG5cbiAgICAgIHBhcnNlKGEsIGIpO1xuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICAgICAgdGhpc1tcInNcIl0gKiB0aGlzW1wiblwiXSAqIFBbXCJkXCJdIC0gUFtcInNcIl0gKiB0aGlzW1wiZFwiXSAqIFBbXCJuXCJdLFxuICAgICAgICAgICAgICB0aGlzW1wiZFwiXSAqIFBbXCJkXCJdXG4gICAgICAgICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE11bHRpcGxpZXMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCItMTcuKDM0NSlcIikubXVsKDMpID0+IDU3NzYgLyAxMTFcbiAgICAgKiovXG4gICAgXCJtdWxcIjogZnVuY3Rpb24oYSwgYikge1xuXG4gICAgICBwYXJzZShhLCBiKTtcbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgICAgIHRoaXNbXCJzXCJdICogUFtcInNcIl0gKiB0aGlzW1wiblwiXSAqIFBbXCJuXCJdLFxuICAgICAgICAgICAgICB0aGlzW1wiZFwiXSAqIFBbXCJkXCJdXG4gICAgICAgICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpdmlkZXMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCItMTcuKDM0NSlcIikuaW52ZXJzZSgpLmRpdigzKVxuICAgICAqKi9cbiAgICBcImRpdlwiOiBmdW5jdGlvbihhLCBiKSB7XG5cbiAgICAgIHBhcnNlKGEsIGIpO1xuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICAgICAgdGhpc1tcInNcIl0gKiBQW1wic1wiXSAqIHRoaXNbXCJuXCJdICogUFtcImRcIl0sXG4gICAgICAgICAgICAgIHRoaXNbXCJkXCJdICogUFtcIm5cIl1cbiAgICAgICAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xvbmVzIHRoZSBhY3R1YWwgb2JqZWN0XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiLTE3LigzNDUpXCIpLmNsb25lKClcbiAgICAgKiovXG4gICAgXCJjbG9uZVwiOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24odGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIG1vZHVsbyBvZiB0d28gcmF0aW9uYWwgbnVtYmVycyAtIGEgbW9yZSBwcmVjaXNlIGZtb2RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykubW9kKFs3LCA4XSkgPT4gKDEzLzMpICUgKDcvOCkgPSAoNS82KVxuICAgICAqKi9cbiAgICBcIm1vZFwiOiBmdW5jdGlvbihhLCBiKSB7XG5cbiAgICAgIGlmIChpc05hTih0aGlzWyduJ10pIHx8IGlzTmFOKHRoaXNbJ2QnXSkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pO1xuICAgICAgfVxuXG4gICAgICBpZiAoYSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24odGhpc1tcInNcIl0gKiB0aGlzW1wiblwiXSAlIHRoaXNbXCJkXCJdLCAxKTtcbiAgICAgIH1cblxuICAgICAgcGFyc2UoYSwgYik7XG4gICAgICBpZiAoMCA9PT0gUFtcIm5cIl0gJiYgMCA9PT0gdGhpc1tcImRcIl0pIHtcbiAgICAgICAgRnJhY3Rpb24oMCwgMCk7IC8vIFRocm93IERpdmlzaW9uQnlaZXJvXG4gICAgICB9XG5cbiAgICAgIC8qXG4gICAgICAgKiBGaXJzdCBzaWxseSBhdHRlbXB0LCBraW5kYSBzbG93XG4gICAgICAgKlxuICAgICAgIHJldHVybiB0aGF0W1wic3ViXCJdKHtcbiAgICAgICBcIm5cIjogbnVtW1wiblwiXSAqIE1hdGguZmxvb3IoKHRoaXMubiAvIHRoaXMuZCkgLyAobnVtLm4gLyBudW0uZCkpLFxuICAgICAgIFwiZFwiOiBudW1bXCJkXCJdLFxuICAgICAgIFwic1wiOiB0aGlzW1wic1wiXVxuICAgICAgIH0pOyovXG5cbiAgICAgIC8qXG4gICAgICAgKiBOZXcgYXR0ZW1wdDogYTEgLyBiMSA9IGEyIC8gYjIgKiBxICsgclxuICAgICAgICogPT4gYjIgKiBhMSA9IGEyICogYjEgKiBxICsgYjEgKiBiMiAqIHJcbiAgICAgICAqID0+IChiMiAqIGExICUgYTIgKiBiMSkgLyAoYjEgKiBiMilcbiAgICAgICAqL1xuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICAgICAgdGhpc1tcInNcIl0gKiAoUFtcImRcIl0gKiB0aGlzW1wiblwiXSkgJSAoUFtcIm5cIl0gKiB0aGlzW1wiZFwiXSksXG4gICAgICAgICAgICAgIFBbXCJkXCJdICogdGhpc1tcImRcIl1cbiAgICAgICAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZnJhY3Rpb25hbCBnY2Qgb2YgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oNSw4KS5nY2QoMyw3KSA9PiAxLzU2XG4gICAgICovXG4gICAgXCJnY2RcIjogZnVuY3Rpb24oYSwgYikge1xuXG4gICAgICBwYXJzZShhLCBiKTtcblxuICAgICAgLy8gZ2NkKGEgLyBiLCBjIC8gZCkgPSBnY2QoYSwgYykgLyBsY20oYiwgZClcblxuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihnY2QoUFtcIm5cIl0sIHRoaXNbXCJuXCJdKSAqIGdjZChQW1wiZFwiXSwgdGhpc1tcImRcIl0pLCBQW1wiZFwiXSAqIHRoaXNbXCJkXCJdKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZnJhY3Rpb25hbCBsY20gb2YgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oNSw4KS5sY20oMyw3KSA9PiAxNVxuICAgICAqL1xuICAgIFwibGNtXCI6IGZ1bmN0aW9uKGEsIGIpIHtcblxuICAgICAgcGFyc2UoYSwgYik7XG5cbiAgICAgIC8vIGxjbShhIC8gYiwgYyAvIGQpID0gbGNtKGEsIGMpIC8gZ2NkKGIsIGQpXG5cbiAgICAgIGlmIChQW1wiblwiXSA9PT0gMCAmJiB0aGlzW1wiblwiXSA9PT0gMCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihQW1wiblwiXSAqIHRoaXNbXCJuXCJdLCBnY2QoUFtcIm5cIl0sIHRoaXNbXCJuXCJdKSAqIGdjZChQW1wiZFwiXSwgdGhpc1tcImRcIl0pKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgY2VpbCBvZiBhIHJhdGlvbmFsIG51bWJlclxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5jZWlsKCkgPT4gKDUgLyAxKVxuICAgICAqKi9cbiAgICBcImNlaWxcIjogZnVuY3Rpb24ocGxhY2VzKSB7XG5cbiAgICAgIHBsYWNlcyA9IE1hdGgucG93KDEwLCBwbGFjZXMgfHwgMCk7XG5cbiAgICAgIGlmIChpc05hTih0aGlzW1wiblwiXSkgfHwgaXNOYU4odGhpc1tcImRcIl0pKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5jZWlsKHBsYWNlcyAqIHRoaXNbXCJzXCJdICogdGhpc1tcIm5cIl0gLyB0aGlzW1wiZFwiXSksIHBsYWNlcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZsb29yIG9mIGEgcmF0aW9uYWwgbnVtYmVyXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLmZsb29yKCkgPT4gKDQgLyAxKVxuICAgICAqKi9cbiAgICBcImZsb29yXCI6IGZ1bmN0aW9uKHBsYWNlcykge1xuXG4gICAgICBwbGFjZXMgPSBNYXRoLnBvdygxMCwgcGxhY2VzIHx8IDApO1xuXG4gICAgICBpZiAoaXNOYU4odGhpc1tcIm5cIl0pIHx8IGlzTmFOKHRoaXNbXCJkXCJdKSkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTik7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGguZmxvb3IocGxhY2VzICogdGhpc1tcInNcIl0gKiB0aGlzW1wiblwiXSAvIHRoaXNbXCJkXCJdKSwgcGxhY2VzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUm91bmRzIGEgcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5yb3VuZCgpID0+ICg0IC8gMSlcbiAgICAgKiovXG4gICAgXCJyb3VuZFwiOiBmdW5jdGlvbihwbGFjZXMpIHtcblxuICAgICAgcGxhY2VzID0gTWF0aC5wb3coMTAsIHBsYWNlcyB8fCAwKTtcblxuICAgICAgaWYgKGlzTmFOKHRoaXNbXCJuXCJdKSB8fCBpc05hTih0aGlzW1wiZFwiXSkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLnJvdW5kKHBsYWNlcyAqIHRoaXNbXCJzXCJdICogdGhpc1tcIm5cIl0gLyB0aGlzW1wiZFwiXSksIHBsYWNlcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGludmVyc2Ugb2YgdGhlIGZyYWN0aW9uLCBtZWFucyBudW1lcmF0b3IgYW5kIGRlbnVtZXJhdG9yIGFyZSBleGNoYW5nZWRcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oWy0zLCA0XSkuaW52ZXJzZSgpID0+IC00IC8gM1xuICAgICAqKi9cbiAgICBcImludmVyc2VcIjogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24odGhpc1tcInNcIl0gKiB0aGlzW1wiZFwiXSwgdGhpc1tcIm5cIl0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmcmFjdGlvbiB0byBzb21lIGludGVnZXIgZXhwb25lbnRcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oLTEsMikucG93KC0zKSA9PiAtOFxuICAgICAqL1xuICAgIFwicG93XCI6IGZ1bmN0aW9uKG0pIHtcblxuICAgICAgaWYgKG0gPCAwKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5wb3codGhpc1sncyddICogdGhpc1tcImRcIl0sIC1tKSwgTWF0aC5wb3codGhpc1tcIm5cIl0sIC1tKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGgucG93KHRoaXNbJ3MnXSAqIHRoaXNbXCJuXCJdLCBtKSwgTWF0aC5wb3codGhpc1tcImRcIl0sIG0pKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdHdvIHJhdGlvbmFsIG51bWJlcnMgYXJlIHRoZSBzYW1lXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDE5LjYpLmVxdWFscyhbOTgsIDVdKTtcbiAgICAgKiovXG4gICAgXCJlcXVhbHNcIjogZnVuY3Rpb24oYSwgYikge1xuXG4gICAgICBwYXJzZShhLCBiKTtcbiAgICAgIHJldHVybiB0aGlzW1wic1wiXSAqIHRoaXNbXCJuXCJdICogUFtcImRcIl0gPT09IFBbXCJzXCJdICogUFtcIm5cIl0gKiB0aGlzW1wiZFwiXTsgLy8gU2FtZSBhcyBjb21wYXJlKCkgPT09IDBcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdHdvIHJhdGlvbmFsIG51bWJlcnMgYXJlIHRoZSBzYW1lXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDE5LjYpLmVxdWFscyhbOTgsIDVdKTtcbiAgICAgKiovXG4gICAgXCJjb21wYXJlXCI6IGZ1bmN0aW9uKGEsIGIpIHtcblxuICAgICAgcGFyc2UoYSwgYik7XG4gICAgICB2YXIgdCA9ICh0aGlzW1wic1wiXSAqIHRoaXNbXCJuXCJdICogUFtcImRcIl0gLSBQW1wic1wiXSAqIFBbXCJuXCJdICogdGhpc1tcImRcIl0pO1xuICAgICAgcmV0dXJuICgwIDwgdCkgLSAodCA8IDApO1xuICAgIH0sXG5cbiAgICBcInNpbXBsaWZ5XCI6IGZ1bmN0aW9uKGVwcykge1xuXG4gICAgICAvLyBGaXJzdCBuYWl2ZSBpbXBsZW1lbnRhdGlvbiwgbmVlZHMgaW1wcm92ZW1lbnRcblxuICAgICAgaWYgKGlzTmFOKHRoaXNbJ24nXSkgfHwgaXNOYU4odGhpc1snZCddKSkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cblxuICAgICAgdmFyIGNvbnQgPSB0aGlzWydhYnMnXSgpWyd0b0NvbnRpbnVlZCddKCk7XG5cbiAgICAgIGVwcyA9IGVwcyB8fCAwLjAwMTtcblxuICAgICAgZnVuY3Rpb24gcmVjKGEpIHtcbiAgICAgICAgaWYgKGEubGVuZ3RoID09PSAxKVxuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oYVswXSk7XG4gICAgICAgIHJldHVybiByZWMoYS5zbGljZSgxKSlbJ2ludmVyc2UnXSgpWydhZGQnXShhWzBdKTtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb250Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciB0bXAgPSByZWMoY29udC5zbGljZSgwLCBpICsgMSkpO1xuICAgICAgICBpZiAodG1wWydzdWInXSh0aGlzWydhYnMnXSgpKVsnYWJzJ10oKS52YWx1ZU9mKCkgPCBlcHMpIHtcbiAgICAgICAgICByZXR1cm4gdG1wWydtdWwnXSh0aGlzWydzJ10pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdHdvIHJhdGlvbmFsIG51bWJlcnMgYXJlIGRpdmlzaWJsZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigxOS42KS5kaXZpc2libGUoMS41KTtcbiAgICAgKi9cbiAgICBcImRpdmlzaWJsZVwiOiBmdW5jdGlvbihhLCBiKSB7XG5cbiAgICAgIHBhcnNlKGEsIGIpO1xuICAgICAgcmV0dXJuICEoIShQW1wiblwiXSAqIHRoaXNbXCJkXCJdKSB8fCAoKHRoaXNbXCJuXCJdICogUFtcImRcIl0pICUgKFBbXCJuXCJdICogdGhpc1tcImRcIl0pKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBkZWNpbWFsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBmcmFjdGlvblxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEwMC4nOTE4MjMnXCIpLnZhbHVlT2YoKSA9PiAxMDAuOTE4MjM5MTgyMzkxODNcbiAgICAgKiovXG4gICAgJ3ZhbHVlT2YnOiBmdW5jdGlvbigpIHtcblxuICAgICAgcmV0dXJuIHRoaXNbXCJzXCJdICogdGhpc1tcIm5cIl0gLyB0aGlzW1wiZFwiXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIHN0cmluZy1mcmFjdGlvbiByZXByZXNlbnRhdGlvbiBvZiBhIEZyYWN0aW9uIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEuJzMnXCIpLnRvRnJhY3Rpb24oKSA9PiBcIjQgMS8zXCJcbiAgICAgKiovXG4gICAgJ3RvRnJhY3Rpb24nOiBmdW5jdGlvbihleGNsdWRlV2hvbGUpIHtcblxuICAgICAgdmFyIHdob2xlLCBzdHIgPSBcIlwiO1xuICAgICAgdmFyIG4gPSB0aGlzW1wiblwiXTtcbiAgICAgIHZhciBkID0gdGhpc1tcImRcIl07XG4gICAgICBpZiAodGhpc1tcInNcIl0gPCAwKSB7XG4gICAgICAgIHN0ciArPSAnLSc7XG4gICAgICB9XG5cbiAgICAgIGlmIChkID09PSAxKSB7XG4gICAgICAgIHN0ciArPSBuO1xuICAgICAgfSBlbHNlIHtcblxuICAgICAgICBpZiAoZXhjbHVkZVdob2xlICYmICh3aG9sZSA9IE1hdGguZmxvb3IobiAvIGQpKSA+IDApIHtcbiAgICAgICAgICBzdHIgKz0gd2hvbGU7XG4gICAgICAgICAgc3RyICs9IFwiIFwiO1xuICAgICAgICAgIG4gJT0gZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0ciArPSBuO1xuICAgICAgICBzdHIgKz0gJy8nO1xuICAgICAgICBzdHIgKz0gZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBsYXRleCByZXByZXNlbnRhdGlvbiBvZiBhIEZyYWN0aW9uIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEuJzMnXCIpLnRvTGF0ZXgoKSA9PiBcIlxcZnJhY3s0fXszfVwiXG4gICAgICoqL1xuICAgICd0b0xhdGV4JzogZnVuY3Rpb24oZXhjbHVkZVdob2xlKSB7XG5cbiAgICAgIHZhciB3aG9sZSwgc3RyID0gXCJcIjtcbiAgICAgIHZhciBuID0gdGhpc1tcIm5cIl07XG4gICAgICB2YXIgZCA9IHRoaXNbXCJkXCJdO1xuICAgICAgaWYgKHRoaXNbXCJzXCJdIDwgMCkge1xuICAgICAgICBzdHIgKz0gJy0nO1xuICAgICAgfVxuXG4gICAgICBpZiAoZCA9PT0gMSkge1xuICAgICAgICBzdHIgKz0gbjtcbiAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgaWYgKGV4Y2x1ZGVXaG9sZSAmJiAod2hvbGUgPSBNYXRoLmZsb29yKG4gLyBkKSkgPiAwKSB7XG4gICAgICAgICAgc3RyICs9IHdob2xlO1xuICAgICAgICAgIG4gJT0gZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0ciArPSBcIlxcXFxmcmFje1wiO1xuICAgICAgICBzdHIgKz0gbjtcbiAgICAgICAgc3RyICs9ICd9eyc7XG4gICAgICAgIHN0ciArPSBkO1xuICAgICAgICBzdHIgKz0gJ30nO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhbiBhcnJheSBvZiBjb250aW51ZWQgZnJhY3Rpb24gZWxlbWVudHNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCI3LzhcIikudG9Db250aW51ZWQoKSA9PiBbMCwxLDddXG4gICAgICovXG4gICAgJ3RvQ29udGludWVkJzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHZhciB0O1xuICAgICAgdmFyIGEgPSB0aGlzWyduJ107XG4gICAgICB2YXIgYiA9IHRoaXNbJ2QnXTtcbiAgICAgIHZhciByZXMgPSBbXTtcblxuICAgICAgaWYgKGlzTmFOKHRoaXNbJ24nXSkgfHwgaXNOYU4odGhpc1snZCddKSkge1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgfVxuXG4gICAgICBkbyB7XG4gICAgICAgIHJlcy5wdXNoKE1hdGguZmxvb3IoYSAvIGIpKTtcbiAgICAgICAgdCA9IGEgJSBiO1xuICAgICAgICBhID0gYjtcbiAgICAgICAgYiA9IHQ7XG4gICAgICB9IHdoaWxlIChhICE9PSAxKTtcblxuICAgICAgcmV0dXJuIHJlcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhIGZyYWN0aW9uIHdpdGggYWxsIGRpZ2l0c1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEwMC4nOTE4MjMnXCIpLnRvU3RyaW5nKCkgPT4gXCIxMDAuKDkxODIzKVwiXG4gICAgICoqL1xuICAgICd0b1N0cmluZyc6IGZ1bmN0aW9uKGRlYykge1xuXG4gICAgICB2YXIgZztcbiAgICAgIHZhciBOID0gdGhpc1tcIm5cIl07XG4gICAgICB2YXIgRCA9IHRoaXNbXCJkXCJdO1xuXG4gICAgICBpZiAoaXNOYU4oTikgfHwgaXNOYU4oRCkpIHtcbiAgICAgICAgcmV0dXJuIFwiTmFOXCI7XG4gICAgICB9XG5cbiAgICAgIGlmICghRnJhY3Rpb25bJ1JFRFVDRSddKSB7XG4gICAgICAgIGcgPSBnY2QoTiwgRCk7XG4gICAgICAgIE4gLz0gZztcbiAgICAgICAgRCAvPSBnO1xuICAgICAgfVxuXG4gICAgICBkZWMgPSBkZWMgfHwgMTU7IC8vIDE1ID0gZGVjaW1hbCBwbGFjZXMgd2hlbiBubyByZXBpdGF0aW9uXG5cbiAgICAgIHZhciBjeWNMZW4gPSBjeWNsZUxlbihOLCBEKTsgLy8gQ3ljbGUgbGVuZ3RoXG4gICAgICB2YXIgY3ljT2ZmID0gY3ljbGVTdGFydChOLCBELCBjeWNMZW4pOyAvLyBDeWNsZSBzdGFydFxuXG4gICAgICB2YXIgc3RyID0gdGhpc1sncyddID09PSAtMSA/IFwiLVwiIDogXCJcIjtcblxuICAgICAgc3RyICs9IE4gLyBEIHwgMDtcblxuICAgICAgTiAlPSBEO1xuICAgICAgTiAqPSAxMDtcblxuICAgICAgaWYgKE4pXG4gICAgICAgIHN0ciArPSBcIi5cIjtcblxuICAgICAgaWYgKGN5Y0xlbikge1xuXG4gICAgICAgIGZvciAodmFyIGkgPSBjeWNPZmY7IGktLTsgKSB7XG4gICAgICAgICAgc3RyICs9IE4gLyBEIHwgMDtcbiAgICAgICAgICBOICU9IEQ7XG4gICAgICAgICAgTiAqPSAxMDtcbiAgICAgICAgfVxuICAgICAgICBzdHIgKz0gXCIoXCI7XG4gICAgICAgIGZvciAodmFyIGkgPSBjeWNMZW47IGktLTsgKSB7XG4gICAgICAgICAgc3RyICs9IE4gLyBEIHwgMDtcbiAgICAgICAgICBOICU9IEQ7XG4gICAgICAgICAgTiAqPSAxMDtcbiAgICAgICAgfVxuICAgICAgICBzdHIgKz0gXCIpXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBpID0gZGVjOyBOICYmIGktLTsgKSB7XG4gICAgICAgICAgc3RyICs9IE4gLyBEIHwgMDtcbiAgICAgICAgICBOICU9IEQ7XG4gICAgICAgICAgTiAqPSAxMDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gIH07XG5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmVbXCJhbWRcIl0pIHtcbiAgICBkZWZpbmUoW10sIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIEZyYWN0aW9uO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSBcIm9iamVjdFwiKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7J3ZhbHVlJzogdHJ1ZX0pO1xuICAgIEZyYWN0aW9uWydkZWZhdWx0J10gPSBGcmFjdGlvbjtcbiAgICBGcmFjdGlvblsnRnJhY3Rpb24nXSA9IEZyYWN0aW9uO1xuICAgIG1vZHVsZVsnZXhwb3J0cyddID0gRnJhY3Rpb247XG4gIH0gZWxzZSB7XG4gICAgcm9vdFsnRnJhY3Rpb24nXSA9IEZyYWN0aW9uO1xuICB9XG5cbn0pKHRoaXMpO1xuIiwiaW1wb3J0IHsgcmFuZEJldHdlZW4sIHJhbmRFbGVtLCBzY2FsZWRTdHIgfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgZnJhY3Rpb24gZnJvbSAnZnJhY3Rpb24uanMnXG5pbXBvcnQgeyBRdWVzdGlvbk9wdGlvbnMgfSBmcm9tICcuL3R5cGVzJ1xuXG4vKipcbiAqIEEgdmFsdWUgZm9yIHNpZGVzLCBhcmVhcyBhbmQgcGVyaW1ldGVyc1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFZhbHVlIHtcbiAgdmFsOiBudW1iZXIsIC8vIHRoZSBudW1lcmljYWwgdmFsdWVcbiAgbGFiZWw/OiBzdHJpbmcsIC8vIHRoZSBsYWJlbCB0byBkaXNwbGF5LiBlLmcuIFwiMy40Y21cIlxuICBzaG93OiBib29sZWFuLCAvLyB3aGV0aGVyIHRoYXQgdmFsdWUgaXMgc2hvd24gaW4gdGhlIHF1ZXN0aW9uIG9yIGFuc3dlciBhdCBhbGxcbiAgbWlzc2luZzogYm9vbGVhbiwgLy8gd2hldGhlciB0aGUgdmFsdWUgaXMgc2hvd24gaW4gdGhlIHF1ZXN0aW9uXG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlY3RhbmdsZUFyZWFEYXRhIHtcbiAgcmVhZG9ubHkgYmFzZSA6IFZhbHVlXG4gIHJlYWRvbmx5IGhlaWdodDogVmFsdWVcbiAgcmVhZG9ubHkgc2hvd09wcG9zaXRlczogYm9vbGVhblxuICBwcml2YXRlIHJlYWRvbmx5IGRwOiBudW1iZXJcbiAgcHJpdmF0ZSByZWFkb25seSBkZW5vbWluYXRvcjogbnVtYmVyID0gMVxuICBwcml2YXRlIF9hcmVhPzogUGFydGlhbDxWYWx1ZT4gLy8gbGF6aWx5IGNhbGN1bGF0ZWRcbiAgcHJpdmF0ZSBfcGVyaW1ldGVyPzogUGFydGlhbDxWYWx1ZT5cblxuICBjb25zdHJ1Y3RvciAoYmFzZTogVmFsdWUsIGhlaWdodDogVmFsdWUsIHNob3dPcHBvc2l0ZXM6IGJvb2xlYW4sIGRwOiBudW1iZXIsIGRlbm9taW5hdG9yOiBudW1iZXIsIGFyZWFQcm9wZXJ0aWVzPzogT21pdDxWYWx1ZSwgJ3ZhbCc+LCBwZXJpbWV0ZXJQcm9wZXJ0aWVzPzogT21pdDxWYWx1ZSwgJ3ZhbCc+KSB7XG4gICAgdGhpcy5iYXNlID0gYmFzZVxuICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0XG4gICAgdGhpcy5zaG93T3Bwb3NpdGVzID0gc2hvd09wcG9zaXRlc1xuICAgIHRoaXMuZHAgPSBkcFxuICAgIHRoaXMuZGVub21pbmF0b3IgPSBkZW5vbWluYXRvclxuICAgIHRoaXMuX2FyZWEgPSBhcmVhUHJvcGVydGllc1xuICAgIHRoaXMuX3BlcmltZXRlciA9IHBlcmltZXRlclByb3BlcnRpZXNcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFF1ZXN0aW9uT3B0aW9ucykgOiBSZWN0YW5nbGVBcmVhRGF0YSB7XG4gICAgb3B0aW9ucy5tYXhMZW5ndGggPSBvcHRpb25zLm1heExlbmd0aCB8fCAyMCAvLyBkZWZhdWx0IHZhbHVlc1xuICAgIGNvbnN0IGRwID0gb3B0aW9ucy5kcCB8fCAwXG4gICAgY29uc3QgZGVub21pbmF0b3IgPSBvcHRpb25zLmZyYWN0aW9uPyByYW5kQmV0d2VlbigyLDYpIDogMVxuXG4gICAgY29uc3Qgc2lkZXMgPSB7XG4gICAgICBiYXNlOiByYW5kQmV0d2VlbigxLCBvcHRpb25zLm1heExlbmd0aCksXG4gICAgICBoZWlnaHQ6IHJhbmRCZXR3ZWVuKDEsIG9wdGlvbnMubWF4TGVuZ3RoKVxuICAgIH1cblxuICAgIGNvbnN0IGJhc2UgOiBWYWx1ZSA9XG4gICAgICB7IHZhbDogc2lkZXMuYmFzZSwgc2hvdzogdHJ1ZSwgbWlzc2luZzogZmFsc2UsIGxhYmVsOiBzY2FsZWRTdHIoc2lkZXMuYmFzZSxkcCkgKyBcIlxcXFxtYXRocm17Y219XCIgfVxuICAgIGNvbnN0IGhlaWdodCA6IFZhbHVlID1cbiAgICAgIHsgdmFsOiBzaWRlcy5oZWlnaHQsIHNob3c6IHRydWUsIG1pc3Npbmc6IGZhbHNlICxsYWJlbDogc2NhbGVkU3RyKHNpZGVzLmhlaWdodCxkcCkgKyBcIlxcXFxtYXRocm17Y219XCJ9XG4gICAgaWYgKGRlbm9taW5hdG9yID4gMSkge1xuICAgICAgO1tiYXNlLCBoZWlnaHRdLmZvckVhY2godiA9PiB7XG4gICAgICAgIHYubGFiZWwgPSBuZXcgZnJhY3Rpb24odi52YWwsZGVub21pbmF0b3IpLnRvTGF0ZXgodHJ1ZSkgKyAnXFxcXG1hdGhybXtjbX0nXG4gICAgICB9KVxuICAgIH1cbiAgICBsZXQgc2hvd09wcG9zaXRlcyA6IGJvb2xlYW5cbiAgICBjb25zdCBhcmVhUHJvcGVydGllcyA6IFBhcnRpYWw8T21pdDxWYWx1ZSwgJ3ZhbCc+PiA9IHt9XG4gICAgY29uc3QgcGVyaW1ldGVyUHJvcGVydGllcyA6IFBhcnRpYWw8T21pdDxWYWx1ZSwgJ3ZhbCc+PiA9IHt9XG5cbiAgICAvLyBzZWxlY3RpdmVseSBoaWRlL21pc3NpbmcgZGVwZW5kaW5nIG9uIHR5cGVcbiAgICBzd2l0Y2ggKG9wdGlvbnMucXVlc3Rpb25UeXBlKSB7XG4gICAgICBjYXNlICdhcmVhJzpcbiAgICAgICAgYXJlYVByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgYXJlYVByb3BlcnRpZXMubWlzc2luZyA9IHRydWVcbiAgICAgICAgc2hvd09wcG9zaXRlcyA9ICFvcHRpb25zLm5vRGlzdHJhY3RvcnNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3BlcmltZXRlcic6XG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBzaG93T3Bwb3NpdGVzID0gb3B0aW9ucy5ub0Rpc3RyYWN0b3JzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdyZXZlcnNlQXJlYSc6XG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLm1pc3NpbmcgPSBmYWxzZVxuICAgICAgICByYW5kRWxlbShbYmFzZSwgaGVpZ2h0XSkubWlzc2luZyA9IHRydWVcbiAgICAgICAgc2hvd09wcG9zaXRlcyA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdyZXZlcnNlUGVyaW1ldGVyJzpcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nID0gZmFsc2VcbiAgICAgICAgcmFuZEVsZW0oW2Jhc2UsIGhlaWdodF0pLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIHNob3dPcHBvc2l0ZXMgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgdGhpcyhiYXNlLCBoZWlnaHQsIHNob3dPcHBvc2l0ZXMsIGRwLCBkZW5vbWluYXRvciwgYXJlYVByb3BlcnRpZXMgYXMgT21pdDxWYWx1ZSwgJ3ZhbCc+LCBwZXJpbWV0ZXJQcm9wZXJ0aWVzIGFzIE9taXQ8VmFsdWUsICd2YWwnPilcbiAgfVxuXG4gIGdldCBwZXJpbWV0ZXIgKCkgOiBWYWx1ZSB7XG4gICAgaWYgKCF0aGlzLl9wZXJpbWV0ZXIpIHtcbiAgICAgIHRoaXMuX3BlcmltZXRlciA9IHtcbiAgICAgICAgc2hvdzogZmFsc2UsXG4gICAgICAgIG1pc3Npbmc6IHRydWVcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0aGlzLl9wZXJpbWV0ZXIudmFsKSB7XG4gICAgICB0aGlzLl9wZXJpbWV0ZXIudmFsID0gMiAqICh0aGlzLmJhc2UudmFsICsgdGhpcy5oZWlnaHQudmFsKVxuICAgICAgaWYgKHRoaXMuZGVub21pbmF0b3IgPiAxKSB7XG4gICAgICAgIHRoaXMuX3BlcmltZXRlci5sYWJlbCA9IG5ldyBmcmFjdGlvbih0aGlzLl9wZXJpbWV0ZXIudmFsLCB0aGlzLmRlbm9taW5hdG9yKS50b0xhdGV4KHRydWUpICsgJ1xcXFxtYXRocm17Y219J1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcGVyaW1ldGVyLmxhYmVsID0gc2NhbGVkU3RyKHRoaXMuX3BlcmltZXRlci52YWwsIHRoaXMuZHApICsgJ1xcXFxtYXRocm17Y219J1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcGVyaW1ldGVyIGFzIFZhbHVlXG4gIH1cblxuICBnZXQgYXJlYSAoKSA6IFZhbHVlIHtcbiAgICBpZiAoIXRoaXMuX2FyZWEpIHtcbiAgICAgIHRoaXMuX2FyZWEgPSB7XG4gICAgICAgIHNob3c6IGZhbHNlLFxuICAgICAgICBtaXNzaW5nOiB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5fYXJlYS52YWwpIHtcbiAgICAgIHRoaXMuX2FyZWEudmFsID0gdGhpcy5iYXNlLnZhbCAqIHRoaXMuaGVpZ2h0LnZhbFxuICAgICAgaWYgKHRoaXMuZGVub21pbmF0b3IgPiAxKSB7XG4gICAgICAgIHRoaXMuX2FyZWEubGFiZWwgPSBuZXcgZnJhY3Rpb24odGhpcy5fYXJlYS52YWwsIHRoaXMuZGVub21pbmF0b3IqKjIpLnRvTGF0ZXgodHJ1ZSkgKyAnXFxcXG1hdGhybXtjbX1eMidcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2FyZWEubGFiZWwgPSBzY2FsZWRTdHIodGhpcy5fYXJlYS52YWwsIDIgKiB0aGlzLmRwKSArICdcXFxcbWF0aHJte2NtfV4yJ1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fYXJlYSBhcyBWYWx1ZVxuICB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5cbi8qIENhbnZhcyBkcmF3aW5nLCB1c2luZyB0aGUgUG9pbnQgY2xhc3MgKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGRhc2hlZExpbmUgKGN0eCwgeDEsIHkxLCB4MiwgeTIpIHtcbiAgLy8gV29yayBpZiBnaXZlbiB0d28gcG9pbnRzIGluc3RlYWQ6XG4gIGlmICh4MSBpbnN0YW5jZW9mIFBvaW50ICYmIHgyIGluc3RhbmNlb2YgUG9pbnQpIHtcbiAgICBjb25zdCBwMSA9IHgxOyBjb25zdCBwMiA9IHgyXG4gICAgeDEgPSBwMS54XG4gICAgeTEgPSBwMS55XG4gICAgeDIgPSBwMi54XG4gICAgeTIgPSBwMi55XG4gIH1cblxuICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHgyIC0geDEsIHkyIC0geTEpXG4gIGNvbnN0IGRhc2h4ID0gKHkxIC0geTIpIC8gbGVuZ3RoIC8vIHVuaXQgdmVjdG9yIHBlcnBlbmRpY3VsYXIgdG8gbGluZVxuICBjb25zdCBkYXNoeSA9ICh4MiAtIHgxKSAvIGxlbmd0aFxuICBjb25zdCBtaWR4ID0gKHgxICsgeDIpIC8gMlxuICBjb25zdCBtaWR5ID0gKHkxICsgeTIpIC8gMlxuXG4gIC8vIGRyYXcgdGhlIGJhc2UgbGluZVxuICBjdHgubW92ZVRvKHgxLCB5MSlcbiAgY3R4LmxpbmVUbyh4MiwgeTIpXG5cbiAgLy8gZHJhdyB0aGUgZGFzaFxuICBjdHgubW92ZVRvKG1pZHggKyA1ICogZGFzaHgsIG1pZHkgKyA1ICogZGFzaHkpXG4gIGN0eC5saW5lVG8obWlkeCAtIDUgKiBkYXNoeCwgbWlkeSAtIDUgKiBkYXNoeSlcblxuICBjdHgubW92ZVRvKHgyLCB5Milcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFycm93TGluZSAoY3R4LCBwdDEsIHB0Miwgc2l6ZSwgbSkge1xuICBpZiAoIW0pIG0gPSAwLjVcblxuICBjb25zdCB1bml0ID0gUG9pbnQudW5pdFZlY3RvcihwdDEsIHB0MilcbiAgdW5pdC54ICo9IHNpemVcbiAgdW5pdC55ICo9IHNpemVcbiAgY29uc3Qgbm9ybWFsID0geyB4OiAtdW5pdC55LCB5OiB1bml0LnggfVxuICBub3JtYWwueCAqPSBtXG4gIG5vcm1hbC55ICo9IG1cblxuICBjb25zdCBjb250cm9sMSA9IHB0Mi5jbG9uZSgpXG4gICAgLnRyYW5zbGF0ZSgtdW5pdC54LCAtdW5pdC55KVxuICAgIC50cmFuc2xhdGUobm9ybWFsLngsIG5vcm1hbC55KVxuXG4gIGNvbnN0IGNvbnRyb2wyID0gcHQyLmNsb25lKClcbiAgICAudHJhbnNsYXRlKC11bml0LngsIC11bml0LnkpXG4gICAgLnRyYW5zbGF0ZSgtbm9ybWFsLngsIC1ub3JtYWwueSlcblxuICBjdHgubW92ZVRvKHB0MS54LCBwdDEueSlcbiAgY3R4LmxpbmVUbyhwdDIueCwgcHQyLnkpXG4gIGN0eC5saW5lVG8oY29udHJvbDEueCwgY29udHJvbDEueSlcbiAgY3R4Lm1vdmVUbyhwdDIueCwgcHQyLnkpXG4gIGN0eC5saW5lVG8oY29udHJvbDIueCwgY29udHJvbDIueSlcbn1cblxuLyoqXG4gKiBEcmF3IGEgcmlnaHQgYW5nbGUgc3ltYm9sIGZvciBhbmdsZSBBT0MuIE5COiBubyBjaGVjayBpcyBtYWRlIHRoYXQgQU9DIGlzIGluZGVlZCBhIHJpZ2h0IGFuZ2xlXG4gKiBAcGFyYW0ge0NhbnZhc1JlbmRlcmluZ0NvbnRleHQyRH0gY3R4IFRoZSBjb250ZXh0IHRvIGRyYXcgaW5cbiAqIEBwYXJhbSB7UG9pbnR9IEEgU3RhcnQgcG9pbnRcbiAqIEBwYXJhbSB7UG9pbnR9IE8gVmVydGV4IHBvaW50XG4gKiBAcGFyYW0ge1BvaW50fSBDIEVuZCBwb2ludFxuICogQHBhcmFtIHtudW1iZXJ9IHNpemUgU2l6ZSBvZiByaWdodCBhbmdsZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZHJhd1JpZ2h0QW5nbGUgKGN0eCwgQSwgTywgQywgc2l6ZSkge1xuICBjb25zdCB1bml0T0EgPSBQb2ludC51bml0VmVjdG9yKE8sIEEpXG4gIGNvbnN0IHVuaXRPQyA9IFBvaW50LnVuaXRWZWN0b3IoTywgQylcbiAgY29uc3QgY3RsMSA9IE8uY2xvbmUoKS50cmFuc2xhdGUodW5pdE9BLnggKiBzaXplLCB1bml0T0EueSAqIHNpemUpXG4gIGNvbnN0IGN0bDIgPSBjdGwxLmNsb25lKCkudHJhbnNsYXRlKHVuaXRPQy54ICogc2l6ZSwgdW5pdE9DLnkgKiBzaXplKVxuICBjb25zdCBjdGwzID0gTy5jbG9uZSgpLnRyYW5zbGF0ZSh1bml0T0MueCAqIHNpemUsIHVuaXRPQy55ICogc2l6ZSlcbiAgY3R4Lm1vdmVUbyhjdGwxLngsIGN0bDEueSlcbiAgY3R4LmxpbmVUbyhjdGwyLngsIGN0bDIueSlcbiAgY3R4LmxpbmVUbyhjdGwzLngsIGN0bDMueSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcmFsbGVsU2lnbiAoY3R4LCBBLCBCLCBzaXplLCBudW1iZXIsIGdhcCkge1xuICBpZiAoIXNpemUpIHNpemUgPSAxMFxuICBpZiAoIW51bWJlcikgbnVtYmVyID0gMVxuICBpZiAoIWdhcCkgZ2FwID0gc2l6ZVxuXG4gIGNvbnN0IHVuaXQgPSBQb2ludC51bml0VmVjdG9yKEEsIEIpXG4gIHVuaXQueCAqPSBzaXplXG4gIHVuaXQueSAqPSBzaXplXG4gIGNvbnN0IG5vcm1hbCA9IHsgeDogLXVuaXQueSwgeTogdW5pdC54IH1cblxuICBjb25zdCBNID0gUG9pbnQubWVhbihbQSwgQl0pXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1iZXI7IGkrKykge1xuICAgIGNvbnN0IGN0bDIgPSBNLmNsb25lKCkubW92ZVRvd2FyZChCLCBpICogZ2FwKVxuICAgIGNvbnN0IGN0bDEgPSBjdGwyLmNsb25lKClcbiAgICAgIC50cmFuc2xhdGUoLXVuaXQueCwgLXVuaXQueSlcbiAgICAgIC50cmFuc2xhdGUobm9ybWFsLngsIG5vcm1hbC55KVxuICAgIGNvbnN0IGN0bDMgPSBjdGwyLmNsb25lKClcbiAgICAgIC50cmFuc2xhdGUoLXVuaXQueCwgLXVuaXQueSlcbiAgICAgIC50cmFuc2xhdGUoLW5vcm1hbC54LCAtbm9ybWFsLnkpXG5cbiAgICBjdHgubW92ZVRvKGN0bDEueCwgY3RsMS55KVxuICAgIGN0eC5saW5lVG8oY3RsMi54LCBjdGwyLnkpXG4gICAgY3R4LmxpbmVUbyhjdGwzLngsIGN0bDMueSlcbiAgfVxufVxuIiwiZXhwb3J0IHR5cGUgU2hhcGUgPSAncmVjdGFuZ2xlJyB8ICd0cmlhbmdsZScgfCAncGFyYWxsZWxvZ3JhbScgfCAndHJhcGV6aXVtJztcblxuZXhwb3J0IHR5cGUgUXVlc3Rpb25UeXBlU2ltcGxlID0gJ2FyZWEnIHwgJ3BlcmltZXRlcic7XG5leHBvcnQgdHlwZSBRdWVzdGlvblR5cGVDdXN0b20gPSAncmV2ZXJzZUFyZWEnIHwgJ3JldmVyc2VQZXJpbWV0ZXInIHwgJ3B5dGhhZ29yYXNBcmVhJyB8ICdweXRoYWdvcmFzUGVyaW1ldGVyJyB8ICdweXRoYWdvcmFzSXNvc2NlbGVzQXJlYSc7XG5leHBvcnQgdHlwZSBRdWVzdGlvblR5cGUgPSBRdWVzdGlvblR5cGVTaW1wbGUgfCBRdWVzdGlvblR5cGVDdXN0b207XG5cbmV4cG9ydCBpbnRlcmZhY2UgUXVlc3Rpb25PcHRpb25zIHtcbiAgbm9EaXN0cmFjdG9yczogYm9vbGVhbiwgLy8gYWRkcyBsYXllciBvZiBkaWZmaWN1bHR5IHdoZW4gdHJ1ZSBieSBpbmNsdWRpbmcvZXhjbHVkaW5nIHNpZGVzIChkZXBlbmRpbmcgb24gc2hhcGUgdHlwZSlcbiAgZHA/OiBudW1iZXIsIC8vIG51bWJlciBvZiBkZWNpbWFsIHBsYWNlcyBvZiBsZW5ndGhzXG4gIGZyYWN0aW9uPzogYm9vbGVhbixcbiAgbWF4TGVuZ3RoPzogbnVtYmVyLCAvLyB0aGUgbWF4aW11bSBsZW5ndGggb2YgYSBzaWRlXG4gIHF1ZXN0aW9uVHlwZTogUXVlc3Rpb25UeXBlXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV3JhcHBlck9wdGlvbnMge1xuICBkaWZmaWN1bHR5OiBudW1iZXI7XG4gIHNoYXBlczogU2hhcGVbXTtcbiAgcXVlc3Rpb25UeXBlc1NpbXBsZTogUXVlc3Rpb25UeXBlU2ltcGxlW107XG4gIGN1c3RvbTogYm9vbGVhbjtcbiAgcXVlc3Rpb25UeXBlc0N1c3RvbTogKFF1ZXN0aW9uVHlwZSlbXTtcbiAgZHA6IDAgfCAxO1xufVxuXG5leHBvcnQgY29uc3QgY29sb3JzID0gWydMaWdodEN5YW4nLCdMaWdodFllbGxvdycsJ1BpbmsnLCdMaWdodEdyZWVuJywnTGlnaHRCbHVlJywnSXZvcnknLCdMaWdodEdyYXknXVxuIiwiaW1wb3J0IHsgZHJhd1JpZ2h0QW5nbGUgfSBmcm9tICdkcmF3aW5nJ1xuaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUURhdGEsIEdyYXBoaWNRVmlldywgTGFiZWwgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4vdHlwZXMnXG5pbXBvcnQgUmVjdGFuZ2xlQXJlYURhdGEsIHsgVmFsdWUgfSBmcm9tICcuL1JlY3RhbmdsZUFyZWFEYXRhJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWN0YW5nbGVBcmVhVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIGRhdGEhOiBSZWN0YW5nbGVBcmVhRGF0YSAvLyBhc3NpZ25lZCBpbiBzdXBlclxuICBBOiBQb2ludFxuICBCOiBQb2ludFxuICBDOiBQb2ludFxuICBEOiBQb2ludFxuXG4gIGNvbnN0cnVjdG9yIChBOiBQb2ludCwgQjogUG9pbnQsIEM6IFBvaW50LCBEOiBQb2ludCwgbGFiZWxzOiBMYWJlbFtdLCBkYXRhOiBSZWN0YW5nbGVBcmVhRGF0YSwgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgLyogU3VwZXIgZG9lczpcbiAgICAgKiAgU2V0cyB0aGlzLndpZHRoIGFuZCB0aGlzLmhlaWdodFxuICAgICAqICBTZXRzIHRoaXMuZGF0YVxuICAgICAqICBDcmVhdGVzIERPTSBlbGVtZW50cywgaW5jbHVkaW5nIGNhbnZhc1xuICAgICAqICBDcmVhdGVzIGVtcHR5IHRoaXMubGFiZWxzIGxpc3RcbiAgICAgKi9cbiAgICBzdXBlcihkYXRhLCB2aWV3T3B0aW9ucykgLy8gaW5pdGlhbGlzZXMgdGhpcy5kYXRhXG4gICAgdGhpcy5BID0gQVxuICAgIHRoaXMuQiA9IEJcbiAgICB0aGlzLkMgPSBDXG4gICAgdGhpcy5EID0gRFxuICAgIHRoaXMubGFiZWxzID0gbGFiZWxzXG4gIH1cblxuICAvKipcbiAgICogU3RhdGljIGZhY3RvcnkgbWV0aG9kIHJldHVybmluZyB2aWV3IGZyb20gZGF0YVxuICAgKiBAcGFyYW0gZGF0YSBBIGRhdGEgb2JqZWN0LCB3aGljaCBoYWQgZGV0YWlscyBvZiB3aWR0aCwgaGVpZ2h0IGFuZCBhcmVhXG4gICAqIEBwYXJhbSB2aWV3T3B0aW9ucyBWaWV3IG9wdGlvbnMgLSBjb250YWluaW5nIHdpZHRoIGFuZCBoZWlnaHRcbiAgICovXG4gIHN0YXRpYyBmcm9tRGF0YSAoZGF0YTogUmVjdGFuZ2xlQXJlYURhdGEsIHZpZXdPcHRpb25zPzogVmlld09wdGlvbnMpIDogUmVjdGFuZ2xlQXJlYVZpZXcge1xuICAgIC8vIERlZmF1bHRzIChOQjogZHVwbGljYXRlcyBlZmZvcnQgaW4gY29uc3RydWN0b3IsIGdpdmVuIHVzZSBvZiBzdGF0aWMgZmFjdG9yeSBjb25zdHJ1Y3RvciBpbnN0ZWFkIG9mIEdyYXBoaWNRJ3MgbWV0aG9kKVxuICAgIHZpZXdPcHRpb25zID0gdmlld09wdGlvbnMgPz8ge31cbiAgICB2aWV3T3B0aW9ucy53aWR0aCA9IHZpZXdPcHRpb25zLndpZHRoID8/IDMwMFxuICAgIHZpZXdPcHRpb25zLmhlaWdodCA9IHZpZXdPcHRpb25zLmhlaWdodCA/PyAzMDBcblxuICAgIC8vIGluaXRpYWwgcG9pbnRzXG4gICAgY29uc3QgQSA9IG5ldyBQb2ludCgwLCAwKVxuICAgIGNvbnN0IEIgPSBuZXcgUG9pbnQoMCwgZGF0YS5oZWlnaHQudmFsKVxuICAgIGNvbnN0IEMgPSBuZXcgUG9pbnQoZGF0YS5iYXNlLnZhbCwgZGF0YS5oZWlnaHQudmFsKVxuICAgIGNvbnN0IEQgPSBuZXcgUG9pbnQoZGF0YS5iYXNlLnZhbCwgMClcblxuICAgIC8vIHJvdGF0ZSwgc2NhbGUgYW5kIGNlbnRlclxuICAgIGNvbnN0IHJvdGF0aW9uID0gdmlld09wdGlvbnMucm90YXRpb24gPz8gMiAqIE1hdGguUEkgKiBNYXRoLnJhbmRvbSgpXG4gICAgO1tBLCBCLCBDLCBEXS5mb3JFYWNoKHB0ID0+IHB0LnJvdGF0ZShyb3RhdGlvbikpXG4gICAgUG9pbnQuc2NhbGVUb0ZpdChbQSwgQiwgQywgRF0sIHZpZXdPcHRpb25zLndpZHRoLCB2aWV3T3B0aW9ucy5oZWlnaHQsIDgwKVxuXG4gICAgLy8gU2V0IHVwIGxhYmVsc1xuICAgIGNvbnN0IGxhYmVscyA6IExhYmVsW10gPSBbXVxuXG4gICAgY29uc3Qgc2lkZXMgOiBbUG9pbnQsIFBvaW50LCBWYWx1ZV1bXSA9IFsgLy8gWzFzdCBwb2ludCwgMm5kIHBvaW50LCBsZW5ndGhdXG4gICAgICBbQSwgQiwgZGF0YS5oZWlnaHRdLFxuICAgICAgW0IsIEMsIGRhdGEuYmFzZV1cbiAgICBdXG5cbiAgICBpZiAoZGF0YS5zaG93T3Bwb3NpdGVzKSB7XG4gICAgICBzaWRlcy5wdXNoKFtDLCBELCBkYXRhLmhlaWdodF0pXG4gICAgICBzaWRlcy5wdXNoKFtELCBBLCBkYXRhLmJhc2VdKVxuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwLCBuID0gc2lkZXMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7IC8vIHNpZGVzXG4gICAgICBpZiAoIXNpZGVzW2ldWzJdLnNob3cpIGNvbnRpbnVlXG4gICAgICBjb25zdCBvZmZzZXQgPSAyMFxuICAgICAgY29uc3QgcG9zID0gUG9pbnQubWVhbihzaWRlc1tpXVswXSwgc2lkZXNbaV1bMV0pXG4gICAgICBjb25zdCB1bml0dmVjID0gUG9pbnQudW5pdFZlY3RvcihzaWRlc1tpXVswXSwgc2lkZXNbaV1bMV0pXG5cbiAgICAgIHBvcy50cmFuc2xhdGUoLXVuaXR2ZWMueSAqIG9mZnNldCwgdW5pdHZlYy54ICogb2Zmc2V0KVxuXG4gICAgICBjb25zdCB0ZXh0YSA9IHNpZGVzW2ldWzJdLmxhYmVsID8/IHNpZGVzW2ldWzJdLnZhbC50b1N0cmluZygpXG4gICAgICBjb25zdCB0ZXh0cSA9IHNpZGVzW2ldWzJdLm1pc3NpbmcgPyAnPycgOiB0ZXh0YVxuICAgICAgY29uc3Qgc3R5bGVxID0gJ25vcm1hbCdcbiAgICAgIGNvbnN0IHN0eWxlYSA9IHNpZGVzW2ldWzJdLm1pc3NpbmcgPyAnYW5zd2VyJyA6ICdub3JtYWwnXG5cbiAgICAgIGxhYmVscy5wdXNoKHtcbiAgICAgICAgcG9zOiBwb3MsXG4gICAgICAgIHRleHRhOiB0ZXh0YSxcbiAgICAgICAgdGV4dHE6IHRleHRxLFxuICAgICAgICB0ZXh0OiB0ZXh0cSxcbiAgICAgICAgc3R5bGVhOiBzdHlsZWEsXG4gICAgICAgIHN0eWxlcTogc3R5bGVxLFxuICAgICAgICBzdHlsZTogc3R5bGVxXG4gICAgICB9KVxuICAgIH1cblxuICAgIGxldCBuSW5mbyA9IDBcbiAgICBpZiAoZGF0YS5hcmVhLnNob3cpIHtcbiAgICAgIGNvbnN0IHRleHRhID0gZGF0YS5hcmVhLmxhYmVsID8/IGRhdGEuYXJlYS52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSBkYXRhLmFyZWEubWlzc2luZyA/ICc/JyA6IHRleHRhXG4gICAgICBjb25zdCBzdHlsZXEgPSAnZXh0cmEtaW5mbydcbiAgICAgIGNvbnN0IHN0eWxlYSA9IGRhdGEuYXJlYS5taXNzaW5nID8gJ2V4dHJhLWFuc3dlcicgOiAnZXh0cmEtaW5mbydcbiAgICAgIGxhYmVscy5wdXNoKFxuICAgICAgICB7XG4gICAgICAgICAgdGV4dGE6ICdcXFxcdGV4dHtBcmVhfSA9ICcgKyB0ZXh0YSxcbiAgICAgICAgICB0ZXh0cTogJ1xcXFx0ZXh0e0FyZWF9ID0gJyArIHRleHRxLFxuICAgICAgICAgIHRleHQ6ICdcXFxcdGV4dHtBcmVhfSA9ICcgKyB0ZXh0cSxcbiAgICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgICBzdHlsZTogc3R5bGVxLFxuICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB2aWV3T3B0aW9ucy5oZWlnaHQgLSAxMCAtIDE1ICogbkluZm8pXG4gICAgICAgIH1cbiAgICAgIClcbiAgICAgIG5JbmZvKytcbiAgICB9XG5cbiAgICBpZiAoZGF0YS5wZXJpbWV0ZXIuc2hvdykge1xuICAgICAgY29uc3QgdGV4dGEgPSBkYXRhLnBlcmltZXRlci5sYWJlbCA/PyBkYXRhLnBlcmltZXRlci52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSBkYXRhLnBlcmltZXRlci5taXNzaW5nID8gJz8nIDogdGV4dGFcbiAgICAgIGNvbnN0IHN0eWxlcSA9ICdleHRyYS1pbmZvJ1xuICAgICAgY29uc3Qgc3R5bGVhID0gZGF0YS5wZXJpbWV0ZXIubWlzc2luZyA/ICdleHRyYS1hbnN3ZXInIDogJ2V4dHJhLWluZm8nXG4gICAgICBsYWJlbHMucHVzaChcbiAgICAgICAge1xuICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB2aWV3T3B0aW9ucy5oZWlnaHQgLSAxMCAtIDIwICogbkluZm8pLFxuICAgICAgICAgIHRleHRhOiAnXFxcXHRleHR7UGVyaW1ldGVyfSA9ICcgKyB0ZXh0YSxcbiAgICAgICAgICB0ZXh0cTogJ1xcXFx0ZXh0e1BlcmltZXRlcn0gPSAnICsgdGV4dHEsXG4gICAgICAgICAgdGV4dDogJ1xcXFx0ZXh0e1BlcmltZXRlcn0gPSAnICsgdGV4dHEsXG4gICAgICAgICAgc3R5bGVxOiBzdHlsZXEsXG4gICAgICAgICAgc3R5bGVhOiBzdHlsZWEsXG4gICAgICAgICAgc3R5bGU6IHN0eWxlcVxuICAgICAgICB9XG4gICAgICApXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBSZWN0YW5nbGVBcmVhVmlldyhBLCBCLCBDLCBELCBsYWJlbHMsIGRhdGEsIHZpZXdPcHRpb25zKVxuICB9XG5cbiAgcmVuZGVyICgpOiB2b2lkIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG4gICAgaWYgKGN0eCA9PT0gbnVsbCkgeyB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBnZXQgY29udGV4dCcpIH1cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpIC8vIGNsZWFyXG4gICAgY3R4LnNldExpbmVEYXNoKFtdKVxuXG4gICAgLy8gZHJhdyByZWN0YW5nbGVcbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBjdHgubW92ZVRvKHRoaXMuQS54LCB0aGlzLkEueSlcbiAgICBjdHgubGluZVRvKHRoaXMuQi54LCB0aGlzLkIueSlcbiAgICBjdHgubGluZVRvKHRoaXMuQy54LCB0aGlzLkMueSlcbiAgICBjdHgubGluZVRvKHRoaXMuRC54LCB0aGlzLkQueSlcbiAgICBjdHgubGluZVRvKHRoaXMuQS54LCB0aGlzLkEueSlcbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguZmlsbFN0eWxlID0gcmFuZEVsZW0oY29sb3JzKVxuICAgIGN0eC5maWxsKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIC8vIHJpZ2h0IGFuZ2xlc1xuICAgIGNvbnN0IHNpemUgPSBNYXRoLm1pbihcbiAgICAgIDE1LFxuICAgICAgTWF0aC5taW4oUG9pbnQuZGlzdGFuY2UodGhpcy5BLCB0aGlzLkIpLCBQb2ludC5kaXN0YW5jZSh0aGlzLkIsIHRoaXMuQykpIC8gM1xuICAgIClcbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBkcmF3UmlnaHRBbmdsZShjdHgsIHRoaXMuQSwgdGhpcy5CLCB0aGlzLkMsIHNpemUpXG4gICAgZHJhd1JpZ2h0QW5nbGUoY3R4LCB0aGlzLkIsIHRoaXMuQywgdGhpcy5ELCBzaXplKVxuICAgIGRyYXdSaWdodEFuZ2xlKGN0eCwgdGhpcy5DLCB0aGlzLkQsIHRoaXMuQSwgc2l6ZSlcbiAgICBkcmF3UmlnaHRBbmdsZShjdHgsIHRoaXMuRCwgdGhpcy5BLCB0aGlzLkIsIHNpemUpXG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICB0aGlzLnJlbmRlckxhYmVscygpXG4gIH1cbn1cbiIsImltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgUmVjdGFuZ2xlQXJlYURhdGEgZnJvbSAnLi9SZWN0YW5nbGVBcmVhRGF0YSdcbmltcG9ydCBSZWN0YW5nbGVBcmVhVmlldyBmcm9tICcuL1JlY3RhbmdsZUFyZWFWaWV3J1xuaW1wb3J0IHsgUXVlc3Rpb25PcHRpb25zIH0gZnJvbSAnLi90eXBlcydcblxuLy8gUmVjdGFuZ2xlIG5lZWRzIG5vIGZ1cnRoZXIgb3B0aW9uc1xuLy8gVHJpYW5nbGUgbmVlZHMgbm8gZnVydGhlciBvcHRpb25zIC0tIG5lZWRzIHBhc3NpbmcgaW5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjdGFuZ2xlQXJlYVEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGEhOiBSZWN0YW5nbGVBcmVhRGF0YSAvLyBpbml0aWFsaXNlZCBpbiBzdXBlcigpXG4gIHZpZXchOiBSZWN0YW5nbGVBcmVhVmlld1xuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgY29uc3QgZGF0YSA9IFJlY3RhbmdsZUFyZWFEYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBSZWN0YW5nbGVBcmVhVmlldy5mcm9tRGF0YShkYXRhLCB2aWV3T3B0aW9ucylcbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZXMnXG4gIH1cbn1cbiIsIi8qISAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG5Db3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi5cclxuXHJcblBlcm1pc3Npb24gdG8gdXNlLCBjb3B5LCBtb2RpZnksIGFuZC9vciBkaXN0cmlidXRlIHRoaXMgc29mdHdhcmUgZm9yIGFueVxyXG5wdXJwb3NlIHdpdGggb3Igd2l0aG91dCBmZWUgaXMgaGVyZWJ5IGdyYW50ZWQuXHJcblxyXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiIEFORCBUSEUgQVVUSE9SIERJU0NMQUlNUyBBTEwgV0FSUkFOVElFUyBXSVRIXHJcblJFR0FSRCBUTyBUSElTIFNPRlRXQVJFIElOQ0xVRElORyBBTEwgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWVxyXG5BTkQgRklUTkVTUy4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUiBCRSBMSUFCTEUgRk9SIEFOWSBTUEVDSUFMLCBESVJFQ1QsXHJcbklORElSRUNULCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVMgT1IgQU5ZIERBTUFHRVMgV0hBVFNPRVZFUiBSRVNVTFRJTkcgRlJPTVxyXG5MT1NTIE9GIFVTRSwgREFUQSBPUiBQUk9GSVRTLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgTkVHTElHRU5DRSBPUlxyXG5PVEhFUiBUT1JUSU9VUyBBQ1RJT04sIEFSSVNJTkcgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgVVNFIE9SXHJcblBFUkZPUk1BTkNFIE9GIFRISVMgU09GVFdBUkUuXHJcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXHJcbi8qIGdsb2JhbCBSZWZsZWN0LCBQcm9taXNlICovXHJcblxyXG52YXIgZXh0ZW5kU3RhdGljcyA9IGZ1bmN0aW9uKGQsIGIpIHtcclxuICAgIGV4dGVuZFN0YXRpY3MgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHxcclxuICAgICAgICAoeyBfX3Byb3RvX186IFtdIH0gaW5zdGFuY2VvZiBBcnJheSAmJiBmdW5jdGlvbiAoZCwgYikgeyBkLl9fcHJvdG9fXyA9IGI7IH0pIHx8XHJcbiAgICAgICAgZnVuY3Rpb24gKGQsIGIpIHsgZm9yICh2YXIgcCBpbiBiKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGIsIHApKSBkW3BdID0gYltwXTsgfTtcclxuICAgIHJldHVybiBleHRlbmRTdGF0aWNzKGQsIGIpO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXh0ZW5kcyhkLCBiKSB7XHJcbiAgICBleHRlbmRTdGF0aWNzKGQsIGIpO1xyXG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XHJcbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19hc3NpZ24gPSBmdW5jdGlvbigpIHtcclxuICAgIF9fYXNzaWduID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiBfX2Fzc2lnbih0KSB7XHJcbiAgICAgICAgZm9yICh2YXIgcywgaSA9IDEsIG4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XHJcbiAgICAgICAgICAgIHMgPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSkgdFtwXSA9IHNbcF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIF9fYXNzaWduLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3Jlc3QocywgZSkge1xyXG4gICAgdmFyIHQgPSB7fTtcclxuICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSAmJiBlLmluZGV4T2YocCkgPCAwKVxyXG4gICAgICAgIHRbcF0gPSBzW3BdO1xyXG4gICAgaWYgKHMgIT0gbnVsbCAmJiB0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9PT0gXCJmdW5jdGlvblwiKVxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBwID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhzKTsgaSA8IHAubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKGUuaW5kZXhPZihwW2ldKSA8IDAgJiYgT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZS5jYWxsKHMsIHBbaV0pKVxyXG4gICAgICAgICAgICAgICAgdFtwW2ldXSA9IHNbcFtpXV07XHJcbiAgICAgICAgfVxyXG4gICAgcmV0dXJuIHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2RlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19wYXJhbShwYXJhbUluZGV4LCBkZWNvcmF0b3IpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHsgZGVjb3JhdG9yKHRhcmdldCwga2V5LCBwYXJhbUluZGV4KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSkge1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0Lm1ldGFkYXRhID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiBSZWZsZWN0Lm1ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXRlcih0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcclxuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxyXG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XHJcbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2dlbmVyYXRvcih0aGlzQXJnLCBib2R5KSB7XHJcbiAgICB2YXIgXyA9IHsgbGFiZWw6IDAsIHNlbnQ6IGZ1bmN0aW9uKCkgeyBpZiAodFswXSAmIDEpIHRocm93IHRbMV07IHJldHVybiB0WzFdOyB9LCB0cnlzOiBbXSwgb3BzOiBbXSB9LCBmLCB5LCB0LCBnO1xyXG4gICAgcmV0dXJuIGcgPSB7IG5leHQ6IHZlcmIoMCksIFwidGhyb3dcIjogdmVyYigxKSwgXCJyZXR1cm5cIjogdmVyYigyKSB9LCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBzdGVwKFtuLCB2XSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAob3ApIHtcclxuICAgICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XHJcbiAgICAgICAgd2hpbGUgKF8pIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChmID0gMSwgeSAmJiAodCA9IG9wWzBdICYgMiA/IHlbXCJyZXR1cm5cIl0gOiBvcFswXSA/IHlbXCJ0aHJvd1wiXSB8fCAoKHQgPSB5W1wicmV0dXJuXCJdKSAmJiB0LmNhbGwoeSksIDApIDogeS5uZXh0KSAmJiAhKHQgPSB0LmNhbGwoeSwgb3BbMV0pKS5kb25lKSByZXR1cm4gdDtcclxuICAgICAgICAgICAgaWYgKHkgPSAwLCB0KSBvcCA9IFtvcFswXSAmIDIsIHQudmFsdWVdO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKG9wWzBdKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDA6IGNhc2UgMTogdCA9IG9wOyBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNDogXy5sYWJlbCsrOyByZXR1cm4geyB2YWx1ZTogb3BbMV0sIGRvbmU6IGZhbHNlIH07XHJcbiAgICAgICAgICAgICAgICBjYXNlIDU6IF8ubGFiZWwrKzsgeSA9IG9wWzFdOyBvcCA9IFswXTsgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDc6IG9wID0gXy5vcHMucG9wKCk7IF8udHJ5cy5wb3AoKTsgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghKHQgPSBfLnRyeXMsIHQgPSB0Lmxlbmd0aCA+IDAgJiYgdFt0Lmxlbmd0aCAtIDFdKSAmJiAob3BbMF0gPT09IDYgfHwgb3BbMF0gPT09IDIpKSB7IF8gPSAwOyBjb250aW51ZTsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gMyAmJiAoIXQgfHwgKG9wWzFdID4gdFswXSAmJiBvcFsxXSA8IHRbM10pKSkgeyBfLmxhYmVsID0gb3BbMV07IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSA2ICYmIF8ubGFiZWwgPCB0WzFdKSB7IF8ubGFiZWwgPSB0WzFdOyB0ID0gb3A7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHQgJiYgXy5sYWJlbCA8IHRbMl0pIHsgXy5sYWJlbCA9IHRbMl07IF8ub3BzLnB1c2gob3ApOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0WzJdKSBfLm9wcy5wb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG9wID0gYm9keS5jYWxsKHRoaXNBcmcsIF8pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHsgb3AgPSBbNiwgZV07IHkgPSAwOyB9IGZpbmFsbHkgeyBmID0gdCA9IDA7IH1cclxuICAgICAgICBpZiAob3BbMF0gJiA1KSB0aHJvdyBvcFsxXTsgcmV0dXJuIHsgdmFsdWU6IG9wWzBdID8gb3BbMV0gOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IHZhciBfX2NyZWF0ZUJpbmRpbmcgPSBPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XHJcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIGsyLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH0pO1xyXG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIG9bazJdID0gbVtrXTtcclxufSk7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHBvcnRTdGFyKG0sIG8pIHtcclxuICAgIGZvciAodmFyIHAgaW4gbSkgaWYgKHAgIT09IFwiZGVmYXVsdFwiICYmICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobywgcCkpIF9fY3JlYXRlQmluZGluZyhvLCBtLCBwKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fdmFsdWVzKG8pIHtcclxuICAgIHZhciBzID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIFN5bWJvbC5pdGVyYXRvciwgbSA9IHMgJiYgb1tzXSwgaSA9IDA7XHJcbiAgICBpZiAobSkgcmV0dXJuIG0uY2FsbChvKTtcclxuICAgIGlmIChvICYmIHR5cGVvZiBvLmxlbmd0aCA9PT0gXCJudW1iZXJcIikgcmV0dXJuIHtcclxuICAgICAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmIChvICYmIGkgPj0gby5sZW5ndGgpIG8gPSB2b2lkIDA7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiBvICYmIG9baSsrXSwgZG9uZTogIW8gfTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihzID8gXCJPYmplY3QgaXMgbm90IGl0ZXJhYmxlLlwiIDogXCJTeW1ib2wuaXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZWFkKG8sIG4pIHtcclxuICAgIHZhciBtID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9bU3ltYm9sLml0ZXJhdG9yXTtcclxuICAgIGlmICghbSkgcmV0dXJuIG87XHJcbiAgICB2YXIgaSA9IG0uY2FsbChvKSwgciwgYXIgPSBbXSwgZTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgd2hpbGUgKChuID09PSB2b2lkIDAgfHwgbi0tID4gMCkgJiYgIShyID0gaS5uZXh0KCkpLmRvbmUpIGFyLnB1c2goci52YWx1ZSk7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZXJyb3IpIHsgZSA9IHsgZXJyb3I6IGVycm9yIH07IH1cclxuICAgIGZpbmFsbHkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChyICYmICFyLmRvbmUgJiYgKG0gPSBpW1wicmV0dXJuXCJdKSkgbS5jYWxsKGkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmaW5hbGx5IHsgaWYgKGUpIHRocm93IGUuZXJyb3I7IH1cclxuICAgIH1cclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkKCkge1xyXG4gICAgZm9yICh2YXIgYXIgPSBbXSwgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspXHJcbiAgICAgICAgYXIgPSBhci5jb25jYXQoX19yZWFkKGFyZ3VtZW50c1tpXSkpO1xyXG4gICAgcmV0dXJuIGFyO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheXMoKSB7XHJcbiAgICBmb3IgKHZhciBzID0gMCwgaSA9IDAsIGlsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHMgKz0gYXJndW1lbnRzW2ldLmxlbmd0aDtcclxuICAgIGZvciAodmFyIHIgPSBBcnJheShzKSwgayA9IDAsIGkgPSAwOyBpIDwgaWw7IGkrKylcclxuICAgICAgICBmb3IgKHZhciBhID0gYXJndW1lbnRzW2ldLCBqID0gMCwgamwgPSBhLmxlbmd0aDsgaiA8IGpsOyBqKyssIGsrKylcclxuICAgICAgICAgICAgcltrXSA9IGFbal07XHJcbiAgICByZXR1cm4gcjtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0KHYpIHtcclxuICAgIHJldHVybiB0aGlzIGluc3RhbmNlb2YgX19hd2FpdCA/ICh0aGlzLnYgPSB2LCB0aGlzKSA6IG5ldyBfX2F3YWl0KHYpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY0dlbmVyYXRvcih0aGlzQXJnLCBfYXJndW1lbnRzLCBnZW5lcmF0b3IpIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgZyA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSwgaSwgcSA9IFtdO1xyXG4gICAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiKSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlmIChnW25dKSBpW25dID0gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChhLCBiKSB7IHEucHVzaChbbiwgdiwgYSwgYl0pID4gMSB8fCByZXN1bWUobiwgdik7IH0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiByZXN1bWUobiwgdikgeyB0cnkgeyBzdGVwKGdbbl0odikpOyB9IGNhdGNoIChlKSB7IHNldHRsZShxWzBdWzNdLCBlKTsgfSB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKHIpIHsgci52YWx1ZSBpbnN0YW5jZW9mIF9fYXdhaXQgPyBQcm9taXNlLnJlc29sdmUoci52YWx1ZS52KS50aGVuKGZ1bGZpbGwsIHJlamVjdCkgOiBzZXR0bGUocVswXVsyXSwgcik7IH1cclxuICAgIGZ1bmN0aW9uIGZ1bGZpbGwodmFsdWUpIHsgcmVzdW1lKFwibmV4dFwiLCB2YWx1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHJlamVjdCh2YWx1ZSkgeyByZXN1bWUoXCJ0aHJvd1wiLCB2YWx1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHNldHRsZShmLCB2KSB7IGlmIChmKHYpLCBxLnNoaWZ0KCksIHEubGVuZ3RoKSByZXN1bWUocVswXVswXSwgcVswXVsxXSk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNEZWxlZ2F0b3Iobykge1xyXG4gICAgdmFyIGksIHA7XHJcbiAgICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIsIGZ1bmN0aW9uIChlKSB7IHRocm93IGU7IH0pLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuLCBmKSB7IGlbbl0gPSBvW25dID8gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIChwID0gIXApID8geyB2YWx1ZTogX19hd2FpdChvW25dKHYpKSwgZG9uZTogbiA9PT0gXCJyZXR1cm5cIiB9IDogZiA/IGYodikgOiB2OyB9IDogZjsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY1ZhbHVlcyhvKSB7XHJcbiAgICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgdmFyIG0gPSBvW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSwgaTtcclxuICAgIHJldHVybiBtID8gbS5jYWxsKG8pIDogKG8gPSB0eXBlb2YgX192YWx1ZXMgPT09IFwiZnVuY3Rpb25cIiA/IF9fdmFsdWVzKG8pIDogb1tTeW1ib2wuaXRlcmF0b3JdKCksIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiKSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpKTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobikgeyBpW25dID0gb1tuXSAmJiBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkgeyB2ID0gb1tuXSh2KSwgc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgdi5kb25lLCB2LnZhbHVlKTsgfSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHNldHRsZShyZXNvbHZlLCByZWplY3QsIGQsIHYpIHsgUHJvbWlzZS5yZXNvbHZlKHYpLnRoZW4oZnVuY3Rpb24odikgeyByZXNvbHZlKHsgdmFsdWU6IHYsIGRvbmU6IGQgfSk7IH0sIHJlamVjdCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWFrZVRlbXBsYXRlT2JqZWN0KGNvb2tlZCwgcmF3KSB7XHJcbiAgICBpZiAoT2JqZWN0LmRlZmluZVByb3BlcnR5KSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjb29rZWQsIFwicmF3XCIsIHsgdmFsdWU6IHJhdyB9KTsgfSBlbHNlIHsgY29va2VkLnJhdyA9IHJhdzsgfVxyXG4gICAgcmV0dXJuIGNvb2tlZDtcclxufTtcclxuXHJcbnZhciBfX3NldE1vZHVsZURlZmF1bHQgPSBPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBcImRlZmF1bHRcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdiB9KTtcclxufSkgOiBmdW5jdGlvbihvLCB2KSB7XHJcbiAgICBvW1wiZGVmYXVsdFwiXSA9IHY7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnRTdGFyKG1vZCkge1xyXG4gICAgaWYgKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgcmV0dXJuIG1vZDtcclxuICAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayBpbiBtb2QpIGlmIChrICE9PSBcImRlZmF1bHRcIiAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobW9kLCBrKSkgX19jcmVhdGVCaW5kaW5nKHJlc3VsdCwgbW9kLCBrKTtcclxuICAgIF9fc2V0TW9kdWxlRGVmYXVsdChyZXN1bHQsIG1vZCk7XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnREZWZhdWx0KG1vZCkge1xyXG4gICAgcmV0dXJuIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpID8gbW9kIDogeyBkZWZhdWx0OiBtb2QgfTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRHZXQocmVjZWl2ZXIsIHByaXZhdGVNYXApIHtcclxuICAgIGlmICghcHJpdmF0ZU1hcC5oYXMocmVjZWl2ZXIpKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImF0dGVtcHRlZCB0byBnZXQgcHJpdmF0ZSBmaWVsZCBvbiBub24taW5zdGFuY2VcIik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcHJpdmF0ZU1hcC5nZXQocmVjZWl2ZXIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZFNldChyZWNlaXZlciwgcHJpdmF0ZU1hcCwgdmFsdWUpIHtcclxuICAgIGlmICghcHJpdmF0ZU1hcC5oYXMocmVjZWl2ZXIpKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImF0dGVtcHRlZCB0byBzZXQgcHJpdmF0ZSBmaWVsZCBvbiBub24taW5zdGFuY2VcIik7XHJcbiAgICB9XHJcbiAgICBwcml2YXRlTWFwLnNldChyZWNlaXZlciwgdmFsdWUpO1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG59XHJcbiIsImltcG9ydCB7IHJhbmRFbGVtLCByYW5kTXVsdEJldHdlZW4gfSBmcm9tICcuL3V0aWxpdGllcy5qcydcblxuY29uc3QgcGF0aFJvb3QgPSAnL2Rpc3QvJ1xuXG50eXBlIGluZGV4VmFscyA9ICcxMDAnIHwgJzIwMCcgfCAnMzAwJyB8ICc0MDAnIHwgJzUwMCdcblxuZXhwb3J0IGludGVyZmFjZSBUcmlhbmdsZXtcbiAgYjogbnVtYmVyLFxuICBzMTogbnVtYmVyLFxuICBzMjogbnVtYmVyLFxuICBoOiBudW1iZXJcbn1cblxuaW50ZXJmYWNlIGRhdGFTb3VyY2Uge1xuICByZWFkb25seSBsZW5ndGg6IG51bWJlcixcbiAgcmVhZG9ubHkgcGF0aDogc3RyaW5nLFxuICBzdGF0dXM6ICd1bmNhY2hlZCcgfCAnY2FjaGVkJyB8ICdwZW5kaW5nJyxcbiAgZGF0YTogVHJpYW5nbGVbXSxcbiAgcXVldWU6IHtcbiAgICBjYWxsYmFjazogKHQ6IFRyaWFuZ2xlKSA9PiB2b2lkLFxuICAgIG1heExlbmd0aDogbnVtYmVyLFxuICAgIGZpbHRlcj86ICh0OiBUcmlhbmdsZSkgPT4gYm9vbGVhblxuICB9W11cbn1cblxuXG5jb25zdCBkYXRhU291cmNlcyA6IFJlY29yZDxpbmRleFZhbHMsIGRhdGFTb3VyY2U+ID0ge1xuICAxMDA6IHtcbiAgICBsZW5ndGg6IDM2MSxcbiAgICBwYXRoOiAnL2RhdGEvdHJpYW5nbGVzMC0xMDAuanNvbicsXG4gICAgc3RhdHVzOiAndW5jYWNoZWQnLFxuICAgIGRhdGE6IFtdLFxuICAgIHF1ZXVlOiBbXVxuICB9LFxuICAyMDA6IHtcbiAgICBsZW5ndGg6IDcxNSxcbiAgICBwYXRoOiAnL2RhdGEvdHJpYW5nbGVzMTAwLTIwMC5qc29uJyxcbiAgICBzdGF0dXM6ICd1bmNhY2hlZCcsXG4gICAgZGF0YTogW10sXG4gICAgcXVldWU6IFtdXG4gIH0sXG4gIDMwMDoge1xuICAgIGxlbmd0aDogOTI3LFxuICAgIHBhdGg6ICcvZGF0YS90cmlhbmdsZXMyMDAtMzAwLmpzb24nLFxuICAgIHN0YXR1czogJ3VuY2FjaGVkJyxcbiAgICBkYXRhOiBbXSxcbiAgICBxdWV1ZTogW11cbiAgfSxcbiAgNDAwOiB7XG4gICAgbGVuZ3RoOiAxMDQzLFxuICAgIHBhdGg6ICcvZGF0YS90cmlhbmdsZXMzMDAtNDAwLmpzb24nLFxuICAgIHN0YXR1czogJ3VuY2FjaGVkJyxcbiAgICBkYXRhOiBbXSxcbiAgICBxdWV1ZTogW11cbiAgfSxcbiAgNTAwOiB7XG4gICAgbGVuZ3RoOiAxMTUxLFxuICAgIHBhdGg6ICcvZGF0YS90cmlhbmdsZXM0MDAtNTAwLmpzb24nLFxuICAgIHN0YXR1czogJ3VuY2FjaGVkJyxcbiAgICBkYXRhOiBbXSxcbiAgICBxdWV1ZTogW11cbiAgfVxufVxuXG4vKipcbiAqIFJldHVybiBhIHByb21pc2UgdG8gYSByYW5kb21seSBjaG9zZW4gdHJpYW5nbGUgKHNlZSB0cmlhbmdsZURhdGEuVHJpYW5nbGUgaW50ZXJmYWNlIGZvciBmb3JtYXQpXG4gKiBAcGFyYW0gbWF4TGVuZ3RoIE1heHVtdW0gbGVuZ3RoIG9mIHNpZGVcbiAqIEBwYXJhbSBmaWx0ZXJQcmVkaWNhdGUgUmVzdHJpY3QgdG8gdHJpYW5nbGVzIHdpdGggdGhpcyBwcm9wZXJ0eVxuICovXG5mdW5jdGlvbiBnZXRUcmlhbmdsZSAobWF4TGVuZ3RoOiBudW1iZXIsIGZpbHRlclByZWRpY2F0ZT86ICh0OiBUcmlhbmdsZSkgPT4gYm9vbGVhbikgOiBQcm9taXNlPFRyaWFuZ2xlPiB7XG4gIGxldCB0cmlhbmdsZTogVHJpYW5nbGVcbiAgZmlsdGVyUHJlZGljYXRlID0gZmlsdGVyUHJlZGljYXRlID8/ICh0ID0+IHRydWUpIC8vIGRlZmF1bHQgdmFsdWUgZm9yIHByZWRpY2F0ZSBpcyB0YXV0b2xvZ3lcblxuICAvLyBDaG9vc2UgbXVsdGlwbGUgb2YgNTAgdG8gc2VsZWN0IGZyb20gLSBzbW9vdGhzIG91dCBkaXN0cmlidXRpb24uXG4gIC8vIChPdGhlcndpc2UgaXQncyBiaWFzZWQgdG93YXJkcyBoaWdoZXIgbGVuZ3RocylcbiAgaWYgKG1heExlbmd0aCA+IDUwMCkgbWF4TGVuZ3RoID0gNTAwXG4gIGNvbnN0IGJpbjUwID0gcmFuZE11bHRCZXR3ZWVuKDAsIG1heExlbmd0aCAtIDEsIDUwKSArIDUwIC8vIGUuZy4gaWYgYmluNTAgPSAxNTAsIGNob29zZSB3aXRoIGEgbWF4bGVuZ3RoIGJldHdlZW4gMTAwIGFuZCAxNTBcbiAgY29uc3QgYmluMTAwID0gKE1hdGguY2VpbChiaW41MCAvIDEwMCkgKiAxMDApLnRvU3RyaW5nKCkgYXMgaW5kZXhWYWxzIC8vIGUuZy4gaWYgYmluNTAgPSAxNTAsIGJpbjEwMCA9IE1hdGguY2VpbCgxLjUpKjEwMCA9IDIwMFxuICBjb25zdCBkYXRhU291cmNlID0gZGF0YVNvdXJjZXNbYmluMTAwXVxuXG4gIGlmIChkYXRhU291cmNlLnN0YXR1cyA9PT0gJ2NhY2hlZCcpIHsgLy8gQ2FjaGVkIC0ganVzdCBsb2FkIGRhdGFcbiAgICBjb25zb2xlLmxvZygnVXNpbmcgY2FjaGVkIGRhdGEnKVxuICAgIHRyaWFuZ2xlID0gcmFuZEVsZW0oZGF0YVNvdXJjZS5kYXRhLmZpbHRlcih0ID0+IG1heFNpZGUodCkgPCBtYXhMZW5ndGggJiYgZmlsdGVyUHJlZGljYXRlISh0KSkpXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cmlhbmdsZSlcbiAgfVxuXG4gIGVsc2UgaWYgKGRhdGFTb3VyY2Uuc3RhdHVzID09PSAncGVuZGluZycpIHsgLy8gcGVuZGluZyAtIHB1dCBjYWxsYmFjayBpbnRvIHF1ZXVlXG4gICAgY29uc29sZS5sb2coJ1BlbmRpbmc6IGFkZGluZyByZXF1ZXN0IHRvIHF1ZXVlJylcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XG4gICAgICBkYXRhU291cmNlLnF1ZXVlLnB1c2goe2NhbGxiYWNrOiByZXNvbHZlLCBtYXhMZW5ndGg6IG1heExlbmd0aCwgZmlsdGVyOiBmaWx0ZXJQcmVkaWNhdGV9KVxuICAgIH0pXG4gIH1cbiAgXG4gIGVsc2UgeyAvLyBub2JvZHkgaGFzIGxvYWRlZCB5ZXRcbiAgICBjb25zb2xlLmxvZygnTG9hZGluZyBkYXRhIHdpdGggWEhSJylcbiAgICBkYXRhU291cmNlLnN0YXR1cyA9ICdwZW5kaW5nJ1xuICAgIHJldHVybiBmZXRjaChgJHtwYXRoUm9vdH0ke2RhdGFTb3VyY2UucGF0aH1gKS50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KHJlc3BvbnNlLnN0YXR1c1RleHQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8VHJpYW5nbGVbXT5cbiAgICAgIH1cbiAgICB9KS50aGVuKGRhdGEgPT4ge1xuICAgICAgZGF0YVNvdXJjZS5kYXRhID0gZGF0YVxuICAgICAgZGF0YVNvdXJjZS5zdGF0dXMgPSAnY2FjaGVkJ1xuICAgICAgZGF0YVNvdXJjZS5xdWV1ZS5mb3JFYWNoKCAoe2NhbGxiYWNrLG1heExlbmd0aCwgZmlsdGVyfSkgPT4ge1xuICAgICAgICBmaWx0ZXIgPSBmaWx0ZXIgPz8gKHQ9PnRydWUpXG4gICAgICAgIGNvbnN0IHRyaWFuZ2xlID0gcmFuZEVsZW0oZGF0YS5maWx0ZXIoKHQ6IFRyaWFuZ2xlKSA9PiBtYXhTaWRlKHQpIDwgbWF4TGVuZ3RoICYmIGZpbHRlciEodCkpKVxuICAgICAgICBjb25zb2xlLmxvZygnbG9hZGluZyBmcm9tIHF1ZXVlJylcbiAgICAgICAgY2FsbGJhY2sodHJpYW5nbGUpXG4gICAgICB9KVxuICAgICAgdHJpYW5nbGUgPSByYW5kRWxlbShkYXRhLmZpbHRlcigodDogVHJpYW5nbGUpID0+IG1heFNpZGUodCkgPCBtYXhMZW5ndGggJiYgZmlsdGVyUHJlZGljYXRlISh0KSkpXG4gICAgICByZXR1cm4gdHJpYW5nbGVcbiAgICB9KVxuICB9IFxufVxuXG5mdW5jdGlvbiBtYXhTaWRlICh0cmlhbmdsZTogVHJpYW5nbGUpIHtcbiAgcmV0dXJuIE1hdGgubWF4KHRyaWFuZ2xlLmIsIHRyaWFuZ2xlLnMxLCB0cmlhbmdsZS5zMilcbn1cblxuZXhwb3J0IHsgZ2V0VHJpYW5nbGUsIGRhdGFTb3VyY2VzIH1cbiIsImltcG9ydCB7IHJhbmRCZXR3ZWVuLCByYW5kRWxlbSwgc2NhbGVkU3RyIH0gZnJvbSAndXRpbGl0aWVzLmpzJyAvLyBjaGFuZ2UgcmVsYXRpdmUgcGF0aCBhZnRlciB0ZXN0aW5nXG5pbXBvcnQgeyBWYWx1ZSB9IGZyb20gJy4vUmVjdGFuZ2xlQXJlYURhdGEnXG5pbXBvcnQgeyBRdWVzdGlvbk9wdGlvbnMgfSBmcm9tICcuL3R5cGVzJ1xuaW1wb3J0ICogYXMgVEQgZnJvbSAndHJpYW5nbGVEYXRhLXF1ZXVlJ1xuaW1wb3J0IGZyYWN0aW9uIGZyb20gJ2ZyYWN0aW9uLmpzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUcmlhbmdsZUFyZWFEYXRhIHtcbiAgcmVhZG9ubHkgYmFzZTogVmFsdWVcbiAgcmVhZG9ubHkgc2lkZTE6IFZhbHVlXG4gIHJlYWRvbmx5IHNpZGUyOiBWYWx1ZVxuICByZWFkb25seSBoZWlnaHQ6IFZhbHVlXG4gIHByaXZhdGUgcmVhZG9ubHkgZHA6IG51bWJlclxuICBwcml2YXRlIHJlYWRvbmx5IGRlbm9taW5hdG9yOiBudW1iZXIgPSAxXG4gIHByaXZhdGUgX2FyZWE/OiBQYXJ0aWFsPFZhbHVlPlxuICBwcml2YXRlIF9wZXJpbWV0ZXI/OiBQYXJ0aWFsPFZhbHVlPlxuXG4gIGNvbnN0cnVjdG9yIChcbiAgICBiYXNlOiBWYWx1ZSxcbiAgICBzaWRlMTogVmFsdWUsXG4gICAgc2lkZTI6IFZhbHVlLFxuICAgIGhlaWdodDogVmFsdWUsXG4gICAgZHA6IG51bWJlcixcbiAgICBkZW5vbWluYXRvcjogbnVtYmVyLFxuICAgIGFyZWFQcm9wZXJ0aWVzPzogT21pdDxWYWx1ZSwgJ3ZhbCc+LFxuICAgIHBlcmltZXRlclByb3BlcnRpZXM/OiBPbWl0PFZhbHVlLCAndmFsJz4pIHtcbiAgICB0aGlzLmJhc2UgPSBiYXNlXG4gICAgdGhpcy5zaWRlMSA9IHNpZGUxXG4gICAgdGhpcy5zaWRlMiA9IHNpZGUyXG4gICAgdGhpcy5oZWlnaHQgPSBoZWlnaHRcbiAgICB0aGlzLmRwID0gZHBcbiAgICB0aGlzLmRlbm9taW5hdG9yID0gZGVub21pbmF0b3JcbiAgICB0aGlzLl9hcmVhID0gYXJlYVByb3BlcnRpZXNcbiAgICB0aGlzLl9wZXJpbWV0ZXIgPSBwZXJpbWV0ZXJQcm9wZXJ0aWVzXG4gIH1cblxuICBnZXQgcGVyaW1ldGVyICgpOiBWYWx1ZSB7XG4gICAgaWYgKCF0aGlzLl9wZXJpbWV0ZXIpIHsgLy8gZGVmYXVsdHMgZm9yIHByb3BlcnRpZXNcbiAgICAgIHRoaXMuX3BlcmltZXRlciA9IHtcbiAgICAgICAgc2hvdzogZmFsc2UsXG4gICAgICAgIG1pc3Npbmc6IHRydWVcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0aGlzLl9wZXJpbWV0ZXIudmFsKSB7XG4gICAgICB0aGlzLl9wZXJpbWV0ZXIudmFsID0gdGhpcy5iYXNlLnZhbCArIHRoaXMuc2lkZTEudmFsICsgdGhpcy5zaWRlMi52YWxcbiAgICAgIGlmICh0aGlzLmRlbm9taW5hdG9yID4gMSkge1xuICAgICAgICB0aGlzLl9wZXJpbWV0ZXIubGFiZWwgPSBuZXcgZnJhY3Rpb24odGhpcy5fcGVyaW1ldGVyLnZhbCwgdGhpcy5kZW5vbWluYXRvcikudG9MYXRleCh0cnVlKSArICdcXFxcbWF0aHJte2NtfSdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3BlcmltZXRlci5sYWJlbCA9IHNjYWxlZFN0cih0aGlzLl9wZXJpbWV0ZXIudmFsLCB0aGlzLmRwKSArICdcXFxcbWF0aHJte2NtfSdcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fcGVyaW1ldGVyIGFzIFZhbHVlXG4gIH1cblxuICBnZXQgYXJlYSAoKTogVmFsdWUge1xuICAgIGlmICghdGhpcy5fYXJlYSkge1xuICAgICAgdGhpcy5fYXJlYSA9IHtcbiAgICAgICAgc2hvdzogZmFsc2UsXG4gICAgICAgIG1pc3Npbmc6IHRydWVcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0aGlzLl9hcmVhLnZhbCkge1xuICAgICAgdGhpcy5fYXJlYS52YWwgPSB0aGlzLmJhc2UudmFsICogdGhpcy5oZWlnaHQudmFsIC8gMlxuICAgICAgaWYgKHRoaXMuZGVub21pbmF0b3IgPiAxKSB7XG4gICAgICAgIHRoaXMuX2FyZWEubGFiZWwgPSBuZXcgZnJhY3Rpb24odGhpcy5fYXJlYS52YWwsIHRoaXMuZGVub21pbmF0b3IqKjIpLnRvTGF0ZXgodHJ1ZSkgKyAnXFxcXG1hdGhybXtjbX1eMidcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2FyZWEubGFiZWwgPSBzY2FsZWRTdHIodGhpcy5fYXJlYS52YWwsIDIgKiB0aGlzLmRwKSArICdcXFxcbWF0aHJte2NtfV4yJ1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fYXJlYSBhcyBWYWx1ZVxuICB9XG5cbiAgaXNSaWdodEFuZ2xlZCAoKTogYm9vbGVhbiB7XG4gICAgY29uc3QgdHJpYW5nbGU6IFRELlRyaWFuZ2xlID0ge1xuICAgICAgYjogdGhpcy5iYXNlLnZhbCxcbiAgICAgIGg6IHRoaXMuaGVpZ2h0LnZhbCxcbiAgICAgIHMxOiB0aGlzLnNpZGUxLnZhbCxcbiAgICAgIHMyOiB0aGlzLnNpZGUyLnZhbFxuICAgIH1cbiAgICByZXR1cm4gaXNSaWdodEFuZ2xlZCh0cmlhbmdsZSlcbiAgfVxuXG4gIHN0YXRpYyBhc3luYyByYW5kb20gKG9wdGlvbnM6IFF1ZXN0aW9uT3B0aW9ucyk6IFByb21pc2U8VHJpYW5nbGVBcmVhRGF0YT4ge1xuICAgIG9wdGlvbnMubWF4TGVuZ3RoID0gb3B0aW9ucy5tYXhMZW5ndGggfHwgMjBcbiAgICBjb25zdCBkcCA9IG9wdGlvbnMuZHAgfHwgMFxuICAgIGNvbnN0IGRlbm9taW5hdG9yID0gb3B0aW9ucy5mcmFjdGlvbj8gcmFuZEJldHdlZW4oMiw2KSA6IDFcbiAgICBjb25zdCByZXF1aXJlSXNvc2NlbGVzID0gKG9wdGlvbnMucXVlc3Rpb25UeXBlID09PSAncHl0aGFnb3Jhc0lzb3NjZWxlc0FyZWEnKVxuICAgIGNvbnN0IHJlcXVpcmVSaWdodEFuZ2xlID0gKG9wdGlvbnMucXVlc3Rpb25UeXBlID09PSAncHl0aGFnb3Jhc0FyZWEnIHx8IG9wdGlvbnMucXVlc3Rpb25UeXBlID09PSAncHl0aGFnb3Jhc1BlcmltZXRlcicpXG5cbiAgICAvLyBnZXQgYSB0cmlhbmdsZS4gVEQuZ2V0VHJpYW5nbGUgaXMgYXN5bmMsIHNvIG5lZWQgdG8gYXdhaXRcbiAgICBjb25zdCB0cmlhbmdsZTogVEQuVHJpYW5nbGUgPVxuICAgICAgYXdhaXQgVEQuZ2V0VHJpYW5nbGUob3B0aW9ucy5tYXhMZW5ndGgsIHQgPT5cbiAgICAgICAgKCFyZXF1aXJlSXNvc2NlbGVzIHx8IGlzSXNvc2NlbGVzKHQpKSAmJlxuICAgICAgICAgICghcmVxdWlyZVJpZ2h0QW5nbGUgfHwgaXNSaWdodEFuZ2xlZCh0KSlcbiAgICAgIClcblxuICAgIC8vIHVzZWZ1bCBmb3Igc29tZSBsb2dpYyBuZXh0XG4gICAgLy8gbmIgb25seSByZWZlcnMgdG8gUkEgdHJpYW5nbGVzIHdoZXIgdGhlIGh5cG90ZW51c2UgaXMgbm90IHRoZSAnYmFzZSdcbiAgICBjb25zdCByaWdodEFuZ2xlZCA9IGlzUmlnaHRBbmdsZWQodHJpYW5nbGUpXG5cbiAgICBjb25zdCBiYXNlIDogVmFsdWUgPSB7IHZhbDogdHJpYW5nbGUuYiwgc2hvdzogdHJ1ZSwgbWlzc2luZzogZmFsc2UgfVxuICAgIGNvbnN0IGhlaWdodCA6IFZhbHVlID0geyB2YWw6IHRyaWFuZ2xlLmgsIHNob3c6ICFyaWdodEFuZ2xlZCwgbWlzc2luZzogZmFsc2UgfSAvLyBoaWRlIGhlaWdodCBpbiBSQSB0cmlhbmdsZXNcbiAgICBjb25zdCBzaWRlMSA6IFZhbHVlID0geyB2YWw6IHRyaWFuZ2xlLnMxLCBzaG93OiB0cnVlLCBtaXNzaW5nOiBmYWxzZSB9XG4gICAgY29uc3Qgc2lkZTIgOiBWYWx1ZSA9IHsgdmFsOiB0cmlhbmdsZS5zMiwgc2hvdzogdHJ1ZSwgbWlzc2luZzogZmFsc2UgfTtcbiAgICBbYmFzZSwgaGVpZ2h0LCBzaWRlMSwgc2lkZTJdLmZvckVhY2godiA9PiB7XG4gICAgICBpZiAoZGVub21pbmF0b3IgPT09IDEpIHtcbiAgICAgICAgdi5sYWJlbCA9IHNjYWxlZFN0cih2LnZhbCwgZHApICsgJ1xcXFxtYXRocm17Y219J1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdi5sYWJlbCA9IG5ldyBmcmFjdGlvbih2LnZhbCxkZW5vbWluYXRvcikudG9MYXRleCh0cnVlKSArIFwiXFxcXG1hdGhybXtjbX1cIlxuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBTb21lIGFsaWFzZXMgdXNlZnVsIHdoZW4gcmVhc29uaW5nIGFib3V0IFJBIHRyaWFuZ2xlc1xuICAgIC8vIE5CIChhKSB0aGVzZSBhcmUgcmVmcyB0byBzYW1lIG9iamVjdCwgbm90IGNvcGllc1xuICAgIC8vIChiKSBub3QgdmVyeSBtZWFuaW5nZnVsIGZvciBub24gUkEgdHJpYW5nbGVzXG4gICAgY29uc3QgbGVnMSA9IGJhc2VcbiAgICBjb25zdCBsZWcyID0gKHNpZGUxLnZhbCA+IHNpZGUyLnZhbCkgPyBzaWRlMiA6IHNpZGUxXG4gICAgY29uc3QgaHlwb3RlbnVzZSA9IChzaWRlMS52YWwgPiBzaWRlMi52YWwpID8gc2lkZTEgOiBzaWRlMlxuXG4gICAgY29uc3QgYXJlYVByb3BlcnRpZXMgPSB7IHNob3c6IGZhbHNlLCBtaXNzaW5nOiB0cnVlIH1cbiAgICBjb25zdCBwZXJpbWV0ZXJQcm9wZXJ0aWVzID0geyBzaG93OiBmYWxzZSwgbWlzc2luZzogdHJ1ZSB9XG5cbiAgICAvLyBzaG93L2hpZGUgYmFzZWQgb24gdHlwZVxuICAgIHN3aXRjaCAob3B0aW9ucy5xdWVzdGlvblR5cGUpIHtcbiAgICAgIGNhc2UgJ2FyZWEnOlxuICAgICAgICBhcmVhUHJvcGVydGllcy5zaG93ID0gdHJ1ZVxuICAgICAgICBhcmVhUHJvcGVydGllcy5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAncGVyaW1ldGVyJzpcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5zaG93ID0gdHJ1ZVxuICAgICAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdyZXZlcnNlQXJlYSc6IHtcbiAgICAgICAgYXJlYVByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgYXJlYVByb3BlcnRpZXMubWlzc2luZyA9IGZhbHNlXG4gICAgICAgIGNvbnN0IGNvaW5Ub3NzID0gKE1hdGgucmFuZG9tKCkgPCAwLjUpIC8vIDUwLzUwIHRydWUvZmFsc2VcbiAgICAgICAgaWYgKHJpZ2h0QW5nbGVkKSB7IC8vIGhpZGUgb25lIG9mIHRoZSBsZWdzXG4gICAgICAgICAgaWYgKGNvaW5Ub3NzKSBsZWcxLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgICAgZWxzZSBsZWcyLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGNvaW5Ub3NzKSBiYXNlLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgICAgZWxzZSBoZWlnaHQubWlzc2luZyA9IHRydWVcbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAncmV2ZXJzZVBlcmltZXRlcic6IHtcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5zaG93ID0gdHJ1ZVxuICAgICAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzLm1pc3NpbmcgPSBmYWxzZVxuICAgICAgICByYW5kRWxlbShbYmFzZSwgc2lkZTEsIHNpZGUyXSkubWlzc2luZyA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3B5dGhhZ29yYXNBcmVhJzpcbiAgICAgICAgaWYgKCFyaWdodEFuZ2xlZCkgdGhyb3cgbmV3IEVycm9yKCdTaG91bGQgaGF2ZSBSQSB0cmlhbmdsZSBoZXJlJylcbiAgICAgICAgYXJlYVByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgYXJlYVByb3BlcnRpZXMubWlzc2luZyA9IHRydWVcbiAgICAgICAgcmFuZEVsZW0oW2xlZzEsIGxlZzJdKS5zaG93ID0gZmFsc2VcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3B5dGhhZ29yYXNQZXJpbWV0ZXInOiB7IC8vIHNob3VsZCBhbHJlYWR5IGhhdmUgUkEgdHJpYW5nbGVcbiAgICAgICAgaWYgKCFyaWdodEFuZ2xlZCkgdGhyb3cgbmV3IEVycm9yKCdTaG91bGQgaGF2ZSBSQSB0cmlhbmdsZSBoZXJlJylcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5zaG93ID0gdHJ1ZVxuICAgICAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIHJhbmRFbGVtKFtsZWcxLCBsZWcyLCBoeXBvdGVudXNlXSkuc2hvdyA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdweXRoYWdvcmFzSXNvc2NlbGVzQXJlYSc6XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBhcmVhUHJvcGVydGllcy5zaG93ID0gdHJ1ZVxuICAgICAgICBhcmVhUHJvcGVydGllcy5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBoZWlnaHQuc2hvdyA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgfVxuICAgIHJldHVybiBuZXcgVHJpYW5nbGVBcmVhRGF0YShiYXNlLCBzaWRlMSwgc2lkZTIsIGhlaWdodCwgZHAsIGRlbm9taW5hdG9yLCBhcmVhUHJvcGVydGllcywgcGVyaW1ldGVyUHJvcGVydGllcylcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0lzb3NjZWxlcyAodHJpYW5nbGU6IFRELlRyaWFuZ2xlKTogYm9vbGVhbiB7XG4gIHJldHVybiB0cmlhbmdsZS5zMSA9PT0gdHJpYW5nbGUuczJcbn1cblxuZnVuY3Rpb24gaXNSaWdodEFuZ2xlZCAodHJpYW5nbGU6IFRELlRyaWFuZ2xlKTogYm9vbGVhbiB7XG4gIHJldHVybiB0cmlhbmdsZS5zMSA9PT0gdHJpYW5nbGUuaCB8fCB0cmlhbmdsZS5zMiA9PT0gdHJpYW5nbGUuaFxufVxuIiwiaW1wb3J0IHsgYXJyb3dMaW5lLCBkcmF3UmlnaHRBbmdsZSB9IGZyb20gJ2RyYXdpbmcnXG5pbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBjb3VsZFN0YXJ0VHJpdmlhLCByZXNvbHZlVHJpcGxlc2xhc2hSZWZlcmVuY2UgfSBmcm9tICd0eXBlc2NyaXB0J1xuaW1wb3J0IHsgY3JlYXRlRWxlbSwgcmFuZEVsZW0sIHJlcGVsRWxlbWVudHMgfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUVZpZXcsIExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuL3R5cGVzJ1xuaW1wb3J0IHsgVmFsdWUgfSBmcm9tICcuL1JlY3RhbmdsZUFyZWFEYXRhJ1xuaW1wb3J0IFRyaWFuZ2xlQXJlYURhdGEgZnJvbSAnLi9UcmlhbmdsZUFyZWFEYXRhJ1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRyaWFuZ2xlQXJlYVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICBBPzogUG9pbnQgLy8gR2VuZXJhdGVkIGxhemlseSBvbiByZW5kZXJcbiAgQj86IFBvaW50XG4gIEM/OiBQb2ludFxuICBodD86IFBvaW50IC8vIGludGVyc2VjdGlvbiBvZiBoZWlnaHQgd2l0aCBiYXNlXG4gIG92ZXJoYW5nTGVmdD86IGJvb2xlYW5cbiAgb3ZlcmhhbmdSaWdodD86IGJvb2xlYW5cbiAgZGF0YSE6IFRyaWFuZ2xlQXJlYURhdGEgfCBQcm9taXNlPFRyaWFuZ2xlQXJlYURhdGE+XG4gIC8vIGxhYmVsczogTGFiZWxbXVxuICAvLyByb3RhdGlvbj86IG51bWJlclxuICBjb25zdHJ1Y3RvciAoZGF0YTogVHJpYW5nbGVBcmVhRGF0YSB8IFByb21pc2U8VHJpYW5nbGVBcmVhRGF0YT4sIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucywgQT86IFBvaW50LCBCPzogUG9pbnQsIEM/OlBvaW50LCBsYWJlbHM/OiBMYWJlbFtdKSB7XG4gICAgc3VwZXIoZGF0YSwgdmlld09wdGlvbnMpXG4gICAgdGhpcy5BID0gQVxuICAgIHRoaXMuQiA9IEJcbiAgICB0aGlzLkMgPSBDXG4gICAgdGhpcy5sYWJlbHMgPSBsYWJlbHMgPz8gW11cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW5kZXIgaW50byB0aGlzLmNhbnZhc1xuICAgKi9cbiAgYXN5bmMgcmVuZGVyICgpIHtcbiAgICAvLyBjcmVhdGUgbG9hZGluZyBpbWFnZVxuICAgIGNvbnN0IGxvYWRlciA9IGNyZWF0ZUVsZW0oJ2RpdicsICdsb2FkZXInLCB0aGlzLkRPTSlcbiAgICAvLyBmaXJzdCBpbml0IGlmIG5vdCBhbHJlYWR5XG4gICAgaWYgKHRoaXMuQSA9PT0gdW5kZWZpbmVkKSBhd2FpdCB0aGlzLmluaXQoKVxuXG4gICAgaWYgKCF0aGlzLkEgfHwgIXRoaXMuQiB8fCAhdGhpcy5DIHx8ICF0aGlzLmh0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludGlhbGlzYXRpb24gZmFpbGVkLiBQb2ludHMgYXJlOiAke1t0aGlzLkEsIHRoaXMuQiwgdGhpcy5DLCB0aGlzLmh0XX1gKVxuICAgIH1cbiAgICBpZiAodGhpcy5kYXRhIGluc3RhbmNlb2YgUHJvbWlzZSkgdGhyb3cgbmV3IEVycm9yKCdJbml0aWFsaXNhdGlvbiBmYWlsZWQ6IGRhdGEgaXMgc3RpbGwgYSBQcm9taXNlJylcblxuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICBpZiAoY3R4ID09PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBnZXQgY2FudmFzIGNvbnRleHQnKVxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcbiAgICBjdHguc2V0TGluZURhc2goW10pXG4gICAgLy8gZHJhdyB0cmlhbmdsZVxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGN0eC5tb3ZlVG8odGhpcy5BLngsIHRoaXMuQS55KVxuICAgIGN0eC5saW5lVG8odGhpcy5CLngsIHRoaXMuQi55KVxuICAgIGN0eC5saW5lVG8odGhpcy5DLngsIHRoaXMuQy55KVxuICAgIGN0eC5saW5lVG8odGhpcy5BLngsIHRoaXMuQS55KVxuICAgIGN0eC5zdHJva2UoKVxuICAgIGN0eC5maWxsU3R5bGUgPSByYW5kRWxlbShjb2xvcnMpXG4gICAgY3R4LmZpbGwoKVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgLy8gZHJhdyBoZWlnaHRcbiAgICBpZiAodGhpcy5kYXRhLmhlaWdodC5zaG93KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIC8vIGFycm93TGluZShjdHgsdGhpcy5DLHRoaXMuaHQsMTApO1xuICAgICAgYXJyb3dMaW5lKGN0eCxcbiAgICAgICAgUG9pbnQubWVhbih0aGlzLkMsIHRoaXMuaHQpLm1vdmVUb3dhcmQodGhpcy5DLCAxNSksXG4gICAgICAgIHRoaXMuQywgMTBcbiAgICAgIClcbiAgICAgIGFycm93TGluZShjdHgsXG4gICAgICAgIFBvaW50Lm1lYW4odGhpcy5DLCB0aGlzLmh0KS5tb3ZlVG93YXJkKHRoaXMuaHQsIDE1KSxcbiAgICAgICAgdGhpcy5odCwgMTBcbiAgICAgIClcbiAgICAgIGN0eC5zdHJva2UoKVxuICAgICAgY3R4LmNsb3NlUGF0aCgpXG4gICAgfVxuXG4gICAgLy8gcmlnaHQtYW5nbGUgc3ltYm9sXG4gICAgaWYgKHRoaXMuZGF0YS5pc1JpZ2h0QW5nbGVkKCkgfHwgdGhpcy5kYXRhLmhlaWdodC5zaG93KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIGlmICh0aGlzLkEuZXF1YWxzKHRoaXMuaHQpKSB7XG4gICAgICAgIGRyYXdSaWdodEFuZ2xlKGN0eCwgdGhpcy5CLCB0aGlzLmh0LCB0aGlzLkMsIDE1KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZHJhd1JpZ2h0QW5nbGUoY3R4LCB0aGlzLkEsIHRoaXMuaHQsIHRoaXMuQywgMTUpXG4gICAgICB9XG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIGN0eC5jbG9zZVBhdGgoKVxuICAgIH1cblxuICAgIGlmICh0aGlzLmRhdGEuaGVpZ2h0LnNob3cgJiYgdGhpcy5vdmVyaGFuZ1JpZ2h0KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIGN0eC5zZXRMaW5lRGFzaChbNSwgM10pXG4gICAgICBjdHgubW92ZVRvKHRoaXMuQi54LCB0aGlzLkIueSlcbiAgICAgIGN0eC5saW5lVG8odGhpcy5odC54LCB0aGlzLmh0LnkpXG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIGN0eC5jbG9zZVBhdGgoKVxuICAgIH1cbiAgICBpZiAodGhpcy5kYXRhLmhlaWdodC5zaG93ICYmIHRoaXMub3ZlcmhhbmdMZWZ0KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIGN0eC5zZXRMaW5lRGFzaChbNSwgM10pXG4gICAgICBjdHgubW92ZVRvKHRoaXMuQS54LCB0aGlzLkEueSlcbiAgICAgIGN0eC5saW5lVG8odGhpcy5odC54LCB0aGlzLmh0LnkpXG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIGN0eC5jbG9zZVBhdGgoKVxuICAgIH1cblxuICAgIHRoaXMucmVuZGVyTGFiZWxzKGZhbHNlLHRydWUpXG4gICAgbG9hZGVyLnJlbW92ZSgpXG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGlzZS4gSW5zdGFuY2UgbWV0aG9kIHJhdGhlciB0aGFuIHN0YXRpYyBmYWN0b3J5IG1ldGhvZCwgc28gaW5zdGFuY2UgY2FuIGNvbnRyb2wsIGUuZy4gbG9hZGluZyBpY29uXG4gICAqIGFzeW5jIHNpbmNlIGRhdGEgaXMgYSBwcm9taXNlXG4gICAqL1xuICBhc3luYyBpbml0ICgpIDogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5kYXRhID0gYXdhaXQgdGhpcy5kYXRhXG4gICAgY29uc3QgaCA9IHRoaXMuZGF0YS5oZWlnaHQudmFsXG4gICAgY29uc3QgYiA9IHRoaXMuZGF0YS5iYXNlLnZhbFxuICAgIGNvbnN0IHMxID0gdGhpcy5kYXRhLnNpZGUxLnZhbFxuICAgIGNvbnN0IHMyID0gdGhpcy5kYXRhLnNpZGUyLnZhbFxuXG4gICAgLy8gYnVpbGQgdXBzaWRlIGRvd25cbiAgICB0aGlzLkEgPSBuZXcgUG9pbnQoMCwgaClcbiAgICB0aGlzLkIgPSBuZXcgUG9pbnQoYiwgaClcbiAgICB0aGlzLkMgPSBuZXcgUG9pbnQoKGIgKiBiICsgczEgKiBzMSAtIHMyICogczIpIC8gKDIgKiBiKSwgMClcbiAgICB0aGlzLmh0ID0gbmV3IFBvaW50KHRoaXMuQy54LCB0aGlzLkEueSlcblxuICAgIHRoaXMub3ZlcmhhbmdSaWdodCA9IGZhbHNlXG4gICAgdGhpcy5vdmVyaGFuZ0xlZnQgPSBmYWxzZVxuICAgIGlmICh0aGlzLkMueCA+IHRoaXMuQi54KSB7IHRoaXMub3ZlcmhhbmdSaWdodCA9IHRydWUgfVxuICAgIGlmICh0aGlzLkMueCA8IHRoaXMuQS54KSB7IHRoaXMub3ZlcmhhbmdMZWZ0ID0gdHJ1ZSB9XG5cbiAgICAvLyByb3RhdGUsIHNjYWxlIGFuZCBjZW50ZXJcbiAgICB0aGlzLnJvdGF0aW9uID0gdGhpcy5yb3RhdGlvbiA/PyAyICogTWF0aC5QSSAqIE1hdGgucmFuZG9tKClcbiAgICA7W3RoaXMuQSwgdGhpcy5CLCB0aGlzLkMsIHRoaXMuaHRdLmZvckVhY2gocHQgPT4gcHQucm90YXRlKHRoaXMucm90YXRpb24hKSlcbiAgICBQb2ludC5zY2FsZVRvRml0KFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DLCB0aGlzLmh0XSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQsIDgwKVxuXG4gICAgLy8gTWFraW5nIGxhYmVscyAtIG1vcmUgaW52b2x2ZWQgdGhhbiBJIHJlbWVtYmVyZWQhXG4gICAgLy8gRmlyc3QgdGhlIGxhYmVscyBmb3IgdGhlIHNpZGVzXG4gICAgY29uc3Qgc2lkZXMgOiBbUG9pbnQsIFBvaW50LCBWYWx1ZV1bXSA9IFsgLy8gWzFzdCBwb2ludCwgMm5kIHBvaW50LCBkYXRhXVxuICAgICAgW3RoaXMuQSwgdGhpcy5CLCB0aGlzLmRhdGEuYmFzZV0sXG4gICAgICBbdGhpcy5DLCB0aGlzLkEsIHRoaXMuZGF0YS5zaWRlMV0sXG4gICAgICBbdGhpcy5CLCB0aGlzLkMsIHRoaXMuZGF0YS5zaWRlMl1cbiAgICBdXG5cbiAgICAvLyBvcmRlciBvZiBwdXR0aW5nIGluIGhlaWdodCBtYXR0ZXJzIGZvciBvZmZzZXRcbiAgICAvLyBUaGlzIGJyZWFrcyBpZiB3ZSBoYXZlIHJvdW5kaW5nIGVycm9yc1xuICAgIGlmICh0aGlzLmh0LmVxdWFscyh0aGlzLkIpKSB7IC8vXG4gICAgICBzaWRlcy5wdXNoKFt0aGlzLmh0LCB0aGlzLkMsIHRoaXMuZGF0YS5oZWlnaHRdKVxuICAgIH0gZWxzZSB7XG4gICAgICBzaWRlcy5wdXNoKFt0aGlzLkMsIHRoaXMuaHQsIHRoaXMuZGF0YS5oZWlnaHRdKVxuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgaSsrKSB7IC8vIHNpZGVzXG4gICAgICBpZiAoIXNpZGVzW2ldWzJdLnNob3cpIGNvbnRpbnVlXG4gICAgICBjb25zdCBvZmZzZXQgPSAyMCAvLyBvZmZzZXQgZnJvbSBsaW5lIGJ5IHRoaXMgbWFueSBwaXhlbHNcbiAgICAgIGNvbnN0IHBvcyA9IFBvaW50Lm1lYW4oc2lkZXNbaV1bMF0sIHNpZGVzW2ldWzFdKSAvLyBzdGFydCBhdCBtaWRwb2ludFxuICAgICAgY29uc3QgdW5pdHZlYyA9IFBvaW50LnVuaXRWZWN0b3Ioc2lkZXNbaV1bMF0sIHNpZGVzW2ldWzFdKVxuXG4gICAgICBpZiAoaSA8IDMgKSB7IHBvcy50cmFuc2xhdGUoLXVuaXR2ZWMueSAqIG9mZnNldCwgdW5pdHZlYy54ICogb2Zmc2V0KSB9XG5cbiAgICAgIGNvbnN0IHRleHRhIDogc3RyaW5nID0gc2lkZXNbaV1bMl0ubGFiZWwgPz8gc2lkZXNbaV1bMl0udmFsLnRvU3RyaW5nKClcbiAgICAgIGNvbnN0IHRleHRxID0gc2lkZXNbaV1bMl0ubWlzc2luZyA/ICc/JyA6IHRleHRhXG4gICAgICBjb25zdCBzdHlsZXEgPSBpPT09MyA/ICdub3JtYWwgcmVwZWwtbG9ja2VkJyA6ICdub3JtYWwnXG4gICAgICBjb25zdCBzdHlsZWEgPSBzaWRlc1tpXVsyXS5taXNzaW5nID8gJ2Fuc3dlcicgOiAnbm9ybWFsJ1xuXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKHtcbiAgICAgICAgcG9zOiBwb3MsXG4gICAgICAgIHRleHRhOiB0ZXh0YSxcbiAgICAgICAgdGV4dHE6IHRleHRxLFxuICAgICAgICB0ZXh0OiB0ZXh0cSxcbiAgICAgICAgc3R5bGVhOiBzdHlsZWEsXG4gICAgICAgIHN0eWxlcTogc3R5bGVxLFxuICAgICAgICBzdHlsZTogc3R5bGVxXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vIGFyZWEgYW5kIHBlcmltZXRlclxuICAgIGxldCBuSW5mbyA9IDBcbiAgICBpZiAodGhpcy5kYXRhLmFyZWEuc2hvdykge1xuICAgICAgY29uc3QgdGV4dGEgOiBzdHJpbmcgPSB0aGlzLmRhdGEuYXJlYS5sYWJlbCA/PyB0aGlzLmRhdGEuYXJlYS52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSB0aGlzLmRhdGEuYXJlYS5taXNzaW5nID8gJz8nIDogdGV4dGFcbiAgICAgIGNvbnN0IHN0eWxlcSA9ICdleHRyYS1pbmZvJ1xuICAgICAgY29uc3Qgc3R5bGVhID0gdGhpcy5kYXRhLmFyZWEubWlzc2luZyA/ICdleHRyYS1hbnN3ZXInIDogJ2V4dHJhLWluZm8nXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKFxuICAgICAgICB7XG4gICAgICAgICAgdGV4dGE6ICdcXFxcdGV4dHtBcmVhfSA9ICcgKyB0ZXh0YSxcbiAgICAgICAgICB0ZXh0cTogJ1xcXFx0ZXh0e0FyZWF9ID0gJyArIHRleHRxLFxuICAgICAgICAgIHRleHQ6ICdcXFxcdGV4dHtBcmVhfSA9ICcgKyB0ZXh0cSxcbiAgICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgICBzdHlsZTogc3R5bGVxLFxuICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwIC0gMTUgKiBuSW5mbylcbiAgICAgICAgfVxuICAgICAgKVxuICAgICAgbkluZm8rK1xuICAgIH1cbiAgICBpZiAodGhpcy5kYXRhLnBlcmltZXRlci5zaG93KSB7XG4gICAgICBjb25zdCB0ZXh0YSA9IHRoaXMuZGF0YS5wZXJpbWV0ZXIubGFiZWwgPz8gdGhpcy5kYXRhLnBlcmltZXRlci52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSB0aGlzLmRhdGEucGVyaW1ldGVyLm1pc3NpbmcgPyAnPycgOiB0ZXh0YVxuICAgICAgY29uc3Qgc3R5bGVxID0gJ2V4dHJhLWluZm8nXG4gICAgICBjb25zdCBzdHlsZWEgPSB0aGlzLmRhdGEucGVyaW1ldGVyLm1pc3NpbmcgPyAnZXh0cmEtYW5zd2VyJyA6ICdleHRyYS1pbmZvJ1xuICAgICAgdGhpcy5sYWJlbHMucHVzaChcbiAgICAgICAge1xuICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwIC0gMjAgKiBuSW5mbyksXG4gICAgICAgICAgdGV4dGE6ICdcXFxcdGV4dHtQZXJpbWV0ZXJ9ID0gJyArIHRleHRhLFxuICAgICAgICAgIHRleHRxOiAnXFxcXHRleHR7UGVyaW1ldGVyfSA9ICcgKyB0ZXh0cSxcbiAgICAgICAgICB0ZXh0OiAnXFxcXHRleHR7UGVyaW1ldGVyfSA9ICcgKyB0ZXh0cSxcbiAgICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgICBzdHlsZTogc3R5bGVxXG4gICAgICAgIH1cbiAgICAgIClcbiAgICB9XG5cbiAgICAvLyBzdG9wIHRoZW0gZnJvbSBjbGFzaGluZyAtIGhtbSwgbm90IHN1cmVcbiAgICAvKlxuICAgIHRoaXMuc3VjY2Vzcz10cnVlO1xuICAgIGZvciAobGV0IGkgPSAwLCBuPXRoaXMubGFiZWxzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBpOyBqKyspIHtcbiAgICAgICAgY29uc3QgbDE9dGhpcy5sYWJlbHNbaV0sIGwyPXRoaXMubGFiZWxzW2pdO1xuICAgICAgICBjb25zdCBkID0gUG9pbnQuZGlzdGFuY2UobDEucG9zLGwyLnBvcyk7XG4gICAgICAgIC8vY29uc29sZS5sb2coYGQoJyR7bDEudGV4dH0nLCcke2wyLnRleHR9JykgPSAke2R9YCk7XG4gICAgICAgIGlmIChkIDwgMjApIHtcbiAgICAgICAgICAvL2NvbnNvbGUubG9nKFwidG9vIGNsb3NlXCIpO1xuICAgICAgICAgIHRoaXMuc3VjY2Vzcz1mYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gKi9cbiAgfVxuXG4gIHN0YXRpYyBmcm9tQXN5bmNEYXRhIChkYXRhOiBQcm9taXNlPFRyaWFuZ2xlQXJlYURhdGE+LCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlld09wdGlvbnMpXG4gIH1cbn1cbiIsImltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgVHJpYW5nbGVBcmVhRGF0YSBmcm9tICcuL1RyaWFuZ2xlQXJlYURhdGEnXG5pbXBvcnQgVHJpYW5nbGVBcmVhVmlldyBmcm9tICcuL1RyaWFuZ2xlQXJlYVZpZXcnXG5pbXBvcnQgeyBRdWVzdGlvbk9wdGlvbnMgfSBmcm9tICcuL3R5cGVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUcmlhbmdsZUFyZWFRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhITogVHJpYW5nbGVBcmVhRGF0YSB8IFByb21pc2U8VHJpYW5nbGVBcmVhRGF0YT4gLy8gaW5pdGlhbGlzZWQgaW4gc3VwZXIoKVxuICB2aWV3ITogVHJpYW5nbGVBcmVhVmlld1xuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgY29uc3QgZGF0YSA9IFRyaWFuZ2xlQXJlYURhdGEucmFuZG9tKG9wdGlvbnMpXG4gICAgY29uc3QgdmlldyA9IFRyaWFuZ2xlQXJlYVZpZXcuZnJvbUFzeW5jRGF0YShkYXRhLCB2aWV3T3B0aW9ucylcbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZXMnXG4gIH1cbn1cbiIsImltcG9ydCB7IE9wdGlvbnNTcGVjIH0gZnJvbSAnT3B0aW9uc1NwZWMnXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5pbXBvcnQgeyByYW5kRWxlbSB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCB7IEdyYXBoaWNRLCBHcmFwaGljUVZpZXcgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCBSZWN0YW5nbGVBcmVhUSBmcm9tICcuL1JlY3RhbmdsZUFyZWFRJ1xuaW1wb3J0IFRyaWFuZ2xlQXJlYVEgZnJvbSAnLi9UcmlhbmdsZUFyZWFRJ1xuaW1wb3J0IHsgV3JhcHBlck9wdGlvbnMsIFNoYXBlLCBRdWVzdGlvblR5cGVTaW1wbGUsIFF1ZXN0aW9uT3B0aW9ucywgUXVlc3Rpb25UeXBlIH0gZnJvbSAnLi90eXBlcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXJlYVBlcmltZXRlclEgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIHF1ZXN0aW9uOiBHcmFwaGljUSAvLyBtYWtlIG1vcmUgcHJlY2lzZSB3aXRoIHVuaW9uIG9mIGFjdHVhbCB0eXBlc1xuICAvLyBET006IEhUTUxFbGVtZW50ICAvLyBpbiBiYXNlIGNsYXNzXG4gIC8vIGFuc3dlcmVkOiBib29sZWFuIC8vIGluIGJhc2UgY2xhc3NcbiAgY29uc3RydWN0b3IgKHF1ZXN0aW9uOiBHcmFwaGljUSkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLnF1ZXN0aW9uID0gcXVlc3Rpb25cbiAgICB0aGlzLkRPTSA9IHF1ZXN0aW9uLkRPTVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogV3JhcHBlck9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMuY3VzdG9tKSB7XG4gICAgICBjb25zdCBzaGFwZSA9IHJhbmRFbGVtKG9wdGlvbnMuc2hhcGVzKVxuICAgICAgcmV0dXJuIHRoaXMucmFuZG9tRnJvbURpZmZpY3VsdHkob3B0aW9ucy5kaWZmaWN1bHR5LCBzaGFwZSwgb3B0aW9ucy5xdWVzdGlvblR5cGVzU2ltcGxlKVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIHJhbmRvbUZyb21EaWZmaWN1bHR5IChkaWZmaWN1bHR5OiBudW1iZXIsIHNoYXBlOiBTaGFwZSwgcXVlc3Rpb25UeXBlczogUXVlc3Rpb25UeXBlU2ltcGxlW10pOiBBcmVhUGVyaW1ldGVyUSB7XG4gICAgLyoqIERpZmZpY3VsdHkgZ3VpZGVcbiAgICAgKiAgMSAtIEZvcndhcmQsIG5vIGRpc3RyYWN0b3JzLCBzbWFsbCBpbnRlZ2Vyc1xuICAgICAqICAyIC0gRm9yd2FyZCwgZGlzdHJhY3RvcnMsIHNtYWxsIGludGVnZXJzXG4gICAgICogIDMgLSBGb3J3YXJkLCBkaXN0cmFjdG9ycywgbGFyZ2VyIGludGVnZXJzXG4gICAgICogIDQgLSBGb3J3YXJkLCBkaXN0cmFjdG9ycywgZGVjaW1hbHMgYW5kIGZyYWN0aW9uc1xuICAgICAqICA1IC0gRm9yd2FyZCwgZGlzdHJhY3RvcnMsIGRlY2ltYWxzIGFuZCBmcmFjdGlvbnMgLSBsYXJnZXJcbiAgICAgKiAgNiAtIFJldmVyc2Ugc21hbGwgaW50ZWdlcnNcbiAgICAgKiAgNyAtIFJldmVyc2UgbGFyZ2UgaW50ZWdlcnNcbiAgICAgKiAgOCAtIFJldmVyc2UgZGVjaW1hbHMgYW5kIGZyYWN0aW9uc1xuICAgICAqICA5IC0gUmV2ZXJzZSBkZWNpbWFscyBhbmQgZnJhY3Rpb25zIC0gbGFyZ2VyXG4gICAgICogMTAgLSBQeXRoYWdvcmFzXG4gICAgKi9cbiAgICBjb25zdCBxdWVzdGlvbk9wdGlvbnM6IFF1ZXN0aW9uT3B0aW9ucyA9IHtcbiAgICAgIHF1ZXN0aW9uVHlwZTogcmFuZEVsZW0ocXVlc3Rpb25UeXBlcyksXG4gICAgICBkcDogMCxcbiAgICAgIG5vRGlzdHJhY3RvcnM6IHRydWUsXG4gICAgICBtYXhMZW5ndGg6IDIwXG4gICAgfVxuICAgIGNvbnN0IHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucyA9IHt9XG5cbiAgICBzd2l0Y2ggKGRpZmZpY3VsdHkpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5ub0Rpc3RyYWN0b3JzID0gZmFsc2VcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm5vRGlzdHJhY3RvcnMgPSBmYWxzZVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TGVuZ3RoID0gMTAwXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ6IC8vIFRPRE86IGZyYWN0aW9uXG4gICAgICAgIGlmIChNYXRoLnJhbmRvbSgpPDAuNSkgeyAgLy8gZGVjaW1hbFxuICAgICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5kcCA9IDFcbiAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TGVuZ3RoID0gOTlcbiAgICAgICAgfSBlbHNlIHsgLy8gZnJhY3Rpb25cbiAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZnJhY3Rpb24gPSB0cnVlXG4gICAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heExlbmd0aCA9IDE1XG4gICAgICAgIH1cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm5vRGlzdHJhY3RvcnMgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA1OlxuICAgICAgICBpZiAoTWF0aC5yYW5kb20oKTwwLjUpIHsgIC8vIGRlY2ltYWxcbiAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZHAgPSAxXG4gICAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heExlbmd0aCA9IDUwMFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5mcmFjdGlvbiA9IHRydWVcbiAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TGVuZ3RoID0gMTAwXG4gICAgICAgIH1cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm5vRGlzdHJhY3RvcnMgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA2OlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZHAgPSAwXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5ub0Rpc3RyYWN0b3JzID0gZmFsc2VcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnF1ZXN0aW9uVHlwZSA9IHJhbmRFbGVtKHF1ZXN0aW9uVHlwZXMubWFwKHQ9PnJldmVyc2lmeSh0KSkpXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhMZW5ndGggPSAyMFxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA3OlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZHAgPSAwXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5ub0Rpc3RyYWN0b3JzID0gZmFsc2VcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnF1ZXN0aW9uVHlwZSA9IHJhbmRFbGVtKHF1ZXN0aW9uVHlwZXMubWFwKHQ9PnJldmVyc2lmeSh0KSkpXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhMZW5ndGggPSA5OVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA4OlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZHAgPSAxXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5ub0Rpc3RyYWN0b3JzID0gZmFsc2VcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnF1ZXN0aW9uVHlwZSA9IHJhbmRFbGVtKHF1ZXN0aW9uVHlwZXMubWFwKHQ9PnJldmVyc2lmeSh0KSkpXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhMZW5ndGggPSA5OVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA5OlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZHAgPSAxXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5ub0Rpc3RyYWN0b3JzID0gZmFsc2VcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnF1ZXN0aW9uVHlwZSA9IHJhbmRFbGVtKHF1ZXN0aW9uVHlwZXMubWFwKHQ9PnJldmVyc2lmeSh0KSkpXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhMZW5ndGggPSA1MDBcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMTA6XG4gICAgICBkZWZhdWx0OiAvLyBUT0RPIGZpeCB0aGlzXG4gICAgICAgIHNoYXBlID0gJ3RyaWFuZ2xlJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMucXVlc3Rpb25UeXBlID0gJ3B5dGhhZ29yYXNBcmVhJ1xuICAgICAgICBicmVha1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJhbmRvbVdpdGhPcHRpb25zKHNoYXBlLHF1ZXN0aW9uT3B0aW9ucyx2aWV3T3B0aW9ucylcbiAgfVxuXG4gIHN0YXRpYyByYW5kb21XaXRoT3B0aW9ucyAoc2hhcGU6IFNoYXBlLCBvcHRpb25zOiBRdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucyk6IEFyZWFQZXJpbWV0ZXJRIHtcbiAgICBsZXQgcXVlc3Rpb246IEdyYXBoaWNRXG4gICAgc3dpdGNoKHNoYXBlKSB7XG4gICAgICBjYXNlICdyZWN0YW5nbGUnOlxuICAgICAgICBxdWVzdGlvbiA9IFJlY3RhbmdsZUFyZWFRLnJhbmRvbShvcHRpb25zLHZpZXdPcHRpb25zKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAndHJpYW5nbGUnOlxuICAgICAgICBxdWVzdGlvbiA9IFRyaWFuZ2xlQXJlYVEucmFuZG9tKG9wdGlvbnMsdmlld09wdGlvbnMpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdwYXJhbGxlbG9ncmFtJzpcbiAgICAgIGNhc2UgJ3RyYXBleml1bSc6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm90IHlldCBpbXBsZW1lbnRlZCcpXG4gICAgfVxuICAgIHJldHVybiBuZXcgdGhpcyhxdWVzdGlvbilcbiAgfVxuXG4gIC8qIFdyYXBzIHRoZSBtZXRob2RzIG9mIHRoZSB3cmFwcGVkIHF1ZXN0aW9uICovXG4gIHJlbmRlciAoKTogdm9pZCB7IHRoaXMucXVlc3Rpb24ucmVuZGVyKCkgfVxuICBzaG93QW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24uc2hvd0Fuc3dlcigpIH1cbiAgaGlkZUFuc3dlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLmhpZGVBbnN3ZXIoKSB9XG4gIHRvZ2dsZUFuc3dlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLnRvZ2dsZUFuc3dlcigpIH1cblxuICBzdGF0aWMgZ2V0IG9wdGlvbnNTcGVjICgpIDogT3B0aW9uc1NwZWMge1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnc2hhcGVzJyxcbiAgICAgICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgICAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICAgICAgeyBpZDogJ3JlY3RhbmdsZScsIHRpdGxlOiAnUmVjdGFuZ2xlJyB9LFxuICAgICAgICAgIHsgaWQ6ICd0cmlhbmdsZScsIHRpdGxlOiAnVHJpYW5nbGUnIH1cbiAgICAgICAgXSxcbiAgICAgICAgZGVmYXVsdDogWydyZWN0YW5nbGUnXSxcbiAgICAgICAgdGl0bGU6ICdTaGFwZXMnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogJ3F1ZXN0aW9uVHlwZXNTaW1wbGUnLFxuICAgICAgICB0eXBlOiAnc2VsZWN0LWluY2x1c2l2ZScsXG4gICAgICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgICAgICB7IGlkOiAnYXJlYScsIHRpdGxlOiAnQXJlYScgfSxcbiAgICAgICAgICB7IGlkOiAncGVyaW1ldGVyJywgdGl0bGU6ICdQZXJpbWV0ZXInIH1cbiAgICAgICAgXSxcbiAgICAgICAgZGVmYXVsdDogWydhcmVhJywgJ3BlcmltZXRlciddLFxuICAgICAgICB0aXRsZTogJ1R5cGUgb2YgcXVlc3Rpb24nXG4gICAgICB9XG4gICAgXVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSA6IHN0cmluZyB7XG4gICAgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJ1xuICB9XG59XG5cbi8qKlxuICogUHJlcGVuZCAncmV2ZXJzZScgdG8gdGhlIGJlZ2lubmluZyBvZiBhIHN0cmluZyB0aGVuIGNhbWVsIGNhc2UgaXRcbiAqIGUuZy4gcmV2ZXJzaWZ5KCdhcmVhJykgPT09ICdyZXZlcnNlQXJlYSdcbiAqIEBwYXJhbSBzdHIgQSBzdHJpbmdcbiAqIEBwYXJhbSBwcmVmaXggVGhlIHByZWZpeCB0byB1c2VcbiAqL1xuZnVuY3Rpb24gcmV2ZXJzaWZ5KHN0cjogUXVlc3Rpb25UeXBlU2ltcGxlLCBwcmVmaXg6ICdyZXZlcnNlJyB8ICdweXRoYWdvcmFzJyA9ICdyZXZlcnNlJykgOiBRdWVzdGlvblR5cGUge1xuICByZXR1cm4gcHJlZml4ICsgc3RyWzBdLnRvVXBwZXJDYXNlKCkgKyBzdHIuc2xpY2UoMSkgYXMgUXVlc3Rpb25UeXBlXG59IiwiaW1wb3J0IEFsZ2VicmFpY0ZyYWN0aW9uUSBmcm9tICdRdWVzdGlvbi9UZXh0US9BbGdlYnJhaWNGcmFjdGlvblEnXG5pbXBvcnQgSW50ZWdlckFkZFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvSW50ZWdlckFkZCdcbmltcG9ydCBBcml0aG1hZ29uUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9Bcml0aG1hZ29uUSdcbmltcG9ydCBUZXN0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXN0USdcbmltcG9ydCBBZGRBWmVybyBmcm9tICdRdWVzdGlvbi9UZXh0US9BZGRBWmVybydcbmltcG9ydCBFcXVhdGlvbk9mTGluZSBmcm9tICdRdWVzdGlvbi9UZXh0US9FcXVhdGlvbk9mTGluZSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNXcmFwcGVyJ1xuaW1wb3J0IEFyZWFQZXJpbWV0ZXJRIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvQXJlYVdyYXBwZXInXG5cbmltcG9ydCBPcHRpb25zU2V0IGZyb20gJ09wdGlvbnNTZXQnXG5cbmNvbnN0IHRvcGljTGlzdCA9IFtcbiAge1xuICAgIGlkOiAnYWxnZWJyYWljLWZyYWN0aW9uJyxcbiAgICB0aXRsZTogJ1NpbXBsaWZ5IGFsZ2VicmFpYyBmcmFjdGlvbnMnLFxuICAgIGNsYXNzOiBBbGdlYnJhaWNGcmFjdGlvblFcbiAgfSxcbiAge1xuICAgIGlkOiAnYWRkLWEtemVybycsXG4gICAgdGl0bGU6ICdNdWx0aXBseSBieSAxMCAoaG9uZXN0ISknLFxuICAgIGNsYXNzOiBBZGRBWmVyb1xuICB9LFxuICB7XG4gICAgaWQ6ICdpbnRlZ2VyLWFkZCcsXG4gICAgdGl0bGU6ICdBZGQgaW50ZWdlcnMgKHYgc2ltcGxlKScsXG4gICAgY2xhc3M6IEludGVnZXJBZGRRXG4gIH0sXG4gIHtcbiAgICBpZDogJ21pc3NpbmctYW5nbGVzJyxcbiAgICB0aXRsZTogJ01pc3NpbmcgYW5nbGVzJyxcbiAgICBjbGFzczogTWlzc2luZ0FuZ2xlc1FcbiAgfSxcbiAge1xuICAgIGlkOiAnYXJlYS1wZXJpbXRlcicsXG4gICAgdGl0bGU6ICdBcmVhIGFuZCBwZXJpbWV0ZXIgb2Ygc2hhcGVzJyxcbiAgICBjbGFzczogQXJlYVBlcmltZXRlclFcbiAgfSxcbiAge1xuICAgIGlkOiAnZXF1YXRpb24tb2YtbGluZScsXG4gICAgdGl0bGU6ICdFcXVhdGlvbiBvZiBhIGxpbmUgKGZyb20gdHdvIHBvaW50cyknLFxuICAgIGNsYXNzOiBFcXVhdGlvbk9mTGluZVxuICB9LFxuICB7XG4gICAgaWQ6ICdhcml0aG1hZ29uLWFkZCcsXG4gICAgdGl0bGU6ICdBcml0aG1hZ29ucycsXG4gICAgY2xhc3M6IEFyaXRobWFnb25RXG4gIH0sXG4gIHtcbiAgICBpZDogJ3Rlc3QnLFxuICAgIHRpdGxlOiAnVGVzdCBxdWVzdGlvbnMnLFxuICAgIGNsYXNzOiBUZXN0UVxuICB9XG5dXG5cbmZ1bmN0aW9uIGdldENsYXNzIChpZCkge1xuICAvLyBSZXR1cm4gdGhlIGNsYXNzIGdpdmVuIGFuIGlkIG9mIGEgcXVlc3Rpb25cblxuICAvLyBPYnZpb3VzbHkgdGhpcyBpcyBhbiBpbmVmZmljaWVudCBzZWFyY2gsIGJ1dCB3ZSBkb24ndCBuZWVkIG1hc3NpdmUgcGVyZm9ybWFuY2VcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b3BpY0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodG9waWNMaXN0W2ldLmlkID09PSBpZCkge1xuICAgICAgcmV0dXJuIHRvcGljTGlzdFtpXS5jbGFzc1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsXG59XG5cbmZ1bmN0aW9uIGdldFRpdGxlIChpZCkge1xuICAvLyBSZXR1cm4gdGl0bGUgb2YgYSBnaXZlbiBpZFxuICAvL1xuICByZXR1cm4gdG9waWNMaXN0LmZpbmQodCA9PiAodC5pZCA9PT0gaWQpKS50aXRsZVxufVxuXG4vKipcbiAqIEdldHMgY29tbWFuZCB3b3JkIGZyb20gYSB0b3BpYyBpZFxuICogQHBhcmFtIHtzdHJpbmd9IGlkIFRoZSB0b3BpYyBpZFxuICogQHJldHVybnMge3N0cmluZ30gQ29tbWFuZCB3b3JkLiBSZXR1cm5zIFwiXCIgaWYgbm8gdG9waWMgd2l0aCBpZFxuICovXG5mdW5jdGlvbiBnZXRDb21tYW5kV29yZCAoaWQpIHtcbiAgY29uc3QgdG9waWNDbGFzcyA9IGdldENsYXNzKGlkKVxuICBpZiAodG9waWNDbGFzcyA9PT0gbnVsbCkge1xuICAgIHJldHVybiAnJ1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBnZXRDbGFzcyhpZCkuY29tbWFuZFdvcmRcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRUb3BpY3MgKCkge1xuICAvLyByZXR1cm5zIHRvcGljcyB3aXRoIGNsYXNzZXMgc3RyaXBwZWQgb3V0XG4gIHJldHVybiB0b3BpY0xpc3QubWFwKHggPT4gKHsgaWQ6IHguaWQsIHRpdGxlOiB4LnRpdGxlIH0pKVxufVxuXG5mdW5jdGlvbiBuZXdRdWVzdGlvbiAoaWQsIG9wdGlvbnMpIHtcbiAgLy8gdG8gYXZvaWQgd3JpdGluZyBgbGV0IHEgPSBuZXcgKFRvcGljQ2hvb3Nlci5nZXRDbGFzcyhpZCkpKG9wdGlvbnMpXG4gIGNvbnN0IFF1ZXN0aW9uQ2xhc3MgPSBnZXRDbGFzcyhpZClcbiAgbGV0IHF1ZXN0aW9uXG4gIGlmIChRdWVzdGlvbkNsYXNzLnJhbmRvbSkge1xuICAgIHF1ZXN0aW9uID0gUXVlc3Rpb25DbGFzcy5yYW5kb20ob3B0aW9ucylcbiAgfSBlbHNlIHtcbiAgICBxdWVzdGlvbiA9IG5ldyBRdWVzdGlvbkNsYXNzKG9wdGlvbnMpXG4gIH1cbiAgcmV0dXJuIHF1ZXN0aW9uXG59XG5cbmZ1bmN0aW9uIG5ld09wdGlvbnNTZXQgKGlkKSB7XG4gIGNvbnN0IG9wdGlvbnNTcGVjID0gKGdldENsYXNzKGlkKSkub3B0aW9uc1NwZWMgfHwgW11cbiAgcmV0dXJuIG5ldyBPcHRpb25zU2V0KG9wdGlvbnNTcGVjKVxufVxuXG5mdW5jdGlvbiBoYXNPcHRpb25zIChpZCkge1xuICByZXR1cm4gISEoZ2V0Q2xhc3MoaWQpLm9wdGlvbnNTcGVjICYmIGdldENsYXNzKGlkKS5vcHRpb25zU3BlYy5sZW5ndGggPiAwKSAvLyB3ZWlyZCBib29sIHR5cGNhc3Rpbmcgd29vIVxufVxuXG5leHBvcnQgeyB0b3BpY0xpc3QsIGdldENsYXNzLCBuZXdRdWVzdGlvbiwgZ2V0VG9waWNzLCBnZXRUaXRsZSwgbmV3T3B0aW9uc1NldCwgZ2V0Q29tbWFuZFdvcmQsIGhhc09wdGlvbnMgfVxuIiwiIWZ1bmN0aW9uKHQsbyl7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShvKTpcIm9iamVjdFwiPT10eXBlb2YgZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1vKCk6dC50aW5nbGU9bygpfSh0aGlzLGZ1bmN0aW9uKCl7dmFyIG89ITE7ZnVuY3Rpb24gdCh0KXt0aGlzLm9wdHM9ZnVuY3Rpb24oKXtmb3IodmFyIHQ9MTt0PGFyZ3VtZW50cy5sZW5ndGg7dCsrKWZvcih2YXIgbyBpbiBhcmd1bWVudHNbdF0pYXJndW1lbnRzW3RdLmhhc093blByb3BlcnR5KG8pJiYoYXJndW1lbnRzWzBdW29dPWFyZ3VtZW50c1t0XVtvXSk7cmV0dXJuIGFyZ3VtZW50c1swXX0oe30se29uQ2xvc2U6bnVsbCxvbk9wZW46bnVsbCxiZWZvcmVPcGVuOm51bGwsYmVmb3JlQ2xvc2U6bnVsbCxzdGlja3lGb290ZXI6ITEsZm9vdGVyOiExLGNzc0NsYXNzOltdLGNsb3NlTGFiZWw6XCJDbG9zZVwiLGNsb3NlTWV0aG9kczpbXCJvdmVybGF5XCIsXCJidXR0b25cIixcImVzY2FwZVwiXX0sdCksdGhpcy5pbml0KCl9ZnVuY3Rpb24gZSgpe3RoaXMubW9kYWxCb3hGb290ZXImJih0aGlzLm1vZGFsQm94Rm9vdGVyLnN0eWxlLndpZHRoPXRoaXMubW9kYWxCb3guY2xpZW50V2lkdGgrXCJweFwiLHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUubGVmdD10aGlzLm1vZGFsQm94Lm9mZnNldExlZnQrXCJweFwiKX1yZXR1cm4gdC5wcm90b3R5cGUuaW5pdD1mdW5jdGlvbigpe2lmKCF0aGlzLm1vZGFsKXJldHVybiBmdW5jdGlvbigpe3RoaXMubW9kYWw9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKSx0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoXCJ0aW5nbGUtbW9kYWxcIiksMCE9PXRoaXMub3B0cy5jbG9zZU1ldGhvZHMubGVuZ3RoJiYtMSE9PXRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZihcIm92ZXJsYXlcIil8fHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbC0tbm9PdmVybGF5Q2xvc2VcIik7dGhpcy5tb2RhbC5zdHlsZS5kaXNwbGF5PVwibm9uZVwiLHRoaXMub3B0cy5jc3NDbGFzcy5mb3JFYWNoKGZ1bmN0aW9uKHQpe1wic3RyaW5nXCI9PXR5cGVvZiB0JiZ0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQodCl9LHRoaXMpLC0xIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKFwiYnV0dG9uXCIpJiYodGhpcy5tb2RhbENsb3NlQnRuPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIiksdGhpcy5tb2RhbENsb3NlQnRuLnR5cGU9XCJidXR0b25cIix0aGlzLm1vZGFsQ2xvc2VCdG4uY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbF9fY2xvc2VcIiksdGhpcy5tb2RhbENsb3NlQnRuSWNvbj1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKSx0aGlzLm1vZGFsQ2xvc2VCdG5JY29uLmNsYXNzTGlzdC5hZGQoXCJ0aW5nbGUtbW9kYWxfX2Nsb3NlSWNvblwiKSx0aGlzLm1vZGFsQ2xvc2VCdG5JY29uLmlubmVySFRNTD0nPHN2ZyB2aWV3Qm94PVwiMCAwIDEwIDEwXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPjxwYXRoIGQ9XCJNLjMgOS43Yy4yLjIuNC4zLjcuMy4zIDAgLjUtLjEuNy0uM0w1IDYuNGwzLjMgMy4zYy4yLjIuNS4zLjcuMy4yIDAgLjUtLjEuNy0uMy40LS40LjQtMSAwLTEuNEw2LjQgNWwzLjMtMy4zYy40LS40LjQtMSAwLTEuNC0uNC0uNC0xLS40LTEuNCAwTDUgMy42IDEuNy4zQzEuMy0uMS43LS4xLjMuM2MtLjQuNC0uNCAxIDAgMS40TDMuNiA1IC4zIDguM2MtLjQuNC0uNCAxIDAgMS40elwiIGZpbGw9XCIjMDAwXCIgZmlsbC1ydWxlPVwibm9uemVyb1wiLz48L3N2Zz4nLHRoaXMubW9kYWxDbG9zZUJ0bkxhYmVsPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpLHRoaXMubW9kYWxDbG9zZUJ0bkxhYmVsLmNsYXNzTGlzdC5hZGQoXCJ0aW5nbGUtbW9kYWxfX2Nsb3NlTGFiZWxcIiksdGhpcy5tb2RhbENsb3NlQnRuTGFiZWwuaW5uZXJIVE1MPXRoaXMub3B0cy5jbG9zZUxhYmVsLHRoaXMubW9kYWxDbG9zZUJ0bi5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQ2xvc2VCdG5JY29uKSx0aGlzLm1vZGFsQ2xvc2VCdG4uYXBwZW5kQ2hpbGQodGhpcy5tb2RhbENsb3NlQnRuTGFiZWwpKTt0aGlzLm1vZGFsQm94PWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiksdGhpcy5tb2RhbEJveC5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsLWJveFwiKSx0aGlzLm1vZGFsQm94Q29udGVudD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpLHRoaXMubW9kYWxCb3hDb250ZW50LmNsYXNzTGlzdC5hZGQoXCJ0aW5nbGUtbW9kYWwtYm94X19jb250ZW50XCIpLHRoaXMubW9kYWxCb3guYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveENvbnRlbnQpLC0xIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKFwiYnV0dG9uXCIpJiZ0aGlzLm1vZGFsLmFwcGVuZENoaWxkKHRoaXMubW9kYWxDbG9zZUJ0bik7dGhpcy5tb2RhbC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94KX0uY2FsbCh0aGlzKSxmdW5jdGlvbigpe3RoaXMuX2V2ZW50cz17Y2xpY2tDbG9zZUJ0bjp0aGlzLmNsb3NlLmJpbmQodGhpcyksY2xpY2tPdmVybGF5OmZ1bmN0aW9uKHQpe3ZhciBvPXRoaXMubW9kYWwub2Zmc2V0V2lkdGgtdGhpcy5tb2RhbC5jbGllbnRXaWR0aCxlPXQuY2xpZW50WD49dGhpcy5tb2RhbC5vZmZzZXRXaWR0aC0xNSxzPXRoaXMubW9kYWwuc2Nyb2xsSGVpZ2h0IT09dGhpcy5tb2RhbC5vZmZzZXRIZWlnaHQ7aWYoXCJNYWNJbnRlbFwiPT09bmF2aWdhdG9yLnBsYXRmb3JtJiYwPT1vJiZlJiZzKXJldHVybjstMSE9PXRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZihcIm92ZXJsYXlcIikmJiFmdW5jdGlvbih0LG8pe2Zvcig7KHQ9dC5wYXJlbnRFbGVtZW50KSYmIXQuY2xhc3NMaXN0LmNvbnRhaW5zKG8pOyk7cmV0dXJuIHR9KHQudGFyZ2V0LFwidGluZ2xlLW1vZGFsXCIpJiZ0LmNsaWVudFg8dGhpcy5tb2RhbC5jbGllbnRXaWR0aCYmdGhpcy5jbG9zZSgpfS5iaW5kKHRoaXMpLHJlc2l6ZTp0aGlzLmNoZWNrT3ZlcmZsb3cuYmluZCh0aGlzKSxrZXlib2FyZE5hdjpmdW5jdGlvbih0KXstMSE9PXRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZihcImVzY2FwZVwiKSYmMjc9PT10LndoaWNoJiZ0aGlzLmlzT3BlbigpJiZ0aGlzLmNsb3NlKCl9LmJpbmQodGhpcyl9LC0xIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKFwiYnV0dG9uXCIpJiZ0aGlzLm1vZGFsQ2xvc2VCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsdGhpcy5fZXZlbnRzLmNsaWNrQ2xvc2VCdG4pO3RoaXMubW9kYWwuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLHRoaXMuX2V2ZW50cy5jbGlja092ZXJsYXkpLHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicmVzaXplXCIsdGhpcy5fZXZlbnRzLnJlc2l6ZSksZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIix0aGlzLl9ldmVudHMua2V5Ym9hcmROYXYpfS5jYWxsKHRoaXMpLGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbCxkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpLHRoaXMub3B0cy5mb290ZXImJnRoaXMuYWRkRm9vdGVyKCksdGhpc30sdC5wcm90b3R5cGUuX2J1c3k9ZnVuY3Rpb24odCl7bz10fSx0LnByb3RvdHlwZS5faXNCdXN5PWZ1bmN0aW9uKCl7cmV0dXJuIG99LHQucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXtudWxsIT09dGhpcy5tb2RhbCYmKHRoaXMuaXNPcGVuKCkmJnRoaXMuY2xvc2UoITApLGZ1bmN0aW9uKCl7LTEhPT10aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoXCJidXR0b25cIikmJnRoaXMubW9kYWxDbG9zZUJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKFwiY2xpY2tcIix0aGlzLl9ldmVudHMuY2xpY2tDbG9zZUJ0bik7dGhpcy5tb2RhbC5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsdGhpcy5fZXZlbnRzLmNsaWNrT3ZlcmxheSksd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIix0aGlzLl9ldmVudHMucmVzaXplKSxkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLHRoaXMuX2V2ZW50cy5rZXlib2FyZE5hdil9LmNhbGwodGhpcyksdGhpcy5tb2RhbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMubW9kYWwpLHRoaXMubW9kYWw9bnVsbCl9LHQucHJvdG90eXBlLmlzT3Blbj1mdW5jdGlvbigpe3JldHVybiEhdGhpcy5tb2RhbC5jbGFzc0xpc3QuY29udGFpbnMoXCJ0aW5nbGUtbW9kYWwtLXZpc2libGVcIil9LHQucHJvdG90eXBlLm9wZW49ZnVuY3Rpb24oKXtpZighdGhpcy5faXNCdXN5KCkpe3RoaXMuX2J1c3koITApO3ZhciB0PXRoaXM7cmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2YgdC5vcHRzLmJlZm9yZU9wZW4mJnQub3B0cy5iZWZvcmVPcGVuKCksdGhpcy5tb2RhbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eT90aGlzLm1vZGFsLnN0eWxlLnJlbW92ZVByb3BlcnR5KFwiZGlzcGxheVwiKTp0aGlzLm1vZGFsLnN0eWxlLnJlbW92ZUF0dHJpYnV0ZShcImRpc3BsYXlcIiksdGhpcy5fc2Nyb2xsUG9zaXRpb249d2luZG93LnBhZ2VZT2Zmc2V0LGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmFkZChcInRpbmdsZS1lbmFibGVkXCIpLGRvY3VtZW50LmJvZHkuc3R5bGUudG9wPS10aGlzLl9zY3JvbGxQb3NpdGlvbitcInB4XCIsdGhpcy5zZXRTdGlja3lGb290ZXIodGhpcy5vcHRzLnN0aWNreUZvb3RlciksdGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsLS12aXNpYmxlXCIpLFwiZnVuY3Rpb25cIj09dHlwZW9mIHQub3B0cy5vbk9wZW4mJnQub3B0cy5vbk9wZW4uY2FsbCh0KSx0Ll9idXN5KCExKSx0aGlzLmNoZWNrT3ZlcmZsb3coKSx0aGlzfX0sdC5wcm90b3R5cGUuY2xvc2U9ZnVuY3Rpb24odCl7aWYoIXRoaXMuX2lzQnVzeSgpKXtpZih0aGlzLl9idXN5KCEwKSwhMSxcImZ1bmN0aW9uXCI9PXR5cGVvZiB0aGlzLm9wdHMuYmVmb3JlQ2xvc2UpaWYoIXRoaXMub3B0cy5iZWZvcmVDbG9zZS5jYWxsKHRoaXMpKXJldHVybiB2b2lkIHRoaXMuX2J1c3koITEpO2RvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZShcInRpbmdsZS1lbmFibGVkXCIpLGRvY3VtZW50LmJvZHkuc3R5bGUudG9wPW51bGwsd2luZG93LnNjcm9sbFRvKHt0b3A6dGhpcy5fc2Nyb2xsUG9zaXRpb24sYmVoYXZpb3I6XCJpbnN0YW50XCJ9KSx0aGlzLm1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoXCJ0aW5nbGUtbW9kYWwtLXZpc2libGVcIik7dmFyIG89dGhpcztvLm1vZGFsLnN0eWxlLmRpc3BsYXk9XCJub25lXCIsXCJmdW5jdGlvblwiPT10eXBlb2Ygby5vcHRzLm9uQ2xvc2UmJm8ub3B0cy5vbkNsb3NlLmNhbGwodGhpcyksby5fYnVzeSghMSl9fSx0LnByb3RvdHlwZS5zZXRDb250ZW50PWZ1bmN0aW9uKHQpe3JldHVyblwic3RyaW5nXCI9PXR5cGVvZiB0P3RoaXMubW9kYWxCb3hDb250ZW50LmlubmVySFRNTD10Oih0aGlzLm1vZGFsQm94Q29udGVudC5pbm5lckhUTUw9XCJcIix0aGlzLm1vZGFsQm94Q29udGVudC5hcHBlbmRDaGlsZCh0KSksdGhpcy5pc09wZW4oKSYmdGhpcy5jaGVja092ZXJmbG93KCksdGhpc30sdC5wcm90b3R5cGUuZ2V0Q29udGVudD1mdW5jdGlvbigpe3JldHVybiB0aGlzLm1vZGFsQm94Q29udGVudH0sdC5wcm90b3R5cGUuYWRkRm9vdGVyPWZ1bmN0aW9uKCl7cmV0dXJuIGZ1bmN0aW9uKCl7dGhpcy5tb2RhbEJveEZvb3Rlcj1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpLHRoaXMubW9kYWxCb3hGb290ZXIuY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbC1ib3hfX2Zvb3RlclwiKSx0aGlzLm1vZGFsQm94LmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpfS5jYWxsKHRoaXMpLHRoaXN9LHQucHJvdG90eXBlLnNldEZvb3RlckNvbnRlbnQ9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMubW9kYWxCb3hGb290ZXIuaW5uZXJIVE1MPXQsdGhpc30sdC5wcm90b3R5cGUuZ2V0Rm9vdGVyQ29udGVudD1mdW5jdGlvbigpe3JldHVybiB0aGlzLm1vZGFsQm94Rm9vdGVyfSx0LnByb3RvdHlwZS5zZXRTdGlja3lGb290ZXI9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuaXNPdmVyZmxvdygpfHwodD0hMSksdD90aGlzLm1vZGFsQm94LmNvbnRhaW5zKHRoaXMubW9kYWxCb3hGb290ZXIpJiYodGhpcy5tb2RhbEJveC5yZW1vdmVDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKSx0aGlzLm1vZGFsLmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpLHRoaXMubW9kYWxCb3hGb290ZXIuY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbC1ib3hfX2Zvb3Rlci0tc3RpY2t5XCIpLGUuY2FsbCh0aGlzKSx0aGlzLm1vZGFsQm94Q29udGVudC5zdHlsZVtcInBhZGRpbmctYm90dG9tXCJdPXRoaXMubW9kYWxCb3hGb290ZXIuY2xpZW50SGVpZ2h0KzIwK1wicHhcIik6dGhpcy5tb2RhbEJveEZvb3RlciYmKHRoaXMubW9kYWxCb3guY29udGFpbnModGhpcy5tb2RhbEJveEZvb3Rlcil8fCh0aGlzLm1vZGFsLnJlbW92ZUNoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpLHRoaXMubW9kYWxCb3guYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlciksdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS53aWR0aD1cImF1dG9cIix0aGlzLm1vZGFsQm94Rm9vdGVyLnN0eWxlLmxlZnQ9XCJcIix0aGlzLm1vZGFsQm94Q29udGVudC5zdHlsZVtcInBhZGRpbmctYm90dG9tXCJdPVwiXCIsdGhpcy5tb2RhbEJveEZvb3Rlci5jbGFzc0xpc3QucmVtb3ZlKFwidGluZ2xlLW1vZGFsLWJveF9fZm9vdGVyLS1zdGlja3lcIikpKSx0aGlzfSx0LnByb3RvdHlwZS5hZGRGb290ZXJCdG49ZnVuY3Rpb24odCxvLGUpe3ZhciBzPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7cmV0dXJuIHMuaW5uZXJIVE1MPXQscy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIixlKSxcInN0cmluZ1wiPT10eXBlb2YgbyYmby5sZW5ndGgmJm8uc3BsaXQoXCIgXCIpLmZvckVhY2goZnVuY3Rpb24odCl7cy5jbGFzc0xpc3QuYWRkKHQpfSksdGhpcy5tb2RhbEJveEZvb3Rlci5hcHBlbmRDaGlsZChzKSxzfSx0LnByb3RvdHlwZS5yZXNpemU9ZnVuY3Rpb24oKXtjb25zb2xlLndhcm4oXCJSZXNpemUgaXMgZGVwcmVjYXRlZCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIHZlcnNpb24gMS4wXCIpfSx0LnByb3RvdHlwZS5pc092ZXJmbG93PWZ1bmN0aW9uKCl7cmV0dXJuIHdpbmRvdy5pbm5lckhlaWdodDw9dGhpcy5tb2RhbEJveC5jbGllbnRIZWlnaHR9LHQucHJvdG90eXBlLmNoZWNrT3ZlcmZsb3c9ZnVuY3Rpb24oKXt0aGlzLm1vZGFsLmNsYXNzTGlzdC5jb250YWlucyhcInRpbmdsZS1tb2RhbC0tdmlzaWJsZVwiKSYmKHRoaXMuaXNPdmVyZmxvdygpP3RoaXMubW9kYWwuY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbC0tb3ZlcmZsb3dcIik6dGhpcy5tb2RhbC5jbGFzc0xpc3QucmVtb3ZlKFwidGluZ2xlLW1vZGFsLS1vdmVyZmxvd1wiKSwhdGhpcy5pc092ZXJmbG93KCkmJnRoaXMub3B0cy5zdGlja3lGb290ZXI/dGhpcy5zZXRTdGlja3lGb290ZXIoITEpOnRoaXMuaXNPdmVyZmxvdygpJiZ0aGlzLm9wdHMuc3RpY2t5Rm9vdGVyJiYoZS5jYWxsKHRoaXMpLHRoaXMuc2V0U3RpY2t5Rm9vdGVyKCEwKSkpfSx7bW9kYWw6dH19KTsiLCJpbXBvcnQgUlNsaWRlciBmcm9tICd2ZW5kb3IvcnNsaWRlcidcbmltcG9ydCBPcHRpb25zU2V0IGZyb20gJ09wdGlvbnNTZXQnXG5pbXBvcnQgKiBhcyBUb3BpY0Nob29zZXIgZnJvbSAnVG9waWNDaG9vc2VyJ1xuaW1wb3J0IHsgbW9kYWwgYXMgVE1vZGFsIH0gZnJvbSAndGluZ2xlLmpzJ1xuaW1wb3J0IHsgcmFuZEVsZW0sIGNyZWF0ZUVsZW0sIGhhc0FuY2VzdG9yQ2xhc3MsIGJvb2xPYmplY3RUb0FycmF5IH0gZnJvbSAndXRpbGl0aWVzJ1xuaW1wb3J0IFF1ZXN0aW9uIGZyb20gJ1F1ZXN0aW9uL1F1ZXN0aW9uJ1xuaW1wb3J0IHsgT3B0aW9uc1NwZWMgfSBmcm9tICdPcHRpb25zU3BlYydcblxuZGVjbGFyZSBnbG9iYWwge1xuICBpbnRlcmZhY2UgV2luZG93IHtcbiAgICBTSE9XX0RJRkZJQ1VMVFk6IGJvb2xlYW5cbiAgfVxufVxud2luZG93LlNIT1dfRElGRklDVUxUWSA9IGZhbHNlIC8vIGZvciBkZWJ1Z2dpbmcgcXVlc3Rpb25zXG5cbi8qIFR5cGVzICovXG5pbnRlcmZhY2UgUXVlc3Rpb25JbmZvIHtcbiAgY29udGFpbmVyOiBIVE1MRWxlbWVudCxcbiAgcXVlc3Rpb24/OiBRdWVzdGlvbixcbiAgdG9waWNJZD86IHN0cmluZyxcbn1cblxuLy8gTWFrZSBhbiBvdmVybGF5IHRvIGNhcHR1cmUgYW55IGNsaWNrcyBvdXRzaWRlIGJveGVzLCBpZiBuZWNlc3NhcnlcbmNyZWF0ZUVsZW0oJ2RpdicsICdvdmVybGF5IGhpZGRlbicsIGRvY3VtZW50LmJvZHkpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgaGlkZUFsbEFjdGlvbnMpXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFF1ZXN0aW9uU2V0IHtcbiAgLy8gVGhlIG1haW4gcXVlc3Rpb25cbiAgcU51bWJlcjogbnVtYmVyXG4gIGFuc3dlcmVkOiBib29sZWFuXG4gIGNvbW1hbmRXb3JkOiBzdHJpbmdcbiAgdXNlQ29tbWFuZFdvcmQ6IGJvb2xlYW5cblxuICAvLyBxdWVzdGlvbnMgYW5kIHRoZWlyIG9wdGlvbnNcbiAgbjogbnVtYmVyIC8vIE51bWJlciBvZiBxdWVzdGlvbnNcbiAgcXVlc3Rpb25zOiBRdWVzdGlvbkluZm9bXSAvLyBsaXN0IG9mIHF1ZXN0aW9ucyBhbmQgdGhlIERPTSBlbGVtZW50IHRoZXkncmUgcmVuZGVyZWQgaW5cbiAgdG9waWNzT3B0aW9ucyE6IE9wdGlvbnNTZXQgLy8gT3B0aW9uc1NldCBvYmplY3QgZm9yIGNob29zaW5nIHRvcGljc1xuICB0b3BpY3NNb2RhbCE6IFRNb2RhbCAvLyBBIG1vZGFsIGRpYWxvZyBmb3IgZGlzcGxheWluZyB0b3BpY3NPcHRpb25zXG4gIHRvcGljczogc3RyaW5nW10gLy8gTGlzdCBvZiBzZWxlY3RlZCB0b3BpYyBJZHNcbiAgb3B0aW9uc1NldHM6IFJlY29yZDxzdHJpbmcsIE9wdGlvbnNTZXQ+IC8vIG1hcCBmcm9tIHRvcGljIGlkcyB0byB0aGVpciBvcHRpb25zIHNldFxuXG4gIC8vIFVJIGVsZW1lbnRzXG4gIHRvcGljQ2hvb3NlckJ1dHRvbiE6IEhUTUxFbGVtZW50IC8vIFRoZSBidXR0b24gdG8gb3BlbiB0aGUgdG9waWMgY2hvb3NlclxuICBkaWZmaWN1bHR5U2xpZGVyRWxlbWVudCE6IEhUTUxJbnB1dEVsZW1lbnRcbiAgZGlmZmljdWx0eVNsaWRlciE6IFJTbGlkZXJcbiAgZ2VuZXJhdGVCdXR0b24hOiBIVE1MQnV0dG9uRWxlbWVudFxuICBhbnN3ZXJCdXR0b24hOiBIVE1MRWxlbWVudFxuXG4gIC8vIERPTSBlbGVtZW50cyAtIGluaXRpYWxpc2VkIGluIF9idWlsZCgpLCBjYWxsZWQgZnJvbSBjb25zdHJ1Y3RvclxuICBoZWFkZXJCb3ghOiBIVE1MRWxlbWVudFxuICBvdXRlckJveCE6IEhUTUxFbGVtZW50XG4gIGRpc3BsYXlCb3ghOiBIVE1MRWxlbWVudFxuXG4gIGNvbnN0cnVjdG9yIChxTnVtYmVyOiBudW1iZXIpIHtcbiAgICB0aGlzLnF1ZXN0aW9ucyA9IFtdIC8vIGxpc3Qgb2YgcXVlc3Rpb25zIGFuZCB0aGUgRE9NIGVsZW1lbnQgdGhleSdyZSByZW5kZXJlZCBpblxuICAgIHRoaXMudG9waWNzID0gW10gLy8gbGlzdCBvZiB0b3BpY3Mgd2hpY2ggaGF2ZSBiZWVuIHNlbGVjdGVkIGZvciB0aGlzIHNldFxuICAgIHRoaXMub3B0aW9uc1NldHMgPSB7fSAvLyBsaXN0IG9mIE9wdGlvbnNTZXQgb2JqZWN0cyBjYXJyeWluZyBvcHRpb25zIGZvciB0b3BpY3Mgd2l0aCBvcHRpb25zXG4gICAgdGhpcy5xTnVtYmVyID0gcU51bWJlciB8fCAxIC8vIFF1ZXN0aW9uIG51bWJlciAocGFzc2VkIGluIGJ5IGNhbGxlciwgd2hpY2ggd2lsbCBrZWVwIGNvdW50KVxuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZSAvLyBXaGV0aGVyIGFuc3dlcmVkIG9yIG5vdFxuICAgIHRoaXMuY29tbWFuZFdvcmQgPSAnJyAvLyBTb21ldGhpbmcgbGlrZSAnc2ltcGxpZnknXG4gICAgdGhpcy51c2VDb21tYW5kV29yZCA9IHRydWUgLy8gVXNlIHRoZSBjb21tYW5kIHdvcmQgaW4gdGhlIG1haW4gcXVlc3Rpb24sIGZhbHNlIGdpdmUgY29tbWFuZCB3b3JkIHdpdGggZWFjaCBzdWJxdWVzdGlvblxuICAgIHRoaXMubiA9IDggLy8gTnVtYmVyIG9mIHF1ZXN0aW9uc1xuXG4gICAgdGhpcy5fYnVpbGQoKVxuICB9XG5cbiAgX2J1aWxkICgpIHtcbiAgICB0aGlzLm91dGVyQm94ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLW91dGVyYm94JylcbiAgICB0aGlzLmhlYWRlckJveCA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1oZWFkZXJib3gnLCB0aGlzLm91dGVyQm94KVxuICAgIHRoaXMuZGlzcGxheUJveCA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1kaXNwbGF5Ym94JywgdGhpcy5vdXRlckJveClcblxuICAgIHRoaXMuX2J1aWxkT3B0aW9uc0JveCgpXG5cbiAgICB0aGlzLl9idWlsZFRvcGljQ2hvb3NlcigpXG4gIH1cblxuICBfYnVpbGRPcHRpb25zQm94ICgpIHtcbiAgICBjb25zdCB0b3BpY1NwYW4gPSBjcmVhdGVFbGVtKCdzcGFuJywgdW5kZWZpbmVkLCB0aGlzLmhlYWRlckJveClcbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCAndG9waWMtY2hvb3NlciBidXR0b24nLCB0b3BpY1NwYW4pXG4gICAgdGhpcy50b3BpY0Nob29zZXJCdXR0b24uaW5uZXJIVE1MID0gJ0Nob29zZSB0b3BpYydcbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuY2hvb3NlVG9waWNzKCkpXG5cbiAgICBjb25zdCBkaWZmaWN1bHR5U3BhbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCB1bmRlZmluZWQsIHRoaXMuaGVhZGVyQm94KVxuICAgIGRpZmZpY3VsdHlTcGFuLmFwcGVuZCgnRGlmZmljdWx0eTogJylcbiAgICBjb25zdCBkaWZmaWN1bHR5U2xpZGVyT3V0ZXIgPSBjcmVhdGVFbGVtKCdzcGFuJywgJ3NsaWRlci1vdXRlcicsIGRpZmZpY3VsdHlTcGFuKVxuICAgIHRoaXMuZGlmZmljdWx0eVNsaWRlckVsZW1lbnQgPSBjcmVhdGVFbGVtKCdpbnB1dCcsIHVuZGVmaW5lZCwgZGlmZmljdWx0eVNsaWRlck91dGVyKSBhcyBIVE1MSW5wdXRFbGVtZW50XG5cbiAgICBjb25zdCBuU3BhbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCB1bmRlZmluZWQsIHRoaXMuaGVhZGVyQm94KVxuICAgIG5TcGFuLmFwcGVuZCgnTnVtYmVyIG9mIHF1ZXN0aW9uczogJylcbiAgICBjb25zdCBuUXVlc3Rpb25zSW5wdXQgPSBjcmVhdGVFbGVtKCdpbnB1dCcsICduLXF1ZXN0aW9ucycsIG5TcGFuKSBhcyBIVE1MSW5wdXRFbGVtZW50XG4gICAgblF1ZXN0aW9uc0lucHV0LnR5cGUgPSAnbnVtYmVyJ1xuICAgIG5RdWVzdGlvbnNJbnB1dC5taW4gPSAnMSdcbiAgICBuUXVlc3Rpb25zSW5wdXQudmFsdWUgPSAnOCdcbiAgICBuUXVlc3Rpb25zSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgdGhpcy5uID0gcGFyc2VJbnQoblF1ZXN0aW9uc0lucHV0LnZhbHVlKVxuICAgIH0pXG5cbiAgICB0aGlzLmdlbmVyYXRlQnV0dG9uID0gY3JlYXRlRWxlbSgnYnV0dG9uJywgJ2dlbmVyYXRlLWJ1dHRvbiBidXR0b24nLCB0aGlzLmhlYWRlckJveCkgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcbiAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmRpc2FibGVkID0gdHJ1ZVxuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uaW5uZXJIVE1MID0gJ0dlbmVyYXRlISdcbiAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5nZW5lcmF0ZUFsbCgpKVxuICB9XG5cbiAgX2luaXRTbGlkZXIgKCkge1xuICAgIHRoaXMuZGlmZmljdWx0eVNsaWRlciA9IG5ldyBSU2xpZGVyKHtcbiAgICAgIHRhcmdldDogdGhpcy5kaWZmaWN1bHR5U2xpZGVyRWxlbWVudCxcbiAgICAgIHZhbHVlczogeyBtaW46IDEsIG1heDogMTAgfSxcbiAgICAgIHJhbmdlOiB0cnVlLFxuICAgICAgc2V0OiBbMiwgNl0sXG4gICAgICBzdGVwOiAxLFxuICAgICAgdG9vbHRpcDogZmFsc2UsXG4gICAgICBzY2FsZTogdHJ1ZSxcbiAgICAgIGxhYmVsczogdHJ1ZVxuICAgIH0pXG4gIH1cblxuICBfYnVpbGRUb3BpY0Nob29zZXIgKCkge1xuICAgIC8vIGJ1aWxkIGFuIE9wdGlvbnNTZXQgb2JqZWN0IGZvciB0aGUgdG9waWNzXG4gICAgY29uc3QgdG9waWNzID0gVG9waWNDaG9vc2VyLmdldFRvcGljcygpXG4gICAgY29uc3Qgb3B0aW9uc1NwZWM6IE9wdGlvbnNTcGVjID0gW11cbiAgICB0b3BpY3MuZm9yRWFjaCh0b3BpYyA9PiB7XG4gICAgICBvcHRpb25zU3BlYy5wdXNoKHtcbiAgICAgICAgdGl0bGU6IHRvcGljLnRpdGxlLFxuICAgICAgICBpZDogdG9waWMuaWQsXG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICAgIHN3YXBMYWJlbDogdHJ1ZVxuICAgICAgfSlcbiAgICB9KVxuICAgIHRoaXMudG9waWNzT3B0aW9ucyA9IG5ldyBPcHRpb25zU2V0KG9wdGlvbnNTcGVjKVxuXG4gICAgLy8gQnVpbGQgYSBtb2RhbCBkaWFsb2cgdG8gcHV0IHRoZW0gaW5cbiAgICB0aGlzLnRvcGljc01vZGFsID0gbmV3IFRNb2RhbCh7XG4gICAgICBmb290ZXI6IHRydWUsXG4gICAgICBzdGlja3lGb290ZXI6IGZhbHNlLFxuICAgICAgY2xvc2VNZXRob2RzOiBbJ292ZXJsYXknLCAnZXNjYXBlJ10sXG4gICAgICBjbG9zZUxhYmVsOiAnQ2xvc2UnLFxuICAgICAgb25DbG9zZTogKCkgPT4ge1xuICAgICAgICB0aGlzLnVwZGF0ZVRvcGljcygpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoaXMudG9waWNzTW9kYWwuYWRkRm9vdGVyQnRuKFxuICAgICAgJ09LJyxcbiAgICAgICdidXR0b24gbW9kYWwtYnV0dG9uJyxcbiAgICAgICgpID0+IHtcbiAgICAgICAgdGhpcy50b3BpY3NNb2RhbC5jbG9zZSgpXG4gICAgICB9KVxuXG4gICAgLy8gcmVuZGVyIG9wdGlvbnMgaW50byBtb2RhbFxuICAgIHRoaXMudG9waWNzT3B0aW9ucy5yZW5kZXJJbih0aGlzLnRvcGljc01vZGFsLmdldENvbnRlbnQoKSlcblxuICAgIC8vIEFkZCBmdXJ0aGVyIG9wdGlvbnMgYnV0dG9uc1xuICAgIC8vIFRoaXMgZmVlbHMgYSBiaXQgaWZmeSAtIGRlcGVuZHMgdG9vIG11Y2ggb24gaW1wbGVtZW50YXRpb24gb2YgT3B0aW9uc1NldFxuICAgIGNvbnN0IGxpcyA9IEFycmF5LmZyb20odGhpcy50b3BpY3NNb2RhbC5nZXRDb250ZW50KCkuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2xpJykpXG4gICAgbGlzLmZvckVhY2gobGkgPT4ge1xuICAgICAgY29uc3QgdG9waWNJZCA9IGxpLmRhdGFzZXQub3B0aW9uSWRcbiAgICAgIGlmICh0b3BpY0lkICE9PSB1bmRlZmluZWQgJiYgVG9waWNDaG9vc2VyLmhhc09wdGlvbnModG9waWNJZCkpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9uc0J1dHRvbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdpY29uLWJ1dHRvbiBleHRyYS1vcHRpb25zLWJ1dHRvbicsIGxpKVxuICAgICAgICB0aGlzLl9idWlsZFRvcGljT3B0aW9ucyh0b3BpY0lkLCBvcHRpb25zQnV0dG9uKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBfYnVpbGRUb3BpY09wdGlvbnMgKHRvcGljSWQ6IHN0cmluZywgb3B0aW9uc0J1dHRvbjogSFRNTEVsZW1lbnQpIHtcbiAgICAvLyBCdWlsZCB0aGUgVUkgYW5kIE9wdGlvbnNTZXQgb2JqZWN0IGxpbmtlZCB0byB0b3BpY0lkLiBQYXNzIGluIGEgYnV0dG9uIHdoaWNoIHNob3VsZCBsYXVuY2ggaXRcblxuICAgIC8vIE1ha2UgdGhlIE9wdGlvbnNTZXQgb2JqZWN0IGFuZCBzdG9yZSBhIHJlZmVyZW5jZSB0byBpdFxuICAgIC8vIE9ubHkgc3RvcmUgaWYgb2JqZWN0IGlzIGNyZWF0ZWQ/XG4gICAgY29uc3Qgb3B0aW9uc1NldCA9IFRvcGljQ2hvb3Nlci5uZXdPcHRpb25zU2V0KHRvcGljSWQpXG4gICAgdGhpcy5vcHRpb25zU2V0c1t0b3BpY0lkXSA9IG9wdGlvbnNTZXRcblxuICAgIC8vIE1ha2UgYSBtb2RhbCBkaWFsb2cgZm9yIGl0XG4gICAgY29uc3QgbW9kYWwgPSBuZXcgVE1vZGFsKHtcbiAgICAgIGZvb3RlcjogdHJ1ZSxcbiAgICAgIHN0aWNreUZvb3RlcjogZmFsc2UsXG4gICAgICBjbG9zZU1ldGhvZHM6IFsnb3ZlcmxheScsICdlc2NhcGUnXSxcbiAgICAgIGNsb3NlTGFiZWw6ICdDbG9zZSdcbiAgICB9KVxuXG4gICAgbW9kYWwuYWRkRm9vdGVyQnRuKFxuICAgICAgJ09LJyxcbiAgICAgICdidXR0b24gbW9kYWwtYnV0dG9uJyxcbiAgICAgICgpID0+IHtcbiAgICAgICAgbW9kYWwuY2xvc2UoKVxuICAgICAgfSlcblxuICAgIG9wdGlvbnNTZXQucmVuZGVySW4obW9kYWwuZ2V0Q29udGVudCgpKVxuXG4gICAgLy8gbGluayB0aGUgbW9kYWwgdG8gdGhlIGJ1dHRvblxuICAgIG9wdGlvbnNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICBtb2RhbC5vcGVuKClcbiAgICB9KVxuICB9XG5cbiAgY2hvb3NlVG9waWNzICgpIHtcbiAgICB0aGlzLnRvcGljc01vZGFsLm9wZW4oKVxuICB9XG5cbiAgdXBkYXRlVG9waWNzICgpIHtcbiAgICAvLyB0b3BpYyBjaG9pY2VzIGFyZSBzdG9yZWQgaW4gdGhpcy50b3BpY3NPcHRpb25zIGF1dG9tYXRpY2FsbHlcbiAgICAvLyBwdWxsIHRoaXMgaW50byB0aGlzLnRvcGljcyBhbmQgdXBkYXRlIGJ1dHRvbiBkaXNwbGF5c1xuXG4gICAgLy8gaGF2ZSBvYmplY3Qgd2l0aCBib29sZWFuIHByb3BlcnRpZXMuIEp1c3Qgd2FudCB0aGUgdHJ1ZSB2YWx1ZXNcbiAgICBjb25zdCB0b3BpY3MgPSBib29sT2JqZWN0VG9BcnJheSh0aGlzLnRvcGljc09wdGlvbnMub3B0aW9ucylcbiAgICB0aGlzLnRvcGljcyA9IHRvcGljc1xuXG4gICAgbGV0IHRleHRcblxuICAgIGlmICh0b3BpY3MubGVuZ3RoID09PSAwKSB7XG4gICAgICB0ZXh0ID0gJ0Nob29zZSB0b3BpYycgLy8gbm90aGluZyBzZWxlY3RlZFxuICAgICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5kaXNhYmxlZCA9IHRydWVcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgaWQgPSB0b3BpY3NbMF0gLy8gZmlyc3QgaXRlbSBzZWxlY3RlZFxuICAgICAgdGV4dCA9IFRvcGljQ2hvb3Nlci5nZXRUaXRsZShpZClcbiAgICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uZGlzYWJsZWQgPSBmYWxzZVxuICAgIH1cblxuICAgIGlmICh0b3BpY3MubGVuZ3RoID4gMSkgeyAvLyBhbnkgYWRkaXRpb25hbCBzaG93IGFzIGUuZy4gJyArIDFcbiAgICAgIHRleHQgKz0gJyArJyArICh0b3BpY3MubGVuZ3RoIC0gMSlcbiAgICB9XG5cbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbi5pbm5lckhUTUwgPSB0ZXh0XG4gIH1cblxuICBzZXRDb21tYW5kV29yZCAoKSB7XG4gICAgLy8gZmlyc3Qgc2V0IHRvIGZpcnN0IHRvcGljIGNvbW1hbmQgd29yZFxuICAgIGxldCBjb21tYW5kV29yZCA9IFRvcGljQ2hvb3Nlci5nZXRDb21tYW5kV29yZCh0aGlzLnRvcGljc1swXSlcblxuICAgIGxldCB1c2VDb21tYW5kV29yZCA9IHRydWUgLy8gdHJ1ZSBpZiBzaGFyZWQgY29tbWFuZCB3b3JkXG5cbiAgICAvLyBjeWNsZSB0aHJvdWdoIHJlc3Qgb2YgdG9waWNzLCByZXNldCBjb21tYW5kIHdvcmQgaWYgdGhleSBkb24ndCBtYXRjaFxuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgdGhpcy50b3BpY3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChUb3BpY0Nob29zZXIuZ2V0Q29tbWFuZFdvcmQodGhpcy50b3BpY3NbaV0pICE9PSBjb21tYW5kV29yZCkge1xuICAgICAgICBjb21tYW5kV29yZCA9ICcnXG4gICAgICAgIHVzZUNvbW1hbmRXb3JkID0gZmFsc2VcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNvbW1hbmRXb3JkID0gY29tbWFuZFdvcmRcbiAgICB0aGlzLnVzZUNvbW1hbmRXb3JkID0gdXNlQ29tbWFuZFdvcmRcbiAgfVxuXG4gIGdlbmVyYXRlQWxsICgpIHtcbiAgICAvLyBDbGVhciBkaXNwbGF5LWJveCBhbmQgcXVlc3Rpb24gbGlzdFxuICAgIHRoaXMuZGlzcGxheUJveC5pbm5lckhUTUwgPSAnJ1xuICAgIHRoaXMucXVlc3Rpb25zID0gW11cbiAgICB0aGlzLnNldENvbW1hbmRXb3JkKClcblxuICAgIC8vIFNldCBudW1iZXIgYW5kIG1haW4gY29tbWFuZCB3b3JkXG4gICAgY29uc3QgbWFpbnEgPSBjcmVhdGVFbGVtKCdwJywgJ2thdGV4IG1haW5xJywgdGhpcy5kaXNwbGF5Qm94KVxuICAgIG1haW5xLmlubmVySFRNTCA9IGAke3RoaXMucU51bWJlcn0uICR7dGhpcy5jb21tYW5kV29yZH1gIC8vIFRPRE86IGdldCBjb21tYW5kIHdvcmQgZnJvbSBxdWVzdGlvbnNcblxuICAgIC8vIE1ha2Ugc2hvdyBhbnN3ZXJzIGJ1dHRvblxuICAgIHRoaXMuYW5zd2VyQnV0dG9uID0gY3JlYXRlRWxlbSgncCcsICdidXR0b24gc2hvdy1hbnN3ZXJzJywgdGhpcy5kaXNwbGF5Qm94KVxuICAgIHRoaXMuYW5zd2VyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgdGhpcy50b2dnbGVBbnN3ZXJzKClcbiAgICB9KVxuICAgIHRoaXMuYW5zd2VyQnV0dG9uLmlubmVySFRNTCA9ICdTaG93IGFuc3dlcnMnXG5cbiAgICAvLyBHZXQgZGlmZmljdWx0eSBmcm9tIHNsaWRlclxuICAgIGNvbnN0IG1pbmRpZmYgPSB0aGlzLmRpZmZpY3VsdHlTbGlkZXIuZ2V0VmFsdWVMKClcbiAgICBjb25zdCBtYXhkaWZmID0gdGhpcy5kaWZmaWN1bHR5U2xpZGVyLmdldFZhbHVlUigpXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAvLyBNYWtlIHF1ZXN0aW9uIGNvbnRhaW5lciBET00gZWxlbWVudFxuICAgICAgY29uc3QgY29udGFpbmVyID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWNvbnRhaW5lcicsIHRoaXMuZGlzcGxheUJveClcbiAgICAgIGNvbnRhaW5lci5kYXRhc2V0LnF1ZXN0aW9uX2luZGV4ID0gaSArICcnIC8vIG5vdCBzdXJlIHRoaXMgaXMgYWN0dWFsbHkgbmVlZGVkXG5cbiAgICAgIC8vIEFkZCBjb250YWluZXIgbGluayB0byBvYmplY3QgaW4gcXVlc3Rpb25zIGxpc3RcbiAgICAgIGlmICghdGhpcy5xdWVzdGlvbnNbaV0pIHRoaXMucXVlc3Rpb25zW2ldID0geyBjb250YWluZXI6IGNvbnRhaW5lciB9XG5cbiAgICAgIC8vIGNob29zZSBhIGRpZmZpY3VsdHkgYW5kIGdlbmVyYXRlXG4gICAgICBjb25zdCBkaWZmaWN1bHR5ID0gbWluZGlmZiArIE1hdGguZmxvb3IoaSAqIChtYXhkaWZmIC0gbWluZGlmZiArIDEpIC8gdGhpcy5uKVxuXG4gICAgICAvLyBjaG9vc2UgYSB0b3BpYyBpZFxuICAgICAgdGhpcy5nZW5lcmF0ZShpLCBkaWZmaWN1bHR5KVxuICAgIH1cbiAgfVxuXG4gIGdlbmVyYXRlIChpOiBudW1iZXIsIGRpZmZpY3VsdHk6IG51bWJlciwgdG9waWNJZD86IHN0cmluZykge1xuICAgIC8vIFRPRE8gZ2V0IG9wdGlvbnMgcHJvcGVybHlcbiAgICB0b3BpY0lkID0gdG9waWNJZCB8fCByYW5kRWxlbSh0aGlzLnRvcGljcylcblxuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICBsYWJlbDogJycsXG4gICAgICBkaWZmaWN1bHR5OiBkaWZmaWN1bHR5LFxuICAgICAgdXNlQ29tbWFuZFdvcmQ6IGZhbHNlXG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9uc1NldHNbdG9waWNJZF0pIHtcbiAgICAgIE9iamVjdC5hc3NpZ24ob3B0aW9ucywgdGhpcy5vcHRpb25zU2V0c1t0b3BpY0lkXS5vcHRpb25zKVxuICAgIH1cblxuICAgIC8vIGNob29zZSBhIHF1ZXN0aW9uXG4gICAgY29uc3QgcXVlc3Rpb24gPSBUb3BpY0Nob29zZXIubmV3UXVlc3Rpb24odG9waWNJZCwgb3B0aW9ucylcblxuICAgIC8vIHNldCBzb21lIG1vcmUgZGF0YSBpbiB0aGUgcXVlc3Rpb25zW10gbGlzdFxuICAgIGlmICghdGhpcy5xdWVzdGlvbnNbaV0pIHRocm93IG5ldyBFcnJvcigncXVlc3Rpb24gbm90IG1hZGUnKVxuICAgIHRoaXMucXVlc3Rpb25zW2ldLnF1ZXN0aW9uID0gcXVlc3Rpb25cbiAgICB0aGlzLnF1ZXN0aW9uc1tpXS50b3BpY0lkID0gdG9waWNJZFxuXG4gICAgLy8gUmVuZGVyIGludG8gdGhlIGNvbnRhaW5lclxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMucXVlc3Rpb25zW2ldLmNvbnRhaW5lclxuICAgIGNvbnRhaW5lci5pbm5lckhUTUwgPSAnJyAvLyBjbGVhciBpbiBjYXNlIG9mIHJlZnJlc2hcblxuICAgIC8vIG1ha2UgYW5kIHJlbmRlciBxdWVzdGlvbiBudW1iZXIgYW5kIGNvbW1hbmQgd29yZCAoaWYgbmVlZGVkKVxuICAgIGxldCBxTnVtYmVyVGV4dCA9IHF1ZXN0aW9uTGV0dGVyKGkpICsgJyknXG4gICAgaWYgKHdpbmRvdy5TSE9XX0RJRkZJQ1VMVFkpIHsgcU51bWJlclRleHQgKz0gb3B0aW9ucy5kaWZmaWN1bHR5IH1cbiAgICBpZiAoIXRoaXMudXNlQ29tbWFuZFdvcmQpIHtcbiAgICAgIHFOdW1iZXJUZXh0ICs9ICcgJyArIFRvcGljQ2hvb3Nlci5nZXRDb21tYW5kV29yZCh0b3BpY0lkKVxuICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ2luZGl2aWR1YWwtY29tbWFuZC13b3JkJylcbiAgICB9IGVsc2Uge1xuICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ2luZGl2aWR1YWwtY29tbWFuZC13b3JkJylcbiAgICB9XG5cbiAgICBjb25zdCBxdWVzdGlvbk51bWJlckRpdiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1udW1iZXIga2F0ZXgnLCBjb250YWluZXIpXG4gICAgcXVlc3Rpb25OdW1iZXJEaXYuaW5uZXJIVE1MID0gcU51bWJlclRleHRcblxuICAgIC8vIHJlbmRlciB0aGUgcXVlc3Rpb25cbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQocXVlc3Rpb24uZ2V0RE9NKCkpIC8vIHRoaXMgaXMgYSAucXVlc3Rpb24tZGl2IGVsZW1lbnRcbiAgICBxdWVzdGlvbi5yZW5kZXIoKSAvLyBzb21lIHF1ZXN0aW9ucyBuZWVkIHJlbmRlcmluZyBhZnRlciBhdHRhY2hpbmcgdG8gRE9NXG5cbiAgICAvLyBtYWtlIGhpZGRlbiBhY3Rpb25zIG1lbnVcbiAgICBjb25zdCBhY3Rpb25zID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWFjdGlvbnMgaGlkZGVuJywgY29udGFpbmVyKVxuICAgIGNvbnN0IHJlZnJlc2hJY29uID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLXJlZnJlc2ggaWNvbi1idXR0b24nLCBhY3Rpb25zKVxuICAgIGNvbnN0IGFuc3dlckljb24gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tYW5zd2VyIGljb24tYnV0dG9uJywgYWN0aW9ucylcblxuICAgIGFuc3dlckljb24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICBxdWVzdGlvbi50b2dnbGVBbnN3ZXIoKVxuICAgICAgaGlkZUFsbEFjdGlvbnMoKVxuICAgIH0pXG5cbiAgICByZWZyZXNoSWNvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHRoaXMuZ2VuZXJhdGUoaSwgZGlmZmljdWx0eSlcbiAgICAgIGhpZGVBbGxBY3Rpb25zKClcbiAgICB9KVxuXG4gICAgLy8gUTogaXMgdGhpcyBiZXN0IHdheSAtIG9yIGFuIGV2ZW50IGxpc3RlbmVyIG9uIHRoZSB3aG9sZSBkaXNwbGF5Qm94P1xuICAgIGNvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGUgPT4ge1xuICAgICAgaWYgKCFoYXNBbmNlc3RvckNsYXNzKGUudGFyZ2V0LCAncXVlc3Rpb24tYWN0aW9ucycpKSB7XG4gICAgICAgIC8vIG9ubHkgZG8gdGhpcyBpZiBpdCBkaWRuJ3Qgb3JpZ2luYXRlIGluIGFjdGlvbiBidXR0b25cbiAgICAgICAgdGhpcy5zaG93UXVlc3Rpb25BY3Rpb25zKGkpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIHRvZ2dsZUFuc3dlcnMgKCkge1xuICAgIGlmICh0aGlzLmFuc3dlcmVkKSB7XG4gICAgICB0aGlzLnF1ZXN0aW9ucy5mb3JFYWNoKHEgPT4ge1xuICAgICAgICBpZiAocS5xdWVzdGlvbikgcS5xdWVzdGlvbi5oaWRlQW5zd2VyKClcbiAgICAgICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gICAgICAgIHRoaXMuYW5zd2VyQnV0dG9uLmlubmVySFRNTCA9ICdTaG93IGFuc3dlcnMnXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnF1ZXN0aW9ucy5mb3JFYWNoKHEgPT4ge1xuICAgICAgICBpZiAocS5xdWVzdGlvbikgcS5xdWVzdGlvbi5zaG93QW5zd2VyKClcbiAgICAgICAgdGhpcy5hbnN3ZXJlZCA9IHRydWVcbiAgICAgICAgdGhpcy5hbnN3ZXJCdXR0b24uaW5uZXJIVE1MID0gJ0hpZGUgYW5zd2VycydcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNjYW5zIGZvciB3aWRlc3QgcXVlc3Rpb24gYW5kIHRoZW4gc2V0cyB0aGUgZ3JpZCB3aWR0aCB0byB0aGF0XG4gICAqL1xuICAvKiBlc2xpbnQtZGlzYWJsZSAqL1xuICBhZGp1c3RHcmlkV2lkdGggKCkge1xuICAgIHJldHVyblxuICB9XG4gIC8qIGVzbGludC1lbmFibGUgKi9cblxuICBzaG93UXVlc3Rpb25BY3Rpb25zIChxdWVzdGlvbkluZGV4OiBudW1iZXIpIHtcbiAgICAvLyBmaXJzdCBoaWRlIGFueSBvdGhlciBhY3Rpb25zXG4gICAgaGlkZUFsbEFjdGlvbnMoKVxuXG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5xdWVzdGlvbnNbcXVlc3Rpb25JbmRleF0uY29udGFpbmVyXG4gICAgY29uc3QgYWN0aW9ucyA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcucXVlc3Rpb24tYWN0aW9ucycpIGFzIEhUTUxFbGVtZW50XG5cbiAgICAvLyBVbmhpZGUgdGhlIG92ZXJsYXlcbiAgICBjb25zdCBvdmVybGF5ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm92ZXJsYXknKVxuICAgIGlmIChvdmVybGF5ICE9PSBudWxsKSBvdmVybGF5LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpXG4gICAgYWN0aW9ucy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgIGFjdGlvbnMuc3R5bGUubGVmdCA9IChjb250YWluZXIub2Zmc2V0V2lkdGggLyAyIC0gYWN0aW9ucy5vZmZzZXRXaWR0aCAvIDIpICsgJ3B4J1xuICAgIGFjdGlvbnMuc3R5bGUudG9wID0gKGNvbnRhaW5lci5vZmZzZXRIZWlnaHQgLyAyIC0gYWN0aW9ucy5vZmZzZXRIZWlnaHQgLyAyKSArICdweCdcbiAgfVxuXG4gIGFwcGVuZFRvIChlbGVtOiBIVE1MRWxlbWVudCkge1xuICAgIGVsZW0uYXBwZW5kQ2hpbGQodGhpcy5vdXRlckJveClcbiAgICB0aGlzLl9pbml0U2xpZGVyKCkgLy8gaGFzIHRvIGJlIGluIGRvY3VtZW50J3MgRE9NIHRvIHdvcmsgcHJvcGVybHlcbiAgfVxuXG4gIGFwcGVuZEJlZm9yZSAocGFyZW50OiBIVE1MRWxlbWVudCwgZWxlbTogSFRNTEVsZW1lbnQpIHtcbiAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHRoaXMub3V0ZXJCb3gsIGVsZW0pXG4gICAgdGhpcy5faW5pdFNsaWRlcigpIC8vIGhhcyB0byBiZSBpbiBkb2N1bWVudCdzIERPTSB0byB3b3JrIHByb3Blcmx5XG4gIH1cbn1cblxuZnVuY3Rpb24gcXVlc3Rpb25MZXR0ZXIgKGk6IG51bWJlcikge1xuICAvLyByZXR1cm4gYSBxdWVzdGlvbiBudW1iZXIuIGUuZy4gcU51bWJlcigwKT1cImFcIi5cbiAgLy8gQWZ0ZXIgbGV0dGVycywgd2UgZ2V0IG9uIHRvIGdyZWVrXG4gIGNvbnN0IGxldHRlciA9XG4gICAgICAgIGkgPCAyNiA/IFN0cmluZy5mcm9tQ2hhckNvZGUoMHg2MSArIGkpXG4gICAgICAgICAgOiBpIDwgNTIgPyBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4NDEgKyBpIC0gMjYpXG4gICAgICAgICAgICA6IFN0cmluZy5mcm9tQ2hhckNvZGUoMHgzQjEgKyBpIC0gNTIpXG4gIHJldHVybiBsZXR0ZXJcbn1cblxuZnVuY3Rpb24gaGlkZUFsbEFjdGlvbnMgKCkge1xuICAvLyBoaWRlIGFsbCBxdWVzdGlvbiBhY3Rpb25zXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5xdWVzdGlvbi1hY3Rpb25zJykuZm9yRWFjaChlbCA9PiB7XG4gICAgZWwuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcbiAgfSlcbiAgY29uc3Qgb3ZlcmxheSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5vdmVybGF5JylcbiAgaWYgKG92ZXJsYXkgIT09IG51bGwpIHsgb3ZlcmxheS5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKSB9IGVsc2UgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgZmluZCBvdmVybGF5IHdoZW4gaGlkaW5nIGFjdGlvbnMnKVxufVxuIiwiaW1wb3J0IFF1ZXN0aW9uU2V0IGZyb20gJ1F1ZXN0aW9uU2V0J1xuXG4vLyBUT0RPOlxuLy8gIC0gSW1wb3J0IGV4aXN0aW5nIHF1ZXN0aW9uIHR5cGVzIChHIC0gZ3JhcGhpYywgVCAtIHRleHRcbi8vICAgIC0gRyBhcmVhXG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG4gIGNvbnN0IHFzID0gbmV3IFF1ZXN0aW9uU2V0KClcbiAgcXMuYXBwZW5kVG8oZG9jdW1lbnQuYm9keSlcbiAgcXMuY2hvb3NlVG9waWNzKClcbn0pXG4iXSwibmFtZXMiOlsiY29tbW9uanNIZWxwZXJzLmNyZWF0ZUNvbW1vbmpzTW9kdWxlIiwiY29tbW9uanNIZWxwZXJzLmdldERlZmF1bHRFeHBvcnRGcm9tQ2pzIiwiZnJhY3Rpb24iLCJURC5nZXRUcmlhbmdsZSIsInRoaXMiLCJSU2xpZGVyIiwiVG9waWNDaG9vc2VyLmdldFRvcGljcyIsIlRNb2RhbCIsIlRvcGljQ2hvb3Nlci5oYXNPcHRpb25zIiwiVG9waWNDaG9vc2VyLm5ld09wdGlvbnNTZXQiLCJUb3BpY0Nob29zZXIuZ2V0VGl0bGUiLCJUb3BpY0Nob29zZXIuZ2V0Q29tbWFuZFdvcmQiLCJUb3BpY0Nob29zZXIubmV3UXVlc3Rpb24iXSwibWFwcGluZ3MiOiI7OztFQUFBO0VBQ0E7RUFDQTtBQUNBO0VBQ0EsSUFBSSxFQUFFLEdBQUcsVUFBVSxJQUFJLEVBQUU7RUFDekIsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUk7RUFDbkIsRUFBRSxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUk7RUFDMUIsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUk7RUFDcEIsRUFBRSxJQUFJLENB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LElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDeEUsSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUc7QUFDNUI7RUFDQSxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7RUFDekIsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQzNELE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUk7RUFDbkYsS0FBSyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDOUQsR0FBRztFQUNILEVBQUUsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFO0VBQzNCLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFHLFVBQVUsTUFBTSxFQUFFO0VBQzdDLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUM7QUFDOUQ7RUFDQSxFQUFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUs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LENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUk7QUFDdEc7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7RUFDdkIsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO0VBQzNCLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUM7RUFDL0QsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQztFQUM3RCxLQUFLO0VBQ0wsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQztFQUNwRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFJO0VBQzdGLEdBQUcsTUFBTTtFQUNULElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFDLEVBQUU7RUFDdEYsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJ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T0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQzdDLENBQUM7QUFDRDtFQUNPLFNBQVMsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUU7RUFDakQ7RUFDQTtFQUNBO0VBQ0E7RUFDQSxFQUFFLE1BQU0sR0FBRyxHQUFHLEdBQUU7RUFDaEIsRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUNsQyxJQUFJLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDO0VBQzlCLEdBQUc7RUFDSCxFQUFFLElBQUksR0FBRyxLQUFLLEVBQUUsRUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQztFQUNqRCxFQUFFLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUM7RUFDMUMsRUFBRSxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDZixDQUFDO0FBQ0Q7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNPLFNBQVMsZUFBZSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO0VBQzlDO0VBQ0EsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBQztFQUM5QixFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFDO0FBQy9CO0VBQ0EsRUFBRSxPQUFPLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDO0VBQzFDLENBQUM7QUFDRDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ08sU0FBUyxRQUFRLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRTtFQUN2QyxFQUFFLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxhQUFhLENBQUM7RUFDN0QsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTTtFQUMvQixFQUFFLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLEtBQUk7RUFDdEMsRUFBRSxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFDO0VBQ3ZDLEVBQUUsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3RCLENBQUM7QUE2QkQ7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDTyxTQUFTLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQy9CLEVBQUUsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztFQUMxRCxDQUFDO0FBS0Q7RUFDTyxTQUFTLE1BQU0sRUFBRSxDQUFDLEVBQUU7RUFDM0IsRUFBRSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDO0VBQ3BDLENBQUM7QUFLRDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ08sU0FBUyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRTtFQUNsQyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRSxPQUFPLENBQUM7RUFDeEIsRUFBRSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUM7RUFDakMsRUFBRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxNQUFNLEVBQUM7RUFDeEMsRUFBRSxNQUFNLE9BQU8sR0FBRyxDQUFDLEdBQUcsT0FBTTtFQUM1QixFQUFFLElBQUksT0FBTyxLQUFLLENBQUMsRUFBRTtFQUNyQixJQUFJLE9BQU8sT0FBTztFQUNsQixHQUFHLE1BQU07RUFDVCxJQUFJLE9BQU8sT0FBTyxHQUFHLEdBQUcsR0FBRyxPQUFPO0VBQ2xDLEdBQUc7RUFDSCxDQUFDO0FBQ0Q7RUFDTyxTQUFTLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzNCO0VBQ0EsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUU7RUFDdEIsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUU7QUFDdEI7RUFDQSxFQUFFLE9BQU8sQ0FBQyxFQUFFO0VBQ1osSUFBSSxDQUFDLElBQUksRUFBQztFQUNWLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFO0VBQ3hCLElBQUksQ0FBQyxJQUFJLEVBQUM7RUFDVixJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRTtFQUN4QixHQUFHO0VBQ0gsQ0FBQztBQW9DRDtFQUNPLFNBQVMsT0FBTyxFQUFFLEtBQUssRUFBRTtFQUNoQztFQUNBO0VBQ0E7RUFDQSxFQUFFLElBQUksWUFBWSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxDQUFDLElBQUksWUFBVztBQUN0RTtFQUNBO0VBQ0EsRUFBRSxPQUFPLFlBQVksS0FBSyxDQUFDLEVBQUU7RUFDN0I7RUFDQSxJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxZQUFZLEVBQUM7RUFDMUQsSUFBSSxZQUFZLElBQUksRUFBQztBQUNyQjtFQUNBO0VBQ0EsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFDLFlBQVksRUFBQztFQUN4QyxJQUFJLEtBQUssQ0FBQyxZQUFZLENBQUMsR0FBRyxLQUFLLENBQUMsV0FBVyxFQUFDO0VBQzVDLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLGVBQWM7RUFDdkMsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLEtBQUs7RUFDZCxDQUFDO0FBQ0Q7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDTyxTQUFTLFlBQVksRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQ3BDLEVBQUUsUUFBUSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDNUMsQ0FBQztBQUNEO0VBQ08sU0FBUyxnQkFBZ0IsRUFBRSxLQUFLLEVBQUU7RUFDekM7RUFDQTtFQUNBLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBQztFQUNYLEVBQUUsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRTtFQUMzQixJQUFJLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQ2pFLE1BQU0sS0FBSztFQUNYLEtBQUs7RUFDTCxJQUFJLENBQUMsR0FBRTtFQUNQLEdBQUc7RUFDSCxFQUFFLE9BQU8sQ0FBQztFQUNWLENBQUM7QUFDRDtFQUNPLFNBQVMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO0VBQ3hDO0VBQ0EsRUFBRSxNQUFNLE1BQU0sR0FBRyxHQUFFO0VBQ25CLEVBQUUsS0FBSyxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUU7RUFDekIsSUFBSSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBQztFQUNsQyxHQUFHO0VBQ0gsRUFBRSxPQUFPLE1BQU07RUFDZixDQUFDO0FBMEJEO0VBQ0E7QUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ08sU0FBUyxVQUFVLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUU7RUFDeEQ7RUFDQSxFQUFFLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFDO0VBQzlDLEVBQUUsSUFBSSxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsR0FBRyxVQUFTO0VBQzNDLEVBQUUsSUFBSSxNQUFNLEVBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUM7RUFDdEMsRUFBRSxPQUFPLElBQUk7RUFDYixDQUFDO0FBQ0Q7RUFDTyxTQUFTLGdCQUFnQixFQUFFLElBQUksRUFBRSxTQUFTLEVBQUU7RUFDbkQ7RUFDQSxFQUFFLElBQUksTUFBTSxHQUFHLE1BQUs7RUFDcEIsRUFBRSxNQUFNLElBQUksSUFBSSxJQUFJLEtBQUssUUFBUSxFQUFFLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFO0VBQzNELElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRTtFQUM1QyxNQUFNLE1BQU0sR0FBRyxLQUFJO0VBQ25CLEtBQUs7RUFDTCxHQUFHO0VBQ0gsRUFBRSxPQUFPLE1BQU07RUFDZixDQUFDO0FBQ0Q7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsU0FBUyxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtFQUNoQyxFQUFFLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsR0FBRTtFQUM3QyxFQUFFLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsR0FBRTtFQUM3QyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJO0VBQ25DLFdBQVcsS0FBSyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsS0FBSztFQUNuQyxXQUFXLEtBQUssQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUc7RUFDbkMsV0FBVyxLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7RUFDcEMsQ0FBQztBQUNEO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNPLFNBQVMsYUFBYSxDQUFDLEtBQUssRUFBRSxLQUFLLEdBQUc7RUFDN0MsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxNQUFNO0VBQ25DLEVBQUUsSUFBSSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLEtBQUssVUFBVSxJQUFJLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsS0FBSyxVQUFVLEVBQUUsTUFBTSxJQUFJLEtBQUssRUFBRSxnQ0FBZ0MsQ0FBQztFQUM1SixFQUFFLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFDO0VBQ3BDLEVBQUUsSUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUM7RUFDcEM7RUFDQSxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBQztFQUMvQyxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBQztFQUMvQyxFQUFFLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBQztBQUNyQztFQUNBLEVBQUUsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFDO0VBQzFELEVBQUUsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFDO0FBQzFEO0VBQ0EsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFDO0VBQ1gsRUFBRSxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRTtFQUN2QyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDO0VBQzlDLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQztFQUM1QyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSTtFQUNuQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSTtFQUNsQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLE9BQU07RUFDbEMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUk7RUFDbkMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUk7RUFDbEMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxPQUFNO0VBQ2xDLElBQUksQ0FBQyxHQUFFO0VBQ1AsR0FBRztFQUNILEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUM7RUFDakQsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBQztFQUM5QyxDQUFDO0FBQ0Q7RUFDQTtFQUNPLFNBQVMsVUFBVSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7RUFDakQsRUFBRSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBQztFQUM3QyxFQUFFLE1BQU0sS0FBSyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxPQUFNO0VBQ2xDLEVBQUUsTUFBTSxLQUFLLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLE9BQU07RUFDbEMsRUFBRSxNQUFNLElBQUksR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBQztFQUM1QixFQUFFLE1BQU0sSUFBSSxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFDO0FBQzVCO0VBQ0E7RUFDQSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBQztFQUNwQixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBQztBQUNwQjtFQUNBO0VBQ0EsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsS0FBSyxFQUFFLElBQUksR0FBRyxDQUFDLEdBQUcsS0FBSyxFQUFDO0VBQ2hELEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEtBQUssRUFBRSxJQUFJLEdBQUcsQ0FBQyxHQUFHLEtBQUssRUFBQztBQUNoRDtFQUNBLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFDO0VBQ3BCOztFQ3hWQTs7OztRQUlxQixVQUFVOzs7Ozs7TUFzQjdCLFlBQWEsV0FBeUIsRUFBRSxRQUFrQjtVQUN4RCxJQUFJLENBQUMsV0FBVyxHQUFHLFdBQTBCLENBQUE7VUFFN0MsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUE7VUFDakIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTTtjQUM3QixJQUFJLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLFlBQVksSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTtrQkFDbkYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQTtlQUN6QzttQkFBTSxJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFO2tCQUNsQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFBO2tCQUM1QyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFBO2VBQzdDO21CQUFNLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxZQUFZLEVBQUU7a0JBQ3ZDLE1BQU0sQ0FBQyxhQUFhLEdBQUcsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFBO2tCQUN6RCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQTtlQUN2RDtXQUNGLENBQUMsQ0FBQTtVQUVGLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFBOztVQUd4QixJQUFJLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtPQUNuQztNQW5DRCxPQUFPLEtBQUs7VUFDVixJQUFJLFVBQVUsQ0FBQyxTQUFTLElBQUksU0FBQSxFQUFFLEVBQUksQ0FBQyxDQUFBO2NBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1VBQ2pGLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDO2NBQ2hFLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLFNBQVMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7VUFFckQsVUFBVSxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUE7VUFFekIsT0FBTyxFQUFFLENBQUE7T0FDVjs7Ozs7TUFpQ0QsaUJBQWlCLENBQUUsTUFBZ0M7O1VBRWpELElBQUksUUFBUSxNQUFNLENBQUMsS0FBSyxRQUFRLEVBQUU7Y0FDaEMsTUFBTSxXQUFXLEdBQWdDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBTSxDQUFhLENBQUMsRUFBRSxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUE7Y0FDM0csSUFBSSxXQUFXLEtBQUssU0FBUyxFQUFFO2tCQUM3QixNQUFNLEdBQUcsV0FBVyxDQUFBO2VBQ3JCO21CQUFNO2tCQUNMLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLE1BQU0sR0FBRyxDQUFDLENBQUE7ZUFDakQ7V0FDRjtVQUNELElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTztjQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsVUFBVyxNQUFrQixDQUFDLEVBQUUsNEJBQTRCLENBQUMsQ0FBQTtVQUVsRyxRQUFRLE1BQU0sQ0FBQyxJQUFJO2NBQ2pCLEtBQUssS0FBSyxFQUFFO2tCQUNWLE1BQU0sS0FBSyxHQUFzQixNQUFNLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2tCQUNoRixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO2tCQUM3QyxNQUFLO2VBQ047Y0FDRCxLQUFLLE1BQU0sRUFBRTtrQkFDWCxNQUFNLEtBQUssR0FBc0IsTUFBTSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtrQkFDaEYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQTtrQkFDdkMsTUFBSztlQUNOO2NBQ0QsS0FBSyxrQkFBa0IsRUFBRTtrQkFDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFzQixDQUFDLEtBQUssQ0FBQTtrQkFDbkcsTUFBSztlQUNOO2NBQ0QsS0FBSyxrQkFBa0IsRUFBRTtrQkFDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO3NCQUNwQixLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQXdCLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7a0JBQ3hHLE1BQUs7ZUFDTjtjQUNELEtBQUssT0FBTyxFQUFFO2tCQUNaLE1BQU0sT0FBTyxHQUFzQixNQUFNLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2tCQUNsRixNQUFNLE9BQU8sR0FBc0IsTUFBTSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtrQkFDbEYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtrQkFDakQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtrQkFDakQsTUFBSztlQUNOO2NBRUQ7a0JBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBbUIsTUFBa0IsQ0FBQyxFQUFFLGlDQUFpQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtXQUMxRztVQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO09BQzFCOzs7OztNQU9ELG9CQUFvQjtVQUNsQixJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNO2NBQzdCLElBQUksWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFO2tCQUN4QixJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUE7ZUFDL0I7V0FDRixDQUFDLENBQUE7T0FDSDtNQUVELGtCQUFrQjtVQUNoQixJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO09BQ2pFOzs7Ozs7TUFPRCxlQUFlLENBQUUsTUFBZ0M7VUFDL0MsSUFBSSxRQUFRLE1BQU0sQ0FBQyxLQUFLLFFBQVEsRUFBRTtjQUNoQyxNQUFNLFVBQVUsR0FBZ0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUE7Y0FDaEgsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFO2tCQUFFLE1BQU0sR0FBRyxVQUFVLENBQUE7ZUFBRTttQkFBTTtrQkFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixNQUFNLEdBQUcsQ0FBQyxDQUFBO2VBQUU7V0FDaEg7VUFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUMsT0FBTyxLQUFLLFNBQVM7Y0FBRSxPQUFNO1VBRXRGLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1VBQy9DLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQTtVQUVqQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtjQUMzQyxJQUFJLFNBQVMsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7Y0FFOUIsSUFBSSxTQUFTLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2tCQUU3QixTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtlQUMvQjtjQUVELElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLFNBQVMsRUFBRTtrQkFDaEQsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsU0FBUywwQkFBMEIsQ0FBQyxDQUFBO2VBQzdFO2NBRUQsTUFBTSxZQUFZLEdBQWEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQVksQ0FBQTtjQUVqRSxJQUFJLENBQUMsWUFBWSxFQUFFO2tCQUNqQixNQUFNLEdBQUcsS0FBSyxDQUFBO2tCQUNkLE1BQUs7ZUFDTjtXQUNGO1VBRUQsSUFBSSxNQUFNLEVBQUU7Y0FDVixNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQzFDO2NBQUEsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFBLEVBQUUsQ0FBQyxDQUFBO1dBQ3hGO2VBQU07Y0FDTCxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQ3ZDO2NBQUEsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFBLEVBQUUsQ0FBQyxDQUFBO1dBQ3ZGO09BQ0Y7TUFFRCxRQUFRLENBQUUsT0FBb0IsRUFBRSxZQUFzQjtVQUNwRCxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1VBQzdDLElBQUksWUFBWTtjQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO1VBQ2xELElBQUksTUFBTSxHQUFHLFVBQVUsQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUE7VUFFdEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTTtjQUM3QixJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssY0FBYyxFQUFFO2tCQUNsQyxNQUFNLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtlQUNuRDttQkFBTSxJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssWUFBWSxFQUFFO2tCQUN2QyxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFBO2tCQUMxQyxJQUFJLGFBQWEsS0FBSyxTQUFTO3NCQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtrQkFDM0UsTUFBTSxpQkFBaUIsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQTtrQkFDdEUsTUFBTSxDQUFDLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQTtlQUNuQzttQkFBTTtrQkFDTCxNQUFNLEVBQUUsR0FBRyxVQUFVLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQTtrQkFDOUMsSUFBSSxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUU7c0JBQ3hCLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUE7bUJBQ2hDO2tCQUVELFFBQVEsTUFBTSxDQUFDLElBQUk7c0JBQ2pCLEtBQUssU0FBUzswQkFDWixhQUFhLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQTswQkFDL0IsTUFBSztzQkFDUCxLQUFLLEtBQUssQ0FBQztzQkFDWCxLQUFLLE1BQU07MEJBQ1Qsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFBOzBCQUM5QixNQUFLO3NCQUNQLEtBQUssa0JBQWtCLENBQUM7c0JBQ3hCLEtBQUssa0JBQWtCOzBCQUNyQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFBOzBCQUNqQyxNQUFLO3NCQUNQLEtBQUssT0FBTzswQkFDVixpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUE7MEJBQzdCLE1BQUs7bUJBQ1I7a0JBQ0QsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRTtzQkFDNUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFBO3NCQUM5QixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTttQkFBRSxDQUFDLENBQUE7a0JBQzlCLE1BQU0sQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFBO2VBQ3BCO1dBQ0YsQ0FBQyxDQUFBO1VBQ0YsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtVQUVwQixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtVQUV6QixPQUFPLElBQUksQ0FBQTtPQUNaOztNQUdELGtCQUFrQixDQUFFLE9BQXFCOztVQUV2QyxJQUFJLE9BQWdDLENBQUE7VUFDcEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTTtjQUM3QixJQUFJLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRTtrQkFDeEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUE7ZUFDNUI7V0FDRixDQUFDLENBQUE7VUFFRixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFBO09BQ2pDOztNQUdELGdCQUFnQixDQUFFLE1BQXFELEVBQUUsRUFBZ0I7VUFDdkYsRUFBRSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFBO1VBRXZELE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLENBQUE7VUFDdkQsSUFBSSxNQUFNLENBQUMsUUFBUTtjQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUE7VUFFdEUsTUFBTSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsWUFBWTtjQUN2QyxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQTtjQUN0RCxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtjQUV2RCxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2NBQzdDLEtBQUssQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksS0FBSyxrQkFBa0IsR0FBRyxPQUFPLEdBQUcsVUFBVSxDQUFBO2NBQ3RFLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxHQUFHLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQTtjQUM1QyxLQUFLLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQyxFQUFFLENBQUE7Y0FFN0IsSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLGtCQUFrQixFQUFFO2tCQUN0QyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQTtlQUN6RDttQkFBTTtrQkFDTCxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLEtBQUssWUFBWSxDQUFDLEVBQUUsQ0FBQTtlQUNuRDtjQUVELEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7Y0FFbkIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7Y0FFN0IsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUE7V0FDMUQsQ0FBQyxDQUFBO09BQ0g7O0VBaFBNLG9CQUFTLEdBQUcsQ0FBQyxDQUFBO0VBbVB0Qjs7Ozs7RUFLQSxTQUFTLGFBQWEsQ0FBRSxLQUFhLEVBQUUsRUFBZTtNQUNwRCxFQUFFLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQTtNQUNwQixFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0VBQ3JDLENBQUM7RUFFRDs7Ozs7RUFLQSxTQUFTLGtCQUFrQixDQUFFLE1BQXFDLEVBQUUsRUFBZTtNQUNqRixNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQTtNQUVoRCxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUMsS0FBSyxLQUFLLEVBQUU7VUFBRSxLQUFLLENBQUMsa0JBQWtCLENBQUMsV0FBVyxFQUFFLEdBQUcsTUFBTSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUE7TUFFeEcsTUFBTSxLQUFLLEdBQXNCLFVBQVUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBcUIsQ0FBQTtNQUN6RixRQUFRLE1BQU0sQ0FBQyxJQUFJO1VBQ2pCLEtBQUssS0FBSztjQUNSLEtBQUssQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFBO2NBQ3JCLEtBQUssQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtjQUNqQyxLQUFLLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUE7Y0FDakMsS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO2NBQ3ZDLE1BQUs7VUFDUCxLQUFLLE1BQU07Y0FDVCxLQUFLLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQTtjQUN2QixLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUE7Y0FDOUIsTUFBSztVQUNQO2NBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFBO09BQ2pFO01BRUQsSUFBSSxNQUFNLENBQUMsU0FBUyxJQUFJLE1BQU0sQ0FBQyxLQUFLLEtBQUssRUFBRTtVQUFFLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtFQUN4RyxDQUFDO0VBRUQsU0FBUyxpQkFBaUIsQ0FBRSxNQUFtQixFQUFFLEVBQWU7TUFDOUQsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUE7TUFDaEQsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFxQixDQUFBO01BQ3hFLE9BQU8sQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFBO01BQ3ZCLE9BQU8sQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtNQUNuQyxPQUFPLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUE7TUFDbkMsT0FBTyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFBO01BRTNDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsVUFBVSxNQUFNLENBQUMsS0FBSyxTQUFTLENBQUMsQ0FBQTtNQUV0RSxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQXFCLENBQUE7TUFDeEUsT0FBTyxDQUFDLElBQUksR0FBRyxRQUFRLENBQUE7TUFDdkIsT0FBTyxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFBO01BQ25DLE9BQU8sQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtNQUNuQyxPQUFPLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUE7RUFDN0MsQ0FBQztFQUVEOzs7RUFHQSxTQUFTLFlBQVksQ0FBRSxNQUF1QjtNQUM1QyxPQUFRLE1BQWtCLENBQUMsRUFBRSxLQUFLLFNBQVMsQ0FBQTtFQUM3Qzs7UUMxVThCLFFBQVE7TUFJcEM7VUFDRSxJQUFJLENBQUMsR0FBRyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7VUFDeEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEdBQUcsY0FBYyxDQUFBO1VBQ25DLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFBO09BQ3RCO01BRUQsTUFBTTtVQUNKLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQTtPQUNoQjtNQUlELFVBQVU7VUFDUixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQTtPQUNyQjtNQUVELFVBQVU7VUFDUixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQTtPQUN0QjtNQUVELFlBQVk7VUFDVixJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7Y0FDakIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO1dBQ2xCO2VBQU07Y0FDTCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7V0FDbEI7T0FDRjtNQUVELFdBQVcsV0FBVztVQUNwQixPQUFPLEVBQUUsQ0FBQTtPQUNWOzs7RUNsQ0g7QUFFQTtFQUNlLE1BQU0sS0FBSyxTQUFTLFFBQVEsQ0FBQztFQUM1QyxFQUFFLFdBQVcsQ0FBQyxDQUFDLE9BQU8sRUFBRTtFQUN4QixJQUFJLEtBQUssR0FBRTtBQUNYO0VBQ0EsSUFBSSxNQUFNLFFBQVEsR0FBRztFQUNyQixNQUFNLFVBQVUsRUFBRSxDQUFDO0VBQ25CLE1BQU0sS0FBSyxFQUFFLEdBQUc7RUFDaEIsTUFBSztFQUNMLElBQUksTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBQztBQUN6RDtFQUNBO0VBQ0EsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxNQUFLO0FBQy9CO0VBQ0E7RUFDQSxJQUFJLElBQUksQ0FBQyxhQUFhLEdBQUcsTUFBSztFQUM5QixJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSTtBQUMzQjtFQUNBO0VBQ0EsSUFBSSxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFDO0VBQ2hELElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBQztBQUM5QztFQUNBLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsV0FBVTtFQUN6QyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLFNBQVE7RUFDckMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFDO0FBQ3hDO0VBQ0EsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDO0VBQ3hDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQztBQUN0QztFQUNBO0VBQ0E7RUFDQSxHQUFHO0FBQ0g7RUFDQSxFQUFFLE1BQU0sQ0FBQyxHQUFHO0VBQ1o7RUFDQSxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLO0VBQ3pCLFFBQVEsU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSztFQUN0QyxRQUFRLEdBQUU7RUFDVixJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxFQUFDO0VBQ3BHLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLEVBQUM7RUFDdkUsR0FBRztBQUNIO0VBQ0EsRUFBRSxNQUFNLENBQUMsR0FBRztFQUNaLElBQUksT0FBTyxJQUFJLENBQUMsR0FBRztFQUNuQixHQUFHO0FBQ0g7RUFDQSxFQUFFLFVBQVUsQ0FBQyxHQUFHO0VBQ2hCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBQztFQUMzQyxJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSTtFQUN4QixHQUFHO0FBQ0g7RUFDQSxFQUFFLFVBQVUsQ0FBQyxHQUFHO0VBQ2hCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBQztFQUN4QyxJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBSztFQUN6QixHQUFHO0VBQ0g7O0VDdERBO0VBQ2UsTUFBTSxrQkFBa0IsU0FBUyxLQUFLLENBQUM7RUFDdEQ7RUFDQSxFQUFFLFdBQVcsQ0FBQyxDQUFDLE9BQU8sRUFBRTtFQUN4QixJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUM7QUFDbEI7RUFDQSxJQUFJLE1BQU0sUUFBUSxHQUFHO0VBQ3JCLE1BQU0sVUFBVSxFQUFFLENBQUM7RUFDbkIsTUFBSztBQUNMO0VBQ0EsSUFBSSxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFDO0VBQ3pELElBQUksTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLFdBQVU7QUFDMUM7RUFDQTtFQUNBLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUM7RUFDeEIsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBQztFQUN4QixJQUFJLElBQUksUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsU0FBUTtBQUM5QztFQUNBLElBQUksUUFBUSxVQUFVO0VBQ3RCLE1BQU0sS0FBSyxDQUFDO0VBQ1osUUFBUSxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsRUFBQztFQUM5RCxRQUFRLEtBQUs7RUFDYixNQUFNLEtBQUssQ0FBQztFQUNaLFFBQVEsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsRUFBQztFQUMvRCxRQUFRLEtBQUs7RUFDYixNQUFNLEtBQUssQ0FBQztFQUNaLFFBQVEsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsRUFBQztFQUMvRCxRQUFRLEtBQUs7RUFDYixNQUFNLEtBQUssQ0FBQyxDQUFDO0VBQ2IsTUFBTTtFQUNOLFFBQVEsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxFQUFDO0VBQ2hFLFFBQVEsS0FBSztFQUNiLEtBQUs7QUFDTDtFQUNBO0VBQ0EsSUFBSTtFQUNKLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDN0MsTUFBTSxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQzdCLE1BQU07RUFDTixNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxLQUFLO0FBQ0w7RUFDQTtFQUNBLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDMUIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osS0FBSztBQUNMO0VBQ0EsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDM0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7QUFDM0M7RUFDQTtFQUNBLElBQUksTUFBTSxRQUFRLEdBQUcsQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQztFQUN2RixJQUFJLElBQUksUUFBUSxDQUFDLGNBQWMsRUFBRTtFQUNqQyxNQUFNLElBQUksQ0FBQyxhQUFhLEdBQUcsbUJBQW1CLEdBQUcsU0FBUTtFQUN6RCxLQUFLLE1BQU07RUFDWCxNQUFNLElBQUksQ0FBQyxhQUFhLEdBQUcsU0FBUTtFQUNuQyxLQUFLO0VBQ0wsSUFBSSxJQUFJLENBQUMsV0FBVztFQUNwQixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUNyRCxVQUFVLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFDNUU7RUFDQSxJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFXO0VBQzlDLEdBQUc7QUFDSDtFQUNBLEVBQUUsV0FBVyxXQUFXLENBQUMsR0FBRztFQUM1QixJQUFJLE9BQU8sVUFBVTtFQUNyQixHQUFHO0VBQ0gsQ0FBQztBQUNEO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7QUFDQTtFQUNBO0VBQ0EsU0FBUyxlQUFlLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDbkMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU8sR0FBRztBQUMvQztFQUNBLEVBQUUsSUFBSSxRQUFRO0VBQ2QsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUU7RUFDaEIsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUs7RUFDdkIsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsTUFBTTtFQUMzQixZQUFZLENBQUMsR0FBRyxNQUFLO0FBQ3JCO0VBQ0EsRUFBRSxJQUFJLEtBQUs7RUFDWCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRztFQUNmLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRTtFQUNqQyxVQUFVLElBQUc7QUFDYjtFQUNBLEVBQUUsSUFBSSxPQUFPO0VBQ2IsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUU7RUFDaEIsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEdBQUc7RUFDbkMsVUFBVSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUc7QUFDM0I7RUFDQSxFQUFFLElBQUksU0FBUztFQUNmLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHO0VBQ2YsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRTtFQUM5QyxVQUFVLElBQUc7QUFDYjtFQUNBLEVBQUUsSUFBSSxXQUFXO0VBQ2pCLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7QUFDOUI7RUFDQSxFQUFFLE9BQU8sUUFBUSxHQUFHLEtBQUssR0FBRyxPQUFPLEdBQUcsU0FBUyxHQUFHLFdBQVc7RUFDN0QsQ0FBQztBQUNEO0VBQ0EsU0FBUyxXQUFXLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQ3RDO0VBQ0E7RUFDQTtBQUNBO0VBQ0EsRUFBRSxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBQztFQUN0QixFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsR0FBRTtFQUNkLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxHQUFFO0FBQ2Q7RUFDQSxFQUFFLElBQUksRUFBRSxHQUFHLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFDO0VBQ3RCLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxHQUFFO0VBQ2QsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUU7QUFDZDtFQUNBLEVBQUUsSUFBSSxNQUFNLEdBQUcsTUFBSztBQUNwQjtFQUNBLEVBQUUsSUFBSSxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtFQUNuRCxJQUFJLE1BQU0sR0FBRyxLQUFJO0VBQ2pCLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxNQUFNO0VBQ2Y7O0VDckllLE1BQU0sV0FBVyxTQUFTLEtBQUssQ0FBQztFQUMvQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLE9BQU8sRUFBRTtFQUN4QixJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUM7QUFDbEI7RUFDQSxJQUFJLE1BQU0sUUFBUSxHQUFHO0VBQ3JCLE1BQU0sVUFBVSxFQUFFLENBQUM7RUFDbkIsTUFBTSxLQUFLLEVBQUUsR0FBRztFQUNoQixNQUFLO0VBQ0wsSUFBSSxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFDO0FBQ3pEO0VBQ0EsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxNQUFLO0FBQy9CO0VBQ0E7RUFDQSxJQUFJLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFDO0VBQ25DLElBQUksTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUM7RUFDbkMsSUFBSSxNQUFNLEdBQUcsR0FBRyxDQUFDLEdBQUcsRUFBQztBQUNyQjtFQUNBLElBQUksSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLEdBQUcsS0FBSyxHQUFHLEVBQUM7RUFDdEMsSUFBSSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksR0FBRyxJQUFHO0FBQ2pDO0VBQ0EsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFFO0VBQ2pCLEdBQUc7QUFDSDtFQUNBLEVBQUUsV0FBVyxXQUFXLENBQUMsR0FBRztFQUM1QixJQUFJLE9BQU8sVUFBVTtFQUNyQixHQUFHO0VBQ0g7O1FDR3NCLFlBQVk7TUFTaEMsWUFBYSxJQUFtQixFQUFFLFdBQXlCOztVQUN6RCxXQUFXLENBQUMsS0FBSyxTQUFHLFdBQVcsQ0FBQyxLQUFLLG1DQUFJLEdBQUcsQ0FBQTtVQUM1QyxXQUFXLENBQUMsTUFBTSxTQUFHLFdBQVcsQ0FBQyxNQUFNLG1DQUFJLEdBQUcsQ0FBQTtVQUU5QyxJQUFJLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUE7VUFDOUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFBO1VBQ2hDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO1VBQ2hCLElBQUksQ0FBQyxRQUFRLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQTtVQUVwQyxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQTs7VUFHaEIsSUFBSSxDQUFDLEdBQUcsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1VBQzVDLElBQUksQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFzQixDQUFBO1VBQ3BGLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUE7VUFDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtPQUNqQztNQUVELE1BQU07VUFDSixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUE7T0FDaEI7TUFJRCxZQUFZLENBQUUsS0FBZ0IsRUFBRSxRQUFpQixJQUFJO1VBQ25ELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUE7O1VBRzFCLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtVQUMzRCxPQUFPLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2NBQzNCLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtXQUN0QjtVQUVELElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7Y0FDbkIsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtjQUMzQyxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO2NBQ2hELEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO2NBQzVCLEtBQUssQ0FBQyxTQUFTLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUE7Y0FDaEMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFBO2NBQ2pDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQTtjQUVoQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUE7Y0FDaEMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtjQUM3QixTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBOztjQUc1QixJQUFJLFVBQVUsQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDLFlBQVksR0FBRyxDQUFDLEVBQUU7O2tCQUV4RCxNQUFNLFlBQVksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQTtrQkFDNUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUE7ZUFDdkM7OztjQUtELElBQUksS0FBSyxFQUFFO2tCQUNULE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUE7a0JBQ2hDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxNQUFNLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRTtzQkFDdkYsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUE7c0JBQzlELE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTttQkFDbEM7a0JBQ0QsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFO3NCQUN2RixLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFBO3NCQUNyRCxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7bUJBQ2xDO2VBQ0Y7V0FDRixDQUFDLENBQUE7O1VBR0YsSUFBSSxLQUFLLEVBQUU7Y0FDWCxNQUFNLGFBQWEsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBa0IsQ0FBQTtjQUNwRixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtrQkFDN0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO3NCQUMvQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO21CQUNqRDtlQUNGO1dBQ0E7T0FDRjtNQUVELFVBQVU7VUFDUixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2NBQ25CLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQTtjQUNoQixDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUE7V0FDbkIsQ0FBQyxDQUFBO1VBQ0YsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQTtPQUN6QjtNQUVELFVBQVU7VUFDUixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2NBQ25CLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQTtjQUNoQixDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUE7V0FDbkIsQ0FBQyxDQUFBO1VBQ0YsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQTtPQUN6Qjs7TUFJRCxJQUFJLFNBQVM7VUFDWCxPQUFPLEVBQUUsQ0FBQTtPQUNWO01BRUQsS0FBSyxDQUFFLEVBQVc7VUFDaEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO2NBQ2hDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUE7V0FDWixDQUFDLENBQUE7T0FDSDtNQUVELE1BQU0sQ0FBRSxLQUFjO1VBQ3BCLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztjQUNoQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1dBQ2hCLENBQUMsQ0FBQTtVQUNGLE9BQU8sS0FBSyxDQUFBO09BQ2I7TUFFRCxTQUFTLENBQUUsQ0FBVSxFQUFFLENBQVU7VUFDL0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO2NBQ2hDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1dBQ2xCLENBQUMsQ0FBQTtPQUNIO01BRUQsWUFBWTtVQUNWLE1BQU0sS0FBSyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtVQUN6QyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1VBQ2xCLE9BQU8sS0FBSyxDQUFBO09BQ2I7Ozs7Ozs7O01BU0QsVUFBVSxDQUFFLEtBQWMsRUFBRSxNQUFjLEVBQUUsTUFBZTtVQUN6RCxJQUFJLE9BQU8sR0FBVyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtVQUMvQyxJQUFJLFdBQVcsR0FBVyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtVQUNuRCxNQUFNLFVBQVUsR0FBWSxXQUFXLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUE7VUFDckQsTUFBTSxXQUFXLEdBQVksV0FBVyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFBO1VBQ3RELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxJQUFJLFVBQVUsRUFBRSxDQUFDLE1BQU0sR0FBRyxNQUFNLElBQUksV0FBVyxDQUFDLENBQUE7VUFDbkYsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQTs7VUFHZCxPQUFPLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7VUFDbkMsV0FBVyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1VBQ3ZDLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1VBQy9DLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLE1BQU0sR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1VBRTNELE9BQU8sRUFBRSxDQUFBO09BQ1Y7R0FDRjtRQUVxQixRQUFTLFNBQVEsUUFBUTtNQUk3QyxZQUFhLElBQWtCLEVBQUUsSUFBa0I7VUFDakQsS0FBSyxFQUFFLENBQUE7VUFDUCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtVQUNoQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtVQUNoQixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFBOzs7Ozs7O09BUXpCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztNQXNCRCxNQUFNLEtBQW9CLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQSxFQUFFO01BRXJELE1BQU0sS0FBYSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBLEVBQUU7TUFFdkMsVUFBVTtVQUNSLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQTtVQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO09BQ3ZCO01BRUQsVUFBVTtVQUNSLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQTtVQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO09BQ3ZCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQ2hQSCxJQUFJLFFBQVEsR0FBR0Esb0JBQW9DLENBQUMsVUFBVSxNQUFNLEVBQUUsT0FBTyxFQUFFO0VBQy9FO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0FBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0FBQ0E7RUFDQSxFQUFFLENBQUMsVUFBVSxJQUFJLEVBQUU7QUFFbkI7RUFDQTtFQUNBO0VBQ0E7RUFDQSxJQUFJLElBQUksYUFBYSxHQUFHLEtBQUk7QUFDNUI7RUFDQTtFQUNBLElBQUksSUFBSSxDQUFDLEdBQUc7RUFDWixNQUFNLENBQUMsRUFBRSxDQUFDO0VBQ1YsTUFBTSxDQUFDLEVBQUUsQ0FBQztFQUNWLE1BQU0sQ0FBQyxFQUFFLENBQUM7RUFDVixNQUFLO0FBQ0w7RUFDQSxJQUFJLFNBQVMsV0FBVyxFQUFFLElBQUksRUFBRTtFQUNoQyxNQUFNLFNBQVMsZ0JBQWdCLElBQUk7RUFDbkMsUUFBUSxJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUM7RUFDL0MsUUFBUSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSTtFQUNwQyxRQUFRLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQUs7RUFDL0IsUUFBUSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFPO0VBQ25DLE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLFNBQVMscUJBQXFCLElBQUksRUFBRTtFQUMxQyxNQUFNLHFCQUFxQixDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsVUFBUztFQUN2RCxNQUFNLGdCQUFnQixDQUFDLFNBQVMsR0FBRyxJQUFJLHFCQUFxQixHQUFFO0FBQzlEO0VBQ0EsTUFBTSxPQUFPLGdCQUFnQjtFQUM3QixLQUFLO0FBQ0w7RUFDQSxJQUFJLElBQUksY0FBYyxHQUFHLFFBQVEsQ0FBQyxjQUFjLEdBQUcsV0FBVyxDQUFDLGdCQUFnQixFQUFDO0VBQ2hGLElBQUksSUFBSSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLGtCQUFrQixFQUFDO0FBQ3RGO0VBQ0EsSUFBSSxTQUFTLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTtFQUN0QyxRQUFRLGlCQUFpQixHQUFFO0VBQzNCLE9BQU87RUFDUCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7RUFDbEIsS0FBSztBQUNMO0VBQ0EsSUFBSSxTQUFTLGlCQUFpQixJQUFJO0VBQ2xDLE1BQU0sTUFBTSxJQUFJLGdCQUFnQixFQUFFO0VBQ2xDLEtBQUs7QUFDTDtFQUNBLElBQUksSUFBSSxLQUFLLEdBQUcsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQ2xDLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBQztFQUNyQyxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUM7QUFDM0Q7RUFDQSxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUM7RUFDMUIsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFDO0FBQzFCO0VBQ0EsTUFBTSxJQUFJLENBQUMsR0FBRyxTQUFRO0VBQ3RCLE1BQU0sSUFBSSxFQUFDO0FBQ1g7RUFDQSxNQUFNLElBQUksRUFBRSxLQUFLLFNBQVMsSUFBSSxFQUFFLEtBQUssSUFBSSxFQUFFLENBRXBDLE1BQU0sSUFBSSxFQUFFLEtBQUssU0FBUyxFQUFFO0VBQ25DLFFBQVEsQ0FBQyxHQUFHLEdBQUU7RUFDZCxRQUFRLENBQUMsR0FBRyxHQUFFO0VBQ2QsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDakIsT0FBTyxNQUFNO0VBQ2IsUUFBUSxRQUFRLE9BQU8sRUFBRTtFQUN6QixVQUFVLEtBQUssUUFBUTtFQUN2QixVQUFVO0VBQ1YsWUFBWSxJQUFJLEdBQUcsSUFBSSxFQUFFLElBQUksR0FBRyxJQUFJLEVBQUUsRUFBRTtFQUN4QyxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBQztFQUN0QixjQUFjLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBQztFQUN0QixjQUFjLElBQUksR0FBRyxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBQyxFQUFFO0VBQzFDLGFBQWEsTUFBTSxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUU7RUFDaEMsY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBQztFQUN2QixjQUFjLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFDLEVBQUU7RUFDeEMsYUFBYSxNQUFNO0VBQ25CLGNBQWMsaUJBQWlCLEdBQUU7RUFDakMsYUFBYTtFQUNiLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFDO0VBQ3JCLFlBQVksS0FBSztFQUNqQixXQUFXO0VBQ1gsVUFBVSxLQUFLLFFBQVE7RUFDdkIsVUFBVTtFQUNWLFlBQVksSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFO0VBQ3hCLGNBQWMsQ0FBQyxHQUFHLEdBQUU7RUFDcEIsY0FBYyxFQUFFLEdBQUcsQ0FBQyxHQUFFO0VBQ3RCLGFBQWE7QUFDYjtFQUNBLFlBQVksSUFBSSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtFQUM5QixjQUFjLENBQUMsR0FBRyxHQUFFO0VBQ3BCLGFBQWEsTUFBTSxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUU7RUFDL0IsY0FBYyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUU7RUFDM0IsZ0JBQWdCLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQztFQUMxRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUM7RUFDdkIsZUFBZTtBQUNmO0VBQ0E7RUFDQTtBQUNBO0VBQ0EsY0FBYyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtFQUN2QyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFDO0FBQ3JDO0VBQ0EsZ0JBQWdCLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRTtFQUM5QixrQkFBa0IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtFQUNsQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFDO0VBQzdCLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDN0IsbUJBQW1CLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0VBQ3BDLG9CQUFvQixDQUFDLEdBQUcsRUFBQztFQUN6QixvQkFBb0IsQ0FBQyxHQUFHLEVBQUM7RUFDekIsbUJBQW1CLE1BQU07RUFDekIsb0JBQW9CLENBQUMsR0FBRyxFQUFDO0VBQ3pCLG9CQUFvQixDQUFDLEdBQUcsRUFBQztFQUN6QixtQkFBbUI7RUFDbkIsa0JBQWtCLEtBQUs7RUFDdkIsaUJBQWlCLE1BQU07RUFDdkIsa0JBQWtCLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRTtFQUM5QixvQkFBb0IsQ0FBQyxJQUFJLEVBQUM7RUFDMUIsb0JBQW9CLENBQUMsSUFBSSxFQUFDO0VBQzFCLG1CQUFtQixNQUFNO0VBQ3pCLG9CQUFvQixDQUFDLElBQUksRUFBQztFQUMxQixvQkFBb0IsQ0FBQyxJQUFJLEVBQUM7RUFDMUIsbUJBQW1CO0FBQ25CO0VBQ0Esa0JBQWtCLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtFQUM3QixvQkFBb0IsQ0FBQyxHQUFHLEVBQUM7RUFDekIsb0JBQW9CLENBQUMsR0FBRyxFQUFDO0VBQ3pCLG1CQUFtQixNQUFNO0VBQ3pCLG9CQUFvQixDQUFDLEdBQUcsRUFBQztFQUN6QixvQkFBb0IsQ0FBQyxHQUFHLEVBQUM7RUFDekIsbUJBQW1CO0VBQ25CLGlCQUFpQjtFQUNqQixlQUFlO0VBQ2YsY0FBYyxDQUFDLElBQUksRUFBQztFQUNwQixhQUFhLE1BQU0sSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQy9DLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFHO0VBQ3pCLGFBQWE7RUFDYixZQUFZLEtBQUs7RUFDakIsV0FBVztFQUNYLFVBQVUsS0FBSyxRQUFRO0VBQ3ZCLFVBQVU7RUFDVixZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBQztBQUNsQztFQUNBLFlBQVksSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFLEVBQUUsaUJBQWlCLEdBQUUsRUFBRTtBQUNuRDtFQUNBLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0VBQzlCLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBQztFQUNwQixjQUFjLENBQUMsR0FBRTtFQUNqQixhQUFhLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0VBQ3JDLGNBQWMsQ0FBQyxHQUFFO0VBQ2pCLGFBQWE7QUFDYjtFQUNBLFlBQVksSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7RUFDcEMsY0FBYyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNuQyxhQUFhLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0VBQ3pELGNBQWMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0VBQ2hDLGdCQUFnQixDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNyQyxlQUFlO0VBQ2YsY0FBYyxDQUFDLEdBQUU7QUFDakI7RUFDQTtFQUNBLGNBQWMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7RUFDdEgsZ0JBQWdCLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNuQyxnQkFBZ0IsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUM7RUFDN0MsZ0JBQWdCLENBQUMsR0FBRTtFQUNuQixlQUFlO0FBQ2Y7RUFDQTtFQUNBLGNBQWMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7RUFDeEYsZ0JBQWdCLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDdkMsZ0JBQWdCLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDckQsZ0JBQWdCLENBQUMsSUFBSSxFQUFDO0VBQ3RCLGVBQWU7RUFDZixhQUFhLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtFQUM3RCxjQUFjLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNqQyxjQUFjLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDckMsY0FBYyxDQUFDLElBQUksRUFBQztFQUNwQixhQUFhLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtFQUM3RCxjQUFjLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNqQyxjQUFjLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDckMsY0FBYyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3JDLGNBQWMsQ0FBQyxJQUFJLEVBQUM7RUFDcEIsYUFBYTtBQUNiO0VBQ0EsWUFBWSxJQUFJLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO0VBQy9CLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFDO0VBQ3ZCLGNBQWMsQ0FBQztFQUNmLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDekMsY0FBYyxLQUFLO0VBQ25CLGFBQWE7QUFDYjtFQUNBO0VBQ0EsV0FBVztFQUNYLFVBQVU7RUFDVixZQUFZLGlCQUFpQixHQUFFO0VBQy9CLFNBQVM7RUFDVCxPQUFPO0FBQ1A7RUFDQSxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtFQUNuQixRQUFRLE1BQU0sSUFBSSxjQUFjLEVBQUU7RUFDbEMsT0FBTztBQUNQO0VBQ0EsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBQztFQUMxQixNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDdkIsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDO0VBQ3ZCLE1BQUs7QUFDTDtFQUNBLElBQUksU0FBUyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDOUIsTUFBTSxJQUFJLENBQUMsR0FBRyxFQUFDO0VBQ2YsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRTtFQUM5QyxRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtFQUNuQixVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBQztFQUN6QixTQUFTO0VBQ1QsT0FBTztFQUNQLE1BQU0sT0FBTyxDQUFDO0VBQ2QsS0FBSztBQUNMO0VBQ0EsSUFBSSxTQUFTLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzdCLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7RUFDeEIsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQ2hCLE9BQU87QUFDUDtFQUNBLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7RUFDeEIsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQ2hCLE9BQU87QUFDUDtFQUNBLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQztFQUNqQixNQUFNLEVBQUUsT0FBTyxDQUFDLEVBQUU7QUFDbEI7RUFDQTtFQUNBO0VBQ0E7RUFDQTtBQUNBO0VBQ0EsTUFBTSxJQUFJLEdBQUcsR0FBRyxFQUFFLEdBQUcsRUFBQztFQUN0QixNQUFNLElBQUksQ0FBQyxHQUFHLEVBQUM7QUFDZjtFQUNBLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQzdCLFFBQVEsR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsRUFBQztBQUMxQjtFQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsYUFBYSxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUU7RUFDM0MsT0FBTztFQUNQLE1BQU0sT0FBTyxDQUFDO0VBQ2QsS0FBSztBQUNMO0VBQ0EsSUFBSSxTQUFTLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtFQUNwQyxNQUFNLElBQUksSUFBSSxHQUFHLEVBQUM7RUFDbEIsTUFBTSxJQUFJLElBQUksR0FBRyxNQUFNLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUM7QUFDbkM7RUFDQSxNQUFNLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDcEM7QUFDQTtFQUNBLFFBQVEsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUU7QUFDdkM7RUFDQSxRQUFRLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBRSxHQUFHLEVBQUM7RUFDNUIsUUFBUSxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQUUsR0FBRyxFQUFDO0VBQzVCLE9BQU87RUFDUCxNQUFNLE9BQU8sQ0FBQztFQUNkLEtBQUs7QUFDTDtFQUNBLElBQUksU0FBUyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUN4QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRTtFQUMxQixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRTtBQUMxQjtFQUNBLE1BQU0sT0FBTyxDQUFDLEVBQUU7RUFDaEIsUUFBUSxDQUFDLElBQUksRUFBQztFQUNkLFFBQVEsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFO0VBQzVCLFFBQVEsQ0FBQyxJQUFJLEVBQUM7RUFDZCxRQUFRLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRTtFQUM1QixPQUFPO0VBQ1AsS0FDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsSUFBSSxTQUFTLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzdCLE1BQU0sSUFBSSxFQUFFLElBQUksWUFBWSxRQUFRLENBQUMsRUFBRTtFQUN2QyxRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUNqQyxPQUFPO0FBQ1A7RUFDQSxNQUFNLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0FBQ2pCO0VBQ0EsTUFBTSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEVBQUU7RUFDM0IsUUFBUSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQztFQUN6QixPQUFPLE1BQU07RUFDYixRQUFRLENBQUMsR0FBRyxFQUFDO0VBQ2IsT0FBTztBQUNQO0VBQ0EsTUFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDO0VBQ2xCLE1BQU0sSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUM7RUFDdEIsTUFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBQztFQUN0QixLQUFLO0FBQ0w7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxFQUFDO0FBQ3ZCO0VBQ0EsSUFBSSxRQUFRLENBQUMsU0FBUyxHQUFHO0FBQ3pCO0VBQ0EsTUFBTSxDQUFDLEVBQUUsQ0FBQztFQUNWLE1BQU0sQ0FBQyxFQUFFLENBQUM7RUFDVixNQUFNLENBQUMsRUFBRSxDQUFDO0FBQ1Y7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxHQUFHLEVBQUUsWUFBWTtFQUN2QixRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQzNDLE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEdBQUcsRUFBRSxZQUFZO0VBQ3ZCLFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ3JELE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDM0IsUUFBUSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNuQixRQUFRLE9BQU8sSUFBSSxRQUFRO0VBQzNCLFVBQVUsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ3BELFVBQVUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUN0QixTQUFTO0VBQ1QsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUMzQixRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ25CLFFBQVEsT0FBTyxJQUFJLFFBQVE7RUFDM0IsVUFBVSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDcEQsVUFBVSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ3RCLFNBQVM7RUFDVCxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxHQUFHLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzNCLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbkIsUUFBUSxPQUFPLElBQUksUUFBUTtFQUMzQixVQUFVLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ3JDLFVBQVUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUN0QixTQUFTO0VBQ1QsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUMzQixRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ25CLFFBQVEsT0FBTyxJQUFJLFFBQVE7RUFDM0IsVUFBVSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUNyQyxVQUFVLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDdEIsU0FBUztFQUNULE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEtBQUssRUFBRSxZQUFZO0VBQ3pCLFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUM7RUFDakMsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUMzQixRQUFRLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzVDLFVBQVUsT0FBTyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUM7RUFDbEMsU0FBUztBQUNUO0VBQ0EsUUFBUSxJQUFJLENBQUMsS0FBSyxTQUFTLEVBQUU7RUFDN0IsVUFBVSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUMxRCxTQUFTO0FBQ1Q7RUFDQSxRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ25CLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRTtFQUN2QyxVQUFVLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3hCLFNBQVM7QUFDVDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7QUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxRQUFRLE9BQU8sSUFBSSxRQUFRO0VBQzNCLFVBQVUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDbEQsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0VBQ3RCLFNBQVM7RUFDVCxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxHQUFHLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzNCLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7QUFDbkI7RUFDQTtBQUNBO0VBQ0EsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQzlFLE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDM0IsUUFBUSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztBQUNuQjtFQUNBO0FBQ0E7RUFDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDdkMsVUFBVSxPQUFPLElBQUksUUFBUSxFQUFFO0VBQy9CLFNBQVM7RUFDVCxRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDOUUsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sSUFBSSxFQUFFLFVBQVUsTUFBTSxFQUFFO0VBQzlCLFFBQVEsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxDQUFDLEVBQUM7QUFDMUM7RUFDQSxRQUFRLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzVDLFVBQVUsT0FBTyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUM7RUFDbEMsU0FBUztFQUNULFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztFQUNqRixPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxLQUFLLEVBQUUsVUFBVSxNQUFNLEVBQUU7RUFDL0IsUUFBUSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxJQUFJLENBQUMsRUFBQztBQUMxQztFQUNBLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDNUMsVUFBVSxPQUFPLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQztFQUNsQyxTQUFTO0VBQ1QsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0VBQ2xGLE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEtBQUssRUFBRSxVQUFVLE1BQU0sRUFBRTtFQUMvQixRQUFRLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxNQUFNLElBQUksQ0FBQyxFQUFDO0FBQzFDO0VBQ0EsUUFBUSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUM1QyxVQUFVLE9BQU8sSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDO0VBQ2xDLFNBQVM7RUFDVCxRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDbEYsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sT0FBTyxFQUFFLFlBQVk7RUFDM0IsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ3BELE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRTtFQUN4QixRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtFQUNuQixVQUFVLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNsRixTQUFTLE1BQU07RUFDZixVQUFVLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQ2hGLFNBQVM7RUFDVCxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxNQUFNLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzlCLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbkIsUUFBUSxPQUFPLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztFQUMzRCxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxPQUFPLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQy9CLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbkIsUUFBUSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBQztFQUM1RCxRQUFRLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDaEMsT0FBTztBQUNQO0VBQ0EsTUFBTSxRQUFRLEVBQUUsVUFBVSxHQUFHLEVBQUU7RUFDL0I7QUFDQTtFQUNBLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDNUMsVUFBVSxPQUFPLElBQUk7RUFDckIsU0FBUztBQUNUO0VBQ0EsUUFBUSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsV0FBVyxHQUFFO0FBQzNDO0VBQ0EsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLE1BQUs7QUFDMUI7RUFDQSxRQUFRLFNBQVMsR0FBRyxFQUFFLENBQUMsRUFBRTtFQUN6QixVQUFVLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsRUFBRSxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxF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RUFBRSxJQUFJLFlBQVksUUFBUSxDQUFDLEVBQUU7RUFDckMsTUFBTSxJQUFJLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFDO0VBQy9CLEtBQUs7RUFDTDtFQUNBO0VBQ0E7RUFDQSxJQUFJLElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRSxTQUFTLEdBQUcsS0FBSTtFQUNqRCxJQUFJLElBQUksU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDO0VBQzdFLElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBQztFQUM3QixJQUFJLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFFO0VBQ3RCLElBQUksT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO0VBQzlCLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFO0VBQ2hCO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDdkMsSUFBSSxNQUFNLENBQUMsR0FBRyxJQUFJLEtBQUssRUFBRSxHQUFHLENBQUM7RUFDN0IsUUFBUSxJQUFJLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQztFQUN6QixVQUFVLFFBQVEsQ0FBQyxJQUFJLEVBQUM7RUFDeEIsSUFBSSxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLHFCQUFxQixFQUFDO0VBQzdDLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsR0FBRTtFQUNwQixJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3hDLE1BQU0sTUFBTSxDQUFDLEdBQUcsRUFBRSxD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Q0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDekMsVUFBVSxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUNqRCxVQUFVLE1BQU0sRUFBRSxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUN2RCxVQUFVLE1BQU0sRUFBRSxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUN2RCxVQUFVLE1BQU0sRUFBRSxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUN2RCxVQUFVLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUU7RUFDdEQsVUFBVSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHO0VBQzdCLFlBQVksR0FBRyxFQUFFLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQztFQUNyQyxZQUFZLE1BQU0sRUFBRSxLQUFLO0VBQ3pCLFlBQVc7RUFDWCxTQUFTO0VBQ1QsUUFBUSxLQUFLO0VBQ2IsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsQ0FBQztFQUNiLE1BQU0sS0FBSyxDQUFDLEVBQUU7RUFDZCxRQUFRLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBQztFQUNsRSxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3pDLFVBQVUsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFR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LEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Y0FDaEQsVUFBVSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUE7Y0FDaEQsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQTtXQUNoRDs7VUFHRCxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBOztVQUV0RyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBOztVQUdyQyxVQUFVLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQTtVQUM1RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7O2NBRS9DLE1BQU0sS0FBSyxHQUFvQixFQUFFLENBQUE7Y0FDakMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7Y0FDdEMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLFNBQVMsQ0FBQTs7Y0FHcEUsTUFBTSxLQUFLLEdBQUcsSUFB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LEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUMxRixPQUFPLE1BQU07RUFDYixRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDeEYsT0FBTztFQUNQLEtBQUs7QUFDTDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxJQUFJLFFBQVEsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDN0I7RUFDQSxNQUFNLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDbEIsTUFBTSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQzVFLEtBQUs7QUFDTDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxJQUFJLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDOUI7RUFDQSxNQUFNLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDbEIsTUFBTSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQzdFLE1BQU0sT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQy9CLEtBQUs7QUFDTDtFQUNBLElBQUksVUFBVSxFQUFFLFNBQVMsR0FBRyxFQUFFO0FBQzlCO0VBQ0E7QUFDQTtFQUNBLE1BQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO0VBQ2hELFFBQVEsT0FBTyxJQUFJLENBQUM7RUFDcEIsT0FBTztBQUNQO0VBQ0EsTUFBTSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO0FBQ2hEO0VBQ0EsTUFBTSxHQUFHLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQztBQUN6QjtFQUNBLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxFQUFFO0VBQ3RCLFFBQVEsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUM7RUFDMUIsVUFBVSxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3BDLFFBQVEsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDekQsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUM1QyxRQUFRLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcs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QztFQUNBLE1BQU0sSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUM7QUFDNUM7RUFDQSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN2QjtFQUNBLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUNiLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNkO0VBQ0EsTUFBTSxJQUFJLENBQUM7RUFDWCxRQUFRLEdBQUcsSUFBSSxHQUFHLENBQUM7QUFDbkI7RUFDQSxNQUFNLElBQUksTUFBTSxFQUFFO0FBQ2xCO0VBQ0EsUUFBUSxLQUFLLElBQUksQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSTtFQUNwQyxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUMzQixVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDakIsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO0VBQ2xCLFNBQVM7RUFDVCxRQUFRLEdBQUcsSUFBSSxHQUFHLENBQUM7RUFDbkIsUUFBUSxLQUFLLElBQUksQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSTtFQUNwQyxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUMzQixVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDakIsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO0VBQ2xCLFNBQVM7RUFDVCxRQUFRLEdBQUcsSUFBSSxHQUFHLENBQUM7RUFDbkIsT0FBTyxNQUFNO0VBQ2IsUUFBUSxLQUFLLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUk7RUFDdEMsVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDM0IsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ2pCLFVBQVUsQ0FBQyxJ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O0FBQ2xDO0VBQ0EsRUFBRSxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsS0FBSyxFQUFFO0VBQzlCLEtBQUssU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDaEMsS0FBSyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQztBQUNwQztFQUNBLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDMUIsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBQztFQUMxQixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFDO0VBQ3BDLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDMUIsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFBQztFQUNwQyxDQUFDO0FBQ0Q7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ08sU0FBUyxjQUFjLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRTtFQUNwRCxFQUFFLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUN2QyxFQUFFLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUN2QyxFQUFFLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLEVB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QUFBO2NBQzNFLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFBOzs7Y0FJaEYsTUFBTSxLQUFLLEdBQTZCO2tCQUN0QyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztrQkFDaEMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7a0JBQ2pDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO2VBQ2xDLENBQUE7OztjQUlELElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO2tCQUMxQixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtlQUNoRDttQkFBTTtrQkFDTCxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtlQUNoRDtjQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7a0JBQzFCLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtzQkFB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QUMsQ0FBMEUsY0FBYyxDQUFDLENBQUMsR0FBZSxDQUFDLENBQUNFLGNBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksRUFBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLHVVQUF1VSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsR0FBRyxVQUFVLEdBQUcsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFNLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFJLFVBQVUsRUFBRSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU0sUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGtDQUFrQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHlEQUF5RCxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxD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
