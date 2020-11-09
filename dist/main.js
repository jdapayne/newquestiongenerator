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
      var coordX = e.type === 'touchmove' ? e.touches[0].clientX : e.pageX;
      var index = coordX - this.sliderLeft - (this.pointerWidth / 2);

      index = Math.round(index / this.step);

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

  /* RNGs / selectors */

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

  function randMultBetween (min, max, n) {
    // return a random multiple of n between n and m (inclusive if possible)
    min = Math.ceil(min / n) * n;
    max = Math.floor(max / n) * n; // could check divisibility first to maximise performace, but I'm sure the hit isn't bad

    return randBetween(min / n, max / n) * n
  }

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

  var mustache = createCommonjsModule(function (module, exports) {
  // This file has been generated from mustache.mjs
  (function (global, factory) {
     module.exports = factory() ;
  }(commonjsGlobal, (function () {
    /*!
     * mustache.js - Logic-less {{mustache}} templates with JavaScript
     * http://github.com/janl/mustache.js
     */

    var objectToString = Object.prototype.toString;
    var isArray = Array.isArray || function isArrayPolyfill (object) {
      return objectToString.call(object) === '[object Array]';
    };

    function isFunction (object) {
      return typeof object === 'function';
    }

    /**
     * More correct typeof string handling array
     * which normally returns typeof 'object'
     */
    function typeStr (obj) {
      return isArray(obj) ? 'array' : typeof obj;
    }

    function escapeRegExp (string) {
      return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
    }

    /**
     * Null safe way of checking whether or not an object,
     * including its prototype, has a given property
     */
    function hasProperty (obj, propName) {
      return obj != null && typeof obj === 'object' && (propName in obj);
    }

    /**
     * Safe way of detecting whether or not the given thing is a primitive and
     * whether it has the given property
     */
    function primitiveHasOwnProperty (primitive, propName) {
      return (
        primitive != null
        && typeof primitive !== 'object'
        && primitive.hasOwnProperty
        && primitive.hasOwnProperty(propName)
      );
    }

    // Workaround for https://issues.apache.org/jira/browse/COUCHDB-577
    // See https://github.com/janl/mustache.js/issues/189
    var regExpTest = RegExp.prototype.test;
    function testRegExp (re, string) {
      return regExpTest.call(re, string);
    }

    var nonSpaceRe = /\S/;
    function isWhitespace (string) {
      return !testRegExp(nonSpaceRe, string);
    }

    var entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };

    function escapeHtml (string) {
      return String(string).replace(/[&<>"'`=\/]/g, function fromEntityMap (s) {
        return entityMap[s];
      });
    }

    var whiteRe = /\s*/;
    var spaceRe = /\s+/;
    var equalsRe = /\s*=/;
    var curlyRe = /\s*\}/;
    var tagRe = /#|\^|\/|>|\{|&|=|!/;

    /**
     * Breaks up the given `template` string into a tree of tokens. If the `tags`
     * argument is given here it must be an array with two string values: the
     * opening and closing tags used in the template (e.g. [ "<%", "%>" ]). Of
     * course, the default is to use mustaches (i.e. mustache.tags).
     *
     * A token is an array with at least 4 elements. The first element is the
     * mustache symbol that was used inside the tag, e.g. "#" or "&". If the tag
     * did not contain a symbol (i.e. {{myValue}}) this element is "name". For
     * all text that appears outside a symbol this element is "text".
     *
     * The second element of a token is its "value". For mustache tags this is
     * whatever else was inside the tag besides the opening symbol. For text tokens
     * this is the text itself.
     *
     * The third and fourth elements of the token are the start and end indices,
     * respectively, of the token in the original template.
     *
     * Tokens that are the root node of a subtree contain two more elements: 1) an
     * array of tokens in the subtree and 2) the index in the original template at
     * which the closing tag for that section begins.
     *
     * Tokens for partials also contain two more elements: 1) a string value of
     * indendation prior to that tag and 2) the index of that tag on that line -
     * eg a value of 2 indicates the partial is the third tag on this line.
     */
    function parseTemplate (template, tags) {
      if (!template)
        return [];
      var lineHasNonSpace = false;
      var sections = [];     // Stack to hold section tokens
      var tokens = [];       // Buffer to hold the tokens
      var spaces = [];       // Indices of whitespace tokens on the current line
      var hasTag = false;    // Is there a {{tag}} on the current line?
      var nonSpace = false;  // Is there a non-space char on the current line?
      var indentation = '';  // Tracks indentation for tags that use it
      var tagIndex = 0;      // Stores a count of number of tags encountered on a line

      // Strips all whitespace tokens array for the current line
      // if there was a {{#tag}} on it and otherwise only space.
      function stripSpace () {
        if (hasTag && !nonSpace) {
          while (spaces.length)
            delete tokens[spaces.pop()];
        } else {
          spaces = [];
        }

        hasTag = false;
        nonSpace = false;
      }

      var openingTagRe, closingTagRe, closingCurlyRe;
      function compileTags (tagsToCompile) {
        if (typeof tagsToCompile === 'string')
          tagsToCompile = tagsToCompile.split(spaceRe, 2);

        if (!isArray(tagsToCompile) || tagsToCompile.length !== 2)
          throw new Error('Invalid tags: ' + tagsToCompile);

        openingTagRe = new RegExp(escapeRegExp(tagsToCompile[0]) + '\\s*');
        closingTagRe = new RegExp('\\s*' + escapeRegExp(tagsToCompile[1]));
        closingCurlyRe = new RegExp('\\s*' + escapeRegExp('}' + tagsToCompile[1]));
      }

      compileTags(tags || mustache.tags);

      var scanner = new Scanner(template);

      var start, type, value, chr, token, openSection;
      while (!scanner.eos()) {
        start = scanner.pos;

        // Match any text between tags.
        value = scanner.scanUntil(openingTagRe);

        if (value) {
          for (var i = 0, valueLength = value.length; i < valueLength; ++i) {
            chr = value.charAt(i);

            if (isWhitespace(chr)) {
              spaces.push(tokens.length);
              indentation += chr;
            } else {
              nonSpace = true;
              lineHasNonSpace = true;
              indentation += ' ';
            }

            tokens.push([ 'text', chr, start, start + 1 ]);
            start += 1;

            // Check for whitespace on the current line.
            if (chr === '\n') {
              stripSpace();
              indentation = '';
              tagIndex = 0;
              lineHasNonSpace = false;
            }
          }
        }

        // Match the opening tag.
        if (!scanner.scan(openingTagRe))
          break;

        hasTag = true;

        // Get the tag type.
        type = scanner.scan(tagRe) || 'name';
        scanner.scan(whiteRe);

        // Get the tag value.
        if (type === '=') {
          value = scanner.scanUntil(equalsRe);
          scanner.scan(equalsRe);
          scanner.scanUntil(closingTagRe);
        } else if (type === '{') {
          value = scanner.scanUntil(closingCurlyRe);
          scanner.scan(curlyRe);
          scanner.scanUntil(closingTagRe);
          type = '&';
        } else {
          value = scanner.scanUntil(closingTagRe);
        }

        // Match the closing tag.
        if (!scanner.scan(closingTagRe))
          throw new Error('Unclosed tag at ' + scanner.pos);

        if (type == '>') {
          token = [ type, value, start, scanner.pos, indentation, tagIndex, lineHasNonSpace ];
        } else {
          token = [ type, value, start, scanner.pos ];
        }
        tagIndex++;
        tokens.push(token);

        if (type === '#' || type === '^') {
          sections.push(token);
        } else if (type === '/') {
          // Check section nesting.
          openSection = sections.pop();

          if (!openSection)
            throw new Error('Unopened section "' + value + '" at ' + start);

          if (openSection[1] !== value)
            throw new Error('Unclosed section "' + openSection[1] + '" at ' + start);
        } else if (type === 'name' || type === '{' || type === '&') {
          nonSpace = true;
        } else if (type === '=') {
          // Set the tags for the next time around.
          compileTags(value);
        }
      }

      stripSpace();

      // Make sure there are no open sections when we're done.
      openSection = sections.pop();

      if (openSection)
        throw new Error('Unclosed section "' + openSection[1] + '" at ' + scanner.pos);

      return nestTokens(squashTokens(tokens));
    }

    /**
     * Combines the values of consecutive text tokens in the given `tokens` array
     * to a single token.
     */
    function squashTokens (tokens) {
      var squashedTokens = [];

      var token, lastToken;
      for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
        token = tokens[i];

        if (token) {
          if (token[0] === 'text' && lastToken && lastToken[0] === 'text') {
            lastToken[1] += token[1];
            lastToken[3] = token[3];
          } else {
            squashedTokens.push(token);
            lastToken = token;
          }
        }
      }

      return squashedTokens;
    }

    /**
     * Forms the given array of `tokens` into a nested tree structure where
     * tokens that represent a section have two additional items: 1) an array of
     * all tokens that appear in that section and 2) the index in the original
     * template that represents the end of that section.
     */
    function nestTokens (tokens) {
      var nestedTokens = [];
      var collector = nestedTokens;
      var sections = [];

      var token, section;
      for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
        token = tokens[i];

        switch (token[0]) {
          case '#':
          case '^':
            collector.push(token);
            sections.push(token);
            collector = token[4] = [];
            break;
          case '/':
            section = sections.pop();
            section[5] = token[2];
            collector = sections.length > 0 ? sections[sections.length - 1][4] : nestedTokens;
            break;
          default:
            collector.push(token);
        }
      }

      return nestedTokens;
    }

    /**
     * A simple string scanner that is used by the template parser to find
     * tokens in template strings.
     */
    function Scanner (string) {
      this.string = string;
      this.tail = string;
      this.pos = 0;
    }

    /**
     * Returns `true` if the tail is empty (end of string).
     */
    Scanner.prototype.eos = function eos () {
      return this.tail === '';
    };

    /**
     * Tries to match the given regular expression at the current position.
     * Returns the matched text if it can match, the empty string otherwise.
     */
    Scanner.prototype.scan = function scan (re) {
      var match = this.tail.match(re);

      if (!match || match.index !== 0)
        return '';

      var string = match[0];

      this.tail = this.tail.substring(string.length);
      this.pos += string.length;

      return string;
    };

    /**
     * Skips all text until the given regular expression can be matched. Returns
     * the skipped string, which is the entire tail if no match can be made.
     */
    Scanner.prototype.scanUntil = function scanUntil (re) {
      var index = this.tail.search(re), match;

      switch (index) {
        case -1:
          match = this.tail;
          this.tail = '';
          break;
        case 0:
          match = '';
          break;
        default:
          match = this.tail.substring(0, index);
          this.tail = this.tail.substring(index);
      }

      this.pos += match.length;

      return match;
    };

    /**
     * Represents a rendering context by wrapping a view object and
     * maintaining a reference to the parent context.
     */
    function Context (view, parentContext) {
      this.view = view;
      this.cache = { '.': this.view };
      this.parent = parentContext;
    }

    /**
     * Creates a new context using the given view with this context
     * as the parent.
     */
    Context.prototype.push = function push (view) {
      return new Context(view, this);
    };

    /**
     * Returns the value of the given name in this context, traversing
     * up the context hierarchy if the value is absent in this context's view.
     */
    Context.prototype.lookup = function lookup (name) {
      var cache = this.cache;

      var value;
      if (cache.hasOwnProperty(name)) {
        value = cache[name];
      } else {
        var context = this, intermediateValue, names, index, lookupHit = false;

        while (context) {
          if (name.indexOf('.') > 0) {
            intermediateValue = context.view;
            names = name.split('.');
            index = 0;

            /**
             * Using the dot notion path in `name`, we descend through the
             * nested objects.
             *
             * To be certain that the lookup has been successful, we have to
             * check if the last object in the path actually has the property
             * we are looking for. We store the result in `lookupHit`.
             *
             * This is specially necessary for when the value has been set to
             * `undefined` and we want to avoid looking up parent contexts.
             *
             * In the case where dot notation is used, we consider the lookup
             * to be successful even if the last "object" in the path is
             * not actually an object but a primitive (e.g., a string, or an
             * integer), because it is sometimes useful to access a property
             * of an autoboxed primitive, such as the length of a string.
             **/
            while (intermediateValue != null && index < names.length) {
              if (index === names.length - 1)
                lookupHit = (
                  hasProperty(intermediateValue, names[index])
                  || primitiveHasOwnProperty(intermediateValue, names[index])
                );

              intermediateValue = intermediateValue[names[index++]];
            }
          } else {
            intermediateValue = context.view[name];

            /**
             * Only checking against `hasProperty`, which always returns `false` if
             * `context.view` is not an object. Deliberately omitting the check
             * against `primitiveHasOwnProperty` if dot notation is not used.
             *
             * Consider this example:
             * ```
             * Mustache.render("The length of a football field is {{#length}}{{length}}{{/length}}.", {length: "100 yards"})
             * ```
             *
             * If we were to check also against `primitiveHasOwnProperty`, as we do
             * in the dot notation case, then render call would return:
             *
             * "The length of a football field is 9."
             *
             * rather than the expected:
             *
             * "The length of a football field is 100 yards."
             **/
            lookupHit = hasProperty(context.view, name);
          }

          if (lookupHit) {
            value = intermediateValue;
            break;
          }

          context = context.parent;
        }

        cache[name] = value;
      }

      if (isFunction(value))
        value = value.call(this.view);

      return value;
    };

    /**
     * A Writer knows how to take a stream of tokens and render them to a
     * string, given a context. It also maintains a cache of templates to
     * avoid the need to parse the same template twice.
     */
    function Writer () {
      this.templateCache = {
        _cache: {},
        set: function set (key, value) {
          this._cache[key] = value;
        },
        get: function get (key) {
          return this._cache[key];
        },
        clear: function clear () {
          this._cache = {};
        }
      };
    }

    /**
     * Clears all cached templates in this writer.
     */
    Writer.prototype.clearCache = function clearCache () {
      if (typeof this.templateCache !== 'undefined') {
        this.templateCache.clear();
      }
    };

    /**
     * Parses and caches the given `template` according to the given `tags` or
     * `mustache.tags` if `tags` is omitted,  and returns the array of tokens
     * that is generated from the parse.
     */
    Writer.prototype.parse = function parse (template, tags) {
      var cache = this.templateCache;
      var cacheKey = template + ':' + (tags || mustache.tags).join(':');
      var isCacheEnabled = typeof cache !== 'undefined';
      var tokens = isCacheEnabled ? cache.get(cacheKey) : undefined;

      if (tokens == undefined) {
        tokens = parseTemplate(template, tags);
        isCacheEnabled && cache.set(cacheKey, tokens);
      }
      return tokens;
    };

    /**
     * High-level method that is used to render the given `template` with
     * the given `view`.
     *
     * The optional `partials` argument may be an object that contains the
     * names and templates of partials that are used in the template. It may
     * also be a function that is used to load partial templates on the fly
     * that takes a single argument: the name of the partial.
     *
     * If the optional `tags` argument is given here it must be an array with two
     * string values: the opening and closing tags used in the template (e.g.
     * [ "<%", "%>" ]). The default is to mustache.tags.
     */
    Writer.prototype.render = function render (template, view, partials, tags) {
      var tokens = this.parse(template, tags);
      var context = (view instanceof Context) ? view : new Context(view, undefined);
      return this.renderTokens(tokens, context, partials, template, tags);
    };

    /**
     * Low-level method that renders the given array of `tokens` using
     * the given `context` and `partials`.
     *
     * Note: The `originalTemplate` is only ever used to extract the portion
     * of the original template that was contained in a higher-order section.
     * If the template doesn't use higher-order sections, this argument may
     * be omitted.
     */
    Writer.prototype.renderTokens = function renderTokens (tokens, context, partials, originalTemplate, tags) {
      var buffer = '';

      var token, symbol, value;
      for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
        value = undefined;
        token = tokens[i];
        symbol = token[0];

        if (symbol === '#') value = this.renderSection(token, context, partials, originalTemplate);
        else if (symbol === '^') value = this.renderInverted(token, context, partials, originalTemplate);
        else if (symbol === '>') value = this.renderPartial(token, context, partials, tags);
        else if (symbol === '&') value = this.unescapedValue(token, context);
        else if (symbol === 'name') value = this.escapedValue(token, context);
        else if (symbol === 'text') value = this.rawValue(token);

        if (value !== undefined)
          buffer += value;
      }

      return buffer;
    };

    Writer.prototype.renderSection = function renderSection (token, context, partials, originalTemplate) {
      var self = this;
      var buffer = '';
      var value = context.lookup(token[1]);

      // This function is used to render an arbitrary template
      // in the current context by higher-order sections.
      function subRender (template) {
        return self.render(template, context, partials);
      }

      if (!value) return;

      if (isArray(value)) {
        for (var j = 0, valueLength = value.length; j < valueLength; ++j) {
          buffer += this.renderTokens(token[4], context.push(value[j]), partials, originalTemplate);
        }
      } else if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number') {
        buffer += this.renderTokens(token[4], context.push(value), partials, originalTemplate);
      } else if (isFunction(value)) {
        if (typeof originalTemplate !== 'string')
          throw new Error('Cannot use higher-order sections without the original template');

        // Extract the portion of the original template that the section contains.
        value = value.call(context.view, originalTemplate.slice(token[3], token[5]), subRender);

        if (value != null)
          buffer += value;
      } else {
        buffer += this.renderTokens(token[4], context, partials, originalTemplate);
      }
      return buffer;
    };

    Writer.prototype.renderInverted = function renderInverted (token, context, partials, originalTemplate) {
      var value = context.lookup(token[1]);

      // Use JavaScript's definition of falsy. Include empty arrays.
      // See https://github.com/janl/mustache.js/issues/186
      if (!value || (isArray(value) && value.length === 0))
        return this.renderTokens(token[4], context, partials, originalTemplate);
    };

    Writer.prototype.indentPartial = function indentPartial (partial, indentation, lineHasNonSpace) {
      var filteredIndentation = indentation.replace(/[^ \t]/g, '');
      var partialByNl = partial.split('\n');
      for (var i = 0; i < partialByNl.length; i++) {
        if (partialByNl[i].length && (i > 0 || !lineHasNonSpace)) {
          partialByNl[i] = filteredIndentation + partialByNl[i];
        }
      }
      return partialByNl.join('\n');
    };

    Writer.prototype.renderPartial = function renderPartial (token, context, partials, tags) {
      if (!partials) return;

      var value = isFunction(partials) ? partials(token[1]) : partials[token[1]];
      if (value != null) {
        var lineHasNonSpace = token[6];
        var tagIndex = token[5];
        var indentation = token[4];
        var indentedValue = value;
        if (tagIndex == 0 && indentation) {
          indentedValue = this.indentPartial(value, indentation, lineHasNonSpace);
        }
        return this.renderTokens(this.parse(indentedValue, tags), context, partials, indentedValue, tags);
      }
    };

    Writer.prototype.unescapedValue = function unescapedValue (token, context) {
      var value = context.lookup(token[1]);
      if (value != null)
        return value;
    };

    Writer.prototype.escapedValue = function escapedValue (token, context) {
      var value = context.lookup(token[1]);
      if (value != null)
        return mustache.escape(value);
    };

    Writer.prototype.rawValue = function rawValue (token) {
      return token[1];
    };

    var mustache = {
      name: 'mustache.js',
      version: '4.0.1',
      tags: [ '{{', '}}' ],
      clearCache: undefined,
      escape: undefined,
      parse: undefined,
      render: undefined,
      Scanner: undefined,
      Context: undefined,
      Writer: undefined,
      /**
       * Allows a user to override the default caching strategy, by providing an
       * object with set, get and clear methods. This can also be used to disable
       * the cache by setting it to the literal `undefined`.
       */
      set templateCache (cache) {
        defaultWriter.templateCache = cache;
      },
      /**
       * Gets the default or overridden caching object from the default writer.
       */
      get templateCache () {
        return defaultWriter.templateCache;
      }
    };

    // All high-level mustache.* functions use this writer.
    var defaultWriter = new Writer();

    /**
     * Clears all cached templates in the default writer.
     */
    mustache.clearCache = function clearCache () {
      return defaultWriter.clearCache();
    };

    /**
     * Parses and caches the given template in the default writer and returns the
     * array of tokens it contains. Doing this ahead of time avoids the need to
     * parse templates on the fly as they are rendered.
     */
    mustache.parse = function parse (template, tags) {
      return defaultWriter.parse(template, tags);
    };

    /**
     * Renders the `template` with the given `view` and `partials` using the
     * default writer. If the optional `tags` argument is given here it must be an
     * array with two string values: the opening and closing tags used in the
     * template (e.g. [ "<%", "%>" ]). The default is to mustache.tags.
     */
    mustache.render = function render (template, view, partials, tags) {
      if (typeof template !== 'string') {
        throw new TypeError('Invalid template! Template should be a "string" ' +
                            'but "' + typeStr(template) + '" was given as the first ' +
                            'argument for mustache#render(template, view, partials)');
      }

      return defaultWriter.render(template, view, partials, tags);
    };

    // Export the escaping function so that the user may override it.
    // See https://github.com/janl/mustache.js/issues/244
    mustache.escape = escapeHtml;

    // Export these mainly for testing, but also for advanced usage.
    mustache.Scanner = Scanner;
    mustache.Context = Context;
    mustache.Writer = Writer;

    return mustache;

  })));
  });

  class OptionsSet {
      constructor(optionsSpec, template) {
          console.log(mustache.render('Hello {{x}}', { x: 'world' }));
          this.optionsSpec = optionsSpec;
          this.options = {};
          this.optionsSpec.forEach(option => {
              if (option.type !== 'heading' && option.type !== 'column-break') {
                  this.options[option.id] = option.default;
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
              option = this.optionsSpec.find(x => (x.id === option));
              if (!option)
                  throw new Error(`no option with id '${option}'`);
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
                      Array.from(option.element.querySelectorAll('input:checked'), (x) => x.value);
                  break;
              }
              default:
                  throw new Error(`option with id ${option.id} has unrecognised option type ${option.type}`);
          }
          // console.log(this.options)
      }
      /**
       * Given a string, return the element of this.options with that id
       * @param id The id
       */
      updateStateFromUIAll() {
          this.optionsSpec.forEach(option => this.updateStateFromUI(option));
      }
      disableOrEnableAll() {
          this.optionsSpec.forEach(option => this.disableOrEnable(option));
      }
      /**
       * Given an option, find its UI element and update it according to the options ID
       * @param {*} option An element of this.optionsSpec or an option id
       */
      updateUIFromState(option) {
      }
      /**
       * Given an option, enable or disable the UI element depending on the value of option.disableIf and the
       * state of the corresponding boolean option
       * @param {*} option An element of this.optionsSpec or an option id
       */
      disableOrEnable(option) {
          if (typeof (option) === 'string') {
              option = this.optionsSpec.find(x => x.id === option);
              if (!option)
                  throw new Error(`no option with id '${option}'`);
          }
          if (!option.disabledIf)
              return;
          // Inverse everything if begining with !
          let disablerId = option.disabledIf;
          let enable = false; // disable iff disabler is true
          if (disablerId.startsWith('!')) {
              enable = true; // endable iff disabler is true
              disablerId = disablerId.slice(1);
          }
          // Endable or disable
          if (this.options[disablerId] === enable) { // enable
              option.element.classList.remove('disabled');
              [...option.element.getElementsByTagName('input')].forEach(e => { e.disabled = false; });
          }
          else { // disable
              option.element.classList.add('disabled');
              [...option.element.getElementsByTagName('input')].forEach(e => { e.disabled = true; });
          }
      }
      renderIn(element) {
          const list = createElem('ul', 'options-list');
          let column = createElem('div', 'options-column', list);
          this.optionsSpec.forEach(option => {
              if (option.type === 'column-break') { // start new column
                  column = createElem('div', 'options-column', list);
              }
              else { // make list item
                  const li = createElem('li', undefined, column);
                  if (option.id !== undefined) {
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
                  }
                  li.addEventListener('change', e => { this.updateStateFromUI(option); this.disableOrEnableAll(); });
                  option.element = li;
              }
          });
          element.append(list);
          this.disableOrEnableAll();
      }
      renderListOption(option, li) {
          li.insertAdjacentHTML('beforeend', option.title + ': ');
          const sublist = createElem('ul', 'options-sublist', li);
          if (option.vertical)
              sublist.classList.add('options-sublist-vertical');
          option.selectOptions.forEach(selectOption => {
              const sublistLi = createElem('li', null, sublist);
              const label = createElem('label', null, sublistLi);
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
              input.min = option.min;
              input.max = option.max;
              input.value = option.default;
              break;
          case 'bool':
              input.type = 'checkbox';
              input.checked = option.default;
              break;
          default:
              throw new Error(`unknown option type ${option.type}`);
      }
      if (option.swapLabel && option.title !== '')
          label.insertAdjacentHTML('beforeend', ` ${option.title}`);
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

  /**
   * Class representing a point, and static utitlity methods
   */
  class Point {
    constructor (x, y) {
      this.x = x;
      this.y = y;
    }

    rotate (angle) {
      var newx, newy;
      newx = Math.cos(angle) * this.x - Math.sin(angle) * this.y;
      newy = Math.sin(angle) * this.x + Math.cos(angle) * this.y;
      this.x = newx;
      this.y = newy;
      return this
    }

    scale (sf) {
      this.x = this.x * sf;
      this.y = this.y * sf;
      return this
    }

    translate (x, y) {
      this.x += x;
      this.y += y;
      return this
    }

    clone () {
      return new Point(this.x, this.y)
    }

    equals (that) {
      return (this.x === that.x && this.y === that.y)
    }

    moveToward (that, d) {
      // moves [d] in the direction of [that::Point]
      const uvec = Point.unitVector(this, that);
      this.translate(uvec.x * d, uvec.y * d);
      return this
    }

    static fromPolar (r, theta) {
      return new Point(
        Math.cos(theta) * r,
        Math.sin(theta) * r
      )
    }

    static fromPolarDeg (r, theta) {
      theta = theta * Math.PI / 180;
      return Point.fromPolar(r, theta)
    }

    /**
     * Find the mean of
     * @param  {...Point} points The points to find the mean of
     */
    static mean (...points) {
      const sumx = points.map(p => p.x).reduce((x, y) => x + y);
      const sumy = points.map(p => p.y).reduce((x, y) => x + y);
      const n = points.length;

      return new Point(sumx / n, sumy / n)
    }

    static inCenter (A, B, C) {
      // incenter of a triangle given vertex points A, B and C
      const a = Point.distance(B, C);
      const b = Point.distance(A, C);
      const c = Point.distance(A, B);

      const perimeter = a + b + c;
      const sumx = a * A.x + b * B.x + c * C.x;
      const sumy = a * A.y + b * B.y + c * C.y;

      return new Point(sumx / perimeter, sumy / perimeter)
    }

    static min (points) {
      const minx = points.reduce((x, p) => Math.min(x, p.x), Infinity);
      const miny = points.reduce((y, p) => Math.min(y, p.y), Infinity);
      return new Point(minx, miny)
    }

    static max (points) {
      const maxx = points.reduce((x, p) => Math.max(x, p.x), -Infinity);
      const maxy = points.reduce((y, p) => Math.max(y, p.y), -Infinity);
      return new Point(maxx, maxy)
    }

    static center (points) {
      const minx = points.reduce((x, p) => Math.min(x, p.x), Infinity);
      const miny = points.reduce((y, p) => Math.min(y, p.y), Infinity);
      const maxx = points.reduce((x, p) => Math.max(x, p.x), -Infinity);
      const maxy = points.reduce((y, p) => Math.max(y, p.y), -Infinity);
      return new Point((maxx + minx) / 2, (maxy + miny) / 2)
    }

    static unitVector (p1, p2) {
      // returns a unit vector in the direction of p1 to p2
      // in the form {x:..., y:...}
      const vecx = p2.x - p1.x;
      const vecy = p2.y - p1.y;
      const length = Math.hypot(vecx, vecy);
      return { x: vecx / length, y: vecy / length }
    }

    static distance (p1, p2) {
      return Math.hypot(p1.x - p2.x, p1.y - p2.y)
    }

    /**
     * Calculate the angle in radians from horizontal to p2, with centre p1.
     * E.g. angleFrom( (0,0), (1,1) ) = pi/2
     * Angle is from 0 to 2pi
     * @param {Point} p1 The start point
     * @param {Point} p2 The end point
     * @returns {number} The angle in radians
     */
    static angleFrom (p1, p2) {
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      return angle >= 0 ? angle : 2 * Math.PI + angle
    }

    static repel (p1, p2, trigger, distance) {
      // When p1 and p2 are less than [trigger] apart, they are
      // moved so that they are [distance] apart
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      if (d >= trigger) return false

      const r = (distance - d) / 2; // distance they need moving
      p1.moveToward(p2, -r);
      p2.moveToward(p1, -r);
      return true
    }
  }

  class GraphicQView {
      constructor(data, viewOptions) {
          const defaults = {
              width: 250,
              height: 250
          };
          viewOptions = Object.assign({}, defaults, viewOptions);
          this.width = viewOptions.width;
          this.height = viewOptions.height; // only things I need from the options, generally?
          this.data = data;
          // this.rotation?
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
      renderLabels(nudge) {
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
                  console.log(`removed space in ${l.text}`);
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
      constructor() {
          super(); // this.answered = false
          delete (this.DOM); // going to override getDOM using the view's DOM
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
      super(options); // processes options into this.settings
      this.data = new ArithmagonQData(this.settings);
      this.view = new ArithmagonQView(this.data, this.settings);
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
      const mappedAngles = angles.map((x, i) => [x, i]); // remember original indices
      const smallAngles = mappedAngles.filter(x => x[0] < minAngle);
      const largeAngles = mappedAngles.filter(x => x[0] >= minAngle);
      const largeAngleSum = largeAngles.reduce((accumulator, currentValue) => accumulator + currentValue[0], 0);
      smallAngles.forEach(small => {
          const difference = minAngle - small[0];
          small[0] += difference;
          largeAngles.forEach(large => {
              const reduction = difference * large[0] / largeAngleSum;
              large[0] -= reduction;
          });
      });
      return smallAngles.concat(largeAngles) // combine together
          .sort((x, y) => x[1] - y[1]) // sort by previous index
          .map(x => x[0]); // strip out index
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
          const defaults = {
              /* angleSum: 180 */ // must be set by caller
              minAngle: 15,
              minN: 2,
              maxN: 4
          };
          options = Object.assign({}, defaults, options);
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
          if (!options.angleSum) {
              throw new Error('No angle sum given');
          }
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
      constructor(data, view) {
          super(); // bubbles to Q
          this.data = data;
          this.view = view;
      }
      static random(options, viewOptions) {
          const defaults = {
              angleSum: 180,
              minAngle: 10,
              minN: 2,
              maxN: 4,
              repeated: false
          };
          options = Object.assign({}, defaults, options);
          const data = MissingAnglesNumberData.random(options);
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
    constructor (data, view, options) {
      super(options); // this should be all that's required when refactored
      this.data = data;
      this.view = view;
    }

    static random (options, viewOptions) {
      const optionsOverride = {
        angleSum: 180,
        minAngle: 25,
        minN: 3,
        maxN: 3
      };
      options = Object.assign(options, optionsOverride);
      options.repeated = options.repeated || false;

      const data = MissingAnglesTriangleData.random(options);
      const view = new MissingAnglesTriangleView(data, viewOptions);

      return new MissingAnglesTriangleQ(data, view, options)
    }

    static get commandWord () { return 'Find the missing value' }
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
          const defaults = {
              expressionTypes: ['add', 'multiply', 'mixed'],
              ensureX: true,
              includeConstants: true,
              minCoefficient: 1,
              maxCoefficient: 4,
              angleSum: 180,
              minAngle: 20,
              minN: 2,
              maxN: 4,
              minXValue: 15
          };
          options = Object.assign({}, defaults, options);
          // assign calculated defaults:
          options.maxConstant = options.maxConstant || options.angleSum / 2;
          options.maxXValue = options.maxXValue || options.angleSum / 4;
          // Randomise/set up main features
          const n = randBetween(options.minN, options.maxN);
          const type = randElem(options.expressionTypes);
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
          const { x, angles } = solveAngles(expressions, options.angleSum);
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
      constructor(data, view) {
          super(); // bubbles to Q
          this.data = data;
          this.view = view;
      }
      static random(options, viewOptions) {
          const defaults = {
              angleSum: 180,
              minAngle: 10,
              minN: 2,
              maxN: 4,
              repeated: false
          };
          options = Object.assign({}, defaults, options);
          const data = MissingAnglesAlgebraData.random(options);
          const view = new MissingAnglesAroundAlgebraView(data, viewOptions); // TODO eliminate public constructors
          return new MissingAnglesAroundAlgebraQ(data, view);
      }
      static get commandWord() { return 'Find the missing value'; }
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
      constructor(data, view) {
          super();
          this.data = data;
          this.view = view;
      }
      static random(options, viewOptions) {
          const optionsOverride = {
              angleSum: 180,
              minN: 3,
              maxN: 3,
              repeated: false
          };
          Object.assign(options, optionsOverride);
          const data = MissingAnglesAlgebraData.random(options);
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

  class MissingAnglesWordedData extends MissingAnglesAlgebraData {
      constructor(angles, missing, angleSum, angleLabels, instructions) {
          super(angles, missing, angleSum, angleLabels, null);
          this.instructions = instructions;
      }
      static random(options) {
          const defaults = {
              minN: 2,
              maxN: 2,
              minAngle: 10,
              minAddend: -90,
              maxAddend: 90,
              minMultiplier: 1,
              maxMultiplier: 5,
              types: ['add', 'multiply', 'percent', 'ratio']
          };
          options = Object.assign({}, defaults, options);
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
      constructor(data, view) {
          super();
          this.data = data;
          this.view = view;
      }
      static random(options, viewOptions) {
          const optionsOverride = {
              angleSum: 180,
              minN: 3,
              maxN: 3,
              repeated: false
          };
          Object.assign(options, optionsOverride);
          const data = MissingAnglesWordedData.random(options);
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
      constructor(data, view) {
          super();
          this.data = data;
          this.view = view;
      }
      static random(options, viewOptions) {
          const defaults = {
              angleSum: 180,
              minAngle: 10,
              minN: 2,
              maxN: 2,
              repeated: false
          };
          options = Object.assign({}, defaults, options);
          viewOptions = viewOptions || {};
          const data = MissingAnglesWordedData.random(options);
          const view = new MissingAnglesAroundWordedView(data, viewOptions);
          return new this(data, view);
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
          let subtype;
          const questionOptions = {};
          switch (options.difficulty) {
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
                  throw new Error(`Can't generate difficulty ${options.difficulty}`);
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
                  title: '<b>Use custom settings (disables difficulty)</b>',
                  default: false,
                  id: 'custom'
              },
              {
                  type: 'bool',
                  title: 'Simple',
                  id: 'simple',
                  default: true,
                  disabledIf: '!custom'
              }
          ];
      }
      static get commandWord() {
          return 'Find the missing value';
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

  function getCommandWord (id) {
    return getClass(id).commandWord
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

  /* !
  * tingle.js
  * @author  robin_parisi
  * @version 0.15.2
  * @url
  */
  // Modified to be ES6 module

  var isBusy = false;

  function Modal (options) {
    var defaults = {
      onClose: null,
      onOpen: null,
      beforeOpen: null,
      beforeClose: null,
      stickyFooter: false,
      footer: false,
      cssClass: [],
      closeLabel: 'Close',
      closeMethods: ['overlay', 'button', 'escape']
    };

    // extends config
    this.opts = extend({}, defaults, options);

    // init modal
    this.init();
  }

  Modal.prototype.init = function () {
    if (this.modal) {
      return
    }

    _build.call(this);
    _bindEvents.call(this);

    // insert modal in dom
    document.body.appendChild(this.modal, document.body.firstChild);

    if (this.opts.footer) {
      this.addFooter();
    }

    return this
  };

  Modal.prototype._busy = function (state) {
    isBusy = state;
  };

  Modal.prototype._isBusy = function () {
    return isBusy
  };

  Modal.prototype.destroy = function () {
    if (this.modal === null) {
      return
    }

    // restore scrolling
    if (this.isOpen()) {
      this.close(true);
    }

    // unbind all events
    _unbindEvents.call(this);

    // remove modal from dom
    this.modal.parentNode.removeChild(this.modal);

    this.modal = null;
  };

  Modal.prototype.isOpen = function () {
    return !!this.modal.classList.contains('tingle-modal--visible')
  };

  Modal.prototype.open = function () {
    if (this._isBusy()) return
    this._busy(true);

    var self = this;

    // before open callback
    if (typeof self.opts.beforeOpen === 'function') {
      self.opts.beforeOpen();
    }

    if (this.modal.style.removeProperty) {
      this.modal.style.removeProperty('display');
    } else {
      this.modal.style.removeAttribute('display');
    }

    // prevent double scroll
    this._scrollPosition = window.pageYOffset;
    document.body.classList.add('tingle-enabled');
    document.body.style.top = -this._scrollPosition + 'px';

    // sticky footer
    this.setStickyFooter(this.opts.stickyFooter);

    // show modal
    this.modal.classList.add('tingle-modal--visible');

    // onOpen callback
    if (typeof self.opts.onOpen === 'function') {
      self.opts.onOpen.call(self);
    }

    self._busy(false);

    // check if modal is bigger than screen height
    this.checkOverflow();

    return this
  };

  Modal.prototype.close = function (force) {
    if (this._isBusy()) return
    this._busy(true);

    //  before close
    if (typeof this.opts.beforeClose === 'function') {
      var close = this.opts.beforeClose.call(this);
      if (!close) {
        this._busy(false);
        return
      }
    }

    document.body.classList.remove('tingle-enabled');
    document.body.style.top = null;
    window.scrollTo({
      top: this._scrollPosition,
      behavior: 'instant'
    });

    this.modal.classList.remove('tingle-modal--visible');

    // using similar setup as onOpen
    var self = this;

    self.modal.style.display = 'none';

    // onClose callback
    if (typeof self.opts.onClose === 'function') {
      self.opts.onClose.call(this);
    }

    // release modal
    self._busy(false);
  };

  Modal.prototype.setContent = function (content) {
    // check type of content : String or Node
    if (typeof content === 'string') {
      this.modalBoxContent.innerHTML = content;
    } else {
      this.modalBoxContent.innerHTML = '';
      this.modalBoxContent.appendChild(content);
    }

    if (this.isOpen()) {
      // check if modal is bigger than screen height
      this.checkOverflow();
    }

    return this
  };

  Modal.prototype.getContent = function () {
    return this.modalBoxContent
  };

  Modal.prototype.addFooter = function () {
    // add footer to modal
    _buildFooter.call(this);

    return this
  };

  Modal.prototype.setFooterContent = function (content) {
    // set footer content
    this.modalBoxFooter.innerHTML = content;

    return this
  };

  Modal.prototype.getFooterContent = function () {
    return this.modalBoxFooter
  };

  Modal.prototype.setStickyFooter = function (isSticky) {
    // if the modal is smaller than the viewport height, we don't need sticky
    if (!this.isOverflow()) {
      isSticky = false;
    }

    if (isSticky) {
      if (this.modalBox.contains(this.modalBoxFooter)) {
        this.modalBox.removeChild(this.modalBoxFooter);
        this.modal.appendChild(this.modalBoxFooter);
        this.modalBoxFooter.classList.add('tingle-modal-box__footer--sticky');
        _recalculateFooterPosition.call(this);
        this.modalBoxContent.style['padding-bottom'] = this.modalBoxFooter.clientHeight + 20 + 'px';
      }
    } else if (this.modalBoxFooter) {
      if (!this.modalBox.contains(this.modalBoxFooter)) {
        this.modal.removeChild(this.modalBoxFooter);
        this.modalBox.appendChild(this.modalBoxFooter);
        this.modalBoxFooter.style.width = 'auto';
        this.modalBoxFooter.style.left = '';
        this.modalBoxContent.style['padding-bottom'] = '';
        this.modalBoxFooter.classList.remove('tingle-modal-box__footer--sticky');
      }
    }

    return this
  };

  Modal.prototype.addFooterBtn = function (label, cssClass, callback) {
    var btn = document.createElement('button');

    // set label
    btn.innerHTML = label;

    // bind callback
    btn.addEventListener('click', callback);

    if (typeof cssClass === 'string' && cssClass.length) {
      // add classes to btn
      cssClass.split(' ').forEach(function (item) {
        btn.classList.add(item);
      });
    }

    this.modalBoxFooter.appendChild(btn);

    return btn
  };

  Modal.prototype.resize = function () {
    // eslint-disable-next-line no-console
    console.warn('Resize is deprecated and will be removed in version 1.0');
  };

  Modal.prototype.isOverflow = function () {
    var viewportHeight = window.innerHeight;
    var modalHeight = this.modalBox.clientHeight;

    return modalHeight >= viewportHeight
  };

  Modal.prototype.checkOverflow = function () {
    // only if the modal is currently shown
    if (this.modal.classList.contains('tingle-modal--visible')) {
      if (this.isOverflow()) {
        this.modal.classList.add('tingle-modal--overflow');
      } else {
        this.modal.classList.remove('tingle-modal--overflow');
      }

      // tODO: remove offset
      // _offset.call(this);
      if (!this.isOverflow() && this.opts.stickyFooter) {
        this.setStickyFooter(false);
      } else if (this.isOverflow() && this.opts.stickyFooter) {
        _recalculateFooterPosition.call(this);
        this.setStickyFooter(true);
      }
    }
  };

  /* ----------------------------------------------------------- */
  /* == private methods */
  /* ----------------------------------------------------------- */

  function closeIcon () {
    return '<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M.3 9.7c.2.2.4.3.7.3.3 0 .5-.1.7-.3L5 6.4l3.3 3.3c.2.2.5.3.7.3.2 0 .5-.1.7-.3.4-.4.4-1 0-1.4L6.4 5l3.3-3.3c.4-.4.4-1 0-1.4-.4-.4-1-.4-1.4 0L5 3.6 1.7.3C1.3-.1.7-.1.3.3c-.4.4-.4 1 0 1.4L3.6 5 .3 8.3c-.4.4-.4 1 0 1.4z" fill="#000" fill-rule="nonzero"/></svg>'
  }

  function _recalculateFooterPosition () {
    if (!this.modalBoxFooter) {
      return
    }
    this.modalBoxFooter.style.width = this.modalBox.clientWidth + 'px';
    this.modalBoxFooter.style.left = this.modalBox.offsetLeft + 'px';
  }

  function _build () {
    // wrapper
    this.modal = document.createElement('div');
    this.modal.classList.add('tingle-modal');

    // remove cusor if no overlay close method
    if (this.opts.closeMethods.length === 0 || this.opts.closeMethods.indexOf('overlay') === -1) {
      this.modal.classList.add('tingle-modal--noOverlayClose');
    }

    this.modal.style.display = 'none';

    // custom class
    this.opts.cssClass.forEach(function (item) {
      if (typeof item === 'string') {
        this.modal.classList.add(item);
      }
    }, this);

    // close btn
    if (this.opts.closeMethods.indexOf('button') !== -1) {
      this.modalCloseBtn = document.createElement('button');
      this.modalCloseBtn.type = 'button';
      this.modalCloseBtn.classList.add('tingle-modal__close');

      this.modalCloseBtnIcon = document.createElement('span');
      this.modalCloseBtnIcon.classList.add('tingle-modal__closeIcon');
      this.modalCloseBtnIcon.innerHTML = closeIcon();

      this.modalCloseBtnLabel = document.createElement('span');
      this.modalCloseBtnLabel.classList.add('tingle-modal__closeLabel');
      this.modalCloseBtnLabel.innerHTML = this.opts.closeLabel;

      this.modalCloseBtn.appendChild(this.modalCloseBtnIcon);
      this.modalCloseBtn.appendChild(this.modalCloseBtnLabel);
    }

    // modal
    this.modalBox = document.createElement('div');
    this.modalBox.classList.add('tingle-modal-box');

    // modal box content
    this.modalBoxContent = document.createElement('div');
    this.modalBoxContent.classList.add('tingle-modal-box__content');

    this.modalBox.appendChild(this.modalBoxContent);

    if (this.opts.closeMethods.indexOf('button') !== -1) {
      this.modal.appendChild(this.modalCloseBtn);
    }

    this.modal.appendChild(this.modalBox);
  }

  function _buildFooter () {
    this.modalBoxFooter = document.createElement('div');
    this.modalBoxFooter.classList.add('tingle-modal-box__footer');
    this.modalBox.appendChild(this.modalBoxFooter);
  }

  function _bindEvents () {
    this._events = {
      clickCloseBtn: this.close.bind(this),
      clickOverlay: _handleClickOutside.bind(this),
      resize: this.checkOverflow.bind(this),
      keyboardNav: _handleKeyboardNav.bind(this)
    };

    if (this.opts.closeMethods.indexOf('button') !== -1) {
      this.modalCloseBtn.addEventListener('click', this._events.clickCloseBtn);
    }

    this.modal.addEventListener('mousedown', this._events.clickOverlay);
    window.addEventListener('resize', this._events.resize);
    document.addEventListener('keydown', this._events.keyboardNav);
  }

  function _handleKeyboardNav (event) {
    // escape key
    if (this.opts.closeMethods.indexOf('escape') !== -1 && event.which === 27 && this.isOpen()) {
      this.close();
    }
  }

  function _handleClickOutside (event) {
    // on macOS, click on scrollbar (hidden mode) will trigger close event so we need to bypass this behavior by detecting scrollbar mode
    var scrollbarWidth = this.modal.offsetWidth - this.modal.clientWidth;
    var clickedOnScrollbar = event.clientX >= this.modal.offsetWidth - 15; // 15px is macOS scrollbar default width
    var isScrollable = this.modal.scrollHeight !== this.modal.offsetHeight;
    if (navigator.platform === 'MacIntel' && scrollbarWidth === 0 && clickedOnScrollbar && isScrollable) {
      return
    }

    // if click is outside the modal
    if (this.opts.closeMethods.indexOf('overlay') !== -1 && !_findAncestor(event.target, 'tingle-modal') &&
      event.clientX < this.modal.clientWidth) {
      this.close();
    }
  }

  function _findAncestor (el, cls) {
    while ((el = el.parentElement) && !el.classList.contains(cls));
    return el
  }

  function _unbindEvents () {
    if (this.opts.closeMethods.indexOf('button') !== -1) {
      this.modalCloseBtn.removeEventListener('click', this._events.clickCloseBtn);
    }
    this.modal.removeEventListener('mousedown', this._events.clickOverlay);
    window.removeEventListener('resize', this._events.resize);
    document.removeEventListener('keydown', this._events.keyboardNav);
  }

  /* ----------------------------------------------------------- */
  /* == helpers */
  /* ----------------------------------------------------------- */

  function extend () {
    for (var i = 1; i < arguments.length; i++) {
      for (var key in arguments[i]) {
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
          arguments[0][key] = arguments[i][key];
        }
      }
    }
    return arguments[0]
  }

  window.SHOW_DIFFICULTY = false; // for debugging questions

  /* TODO list:
   * Additional question block - probably in main.js
   * Zoom/scale buttons
   *    Need to change css grid spacing with JS on generation
   * Display options
   */

  // Make an overlay to capture any clicks outside boxes, if necessary
  createElem('div', 'overlay hidden', document.body).addEventListener('click', hideAllActions);

  class QuestionSet {
    constructor (qNumber) {
      this.questions = []; // list of questions and the DOM element they're rendered in
      this.topics = []; // list of topics which have been selected for this set
      this.optionsSets = []; // list of OptionsSet objects carrying options for topics with options
      this.qNumber = qNumber || 1; // Question number (passed in by caller, which will keep count)
      this.answered = false; // Whether answered or not
      this.commandWord = ''; // Something like 'simplify'
      this.useCommandWord = true; // Use the command word in the main question, false give command word with each subquestion
      this.n = 8; // Number of questions

      this._build();
    }

    _build () {
      this.outerBox = createElem('div', 'question-outerbox');
      this.headerBox = createElem('div', 'question-headerbox', this.outerBox);
      this.displayBox = createElem('div', 'question-displaybox', this.outerBox);

      this._buildOptionsBox();

      this._buildTopicChooser();
    }

    _buildOptionsBox () {
      const topicSpan = createElem('span', null, this.headerBox);
      this.topicChooserButton = createElem('span', 'topic-chooser button', topicSpan);
      this.topicChooserButton.innerHTML = 'Choose topic';
      this.topicChooserButton.addEventListener('click', () => this.chooseTopics());

      const difficultySpan = createElem('span', null, this.headerBox);
      difficultySpan.append('Difficulty: ');
      const difficultySliderOuter = createElem('span', 'slider-outer', difficultySpan);
      this.difficultySliderElement = createElem('input', null, difficultySliderOuter);

      const nSpan = createElem('span', null, this.headerBox);
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

    _initSlider () {
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

    _buildTopicChooser () {
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
      this.topicsModal = new Modal({
        footer: true,
        stickyFooter: false,
        closeMethods: ['overlay', 'escape'],
        closeLabel: 'Close',
        onClose: () => {
          this.updateTopics();
        }
      });

      this.topicsModal.addFooterBtn(
        'OK',
        'button modal-button',
        () => {
          this.topicsModal.close();
        });

      // render options into modal
      this.topicsOptions.renderIn(this.topicsModal.modalBoxContent);

      // Add further options buttons
      // This feels a bit iffy - depends too much on implementation of OptionsSet
      const lis = Array.from(this.topicsModal.modalBoxContent.getElementsByTagName('li'));
      lis.forEach(li => {
        const topicId = li.dataset.optionId;
        if (hasOptions(topicId)) {
          const optionsButton = createElem('div', 'icon-button extra-options-button', li);
          this._buildTopicOptions(li.dataset.optionId, optionsButton);
        }
      });
    }

    _buildTopicOptions (topicId, optionsButton) {
      // Build the UI and OptionsSet object linked to topicId. Pass in a button which should launch it

      // Make the OptionsSet object and store a reference to it
      // Only store if object is created?
      const optionsSet = newOptionsSet(topicId);
      this.optionsSets[topicId] = optionsSet;

      // Make a modal dialog for it
      const modal = new Modal({
        footer: true,
        stickyFooter: false,
        closeMethods: ['overlay', 'escape'],
        closeLabel: 'Close'
      });

      modal.addFooterBtn(
        'OK',
        'button modal-button',
        () => {
          modal.close();
        });

      optionsSet.renderIn(modal.modalBoxContent);

      // link the modal to the button
      optionsButton.addEventListener('click', () => {
        modal.open();
      });
    }

    chooseTopics () {
      this.topicsModal.open();
    }

    updateTopics () {
      // topic choices are stored in this.topicsOptions automatically
      // pull this into this.topics and update button displays

      // have object with boolean properties. Just want the true values
      const topics = boolObjectToArray(this.topicsOptions.options);
      this.topics = topics;

      let text;

      if (topics.length === 0) {
        text = 'Choose topic'; // nothing selected
        this.generateButton.disabled = true;
      } else {
        const id = topics[0]; // first item selected
        text = getTitle(id);
        this.generateButton.disabled = false;
      }

      if (topics.length > 1) { // any additional show as e.g. ' + 1
        text += ' +' + (topics.length - 1);
      }

      this.topicChooserButton.innerHTML = text;
    }

    setCommandWord () {
      // first set to first topic command word
      let commandWord = getClass(this.topics[0]).commandWord;
      let useCommandWord = true; // true if shared command word

      // cycle through rest of topics, reset command word if they don't match
      for (let i = 1; i < this.topics.length; i++) {
        if (getClass(this.topics[i]).commandWord !== commandWord) {
          commandWord = '';
          useCommandWord = false;
          break
        }
      }

      this.commandWord = commandWord;
      this.useCommandWord = useCommandWord;
    }

    generateAll () {
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
        container.dataset.question_index = i; // not sure this is actually needed

        // Add container link to object in questions list
        if (!this.questions[i]) this.questions[i] = {};
        this.questions[i].container = container;

        // choose a difficulty and generate
        const difficulty = mindiff + Math.floor(i * (maxdiff - mindiff + 1) / this.n);

        // choose a topic id
        this.generate(i, difficulty);
      }
    }

    generate (i, difficulty, topicId) {
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
      if (!this.questions[i]) throw new Error('question not made')
      this.questions[i].question = question;
      this.questions[i].topicId = topicId;

      // Render into the container
      const container = this.questions[i].container;
      container.innerHTML = ''; // clear in case of refresh

      // make and render question number and command word (if needed)
      let qNumberText = questionLetter(i) + ')';
      if (window.SHOW_DIFFICULTY) { qNumberText += options.difficulty; }
      if (!this.useCommandWord) {
        qNumberText += ' ' + getCommandWord(topicId);
        container.classList.add('individual-command-word');
      } else {
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
          this.showQuestionActions(e, i);
        }
      });
    }

    toggleAnswers () {
      if (this.answered) {
        this.questions.forEach(q => {
          q.question.hideAnswer();
          this.answered = false;
          this.answerButton.innerHTML = 'Show answers';
        });
      } else {
        this.questions.forEach(q => {
          q.question.showAnswer();
          this.answered = true;
          this.answerButton.innerHTML = 'Hide answers';
        });
      }
    }

    showQuestionActions (event, questionIndex) {
      // first hide any other actions
      hideAllActions();

      const container = this.questions[questionIndex].container;
      const actions = container.querySelector('.question-actions');

      // Unhide the overlay
      document.querySelector('.overlay').classList.remove('hidden');
      actions.classList.remove('hidden');
      actions.style.left = (container.offsetWidth / 2 - actions.offsetWidth / 2) + 'px';
      actions.style.top = (container.offsetHeight / 2 - actions.offsetHeight / 2) + 'px';
    }

    appendTo (elem) {
      elem.appendChild(this.outerBox);
      this._initSlider(); // has to be in document's DOM to work properly
    }

    appendBefore (parent, elem) {
      parent.insertBefore(this.outerBox, elem);
      this._initSlider(); // has to be in document's DOM to work properly
    }
  }

  function questionLetter (i) {
    // return a question number. e.g. qNumber(0)="a".
    // After letters, we get on to greek
    var letter =
          i < 26 ? String.fromCharCode(0x61 + i)
            : i < 52 ? String.fromCharCode(0x41 + i - 26)
              : String.fromCharCode(0x3B1 + i - 52);
    return letter
  }

  function hideAllActions (e) {
    // hide all question actions
    document.querySelectorAll('.question-actions').forEach(el => {
      el.classList.add('hidden');
    });
    document.querySelector('.overlay').classList.add('hidden');
  }

  // TODO:
  //  - QuestionSet - refactor into more classes? E.g. options window
  //  - Import existing question types (G - graphic, T - text
  //    - G angles
  //    - G area
  //    - T equation of a line

  document.addEventListener('DOMContentLoaded', () => {
    const qs = new QuestionSet();
    qs.appendTo(document.body);
    qs.chooseTopics();
  });

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vbW9kdWxlcy92ZW5kb3IvcnNsaWRlci5qcyIsIi4uL21vZHVsZXMvVXRpbGl0aWVzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL211c3RhY2hlL211c3RhY2hlLmpzIiwiLi4vLi4vbW9kdWxlcy9PcHRpb25zU2V0LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9RdWVzdGlvbi50cyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGV4dFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FsZ2VicmFpY0ZyYWN0aW9uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvSW50ZWdlckFkZC5qcyIsIi4uL21vZHVsZXMvUG9pbnQuanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRLnRzIiwiLi4vbW9kdWxlcy92ZW5kb3IvZnJhY3Rpb24uanMiLCIuLi9tb2R1bGVzL01vbm9taWFsLmpzIiwiLi4vbW9kdWxlcy9Qb2x5bm9taWFsLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9Bcml0aG1hZ29uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGVzdFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FkZEFaZXJvLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9UZXh0US9FcXVhdGlvbk9mTGluZS5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEudHMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUS5qcyIsIi4uL21vZHVsZXMvTGluRXhwci5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9zb2x2ZUFuZ2xlcy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dvcmRlZFEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dyYXBwZXIudHMiLCIuLi9tb2R1bGVzL1RvcGljQ2hvb3Nlci5qcyIsIi4uL21vZHVsZXMvdmVuZG9yL1RpbmdsZS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb25TZXQuanMiLCIuLi9tYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIFJzbGlkZXIuIERvd25sb2FkZWQgZnJvbSBodHRwczovL3NsYXdvbWlyLXphemlhYmxvLmdpdGh1Yi5pby9yYW5nZS1zbGlkZXIvXG4gKiBNb2RpZmllZCB0byBtYWtlIGludG8gRVM2IG1vZHVsZSBhbmQgZml4IGEgZmV3IGJ1Z3NcbiAqL1xuXG52YXIgUlMgPSBmdW5jdGlvbiAoY29uZikge1xuICB0aGlzLmlucHV0ID0gbnVsbFxuICB0aGlzLmlucHV0RGlzcGxheSA9IG51bGxcbiAgdGhpcy5zbGlkZXIgPSBudWxsXG4gIHRoaXMuc2xpZGVyV2lkdGggPSAwXG4gIHRoaXMuc2xpZGVyTGVmdCA9IDBcbiAgdGhpcy5wb2ludGVyV2lkdGggPSAwXG4gIHRoaXMucG9pbnRlclIgPSBudWxsXG4gIHRoaXMucG9pbnRlckwgPSBudWxsXG4gIHRoaXMuYWN0aXZlUG9pbnRlciA9IG51bGxcbiAgdGhpcy5zZWxlY3RlZCA9IG51bGxcbiAgdGhpcy5zY2FsZSA9IG51bGxcbiAgdGhpcy5zdGVwID0gMFxuICB0aGlzLnRpcEwgPSBudWxsXG4gIHRoaXMudGlwUiA9IG51bGxcbiAgdGhpcy50aW1lb3V0ID0gbnVsbFxuICB0aGlzLnZhbFJhbmdlID0gZmFsc2VcblxuICB0aGlzLnZhbHVlcyA9IHtcbiAgICBzdGFydDogbnVsbCxcbiAgICBlbmQ6IG51bGxcbiAgfVxuICB0aGlzLmNvbmYgPSB7XG4gICAgdGFyZ2V0OiBudWxsLFxuICAgIHZhbHVlczogbnVsbCxcbiAgICBzZXQ6IG51bGwsXG4gICAgcmFuZ2U6IGZhbHNlLFxuICAgIHdpZHRoOiBudWxsLFxuICAgIHNjYWxlOiB0cnVlLFxuICAgIGxhYmVsczogdHJ1ZSxcbiAgICB0b29sdGlwOiB0cnVlLFxuICAgIHN0ZXA6IG51bGwsXG4gICAgZGlzYWJsZWQ6IGZhbHNlLFxuICAgIG9uQ2hhbmdlOiBudWxsXG4gIH1cblxuICB0aGlzLmNscyA9IHtcbiAgICBjb250YWluZXI6ICdycy1jb250YWluZXInLFxuICAgIGJhY2tncm91bmQ6ICdycy1iZycsXG4gICAgc2VsZWN0ZWQ6ICdycy1zZWxlY3RlZCcsXG4gICAgcG9pbnRlcjogJ3JzLXBvaW50ZXInLFxuICAgIHNjYWxlOiAncnMtc2NhbGUnLFxuICAgIG5vc2NhbGU6ICdycy1ub3NjYWxlJyxcbiAgICB0aXA6ICdycy10b29sdGlwJ1xuICB9XG5cbiAgZm9yICh2YXIgaSBpbiB0aGlzLmNvbmYpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb25mLCBpKSkgdGhpcy5jb25mW2ldID0gY29uZltpXSB9XG5cbiAgdGhpcy5pbml0KClcbn1cblxuUlMucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgdGhpcy5jb25mLnRhcmdldCA9PT0gJ29iamVjdCcpIHRoaXMuaW5wdXQgPSB0aGlzLmNvbmYudGFyZ2V0XG4gIGVsc2UgdGhpcy5pbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMuY29uZi50YXJnZXQucmVwbGFjZSgnIycsICcnKSlcblxuICBpZiAoIXRoaXMuaW5wdXQpIHJldHVybiBjb25zb2xlLmxvZygnQ2Fubm90IGZpbmQgdGFyZ2V0IGVsZW1lbnQuLi4nKVxuXG4gIHRoaXMuaW5wdXREaXNwbGF5ID0gZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLmlucHV0LCBudWxsKS5kaXNwbGF5XG4gIHRoaXMuaW5wdXQuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuICB0aGlzLnZhbFJhbmdlID0gISh0aGlzLmNvbmYudmFsdWVzIGluc3RhbmNlb2YgQXJyYXkpXG5cbiAgaWYgKHRoaXMudmFsUmFuZ2UpIHtcbiAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLmNvbmYudmFsdWVzLCAnbWluJykgfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLmNvbmYudmFsdWVzLCAnbWF4JykpIHsgcmV0dXJuIGNvbnNvbGUubG9nKCdNaXNzaW5nIG1pbiBvciBtYXggdmFsdWUuLi4nKSB9XG4gIH1cbiAgcmV0dXJuIHRoaXMuY3JlYXRlU2xpZGVyKClcbn1cblxuUlMucHJvdG90eXBlLmNyZWF0ZVNsaWRlciA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zbGlkZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy5jb250YWluZXIpXG4gIHRoaXMuc2xpZGVyLmlubmVySFRNTCA9ICc8ZGl2IGNsYXNzPVwicnMtYmdcIj48L2Rpdj4nXG4gIHRoaXMuc2VsZWN0ZWQgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy5zZWxlY3RlZClcbiAgdGhpcy5wb2ludGVyTCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnBvaW50ZXIsIFsnZGlyJywgJ2xlZnQnXSlcbiAgdGhpcy5zY2FsZSA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnNjYWxlKVxuXG4gIGlmICh0aGlzLmNvbmYudG9vbHRpcCkge1xuICAgIHRoaXMudGlwTCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnRpcClcbiAgICB0aGlzLnRpcFIgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy50aXApXG4gICAgdGhpcy5wb2ludGVyTC5hcHBlbmRDaGlsZCh0aGlzLnRpcEwpXG4gIH1cbiAgdGhpcy5zbGlkZXIuYXBwZW5kQ2hpbGQodGhpcy5zZWxlY3RlZClcbiAgdGhpcy5zbGlkZXIuYXBwZW5kQ2hpbGQodGhpcy5zY2FsZSlcbiAgdGhpcy5zbGlkZXIuYXBwZW5kQ2hpbGQodGhpcy5wb2ludGVyTClcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgdGhpcy5wb2ludGVyUiA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnBvaW50ZXIsIFsnZGlyJywgJ3JpZ2h0J10pXG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB0aGlzLnBvaW50ZXJSLmFwcGVuZENoaWxkKHRoaXMudGlwUilcbiAgICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnBvaW50ZXJSKVxuICB9XG5cbiAgdGhpcy5pbnB1dC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLnNsaWRlciwgdGhpcy5pbnB1dC5uZXh0U2libGluZylcblxuICBpZiAodGhpcy5jb25mLndpZHRoKSB0aGlzLnNsaWRlci5zdHlsZS53aWR0aCA9IHBhcnNlSW50KHRoaXMuY29uZi53aWR0aCkgKyAncHgnXG4gIHRoaXMuc2xpZGVyTGVmdCA9IHRoaXMuc2xpZGVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmxlZnRcbiAgdGhpcy5zbGlkZXJXaWR0aCA9IHRoaXMuc2xpZGVyLmNsaWVudFdpZHRoXG4gIHRoaXMucG9pbnRlcldpZHRoID0gdGhpcy5wb2ludGVyTC5jbGllbnRXaWR0aFxuXG4gIGlmICghdGhpcy5jb25mLnNjYWxlKSB0aGlzLnNsaWRlci5jbGFzc0xpc3QuYWRkKHRoaXMuY2xzLm5vc2NhbGUpXG5cbiAgcmV0dXJuIHRoaXMuc2V0SW5pdGlhbFZhbHVlcygpXG59XG5cblJTLnByb3RvdHlwZS5zZXRJbml0aWFsVmFsdWVzID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmRpc2FibGVkKHRoaXMuY29uZi5kaXNhYmxlZClcblxuICBpZiAodGhpcy52YWxSYW5nZSkgdGhpcy5jb25mLnZhbHVlcyA9IHByZXBhcmVBcnJheVZhbHVlcyh0aGlzLmNvbmYpXG5cbiAgdGhpcy52YWx1ZXMuc3RhcnQgPSAwXG4gIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi5yYW5nZSA/IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSA6IDBcblxuICBpZiAodGhpcy5jb25mLnNldCAmJiB0aGlzLmNvbmYuc2V0Lmxlbmd0aCAmJiBjaGVja0luaXRpYWwodGhpcy5jb25mKSkge1xuICAgIHZhciB2YWxzID0gdGhpcy5jb25mLnNldFxuXG4gICAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgICAgdGhpcy52YWx1ZXMuc3RhcnQgPSB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YodmFsc1swXSlcbiAgICAgIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi5zZXRbMV0gPyB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YodmFsc1sxXSkgOiBudWxsXG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzBdKVxuICB9XG4gIHJldHVybiB0aGlzLmNyZWF0ZVNjYWxlKClcbn1cblxuUlMucHJvdG90eXBlLmNyZWF0ZVNjYWxlID0gZnVuY3Rpb24gKHJlc2l6ZSkge1xuICB0aGlzLnN0ZXAgPSB0aGlzLnNsaWRlcldpZHRoIC8gKHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSlcblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7XG4gICAgdmFyIHNwYW4gPSBjcmVhdGVFbGVtZW50KCdzcGFuJylcbiAgICB2YXIgaW5zID0gY3JlYXRlRWxlbWVudCgnaW5zJylcblxuICAgIHNwYW4uYXBwZW5kQ2hpbGQoaW5zKVxuICAgIHRoaXMuc2NhbGUuYXBwZW5kQ2hpbGQoc3BhbilcblxuICAgIHNwYW4uc3R5bGUud2lkdGggPSBpID09PSBpTGVuIC0gMSA/IDAgOiB0aGlzLnN0ZXAgKyAncHgnXG5cbiAgICBpZiAoIXRoaXMuY29uZi5sYWJlbHMpIHtcbiAgICAgIGlmIChpID09PSAwIHx8IGkgPT09IGlMZW4gLSAxKSBpbnMuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1tpXVxuICAgIH0gZWxzZSBpbnMuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1tpXVxuXG4gICAgaW5zLnN0eWxlLm1hcmdpbkxlZnQgPSAoaW5zLmNsaWVudFdpZHRoIC8gMikgKiAtMSArICdweCdcbiAgfVxuICByZXR1cm4gdGhpcy5hZGRFdmVudHMoKVxufVxuXG5SUy5wcm90b3R5cGUudXBkYXRlU2NhbGUgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc3RlcCA9IHRoaXMuc2xpZGVyV2lkdGggLyAodGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKVxuXG4gIHZhciBwaWVjZXMgPSB0aGlzLnNsaWRlci5xdWVyeVNlbGVjdG9yQWxsKCdzcGFuJylcblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IHBpZWNlcy5sZW5ndGg7IGkgPCBpTGVuIC0gMTsgaSsrKSB7IHBpZWNlc1tpXS5zdHlsZS53aWR0aCA9IHRoaXMuc3RlcCArICdweCcgfVxuXG4gIHJldHVybiB0aGlzLnNldFZhbHVlcygpXG59XG5cblJTLnByb3RvdHlwZS5hZGRFdmVudHMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBwb2ludGVycyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy4nICsgdGhpcy5jbHMucG9pbnRlcilcbiAgdmFyIHBpZWNlcyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NwYW4nKVxuXG4gIGNyZWF0ZUV2ZW50cyhkb2N1bWVudCwgJ21vdXNlbW92ZSB0b3VjaG1vdmUnLCB0aGlzLm1vdmUuYmluZCh0aGlzKSlcbiAgY3JlYXRlRXZlbnRzKGRvY3VtZW50LCAnbW91c2V1cCB0b3VjaGVuZCB0b3VjaGNhbmNlbCcsIHRoaXMuZHJvcC5iaW5kKHRoaXMpKVxuXG4gIGZvciAobGV0IGkgPSAwLCBpTGVuID0gcG9pbnRlcnMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7IGNyZWF0ZUV2ZW50cyhwb2ludGVyc1tpXSwgJ21vdXNlZG93biB0b3VjaHN0YXJ0JywgdGhpcy5kcmFnLmJpbmQodGhpcykpIH1cblxuICBmb3IgKGxldCBpID0gMCwgaUxlbiA9IHBpZWNlcy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgY3JlYXRlRXZlbnRzKHBpZWNlc1tpXSwgJ2NsaWNrJywgdGhpcy5vbkNsaWNrUGllY2UuYmluZCh0aGlzKSkgfVxuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLm9uUmVzaXplLmJpbmQodGhpcykpXG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLmRyYWcgPSBmdW5jdGlvbiAoZSkge1xuICBlLnByZXZlbnREZWZhdWx0KClcblxuICBpZiAodGhpcy5jb25mLmRpc2FibGVkKSByZXR1cm5cblxuICB2YXIgZGlyID0gZS50YXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLWRpcicpXG4gIGlmIChkaXIgPT09ICdsZWZ0JykgdGhpcy5hY3RpdmVQb2ludGVyID0gdGhpcy5wb2ludGVyTFxuICBpZiAoZGlyID09PSAncmlnaHQnKSB0aGlzLmFjdGl2ZVBvaW50ZXIgPSB0aGlzLnBvaW50ZXJSXG5cbiAgcmV0dXJuIHRoaXMuc2xpZGVyLmNsYXNzTGlzdC5hZGQoJ3NsaWRpbmcnKVxufVxuXG5SUy5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uIChlKSB7XG4gIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgJiYgIXRoaXMuY29uZi5kaXNhYmxlZCkge1xuICAgIHZhciBjb29yZFggPSBlLnR5cGUgPT09ICd0b3VjaG1vdmUnID8gZS50b3VjaGVzWzBdLmNsaWVudFggOiBlLnBhZ2VYXG4gICAgdmFyIGluZGV4ID0gY29vcmRYIC0gdGhpcy5zbGlkZXJMZWZ0IC0gKHRoaXMucG9pbnRlcldpZHRoIC8gMilcblxuICAgIGluZGV4ID0gTWF0aC5yb3VuZChpbmRleCAvIHRoaXMuc3RlcClcblxuICAgIGlmIChpbmRleCA8PSAwKSBpbmRleCA9IDBcbiAgICBpZiAoaW5kZXggPiB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpIGluZGV4ID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG5cbiAgICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgICBpZiAodGhpcy5hY3RpdmVQb2ludGVyID09PSB0aGlzLnBvaW50ZXJMKSB0aGlzLnZhbHVlcy5zdGFydCA9IGluZGV4XG4gICAgICBpZiAodGhpcy5hY3RpdmVQb2ludGVyID09PSB0aGlzLnBvaW50ZXJSKSB0aGlzLnZhbHVlcy5lbmQgPSBpbmRleFxuICAgIH0gZWxzZSB0aGlzLnZhbHVlcy5lbmQgPSBpbmRleFxuXG4gICAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbiAgfVxufVxuXG5SUy5wcm90b3R5cGUuZHJvcCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5hY3RpdmVQb2ludGVyID0gbnVsbFxufVxuXG5SUy5wcm90b3R5cGUuc2V0VmFsdWVzID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGFjdGl2ZVBvaW50ZXIgPSB0aGlzLmNvbmYucmFuZ2UgPyAnc3RhcnQnIDogJ2VuZCdcblxuICBpZiAoc3RhcnQgJiYgdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHN0YXJ0KSA+IC0xKSB7IHRoaXMudmFsdWVzW2FjdGl2ZVBvaW50ZXJdID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHN0YXJ0KSB9XG5cbiAgaWYgKGVuZCAmJiB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YoZW5kKSA+IC0xKSB7IHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZihlbmQpIH1cblxuICBpZiAodGhpcy5jb25mLnJhbmdlICYmIHRoaXMudmFsdWVzLnN0YXJ0ID4gdGhpcy52YWx1ZXMuZW5kKSB7IHRoaXMudmFsdWVzLnN0YXJ0ID0gdGhpcy52YWx1ZXMuZW5kIH1cblxuICB0aGlzLnBvaW50ZXJMLnN0eWxlLmxlZnQgPSAodGhpcy52YWx1ZXNbYWN0aXZlUG9pbnRlcl0gKiB0aGlzLnN0ZXAgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKSkgKyAncHgnXG5cbiAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgIGlmICh0aGlzLmNvbmYudG9vbHRpcCkge1xuICAgICAgdGhpcy50aXBMLmlubmVySFRNTCA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdXG4gICAgICB0aGlzLnRpcFIuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG4gICAgfVxuICAgIHRoaXMuaW5wdXQudmFsdWUgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLnN0YXJ0XSArICcsJyArIHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxuICAgIHRoaXMucG9pbnRlclIuc3R5bGUubGVmdCA9ICh0aGlzLnZhbHVlcy5lbmQgKiB0aGlzLnN0ZXAgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKSkgKyAncHgnXG4gIH0gZWxzZSB7XG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7IHRoaXMudGlwTC5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF0gfVxuICAgIHRoaXMuaW5wdXQudmFsdWUgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1cbiAgfVxuXG4gIGlmICh0aGlzLnZhbHVlcy5lbmQgPiB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMVxuICBpZiAodGhpcy52YWx1ZXMuc3RhcnQgPCAwKSB0aGlzLnZhbHVlcy5zdGFydCA9IDBcblxuICB0aGlzLnNlbGVjdGVkLnN0eWxlLndpZHRoID0gKHRoaXMudmFsdWVzLmVuZCAtIHRoaXMudmFsdWVzLnN0YXJ0KSAqIHRoaXMuc3RlcCArICdweCdcbiAgdGhpcy5zZWxlY3RlZC5zdHlsZS5sZWZ0ID0gdGhpcy52YWx1ZXMuc3RhcnQgKiB0aGlzLnN0ZXAgKyAncHgnXG5cbiAgcmV0dXJuIHRoaXMub25DaGFuZ2UoKVxufVxuXG5SUy5wcm90b3R5cGUub25DbGlja1BpZWNlID0gZnVuY3Rpb24gKGUpIHtcbiAgaWYgKHRoaXMuY29uZi5kaXNhYmxlZCkgcmV0dXJuXG5cbiAgdmFyIGlkeCA9IE1hdGgucm91bmQoKGUuY2xpZW50WCAtIHRoaXMuc2xpZGVyTGVmdCkgLyB0aGlzLnN0ZXApXG5cbiAgaWYgKGlkeCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgaWR4ID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG4gIGlmIChpZHggPCAwKSBpZHggPSAwXG5cbiAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgIGlmIChpZHggLSB0aGlzLnZhbHVlcy5zdGFydCA8PSB0aGlzLnZhbHVlcy5lbmQgLSBpZHgpIHtcbiAgICAgIHRoaXMudmFsdWVzLnN0YXJ0ID0gaWR4XG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IGlkeFxuICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gaWR4XG5cbiAgdGhpcy5zbGlkZXIuY2xhc3NMaXN0LnJlbW92ZSgnc2xpZGluZycpXG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLm9uQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX3RoaXMgPSB0aGlzXG5cbiAgaWYgKHRoaXMudGltZW91dCkgY2xlYXJUaW1lb3V0KHRoaXMudGltZW91dClcblxuICB0aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoX3RoaXMuY29uZi5vbkNoYW5nZSAmJiB0eXBlb2YgX3RoaXMuY29uZi5vbkNoYW5nZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIF90aGlzLmNvbmYub25DaGFuZ2UoX3RoaXMuaW5wdXQudmFsdWUpXG4gICAgfVxuICB9LCA1MDApXG59XG5cblJTLnByb3RvdHlwZS5vblJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gdGhpcy5zbGlkZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdFxuICB0aGlzLnNsaWRlcldpZHRoID0gdGhpcy5zbGlkZXIuY2xpZW50V2lkdGhcbiAgcmV0dXJuIHRoaXMudXBkYXRlU2NhbGUoKVxufVxuXG5SUy5wcm90b3R5cGUuZGlzYWJsZWQgPSBmdW5jdGlvbiAoZGlzYWJsZWQpIHtcbiAgdGhpcy5jb25mLmRpc2FibGVkID0gZGlzYWJsZWRcbiAgdGhpcy5zbGlkZXIuY2xhc3NMaXN0W2Rpc2FibGVkID8gJ2FkZCcgOiAncmVtb3ZlJ10oJ2Rpc2FibGVkJylcbn1cblxuUlMucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAvLyBSZXR1cm4gbGlzdCBvZiBudW1iZXJzLCByYXRoZXIgdGhhbiBhIHN0cmluZywgd2hpY2ggd291bGQganVzdCBiZSBzaWxseVxuICAvLyAgcmV0dXJuIHRoaXMuaW5wdXQudmFsdWVcbiAgcmV0dXJuIFt0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLnN0YXJ0XSwgdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXVxufVxuXG5SUy5wcm90b3R5cGUuZ2V0VmFsdWVMID0gZnVuY3Rpb24gKCkge1xuICAvLyBHZXQgbGVmdCAoaS5lLiBzbWFsbGVzdCkgdmFsdWVcbiAgcmV0dXJuIHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdXG59XG5cblJTLnByb3RvdHlwZS5nZXRWYWx1ZVIgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIEdldCByaWdodCAoaS5lLiBzbWFsbGVzdCkgdmFsdWVcbiAgcmV0dXJuIHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxufVxuXG5SUy5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5pbnB1dC5zdHlsZS5kaXNwbGF5ID0gdGhpcy5pbnB1dERpc3BsYXlcbiAgdGhpcy5zbGlkZXIucmVtb3ZlKClcbn1cblxudmFyIGNyZWF0ZUVsZW1lbnQgPSBmdW5jdGlvbiAoZWwsIGNscywgZGF0YUF0dHIpIHtcbiAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGVsKVxuICBpZiAoY2xzKSBlbGVtZW50LmNsYXNzTmFtZSA9IGNsc1xuICBpZiAoZGF0YUF0dHIgJiYgZGF0YUF0dHIubGVuZ3RoID09PSAyKSB7IGVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLScgKyBkYXRhQXR0clswXSwgZGF0YUF0dHJbMV0pIH1cblxuICByZXR1cm4gZWxlbWVudFxufVxuXG52YXIgY3JlYXRlRXZlbnRzID0gZnVuY3Rpb24gKGVsLCBldiwgY2FsbGJhY2spIHtcbiAgdmFyIGV2ZW50cyA9IGV2LnNwbGl0KCcgJylcblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IGV2ZW50cy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudHNbaV0sIGNhbGxiYWNrKSB9XG59XG5cbnZhciBwcmVwYXJlQXJyYXlWYWx1ZXMgPSBmdW5jdGlvbiAoY29uZikge1xuICB2YXIgdmFsdWVzID0gW11cbiAgdmFyIHJhbmdlID0gY29uZi52YWx1ZXMubWF4IC0gY29uZi52YWx1ZXMubWluXG5cbiAgaWYgKCFjb25mLnN0ZXApIHtcbiAgICBjb25zb2xlLmxvZygnTm8gc3RlcCBkZWZpbmVkLi4uJylcbiAgICByZXR1cm4gW2NvbmYudmFsdWVzLm1pbiwgY29uZi52YWx1ZXMubWF4XVxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGlMZW4gPSAocmFuZ2UgLyBjb25mLnN0ZXApOyBpIDwgaUxlbjsgaSsrKSB7IHZhbHVlcy5wdXNoKGNvbmYudmFsdWVzLm1pbiArIGkgKiBjb25mLnN0ZXApIH1cblxuICBpZiAodmFsdWVzLmluZGV4T2YoY29uZi52YWx1ZXMubWF4KSA8IDApIHZhbHVlcy5wdXNoKGNvbmYudmFsdWVzLm1heClcblxuICByZXR1cm4gdmFsdWVzXG59XG5cbnZhciBjaGVja0luaXRpYWwgPSBmdW5jdGlvbiAoY29uZikge1xuICBpZiAoIWNvbmYuc2V0IHx8IGNvbmYuc2V0Lmxlbmd0aCA8IDEpIHJldHVybiBudWxsXG4gIGlmIChjb25mLnZhbHVlcy5pbmRleE9mKGNvbmYuc2V0WzBdKSA8IDApIHJldHVybiBudWxsXG5cbiAgaWYgKGNvbmYucmFuZ2UpIHtcbiAgICBpZiAoY29uZi5zZXQubGVuZ3RoIDwgMiB8fCBjb25mLnZhbHVlcy5pbmRleE9mKGNvbmYuc2V0WzFdKSA8IDApIHJldHVybiBudWxsXG4gIH1cbiAgcmV0dXJuIHRydWVcbn1cblxuZXhwb3J0IGRlZmF1bHQgUlNcbiIsIi8qIFJOR3MgLyBzZWxlY3RvcnMgKi9cbmV4cG9ydCBmdW5jdGlvbiBnYXVzc2lhbiAobikge1xuICBsZXQgcm51bSA9IDBcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICBybnVtICs9IE1hdGgucmFuZG9tKClcbiAgfVxuICByZXR1cm4gcm51bSAvIG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJhbmRCZXR3ZWVuIChuLCBtLCBkaXN0KSB7XG4gIC8vIHJldHVybiBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbiBhbmQgbSBpbmNsdXNpdmVcbiAgLy8gZGlzdCAob3B0aW9uYWwpIGlzIGEgZnVuY3Rpb24gcmV0dXJuaW5nIGEgdmFsdWUgaW4gWzAsMSlcbiAgLy8gZGVmYXVsdCBpcyBzbGlnaHRseSBiaWFzZWQgdG93YXJkcyBtaWRkbGVcbiAgaWYgKCFkaXN0KSBkaXN0ID0gTWF0aC5yYW5kb21cbiAgcmV0dXJuIG4gKyBNYXRoLmZsb29yKGRpc3QoKSAqIChtIC0gbiArIDEpKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZEJldHdlZW5GaWx0ZXIgKG4sIG0sIGZpbHRlcikge1xuICAvKiByZXR1cm5zIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBuIGFuZCBtIGluY2x1c2l2ZSB3aGljaCBzYXRpc2ZpZXMgdGhlIGZpbHRlclxuICAvICBuLCBtOiBpbnRlZ2VyXG4gIC8gIGZpbHRlcjogSW50LT4gQm9vbFxuICAqL1xuICBjb25zdCBhcnIgPSBbXVxuICBmb3IgKGxldCBpID0gbjsgaSA8IG0gKyAxOyBpKyspIHtcbiAgICBpZiAoZmlsdGVyKGkpKSBhcnIucHVzaChpKVxuICB9XG4gIGlmIChhcnIgPT09IFtdKSB0aHJvdyBuZXcgRXJyb3IoJ292ZXJmaWx0ZXJlZCcpXG4gIGNvbnN0IGkgPSByYW5kQmV0d2VlbigwLCBhcnIubGVuZ3RoIC0gMSlcbiAgcmV0dXJuIGFycltpXVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZE11bHRCZXR3ZWVuIChtaW4sIG1heCwgbikge1xuICAvLyByZXR1cm4gYSByYW5kb20gbXVsdGlwbGUgb2YgbiBiZXR3ZWVuIG4gYW5kIG0gKGluY2x1c2l2ZSBpZiBwb3NzaWJsZSlcbiAgbWluID0gTWF0aC5jZWlsKG1pbiAvIG4pICogblxuICBtYXggPSBNYXRoLmZsb29yKG1heCAvIG4pICogbiAvLyBjb3VsZCBjaGVjayBkaXZpc2liaWxpdHkgZmlyc3QgdG8gbWF4aW1pc2UgcGVyZm9ybWFjZSwgYnV0IEknbSBzdXJlIHRoZSBoaXQgaXNuJ3QgYmFkXG5cbiAgcmV0dXJuIHJhbmRCZXR3ZWVuKG1pbiAvIG4sIG1heCAvIG4pICogblxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZEVsZW0gKGFycmF5LCBkaXN0KSB7XG4gIGlmIChbLi4uYXJyYXldLmxlbmd0aCA9PT0gMCkgdGhyb3cgbmV3IEVycm9yKCdlbXB0eSBhcnJheScpXG4gIGlmICghZGlzdCkgZGlzdCA9IE1hdGgucmFuZG9tXG4gIGNvbnN0IG4gPSBhcnJheS5sZW5ndGggfHwgYXJyYXkuc2l6ZVxuICBjb25zdCBpID0gcmFuZEJldHdlZW4oMCwgbiAtIDEsIGRpc3QpXG4gIHJldHVybiBbLi4uYXJyYXldW2ldXG59XG5cbi8qIE1hdGhzICovXG5leHBvcnQgZnVuY3Rpb24gcm91bmRUb1RlbiAobikge1xuICByZXR1cm4gTWF0aC5yb3VuZChuIC8gMTApICogMTBcbn1cblxuLyoqXG4gKiBSb3VuZHMgYSBudW1iZXIgdG8gYSBnaXZlbiBudW1iZXIgb2YgZGVjaW1hbCBwbGFjZXNcbiAqIEBwYXJhbSB7bnVtYmVyfSB4IFRoZSBudW1iZXIgdG8gcm91bmRcbiAqIEBwYXJhbSB7bnVtYmVyfSBuIFRoZSBudW1iZXIgb2YgZGVjaW1hbCBwbGFjZXNcbiAqIEByZXR1cm5zIHtudW1iZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByb3VuZERQICh4LCBuKSB7XG4gIHJldHVybiBNYXRoLnJvdW5kKHggKiBNYXRoLnBvdygxMCwgbikpIC8gTWF0aC5wb3coMTAsIG4pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWdUb1JhZCAoeCkge1xuICByZXR1cm4geCAqIE1hdGguUEkgLyAxODBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNpbkRlZyAoeCkge1xuICByZXR1cm4gTWF0aC5zaW4oeCAqIE1hdGguUEkgLyAxODApXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb3NEZWcgKHgpIHtcbiAgcmV0dXJuIE1hdGguY29zKHggKiBNYXRoLlBJIC8gMTgwKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2NhbGVkU3RyIChuLCBkcCkge1xuICAvLyByZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGluZyBuLzEwXmRwXG4gIC8vIGUuZy4gc2NhbGVkU3RyKDM0LDEpPVwiMy40XCJcbiAgLy8gc2NhbGVkU3RyKDMxNCwyKT1cIjMuMTRcIlxuICAvLyBzY2FsZWRTdHIoMzAsMSk9XCIzXCJcbiAgLy8gVHJ5aW5nIHRvIGF2b2lkIHByZWNpc2lvbiBlcnJvcnMhXG4gIGlmIChkcCA9PT0gMCkgcmV0dXJuIG5cbiAgY29uc3QgZmFjdG9yID0gTWF0aC5wb3coMTAsIGRwKVxuICBjb25zdCBpbnRwYXJ0ID0gTWF0aC5mbG9vcihuIC8gZmFjdG9yKVxuICBjb25zdCBkZWNwYXJ0ID0gbiAlIGZhY3RvclxuICBpZiAoZGVjcGFydCA9PT0gMCkge1xuICAgIHJldHVybiBpbnRwYXJ0XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGludHBhcnQgKyAnLicgKyBkZWNwYXJ0XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdjZCAoYSwgYikge1xuICAvLyB0YWtlbiBmcm9tIGZyYWN0aW9uLmpzXG4gIGlmICghYSkgeyByZXR1cm4gYiB9XG4gIGlmICghYikgeyByZXR1cm4gYSB9XG5cbiAgd2hpbGUgKDEpIHtcbiAgICBhICU9IGJcbiAgICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICAgIGIgJT0gYVxuICAgIGlmICghYikgeyByZXR1cm4gYSB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxjbSAoYSwgYikge1xuICByZXR1cm4gYSAqIGIgLyBnY2QoYSwgYilcbn1cblxuLyogQXJyYXlzIGFuZCBzaW1pbGFyICovXG5cbi8qKlxuICogU29ydHMgdHdvIGFycmF5cyB0b2dldGhlciBiYXNlZCBvbiBzb3J0aW5nIGFycjBcbiAqIEBwYXJhbSB7KltdfSBhcnIwXG4gKiBAcGFyYW0geypbXX0gYXJyMVxuICogQHBhcmFtIHsqfSBmXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzb3J0VG9nZXRoZXIgKGFycjAsIGFycjEsIGYpIHtcbiAgaWYgKGFycjAubGVuZ3RoICE9PSBhcnIxLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JvdGggYXJndW1lbnRzIG11c3QgYmUgYXJyYXlzIG9mIHRoZSBzYW1lIGxlbmd0aCcpXG4gIH1cblxuICBmID0gZiB8fCAoKHgsIHkpID0+IHggLSB5KVxuXG4gIGNvbnN0IG4gPSBhcnIwLmxlbmd0aFxuICBjb25zdCBjb21iaW5lZCA9IFtdXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgY29tYmluZWRbaV0gPSBbYXJyMFtpXSwgYXJyMVtpXV1cbiAgfVxuXG4gIGNvbWJpbmVkLnNvcnQoKHgsIHkpID0+IGYoeFswXSwgeVswXSkpXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICBhcnIwW2ldID0gY29tYmluZWRbaV1bMF1cbiAgICBhcnIxW2ldID0gY29tYmluZWRbaV1bMV1cbiAgfVxuXG4gIHJldHVybiBbYXJyMCwgYXJyMV1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGUgKGFycmF5KSB7XG4gIC8vIEtudXRoLUZpc2hlci1ZYXRlc1xuICAvLyBmcm9tIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yNDUwOTc2LzM3MzcyOTVcbiAgLy8gbmIuIHNodWZmbGVzIGluIHBsYWNlXG4gIHZhciBjdXJyZW50SW5kZXggPSBhcnJheS5sZW5ndGg7IHZhciB0ZW1wb3JhcnlWYWx1ZTsgdmFyIHJhbmRvbUluZGV4XG5cbiAgLy8gV2hpbGUgdGhlcmUgcmVtYWluIGVsZW1lbnRzIHRvIHNodWZmbGUuLi5cbiAgd2hpbGUgKGN1cnJlbnRJbmRleCAhPT0gMCkge1xuICAgIC8vIFBpY2sgYSByZW1haW5pbmcgZWxlbWVudC4uLlxuICAgIHJhbmRvbUluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY3VycmVudEluZGV4KVxuICAgIGN1cnJlbnRJbmRleCAtPSAxXG5cbiAgICAvLyBBbmQgc3dhcCBpdCB3aXRoIHRoZSBjdXJyZW50IGVsZW1lbnQuXG4gICAgdGVtcG9yYXJ5VmFsdWUgPSBhcnJheVtjdXJyZW50SW5kZXhdXG4gICAgYXJyYXlbY3VycmVudEluZGV4XSA9IGFycmF5W3JhbmRvbUluZGV4XVxuICAgIGFycmF5W3JhbmRvbUluZGV4XSA9IHRlbXBvcmFyeVZhbHVlXG4gIH1cblxuICByZXR1cm4gYXJyYXlcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgYSBpcyBhbiBhcnJheSBjb250YWluaW5nIGUsIGZhbHNlIG90aGVyd2lzZSAoaW5jbHVkaW5nIGlmIGEgaXMgbm90IGFuIGFycmF5KVxuICogQHBhcmFtIHsqfSBhICBBbiBhcnJheVxuICogQHBhcmFtIHsqfSBlIEFuIGVsZW1lbnQgdG8gY2hlY2sgaWYgaXMgaW4gdGhlIGFycmF5XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdlYWtJbmNsdWRlcyAoYSwgZSkge1xuICByZXR1cm4gKEFycmF5LmlzQXJyYXkoYSkgJiYgYS5pbmNsdWRlcyhlKSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpcnN0VW5pcXVlSW5kZXggKGFycmF5KSB7XG4gIC8vIHJldHVybnMgaW5kZXggb2YgZmlyc3QgdW5pcXVlIGVsZW1lbnRcbiAgLy8gaWYgbm9uZSwgcmV0dXJucyBsZW5ndGggb2YgYXJyYXlcbiAgbGV0IGkgPSAwXG4gIHdoaWxlIChpIDwgYXJyYXkubGVuZ3RoKSB7XG4gICAgaWYgKGFycmF5LmluZGV4T2YoYXJyYXlbaV0pID09PSBhcnJheS5sYXN0SW5kZXhPZihhcnJheVtpXSkpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIGkrK1xuICB9XG4gIHJldHVybiBpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBib29sT2JqZWN0VG9BcnJheSAob2JqKSB7XG4gIC8vIEdpdmVuIGFuIG9iamVjdCB3aGVyZSBhbGwgdmFsdWVzIGFyZSBib29sZWFuLCByZXR1cm4ga2V5cyB3aGVyZSB0aGUgdmFsdWUgaXMgdHJ1ZVxuICBjb25zdCByZXN1bHQgPSBbXVxuICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHtcbiAgICBpZiAob2JqW2tleV0pIHJlc3VsdC5wdXNoKGtleSlcbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qIE9iamVjdCBwcm9wZXJ0eSBhY2Nlc3MgYnkgc3RyaW5nICovXG5leHBvcnQgZnVuY3Rpb24gcHJvcEJ5U3RyaW5nIChvLCBzLCB4KSB7XG4gIC8qIEUuZy4gYnlTdHJpbmcobXlPYmosXCJmb28uYmFyXCIpIC0+IG15T2JqLmZvby5iYXJcbiAgICAgKiBieVN0cmluZyhteU9iaixcImZvby5iYXJcIixcImJhelwiKSAtPiBteU9iai5mb28uYmFyID0gXCJiYXpcIlxuICAgICAqL1xuICBzID0gcy5yZXBsYWNlKC9cXFsoXFx3KylcXF0vZywgJy4kMScpIC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gIHMgPSBzLnJlcGxhY2UoL15cXC4vLCAnJykgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICB2YXIgYSA9IHMuc3BsaXQoJy4nKVxuICBmb3IgKHZhciBpID0gMCwgbiA9IGEubGVuZ3RoIC0gMTsgaSA8IG47ICsraSkge1xuICAgIHZhciBrID0gYVtpXVxuICAgIGlmIChrIGluIG8pIHtcbiAgICAgIG8gPSBvW2tdXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgfVxuICBpZiAoeCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gb1thW25dXVxuICBlbHNlIG9bYVtuXV0gPSB4XG59XG5cbi8qIExvZ2ljICovXG5leHBvcnQgZnVuY3Rpb24gbUlmIChwLCBxKSB7IC8vIG1hdGVyaWFsIGNvbmRpdGlvbmFsXG4gIHJldHVybiAoIXAgfHwgcSlcbn1cblxuLyogRE9NIG1hbmlwdWxhdGlvbiBhbmQgcXVlcnlpbmcgKi9cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IEhUTUwgZWxlbWVudCwgc2V0cyBjbGFzc2VzIGFuZCBhcHBlbmRzXG4gKiBAcGFyYW0ge3N0cmluZ30gdGFnTmFtZSBUYWcgbmFtZSBvZiBlbGVtZW50XG4gKiBAcGFyYW0ge3N0cmluZ3x1bmRlZmluZWR9IFtjbGFzc05hbWVdIEEgY2xhc3Mgb3IgY2xhc3NlcyB0byBhc3NpZ24gdG8gdGhlIGVsZW1lbnRcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IFtwYXJlbnRdIEEgcGFyZW50IGVsZW1lbnQgdG8gYXBwZW5kIHRoZSBlbGVtZW50IHRvXG4gKiBAcmV0dXJucyB7SFRNTEVsZW1lbnR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbGVtICh0YWdOYW1lLCBjbGFzc05hbWUsIHBhcmVudCkge1xuICAvLyBjcmVhdGUsIHNldCBjbGFzcyBhbmQgYXBwZW5kIGluIG9uZVxuICBjb25zdCBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKVxuICBpZiAoY2xhc3NOYW1lKSBlbGVtLmNsYXNzTmFtZSA9IGNsYXNzTmFtZVxuICBpZiAocGFyZW50KSBwYXJlbnQuYXBwZW5kQ2hpbGQoZWxlbSlcbiAgcmV0dXJuIGVsZW1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc0FuY2VzdG9yQ2xhc3MgKGVsZW0sIGNsYXNzTmFtZSkge1xuICAvLyBjaGVjayBpZiBhbiBlbGVtZW50IGVsZW0gb3IgYW55IG9mIGl0cyBhbmNlc3RvcnMgaGFzIGNsc3NcbiAgbGV0IHJlc3VsdCA9IGZhbHNlXG4gIGZvciAoO2VsZW0gJiYgZWxlbSAhPT0gZG9jdW1lbnQ7IGVsZW0gPSBlbGVtLnBhcmVudE5vZGUpIHsgLy8gdHJhdmVyc2UgRE9NIHVwd2FyZHNcbiAgICBpZiAoZWxlbS5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKSkge1xuICAgICAgcmVzdWx0ID0gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qIENhbnZhcyBkcmF3aW5nICovXG5leHBvcnQgZnVuY3Rpb24gZGFzaGVkTGluZSAoY3R4LCB4MSwgeTEsIHgyLCB5Mikge1xuICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHgyIC0geDEsIHkyIC0geTEpXG4gIGNvbnN0IGRhc2h4ID0gKHkxIC0geTIpIC8gbGVuZ3RoIC8vIHVuaXQgdmVjdG9yIHBlcnBlbmRpY3VsYXIgdG8gbGluZVxuICBjb25zdCBkYXNoeSA9ICh4MiAtIHgxKSAvIGxlbmd0aFxuICBjb25zdCBtaWR4ID0gKHgxICsgeDIpIC8gMlxuICBjb25zdCBtaWR5ID0gKHkxICsgeTIpIC8gMlxuXG4gIC8vIGRyYXcgdGhlIGJhc2UgbGluZVxuICBjdHgubW92ZVRvKHgxLCB5MSlcbiAgY3R4LmxpbmVUbyh4MiwgeTIpXG5cbiAgLy8gZHJhdyB0aGUgZGFzaFxuICBjdHgubW92ZVRvKG1pZHggKyA1ICogZGFzaHgsIG1pZHkgKyA1ICogZGFzaHkpXG4gIGN0eC5saW5lVG8obWlkeCAtIDUgKiBkYXNoeCwgbWlkeSAtIDUgKiBkYXNoeSlcblxuICBjdHgubW92ZVRvKHgyLCB5Milcbn1cbiIsIi8vIFRoaXMgZmlsZSBoYXMgYmVlbiBnZW5lcmF0ZWQgZnJvbSBtdXN0YWNoZS5tanNcbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gIHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpIDpcbiAgdHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKGZhY3RvcnkpIDpcbiAgKGdsb2JhbCA9IGdsb2JhbCB8fCBzZWxmLCBnbG9iYWwuTXVzdGFjaGUgPSBmYWN0b3J5KCkpO1xufSh0aGlzLCAoZnVuY3Rpb24gKCkgeyAndXNlIHN0cmljdCc7XG5cbiAgLyohXG4gICAqIG11c3RhY2hlLmpzIC0gTG9naWMtbGVzcyB7e211c3RhY2hlfX0gdGVtcGxhdGVzIHdpdGggSmF2YVNjcmlwdFxuICAgKiBodHRwOi8vZ2l0aHViLmNvbS9qYW5sL211c3RhY2hlLmpzXG4gICAqL1xuXG4gIHZhciBvYmplY3RUb1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiBpc0FycmF5UG9seWZpbGwgKG9iamVjdCkge1xuICAgIHJldHVybiBvYmplY3RUb1N0cmluZy5jYWxsKG9iamVjdCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG5cbiAgZnVuY3Rpb24gaXNGdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmplY3QgPT09ICdmdW5jdGlvbic7XG4gIH1cblxuICAvKipcbiAgICogTW9yZSBjb3JyZWN0IHR5cGVvZiBzdHJpbmcgaGFuZGxpbmcgYXJyYXlcbiAgICogd2hpY2ggbm9ybWFsbHkgcmV0dXJucyB0eXBlb2YgJ29iamVjdCdcbiAgICovXG4gIGZ1bmN0aW9uIHR5cGVTdHIgKG9iaikge1xuICAgIHJldHVybiBpc0FycmF5KG9iaikgPyAnYXJyYXknIDogdHlwZW9mIG9iajtcbiAgfVxuXG4gIGZ1bmN0aW9uIGVzY2FwZVJlZ0V4cCAoc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC9bXFwtXFxbXFxde30oKSorPy4sXFxcXFxcXiR8I1xcc10vZywgJ1xcXFwkJicpO1xuICB9XG5cbiAgLyoqXG4gICAqIE51bGwgc2FmZSB3YXkgb2YgY2hlY2tpbmcgd2hldGhlciBvciBub3QgYW4gb2JqZWN0LFxuICAgKiBpbmNsdWRpbmcgaXRzIHByb3RvdHlwZSwgaGFzIGEgZ2l2ZW4gcHJvcGVydHlcbiAgICovXG4gIGZ1bmN0aW9uIGhhc1Byb3BlcnR5IChvYmosIHByb3BOYW1lKSB7XG4gICAgcmV0dXJuIG9iaiAhPSBudWxsICYmIHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIChwcm9wTmFtZSBpbiBvYmopO1xuICB9XG5cbiAgLyoqXG4gICAqIFNhZmUgd2F5IG9mIGRldGVjdGluZyB3aGV0aGVyIG9yIG5vdCB0aGUgZ2l2ZW4gdGhpbmcgaXMgYSBwcmltaXRpdmUgYW5kXG4gICAqIHdoZXRoZXIgaXQgaGFzIHRoZSBnaXZlbiBwcm9wZXJ0eVxuICAgKi9cbiAgZnVuY3Rpb24gcHJpbWl0aXZlSGFzT3duUHJvcGVydHkgKHByaW1pdGl2ZSwgcHJvcE5hbWUpIHtcbiAgICByZXR1cm4gKFxuICAgICAgcHJpbWl0aXZlICE9IG51bGxcbiAgICAgICYmIHR5cGVvZiBwcmltaXRpdmUgIT09ICdvYmplY3QnXG4gICAgICAmJiBwcmltaXRpdmUuaGFzT3duUHJvcGVydHlcbiAgICAgICYmIHByaW1pdGl2ZS5oYXNPd25Qcm9wZXJ0eShwcm9wTmFtZSlcbiAgICApO1xuICB9XG5cbiAgLy8gV29ya2Fyb3VuZCBmb3IgaHR0cHM6Ly9pc3N1ZXMuYXBhY2hlLm9yZy9qaXJhL2Jyb3dzZS9DT1VDSERCLTU3N1xuICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2phbmwvbXVzdGFjaGUuanMvaXNzdWVzLzE4OVxuICB2YXIgcmVnRXhwVGVzdCA9IFJlZ0V4cC5wcm90b3R5cGUudGVzdDtcbiAgZnVuY3Rpb24gdGVzdFJlZ0V4cCAocmUsIHN0cmluZykge1xuICAgIHJldHVybiByZWdFeHBUZXN0LmNhbGwocmUsIHN0cmluZyk7XG4gIH1cblxuICB2YXIgbm9uU3BhY2VSZSA9IC9cXFMvO1xuICBmdW5jdGlvbiBpc1doaXRlc3BhY2UgKHN0cmluZykge1xuICAgIHJldHVybiAhdGVzdFJlZ0V4cChub25TcGFjZVJlLCBzdHJpbmcpO1xuICB9XG5cbiAgdmFyIGVudGl0eU1hcCA9IHtcbiAgICAnJic6ICcmYW1wOycsXG4gICAgJzwnOiAnJmx0OycsXG4gICAgJz4nOiAnJmd0OycsXG4gICAgJ1wiJzogJyZxdW90OycsXG4gICAgXCInXCI6ICcmIzM5OycsXG4gICAgJy8nOiAnJiN4MkY7JyxcbiAgICAnYCc6ICcmI3g2MDsnLFxuICAgICc9JzogJyYjeDNEOydcbiAgfTtcblxuICBmdW5jdGlvbiBlc2NhcGVIdG1sIChzdHJpbmcpIHtcbiAgICByZXR1cm4gU3RyaW5nKHN0cmluZykucmVwbGFjZSgvWyY8PlwiJ2A9XFwvXS9nLCBmdW5jdGlvbiBmcm9tRW50aXR5TWFwIChzKSB7XG4gICAgICByZXR1cm4gZW50aXR5TWFwW3NdO1xuICAgIH0pO1xuICB9XG5cbiAgdmFyIHdoaXRlUmUgPSAvXFxzKi87XG4gIHZhciBzcGFjZVJlID0gL1xccysvO1xuICB2YXIgZXF1YWxzUmUgPSAvXFxzKj0vO1xuICB2YXIgY3VybHlSZSA9IC9cXHMqXFx9LztcbiAgdmFyIHRhZ1JlID0gLyN8XFxefFxcL3w+fFxce3wmfD18IS87XG5cbiAgLyoqXG4gICAqIEJyZWFrcyB1cCB0aGUgZ2l2ZW4gYHRlbXBsYXRlYCBzdHJpbmcgaW50byBhIHRyZWUgb2YgdG9rZW5zLiBJZiB0aGUgYHRhZ3NgXG4gICAqIGFyZ3VtZW50IGlzIGdpdmVuIGhlcmUgaXQgbXVzdCBiZSBhbiBhcnJheSB3aXRoIHR3byBzdHJpbmcgdmFsdWVzOiB0aGVcbiAgICogb3BlbmluZyBhbmQgY2xvc2luZyB0YWdzIHVzZWQgaW4gdGhlIHRlbXBsYXRlIChlLmcuIFsgXCI8JVwiLCBcIiU+XCIgXSkuIE9mXG4gICAqIGNvdXJzZSwgdGhlIGRlZmF1bHQgaXMgdG8gdXNlIG11c3RhY2hlcyAoaS5lLiBtdXN0YWNoZS50YWdzKS5cbiAgICpcbiAgICogQSB0b2tlbiBpcyBhbiBhcnJheSB3aXRoIGF0IGxlYXN0IDQgZWxlbWVudHMuIFRoZSBmaXJzdCBlbGVtZW50IGlzIHRoZVxuICAgKiBtdXN0YWNoZSBzeW1ib2wgdGhhdCB3YXMgdXNlZCBpbnNpZGUgdGhlIHRhZywgZS5nLiBcIiNcIiBvciBcIiZcIi4gSWYgdGhlIHRhZ1xuICAgKiBkaWQgbm90IGNvbnRhaW4gYSBzeW1ib2wgKGkuZS4ge3tteVZhbHVlfX0pIHRoaXMgZWxlbWVudCBpcyBcIm5hbWVcIi4gRm9yXG4gICAqIGFsbCB0ZXh0IHRoYXQgYXBwZWFycyBvdXRzaWRlIGEgc3ltYm9sIHRoaXMgZWxlbWVudCBpcyBcInRleHRcIi5cbiAgICpcbiAgICogVGhlIHNlY29uZCBlbGVtZW50IG9mIGEgdG9rZW4gaXMgaXRzIFwidmFsdWVcIi4gRm9yIG11c3RhY2hlIHRhZ3MgdGhpcyBpc1xuICAgKiB3aGF0ZXZlciBlbHNlIHdhcyBpbnNpZGUgdGhlIHRhZyBiZXNpZGVzIHRoZSBvcGVuaW5nIHN5bWJvbC4gRm9yIHRleHQgdG9rZW5zXG4gICAqIHRoaXMgaXMgdGhlIHRleHQgaXRzZWxmLlxuICAgKlxuICAgKiBUaGUgdGhpcmQgYW5kIGZvdXJ0aCBlbGVtZW50cyBvZiB0aGUgdG9rZW4gYXJlIHRoZSBzdGFydCBhbmQgZW5kIGluZGljZXMsXG4gICAqIHJlc3BlY3RpdmVseSwgb2YgdGhlIHRva2VuIGluIHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZS5cbiAgICpcbiAgICogVG9rZW5zIHRoYXQgYXJlIHRoZSByb290IG5vZGUgb2YgYSBzdWJ0cmVlIGNvbnRhaW4gdHdvIG1vcmUgZWxlbWVudHM6IDEpIGFuXG4gICAqIGFycmF5IG9mIHRva2VucyBpbiB0aGUgc3VidHJlZSBhbmQgMikgdGhlIGluZGV4IGluIHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZSBhdFxuICAgKiB3aGljaCB0aGUgY2xvc2luZyB0YWcgZm9yIHRoYXQgc2VjdGlvbiBiZWdpbnMuXG4gICAqXG4gICAqIFRva2VucyBmb3IgcGFydGlhbHMgYWxzbyBjb250YWluIHR3byBtb3JlIGVsZW1lbnRzOiAxKSBhIHN0cmluZyB2YWx1ZSBvZlxuICAgKiBpbmRlbmRhdGlvbiBwcmlvciB0byB0aGF0IHRhZyBhbmQgMikgdGhlIGluZGV4IG9mIHRoYXQgdGFnIG9uIHRoYXQgbGluZSAtXG4gICAqIGVnIGEgdmFsdWUgb2YgMiBpbmRpY2F0ZXMgdGhlIHBhcnRpYWwgaXMgdGhlIHRoaXJkIHRhZyBvbiB0aGlzIGxpbmUuXG4gICAqL1xuICBmdW5jdGlvbiBwYXJzZVRlbXBsYXRlICh0ZW1wbGF0ZSwgdGFncykge1xuICAgIGlmICghdGVtcGxhdGUpXG4gICAgICByZXR1cm4gW107XG4gICAgdmFyIGxpbmVIYXNOb25TcGFjZSA9IGZhbHNlO1xuICAgIHZhciBzZWN0aW9ucyA9IFtdOyAgICAgLy8gU3RhY2sgdG8gaG9sZCBzZWN0aW9uIHRva2Vuc1xuICAgIHZhciB0b2tlbnMgPSBbXTsgICAgICAgLy8gQnVmZmVyIHRvIGhvbGQgdGhlIHRva2Vuc1xuICAgIHZhciBzcGFjZXMgPSBbXTsgICAgICAgLy8gSW5kaWNlcyBvZiB3aGl0ZXNwYWNlIHRva2VucyBvbiB0aGUgY3VycmVudCBsaW5lXG4gICAgdmFyIGhhc1RhZyA9IGZhbHNlOyAgICAvLyBJcyB0aGVyZSBhIHt7dGFnfX0gb24gdGhlIGN1cnJlbnQgbGluZT9cbiAgICB2YXIgbm9uU3BhY2UgPSBmYWxzZTsgIC8vIElzIHRoZXJlIGEgbm9uLXNwYWNlIGNoYXIgb24gdGhlIGN1cnJlbnQgbGluZT9cbiAgICB2YXIgaW5kZW50YXRpb24gPSAnJzsgIC8vIFRyYWNrcyBpbmRlbnRhdGlvbiBmb3IgdGFncyB0aGF0IHVzZSBpdFxuICAgIHZhciB0YWdJbmRleCA9IDA7ICAgICAgLy8gU3RvcmVzIGEgY291bnQgb2YgbnVtYmVyIG9mIHRhZ3MgZW5jb3VudGVyZWQgb24gYSBsaW5lXG5cbiAgICAvLyBTdHJpcHMgYWxsIHdoaXRlc3BhY2UgdG9rZW5zIGFycmF5IGZvciB0aGUgY3VycmVudCBsaW5lXG4gICAgLy8gaWYgdGhlcmUgd2FzIGEge3sjdGFnfX0gb24gaXQgYW5kIG90aGVyd2lzZSBvbmx5IHNwYWNlLlxuICAgIGZ1bmN0aW9uIHN0cmlwU3BhY2UgKCkge1xuICAgICAgaWYgKGhhc1RhZyAmJiAhbm9uU3BhY2UpIHtcbiAgICAgICAgd2hpbGUgKHNwYWNlcy5sZW5ndGgpXG4gICAgICAgICAgZGVsZXRlIHRva2Vuc1tzcGFjZXMucG9wKCldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3BhY2VzID0gW107XG4gICAgICB9XG5cbiAgICAgIGhhc1RhZyA9IGZhbHNlO1xuICAgICAgbm9uU3BhY2UgPSBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgb3BlbmluZ1RhZ1JlLCBjbG9zaW5nVGFnUmUsIGNsb3NpbmdDdXJseVJlO1xuICAgIGZ1bmN0aW9uIGNvbXBpbGVUYWdzICh0YWdzVG9Db21waWxlKSB7XG4gICAgICBpZiAodHlwZW9mIHRhZ3NUb0NvbXBpbGUgPT09ICdzdHJpbmcnKVxuICAgICAgICB0YWdzVG9Db21waWxlID0gdGFnc1RvQ29tcGlsZS5zcGxpdChzcGFjZVJlLCAyKTtcblxuICAgICAgaWYgKCFpc0FycmF5KHRhZ3NUb0NvbXBpbGUpIHx8IHRhZ3NUb0NvbXBpbGUubGVuZ3RoICE9PSAyKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgdGFnczogJyArIHRhZ3NUb0NvbXBpbGUpO1xuXG4gICAgICBvcGVuaW5nVGFnUmUgPSBuZXcgUmVnRXhwKGVzY2FwZVJlZ0V4cCh0YWdzVG9Db21waWxlWzBdKSArICdcXFxccyonKTtcbiAgICAgIGNsb3NpbmdUYWdSZSA9IG5ldyBSZWdFeHAoJ1xcXFxzKicgKyBlc2NhcGVSZWdFeHAodGFnc1RvQ29tcGlsZVsxXSkpO1xuICAgICAgY2xvc2luZ0N1cmx5UmUgPSBuZXcgUmVnRXhwKCdcXFxccyonICsgZXNjYXBlUmVnRXhwKCd9JyArIHRhZ3NUb0NvbXBpbGVbMV0pKTtcbiAgICB9XG5cbiAgICBjb21waWxlVGFncyh0YWdzIHx8IG11c3RhY2hlLnRhZ3MpO1xuXG4gICAgdmFyIHNjYW5uZXIgPSBuZXcgU2Nhbm5lcih0ZW1wbGF0ZSk7XG5cbiAgICB2YXIgc3RhcnQsIHR5cGUsIHZhbHVlLCBjaHIsIHRva2VuLCBvcGVuU2VjdGlvbjtcbiAgICB3aGlsZSAoIXNjYW5uZXIuZW9zKCkpIHtcbiAgICAgIHN0YXJ0ID0gc2Nhbm5lci5wb3M7XG5cbiAgICAgIC8vIE1hdGNoIGFueSB0ZXh0IGJldHdlZW4gdGFncy5cbiAgICAgIHZhbHVlID0gc2Nhbm5lci5zY2FuVW50aWwob3BlbmluZ1RhZ1JlKTtcblxuICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCB2YWx1ZUxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgaSA8IHZhbHVlTGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICBjaHIgPSB2YWx1ZS5jaGFyQXQoaSk7XG5cbiAgICAgICAgICBpZiAoaXNXaGl0ZXNwYWNlKGNocikpIHtcbiAgICAgICAgICAgIHNwYWNlcy5wdXNoKHRva2Vucy5sZW5ndGgpO1xuICAgICAgICAgICAgaW5kZW50YXRpb24gKz0gY2hyO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBub25TcGFjZSA9IHRydWU7XG4gICAgICAgICAgICBsaW5lSGFzTm9uU3BhY2UgPSB0cnVlO1xuICAgICAgICAgICAgaW5kZW50YXRpb24gKz0gJyAnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRva2Vucy5wdXNoKFsgJ3RleHQnLCBjaHIsIHN0YXJ0LCBzdGFydCArIDEgXSk7XG4gICAgICAgICAgc3RhcnQgKz0gMTtcblxuICAgICAgICAgIC8vIENoZWNrIGZvciB3aGl0ZXNwYWNlIG9uIHRoZSBjdXJyZW50IGxpbmUuXG4gICAgICAgICAgaWYgKGNociA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgIHN0cmlwU3BhY2UoKTtcbiAgICAgICAgICAgIGluZGVudGF0aW9uID0gJyc7XG4gICAgICAgICAgICB0YWdJbmRleCA9IDA7XG4gICAgICAgICAgICBsaW5lSGFzTm9uU3BhY2UgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gTWF0Y2ggdGhlIG9wZW5pbmcgdGFnLlxuICAgICAgaWYgKCFzY2FubmVyLnNjYW4ob3BlbmluZ1RhZ1JlKSlcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGhhc1RhZyA9IHRydWU7XG5cbiAgICAgIC8vIEdldCB0aGUgdGFnIHR5cGUuXG4gICAgICB0eXBlID0gc2Nhbm5lci5zY2FuKHRhZ1JlKSB8fCAnbmFtZSc7XG4gICAgICBzY2FubmVyLnNjYW4od2hpdGVSZSk7XG5cbiAgICAgIC8vIEdldCB0aGUgdGFnIHZhbHVlLlxuICAgICAgaWYgKHR5cGUgPT09ICc9Jykge1xuICAgICAgICB2YWx1ZSA9IHNjYW5uZXIuc2NhblVudGlsKGVxdWFsc1JlKTtcbiAgICAgICAgc2Nhbm5lci5zY2FuKGVxdWFsc1JlKTtcbiAgICAgICAgc2Nhbm5lci5zY2FuVW50aWwoY2xvc2luZ1RhZ1JlKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3snKSB7XG4gICAgICAgIHZhbHVlID0gc2Nhbm5lci5zY2FuVW50aWwoY2xvc2luZ0N1cmx5UmUpO1xuICAgICAgICBzY2FubmVyLnNjYW4oY3VybHlSZSk7XG4gICAgICAgIHNjYW5uZXIuc2NhblVudGlsKGNsb3NpbmdUYWdSZSk7XG4gICAgICAgIHR5cGUgPSAnJic7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9IHNjYW5uZXIuc2NhblVudGlsKGNsb3NpbmdUYWdSZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIE1hdGNoIHRoZSBjbG9zaW5nIHRhZy5cbiAgICAgIGlmICghc2Nhbm5lci5zY2FuKGNsb3NpbmdUYWdSZSkpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5jbG9zZWQgdGFnIGF0ICcgKyBzY2FubmVyLnBvcyk7XG5cbiAgICAgIGlmICh0eXBlID09ICc+Jykge1xuICAgICAgICB0b2tlbiA9IFsgdHlwZSwgdmFsdWUsIHN0YXJ0LCBzY2FubmVyLnBvcywgaW5kZW50YXRpb24sIHRhZ0luZGV4LCBsaW5lSGFzTm9uU3BhY2UgXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRva2VuID0gWyB0eXBlLCB2YWx1ZSwgc3RhcnQsIHNjYW5uZXIucG9zIF07XG4gICAgICB9XG4gICAgICB0YWdJbmRleCsrO1xuICAgICAgdG9rZW5zLnB1c2godG9rZW4pO1xuXG4gICAgICBpZiAodHlwZSA9PT0gJyMnIHx8IHR5cGUgPT09ICdeJykge1xuICAgICAgICBzZWN0aW9ucy5wdXNoKHRva2VuKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJy8nKSB7XG4gICAgICAgIC8vIENoZWNrIHNlY3Rpb24gbmVzdGluZy5cbiAgICAgICAgb3BlblNlY3Rpb24gPSBzZWN0aW9ucy5wb3AoKTtcblxuICAgICAgICBpZiAoIW9wZW5TZWN0aW9uKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5vcGVuZWQgc2VjdGlvbiBcIicgKyB2YWx1ZSArICdcIiBhdCAnICsgc3RhcnQpO1xuXG4gICAgICAgIGlmIChvcGVuU2VjdGlvblsxXSAhPT0gdmFsdWUpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmNsb3NlZCBzZWN0aW9uIFwiJyArIG9wZW5TZWN0aW9uWzFdICsgJ1wiIGF0ICcgKyBzdGFydCk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICduYW1lJyB8fCB0eXBlID09PSAneycgfHwgdHlwZSA9PT0gJyYnKSB7XG4gICAgICAgIG5vblNwYWNlID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJz0nKSB7XG4gICAgICAgIC8vIFNldCB0aGUgdGFncyBmb3IgdGhlIG5leHQgdGltZSBhcm91bmQuXG4gICAgICAgIGNvbXBpbGVUYWdzKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBzdHJpcFNwYWNlKCk7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlcmUgYXJlIG5vIG9wZW4gc2VjdGlvbnMgd2hlbiB3ZSdyZSBkb25lLlxuICAgIG9wZW5TZWN0aW9uID0gc2VjdGlvbnMucG9wKCk7XG5cbiAgICBpZiAob3BlblNlY3Rpb24pXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuY2xvc2VkIHNlY3Rpb24gXCInICsgb3BlblNlY3Rpb25bMV0gKyAnXCIgYXQgJyArIHNjYW5uZXIucG9zKTtcblxuICAgIHJldHVybiBuZXN0VG9rZW5zKHNxdWFzaFRva2Vucyh0b2tlbnMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21iaW5lcyB0aGUgdmFsdWVzIG9mIGNvbnNlY3V0aXZlIHRleHQgdG9rZW5zIGluIHRoZSBnaXZlbiBgdG9rZW5zYCBhcnJheVxuICAgKiB0byBhIHNpbmdsZSB0b2tlbi5cbiAgICovXG4gIGZ1bmN0aW9uIHNxdWFzaFRva2VucyAodG9rZW5zKSB7XG4gICAgdmFyIHNxdWFzaGVkVG9rZW5zID0gW107XG5cbiAgICB2YXIgdG9rZW4sIGxhc3RUb2tlbjtcbiAgICBmb3IgKHZhciBpID0gMCwgbnVtVG9rZW5zID0gdG9rZW5zLmxlbmd0aDsgaSA8IG51bVRva2VuczsgKytpKSB7XG4gICAgICB0b2tlbiA9IHRva2Vuc1tpXTtcblxuICAgICAgaWYgKHRva2VuKSB7XG4gICAgICAgIGlmICh0b2tlblswXSA9PT0gJ3RleHQnICYmIGxhc3RUb2tlbiAmJiBsYXN0VG9rZW5bMF0gPT09ICd0ZXh0Jykge1xuICAgICAgICAgIGxhc3RUb2tlblsxXSArPSB0b2tlblsxXTtcbiAgICAgICAgICBsYXN0VG9rZW5bM10gPSB0b2tlblszXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzcXVhc2hlZFRva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICBsYXN0VG9rZW4gPSB0b2tlbjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzcXVhc2hlZFRva2VucztcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3JtcyB0aGUgZ2l2ZW4gYXJyYXkgb2YgYHRva2Vuc2AgaW50byBhIG5lc3RlZCB0cmVlIHN0cnVjdHVyZSB3aGVyZVxuICAgKiB0b2tlbnMgdGhhdCByZXByZXNlbnQgYSBzZWN0aW9uIGhhdmUgdHdvIGFkZGl0aW9uYWwgaXRlbXM6IDEpIGFuIGFycmF5IG9mXG4gICAqIGFsbCB0b2tlbnMgdGhhdCBhcHBlYXIgaW4gdGhhdCBzZWN0aW9uIGFuZCAyKSB0aGUgaW5kZXggaW4gdGhlIG9yaWdpbmFsXG4gICAqIHRlbXBsYXRlIHRoYXQgcmVwcmVzZW50cyB0aGUgZW5kIG9mIHRoYXQgc2VjdGlvbi5cbiAgICovXG4gIGZ1bmN0aW9uIG5lc3RUb2tlbnMgKHRva2Vucykge1xuICAgIHZhciBuZXN0ZWRUb2tlbnMgPSBbXTtcbiAgICB2YXIgY29sbGVjdG9yID0gbmVzdGVkVG9rZW5zO1xuICAgIHZhciBzZWN0aW9ucyA9IFtdO1xuXG4gICAgdmFyIHRva2VuLCBzZWN0aW9uO1xuICAgIGZvciAodmFyIGkgPSAwLCBudW1Ub2tlbnMgPSB0b2tlbnMubGVuZ3RoOyBpIDwgbnVtVG9rZW5zOyArK2kpIHtcbiAgICAgIHRva2VuID0gdG9rZW5zW2ldO1xuXG4gICAgICBzd2l0Y2ggKHRva2VuWzBdKSB7XG4gICAgICAgIGNhc2UgJyMnOlxuICAgICAgICBjYXNlICdeJzpcbiAgICAgICAgICBjb2xsZWN0b3IucHVzaCh0b2tlbik7XG4gICAgICAgICAgc2VjdGlvbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgY29sbGVjdG9yID0gdG9rZW5bNF0gPSBbXTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnLyc6XG4gICAgICAgICAgc2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpO1xuICAgICAgICAgIHNlY3Rpb25bNV0gPSB0b2tlblsyXTtcbiAgICAgICAgICBjb2xsZWN0b3IgPSBzZWN0aW9ucy5sZW5ndGggPiAwID8gc2VjdGlvbnNbc2VjdGlvbnMubGVuZ3RoIC0gMV1bNF0gOiBuZXN0ZWRUb2tlbnM7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgY29sbGVjdG9yLnB1c2godG9rZW4pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBuZXN0ZWRUb2tlbnM7XG4gIH1cblxuICAvKipcbiAgICogQSBzaW1wbGUgc3RyaW5nIHNjYW5uZXIgdGhhdCBpcyB1c2VkIGJ5IHRoZSB0ZW1wbGF0ZSBwYXJzZXIgdG8gZmluZFxuICAgKiB0b2tlbnMgaW4gdGVtcGxhdGUgc3RyaW5ncy5cbiAgICovXG4gIGZ1bmN0aW9uIFNjYW5uZXIgKHN0cmluZykge1xuICAgIHRoaXMuc3RyaW5nID0gc3RyaW5nO1xuICAgIHRoaXMudGFpbCA9IHN0cmluZztcbiAgICB0aGlzLnBvcyA9IDA7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIHRhaWwgaXMgZW1wdHkgKGVuZCBvZiBzdHJpbmcpLlxuICAgKi9cbiAgU2Nhbm5lci5wcm90b3R5cGUuZW9zID0gZnVuY3Rpb24gZW9zICgpIHtcbiAgICByZXR1cm4gdGhpcy50YWlsID09PSAnJztcbiAgfTtcblxuICAvKipcbiAgICogVHJpZXMgdG8gbWF0Y2ggdGhlIGdpdmVuIHJlZ3VsYXIgZXhwcmVzc2lvbiBhdCB0aGUgY3VycmVudCBwb3NpdGlvbi5cbiAgICogUmV0dXJucyB0aGUgbWF0Y2hlZCB0ZXh0IGlmIGl0IGNhbiBtYXRjaCwgdGhlIGVtcHR5IHN0cmluZyBvdGhlcndpc2UuXG4gICAqL1xuICBTY2FubmVyLnByb3RvdHlwZS5zY2FuID0gZnVuY3Rpb24gc2NhbiAocmUpIHtcbiAgICB2YXIgbWF0Y2ggPSB0aGlzLnRhaWwubWF0Y2gocmUpO1xuXG4gICAgaWYgKCFtYXRjaCB8fCBtYXRjaC5pbmRleCAhPT0gMClcbiAgICAgIHJldHVybiAnJztcblxuICAgIHZhciBzdHJpbmcgPSBtYXRjaFswXTtcblxuICAgIHRoaXMudGFpbCA9IHRoaXMudGFpbC5zdWJzdHJpbmcoc3RyaW5nLmxlbmd0aCk7XG4gICAgdGhpcy5wb3MgKz0gc3RyaW5nLmxlbmd0aDtcblxuICAgIHJldHVybiBzdHJpbmc7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNraXBzIGFsbCB0ZXh0IHVudGlsIHRoZSBnaXZlbiByZWd1bGFyIGV4cHJlc3Npb24gY2FuIGJlIG1hdGNoZWQuIFJldHVybnNcbiAgICogdGhlIHNraXBwZWQgc3RyaW5nLCB3aGljaCBpcyB0aGUgZW50aXJlIHRhaWwgaWYgbm8gbWF0Y2ggY2FuIGJlIG1hZGUuXG4gICAqL1xuICBTY2FubmVyLnByb3RvdHlwZS5zY2FuVW50aWwgPSBmdW5jdGlvbiBzY2FuVW50aWwgKHJlKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy50YWlsLnNlYXJjaChyZSksIG1hdGNoO1xuXG4gICAgc3dpdGNoIChpbmRleCkge1xuICAgICAgY2FzZSAtMTpcbiAgICAgICAgbWF0Y2ggPSB0aGlzLnRhaWw7XG4gICAgICAgIHRoaXMudGFpbCA9ICcnO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMDpcbiAgICAgICAgbWF0Y2ggPSAnJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBtYXRjaCA9IHRoaXMudGFpbC5zdWJzdHJpbmcoMCwgaW5kZXgpO1xuICAgICAgICB0aGlzLnRhaWwgPSB0aGlzLnRhaWwuc3Vic3RyaW5nKGluZGV4KTtcbiAgICB9XG5cbiAgICB0aGlzLnBvcyArPSBtYXRjaC5sZW5ndGg7XG5cbiAgICByZXR1cm4gbWF0Y2g7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgYSByZW5kZXJpbmcgY29udGV4dCBieSB3cmFwcGluZyBhIHZpZXcgb2JqZWN0IGFuZFxuICAgKiBtYWludGFpbmluZyBhIHJlZmVyZW5jZSB0byB0aGUgcGFyZW50IGNvbnRleHQuXG4gICAqL1xuICBmdW5jdGlvbiBDb250ZXh0ICh2aWV3LCBwYXJlbnRDb250ZXh0KSB7XG4gICAgdGhpcy52aWV3ID0gdmlldztcbiAgICB0aGlzLmNhY2hlID0geyAnLic6IHRoaXMudmlldyB9O1xuICAgIHRoaXMucGFyZW50ID0gcGFyZW50Q29udGV4dDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGNvbnRleHQgdXNpbmcgdGhlIGdpdmVuIHZpZXcgd2l0aCB0aGlzIGNvbnRleHRcbiAgICogYXMgdGhlIHBhcmVudC5cbiAgICovXG4gIENvbnRleHQucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiBwdXNoICh2aWV3KSB7XG4gICAgcmV0dXJuIG5ldyBDb250ZXh0KHZpZXcsIHRoaXMpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gbmFtZSBpbiB0aGlzIGNvbnRleHQsIHRyYXZlcnNpbmdcbiAgICogdXAgdGhlIGNvbnRleHQgaGllcmFyY2h5IGlmIHRoZSB2YWx1ZSBpcyBhYnNlbnQgaW4gdGhpcyBjb250ZXh0J3Mgdmlldy5cbiAgICovXG4gIENvbnRleHQucHJvdG90eXBlLmxvb2t1cCA9IGZ1bmN0aW9uIGxvb2t1cCAobmFtZSkge1xuICAgIHZhciBjYWNoZSA9IHRoaXMuY2FjaGU7XG5cbiAgICB2YXIgdmFsdWU7XG4gICAgaWYgKGNhY2hlLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICB2YWx1ZSA9IGNhY2hlW25hbWVdO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgY29udGV4dCA9IHRoaXMsIGludGVybWVkaWF0ZVZhbHVlLCBuYW1lcywgaW5kZXgsIGxvb2t1cEhpdCA9IGZhbHNlO1xuXG4gICAgICB3aGlsZSAoY29udGV4dCkge1xuICAgICAgICBpZiAobmFtZS5pbmRleE9mKCcuJykgPiAwKSB7XG4gICAgICAgICAgaW50ZXJtZWRpYXRlVmFsdWUgPSBjb250ZXh0LnZpZXc7XG4gICAgICAgICAgbmFtZXMgPSBuYW1lLnNwbGl0KCcuJyk7XG4gICAgICAgICAgaW5kZXggPSAwO1xuXG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogVXNpbmcgdGhlIGRvdCBub3Rpb24gcGF0aCBpbiBgbmFtZWAsIHdlIGRlc2NlbmQgdGhyb3VnaCB0aGVcbiAgICAgICAgICAgKiBuZXN0ZWQgb2JqZWN0cy5cbiAgICAgICAgICAgKlxuICAgICAgICAgICAqIFRvIGJlIGNlcnRhaW4gdGhhdCB0aGUgbG9va3VwIGhhcyBiZWVuIHN1Y2Nlc3NmdWwsIHdlIGhhdmUgdG9cbiAgICAgICAgICAgKiBjaGVjayBpZiB0aGUgbGFzdCBvYmplY3QgaW4gdGhlIHBhdGggYWN0dWFsbHkgaGFzIHRoZSBwcm9wZXJ0eVxuICAgICAgICAgICAqIHdlIGFyZSBsb29raW5nIGZvci4gV2Ugc3RvcmUgdGhlIHJlc3VsdCBpbiBgbG9va3VwSGl0YC5cbiAgICAgICAgICAgKlxuICAgICAgICAgICAqIFRoaXMgaXMgc3BlY2lhbGx5IG5lY2Vzc2FyeSBmb3Igd2hlbiB0aGUgdmFsdWUgaGFzIGJlZW4gc2V0IHRvXG4gICAgICAgICAgICogYHVuZGVmaW5lZGAgYW5kIHdlIHdhbnQgdG8gYXZvaWQgbG9va2luZyB1cCBwYXJlbnQgY29udGV4dHMuXG4gICAgICAgICAgICpcbiAgICAgICAgICAgKiBJbiB0aGUgY2FzZSB3aGVyZSBkb3Qgbm90YXRpb24gaXMgdXNlZCwgd2UgY29uc2lkZXIgdGhlIGxvb2t1cFxuICAgICAgICAgICAqIHRvIGJlIHN1Y2Nlc3NmdWwgZXZlbiBpZiB0aGUgbGFzdCBcIm9iamVjdFwiIGluIHRoZSBwYXRoIGlzXG4gICAgICAgICAgICogbm90IGFjdHVhbGx5IGFuIG9iamVjdCBidXQgYSBwcmltaXRpdmUgKGUuZy4sIGEgc3RyaW5nLCBvciBhblxuICAgICAgICAgICAqIGludGVnZXIpLCBiZWNhdXNlIGl0IGlzIHNvbWV0aW1lcyB1c2VmdWwgdG8gYWNjZXNzIGEgcHJvcGVydHlcbiAgICAgICAgICAgKiBvZiBhbiBhdXRvYm94ZWQgcHJpbWl0aXZlLCBzdWNoIGFzIHRoZSBsZW5ndGggb2YgYSBzdHJpbmcuXG4gICAgICAgICAgICoqL1xuICAgICAgICAgIHdoaWxlIChpbnRlcm1lZGlhdGVWYWx1ZSAhPSBudWxsICYmIGluZGV4IDwgbmFtZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoaW5kZXggPT09IG5hbWVzLmxlbmd0aCAtIDEpXG4gICAgICAgICAgICAgIGxvb2t1cEhpdCA9IChcbiAgICAgICAgICAgICAgICBoYXNQcm9wZXJ0eShpbnRlcm1lZGlhdGVWYWx1ZSwgbmFtZXNbaW5kZXhdKVxuICAgICAgICAgICAgICAgIHx8IHByaW1pdGl2ZUhhc093blByb3BlcnR5KGludGVybWVkaWF0ZVZhbHVlLCBuYW1lc1tpbmRleF0pXG4gICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGludGVybWVkaWF0ZVZhbHVlID0gaW50ZXJtZWRpYXRlVmFsdWVbbmFtZXNbaW5kZXgrK11dO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpbnRlcm1lZGlhdGVWYWx1ZSA9IGNvbnRleHQudmlld1tuYW1lXTtcblxuICAgICAgICAgIC8qKlxuICAgICAgICAgICAqIE9ubHkgY2hlY2tpbmcgYWdhaW5zdCBgaGFzUHJvcGVydHlgLCB3aGljaCBhbHdheXMgcmV0dXJucyBgZmFsc2VgIGlmXG4gICAgICAgICAgICogYGNvbnRleHQudmlld2AgaXMgbm90IGFuIG9iamVjdC4gRGVsaWJlcmF0ZWx5IG9taXR0aW5nIHRoZSBjaGVja1xuICAgICAgICAgICAqIGFnYWluc3QgYHByaW1pdGl2ZUhhc093blByb3BlcnR5YCBpZiBkb3Qgbm90YXRpb24gaXMgbm90IHVzZWQuXG4gICAgICAgICAgICpcbiAgICAgICAgICAgKiBDb25zaWRlciB0aGlzIGV4YW1wbGU6XG4gICAgICAgICAgICogYGBgXG4gICAgICAgICAgICogTXVzdGFjaGUucmVuZGVyKFwiVGhlIGxlbmd0aCBvZiBhIGZvb3RiYWxsIGZpZWxkIGlzIHt7I2xlbmd0aH19e3tsZW5ndGh9fXt7L2xlbmd0aH19LlwiLCB7bGVuZ3RoOiBcIjEwMCB5YXJkc1wifSlcbiAgICAgICAgICAgKiBgYGBcbiAgICAgICAgICAgKlxuICAgICAgICAgICAqIElmIHdlIHdlcmUgdG8gY2hlY2sgYWxzbyBhZ2FpbnN0IGBwcmltaXRpdmVIYXNPd25Qcm9wZXJ0eWAsIGFzIHdlIGRvXG4gICAgICAgICAgICogaW4gdGhlIGRvdCBub3RhdGlvbiBjYXNlLCB0aGVuIHJlbmRlciBjYWxsIHdvdWxkIHJldHVybjpcbiAgICAgICAgICAgKlxuICAgICAgICAgICAqIFwiVGhlIGxlbmd0aCBvZiBhIGZvb3RiYWxsIGZpZWxkIGlzIDkuXCJcbiAgICAgICAgICAgKlxuICAgICAgICAgICAqIHJhdGhlciB0aGFuIHRoZSBleHBlY3RlZDpcbiAgICAgICAgICAgKlxuICAgICAgICAgICAqIFwiVGhlIGxlbmd0aCBvZiBhIGZvb3RiYWxsIGZpZWxkIGlzIDEwMCB5YXJkcy5cIlxuICAgICAgICAgICAqKi9cbiAgICAgICAgICBsb29rdXBIaXQgPSBoYXNQcm9wZXJ0eShjb250ZXh0LnZpZXcsIG5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxvb2t1cEhpdCkge1xuICAgICAgICAgIHZhbHVlID0gaW50ZXJtZWRpYXRlVmFsdWU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZXh0ID0gY29udGV4dC5wYXJlbnQ7XG4gICAgICB9XG5cbiAgICAgIGNhY2hlW25hbWVdID0gdmFsdWU7XG4gICAgfVxuXG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKVxuICAgICAgdmFsdWUgPSB2YWx1ZS5jYWxsKHRoaXMudmlldyk7XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIEEgV3JpdGVyIGtub3dzIGhvdyB0byB0YWtlIGEgc3RyZWFtIG9mIHRva2VucyBhbmQgcmVuZGVyIHRoZW0gdG8gYVxuICAgKiBzdHJpbmcsIGdpdmVuIGEgY29udGV4dC4gSXQgYWxzbyBtYWludGFpbnMgYSBjYWNoZSBvZiB0ZW1wbGF0ZXMgdG9cbiAgICogYXZvaWQgdGhlIG5lZWQgdG8gcGFyc2UgdGhlIHNhbWUgdGVtcGxhdGUgdHdpY2UuXG4gICAqL1xuICBmdW5jdGlvbiBXcml0ZXIgKCkge1xuICAgIHRoaXMudGVtcGxhdGVDYWNoZSA9IHtcbiAgICAgIF9jYWNoZToge30sXG4gICAgICBzZXQ6IGZ1bmN0aW9uIHNldCAoa2V5LCB2YWx1ZSkge1xuICAgICAgICB0aGlzLl9jYWNoZVtrZXldID0gdmFsdWU7XG4gICAgICB9LFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQgKGtleSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2FjaGVba2V5XTtcbiAgICAgIH0sXG4gICAgICBjbGVhcjogZnVuY3Rpb24gY2xlYXIgKCkge1xuICAgICAgICB0aGlzLl9jYWNoZSA9IHt9O1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ2xlYXJzIGFsbCBjYWNoZWQgdGVtcGxhdGVzIGluIHRoaXMgd3JpdGVyLlxuICAgKi9cbiAgV3JpdGVyLnByb3RvdHlwZS5jbGVhckNhY2hlID0gZnVuY3Rpb24gY2xlYXJDYWNoZSAoKSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLnRlbXBsYXRlQ2FjaGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlQ2FjaGUuY2xlYXIoKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhbmQgY2FjaGVzIHRoZSBnaXZlbiBgdGVtcGxhdGVgIGFjY29yZGluZyB0byB0aGUgZ2l2ZW4gYHRhZ3NgIG9yXG4gICAqIGBtdXN0YWNoZS50YWdzYCBpZiBgdGFnc2AgaXMgb21pdHRlZCwgIGFuZCByZXR1cm5zIHRoZSBhcnJheSBvZiB0b2tlbnNcbiAgICogdGhhdCBpcyBnZW5lcmF0ZWQgZnJvbSB0aGUgcGFyc2UuXG4gICAqL1xuICBXcml0ZXIucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24gcGFyc2UgKHRlbXBsYXRlLCB0YWdzKSB7XG4gICAgdmFyIGNhY2hlID0gdGhpcy50ZW1wbGF0ZUNhY2hlO1xuICAgIHZhciBjYWNoZUtleSA9IHRlbXBsYXRlICsgJzonICsgKHRhZ3MgfHwgbXVzdGFjaGUudGFncykuam9pbignOicpO1xuICAgIHZhciBpc0NhY2hlRW5hYmxlZCA9IHR5cGVvZiBjYWNoZSAhPT0gJ3VuZGVmaW5lZCc7XG4gICAgdmFyIHRva2VucyA9IGlzQ2FjaGVFbmFibGVkID8gY2FjaGUuZ2V0KGNhY2hlS2V5KSA6IHVuZGVmaW5lZDtcblxuICAgIGlmICh0b2tlbnMgPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0b2tlbnMgPSBwYXJzZVRlbXBsYXRlKHRlbXBsYXRlLCB0YWdzKTtcbiAgICAgIGlzQ2FjaGVFbmFibGVkICYmIGNhY2hlLnNldChjYWNoZUtleSwgdG9rZW5zKTtcbiAgICB9XG4gICAgcmV0dXJuIHRva2VucztcbiAgfTtcblxuICAvKipcbiAgICogSGlnaC1sZXZlbCBtZXRob2QgdGhhdCBpcyB1c2VkIHRvIHJlbmRlciB0aGUgZ2l2ZW4gYHRlbXBsYXRlYCB3aXRoXG4gICAqIHRoZSBnaXZlbiBgdmlld2AuXG4gICAqXG4gICAqIFRoZSBvcHRpb25hbCBgcGFydGlhbHNgIGFyZ3VtZW50IG1heSBiZSBhbiBvYmplY3QgdGhhdCBjb250YWlucyB0aGVcbiAgICogbmFtZXMgYW5kIHRlbXBsYXRlcyBvZiBwYXJ0aWFscyB0aGF0IGFyZSB1c2VkIGluIHRoZSB0ZW1wbGF0ZS4gSXQgbWF5XG4gICAqIGFsc28gYmUgYSBmdW5jdGlvbiB0aGF0IGlzIHVzZWQgdG8gbG9hZCBwYXJ0aWFsIHRlbXBsYXRlcyBvbiB0aGUgZmx5XG4gICAqIHRoYXQgdGFrZXMgYSBzaW5nbGUgYXJndW1lbnQ6IHRoZSBuYW1lIG9mIHRoZSBwYXJ0aWFsLlxuICAgKlxuICAgKiBJZiB0aGUgb3B0aW9uYWwgYHRhZ3NgIGFyZ3VtZW50IGlzIGdpdmVuIGhlcmUgaXQgbXVzdCBiZSBhbiBhcnJheSB3aXRoIHR3b1xuICAgKiBzdHJpbmcgdmFsdWVzOiB0aGUgb3BlbmluZyBhbmQgY2xvc2luZyB0YWdzIHVzZWQgaW4gdGhlIHRlbXBsYXRlIChlLmcuXG4gICAqIFsgXCI8JVwiLCBcIiU+XCIgXSkuIFRoZSBkZWZhdWx0IGlzIHRvIG11c3RhY2hlLnRhZ3MuXG4gICAqL1xuICBXcml0ZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uIHJlbmRlciAodGVtcGxhdGUsIHZpZXcsIHBhcnRpYWxzLCB0YWdzKSB7XG4gICAgdmFyIHRva2VucyA9IHRoaXMucGFyc2UodGVtcGxhdGUsIHRhZ3MpO1xuICAgIHZhciBjb250ZXh0ID0gKHZpZXcgaW5zdGFuY2VvZiBDb250ZXh0KSA/IHZpZXcgOiBuZXcgQ29udGV4dCh2aWV3LCB1bmRlZmluZWQpO1xuICAgIHJldHVybiB0aGlzLnJlbmRlclRva2Vucyh0b2tlbnMsIGNvbnRleHQsIHBhcnRpYWxzLCB0ZW1wbGF0ZSwgdGFncyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIExvdy1sZXZlbCBtZXRob2QgdGhhdCByZW5kZXJzIHRoZSBnaXZlbiBhcnJheSBvZiBgdG9rZW5zYCB1c2luZ1xuICAgKiB0aGUgZ2l2ZW4gYGNvbnRleHRgIGFuZCBgcGFydGlhbHNgLlxuICAgKlxuICAgKiBOb3RlOiBUaGUgYG9yaWdpbmFsVGVtcGxhdGVgIGlzIG9ubHkgZXZlciB1c2VkIHRvIGV4dHJhY3QgdGhlIHBvcnRpb25cbiAgICogb2YgdGhlIG9yaWdpbmFsIHRlbXBsYXRlIHRoYXQgd2FzIGNvbnRhaW5lZCBpbiBhIGhpZ2hlci1vcmRlciBzZWN0aW9uLlxuICAgKiBJZiB0aGUgdGVtcGxhdGUgZG9lc24ndCB1c2UgaGlnaGVyLW9yZGVyIHNlY3Rpb25zLCB0aGlzIGFyZ3VtZW50IG1heVxuICAgKiBiZSBvbWl0dGVkLlxuICAgKi9cbiAgV3JpdGVyLnByb3RvdHlwZS5yZW5kZXJUb2tlbnMgPSBmdW5jdGlvbiByZW5kZXJUb2tlbnMgKHRva2VucywgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUsIHRhZ3MpIHtcbiAgICB2YXIgYnVmZmVyID0gJyc7XG5cbiAgICB2YXIgdG9rZW4sIHN5bWJvbCwgdmFsdWU7XG4gICAgZm9yICh2YXIgaSA9IDAsIG51bVRva2VucyA9IHRva2Vucy5sZW5ndGg7IGkgPCBudW1Ub2tlbnM7ICsraSkge1xuICAgICAgdmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICB0b2tlbiA9IHRva2Vuc1tpXTtcbiAgICAgIHN5bWJvbCA9IHRva2VuWzBdO1xuXG4gICAgICBpZiAoc3ltYm9sID09PSAnIycpIHZhbHVlID0gdGhpcy5yZW5kZXJTZWN0aW9uKHRva2VuLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICBlbHNlIGlmIChzeW1ib2wgPT09ICdeJykgdmFsdWUgPSB0aGlzLnJlbmRlckludmVydGVkKHRva2VuLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICBlbHNlIGlmIChzeW1ib2wgPT09ICc+JykgdmFsdWUgPSB0aGlzLnJlbmRlclBhcnRpYWwodG9rZW4sIGNvbnRleHQsIHBhcnRpYWxzLCB0YWdzKTtcbiAgICAgIGVsc2UgaWYgKHN5bWJvbCA9PT0gJyYnKSB2YWx1ZSA9IHRoaXMudW5lc2NhcGVkVmFsdWUodG9rZW4sIGNvbnRleHQpO1xuICAgICAgZWxzZSBpZiAoc3ltYm9sID09PSAnbmFtZScpIHZhbHVlID0gdGhpcy5lc2NhcGVkVmFsdWUodG9rZW4sIGNvbnRleHQpO1xuICAgICAgZWxzZSBpZiAoc3ltYm9sID09PSAndGV4dCcpIHZhbHVlID0gdGhpcy5yYXdWYWx1ZSh0b2tlbik7XG5cbiAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKVxuICAgICAgICBidWZmZXIgKz0gdmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJ1ZmZlcjtcbiAgfTtcblxuICBXcml0ZXIucHJvdG90eXBlLnJlbmRlclNlY3Rpb24gPSBmdW5jdGlvbiByZW5kZXJTZWN0aW9uICh0b2tlbiwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGJ1ZmZlciA9ICcnO1xuICAgIHZhciB2YWx1ZSA9IGNvbnRleHQubG9va3VwKHRva2VuWzFdKTtcblxuICAgIC8vIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byByZW5kZXIgYW4gYXJiaXRyYXJ5IHRlbXBsYXRlXG4gICAgLy8gaW4gdGhlIGN1cnJlbnQgY29udGV4dCBieSBoaWdoZXItb3JkZXIgc2VjdGlvbnMuXG4gICAgZnVuY3Rpb24gc3ViUmVuZGVyICh0ZW1wbGF0ZSkge1xuICAgICAgcmV0dXJuIHNlbGYucmVuZGVyKHRlbXBsYXRlLCBjb250ZXh0LCBwYXJ0aWFscyk7XG4gICAgfVxuXG4gICAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xuXG4gICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICBmb3IgKHZhciBqID0gMCwgdmFsdWVMZW5ndGggPSB2YWx1ZS5sZW5ndGg7IGogPCB2YWx1ZUxlbmd0aDsgKytqKSB7XG4gICAgICAgIGJ1ZmZlciArPSB0aGlzLnJlbmRlclRva2Vucyh0b2tlbls0XSwgY29udGV4dC5wdXNoKHZhbHVlW2pdKSwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIGJ1ZmZlciArPSB0aGlzLnJlbmRlclRva2Vucyh0b2tlbls0XSwgY29udGV4dC5wdXNoKHZhbHVlKSwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIGlmICh0eXBlb2Ygb3JpZ2luYWxUZW1wbGF0ZSAhPT0gJ3N0cmluZycpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHVzZSBoaWdoZXItb3JkZXIgc2VjdGlvbnMgd2l0aG91dCB0aGUgb3JpZ2luYWwgdGVtcGxhdGUnKTtcblxuICAgICAgLy8gRXh0cmFjdCB0aGUgcG9ydGlvbiBvZiB0aGUgb3JpZ2luYWwgdGVtcGxhdGUgdGhhdCB0aGUgc2VjdGlvbiBjb250YWlucy5cbiAgICAgIHZhbHVlID0gdmFsdWUuY2FsbChjb250ZXh0LnZpZXcsIG9yaWdpbmFsVGVtcGxhdGUuc2xpY2UodG9rZW5bM10sIHRva2VuWzVdKSwgc3ViUmVuZGVyKTtcblxuICAgICAgaWYgKHZhbHVlICE9IG51bGwpXG4gICAgICAgIGJ1ZmZlciArPSB2YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgYnVmZmVyICs9IHRoaXMucmVuZGVyVG9rZW5zKHRva2VuWzRdLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgfVxuICAgIHJldHVybiBidWZmZXI7XG4gIH07XG5cbiAgV3JpdGVyLnByb3RvdHlwZS5yZW5kZXJJbnZlcnRlZCA9IGZ1bmN0aW9uIHJlbmRlckludmVydGVkICh0b2tlbiwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpIHtcbiAgICB2YXIgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cCh0b2tlblsxXSk7XG5cbiAgICAvLyBVc2UgSmF2YVNjcmlwdCdzIGRlZmluaXRpb24gb2YgZmFsc3kuIEluY2x1ZGUgZW1wdHkgYXJyYXlzLlxuICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vamFubC9tdXN0YWNoZS5qcy9pc3N1ZXMvMTg2XG4gICAgaWYgKCF2YWx1ZSB8fCAoaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSlcbiAgICAgIHJldHVybiB0aGlzLnJlbmRlclRva2Vucyh0b2tlbls0XSwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICB9O1xuXG4gIFdyaXRlci5wcm90b3R5cGUuaW5kZW50UGFydGlhbCA9IGZ1bmN0aW9uIGluZGVudFBhcnRpYWwgKHBhcnRpYWwsIGluZGVudGF0aW9uLCBsaW5lSGFzTm9uU3BhY2UpIHtcbiAgICB2YXIgZmlsdGVyZWRJbmRlbnRhdGlvbiA9IGluZGVudGF0aW9uLnJlcGxhY2UoL1teIFxcdF0vZywgJycpO1xuICAgIHZhciBwYXJ0aWFsQnlObCA9IHBhcnRpYWwuc3BsaXQoJ1xcbicpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydGlhbEJ5TmwubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChwYXJ0aWFsQnlObFtpXS5sZW5ndGggJiYgKGkgPiAwIHx8ICFsaW5lSGFzTm9uU3BhY2UpKSB7XG4gICAgICAgIHBhcnRpYWxCeU5sW2ldID0gZmlsdGVyZWRJbmRlbnRhdGlvbiArIHBhcnRpYWxCeU5sW2ldO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGFydGlhbEJ5Tmwuam9pbignXFxuJyk7XG4gIH07XG5cbiAgV3JpdGVyLnByb3RvdHlwZS5yZW5kZXJQYXJ0aWFsID0gZnVuY3Rpb24gcmVuZGVyUGFydGlhbCAodG9rZW4sIGNvbnRleHQsIHBhcnRpYWxzLCB0YWdzKSB7XG4gICAgaWYgKCFwYXJ0aWFscykgcmV0dXJuO1xuXG4gICAgdmFyIHZhbHVlID0gaXNGdW5jdGlvbihwYXJ0aWFscykgPyBwYXJ0aWFscyh0b2tlblsxXSkgOiBwYXJ0aWFsc1t0b2tlblsxXV07XG4gICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgIHZhciBsaW5lSGFzTm9uU3BhY2UgPSB0b2tlbls2XTtcbiAgICAgIHZhciB0YWdJbmRleCA9IHRva2VuWzVdO1xuICAgICAgdmFyIGluZGVudGF0aW9uID0gdG9rZW5bNF07XG4gICAgICB2YXIgaW5kZW50ZWRWYWx1ZSA9IHZhbHVlO1xuICAgICAgaWYgKHRhZ0luZGV4ID09IDAgJiYgaW5kZW50YXRpb24pIHtcbiAgICAgICAgaW5kZW50ZWRWYWx1ZSA9IHRoaXMuaW5kZW50UGFydGlhbCh2YWx1ZSwgaW5kZW50YXRpb24sIGxpbmVIYXNOb25TcGFjZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5yZW5kZXJUb2tlbnModGhpcy5wYXJzZShpbmRlbnRlZFZhbHVlLCB0YWdzKSwgY29udGV4dCwgcGFydGlhbHMsIGluZGVudGVkVmFsdWUsIHRhZ3MpO1xuICAgIH1cbiAgfTtcblxuICBXcml0ZXIucHJvdG90eXBlLnVuZXNjYXBlZFZhbHVlID0gZnVuY3Rpb24gdW5lc2NhcGVkVmFsdWUgKHRva2VuLCBjb250ZXh0KSB7XG4gICAgdmFyIHZhbHVlID0gY29udGV4dC5sb29rdXAodG9rZW5bMV0pO1xuICAgIGlmICh2YWx1ZSAhPSBudWxsKVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICB9O1xuXG4gIFdyaXRlci5wcm90b3R5cGUuZXNjYXBlZFZhbHVlID0gZnVuY3Rpb24gZXNjYXBlZFZhbHVlICh0b2tlbiwgY29udGV4dCkge1xuICAgIHZhciB2YWx1ZSA9IGNvbnRleHQubG9va3VwKHRva2VuWzFdKTtcbiAgICBpZiAodmFsdWUgIT0gbnVsbClcbiAgICAgIHJldHVybiBtdXN0YWNoZS5lc2NhcGUodmFsdWUpO1xuICB9O1xuXG4gIFdyaXRlci5wcm90b3R5cGUucmF3VmFsdWUgPSBmdW5jdGlvbiByYXdWYWx1ZSAodG9rZW4pIHtcbiAgICByZXR1cm4gdG9rZW5bMV07XG4gIH07XG5cbiAgdmFyIG11c3RhY2hlID0ge1xuICAgIG5hbWU6ICdtdXN0YWNoZS5qcycsXG4gICAgdmVyc2lvbjogJzQuMC4xJyxcbiAgICB0YWdzOiBbICd7eycsICd9fScgXSxcbiAgICBjbGVhckNhY2hlOiB1bmRlZmluZWQsXG4gICAgZXNjYXBlOiB1bmRlZmluZWQsXG4gICAgcGFyc2U6IHVuZGVmaW5lZCxcbiAgICByZW5kZXI6IHVuZGVmaW5lZCxcbiAgICBTY2FubmVyOiB1bmRlZmluZWQsXG4gICAgQ29udGV4dDogdW5kZWZpbmVkLFxuICAgIFdyaXRlcjogdW5kZWZpbmVkLFxuICAgIC8qKlxuICAgICAqIEFsbG93cyBhIHVzZXIgdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHQgY2FjaGluZyBzdHJhdGVneSwgYnkgcHJvdmlkaW5nIGFuXG4gICAgICogb2JqZWN0IHdpdGggc2V0LCBnZXQgYW5kIGNsZWFyIG1ldGhvZHMuIFRoaXMgY2FuIGFsc28gYmUgdXNlZCB0byBkaXNhYmxlXG4gICAgICogdGhlIGNhY2hlIGJ5IHNldHRpbmcgaXQgdG8gdGhlIGxpdGVyYWwgYHVuZGVmaW5lZGAuXG4gICAgICovXG4gICAgc2V0IHRlbXBsYXRlQ2FjaGUgKGNhY2hlKSB7XG4gICAgICBkZWZhdWx0V3JpdGVyLnRlbXBsYXRlQ2FjaGUgPSBjYWNoZTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGRlZmF1bHQgb3Igb3ZlcnJpZGRlbiBjYWNoaW5nIG9iamVjdCBmcm9tIHRoZSBkZWZhdWx0IHdyaXRlci5cbiAgICAgKi9cbiAgICBnZXQgdGVtcGxhdGVDYWNoZSAoKSB7XG4gICAgICByZXR1cm4gZGVmYXVsdFdyaXRlci50ZW1wbGF0ZUNhY2hlO1xuICAgIH1cbiAgfTtcblxuICAvLyBBbGwgaGlnaC1sZXZlbCBtdXN0YWNoZS4qIGZ1bmN0aW9ucyB1c2UgdGhpcyB3cml0ZXIuXG4gIHZhciBkZWZhdWx0V3JpdGVyID0gbmV3IFdyaXRlcigpO1xuXG4gIC8qKlxuICAgKiBDbGVhcnMgYWxsIGNhY2hlZCB0ZW1wbGF0ZXMgaW4gdGhlIGRlZmF1bHQgd3JpdGVyLlxuICAgKi9cbiAgbXVzdGFjaGUuY2xlYXJDYWNoZSA9IGZ1bmN0aW9uIGNsZWFyQ2FjaGUgKCkge1xuICAgIHJldHVybiBkZWZhdWx0V3JpdGVyLmNsZWFyQ2FjaGUoKTtcbiAgfTtcblxuICAvKipcbiAgICogUGFyc2VzIGFuZCBjYWNoZXMgdGhlIGdpdmVuIHRlbXBsYXRlIGluIHRoZSBkZWZhdWx0IHdyaXRlciBhbmQgcmV0dXJucyB0aGVcbiAgICogYXJyYXkgb2YgdG9rZW5zIGl0IGNvbnRhaW5zLiBEb2luZyB0aGlzIGFoZWFkIG9mIHRpbWUgYXZvaWRzIHRoZSBuZWVkIHRvXG4gICAqIHBhcnNlIHRlbXBsYXRlcyBvbiB0aGUgZmx5IGFzIHRoZXkgYXJlIHJlbmRlcmVkLlxuICAgKi9cbiAgbXVzdGFjaGUucGFyc2UgPSBmdW5jdGlvbiBwYXJzZSAodGVtcGxhdGUsIHRhZ3MpIHtcbiAgICByZXR1cm4gZGVmYXVsdFdyaXRlci5wYXJzZSh0ZW1wbGF0ZSwgdGFncyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbmRlcnMgdGhlIGB0ZW1wbGF0ZWAgd2l0aCB0aGUgZ2l2ZW4gYHZpZXdgIGFuZCBgcGFydGlhbHNgIHVzaW5nIHRoZVxuICAgKiBkZWZhdWx0IHdyaXRlci4gSWYgdGhlIG9wdGlvbmFsIGB0YWdzYCBhcmd1bWVudCBpcyBnaXZlbiBoZXJlIGl0IG11c3QgYmUgYW5cbiAgICogYXJyYXkgd2l0aCB0d28gc3RyaW5nIHZhbHVlczogdGhlIG9wZW5pbmcgYW5kIGNsb3NpbmcgdGFncyB1c2VkIGluIHRoZVxuICAgKiB0ZW1wbGF0ZSAoZS5nLiBbIFwiPCVcIiwgXCIlPlwiIF0pLiBUaGUgZGVmYXVsdCBpcyB0byBtdXN0YWNoZS50YWdzLlxuICAgKi9cbiAgbXVzdGFjaGUucmVuZGVyID0gZnVuY3Rpb24gcmVuZGVyICh0ZW1wbGF0ZSwgdmlldywgcGFydGlhbHMsIHRhZ3MpIHtcbiAgICBpZiAodHlwZW9mIHRlbXBsYXRlICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCB0ZW1wbGF0ZSEgVGVtcGxhdGUgc2hvdWxkIGJlIGEgXCJzdHJpbmdcIiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJ2J1dCBcIicgKyB0eXBlU3RyKHRlbXBsYXRlKSArICdcIiB3YXMgZ2l2ZW4gYXMgdGhlIGZpcnN0ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAnYXJndW1lbnQgZm9yIG11c3RhY2hlI3JlbmRlcih0ZW1wbGF0ZSwgdmlldywgcGFydGlhbHMpJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmF1bHRXcml0ZXIucmVuZGVyKHRlbXBsYXRlLCB2aWV3LCBwYXJ0aWFscywgdGFncyk7XG4gIH07XG5cbiAgLy8gRXhwb3J0IHRoZSBlc2NhcGluZyBmdW5jdGlvbiBzbyB0aGF0IHRoZSB1c2VyIG1heSBvdmVycmlkZSBpdC5cbiAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9qYW5sL211c3RhY2hlLmpzL2lzc3Vlcy8yNDRcbiAgbXVzdGFjaGUuZXNjYXBlID0gZXNjYXBlSHRtbDtcblxuICAvLyBFeHBvcnQgdGhlc2UgbWFpbmx5IGZvciB0ZXN0aW5nLCBidXQgYWxzbyBmb3IgYWR2YW5jZWQgdXNhZ2UuXG4gIG11c3RhY2hlLlNjYW5uZXIgPSBTY2FubmVyO1xuICBtdXN0YWNoZS5Db250ZXh0ID0gQ29udGV4dDtcbiAgbXVzdGFjaGUuV3JpdGVyID0gV3JpdGVyO1xuXG4gIHJldHVybiBtdXN0YWNoZTtcblxufSkpKTtcbiIsImltcG9ydCB7IE9wdGlvbnNTcGVjICwgT3B0aW9uIGFzIE9wdGlvbkksIFNlbGVjdE9wdGlvbiwgU2VsZWN0RXhjbHVzaXZlT3B0aW9uLCBTZWxlY3RJbmNsdXNpdmVPcHRpb259IGZyb20gJ09wdGlvbnNTcGVjJ1xuaW1wb3J0IHsgY3JlYXRlRWxlbSB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCAqIGFzIE11c3RhY2hlIGZyb20gJ211c3RhY2hlJ1xuXG50eXBlIE9wdGlvbnMgPSAoT3B0aW9uc1NwZWNbMF0gJiB7ZWxlbWVudD86IEhUTUxFbGVtZW50fSlbXSAvLyBsaWtlIE9wdGlvbnNTcGVjIGJ1dCB3aXRoIG9wdGlvbmFsIGVsZW1lbnQgZm9yIGVhY2ggb3B0aW9uXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE9wdGlvbnNTZXQge1xuICBvcHRpb25zU3BlYyA6IE9wdGlvbnNcbiAgb3B0aW9ucyA6IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBzdHJpbmdbXT5cbiAgdGVtcGxhdGU/IDogc3RyaW5nXG4gIGdsb2JhbElkOiBzdHJpbmdcbiAgc3RhdGljIGlkQ291bnRlcjogbnVtYmVyID0gMCAvLyBpbmNyZW1lbnQgZWFjaCB0aW1lIHRvIGNyZWF0ZSB1bmlxdWUgaWRzIHRvIHVzZSBpbiBpZHMvbmFtZXMgb2YgZWxlbWVudHNcblxuICBzdGF0aWMgZ2V0SWQoKTogc3RyaW5nIHtcbiAgICBpZiAoT3B0aW9uc1NldC5pZENvdW50ZXIgPj0gMjYgKiogMikgdGhyb3cgbmV3IEVycm9yKCdUb28gbWFueSBvcHRpb25zIG9iamVjdHMhJylcbiAgICBjb25zdCBpZCA9IFN0cmluZy5mcm9tQ2hhckNvZGUofn4oT3B0aW9uc1NldC5pZENvdW50ZXIgLyAyNikgKyA5NykgK1xuICAgICAgU3RyaW5nLmZyb21DaGFyQ29kZShPcHRpb25zU2V0LmlkQ291bnRlciAlIDI2ICsgOTcpXG5cbiAgICBPcHRpb25zU2V0LmlkQ291bnRlciArPSAxXG5cbiAgICByZXR1cm4gaWRcbiAgfVxuXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zU3BlYyA6IE9wdGlvbnNTcGVjLCB0ZW1wbGF0ZT8gOiBzdHJpbmcpIHtcbiAgICBjb25zb2xlLmxvZyhNdXN0YWNoZS5yZW5kZXIoJ0hlbGxvIHt7eH19Jyx7eDond29ybGQnfSkpXG4gICAgdGhpcy5vcHRpb25zU3BlYyA9IG9wdGlvbnNTcGVjIGFzIE9wdGlvbnNcblxuICAgIHRoaXMub3B0aW9ucyA9IHt9XG4gICAgdGhpcy5vcHRpb25zU3BlYy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICBpZiAob3B0aW9uLnR5cGUgIT09ICdoZWFkaW5nJyAmJiBvcHRpb24udHlwZSAhPT0gJ2NvbHVtbi1icmVhaycpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBvcHRpb24uZGVmYXVsdFxuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGUgLy8gaHRtbCB0ZW1wbGF0ZSAob3B0aW9uYWwpXG5cbiAgICAvLyBzZXQgYW4gaWQgYmFzZWQgb24gYSBjb3VudGVyIC0gdXNlZCBmb3IgbmFtZXMgb2YgZm9ybSBlbGVtZW50c1xuICAgIHRoaXMuZ2xvYmFsSWQgPSBPcHRpb25zU2V0LmdldElkKClcbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhbiBvcHRpb24sIGZpbmQgaXRzIFVJIGVsZW1lbnQgYW5kIHVwZGF0ZSB0aGUgc3RhdGUgZnJvbSB0aGF0XG4gICAqIEBwYXJhbSB7Kn0gb3B0aW9uIEFuIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25TcGVjIG9yIGFuIGlkXG4gICAqL1xuICB1cGRhdGVTdGF0ZUZyb21VSSAob3B0aW9uIDogT3B0aW9uc1swXSB8IHN0cmluZykge1xuICAgIC8vIGlucHV0IC0gZWl0aGVyIGFuIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25zU3BlYyBvciBhbiBvcHRpb24gaWRcbiAgICBpZiAodHlwZW9mIChvcHRpb24pID09PSAnc3RyaW5nJykge1xuICAgICAgb3B0aW9uID0gdGhpcy5vcHRpb25zU3BlYy5maW5kKHggPT4gKCh4IGFzIE9wdGlvbkkpLmlkID09PSBvcHRpb24pKVxuICAgICAgaWYgKCFvcHRpb24pIHRocm93IG5ldyBFcnJvcihgbm8gb3B0aW9uIHdpdGggaWQgJyR7b3B0aW9ufSdgKVxuICAgIH1cbiAgICBpZiAoIW9wdGlvbi5lbGVtZW50KSB0aHJvdyBuZXcgRXJyb3IoYG9wdGlvbiAkeyhvcHRpb24gYXMgT3B0aW9uSSkuaWR9IGRvZXNuJ3QgaGF2ZSBhIFVJIGVsZW1lbnRgKVxuXG4gICAgc3dpdGNoIChvcHRpb24udHlwZSkge1xuICAgICAgY2FzZSAnaW50Jzoge1xuICAgICAgICBjb25zdCBpbnB1dCA6IEhUTUxJbnB1dEVsZW1lbnQgPSBvcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKVswXVxuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IE51bWJlcihpbnB1dC52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2Jvb2wnOiB7XG4gICAgICAgIGNvbnN0IGlucHV0IDogSFRNTElucHV0RWxlbWVudCA9IG9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpWzBdXG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gaW5wdXQuY2hlY2tlZFxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAnc2VsZWN0LWV4Y2x1c2l2ZSc6IHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSAob3B0aW9uLmVsZW1lbnQucXVlcnlTZWxlY3RvcignaW5wdXQ6Y2hlY2tlZCcpIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdzZWxlY3QtaW5jbHVzaXZlJzoge1xuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9XG4gICAgICAgICAgQXJyYXkuZnJvbShvcHRpb24uZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dDpjaGVja2VkJyksICh4IDogSFRNTElucHV0RWxlbWVudCkgPT4geC52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgb3B0aW9uIHdpdGggaWQgJHsob3B0aW9uIGFzIE9wdGlvbkkpLmlkfSBoYXMgdW5yZWNvZ25pc2VkIG9wdGlvbiB0eXBlICR7b3B0aW9uLnR5cGV9YClcbiAgICB9XG4gICAgLy8gY29uc29sZS5sb2codGhpcy5vcHRpb25zKVxuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIGEgc3RyaW5nLCByZXR1cm4gdGhlIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25zIHdpdGggdGhhdCBpZFxuICAgKiBAcGFyYW0gaWQgVGhlIGlkXG4gICAqL1xuXG4gIHVwZGF0ZVN0YXRlRnJvbVVJQWxsICgpIHtcbiAgICB0aGlzLm9wdGlvbnNTcGVjLmZvckVhY2gob3B0aW9uID0+IHRoaXMudXBkYXRlU3RhdGVGcm9tVUkob3B0aW9uKSlcbiAgfVxuXG4gIGRpc2FibGVPckVuYWJsZUFsbCAoKSB7XG4gICAgdGhpcy5vcHRpb25zU3BlYy5mb3JFYWNoKG9wdGlvbiA9PiB0aGlzLmRpc2FibGVPckVuYWJsZShvcHRpb24pKVxuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIGFuIG9wdGlvbiwgZmluZCBpdHMgVUkgZWxlbWVudCBhbmQgdXBkYXRlIGl0IGFjY29yZGluZyB0byB0aGUgb3B0aW9ucyBJRFxuICAgKiBAcGFyYW0geyp9IG9wdGlvbiBBbiBlbGVtZW50IG9mIHRoaXMub3B0aW9uc1NwZWMgb3IgYW4gb3B0aW9uIGlkXG4gICAqL1xuICB1cGRhdGVVSUZyb21TdGF0ZSAob3B0aW9uKSB7XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYW4gb3B0aW9uLCBlbmFibGUgb3IgZGlzYWJsZSB0aGUgVUkgZWxlbWVudCBkZXBlbmRpbmcgb24gdGhlIHZhbHVlIG9mIG9wdGlvbi5kaXNhYmxlSWYgYW5kIHRoZVxuICAgKiBzdGF0ZSBvZiB0aGUgY29ycmVzcG9uZGluZyBib29sZWFuIG9wdGlvblxuICAgKiBAcGFyYW0geyp9IG9wdGlvbiBBbiBlbGVtZW50IG9mIHRoaXMub3B0aW9uc1NwZWMgb3IgYW4gb3B0aW9uIGlkXG4gICAqL1xuICBkaXNhYmxlT3JFbmFibGUgKG9wdGlvbikge1xuICAgIGlmICh0eXBlb2YgKG9wdGlvbikgPT09ICdzdHJpbmcnKSB7XG4gICAgICBvcHRpb24gPSB0aGlzLm9wdGlvbnNTcGVjLmZpbmQoeCA9PiAoeCBhcyB7aWQ6c3RyaW5nfHVuZGVmaW5lZH0pLmlkID09PSBvcHRpb24pXG4gICAgICBpZiAoIW9wdGlvbikgdGhyb3cgbmV3IEVycm9yKGBubyBvcHRpb24gd2l0aCBpZCAnJHtvcHRpb259J2ApXG4gICAgfVxuXG4gICAgaWYgKCFvcHRpb24uZGlzYWJsZWRJZikgcmV0dXJuXG5cbiAgICAvLyBJbnZlcnNlIGV2ZXJ5dGhpbmcgaWYgYmVnaW5pbmcgd2l0aCAhXG4gICAgbGV0IGRpc2FibGVySWQgPSBvcHRpb24uZGlzYWJsZWRJZlxuICAgIGxldCBlbmFibGUgPSBmYWxzZSAvLyBkaXNhYmxlIGlmZiBkaXNhYmxlciBpcyB0cnVlXG4gICAgaWYgKGRpc2FibGVySWQuc3RhcnRzV2l0aCgnIScpKSB7XG4gICAgICBlbmFibGUgPSB0cnVlIC8vIGVuZGFibGUgaWZmIGRpc2FibGVyIGlzIHRydWVcbiAgICAgIGRpc2FibGVySWQgPSBkaXNhYmxlcklkLnNsaWNlKDEpXG4gICAgfVxuXG4gICAgLy8gRW5kYWJsZSBvciBkaXNhYmxlXG4gICAgaWYgKHRoaXMub3B0aW9uc1tkaXNhYmxlcklkXSA9PT0gZW5hYmxlKSB7IC8vIGVuYWJsZVxuICAgICAgb3B0aW9uLmVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSgnZGlzYWJsZWQnKVxuICAgICAgO1suLi5vcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKV0uZm9yRWFjaChlID0+IHsgZS5kaXNhYmxlZCA9IGZhbHNlIH0pXG4gICAgfSBlbHNlIHsgLy8gZGlzYWJsZVxuICAgICAgb3B0aW9uLmVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnZGlzYWJsZWQnKVxuICAgICAgO1suLi5vcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKV0uZm9yRWFjaChlID0+IHsgZS5kaXNhYmxlZCA9IHRydWUgfSlcbiAgICB9XG4gIH1cblxuICByZW5kZXJJbiAoZWxlbWVudCkge1xuICAgIGNvbnN0IGxpc3QgPSBjcmVhdGVFbGVtKCd1bCcsICdvcHRpb25zLWxpc3QnKVxuICAgIGxldCBjb2x1bW4gPSBjcmVhdGVFbGVtKCdkaXYnLCAnb3B0aW9ucy1jb2x1bW4nLCBsaXN0KVxuXG4gICAgdGhpcy5vcHRpb25zU3BlYy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICBpZiAob3B0aW9uLnR5cGUgPT09ICdjb2x1bW4tYnJlYWsnKSB7IC8vIHN0YXJ0IG5ldyBjb2x1bW5cbiAgICAgICAgY29sdW1uID0gY3JlYXRlRWxlbSgnZGl2JywgJ29wdGlvbnMtY29sdW1uJywgbGlzdClcbiAgICAgIH0gZWxzZSB7IC8vIG1ha2UgbGlzdCBpdGVtXG4gICAgICAgIGNvbnN0IGxpID0gY3JlYXRlRWxlbSgnbGknLCB1bmRlZmluZWQsIGNvbHVtbilcbiAgICAgICAgaWYgKChvcHRpb24gYXMgT3B0aW9uSSkuaWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGxpLmRhdGFzZXQub3B0aW9uSWQgPSAob3B0aW9uIGFzIE9wdGlvbkkpLmlkXG4gICAgICAgIH1cblxuICAgICAgICBzd2l0Y2ggKG9wdGlvbi50eXBlKSB7XG4gICAgICAgICAgY2FzZSAnaGVhZGluZyc6XG4gICAgICAgICAgICByZW5kZXJIZWFkaW5nKG9wdGlvbi50aXRsZSwgbGkpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ2ludCc6XG4gICAgICAgICAgY2FzZSAnYm9vbCc6XG4gICAgICAgICAgICByZW5kZXJTaW5nbGVPcHRpb24ob3B0aW9uLCBsaSlcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAnc2VsZWN0LWluY2x1c2l2ZSc6XG4gICAgICAgICAgY2FzZSAnc2VsZWN0LWV4Y2x1c2l2ZSc6XG4gICAgICAgICAgICB0aGlzLnJlbmRlckxpc3RPcHRpb24ob3B0aW9uLCBsaSlcbiAgICAgICAgfVxuICAgICAgICBsaS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBlID0+IHsgdGhpcy51cGRhdGVTdGF0ZUZyb21VSShvcHRpb24pOyB0aGlzLmRpc2FibGVPckVuYWJsZUFsbCgpIH0pXG4gICAgICAgIG9wdGlvbi5lbGVtZW50ID0gbGlcblxuICAgICAgfVxuICAgIH0pXG4gICAgZWxlbWVudC5hcHBlbmQobGlzdClcblxuICAgIHRoaXMuZGlzYWJsZU9yRW5hYmxlQWxsKClcbiAgfVxuXG4gIHJlbmRlckxpc3RPcHRpb24gKG9wdGlvbjogU2VsZWN0RXhjbHVzaXZlT3B0aW9uIHwgU2VsZWN0SW5jbHVzaXZlT3B0aW9uICwgbGkgOiBIVE1MRWxlbWVudCkge1xuICAgIGxpLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJyxvcHRpb24udGl0bGUgKyAnOiAnKVxuXG4gICAgY29uc3Qgc3VibGlzdCA9IGNyZWF0ZUVsZW0oJ3VsJywgJ29wdGlvbnMtc3VibGlzdCcsIGxpKVxuICAgIGlmIChvcHRpb24udmVydGljYWwpIHN1Ymxpc3QuY2xhc3NMaXN0LmFkZCgnb3B0aW9ucy1zdWJsaXN0LXZlcnRpY2FsJylcblxuICAgIG9wdGlvbi5zZWxlY3RPcHRpb25zLmZvckVhY2goc2VsZWN0T3B0aW9uID0+IHtcbiAgICAgIGNvbnN0IHN1Ymxpc3RMaSA9IGNyZWF0ZUVsZW0oJ2xpJywgbnVsbCwgc3VibGlzdClcbiAgICAgIGNvbnN0IGxhYmVsID0gY3JlYXRlRWxlbSgnbGFiZWwnLCBudWxsLCBzdWJsaXN0TGkpXG5cbiAgICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKVxuICAgICAgaW5wdXQudHlwZSA9IG9wdGlvbi50eXBlID09PSAnc2VsZWN0LWV4Y2x1c2l2ZScgPyAncmFkaW8nIDogJ2NoZWNrYm94J1xuICAgICAgaW5wdXQubmFtZSA9IHRoaXMuZ2xvYmFsSWQgKyAnLScgKyBvcHRpb24uaWRcbiAgICAgIGlucHV0LnZhbHVlID0gc2VsZWN0T3B0aW9uLmlkXG5cbiAgICAgIGlmIChvcHRpb24udHlwZSA9PT0gJ3NlbGVjdC1pbmNsdXNpdmUnKSB7IC8vIGRlZmF1bHRzIHdvcmsgZGlmZmVyZW50IGZvciBpbmNsdXNpdmUvZXhjbHVzaXZlXG4gICAgICAgIGlucHV0LmNoZWNrZWQgPSBvcHRpb24uZGVmYXVsdC5pbmNsdWRlcyhzZWxlY3RPcHRpb24uaWQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbnB1dC5jaGVja2VkID0gb3B0aW9uLmRlZmF1bHQgPT09IHNlbGVjdE9wdGlvbi5pZFxuICAgICAgfVxuXG4gICAgICBsYWJlbC5hcHBlbmQoaW5wdXQpXG5cbiAgICAgIGlucHV0LmNsYXNzTGlzdC5hZGQoJ29wdGlvbicpXG5cbiAgICAgIGxhYmVsLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJyxzZWxlY3RPcHRpb24udGl0bGUpXG4gICAgfSlcbiAgfVxufVxuXG4vKipcbiAqIFJlbmRlcnMgYSBoZWFkaW5nIG9wdGlvblxuICogQHBhcmFtIHtzdHJpbmd9IHRpdGxlIFRoZSB0aXRsZSBvZiB0aGUgaGVhZGluZ1xuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gbGkgVGhlIGVsZW1lbnQgdG8gcmVuZGVyIGludG9cbiAqL1xuZnVuY3Rpb24gcmVuZGVySGVhZGluZyAodGl0bGUsIGxpKSB7XG4gIGxpLmlubmVySFRNTCA9IHRpdGxlXG4gIGxpLmNsYXNzTGlzdC5hZGQoJ29wdGlvbnMtaGVhZGluZycpXG59XG5cbi8qKlxuICogUmVuZGVycyBzaW5nbGUgcGFyYW1ldGVyXG4gKiBAcGFyYW0geyp9IG9wdGlvblxuICogQHBhcmFtIHsqfSBsaVxuICovXG5mdW5jdGlvbiByZW5kZXJTaW5nbGVPcHRpb24gKG9wdGlvbiwgbGkpIHtcbiAgY29uc3QgbGFiZWwgPSBjcmVhdGVFbGVtKCdsYWJlbCcsIHVuZGVmaW5lZCwgbGkpXG5cbiAgaWYgKCFvcHRpb24uc3dhcExhYmVsICYmIG9wdGlvbi50aXRsZSAhPT0gJycpIGxhYmVsLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJyxgJHtvcHRpb24udGl0bGV9OiBgKVxuXG4gIGNvbnN0IGlucHV0IDogSFRNTElucHV0RWxlbWVudCA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgJ29wdGlvbicsIGxhYmVsKSBhcyBIVE1MSW5wdXRFbGVtZW50XG4gIHN3aXRjaCAob3B0aW9uLnR5cGUpIHtcbiAgICBjYXNlICdpbnQnOlxuICAgICAgaW5wdXQudHlwZSA9ICdudW1iZXInXG4gICAgICBpbnB1dC5taW4gPSBvcHRpb24ubWluXG4gICAgICBpbnB1dC5tYXggPSBvcHRpb24ubWF4XG4gICAgICBpbnB1dC52YWx1ZSA9IG9wdGlvbi5kZWZhdWx0XG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jvb2wnOlxuICAgICAgaW5wdXQudHlwZSA9ICdjaGVja2JveCdcbiAgICAgIGlucHV0LmNoZWNrZWQgPSBvcHRpb24uZGVmYXVsdFxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIG9wdGlvbiB0eXBlICR7b3B0aW9uLnR5cGV9YClcbiAgfVxuXG4gIGlmIChvcHRpb24uc3dhcExhYmVsICYmIG9wdGlvbi50aXRsZSAhPT0gJycpIGxhYmVsLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJyxgICR7b3B0aW9uLnRpdGxlfWApXG59XG5cbmNvbnN0IGRlbW9TcGVjIDogT3B0aW9uc1NwZWMgPSBbXG4gIHtcbiAgICB0aXRsZTogJ0RpZmZpY3VsdHknLFxuICAgIGlkOiAnZGlmZmljdWx0eScsXG4gICAgdHlwZTogJ2ludCcsXG4gICAgbWluOiAxLFxuICAgIG1heDogMTAsXG4gICAgZGVmYXVsdDogNVxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdUeXBlJyxcbiAgICBpZDogJ3R5cGUnLFxuICAgIHR5cGU6ICdzZWxlY3QtZXhjbHVzaXZlJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICB7IHRpdGxlOiAnUmVjdGFuZ2xlJywgaWQ6ICdyZWN0YW5nbGUnIH0sXG4gICAgICB7IHRpdGxlOiAnVHJpYW5nbGUnLCBpZDogJ3RyaWFuZ2xlJyB9LFxuICAgICAgeyB0aXRsZTogJ1NxdW92YWwnLCBpZDogJ3NxdW92YWwnIH1cbiAgICBdLFxuICAgIGRlZmF1bHQ6ICdyZWN0YW5nbGUnXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ0EgaGVhZGluZycsXG4gICAgdHlwZTogJ2hlYWRpbmcnXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1NoYXBlJyxcbiAgICBpZDogJ3NoYXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWluY2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ1JlY3RhbmdsZSBzaGFwZSB0aGluZycsIGlkOiAncmVjdGFuZ2xlJyB9LFxuICAgICAgeyB0aXRsZTogJ1RyaWFuZ2xlIHNoYXBlIHRoaW5nJywgaWQ6ICd0cmlhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdTcXVvdmFsIHNoYXBlIGxvbmcnLCBpZDogJ3NxdW92YWwnIH1cbiAgICBdLFxuICAgIGRlZmF1bHQ6IFsncmVjdGFuZ2xlJywgJ3NxdW92YWwnXSxcbiAgICB2ZXJ0aWNhbDogdHJ1ZSAvLyBsYXlvdXQgdmVydGljYWxseSwgcmF0aGVyIHRoYW4gaG9yaXpvbnRhbGx5XG4gIH0sXG4gIHtcbiAgICB0eXBlOiAnY29sdW1uLWJyZWFrJ1xuICB9LFxuICB7XG4gICAgdHlwZTogJ2hlYWRpbmcnLFxuICAgIHRpdGxlOiAnQSBuZXcgY29sdW1uJ1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdEbyBzb21ldGhpbmcnLFxuICAgIGlkOiAnc29tZXRoaW5nJyxcbiAgICB0eXBlOiAnYm9vbCcsXG4gICAgZGVmYXVsdDogdHJ1ZSxcbiAgICBzd2FwTGFiZWw6IHRydWUgLy8gcHV0IGNvbnRyb2wgYmVmb3JlIGxhYmVsXG4gIH1cbl1cbiIsImV4cG9ydCBkZWZhdWx0IGFic3RyYWN0IGNsYXNzIFF1ZXN0aW9uIHtcbiAgRE9NOiBIVE1MRWxlbWVudFxuICBhbnN3ZXJlZDogYm9vbGVhblxuXG4gIGNvbnN0cnVjdG9yICgpIHtcbiAgICB0aGlzLkRPTSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgdGhpcy5ET00uY2xhc3NOYW1lID0gJ3F1ZXN0aW9uLWRpdidcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHtcbiAgICByZXR1cm4gdGhpcy5ET01cbiAgfVxuXG4gIGFic3RyYWN0IHJlbmRlciAoKSA6IHZvaWRcblxuICBzaG93QW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5hbnN3ZXJlZCA9IHRydWVcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxuXG4gIHRvZ2dsZUFuc3dlciAoKSA6IHZvaWQge1xuICAgIGlmICh0aGlzLmFuc3dlcmVkKSB7XG4gICAgICB0aGlzLmhpZGVBbnN3ZXIoKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNob3dBbnN3ZXIoKVxuICAgIH1cbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyAvLyBTaG91bGQgYmUgb3ZlcnJpZGRlblxuICAgIHJldHVybiAnJ1xuICB9XG59XG4iLCIvKiBnbG9iYWwga2F0ZXggKi9cbmltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbi9RdWVzdGlvbidcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGV4dFEgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIoKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiA1LFxuICAgICAgbGFiZWw6ICdhJ1xuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgLy8gc3RvcmUgdGhlIGxhYmVsIGZvciBmdXR1cmUgcmVuZGVyaW5nXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyBEdW1teSBxdWVzdGlvbiBnZW5lcmF0aW5nIC0gc3ViY2xhc3NlcyBkbyBzb21ldGhpbmcgc3Vic3RhbnRpYWwgaGVyZVxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICcyKzInXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICc9NSdcblxuICAgIC8vIE1ha2UgdGhlIERPTSB0cmVlIGZvciB0aGUgZWxlbWVudFxuICAgIHRoaXMucXVlc3Rpb25wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpXG4gICAgdGhpcy5hbnN3ZXJwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpXG5cbiAgICB0aGlzLnF1ZXN0aW9ucC5jbGFzc05hbWUgPSAncXVlc3Rpb24nXG4gICAgdGhpcy5hbnN3ZXJwLmNsYXNzTmFtZSA9ICdhbnN3ZXInXG4gICAgdGhpcy5hbnN3ZXJwLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpXG5cbiAgICB0aGlzLkRPTS5hcHBlbmRDaGlsZCh0aGlzLnF1ZXN0aW9ucClcbiAgICB0aGlzLkRPTS5hcHBlbmRDaGlsZCh0aGlzLmFuc3dlcnApXG5cbiAgICAvLyBzdWJjbGFzc2VzIHNob3VsZCBnZW5lcmF0ZSBxdWVzdGlvbkxhVGVYIGFuZCBhbnN3ZXJMYVRlWCxcbiAgICAvLyAucmVuZGVyKCkgd2lsbCBiZSBjYWxsZWQgYnkgdXNlclxuICB9XG5cbiAgcmVuZGVyICgpIHtcbiAgICAvLyB1cGRhdGUgdGhlIERPTSBpdGVtIHdpdGggcXVlc3Rpb25MYVRlWCBhbmQgYW5zd2VyTGFUZVhcbiAgICB2YXIgcW51bSA9IHRoaXMubGFiZWxcbiAgICAgID8gJ1xcXFx0ZXh0eycgKyB0aGlzLmxhYmVsICsgJykgfSdcbiAgICAgIDogJydcbiAgICBrYXRleC5yZW5kZXIocW51bSArIHRoaXMucXVlc3Rpb25MYVRlWCwgdGhpcy5xdWVzdGlvbnAsIHsgZGlzcGxheU1vZGU6IHRydWUsIHN0cmljdDogJ2lnbm9yZScgfSlcbiAgICBrYXRleC5yZW5kZXIodGhpcy5hbnN3ZXJMYVRlWCwgdGhpcy5hbnN3ZXJwLCB7IGRpc3BsYXlNb2RlOiB0cnVlIH0pXG4gIH1cblxuICBnZXRET00gKCkge1xuICAgIHJldHVybiB0aGlzLkRPTVxuICB9XG5cbiAgc2hvd0Fuc3dlciAoKSB7XG4gICAgdGhpcy5hbnN3ZXJwLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IHRydWVcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkge1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICB9XG59XG4iLCJpbXBvcnQgeyByYW5kQmV0d2VlbiwgZ2NkIH0gZnJvbSAnVXRpbGl0aWVzJ1xuaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuXG4vKiBNYWluIHF1ZXN0aW9uIGNsYXNzLiBUaGlzIHdpbGwgYmUgc3B1biBvZmYgaW50byBkaWZmZXJlbnQgZmlsZSBhbmQgZ2VuZXJhbGlzZWQgKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFsZ2VicmFpY0ZyYWN0aW9uUSBleHRlbmRzIFRleHRRIHtcbiAgLy8gJ2V4dGVuZHMnIFF1ZXN0aW9uLCBidXQgbm90aGluZyB0byBhY3R1YWxseSBleHRlbmRcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiAyXG4gICAgfVxuXG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcbiAgICBjb25zdCBkaWZmaWN1bHR5ID0gc2V0dGluZ3MuZGlmZmljdWx0eVxuXG4gICAgLy8gbG9naWMgZm9yIGdlbmVyYXRpbmcgdGhlIHF1ZXN0aW9uIGFuZCBhbnN3ZXIgc3RhcnRzIGhlcmVcbiAgICB2YXIgYSwgYiwgYywgZCwgZSwgZiAvLyAoYXgrYikoZXgrZikvKGN4K2QpKGV4K2YpID0gKHB4XjIrcXgrcikvKHR4XjIrdXgrdilcbiAgICB2YXIgcCwgcSwgciwgdCwgdSwgdlxuICAgIHZhciBtaW5Db2VmZiwgbWF4Q29lZmYsIG1pbkNvbnN0LCBtYXhDb25zdFxuXG4gICAgc3dpdGNoIChkaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIG1pbkNvZWZmID0gMTsgbWF4Q29lZmYgPSAxOyBtaW5Db25zdCA9IDE7IG1heENvbnN0ID0gNlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMTsgbWluQ29uc3QgPSAtNjsgbWF4Q29uc3QgPSA2XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDM6XG4gICAgICAgIG1pbkNvZWZmID0gMTsgbWF4Q29lZmYgPSAzOyBtaW5Db25zdCA9IC01OyBtYXhDb25zdCA9IDVcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNDpcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIG1pbkNvZWZmID0gLTM7IG1heENvZWZmID0gMzsgbWluQ29uc3QgPSAtNTsgbWF4Q29uc3QgPSA1XG4gICAgICAgIGJyZWFrXG4gICAgfVxuXG4gICAgLy8gUGljayBzb21lIGNvZWZmaWNpZW50c1xuICAgIHdoaWxlIChcbiAgICAgICgoIWEgJiYgIWIpIHx8ICghYyAmJiAhZCkgfHwgKCFlICYmICFmKSkgfHwgLy8gcmV0cnkgaWYgYW55IGV4cHJlc3Npb24gaXMgMFxuICAgICAgY2FuU2ltcGxpZnkoYSwgYiwgYywgZCkgLy8gcmV0cnkgaWYgdGhlcmUncyBhIGNvbW1vbiBudW1lcmljYWwgZmFjdG9yXG4gICAgKSB7XG4gICAgICBhID0gcmFuZEJldHdlZW4obWluQ29lZmYsIG1heENvZWZmKVxuICAgICAgYyA9IHJhbmRCZXR3ZWVuKG1pbkNvZWZmLCBtYXhDb2VmZilcbiAgICAgIGUgPSByYW5kQmV0d2VlbihtaW5Db2VmZiwgbWF4Q29lZmYpXG4gICAgICBiID0gcmFuZEJldHdlZW4obWluQ29uc3QsIG1heENvbnN0KVxuICAgICAgZCA9IHJhbmRCZXR3ZWVuKG1pbkNvbnN0LCBtYXhDb25zdClcbiAgICAgIGYgPSByYW5kQmV0d2VlbihtaW5Db25zdCwgbWF4Q29uc3QpXG4gICAgfVxuXG4gICAgLy8gaWYgdGhlIGRlbm9taW5hdG9yIGlzIG5lZ2F0aXZlIGZvciBlYWNoIHRlcm0sIHRoZW4gbWFrZSB0aGUgbnVtZXJhdG9yIG5lZ2F0aXZlIGluc3RlYWRcbiAgICBpZiAoYyA8PSAwICYmIGQgPD0gMCkge1xuICAgICAgYyA9IC1jXG4gICAgICBkID0gLWRcbiAgICAgIGEgPSAtYVxuICAgICAgYiA9IC1iXG4gICAgfVxuXG4gICAgcCA9IGEgKiBlOyBxID0gYSAqIGYgKyBiICogZTsgciA9IGIgKiBmXG4gICAgdCA9IGMgKiBlOyB1ID0gYyAqIGYgKyBkICogZTsgdiA9IGQgKiBmXG5cbiAgICAvLyBOb3cgcHV0IHRoZSBxdWVzdGlvbiBhbmQgYW5zd2VyIGluIGEgbmljZSBmb3JtYXQgaW50byBxdWVzdGlvbkxhVGVYIGFuZCBhbnN3ZXJMYVRlWFxuICAgIGNvbnN0IHF1ZXN0aW9uID0gYFxcXFxmcmFjeyR7cXVhZHJhdGljU3RyaW5nKHAsIHEsIHIpfX17JHtxdWFkcmF0aWNTdHJpbmcodCwgdSwgdil9fWBcbiAgICBpZiAoc2V0dGluZ3MudXNlQ29tbWFuZFdvcmQpIHtcbiAgICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICdcXFxcdGV4dHtTaW1wbGlmeX0gJyArIHF1ZXN0aW9uXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9IHF1ZXN0aW9uXG4gICAgfVxuICAgIHRoaXMuYW5zd2VyTGFUZVggPVxuICAgICAgKGMgPT09IDAgJiYgZCA9PT0gMSkgPyBxdWFkcmF0aWNTdHJpbmcoMCwgYSwgYilcbiAgICAgICAgOiBgXFxcXGZyYWN7JHtxdWFkcmF0aWNTdHJpbmcoMCwgYSwgYil9fXske3F1YWRyYXRpY1N0cmluZygwLCBjLCBkKX19YFxuXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICc9ICcgKyB0aGlzLmFuc3dlckxhVGVYXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ1NpbXBsaWZ5J1xuICB9XG59XG5cbi8qIFV0aWxpdHkgZnVuY3Rpb25zXG4gKiBBdCBzb21lIHBvaW50LCBJJ2xsIG1vdmUgc29tZSBvZiB0aGVzZSBpbnRvIGEgZ2VuZXJhbCB1dGlsaXRpZXMgbW9kdWxlXG4gKiBidXQgdGhpcyB3aWxsIGRvIGZvciBub3dcbiAqL1xuXG4vLyBUT0RPIEkgaGF2ZSBxdWFkcmF0aWNTdHJpbmcgaGVyZSBhbmQgYWxzbyBhIFBvbHlub21pYWwgY2xhc3MuIFdoYXQgaXMgYmVpbmcgcmVwbGljYXRlZD/Cp1xuZnVuY3Rpb24gcXVhZHJhdGljU3RyaW5nIChhLCBiLCBjKSB7XG4gIGlmIChhID09PSAwICYmIGIgPT09IDAgJiYgYyA9PT0gMCkgcmV0dXJuICcwJ1xuXG4gIHZhciB4MnN0cmluZyA9XG4gICAgYSA9PT0gMCA/ICcnXG4gICAgICA6IGEgPT09IDEgPyAneF4yJ1xuICAgICAgICA6IGEgPT09IC0xID8gJy14XjInXG4gICAgICAgICAgOiBhICsgJ3heMidcblxuICB2YXIgeHNpZ24gPVxuICAgIGIgPCAwID8gJy0nXG4gICAgICA6IChhID09PSAwIHx8IGIgPT09IDApID8gJydcbiAgICAgICAgOiAnKydcblxuICB2YXIgeHN0cmluZyA9XG4gICAgYiA9PT0gMCA/ICcnXG4gICAgICA6IChiID09PSAxIHx8IGIgPT09IC0xKSA/ICd4J1xuICAgICAgICA6IE1hdGguYWJzKGIpICsgJ3gnXG5cbiAgdmFyIGNvbnN0c2lnbiA9XG4gICAgYyA8IDAgPyAnLSdcbiAgICAgIDogKChhID09PSAwICYmIGIgPT09IDApIHx8IGMgPT09IDApID8gJydcbiAgICAgICAgOiAnKydcblxuICB2YXIgY29uc3RzdHJpbmcgPVxuICAgIGMgPT09IDAgPyAnJyA6IE1hdGguYWJzKGMpXG5cbiAgcmV0dXJuIHgyc3RyaW5nICsgeHNpZ24gKyB4c3RyaW5nICsgY29uc3RzaWduICsgY29uc3RzdHJpbmdcbn1cblxuZnVuY3Rpb24gY2FuU2ltcGxpZnkgKGExLCBiMSwgYTIsIGIyKSB7XG4gIC8vIGNhbiAoYTF4K2IxKS8oYTJ4K2IyKSBiZSBzaW1wbGlmaWVkP1xuICAvL1xuICAvLyBGaXJzdCwgdGFrZSBvdXQgZ2NkLCBhbmQgd3JpdGUgYXMgYzEoYTF4K2IxKSBldGNcblxuICB2YXIgYzEgPSBnY2QoYTEsIGIxKVxuICBhMSA9IGExIC8gYzFcbiAgYjEgPSBiMSAvIGMxXG5cbiAgdmFyIGMyID0gZ2NkKGEyLCBiMilcbiAgYTIgPSBhMiAvIGMyXG4gIGIyID0gYjIgLyBjMlxuXG4gIHZhciByZXN1bHQgPSBmYWxzZVxuXG4gIGlmIChnY2QoYzEsIGMyKSA+IDEgfHwgKGExID09PSBhMiAmJiBiMSA9PT0gYjIpKSB7XG4gICAgcmVzdWx0ID0gdHJ1ZVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdFxufVxuIiwiaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEludGVnZXJBZGRRIGV4dGVuZHMgVGV4dFEge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDUsXG4gICAgICBsYWJlbDogJ2EnXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICB0aGlzLmxhYmVsID0gc2V0dGluZ3MubGFiZWxcblxuICAgIC8vIFRoaXMgaXMganVzdCBhIGRlbW8gcXVlc3Rpb24gdHlwZSBmb3Igbm93LCBzbyBub3QgcHJvY2Vzc2luZyBkaWZmaWN1bHR5XG4gICAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKDEwLCAxMDAwKVxuICAgIGNvbnN0IGIgPSByYW5kQmV0d2VlbigxMCwgMTAwMClcbiAgICBjb25zdCBzdW0gPSBhICsgYlxuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gYSArICcgKyAnICsgYlxuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPSAnICsgc3VtXG5cbiAgICB0aGlzLnJlbmRlcigpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ0V2YWx1YXRlJ1xuICB9XG59XG4iLCIvKipcbiAqIENsYXNzIHJlcHJlc2VudGluZyBhIHBvaW50LCBhbmQgc3RhdGljIHV0aXRsaXR5IG1ldGhvZHNcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUG9pbnQge1xuICBjb25zdHJ1Y3RvciAoeCwgeSkge1xuICAgIHRoaXMueCA9IHhcbiAgICB0aGlzLnkgPSB5XG4gIH1cblxuICByb3RhdGUgKGFuZ2xlKSB7XG4gICAgdmFyIG5ld3gsIG5ld3lcbiAgICBuZXd4ID0gTWF0aC5jb3MoYW5nbGUpICogdGhpcy54IC0gTWF0aC5zaW4oYW5nbGUpICogdGhpcy55XG4gICAgbmV3eSA9IE1hdGguc2luKGFuZ2xlKSAqIHRoaXMueCArIE1hdGguY29zKGFuZ2xlKSAqIHRoaXMueVxuICAgIHRoaXMueCA9IG5ld3hcbiAgICB0aGlzLnkgPSBuZXd5XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHNjYWxlIChzZikge1xuICAgIHRoaXMueCA9IHRoaXMueCAqIHNmXG4gICAgdGhpcy55ID0gdGhpcy55ICogc2ZcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgdHJhbnNsYXRlICh4LCB5KSB7XG4gICAgdGhpcy54ICs9IHhcbiAgICB0aGlzLnkgKz0geVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBjbG9uZSAoKSB7XG4gICAgcmV0dXJuIG5ldyBQb2ludCh0aGlzLngsIHRoaXMueSlcbiAgfVxuXG4gIGVxdWFscyAodGhhdCkge1xuICAgIHJldHVybiAodGhpcy54ID09PSB0aGF0LnggJiYgdGhpcy55ID09PSB0aGF0LnkpXG4gIH1cblxuICBtb3ZlVG93YXJkICh0aGF0LCBkKSB7XG4gICAgLy8gbW92ZXMgW2RdIGluIHRoZSBkaXJlY3Rpb24gb2YgW3RoYXQ6OlBvaW50XVxuICAgIGNvbnN0IHV2ZWMgPSBQb2ludC51bml0VmVjdG9yKHRoaXMsIHRoYXQpXG4gICAgdGhpcy50cmFuc2xhdGUodXZlYy54ICogZCwgdXZlYy55ICogZClcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3RhdGljIGZyb21Qb2xhciAociwgdGhldGEpIHtcbiAgICByZXR1cm4gbmV3IFBvaW50KFxuICAgICAgTWF0aC5jb3ModGhldGEpICogcixcbiAgICAgIE1hdGguc2luKHRoZXRhKSAqIHJcbiAgICApXG4gIH1cblxuICBzdGF0aWMgZnJvbVBvbGFyRGVnIChyLCB0aGV0YSkge1xuICAgIHRoZXRhID0gdGhldGEgKiBNYXRoLlBJIC8gMTgwXG4gICAgcmV0dXJuIFBvaW50LmZyb21Qb2xhcihyLCB0aGV0YSlcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBtZWFuIG9mXG4gICAqIEBwYXJhbSAgey4uLlBvaW50fSBwb2ludHMgVGhlIHBvaW50cyB0byBmaW5kIHRoZSBtZWFuIG9mXG4gICAqL1xuICBzdGF0aWMgbWVhbiAoLi4ucG9pbnRzKSB7XG4gICAgY29uc3Qgc3VteCA9IHBvaW50cy5tYXAocCA9PiBwLngpLnJlZHVjZSgoeCwgeSkgPT4geCArIHkpXG4gICAgY29uc3Qgc3VteSA9IHBvaW50cy5tYXAocCA9PiBwLnkpLnJlZHVjZSgoeCwgeSkgPT4geCArIHkpXG4gICAgY29uc3QgbiA9IHBvaW50cy5sZW5ndGhcblxuICAgIHJldHVybiBuZXcgUG9pbnQoc3VteCAvIG4sIHN1bXkgLyBuKVxuICB9XG5cbiAgc3RhdGljIGluQ2VudGVyIChBLCBCLCBDKSB7XG4gICAgLy8gaW5jZW50ZXIgb2YgYSB0cmlhbmdsZSBnaXZlbiB2ZXJ0ZXggcG9pbnRzIEEsIEIgYW5kIENcbiAgICBjb25zdCBhID0gUG9pbnQuZGlzdGFuY2UoQiwgQylcbiAgICBjb25zdCBiID0gUG9pbnQuZGlzdGFuY2UoQSwgQylcbiAgICBjb25zdCBjID0gUG9pbnQuZGlzdGFuY2UoQSwgQilcblxuICAgIGNvbnN0IHBlcmltZXRlciA9IGEgKyBiICsgY1xuICAgIGNvbnN0IHN1bXggPSBhICogQS54ICsgYiAqIEIueCArIGMgKiBDLnhcbiAgICBjb25zdCBzdW15ID0gYSAqIEEueSArIGIgKiBCLnkgKyBjICogQy55XG5cbiAgICByZXR1cm4gbmV3IFBvaW50KHN1bXggLyBwZXJpbWV0ZXIsIHN1bXkgLyBwZXJpbWV0ZXIpXG4gIH1cblxuICBzdGF0aWMgbWluIChwb2ludHMpIHtcbiAgICBjb25zdCBtaW54ID0gcG9pbnRzLnJlZHVjZSgoeCwgcCkgPT4gTWF0aC5taW4oeCwgcC54KSwgSW5maW5pdHkpXG4gICAgY29uc3QgbWlueSA9IHBvaW50cy5yZWR1Y2UoKHksIHApID0+IE1hdGgubWluKHksIHAueSksIEluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQobWlueCwgbWlueSlcbiAgfVxuXG4gIHN0YXRpYyBtYXggKHBvaW50cykge1xuICAgIGNvbnN0IG1heHggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1heCh4LCBwLngpLCAtSW5maW5pdHkpXG4gICAgY29uc3QgbWF4eSA9IHBvaW50cy5yZWR1Y2UoKHksIHApID0+IE1hdGgubWF4KHksIHAueSksIC1JbmZpbml0eSlcbiAgICByZXR1cm4gbmV3IFBvaW50KG1heHgsIG1heHkpXG4gIH1cblxuICBzdGF0aWMgY2VudGVyIChwb2ludHMpIHtcbiAgICBjb25zdCBtaW54ID0gcG9pbnRzLnJlZHVjZSgoeCwgcCkgPT4gTWF0aC5taW4oeCwgcC54KSwgSW5maW5pdHkpXG4gICAgY29uc3QgbWlueSA9IHBvaW50cy5yZWR1Y2UoKHksIHApID0+IE1hdGgubWluKHksIHAueSksIEluZmluaXR5KVxuICAgIGNvbnN0IG1heHggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1heCh4LCBwLngpLCAtSW5maW5pdHkpXG4gICAgY29uc3QgbWF4eSA9IHBvaW50cy5yZWR1Y2UoKHksIHApID0+IE1hdGgubWF4KHksIHAueSksIC1JbmZpbml0eSlcbiAgICByZXR1cm4gbmV3IFBvaW50KChtYXh4ICsgbWlueCkgLyAyLCAobWF4eSArIG1pbnkpIC8gMilcbiAgfVxuXG4gIHN0YXRpYyB1bml0VmVjdG9yIChwMSwgcDIpIHtcbiAgICAvLyByZXR1cm5zIGEgdW5pdCB2ZWN0b3IgaW4gdGhlIGRpcmVjdGlvbiBvZiBwMSB0byBwMlxuICAgIC8vIGluIHRoZSBmb3JtIHt4Oi4uLiwgeTouLi59XG4gICAgY29uc3QgdmVjeCA9IHAyLnggLSBwMS54XG4gICAgY29uc3QgdmVjeSA9IHAyLnkgLSBwMS55XG4gICAgY29uc3QgbGVuZ3RoID0gTWF0aC5oeXBvdCh2ZWN4LCB2ZWN5KVxuICAgIHJldHVybiB7IHg6IHZlY3ggLyBsZW5ndGgsIHk6IHZlY3kgLyBsZW5ndGggfVxuICB9XG5cbiAgc3RhdGljIGRpc3RhbmNlIChwMSwgcDIpIHtcbiAgICByZXR1cm4gTWF0aC5oeXBvdChwMS54IC0gcDIueCwgcDEueSAtIHAyLnkpXG4gIH1cblxuICAvKipcbiAgICogQ2FsY3VsYXRlIHRoZSBhbmdsZSBpbiByYWRpYW5zIGZyb20gaG9yaXpvbnRhbCB0byBwMiwgd2l0aCBjZW50cmUgcDEuXG4gICAqIEUuZy4gYW5nbGVGcm9tKCAoMCwwKSwgKDEsMSkgKSA9IHBpLzJcbiAgICogQW5nbGUgaXMgZnJvbSAwIHRvIDJwaVxuICAgKiBAcGFyYW0ge1BvaW50fSBwMSBUaGUgc3RhcnQgcG9pbnRcbiAgICogQHBhcmFtIHtQb2ludH0gcDIgVGhlIGVuZCBwb2ludFxuICAgKiBAcmV0dXJucyB7bnVtYmVyfSBUaGUgYW5nbGUgaW4gcmFkaWFuc1xuICAgKi9cbiAgc3RhdGljIGFuZ2xlRnJvbSAocDEsIHAyKSB7XG4gICAgY29uc3QgYW5nbGUgPSBNYXRoLmF0YW4yKHAyLnkgLSBwMS55LCBwMi54IC0gcDEueClcbiAgICByZXR1cm4gYW5nbGUgPj0gMCA/IGFuZ2xlIDogMiAqIE1hdGguUEkgKyBhbmdsZVxuICB9XG5cbiAgc3RhdGljIHJlcGVsIChwMSwgcDIsIHRyaWdnZXIsIGRpc3RhbmNlKSB7XG4gICAgLy8gV2hlbiBwMSBhbmQgcDIgYXJlIGxlc3MgdGhhbiBbdHJpZ2dlcl0gYXBhcnQsIHRoZXkgYXJlXG4gICAgLy8gbW92ZWQgc28gdGhhdCB0aGV5IGFyZSBbZGlzdGFuY2VdIGFwYXJ0XG4gICAgY29uc3QgZCA9IE1hdGguaHlwb3QocDEueCAtIHAyLngsIHAxLnkgLSBwMi55KVxuICAgIGlmIChkID49IHRyaWdnZXIpIHJldHVybiBmYWxzZVxuXG4gICAgY29uc3QgciA9IChkaXN0YW5jZSAtIGQpIC8gMiAvLyBkaXN0YW5jZSB0aGV5IG5lZWQgbW92aW5nXG4gICAgcDEubW92ZVRvd2FyZChwMiwgLXIpXG4gICAgcDIubW92ZVRvd2FyZChwMSwgLXIpXG4gICAgcmV0dXJuIHRydWVcbiAgfVxufVxuIiwiaW1wb3J0IFF1ZXN0aW9uIGZyb20gJ1F1ZXN0aW9uL1F1ZXN0aW9uJ1xuaW1wb3J0IHsgY3JlYXRlRWxlbSB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuL1ZpZXdPcHRpb25zJ1xuZGVjbGFyZSBjb25zdCBrYXRleCA6IHtyZW5kZXIgOiAoc3RyaW5nOiBzdHJpbmcsIGVsZW1lbnQ6IEhUTUxFbGVtZW50KSA9PiB2b2lkfVxuXG4vKiBHcmFwaGljUURhdGEgY2FuIGFsbCBiZSB2ZXJ5IGRpZmZlcmVudCwgc28gaW50ZXJmYWNlIGlzIGVtcHR5XG4gKiBIZXJlIGZvciBjb2RlIGRvY3VtZW50YXRpb24gcmF0aGVyIHRoYW4gdHlwZSBzYWZldHkgKHdoaWNoIGlzbid0IHByb3ZpZGVkKSAqL1xuXG4vKiBlc2xpbnQtZGlzYWJsZSAqL1xuZXhwb3J0IGludGVyZmFjZSBHcmFwaGljUURhdGEge1xufVxuLyogZXNsaW50LWVuYWJsZSAqL1xuXG4vKiBOb3Qgd29ydGggdGhlIGhhc3NseSB0cnlpbmcgdG8gZ2V0IGludGVyZmFjZXMgZm9yIHN0YXRpYyBtZXRob2RzXG4gKlxuICogZXhwb3J0IGludGVyZmFjZSBHcmFwaGljUURhdGFDb25zdHJ1Y3RvciB7XG4gKiAgIG5ldyguLi5hcmdzIDogdW5rbm93bltdKTogR3JhcGhpY1FEYXRhXG4gKiAgIHJhbmRvbShvcHRpb25zOiB1bmtub3duKSA6IEdyYXBoaWNRRGF0YVxuICogfVxuKi9cblxuZXhwb3J0IGludGVyZmFjZSBMYWJlbCB7XG4gIHBvczogUG9pbnQsXG4gIHRleHRxOiBzdHJpbmcsXG4gIHRleHRhOiBzdHJpbmcsXG4gIHN0eWxlcTogc3RyaW5nLFxuICBzdHlsZWE6IHN0cmluZyxcbiAgdGV4dDogc3RyaW5nLFxuICBzdHlsZTogc3RyaW5nXG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBHcmFwaGljUVZpZXcge1xuICBET006IEhUTUxFbGVtZW50XG4gIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnRcbiAgd2lkdGg6IG51bWJlclxuICBoZWlnaHQ6IG51bWJlclxuICBkYXRhOiBHcmFwaGljUURhdGFcbiAgbGFiZWxzOiBMYWJlbFtdXG5cbiAgY29uc3RydWN0b3IgKGRhdGEgOiBHcmFwaGljUURhdGEsIHZpZXdPcHRpb25zIDogVmlld09wdGlvbnMpIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IFZpZXdPcHRpb25zID0ge1xuICAgICAgd2lkdGg6IDI1MCxcbiAgICAgIGhlaWdodDogMjUwXG4gICAgfVxuXG4gICAgdmlld09wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgdmlld09wdGlvbnMpXG5cbiAgICB0aGlzLndpZHRoID0gdmlld09wdGlvbnMud2lkdGhcbiAgICB0aGlzLmhlaWdodCA9IHZpZXdPcHRpb25zLmhlaWdodCAvLyBvbmx5IHRoaW5ncyBJIG5lZWQgZnJvbSB0aGUgb3B0aW9ucywgZ2VuZXJhbGx5P1xuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICAvLyB0aGlzLnJvdGF0aW9uP1xuXG4gICAgdGhpcy5sYWJlbHMgPSBbXSAvLyBsYWJlbHMgb24gZGlhZ3JhbVxuXG4gICAgLy8gRE9NIGVsZW1lbnRzXG4gICAgdGhpcy5ET00gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tZGl2JylcbiAgICB0aGlzLmNhbnZhcyA9IGNyZWF0ZUVsZW0oJ2NhbnZhcycsICdxdWVzdGlvbi1jYW52YXMnLCB0aGlzLkRPTSkgYXMgSFRNTENhbnZhc0VsZW1lbnRcbiAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMud2lkdGhcbiAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodFxuICB9XG5cbiAgZ2V0RE9NICgpIDogSFRNTEVsZW1lbnQge1xuICAgIHJldHVybiB0aGlzLkRPTVxuICB9XG5cbiAgYWJzdHJhY3QgcmVuZGVyICgpIDogdm9pZFxuXG4gIHJlbmRlckxhYmVscyAobnVkZ2U/IDogYm9vbGVhbikgOiB2b2lkIHtcbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLkRPTVxuXG4gICAgLy8gcmVtb3ZlIGFueSBleGlzdGluZyBsYWJlbHNcbiAgICBjb25zdCBvbGRMYWJlbHMgPSBjb250YWluZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnbGFiZWwnKVxuICAgIHdoaWxlIChvbGRMYWJlbHMubGVuZ3RoID4gMCkge1xuICAgICAgb2xkTGFiZWxzWzBdLnJlbW92ZSgpXG4gICAgfVxuXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICAgIGNvbnN0IGlubmVybGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgICAgbGFiZWwuY2xhc3NMaXN0LmFkZCgnbGFiZWwnKVxuICAgICAgbGFiZWwuY2xhc3NOYW1lICs9ICcgJyArIGwuc3R5bGUgLy8gdXNpbmcgY2xhc3NOYW1lIG92ZXIgY2xhc3NMaXN0IHNpbmNlIGwuc3R5bGUgaXMgc3BhY2UtZGVsaW1pdGVkIGxpc3Qgb2YgY2xhc3Nlc1xuICAgICAgbGFiZWwuc3R5bGUubGVmdCA9IGwucG9zLnggKyAncHgnXG4gICAgICBsYWJlbC5zdHlsZS50b3AgPSBsLnBvcy55ICsgJ3B4J1xuXG4gICAgICBrYXRleC5yZW5kZXIobC50ZXh0LCBpbm5lcmxhYmVsKVxuICAgICAgbGFiZWwuYXBwZW5kQ2hpbGQoaW5uZXJsYWJlbClcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChsYWJlbClcblxuICAgICAgLy8gcmVtb3ZlIHNwYWNlIGlmIHRoZSBpbm5lciBsYWJlbCBpcyB0b28gYmlnXG4gICAgICBpZiAoaW5uZXJsYWJlbC5vZmZzZXRXaWR0aCAvIGlubmVybGFiZWwub2Zmc2V0SGVpZ2h0ID4gMikge1xuICAgICAgICBjb25zb2xlLmxvZyhgcmVtb3ZlZCBzcGFjZSBpbiAke2wudGV4dH1gKVxuICAgICAgICBjb25zdCBuZXdsYWJlbHRleHQgPSBsLnRleHQucmVwbGFjZSgvXFwrLywgJ1xcXFwhK1xcXFwhJykucmVwbGFjZSgvLS8sICdcXFxcIS1cXFxcIScpXG4gICAgICAgIGthdGV4LnJlbmRlcihuZXdsYWJlbHRleHQsIGlubmVybGFiZWwpXG4gICAgICB9XG5cbiAgICAgIC8vIEkgZG9uJ3QgdW5kZXJzdGFuZCB0aGlzIGFkanVzdG1lbnQuIEkgdGhpbmsgaXQgbWlnaHQgYmUgbmVlZGVkIGluIGFyaXRobWFnb25zLCBidXQgaXQgbWFrZXNcbiAgICAgIC8vIG90aGVycyBnbyBmdW5ueS5cblxuICAgICAgaWYgKG51ZGdlKSB7XG4gICAgICAgIGNvbnN0IGx3aWR0aCA9IGxhYmVsLm9mZnNldFdpZHRoXG4gICAgICAgIGlmIChsLnBvcy54IDwgdGhpcy5jYW52YXMud2lkdGggLyAyIC0gNSAmJiBsLnBvcy54ICsgbHdpZHRoIC8gMiA+IHRoaXMuY2FudmFzLndpZHRoIC8gMikge1xuICAgICAgICAgIGxhYmVsLnN0eWxlLmxlZnQgPSAodGhpcy5jYW52YXMud2lkdGggLyAyIC0gbHdpZHRoIC0gMykgKyAncHgnXG4gICAgICAgICAgY29uc29sZS5sb2coYG51ZGdlZCAnJHtsLnRleHR9J2ApXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGwucG9zLnggPiB0aGlzLmNhbnZhcy53aWR0aCAvIDIgKyA1ICYmIGwucG9zLnggLSBsd2lkdGggLyAyIDwgdGhpcy5jYW52YXMud2lkdGggLyAyKSB7XG4gICAgICAgICAgbGFiZWwuc3R5bGUubGVmdCA9ICh0aGlzLmNhbnZhcy53aWR0aCAvIDIgKyAzKSArICdweCdcbiAgICAgICAgICBjb25zb2xlLmxvZyhgbnVkZ2VkICcke2wudGV4dH0nYClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBzaG93QW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dGFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlYVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoZmFsc2UpXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoZmFsc2UpXG4gIH1cblxuICAvLyBQb2ludCB0cmFuZm9ybWF0aW9ucyBvZiBhbGwgcG9pbnRzXG5cbiAgZ2V0IGFsbHBvaW50cyAoKSA6IFBvaW50W10ge1xuICAgIHJldHVybiBbXVxuICB9XG5cbiAgc2NhbGUgKHNmIDogbnVtYmVyKSA6IHZvaWQge1xuICAgIHRoaXMuYWxscG9pbnRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHAuc2NhbGUoc2YpXG4gICAgfSlcbiAgfVxuXG4gIHJvdGF0ZSAoYW5nbGUgOiBudW1iZXIpIDogbnVtYmVyIHtcbiAgICB0aGlzLmFsbHBvaW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICBwLnJvdGF0ZShhbmdsZSlcbiAgICB9KVxuICAgIHJldHVybiBhbmdsZVxuICB9XG5cbiAgdHJhbnNsYXRlICh4IDogbnVtYmVyLCB5IDogbnVtYmVyKSA6IHZvaWQge1xuICAgIHRoaXMuYWxscG9pbnRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHAudHJhbnNsYXRlKHgsIHkpXG4gICAgfSlcbiAgfVxuXG4gIHJhbmRvbVJvdGF0ZSAoKSA6IG51bWJlciB7XG4gICAgY29uc3QgYW5nbGUgPSAyICogTWF0aC5QSSAqIE1hdGgucmFuZG9tKClcbiAgICB0aGlzLnJvdGF0ZShhbmdsZSlcbiAgICByZXR1cm4gYW5nbGVcbiAgfVxuXG4gIC8qKlxuICAgKiBTY2FsZXMgYWxsIHRoZSBwb2ludHMgdG8gd2l0aGluIGEgZ2l2ZW4gd2lkdGggYW5kIGhlaWdodCwgY2VudGVyaW5nIHRoZSByZXN1bHQuIFJldHVybnMgdGhlIHNjYWxlIGZhY3RvclxuICAgKiBAcGFyYW0gd2lkdGggVGhlIHdpZHRoIG9mIHRoZSBib3VuZGluZyByZWN0YW5nbGUgdG8gc2NhbGUgdG9cbiAgICogQHBhcmFtIGhlaWdodCBUaGUgaGVpZ2h0IG9mIHRoZSBib3VuZGluZyByZWN0YW5nbGUgdG8gc2NhbGUgdG9cbiAgICogQHBhcmFtIG1hcmdpbiBNYXJnaW4gdG8gbGVhdmUgb3V0c2lkZSB0aGUgcmVjdGFuZ2xlXG4gICAqIEByZXR1cm5zXG4gICAqL1xuICBzY2FsZVRvRml0ICh3aWR0aCA6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIG1hcmdpbiA6IG51bWJlcikgOiBudW1iZXIge1xuICAgIGxldCB0b3BMZWZ0IDogUG9pbnQgPSBQb2ludC5taW4odGhpcy5hbGxwb2ludHMpXG4gICAgbGV0IGJvdHRvbVJpZ2h0IDogUG9pbnQgPSBQb2ludC5tYXgodGhpcy5hbGxwb2ludHMpXG4gICAgY29uc3QgdG90YWxXaWR0aCA6IG51bWJlciA9IGJvdHRvbVJpZ2h0LnggLSB0b3BMZWZ0LnhcbiAgICBjb25zdCB0b3RhbEhlaWdodCA6IG51bWJlciA9IGJvdHRvbVJpZ2h0LnkgLSB0b3BMZWZ0LnlcbiAgICBjb25zdCBzZiA9IE1hdGgubWluKCh3aWR0aCAtIG1hcmdpbikgLyB0b3RhbFdpZHRoLCAoaGVpZ2h0IC0gbWFyZ2luKSAvIHRvdGFsSGVpZ2h0KVxuICAgIHRoaXMuc2NhbGUoc2YpXG5cbiAgICAvLyBjZW50cmVcbiAgICB0b3BMZWZ0ID0gUG9pbnQubWluKHRoaXMuYWxscG9pbnRzKVxuICAgIGJvdHRvbVJpZ2h0ID0gUG9pbnQubWF4KHRoaXMuYWxscG9pbnRzKVxuICAgIGNvbnN0IGNlbnRlciA9IFBvaW50Lm1lYW4odG9wTGVmdCwgYm90dG9tUmlnaHQpXG4gICAgdGhpcy50cmFuc2xhdGUod2lkdGggLyAyIC0gY2VudGVyLngsIGhlaWdodCAvIDIgLSBjZW50ZXIueSkgLy8gY2VudHJlXG5cbiAgICByZXR1cm4gc2ZcbiAgfVxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgR3JhcGhpY1EgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIGRhdGE6IEdyYXBoaWNRRGF0YVxuICB2aWV3OiBHcmFwaGljUVZpZXdcblxuICBjb25zdHJ1Y3RvciAoKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgc3VwZXIoKSAvLyB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgICBkZWxldGUgKHRoaXMuRE9NKSAvLyBnb2luZyB0byBvdmVycmlkZSBnZXRET00gdXNpbmcgdGhlIHZpZXcncyBET01cblxuICAgIC8qIFRoZXNlIGFyZSBndWFyYW50ZWVkIHRvIGJlIG92ZXJyaWRkZW4sIHNvIG5vIHBvaW50IGluaXRpYWxpemluZyBoZXJlXG4gICAgICpcbiAgICAgKiAgdGhpcy5kYXRhID0gbmV3IEdyYXBoaWNRRGF0YShvcHRpb25zKVxuICAgICAqICB0aGlzLnZpZXcgPSBuZXcgR3JhcGhpY1FWaWV3KHRoaXMuZGF0YSwgb3B0aW9ucylcbiAgICAgKlxuICAgICAqL1xuICB9XG5cbiAgLyogTmVlZCB0byByZWZhY3RvciBzdWJjbGFzc2VzIHRvIGRvIHRoaXM6XG4gICAqIGNvbnN0cnVjdG9yIChkYXRhLCB2aWV3KSB7XG4gICAqICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICogICAgdGhpcy52aWV3ID0gdmlld1xuICAgKiB9XG4gICAqXG4gICAqIHN0YXRpYyByYW5kb20ob3B0aW9ucykge1xuICAgKiAgLy8gYW4gYXR0ZW1wdCBhdCBoYXZpbmcgYWJzdHJhY3Qgc3RhdGljIG1ldGhvZHMsIGFsYmVpdCBydW50aW1lIGVycm9yXG4gICAqICB0aHJvdyBuZXcgRXJyb3IoXCJgcmFuZG9tKClgIG11c3QgYmUgb3ZlcnJpZGRlbiBpbiBzdWJjbGFzcyBcIiArIHRoaXMubmFtZSlcbiAgICogfVxuICAgKlxuICAgKiB0eXBpY2FsIGltcGxlbWVudGF0aW9uOlxuICAgKiBzdGF0aWMgcmFuZG9tKG9wdGlvbnMpIHtcbiAgICogIGNvbnN0IGRhdGEgPSBuZXcgRGVyaXZlZFFEYXRhKG9wdGlvbnMpXG4gICAqICBjb25zdCB2aWV3ID0gbmV3IERlcml2ZWRRVmlldyhvcHRpb25zKVxuICAgKiAgcmV0dXJuIG5ldyBEZXJpdmVkUURhdGEoZGF0YSx2aWV3KVxuICAgKiB9XG4gICAqXG4gICAqL1xuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHsgcmV0dXJuIHRoaXMudmlldy5nZXRET00oKSB9XG5cbiAgcmVuZGVyICgpIDogdm9pZCB7IHRoaXMudmlldy5yZW5kZXIoKSB9XG5cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQge1xuICAgIHN1cGVyLnNob3dBbnN3ZXIoKVxuICAgIHRoaXMudmlldy5zaG93QW5zd2VyKClcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICBzdXBlci5oaWRlQW5zd2VyKClcbiAgICB0aGlzLnZpZXcuaGlkZUFuc3dlcigpXG4gIH1cbn1cbiIsImltcG9ydCAqIGFzIGNvbW1vbmpzSGVscGVycyBmcm9tICdcdTAwMDBjb21tb25qc0hlbHBlcnMuanMnXG5cbnZhciBmcmFjdGlvbiA9IGNvbW1vbmpzSGVscGVycy5jcmVhdGVDb21tb25qc01vZHVsZShmdW5jdGlvbiAobW9kdWxlLCBleHBvcnRzKSB7XG4vKipcbiAqIEBsaWNlbnNlIEZyYWN0aW9uLmpzIHY0LjAuOSAwOS8wOS8yMDE1XG4gKiBodHRwOi8vd3d3Lnhhcmcub3JnLzIwMTQvMDMvcmF0aW9uYWwtbnVtYmVycy1pbi1qYXZhc2NyaXB0L1xuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSwgUm9iZXJ0IEVpc2VsZSAocm9iZXJ0QHhhcmcub3JnKVxuICogRHVhbCBsaWNlbnNlZCB1bmRlciB0aGUgTUlUIG9yIEdQTCBWZXJzaW9uIDIgbGljZW5zZXMuXG4gKiovXG5cbiAgLyoqXG4gKlxuICogVGhpcyBjbGFzcyBvZmZlcnMgdGhlIHBvc3NpYmlsaXR5IHRvIGNhbGN1bGF0ZSBmcmFjdGlvbnMuXG4gKiBZb3UgY2FuIHBhc3MgYSBmcmFjdGlvbiBpbiBkaWZmZXJlbnQgZm9ybWF0cy4gRWl0aGVyIGFzIGFycmF5LCBhcyBkb3VibGUsIGFzIHN0cmluZyBvciBhcyBhbiBpbnRlZ2VyLlxuICpcbiAqIEFycmF5L09iamVjdCBmb3JtXG4gKiBbIDAgPT4gPG5vbWluYXRvcj4sIDEgPT4gPGRlbm9taW5hdG9yPiBdXG4gKiBbIG4gPT4gPG5vbWluYXRvcj4sIGQgPT4gPGRlbm9taW5hdG9yPiBdXG4gKlxuICogSW50ZWdlciBmb3JtXG4gKiAtIFNpbmdsZSBpbnRlZ2VyIHZhbHVlXG4gKlxuICogRG91YmxlIGZvcm1cbiAqIC0gU2luZ2xlIGRvdWJsZSB2YWx1ZVxuICpcbiAqIFN0cmluZyBmb3JtXG4gKiAxMjMuNDU2IC0gYSBzaW1wbGUgZG91YmxlXG4gKiAxMjMvNDU2IC0gYSBzdHJpbmcgZnJhY3Rpb25cbiAqIDEyMy4nNDU2JyAtIGEgZG91YmxlIHdpdGggcmVwZWF0aW5nIGRlY2ltYWwgcGxhY2VzXG4gKiAxMjMuKDQ1NikgLSBzeW5vbnltXG4gKiAxMjMuNDUnNicgLSBhIGRvdWJsZSB3aXRoIHJlcGVhdGluZyBsYXN0IHBsYWNlXG4gKiAxMjMuNDUoNikgLSBzeW5vbnltXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiB2YXIgZiA9IG5ldyBGcmFjdGlvbihcIjkuNCczMSdcIik7XG4gKiBmLm11bChbLTQsIDNdKS5kaXYoNC45KTtcbiAqXG4gKi9cblxuICAoZnVuY3Rpb24gKHJvb3QpIHtcbiAgICAndXNlIHN0cmljdCdcblxuICAgIC8vIE1heGltdW0gc2VhcmNoIGRlcHRoIGZvciBjeWNsaWMgcmF0aW9uYWwgbnVtYmVycy4gMjAwMCBzaG91bGQgYmUgbW9yZSB0aGFuIGVub3VnaC5cbiAgICAvLyBFeGFtcGxlOiAxLzcgPSAwLigxNDI4NTcpIGhhcyA2IHJlcGVhdGluZyBkZWNpbWFsIHBsYWNlcy5cbiAgICAvLyBJZiBNQVhfQ1lDTEVfTEVOIGdldHMgcmVkdWNlZCwgbG9uZyBjeWNsZXMgd2lsbCBub3QgYmUgZGV0ZWN0ZWQgYW5kIHRvU3RyaW5nKCkgb25seSBnZXRzIHRoZSBmaXJzdCAxMCBkaWdpdHNcbiAgICB2YXIgTUFYX0NZQ0xFX0xFTiA9IDIwMDBcblxuICAgIC8vIFBhcnNlZCBkYXRhIHRvIGF2b2lkIGNhbGxpbmcgXCJuZXdcIiBhbGwgdGhlIHRpbWVcbiAgICB2YXIgUCA9IHtcbiAgICAgIHM6IDEsXG4gICAgICBuOiAwLFxuICAgICAgZDogMVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUVycm9yIChuYW1lKSB7XG4gICAgICBmdW5jdGlvbiBlcnJvckNvbnN0cnVjdG9yICgpIHtcbiAgICAgICAgdmFyIHRlbXAgPSBFcnJvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgICAgIHRlbXAubmFtZSA9IHRoaXMubmFtZSA9IG5hbWVcbiAgICAgICAgdGhpcy5zdGFjayA9IHRlbXAuc3RhY2tcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gdGVtcC5tZXNzYWdlXG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAqIEVycm9yIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICAgIGZ1bmN0aW9uIEludGVybWVkaWF0ZUluaGVyaXRvciAoKSB7fVxuICAgICAgSW50ZXJtZWRpYXRlSW5oZXJpdG9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZVxuICAgICAgZXJyb3JDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBuZXcgSW50ZXJtZWRpYXRlSW5oZXJpdG9yKClcblxuICAgICAgcmV0dXJuIGVycm9yQ29uc3RydWN0b3JcbiAgICB9XG5cbiAgICB2YXIgRGl2aXNpb25CeVplcm8gPSBGcmFjdGlvbi5EaXZpc2lvbkJ5WmVybyA9IGNyZWF0ZUVycm9yKCdEaXZpc2lvbkJ5WmVybycpXG4gICAgdmFyIEludmFsaWRQYXJhbWV0ZXIgPSBGcmFjdGlvbi5JbnZhbGlkUGFyYW1ldGVyID0gY3JlYXRlRXJyb3IoJ0ludmFsaWRQYXJhbWV0ZXInKVxuXG4gICAgZnVuY3Rpb24gYXNzaWduIChuLCBzKSB7XG4gICAgICBpZiAoaXNOYU4obiA9IHBhcnNlSW50KG4sIDEwKSkpIHtcbiAgICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKVxuICAgICAgfVxuICAgICAgcmV0dXJuIG4gKiBzXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdGhyb3dJbnZhbGlkUGFyYW0gKCkge1xuICAgICAgdGhyb3cgbmV3IEludmFsaWRQYXJhbWV0ZXIoKVxuICAgIH1cblxuICAgIHZhciBwYXJzZSA9IGZ1bmN0aW9uIChwMSwgcDIpIHtcbiAgICAgIHZhciBuID0gMDsgdmFyIGQgPSAxOyB2YXIgcyA9IDFcbiAgICAgIHZhciB2ID0gMDsgdmFyIHcgPSAwOyB2YXIgeCA9IDA7IHZhciB5ID0gMTsgdmFyIHogPSAxXG5cbiAgICAgIHZhciBBID0gMDsgdmFyIEIgPSAxXG4gICAgICB2YXIgQyA9IDE7IHZhciBEID0gMVxuXG4gICAgICB2YXIgTiA9IDEwMDAwMDAwXG4gICAgICB2YXIgTVxuXG4gICAgICBpZiAocDEgPT09IHVuZGVmaW5lZCB8fCBwMSA9PT0gbnVsbCkge1xuICAgICAgLyogdm9pZCAqL1xuICAgICAgfSBlbHNlIGlmIChwMiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG4gPSBwMVxuICAgICAgICBkID0gcDJcbiAgICAgICAgcyA9IG4gKiBkXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzd2l0Y2ggKHR5cGVvZiBwMSkge1xuICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAge1xuICAgICAgICAgICAgaWYgKCdkJyBpbiBwMSAmJiAnbicgaW4gcDEpIHtcbiAgICAgICAgICAgICAgbiA9IHAxLm5cbiAgICAgICAgICAgICAgZCA9IHAxLmRcbiAgICAgICAgICAgICAgaWYgKCdzJyBpbiBwMSkgeyBuICo9IHAxLnMgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICgwIGluIHAxKSB7XG4gICAgICAgICAgICAgIG4gPSBwMVswXVxuICAgICAgICAgICAgICBpZiAoMSBpbiBwMSkgeyBkID0gcDFbMV0gfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcyA9IG4gKiBkXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlmIChwMSA8IDApIHtcbiAgICAgICAgICAgICAgcyA9IHAxXG4gICAgICAgICAgICAgIHAxID0gLXAxXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwMSAlIDEgPT09IDApIHtcbiAgICAgICAgICAgICAgbiA9IHAxXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHAxID4gMCkgeyAvLyBjaGVjayBmb3IgIT0gMCwgc2NhbGUgd291bGQgYmVjb21lIE5hTiAobG9nKDApKSwgd2hpY2ggY29udmVyZ2VzIHJlYWxseSBzbG93XG4gICAgICAgICAgICAgIGlmIChwMSA+PSAxKSB7XG4gICAgICAgICAgICAgICAgeiA9IE1hdGgucG93KDEwLCBNYXRoLmZsb29yKDEgKyBNYXRoLmxvZyhwMSkgLyBNYXRoLkxOMTApKVxuICAgICAgICAgICAgICAgIHAxIC89IHpcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIFVzaW5nIEZhcmV5IFNlcXVlbmNlc1xuICAgICAgICAgICAgICAvLyBodHRwOi8vd3d3LmpvaG5kY29vay5jb20vYmxvZy8yMDEwLzEwLzIwL2Jlc3QtcmF0aW9uYWwtYXBwcm94aW1hdGlvbi9cblxuICAgICAgICAgICAgICB3aGlsZSAoQiA8PSBOICYmIEQgPD0gTikge1xuICAgICAgICAgICAgICAgIE0gPSAoQSArIEMpIC8gKEIgKyBEKVxuXG4gICAgICAgICAgICAgICAgaWYgKHAxID09PSBNKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoQiArIEQgPD0gTikge1xuICAgICAgICAgICAgICAgICAgICBuID0gQSArIENcbiAgICAgICAgICAgICAgICAgICAgZCA9IEIgKyBEXG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKEQgPiBCKSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBDXG4gICAgICAgICAgICAgICAgICAgIGQgPSBEXG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBuID0gQVxuICAgICAgICAgICAgICAgICAgICBkID0gQlxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgaWYgKHAxID4gTSkge1xuICAgICAgICAgICAgICAgICAgICBBICs9IENcbiAgICAgICAgICAgICAgICAgICAgQiArPSBEXG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBDICs9IEFcbiAgICAgICAgICAgICAgICAgICAgRCArPSBCXG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGlmIChCID4gTikge1xuICAgICAgICAgICAgICAgICAgICBuID0gQ1xuICAgICAgICAgICAgICAgICAgICBkID0gRFxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IEFcbiAgICAgICAgICAgICAgICAgICAgZCA9IEJcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbiAqPSB6XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzTmFOKHAxKSB8fCBpc05hTihwMikpIHtcbiAgICAgICAgICAgICAgZCA9IG4gPSBOYU5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAge1xuICAgICAgICAgICAgQiA9IHAxLm1hdGNoKC9cXGQrfC4vZylcblxuICAgICAgICAgICAgaWYgKEIgPT09IG51bGwpIHsgdGhyb3dJbnZhbGlkUGFyYW0oKSB9XG5cbiAgICAgICAgICAgIGlmIChCW0FdID09PSAnLScpIHsgLy8gQ2hlY2sgZm9yIG1pbnVzIHNpZ24gYXQgdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgICBzID0gLTFcbiAgICAgICAgICAgICAgQSsrXG4gICAgICAgICAgICB9IGVsc2UgaWYgKEJbQV0gPT09ICcrJykgeyAvLyBDaGVjayBmb3IgcGx1cyBzaWduIGF0IHRoZSBiZWdpbm5pbmdcbiAgICAgICAgICAgICAgQSsrXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChCLmxlbmd0aCA9PT0gQSArIDEpIHsgLy8gQ2hlY2sgaWYgaXQncyBqdXN0IGEgc2ltcGxlIG51bWJlciBcIjEyMzRcIlxuICAgICAgICAgICAgICB3ID0gYXNzaWduKEJbQSsrXSwgcylcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQltBICsgMV0gPT09ICcuJyB8fCBCW0FdID09PSAnLicpIHsgLy8gQ2hlY2sgaWYgaXQncyBhIGRlY2ltYWwgbnVtYmVyXG4gICAgICAgICAgICAgIGlmIChCW0FdICE9PSAnLicpIHsgLy8gSGFuZGxlIDAuNSBhbmQgLjVcbiAgICAgICAgICAgICAgICB2ID0gYXNzaWduKEJbQSsrXSwgcylcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBBKytcblxuICAgICAgICAgICAgICAvLyBDaGVjayBmb3IgZGVjaW1hbCBwbGFjZXNcbiAgICAgICAgICAgICAgaWYgKEEgKyAxID09PSBCLmxlbmd0aCB8fCBCW0EgKyAxXSA9PT0gJygnICYmIEJbQSArIDNdID09PSAnKScgfHwgQltBICsgMV0gPT09IFwiJ1wiICYmIEJbQSArIDNdID09PSBcIidcIikge1xuICAgICAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBXSwgcylcbiAgICAgICAgICAgICAgICB5ID0gTWF0aC5wb3coMTAsIEJbQV0ubGVuZ3RoKVxuICAgICAgICAgICAgICAgIEErK1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHJlcGVhdGluZyBwbGFjZXNcbiAgICAgICAgICAgICAgaWYgKEJbQV0gPT09ICcoJyAmJiBCW0EgKyAyXSA9PT0gJyknIHx8IEJbQV0gPT09IFwiJ1wiICYmIEJbQSArIDJdID09PSBcIidcIikge1xuICAgICAgICAgICAgICAgIHggPSBhc3NpZ24oQltBICsgMV0sIHMpXG4gICAgICAgICAgICAgICAgeiA9IE1hdGgucG93KDEwLCBCW0EgKyAxXS5sZW5ndGgpIC0gMVxuICAgICAgICAgICAgICAgIEEgKz0gM1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKEJbQSArIDFdID09PSAnLycgfHwgQltBICsgMV0gPT09ICc6JykgeyAvLyBDaGVjayBmb3IgYSBzaW1wbGUgZnJhY3Rpb24gXCIxMjMvNDU2XCIgb3IgXCIxMjM6NDU2XCJcbiAgICAgICAgICAgICAgdyA9IGFzc2lnbihCW0FdLCBzKVxuICAgICAgICAgICAgICB5ID0gYXNzaWduKEJbQSArIDJdLCAxKVxuICAgICAgICAgICAgICBBICs9IDNcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQltBICsgM10gPT09ICcvJyAmJiBCW0EgKyAxXSA9PT0gJyAnKSB7IC8vIENoZWNrIGZvciBhIGNvbXBsZXggZnJhY3Rpb24gXCIxMjMgMS8yXCJcbiAgICAgICAgICAgICAgdiA9IGFzc2lnbihCW0FdLCBzKVxuICAgICAgICAgICAgICB3ID0gYXNzaWduKEJbQSArIDJdLCBzKVxuICAgICAgICAgICAgICB5ID0gYXNzaWduKEJbQSArIDRdLCAxKVxuICAgICAgICAgICAgICBBICs9IDVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKEIubGVuZ3RoIDw9IEEpIHsgLy8gQ2hlY2sgZm9yIG1vcmUgdG9rZW5zIG9uIHRoZSBzdGFja1xuICAgICAgICAgICAgICBkID0geSAqIHpcbiAgICAgICAgICAgICAgcyA9IC8qIHZvaWQgKi9cbiAgICAgICAgICAgICAgICAgICAgbiA9IHggKyBkICogdiArIHogKiB3XG4gICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAvKiBGYWxsIHRocm91Z2ggb24gZXJyb3IgKi9cbiAgICAgICAgICB9XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93SW52YWxpZFBhcmFtKClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRGl2aXNpb25CeVplcm8oKVxuICAgICAgfVxuXG4gICAgICBQLnMgPSBzIDwgMCA/IC0xIDogMVxuICAgICAgUC5uID0gTWF0aC5hYnMobilcbiAgICAgIFAuZCA9IE1hdGguYWJzKGQpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW9kcG93IChiLCBlLCBtKSB7XG4gICAgICB2YXIgciA9IDFcbiAgICAgIGZvciAoOyBlID4gMDsgYiA9IChiICogYikgJSBtLCBlID4+PSAxKSB7XG4gICAgICAgIGlmIChlICYgMSkge1xuICAgICAgICAgIHIgPSAociAqIGIpICUgbVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gclxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGN5Y2xlTGVuIChuLCBkKSB7XG4gICAgICBmb3IgKDsgZCAlIDIgPT09IDA7XG4gICAgICAgIGQgLz0gMikge1xuICAgICAgfVxuXG4gICAgICBmb3IgKDsgZCAlIDUgPT09IDA7XG4gICAgICAgIGQgLz0gNSkge1xuICAgICAgfVxuXG4gICAgICBpZiAoZCA9PT0gMSkgLy8gQ2F0Y2ggbm9uLWN5Y2xpYyBudW1iZXJzXG4gICAgICB7IHJldHVybiAwIH1cblxuICAgICAgLy8gSWYgd2Ugd291bGQgbGlrZSB0byBjb21wdXRlIHJlYWxseSBsYXJnZSBudW1iZXJzIHF1aWNrZXIsIHdlIGNvdWxkIG1ha2UgdXNlIG9mIEZlcm1hdCdzIGxpdHRsZSB0aGVvcmVtOlxuICAgICAgLy8gMTBeKGQtMSkgJSBkID09IDFcbiAgICAgIC8vIEhvd2V2ZXIsIHdlIGRvbid0IG5lZWQgc3VjaCBsYXJnZSBudW1iZXJzIGFuZCBNQVhfQ1lDTEVfTEVOIHNob3VsZCBiZSB0aGUgY2Fwc3RvbmUsXG4gICAgICAvLyBhcyB3ZSB3YW50IHRvIHRyYW5zbGF0ZSB0aGUgbnVtYmVycyB0byBzdHJpbmdzLlxuXG4gICAgICB2YXIgcmVtID0gMTAgJSBkXG4gICAgICB2YXIgdCA9IDFcblxuICAgICAgZm9yICg7IHJlbSAhPT0gMTsgdCsrKSB7XG4gICAgICAgIHJlbSA9IHJlbSAqIDEwICUgZFxuXG4gICAgICAgIGlmICh0ID4gTUFYX0NZQ0xFX0xFTikgeyByZXR1cm4gMCB9IC8vIFJldHVybmluZyAwIGhlcmUgbWVhbnMgdGhhdCB3ZSBkb24ndCBwcmludCBpdCBhcyBhIGN5Y2xpYyBudW1iZXIuIEl0J3MgbGlrZWx5IHRoYXQgdGhlIGFuc3dlciBpcyBgZC0xYFxuICAgICAgfVxuICAgICAgcmV0dXJuIHRcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjeWNsZVN0YXJ0IChuLCBkLCBsZW4pIHtcbiAgICAgIHZhciByZW0xID0gMVxuICAgICAgdmFyIHJlbTIgPSBtb2Rwb3coMTAsIGxlbiwgZClcblxuICAgICAgZm9yICh2YXIgdCA9IDA7IHQgPCAzMDA7IHQrKykgeyAvLyBzIDwgfmxvZzEwKE51bWJlci5NQVhfVkFMVUUpXG4gICAgICAvLyBTb2x2ZSAxMF5zID09IDEwXihzK3QpIChtb2QgZClcblxuICAgICAgICBpZiAocmVtMSA9PT0gcmVtMikgeyByZXR1cm4gdCB9XG5cbiAgICAgICAgcmVtMSA9IHJlbTEgKiAxMCAlIGRcbiAgICAgICAgcmVtMiA9IHJlbTIgKiAxMCAlIGRcbiAgICAgIH1cbiAgICAgIHJldHVybiAwXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2NkIChhLCBiKSB7XG4gICAgICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICAgICAgaWYgKCFiKSB7IHJldHVybiBhIH1cblxuICAgICAgd2hpbGUgKDEpIHtcbiAgICAgICAgYSAlPSBiXG4gICAgICAgIGlmICghYSkgeyByZXR1cm4gYiB9XG4gICAgICAgIGIgJT0gYVxuICAgICAgICBpZiAoIWIpIHsgcmV0dXJuIGEgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICogTW9kdWxlIGNvbnN0cnVjdG9yXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge251bWJlcnxGcmFjdGlvbj19IGFcbiAgICogQHBhcmFtIHtudW1iZXI9fSBiXG4gICAqL1xuICAgIGZ1bmN0aW9uIEZyYWN0aW9uIChhLCBiKSB7XG4gICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRnJhY3Rpb24pKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oYSwgYilcbiAgICAgIH1cblxuICAgICAgcGFyc2UoYSwgYilcblxuICAgICAgaWYgKEZyYWN0aW9uLlJFRFVDRSkge1xuICAgICAgICBhID0gZ2NkKFAuZCwgUC5uKSAvLyBBYnVzZSBhXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhID0gMVxuICAgICAgfVxuXG4gICAgICB0aGlzLnMgPSBQLnNcbiAgICAgIHRoaXMubiA9IFAubiAvIGFcbiAgICAgIHRoaXMuZCA9IFAuZCAvIGFcbiAgICB9XG5cbiAgICAvKipcbiAgICogQm9vbGVhbiBnbG9iYWwgdmFyaWFibGUgdG8gYmUgYWJsZSB0byBkaXNhYmxlIGF1dG9tYXRpYyByZWR1Y3Rpb24gb2YgdGhlIGZyYWN0aW9uXG4gICAqXG4gICAqL1xuICAgIEZyYWN0aW9uLlJFRFVDRSA9IDFcblxuICAgIEZyYWN0aW9uLnByb3RvdHlwZSA9IHtcblxuICAgICAgczogMSxcbiAgICAgIG46IDAsXG4gICAgICBkOiAxLFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBhYnNvbHV0ZSB2YWx1ZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigtNCkuYWJzKCkgPT4gNFxuICAgICAqKi9cbiAgICAgIGFiczogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMubiwgdGhpcy5kKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogSW52ZXJ0cyB0aGUgc2lnbiBvZiB0aGUgY3VycmVudCBmcmFjdGlvblxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigtNCkubmVnKCkgPT4gNFxuICAgICAqKi9cbiAgICAgIG5lZzogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKC10aGlzLnMgKiB0aGlzLm4sIHRoaXMuZClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIEFkZHMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oe246IDIsIGQ6IDN9KS5hZGQoXCIxNC45XCIpID0+IDQ2NyAvIDMwXG4gICAgICoqL1xuICAgICAgYWRkOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIHRoaXMubiAqIFAuZCArIFAucyAqIHRoaXMuZCAqIFAubixcbiAgICAgICAgICB0aGlzLmQgKiBQLmRcbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogU3VidHJhY3RzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKHtuOiAyLCBkOiAzfSkuYWRkKFwiMTQuOVwiKSA9PiAtNDI3IC8gMzBcbiAgICAgKiovXG4gICAgICBzdWI6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgdGhpcy5zICogdGhpcy5uICogUC5kIC0gUC5zICogdGhpcy5kICogUC5uLFxuICAgICAgICAgIHRoaXMuZCAqIFAuZFxuICAgICAgICApXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBNdWx0aXBsaWVzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiLTE3LigzNDUpXCIpLm11bCgzKSA9PiA1Nzc2IC8gMTExXG4gICAgICoqL1xuICAgICAgbXVsOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIFAucyAqIHRoaXMubiAqIFAubixcbiAgICAgICAgICB0aGlzLmQgKiBQLmRcbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogRGl2aWRlcyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIi0xNy4oMzQ1KVwiKS5pbnZlcnNlKCkuZGl2KDMpXG4gICAgICoqL1xuICAgICAgZGl2OiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIFAucyAqIHRoaXMubiAqIFAuZCxcbiAgICAgICAgICB0aGlzLmQgKiBQLm5cbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2xvbmVzIHRoZSBhY3R1YWwgb2JqZWN0XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiLTE3LigzNDUpXCIpLmNsb25lKClcbiAgICAgKiovXG4gICAgICBjbG9uZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBtb2R1bG8gb2YgdHdvIHJhdGlvbmFsIG51bWJlcnMgLSBhIG1vcmUgcHJlY2lzZSBmbW9kXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLm1vZChbNywgOF0pID0+ICgxMy8zKSAlICg3LzgpID0gKDUvNilcbiAgICAgKiovXG4gICAgICBtb2Q6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTilcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMucyAqIHRoaXMubiAlIHRoaXMuZCwgMSlcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIGlmIChQLm4gPT09IDAgJiYgdGhpcy5kID09PSAwKSB7XG4gICAgICAgICAgRnJhY3Rpb24oMCwgMCkgLy8gVGhyb3cgRGl2aXNpb25CeVplcm9cbiAgICAgICAgfVxuXG4gICAgICAgIC8qXG4gICAgICAgKiBGaXJzdCBzaWxseSBhdHRlbXB0LCBraW5kYSBzbG93XG4gICAgICAgKlxuICAgICAgIHJldHVybiB0aGF0W1wic3ViXCJdKHtcbiAgICAgICBcIm5cIjogbnVtW1wiblwiXSAqIE1hdGguZmxvb3IoKHRoaXMubiAvIHRoaXMuZCkgLyAobnVtLm4gLyBudW0uZCkpLFxuICAgICAgIFwiZFwiOiBudW1bXCJkXCJdLFxuICAgICAgIFwic1wiOiB0aGlzW1wic1wiXVxuICAgICAgIH0pOyAqL1xuXG4gICAgICAgIC8qXG4gICAgICAgKiBOZXcgYXR0ZW1wdDogYTEgLyBiMSA9IGEyIC8gYjIgKiBxICsgclxuICAgICAgICogPT4gYjIgKiBhMSA9IGEyICogYjEgKiBxICsgYjEgKiBiMiAqIHJcbiAgICAgICAqID0+IChiMiAqIGExICUgYTIgKiBiMSkgLyAoYjEgKiBiMilcbiAgICAgICAqL1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIChQLmQgKiB0aGlzLm4pICUgKFAubiAqIHRoaXMuZCksXG4gICAgICAgICAgUC5kICogdGhpcy5kXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZyYWN0aW9uYWwgZ2NkIG9mIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDUsOCkuZ2NkKDMsNykgPT4gMS81NlxuICAgICAqL1xuICAgICAgZ2NkOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuXG4gICAgICAgIC8vIGdjZChhIC8gYiwgYyAvIGQpID0gZ2NkKGEsIGMpIC8gbGNtKGIsIGQpXG5cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihnY2QoUC5uLCB0aGlzLm4pICogZ2NkKFAuZCwgdGhpcy5kKSwgUC5kICogdGhpcy5kKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZnJhY3Rpb25hbCBsY20gb2YgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oNSw4KS5sY20oMyw3KSA9PiAxNVxuICAgICAqL1xuICAgICAgbGNtOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuXG4gICAgICAgIC8vIGxjbShhIC8gYiwgYyAvIGQpID0gbGNtKGEsIGMpIC8gZ2NkKGIsIGQpXG5cbiAgICAgICAgaWYgKFAubiA9PT0gMCAmJiB0aGlzLm4gPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFAubiAqIHRoaXMubiwgZ2NkKFAubiwgdGhpcy5uKSAqIGdjZChQLmQsIHRoaXMuZCkpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBjZWlsIG9mIGEgcmF0aW9uYWwgbnVtYmVyXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLmNlaWwoKSA9PiAoNSAvIDEpXG4gICAgICoqL1xuICAgICAgY2VpbDogZnVuY3Rpb24gKHBsYWNlcykge1xuICAgICAgICBwbGFjZXMgPSBNYXRoLnBvdygxMCwgcGxhY2VzIHx8IDApXG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5jZWlsKHBsYWNlcyAqIHRoaXMucyAqIHRoaXMubiAvIHRoaXMuZCksIHBsYWNlcylcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZsb29yIG9mIGEgcmF0aW9uYWwgbnVtYmVyXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLmZsb29yKCkgPT4gKDQgLyAxKVxuICAgICAqKi9cbiAgICAgIGZsb29yOiBmdW5jdGlvbiAocGxhY2VzKSB7XG4gICAgICAgIHBsYWNlcyA9IE1hdGgucG93KDEwLCBwbGFjZXMgfHwgMClcblxuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLmZsb29yKHBsYWNlcyAqIHRoaXMucyAqIHRoaXMubiAvIHRoaXMuZCksIHBsYWNlcylcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJvdW5kcyBhIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykucm91bmQoKSA9PiAoNCAvIDEpXG4gICAgICoqL1xuICAgICAgcm91bmQ6IGZ1bmN0aW9uIChwbGFjZXMpIHtcbiAgICAgICAgcGxhY2VzID0gTWF0aC5wb3coMTAsIHBsYWNlcyB8fCAwKVxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGgucm91bmQocGxhY2VzICogdGhpcy5zICogdGhpcy5uIC8gdGhpcy5kKSwgcGxhY2VzKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogR2V0cyB0aGUgaW52ZXJzZSBvZiB0aGUgZnJhY3Rpb24sIG1lYW5zIG51bWVyYXRvciBhbmQgZGVudW1lcmF0b3IgYXJlIGV4Y2hhbmdlZFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihbLTMsIDRdKS5pbnZlcnNlKCkgPT4gLTQgLyAzXG4gICAgICoqL1xuICAgICAgaW52ZXJzZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMucyAqIHRoaXMuZCwgdGhpcy5uKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZnJhY3Rpb24gdG8gc29tZSBpbnRlZ2VyIGV4cG9uZW50XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKC0xLDIpLnBvdygtMykgPT4gLThcbiAgICAgKi9cbiAgICAgIHBvdzogZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgaWYgKG0gPCAwKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLnBvdyh0aGlzLnMgKiB0aGlzLmQsIC1tKSwgTWF0aC5wb3codGhpcy5uLCAtbSkpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLnBvdyh0aGlzLnMgKiB0aGlzLm4sIG0pLCBNYXRoLnBvdyh0aGlzLmQsIG0pKVxuICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0d28gcmF0aW9uYWwgbnVtYmVycyBhcmUgdGhlIHNhbWVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oMTkuNikuZXF1YWxzKFs5OCwgNV0pO1xuICAgICAqKi9cbiAgICAgIGVxdWFsczogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIHRoaXMucyAqIHRoaXMubiAqIFAuZCA9PT0gUC5zICogUC5uICogdGhpcy5kIC8vIFNhbWUgYXMgY29tcGFyZSgpID09PSAwXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0d28gcmF0aW9uYWwgbnVtYmVycyBhcmUgdGhlIHNhbWVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oMTkuNikuZXF1YWxzKFs5OCwgNV0pO1xuICAgICAqKi9cbiAgICAgIGNvbXBhcmU6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHZhciB0ID0gKHRoaXMucyAqIHRoaXMubiAqIFAuZCAtIFAucyAqIFAubiAqIHRoaXMuZClcbiAgICAgICAgcmV0dXJuICh0ID4gMCkgLSAodCA8IDApXG4gICAgICB9LFxuXG4gICAgICBzaW1wbGlmeTogZnVuY3Rpb24gKGVwcykge1xuICAgICAgLy8gRmlyc3QgbmFpdmUgaW1wbGVtZW50YXRpb24sIG5lZWRzIGltcHJvdmVtZW50XG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiB0aGlzXG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY29udCA9IHRoaXMuYWJzKCkudG9Db250aW51ZWQoKVxuXG4gICAgICAgIGVwcyA9IGVwcyB8fCAwLjAwMVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlYyAoYSkge1xuICAgICAgICAgIGlmIChhLmxlbmd0aCA9PT0gMSkgeyByZXR1cm4gbmV3IEZyYWN0aW9uKGFbMF0pIH1cbiAgICAgICAgICByZXR1cm4gcmVjKGEuc2xpY2UoMSkpLmludmVyc2UoKS5hZGQoYVswXSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29udC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHZhciB0bXAgPSByZWMoY29udC5zbGljZSgwLCBpICsgMSkpXG4gICAgICAgICAgaWYgKHRtcC5zdWIodGhpcy5hYnMoKSkuYWJzKCkudmFsdWVPZigpIDwgZXBzKSB7XG4gICAgICAgICAgICByZXR1cm4gdG1wLm11bCh0aGlzLnMpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0d28gcmF0aW9uYWwgbnVtYmVycyBhcmUgZGl2aXNpYmxlXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDE5LjYpLmRpdmlzaWJsZSgxLjUpO1xuICAgICAqL1xuICAgICAgZGl2aXNpYmxlOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gISghKFAubiAqIHRoaXMuZCkgfHwgKCh0aGlzLm4gKiBQLmQpICUgKFAubiAqIHRoaXMuZCkpKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogUmV0dXJucyBhIGRlY2ltYWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGZyYWN0aW9uXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiMTAwLic5MTgyMydcIikudmFsdWVPZigpID0+IDEwMC45MTgyMzkxODIzOTE4M1xuICAgICAqKi9cbiAgICAgIHZhbHVlT2Y6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucyAqIHRoaXMubiAvIHRoaXMuZFxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogUmV0dXJucyBhIHN0cmluZy1mcmFjdGlvbiByZXByZXNlbnRhdGlvbiBvZiBhIEZyYWN0aW9uIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEuJzMnXCIpLnRvRnJhY3Rpb24oKSA9PiBcIjQgMS8zXCJcbiAgICAgKiovXG4gICAgICB0b0ZyYWN0aW9uOiBmdW5jdGlvbiAoZXhjbHVkZVdob2xlKSB7XG4gICAgICAgIHZhciB3aG9sZTsgdmFyIHN0ciA9ICcnXG4gICAgICAgIHZhciBuID0gdGhpcy5uXG4gICAgICAgIHZhciBkID0gdGhpcy5kXG4gICAgICAgIGlmICh0aGlzLnMgPCAwKSB7XG4gICAgICAgICAgc3RyICs9ICctJ1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGQgPT09IDEpIHtcbiAgICAgICAgICBzdHIgKz0gblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChleGNsdWRlV2hvbGUgJiYgKHdob2xlID0gTWF0aC5mbG9vcihuIC8gZCkpID4gMCkge1xuICAgICAgICAgICAgc3RyICs9IHdob2xlXG4gICAgICAgICAgICBzdHIgKz0gJyAnXG4gICAgICAgICAgICBuICU9IGRcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzdHIgKz0gblxuICAgICAgICAgIHN0ciArPSAnLydcbiAgICAgICAgICBzdHIgKz0gZFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHJcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBsYXRleCByZXByZXNlbnRhdGlvbiBvZiBhIEZyYWN0aW9uIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEuJzMnXCIpLnRvTGF0ZXgoKSA9PiBcIlxcZnJhY3s0fXszfVwiXG4gICAgICoqL1xuICAgICAgdG9MYXRleDogZnVuY3Rpb24gKGV4Y2x1ZGVXaG9sZSkge1xuICAgICAgICB2YXIgd2hvbGU7IHZhciBzdHIgPSAnJ1xuICAgICAgICB2YXIgbiA9IHRoaXMublxuICAgICAgICB2YXIgZCA9IHRoaXMuZFxuICAgICAgICBpZiAodGhpcy5zIDwgMCkge1xuICAgICAgICAgIHN0ciArPSAnLSdcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkID09PSAxKSB7XG4gICAgICAgICAgc3RyICs9IG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZXhjbHVkZVdob2xlICYmICh3aG9sZSA9IE1hdGguZmxvb3IobiAvIGQpKSA+IDApIHtcbiAgICAgICAgICAgIHN0ciArPSB3aG9sZVxuICAgICAgICAgICAgbiAlPSBkXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc3RyICs9ICdcXFxcZnJhY3snXG4gICAgICAgICAgc3RyICs9IG5cbiAgICAgICAgICBzdHIgKz0gJ317J1xuICAgICAgICAgIHN0ciArPSBkXG4gICAgICAgICAgc3RyICs9ICd9J1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHJcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YgY29udGludWVkIGZyYWN0aW9uIGVsZW1lbnRzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiNy84XCIpLnRvQ29udGludWVkKCkgPT4gWzAsMSw3XVxuICAgICAqL1xuICAgICAgdG9Db250aW51ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRcbiAgICAgICAgdmFyIGEgPSB0aGlzLm5cbiAgICAgICAgdmFyIGIgPSB0aGlzLmRcbiAgICAgICAgdmFyIHJlcyA9IFtdXG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiByZXNcbiAgICAgICAgfVxuXG4gICAgICAgIGRvIHtcbiAgICAgICAgICByZXMucHVzaChNYXRoLmZsb29yKGEgLyBiKSlcbiAgICAgICAgICB0ID0gYSAlIGJcbiAgICAgICAgICBhID0gYlxuICAgICAgICAgIGIgPSB0XG4gICAgICAgIH0gd2hpbGUgKGEgIT09IDEpXG5cbiAgICAgICAgcmV0dXJuIHJlc1xuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhIGZyYWN0aW9uIHdpdGggYWxsIGRpZ2l0c1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEwMC4nOTE4MjMnXCIpLnRvU3RyaW5nKCkgPT4gXCIxMDAuKDkxODIzKVwiXG4gICAgICoqL1xuICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uIChkZWMpIHtcbiAgICAgICAgdmFyIGdcbiAgICAgICAgdmFyIE4gPSB0aGlzLm5cbiAgICAgICAgdmFyIEQgPSB0aGlzLmRcblxuICAgICAgICBpZiAoaXNOYU4oTikgfHwgaXNOYU4oRCkpIHtcbiAgICAgICAgICByZXR1cm4gJ05hTidcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghRnJhY3Rpb24uUkVEVUNFKSB7XG4gICAgICAgICAgZyA9IGdjZChOLCBEKVxuICAgICAgICAgIE4gLz0gZ1xuICAgICAgICAgIEQgLz0gZ1xuICAgICAgICB9XG5cbiAgICAgICAgZGVjID0gZGVjIHx8IDE1IC8vIDE1ID0gZGVjaW1hbCBwbGFjZXMgd2hlbiBubyByZXBpdGF0aW9uXG5cbiAgICAgICAgdmFyIGN5Y0xlbiA9IGN5Y2xlTGVuKE4sIEQpIC8vIEN5Y2xlIGxlbmd0aFxuICAgICAgICB2YXIgY3ljT2ZmID0gY3ljbGVTdGFydChOLCBELCBjeWNMZW4pIC8vIEN5Y2xlIHN0YXJ0XG5cbiAgICAgICAgdmFyIHN0ciA9IHRoaXMucyA9PT0gLTEgPyAnLScgOiAnJ1xuXG4gICAgICAgIHN0ciArPSBOIC8gRCB8IDBcblxuICAgICAgICBOICU9IERcbiAgICAgICAgTiAqPSAxMFxuXG4gICAgICAgIGlmIChOKSB7IHN0ciArPSAnLicgfVxuXG4gICAgICAgIGlmIChjeWNMZW4pIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gY3ljT2ZmOyBpLS07KSB7XG4gICAgICAgICAgICBzdHIgKz0gTiAvIEQgfCAwXG4gICAgICAgICAgICBOICU9IERcbiAgICAgICAgICAgIE4gKj0gMTBcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RyICs9ICcoJ1xuICAgICAgICAgIGZvciAodmFyIGkgPSBjeWNMZW47IGktLTspIHtcbiAgICAgICAgICAgIHN0ciArPSBOIC8gRCB8IDBcbiAgICAgICAgICAgIE4gJT0gRFxuICAgICAgICAgICAgTiAqPSAxMFxuICAgICAgICAgIH1cbiAgICAgICAgICBzdHIgKz0gJyknXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IGRlYzsgTiAmJiBpLS07KSB7XG4gICAgICAgICAgICBzdHIgKz0gTiAvIEQgfCAwXG4gICAgICAgICAgICBOICU9IERcbiAgICAgICAgICAgIE4gKj0gMTBcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0clxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdW5kZWZpbmVkID09PSAnZnVuY3Rpb24nICYmIHVuZGVmaW5lZC5hbWQpIHtcbiAgICAgIHVuZGVmaW5lZChbXSwgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gRnJhY3Rpb25cbiAgICAgIH0pXG4gICAgfSBlbHNlIGlmICgnb2JqZWN0JyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSlcbiAgICAgIEZyYWN0aW9uLmRlZmF1bHQgPSBGcmFjdGlvblxuICAgICAgRnJhY3Rpb24uRnJhY3Rpb24gPSBGcmFjdGlvblxuICAgICAgbW9kdWxlLmV4cG9ydHMgPSBGcmFjdGlvblxuICAgIH0gZWxzZSB7XG4gICAgICByb290LkZyYWN0aW9uID0gRnJhY3Rpb25cbiAgICB9XG4gIH0pKGNvbW1vbmpzSGVscGVycy5jb21tb25qc0dsb2JhbClcbn0pXG5cbmV4cG9ydCBkZWZhdWx0IC8qIEBfX1BVUkVfXyAqL2NvbW1vbmpzSGVscGVycy5nZXREZWZhdWx0RXhwb3J0RnJvbUNqcyhmcmFjdGlvbilcbmV4cG9ydCB7IGZyYWN0aW9uIGFzIF9fbW9kdWxlRXhwb3J0cyB9XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBNb25vbWlhbCB7XG4gIGNvbnN0cnVjdG9yIChjLCB2cykge1xuICAgIGlmICghaXNOYU4oYykgJiYgdnMgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgIHRoaXMuYyA9IGNcbiAgICAgIHRoaXMudnMgPSB2c1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGMgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmluaXRTdHIoYylcbiAgICB9IGVsc2UgaWYgKCFpc05hTihjKSkge1xuICAgICAgdGhpcy5jID0gY1xuICAgICAgdGhpcy52cyA9IG5ldyBNYXAoKVxuICAgIH0gZWxzZSB7IC8vIGRlZmF1bHQgYXMgYSB0ZXN0OiA0eF4yeVxuICAgICAgdGhpcy5jID0gNFxuICAgICAgdGhpcy52cyA9IG5ldyBNYXAoW1sneCcsIDJdLCBbJ3knLCAxXV0pXG4gICAgfVxuICB9XG5cbiAgY2xvbmUgKCkge1xuICAgIGNvbnN0IHZzID0gbmV3IE1hcCh0aGlzLnZzKVxuICAgIHJldHVybiBuZXcgTW9ub21pYWwodGhpcy5jLCB2cylcbiAgfVxuXG4gIG11bCAodGhhdCkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgTW9ub21pYWwodGhhdClcbiAgICB9XG4gICAgY29uc3QgYyA9IHRoaXMuYyAqIHRoYXQuY1xuICAgIGxldCB2cyA9IG5ldyBNYXAoKVxuICAgIHRoaXMudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAodGhhdC52cy5oYXModmFyaWFibGUpKSB7XG4gICAgICAgIHZzLnNldCh2YXJpYWJsZSwgdGhpcy52cy5nZXQodmFyaWFibGUpICsgdGhhdC52cy5nZXQodmFyaWFibGUpKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdnMuc2V0KHZhcmlhYmxlLCB0aGlzLnZzLmdldCh2YXJpYWJsZSkpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoYXQudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAoIXZzLmhhcyh2YXJpYWJsZSkpIHtcbiAgICAgICAgdnMuc2V0KHZhcmlhYmxlLCB0aGF0LnZzLmdldCh2YXJpYWJsZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICB2cyA9IG5ldyBNYXAoWy4uLnZzLmVudHJpZXMoKV0uc29ydCgpKVxuICAgIHJldHVybiBuZXcgTW9ub21pYWwoYywgdnMpXG4gIH1cblxuICB0b0xhdGV4ICgpIHtcbiAgICBpZiAodGhpcy52cy5zaXplID09PSAwKSByZXR1cm4gdGhpcy5jLnRvU3RyaW5nKClcbiAgICBsZXQgc3RyID0gdGhpcy5jID09PSAxID8gJydcbiAgICAgIDogdGhpcy5jID09PSAtMSA/ICctJ1xuICAgICAgICA6IHRoaXMuYy50b1N0cmluZygpXG4gICAgdGhpcy52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmIChpbmRleCA9PT0gMSkge1xuICAgICAgICBzdHIgKz0gdmFyaWFibGVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciArPSB2YXJpYWJsZSArICdeJyArIGluZGV4XG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gc3RyXG4gIH1cblxuICBzb3J0ICgpIHtcbiAgICAvLyBzb3J0cyAobW9kaWZpZXMgb2JqZWN0KVxuICAgIHRoaXMudnMgPSBuZXcgTWFwKFsuLi50aGlzLnZzLmVudHJpZXMoKV0uc29ydCgpKVxuICB9XG5cbiAgY2xlYW5aZXJvcyAoKSB7XG4gICAgdGhpcy52cy5mb3JFYWNoKChpZHgsIHYpID0+IHtcbiAgICAgIGlmIChpZHggPT09IDApIHRoaXMudnMuZGVsZXRlKHYpXG4gICAgfSlcbiAgfVxuXG4gIGxpa2UgKHRoYXQpIHtcbiAgICAvLyByZXR1cm4gdHJ1ZSBpZiBsaWtlIHRlcm1zLCBmYWxzZSBpZiBvdGhlcndpc2VcbiAgICAvLyBub3QgdGhlIG1vc3QgZWZmaWNpZW50IGF0IHRoZSBtb21lbnQsIGJ1dCBnb29kIGVub3VnaC5cbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IE1vbm9taWFsKHRoYXQpXG4gICAgfVxuXG4gICAgbGV0IGxpa2UgPSB0cnVlXG4gICAgdGhpcy52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICghdGhhdC52cy5oYXModmFyaWFibGUpIHx8IHRoYXQudnMuZ2V0KHZhcmlhYmxlKSAhPT0gaW5kZXgpIHtcbiAgICAgICAgbGlrZSA9IGZhbHNlXG4gICAgICB9XG4gICAgfSlcbiAgICB0aGF0LnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKCF0aGlzLnZzLmhhcyh2YXJpYWJsZSkgfHwgdGhpcy52cy5nZXQodmFyaWFibGUpICE9PSBpbmRleCkge1xuICAgICAgICBsaWtlID0gZmFsc2VcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBsaWtlXG4gIH1cblxuICBhZGQgKHRoYXQsIGNoZWNrTGlrZSkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgTW9ub21pYWwodGhhdClcbiAgICB9XG4gICAgLy8gYWRkcyB0d28gY29tcGF0aWJsZSBtb25vbWlhbHNcbiAgICAvLyBjaGVja0xpa2UgKGRlZmF1bHQgdHJ1ZSkgd2lsbCBjaGVjayBmaXJzdCBpZiB0aGV5IGFyZSBsaWtlIGFuZCB0aHJvdyBhbiBleGNlcHRpb25cbiAgICAvLyB1bmRlZmluZWQgYmVoYXZpb3VyIGlmIGNoZWNrTGlrZSBpcyBmYWxzZVxuICAgIGlmIChjaGVja0xpa2UgPT09IHVuZGVmaW5lZCkgY2hlY2tMaWtlID0gdHJ1ZVxuICAgIGlmIChjaGVja0xpa2UgJiYgIXRoaXMubGlrZSh0aGF0KSkgdGhyb3cgbmV3IEVycm9yKCdBZGRpbmcgdW5saWtlIHRlcm1zJylcbiAgICBjb25zdCBjID0gdGhpcy5jICsgdGhhdC5jXG4gICAgY29uc3QgdnMgPSB0aGlzLnZzXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbChjLCB2cylcbiAgfVxuXG4gIGluaXRTdHIgKHN0cikge1xuICAgIC8vIGN1cnJlbnRseSBubyBlcnJvciBjaGVja2luZyBhbmQgZnJhZ2lsZVxuICAgIC8vIFRoaW5ncyBub3QgdG8gcGFzcyBpbjpcbiAgICAvLyAgemVybyBpbmRpY2VzXG4gICAgLy8gIG11bHRpLWNoYXJhY3RlciB2YXJpYWJsZXNcbiAgICAvLyAgbmVnYXRpdmUgaW5kaWNlc1xuICAgIC8vICBub24taW50ZWdlciBjb2VmZmljaWVudHNcbiAgICBjb25zdCBsZWFkID0gc3RyLm1hdGNoKC9eLT9cXGQqLylbMF1cbiAgICBjb25zdCBjID0gbGVhZCA9PT0gJycgPyAxXG4gICAgICA6IGxlYWQgPT09ICctJyA/IC0xXG4gICAgICAgIDogcGFyc2VJbnQobGVhZClcbiAgICBsZXQgdnMgPSBzdHIubWF0Y2goLyhbYS16QS1aXSkoXFxeXFxkKyk/L2cpXG4gICAgaWYgKCF2cykgdnMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHYgPSB2c1tpXS5zcGxpdCgnXicpXG4gICAgICB2WzFdID0gdlsxXSA/IHBhcnNlSW50KHZbMV0pIDogMVxuICAgICAgdnNbaV0gPSB2XG4gICAgfVxuICAgIHZzID0gdnMuZmlsdGVyKHYgPT4gdlsxXSAhPT0gMClcbiAgICB0aGlzLmMgPSBjXG4gICAgdGhpcy52cyA9IG5ldyBNYXAodnMpXG4gIH1cblxuICBzdGF0aWMgdmFyICh2KSB7XG4gICAgLy8gZmFjdG9yeSBmb3IgYSBzaW5nbGUgdmFyaWFibGUgbW9ub21pYWxcbiAgICBjb25zdCBjID0gMVxuICAgIGNvbnN0IHZzID0gbmV3IE1hcChbW3YsIDFdXSlcbiAgICByZXR1cm4gbmV3IE1vbm9taWFsKGMsIHZzKVxuICB9XG59XG4iLCJpbXBvcnQgTW9ub21pYWwgZnJvbSAnTW9ub21pYWwnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBvbHlub21pYWwge1xuICBjb25zdHJ1Y3RvciAodGVybXMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0ZXJtcykgJiYgKHRlcm1zWzBdIGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0ZXJtcy5tYXAodCA9PiB0LmNsb25lKCkpXG4gICAgICB0aGlzLnRlcm1zID0gdGVybXNcbiAgICB9IGVsc2UgaWYgKCFpc05hTih0ZXJtcykpIHtcbiAgICAgIHRoaXMuaW5pdE51bSh0ZXJtcylcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0ZXJtcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuaW5pdFN0cih0ZXJtcylcbiAgICB9XG4gIH1cblxuICBpbml0U3RyIChzdHIpIHtcbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvXFwrLS9nLCAnLScpIC8vIGEgaG9ycmlibGUgYm9kZ2VcbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvLS9nLCAnKy0nKSAvLyBtYWtlIG5lZ2F0aXZlIHRlcm1zIGV4cGxpY2l0LlxuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9cXHMvZywgJycpIC8vIHN0cmlwIHdoaXRlc3BhY2VcbiAgICB0aGlzLnRlcm1zID0gc3RyLnNwbGl0KCcrJylcbiAgICAgIC5tYXAocyA9PiBuZXcgTW9ub21pYWwocykpXG4gICAgICAuZmlsdGVyKHQgPT4gdC5jICE9PSAwKVxuICB9XG5cbiAgaW5pdE51bSAobikge1xuICAgIHRoaXMudGVybXMgPSBbbmV3IE1vbm9taWFsKG4pXVxuICB9XG5cbiAgdG9MYXRleCAoKSB7XG4gICAgbGV0IHN0ciA9ICcnXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRlcm1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoaSA+IDAgJiYgdGhpcy50ZXJtc1tpXS5jID49IDApIHtcbiAgICAgICAgc3RyICs9ICcrJ1xuICAgICAgfVxuICAgICAgc3RyICs9IHRoaXMudGVybXNbaV0udG9MYXRleCgpXG4gICAgfVxuICAgIHJldHVybiBzdHJcbiAgfVxuXG4gIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gdGhpcy50b0xhVGVYKClcbiAgfVxuXG4gIGNsb25lICgpIHtcbiAgICBjb25zdCB0ZXJtcyA9IHRoaXMudGVybXMubWFwKHQgPT4gdC5jbG9uZSgpKVxuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbCh0ZXJtcylcbiAgfVxuXG4gIHNpbXBsaWZ5ICgpIHtcbiAgICAvLyBjb2xsZWN0cyBsaWtlIHRlcm1zIGFuZCByZW1vdmVzIHplcm8gdGVybXNcbiAgICAvLyBkb2VzIG5vdCBtb2RpZnkgb3JpZ2luYWxcbiAgICAvLyBUaGlzIHNlZW1zIHByb2JhYmx5IGluZWZmaWNpZW50LCBnaXZlbiB0aGUgZGF0YSBzdHJ1Y3R1cmVcbiAgICAvLyBXb3VsZCBiZSBiZXR0ZXIgdG8gdXNlIHNvbWV0aGluZyBsaWtlIGEgbGlua2VkIGxpc3QgbWF5YmU/XG4gICAgY29uc3QgdGVybXMgPSB0aGlzLnRlcm1zLnNsaWNlKClcbiAgICBsZXQgbmV3dGVybXMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGVybXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghdGVybXNbaV0pIGNvbnRpbnVlXG4gICAgICBsZXQgbmV3dGVybSA9IHRlcm1zW2ldXG4gICAgICBmb3IgKGxldCBqID0gaSArIDE7IGogPCB0ZXJtcy5sZW5ndGg7IGorKykge1xuICAgICAgICBpZiAoIXRlcm1zW2pdKSBjb250aW51ZVxuICAgICAgICBpZiAodGVybXNbal0ubGlrZSh0ZXJtc1tpXSkpIHtcbiAgICAgICAgICBuZXd0ZXJtID0gbmV3dGVybS5hZGQodGVybXNbal0pXG4gICAgICAgICAgdGVybXNbal0gPSBudWxsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG5ld3Rlcm1zLnB1c2gobmV3dGVybSlcbiAgICAgIHRlcm1zW2ldID0gbnVsbFxuICAgIH1cbiAgICBuZXd0ZXJtcyA9IG5ld3Rlcm1zLmZpbHRlcih0ID0+IHQuYyAhPT0gMClcbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwobmV3dGVybXMpXG4gIH1cblxuICBhZGQgKHRoYXQsIHNpbXBsaWZ5KSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIFBvbHlub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IFBvbHlub21pYWwodGhhdClcbiAgICB9XG4gICAgaWYgKHNpbXBsaWZ5ID09PSB1bmRlZmluZWQpIHNpbXBsaWZ5ID0gdHJ1ZVxuICAgIGNvbnN0IHRlcm1zID0gdGhpcy50ZXJtcy5jb25jYXQodGhhdC50ZXJtcylcbiAgICBsZXQgcmVzdWx0ID0gbmV3IFBvbHlub21pYWwodGVybXMpXG5cbiAgICBpZiAoc2ltcGxpZnkpIHJlc3VsdCA9IHJlc3VsdC5zaW1wbGlmeSgpXG5cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICBtdWwgKHRoYXQsIHNpbXBsaWZ5KSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIFBvbHlub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IFBvbHlub21pYWwodGhhdClcbiAgICB9XG4gICAgY29uc3QgdGVybXMgPSBbXVxuICAgIGlmIChzaW1wbGlmeSA9PT0gdW5kZWZpbmVkKSBzaW1wbGlmeSA9IHRydWVcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGVybXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhhdC50ZXJtcy5sZW5ndGg7IGorKykge1xuICAgICAgICB0ZXJtcy5wdXNoKHRoaXMudGVybXNbaV0ubXVsKHRoYXQudGVybXNbal0pKVxuICAgICAgfVxuICAgIH1cblxuICAgIGxldCByZXN1bHQgPSBuZXcgUG9seW5vbWlhbCh0ZXJtcylcbiAgICBpZiAoc2ltcGxpZnkpIHJlc3VsdCA9IHJlc3VsdC5zaW1wbGlmeSgpXG5cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICBwb3cgKG4sIHNpbXBsaWZ5KSB7XG4gICAgbGV0IHJlc3VsdCA9IHRoaXNcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IG47IGkrKykge1xuICAgICAgcmVzdWx0ID0gcmVzdWx0Lm11bCh0aGlzKVxuICAgIH1cbiAgICBpZiAoc2ltcGxpZnkpIHJlc3VsdCA9IHJlc3VsdC5zaW1wbGlmeSgpXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG5cbiAgc3RhdGljIHZhciAodikge1xuICAgIC8vIGZhY3RvcnkgZm9yIGEgc2luZ2xlIHZhcmlhYmxlIHBvbHlub21pYWxcbiAgICBjb25zdCB0ZXJtcyA9IFtNb25vbWlhbC52YXIodildXG4gICAgcmV0dXJuIG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuICB9XG5cbiAgc3RhdGljIHggKCkge1xuICAgIHJldHVybiBQb2x5bm9taWFsLnZhcigneCcpXG4gIH1cblxuICBzdGF0aWMgY29uc3QgKG4pIHtcbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwobilcbiAgfVxufVxuIiwiaW1wb3J0IHsgR3JhcGhpY1EsIEdyYXBoaWNRVmlldyB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IEZyYWN0aW9uIGZyb20gJ3ZlbmRvci9mcmFjdGlvbidcbmltcG9ydCBQb2x5bm9taWFsIGZyb20gJ1BvbHlub21pYWwnXG5pbXBvcnQgeyByYW5kRWxlbSwgcmFuZEJldHdlZW4sIHJhbmRCZXR3ZWVuRmlsdGVyLCBnY2QgfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFyaXRobWFnb25RIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpIC8vIHByb2Nlc3NlcyBvcHRpb25zIGludG8gdGhpcy5zZXR0aW5nc1xuICAgIHRoaXMuZGF0YSA9IG5ldyBBcml0aG1hZ29uUURhdGEodGhpcy5zZXR0aW5ncylcbiAgICB0aGlzLnZpZXcgPSBuZXcgQXJpdGhtYWdvblFWaWV3KHRoaXMuZGF0YSwgdGhpcy5zZXR0aW5ncylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgeyByZXR1cm4gJ0NvbXBsZXRlIHRoZSBhcml0aG1hZ29uOicgfVxufVxuXG5Bcml0aG1hZ29uUS5vcHRpb25zU3BlYyA9IFtcbiAge1xuICAgIHRpdGxlOiAnVmVydGljZXMnLFxuICAgIGlkOiAnbicsXG4gICAgdHlwZTogJ2ludCcsXG4gICAgbWluOiAzLFxuICAgIG1heDogMjAsXG4gICAgZGVmYXVsdDogM1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdUeXBlJyxcbiAgICBpZDogJ3R5cGUnLFxuICAgIHR5cGU6ICdzZWxlY3QtZXhjbHVzaXZlJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICB7IHRpdGxlOiAnSW50ZWdlciAoKyknLCBpZDogJ2ludGVnZXItYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0ludGVnZXIgKFxcdTAwZDcpJywgaWQ6ICdpbnRlZ2VyLW11bHRpcGx5JyB9LFxuICAgICAgeyB0aXRsZTogJ0ZyYWN0aW9uICgrKScsIGlkOiAnZnJhY3Rpb24tYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0ZyYWN0aW9uIChcXHUwMGQ3KScsIGlkOiAnZnJhY3Rpb24tbXVsdGlwbHknIH0sXG4gICAgICB7IHRpdGxlOiAnQWxnZWJyYSAoKyknLCBpZDogJ2FsZ2VicmEtYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0FsZ2VicmEgKFxcdTAwZDcpJywgaWQ6ICdhbGdlYnJhLW11bHRpcGx5JyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiAnaW50ZWdlci1hZGQnLFxuICAgIHZlcnRpY2FsOiB0cnVlXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1B1enpsZSB0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgaWQ6ICdwdXpfZGlmZicsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ01pc3NpbmcgZWRnZXMnLCBpZDogJzEnIH0sXG4gICAgICB7IHRpdGxlOiAnTWl4ZWQnLCBpZDogJzInIH0sXG4gICAgICB7IHRpdGxlOiAnTWlzc2luZyB2ZXJ0aWNlcycsIGlkOiAnMycgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogJzEnXG4gIH1cbl1cblxuY2xhc3MgQXJpdGhtYWdvblFEYXRhIC8qIGV4dGVuZHMgR3JhcGhpY1FEYXRhICovIHtcbiAgLy8gVE9ETyBzaW1wbGlmeSBjb25zdHJ1Y3Rvci4gTW92ZSBsb2dpYyBpbnRvIHN0YXRpYyBmYWN0b3J5IG1ldGhvZHNcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICAvLyAxLiBTZXQgcHJvcGVydGllcyBmcm9tIG9wdGlvbnNcbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIG46IDMsIC8vIG51bWJlciBvZiB2ZXJ0aWNlc1xuICAgICAgbWluOiAtMjAsXG4gICAgICBtYXg6IDIwLFxuICAgICAgbnVtX2RpZmY6IDEsIC8vIGNvbXBsZXhpdHkgb2Ygd2hhdCdzIGluIHZlcnRpY2VzL2VkZ2VzXG4gICAgICBwdXpfZGlmZjogMSwgLy8gMSAtIFZlcnRpY2VzIGdpdmVuLCAyIC0gdmVydGljZXMvZWRnZXM7IGdpdmVuIDMgLSBvbmx5IGVkZ2VzXG4gICAgICB0eXBlOiAnaW50ZWdlci1hZGQnIC8vIFt0eXBlXS1bb3BlcmF0aW9uXSB3aGVyZSBbdHlwZV0gPSBpbnRlZ2VyLCAuLi5cbiAgICAgIC8vIGFuZCBbb3BlcmF0aW9uXSA9IGFkZC9tdWx0aXBseVxuICAgIH1cblxuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgdGhpcy5zZXR0aW5ncywgb3B0aW9ucylcbiAgICB0aGlzLnNldHRpbmdzLm51bV9kaWZmID0gdGhpcy5zZXR0aW5ncy5kaWZmaWN1bHR5XG4gICAgdGhpcy5zZXR0aW5ncy5wdXpfZGlmZiA9IHBhcnNlSW50KHRoaXMuc2V0dGluZ3MucHV6X2RpZmYpIC8vISA/IFRoaXMgc2hvdWxkIGhhdmUgYmVlbiBkb25lIHVwc3RyZWFtLi4uXG5cbiAgICB0aGlzLm4gPSB0aGlzLnNldHRpbmdzLm5cbiAgICB0aGlzLnZlcnRpY2VzID0gW11cbiAgICB0aGlzLnNpZGVzID0gW11cblxuICAgIGlmICh0aGlzLnNldHRpbmdzLnR5cGUuZW5kc1dpdGgoJ2FkZCcpKSB7XG4gICAgICB0aGlzLm9wbmFtZSA9ICcrJ1xuICAgICAgdGhpcy5vcCA9ICh4LCB5KSA9PiB4LmFkZCh5KVxuICAgIH0gZWxzZSBpZiAodGhpcy5zZXR0aW5ncy50eXBlLmVuZHNXaXRoKCdtdWx0aXBseScpKSB7XG4gICAgICB0aGlzLm9wbmFtZSA9ICdcXHUwMGQ3J1xuICAgICAgdGhpcy5vcCA9ICh4LCB5KSA9PiB4Lm11bCh5KVxuICAgIH1cblxuICAgIC8vIDIuIEluaXRpYWxpc2UgYmFzZWQgb24gdHlwZVxuICAgIHN3aXRjaCAodGhpcy5zZXR0aW5ncy50eXBlKSB7XG4gICAgICBjYXNlICdpbnRlZ2VyLWFkZCc6XG4gICAgICBjYXNlICdpbnRlZ2VyLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0SW50ZWdlcih0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnZnJhY3Rpb24tYWRkJzpcbiAgICAgICAgdGhpcy5pbml0RnJhY3Rpb25BZGQodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2ZyYWN0aW9uLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0RnJhY3Rpb25NdWx0aXBseSh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnYWxnZWJyYS1hZGQnOlxuICAgICAgICB0aGlzLmluaXRBbGdlYnJhQWRkKHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdhbGdlYnJhLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0QWxnZWJyYU11bHRpcGx5KHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgc3dpdGNoIGRlZmF1bHQnKVxuICAgIH1cblxuICAgIHRoaXMuY2FsY3VsYXRlRWRnZXMoKSAvLyBVc2Ugb3AgZnVuY3Rpb25zIHRvIGZpbGwgaW4gdGhlIGVkZ2VzXG4gICAgdGhpcy5oaWRlTGFiZWxzKHRoaXMuc2V0dGluZ3MucHV6X2RpZmYpIC8vIHNldCBzb21lIHZlcnRpY2VzL2VkZ2VzIGFzIGhpZGRlbiBkZXBlbmRpbmcgb24gZGlmZmljdWx0eVxuICB9XG5cbiAgLyogTWV0aG9kcyBpbml0aWFsaXNpbmcgdmVydGljZXMgKi9cblxuICBpbml0SW50ZWdlciAoc2V0dGluZ3MpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihyYW5kQmV0d2VlbkZpbHRlcihcbiAgICAgICAgICBzZXR0aW5ncy5taW4sXG4gICAgICAgICAgc2V0dGluZ3MubWF4LFxuICAgICAgICAgIHggPT4gKHNldHRpbmdzLnR5cGUuZW5kc1dpdGgoJ2FkZCcpIHx8IHggIT09IDApXG4gICAgICAgICkpLFxuICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEZyYWN0aW9uQWRkIChzZXR0aW5ncykge1xuICAgIC8qIERpZmZpY3VsdHkgc2V0dGluZ3M6XG4gICAgICogMTogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIHNhbWUgZGVub21pbmF0b3IsIG5vIGNhbmNlbGxpbmcgYWZ0ZXIgRE9ORVxuICAgICAqIDI6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBzYW1lIGRlbm9taW5hdG9yLCBubyBjYW5jZWxsbGluZyBhbnN3ZXIgaW1wcm9wZXIgZnJhY3Rpb25cbiAgICAgKiAzOiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggb25lIGRlbm9taW5hdG9yIGEgbXVsdGlwbGUgb2YgYW5vdGhlciwgZ2l2ZXMgcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNDogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIG9uZSBkZW5vbWluYXRvciBhIG11bHRpcGxlIG9mIGFub3RoZXIsIGdpdmVzIGltcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNTogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIGRpZmZlcmVudCBkZW5vbWluYXRvcnMgKG5vdCBjby1wcmltZSksIGdpdmVzIGltcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNjogbWl4ZWQgbnVtYmVyc1xuICAgICAqIDc6IG1peGVkIG51bWJlcnMsIGJpZ2dlciBudW1lcmF0b3JzIGFuZCBkZW5vbWluYXRvcnNcbiAgICAgKiA4OiBtaXhlZCBudW1iZXJzLCBiaWcgaW50ZWdlciBwYXJ0c1xuICAgICAqL1xuXG4gICAgLy8gVE9ETyAtIGFueXRoaW5nIG90aGVyIHRoYW4gZGlmZmljdWx0eSAxLlxuICAgIGNvbnN0IGRpZmYgPSBzZXR0aW5ncy5udW1fZGlmZlxuICAgIGlmIChkaWZmIDwgMykge1xuICAgICAgY29uc3QgZGVuID0gcmFuZEVsZW0oWzUsIDcsIDksIDExLCAxMywgMTddKVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICBjb25zdCBwcmV2bnVtID0gdGhpcy52ZXJ0aWNlc1tpIC0gMV1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbaSAtIDFdLnZhbC5uIDogdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IG5leHRudW0gPSB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dLnZhbC5uIDogdW5kZWZpbmVkXG5cbiAgICAgICAgY29uc3QgbWF4bnVtID1cbiAgICAgICAgICBkaWZmID09PSAyID8gZGVuIC0gMVxuICAgICAgICAgICAgOiBuZXh0bnVtID8gZGVuIC0gTWF0aC5tYXgobmV4dG51bSwgcHJldm51bSlcbiAgICAgICAgICAgICAgOiBwcmV2bnVtID8gZGVuIC0gcHJldm51bVxuICAgICAgICAgICAgICAgIDogZGVuIC0gMVxuXG4gICAgICAgIGNvbnN0IG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKDEsIG1heG51bSwgeCA9PiAoXG4gICAgICAgICAgLy8gRW5zdXJlcyBubyBzaW1wbGlmaW5nIGFmdGVyd2FyZHMgaWYgZGlmZmljdWx0eSBpcyAxXG4gICAgICAgICAgZ2NkKHgsIGRlbikgPT09IDEgJiZcbiAgICAgICAgICAoIXByZXZudW0gfHwgZ2NkKHggKyBwcmV2bnVtLCBkZW4pID09PSAxIHx8IHggKyBwcmV2bnVtID09PSBkZW4pICYmXG4gICAgICAgICAgKCFuZXh0bnVtIHx8IGdjZCh4ICsgbmV4dG51bSwgZGVuKSA9PT0gMSB8fCB4ICsgbmV4dG51bSA9PT0gZGVuKVxuICAgICAgICApKVxuXG4gICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24obnVtLCBkZW4pLFxuICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBkZW5iYXNlID0gcmFuZEVsZW0oXG4gICAgICAgIGRpZmYgPCA3ID8gWzIsIDMsIDVdIDogWzIsIDMsIDQsIDUsIDYsIDcsIDgsIDksIDEwLCAxMV1cbiAgICAgIClcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgY29uc3QgcHJldiA9IHRoaXMudmVydGljZXNbaSAtIDFdXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzW2kgLSAxXS52YWwgOiB1bmRlZmluZWRcbiAgICAgICAgY29uc3QgbmV4dCA9IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl0udmFsIDogdW5kZWZpbmVkXG5cbiAgICAgICAgY29uc3QgbWF4bXVsdGlwbGllciA9IGRpZmYgPCA3ID8gNCA6IDhcblxuICAgICAgICBjb25zdCBtdWx0aXBsaWVyID1cbiAgICAgICAgICBpICUgMiA9PT0gMSB8fCBkaWZmID4gNCA/IHJhbmRCZXR3ZWVuRmlsdGVyKDIsIG1heG11bHRpcGxpZXIsIHggPT5cbiAgICAgICAgICAgICghcHJldiB8fCB4ICE9PSBwcmV2LmQgLyBkZW5iYXNlKSAmJlxuICAgICAgICAgICAgKCFuZXh0IHx8IHggIT09IG5leHQuZCAvIGRlbmJhc2UpXG4gICAgICAgICAgKSA6IDFcblxuICAgICAgICBjb25zdCBkZW4gPSBkZW5iYXNlICogbXVsdGlwbGllclxuXG4gICAgICAgIGxldCBudW1cbiAgICAgICAgaWYgKGRpZmYgPCA2KSB7XG4gICAgICAgICAgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoMSwgZGVuIC0gMSwgeCA9PiAoXG4gICAgICAgICAgICBnY2QoeCwgZGVuKSA9PT0gMSAmJlxuICAgICAgICAgICAgKGRpZmYgPj0gNCB8fCAhcHJldiB8fCBwcmV2LmFkZCh4LCBkZW4pIDw9IDEpICYmXG4gICAgICAgICAgICAoZGlmZiA+PSA0IHx8ICFuZXh0IHx8IG5leHQuYWRkKHgsIGRlbikgPD0gMSlcbiAgICAgICAgICApKVxuICAgICAgICB9IGVsc2UgaWYgKGRpZmYgPCA4KSB7XG4gICAgICAgICAgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoZGVuICsgMSwgZGVuICogNiwgeCA9PiBnY2QoeCwgZGVuKSA9PT0gMSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBudW0gPSByYW5kQmV0d2VlbkZpbHRlcihkZW4gKiAxMCwgZGVuICogMTAwLCB4ID0+IGdjZCh4LCBkZW4pID09PSAxKVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihudW0sIGRlbiksXG4gICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEZyYWN0aW9uTXVsdGlwbHkgKHNldHRpbmdzKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgY29uc3QgZCA9IHJhbmRCZXR3ZWVuKDIsIDEwKVxuICAgICAgY29uc3QgbiA9IHJhbmRCZXR3ZWVuKDEsIGQgLSAxKVxuICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24obiwgZCksXG4gICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0QWxnZWJyYUFkZCAoc2V0dGluZ3MpIHtcbiAgICBjb25zdCBkaWZmID0gc2V0dGluZ3MubnVtX2RpZmZcbiAgICBzd2l0Y2ggKGRpZmYpIHtcbiAgICAgIGNhc2UgMToge1xuICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2YXJpYWJsZSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDI6XG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGlmIChNYXRoLnJhbmRvbSgpIDwgMC41KSB7IC8vIHZhcmlhYmxlICsgY29uc3RhbnRcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgY29uc3RhbnQgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbChjb2VmZiArIHZhcmlhYmxlICsgJysnICsgY29uc3RhbnQpLFxuICAgICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IHZhcmlhYmxlMSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgICAgbGV0IHZhcmlhYmxlMiA9IHZhcmlhYmxlMVxuICAgICAgICAgIHdoaWxlICh2YXJpYWJsZTIgPT09IHZhcmlhYmxlMSkge1xuICAgICAgICAgICAgdmFyaWFibGUyID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBjb2VmZjEgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgY29lZmYyID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYxICsgdmFyaWFibGUxICsgJysnICsgY29lZmYyICsgdmFyaWFibGUyKSxcbiAgICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRBbGdlYnJhTXVsdGlwbHkgKHNldHRpbmdzKSB7XG4gICAgLyogRGlmZmljdWx0eTpcbiAgICAgKiAxOiBBbHRlcm5hdGUgM2Egd2l0aCA0XG4gICAgICogMjogQWxsIHRlcm1zIG9mIHRoZSBmb3JtIG52IC0gdXAgdG8gdHdvIHZhcmlhYmxlc1xuICAgICAqIDM6IEFsbCB0ZXJtcyBvZiB0aGUgZm9ybSBudl5tLiBPbmUgdmFyaWFibGUgb25seVxuICAgICAqIDQ6IEFMbCB0ZXJtcyBvZiB0aGUgZm9ybSBueF5rIHlebCB6XnAuIGssbCxwIDAtM1xuICAgICAqIDU6IEV4cGFuZCBicmFja2V0cyAzKDJ4KzUpXG4gICAgICogNjogRXhwYW5kIGJyYWNrZXRzIDN4KDJ4KzUpXG4gICAgICogNzogRXhwYW5kIGJyYWNrZXRzIDN4XjJ5KDJ4eSs1eV4yKVxuICAgICAqIDg6IEV4cGFuZCBicmFja2V0cyAoeCszKSh4KzIpXG4gICAgICogOTogRXhwYW5kIGJyYWNrZXRzICgyeC0zKSgzeCs0KVxuICAgICAqIDEwOiBFeHBhbmQgYnJhY2tldHMgKDJ4XjItM3grNCkoMngtNSlcbiAgICAgKi9cbiAgICBjb25zdCBkaWZmID0gc2V0dGluZ3MubnVtX2RpZmZcbiAgICBzd2l0Y2ggKGRpZmYpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgIHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IHRlcm0gPSBpICUgMiA9PT0gMCA/IGNvZWZmIDogY29lZmYgKyB2YXJpYWJsZVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDI6IHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUxID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgY29uc3QgdmFyaWFibGUyID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZSA9IHJhbmRFbGVtKFt2YXJpYWJsZTEsIHZhcmlhYmxlMl0pXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2YXJpYWJsZSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgMzoge1xuICAgICAgICBjb25zdCB2ID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBpZHggPSByYW5kQmV0d2VlbigxLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2ICsgJ14nICsgaWR4KSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSA0OiB7XG4gICAgICAgIGNvbnN0IHN0YXJ0QXNjaWkgPSByYW5kQmV0d2Vlbig5NywgMTIwKVxuICAgICAgICBjb25zdCB2MSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSlcbiAgICAgICAgY29uc3QgdjIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkgKyAxKVxuICAgICAgICBjb25zdCB2MyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSArIDIpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBhID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMSA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMiA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMyA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCB0ZXJtID0gYSArIHYxICsgbjEgKyB2MiArIG4yICsgdjMgKyBuM1xuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDU6XG4gICAgICBjYXNlIDY6IHsgLy8gZS5nLiAzKHgpICogKDJ4LTUpXG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBjb25zdGFudCA9IHJhbmRCZXR3ZWVuKC05LCA5KS50b1N0cmluZygpXG4gICAgICAgICAgbGV0IHRlcm0gPSBjb2VmZlxuICAgICAgICAgIGlmIChkaWZmID09PSA2IHx8IGkgJSAyID09PSAxKSB0ZXJtICs9IHZhcmlhYmxlXG4gICAgICAgICAgaWYgKGkgJSAyID09PSAxKSB0ZXJtICs9ICcrJyArIGNvbnN0YW50XG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgNzogeyAvLyBlLmcuIDN4XjJ5KDR4eV4yKzV4eSlcbiAgICAgICAgY29uc3Qgc3RhcnRBc2NpaSA9IHJhbmRCZXR3ZWVuKDk3LCAxMjApXG4gICAgICAgIGNvbnN0IHYxID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpKVxuICAgICAgICBjb25zdCB2MiA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSArIDEpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBhMSA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjExID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4xMiA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBsZXQgdGVybSA9IGExICsgdjEgKyBuMTEgKyB2MiArIG4xMlxuICAgICAgICAgIGlmIChpICUgMiA9PT0gMSkge1xuICAgICAgICAgICAgY29uc3QgYTIgPSByYW5kQmV0d2VlbigtOSwgOSkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgbjIxID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgbjIyID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgICAgdGVybSArPSAnKycgKyBhMiArIHYxICsgbjIxICsgdjIgKyBuMjJcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgODogLy8geyBlLmcuICh4KzUpICogKHgtMilcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29uc3RhbnQgPSByYW5kQmV0d2VlbigtOSwgOSkudG9TdHJpbmcoKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHZhcmlhYmxlICsgJysnICsgY29uc3RhbnQpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qIE1ldGhvZCB0byBjYWxjdWxhdGUgZWRnZXMgZnJvbSB2ZXJ0aWNlcyAqL1xuICBjYWxjdWxhdGVFZGdlcyAoKSB7XG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBlZGdlcyBnaXZlbiB0aGUgdmVydGljZXMgdXNpbmcgdGhpcy5vcFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIHRoaXMuc2lkZXNbaV0gPSB7XG4gICAgICAgIHZhbDogdGhpcy5vcCh0aGlzLnZlcnRpY2VzW2ldLnZhbCwgdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXS52YWwpLFxuICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyogTWFyayBoaWRkZW5kIGVkZ2VzL3ZlcnRpY2VzICovXG5cbiAgaGlkZUxhYmVscyAocHV6emxlRGlmZmljdWx0eSkge1xuICAgIC8vIEhpZGUgc29tZSBsYWJlbHMgdG8gbWFrZSBhIHB1enpsZVxuICAgIC8vIDEgLSBTaWRlcyBoaWRkZW4sIHZlcnRpY2VzIHNob3duXG4gICAgLy8gMiAtIFNvbWUgc2lkZXMgaGlkZGVuLCBzb21lIHZlcnRpY2VzIGhpZGRlblxuICAgIC8vIDMgLSBBbGwgdmVydGljZXMgaGlkZGVuXG4gICAgc3dpdGNoIChwdXp6bGVEaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHRoaXMuc2lkZXMuZm9yRWFjaCh4ID0+IHsgeC5oaWRkZW4gPSB0cnVlIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDI6IHtcbiAgICAgICAgdGhpcy5zaWRlcy5mb3JFYWNoKHggPT4geyB4LmhpZGRlbiA9IHRydWUgfSlcbiAgICAgICAgY29uc3Qgc2hvd3NpZGUgPSByYW5kQmV0d2VlbigwLCB0aGlzLm4gLSAxLCBNYXRoLnJhbmRvbSlcbiAgICAgICAgY29uc3QgaGlkZXZlcnQgPSBNYXRoLnJhbmRvbSgpIDwgMC41XG4gICAgICAgICAgPyBzaG93c2lkZSAvLyBwcmV2aW91cyB2ZXJ0ZXhcbiAgICAgICAgICA6IChzaG93c2lkZSArIDEpICUgdGhpcy5uIC8vIG5leHQgdmVydGV4O1xuXG4gICAgICAgIHRoaXMuc2lkZXNbc2hvd3NpZGVdLmhpZGRlbiA9IGZhbHNlXG4gICAgICAgIHRoaXMudmVydGljZXNbaGlkZXZlcnRdLmhpZGRlbiA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgMzpcbiAgICAgICAgdGhpcy52ZXJ0aWNlcy5mb3JFYWNoKHggPT4geyB4LmhpZGRlbiA9IHRydWUgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm9fZGlmZmljdWx0eScpXG4gICAgfVxuICB9XG59XG5cbmNsYXNzIEFyaXRobWFnb25RVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIGNvbnN0cnVjdG9yIChkYXRhLCBvcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc2V0cyB0aGlzLndpZHRoIHRoaXMuaGVpZ2h0LCBpbml0aWFsaXNlcyB0aGlzLmxhYmVscywgY3JlYXRlcyBkb20gZWxlbWVudHNcblxuICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aFxuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuaGVpZ2h0XG4gICAgY29uc3QgciA9IDAuMzUgKiBNYXRoLm1pbih3aWR0aCwgaGVpZ2h0KSAvLyByYWRpdXNcbiAgICBjb25zdCBuID0gdGhpcy5kYXRhLm5cblxuICAgIC8vIEEgcG9pbnQgdG8gbGFiZWwgd2l0aCB0aGUgb3BlcmF0aW9uXG4gICAgLy8gQWxsIHBvaW50cyBmaXJzdCBzZXQgdXAgd2l0aCAoMCwwKSBhdCBjZW50ZXJcbiAgICB0aGlzLm9wZXJhdGlvblBvaW50ID0gbmV3IFBvaW50KDAsIDApXG5cbiAgICAvLyBQb3NpdGlvbiBvZiB2ZXJ0aWNlc1xuICAgIHRoaXMudmVydGV4UG9pbnRzID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgY29uc3QgYW5nbGUgPSBpICogTWF0aC5QSSAqIDIgLyBuIC0gTWF0aC5QSSAvIDJcbiAgICAgIHRoaXMudmVydGV4UG9pbnRzW2ldID0gUG9pbnQuZnJvbVBvbGFyKHIsIGFuZ2xlKVxuICAgIH1cblxuICAgIC8vIFBvaXNpdGlvbiBvZiBzaWRlIGxhYmVsc1xuICAgIHRoaXMuc2lkZVBvaW50cyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIHRoaXMuc2lkZVBvaW50c1tpXSA9IFBvaW50Lm1lYW4odGhpcy52ZXJ0ZXhQb2ludHNbaV0sIHRoaXMudmVydGV4UG9pbnRzWyhpICsgMSkgJSBuXSlcbiAgICB9XG5cbiAgICB0aGlzLmFsbFBvaW50cyA9IFt0aGlzLm9wZXJhdGlvblBvaW50XS5jb25jYXQodGhpcy52ZXJ0ZXhQb2ludHMpLmNvbmNhdCh0aGlzLnNpZGVQb2ludHMpXG5cbiAgICB0aGlzLnJlQ2VudGVyKCkgLy8gUmVwb3NpdGlvbiBldmVyeXRoaW5nIHByb3Blcmx5XG5cbiAgICB0aGlzLm1ha2VMYWJlbHModHJ1ZSlcblxuICAgIC8vIERyYXcgaW50byBjYW52YXNcbiAgfVxuXG4gIHJlQ2VudGVyICgpIHtcbiAgICAvLyBGaW5kIHRoZSBjZW50ZXIgb2YgdGhlIGJvdW5kaW5nIGJveFxuICAgIGNvbnN0IHRvcGxlZnQgPSBQb2ludC5taW4odGhpcy5hbGxQb2ludHMpXG4gICAgY29uc3QgYm90dG9tcmlnaHQgPSBQb2ludC5tYXgodGhpcy5hbGxQb2ludHMpXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbih0b3BsZWZ0LCBib3R0b21yaWdodClcblxuICAgIC8vIHRyYW5zbGF0ZSB0byBwdXQgaW4gdGhlIGNlbnRlclxuICAgIHRoaXMuYWxsUG9pbnRzLmZvckVhY2gocCA9PiB7XG4gICAgICBwLnRyYW5zbGF0ZSh0aGlzLndpZHRoIC8gMiAtIGNlbnRlci54LCB0aGlzLmhlaWdodCAvIDIgLSBjZW50ZXIueSlcbiAgICB9KVxuICB9XG5cbiAgbWFrZUxhYmVscyAoKSB7XG4gICAgLy8gdmVydGljZXNcbiAgICB0aGlzLmRhdGEudmVydGljZXMuZm9yRWFjaCgodiwgaSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSB2LnZhbC50b0xhdGV4XG4gICAgICAgID8gdi52YWwudG9MYXRleCh0cnVlKVxuICAgICAgICA6IHYudmFsLnRvU3RyaW5nKClcbiAgICAgIHRoaXMubGFiZWxzLnB1c2goe1xuICAgICAgICBwb3M6IHRoaXMudmVydGV4UG9pbnRzW2ldLFxuICAgICAgICB0ZXh0cTogdi5oaWRkZW4gPyAnJyA6IHZhbHVlLFxuICAgICAgICB0ZXh0YTogdmFsdWUsXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCB2ZXJ0ZXgnLFxuICAgICAgICBzdHlsZWE6IHYuaGlkZGVuID8gJ2Fuc3dlciB2ZXJ0ZXgnIDogJ25vcm1hbCB2ZXJ0ZXgnXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBzaWRlc1xuICAgIHRoaXMuZGF0YS5zaWRlcy5mb3JFYWNoKCh2LCBpKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHYudmFsLnRvTGF0ZXhcbiAgICAgICAgPyB2LnZhbC50b0xhdGV4KHRydWUpXG4gICAgICAgIDogdi52YWwudG9TdHJpbmcoKVxuICAgICAgdGhpcy5sYWJlbHMucHVzaCh7XG4gICAgICAgIHBvczogdGhpcy5zaWRlUG9pbnRzW2ldLFxuICAgICAgICB0ZXh0cTogdi5oaWRkZW4gPyAnJyA6IHZhbHVlLFxuICAgICAgICB0ZXh0YTogdmFsdWUsXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCBzaWRlJyxcbiAgICAgICAgc3R5bGVhOiB2LmhpZGRlbiA/ICdhbnN3ZXIgc2lkZScgOiAnbm9ybWFsIHNpZGUnXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBvcGVyYXRpb25cbiAgICB0aGlzLmxhYmVscy5wdXNoKHtcbiAgICAgIHBvczogdGhpcy5vcGVyYXRpb25Qb2ludCxcbiAgICAgIHRleHRxOiB0aGlzLmRhdGEub3BuYW1lLFxuICAgICAgdGV4dGE6IHRoaXMuZGF0YS5vcG5hbWUsXG4gICAgICBzdHlsZXE6ICdub3JtYWwnLFxuICAgICAgc3R5bGVhOiAnbm9ybWFsJ1xuICAgIH0pXG5cbiAgICAvLyBzdHlsaW5nXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gIH1cblxuICByZW5kZXIgKCkge1xuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICBjb25zdCBuID0gdGhpcy5kYXRhLm5cblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBjb25zdCBwID0gdGhpcy52ZXJ0ZXhQb2ludHNbaV1cbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnZlcnRleFBvaW50c1soaSArIDEpICUgbl1cbiAgICAgIGN0eC5tb3ZlVG8ocC54LCBwLnkpXG4gICAgICBjdHgubGluZVRvKG5leHQueCwgbmV4dC55KVxuICAgIH1cbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIC8vIHBsYWNlIGxhYmVsc1xuICAgIHRoaXMucmVuZGVyTGFiZWxzKHRydWUpXG4gIH1cblxuICBzaG93QW5zd2VyICgpIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0YVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVhXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyh0cnVlKVxuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyh0cnVlKVxuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICB9XG59XG4iLCJpbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5pbXBvcnQgeyByYW5kRWxlbSB9IGZyb20gJ1V0aWxpdGllcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGVzdFEgZXh0ZW5kcyBUZXh0USB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYScsXG4gICAgICB0ZXN0MTogWydmb28nXSxcbiAgICAgIHRlc3QyOiB0cnVlXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICB0aGlzLmxhYmVsID0gc2V0dGluZ3MubGFiZWxcblxuICAgIC8vIHBpY2sgYSByYW5kb20gb25lIG9mIHRoZSBzZWxlY3RlZFxuICAgIGxldCB0ZXN0MVxuICAgIGlmIChzZXR0aW5ncy50ZXN0MS5sZW5ndGggPT09IDApIHtcbiAgICAgIHRlc3QxID0gJ25vbmUnXG4gICAgfSBlbHNlIHtcbiAgICAgIHRlc3QxID0gcmFuZEVsZW0oc2V0dGluZ3MudGVzdDEpXG4gICAgfVxuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gJ2Q6ICcgKyBzZXR0aW5ncy5kaWZmaWN1bHR5ICsgJ1xcXFxcXFxcIHRlc3QxOiAnICsgdGVzdDFcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJ3Rlc3QyOiAnICsgc2V0dGluZ3MudGVzdDJcblxuICAgIHRoaXMucmVuZGVyKClcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgeyByZXR1cm4gJ1Rlc3QgY29tbWFuZCB3b3JkJyB9XG59XG5cblRlc3RRLm9wdGlvbnNTcGVjID0gW1xuICB7XG4gICAgdGl0bGU6ICdUZXN0IG9wdGlvbiAxJyxcbiAgICBpZDogJ3Rlc3QxJyxcbiAgICB0eXBlOiAnc2VsZWN0LWluY2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogWydmb28nLCAnYmFyJywgJ3dpenonXSxcbiAgICBkZWZhdWx0OiBbXVxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdUZXN0IG9wdGlvbiAyJyxcbiAgICBpZDogJ3Rlc3QyJyxcbiAgICB0eXBlOiAnYm9vbCcsXG4gICAgZGVmYXVsdDogdHJ1ZVxuICB9XG5dXG4iLCJpbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5pbXBvcnQgeyByYW5kQmV0d2VlbiB9IGZyb20gJ1V0aWxpdGllcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQWRkQVplcm8gZXh0ZW5kcyBUZXh0USB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYSdcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIHRoaXMubGFiZWwgPSBzZXR0aW5ncy5sYWJlbFxuXG4gICAgLy8gcmFuZG9tIDIgZGlnaXQgJ2RlY2ltYWwnXG4gICAgY29uc3QgcSA9IFN0cmluZyhyYW5kQmV0d2VlbigxLCA5KSkgKyBTdHJpbmcocmFuZEJldHdlZW4oMCwgOSkpICsgJy4nICsgU3RyaW5nKHJhbmRCZXR3ZWVuKDAsIDkpKVxuICAgIGNvbnN0IGEgPSBxICsgJzAnXG5cbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSBxICsgJ1xcXFx0aW1lcyAxMCdcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJz0gJyArIGFcblxuICAgIHRoaXMucmVuZGVyKClcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRXZhbHVhdGUnXG4gIH1cbn1cblxuQWRkQVplcm8ub3B0aW9uc1NwZWMgPSBbXG5dXG4iLCJpbXBvcnQgeyByYW5kQmV0d2VlbiB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCBGcmFjdGlvbiBmcm9tICd2ZW5kb3IvZnJhY3Rpb24nXG5cbi8qIE1haW4gcXVlc3Rpb24gY2xhc3MuIFRoaXMgd2lsbCBiZSBzcHVuIG9mZiBpbnRvIGRpZmZlcmVudCBmaWxlIGFuZCBnZW5lcmFsaXNlZCAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRXF1YXRpb25PZkxpbmUgZXh0ZW5kcyBUZXh0USB7XG4gIC8vICdleHRlbmRzJyBRdWVzdGlvbiwgYnV0IG5vdGhpbmcgdG8gYWN0dWFsbHkgZXh0ZW5kXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgLy8gYm9pbGVycGxhdGVcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiAyXG4gICAgfVxuXG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcbiAgICBjb25zdCBkaWZmaWN1bHR5ID0gTWF0aC5jZWlsKHNldHRpbmdzLmRpZmZpY3VsdHkgLyAyKSAvLyBpbml0aWFsbHkgd3JpdHRlbiBmb3IgZGlmZmljdWx0eSAxLTQsIG5vdyBuZWVkIDEtMTBcblxuICAgIC8vIHF1ZXN0aW9uIGdlbmVyYXRpb24gYmVnaW5zIGhlcmVcbiAgICBsZXQgbSwgYywgeDEsIHkxLCB4MiwgeTJcbiAgICBsZXQgbWlubSwgbWF4bSwgbWluYywgbWF4Y1xuXG4gICAgc3dpdGNoIChkaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6IC8vIG0+MCwgYz49MFxuICAgICAgY2FzZSAyOlxuICAgICAgY2FzZSAzOlxuICAgICAgICBtaW5tID0gZGlmZmljdWx0eSA8IDMgPyAxIDogLTVcbiAgICAgICAgbWF4bSA9IDVcbiAgICAgICAgbWluYyA9IGRpZmZpY3VsdHkgPCAyID8gMCA6IC0xMFxuICAgICAgICBtYXhjID0gMTBcbiAgICAgICAgbSA9IHJhbmRCZXR3ZWVuKG1pbm0sIG1heG0pXG4gICAgICAgIGMgPSByYW5kQmV0d2VlbihtaW5jLCBtYXhjKVxuICAgICAgICB4MSA9IGRpZmZpY3VsdHkgPCAzID8gcmFuZEJldHdlZW4oMCwgMTApIDogcmFuZEJldHdlZW4oLTE1LCAxNSlcbiAgICAgICAgeTEgPSBtICogeDEgKyBjXG5cbiAgICAgICAgaWYgKGRpZmZpY3VsdHkgPCAzKSB7XG4gICAgICAgICAgeDIgPSByYW5kQmV0d2Vlbih4MSArIDEsIDE1KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHgyID0geDFcbiAgICAgICAgICB3aGlsZSAoeDIgPT09IHgxKSB7IHgyID0gcmFuZEJldHdlZW4oLTE1LCAxNSkgfTtcbiAgICAgICAgfVxuICAgICAgICB5MiA9IG0gKiB4MiArIGNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNDogLy8gbSBmcmFjdGlvbiwgcG9pbnRzIGFyZSBpbnRlZ2Vyc1xuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBjb25zdCBtZCA9IHJhbmRCZXR3ZWVuKDEsIDUpXG4gICAgICAgIGNvbnN0IG1uID0gcmFuZEJldHdlZW4oLTUsIDUpXG4gICAgICAgIG0gPSBuZXcgRnJhY3Rpb24obW4sIG1kKVxuICAgICAgICB4MSA9IG5ldyBGcmFjdGlvbihyYW5kQmV0d2VlbigtMTAsIDEwKSlcbiAgICAgICAgeTEgPSBuZXcgRnJhY3Rpb24ocmFuZEJldHdlZW4oLTEwLCAxMCkpXG4gICAgICAgIGMgPSBuZXcgRnJhY3Rpb24oeTEpLnN1YihtLm11bCh4MSkpXG4gICAgICAgIHgyID0geDEuYWRkKHJhbmRCZXR3ZWVuKDEsIDUpICogbS5kKVxuICAgICAgICB5MiA9IG0ubXVsKHgyKS5hZGQoYylcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB4c3RyID1cbiAgICAgIChtID09PSAwIHx8IChtLmVxdWFscyAmJiBtLmVxdWFscygwKSkpID8gJydcbiAgICAgICAgOiAobSA9PT0gMSB8fCAobS5lcXVhbHMgJiYgbS5lcXVhbHMoMSkpKSA/ICd4J1xuICAgICAgICAgIDogKG0gPT09IC0xIHx8IChtLmVxdWFscyAmJiBtLmVxdWFscygtMSkpKSA/ICcteCdcbiAgICAgICAgICAgIDogKG0udG9MYXRleCkgPyBtLnRvTGF0ZXgoKSArICd4J1xuICAgICAgICAgICAgICA6IChtICsgJ3gnKVxuXG4gICAgY29uc3QgY29uc3RzdHIgPSAvLyBUT0RPOiBXaGVuIG09Yz0wXG4gICAgICAoYyA9PT0gMCB8fCAoYy5lcXVhbHMgJiYgYy5lcXVhbHMoMCkpKSA/ICcnXG4gICAgICAgIDogKGMgPCAwKSA/ICgnIC0gJyArIChjLm5lZyA/IGMubmVnKCkudG9MYXRleCgpIDogLWMpKVxuICAgICAgICAgIDogKGMudG9MYXRleCkgPyAoJyArICcgKyBjLnRvTGF0ZXgoKSlcbiAgICAgICAgICAgIDogKCcgKyAnICsgYylcblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICcoJyArIHgxICsgJywgJyArIHkxICsgJylcXFxcdGV4dHsgYW5kIH0oJyArIHgyICsgJywgJyArIHkyICsgJyknXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICd5ID0gJyArIHhzdHIgKyBjb25zdHN0clxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdGaW5kIHRoZSBlcXVhdGlvbiBvZiB0aGUgbGluZSB0aHJvdWdoJ1xuICB9XG59XG4iLCIvKiBSZW5kZXJzIG1pc3NpbmcgYW5nbGVzIHByb2JsZW0gd2hlbiB0aGUgYW5nbGVzIGFyZSBhdCBhIHBvaW50XG4gKiBJLmUuIG9uIGEgc3RyYWlnaHQgbGluZSBvciBhcm91bmQgYSBwb2ludFxuICogQ291bGQgYWxzbyBiZSBhZGFwdGVkIHRvIGFuZ2xlcyBmb3JtaW5nIGEgcmlnaHQgYW5nbGVcbiAqXG4gKiBTaG91bGQgYmUgZmxleGlibGUgZW5vdWdoIGZvciBudW1lcmljYWwgcHJvYmxlbXMgb3IgYWxnZWJyYWljIG9uZXNcbiAqXG4gKi9cblxuaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgR3JhcGhpY1FWaWV3LCBMYWJlbCB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IHsgcm91bmREUCB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIHJhZGl1czogbnVtYmVyXG4gIE86IFBvaW50XG4gIEE6IFBvaW50XG4gIEM6IFBvaW50W11cbiAgdmlld0FuZ2xlczogbnVtYmVyW10gLy8gJ2Z1ZGdlZCcgdmVyc2lvbnMgb2YgZGF0YS5hbmdsZXMgZm9yIGRpc3BsYXlcbiAgZGF0YTogTWlzc2luZ0FuZ2xlc051bWJlckRhdGFcbiAgcm90YXRpb246IG51bWJlclxuXG4gIGNvbnN0cnVjdG9yIChkYXRhIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEsIG9wdGlvbnMgOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBzZXRzIHRoaXMud2lkdGggdGhpcy5oZWlnaHQsIGluaXRpYWxpc2VzIHRoaXMubGFiZWxzLCBjcmVhdGVzIGRvbSBlbGVtZW50c1xuICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aFxuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuaGVpZ2h0XG4gICAgY29uc3QgcmFkaXVzID0gdGhpcy5yYWRpdXMgPSBNYXRoLm1pbih3aWR0aCwgaGVpZ2h0KSAvIDIuNVxuICAgIGNvbnN0IG1pblZpZXdBbmdsZSA9IG9wdGlvbnMubWluVmlld0FuZ2xlIHx8IDI1XG5cbiAgICB0aGlzLnZpZXdBbmdsZXMgPSBmdWRnZUFuZ2xlcyh0aGlzLmRhdGEuYW5nbGVzLCBtaW5WaWV3QW5nbGUpXG5cbiAgICAvLyBTZXQgdXAgbWFpbiBwb2ludHNcbiAgICB0aGlzLk8gPSBuZXcgUG9pbnQoMCwgMCkgLy8gY2VudGVyIHBvaW50XG4gICAgdGhpcy5BID0gbmV3IFBvaW50KHJhZGl1cywgMCkgLy8gZmlyc3QgcG9pbnRcbiAgICB0aGlzLkMgPSBbXSAvLyBQb2ludHMgYXJvdW5kIG91dHNpZGVcbiAgICBsZXQgdG90YWxhbmdsZSA9IDAgLy8gbmIgaW4gcmFkaWFuc1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5kYXRhLmFuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdG90YWxhbmdsZSArPSB0aGlzLnZpZXdBbmdsZXNbaV0gKiBNYXRoLlBJIC8gMTgwXG4gICAgICB0aGlzLkNbaV0gPSBQb2ludC5mcm9tUG9sYXIocmFkaXVzLCB0b3RhbGFuZ2xlKVxuICAgIH1cblxuICAgIC8vIFJhbmRvbWx5IHJvdGF0ZSBhbmQgY2VudGVyXG4gICAgdGhpcy5yb3RhdGlvbiA9IChvcHRpb25zLnJvdGF0aW9uICE9PSB1bmRlZmluZWQpID8gdGhpcy5yb3RhdGUob3B0aW9ucy5yb3RhdGlvbikgOiB0aGlzLnJhbmRvbVJvdGF0ZSgpXG4gICAgLy8gdGhpcy5zY2FsZVRvRml0KHdpZHRoLGhlaWdodCwxMClcbiAgICB0aGlzLnRyYW5zbGF0ZSh3aWR0aCAvIDIsIGhlaWdodCAvIDIpXG5cbiAgICAvLyBTZXQgdXAgbGFiZWxzIChhZnRlciBzY2FsaW5nIGFuZCByb3RhdGluZylcbiAgICB0b3RhbGFuZ2xlID0gUG9pbnQuYW5nbGVGcm9tKHRoaXMuTywgdGhpcy5BKSAqIDE4MCAvIE1hdGguUEkgLy8gYW5nbGUgZnJvbSBPIHRoYXQgQSBpc1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy52aWV3QW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAvLyBMYWJlbCB0ZXh0XG4gICAgICBjb25zdCBsYWJlbCA6IFBhcnRpYWw8TGFiZWw+ID0ge31cbiAgICAgIGNvbnN0IHRleHRxID0gdGhpcy5kYXRhLmFuZ2xlTGFiZWxzW2ldXG4gICAgICBjb25zdCB0ZXh0YSA9IHJvdW5kRFAodGhpcy5kYXRhLmFuZ2xlc1tpXSwgMikudG9TdHJpbmcoKSArICdeXFxcXGNpcmMnXG5cbiAgICAgIC8vIFBvc2l0aW9uaW5nXG4gICAgICBjb25zdCB0aGV0YSA9IHRoaXMudmlld0FuZ2xlc1tpXVxuICAgICAgLyogY291bGQgYmUgdXNlZCBmb3IgbW9yZSBhZHZhbmNlZCBwb3NpdGlvbmluZ1xuICAgICAgY29uc3QgbWlkQW5nbGUgPSB0b3RhbGFuZ2xlICsgdGhldGEgLyAyXG4gICAgICBjb25zdCBtaW5EaXN0YW5jZSA9IDAuMyAvLyBhcyBhIGZyYWN0aW9uIG9mIHJhZGl1c1xuICAgICAgY29uc3QgbGFiZWxMZW5ndGggPSBNYXRoLm1heCh0ZXh0cS5sZW5ndGgsIHRleHRhLmxlbmd0aCkgLSAnXlxcXFxjaXJjJy5sZW5ndGggLy8gwrAgdGFrZXMgdXAgdmVyeSBsaXR0bGUgc3BhY2VcbiAgICAgICovXG5cbiAgICAgIC8qIEV4cGxhbmF0aW9uOiBGdXJ0aGVyIG91dCBpZjpcbiAgICAgICogICBNb3JlIHZlcnRpY2FsIChzaW4obWlkQW5nbGUpKVxuICAgICAgKiAgIExvbmdlciBsYWJlbFxuICAgICAgKiAgIHNtYWxsZXIgYW5nbGVcbiAgICAgICogICBFLmcuIHRvdGFsbHkgdmVydGljYWwsIDQ1wrAsIGxlbmd0aCA9IDNcbiAgICAgICogICBkID0gMC4zICsgMSozLzQ1ID0gMC4zICsgMC43ID0gMC4zN1xuICAgICAgKi9cbiAgICAgIC8vIGNvbnN0IGZhY3RvciA9IDEgICAgICAgIC8vIGNvbnN0YW50IG9mIHByb3BvcnRpb25hbGl0eS4gU2V0IGJ5IHRyaWFsIGFuZCBlcnJvclxuICAgICAgLy8gbGV0IGRpc3RhbmNlID0gbWluRGlzdGFuY2UgKyBmYWN0b3IgKiBNYXRoLmFicyhzaW5EZWcobWlkQW5nbGUpKSAqIGxhYmVsTGVuZ3RoIC8gdGhldGFcblxuICAgICAgLy8gSnVzdCByZXZlcnQgdG8gb2xkIG1ldGhvZFxuXG4gICAgICBjb25zdCBkaXN0YW5jZSA9IDAuNCArIDYgLyB0aGV0YVxuXG4gICAgICBsYWJlbC5wb3MgPSBQb2ludC5mcm9tUG9sYXJEZWcocmFkaXVzICogZGlzdGFuY2UsIHRvdGFsYW5nbGUgKyB0aGV0YSAvIDIpLnRyYW5zbGF0ZSh0aGlzLk8ueCwgdGhpcy5PLnkpXG4gICAgICBsYWJlbC50ZXh0cSA9IHRleHRxXG4gICAgICBsYWJlbC5zdHlsZXEgPSAnbm9ybWFsJ1xuXG4gICAgICBpZiAodGhpcy5kYXRhLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSB0ZXh0YVxuICAgICAgICBsYWJlbC5zdHlsZWEgPSAnYW5zd2VyJ1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSBsYWJlbC50ZXh0cVxuICAgICAgICBsYWJlbC5zdHlsZWEgPSBsYWJlbC5zdHlsZXFcbiAgICAgIH1cblxuICAgICAgbGFiZWwudGV4dCA9IGxhYmVsLnRleHRxXG4gICAgICBsYWJlbC5zdHlsZSA9IGxhYmVsLnN0eWxlcVxuXG4gICAgICB0aGlzLmxhYmVsc1tpXSA9IGxhYmVsIGFzIExhYmVsXG5cbiAgICAgIHRvdGFsYW5nbGUgKz0gdGhldGFcbiAgICB9XG5cbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgfVxuXG4gIHJlbmRlciAoKSA6IHZvaWQge1xuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGN0eC5tb3ZlVG8odGhpcy5PLngsIHRoaXMuTy55KSAvLyBkcmF3IGxpbmVzXG4gICAgY3R4LmxpbmVUbyh0aGlzLkEueCwgdGhpcy5BLnkpXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLkMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGN0eC5tb3ZlVG8odGhpcy5PLngsIHRoaXMuTy55KVxuICAgICAgY3R4LmxpbmVUbyh0aGlzLkNbaV0ueCwgdGhpcy5DW2ldLnkpXG4gICAgfVxuICAgIGN0eC5zdHJva2VTdHlsZSA9ICdncmF5J1xuICAgIGN0eC5zdHJva2UoKVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgY3R4LmJlZ2luUGF0aCgpXG4gICAgbGV0IHRvdGFsYW5nbGUgPSB0aGlzLnJvdGF0aW9uXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnZpZXdBbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHRoZXRhID0gdGhpcy52aWV3QW5nbGVzW2ldICogTWF0aC5QSSAvIDE4MFxuICAgICAgLy8gMC4wNy90aGV0YSByYWRpYW5zIH49IDQvdGhldGFcbiAgICAgIGN0eC5hcmModGhpcy5PLngsIHRoaXMuTy55LCB0aGlzLnJhZGl1cyAqICgwLjIgKyAwLjA3IC8gdGhldGEpLCB0b3RhbGFuZ2xlLCB0b3RhbGFuZ2xlICsgdGhldGEpXG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIHRvdGFsYW5nbGUgKz0gdGhldGFcbiAgICB9XG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICAvLyB0ZXN0aW5nIGxhYmVsIHBvc2l0aW9uaW5nOlxuICAgIC8vIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgLy8gY3R4LmZpbGxTdHlsZSA9ICdyZWQnXG4gICAgLy8gY3R4LmZpbGxSZWN0KGwucG9zLnggLSAxLCBsLnBvcy55IC0gMSwgMywgMylcbiAgICAvLyB9KVxuXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoZmFsc2UpXG4gIH1cblxuICBnZXQgYWxscG9pbnRzICgpIDogUG9pbnRbXSB7XG4gICAgbGV0IGFsbHBvaW50cyA9IFt0aGlzLkEsIHRoaXMuT11cbiAgICBhbGxwb2ludHMgPSBhbGxwb2ludHMuY29uY2F0KHRoaXMuQylcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGZ1bmN0aW9uIChsKSB7XG4gICAgICBhbGxwb2ludHMucHVzaChsLnBvcylcbiAgICB9KVxuICAgIHJldHVybiBhbGxwb2ludHNcbiAgfVxufVxuXG4vKipcbiAqIEFkanVzdHMgYSBzZXQgb2YgYW5nbGVzIHNvIHRoYXQgYWxsIGFuZ2xlcyBhcmUgZ3JlYXRlciB0aGFuIHttaW5BbmdsZX0gYnkgcmVkdWNpbmcgb3RoZXIgYW5nbGVzIGluIHByb3BvcnRpb25cbiAqIEBwYXJhbSBhbmdsZXMgVGhlIHNldCBvZiBhbmdsZXMgdG8gYWRqdXN0XG4gKiBAcGFyYW0gbWluQW5nbGUgVGhlIHNtYWxsZXN0IGFuZ2xlIGluIHRoZSBvdXRwdXRcbiAqL1xuZnVuY3Rpb24gZnVkZ2VBbmdsZXMgKGFuZ2xlczogbnVtYmVyW10sIG1pbkFuZ2xlOiBudW1iZXIpIDogbnVtYmVyW10ge1xuICBjb25zdCBtYXBwZWRBbmdsZXMgPSBhbmdsZXMubWFwKCh4LCBpKSA9PiBbeCwgaV0pIC8vIHJlbWVtYmVyIG9yaWdpbmFsIGluZGljZXNcbiAgY29uc3Qgc21hbGxBbmdsZXMgPSBtYXBwZWRBbmdsZXMuZmlsdGVyKHggPT4geFswXSA8IG1pbkFuZ2xlKVxuICBjb25zdCBsYXJnZUFuZ2xlcyA9IG1hcHBlZEFuZ2xlcy5maWx0ZXIoeCA9PiB4WzBdID49IG1pbkFuZ2xlKVxuICBjb25zdCBsYXJnZUFuZ2xlU3VtID0gbGFyZ2VBbmdsZXMucmVkdWNlKChhY2N1bXVsYXRvciwgY3VycmVudFZhbHVlKSA9PiBhY2N1bXVsYXRvciArIGN1cnJlbnRWYWx1ZVswXSwgMClcblxuICBzbWFsbEFuZ2xlcy5mb3JFYWNoKHNtYWxsID0+IHtcbiAgICBjb25zdCBkaWZmZXJlbmNlID0gbWluQW5nbGUgLSBzbWFsbFswXVxuICAgIHNtYWxsWzBdICs9IGRpZmZlcmVuY2VcbiAgICBsYXJnZUFuZ2xlcy5mb3JFYWNoKGxhcmdlID0+IHtcbiAgICAgIGNvbnN0IHJlZHVjdGlvbiA9IGRpZmZlcmVuY2UgKiBsYXJnZVswXSAvIGxhcmdlQW5nbGVTdW1cbiAgICAgIGxhcmdlWzBdIC09IHJlZHVjdGlvblxuICAgIH0pXG4gIH0pXG5cbiAgcmV0dXJuIHNtYWxsQW5nbGVzLmNvbmNhdChsYXJnZUFuZ2xlcykgLy8gY29tYmluZSB0b2dldGhlclxuICAgIC5zb3J0KCh4LCB5KSA9PiB4WzFdIC0geVsxXSkgLy8gc29ydCBieSBwcmV2aW91cyBpbmRleFxuICAgIC5tYXAoeCA9PiB4WzBdKSAvLyBzdHJpcCBvdXQgaW5kZXhcbn1cbiIsIi8qKiBHZW5lcmF0ZXMgYW5kIGhvbGRzIGRhdGEgZm9yIGEgbWlzc2luZyBhbmdsZXMgcXVlc3Rpb24sIHdoZXJlIHRoZXNlIGlzIHNvbWUgZ2l2ZW4gYW5nbGUgc3VtXG4gKiAgQWdub3N0aWMgYXMgdG8gaG93IHRoZXNlIGFuZ2xlcyBhcmUgYXJyYW5nZWQgKGUuZy4gaW4gYSBwb2x5Z29uIG9yIGFyb3VuZCBzb20gcG9pbnQpXG4gKlxuICogT3B0aW9ucyBwYXNzZWQgdG8gY29uc3RydWN0b3JzOlxuICogIGFuZ2xlU3VtOjpJbnQgdGhlIG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqICBtaW5BbmdsZTo6SW50IHRoZSBzbWFsbGVzdCBhbmdsZSB0byBnZW5lcmF0ZVxuICogIG1pbk46OkludCAgICAgdGhlIHNtYWxsZXN0IG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqICBtYXhOOjpJbnQgICAgIHRoZSBsYXJnZXN0IG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqXG4gKi9cblxuaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUURhdGEgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgYXMgT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxuZXhwb3J0IGNsYXNzIE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIGltcGxlbWVudHMgTWlzc2luZ0FuZ2xlc0RhdGEge1xuICBhbmdsZXMgOiBudW1iZXJbXSAvLyBsaXN0IG9mIGFuZ2xlc1xuICBtaXNzaW5nIDogYm9vbGVhbltdIC8vIHRydWUgaWYgbWlzc2luZ1xuICBhbmdsZVN1bSA6IG51bWJlciAvLyB3aGF0IHRoZSBhbmdsZXMgYWRkIHVwIHRvXG4gIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXVxuXG4gIGNvbnN0cnVjdG9yIChhbmdsZVN1bSA6IG51bWJlciwgYW5nbGVzOiBudW1iZXJbXSwgbWlzc2luZzogYm9vbGVhbltdLCBhbmdsZUxhYmVscz86IHN0cmluZ1tdKSB7XG4gICAgLy8gaW5pdGlhbGlzZXMgd2l0aCBhbmdsZXMgZ2l2ZW4gZXhwbGljaXRseVxuICAgIGlmIChhbmdsZXMgPT09IFtdKSB7IHRocm93IG5ldyBFcnJvcignTXVzdCBnaXZlIGFuZ2xlcycpIH1cbiAgICBpZiAoTWF0aC5yb3VuZChhbmdsZXMucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSkpICE9PSBhbmdsZVN1bSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBbmdsZSBzdW0gbXVzdCBiZSAke2FuZ2xlU3VtfWApXG4gICAgfVxuXG4gICAgdGhpcy5hbmdsZXMgPSBhbmdsZXMgLy8gbGlzdCBvZiBhbmdsZXNcbiAgICB0aGlzLm1pc3NpbmcgPSBtaXNzaW5nIC8vIHdoaWNoIGFuZ2xlcyBhcmUgbWlzc2luZyAtIGFycmF5IG9mIGJvb2xlYW5zXG4gICAgdGhpcy5hbmdsZVN1bSA9IGFuZ2xlU3VtIC8vIHN1bSBvZiBhbmdsZXNcbiAgICB0aGlzLmFuZ2xlTGFiZWxzID0gYW5nbGVMYWJlbHMgfHwgW11cbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IE9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEge1xuICAgIGNvbnN0IGRlZmF1bHRzIDogUGFydGlhbDxPcHRpb25zPiA9IHtcbiAgICAgIC8qIGFuZ2xlU3VtOiAxODAgKi8gLy8gbXVzdCBiZSBzZXQgYnkgY2FsbGVyXG4gICAgICBtaW5BbmdsZTogMTUsXG4gICAgICBtaW5OOiAyLFxuICAgICAgbWF4TjogNFxuICAgIH1cblxuICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIGxldCBxdWVzdGlvbiA6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhXG4gICAgaWYgKG9wdGlvbnMucmVwZWF0ZWQpIHtcbiAgICAgIHF1ZXN0aW9uID0gdGhpcy5yYW5kb21SZXBlYXRlZChvcHRpb25zKVxuICAgIH0gZWxzZSB7XG4gICAgICBxdWVzdGlvbiA9IHRoaXMucmFuZG9tU2ltcGxlKG9wdGlvbnMpXG4gICAgfVxuICAgIHF1ZXN0aW9uLmluaXRMYWJlbHMoKVxuICAgIHJldHVybiBxdWVzdGlvblxuICB9XG5cbiAgc3RhdGljIHJhbmRvbVNpbXBsZSAob3B0aW9uczogT3B0aW9ucyk6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBpZiAoIW9wdGlvbnMuYW5nbGVTdW0pIHsgdGhyb3cgbmV3IEVycm9yKCdObyBhbmdsZSBzdW0gZ2l2ZW4nKSB9XG5cbiAgICBjb25zdCBhbmdsZVN1bSA9IG9wdGlvbnMuYW5nbGVTdW1cbiAgICBjb25zdCBuID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5OLCBvcHRpb25zLm1heE4pXG4gICAgY29uc3QgbWluQW5nbGUgPSBvcHRpb25zLm1pbkFuZ2xlXG5cbiAgICBpZiAobiA8IDIpIHRocm93IG5ldyBFcnJvcignQ2FuXFwndCBoYXZlIG1pc3NpbmcgZmV3ZXIgdGhhbiAyIGFuZ2xlcycpXG5cbiAgICAvLyBCdWlsZCB1cCBhbmdsZXNcbiAgICBjb25zdCBhbmdsZXMgPSBbXVxuICAgIGxldCBsZWZ0ID0gYW5nbGVTdW1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG4gLSAxOyBpKyspIHtcbiAgICAgIGNvbnN0IG1heEFuZ2xlID0gbGVmdCAtIG1pbkFuZ2xlICogKG4gLSBpIC0gMSlcbiAgICAgIGNvbnN0IG5leHRBbmdsZSA9IHJhbmRCZXR3ZWVuKG1pbkFuZ2xlLCBtYXhBbmdsZSlcbiAgICAgIGxlZnQgLT0gbmV4dEFuZ2xlXG4gICAgICBhbmdsZXMucHVzaChuZXh0QW5nbGUpXG4gICAgfVxuICAgIGFuZ2xlc1tuIC0gMV0gPSBsZWZ0XG5cbiAgICAvLyBwaWNrIG9uZSB0byBiZSBtaXNzaW5nXG4gICAgY29uc3QgbWlzc2luZyA9IFtdXG4gICAgbWlzc2luZy5sZW5ndGggPSBuXG4gICAgbWlzc2luZy5maWxsKGZhbHNlKVxuICAgIG1pc3NpbmdbcmFuZEJldHdlZW4oMCwgbiAtIDEpXSA9IHRydWVcblxuICAgIHJldHVybiBuZXcgdGhpcyhhbmdsZVN1bSwgYW5nbGVzLCBtaXNzaW5nKVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbVJlcGVhdGVkIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBjb25zdCBhbmdsZVN1bTogbnVtYmVyID0gb3B0aW9ucy5hbmdsZVN1bVxuICAgIGNvbnN0IG1pbkFuZ2xlOiBudW1iZXIgPSBvcHRpb25zLm1pbkFuZ2xlXG5cbiAgICBjb25zdCBuOiBudW1iZXIgPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbk4sIG9wdGlvbnMubWF4TilcblxuICAgIGNvbnN0IG06IG51bWJlciA9IG9wdGlvbnMubk1pc3NpbmcgfHwgKE1hdGgucmFuZG9tKCkgPCAwLjEgPyBuIDogcmFuZEJldHdlZW4oMiwgbiAtIDEpKVxuXG4gICAgaWYgKG4gPCAyIHx8IG0gPCAxIHx8IG0gPiBuKSB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgYXJndW1lbnRzOiBuPSR7bn0sIG09JHttfWApXG5cbiAgICAvLyBBbGwgbWlzc2luZyAtIGRvIGFzIGEgc2VwYXJhdGUgY2FzZVxuICAgIGlmIChuID09PSBtKSB7XG4gICAgICBjb25zdCBhbmdsZXMgPSBbXVxuICAgICAgYW5nbGVzLmxlbmd0aCA9IG5cbiAgICAgIGFuZ2xlcy5maWxsKGFuZ2xlU3VtIC8gbilcblxuICAgICAgY29uc3QgbWlzc2luZyA9IFtdXG4gICAgICBtaXNzaW5nLmxlbmd0aCA9IG5cbiAgICAgIG1pc3NpbmcuZmlsbCh0cnVlKVxuXG4gICAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZylcbiAgICB9XG5cbiAgICBjb25zdCBhbmdsZXM6IG51bWJlcltdID0gW11cbiAgICBjb25zdCBtaXNzaW5nOiBib29sZWFuW10gPSBbXVxuICAgIG1pc3NpbmcubGVuZ3RoID0gblxuICAgIG1pc3NpbmcuZmlsbChmYWxzZSlcblxuICAgIC8vIGNob29zZSBhIHZhbHVlIGZvciB0aGUgbWlzc2luZyBhbmdsZXNcbiAgICBjb25zdCBtYXhSZXBlYXRlZEFuZ2xlID0gKGFuZ2xlU3VtIC0gbWluQW5nbGUgKiAobiAtIG0pKSAvIG1cbiAgICBjb25zdCByZXBlYXRlZEFuZ2xlID0gcmFuZEJldHdlZW4obWluQW5nbGUsIG1heFJlcGVhdGVkQW5nbGUpXG5cbiAgICAvLyBjaG9vc2UgdmFsdWVzIGZvciB0aGUgb3RoZXIgYW5nbGVzXG4gICAgY29uc3Qgb3RoZXJBbmdsZXM6IG51bWJlcltdID0gW11cbiAgICBsZXQgbGVmdCA9IGFuZ2xlU3VtIC0gcmVwZWF0ZWRBbmdsZSAqIG1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG4gLSBtIC0gMTsgaSsrKSB7XG4gICAgICBjb25zdCBtYXhBbmdsZSA9IGxlZnQgLSBtaW5BbmdsZSAqIChuIC0gbSAtIGkgLSAxKVxuICAgICAgY29uc3QgbmV4dEFuZ2xlID0gcmFuZEJldHdlZW4obWluQW5nbGUsIG1heEFuZ2xlKVxuICAgICAgbGVmdCAtPSBuZXh0QW5nbGVcbiAgICAgIG90aGVyQW5nbGVzLnB1c2gobmV4dEFuZ2xlKVxuICAgIH1cbiAgICBvdGhlckFuZ2xlc1tuIC0gbSAtIDFdID0gbGVmdFxuXG4gICAgLy8gY2hvb3NlIHdoZXJlIHRoZSBtaXNzaW5nIGFuZ2xlcyBhcmVcbiAgICB7XG4gICAgICBsZXQgaSA9IDBcbiAgICAgIHdoaWxlIChpIDwgbSkge1xuICAgICAgICBjb25zdCBqID0gcmFuZEJldHdlZW4oMCwgbiAtIDEpXG4gICAgICAgIGlmIChtaXNzaW5nW2pdID09PSBmYWxzZSkge1xuICAgICAgICAgIG1pc3Npbmdbal0gPSB0cnVlXG4gICAgICAgICAgYW5nbGVzW2pdID0gcmVwZWF0ZWRBbmdsZVxuICAgICAgICAgIGkrK1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZmlsbCBpbiB0aGUgb3RoZXIgYW5nbGVzXG4gICAge1xuICAgICAgbGV0IGogPSAwXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICBpZiAobWlzc2luZ1tpXSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBhbmdsZXNbaV0gPSBvdGhlckFuZ2xlc1tqXVxuICAgICAgICAgIGorK1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgdGhpcyhhbmdsZVN1bSwgYW5nbGVzLCBtaXNzaW5nKVxuICB9XG5cbiAgaW5pdExhYmVscyAoKSA6IHZvaWQge1xuICAgIGNvbnN0IG4gPSB0aGlzLmFuZ2xlcy5sZW5ndGhcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgaWYgKCF0aGlzLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgdGhpcy5hbmdsZUxhYmVsc1tpXSA9IGAke3RoaXMuYW5nbGVzW2ldLnRvU3RyaW5nKCl9XlxcXFxjaXJjYFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5hbmdsZUxhYmVsc1tpXSA9ICd4XlxcXFxjaXJjJ1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwiLyogUXVlc3Rpb24gdHlwZSBjb21wcmlzaW5nIG51bWVyaWNhbCBtaXNzaW5nIGFuZ2xlcyBhcm91bmQgYSBwb2ludCBhbmRcbiAqIGFuZ2xlcyBvbiBhIHN0cmFpZ2h0IGxpbmUgKHNpbmNlIHRoZXNlIGFyZSB2ZXJ5IHNpbWlsYXIgbnVtZXJpY2FsbHkgYXMgd2VsbFxuICogYXMgZ3JhcGhpY2FsbHkuXG4gKlxuICogQWxzbyBjb3ZlcnMgY2FzZXMgd2hlcmUgbW9yZSB0aGFuIG9uZSBhbmdsZSBpcyBlcXVhbFxuICpcbiAqL1xuXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc051bWJlckRhdGEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YVxuICB2aWV3OiBNaXNzaW5nQW5nbGVzQXJvdW5kVmlld1xuXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSwgdmlldzogTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcpIHsgLy8gZWZmZWN0aXZlbHkgcHJpdmF0ZVxuICAgIHN1cGVyKCkgLy8gYnViYmxlcyB0byBRXG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIHRoaXMudmlldyA9IHZpZXdcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IE1pc3NpbmdBbmdsZU9wdGlvbnMsIHZpZXdPcHRpb25zOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc0Fyb3VuZFEge1xuICAgIGNvbnN0IGRlZmF1bHRzIDogTWlzc2luZ0FuZ2xlT3B0aW9ucyA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5BbmdsZTogMTAsXG4gICAgICBtaW5OOiAyLFxuICAgICAgbWF4TjogNCxcbiAgICAgIHJlcGVhdGVkOiBmYWxzZVxuICAgIH1cbiAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc051bWJlckRhdGEucmFuZG9tKG9wdGlvbnMpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyhkYXRhLCB2aWV3T3B0aW9ucykgLy8gVE9ETyBlbGltaW5hdGUgcHVibGljIGNvbnN0cnVjdG9yc1xuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kUShkYXRhLCB2aWV3KVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSA6IHN0cmluZyB7IHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZScgfVxufVxuIiwiaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgR3JhcGhpY1FWaWV3LCBMYWJlbCB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IHsgc2luRGVnLCBkYXNoZWRMaW5lLCByb3VuZERQIH0gZnJvbSAnVXRpbGl0aWVzJ1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IGV4dGVuZHMgR3JhcGhpY1FWaWV3IHtcbiAgQSA6IFBvaW50IC8vIHRoZSB2ZXJ0aWNlcyBvZiB0aGUgdHJpYW5nbGVcbiAgQiA6IFBvaW50XG4gIEMgOiBQb2ludFxuICByb3RhdGlvbjogbnVtYmVyXG4gIC8vIEluaGVyaXRlZCBtZW1iZXJzOlxuICBsYWJlbHM6IExhYmVsW11cbiAgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudFxuICBET006IEhUTUxFbGVtZW50XG4gIHdpZHRoOiBudW1iZXJcbiAgaGVpZ2h0OiBudW1iZXJcbiAgZGF0YTogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YVxuXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhLCBvcHRpb25zOiBWaWV3T3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIHNldHMgdGhpcy53aWR0aCB0aGlzLmhlaWdodCwgdGhpcy5kYXRhIGluaXRpYWxpc2VzIHRoaXMubGFiZWxzLCBjcmVhdGVzIGRvbSBlbGVtZW50c1xuICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aFxuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuaGVpZ2h0XG5cbiAgICAvLyBnZW5lcmF0ZSBwb2ludHMgKHdpdGggbG9uZ2VzdCBzaWRlIDFcbiAgICB0aGlzLkEgPSBuZXcgUG9pbnQoMCwgMClcbiAgICB0aGlzLkIgPSBQb2ludC5mcm9tUG9sYXJEZWcoMSwgZGF0YS5hbmdsZXNbMF0pXG4gICAgdGhpcy5DID0gbmV3IFBvaW50KFxuICAgICAgc2luRGVnKHRoaXMuZGF0YS5hbmdsZXNbMV0pIC8gc2luRGVnKHRoaXMuZGF0YS5hbmdsZXNbMl0pLCAwXG4gICAgKVxuXG4gICAgLy8gQ3JlYXRlIGxhYmVsc1xuICAgIGNvbnN0IGluQ2VudGVyID0gUG9pbnQuaW5DZW50ZXIodGhpcy5BLCB0aGlzLkIsIHRoaXMuQylcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICBjb25zdCBwID0gW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdW2ldXG5cbiAgICAgIGNvbnN0IGxhYmVsIDogUGFydGlhbDxMYWJlbD4gPSB7XG4gICAgICAgIHRleHRxOiB0aGlzLmRhdGEuYW5nbGVMYWJlbHNbaV0sXG4gICAgICAgIHRleHQ6IHRoaXMuZGF0YS5hbmdsZUxhYmVsc1tpXSxcbiAgICAgICAgc3R5bGVxOiAnbm9ybWFsJyxcbiAgICAgICAgc3R5bGU6ICdub3JtYWwnLFxuICAgICAgICBwb3M6IFBvaW50Lm1lYW4ocCwgcCwgaW5DZW50ZXIpXG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmRhdGEubWlzc2luZ1tpXSkge1xuICAgICAgICBsYWJlbC50ZXh0YSA9IHJvdW5kRFAodGhpcy5kYXRhLmFuZ2xlc1tpXSwgMikudG9TdHJpbmcoKSArICdeXFxcXGNpcmMnXG4gICAgICAgIGxhYmVsLnN0eWxlYSA9ICdhbnN3ZXInXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsYWJlbC50ZXh0YSA9IGxhYmVsLnRleHRxXG4gICAgICAgIGxhYmVsLnN0eWxlYSA9IGxhYmVsLnN0eWxlcVxuICAgICAgfVxuXG4gICAgICB0aGlzLmxhYmVsc1tpXSA9IGxhYmVsIGFzIExhYmVsXG4gICAgfVxuXG4gICAgLy8gcm90YXRlIHJhbmRvbWx5XG4gICAgdGhpcy5yb3RhdGlvbiA9IChvcHRpb25zLnJvdGF0aW9uICE9PSB1bmRlZmluZWQpID8gdGhpcy5yb3RhdGUob3B0aW9ucy5yb3RhdGlvbikgOiB0aGlzLnJhbmRvbVJvdGF0ZSgpXG5cbiAgICAvLyBzY2FsZSBhbmQgZml0XG4gICAgLy8gc2NhbGUgdG8gc2l6ZVxuICAgIGNvbnN0IG1hcmdpbiA9IDBcbiAgICBsZXQgdG9wbGVmdCA9IFBvaW50Lm1pbihbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgbGV0IGJvdHRvbXJpZ2h0ID0gUG9pbnQubWF4KFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBjb25zdCB0b3RhbFdpZHRoID0gYm90dG9tcmlnaHQueCAtIHRvcGxlZnQueFxuICAgIGNvbnN0IHRvdGFsSGVpZ2h0ID0gYm90dG9tcmlnaHQueSAtIHRvcGxlZnQueVxuICAgIHRoaXMuc2NhbGUoTWF0aC5taW4oKHdpZHRoIC0gbWFyZ2luKSAvIHRvdGFsV2lkdGgsIChoZWlnaHQgLSBtYXJnaW4pIC8gdG90YWxIZWlnaHQpKSAvLyAxNXB4IG1hcmdpblxuXG4gICAgLy8gbW92ZSB0byBjZW50cmVcbiAgICB0b3BsZWZ0ID0gUG9pbnQubWluKFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBib3R0b21yaWdodCA9IFBvaW50Lm1heChbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbih0b3BsZWZ0LCBib3R0b21yaWdodClcbiAgICB0aGlzLnRyYW5zbGF0ZSh3aWR0aCAvIDIgLSBjZW50ZXIueCwgaGVpZ2h0IC8gMiAtIGNlbnRlci55KSAvLyBjZW50cmVcbiAgfVxuXG4gIHJlbmRlciAoKSA6IHZvaWQge1xuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICBjb25zdCB2ZXJ0aWNlcyA9IFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXVxuICAgIGNvbnN0IGFwZXggPSB0aGlzLmRhdGEuYXBleCAvLyBobW1tXG5cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpIC8vIGNsZWFyXG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBjdHgubW92ZVRvKHRoaXMuQS54LCB0aGlzLkEueSlcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICBjb25zdCBwID0gdmVydGljZXNbaV1cbiAgICAgIGNvbnN0IG5leHQgPSB2ZXJ0aWNlc1soaSArIDEpICUgM11cbiAgICAgIGlmIChhcGV4ID09PSBpIHx8IGFwZXggPT09IChpICsgMSkgJSAzKSB7IC8vIHRvL2Zyb20gYXBleCAtIGRyYXcgZGFzaGVkIGxpbmVcbiAgICAgICAgZGFzaGVkTGluZShjdHgsIHAueCwgcC55LCBuZXh0LngsIG5leHQueSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGN0eC5saW5lVG8obmV4dC54LCBuZXh0LnkpXG4gICAgICB9XG4gICAgfVxuICAgIGN0eC5zdHJva2VTdHlsZSA9ICdncmF5J1xuICAgIGN0eC5zdHJva2UoKVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoZmFsc2UpXG4gIH1cblxuICBnZXQgYWxscG9pbnRzICgpIDogUG9pbnRbXSB7XG4gICAgY29uc3QgYWxscG9pbnRzID0gW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHsgYWxscG9pbnRzLnB1c2gobC5wb3MpIH0pXG4gICAgcmV0dXJuIGFsbHBvaW50c1xuICB9XG59XG4iLCIvKiBFeHRlbmRzIE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIGluIG9yZGVyIHRvIGRvIGlzb3NjZWxlcyB0cmlhbmdsZXMsIHdoaWNoIGdlbmVyYXRlIGEgYml0IGRpZmZlcmVudGx5ICovXG5cbmltcG9ydCB7IGZpcnN0VW5pcXVlSW5kZXggfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc051bWJlckRhdGEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVPcHRpb25zIH0gZnJvbSAnLi9OdW1iZXJPcHRpb25zJ1xuXG50eXBlIE9wdGlvbnMgPSBNaXNzaW5nQW5nbGVPcHRpb25zICYge2dpdmVuQW5nbGU/OiAnYXBleCcgfCAnYmFzZSd9XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEgZXh0ZW5kcyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB7XG4gICAgYXBleD86IDAgfCAxIHwgMiB8IHVuZGVmaW5lZCAvLyB3aGljaCBvZiB0aGUgdGhyZWUgZ2l2ZW4gYW5nbGVzIGlzIHRoZSBhcGV4IG9mIGFuIGlzb3NjZWxlcyB0cmlhbmdsZVxuICAgIGNvbnN0cnVjdG9yIChhbmdsZVN1bTogbnVtYmVyLCBhbmdsZXM6IG51bWJlcltdLCBtaXNzaW5nOiBib29sZWFuW10sIGFuZ2xlTGFiZWxzPzogc3RyaW5nW10sIGFwZXg/OiAwfDF8Mnx1bmRlZmluZWQpIHtcbiAgICAgIHN1cGVyKGFuZ2xlU3VtLCBhbmdsZXMsIG1pc3NpbmcsIGFuZ2xlTGFiZWxzKVxuICAgICAgdGhpcy5hcGV4ID0gYXBleFxuICAgIH1cblxuICAgIHN0YXRpYyByYW5kb21SZXBlYXRlZCAob3B0aW9uczogT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhIHtcbiAgICAgIG9wdGlvbnMubk1pc3NpbmcgPSAyXG4gICAgICBvcHRpb25zLmdpdmVuQW5nbGUgPSBvcHRpb25zLmdpdmVuQW5nbGUgfHwgTWF0aC5yYW5kb20oKSA8IDAuNSA/ICdhcGV4JyA6ICdiYXNlJ1xuXG4gICAgICAvLyBnZW5lcmF0ZSB0aGUgcmFuZG9tIGFuZ2xlcyB3aXRoIHJlcGV0aXRpb24gZmlyc3QgYmVmb3JlIG1hcmtpbmcgYXBleCBmb3IgZHJhd2luZ1xuICAgICAgY29uc3QgcXVlc3Rpb24gPSBzdXBlci5yYW5kb21SZXBlYXRlZChvcHRpb25zKSBhcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhIC8vIGFsbG93ZWQgc2luY2UgdW5kZWZpbmVkIFxcaW4gYXBleFxuXG4gICAgICAvLyBPbGQgaW1wbGVtZW50YXRpb24gaGFkIHNvcnRpbmcgdGhlIGFycmF5IC0gbm90IHN1cmUgd2h5XG4gICAgICAvLyBzb3J0VG9nZXRoZXIocXVlc3Rpb24uYW5nbGVzLHF1ZXN0aW9uLm1pc3NpbmcsKHgseSkgPT4geCAtIHkpXG5cbiAgICAgIHF1ZXN0aW9uLmFwZXggPSBmaXJzdFVuaXF1ZUluZGV4KHF1ZXN0aW9uLmFuZ2xlcykgYXMgMCB8IDEgfCAyXG4gICAgICBxdWVzdGlvbi5taXNzaW5nID0gW3RydWUsIHRydWUsIHRydWVdXG5cbiAgICAgIGlmIChvcHRpb25zLmdpdmVuQW5nbGUgPT09ICdhcGV4Jykge1xuICAgICAgICBxdWVzdGlvbi5taXNzaW5nW3F1ZXN0aW9uLmFwZXhdID0gZmFsc2VcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXN0aW9uLm1pc3NpbmdbKHF1ZXN0aW9uLmFwZXggKyAxKSAlIDNdID0gZmFsc2VcbiAgICAgIH1cblxuICAgICAgcXVlc3Rpb24uaW5pdExhYmVscygpXG5cbiAgICAgIHJldHVybiBxdWVzdGlvblxuICAgIH1cblxuICAgIGluaXRMYWJlbHMgKCk6IHZvaWQge1xuICAgICAgY29uc3QgbiA9IHRoaXMuYW5nbGVzLmxlbmd0aFxuICAgICAgbGV0IGogPSAwIC8vIGtlZXAgdHJhY2sgb2YgdW5rbm93bnNcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGlmICghdGhpcy5taXNzaW5nW2ldKSB7XG4gICAgICAgICAgdGhpcy5hbmdsZUxhYmVsc1tpXSA9IGAke3RoaXMuYW5nbGVzW2ldLnRvU3RyaW5nKCl9XlxcXFxjaXJjYFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuYW5nbGVMYWJlbHNbaV0gPSBgJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDEyMCArIGopfV5cXFxcY2lyY2AgLy8gMTIwID0gJ3gnXG4gICAgICAgICAgaisrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG59XG4iLCIvKiBNaXNzaW5nIGFuZ2xlcyBpbiB0cmlhbmdsZSAtIG51bWVyaWNhbCAqL1xuXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3J1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBjb25zdHJ1Y3RvciAoZGF0YSwgdmlldywgb3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpIC8vIHRoaXMgc2hvdWxkIGJlIGFsbCB0aGF0J3MgcmVxdWlyZWQgd2hlbiByZWZhY3RvcmVkXG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIHRoaXMudmlldyA9IHZpZXdcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnMsIHZpZXdPcHRpb25zKSB7XG4gICAgY29uc3Qgb3B0aW9uc092ZXJyaWRlID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAyNSxcbiAgICAgIG1pbk46IDMsXG4gICAgICBtYXhOOiAzXG4gICAgfVxuICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKG9wdGlvbnMsIG9wdGlvbnNPdmVycmlkZSlcbiAgICBvcHRpb25zLnJlcGVhdGVkID0gb3B0aW9ucy5yZXBlYXRlZCB8fCBmYWxzZVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEucmFuZG9tKG9wdGlvbnMpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3KGRhdGEsIHZpZXdPcHRpb25zKVxuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRKGRhdGEsIHZpZXcsIG9wdGlvbnMpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBMaW5FeHByIHtcbi8vIGNsYXNzIExpbkV4cHIge1xuICBjb25zdHJ1Y3RvciAoYSwgYikge1xuICAgIHRoaXMuYSA9IGFcbiAgICB0aGlzLmIgPSBiXG4gIH1cblxuICBpc0NvbnN0YW50ICgpIHtcbiAgICByZXR1cm4gdGhpcy5hID09PSAwXG4gIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgbGV0IHN0cmluZyA9ICcnXG5cbiAgICAvLyB4IHRlcm1cbiAgICBpZiAodGhpcy5hID09PSAxKSB7IHN0cmluZyArPSAneCcgfSBlbHNlIGlmICh0aGlzLmEgPT09IC0xKSB7IHN0cmluZyArPSAnLXgnIH0gZWxzZSBpZiAodGhpcy5hICE9PSAwKSB7IHN0cmluZyArPSB0aGlzLmEgKyAneCcgfVxuXG4gICAgLy8gc2lnblxuICAgIGlmICh0aGlzLmEgIT09IDAgJiYgdGhpcy5iID4gMCkgeyBzdHJpbmcgKz0gJyArICcgfSBlbHNlIGlmICh0aGlzLmEgIT09IDAgJiYgdGhpcy5iIDwgMCkgeyBzdHJpbmcgKz0gJyAtICcgfVxuXG4gICAgLy8gY29uc3RhbnRcbiAgICBpZiAodGhpcy5iID4gMCkgeyBzdHJpbmcgKz0gdGhpcy5iIH0gZWxzZSBpZiAodGhpcy5iIDwgMCAmJiB0aGlzLmEgPT09IDApIHsgc3RyaW5nICs9IHRoaXMuYiB9IGVsc2UgaWYgKHRoaXMuYiA8IDApIHsgc3RyaW5nICs9IE1hdGguYWJzKHRoaXMuYikgfVxuXG4gICAgcmV0dXJuIHN0cmluZ1xuICB9XG5cbiAgdG9TdHJpbmdQICgpIHtcbiAgICAvLyByZXR1cm4gZXhwcmVzc2lvbiBhcyBhIHN0cmluZywgc3Vycm91bmRlZCBpbiBwYXJlbnRoZXNlcyBpZiBhIGJpbm9taWFsXG4gICAgaWYgKHRoaXMuYSA9PT0gMCB8fCB0aGlzLmIgPT09IDApIHJldHVybiB0aGlzLnRvU3RyaW5nKClcbiAgICBlbHNlIHJldHVybiAnKCcgKyB0aGlzLnRvU3RyaW5nKCkgKyAnKSdcbiAgfVxuXG4gIGV2YWwgKHgpIHtcbiAgICByZXR1cm4gdGhpcy5hICogeCArIHRoaXMuYlxuICB9XG5cbiAgYWRkICh0aGF0KSB7XG4gICAgLy8gYWRkIGVpdGhlciBhbiBleHByZXNzaW9uIG9yIGEgY29uc3RhbnRcbiAgICBpZiAodGhhdC5hICE9PSB1bmRlZmluZWQpIHJldHVybiBuZXcgTGluRXhwcih0aGlzLmEgKyB0aGF0LmEsIHRoaXMuYiArIHRoYXQuYilcbiAgICBlbHNlIHJldHVybiBuZXcgTGluRXhwcih0aGlzLmEsIHRoaXMuYiArIHRoYXQpXG4gIH1cblxuICB0aW1lcyAodGhhdCkge1xuICAgIHJldHVybiBuZXcgTGluRXhwcih0aGlzLmEgKiB0aGF0LCB0aGlzLmIgKiB0aGF0KVxuICB9XG5cbiAgc3RhdGljIHNvbHZlIChleHByMSwgZXhwcjIpIHtcbiAgICAvLyBzb2x2ZXMgdGhlIHR3byBleHByZXNzaW9ucyBzZXQgZXF1YWwgdG8gZWFjaCBvdGhlclxuICAgIHJldHVybiAoZXhwcjIuYiAtIGV4cHIxLmIpIC8gKGV4cHIxLmEgLSBleHByMi5hKVxuICB9XG59XG4iLCJpbXBvcnQgTGluRXhwciBmcm9tICdMaW5FeHByJ1xuXG4vKiogR2l2ZW4gYSBzZXQgb2YgZXhwcmVzc2lvbnMsIHNldCB0aGVpciBzdW0gICovXG5cbmV4cG9ydCBmdW5jdGlvbiBzb2x2ZUFuZ2xlcyAoZXhwcmVzc2lvbnM6IExpbkV4cHJbXSwgYW5nbGVTdW06IG51bWJlcik6IHsgeDogbnVtYmVyOyBhbmdsZXM6IG51bWJlcltdOyB9IHtcbiAgY29uc3QgZXhwcmVzc2lvblN1bSA9IGV4cHJlc3Npb25zLnJlZHVjZSgoZXhwMSwgZXhwMikgPT4gZXhwMS5hZGQoZXhwMikpXG4gIGNvbnN0IHggPSBMaW5FeHByLnNvbHZlKGV4cHJlc3Npb25TdW0sIG5ldyBMaW5FeHByKDAsIGFuZ2xlU3VtKSlcblxuICBjb25zdCBhbmdsZXMgPSBbXVxuICBleHByZXNzaW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChleHByKSB7XG4gICAgY29uc3QgYW5nbGUgPSBleHByLmV2YWwoeClcbiAgICBpZiAoYW5nbGUgPD0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCduZWdhdGl2ZSBhbmdsZScpXG4gICAgfSBlbHNlIHtcbiAgICAgIGFuZ2xlcy5wdXNoKGV4cHIuZXZhbCh4KSlcbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuICh7IHg6IHgsIGFuZ2xlczogYW5nbGVzIH0pXG59XG4iLCJpbXBvcnQgTGluRXhwciBmcm9tICdMaW5FeHByJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4sIHJhbmRFbGVtLCByYW5kTXVsdEJldHdlZW4sIHNodWZmbGUsIHdlYWtJbmNsdWRlcyB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCB7IEFsZ2VicmFPcHRpb25zIH0gZnJvbSAnLi9BbGdlYnJhT3B0aW9ucydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzRGF0YSdcbmltcG9ydCB7IHNvbHZlQW5nbGVzIH0gZnJvbSAnLi9zb2x2ZUFuZ2xlcydcblxudHlwZSBPcHRpb25zID0gQWxnZWJyYU9wdGlvbnNcblxuZXhwb3J0IHR5cGUgRXhwcmVzc2lvblR5cGUgPSAnYWRkJyB8ICdtdWx0aXBseScgfCAnbWl4ZWQnXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgaW1wbGVtZW50cyBNaXNzaW5nQW5nbGVzRGF0YSB7XG4gICAgYW5nbGVzOiBudW1iZXJbXVxuICAgIG1pc3Npbmc6IGJvb2xlYW5bXVxuICAgIGFuZ2xlU3VtOiBudW1iZXJcbiAgICBhbmdsZUxhYmVsczogc3RyaW5nW11cbiAgICB4OiBudW1iZXIgLy9cblxuICAgIGNvbnN0cnVjdG9yIChhbmdsZXM6IG51bWJlcltdLCBtaXNzaW5nOiBib29sZWFuW10sIGFuZ2xlU3VtOiBudW1iZXIsIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSwgeDogbnVtYmVyKSB7XG4gICAgICB0aGlzLmFuZ2xlcyA9IGFuZ2xlc1xuICAgICAgdGhpcy5hbmdsZVN1bSA9IGFuZ2xlU3VtXG4gICAgICB0aGlzLmFuZ2xlTGFiZWxzID0gYW5nbGVMYWJlbHNcbiAgICAgIHRoaXMueCA9IHhcbiAgICAgIHRoaXMubWlzc2luZyA9IG1pc3NpbmdcbiAgICB9XG5cbiAgICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSB7XG4gICAgICBjb25zdCBkZWZhdWx0cyA6IFBhcnRpYWw8T3B0aW9ucz4gPSB7XG4gICAgICAgIGV4cHJlc3Npb25UeXBlczogWydhZGQnLCAnbXVsdGlwbHknLCAnbWl4ZWQnXSxcbiAgICAgICAgZW5zdXJlWDogdHJ1ZSxcbiAgICAgICAgaW5jbHVkZUNvbnN0YW50czogdHJ1ZSxcbiAgICAgICAgbWluQ29lZmZpY2llbnQ6IDEsXG4gICAgICAgIG1heENvZWZmaWNpZW50OiA0LFxuICAgICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgICBtaW5BbmdsZTogMjAsXG4gICAgICAgIG1pbk46IDIsXG4gICAgICAgIG1heE46IDQsXG4gICAgICAgIG1pblhWYWx1ZTogMTVcbiAgICAgIH1cbiAgICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgICAgLy8gYXNzaWduIGNhbGN1bGF0ZWQgZGVmYXVsdHM6XG4gICAgICBvcHRpb25zLm1heENvbnN0YW50ID0gb3B0aW9ucy5tYXhDb25zdGFudCB8fCBvcHRpb25zLmFuZ2xlU3VtIC8gMlxuICAgICAgb3B0aW9ucy5tYXhYVmFsdWUgPSBvcHRpb25zLm1heFhWYWx1ZSB8fCBvcHRpb25zLmFuZ2xlU3VtIC8gNFxuXG4gICAgICAvLyBSYW5kb21pc2Uvc2V0IHVwIG1haW4gZmVhdHVyZXNcbiAgICAgIGNvbnN0IG4gOiBudW1iZXIgPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbk4sIG9wdGlvbnMubWF4TilcblxuICAgICAgY29uc3QgdHlwZSA6IEV4cHJlc3Npb25UeXBlID0gcmFuZEVsZW0ob3B0aW9ucy5leHByZXNzaW9uVHlwZXMpXG5cbiAgICAgIC8vIEdlbmVyYXRlIGV4cHJlc3Npb25zL2FuZ2xlc1xuICAgICAgbGV0IGV4cHJlc3Npb25zIDogTGluRXhwcltdXG4gICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSAnbWl4ZWQnOlxuICAgICAgICAgIGV4cHJlc3Npb25zID0gbWFrZU1peGVkRXhwcmVzc2lvbnMobiwgb3B0aW9ucylcbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICdtdWx0aXBseSc6XG4gICAgICAgICAgZXhwcmVzc2lvbnMgPSBtYWtlTXVsdGlwbGljYXRpb25FeHByZXNzaW9ucyhuLCBvcHRpb25zKVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ2FkZCc6XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgZXhwcmVzc2lvbnMgPSBtYWtlQWRkRXhwcmVzc2lvbnMobiwgb3B0aW9ucylcbiAgICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgZXhwcmVzc2lvbnMgPSBzaHVmZmxlKGV4cHJlc3Npb25zKVxuXG4gICAgICAvLyBTb2x2ZSBmb3IgeCBhbmQgYW5nbGVzXG4gICAgICBjb25zdCB7IHgsIGFuZ2xlcyB9IDoge3g6bnVtYmVyLCBhbmdsZXM6IG51bWJlcltdfSA9IHNvbHZlQW5nbGVzKGV4cHJlc3Npb25zLCBvcHRpb25zLmFuZ2xlU3VtKVxuXG4gICAgICAvLyBsYWJlbHMgYXJlIGp1c3QgZXhwcmVzc2lvbnMgYXMgc3RyaW5nc1xuICAgICAgY29uc3QgbGFiZWxzID0gZXhwcmVzc2lvbnMubWFwKGUgPT4gYCR7ZS50b1N0cmluZ1AoKX1eXFxcXGNpcmNgKVxuXG4gICAgICAvLyBtaXNzaW5nIHZhbHVlcyBhcmUgdGhlIG9uZXMgd2hpY2ggYXJlbid0IGNvbnN0YW50XG4gICAgICBjb25zdCBtaXNzaW5nID0gZXhwcmVzc2lvbnMubWFwKGUgPT4gIWUuaXNDb25zdGFudCgpKVxuXG4gICAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YShhbmdsZXMsIG1pc3NpbmcsIG9wdGlvbnMuYW5nbGVTdW0sIGxhYmVscywgeClcbiAgICB9XG5cbiAgICAvLyBtYWtlcyB0eXBlc2NyaXB0IHNodXQgdXAsIG1ha2VzIGVzbGludCBub2lzeVxuICAgIGluaXRMYWJlbHMgKCkgOiB2b2lkIHt9ICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG59XG5cbmZ1bmN0aW9uIG1ha2VNaXhlZEV4cHJlc3Npb25zIChuOiBudW1iZXIsIG9wdGlvbnM6IE9wdGlvbnMpIDogTGluRXhwcltdIHtcbiAgY29uc3QgZXhwcmVzc2lvbnM6IExpbkV4cHJbXSA9IFtdXG4gIGNvbnN0IHggPSByYW5kQmV0d2VlbihvcHRpb25zLm1pblhWYWx1ZSwgb3B0aW9ucy5tYXhYVmFsdWUpXG4gIGxldCBsZWZ0ID0gb3B0aW9ucy5hbmdsZVN1bVxuICBsZXQgYWxsY29uc3RhbnQgPSB0cnVlXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbiAtIDE7IGkrKykge1xuICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbigxLCBvcHRpb25zLm1heENvZWZmaWNpZW50KVxuICAgIGxlZnQgLT0gYSAqIHhcbiAgICBjb25zdCBtYXhiID0gTWF0aC5taW4obGVmdCAtIG9wdGlvbnMubWluQW5nbGUgKiAobiAtIGkgLSAxKSwgb3B0aW9ucy5tYXhDb25zdGFudClcbiAgICBjb25zdCBtaW5iID0gb3B0aW9ucy5taW5BbmdsZSAtIGEgKiB4XG4gICAgY29uc3QgYiA9IHJhbmRCZXR3ZWVuKG1pbmIsIG1heGIpXG4gICAgaWYgKGEgIT09IDApIHsgYWxsY29uc3RhbnQgPSBmYWxzZSB9XG4gICAgbGVmdCAtPSBiXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihhLCBiKSlcbiAgfVxuICBjb25zdCBsYXN0TWluWENvZWZmID0gYWxsY29uc3RhbnQgPyAxIDogb3B0aW9ucy5taW5Db2VmZmljaWVudFxuICBjb25zdCBhID0gcmFuZEJldHdlZW4obGFzdE1pblhDb2VmZiwgb3B0aW9ucy5tYXhDb2VmZmljaWVudClcbiAgY29uc3QgYiA9IGxlZnQgLSBhICogeFxuICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKGEsIGIpKVxuXG4gIHJldHVybiBleHByZXNzaW9uc1xufVxuXG5mdW5jdGlvbiBtYWtlQWRkRXhwcmVzc2lvbnMgKG46IG51bWJlciwgb3B0aW9uczogT3B0aW9ucykgOiBMaW5FeHByW10ge1xuICBjb25zdCBleHByZXNzaW9uczogTGluRXhwcltdID0gW11cbiAgY29uc3QgYW5nbGVzOiBudW1iZXJbXSA9IFtdXG4gIGNvbnN0IGNvbnN0YW50cyA9IChvcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPT09IHRydWUgfHwgd2Vha0luY2x1ZGVzKG9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cywgJ2FkZCcpKVxuICBpZiAobiA9PT0gMiAmJiBvcHRpb25zLmVuc3VyZVggJiYgY29uc3RhbnRzKSBuID0gM1xuXG4gIGNvbnN0IHggPSByYW5kQmV0d2VlbihvcHRpb25zLm1pblhWYWx1ZSwgb3B0aW9ucy5tYXhYVmFsdWUpXG4gIGxldCBsZWZ0ID0gb3B0aW9ucy5hbmdsZVN1bVxuICBsZXQgYW5nbGVzTGVmdCA9IG5cblxuICAvLyBmaXJzdCBkbyB0aGUgZXhwcmVzc2lvbnMgZW5zdXJlZCBieSBlbnN1cmVfeCBhbmQgY29uc3RhbnRzXG4gIGlmIChvcHRpb25zLmVuc3VyZVgpIHtcbiAgICBhbmdsZXNMZWZ0LS1cbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKVxuICAgIGFuZ2xlcy5wdXNoKHgpXG4gICAgbGVmdCAtPSB4XG4gIH1cblxuICBpZiAoY29uc3RhbnRzKSB7XG4gICAgYW5nbGVzTGVmdC0tXG4gICAgY29uc3QgYyA9IHJhbmRCZXR3ZWVuKFxuICAgICAgb3B0aW9ucy5taW5BbmdsZSxcbiAgICAgIGxlZnQgLSBvcHRpb25zLm1pbkFuZ2xlICogYW5nbGVzTGVmdFxuICAgIClcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDAsIGMpKVxuICAgIGFuZ2xlcy5wdXNoKGMpXG4gICAgbGVmdCAtPSBjXG4gIH1cblxuICAvLyBtaWRkbGUgYW5nbGVzXG4gIHdoaWxlIChhbmdsZXNMZWZ0ID4gMSkge1xuICAgIC8vIGFkZCAneCtiJyBhcyBhbiBleHByZXNzaW9uLiBNYWtlIHN1cmUgYiBnaXZlcyBzcGFjZVxuICAgIGFuZ2xlc0xlZnQtLVxuICAgIGxlZnQgLT0geFxuICAgIGNvbnN0IG1heGIgPSBNYXRoLm1pbihcbiAgICAgIGxlZnQgLSBvcHRpb25zLm1pbkFuZ2xlICogYW5nbGVzTGVmdCxcbiAgICAgIG9wdGlvbnMubWF4Q29uc3RhbnRcbiAgICApXG4gICAgY29uc3QgbWluYiA9IE1hdGgubWF4KFxuICAgICAgb3B0aW9ucy5taW5BbmdsZSAtIHgsXG4gICAgICAtb3B0aW9ucy5tYXhDb25zdGFudFxuICAgIClcbiAgICBjb25zdCBiID0gcmFuZEJldHdlZW4obWluYiwgbWF4YilcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIGIpKVxuICAgIGFuZ2xlcy5wdXNoKHggKyBiKVxuICAgIGxlZnQgLT0gYlxuICB9XG5cbiAgLy8gbGFzdCBhbmdsZVxuICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIGxlZnQgLSB4KSlcbiAgYW5nbGVzLnB1c2gobGVmdClcblxuICByZXR1cm4gZXhwcmVzc2lvbnNcbn1cblxuZnVuY3Rpb24gbWFrZU11bHRpcGxpY2F0aW9uRXhwcmVzc2lvbnMgKG46IG51bWJlciwgb3B0aW9uczogT3B0aW9ucykgOiBMaW5FeHByW10ge1xuICBjb25zdCBleHByZXNzaW9ucyA6IExpbkV4cHJbXSA9IFtdXG5cbiAgY29uc3QgY29uc3RhbnRzIDogYm9vbGVhbiA9IChvcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPT09IHRydWUgfHwgd2Vha0luY2x1ZGVzKG9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cywgJ211bHQnKSlcbiAgaWYgKG4gPT09IDIgJiYgb3B0aW9ucy5lbnN1cmVYICYmIGNvbnN0YW50cykgbiA9IDMgLy8gbmVlZCBhdCBsZWFzdCAzIGFuZ2xlcyBmb3IgdGhpcyB0byBtYWtlIHNlbnNlXG5cbiAgLy8gY2hvb3NlIGEgdG90YWwgb2YgY29lZmZpY2llbnRzXG4gIC8vIHBpY2sgeCBiYXNlZCBvbiB0aGF0XG4gIGxldCBhbmdsZXNsZWZ0ID0gblxuICBjb25zdCB0b3RhbENvZWZmID0gY29uc3RhbnRzXG4gICAgPyByYW5kQmV0d2VlbihuLCAob3B0aW9ucy5hbmdsZVN1bSAtIG9wdGlvbnMubWluQW5nbGUpIC8gb3B0aW9ucy5taW5BbmdsZSwgTWF0aC5yYW5kb20pIC8vIGlmIGl0J3MgdG9vIGJpZywgYW5nbGVzIGdldCB0b28gc21hbGxcbiAgICA6IHJhbmRFbGVtKFszLCA0LCA1LCA2LCA4LCA5LCAxMF0uZmlsdGVyKHggPT4geCA+PSBuKSwgTWF0aC5yYW5kb20pXG4gIGxldCBjb2VmZmxlZnQgPSB0b3RhbENvZWZmXG5cbiAgLy8gZmlyc3QgMC8xLzJcbiAgaWYgKGNvbnN0YW50cykge1xuICAgIC8vIHJlZHVjZSB0byBtYWtlIHdoYXQncyBsZWZ0IGEgbXVsdGlwbGUgb2YgdG90YWxfY29lZmZcbiAgICBhbmdsZXNsZWZ0LS1cbiAgICBjb25zdCBuZXdsZWZ0ID0gcmFuZE11bHRCZXR3ZWVuKHRvdGFsQ29lZmYgKiBvcHRpb25zLm1pbkFuZ2xlLCBvcHRpb25zLmFuZ2xlU3VtIC0gb3B0aW9ucy5taW5BbmdsZSwgdG90YWxDb2VmZilcbiAgICBjb25zdCBjID0gb3B0aW9ucy5hbmdsZVN1bSAtIG5ld2xlZnRcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDAsIGMpKVxuICB9XG5cbiAgLy8gRG9uJ3QgdXNlIHggaGVyZSwgYnV0OlxuICAvLyB4ID0gbGVmdCAvIHRvdGFsQ29lZmZcblxuICBpZiAob3B0aW9ucy5lbnN1cmVYKSB7XG4gICAgYW5nbGVzbGVmdC0tXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCAwKSlcbiAgICBjb2VmZmxlZnQgLT0gMVxuICB9XG5cbiAgLy8gbWlkZGxlXG4gIHdoaWxlIChhbmdsZXNsZWZ0ID4gMSkge1xuICAgIGFuZ2xlc2xlZnQtLVxuICAgIGNvbnN0IG1pbmEgPSAxXG4gICAgY29uc3QgbWF4YSA9IGNvZWZmbGVmdCAtIGFuZ2xlc2xlZnQgLy8gbGVhdmUgZW5vdWdoIGZvciBvdGhlcnMgVE9ETzogYWRkIG1heF9jb2VmZlxuICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbihtaW5hLCBtYXhhKVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoYSwgMCkpXG4gICAgY29lZmZsZWZ0IC09IGFcbiAgfVxuXG4gIC8vIGxhc3RcbiAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihjb2VmZmxlZnQsIDApKVxuICByZXR1cm4gZXhwcmVzc2lvbnNcbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3IGV4dGVuZHMgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcge1xuICAgIE8gOiBQb2ludFxuICAgIEE6IFBvaW50XG4gICAgQzogUG9pbnRbXVxuICAgIGxhYmVsczogTGFiZWxbXVxuICAgIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnRcbiAgICBET006IEhUTUxFbGVtZW50XG4gICAgcm90YXRpb246IG51bWJlclxuICAgIHdpZHRoOiBudW1iZXJcbiAgICBoZWlnaHQ6IG51bWJlclxuICAgIGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YVxuXG4gICAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSwgb3B0aW9uczogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSB7XG4gICAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBzdXBlciBjb25zdHJ1Y3RvciBkb2VzIHJlYWwgd29ya1xuICAgICAgY29uc3Qgc29sdXRpb25MYWJlbDogUGFydGlhbDxMYWJlbD4gPSB7XG4gICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwKSxcbiAgICAgICAgdGV4dHE6ICcnLFxuICAgICAgICB0ZXh0YTogYHggPSAke3RoaXMuZGF0YS54fV5cXFxcY2lyY2AsXG4gICAgICAgIHN0eWxlcTogJ2hpZGRlbicsXG4gICAgICAgIHN0eWxlYTogJ2V4dHJhLWFuc3dlcidcbiAgICAgIH1cbiAgICAgIHNvbHV0aW9uTGFiZWwuc3R5bGUgPSBzb2x1dGlvbkxhYmVsLnN0eWxlcVxuICAgICAgc29sdXRpb25MYWJlbC50ZXh0ID0gc29sdXRpb25MYWJlbC50ZXh0cVxuXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKHNvbHV0aW9uTGFiZWwgYXMgTGFiZWwpXG4gICAgfVxufVxuIiwiLyoqIE1pc3NpbmcgYW5nbGVzIGFyb3VuZCBhIHBvaW50IG9yIG9uIGEgc3RyYWlnaHQgbGluZSwgdXNpbmcgYWxnZWJyYWljIGV4cHJlc3Npb25zICovXG5cbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgeyBBbGdlYnJhT3B0aW9ucyB9IGZyb20gJy4vQWxnZWJyYU9wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YVxuICB2aWV3OiBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXdcblxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLCB2aWV3OiBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcpIHsgLy8gZWZmZWN0aXZlbHkgcHJpdmF0ZVxuICAgIHN1cGVyKCkgLy8gYnViYmxlcyB0byBRXG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIHRoaXMudmlldyA9IHZpZXdcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IEFsZ2VicmFPcHRpb25zLCB2aWV3T3B0aW9uczogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSB7XG4gICAgY29uc3QgZGVmYXVsdHMgOiBBbGdlYnJhT3B0aW9ucyA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5BbmdsZTogMTAsXG4gICAgICBtaW5OOiAyLFxuICAgICAgbWF4TjogNCxcbiAgICAgIHJlcGVhdGVkOiBmYWxzZVxuICAgIH1cbiAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3KGRhdGEsIHZpZXdPcHRpb25zKSAvLyBUT0RPIGVsaW1pbmF0ZSBwdWJsaWMgY29uc3RydWN0b3JzXG5cbiAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUShkYXRhLCB2aWV3KVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSA6IHN0cmluZyB7IHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZScgfVxufVxuIiwiaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgTGFiZWwgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFWaWV3IGV4dGVuZHMgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YVxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLCBvcHRpb25zOiBWaWV3T3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpXG5cbiAgICBjb25zdCBzb2x1dGlvbkxhYmVsOiBQYXJ0aWFsPExhYmVsPiA9IHtcbiAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwKSxcbiAgICAgIHRleHRxOiAnJyxcbiAgICAgIHRleHRhOiBgeCA9ICR7dGhpcy5kYXRhLnh9XlxcXFxjaXJjYCxcbiAgICAgIHN0eWxlcTogJ2hpZGRlbicsXG4gICAgICBzdHlsZWE6ICdleHRyYS1hbnN3ZXInXG4gICAgfVxuICAgIHNvbHV0aW9uTGFiZWwuc3R5bGUgPSBzb2x1dGlvbkxhYmVsLnN0eWxlcVxuICAgIHNvbHV0aW9uTGFiZWwudGV4dCA9IHNvbHV0aW9uTGFiZWwudGV4dHFcblxuICAgIHRoaXMubGFiZWxzLnB1c2goc29sdXRpb25MYWJlbCBhcyBMYWJlbClcbiAgfVxufVxuIiwiaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCB7IEFsZ2VicmFPcHRpb25zIH0gZnJvbSAnLi9BbGdlYnJhT3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldydcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YVxuICB2aWV3OiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3XG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSwgdmlldzogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldykge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgdGhpcy52aWV3ID0gdmlld1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogQWxnZWJyYU9wdGlvbnMsIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUSB7XG4gICAgY29uc3Qgb3B0aW9uc092ZXJyaWRlIDogQWxnZWJyYU9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDMsXG4gICAgICByZXBlYXRlZDogZmFsc2VcbiAgICB9XG4gICAgT2JqZWN0LmFzc2lnbihvcHRpb25zLCBvcHRpb25zT3ZlcnJpZGUpXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVZpZXcoZGF0YSwgdmlld09wdGlvbnMpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzV29yZGVkRGF0YSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkVmlldyBleHRlbmRzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcge1xuICBkYXRhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YVxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEsIG9wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucylcbiAgICBzdXBlci5zY2FsZVRvRml0KHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0LCA0MClcbiAgICBzdXBlci50cmFuc2xhdGUoMCwgLTMwKVxuXG4gICAgY29uc3QgaW5zdHJ1Y3Rpb25MYWJlbDogTGFiZWwgPSB7XG4gICAgICB0ZXh0cTogdGhpcy5kYXRhLmluc3RydWN0aW9ucy5qb2luKCdcXFxcXFxcXCcpLFxuICAgICAgdGV4dGE6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHRleHQ6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHN0eWxlcTogJ2V4dHJhLWluZm8nLFxuICAgICAgc3R5bGVhOiAnZXh0cmEtaW5mbycsXG4gICAgICBzdHlsZTogJ2V4dHJhLWluZm8nLFxuICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIHRoaXMuaGVpZ2h0IC0gMTApXG4gICAgfVxuICAgIHRoaXMubGFiZWxzLnB1c2goaW5zdHJ1Y3Rpb25MYWJlbClcbiAgfVxufVxuIiwiaW1wb3J0IExpbkV4cHIgZnJvbSAnTGluRXhwcidcbmltcG9ydCB7IHJhbmRCZXR3ZWVuLCByYW5kRWxlbSwgcmFuZE11bHRCZXR3ZWVuIH0gZnJvbSAnVXRpbGl0aWVzJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSdcbmltcG9ydCB7IHNvbHZlQW5nbGVzIH0gZnJvbSAnLi9zb2x2ZUFuZ2xlcydcbmltcG9ydCB7IFdvcmRlZE9wdGlvbnMgfSBmcm9tICcuL1dvcmRlZE9wdGlvbnMnXG5cbmV4cG9ydCB0eXBlIFdvcmRlZFR5cGUgPSAnYWRkJyB8ICdtdWx0aXBseScgfCAncmF0aW8nIHwgJ3BlcmNlbnQnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGV4dGVuZHMgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIHtcbiAgYW5nbGVzOiBudW1iZXJbXSAvLyBJbmhlcml0ZWRcbiAgbWlzc2luZzogYm9vbGVhbltdIC8vICAgIHxcbiAgYW5nbGVTdW06IG51bWJlciAvLyAgICB8XG4gIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSAvLyAgICB2XG4gIGluc3RydWN0aW9uczogc3RyaW5nW10gLy8gVGhlICdpbnN0cnVjdGlvbnMnIGdpdmVuXG4gIHg6IG51bWJlciAvLyB1bnVzZWQgYnV0IGluaGVyaXRlZFxuXG4gIGNvbnN0cnVjdG9yIChhbmdsZXM6IG51bWJlcltdLCBtaXNzaW5nOiBib29sZWFuW10sIGFuZ2xlU3VtOiBudW1iZXIsIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSwgaW5zdHJ1Y3Rpb25zOiBzdHJpbmdbXSkge1xuICAgIHN1cGVyKGFuZ2xlcywgbWlzc2luZywgYW5nbGVTdW0sIGFuZ2xlTGFiZWxzLCBudWxsKVxuICAgIHRoaXMuaW5zdHJ1Y3Rpb25zID0gaW5zdHJ1Y3Rpb25zXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zIDogV29yZGVkT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSB7XG4gICAgY29uc3QgZGVmYXVsdHMgOiBXb3JkZWRPcHRpb25zID0ge1xuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDIsXG4gICAgICBtaW5BbmdsZTogMTAsXG4gICAgICBtaW5BZGRlbmQ6IC05MCxcbiAgICAgIG1heEFkZGVuZDogOTAsXG4gICAgICBtaW5NdWx0aXBsaWVyOiAxLFxuICAgICAgbWF4TXVsdGlwbGllcjogNSxcbiAgICAgIHR5cGVzOiBbJ2FkZCcsICdtdWx0aXBseScsICdwZXJjZW50JywgJ3JhdGlvJ11cbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgY29uc3QgbiA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTiwgb3B0aW9ucy5tYXhOKVxuICAgIGNvbnN0IGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIGFuZ2xlTGFiZWxzW2ldID0gU3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpIC8vIDY1ID0gJ0EnXG4gICAgfVxuICAgIGxldCBleHByZXNzaW9uczogTGluRXhwcltdID0gW11cbiAgICBsZXQgaW5zdHJ1Y3Rpb25zOiBzdHJpbmdbXSA9IFtdXG5cbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKVxuXG4gICAgLy8gTG9vcCB0aWwgd2UgZ2V0IG9uZSB0aGF0IHdvcmtzXG4gICAgLy8gUHJvYmFibHkgcmVhbGx5IGluZWZmaWNpZW50ISFcblxuICAgIGxldCBzdWNjZXNzID0gZmFsc2VcbiAgICBsZXQgYXR0ZW1wdGNvdW50ID0gMFxuICAgIHdoaWxlICghc3VjY2Vzcykge1xuICAgICAgaWYgKGF0dGVtcHRjb3VudCA+IDIwKSB7XG4gICAgICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgMCkpXG4gICAgICAgIGNvbnNvbGUubG9nKCdHYXZlIHVwIGFmdGVyICcgKyBhdHRlbXB0Y291bnQgKyAnIGF0dGVtcHRzJylcbiAgICAgICAgc3VjY2VzcyA9IHRydWVcbiAgICAgIH1cbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSByYW5kRWxlbShvcHRpb25zLnR5cGVzKVxuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICBjYXNlICdhZGQnOiB7XG4gICAgICAgICAgICBjb25zdCBhZGRlbmQgPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbkFkZGVuZCwgb3B0aW9ucy5tYXhBZGRlbmQpXG4gICAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb25zW2kgLSAxXS5hZGQoYWRkZW5kKSlcbiAgICAgICAgICAgIGluc3RydWN0aW9ucy5wdXNoKGBcXFxcdGV4dHtBbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSl9JCBpcyAke2NvbXBhcmF0b3IoYWRkZW5kLCAnKycpfSBhbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY0ICsgaSl9JH1gKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSAnbXVsdGlwbHknOiB7XG4gICAgICAgICAgICBjb25zdCBtdWx0aXBsaWVyID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5NdWx0aXBsaWVyLCBvcHRpb25zLm1heE11bHRpcGxpZXIpXG4gICAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb25zW2kgLSAxXS50aW1lcyhtdWx0aXBsaWVyKSlcbiAgICAgICAgICAgIGluc3RydWN0aW9ucy5wdXNoKGBcXFxcdGV4dHtBbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSl9JCBpcyAke2NvbXBhcmF0b3IobXVsdGlwbGllciwgJyonKX0gYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NCArIGkpfSR9YClcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ3BlcmNlbnQnOiB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50YWdlID0gcmFuZE11bHRCZXR3ZWVuKDUsIDEwMCwgNSlcbiAgICAgICAgICAgIGNvbnN0IGluY3JlYXNlID0gTWF0aC5yYW5kb20oKSA8IDAuNVxuICAgICAgICAgICAgY29uc3QgbXVsdGlwbGllciA9IGluY3JlYXNlID8gMSArIHBlcmNlbnRhZ2UgLyAxMDAgOiAxIC0gcGVyY2VudGFnZSAvIDEwMFxuICAgICAgICAgICAgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uc1tpIC0gMV0udGltZXMobXVsdGlwbGllcikpXG4gICAgICAgICAgICBpbnN0cnVjdGlvbnMucHVzaChcbiAgICAgICAgICAgICAgYFxcXFx0ZXh0e0FuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKX0kIGlzICQke3BlcmNlbnRhZ2V9XFxcXCUkICR7aW5jcmVhc2UgPyAnYmlnZ2VyJyA6ICdzbWFsbGVyJ30gdGhhbiBhbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY0ICsgaSl9JH1gKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSAncmF0aW8nOiB7XG4gICAgICAgICAgICBjb25zdCBhID0gcmFuZEJldHdlZW4oMSwgMTApXG4gICAgICAgICAgICBjb25zdCBiID0gcmFuZEJldHdlZW4oMSwgMTApXG4gICAgICAgICAgICBjb25zdCBtdWx0aXBsaWVyID0gYiAvIGFcbiAgICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2goZXhwcmVzc2lvbnNbaSAtIDFdLnRpbWVzKG11bHRpcGxpZXIpKVxuICAgICAgICAgICAgaW5zdHJ1Y3Rpb25zLnB1c2goXG4gICAgICAgICAgICAgIGBcXFxcdGV4dHtUaGUgcmF0aW8gb2YgYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NCArIGkpfSQgdG8gYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpfSQgaXMgJCR7YX06JHtifSR9YFxuICAgICAgICAgICAgKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gY2hlY2sgaXQgbWFrZXMgc2Vuc2VcbiAgICAgIHN1Y2Nlc3MgPSB0cnVlXG4gICAgICBjb25zdCBleHByZXNzaW9uc3VtID0gZXhwcmVzc2lvbnMucmVkdWNlKChleHAxLCBleHAyKSA9PiBleHAxLmFkZChleHAyKSlcbiAgICAgIGNvbnN0IHggPSBMaW5FeHByLnNvbHZlKGV4cHJlc3Npb25zdW0sIG5ldyBMaW5FeHByKDAsIG9wdGlvbnMuYW5nbGVTdW0pKVxuXG4gICAgICBleHByZXNzaW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChleHByKSB7XG4gICAgICAgIGlmICghc3VjY2VzcyB8fCBleHByLmV2YWwoeCkgPCBvcHRpb25zLm1pbkFuZ2xlKSB7XG4gICAgICAgICAgc3VjY2VzcyA9IGZhbHNlXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zID0gW11cbiAgICAgICAgICBleHByZXNzaW9ucyA9IFtleHByZXNzaW9uc1swXV1cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgYXR0ZW1wdGNvdW50KytcbiAgICB9XG4gICAgY29uc29sZS5sb2coJ0F0dGVtcHRzOiAnICsgYXR0ZW1wdGNvdW50KVxuXG4gICAgY29uc3QgYW5nbGVzID0gc29sdmVBbmdsZXMoZXhwcmVzc2lvbnMsIG9wdGlvbnMuYW5nbGVTdW0pLmFuZ2xlc1xuICAgIGNvbnN0IG1pc3NpbmcgPSBhbmdsZXMubWFwKCgpID0+IHRydWUpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVzLCBtaXNzaW5nLCBvcHRpb25zLmFuZ2xlU3VtLCBhbmdsZUxhYmVscywgaW5zdHJ1Y3Rpb25zKVxuICB9XG59XG5cbi8qKlxuICogR2VuZXJhdGVzIHdvcmRlZCB2ZXJzaW9uIG9mIGFuIG9wZXJhdGlvXG4gKiBAcGFyYW0gbnVtYmVyIFRoZSBtdWx0aXBsaWVyIG9yIGFkZGVuZFxuICogQHBhcmFtIG9wZXJhdG9yIFRoZSBvcGVyYXRvciwgZS5nIGFkZGluZyAnbW9yZSB0aGFuJywgb3IgbXVsdGlwbHlpbmcgJ3RpbWVzIGxhcmdlciB0aGFuJ1xuICovXG5mdW5jdGlvbiBjb21wYXJhdG9yIChudW1iZXI6IG51bWJlciwgb3BlcmF0b3I6ICcqJ3wnKycpIHtcbiAgc3dpdGNoIChvcGVyYXRvcikge1xuICAgIGNhc2UgJyonOlxuICAgICAgc3dpdGNoIChudW1iZXIpIHtcbiAgICAgICAgY2FzZSAxOiByZXR1cm4gJ3RoZSBzYW1lIGFzJ1xuICAgICAgICBjYXNlIDI6IHJldHVybiAnZG91YmxlJ1xuICAgICAgICBkZWZhdWx0OiByZXR1cm4gYCQke251bWJlcn0kIHRpbWVzIGxhcmdlciB0aGFuYFxuICAgICAgfVxuICAgIGNhc2UgJysnOlxuICAgICAgc3dpdGNoIChudW1iZXIpIHtcbiAgICAgICAgY2FzZSAwOiByZXR1cm4gJ3RoZSBzYW1lIGFzJ1xuICAgICAgICBkZWZhdWx0OiByZXR1cm4gYCQke01hdGguYWJzKG51bWJlcikudG9TdHJpbmcoKX1eXFxcXGNpcmMkICR7KG51bWJlciA8IDApID8gJ2xlc3MgdGhhbicgOiAnbW9yZSB0aGFuJ31gXG4gICAgICB9XG4gIH1cbn1cbiIsImltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXcnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzV29yZGVkRGF0YSdcbmltcG9ydCB7IFdvcmRlZE9wdGlvbnMgfSBmcm9tICcuL1dvcmRlZE9wdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhXG4gIHZpZXc6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXdcbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLCB2aWV3OiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3KSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICB0aGlzLnZpZXcgPSB2aWV3XG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBXb3JkZWRPcHRpb25zLCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkUSB7XG4gICAgY29uc3Qgb3B0aW9uc092ZXJyaWRlIDogV29yZGVkT3B0aW9ucyA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5OOiAzLFxuICAgICAgbWF4TjogMyxcbiAgICAgIHJlcGVhdGVkOiBmYWxzZVxuICAgIH1cbiAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIG9wdGlvbnNPdmVycmlkZSlcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXcoZGF0YSwgdmlld09wdGlvbnMpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3IGV4dGVuZHMgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcge1xuICBkYXRhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YVxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEsIG9wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIGRvZXMgbW9zdCBvZiB0aGUgc2V0IHVwXG4gICAgc3VwZXIudHJhbnNsYXRlKDAsIC0xNSlcbiAgICBjb25zdCBpbnN0cnVjdGlvbkxhYmVsIDogTGFiZWwgPSB7XG4gICAgICB0ZXh0cTogdGhpcy5kYXRhLmluc3RydWN0aW9ucy5qb2luKCdcXFxcXFxcXCcpLFxuICAgICAgdGV4dGE6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHRleHQ6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHN0eWxlcTogJ2V4dHJhLWluZm8nLFxuICAgICAgc3R5bGVhOiAnZXh0cmEtaW5mbycsXG4gICAgICBzdHlsZTogJ2V4dHJhLWluZm8nLFxuICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIHRoaXMuaGVpZ2h0IC0gMTApXG4gICAgfVxuICAgIHRoaXMubGFiZWxzLnB1c2goaW5zdHJ1Y3Rpb25MYWJlbClcbiAgfVxufVxuIiwiaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3J1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzV29yZGVkRGF0YSdcbmltcG9ydCB7IFdvcmRlZE9wdGlvbnMgfSBmcm9tICcuL1dvcmRlZE9wdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNXb3JkZWRRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YVxuICB2aWV3OiBNaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlld1xuXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSwgdmlldzogTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIHRoaXMudmlldyA9IHZpZXdcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFdvcmRlZE9wdGlvbnMsIHZpZXdPcHRpb25zOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1dvcmRlZFEge1xuICAgIGNvbnN0IGRlZmF1bHRzIDogV29yZGVkT3B0aW9ucyA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5BbmdsZTogMTAsXG4gICAgICBtaW5OOiAyLFxuICAgICAgbWF4TjogMixcbiAgICAgIHJlcGVhdGVkOiBmYWxzZVxuICAgIH1cbiAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICB2aWV3T3B0aW9ucyA9IHZpZXdPcHRpb25zIHx8IHt9XG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEucmFuZG9tKG9wdGlvbnMpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldyhkYXRhLCB2aWV3T3B0aW9ucylcblxuICAgIHJldHVybiBuZXcgdGhpcyhkYXRhLCB2aWV3KVxuICB9XG59XG4iLCIvKiogIENsYXNzIHRvIHdyYXAgdmFyaW91cyBtaXNzaW5nIGFuZ2xlcyBjbGFzc2VzXG4gKiBSZWFkcyBvcHRpb25zIGFuZCB0aGVuIHdyYXBzIHRoZSBhcHByb3ByaWF0ZSBvYmplY3QsIG1pcnJvcmluZyB0aGUgbWFpblxuICogcHVibGljIG1ldGhvZHNcbiAqXG4gKiBUaGlzIGNsYXNzIGRlYWxzIHdpdGggdHJhbnNsYXRpbmcgZGlmZmljdWx0eSBpbnRvIHF1ZXN0aW9uIHR5cGVzXG4qL1xuXG5pbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5cbmltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbi9RdWVzdGlvbidcbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5cbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVRJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSBmcm9tICcuL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFRJ1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tICcuL0FsZ2VicmFPcHRpb25zJ1xuXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkUSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1dvcmRlZFEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzV29yZGVkUSdcbmltcG9ydCB7IFdvcmRlZE9wdGlvbnMgfSBmcm9tICcuL1dvcmRlZE9wdGlvbnMnXG5cbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuXG50eXBlIFF1ZXN0aW9uVHlwZSA9ICdhb3NsJyB8ICdhYWFwJyB8ICd0cmlhbmdsZSdcbnR5cGUgUXVlc3Rpb25TdWJUeXBlID0gJ3NpbXBsZScgfCAncmVwZWF0ZWQnIHwgJ2FsZ2VicmEnIHwgJ3dvcmRlZCdcblxudHlwZSBRdWVzdGlvbk9wdGlvbnMgPSBNaXNzaW5nQW5nbGVPcHRpb25zICYgQWxnZWJyYU9wdGlvbnMgJiBXb3JkZWRPcHRpb25zXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBxdWVzdGlvbjogR3JhcGhpY1FcblxuICBjb25zdHJ1Y3RvciAocXVlc3Rpb246IEdyYXBoaWNRKSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMucXVlc3Rpb24gPSBxdWVzdGlvblxuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAoXG4gICAgb3B0aW9uczoge1xuICAgICAgdHlwZXM6IFF1ZXN0aW9uVHlwZVtdLFxuICAgICAgZGlmZmljdWx0eTogbnVtYmVyLFxuICAgICAgY3VzdG9tOiBib29sZWFuLFxuICAgICAgc3VidHlwZT86IFF1ZXN0aW9uU3ViVHlwZVxuICAgIH0pIDogTWlzc2luZ0FuZ2xlc1Ege1xuICAgIGlmIChvcHRpb25zLnR5cGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUeXBlcyBsaXN0IG11c3QgYmUgbm9uLWVtcHR5JylcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlID0gcmFuZEVsZW0ob3B0aW9ucy50eXBlcylcbiAgICBsZXQgc3VidHlwZSA6IFF1ZXN0aW9uU3ViVHlwZVxuICAgIGNvbnN0IHF1ZXN0aW9uT3B0aW9ucyA6IFF1ZXN0aW9uT3B0aW9ucyA9IHt9XG5cbiAgICBzd2l0Y2ggKG9wdGlvbnMuZGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICBzdWJ0eXBlID0gJ3NpbXBsZSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAyXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gMlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOlxuICAgICAgICBzdWJ0eXBlID0gJ3NpbXBsZSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAzXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gNFxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAzOlxuICAgICAgICBzdWJ0eXBlID0gJ3JlcGVhdGVkJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDNcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSA0XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ6XG4gICAgICAgIHN1YnR5cGUgPSAnYWxnZWJyYSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmV4cHJlc3Npb25UeXBlcyA9IFsnbXVsdGlwbHknXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cyA9IGZhbHNlXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDRcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNTpcbiAgICAgICAgc3VidHlwZSA9ICdhbGdlYnJhJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZXhwcmVzc2lvblR5cGVzID0gWydhZGQnLCAnbXVsdGlwbHknXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cyA9IFsnbXVsdGlwbHknXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZW5zdXJlWCA9IHRydWVcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAyXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA2OlxuICAgICAgICBzdWJ0eXBlID0gJ2FsZ2VicmEnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5leHByZXNzaW9uVHlwZXMgPSBbJ21peGVkJ11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAyXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA3OlxuICAgICAgICBzdWJ0eXBlID0gJ3dvcmRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnR5cGVzID0gW3JhbmRFbGVtKFsnYWRkJywgJ211bHRpcGx5J10pXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gMlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA4OlxuICAgICAgICBzdWJ0eXBlID0gJ3dvcmRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnR5cGVzID0gWydhZGQnLCAnbXVsdGlwbHknXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA5OlxuICAgICAgICBzdWJ0eXBlID0gJ3dvcmRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnR5cGVzID0gWydtdWx0aXBseScsICdyYXRpbyddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gcXVlc3Rpb25PcHRpb25zLm1heE4gPSAzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDEwOlxuICAgICAgICBzdWJ0eXBlID0gJ3dvcmRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnR5cGVzID0gWydtdWx0aXBseScsICdhZGQnLCAncmF0aW8nLCAncGVyY2VudCddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gcXVlc3Rpb25PcHRpb25zLm1heE4gPSAzXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbid0IGdlbmVyYXRlIGRpZmZpY3VsdHkgJHtvcHRpb25zLmRpZmZpY3VsdHl9YClcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5yYW5kb21Gcm9tVHlwZVdpdGhPcHRpb25zKHR5cGUsIHN1YnR5cGUsIHF1ZXN0aW9uT3B0aW9ucylcbiAgfVxuXG4gIHN0YXRpYyByYW5kb21Gcm9tVHlwZVdpdGhPcHRpb25zICh0eXBlOiBRdWVzdGlvblR5cGUsIHN1YnR5cGU/OiBRdWVzdGlvblN1YlR5cGUsIHF1ZXN0aW9uT3B0aW9ucz86IFF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnM/OiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1Ege1xuICAgIGxldCBxdWVzdGlvbjogR3JhcGhpY1FcbiAgICBxdWVzdGlvbk9wdGlvbnMgPSBxdWVzdGlvbk9wdGlvbnMgfHwge31cbiAgICB2aWV3T3B0aW9ucyA9IHZpZXdPcHRpb25zIHx8IHt9XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICBjYXNlICdhYWFwJzpcbiAgICAgIGNhc2UgJ2Fvc2wnOiB7XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5hbmdsZVN1bSA9ICh0eXBlID09PSAnYWFhcCcpID8gMzYwIDogMTgwXG4gICAgICAgIHN3aXRjaCAoc3VidHlwZSkge1xuICAgICAgICAgIGNhc2UgJ3NpbXBsZSc6XG4gICAgICAgICAgY2FzZSAncmVwZWF0ZWQnOlxuICAgICAgICAgICAgcXVlc3Rpb25PcHRpb25zLnJlcGVhdGVkID0gc3VidHlwZSA9PT0gJ3JlcGVhdGVkJ1xuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzQXJvdW5kUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAnYWxnZWJyYSc6XG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAnd29yZGVkJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc1dvcmRlZFEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHVuZXhwZWN0ZWQgc3VidHlwZSAke3N1YnR5cGV9YClcbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAndHJpYW5nbGUnOiB7XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5yZXBlYXRlZCA9IChzdWJ0eXBlID09PSAncmVwZWF0ZWQnKVxuICAgICAgICBzd2l0Y2ggKHN1YnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdzaW1wbGUnOlxuICAgICAgICAgIGNhc2UgJ3JlcGVhdGVkJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAnYWxnZWJyYSc6XG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICd3b3JkZWQnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bmV4cGVjdGVkIHN1YnR5cGUgJHtzdWJ0eXBlfWApXG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0eXBlICR7dHlwZX1gKVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc1EocXVlc3Rpb24pXG4gIH1cblxuICBnZXRET00gKCkgOiBIVE1MRWxlbWVudCB7IHJldHVybiB0aGlzLnF1ZXN0aW9uLmdldERPTSgpIH1cbiAgcmVuZGVyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24ucmVuZGVyKCkgfVxuICBzaG93QW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24uc2hvd0Fuc3dlcigpIH1cbiAgaGlkZUFuc3dlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLmhpZGVBbnN3ZXIoKSB9XG4gIHRvZ2dsZUFuc3dlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLnRvZ2dsZUFuc3dlcigpIH1cblxuICBzdGF0aWMgZ2V0IG9wdGlvbnNTcGVjICgpOiBPcHRpb25zU3BlYyB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2hlYWRpbmcnLFxuICAgICAgICB0aXRsZTogJydcbiAgICAgIH0sXG5cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdUeXBlcycsXG4gICAgICAgIGlkOiAndHlwZXMnLFxuICAgICAgICB0eXBlOiAnc2VsZWN0LWluY2x1c2l2ZScsXG4gICAgICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgICAgICB7IHRpdGxlOiAnT24gYSBzdHJhaWdodCBsaW5lJywgaWQ6ICdhb3NsJyB9LFxuICAgICAgICAgIHsgdGl0bGU6ICdBcm91bmQgYSBwb2ludCcsIGlkOiAnYWFhcCcgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnVHJpYW5nbGUnLCBpZDogJ3RyaWFuZ2xlJyB9XG4gICAgICAgIF0sXG4gICAgICAgIGRlZmF1bHQ6IFsnYW9zbCcsICdhYWFwJywgJ3RyaWFuZ2xlJ10sXG4gICAgICAgIHZlcnRpY2FsOiB0cnVlXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnY29sdW1uLWJyZWFrJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJzxiPlVzZSBjdXN0b20gc2V0dGluZ3MgKGRpc2FibGVzIGRpZmZpY3VsdHkpPC9iPicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICBpZDogJ2N1c3RvbSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgdGl0bGU6ICdTaW1wbGUnLFxuICAgICAgICBpZDogJ3NpbXBsZScsXG4gICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgIGRpc2FibGVkSWY6ICchY3VzdG9tJ1xuICAgICAgfVxuICAgIF1cbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJ1xuICB9XG59XG4iLCJpbXBvcnQgQWxnZWJyYWljRnJhY3Rpb25RIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0FsZ2VicmFpY0ZyYWN0aW9uUSdcbmltcG9ydCBJbnRlZ2VyQWRkUSBmcm9tICdRdWVzdGlvbi9UZXh0US9JbnRlZ2VyQWRkJ1xuaW1wb3J0IEFyaXRobWFnb25RIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0FyaXRobWFnb25RJ1xuaW1wb3J0IFRlc3RRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1Rlc3RRJ1xuaW1wb3J0IEFkZEFaZXJvIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0FkZEFaZXJvJ1xuaW1wb3J0IEVxdWF0aW9uT2ZMaW5lIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0VxdWF0aW9uT2ZMaW5lJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNRIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dyYXBwZXInXG5cbmltcG9ydCBPcHRpb25zU2V0IGZyb20gJ09wdGlvbnNTZXQnXG5cbmNvbnN0IHRvcGljTGlzdCA9IFtcbiAge1xuICAgIGlkOiAnYWxnZWJyYWljLWZyYWN0aW9uJyxcbiAgICB0aXRsZTogJ1NpbXBsaWZ5IGFsZ2VicmFpYyBmcmFjdGlvbnMnLFxuICAgIGNsYXNzOiBBbGdlYnJhaWNGcmFjdGlvblFcbiAgfSxcbiAge1xuICAgIGlkOiAnYWRkLWEtemVybycsXG4gICAgdGl0bGU6ICdNdWx0aXBseSBieSAxMCAoaG9uZXN0ISknLFxuICAgIGNsYXNzOiBBZGRBWmVyb1xuICB9LFxuICB7XG4gICAgaWQ6ICdpbnRlZ2VyLWFkZCcsXG4gICAgdGl0bGU6ICdBZGQgaW50ZWdlcnMgKHYgc2ltcGxlKScsXG4gICAgY2xhc3M6IEludGVnZXJBZGRRXG4gIH0sXG4gIHtcbiAgICBpZDogJ21pc3NpbmctYW5nbGVzJyxcbiAgICB0aXRsZTogJ01pc3NpbmcgYW5nbGVzJyxcbiAgICBjbGFzczogTWlzc2luZ0FuZ2xlc1FcbiAgfSxcbiAge1xuICAgIGlkOiAnZXF1YXRpb24tb2YtbGluZScsXG4gICAgdGl0bGU6ICdFcXVhdGlvbiBvZiBhIGxpbmUgKGZyb20gdHdvIHBvaW50cyknLFxuICAgIGNsYXNzOiBFcXVhdGlvbk9mTGluZVxuICB9LFxuICB7XG4gICAgaWQ6ICdhcml0aG1hZ29uLWFkZCcsXG4gICAgdGl0bGU6ICdBcml0aG1hZ29ucycsXG4gICAgY2xhc3M6IEFyaXRobWFnb25RXG4gIH0sXG4gIHtcbiAgICBpZDogJ3Rlc3QnLFxuICAgIHRpdGxlOiAnVGVzdCBxdWVzdGlvbnMnLFxuICAgIGNsYXNzOiBUZXN0UVxuICB9XG5dXG5cbmZ1bmN0aW9uIGdldENsYXNzIChpZCkge1xuICAvLyBSZXR1cm4gdGhlIGNsYXNzIGdpdmVuIGFuIGlkIG9mIGEgcXVlc3Rpb25cblxuICAvLyBPYnZpb3VzbHkgdGhpcyBpcyBhbiBpbmVmZmljaWVudCBzZWFyY2gsIGJ1dCB3ZSBkb24ndCBuZWVkIG1hc3NpdmUgcGVyZm9ybWFuY2VcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b3BpY0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodG9waWNMaXN0W2ldLmlkID09PSBpZCkge1xuICAgICAgcmV0dXJuIHRvcGljTGlzdFtpXS5jbGFzc1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsXG59XG5cbmZ1bmN0aW9uIGdldFRpdGxlIChpZCkge1xuICAvLyBSZXR1cm4gdGl0bGUgb2YgYSBnaXZlbiBpZFxuICAvL1xuICByZXR1cm4gdG9waWNMaXN0LmZpbmQodCA9PiAodC5pZCA9PT0gaWQpKS50aXRsZVxufVxuXG5mdW5jdGlvbiBnZXRDb21tYW5kV29yZCAoaWQpIHtcbiAgcmV0dXJuIGdldENsYXNzKGlkKS5jb21tYW5kV29yZFxufVxuXG5mdW5jdGlvbiBnZXRUb3BpY3MgKCkge1xuICAvLyByZXR1cm5zIHRvcGljcyB3aXRoIGNsYXNzZXMgc3RyaXBwZWQgb3V0XG4gIHJldHVybiB0b3BpY0xpc3QubWFwKHggPT4gKHsgaWQ6IHguaWQsIHRpdGxlOiB4LnRpdGxlIH0pKVxufVxuXG5mdW5jdGlvbiBuZXdRdWVzdGlvbiAoaWQsIG9wdGlvbnMpIHtcbiAgLy8gdG8gYXZvaWQgd3JpdGluZyBgbGV0IHEgPSBuZXcgKFRvcGljQ2hvb3Nlci5nZXRDbGFzcyhpZCkpKG9wdGlvbnMpXG4gIGNvbnN0IFF1ZXN0aW9uQ2xhc3MgPSBnZXRDbGFzcyhpZClcbiAgbGV0IHF1ZXN0aW9uXG4gIGlmIChRdWVzdGlvbkNsYXNzLnJhbmRvbSkge1xuICAgIHF1ZXN0aW9uID0gUXVlc3Rpb25DbGFzcy5yYW5kb20ob3B0aW9ucylcbiAgfSBlbHNlIHtcbiAgICBxdWVzdGlvbiA9IG5ldyBRdWVzdGlvbkNsYXNzKG9wdGlvbnMpXG4gIH1cbiAgcmV0dXJuIHF1ZXN0aW9uXG59XG5cbmZ1bmN0aW9uIG5ld09wdGlvbnNTZXQgKGlkKSB7XG4gIGNvbnN0IG9wdGlvbnNTcGVjID0gKGdldENsYXNzKGlkKSkub3B0aW9uc1NwZWMgfHwgW11cbiAgcmV0dXJuIG5ldyBPcHRpb25zU2V0KG9wdGlvbnNTcGVjKVxufVxuXG5mdW5jdGlvbiBoYXNPcHRpb25zIChpZCkge1xuICByZXR1cm4gISEoZ2V0Q2xhc3MoaWQpLm9wdGlvbnNTcGVjICYmIGdldENsYXNzKGlkKS5vcHRpb25zU3BlYy5sZW5ndGggPiAwKSAvLyB3ZWlyZCBib29sIHR5cGNhc3Rpbmcgd29vIVxufVxuXG5leHBvcnQgeyB0b3BpY0xpc3QsIGdldENsYXNzLCBuZXdRdWVzdGlvbiwgZ2V0VG9waWNzLCBnZXRUaXRsZSwgbmV3T3B0aW9uc1NldCwgZ2V0Q29tbWFuZFdvcmQsIGhhc09wdGlvbnMgfVxuIiwiLyogIVxuKiB0aW5nbGUuanNcbiogQGF1dGhvciAgcm9iaW5fcGFyaXNpXG4qIEB2ZXJzaW9uIDAuMTUuMlxuKiBAdXJsXG4qL1xuLy8gTW9kaWZpZWQgdG8gYmUgRVM2IG1vZHVsZVxuXG52YXIgaXNCdXN5ID0gZmFsc2VcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gTW9kYWwgKG9wdGlvbnMpIHtcbiAgdmFyIGRlZmF1bHRzID0ge1xuICAgIG9uQ2xvc2U6IG51bGwsXG4gICAgb25PcGVuOiBudWxsLFxuICAgIGJlZm9yZU9wZW46IG51bGwsXG4gICAgYmVmb3JlQ2xvc2U6IG51bGwsXG4gICAgc3RpY2t5Rm9vdGVyOiBmYWxzZSxcbiAgICBmb290ZXI6IGZhbHNlLFxuICAgIGNzc0NsYXNzOiBbXSxcbiAgICBjbG9zZUxhYmVsOiAnQ2xvc2UnLFxuICAgIGNsb3NlTWV0aG9kczogWydvdmVybGF5JywgJ2J1dHRvbicsICdlc2NhcGUnXVxuICB9XG5cbiAgLy8gZXh0ZW5kcyBjb25maWdcbiAgdGhpcy5vcHRzID0gZXh0ZW5kKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAvLyBpbml0IG1vZGFsXG4gIHRoaXMuaW5pdCgpXG59XG5cbk1vZGFsLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5tb2RhbCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgX2J1aWxkLmNhbGwodGhpcylcbiAgX2JpbmRFdmVudHMuY2FsbCh0aGlzKVxuXG4gIC8vIGluc2VydCBtb2RhbCBpbiBkb21cbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsLCBkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpXG5cbiAgaWYgKHRoaXMub3B0cy5mb290ZXIpIHtcbiAgICB0aGlzLmFkZEZvb3RlcigpXG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuX2J1c3kgPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgaXNCdXN5ID0gc3RhdGVcbn1cblxuTW9kYWwucHJvdG90eXBlLl9pc0J1c3kgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBpc0J1c3lcbn1cblxuTW9kYWwucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLm1vZGFsID09PSBudWxsKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICAvLyByZXN0b3JlIHNjcm9sbGluZ1xuICBpZiAodGhpcy5pc09wZW4oKSkge1xuICAgIHRoaXMuY2xvc2UodHJ1ZSlcbiAgfVxuXG4gIC8vIHVuYmluZCBhbGwgZXZlbnRzXG4gIF91bmJpbmRFdmVudHMuY2FsbCh0aGlzKVxuXG4gIC8vIHJlbW92ZSBtb2RhbCBmcm9tIGRvbVxuICB0aGlzLm1vZGFsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbClcblxuICB0aGlzLm1vZGFsID0gbnVsbFxufVxuXG5Nb2RhbC5wcm90b3R5cGUuaXNPcGVuID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gISF0aGlzLm1vZGFsLmNsYXNzTGlzdC5jb250YWlucygndGluZ2xlLW1vZGFsLS12aXNpYmxlJylcbn1cblxuTW9kYWwucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLl9pc0J1c3koKSkgcmV0dXJuXG4gIHRoaXMuX2J1c3kodHJ1ZSlcblxuICB2YXIgc2VsZiA9IHRoaXNcblxuICAvLyBiZWZvcmUgb3BlbiBjYWxsYmFja1xuICBpZiAodHlwZW9mIHNlbGYub3B0cy5iZWZvcmVPcGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgc2VsZi5vcHRzLmJlZm9yZU9wZW4oKVxuICB9XG5cbiAgaWYgKHRoaXMubW9kYWwuc3R5bGUucmVtb3ZlUHJvcGVydHkpIHtcbiAgICB0aGlzLm1vZGFsLnN0eWxlLnJlbW92ZVByb3BlcnR5KCdkaXNwbGF5JylcbiAgfSBlbHNlIHtcbiAgICB0aGlzLm1vZGFsLnN0eWxlLnJlbW92ZUF0dHJpYnV0ZSgnZGlzcGxheScpXG4gIH1cblxuICAvLyBwcmV2ZW50IGRvdWJsZSBzY3JvbGxcbiAgdGhpcy5fc2Nyb2xsUG9zaXRpb24gPSB3aW5kb3cucGFnZVlPZmZzZXRcbiAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtZW5hYmxlZCcpXG4gIGRvY3VtZW50LmJvZHkuc3R5bGUudG9wID0gLXRoaXMuX3Njcm9sbFBvc2l0aW9uICsgJ3B4J1xuXG4gIC8vIHN0aWNreSBmb290ZXJcbiAgdGhpcy5zZXRTdGlja3lGb290ZXIodGhpcy5vcHRzLnN0aWNreUZvb3RlcilcblxuICAvLyBzaG93IG1vZGFsXG4gIHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsLS12aXNpYmxlJylcblxuICAvLyBvbk9wZW4gY2FsbGJhY2tcbiAgaWYgKHR5cGVvZiBzZWxmLm9wdHMub25PcGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgc2VsZi5vcHRzLm9uT3Blbi5jYWxsKHNlbGYpXG4gIH1cblxuICBzZWxmLl9idXN5KGZhbHNlKVxuXG4gIC8vIGNoZWNrIGlmIG1vZGFsIGlzIGJpZ2dlciB0aGFuIHNjcmVlbiBoZWlnaHRcbiAgdGhpcy5jaGVja092ZXJmbG93KClcblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoZm9yY2UpIHtcbiAgaWYgKHRoaXMuX2lzQnVzeSgpKSByZXR1cm5cbiAgdGhpcy5fYnVzeSh0cnVlKVxuICBmb3JjZSA9IGZvcmNlIHx8IGZhbHNlXG5cbiAgLy8gIGJlZm9yZSBjbG9zZVxuICBpZiAodHlwZW9mIHRoaXMub3B0cy5iZWZvcmVDbG9zZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHZhciBjbG9zZSA9IHRoaXMub3B0cy5iZWZvcmVDbG9zZS5jYWxsKHRoaXMpXG4gICAgaWYgKCFjbG9zZSkge1xuICAgICAgdGhpcy5fYnVzeShmYWxzZSlcbiAgICAgIHJldHVyblxuICAgIH1cbiAgfVxuXG4gIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZSgndGluZ2xlLWVuYWJsZWQnKVxuICBkb2N1bWVudC5ib2R5LnN0eWxlLnRvcCA9IG51bGxcbiAgd2luZG93LnNjcm9sbFRvKHtcbiAgICB0b3A6IHRoaXMuX3Njcm9sbFBvc2l0aW9uLFxuICAgIGJlaGF2aW9yOiAnaW5zdGFudCdcbiAgfSlcblxuICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3RpbmdsZS1tb2RhbC0tdmlzaWJsZScpXG5cbiAgLy8gdXNpbmcgc2ltaWxhciBzZXR1cCBhcyBvbk9wZW5cbiAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgc2VsZi5tb2RhbC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG5cbiAgLy8gb25DbG9zZSBjYWxsYmFja1xuICBpZiAodHlwZW9mIHNlbGYub3B0cy5vbkNsb3NlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgc2VsZi5vcHRzLm9uQ2xvc2UuY2FsbCh0aGlzKVxuICB9XG5cbiAgLy8gcmVsZWFzZSBtb2RhbFxuICBzZWxmLl9idXN5KGZhbHNlKVxufVxuXG5Nb2RhbC5wcm90b3R5cGUuc2V0Q29udGVudCA9IGZ1bmN0aW9uIChjb250ZW50KSB7XG4gIC8vIGNoZWNrIHR5cGUgb2YgY29udGVudCA6IFN0cmluZyBvciBOb2RlXG4gIGlmICh0eXBlb2YgY29udGVudCA9PT0gJ3N0cmluZycpIHtcbiAgICB0aGlzLm1vZGFsQm94Q29udGVudC5pbm5lckhUTUwgPSBjb250ZW50XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5tb2RhbEJveENvbnRlbnQuaW5uZXJIVE1MID0gJydcbiAgICB0aGlzLm1vZGFsQm94Q29udGVudC5hcHBlbmRDaGlsZChjb250ZW50KVxuICB9XG5cbiAgaWYgKHRoaXMuaXNPcGVuKCkpIHtcbiAgICAvLyBjaGVjayBpZiBtb2RhbCBpcyBiaWdnZXIgdGhhbiBzY3JlZW4gaGVpZ2h0XG4gICAgdGhpcy5jaGVja092ZXJmbG93KClcbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5nZXRDb250ZW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5tb2RhbEJveENvbnRlbnRcbn1cblxuTW9kYWwucHJvdG90eXBlLmFkZEZvb3RlciA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gYWRkIGZvb3RlciB0byBtb2RhbFxuICBfYnVpbGRGb290ZXIuY2FsbCh0aGlzKVxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5zZXRGb290ZXJDb250ZW50ID0gZnVuY3Rpb24gKGNvbnRlbnQpIHtcbiAgLy8gc2V0IGZvb3RlciBjb250ZW50XG4gIHRoaXMubW9kYWxCb3hGb290ZXIuaW5uZXJIVE1MID0gY29udGVudFxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5nZXRGb290ZXJDb250ZW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5tb2RhbEJveEZvb3RlclxufVxuXG5Nb2RhbC5wcm90b3R5cGUuc2V0U3RpY2t5Rm9vdGVyID0gZnVuY3Rpb24gKGlzU3RpY2t5KSB7XG4gIC8vIGlmIHRoZSBtb2RhbCBpcyBzbWFsbGVyIHRoYW4gdGhlIHZpZXdwb3J0IGhlaWdodCwgd2UgZG9uJ3QgbmVlZCBzdGlja3lcbiAgaWYgKCF0aGlzLmlzT3ZlcmZsb3coKSkge1xuICAgIGlzU3RpY2t5ID0gZmFsc2VcbiAgfVxuXG4gIGlmIChpc1N0aWNreSkge1xuICAgIGlmICh0aGlzLm1vZGFsQm94LmNvbnRhaW5zKHRoaXMubW9kYWxCb3hGb290ZXIpKSB7XG4gICAgICB0aGlzLm1vZGFsQm94LnJlbW92ZUNoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpXG4gICAgICB0aGlzLm1vZGFsLmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpXG4gICAgICB0aGlzLm1vZGFsQm94Rm9vdGVyLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC1ib3hfX2Zvb3Rlci0tc3RpY2t5JylcbiAgICAgIF9yZWNhbGN1bGF0ZUZvb3RlclBvc2l0aW9uLmNhbGwodGhpcylcbiAgICAgIHRoaXMubW9kYWxCb3hDb250ZW50LnN0eWxlWydwYWRkaW5nLWJvdHRvbSddID0gdGhpcy5tb2RhbEJveEZvb3Rlci5jbGllbnRIZWlnaHQgKyAyMCArICdweCdcbiAgICB9XG4gIH0gZWxzZSBpZiAodGhpcy5tb2RhbEJveEZvb3Rlcikge1xuICAgIGlmICghdGhpcy5tb2RhbEJveC5jb250YWlucyh0aGlzLm1vZGFsQm94Rm9vdGVyKSkge1xuICAgICAgdGhpcy5tb2RhbC5yZW1vdmVDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKVxuICAgICAgdGhpcy5tb2RhbEJveC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKVxuICAgICAgdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS53aWR0aCA9ICdhdXRvJ1xuICAgICAgdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS5sZWZ0ID0gJydcbiAgICAgIHRoaXMubW9kYWxCb3hDb250ZW50LnN0eWxlWydwYWRkaW5nLWJvdHRvbSddID0gJydcbiAgICAgIHRoaXMubW9kYWxCb3hGb290ZXIuY2xhc3NMaXN0LnJlbW92ZSgndGluZ2xlLW1vZGFsLWJveF9fZm9vdGVyLS1zdGlja3knKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5hZGRGb290ZXJCdG4gPSBmdW5jdGlvbiAobGFiZWwsIGNzc0NsYXNzLCBjYWxsYmFjaykge1xuICB2YXIgYnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJylcblxuICAvLyBzZXQgbGFiZWxcbiAgYnRuLmlubmVySFRNTCA9IGxhYmVsXG5cbiAgLy8gYmluZCBjYWxsYmFja1xuICBidG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjYWxsYmFjaylcblxuICBpZiAodHlwZW9mIGNzc0NsYXNzID09PSAnc3RyaW5nJyAmJiBjc3NDbGFzcy5sZW5ndGgpIHtcbiAgICAvLyBhZGQgY2xhc3NlcyB0byBidG5cbiAgICBjc3NDbGFzcy5zcGxpdCgnICcpLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIGJ0bi5jbGFzc0xpc3QuYWRkKGl0ZW0pXG4gICAgfSlcbiAgfVxuXG4gIHRoaXMubW9kYWxCb3hGb290ZXIuYXBwZW5kQ2hpbGQoYnRuKVxuXG4gIHJldHVybiBidG5cbn1cblxuTW9kYWwucHJvdG90eXBlLnJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS53YXJuKCdSZXNpemUgaXMgZGVwcmVjYXRlZCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIHZlcnNpb24gMS4wJylcbn1cblxuTW9kYWwucHJvdG90eXBlLmlzT3ZlcmZsb3cgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciB2aWV3cG9ydEhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodFxuICB2YXIgbW9kYWxIZWlnaHQgPSB0aGlzLm1vZGFsQm94LmNsaWVudEhlaWdodFxuXG4gIHJldHVybiBtb2RhbEhlaWdodCA+PSB2aWV3cG9ydEhlaWdodFxufVxuXG5Nb2RhbC5wcm90b3R5cGUuY2hlY2tPdmVyZmxvdyA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gb25seSBpZiB0aGUgbW9kYWwgaXMgY3VycmVudGx5IHNob3duXG4gIGlmICh0aGlzLm1vZGFsLmNsYXNzTGlzdC5jb250YWlucygndGluZ2xlLW1vZGFsLS12aXNpYmxlJykpIHtcbiAgICBpZiAodGhpcy5pc092ZXJmbG93KCkpIHtcbiAgICAgIHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsLS1vdmVyZmxvdycpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgndGluZ2xlLW1vZGFsLS1vdmVyZmxvdycpXG4gICAgfVxuXG4gICAgLy8gdE9ETzogcmVtb3ZlIG9mZnNldFxuICAgIC8vIF9vZmZzZXQuY2FsbCh0aGlzKTtcbiAgICBpZiAoIXRoaXMuaXNPdmVyZmxvdygpICYmIHRoaXMub3B0cy5zdGlja3lGb290ZXIpIHtcbiAgICAgIHRoaXMuc2V0U3RpY2t5Rm9vdGVyKGZhbHNlKVxuICAgIH0gZWxzZSBpZiAodGhpcy5pc092ZXJmbG93KCkgJiYgdGhpcy5vcHRzLnN0aWNreUZvb3Rlcikge1xuICAgICAgX3JlY2FsY3VsYXRlRm9vdGVyUG9zaXRpb24uY2FsbCh0aGlzKVxuICAgICAgdGhpcy5zZXRTdGlja3lGb290ZXIodHJ1ZSlcbiAgICB9XG4gIH1cbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbi8qID09IHByaXZhdGUgbWV0aG9kcyAqL1xuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuZnVuY3Rpb24gY2xvc2VJY29uICgpIHtcbiAgcmV0dXJuICc8c3ZnIHZpZXdCb3g9XCIwIDAgMTAgMTBcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+PHBhdGggZD1cIk0uMyA5LjdjLjIuMi40LjMuNy4zLjMgMCAuNS0uMS43LS4zTDUgNi40bDMuMyAzLjNjLjIuMi41LjMuNy4zLjIgMCAuNS0uMS43LS4zLjQtLjQuNC0xIDAtMS40TDYuNCA1bDMuMy0zLjNjLjQtLjQuNC0xIDAtMS40LS40LS40LTEtLjQtMS40IDBMNSAzLjYgMS43LjNDMS4zLS4xLjctLjEuMy4zYy0uNC40LS40IDEgMCAxLjRMMy42IDUgLjMgOC4zYy0uNC40LS40IDEgMCAxLjR6XCIgZmlsbD1cIiMwMDBcIiBmaWxsLXJ1bGU9XCJub256ZXJvXCIvPjwvc3ZnPidcbn1cblxuZnVuY3Rpb24gX3JlY2FsY3VsYXRlRm9vdGVyUG9zaXRpb24gKCkge1xuICBpZiAoIXRoaXMubW9kYWxCb3hGb290ZXIpIHtcbiAgICByZXR1cm5cbiAgfVxuICB0aGlzLm1vZGFsQm94Rm9vdGVyLnN0eWxlLndpZHRoID0gdGhpcy5tb2RhbEJveC5jbGllbnRXaWR0aCArICdweCdcbiAgdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS5sZWZ0ID0gdGhpcy5tb2RhbEJveC5vZmZzZXRMZWZ0ICsgJ3B4J1xufVxuXG5mdW5jdGlvbiBfYnVpbGQgKCkge1xuICAvLyB3cmFwcGVyXG4gIHRoaXMubW9kYWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbCcpXG5cbiAgLy8gcmVtb3ZlIGN1c29yIGlmIG5vIG92ZXJsYXkgY2xvc2UgbWV0aG9kXG4gIGlmICh0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmxlbmd0aCA9PT0gMCB8fCB0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoJ292ZXJsYXknKSA9PT0gLTEpIHtcbiAgICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC0tbm9PdmVybGF5Q2xvc2UnKVxuICB9XG5cbiAgdGhpcy5tb2RhbC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG5cbiAgLy8gY3VzdG9tIGNsYXNzXG4gIHRoaXMub3B0cy5jc3NDbGFzcy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKGl0ZW0pXG4gICAgfVxuICB9LCB0aGlzKVxuXG4gIC8vIGNsb3NlIGJ0blxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdidXR0b24nKSAhPT0gLTEpIHtcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKVxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bi50eXBlID0gJ2J1dHRvbidcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4uY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsX19jbG9zZScpXG5cbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG5JY29uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuSWNvbi5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWxfX2Nsb3NlSWNvbicpXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuSWNvbi5pbm5lckhUTUwgPSBjbG9zZUljb24oKVxuXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuTGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJylcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWxfX2Nsb3NlTGFiZWwnKVxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bkxhYmVsLmlubmVySFRNTCA9IHRoaXMub3B0cy5jbG9zZUxhYmVsXG5cbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4uYXBwZW5kQ2hpbGQodGhpcy5tb2RhbENsb3NlQnRuSWNvbilcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4uYXBwZW5kQ2hpbGQodGhpcy5tb2RhbENsb3NlQnRuTGFiZWwpXG4gIH1cblxuICAvLyBtb2RhbFxuICB0aGlzLm1vZGFsQm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgdGhpcy5tb2RhbEJveC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtYm94JylcblxuICAvLyBtb2RhbCBib3ggY29udGVudFxuICB0aGlzLm1vZGFsQm94Q29udGVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIHRoaXMubW9kYWxCb3hDb250ZW50LmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC1ib3hfX2NvbnRlbnQnKVxuXG4gIHRoaXMubW9kYWxCb3guYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveENvbnRlbnQpXG5cbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignYnV0dG9uJykgIT09IC0xKSB7XG4gICAgdGhpcy5tb2RhbC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQ2xvc2VCdG4pXG4gIH1cblxuICB0aGlzLm1vZGFsLmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3gpXG59XG5cbmZ1bmN0aW9uIF9idWlsZEZvb3RlciAoKSB7XG4gIHRoaXMubW9kYWxCb3hGb290ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICB0aGlzLm1vZGFsQm94Rm9vdGVyLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC1ib3hfX2Zvb3RlcicpXG4gIHRoaXMubW9kYWxCb3guYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveEZvb3Rlcilcbn1cblxuZnVuY3Rpb24gX2JpbmRFdmVudHMgKCkge1xuICB0aGlzLl9ldmVudHMgPSB7XG4gICAgY2xpY2tDbG9zZUJ0bjogdGhpcy5jbG9zZS5iaW5kKHRoaXMpLFxuICAgIGNsaWNrT3ZlcmxheTogX2hhbmRsZUNsaWNrT3V0c2lkZS5iaW5kKHRoaXMpLFxuICAgIHJlc2l6ZTogdGhpcy5jaGVja092ZXJmbG93LmJpbmQodGhpcyksXG4gICAga2V5Ym9hcmROYXY6IF9oYW5kbGVLZXlib2FyZE5hdi5iaW5kKHRoaXMpXG4gIH1cblxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdidXR0b24nKSAhPT0gLTEpIHtcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLl9ldmVudHMuY2xpY2tDbG9zZUJ0bilcbiAgfVxuXG4gIHRoaXMubW9kYWwuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGhpcy5fZXZlbnRzLmNsaWNrT3ZlcmxheSlcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMuX2V2ZW50cy5yZXNpemUpXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLl9ldmVudHMua2V5Ym9hcmROYXYpXG59XG5cbmZ1bmN0aW9uIF9oYW5kbGVLZXlib2FyZE5hdiAoZXZlbnQpIHtcbiAgLy8gZXNjYXBlIGtleVxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdlc2NhcGUnKSAhPT0gLTEgJiYgZXZlbnQud2hpY2ggPT09IDI3ICYmIHRoaXMuaXNPcGVuKCkpIHtcbiAgICB0aGlzLmNsb3NlKClcbiAgfVxufVxuXG5mdW5jdGlvbiBfaGFuZGxlQ2xpY2tPdXRzaWRlIChldmVudCkge1xuICAvLyBvbiBtYWNPUywgY2xpY2sgb24gc2Nyb2xsYmFyIChoaWRkZW4gbW9kZSkgd2lsbCB0cmlnZ2VyIGNsb3NlIGV2ZW50IHNvIHdlIG5lZWQgdG8gYnlwYXNzIHRoaXMgYmVoYXZpb3IgYnkgZGV0ZWN0aW5nIHNjcm9sbGJhciBtb2RlXG4gIHZhciBzY3JvbGxiYXJXaWR0aCA9IHRoaXMubW9kYWwub2Zmc2V0V2lkdGggLSB0aGlzLm1vZGFsLmNsaWVudFdpZHRoXG4gIHZhciBjbGlja2VkT25TY3JvbGxiYXIgPSBldmVudC5jbGllbnRYID49IHRoaXMubW9kYWwub2Zmc2V0V2lkdGggLSAxNSAvLyAxNXB4IGlzIG1hY09TIHNjcm9sbGJhciBkZWZhdWx0IHdpZHRoXG4gIHZhciBpc1Njcm9sbGFibGUgPSB0aGlzLm1vZGFsLnNjcm9sbEhlaWdodCAhPT0gdGhpcy5tb2RhbC5vZmZzZXRIZWlnaHRcbiAgaWYgKG5hdmlnYXRvci5wbGF0Zm9ybSA9PT0gJ01hY0ludGVsJyAmJiBzY3JvbGxiYXJXaWR0aCA9PT0gMCAmJiBjbGlja2VkT25TY3JvbGxiYXIgJiYgaXNTY3JvbGxhYmxlKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICAvLyBpZiBjbGljayBpcyBvdXRzaWRlIHRoZSBtb2RhbFxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdvdmVybGF5JykgIT09IC0xICYmICFfZmluZEFuY2VzdG9yKGV2ZW50LnRhcmdldCwgJ3RpbmdsZS1tb2RhbCcpICYmXG4gICAgZXZlbnQuY2xpZW50WCA8IHRoaXMubW9kYWwuY2xpZW50V2lkdGgpIHtcbiAgICB0aGlzLmNsb3NlKClcbiAgfVxufVxuXG5mdW5jdGlvbiBfZmluZEFuY2VzdG9yIChlbCwgY2xzKSB7XG4gIHdoaWxlICgoZWwgPSBlbC5wYXJlbnRFbGVtZW50KSAmJiAhZWwuY2xhc3NMaXN0LmNvbnRhaW5zKGNscykpO1xuICByZXR1cm4gZWxcbn1cblxuZnVuY3Rpb24gX3VuYmluZEV2ZW50cyAoKSB7XG4gIGlmICh0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoJ2J1dHRvbicpICE9PSAtMSkge1xuICAgIHRoaXMubW9kYWxDbG9zZUJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuX2V2ZW50cy5jbGlja0Nsb3NlQnRuKVxuICB9XG4gIHRoaXMubW9kYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGhpcy5fZXZlbnRzLmNsaWNrT3ZlcmxheSlcbiAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMuX2V2ZW50cy5yZXNpemUpXG4gIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLl9ldmVudHMua2V5Ym9hcmROYXYpXG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiA9PSBoZWxwZXJzICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuXG5mdW5jdGlvbiBleHRlbmQgKCkge1xuICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGZvciAodmFyIGtleSBpbiBhcmd1bWVudHNbaV0pIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYXJndW1lbnRzW2ldLCBrZXkpKSB7XG4gICAgICAgIGFyZ3VtZW50c1swXVtrZXldID0gYXJndW1lbnRzW2ldW2tleV1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGFyZ3VtZW50c1swXVxufVxuIiwiaW1wb3J0IFJTbGlkZXIgZnJvbSAndmVuZG9yL3JzbGlkZXInXG5pbXBvcnQgT3B0aW9uc1NldCBmcm9tICdPcHRpb25zU2V0J1xuaW1wb3J0ICogYXMgVG9waWNDaG9vc2VyIGZyb20gJ1RvcGljQ2hvb3NlcidcbmltcG9ydCBNb2RhbCBmcm9tICd2ZW5kb3IvVGluZ2xlJ1xuaW1wb3J0IHsgcmFuZEVsZW0sIGNyZWF0ZUVsZW0sIGhhc0FuY2VzdG9yQ2xhc3MsIGJvb2xPYmplY3RUb0FycmF5IH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG53aW5kb3cuU0hPV19ESUZGSUNVTFRZID0gZmFsc2UgLy8gZm9yIGRlYnVnZ2luZyBxdWVzdGlvbnNcblxuLyogVE9ETyBsaXN0OlxuICogQWRkaXRpb25hbCBxdWVzdGlvbiBibG9jayAtIHByb2JhYmx5IGluIG1haW4uanNcbiAqIFpvb20vc2NhbGUgYnV0dG9uc1xuICogICAgTmVlZCB0byBjaGFuZ2UgY3NzIGdyaWQgc3BhY2luZyB3aXRoIEpTIG9uIGdlbmVyYXRpb25cbiAqIERpc3BsYXkgb3B0aW9uc1xuICovXG5cbi8vIE1ha2UgYW4gb3ZlcmxheSB0byBjYXB0dXJlIGFueSBjbGlja3Mgb3V0c2lkZSBib3hlcywgaWYgbmVjZXNzYXJ5XG5jcmVhdGVFbGVtKCdkaXYnLCAnb3ZlcmxheSBoaWRkZW4nLCBkb2N1bWVudC5ib2R5KS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGhpZGVBbGxBY3Rpb25zKVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBRdWVzdGlvblNldCB7XG4gIGNvbnN0cnVjdG9yIChxTnVtYmVyKSB7XG4gICAgdGhpcy5xdWVzdGlvbnMgPSBbXSAvLyBsaXN0IG9mIHF1ZXN0aW9ucyBhbmQgdGhlIERPTSBlbGVtZW50IHRoZXkncmUgcmVuZGVyZWQgaW5cbiAgICB0aGlzLnRvcGljcyA9IFtdIC8vIGxpc3Qgb2YgdG9waWNzIHdoaWNoIGhhdmUgYmVlbiBzZWxlY3RlZCBmb3IgdGhpcyBzZXRcbiAgICB0aGlzLm9wdGlvbnNTZXRzID0gW10gLy8gbGlzdCBvZiBPcHRpb25zU2V0IG9iamVjdHMgY2Fycnlpbmcgb3B0aW9ucyBmb3IgdG9waWNzIHdpdGggb3B0aW9uc1xuICAgIHRoaXMucU51bWJlciA9IHFOdW1iZXIgfHwgMSAvLyBRdWVzdGlvbiBudW1iZXIgKHBhc3NlZCBpbiBieSBjYWxsZXIsIHdoaWNoIHdpbGwga2VlcCBjb3VudClcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2UgLy8gV2hldGhlciBhbnN3ZXJlZCBvciBub3RcbiAgICB0aGlzLmNvbW1hbmRXb3JkID0gJycgLy8gU29tZXRoaW5nIGxpa2UgJ3NpbXBsaWZ5J1xuICAgIHRoaXMudXNlQ29tbWFuZFdvcmQgPSB0cnVlIC8vIFVzZSB0aGUgY29tbWFuZCB3b3JkIGluIHRoZSBtYWluIHF1ZXN0aW9uLCBmYWxzZSBnaXZlIGNvbW1hbmQgd29yZCB3aXRoIGVhY2ggc3VicXVlc3Rpb25cbiAgICB0aGlzLm4gPSA4IC8vIE51bWJlciBvZiBxdWVzdGlvbnNcblxuICAgIHRoaXMuX2J1aWxkKClcbiAgfVxuXG4gIF9idWlsZCAoKSB7XG4gICAgdGhpcy5vdXRlckJveCA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1vdXRlcmJveCcpXG4gICAgdGhpcy5oZWFkZXJCb3ggPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24taGVhZGVyYm94JywgdGhpcy5vdXRlckJveClcbiAgICB0aGlzLmRpc3BsYXlCb3ggPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tZGlzcGxheWJveCcsIHRoaXMub3V0ZXJCb3gpXG5cbiAgICB0aGlzLl9idWlsZE9wdGlvbnNCb3goKVxuXG4gICAgdGhpcy5fYnVpbGRUb3BpY0Nob29zZXIoKVxuICB9XG5cbiAgX2J1aWxkT3B0aW9uc0JveCAoKSB7XG4gICAgY29uc3QgdG9waWNTcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIG51bGwsIHRoaXMuaGVhZGVyQm94KVxuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uID0gY3JlYXRlRWxlbSgnc3BhbicsICd0b3BpYy1jaG9vc2VyIGJ1dHRvbicsIHRvcGljU3BhbilcbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbi5pbm5lckhUTUwgPSAnQ2hvb3NlIHRvcGljJ1xuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5jaG9vc2VUb3BpY3MoKSlcblxuICAgIGNvbnN0IGRpZmZpY3VsdHlTcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIG51bGwsIHRoaXMuaGVhZGVyQm94KVxuICAgIGRpZmZpY3VsdHlTcGFuLmFwcGVuZCgnRGlmZmljdWx0eTogJylcbiAgICBjb25zdCBkaWZmaWN1bHR5U2xpZGVyT3V0ZXIgPSBjcmVhdGVFbGVtKCdzcGFuJywgJ3NsaWRlci1vdXRlcicsIGRpZmZpY3VsdHlTcGFuKVxuICAgIHRoaXMuZGlmZmljdWx0eVNsaWRlckVsZW1lbnQgPSBjcmVhdGVFbGVtKCdpbnB1dCcsIG51bGwsIGRpZmZpY3VsdHlTbGlkZXJPdXRlcilcblxuICAgIGNvbnN0IG5TcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIG51bGwsIHRoaXMuaGVhZGVyQm94KVxuICAgIG5TcGFuLmFwcGVuZCgnTnVtYmVyIG9mIHF1ZXN0aW9uczogJylcbiAgICBjb25zdCBuUXVlc3Rpb25zSW5wdXQgPSBjcmVhdGVFbGVtKCdpbnB1dCcsICduLXF1ZXN0aW9ucycsIG5TcGFuKVxuICAgIG5RdWVzdGlvbnNJbnB1dC50eXBlID0gJ251bWJlcidcbiAgICBuUXVlc3Rpb25zSW5wdXQubWluID0gJzEnXG4gICAgblF1ZXN0aW9uc0lucHV0LnZhbHVlID0gJzgnXG4gICAgblF1ZXN0aW9uc0lucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHtcbiAgICAgIHRoaXMubiA9IHBhcnNlSW50KG5RdWVzdGlvbnNJbnB1dC52YWx1ZSlcbiAgICB9KVxuXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbiA9IGNyZWF0ZUVsZW0oJ2J1dHRvbicsICdnZW5lcmF0ZS1idXR0b24gYnV0dG9uJywgdGhpcy5oZWFkZXJCb3gpXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5kaXNhYmxlZCA9IHRydWVcbiAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmlubmVySFRNTCA9ICdHZW5lcmF0ZSEnXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuZ2VuZXJhdGVBbGwoKSlcbiAgfVxuXG4gIF9pbml0U2xpZGVyICgpIHtcbiAgICB0aGlzLmRpZmZpY3VsdHlTbGlkZXIgPSBuZXcgUlNsaWRlcih7XG4gICAgICB0YXJnZXQ6IHRoaXMuZGlmZmljdWx0eVNsaWRlckVsZW1lbnQsXG4gICAgICB2YWx1ZXM6IHsgbWluOiAxLCBtYXg6IDEwIH0sXG4gICAgICByYW5nZTogdHJ1ZSxcbiAgICAgIHNldDogWzIsIDZdLFxuICAgICAgc3RlcDogMSxcbiAgICAgIHRvb2x0aXA6IGZhbHNlLFxuICAgICAgc2NhbGU6IHRydWUsXG4gICAgICBsYWJlbHM6IHRydWVcbiAgICB9KVxuICB9XG5cbiAgX2J1aWxkVG9waWNDaG9vc2VyICgpIHtcbiAgICAvLyBidWlsZCBhbiBPcHRpb25zU2V0IG9iamVjdCBmb3IgdGhlIHRvcGljc1xuICAgIGNvbnN0IHRvcGljcyA9IFRvcGljQ2hvb3Nlci5nZXRUb3BpY3MoKVxuICAgIGNvbnN0IG9wdGlvbnNTcGVjID0gW11cbiAgICB0b3BpY3MuZm9yRWFjaCh0b3BpYyA9PiB7XG4gICAgICBvcHRpb25zU3BlYy5wdXNoKHtcbiAgICAgICAgdGl0bGU6IHRvcGljLnRpdGxlLFxuICAgICAgICBpZDogdG9waWMuaWQsXG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICAgIHN3YXBMYWJlbDogdHJ1ZVxuICAgICAgfSlcbiAgICB9KVxuICAgIHRoaXMudG9waWNzT3B0aW9ucyA9IG5ldyBPcHRpb25zU2V0KG9wdGlvbnNTcGVjKVxuXG4gICAgLy8gQnVpbGQgYSBtb2RhbCBkaWFsb2cgdG8gcHV0IHRoZW0gaW5cbiAgICB0aGlzLnRvcGljc01vZGFsID0gbmV3IE1vZGFsKHtcbiAgICAgIGZvb3RlcjogdHJ1ZSxcbiAgICAgIHN0aWNreUZvb3RlcjogZmFsc2UsXG4gICAgICBjbG9zZU1ldGhvZHM6IFsnb3ZlcmxheScsICdlc2NhcGUnXSxcbiAgICAgIGNsb3NlTGFiZWw6ICdDbG9zZScsXG4gICAgICBvbkNsb3NlOiAoKSA9PiB7XG4gICAgICAgIHRoaXMudXBkYXRlVG9waWNzKClcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhpcy50b3BpY3NNb2RhbC5hZGRGb290ZXJCdG4oXG4gICAgICAnT0snLFxuICAgICAgJ2J1dHRvbiBtb2RhbC1idXR0b24nLFxuICAgICAgKCkgPT4ge1xuICAgICAgICB0aGlzLnRvcGljc01vZGFsLmNsb3NlKClcbiAgICAgIH0pXG5cbiAgICAvLyByZW5kZXIgb3B0aW9ucyBpbnRvIG1vZGFsXG4gICAgdGhpcy50b3BpY3NPcHRpb25zLnJlbmRlckluKHRoaXMudG9waWNzTW9kYWwubW9kYWxCb3hDb250ZW50KVxuXG4gICAgLy8gQWRkIGZ1cnRoZXIgb3B0aW9ucyBidXR0b25zXG4gICAgLy8gVGhpcyBmZWVscyBhIGJpdCBpZmZ5IC0gZGVwZW5kcyB0b28gbXVjaCBvbiBpbXBsZW1lbnRhdGlvbiBvZiBPcHRpb25zU2V0XG4gICAgY29uc3QgbGlzID0gQXJyYXkuZnJvbSh0aGlzLnRvcGljc01vZGFsLm1vZGFsQm94Q29udGVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnbGknKSlcbiAgICBsaXMuZm9yRWFjaChsaSA9PiB7XG4gICAgICBjb25zdCB0b3BpY0lkID0gbGkuZGF0YXNldC5vcHRpb25JZFxuICAgICAgaWYgKFRvcGljQ2hvb3Nlci5oYXNPcHRpb25zKHRvcGljSWQpKSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnNCdXR0b24gPSBjcmVhdGVFbGVtKCdkaXYnLCAnaWNvbi1idXR0b24gZXh0cmEtb3B0aW9ucy1idXR0b24nLCBsaSlcbiAgICAgICAgdGhpcy5fYnVpbGRUb3BpY09wdGlvbnMobGkuZGF0YXNldC5vcHRpb25JZCwgb3B0aW9uc0J1dHRvbilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgX2J1aWxkVG9waWNPcHRpb25zICh0b3BpY0lkLCBvcHRpb25zQnV0dG9uKSB7XG4gICAgLy8gQnVpbGQgdGhlIFVJIGFuZCBPcHRpb25zU2V0IG9iamVjdCBsaW5rZWQgdG8gdG9waWNJZC4gUGFzcyBpbiBhIGJ1dHRvbiB3aGljaCBzaG91bGQgbGF1bmNoIGl0XG5cbiAgICAvLyBNYWtlIHRoZSBPcHRpb25zU2V0IG9iamVjdCBhbmQgc3RvcmUgYSByZWZlcmVuY2UgdG8gaXRcbiAgICAvLyBPbmx5IHN0b3JlIGlmIG9iamVjdCBpcyBjcmVhdGVkP1xuICAgIGNvbnN0IG9wdGlvbnNTZXQgPSBUb3BpY0Nob29zZXIubmV3T3B0aW9uc1NldCh0b3BpY0lkKVxuICAgIHRoaXMub3B0aW9uc1NldHNbdG9waWNJZF0gPSBvcHRpb25zU2V0XG5cbiAgICAvLyBNYWtlIGEgbW9kYWwgZGlhbG9nIGZvciBpdFxuICAgIGNvbnN0IG1vZGFsID0gbmV3IE1vZGFsKHtcbiAgICAgIGZvb3RlcjogdHJ1ZSxcbiAgICAgIHN0aWNreUZvb3RlcjogZmFsc2UsXG4gICAgICBjbG9zZU1ldGhvZHM6IFsnb3ZlcmxheScsICdlc2NhcGUnXSxcbiAgICAgIGNsb3NlTGFiZWw6ICdDbG9zZSdcbiAgICB9KVxuXG4gICAgbW9kYWwuYWRkRm9vdGVyQnRuKFxuICAgICAgJ09LJyxcbiAgICAgICdidXR0b24gbW9kYWwtYnV0dG9uJyxcbiAgICAgICgpID0+IHtcbiAgICAgICAgbW9kYWwuY2xvc2UoKVxuICAgICAgfSlcblxuICAgIG9wdGlvbnNTZXQucmVuZGVySW4obW9kYWwubW9kYWxCb3hDb250ZW50KVxuXG4gICAgLy8gbGluayB0aGUgbW9kYWwgdG8gdGhlIGJ1dHRvblxuICAgIG9wdGlvbnNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICBtb2RhbC5vcGVuKClcbiAgICB9KVxuICB9XG5cbiAgY2hvb3NlVG9waWNzICgpIHtcbiAgICB0aGlzLnRvcGljc01vZGFsLm9wZW4oKVxuICB9XG5cbiAgdXBkYXRlVG9waWNzICgpIHtcbiAgICAvLyB0b3BpYyBjaG9pY2VzIGFyZSBzdG9yZWQgaW4gdGhpcy50b3BpY3NPcHRpb25zIGF1dG9tYXRpY2FsbHlcbiAgICAvLyBwdWxsIHRoaXMgaW50byB0aGlzLnRvcGljcyBhbmQgdXBkYXRlIGJ1dHRvbiBkaXNwbGF5c1xuXG4gICAgLy8gaGF2ZSBvYmplY3Qgd2l0aCBib29sZWFuIHByb3BlcnRpZXMuIEp1c3Qgd2FudCB0aGUgdHJ1ZSB2YWx1ZXNcbiAgICBjb25zdCB0b3BpY3MgPSBib29sT2JqZWN0VG9BcnJheSh0aGlzLnRvcGljc09wdGlvbnMub3B0aW9ucylcbiAgICB0aGlzLnRvcGljcyA9IHRvcGljc1xuXG4gICAgbGV0IHRleHRcblxuICAgIGlmICh0b3BpY3MubGVuZ3RoID09PSAwKSB7XG4gICAgICB0ZXh0ID0gJ0Nob29zZSB0b3BpYycgLy8gbm90aGluZyBzZWxlY3RlZFxuICAgICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5kaXNhYmxlZCA9IHRydWVcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgaWQgPSB0b3BpY3NbMF0gLy8gZmlyc3QgaXRlbSBzZWxlY3RlZFxuICAgICAgdGV4dCA9IFRvcGljQ2hvb3Nlci5nZXRUaXRsZShpZClcbiAgICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uZGlzYWJsZWQgPSBmYWxzZVxuICAgIH1cblxuICAgIGlmICh0b3BpY3MubGVuZ3RoID4gMSkgeyAvLyBhbnkgYWRkaXRpb25hbCBzaG93IGFzIGUuZy4gJyArIDFcbiAgICAgIHRleHQgKz0gJyArJyArICh0b3BpY3MubGVuZ3RoIC0gMSlcbiAgICB9XG5cbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbi5pbm5lckhUTUwgPSB0ZXh0XG4gIH1cblxuICBzZXRDb21tYW5kV29yZCAoKSB7XG4gICAgLy8gZmlyc3Qgc2V0IHRvIGZpcnN0IHRvcGljIGNvbW1hbmQgd29yZFxuICAgIGxldCBjb21tYW5kV29yZCA9IFRvcGljQ2hvb3Nlci5nZXRDbGFzcyh0aGlzLnRvcGljc1swXSkuY29tbWFuZFdvcmRcbiAgICBsZXQgdXNlQ29tbWFuZFdvcmQgPSB0cnVlIC8vIHRydWUgaWYgc2hhcmVkIGNvbW1hbmQgd29yZFxuXG4gICAgLy8gY3ljbGUgdGhyb3VnaCByZXN0IG9mIHRvcGljcywgcmVzZXQgY29tbWFuZCB3b3JkIGlmIHRoZXkgZG9uJ3QgbWF0Y2hcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IHRoaXMudG9waWNzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoVG9waWNDaG9vc2VyLmdldENsYXNzKHRoaXMudG9waWNzW2ldKS5jb21tYW5kV29yZCAhPT0gY29tbWFuZFdvcmQpIHtcbiAgICAgICAgY29tbWFuZFdvcmQgPSAnJ1xuICAgICAgICB1c2VDb21tYW5kV29yZCA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jb21tYW5kV29yZCA9IGNvbW1hbmRXb3JkXG4gICAgdGhpcy51c2VDb21tYW5kV29yZCA9IHVzZUNvbW1hbmRXb3JkXG4gIH1cblxuICBnZW5lcmF0ZUFsbCAoKSB7XG4gICAgLy8gQ2xlYXIgZGlzcGxheS1ib3ggYW5kIHF1ZXN0aW9uIGxpc3RcbiAgICB0aGlzLmRpc3BsYXlCb3guaW5uZXJIVE1MID0gJydcbiAgICB0aGlzLnF1ZXN0aW9ucyA9IFtdXG4gICAgdGhpcy5zZXRDb21tYW5kV29yZCgpXG5cbiAgICAvLyBTZXQgbnVtYmVyIGFuZCBtYWluIGNvbW1hbmQgd29yZFxuICAgIGNvbnN0IG1haW5xID0gY3JlYXRlRWxlbSgncCcsICdrYXRleCBtYWlucScsIHRoaXMuZGlzcGxheUJveClcbiAgICBtYWlucS5pbm5lckhUTUwgPSBgJHt0aGlzLnFOdW1iZXJ9LiAke3RoaXMuY29tbWFuZFdvcmR9YCAvLyBUT0RPOiBnZXQgY29tbWFuZCB3b3JkIGZyb20gcXVlc3Rpb25zXG5cbiAgICAvLyBNYWtlIHNob3cgYW5zd2VycyBidXR0b25cbiAgICB0aGlzLmFuc3dlckJ1dHRvbiA9IGNyZWF0ZUVsZW0oJ3AnLCAnYnV0dG9uIHNob3ctYW5zd2VycycsIHRoaXMuZGlzcGxheUJveClcbiAgICB0aGlzLmFuc3dlckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHRoaXMudG9nZ2xlQW5zd2VycygpXG4gICAgfSlcbiAgICB0aGlzLmFuc3dlckJ1dHRvbi5pbm5lckhUTUwgPSAnU2hvdyBhbnN3ZXJzJ1xuXG4gICAgLy8gR2V0IGRpZmZpY3VsdHkgZnJvbSBzbGlkZXJcbiAgICBjb25zdCBtaW5kaWZmID0gdGhpcy5kaWZmaWN1bHR5U2xpZGVyLmdldFZhbHVlTCgpXG4gICAgY29uc3QgbWF4ZGlmZiA9IHRoaXMuZGlmZmljdWx0eVNsaWRlci5nZXRWYWx1ZVIoKVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgLy8gTWFrZSBxdWVzdGlvbiBjb250YWluZXIgRE9NIGVsZW1lbnRcbiAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1jb250YWluZXInLCB0aGlzLmRpc3BsYXlCb3gpXG4gICAgICBjb250YWluZXIuZGF0YXNldC5xdWVzdGlvbl9pbmRleCA9IGkgLy8gbm90IHN1cmUgdGhpcyBpcyBhY3R1YWxseSBuZWVkZWRcblxuICAgICAgLy8gQWRkIGNvbnRhaW5lciBsaW5rIHRvIG9iamVjdCBpbiBxdWVzdGlvbnMgbGlzdFxuICAgICAgaWYgKCF0aGlzLnF1ZXN0aW9uc1tpXSkgdGhpcy5xdWVzdGlvbnNbaV0gPSB7fVxuICAgICAgdGhpcy5xdWVzdGlvbnNbaV0uY29udGFpbmVyID0gY29udGFpbmVyXG5cbiAgICAgIC8vIGNob29zZSBhIGRpZmZpY3VsdHkgYW5kIGdlbmVyYXRlXG4gICAgICBjb25zdCBkaWZmaWN1bHR5ID0gbWluZGlmZiArIE1hdGguZmxvb3IoaSAqIChtYXhkaWZmIC0gbWluZGlmZiArIDEpIC8gdGhpcy5uKVxuXG4gICAgICAvLyBjaG9vc2UgYSB0b3BpYyBpZFxuICAgICAgdGhpcy5nZW5lcmF0ZShpLCBkaWZmaWN1bHR5KVxuICAgIH1cbiAgfVxuXG4gIGdlbmVyYXRlIChpLCBkaWZmaWN1bHR5LCB0b3BpY0lkKSB7XG4gICAgLy8gVE9ETyBnZXQgb3B0aW9ucyBwcm9wZXJseVxuICAgIHRvcGljSWQgPSB0b3BpY0lkIHx8IHJhbmRFbGVtKHRoaXMudG9waWNzKVxuXG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgIGxhYmVsOiAnJyxcbiAgICAgIGRpZmZpY3VsdHk6IGRpZmZpY3VsdHksXG4gICAgICB1c2VDb21tYW5kV29yZDogZmFsc2VcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zU2V0c1t0b3BpY0lkXSkge1xuICAgICAgT2JqZWN0LmFzc2lnbihvcHRpb25zLCB0aGlzLm9wdGlvbnNTZXRzW3RvcGljSWRdLm9wdGlvbnMpXG4gICAgfVxuXG4gICAgLy8gY2hvb3NlIGEgcXVlc3Rpb25cbiAgICBjb25zdCBxdWVzdGlvbiA9IFRvcGljQ2hvb3Nlci5uZXdRdWVzdGlvbih0b3BpY0lkLCBvcHRpb25zKVxuXG4gICAgLy8gc2V0IHNvbWUgbW9yZSBkYXRhIGluIHRoZSBxdWVzdGlvbnNbXSBsaXN0XG4gICAgaWYgKCF0aGlzLnF1ZXN0aW9uc1tpXSkgdGhyb3cgbmV3IEVycm9yKCdxdWVzdGlvbiBub3QgbWFkZScpXG4gICAgdGhpcy5xdWVzdGlvbnNbaV0ucXVlc3Rpb24gPSBxdWVzdGlvblxuICAgIHRoaXMucXVlc3Rpb25zW2ldLnRvcGljSWQgPSB0b3BpY0lkXG5cbiAgICAvLyBSZW5kZXIgaW50byB0aGUgY29udGFpbmVyXG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5xdWVzdGlvbnNbaV0uY29udGFpbmVyXG4gICAgY29udGFpbmVyLmlubmVySFRNTCA9ICcnIC8vIGNsZWFyIGluIGNhc2Ugb2YgcmVmcmVzaFxuXG4gICAgLy8gbWFrZSBhbmQgcmVuZGVyIHF1ZXN0aW9uIG51bWJlciBhbmQgY29tbWFuZCB3b3JkIChpZiBuZWVkZWQpXG4gICAgbGV0IHFOdW1iZXJUZXh0ID0gcXVlc3Rpb25MZXR0ZXIoaSkgKyAnKSdcbiAgICBpZiAod2luZG93LlNIT1dfRElGRklDVUxUWSkgeyBxTnVtYmVyVGV4dCArPSBvcHRpb25zLmRpZmZpY3VsdHkgfVxuICAgIGlmICghdGhpcy51c2VDb21tYW5kV29yZCkge1xuICAgICAgcU51bWJlclRleHQgKz0gJyAnICsgVG9waWNDaG9vc2VyLmdldENvbW1hbmRXb3JkKHRvcGljSWQpXG4gICAgICBjb250YWluZXIuY2xhc3NMaXN0LmFkZCgnaW5kaXZpZHVhbC1jb21tYW5kLXdvcmQnKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZSgnaW5kaXZpZHVhbC1jb21tYW5kLXdvcmQnKVxuICAgIH1cblxuICAgIGNvbnN0IHF1ZXN0aW9uTnVtYmVyRGl2ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLW51bWJlciBrYXRleCcsIGNvbnRhaW5lcilcbiAgICBxdWVzdGlvbk51bWJlckRpdi5pbm5lckhUTUwgPSBxTnVtYmVyVGV4dFxuXG4gICAgLy8gcmVuZGVyIHRoZSBxdWVzdGlvblxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChxdWVzdGlvbi5nZXRET00oKSkgLy8gdGhpcyBpcyBhIC5xdWVzdGlvbi1kaXYgZWxlbWVudFxuICAgIHF1ZXN0aW9uLnJlbmRlcigpIC8vIHNvbWUgcXVlc3Rpb25zIG5lZWQgcmVuZGVyaW5nIGFmdGVyIGF0dGFjaGluZyB0byBET01cblxuICAgIC8vIG1ha2UgaGlkZGVuIGFjdGlvbnMgbWVudVxuICAgIGNvbnN0IGFjdGlvbnMgPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tYWN0aW9ucyBoaWRkZW4nLCBjb250YWluZXIpXG4gICAgY29uc3QgcmVmcmVzaEljb24gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tcmVmcmVzaCBpY29uLWJ1dHRvbicsIGFjdGlvbnMpXG4gICAgY29uc3QgYW5zd2VySWNvbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1hbnN3ZXIgaWNvbi1idXR0b24nLCBhY3Rpb25zKVxuXG4gICAgYW5zd2VySWNvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHF1ZXN0aW9uLnRvZ2dsZUFuc3dlcigpXG4gICAgICBoaWRlQWxsQWN0aW9ucygpXG4gICAgfSlcblxuICAgIHJlZnJlc2hJY29uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgdGhpcy5nZW5lcmF0ZShpLCBkaWZmaWN1bHR5KVxuICAgICAgaGlkZUFsbEFjdGlvbnMoKVxuICAgIH0pXG5cbiAgICAvLyBROiBpcyB0aGlzIGJlc3Qgd2F5IC0gb3IgYW4gZXZlbnQgbGlzdGVuZXIgb24gdGhlIHdob2xlIGRpc3BsYXlCb3g/XG4gICAgY29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZSA9PiB7XG4gICAgICBpZiAoIWhhc0FuY2VzdG9yQ2xhc3MoZS50YXJnZXQsICdxdWVzdGlvbi1hY3Rpb25zJykpIHtcbiAgICAgICAgLy8gb25seSBkbyB0aGlzIGlmIGl0IGRpZG4ndCBvcmlnaW5hdGUgaW4gYWN0aW9uIGJ1dHRvblxuICAgICAgICB0aGlzLnNob3dRdWVzdGlvbkFjdGlvbnMoZSwgaSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgdG9nZ2xlQW5zd2VycyAoKSB7XG4gICAgaWYgKHRoaXMuYW5zd2VyZWQpIHtcbiAgICAgIHRoaXMucXVlc3Rpb25zLmZvckVhY2gocSA9PiB7XG4gICAgICAgIHEucXVlc3Rpb24uaGlkZUFuc3dlcigpXG4gICAgICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICAgICAgICB0aGlzLmFuc3dlckJ1dHRvbi5pbm5lckhUTUwgPSAnU2hvdyBhbnN3ZXJzJ1xuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5xdWVzdGlvbnMuZm9yRWFjaChxID0+IHtcbiAgICAgICAgcS5xdWVzdGlvbi5zaG93QW5zd2VyKClcbiAgICAgICAgdGhpcy5hbnN3ZXJlZCA9IHRydWVcbiAgICAgICAgdGhpcy5hbnN3ZXJCdXR0b24uaW5uZXJIVE1MID0gJ0hpZGUgYW5zd2VycydcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgc2hvd1F1ZXN0aW9uQWN0aW9ucyAoZXZlbnQsIHF1ZXN0aW9uSW5kZXgpIHtcbiAgICAvLyBmaXJzdCBoaWRlIGFueSBvdGhlciBhY3Rpb25zXG4gICAgaGlkZUFsbEFjdGlvbnMoKVxuXG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5xdWVzdGlvbnNbcXVlc3Rpb25JbmRleF0uY29udGFpbmVyXG4gICAgY29uc3QgYWN0aW9ucyA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcucXVlc3Rpb24tYWN0aW9ucycpXG5cbiAgICAvLyBVbmhpZGUgdGhlIG92ZXJsYXlcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcub3ZlcmxheScpLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpXG4gICAgYWN0aW9ucy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgIGFjdGlvbnMuc3R5bGUubGVmdCA9IChjb250YWluZXIub2Zmc2V0V2lkdGggLyAyIC0gYWN0aW9ucy5vZmZzZXRXaWR0aCAvIDIpICsgJ3B4J1xuICAgIGFjdGlvbnMuc3R5bGUudG9wID0gKGNvbnRhaW5lci5vZmZzZXRIZWlnaHQgLyAyIC0gYWN0aW9ucy5vZmZzZXRIZWlnaHQgLyAyKSArICdweCdcbiAgfVxuXG4gIGFwcGVuZFRvIChlbGVtKSB7XG4gICAgZWxlbS5hcHBlbmRDaGlsZCh0aGlzLm91dGVyQm94KVxuICAgIHRoaXMuX2luaXRTbGlkZXIoKSAvLyBoYXMgdG8gYmUgaW4gZG9jdW1lbnQncyBET00gdG8gd29yayBwcm9wZXJseVxuICB9XG5cbiAgYXBwZW5kQmVmb3JlIChwYXJlbnQsIGVsZW0pIHtcbiAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHRoaXMub3V0ZXJCb3gsIGVsZW0pXG4gICAgdGhpcy5faW5pdFNsaWRlcigpIC8vIGhhcyB0byBiZSBpbiBkb2N1bWVudCdzIERPTSB0byB3b3JrIHByb3Blcmx5XG4gIH1cbn1cblxuZnVuY3Rpb24gcXVlc3Rpb25MZXR0ZXIgKGkpIHtcbiAgLy8gcmV0dXJuIGEgcXVlc3Rpb24gbnVtYmVyLiBlLmcuIHFOdW1iZXIoMCk9XCJhXCIuXG4gIC8vIEFmdGVyIGxldHRlcnMsIHdlIGdldCBvbiB0byBncmVla1xuICB2YXIgbGV0dGVyID1cbiAgICAgICAgaSA8IDI2ID8gU3RyaW5nLmZyb21DaGFyQ29kZSgweDYxICsgaSlcbiAgICAgICAgICA6IGkgPCA1MiA/IFN0cmluZy5mcm9tQ2hhckNvZGUoMHg0MSArIGkgLSAyNilcbiAgICAgICAgICAgIDogU3RyaW5nLmZyb21DaGFyQ29kZSgweDNCMSArIGkgLSA1MilcbiAgcmV0dXJuIGxldHRlclxufVxuXG5mdW5jdGlvbiBoaWRlQWxsQWN0aW9ucyAoZSkge1xuICAvLyBoaWRlIGFsbCBxdWVzdGlvbiBhY3Rpb25zXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5xdWVzdGlvbi1hY3Rpb25zJykuZm9yRWFjaChlbCA9PiB7XG4gICAgZWwuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcbiAgfSlcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm92ZXJsYXknKS5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxufVxuIiwiaW1wb3J0IFF1ZXN0aW9uU2V0IGZyb20gJ1F1ZXN0aW9uU2V0J1xuXG4vLyBUT0RPOlxuLy8gIC0gUXVlc3Rpb25TZXQgLSByZWZhY3RvciBpbnRvIG1vcmUgY2xhc3Nlcz8gRS5nLiBvcHRpb25zIHdpbmRvd1xuLy8gIC0gSW1wb3J0IGV4aXN0aW5nIHF1ZXN0aW9uIHR5cGVzIChHIC0gZ3JhcGhpYywgVCAtIHRleHRcbi8vICAgIC0gRyBhbmdsZXNcbi8vICAgIC0gRyBhcmVhXG4vLyAgICAtIFQgZXF1YXRpb24gb2YgYSBsaW5lXG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG4gIGNvbnN0IHFzID0gbmV3IFF1ZXN0aW9uU2V0KClcbiAgcXMuYXBwZW5kVG8oZG9jdW1lbnQuYm9keSlcbiAgcXMuY2hvb3NlVG9waWNzKClcbn0pXG4iXSwibmFtZXMiOlsidGhpcyIsIk11c3RhY2hlLnJlbmRlciIsImNvbW1vbmpzSGVscGVycy5jcmVhdGVDb21tb25qc01vZHVsZSIsImNvbW1vbmpzSGVscGVycy5nZXREZWZhdWx0RXhwb3J0RnJvbUNqcyIsIlJTbGlkZXIiLCJUb3BpY0Nob29zZXIuZ2V0VG9waWNzIiwiVG9waWNDaG9vc2VyLmhhc09wdGlvbnMiLCJUb3BpY0Nob29zZXIubmV3T3B0aW9uc1NldCIsIlRvcGljQ2hvb3Nlci5nZXRUaXRsZSIsIlRvcGljQ2hvb3Nlci5nZXRDbGFzcyIsIlRvcGljQ2hvb3Nlci5uZXdRdWVzdGlvbiIsIlRvcGljQ2hvb3Nlci5nZXRDb21tYW5kV29yZCJdLCJtYXBwaW5ncyI6Ijs7O0VBQUE7RUFDQTtFQUNBO0FBQ0E7RUFDQSxJQUFJLEVBQUUsR0FBRyxVQUFVLElBQUksRUFBRTtFQUN6QixFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSTtFQUNuQixFQUFFLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSTtFQUMxQixFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSTtFQUNwQixFQUFFLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBQztFQUN0QixFQUFFLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBQztFQUNyQixFQUFFLElBQUksQ0FBQyxZQUFZLEdBQUcsRUFBQztFQUN2QixFQUFFLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSTtFQUN0QixFQUFFLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSTtFQUN0QixFQUFFLElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSTtFQUMzQixFQUFFLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSTtFQUN0QixFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSTtFQUNuQixFQUFFLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBQztFQUNmLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFJO0VBQ2xCLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFJO0VBQ2xCLEVBQUUsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFJO0VBQ3JCLEVBQUUsSUFBSSxDQUFDLFFBQVEsR0FBRyxNQUFLO0FBQ3ZCO0VBQ0EsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHO0VBQ2hCLElBQUksS0FBSyxFQUFFLElBQUk7RUFDZixJQUFJLEdBQUcsRUFBRSxJQUFJO0VBQ2IsSUFBRztFQUNILEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRztFQUNkLElBQUksTUFBTSxFQUFFLElBQUk7RUFDaEIsSUFBSSxNQUFNLEVBQUUsSUFBSTtFQUNoQixJQUFJLEdBQUcsRUFBRSxJQUFJO0VBQ2IsSUFBSSxLQUFLLEVBQUUsS0FBSztFQUNoQixJQUFJLEtBQUssRUFBRSxJQUFJO0VBQ2YsSUFBSSxLQUFLLEVBQUUsSUFBSTtFQUNmLElBQUksTUFBTSxFQUFFLElBQUk7RUFDaEIsSUFBSSxPQUFPLEVBQUUsSUFBSTtFQUNqQixJQUFJLElBQUksRUFBRSxJQUFJO0VBQ2QsSUFBSSxRQUFRLEVBQUUsS0FBSztFQUNuQixJQUFJLFFBQVEsRUFBRSxJQUFJO0VBQ2xCLElBQUc7QUFDSDtFQUNBLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRztFQUNiLElBQUksU0FBUyxFQUFFLGNBQWM7RUFDN0IsSUFBSSxVQUFVLEVBQUUsT0FBTztFQUN2QixJQUFJLFFBQVEsRUFBRSxhQUFhO0VBQzNCLElBQUksT0FBTyxFQUFFLFlBQVk7RUFDekIsSUFBSSxLQUFLLEVBQUUsVUFBVTtFQUNyQixJQUFJLE9BQU8sRUFBRSxZQUFZO0VBQ3pCLElBQUksR0FBRyxFQUFFLFlBQVk7RUFDckIsSUFBRztBQUNIO0VBQ0EsRUFBRSxLQUFLLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFDLEVBQUU7QUFDeEc7RUFDQSxFQUFFLElBQUksQ0FBQyxJQUFJLEdBQUU7RUFDYixFQUFDO0FBQ0Q7RUFDQSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxZQUFZO0VBQ2hDLEVBQUUsSUFBSSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLFFBQVEsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTTtFQUN6RSxPQUFPLElBQUksQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFDO0FBQzlFO0VBQ0EsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0JBQStCLENBQUM7QUFDdEU7RUFDQSxFQUFFLElBQUksQ0FBQyxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxRQUFPO0VBQ2hFLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE9BQU07RUFDbkMsRUFBRSxJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLFlBQVksS0FBSyxFQUFDO0FBQ3REO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDckIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLEVBQUU7RUFDL0wsR0FBRztFQUNILEVBQUUsT0FBTyxJQUFJLENBQUMsWUFBWSxFQUFFO0VBQzVCLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLFlBQVk7RUFDeEMsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUM7RUFDeEQsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyw0QkFBMkI7RUFDckQsRUFBRSxJQUFJLENBQUMsUUFBUSxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUM7RUFDekQsRUFBRSxJQUFJLENBQUMsUUFBUSxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEVBQUM7RUFDekUsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUM7QUFDbkQ7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7RUFDekIsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDbEQsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDbEQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FB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QUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFJO0FBQzVEO0VBQ0EsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7RUFDM0IsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUM7RUFDeEUsS0FBSyxNQUFNLEdBQUcsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDO0FBQzlDO0VBQ0EsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEtBQUk7RUFDNUQsR0FBRztFQUNILEVBQUUsT0FBTyxJQUFJLENBQUMsU0FBUyxFQUFFO0VBQ3pCLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFHLFlBQVk7RUFDdkMsRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBQztBQUM5RDtFQUNBLEVBQUUsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUM7QUFDbkQ7RUFDQSxFQUFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcs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QUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDN0QsS0FBSztFQUNMLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDcEcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSTtFQUM3RixHQUFHLE1BQU07RUFDVCxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQyxFQUFFO0VBQ3RGLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDeEQsR0FBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUM7RUFDbEcsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxFQUFDO0FBQ2xEO0VBQ0EsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUk7RUFDdEYsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFJO0FBQ2pFO0VBQ0EsRUFBRSxPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDeEIsRUFBQztBQUNEO0VBQ0EsRUFBRSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDLEVBQUU7RUFDekMsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU07QUFDaEM7RUFDQSxFQUFFLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLElBQUksRUFBQztBQUNqRTtFQUNBLEVBQUUsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUM7RUFDMUUsRUFBRSxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLEVBQUM7QUFDdEI7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7RUFDdkIsSUFBSSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxHQUFHLEVBQUU7RUFDMUQs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RSxPQUFPLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDO0VBQzFDLENBQUM7QUFDRDtFQUNPLFNBQVMsUUFBUSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7RUFDdkMsRUFBRSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDO0VBQzdELEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU07RUFDL0IsRUFBRSxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxLQUFJO0VBQ3RDLEVBQUUsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBQztFQUN2QyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUN0QixDQUFDO0FBTUQ7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDTyxTQUFTLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQy9CLEVBQUUsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztFQUMxRCxDQUFDO0FBS0Q7RUFDTyxTQUFTLE1BQU0sRUFBRSxDQUFDLEVBQUU7RUFDM0IsRUFBRSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDO0VBQ3BDLENBQUM7QUFzQkQ7RUFDTyxTQUFTLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzNCO0VBQ0EsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUs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QyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxFQUFDO0VBQy9ELFFBQVEsS0FBSztFQUNiLE1BQU0sS0FBSyxDQUFDLENBQUM7RUFDYixNQUFNO0VBQ04sUUFBUSxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLEVBQUM7RUFDaEUsUUFBUSxLQUFLO0VBQ2IsS0FBSztBQUNMO0VBQ0E7RUFDQSxJQUFJO0VBQ0osTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUM3QyxNQUFNLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDN0IsTUFBTTtFQUNOLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFDO0VBQ3pDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFDO0VBQ3pDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFDO0VBQ3pDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFDO0VBQ3pDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFDO0VBQ3pDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFDO0VBQ3pDLEtBQUs7QUFDTDtFQUNBO0VBQ0EsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtFQUMxQixNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUM7RUFDWixNQUFNLENB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QU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBQztFQUM3RCxJQUFJLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxPQUFNO0FBQzNCO0VBQ0EsSUFBSSxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQztFQUN4QyxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDNUI7RUFDQSxJQUFJLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNsQyxJQUFJLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNsQyxJQUFJLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztBQUNsQztFQUNBLElBQUksTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFDO0VBQy9CLElBQUksTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDO0VBQzVDLElBQUksTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDO0FBQzVDO0VBQ0EsSUFBSSxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksR0FBRyxTQUFTLEVBQUUsSUFBSSxHQUFHLFNBQVMsQ0FBQztFQUN4RCxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFO0VBQ3RCLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBQztFQUNwRSxJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUM7RUFDcEUsSUFBSSxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7RUFDaEMsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRTtFQUN0QixJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQztFQUNyRSxJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQztFQUNyRSxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQztFQUNoQyxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sTUFBTSxDQUFDLENBQUMsTUFBTSxFQUFFO0VBQ3pCLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBQztFQUNwRSxJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUM7RUFDcEUsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUM7RUFDckUsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUM7RUFDckUsSUFBSSxPQUFPLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQztFQUMxRCxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sVUFBVSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRTtFQUM3QjtFQUNBO0VBQ0EsSUFBSSxNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFDO0VBQzVCLElBQUksTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBQztFQUM1QixJQUFJLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksRUFBQztFQUN6QyxJQUFJLE9BQU8sRUFBRSxDQUFDLEVBQUUsSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxHQUFHLE1BQU0sRUFBRTtFQUNqRCxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRTtFQUMzQixJ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QUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDdkMsVUFBVSxPQUFPLElBQUksUUFBUSxFQUFFO0VBQy9CLFNBQVM7RUFDVCxRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDOUUsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sSUFBSSxFQUFFLFVBQVUsTUFBTSxFQUFFO0VBQzlCLFFBQVEsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxDQUFDLEVBQUM7QUFDMUM7RUFDQSxRQUFRLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzVDLFVBQVUsT0FBTyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUM7RUFDbEMsU0FBUztFQUNULFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztFQUNqRixPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxLQUFLLEVBQUUsVUFBVSxNQUFNLEVBQUU7RUFDL0IsUUFBUSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxJQUFJLENBQUMsRUFBQztBQUMxQztFQUNBLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENB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QU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDaEMsT0FBTztBQUNQO0VBQ0EsTUFBTSxRQUFRLEVBQUUsVUFBVSxHQUFHLEVBQUU7RUFDL0I7QUFDQTtFQUNBLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDNUMsVUFBVSxPQUFPLElBQUk7RUFDckIsU0FBUztBQUNUO0VBQ0EsUUFBUSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsV0FBVyxHQUFFO0FBQzNDO0VBQ0EsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLE1BQUs7QUFDMUI7RUFDQSxRQUFRLFNBQVMsR0FBRyxFQUFFLENBQUMsRUFBRTtFQUN6QixVQUFVLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsRUFBRSxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzNELFVBQVUsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDcEQsU0FBUztBQUNUO0VBQ0EsUUFBUSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUM5QyxVQUFVLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDN0MsVUFBVSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsR0FBRyxFQUFFO0VBQ3pELFlBQVks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Q0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssS0FBSyxFQUFFO0VBQ3JFLFFBQVEsSUFBSSxHQUFHLE1BQUs7RUFDcEIsT0FBTztFQUNQLEtBQUssRUFBQztFQUNOLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxLQUFLO0VBQ3pDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEtBQUssRUFBRTtFQUNyRSxRQUFRLElBQUksR0FBRyxNQUFLO0VBQ3BCLE9BQU87RUFDUCxLQUFLLEVBQUM7RUFDTixJQUFJLE9BQU8sSUFBSTtFQUNmLEdBQUc7QUFDSDtFQUNBLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRTtFQUN4QixJQUFJLElBQUksRUFBRSxJQUFJLFlBQVksUUFBUSxDQUFDLEVBQUU7RUFDckMsTUFBTSxJQUFJLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFDO0VBQy9CLEtBQUs7RUFDTDtFQUNBO0VBQ0E7RUFDQSxJQUFJLElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRSxTQUFTLEdBQUcsS0FBSTtFQUNqRCxJQUFJLElBQUksU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDO0VBQzdFLElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBQztFQUM3QixJQUFJLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFFO0VBQ3RCLElBQUksT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO0VBQzlCLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFO0VBQ2hCO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDdkMsSUFBSSxNQUFNLENBQUMsR0FBRyxJQUFJLEtBQUssRUFBRSxHQUFHLENBQUM7RUFDN0IsUUFBUSxJQUFJLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQztFQUN6QixVQUFVLFFBQVEsQ0FBQyxJQUFJLEVBQUM7RUFDeEIsSUFBSSxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLHFCQUFxQixFQUFDO0VBQzdDLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsR0FBRTtFQUNwQixJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3hDLE1BQU0sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUM7RUFDaEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFDO0VBQ3RDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUM7RUFDZixLQUFLO0VBQ0wsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBQztFQUNuQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBQztFQUNkLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxFQUFFLEVBQUM7RUFDekIsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUNqQjtFQUNBLElBQUksTUFBTSxDQUFDLEdBQUcsRUFBQztFQUNmLElBQUksTUFBTSxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQ2hDLElBQUksT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO0VBQzlCLEdBQUc7RUFDSDs7RUNwSWUsTUFBTSxVQUFVLENBQUM7RUFDaEMsRUFBRSxXQUFXLENBQUMsQ0FBQyxLQUFLLEVBQUU7RUFDdEIsSUFBSSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxZQUFZLFFBQVEsQ0FBQyxFQUFFO0VBQ2hFLE1BQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFDO0VBQy9CLE1BQU0sSUFBSSxDQUFDLEtBQUssR0FBRyxNQUFLO0VBQ3hCLEtBQUssTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFO0VBQzlCLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUM7RUFDekIsS0FBSyxNQUFNLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFO0VBQzFDLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUM7RUFDekIsS0FBSztFQUNMLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFO0VBQ2hCLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBQztFQUNsQyxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUM7RUFDakMsSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFDO0VBQ2hDLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztFQUMvQixPQUFPLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDaEMsT0FBTyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFDO0VBQzdCLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQ2QsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDbEMsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLENBQUMsR0FBRztFQUNiLElBQUksSUFBSSxHQUFHLEdBQUcsR0FBRTtFQUNoQixJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUNoRCxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDekMsUUFBUSxHQUFHLElBQUksSUFBRztFQUNsQixPQUFPO0VBQ1AsTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUU7RUFDcEMsS0FBSztFQUNMLElBQUksT0FBTyxHQUFHO0VBQ2QsR0FBRztBQUNIO0VBQ0EsRUFBRSxRQUFRLENBQUMsR0FBRztFQUNkLElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFO0VBQ3pCLEdBQUc7QUFDSDtFQUNBLEVBQUUsS0FBSyxDQUFDLEdBQUc7RUFDWCxJQUFJLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUM7RUFDaEQsSUFBSSxPQUFPLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQztFQUNoQyxHQUFHO0FBQ0g7RUFDQSxFQUFFLFFBQVEsQ0FBQyxHQUFHO0VBQ2Q7RUFDQTtFQUNBO0VBQ0E7RUFDQSxJQUFJLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFFO0VBQ3BDLElBQUksSUFBSSxRQUFRLEdBQUcsR0FBRTtFQUNyQixJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQzNDLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRO0VBQzdCLE1BQU0sSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDLENBQUMsRUFBQztFQUM1QixNQUFNLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUNqRCxRQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUTtFQUMvQixRQUFRLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUNyQyxVQUFVLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQztFQUN6QyxVQUFVLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFJO0VBQ3pCLFNBQVM7RUFDVCxPQUFPO0VBQ1AsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQztFQUM1QixNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFJO0VBQ3JCLEtBQUs7RUFDTCxJQUFJLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBQztFQUM5QyxJQUFJLE9BQU8sSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDO0VBQ25DLEdBQUc7QUFDSDtFQUNBLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtFQUN2QixJQUFJLElBQUksRUFBRSxJQUFJLFlBQVksVUFBVSxDQUFDLEVBQUU7RUFDdkMsTUFBTSxJQUFJLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFDO0VBQ2pDLEtBQUs7RUFDTCxJQUFJLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRSxRQUFRLEdBQUcsS0FBSTtFQUMvQyxJQUFJLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUM7RUFDL0MsSUFBSSxJQUFJLE1BQU0sR0FBRyxJQUFJLFVBQVUsQ0FBQyxLQUFLLEVBQUM7QUFDdEM7RUFDQSxJQUFJLElBQUksUUFBUSxFQUFFLE1BQU0sR0FBRyxNQUFNLENBQUMsUUFBUSxHQUFFO0FBQzVDO0VBQ0EsSUFBSSxPQUFPLE1BQU07RUFDakIsR0FBRztBQUNIO0VBQ0EsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFO0VBQ3ZCLElBQUksSUFBSSxFQUFFLElBQUksWUFBWSxVQUFVLENBQUMsRUFBRTtFQUN2QyxNQUFNLElBQUksR0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUM7RUFDakMsS0FBSztFQUNMLElBQUksTUFBTSxLQUFLLEdBQUcsR0FBRTtFQUNwQixJQUFJLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRSxRQUFRLEdBQUcsS0FBSTtFQUMvQyxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUNoRCxNQUFNLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUNsRCxRQUFRLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQ3BELE9BQU87RUFDUCxLQUFLO0FBQ0w7RUFDQSxJQUFJLElBQUksTUFBTSxHQUFHLElBQUksVUFBVSxDQUFDLEtBQUssRUFBQztFQUN0QyxJQUFJLElBQUksUUFBUSxFQUFFLE1BQU0sR0FBRyxNQUFNLENBQUMsUUFBUSxHQUFFO0FBQzVDO0VBQ0EsSUFBSSxPQUFPLE1BQU07RUFDakIsR0FBRztBQUNIO0VBQ0EsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFO0VBQ3BCLElBQUksSUFBSSxNQUFNLEdBQUcsS0FBSTtFQUNyQixJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDaEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUM7RUFDL0IsS0FBSztFQUNMLElBQUksSUFBSSxRQUFRLEVBQUUsTUFBTSxHQUFHLE1BQU0sQ0FBQyxRQUFRLEdBQUU7RUFDNUMsSUFBSSxPQUFPLE1BQU07RUFDakIsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUNqQjtFQUNBLElBQUksTUFBTSxLQUFLLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQ25DLElBQUksT0FBTyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUM7RUFDaEMsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLENBQUMsQ0FBQyxHQUFHO0VBQ2QsSUFBSSxPQUFPLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO0VBQzlCLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDbkIsSUFBSSxPQUFPLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQztFQUM1QixHQUFHO0VBQ0g7O0VDdEhlLE1BQU0sV0FBVyxTQUFTLFFBQVEsQ0FBQztFQUNsRCxFQUFFLFdBQVcsQ0FBQyxDQUFDLE9BQU8sRUFBRTtFQUN4QixJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUM7RUFDbEIsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUM7RUFDbEQsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBQztFQUM3RCxHQUFHO0FBQ0g7RUFDQSxFQUFFLFdBQVcsV0FBVyxDQUFDLEdBQUcsRUFBRSxPQUFPLDBCQUEwQixFQUFFO0VBQ2pFLENBQUM7QUFDRDtFQUNBLFdBQVcsQ0FBQyxXQUFXLEdBQUc7RUFDMUIsRUFBRTtFQUNGLElBQUksS0FBSyxFQUFFLFVBQVU7RUFDckIsSUFBSSxFQUFFLEVBQUUsR0FBRztFQUNYLElBQUksSUFBSSxFQUFFLEtBQUs7RUFDZixJQUFJLEdBQUcsRUFBRSxDQUFDO0VBQ1YsSUFBSSxHQUFHLEVBQUUsRUFBRTtFQUNYLElBQUksT0FBTyxFQUFFLENBQUM7RUFDZCxHQUFHO0VBQ0gsRUFBRTtFQUNGLElBQUksS0FBSyxFQUFFLE1BQU07RUFDakIsSUFBSSxFQUFFLEVBQUUsTUFBTTtFQUNkLElBQUksSUFBSSxFQUFFLGtCQUFrQjtFQUM1QixJQUFJLGFBQWEsRUFBRTtFQUNuQixNQUFNLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxFQUFFLEVBQUUsYUFBYSxFQUFFO0VBQ2pELE1BQU0sRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxFQUFFLGtCQUFrQixFQUFFO0VBQzNELE1BQU0sRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLEVBQUUsRUFBRSxjQUFjLEVBQUU7RUFDbkQsTUFBTSxFQUFFLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxFQUFFLEVBQUUsbUJBQW1CLEVBQUU7RUFDN0QsTUFBTSxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsRUFBRSxFQUFFLGFBQWEsRUFBRTtFQUNqRCxNQUFNLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsRUFBRSxrQkFBa0IsRUFBRTtFQUMzRCxLQUFLO0VBQ0wsSUFBSSxPQUFPLEVBQUUsYUFBYTtFQUMxQixJQUFJLFFBQVEsRUFBRSxJQUFJO0VBQ2xCLEdBQUc7RUFDSCxFQUFFO0VBQ0YsSUFBSSxLQUFLLEVBQUUsYUFBYTtFQUN4QixJQUFJLElBQUksRUFBRSxrQkFBa0I7RUFDNUIsSUFBSSxFQUFFLEVBQUUsVUFBVTtFQUNsQixJQUFJLGFBQWEsRUFBRTtFQUNuQixNQUFNLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFO0VBQ3pDLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUU7RUFDakMsTUFBTSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFO0VBQzVDLEtBQUs7RUFDTCxJQUFJLE9BQU8sRUFBRSxHQUFHO0VBQ2hCLEdBQUc7RUFDSCxFQUFDO0FBQ0Q7RUFDQSxNQUFNLGVBQWUsNEJBQTRCO0VBQ2pEO0VBQ0EsRUFBRSxXQUFXLENBQUMsQ0FBQyxPQUFPLEVBQUU7RUFDeEI7RUFDQSxJQUFJLE1BQU0sUUFBUSxHQUFHO0VBQ3JCLE1BQU0sQ0FBQyxFQUFFLENBQUM7RUFDVixNQUFNLEdBQUcsRUFBRSxDQUFDLEVBQUU7RUFDZCxNQUFNLEdBQUcsRUFBRSxFQUFFO0VBQ2IsTUFBTSxRQUFRLEVBQUUsQ0FBQztFQUNqQixNQUFNLFFBQVEsRUFBRSxDQUFDO0VBQ2pCLE1BQU0sSUFBSSxFQUFFLGFBQWE7RUFDekI7RUFDQSxNQUFLO0FBQ0w7RUFDQSxJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFDO0VBQ3ZFLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFVO0VBQ3JELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFDO0FBQzdEO0VBQ0EsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBQztFQUM1QixJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRTtFQUN0QixJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRTtBQUNuQjtFQUNBLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDNUMsTUFBTSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUc7RUFDdkIsTUFBTSxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQztFQUNsQyxLQUFLLE1BQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUU7RUFDeEQsTUFBTSxJQUFJLENBQUMsTUFBTSxHQUFHLFNBQVE7RUFDNUIsTUFBTSxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQztFQUNsQyxLQUFLO0FBQ0w7RUFDQTtFQUNBLElBQUksUUFBUSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUk7RUFDOUIsTUFBTSxLQUFLLGFBQWEsQ0FBQztFQUN6QixNQUFNLEtBQUssa0JBQWtCO0VBQzdCLFFBQVEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFDO0VBQ3ZDLFFBQVEsS0FBSztFQUNiLE1BQU0sS0FBSyxjQUFjO0VBQ3pCLFFBQVEsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFDO0VBQzNDLFFBQVEsS0FBSztFQUNiLE1BQU0sS0FBSyxtQkFBbUI7RUFDOUIsUUFBUSxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBQztFQUNoRCxRQUFRLEtBQUs7RUFDYixNQUFNLEtBQUssYUFBYTtFQUN4QixRQUFRLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBQztFQUMxQyxRQUFRLEtBQUs7RUFDYixNQUFNLEtBQUssa0JBQWtCO0VBQzdCLFFBQVEsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUM7RUFDL0MsUUFBUSxLQUFLO0VBQ2IsTUFBTTtFQUNOLFFBQVEsTUFBTSxJQUFJLEtBQUssQ0FBQywyQkFBMkIsQ0FBQztFQUNwRCxLQUFLO0FBQ0w7RUFDQSxJQUFJLElBQUksQ0FBQyxjQUFjLEdBQUU7RUFDekIsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFDO0VBQzNDLEdBQUc7QUFDSDtFQUNBO0FBQ0E7RUFDQSxFQUFFLFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRTtFQUN6QixJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3JDLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRztFQUN6QixRQUFRLEdBQUcsRUFBRSxJQUFJLFFBQVEsQ0FBQyxpQkFBaUI7RUFDM0MsVUFBVSxRQUFRLENBQUMsR0FBRztFQUN0QixVQUFVLFFBQVEsQ0FBQyxHQUFHO0VBQ3RCLFVBQVUsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDekQsU0FBUyxDQUFDO0VBQ1YsUUFBUSxNQUFNLEVBQUUsS0FBSztFQUNyQixRQUFPO0VBQ1AsS0FBSztFQUNMLEdBQUc7QUFDSDtFQUNBLEVBQUUsZUFBZSxDQUFDLENBQUMsUUFBUSxFQUFFO0VBQzdCO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0FBQ0E7RUFDQTtFQUNBLElBQUksTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLFNBQVE7RUFDbEMsSUFBSSxJQUFJLElBQUksR0FBRyxDQUFDLEVBQUU7RUFDbEIsTUFBTSxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFDO0VBQ2pELE1BQU0sS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDdkMsUUFBUSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDNUMsWUFBWSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLFVBQVM7RUFDbEQsUUFBUSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ3ZELFlBQVksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsVUFBUztBQUM3RDtFQUNBLFFBQVEsTUFBTSxNQUFNO0VBQ3BCLFVBQVUsSUFBSSxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztFQUM5QixjQUFjLE9BQU8sR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO0VBQ3hELGdCQUFnQixPQUFPLEdBQUcsR0FBRyxHQUFHLE9BQU87RUFDdkMsa0JBQWtCLEdBQUcsR0FBRyxFQUFDO0FBQ3pCO0VBQ0EsUUFBUSxNQUFNLEdBQUcsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUM7RUFDbEQ7RUFDQSxVQUFVLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQztFQUMzQixXQUFXLENBQUMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxLQUFLLEdBQUcsQ0FBQztFQUMxRSxXQUFXLENBQUMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxLQUFLLEdBQUcsQ0FBQztFQUMxRSxTQUFTLEVBQUM7QUFDVjtFQUNBLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRztFQUMzQixVQUFVLEdBQUcsRUFBRSxJQUFJLFFBQVEsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO0VBQ3JDLFVBQVUsTUFBTSxFQUFFLEtBQUs7RUFDdkIsVUFBUztFQUNULE9BQU87RUFDUCxLQUFLLE1BQU07RUFDWCxNQUFNLE1BQU0sT0FBTyxHQUFHLFFBQVE7RUFDOUIsUUFBUSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztFQUMvRCxRQUFPO0VBQ1AsTUFBTSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUN2QyxRQUFRLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUN6QyxZQUFZLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxVQUFTO0VBQ2hELFFBQVEsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztFQUNwRCxZQUFZLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsVUFBUztBQUMzRDtFQUNBLFFBQVEsTUFBTSxhQUFhLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztBQUM5QztFQUNBLFFBQVEsTUFBTSxVQUFVO0VBQ3hCLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsYUFBYSxFQUFFLENBQUM7RUFDekUsWUFBWSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxHQUFHLE9BQU87RUFDNUMsYUFBYSxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUM7RUFDN0MsV0FBVyxHQUFHLEVBQUM7QUFDZjtFQUNBLFFBQVEsTUFBTSxHQUFHLEdBQUcsT0FBTyxHQUFHLFdBQVU7QUFDeEM7RUFDQSxRQUFRLElBQUksSUFBRztFQUNmLFFBQVEsSUFBSSxJQUFJLEdBQUcsQ0FBQyxFQUFFO0VBQ3RCLFVBQVUsR0FBRyxHQUFHLGlCQUFpQixDQUFDLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUM7RUFDL0MsWUFBWSxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUM7RUFDN0IsYUFBYSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUN6RCxhQUFhLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ3pELFdBQVcsRUFBQztFQUNaLFNBQVMsTUFBTSxJQUFJLElBQUksR0FBRyxDQUFDLEVBQUU7RUFDN0IsVUFBVSxHQUFHLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBQztFQUMzRSxTQUFTLE1BQU07RUFDZixVQUFVLEdBQUcsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLEdBQUcsRUFBRSxFQUFFLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFDO0VBQzlFLFNBQVM7QUFDVDtFQUNBLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRztFQUMzQixVQUFVLEdBQUcsRUFBRSxJQUFJLFFBQVEsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO0VBQ3JDLFVBQVUsTUFBTSxFQUFFLEtBQUs7RUFDdkIsVUFBUztFQUNULE9BQU87RUFDUCxLQUFLO0VBQ0wsR0FBRztBQUNIO0VBQ0EsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDLFFBQVEsRUFBRTtFQUNsQyxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3JDLE1BQU0sTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUM7RUFDbEMsTUFBTSxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUM7RUFDckMsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHO0VBQ3pCLFFBQVEsR0FBRyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDL0IsUUFBUSxNQUFNLEVBQUUsS0FBSztFQUNyQixRQUFPO0VBQ1AsS0FBSztFQUNMLEdBQUc7QUFDSDtFQUNBLEVBQUUsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFO0VBQzVCLElBQUksTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLFNBQVE7RUFDbEMsSUFBSSxRQUFRLElBQUk7RUFDaEIsTUFBTSxLQUFLLENBQUMsRUFBRTtFQUNkLFFBQVEsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFDO0VBQ2xFLFFBQVEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDekMsVUFBVSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUNyRCxVQUFVLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUc7RUFDN0IsWUFBWSxHQUFHLEVBQUUsSUFBSSxVQUFVLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQztFQUNqRCxZQUFZLE1BQU0sRUFBRSxLQUFLO0VBQ3pCLFlBQVc7RUFDWCxTQUFTO0VBQ1QsT0FBTztFQUNQLFFBQVEsS0FBSztFQUNiLE1BQU0sS0FBSyxDQUFDLENBQUM7RUFDYixNQUFNLFNBQVM7RUFDZixRQUFRLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEdBQUcsRUFBRTtFQUNqQyxVQUFVLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBQztFQUNwRSxVQUFVLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQzNDLFlBQVksTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDdkQsWUFBWSxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUMxRCxZQUFZLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUc7RUFDL0IsY0FBYyxHQUFHLEVBQUUsSUFBSSxVQUFVLENBQUMsS0FBSyxHQUFHLFFBQVEsR0FBRyxHQUFHLEdBQUcsUUFBUSxDQUFDO0VBQ3BFLGNBQWMsTUFBTSxFQUFFLEtBQUs7RUFDM0IsY0FBYTtFQUNiLFdBQVc7RUFDWCxTQUFTLE1BQU07RUFDZixVQUFVLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBQztFQUNyRSxVQUFVLElBQUksU0FBUyxHQUFHLFVBQVM7RUFDbkMsVUFBVSxPQUFPLFNBQVMsS0FBSyxTQUFTLEVBQUU7RUFDMUMsWUFBWSxTQUFTLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFDO0VBQ2pFLFdBQVc7QUFDWDtFQUNBLFVBQVUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDM0MsWUFBWSxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUN4RCxZQUFZLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQ3hELFlBQVksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRztFQUMvQixjQUFjLEdBQUcsRUFBRSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEdBQUcsU0FBUyxHQUFHLEdBQUcsR0FBRyxNQUFNLEdBQUcsU0FBUyxDQUFDO0VBQ2hGLGNBQWMsTUFBTSxFQUFFLEtBQUs7RUFDM0IsY0FBYTtFQUNiLFdBQVc7RUFDWCxTQUFTO0VBQ1QsUUFBUSxLQUFLO0VBQ2IsT0FBTztFQUNQLEtBQUs7RUFDTCxHQUFHO0FBQ0g7RUFDQSxFQUFFLG1CQUFtQixDQUFDLENBQUMsUUFBUSxFQUFFO0VBQ2pDO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLFNBQVE7RUFDbEMsSUFBSSxRQUFRLElBQUk7RUFDaEIsTUFBTSxLQUFLLENBQUM7RUFDWixNQUFNO0VBQ04sUUFBUSxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUM7RUFDbEUsUUFBUSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUN6QyxVQUFVLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQ3JELFVBQVUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxHQUFHLEtBQUssR0FBRyxTQUFRO0VBQzdELFVBQVUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRztFQUM3QixZQUFZLEdBQUcsRUFBRSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUM7RUFDckMsWUFBWSxNQUFNLEVBQUUsS0FBSztFQUN6QixZQUFXO0VBQ1gsU0FBUztFQUNULFFBQVEsS0FBSztFQUNiLE9BQU87QUFDUDtFQUNBLE1BQU0sS0FBSyxDQUFDLEVBQUU7RUFDZCxRQUFRLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBQztFQUNuRSxRQUFRLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBQztFQUNuRSxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3pDLFVBQVUsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDckQsVUFBVSxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQUM7RUFDM0QsVUFBVSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHO0VBQzdCLFlBQVksR0FBRyxFQUFFLElBQUksVUFBVSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUM7RUFDakQsWUFBWSxNQUFNLEVBQUUsS0FBSztFQUN6QixZQUFXO0VBQ1gsU0FBUztFQUNULFFBQVEsS0FBSztFQUNiLE9BQU87QUFDUDtFQUNBLE1BQU0sS0FBSyxDQUFDLEVBQUU7RUFDZCxRQUFRLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBQztFQUMzRCxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3pDLFVBQVUsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDckQsVUFBVSxNQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUNsRCxVQUFVLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUc7RUFDN0IsWUFBWSxHQUFHLEVBQUUsSUFBSSxVQUFVLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDO0VBQ3RELFlBQVksTUFBTSxFQUFFLEtBQUs7RUFDekIsWUFBVztFQUNYLFNBQVM7RUFDVCxRQUFRLEtBQUs7RUFDYixPQUFPO0FBQ1A7RUFDQSxNQUFNLEtBQUssQ0FBQyxFQUFFO0VBQ2QsUUFBUSxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBQztFQUMvQyxRQUFRLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFDO0VBQ2xELFFBQVEsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFDO0VBQ3RELFFBQVEsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFDO0VBQ3RELFFBQVEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDekMsVUFBVSxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUNqRCxVQUFVLE1BQU0sRUFBRSxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUN2RCxVQUFVLE1BQU0sRUFBRSxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUN2RCxVQUFVLE1BQU0sRUFBRSxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUN2RCxVQUFVLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUU7RUFDdEQsVUFBVSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHO0VBQzdCLFlBQVksR0FBRyxFQUFFLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQztFQUNyQyxZQUFZLE1BQU0sRUFBRSxLQUFLO0VBQ3pCLFlBQVc7RUFDWCxTQUFTO0VBQ1QsUUFBUSxLQUFLO0VBQ2IsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsQ0FBQztFQUNiLE1BQU0sS0FBSyxDQUFDLEVBQUU7RUFDZCxRQUFRLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBQztFQUNsRSxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3pDLFVBQVUsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDckQsVUFBVSxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQ3hELFVBQVUsSUFBSSxJQUFJLEdBQUcsTUFBSztFQUMxQixVQUFVLElBQUksSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLElBQUksU0FBUTtFQUN6RCxVQUFVLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxJQUFJLEdBQUcsR0FBRyxTQUFRO0VBQ2pELFVBQVUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRztFQUM3QixZQUFZLEdBQUcsRUFBRSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUM7RUFDckMsWUFBWSxNQUFNLEVBQUUsS0FBSztFQUN6QixZQUFXO0VBQ1gsU0FBUztFQUNULFFBQVEsS0FBSztFQUNiLE9BQU87QUFDUDtFQUNBLE1BQU0sS0FBSyxDQUFDLEVBQUU7RUFDZCxRQUFRLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFDO0VBQy9DLFFBQVEsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUM7RUFDbEQsUUFBUSxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUM7RUFDdEQsUUFBUSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUN6QyxVQUFVLE1BQU0sRUFBRSxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQ2xELFVBQVUsTUFBTSxHQUFHLEdBQUcsR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQ3hELFVBQVUsTUFBTSxHQUFHLEdBQUcsR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQ3hELFVBQVUsSUFBSSxJQUFJLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUc7RUFDN0MsVUFBVSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO0VBQzNCLFlBQVksTUFBTSxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUNwRCxZQUFZLE1BQU0sR0FBRyxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUMxRCxZQUFZLE1BQU0sR0FBRyxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUMxRCxZQUFZLElBQUksSUFBSSxHQUFHLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUc7RUFDbEQsV0FBVztFQUNYLFVBQVUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRztFQUM3QixZQUFZLEdBQUcsRUFBRSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUM7RUFDckMsWUFBWSxNQUFNLEVBQUUsS0FBSztFQUN6QixZQUFXO0VBQ1gsU0FBUztFQUNULFFBQVEsS0FBSztFQUNiLE9BQU87QUFDUDtFQUNBLE1BQU0sS0FBSyxDQUFDLENBQUM7RUFDYixNQUFNLFNBQVM7RUFDZixRQUFRLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBQztFQUNsRSxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3pDLFVBQVUsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUN4RCxVQUFVLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUc7RUFDN0IsWUFBWSxHQUFHLEVBQUUsSUFBSSxVQUFVLENBQUMsUUFBUSxHQUFHLEdBQUcsR0FBRyxRQUFRLENBQUM7RUFDMUQsWUFBWSxNQUFNLEVBQUUsS0FBSztFQUN6QixZQUFXO0VBQ1gsU0FBUztFQUNULE9BQU87RUFDUCxLQUFLO0VBQ0wsR0FBRztBQUNIO0VBQ0E7RUFDQSxFQUFFLGNBQWMsQ0FBQyxHQUFHO0VBQ3BCO0VBQ0EsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUNyQyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUc7RUFDdEIsUUFBUSxHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0VBQy9FLFFBQVEsTUFBTSxFQUFFLEtBQUs7RUFDckIsUUFBTztFQUNQLEtBQUs7RUFDTCxHQUFHO0FBQ0g7RUFDQTtBQUNBO0VBQ0EsRUFBRSxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRTtFQUNoQztFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksUUFBUSxnQkFBZ0I7RUFDNUIsTUFBTSxLQUFLLENBQUM7RUFDWixRQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUcsS0FBSSxFQUFFLEVBQUM7RUFDcEQsUUFBUSxLQUFLO0VBQ2IsTUFBTSxLQUFLLENBQUMsRUFBRTtFQUNkLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sR0FBRyxLQUFJLEVBQUUsRUFBQztFQUNwRCxRQUFRLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBQztFQUNoRSxRQUFRLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxHQUFHO0VBQzVDLFlBQVksUUFBUTtFQUNwQixZQUFZLENBQUMsUUFBUSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBQztBQUNuQztFQUNBLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLEdBQUcsTUFBSztFQUMzQyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxHQUFHLEtBQUk7RUFDN0MsUUFBUSxLQUFLO0VBQ2IsT0FBTztFQUNQLE1BQU0sS0FBSyxDQUFDO0VBQ1osUUFBUSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLEtBQUksRUFBRSxFQUFDO0VBQ3ZELFFBQVEsS0FBSztFQUNiLE1BQU07RUFDTixRQUFRLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDO0VBQ3hDLEtBQUs7RUFDTCxHQUFHO0VBQ0gsQ0FBQztBQUNEO0VBQ0EsTUFBTSxlQUFlLFNBQVMsWUFBWSxDQUFDO0VBQzNDLEVBQUUsV0FBVyxDQUFDLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRTtFQUM5QixJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFDO0FBQ3hCO0VBQ0EsSUFBSSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBSztFQUM1QixJQUFJLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFNO0VBQzlCLElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBQztFQUM1QyxJQUFJLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQztBQUN6QjtFQUNBO0VBQ0E7RUFDQSxJQUFJLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztBQUN6QztFQUNBO0VBQ0EsSUFBSSxJQUFJLENBQUMsWUFBWSxHQUFHLEdBQUU7RUFDMUIsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ2hDLE1BQU0sTUFBTSxLQUFLLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUM7RUFDckQsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBQztFQUN0RCxLQUFLO0FBQ0w7RUFDQTtFQUNBLElBQUksSUFBSSxDQUFDLFVBQVUsR0FBRyxHQUFFO0VBQ3hCLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUNoQyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDO0VBQzNGLEtBQUs7QUFDTDtFQUNBLElBQUksSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFDO0FBQzVGO0VBQ0EsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFFO0FBQ25CO0VBQ0EsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBQztBQUN6QjtFQUNBO0VBQ0EsR0FBRztBQUNIO0VBQ0EsRUFBRSxRQUFRLENBQUMsR0FBRztFQUNkO0VBQ0EsSUFBSSxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUM7RUFDN0MsSUFBSSxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUM7RUFDakQsSUFBSSxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUM7QUFDbkQ7RUFDQTtFQUNBLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJO0VBQ2hDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUM7RUFDeEUsS0FBSyxFQUFDO0VBQ04sR0FBRztBQUNIO0VBQ0EsRUFBRSxVQUFVLENBQUMsR0FBRztFQUNoQjtFQUNBLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSztFQUN6QyxNQUFNLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTztFQUNqQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztFQUM3QixVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxHQUFFO0VBQzFCLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7RUFDdkIsUUFBUSxHQUFHLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7RUFDakMsUUFBUSxLQUFLLEVBQUUsQ0FBQyxDQUFDLE1BQU0sR0FBRyxFQUFFLEdBQUcsS0FBSztFQUNwQyxRQUFRLEtBQUssRUFBRSxLQUFLO0VBQ3BCLFFBQVEsTUFBTSxFQUFFLGVBQWU7RUFDL0IsUUFBUSxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sR0FBRyxlQUFlLEdBQUcsZUFBZTtFQUM1RCxPQUFPLEVBQUM7RUFDUixLQUFLLEVBQUM7QUFDTjtFQUNBO0VBQ0EsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLO0VBQ3RDLE1BQU0sTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPO0VBQ2pDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0VBQzdCLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEdBQUU7RUFDMUIsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztFQUN2QixRQUFRLEdBQUcsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztFQUMvQixRQUFRLEtBQUssRUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLEVBQUUsR0FBRyxLQUFLO0VBQ3BDLFFBQVEsS0FBSyxFQUFFLEtBQUs7RUFDcEIsUUFBUSxNQUFNLEVBQUUsYUFBYTtFQUM3QixRQUFRLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLGFBQWEsR0FBRyxhQUFhO0VBQ3hELE9BQU8sRUFBQztFQUNSLEtBQUssRUFBQztBQUNOO0VBQ0E7RUFDQSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO0VBQ3JCLE1BQU0sR0FBRyxFQUFFLElBQUksQ0FBQyxjQUFjO0VBQzlCLE1BQU0sS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTTtFQUM3QixNQUFNLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU07RUFDN0IsTUFBTSxNQUFNLEVBQUUsUUFBUTtFQUN0QixNQUFNLE1BQU0sRUFBRSxRQUFRO0VBQ3RCLEtBQUssRUFBQztBQUNOO0VBQ0E7RUFDQSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSTtFQUM3QixNQUFNLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLE1BQUs7RUFDdEIsTUFBTSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxPQUFNO0VBQ3hCLEtBQUssRUFBQztFQUNOLEdBQUc7QUFDSDtFQUNBLEVBQUUsTUFBTSxDQUFDLEdBQUc7RUFDWixJQUFJLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksRUFBQztFQUM1QyxJQUFJLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQztBQUN6QjtFQUNBLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFDO0FBQzlEO0VBQ0EsSUFBSSxHQUFHLENBQUMsU0FBUyxHQUFFO0VBQ25CLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUNoQyxNQUFNLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFDO0VBQ3BDLE1BQU0sTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDO0VBQ2pELE1BQU0sR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDMUIsTUFBTSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBQztFQUNoQyxLQUFLO0VBQ0wsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFFO0VBQ2hCLElBQUksR0FBRyxDQUFDLFNBQVMsR0FBRTtBQUNuQjtFQUNBO0VBQ0EsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBQztFQUMzQixHQUFHO0FBQ0g7RUFDQSxFQUFFLFVBQVUsQ0FBQyxHQUFHO0VBQ2hCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJO0VBQzdCLE1BQU0sQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsTUFBSztFQUN0QixNQUFNLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLE9BQU07RUFDeEIsS0FBSyxFQUFDO0VBQ04sSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBQztFQUMzQixJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSTtFQUN4QixHQUFHO0FBQ0g7RUFDQSxFQUFFLFVBQVUsQ0FBQyxHQUFHO0VBQ2hCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJO0VBQzdCLE1BQU0sQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsTUFBSztFQUN0QixNQUFNLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLE9BQU07RUFDeEIsS0FBSyxFQUFDO0VBQ04sSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBQztFQUMzQixJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBSztFQUN6QixHQUFHO0VBQ0g7O0VDaGpCZSxNQUFNLEtBQUssU0FBUyxLQUFLLENBQUM7RUFDekMsRUFBRSxXQUFXLENBQUMsQ0FBQyxPQUFPLEVBQUU7RUFDeEIsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFDO0FBQ2xCO0VBQ0EsSUFBSSxNQUFNLFFBQVEsR0FBRztFQUNyQixNQUFNLFVBQVUsRUFBRSxDQUFDO0VBQ25CLE1BQU0sS0FBSyxFQUFFLEdBQUc7RUFDaEIsTUFBTSxLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUM7RUFDcEIsTUFBTSxLQUFLLEVBQUUsSUFBSTtFQUNqQixNQUFLO0VBQ0wsSUFBSSxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFDO0FBQ3pEO0VBQ0EsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxNQUFLO0FBQy9CO0VBQ0E7RUFDQSxJQUFJLElBQUksTUFBSztFQUNiLElBQUksSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7RUFDckMsTUFBTSxLQUFLLEdBQUcsT0FBTTtFQUNwQixLQUFLLE1BQU07RUFDWCxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBQztFQUN0QyxLQUFLO0FBQ0w7RUFDQSxJQUFJLElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSyxHQUFHLFFBQVEsQ0FBQyxVQUFVLEdBQUcsY0FBYyxHQUFHLE1BQUs7RUFDN0UsSUFBSSxJQUFJLENBQUMsV0FBVyxHQUFHLFNBQVMsR0FBRyxRQUFRLENBQUMsTUFBSztBQUNqRDtFQUNBLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRTtFQUNqQixHQUFHO0FBQ0g7RUFDQSxFQUFFLFdBQVcsV0FBVyxDQUFDLEdBQUcsRUFBRSxPQUFPLG1CQUFtQixFQUFFO0VBQzFELENBQUM7QUFDRDtFQUNBLEtBQUssQ0FBQyxXQUFXLEdBQUc7RUFDcEIsRUFBRTtFQUNGLElBQUksS0FBSyxFQUFFLGVBQWU7RUFDMUIsSUFBSSxFQUFFLEVBQUUsT0FBTztFQUNmLElBQUksSUFBSSxFQUFFLGtCQUFrQjtFQUM1QixJQUFJLGFBQWEsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDO0VBQ3pDLElBQUksT0FBTyxFQUFFLEVBQUU7RUFDZixHQUFHO0VBQ0gsRUFBRTtFQUNGLElBQUksS0FBSyxFQUFFLGVBQWU7RUFDMUIsSUFBSSxFQUFFLEVBQUUsT0FBTztFQUNmLElBQUksSUFBSSxFQUFFLE1BQU07RUFDaEIsSUFBSSxPQUFPLEVBQUUsSUFBSTtFQUNqQixHQUFHO0VBQ0g7O0VDN0NlLE1BQU0sUUFBUSxTQUFTLEtBQUssQ0FBQztFQUM1QyxFQUFFLFdBQVcsQ0FBQyxDQUFDLE9BQU8sRUFBRTtFQUN4QixJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUM7QUFDbEI7RUFDQSxJQUFJLE1BQU0sUUFBUSxHQUFHO0VBQ3JCLE1BQU0sVUFBVSxFQUFFLENBQUM7RUFDbkIsTUFBTSxLQUFLLEVBQUUsR0FBRztFQUNoQixNQUFLO0VBQ0wsSUFBSSxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFDO0FBQ3pEO0VBQ0EsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxNQUFLO0FBQy9CO0VBQ0E7RUFDQSxJQUFJLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUM7RUFDckcsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBRztBQUNyQjtFQUNBLElBQUksSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLEdBQUcsYUFBWTtFQUN6QyxJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQUM7QUFDL0I7RUFDQSxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUU7RUFDakIsR0FBRztBQUNIO0VBQ0EsRUFBRSxXQUFXLFdBQVcsQ0FBQyxHQUFHO0VBQzVCLElBQUksT0FBTyxVQUFVO0VBQ3JCLEdBQUc7RUFDSCxDQUFDO0FBQ0Q7RUFDQSxRQUFRLENBQUMsV0FBVyxHQUFHO0VBQ3ZCOztFQzNCQTtFQUNlLE1BQU0sY0FBYyxTQUFTLEtBQUssQ0FBQztFQUNsRDtFQUNBLEVBQUUsV0FBVyxDQUFDLENBQUMsT0FBTyxFQUFFO0VBQ3hCO0VBQ0EsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFDO0FBQ2xCO0VBQ0EsSUFBSSxNQUFNLFFBQVEsR0FBRztFQUNyQixNQUFNLFVBQVUsRUFBRSxDQUFDO0VBQ25CLE1BQUs7QUFDTDtFQUNBLElBQUksTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBQztFQUN6RCxJQUFJLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUM7QUFDekQ7RUFDQTtFQUNBLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUU7RUFDNUIsSUFBSSxJQUFJLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUk7QUFDOUI7RUFDQSxJQUFJLFFBQVEsVUFBVTtFQUN0QixNQUFNLEtBQUssQ0FBQyxDQUFDO0VBQ2IsTUFBTSxLQUFLLENBQUMsQ0FBQztFQUNiLE1BQU0sS0FBSyxDQUFDO0VBQ1osUUFBUSxJQUFJLEdBQUcsVUFBVSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ3RDLFFBQVEsSUFBSSxHQUFHLEVBQUM7RUFDaEIsUUFBUSxJQUFJLEdBQUcsVUFBVSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFFO0VBQ3ZDLFFBQVEsSUFBSSxHQUFHLEdBQUU7RUFDakIsUUFBUSxDQUFDLEdBQUcsV0FBVyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUM7RUFDbkMsUUFBUSxDQUFDLEdBQUcsV0FBVyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUM7RUFDbkMsUUFBUSxFQUFFLEdBQUcsVUFBVSxHQUFHLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUM7RUFDdkUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFDO0FBQ3ZCO0VBQ0EsUUFBUSxJQUFJLFVBQVUsR0FBRyxDQUFDLEVBQUU7RUFDNUIsVUFBVSxFQUFFLEdBQUcsV0FBVyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFDO0VBQ3RDLFNBQVMsTUFBTTtFQUNmLFVBQVUsRUFBRSxHQUFHLEdBQUU7RUFDakIsVUFBVSxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBQyxFQUN2RCxTQUFTO0VBQ1QsUUFBUSxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFDO0VBQ3ZCLFFBQVEsS0FBSztFQUNiLE1BQU0sS0FBSyxDQUFDLENBQUM7RUFDYixNQUFNLFNBQVM7RUFDZixRQUFRLE1BQU0sRUFBRSxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3BDLFFBQVEsTUFBTSxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNyQyxRQUFRLENBQUMsR0FBRyxJQUFJLFFBQVEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFDO0VBQ2hDLFFBQVEsRUFBRSxHQUFHLElBQUksUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBQztFQUMvQyxRQUFRLEVBQUUsR0FBRyxJQUFJLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUM7RUFDL0MsUUFBUSxDQUFDLEdBQUcsSUFBSSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDM0MsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDNUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDO0VBQzdCLFFBQVEsS0FBSztFQUNiLE9BQU87RUFDUCxLQUFLO0FBQ0w7RUFDQSxJQUFJLE1BQU0sSUFBSTtFQUNkLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUU7RUFDakQsVUFBVSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRztFQUN0RCxZQUFZLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSTtFQUMzRCxjQUFjLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLEdBQUcsR0FBRztFQUM3QyxpQkFBaUIsQ0FBQyxHQUFHLEdBQUcsRUFBQztBQUN6QjtFQUNBLElBQUksTUFBTSxRQUFRO0VBQ2xCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUU7RUFDakQsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQzdELFlBQVksQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLEtBQUssR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFO0VBQzlDLGVBQWUsS0FBSyxHQUFHLENBQUMsRUFBQztBQUN6QjtFQUNBLElBQUksSUFBSSxDQUFDLGFBQWEsR0FBRyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksR0FBRyxFQUFFLEdBQUcsaUJBQWlCLEdBQUcsRUFBRSxHQUFHLElBQUksR0FBRyxFQUFFLEdBQUcsSUFBRztFQUN4RixJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxHQUFHLElBQUksR0FBRyxTQUFRO0VBQy9DLEdBQUc7QUFDSDtFQUNBLEVBQUUsV0FBVyxXQUFXLENBQUMsR0FBRztFQUM1QixJQUFJLE9BQU8sdUNBQXVDO0VBQ2xELEdBQUc7RUFDSDs7RUM3RUE7Ozs7Ozs7UUFjcUIsdUJBQXdCLFNBQVEsWUFBWTtNQVMvRCxZQUFhLElBQThCLEVBQUUsT0FBa0M7VUFDN0UsS0FBSyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQTtVQUNwQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFBO1VBQ3hCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7VUFDMUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUE7VUFDMUQsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUE7VUFFL0MsSUFBSSxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUE7O1VBRzdELElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1VBQ3hCLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1VBQzdCLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFBO1VBQ1gsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFBO1VBQ2xCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Y0FDaEQsVUFBVSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUE7Y0FDaEQsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQTtXQUNoRDs7VUFHRCxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBOztVQUV0RyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBOztVQUdyQyxVQUFVLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQTtVQUM1RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7O2NBRS9DLE1BQU0sS0FBSyxHQUFvQixFQUFFLENBQUE7Y0FDakMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7Y0FDdEMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLFNBQVMsQ0FBQTs7Y0FHcEUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTs7Ozs7Ozs7Ozs7Ozs7OztjQW1CaEMsTUFBTSxRQUFRLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUE7Y0FFaEMsS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxRQUFRLEVBQUUsVUFBVSxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtjQUN2RyxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtjQUNuQixLQUFLLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQTtjQUV2QixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxF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QUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDckQsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFBO1VBQzVDLE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQTtVQUM3QyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxJQUFJLFVBQVUsRUFBRSxDQUFDLE1BQU0sR0FBRyxNQUFNLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQTs7VUFHcEYsT0FBTyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDN0MsV0FBVyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDakQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUE7VUFDL0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FDNUQ7TUFFRCxNQUFNO1VBQ0osTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7VUFDeEMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1VBQ3pDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJ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
