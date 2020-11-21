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
      static unitVector(p1, p2) {
          // returns a unit vector in the direction of p1 to p2
          // in the form {x:..., y:...}
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

  class RectangleAreaData {
      constructor(base, height, showOpposites, dp, areaProperties, perimeterProperties) {
          this.base = base;
          this.height = height;
          this.showOpposites = showOpposites;
          this.dp = dp;
          this._area = areaProperties;
          this._perimeter = perimeterProperties;
      }
      static random(options) {
          options.maxLength = options.maxLength || 20; // default values
          const dp = options.dp || 0;
          const sides = {
              base: randBetween(1, options.maxLength),
              height: randBetween(1, options.maxLength)
          };
          const base = { val: sides.base, show: true, missing: false, label: scaledStr(sides.base, dp) + "\\mathrm{cm}" };
          const height = { val: sides.height, show: true, missing: false, label: scaledStr(sides.base, dp) + "\\mathrm{cm}" };
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
          return new this(base, height, showOpposites, dp, areaProperties, perimeterProperties);
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
              this._perimeter.label = scaledStr(this._perimeter.val, this.dp) + "\\mathrm{cm}";
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
              this._area.label = scaledStr(this._area.val, 2 * this.dp) + "\\mathrm{cm}^2";
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
          loaded: false,
          data: []
      },
      200: {
          length: 715,
          path: '/data/triangles100-200.json',
          loaded: false,
          data: []
      },
      300: {
          length: 927,
          path: '/data/triangles200-300.json',
          loaded: false,
          data: []
      },
      400: {
          length: 1043,
          path: '/data/triangles300-400.json',
          loaded: false,
          data: []
      },
      500: {
          length: 1151,
          path: '/data/triangles400-500.json',
          loaded: false,
          data: []
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
      if (dataSource.loaded) { // Cached
          console.log('Using cached data');
          triangle = randElem(dataSource.data.filter(t => maxSide(t) < maxLength && filterPredicate(t)));
          return Promise.resolve(triangle);
      }
      else {
          console.log('Loading data with XHR');
          return fetch(`${pathRoot}${dataSource.path}`).then(response => {
              if (!response.ok) {
                  return Promise.reject(response.statusText);
              }
              else {
                  return response.json();
              }
          }).then(data => {
              if (!dataSource.loaded) { // cache if something hasn't beaten us to it
                  dataSource.loaded = true;
                  dataSource.data = data;
              }
              triangle = randElem(data.filter((t) => maxSide(t) < maxLength && filterPredicate(t)));
              return triangle;
          });
      }
  }
  function maxSide(triangle) {
      return Math.max(triangle.b, triangle.s1, triangle.s2);
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
              this._perimeter.label = scaledStr(this._perimeter.val, this.dp) + '\\mathrm{cm}';
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
              this.renderLabels();
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
                  if (i < 3 || this.data.isRightAngled()) {
                      pos.translate(-unitvec.y * offset, unitvec.x * offset);
                  }
                  const texta = (_b = sides[i][2].label) !== null && _b !== void 0 ? _b : sides[i][2].val.toString();
                  const textq = sides[i][2].missing ? '?' : texta;
                  const styleq = 'normal';
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
                  if (Math.random() < 0.5 || shape === 'rectangle') { // decimal
                      questionOptions.dp = 1;
                      questionOptions.maxLength = 99;
                  }
                  else {
                      questionOptions.fraction = true;
                      questionOptions.maxLength = 40;
                  }
                  questionOptions.noDistractors = false;
                  break;
              case 5:
                  if (Math.random() < 0.5 || shape === 'rectangle') { // decimal
                      questionOptions.dp = 1;
                      questionOptions.maxLength = 500;
                  }
                  else {
                      questionOptions.fraction = true;
                      questionOptions.maxLength = 400;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vbW9kdWxlcy92ZW5kb3IvcnNsaWRlci5qcyIsIi4uL21vZHVsZXMvdXRpbGl0aWVzLmpzIiwiLi4vLi4vbW9kdWxlcy9PcHRpb25zU2V0LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9RdWVzdGlvbi50cyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGV4dFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FsZ2VicmFpY0ZyYWN0aW9uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvSW50ZWdlckFkZC5qcyIsIi4uLy4uL21vZHVsZXMvUG9pbnQudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRLnRzIiwiLi4vbW9kdWxlcy92ZW5kb3IvZnJhY3Rpb24uanMiLCIuLi9tb2R1bGVzL01vbm9taWFsLmpzIiwiLi4vbW9kdWxlcy9Qb2x5bm9taWFsLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9Bcml0aG1hZ29uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGVzdFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FkZEFaZXJvLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9UZXh0US9FcXVhdGlvbk9mTGluZS5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUS50cyIsIi4uL21vZHVsZXMvTGluRXhwci5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9zb2x2ZUFuZ2xlcy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dvcmRlZFEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dyYXBwZXIudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvUmVjdGFuZ2xlQXJlYURhdGEudHMiLCIuLi9tb2R1bGVzL2RyYXdpbmcuanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvdHlwZXMudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvUmVjdGFuZ2xlQXJlYVZpZXcudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvUmVjdGFuZ2xlQXJlYVEudHMiLCIuLi9ub2RlX21vZHVsZXMvdHNsaWIvdHNsaWIuZXM2LmpzIiwiLi4vLi4vbW9kdWxlcy90cmlhbmdsZURhdGEudHMiLCIuLi9ub2RlX21vZHVsZXMvZnJhY3Rpb24uanMvZnJhY3Rpb24uanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvVHJpYW5nbGVBcmVhRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQXJlYVBlcmltZXRlci9UcmlhbmdsZUFyZWFWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9BcmVhUGVyaW1ldGVyL1RyaWFuZ2xlQXJlYVEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvQXJlYVdyYXBwZXIudHMiLCIuLi9tb2R1bGVzL1RvcGljQ2hvb3Nlci5qcyIsIi4uL25vZGVfbW9kdWxlcy90aW5nbGUuanMvZGlzdC90aW5nbGUubWluLmpzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvblNldC50cyIsIi4uL21haW4uanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogUnNsaWRlci4gRG93bmxvYWRlZCBmcm9tIGh0dHBzOi8vc2xhd29taXItemF6aWFibG8uZ2l0aHViLmlvL3JhbmdlLXNsaWRlci9cbiAqIE1vZGlmaWVkIHRvIG1ha2UgaW50byBFUzYgbW9kdWxlIGFuZCBmaXggYSBmZXcgYnVnc1xuICovXG5cbnZhciBSUyA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIHRoaXMuaW5wdXQgPSBudWxsXG4gIHRoaXMuaW5wdXREaXNwbGF5ID0gbnVsbFxuICB0aGlzLnNsaWRlciA9IG51bGxcbiAgdGhpcy5zbGlkZXJXaWR0aCA9IDBcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gMFxuICB0aGlzLnBvaW50ZXJXaWR0aCA9IDBcbiAgdGhpcy5wb2ludGVyUiA9IG51bGxcbiAgdGhpcy5wb2ludGVyTCA9IG51bGxcbiAgdGhpcy5hY3RpdmVQb2ludGVyID0gbnVsbFxuICB0aGlzLnNlbGVjdGVkID0gbnVsbFxuICB0aGlzLnNjYWxlID0gbnVsbFxuICB0aGlzLnN0ZXAgPSAwXG4gIHRoaXMudGlwTCA9IG51bGxcbiAgdGhpcy50aXBSID0gbnVsbFxuICB0aGlzLnRpbWVvdXQgPSBudWxsXG4gIHRoaXMudmFsUmFuZ2UgPSBmYWxzZVxuXG4gIHRoaXMudmFsdWVzID0ge1xuICAgIHN0YXJ0OiBudWxsLFxuICAgIGVuZDogbnVsbFxuICB9XG4gIHRoaXMuY29uZiA9IHtcbiAgICB0YXJnZXQ6IG51bGwsXG4gICAgdmFsdWVzOiBudWxsLFxuICAgIHNldDogbnVsbCxcbiAgICByYW5nZTogZmFsc2UsXG4gICAgd2lkdGg6IG51bGwsXG4gICAgc2NhbGU6IHRydWUsXG4gICAgbGFiZWxzOiB0cnVlLFxuICAgIHRvb2x0aXA6IHRydWUsXG4gICAgc3RlcDogbnVsbCxcbiAgICBkaXNhYmxlZDogZmFsc2UsXG4gICAgb25DaGFuZ2U6IG51bGxcbiAgfVxuXG4gIHRoaXMuY2xzID0ge1xuICAgIGNvbnRhaW5lcjogJ3JzLWNvbnRhaW5lcicsXG4gICAgYmFja2dyb3VuZDogJ3JzLWJnJyxcbiAgICBzZWxlY3RlZDogJ3JzLXNlbGVjdGVkJyxcbiAgICBwb2ludGVyOiAncnMtcG9pbnRlcicsXG4gICAgc2NhbGU6ICdycy1zY2FsZScsXG4gICAgbm9zY2FsZTogJ3JzLW5vc2NhbGUnLFxuICAgIHRpcDogJ3JzLXRvb2x0aXAnXG4gIH1cblxuICBmb3IgKHZhciBpIGluIHRoaXMuY29uZikgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbmYsIGkpKSB0aGlzLmNvbmZbaV0gPSBjb25mW2ldIH1cblxuICB0aGlzLmluaXQoKVxufVxuXG5SUy5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHR5cGVvZiB0aGlzLmNvbmYudGFyZ2V0ID09PSAnb2JqZWN0JykgdGhpcy5pbnB1dCA9IHRoaXMuY29uZi50YXJnZXRcbiAgZWxzZSB0aGlzLmlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5jb25mLnRhcmdldC5yZXBsYWNlKCcjJywgJycpKVxuXG4gIGlmICghdGhpcy5pbnB1dCkgcmV0dXJuIGNvbnNvbGUubG9nKCdDYW5ub3QgZmluZCB0YXJnZXQgZWxlbWVudC4uLicpXG5cbiAgdGhpcy5pbnB1dERpc3BsYXkgPSBnZXRDb21wdXRlZFN0eWxlKHRoaXMuaW5wdXQsIG51bGwpLmRpc3BsYXlcbiAgdGhpcy5pbnB1dC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG4gIHRoaXMudmFsUmFuZ2UgPSAhKHRoaXMuY29uZi52YWx1ZXMgaW5zdGFuY2VvZiBBcnJheSlcblxuICBpZiAodGhpcy52YWxSYW5nZSkge1xuICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuY29uZi52YWx1ZXMsICdtaW4nKSB8fCAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuY29uZi52YWx1ZXMsICdtYXgnKSkgeyByZXR1cm4gY29uc29sZS5sb2coJ01pc3NpbmcgbWluIG9yIG1heCB2YWx1ZS4uLicpIH1cbiAgfVxuICByZXR1cm4gdGhpcy5jcmVhdGVTbGlkZXIoKVxufVxuXG5SUy5wcm90b3R5cGUuY3JlYXRlU2xpZGVyID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNsaWRlciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLmNvbnRhaW5lcilcbiAgdGhpcy5zbGlkZXIuaW5uZXJIVE1MID0gJzxkaXYgY2xhc3M9XCJycy1iZ1wiPjwvZGl2PidcbiAgdGhpcy5zZWxlY3RlZCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnNlbGVjdGVkKVxuICB0aGlzLnBvaW50ZXJMID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMucG9pbnRlciwgWydkaXInLCAnbGVmdCddKVxuICB0aGlzLnNjYWxlID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMuc2NhbGUpXG5cbiAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7XG4gICAgdGhpcy50aXBMID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMudGlwKVxuICAgIHRoaXMudGlwUiA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnRpcClcbiAgICB0aGlzLnBvaW50ZXJMLmFwcGVuZENoaWxkKHRoaXMudGlwTClcbiAgfVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnNlbGVjdGVkKVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnNjYWxlKVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnBvaW50ZXJMKVxuXG4gIGlmICh0aGlzLmNvbmYucmFuZ2UpIHtcbiAgICB0aGlzLnBvaW50ZXJSID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMucG9pbnRlciwgWydkaXInLCAncmlnaHQnXSlcbiAgICBpZiAodGhpcy5jb25mLnRvb2x0aXApIHRoaXMucG9pbnRlclIuYXBwZW5kQ2hpbGQodGhpcy50aXBSKVxuICAgIHRoaXMuc2xpZGVyLmFwcGVuZENoaWxkKHRoaXMucG9pbnRlclIpXG4gIH1cblxuICB0aGlzLmlucHV0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuc2xpZGVyLCB0aGlzLmlucHV0Lm5leHRTaWJsaW5nKVxuXG4gIGlmICh0aGlzLmNvbmYud2lkdGgpIHRoaXMuc2xpZGVyLnN0eWxlLndpZHRoID0gcGFyc2VJbnQodGhpcy5jb25mLndpZHRoKSArICdweCdcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gdGhpcy5zbGlkZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdFxuICB0aGlzLnNsaWRlcldpZHRoID0gdGhpcy5zbGlkZXIuY2xpZW50V2lkdGhcbiAgdGhpcy5wb2ludGVyV2lkdGggPSB0aGlzLnBvaW50ZXJMLmNsaWVudFdpZHRoXG5cbiAgaWYgKCF0aGlzLmNvbmYuc2NhbGUpIHRoaXMuc2xpZGVyLmNsYXNzTGlzdC5hZGQodGhpcy5jbHMubm9zY2FsZSlcblxuICByZXR1cm4gdGhpcy5zZXRJbml0aWFsVmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLnNldEluaXRpYWxWYWx1ZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZGlzYWJsZWQodGhpcy5jb25mLmRpc2FibGVkKVxuXG4gIGlmICh0aGlzLnZhbFJhbmdlKSB0aGlzLmNvbmYudmFsdWVzID0gcHJlcGFyZUFycmF5VmFsdWVzKHRoaXMuY29uZilcblxuICB0aGlzLnZhbHVlcy5zdGFydCA9IDBcbiAgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnJhbmdlID8gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxIDogMFxuXG4gIGlmICh0aGlzLmNvbmYuc2V0ICYmIHRoaXMuY29uZi5zZXQubGVuZ3RoICYmIGNoZWNrSW5pdGlhbCh0aGlzLmNvbmYpKSB7XG4gICAgdmFyIHZhbHMgPSB0aGlzLmNvbmYuc2V0XG5cbiAgICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgICB0aGlzLnZhbHVlcy5zdGFydCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzBdKVxuICAgICAgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnNldFsxXSA/IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzFdKSA6IG51bGxcbiAgICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHZhbHNbMF0pXG4gIH1cbiAgcmV0dXJuIHRoaXMuY3JlYXRlU2NhbGUoKVxufVxuXG5SUy5wcm90b3R5cGUuY3JlYXRlU2NhbGUgPSBmdW5jdGlvbiAocmVzaXplKSB7XG4gIHRoaXMuc3RlcCA9IHRoaXMuc2xpZGVyV2lkdGggLyAodGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHtcbiAgICB2YXIgc3BhbiA9IGNyZWF0ZUVsZW1lbnQoJ3NwYW4nKVxuICAgIHZhciBpbnMgPSBjcmVhdGVFbGVtZW50KCdpbnMnKVxuXG4gICAgc3Bhbi5hcHBlbmRDaGlsZChpbnMpXG4gICAgdGhpcy5zY2FsZS5hcHBlbmRDaGlsZChzcGFuKVxuXG4gICAgc3Bhbi5zdHlsZS53aWR0aCA9IGkgPT09IGlMZW4gLSAxID8gMCA6IHRoaXMuc3RlcCArICdweCdcblxuICAgIGlmICghdGhpcy5jb25mLmxhYmVscykge1xuICAgICAgaWYgKGkgPT09IDAgfHwgaSA9PT0gaUxlbiAtIDEpIGlucy5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW2ldXG4gICAgfSBlbHNlIGlucy5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW2ldXG5cbiAgICBpbnMuc3R5bGUubWFyZ2luTGVmdCA9IChpbnMuY2xpZW50V2lkdGggLyAyKSAqIC0xICsgJ3B4J1xuICB9XG4gIHJldHVybiB0aGlzLmFkZEV2ZW50cygpXG59XG5cblJTLnByb3RvdHlwZS51cGRhdGVTY2FsZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zdGVwID0gdGhpcy5zbGlkZXJXaWR0aCAvICh0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpXG5cbiAgdmFyIHBpZWNlcyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NwYW4nKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gcGllY2VzLmxlbmd0aDsgaSA8IGlMZW4gLSAxOyBpKyspIHsgcGllY2VzW2ldLnN0eWxlLndpZHRoID0gdGhpcy5zdGVwICsgJ3B4JyB9XG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLmFkZEV2ZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHBvaW50ZXJzID0gdGhpcy5zbGlkZXIucXVlcnlTZWxlY3RvckFsbCgnLicgKyB0aGlzLmNscy5wb2ludGVyKVxuICB2YXIgcGllY2VzID0gdGhpcy5zbGlkZXIucXVlcnlTZWxlY3RvckFsbCgnc3BhbicpXG5cbiAgY3JlYXRlRXZlbnRzKGRvY3VtZW50LCAnbW91c2Vtb3ZlIHRvdWNobW92ZScsIHRoaXMubW92ZS5iaW5kKHRoaXMpKVxuICBjcmVhdGVFdmVudHMoZG9jdW1lbnQsICdtb3VzZXVwIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgdGhpcy5kcm9wLmJpbmQodGhpcykpXG5cbiAgZm9yIChsZXQgaSA9IDAsIGlMZW4gPSBwb2ludGVycy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgY3JlYXRlRXZlbnRzKHBvaW50ZXJzW2ldLCAnbW91c2Vkb3duIHRvdWNoc3RhcnQnLCB0aGlzLmRyYWcuYmluZCh0aGlzKSkgfVxuXG4gIGZvciAobGV0IGkgPSAwLCBpTGVuID0gcGllY2VzLmxlbmd0aDsgaSA8IGlMZW47IGkrKykgeyBjcmVhdGVFdmVudHMocGllY2VzW2ldLCAnY2xpY2snLCB0aGlzLm9uQ2xpY2tQaWVjZS5iaW5kKHRoaXMpKSB9XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMub25SZXNpemUuYmluZCh0aGlzKSlcblxuICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxufVxuXG5SUy5wcm90b3R5cGUuZHJhZyA9IGZ1bmN0aW9uIChlKSB7XG4gIGUucHJldmVudERlZmF1bHQoKVxuXG4gIGlmICh0aGlzLmNvbmYuZGlzYWJsZWQpIHJldHVyblxuXG4gIHZhciBkaXIgPSBlLnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtZGlyJylcbiAgaWYgKGRpciA9PT0gJ2xlZnQnKSB0aGlzLmFjdGl2ZVBvaW50ZXIgPSB0aGlzLnBvaW50ZXJMXG4gIGlmIChkaXIgPT09ICdyaWdodCcpIHRoaXMuYWN0aXZlUG9pbnRlciA9IHRoaXMucG9pbnRlclJcblxuICByZXR1cm4gdGhpcy5zbGlkZXIuY2xhc3NMaXN0LmFkZCgnc2xpZGluZycpXG59XG5cblJTLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24gKGUpIHtcbiAgaWYgKHRoaXMuYWN0aXZlUG9pbnRlciAmJiAhdGhpcy5jb25mLmRpc2FibGVkKSB7XG4gICAgdmFyIGNvb3JkWCA9IGUudHlwZSA9PT0gJ3RvdWNobW92ZScgPyBlLnRvdWNoZXNbMF0uY2xpZW50WCA6IGUucGFnZVhcbiAgICB2YXIgaW5kZXggPSBjb29yZFggLSB0aGlzLnNsaWRlckxlZnQgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKVxuXG4gICAgaW5kZXggPSBNYXRoLnJvdW5kKGluZGV4IC8gdGhpcy5zdGVwKVxuXG4gICAgaWYgKGluZGV4IDw9IDApIGluZGV4ID0gMFxuICAgIGlmIChpbmRleCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgaW5kZXggPSB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDFcblxuICAgIGlmICh0aGlzLmNvbmYucmFuZ2UpIHtcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgPT09IHRoaXMucG9pbnRlckwpIHRoaXMudmFsdWVzLnN0YXJ0ID0gaW5kZXhcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgPT09IHRoaXMucG9pbnRlclIpIHRoaXMudmFsdWVzLmVuZCA9IGluZGV4XG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IGluZGV4XG5cbiAgICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxuICB9XG59XG5cblJTLnByb3RvdHlwZS5kcm9wID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmFjdGl2ZVBvaW50ZXIgPSBudWxsXG59XG5cblJTLnByb3RvdHlwZS5zZXRWYWx1ZXMgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICB2YXIgYWN0aXZlUG9pbnRlciA9IHRoaXMuY29uZi5yYW5nZSA/ICdzdGFydCcgOiAnZW5kJ1xuXG4gIGlmIChzdGFydCAmJiB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2Yoc3RhcnQpID4gLTEpIHsgdGhpcy52YWx1ZXNbYWN0aXZlUG9pbnRlcl0gPSB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2Yoc3RhcnQpIH1cblxuICBpZiAoZW5kICYmIHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZihlbmQpID4gLTEpIHsgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKGVuZCkgfVxuXG4gIGlmICh0aGlzLmNvbmYucmFuZ2UgJiYgdGhpcy52YWx1ZXMuc3RhcnQgPiB0aGlzLnZhbHVlcy5lbmQpIHsgdGhpcy52YWx1ZXMuc3RhcnQgPSB0aGlzLnZhbHVlcy5lbmQgfVxuXG4gIHRoaXMucG9pbnRlckwuc3R5bGUubGVmdCA9ICh0aGlzLnZhbHVlc1thY3RpdmVQb2ludGVyXSAqIHRoaXMuc3RlcCAtICh0aGlzLnBvaW50ZXJXaWR0aCAvIDIpKSArICdweCdcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7XG4gICAgICB0aGlzLnRpcEwuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5zdGFydF1cbiAgICAgIHRoaXMudGlwUi5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1cbiAgICB9XG4gICAgdGhpcy5pbnB1dC52YWx1ZSA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdICsgJywnICsgdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG4gICAgdGhpcy5wb2ludGVyUi5zdHlsZS5sZWZ0ID0gKHRoaXMudmFsdWVzLmVuZCAqIHRoaXMuc3RlcCAtICh0aGlzLnBvaW50ZXJXaWR0aCAvIDIpKSArICdweCdcbiAgfSBlbHNlIHtcbiAgICBpZiAodGhpcy5jb25mLnRvb2x0aXApIHsgdGhpcy50aXBMLmlubmVySFRNTCA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXSB9XG4gICAgdGhpcy5pbnB1dC52YWx1ZSA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxuICB9XG5cbiAgaWYgKHRoaXMudmFsdWVzLmVuZCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG4gIGlmICh0aGlzLnZhbHVlcy5zdGFydCA8IDApIHRoaXMudmFsdWVzLnN0YXJ0ID0gMFxuXG4gIHRoaXMuc2VsZWN0ZWQuc3R5bGUud2lkdGggPSAodGhpcy52YWx1ZXMuZW5kIC0gdGhpcy52YWx1ZXMuc3RhcnQpICogdGhpcy5zdGVwICsgJ3B4J1xuICB0aGlzLnNlbGVjdGVkLnN0eWxlLmxlZnQgPSB0aGlzLnZhbHVlcy5zdGFydCAqIHRoaXMuc3RlcCArICdweCdcblxuICByZXR1cm4gdGhpcy5vbkNoYW5nZSgpXG59XG5cblJTLnByb3RvdHlwZS5vbkNsaWNrUGllY2UgPSBmdW5jdGlvbiAoZSkge1xuICBpZiAodGhpcy5jb25mLmRpc2FibGVkKSByZXR1cm5cblxuICB2YXIgaWR4ID0gTWF0aC5yb3VuZCgoZS5jbGllbnRYIC0gdGhpcy5zbGlkZXJMZWZ0KSAvIHRoaXMuc3RlcClcblxuICBpZiAoaWR4ID4gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKSBpZHggPSB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDFcbiAgaWYgKGlkeCA8IDApIGlkeCA9IDBcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgaWYgKGlkeCAtIHRoaXMudmFsdWVzLnN0YXJ0IDw9IHRoaXMudmFsdWVzLmVuZCAtIGlkeCkge1xuICAgICAgdGhpcy52YWx1ZXMuc3RhcnQgPSBpZHhcbiAgICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gaWR4XG4gIH0gZWxzZSB0aGlzLnZhbHVlcy5lbmQgPSBpZHhcblxuICB0aGlzLnNsaWRlci5jbGFzc0xpc3QucmVtb3ZlKCdzbGlkaW5nJylcblxuICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxufVxuXG5SUy5wcm90b3R5cGUub25DaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBfdGhpcyA9IHRoaXNcblxuICBpZiAodGhpcy50aW1lb3V0KSBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0KVxuXG4gIHRoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIGlmIChfdGhpcy5jb25mLm9uQ2hhbmdlICYmIHR5cGVvZiBfdGhpcy5jb25mLm9uQ2hhbmdlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gX3RoaXMuY29uZi5vbkNoYW5nZShfdGhpcy5pbnB1dC52YWx1ZSlcbiAgICB9XG4gIH0sIDUwMClcbn1cblxuUlMucHJvdG90eXBlLm9uUmVzaXplID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNsaWRlckxlZnQgPSB0aGlzLnNsaWRlci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0XG4gIHRoaXMuc2xpZGVyV2lkdGggPSB0aGlzLnNsaWRlci5jbGllbnRXaWR0aFxuICByZXR1cm4gdGhpcy51cGRhdGVTY2FsZSgpXG59XG5cblJTLnByb3RvdHlwZS5kaXNhYmxlZCA9IGZ1bmN0aW9uIChkaXNhYmxlZCkge1xuICB0aGlzLmNvbmYuZGlzYWJsZWQgPSBkaXNhYmxlZFxuICB0aGlzLnNsaWRlci5jbGFzc0xpc3RbZGlzYWJsZWQgPyAnYWRkJyA6ICdyZW1vdmUnXSgnZGlzYWJsZWQnKVxufVxuXG5SUy5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIFJldHVybiBsaXN0IG9mIG51bWJlcnMsIHJhdGhlciB0aGFuIGEgc3RyaW5nLCB3aGljaCB3b3VsZCBqdXN0IGJlIHNpbGx5XG4gIC8vICByZXR1cm4gdGhpcy5pbnB1dC52YWx1ZVxuICByZXR1cm4gW3RoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdLCB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1dXG59XG5cblJTLnByb3RvdHlwZS5nZXRWYWx1ZUwgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIEdldCBsZWZ0IChpLmUuIHNtYWxsZXN0KSB2YWx1ZVxuICByZXR1cm4gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5zdGFydF1cbn1cblxuUlMucHJvdG90eXBlLmdldFZhbHVlUiA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gR2V0IHJpZ2h0IChpLmUuIHNtYWxsZXN0KSB2YWx1ZVxuICByZXR1cm4gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG59XG5cblJTLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmlucHV0LnN0eWxlLmRpc3BsYXkgPSB0aGlzLmlucHV0RGlzcGxheVxuICB0aGlzLnNsaWRlci5yZW1vdmUoKVxufVxuXG52YXIgY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uIChlbCwgY2xzLCBkYXRhQXR0cikge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZWwpXG4gIGlmIChjbHMpIGVsZW1lbnQuY2xhc3NOYW1lID0gY2xzXG4gIGlmIChkYXRhQXR0ciAmJiBkYXRhQXR0ci5sZW5ndGggPT09IDIpIHsgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2RhdGEtJyArIGRhdGFBdHRyWzBdLCBkYXRhQXR0clsxXSkgfVxuXG4gIHJldHVybiBlbGVtZW50XG59XG5cbnZhciBjcmVhdGVFdmVudHMgPSBmdW5jdGlvbiAoZWwsIGV2LCBjYWxsYmFjaykge1xuICB2YXIgZXZlbnRzID0gZXYuc3BsaXQoJyAnKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gZXZlbnRzLmxlbmd0aDsgaSA8IGlMZW47IGkrKykgeyBlbC5hZGRFdmVudExpc3RlbmVyKGV2ZW50c1tpXSwgY2FsbGJhY2spIH1cbn1cblxudmFyIHByZXBhcmVBcnJheVZhbHVlcyA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIHZhciB2YWx1ZXMgPSBbXVxuICB2YXIgcmFuZ2UgPSBjb25mLnZhbHVlcy5tYXggLSBjb25mLnZhbHVlcy5taW5cblxuICBpZiAoIWNvbmYuc3RlcCkge1xuICAgIGNvbnNvbGUubG9nKCdObyBzdGVwIGRlZmluZWQuLi4nKVxuICAgIHJldHVybiBbY29uZi52YWx1ZXMubWluLCBjb25mLnZhbHVlcy5tYXhdXG4gIH1cblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IChyYW5nZSAvIGNvbmYuc3RlcCk7IGkgPCBpTGVuOyBpKyspIHsgdmFsdWVzLnB1c2goY29uZi52YWx1ZXMubWluICsgaSAqIGNvbmYuc3RlcCkgfVxuXG4gIGlmICh2YWx1ZXMuaW5kZXhPZihjb25mLnZhbHVlcy5tYXgpIDwgMCkgdmFsdWVzLnB1c2goY29uZi52YWx1ZXMubWF4KVxuXG4gIHJldHVybiB2YWx1ZXNcbn1cblxudmFyIGNoZWNrSW5pdGlhbCA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIGlmICghY29uZi5zZXQgfHwgY29uZi5zZXQubGVuZ3RoIDwgMSkgcmV0dXJuIG51bGxcbiAgaWYgKGNvbmYudmFsdWVzLmluZGV4T2YoY29uZi5zZXRbMF0pIDwgMCkgcmV0dXJuIG51bGxcblxuICBpZiAoY29uZi5yYW5nZSkge1xuICAgIGlmIChjb25mLnNldC5sZW5ndGggPCAyIHx8IGNvbmYudmFsdWVzLmluZGV4T2YoY29uZi5zZXRbMV0pIDwgMCkgcmV0dXJuIG51bGxcbiAgfVxuICByZXR1cm4gdHJ1ZVxufVxuXG5leHBvcnQgZGVmYXVsdCBSU1xuIiwiLyogUk5HcyAvIHNlbGVjdG9ycyAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdhdXNzaWFuIChuKSB7XG4gIGxldCBybnVtID0gMFxuICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgIHJudW0gKz0gTWF0aC5yYW5kb20oKVxuICB9XG4gIHJldHVybiBybnVtIC8gblxufVxuXG4vKipcbiAqIHJldHVybiBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbiBhbmQgbSBpbmNsdXNpdmVcbiAqIGRpc3QgKG9wdGlvbmFsKSBpcyBhIGZ1bmN0aW9uIHJldHVybmluZyBhIHZhbHVlIGluIFswLDEpXG4gKiBAcGFyYW0ge251bWJlcn0gbiBUaGUgbWluaW11bSB2YWx1ZVxuICogQHBhcmFtIHtudW1iZXJ9IG0gVGhlIG1heGltdW0gdmFsdWVcbiAqIEBwYXJhbSB7KCk9Pm51bWJlcn0gW2Rpc3RdIEEgZGlzdHJpYnV0aW9uIHJldHVybmluZyBhIG51bWJlciBmcm9tIDAgdG8gMVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZEJldHdlZW4gKG4sIG0sIGRpc3QpIHtcbiAgLy8gcmV0dXJuIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBuIGFuZCBtIGluY2x1c2l2ZVxuICAvLyBkaXN0IChvcHRpb25hbCkgaXMgYSBmdW5jdGlvbiByZXR1cm5pbmcgYSB2YWx1ZSBpbiBbMCwxKVxuICAvLyBkZWZhdWx0IGlzIHNsaWdodGx5IGJpYXNlZCB0b3dhcmRzIG1pZGRsZVxuICBpZiAoIWRpc3QpIGRpc3QgPSBNYXRoLnJhbmRvbVxuICByZXR1cm4gbiArIE1hdGguZmxvb3IoZGlzdCgpICogKG0gLSBuICsgMSkpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kQmV0d2VlbkZpbHRlciAobiwgbSwgZmlsdGVyKSB7XG4gIC8qIHJldHVybnMgYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIG4gYW5kIG0gaW5jbHVzaXZlIHdoaWNoIHNhdGlzZmllcyB0aGUgZmlsdGVyXG4gIC8gIG4sIG06IGludGVnZXJcbiAgLyAgZmlsdGVyOiBJbnQtPiBCb29sXG4gICovXG4gIGNvbnN0IGFyciA9IFtdXG4gIGZvciAobGV0IGkgPSBuOyBpIDwgbSArIDE7IGkrKykge1xuICAgIGlmIChmaWx0ZXIoaSkpIGFyci5wdXNoKGkpXG4gIH1cbiAgaWYgKGFyciA9PT0gW10pIHRocm93IG5ldyBFcnJvcignb3ZlcmZpbHRlcmVkJylcbiAgY29uc3QgaSA9IHJhbmRCZXR3ZWVuKDAsIGFyci5sZW5ndGggLSAxKVxuICByZXR1cm4gYXJyW2ldXG59XG5cbi8qKlxuICogUmV0dXJucyBhIG11bHRpcGxlIG9mIG4gYmV0d2VlbiBtaW4gYW5kIG1heFxuICogQHBhcmFtIHtudW1iZXJ9IG1pbiBNaW5pbXVtIHZhbHVlXG4gKiBAcGFyYW0ge251bWJlcn0gbWF4IE1heGltdW0gdmFsdWVcbiAqIEBwYXJhbSB7bnVtYmVyfSBuIENob29zZSBhIG11bHRpcGxlIG9mIHRoaXMgdmFsdWVcbiAqIEByZXR1cm5zIHtudW1iZXJ9IEEgbXVsdGlwbGVvZiBuIGJldHdlZW4gbWluIGFuZCBtYXhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmRNdWx0QmV0d2VlbiAobWluLCBtYXgsIG4pIHtcbiAgLy8gcmV0dXJuIGEgcmFuZG9tIG11bHRpcGxlIG9mIG4gYmV0d2VlbiBuIGFuZCBtIChpbmNsdXNpdmUgaWYgcG9zc2libGUpXG4gIG1pbiA9IE1hdGguY2VpbChtaW4gLyBuKSAqIG5cbiAgbWF4ID0gTWF0aC5mbG9vcihtYXggLyBuKSAqIG4gLy8gY291bGQgY2hlY2sgZGl2aXNpYmlsaXR5IGZpcnN0IHRvIG1heGltaXNlIHBlcmZvcm1hY2UsIGJ1dCBJJ20gc3VyZSB0aGUgaGl0IGlzbid0IGJhZFxuXG4gIHJldHVybiByYW5kQmV0d2VlbihtaW4gLyBuLCBtYXggLyBuKSAqIG5cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgcmFuZG9tIGVsZW1lbnQgb2YgYW4gYXJyYXlcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge1RbXX0gYXJyYXkgQW4gYXJyYXkgb2Ygb2JqZWN0c1xuICogQHBhcmFtIHsoKT0+bnVtYmVyfSBbZGlzdF0gQSBkaXN0cmlidXRpb24gZnVuY3Rpb24gZm9yIHdlaWdodGluZywgcmV0dXJuaW5nIGEgbnVtYmVyIGJldHdlZW4gMCBhbmQgMS4gRGVmYXVsdCBpcyBNYXRoLnJhbmRvbVxuICogQHJldHVybnMge1R9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kRWxlbSAoYXJyYXksIGRpc3QpIHtcbiAgaWYgKFsuLi5hcnJheV0ubGVuZ3RoID09PSAwKSB0aHJvdyBuZXcgRXJyb3IoJ2VtcHR5IGFycmF5JylcbiAgaWYgKCFkaXN0KSBkaXN0ID0gTWF0aC5yYW5kb21cbiAgY29uc3QgbiA9IGFycmF5Lmxlbmd0aCB8fCBhcnJheS5zaXplXG4gIGNvbnN0IGkgPSByYW5kQmV0d2VlbigwLCBuIC0gMSwgZGlzdClcbiAgcmV0dXJuIFsuLi5hcnJheV1baV1cbn1cblxuLyoqXG4gKiBTZWxlY3RzIGFuIGVsZW1lbnRcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge1RbXX0gYXJyYXkgQW4gYXJyYXkgb2YgZWxlbWVudHNcbiAqIEBwYXJhbSB7bnVtYmVyW119IHByb2JhYmlsaXRpZXMgQW4gYXJyYXkgb2YgcHJvYmJpbGl0aWVzXG4gKiBAcmV0dXJucyB7VH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmRFbGVtV2l0aFByb2JhYmlsaXRpZXMgKGFycmF5LCBwcm9iYWJpbGl0aWVzKSB7XG4gIC8vIHZhbGlkYXRlXG4gIGlmIChhcnJheS5sZW5ndGggIT09IHByb2JhYmlsaXRpZXMubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoJ0FycmF5IGxlbmd0aHMgZG8gbm90IG1hdGNoJylcblxuICBjb25zdCByID0gTWF0aC5yYW5kb20oKVxuICBsZXQgY3VtdWxhdGl2ZVByb2IgPSAwXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICBjdW11bGF0aXZlUHJvYiArPSBwcm9iYWJpbGl0aWVzW2ldXG4gICAgaWYgKHIgPCBjdW11bGF0aXZlUHJvYikgcmV0dXJuIGFycmF5W2ldXG4gIH1cblxuICAvLyBzaG91bGRuJ3QgZ2V0IGhlcmUgaWYgcHJvYmFiaWxpdGllcyBzdW0gdG8gMSwgYnV0IGNvdWxkIGJlIGEgcm91bmRpbmcgZXJyb3JcbiAgY29uc29sZS53YXJuKGBQcm9iYWJpbGl0aWVzIGRvbid0IHN1bSB0byAxPyBUb3RhbCB3YXMgJHtjdW11bGF0aXZlUHJvYn1gKVxuICByZXR1cm4gKGFycmF5W2FycmF5Lmxlbmd0aCAtIDFdKVxufVxuXG4vKiBNYXRocyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJvdW5kVG9UZW4gKG4pIHtcbiAgcmV0dXJuIE1hdGgucm91bmQobiAvIDEwKSAqIDEwXG59XG5cbi8qKlxuICogUm91bmRzIGEgbnVtYmVyIHRvIGEgZ2l2ZW4gbnVtYmVyIG9mIGRlY2ltYWwgcGxhY2VzXG4gKiBAcGFyYW0ge251bWJlcn0geCBUaGUgbnVtYmVyIHRvIHJvdW5kXG4gKiBAcGFyYW0ge251bWJlcn0gbiBUaGUgbnVtYmVyIG9mIGRlY2ltYWwgcGxhY2VzXG4gKiBAcmV0dXJucyB7bnVtYmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcm91bmREUCAoeCwgbikge1xuICByZXR1cm4gTWF0aC5yb3VuZCh4ICogTWF0aC5wb3coMTAsIG4pKSAvIE1hdGgucG93KDEwLCBuKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVnVG9SYWQgKHgpIHtcbiAgcmV0dXJuIHggKiBNYXRoLlBJIC8gMTgwXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaW5EZWcgKHgpIHtcbiAgcmV0dXJuIE1hdGguc2luKHggKiBNYXRoLlBJIC8gMTgwKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY29zRGVnICh4KSB7XG4gIHJldHVybiBNYXRoLmNvcyh4ICogTWF0aC5QSSAvIDE4MClcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGluZyBuLzEwXmRwXG4gKiBFLmcuIHNjYWxlZFN0cigzMTQsMikgPSBcIjMuMTRcIlxuICogQHBhcmFtIHtudW1iZXJ9IG4gQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIGRpZ2l0cyBvZiBhIGZpeGVkIHBvaW50IG51bWJlclxuICogQHBhcmFtIHtudW1iZXJ9IGRwIEFuIGludGVnZXIgZm9yIG51bWJlciBvZiBkZWNpbWFsIHBsYWNlc1xuICogQHJldHVybnMge3N0cmluZ31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNjYWxlZFN0ciAobiwgZHApIHtcbiAgaWYgKGRwID09PSAwKSByZXR1cm4gblxuICBjb25zdCBmYWN0b3IgPSBNYXRoLnBvdygxMCwgZHApXG4gIGNvbnN0IGludHBhcnQgPSBNYXRoLmZsb29yKG4gLyBmYWN0b3IpXG4gIGNvbnN0IGRlY3BhcnQgPSBuICUgZmFjdG9yXG4gIGlmIChkZWNwYXJ0ID09PSAwKSB7XG4gICAgcmV0dXJuIGludHBhcnRcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gaW50cGFydCArICcuJyArIGRlY3BhcnRcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2NkIChhLCBiKSB7XG4gIC8vIHRha2VuIGZyb20gZnJhY3Rpb24uanNcbiAgaWYgKCFhKSB7IHJldHVybiBiIH1cbiAgaWYgKCFiKSB7IHJldHVybiBhIH1cblxuICB3aGlsZSAoMSkge1xuICAgIGEgJT0gYlxuICAgIGlmICghYSkgeyByZXR1cm4gYiB9XG4gICAgYiAlPSBhXG4gICAgaWYgKCFiKSB7IHJldHVybiBhIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbGNtIChhLCBiKSB7XG4gIHJldHVybiBhICogYiAvIGdjZChhLCBiKVxufVxuXG4vKiBBcnJheXMgYW5kIHNpbWlsYXIgKi9cblxuLyoqXG4gKiBTb3J0cyB0d28gYXJyYXlzIHRvZ2V0aGVyIGJhc2VkIG9uIHNvcnRpbmcgYXJyMFxuICogQHBhcmFtIHsqW119IGFycjBcbiAqIEBwYXJhbSB7KltdfSBhcnIxXG4gKiBAcGFyYW0geyp9IGZcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNvcnRUb2dldGhlciAoYXJyMCwgYXJyMSwgZikge1xuICBpZiAoYXJyMC5sZW5ndGggIT09IGFycjEubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm90aCBhcmd1bWVudHMgbXVzdCBiZSBhcnJheXMgb2YgdGhlIHNhbWUgbGVuZ3RoJylcbiAgfVxuXG4gIGYgPSBmIHx8ICgoeCwgeSkgPT4geCAtIHkpXG5cbiAgY29uc3QgbiA9IGFycjAubGVuZ3RoXG4gIGNvbnN0IGNvbWJpbmVkID0gW11cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICBjb21iaW5lZFtpXSA9IFthcnIwW2ldLCBhcnIxW2ldXVxuICB9XG5cbiAgY29tYmluZWQuc29ydCgoeCwgeSkgPT4gZih4WzBdLCB5WzBdKSlcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgIGFycjBbaV0gPSBjb21iaW5lZFtpXVswXVxuICAgIGFycjFbaV0gPSBjb21iaW5lZFtpXVsxXVxuICB9XG5cbiAgcmV0dXJuIFthcnIwLCBhcnIxXVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2h1ZmZsZSAoYXJyYXkpIHtcbiAgLy8gS251dGgtRmlzaGVyLVlhdGVzXG4gIC8vIGZyb20gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzI0NTA5NzYvMzczNzI5NVxuICAvLyBuYi4gc2h1ZmZsZXMgaW4gcGxhY2VcbiAgdmFyIGN1cnJlbnRJbmRleCA9IGFycmF5Lmxlbmd0aDsgdmFyIHRlbXBvcmFyeVZhbHVlOyB2YXIgcmFuZG9tSW5kZXhcblxuICAvLyBXaGlsZSB0aGVyZSByZW1haW4gZWxlbWVudHMgdG8gc2h1ZmZsZS4uLlxuICB3aGlsZSAoY3VycmVudEluZGV4ICE9PSAwKSB7XG4gICAgLy8gUGljayBhIHJlbWFpbmluZyBlbGVtZW50Li4uXG4gICAgcmFuZG9tSW5kZXggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjdXJyZW50SW5kZXgpXG4gICAgY3VycmVudEluZGV4IC09IDFcblxuICAgIC8vIEFuZCBzd2FwIGl0IHdpdGggdGhlIGN1cnJlbnQgZWxlbWVudC5cbiAgICB0ZW1wb3JhcnlWYWx1ZSA9IGFycmF5W2N1cnJlbnRJbmRleF1cbiAgICBhcnJheVtjdXJyZW50SW5kZXhdID0gYXJyYXlbcmFuZG9tSW5kZXhdXG4gICAgYXJyYXlbcmFuZG9tSW5kZXhdID0gdGVtcG9yYXJ5VmFsdWVcbiAgfVxuXG4gIHJldHVybiBhcnJheVxufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBhIGlzIGFuIGFycmF5IGNvbnRhaW5pbmcgZSwgZmFsc2Ugb3RoZXJ3aXNlIChpbmNsdWRpbmcgaWYgYSBpcyBub3QgYW4gYXJyYXkpXG4gKiBAcGFyYW0geyp9IGEgIEFuIGFycmF5XG4gKiBAcGFyYW0geyp9IGUgQW4gZWxlbWVudCB0byBjaGVjayBpZiBpcyBpbiB0aGUgYXJyYXlcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5leHBvcnQgZnVuY3Rpb24gd2Vha0luY2x1ZGVzIChhLCBlKSB7XG4gIHJldHVybiAoQXJyYXkuaXNBcnJheShhKSAmJiBhLmluY2x1ZGVzKGUpKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlyc3RVbmlxdWVJbmRleCAoYXJyYXkpIHtcbiAgLy8gcmV0dXJucyBpbmRleCBvZiBmaXJzdCB1bmlxdWUgZWxlbWVudFxuICAvLyBpZiBub25lLCByZXR1cm5zIGxlbmd0aCBvZiBhcnJheVxuICBsZXQgaSA9IDBcbiAgd2hpbGUgKGkgPCBhcnJheS5sZW5ndGgpIHtcbiAgICBpZiAoYXJyYXkuaW5kZXhPZihhcnJheVtpXSkgPT09IGFycmF5Lmxhc3RJbmRleE9mKGFycmF5W2ldKSkge1xuICAgICAgYnJlYWtcbiAgICB9XG4gICAgaSsrXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJvb2xPYmplY3RUb0FycmF5IChvYmopIHtcbiAgLy8gR2l2ZW4gYW4gb2JqZWN0IHdoZXJlIGFsbCB2YWx1ZXMgYXJlIGJvb2xlYW4sIHJldHVybiBrZXlzIHdoZXJlIHRoZSB2YWx1ZSBpcyB0cnVlXG4gIGNvbnN0IHJlc3VsdCA9IFtdXG4gIGZvciAoY29uc3Qga2V5IGluIG9iaikge1xuICAgIGlmIChvYmpba2V5XSkgcmVzdWx0LnB1c2goa2V5KVxuICB9XG4gIHJldHVybiByZXN1bHRcbn1cblxuLyogT2JqZWN0IHByb3BlcnR5IGFjY2VzcyBieSBzdHJpbmcgKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm9wQnlTdHJpbmcgKG8sIHMsIHgpIHtcbiAgLyogRS5nLiBieVN0cmluZyhteU9iaixcImZvby5iYXJcIikgLT4gbXlPYmouZm9vLmJhclxuICAgICAqIGJ5U3RyaW5nKG15T2JqLFwiZm9vLmJhclwiLFwiYmF6XCIpIC0+IG15T2JqLmZvby5iYXIgPSBcImJhelwiXG4gICAgICovXG4gIHMgPSBzLnJlcGxhY2UoL1xcWyhcXHcrKVxcXS9nLCAnLiQxJykgLy8gY29udmVydCBpbmRleGVzIHRvIHByb3BlcnRpZXNcbiAgcyA9IHMucmVwbGFjZSgvXlxcLi8sICcnKSAvLyBzdHJpcCBhIGxlYWRpbmcgZG90XG4gIHZhciBhID0gcy5zcGxpdCgnLicpXG4gIGZvciAodmFyIGkgPSAwLCBuID0gYS5sZW5ndGggLSAxOyBpIDwgbjsgKytpKSB7XG4gICAgdmFyIGsgPSBhW2ldXG4gICAgaWYgKGsgaW4gbykge1xuICAgICAgbyA9IG9ba11cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICB9XG4gIGlmICh4ID09PSB1bmRlZmluZWQpIHJldHVybiBvW2Fbbl1dXG4gIGVsc2Ugb1thW25dXSA9IHhcbn1cblxuLyogTG9naWMgKi9cbmV4cG9ydCBmdW5jdGlvbiBtSWYgKHAsIHEpIHsgLy8gbWF0ZXJpYWwgY29uZGl0aW9uYWxcbiAgcmV0dXJuICghcCB8fCBxKVxufVxuXG4vKiBET00gbWFuaXB1bGF0aW9uIGFuZCBxdWVyeWluZyAqL1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgSFRNTCBlbGVtZW50LCBzZXRzIGNsYXNzZXMgYW5kIGFwcGVuZHNcbiAqIEBwYXJhbSB7c3RyaW5nfSB0YWdOYW1lIFRhZyBuYW1lIG9mIGVsZW1lbnRcbiAqIEBwYXJhbSB7c3RyaW5nfHVuZGVmaW5lZH0gW2NsYXNzTmFtZV0gQSBjbGFzcyBvciBjbGFzc2VzIHRvIGFzc2lnbiB0byB0aGUgZWxlbWVudFxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gW3BhcmVudF0gQSBwYXJlbnQgZWxlbWVudCB0byBhcHBlbmQgdGhlIGVsZW1lbnQgdG9cbiAqIEByZXR1cm5zIHtIVE1MRWxlbWVudH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVsZW0gKHRhZ05hbWUsIGNsYXNzTmFtZSwgcGFyZW50KSB7XG4gIC8vIGNyZWF0ZSwgc2V0IGNsYXNzIGFuZCBhcHBlbmQgaW4gb25lXG4gIGNvbnN0IGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpXG4gIGlmIChjbGFzc05hbWUpIGVsZW0uY2xhc3NOYW1lID0gY2xhc3NOYW1lXG4gIGlmIChwYXJlbnQpIHBhcmVudC5hcHBlbmRDaGlsZChlbGVtKVxuICByZXR1cm4gZWxlbVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFzQW5jZXN0b3JDbGFzcyAoZWxlbSwgY2xhc3NOYW1lKSB7XG4gIC8vIGNoZWNrIGlmIGFuIGVsZW1lbnQgZWxlbSBvciBhbnkgb2YgaXRzIGFuY2VzdG9ycyBoYXMgY2xzc1xuICBsZXQgcmVzdWx0ID0gZmFsc2VcbiAgZm9yICg7ZWxlbSAmJiBlbGVtICE9PSBkb2N1bWVudDsgZWxlbSA9IGVsZW0ucGFyZW50Tm9kZSkgeyAvLyB0cmF2ZXJzZSBET00gdXB3YXJkc1xuICAgIGlmIChlbGVtLmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpKSB7XG4gICAgICByZXN1bHQgPSB0cnVlXG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHRcbn1cblxuLyogQ2FudmFzIGRyYXdpbmcgKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXNoZWRMaW5lIChjdHgsIHgxLCB5MSwgeDIsIHkyKSB7XG4gIGNvbnN0IGxlbmd0aCA9IE1hdGguaHlwb3QoeDIgLSB4MSwgeTIgLSB5MSlcbiAgY29uc3QgZGFzaHggPSAoeTEgLSB5MikgLyBsZW5ndGggLy8gdW5pdCB2ZWN0b3IgcGVycGVuZGljdWxhciB0byBsaW5lXG4gIGNvbnN0IGRhc2h5ID0gKHgyIC0geDEpIC8gbGVuZ3RoXG4gIGNvbnN0IG1pZHggPSAoeDEgKyB4MikgLyAyXG4gIGNvbnN0IG1pZHkgPSAoeTEgKyB5MikgLyAyXG5cbiAgLy8gZHJhdyB0aGUgYmFzZSBsaW5lXG4gIGN0eC5tb3ZlVG8oeDEsIHkxKVxuICBjdHgubGluZVRvKHgyLCB5MilcblxuICAvLyBkcmF3IHRoZSBkYXNoXG4gIGN0eC5tb3ZlVG8obWlkeCArIDUgKiBkYXNoeCwgbWlkeSArIDUgKiBkYXNoeSlcbiAgY3R4LmxpbmVUbyhtaWR4IC0gNSAqIGRhc2h4LCBtaWR5IC0gNSAqIGRhc2h5KVxuXG4gIGN0eC5tb3ZlVG8oeDIsIHkyKVxufVxuIiwiaW1wb3J0IHsgT3B0aW9uc1NwZWMsIE9wdGlvbiBhcyBPcHRpb25JLCBTZWxlY3RFeGNsdXNpdmVPcHRpb24sIFNlbGVjdEluY2x1c2l2ZU9wdGlvbiwgUmVhbE9wdGlvbiwgUmFuZ2VPcHRpb24sIEludGVnZXJPcHRpb24sIEJvb2xlYW5PcHRpb24gfSBmcm9tICdPcHRpb25zU3BlYydcbmltcG9ydCB7IGNyZWF0ZUVsZW0gfSBmcm9tICd1dGlsaXRpZXMnXG5cbi8qKiAgUmVjb3JkcyB0eXBzZSBvZiBvcHRpb24gYXZhaWxhYmlsdHksIGFuZCBsaW5rIHRvIFVJIGFuZCBmdXJ0aGVyIG9wdGlvbnMgc2V0cyAqL1xudHlwZSBPcHRpb25zcGVjMiA9IChPcHRpb25zU3BlY1swXSAmIHsgLy8gU3RhcnQgd2l0aCBzdGFuZGFyZCBvcHRpb25zIHNwZWMgLSB0YWtlbiBmcm9tIHF1ZXN0aW9uIGdlbmVyYXRvciBjbGFzc2VzXG4gIGVsZW1lbnQ/OiBIVE1MRWxlbWVudCwgLy8gbW9zdCB3aWxsIGFsc28gaGF2ZSBsaW5rcyB0byBhIFVJIGVsZW1lbnRcbiAgc3ViT3B0aW9uc1NldD86IE9wdGlvbnNTZXQgLy8gZm9yIG9wdGlvbi50eXBlPVwic3Vib3B0aW9uc1wiLCBob2xkIGxpbmsgdG8gdGhlIE9wdGlvbnNTZXQgZm9yIHRoYXRcbn0pW11cblxuLyoqXG4gKiBBIHNpbXBsZSBvYmplY3QgcmVwcmVzZW50aW5nIG9wdGlvbnMgdG8gc2VuZCB0byBhIHF1ZXN0aW9uIGdlbmVyYXRvclxuICogTkIuIFRoaXMgaXMgYSB2ZXJ5ICdsb29zZScgdHlwZVxuICovXG5pbnRlcmZhY2UgT3B0aW9ucyB7XG4gIFtrZXk6IHN0cmluZ106IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBzdHJpbmdbXSB8IE9wdGlvbnNcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgc2V0IG9mIG9wdGlvbnMsIHdpdGggbGluayB0byBVSSBlbGVtZW50cy4gU3RvcmVzIGludGVybmFsbHkgdGhlIG9wdGlvbnNcbiAqIGluIGEgc2ltcGxlIG9iamVjdCBzdWl0YWJsZSBmb3IgcGFzc2luZyB0byBxdWVzdGlvbiBnZW5lcmF0b3JzXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE9wdGlvbnNTZXQge1xuICBvcHRpb25zU3BlYyA6IE9wdGlvbnNwZWMyXG4gIG9wdGlvbnMgOiBPcHRpb25zXG4gIHRlbXBsYXRlPyA6IHN0cmluZ1xuICBnbG9iYWxJZDogc3RyaW5nXG4gIHN0YXRpYyBpZENvdW50ZXIgPSAwIC8vIGluY3JlbWVudCBlYWNoIHRpbWUgdG8gY3JlYXRlIHVuaXF1ZSBpZHMgdG8gdXNlIGluIGlkcy9uYW1lcyBvZiBlbGVtZW50c1xuXG4gIHN0YXRpYyBnZXRJZCAoKTogc3RyaW5nIHtcbiAgICBpZiAoT3B0aW9uc1NldC5pZENvdW50ZXIgPj0gMjYgKiogMikgdGhyb3cgbmV3IEVycm9yKCdUb28gbWFueSBvcHRpb25zIG9iamVjdHMhJylcbiAgICBjb25zdCBpZCA9IFN0cmluZy5mcm9tQ2hhckNvZGUofn4oT3B0aW9uc1NldC5pZENvdW50ZXIgLyAyNikgKyA5NykgK1xuICAgICAgU3RyaW5nLmZyb21DaGFyQ29kZShPcHRpb25zU2V0LmlkQ291bnRlciAlIDI2ICsgOTcpXG5cbiAgICBPcHRpb25zU2V0LmlkQ291bnRlciArPSAxXG5cbiAgICByZXR1cm4gaWRcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgb3B0aW9ucyBzcGVjXG4gICAqIEBwYXJhbSBvcHRpb25zU3BlYyBTcGVjaWZpY2F0aW9uIG9mIG9wdGlvbnNcbiAgICogQHBhcmFtIHRlbXBsYXRlIEEgdGVtcGxhdGUgZm9yIGRpc3BsYXlpbmcgb3B0aW9ucywgdXNpbmcge3ttdXN0YWNoZX19IHN5bnRheFxuICAgKi9cbiAgY29uc3RydWN0b3IgKG9wdGlvbnNTcGVjIDogT3B0aW9uc1NwZWMsIHRlbXBsYXRlPyA6IHN0cmluZykge1xuICAgIHRoaXMub3B0aW9uc1NwZWMgPSBvcHRpb25zU3BlYyBhcyBPcHRpb25zcGVjMlxuXG4gICAgdGhpcy5vcHRpb25zID0ge31cbiAgICB0aGlzLm9wdGlvbnNTcGVjLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgIGlmIChpc1JlYWxPcHRpb24ob3B0aW9uKSAmJiBvcHRpb24udHlwZSAhPT0gJ3N1Ym9wdGlvbnMnICYmIG9wdGlvbi50eXBlICE9PSAncmFuZ2UnKSB7XG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gb3B0aW9uLmRlZmF1bHRcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9uLnR5cGUgPT09ICdyYW5nZScpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZExCXSA9IG9wdGlvbi5kZWZhdWx0TEJcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZFVCXSA9IG9wdGlvbi5kZWZhdWx0VUJcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9uLnR5cGUgPT09ICdzdWJvcHRpb25zJykgeyAvLyBSZWN1cnNpdmVseSBidWlsZCBzdWJvcHRpb25zLiBUZXJtaW5hdGVzIGFzIGxvbmcgYXMgb3B0aW9uc1NwZWMgaXMgbm90IGNpcmN1bGFyXG4gICAgICAgIG9wdGlvbi5zdWJPcHRpb25zU2V0ID0gbmV3IE9wdGlvbnNTZXQob3B0aW9uLm9wdGlvbnNTcGVjKVxuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IG9wdGlvbi5zdWJPcHRpb25zU2V0Lm9wdGlvbnNcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhpcy50ZW1wbGF0ZSA9IHRlbXBsYXRlIC8vIGh0bWwgdGVtcGxhdGUgKG9wdGlvbmFsKVxuXG4gICAgLy8gc2V0IGFuIGlkIGJhc2VkIG9uIGEgY291bnRlciAtIHVzZWQgZm9yIG5hbWVzIG9mIGZvcm0gZWxlbWVudHNcbiAgICB0aGlzLmdsb2JhbElkID0gT3B0aW9uc1NldC5nZXRJZCgpXG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYW4gb3B0aW9uLCBmaW5kIGl0cyBVSSBlbGVtZW50IGFuZCB1cGRhdGUgdGhlIHN0YXRlIGZyb20gdGhhdFxuICAgKiBAcGFyYW0geyp9IG9wdGlvbiBBbiBlbGVtZW50IG9mIHRoaXMub3B0aW9uU3BlYyBvciBhbiBpZFxuICAgKi9cbiAgdXBkYXRlU3RhdGVGcm9tVUkgKG9wdGlvbiA6IE9wdGlvbnNwZWMyWzBdIHwgc3RyaW5nKSA6IHZvaWQge1xuICAgIC8vIGlucHV0IC0gZWl0aGVyIGFuIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25zU3BlYyBvciBhbiBvcHRpb24gaWRcbiAgICBpZiAodHlwZW9mIChvcHRpb24pID09PSAnc3RyaW5nJykge1xuICAgICAgY29uc3Qgb3B0aW9uc1NwZWMgOiBPcHRpb25zcGVjMlswXSB8IHVuZGVmaW5lZCA9IHRoaXMub3B0aW9uc1NwZWMuZmluZCh4ID0+ICgoeCBhcyBPcHRpb25JKS5pZCA9PT0gb3B0aW9uKSlcbiAgICAgIGlmIChvcHRpb25zU3BlYyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG9wdGlvbiA9IG9wdGlvbnNTcGVjXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYG5vIG9wdGlvbiB3aXRoIGlkICcke29wdGlvbn0nYClcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFvcHRpb24uZWxlbWVudCkgdGhyb3cgbmV3IEVycm9yKGBvcHRpb24gJHsob3B0aW9uIGFzIE9wdGlvbkkpLmlkfSBkb2Vzbid0IGhhdmUgYSBVSSBlbGVtZW50YClcblxuICAgIHN3aXRjaCAob3B0aW9uLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2ludCc6IHtcbiAgICAgICAgY29uc3QgaW5wdXQgOiBIVE1MSW5wdXRFbGVtZW50ID0gb3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JylbMF1cbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBOdW1iZXIoaW5wdXQudmFsdWUpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdib29sJzoge1xuICAgICAgICBjb25zdCBpbnB1dCA6IEhUTUxJbnB1dEVsZW1lbnQgPSBvcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKVswXVxuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IGlucHV0LmNoZWNrZWRcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NlbGVjdC1leGNsdXNpdmUnOiB7XG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gKG9wdGlvbi5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0OmNoZWNrZWQnKSBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAnc2VsZWN0LWluY2x1c2l2ZSc6IHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPVxuICAgICAgICAgIChBcnJheS5mcm9tKG9wdGlvbi5lbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0OmNoZWNrZWQnKSkgYXMgSFRNTElucHV0RWxlbWVudFtdKS5tYXAoeCA9PiB4LnZhbHVlKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAncmFuZ2UnOiB7XG4gICAgICAgIGNvbnN0IGlucHV0TEIgOiBIVE1MSW5wdXRFbGVtZW50ID0gb3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JylbMF1cbiAgICAgICAgY29uc3QgaW5wdXRVQiA6IEhUTUxJbnB1dEVsZW1lbnQgPSBvcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKVsxXVxuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkTEJdID0gTnVtYmVyKGlucHV0TEIudmFsdWUpXG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRVQl0gPSBOdW1iZXIoaW5wdXRVQi52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBvcHRpb24gd2l0aCBpZCAkeyhvcHRpb24gYXMgT3B0aW9uSSkuaWR9IGhhcyB1bnJlY29nbmlzZWQgb3B0aW9uIHR5cGUgJHtvcHRpb24udHlwZX1gKVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0aGlzLm9wdGlvbnMpXG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBzdHJpbmcsIHJldHVybiB0aGUgZWxlbWVudCBvZiB0aGlzLm9wdGlvbnMgd2l0aCB0aGF0IGlkXG4gICAqIEBwYXJhbSBpZCBUaGUgaWRcbiAgICovXG5cbiAgdXBkYXRlU3RhdGVGcm9tVUlBbGwgKCk6IHZvaWQge1xuICAgIHRoaXMub3B0aW9uc1NwZWMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgaWYgKGlzUmVhbE9wdGlvbihvcHRpb24pKSB7XG4gICAgICAgIHRoaXMudXBkYXRlU3RhdGVGcm9tVUkob3B0aW9uKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBkaXNhYmxlT3JFbmFibGVBbGwgKCk6IHZvaWQge1xuICAgIHRoaXMub3B0aW9uc1NwZWMuZm9yRWFjaChvcHRpb24gPT4gdGhpcy5kaXNhYmxlT3JFbmFibGUob3B0aW9uKSlcbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhbiBvcHRpb24sIGVuYWJsZSB0aGUgVUkgZWxlbWVudHMgaWYgYW5kIG9ubHkgaWYgYWxsIHRoZSBib29sZWFuXG4gICAqIG9wdGlvbnMgaW4gb3B0aW9uLmVuYWJsZWRJZiBhcmUgdHJ1ZVxuICAgKiBAcGFyYW0gb3B0aW9uIEFuIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25zU3BlYyBvciBhbiBvcHRpb24gaWRcbiAgICovXG4gIGRpc2FibGVPckVuYWJsZSAob3B0aW9uIDogc3RyaW5nIHwgT3B0aW9uc3BlYzJbMF0pOiB2b2lkIHtcbiAgICBpZiAodHlwZW9mIChvcHRpb24pID09PSAnc3RyaW5nJykge1xuICAgICAgY29uc3QgdGVtcE9wdGlvbiA6IE9wdGlvbnNwZWMyWzBdIHwgdW5kZWZpbmVkID0gdGhpcy5vcHRpb25zU3BlYy5maW5kKHggPT4gKGlzUmVhbE9wdGlvbih4KSAmJiB4LmlkID09PSBvcHRpb24pKVxuICAgICAgaWYgKHRlbXBPcHRpb24gIT09IHVuZGVmaW5lZCkgeyBvcHRpb24gPSB0ZW1wT3B0aW9uIH0gZWxzZSB7IHRocm93IG5ldyBFcnJvcihgbm8gb3B0aW9uIHdpdGggaWQgJyR7b3B0aW9ufSdgKSB9XG4gICAgfVxuXG4gICAgaWYgKCFpc1JlYWxPcHRpb24ob3B0aW9uKSB8fCAhb3B0aW9uLmVuYWJsZWRJZiB8fCBvcHRpb24uZWxlbWVudCA9PT0gdW5kZWZpbmVkKSByZXR1cm5cblxuICAgIGNvbnN0IGVuYWJsZXJMaXN0ID0gb3B0aW9uLmVuYWJsZWRJZi5zcGxpdCgnJicpIC8vXG4gICAgbGV0IGVuYWJsZSA9IHRydWUgLy8gd2lsbCBkaXNhYmxlIGlmIGp1c3Qgb25lIG9mIHRoZSBlbGVtZW50cyBvZiBlbmFibGVyTGlzdCBpcyBmYWxzZVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbmFibGVyTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IGVuYWJsZXJJZCA9IGVuYWJsZXJMaXN0W2ldXG4gICAgICBsZXQgbmVnYXRlID0gZmFsc2UgLy8gaWYgaXQgc3RhcnRzIHdpdGggISwgbmVnYXRpdmUgb3V0cHV0XG4gICAgICBpZiAoZW5hYmxlcklkLnN0YXJ0c1dpdGgoJyEnKSkge1xuICAgICAgICBuZWdhdGUgPSB0cnVlXG4gICAgICAgIGVuYWJsZXJJZCA9IGVuYWJsZXJJZC5zbGljZSgxKVxuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIHRoaXMub3B0aW9uc1tlbmFibGVySWRdICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkICdlbmFibGVkSWYnOiAke2VuYWJsZXJJZH0gaXMgbm90IGEgYm9vbGVhbiBvcHRpb25gKVxuICAgICAgfVxuXG4gICAgICBjb25zdCBlbmFibGVyVmFsdWUgOiBib29sZWFuID0gdGhpcy5vcHRpb25zW2VuYWJsZXJJZF0gYXMgYm9vbGVhbiAvLyEgPT0gbmVnYXRlIC8vICE9PSBlcXVpdmFsZW50IHRvIFhPUlxuXG4gICAgICBpZiAoIWVuYWJsZXJWYWx1ZSkge1xuICAgICAgICBlbmFibGUgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChlbmFibGUpIHtcbiAgICAgIG9wdGlvbi5lbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoJ2Rpc2FibGVkJylcbiAgICAgIDtbLi4ub3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JyldLmZvckVhY2goZSA9PiB7IGUuZGlzYWJsZWQgPSBmYWxzZSB9KVxuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb24uZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdkaXNhYmxlZCcpXG4gICAgICA7Wy4uLm9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpXS5mb3JFYWNoKGUgPT4geyBlLmRpc2FibGVkID0gdHJ1ZSB9KVxuICAgIH1cbiAgfVxuXG4gIHJlbmRlckluIChlbGVtZW50OiBIVE1MRWxlbWVudCwgdWxFeHRyYUNsYXNzPyA6IHN0cmluZykgOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3QgbGlzdCA9IGNyZWF0ZUVsZW0oJ3VsJywgJ29wdGlvbnMtbGlzdCcpXG4gICAgaWYgKHVsRXh0cmFDbGFzcykgbGlzdC5jbGFzc0xpc3QuYWRkKHVsRXh0cmFDbGFzcylcbiAgICBsZXQgY29sdW1uID0gY3JlYXRlRWxlbSgnZGl2JywgJ29wdGlvbnMtY29sdW1uJywgbGlzdClcblxuICAgIHRoaXMub3B0aW9uc1NwZWMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgaWYgKG9wdGlvbi50eXBlID09PSAnY29sdW1uLWJyZWFrJykgeyAvLyBzdGFydCBuZXcgY29sdW1uXG4gICAgICAgIGNvbHVtbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdvcHRpb25zLWNvbHVtbicsIGxpc3QpXG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbi50eXBlID09PSAnc3Vib3B0aW9ucycpIHtcbiAgICAgICAgY29uc3Qgc3ViT3B0aW9uc1NldCA9IG9wdGlvbi5zdWJPcHRpb25zU2V0XG4gICAgICAgIGlmIChzdWJPcHRpb25zU2V0ID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcignVGhpcyBzaG91bGQgbm90IGhhcHBlbiEnKVxuICAgICAgICBjb25zdCBzdWJPcHRpb25zRWxlbWVudCA9IHN1Yk9wdGlvbnNTZXQucmVuZGVySW4oY29sdW1uLCAnc3Vib3B0aW9ucycpXG4gICAgICAgIG9wdGlvbi5lbGVtZW50ID0gc3ViT3B0aW9uc0VsZW1lbnRcbiAgICAgIH0gZWxzZSB7IC8vIG1ha2UgbGlzdCBpdGVtXG4gICAgICAgIGNvbnN0IGxpID0gY3JlYXRlRWxlbSgnbGknLCB1bmRlZmluZWQsIGNvbHVtbilcbiAgICAgICAgaWYgKGlzUmVhbE9wdGlvbihvcHRpb24pKSB7XG4gICAgICAgICAgbGkuZGF0YXNldC5vcHRpb25JZCA9IG9wdGlvbi5pZFxuICAgICAgICB9XG5cbiAgICAgICAgc3dpdGNoIChvcHRpb24udHlwZSkge1xuICAgICAgICAgIGNhc2UgJ2hlYWRpbmcnOlxuICAgICAgICAgICAgcmVuZGVySGVhZGluZyhvcHRpb24udGl0bGUsIGxpKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdpbnQnOlxuICAgICAgICAgIGNhc2UgJ2Jvb2wnOlxuICAgICAgICAgICAgcmVuZGVyU2luZ2xlT3B0aW9uKG9wdGlvbiwgbGkpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3NlbGVjdC1pbmNsdXNpdmUnOlxuICAgICAgICAgIGNhc2UgJ3NlbGVjdC1leGNsdXNpdmUnOlxuICAgICAgICAgICAgdGhpcy5yZW5kZXJMaXN0T3B0aW9uKG9wdGlvbiwgbGkpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3JhbmdlJzpcbiAgICAgICAgICAgIHJlbmRlclJhbmdlT3B0aW9uKG9wdGlvbiwgbGkpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICAgIGxpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXRlRnJvbVVJKG9wdGlvbilcbiAgICAgICAgICB0aGlzLmRpc2FibGVPckVuYWJsZUFsbCgpIH0pXG4gICAgICAgIG9wdGlvbi5lbGVtZW50ID0gbGlcbiAgICAgIH1cbiAgICB9KVxuICAgIGVsZW1lbnQuYXBwZW5kKGxpc3QpXG5cbiAgICB0aGlzLmRpc2FibGVPckVuYWJsZUFsbCgpXG5cbiAgICByZXR1cm4gbGlzdFxuICB9XG5cbiAgLyogZXNsaW50LWRpc2FibGUgKi9cbiAgcmVuZGVyV2l0aFRlbXBsYXRlIChlbGVtZW50IDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICAvLyBjcmVhdGUgYXBwcm9wcmlhdGUgb2JqZWN0IGZvciBtdXN0YWNoZVxuICAgIGxldCBvcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCBPcHRpb25JPlxuICAgIHRoaXMub3B0aW9uc1NwZWMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgaWYgKGlzUmVhbE9wdGlvbihvcHRpb24pKSB7XG4gICAgICAgIG9wdGlvbnNbb3B0aW9uLmlkXSA9IG9wdGlvblxuICAgICAgfVxuICAgIH0pXG5cbiAgICBjb25zdCBodG1sU3RyaW5nID0gdGhpcy50ZW1wbGF0ZVxuICB9XG4gIC8qIGVzbGludC1lbmFibGUgKi9cblxuICByZW5kZXJMaXN0T3B0aW9uIChvcHRpb246IFNlbGVjdEV4Y2x1c2l2ZU9wdGlvbiB8IFNlbGVjdEluY2x1c2l2ZU9wdGlvbiwgbGkgOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGxpLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgb3B0aW9uLnRpdGxlICsgJzogJylcblxuICAgIGNvbnN0IHN1Ymxpc3QgPSBjcmVhdGVFbGVtKCd1bCcsICdvcHRpb25zLXN1Ymxpc3QnLCBsaSlcbiAgICBpZiAob3B0aW9uLnZlcnRpY2FsKSBzdWJsaXN0LmNsYXNzTGlzdC5hZGQoJ29wdGlvbnMtc3VibGlzdC12ZXJ0aWNhbCcpXG5cbiAgICBvcHRpb24uc2VsZWN0T3B0aW9ucy5mb3JFYWNoKHNlbGVjdE9wdGlvbiA9PiB7XG4gICAgICBjb25zdCBzdWJsaXN0TGkgPSBjcmVhdGVFbGVtKCdsaScsIHVuZGVmaW5lZCwgc3VibGlzdClcbiAgICAgIGNvbnN0IGxhYmVsID0gY3JlYXRlRWxlbSgnbGFiZWwnLCB1bmRlZmluZWQsIHN1Ymxpc3RMaSlcblxuICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpXG4gICAgICBpbnB1dC50eXBlID0gb3B0aW9uLnR5cGUgPT09ICdzZWxlY3QtZXhjbHVzaXZlJyA/ICdyYWRpbycgOiAnY2hlY2tib3gnXG4gICAgICBpbnB1dC5uYW1lID0gdGhpcy5nbG9iYWxJZCArICctJyArIG9wdGlvbi5pZFxuICAgICAgaW5wdXQudmFsdWUgPSBzZWxlY3RPcHRpb24uaWRcblxuICAgICAgaWYgKG9wdGlvbi50eXBlID09PSAnc2VsZWN0LWluY2x1c2l2ZScpIHsgLy8gZGVmYXVsdHMgd29yayBkaWZmZXJlbnQgZm9yIGluY2x1c2l2ZS9leGNsdXNpdmVcbiAgICAgICAgaW5wdXQuY2hlY2tlZCA9IG9wdGlvbi5kZWZhdWx0LmluY2x1ZGVzKHNlbGVjdE9wdGlvbi5pZClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlucHV0LmNoZWNrZWQgPSBvcHRpb24uZGVmYXVsdCA9PT0gc2VsZWN0T3B0aW9uLmlkXG4gICAgICB9XG5cbiAgICAgIGxhYmVsLmFwcGVuZChpbnB1dClcblxuICAgICAgaW5wdXQuY2xhc3NMaXN0LmFkZCgnb3B0aW9uJylcblxuICAgICAgbGFiZWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLCBzZWxlY3RPcHRpb24udGl0bGUpXG4gICAgfSlcbiAgfVxufVxuXG4vKipcbiAqIFJlbmRlcnMgYSBoZWFkaW5nIG9wdGlvblxuICogQHBhcmFtIHtzdHJpbmd9IHRpdGxlIFRoZSB0aXRsZSBvZiB0aGUgaGVhZGluZ1xuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gbGkgVGhlIGVsZW1lbnQgdG8gcmVuZGVyIGludG9cbiAqL1xuZnVuY3Rpb24gcmVuZGVySGVhZGluZyAodGl0bGU6IHN0cmluZywgbGk6IEhUTUxFbGVtZW50KSB7XG4gIGxpLmlubmVySFRNTCA9IHRpdGxlXG4gIGxpLmNsYXNzTGlzdC5hZGQoJ29wdGlvbnMtaGVhZGluZycpXG59XG5cbi8qKlxuICogUmVuZGVycyBzaW5nbGUgcGFyYW1ldGVyXG4gKiBAcGFyYW0geyp9IG9wdGlvblxuICogQHBhcmFtIHsqfSBsaVxuICovXG5mdW5jdGlvbiByZW5kZXJTaW5nbGVPcHRpb24gKG9wdGlvbjogSW50ZWdlck9wdGlvbiB8IEJvb2xlYW5PcHRpb24sIGxpOiBIVE1MRWxlbWVudCkge1xuICBjb25zdCBsYWJlbCA9IGNyZWF0ZUVsZW0oJ2xhYmVsJywgdW5kZWZpbmVkLCBsaSlcblxuICBpZiAoIW9wdGlvbi5zd2FwTGFiZWwgJiYgb3B0aW9uLnRpdGxlICE9PSAnJykgbGFiZWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLCBgJHtvcHRpb24udGl0bGV9OiBgKVxuXG4gIGNvbnN0IGlucHV0IDogSFRNTElucHV0RWxlbWVudCA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgJ29wdGlvbicsIGxhYmVsKSBhcyBIVE1MSW5wdXRFbGVtZW50XG4gIHN3aXRjaCAob3B0aW9uLnR5cGUpIHtcbiAgICBjYXNlICdpbnQnOlxuICAgICAgaW5wdXQudHlwZSA9ICdudW1iZXInXG4gICAgICBpbnB1dC5taW4gPSBvcHRpb24ubWluLnRvU3RyaW5nKClcbiAgICAgIGlucHV0Lm1heCA9IG9wdGlvbi5tYXgudG9TdHJpbmcoKVxuICAgICAgaW5wdXQudmFsdWUgPSBvcHRpb24uZGVmYXVsdC50b1N0cmluZygpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jvb2wnOlxuICAgICAgaW5wdXQudHlwZSA9ICdjaGVja2JveCdcbiAgICAgIGlucHV0LmNoZWNrZWQgPSBvcHRpb24uZGVmYXVsdFxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUeXBlc2NyaXB0IGlzIHByZXR0eSBzdXJlIEkgY2FuXFwndCBnZXQgaGVyZScpXG4gIH1cblxuICBpZiAob3B0aW9uLnN3YXBMYWJlbCAmJiBvcHRpb24udGl0bGUgIT09ICcnKSBsYWJlbC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIGAgJHtvcHRpb24udGl0bGV9YClcbn1cblxuZnVuY3Rpb24gcmVuZGVyUmFuZ2VPcHRpb24gKG9wdGlvbjogUmFuZ2VPcHRpb24sIGxpOiBIVE1MRWxlbWVudCkge1xuICBjb25zdCBsYWJlbCA9IGNyZWF0ZUVsZW0oJ2xhYmVsJywgdW5kZWZpbmVkLCBsaSlcbiAgY29uc3QgaW5wdXRMQiA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgJ29wdGlvbicsIGxhYmVsKSBhcyBIVE1MSW5wdXRFbGVtZW50XG4gIGlucHV0TEIudHlwZSA9ICdudW1iZXInXG4gIGlucHV0TEIubWluID0gb3B0aW9uLm1pbi50b1N0cmluZygpXG4gIGlucHV0TEIubWF4ID0gb3B0aW9uLm1heC50b1N0cmluZygpXG4gIGlucHV0TEIudmFsdWUgPSBvcHRpb24uZGVmYXVsdExCLnRvU3RyaW5nKClcblxuICBsYWJlbC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIGAgJmxlcTsgJHtvcHRpb24udGl0bGV9ICZsZXE7IGApXG5cbiAgY29uc3QgaW5wdXRVQiA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgJ29wdGlvbicsIGxhYmVsKSBhcyBIVE1MSW5wdXRFbGVtZW50XG4gIGlucHV0VUIudHlwZSA9ICdudW1iZXInXG4gIGlucHV0VUIubWluID0gb3B0aW9uLm1pbi50b1N0cmluZygpXG4gIGlucHV0VUIubWF4ID0gb3B0aW9uLm1heC50b1N0cmluZygpXG4gIGlucHV0VUIudmFsdWUgPSBvcHRpb24uZGVmYXVsdFVCLnRvU3RyaW5nKClcbn1cblxuLyoqIERldGVybWluZXMgaWYgYW4gb3B0aW9uIGluIE9wdGlvbnNTcGVjIGlzIGEgcmVhbCBvcHRpb24gYXMgb3Bwb3NlZCB0b1xuICogYSBoZWFkaW5nIG9yIGNvbHVtbiBicmVha1xuICovXG5mdW5jdGlvbiBpc1JlYWxPcHRpb24gKG9wdGlvbiA6IE9wdGlvbnNTcGVjWzBdKSA6IG9wdGlvbiBpcyBSZWFsT3B0aW9uIHtcbiAgcmV0dXJuIChvcHRpb24gYXMgT3B0aW9uSSkuaWQgIT09IHVuZGVmaW5lZFxufVxuXG5jb25zdCBkZW1vU3BlYyA6IE9wdGlvbnNTcGVjID0gW1xuICB7XG4gICAgdGl0bGU6ICdEaWZmaWN1bHR5JyxcbiAgICBpZDogJ2RpZmZpY3VsdHknLFxuICAgIHR5cGU6ICdpbnQnLFxuICAgIG1pbjogMSxcbiAgICBtYXg6IDEwLFxuICAgIGRlZmF1bHQ6IDVcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVHlwZScsXG4gICAgaWQ6ICd0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ1JlY3RhbmdsZScsIGlkOiAncmVjdGFuZ2xlJyB9LFxuICAgICAgeyB0aXRsZTogJ1RyaWFuZ2xlJywgaWQ6ICd0cmlhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdTcXVvdmFsJywgaWQ6ICdzcXVvdmFsJyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiAncmVjdGFuZ2xlJ1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdBIGhlYWRpbmcnLFxuICAgIHR5cGU6ICdoZWFkaW5nJ1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdTaGFwZScsXG4gICAgaWQ6ICdzaGFwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdSZWN0YW5nbGUgc2hhcGUgdGhpbmcnLCBpZDogJ3JlY3RhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdUcmlhbmdsZSBzaGFwZSB0aGluZycsIGlkOiAndHJpYW5nbGUnIH0sXG4gICAgICB7IHRpdGxlOiAnU3F1b3ZhbCBzaGFwZSBsb25nJywgaWQ6ICdzcXVvdmFsJyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiBbJ3JlY3RhbmdsZScsICdzcXVvdmFsJ10sXG4gICAgdmVydGljYWw6IHRydWUgLy8gbGF5b3V0IHZlcnRpY2FsbHksIHJhdGhlciB0aGFuIGhvcml6b250YWxseVxuICB9LFxuICB7XG4gICAgdHlwZTogJ2NvbHVtbi1icmVhaydcbiAgfSxcbiAge1xuICAgIHR5cGU6ICdoZWFkaW5nJyxcbiAgICB0aXRsZTogJ0EgbmV3IGNvbHVtbidcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnRG8gc29tZXRoaW5nJyxcbiAgICBpZDogJ3NvbWV0aGluZycsXG4gICAgdHlwZTogJ2Jvb2wnLFxuICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgc3dhcExhYmVsOiB0cnVlIC8vIHB1dCBjb250cm9sIGJlZm9yZSBsYWJlbFxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdPcHRpb25zIGZvciByZWN0YW5nbGVzJyxcbiAgICBpZDogJ3JlY3RhbmdsZS1vcHRpb25zJyxcbiAgICB0eXBlOiAnc3Vib3B0aW9ucycsXG4gICAgb3B0aW9uc1NwZWM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdNaW5pbXVtIHgnLFxuICAgICAgICBpZDogJ21pblgnLFxuICAgICAgICB0eXBlOiAnaW50JyxcbiAgICAgICAgbWluOiAwLFxuICAgICAgICBtYXg6IDEwLFxuICAgICAgICBkZWZhdWx0OiAyXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0aXRsZTogJ01heGltdW0geCcsXG4gICAgICAgIGlkOiAnbWF4WCcsXG4gICAgICAgIHR5cGU6ICdpbnQnLFxuICAgICAgICBtaW46IDAsXG4gICAgICAgIG1heDogMTAsXG4gICAgICAgIGRlZmF1bHQ6IDRcbiAgICAgIH1cbiAgICBdXG4gIH1cbl1cblxuY29uc3QgZGVtb1RlbXBsYXRlIDogc3RyaW5nID1cbic8bGk+e3tkaWZmaWN1bHR5LnJlbmRlcmVkfX08L2xpPlxcbicgKyAvLyBJbnNlcnRzIGZ1bGwgJ2RpZmZpdWx0eScgb3B0aW9uIGFzIGJlZm9yZVxuJzxsaT48Yj57e3R5cGUudGl0bGV9fTwvYj4gXFxuJyArIC8vIGp1c3QgdGhlIHRpdGxlXG4nPGxpPnt7dHlwZS5pbnB1dH19IFxcbicgKyAvLyB0aGUgaW5wdXQgZWxlbWVudFxuJ3t7dHlwZS5zZWxlY3RPcHRpb25zUmVuZGVyZWRBbGx9fTwvbGk+JyArIC8vIFRoZSBvcHRpb25zLCByZWRlcmVkIHVzdWFsbHlcbic8bGk+PHVsPnt7IyB0eXBlLnNlbGVjdE9wdGlvbnN9fScgKyAvLyBJbmRpdmlkdWFsIHNlbGVjdCBvcHRpb25zLCByZW5kZXJlZFxuICAnPGxpPiB7e3JlbmRlcmVkfX0gPC9saT4nICsgLy8gVGhlIHVzdWFsIHJlbmRlcmVkIG9wdGlvblxuJ3t7LyB0eXBlLnNlbGVjdE9wdGlvbnN9fTwvdWw+J1xuXG5jb25zdCBleGFtcGxlVGVtcGxhdGUgPSAvLyBBbm90aGVyIGV4YW1wbGUsIHdpdGggZmV3ZXIgY29tbWVudHNcbmA8ZGl2IGNsYXNzID0gXCJvcHRpb25zLWNvbHVtblwiPlxuICA8dWwgY2xhc3M9XCJvcHRpb25zLWxpc3RcIj5cbiAgICA8bGk+IDxiPlNvbWUgb3B0aW9ucyA8L2I+IDwvbGk+XG4gICAgPGxpPiB7e2RpZmZpY3VsdHkucmVuZGVyZWR9fSA8L2xpPlxuICAgIDxsaSBzdHlsZT1cImRpc3BsYXk6YmxvY2tcIj4ge3tzaW1wbGUudGl0bGV9fSB7e3NpbXBsZS5pbnB1dH19XG4gICAgICB7eyNzaW1wbGVNaW5YfX1cbmBcbiIsImV4cG9ydCBkZWZhdWx0IGFic3RyYWN0IGNsYXNzIFF1ZXN0aW9uIHtcbiAgRE9NOiBIVE1MRWxlbWVudFxuICBhbnN3ZXJlZDogYm9vbGVhblxuXG4gIGNvbnN0cnVjdG9yICgpIHtcbiAgICB0aGlzLkRPTSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgdGhpcy5ET00uY2xhc3NOYW1lID0gJ3F1ZXN0aW9uLWRpdidcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHtcbiAgICByZXR1cm4gdGhpcy5ET01cbiAgfVxuXG4gIGFic3RyYWN0IHJlbmRlciAoKSA6IHZvaWRcblxuICBzaG93QW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5hbnN3ZXJlZCA9IHRydWVcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxuXG4gIHRvZ2dsZUFuc3dlciAoKSA6IHZvaWQge1xuICAgIGlmICh0aGlzLmFuc3dlcmVkKSB7XG4gICAgICB0aGlzLmhpZGVBbnN3ZXIoKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNob3dBbnN3ZXIoKVxuICAgIH1cbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyAvLyBTaG91bGQgYmUgb3ZlcnJpZGRlblxuICAgIHJldHVybiAnJ1xuICB9XG59XG4iLCIvKiBnbG9iYWwga2F0ZXggKi9cbmltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbi9RdWVzdGlvbidcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGV4dFEgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIoKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiA1LFxuICAgICAgbGFiZWw6ICdhJ1xuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgLy8gc3RvcmUgdGhlIGxhYmVsIGZvciBmdXR1cmUgcmVuZGVyaW5nXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyBEdW1teSBxdWVzdGlvbiBnZW5lcmF0aW5nIC0gc3ViY2xhc3NlcyBkbyBzb21ldGhpbmcgc3Vic3RhbnRpYWwgaGVyZVxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICcyKzInXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICc9NSdcblxuICAgIC8vIE1ha2UgdGhlIERPTSB0cmVlIGZvciB0aGUgZWxlbWVudFxuICAgIHRoaXMucXVlc3Rpb25wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpXG4gICAgdGhpcy5hbnN3ZXJwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpXG5cbiAgICB0aGlzLnF1ZXN0aW9ucC5jbGFzc05hbWUgPSAncXVlc3Rpb24nXG4gICAgdGhpcy5hbnN3ZXJwLmNsYXNzTmFtZSA9ICdhbnN3ZXInXG4gICAgdGhpcy5hbnN3ZXJwLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpXG5cbiAgICB0aGlzLkRPTS5hcHBlbmRDaGlsZCh0aGlzLnF1ZXN0aW9ucClcbiAgICB0aGlzLkRPTS5hcHBlbmRDaGlsZCh0aGlzLmFuc3dlcnApXG5cbiAgICAvLyBzdWJjbGFzc2VzIHNob3VsZCBnZW5lcmF0ZSBxdWVzdGlvbkxhVGVYIGFuZCBhbnN3ZXJMYVRlWCxcbiAgICAvLyAucmVuZGVyKCkgd2lsbCBiZSBjYWxsZWQgYnkgdXNlclxuICB9XG5cbiAgcmVuZGVyICgpIHtcbiAgICAvLyB1cGRhdGUgdGhlIERPTSBpdGVtIHdpdGggcXVlc3Rpb25MYVRlWCBhbmQgYW5zd2VyTGFUZVhcbiAgICB2YXIgcW51bSA9IHRoaXMubGFiZWxcbiAgICAgID8gJ1xcXFx0ZXh0eycgKyB0aGlzLmxhYmVsICsgJykgfSdcbiAgICAgIDogJydcbiAgICBrYXRleC5yZW5kZXIocW51bSArIHRoaXMucXVlc3Rpb25MYVRlWCwgdGhpcy5xdWVzdGlvbnAsIHsgZGlzcGxheU1vZGU6IHRydWUsIHN0cmljdDogJ2lnbm9yZScgfSlcbiAgICBrYXRleC5yZW5kZXIodGhpcy5hbnN3ZXJMYVRlWCwgdGhpcy5hbnN3ZXJwLCB7IGRpc3BsYXlNb2RlOiB0cnVlIH0pXG4gIH1cblxuICBnZXRET00gKCkge1xuICAgIHJldHVybiB0aGlzLkRPTVxuICB9XG5cbiAgc2hvd0Fuc3dlciAoKSB7XG4gICAgdGhpcy5hbnN3ZXJwLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IHRydWVcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkge1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICB9XG59XG4iLCJpbXBvcnQgeyByYW5kQmV0d2VlbiwgZ2NkIH0gZnJvbSAndXRpbGl0aWVzJ1xuaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuXG4vKiBNYWluIHF1ZXN0aW9uIGNsYXNzLiBUaGlzIHdpbGwgYmUgc3B1biBvZmYgaW50byBkaWZmZXJlbnQgZmlsZSBhbmQgZ2VuZXJhbGlzZWQgKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFsZ2VicmFpY0ZyYWN0aW9uUSBleHRlbmRzIFRleHRRIHtcbiAgLy8gJ2V4dGVuZHMnIFF1ZXN0aW9uLCBidXQgbm90aGluZyB0byBhY3R1YWxseSBleHRlbmRcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiAyXG4gICAgfVxuXG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcbiAgICBjb25zdCBkaWZmaWN1bHR5ID0gc2V0dGluZ3MuZGlmZmljdWx0eVxuXG4gICAgLy8gbG9naWMgZm9yIGdlbmVyYXRpbmcgdGhlIHF1ZXN0aW9uIGFuZCBhbnN3ZXIgc3RhcnRzIGhlcmVcbiAgICB2YXIgYSwgYiwgYywgZCwgZSwgZiAvLyAoYXgrYikoZXgrZikvKGN4K2QpKGV4K2YpID0gKHB4XjIrcXgrcikvKHR4XjIrdXgrdilcbiAgICB2YXIgcCwgcSwgciwgdCwgdSwgdlxuICAgIHZhciBtaW5Db2VmZiwgbWF4Q29lZmYsIG1pbkNvbnN0LCBtYXhDb25zdFxuXG4gICAgc3dpdGNoIChkaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIG1pbkNvZWZmID0gMTsgbWF4Q29lZmYgPSAxOyBtaW5Db25zdCA9IDE7IG1heENvbnN0ID0gNlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMTsgbWluQ29uc3QgPSAtNjsgbWF4Q29uc3QgPSA2XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDM6XG4gICAgICAgIG1pbkNvZWZmID0gMTsgbWF4Q29lZmYgPSAzOyBtaW5Db25zdCA9IC01OyBtYXhDb25zdCA9IDVcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNDpcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIG1pbkNvZWZmID0gLTM7IG1heENvZWZmID0gMzsgbWluQ29uc3QgPSAtNTsgbWF4Q29uc3QgPSA1XG4gICAgICAgIGJyZWFrXG4gICAgfVxuXG4gICAgLy8gUGljayBzb21lIGNvZWZmaWNpZW50c1xuICAgIHdoaWxlIChcbiAgICAgICgoIWEgJiYgIWIpIHx8ICghYyAmJiAhZCkgfHwgKCFlICYmICFmKSkgfHwgLy8gcmV0cnkgaWYgYW55IGV4cHJlc3Npb24gaXMgMFxuICAgICAgY2FuU2ltcGxpZnkoYSwgYiwgYywgZCkgLy8gcmV0cnkgaWYgdGhlcmUncyBhIGNvbW1vbiBudW1lcmljYWwgZmFjdG9yXG4gICAgKSB7XG4gICAgICBhID0gcmFuZEJldHdlZW4obWluQ29lZmYsIG1heENvZWZmKVxuICAgICAgYyA9IHJhbmRCZXR3ZWVuKG1pbkNvZWZmLCBtYXhDb2VmZilcbiAgICAgIGUgPSByYW5kQmV0d2VlbihtaW5Db2VmZiwgbWF4Q29lZmYpXG4gICAgICBiID0gcmFuZEJldHdlZW4obWluQ29uc3QsIG1heENvbnN0KVxuICAgICAgZCA9IHJhbmRCZXR3ZWVuKG1pbkNvbnN0LCBtYXhDb25zdClcbiAgICAgIGYgPSByYW5kQmV0d2VlbihtaW5Db25zdCwgbWF4Q29uc3QpXG4gICAgfVxuXG4gICAgLy8gaWYgdGhlIGRlbm9taW5hdG9yIGlzIG5lZ2F0aXZlIGZvciBlYWNoIHRlcm0sIHRoZW4gbWFrZSB0aGUgbnVtZXJhdG9yIG5lZ2F0aXZlIGluc3RlYWRcbiAgICBpZiAoYyA8PSAwICYmIGQgPD0gMCkge1xuICAgICAgYyA9IC1jXG4gICAgICBkID0gLWRcbiAgICAgIGEgPSAtYVxuICAgICAgYiA9IC1iXG4gICAgfVxuXG4gICAgcCA9IGEgKiBlOyBxID0gYSAqIGYgKyBiICogZTsgciA9IGIgKiBmXG4gICAgdCA9IGMgKiBlOyB1ID0gYyAqIGYgKyBkICogZTsgdiA9IGQgKiBmXG5cbiAgICAvLyBOb3cgcHV0IHRoZSBxdWVzdGlvbiBhbmQgYW5zd2VyIGluIGEgbmljZSBmb3JtYXQgaW50byBxdWVzdGlvbkxhVGVYIGFuZCBhbnN3ZXJMYVRlWFxuICAgIGNvbnN0IHF1ZXN0aW9uID0gYFxcXFxmcmFjeyR7cXVhZHJhdGljU3RyaW5nKHAsIHEsIHIpfX17JHtxdWFkcmF0aWNTdHJpbmcodCwgdSwgdil9fWBcbiAgICBpZiAoc2V0dGluZ3MudXNlQ29tbWFuZFdvcmQpIHtcbiAgICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICdcXFxcdGV4dHtTaW1wbGlmeX0gJyArIHF1ZXN0aW9uXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9IHF1ZXN0aW9uXG4gICAgfVxuICAgIHRoaXMuYW5zd2VyTGFUZVggPVxuICAgICAgKGMgPT09IDAgJiYgZCA9PT0gMSkgPyBxdWFkcmF0aWNTdHJpbmcoMCwgYSwgYilcbiAgICAgICAgOiBgXFxcXGZyYWN7JHtxdWFkcmF0aWNTdHJpbmcoMCwgYSwgYil9fXske3F1YWRyYXRpY1N0cmluZygwLCBjLCBkKX19YFxuXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICc9ICcgKyB0aGlzLmFuc3dlckxhVGVYXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ1NpbXBsaWZ5J1xuICB9XG59XG5cbi8qIFV0aWxpdHkgZnVuY3Rpb25zXG4gKiBBdCBzb21lIHBvaW50LCBJJ2xsIG1vdmUgc29tZSBvZiB0aGVzZSBpbnRvIGEgZ2VuZXJhbCB1dGlsaXRpZXMgbW9kdWxlXG4gKiBidXQgdGhpcyB3aWxsIGRvIGZvciBub3dcbiAqL1xuXG4vLyBUT0RPIEkgaGF2ZSBxdWFkcmF0aWNTdHJpbmcgaGVyZSBhbmQgYWxzbyBhIFBvbHlub21pYWwgY2xhc3MuIFdoYXQgaXMgYmVpbmcgcmVwbGljYXRlZD/Cp1xuZnVuY3Rpb24gcXVhZHJhdGljU3RyaW5nIChhLCBiLCBjKSB7XG4gIGlmIChhID09PSAwICYmIGIgPT09IDAgJiYgYyA9PT0gMCkgcmV0dXJuICcwJ1xuXG4gIHZhciB4MnN0cmluZyA9XG4gICAgYSA9PT0gMCA/ICcnXG4gICAgICA6IGEgPT09IDEgPyAneF4yJ1xuICAgICAgICA6IGEgPT09IC0xID8gJy14XjInXG4gICAgICAgICAgOiBhICsgJ3heMidcblxuICB2YXIgeHNpZ24gPVxuICAgIGIgPCAwID8gJy0nXG4gICAgICA6IChhID09PSAwIHx8IGIgPT09IDApID8gJydcbiAgICAgICAgOiAnKydcblxuICB2YXIgeHN0cmluZyA9XG4gICAgYiA9PT0gMCA/ICcnXG4gICAgICA6IChiID09PSAxIHx8IGIgPT09IC0xKSA/ICd4J1xuICAgICAgICA6IE1hdGguYWJzKGIpICsgJ3gnXG5cbiAgdmFyIGNvbnN0c2lnbiA9XG4gICAgYyA8IDAgPyAnLSdcbiAgICAgIDogKChhID09PSAwICYmIGIgPT09IDApIHx8IGMgPT09IDApID8gJydcbiAgICAgICAgOiAnKydcblxuICB2YXIgY29uc3RzdHJpbmcgPVxuICAgIGMgPT09IDAgPyAnJyA6IE1hdGguYWJzKGMpXG5cbiAgcmV0dXJuIHgyc3RyaW5nICsgeHNpZ24gKyB4c3RyaW5nICsgY29uc3RzaWduICsgY29uc3RzdHJpbmdcbn1cblxuZnVuY3Rpb24gY2FuU2ltcGxpZnkgKGExLCBiMSwgYTIsIGIyKSB7XG4gIC8vIGNhbiAoYTF4K2IxKS8oYTJ4K2IyKSBiZSBzaW1wbGlmaWVkP1xuICAvL1xuICAvLyBGaXJzdCwgdGFrZSBvdXQgZ2NkLCBhbmQgd3JpdGUgYXMgYzEoYTF4K2IxKSBldGNcblxuICB2YXIgYzEgPSBnY2QoYTEsIGIxKVxuICBhMSA9IGExIC8gYzFcbiAgYjEgPSBiMSAvIGMxXG5cbiAgdmFyIGMyID0gZ2NkKGEyLCBiMilcbiAgYTIgPSBhMiAvIGMyXG4gIGIyID0gYjIgLyBjMlxuXG4gIHZhciByZXN1bHQgPSBmYWxzZVxuXG4gIGlmIChnY2QoYzEsIGMyKSA+IDEgfHwgKGExID09PSBhMiAmJiBiMSA9PT0gYjIpKSB7XG4gICAgcmVzdWx0ID0gdHJ1ZVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdFxufVxuIiwiaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICd1dGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEludGVnZXJBZGRRIGV4dGVuZHMgVGV4dFEge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDUsXG4gICAgICBsYWJlbDogJ2EnXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICB0aGlzLmxhYmVsID0gc2V0dGluZ3MubGFiZWxcblxuICAgIC8vIFRoaXMgaXMganVzdCBhIGRlbW8gcXVlc3Rpb24gdHlwZSBmb3Igbm93LCBzbyBub3QgcHJvY2Vzc2luZyBkaWZmaWN1bHR5XG4gICAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKDEwLCAxMDAwKVxuICAgIGNvbnN0IGIgPSByYW5kQmV0d2VlbigxMCwgMTAwMClcbiAgICBjb25zdCBzdW0gPSBhICsgYlxuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gYSArICcgKyAnICsgYlxuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPSAnICsgc3VtXG5cbiAgICB0aGlzLnJlbmRlcigpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ0V2YWx1YXRlJ1xuICB9XG59XG4iLCIvKipcbiAqIENsYXNzIHJlcHJlc2VudGluZyBhIHBvaW50LCBhbmQgc3RhdGljIHV0aXRsaXR5IG1ldGhvZHNcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUG9pbnQge1xuICB4OiBudW1iZXJcbiAgeTogbnVtYmVyXG4gIGNvbnN0cnVjdG9yICh4OiBudW1iZXIsIHk6IG51bWJlcikge1xuICAgIHRoaXMueCA9IHhcbiAgICB0aGlzLnkgPSB5XG4gIH1cblxuICByb3RhdGUgKGFuZ2xlOiBudW1iZXIpIHtcbiAgICBjb25zdCBuZXd4ID0gTWF0aC5jb3MoYW5nbGUpICogdGhpcy54IC0gTWF0aC5zaW4oYW5nbGUpICogdGhpcy55XG4gICAgY29uc3QgbmV3eSA9IE1hdGguc2luKGFuZ2xlKSAqIHRoaXMueCArIE1hdGguY29zKGFuZ2xlKSAqIHRoaXMueVxuICAgIHRoaXMueCA9IG5ld3hcbiAgICB0aGlzLnkgPSBuZXd5XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHNjYWxlIChzZjogbnVtYmVyKSB7XG4gICAgdGhpcy54ID0gdGhpcy54ICogc2ZcbiAgICB0aGlzLnkgPSB0aGlzLnkgKiBzZlxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICB0cmFuc2xhdGUgKHg6IG51bWJlciwgeTogbnVtYmVyKSB7XG4gICAgdGhpcy54ICs9IHhcbiAgICB0aGlzLnkgKz0geVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBjbG9uZSAoKSB7XG4gICAgcmV0dXJuIG5ldyBQb2ludCh0aGlzLngsIHRoaXMueSlcbiAgfVxuXG4gIGVxdWFscyAodGhhdDogUG9pbnQpIHtcbiAgICByZXR1cm4gKHRoaXMueCA9PT0gdGhhdC54ICYmIHRoaXMueSA9PT0gdGhhdC55KVxuICB9XG5cbiAgbW92ZVRvd2FyZCAodGhhdDogUG9pbnQsIGQ6IG51bWJlcikge1xuICAgIC8vIG1vdmVzIFtkXSBpbiB0aGUgZGlyZWN0aW9uIG9mIFt0aGF0OjpQb2ludF1cbiAgICBjb25zdCB1dmVjID0gUG9pbnQudW5pdFZlY3Rvcih0aGlzLCB0aGF0KVxuICAgIHRoaXMudHJhbnNsYXRlKHV2ZWMueCAqIGQsIHV2ZWMueSAqIGQpXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHN0YXRpYyBmcm9tUG9sYXIgKHI6IG51bWJlciwgdGhldGE6IG51bWJlcikge1xuICAgIHJldHVybiBuZXcgUG9pbnQoXG4gICAgICBNYXRoLmNvcyh0aGV0YSkgKiByLFxuICAgICAgTWF0aC5zaW4odGhldGEpICogclxuICAgIClcbiAgfVxuXG4gIHN0YXRpYyBmcm9tUG9sYXJEZWcgKHI6IG51bWJlciwgdGhldGE6IG51bWJlcikge1xuICAgIHRoZXRhID0gdGhldGEgKiBNYXRoLlBJIC8gMTgwXG4gICAgcmV0dXJuIFBvaW50LmZyb21Qb2xhcihyLCB0aGV0YSlcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBtZWFuIG9mXG4gICAqIEBwYXJhbSAgey4uLlBvaW50fSBwb2ludHMgVGhlIHBvaW50cyB0byBmaW5kIHRoZSBtZWFuIG9mXG4gICAqL1xuICBzdGF0aWMgbWVhbiAoLi4ucG9pbnRzIDogUG9pbnRbXSkge1xuICAgIGNvbnN0IHN1bXggPSBwb2ludHMubWFwKHAgPT4gcC54KS5yZWR1Y2UoKHgsIHkpID0+IHggKyB5KVxuICAgIGNvbnN0IHN1bXkgPSBwb2ludHMubWFwKHAgPT4gcC55KS5yZWR1Y2UoKHgsIHkpID0+IHggKyB5KVxuICAgIGNvbnN0IG4gPSBwb2ludHMubGVuZ3RoXG5cbiAgICByZXR1cm4gbmV3IFBvaW50KHN1bXggLyBuLCBzdW15IC8gbilcbiAgfVxuXG4gIHN0YXRpYyBpbkNlbnRlciAoQTogUG9pbnQsIEI6IFBvaW50LCBDOiBQb2ludCkge1xuICAgIC8vIGluY2VudGVyIG9mIGEgdHJpYW5nbGUgZ2l2ZW4gdmVydGV4IHBvaW50cyBBLCBCIGFuZCBDXG4gICAgY29uc3QgYSA9IFBvaW50LmRpc3RhbmNlKEIsIEMpXG4gICAgY29uc3QgYiA9IFBvaW50LmRpc3RhbmNlKEEsIEMpXG4gICAgY29uc3QgYyA9IFBvaW50LmRpc3RhbmNlKEEsIEIpXG5cbiAgICBjb25zdCBwZXJpbWV0ZXIgPSBhICsgYiArIGNcbiAgICBjb25zdCBzdW14ID0gYSAqIEEueCArIGIgKiBCLnggKyBjICogQy54XG4gICAgY29uc3Qgc3VteSA9IGEgKiBBLnkgKyBiICogQi55ICsgYyAqIEMueVxuXG4gICAgcmV0dXJuIG5ldyBQb2ludChzdW14IC8gcGVyaW1ldGVyLCBzdW15IC8gcGVyaW1ldGVyKVxuICB9XG5cbiAgc3RhdGljIG1pbiAocG9pbnRzIDogUG9pbnRbXSkge1xuICAgIGNvbnN0IG1pbnggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1pbih4LCBwLngpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtaW55ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5taW4oeSwgcC55KSwgSW5maW5pdHkpXG4gICAgcmV0dXJuIG5ldyBQb2ludChtaW54LCBtaW55KVxuICB9XG5cbiAgc3RhdGljIG1heCAocG9pbnRzOiBQb2ludFtdKSB7XG4gICAgY29uc3QgbWF4eCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWF4KHgsIHAueCksIC1JbmZpbml0eSlcbiAgICBjb25zdCBtYXh5ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5tYXgoeSwgcC55KSwgLUluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQobWF4eCwgbWF4eSlcbiAgfVxuXG4gIHN0YXRpYyBjZW50ZXIgKHBvaW50czogUG9pbnRbXSkge1xuICAgIGNvbnN0IG1pbnggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1pbih4LCBwLngpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtaW55ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5taW4oeSwgcC55KSwgSW5maW5pdHkpXG4gICAgY29uc3QgbWF4eCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWF4KHgsIHAueCksIC1JbmZpbml0eSlcbiAgICBjb25zdCBtYXh5ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5tYXgoeSwgcC55KSwgLUluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQoKG1heHggKyBtaW54KSAvIDIsIChtYXh5ICsgbWlueSkgLyAyKVxuICB9XG5cbiAgc3RhdGljIHVuaXRWZWN0b3IgKHAxIDogUG9pbnQsIHAyIDogUG9pbnQpIHtcbiAgICAvLyByZXR1cm5zIGEgdW5pdCB2ZWN0b3IgaW4gdGhlIGRpcmVjdGlvbiBvZiBwMSB0byBwMlxuICAgIC8vIGluIHRoZSBmb3JtIHt4Oi4uLiwgeTouLi59XG4gICAgY29uc3QgdmVjeCA9IHAyLnggLSBwMS54XG4gICAgY29uc3QgdmVjeSA9IHAyLnkgLSBwMS55XG4gICAgY29uc3QgbGVuZ3RoID0gTWF0aC5oeXBvdCh2ZWN4LCB2ZWN5KVxuICAgIHJldHVybiB7IHg6IHZlY3ggLyBsZW5ndGgsIHk6IHZlY3kgLyBsZW5ndGggfVxuICB9XG5cbiAgc3RhdGljIGRpc3RhbmNlIChwMTogUG9pbnQsIHAyOiBQb2ludCkge1xuICAgIHJldHVybiBNYXRoLmh5cG90KHAxLnggLSBwMi54LCBwMS55IC0gcDIueSlcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGUgdGhlIGFuZ2xlIGluIHJhZGlhbnMgZnJvbSBob3Jpem9udGFsIHRvIHAyLCB3aXRoIGNlbnRyZSBwMS5cbiAgICogRS5nLiBhbmdsZUZyb20oICgwLDApLCAoMSwxKSApID0gcGkvMlxuICAgKiBBbmdsZSBpcyBmcm9tIDAgdG8gMnBpXG4gICAqIEBwYXJhbSAgcDEgVGhlIHN0YXJ0IHBvaW50XG4gICAqIEBwYXJhbSAgcDIgVGhlIGVuZCBwb2ludFxuICAgKiBAcmV0dXJucyAgVGhlIGFuZ2xlIGluIHJhZGlhbnNcbiAgICovXG4gIHN0YXRpYyBhbmdsZUZyb20gKHAxOiBQb2ludCwgcDI6IFBvaW50KTogbnVtYmVyIHtcbiAgICBjb25zdCBhbmdsZSA9IE1hdGguYXRhbjIocDIueSAtIHAxLnksIHAyLnggLSBwMS54KVxuICAgIHJldHVybiBhbmdsZSA+PSAwID8gYW5nbGUgOiAyICogTWF0aC5QSSArIGFuZ2xlXG4gIH1cblxuICAvKipcbiAgICogV2hlbiBwMSBhbmQgcDIgYXJlIGxlc3MgdGhhbiBbdHJpZ2dlcl0gYXBhcnQsIHRoZXkgYXJlXG4gICAqIG1vdmVkIHNvIHRoYXQgdGhleSBhcmUgW2Rpc3RhbmNlXSBhcGFydFxuICAgKiBAcGFyYW0gcDEgQSBwb2ludFxuICAgKiBAcGFyYW0gcDIgQSBwb2ludFxuICAgKiBAcGFyYW0gdHJpZ2dlciBEaXN0YW5jZSB0cmlnZ2VyaW5nIHJlcHVsc2lvblxuICAgKiBAcGFyYW0gZGlzdGFuY2UgZGlzdGFuY2UgdG8gcmVwZWwgdG9cbiAgICovXG4gIHN0YXRpYyByZXBlbCAocDE6IFBvaW50LCBwMjogUG9pbnQsIHRyaWdnZXI6IG51bWJlciwgZGlzdGFuY2U6IG51bWJlcikge1xuICAgIGNvbnN0IGQgPSBNYXRoLmh5cG90KHAxLnggLSBwMi54LCBwMS55IC0gcDIueSlcbiAgICBpZiAoZCA+PSB0cmlnZ2VyKSByZXR1cm4gZmFsc2VcblxuICAgIGNvbnN0IHIgPSAoZGlzdGFuY2UgLSBkKSAvIDIgLy8gZGlzdGFuY2UgdGhleSBuZWVkIG1vdmluZ1xuICAgIHAxLm1vdmVUb3dhcmQocDIsIC1yKVxuICAgIHAyLm1vdmVUb3dhcmQocDEsIC1yKVxuICAgIHJldHVybiB0cnVlXG4gIH1cblxuICAvKipcbiAgICogU2NhbGUgYW4gY2VudGVyIGEgc2V0IG9mIHBvaW50cyB0byBhIGdpdmVuIHdpZHRoIG9yIGhlaWdodC4gTi5CLiBUaGlzIG11dGF0ZXMgdGhlIHBvaW50cyBpbiB0aGUgYXJyYXksIHNvIGNsb25lIGZpcnN0IGlmIG5lY2Vzc2FyXG4gICAqIEBwYXJhbSBwb2ludHMgQW4gYXJyYXkgb2YgcG9pbnRzXG4gICAqIEBwYXJhbSB3aWR0aCBXaWR0aCBvZiBib3VuZGluZyBib3ggdG8gc2NhbGUgdG9cbiAgICogQHBhcmFtIGhlaWdodCBIZWlnaHQgb2YgYm91bmRpbmcgYm94IHRvIHNjYWxlIHRvXG4gICAqIEBwYXJhbSBtYXJnaW4gTWFyZ2luIHRvIGxlYXZlIGFyb3VuZCBzY2FsZWQgcG9pbnRzXG4gICAqIEBwYXJhbSBvZmZzZXQgT2Zmc2V0IGZyb20gY2VudGVyIG9mIGJvdW5kaW5nIGJveFxuICAgKiBAcmV0dXJucyBUaGUgc2NhbGUgZmFjdG9yIHRoYXQgcG9pbnRzIHdlcmUgc2NhbGVkIGJ5XG4gICAqL1xuICBzdGF0aWMgc2NhbGVUb0ZpdCAocG9pbnRzOiBQb2ludFtdLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgbWFyZ2luID0gMCwgb2Zmc2V0OiBbbnVtYmVyLCBudW1iZXJdID0gWzAsIDBdKSB7XG4gICAgbGV0IHRvcExlZnQgOiBQb2ludCA9IFBvaW50Lm1pbihwb2ludHMpXG4gICAgbGV0IGJvdHRvbVJpZ2h0IDogUG9pbnQgPSBQb2ludC5tYXgocG9pbnRzKVxuICAgIGNvbnN0IHRvdGFsV2lkdGggOiBudW1iZXIgPSBib3R0b21SaWdodC54IC0gdG9wTGVmdC54XG4gICAgY29uc3QgdG90YWxIZWlnaHQgOiBudW1iZXIgPSBib3R0b21SaWdodC55IC0gdG9wTGVmdC55XG4gICAgY29uc3Qgc2YgPSBNYXRoLm1pbigod2lkdGggLSBtYXJnaW4pIC8gdG90YWxXaWR0aCwgKGhlaWdodCAtIG1hcmdpbikgLyB0b3RhbEhlaWdodClcbiAgICBwb2ludHMuZm9yRWFjaChwdCA9PiB7IHB0LnNjYWxlKHNmKSB9KVxuXG4gICAgLy8gY2VudHJlXG4gICAgdG9wTGVmdCA9IFBvaW50Lm1pbihwb2ludHMpXG4gICAgYm90dG9tUmlnaHQgPSBQb2ludC5tYXgocG9pbnRzKVxuICAgIGNvbnN0IGNlbnRlciA9IFBvaW50Lm1lYW4odG9wTGVmdCwgYm90dG9tUmlnaHQpLnRyYW5zbGF0ZSguLi5vZmZzZXQpXG4gICAgcG9pbnRzLmZvckVhY2gocHQgPT4geyBwdC50cmFuc2xhdGUod2lkdGggLyAyIC0gY2VudGVyLngsIGhlaWdodCAvIDIgLSBjZW50ZXIueSkgfSkgLy8gY2VudHJlXG5cbiAgICByZXR1cm4gc2ZcbiAgfVxufVxuIiwiaW1wb3J0IFF1ZXN0aW9uIGZyb20gJ1F1ZXN0aW9uL1F1ZXN0aW9uJ1xuaW1wb3J0IHsgY3JlYXRlRWxlbSB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuL1ZpZXdPcHRpb25zJ1xuZGVjbGFyZSBjb25zdCBrYXRleCA6IHtyZW5kZXIgOiAoc3RyaW5nOiBzdHJpbmcsIGVsZW1lbnQ6IEhUTUxFbGVtZW50KSA9PiB2b2lkfVxuXG4vKiBHcmFwaGljUURhdGEgY2FuIGFsbCBiZSB2ZXJ5IGRpZmZlcmVudCwgc28gaW50ZXJmYWNlIGlzIGVtcHR5XG4gKiBIZXJlIGZvciBjb2RlIGRvY3VtZW50YXRpb24gcmF0aGVyIHRoYW4gdHlwZSBzYWZldHkgKHdoaWNoIGlzbid0IHByb3ZpZGVkKSAqL1xuXG4vKiBlc2xpbnQtZGlzYWJsZSAqL1xuZXhwb3J0IGludGVyZmFjZSBHcmFwaGljUURhdGEge1xufVxuLyogZXNsaW50LWVuYWJsZSAqL1xuXG4vKiBOb3Qgd29ydGggdGhlIGhhc3NseSB0cnlpbmcgdG8gZ2V0IGludGVyZmFjZXMgZm9yIHN0YXRpYyBtZXRob2RzXG4gKlxuICogZXhwb3J0IGludGVyZmFjZSBHcmFwaGljUURhdGFDb25zdHJ1Y3RvciB7XG4gKiAgIG5ldyguLi5hcmdzIDogdW5rbm93bltdKTogR3JhcGhpY1FEYXRhXG4gKiAgIHJhbmRvbShvcHRpb25zOiB1bmtub3duKSA6IEdyYXBoaWNRRGF0YVxuICogfVxuKi9cblxuZXhwb3J0IGludGVyZmFjZSBMYWJlbCB7XG4gIHBvczogUG9pbnQsXG4gIHRleHRxOiBzdHJpbmcsXG4gIHRleHRhOiBzdHJpbmcsXG4gIHN0eWxlcTogc3RyaW5nLFxuICBzdHlsZWE6IHN0cmluZyxcbiAgdGV4dDogc3RyaW5nLFxuICBzdHlsZTogc3RyaW5nXG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBHcmFwaGljUVZpZXcge1xuICBET006IEhUTUxFbGVtZW50XG4gIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnRcbiAgd2lkdGg6IG51bWJlclxuICBoZWlnaHQ6IG51bWJlclxuICBkYXRhOiBHcmFwaGljUURhdGFcbiAgbGFiZWxzOiBMYWJlbFtdXG4gIHJvdGF0aW9uPzogbnVtYmVyXG5cbiAgY29uc3RydWN0b3IgKGRhdGEgOiBHcmFwaGljUURhdGEsIHZpZXdPcHRpb25zIDogVmlld09wdGlvbnMpIHtcbiAgICB2aWV3T3B0aW9ucy53aWR0aCA9IHZpZXdPcHRpb25zLndpZHRoID8/IDMwMFxuICAgIHZpZXdPcHRpb25zLmhlaWdodCA9IHZpZXdPcHRpb25zLmhlaWdodCA/PyAzMDBcblxuICAgIHRoaXMud2lkdGggPSB2aWV3T3B0aW9ucy53aWR0aFxuICAgIHRoaXMuaGVpZ2h0ID0gdmlld09wdGlvbnMuaGVpZ2h0IC8vIG9ubHkgdGhpbmdzIEkgbmVlZCBmcm9tIHRoZSBvcHRpb25zLCBnZW5lcmFsbHk/XG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIHRoaXMucm90YXRpb24gPSB2aWV3T3B0aW9ucy5yb3RhdGlvblxuXG4gICAgdGhpcy5sYWJlbHMgPSBbXSAvLyBsYWJlbHMgb24gZGlhZ3JhbVxuXG4gICAgLy8gRE9NIGVsZW1lbnRzXG4gICAgdGhpcy5ET00gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tZGl2JylcbiAgICB0aGlzLmNhbnZhcyA9IGNyZWF0ZUVsZW0oJ2NhbnZhcycsICdxdWVzdGlvbi1jYW52YXMnLCB0aGlzLkRPTSkgYXMgSFRNTENhbnZhc0VsZW1lbnRcbiAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMud2lkdGhcbiAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodFxuICB9XG5cbiAgZ2V0RE9NICgpIDogSFRNTEVsZW1lbnQge1xuICAgIHJldHVybiB0aGlzLkRPTVxuICB9XG5cbiAgYWJzdHJhY3QgcmVuZGVyICgpIDogdm9pZFxuXG4gIHJlbmRlckxhYmVscyAobnVkZ2U/IDogYm9vbGVhbikgOiB2b2lkIHtcbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLkRPTVxuXG4gICAgLy8gcmVtb3ZlIGFueSBleGlzdGluZyBsYWJlbHNcbiAgICBjb25zdCBvbGRMYWJlbHMgPSBjb250YWluZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnbGFiZWwnKVxuICAgIHdoaWxlIChvbGRMYWJlbHMubGVuZ3RoID4gMCkge1xuICAgICAgb2xkTGFiZWxzWzBdLnJlbW92ZSgpXG4gICAgfVxuXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICAgIGNvbnN0IGlubmVybGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgICAgbGFiZWwuY2xhc3NMaXN0LmFkZCgnbGFiZWwnKVxuICAgICAgbGFiZWwuY2xhc3NOYW1lICs9ICcgJyArIGwuc3R5bGUgLy8gdXNpbmcgY2xhc3NOYW1lIG92ZXIgY2xhc3NMaXN0IHNpbmNlIGwuc3R5bGUgaXMgc3BhY2UtZGVsaW1pdGVkIGxpc3Qgb2YgY2xhc3Nlc1xuICAgICAgbGFiZWwuc3R5bGUubGVmdCA9IGwucG9zLnggKyAncHgnXG4gICAgICBsYWJlbC5zdHlsZS50b3AgPSBsLnBvcy55ICsgJ3B4J1xuXG4gICAgICBrYXRleC5yZW5kZXIobC50ZXh0LCBpbm5lcmxhYmVsKVxuICAgICAgbGFiZWwuYXBwZW5kQ2hpbGQoaW5uZXJsYWJlbClcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChsYWJlbClcblxuICAgICAgLy8gcmVtb3ZlIHNwYWNlIGlmIHRoZSBpbm5lciBsYWJlbCBpcyB0b28gYmlnXG4gICAgICBpZiAoaW5uZXJsYWJlbC5vZmZzZXRXaWR0aCAvIGlubmVybGFiZWwub2Zmc2V0SGVpZ2h0ID4gMikge1xuICAgICAgICBjb25zb2xlLmxvZyhgcmVtb3ZlZCBzcGFjZSBpbiAke2wudGV4dH1gKVxuICAgICAgICBjb25zdCBuZXdsYWJlbHRleHQgPSBsLnRleHQucmVwbGFjZSgvXFwrLywgJ1xcXFwhK1xcXFwhJykucmVwbGFjZSgvLS8sICdcXFxcIS1cXFxcIScpXG4gICAgICAgIGthdGV4LnJlbmRlcihuZXdsYWJlbHRleHQsIGlubmVybGFiZWwpXG4gICAgICB9XG5cbiAgICAgIC8vIEkgZG9uJ3QgdW5kZXJzdGFuZCB0aGlzIGFkanVzdG1lbnQuIEkgdGhpbmsgaXQgbWlnaHQgYmUgbmVlZGVkIGluIGFyaXRobWFnb25zLCBidXQgaXQgbWFrZXNcbiAgICAgIC8vIG90aGVycyBnbyBmdW5ueS5cblxuICAgICAgaWYgKG51ZGdlKSB7XG4gICAgICAgIGNvbnN0IGx3aWR0aCA9IGxhYmVsLm9mZnNldFdpZHRoXG4gICAgICAgIGlmIChsLnBvcy54IDwgdGhpcy5jYW52YXMud2lkdGggLyAyIC0gNSAmJiBsLnBvcy54ICsgbHdpZHRoIC8gMiA+IHRoaXMuY2FudmFzLndpZHRoIC8gMikge1xuICAgICAgICAgIGxhYmVsLnN0eWxlLmxlZnQgPSAodGhpcy5jYW52YXMud2lkdGggLyAyIC0gbHdpZHRoIC0gMykgKyAncHgnXG4gICAgICAgICAgY29uc29sZS5sb2coYG51ZGdlZCAnJHtsLnRleHR9J2ApXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGwucG9zLnggPiB0aGlzLmNhbnZhcy53aWR0aCAvIDIgKyA1ICYmIGwucG9zLnggLSBsd2lkdGggLyAyIDwgdGhpcy5jYW52YXMud2lkdGggLyAyKSB7XG4gICAgICAgICAgbGFiZWwuc3R5bGUubGVmdCA9ICh0aGlzLmNhbnZhcy53aWR0aCAvIDIgKyAzKSArICdweCdcbiAgICAgICAgICBjb25zb2xlLmxvZyhgbnVkZ2VkICcke2wudGV4dH0nYClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBzaG93QW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dGFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlYVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoZmFsc2UpXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoZmFsc2UpXG4gIH1cblxuICAvLyBQb2ludCB0cmFuZm9ybWF0aW9ucyBvZiBhbGwgcG9pbnRzXG5cbiAgZ2V0IGFsbHBvaW50cyAoKSA6IFBvaW50W10ge1xuICAgIHJldHVybiBbXVxuICB9XG5cbiAgc2NhbGUgKHNmIDogbnVtYmVyKSA6IHZvaWQge1xuICAgIHRoaXMuYWxscG9pbnRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHAuc2NhbGUoc2YpXG4gICAgfSlcbiAgfVxuXG4gIHJvdGF0ZSAoYW5nbGUgOiBudW1iZXIpIDogbnVtYmVyIHtcbiAgICB0aGlzLmFsbHBvaW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICBwLnJvdGF0ZShhbmdsZSlcbiAgICB9KVxuICAgIHJldHVybiBhbmdsZVxuICB9XG5cbiAgdHJhbnNsYXRlICh4IDogbnVtYmVyLCB5IDogbnVtYmVyKSA6IHZvaWQge1xuICAgIHRoaXMuYWxscG9pbnRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHAudHJhbnNsYXRlKHgsIHkpXG4gICAgfSlcbiAgfVxuXG4gIHJhbmRvbVJvdGF0ZSAoKSA6IG51bWJlciB7XG4gICAgY29uc3QgYW5nbGUgPSAyICogTWF0aC5QSSAqIE1hdGgucmFuZG9tKClcbiAgICB0aGlzLnJvdGF0ZShhbmdsZSlcbiAgICByZXR1cm4gYW5nbGVcbiAgfVxuXG4gIC8qKlxuICAgKiBTY2FsZXMgYWxsIHRoZSBwb2ludHMgdG8gd2l0aGluIGEgZ2l2ZW4gd2lkdGggYW5kIGhlaWdodCwgY2VudGVyaW5nIHRoZSByZXN1bHQuIFJldHVybnMgdGhlIHNjYWxlIGZhY3RvclxuICAgKiBAcGFyYW0gd2lkdGggVGhlIHdpZHRoIG9mIHRoZSBib3VuZGluZyByZWN0YW5nbGUgdG8gc2NhbGUgdG9cbiAgICogQHBhcmFtIGhlaWdodCBUaGUgaGVpZ2h0IG9mIHRoZSBib3VuZGluZyByZWN0YW5nbGUgdG8gc2NhbGUgdG9cbiAgICogQHBhcmFtIG1hcmdpbiBNYXJnaW4gdG8gbGVhdmUgb3V0c2lkZSB0aGUgcmVjdGFuZ2xlXG4gICAqIEByZXR1cm5zXG4gICAqL1xuICBzY2FsZVRvRml0ICh3aWR0aCA6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIG1hcmdpbiA6IG51bWJlcikgOiBudW1iZXIge1xuICAgIGxldCB0b3BMZWZ0IDogUG9pbnQgPSBQb2ludC5taW4odGhpcy5hbGxwb2ludHMpXG4gICAgbGV0IGJvdHRvbVJpZ2h0IDogUG9pbnQgPSBQb2ludC5tYXgodGhpcy5hbGxwb2ludHMpXG4gICAgY29uc3QgdG90YWxXaWR0aCA6IG51bWJlciA9IGJvdHRvbVJpZ2h0LnggLSB0b3BMZWZ0LnhcbiAgICBjb25zdCB0b3RhbEhlaWdodCA6IG51bWJlciA9IGJvdHRvbVJpZ2h0LnkgLSB0b3BMZWZ0LnlcbiAgICBjb25zdCBzZiA9IE1hdGgubWluKCh3aWR0aCAtIG1hcmdpbikgLyB0b3RhbFdpZHRoLCAoaGVpZ2h0IC0gbWFyZ2luKSAvIHRvdGFsSGVpZ2h0KVxuICAgIHRoaXMuc2NhbGUoc2YpXG5cbiAgICAvLyBjZW50cmVcbiAgICB0b3BMZWZ0ID0gUG9pbnQubWluKHRoaXMuYWxscG9pbnRzKVxuICAgIGJvdHRvbVJpZ2h0ID0gUG9pbnQubWF4KHRoaXMuYWxscG9pbnRzKVxuICAgIGNvbnN0IGNlbnRlciA9IFBvaW50Lm1lYW4odG9wTGVmdCwgYm90dG9tUmlnaHQpXG4gICAgdGhpcy50cmFuc2xhdGUod2lkdGggLyAyIC0gY2VudGVyLngsIGhlaWdodCAvIDIgLSBjZW50ZXIueSkgLy8gY2VudHJlXG5cbiAgICByZXR1cm4gc2ZcbiAgfVxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgR3JhcGhpY1EgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIGRhdGE6IEdyYXBoaWNRRGF0YVxuICB2aWV3OiBHcmFwaGljUVZpZXdcblxuICBjb25zdHJ1Y3RvciAoZGF0YTogR3JhcGhpY1FEYXRhLCB2aWV3OiBHcmFwaGljUVZpZXcpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICBzdXBlcigpIC8vIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICB0aGlzLnZpZXcgPSB2aWV3XG4gICAgdGhpcy5ET00gPSB0aGlzLnZpZXcuRE9NXG5cbiAgICAvKiBUaGVzZSBhcmUgZ3VhcmFudGVlZCB0byBiZSBvdmVycmlkZGVuLCBzbyBubyBwb2ludCBpbml0aWFsaXppbmcgaGVyZVxuICAgICAqXG4gICAgICogIHRoaXMuZGF0YSA9IG5ldyBHcmFwaGljUURhdGEob3B0aW9ucylcbiAgICAgKiAgdGhpcy52aWV3ID0gbmV3IEdyYXBoaWNRVmlldyh0aGlzLmRhdGEsIG9wdGlvbnMpXG4gICAgICpcbiAgICAgKi9cbiAgfVxuXG4gIC8qIE5lZWQgdG8gcmVmYWN0b3Igc3ViY2xhc3NlcyB0byBkbyB0aGlzOlxuICAgKiBjb25zdHJ1Y3RvciAoZGF0YSwgdmlldykge1xuICAgKiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAqICAgIHRoaXMudmlldyA9IHZpZXdcbiAgICogfVxuICAgKlxuICAgKiBzdGF0aWMgcmFuZG9tKG9wdGlvbnMpIHtcbiAgICogIC8vIGFuIGF0dGVtcHQgYXQgaGF2aW5nIGFic3RyYWN0IHN0YXRpYyBtZXRob2RzLCBhbGJlaXQgcnVudGltZSBlcnJvclxuICAgKiAgdGhyb3cgbmV3IEVycm9yKFwiYHJhbmRvbSgpYCBtdXN0IGJlIG92ZXJyaWRkZW4gaW4gc3ViY2xhc3MgXCIgKyB0aGlzLm5hbWUpXG4gICAqIH1cbiAgICpcbiAgICogdHlwaWNhbCBpbXBsZW1lbnRhdGlvbjpcbiAgICogc3RhdGljIHJhbmRvbShvcHRpb25zKSB7XG4gICAqICBjb25zdCBkYXRhID0gbmV3IERlcml2ZWRRRGF0YShvcHRpb25zKVxuICAgKiAgY29uc3QgdmlldyA9IG5ldyBEZXJpdmVkUVZpZXcob3B0aW9ucylcbiAgICogIHJldHVybiBuZXcgRGVyaXZlZFFEYXRhKGRhdGEsdmlldylcbiAgICogfVxuICAgKlxuICAgKi9cblxuICBnZXRET00gKCkgOiBIVE1MRWxlbWVudCB7IHJldHVybiB0aGlzLnZpZXcuZ2V0RE9NKCkgfVxuXG4gIHJlbmRlciAoKSA6IHZvaWQgeyB0aGlzLnZpZXcucmVuZGVyKCkgfVxuXG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICBzdXBlci5zaG93QW5zd2VyKClcbiAgICB0aGlzLnZpZXcuc2hvd0Fuc3dlcigpXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7XG4gICAgc3VwZXIuaGlkZUFuc3dlcigpXG4gICAgdGhpcy52aWV3LmhpZGVBbnN3ZXIoKVxuICB9XG59XG4iLCJpbXBvcnQgKiBhcyBjb21tb25qc0hlbHBlcnMgZnJvbSAnXHUwMDAwY29tbW9uanNIZWxwZXJzLmpzJ1xuXG52YXIgZnJhY3Rpb24gPSBjb21tb25qc0hlbHBlcnMuY3JlYXRlQ29tbW9uanNNb2R1bGUoZnVuY3Rpb24gKG1vZHVsZSwgZXhwb3J0cykge1xuLyoqXG4gKiBAbGljZW5zZSBGcmFjdGlvbi5qcyB2NC4wLjkgMDkvMDkvMjAxNVxuICogaHR0cDovL3d3dy54YXJnLm9yZy8yMDE0LzAzL3JhdGlvbmFsLW51bWJlcnMtaW4tamF2YXNjcmlwdC9cbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUsIFJvYmVydCBFaXNlbGUgKHJvYmVydEB4YXJnLm9yZylcbiAqIER1YWwgbGljZW5zZWQgdW5kZXIgdGhlIE1JVCBvciBHUEwgVmVyc2lvbiAyIGxpY2Vuc2VzLlxuICoqL1xuXG4gIC8qKlxuICpcbiAqIFRoaXMgY2xhc3Mgb2ZmZXJzIHRoZSBwb3NzaWJpbGl0eSB0byBjYWxjdWxhdGUgZnJhY3Rpb25zLlxuICogWW91IGNhbiBwYXNzIGEgZnJhY3Rpb24gaW4gZGlmZmVyZW50IGZvcm1hdHMuIEVpdGhlciBhcyBhcnJheSwgYXMgZG91YmxlLCBhcyBzdHJpbmcgb3IgYXMgYW4gaW50ZWdlci5cbiAqXG4gKiBBcnJheS9PYmplY3QgZm9ybVxuICogWyAwID0+IDxub21pbmF0b3I+LCAxID0+IDxkZW5vbWluYXRvcj4gXVxuICogWyBuID0+IDxub21pbmF0b3I+LCBkID0+IDxkZW5vbWluYXRvcj4gXVxuICpcbiAqIEludGVnZXIgZm9ybVxuICogLSBTaW5nbGUgaW50ZWdlciB2YWx1ZVxuICpcbiAqIERvdWJsZSBmb3JtXG4gKiAtIFNpbmdsZSBkb3VibGUgdmFsdWVcbiAqXG4gKiBTdHJpbmcgZm9ybVxuICogMTIzLjQ1NiAtIGEgc2ltcGxlIGRvdWJsZVxuICogMTIzLzQ1NiAtIGEgc3RyaW5nIGZyYWN0aW9uXG4gKiAxMjMuJzQ1NicgLSBhIGRvdWJsZSB3aXRoIHJlcGVhdGluZyBkZWNpbWFsIHBsYWNlc1xuICogMTIzLig0NTYpIC0gc3lub255bVxuICogMTIzLjQ1JzYnIC0gYSBkb3VibGUgd2l0aCByZXBlYXRpbmcgbGFzdCBwbGFjZVxuICogMTIzLjQ1KDYpIC0gc3lub255bVxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogdmFyIGYgPSBuZXcgRnJhY3Rpb24oXCI5LjQnMzEnXCIpO1xuICogZi5tdWwoWy00LCAzXSkuZGl2KDQuOSk7XG4gKlxuICovXG5cbiAgKGZ1bmN0aW9uIChyb290KSB7XG4gICAgJ3VzZSBzdHJpY3QnXG5cbiAgICAvLyBNYXhpbXVtIHNlYXJjaCBkZXB0aCBmb3IgY3ljbGljIHJhdGlvbmFsIG51bWJlcnMuIDIwMDAgc2hvdWxkIGJlIG1vcmUgdGhhbiBlbm91Z2guXG4gICAgLy8gRXhhbXBsZTogMS83ID0gMC4oMTQyODU3KSBoYXMgNiByZXBlYXRpbmcgZGVjaW1hbCBwbGFjZXMuXG4gICAgLy8gSWYgTUFYX0NZQ0xFX0xFTiBnZXRzIHJlZHVjZWQsIGxvbmcgY3ljbGVzIHdpbGwgbm90IGJlIGRldGVjdGVkIGFuZCB0b1N0cmluZygpIG9ubHkgZ2V0cyB0aGUgZmlyc3QgMTAgZGlnaXRzXG4gICAgdmFyIE1BWF9DWUNMRV9MRU4gPSAyMDAwXG5cbiAgICAvLyBQYXJzZWQgZGF0YSB0byBhdm9pZCBjYWxsaW5nIFwibmV3XCIgYWxsIHRoZSB0aW1lXG4gICAgdmFyIFAgPSB7XG4gICAgICBzOiAxLFxuICAgICAgbjogMCxcbiAgICAgIGQ6IDFcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVFcnJvciAobmFtZSkge1xuICAgICAgZnVuY3Rpb24gZXJyb3JDb25zdHJ1Y3RvciAoKSB7XG4gICAgICAgIHZhciB0ZW1wID0gRXJyb3IuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgICAgICB0ZW1wLm5hbWUgPSB0aGlzLm5hbWUgPSBuYW1lXG4gICAgICAgIHRoaXMuc3RhY2sgPSB0ZW1wLnN0YWNrXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IHRlbXAubWVzc2FnZVxuICAgICAgfVxuXG4gICAgICAvKipcbiAgICAgKiBFcnJvciBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgICBmdW5jdGlvbiBJbnRlcm1lZGlhdGVJbmhlcml0b3IgKCkge31cbiAgICAgIEludGVybWVkaWF0ZUluaGVyaXRvci5wcm90b3R5cGUgPSBFcnJvci5wcm90b3R5cGVcbiAgICAgIGVycm9yQ29uc3RydWN0b3IucHJvdG90eXBlID0gbmV3IEludGVybWVkaWF0ZUluaGVyaXRvcigpXG5cbiAgICAgIHJldHVybiBlcnJvckNvbnN0cnVjdG9yXG4gICAgfVxuXG4gICAgdmFyIERpdmlzaW9uQnlaZXJvID0gRnJhY3Rpb24uRGl2aXNpb25CeVplcm8gPSBjcmVhdGVFcnJvcignRGl2aXNpb25CeVplcm8nKVxuICAgIHZhciBJbnZhbGlkUGFyYW1ldGVyID0gRnJhY3Rpb24uSW52YWxpZFBhcmFtZXRlciA9IGNyZWF0ZUVycm9yKCdJbnZhbGlkUGFyYW1ldGVyJylcblxuICAgIGZ1bmN0aW9uIGFzc2lnbiAobiwgcykge1xuICAgICAgaWYgKGlzTmFOKG4gPSBwYXJzZUludChuLCAxMCkpKSB7XG4gICAgICAgIHRocm93SW52YWxpZFBhcmFtKClcbiAgICAgIH1cbiAgICAgIHJldHVybiBuICogc1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRocm93SW52YWxpZFBhcmFtICgpIHtcbiAgICAgIHRocm93IG5ldyBJbnZhbGlkUGFyYW1ldGVyKClcbiAgICB9XG5cbiAgICB2YXIgcGFyc2UgPSBmdW5jdGlvbiAocDEsIHAyKSB7XG4gICAgICB2YXIgbiA9IDA7IHZhciBkID0gMTsgdmFyIHMgPSAxXG4gICAgICB2YXIgdiA9IDA7IHZhciB3ID0gMDsgdmFyIHggPSAwOyB2YXIgeSA9IDE7IHZhciB6ID0gMVxuXG4gICAgICB2YXIgQSA9IDA7IHZhciBCID0gMVxuICAgICAgdmFyIEMgPSAxOyB2YXIgRCA9IDFcblxuICAgICAgdmFyIE4gPSAxMDAwMDAwMFxuICAgICAgdmFyIE1cblxuICAgICAgaWYgKHAxID09PSB1bmRlZmluZWQgfHwgcDEgPT09IG51bGwpIHtcbiAgICAgIC8qIHZvaWQgKi9cbiAgICAgIH0gZWxzZSBpZiAocDIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBuID0gcDFcbiAgICAgICAgZCA9IHAyXG4gICAgICAgIHMgPSBuICogZFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3dpdGNoICh0eXBlb2YgcDEpIHtcbiAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlmICgnZCcgaW4gcDEgJiYgJ24nIGluIHAxKSB7XG4gICAgICAgICAgICAgIG4gPSBwMS5uXG4gICAgICAgICAgICAgIGQgPSBwMS5kXG4gICAgICAgICAgICAgIGlmICgncycgaW4gcDEpIHsgbiAqPSBwMS5zIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoMCBpbiBwMSkge1xuICAgICAgICAgICAgICBuID0gcDFbMF1cbiAgICAgICAgICAgICAgaWYgKDEgaW4gcDEpIHsgZCA9IHAxWzFdIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93SW52YWxpZFBhcmFtKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHMgPSBuICogZFxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZiAocDEgPCAwKSB7XG4gICAgICAgICAgICAgIHMgPSBwMVxuICAgICAgICAgICAgICBwMSA9IC1wMVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocDEgJSAxID09PSAwKSB7XG4gICAgICAgICAgICAgIG4gPSBwMVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwMSA+IDApIHsgLy8gY2hlY2sgZm9yICE9IDAsIHNjYWxlIHdvdWxkIGJlY29tZSBOYU4gKGxvZygwKSksIHdoaWNoIGNvbnZlcmdlcyByZWFsbHkgc2xvd1xuICAgICAgICAgICAgICBpZiAocDEgPj0gMSkge1xuICAgICAgICAgICAgICAgIHogPSBNYXRoLnBvdygxMCwgTWF0aC5mbG9vcigxICsgTWF0aC5sb2cocDEpIC8gTWF0aC5MTjEwKSlcbiAgICAgICAgICAgICAgICBwMSAvPSB6XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAvLyBVc2luZyBGYXJleSBTZXF1ZW5jZXNcbiAgICAgICAgICAgICAgLy8gaHR0cDovL3d3dy5qb2huZGNvb2suY29tL2Jsb2cvMjAxMC8xMC8yMC9iZXN0LXJhdGlvbmFsLWFwcHJveGltYXRpb24vXG5cbiAgICAgICAgICAgICAgd2hpbGUgKEIgPD0gTiAmJiBEIDw9IE4pIHtcbiAgICAgICAgICAgICAgICBNID0gKEEgKyBDKSAvIChCICsgRClcblxuICAgICAgICAgICAgICAgIGlmIChwMSA9PT0gTSkge1xuICAgICAgICAgICAgICAgICAgaWYgKEIgKyBEIDw9IE4pIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IEEgKyBDXG4gICAgICAgICAgICAgICAgICAgIGQgPSBCICsgRFxuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChEID4gQikge1xuICAgICAgICAgICAgICAgICAgICBuID0gQ1xuICAgICAgICAgICAgICAgICAgICBkID0gRFxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IEFcbiAgICAgICAgICAgICAgICAgICAgZCA9IEJcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGlmIChwMSA+IE0pIHtcbiAgICAgICAgICAgICAgICAgICAgQSArPSBDXG4gICAgICAgICAgICAgICAgICAgIEIgKz0gRFxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgQyArPSBBXG4gICAgICAgICAgICAgICAgICAgIEQgKz0gQlxuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAoQiA+IE4pIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IENcbiAgICAgICAgICAgICAgICAgICAgZCA9IERcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBBXG4gICAgICAgICAgICAgICAgICAgIGQgPSBCXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG4gKj0gelxuICAgICAgICAgICAgfSBlbHNlIGlmIChpc05hTihwMSkgfHwgaXNOYU4ocDIpKSB7XG4gICAgICAgICAgICAgIGQgPSBuID0gTmFOXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIEIgPSBwMS5tYXRjaCgvXFxkK3wuL2cpXG5cbiAgICAgICAgICAgIGlmIChCID09PSBudWxsKSB7IHRocm93SW52YWxpZFBhcmFtKCkgfVxuXG4gICAgICAgICAgICBpZiAoQltBXSA9PT0gJy0nKSB7IC8vIENoZWNrIGZvciBtaW51cyBzaWduIGF0IHRoZSBiZWdpbm5pbmdcbiAgICAgICAgICAgICAgcyA9IC0xXG4gICAgICAgICAgICAgIEErK1xuICAgICAgICAgICAgfSBlbHNlIGlmIChCW0FdID09PSAnKycpIHsgLy8gQ2hlY2sgZm9yIHBsdXMgc2lnbiBhdCB0aGUgYmVnaW5uaW5nXG4gICAgICAgICAgICAgIEErK1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoQi5sZW5ndGggPT09IEEgKyAxKSB7IC8vIENoZWNrIGlmIGl0J3MganVzdCBhIHNpbXBsZSBudW1iZXIgXCIxMjM0XCJcbiAgICAgICAgICAgICAgdyA9IGFzc2lnbihCW0ErK10sIHMpXG4gICAgICAgICAgICB9IGVsc2UgaWYgKEJbQSArIDFdID09PSAnLicgfHwgQltBXSA9PT0gJy4nKSB7IC8vIENoZWNrIGlmIGl0J3MgYSBkZWNpbWFsIG51bWJlclxuICAgICAgICAgICAgICBpZiAoQltBXSAhPT0gJy4nKSB7IC8vIEhhbmRsZSAwLjUgYW5kIC41XG4gICAgICAgICAgICAgICAgdiA9IGFzc2lnbihCW0ErK10sIHMpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgQSsrXG5cbiAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGRlY2ltYWwgcGxhY2VzXG4gICAgICAgICAgICAgIGlmIChBICsgMSA9PT0gQi5sZW5ndGggfHwgQltBICsgMV0gPT09ICcoJyAmJiBCW0EgKyAzXSA9PT0gJyknIHx8IEJbQSArIDFdID09PSBcIidcIiAmJiBCW0EgKyAzXSA9PT0gXCInXCIpIHtcbiAgICAgICAgICAgICAgICB3ID0gYXNzaWduKEJbQV0sIHMpXG4gICAgICAgICAgICAgICAgeSA9IE1hdGgucG93KDEwLCBCW0FdLmxlbmd0aClcbiAgICAgICAgICAgICAgICBBKytcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIENoZWNrIGZvciByZXBlYXRpbmcgcGxhY2VzXG4gICAgICAgICAgICAgIGlmIChCW0FdID09PSAnKCcgJiYgQltBICsgMl0gPT09ICcpJyB8fCBCW0FdID09PSBcIidcIiAmJiBCW0EgKyAyXSA9PT0gXCInXCIpIHtcbiAgICAgICAgICAgICAgICB4ID0gYXNzaWduKEJbQSArIDFdLCBzKVxuICAgICAgICAgICAgICAgIHogPSBNYXRoLnBvdygxMCwgQltBICsgMV0ubGVuZ3RoKSAtIDFcbiAgICAgICAgICAgICAgICBBICs9IDNcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChCW0EgKyAxXSA9PT0gJy8nIHx8IEJbQSArIDFdID09PSAnOicpIHsgLy8gQ2hlY2sgZm9yIGEgc2ltcGxlIGZyYWN0aW9uIFwiMTIzLzQ1NlwiIG9yIFwiMTIzOjQ1NlwiXG4gICAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBXSwgcylcbiAgICAgICAgICAgICAgeSA9IGFzc2lnbihCW0EgKyAyXSwgMSlcbiAgICAgICAgICAgICAgQSArPSAzXG4gICAgICAgICAgICB9IGVsc2UgaWYgKEJbQSArIDNdID09PSAnLycgJiYgQltBICsgMV0gPT09ICcgJykgeyAvLyBDaGVjayBmb3IgYSBjb21wbGV4IGZyYWN0aW9uIFwiMTIzIDEvMlwiXG4gICAgICAgICAgICAgIHYgPSBhc3NpZ24oQltBXSwgcylcbiAgICAgICAgICAgICAgdyA9IGFzc2lnbihCW0EgKyAyXSwgcylcbiAgICAgICAgICAgICAgeSA9IGFzc2lnbihCW0EgKyA0XSwgMSlcbiAgICAgICAgICAgICAgQSArPSA1XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChCLmxlbmd0aCA8PSBBKSB7IC8vIENoZWNrIGZvciBtb3JlIHRva2VucyBvbiB0aGUgc3RhY2tcbiAgICAgICAgICAgICAgZCA9IHkgKiB6XG4gICAgICAgICAgICAgIHMgPSAvKiB2b2lkICovXG4gICAgICAgICAgICAgICAgICAgIG4gPSB4ICsgZCAqIHYgKyB6ICogd1xuICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgLyogRmFsbCB0aHJvdWdoIG9uIGVycm9yICovXG4gICAgICAgICAgfVxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvd0ludmFsaWRQYXJhbSgpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGQgPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IERpdmlzaW9uQnlaZXJvKClcbiAgICAgIH1cblxuICAgICAgUC5zID0gcyA8IDAgPyAtMSA6IDFcbiAgICAgIFAubiA9IE1hdGguYWJzKG4pXG4gICAgICBQLmQgPSBNYXRoLmFicyhkKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vZHBvdyAoYiwgZSwgbSkge1xuICAgICAgdmFyIHIgPSAxXG4gICAgICBmb3IgKDsgZSA+IDA7IGIgPSAoYiAqIGIpICUgbSwgZSA+Pj0gMSkge1xuICAgICAgICBpZiAoZSAmIDEpIHtcbiAgICAgICAgICByID0gKHIgKiBiKSAlIG1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjeWNsZUxlbiAobiwgZCkge1xuICAgICAgZm9yICg7IGQgJSAyID09PSAwO1xuICAgICAgICBkIC89IDIpIHtcbiAgICAgIH1cblxuICAgICAgZm9yICg7IGQgJSA1ID09PSAwO1xuICAgICAgICBkIC89IDUpIHtcbiAgICAgIH1cblxuICAgICAgaWYgKGQgPT09IDEpIC8vIENhdGNoIG5vbi1jeWNsaWMgbnVtYmVyc1xuICAgICAgeyByZXR1cm4gMCB9XG5cbiAgICAgIC8vIElmIHdlIHdvdWxkIGxpa2UgdG8gY29tcHV0ZSByZWFsbHkgbGFyZ2UgbnVtYmVycyBxdWlja2VyLCB3ZSBjb3VsZCBtYWtlIHVzZSBvZiBGZXJtYXQncyBsaXR0bGUgdGhlb3JlbTpcbiAgICAgIC8vIDEwXihkLTEpICUgZCA9PSAxXG4gICAgICAvLyBIb3dldmVyLCB3ZSBkb24ndCBuZWVkIHN1Y2ggbGFyZ2UgbnVtYmVycyBhbmQgTUFYX0NZQ0xFX0xFTiBzaG91bGQgYmUgdGhlIGNhcHN0b25lLFxuICAgICAgLy8gYXMgd2Ugd2FudCB0byB0cmFuc2xhdGUgdGhlIG51bWJlcnMgdG8gc3RyaW5ncy5cblxuICAgICAgdmFyIHJlbSA9IDEwICUgZFxuICAgICAgdmFyIHQgPSAxXG5cbiAgICAgIGZvciAoOyByZW0gIT09IDE7IHQrKykge1xuICAgICAgICByZW0gPSByZW0gKiAxMCAlIGRcblxuICAgICAgICBpZiAodCA+IE1BWF9DWUNMRV9MRU4pIHsgcmV0dXJuIDAgfSAvLyBSZXR1cm5pbmcgMCBoZXJlIG1lYW5zIHRoYXQgd2UgZG9uJ3QgcHJpbnQgaXQgYXMgYSBjeWNsaWMgbnVtYmVyLiBJdCdzIGxpa2VseSB0aGF0IHRoZSBhbnN3ZXIgaXMgYGQtMWBcbiAgICAgIH1cbiAgICAgIHJldHVybiB0XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3ljbGVTdGFydCAobiwgZCwgbGVuKSB7XG4gICAgICB2YXIgcmVtMSA9IDFcbiAgICAgIHZhciByZW0yID0gbW9kcG93KDEwLCBsZW4sIGQpXG5cbiAgICAgIGZvciAodmFyIHQgPSAwOyB0IDwgMzAwOyB0KyspIHsgLy8gcyA8IH5sb2cxMChOdW1iZXIuTUFYX1ZBTFVFKVxuICAgICAgLy8gU29sdmUgMTBecyA9PSAxMF4ocyt0KSAobW9kIGQpXG5cbiAgICAgICAgaWYgKHJlbTEgPT09IHJlbTIpIHsgcmV0dXJuIHQgfVxuXG4gICAgICAgIHJlbTEgPSByZW0xICogMTAgJSBkXG4gICAgICAgIHJlbTIgPSByZW0yICogMTAgJSBkXG4gICAgICB9XG4gICAgICByZXR1cm4gMFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdjZCAoYSwgYikge1xuICAgICAgaWYgKCFhKSB7IHJldHVybiBiIH1cbiAgICAgIGlmICghYikgeyByZXR1cm4gYSB9XG5cbiAgICAgIHdoaWxlICgxKSB7XG4gICAgICAgIGEgJT0gYlxuICAgICAgICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICAgICAgICBiICU9IGFcbiAgICAgICAgaWYgKCFiKSB7IHJldHVybiBhIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAqIE1vZHVsZSBjb25zdHJ1Y3RvclxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtudW1iZXJ8RnJhY3Rpb249fSBhXG4gICAqIEBwYXJhbSB7bnVtYmVyPX0gYlxuICAgKi9cbiAgICBmdW5jdGlvbiBGcmFjdGlvbiAoYSwgYikge1xuICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZyYWN0aW9uKSkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKGEsIGIpXG4gICAgICB9XG5cbiAgICAgIHBhcnNlKGEsIGIpXG5cbiAgICAgIGlmIChGcmFjdGlvbi5SRURVQ0UpIHtcbiAgICAgICAgYSA9IGdjZChQLmQsIFAubikgLy8gQWJ1c2UgYVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYSA9IDFcbiAgICAgIH1cblxuICAgICAgdGhpcy5zID0gUC5zXG4gICAgICB0aGlzLm4gPSBQLm4gLyBhXG4gICAgICB0aGlzLmQgPSBQLmQgLyBhXG4gICAgfVxuXG4gICAgLyoqXG4gICAqIEJvb2xlYW4gZ2xvYmFsIHZhcmlhYmxlIHRvIGJlIGFibGUgdG8gZGlzYWJsZSBhdXRvbWF0aWMgcmVkdWN0aW9uIG9mIHRoZSBmcmFjdGlvblxuICAgKlxuICAgKi9cbiAgICBGcmFjdGlvbi5SRURVQ0UgPSAxXG5cbiAgICBGcmFjdGlvbi5wcm90b3R5cGUgPSB7XG5cbiAgICAgIHM6IDEsXG4gICAgICBuOiAwLFxuICAgICAgZDogMSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgYWJzb2x1dGUgdmFsdWVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oLTQpLmFicygpID0+IDRcbiAgICAgKiovXG4gICAgICBhYnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzLm4sIHRoaXMuZClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIEludmVydHMgdGhlIHNpZ24gb2YgdGhlIGN1cnJlbnQgZnJhY3Rpb25cbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oLTQpLm5lZygpID0+IDRcbiAgICAgKiovXG4gICAgICBuZWc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbigtdGhpcy5zICogdGhpcy5uLCB0aGlzLmQpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBBZGRzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKHtuOiAyLCBkOiAzfSkuYWRkKFwiMTQuOVwiKSA9PiA0NjcgLyAzMFxuICAgICAqKi9cbiAgICAgIGFkZDogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICB0aGlzLnMgKiB0aGlzLm4gKiBQLmQgKyBQLnMgKiB0aGlzLmQgKiBQLm4sXG4gICAgICAgICAgdGhpcy5kICogUC5kXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFN1YnRyYWN0cyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbih7bjogMiwgZDogM30pLmFkZChcIjE0LjlcIikgPT4gLTQyNyAvIDMwXG4gICAgICoqL1xuICAgICAgc3ViOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIHRoaXMubiAqIFAuZCAtIFAucyAqIHRoaXMuZCAqIFAubixcbiAgICAgICAgICB0aGlzLmQgKiBQLmRcbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogTXVsdGlwbGllcyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIi0xNy4oMzQ1KVwiKS5tdWwoMykgPT4gNTc3NiAvIDExMVxuICAgICAqKi9cbiAgICAgIG11bDogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICB0aGlzLnMgKiBQLnMgKiB0aGlzLm4gKiBQLm4sXG4gICAgICAgICAgdGhpcy5kICogUC5kXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIERpdmlkZXMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCItMTcuKDM0NSlcIikuaW52ZXJzZSgpLmRpdigzKVxuICAgICAqKi9cbiAgICAgIGRpdjogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICB0aGlzLnMgKiBQLnMgKiB0aGlzLm4gKiBQLmQsXG4gICAgICAgICAgdGhpcy5kICogUC5uXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENsb25lcyB0aGUgYWN0dWFsIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIi0xNy4oMzQ1KVwiKS5jbG9uZSgpXG4gICAgICoqL1xuICAgICAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgbW9kdWxvIG9mIHR3byByYXRpb25hbCBudW1iZXJzIC0gYSBtb3JlIHByZWNpc2UgZm1vZFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5tb2QoWzcsIDhdKSA9PiAoMTMvMykgJSAoNy84KSA9ICg1LzYpXG4gICAgICoqL1xuICAgICAgbW9kOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzLnMgKiB0aGlzLm4gJSB0aGlzLmQsIDEpXG4gICAgICAgIH1cblxuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICBpZiAoUC5uID09PSAwICYmIHRoaXMuZCA9PT0gMCkge1xuICAgICAgICAgIEZyYWN0aW9uKDAsIDApIC8vIFRocm93IERpdmlzaW9uQnlaZXJvXG4gICAgICAgIH1cblxuICAgICAgICAvKlxuICAgICAgICogRmlyc3Qgc2lsbHkgYXR0ZW1wdCwga2luZGEgc2xvd1xuICAgICAgICpcbiAgICAgICByZXR1cm4gdGhhdFtcInN1YlwiXSh7XG4gICAgICAgXCJuXCI6IG51bVtcIm5cIl0gKiBNYXRoLmZsb29yKCh0aGlzLm4gLyB0aGlzLmQpIC8gKG51bS5uIC8gbnVtLmQpKSxcbiAgICAgICBcImRcIjogbnVtW1wiZFwiXSxcbiAgICAgICBcInNcIjogdGhpc1tcInNcIl1cbiAgICAgICB9KTsgKi9cblxuICAgICAgICAvKlxuICAgICAgICogTmV3IGF0dGVtcHQ6IGExIC8gYjEgPSBhMiAvIGIyICogcSArIHJcbiAgICAgICAqID0+IGIyICogYTEgPSBhMiAqIGIxICogcSArIGIxICogYjIgKiByXG4gICAgICAgKiA9PiAoYjIgKiBhMSAlIGEyICogYjEpIC8gKGIxICogYjIpXG4gICAgICAgKi9cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICB0aGlzLnMgKiAoUC5kICogdGhpcy5uKSAlIChQLm4gKiB0aGlzLmQpLFxuICAgICAgICAgIFAuZCAqIHRoaXMuZFxuICAgICAgICApXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmcmFjdGlvbmFsIGdjZCBvZiB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbig1LDgpLmdjZCgzLDcpID0+IDEvNTZcbiAgICAgKi9cbiAgICAgIGdjZDogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcblxuICAgICAgICAvLyBnY2QoYSAvIGIsIGMgLyBkKSA9IGdjZChhLCBjKSAvIGxjbShiLCBkKVxuXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oZ2NkKFAubiwgdGhpcy5uKSAqIGdjZChQLmQsIHRoaXMuZCksIFAuZCAqIHRoaXMuZClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZyYWN0aW9uYWwgbGNtIG9mIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDUsOCkubGNtKDMsNykgPT4gMTVcbiAgICAgKi9cbiAgICAgIGxjbTogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcblxuICAgICAgICAvLyBsY20oYSAvIGIsIGMgLyBkKSA9IGxjbShhLCBjKSAvIGdjZChiLCBkKVxuXG4gICAgICAgIGlmIChQLm4gPT09IDAgJiYgdGhpcy5uID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbigpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihQLm4gKiB0aGlzLm4sIGdjZChQLm4sIHRoaXMubikgKiBnY2QoUC5kLCB0aGlzLmQpKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgY2VpbCBvZiBhIHJhdGlvbmFsIG51bWJlclxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5jZWlsKCkgPT4gKDUgLyAxKVxuICAgICAqKi9cbiAgICAgIGNlaWw6IGZ1bmN0aW9uIChwbGFjZXMpIHtcbiAgICAgICAgcGxhY2VzID0gTWF0aC5wb3coMTAsIHBsYWNlcyB8fCAwKVxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGguY2VpbChwbGFjZXMgKiB0aGlzLnMgKiB0aGlzLm4gLyB0aGlzLmQpLCBwbGFjZXMpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmbG9vciBvZiBhIHJhdGlvbmFsIG51bWJlclxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5mbG9vcigpID0+ICg0IC8gMSlcbiAgICAgKiovXG4gICAgICBmbG9vcjogZnVuY3Rpb24gKHBsYWNlcykge1xuICAgICAgICBwbGFjZXMgPSBNYXRoLnBvdygxMCwgcGxhY2VzIHx8IDApXG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5mbG9vcihwbGFjZXMgKiB0aGlzLnMgKiB0aGlzLm4gLyB0aGlzLmQpLCBwbGFjZXMpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBSb3VuZHMgYSByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLnJvdW5kKCkgPT4gKDQgLyAxKVxuICAgICAqKi9cbiAgICAgIHJvdW5kOiBmdW5jdGlvbiAocGxhY2VzKSB7XG4gICAgICAgIHBsYWNlcyA9IE1hdGgucG93KDEwLCBwbGFjZXMgfHwgMClcblxuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLnJvdW5kKHBsYWNlcyAqIHRoaXMucyAqIHRoaXMubiAvIHRoaXMuZCksIHBsYWNlcylcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGludmVyc2Ugb2YgdGhlIGZyYWN0aW9uLCBtZWFucyBudW1lcmF0b3IgYW5kIGRlbnVtZXJhdG9yIGFyZSBleGNoYW5nZWRcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oWy0zLCA0XSkuaW52ZXJzZSgpID0+IC00IC8gM1xuICAgICAqKi9cbiAgICAgIGludmVyc2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzLnMgKiB0aGlzLmQsIHRoaXMubilcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZyYWN0aW9uIHRvIHNvbWUgaW50ZWdlciBleHBvbmVudFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigtMSwyKS5wb3coLTMpID0+IC04XG4gICAgICovXG4gICAgICBwb3c6IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIGlmIChtIDwgMCkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5wb3codGhpcy5zICogdGhpcy5kLCAtbSksIE1hdGgucG93KHRoaXMubiwgLW0pKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5wb3codGhpcy5zICogdGhpcy5uLCBtKSwgTWF0aC5wb3codGhpcy5kLCBtKSlcbiAgICAgICAgfVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdHdvIHJhdGlvbmFsIG51bWJlcnMgYXJlIHRoZSBzYW1lXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDE5LjYpLmVxdWFscyhbOTgsIDVdKTtcbiAgICAgKiovXG4gICAgICBlcXVhbHM6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiB0aGlzLnMgKiB0aGlzLm4gKiBQLmQgPT09IFAucyAqIFAubiAqIHRoaXMuZCAvLyBTYW1lIGFzIGNvbXBhcmUoKSA9PT0gMFxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdHdvIHJhdGlvbmFsIG51bWJlcnMgYXJlIHRoZSBzYW1lXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDE5LjYpLmVxdWFscyhbOTgsIDVdKTtcbiAgICAgKiovXG4gICAgICBjb21wYXJlOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICB2YXIgdCA9ICh0aGlzLnMgKiB0aGlzLm4gKiBQLmQgLSBQLnMgKiBQLm4gKiB0aGlzLmQpXG4gICAgICAgIHJldHVybiAodCA+IDApIC0gKHQgPCAwKVxuICAgICAgfSxcblxuICAgICAgc2ltcGxpZnk6IGZ1bmN0aW9uIChlcHMpIHtcbiAgICAgIC8vIEZpcnN0IG5haXZlIGltcGxlbWVudGF0aW9uLCBuZWVkcyBpbXByb3ZlbWVudFxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNvbnQgPSB0aGlzLmFicygpLnRvQ29udGludWVkKClcblxuICAgICAgICBlcHMgPSBlcHMgfHwgMC4wMDFcblxuICAgICAgICBmdW5jdGlvbiByZWMgKGEpIHtcbiAgICAgICAgICBpZiAoYS5sZW5ndGggPT09IDEpIHsgcmV0dXJuIG5ldyBGcmFjdGlvbihhWzBdKSB9XG4gICAgICAgICAgcmV0dXJuIHJlYyhhLnNsaWNlKDEpKS5pbnZlcnNlKCkuYWRkKGFbMF0pXG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbnQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB2YXIgdG1wID0gcmVjKGNvbnQuc2xpY2UoMCwgaSArIDEpKVxuICAgICAgICAgIGlmICh0bXAuc3ViKHRoaXMuYWJzKCkpLmFicygpLnZhbHVlT2YoKSA8IGVwcykge1xuICAgICAgICAgICAgcmV0dXJuIHRtcC5tdWwodGhpcy5zKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdHdvIHJhdGlvbmFsIG51bWJlcnMgYXJlIGRpdmlzaWJsZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigxOS42KS5kaXZpc2libGUoMS41KTtcbiAgICAgKi9cbiAgICAgIGRpdmlzaWJsZTogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuICEoIShQLm4gKiB0aGlzLmQpIHx8ICgodGhpcy5uICogUC5kKSAlIChQLm4gKiB0aGlzLmQpKSlcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBkZWNpbWFsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBmcmFjdGlvblxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEwMC4nOTE4MjMnXCIpLnZhbHVlT2YoKSA9PiAxMDAuOTE4MjM5MTgyMzkxODNcbiAgICAgKiovXG4gICAgICB2YWx1ZU9mOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnMgKiB0aGlzLm4gLyB0aGlzLmRcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBzdHJpbmctZnJhY3Rpb24gcmVwcmVzZW50YXRpb24gb2YgYSBGcmFjdGlvbiBvYmplY3RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxLiczJ1wiKS50b0ZyYWN0aW9uKCkgPT4gXCI0IDEvM1wiXG4gICAgICoqL1xuICAgICAgdG9GcmFjdGlvbjogZnVuY3Rpb24gKGV4Y2x1ZGVXaG9sZSkge1xuICAgICAgICB2YXIgd2hvbGU7IHZhciBzdHIgPSAnJ1xuICAgICAgICB2YXIgbiA9IHRoaXMublxuICAgICAgICB2YXIgZCA9IHRoaXMuZFxuICAgICAgICBpZiAodGhpcy5zIDwgMCkge1xuICAgICAgICAgIHN0ciArPSAnLSdcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkID09PSAxKSB7XG4gICAgICAgICAgc3RyICs9IG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZXhjbHVkZVdob2xlICYmICh3aG9sZSA9IE1hdGguZmxvb3IobiAvIGQpKSA+IDApIHtcbiAgICAgICAgICAgIHN0ciArPSB3aG9sZVxuICAgICAgICAgICAgc3RyICs9ICcgJ1xuICAgICAgICAgICAgbiAlPSBkXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc3RyICs9IG5cbiAgICAgICAgICBzdHIgKz0gJy8nXG4gICAgICAgICAgc3RyICs9IGRcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RyXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgbGF0ZXggcmVwcmVzZW50YXRpb24gb2YgYSBGcmFjdGlvbiBvYmplY3RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxLiczJ1wiKS50b0xhdGV4KCkgPT4gXCJcXGZyYWN7NH17M31cIlxuICAgICAqKi9cbiAgICAgIHRvTGF0ZXg6IGZ1bmN0aW9uIChleGNsdWRlV2hvbGUpIHtcbiAgICAgICAgdmFyIHdob2xlOyB2YXIgc3RyID0gJydcbiAgICAgICAgdmFyIG4gPSB0aGlzLm5cbiAgICAgICAgdmFyIGQgPSB0aGlzLmRcbiAgICAgICAgaWYgKHRoaXMucyA8IDApIHtcbiAgICAgICAgICBzdHIgKz0gJy0nXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZCA9PT0gMSkge1xuICAgICAgICAgIHN0ciArPSBuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGV4Y2x1ZGVXaG9sZSAmJiAod2hvbGUgPSBNYXRoLmZsb29yKG4gLyBkKSkgPiAwKSB7XG4gICAgICAgICAgICBzdHIgKz0gd2hvbGVcbiAgICAgICAgICAgIG4gJT0gZFxuICAgICAgICAgIH1cblxuICAgICAgICAgIHN0ciArPSAnXFxcXGZyYWN7J1xuICAgICAgICAgIHN0ciArPSBuXG4gICAgICAgICAgc3RyICs9ICd9eydcbiAgICAgICAgICBzdHIgKz0gZFxuICAgICAgICAgIHN0ciArPSAnfSdcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RyXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIGNvbnRpbnVlZCBmcmFjdGlvbiBlbGVtZW50c1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjcvOFwiKS50b0NvbnRpbnVlZCgpID0+IFswLDEsN11cbiAgICAgKi9cbiAgICAgIHRvQ29udGludWVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0XG4gICAgICAgIHZhciBhID0gdGhpcy5uXG4gICAgICAgIHZhciBiID0gdGhpcy5kXG4gICAgICAgIHZhciByZXMgPSBbXVxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gcmVzXG4gICAgICAgIH1cblxuICAgICAgICBkbyB7XG4gICAgICAgICAgcmVzLnB1c2goTWF0aC5mbG9vcihhIC8gYikpXG4gICAgICAgICAgdCA9IGEgJSBiXG4gICAgICAgICAgYSA9IGJcbiAgICAgICAgICBiID0gdFxuICAgICAgICB9IHdoaWxlIChhICE9PSAxKVxuXG4gICAgICAgIHJldHVybiByZXNcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYSBmcmFjdGlvbiB3aXRoIGFsbCBkaWdpdHNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxMDAuJzkxODIzJ1wiKS50b1N0cmluZygpID0+IFwiMTAwLig5MTgyMylcIlxuICAgICAqKi9cbiAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoZGVjKSB7XG4gICAgICAgIHZhciBnXG4gICAgICAgIHZhciBOID0gdGhpcy5uXG4gICAgICAgIHZhciBEID0gdGhpcy5kXG5cbiAgICAgICAgaWYgKGlzTmFOKE4pIHx8IGlzTmFOKEQpKSB7XG4gICAgICAgICAgcmV0dXJuICdOYU4nXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIUZyYWN0aW9uLlJFRFVDRSkge1xuICAgICAgICAgIGcgPSBnY2QoTiwgRClcbiAgICAgICAgICBOIC89IGdcbiAgICAgICAgICBEIC89IGdcbiAgICAgICAgfVxuXG4gICAgICAgIGRlYyA9IGRlYyB8fCAxNSAvLyAxNSA9IGRlY2ltYWwgcGxhY2VzIHdoZW4gbm8gcmVwaXRhdGlvblxuXG4gICAgICAgIHZhciBjeWNMZW4gPSBjeWNsZUxlbihOLCBEKSAvLyBDeWNsZSBsZW5ndGhcbiAgICAgICAgdmFyIGN5Y09mZiA9IGN5Y2xlU3RhcnQoTiwgRCwgY3ljTGVuKSAvLyBDeWNsZSBzdGFydFxuXG4gICAgICAgIHZhciBzdHIgPSB0aGlzLnMgPT09IC0xID8gJy0nIDogJydcblxuICAgICAgICBzdHIgKz0gTiAvIEQgfCAwXG5cbiAgICAgICAgTiAlPSBEXG4gICAgICAgIE4gKj0gMTBcblxuICAgICAgICBpZiAoTikgeyBzdHIgKz0gJy4nIH1cblxuICAgICAgICBpZiAoY3ljTGVuKSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IGN5Y09mZjsgaS0tOykge1xuICAgICAgICAgICAgc3RyICs9IE4gLyBEIHwgMFxuICAgICAgICAgICAgTiAlPSBEXG4gICAgICAgICAgICBOICo9IDEwXG4gICAgICAgICAgfVxuICAgICAgICAgIHN0ciArPSAnKCdcbiAgICAgICAgICBmb3IgKHZhciBpID0gY3ljTGVuOyBpLS07KSB7XG4gICAgICAgICAgICBzdHIgKz0gTiAvIEQgfCAwXG4gICAgICAgICAgICBOICU9IERcbiAgICAgICAgICAgIE4gKj0gMTBcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RyICs9ICcpJ1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZvciAodmFyIGkgPSBkZWM7IE4gJiYgaS0tOykge1xuICAgICAgICAgICAgc3RyICs9IE4gLyBEIHwgMFxuICAgICAgICAgICAgTiAlPSBEXG4gICAgICAgICAgICBOICo9IDEwXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHJcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHVuZGVmaW5lZCA9PT0gJ2Z1bmN0aW9uJyAmJiB1bmRlZmluZWQuYW1kKSB7XG4gICAgICB1bmRlZmluZWQoW10sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIEZyYWN0aW9uXG4gICAgICB9KVxuICAgIH0gZWxzZSBpZiAoJ29iamVjdCcgPT09ICdvYmplY3QnKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pXG4gICAgICBGcmFjdGlvbi5kZWZhdWx0ID0gRnJhY3Rpb25cbiAgICAgIEZyYWN0aW9uLkZyYWN0aW9uID0gRnJhY3Rpb25cbiAgICAgIG1vZHVsZS5leHBvcnRzID0gRnJhY3Rpb25cbiAgICB9IGVsc2Uge1xuICAgICAgcm9vdC5GcmFjdGlvbiA9IEZyYWN0aW9uXG4gICAgfVxuICB9KShjb21tb25qc0hlbHBlcnMuY29tbW9uanNHbG9iYWwpXG59KVxuXG5leHBvcnQgZGVmYXVsdCAvKiBAX19QVVJFX18gKi9jb21tb25qc0hlbHBlcnMuZ2V0RGVmYXVsdEV4cG9ydEZyb21DanMoZnJhY3Rpb24pXG5leHBvcnQgeyBmcmFjdGlvbiBhcyBfX21vZHVsZUV4cG9ydHMgfVxuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgTW9ub21pYWwge1xuICBjb25zdHJ1Y3RvciAoYywgdnMpIHtcbiAgICBpZiAoIWlzTmFOKGMpICYmIHZzIGluc3RhbmNlb2YgTWFwKSB7XG4gICAgICB0aGlzLmMgPSBjXG4gICAgICB0aGlzLnZzID0gdnNcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBjID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5pbml0U3RyKGMpXG4gICAgfSBlbHNlIGlmICghaXNOYU4oYykpIHtcbiAgICAgIHRoaXMuYyA9IGNcbiAgICAgIHRoaXMudnMgPSBuZXcgTWFwKClcbiAgICB9IGVsc2UgeyAvLyBkZWZhdWx0IGFzIGEgdGVzdDogNHheMnlcbiAgICAgIHRoaXMuYyA9IDRcbiAgICAgIHRoaXMudnMgPSBuZXcgTWFwKFtbJ3gnLCAyXSwgWyd5JywgMV1dKVxuICAgIH1cbiAgfVxuXG4gIGNsb25lICgpIHtcbiAgICBjb25zdCB2cyA9IG5ldyBNYXAodGhpcy52cylcbiAgICByZXR1cm4gbmV3IE1vbm9taWFsKHRoaXMuYywgdnMpXG4gIH1cblxuICBtdWwgKHRoYXQpIHtcbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IE1vbm9taWFsKHRoYXQpXG4gICAgfVxuICAgIGNvbnN0IGMgPSB0aGlzLmMgKiB0aGF0LmNcbiAgICBsZXQgdnMgPSBuZXcgTWFwKClcbiAgICB0aGlzLnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKHRoYXQudnMuaGFzKHZhcmlhYmxlKSkge1xuICAgICAgICB2cy5zZXQodmFyaWFibGUsIHRoaXMudnMuZ2V0KHZhcmlhYmxlKSArIHRoYXQudnMuZ2V0KHZhcmlhYmxlKSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZzLnNldCh2YXJpYWJsZSwgdGhpcy52cy5nZXQodmFyaWFibGUpKVxuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGF0LnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKCF2cy5oYXModmFyaWFibGUpKSB7XG4gICAgICAgIHZzLnNldCh2YXJpYWJsZSwgdGhhdC52cy5nZXQodmFyaWFibGUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgdnMgPSBuZXcgTWFwKFsuLi52cy5lbnRyaWVzKCldLnNvcnQoKSlcbiAgICByZXR1cm4gbmV3IE1vbm9taWFsKGMsIHZzKVxuICB9XG5cbiAgdG9MYXRleCAoKSB7XG4gICAgaWYgKHRoaXMudnMuc2l6ZSA9PT0gMCkgcmV0dXJuIHRoaXMuYy50b1N0cmluZygpXG4gICAgbGV0IHN0ciA9IHRoaXMuYyA9PT0gMSA/ICcnXG4gICAgICA6IHRoaXMuYyA9PT0gLTEgPyAnLSdcbiAgICAgICAgOiB0aGlzLmMudG9TdHJpbmcoKVxuICAgIHRoaXMudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAoaW5kZXggPT09IDEpIHtcbiAgICAgICAgc3RyICs9IHZhcmlhYmxlXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgKz0gdmFyaWFibGUgKyAnXicgKyBpbmRleFxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIHN0clxuICB9XG5cbiAgc29ydCAoKSB7XG4gICAgLy8gc29ydHMgKG1vZGlmaWVzIG9iamVjdClcbiAgICB0aGlzLnZzID0gbmV3IE1hcChbLi4udGhpcy52cy5lbnRyaWVzKCldLnNvcnQoKSlcbiAgfVxuXG4gIGNsZWFuWmVyb3MgKCkge1xuICAgIHRoaXMudnMuZm9yRWFjaCgoaWR4LCB2KSA9PiB7XG4gICAgICBpZiAoaWR4ID09PSAwKSB0aGlzLnZzLmRlbGV0ZSh2KVxuICAgIH0pXG4gIH1cblxuICBsaWtlICh0aGF0KSB7XG4gICAgLy8gcmV0dXJuIHRydWUgaWYgbGlrZSB0ZXJtcywgZmFsc2UgaWYgb3RoZXJ3aXNlXG4gICAgLy8gbm90IHRoZSBtb3N0IGVmZmljaWVudCBhdCB0aGUgbW9tZW50LCBidXQgZ29vZCBlbm91Z2guXG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIE1vbm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBNb25vbWlhbCh0aGF0KVxuICAgIH1cblxuICAgIGxldCBsaWtlID0gdHJ1ZVxuICAgIHRoaXMudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAoIXRoYXQudnMuaGFzKHZhcmlhYmxlKSB8fCB0aGF0LnZzLmdldCh2YXJpYWJsZSkgIT09IGluZGV4KSB7XG4gICAgICAgIGxpa2UgPSBmYWxzZVxuICAgICAgfVxuICAgIH0pXG4gICAgdGhhdC52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICghdGhpcy52cy5oYXModmFyaWFibGUpIHx8IHRoaXMudnMuZ2V0KHZhcmlhYmxlKSAhPT0gaW5kZXgpIHtcbiAgICAgICAgbGlrZSA9IGZhbHNlXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gbGlrZVxuICB9XG5cbiAgYWRkICh0aGF0LCBjaGVja0xpa2UpIHtcbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IE1vbm9taWFsKHRoYXQpXG4gICAgfVxuICAgIC8vIGFkZHMgdHdvIGNvbXBhdGlibGUgbW9ub21pYWxzXG4gICAgLy8gY2hlY2tMaWtlIChkZWZhdWx0IHRydWUpIHdpbGwgY2hlY2sgZmlyc3QgaWYgdGhleSBhcmUgbGlrZSBhbmQgdGhyb3cgYW4gZXhjZXB0aW9uXG4gICAgLy8gdW5kZWZpbmVkIGJlaGF2aW91ciBpZiBjaGVja0xpa2UgaXMgZmFsc2VcbiAgICBpZiAoY2hlY2tMaWtlID09PSB1bmRlZmluZWQpIGNoZWNrTGlrZSA9IHRydWVcbiAgICBpZiAoY2hlY2tMaWtlICYmICF0aGlzLmxpa2UodGhhdCkpIHRocm93IG5ldyBFcnJvcignQWRkaW5nIHVubGlrZSB0ZXJtcycpXG4gICAgY29uc3QgYyA9IHRoaXMuYyArIHRoYXQuY1xuICAgIGNvbnN0IHZzID0gdGhpcy52c1xuICAgIHJldHVybiBuZXcgTW9ub21pYWwoYywgdnMpXG4gIH1cblxuICBpbml0U3RyIChzdHIpIHtcbiAgICAvLyBjdXJyZW50bHkgbm8gZXJyb3IgY2hlY2tpbmcgYW5kIGZyYWdpbGVcbiAgICAvLyBUaGluZ3Mgbm90IHRvIHBhc3MgaW46XG4gICAgLy8gIHplcm8gaW5kaWNlc1xuICAgIC8vICBtdWx0aS1jaGFyYWN0ZXIgdmFyaWFibGVzXG4gICAgLy8gIG5lZ2F0aXZlIGluZGljZXNcbiAgICAvLyAgbm9uLWludGVnZXIgY29lZmZpY2llbnRzXG4gICAgY29uc3QgbGVhZCA9IHN0ci5tYXRjaCgvXi0/XFxkKi8pWzBdXG4gICAgY29uc3QgYyA9IGxlYWQgPT09ICcnID8gMVxuICAgICAgOiBsZWFkID09PSAnLScgPyAtMVxuICAgICAgICA6IHBhcnNlSW50KGxlYWQpXG4gICAgbGV0IHZzID0gc3RyLm1hdGNoKC8oW2EtekEtWl0pKFxcXlxcZCspPy9nKVxuICAgIGlmICghdnMpIHZzID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCB2ID0gdnNbaV0uc3BsaXQoJ14nKVxuICAgICAgdlsxXSA9IHZbMV0gPyBwYXJzZUludCh2WzFdKSA6IDFcbiAgICAgIHZzW2ldID0gdlxuICAgIH1cbiAgICB2cyA9IHZzLmZpbHRlcih2ID0+IHZbMV0gIT09IDApXG4gICAgdGhpcy5jID0gY1xuICAgIHRoaXMudnMgPSBuZXcgTWFwKHZzKVxuICB9XG5cbiAgc3RhdGljIHZhciAodikge1xuICAgIC8vIGZhY3RvcnkgZm9yIGEgc2luZ2xlIHZhcmlhYmxlIG1vbm9taWFsXG4gICAgY29uc3QgYyA9IDFcbiAgICBjb25zdCB2cyA9IG5ldyBNYXAoW1t2LCAxXV0pXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbChjLCB2cylcbiAgfVxufVxuIiwiaW1wb3J0IE1vbm9taWFsIGZyb20gJ01vbm9taWFsJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQb2x5bm9taWFsIHtcbiAgY29uc3RydWN0b3IgKHRlcm1zKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGVybXMpICYmICh0ZXJtc1swXSBpbnN0YW5jZW9mIE1vbm9taWFsKSkge1xuICAgICAgdGVybXMubWFwKHQgPT4gdC5jbG9uZSgpKVxuICAgICAgdGhpcy50ZXJtcyA9IHRlcm1zXG4gICAgfSBlbHNlIGlmICghaXNOYU4odGVybXMpKSB7XG4gICAgICB0aGlzLmluaXROdW0odGVybXMpXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGVybXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmluaXRTdHIodGVybXMpXG4gICAgfVxuICB9XG5cbiAgaW5pdFN0ciAoc3RyKSB7XG4gICAgc3RyID0gc3RyLnJlcGxhY2UoL1xcKy0vZywgJy0nKSAvLyBhIGhvcnJpYmxlIGJvZGdlXG4gICAgc3RyID0gc3RyLnJlcGxhY2UoLy0vZywgJystJykgLy8gbWFrZSBuZWdhdGl2ZSB0ZXJtcyBleHBsaWNpdC5cbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvXFxzL2csICcnKSAvLyBzdHJpcCB3aGl0ZXNwYWNlXG4gICAgdGhpcy50ZXJtcyA9IHN0ci5zcGxpdCgnKycpXG4gICAgICAubWFwKHMgPT4gbmV3IE1vbm9taWFsKHMpKVxuICAgICAgLmZpbHRlcih0ID0+IHQuYyAhPT0gMClcbiAgfVxuXG4gIGluaXROdW0gKG4pIHtcbiAgICB0aGlzLnRlcm1zID0gW25ldyBNb25vbWlhbChuKV1cbiAgfVxuXG4gIHRvTGF0ZXggKCkge1xuICAgIGxldCBzdHIgPSAnJ1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50ZXJtcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGkgPiAwICYmIHRoaXMudGVybXNbaV0uYyA+PSAwKSB7XG4gICAgICAgIHN0ciArPSAnKydcbiAgICAgIH1cbiAgICAgIHN0ciArPSB0aGlzLnRlcm1zW2ldLnRvTGF0ZXgoKVxuICAgIH1cbiAgICByZXR1cm4gc3RyXG4gIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuIHRoaXMudG9MYVRlWCgpXG4gIH1cblxuICBjbG9uZSAoKSB7XG4gICAgY29uc3QgdGVybXMgPSB0aGlzLnRlcm1zLm1hcCh0ID0+IHQuY2xvbmUoKSlcbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwodGVybXMpXG4gIH1cblxuICBzaW1wbGlmeSAoKSB7XG4gICAgLy8gY29sbGVjdHMgbGlrZSB0ZXJtcyBhbmQgcmVtb3ZlcyB6ZXJvIHRlcm1zXG4gICAgLy8gZG9lcyBub3QgbW9kaWZ5IG9yaWdpbmFsXG4gICAgLy8gVGhpcyBzZWVtcyBwcm9iYWJseSBpbmVmZmljaWVudCwgZ2l2ZW4gdGhlIGRhdGEgc3RydWN0dXJlXG4gICAgLy8gV291bGQgYmUgYmV0dGVyIHRvIHVzZSBzb21ldGhpbmcgbGlrZSBhIGxpbmtlZCBsaXN0IG1heWJlP1xuICAgIGNvbnN0IHRlcm1zID0gdGhpcy50ZXJtcy5zbGljZSgpXG4gICAgbGV0IG5ld3Rlcm1zID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRlcm1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIXRlcm1zW2ldKSBjb250aW51ZVxuICAgICAgbGV0IG5ld3Rlcm0gPSB0ZXJtc1tpXVxuICAgICAgZm9yIChsZXQgaiA9IGkgKyAxOyBqIDwgdGVybXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKCF0ZXJtc1tqXSkgY29udGludWVcbiAgICAgICAgaWYgKHRlcm1zW2pdLmxpa2UodGVybXNbaV0pKSB7XG4gICAgICAgICAgbmV3dGVybSA9IG5ld3Rlcm0uYWRkKHRlcm1zW2pdKVxuICAgICAgICAgIHRlcm1zW2pdID0gbnVsbFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBuZXd0ZXJtcy5wdXNoKG5ld3Rlcm0pXG4gICAgICB0ZXJtc1tpXSA9IG51bGxcbiAgICB9XG4gICAgbmV3dGVybXMgPSBuZXd0ZXJtcy5maWx0ZXIodCA9PiB0LmMgIT09IDApXG4gICAgcmV0dXJuIG5ldyBQb2x5bm9taWFsKG5ld3Rlcm1zKVxuICB9XG5cbiAgYWRkICh0aGF0LCBzaW1wbGlmeSkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBQb2x5bm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBQb2x5bm9taWFsKHRoYXQpXG4gICAgfVxuICAgIGlmIChzaW1wbGlmeSA9PT0gdW5kZWZpbmVkKSBzaW1wbGlmeSA9IHRydWVcbiAgICBjb25zdCB0ZXJtcyA9IHRoaXMudGVybXMuY29uY2F0KHRoYXQudGVybXMpXG4gICAgbGV0IHJlc3VsdCA9IG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuXG4gICAgaWYgKHNpbXBsaWZ5KSByZXN1bHQgPSByZXN1bHQuc2ltcGxpZnkoKVxuXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG5cbiAgbXVsICh0aGF0LCBzaW1wbGlmeSkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBQb2x5bm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBQb2x5bm9taWFsKHRoYXQpXG4gICAgfVxuICAgIGNvbnN0IHRlcm1zID0gW11cbiAgICBpZiAoc2ltcGxpZnkgPT09IHVuZGVmaW5lZCkgc2ltcGxpZnkgPSB0cnVlXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRlcm1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHRoYXQudGVybXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdGVybXMucHVzaCh0aGlzLnRlcm1zW2ldLm11bCh0aGF0LnRlcm1zW2pdKSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgcmVzdWx0ID0gbmV3IFBvbHlub21pYWwodGVybXMpXG4gICAgaWYgKHNpbXBsaWZ5KSByZXN1bHQgPSByZXN1bHQuc2ltcGxpZnkoKVxuXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG5cbiAgcG93IChuLCBzaW1wbGlmeSkge1xuICAgIGxldCByZXN1bHQgPSB0aGlzXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBuOyBpKyspIHtcbiAgICAgIHJlc3VsdCA9IHJlc3VsdC5tdWwodGhpcylcbiAgICB9XG4gICAgaWYgKHNpbXBsaWZ5KSByZXN1bHQgPSByZXN1bHQuc2ltcGxpZnkoKVxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIHN0YXRpYyB2YXIgKHYpIHtcbiAgICAvLyBmYWN0b3J5IGZvciBhIHNpbmdsZSB2YXJpYWJsZSBwb2x5bm9taWFsXG4gICAgY29uc3QgdGVybXMgPSBbTW9ub21pYWwudmFyKHYpXVxuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbCh0ZXJtcylcbiAgfVxuXG4gIHN0YXRpYyB4ICgpIHtcbiAgICByZXR1cm4gUG9seW5vbWlhbC52YXIoJ3gnKVxuICB9XG5cbiAgc3RhdGljIGNvbnN0IChuKSB7XG4gICAgcmV0dXJuIG5ldyBQb2x5bm9taWFsKG4pXG4gIH1cbn1cbiIsImltcG9ydCB7IEdyYXBoaWNRLCBHcmFwaGljUVZpZXcgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCBGcmFjdGlvbiBmcm9tICd2ZW5kb3IvZnJhY3Rpb24nXG5pbXBvcnQgUG9seW5vbWlhbCBmcm9tICdQb2x5bm9taWFsJ1xuaW1wb3J0IHsgcmFuZEVsZW0sIHJhbmRCZXR3ZWVuLCByYW5kQmV0d2VlbkZpbHRlciwgZ2NkIH0gZnJvbSAndXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBcml0aG1hZ29uUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBjb25zdCBkYXRhID0gbmV3IEFyaXRobWFnb25RRGF0YShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgQXJpdGhtYWdvblFWaWV3KGRhdGEsIG9wdGlvbnMpXG4gICAgc3VwZXIoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgeyByZXR1cm4gJ0NvbXBsZXRlIHRoZSBhcml0aG1hZ29uOicgfVxufVxuXG5Bcml0aG1hZ29uUS5vcHRpb25zU3BlYyA9IFtcbiAge1xuICAgIHRpdGxlOiAnVmVydGljZXMnLFxuICAgIGlkOiAnbicsXG4gICAgdHlwZTogJ2ludCcsXG4gICAgbWluOiAzLFxuICAgIG1heDogMjAsXG4gICAgZGVmYXVsdDogM1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdUeXBlJyxcbiAgICBpZDogJ3R5cGUnLFxuICAgIHR5cGU6ICdzZWxlY3QtZXhjbHVzaXZlJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICB7IHRpdGxlOiAnSW50ZWdlciAoKyknLCBpZDogJ2ludGVnZXItYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0ludGVnZXIgKFxcdTAwZDcpJywgaWQ6ICdpbnRlZ2VyLW11bHRpcGx5JyB9LFxuICAgICAgeyB0aXRsZTogJ0ZyYWN0aW9uICgrKScsIGlkOiAnZnJhY3Rpb24tYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0ZyYWN0aW9uIChcXHUwMGQ3KScsIGlkOiAnZnJhY3Rpb24tbXVsdGlwbHknIH0sXG4gICAgICB7IHRpdGxlOiAnQWxnZWJyYSAoKyknLCBpZDogJ2FsZ2VicmEtYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0FsZ2VicmEgKFxcdTAwZDcpJywgaWQ6ICdhbGdlYnJhLW11bHRpcGx5JyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiAnaW50ZWdlci1hZGQnLFxuICAgIHZlcnRpY2FsOiB0cnVlXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1B1enpsZSB0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgaWQ6ICdwdXpfZGlmZicsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ01pc3NpbmcgZWRnZXMnLCBpZDogJzEnIH0sXG4gICAgICB7IHRpdGxlOiAnTWl4ZWQnLCBpZDogJzInIH0sXG4gICAgICB7IHRpdGxlOiAnTWlzc2luZyB2ZXJ0aWNlcycsIGlkOiAnMycgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogJzEnXG4gIH1cbl1cblxuY2xhc3MgQXJpdGhtYWdvblFEYXRhIC8qIGV4dGVuZHMgR3JhcGhpY1FEYXRhICovIHtcbiAgLy8gVE9ETyBzaW1wbGlmeSBjb25zdHJ1Y3Rvci4gTW92ZSBsb2dpYyBpbnRvIHN0YXRpYyBmYWN0b3J5IG1ldGhvZHNcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICAvLyAxLiBTZXQgcHJvcGVydGllcyBmcm9tIG9wdGlvbnNcbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIG46IDMsIC8vIG51bWJlciBvZiB2ZXJ0aWNlc1xuICAgICAgbWluOiAtMjAsXG4gICAgICBtYXg6IDIwLFxuICAgICAgbnVtX2RpZmY6IDEsIC8vIGNvbXBsZXhpdHkgb2Ygd2hhdCdzIGluIHZlcnRpY2VzL2VkZ2VzXG4gICAgICBwdXpfZGlmZjogMSwgLy8gMSAtIFZlcnRpY2VzIGdpdmVuLCAyIC0gdmVydGljZXMvZWRnZXM7IGdpdmVuIDMgLSBvbmx5IGVkZ2VzXG4gICAgICB0eXBlOiAnaW50ZWdlci1hZGQnIC8vIFt0eXBlXS1bb3BlcmF0aW9uXSB3aGVyZSBbdHlwZV0gPSBpbnRlZ2VyLCAuLi5cbiAgICAgIC8vIGFuZCBbb3BlcmF0aW9uXSA9IGFkZC9tdWx0aXBseVxuICAgIH1cblxuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgdGhpcy5zZXR0aW5ncywgb3B0aW9ucylcbiAgICB0aGlzLnNldHRpbmdzLm51bV9kaWZmID0gdGhpcy5zZXR0aW5ncy5kaWZmaWN1bHR5XG4gICAgdGhpcy5zZXR0aW5ncy5wdXpfZGlmZiA9IHBhcnNlSW50KHRoaXMuc2V0dGluZ3MucHV6X2RpZmYpIC8vISA/IFRoaXMgc2hvdWxkIGhhdmUgYmVlbiBkb25lIHVwc3RyZWFtLi4uXG5cbiAgICB0aGlzLm4gPSB0aGlzLnNldHRpbmdzLm5cbiAgICB0aGlzLnZlcnRpY2VzID0gW11cbiAgICB0aGlzLnNpZGVzID0gW11cblxuICAgIGlmICh0aGlzLnNldHRpbmdzLnR5cGUuZW5kc1dpdGgoJ2FkZCcpKSB7XG4gICAgICB0aGlzLm9wbmFtZSA9ICcrJ1xuICAgICAgdGhpcy5vcCA9ICh4LCB5KSA9PiB4LmFkZCh5KVxuICAgIH0gZWxzZSBpZiAodGhpcy5zZXR0aW5ncy50eXBlLmVuZHNXaXRoKCdtdWx0aXBseScpKSB7XG4gICAgICB0aGlzLm9wbmFtZSA9ICdcXHUwMGQ3J1xuICAgICAgdGhpcy5vcCA9ICh4LCB5KSA9PiB4Lm11bCh5KVxuICAgIH1cblxuICAgIC8vIDIuIEluaXRpYWxpc2UgYmFzZWQgb24gdHlwZVxuICAgIHN3aXRjaCAodGhpcy5zZXR0aW5ncy50eXBlKSB7XG4gICAgICBjYXNlICdpbnRlZ2VyLWFkZCc6XG4gICAgICBjYXNlICdpbnRlZ2VyLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0SW50ZWdlcih0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnZnJhY3Rpb24tYWRkJzpcbiAgICAgICAgdGhpcy5pbml0RnJhY3Rpb25BZGQodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2ZyYWN0aW9uLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0RnJhY3Rpb25NdWx0aXBseSh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnYWxnZWJyYS1hZGQnOlxuICAgICAgICB0aGlzLmluaXRBbGdlYnJhQWRkKHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdhbGdlYnJhLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0QWxnZWJyYU11bHRpcGx5KHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgc3dpdGNoIGRlZmF1bHQnKVxuICAgIH1cblxuICAgIHRoaXMuY2FsY3VsYXRlRWRnZXMoKSAvLyBVc2Ugb3AgZnVuY3Rpb25zIHRvIGZpbGwgaW4gdGhlIGVkZ2VzXG4gICAgdGhpcy5oaWRlTGFiZWxzKHRoaXMuc2V0dGluZ3MucHV6X2RpZmYpIC8vIHNldCBzb21lIHZlcnRpY2VzL2VkZ2VzIGFzIGhpZGRlbiBkZXBlbmRpbmcgb24gZGlmZmljdWx0eVxuICB9XG5cbiAgLyogTWV0aG9kcyBpbml0aWFsaXNpbmcgdmVydGljZXMgKi9cblxuICBpbml0SW50ZWdlciAoc2V0dGluZ3MpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihyYW5kQmV0d2VlbkZpbHRlcihcbiAgICAgICAgICBzZXR0aW5ncy5taW4sXG4gICAgICAgICAgc2V0dGluZ3MubWF4LFxuICAgICAgICAgIHggPT4gKHNldHRpbmdzLnR5cGUuZW5kc1dpdGgoJ2FkZCcpIHx8IHggIT09IDApXG4gICAgICAgICkpLFxuICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEZyYWN0aW9uQWRkIChzZXR0aW5ncykge1xuICAgIC8qIERpZmZpY3VsdHkgc2V0dGluZ3M6XG4gICAgICogMTogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIHNhbWUgZGVub21pbmF0b3IsIG5vIGNhbmNlbGxpbmcgYWZ0ZXIgRE9ORVxuICAgICAqIDI6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBzYW1lIGRlbm9taW5hdG9yLCBubyBjYW5jZWxsbGluZyBhbnN3ZXIgaW1wcm9wZXIgZnJhY3Rpb25cbiAgICAgKiAzOiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggb25lIGRlbm9taW5hdG9yIGEgbXVsdGlwbGUgb2YgYW5vdGhlciwgZ2l2ZXMgcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNDogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIG9uZSBkZW5vbWluYXRvciBhIG11bHRpcGxlIG9mIGFub3RoZXIsIGdpdmVzIGltcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNTogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIGRpZmZlcmVudCBkZW5vbWluYXRvcnMgKG5vdCBjby1wcmltZSksIGdpdmVzIGltcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNjogbWl4ZWQgbnVtYmVyc1xuICAgICAqIDc6IG1peGVkIG51bWJlcnMsIGJpZ2dlciBudW1lcmF0b3JzIGFuZCBkZW5vbWluYXRvcnNcbiAgICAgKiA4OiBtaXhlZCBudW1iZXJzLCBiaWcgaW50ZWdlciBwYXJ0c1xuICAgICAqL1xuXG4gICAgLy8gVE9ETyAtIGFueXRoaW5nIG90aGVyIHRoYW4gZGlmZmljdWx0eSAxLlxuICAgIGNvbnN0IGRpZmYgPSBzZXR0aW5ncy5udW1fZGlmZlxuICAgIGlmIChkaWZmIDwgMykge1xuICAgICAgY29uc3QgZGVuID0gcmFuZEVsZW0oWzUsIDcsIDksIDExLCAxMywgMTddKVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICBjb25zdCBwcmV2bnVtID0gdGhpcy52ZXJ0aWNlc1tpIC0gMV1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbaSAtIDFdLnZhbC5uIDogdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IG5leHRudW0gPSB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dLnZhbC5uIDogdW5kZWZpbmVkXG5cbiAgICAgICAgY29uc3QgbWF4bnVtID1cbiAgICAgICAgICBkaWZmID09PSAyID8gZGVuIC0gMVxuICAgICAgICAgICAgOiBuZXh0bnVtID8gZGVuIC0gTWF0aC5tYXgobmV4dG51bSwgcHJldm51bSlcbiAgICAgICAgICAgICAgOiBwcmV2bnVtID8gZGVuIC0gcHJldm51bVxuICAgICAgICAgICAgICAgIDogZGVuIC0gMVxuXG4gICAgICAgIGNvbnN0IG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKDEsIG1heG51bSwgeCA9PiAoXG4gICAgICAgICAgLy8gRW5zdXJlcyBubyBzaW1wbGlmaW5nIGFmdGVyd2FyZHMgaWYgZGlmZmljdWx0eSBpcyAxXG4gICAgICAgICAgZ2NkKHgsIGRlbikgPT09IDEgJiZcbiAgICAgICAgICAoIXByZXZudW0gfHwgZ2NkKHggKyBwcmV2bnVtLCBkZW4pID09PSAxIHx8IHggKyBwcmV2bnVtID09PSBkZW4pICYmXG4gICAgICAgICAgKCFuZXh0bnVtIHx8IGdjZCh4ICsgbmV4dG51bSwgZGVuKSA9PT0gMSB8fCB4ICsgbmV4dG51bSA9PT0gZGVuKVxuICAgICAgICApKVxuXG4gICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24obnVtLCBkZW4pLFxuICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBkZW5iYXNlID0gcmFuZEVsZW0oXG4gICAgICAgIGRpZmYgPCA3ID8gWzIsIDMsIDVdIDogWzIsIDMsIDQsIDUsIDYsIDcsIDgsIDksIDEwLCAxMV1cbiAgICAgIClcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgY29uc3QgcHJldiA9IHRoaXMudmVydGljZXNbaSAtIDFdXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzW2kgLSAxXS52YWwgOiB1bmRlZmluZWRcbiAgICAgICAgY29uc3QgbmV4dCA9IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl0udmFsIDogdW5kZWZpbmVkXG5cbiAgICAgICAgY29uc3QgbWF4bXVsdGlwbGllciA9IGRpZmYgPCA3ID8gNCA6IDhcblxuICAgICAgICBjb25zdCBtdWx0aXBsaWVyID1cbiAgICAgICAgICBpICUgMiA9PT0gMSB8fCBkaWZmID4gNCA/IHJhbmRCZXR3ZWVuRmlsdGVyKDIsIG1heG11bHRpcGxpZXIsIHggPT5cbiAgICAgICAgICAgICghcHJldiB8fCB4ICE9PSBwcmV2LmQgLyBkZW5iYXNlKSAmJlxuICAgICAgICAgICAgKCFuZXh0IHx8IHggIT09IG5leHQuZCAvIGRlbmJhc2UpXG4gICAgICAgICAgKSA6IDFcblxuICAgICAgICBjb25zdCBkZW4gPSBkZW5iYXNlICogbXVsdGlwbGllclxuXG4gICAgICAgIGxldCBudW1cbiAgICAgICAgaWYgKGRpZmYgPCA2KSB7XG4gICAgICAgICAgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoMSwgZGVuIC0gMSwgeCA9PiAoXG4gICAgICAgICAgICBnY2QoeCwgZGVuKSA9PT0gMSAmJlxuICAgICAgICAgICAgKGRpZmYgPj0gNCB8fCAhcHJldiB8fCBwcmV2LmFkZCh4LCBkZW4pIDw9IDEpICYmXG4gICAgICAgICAgICAoZGlmZiA+PSA0IHx8ICFuZXh0IHx8IG5leHQuYWRkKHgsIGRlbikgPD0gMSlcbiAgICAgICAgICApKVxuICAgICAgICB9IGVsc2UgaWYgKGRpZmYgPCA4KSB7XG4gICAgICAgICAgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoZGVuICsgMSwgZGVuICogNiwgeCA9PiBnY2QoeCwgZGVuKSA9PT0gMSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBudW0gPSByYW5kQmV0d2VlbkZpbHRlcihkZW4gKiAxMCwgZGVuICogMTAwLCB4ID0+IGdjZCh4LCBkZW4pID09PSAxKVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihudW0sIGRlbiksXG4gICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEZyYWN0aW9uTXVsdGlwbHkgKHNldHRpbmdzKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgY29uc3QgZCA9IHJhbmRCZXR3ZWVuKDIsIDEwKVxuICAgICAgY29uc3QgbiA9IHJhbmRCZXR3ZWVuKDEsIGQgLSAxKVxuICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24obiwgZCksXG4gICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0QWxnZWJyYUFkZCAoc2V0dGluZ3MpIHtcbiAgICBjb25zdCBkaWZmID0gc2V0dGluZ3MubnVtX2RpZmZcbiAgICBzd2l0Y2ggKGRpZmYpIHtcbiAgICAgIGNhc2UgMToge1xuICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2YXJpYWJsZSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDI6XG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGlmIChNYXRoLnJhbmRvbSgpIDwgMC41KSB7IC8vIHZhcmlhYmxlICsgY29uc3RhbnRcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgY29uc3RhbnQgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbChjb2VmZiArIHZhcmlhYmxlICsgJysnICsgY29uc3RhbnQpLFxuICAgICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IHZhcmlhYmxlMSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgICAgbGV0IHZhcmlhYmxlMiA9IHZhcmlhYmxlMVxuICAgICAgICAgIHdoaWxlICh2YXJpYWJsZTIgPT09IHZhcmlhYmxlMSkge1xuICAgICAgICAgICAgdmFyaWFibGUyID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBjb2VmZjEgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgY29lZmYyID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYxICsgdmFyaWFibGUxICsgJysnICsgY29lZmYyICsgdmFyaWFibGUyKSxcbiAgICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRBbGdlYnJhTXVsdGlwbHkgKHNldHRpbmdzKSB7XG4gICAgLyogRGlmZmljdWx0eTpcbiAgICAgKiAxOiBBbHRlcm5hdGUgM2Egd2l0aCA0XG4gICAgICogMjogQWxsIHRlcm1zIG9mIHRoZSBmb3JtIG52IC0gdXAgdG8gdHdvIHZhcmlhYmxlc1xuICAgICAqIDM6IEFsbCB0ZXJtcyBvZiB0aGUgZm9ybSBudl5tLiBPbmUgdmFyaWFibGUgb25seVxuICAgICAqIDQ6IEFMbCB0ZXJtcyBvZiB0aGUgZm9ybSBueF5rIHlebCB6XnAuIGssbCxwIDAtM1xuICAgICAqIDU6IEV4cGFuZCBicmFja2V0cyAzKDJ4KzUpXG4gICAgICogNjogRXhwYW5kIGJyYWNrZXRzIDN4KDJ4KzUpXG4gICAgICogNzogRXhwYW5kIGJyYWNrZXRzIDN4XjJ5KDJ4eSs1eV4yKVxuICAgICAqIDg6IEV4cGFuZCBicmFja2V0cyAoeCszKSh4KzIpXG4gICAgICogOTogRXhwYW5kIGJyYWNrZXRzICgyeC0zKSgzeCs0KVxuICAgICAqIDEwOiBFeHBhbmQgYnJhY2tldHMgKDJ4XjItM3grNCkoMngtNSlcbiAgICAgKi9cbiAgICBjb25zdCBkaWZmID0gc2V0dGluZ3MubnVtX2RpZmZcbiAgICBzd2l0Y2ggKGRpZmYpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgIHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IHRlcm0gPSBpICUgMiA9PT0gMCA/IGNvZWZmIDogY29lZmYgKyB2YXJpYWJsZVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDI6IHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUxID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgY29uc3QgdmFyaWFibGUyID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZSA9IHJhbmRFbGVtKFt2YXJpYWJsZTEsIHZhcmlhYmxlMl0pXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2YXJpYWJsZSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgMzoge1xuICAgICAgICBjb25zdCB2ID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBpZHggPSByYW5kQmV0d2VlbigxLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2ICsgJ14nICsgaWR4KSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSA0OiB7XG4gICAgICAgIGNvbnN0IHN0YXJ0QXNjaWkgPSByYW5kQmV0d2Vlbig5NywgMTIwKVxuICAgICAgICBjb25zdCB2MSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSlcbiAgICAgICAgY29uc3QgdjIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkgKyAxKVxuICAgICAgICBjb25zdCB2MyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSArIDIpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBhID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMSA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMiA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMyA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCB0ZXJtID0gYSArIHYxICsgbjEgKyB2MiArIG4yICsgdjMgKyBuM1xuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDU6XG4gICAgICBjYXNlIDY6IHsgLy8gZS5nLiAzKHgpICogKDJ4LTUpXG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBjb25zdGFudCA9IHJhbmRCZXR3ZWVuKC05LCA5KS50b1N0cmluZygpXG4gICAgICAgICAgbGV0IHRlcm0gPSBjb2VmZlxuICAgICAgICAgIGlmIChkaWZmID09PSA2IHx8IGkgJSAyID09PSAxKSB0ZXJtICs9IHZhcmlhYmxlXG4gICAgICAgICAgaWYgKGkgJSAyID09PSAxKSB0ZXJtICs9ICcrJyArIGNvbnN0YW50XG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgNzogeyAvLyBlLmcuIDN4XjJ5KDR4eV4yKzV4eSlcbiAgICAgICAgY29uc3Qgc3RhcnRBc2NpaSA9IHJhbmRCZXR3ZWVuKDk3LCAxMjApXG4gICAgICAgIGNvbnN0IHYxID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpKVxuICAgICAgICBjb25zdCB2MiA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSArIDEpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBhMSA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjExID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4xMiA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBsZXQgdGVybSA9IGExICsgdjEgKyBuMTEgKyB2MiArIG4xMlxuICAgICAgICAgIGlmIChpICUgMiA9PT0gMSkge1xuICAgICAgICAgICAgY29uc3QgYTIgPSByYW5kQmV0d2VlbigtOSwgOSkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgbjIxID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgbjIyID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgICAgdGVybSArPSAnKycgKyBhMiArIHYxICsgbjIxICsgdjIgKyBuMjJcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgODogLy8geyBlLmcuICh4KzUpICogKHgtMilcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29uc3RhbnQgPSByYW5kQmV0d2VlbigtOSwgOSkudG9TdHJpbmcoKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHZhcmlhYmxlICsgJysnICsgY29uc3RhbnQpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qIE1ldGhvZCB0byBjYWxjdWxhdGUgZWRnZXMgZnJvbSB2ZXJ0aWNlcyAqL1xuICBjYWxjdWxhdGVFZGdlcyAoKSB7XG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBlZGdlcyBnaXZlbiB0aGUgdmVydGljZXMgdXNpbmcgdGhpcy5vcFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIHRoaXMuc2lkZXNbaV0gPSB7XG4gICAgICAgIHZhbDogdGhpcy5vcCh0aGlzLnZlcnRpY2VzW2ldLnZhbCwgdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXS52YWwpLFxuICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyogTWFyayBoaWRkZW5kIGVkZ2VzL3ZlcnRpY2VzICovXG5cbiAgaGlkZUxhYmVscyAocHV6emxlRGlmZmljdWx0eSkge1xuICAgIC8vIEhpZGUgc29tZSBsYWJlbHMgdG8gbWFrZSBhIHB1enpsZVxuICAgIC8vIDEgLSBTaWRlcyBoaWRkZW4sIHZlcnRpY2VzIHNob3duXG4gICAgLy8gMiAtIFNvbWUgc2lkZXMgaGlkZGVuLCBzb21lIHZlcnRpY2VzIGhpZGRlblxuICAgIC8vIDMgLSBBbGwgdmVydGljZXMgaGlkZGVuXG4gICAgc3dpdGNoIChwdXp6bGVEaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHRoaXMuc2lkZXMuZm9yRWFjaCh4ID0+IHsgeC5oaWRkZW4gPSB0cnVlIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDI6IHtcbiAgICAgICAgdGhpcy5zaWRlcy5mb3JFYWNoKHggPT4geyB4LmhpZGRlbiA9IHRydWUgfSlcbiAgICAgICAgY29uc3Qgc2hvd3NpZGUgPSByYW5kQmV0d2VlbigwLCB0aGlzLm4gLSAxLCBNYXRoLnJhbmRvbSlcbiAgICAgICAgY29uc3QgaGlkZXZlcnQgPSBNYXRoLnJhbmRvbSgpIDwgMC41XG4gICAgICAgICAgPyBzaG93c2lkZSAvLyBwcmV2aW91cyB2ZXJ0ZXhcbiAgICAgICAgICA6IChzaG93c2lkZSArIDEpICUgdGhpcy5uIC8vIG5leHQgdmVydGV4O1xuXG4gICAgICAgIHRoaXMuc2lkZXNbc2hvd3NpZGVdLmhpZGRlbiA9IGZhbHNlXG4gICAgICAgIHRoaXMudmVydGljZXNbaGlkZXZlcnRdLmhpZGRlbiA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgMzpcbiAgICAgICAgdGhpcy52ZXJ0aWNlcy5mb3JFYWNoKHggPT4geyB4LmhpZGRlbiA9IHRydWUgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm9fZGlmZmljdWx0eScpXG4gICAgfVxuICB9XG59XG5cbmNsYXNzIEFyaXRobWFnb25RVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIGNvbnN0cnVjdG9yIChkYXRhLCBvcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc2V0cyB0aGlzLndpZHRoIHRoaXMuaGVpZ2h0LCBpbml0aWFsaXNlcyB0aGlzLmxhYmVscywgY3JlYXRlcyBkb20gZWxlbWVudHNcblxuICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aFxuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuaGVpZ2h0XG4gICAgY29uc3QgciA9IDAuMzUgKiBNYXRoLm1pbih3aWR0aCwgaGVpZ2h0KSAvLyByYWRpdXNcbiAgICBjb25zdCBuID0gdGhpcy5kYXRhLm5cblxuICAgIC8vIEEgcG9pbnQgdG8gbGFiZWwgd2l0aCB0aGUgb3BlcmF0aW9uXG4gICAgLy8gQWxsIHBvaW50cyBmaXJzdCBzZXQgdXAgd2l0aCAoMCwwKSBhdCBjZW50ZXJcbiAgICB0aGlzLm9wZXJhdGlvblBvaW50ID0gbmV3IFBvaW50KDAsIDApXG5cbiAgICAvLyBQb3NpdGlvbiBvZiB2ZXJ0aWNlc1xuICAgIHRoaXMudmVydGV4UG9pbnRzID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgY29uc3QgYW5nbGUgPSBpICogTWF0aC5QSSAqIDIgLyBuIC0gTWF0aC5QSSAvIDJcbiAgICAgIHRoaXMudmVydGV4UG9pbnRzW2ldID0gUG9pbnQuZnJvbVBvbGFyKHIsIGFuZ2xlKVxuICAgIH1cblxuICAgIC8vIFBvaXNpdGlvbiBvZiBzaWRlIGxhYmVsc1xuICAgIHRoaXMuc2lkZVBvaW50cyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIHRoaXMuc2lkZVBvaW50c1tpXSA9IFBvaW50Lm1lYW4odGhpcy52ZXJ0ZXhQb2ludHNbaV0sIHRoaXMudmVydGV4UG9pbnRzWyhpICsgMSkgJSBuXSlcbiAgICB9XG5cbiAgICB0aGlzLmFsbFBvaW50cyA9IFt0aGlzLm9wZXJhdGlvblBvaW50XS5jb25jYXQodGhpcy52ZXJ0ZXhQb2ludHMpLmNvbmNhdCh0aGlzLnNpZGVQb2ludHMpXG5cbiAgICB0aGlzLnJlQ2VudGVyKCkgLy8gUmVwb3NpdGlvbiBldmVyeXRoaW5nIHByb3Blcmx5XG5cbiAgICB0aGlzLm1ha2VMYWJlbHModHJ1ZSlcblxuICAgIC8vIERyYXcgaW50byBjYW52YXNcbiAgfVxuXG4gIHJlQ2VudGVyICgpIHtcbiAgICAvLyBGaW5kIHRoZSBjZW50ZXIgb2YgdGhlIGJvdW5kaW5nIGJveFxuICAgIGNvbnN0IHRvcGxlZnQgPSBQb2ludC5taW4odGhpcy5hbGxQb2ludHMpXG4gICAgY29uc3QgYm90dG9tcmlnaHQgPSBQb2ludC5tYXgodGhpcy5hbGxQb2ludHMpXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbih0b3BsZWZ0LCBib3R0b21yaWdodClcblxuICAgIC8vIHRyYW5zbGF0ZSB0byBwdXQgaW4gdGhlIGNlbnRlclxuICAgIHRoaXMuYWxsUG9pbnRzLmZvckVhY2gocCA9PiB7XG4gICAgICBwLnRyYW5zbGF0ZSh0aGlzLndpZHRoIC8gMiAtIGNlbnRlci54LCB0aGlzLmhlaWdodCAvIDIgLSBjZW50ZXIueSlcbiAgICB9KVxuICB9XG5cbiAgbWFrZUxhYmVscyAoKSB7XG4gICAgLy8gdmVydGljZXNcbiAgICB0aGlzLmRhdGEudmVydGljZXMuZm9yRWFjaCgodiwgaSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSB2LnZhbC50b0xhdGV4XG4gICAgICAgID8gdi52YWwudG9MYXRleCh0cnVlKVxuICAgICAgICA6IHYudmFsLnRvU3RyaW5nKClcbiAgICAgIHRoaXMubGFiZWxzLnB1c2goe1xuICAgICAgICBwb3M6IHRoaXMudmVydGV4UG9pbnRzW2ldLFxuICAgICAgICB0ZXh0cTogdi5oaWRkZW4gPyAnJyA6IHZhbHVlLFxuICAgICAgICB0ZXh0YTogdmFsdWUsXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCB2ZXJ0ZXgnLFxuICAgICAgICBzdHlsZWE6IHYuaGlkZGVuID8gJ2Fuc3dlciB2ZXJ0ZXgnIDogJ25vcm1hbCB2ZXJ0ZXgnXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBzaWRlc1xuICAgIHRoaXMuZGF0YS5zaWRlcy5mb3JFYWNoKCh2LCBpKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHYudmFsLnRvTGF0ZXhcbiAgICAgICAgPyB2LnZhbC50b0xhdGV4KHRydWUpXG4gICAgICAgIDogdi52YWwudG9TdHJpbmcoKVxuICAgICAgdGhpcy5sYWJlbHMucHVzaCh7XG4gICAgICAgIHBvczogdGhpcy5zaWRlUG9pbnRzW2ldLFxuICAgICAgICB0ZXh0cTogdi5oaWRkZW4gPyAnJyA6IHZhbHVlLFxuICAgICAgICB0ZXh0YTogdmFsdWUsXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCBzaWRlJyxcbiAgICAgICAgc3R5bGVhOiB2LmhpZGRlbiA/ICdhbnN3ZXIgc2lkZScgOiAnbm9ybWFsIHNpZGUnXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBvcGVyYXRpb25cbiAgICB0aGlzLmxhYmVscy5wdXNoKHtcbiAgICAgIHBvczogdGhpcy5vcGVyYXRpb25Qb2ludCxcbiAgICAgIHRleHRxOiB0aGlzLmRhdGEub3BuYW1lLFxuICAgICAgdGV4dGE6IHRoaXMuZGF0YS5vcG5hbWUsXG4gICAgICBzdHlsZXE6ICdub3JtYWwnLFxuICAgICAgc3R5bGVhOiAnbm9ybWFsJ1xuICAgIH0pXG5cbiAgICAvLyBzdHlsaW5nXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gIH1cblxuICByZW5kZXIgKCkge1xuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICBjb25zdCBuID0gdGhpcy5kYXRhLm5cblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBjb25zdCBwID0gdGhpcy52ZXJ0ZXhQb2ludHNbaV1cbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnZlcnRleFBvaW50c1soaSArIDEpICUgbl1cbiAgICAgIGN0eC5tb3ZlVG8ocC54LCBwLnkpXG4gICAgICBjdHgubGluZVRvKG5leHQueCwgbmV4dC55KVxuICAgIH1cbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIC8vIHBsYWNlIGxhYmVsc1xuICAgIHRoaXMucmVuZGVyTGFiZWxzKHRydWUpXG4gIH1cblxuICBzaG93QW5zd2VyICgpIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0YVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVhXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyh0cnVlKVxuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyh0cnVlKVxuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICB9XG59XG4iLCJpbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5pbXBvcnQgeyByYW5kRWxlbSB9IGZyb20gJ3V0aWxpdGllcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGVzdFEgZXh0ZW5kcyBUZXh0USB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYScsXG4gICAgICB0ZXN0MTogWydmb28nXSxcbiAgICAgIHRlc3QyOiB0cnVlXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICB0aGlzLmxhYmVsID0gc2V0dGluZ3MubGFiZWxcblxuICAgIC8vIHBpY2sgYSByYW5kb20gb25lIG9mIHRoZSBzZWxlY3RlZFxuICAgIGxldCB0ZXN0MVxuICAgIGlmIChzZXR0aW5ncy50ZXN0MS5sZW5ndGggPT09IDApIHtcbiAgICAgIHRlc3QxID0gJ25vbmUnXG4gICAgfSBlbHNlIHtcbiAgICAgIHRlc3QxID0gcmFuZEVsZW0oc2V0dGluZ3MudGVzdDEpXG4gICAgfVxuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gJ2Q6ICcgKyBzZXR0aW5ncy5kaWZmaWN1bHR5ICsgJ1xcXFxcXFxcIHRlc3QxOiAnICsgdGVzdDFcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJ3Rlc3QyOiAnICsgc2V0dGluZ3MudGVzdDJcblxuICAgIHRoaXMucmVuZGVyKClcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgeyByZXR1cm4gJ1Rlc3QgY29tbWFuZCB3b3JkJyB9XG59XG5cblRlc3RRLm9wdGlvbnNTcGVjID0gW1xuICB7XG4gICAgdGl0bGU6ICdUZXN0IG9wdGlvbiAxJyxcbiAgICBpZDogJ3Rlc3QxJyxcbiAgICB0eXBlOiAnc2VsZWN0LWluY2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogWydmb28nLCAnYmFyJywgJ3dpenonXSxcbiAgICBkZWZhdWx0OiBbXVxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdUZXN0IG9wdGlvbiAyJyxcbiAgICBpZDogJ3Rlc3QyJyxcbiAgICB0eXBlOiAnYm9vbCcsXG4gICAgZGVmYXVsdDogdHJ1ZVxuICB9XG5dXG4iLCJpbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5pbXBvcnQgeyByYW5kQmV0d2VlbiB9IGZyb20gJ3V0aWxpdGllcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQWRkQVplcm8gZXh0ZW5kcyBUZXh0USB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYSdcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIHRoaXMubGFiZWwgPSBzZXR0aW5ncy5sYWJlbFxuXG4gICAgLy8gcmFuZG9tIDIgZGlnaXQgJ2RlY2ltYWwnXG4gICAgY29uc3QgcSA9IFN0cmluZyhyYW5kQmV0d2VlbigxLCA5KSkgKyBTdHJpbmcocmFuZEJldHdlZW4oMCwgOSkpICsgJy4nICsgU3RyaW5nKHJhbmRCZXR3ZWVuKDAsIDkpKVxuICAgIGNvbnN0IGEgPSBxICsgJzAnXG5cbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSBxICsgJ1xcXFx0aW1lcyAxMCdcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJz0gJyArIGFcblxuICAgIHRoaXMucmVuZGVyKClcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRXZhbHVhdGUnXG4gIH1cbn1cblxuQWRkQVplcm8ub3B0aW9uc1NwZWMgPSBbXG5dXG4iLCJpbXBvcnQgeyByYW5kQmV0d2VlbiB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCBGcmFjdGlvbiBmcm9tICd2ZW5kb3IvZnJhY3Rpb24nXG5cbi8qIE1haW4gcXVlc3Rpb24gY2xhc3MuIFRoaXMgd2lsbCBiZSBzcHVuIG9mZiBpbnRvIGRpZmZlcmVudCBmaWxlIGFuZCBnZW5lcmFsaXNlZCAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRXF1YXRpb25PZkxpbmUgZXh0ZW5kcyBUZXh0USB7XG4gIC8vICdleHRlbmRzJyBRdWVzdGlvbiwgYnV0IG5vdGhpbmcgdG8gYWN0dWFsbHkgZXh0ZW5kXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgLy8gYm9pbGVycGxhdGVcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiAyXG4gICAgfVxuXG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcbiAgICBjb25zdCBkaWZmaWN1bHR5ID0gTWF0aC5jZWlsKHNldHRpbmdzLmRpZmZpY3VsdHkgLyAyKSAvLyBpbml0aWFsbHkgd3JpdHRlbiBmb3IgZGlmZmljdWx0eSAxLTQsIG5vdyBuZWVkIDEtMTBcblxuICAgIC8vIHF1ZXN0aW9uIGdlbmVyYXRpb24gYmVnaW5zIGhlcmVcbiAgICBsZXQgbSwgYywgeDEsIHkxLCB4MiwgeTJcbiAgICBsZXQgbWlubSwgbWF4bSwgbWluYywgbWF4Y1xuXG4gICAgc3dpdGNoIChkaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6IC8vIG0+MCwgYz49MFxuICAgICAgY2FzZSAyOlxuICAgICAgY2FzZSAzOlxuICAgICAgICBtaW5tID0gZGlmZmljdWx0eSA8IDMgPyAxIDogLTVcbiAgICAgICAgbWF4bSA9IDVcbiAgICAgICAgbWluYyA9IGRpZmZpY3VsdHkgPCAyID8gMCA6IC0xMFxuICAgICAgICBtYXhjID0gMTBcbiAgICAgICAgbSA9IHJhbmRCZXR3ZWVuKG1pbm0sIG1heG0pXG4gICAgICAgIGMgPSByYW5kQmV0d2VlbihtaW5jLCBtYXhjKVxuICAgICAgICB4MSA9IGRpZmZpY3VsdHkgPCAzID8gcmFuZEJldHdlZW4oMCwgMTApIDogcmFuZEJldHdlZW4oLTE1LCAxNSlcbiAgICAgICAgeTEgPSBtICogeDEgKyBjXG5cbiAgICAgICAgaWYgKGRpZmZpY3VsdHkgPCAzKSB7XG4gICAgICAgICAgeDIgPSByYW5kQmV0d2Vlbih4MSArIDEsIDE1KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHgyID0geDFcbiAgICAgICAgICB3aGlsZSAoeDIgPT09IHgxKSB7IHgyID0gcmFuZEJldHdlZW4oLTE1LCAxNSkgfTtcbiAgICAgICAgfVxuICAgICAgICB5MiA9IG0gKiB4MiArIGNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNDogLy8gbSBmcmFjdGlvbiwgcG9pbnRzIGFyZSBpbnRlZ2Vyc1xuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBjb25zdCBtZCA9IHJhbmRCZXR3ZWVuKDEsIDUpXG4gICAgICAgIGNvbnN0IG1uID0gcmFuZEJldHdlZW4oLTUsIDUpXG4gICAgICAgIG0gPSBuZXcgRnJhY3Rpb24obW4sIG1kKVxuICAgICAgICB4MSA9IG5ldyBGcmFjdGlvbihyYW5kQmV0d2VlbigtMTAsIDEwKSlcbiAgICAgICAgeTEgPSBuZXcgRnJhY3Rpb24ocmFuZEJldHdlZW4oLTEwLCAxMCkpXG4gICAgICAgIGMgPSBuZXcgRnJhY3Rpb24oeTEpLnN1YihtLm11bCh4MSkpXG4gICAgICAgIHgyID0geDEuYWRkKHJhbmRCZXR3ZWVuKDEsIDUpICogbS5kKVxuICAgICAgICB5MiA9IG0ubXVsKHgyKS5hZGQoYylcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB4c3RyID1cbiAgICAgIChtID09PSAwIHx8IChtLmVxdWFscyAmJiBtLmVxdWFscygwKSkpID8gJydcbiAgICAgICAgOiAobSA9PT0gMSB8fCAobS5lcXVhbHMgJiYgbS5lcXVhbHMoMSkpKSA/ICd4J1xuICAgICAgICAgIDogKG0gPT09IC0xIHx8IChtLmVxdWFscyAmJiBtLmVxdWFscygtMSkpKSA/ICcteCdcbiAgICAgICAgICAgIDogKG0udG9MYXRleCkgPyBtLnRvTGF0ZXgoKSArICd4J1xuICAgICAgICAgICAgICA6IChtICsgJ3gnKVxuXG4gICAgY29uc3QgY29uc3RzdHIgPSAvLyBUT0RPOiBXaGVuIG09Yz0wXG4gICAgICAoYyA9PT0gMCB8fCAoYy5lcXVhbHMgJiYgYy5lcXVhbHMoMCkpKSA/ICcnXG4gICAgICAgIDogKGMgPCAwKSA/ICgnIC0gJyArIChjLm5lZyA/IGMubmVnKCkudG9MYXRleCgpIDogLWMpKVxuICAgICAgICAgIDogKGMudG9MYXRleCkgPyAoJyArICcgKyBjLnRvTGF0ZXgoKSlcbiAgICAgICAgICAgIDogKCcgKyAnICsgYylcblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICcoJyArIHgxICsgJywgJyArIHkxICsgJylcXFxcdGV4dHsgYW5kIH0oJyArIHgyICsgJywgJyArIHkyICsgJyknXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICd5ID0gJyArIHhzdHIgKyBjb25zdHN0clxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdGaW5kIHRoZSBlcXVhdGlvbiBvZiB0aGUgbGluZSB0aHJvdWdoJ1xuICB9XG59XG4iLCIvKiBSZW5kZXJzIG1pc3NpbmcgYW5nbGVzIHByb2JsZW0gd2hlbiB0aGUgYW5nbGVzIGFyZSBhdCBhIHBvaW50XG4gKiBJLmUuIG9uIGEgc3RyYWlnaHQgbGluZSBvciBhcm91bmQgYSBwb2ludFxuICogQ291bGQgYWxzbyBiZSBhZGFwdGVkIHRvIGFuZ2xlcyBmb3JtaW5nIGEgcmlnaHQgYW5nbGVcbiAqXG4gKiBTaG91bGQgYmUgZmxleGlibGUgZW5vdWdoIGZvciBudW1lcmljYWwgcHJvYmxlbXMgb3IgYWxnZWJyYWljIG9uZXNcbiAqXG4gKi9cblxuaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgR3JhcGhpY1FWaWV3LCBMYWJlbCB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IHsgcm91bmREUCB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIHJhZGl1czogbnVtYmVyXG4gIE86IFBvaW50XG4gIEE6IFBvaW50XG4gIEM6IFBvaW50W11cbiAgdmlld0FuZ2xlczogbnVtYmVyW10gLy8gJ2Z1ZGdlZCcgdmVyc2lvbnMgb2YgZGF0YS5hbmdsZXMgZm9yIGRpc3BsYXlcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIC8vIGluaXRpYWxpc2VkIGluIHN1cGVyIGNhbGxcbiAgcm90YXRpb246IG51bWJlclxuXG4gIGNvbnN0cnVjdG9yIChkYXRhIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEsIG9wdGlvbnMgOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBzZXRzIHRoaXMud2lkdGggdGhpcy5oZWlnaHQsIGluaXRpYWxpc2VzIHRoaXMubGFiZWxzLCBjcmVhdGVzIGRvbSBlbGVtZW50c1xuICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aFxuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuaGVpZ2h0XG4gICAgY29uc3QgcmFkaXVzID0gdGhpcy5yYWRpdXMgPSBNYXRoLm1pbih3aWR0aCwgaGVpZ2h0KSAvIDIuNVxuICAgIGNvbnN0IG1pblZpZXdBbmdsZSA9IG9wdGlvbnMubWluVmlld0FuZ2xlIHx8IDI1XG5cbiAgICB0aGlzLnZpZXdBbmdsZXMgPSBmdWRnZUFuZ2xlcyh0aGlzLmRhdGEuYW5nbGVzLCBtaW5WaWV3QW5nbGUpXG5cbiAgICAvLyBTZXQgdXAgbWFpbiBwb2ludHNcbiAgICB0aGlzLk8gPSBuZXcgUG9pbnQoMCwgMCkgLy8gY2VudGVyIHBvaW50XG4gICAgdGhpcy5BID0gbmV3IFBvaW50KHJhZGl1cywgMCkgLy8gZmlyc3QgcG9pbnRcbiAgICB0aGlzLkMgPSBbXSAvLyBQb2ludHMgYXJvdW5kIG91dHNpZGVcbiAgICBsZXQgdG90YWxhbmdsZSA9IDAgLy8gbmIgaW4gcmFkaWFuc1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5kYXRhLmFuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdG90YWxhbmdsZSArPSB0aGlzLnZpZXdBbmdsZXNbaV0gKiBNYXRoLlBJIC8gMTgwXG4gICAgICB0aGlzLkNbaV0gPSBQb2ludC5mcm9tUG9sYXIocmFkaXVzLCB0b3RhbGFuZ2xlKVxuICAgIH1cblxuICAgIC8vIFJhbmRvbWx5IHJvdGF0ZSBhbmQgY2VudGVyXG4gICAgdGhpcy5yb3RhdGlvbiA9IChvcHRpb25zLnJvdGF0aW9uICE9PSB1bmRlZmluZWQpID8gdGhpcy5yb3RhdGUob3B0aW9ucy5yb3RhdGlvbikgOiB0aGlzLnJhbmRvbVJvdGF0ZSgpXG4gICAgLy8gdGhpcy5zY2FsZVRvRml0KHdpZHRoLGhlaWdodCwxMClcbiAgICB0aGlzLnRyYW5zbGF0ZSh3aWR0aCAvIDIsIGhlaWdodCAvIDIpXG5cbiAgICAvLyBTZXQgdXAgbGFiZWxzIChhZnRlciBzY2FsaW5nIGFuZCByb3RhdGluZylcbiAgICB0b3RhbGFuZ2xlID0gUG9pbnQuYW5nbGVGcm9tKHRoaXMuTywgdGhpcy5BKSAqIDE4MCAvIE1hdGguUEkgLy8gYW5nbGUgZnJvbSBPIHRoYXQgQSBpc1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy52aWV3QW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAvLyBMYWJlbCB0ZXh0XG4gICAgICBjb25zdCBsYWJlbCA6IFBhcnRpYWw8TGFiZWw+ID0ge31cbiAgICAgIGNvbnN0IHRleHRxID0gdGhpcy5kYXRhLmFuZ2xlTGFiZWxzW2ldXG4gICAgICBjb25zdCB0ZXh0YSA9IHJvdW5kRFAodGhpcy5kYXRhLmFuZ2xlc1tpXSwgMikudG9TdHJpbmcoKSArICdeXFxcXGNpcmMnXG5cbiAgICAgIC8vIFBvc2l0aW9uaW5nXG4gICAgICBjb25zdCB0aGV0YSA9IHRoaXMudmlld0FuZ2xlc1tpXVxuICAgICAgLyogY291bGQgYmUgdXNlZCBmb3IgbW9yZSBhZHZhbmNlZCBwb3NpdGlvbmluZ1xuICAgICAgY29uc3QgbWlkQW5nbGUgPSB0b3RhbGFuZ2xlICsgdGhldGEgLyAyXG4gICAgICBjb25zdCBtaW5EaXN0YW5jZSA9IDAuMyAvLyBhcyBhIGZyYWN0aW9uIG9mIHJhZGl1c1xuICAgICAgY29uc3QgbGFiZWxMZW5ndGggPSBNYXRoLm1heCh0ZXh0cS5sZW5ndGgsIHRleHRhLmxlbmd0aCkgLSAnXlxcXFxjaXJjJy5sZW5ndGggLy8gwrAgdGFrZXMgdXAgdmVyeSBsaXR0bGUgc3BhY2VcbiAgICAgICovXG5cbiAgICAgIC8qIEV4cGxhbmF0aW9uOiBGdXJ0aGVyIG91dCBpZjpcbiAgICAgICogICBNb3JlIHZlcnRpY2FsIChzaW4obWlkQW5nbGUpKVxuICAgICAgKiAgIExvbmdlciBsYWJlbFxuICAgICAgKiAgIHNtYWxsZXIgYW5nbGVcbiAgICAgICogICBFLmcuIHRvdGFsbHkgdmVydGljYWwsIDQ1wrAsIGxlbmd0aCA9IDNcbiAgICAgICogICBkID0gMC4zICsgMSozLzQ1ID0gMC4zICsgMC43ID0gMC4zN1xuICAgICAgKi9cbiAgICAgIC8vIGNvbnN0IGZhY3RvciA9IDEgICAgICAgIC8vIGNvbnN0YW50IG9mIHByb3BvcnRpb25hbGl0eS4gU2V0IGJ5IHRyaWFsIGFuZCBlcnJvclxuICAgICAgLy8gbGV0IGRpc3RhbmNlID0gbWluRGlzdGFuY2UgKyBmYWN0b3IgKiBNYXRoLmFicyhzaW5EZWcobWlkQW5nbGUpKSAqIGxhYmVsTGVuZ3RoIC8gdGhldGFcblxuICAgICAgLy8gSnVzdCByZXZlcnQgdG8gb2xkIG1ldGhvZFxuXG4gICAgICBjb25zdCBkaXN0YW5jZSA9IDAuNCArIDYgLyB0aGV0YVxuXG4gICAgICBsYWJlbC5wb3MgPSBQb2ludC5mcm9tUG9sYXJEZWcocmFkaXVzICogZGlzdGFuY2UsIHRvdGFsYW5nbGUgKyB0aGV0YSAvIDIpLnRyYW5zbGF0ZSh0aGlzLk8ueCwgdGhpcy5PLnkpXG4gICAgICBsYWJlbC50ZXh0cSA9IHRleHRxXG4gICAgICBsYWJlbC5zdHlsZXEgPSAnbm9ybWFsJ1xuXG4gICAgICBpZiAodGhpcy5kYXRhLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSB0ZXh0YVxuICAgICAgICBsYWJlbC5zdHlsZWEgPSAnYW5zd2VyJ1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSBsYWJlbC50ZXh0cVxuICAgICAgICBsYWJlbC5zdHlsZWEgPSBsYWJlbC5zdHlsZXFcbiAgICAgIH1cblxuICAgICAgbGFiZWwudGV4dCA9IGxhYmVsLnRleHRxXG4gICAgICBsYWJlbC5zdHlsZSA9IGxhYmVsLnN0eWxlcVxuXG4gICAgICB0aGlzLmxhYmVsc1tpXSA9IGxhYmVsIGFzIExhYmVsXG5cbiAgICAgIHRvdGFsYW5nbGUgKz0gdGhldGFcbiAgICB9XG5cbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgfVxuXG4gIHJlbmRlciAoKSA6IHZvaWQge1xuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICBpZiAoY3R4ID09PSBudWxsKSB7IHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGdldCBjYW52YXMgY29udGV4dCcpIH1cblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGN0eC5tb3ZlVG8odGhpcy5PLngsIHRoaXMuTy55KSAvLyBkcmF3IGxpbmVzXG4gICAgY3R4LmxpbmVUbyh0aGlzLkEueCwgdGhpcy5BLnkpXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLkMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGN0eC5tb3ZlVG8odGhpcy5PLngsIHRoaXMuTy55KVxuICAgICAgY3R4LmxpbmVUbyh0aGlzLkNbaV0ueCwgdGhpcy5DW2ldLnkpXG4gICAgfVxuICAgIGN0eC5zdHJva2VTdHlsZSA9ICdncmF5J1xuICAgIGN0eC5zdHJva2UoKVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgY3R4LmJlZ2luUGF0aCgpXG4gICAgbGV0IHRvdGFsYW5nbGUgPSB0aGlzLnJvdGF0aW9uXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnZpZXdBbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHRoZXRhID0gdGhpcy52aWV3QW5nbGVzW2ldICogTWF0aC5QSSAvIDE4MFxuICAgICAgLy8gMC4wNy90aGV0YSByYWRpYW5zIH49IDQvdGhldGFcbiAgICAgIGN0eC5hcmModGhpcy5PLngsIHRoaXMuTy55LCB0aGlzLnJhZGl1cyAqICgwLjIgKyAwLjA3IC8gdGhldGEpLCB0b3RhbGFuZ2xlLCB0b3RhbGFuZ2xlICsgdGhldGEpXG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIHRvdGFsYW5nbGUgKz0gdGhldGFcbiAgICB9XG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICAvLyB0ZXN0aW5nIGxhYmVsIHBvc2l0aW9uaW5nOlxuICAgIC8vIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgLy8gY3R4LmZpbGxTdHlsZSA9ICdyZWQnXG4gICAgLy8gY3R4LmZpbGxSZWN0KGwucG9zLnggLSAxLCBsLnBvcy55IC0gMSwgMywgMylcbiAgICAvLyB9KVxuXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoZmFsc2UpXG4gIH1cblxuICBnZXQgYWxscG9pbnRzICgpIDogUG9pbnRbXSB7XG4gICAgbGV0IGFsbHBvaW50cyA9IFt0aGlzLkEsIHRoaXMuT11cbiAgICBhbGxwb2ludHMgPSBhbGxwb2ludHMuY29uY2F0KHRoaXMuQylcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGZ1bmN0aW9uIChsKSB7XG4gICAgICBhbGxwb2ludHMucHVzaChsLnBvcylcbiAgICB9KVxuICAgIHJldHVybiBhbGxwb2ludHNcbiAgfVxufVxuXG4vKipcbiAqIEFkanVzdHMgYSBzZXQgb2YgYW5nbGVzIHNvIHRoYXQgYWxsIGFuZ2xlcyBhcmUgZ3JlYXRlciB0aGFuIHttaW5BbmdsZX0gYnkgcmVkdWNpbmcgb3RoZXIgYW5nbGVzIGluIHByb3BvcnRpb25cbiAqIEBwYXJhbSBhbmdsZXMgVGhlIHNldCBvZiBhbmdsZXMgdG8gYWRqdXN0XG4gKiBAcGFyYW0gbWluQW5nbGUgVGhlIHNtYWxsZXN0IGFuZ2xlIGluIHRoZSBvdXRwdXRcbiAqL1xuZnVuY3Rpb24gZnVkZ2VBbmdsZXMgKGFuZ2xlczogbnVtYmVyW10sIG1pbkFuZ2xlOiBudW1iZXIpIDogbnVtYmVyW10ge1xuICBjb25zdCBhbmdsZVN1bSA9IGFuZ2xlcy5yZWR1Y2UoKGEsIGMpID0+IGEgKyBjKVxuICBjb25zdCBtYXBwZWRBbmdsZXMgPSBhbmdsZXMubWFwKCh4LCBpKSA9PiBbeCwgaV0pIC8vIHJlbWVtYmVyIG9yaWdpbmFsIGluZGljZXNcbiAgY29uc3Qgc21hbGxBbmdsZXMgPSBtYXBwZWRBbmdsZXMuZmlsdGVyKHggPT4geFswXSA8IG1pbkFuZ2xlKSAvLyBzcGxpdCBvdXQgYW5nbGVzIHdoaWNoIGFyZSB0b28gc21hbGxcbiAgY29uc3QgbGFyZ2VBbmdsZXMgPSBtYXBwZWRBbmdsZXMuZmlsdGVyKHggPT4geFswXSA+PSBtaW5BbmdsZSlcbiAgY29uc3QgbGFyZ2VBbmdsZVN1bSA9IGxhcmdlQW5nbGVzLnJlZHVjZSgoYWNjdW11bGF0b3IsIGN1cnJlbnRWYWx1ZSkgPT4gYWNjdW11bGF0b3IgKyBjdXJyZW50VmFsdWVbMF0sIDApXG5cbiAgc21hbGxBbmdsZXMuZm9yRWFjaChzbWFsbCA9PiB7XG4gICAgY29uc3QgZGlmZmVyZW5jZSA9IG1pbkFuZ2xlIC0gc21hbGxbMF1cbiAgICBzbWFsbFswXSArPSBkaWZmZXJlbmNlXG4gICAgbGFyZ2VBbmdsZXMuZm9yRWFjaChsYXJnZSA9PiB7XG4gICAgICBjb25zdCByZWR1Y3Rpb24gPSBkaWZmZXJlbmNlICogbGFyZ2VbMF0gLyBsYXJnZUFuZ2xlU3VtXG4gICAgICBsYXJnZVswXSA9IE1hdGgucm91bmQobGFyZ2VbMF0gLSByZWR1Y3Rpb24pXG4gICAgfSlcbiAgfSlcblxuICAvLyBmaXggYW55IHJvdW5kaW5nIGVycm9ycyBpbnRyb2R1Y2VkXG5cbiAgY29uc3QgbmV3QW5nbGVzID0gc21hbGxBbmdsZXMuY29uY2F0KGxhcmdlQW5nbGVzKSAvLyBjb21iaW5lIHRvZ2V0aGVyXG4gICAgLnNvcnQoKHgsIHkpID0+IHhbMV0gLSB5WzFdKSAvLyBzb3J0IGJ5IHByZXZpb3VzIGluZGV4XG4gICAgLm1hcCh4ID0+IHhbMF0pIC8vIHN0cmlwIG91dCBpbmRleFxuXG4gIGxldCBuZXdTdW0gPSBuZXdBbmdsZXMucmVkdWNlKChhY2MsIGN1cnIpID0+IGFjYyArIGN1cnIpXG4gIGlmIChuZXdTdW0gIT09IGFuZ2xlU3VtKSB7XG4gICAgY29uc3QgZGlmZmVyZW5jZSA9IGFuZ2xlU3VtIC0gbmV3U3VtXG4gICAgbmV3QW5nbGVzW25ld0FuZ2xlcy5pbmRleE9mKE1hdGgubWF4KC4uLm5ld0FuZ2xlcykpXSArPSBkaWZmZXJlbmNlXG4gIH1cbiAgbmV3U3VtID0gbmV3QW5nbGVzLnJlZHVjZSgoYWNjLCBjdXJyKSA9PiBhY2MgKyBjdXJyKVxuICBpZiAobmV3U3VtICE9PSBhbmdsZVN1bSkgdGhyb3cgbmV3IEVycm9yKGBEaWRuJ3QgZml4IGFuZ2xlcy4gTmV3IHN1bSBpcyAke25ld1N1bX0sIGJ1dCBzaG91bGQgYmUgJHthbmdsZVN1bX1gKVxuXG4gIHJldHVybiBuZXdBbmdsZXNcbn1cbiIsIi8qKiBHZW5lcmF0ZXMgYW5kIGhvbGRzIGRhdGEgZm9yIGEgbWlzc2luZyBhbmdsZXMgcXVlc3Rpb24sIHdoZXJlIHRoZXNlIGlzIHNvbWUgZ2l2ZW4gYW5nbGUgc3VtXG4gKiAgQWdub3N0aWMgYXMgdG8gaG93IHRoZXNlIGFuZ2xlcyBhcmUgYXJyYW5nZWQgKGUuZy4gaW4gYSBwb2x5Z29uIG9yIGFyb3VuZCBzb20gcG9pbnQpXG4gKlxuICogT3B0aW9ucyBwYXNzZWQgdG8gY29uc3RydWN0b3JzOlxuICogIGFuZ2xlU3VtOjpJbnQgdGhlIG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqICBtaW5BbmdsZTo6SW50IHRoZSBzbWFsbGVzdCBhbmdsZSB0byBnZW5lcmF0ZVxuICogIG1pbk46OkludCAgICAgdGhlIHNtYWxsZXN0IG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqICBtYXhOOjpJbnQgICAgIHRoZSBsYXJnZXN0IG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqXG4gKi9cblxuaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUURhdGEgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgYXMgT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxuZXhwb3J0IGNsYXNzIE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIGltcGxlbWVudHMgTWlzc2luZ0FuZ2xlc0RhdGEge1xuICBhbmdsZXMgOiBudW1iZXJbXSAvLyBsaXN0IG9mIGFuZ2xlc1xuICBtaXNzaW5nIDogYm9vbGVhbltdIC8vIHRydWUgaWYgbWlzc2luZ1xuICBhbmdsZVN1bSA6IG51bWJlciAvLyB3aGF0IHRoZSBhbmdsZXMgYWRkIHVwIHRvXG4gIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXVxuXG4gIGNvbnN0cnVjdG9yIChhbmdsZVN1bSA6IG51bWJlciwgYW5nbGVzOiBudW1iZXJbXSwgbWlzc2luZzogYm9vbGVhbltdLCBhbmdsZUxhYmVscz86IHN0cmluZ1tdKSB7XG4gICAgLy8gaW5pdGlhbGlzZXMgd2l0aCBhbmdsZXMgZ2l2ZW4gZXhwbGljaXRseVxuICAgIGlmIChhbmdsZXMgPT09IFtdKSB7IHRocm93IG5ldyBFcnJvcignTXVzdCBnaXZlIGFuZ2xlcycpIH1cbiAgICBpZiAoTWF0aC5yb3VuZChhbmdsZXMucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSkpICE9PSBhbmdsZVN1bSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBbmdsZSBzdW0gbXVzdCBiZSAke2FuZ2xlU3VtfWApXG4gICAgfVxuXG4gICAgdGhpcy5hbmdsZXMgPSBhbmdsZXMgLy8gbGlzdCBvZiBhbmdsZXNcbiAgICB0aGlzLm1pc3NpbmcgPSBtaXNzaW5nIC8vIHdoaWNoIGFuZ2xlcyBhcmUgbWlzc2luZyAtIGFycmF5IG9mIGJvb2xlYW5zXG4gICAgdGhpcy5hbmdsZVN1bSA9IGFuZ2xlU3VtIC8vIHN1bSBvZiBhbmdsZXNcbiAgICB0aGlzLmFuZ2xlTGFiZWxzID0gYW5nbGVMYWJlbHMgfHwgW11cbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IE9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEge1xuICAgIGxldCBxdWVzdGlvbiA6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhXG4gICAgaWYgKG9wdGlvbnMucmVwZWF0ZWQpIHtcbiAgICAgIHF1ZXN0aW9uID0gdGhpcy5yYW5kb21SZXBlYXRlZChvcHRpb25zKVxuICAgIH0gZWxzZSB7XG4gICAgICBxdWVzdGlvbiA9IHRoaXMucmFuZG9tU2ltcGxlKG9wdGlvbnMpXG4gICAgfVxuICAgIHF1ZXN0aW9uLmluaXRMYWJlbHMoKVxuICAgIHJldHVybiBxdWVzdGlvblxuICB9XG5cbiAgc3RhdGljIHJhbmRvbVNpbXBsZSAob3B0aW9uczogT3B0aW9ucyk6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBjb25zdCBhbmdsZVN1bSA9IG9wdGlvbnMuYW5nbGVTdW1cbiAgICBjb25zdCBuID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5OLCBvcHRpb25zLm1heE4pXG4gICAgY29uc3QgbWluQW5nbGUgPSBvcHRpb25zLm1pbkFuZ2xlXG5cbiAgICBpZiAobiA8IDIpIHRocm93IG5ldyBFcnJvcignQ2FuXFwndCBoYXZlIG1pc3NpbmcgZmV3ZXIgdGhhbiAyIGFuZ2xlcycpXG5cbiAgICAvLyBCdWlsZCB1cCBhbmdsZXNcbiAgICBjb25zdCBhbmdsZXMgPSBbXVxuICAgIGxldCBsZWZ0ID0gYW5nbGVTdW1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG4gLSAxOyBpKyspIHtcbiAgICAgIGNvbnN0IG1heEFuZ2xlID0gbGVmdCAtIG1pbkFuZ2xlICogKG4gLSBpIC0gMSlcbiAgICAgIGNvbnN0IG5leHRBbmdsZSA9IHJhbmRCZXR3ZWVuKG1pbkFuZ2xlLCBtYXhBbmdsZSlcbiAgICAgIGxlZnQgLT0gbmV4dEFuZ2xlXG4gICAgICBhbmdsZXMucHVzaChuZXh0QW5nbGUpXG4gICAgfVxuICAgIGFuZ2xlc1tuIC0gMV0gPSBsZWZ0XG5cbiAgICAvLyBwaWNrIG9uZSB0byBiZSBtaXNzaW5nXG4gICAgY29uc3QgbWlzc2luZzogYm9vbGVhbltdID0gW11cbiAgICBtaXNzaW5nLmxlbmd0aCA9IG5cbiAgICBtaXNzaW5nLmZpbGwoZmFsc2UpXG4gICAgbWlzc2luZ1tyYW5kQmV0d2VlbigwLCBuIC0gMSldID0gdHJ1ZVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGFuZ2xlU3VtLCBhbmdsZXMsIG1pc3NpbmcpXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tUmVwZWF0ZWQgKG9wdGlvbnM6IE9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEge1xuICAgIGNvbnN0IGFuZ2xlU3VtOiBudW1iZXIgPSBvcHRpb25zLmFuZ2xlU3VtXG4gICAgY29uc3QgbWluQW5nbGU6IG51bWJlciA9IG9wdGlvbnMubWluQW5nbGVcblxuICAgIGNvbnN0IG46IG51bWJlciA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTiwgb3B0aW9ucy5tYXhOKVxuXG4gICAgY29uc3QgbTogbnVtYmVyID0gb3B0aW9ucy5uTWlzc2luZyB8fCAoTWF0aC5yYW5kb20oKSA8IDAuMSA/IG4gOiByYW5kQmV0d2VlbigyLCBuIC0gMSkpXG5cbiAgICBpZiAobiA8IDIgfHwgbSA8IDEgfHwgbSA+IG4pIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBhcmd1bWVudHM6IG49JHtufSwgbT0ke219YClcblxuICAgIC8vIEFsbCBtaXNzaW5nIC0gZG8gYXMgYSBzZXBhcmF0ZSBjYXNlXG4gICAgaWYgKG4gPT09IG0pIHtcbiAgICAgIGNvbnN0IGFuZ2xlczogbnVtYmVyW10gPSBbXVxuICAgICAgYW5nbGVzLmxlbmd0aCA9IG5cbiAgICAgIGFuZ2xlcy5maWxsKGFuZ2xlU3VtIC8gbilcblxuICAgICAgY29uc3QgbWlzc2luZzogYm9vbGVhbltdID0gW11cbiAgICAgIG1pc3NpbmcubGVuZ3RoID0gblxuICAgICAgbWlzc2luZy5maWxsKHRydWUpXG5cbiAgICAgIHJldHVybiBuZXcgdGhpcyhhbmdsZVN1bSwgYW5nbGVzLCBtaXNzaW5nKVxuICAgIH1cblxuICAgIGNvbnN0IGFuZ2xlczogbnVtYmVyW10gPSBbXVxuICAgIGNvbnN0IG1pc3Npbmc6IGJvb2xlYW5bXSA9IFtdXG4gICAgbWlzc2luZy5sZW5ndGggPSBuXG4gICAgbWlzc2luZy5maWxsKGZhbHNlKVxuXG4gICAgLy8gY2hvb3NlIGEgdmFsdWUgZm9yIHRoZSBtaXNzaW5nIGFuZ2xlc1xuICAgIGNvbnN0IG1heFJlcGVhdGVkQW5nbGUgPSAoYW5nbGVTdW0gLSBtaW5BbmdsZSAqIChuIC0gbSkpIC8gbVxuICAgIGNvbnN0IHJlcGVhdGVkQW5nbGUgPSByYW5kQmV0d2VlbihtaW5BbmdsZSwgbWF4UmVwZWF0ZWRBbmdsZSlcblxuICAgIC8vIGNob29zZSB2YWx1ZXMgZm9yIHRoZSBvdGhlciBhbmdsZXNcbiAgICBjb25zdCBvdGhlckFuZ2xlczogbnVtYmVyW10gPSBbXVxuICAgIGxldCBsZWZ0ID0gYW5nbGVTdW0gLSByZXBlYXRlZEFuZ2xlICogbVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbiAtIG0gLSAxOyBpKyspIHtcbiAgICAgIGNvbnN0IG1heEFuZ2xlID0gbGVmdCAtIG1pbkFuZ2xlICogKG4gLSBtIC0gaSAtIDEpXG4gICAgICBjb25zdCBuZXh0QW5nbGUgPSByYW5kQmV0d2VlbihtaW5BbmdsZSwgbWF4QW5nbGUpXG4gICAgICBsZWZ0IC09IG5leHRBbmdsZVxuICAgICAgb3RoZXJBbmdsZXMucHVzaChuZXh0QW5nbGUpXG4gICAgfVxuICAgIG90aGVyQW5nbGVzW24gLSBtIC0gMV0gPSBsZWZ0XG5cbiAgICAvLyBjaG9vc2Ugd2hlcmUgdGhlIG1pc3NpbmcgYW5nbGVzIGFyZVxuICAgIHtcbiAgICAgIGxldCBpID0gMFxuICAgICAgd2hpbGUgKGkgPCBtKSB7XG4gICAgICAgIGNvbnN0IGogPSByYW5kQmV0d2VlbigwLCBuIC0gMSlcbiAgICAgICAgaWYgKG1pc3Npbmdbal0gPT09IGZhbHNlKSB7XG4gICAgICAgICAgbWlzc2luZ1tqXSA9IHRydWVcbiAgICAgICAgICBhbmdsZXNbal0gPSByZXBlYXRlZEFuZ2xlXG4gICAgICAgICAgaSsrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBmaWxsIGluIHRoZSBvdGhlciBhbmdsZXNcbiAgICB7XG4gICAgICBsZXQgaiA9IDBcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGlmIChtaXNzaW5nW2ldID09PSBmYWxzZSkge1xuICAgICAgICAgIGFuZ2xlc1tpXSA9IG90aGVyQW5nbGVzW2pdXG4gICAgICAgICAgaisrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ldyB0aGlzKGFuZ2xlU3VtLCBhbmdsZXMsIG1pc3NpbmcpXG4gIH1cblxuICBpbml0TGFiZWxzICgpIDogdm9pZCB7XG4gICAgY29uc3QgbiA9IHRoaXMuYW5nbGVzLmxlbmd0aFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBpZiAoIXRoaXMubWlzc2luZ1tpXSkge1xuICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzW2ldID0gYCR7dGhpcy5hbmdsZXNbaV0udG9TdHJpbmcoKX1eXFxcXGNpcmNgXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzW2ldID0gJ3heXFxcXGNpcmMnXG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iLCIvKiBRdWVzdGlvbiB0eXBlIGNvbXByaXNpbmcgbnVtZXJpY2FsIG1pc3NpbmcgYW5nbGVzIGFyb3VuZCBhIHBvaW50IGFuZFxuICogYW5nbGVzIG9uIGEgc3RyYWlnaHQgbGluZSAoc2luY2UgdGhlc2UgYXJlIHZlcnkgc2ltaWxhciBudW1lcmljYWxseSBhcyB3ZWxsXG4gKiBhcyBncmFwaGljYWxseS5cbiAqXG4gKiBBbHNvIGNvdmVycyBjYXNlcyB3aGVyZSBtb3JlIHRoYW4gb25lIGFuZ2xlIGlzIGVxdWFsXG4gKlxuICovXG5cbmltcG9ydCB7IE9wdGlvbnNTcGVjIH0gZnJvbSAnT3B0aW9uc1NwZWMnXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc051bWJlckRhdGEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhITogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgLy8gaW5pdGlhbGlzZWQgaW4gc3VwZXIoKVxuICB2aWV3ITogTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXdcblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBQYXJ0aWFsPE1pc3NpbmdBbmdsZU9wdGlvbnM+LCB2aWV3T3B0aW9uczogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNBcm91bmRRIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IE1pc3NpbmdBbmdsZU9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDE1LFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDQsXG4gICAgICByZXBlYXRlZDogZmFsc2UsXG4gICAgICBuTWlzc2luZzogM1xuICAgIH1cbiAgICBjb25zdCBzZXR0aW5nczogTWlzc2luZ0FuZ2xlT3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhLnJhbmRvbShzZXR0aW5ncylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3KGRhdGEsIHZpZXdPcHRpb25zKSAvLyBUT0RPIGVsaW1pbmF0ZSBwdWJsaWMgY29uc3RydWN0b3JzXG5cbiAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRRKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBHcmFwaGljUVZpZXcsIExhYmVsIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgeyBzaW5EZWcsIGRhc2hlZExpbmUsIHJvdW5kRFAgfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICBBIDogUG9pbnQgLy8gdGhlIHZlcnRpY2VzIG9mIHRoZSB0cmlhbmdsZVxuICBCIDogUG9pbnRcbiAgQyA6IFBvaW50XG4gIHJvdGF0aW9uOiBudW1iZXJcbiAgLy8gSW5oZXJpdGVkIG1lbWJlcnMuIEFsbCBpbml0aWFsaXNlZCBpbiBjYWxsIHRvIHN1cGVyKClcbiAgbGFiZWxzITogTGFiZWxbXVxuICBjYW52YXMhOiBIVE1MQ2FudmFzRWxlbWVudFxuICBET00hOiBIVE1MRWxlbWVudFxuICB3aWR0aCE6IG51bWJlclxuICBoZWlnaHQhOiBudW1iZXJcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGFcblxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSwgb3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBzZXRzIHRoaXMud2lkdGggdGhpcy5oZWlnaHQsIHRoaXMuZGF0YSBpbml0aWFsaXNlcyB0aGlzLmxhYmVscywgY3JlYXRlcyBkb20gZWxlbWVudHNcbiAgICBjb25zdCB3aWR0aCA9IHRoaXMud2lkdGhcbiAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmhlaWdodFxuXG4gICAgLy8gZ2VuZXJhdGUgcG9pbnRzICh3aXRoIGxvbmdlc3Qgc2lkZSAxXG4gICAgdGhpcy5BID0gbmV3IFBvaW50KDAsIDApXG4gICAgdGhpcy5CID0gUG9pbnQuZnJvbVBvbGFyRGVnKDEsIGRhdGEuYW5nbGVzWzBdKVxuICAgIHRoaXMuQyA9IG5ldyBQb2ludChcbiAgICAgIHNpbkRlZyh0aGlzLmRhdGEuYW5nbGVzWzFdKSAvIHNpbkRlZyh0aGlzLmRhdGEuYW5nbGVzWzJdKSwgMFxuICAgIClcblxuICAgIC8vIENyZWF0ZSBsYWJlbHNcbiAgICBjb25zdCBpbkNlbnRlciA9IFBvaW50LmluQ2VudGVyKHRoaXMuQSwgdGhpcy5CLCB0aGlzLkMpXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgY29uc3QgcCA9IFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXVtpXVxuXG4gICAgICBjb25zdCBsYWJlbCA6IFBhcnRpYWw8TGFiZWw+ID0ge1xuICAgICAgICB0ZXh0cTogdGhpcy5kYXRhLmFuZ2xlTGFiZWxzW2ldLFxuICAgICAgICB0ZXh0OiB0aGlzLmRhdGEuYW5nbGVMYWJlbHNbaV0sXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCcsXG4gICAgICAgIHN0eWxlOiAnbm9ybWFsJyxcbiAgICAgICAgcG9zOiBQb2ludC5tZWFuKHAsIHAsIGluQ2VudGVyKVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5kYXRhLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSByb3VuZERQKHRoaXMuZGF0YS5hbmdsZXNbaV0sIDIpLnRvU3RyaW5nKCkgKyAnXlxcXFxjaXJjJ1xuICAgICAgICBsYWJlbC5zdHlsZWEgPSAnYW5zd2VyJ1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSBsYWJlbC50ZXh0cVxuICAgICAgICBsYWJlbC5zdHlsZWEgPSBsYWJlbC5zdHlsZXFcbiAgICAgIH1cblxuICAgICAgdGhpcy5sYWJlbHNbaV0gPSBsYWJlbCBhcyBMYWJlbFxuICAgIH1cblxuICAgIC8vIHJvdGF0ZSByYW5kb21seVxuICAgIHRoaXMucm90YXRpb24gPSAob3B0aW9ucy5yb3RhdGlvbiAhPT0gdW5kZWZpbmVkKSA/IHRoaXMucm90YXRlKG9wdGlvbnMucm90YXRpb24pIDogdGhpcy5yYW5kb21Sb3RhdGUoKVxuXG4gICAgLy8gc2NhbGUgYW5kIGZpdFxuICAgIC8vIHNjYWxlIHRvIHNpemVcbiAgICBjb25zdCBtYXJnaW4gPSAwXG4gICAgbGV0IHRvcGxlZnQgPSBQb2ludC5taW4oW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGxldCBib3R0b21yaWdodCA9IFBvaW50Lm1heChbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgY29uc3QgdG90YWxXaWR0aCA9IGJvdHRvbXJpZ2h0LnggLSB0b3BsZWZ0LnhcbiAgICBjb25zdCB0b3RhbEhlaWdodCA9IGJvdHRvbXJpZ2h0LnkgLSB0b3BsZWZ0LnlcbiAgICB0aGlzLnNjYWxlKE1hdGgubWluKCh3aWR0aCAtIG1hcmdpbikgLyB0b3RhbFdpZHRoLCAoaGVpZ2h0IC0gbWFyZ2luKSAvIHRvdGFsSGVpZ2h0KSkgLy8gMTVweCBtYXJnaW5cblxuICAgIC8vIG1vdmUgdG8gY2VudHJlXG4gICAgdG9wbGVmdCA9IFBvaW50Lm1pbihbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgYm90dG9tcmlnaHQgPSBQb2ludC5tYXgoW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGNvbnN0IGNlbnRlciA9IFBvaW50Lm1lYW4odG9wbGVmdCwgYm90dG9tcmlnaHQpXG4gICAgdGhpcy50cmFuc2xhdGUod2lkdGggLyAyIC0gY2VudGVyLngsIGhlaWdodCAvIDIgLSBjZW50ZXIueSkgLy8gY2VudHJlXG4gIH1cblxuICByZW5kZXIgKCkgOiB2b2lkIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG4gICAgaWYgKGN0eCA9PT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgZ2V0IGNhbnZhcyBjb250ZXh0JylcblxuICAgIGNvbnN0IHZlcnRpY2VzID0gW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdXG4gICAgY29uc3QgYXBleCA9IHRoaXMuZGF0YS5hcGV4IC8vIGhtbW1cblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGN0eC5tb3ZlVG8odGhpcy5BLngsIHRoaXMuQS55KVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGNvbnN0IHAgPSB2ZXJ0aWNlc1tpXVxuICAgICAgY29uc3QgbmV4dCA9IHZlcnRpY2VzWyhpICsgMSkgJSAzXVxuICAgICAgaWYgKGFwZXggPT09IGkgfHwgYXBleCA9PT0gKGkgKyAxKSAlIDMpIHsgLy8gdG8vZnJvbSBhcGV4IC0gZHJhdyBkYXNoZWQgbGluZVxuICAgICAgICBkYXNoZWRMaW5lKGN0eCwgcC54LCBwLnksIG5leHQueCwgbmV4dC55KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3R4LmxpbmVUbyhuZXh0LngsIG5leHQueSlcbiAgICAgIH1cbiAgICB9XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gJ2dyYXknXG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGdldCBhbGxwb2ludHMgKCkgOiBQb2ludFtdIHtcbiAgICBjb25zdCBhbGxwb2ludHMgPSBbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ11cbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4geyBhbGxwb2ludHMucHVzaChsLnBvcykgfSlcbiAgICByZXR1cm4gYWxscG9pbnRzXG4gIH1cbn1cbiIsIi8qIEV4dGVuZHMgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgaW4gb3JkZXIgdG8gZG8gaXNvc2NlbGVzIHRyaWFuZ2xlcywgd2hpY2ggZ2VuZXJhdGUgYSBiaXQgZGlmZmVyZW50bHkgKi9cblxuaW1wb3J0IHsgZmlyc3RVbmlxdWVJbmRleCB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5cbnR5cGUgT3B0aW9ucyA9IE1pc3NpbmdBbmdsZU9wdGlvbnMgJiB7Z2l2ZW5BbmdsZT86ICdhcGV4JyB8ICdiYXNlJ31cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBleHRlbmRzIE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBhcGV4PzogMCB8IDEgfCAyIHwgdW5kZWZpbmVkIC8vIHdoaWNoIG9mIHRoZSB0aHJlZSBnaXZlbiBhbmdsZXMgaXMgdGhlIGFwZXggb2YgYW4gaXNvc2NlbGVzIHRyaWFuZ2xlXG4gICAgY29uc3RydWN0b3IgKGFuZ2xlU3VtOiBudW1iZXIsIGFuZ2xlczogbnVtYmVyW10sIG1pc3Npbmc6IGJvb2xlYW5bXSwgYW5nbGVMYWJlbHM/OiBzdHJpbmdbXSwgYXBleD86IDB8MXwyfHVuZGVmaW5lZCkge1xuICAgICAgc3VwZXIoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZywgYW5nbGVMYWJlbHMpXG4gICAgICB0aGlzLmFwZXggPSBhcGV4XG4gICAgfVxuXG4gICAgc3RhdGljIHJhbmRvbVJlcGVhdGVkIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEge1xuICAgICAgb3B0aW9ucy5uTWlzc2luZyA9IDJcbiAgICAgIG9wdGlvbnMuZ2l2ZW5BbmdsZSA9IG9wdGlvbnMuZ2l2ZW5BbmdsZSB8fCBNYXRoLnJhbmRvbSgpIDwgMC41ID8gJ2FwZXgnIDogJ2Jhc2UnXG5cbiAgICAgIC8vIGdlbmVyYXRlIHRoZSByYW5kb20gYW5nbGVzIHdpdGggcmVwZXRpdGlvbiBmaXJzdCBiZWZvcmUgbWFya2luZyBhcGV4IGZvciBkcmF3aW5nXG4gICAgICBjb25zdCBxdWVzdGlvbiA9IHN1cGVyLnJhbmRvbVJlcGVhdGVkKG9wdGlvbnMpIGFzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEgLy8gYWxsb3dlZCBzaW5jZSB1bmRlZmluZWQgXFxpbiBhcGV4XG5cbiAgICAgIC8vIE9sZCBpbXBsZW1lbnRhdGlvbiBoYWQgc29ydGluZyB0aGUgYXJyYXkgLSBub3Qgc3VyZSB3aHlcbiAgICAgIC8vIHNvcnRUb2dldGhlcihxdWVzdGlvbi5hbmdsZXMscXVlc3Rpb24ubWlzc2luZywoeCx5KSA9PiB4IC0geSlcblxuICAgICAgcXVlc3Rpb24uYXBleCA9IGZpcnN0VW5pcXVlSW5kZXgocXVlc3Rpb24uYW5nbGVzKSBhcyAwIHwgMSB8IDJcbiAgICAgIHF1ZXN0aW9uLm1pc3NpbmcgPSBbdHJ1ZSwgdHJ1ZSwgdHJ1ZV1cblxuICAgICAgaWYgKG9wdGlvbnMuZ2l2ZW5BbmdsZSA9PT0gJ2FwZXgnKSB7XG4gICAgICAgIHF1ZXN0aW9uLm1pc3NpbmdbcXVlc3Rpb24uYXBleF0gPSBmYWxzZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcXVlc3Rpb24ubWlzc2luZ1socXVlc3Rpb24uYXBleCArIDEpICUgM10gPSBmYWxzZVxuICAgICAgfVxuXG4gICAgICBxdWVzdGlvbi5pbml0TGFiZWxzKClcblxuICAgICAgcmV0dXJuIHF1ZXN0aW9uXG4gICAgfVxuXG4gICAgaW5pdExhYmVscyAoKTogdm9pZCB7XG4gICAgICBjb25zdCBuID0gdGhpcy5hbmdsZXMubGVuZ3RoXG4gICAgICBsZXQgaiA9IDAgLy8ga2VlcCB0cmFjayBvZiB1bmtub3duc1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgaWYgKCF0aGlzLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzW2ldID0gYCR7dGhpcy5hbmdsZXNbaV0udG9TdHJpbmcoKX1eXFxcXGNpcmNgXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5hbmdsZUxhYmVsc1tpXSA9IGAke1N0cmluZy5mcm9tQ2hhckNvZGUoMTIwICsgail9XlxcXFxjaXJjYCAvLyAxMjAgPSAneCdcbiAgICAgICAgICBqKytcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbn1cbiIsIi8qIE1pc3NpbmcgYW5nbGVzIGluIHRyaWFuZ2xlIC0gbnVtZXJpY2FsICovXG5cbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc051bWJlckRhdGEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVPcHRpb25zIH0gZnJvbSAnLi9OdW1iZXJPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhITogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YVxuICB2aWV3ITogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlld1xuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFBhcnRpYWw8TWlzc2luZ0FuZ2xlT3B0aW9ucz4sIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucykge1xuICAgIGNvbnN0IG9wdGlvbnNPdmVycmlkZSA6IFBhcnRpYWw8TWlzc2luZ0FuZ2xlT3B0aW9ucz4gPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDI1LFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDNcbiAgICB9XG4gICAgY29uc3QgZGVmYXVsdHMgOiBNaXNzaW5nQW5nbGVPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAxNSxcbiAgICAgIG1pbk46IDIsXG4gICAgICBtYXhOOiA0LFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlLFxuICAgICAgbk1pc3Npbmc6IDFcbiAgICB9XG5cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zLCBvcHRpb25zT3ZlcnJpZGUpXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YS5yYW5kb20oc2V0dGluZ3MpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3KGRhdGEsIHZpZXdPcHRpb25zKVxuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBMaW5FeHByIHtcbi8vIGNsYXNzIExpbkV4cHIge1xuICBjb25zdHJ1Y3RvciAoYSwgYikge1xuICAgIHRoaXMuYSA9IGFcbiAgICB0aGlzLmIgPSBiXG4gIH1cblxuICBpc0NvbnN0YW50ICgpIHtcbiAgICByZXR1cm4gdGhpcy5hID09PSAwXG4gIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgbGV0IHN0cmluZyA9ICcnXG5cbiAgICAvLyB4IHRlcm1cbiAgICBpZiAodGhpcy5hID09PSAxKSB7IHN0cmluZyArPSAneCcgfSBlbHNlIGlmICh0aGlzLmEgPT09IC0xKSB7IHN0cmluZyArPSAnLXgnIH0gZWxzZSBpZiAodGhpcy5hICE9PSAwKSB7IHN0cmluZyArPSB0aGlzLmEgKyAneCcgfVxuXG4gICAgLy8gc2lnblxuICAgIGlmICh0aGlzLmEgIT09IDAgJiYgdGhpcy5iID4gMCkgeyBzdHJpbmcgKz0gJyArICcgfSBlbHNlIGlmICh0aGlzLmEgIT09IDAgJiYgdGhpcy5iIDwgMCkgeyBzdHJpbmcgKz0gJyAtICcgfVxuXG4gICAgLy8gY29uc3RhbnRcbiAgICBpZiAodGhpcy5iID4gMCkgeyBzdHJpbmcgKz0gdGhpcy5iIH0gZWxzZSBpZiAodGhpcy5iIDwgMCAmJiB0aGlzLmEgPT09IDApIHsgc3RyaW5nICs9IHRoaXMuYiB9IGVsc2UgaWYgKHRoaXMuYiA8IDApIHsgc3RyaW5nICs9IE1hdGguYWJzKHRoaXMuYikgfVxuXG4gICAgcmV0dXJuIHN0cmluZ1xuICB9XG5cbiAgdG9TdHJpbmdQICgpIHtcbiAgICAvLyByZXR1cm4gZXhwcmVzc2lvbiBhcyBhIHN0cmluZywgc3Vycm91bmRlZCBpbiBwYXJlbnRoZXNlcyBpZiBhIGJpbm9taWFsXG4gICAgaWYgKHRoaXMuYSA9PT0gMCB8fCB0aGlzLmIgPT09IDApIHJldHVybiB0aGlzLnRvU3RyaW5nKClcbiAgICBlbHNlIHJldHVybiAnKCcgKyB0aGlzLnRvU3RyaW5nKCkgKyAnKSdcbiAgfVxuXG4gIGV2YWwgKHgpIHtcbiAgICByZXR1cm4gdGhpcy5hICogeCArIHRoaXMuYlxuICB9XG5cbiAgYWRkICh0aGF0KSB7XG4gICAgLy8gYWRkIGVpdGhlciBhbiBleHByZXNzaW9uIG9yIGEgY29uc3RhbnRcbiAgICBpZiAodGhhdC5hICE9PSB1bmRlZmluZWQpIHJldHVybiBuZXcgTGluRXhwcih0aGlzLmEgKyB0aGF0LmEsIHRoaXMuYiArIHRoYXQuYilcbiAgICBlbHNlIHJldHVybiBuZXcgTGluRXhwcih0aGlzLmEsIHRoaXMuYiArIHRoYXQpXG4gIH1cblxuICB0aW1lcyAodGhhdCkge1xuICAgIHJldHVybiBuZXcgTGluRXhwcih0aGlzLmEgKiB0aGF0LCB0aGlzLmIgKiB0aGF0KVxuICB9XG5cbiAgc3RhdGljIHNvbHZlIChleHByMSwgZXhwcjIpIHtcbiAgICAvLyBzb2x2ZXMgdGhlIHR3byBleHByZXNzaW9ucyBzZXQgZXF1YWwgdG8gZWFjaCBvdGhlclxuICAgIHJldHVybiAoZXhwcjIuYiAtIGV4cHIxLmIpIC8gKGV4cHIxLmEgLSBleHByMi5hKVxuICB9XG59XG4iLCJpbXBvcnQgTGluRXhwciBmcm9tICdMaW5FeHByJ1xuXG4vKiogR2l2ZW4gYSBzZXQgb2YgZXhwcmVzc2lvbnMsIHNldCB0aGVpciBzdW0gICovXG5cbmV4cG9ydCBmdW5jdGlvbiBzb2x2ZUFuZ2xlcyAoZXhwcmVzc2lvbnM6IExpbkV4cHJbXSwgYW5nbGVTdW06IG51bWJlcik6IHsgeDogbnVtYmVyOyBhbmdsZXM6IG51bWJlcltdOyB9IHtcbiAgY29uc3QgZXhwcmVzc2lvblN1bSA9IGV4cHJlc3Npb25zLnJlZHVjZSgoZXhwMSwgZXhwMikgPT4gZXhwMS5hZGQoZXhwMikpXG4gIGNvbnN0IHggPSBMaW5FeHByLnNvbHZlKGV4cHJlc3Npb25TdW0sIG5ldyBMaW5FeHByKDAsIGFuZ2xlU3VtKSlcblxuICBjb25zdCBhbmdsZXMgOiBudW1iZXJbXSA9IFtdXG4gIGV4cHJlc3Npb25zLmZvckVhY2goZnVuY3Rpb24gKGV4cHIpIHtcbiAgICBjb25zdCBhbmdsZSA9IGV4cHIuZXZhbCh4KVxuICAgIGlmIChhbmdsZSA8PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ25lZ2F0aXZlIGFuZ2xlJylcbiAgICB9IGVsc2Uge1xuICAgICAgYW5nbGVzLnB1c2goZXhwci5ldmFsKHgpKVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gKHsgeDogeCwgYW5nbGVzOiBhbmdsZXMgfSlcbn1cbiIsImltcG9ydCBMaW5FeHByIGZyb20gJ0xpbkV4cHInXG5pbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4sIHJhbmRFbGVtLCByYW5kTXVsdEJldHdlZW4sIHNodWZmbGUsIHdlYWtJbmNsdWRlcyB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCB7IEFsZ2VicmFPcHRpb25zIH0gZnJvbSAnLi9BbGdlYnJhT3B0aW9ucydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzRGF0YSdcbmltcG9ydCB7IHNvbHZlQW5nbGVzIH0gZnJvbSAnLi9zb2x2ZUFuZ2xlcydcblxuZXhwb3J0IHR5cGUgRXhwcmVzc2lvblR5cGUgPSAnYWRkJyB8ICdtdWx0aXBseScgfCAnbWl4ZWQnXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgaW1wbGVtZW50cyBNaXNzaW5nQW5nbGVzRGF0YSB7XG4gICAgYW5nbGVzOiBudW1iZXJbXVxuICAgIG1pc3Npbmc6IGJvb2xlYW5bXVxuICAgIGFuZ2xlU3VtOiBudW1iZXJcbiAgICBhbmdsZUxhYmVsczogc3RyaW5nW11cbiAgICB4OiBudW1iZXIgLy9cblxuICAgIGNvbnN0cnVjdG9yIChhbmdsZXM6IG51bWJlcltdLCBtaXNzaW5nOiBib29sZWFuW10sIGFuZ2xlU3VtOiBudW1iZXIsIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSwgeDogbnVtYmVyKSB7XG4gICAgICB0aGlzLmFuZ2xlcyA9IGFuZ2xlc1xuICAgICAgdGhpcy5hbmdsZVN1bSA9IGFuZ2xlU3VtXG4gICAgICB0aGlzLmFuZ2xlTGFiZWxzID0gYW5nbGVMYWJlbHNcbiAgICAgIHRoaXMueCA9IHhcbiAgICAgIHRoaXMubWlzc2luZyA9IG1pc3NpbmdcbiAgICB9XG5cbiAgICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBBbGdlYnJhT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEge1xuICAgICAgLy8gY2FsY3VsYXRlZCBkZWZhdWx0cyBpZiBuZWNlc3NhcnlcbiAgICAgIG9wdGlvbnMubWF4Q29uc3RhbnQgPSBvcHRpb25zLm1heENvbnN0YW50IHx8IG9wdGlvbnMuYW5nbGVTdW0hIC8gMiAvLyBndWFyYW50ZWVkIG5vbi1udWxsIGZyb20gYWJvdmVcbiAgICAgIG9wdGlvbnMubWF4WFZhbHVlID0gb3B0aW9ucy5tYXhYVmFsdWUgfHwgb3B0aW9ucy5hbmdsZVN1bSEgLyA0XG5cbiAgICAgIC8vIFJhbmRvbWlzZS9zZXQgdXAgbWFpbiBmZWF0dXJlc1xuICAgICAgY29uc3QgbiA6IG51bWJlciA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTiwgb3B0aW9ucy5tYXhOKVxuXG4gICAgICBjb25zdCB0eXBlIDogRXhwcmVzc2lvblR5cGUgPSByYW5kRWxlbShvcHRpb25zLmV4cHJlc3Npb25UeXBlcyEpIC8vIGd1YXJhbnRlZWQgbm9uLW51bGwgZnJvbSBkZWZhdWwgYXNzaWdubWVudFxuXG4gICAgICAvLyBHZW5lcmF0ZSBleHByZXNzaW9ucy9hbmdsZXNcbiAgICAgIGxldCBleHByZXNzaW9ucyA6IExpbkV4cHJbXVxuICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ21peGVkJzpcbiAgICAgICAgICBleHByZXNzaW9ucyA9IG1ha2VNaXhlZEV4cHJlc3Npb25zKG4sIG9wdGlvbnMgYXMgUmVxdWlyZWQ8QWxnZWJyYU9wdGlvbnM+KVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ211bHRpcGx5JzpcbiAgICAgICAgICBleHByZXNzaW9ucyA9IG1ha2VNdWx0aXBsaWNhdGlvbkV4cHJlc3Npb25zKG4sIG9wdGlvbnMgYXMgUmVxdWlyZWQ8QWxnZWJyYU9wdGlvbnM+KVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ2FkZCc6XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgZXhwcmVzc2lvbnMgPSBtYWtlQWRkRXhwcmVzc2lvbnMobiwgb3B0aW9ucyBhcyBSZXF1aXJlZDxBbGdlYnJhT3B0aW9ucz4pXG4gICAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGV4cHJlc3Npb25zID0gc2h1ZmZsZShleHByZXNzaW9ucylcblxuICAgICAgLy8gU29sdmUgZm9yIHggYW5kIGFuZ2xlc1xuICAgICAgY29uc3QgeyB4LCBhbmdsZXMgfSA6IHt4Om51bWJlciwgYW5nbGVzOiBudW1iZXJbXX0gPSBzb2x2ZUFuZ2xlcyhleHByZXNzaW9ucywgb3B0aW9ucy5hbmdsZVN1bSEpIC8vIG5vbi1udWxsIGZyb20gZGVmYXVsdCBhc3NpZ25lbWVudFxuXG4gICAgICAvLyBsYWJlbHMgYXJlIGp1c3QgZXhwcmVzc2lvbnMgYXMgc3RyaW5nc1xuICAgICAgY29uc3QgbGFiZWxzID0gZXhwcmVzc2lvbnMubWFwKGUgPT4gYCR7ZS50b1N0cmluZ1AoKX1eXFxcXGNpcmNgKVxuXG4gICAgICAvLyBtaXNzaW5nIHZhbHVlcyBhcmUgdGhlIG9uZXMgd2hpY2ggYXJlbid0IGNvbnN0YW50XG4gICAgICBjb25zdCBtaXNzaW5nID0gZXhwcmVzc2lvbnMubWFwKGUgPT4gIWUuaXNDb25zdGFudCgpKVxuXG4gICAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YShhbmdsZXMsIG1pc3NpbmcsIG9wdGlvbnMuYW5nbGVTdW0hLCBsYWJlbHMsIHgpXG4gICAgfVxuXG4gICAgLy8gbWFrZXMgdHlwZXNjcmlwdCBzaHV0IHVwLCBtYWtlcyBlc2xpbnQgbm9pc3lcbiAgICBpbml0TGFiZWxzICgpIDogdm9pZCB7fSAgLy8gZXNsaW50LWRpc2FibGUtbGluZVxufVxuXG5mdW5jdGlvbiBtYWtlTWl4ZWRFeHByZXNzaW9ucyAobjogbnVtYmVyLCBvcHRpb25zOiBSZXF1aXJlZDxBbGdlYnJhT3B0aW9ucz4pIDogTGluRXhwcltdIHtcbiAgY29uc3QgZXhwcmVzc2lvbnM6IExpbkV4cHJbXSA9IFtdXG4gIGNvbnN0IHggPSByYW5kQmV0d2VlbihvcHRpb25zLm1pblhWYWx1ZSwgb3B0aW9ucy5tYXhYVmFsdWUpXG4gIGxldCBsZWZ0ID0gb3B0aW9ucy5hbmdsZVN1bVxuICBsZXQgYWxsY29uc3RhbnQgPSB0cnVlXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbiAtIDE7IGkrKykge1xuICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbigxLCBvcHRpb25zLm1heENvZWZmaWNpZW50KVxuICAgIGxlZnQgLT0gYSAqIHhcbiAgICBjb25zdCBtYXhiID0gTWF0aC5taW4obGVmdCAtIG9wdGlvbnMubWluQW5nbGUgKiAobiAtIGkgLSAxKSwgb3B0aW9ucy5tYXhDb25zdGFudClcbiAgICBjb25zdCBtaW5iID0gb3B0aW9ucy5taW5BbmdsZSAtIGEgKiB4XG4gICAgY29uc3QgYiA9IHJhbmRCZXR3ZWVuKG1pbmIsIG1heGIpXG4gICAgaWYgKGEgIT09IDApIHsgYWxsY29uc3RhbnQgPSBmYWxzZSB9XG4gICAgbGVmdCAtPSBiXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihhLCBiKSlcbiAgfVxuICBjb25zdCBsYXN0TWluWENvZWZmID0gYWxsY29uc3RhbnQgPyAxIDogb3B0aW9ucy5taW5Db2VmZmljaWVudFxuICBjb25zdCBhID0gcmFuZEJldHdlZW4obGFzdE1pblhDb2VmZiwgb3B0aW9ucy5tYXhDb2VmZmljaWVudClcbiAgY29uc3QgYiA9IGxlZnQgLSBhICogeFxuICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKGEsIGIpKVxuXG4gIHJldHVybiBleHByZXNzaW9uc1xufVxuXG5mdW5jdGlvbiBtYWtlQWRkRXhwcmVzc2lvbnMgKG46IG51bWJlciwgb3B0aW9uczogUmVxdWlyZWQ8QWxnZWJyYU9wdGlvbnM+KSA6IExpbkV4cHJbXSB7XG4gIGNvbnN0IGV4cHJlc3Npb25zOiBMaW5FeHByW10gPSBbXVxuICBjb25zdCBhbmdsZXM6IG51bWJlcltdID0gW11cbiAgY29uc3QgY29uc3RhbnRzID0gKG9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cyA9PT0gdHJ1ZSB8fCB3ZWFrSW5jbHVkZXMob3B0aW9ucy5pbmNsdWRlQ29uc3RhbnRzLCAnYWRkJykpXG4gIGlmIChuID09PSAyICYmIG9wdGlvbnMuZW5zdXJlWCAmJiBjb25zdGFudHMpIG4gPSAzXG5cbiAgY29uc3QgeCA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluWFZhbHVlLCBvcHRpb25zLm1heFhWYWx1ZSlcbiAgbGV0IGxlZnQgPSBvcHRpb25zLmFuZ2xlU3VtXG4gIGxldCBhbmdsZXNMZWZ0ID0gblxuXG4gIC8vIGZpcnN0IGRvIHRoZSBleHByZXNzaW9ucyBlbnN1cmVkIGJ5IGVuc3VyZV94IGFuZCBjb25zdGFudHNcbiAgaWYgKG9wdGlvbnMuZW5zdXJlWCkge1xuICAgIGFuZ2xlc0xlZnQtLVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgMCkpXG4gICAgYW5nbGVzLnB1c2goeClcbiAgICBsZWZ0IC09IHhcbiAgfVxuXG4gIGlmIChjb25zdGFudHMpIHtcbiAgICBhbmdsZXNMZWZ0LS1cbiAgICBjb25zdCBjID0gcmFuZEJldHdlZW4oXG4gICAgICBvcHRpb25zLm1pbkFuZ2xlLFxuICAgICAgbGVmdCAtIG9wdGlvbnMubWluQW5nbGUgKiBhbmdsZXNMZWZ0XG4gICAgKVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMCwgYykpXG4gICAgYW5nbGVzLnB1c2goYylcbiAgICBsZWZ0IC09IGNcbiAgfVxuXG4gIC8vIG1pZGRsZSBhbmdsZXNcbiAgd2hpbGUgKGFuZ2xlc0xlZnQgPiAxKSB7XG4gICAgLy8gYWRkICd4K2InIGFzIGFuIGV4cHJlc3Npb24uIE1ha2Ugc3VyZSBiIGdpdmVzIHNwYWNlXG4gICAgYW5nbGVzTGVmdC0tXG4gICAgbGVmdCAtPSB4XG4gICAgY29uc3QgbWF4YiA9IE1hdGgubWluKFxuICAgICAgbGVmdCAtIG9wdGlvbnMubWluQW5nbGUgKiBhbmdsZXNMZWZ0LFxuICAgICAgb3B0aW9ucy5tYXhDb25zdGFudFxuICAgIClcbiAgICBjb25zdCBtaW5iID0gTWF0aC5tYXgoXG4gICAgICBvcHRpb25zLm1pbkFuZ2xlIC0geCxcbiAgICAgIC1vcHRpb25zLm1heENvbnN0YW50XG4gICAgKVxuICAgIGNvbnN0IGIgPSByYW5kQmV0d2VlbihtaW5iLCBtYXhiKVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgYikpXG4gICAgYW5nbGVzLnB1c2goeCArIGIpXG4gICAgbGVmdCAtPSBiXG4gIH1cblxuICAvLyBsYXN0IGFuZ2xlXG4gIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgbGVmdCAtIHgpKVxuICBhbmdsZXMucHVzaChsZWZ0KVxuXG4gIHJldHVybiBleHByZXNzaW9uc1xufVxuXG5mdW5jdGlvbiBtYWtlTXVsdGlwbGljYXRpb25FeHByZXNzaW9ucyAobjogbnVtYmVyLCBvcHRpb25zOiBBbGdlYnJhT3B0aW9ucykgOiBMaW5FeHByW10ge1xuICBjb25zdCBleHByZXNzaW9ucyA6IExpbkV4cHJbXSA9IFtdXG5cbiAgY29uc3QgY29uc3RhbnRzIDogYm9vbGVhbiA9IChvcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPT09IHRydWUgfHwgd2Vha0luY2x1ZGVzKG9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cywgJ211bHQnKSlcbiAgaWYgKG4gPT09IDIgJiYgb3B0aW9ucy5lbnN1cmVYICYmIGNvbnN0YW50cykgbiA9IDMgLy8gbmVlZCBhdCBsZWFzdCAzIGFuZ2xlcyBmb3IgdGhpcyB0byBtYWtlIHNlbnNlXG5cbiAgLy8gY2hvb3NlIGEgdG90YWwgb2YgY29lZmZpY2llbnRzXG4gIC8vIHBpY2sgeCBiYXNlZCBvbiB0aGF0XG4gIGxldCBhbmdsZXNsZWZ0ID0gblxuICBjb25zdCB0b3RhbENvZWZmID0gY29uc3RhbnRzXG4gICAgPyByYW5kQmV0d2VlbihuLCAob3B0aW9ucy5hbmdsZVN1bSAtIG9wdGlvbnMubWluQW5nbGUpIC8gb3B0aW9ucy5taW5BbmdsZSwgTWF0aC5yYW5kb20pIC8vIGlmIGl0J3MgdG9vIGJpZywgYW5nbGVzIGdldCB0b28gc21hbGxcbiAgICA6IHJhbmRFbGVtKFszLCA0LCA1LCA2LCA4LCA5LCAxMF0uZmlsdGVyKHggPT4geCA+PSBuKSwgTWF0aC5yYW5kb20pXG4gIGxldCBjb2VmZmxlZnQgPSB0b3RhbENvZWZmXG5cbiAgLy8gZmlyc3QgMC8xLzJcbiAgaWYgKGNvbnN0YW50cykge1xuICAgIC8vIHJlZHVjZSB0byBtYWtlIHdoYXQncyBsZWZ0IGEgbXVsdGlwbGUgb2YgdG90YWxfY29lZmZcbiAgICBhbmdsZXNsZWZ0LS1cbiAgICBjb25zdCBuZXdsZWZ0ID0gcmFuZE11bHRCZXR3ZWVuKHRvdGFsQ29lZmYgKiBvcHRpb25zLm1pbkFuZ2xlLCBvcHRpb25zLmFuZ2xlU3VtIC0gb3B0aW9ucy5taW5BbmdsZSwgdG90YWxDb2VmZilcbiAgICBjb25zdCBjID0gb3B0aW9ucy5hbmdsZVN1bSAtIG5ld2xlZnRcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDAsIGMpKVxuICB9XG5cbiAgLy8gRG9uJ3QgdXNlIHggaGVyZSwgYnV0OlxuICAvLyB4ID0gbGVmdCAvIHRvdGFsQ29lZmZcblxuICBpZiAob3B0aW9ucy5lbnN1cmVYKSB7XG4gICAgYW5nbGVzbGVmdC0tXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCAwKSlcbiAgICBjb2VmZmxlZnQgLT0gMVxuICB9XG5cbiAgLy8gbWlkZGxlXG4gIHdoaWxlIChhbmdsZXNsZWZ0ID4gMSkge1xuICAgIGFuZ2xlc2xlZnQtLVxuICAgIGNvbnN0IG1pbmEgPSAxXG4gICAgY29uc3QgbWF4YSA9IGNvZWZmbGVmdCAtIGFuZ2xlc2xlZnQgLy8gbGVhdmUgZW5vdWdoIGZvciBvdGhlcnMgVE9ETzogYWRkIG1heF9jb2VmZlxuICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbihtaW5hLCBtYXhhKVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoYSwgMCkpXG4gICAgY29lZmZsZWZ0IC09IGFcbiAgfVxuXG4gIC8vIGxhc3RcbiAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihjb2VmZmxlZnQsIDApKVxuICByZXR1cm4gZXhwcmVzc2lvbnNcbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3IGV4dGVuZHMgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcge1xuICAvLyBPIDogUG9pbnQgICAgICBJbmhlcml0ZWQgZnJvbSBNaXNzaW5nQW5nbGVzQXJvdW5kVmlld1xuICAvLyBBOiBQb2ludCAgICAgICAgIHxcbiAgLy8gQzogUG9pbnRbXSAgICAgICB8XG4gIC8vIHJvdGF0aW9uOiBudW1iZXIgVlxuXG4gICAgLy8gbGFiZWxzOiBMYWJlbFtdICAgICAgICAgICAgSW5oZXJpdGVkIGZyb20gR3JhcGhpY1FWaWV3XG4gICAgLy8gY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCAgICAgIHxcbiAgICAvLyBET006IEhUTUxFbGVtZW50ICAgICAgICAgICAgICAgfFxuICAgIC8vIHdpZHRoOiBudW1iZXIgICAgICAgICAgICAgICAgICB8XG4gICAgLy8gaGVpZ2h0OiBudW1iZXIgICAgICAgICAgICAgICAgIFZcbiAgICBkYXRhITogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIC8vIGluaXRpYWxpc2VkIGJ5IHN1cGVyKClcblxuICAgIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEsIG9wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykge1xuICAgICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc3VwZXIgY29uc3RydWN0b3IgZG9lcyByZWFsIHdvcmtcbiAgICAgIGNvbnN0IHNvbHV0aW9uTGFiZWw6IFBhcnRpYWw8TGFiZWw+ID0ge1xuICAgICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdGhpcy5oZWlnaHQgLSAxMCksXG4gICAgICAgIHRleHRxOiAnJyxcbiAgICAgICAgdGV4dGE6IGB4ID0gJHt0aGlzLmRhdGEueH1eXFxcXGNpcmNgLFxuICAgICAgICBzdHlsZXE6ICdoaWRkZW4nLFxuICAgICAgICBzdHlsZWE6ICdleHRyYS1hbnN3ZXInXG4gICAgICB9XG4gICAgICBzb2x1dGlvbkxhYmVsLnN0eWxlID0gc29sdXRpb25MYWJlbC5zdHlsZXFcbiAgICAgIHNvbHV0aW9uTGFiZWwudGV4dCA9IHNvbHV0aW9uTGFiZWwudGV4dHFcblxuICAgICAgdGhpcy5sYWJlbHMucHVzaChzb2x1dGlvbkxhYmVsIGFzIExhYmVsKVxuICAgIH1cbn1cbiIsIi8qKiBNaXNzaW5nIGFuZ2xlcyBhcm91bmQgYSBwb2ludCBvciBvbiBhIHN0cmFpZ2h0IGxpbmUsIHVzaW5nIGFsZ2VicmFpYyBleHByZXNzaW9ucyAqL1xuXG5pbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCB7IEFsZ2VicmFPcHRpb25zIH0gZnJvbSAnLi9BbGdlYnJhT3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3J1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzVmlld09wdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSAvLyBpbml0aWFsaXNlZCBpbiBzdXBlcigpXG4gIHZpZXchOiBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXdcblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBQYXJ0aWFsPEFsZ2VicmFPcHRpb25zPiwgdmlld09wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEge1xuICAgIGNvbnN0IGRlZmF1bHRzIDogQWxnZWJyYU9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDE1LFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDQsXG4gICAgICByZXBlYXRlZDogZmFsc2UsXG4gICAgICBleHByZXNzaW9uVHlwZXM6IFsnYWRkJywgJ211bHRpcGx5JywgJ21peGVkJ10sXG4gICAgICBlbnN1cmVYOiB0cnVlLFxuICAgICAgaW5jbHVkZUNvbnN0YW50czogdHJ1ZSxcbiAgICAgIG1pbkNvZWZmaWNpZW50OiAxLFxuICAgICAgbWF4Q29lZmZpY2llbnQ6IDQsXG4gICAgICBtaW5YVmFsdWU6IDE1XG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzOiBBbGdlYnJhT3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YS5yYW5kb20oc2V0dGluZ3MpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcoZGF0YSwgdmlld09wdGlvbnMpIC8vIFRPRE8gZWxpbWluYXRlIHB1YmxpYyBjb25zdHJ1Y3RvcnNcblxuICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG5cbiAgc3RhdGljIGdldCBvcHRpb25zU3BlYyAoKSA6IE9wdGlvbnNTcGVjIHtcbiAgICByZXR1cm4gW1xuICAgICAge1xuICAgICAgICBpZDogJ2V4cHJlc3Npb25UeXBlcycsXG4gICAgICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICAgICAgdGl0bGU6ICdUeXBlcyBvZiBleHByZXNzaW9uJyxcbiAgICAgICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgICAgIHsgdGl0bGU6ICc8ZW0+YTwvZW0+KzxlbT54PC9lbT4nLCBpZDogJ2FkZCcgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnPGVtPmF4PC9lbT4nLCBpZDogJ211bHRpcGx5JyB9LFxuICAgICAgICAgIHsgdGl0bGU6ICdtaXhlZCcsIGlkOiAnbWl4ZWQnIH1cbiAgICAgICAgXSxcbiAgICAgICAgZGVmYXVsdDogWydhZGQnLCAnbXVsdGlwbHknLCAnbWl4ZWQnXVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgaWQ6ICdlbnN1cmVYJyxcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJ0Vuc3VyZSBvbmUgYW5nbGUgaXMgPGVtPng8L2VtPicsXG4gICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiAnaW5jbHVkZUNvbnN0YW50cycsXG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgdGl0bGU6ICdFbnN1cmUgYSBjb25zdGFudCBhbmdsZScsXG4gICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgIH1cbiAgICBdXG4gIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3J1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldyBleHRlbmRzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcge1xuICBkYXRhITogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIC8vIGluaXRpYWxpc2VkIGluIHN1cGVyLnN1cGVyXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEsIG9wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucylcblxuICAgIGNvbnN0IHNvbHV0aW9uTGFiZWw6IFBhcnRpYWw8TGFiZWw+ID0ge1xuICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIHRoaXMuaGVpZ2h0IC0gMTApLFxuICAgICAgdGV4dHE6ICcnLFxuICAgICAgdGV4dGE6IGB4ID0gJHt0aGlzLmRhdGEueH1eXFxcXGNpcmNgLFxuICAgICAgc3R5bGVxOiAnaGlkZGVuJyxcbiAgICAgIHN0eWxlYTogJ2V4dHJhLWFuc3dlcidcbiAgICB9XG4gICAgc29sdXRpb25MYWJlbC5zdHlsZSA9IHNvbHV0aW9uTGFiZWwuc3R5bGVxXG4gICAgc29sdXRpb25MYWJlbC50ZXh0ID0gc29sdXRpb25MYWJlbC50ZXh0cVxuXG4gICAgdGhpcy5sYWJlbHMucHVzaChzb2x1dGlvbkxhYmVsIGFzIExhYmVsKVxuICB9XG59XG4iLCJpbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tICcuL0FsZ2VicmFPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFWaWV3J1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3J1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YVxuICB2aWV3ITogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlld1xuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFBhcnRpYWw8QWxnZWJyYU9wdGlvbnM+LCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEge1xuICAgIGNvbnN0IG9wdGlvbnNPdmVycmlkZSA6IFBhcnRpYWw8QWxnZWJyYU9wdGlvbnM+ID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbk46IDMsXG4gICAgICBtYXhOOiAzLFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlXG4gICAgfVxuICAgIGNvbnN0IGRlZmF1bHRzIDogQWxnZWJyYU9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDMsXG4gICAgICByZXBlYXRlZDogZmFsc2UsXG4gICAgICBtaW5BbmdsZTogMjUsXG4gICAgICBleHByZXNzaW9uVHlwZXM6IFsnYWRkJywgJ211bHRpcGx5JywgJ21peGVkJ10sXG4gICAgICBlbnN1cmVYOiB0cnVlLFxuICAgICAgaW5jbHVkZUNvbnN0YW50czogdHJ1ZSxcbiAgICAgIG1pbkNvZWZmaWNpZW50OiAxLFxuICAgICAgbWF4Q29lZmZpY2llbnQ6IDQsXG4gICAgICBtaW5YVmFsdWU6IDE1XG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzOiBBbGdlYnJhT3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zLCBvcHRpb25zT3ZlcnJpZGUpXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLnJhbmRvbShzZXR0aW5ncylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFWaWV3KGRhdGEsIHZpZXdPcHRpb25zKVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBMYWJlbCB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3J1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXcgZXh0ZW5kcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IHtcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIC8vIGluaXRpYWxpc2VkIGluIHN1cGVyXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSwgb3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKVxuICAgIHN1cGVyLnNjYWxlVG9GaXQodGhpcy53aWR0aCwgdGhpcy5oZWlnaHQsIDQwKVxuICAgIHN1cGVyLnRyYW5zbGF0ZSgwLCAtMzApXG5cbiAgICBjb25zdCBpbnN0cnVjdGlvbkxhYmVsOiBMYWJlbCA9IHtcbiAgICAgIHRleHRxOiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICB0ZXh0YTogdGhpcy5kYXRhLmluc3RydWN0aW9ucy5qb2luKCdcXFxcXFxcXCcpLFxuICAgICAgdGV4dDogdGhpcy5kYXRhLmluc3RydWN0aW9ucy5qb2luKCdcXFxcXFxcXCcpLFxuICAgICAgc3R5bGVxOiAnZXh0cmEtaW5mbycsXG4gICAgICBzdHlsZWE6ICdleHRyYS1pbmZvJyxcbiAgICAgIHN0eWxlOiAnZXh0cmEtaW5mbycsXG4gICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdGhpcy5oZWlnaHQgLSAxMClcbiAgICB9XG4gICAgdGhpcy5sYWJlbHMucHVzaChpbnN0cnVjdGlvbkxhYmVsKVxuICB9XG59XG4iLCJpbXBvcnQgTGluRXhwciBmcm9tICdMaW5FeHByJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4sIHJhbmRFbGVtLCByYW5kTXVsdEJldHdlZW4gfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUURhdGEgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEnXG5pbXBvcnQgeyBzb2x2ZUFuZ2xlcyB9IGZyb20gJy4vc29sdmVBbmdsZXMnXG5pbXBvcnQgeyBXb3JkZWRPcHRpb25zIH0gZnJvbSAnLi9Xb3JkZWRPcHRpb25zJ1xuXG5leHBvcnQgdHlwZSBXb3JkZWRUeXBlID0gJ2FkZCcgfCAnbXVsdGlwbHknIHwgJ3JhdGlvJyB8ICdwZXJjZW50J1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSBpbXBsZW1lbnRzIEdyYXBoaWNRRGF0YSB7XG4gIGFuZ2xlczogbnVtYmVyW11cbiAgbWlzc2luZzogYm9vbGVhbltdXG4gIGFuZ2xlU3VtOiBudW1iZXJcbiAgYW5nbGVMYWJlbHM6IHN0cmluZ1tdXG4gIGluc3RydWN0aW9uczogc3RyaW5nW10gLy8gVGhlICdpbnN0cnVjdGlvbnMnIGdpdmVuXG5cbiAgY29uc3RydWN0b3IgKGFuZ2xlczogbnVtYmVyW10sIG1pc3Npbmc6IGJvb2xlYW5bXSwgYW5nbGVTdW06IG51bWJlciwgYW5nbGVMYWJlbHM6IHN0cmluZ1tdLCBpbnN0cnVjdGlvbnM6IHN0cmluZ1tdKSB7XG4gICAgdGhpcy5hbmdsZXMgPSBhbmdsZXNcbiAgICB0aGlzLm1pc3NpbmcgPSBtaXNzaW5nXG4gICAgdGhpcy5hbmdsZVN1bSA9IGFuZ2xlU3VtXG4gICAgdGhpcy5hbmdsZUxhYmVscyA9IGFuZ2xlTGFiZWxzXG4gICAgdGhpcy5pbnN0cnVjdGlvbnMgPSBpbnN0cnVjdGlvbnNcbiAgICB0aGlzLmluc3RydWN0aW9ucyA9IGluc3RydWN0aW9uc1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9ucyA6IFdvcmRlZE9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEge1xuICAgIGNvbnN0IG4gPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbk4sIG9wdGlvbnMubWF4TilcbiAgICBjb25zdCBhbmdsZUxhYmVsczogc3RyaW5nW10gPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBhbmdsZUxhYmVsc1tpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKSAvLyA2NSA9ICdBJ1xuICAgIH1cbiAgICBsZXQgZXhwcmVzc2lvbnM6IExpbkV4cHJbXSA9IFtdXG4gICAgbGV0IGluc3RydWN0aW9uczogc3RyaW5nW10gPSBbXVxuXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCAwKSlcblxuICAgIC8vIExvb3AgdGlsIHdlIGdldCBvbmUgdGhhdCB3b3Jrc1xuICAgIC8vIFByb2JhYmx5IHJlYWxseSBpbmVmZmljaWVudCEhXG5cbiAgICBsZXQgc3VjY2VzcyA9IGZhbHNlXG4gICAgbGV0IGF0dGVtcHRjb3VudCA9IDBcbiAgICB3aGlsZSAoIXN1Y2Nlc3MpIHtcbiAgICAgIGlmIChhdHRlbXB0Y291bnQgPiAyMCkge1xuICAgICAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKVxuICAgICAgICBjb25zb2xlLmxvZygnR2F2ZSB1cCBhZnRlciAnICsgYXR0ZW1wdGNvdW50ICsgJyBhdHRlbXB0cycpXG4gICAgICAgIHN1Y2Nlc3MgPSB0cnVlXG4gICAgICB9XG4gICAgICBmb3IgKGxldCBpID0gMTsgaSA8IG47IGkrKykge1xuICAgICAgICBjb25zdCB0eXBlID0gcmFuZEVsZW0ob3B0aW9ucy50eXBlcylcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgY2FzZSAnYWRkJzoge1xuICAgICAgICAgICAgY29uc3QgYWRkZW5kID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5BZGRlbmQsIG9wdGlvbnMubWF4QWRkZW5kKVxuICAgICAgICAgICAgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uc1tpIC0gMV0uYWRkKGFkZGVuZCkpXG4gICAgICAgICAgICBpbnN0cnVjdGlvbnMucHVzaChgXFxcXHRleHR7QW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpfSQgaXMgJHtjb21wYXJhdG9yKGFkZGVuZCwgJysnKX0gYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NCArIGkpfSR9YClcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ211bHRpcGx5Jzoge1xuICAgICAgICAgICAgY29uc3QgbXVsdGlwbGllciA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTXVsdGlwbGllciwgb3B0aW9ucy5tYXhNdWx0aXBsaWVyKVxuICAgICAgICAgICAgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uc1tpIC0gMV0udGltZXMobXVsdGlwbGllcikpXG4gICAgICAgICAgICBpbnN0cnVjdGlvbnMucHVzaChgXFxcXHRleHR7QW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpfSQgaXMgJHtjb21wYXJhdG9yKG11bHRpcGxpZXIsICcqJyl9IGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjQgKyBpKX0kfWApXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlICdwZXJjZW50Jzoge1xuICAgICAgICAgICAgY29uc3QgcGVyY2VudGFnZSA9IHJhbmRNdWx0QmV0d2Vlbig1LCAxMDAsIDUpXG4gICAgICAgICAgICBjb25zdCBpbmNyZWFzZSA9IE1hdGgucmFuZG9tKCkgPCAwLjVcbiAgICAgICAgICAgIGNvbnN0IG11bHRpcGxpZXIgPSBpbmNyZWFzZSA/IDEgKyBwZXJjZW50YWdlIC8gMTAwIDogMSAtIHBlcmNlbnRhZ2UgLyAxMDBcbiAgICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2goZXhwcmVzc2lvbnNbaSAtIDFdLnRpbWVzKG11bHRpcGxpZXIpKVxuICAgICAgICAgICAgaW5zdHJ1Y3Rpb25zLnB1c2goXG4gICAgICAgICAgICAgIGBcXFxcdGV4dHtBbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSl9JCBpcyAkJHtwZXJjZW50YWdlfVxcXFwlJCAke2luY3JlYXNlID8gJ2JpZ2dlcicgOiAnc21hbGxlcid9IHRoYW4gYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NCArIGkpfSR9YClcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ3JhdGlvJzoge1xuICAgICAgICAgICAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKDEsIDEwKVxuICAgICAgICAgICAgY29uc3QgYiA9IHJhbmRCZXR3ZWVuKDEsIDEwKVxuICAgICAgICAgICAgY29uc3QgbXVsdGlwbGllciA9IGIgLyBhXG4gICAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb25zW2kgLSAxXS50aW1lcyhtdWx0aXBsaWVyKSlcbiAgICAgICAgICAgIGluc3RydWN0aW9ucy5wdXNoKFxuICAgICAgICAgICAgICBgXFxcXHRleHR7VGhlIHJhdGlvIG9mIGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjQgKyBpKX0kIHRvIGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKX0kIGlzICQke2F9OiR7Yn0kfWBcbiAgICAgICAgICAgIClcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGNoZWNrIGl0IG1ha2VzIHNlbnNlXG4gICAgICBzdWNjZXNzID0gdHJ1ZVxuICAgICAgY29uc3QgZXhwcmVzc2lvbnN1bSA9IGV4cHJlc3Npb25zLnJlZHVjZSgoZXhwMSwgZXhwMikgPT4gZXhwMS5hZGQoZXhwMikpXG4gICAgICBjb25zdCB4ID0gTGluRXhwci5zb2x2ZShleHByZXNzaW9uc3VtLCBuZXcgTGluRXhwcigwLCBvcHRpb25zLmFuZ2xlU3VtKSlcblxuICAgICAgZXhwcmVzc2lvbnMuZm9yRWFjaChmdW5jdGlvbiAoZXhwcikge1xuICAgICAgICBpZiAoIXN1Y2Nlc3MgfHwgZXhwci5ldmFsKHgpIDwgb3B0aW9ucy5taW5BbmdsZSkge1xuICAgICAgICAgIHN1Y2Nlc3MgPSBmYWxzZVxuICAgICAgICAgIGluc3RydWN0aW9ucyA9IFtdXG4gICAgICAgICAgZXhwcmVzc2lvbnMgPSBbZXhwcmVzc2lvbnNbMF1dXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIGF0dGVtcHRjb3VudCsrXG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdBdHRlbXB0czogJyArIGF0dGVtcHRjb3VudClcblxuICAgIGNvbnN0IGFuZ2xlcyA9IHNvbHZlQW5nbGVzKGV4cHJlc3Npb25zLCBvcHRpb25zLmFuZ2xlU3VtKS5hbmdsZXNcbiAgICBjb25zdCBtaXNzaW5nID0gYW5nbGVzLm1hcCgoKSA9PiB0cnVlKVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGFuZ2xlcywgbWlzc2luZywgb3B0aW9ucy5hbmdsZVN1bSwgYW5nbGVMYWJlbHMsIGluc3RydWN0aW9ucylcbiAgfVxuXG4gIC8vIG1ha2VzIHR5cGVzY3JpcHQgc2h1dCB1cCwgbWFrZXMgZXNsaW50IG5vaXN5XG4gIGluaXRMYWJlbHMoKTogdm9pZCB7IH0gIC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZXMgd29yZGVkIHZlcnNpb24gb2YgYW4gb3BlcmF0aW9cbiAqIEBwYXJhbSBudW1iZXIgVGhlIG11bHRpcGxpZXIgb3IgYWRkZW5kXG4gKiBAcGFyYW0gb3BlcmF0b3IgVGhlIG9wZXJhdG9yLCBlLmcgYWRkaW5nICdtb3JlIHRoYW4nLCBvciBtdWx0aXBseWluZyAndGltZXMgbGFyZ2VyIHRoYW4nXG4gKi9cbmZ1bmN0aW9uIGNvbXBhcmF0b3IgKG51bWJlcjogbnVtYmVyLCBvcGVyYXRvcjogJyonfCcrJykge1xuICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgY2FzZSAnKic6XG4gICAgICBzd2l0Y2ggKG51bWJlcikge1xuICAgICAgICBjYXNlIDE6IHJldHVybiAndGhlIHNhbWUgYXMnXG4gICAgICAgIGNhc2UgMjogcmV0dXJuICdkb3VibGUnXG4gICAgICAgIGRlZmF1bHQ6IHJldHVybiBgJCR7bnVtYmVyfSQgdGltZXMgbGFyZ2VyIHRoYW5gXG4gICAgICB9XG4gICAgY2FzZSAnKyc6XG4gICAgICBzd2l0Y2ggKG51bWJlcikge1xuICAgICAgICBjYXNlIDA6IHJldHVybiAndGhlIHNhbWUgYXMnXG4gICAgICAgIGRlZmF1bHQ6IHJldHVybiBgJCR7TWF0aC5hYnMobnVtYmVyKS50b1N0cmluZygpfV5cXFxcY2lyYyQgJHsobnVtYmVyIDwgMCkgPyAnbGVzcyB0aGFuJyA6ICdtb3JlIHRoYW4nfWBcbiAgICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkVmlldydcbmltcG9ydCBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhJ1xuaW1wb3J0IHsgV29yZGVkT3B0aW9ucyB9IGZyb20gJy4vV29yZGVkT3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhXG4gIHZpZXchOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogUGFydGlhbDxXb3JkZWRPcHRpb25zPiwgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEge1xuICAgIGNvbnN0IG9wdGlvbnNPdmVycmlkZSA6IFBhcnRpYWw8V29yZGVkT3B0aW9ucz4gPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDMsXG4gICAgICByZXBlYXRlZDogZmFsc2VcbiAgICB9XG4gICAgY29uc3QgZGVmYXVsdHMgOiBXb3JkZWRPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAyNSxcbiAgICAgIG1pbk46IDMsXG4gICAgICBtYXhOOiAzLFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlLFxuICAgICAgbWluQWRkZW5kOiAtNjAsXG4gICAgICBtYXhBZGRlbmQ6IDYwLFxuICAgICAgbWluTXVsdGlwbGllcjogMSxcbiAgICAgIG1heE11bHRpcGxpZXI6IDUsXG4gICAgICB0eXBlczogWydhZGQnLCAnbXVsdGlwbHknLCAncGVyY2VudCcsICdyYXRpbyddXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzOiBXb3JkZWRPcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMsIG9wdGlvbnNPdmVycmlkZSlcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YS5yYW5kb20oc2V0dGluZ3MpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3KGRhdGEsIHZpZXdPcHRpb25zKVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBMYWJlbCB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldyBleHRlbmRzIE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IHtcbiAgZGF0YSE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIC8vIGluaXRpYWxpc2VkIGluIGNhbGwgdG8gc3VwZXJcbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLCBvcHRpb25zOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBkb2VzIG1vc3Qgb2YgdGhlIHNldCB1cFxuICAgIHN1cGVyLnRyYW5zbGF0ZSgwLCAtMTUpXG4gICAgY29uc3QgaW5zdHJ1Y3Rpb25MYWJlbCA6IExhYmVsID0ge1xuICAgICAgdGV4dHE6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHRleHRhOiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICB0ZXh0OiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICBzdHlsZXE6ICdleHRyYS1pbmZvJyxcbiAgICAgIHN0eWxlYTogJ2V4dHJhLWluZm8nLFxuICAgICAgc3R5bGU6ICdleHRyYS1pbmZvJyxcbiAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwKVxuICAgIH1cbiAgICB0aGlzLmxhYmVscy5wdXNoKGluc3RydWN0aW9uTGFiZWwpXG4gIH1cbn1cbiIsImltcG9ydCB7IE9wdGlvbnNTcGVjIH0gZnJvbSAnT3B0aW9uc1NwZWMnXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhJ1xuaW1wb3J0IHsgV29yZGVkT3B0aW9ucyB9IGZyb20gJy4vV29yZGVkT3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1dvcmRlZFEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGEhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YVxuICB2aWV3ITogTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXdcblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBQYXJ0aWFsPFdvcmRlZE9wdGlvbnM+LCB2aWV3T3B0aW9uczogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNXb3JkZWRRIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IFdvcmRlZE9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDE1LFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDIsXG4gICAgICByZXBlYXRlZDogZmFsc2UsXG4gICAgICBtaW5BZGRlbmQ6IC05MCxcbiAgICAgIG1heEFkZGVuZDogOTAsXG4gICAgICBtaW5NdWx0aXBsaWVyOiAxLFxuICAgICAgbWF4TXVsdGlwbGllcjogNSxcbiAgICAgIHR5cGVzOiBbJ2FkZCcsICdtdWx0aXBseScsICdwZXJjZW50JywgJ3JhdGlvJ11cbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YS5yYW5kb20oc2V0dGluZ3MpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldyhkYXRhLCB2aWV3T3B0aW9ucylcblxuICAgIHJldHVybiBuZXcgdGhpcyhkYXRhLCB2aWV3KVxuICB9XG5cbiAgc3RhdGljIGdldCBvcHRpb25zU3BlYyAoKTogT3B0aW9uc1NwZWMge1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICAgICAgdGl0bGU6ICdRdWVzdGlvbiB0eXBlcycsXG4gICAgICAgIGlkOiAndHlwZXMnLFxuICAgICAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICAgICAgeyB0aXRsZTogJ01vcmUgdGhhbi9sZXNzIHRoYW4nLCBpZDogJ2FkZCcgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnTXVsdGlwbGVzJywgaWQ6ICdtdWx0aXBseScgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnUGVyY2VudGFnZSBjaGFuZ2UnLCBpZDogJ3BlcmNlbnQnIH0sXG4gICAgICAgICAgeyB0aXRsZTogJ1JhdGlvcycsIGlkOiAncmF0aW8nIH1cbiAgICAgICAgXSxcbiAgICAgICAgZGVmYXVsdDogWydhZGQnLCAnbXVsdGlwbHknXVxuICAgICAgfVxuICAgIF1cbiAgfVxufVxuIiwiLyoqICBDbGFzcyB0byB3cmFwIHZhcmlvdXMgbWlzc2luZyBhbmdsZXMgY2xhc3Nlc1xuICogUmVhZHMgb3B0aW9ucyBhbmQgdGhlbiB3cmFwcyB0aGUgYXBwcm9wcmlhdGUgb2JqZWN0LCBtaXJyb3JpbmcgdGhlIG1haW5cbiAqIHB1YmxpYyBtZXRob2RzXG4gKlxuICogVGhpcyBjbGFzcyBkZWFscyB3aXRoIHRyYW5zbGF0aW5nIGRpZmZpY3VsdHkgaW50byBxdWVzdGlvbiB0eXBlc1xuKi9cblxuaW1wb3J0IHsgT3B0aW9uc1NwZWMgfSBmcm9tICdPcHRpb25zU3BlYydcbmltcG9ydCB7IHJhbmRFbGVtIH0gZnJvbSAndXRpbGl0aWVzJ1xuXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFEgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5cbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUSdcbmltcG9ydCB7IEFsZ2VicmFPcHRpb25zIH0gZnJvbSAnLi9BbGdlYnJhT3B0aW9ucydcblxuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWRRIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZFEnXG5pbXBvcnQgeyBXb3JkZWRPcHRpb25zIH0gZnJvbSAnLi9Xb3JkZWRPcHRpb25zJ1xuXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxudHlwZSBRdWVzdGlvblR5cGUgPSAnYW9zbCcgfCAnYWFhcCcgfCAndHJpYW5nbGUnXG50eXBlIFF1ZXN0aW9uU3ViVHlwZSA9ICdzaW1wbGUnIHwgJ3JlcGVhdGVkJyB8ICdhbGdlYnJhJyB8ICd3b3JkZWQnXG5cbnR5cGUgUXVlc3Rpb25PcHRpb25zID0gTWlzc2luZ0FuZ2xlT3B0aW9ucyAmIEFsZ2VicmFPcHRpb25zICYgV29yZGVkT3B0aW9ucyAvLyBvcHRpb25zIHRvIHBhc3MgdG8gcXVlc3Rpb25zXG5cbi8qKiBUaGUgb3B0aW9ucyBwYXNzZWQgdXNpbmcgb3B0aW9uc1NwZWMgKi9cbmludGVyZmFjZSBXcmFwcGVyT3B0aW9ucyB7XG4gIGRpZmZpY3VsdHk6IG51bWJlcixcbiAgdHlwZXM6IFF1ZXN0aW9uVHlwZVtdLFxuICBjdXN0b206IGJvb2xlYW4sXG4gIG1pbk46IG51bWJlcixcbiAgbWF4TjogbnVtYmVyLFxuICBzaW1wbGU6IGJvb2xlYW4sXG4gIHJlcGVhdGVkOiBib29sZWFuLFxuICBhbGdlYnJhOiBib29sZWFuLFxuICBhbGdlYnJhT3B0aW9uczogQWxnZWJyYU9wdGlvbnNcbiAgd29yZGVkOiBib29sZWFuLFxuICB3b3JkZWRPcHRpb25zOiBXb3JkZWRPcHRpb25zXG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBxdWVzdGlvbjogR3JhcGhpY1FcblxuICBjb25zdHJ1Y3RvciAocXVlc3Rpb246IEdyYXBoaWNRKSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMucXVlc3Rpb24gPSBxdWVzdGlvblxuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogV3JhcHBlck9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1Ege1xuICAgIGlmIChvcHRpb25zLnR5cGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUeXBlcyBsaXN0IG11c3QgYmUgbm9uLWVtcHR5JylcbiAgICB9XG4gICAgY29uc3QgdHlwZSA6IFF1ZXN0aW9uVHlwZSA9IHJhbmRFbGVtKG9wdGlvbnMudHlwZXMpXG5cbiAgICBpZiAoIW9wdGlvbnMuY3VzdG9tKSB7XG4gICAgICByZXR1cm4gTWlzc2luZ0FuZ2xlc1EucmFuZG9tRnJvbURpZmZpY3VsdHkodHlwZSwgb3B0aW9ucy5kaWZmaWN1bHR5KVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjaG9vc2Ugc3VidHlwZVxuICAgICAgY29uc3QgYXZhaWxhYmxlU3VidHlwZXMgOiBRdWVzdGlvblN1YlR5cGVbXSA9IFsnc2ltcGxlJywgJ3JlcGVhdGVkJywgJ2FsZ2VicmEnLCAnd29yZGVkJ11cbiAgICAgIGNvbnN0IHN1YnR5cGVzIDogUXVlc3Rpb25TdWJUeXBlW10gPSBbXVxuICAgICAgYXZhaWxhYmxlU3VidHlwZXMuZm9yRWFjaChzdWJ0eXBlID0+IHtcbiAgICAgICAgaWYgKG9wdGlvbnNbc3VidHlwZV0pIHsgc3VidHlwZXMucHVzaChzdWJ0eXBlKSB9XG4gICAgICB9KVxuICAgICAgY29uc3Qgc3VidHlwZSA6IFF1ZXN0aW9uU3ViVHlwZSA9IHJhbmRFbGVtKHN1YnR5cGVzKVxuXG4gICAgICAvLyBidWlsZCBvcHRpb25zIG9iamVjdFxuICAgICAgbGV0IHF1ZXN0aW9uT3B0aW9ucyA6IFBhcnRpYWw8UXVlc3Rpb25PcHRpb25zPiA9IHt9XG4gICAgICBpZiAoc3VidHlwZSA9PT0gJ3NpbXBsZScgfHwgc3VidHlwZSA9PT0gJ3JlcGVhdGVkJykge1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMgPSB7fVxuICAgICAgfSBlbHNlIGlmIChzdWJ0eXBlID09PSAnYWxnZWJyYScpIHtcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zID0gb3B0aW9ucy5hbGdlYnJhT3B0aW9uc1xuICAgICAgfSBlbHNlIGlmIChzdWJ0eXBlID09PSAnd29yZGVkJykge1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMgPSBvcHRpb25zLndvcmRlZE9wdGlvbnNcbiAgICAgIH1cbiAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gb3B0aW9ucy5taW5OXG4gICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IG9wdGlvbnMubWF4TlxuXG4gICAgICByZXR1cm4gTWlzc2luZ0FuZ2xlc1EucmFuZG9tRnJvbVR5cGVXaXRoT3B0aW9ucyh0eXBlLCBzdWJ0eXBlLCBxdWVzdGlvbk9wdGlvbnMpXG4gICAgfVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbUZyb21EaWZmaWN1bHR5ICh0eXBlOiBRdWVzdGlvblR5cGUsIGRpZmZpY3VsdHk6IG51bWJlcikge1xuICAgIGxldCBzdWJ0eXBlIDogUXVlc3Rpb25TdWJUeXBlXG4gICAgY29uc3QgcXVlc3Rpb25PcHRpb25zIDogUGFydGlhbDxRdWVzdGlvbk9wdGlvbnM+ID0ge31cbiAgICBzd2l0Y2ggKGRpZmZpY3VsdHkpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgc3VidHlwZSA9ICdzaW1wbGUnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDJcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgc3VidHlwZSA9ICdzaW1wbGUnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gM1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDRcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgc3VidHlwZSA9ICdyZXBlYXRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAzXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gNFxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA0OlxuICAgICAgICBzdWJ0eXBlID0gJ2FsZ2VicmEnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5leHByZXNzaW9uVHlwZXMgPSBbJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPSBmYWxzZVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDJcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSA0XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDU6XG4gICAgICAgIHN1YnR5cGUgPSAnYWxnZWJyYSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmV4cHJlc3Npb25UeXBlcyA9IFsnYWRkJywgJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPSBbJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmVuc3VyZVggPSB0cnVlXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNjpcbiAgICAgICAgc3VidHlwZSA9ICdhbGdlYnJhJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZXhwcmVzc2lvblR5cGVzID0gWydtaXhlZCddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNzpcbiAgICAgICAgc3VidHlwZSA9ICd3b3JkZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy50eXBlcyA9IFtyYW5kRWxlbShbJ2FkZCcsICdtdWx0aXBseSddKV1cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDJcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgODpcbiAgICAgICAgc3VidHlwZSA9ICd3b3JkZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy50eXBlcyA9IFsnYWRkJywgJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgOTpcbiAgICAgICAgc3VidHlwZSA9ICd3b3JkZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy50eXBlcyA9IFsnbXVsdGlwbHknLCAncmF0aW8nXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSAxMDpcbiAgICAgICAgc3VidHlwZSA9ICd3b3JkZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy50eXBlcyA9IFsnbXVsdGlwbHknLCAnYWRkJywgJ3JhdGlvJywgJ3BlcmNlbnQnXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4ndCBnZW5lcmF0ZSBkaWZmaWN1bHR5ICR7ZGlmZmljdWx0eX1gKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJhbmRvbUZyb21UeXBlV2l0aE9wdGlvbnModHlwZSwgc3VidHlwZSwgcXVlc3Rpb25PcHRpb25zKVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbUZyb21UeXBlV2l0aE9wdGlvbnMgKHR5cGU6IFF1ZXN0aW9uVHlwZSwgc3VidHlwZT86IFF1ZXN0aW9uU3ViVHlwZSwgcXVlc3Rpb25PcHRpb25zPzogUGFydGlhbDxRdWVzdGlvbk9wdGlvbnM+LCB2aWV3T3B0aW9ucz86IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzUSB7XG4gICAgbGV0IHF1ZXN0aW9uOiBHcmFwaGljUVxuICAgIHF1ZXN0aW9uT3B0aW9ucyA9IHF1ZXN0aW9uT3B0aW9ucyB8fCB7fVxuICAgIHZpZXdPcHRpb25zID0gdmlld09wdGlvbnMgfHwge31cbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ2FhYXAnOlxuICAgICAgY2FzZSAnYW9zbCc6IHtcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmFuZ2xlU3VtID0gKHR5cGUgPT09ICdhYWFwJykgPyAzNjAgOiAxODBcbiAgICAgICAgc3dpdGNoIChzdWJ0eXBlKSB7XG4gICAgICAgICAgY2FzZSAnc2ltcGxlJzpcbiAgICAgICAgICBjYXNlICdyZXBlYXRlZCc6XG4gICAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMucmVwZWF0ZWQgPSBzdWJ0eXBlID09PSAncmVwZWF0ZWQnXG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNBcm91bmRRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdhbGdlYnJhJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICd3b3JkZWQnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzV29yZGVkUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgdW5leHBlY3RlZCBzdWJ0eXBlICR7c3VidHlwZX1gKVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICd0cmlhbmdsZSc6IHtcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnJlcGVhdGVkID0gKHN1YnR5cGUgPT09ICdyZXBlYXRlZCcpXG4gICAgICAgIHN3aXRjaCAoc3VidHlwZSkge1xuICAgICAgICAgIGNhc2UgJ3NpbXBsZSc6XG4gICAgICAgICAgY2FzZSAncmVwZWF0ZWQnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdhbGdlYnJhJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3dvcmRlZCc6XG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHVuZXhwZWN0ZWQgc3VidHlwZSAke3N1YnR5cGV9YClcbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHR5cGUgJHt0eXBlfWApXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzUShxdWVzdGlvbilcbiAgfVxuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHsgcmV0dXJuIHRoaXMucXVlc3Rpb24uZ2V0RE9NKCkgfVxuICByZW5kZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5yZW5kZXIoKSB9XG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5zaG93QW5zd2VyKCkgfVxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24uaGlkZUFuc3dlcigpIH1cbiAgdG9nZ2xlQW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24udG9nZ2xlQW5zd2VyKCkgfVxuXG4gIHN0YXRpYyBnZXQgb3B0aW9uc1NwZWMgKCk6IE9wdGlvbnNTcGVjIHtcbiAgICByZXR1cm4gW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnaGVhZGluZycsXG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgfSxcblxuICAgICAge1xuICAgICAgICB0aXRsZTogJ1R5cGVzJyxcbiAgICAgICAgaWQ6ICd0eXBlcycsXG4gICAgICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICAgICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgICAgIHsgdGl0bGU6ICdPbiBhIHN0cmFpZ2h0IGxpbmUnLCBpZDogJ2Fvc2wnIH0sXG4gICAgICAgICAgeyB0aXRsZTogJ0Fyb3VuZCBhIHBvaW50JywgaWQ6ICdhYWFwJyB9LFxuICAgICAgICAgIHsgdGl0bGU6ICdUcmlhbmdsZScsIGlkOiAndHJpYW5nbGUnIH1cbiAgICAgICAgXSxcbiAgICAgICAgZGVmYXVsdDogWydhb3NsJywgJ2FhYXAnLCAndHJpYW5nbGUnXSxcbiAgICAgICAgdmVydGljYWw6IHRydWVcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjb2x1bW4tYnJlYWsnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnPGI+Q3VzdG9tIHNldHRpbmdzIChkaXNhYmxlcyBkaWZmaWN1bHR5KTwvYj4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgaWQ6ICdjdXN0b20nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAncmFuZ2UnLFxuICAgICAgICBpZDogJ24tYW5nbGVzJyxcbiAgICAgICAgaWRMQjogJ21pbk4nLFxuICAgICAgICBpZFVCOiAnbWF4TicsXG4gICAgICAgIGRlZmF1bHRMQjogMixcbiAgICAgICAgZGVmYXVsdFVCOiA0LFxuICAgICAgICBtaW46IDIsXG4gICAgICAgIG1heDogOCxcbiAgICAgICAgdGl0bGU6ICdOdW1iZXIgb2YgYW5nbGVzJyxcbiAgICAgICAgZW5hYmxlZElmOiAnY3VzdG9tJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJ1NpbXBsZScsXG4gICAgICAgIGlkOiAnc2ltcGxlJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlZElmOiAnY3VzdG9tJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJ1JlcGVhdGVkL0lzb3NjZWxlcycsXG4gICAgICAgIGlkOiAncmVwZWF0ZWQnLFxuICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICBlbmFibGVkSWY6ICdjdXN0b20nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnQWxnZWJyYWljJyxcbiAgICAgICAgaWQ6ICdhbGdlYnJhJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlZElmOiAnY3VzdG9tJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3N1Ym9wdGlvbnMnLFxuICAgICAgICB0aXRsZTogJycsXG4gICAgICAgIGlkOiAnYWxnZWJyYU9wdGlvbnMnLFxuICAgICAgICBvcHRpb25zU3BlYzogTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRLm9wdGlvbnNTcGVjLFxuICAgICAgICBlbmFibGVkSWY6ICdjdXN0b20mYWxnZWJyYSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgdGl0bGU6ICdXb3JkZWQnLFxuICAgICAgICBpZDogJ3dvcmRlZCcsXG4gICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgIGVuYWJsZWRJZjogJ2N1c3RvbSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdzdWJvcHRpb25zJyxcbiAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICBpZDogJ3dvcmRlZE9wdGlvbnMnLFxuICAgICAgICBvcHRpb25zU3BlYzogTWlzc2luZ0FuZ2xlc1dvcmRlZFEub3B0aW9uc1NwZWMsXG4gICAgICAgIGVuYWJsZWRJZjogJ2N1c3RvbSZ3b3JkZWQnXG4gICAgICB9XG4gICAgXVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnXG4gIH1cbn1cbiIsImltcG9ydCB7IHJhbmRCZXR3ZWVuLCByYW5kRWxlbSwgc2NhbGVkU3RyIH0gZnJvbSAndXRpbGl0aWVzJ1xuaW1wb3J0IHsgUXVlc3Rpb25PcHRpb25zIH0gZnJvbSAnLi90eXBlcydcblxuLyoqXG4gKiBBIHZhbHVlIGZvciBzaWRlcywgYXJlYXMgYW5kIHBlcmltZXRlcnNcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBWYWx1ZSB7XG4gIHZhbDogbnVtYmVyLCAvLyB0aGUgbnVtZXJpY2FsIHZhbHVlXG4gIGxhYmVsPzogc3RyaW5nLCAvLyB0aGUgbGFiZWwgdG8gZGlzcGxheS4gZS5nLiBcIjMuNGNtXCJcbiAgc2hvdzogYm9vbGVhbiwgLy8gd2hldGhlciB0aGF0IHZhbHVlIGlzIHNob3duIGluIHRoZSBxdWVzdGlvbiBvciBhbnN3ZXIgYXQgYWxsXG4gIG1pc3Npbmc6IGJvb2xlYW4sIC8vIHdoZXRoZXIgdGhlIHZhbHVlIGlzIHNob3duIGluIHRoZSBxdWVzdGlvblxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWN0YW5nbGVBcmVhRGF0YSB7XG4gIHJlYWRvbmx5IGJhc2UgOiBWYWx1ZVxuICByZWFkb25seSBoZWlnaHQ6IFZhbHVlXG4gIHJlYWRvbmx5IHNob3dPcHBvc2l0ZXM6IGJvb2xlYW5cbiAgcHJpdmF0ZSByZWFkb25seSBkcDogbnVtYmVyXG4gIHByaXZhdGUgX2FyZWE/OiBQYXJ0aWFsPFZhbHVlPiAvLyBsYXppbHkgY2FsY3VsYXRlZFxuICBwcml2YXRlIF9wZXJpbWV0ZXI/OiBQYXJ0aWFsPFZhbHVlPlxuXG4gIGNvbnN0cnVjdG9yIChiYXNlOiBWYWx1ZSwgaGVpZ2h0OiBWYWx1ZSwgc2hvd09wcG9zaXRlczogYm9vbGVhbiwgZHA6IG51bWJlciwgYXJlYVByb3BlcnRpZXM/OiBPbWl0PFZhbHVlLCAndmFsJz4sIHBlcmltZXRlclByb3BlcnRpZXM/OiBPbWl0PFZhbHVlLCAndmFsJz4pIHtcbiAgICB0aGlzLmJhc2UgPSBiYXNlXG4gICAgdGhpcy5oZWlnaHQgPSBoZWlnaHRcbiAgICB0aGlzLnNob3dPcHBvc2l0ZXMgPSBzaG93T3Bwb3NpdGVzXG4gICAgdGhpcy5kcCA9IGRwXG4gICAgdGhpcy5fYXJlYSA9IGFyZWFQcm9wZXJ0aWVzXG4gICAgdGhpcy5fcGVyaW1ldGVyID0gcGVyaW1ldGVyUHJvcGVydGllc1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogUXVlc3Rpb25PcHRpb25zKSA6IFJlY3RhbmdsZUFyZWFEYXRhIHtcbiAgICBvcHRpb25zLm1heExlbmd0aCA9IG9wdGlvbnMubWF4TGVuZ3RoIHx8IDIwIC8vIGRlZmF1bHQgdmFsdWVzXG4gICAgY29uc3QgZHAgPSBvcHRpb25zLmRwIHx8IDBcblxuICAgIGNvbnN0IHNpZGVzID0ge1xuICAgICAgYmFzZTogcmFuZEJldHdlZW4oMSwgb3B0aW9ucy5tYXhMZW5ndGgpLFxuICAgICAgaGVpZ2h0OiByYW5kQmV0d2VlbigxLCBvcHRpb25zLm1heExlbmd0aClcbiAgICB9XG5cbiAgICBjb25zdCBiYXNlIDogVmFsdWUgPVxuICAgICAgeyB2YWw6IHNpZGVzLmJhc2UsIHNob3c6IHRydWUsIG1pc3Npbmc6IGZhbHNlLCBsYWJlbDogc2NhbGVkU3RyKHNpZGVzLmJhc2UsZHApICsgXCJcXFxcbWF0aHJte2NtfVwiIH1cbiAgICBjb25zdCBoZWlnaHQgOiBWYWx1ZSA9XG4gICAgICB7IHZhbDogc2lkZXMuaGVpZ2h0LCBzaG93OiB0cnVlLCBtaXNzaW5nOiBmYWxzZSAsbGFiZWw6IHNjYWxlZFN0cihzaWRlcy5iYXNlLGRwKSArIFwiXFxcXG1hdGhybXtjbX1cIn1cbiAgICBsZXQgc2hvd09wcG9zaXRlcyA6IGJvb2xlYW5cbiAgICBjb25zdCBhcmVhUHJvcGVydGllcyA6IFBhcnRpYWw8T21pdDxWYWx1ZSwgJ3ZhbCc+PiA9IHt9XG4gICAgY29uc3QgcGVyaW1ldGVyUHJvcGVydGllcyA6IFBhcnRpYWw8T21pdDxWYWx1ZSwgJ3ZhbCc+PiA9IHt9XG5cbiAgICAvLyBzZWxlY3RpdmVseSBoaWRlL21pc3NpbmcgZGVwZW5kaW5nIG9uIHR5cGVcbiAgICBzd2l0Y2ggKG9wdGlvbnMucXVlc3Rpb25UeXBlKSB7XG4gICAgICBjYXNlICdhcmVhJzpcbiAgICAgICAgYXJlYVByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgYXJlYVByb3BlcnRpZXMubWlzc2luZyA9IHRydWVcbiAgICAgICAgc2hvd09wcG9zaXRlcyA9ICFvcHRpb25zLm5vRGlzdHJhY3RvcnNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3BlcmltZXRlcic6XG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBzaG93T3Bwb3NpdGVzID0gb3B0aW9ucy5ub0Rpc3RyYWN0b3JzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdyZXZlcnNlQXJlYSc6XG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLm1pc3NpbmcgPSBmYWxzZVxuICAgICAgICByYW5kRWxlbShbYmFzZSwgaGVpZ2h0XSkubWlzc2luZyA9IHRydWVcbiAgICAgICAgc2hvd09wcG9zaXRlcyA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdyZXZlcnNlUGVyaW1ldGVyJzpcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdyA9IHRydWVcbiAgICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nID0gZmFsc2VcbiAgICAgICAgcmFuZEVsZW0oW2Jhc2UsIGhlaWdodF0pLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIHNob3dPcHBvc2l0ZXMgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgdGhpcyhiYXNlLCBoZWlnaHQsIHNob3dPcHBvc2l0ZXMsIGRwLCBhcmVhUHJvcGVydGllcyBhcyBPbWl0PFZhbHVlLCAndmFsJz4sIHBlcmltZXRlclByb3BlcnRpZXMgYXMgT21pdDxWYWx1ZSwgJ3ZhbCc+KVxuICB9XG5cbiAgZ2V0IHBlcmltZXRlciAoKSA6IFZhbHVlIHtcbiAgICBpZiAoIXRoaXMuX3BlcmltZXRlcikge1xuICAgICAgdGhpcy5fcGVyaW1ldGVyID0ge1xuICAgICAgICBzaG93OiBmYWxzZSxcbiAgICAgICAgbWlzc2luZzogdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXRoaXMuX3BlcmltZXRlci52YWwpIHtcbiAgICAgIHRoaXMuX3BlcmltZXRlci52YWwgPSAyICogKHRoaXMuYmFzZS52YWwgKyB0aGlzLmhlaWdodC52YWwpXG4gICAgICB0aGlzLl9wZXJpbWV0ZXIubGFiZWwgPSBzY2FsZWRTdHIodGhpcy5fcGVyaW1ldGVyLnZhbCx0aGlzLmRwKSArIFwiXFxcXG1hdGhybXtjbX1cIlxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcGVyaW1ldGVyIGFzIFZhbHVlXG4gIH1cblxuICBnZXQgYXJlYSAoKSA6IFZhbHVlIHtcbiAgICBpZiAoIXRoaXMuX2FyZWEpIHtcbiAgICAgIHRoaXMuX2FyZWEgPSB7XG4gICAgICAgIHNob3c6IGZhbHNlLFxuICAgICAgICBtaXNzaW5nOiB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5fYXJlYS52YWwpIHtcbiAgICAgIHRoaXMuX2FyZWEudmFsID0gdGhpcy5iYXNlLnZhbCAqIHRoaXMuaGVpZ2h0LnZhbFxuICAgICAgdGhpcy5fYXJlYS5sYWJlbCA9IHNjYWxlZFN0cih0aGlzLl9hcmVhLnZhbCwyKnRoaXMuZHApICsgXCJcXFxcbWF0aHJte2NtfV4yXCJcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2FyZWEgYXMgVmFsdWVcbiAgfVxufVxuIiwiaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuXG4vKiBDYW52YXMgZHJhd2luZywgdXNpbmcgdGhlIFBvaW50IGNsYXNzICovXG5cbmV4cG9ydCBmdW5jdGlvbiBkYXNoZWRMaW5lIChjdHgsIHgxLCB5MSwgeDIsIHkyKSB7XG4gIC8vIFdvcmsgaWYgZ2l2ZW4gdHdvIHBvaW50cyBpbnN0ZWFkOlxuICBpZiAoeDEgaW5zdGFuY2VvZiBQb2ludCAmJiB4MiBpbnN0YW5jZW9mIFBvaW50KSB7XG4gICAgY29uc3QgcDEgPSB4MTsgY29uc3QgcDIgPSB4MlxuICAgIHgxID0gcDEueFxuICAgIHkxID0gcDEueVxuICAgIHgyID0gcDIueFxuICAgIHkyID0gcDIueVxuICB9XG5cbiAgY29uc3QgbGVuZ3RoID0gTWF0aC5oeXBvdCh4MiAtIHgxLCB5MiAtIHkxKVxuICBjb25zdCBkYXNoeCA9ICh5MSAtIHkyKSAvIGxlbmd0aCAvLyB1bml0IHZlY3RvciBwZXJwZW5kaWN1bGFyIHRvIGxpbmVcbiAgY29uc3QgZGFzaHkgPSAoeDIgLSB4MSkgLyBsZW5ndGhcbiAgY29uc3QgbWlkeCA9ICh4MSArIHgyKSAvIDJcbiAgY29uc3QgbWlkeSA9ICh5MSArIHkyKSAvIDJcblxuICAvLyBkcmF3IHRoZSBiYXNlIGxpbmVcbiAgY3R4Lm1vdmVUbyh4MSwgeTEpXG4gIGN0eC5saW5lVG8oeDIsIHkyKVxuXG4gIC8vIGRyYXcgdGhlIGRhc2hcbiAgY3R4Lm1vdmVUbyhtaWR4ICsgNSAqIGRhc2h4LCBtaWR5ICsgNSAqIGRhc2h5KVxuICBjdHgubGluZVRvKG1pZHggLSA1ICogZGFzaHgsIG1pZHkgLSA1ICogZGFzaHkpXG5cbiAgY3R4Lm1vdmVUbyh4MiwgeTIpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcnJvd0xpbmUgKGN0eCwgcHQxLCBwdDIsIHNpemUsIG0pIHtcbiAgaWYgKCFtKSBtID0gMC41XG5cbiAgY29uc3QgdW5pdCA9IFBvaW50LnVuaXRWZWN0b3IocHQxLCBwdDIpXG4gIHVuaXQueCAqPSBzaXplXG4gIHVuaXQueSAqPSBzaXplXG4gIGNvbnN0IG5vcm1hbCA9IHsgeDogLXVuaXQueSwgeTogdW5pdC54IH1cbiAgbm9ybWFsLnggKj0gbVxuICBub3JtYWwueSAqPSBtXG5cbiAgY29uc3QgY29udHJvbDEgPSBwdDIuY2xvbmUoKVxuICAgIC50cmFuc2xhdGUoLXVuaXQueCwgLXVuaXQueSlcbiAgICAudHJhbnNsYXRlKG5vcm1hbC54LCBub3JtYWwueSlcblxuICBjb25zdCBjb250cm9sMiA9IHB0Mi5jbG9uZSgpXG4gICAgLnRyYW5zbGF0ZSgtdW5pdC54LCAtdW5pdC55KVxuICAgIC50cmFuc2xhdGUoLW5vcm1hbC54LCAtbm9ybWFsLnkpXG5cbiAgY3R4Lm1vdmVUbyhwdDEueCwgcHQxLnkpXG4gIGN0eC5saW5lVG8ocHQyLngsIHB0Mi55KVxuICBjdHgubGluZVRvKGNvbnRyb2wxLngsIGNvbnRyb2wxLnkpXG4gIGN0eC5tb3ZlVG8ocHQyLngsIHB0Mi55KVxuICBjdHgubGluZVRvKGNvbnRyb2wyLngsIGNvbnRyb2wyLnkpXG59XG5cbi8qKlxuICogRHJhdyBhIHJpZ2h0IGFuZ2xlIHN5bWJvbCBmb3IgYW5nbGUgQU9DLiBOQjogbm8gY2hlY2sgaXMgbWFkZSB0aGF0IEFPQyBpcyBpbmRlZWQgYSByaWdodCBhbmdsZVxuICogQHBhcmFtIHtDYW52YXNSZW5kZXJpbmdDb250ZXh0MkR9IGN0eCBUaGUgY29udGV4dCB0byBkcmF3IGluXG4gKiBAcGFyYW0ge1BvaW50fSBBIFN0YXJ0IHBvaW50XG4gKiBAcGFyYW0ge1BvaW50fSBPIFZlcnRleCBwb2ludFxuICogQHBhcmFtIHtQb2ludH0gQyBFbmQgcG9pbnRcbiAqIEBwYXJhbSB7bnVtYmVyfSBzaXplIFNpemUgb2YgcmlnaHQgYW5nbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRyYXdSaWdodEFuZ2xlIChjdHgsIEEsIE8sIEMsIHNpemUpIHtcbiAgY29uc3QgdW5pdE9BID0gUG9pbnQudW5pdFZlY3RvcihPLCBBKVxuICBjb25zdCB1bml0T0MgPSBQb2ludC51bml0VmVjdG9yKE8sIEMpXG4gIGNvbnN0IGN0bDEgPSBPLmNsb25lKCkudHJhbnNsYXRlKHVuaXRPQS54ICogc2l6ZSwgdW5pdE9BLnkgKiBzaXplKVxuICBjb25zdCBjdGwyID0gY3RsMS5jbG9uZSgpLnRyYW5zbGF0ZSh1bml0T0MueCAqIHNpemUsIHVuaXRPQy55ICogc2l6ZSlcbiAgY29uc3QgY3RsMyA9IE8uY2xvbmUoKS50cmFuc2xhdGUodW5pdE9DLnggKiBzaXplLCB1bml0T0MueSAqIHNpemUpXG4gIGN0eC5tb3ZlVG8oY3RsMS54LCBjdGwxLnkpXG4gIGN0eC5saW5lVG8oY3RsMi54LCBjdGwyLnkpXG4gIGN0eC5saW5lVG8oY3RsMy54LCBjdGwzLnkpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJhbGxlbFNpZ24gKGN0eCwgQSwgQiwgc2l6ZSwgbnVtYmVyLCBnYXApIHtcbiAgaWYgKCFzaXplKSBzaXplID0gMTBcbiAgaWYgKCFudW1iZXIpIG51bWJlciA9IDFcbiAgaWYgKCFnYXApIGdhcCA9IHNpemVcblxuICBjb25zdCB1bml0ID0gUG9pbnQudW5pdFZlY3RvcihBLCBCKVxuICB1bml0LnggKj0gc2l6ZVxuICB1bml0LnkgKj0gc2l6ZVxuICBjb25zdCBub3JtYWwgPSB7IHg6IC11bml0LnksIHk6IHVuaXQueCB9XG5cbiAgY29uc3QgTSA9IFBvaW50Lm1lYW4oW0EsIEJdKVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtYmVyOyBpKyspIHtcbiAgICBjb25zdCBjdGwyID0gTS5jbG9uZSgpLm1vdmVUb3dhcmQoQiwgaSAqIGdhcClcbiAgICBjb25zdCBjdGwxID0gY3RsMi5jbG9uZSgpXG4gICAgICAudHJhbnNsYXRlKC11bml0LngsIC11bml0LnkpXG4gICAgICAudHJhbnNsYXRlKG5vcm1hbC54LCBub3JtYWwueSlcbiAgICBjb25zdCBjdGwzID0gY3RsMi5jbG9uZSgpXG4gICAgICAudHJhbnNsYXRlKC11bml0LngsIC11bml0LnkpXG4gICAgICAudHJhbnNsYXRlKC1ub3JtYWwueCwgLW5vcm1hbC55KVxuXG4gICAgY3R4Lm1vdmVUbyhjdGwxLngsIGN0bDEueSlcbiAgICBjdHgubGluZVRvKGN0bDIueCwgY3RsMi55KVxuICAgIGN0eC5saW5lVG8oY3RsMy54LCBjdGwzLnkpXG4gIH1cbn1cbiIsImV4cG9ydCB0eXBlIFNoYXBlID0gJ3JlY3RhbmdsZScgfCAndHJpYW5nbGUnIHwgJ3BhcmFsbGVsb2dyYW0nIHwgJ3RyYXBleml1bSc7XG5cbmV4cG9ydCB0eXBlIFF1ZXN0aW9uVHlwZVNpbXBsZSA9ICdhcmVhJyB8ICdwZXJpbWV0ZXInO1xuZXhwb3J0IHR5cGUgUXVlc3Rpb25UeXBlQ3VzdG9tID0gJ3JldmVyc2VBcmVhJyB8ICdyZXZlcnNlUGVyaW1ldGVyJyB8ICdweXRoYWdvcmFzQXJlYScgfCAncHl0aGFnb3Jhc1BlcmltZXRlcicgfCAncHl0aGFnb3Jhc0lzb3NjZWxlc0FyZWEnO1xuZXhwb3J0IHR5cGUgUXVlc3Rpb25UeXBlID0gUXVlc3Rpb25UeXBlU2ltcGxlIHwgUXVlc3Rpb25UeXBlQ3VzdG9tO1xuXG5leHBvcnQgaW50ZXJmYWNlIFF1ZXN0aW9uT3B0aW9ucyB7XG4gIG5vRGlzdHJhY3RvcnM6IGJvb2xlYW4sIC8vIGFkZHMgbGF5ZXIgb2YgZGlmZmljdWx0eSB3aGVuIHRydWUgYnkgaW5jbHVkaW5nL2V4Y2x1ZGluZyBzaWRlcyAoZGVwZW5kaW5nIG9uIHNoYXBlIHR5cGUpXG4gIGRwPzogbnVtYmVyLCAvLyBudW1iZXIgb2YgZGVjaW1hbCBwbGFjZXMgb2YgbGVuZ3Roc1xuICBmcmFjdGlvbj86IGJvb2xlYW4sXG4gIG1heExlbmd0aD86IG51bWJlciwgLy8gdGhlIG1heGltdW0gbGVuZ3RoIG9mIGEgc2lkZVxuICBxdWVzdGlvblR5cGU6IFF1ZXN0aW9uVHlwZVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdyYXBwZXJPcHRpb25zIHtcbiAgZGlmZmljdWx0eTogbnVtYmVyO1xuICBzaGFwZXM6IFNoYXBlW107XG4gIHF1ZXN0aW9uVHlwZXNTaW1wbGU6IFF1ZXN0aW9uVHlwZVNpbXBsZVtdO1xuICBjdXN0b206IGJvb2xlYW47XG4gIHF1ZXN0aW9uVHlwZXNDdXN0b206IChRdWVzdGlvblR5cGUpW107XG4gIGRwOiAwIHwgMTtcbn1cblxuZXhwb3J0IGNvbnN0IGNvbG9ycyA9IFsnTGlnaHRDeWFuJywnTGlnaHRZZWxsb3cnLCdQaW5rJywnTGlnaHRHcmVlbicsJ0xpZ2h0Qmx1ZScsJ0l2b3J5JywnTGlnaHRHcmF5J11cbiIsImltcG9ydCB7IGRyYXdSaWdodEFuZ2xlIH0gZnJvbSAnZHJhd2luZydcbmltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IHJhbmRFbGVtIH0gZnJvbSAndXRpbGl0aWVzJ1xuaW1wb3J0IHsgR3JhcGhpY1FEYXRhLCBHcmFwaGljUVZpZXcsIExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuL3R5cGVzJ1xuaW1wb3J0IFJlY3RhbmdsZUFyZWFEYXRhLCB7IFZhbHVlIH0gZnJvbSAnLi9SZWN0YW5nbGVBcmVhRGF0YSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjdGFuZ2xlQXJlYVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICBkYXRhITogUmVjdGFuZ2xlQXJlYURhdGEgLy8gYXNzaWduZWQgaW4gc3VwZXJcbiAgQTogUG9pbnRcbiAgQjogUG9pbnRcbiAgQzogUG9pbnRcbiAgRDogUG9pbnRcblxuICBjb25zdHJ1Y3RvciAoQTogUG9pbnQsIEI6IFBvaW50LCBDOiBQb2ludCwgRDogUG9pbnQsIGxhYmVsczogTGFiZWxbXSwgZGF0YTogUmVjdGFuZ2xlQXJlYURhdGEsIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucykge1xuICAgIC8qIFN1cGVyIGRvZXM6XG4gICAgICogIFNldHMgdGhpcy53aWR0aCBhbmQgdGhpcy5oZWlnaHRcbiAgICAgKiAgU2V0cyB0aGlzLmRhdGFcbiAgICAgKiAgQ3JlYXRlcyBET00gZWxlbWVudHMsIGluY2x1ZGluZyBjYW52YXNcbiAgICAgKiAgQ3JlYXRlcyBlbXB0eSB0aGlzLmxhYmVscyBsaXN0XG4gICAgICovXG4gICAgc3VwZXIoZGF0YSwgdmlld09wdGlvbnMpIC8vIGluaXRpYWxpc2VzIHRoaXMuZGF0YVxuICAgIHRoaXMuQSA9IEFcbiAgICB0aGlzLkIgPSBCXG4gICAgdGhpcy5DID0gQ1xuICAgIHRoaXMuRCA9IERcbiAgICB0aGlzLmxhYmVscyA9IGxhYmVsc1xuICB9XG5cbiAgLyoqXG4gICAqIFN0YXRpYyBmYWN0b3J5IG1ldGhvZCByZXR1cm5pbmcgdmlldyBmcm9tIGRhdGFcbiAgICogQHBhcmFtIGRhdGEgQSBkYXRhIG9iamVjdCwgd2hpY2ggaGFkIGRldGFpbHMgb2Ygd2lkdGgsIGhlaWdodCBhbmQgYXJlYVxuICAgKiBAcGFyYW0gdmlld09wdGlvbnMgVmlldyBvcHRpb25zIC0gY29udGFpbmluZyB3aWR0aCBhbmQgaGVpZ2h0XG4gICAqL1xuICBzdGF0aWMgZnJvbURhdGEgKGRhdGE6IFJlY3RhbmdsZUFyZWFEYXRhLCB2aWV3T3B0aW9ucz86IFZpZXdPcHRpb25zKSA6IFJlY3RhbmdsZUFyZWFWaWV3IHtcbiAgICAvLyBEZWZhdWx0cyAoTkI6IGR1cGxpY2F0ZXMgZWZmb3J0IGluIGNvbnN0cnVjdG9yLCBnaXZlbiB1c2Ugb2Ygc3RhdGljIGZhY3RvcnkgY29uc3RydWN0b3IgaW5zdGVhZCBvZiBHcmFwaGljUSdzIG1ldGhvZClcbiAgICB2aWV3T3B0aW9ucyA9IHZpZXdPcHRpb25zID8/IHt9XG4gICAgdmlld09wdGlvbnMud2lkdGggPSB2aWV3T3B0aW9ucy53aWR0aCA/PyAzMDBcbiAgICB2aWV3T3B0aW9ucy5oZWlnaHQgPSB2aWV3T3B0aW9ucy5oZWlnaHQgPz8gMzAwXG5cbiAgICAvLyBpbml0aWFsIHBvaW50c1xuICAgIGNvbnN0IEEgPSBuZXcgUG9pbnQoMCwgMClcbiAgICBjb25zdCBCID0gbmV3IFBvaW50KDAsIGRhdGEuaGVpZ2h0LnZhbClcbiAgICBjb25zdCBDID0gbmV3IFBvaW50KGRhdGEuYmFzZS52YWwsIGRhdGEuaGVpZ2h0LnZhbClcbiAgICBjb25zdCBEID0gbmV3IFBvaW50KGRhdGEuYmFzZS52YWwsIDApXG5cbiAgICAvLyByb3RhdGUsIHNjYWxlIGFuZCBjZW50ZXJcbiAgICBjb25zdCByb3RhdGlvbiA9IHZpZXdPcHRpb25zLnJvdGF0aW9uID8/IDIgKiBNYXRoLlBJICogTWF0aC5yYW5kb20oKVxuICAgIDtbQSwgQiwgQywgRF0uZm9yRWFjaChwdCA9PiBwdC5yb3RhdGUocm90YXRpb24pKVxuICAgIFBvaW50LnNjYWxlVG9GaXQoW0EsIEIsIEMsIERdLCB2aWV3T3B0aW9ucy53aWR0aCwgdmlld09wdGlvbnMuaGVpZ2h0LCA4MClcblxuICAgIC8vIFNldCB1cCBsYWJlbHNcbiAgICBjb25zdCBsYWJlbHMgOiBMYWJlbFtdID0gW11cblxuICAgIGNvbnN0IHNpZGVzIDogW1BvaW50LCBQb2ludCwgVmFsdWVdW10gPSBbIC8vIFsxc3QgcG9pbnQsIDJuZCBwb2ludCwgbGVuZ3RoXVxuICAgICAgW0EsIEIsIGRhdGEuaGVpZ2h0XSxcbiAgICAgIFtCLCBDLCBkYXRhLmJhc2VdXG4gICAgXVxuXG4gICAgaWYgKGRhdGEuc2hvd09wcG9zaXRlcykge1xuICAgICAgc2lkZXMucHVzaChbQywgRCwgZGF0YS5oZWlnaHRdKVxuICAgICAgc2lkZXMucHVzaChbRCwgQSwgZGF0YS5iYXNlXSlcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMCwgbiA9IHNpZGVzLmxlbmd0aDsgaSA8IG47IGkrKykgeyAvLyBzaWRlc1xuICAgICAgaWYgKCFzaWRlc1tpXVsyXS5zaG93KSBjb250aW51ZVxuICAgICAgY29uc3Qgb2Zmc2V0ID0gMjBcbiAgICAgIGNvbnN0IHBvcyA9IFBvaW50Lm1lYW4oc2lkZXNbaV1bMF0sIHNpZGVzW2ldWzFdKVxuICAgICAgY29uc3QgdW5pdHZlYyA9IFBvaW50LnVuaXRWZWN0b3Ioc2lkZXNbaV1bMF0sIHNpZGVzW2ldWzFdKVxuXG4gICAgICBwb3MudHJhbnNsYXRlKC11bml0dmVjLnkgKiBvZmZzZXQsIHVuaXR2ZWMueCAqIG9mZnNldClcblxuICAgICAgY29uc3QgdGV4dGEgPSBzaWRlc1tpXVsyXS5sYWJlbCA/PyBzaWRlc1tpXVsyXS52YWwudG9TdHJpbmcoKVxuICAgICAgY29uc3QgdGV4dHEgPSBzaWRlc1tpXVsyXS5taXNzaW5nID8gJz8nIDogdGV4dGFcbiAgICAgIGNvbnN0IHN0eWxlcSA9ICdub3JtYWwnXG4gICAgICBjb25zdCBzdHlsZWEgPSBzaWRlc1tpXVsyXS5taXNzaW5nID8gJ2Fuc3dlcicgOiAnbm9ybWFsJ1xuXG4gICAgICBsYWJlbHMucHVzaCh7XG4gICAgICAgIHBvczogcG9zLFxuICAgICAgICB0ZXh0YTogdGV4dGEsXG4gICAgICAgIHRleHRxOiB0ZXh0cSxcbiAgICAgICAgdGV4dDogdGV4dHEsXG4gICAgICAgIHN0eWxlYTogc3R5bGVhLFxuICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgc3R5bGU6IHN0eWxlcVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBsZXQgbkluZm8gPSAwXG4gICAgaWYgKGRhdGEuYXJlYS5zaG93KSB7XG4gICAgICBjb25zdCB0ZXh0YSA9IGRhdGEuYXJlYS5sYWJlbCA/PyBkYXRhLmFyZWEudmFsLnRvU3RyaW5nKClcbiAgICAgIGNvbnN0IHRleHRxID0gZGF0YS5hcmVhLm1pc3NpbmcgPyAnPycgOiB0ZXh0YVxuICAgICAgY29uc3Qgc3R5bGVxID0gJ2V4dHJhLWluZm8nXG4gICAgICBjb25zdCBzdHlsZWEgPSBkYXRhLmFyZWEubWlzc2luZyA/ICdleHRyYS1hbnN3ZXInIDogJ2V4dHJhLWluZm8nXG4gICAgICBsYWJlbHMucHVzaChcbiAgICAgICAge1xuICAgICAgICAgIHRleHRhOiAnXFxcXHRleHR7QXJlYX0gPSAnICsgdGV4dGEsXG4gICAgICAgICAgdGV4dHE6ICdcXFxcdGV4dHtBcmVhfSA9ICcgKyB0ZXh0cSxcbiAgICAgICAgICB0ZXh0OiAnXFxcXHRleHR7QXJlYX0gPSAnICsgdGV4dHEsXG4gICAgICAgICAgc3R5bGVxOiBzdHlsZXEsXG4gICAgICAgICAgc3R5bGVhOiBzdHlsZWEsXG4gICAgICAgICAgc3R5bGU6IHN0eWxlcSxcbiAgICAgICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdmlld09wdGlvbnMuaGVpZ2h0IC0gMTAgLSAxNSAqIG5JbmZvKVxuICAgICAgICB9XG4gICAgICApXG4gICAgICBuSW5mbysrXG4gICAgfVxuXG4gICAgaWYgKGRhdGEucGVyaW1ldGVyLnNob3cpIHtcbiAgICAgIGNvbnN0IHRleHRhID0gZGF0YS5wZXJpbWV0ZXIubGFiZWwgPz8gZGF0YS5wZXJpbWV0ZXIudmFsLnRvU3RyaW5nKClcbiAgICAgIGNvbnN0IHRleHRxID0gZGF0YS5wZXJpbWV0ZXIubWlzc2luZyA/ICc/JyA6IHRleHRhXG4gICAgICBjb25zdCBzdHlsZXEgPSAnZXh0cmEtaW5mbydcbiAgICAgIGNvbnN0IHN0eWxlYSA9IGRhdGEucGVyaW1ldGVyLm1pc3NpbmcgPyAnZXh0cmEtYW5zd2VyJyA6ICdleHRyYS1pbmZvJ1xuICAgICAgbGFiZWxzLnB1c2goXG4gICAgICAgIHtcbiAgICAgICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdmlld09wdGlvbnMuaGVpZ2h0IC0gMTAgLSAyMCAqIG5JbmZvKSxcbiAgICAgICAgICB0ZXh0YTogJ1xcXFx0ZXh0e1BlcmltZXRlcn0gPSAnICsgdGV4dGEsXG4gICAgICAgICAgdGV4dHE6ICdcXFxcdGV4dHtQZXJpbWV0ZXJ9ID0gJyArIHRleHRxLFxuICAgICAgICAgIHRleHQ6ICdcXFxcdGV4dHtQZXJpbWV0ZXJ9ID0gJyArIHRleHRxLFxuICAgICAgICAgIHN0eWxlcTogc3R5bGVxLFxuICAgICAgICAgIHN0eWxlYTogc3R5bGVhLFxuICAgICAgICAgIHN0eWxlOiBzdHlsZXFcbiAgICAgICAgfVxuICAgICAgKVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVjdGFuZ2xlQXJlYVZpZXcoQSwgQiwgQywgRCwgbGFiZWxzLCBkYXRhLCB2aWV3T3B0aW9ucylcbiAgfVxuXG4gIHJlbmRlciAoKTogdm9pZCB7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICAgIGlmIChjdHggPT09IG51bGwpIHsgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgZ2V0IGNvbnRleHQnKSB9XG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KSAvLyBjbGVhclxuICAgIGN0eC5zZXRMaW5lRGFzaChbXSlcblxuICAgIC8vIGRyYXcgcmVjdGFuZ2xlXG4gICAgY3R4LmJlZ2luUGF0aCgpXG4gICAgY3R4Lm1vdmVUbyh0aGlzLkEueCwgdGhpcy5BLnkpXG4gICAgY3R4LmxpbmVUbyh0aGlzLkIueCwgdGhpcy5CLnkpXG4gICAgY3R4LmxpbmVUbyh0aGlzLkMueCwgdGhpcy5DLnkpXG4gICAgY3R4LmxpbmVUbyh0aGlzLkQueCwgdGhpcy5ELnkpXG4gICAgY3R4LmxpbmVUbyh0aGlzLkEueCwgdGhpcy5BLnkpXG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmZpbGxTdHlsZSA9IHJhbmRFbGVtKGNvbG9ycylcbiAgICBjdHguZmlsbCgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICAvLyByaWdodCBhbmdsZXNcbiAgICBjb25zdCBzaXplID0gTWF0aC5taW4oXG4gICAgICAxNSxcbiAgICAgIE1hdGgubWluKFBvaW50LmRpc3RhbmNlKHRoaXMuQSwgdGhpcy5CKSwgUG9pbnQuZGlzdGFuY2UodGhpcy5CLCB0aGlzLkMpKSAvIDNcbiAgICApXG4gICAgY3R4LmJlZ2luUGF0aCgpXG4gICAgZHJhd1JpZ2h0QW5nbGUoY3R4LCB0aGlzLkEsIHRoaXMuQiwgdGhpcy5DLCBzaXplKVxuICAgIGRyYXdSaWdodEFuZ2xlKGN0eCwgdGhpcy5CLCB0aGlzLkMsIHRoaXMuRCwgc2l6ZSlcbiAgICBkcmF3UmlnaHRBbmdsZShjdHgsIHRoaXMuQywgdGhpcy5ELCB0aGlzLkEsIHNpemUpXG4gICAgZHJhd1JpZ2h0QW5nbGUoY3R4LCB0aGlzLkQsIHRoaXMuQSwgdGhpcy5CLCBzaXplKVxuICAgIGN0eC5zdHJva2UoKVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoKVxuICB9XG59XG4iLCJpbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IFJlY3RhbmdsZUFyZWFEYXRhIGZyb20gJy4vUmVjdGFuZ2xlQXJlYURhdGEnXG5pbXBvcnQgUmVjdGFuZ2xlQXJlYVZpZXcgZnJvbSAnLi9SZWN0YW5nbGVBcmVhVmlldydcbmltcG9ydCB7IFF1ZXN0aW9uT3B0aW9ucyB9IGZyb20gJy4vdHlwZXMnXG5cbi8vIFJlY3RhbmdsZSBuZWVkcyBubyBmdXJ0aGVyIG9wdGlvbnNcbi8vIFRyaWFuZ2xlIG5lZWRzIG5vIGZ1cnRoZXIgb3B0aW9ucyAtLSBuZWVkcyBwYXNzaW5nIGluXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlY3RhbmdsZUFyZWFRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhITogUmVjdGFuZ2xlQXJlYURhdGEgLy8gaW5pdGlhbGlzZWQgaW4gc3VwZXIoKVxuICB2aWV3ITogUmVjdGFuZ2xlQXJlYVZpZXdcblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBRdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucykge1xuICAgIGNvbnN0IGRhdGEgPSBSZWN0YW5nbGVBcmVhRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gUmVjdGFuZ2xlQXJlYVZpZXcuZnJvbURhdGEoZGF0YSwgdmlld09wdGlvbnMpXG4gICAgcmV0dXJuIG5ldyB0aGlzKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWVzJ1xuICB9XG59XG4iLCIvKiEgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcclxuQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uXHJcblxyXG5QZXJtaXNzaW9uIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBhbmQvb3IgZGlzdHJpYnV0ZSB0aGlzIHNvZnR3YXJlIGZvciBhbnlcclxucHVycG9zZSB3aXRoIG9yIHdpdGhvdXQgZmVlIGlzIGhlcmVieSBncmFudGVkLlxyXG5cclxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiBBTkQgVEhFIEFVVEhPUiBESVNDTEFJTVMgQUxMIFdBUlJBTlRJRVMgV0lUSFxyXG5SRUdBUkQgVE8gVEhJUyBTT0ZUV0FSRSBJTkNMVURJTkcgQUxMIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFlcclxuQU5EIEZJVE5FU1MuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1IgQkUgTElBQkxFIEZPUiBBTlkgU1BFQ0lBTCwgRElSRUNULFxyXG5JTkRJUkVDVCwgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTIE9SIEFOWSBEQU1BR0VTIFdIQVRTT0VWRVIgUkVTVUxUSU5HIEZST01cclxuTE9TUyBPRiBVU0UsIERBVEEgT1IgUFJPRklUUywgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIE5FR0xJR0VOQ0UgT1JcclxuT1RIRVIgVE9SVElPVVMgQUNUSU9OLCBBUklTSU5HIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFVTRSBPUlxyXG5QRVJGT1JNQU5DRSBPRiBUSElTIFNPRlRXQVJFLlxyXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiAqL1xyXG4vKiBnbG9iYWwgUmVmbGVjdCwgUHJvbWlzZSAqL1xyXG5cclxudmFyIGV4dGVuZFN0YXRpY3MgPSBmdW5jdGlvbihkLCBiKSB7XHJcbiAgICBleHRlbmRTdGF0aWNzID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8XHJcbiAgICAgICAgKHsgX19wcm90b19fOiBbXSB9IGluc3RhbmNlb2YgQXJyYXkgJiYgZnVuY3Rpb24gKGQsIGIpIHsgZC5fX3Byb3RvX18gPSBiOyB9KSB8fFxyXG4gICAgICAgIGZ1bmN0aW9uIChkLCBiKSB7IGZvciAodmFyIHAgaW4gYikgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChiLCBwKSkgZFtwXSA9IGJbcF07IH07XHJcbiAgICByZXR1cm4gZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2V4dGVuZHMoZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xyXG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcclxuICAgIHZhciB0ID0ge307XHJcbiAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICB0W3BdID0gc1twXTtcclxuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcclxuICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgIH1cclxuICAgIHJldHVybiB0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5tZXRhZGF0YSA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gUmVmbGVjdC5tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0ZXIodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19nZW5lcmF0b3IodGhpc0FyZywgYm9keSkge1xyXG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZztcclxuICAgIHJldHVybiBnID0geyBuZXh0OiB2ZXJiKDApLCBcInRocm93XCI6IHZlcmIoMSksIFwicmV0dXJuXCI6IHZlcmIoMikgfSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKG9wKSB7XHJcbiAgICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xyXG4gICAgICAgIHdoaWxlIChfKSB0cnkge1xyXG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XHJcbiAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcclxuICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XHJcbiAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19jcmVhdGVCaW5kaW5nID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9KTtcclxufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICBvW2syXSA9IG1ba107XHJcbn0pO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXhwb3J0U3RhcihtLCBvKSB7XHJcbiAgICBmb3IgKHZhciBwIGluIG0pIGlmIChwICE9PSBcImRlZmF1bHRcIiAmJiAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIHApKSBfX2NyZWF0ZUJpbmRpbmcobywgbSwgcCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3ZhbHVlcyhvKSB7XHJcbiAgICB2YXIgcyA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBTeW1ib2wuaXRlcmF0b3IsIG0gPSBzICYmIG9bc10sIGkgPSAwO1xyXG4gICAgaWYgKG0pIHJldHVybiBtLmNhbGwobyk7XHJcbiAgICBpZiAobyAmJiB0eXBlb2Ygby5sZW5ndGggPT09IFwibnVtYmVyXCIpIHJldHVybiB7XHJcbiAgICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAobyAmJiBpID49IG8ubGVuZ3RoKSBvID0gdm9pZCAwO1xyXG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogbyAmJiBvW2krK10sIGRvbmU6ICFvIH07XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IocyA/IFwiT2JqZWN0IGlzIG5vdCBpdGVyYWJsZS5cIiA6IFwiU3ltYm9sLml0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVhZChvLCBuKSB7XHJcbiAgICB2YXIgbSA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvW1N5bWJvbC5pdGVyYXRvcl07XHJcbiAgICBpZiAoIW0pIHJldHVybiBvO1xyXG4gICAgdmFyIGkgPSBtLmNhbGwobyksIHIsIGFyID0gW10sIGU7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHdoaWxlICgobiA9PT0gdm9pZCAwIHx8IG4tLSA+IDApICYmICEociA9IGkubmV4dCgpKS5kb25lKSBhci5wdXNoKHIudmFsdWUpO1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGVycm9yKSB7IGUgPSB7IGVycm9yOiBlcnJvciB9OyB9XHJcbiAgICBmaW5hbGx5IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAociAmJiAhci5kb25lICYmIChtID0gaVtcInJldHVyblwiXSkpIG0uY2FsbChpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZmluYWxseSB7IGlmIChlKSB0aHJvdyBlLmVycm9yOyB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZCgpIHtcclxuICAgIGZvciAodmFyIGFyID0gW10sIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgIGFyID0gYXIuY29uY2F0KF9fcmVhZChhcmd1bWVudHNbaV0pKTtcclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXlzKCkge1xyXG4gICAgZm9yICh2YXIgcyA9IDAsIGkgPSAwLCBpbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBpbDsgaSsrKSBzICs9IGFyZ3VtZW50c1tpXS5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciByID0gQXJyYXkocyksIGsgPSAwLCBpID0gMDsgaSA8IGlsOyBpKyspXHJcbiAgICAgICAgZm9yICh2YXIgYSA9IGFyZ3VtZW50c1tpXSwgaiA9IDAsIGpsID0gYS5sZW5ndGg7IGogPCBqbDsgaisrLCBrKyspXHJcbiAgICAgICAgICAgIHJba10gPSBhW2pdO1xyXG4gICAgcmV0dXJuIHI7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdCh2KSB7XHJcbiAgICByZXR1cm4gdGhpcyBpbnN0YW5jZW9mIF9fYXdhaXQgPyAodGhpcy52ID0gdiwgdGhpcykgOiBuZXcgX19hd2FpdCh2KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNHZW5lcmF0b3IodGhpc0FyZywgX2FyZ3VtZW50cywgZ2VuZXJhdG9yKSB7XHJcbiAgICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgdmFyIGcgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSksIGksIHEgPSBbXTtcclxuICAgIHJldHVybiBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobikgeyBpZiAoZ1tuXSkgaVtuXSA9IGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAoYSwgYikgeyBxLnB1c2goW24sIHYsIGEsIGJdKSA+IDEgfHwgcmVzdW1lKG4sIHYpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gcmVzdW1lKG4sIHYpIHsgdHJ5IHsgc3RlcChnW25dKHYpKTsgfSBjYXRjaCAoZSkgeyBzZXR0bGUocVswXVszXSwgZSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gc3RlcChyKSB7IHIudmFsdWUgaW5zdGFuY2VvZiBfX2F3YWl0ID8gUHJvbWlzZS5yZXNvbHZlKHIudmFsdWUudikudGhlbihmdWxmaWxsLCByZWplY3QpIDogc2V0dGxlKHFbMF1bMl0sIHIpOyB9XHJcbiAgICBmdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7IHJlc3VtZShcIm5leHRcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiByZWplY3QodmFsdWUpIHsgcmVzdW1lKFwidGhyb3dcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUoZiwgdikgeyBpZiAoZih2KSwgcS5zaGlmdCgpLCBxLmxlbmd0aCkgcmVzdW1lKHFbMF1bMF0sIHFbMF1bMV0pOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jRGVsZWdhdG9yKG8pIHtcclxuICAgIHZhciBpLCBwO1xyXG4gICAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiLCBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9KSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpW25dID0gb1tuXSA/IGZ1bmN0aW9uICh2KSB7IHJldHVybiAocCA9ICFwKSA/IHsgdmFsdWU6IF9fYXdhaXQob1tuXSh2KSksIGRvbmU6IG4gPT09IFwicmV0dXJuXCIgfSA6IGYgPyBmKHYpIDogdjsgfSA6IGY7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNWYWx1ZXMobykge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBtID0gb1tTeW1ib2wuYXN5bmNJdGVyYXRvcl0sIGk7XHJcbiAgICByZXR1cm4gbSA/IG0uY2FsbChvKSA6IChvID0gdHlwZW9mIF9fdmFsdWVzID09PSBcImZ1bmN0aW9uXCIgPyBfX3ZhbHVlcyhvKSA6IG9bU3ltYm9sLml0ZXJhdG9yXSgpLCBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaSk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaVtuXSA9IG9bbl0gJiYgZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHsgdiA9IG9bbl0odiksIHNldHRsZShyZXNvbHZlLCByZWplY3QsIHYuZG9uZSwgdi52YWx1ZSk7IH0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCBkLCB2KSB7IFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGZ1bmN0aW9uKHYpIHsgcmVzb2x2ZSh7IHZhbHVlOiB2LCBkb25lOiBkIH0pOyB9LCByZWplY3QpOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX21ha2VUZW1wbGF0ZU9iamVjdChjb29rZWQsIHJhdykge1xyXG4gICAgaWYgKE9iamVjdC5kZWZpbmVQcm9wZXJ0eSkgeyBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29va2VkLCBcInJhd1wiLCB7IHZhbHVlOiByYXcgfSk7IH0gZWxzZSB7IGNvb2tlZC5yYXcgPSByYXc7IH1cclxuICAgIHJldHVybiBjb29rZWQ7XHJcbn07XHJcblxyXG52YXIgX19zZXRNb2R1bGVEZWZhdWx0ID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XHJcbn0pIDogZnVuY3Rpb24obywgdikge1xyXG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0U3Rhcihtb2QpIHtcclxuICAgIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XHJcbiAgICB2YXIgcmVzdWx0ID0ge307XHJcbiAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgaW4gbW9kKSBpZiAoayAhPT0gXCJkZWZhdWx0XCIgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1vZCwgaykpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwgayk7XHJcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0RGVmYXVsdChtb2QpIHtcclxuICAgIHJldHVybiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSA/IG1vZCA6IHsgZGVmYXVsdDogbW9kIH07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0KHJlY2VpdmVyLCBwcml2YXRlTWFwKSB7XHJcbiAgICBpZiAoIXByaXZhdGVNYXAuaGFzKHJlY2VpdmVyKSkge1xyXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJhdHRlbXB0ZWQgdG8gZ2V0IHByaXZhdGUgZmllbGQgb24gbm9uLWluc3RhbmNlXCIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHByaXZhdGVNYXAuZ2V0KHJlY2VpdmVyKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRTZXQocmVjZWl2ZXIsIHByaXZhdGVNYXAsIHZhbHVlKSB7XHJcbiAgICBpZiAoIXByaXZhdGVNYXAuaGFzKHJlY2VpdmVyKSkge1xyXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJhdHRlbXB0ZWQgdG8gc2V0IHByaXZhdGUgZmllbGQgb24gbm9uLWluc3RhbmNlXCIpO1xyXG4gICAgfVxyXG4gICAgcHJpdmF0ZU1hcC5zZXQocmVjZWl2ZXIsIHZhbHVlKTtcclxuICAgIHJldHVybiB2YWx1ZTtcclxufVxyXG4iLCJpbXBvcnQgeyByYW5kRWxlbSwgcmFuZE11bHRCZXR3ZWVuIH0gZnJvbSAnLi91dGlsaXRpZXMuanMnXG5cbmNvbnN0IHBhdGhSb290ID0gJy9kaXN0LydcblxudHlwZSBpbmRleFZhbHMgPSAnMTAwJyB8ICcyMDAnIHwgJzMwMCcgfCAnNDAwJyB8ICc1MDAnXG5cbmV4cG9ydCBpbnRlcmZhY2UgVHJpYW5nbGV7XG4gIGI6IG51bWJlcixcbiAgczE6IG51bWJlcixcbiAgczI6IG51bWJlcixcbiAgaDogbnVtYmVyXG59XG5cbmludGVyZmFjZSBkYXRhU291cmNlIHtcbiAgcmVhZG9ubHkgbGVuZ3RoOiBudW1iZXIsXG4gIHJlYWRvbmx5IHBhdGg6IHN0cmluZyxcbiAgbG9hZGVkOiBib29sZWFuLFxuICBkYXRhOiBUcmlhbmdsZVtdXG59XG5cbmNvbnN0IGRhdGFTb3VyY2VzIDogUmVjb3JkPGluZGV4VmFscywgZGF0YVNvdXJjZT4gPSB7XG4gIDEwMDoge1xuICAgIGxlbmd0aDogMzYxLFxuICAgIHBhdGg6ICcvZGF0YS90cmlhbmdsZXMwLTEwMC5qc29uJyxcbiAgICBsb2FkZWQ6IGZhbHNlLFxuICAgIGRhdGE6IFtdXG4gIH0sXG4gIDIwMDoge1xuICAgIGxlbmd0aDogNzE1LFxuICAgIHBhdGg6ICcvZGF0YS90cmlhbmdsZXMxMDAtMjAwLmpzb24nLFxuICAgIGxvYWRlZDogZmFsc2UsXG4gICAgZGF0YTogW11cbiAgfSxcbiAgMzAwOiB7XG4gICAgbGVuZ3RoOiA5MjcsXG4gICAgcGF0aDogJy9kYXRhL3RyaWFuZ2xlczIwMC0zMDAuanNvbicsXG4gICAgbG9hZGVkOiBmYWxzZSxcbiAgICBkYXRhOiBbXVxuICB9LFxuICA0MDA6IHtcbiAgICBsZW5ndGg6IDEwNDMsXG4gICAgcGF0aDogJy9kYXRhL3RyaWFuZ2xlczMwMC00MDAuanNvbicsXG4gICAgbG9hZGVkOiBmYWxzZSxcbiAgICBkYXRhOiBbXVxuICB9LFxuICA1MDA6IHtcbiAgICBsZW5ndGg6IDExNTEsXG4gICAgcGF0aDogJy9kYXRhL3RyaWFuZ2xlczQwMC01MDAuanNvbicsXG4gICAgbG9hZGVkOiBmYWxzZSxcbiAgICBkYXRhOiBbXVxuICB9XG59XG5cbi8qKlxuICogUmV0dXJuIGEgcHJvbWlzZSB0byBhIHJhbmRvbWx5IGNob3NlbiB0cmlhbmdsZSAoc2VlIHRyaWFuZ2xlRGF0YS5UcmlhbmdsZSBpbnRlcmZhY2UgZm9yIGZvcm1hdClcbiAqIEBwYXJhbSBtYXhMZW5ndGggTWF4dW11bSBsZW5ndGggb2Ygc2lkZVxuICogQHBhcmFtIGZpbHRlclByZWRpY2F0ZSBSZXN0cmljdCB0byB0cmlhbmdsZXMgd2l0aCB0aGlzIHByb3BlcnR5XG4gKi9cbmZ1bmN0aW9uIGdldFRyaWFuZ2xlIChtYXhMZW5ndGg6IG51bWJlciwgZmlsdGVyUHJlZGljYXRlPzogKHQ6IFRyaWFuZ2xlKSA9PiBib29sZWFuKSA6IFByb21pc2U8VHJpYW5nbGU+IHtcbiAgbGV0IHRyaWFuZ2xlOiBUcmlhbmdsZVxuICBmaWx0ZXJQcmVkaWNhdGUgPSBmaWx0ZXJQcmVkaWNhdGUgPz8gKHQgPT4gdHJ1ZSkgLy8gZGVmYXVsdCB2YWx1ZSBmb3IgcHJlZGljYXRlIGlzIHRhdXRvbG9neVxuXG4gIC8vIENob29zZSBtdWx0aXBsZSBvZiA1MCB0byBzZWxlY3QgZnJvbSAtIHNtb290aHMgb3V0IGRpc3RyaWJ1dGlvbi5cbiAgLy8gKE90aGVyd2lzZSBpdCdzIGJpYXNlZCB0b3dhcmRzIGhpZ2hlciBsZW5ndGhzKVxuICBpZiAobWF4TGVuZ3RoID4gNTAwKSBtYXhMZW5ndGggPSA1MDBcbiAgY29uc3QgYmluNTAgPSByYW5kTXVsdEJldHdlZW4oMCwgbWF4TGVuZ3RoIC0gMSwgNTApICsgNTAgLy8gZS5nLiBpZiBiaW41MCA9IDE1MCwgY2hvb3NlIHdpdGggYSBtYXhsZW5ndGggYmV0d2VlbiAxMDAgYW5kIDE1MFxuICBjb25zdCBiaW4xMDAgPSAoTWF0aC5jZWlsKGJpbjUwIC8gMTAwKSAqIDEwMCkudG9TdHJpbmcoKSBhcyBpbmRleFZhbHMgLy8gZS5nLiBpZiBiaW41MCA9IDE1MCwgYmluMTAwID0gTWF0aC5jZWlsKDEuNSkqMTAwID0gMjAwXG4gIGNvbnN0IGRhdGFTb3VyY2UgPSBkYXRhU291cmNlc1tiaW4xMDBdXG5cbiAgaWYgKGRhdGFTb3VyY2UubG9hZGVkKSB7IC8vIENhY2hlZFxuICAgIGNvbnNvbGUubG9nKCdVc2luZyBjYWNoZWQgZGF0YScpXG4gICAgdHJpYW5nbGUgPSByYW5kRWxlbShkYXRhU291cmNlLmRhdGEuZmlsdGVyKHQgPT4gbWF4U2lkZSh0KSA8IG1heExlbmd0aCAmJiBmaWx0ZXJQcmVkaWNhdGUhKHQpKSlcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRyaWFuZ2xlKVxuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUubG9nKCdMb2FkaW5nIGRhdGEgd2l0aCBYSFInKVxuICAgIHJldHVybiBmZXRjaChgJHtwYXRoUm9vdH0ke2RhdGFTb3VyY2UucGF0aH1gKS50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KHJlc3BvbnNlLnN0YXR1c1RleHQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8VHJpYW5nbGVbXT5cbiAgICAgIH1cbiAgICB9KS50aGVuKGRhdGEgPT4ge1xuICAgICAgaWYgKCFkYXRhU291cmNlLmxvYWRlZCkgeyAvLyBjYWNoZSBpZiBzb21ldGhpbmcgaGFzbid0IGJlYXRlbiB1cyB0byBpdFxuICAgICAgICBkYXRhU291cmNlLmxvYWRlZCA9IHRydWVcbiAgICAgICAgZGF0YVNvdXJjZS5kYXRhID0gZGF0YVxuICAgICAgfVxuICAgICAgdHJpYW5nbGUgPSByYW5kRWxlbShkYXRhLmZpbHRlcigodDogVHJpYW5nbGUpID0+IG1heFNpZGUodCkgPCBtYXhMZW5ndGggJiYgZmlsdGVyUHJlZGljYXRlISh0KSkpXG4gICAgICByZXR1cm4gdHJpYW5nbGVcbiAgICB9KVxuICB9XG59XG5cbmZ1bmN0aW9uIG1heFNpZGUgKHRyaWFuZ2xlOiBUcmlhbmdsZSkge1xuICByZXR1cm4gTWF0aC5tYXgodHJpYW5nbGUuYiwgdHJpYW5nbGUuczEsIHRyaWFuZ2xlLnMyKVxufVxuXG5leHBvcnQgeyBnZXRUcmlhbmdsZSwgZGF0YVNvdXJjZXMgfVxuIiwiLyoqXG4gKiBAbGljZW5zZSBGcmFjdGlvbi5qcyB2NC4wLjEyIDA5LzA5LzIwMTVcbiAqIGh0dHA6Ly93d3cueGFyZy5vcmcvMjAxNC8wMy9yYXRpb25hbC1udW1iZXJzLWluLWphdmFzY3JpcHQvXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1LCBSb2JlcnQgRWlzZWxlIChyb2JlcnRAeGFyZy5vcmcpXG4gKiBEdWFsIGxpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgb3IgR1BMIFZlcnNpb24gMiBsaWNlbnNlcy5cbiAqKi9cblxuXG4vKipcbiAqXG4gKiBUaGlzIGNsYXNzIG9mZmVycyB0aGUgcG9zc2liaWxpdHkgdG8gY2FsY3VsYXRlIGZyYWN0aW9ucy5cbiAqIFlvdSBjYW4gcGFzcyBhIGZyYWN0aW9uIGluIGRpZmZlcmVudCBmb3JtYXRzLiBFaXRoZXIgYXMgYXJyYXksIGFzIGRvdWJsZSwgYXMgc3RyaW5nIG9yIGFzIGFuIGludGVnZXIuXG4gKlxuICogQXJyYXkvT2JqZWN0IGZvcm1cbiAqIFsgMCA9PiA8bm9taW5hdG9yPiwgMSA9PiA8ZGVub21pbmF0b3I+IF1cbiAqIFsgbiA9PiA8bm9taW5hdG9yPiwgZCA9PiA8ZGVub21pbmF0b3I+IF1cbiAqXG4gKiBJbnRlZ2VyIGZvcm1cbiAqIC0gU2luZ2xlIGludGVnZXIgdmFsdWVcbiAqXG4gKiBEb3VibGUgZm9ybVxuICogLSBTaW5nbGUgZG91YmxlIHZhbHVlXG4gKlxuICogU3RyaW5nIGZvcm1cbiAqIDEyMy40NTYgLSBhIHNpbXBsZSBkb3VibGVcbiAqIDEyMy80NTYgLSBhIHN0cmluZyBmcmFjdGlvblxuICogMTIzLic0NTYnIC0gYSBkb3VibGUgd2l0aCByZXBlYXRpbmcgZGVjaW1hbCBwbGFjZXNcbiAqIDEyMy4oNDU2KSAtIHN5bm9ueW1cbiAqIDEyMy40NSc2JyAtIGEgZG91YmxlIHdpdGggcmVwZWF0aW5nIGxhc3QgcGxhY2VcbiAqIDEyMy40NSg2KSAtIHN5bm9ueW1cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIHZhciBmID0gbmV3IEZyYWN0aW9uKFwiOS40JzMxJ1wiKTtcbiAqIGYubXVsKFstNCwgM10pLmRpdig0LjkpO1xuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCkge1xuXG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIC8vIE1heGltdW0gc2VhcmNoIGRlcHRoIGZvciBjeWNsaWMgcmF0aW9uYWwgbnVtYmVycy4gMjAwMCBzaG91bGQgYmUgbW9yZSB0aGFuIGVub3VnaC5cbiAgLy8gRXhhbXBsZTogMS83ID0gMC4oMTQyODU3KSBoYXMgNiByZXBlYXRpbmcgZGVjaW1hbCBwbGFjZXMuXG4gIC8vIElmIE1BWF9DWUNMRV9MRU4gZ2V0cyByZWR1Y2VkLCBsb25nIGN5Y2xlcyB3aWxsIG5vdCBiZSBkZXRlY3RlZCBhbmQgdG9TdHJpbmcoKSBvbmx5IGdldHMgdGhlIGZpcnN0IDEwIGRpZ2l0c1xuICB2YXIgTUFYX0NZQ0xFX0xFTiA9IDIwMDA7XG5cbiAgLy8gUGFyc2VkIGRhdGEgdG8gYXZvaWQgY2FsbGluZyBcIm5ld1wiIGFsbCB0aGUgdGltZVxuICB2YXIgUCA9IHtcbiAgICBcInNcIjogMSxcbiAgICBcIm5cIjogMCxcbiAgICBcImRcIjogMVxuICB9O1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZUVycm9yKG5hbWUpIHtcblxuICAgIGZ1bmN0aW9uIGVycm9yQ29uc3RydWN0b3IoKSB7XG4gICAgICB2YXIgdGVtcCA9IEVycm9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB0ZW1wWyduYW1lJ10gPSB0aGlzWyduYW1lJ10gPSBuYW1lO1xuICAgICAgdGhpc1snc3RhY2snXSA9IHRlbXBbJ3N0YWNrJ107XG4gICAgICB0aGlzWydtZXNzYWdlJ10gPSB0ZW1wWydtZXNzYWdlJ107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXJyb3IgY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIEludGVybWVkaWF0ZUluaGVyaXRvcigpIHt9XG4gICAgSW50ZXJtZWRpYXRlSW5oZXJpdG9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZTtcbiAgICBlcnJvckNvbnN0cnVjdG9yLnByb3RvdHlwZSA9IG5ldyBJbnRlcm1lZGlhdGVJbmhlcml0b3IoKTtcblxuICAgIHJldHVybiBlcnJvckNvbnN0cnVjdG9yO1xuICB9XG5cbiAgdmFyIERpdmlzaW9uQnlaZXJvID0gRnJhY3Rpb25bJ0RpdmlzaW9uQnlaZXJvJ10gPSBjcmVhdGVFcnJvcignRGl2aXNpb25CeVplcm8nKTtcbiAgdmFyIEludmFsaWRQYXJhbWV0ZXIgPSBGcmFjdGlvblsnSW52YWxpZFBhcmFtZXRlciddID0gY3JlYXRlRXJyb3IoJ0ludmFsaWRQYXJhbWV0ZXInKTtcblxuICBmdW5jdGlvbiBhc3NpZ24obiwgcykge1xuXG4gICAgaWYgKGlzTmFOKG4gPSBwYXJzZUludChuLCAxMCkpKSB7XG4gICAgICB0aHJvd0ludmFsaWRQYXJhbSgpO1xuICAgIH1cbiAgICByZXR1cm4gbiAqIHM7XG4gIH1cblxuICBmdW5jdGlvbiB0aHJvd0ludmFsaWRQYXJhbSgpIHtcbiAgICB0aHJvdyBuZXcgSW52YWxpZFBhcmFtZXRlcigpO1xuICB9XG5cbiAgdmFyIHBhcnNlID0gZnVuY3Rpb24ocDEsIHAyKSB7XG5cbiAgICB2YXIgbiA9IDAsIGQgPSAxLCBzID0gMTtcbiAgICB2YXIgdiA9IDAsIHcgPSAwLCB4ID0gMCwgeSA9IDEsIHogPSAxO1xuXG4gICAgdmFyIEEgPSAwLCBCID0gMTtcbiAgICB2YXIgQyA9IDEsIEQgPSAxO1xuXG4gICAgdmFyIE4gPSAxMDAwMDAwMDtcbiAgICB2YXIgTTtcblxuICAgIGlmIChwMSA9PT0gdW5kZWZpbmVkIHx8IHAxID09PSBudWxsKSB7XG4gICAgICAvKiB2b2lkICovXG4gICAgfSBlbHNlIGlmIChwMiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBuID0gcDE7XG4gICAgICBkID0gcDI7XG4gICAgICBzID0gbiAqIGQ7XG4gICAgfSBlbHNlXG4gICAgICBzd2l0Y2ggKHR5cGVvZiBwMSkge1xuXG4gICAgICAgIGNhc2UgXCJvYmplY3RcIjpcbiAgICAgICAge1xuICAgICAgICAgIGlmIChcImRcIiBpbiBwMSAmJiBcIm5cIiBpbiBwMSkge1xuICAgICAgICAgICAgbiA9IHAxW1wiblwiXTtcbiAgICAgICAgICAgIGQgPSBwMVtcImRcIl07XG4gICAgICAgICAgICBpZiAoXCJzXCIgaW4gcDEpXG4gICAgICAgICAgICAgIG4gKj0gcDFbXCJzXCJdO1xuICAgICAgICAgIH0gZWxzZSBpZiAoMCBpbiBwMSkge1xuICAgICAgICAgICAgbiA9IHAxWzBdO1xuICAgICAgICAgICAgaWYgKDEgaW4gcDEpXG4gICAgICAgICAgICAgIGQgPSBwMVsxXTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcyA9IG4gKiBkO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgICAge1xuICAgICAgICAgIGlmIChwMSA8IDApIHtcbiAgICAgICAgICAgIHMgPSBwMTtcbiAgICAgICAgICAgIHAxID0gLXAxO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChwMSAlIDEgPT09IDApIHtcbiAgICAgICAgICAgIG4gPSBwMTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHAxID4gMCkgeyAvLyBjaGVjayBmb3IgIT0gMCwgc2NhbGUgd291bGQgYmVjb21lIE5hTiAobG9nKDApKSwgd2hpY2ggY29udmVyZ2VzIHJlYWxseSBzbG93XG5cbiAgICAgICAgICAgIGlmIChwMSA+PSAxKSB7XG4gICAgICAgICAgICAgIHogPSBNYXRoLnBvdygxMCwgTWF0aC5mbG9vcigxICsgTWF0aC5sb2cocDEpIC8gTWF0aC5MTjEwKSk7XG4gICAgICAgICAgICAgIHAxIC89IHo7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVzaW5nIEZhcmV5IFNlcXVlbmNlc1xuICAgICAgICAgICAgLy8gaHR0cDovL3d3dy5qb2huZGNvb2suY29tL2Jsb2cvMjAxMC8xMC8yMC9iZXN0LXJhdGlvbmFsLWFwcHJveGltYXRpb24vXG5cbiAgICAgICAgICAgIHdoaWxlIChCIDw9IE4gJiYgRCA8PSBOKSB7XG4gICAgICAgICAgICAgIE0gPSAoQSArIEMpIC8gKEIgKyBEKTtcblxuICAgICAgICAgICAgICBpZiAocDEgPT09IE0pIHtcbiAgICAgICAgICAgICAgICBpZiAoQiArIEQgPD0gTikge1xuICAgICAgICAgICAgICAgICAgbiA9IEEgKyBDO1xuICAgICAgICAgICAgICAgICAgZCA9IEIgKyBEO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoRCA+IEIpIHtcbiAgICAgICAgICAgICAgICAgIG4gPSBDO1xuICAgICAgICAgICAgICAgICAgZCA9IEQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIG4gPSBBO1xuICAgICAgICAgICAgICAgICAgZCA9IEI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICBpZiAocDEgPiBNKSB7XG4gICAgICAgICAgICAgICAgICBBICs9IEM7XG4gICAgICAgICAgICAgICAgICBCICs9IEQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIEMgKz0gQTtcbiAgICAgICAgICAgICAgICAgIEQgKz0gQjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoQiA+IE4pIHtcbiAgICAgICAgICAgICAgICAgIG4gPSBDO1xuICAgICAgICAgICAgICAgICAgZCA9IEQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIG4gPSBBO1xuICAgICAgICAgICAgICAgICAgZCA9IEI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuICo9IHo7XG4gICAgICAgICAgfSBlbHNlIGlmIChpc05hTihwMSkgfHwgaXNOYU4ocDIpKSB7XG4gICAgICAgICAgICBkID0gbiA9IE5hTjtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBcInN0cmluZ1wiOlxuICAgICAgICB7XG4gICAgICAgICAgQiA9IHAxLm1hdGNoKC9cXGQrfC4vZyk7XG5cbiAgICAgICAgICBpZiAoQiA9PT0gbnVsbClcbiAgICAgICAgICAgIHRocm93SW52YWxpZFBhcmFtKCk7XG5cbiAgICAgICAgICBpZiAoQltBXSA9PT0gJy0nKSB7Ly8gQ2hlY2sgZm9yIG1pbnVzIHNpZ24gYXQgdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgcyA9IC0xO1xuICAgICAgICAgICAgQSsrO1xuICAgICAgICAgIH0gZWxzZSBpZiAoQltBXSA9PT0gJysnKSB7Ly8gQ2hlY2sgZm9yIHBsdXMgc2lnbiBhdCB0aGUgYmVnaW5uaW5nXG4gICAgICAgICAgICBBKys7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKEIubGVuZ3RoID09PSBBICsgMSkgeyAvLyBDaGVjayBpZiBpdCdzIGp1c3QgYSBzaW1wbGUgbnVtYmVyIFwiMTIzNFwiXG4gICAgICAgICAgICB3ID0gYXNzaWduKEJbQSsrXSwgcyk7XG4gICAgICAgICAgfSBlbHNlIGlmIChCW0EgKyAxXSA9PT0gJy4nIHx8IEJbQV0gPT09ICcuJykgeyAvLyBDaGVjayBpZiBpdCdzIGEgZGVjaW1hbCBudW1iZXJcblxuICAgICAgICAgICAgaWYgKEJbQV0gIT09ICcuJykgeyAvLyBIYW5kbGUgMC41IGFuZCAuNVxuICAgICAgICAgICAgICB2ID0gYXNzaWduKEJbQSsrXSwgcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBBKys7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBkZWNpbWFsIHBsYWNlc1xuICAgICAgICAgICAgaWYgKEEgKyAxID09PSBCLmxlbmd0aCB8fCBCW0EgKyAxXSA9PT0gJygnICYmIEJbQSArIDNdID09PSAnKScgfHwgQltBICsgMV0gPT09IFwiJ1wiICYmIEJbQSArIDNdID09PSBcIidcIikge1xuICAgICAgICAgICAgICB3ID0gYXNzaWduKEJbQV0sIHMpO1xuICAgICAgICAgICAgICB5ID0gTWF0aC5wb3coMTAsIEJbQV0ubGVuZ3RoKTtcbiAgICAgICAgICAgICAgQSsrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgcmVwZWF0aW5nIHBsYWNlc1xuICAgICAgICAgICAgaWYgKEJbQV0gPT09ICcoJyAmJiBCW0EgKyAyXSA9PT0gJyknIHx8IEJbQV0gPT09IFwiJ1wiICYmIEJbQSArIDJdID09PSBcIidcIikge1xuICAgICAgICAgICAgICB4ID0gYXNzaWduKEJbQSArIDFdLCBzKTtcbiAgICAgICAgICAgICAgeiA9IE1hdGgucG93KDEwLCBCW0EgKyAxXS5sZW5ndGgpIC0gMTtcbiAgICAgICAgICAgICAgQSArPSAzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfSBlbHNlIGlmIChCW0EgKyAxXSA9PT0gJy8nIHx8IEJbQSArIDFdID09PSAnOicpIHsgLy8gQ2hlY2sgZm9yIGEgc2ltcGxlIGZyYWN0aW9uIFwiMTIzLzQ1NlwiIG9yIFwiMTIzOjQ1NlwiXG4gICAgICAgICAgICB3ID0gYXNzaWduKEJbQV0sIHMpO1xuICAgICAgICAgICAgeSA9IGFzc2lnbihCW0EgKyAyXSwgMSk7XG4gICAgICAgICAgICBBICs9IDM7XG4gICAgICAgICAgfSBlbHNlIGlmIChCW0EgKyAzXSA9PT0gJy8nICYmIEJbQSArIDFdID09PSAnICcpIHsgLy8gQ2hlY2sgZm9yIGEgY29tcGxleCBmcmFjdGlvbiBcIjEyMyAxLzJcIlxuICAgICAgICAgICAgdiA9IGFzc2lnbihCW0FdLCBzKTtcbiAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBICsgMl0sIHMpO1xuICAgICAgICAgICAgeSA9IGFzc2lnbihCW0EgKyA0XSwgMSk7XG4gICAgICAgICAgICBBICs9IDU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKEIubGVuZ3RoIDw9IEEpIHsgLy8gQ2hlY2sgZm9yIG1vcmUgdG9rZW5zIG9uIHRoZSBzdGFja1xuICAgICAgICAgICAgZCA9IHkgKiB6O1xuICAgICAgICAgICAgcyA9IC8qIHZvaWQgKi9cbiAgICAgICAgICAgICAgICAgICAgbiA9IHggKyBkICogdiArIHogKiB3O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLyogRmFsbCB0aHJvdWdoIG9uIGVycm9yICovXG4gICAgICAgIH1cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0aHJvd0ludmFsaWRQYXJhbSgpO1xuICAgICAgfVxuXG4gICAgaWYgKGQgPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBEaXZpc2lvbkJ5WmVybygpO1xuICAgIH1cblxuICAgIFBbXCJzXCJdID0gcyA8IDAgPyAtMSA6IDE7XG4gICAgUFtcIm5cIl0gPSBNYXRoLmFicyhuKTtcbiAgICBQW1wiZFwiXSA9IE1hdGguYWJzKGQpO1xuICB9O1xuXG4gIGZ1bmN0aW9uIG1vZHBvdyhiLCBlLCBtKSB7XG5cbiAgICB2YXIgciA9IDE7XG4gICAgZm9yICg7IGUgPiAwOyBiID0gKGIgKiBiKSAlIG0sIGUgPj49IDEpIHtcblxuICAgICAgaWYgKGUgJiAxKSB7XG4gICAgICAgIHIgPSAociAqIGIpICUgbTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHI7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGN5Y2xlTGVuKG4sIGQpIHtcblxuICAgIGZvciAoOyBkICUgMiA9PT0gMDtcbiAgICAgICAgICAgIGQgLz0gMikge1xuICAgIH1cblxuICAgIGZvciAoOyBkICUgNSA9PT0gMDtcbiAgICAgICAgICAgIGQgLz0gNSkge1xuICAgIH1cblxuICAgIGlmIChkID09PSAxKSAvLyBDYXRjaCBub24tY3ljbGljIG51bWJlcnNcbiAgICAgIHJldHVybiAwO1xuXG4gICAgLy8gSWYgd2Ugd291bGQgbGlrZSB0byBjb21wdXRlIHJlYWxseSBsYXJnZSBudW1iZXJzIHF1aWNrZXIsIHdlIGNvdWxkIG1ha2UgdXNlIG9mIEZlcm1hdCdzIGxpdHRsZSB0aGVvcmVtOlxuICAgIC8vIDEwXihkLTEpICUgZCA9PSAxXG4gICAgLy8gSG93ZXZlciwgd2UgZG9uJ3QgbmVlZCBzdWNoIGxhcmdlIG51bWJlcnMgYW5kIE1BWF9DWUNMRV9MRU4gc2hvdWxkIGJlIHRoZSBjYXBzdG9uZSxcbiAgICAvLyBhcyB3ZSB3YW50IHRvIHRyYW5zbGF0ZSB0aGUgbnVtYmVycyB0byBzdHJpbmdzLlxuXG4gICAgdmFyIHJlbSA9IDEwICUgZDtcbiAgICB2YXIgdCA9IDE7XG5cbiAgICBmb3IgKDsgcmVtICE9PSAxOyB0KyspIHtcbiAgICAgIHJlbSA9IHJlbSAqIDEwICUgZDtcblxuICAgICAgaWYgKHQgPiBNQVhfQ1lDTEVfTEVOKVxuICAgICAgICByZXR1cm4gMDsgLy8gUmV0dXJuaW5nIDAgaGVyZSBtZWFucyB0aGF0IHdlIGRvbid0IHByaW50IGl0IGFzIGEgY3ljbGljIG51bWJlci4gSXQncyBsaWtlbHkgdGhhdCB0aGUgYW5zd2VyIGlzIGBkLTFgXG4gICAgfVxuICAgIHJldHVybiB0O1xuICB9XG5cblxuICAgICBmdW5jdGlvbiBjeWNsZVN0YXJ0KG4sIGQsIGxlbikge1xuXG4gICAgdmFyIHJlbTEgPSAxO1xuICAgIHZhciByZW0yID0gbW9kcG93KDEwLCBsZW4sIGQpO1xuXG4gICAgZm9yICh2YXIgdCA9IDA7IHQgPCAzMDA7IHQrKykgeyAvLyBzIDwgfmxvZzEwKE51bWJlci5NQVhfVkFMVUUpXG4gICAgICAvLyBTb2x2ZSAxMF5zID09IDEwXihzK3QpIChtb2QgZClcblxuICAgICAgaWYgKHJlbTEgPT09IHJlbTIpXG4gICAgICAgIHJldHVybiB0O1xuXG4gICAgICByZW0xID0gcmVtMSAqIDEwICUgZDtcbiAgICAgIHJlbTIgPSByZW0yICogMTAgJSBkO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdjZChhLCBiKSB7XG5cbiAgICBpZiAoIWEpXG4gICAgICByZXR1cm4gYjtcbiAgICBpZiAoIWIpXG4gICAgICByZXR1cm4gYTtcblxuICAgIHdoaWxlICgxKSB7XG4gICAgICBhICU9IGI7XG4gICAgICBpZiAoIWEpXG4gICAgICAgIHJldHVybiBiO1xuICAgICAgYiAlPSBhO1xuICAgICAgaWYgKCFiKVxuICAgICAgICByZXR1cm4gYTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIE1vZHVsZSBjb25zdHJ1Y3RvclxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtudW1iZXJ8RnJhY3Rpb249fSBhXG4gICAqIEBwYXJhbSB7bnVtYmVyPX0gYlxuICAgKi9cbiAgZnVuY3Rpb24gRnJhY3Rpb24oYSwgYikge1xuXG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZyYWN0aW9uKSkge1xuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihhLCBiKTtcbiAgICB9XG5cbiAgICBwYXJzZShhLCBiKTtcblxuICAgIGlmIChGcmFjdGlvblsnUkVEVUNFJ10pIHtcbiAgICAgIGEgPSBnY2QoUFtcImRcIl0sIFBbXCJuXCJdKTsgLy8gQWJ1c2UgYVxuICAgIH0gZWxzZSB7XG4gICAgICBhID0gMTtcbiAgICB9XG5cbiAgICB0aGlzW1wic1wiXSA9IFBbXCJzXCJdO1xuICAgIHRoaXNbXCJuXCJdID0gUFtcIm5cIl0gLyBhO1xuICAgIHRoaXNbXCJkXCJdID0gUFtcImRcIl0gLyBhO1xuICB9XG5cbiAgLyoqXG4gICAqIEJvb2xlYW4gZ2xvYmFsIHZhcmlhYmxlIHRvIGJlIGFibGUgdG8gZGlzYWJsZSBhdXRvbWF0aWMgcmVkdWN0aW9uIG9mIHRoZSBmcmFjdGlvblxuICAgKlxuICAgKi9cbiAgRnJhY3Rpb25bJ1JFRFVDRSddID0gMTtcblxuICBGcmFjdGlvbi5wcm90b3R5cGUgPSB7XG5cbiAgICBcInNcIjogMSxcbiAgICBcIm5cIjogMCxcbiAgICBcImRcIjogMSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGFic29sdXRlIHZhbHVlXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKC00KS5hYnMoKSA9PiA0XG4gICAgICoqL1xuICAgIFwiYWJzXCI6IGZ1bmN0aW9uKCkge1xuXG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXNbXCJuXCJdLCB0aGlzW1wiZFwiXSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEludmVydHMgdGhlIHNpZ24gb2YgdGhlIGN1cnJlbnQgZnJhY3Rpb25cbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oLTQpLm5lZygpID0+IDRcbiAgICAgKiovXG4gICAgXCJuZWdcIjogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oLXRoaXNbXCJzXCJdICogdGhpc1tcIm5cIl0sIHRoaXNbXCJkXCJdKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbih7bjogMiwgZDogM30pLmFkZChcIjE0LjlcIikgPT4gNDY3IC8gMzBcbiAgICAgKiovXG4gICAgXCJhZGRcIjogZnVuY3Rpb24oYSwgYikge1xuXG4gICAgICBwYXJzZShhLCBiKTtcbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgICAgIHRoaXNbXCJzXCJdICogdGhpc1tcIm5cIl0gKiBQW1wiZFwiXSArIFBbXCJzXCJdICogdGhpc1tcImRcIl0gKiBQW1wiblwiXSxcbiAgICAgICAgICAgICAgdGhpc1tcImRcIl0gKiBQW1wiZFwiXVxuICAgICAgICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdWJ0cmFjdHMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oe246IDIsIGQ6IDN9KS5hZGQoXCIxNC45XCIpID0+IC00MjcgLyAzMFxuICAgICAqKi9cbiAgICBcInN1YlwiOiBmdW5jdGlvbihhLCBiKSB7XG5cbiAgICAgIHBhcnNlKGEsIGIpO1xuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICAgICAgdGhpc1tcInNcIl0gKiB0aGlzW1wiblwiXSAqIFBbXCJkXCJdIC0gUFtcInNcIl0gKiB0aGlzW1wiZFwiXSAqIFBbXCJuXCJdLFxuICAgICAgICAgICAgICB0aGlzW1wiZFwiXSAqIFBbXCJkXCJdXG4gICAgICAgICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE11bHRpcGxpZXMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCItMTcuKDM0NSlcIikubXVsKDMpID0+IDU3NzYgLyAxMTFcbiAgICAgKiovXG4gICAgXCJtdWxcIjogZnVuY3Rpb24oYSwgYikge1xuXG4gICAgICBwYXJzZShhLCBiKTtcbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgICAgIHRoaXNbXCJzXCJdICogUFtcInNcIl0gKiB0aGlzW1wiblwiXSAqIFBbXCJuXCJdLFxuICAgICAgICAgICAgICB0aGlzW1wiZFwiXSAqIFBbXCJkXCJdXG4gICAgICAgICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpdmlkZXMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCItMTcuKDM0NSlcIikuaW52ZXJzZSgpLmRpdigzKVxuICAgICAqKi9cbiAgICBcImRpdlwiOiBmdW5jdGlvbihhLCBiKSB7XG5cbiAgICAgIHBhcnNlKGEsIGIpO1xuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICAgICAgdGhpc1tcInNcIl0gKiBQW1wic1wiXSAqIHRoaXNbXCJuXCJdICogUFtcImRcIl0sXG4gICAgICAgICAgICAgIHRoaXNbXCJkXCJdICogUFtcIm5cIl1cbiAgICAgICAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xvbmVzIHRoZSBhY3R1YWwgb2JqZWN0XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiLTE3LigzNDUpXCIpLmNsb25lKClcbiAgICAgKiovXG4gICAgXCJjbG9uZVwiOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24odGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIG1vZHVsbyBvZiB0d28gcmF0aW9uYWwgbnVtYmVycyAtIGEgbW9yZSBwcmVjaXNlIGZtb2RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykubW9kKFs3LCA4XSkgPT4gKDEzLzMpICUgKDcvOCkgPSAoNS82KVxuICAgICAqKi9cbiAgICBcIm1vZFwiOiBmdW5jdGlvbihhLCBiKSB7XG5cbiAgICAgIGlmIChpc05hTih0aGlzWyduJ10pIHx8IGlzTmFOKHRoaXNbJ2QnXSkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pO1xuICAgICAgfVxuXG4gICAgICBpZiAoYSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24odGhpc1tcInNcIl0gKiB0aGlzW1wiblwiXSAlIHRoaXNbXCJkXCJdLCAxKTtcbiAgICAgIH1cblxuICAgICAgcGFyc2UoYSwgYik7XG4gICAgICBpZiAoMCA9PT0gUFtcIm5cIl0gJiYgMCA9PT0gdGhpc1tcImRcIl0pIHtcbiAgICAgICAgRnJhY3Rpb24oMCwgMCk7IC8vIFRocm93IERpdmlzaW9uQnlaZXJvXG4gICAgICB9XG5cbiAgICAgIC8qXG4gICAgICAgKiBGaXJzdCBzaWxseSBhdHRlbXB0LCBraW5kYSBzbG93XG4gICAgICAgKlxuICAgICAgIHJldHVybiB0aGF0W1wic3ViXCJdKHtcbiAgICAgICBcIm5cIjogbnVtW1wiblwiXSAqIE1hdGguZmxvb3IoKHRoaXMubiAvIHRoaXMuZCkgLyAobnVtLm4gLyBudW0uZCkpLFxuICAgICAgIFwiZFwiOiBudW1bXCJkXCJdLFxuICAgICAgIFwic1wiOiB0aGlzW1wic1wiXVxuICAgICAgIH0pOyovXG5cbiAgICAgIC8qXG4gICAgICAgKiBOZXcgYXR0ZW1wdDogYTEgLyBiMSA9IGEyIC8gYjIgKiBxICsgclxuICAgICAgICogPT4gYjIgKiBhMSA9IGEyICogYjEgKiBxICsgYjEgKiBiMiAqIHJcbiAgICAgICAqID0+IChiMiAqIGExICUgYTIgKiBiMSkgLyAoYjEgKiBiMilcbiAgICAgICAqL1xuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICAgICAgdGhpc1tcInNcIl0gKiAoUFtcImRcIl0gKiB0aGlzW1wiblwiXSkgJSAoUFtcIm5cIl0gKiB0aGlzW1wiZFwiXSksXG4gICAgICAgICAgICAgIFBbXCJkXCJdICogdGhpc1tcImRcIl1cbiAgICAgICAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZnJhY3Rpb25hbCBnY2Qgb2YgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oNSw4KS5nY2QoMyw3KSA9PiAxLzU2XG4gICAgICovXG4gICAgXCJnY2RcIjogZnVuY3Rpb24oYSwgYikge1xuXG4gICAgICBwYXJzZShhLCBiKTtcblxuICAgICAgLy8gZ2NkKGEgLyBiLCBjIC8gZCkgPSBnY2QoYSwgYykgLyBsY20oYiwgZClcblxuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihnY2QoUFtcIm5cIl0sIHRoaXNbXCJuXCJdKSAqIGdjZChQW1wiZFwiXSwgdGhpc1tcImRcIl0pLCBQW1wiZFwiXSAqIHRoaXNbXCJkXCJdKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZnJhY3Rpb25hbCBsY20gb2YgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oNSw4KS5sY20oMyw3KSA9PiAxNVxuICAgICAqL1xuICAgIFwibGNtXCI6IGZ1bmN0aW9uKGEsIGIpIHtcblxuICAgICAgcGFyc2UoYSwgYik7XG5cbiAgICAgIC8vIGxjbShhIC8gYiwgYyAvIGQpID0gbGNtKGEsIGMpIC8gZ2NkKGIsIGQpXG5cbiAgICAgIGlmIChQW1wiblwiXSA9PT0gMCAmJiB0aGlzW1wiblwiXSA9PT0gMCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihQW1wiblwiXSAqIHRoaXNbXCJuXCJdLCBnY2QoUFtcIm5cIl0sIHRoaXNbXCJuXCJdKSAqIGdjZChQW1wiZFwiXSwgdGhpc1tcImRcIl0pKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgY2VpbCBvZiBhIHJhdGlvbmFsIG51bWJlclxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5jZWlsKCkgPT4gKDUgLyAxKVxuICAgICAqKi9cbiAgICBcImNlaWxcIjogZnVuY3Rpb24ocGxhY2VzKSB7XG5cbiAgICAgIHBsYWNlcyA9IE1hdGgucG93KDEwLCBwbGFjZXMgfHwgMCk7XG5cbiAgICAgIGlmIChpc05hTih0aGlzW1wiblwiXSkgfHwgaXNOYU4odGhpc1tcImRcIl0pKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5jZWlsKHBsYWNlcyAqIHRoaXNbXCJzXCJdICogdGhpc1tcIm5cIl0gLyB0aGlzW1wiZFwiXSksIHBsYWNlcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZsb29yIG9mIGEgcmF0aW9uYWwgbnVtYmVyXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLmZsb29yKCkgPT4gKDQgLyAxKVxuICAgICAqKi9cbiAgICBcImZsb29yXCI6IGZ1bmN0aW9uKHBsYWNlcykge1xuXG4gICAgICBwbGFjZXMgPSBNYXRoLnBvdygxMCwgcGxhY2VzIHx8IDApO1xuXG4gICAgICBpZiAoaXNOYU4odGhpc1tcIm5cIl0pIHx8IGlzTmFOKHRoaXNbXCJkXCJdKSkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTik7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGguZmxvb3IocGxhY2VzICogdGhpc1tcInNcIl0gKiB0aGlzW1wiblwiXSAvIHRoaXNbXCJkXCJdKSwgcGxhY2VzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUm91bmRzIGEgcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5yb3VuZCgpID0+ICg0IC8gMSlcbiAgICAgKiovXG4gICAgXCJyb3VuZFwiOiBmdW5jdGlvbihwbGFjZXMpIHtcblxuICAgICAgcGxhY2VzID0gTWF0aC5wb3coMTAsIHBsYWNlcyB8fCAwKTtcblxuICAgICAgaWYgKGlzTmFOKHRoaXNbXCJuXCJdKSB8fCBpc05hTih0aGlzW1wiZFwiXSkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLnJvdW5kKHBsYWNlcyAqIHRoaXNbXCJzXCJdICogdGhpc1tcIm5cIl0gLyB0aGlzW1wiZFwiXSksIHBsYWNlcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGludmVyc2Ugb2YgdGhlIGZyYWN0aW9uLCBtZWFucyBudW1lcmF0b3IgYW5kIGRlbnVtZXJhdG9yIGFyZSBleGNoYW5nZWRcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oWy0zLCA0XSkuaW52ZXJzZSgpID0+IC00IC8gM1xuICAgICAqKi9cbiAgICBcImludmVyc2VcIjogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24odGhpc1tcInNcIl0gKiB0aGlzW1wiZFwiXSwgdGhpc1tcIm5cIl0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmcmFjdGlvbiB0byBzb21lIGludGVnZXIgZXhwb25lbnRcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oLTEsMikucG93KC0zKSA9PiAtOFxuICAgICAqL1xuICAgIFwicG93XCI6IGZ1bmN0aW9uKG0pIHtcblxuICAgICAgaWYgKG0gPCAwKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5wb3codGhpc1sncyddICogdGhpc1tcImRcIl0sIC1tKSwgTWF0aC5wb3codGhpc1tcIm5cIl0sIC1tKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGgucG93KHRoaXNbJ3MnXSAqIHRoaXNbXCJuXCJdLCBtKSwgTWF0aC5wb3codGhpc1tcImRcIl0sIG0pKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdHdvIHJhdGlvbmFsIG51bWJlcnMgYXJlIHRoZSBzYW1lXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDE5LjYpLmVxdWFscyhbOTgsIDVdKTtcbiAgICAgKiovXG4gICAgXCJlcXVhbHNcIjogZnVuY3Rpb24oYSwgYikge1xuXG4gICAgICBwYXJzZShhLCBiKTtcbiAgICAgIHJldHVybiB0aGlzW1wic1wiXSAqIHRoaXNbXCJuXCJdICogUFtcImRcIl0gPT09IFBbXCJzXCJdICogUFtcIm5cIl0gKiB0aGlzW1wiZFwiXTsgLy8gU2FtZSBhcyBjb21wYXJlKCkgPT09IDBcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdHdvIHJhdGlvbmFsIG51bWJlcnMgYXJlIHRoZSBzYW1lXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDE5LjYpLmVxdWFscyhbOTgsIDVdKTtcbiAgICAgKiovXG4gICAgXCJjb21wYXJlXCI6IGZ1bmN0aW9uKGEsIGIpIHtcblxuICAgICAgcGFyc2UoYSwgYik7XG4gICAgICB2YXIgdCA9ICh0aGlzW1wic1wiXSAqIHRoaXNbXCJuXCJdICogUFtcImRcIl0gLSBQW1wic1wiXSAqIFBbXCJuXCJdICogdGhpc1tcImRcIl0pO1xuICAgICAgcmV0dXJuICgwIDwgdCkgLSAodCA8IDApO1xuICAgIH0sXG5cbiAgICBcInNpbXBsaWZ5XCI6IGZ1bmN0aW9uKGVwcykge1xuXG4gICAgICAvLyBGaXJzdCBuYWl2ZSBpbXBsZW1lbnRhdGlvbiwgbmVlZHMgaW1wcm92ZW1lbnRcblxuICAgICAgaWYgKGlzTmFOKHRoaXNbJ24nXSkgfHwgaXNOYU4odGhpc1snZCddKSkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cblxuICAgICAgdmFyIGNvbnQgPSB0aGlzWydhYnMnXSgpWyd0b0NvbnRpbnVlZCddKCk7XG5cbiAgICAgIGVwcyA9IGVwcyB8fCAwLjAwMTtcblxuICAgICAgZnVuY3Rpb24gcmVjKGEpIHtcbiAgICAgICAgaWYgKGEubGVuZ3RoID09PSAxKVxuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oYVswXSk7XG4gICAgICAgIHJldHVybiByZWMoYS5zbGljZSgxKSlbJ2ludmVyc2UnXSgpWydhZGQnXShhWzBdKTtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb250Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciB0bXAgPSByZWMoY29udC5zbGljZSgwLCBpICsgMSkpO1xuICAgICAgICBpZiAodG1wWydzdWInXSh0aGlzWydhYnMnXSgpKVsnYWJzJ10oKS52YWx1ZU9mKCkgPCBlcHMpIHtcbiAgICAgICAgICByZXR1cm4gdG1wWydtdWwnXSh0aGlzWydzJ10pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdHdvIHJhdGlvbmFsIG51bWJlcnMgYXJlIGRpdmlzaWJsZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigxOS42KS5kaXZpc2libGUoMS41KTtcbiAgICAgKi9cbiAgICBcImRpdmlzaWJsZVwiOiBmdW5jdGlvbihhLCBiKSB7XG5cbiAgICAgIHBhcnNlKGEsIGIpO1xuICAgICAgcmV0dXJuICEoIShQW1wiblwiXSAqIHRoaXNbXCJkXCJdKSB8fCAoKHRoaXNbXCJuXCJdICogUFtcImRcIl0pICUgKFBbXCJuXCJdICogdGhpc1tcImRcIl0pKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBkZWNpbWFsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBmcmFjdGlvblxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEwMC4nOTE4MjMnXCIpLnZhbHVlT2YoKSA9PiAxMDAuOTE4MjM5MTgyMzkxODNcbiAgICAgKiovXG4gICAgJ3ZhbHVlT2YnOiBmdW5jdGlvbigpIHtcblxuICAgICAgcmV0dXJuIHRoaXNbXCJzXCJdICogdGhpc1tcIm5cIl0gLyB0aGlzW1wiZFwiXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIHN0cmluZy1mcmFjdGlvbiByZXByZXNlbnRhdGlvbiBvZiBhIEZyYWN0aW9uIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEuJzMnXCIpLnRvRnJhY3Rpb24oKSA9PiBcIjQgMS8zXCJcbiAgICAgKiovXG4gICAgJ3RvRnJhY3Rpb24nOiBmdW5jdGlvbihleGNsdWRlV2hvbGUpIHtcblxuICAgICAgdmFyIHdob2xlLCBzdHIgPSBcIlwiO1xuICAgICAgdmFyIG4gPSB0aGlzW1wiblwiXTtcbiAgICAgIHZhciBkID0gdGhpc1tcImRcIl07XG4gICAgICBpZiAodGhpc1tcInNcIl0gPCAwKSB7XG4gICAgICAgIHN0ciArPSAnLSc7XG4gICAgICB9XG5cbiAgICAgIGlmIChkID09PSAxKSB7XG4gICAgICAgIHN0ciArPSBuO1xuICAgICAgfSBlbHNlIHtcblxuICAgICAgICBpZiAoZXhjbHVkZVdob2xlICYmICh3aG9sZSA9IE1hdGguZmxvb3IobiAvIGQpKSA+IDApIHtcbiAgICAgICAgICBzdHIgKz0gd2hvbGU7XG4gICAgICAgICAgc3RyICs9IFwiIFwiO1xuICAgICAgICAgIG4gJT0gZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0ciArPSBuO1xuICAgICAgICBzdHIgKz0gJy8nO1xuICAgICAgICBzdHIgKz0gZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBsYXRleCByZXByZXNlbnRhdGlvbiBvZiBhIEZyYWN0aW9uIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEuJzMnXCIpLnRvTGF0ZXgoKSA9PiBcIlxcZnJhY3s0fXszfVwiXG4gICAgICoqL1xuICAgICd0b0xhdGV4JzogZnVuY3Rpb24oZXhjbHVkZVdob2xlKSB7XG5cbiAgICAgIHZhciB3aG9sZSwgc3RyID0gXCJcIjtcbiAgICAgIHZhciBuID0gdGhpc1tcIm5cIl07XG4gICAgICB2YXIgZCA9IHRoaXNbXCJkXCJdO1xuICAgICAgaWYgKHRoaXNbXCJzXCJdIDwgMCkge1xuICAgICAgICBzdHIgKz0gJy0nO1xuICAgICAgfVxuXG4gICAgICBpZiAoZCA9PT0gMSkge1xuICAgICAgICBzdHIgKz0gbjtcbiAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgaWYgKGV4Y2x1ZGVXaG9sZSAmJiAod2hvbGUgPSBNYXRoLmZsb29yKG4gLyBkKSkgPiAwKSB7XG4gICAgICAgICAgc3RyICs9IHdob2xlO1xuICAgICAgICAgIG4gJT0gZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0ciArPSBcIlxcXFxmcmFje1wiO1xuICAgICAgICBzdHIgKz0gbjtcbiAgICAgICAgc3RyICs9ICd9eyc7XG4gICAgICAgIHN0ciArPSBkO1xuICAgICAgICBzdHIgKz0gJ30nO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhbiBhcnJheSBvZiBjb250aW51ZWQgZnJhY3Rpb24gZWxlbWVudHNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCI3LzhcIikudG9Db250aW51ZWQoKSA9PiBbMCwxLDddXG4gICAgICovXG4gICAgJ3RvQ29udGludWVkJzogZnVuY3Rpb24oKSB7XG5cbiAgICAgIHZhciB0O1xuICAgICAgdmFyIGEgPSB0aGlzWyduJ107XG4gICAgICB2YXIgYiA9IHRoaXNbJ2QnXTtcbiAgICAgIHZhciByZXMgPSBbXTtcblxuICAgICAgaWYgKGlzTmFOKHRoaXNbJ24nXSkgfHwgaXNOYU4odGhpc1snZCddKSkge1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgfVxuXG4gICAgICBkbyB7XG4gICAgICAgIHJlcy5wdXNoKE1hdGguZmxvb3IoYSAvIGIpKTtcbiAgICAgICAgdCA9IGEgJSBiO1xuICAgICAgICBhID0gYjtcbiAgICAgICAgYiA9IHQ7XG4gICAgICB9IHdoaWxlIChhICE9PSAxKTtcblxuICAgICAgcmV0dXJuIHJlcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhIGZyYWN0aW9uIHdpdGggYWxsIGRpZ2l0c1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEwMC4nOTE4MjMnXCIpLnRvU3RyaW5nKCkgPT4gXCIxMDAuKDkxODIzKVwiXG4gICAgICoqL1xuICAgICd0b1N0cmluZyc6IGZ1bmN0aW9uKGRlYykge1xuXG4gICAgICB2YXIgZztcbiAgICAgIHZhciBOID0gdGhpc1tcIm5cIl07XG4gICAgICB2YXIgRCA9IHRoaXNbXCJkXCJdO1xuXG4gICAgICBpZiAoaXNOYU4oTikgfHwgaXNOYU4oRCkpIHtcbiAgICAgICAgcmV0dXJuIFwiTmFOXCI7XG4gICAgICB9XG5cbiAgICAgIGlmICghRnJhY3Rpb25bJ1JFRFVDRSddKSB7XG4gICAgICAgIGcgPSBnY2QoTiwgRCk7XG4gICAgICAgIE4gLz0gZztcbiAgICAgICAgRCAvPSBnO1xuICAgICAgfVxuXG4gICAgICBkZWMgPSBkZWMgfHwgMTU7IC8vIDE1ID0gZGVjaW1hbCBwbGFjZXMgd2hlbiBubyByZXBpdGF0aW9uXG5cbiAgICAgIHZhciBjeWNMZW4gPSBjeWNsZUxlbihOLCBEKTsgLy8gQ3ljbGUgbGVuZ3RoXG4gICAgICB2YXIgY3ljT2ZmID0gY3ljbGVTdGFydChOLCBELCBjeWNMZW4pOyAvLyBDeWNsZSBzdGFydFxuXG4gICAgICB2YXIgc3RyID0gdGhpc1sncyddID09PSAtMSA/IFwiLVwiIDogXCJcIjtcblxuICAgICAgc3RyICs9IE4gLyBEIHwgMDtcblxuICAgICAgTiAlPSBEO1xuICAgICAgTiAqPSAxMDtcblxuICAgICAgaWYgKE4pXG4gICAgICAgIHN0ciArPSBcIi5cIjtcblxuICAgICAgaWYgKGN5Y0xlbikge1xuXG4gICAgICAgIGZvciAodmFyIGkgPSBjeWNPZmY7IGktLTsgKSB7XG4gICAgICAgICAgc3RyICs9IE4gLyBEIHwgMDtcbiAgICAgICAgICBOICU9IEQ7XG4gICAgICAgICAgTiAqPSAxMDtcbiAgICAgICAgfVxuICAgICAgICBzdHIgKz0gXCIoXCI7XG4gICAgICAgIGZvciAodmFyIGkgPSBjeWNMZW47IGktLTsgKSB7XG4gICAgICAgICAgc3RyICs9IE4gLyBEIHwgMDtcbiAgICAgICAgICBOICU9IEQ7XG4gICAgICAgICAgTiAqPSAxMDtcbiAgICAgICAgfVxuICAgICAgICBzdHIgKz0gXCIpXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBpID0gZGVjOyBOICYmIGktLTsgKSB7XG4gICAgICAgICAgc3RyICs9IE4gLyBEIHwgMDtcbiAgICAgICAgICBOICU9IEQ7XG4gICAgICAgICAgTiAqPSAxMDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gIH07XG5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmVbXCJhbWRcIl0pIHtcbiAgICBkZWZpbmUoW10sIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIEZyYWN0aW9uO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSBcIm9iamVjdFwiKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7J3ZhbHVlJzogdHJ1ZX0pO1xuICAgIEZyYWN0aW9uWydkZWZhdWx0J10gPSBGcmFjdGlvbjtcbiAgICBGcmFjdGlvblsnRnJhY3Rpb24nXSA9IEZyYWN0aW9uO1xuICAgIG1vZHVsZVsnZXhwb3J0cyddID0gRnJhY3Rpb247XG4gIH0gZWxzZSB7XG4gICAgcm9vdFsnRnJhY3Rpb24nXSA9IEZyYWN0aW9uO1xuICB9XG5cbn0pKHRoaXMpO1xuIiwiaW1wb3J0IHsgcmFuZEJldHdlZW4sIHJhbmRFbGVtLCBzY2FsZWRTdHIgfSBmcm9tICd1dGlsaXRpZXMuanMnIC8vIGNoYW5nZSByZWxhdGl2ZSBwYXRoIGFmdGVyIHRlc3RpbmdcbmltcG9ydCB7IFZhbHVlIH0gZnJvbSAnLi9SZWN0YW5nbGVBcmVhRGF0YSdcbmltcG9ydCB7IFF1ZXN0aW9uT3B0aW9ucyB9IGZyb20gJy4vdHlwZXMnXG5pbXBvcnQgKiBhcyBURCBmcm9tICd0cmlhbmdsZURhdGEnXG5pbXBvcnQgZnJhY3Rpb24gZnJvbSAnZnJhY3Rpb24uanMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRyaWFuZ2xlQXJlYURhdGEge1xuICByZWFkb25seSBiYXNlOiBWYWx1ZVxuICByZWFkb25seSBzaWRlMTogVmFsdWVcbiAgcmVhZG9ubHkgc2lkZTI6IFZhbHVlXG4gIHJlYWRvbmx5IGhlaWdodDogVmFsdWVcbiAgcHJpdmF0ZSByZWFkb25seSBkcDogbnVtYmVyXG4gIHByaXZhdGUgcmVhZG9ubHkgZGVub21pbmF0b3I6IG51bWJlciA9IDFcbiAgcHJpdmF0ZSBfYXJlYT86IFBhcnRpYWw8VmFsdWU+XG4gIHByaXZhdGUgX3BlcmltZXRlcj86IFBhcnRpYWw8VmFsdWU+XG5cbiAgY29uc3RydWN0b3IgKFxuICAgIGJhc2U6IFZhbHVlLFxuICAgIHNpZGUxOiBWYWx1ZSxcbiAgICBzaWRlMjogVmFsdWUsXG4gICAgaGVpZ2h0OiBWYWx1ZSxcbiAgICBkcDogbnVtYmVyLFxuICAgIGRlbm9taW5hdG9yOiBudW1iZXIsXG4gICAgYXJlYVByb3BlcnRpZXM/OiBPbWl0PFZhbHVlLCAndmFsJz4sXG4gICAgcGVyaW1ldGVyUHJvcGVydGllcz86IE9taXQ8VmFsdWUsICd2YWwnPikge1xuICAgIHRoaXMuYmFzZSA9IGJhc2VcbiAgICB0aGlzLnNpZGUxID0gc2lkZTFcbiAgICB0aGlzLnNpZGUyID0gc2lkZTJcbiAgICB0aGlzLmhlaWdodCA9IGhlaWdodFxuICAgIHRoaXMuZHAgPSBkcFxuICAgIHRoaXMuZGVub21pbmF0b3IgPSBkZW5vbWluYXRvclxuICAgIHRoaXMuX2FyZWEgPSBhcmVhUHJvcGVydGllc1xuICAgIHRoaXMuX3BlcmltZXRlciA9IHBlcmltZXRlclByb3BlcnRpZXNcbiAgfVxuXG4gIGdldCBwZXJpbWV0ZXIgKCk6IFZhbHVlIHtcbiAgICBpZiAoIXRoaXMuX3BlcmltZXRlcikgeyAvLyBkZWZhdWx0cyBmb3IgcHJvcGVydGllc1xuICAgICAgdGhpcy5fcGVyaW1ldGVyID0ge1xuICAgICAgICBzaG93OiBmYWxzZSxcbiAgICAgICAgbWlzc2luZzogdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXRoaXMuX3BlcmltZXRlci52YWwpIHtcbiAgICAgIHRoaXMuX3BlcmltZXRlci52YWwgPSB0aGlzLmJhc2UudmFsICsgdGhpcy5zaWRlMS52YWwgKyB0aGlzLnNpZGUyLnZhbFxuICAgICAgdGhpcy5fcGVyaW1ldGVyLmxhYmVsID0gc2NhbGVkU3RyKHRoaXMuX3BlcmltZXRlci52YWwsIHRoaXMuZHApICsgJ1xcXFxtYXRocm17Y219J1xuICAgICAgaWYgKHRoaXMuZGVub21pbmF0b3IgPiAxKSB7XG4gICAgICAgIHRoaXMuX3BlcmltZXRlci5sYWJlbCA9IG5ldyBmcmFjdGlvbih0aGlzLl9wZXJpbWV0ZXIudmFsLCB0aGlzLmRlbm9taW5hdG9yKS50b0xhdGV4KHRydWUpICsgJ1xcXFxtYXRocm17Y219J1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcGVyaW1ldGVyLmxhYmVsID0gc2NhbGVkU3RyKHRoaXMuX3BlcmltZXRlci52YWwsIHRoaXMuZHApICsgJ1xcXFxtYXRocm17Y219J1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9wZXJpbWV0ZXIgYXMgVmFsdWVcbiAgfVxuXG4gIGdldCBhcmVhICgpOiBWYWx1ZSB7XG4gICAgaWYgKCF0aGlzLl9hcmVhKSB7XG4gICAgICB0aGlzLl9hcmVhID0ge1xuICAgICAgICBzaG93OiBmYWxzZSxcbiAgICAgICAgbWlzc2luZzogdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXRoaXMuX2FyZWEudmFsKSB7XG4gICAgICB0aGlzLl9hcmVhLnZhbCA9IHRoaXMuYmFzZS52YWwgKiB0aGlzLmhlaWdodC52YWwgLyAyXG4gICAgICBpZiAodGhpcy5kZW5vbWluYXRvciA+IDEpIHtcbiAgICAgICAgdGhpcy5fYXJlYS5sYWJlbCA9IG5ldyBmcmFjdGlvbih0aGlzLl9hcmVhLnZhbCwgdGhpcy5kZW5vbWluYXRvcioqMikudG9MYXRleCh0cnVlKSArICdcXFxcbWF0aHJte2NtfV4yJ1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fYXJlYS5sYWJlbCA9IHNjYWxlZFN0cih0aGlzLl9hcmVhLnZhbCwgMiAqIHRoaXMuZHApICsgJ1xcXFxtYXRocm17Y219XjInXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9hcmVhIGFzIFZhbHVlXG4gIH1cblxuICBpc1JpZ2h0QW5nbGVkICgpOiBib29sZWFuIHtcbiAgICBjb25zdCB0cmlhbmdsZTogVEQuVHJpYW5nbGUgPSB7XG4gICAgICBiOiB0aGlzLmJhc2UudmFsLFxuICAgICAgaDogdGhpcy5oZWlnaHQudmFsLFxuICAgICAgczE6IHRoaXMuc2lkZTEudmFsLFxuICAgICAgczI6IHRoaXMuc2lkZTIudmFsXG4gICAgfVxuICAgIHJldHVybiBpc1JpZ2h0QW5nbGVkKHRyaWFuZ2xlKVxuICB9XG5cbiAgc3RhdGljIGFzeW5jIHJhbmRvbSAob3B0aW9uczogUXVlc3Rpb25PcHRpb25zKTogUHJvbWlzZTxUcmlhbmdsZUFyZWFEYXRhPiB7XG4gICAgb3B0aW9ucy5tYXhMZW5ndGggPSBvcHRpb25zLm1heExlbmd0aCB8fCAyMFxuICAgIGNvbnN0IGRwID0gb3B0aW9ucy5kcCB8fCAwXG4gICAgY29uc3QgZGVub21pbmF0b3IgPSBvcHRpb25zLmZyYWN0aW9uPyByYW5kQmV0d2VlbigyLDYpIDogMVxuICAgIGNvbnN0IHJlcXVpcmVJc29zY2VsZXMgPSAob3B0aW9ucy5xdWVzdGlvblR5cGUgPT09ICdweXRoYWdvcmFzSXNvc2NlbGVzQXJlYScpXG4gICAgY29uc3QgcmVxdWlyZVJpZ2h0QW5nbGUgPSAob3B0aW9ucy5xdWVzdGlvblR5cGUgPT09ICdweXRoYWdvcmFzQXJlYScgfHwgb3B0aW9ucy5xdWVzdGlvblR5cGUgPT09ICdweXRoYWdvcmFzUGVyaW1ldGVyJylcblxuICAgIC8vIGdldCBhIHRyaWFuZ2xlLiBURC5nZXRUcmlhbmdsZSBpcyBhc3luYywgc28gbmVlZCB0byBhd2FpdFxuICAgIGNvbnN0IHRyaWFuZ2xlOiBURC5UcmlhbmdsZSA9XG4gICAgICBhd2FpdCBURC5nZXRUcmlhbmdsZShvcHRpb25zLm1heExlbmd0aCwgdCA9PlxuICAgICAgICAoIXJlcXVpcmVJc29zY2VsZXMgfHwgaXNJc29zY2VsZXModCkpICYmXG4gICAgICAgICAgKCFyZXF1aXJlUmlnaHRBbmdsZSB8fCBpc1JpZ2h0QW5nbGVkKHQpKVxuICAgICAgKVxuXG4gICAgLy8gdXNlZnVsIGZvciBzb21lIGxvZ2ljIG5leHRcbiAgICAvLyBuYiBvbmx5IHJlZmVycyB0byBSQSB0cmlhbmdsZXMgd2hlciB0aGUgaHlwb3RlbnVzZSBpcyBub3QgdGhlICdiYXNlJ1xuICAgIGNvbnN0IHJpZ2h0QW5nbGVkID0gaXNSaWdodEFuZ2xlZCh0cmlhbmdsZSlcblxuICAgIGNvbnN0IGJhc2UgOiBWYWx1ZSA9IHsgdmFsOiB0cmlhbmdsZS5iLCBzaG93OiB0cnVlLCBtaXNzaW5nOiBmYWxzZSB9XG4gICAgY29uc3QgaGVpZ2h0IDogVmFsdWUgPSB7IHZhbDogdHJpYW5nbGUuaCwgc2hvdzogIXJpZ2h0QW5nbGVkLCBtaXNzaW5nOiBmYWxzZSB9IC8vIGhpZGUgaGVpZ2h0IGluIFJBIHRyaWFuZ2xlc1xuICAgIGNvbnN0IHNpZGUxIDogVmFsdWUgPSB7IHZhbDogdHJpYW5nbGUuczEsIHNob3c6IHRydWUsIG1pc3Npbmc6IGZhbHNlIH1cbiAgICBjb25zdCBzaWRlMiA6IFZhbHVlID0geyB2YWw6IHRyaWFuZ2xlLnMyLCBzaG93OiB0cnVlLCBtaXNzaW5nOiBmYWxzZSB9O1xuICAgIFtiYXNlLCBoZWlnaHQsIHNpZGUxLCBzaWRlMl0uZm9yRWFjaCh2ID0+IHtcbiAgICAgIGlmIChkZW5vbWluYXRvciA9PT0gMSkge1xuICAgICAgICB2LmxhYmVsID0gc2NhbGVkU3RyKHYudmFsLCBkcCkgKyAnXFxcXG1hdGhybXtjbX0nXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2LmxhYmVsID0gbmV3IGZyYWN0aW9uKHYudmFsLGRlbm9taW5hdG9yKS50b0xhdGV4KHRydWUpICsgXCJcXFxcbWF0aHJte2NtfVwiXG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIFNvbWUgYWxpYXNlcyB1c2VmdWwgd2hlbiByZWFzb25pbmcgYWJvdXQgUkEgdHJpYW5nbGVzXG4gICAgLy8gTkIgKGEpIHRoZXNlIGFyZSByZWZzIHRvIHNhbWUgb2JqZWN0LCBub3QgY29waWVzXG4gICAgLy8gKGIpIG5vdCB2ZXJ5IG1lYW5pbmdmdWwgZm9yIG5vbiBSQSB0cmlhbmdsZXNcbiAgICBjb25zdCBsZWcxID0gYmFzZVxuICAgIGNvbnN0IGxlZzIgPSAoc2lkZTEudmFsID4gc2lkZTIudmFsKSA/IHNpZGUyIDogc2lkZTFcbiAgICBjb25zdCBoeXBvdGVudXNlID0gKHNpZGUxLnZhbCA+IHNpZGUyLnZhbCkgPyBzaWRlMSA6IHNpZGUyXG5cbiAgICBjb25zdCBhcmVhUHJvcGVydGllcyA9IHsgc2hvdzogZmFsc2UsIG1pc3Npbmc6IHRydWUgfVxuICAgIGNvbnN0IHBlcmltZXRlclByb3BlcnRpZXMgPSB7IHNob3c6IGZhbHNlLCBtaXNzaW5nOiB0cnVlIH1cblxuICAgIC8vIHNob3cvaGlkZSBiYXNlZCBvbiB0eXBlXG4gICAgc3dpdGNoIChvcHRpb25zLnF1ZXN0aW9uVHlwZSkge1xuICAgICAgY2FzZSAnYXJlYSc6XG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdwZXJpbWV0ZXInOlxuICAgICAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMubWlzc2luZyA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3JldmVyc2VBcmVhJzoge1xuICAgICAgICBhcmVhUHJvcGVydGllcy5zaG93ID0gdHJ1ZVxuICAgICAgICBhcmVhUHJvcGVydGllcy5taXNzaW5nID0gZmFsc2VcbiAgICAgICAgY29uc3QgY29pblRvc3MgPSAoTWF0aC5yYW5kb20oKSA8IDAuNSkgLy8gNTAvNTAgdHJ1ZS9mYWxzZVxuICAgICAgICBpZiAocmlnaHRBbmdsZWQpIHsgLy8gaGlkZSBvbmUgb2YgdGhlIGxlZ3NcbiAgICAgICAgICBpZiAoY29pblRvc3MpIGxlZzEubWlzc2luZyA9IHRydWVcbiAgICAgICAgICBlbHNlIGxlZzIubWlzc2luZyA9IHRydWVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoY29pblRvc3MpIGJhc2UubWlzc2luZyA9IHRydWVcbiAgICAgICAgICBlbHNlIGhlaWdodC5taXNzaW5nID0gdHJ1ZVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdyZXZlcnNlUGVyaW1ldGVyJzoge1xuICAgICAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMubWlzc2luZyA9IGZhbHNlXG4gICAgICAgIHJhbmRFbGVtKFtiYXNlLCBzaWRlMSwgc2lkZTJdKS5taXNzaW5nID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAncHl0aGFnb3Jhc0FyZWEnOlxuICAgICAgICBpZiAoIXJpZ2h0QW5nbGVkKSB0aHJvdyBuZXcgRXJyb3IoJ1Nob3VsZCBoYXZlIFJBIHRyaWFuZ2xlIGhlcmUnKVxuICAgICAgICBhcmVhUHJvcGVydGllcy5zaG93ID0gdHJ1ZVxuICAgICAgICBhcmVhUHJvcGVydGllcy5taXNzaW5nID0gdHJ1ZVxuICAgICAgICByYW5kRWxlbShbbGVnMSwgbGVnMl0pLnNob3cgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAncHl0aGFnb3Jhc1BlcmltZXRlcic6IHsgLy8gc2hvdWxkIGFscmVhZHkgaGF2ZSBSQSB0cmlhbmdsZVxuICAgICAgICBpZiAoIXJpZ2h0QW5nbGVkKSB0aHJvdyBuZXcgRXJyb3IoJ1Nob3VsZCBoYXZlIFJBIHRyaWFuZ2xlIGhlcmUnKVxuICAgICAgICBwZXJpbWV0ZXJQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIHBlcmltZXRlclByb3BlcnRpZXMubWlzc2luZyA9IHRydWVcbiAgICAgICAgcmFuZEVsZW0oW2xlZzEsIGxlZzIsIGh5cG90ZW51c2VdKS5zaG93ID0gZmFsc2VcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3B5dGhhZ29yYXNJc29zY2VsZXNBcmVhJzpcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLnNob3cgPSB0cnVlXG4gICAgICAgIGFyZWFQcm9wZXJ0aWVzLm1pc3NpbmcgPSB0cnVlXG4gICAgICAgIGhlaWdodC5zaG93ID0gZmFsc2VcbiAgICAgICAgYnJlYWtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBUcmlhbmdsZUFyZWFEYXRhKGJhc2UsIHNpZGUxLCBzaWRlMiwgaGVpZ2h0LCBkcCwgZGVub21pbmF0b3IsIGFyZWFQcm9wZXJ0aWVzLCBwZXJpbWV0ZXJQcm9wZXJ0aWVzKVxuICB9XG59XG5cbmZ1bmN0aW9uIGlzSXNvc2NlbGVzICh0cmlhbmdsZTogVEQuVHJpYW5nbGUpOiBib29sZWFuIHtcbiAgcmV0dXJuIHRyaWFuZ2xlLnMxID09PSB0cmlhbmdsZS5zMlxufVxuXG5mdW5jdGlvbiBpc1JpZ2h0QW5nbGVkICh0cmlhbmdsZTogVEQuVHJpYW5nbGUpOiBib29sZWFuIHtcbiAgcmV0dXJuIHRyaWFuZ2xlLnMxID09PSB0cmlhbmdsZS5oIHx8IHRyaWFuZ2xlLnMyID09PSB0cmlhbmdsZS5oXG59XG4iLCJpbXBvcnQgeyBhcnJvd0xpbmUsIGRyYXdSaWdodEFuZ2xlIH0gZnJvbSAnZHJhd2luZydcbmltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IGNvdWxkU3RhcnRUcml2aWEgfSBmcm9tICd0eXBlc2NyaXB0J1xuaW1wb3J0IHsgY3JlYXRlRWxlbSwgcmFuZEVsZW0gfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUVZpZXcsIExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuL3R5cGVzJ1xuaW1wb3J0IHsgVmFsdWUgfSBmcm9tICcuL1JlY3RhbmdsZUFyZWFEYXRhJ1xuaW1wb3J0IFRyaWFuZ2xlQXJlYURhdGEgZnJvbSAnLi9UcmlhbmdsZUFyZWFEYXRhJ1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRyaWFuZ2xlQXJlYVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICBBPzogUG9pbnQgLy8gR2VuZXJhdGVkIGxhemlseSBvbiByZW5kZXJcbiAgQj86IFBvaW50XG4gIEM/OiBQb2ludFxuICBodD86IFBvaW50IC8vIGludGVyc2VjdGlvbiBvZiBoZWlnaHQgd2l0aCBiYXNlXG4gIG92ZXJoYW5nTGVmdD86IGJvb2xlYW5cbiAgb3ZlcmhhbmdSaWdodD86IGJvb2xlYW5cbiAgZGF0YSE6IFRyaWFuZ2xlQXJlYURhdGEgfCBQcm9taXNlPFRyaWFuZ2xlQXJlYURhdGE+XG4gIC8vIGxhYmVsczogTGFiZWxbXVxuICAvLyByb3RhdGlvbj86IG51bWJlclxuICBjb25zdHJ1Y3RvciAoZGF0YTogVHJpYW5nbGVBcmVhRGF0YSB8IFByb21pc2U8VHJpYW5nbGVBcmVhRGF0YT4sIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucywgQT86IFBvaW50LCBCPzogUG9pbnQsIEM/OlBvaW50LCBsYWJlbHM/OiBMYWJlbFtdKSB7XG4gICAgc3VwZXIoZGF0YSwgdmlld09wdGlvbnMpXG4gICAgdGhpcy5BID0gQVxuICAgIHRoaXMuQiA9IEJcbiAgICB0aGlzLkMgPSBDXG4gICAgdGhpcy5sYWJlbHMgPSBsYWJlbHMgPz8gW11cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW5kZXIgaW50byB0aGlzLmNhbnZhc1xuICAgKi9cbiAgYXN5bmMgcmVuZGVyICgpIHtcbiAgICAvLyBjcmVhdGUgbG9hZGluZyBpbWFnZVxuICAgIGNvbnN0IGxvYWRlciA9IGNyZWF0ZUVsZW0oJ2RpdicsICdsb2FkZXInLCB0aGlzLkRPTSlcbiAgICAvLyBmaXJzdCBpbml0IGlmIG5vdCBhbHJlYWR5XG4gICAgaWYgKHRoaXMuQSA9PT0gdW5kZWZpbmVkKSBhd2FpdCB0aGlzLmluaXQoKVxuXG4gICAgaWYgKCF0aGlzLkEgfHwgIXRoaXMuQiB8fCAhdGhpcy5DIHx8ICF0aGlzLmh0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludGlhbGlzYXRpb24gZmFpbGVkLiBQb2ludHMgYXJlOiAke1t0aGlzLkEsIHRoaXMuQiwgdGhpcy5DLCB0aGlzLmh0XX1gKVxuICAgIH1cbiAgICBpZiAodGhpcy5kYXRhIGluc3RhbmNlb2YgUHJvbWlzZSkgdGhyb3cgbmV3IEVycm9yKCdJbml0aWFsaXNhdGlvbiBmYWlsZWQ6IGRhdGEgaXMgc3RpbGwgYSBQcm9taXNlJylcblxuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICBpZiAoY3R4ID09PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBnZXQgY2FudmFzIGNvbnRleHQnKVxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcbiAgICBjdHguc2V0TGluZURhc2goW10pXG4gICAgLy8gZHJhdyB0cmlhbmdsZVxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGN0eC5tb3ZlVG8odGhpcy5BLngsIHRoaXMuQS55KVxuICAgIGN0eC5saW5lVG8odGhpcy5CLngsIHRoaXMuQi55KVxuICAgIGN0eC5saW5lVG8odGhpcy5DLngsIHRoaXMuQy55KVxuICAgIGN0eC5saW5lVG8odGhpcy5BLngsIHRoaXMuQS55KVxuICAgIGN0eC5zdHJva2UoKVxuICAgIGN0eC5maWxsU3R5bGUgPSByYW5kRWxlbShjb2xvcnMpXG4gICAgY3R4LmZpbGwoKVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgLy8gZHJhdyBoZWlnaHRcbiAgICBpZiAodGhpcy5kYXRhLmhlaWdodC5zaG93KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIC8vIGFycm93TGluZShjdHgsdGhpcy5DLHRoaXMuaHQsMTApO1xuICAgICAgYXJyb3dMaW5lKGN0eCxcbiAgICAgICAgUG9pbnQubWVhbih0aGlzLkMsIHRoaXMuaHQpLm1vdmVUb3dhcmQodGhpcy5DLCAxNSksXG4gICAgICAgIHRoaXMuQywgMTBcbiAgICAgIClcbiAgICAgIGFycm93TGluZShjdHgsXG4gICAgICAgIFBvaW50Lm1lYW4odGhpcy5DLCB0aGlzLmh0KS5tb3ZlVG93YXJkKHRoaXMuaHQsIDE1KSxcbiAgICAgICAgdGhpcy5odCwgMTBcbiAgICAgIClcbiAgICAgIGN0eC5zdHJva2UoKVxuICAgICAgY3R4LmNsb3NlUGF0aCgpXG4gICAgfVxuXG4gICAgLy8gcmlnaHQtYW5nbGUgc3ltYm9sXG4gICAgaWYgKHRoaXMuZGF0YS5pc1JpZ2h0QW5nbGVkKCkgfHwgdGhpcy5kYXRhLmhlaWdodC5zaG93KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIGlmICh0aGlzLkEuZXF1YWxzKHRoaXMuaHQpKSB7XG4gICAgICAgIGRyYXdSaWdodEFuZ2xlKGN0eCwgdGhpcy5CLCB0aGlzLmh0LCB0aGlzLkMsIDE1KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZHJhd1JpZ2h0QW5nbGUoY3R4LCB0aGlzLkEsIHRoaXMuaHQsIHRoaXMuQywgMTUpXG4gICAgICB9XG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIGN0eC5jbG9zZVBhdGgoKVxuICAgIH1cblxuICAgIGlmICh0aGlzLmRhdGEuaGVpZ2h0LnNob3cgJiYgdGhpcy5vdmVyaGFuZ1JpZ2h0KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIGN0eC5zZXRMaW5lRGFzaChbNSwgM10pXG4gICAgICBjdHgubW92ZVRvKHRoaXMuQi54LCB0aGlzLkIueSlcbiAgICAgIGN0eC5saW5lVG8odGhpcy5odC54LCB0aGlzLmh0LnkpXG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIGN0eC5jbG9zZVBhdGgoKVxuICAgIH1cbiAgICBpZiAodGhpcy5kYXRhLmhlaWdodC5zaG93ICYmIHRoaXMub3ZlcmhhbmdMZWZ0KSB7XG4gICAgICBjdHguYmVnaW5QYXRoKClcbiAgICAgIGN0eC5zZXRMaW5lRGFzaChbNSwgM10pXG4gICAgICBjdHgubW92ZVRvKHRoaXMuQS54LCB0aGlzLkEueSlcbiAgICAgIGN0eC5saW5lVG8odGhpcy5odC54LCB0aGlzLmh0LnkpXG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIGN0eC5jbG9zZVBhdGgoKVxuICAgIH1cblxuICAgIHRoaXMucmVuZGVyTGFiZWxzKClcbiAgICBsb2FkZXIucmVtb3ZlKClcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXNlLiBJbnN0YW5jZSBtZXRob2QgcmF0aGVyIHRoYW4gc3RhdGljIGZhY3RvcnkgbWV0aG9kLCBzbyBpbnN0YW5jZSBjYW4gY29udHJvbCwgZS5nLiBsb2FkaW5nIGljb25cbiAgICogYXN5bmMgc2luY2UgZGF0YSBpcyBhIHByb21pc2VcbiAgICovXG4gIGFzeW5jIGluaXQgKCkgOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLmRhdGEgPSBhd2FpdCB0aGlzLmRhdGFcbiAgICBjb25zdCBoID0gdGhpcy5kYXRhLmhlaWdodC52YWxcbiAgICBjb25zdCBiID0gdGhpcy5kYXRhLmJhc2UudmFsXG4gICAgY29uc3QgczEgPSB0aGlzLmRhdGEuc2lkZTEudmFsXG4gICAgY29uc3QgczIgPSB0aGlzLmRhdGEuc2lkZTIudmFsXG5cbiAgICAvLyBidWlsZCB1cHNpZGUgZG93blxuICAgIHRoaXMuQSA9IG5ldyBQb2ludCgwLCBoKVxuICAgIHRoaXMuQiA9IG5ldyBQb2ludChiLCBoKVxuICAgIHRoaXMuQyA9IG5ldyBQb2ludCgoYiAqIGIgKyBzMSAqIHMxIC0gczIgKiBzMikgLyAoMiAqIGIpLCAwKVxuICAgIHRoaXMuaHQgPSBuZXcgUG9pbnQodGhpcy5DLngsIHRoaXMuQS55KVxuXG4gICAgdGhpcy5vdmVyaGFuZ1JpZ2h0ID0gZmFsc2VcbiAgICB0aGlzLm92ZXJoYW5nTGVmdCA9IGZhbHNlXG4gICAgaWYgKHRoaXMuQy54ID4gdGhpcy5CLngpIHsgdGhpcy5vdmVyaGFuZ1JpZ2h0ID0gdHJ1ZSB9XG4gICAgaWYgKHRoaXMuQy54IDwgdGhpcy5BLngpIHsgdGhpcy5vdmVyaGFuZ0xlZnQgPSB0cnVlIH1cblxuICAgIC8vIHJvdGF0ZSwgc2NhbGUgYW5kIGNlbnRlclxuICAgIHRoaXMucm90YXRpb24gPSB0aGlzLnJvdGF0aW9uID8/IDIgKiBNYXRoLlBJICogTWF0aC5yYW5kb20oKVxuICAgIDtbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQywgdGhpcy5odF0uZm9yRWFjaChwdCA9PiBwdC5yb3RhdGUodGhpcy5yb3RhdGlvbiEpKVxuICAgIFBvaW50LnNjYWxlVG9GaXQoW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkMsIHRoaXMuaHRdLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCwgODApXG5cbiAgICAvLyBNYWtpbmcgbGFiZWxzIC0gbW9yZSBpbnZvbHZlZCB0aGFuIEkgcmVtZW1iZXJlZCFcbiAgICAvLyBGaXJzdCB0aGUgbGFiZWxzIGZvciB0aGUgc2lkZXNcbiAgICBjb25zdCBzaWRlcyA6IFtQb2ludCwgUG9pbnQsIFZhbHVlXVtdID0gWyAvLyBbMXN0IHBvaW50LCAybmQgcG9pbnQsIGRhdGFdXG4gICAgICBbdGhpcy5BLCB0aGlzLkIsIHRoaXMuZGF0YS5iYXNlXSxcbiAgICAgIFt0aGlzLkMsIHRoaXMuQSwgdGhpcy5kYXRhLnNpZGUxXSxcbiAgICAgIFt0aGlzLkIsIHRoaXMuQywgdGhpcy5kYXRhLnNpZGUyXVxuICAgIF1cblxuICAgIC8vIG9yZGVyIG9mIHB1dHRpbmcgaW4gaGVpZ2h0IG1hdHRlcnMgZm9yIG9mZnNldFxuICAgIC8vIFRoaXMgYnJlYWtzIGlmIHdlIGhhdmUgcm91bmRpbmcgZXJyb3JzXG4gICAgaWYgKHRoaXMuaHQuZXF1YWxzKHRoaXMuQikpIHsgLy9cbiAgICAgIHNpZGVzLnB1c2goW3RoaXMuaHQsIHRoaXMuQywgdGhpcy5kYXRhLmhlaWdodF0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHNpZGVzLnB1c2goW3RoaXMuQywgdGhpcy5odCwgdGhpcy5kYXRhLmhlaWdodF0pXG4gICAgfVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0OyBpKyspIHsgLy8gc2lkZXNcbiAgICAgIGlmICghc2lkZXNbaV1bMl0uc2hvdykgY29udGludWVcbiAgICAgIGNvbnN0IG9mZnNldCA9IDIwIC8vIG9mZnNldCBmcm9tIGxpbmUgYnkgdGhpcyBtYW55IHBpeGVsc1xuICAgICAgY29uc3QgcG9zID0gUG9pbnQubWVhbihzaWRlc1tpXVswXSwgc2lkZXNbaV1bMV0pIC8vIHN0YXJ0IGF0IG1pZHBvaW50XG4gICAgICBjb25zdCB1bml0dmVjID0gUG9pbnQudW5pdFZlY3RvcihzaWRlc1tpXVswXSwgc2lkZXNbaV1bMV0pXG5cbiAgICAgIGlmIChpIDwgMyB8fCB0aGlzLmRhdGEuaXNSaWdodEFuZ2xlZCgpKSB7IHBvcy50cmFuc2xhdGUoLXVuaXR2ZWMueSAqIG9mZnNldCwgdW5pdHZlYy54ICogb2Zmc2V0KSB9XG5cbiAgICAgIGNvbnN0IHRleHRhIDogc3RyaW5nID0gc2lkZXNbaV1bMl0ubGFiZWwgPz8gc2lkZXNbaV1bMl0udmFsLnRvU3RyaW5nKClcbiAgICAgIGNvbnN0IHRleHRxID0gc2lkZXNbaV1bMl0ubWlzc2luZyA/ICc/JyA6IHRleHRhXG4gICAgICBjb25zdCBzdHlsZXEgPSAnbm9ybWFsJ1xuICAgICAgY29uc3Qgc3R5bGVhID0gc2lkZXNbaV1bMl0ubWlzc2luZyA/ICdhbnN3ZXInIDogJ25vcm1hbCdcblxuICAgICAgdGhpcy5sYWJlbHMucHVzaCh7XG4gICAgICAgIHBvczogcG9zLFxuICAgICAgICB0ZXh0YTogdGV4dGEsXG4gICAgICAgIHRleHRxOiB0ZXh0cSxcbiAgICAgICAgdGV4dDogdGV4dHEsXG4gICAgICAgIHN0eWxlYTogc3R5bGVhLFxuICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgc3R5bGU6IHN0eWxlcVxuICAgICAgfSlcbiAgICB9XG5cbiAgICAvLyBhcmVhIGFuZCBwZXJpbWV0ZXJcbiAgICBsZXQgbkluZm8gPSAwXG4gICAgaWYgKHRoaXMuZGF0YS5hcmVhLnNob3cpIHtcbiAgICAgIGNvbnN0IHRleHRhIDogc3RyaW5nID0gdGhpcy5kYXRhLmFyZWEubGFiZWwgPz8gdGhpcy5kYXRhLmFyZWEudmFsLnRvU3RyaW5nKClcbiAgICAgIGNvbnN0IHRleHRxID0gdGhpcy5kYXRhLmFyZWEubWlzc2luZyA/ICc/JyA6IHRleHRhXG4gICAgICBjb25zdCBzdHlsZXEgPSAnZXh0cmEtaW5mbydcbiAgICAgIGNvbnN0IHN0eWxlYSA9IHRoaXMuZGF0YS5hcmVhLm1pc3NpbmcgPyAnZXh0cmEtYW5zd2VyJyA6ICdleHRyYS1pbmZvJ1xuICAgICAgdGhpcy5sYWJlbHMucHVzaChcbiAgICAgICAge1xuICAgICAgICAgIHRleHRhOiAnXFxcXHRleHR7QXJlYX0gPSAnICsgdGV4dGEsXG4gICAgICAgICAgdGV4dHE6ICdcXFxcdGV4dHtBcmVhfSA9ICcgKyB0ZXh0cSxcbiAgICAgICAgICB0ZXh0OiAnXFxcXHRleHR7QXJlYX0gPSAnICsgdGV4dHEsXG4gICAgICAgICAgc3R5bGVxOiBzdHlsZXEsXG4gICAgICAgICAgc3R5bGVhOiBzdHlsZWEsXG4gICAgICAgICAgc3R5bGU6IHN0eWxlcSxcbiAgICAgICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdGhpcy5oZWlnaHQgLSAxMCAtIDE1ICogbkluZm8pXG4gICAgICAgIH1cbiAgICAgIClcbiAgICAgIG5JbmZvKytcbiAgICB9XG4gICAgaWYgKHRoaXMuZGF0YS5wZXJpbWV0ZXIuc2hvdykge1xuICAgICAgY29uc3QgdGV4dGEgPSB0aGlzLmRhdGEucGVyaW1ldGVyLmxhYmVsID8/IHRoaXMuZGF0YS5wZXJpbWV0ZXIudmFsLnRvU3RyaW5nKClcbiAgICAgIGNvbnN0IHRleHRxID0gdGhpcy5kYXRhLnBlcmltZXRlci5taXNzaW5nID8gJz8nIDogdGV4dGFcbiAgICAgIGNvbnN0IHN0eWxlcSA9ICdleHRyYS1pbmZvJ1xuICAgICAgY29uc3Qgc3R5bGVhID0gdGhpcy5kYXRhLnBlcmltZXRlci5taXNzaW5nID8gJ2V4dHJhLWFuc3dlcicgOiAnZXh0cmEtaW5mbydcbiAgICAgIHRoaXMubGFiZWxzLnB1c2goXG4gICAgICAgIHtcbiAgICAgICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdGhpcy5oZWlnaHQgLSAxMCAtIDIwICogbkluZm8pLFxuICAgICAgICAgIHRleHRhOiAnXFxcXHRleHR7UGVyaW1ldGVyfSA9ICcgKyB0ZXh0YSxcbiAgICAgICAgICB0ZXh0cTogJ1xcXFx0ZXh0e1BlcmltZXRlcn0gPSAnICsgdGV4dHEsXG4gICAgICAgICAgdGV4dDogJ1xcXFx0ZXh0e1BlcmltZXRlcn0gPSAnICsgdGV4dHEsXG4gICAgICAgICAgc3R5bGVxOiBzdHlsZXEsXG4gICAgICAgICAgc3R5bGVhOiBzdHlsZWEsXG4gICAgICAgICAgc3R5bGU6IHN0eWxlcVxuICAgICAgICB9XG4gICAgICApXG4gICAgfVxuXG4gICAgLy8gc3RvcCB0aGVtIGZyb20gY2xhc2hpbmcgLSBobW0sIG5vdCBzdXJlXG4gICAgLypcbiAgICB0aGlzLnN1Y2Nlc3M9dHJ1ZTtcbiAgICBmb3IgKGxldCBpID0gMCwgbj10aGlzLmxhYmVscy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgaTsgaisrKSB7XG4gICAgICAgIGNvbnN0IGwxPXRoaXMubGFiZWxzW2ldLCBsMj10aGlzLmxhYmVsc1tqXTtcbiAgICAgICAgY29uc3QgZCA9IFBvaW50LmRpc3RhbmNlKGwxLnBvcyxsMi5wb3MpO1xuICAgICAgICAvL2NvbnNvbGUubG9nKGBkKCcke2wxLnRleHR9JywnJHtsMi50ZXh0fScpID0gJHtkfWApO1xuICAgICAgICBpZiAoZCA8IDIwKSB7XG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhcInRvbyBjbG9zZVwiKTtcbiAgICAgICAgICB0aGlzLnN1Y2Nlc3M9ZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9ICovXG4gIH1cblxuICBzdGF0aWMgZnJvbUFzeW5jRGF0YSAoZGF0YTogUHJvbWlzZTxUcmlhbmdsZUFyZWFEYXRhPiwgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgcmV0dXJuIG5ldyB0aGlzKGRhdGEsIHZpZXdPcHRpb25zKVxuICB9XG59XG4iLCJpbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IFRyaWFuZ2xlQXJlYURhdGEgZnJvbSAnLi9UcmlhbmdsZUFyZWFEYXRhJ1xuaW1wb3J0IFRyaWFuZ2xlQXJlYVZpZXcgZnJvbSAnLi9UcmlhbmdsZUFyZWFWaWV3J1xuaW1wb3J0IHsgUXVlc3Rpb25PcHRpb25zIH0gZnJvbSAnLi90eXBlcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVHJpYW5nbGVBcmVhUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YSE6IFRyaWFuZ2xlQXJlYURhdGEgfCBQcm9taXNlPFRyaWFuZ2xlQXJlYURhdGE+IC8vIGluaXRpYWxpc2VkIGluIHN1cGVyKClcbiAgdmlldyE6IFRyaWFuZ2xlQXJlYVZpZXdcblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBRdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucykge1xuICAgIGNvbnN0IGRhdGEgPSBUcmlhbmdsZUFyZWFEYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBUcmlhbmdsZUFyZWFWaWV3LmZyb21Bc3luY0RhdGEoZGF0YSwgdmlld09wdGlvbnMpXG4gICAgcmV0dXJuIG5ldyB0aGlzKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWVzJ1xuICB9XG59XG4iLCJpbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuaW1wb3J0IFF1ZXN0aW9uIGZyb20gJ1F1ZXN0aW9uL1F1ZXN0aW9uJ1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUSwgR3JhcGhpY1FWaWV3IH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgUmVjdGFuZ2xlQXJlYVEgZnJvbSAnLi9SZWN0YW5nbGVBcmVhUSdcbmltcG9ydCBUcmlhbmdsZUFyZWFRIGZyb20gJy4vVHJpYW5nbGVBcmVhUSdcbmltcG9ydCB7IFdyYXBwZXJPcHRpb25zLCBTaGFwZSwgUXVlc3Rpb25UeXBlU2ltcGxlLCBRdWVzdGlvbk9wdGlvbnMsIFF1ZXN0aW9uVHlwZSB9IGZyb20gJy4vdHlwZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFyZWFQZXJpbWV0ZXJRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBxdWVzdGlvbjogR3JhcGhpY1EgLy8gbWFrZSBtb3JlIHByZWNpc2Ugd2l0aCB1bmlvbiBvZiBhY3R1YWwgdHlwZXNcbiAgLy8gRE9NOiBIVE1MRWxlbWVudCAgLy8gaW4gYmFzZSBjbGFzc1xuICAvLyBhbnN3ZXJlZDogYm9vbGVhbiAvLyBpbiBiYXNlIGNsYXNzXG4gIGNvbnN0cnVjdG9yIChxdWVzdGlvbjogR3JhcGhpY1EpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5xdWVzdGlvbiA9IHF1ZXN0aW9uXG4gICAgdGhpcy5ET00gPSBxdWVzdGlvbi5ET01cbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFdyYXBwZXJPcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zLmN1c3RvbSkge1xuICAgICAgY29uc3Qgc2hhcGUgPSByYW5kRWxlbShvcHRpb25zLnNoYXBlcylcbiAgICAgIHJldHVybiB0aGlzLnJhbmRvbUZyb21EaWZmaWN1bHR5KG9wdGlvbnMuZGlmZmljdWx0eSwgc2hhcGUsIG9wdGlvbnMucXVlc3Rpb25UeXBlc1NpbXBsZSlcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyByYW5kb21Gcm9tRGlmZmljdWx0eSAoZGlmZmljdWx0eTogbnVtYmVyLCBzaGFwZTogU2hhcGUsIHF1ZXN0aW9uVHlwZXM6IFF1ZXN0aW9uVHlwZVNpbXBsZVtdKTogQXJlYVBlcmltZXRlclEge1xuICAgIC8qKiBEaWZmaWN1bHR5IGd1aWRlXG4gICAgICogIDEgLSBGb3J3YXJkLCBubyBkaXN0cmFjdG9ycywgc21hbGwgaW50ZWdlcnNcbiAgICAgKiAgMiAtIEZvcndhcmQsIGRpc3RyYWN0b3JzLCBzbWFsbCBpbnRlZ2Vyc1xuICAgICAqICAzIC0gRm9yd2FyZCwgZGlzdHJhY3RvcnMsIGxhcmdlciBpbnRlZ2Vyc1xuICAgICAqICA0IC0gRm9yd2FyZCwgZGlzdHJhY3RvcnMsIGRlY2ltYWxzIGFuZCBmcmFjdGlvbnNcbiAgICAgKiAgNSAtIEZvcndhcmQsIGRpc3RyYWN0b3JzLCBkZWNpbWFscyBhbmQgZnJhY3Rpb25zIC0gbGFyZ2VyXG4gICAgICogIDYgLSBSZXZlcnNlIHNtYWxsIGludGVnZXJzXG4gICAgICogIDcgLSBSZXZlcnNlIGxhcmdlIGludGVnZXJzXG4gICAgICogIDggLSBSZXZlcnNlIGRlY2ltYWxzIGFuZCBmcmFjdGlvbnNcbiAgICAgKiAgOSAtIFJldmVyc2UgZGVjaW1hbHMgYW5kIGZyYWN0aW9ucyAtIGxhcmdlclxuICAgICAqIDEwIC0gUHl0aGFnb3Jhc1xuICAgICovXG4gICAgY29uc3QgcXVlc3Rpb25PcHRpb25zOiBRdWVzdGlvbk9wdGlvbnMgPSB7XG4gICAgICBxdWVzdGlvblR5cGU6IHJhbmRFbGVtKHF1ZXN0aW9uVHlwZXMpLFxuICAgICAgZHA6IDAsXG4gICAgICBub0Rpc3RyYWN0b3JzOiB0cnVlLFxuICAgICAgbWF4TGVuZ3RoOiAyMFxuICAgIH1cbiAgICBjb25zdCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMgPSB7fVxuXG4gICAgc3dpdGNoIChkaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubm9EaXN0cmFjdG9ycyA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDM6XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5ub0Rpc3RyYWN0b3JzID0gZmFsc2VcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heExlbmd0aCA9IDEwMFxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA0OiAvLyBUT0RPOiBmcmFjdGlvblxuICAgICAgICBpZiAoTWF0aC5yYW5kb20oKTwwLjUgfHwgc2hhcGU9PT0ncmVjdGFuZ2xlJykgeyAgLy8gZGVjaW1hbFxuICAgICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5kcCA9IDFcbiAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TGVuZ3RoID0gOTlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZnJhY3Rpb24gPSB0cnVlXG4gICAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heExlbmd0aCA9IDQwXG4gICAgICAgIH1cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm5vRGlzdHJhY3RvcnMgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA1OlxuICAgICAgICBpZiAoTWF0aC5yYW5kb20oKTwwLjUgfHwgc2hhcGU9PT0ncmVjdGFuZ2xlJykgeyAgLy8gZGVjaW1hbFxuICAgICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5kcCA9IDFcbiAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TGVuZ3RoID0gNTAwXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcXVlc3Rpb25PcHRpb25zLmZyYWN0aW9uID0gdHJ1ZVxuICAgICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhMZW5ndGggPSA0MDBcbiAgICAgICAgfVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubm9EaXN0cmFjdG9ycyA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDY6XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5kcCA9IDBcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm5vRGlzdHJhY3RvcnMgPSBmYWxzZVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMucXVlc3Rpb25UeXBlID0gcmFuZEVsZW0ocXVlc3Rpb25UeXBlcy5tYXAodD0+cmV2ZXJzaWZ5KHQpKSlcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heExlbmd0aCA9IDIwXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDc6XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5kcCA9IDBcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm5vRGlzdHJhY3RvcnMgPSBmYWxzZVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMucXVlc3Rpb25UeXBlID0gcmFuZEVsZW0ocXVlc3Rpb25UeXBlcy5tYXAodD0+cmV2ZXJzaWZ5KHQpKSlcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heExlbmd0aCA9IDk5XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDg6XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5kcCA9IDFcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm5vRGlzdHJhY3RvcnMgPSBmYWxzZVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMucXVlc3Rpb25UeXBlID0gcmFuZEVsZW0ocXVlc3Rpb25UeXBlcy5tYXAodD0+cmV2ZXJzaWZ5KHQpKSlcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heExlbmd0aCA9IDk5XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDk6XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5kcCA9IDFcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm5vRGlzdHJhY3RvcnMgPSBmYWxzZVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMucXVlc3Rpb25UeXBlID0gcmFuZEVsZW0ocXVlc3Rpb25UeXBlcy5tYXAodD0+cmV2ZXJzaWZ5KHQpKSlcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heExlbmd0aCA9IDUwMFxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAxMDpcbiAgICAgIGRlZmF1bHQ6IC8vIFRPRE8gZml4IHRoaXNcbiAgICAgICAgc2hhcGUgPSAndHJpYW5nbGUnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5xdWVzdGlvblR5cGUgPSAncHl0aGFnb3Jhc0FyZWEnXG4gICAgICAgIGJyZWFrXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmFuZG9tV2l0aE9wdGlvbnMoc2hhcGUscXVlc3Rpb25PcHRpb25zLHZpZXdPcHRpb25zKVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbVdpdGhPcHRpb25zIChzaGFwZTogU2hhcGUsIG9wdGlvbnM6IFF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKTogQXJlYVBlcmltZXRlclEge1xuICAgIGxldCBxdWVzdGlvbjogR3JhcGhpY1FcbiAgICBzd2l0Y2goc2hhcGUpIHtcbiAgICAgIGNhc2UgJ3JlY3RhbmdsZSc6XG4gICAgICAgIHF1ZXN0aW9uID0gUmVjdGFuZ2xlQXJlYVEucmFuZG9tKG9wdGlvbnMsdmlld09wdGlvbnMpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICd0cmlhbmdsZSc6XG4gICAgICAgIHF1ZXN0aW9uID0gVHJpYW5nbGVBcmVhUS5yYW5kb20ob3B0aW9ucyx2aWV3T3B0aW9ucylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3BhcmFsbGVsb2dyYW0nOlxuICAgICAgY2FzZSAndHJhcGV6aXVtJzpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgeWV0IGltcGxlbWVudGVkJylcbiAgICB9XG4gICAgcmV0dXJuIG5ldyB0aGlzKHF1ZXN0aW9uKVxuICB9XG5cbiAgLyogV3JhcHMgdGhlIG1ldGhvZHMgb2YgdGhlIHdyYXBwZWQgcXVlc3Rpb24gKi9cbiAgcmVuZGVyICgpOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5yZW5kZXIoKSB9XG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5zaG93QW5zd2VyKCkgfVxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24uaGlkZUFuc3dlcigpIH1cbiAgdG9nZ2xlQW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24udG9nZ2xlQW5zd2VyKCkgfVxuXG4gIHN0YXRpYyBnZXQgb3B0aW9uc1NwZWMgKCkgOiBPcHRpb25zU3BlYyB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHtcbiAgICAgICAgaWQ6ICdzaGFwZXMnLFxuICAgICAgICB0eXBlOiAnc2VsZWN0LWluY2x1c2l2ZScsXG4gICAgICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgICAgICB7IGlkOiAncmVjdGFuZ2xlJywgdGl0bGU6ICdSZWN0YW5nbGUnIH0sXG4gICAgICAgICAgeyBpZDogJ3RyaWFuZ2xlJywgdGl0bGU6ICdUcmlhbmdsZScgfVxuICAgICAgICBdLFxuICAgICAgICBkZWZhdWx0OiBbJ3JlY3RhbmdsZSddLFxuICAgICAgICB0aXRsZTogJ1NoYXBlcydcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiAncXVlc3Rpb25UeXBlc1NpbXBsZScsXG4gICAgICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICAgICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgICAgIHsgaWQ6ICdhcmVhJywgdGl0bGU6ICdBcmVhJyB9LFxuICAgICAgICAgIHsgaWQ6ICdwZXJpbWV0ZXInLCB0aXRsZTogJ1BlcmltZXRlcicgfVxuICAgICAgICBdLFxuICAgICAgICBkZWZhdWx0OiBbJ2FyZWEnLCAncGVyaW1ldGVyJ10sXG4gICAgICAgIHRpdGxlOiAnVHlwZSBvZiBxdWVzdGlvbidcbiAgICAgIH1cbiAgICBdXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHtcbiAgICByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnXG4gIH1cbn1cblxuLyoqXG4gKiBQcmVwZW5kICdyZXZlcnNlJyB0byB0aGUgYmVnaW5uaW5nIG9mIGEgc3RyaW5nIHRoZW4gY2FtZWwgY2FzZSBpdFxuICogZS5nLiByZXZlcnNpZnkoJ2FyZWEnKSA9PT0gJ3JldmVyc2VBcmVhJ1xuICogQHBhcmFtIHN0ciBBIHN0cmluZ1xuICogQHBhcmFtIHByZWZpeCBUaGUgcHJlZml4IHRvIHVzZVxuICovXG5mdW5jdGlvbiByZXZlcnNpZnkoc3RyOiBRdWVzdGlvblR5cGVTaW1wbGUsIHByZWZpeDogJ3JldmVyc2UnIHwgJ3B5dGhhZ29yYXMnID0gJ3JldmVyc2UnKSA6IFF1ZXN0aW9uVHlwZSB7XG4gIHJldHVybiBwcmVmaXggKyBzdHJbMF0udG9VcHBlckNhc2UoKSArIHN0ci5zbGljZSgxKSBhcyBRdWVzdGlvblR5cGVcbn0iLCJpbXBvcnQgQWxnZWJyYWljRnJhY3Rpb25RIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0FsZ2VicmFpY0ZyYWN0aW9uUSdcbmltcG9ydCBJbnRlZ2VyQWRkUSBmcm9tICdRdWVzdGlvbi9UZXh0US9JbnRlZ2VyQWRkJ1xuaW1wb3J0IEFyaXRobWFnb25RIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0FyaXRobWFnb25RJ1xuaW1wb3J0IFRlc3RRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1Rlc3RRJ1xuaW1wb3J0IEFkZEFaZXJvIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0FkZEFaZXJvJ1xuaW1wb3J0IEVxdWF0aW9uT2ZMaW5lIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0VxdWF0aW9uT2ZMaW5lJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNRIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dyYXBwZXInXG5pbXBvcnQgQXJlYVBlcmltZXRlclEgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvQXJlYVBlcmltZXRlci9BcmVhV3JhcHBlcidcblxuaW1wb3J0IE9wdGlvbnNTZXQgZnJvbSAnT3B0aW9uc1NldCdcblxuY29uc3QgdG9waWNMaXN0ID0gW1xuICB7XG4gICAgaWQ6ICdhbGdlYnJhaWMtZnJhY3Rpb24nLFxuICAgIHRpdGxlOiAnU2ltcGxpZnkgYWxnZWJyYWljIGZyYWN0aW9ucycsXG4gICAgY2xhc3M6IEFsZ2VicmFpY0ZyYWN0aW9uUVxuICB9LFxuICB7XG4gICAgaWQ6ICdhZGQtYS16ZXJvJyxcbiAgICB0aXRsZTogJ011bHRpcGx5IGJ5IDEwIChob25lc3QhKScsXG4gICAgY2xhc3M6IEFkZEFaZXJvXG4gIH0sXG4gIHtcbiAgICBpZDogJ2ludGVnZXItYWRkJyxcbiAgICB0aXRsZTogJ0FkZCBpbnRlZ2VycyAodiBzaW1wbGUpJyxcbiAgICBjbGFzczogSW50ZWdlckFkZFFcbiAgfSxcbiAge1xuICAgIGlkOiAnbWlzc2luZy1hbmdsZXMnLFxuICAgIHRpdGxlOiAnTWlzc2luZyBhbmdsZXMnLFxuICAgIGNsYXNzOiBNaXNzaW5nQW5nbGVzUVxuICB9LFxuICB7XG4gICAgaWQ6ICdhcmVhLXBlcmltdGVyJyxcbiAgICB0aXRsZTogJ0FyZWEgYW5kIHBlcmltZXRlciBvZiBzaGFwZXMnLFxuICAgIGNsYXNzOiBBcmVhUGVyaW1ldGVyUVxuICB9LFxuICB7XG4gICAgaWQ6ICdlcXVhdGlvbi1vZi1saW5lJyxcbiAgICB0aXRsZTogJ0VxdWF0aW9uIG9mIGEgbGluZSAoZnJvbSB0d28gcG9pbnRzKScsXG4gICAgY2xhc3M6IEVxdWF0aW9uT2ZMaW5lXG4gIH0sXG4gIHtcbiAgICBpZDogJ2FyaXRobWFnb24tYWRkJyxcbiAgICB0aXRsZTogJ0FyaXRobWFnb25zJyxcbiAgICBjbGFzczogQXJpdGhtYWdvblFcbiAgfSxcbiAge1xuICAgIGlkOiAndGVzdCcsXG4gICAgdGl0bGU6ICdUZXN0IHF1ZXN0aW9ucycsXG4gICAgY2xhc3M6IFRlc3RRXG4gIH1cbl1cblxuZnVuY3Rpb24gZ2V0Q2xhc3MgKGlkKSB7XG4gIC8vIFJldHVybiB0aGUgY2xhc3MgZ2l2ZW4gYW4gaWQgb2YgYSBxdWVzdGlvblxuXG4gIC8vIE9idmlvdXNseSB0aGlzIGlzIGFuIGluZWZmaWNpZW50IHNlYXJjaCwgYnV0IHdlIGRvbid0IG5lZWQgbWFzc2l2ZSBwZXJmb3JtYW5jZVxuICBmb3IgKGxldCBpID0gMDsgaSA8IHRvcGljTGlzdC5sZW5ndGg7IGkrKykge1xuICAgIGlmICh0b3BpY0xpc3RbaV0uaWQgPT09IGlkKSB7XG4gICAgICByZXR1cm4gdG9waWNMaXN0W2ldLmNsYXNzXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGxcbn1cblxuZnVuY3Rpb24gZ2V0VGl0bGUgKGlkKSB7XG4gIC8vIFJldHVybiB0aXRsZSBvZiBhIGdpdmVuIGlkXG4gIC8vXG4gIHJldHVybiB0b3BpY0xpc3QuZmluZCh0ID0+ICh0LmlkID09PSBpZCkpLnRpdGxlXG59XG5cbi8qKlxuICogR2V0cyBjb21tYW5kIHdvcmQgZnJvbSBhIHRvcGljIGlkXG4gKiBAcGFyYW0ge3N0cmluZ30gaWQgVGhlIHRvcGljIGlkXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBDb21tYW5kIHdvcmQuIFJldHVybnMgXCJcIiBpZiBubyB0b3BpYyB3aXRoIGlkXG4gKi9cbmZ1bmN0aW9uIGdldENvbW1hbmRXb3JkIChpZCkge1xuICBjb25zdCB0b3BpY0NsYXNzID0gZ2V0Q2xhc3MoaWQpXG4gIGlmICh0b3BpY0NsYXNzID09PSBudWxsKSB7XG4gICAgcmV0dXJuICcnXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGdldENsYXNzKGlkKS5jb21tYW5kV29yZFxuICB9XG59XG5cbmZ1bmN0aW9uIGdldFRvcGljcyAoKSB7XG4gIC8vIHJldHVybnMgdG9waWNzIHdpdGggY2xhc3NlcyBzdHJpcHBlZCBvdXRcbiAgcmV0dXJuIHRvcGljTGlzdC5tYXAoeCA9PiAoeyBpZDogeC5pZCwgdGl0bGU6IHgudGl0bGUgfSkpXG59XG5cbmZ1bmN0aW9uIG5ld1F1ZXN0aW9uIChpZCwgb3B0aW9ucykge1xuICAvLyB0byBhdm9pZCB3cml0aW5nIGBsZXQgcSA9IG5ldyAoVG9waWNDaG9vc2VyLmdldENsYXNzKGlkKSkob3B0aW9ucylcbiAgY29uc3QgUXVlc3Rpb25DbGFzcyA9IGdldENsYXNzKGlkKVxuICBsZXQgcXVlc3Rpb25cbiAgaWYgKFF1ZXN0aW9uQ2xhc3MucmFuZG9tKSB7XG4gICAgcXVlc3Rpb24gPSBRdWVzdGlvbkNsYXNzLnJhbmRvbShvcHRpb25zKVxuICB9IGVsc2Uge1xuICAgIHF1ZXN0aW9uID0gbmV3IFF1ZXN0aW9uQ2xhc3Mob3B0aW9ucylcbiAgfVxuICByZXR1cm4gcXVlc3Rpb25cbn1cblxuZnVuY3Rpb24gbmV3T3B0aW9uc1NldCAoaWQpIHtcbiAgY29uc3Qgb3B0aW9uc1NwZWMgPSAoZ2V0Q2xhc3MoaWQpKS5vcHRpb25zU3BlYyB8fCBbXVxuICByZXR1cm4gbmV3IE9wdGlvbnNTZXQob3B0aW9uc1NwZWMpXG59XG5cbmZ1bmN0aW9uIGhhc09wdGlvbnMgKGlkKSB7XG4gIHJldHVybiAhIShnZXRDbGFzcyhpZCkub3B0aW9uc1NwZWMgJiYgZ2V0Q2xhc3MoaWQpLm9wdGlvbnNTcGVjLmxlbmd0aCA+IDApIC8vIHdlaXJkIGJvb2wgdHlwY2FzdGluZyB3b28hXG59XG5cbmV4cG9ydCB7IHRvcGljTGlzdCwgZ2V0Q2xhc3MsIG5ld1F1ZXN0aW9uLCBnZXRUb3BpY3MsIGdldFRpdGxlLCBuZXdPcHRpb25zU2V0LCBnZXRDb21tYW5kV29yZCwgaGFzT3B0aW9ucyB9XG4iLCIhZnVuY3Rpb24odCxvKXtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKG8pOlwib2JqZWN0XCI9PXR5cGVvZiBleHBvcnRzP21vZHVsZS5leHBvcnRzPW8oKTp0LnRpbmdsZT1vKCl9KHRoaXMsZnVuY3Rpb24oKXt2YXIgbz0hMTtmdW5jdGlvbiB0KHQpe3RoaXMub3B0cz1mdW5jdGlvbigpe2Zvcih2YXIgdD0xO3Q8YXJndW1lbnRzLmxlbmd0aDt0KyspZm9yKHZhciBvIGluIGFyZ3VtZW50c1t0XSlhcmd1bWVudHNbdF0uaGFzT3duUHJvcGVydHkobykmJihhcmd1bWVudHNbMF1bb109YXJndW1lbnRzW3RdW29dKTtyZXR1cm4gYXJndW1lbnRzWzBdfSh7fSx7b25DbG9zZTpudWxsLG9uT3BlbjpudWxsLGJlZm9yZU9wZW46bnVsbCxiZWZvcmVDbG9zZTpudWxsLHN0aWNreUZvb3RlcjohMSxmb290ZXI6ITEsY3NzQ2xhc3M6W10sY2xvc2VMYWJlbDpcIkNsb3NlXCIsY2xvc2VNZXRob2RzOltcIm92ZXJsYXlcIixcImJ1dHRvblwiLFwiZXNjYXBlXCJdfSx0KSx0aGlzLmluaXQoKX1mdW5jdGlvbiBlKCl7dGhpcy5tb2RhbEJveEZvb3RlciYmKHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUud2lkdGg9dGhpcy5tb2RhbEJveC5jbGllbnRXaWR0aCtcInB4XCIsdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS5sZWZ0PXRoaXMubW9kYWxCb3gub2Zmc2V0TGVmdCtcInB4XCIpfXJldHVybiB0LnByb3RvdHlwZS5pbml0PWZ1bmN0aW9uKCl7aWYoIXRoaXMubW9kYWwpcmV0dXJuIGZ1bmN0aW9uKCl7dGhpcy5tb2RhbD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpLHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbFwiKSwwIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5sZW5ndGgmJi0xIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKFwib3ZlcmxheVwiKXx8dGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsLS1ub092ZXJsYXlDbG9zZVwiKTt0aGlzLm1vZGFsLnN0eWxlLmRpc3BsYXk9XCJub25lXCIsdGhpcy5vcHRzLmNzc0NsYXNzLmZvckVhY2goZnVuY3Rpb24odCl7XCJzdHJpbmdcIj09dHlwZW9mIHQmJnRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZCh0KX0sdGhpcyksLTEhPT10aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoXCJidXR0b25cIikmJih0aGlzLm1vZGFsQ2xvc2VCdG49ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKSx0aGlzLm1vZGFsQ2xvc2VCdG4udHlwZT1cImJ1dHRvblwiLHRoaXMubW9kYWxDbG9zZUJ0bi5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsX19jbG9zZVwiKSx0aGlzLm1vZGFsQ2xvc2VCdG5JY29uPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpLHRoaXMubW9kYWxDbG9zZUJ0bkljb24uY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbF9fY2xvc2VJY29uXCIpLHRoaXMubW9kYWxDbG9zZUJ0bkljb24uaW5uZXJIVE1MPSc8c3ZnIHZpZXdCb3g9XCIwIDAgMTAgMTBcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+PHBhdGggZD1cIk0uMyA5LjdjLjIuMi40LjMuNy4zLjMgMCAuNS0uMS43LS4zTDUgNi40bDMuMyAzLjNjLjIuMi41LjMuNy4zLjIgMCAuNS0uMS43LS4zLjQtLjQuNC0xIDAtMS40TDYuNCA1bDMuMy0zLjNjLjQtLjQuNC0xIDAtMS40LS40LS40LTEtLjQtMS40IDBMNSAzLjYgMS43LjNDMS4zLS4xLjctLjEuMy4zYy0uNC40LS40IDEgMCAxLjRMMy42IDUgLjMgOC4zYy0uNC40LS40IDEgMCAxLjR6XCIgZmlsbD1cIiMwMDBcIiBmaWxsLXJ1bGU9XCJub256ZXJvXCIvPjwvc3ZnPicsdGhpcy5tb2RhbENsb3NlQnRuTGFiZWw9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIiksdGhpcy5tb2RhbENsb3NlQnRuTGFiZWwuY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbF9fY2xvc2VMYWJlbFwiKSx0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbC5pbm5lckhUTUw9dGhpcy5vcHRzLmNsb3NlTGFiZWwsdGhpcy5tb2RhbENsb3NlQnRuLmFwcGVuZENoaWxkKHRoaXMubW9kYWxDbG9zZUJ0bkljb24pLHRoaXMubW9kYWxDbG9zZUJ0bi5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbCkpO3RoaXMubW9kYWxCb3g9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKSx0aGlzLm1vZGFsQm94LmNsYXNzTGlzdC5hZGQoXCJ0aW5nbGUtbW9kYWwtYm94XCIpLHRoaXMubW9kYWxCb3hDb250ZW50PWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiksdGhpcy5tb2RhbEJveENvbnRlbnQuY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbC1ib3hfX2NvbnRlbnRcIiksdGhpcy5tb2RhbEJveC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Q29udGVudCksLTEhPT10aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoXCJidXR0b25cIikmJnRoaXMubW9kYWwuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbENsb3NlQnRuKTt0aGlzLm1vZGFsLmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3gpfS5jYWxsKHRoaXMpLGZ1bmN0aW9uKCl7dGhpcy5fZXZlbnRzPXtjbGlja0Nsb3NlQnRuOnRoaXMuY2xvc2UuYmluZCh0aGlzKSxjbGlja092ZXJsYXk6ZnVuY3Rpb24odCl7dmFyIG89dGhpcy5tb2RhbC5vZmZzZXRXaWR0aC10aGlzLm1vZGFsLmNsaWVudFdpZHRoLGU9dC5jbGllbnRYPj10aGlzLm1vZGFsLm9mZnNldFdpZHRoLTE1LHM9dGhpcy5tb2RhbC5zY3JvbGxIZWlnaHQhPT10aGlzLm1vZGFsLm9mZnNldEhlaWdodDtpZihcIk1hY0ludGVsXCI9PT1uYXZpZ2F0b3IucGxhdGZvcm0mJjA9PW8mJmUmJnMpcmV0dXJuOy0xIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKFwib3ZlcmxheVwiKSYmIWZ1bmN0aW9uKHQsbyl7Zm9yKDsodD10LnBhcmVudEVsZW1lbnQpJiYhdC5jbGFzc0xpc3QuY29udGFpbnMobyk7KTtyZXR1cm4gdH0odC50YXJnZXQsXCJ0aW5nbGUtbW9kYWxcIikmJnQuY2xpZW50WDx0aGlzLm1vZGFsLmNsaWVudFdpZHRoJiZ0aGlzLmNsb3NlKCl9LmJpbmQodGhpcykscmVzaXplOnRoaXMuY2hlY2tPdmVyZmxvdy5iaW5kKHRoaXMpLGtleWJvYXJkTmF2OmZ1bmN0aW9uKHQpey0xIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKFwiZXNjYXBlXCIpJiYyNz09PXQud2hpY2gmJnRoaXMuaXNPcGVuKCkmJnRoaXMuY2xvc2UoKX0uYmluZCh0aGlzKX0sLTEhPT10aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoXCJidXR0b25cIikmJnRoaXMubW9kYWxDbG9zZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIix0aGlzLl9ldmVudHMuY2xpY2tDbG9zZUJ0bik7dGhpcy5tb2RhbC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsdGhpcy5fZXZlbnRzLmNsaWNrT3ZlcmxheSksd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIix0aGlzLl9ldmVudHMucmVzaXplKSxkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLHRoaXMuX2V2ZW50cy5rZXlib2FyZE5hdil9LmNhbGwodGhpcyksZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsLGRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZCksdGhpcy5vcHRzLmZvb3RlciYmdGhpcy5hZGRGb290ZXIoKSx0aGlzfSx0LnByb3RvdHlwZS5fYnVzeT1mdW5jdGlvbih0KXtvPXR9LHQucHJvdG90eXBlLl9pc0J1c3k9ZnVuY3Rpb24oKXtyZXR1cm4gb30sdC5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe251bGwhPT10aGlzLm1vZGFsJiYodGhpcy5pc09wZW4oKSYmdGhpcy5jbG9zZSghMCksZnVuY3Rpb24oKXstMSE9PXRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZihcImJ1dHRvblwiKSYmdGhpcy5tb2RhbENsb3NlQnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLHRoaXMuX2V2ZW50cy5jbGlja0Nsb3NlQnRuKTt0aGlzLm1vZGFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIix0aGlzLl9ldmVudHMuY2xpY2tPdmVybGF5KSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLHRoaXMuX2V2ZW50cy5yZXNpemUpLGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsdGhpcy5fZXZlbnRzLmtleWJvYXJkTmF2KX0uY2FsbCh0aGlzKSx0aGlzLm1vZGFsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbCksdGhpcy5tb2RhbD1udWxsKX0sdC5wcm90b3R5cGUuaXNPcGVuPWZ1bmN0aW9uKCl7cmV0dXJuISF0aGlzLm1vZGFsLmNsYXNzTGlzdC5jb250YWlucyhcInRpbmdsZS1tb2RhbC0tdmlzaWJsZVwiKX0sdC5wcm90b3R5cGUub3Blbj1mdW5jdGlvbigpe2lmKCF0aGlzLl9pc0J1c3koKSl7dGhpcy5fYnVzeSghMCk7dmFyIHQ9dGhpcztyZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiB0Lm9wdHMuYmVmb3JlT3BlbiYmdC5vcHRzLmJlZm9yZU9wZW4oKSx0aGlzLm1vZGFsLnN0eWxlLnJlbW92ZVByb3BlcnR5P3RoaXMubW9kYWwuc3R5bGUucmVtb3ZlUHJvcGVydHkoXCJkaXNwbGF5XCIpOnRoaXMubW9kYWwuc3R5bGUucmVtb3ZlQXR0cmlidXRlKFwiZGlzcGxheVwiKSx0aGlzLl9zY3JvbGxQb3NpdGlvbj13aW5kb3cucGFnZVlPZmZzZXQsZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLWVuYWJsZWRcIiksZG9jdW1lbnQuYm9keS5zdHlsZS50b3A9LXRoaXMuX3Njcm9sbFBvc2l0aW9uK1wicHhcIix0aGlzLnNldFN0aWNreUZvb3Rlcih0aGlzLm9wdHMuc3RpY2t5Rm9vdGVyKSx0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoXCJ0aW5nbGUtbW9kYWwtLXZpc2libGVcIiksXCJmdW5jdGlvblwiPT10eXBlb2YgdC5vcHRzLm9uT3BlbiYmdC5vcHRzLm9uT3Blbi5jYWxsKHQpLHQuX2J1c3koITEpLHRoaXMuY2hlY2tPdmVyZmxvdygpLHRoaXN9fSx0LnByb3RvdHlwZS5jbG9zZT1mdW5jdGlvbih0KXtpZighdGhpcy5faXNCdXN5KCkpe2lmKHRoaXMuX2J1c3koITApLCExLFwiZnVuY3Rpb25cIj09dHlwZW9mIHRoaXMub3B0cy5iZWZvcmVDbG9zZSlpZighdGhpcy5vcHRzLmJlZm9yZUNsb3NlLmNhbGwodGhpcykpcmV0dXJuIHZvaWQgdGhpcy5fYnVzeSghMSk7ZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwidGluZ2xlLWVuYWJsZWRcIiksZG9jdW1lbnQuYm9keS5zdHlsZS50b3A9bnVsbCx3aW5kb3cuc2Nyb2xsVG8oe3RvcDp0aGlzLl9zY3JvbGxQb3NpdGlvbixiZWhhdmlvcjpcImluc3RhbnRcIn0pLHRoaXMubW9kYWwuY2xhc3NMaXN0LnJlbW92ZShcInRpbmdsZS1tb2RhbC0tdmlzaWJsZVwiKTt2YXIgbz10aGlzO28ubW9kYWwuc3R5bGUuZGlzcGxheT1cIm5vbmVcIixcImZ1bmN0aW9uXCI9PXR5cGVvZiBvLm9wdHMub25DbG9zZSYmby5vcHRzLm9uQ2xvc2UuY2FsbCh0aGlzKSxvLl9idXN5KCExKX19LHQucHJvdG90eXBlLnNldENvbnRlbnQ9ZnVuY3Rpb24odCl7cmV0dXJuXCJzdHJpbmdcIj09dHlwZW9mIHQ/dGhpcy5tb2RhbEJveENvbnRlbnQuaW5uZXJIVE1MPXQ6KHRoaXMubW9kYWxCb3hDb250ZW50LmlubmVySFRNTD1cIlwiLHRoaXMubW9kYWxCb3hDb250ZW50LmFwcGVuZENoaWxkKHQpKSx0aGlzLmlzT3BlbigpJiZ0aGlzLmNoZWNrT3ZlcmZsb3coKSx0aGlzfSx0LnByb3RvdHlwZS5nZXRDb250ZW50PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMubW9kYWxCb3hDb250ZW50fSx0LnByb3RvdHlwZS5hZGRGb290ZXI9ZnVuY3Rpb24oKXtyZXR1cm4gZnVuY3Rpb24oKXt0aGlzLm1vZGFsQm94Rm9vdGVyPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiksdGhpcy5tb2RhbEJveEZvb3Rlci5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsLWJveF9fZm9vdGVyXCIpLHRoaXMubW9kYWxCb3guYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveEZvb3Rlcil9LmNhbGwodGhpcyksdGhpc30sdC5wcm90b3R5cGUuc2V0Rm9vdGVyQ29udGVudD1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5tb2RhbEJveEZvb3Rlci5pbm5lckhUTUw9dCx0aGlzfSx0LnByb3RvdHlwZS5nZXRGb290ZXJDb250ZW50PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMubW9kYWxCb3hGb290ZXJ9LHQucHJvdG90eXBlLnNldFN0aWNreUZvb3Rlcj1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5pc092ZXJmbG93KCl8fCh0PSExKSx0P3RoaXMubW9kYWxCb3guY29udGFpbnModGhpcy5tb2RhbEJveEZvb3RlcikmJih0aGlzLm1vZGFsQm94LnJlbW92ZUNoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpLHRoaXMubW9kYWwuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlciksdGhpcy5tb2RhbEJveEZvb3Rlci5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsLWJveF9fZm9vdGVyLS1zdGlja3lcIiksZS5jYWxsKHRoaXMpLHRoaXMubW9kYWxCb3hDb250ZW50LnN0eWxlW1wicGFkZGluZy1ib3R0b21cIl09dGhpcy5tb2RhbEJveEZvb3Rlci5jbGllbnRIZWlnaHQrMjArXCJweFwiKTp0aGlzLm1vZGFsQm94Rm9vdGVyJiYodGhpcy5tb2RhbEJveC5jb250YWlucyh0aGlzLm1vZGFsQm94Rm9vdGVyKXx8KHRoaXMubW9kYWwucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlciksdGhpcy5tb2RhbEJveC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKSx0aGlzLm1vZGFsQm94Rm9vdGVyLnN0eWxlLndpZHRoPVwiYXV0b1wiLHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUubGVmdD1cIlwiLHRoaXMubW9kYWxCb3hDb250ZW50LnN0eWxlW1wicGFkZGluZy1ib3R0b21cIl09XCJcIix0aGlzLm1vZGFsQm94Rm9vdGVyLmNsYXNzTGlzdC5yZW1vdmUoXCJ0aW5nbGUtbW9kYWwtYm94X19mb290ZXItLXN0aWNreVwiKSkpLHRoaXN9LHQucHJvdG90eXBlLmFkZEZvb3RlckJ0bj1mdW5jdGlvbih0LG8sZSl7dmFyIHM9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtyZXR1cm4gcy5pbm5lckhUTUw9dCxzLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLGUpLFwic3RyaW5nXCI9PXR5cGVvZiBvJiZvLmxlbmd0aCYmby5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbih0KXtzLmNsYXNzTGlzdC5hZGQodCl9KSx0aGlzLm1vZGFsQm94Rm9vdGVyLmFwcGVuZENoaWxkKHMpLHN9LHQucHJvdG90eXBlLnJlc2l6ZT1mdW5jdGlvbigpe2NvbnNvbGUud2FybihcIlJlc2l6ZSBpcyBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gdmVyc2lvbiAxLjBcIil9LHQucHJvdG90eXBlLmlzT3ZlcmZsb3c9ZnVuY3Rpb24oKXtyZXR1cm4gd2luZG93LmlubmVySGVpZ2h0PD10aGlzLm1vZGFsQm94LmNsaWVudEhlaWdodH0sdC5wcm90b3R5cGUuY2hlY2tPdmVyZmxvdz1mdW5jdGlvbigpe3RoaXMubW9kYWwuY2xhc3NMaXN0LmNvbnRhaW5zKFwidGluZ2xlLW1vZGFsLS12aXNpYmxlXCIpJiYodGhpcy5pc092ZXJmbG93KCk/dGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsLS1vdmVyZmxvd1wiKTp0aGlzLm1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoXCJ0aW5nbGUtbW9kYWwtLW92ZXJmbG93XCIpLCF0aGlzLmlzT3ZlcmZsb3coKSYmdGhpcy5vcHRzLnN0aWNreUZvb3Rlcj90aGlzLnNldFN0aWNreUZvb3RlcighMSk6dGhpcy5pc092ZXJmbG93KCkmJnRoaXMub3B0cy5zdGlja3lGb290ZXImJihlLmNhbGwodGhpcyksdGhpcy5zZXRTdGlja3lGb290ZXIoITApKSl9LHttb2RhbDp0fX0pOyIsImltcG9ydCBSU2xpZGVyIGZyb20gJ3ZlbmRvci9yc2xpZGVyJ1xuaW1wb3J0IE9wdGlvbnNTZXQgZnJvbSAnT3B0aW9uc1NldCdcbmltcG9ydCAqIGFzIFRvcGljQ2hvb3NlciBmcm9tICdUb3BpY0Nob29zZXInXG5pbXBvcnQgeyBtb2RhbCBhcyBUTW9kYWwgfSBmcm9tICd0aW5nbGUuanMnXG5pbXBvcnQgeyByYW5kRWxlbSwgY3JlYXRlRWxlbSwgaGFzQW5jZXN0b3JDbGFzcywgYm9vbE9iamVjdFRvQXJyYXkgfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5pbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIGludGVyZmFjZSBXaW5kb3cge1xuICAgIFNIT1dfRElGRklDVUxUWTogYm9vbGVhblxuICB9XG59XG53aW5kb3cuU0hPV19ESUZGSUNVTFRZID0gZmFsc2UgLy8gZm9yIGRlYnVnZ2luZyBxdWVzdGlvbnNcblxuLyogVHlwZXMgKi9cbmludGVyZmFjZSBRdWVzdGlvbkluZm8ge1xuICBjb250YWluZXI6IEhUTUxFbGVtZW50LFxuICBxdWVzdGlvbj86IFF1ZXN0aW9uLFxuICB0b3BpY0lkPzogc3RyaW5nLFxufVxuXG4vLyBNYWtlIGFuIG92ZXJsYXkgdG8gY2FwdHVyZSBhbnkgY2xpY2tzIG91dHNpZGUgYm94ZXMsIGlmIG5lY2Vzc2FyeVxuY3JlYXRlRWxlbSgnZGl2JywgJ292ZXJsYXkgaGlkZGVuJywgZG9jdW1lbnQuYm9keSkuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBoaWRlQWxsQWN0aW9ucylcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUXVlc3Rpb25TZXQge1xuICAvLyBUaGUgbWFpbiBxdWVzdGlvblxuICBxTnVtYmVyOiBudW1iZXJcbiAgYW5zd2VyZWQ6IGJvb2xlYW5cbiAgY29tbWFuZFdvcmQ6IHN0cmluZ1xuICB1c2VDb21tYW5kV29yZDogYm9vbGVhblxuXG4gIC8vIHF1ZXN0aW9ucyBhbmQgdGhlaXIgb3B0aW9uc1xuICBuOiBudW1iZXIgLy8gTnVtYmVyIG9mIHF1ZXN0aW9uc1xuICBxdWVzdGlvbnM6IFF1ZXN0aW9uSW5mb1tdIC8vIGxpc3Qgb2YgcXVlc3Rpb25zIGFuZCB0aGUgRE9NIGVsZW1lbnQgdGhleSdyZSByZW5kZXJlZCBpblxuICB0b3BpY3NPcHRpb25zITogT3B0aW9uc1NldCAvLyBPcHRpb25zU2V0IG9iamVjdCBmb3IgY2hvb3NpbmcgdG9waWNzXG4gIHRvcGljc01vZGFsITogVE1vZGFsIC8vIEEgbW9kYWwgZGlhbG9nIGZvciBkaXNwbGF5aW5nIHRvcGljc09wdGlvbnNcbiAgdG9waWNzOiBzdHJpbmdbXSAvLyBMaXN0IG9mIHNlbGVjdGVkIHRvcGljIElkc1xuICBvcHRpb25zU2V0czogUmVjb3JkPHN0cmluZywgT3B0aW9uc1NldD4gLy8gbWFwIGZyb20gdG9waWMgaWRzIHRvIHRoZWlyIG9wdGlvbnMgc2V0XG5cbiAgLy8gVUkgZWxlbWVudHNcbiAgdG9waWNDaG9vc2VyQnV0dG9uITogSFRNTEVsZW1lbnQgLy8gVGhlIGJ1dHRvbiB0byBvcGVuIHRoZSB0b3BpYyBjaG9vc2VyXG4gIGRpZmZpY3VsdHlTbGlkZXJFbGVtZW50ITogSFRNTElucHV0RWxlbWVudFxuICBkaWZmaWN1bHR5U2xpZGVyITogUlNsaWRlclxuICBnZW5lcmF0ZUJ1dHRvbiE6IEhUTUxCdXR0b25FbGVtZW50XG4gIGFuc3dlckJ1dHRvbiE6IEhUTUxFbGVtZW50XG5cbiAgLy8gRE9NIGVsZW1lbnRzIC0gaW5pdGlhbGlzZWQgaW4gX2J1aWxkKCksIGNhbGxlZCBmcm9tIGNvbnN0cnVjdG9yXG4gIGhlYWRlckJveCE6IEhUTUxFbGVtZW50XG4gIG91dGVyQm94ITogSFRNTEVsZW1lbnRcbiAgZGlzcGxheUJveCE6IEhUTUxFbGVtZW50XG5cbiAgY29uc3RydWN0b3IgKHFOdW1iZXI6IG51bWJlcikge1xuICAgIHRoaXMucXVlc3Rpb25zID0gW10gLy8gbGlzdCBvZiBxdWVzdGlvbnMgYW5kIHRoZSBET00gZWxlbWVudCB0aGV5J3JlIHJlbmRlcmVkIGluXG4gICAgdGhpcy50b3BpY3MgPSBbXSAvLyBsaXN0IG9mIHRvcGljcyB3aGljaCBoYXZlIGJlZW4gc2VsZWN0ZWQgZm9yIHRoaXMgc2V0XG4gICAgdGhpcy5vcHRpb25zU2V0cyA9IHt9IC8vIGxpc3Qgb2YgT3B0aW9uc1NldCBvYmplY3RzIGNhcnJ5aW5nIG9wdGlvbnMgZm9yIHRvcGljcyB3aXRoIG9wdGlvbnNcbiAgICB0aGlzLnFOdW1iZXIgPSBxTnVtYmVyIHx8IDEgLy8gUXVlc3Rpb24gbnVtYmVyIChwYXNzZWQgaW4gYnkgY2FsbGVyLCB3aGljaCB3aWxsIGtlZXAgY291bnQpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlIC8vIFdoZXRoZXIgYW5zd2VyZWQgb3Igbm90XG4gICAgdGhpcy5jb21tYW5kV29yZCA9ICcnIC8vIFNvbWV0aGluZyBsaWtlICdzaW1wbGlmeSdcbiAgICB0aGlzLnVzZUNvbW1hbmRXb3JkID0gdHJ1ZSAvLyBVc2UgdGhlIGNvbW1hbmQgd29yZCBpbiB0aGUgbWFpbiBxdWVzdGlvbiwgZmFsc2UgZ2l2ZSBjb21tYW5kIHdvcmQgd2l0aCBlYWNoIHN1YnF1ZXN0aW9uXG4gICAgdGhpcy5uID0gOCAvLyBOdW1iZXIgb2YgcXVlc3Rpb25zXG5cbiAgICB0aGlzLl9idWlsZCgpXG4gIH1cblxuICBfYnVpbGQgKCkge1xuICAgIHRoaXMub3V0ZXJCb3ggPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tb3V0ZXJib3gnKVxuICAgIHRoaXMuaGVhZGVyQm94ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWhlYWRlcmJveCcsIHRoaXMub3V0ZXJCb3gpXG4gICAgdGhpcy5kaXNwbGF5Qm94ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWRpc3BsYXlib3gnLCB0aGlzLm91dGVyQm94KVxuXG4gICAgdGhpcy5fYnVpbGRPcHRpb25zQm94KClcblxuICAgIHRoaXMuX2J1aWxkVG9waWNDaG9vc2VyKClcbiAgfVxuXG4gIF9idWlsZE9wdGlvbnNCb3ggKCkge1xuICAgIGNvbnN0IHRvcGljU3BhbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCB1bmRlZmluZWQsIHRoaXMuaGVhZGVyQm94KVxuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uID0gY3JlYXRlRWxlbSgnc3BhbicsICd0b3BpYy1jaG9vc2VyIGJ1dHRvbicsIHRvcGljU3BhbilcbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbi5pbm5lckhUTUwgPSAnQ2hvb3NlIHRvcGljJ1xuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5jaG9vc2VUb3BpY3MoKSlcblxuICAgIGNvbnN0IGRpZmZpY3VsdHlTcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIHVuZGVmaW5lZCwgdGhpcy5oZWFkZXJCb3gpXG4gICAgZGlmZmljdWx0eVNwYW4uYXBwZW5kKCdEaWZmaWN1bHR5OiAnKVxuICAgIGNvbnN0IGRpZmZpY3VsdHlTbGlkZXJPdXRlciA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCAnc2xpZGVyLW91dGVyJywgZGlmZmljdWx0eVNwYW4pXG4gICAgdGhpcy5kaWZmaWN1bHR5U2xpZGVyRWxlbWVudCA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgdW5kZWZpbmVkLCBkaWZmaWN1bHR5U2xpZGVyT3V0ZXIpIGFzIEhUTUxJbnB1dEVsZW1lbnRcblxuICAgIGNvbnN0IG5TcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIHVuZGVmaW5lZCwgdGhpcy5oZWFkZXJCb3gpXG4gICAgblNwYW4uYXBwZW5kKCdOdW1iZXIgb2YgcXVlc3Rpb25zOiAnKVxuICAgIGNvbnN0IG5RdWVzdGlvbnNJbnB1dCA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgJ24tcXVlc3Rpb25zJywgblNwYW4pIGFzIEhUTUxJbnB1dEVsZW1lbnRcbiAgICBuUXVlc3Rpb25zSW5wdXQudHlwZSA9ICdudW1iZXInXG4gICAgblF1ZXN0aW9uc0lucHV0Lm1pbiA9ICcxJ1xuICAgIG5RdWVzdGlvbnNJbnB1dC52YWx1ZSA9ICc4J1xuICAgIG5RdWVzdGlvbnNJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICB0aGlzLm4gPSBwYXJzZUludChuUXVlc3Rpb25zSW5wdXQudmFsdWUpXG4gICAgfSlcblxuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24gPSBjcmVhdGVFbGVtKCdidXR0b24nLCAnZ2VuZXJhdGUtYnV0dG9uIGJ1dHRvbicsIHRoaXMuaGVhZGVyQm94KSBhcyBIVE1MQnV0dG9uRWxlbWVudFxuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uZGlzYWJsZWQgPSB0cnVlXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5pbm5lckhUTUwgPSAnR2VuZXJhdGUhJ1xuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLmdlbmVyYXRlQWxsKCkpXG4gIH1cblxuICBfaW5pdFNsaWRlciAoKSB7XG4gICAgdGhpcy5kaWZmaWN1bHR5U2xpZGVyID0gbmV3IFJTbGlkZXIoe1xuICAgICAgdGFyZ2V0OiB0aGlzLmRpZmZpY3VsdHlTbGlkZXJFbGVtZW50LFxuICAgICAgdmFsdWVzOiB7IG1pbjogMSwgbWF4OiAxMCB9LFxuICAgICAgcmFuZ2U6IHRydWUsXG4gICAgICBzZXQ6IFsyLCA2XSxcbiAgICAgIHN0ZXA6IDEsXG4gICAgICB0b29sdGlwOiBmYWxzZSxcbiAgICAgIHNjYWxlOiB0cnVlLFxuICAgICAgbGFiZWxzOiB0cnVlXG4gICAgfSlcbiAgfVxuXG4gIF9idWlsZFRvcGljQ2hvb3NlciAoKSB7XG4gICAgLy8gYnVpbGQgYW4gT3B0aW9uc1NldCBvYmplY3QgZm9yIHRoZSB0b3BpY3NcbiAgICBjb25zdCB0b3BpY3MgPSBUb3BpY0Nob29zZXIuZ2V0VG9waWNzKClcbiAgICBjb25zdCBvcHRpb25zU3BlYzogT3B0aW9uc1NwZWMgPSBbXVxuICAgIHRvcGljcy5mb3JFYWNoKHRvcGljID0+IHtcbiAgICAgIG9wdGlvbnNTcGVjLnB1c2goe1xuICAgICAgICB0aXRsZTogdG9waWMudGl0bGUsXG4gICAgICAgIGlkOiB0b3BpYy5pZCxcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgc3dhcExhYmVsOiB0cnVlXG4gICAgICB9KVxuICAgIH0pXG4gICAgdGhpcy50b3BpY3NPcHRpb25zID0gbmV3IE9wdGlvbnNTZXQob3B0aW9uc1NwZWMpXG5cbiAgICAvLyBCdWlsZCBhIG1vZGFsIGRpYWxvZyB0byBwdXQgdGhlbSBpblxuICAgIHRoaXMudG9waWNzTW9kYWwgPSBuZXcgVE1vZGFsKHtcbiAgICAgIGZvb3RlcjogdHJ1ZSxcbiAgICAgIHN0aWNreUZvb3RlcjogZmFsc2UsXG4gICAgICBjbG9zZU1ldGhvZHM6IFsnb3ZlcmxheScsICdlc2NhcGUnXSxcbiAgICAgIGNsb3NlTGFiZWw6ICdDbG9zZScsXG4gICAgICBvbkNsb3NlOiAoKSA9PiB7XG4gICAgICAgIHRoaXMudXBkYXRlVG9waWNzKClcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhpcy50b3BpY3NNb2RhbC5hZGRGb290ZXJCdG4oXG4gICAgICAnT0snLFxuICAgICAgJ2J1dHRvbiBtb2RhbC1idXR0b24nLFxuICAgICAgKCkgPT4ge1xuICAgICAgICB0aGlzLnRvcGljc01vZGFsLmNsb3NlKClcbiAgICAgIH0pXG5cbiAgICAvLyByZW5kZXIgb3B0aW9ucyBpbnRvIG1vZGFsXG4gICAgdGhpcy50b3BpY3NPcHRpb25zLnJlbmRlckluKHRoaXMudG9waWNzTW9kYWwuZ2V0Q29udGVudCgpKVxuXG4gICAgLy8gQWRkIGZ1cnRoZXIgb3B0aW9ucyBidXR0b25zXG4gICAgLy8gVGhpcyBmZWVscyBhIGJpdCBpZmZ5IC0gZGVwZW5kcyB0b28gbXVjaCBvbiBpbXBsZW1lbnRhdGlvbiBvZiBPcHRpb25zU2V0XG4gICAgY29uc3QgbGlzID0gQXJyYXkuZnJvbSh0aGlzLnRvcGljc01vZGFsLmdldENvbnRlbnQoKS5nZXRFbGVtZW50c0J5VGFnTmFtZSgnbGknKSlcbiAgICBsaXMuZm9yRWFjaChsaSA9PiB7XG4gICAgICBjb25zdCB0b3BpY0lkID0gbGkuZGF0YXNldC5vcHRpb25JZFxuICAgICAgaWYgKHRvcGljSWQgIT09IHVuZGVmaW5lZCAmJiBUb3BpY0Nob29zZXIuaGFzT3B0aW9ucyh0b3BpY0lkKSkge1xuICAgICAgICBjb25zdCBvcHRpb25zQnV0dG9uID0gY3JlYXRlRWxlbSgnZGl2JywgJ2ljb24tYnV0dG9uIGV4dHJhLW9wdGlvbnMtYnV0dG9uJywgbGkpXG4gICAgICAgIHRoaXMuX2J1aWxkVG9waWNPcHRpb25zKHRvcGljSWQsIG9wdGlvbnNCdXR0b24pXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIF9idWlsZFRvcGljT3B0aW9ucyAodG9waWNJZDogc3RyaW5nLCBvcHRpb25zQnV0dG9uOiBIVE1MRWxlbWVudCkge1xuICAgIC8vIEJ1aWxkIHRoZSBVSSBhbmQgT3B0aW9uc1NldCBvYmplY3QgbGlua2VkIHRvIHRvcGljSWQuIFBhc3MgaW4gYSBidXR0b24gd2hpY2ggc2hvdWxkIGxhdW5jaCBpdFxuXG4gICAgLy8gTWFrZSB0aGUgT3B0aW9uc1NldCBvYmplY3QgYW5kIHN0b3JlIGEgcmVmZXJlbmNlIHRvIGl0XG4gICAgLy8gT25seSBzdG9yZSBpZiBvYmplY3QgaXMgY3JlYXRlZD9cbiAgICBjb25zdCBvcHRpb25zU2V0ID0gVG9waWNDaG9vc2VyLm5ld09wdGlvbnNTZXQodG9waWNJZClcbiAgICB0aGlzLm9wdGlvbnNTZXRzW3RvcGljSWRdID0gb3B0aW9uc1NldFxuXG4gICAgLy8gTWFrZSBhIG1vZGFsIGRpYWxvZyBmb3IgaXRcbiAgICBjb25zdCBtb2RhbCA9IG5ldyBUTW9kYWwoe1xuICAgICAgZm9vdGVyOiB0cnVlLFxuICAgICAgc3RpY2t5Rm9vdGVyOiBmYWxzZSxcbiAgICAgIGNsb3NlTWV0aG9kczogWydvdmVybGF5JywgJ2VzY2FwZSddLFxuICAgICAgY2xvc2VMYWJlbDogJ0Nsb3NlJ1xuICAgIH0pXG5cbiAgICBtb2RhbC5hZGRGb290ZXJCdG4oXG4gICAgICAnT0snLFxuICAgICAgJ2J1dHRvbiBtb2RhbC1idXR0b24nLFxuICAgICAgKCkgPT4ge1xuICAgICAgICBtb2RhbC5jbG9zZSgpXG4gICAgICB9KVxuXG4gICAgb3B0aW9uc1NldC5yZW5kZXJJbihtb2RhbC5nZXRDb250ZW50KCkpXG5cbiAgICAvLyBsaW5rIHRoZSBtb2RhbCB0byB0aGUgYnV0dG9uXG4gICAgb3B0aW9uc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIG1vZGFsLm9wZW4oKVxuICAgIH0pXG4gIH1cblxuICBjaG9vc2VUb3BpY3MgKCkge1xuICAgIHRoaXMudG9waWNzTW9kYWwub3BlbigpXG4gIH1cblxuICB1cGRhdGVUb3BpY3MgKCkge1xuICAgIC8vIHRvcGljIGNob2ljZXMgYXJlIHN0b3JlZCBpbiB0aGlzLnRvcGljc09wdGlvbnMgYXV0b21hdGljYWxseVxuICAgIC8vIHB1bGwgdGhpcyBpbnRvIHRoaXMudG9waWNzIGFuZCB1cGRhdGUgYnV0dG9uIGRpc3BsYXlzXG5cbiAgICAvLyBoYXZlIG9iamVjdCB3aXRoIGJvb2xlYW4gcHJvcGVydGllcy4gSnVzdCB3YW50IHRoZSB0cnVlIHZhbHVlc1xuICAgIGNvbnN0IHRvcGljcyA9IGJvb2xPYmplY3RUb0FycmF5KHRoaXMudG9waWNzT3B0aW9ucy5vcHRpb25zKVxuICAgIHRoaXMudG9waWNzID0gdG9waWNzXG5cbiAgICBsZXQgdGV4dFxuXG4gICAgaWYgKHRvcGljcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRleHQgPSAnQ2hvb3NlIHRvcGljJyAvLyBub3RoaW5nIHNlbGVjdGVkXG4gICAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmRpc2FibGVkID0gdHJ1ZVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBpZCA9IHRvcGljc1swXSAvLyBmaXJzdCBpdGVtIHNlbGVjdGVkXG4gICAgICB0ZXh0ID0gVG9waWNDaG9vc2VyLmdldFRpdGxlKGlkKVxuICAgICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlXG4gICAgfVxuXG4gICAgaWYgKHRvcGljcy5sZW5ndGggPiAxKSB7IC8vIGFueSBhZGRpdGlvbmFsIHNob3cgYXMgZS5nLiAnICsgMVxuICAgICAgdGV4dCArPSAnICsnICsgKHRvcGljcy5sZW5ndGggLSAxKVxuICAgIH1cblxuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uLmlubmVySFRNTCA9IHRleHRcbiAgfVxuXG4gIHNldENvbW1hbmRXb3JkICgpIHtcbiAgICAvLyBmaXJzdCBzZXQgdG8gZmlyc3QgdG9waWMgY29tbWFuZCB3b3JkXG4gICAgbGV0IGNvbW1hbmRXb3JkID0gVG9waWNDaG9vc2VyLmdldENvbW1hbmRXb3JkKHRoaXMudG9waWNzWzBdKVxuXG4gICAgbGV0IHVzZUNvbW1hbmRXb3JkID0gdHJ1ZSAvLyB0cnVlIGlmIHNoYXJlZCBjb21tYW5kIHdvcmRcblxuICAgIC8vIGN5Y2xlIHRocm91Z2ggcmVzdCBvZiB0b3BpY3MsIHJlc2V0IGNvbW1hbmQgd29yZCBpZiB0aGV5IGRvbid0IG1hdGNoXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCB0aGlzLnRvcGljcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKFRvcGljQ2hvb3Nlci5nZXRDb21tYW5kV29yZCh0aGlzLnRvcGljc1tpXSkgIT09IGNvbW1hbmRXb3JkKSB7XG4gICAgICAgIGNvbW1hbmRXb3JkID0gJydcbiAgICAgICAgdXNlQ29tbWFuZFdvcmQgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY29tbWFuZFdvcmQgPSBjb21tYW5kV29yZFxuICAgIHRoaXMudXNlQ29tbWFuZFdvcmQgPSB1c2VDb21tYW5kV29yZFxuICB9XG5cbiAgZ2VuZXJhdGVBbGwgKCkge1xuICAgIC8vIENsZWFyIGRpc3BsYXktYm94IGFuZCBxdWVzdGlvbiBsaXN0XG4gICAgdGhpcy5kaXNwbGF5Qm94LmlubmVySFRNTCA9ICcnXG4gICAgdGhpcy5xdWVzdGlvbnMgPSBbXVxuICAgIHRoaXMuc2V0Q29tbWFuZFdvcmQoKVxuXG4gICAgLy8gU2V0IG51bWJlciBhbmQgbWFpbiBjb21tYW5kIHdvcmRcbiAgICBjb25zdCBtYWlucSA9IGNyZWF0ZUVsZW0oJ3AnLCAna2F0ZXggbWFpbnEnLCB0aGlzLmRpc3BsYXlCb3gpXG4gICAgbWFpbnEuaW5uZXJIVE1MID0gYCR7dGhpcy5xTnVtYmVyfS4gJHt0aGlzLmNvbW1hbmRXb3JkfWAgLy8gVE9ETzogZ2V0IGNvbW1hbmQgd29yZCBmcm9tIHF1ZXN0aW9uc1xuXG4gICAgLy8gTWFrZSBzaG93IGFuc3dlcnMgYnV0dG9uXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24gPSBjcmVhdGVFbGVtKCdwJywgJ2J1dHRvbiBzaG93LWFuc3dlcnMnLCB0aGlzLmRpc3BsYXlCb3gpXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLnRvZ2dsZUFuc3dlcnMoKVxuICAgIH0pXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24uaW5uZXJIVE1MID0gJ1Nob3cgYW5zd2VycydcblxuICAgIC8vIEdldCBkaWZmaWN1bHR5IGZyb20gc2xpZGVyXG4gICAgY29uc3QgbWluZGlmZiA9IHRoaXMuZGlmZmljdWx0eVNsaWRlci5nZXRWYWx1ZUwoKVxuICAgIGNvbnN0IG1heGRpZmYgPSB0aGlzLmRpZmZpY3VsdHlTbGlkZXIuZ2V0VmFsdWVSKClcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIC8vIE1ha2UgcXVlc3Rpb24gY29udGFpbmVyIERPTSBlbGVtZW50XG4gICAgICBjb25zdCBjb250YWluZXIgPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tY29udGFpbmVyJywgdGhpcy5kaXNwbGF5Qm94KVxuICAgICAgY29udGFpbmVyLmRhdGFzZXQucXVlc3Rpb25faW5kZXggPSBpICsgJycgLy8gbm90IHN1cmUgdGhpcyBpcyBhY3R1YWxseSBuZWVkZWRcblxuICAgICAgLy8gQWRkIGNvbnRhaW5lciBsaW5rIHRvIG9iamVjdCBpbiBxdWVzdGlvbnMgbGlzdFxuICAgICAgaWYgKCF0aGlzLnF1ZXN0aW9uc1tpXSkgdGhpcy5xdWVzdGlvbnNbaV0gPSB7IGNvbnRhaW5lcjogY29udGFpbmVyIH1cblxuICAgICAgLy8gY2hvb3NlIGEgZGlmZmljdWx0eSBhbmQgZ2VuZXJhdGVcbiAgICAgIGNvbnN0IGRpZmZpY3VsdHkgPSBtaW5kaWZmICsgTWF0aC5mbG9vcihpICogKG1heGRpZmYgLSBtaW5kaWZmICsgMSkgLyB0aGlzLm4pXG5cbiAgICAgIC8vIGNob29zZSBhIHRvcGljIGlkXG4gICAgICB0aGlzLmdlbmVyYXRlKGksIGRpZmZpY3VsdHkpXG4gICAgfVxuICB9XG5cbiAgZ2VuZXJhdGUgKGk6IG51bWJlciwgZGlmZmljdWx0eTogbnVtYmVyLCB0b3BpY0lkPzogc3RyaW5nKSB7XG4gICAgLy8gVE9ETyBnZXQgb3B0aW9ucyBwcm9wZXJseVxuICAgIHRvcGljSWQgPSB0b3BpY0lkIHx8IHJhbmRFbGVtKHRoaXMudG9waWNzKVxuXG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgIGxhYmVsOiAnJyxcbiAgICAgIGRpZmZpY3VsdHk6IGRpZmZpY3VsdHksXG4gICAgICB1c2VDb21tYW5kV29yZDogZmFsc2VcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zU2V0c1t0b3BpY0lkXSkge1xuICAgICAgT2JqZWN0LmFzc2lnbihvcHRpb25zLCB0aGlzLm9wdGlvbnNTZXRzW3RvcGljSWRdLm9wdGlvbnMpXG4gICAgfVxuXG4gICAgLy8gY2hvb3NlIGEgcXVlc3Rpb25cbiAgICBjb25zdCBxdWVzdGlvbiA9IFRvcGljQ2hvb3Nlci5uZXdRdWVzdGlvbih0b3BpY0lkLCBvcHRpb25zKVxuXG4gICAgLy8gc2V0IHNvbWUgbW9yZSBkYXRhIGluIHRoZSBxdWVzdGlvbnNbXSBsaXN0XG4gICAgaWYgKCF0aGlzLnF1ZXN0aW9uc1tpXSkgdGhyb3cgbmV3IEVycm9yKCdxdWVzdGlvbiBub3QgbWFkZScpXG4gICAgdGhpcy5xdWVzdGlvbnNbaV0ucXVlc3Rpb24gPSBxdWVzdGlvblxuICAgIHRoaXMucXVlc3Rpb25zW2ldLnRvcGljSWQgPSB0b3BpY0lkXG5cbiAgICAvLyBSZW5kZXIgaW50byB0aGUgY29udGFpbmVyXG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5xdWVzdGlvbnNbaV0uY29udGFpbmVyXG4gICAgY29udGFpbmVyLmlubmVySFRNTCA9ICcnIC8vIGNsZWFyIGluIGNhc2Ugb2YgcmVmcmVzaFxuXG4gICAgLy8gbWFrZSBhbmQgcmVuZGVyIHF1ZXN0aW9uIG51bWJlciBhbmQgY29tbWFuZCB3b3JkIChpZiBuZWVkZWQpXG4gICAgbGV0IHFOdW1iZXJUZXh0ID0gcXVlc3Rpb25MZXR0ZXIoaSkgKyAnKSdcbiAgICBpZiAod2luZG93LlNIT1dfRElGRklDVUxUWSkgeyBxTnVtYmVyVGV4dCArPSBvcHRpb25zLmRpZmZpY3VsdHkgfVxuICAgIGlmICghdGhpcy51c2VDb21tYW5kV29yZCkge1xuICAgICAgcU51bWJlclRleHQgKz0gJyAnICsgVG9waWNDaG9vc2VyLmdldENvbW1hbmRXb3JkKHRvcGljSWQpXG4gICAgICBjb250YWluZXIuY2xhc3NMaXN0LmFkZCgnaW5kaXZpZHVhbC1jb21tYW5kLXdvcmQnKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZSgnaW5kaXZpZHVhbC1jb21tYW5kLXdvcmQnKVxuICAgIH1cblxuICAgIGNvbnN0IHF1ZXN0aW9uTnVtYmVyRGl2ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLW51bWJlciBrYXRleCcsIGNvbnRhaW5lcilcbiAgICBxdWVzdGlvbk51bWJlckRpdi5pbm5lckhUTUwgPSBxTnVtYmVyVGV4dFxuXG4gICAgLy8gcmVuZGVyIHRoZSBxdWVzdGlvblxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChxdWVzdGlvbi5nZXRET00oKSkgLy8gdGhpcyBpcyBhIC5xdWVzdGlvbi1kaXYgZWxlbWVudFxuICAgIHF1ZXN0aW9uLnJlbmRlcigpIC8vIHNvbWUgcXVlc3Rpb25zIG5lZWQgcmVuZGVyaW5nIGFmdGVyIGF0dGFjaGluZyB0byBET01cblxuICAgIC8vIG1ha2UgaGlkZGVuIGFjdGlvbnMgbWVudVxuICAgIGNvbnN0IGFjdGlvbnMgPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tYWN0aW9ucyBoaWRkZW4nLCBjb250YWluZXIpXG4gICAgY29uc3QgcmVmcmVzaEljb24gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tcmVmcmVzaCBpY29uLWJ1dHRvbicsIGFjdGlvbnMpXG4gICAgY29uc3QgYW5zd2VySWNvbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1hbnN3ZXIgaWNvbi1idXR0b24nLCBhY3Rpb25zKVxuXG4gICAgYW5zd2VySWNvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHF1ZXN0aW9uLnRvZ2dsZUFuc3dlcigpXG4gICAgICBoaWRlQWxsQWN0aW9ucygpXG4gICAgfSlcblxuICAgIHJlZnJlc2hJY29uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgdGhpcy5nZW5lcmF0ZShpLCBkaWZmaWN1bHR5KVxuICAgICAgaGlkZUFsbEFjdGlvbnMoKVxuICAgIH0pXG5cbiAgICAvLyBROiBpcyB0aGlzIGJlc3Qgd2F5IC0gb3IgYW4gZXZlbnQgbGlzdGVuZXIgb24gdGhlIHdob2xlIGRpc3BsYXlCb3g/XG4gICAgY29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZSA9PiB7XG4gICAgICBpZiAoIWhhc0FuY2VzdG9yQ2xhc3MoZS50YXJnZXQsICdxdWVzdGlvbi1hY3Rpb25zJykpIHtcbiAgICAgICAgLy8gb25seSBkbyB0aGlzIGlmIGl0IGRpZG4ndCBvcmlnaW5hdGUgaW4gYWN0aW9uIGJ1dHRvblxuICAgICAgICB0aGlzLnNob3dRdWVzdGlvbkFjdGlvbnMoaSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgdG9nZ2xlQW5zd2VycyAoKSB7XG4gICAgaWYgKHRoaXMuYW5zd2VyZWQpIHtcbiAgICAgIHRoaXMucXVlc3Rpb25zLmZvckVhY2gocSA9PiB7XG4gICAgICAgIGlmIChxLnF1ZXN0aW9uKSBxLnF1ZXN0aW9uLmhpZGVBbnN3ZXIoKVxuICAgICAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgICAgICAgdGhpcy5hbnN3ZXJCdXR0b24uaW5uZXJIVE1MID0gJ1Nob3cgYW5zd2VycydcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucXVlc3Rpb25zLmZvckVhY2gocSA9PiB7XG4gICAgICAgIGlmIChxLnF1ZXN0aW9uKSBxLnF1ZXN0aW9uLnNob3dBbnN3ZXIoKVxuICAgICAgICB0aGlzLmFuc3dlcmVkID0gdHJ1ZVxuICAgICAgICB0aGlzLmFuc3dlckJ1dHRvbi5pbm5lckhUTUwgPSAnSGlkZSBhbnN3ZXJzJ1xuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2NhbnMgZm9yIHdpZGVzdCBxdWVzdGlvbiBhbmQgdGhlbiBzZXRzIHRoZSBncmlkIHdpZHRoIHRvIHRoYXRcbiAgICovXG4gIC8qIGVzbGludC1kaXNhYmxlICovXG4gIGFkanVzdEdyaWRXaWR0aCAoKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgLyogZXNsaW50LWVuYWJsZSAqL1xuXG4gIHNob3dRdWVzdGlvbkFjdGlvbnMgKHF1ZXN0aW9uSW5kZXg6IG51bWJlcikge1xuICAgIC8vIGZpcnN0IGhpZGUgYW55IG90aGVyIGFjdGlvbnNcbiAgICBoaWRlQWxsQWN0aW9ucygpXG5cbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLnF1ZXN0aW9uc1txdWVzdGlvbkluZGV4XS5jb250YWluZXJcbiAgICBjb25zdCBhY3Rpb25zID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy5xdWVzdGlvbi1hY3Rpb25zJykgYXMgSFRNTEVsZW1lbnRcblxuICAgIC8vIFVuaGlkZSB0aGUgb3ZlcmxheVxuICAgIGNvbnN0IG92ZXJsYXkgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcub3ZlcmxheScpXG4gICAgaWYgKG92ZXJsYXkgIT09IG51bGwpIG92ZXJsYXkuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJylcbiAgICBhY3Rpb25zLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpXG4gICAgYWN0aW9ucy5zdHlsZS5sZWZ0ID0gKGNvbnRhaW5lci5vZmZzZXRXaWR0aCAvIDIgLSBhY3Rpb25zLm9mZnNldFdpZHRoIC8gMikgKyAncHgnXG4gICAgYWN0aW9ucy5zdHlsZS50b3AgPSAoY29udGFpbmVyLm9mZnNldEhlaWdodCAvIDIgLSBhY3Rpb25zLm9mZnNldEhlaWdodCAvIDIpICsgJ3B4J1xuICB9XG5cbiAgYXBwZW5kVG8gKGVsZW06IEhUTUxFbGVtZW50KSB7XG4gICAgZWxlbS5hcHBlbmRDaGlsZCh0aGlzLm91dGVyQm94KVxuICAgIHRoaXMuX2luaXRTbGlkZXIoKSAvLyBoYXMgdG8gYmUgaW4gZG9jdW1lbnQncyBET00gdG8gd29yayBwcm9wZXJseVxuICB9XG5cbiAgYXBwZW5kQmVmb3JlIChwYXJlbnQ6IEhUTUxFbGVtZW50LCBlbGVtOiBIVE1MRWxlbWVudCkge1xuICAgIHBhcmVudC5pbnNlcnRCZWZvcmUodGhpcy5vdXRlckJveCwgZWxlbSlcbiAgICB0aGlzLl9pbml0U2xpZGVyKCkgLy8gaGFzIHRvIGJlIGluIGRvY3VtZW50J3MgRE9NIHRvIHdvcmsgcHJvcGVybHlcbiAgfVxufVxuXG5mdW5jdGlvbiBxdWVzdGlvbkxldHRlciAoaTogbnVtYmVyKSB7XG4gIC8vIHJldHVybiBhIHF1ZXN0aW9uIG51bWJlci4gZS5nLiBxTnVtYmVyKDApPVwiYVwiLlxuICAvLyBBZnRlciBsZXR0ZXJzLCB3ZSBnZXQgb24gdG8gZ3JlZWtcbiAgY29uc3QgbGV0dGVyID1cbiAgICAgICAgaSA8IDI2ID8gU3RyaW5nLmZyb21DaGFyQ29kZSgweDYxICsgaSlcbiAgICAgICAgICA6IGkgPCA1MiA/IFN0cmluZy5mcm9tQ2hhckNvZGUoMHg0MSArIGkgLSAyNilcbiAgICAgICAgICAgIDogU3RyaW5nLmZyb21DaGFyQ29kZSgweDNCMSArIGkgLSA1MilcbiAgcmV0dXJuIGxldHRlclxufVxuXG5mdW5jdGlvbiBoaWRlQWxsQWN0aW9ucyAoKSB7XG4gIC8vIGhpZGUgYWxsIHF1ZXN0aW9uIGFjdGlvbnNcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnF1ZXN0aW9uLWFjdGlvbnMnKS5mb3JFYWNoKGVsID0+IHtcbiAgICBlbC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuICB9KVxuICBjb25zdCBvdmVybGF5ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm92ZXJsYXknKVxuICBpZiAob3ZlcmxheSAhPT0gbnVsbCkgeyBvdmVybGF5LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpIH0gZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBmaW5kIG92ZXJsYXkgd2hlbiBoaWRpbmcgYWN0aW9ucycpXG59XG4iLCJpbXBvcnQgUXVlc3Rpb25TZXQgZnJvbSAnUXVlc3Rpb25TZXQnXG5cbi8vIFRPRE86XG4vLyAgLSBJbXBvcnQgZXhpc3RpbmcgcXVlc3Rpb24gdHlwZXMgKEcgLSBncmFwaGljLCBUIC0gdGV4dFxuLy8gICAgLSBHIGFyZWFcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsICgpID0+IHtcbiAgY29uc3QgcXMgPSBuZXcgUXVlc3Rpb25TZXQoKVxuICBxcy5hcHBlbmRUbyhkb2N1bWVudC5ib2R5KVxuICBxcy5jaG9vc2VUb3BpY3MoKVxufSlcbiJdLCJuYW1lcyI6WyJjb21tb25qc0hlbHBlcnMuY3JlYXRlQ29tbW9uanNNb2R1bGUiLCJjb21tb25qc0hlbHBlcnMuZ2V0RGVmYXVsdEV4cG9ydEZyb21DanMiLCJmcmFjdGlvbiIsIlRELmdldFRyaWFuZ2xlIiwidGhpcyIsIlJTbGlkZXIiLCJUb3BpY0Nob29zZXIuZ2V0VG9waWNzIiwiVE1vZGFsIiwiVG9waWNDaG9vc2VyLmhhc09wdGlvbnMiLCJUb3BpY0Nob29zZXIubmV3T3B0aW9uc1NldCIsIlRvcGljQ2hvb3Nlci5nZXRUaXRsZSIsIlRvcGljQ2hvb3Nlci5nZXRDb21tYW5kV29yZCIsIlRvcGljQ2hvb3Nlci5uZXdRdWVzdGlvbiJdLCJtYXBwaW5ncyI6Ijs7O0VBQUE7RUFDQTtFQUNBO0FBQ0E7RUFDQSxJQUFJLEVBQUUsR0FBRyxVQUFVLElBQUksRUFBRTtFQUN6QixFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSTtFQUNuQixFQUFFLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSTtFQUMxQixFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSTtFQUNwQixFQUFFLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBQztFQUN0QixFQUFFLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBQztFQUNyQixFQUFFLElBQUksQ0FBQyxZQUFZLEdBQUcsRUFBQztFQUN2QixFQUFFLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSTtFQUN0QixFQUFFLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSTtFQUN0QixFQUFFLElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSTtFQUMzQixFQUFFLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSTtFQUN0QixFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSTtFQUNuQixFQUFFLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBQztFQUNmLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFJO0VBQ2xCLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFJO0VBQ2xCLEVBQUUsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFJO0VBQ3JCLEVBQUUsSUFBSSxDQUFDLFFBQVEsR0FBRyxNQUFLO0FBQ3ZCO0VBQ0Es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QUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUMsRUFBRTtBQUNwRztFQUNBLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBRyxFQUFFO0FBQ3JHO0VBQ0EsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFJO0FBQ3RHO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO0VBQ3ZCLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtFQUMzQixNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFDO0VBQy9ELE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDN0QsS0FBSztFQUNMLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDcEcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSTtFQUM3RixHQUFHLE1BQU07RUFDVCxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQyxFQUFFO0VBQ3RGLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDeEQsR0FBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUM7RUFDbEcsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxFQUFDO0FBQ2xEO0VBQ0EsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUk7RUFDdEYsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFJO0FBQ2pFO0VBQ0EsRUFBRSxPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDeEIsRUFBQztBQUNEO0VBQ0EsRUFBRSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDLEVBQUU7RUFDekMsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU07QUFDaEM7RUFDQSxFQUFFLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLElBQUksRUFBQztBQUNqRTtFQUNBLEVBQUUsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUM7RUFDMUUsRUFBRSxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLEVBQUM7QUFDdEI7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7RUFDdkIsSUFBSSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxHQUFHLEVBQUU7RUFDMUQsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFHO0VBQzdCLEtBQUssTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFHO0VBQ2hDLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFHO0FBQzlCO0VBQ0EsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFDO0FBQ3pDO0VBQ0Es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O0VBQ2IsTUFBTSxLQUFLLENBQUM7RUFDWixRQUFRLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLEVBQUM7RUFDL0QsUUFBUSxLQUFLO0VBQ2IsTUFBTSxLQUFLLENBQUMsQ0FBQztFQUNiLE1BQU07RUFDTixRQUFRLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsRUFBQztFQUNoRSxRQUFRLEtBQUs7RUFDYixLQUFLO0FBQ0w7RUFDQTtFQUNBLElBQUk7RUFDSixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQzdDLE1BQU0sV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUM3QixNQUFNO0VBQ04sTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsS0FBSztBQUNMO0VBQ0E7RUFDQSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFF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Q0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7VUFDakUsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7VUFDakUsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7T0FDN0I7TUFFRCxPQUFPLE1BQU0sQ0FBRSxNQUFlO1VBQzVCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtVQUNoRSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7VUFDaEUsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7VUFDakUsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7VUFDakUsT0FBTyxJQUFJLEtB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RUFDQTtFQUNBLE1BQU0sR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUMzQixRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ25CLFFBQVEsT0FBTyxJQUFJLFFBQVE7RUFDM0IsVUFBVSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDcEQsVUFBVSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ3RCLFNBQVM7RUFDVCxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxHQUFHLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzNCLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbkIsUUFBUSxPQUFPLElBQUksUUFBUTtFQUMzQixVQUFVLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ3JDLFVBQVUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUN0QixTQUFTO0VBQ1QsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUMzQixRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ25CLFFBQVEsT0FBTyxJQUFJLFFBQVE7RUFDM0IsVUFBVSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUNyQyxVQUFVLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDdEIsU0FBUztFQUNULE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEtBQUssRUFBRSxZQUFZO0VBQ3pCLFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUM7RUFDakMsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUMzQixRQUFRLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzVDLFVBQVUsT0FBTyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUM7RUFDbEMsU0FBUztBQUNUO0VBQ0EsUUFBUSxJQUFJLENBQUMsS0FBSyxTQUFTLEVBQUU7RUFDN0IsVUFBVSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUMxRCxTQUFTO0FBQ1Q7RUFDQSxRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ25CLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRTtFQUN2QyxVQUFVLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3hCLFNBQVM7QUFDVDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7QUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxRQUFRLE9BQU8sSUFBSSxRQUFRO0VBQzNCLFVBQVUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDbEQsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0VBQ3RCLFNBQVM7RUFDVCxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxHQUFHLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzNCLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7QUFDbkI7RUFDQTtBQUNBO0VBQ0EsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQzlFLE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDM0IsUUFBUSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztBQUNuQjtFQUNBO0FBQ0E7RUFDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDdkMsVUFBVSxPQUFPLElBQUksUUFBUSxFQUFFO0VBQy9CLFNBQVM7RUFDVCxRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDOUUsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sSUFBSSxFQUFFLFVBQVUsTUFBTSxFQUFFO0VBQzlCLFFBQVEsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxDQUFDLEVBQUM7QUFDMUM7RUFDQSxRQUFRLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzVDLFVBQVUsT0FBTyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUM7RUFDbEMsU0FBUztFQUNULFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztFQUNqRixPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxLQUFLLEVBQUUsVUFBVSxNQUFNLEVBQUU7RUFDL0IsUUFBUSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxJQUFJLENBQUMsRUFBQztBQUMxQztFQUNBLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDNUMsVUFBVSxPQUFPLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQztFQUNsQyxTQUFTO0VBQ1QsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0VBQ2xGLE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEtBQUssRUFBRSxVQUFVLE1BQU0sRUFBRTtFQUMvQixRQUFRLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxNQUFNLElBQUksQ0FBQyxFQUFDO0FBQzFDO0VBQ0EsUUFBUSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUM1QyxVQUFVLE9BQU8sSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDO0VBQ2xDLFNBQVM7RUFDVCxRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDbEYsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sT0FBTyxFQUFFLFlBQVk7RUFDM0IsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ3BELE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRTtFQUN4QixRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtFQUNuQixVQUFVLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNsRixTQUFTLE1BQU07RUFDZixVQUFVLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQ2hGLFNBQVM7RUFDVCxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxNQUFNLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzlCLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbkIsUUFBUSxPQUFPLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztFQUMzRCxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxPQUFPLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQy9CLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbkIsUUFBUSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBQztFQUM1RCxRQUFRLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDaEMsT0FBTztBQUNQO0VBQ0EsTUFBTSxRQUFRLEVBQUUsVUFBVSxHQUFHLEVBQUU7RUFDL0I7QUFDQTtFQUNBLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDNUMsVUFBVSxPQUFPLElBQUk7RUFDckIsU0FBUztBQUNUO0VBQ0EsUUFBUSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsV0FBVyxHQUFFO0FBQzNDO0VBQ0EsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLE1BQUs7QUFDMUI7RUFDQSxRQUFRLFNBQVMsR0FBRyxFQUFFLENBQUMsRUFBRTtF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TUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFDO0VBQ3RELFFBQVEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDekMsVUFBVSxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUNqRCxVQUFVLE1BQU0sRUFBRSxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUN2RCxVQUFVLE1BQU0sRUFBRSxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUN2RCxVQUFVLE1BQU0sRUFBRSxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUN2RCxVQUFVLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUU7RUFDdEQsVUFBVSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHO0VBQzdCLFlBQVksR0FBRyxFQUFFLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQztFQUNyQyxZQUFZLE1BQU0sRUFBRSxLQUFLO0VBQ3pCLFlBQVc7RUFDWCxTQUFTO0VBQ1QsUUFBUSxLQUFLO0VBQ2IsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsQ0FBQztFQUNiLE1BQU0sS0FBSyxDQUFDLEVBQUU7RUFDZCxRQUFRLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBQztFQUNsRSxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJ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Q0FBQyxDQUFBO1VBQzdCLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFBO1VBQ1gsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFBO1VBQ2xCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Y0FDaEQsVUFBVSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUE7Y0FDaEQsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQTtXQUNoRDs7VUFHRCxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBOztVQUV0RyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBOztVQUdyQyxVQUFVLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQTtVQUM1RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7O2NBRS9DLE1BQU0sS0FBSyxHQUFvQixFQUFFLENBQUE7Y0FDakMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7Y0FDdEMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJ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Q0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBQztFQUMxQixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFDO0VBQzFCLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUM7RUFDcEMsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBQztFQUMxQixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFDO0VBQ3BDLENBQUM7QUFDRDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDTyxTQUFTLGNBQWMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFO0VBQ3BELEVBQUUsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3ZDLEVBQUUsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3ZDLEVBQUUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBQztFQUNwRSxFQUFFLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLEVBQUM7RUFDdkUsRUFBRSxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFDO0VBQ3BFLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUM7RUFDNUIsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBQztFQUM1QixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFDO0VBQzVCOztFQ2xETyxNQUFNLE1BQU0sR0FBRyxDQUFDLFdBQVcsRUFBQyxhQUFhLEVBQUMsTUFBTSxFQUFDLFlBQVksRUFBQyxXQUFXLEVBQUMsT0FBTyxFQUFDLFdBQVcsQ0FBQzs7UUNmaEYsaUJBQWtCLFNBQVEsWUFBWTtNQU96RCxZQUFhLENBQVEsRUFBRSxDQUFRLEVBQUUsQ0FBUSxFQUFFLENBQVEsRUFBRSxNQUFlLEVBQUUsSUFBdUIsRUFBRSxXQUF3Qjs7Ozs7OztVQU9ySCxLQUFLLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1VBQ3hCLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1VBQ1YsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7VUFDVixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtVQUNWLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1VBQ1YsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7T0FDckI7Ozs7OztNQU9ELE9BQU8sUUFBUSxDQUFFLElBQXVCLEVBQUUsV0FBeUI7OztVQUVqRSxXQUFXLEdBQUcsV0FBVyxhQUFYLFdBQVcsY0FBWCxXQUFXLEdBQUksRUFBRSxDQUFBO1VBQy9CLFdBQVcsQ0FBQyxLQUFLLFNBQUcsV0FBVyxDQUFDLEtBQUssbUNBQUksR0FBRyxDQUFBO1VBQzVDLFdBQVcsQ0FBQyxNQUFNLFNBQUcsV0FBVyxDQUFDLE1BQU0sbUNBQUksR0FBRyxDQUFBOztVQUc5QyxNQUFNLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7VUFDekIsTUFBTSxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7VUFDdkMsTUFBTSxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtVQUNuRCxNQUFNLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTs7VUFHckMsTUFBTSxRQUFRLFNBQUcsV0FBVyxDQUFDLFFBQVEsbUNBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUNuRTtVQUFBLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7VUFDaEQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQTs7VUFHekUsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFBO1VBRTNCLE1BQU0sS0FBSyxHQUE2QjtjQUN0QyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQztjQUNuQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQztXQUNsQixDQUFBO1VBRUQsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFO2NBQ3RCLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO2NBQy9CLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1dBQzlCO1VBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtjQUM1QyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7a0JBQUUsU0FBUTtjQUMvQixNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUE7Y0FDakIsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7Y0FDaEQsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7Y0FFMUQsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUE7Y0FFdEQsTUFBTSxLQUFLLFNBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssbUNBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtjQUM3RCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLEdBQUcsR0FBRyxLQUFLLENBQUE7Y0FDL0MsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFBO2NBQ3ZCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsUUFBUSxHQUFHLFFBQVEsQ0FBQTtjQUV4RCxNQUFNLENBQUMsSUFBSSxDQUFDO2tCQUNWLEdBQUcsRUFBRSxHQUFHO2tCQUNSLEtBQUssRUFBRSxLQUFLO2tCQUNaLEtBQUssRUFBRSxLQUFLO2tCQUNaLElBQUksRUFBRSxLQUFLO2tCQUNYLE1BQU0sRUFBRSxNQUFNO2tCQUNkLE1BQU0sRUFBRSxNQUFNO2tCQUNkLEtBQUssRUFBRSxNQUFNO2VBQ2QsQ0FBQyxDQUFBO1dBQ0g7VUFFRCxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUE7VUFDYixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO2NBQ2xCLE1BQU0sS0FBSyxTQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxtQ0FBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtjQUN6RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFBO2NBQzdDLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQTtjQUMzQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxjQUFjLEdBQUcsWUFBWSxDQUFBO2NBQ2hFLE1BQU0sQ0FBQyxJQUFJLENBQ1Q7a0JBQ0UsS0FBSyxFQUFFLGlCQUFpQixHQUFHLEtBQUs7a0JBQ2hDLEtBQUssRUFBRSxpQkFBaUIsR0FBRyxLQUFLO2tCQUNoQyxJQUFJLEVBQUUsaUJBQWlCLEdBQUcsS0FBSztrQkFDL0IsTUFBTSxFQUFFLE1BQU07a0JBQ2QsTUFBTSxFQUFFLE1BQU07a0JBQ2QsS0FBSyxFQUFFLE1BQU07a0JBQ2IsR0FBRyxFQUFFLElBQUksS0FBSyxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsTUFBTSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFDO2VBQ3pELENBQ0YsQ0FBQTtjQUNELEtBQUssRUFBRSxDQUFBO1dBQ1I7VUFFRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFO2NBQ3ZCLE1BQU0sS0FBSyxTQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxtQ0FBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtjQUNuRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFBO2NBQ2xELE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQTtjQUMzQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxjQUFjLEdBQUcsWUFBWSxDQUFBO2NBQ3JFLE1BQU0sQ0FBQyxJQUFJLENBQ1Q7a0JBQ0UsR0FBRyxFQUFFLElBQUksS0FBSyxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsTUFBTSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFDO2tCQUN4RCxLQUFLLEVBQUUsc0JBQXNCLEdBQUcsS0FBSztrQkFDckMsS0FBSyxFQUFFLHNCQUFzQixHQUFHLEtBQUs7a0JBQ3JDLElBQUksRUFBRSxzQkFBc0IsR0FBRyxLQUFLO2tCQUNwQyxNQUFNLEVBQUUsTUFBTTtrQkFDZCxNQUFNLEVBQUUsTUFBTTtrQkFDZCxLQUFLLEVBQUUsTUFBTTtlQUNkLENBQ0YsQ0FBQTtXQUNGO1VBRUQsT0FBTyxJQUFJLGlCQUFpQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO09BQ3BFO01BRUQsTUFBTTtVQUNKLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFBO1VBQ3hDLElBQUksR0FBRyxLQUFLLElBQUksRUFBRTtjQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtXQUFFO1VBQzlELEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1VBQzFELEdBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUE7O1VBR25CLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtVQUNmLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtVQUM5QixHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDOUIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1VBQzlCLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtVQUM5QixHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDOUIsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFBO1VBQ1osR0FBRyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7VUFDaEMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFBO1VBQ1YsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFBOztVQUdmLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQ25CLEVBQUUsRUFDRixJ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LENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDcEMsYUFBYTtFQUNiLFlBQVksQ0FBQyxFQUFFLENBQUM7QUFDaEI7RUFDQTtFQUNBLFlBQVksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7RUFDcEgsY0FBYyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNsQyxjQUFjLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7RUFDNUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztFQUNsQixhQUFhO0FBQ2I7RUFDQTtFQUNBLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7RUFDdEYsY0FBYyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDdEMsY0FBYyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxN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LENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsOEJBQThCLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsdVVBQXVVLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFHLFVBQVUsR0FBRyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLE9BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU0sVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUksVUFBVSxFQUFFLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMseURBQXlELEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7O0VDYTV4TyxNQUFNLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQTtFQVM5QjtFQUNBLFVBQVUsQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUV2RSxXQUFXO01BMkI5QixZQUFhLE9BQWU7VUFDMUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUE7VUFDbkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUE7VUFDaEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUE7VUFDckIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLElBQUksQ0FBQyxDQUFBO1VBQzNCLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFBO1VBQ3JCLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFBO1VBQ3JCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFBO1VBQzFCLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1VBRVYsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO09BQ2Q7TUFFRCxNQUFNO1VBQ0osSUFBSSxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLG1CQUFtQixDQUFDLENBQUE7VUFDdEQsSUFBSSxDQUFDLFNBQVMsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLG9CQUFvQixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtVQUN2RSxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxLQUFLLEVBQUUscUJBQXFCLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1VBRXpFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1VBRXZCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO09BQzFCO01BRUQsZ0JBQWdCO1VBQ2QsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1VBQy9ELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLHNCQUFzQixFQUFFLFNBQVMsQ0FBQyxDQUFBO1VBQy9FLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEdBQUcsY0FBYyxDQUFBO1VBQ2xELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsTUFBTSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQTtVQUU1RSxNQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7VUFDcEUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQTtVQUNyQyxNQUFNLHFCQUFxQixHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1VBQ2hGLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxxQkFBcUIsQ0FBcUIsQ0FBQTtVQUV4RyxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7VUFDM0QsS0FBSyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1VBQ3JDLE1BQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLEtBQUssQ0FBcUIsQ0FBQTtVQUNyRixlQUFlLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQTtVQUMvQixlQUFlLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQTtVQUN6QixlQUFlLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQTtVQUMzQixlQUFlLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFO2NBQ3pDLElBQUksQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtXQUN6QyxDQUFDLENBQUE7VUFFRixJQUFJLENBQUMsY0FBYyxHQUFHLFVBQVUsQ0FBQyxRQUFRLEVBQUUsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBc0IsQ0FBQTtVQUN6RyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUE7VUFDbkMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEdBQUcsV0FBVyxDQUFBO1VBQzNDLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7T0FDeEU7TUFFRCxXQUFXO1VBQ1QsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUlDLEVBQU8sQ0FBQztjQUNsQyxNQUFNLEVBQUUsSUFBSSxDQUFDLHVCQUF1QjtjQUNwQyxNQUFNLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Y0FDM0IsS0FBSyxFQUFFLElBQUk7Y0FDWCxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2NBQ1gsSUFBSSxFQUFFLENBQUM7Y0FDUCxPQUFPLEVBQUUsS0FBSztjQUNkLEtBQUssRUFBRSxJQUFJO2NBQ1gsTUFBTSxFQUFFLElBQUk7V0FDYixDQUFDLENBQUE7T0FDSDtNQUVELGtCQUFrQjs7VUFFaEIsTUFBTSxNQUFNLEdBQUdDLFNBQXNCLEVBQUUsQ0FBQTtVQUN2QyxNQUFNLFdBQVcsR0FBZ0IsRUFBRSxDQUFBO1VBQ25DLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSztjQUNsQixXQUFXLENBQUMsSUFBSSxDQUFDO2tCQUNmLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztrQkFDbEIsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFO2tCQUNaLElBQUksRUFBRSxNQUFNO2tCQUNaLE9BQU8sRUFBRSxLQUFLO2tCQUNkLFNBQVMsRUFBRSxJQUFJO2VBQ2hCLENBQUMsQ0FBQTtXQUNILENBQUMsQ0FBQTtVQUNGLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUE7O1VBR2hELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSUMsZ0JBQU0sQ0FBQztjQUM1QixNQUFNLEVBQUUsSUFBSTtjQUNaLFlBQVksRUFBRSxLQUFLO2NBQ25CLFlBQVksRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUM7Y0FDbkMsVUFBVSxFQUFFLE9BQU87Y0FDbkIsT0FBTyxFQUFFO2tCQUNQLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtlQUNwQjtXQUNGLENBQUMsQ0FBQTtVQUVGLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUMzQixJQUFJLEVBQ0oscUJBQXFCLEVBQ3JCO2NBQ0UsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtXQUN6QixDQUFDLENBQUE7O1VBR0osSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBOzs7VUFJMUQsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7VUFDaEYsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFO2NBQ1osTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUE7Y0FDbkMsSUFBSSxPQUFPLEtBQUssU0FBUyxJQUFJQyxVQUF1QixDQUFDLE9BQU8sQ0FBQyxFQUFFO2tCQUM3RCxNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLGtDQUFrQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO2tCQUMvRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFBO2VBQ2hEO1dBQ0YsQ0FBQyxDQUFBO09BQ0g7TUFFRCxrQkFBa0IsQ0FBRSxPQUFlLEVBQUUsYUFBMEI7Ozs7VUFLN0QsTUFBTSxVQUFVLEdBQUdDLGFBQTBCLENBQUMsT0FBTyxDQUFDLENBQUE7VUFDdEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxVQUFVLENBQUE7O1VBR3RDLE1BQU0sS0FBSyxHQUFHLElBQUlGLGdCQUFNLENBQUM7Y0FDdkIsTUFBTSxFQUFFLElBQUk7Y0FDWixZQUFZLEVBQUUsS0FBSztjQUNuQixZQUFZLEVBQUUsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDO2NBQ25DLFVBQVUsRUFBRSxPQUFPO1dBQ3BCLENBQUMsQ0FBQTtVQUVGLEtBQUssQ0FBQyxZQUFZLENBQ2hCLElBQUksRUFDSixxQkFBcUIsRUFDckI7Y0FDRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7V0FDZCxDQUFDLENBQUE7VUFFSixVQUFVLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBOztVQUd2QyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFO2NBQ3RDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQTtXQUNiLENBQUMsQ0FBQTtPQUNIO01BRUQsWUFBWTtVQUNWLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUE7T0FDeEI7TUFFRCxZQUFZOzs7O1VBS1YsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtVQUM1RCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtVQUVwQixJQUFJLElBQUksQ0FBQTtVQUVSLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Y0FDdkIsSUFBSSxHQUFHLGNBQWMsQ0FBQTtjQUNyQixJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUE7V0FDcEM7ZUFBTTtjQUNMLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtjQUNwQixJQUFJLEdBQUdHLFFBQXFCLENBQUMsRUFBRSxDQUFDLENBQUE7Y0FDaEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFBO1dBQ3JDO1VBRUQsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtjQUNyQixJQUFJLElBQUksSUFBSSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7V0FDbkM7VUFFRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQTtPQUN6QztNQUVELGNBQWM7O1VBRVosSUFBSSxXQUFXLEdBQUdDLGNBQTJCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1VBRTdELElBQUksY0FBYyxHQUFHLElBQUksQ0FBQTs7VUFHekIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO2NBQzNDLElBQUlBLGNBQTJCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLFdBQVcsRUFBRTtrQkFDL0QsV0FBVyxHQUFHLEVBQUUsQ0FBQTtrQkFDaEIsY0FBYyxHQUFHLEtBQUssQ0FBQTtrQkFDdEIsTUFBSztlQUNOO1dBQ0Y7VUFFRCxJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQTtVQUM5QixJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQTtPQUNyQztNQUVELFdBQVc7O1VBRVQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFBO1VBQzlCLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFBO1VBQ25CLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQTs7VUFHckIsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1VBQzdELEtBQUssQ0FBQyxTQUFTLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTs7VUFHeEQsSUFBSSxDQUFDLFlBQVksR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFLHFCQUFxQixFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtVQUMzRSxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRTtjQUMxQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7V0FDckIsQ0FBQyxDQUFBO1VBQ0YsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEdBQUcsY0FBYyxDQUFBOztVQUc1QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLENBQUE7VUFDakQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxDQUFBO1VBRWpELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFOztjQUUvQixNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLG9CQUFvQixFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtjQUMxRSxTQUFTLENBQUMsT0FBTyxDQUFDLGNBQWMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFBOztjQUd6QyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7a0JBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsQ0FBQTs7Y0FHcEUsTUFBTSxVQUFVLEdBQUcsT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLE9BQU8sR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBOztjQUc3RSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtXQUM3QjtPQUNGO01BRUQsUUFBUSxDQUFFLENBQVMsRUFBRSxVQUFrQixFQUFFLE9BQWdCOztVQUV2RCxPQUFPLEdBQUcsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7VUFFMUMsTUFBTSxPQUFPLEdBQUc7Y0FDZCxLQUFLLEVBQUUsRUFBRTtjQUNULFVBQVUsRUFBRSxVQUFVO2NBQ3RCLGNBQWMsRUFBRSxLQUFLO1dBQ3RCLENBQUE7VUFFRCxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUU7Y0FDN0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtXQUMxRDs7VUFHRCxNQUFNLFFBQVEsR0FBR0MsV0FBd0IsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7O1VBRzNELElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztjQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtVQUM1RCxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUE7VUFDckMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBOztVQUduQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtVQUM3QyxTQUFTLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQTs7VUFHeEIsSUFBSSxXQUFXLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQTtVQUN6QyxJQUFJLE1BQU0sQ0FBQyxlQUFlLEVBQUU7Y0FBRSxXQUFXLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQTtXQUFFO1VBQ2pFLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFO2NBQ3hCLFdBQVcsSUFBSSxHQUFHLEdBQUdELGNBQTJCLENBQUMsT0FBTyxDQUFDLENBQUE7Y0FDekQsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQTtXQUNuRDtlQUFNO2NBQ0wsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQUMsQ0FBQTtXQUN0RDtVQUVELE1BQU0saUJBQWlCLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSx1QkFBdUIsRUFBRSxTQUFTLENBQUMsQ0FBQTtVQUMvRSxpQkFBaUIsQ0FBQyxTQUFTLEdBQUcsV0FBVyxDQUFBOztVQUd6QyxTQUFTLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO1VBQ3hDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQTs7VUFHakIsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSx5QkFBeUIsRUFBRSxTQUFTLENBQUMsQ0FBQTtVQUN2RSxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLDhCQUE4QixFQUFFLE9BQU8sQ0FBQyxDQUFBO1VBQzlFLE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxLQUFLLEVBQUUsNkJBQTZCLEVBQUUsT0FBTyxDQUFDLENBQUE7VUFFNUUsVUFBVSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRTtjQUNuQyxRQUFRLENBQUMsWUFBWSxFQUFFLENBQUE7Y0FDdkIsY0FBYyxFQUFFLENBQUE7V0FDakIsQ0FBQyxDQUFBO1VBRUYsV0FBVyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRTtjQUNwQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtjQUM1QixjQUFjLEVBQUUsQ0FBQTtXQUNqQixDQUFDLENBQUE7O1VBR0YsU0FBUyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDO2NBQ25DLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLGtCQUFrQixDQUFDLEVBQUU7O2tCQUVuRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUE7ZUFDNUI7V0FDRixDQUFDLENBQUE7T0FDSDtNQUVELGFBQWE7VUFDWCxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7Y0FDakIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztrQkFDdEIsSUFBSSxDQUFDLENBQUMsUUFBUTtzQkFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFBO2tCQUN2QyxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQTtrQkFDckIsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEdBQUcsY0FBYyxDQUFBO2VBQzdDLENBQUMsQ0FBQTtXQUNIO2VBQU07Y0FDTCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2tCQUN0QixJQUFJLENBQUMsQ0FBQyxRQUFRO3NCQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUE7a0JBQ3ZDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFBO2tCQUNwQixJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsR0FBRyxjQUFjLENBQUE7ZUFDN0MsQ0FBQyxDQUFBO1dBQ0g7T0FDRjs7Ozs7TUFNRCxlQUFlO1VBQ2IsT0FBTTtPQUNQOztNQUdELG1CQUFtQixDQUFFLGFBQXFCOztVQUV4QyxjQUFjLEVBQUUsQ0FBQTtVQUVoQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtVQUN6RCxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFnQixDQUFBOztVQUczRSxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1VBQ2xELElBQUksT0FBTyxLQUFLLElBQUk7Y0FBRSxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtVQUN4RCxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtVQUNsQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxXQUFXLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQTtVQUNqRixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxZQUFZLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQTtPQUNuRjtNQUVELFFBQVEsQ0FBRSxJQUFpQjtVQUN6QixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtVQUMvQixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7T0FDbkI7TUFFRCxZQUFZLENBQUUsTUFBbUIsRUFBRSxJQUFpQjtVQUNsRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7VUFDeEMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO09BQ25CO0dBQ0Y7RUFFRCxTQUFTLGNBQWMsQ0FBRSxDQUFTOzs7TUFHaEMsTUFBTSxNQUFNLEdBQ04sQ0FBQyxHQUFHLEVBQUUsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7WUFDbEMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUN6QyxNQUFNLENBQUMsWUFBWSxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUE7TUFDL0MsT0FBTyxNQUFNLENBQUE7RUFDZixDQUFDO0VBRUQsU0FBUyxjQUFjOztNQUVyQixRQUFRLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRTtVQUN2RCxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtPQUMzQixDQUFDLENBQUE7TUFDRixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFBO01BQ2xELElBQUksT0FBTyxLQUFLLElBQUksRUFBRTtVQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO09BQUU7O1VBQU0sTUFBTSxJQUFJLEtBQUssQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFBO0VBQzlIOztFQzdaQTtFQUNBO0VBQ0E7QUFDQTtFQUNBLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsRUFBRSxNQUFNO0VBQ3BELEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxXQUFXLEdBQUU7RUFDOUIsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUM7RUFDNUIsRUFBRSxFQUFFLENBQUMsWUFBWSxHQUFFO0VBQ25CLENBQUM7Ozs7OzsifQ==
