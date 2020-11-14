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
       * Given an option, find its UI element and update it according to the options ID
       * @param {*} option An element of this.optionsSpec or an option id
       */
      updateUIFromState(option) {
      }
      /**
       * Given an option, enable the UI elements if and only if all the boolean
       * options in option.enabledIf are true
       * @param option An element of this.optionsSpec or an option id
       */
      disableOrEnable(option) {
          if (typeof (option) === 'string') {
              option = this.optionsSpec.find(x => (isRealOption(x) && x.id === option));
              if (!option)
                  throw new Error(`no option with id '${option}'`);
          }
          if (!(isRealOption(option) && option.enabledIf))
              return;
          const enablerList = option.enabledIf.split("&"); //
          let enable = true; // will disable if just one of the elements of enablerList is false
          for (let i = 0; i < enablerList.length; i++) {
              let enablerId = enablerList[i];
              if (enablerId.startsWith('!')) {
                  enablerId = enablerId.slice(1);
              }
              if (typeof this.options[enablerId] !== 'boolean') {
                  throw new Error(`Invalid 'enabledIf': ${enablerId} is not a boolean option`);
              }
              const enablerValue = this.options[enablerId]; //!== negate // !== equivalent to XOR
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
                  const subOptionsElement = option.subOptionsSet.renderIn(column, "suboptions");
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
                  li.addEventListener('change', e => { this.updateStateFromUI(option); this.disableOrEnableAll(); });
                  option.element = li;
              }
          });
          element.append(list);
          this.disableOrEnableAll();
          return list;
      }
      renderWithTemplate(element) {
          // create appropriate object for mustache
          let options;
          this.optionsSpec.forEach(option => {
              if (isRealOption(option)) {
                  options[option.id] = option;
              }
          });
          let htmlString = this.template;
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
          var newx, newy;
          newx = Math.cos(angle) * this.x - Math.sin(angle) * this.y;
          newy = Math.sin(angle) * this.x + Math.cos(angle) * this.y;
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
          const defaults = {
              width: 300,
              height: 300
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
      let newAngles = smallAngles.concat(largeAngles) // combine together
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
              let subtypes = [];
              availableSubtypes.forEach(subtype => {
                  if (options[subtype]) {
                      subtypes.push(subtype);
                  }
              });
              const subtype = randElem(subtypes);
              // build options object
              let questionOptions;
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
          let questionOptions = {};
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
      constructor(base, height, showOpposites, areaProperties, perimeterProperties) {
          this.base = base;
          this.height = height;
          this.showOpposites = showOpposites;
          this._area = areaProperties;
          this._perimeter = perimeterProperties;
      }
      static random(options) {
          options.maxLength = options.maxLength || 20; // default values
          options.dp = options.dp || 0;
          const sides = {
              base: randBetween(1, options.maxLength),
              height: randBetween(1, options.maxLength)
          };
          const base = { val: sides.base, show: true, missing: false };
          const height = { val: sides.height, show: true, missing: false };
          let showOpposites;
          let areaProperties = {};
          let perimeterProperties = {};
          //selectively hide/missing depending on type
          switch (options.questionType) {
              case "area":
                  areaProperties.show = true;
                  areaProperties.missing = true;
                  showOpposites = !options.noDistractors;
                  break;
              case "perimeter":
                  perimeterProperties.show = true;
                  perimeterProperties.missing = true;
                  showOpposites = options.noDistractors;
                  break;
              case "reverseArea":
                  areaProperties.show = true;
                  areaProperties.missing = false;
                  randElem([base, height]).missing = true;
                  showOpposites = false;
                  break;
              case "reversePerimeter":
              default:
                  perimeterProperties.show = true;
                  perimeterProperties.missing = false;
                  randElem([base, height]).missing = true;
                  showOpposites = false;
                  break;
          }
          return new this(base, height, showOpposites, areaProperties, perimeterProperties);
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
          }
          return this._area;
      }
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
    const unitOA = Point.unitVector(O,A);
    const unitOC = Point.unitVector(O,C);
    const ctl1 = O.clone().translate(unitOA.x*size,unitOA.y*size);
    const ctl2 = ctl1.clone().translate(unitOC.x*size,unitOC.y*size);
    const ctl3 = O.clone().translate(unitOC.x*size,unitOC.y*size);
    ctx.moveTo(ctl1.x,ctl1.y);
    ctx.lineTo(ctl2.x,ctl2.y);
    ctx.lineTo(ctl3.x,ctl3.y);
  }

  class RectangleAreaView extends GraphicQView {
      constructor(A, B, C, D, labels, data, viewOptions) {
          /* Super does:
           *  Sets this.width and this.height
           *  Sets this.data
           *  Creates DOM elements, including canvas
           *  Creates empty this.labels list
           */
          super(data, viewOptions);
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
          var _a, _b, _c;
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
          let labels = [];
          const sides = [
              [A, B, data.height],
              [B, C, data.base],
          ];
          if (data.showOpposites) {
              sides.push([C, D, data.height]);
              sides.push([D, A, data.base]);
          }
          for (let i = 0, n = sides.length; i < n; i++) { //sides
              if (!sides[i][2].show)
                  continue;
              const offset = 20;
              let pos = Point.mean(sides[i][0], sides[i][1]);
              const unitvec = Point.unitVector(sides[i][0], sides[i][1]);
              pos.translate(-unitvec.y * offset, unitvec.x * offset);
              const texta = sides[i][2].val.toString() + "\\mathrm{cm}";
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
              const texta = data.area.val.toString() + "\\mathrm{cm}^2";
              const textq = data.area.missing ? "?" : texta;
              const styleq = "extra-info";
              const stylea = data.area.missing ? "extra-answer" : "extra-info";
              labels.push({
                  texta: "Area = " + texta,
                  textq: "Area = " + textq,
                  text: "Area = " + textq,
                  styleq: styleq,
                  stylea: stylea,
                  style: styleq,
                  pos: new Point(10, viewOptions.height - 10 - 15 * n_info),
              });
              n_info++;
          }
          if (data.perimeter.show) {
              const texta = data.perimeter.val.toString() + "\\mathrm{cm}";
              const textq = data.perimeter.missing ? "?" : texta;
              const styleq = "extra-info";
              const stylea = data.perimeter.missing ? "extra-answer" : "extra-info";
              labels.push({
                  pos: new Point(10, viewOptions.height - 10 - 20 * n_info),
                  texta: "Perimeter = " + texta,
                  textq: "Perimeter = " + textq,
                  text: "Perimeter = " + textq,
                  styleq: styleq,
                  stylea: stylea,
                  style: styleq,
              });
          }
          return new RectangleAreaView(A, B, C, D, labels, data, viewOptions);
      }
      render() {
          const ctx = this.canvas.getContext("2d");
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
          ctx.fillStyle = "LightGrey";
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
      constructor(data, view) {
          super();
          this.data = data;
          this.view = view;
      }
      static random(options, viewOptions) {
          const data = RectangleAreaData.random(options);
          const view = RectangleAreaView.fromData(data, viewOptions);
          return new this(data, view);
      }
      static get commandWord() {
          return 'Find the missing values';
      }
  }

  class AreaPerimeterQ extends Question {
      constructor(question) {
          super();
          this.question = question;
          this.DOM = question.DOM;
      }
      static random(options) {
          const questionOptions = {
              noDistractors: false,
              questionType: "area",
              dp: 0,
              maxLength: 20
          };
          const viewOptions = {
              height: 300,
              width: 300,
          };
          return RectangleAreaQ.random(questionOptions, viewOptions);
          /* More logic - to reinstate later
          const shape = randElem(options.shapes)
          let question : Question
          if (!options.custom) {
            return this.randomFromDifficulty(options.difficulty, shape, options.questionTypesSimple)
          } else {
            const questionType = randElem(options.questionTypesCustom)
            const questionOptions: QuestionOptions = {
              questionType: questionType,
              dp : 0,
              noDistractors : true
            }
            const viewOptions: ViewOptions = {}
            const question = RectangleAreaQ.random(questionOptions,viewOptions)
            return new this(question)
          }
          */
      }
      static randomFromDifficulty(difficulty, shape, questionTypes) {
          const questionOptions = {
              questionType: randElem(questionTypes),
              dp: 0,
              noDistractors: true
          };
          const viewOptions = {};
          const question = RectangleAreaQ.random(questionOptions, viewOptions);
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
                      { id: 'rectangle', title: 'Rectangle' }
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
              if (hasOptions(topicId)) {
                  const optionsButton = createElem('div', 'icon-button extra-options-button', li);
                  this._buildTopicOptions(li.dataset.optionId, optionsButton);
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
          let commandWord = getClass(this.topics[0]).commandWord;
          let useCommandWord = true; // true if shared command word
          // cycle through rest of topics, reset command word if they don't match
          for (let i = 1; i < this.topics.length; i++) {
              if (getClass(this.topics[i]).commandWord !== commandWord) {
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
              container.dataset.question_index = i + ""; // not sure this is actually needed
              // Add container link to object in questions list
              if (!this.questions[i])
                  this.questions[i] = {};
              this.questions[i].container = container;
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
                  this.showQuestionActions(e, i);
              }
          });
      }
      toggleAnswers() {
          if (this.answered) {
              this.questions.forEach(q => {
                  q.question.hideAnswer();
                  this.answered = false;
                  this.answerButton.innerHTML = 'Show answers';
              });
          }
          else {
              this.questions.forEach(q => {
                  q.question.showAnswer();
                  this.answered = true;
                  this.answerButton.innerHTML = 'Hide answers';
              });
          }
      }
      /**
       * Scans for widest question and then sets the grid width to that
       */
      adjustGridWidth() {
      }
      showQuestionActions(event, questionIndex) {
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
      var letter = i < 26 ? String.fromCharCode(0x61 + i)
          : i < 52 ? String.fromCharCode(0x41 + i - 26)
              : String.fromCharCode(0x3B1 + i - 52);
      return letter;
  }
  function hideAllActions() {
      // hide all question actions
      document.querySelectorAll('.question-actions').forEach(el => {
          el.classList.add('hidden');
      });
      document.querySelector('.overlay').classList.add('hidden');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vbW9kdWxlcy92ZW5kb3IvcnNsaWRlci5qcyIsIi4uL21vZHVsZXMvdXRpbGl0aWVzLmpzIiwiLi4vLi4vbW9kdWxlcy9PcHRpb25zU2V0LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9RdWVzdGlvbi50cyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGV4dFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FsZ2VicmFpY0ZyYWN0aW9uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvSW50ZWdlckFkZC5qcyIsIi4uLy4uL21vZHVsZXMvUG9pbnQudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRLnRzIiwiLi4vbW9kdWxlcy92ZW5kb3IvZnJhY3Rpb24uanMiLCIuLi9tb2R1bGVzL01vbm9taWFsLmpzIiwiLi4vbW9kdWxlcy9Qb2x5bm9taWFsLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9Bcml0aG1hZ29uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGVzdFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FkZEFaZXJvLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9UZXh0US9FcXVhdGlvbk9mTGluZS5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEudHMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUS5qcyIsIi4uL21vZHVsZXMvTGluRXhwci5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9zb2x2ZUFuZ2xlcy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dvcmRlZFEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dyYXBwZXIudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvUmVjdGFuZ2xlQXJlYURhdGEudHMiLCIuLi9tb2R1bGVzL2RyYXdpbmcuanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvUmVjdGFuZ2xlQXJlYVZpZXcudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvUmVjdGFuZ2xlQXJlYVEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0FyZWFQZXJpbWV0ZXIvQXJlYVdyYXBwZXIudHMiLCIuLi9tb2R1bGVzL1RvcGljQ2hvb3Nlci5qcyIsIi4uL25vZGVfbW9kdWxlcy90aW5nbGUuanMvZGlzdC90aW5nbGUubWluLmpzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvblNldC50cyIsIi4uL21haW4uanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogUnNsaWRlci4gRG93bmxvYWRlZCBmcm9tIGh0dHBzOi8vc2xhd29taXItemF6aWFibG8uZ2l0aHViLmlvL3JhbmdlLXNsaWRlci9cbiAqIE1vZGlmaWVkIHRvIG1ha2UgaW50byBFUzYgbW9kdWxlIGFuZCBmaXggYSBmZXcgYnVnc1xuICovXG5cbnZhciBSUyA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIHRoaXMuaW5wdXQgPSBudWxsXG4gIHRoaXMuaW5wdXREaXNwbGF5ID0gbnVsbFxuICB0aGlzLnNsaWRlciA9IG51bGxcbiAgdGhpcy5zbGlkZXJXaWR0aCA9IDBcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gMFxuICB0aGlzLnBvaW50ZXJXaWR0aCA9IDBcbiAgdGhpcy5wb2ludGVyUiA9IG51bGxcbiAgdGhpcy5wb2ludGVyTCA9IG51bGxcbiAgdGhpcy5hY3RpdmVQb2ludGVyID0gbnVsbFxuICB0aGlzLnNlbGVjdGVkID0gbnVsbFxuICB0aGlzLnNjYWxlID0gbnVsbFxuICB0aGlzLnN0ZXAgPSAwXG4gIHRoaXMudGlwTCA9IG51bGxcbiAgdGhpcy50aXBSID0gbnVsbFxuICB0aGlzLnRpbWVvdXQgPSBudWxsXG4gIHRoaXMudmFsUmFuZ2UgPSBmYWxzZVxuXG4gIHRoaXMudmFsdWVzID0ge1xuICAgIHN0YXJ0OiBudWxsLFxuICAgIGVuZDogbnVsbFxuICB9XG4gIHRoaXMuY29uZiA9IHtcbiAgICB0YXJnZXQ6IG51bGwsXG4gICAgdmFsdWVzOiBudWxsLFxuICAgIHNldDogbnVsbCxcbiAgICByYW5nZTogZmFsc2UsXG4gICAgd2lkdGg6IG51bGwsXG4gICAgc2NhbGU6IHRydWUsXG4gICAgbGFiZWxzOiB0cnVlLFxuICAgIHRvb2x0aXA6IHRydWUsXG4gICAgc3RlcDogbnVsbCxcbiAgICBkaXNhYmxlZDogZmFsc2UsXG4gICAgb25DaGFuZ2U6IG51bGxcbiAgfVxuXG4gIHRoaXMuY2xzID0ge1xuICAgIGNvbnRhaW5lcjogJ3JzLWNvbnRhaW5lcicsXG4gICAgYmFja2dyb3VuZDogJ3JzLWJnJyxcbiAgICBzZWxlY3RlZDogJ3JzLXNlbGVjdGVkJyxcbiAgICBwb2ludGVyOiAncnMtcG9pbnRlcicsXG4gICAgc2NhbGU6ICdycy1zY2FsZScsXG4gICAgbm9zY2FsZTogJ3JzLW5vc2NhbGUnLFxuICAgIHRpcDogJ3JzLXRvb2x0aXAnXG4gIH1cblxuICBmb3IgKHZhciBpIGluIHRoaXMuY29uZikgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbmYsIGkpKSB0aGlzLmNvbmZbaV0gPSBjb25mW2ldIH1cblxuICB0aGlzLmluaXQoKVxufVxuXG5SUy5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHR5cGVvZiB0aGlzLmNvbmYudGFyZ2V0ID09PSAnb2JqZWN0JykgdGhpcy5pbnB1dCA9IHRoaXMuY29uZi50YXJnZXRcbiAgZWxzZSB0aGlzLmlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5jb25mLnRhcmdldC5yZXBsYWNlKCcjJywgJycpKVxuXG4gIGlmICghdGhpcy5pbnB1dCkgcmV0dXJuIGNvbnNvbGUubG9nKCdDYW5ub3QgZmluZCB0YXJnZXQgZWxlbWVudC4uLicpXG5cbiAgdGhpcy5pbnB1dERpc3BsYXkgPSBnZXRDb21wdXRlZFN0eWxlKHRoaXMuaW5wdXQsIG51bGwpLmRpc3BsYXlcbiAgdGhpcy5pbnB1dC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG4gIHRoaXMudmFsUmFuZ2UgPSAhKHRoaXMuY29uZi52YWx1ZXMgaW5zdGFuY2VvZiBBcnJheSlcblxuICBpZiAodGhpcy52YWxSYW5nZSkge1xuICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuY29uZi52YWx1ZXMsICdtaW4nKSB8fCAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuY29uZi52YWx1ZXMsICdtYXgnKSkgeyByZXR1cm4gY29uc29sZS5sb2coJ01pc3NpbmcgbWluIG9yIG1heCB2YWx1ZS4uLicpIH1cbiAgfVxuICByZXR1cm4gdGhpcy5jcmVhdGVTbGlkZXIoKVxufVxuXG5SUy5wcm90b3R5cGUuY3JlYXRlU2xpZGVyID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNsaWRlciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLmNvbnRhaW5lcilcbiAgdGhpcy5zbGlkZXIuaW5uZXJIVE1MID0gJzxkaXYgY2xhc3M9XCJycy1iZ1wiPjwvZGl2PidcbiAgdGhpcy5zZWxlY3RlZCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnNlbGVjdGVkKVxuICB0aGlzLnBvaW50ZXJMID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMucG9pbnRlciwgWydkaXInLCAnbGVmdCddKVxuICB0aGlzLnNjYWxlID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMuc2NhbGUpXG5cbiAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7XG4gICAgdGhpcy50aXBMID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMudGlwKVxuICAgIHRoaXMudGlwUiA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnRpcClcbiAgICB0aGlzLnBvaW50ZXJMLmFwcGVuZENoaWxkKHRoaXMudGlwTClcbiAgfVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnNlbGVjdGVkKVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnNjYWxlKVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnBvaW50ZXJMKVxuXG4gIGlmICh0aGlzLmNvbmYucmFuZ2UpIHtcbiAgICB0aGlzLnBvaW50ZXJSID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMucG9pbnRlciwgWydkaXInLCAncmlnaHQnXSlcbiAgICBpZiAodGhpcy5jb25mLnRvb2x0aXApIHRoaXMucG9pbnRlclIuYXBwZW5kQ2hpbGQodGhpcy50aXBSKVxuICAgIHRoaXMuc2xpZGVyLmFwcGVuZENoaWxkKHRoaXMucG9pbnRlclIpXG4gIH1cblxuICB0aGlzLmlucHV0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuc2xpZGVyLCB0aGlzLmlucHV0Lm5leHRTaWJsaW5nKVxuXG4gIGlmICh0aGlzLmNvbmYud2lkdGgpIHRoaXMuc2xpZGVyLnN0eWxlLndpZHRoID0gcGFyc2VJbnQodGhpcy5jb25mLndpZHRoKSArICdweCdcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gdGhpcy5zbGlkZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdFxuICB0aGlzLnNsaWRlcldpZHRoID0gdGhpcy5zbGlkZXIuY2xpZW50V2lkdGhcbiAgdGhpcy5wb2ludGVyV2lkdGggPSB0aGlzLnBvaW50ZXJMLmNsaWVudFdpZHRoXG5cbiAgaWYgKCF0aGlzLmNvbmYuc2NhbGUpIHRoaXMuc2xpZGVyLmNsYXNzTGlzdC5hZGQodGhpcy5jbHMubm9zY2FsZSlcblxuICByZXR1cm4gdGhpcy5zZXRJbml0aWFsVmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLnNldEluaXRpYWxWYWx1ZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZGlzYWJsZWQodGhpcy5jb25mLmRpc2FibGVkKVxuXG4gIGlmICh0aGlzLnZhbFJhbmdlKSB0aGlzLmNvbmYudmFsdWVzID0gcHJlcGFyZUFycmF5VmFsdWVzKHRoaXMuY29uZilcblxuICB0aGlzLnZhbHVlcy5zdGFydCA9IDBcbiAgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnJhbmdlID8gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxIDogMFxuXG4gIGlmICh0aGlzLmNvbmYuc2V0ICYmIHRoaXMuY29uZi5zZXQubGVuZ3RoICYmIGNoZWNrSW5pdGlhbCh0aGlzLmNvbmYpKSB7XG4gICAgdmFyIHZhbHMgPSB0aGlzLmNvbmYuc2V0XG5cbiAgICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgICB0aGlzLnZhbHVlcy5zdGFydCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzBdKVxuICAgICAgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnNldFsxXSA/IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzFdKSA6IG51bGxcbiAgICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHZhbHNbMF0pXG4gIH1cbiAgcmV0dXJuIHRoaXMuY3JlYXRlU2NhbGUoKVxufVxuXG5SUy5wcm90b3R5cGUuY3JlYXRlU2NhbGUgPSBmdW5jdGlvbiAocmVzaXplKSB7XG4gIHRoaXMuc3RlcCA9IHRoaXMuc2xpZGVyV2lkdGggLyAodGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHtcbiAgICB2YXIgc3BhbiA9IGNyZWF0ZUVsZW1lbnQoJ3NwYW4nKVxuICAgIHZhciBpbnMgPSBjcmVhdGVFbGVtZW50KCdpbnMnKVxuXG4gICAgc3Bhbi5hcHBlbmRDaGlsZChpbnMpXG4gICAgdGhpcy5zY2FsZS5hcHBlbmRDaGlsZChzcGFuKVxuXG4gICAgc3Bhbi5zdHlsZS53aWR0aCA9IGkgPT09IGlMZW4gLSAxID8gMCA6IHRoaXMuc3RlcCArICdweCdcblxuICAgIGlmICghdGhpcy5jb25mLmxhYmVscykge1xuICAgICAgaWYgKGkgPT09IDAgfHwgaSA9PT0gaUxlbiAtIDEpIGlucy5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW2ldXG4gICAgfSBlbHNlIGlucy5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW2ldXG5cbiAgICBpbnMuc3R5bGUubWFyZ2luTGVmdCA9IChpbnMuY2xpZW50V2lkdGggLyAyKSAqIC0xICsgJ3B4J1xuICB9XG4gIHJldHVybiB0aGlzLmFkZEV2ZW50cygpXG59XG5cblJTLnByb3RvdHlwZS51cGRhdGVTY2FsZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zdGVwID0gdGhpcy5zbGlkZXJXaWR0aCAvICh0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpXG5cbiAgdmFyIHBpZWNlcyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NwYW4nKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gcGllY2VzLmxlbmd0aDsgaSA8IGlMZW4gLSAxOyBpKyspIHsgcGllY2VzW2ldLnN0eWxlLndpZHRoID0gdGhpcy5zdGVwICsgJ3B4JyB9XG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLmFkZEV2ZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHBvaW50ZXJzID0gdGhpcy5zbGlkZXIucXVlcnlTZWxlY3RvckFsbCgnLicgKyB0aGlzLmNscy5wb2ludGVyKVxuICB2YXIgcGllY2VzID0gdGhpcy5zbGlkZXIucXVlcnlTZWxlY3RvckFsbCgnc3BhbicpXG5cbiAgY3JlYXRlRXZlbnRzKGRvY3VtZW50LCAnbW91c2Vtb3ZlIHRvdWNobW92ZScsIHRoaXMubW92ZS5iaW5kKHRoaXMpKVxuICBjcmVhdGVFdmVudHMoZG9jdW1lbnQsICdtb3VzZXVwIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgdGhpcy5kcm9wLmJpbmQodGhpcykpXG5cbiAgZm9yIChsZXQgaSA9IDAsIGlMZW4gPSBwb2ludGVycy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgY3JlYXRlRXZlbnRzKHBvaW50ZXJzW2ldLCAnbW91c2Vkb3duIHRvdWNoc3RhcnQnLCB0aGlzLmRyYWcuYmluZCh0aGlzKSkgfVxuXG4gIGZvciAobGV0IGkgPSAwLCBpTGVuID0gcGllY2VzLmxlbmd0aDsgaSA8IGlMZW47IGkrKykgeyBjcmVhdGVFdmVudHMocGllY2VzW2ldLCAnY2xpY2snLCB0aGlzLm9uQ2xpY2tQaWVjZS5iaW5kKHRoaXMpKSB9XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMub25SZXNpemUuYmluZCh0aGlzKSlcblxuICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxufVxuXG5SUy5wcm90b3R5cGUuZHJhZyA9IGZ1bmN0aW9uIChlKSB7XG4gIGUucHJldmVudERlZmF1bHQoKVxuXG4gIGlmICh0aGlzLmNvbmYuZGlzYWJsZWQpIHJldHVyblxuXG4gIHZhciBkaXIgPSBlLnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtZGlyJylcbiAgaWYgKGRpciA9PT0gJ2xlZnQnKSB0aGlzLmFjdGl2ZVBvaW50ZXIgPSB0aGlzLnBvaW50ZXJMXG4gIGlmIChkaXIgPT09ICdyaWdodCcpIHRoaXMuYWN0aXZlUG9pbnRlciA9IHRoaXMucG9pbnRlclJcblxuICByZXR1cm4gdGhpcy5zbGlkZXIuY2xhc3NMaXN0LmFkZCgnc2xpZGluZycpXG59XG5cblJTLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24gKGUpIHtcbiAgaWYgKHRoaXMuYWN0aXZlUG9pbnRlciAmJiAhdGhpcy5jb25mLmRpc2FibGVkKSB7XG4gICAgdmFyIGNvb3JkWCA9IGUudHlwZSA9PT0gJ3RvdWNobW92ZScgPyBlLnRvdWNoZXNbMF0uY2xpZW50WCA6IGUucGFnZVhcbiAgICB2YXIgaW5kZXggPSBjb29yZFggLSB0aGlzLnNsaWRlckxlZnQgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKVxuXG4gICAgaW5kZXggPSBNYXRoLnJvdW5kKGluZGV4IC8gdGhpcy5zdGVwKVxuXG4gICAgaWYgKGluZGV4IDw9IDApIGluZGV4ID0gMFxuICAgIGlmIChpbmRleCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgaW5kZXggPSB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDFcblxuICAgIGlmICh0aGlzLmNvbmYucmFuZ2UpIHtcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgPT09IHRoaXMucG9pbnRlckwpIHRoaXMudmFsdWVzLnN0YXJ0ID0gaW5kZXhcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgPT09IHRoaXMucG9pbnRlclIpIHRoaXMudmFsdWVzLmVuZCA9IGluZGV4XG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IGluZGV4XG5cbiAgICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxuICB9XG59XG5cblJTLnByb3RvdHlwZS5kcm9wID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmFjdGl2ZVBvaW50ZXIgPSBudWxsXG59XG5cblJTLnByb3RvdHlwZS5zZXRWYWx1ZXMgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICB2YXIgYWN0aXZlUG9pbnRlciA9IHRoaXMuY29uZi5yYW5nZSA/ICdzdGFydCcgOiAnZW5kJ1xuXG4gIGlmIChzdGFydCAmJiB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2Yoc3RhcnQpID4gLTEpIHsgdGhpcy52YWx1ZXNbYWN0aXZlUG9pbnRlcl0gPSB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2Yoc3RhcnQpIH1cblxuICBpZiAoZW5kICYmIHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZihlbmQpID4gLTEpIHsgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKGVuZCkgfVxuXG4gIGlmICh0aGlzLmNvbmYucmFuZ2UgJiYgdGhpcy52YWx1ZXMuc3RhcnQgPiB0aGlzLnZhbHVlcy5lbmQpIHsgdGhpcy52YWx1ZXMuc3RhcnQgPSB0aGlzLnZhbHVlcy5lbmQgfVxuXG4gIHRoaXMucG9pbnRlckwuc3R5bGUubGVmdCA9ICh0aGlzLnZhbHVlc1thY3RpdmVQb2ludGVyXSAqIHRoaXMuc3RlcCAtICh0aGlzLnBvaW50ZXJXaWR0aCAvIDIpKSArICdweCdcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7XG4gICAgICB0aGlzLnRpcEwuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5zdGFydF1cbiAgICAgIHRoaXMudGlwUi5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1cbiAgICB9XG4gICAgdGhpcy5pbnB1dC52YWx1ZSA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdICsgJywnICsgdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG4gICAgdGhpcy5wb2ludGVyUi5zdHlsZS5sZWZ0ID0gKHRoaXMudmFsdWVzLmVuZCAqIHRoaXMuc3RlcCAtICh0aGlzLnBvaW50ZXJXaWR0aCAvIDIpKSArICdweCdcbiAgfSBlbHNlIHtcbiAgICBpZiAodGhpcy5jb25mLnRvb2x0aXApIHsgdGhpcy50aXBMLmlubmVySFRNTCA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXSB9XG4gICAgdGhpcy5pbnB1dC52YWx1ZSA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxuICB9XG5cbiAgaWYgKHRoaXMudmFsdWVzLmVuZCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG4gIGlmICh0aGlzLnZhbHVlcy5zdGFydCA8IDApIHRoaXMudmFsdWVzLnN0YXJ0ID0gMFxuXG4gIHRoaXMuc2VsZWN0ZWQuc3R5bGUud2lkdGggPSAodGhpcy52YWx1ZXMuZW5kIC0gdGhpcy52YWx1ZXMuc3RhcnQpICogdGhpcy5zdGVwICsgJ3B4J1xuICB0aGlzLnNlbGVjdGVkLnN0eWxlLmxlZnQgPSB0aGlzLnZhbHVlcy5zdGFydCAqIHRoaXMuc3RlcCArICdweCdcblxuICByZXR1cm4gdGhpcy5vbkNoYW5nZSgpXG59XG5cblJTLnByb3RvdHlwZS5vbkNsaWNrUGllY2UgPSBmdW5jdGlvbiAoZSkge1xuICBpZiAodGhpcy5jb25mLmRpc2FibGVkKSByZXR1cm5cblxuICB2YXIgaWR4ID0gTWF0aC5yb3VuZCgoZS5jbGllbnRYIC0gdGhpcy5zbGlkZXJMZWZ0KSAvIHRoaXMuc3RlcClcblxuICBpZiAoaWR4ID4gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKSBpZHggPSB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDFcbiAgaWYgKGlkeCA8IDApIGlkeCA9IDBcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgaWYgKGlkeCAtIHRoaXMudmFsdWVzLnN0YXJ0IDw9IHRoaXMudmFsdWVzLmVuZCAtIGlkeCkge1xuICAgICAgdGhpcy52YWx1ZXMuc3RhcnQgPSBpZHhcbiAgICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gaWR4XG4gIH0gZWxzZSB0aGlzLnZhbHVlcy5lbmQgPSBpZHhcblxuICB0aGlzLnNsaWRlci5jbGFzc0xpc3QucmVtb3ZlKCdzbGlkaW5nJylcblxuICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxufVxuXG5SUy5wcm90b3R5cGUub25DaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBfdGhpcyA9IHRoaXNcblxuICBpZiAodGhpcy50aW1lb3V0KSBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0KVxuXG4gIHRoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIGlmIChfdGhpcy5jb25mLm9uQ2hhbmdlICYmIHR5cGVvZiBfdGhpcy5jb25mLm9uQ2hhbmdlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gX3RoaXMuY29uZi5vbkNoYW5nZShfdGhpcy5pbnB1dC52YWx1ZSlcbiAgICB9XG4gIH0sIDUwMClcbn1cblxuUlMucHJvdG90eXBlLm9uUmVzaXplID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNsaWRlckxlZnQgPSB0aGlzLnNsaWRlci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0XG4gIHRoaXMuc2xpZGVyV2lkdGggPSB0aGlzLnNsaWRlci5jbGllbnRXaWR0aFxuICByZXR1cm4gdGhpcy51cGRhdGVTY2FsZSgpXG59XG5cblJTLnByb3RvdHlwZS5kaXNhYmxlZCA9IGZ1bmN0aW9uIChkaXNhYmxlZCkge1xuICB0aGlzLmNvbmYuZGlzYWJsZWQgPSBkaXNhYmxlZFxuICB0aGlzLnNsaWRlci5jbGFzc0xpc3RbZGlzYWJsZWQgPyAnYWRkJyA6ICdyZW1vdmUnXSgnZGlzYWJsZWQnKVxufVxuXG5SUy5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIFJldHVybiBsaXN0IG9mIG51bWJlcnMsIHJhdGhlciB0aGFuIGEgc3RyaW5nLCB3aGljaCB3b3VsZCBqdXN0IGJlIHNpbGx5XG4gIC8vICByZXR1cm4gdGhpcy5pbnB1dC52YWx1ZVxuICByZXR1cm4gW3RoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdLCB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1dXG59XG5cblJTLnByb3RvdHlwZS5nZXRWYWx1ZUwgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIEdldCBsZWZ0IChpLmUuIHNtYWxsZXN0KSB2YWx1ZVxuICByZXR1cm4gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5zdGFydF1cbn1cblxuUlMucHJvdG90eXBlLmdldFZhbHVlUiA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gR2V0IHJpZ2h0IChpLmUuIHNtYWxsZXN0KSB2YWx1ZVxuICByZXR1cm4gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG59XG5cblJTLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmlucHV0LnN0eWxlLmRpc3BsYXkgPSB0aGlzLmlucHV0RGlzcGxheVxuICB0aGlzLnNsaWRlci5yZW1vdmUoKVxufVxuXG52YXIgY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uIChlbCwgY2xzLCBkYXRhQXR0cikge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZWwpXG4gIGlmIChjbHMpIGVsZW1lbnQuY2xhc3NOYW1lID0gY2xzXG4gIGlmIChkYXRhQXR0ciAmJiBkYXRhQXR0ci5sZW5ndGggPT09IDIpIHsgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2RhdGEtJyArIGRhdGFBdHRyWzBdLCBkYXRhQXR0clsxXSkgfVxuXG4gIHJldHVybiBlbGVtZW50XG59XG5cbnZhciBjcmVhdGVFdmVudHMgPSBmdW5jdGlvbiAoZWwsIGV2LCBjYWxsYmFjaykge1xuICB2YXIgZXZlbnRzID0gZXYuc3BsaXQoJyAnKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gZXZlbnRzLmxlbmd0aDsgaSA8IGlMZW47IGkrKykgeyBlbC5hZGRFdmVudExpc3RlbmVyKGV2ZW50c1tpXSwgY2FsbGJhY2spIH1cbn1cblxudmFyIHByZXBhcmVBcnJheVZhbHVlcyA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIHZhciB2YWx1ZXMgPSBbXVxuICB2YXIgcmFuZ2UgPSBjb25mLnZhbHVlcy5tYXggLSBjb25mLnZhbHVlcy5taW5cblxuICBpZiAoIWNvbmYuc3RlcCkge1xuICAgIGNvbnNvbGUubG9nKCdObyBzdGVwIGRlZmluZWQuLi4nKVxuICAgIHJldHVybiBbY29uZi52YWx1ZXMubWluLCBjb25mLnZhbHVlcy5tYXhdXG4gIH1cblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IChyYW5nZSAvIGNvbmYuc3RlcCk7IGkgPCBpTGVuOyBpKyspIHsgdmFsdWVzLnB1c2goY29uZi52YWx1ZXMubWluICsgaSAqIGNvbmYuc3RlcCkgfVxuXG4gIGlmICh2YWx1ZXMuaW5kZXhPZihjb25mLnZhbHVlcy5tYXgpIDwgMCkgdmFsdWVzLnB1c2goY29uZi52YWx1ZXMubWF4KVxuXG4gIHJldHVybiB2YWx1ZXNcbn1cblxudmFyIGNoZWNrSW5pdGlhbCA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIGlmICghY29uZi5zZXQgfHwgY29uZi5zZXQubGVuZ3RoIDwgMSkgcmV0dXJuIG51bGxcbiAgaWYgKGNvbmYudmFsdWVzLmluZGV4T2YoY29uZi5zZXRbMF0pIDwgMCkgcmV0dXJuIG51bGxcblxuICBpZiAoY29uZi5yYW5nZSkge1xuICAgIGlmIChjb25mLnNldC5sZW5ndGggPCAyIHx8IGNvbmYudmFsdWVzLmluZGV4T2YoY29uZi5zZXRbMV0pIDwgMCkgcmV0dXJuIG51bGxcbiAgfVxuICByZXR1cm4gdHJ1ZVxufVxuXG5leHBvcnQgZGVmYXVsdCBSU1xuIiwiLyogUk5HcyAvIHNlbGVjdG9ycyAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdhdXNzaWFuIChuKSB7XG4gIGxldCBybnVtID0gMFxuICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgIHJudW0gKz0gTWF0aC5yYW5kb20oKVxuICB9XG4gIHJldHVybiBybnVtIC8gblxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZEJldHdlZW4gKG4sIG0sIGRpc3QpIHtcbiAgLy8gcmV0dXJuIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBuIGFuZCBtIGluY2x1c2l2ZVxuICAvLyBkaXN0IChvcHRpb25hbCkgaXMgYSBmdW5jdGlvbiByZXR1cm5pbmcgYSB2YWx1ZSBpbiBbMCwxKVxuICAvLyBkZWZhdWx0IGlzIHNsaWdodGx5IGJpYXNlZCB0b3dhcmRzIG1pZGRsZVxuICBpZiAoIWRpc3QpIGRpc3QgPSBNYXRoLnJhbmRvbVxuICByZXR1cm4gbiArIE1hdGguZmxvb3IoZGlzdCgpICogKG0gLSBuICsgMSkpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kQmV0d2VlbkZpbHRlciAobiwgbSwgZmlsdGVyKSB7XG4gIC8qIHJldHVybnMgYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIG4gYW5kIG0gaW5jbHVzaXZlIHdoaWNoIHNhdGlzZmllcyB0aGUgZmlsdGVyXG4gIC8gIG4sIG06IGludGVnZXJcbiAgLyAgZmlsdGVyOiBJbnQtPiBCb29sXG4gICovXG4gIGNvbnN0IGFyciA9IFtdXG4gIGZvciAobGV0IGkgPSBuOyBpIDwgbSArIDE7IGkrKykge1xuICAgIGlmIChmaWx0ZXIoaSkpIGFyci5wdXNoKGkpXG4gIH1cbiAgaWYgKGFyciA9PT0gW10pIHRocm93IG5ldyBFcnJvcignb3ZlcmZpbHRlcmVkJylcbiAgY29uc3QgaSA9IHJhbmRCZXR3ZWVuKDAsIGFyci5sZW5ndGggLSAxKVxuICByZXR1cm4gYXJyW2ldXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kTXVsdEJldHdlZW4gKG1pbiwgbWF4LCBuKSB7XG4gIC8vIHJldHVybiBhIHJhbmRvbSBtdWx0aXBsZSBvZiBuIGJldHdlZW4gbiBhbmQgbSAoaW5jbHVzaXZlIGlmIHBvc3NpYmxlKVxuICBtaW4gPSBNYXRoLmNlaWwobWluIC8gbikgKiBuXG4gIG1heCA9IE1hdGguZmxvb3IobWF4IC8gbikgKiBuIC8vIGNvdWxkIGNoZWNrIGRpdmlzaWJpbGl0eSBmaXJzdCB0byBtYXhpbWlzZSBwZXJmb3JtYWNlLCBidXQgSSdtIHN1cmUgdGhlIGhpdCBpc24ndCBiYWRcblxuICByZXR1cm4gcmFuZEJldHdlZW4obWluIC8gbiwgbWF4IC8gbikgKiBuXG59XG5cbi8qKlxuICogUmV0dXJucyBhIHJhbmRvbSBlbGVtZW50IG9mIGFuIGFycmF5XG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtUW119IGFycmF5IEFuIGFycmF5IG9mIG9iamVjdHNcbiAqIEBwYXJhbSB7KCk9Pm51bWJlcn0gW2Rpc3RdIEEgZGlzdHJpYnV0aW9uIGZ1bmN0aW9uIGZvciB3ZWlnaHRpbmcsIHJldHVybmluZyBhIG51bWJlciBiZXR3ZWVuIDAgYW5kIDEuIERlZmF1bHQgaXMgTWF0aC5yYW5kb21cbiAqIEByZXR1cm5zIHtUfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZEVsZW0gKGFycmF5LCBkaXN0KSB7XG4gIGlmIChbLi4uYXJyYXldLmxlbmd0aCA9PT0gMCkgdGhyb3cgbmV3IEVycm9yKCdlbXB0eSBhcnJheScpXG4gIGlmICghZGlzdCkgZGlzdCA9IE1hdGgucmFuZG9tXG4gIGNvbnN0IG4gPSBhcnJheS5sZW5ndGggfHwgYXJyYXkuc2l6ZVxuICBjb25zdCBpID0gcmFuZEJldHdlZW4oMCwgbiAtIDEsIGRpc3QpXG4gIHJldHVybiBbLi4uYXJyYXldW2ldXG59XG5cbi8qIE1hdGhzICovXG5leHBvcnQgZnVuY3Rpb24gcm91bmRUb1RlbiAobikge1xuICByZXR1cm4gTWF0aC5yb3VuZChuIC8gMTApICogMTBcbn1cblxuLyoqXG4gKiBSb3VuZHMgYSBudW1iZXIgdG8gYSBnaXZlbiBudW1iZXIgb2YgZGVjaW1hbCBwbGFjZXNcbiAqIEBwYXJhbSB7bnVtYmVyfSB4IFRoZSBudW1iZXIgdG8gcm91bmRcbiAqIEBwYXJhbSB7bnVtYmVyfSBuIFRoZSBudW1iZXIgb2YgZGVjaW1hbCBwbGFjZXNcbiAqIEByZXR1cm5zIHtudW1iZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByb3VuZERQICh4LCBuKSB7XG4gIHJldHVybiBNYXRoLnJvdW5kKHggKiBNYXRoLnBvdygxMCwgbikpIC8gTWF0aC5wb3coMTAsIG4pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWdUb1JhZCAoeCkge1xuICByZXR1cm4geCAqIE1hdGguUEkgLyAxODBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNpbkRlZyAoeCkge1xuICByZXR1cm4gTWF0aC5zaW4oeCAqIE1hdGguUEkgLyAxODApXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb3NEZWcgKHgpIHtcbiAgcmV0dXJuIE1hdGguY29zKHggKiBNYXRoLlBJIC8gMTgwKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2NhbGVkU3RyIChuLCBkcCkge1xuICAvLyByZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGluZyBuLzEwXmRwXG4gIC8vIGUuZy4gc2NhbGVkU3RyKDM0LDEpPVwiMy40XCJcbiAgLy8gc2NhbGVkU3RyKDMxNCwyKT1cIjMuMTRcIlxuICAvLyBzY2FsZWRTdHIoMzAsMSk9XCIzXCJcbiAgLy8gVHJ5aW5nIHRvIGF2b2lkIHByZWNpc2lvbiBlcnJvcnMhXG4gIGlmIChkcCA9PT0gMCkgcmV0dXJuIG5cbiAgY29uc3QgZmFjdG9yID0gTWF0aC5wb3coMTAsIGRwKVxuICBjb25zdCBpbnRwYXJ0ID0gTWF0aC5mbG9vcihuIC8gZmFjdG9yKVxuICBjb25zdCBkZWNwYXJ0ID0gbiAlIGZhY3RvclxuICBpZiAoZGVjcGFydCA9PT0gMCkge1xuICAgIHJldHVybiBpbnRwYXJ0XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGludHBhcnQgKyAnLicgKyBkZWNwYXJ0XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdjZCAoYSwgYikge1xuICAvLyB0YWtlbiBmcm9tIGZyYWN0aW9uLmpzXG4gIGlmICghYSkgeyByZXR1cm4gYiB9XG4gIGlmICghYikgeyByZXR1cm4gYSB9XG5cbiAgd2hpbGUgKDEpIHtcbiAgICBhICU9IGJcbiAgICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICAgIGIgJT0gYVxuICAgIGlmICghYikgeyByZXR1cm4gYSB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxjbSAoYSwgYikge1xuICByZXR1cm4gYSAqIGIgLyBnY2QoYSwgYilcbn1cblxuLyogQXJyYXlzIGFuZCBzaW1pbGFyICovXG5cbi8qKlxuICogU29ydHMgdHdvIGFycmF5cyB0b2dldGhlciBiYXNlZCBvbiBzb3J0aW5nIGFycjBcbiAqIEBwYXJhbSB7KltdfSBhcnIwXG4gKiBAcGFyYW0geypbXX0gYXJyMVxuICogQHBhcmFtIHsqfSBmXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzb3J0VG9nZXRoZXIgKGFycjAsIGFycjEsIGYpIHtcbiAgaWYgKGFycjAubGVuZ3RoICE9PSBhcnIxLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JvdGggYXJndW1lbnRzIG11c3QgYmUgYXJyYXlzIG9mIHRoZSBzYW1lIGxlbmd0aCcpXG4gIH1cblxuICBmID0gZiB8fCAoKHgsIHkpID0+IHggLSB5KVxuXG4gIGNvbnN0IG4gPSBhcnIwLmxlbmd0aFxuICBjb25zdCBjb21iaW5lZCA9IFtdXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgY29tYmluZWRbaV0gPSBbYXJyMFtpXSwgYXJyMVtpXV1cbiAgfVxuXG4gIGNvbWJpbmVkLnNvcnQoKHgsIHkpID0+IGYoeFswXSwgeVswXSkpXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICBhcnIwW2ldID0gY29tYmluZWRbaV1bMF1cbiAgICBhcnIxW2ldID0gY29tYmluZWRbaV1bMV1cbiAgfVxuXG4gIHJldHVybiBbYXJyMCwgYXJyMV1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGUgKGFycmF5KSB7XG4gIC8vIEtudXRoLUZpc2hlci1ZYXRlc1xuICAvLyBmcm9tIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yNDUwOTc2LzM3MzcyOTVcbiAgLy8gbmIuIHNodWZmbGVzIGluIHBsYWNlXG4gIHZhciBjdXJyZW50SW5kZXggPSBhcnJheS5sZW5ndGg7IHZhciB0ZW1wb3JhcnlWYWx1ZTsgdmFyIHJhbmRvbUluZGV4XG5cbiAgLy8gV2hpbGUgdGhlcmUgcmVtYWluIGVsZW1lbnRzIHRvIHNodWZmbGUuLi5cbiAgd2hpbGUgKGN1cnJlbnRJbmRleCAhPT0gMCkge1xuICAgIC8vIFBpY2sgYSByZW1haW5pbmcgZWxlbWVudC4uLlxuICAgIHJhbmRvbUluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY3VycmVudEluZGV4KVxuICAgIGN1cnJlbnRJbmRleCAtPSAxXG5cbiAgICAvLyBBbmQgc3dhcCBpdCB3aXRoIHRoZSBjdXJyZW50IGVsZW1lbnQuXG4gICAgdGVtcG9yYXJ5VmFsdWUgPSBhcnJheVtjdXJyZW50SW5kZXhdXG4gICAgYXJyYXlbY3VycmVudEluZGV4XSA9IGFycmF5W3JhbmRvbUluZGV4XVxuICAgIGFycmF5W3JhbmRvbUluZGV4XSA9IHRlbXBvcmFyeVZhbHVlXG4gIH1cblxuICByZXR1cm4gYXJyYXlcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgYSBpcyBhbiBhcnJheSBjb250YWluaW5nIGUsIGZhbHNlIG90aGVyd2lzZSAoaW5jbHVkaW5nIGlmIGEgaXMgbm90IGFuIGFycmF5KVxuICogQHBhcmFtIHsqfSBhICBBbiBhcnJheVxuICogQHBhcmFtIHsqfSBlIEFuIGVsZW1lbnQgdG8gY2hlY2sgaWYgaXMgaW4gdGhlIGFycmF5XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdlYWtJbmNsdWRlcyAoYSwgZSkge1xuICByZXR1cm4gKEFycmF5LmlzQXJyYXkoYSkgJiYgYS5pbmNsdWRlcyhlKSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpcnN0VW5pcXVlSW5kZXggKGFycmF5KSB7XG4gIC8vIHJldHVybnMgaW5kZXggb2YgZmlyc3QgdW5pcXVlIGVsZW1lbnRcbiAgLy8gaWYgbm9uZSwgcmV0dXJucyBsZW5ndGggb2YgYXJyYXlcbiAgbGV0IGkgPSAwXG4gIHdoaWxlIChpIDwgYXJyYXkubGVuZ3RoKSB7XG4gICAgaWYgKGFycmF5LmluZGV4T2YoYXJyYXlbaV0pID09PSBhcnJheS5sYXN0SW5kZXhPZihhcnJheVtpXSkpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIGkrK1xuICB9XG4gIHJldHVybiBpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBib29sT2JqZWN0VG9BcnJheSAob2JqKSB7XG4gIC8vIEdpdmVuIGFuIG9iamVjdCB3aGVyZSBhbGwgdmFsdWVzIGFyZSBib29sZWFuLCByZXR1cm4ga2V5cyB3aGVyZSB0aGUgdmFsdWUgaXMgdHJ1ZVxuICBjb25zdCByZXN1bHQgPSBbXVxuICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHtcbiAgICBpZiAob2JqW2tleV0pIHJlc3VsdC5wdXNoKGtleSlcbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qIE9iamVjdCBwcm9wZXJ0eSBhY2Nlc3MgYnkgc3RyaW5nICovXG5leHBvcnQgZnVuY3Rpb24gcHJvcEJ5U3RyaW5nIChvLCBzLCB4KSB7XG4gIC8qIEUuZy4gYnlTdHJpbmcobXlPYmosXCJmb28uYmFyXCIpIC0+IG15T2JqLmZvby5iYXJcbiAgICAgKiBieVN0cmluZyhteU9iaixcImZvby5iYXJcIixcImJhelwiKSAtPiBteU9iai5mb28uYmFyID0gXCJiYXpcIlxuICAgICAqL1xuICBzID0gcy5yZXBsYWNlKC9cXFsoXFx3KylcXF0vZywgJy4kMScpIC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gIHMgPSBzLnJlcGxhY2UoL15cXC4vLCAnJykgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICB2YXIgYSA9IHMuc3BsaXQoJy4nKVxuICBmb3IgKHZhciBpID0gMCwgbiA9IGEubGVuZ3RoIC0gMTsgaSA8IG47ICsraSkge1xuICAgIHZhciBrID0gYVtpXVxuICAgIGlmIChrIGluIG8pIHtcbiAgICAgIG8gPSBvW2tdXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgfVxuICBpZiAoeCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gb1thW25dXVxuICBlbHNlIG9bYVtuXV0gPSB4XG59XG5cbi8qIExvZ2ljICovXG5leHBvcnQgZnVuY3Rpb24gbUlmIChwLCBxKSB7IC8vIG1hdGVyaWFsIGNvbmRpdGlvbmFsXG4gIHJldHVybiAoIXAgfHwgcSlcbn1cblxuLyogRE9NIG1hbmlwdWxhdGlvbiBhbmQgcXVlcnlpbmcgKi9cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IEhUTUwgZWxlbWVudCwgc2V0cyBjbGFzc2VzIGFuZCBhcHBlbmRzXG4gKiBAcGFyYW0ge3N0cmluZ30gdGFnTmFtZSBUYWcgbmFtZSBvZiBlbGVtZW50XG4gKiBAcGFyYW0ge3N0cmluZ3x1bmRlZmluZWR9IFtjbGFzc05hbWVdIEEgY2xhc3Mgb3IgY2xhc3NlcyB0byBhc3NpZ24gdG8gdGhlIGVsZW1lbnRcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IFtwYXJlbnRdIEEgcGFyZW50IGVsZW1lbnQgdG8gYXBwZW5kIHRoZSBlbGVtZW50IHRvXG4gKiBAcmV0dXJucyB7SFRNTEVsZW1lbnR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbGVtICh0YWdOYW1lLCBjbGFzc05hbWUsIHBhcmVudCkge1xuICAvLyBjcmVhdGUsIHNldCBjbGFzcyBhbmQgYXBwZW5kIGluIG9uZVxuICBjb25zdCBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKVxuICBpZiAoY2xhc3NOYW1lKSBlbGVtLmNsYXNzTmFtZSA9IGNsYXNzTmFtZVxuICBpZiAocGFyZW50KSBwYXJlbnQuYXBwZW5kQ2hpbGQoZWxlbSlcbiAgcmV0dXJuIGVsZW1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc0FuY2VzdG9yQ2xhc3MgKGVsZW0sIGNsYXNzTmFtZSkge1xuICAvLyBjaGVjayBpZiBhbiBlbGVtZW50IGVsZW0gb3IgYW55IG9mIGl0cyBhbmNlc3RvcnMgaGFzIGNsc3NcbiAgbGV0IHJlc3VsdCA9IGZhbHNlXG4gIGZvciAoO2VsZW0gJiYgZWxlbSAhPT0gZG9jdW1lbnQ7IGVsZW0gPSBlbGVtLnBhcmVudE5vZGUpIHsgLy8gdHJhdmVyc2UgRE9NIHVwd2FyZHNcbiAgICBpZiAoZWxlbS5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKSkge1xuICAgICAgcmVzdWx0ID0gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qIENhbnZhcyBkcmF3aW5nICovXG5leHBvcnQgZnVuY3Rpb24gZGFzaGVkTGluZSAoY3R4LCB4MSwgeTEsIHgyLCB5Mikge1xuICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHgyIC0geDEsIHkyIC0geTEpXG4gIGNvbnN0IGRhc2h4ID0gKHkxIC0geTIpIC8gbGVuZ3RoIC8vIHVuaXQgdmVjdG9yIHBlcnBlbmRpY3VsYXIgdG8gbGluZVxuICBjb25zdCBkYXNoeSA9ICh4MiAtIHgxKSAvIGxlbmd0aFxuICBjb25zdCBtaWR4ID0gKHgxICsgeDIpIC8gMlxuICBjb25zdCBtaWR5ID0gKHkxICsgeTIpIC8gMlxuXG4gIC8vIGRyYXcgdGhlIGJhc2UgbGluZVxuICBjdHgubW92ZVRvKHgxLCB5MSlcbiAgY3R4LmxpbmVUbyh4MiwgeTIpXG5cbiAgLy8gZHJhdyB0aGUgZGFzaFxuICBjdHgubW92ZVRvKG1pZHggKyA1ICogZGFzaHgsIG1pZHkgKyA1ICogZGFzaHkpXG4gIGN0eC5saW5lVG8obWlkeCAtIDUgKiBkYXNoeCwgbWlkeSAtIDUgKiBkYXNoeSlcblxuICBjdHgubW92ZVRvKHgyLCB5Milcbn1cbiIsImltcG9ydCB7IE9wdGlvbnNTcGVjICwgT3B0aW9uIGFzIE9wdGlvbkksIFNlbGVjdE9wdGlvbiwgU2VsZWN0RXhjbHVzaXZlT3B0aW9uLCBTZWxlY3RJbmNsdXNpdmVPcHRpb24sIFJlYWxPcHRpb24sIFJhbmdlT3B0aW9ufSBmcm9tICdPcHRpb25zU3BlYydcbmltcG9ydCB7IGNyZWF0ZUVsZW0gfSBmcm9tICd1dGlsaXRpZXMnXG5cbi8qKiAgUmVjb3JkcyB0eXBzZSBvZiBvcHRpb24gYXZhaWxhYmlsdHksIGFuZCBsaW5rIHRvIFVJIGFuZCBmdXJ0aGVyIG9wdGlvbnMgc2V0cyAqL1xudHlwZSBPcHRpb25zcGVjMiA9IChPcHRpb25zU3BlY1swXSAmIHsgLy8gU3RhcnQgd2l0aCBzdGFuZGFyZCBvcHRpb25zIHNwZWMgLSB0YWtlbiBmcm9tIHF1ZXN0aW9uIGdlbmVyYXRvciBjbGFzc2VzXG4gIGVsZW1lbnQ/OiBIVE1MRWxlbWVudCwgICAgICAgICAgICAgICAvLyBtb3N0IHdpbGwgYWxzbyBoYXZlIGxpbmtzIHRvIGEgVUkgZWxlbWVudFxuICBzdWJPcHRpb25zU2V0PzogT3B0aW9uc1NldCAgICAgICAgICAgLy8gZm9yIG9wdGlvbi50eXBlPVwic3Vib3B0aW9uc1wiLCBob2xkIGxpbmsgdG8gdGhlIE9wdGlvbnNTZXQgZm9yIHRoYXRcbn0pW11cblxuLyoqXG4gKiBBIHNpbXBsZSBvYmplY3QgcmVwcmVzZW50aW5nIG9wdGlvbnMgdG8gc2VuZCB0byBhIHF1ZXN0aW9uIGdlbmVyYXRvciBcbiAqIE5CLiBUaGlzIGlzIGEgdmVyeSAnbG9vc2UnIHR5cGUgXG4gKi9cbmludGVyZmFjZSBPcHRpb25zIHtcbiAgW2tleTogc3RyaW5nXTogIHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBzdHJpbmdbXSB8IE9wdGlvbnNcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgc2V0IG9mIG9wdGlvbnMsIHdpdGggbGluayB0byBVSSBlbGVtZW50cy4gU3RvcmVzIGludGVybmFsbHkgdGhlIG9wdGlvbnNcbiAqIGluIGEgc2ltcGxlIG9iamVjdCBzdWl0YWJsZSBmb3IgcGFzc2luZyB0byBxdWVzdGlvbiBnZW5lcmF0b3JzXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE9wdGlvbnNTZXQge1xuICBvcHRpb25zU3BlYyA6IE9wdGlvbnNwZWMyXG4gIG9wdGlvbnMgOiBPcHRpb25zXG4gIHRlbXBsYXRlPyA6IHN0cmluZ1xuICBnbG9iYWxJZDogc3RyaW5nXG4gIHN0YXRpYyBpZENvdW50ZXI6IG51bWJlciA9IDAgLy8gaW5jcmVtZW50IGVhY2ggdGltZSB0byBjcmVhdGUgdW5pcXVlIGlkcyB0byB1c2UgaW4gaWRzL25hbWVzIG9mIGVsZW1lbnRzXG5cbiAgc3RhdGljIGdldElkKCk6IHN0cmluZyB7XG4gICAgaWYgKE9wdGlvbnNTZXQuaWRDb3VudGVyID49IDI2ICoqIDIpIHRocm93IG5ldyBFcnJvcignVG9vIG1hbnkgb3B0aW9ucyBvYmplY3RzIScpXG4gICAgY29uc3QgaWQgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKH5+KE9wdGlvbnNTZXQuaWRDb3VudGVyIC8gMjYpICsgOTcpICtcbiAgICAgIFN0cmluZy5mcm9tQ2hhckNvZGUoT3B0aW9uc1NldC5pZENvdW50ZXIgJSAyNiArIDk3KVxuXG4gICAgT3B0aW9uc1NldC5pZENvdW50ZXIgKz0gMVxuXG4gICAgcmV0dXJuIGlkXG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IG9wdGlvbnMgc3BlY1xuICAgKiBAcGFyYW0gb3B0aW9uc1NwZWMgU3BlY2lmaWNhdGlvbiBvZiBvcHRpb25zXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZSBBIHRlbXBsYXRlIGZvciBkaXNwbGF5aW5nIG9wdGlvbnMsIHVzaW5nIHt7bXVzdGFjaGV9fSBzeW50YXhcbiAgICovXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zU3BlYyA6IE9wdGlvbnNTcGVjLCB0ZW1wbGF0ZT8gOiBzdHJpbmcpIHtcbiAgICB0aGlzLm9wdGlvbnNTcGVjID0gb3B0aW9uc1NwZWMgYXMgT3B0aW9uc3BlYzJcblxuICAgIHRoaXMub3B0aW9ucyA9IHt9XG4gICAgdGhpcy5vcHRpb25zU3BlYy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICBpZiAoaXNSZWFsT3B0aW9uKG9wdGlvbikgJiYgb3B0aW9uLnR5cGUgIT09ICdzdWJvcHRpb25zJyAmJiBvcHRpb24udHlwZSAhPT0gJ3JhbmdlJykge1xuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IG9wdGlvbi5kZWZhdWx0XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbi50eXBlID09PSAncmFuZ2UnKSB7XG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRMQl0gPSBvcHRpb24uZGVmYXVsdExCXG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRVQl0gPSBvcHRpb24uZGVmYXVsdFVCXG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbi50eXBlID09PSAnc3Vib3B0aW9ucycpIHsgLy8gUmVjdXJzaXZlbHkgYnVpbGQgc3Vib3B0aW9ucy4gVGVybWluYXRlcyBhcyBsb25nIGFzIG9wdGlvbnNTcGVjIGlzIG5vdCBjaXJjdWxhclxuICAgICAgICBvcHRpb24uc3ViT3B0aW9uc1NldCA9IG5ldyBPcHRpb25zU2V0KG9wdGlvbi5vcHRpb25zU3BlYylcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBvcHRpb24uc3ViT3B0aW9uc1NldC5vcHRpb25zIFxuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGUgLy8gaHRtbCB0ZW1wbGF0ZSAob3B0aW9uYWwpXG5cbiAgICAvLyBzZXQgYW4gaWQgYmFzZWQgb24gYSBjb3VudGVyIC0gdXNlZCBmb3IgbmFtZXMgb2YgZm9ybSBlbGVtZW50c1xuICAgIHRoaXMuZ2xvYmFsSWQgPSBPcHRpb25zU2V0LmdldElkKClcbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhbiBvcHRpb24sIGZpbmQgaXRzIFVJIGVsZW1lbnQgYW5kIHVwZGF0ZSB0aGUgc3RhdGUgZnJvbSB0aGF0XG4gICAqIEBwYXJhbSB7Kn0gb3B0aW9uIEFuIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25TcGVjIG9yIGFuIGlkXG4gICAqL1xuICB1cGRhdGVTdGF0ZUZyb21VSSAob3B0aW9uIDogT3B0aW9uc3BlYzJbMF0gfCBzdHJpbmcpIHtcbiAgICAvLyBpbnB1dCAtIGVpdGhlciBhbiBlbGVtZW50IG9mIHRoaXMub3B0aW9uc1NwZWMgb3IgYW4gb3B0aW9uIGlkXG4gICAgaWYgKHR5cGVvZiAob3B0aW9uKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIG9wdGlvbiA9IHRoaXMub3B0aW9uc1NwZWMuZmluZCh4ID0+ICgoeCBhcyBPcHRpb25JKS5pZCA9PT0gb3B0aW9uKSlcbiAgICAgIGlmICghb3B0aW9uKSB0aHJvdyBuZXcgRXJyb3IoYG5vIG9wdGlvbiB3aXRoIGlkICcke29wdGlvbn0nYClcbiAgICB9XG4gICAgaWYgKCFvcHRpb24uZWxlbWVudCkgdGhyb3cgbmV3IEVycm9yKGBvcHRpb24gJHsob3B0aW9uIGFzIE9wdGlvbkkpLmlkfSBkb2Vzbid0IGhhdmUgYSBVSSBlbGVtZW50YClcblxuICAgIHN3aXRjaCAob3B0aW9uLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2ludCc6IHtcbiAgICAgICAgY29uc3QgaW5wdXQgOiBIVE1MSW5wdXRFbGVtZW50ID0gb3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JylbMF1cbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBOdW1iZXIoaW5wdXQudmFsdWUpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdib29sJzoge1xuICAgICAgICBjb25zdCBpbnB1dCA6IEhUTUxJbnB1dEVsZW1lbnQgPSBvcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKVswXVxuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IGlucHV0LmNoZWNrZWRcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NlbGVjdC1leGNsdXNpdmUnOiB7XG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gKG9wdGlvbi5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0OmNoZWNrZWQnKSBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAnc2VsZWN0LWluY2x1c2l2ZSc6IHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPVxuICAgICAgICAgIEFycmF5LmZyb20ob3B0aW9uLmVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnaW5wdXQ6Y2hlY2tlZCcpLCAoeCA6IEhUTUxJbnB1dEVsZW1lbnQpID0+IHgudmFsdWUpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdyYW5nZSc6IHtcbiAgICAgICAgY29uc3QgaW5wdXRMQiA6IEhUTUxJbnB1dEVsZW1lbnQgPSBvcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKVswXVxuICAgICAgICBjb25zdCBpbnB1dFVCIDogSFRNTElucHV0RWxlbWVudCA9IG9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpWzFdXG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRMQl0gPSBOdW1iZXIoaW5wdXRMQi52YWx1ZSlcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZFVCXSA9IE51bWJlcihpbnB1dFVCLnZhbHVlKVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYG9wdGlvbiB3aXRoIGlkICR7KG9wdGlvbiBhcyBPcHRpb25JKS5pZH0gaGFzIHVucmVjb2duaXNlZCBvcHRpb24gdHlwZSAke29wdGlvbi50eXBlfWApXG4gICAgfVxuICAgIGNvbnNvbGUubG9nKHRoaXMub3B0aW9ucylcbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIHN0cmluZywgcmV0dXJuIHRoZSBlbGVtZW50IG9mIHRoaXMub3B0aW9ucyB3aXRoIHRoYXQgaWRcbiAgICogQHBhcmFtIGlkIFRoZSBpZFxuICAgKi9cblxuICB1cGRhdGVTdGF0ZUZyb21VSUFsbCAoKSB7XG4gICAgdGhpcy5vcHRpb25zU3BlYy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICBpZiAoaXNSZWFsT3B0aW9uKG9wdGlvbikpIHsgXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdGVGcm9tVUkob3B0aW9uKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBkaXNhYmxlT3JFbmFibGVBbGwgKCkge1xuICAgIHRoaXMub3B0aW9uc1NwZWMuZm9yRWFjaChvcHRpb24gPT4gdGhpcy5kaXNhYmxlT3JFbmFibGUob3B0aW9uKSlcbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhbiBvcHRpb24sIGZpbmQgaXRzIFVJIGVsZW1lbnQgYW5kIHVwZGF0ZSBpdCBhY2NvcmRpbmcgdG8gdGhlIG9wdGlvbnMgSURcbiAgICogQHBhcmFtIHsqfSBvcHRpb24gQW4gZWxlbWVudCBvZiB0aGlzLm9wdGlvbnNTcGVjIG9yIGFuIG9wdGlvbiBpZFxuICAgKi9cbiAgdXBkYXRlVUlGcm9tU3RhdGUgKG9wdGlvbikge1xuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIGFuIG9wdGlvbiwgZW5hYmxlIHRoZSBVSSBlbGVtZW50cyBpZiBhbmQgb25seSBpZiBhbGwgdGhlIGJvb2xlYW5cbiAgICogb3B0aW9ucyBpbiBvcHRpb24uZW5hYmxlZElmIGFyZSB0cnVlXG4gICAqIEBwYXJhbSBvcHRpb24gQW4gZWxlbWVudCBvZiB0aGlzLm9wdGlvbnNTcGVjIG9yIGFuIG9wdGlvbiBpZFxuICAgKi9cbiAgZGlzYWJsZU9yRW5hYmxlKG9wdGlvbiA6IHN0cmluZyB8IE9wdGlvbnNwZWMyWzBdKSB7XG4gICAgaWYgKHR5cGVvZiAob3B0aW9uKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIG9wdGlvbiA9IHRoaXMub3B0aW9uc1NwZWMuZmluZCh4ID0+IChpc1JlYWxPcHRpb24oeCkgJiYgeC5pZCA9PT0gb3B0aW9uKSlcbiAgICAgIGlmICghb3B0aW9uKSB0aHJvdyBuZXcgRXJyb3IoYG5vIG9wdGlvbiB3aXRoIGlkICcke29wdGlvbn0nYClcbiAgICB9XG5cbiAgICBpZiAoIShpc1JlYWxPcHRpb24ob3B0aW9uKSAmJiBvcHRpb24uZW5hYmxlZElmKSkgcmV0dXJuXG5cbiAgICBjb25zdCBlbmFibGVyTGlzdCA9IG9wdGlvbi5lbmFibGVkSWYuc3BsaXQoXCImXCIpIC8vXG4gICAgbGV0IGVuYWJsZSA9IHRydWUgLy8gd2lsbCBkaXNhYmxlIGlmIGp1c3Qgb25lIG9mIHRoZSBlbGVtZW50cyBvZiBlbmFibGVyTGlzdCBpcyBmYWxzZVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbmFibGVyTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IGVuYWJsZXJJZCA9IGVuYWJsZXJMaXN0W2ldXG4gICAgICBsZXQgbmVnYXRlID0gZmFsc2UgLy8gaWYgaXQgc3RhcnRzIHdpdGggISwgbmVnYXRpdmUgb3V0cHV0XG4gICAgICBpZiAoZW5hYmxlcklkLnN0YXJ0c1dpdGgoJyEnKSkge1xuICAgICAgICBuZWdhdGUgPSB0cnVlIFxuICAgICAgICBlbmFibGVySWQgPSBlbmFibGVySWQuc2xpY2UoMSlcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB0aGlzLm9wdGlvbnNbZW5hYmxlcklkXSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvciAoYEludmFsaWQgJ2VuYWJsZWRJZic6ICR7ZW5hYmxlcklkfSBpcyBub3QgYSBib29sZWFuIG9wdGlvbmApXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGVuYWJsZXJWYWx1ZSA6IGJvb2xlYW4gPSB0aGlzLm9wdGlvbnNbZW5hYmxlcklkXSBhcyBib29sZWFuIC8vIT09IG5lZ2F0ZSAvLyAhPT0gZXF1aXZhbGVudCB0byBYT1JcblxuICAgICAgaWYgKCFlbmFibGVyVmFsdWUpIHtcbiAgICAgICAgZW5hYmxlID0gZmFsc2VcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZW5hYmxlKSB7XG4gICAgICBvcHRpb24uZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKCdkaXNhYmxlZCcpXG4gICAgICAgIDtbLi4ub3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JyldLmZvckVhY2goZSA9PiB7IGUuZGlzYWJsZWQgPSBmYWxzZSB9KVxuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb24uZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdkaXNhYmxlZCcpXG4gICAgICAgIDtbLi4ub3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JyldLmZvckVhY2goZSA9PiB7IGUuZGlzYWJsZWQgPSB0cnVlIH0pXG4gICAgfVxuICB9XG5cbiAgcmVuZGVySW4gKGVsZW1lbnQ6IEhUTUxFbGVtZW50LCB1bEV4dHJhQ2xhc3M/IDogc3RyaW5nKSA6IEhUTUxFbGVtZW50e1xuICAgIGNvbnN0IGxpc3QgPSBjcmVhdGVFbGVtKCd1bCcsICdvcHRpb25zLWxpc3QnKVxuICAgIGlmICh1bEV4dHJhQ2xhc3MpIGxpc3QuY2xhc3NMaXN0LmFkZCh1bEV4dHJhQ2xhc3MpXG4gICAgbGV0IGNvbHVtbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdvcHRpb25zLWNvbHVtbicsIGxpc3QpXG5cbiAgICB0aGlzLm9wdGlvbnNTcGVjLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgIGlmIChvcHRpb24udHlwZSA9PT0gJ2NvbHVtbi1icmVhaycpIHsgLy8gc3RhcnQgbmV3IGNvbHVtblxuICAgICAgICBjb2x1bW4gPSBjcmVhdGVFbGVtKCdkaXYnLCAnb3B0aW9ucy1jb2x1bW4nLCBsaXN0KVxuICAgICAgfSBlbHNlIGlmIChvcHRpb24udHlwZSA9PT0gJ3N1Ym9wdGlvbnMnKSB7XG4gICAgICAgIGNvbnN0IHN1Yk9wdGlvbnNFbGVtZW50ID0gb3B0aW9uLnN1Yk9wdGlvbnNTZXQucmVuZGVySW4oY29sdW1uLFwic3Vib3B0aW9uc1wiKVxuICAgICAgICBvcHRpb24uZWxlbWVudCA9IHN1Yk9wdGlvbnNFbGVtZW50XG4gICAgICB9XG4gICAgICBlbHNlIHsgLy8gbWFrZSBsaXN0IGl0ZW1cbiAgICAgICAgY29uc3QgbGkgPSBjcmVhdGVFbGVtKCdsaScsIHVuZGVmaW5lZCwgY29sdW1uKVxuICAgICAgICBpZiAoaXNSZWFsT3B0aW9uKG9wdGlvbikpIHtcbiAgICAgICAgICBsaS5kYXRhc2V0Lm9wdGlvbklkID0gb3B0aW9uLmlkXG4gICAgICAgIH1cblxuICAgICAgICBzd2l0Y2ggKG9wdGlvbi50eXBlKSB7XG4gICAgICAgICAgY2FzZSAnaGVhZGluZyc6XG4gICAgICAgICAgICByZW5kZXJIZWFkaW5nKG9wdGlvbi50aXRsZSwgbGkpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ2ludCc6XG4gICAgICAgICAgY2FzZSAnYm9vbCc6XG4gICAgICAgICAgICByZW5kZXJTaW5nbGVPcHRpb24ob3B0aW9uLCBsaSlcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAnc2VsZWN0LWluY2x1c2l2ZSc6XG4gICAgICAgICAgY2FzZSAnc2VsZWN0LWV4Y2x1c2l2ZSc6XG4gICAgICAgICAgICB0aGlzLnJlbmRlckxpc3RPcHRpb24ob3B0aW9uLCBsaSlcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAncmFuZ2UnOlxuICAgICAgICAgICAgcmVuZGVyUmFuZ2VPcHRpb24ob3B0aW9uLCBsaSlcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgICAgbGkuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZSA9PiB7IHRoaXMudXBkYXRlU3RhdGVGcm9tVUkob3B0aW9uKTsgdGhpcy5kaXNhYmxlT3JFbmFibGVBbGwoKSB9KVxuICAgICAgICBvcHRpb24uZWxlbWVudCA9IGxpXG5cbiAgICAgIH1cbiAgICB9KVxuICAgIGVsZW1lbnQuYXBwZW5kKGxpc3QpXG5cbiAgICB0aGlzLmRpc2FibGVPckVuYWJsZUFsbCgpXG5cbiAgICByZXR1cm4gbGlzdFxuICB9XG5cbiAgcmVuZGVyV2l0aFRlbXBsYXRlKGVsZW1lbnQgOiBIVE1MRWxlbWVudCkge1xuICAgIC8vIGNyZWF0ZSBhcHByb3ByaWF0ZSBvYmplY3QgZm9yIG11c3RhY2hlXG4gICAgbGV0IG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsT3B0aW9uST5cbiAgICB0aGlzLm9wdGlvbnNTcGVjLmZvckVhY2goIG9wdGlvbiA9PiB7XG4gICAgICBpZiAoaXNSZWFsT3B0aW9uKG9wdGlvbikpIHtcbiAgICAgICAgb3B0aW9uc1tvcHRpb24uaWRdID0gb3B0aW9uXG4gICAgICB9XG4gICAgfSlcblxuICAgIGxldCBodG1sU3RyaW5nID0gdGhpcy50ZW1wbGF0ZVxuICB9XG5cbiAgcmVuZGVyTGlzdE9wdGlvbiAob3B0aW9uOiBTZWxlY3RFeGNsdXNpdmVPcHRpb24gfCBTZWxlY3RJbmNsdXNpdmVPcHRpb24gLCBsaSA6IEhUTUxFbGVtZW50KSB7XG4gICAgbGkuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLG9wdGlvbi50aXRsZSArICc6ICcpXG5cbiAgICBjb25zdCBzdWJsaXN0ID0gY3JlYXRlRWxlbSgndWwnLCAnb3B0aW9ucy1zdWJsaXN0JywgbGkpXG4gICAgaWYgKG9wdGlvbi52ZXJ0aWNhbCkgc3VibGlzdC5jbGFzc0xpc3QuYWRkKCdvcHRpb25zLXN1Ymxpc3QtdmVydGljYWwnKVxuXG4gICAgb3B0aW9uLnNlbGVjdE9wdGlvbnMuZm9yRWFjaChzZWxlY3RPcHRpb24gPT4ge1xuICAgICAgY29uc3Qgc3VibGlzdExpID0gY3JlYXRlRWxlbSgnbGknLCBudWxsLCBzdWJsaXN0KVxuICAgICAgY29uc3QgbGFiZWwgPSBjcmVhdGVFbGVtKCdsYWJlbCcsIG51bGwsIHN1Ymxpc3RMaSlcblxuICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpXG4gICAgICBpbnB1dC50eXBlID0gb3B0aW9uLnR5cGUgPT09ICdzZWxlY3QtZXhjbHVzaXZlJyA/ICdyYWRpbycgOiAnY2hlY2tib3gnXG4gICAgICBpbnB1dC5uYW1lID0gdGhpcy5nbG9iYWxJZCArICctJyArIG9wdGlvbi5pZFxuICAgICAgaW5wdXQudmFsdWUgPSBzZWxlY3RPcHRpb24uaWRcblxuICAgICAgaWYgKG9wdGlvbi50eXBlID09PSAnc2VsZWN0LWluY2x1c2l2ZScpIHsgLy8gZGVmYXVsdHMgd29yayBkaWZmZXJlbnQgZm9yIGluY2x1c2l2ZS9leGNsdXNpdmVcbiAgICAgICAgaW5wdXQuY2hlY2tlZCA9IG9wdGlvbi5kZWZhdWx0LmluY2x1ZGVzKHNlbGVjdE9wdGlvbi5pZClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlucHV0LmNoZWNrZWQgPSBvcHRpb24uZGVmYXVsdCA9PT0gc2VsZWN0T3B0aW9uLmlkXG4gICAgICB9XG5cbiAgICAgIGxhYmVsLmFwcGVuZChpbnB1dClcblxuICAgICAgaW5wdXQuY2xhc3NMaXN0LmFkZCgnb3B0aW9uJylcblxuICAgICAgbGFiZWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLHNlbGVjdE9wdGlvbi50aXRsZSlcbiAgICB9KVxuICB9XG59XG5cbi8qKlxuICogUmVuZGVycyBhIGhlYWRpbmcgb3B0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gdGl0bGUgVGhlIHRpdGxlIG9mIHRoZSBoZWFkaW5nXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBsaSBUaGUgZWxlbWVudCB0byByZW5kZXIgaW50b1xuICovXG5mdW5jdGlvbiByZW5kZXJIZWFkaW5nICh0aXRsZSwgbGkpIHtcbiAgbGkuaW5uZXJIVE1MID0gdGl0bGVcbiAgbGkuY2xhc3NMaXN0LmFkZCgnb3B0aW9ucy1oZWFkaW5nJylcbn1cblxuLyoqXG4gKiBSZW5kZXJzIHNpbmdsZSBwYXJhbWV0ZXJcbiAqIEBwYXJhbSB7Kn0gb3B0aW9uXG4gKiBAcGFyYW0geyp9IGxpXG4gKi9cbmZ1bmN0aW9uIHJlbmRlclNpbmdsZU9wdGlvbiAob3B0aW9uLCBsaSkge1xuICBjb25zdCBsYWJlbCA9IGNyZWF0ZUVsZW0oJ2xhYmVsJywgdW5kZWZpbmVkLCBsaSlcblxuICBpZiAoIW9wdGlvbi5zd2FwTGFiZWwgJiYgb3B0aW9uLnRpdGxlICE9PSAnJykgbGFiZWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLGAke29wdGlvbi50aXRsZX06IGApXG5cbiAgY29uc3QgaW5wdXQgOiBIVE1MSW5wdXRFbGVtZW50ID0gY3JlYXRlRWxlbSgnaW5wdXQnLCAnb3B0aW9uJywgbGFiZWwpIGFzIEhUTUxJbnB1dEVsZW1lbnRcbiAgc3dpdGNoIChvcHRpb24udHlwZSkge1xuICAgIGNhc2UgJ2ludCc6XG4gICAgICBpbnB1dC50eXBlID0gJ251bWJlcidcbiAgICAgIGlucHV0Lm1pbiA9IG9wdGlvbi5taW5cbiAgICAgIGlucHV0Lm1heCA9IG9wdGlvbi5tYXhcbiAgICAgIGlucHV0LnZhbHVlID0gb3B0aW9uLmRlZmF1bHRcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYm9vbCc6XG4gICAgICBpbnB1dC50eXBlID0gJ2NoZWNrYm94J1xuICAgICAgaW5wdXQuY2hlY2tlZCA9IG9wdGlvbi5kZWZhdWx0XG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHVua25vd24gb3B0aW9uIHR5cGUgJHtvcHRpb24udHlwZX1gKVxuICB9XG5cbiAgaWYgKG9wdGlvbi5zd2FwTGFiZWwgJiYgb3B0aW9uLnRpdGxlICE9PSAnJykgbGFiZWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLGAgJHtvcHRpb24udGl0bGV9YClcbn1cblxuZnVuY3Rpb24gcmVuZGVyUmFuZ2VPcHRpb24ob3B0aW9uOiBSYW5nZU9wdGlvbiwgbGkpIHtcbiAgY29uc3QgbGFiZWwgPSBjcmVhdGVFbGVtKCdsYWJlbCcsdW5kZWZpbmVkLCBsaSlcbiAgY29uc3QgaW5wdXRMQiA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgJ29wdGlvbicsIGxhYmVsKSBhcyBIVE1MSW5wdXRFbGVtZW50XG4gIGlucHV0TEIudHlwZSA9ICdudW1iZXInXG4gIGlucHV0TEIubWluID0gb3B0aW9uLm1pbi50b1N0cmluZygpXG4gIGlucHV0TEIubWF4ID0gb3B0aW9uLm1heC50b1N0cmluZygpXG4gIGlucHV0TEIudmFsdWUgPSBvcHRpb24uZGVmYXVsdExCLnRvU3RyaW5nKClcblxuICBsYWJlbC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsYCAmbGVxOyAke29wdGlvbi50aXRsZX0gJmxlcTsgYClcblxuICBjb25zdCBpbnB1dFVCID0gY3JlYXRlRWxlbSgnaW5wdXQnLCAnb3B0aW9uJywgbGFiZWwpIGFzIEhUTUxJbnB1dEVsZW1lbnRcbiAgaW5wdXRVQi50eXBlID0gJ251bWJlcidcbiAgaW5wdXRVQi5taW4gPSBvcHRpb24ubWluLnRvU3RyaW5nKClcbiAgaW5wdXRVQi5tYXggPSBvcHRpb24ubWF4LnRvU3RyaW5nKClcbiAgaW5wdXRVQi52YWx1ZSA9IG9wdGlvbi5kZWZhdWx0VUIudG9TdHJpbmcoKVxufVxuXG4vKiogRGV0ZXJtaW5lcyBpZiBhbiBvcHRpb24gaW4gT3B0aW9uc1NwZWMgaXMgYSByZWFsIG9wdGlvbiBhcyBvcHBvc2VkIHRvXG4gKiBhIGhlYWRpbmcgb3IgY29sdW1uIGJyZWFrXG4gKi9cbmZ1bmN0aW9uIGlzUmVhbE9wdGlvbihvcHRpb24gOiBPcHRpb25zU3BlY1swXSkgOiBvcHRpb24gaXMgUmVhbE9wdGlvbntcbiAgcmV0dXJuIChvcHRpb24gYXMgT3B0aW9uSSkuaWQgIT09IHVuZGVmaW5lZFxufVxuXG5jb25zdCBkZW1vU3BlYyA6IE9wdGlvbnNTcGVjID0gW1xuICB7XG4gICAgdGl0bGU6ICdEaWZmaWN1bHR5JyxcbiAgICBpZDogJ2RpZmZpY3VsdHknLFxuICAgIHR5cGU6ICdpbnQnLFxuICAgIG1pbjogMSxcbiAgICBtYXg6IDEwLFxuICAgIGRlZmF1bHQ6IDVcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVHlwZScsXG4gICAgaWQ6ICd0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ1JlY3RhbmdsZScsIGlkOiAncmVjdGFuZ2xlJyB9LFxuICAgICAgeyB0aXRsZTogJ1RyaWFuZ2xlJywgaWQ6ICd0cmlhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdTcXVvdmFsJywgaWQ6ICdzcXVvdmFsJyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiAncmVjdGFuZ2xlJ1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdBIGhlYWRpbmcnLFxuICAgIHR5cGU6ICdoZWFkaW5nJ1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdTaGFwZScsXG4gICAgaWQ6ICdzaGFwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdSZWN0YW5nbGUgc2hhcGUgdGhpbmcnLCBpZDogJ3JlY3RhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdUcmlhbmdsZSBzaGFwZSB0aGluZycsIGlkOiAndHJpYW5nbGUnIH0sXG4gICAgICB7IHRpdGxlOiAnU3F1b3ZhbCBzaGFwZSBsb25nJywgaWQ6ICdzcXVvdmFsJyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiBbJ3JlY3RhbmdsZScsICdzcXVvdmFsJ10sXG4gICAgdmVydGljYWw6IHRydWUgLy8gbGF5b3V0IHZlcnRpY2FsbHksIHJhdGhlciB0aGFuIGhvcml6b250YWxseVxuICB9LFxuICB7XG4gICAgdHlwZTogJ2NvbHVtbi1icmVhaydcbiAgfSxcbiAge1xuICAgIHR5cGU6ICdoZWFkaW5nJyxcbiAgICB0aXRsZTogJ0EgbmV3IGNvbHVtbidcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnRG8gc29tZXRoaW5nJyxcbiAgICBpZDogJ3NvbWV0aGluZycsXG4gICAgdHlwZTogJ2Jvb2wnLFxuICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgc3dhcExhYmVsOiB0cnVlIC8vIHB1dCBjb250cm9sIGJlZm9yZSBsYWJlbFxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdPcHRpb25zIGZvciByZWN0YW5nbGVzJyxcbiAgICBpZDogJ3JlY3RhbmdsZS1vcHRpb25zJyxcbiAgICB0eXBlOiAnc3Vib3B0aW9ucycsXG4gICAgb3B0aW9uc1NwZWM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdNaW5pbXVtIHgnLFxuICAgICAgICBpZDogJ21pblgnLFxuICAgICAgICB0eXBlOiAnaW50JyxcbiAgICAgICAgbWluOiAwLFxuICAgICAgICBtYXg6IDEwLFxuICAgICAgICBkZWZhdWx0OiAyXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0aXRsZTogJ01heGltdW0geCcsXG4gICAgICAgIGlkOiAnbWF4WCcsXG4gICAgICAgIHR5cGU6ICdpbnQnLFxuICAgICAgICBtaW46IDAsXG4gICAgICAgIG1heDogMTAsXG4gICAgICAgIGRlZmF1bHQ6IDRcbiAgICAgIH1cbiAgICBdXG4gIH1cbl1cblxuY29uc3QgZGVtb1RlbXBsYXRlIDogc3RyaW5nID1cblwiPGxpPnt7ZGlmZmljdWx0eS5yZW5kZXJlZH19PC9saT5cXG5cIiArICAgICAgLy8gSW5zZXJ0cyBmdWxsICdkaWZmaXVsdHknIG9wdGlvbiBhcyBiZWZvcmVcblwiPGxpPjxiPnt7dHlwZS50aXRsZX19PC9iPiBcXG5cIiArICAgICAgICAgICAgLy8ganVzdCB0aGUgdGl0bGVcblwiPGxpPnt7dHlwZS5pbnB1dH19IFxcblwiICsgICAgICAgICAgICAgICAgICAgLy8gdGhlIGlucHV0IGVsZW1lbnRcblwie3t0eXBlLnNlbGVjdE9wdGlvbnNSZW5kZXJlZEFsbH19PC9saT5cIiArICAvLyBUaGUgb3B0aW9ucywgcmVkZXJlZCB1c3VhbGx5XG5cIjxsaT48dWw+e3sjIHR5cGUuc2VsZWN0T3B0aW9uc319XCIgKyAgICAgICAvLyBJbmRpdmlkdWFsIHNlbGVjdCBvcHRpb25zLCByZW5kZXJlZFxuICBcIjxsaT4ge3tyZW5kZXJlZH19IDwvbGk+XCIgKyAgICAgICAgICAgICAgIC8vIFRoZSB1c3VhbCByZW5kZXJlZCBvcHRpb25cblwie3svIHR5cGUuc2VsZWN0T3B0aW9uc319PC91bD5cIlxuXG5jb25zdCBleGFtcGxlVGVtcGxhdGUgOiBzdHJpbmcgPSAgLy8gQW5vdGhlciBleGFtcGxlLCB3aXRoIGZld2VyIGNvbW1lbnRzXG5gPGRpdiBjbGFzcyA9IFwib3B0aW9ucy1jb2x1bW5cIj5cbiAgPHVsIGNsYXNzPVwib3B0aW9ucy1saXN0XCI+XG4gICAgPGxpPiA8Yj5Tb21lIG9wdGlvbnMgPC9iPiA8L2xpPlxuICAgIDxsaT4ge3tkaWZmaWN1bHR5LnJlbmRlcmVkfX0gPC9saT5cbiAgICA8bGkgc3R5bGU9XCJkaXNwbGF5OmJsb2NrXCI+IHt7c2ltcGxlLnRpdGxlfX0ge3tzaW1wbGUuaW5wdXR9fVxuICAgICAge3sjc2ltcGxlTWluWH19XG5gICIsImV4cG9ydCBkZWZhdWx0IGFic3RyYWN0IGNsYXNzIFF1ZXN0aW9uIHtcbiAgRE9NOiBIVE1MRWxlbWVudFxuICBhbnN3ZXJlZDogYm9vbGVhblxuXG4gIGNvbnN0cnVjdG9yICgpIHtcbiAgICB0aGlzLkRPTSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgdGhpcy5ET00uY2xhc3NOYW1lID0gJ3F1ZXN0aW9uLWRpdidcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHtcbiAgICByZXR1cm4gdGhpcy5ET01cbiAgfVxuXG4gIGFic3RyYWN0IHJlbmRlciAoKSA6IHZvaWRcblxuICBzaG93QW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5hbnN3ZXJlZCA9IHRydWVcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxuXG4gIHRvZ2dsZUFuc3dlciAoKSA6IHZvaWQge1xuICAgIGlmICh0aGlzLmFuc3dlcmVkKSB7XG4gICAgICB0aGlzLmhpZGVBbnN3ZXIoKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNob3dBbnN3ZXIoKVxuICAgIH1cbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyAvLyBTaG91bGQgYmUgb3ZlcnJpZGRlblxuICAgIHJldHVybiAnJ1xuICB9XG59XG4iLCIvKiBnbG9iYWwga2F0ZXggKi9cbmltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbi9RdWVzdGlvbidcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGV4dFEgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIoKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiA1LFxuICAgICAgbGFiZWw6ICdhJ1xuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgLy8gc3RvcmUgdGhlIGxhYmVsIGZvciBmdXR1cmUgcmVuZGVyaW5nXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyBEdW1teSBxdWVzdGlvbiBnZW5lcmF0aW5nIC0gc3ViY2xhc3NlcyBkbyBzb21ldGhpbmcgc3Vic3RhbnRpYWwgaGVyZVxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICcyKzInXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICc9NSdcblxuICAgIC8vIE1ha2UgdGhlIERPTSB0cmVlIGZvciB0aGUgZWxlbWVudFxuICAgIHRoaXMucXVlc3Rpb25wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpXG4gICAgdGhpcy5hbnN3ZXJwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpXG5cbiAgICB0aGlzLnF1ZXN0aW9ucC5jbGFzc05hbWUgPSAncXVlc3Rpb24nXG4gICAgdGhpcy5hbnN3ZXJwLmNsYXNzTmFtZSA9ICdhbnN3ZXInXG4gICAgdGhpcy5hbnN3ZXJwLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpXG5cbiAgICB0aGlzLkRPTS5hcHBlbmRDaGlsZCh0aGlzLnF1ZXN0aW9ucClcbiAgICB0aGlzLkRPTS5hcHBlbmRDaGlsZCh0aGlzLmFuc3dlcnApXG5cbiAgICAvLyBzdWJjbGFzc2VzIHNob3VsZCBnZW5lcmF0ZSBxdWVzdGlvbkxhVGVYIGFuZCBhbnN3ZXJMYVRlWCxcbiAgICAvLyAucmVuZGVyKCkgd2lsbCBiZSBjYWxsZWQgYnkgdXNlclxuICB9XG5cbiAgcmVuZGVyICgpIHtcbiAgICAvLyB1cGRhdGUgdGhlIERPTSBpdGVtIHdpdGggcXVlc3Rpb25MYVRlWCBhbmQgYW5zd2VyTGFUZVhcbiAgICB2YXIgcW51bSA9IHRoaXMubGFiZWxcbiAgICAgID8gJ1xcXFx0ZXh0eycgKyB0aGlzLmxhYmVsICsgJykgfSdcbiAgICAgIDogJydcbiAgICBrYXRleC5yZW5kZXIocW51bSArIHRoaXMucXVlc3Rpb25MYVRlWCwgdGhpcy5xdWVzdGlvbnAsIHsgZGlzcGxheU1vZGU6IHRydWUsIHN0cmljdDogJ2lnbm9yZScgfSlcbiAgICBrYXRleC5yZW5kZXIodGhpcy5hbnN3ZXJMYVRlWCwgdGhpcy5hbnN3ZXJwLCB7IGRpc3BsYXlNb2RlOiB0cnVlIH0pXG4gIH1cblxuICBnZXRET00gKCkge1xuICAgIHJldHVybiB0aGlzLkRPTVxuICB9XG5cbiAgc2hvd0Fuc3dlciAoKSB7XG4gICAgdGhpcy5hbnN3ZXJwLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IHRydWVcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkge1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICB9XG59XG4iLCJpbXBvcnQgeyByYW5kQmV0d2VlbiwgZ2NkIH0gZnJvbSAndXRpbGl0aWVzJ1xuaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuXG4vKiBNYWluIHF1ZXN0aW9uIGNsYXNzLiBUaGlzIHdpbGwgYmUgc3B1biBvZmYgaW50byBkaWZmZXJlbnQgZmlsZSBhbmQgZ2VuZXJhbGlzZWQgKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFsZ2VicmFpY0ZyYWN0aW9uUSBleHRlbmRzIFRleHRRIHtcbiAgLy8gJ2V4dGVuZHMnIFF1ZXN0aW9uLCBidXQgbm90aGluZyB0byBhY3R1YWxseSBleHRlbmRcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiAyXG4gICAgfVxuXG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcbiAgICBjb25zdCBkaWZmaWN1bHR5ID0gc2V0dGluZ3MuZGlmZmljdWx0eVxuXG4gICAgLy8gbG9naWMgZm9yIGdlbmVyYXRpbmcgdGhlIHF1ZXN0aW9uIGFuZCBhbnN3ZXIgc3RhcnRzIGhlcmVcbiAgICB2YXIgYSwgYiwgYywgZCwgZSwgZiAvLyAoYXgrYikoZXgrZikvKGN4K2QpKGV4K2YpID0gKHB4XjIrcXgrcikvKHR4XjIrdXgrdilcbiAgICB2YXIgcCwgcSwgciwgdCwgdSwgdlxuICAgIHZhciBtaW5Db2VmZiwgbWF4Q29lZmYsIG1pbkNvbnN0LCBtYXhDb25zdFxuXG4gICAgc3dpdGNoIChkaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIG1pbkNvZWZmID0gMTsgbWF4Q29lZmYgPSAxOyBtaW5Db25zdCA9IDE7IG1heENvbnN0ID0gNlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMTsgbWluQ29uc3QgPSAtNjsgbWF4Q29uc3QgPSA2XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDM6XG4gICAgICAgIG1pbkNvZWZmID0gMTsgbWF4Q29lZmYgPSAzOyBtaW5Db25zdCA9IC01OyBtYXhDb25zdCA9IDVcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNDpcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIG1pbkNvZWZmID0gLTM7IG1heENvZWZmID0gMzsgbWluQ29uc3QgPSAtNTsgbWF4Q29uc3QgPSA1XG4gICAgICAgIGJyZWFrXG4gICAgfVxuXG4gICAgLy8gUGljayBzb21lIGNvZWZmaWNpZW50c1xuICAgIHdoaWxlIChcbiAgICAgICgoIWEgJiYgIWIpIHx8ICghYyAmJiAhZCkgfHwgKCFlICYmICFmKSkgfHwgLy8gcmV0cnkgaWYgYW55IGV4cHJlc3Npb24gaXMgMFxuICAgICAgY2FuU2ltcGxpZnkoYSwgYiwgYywgZCkgLy8gcmV0cnkgaWYgdGhlcmUncyBhIGNvbW1vbiBudW1lcmljYWwgZmFjdG9yXG4gICAgKSB7XG4gICAgICBhID0gcmFuZEJldHdlZW4obWluQ29lZmYsIG1heENvZWZmKVxuICAgICAgYyA9IHJhbmRCZXR3ZWVuKG1pbkNvZWZmLCBtYXhDb2VmZilcbiAgICAgIGUgPSByYW5kQmV0d2VlbihtaW5Db2VmZiwgbWF4Q29lZmYpXG4gICAgICBiID0gcmFuZEJldHdlZW4obWluQ29uc3QsIG1heENvbnN0KVxuICAgICAgZCA9IHJhbmRCZXR3ZWVuKG1pbkNvbnN0LCBtYXhDb25zdClcbiAgICAgIGYgPSByYW5kQmV0d2VlbihtaW5Db25zdCwgbWF4Q29uc3QpXG4gICAgfVxuXG4gICAgLy8gaWYgdGhlIGRlbm9taW5hdG9yIGlzIG5lZ2F0aXZlIGZvciBlYWNoIHRlcm0sIHRoZW4gbWFrZSB0aGUgbnVtZXJhdG9yIG5lZ2F0aXZlIGluc3RlYWRcbiAgICBpZiAoYyA8PSAwICYmIGQgPD0gMCkge1xuICAgICAgYyA9IC1jXG4gICAgICBkID0gLWRcbiAgICAgIGEgPSAtYVxuICAgICAgYiA9IC1iXG4gICAgfVxuXG4gICAgcCA9IGEgKiBlOyBxID0gYSAqIGYgKyBiICogZTsgciA9IGIgKiBmXG4gICAgdCA9IGMgKiBlOyB1ID0gYyAqIGYgKyBkICogZTsgdiA9IGQgKiBmXG5cbiAgICAvLyBOb3cgcHV0IHRoZSBxdWVzdGlvbiBhbmQgYW5zd2VyIGluIGEgbmljZSBmb3JtYXQgaW50byBxdWVzdGlvbkxhVGVYIGFuZCBhbnN3ZXJMYVRlWFxuICAgIGNvbnN0IHF1ZXN0aW9uID0gYFxcXFxmcmFjeyR7cXVhZHJhdGljU3RyaW5nKHAsIHEsIHIpfX17JHtxdWFkcmF0aWNTdHJpbmcodCwgdSwgdil9fWBcbiAgICBpZiAoc2V0dGluZ3MudXNlQ29tbWFuZFdvcmQpIHtcbiAgICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICdcXFxcdGV4dHtTaW1wbGlmeX0gJyArIHF1ZXN0aW9uXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9IHF1ZXN0aW9uXG4gICAgfVxuICAgIHRoaXMuYW5zd2VyTGFUZVggPVxuICAgICAgKGMgPT09IDAgJiYgZCA9PT0gMSkgPyBxdWFkcmF0aWNTdHJpbmcoMCwgYSwgYilcbiAgICAgICAgOiBgXFxcXGZyYWN7JHtxdWFkcmF0aWNTdHJpbmcoMCwgYSwgYil9fXske3F1YWRyYXRpY1N0cmluZygwLCBjLCBkKX19YFxuXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICc9ICcgKyB0aGlzLmFuc3dlckxhVGVYXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ1NpbXBsaWZ5J1xuICB9XG59XG5cbi8qIFV0aWxpdHkgZnVuY3Rpb25zXG4gKiBBdCBzb21lIHBvaW50LCBJJ2xsIG1vdmUgc29tZSBvZiB0aGVzZSBpbnRvIGEgZ2VuZXJhbCB1dGlsaXRpZXMgbW9kdWxlXG4gKiBidXQgdGhpcyB3aWxsIGRvIGZvciBub3dcbiAqL1xuXG4vLyBUT0RPIEkgaGF2ZSBxdWFkcmF0aWNTdHJpbmcgaGVyZSBhbmQgYWxzbyBhIFBvbHlub21pYWwgY2xhc3MuIFdoYXQgaXMgYmVpbmcgcmVwbGljYXRlZD/Cp1xuZnVuY3Rpb24gcXVhZHJhdGljU3RyaW5nIChhLCBiLCBjKSB7XG4gIGlmIChhID09PSAwICYmIGIgPT09IDAgJiYgYyA9PT0gMCkgcmV0dXJuICcwJ1xuXG4gIHZhciB4MnN0cmluZyA9XG4gICAgYSA9PT0gMCA/ICcnXG4gICAgICA6IGEgPT09IDEgPyAneF4yJ1xuICAgICAgICA6IGEgPT09IC0xID8gJy14XjInXG4gICAgICAgICAgOiBhICsgJ3heMidcblxuICB2YXIgeHNpZ24gPVxuICAgIGIgPCAwID8gJy0nXG4gICAgICA6IChhID09PSAwIHx8IGIgPT09IDApID8gJydcbiAgICAgICAgOiAnKydcblxuICB2YXIgeHN0cmluZyA9XG4gICAgYiA9PT0gMCA/ICcnXG4gICAgICA6IChiID09PSAxIHx8IGIgPT09IC0xKSA/ICd4J1xuICAgICAgICA6IE1hdGguYWJzKGIpICsgJ3gnXG5cbiAgdmFyIGNvbnN0c2lnbiA9XG4gICAgYyA8IDAgPyAnLSdcbiAgICAgIDogKChhID09PSAwICYmIGIgPT09IDApIHx8IGMgPT09IDApID8gJydcbiAgICAgICAgOiAnKydcblxuICB2YXIgY29uc3RzdHJpbmcgPVxuICAgIGMgPT09IDAgPyAnJyA6IE1hdGguYWJzKGMpXG5cbiAgcmV0dXJuIHgyc3RyaW5nICsgeHNpZ24gKyB4c3RyaW5nICsgY29uc3RzaWduICsgY29uc3RzdHJpbmdcbn1cblxuZnVuY3Rpb24gY2FuU2ltcGxpZnkgKGExLCBiMSwgYTIsIGIyKSB7XG4gIC8vIGNhbiAoYTF4K2IxKS8oYTJ4K2IyKSBiZSBzaW1wbGlmaWVkP1xuICAvL1xuICAvLyBGaXJzdCwgdGFrZSBvdXQgZ2NkLCBhbmQgd3JpdGUgYXMgYzEoYTF4K2IxKSBldGNcblxuICB2YXIgYzEgPSBnY2QoYTEsIGIxKVxuICBhMSA9IGExIC8gYzFcbiAgYjEgPSBiMSAvIGMxXG5cbiAgdmFyIGMyID0gZ2NkKGEyLCBiMilcbiAgYTIgPSBhMiAvIGMyXG4gIGIyID0gYjIgLyBjMlxuXG4gIHZhciByZXN1bHQgPSBmYWxzZVxuXG4gIGlmIChnY2QoYzEsIGMyKSA+IDEgfHwgKGExID09PSBhMiAmJiBiMSA9PT0gYjIpKSB7XG4gICAgcmVzdWx0ID0gdHJ1ZVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdFxufVxuIiwiaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICd1dGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEludGVnZXJBZGRRIGV4dGVuZHMgVGV4dFEge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDUsXG4gICAgICBsYWJlbDogJ2EnXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICB0aGlzLmxhYmVsID0gc2V0dGluZ3MubGFiZWxcblxuICAgIC8vIFRoaXMgaXMganVzdCBhIGRlbW8gcXVlc3Rpb24gdHlwZSBmb3Igbm93LCBzbyBub3QgcHJvY2Vzc2luZyBkaWZmaWN1bHR5XG4gICAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKDEwLCAxMDAwKVxuICAgIGNvbnN0IGIgPSByYW5kQmV0d2VlbigxMCwgMTAwMClcbiAgICBjb25zdCBzdW0gPSBhICsgYlxuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gYSArICcgKyAnICsgYlxuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPSAnICsgc3VtXG5cbiAgICB0aGlzLnJlbmRlcigpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ0V2YWx1YXRlJ1xuICB9XG59XG4iLCIvKipcbiAqIENsYXNzIHJlcHJlc2VudGluZyBhIHBvaW50LCBhbmQgc3RhdGljIHV0aXRsaXR5IG1ldGhvZHNcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUG9pbnQge1xuICB4OiBudW1iZXJcbiAgeTogbnVtYmVyXG4gIGNvbnN0cnVjdG9yICh4LCB5KSB7XG4gICAgdGhpcy54ID0geFxuICAgIHRoaXMueSA9IHlcbiAgfVxuXG4gIHJvdGF0ZSAoYW5nbGUpIHtcbiAgICB2YXIgbmV3eCwgbmV3eVxuICAgIG5ld3ggPSBNYXRoLmNvcyhhbmdsZSkgKiB0aGlzLnggLSBNYXRoLnNpbihhbmdsZSkgKiB0aGlzLnlcbiAgICBuZXd5ID0gTWF0aC5zaW4oYW5nbGUpICogdGhpcy54ICsgTWF0aC5jb3MoYW5nbGUpICogdGhpcy55XG4gICAgdGhpcy54ID0gbmV3eFxuICAgIHRoaXMueSA9IG5ld3lcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc2NhbGUgKHNmKSB7XG4gICAgdGhpcy54ID0gdGhpcy54ICogc2ZcbiAgICB0aGlzLnkgPSB0aGlzLnkgKiBzZlxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICB0cmFuc2xhdGUgKHgsIHkpIHtcbiAgICB0aGlzLnggKz0geFxuICAgIHRoaXMueSArPSB5XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIGNsb25lICgpIHtcbiAgICByZXR1cm4gbmV3IFBvaW50KHRoaXMueCwgdGhpcy55KVxuICB9XG5cbiAgZXF1YWxzICh0aGF0KSB7XG4gICAgcmV0dXJuICh0aGlzLnggPT09IHRoYXQueCAmJiB0aGlzLnkgPT09IHRoYXQueSlcbiAgfVxuXG4gIG1vdmVUb3dhcmQgKHRoYXQsIGQpIHtcbiAgICAvLyBtb3ZlcyBbZF0gaW4gdGhlIGRpcmVjdGlvbiBvZiBbdGhhdDo6UG9pbnRdXG4gICAgY29uc3QgdXZlYyA9IFBvaW50LnVuaXRWZWN0b3IodGhpcywgdGhhdClcbiAgICB0aGlzLnRyYW5zbGF0ZSh1dmVjLnggKiBkLCB1dmVjLnkgKiBkKVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzdGF0aWMgZnJvbVBvbGFyIChyLCB0aGV0YSkge1xuICAgIHJldHVybiBuZXcgUG9pbnQoXG4gICAgICBNYXRoLmNvcyh0aGV0YSkgKiByLFxuICAgICAgTWF0aC5zaW4odGhldGEpICogclxuICAgIClcbiAgfVxuXG4gIHN0YXRpYyBmcm9tUG9sYXJEZWcgKHIsIHRoZXRhKSB7XG4gICAgdGhldGEgPSB0aGV0YSAqIE1hdGguUEkgLyAxODBcbiAgICByZXR1cm4gUG9pbnQuZnJvbVBvbGFyKHIsIHRoZXRhKVxuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIG1lYW4gb2ZcbiAgICogQHBhcmFtICB7Li4uUG9pbnR9IHBvaW50cyBUaGUgcG9pbnRzIHRvIGZpbmQgdGhlIG1lYW4gb2ZcbiAgICovXG4gIHN0YXRpYyBtZWFuICguLi5wb2ludHMgOiBQb2ludFtdKSB7XG4gICAgY29uc3Qgc3VteCA9IHBvaW50cy5tYXAocCA9PiBwLngpLnJlZHVjZSgoeCwgeSkgPT4geCArIHkpXG4gICAgY29uc3Qgc3VteSA9IHBvaW50cy5tYXAocCA9PiBwLnkpLnJlZHVjZSgoeCwgeSkgPT4geCArIHkpXG4gICAgY29uc3QgbiA9IHBvaW50cy5sZW5ndGhcblxuICAgIHJldHVybiBuZXcgUG9pbnQoc3VteCAvIG4sIHN1bXkgLyBuKVxuICB9XG5cbiAgc3RhdGljIGluQ2VudGVyIChBLCBCLCBDKSB7XG4gICAgLy8gaW5jZW50ZXIgb2YgYSB0cmlhbmdsZSBnaXZlbiB2ZXJ0ZXggcG9pbnRzIEEsIEIgYW5kIENcbiAgICBjb25zdCBhID0gUG9pbnQuZGlzdGFuY2UoQiwgQylcbiAgICBjb25zdCBiID0gUG9pbnQuZGlzdGFuY2UoQSwgQylcbiAgICBjb25zdCBjID0gUG9pbnQuZGlzdGFuY2UoQSwgQilcblxuICAgIGNvbnN0IHBlcmltZXRlciA9IGEgKyBiICsgY1xuICAgIGNvbnN0IHN1bXggPSBhICogQS54ICsgYiAqIEIueCArIGMgKiBDLnhcbiAgICBjb25zdCBzdW15ID0gYSAqIEEueSArIGIgKiBCLnkgKyBjICogQy55XG5cbiAgICByZXR1cm4gbmV3IFBvaW50KHN1bXggLyBwZXJpbWV0ZXIsIHN1bXkgLyBwZXJpbWV0ZXIpXG4gIH1cblxuICBzdGF0aWMgbWluIChwb2ludHMgOiBQb2ludFtdKSB7XG4gICAgY29uc3QgbWlueCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWluKHgsIHAueCksIEluZmluaXR5KVxuICAgIGNvbnN0IG1pbnkgPSBwb2ludHMucmVkdWNlKCh5LCBwKSA9PiBNYXRoLm1pbih5LCBwLnkpLCBJbmZpbml0eSlcbiAgICByZXR1cm4gbmV3IFBvaW50KG1pbngsIG1pbnkpXG4gIH1cblxuICBzdGF0aWMgbWF4IChwb2ludHM6IFBvaW50W10pIHtcbiAgICBjb25zdCBtYXh4ID0gcG9pbnRzLnJlZHVjZSgoeCwgcCkgPT4gTWF0aC5tYXgoeCwgcC54KSwgLUluZmluaXR5KVxuICAgIGNvbnN0IG1heHkgPSBwb2ludHMucmVkdWNlKCh5LCBwKSA9PiBNYXRoLm1heCh5LCBwLnkpLCAtSW5maW5pdHkpXG4gICAgcmV0dXJuIG5ldyBQb2ludChtYXh4LCBtYXh5KVxuICB9XG5cbiAgc3RhdGljIGNlbnRlciAocG9pbnRzOiBQb2ludFtdKSB7XG4gICAgY29uc3QgbWlueCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWluKHgsIHAueCksIEluZmluaXR5KVxuICAgIGNvbnN0IG1pbnkgPSBwb2ludHMucmVkdWNlKCh5LCBwKSA9PiBNYXRoLm1pbih5LCBwLnkpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtYXh4ID0gcG9pbnRzLnJlZHVjZSgoeCwgcCkgPT4gTWF0aC5tYXgoeCwgcC54KSwgLUluZmluaXR5KVxuICAgIGNvbnN0IG1heHkgPSBwb2ludHMucmVkdWNlKCh5LCBwKSA9PiBNYXRoLm1heCh5LCBwLnkpLCAtSW5maW5pdHkpXG4gICAgcmV0dXJuIG5ldyBQb2ludCgobWF4eCArIG1pbngpIC8gMiwgKG1heHkgKyBtaW55KSAvIDIpXG4gIH1cblxuICBzdGF0aWMgdW5pdFZlY3RvciAocDEgOiBQb2ludCwgcDIgOiBQb2ludCkge1xuICAgIC8vIHJldHVybnMgYSB1bml0IHZlY3RvciBpbiB0aGUgZGlyZWN0aW9uIG9mIHAxIHRvIHAyXG4gICAgLy8gaW4gdGhlIGZvcm0ge3g6Li4uLCB5Oi4uLn1cbiAgICBjb25zdCB2ZWN4ID0gcDIueCAtIHAxLnhcbiAgICBjb25zdCB2ZWN5ID0gcDIueSAtIHAxLnlcbiAgICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHZlY3gsIHZlY3kpXG4gICAgcmV0dXJuIHsgeDogdmVjeCAvIGxlbmd0aCwgeTogdmVjeSAvIGxlbmd0aCB9XG4gIH1cblxuICBzdGF0aWMgZGlzdGFuY2UgKHAxOiBQb2ludCwgcDI6IFBvaW50KSB7XG4gICAgcmV0dXJuIE1hdGguaHlwb3QocDEueCAtIHAyLngsIHAxLnkgLSBwMi55KVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGN1bGF0ZSB0aGUgYW5nbGUgaW4gcmFkaWFucyBmcm9tIGhvcml6b250YWwgdG8gcDIsIHdpdGggY2VudHJlIHAxLlxuICAgKiBFLmcuIGFuZ2xlRnJvbSggKDAsMCksICgxLDEpICkgPSBwaS8yXG4gICAqIEFuZ2xlIGlzIGZyb20gMCB0byAycGlcbiAgICogQHBhcmFtICBwMSBUaGUgc3RhcnQgcG9pbnRcbiAgICogQHBhcmFtICBwMiBUaGUgZW5kIHBvaW50XG4gICAqIEByZXR1cm5zICBUaGUgYW5nbGUgaW4gcmFkaWFuc1xuICAgKi9cbiAgc3RhdGljIGFuZ2xlRnJvbSAocDE6IFBvaW50LCBwMjogUG9pbnQpOiBudW1iZXIge1xuICAgIGNvbnN0IGFuZ2xlID0gTWF0aC5hdGFuMihwMi55IC0gcDEueSwgcDIueCAtIHAxLngpXG4gICAgcmV0dXJuIGFuZ2xlID49IDAgPyBhbmdsZSA6IDIgKiBNYXRoLlBJICsgYW5nbGVcbiAgfVxuXG4gIC8qKlxuICAgKiBXaGVuIHAxIGFuZCBwMiBhcmUgbGVzcyB0aGFuIFt0cmlnZ2VyXSBhcGFydCwgdGhleSBhcmVcbiAgICogbW92ZWQgc28gdGhhdCB0aGV5IGFyZSBbZGlzdGFuY2VdIGFwYXJ0XG4gICAqIEBwYXJhbSBwMSBBIHBvaW50XG4gICAqIEBwYXJhbSBwMiBBIHBvaW50XG4gICAqIEBwYXJhbSB0cmlnZ2VyIERpc3RhbmNlIHRyaWdnZXJpbmcgcmVwdWxzaW9uIFxuICAgKiBAcGFyYW0gZGlzdGFuY2UgZGlzdGFuY2UgdG8gcmVwZWwgdG9cbiAgICovXG4gIHN0YXRpYyByZXBlbCAocDE6IFBvaW50LCBwMjogUG9pbnQsIHRyaWdnZXI6IG51bWJlciwgZGlzdGFuY2U6IG51bWJlcikge1xuICAgIGNvbnN0IGQgPSBNYXRoLmh5cG90KHAxLnggLSBwMi54LCBwMS55IC0gcDIueSlcbiAgICBpZiAoZCA+PSB0cmlnZ2VyKSByZXR1cm4gZmFsc2VcblxuICAgIGNvbnN0IHIgPSAoZGlzdGFuY2UgLSBkKSAvIDIgLy8gZGlzdGFuY2UgdGhleSBuZWVkIG1vdmluZ1xuICAgIHAxLm1vdmVUb3dhcmQocDIsIC1yKVxuICAgIHAyLm1vdmVUb3dhcmQocDEsIC1yKVxuICAgIHJldHVybiB0cnVlXG4gIH1cblxuICAvKipcbiAgICogU2NhbGUgYW4gY2VudGVyIGEgc2V0IG9mIHBvaW50cyB0byBhIGdpdmVuIHdpZHRoIG9yIGhlaWdodC4gTi5CLiBUaGlzIG11dGF0ZXMgdGhlIHBvaW50cyBpbiB0aGUgYXJyYXksIHNvIGNsb25lIGZpcnN0IGlmIG5lY2Vzc2FyIFxuICAgKiBAcGFyYW0gcG9pbnRzIEFuIGFycmF5IG9mIHBvaW50c1xuICAgKiBAcGFyYW0gd2lkdGggV2lkdGggb2YgYm91bmRpbmcgYm94IHRvIHNjYWxlIHRvXG4gICAqIEBwYXJhbSBoZWlnaHQgSGVpZ2h0IG9mIGJvdW5kaW5nIGJveCB0byBzY2FsZSB0b1xuICAgKiBAcGFyYW0gbWFyZ2luIE1hcmdpbiB0byBsZWF2ZSBhcm91bmQgc2NhbGVkIHBvaW50c1xuICAgKiBAcGFyYW0gb2Zmc2V0IE9mZnNldCBmcm9tIGNlbnRlciBvZiBib3VuZGluZyBib3hcbiAgICogQHJldHVybnMgVGhlIHNjYWxlIGZhY3RvciB0aGF0IHBvaW50cyB3ZXJlIHNjYWxlZCBieVxuICAgKi9cbiAgc3RhdGljIHNjYWxlVG9GaXQocG9pbnRzOiBQb2ludFtdLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgbWFyZ2luOiBudW1iZXIgPSAwLCBvZmZzZXQ6IFtudW1iZXIsbnVtYmVyXSA9IFswLDBdKSB7XG4gICAgbGV0IHRvcExlZnQgOiBQb2ludCA9IFBvaW50Lm1pbihwb2ludHMpXG4gICAgbGV0IGJvdHRvbVJpZ2h0IDogUG9pbnQgPSBQb2ludC5tYXgocG9pbnRzKVxuICAgIGNvbnN0IHRvdGFsV2lkdGggOiBudW1iZXIgPSBib3R0b21SaWdodC54IC0gdG9wTGVmdC54XG4gICAgY29uc3QgdG90YWxIZWlnaHQgOiBudW1iZXIgPSBib3R0b21SaWdodC55IC0gdG9wTGVmdC55XG4gICAgY29uc3Qgc2YgPSBNYXRoLm1pbigod2lkdGggLSBtYXJnaW4pIC8gdG90YWxXaWR0aCwgKGhlaWdodCAtIG1hcmdpbikgLyB0b3RhbEhlaWdodClcbiAgICBwb2ludHMuZm9yRWFjaChwdD0+e3B0LnNjYWxlKHNmKX0pXG5cbiAgICAvLyBjZW50cmVcbiAgICB0b3BMZWZ0ID0gUG9pbnQubWluKHBvaW50cylcbiAgICBib3R0b21SaWdodCA9IFBvaW50Lm1heChwb2ludHMpXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbih0b3BMZWZ0LCBib3R0b21SaWdodCkudHJhbnNsYXRlKC4uLm9mZnNldClcbiAgICBwb2ludHMuZm9yRWFjaChwdD0+e3B0LnRyYW5zbGF0ZSh3aWR0aCAvIDIgLSBjZW50ZXIueCwgaGVpZ2h0IC8gMiAtIGNlbnRlci55KX0pIC8vIGNlbnRyZVxuXG4gICAgcmV0dXJuIHNmXG4gIH1cbn1cbiIsImltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbi9RdWVzdGlvbidcbmltcG9ydCB7IGNyZWF0ZUVsZW0gfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi9WaWV3T3B0aW9ucydcbmRlY2xhcmUgY29uc3Qga2F0ZXggOiB7cmVuZGVyIDogKHN0cmluZzogc3RyaW5nLCBlbGVtZW50OiBIVE1MRWxlbWVudCkgPT4gdm9pZH1cblxuLyogR3JhcGhpY1FEYXRhIGNhbiBhbGwgYmUgdmVyeSBkaWZmZXJlbnQsIHNvIGludGVyZmFjZSBpcyBlbXB0eVxuICogSGVyZSBmb3IgY29kZSBkb2N1bWVudGF0aW9uIHJhdGhlciB0aGFuIHR5cGUgc2FmZXR5ICh3aGljaCBpc24ndCBwcm92aWRlZCkgKi9cblxuLyogZXNsaW50LWRpc2FibGUgKi9cbmV4cG9ydCBpbnRlcmZhY2UgR3JhcGhpY1FEYXRhIHtcbn1cbi8qIGVzbGludC1lbmFibGUgKi9cblxuLyogTm90IHdvcnRoIHRoZSBoYXNzbHkgdHJ5aW5nIHRvIGdldCBpbnRlcmZhY2VzIGZvciBzdGF0aWMgbWV0aG9kc1xuICpcbiAqIGV4cG9ydCBpbnRlcmZhY2UgR3JhcGhpY1FEYXRhQ29uc3RydWN0b3Ige1xuICogICBuZXcoLi4uYXJncyA6IHVua25vd25bXSk6IEdyYXBoaWNRRGF0YVxuICogICByYW5kb20ob3B0aW9uczogdW5rbm93bikgOiBHcmFwaGljUURhdGFcbiAqIH1cbiovXG5cbmV4cG9ydCBpbnRlcmZhY2UgTGFiZWwge1xuICBwb3M6IFBvaW50LFxuICB0ZXh0cTogc3RyaW5nLFxuICB0ZXh0YTogc3RyaW5nLFxuICBzdHlsZXE6IHN0cmluZyxcbiAgc3R5bGVhOiBzdHJpbmcsXG4gIHRleHQ6IHN0cmluZyxcbiAgc3R5bGU6IHN0cmluZ1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgR3JhcGhpY1FWaWV3IHtcbiAgRE9NOiBIVE1MRWxlbWVudFxuICBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50XG4gIHdpZHRoOiBudW1iZXJcbiAgaGVpZ2h0OiBudW1iZXJcbiAgZGF0YTogR3JhcGhpY1FEYXRhXG4gIGxhYmVsczogTGFiZWxbXVxuXG4gIGNvbnN0cnVjdG9yIChkYXRhIDogR3JhcGhpY1FEYXRhLCB2aWV3T3B0aW9ucyA6IFZpZXdPcHRpb25zKSB7XG4gICAgY29uc3QgZGVmYXVsdHMgOiBWaWV3T3B0aW9ucyA9IHtcbiAgICAgIHdpZHRoOiAzMDAsXG4gICAgICBoZWlnaHQ6IDMwMFxuICAgIH1cblxuICAgIHZpZXdPcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIHZpZXdPcHRpb25zKVxuXG4gICAgdGhpcy53aWR0aCA9IHZpZXdPcHRpb25zLndpZHRoXG4gICAgdGhpcy5oZWlnaHQgPSB2aWV3T3B0aW9ucy5oZWlnaHQgLy8gb25seSB0aGluZ3MgSSBuZWVkIGZyb20gdGhlIG9wdGlvbnMsIGdlbmVyYWxseT9cbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgLy8gdGhpcy5yb3RhdGlvbj9cblxuICAgIHRoaXMubGFiZWxzID0gW10gLy8gbGFiZWxzIG9uIGRpYWdyYW1cblxuICAgIC8vIERPTSBlbGVtZW50c1xuICAgIHRoaXMuRE9NID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWRpdicpXG4gICAgdGhpcy5jYW52YXMgPSBjcmVhdGVFbGVtKCdjYW52YXMnLCAncXVlc3Rpb24tY2FudmFzJywgdGhpcy5ET00pIGFzIEhUTUxDYW52YXNFbGVtZW50XG4gICAgdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLndpZHRoXG4gICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHRcbiAgfVxuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHtcbiAgICByZXR1cm4gdGhpcy5ET01cbiAgfVxuXG4gIGFic3RyYWN0IHJlbmRlciAoKSA6IHZvaWRcblxuICByZW5kZXJMYWJlbHMgKG51ZGdlPyA6IGJvb2xlYW4pIDogdm9pZCB7XG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5ET01cblxuICAgIC8vIHJlbW92ZSBhbnkgZXhpc3RpbmcgbGFiZWxzXG4gICAgY29uc3Qgb2xkTGFiZWxzID0gY29udGFpbmVyLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2xhYmVsJylcbiAgICB3aGlsZSAob2xkTGFiZWxzLmxlbmd0aCA+IDApIHtcbiAgICAgIG9sZExhYmVsc1swXS5yZW1vdmUoKVxuICAgIH1cblxuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBjb25zdCBsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgICBjb25zdCBpbm5lcmxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICAgIGxhYmVsLmNsYXNzTGlzdC5hZGQoJ2xhYmVsJylcbiAgICAgIGxhYmVsLmNsYXNzTmFtZSArPSAnICcgKyBsLnN0eWxlIC8vIHVzaW5nIGNsYXNzTmFtZSBvdmVyIGNsYXNzTGlzdCBzaW5jZSBsLnN0eWxlIGlzIHNwYWNlLWRlbGltaXRlZCBsaXN0IG9mIGNsYXNzZXNcbiAgICAgIGxhYmVsLnN0eWxlLmxlZnQgPSBsLnBvcy54ICsgJ3B4J1xuICAgICAgbGFiZWwuc3R5bGUudG9wID0gbC5wb3MueSArICdweCdcblxuICAgICAga2F0ZXgucmVuZGVyKGwudGV4dCwgaW5uZXJsYWJlbClcbiAgICAgIGxhYmVsLmFwcGVuZENoaWxkKGlubmVybGFiZWwpXG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQobGFiZWwpXG5cbiAgICAgIC8vIHJlbW92ZSBzcGFjZSBpZiB0aGUgaW5uZXIgbGFiZWwgaXMgdG9vIGJpZ1xuICAgICAgaWYgKGlubmVybGFiZWwub2Zmc2V0V2lkdGggLyBpbm5lcmxhYmVsLm9mZnNldEhlaWdodCA+IDIpIHtcbiAgICAgICAgY29uc29sZS5sb2coYHJlbW92ZWQgc3BhY2UgaW4gJHtsLnRleHR9YClcbiAgICAgICAgY29uc3QgbmV3bGFiZWx0ZXh0ID0gbC50ZXh0LnJlcGxhY2UoL1xcKy8sICdcXFxcIStcXFxcIScpLnJlcGxhY2UoLy0vLCAnXFxcXCEtXFxcXCEnKVxuICAgICAgICBrYXRleC5yZW5kZXIobmV3bGFiZWx0ZXh0LCBpbm5lcmxhYmVsKVxuICAgICAgfVxuXG4gICAgICAvLyBJIGRvbid0IHVuZGVyc3RhbmQgdGhpcyBhZGp1c3RtZW50LiBJIHRoaW5rIGl0IG1pZ2h0IGJlIG5lZWRlZCBpbiBhcml0aG1hZ29ucywgYnV0IGl0IG1ha2VzXG4gICAgICAvLyBvdGhlcnMgZ28gZnVubnkuXG5cbiAgICAgIGlmIChudWRnZSkge1xuICAgICAgICBjb25zdCBsd2lkdGggPSBsYWJlbC5vZmZzZXRXaWR0aFxuICAgICAgICBpZiAobC5wb3MueCA8IHRoaXMuY2FudmFzLndpZHRoIC8gMiAtIDUgJiYgbC5wb3MueCArIGx3aWR0aCAvIDIgPiB0aGlzLmNhbnZhcy53aWR0aCAvIDIpIHtcbiAgICAgICAgICBsYWJlbC5zdHlsZS5sZWZ0ID0gKHRoaXMuY2FudmFzLndpZHRoIC8gMiAtIGx3aWR0aCAtIDMpICsgJ3B4J1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBudWRnZWQgJyR7bC50ZXh0fSdgKVxuICAgICAgICB9XG4gICAgICAgIGlmIChsLnBvcy54ID4gdGhpcy5jYW52YXMud2lkdGggLyAyICsgNSAmJiBsLnBvcy54IC0gbHdpZHRoIC8gMiA8IHRoaXMuY2FudmFzLndpZHRoIC8gMikge1xuICAgICAgICAgIGxhYmVsLnN0eWxlLmxlZnQgPSAodGhpcy5jYW52YXMud2lkdGggLyAyICsgMykgKyAncHgnXG4gICAgICAgICAgY29uc29sZS5sb2coYG51ZGdlZCAnJHtsLnRleHR9J2ApXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQge1xuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRhXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZWFcbiAgICB9KVxuICAgIHRoaXMucmVuZGVyTGFiZWxzKGZhbHNlKVxuICB9XG5cbiAgaGlkZUFuc3dlciAoKSA6IHZvaWQge1xuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRxXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZXFcbiAgICB9KVxuICAgIHRoaXMucmVuZGVyTGFiZWxzKGZhbHNlKVxuICB9XG5cbiAgLy8gUG9pbnQgdHJhbmZvcm1hdGlvbnMgb2YgYWxsIHBvaW50c1xuXG4gIGdldCBhbGxwb2ludHMgKCkgOiBQb2ludFtdIHtcbiAgICByZXR1cm4gW11cbiAgfVxuXG4gIHNjYWxlIChzZiA6IG51bWJlcikgOiB2b2lkIHtcbiAgICB0aGlzLmFsbHBvaW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICBwLnNjYWxlKHNmKVxuICAgIH0pXG4gIH1cblxuICByb3RhdGUgKGFuZ2xlIDogbnVtYmVyKSA6IG51bWJlciB7XG4gICAgdGhpcy5hbGxwb2ludHMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgcC5yb3RhdGUoYW5nbGUpXG4gICAgfSlcbiAgICByZXR1cm4gYW5nbGVcbiAgfVxuXG4gIHRyYW5zbGF0ZSAoeCA6IG51bWJlciwgeSA6IG51bWJlcikgOiB2b2lkIHtcbiAgICB0aGlzLmFsbHBvaW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICBwLnRyYW5zbGF0ZSh4LCB5KVxuICAgIH0pXG4gIH1cblxuICByYW5kb21Sb3RhdGUgKCkgOiBudW1iZXIge1xuICAgIGNvbnN0IGFuZ2xlID0gMiAqIE1hdGguUEkgKiBNYXRoLnJhbmRvbSgpXG4gICAgdGhpcy5yb3RhdGUoYW5nbGUpXG4gICAgcmV0dXJuIGFuZ2xlXG4gIH1cblxuICAvKipcbiAgICogU2NhbGVzIGFsbCB0aGUgcG9pbnRzIHRvIHdpdGhpbiBhIGdpdmVuIHdpZHRoIGFuZCBoZWlnaHQsIGNlbnRlcmluZyB0aGUgcmVzdWx0LiBSZXR1cm5zIHRoZSBzY2FsZSBmYWN0b3JcbiAgICogQHBhcmFtIHdpZHRoIFRoZSB3aWR0aCBvZiB0aGUgYm91bmRpbmcgcmVjdGFuZ2xlIHRvIHNjYWxlIHRvXG4gICAqIEBwYXJhbSBoZWlnaHQgVGhlIGhlaWdodCBvZiB0aGUgYm91bmRpbmcgcmVjdGFuZ2xlIHRvIHNjYWxlIHRvXG4gICAqIEBwYXJhbSBtYXJnaW4gTWFyZ2luIHRvIGxlYXZlIG91dHNpZGUgdGhlIHJlY3RhbmdsZVxuICAgKiBAcmV0dXJuc1xuICAgKi9cbiAgc2NhbGVUb0ZpdCAod2lkdGggOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBtYXJnaW4gOiBudW1iZXIpIDogbnVtYmVyIHtcbiAgICBsZXQgdG9wTGVmdCA6IFBvaW50ID0gUG9pbnQubWluKHRoaXMuYWxscG9pbnRzKVxuICAgIGxldCBib3R0b21SaWdodCA6IFBvaW50ID0gUG9pbnQubWF4KHRoaXMuYWxscG9pbnRzKVxuICAgIGNvbnN0IHRvdGFsV2lkdGggOiBudW1iZXIgPSBib3R0b21SaWdodC54IC0gdG9wTGVmdC54XG4gICAgY29uc3QgdG90YWxIZWlnaHQgOiBudW1iZXIgPSBib3R0b21SaWdodC55IC0gdG9wTGVmdC55XG4gICAgY29uc3Qgc2YgPSBNYXRoLm1pbigod2lkdGggLSBtYXJnaW4pIC8gdG90YWxXaWR0aCwgKGhlaWdodCAtIG1hcmdpbikgLyB0b3RhbEhlaWdodClcbiAgICB0aGlzLnNjYWxlKHNmKVxuXG4gICAgLy8gY2VudHJlXG4gICAgdG9wTGVmdCA9IFBvaW50Lm1pbih0aGlzLmFsbHBvaW50cylcbiAgICBib3R0b21SaWdodCA9IFBvaW50Lm1heCh0aGlzLmFsbHBvaW50cylcbiAgICBjb25zdCBjZW50ZXIgPSBQb2ludC5tZWFuKHRvcExlZnQsIGJvdHRvbVJpZ2h0KVxuICAgIHRoaXMudHJhbnNsYXRlKHdpZHRoIC8gMiAtIGNlbnRlci54LCBoZWlnaHQgLyAyIC0gY2VudGVyLnkpIC8vIGNlbnRyZVxuXG4gICAgcmV0dXJuIHNmXG4gIH1cbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEdyYXBoaWNRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBkYXRhOiBHcmFwaGljUURhdGFcbiAgdmlldzogR3JhcGhpY1FWaWV3XG5cbiAgY29uc3RydWN0b3IgKCkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgIHN1cGVyKCkgLy8gdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gICAgZGVsZXRlICh0aGlzLkRPTSkgLy8gZ29pbmcgdG8gb3ZlcnJpZGUgZ2V0RE9NIHVzaW5nIHRoZSB2aWV3J3MgRE9NXG5cbiAgICAvKiBUaGVzZSBhcmUgZ3VhcmFudGVlZCB0byBiZSBvdmVycmlkZGVuLCBzbyBubyBwb2ludCBpbml0aWFsaXppbmcgaGVyZVxuICAgICAqXG4gICAgICogIHRoaXMuZGF0YSA9IG5ldyBHcmFwaGljUURhdGEob3B0aW9ucylcbiAgICAgKiAgdGhpcy52aWV3ID0gbmV3IEdyYXBoaWNRVmlldyh0aGlzLmRhdGEsIG9wdGlvbnMpXG4gICAgICpcbiAgICAgKi9cbiAgfVxuXG4gIC8qIE5lZWQgdG8gcmVmYWN0b3Igc3ViY2xhc3NlcyB0byBkbyB0aGlzOlxuICAgKiBjb25zdHJ1Y3RvciAoZGF0YSwgdmlldykge1xuICAgKiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAqICAgIHRoaXMudmlldyA9IHZpZXdcbiAgICogfVxuICAgKlxuICAgKiBzdGF0aWMgcmFuZG9tKG9wdGlvbnMpIHtcbiAgICogIC8vIGFuIGF0dGVtcHQgYXQgaGF2aW5nIGFic3RyYWN0IHN0YXRpYyBtZXRob2RzLCBhbGJlaXQgcnVudGltZSBlcnJvclxuICAgKiAgdGhyb3cgbmV3IEVycm9yKFwiYHJhbmRvbSgpYCBtdXN0IGJlIG92ZXJyaWRkZW4gaW4gc3ViY2xhc3MgXCIgKyB0aGlzLm5hbWUpXG4gICAqIH1cbiAgICpcbiAgICogdHlwaWNhbCBpbXBsZW1lbnRhdGlvbjpcbiAgICogc3RhdGljIHJhbmRvbShvcHRpb25zKSB7XG4gICAqICBjb25zdCBkYXRhID0gbmV3IERlcml2ZWRRRGF0YShvcHRpb25zKVxuICAgKiAgY29uc3QgdmlldyA9IG5ldyBEZXJpdmVkUVZpZXcob3B0aW9ucylcbiAgICogIHJldHVybiBuZXcgRGVyaXZlZFFEYXRhKGRhdGEsdmlldylcbiAgICogfVxuICAgKlxuICAgKi9cblxuICBnZXRET00gKCkgOiBIVE1MRWxlbWVudCB7IHJldHVybiB0aGlzLnZpZXcuZ2V0RE9NKCkgfVxuXG4gIHJlbmRlciAoKSA6IHZvaWQgeyB0aGlzLnZpZXcucmVuZGVyKCkgfVxuXG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICBzdXBlci5zaG93QW5zd2VyKClcbiAgICB0aGlzLnZpZXcuc2hvd0Fuc3dlcigpXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7XG4gICAgc3VwZXIuaGlkZUFuc3dlcigpXG4gICAgdGhpcy52aWV3LmhpZGVBbnN3ZXIoKVxuICB9XG59XG4iLCJpbXBvcnQgKiBhcyBjb21tb25qc0hlbHBlcnMgZnJvbSAnXHUwMDAwY29tbW9uanNIZWxwZXJzLmpzJ1xuXG52YXIgZnJhY3Rpb24gPSBjb21tb25qc0hlbHBlcnMuY3JlYXRlQ29tbW9uanNNb2R1bGUoZnVuY3Rpb24gKG1vZHVsZSwgZXhwb3J0cykge1xuLyoqXG4gKiBAbGljZW5zZSBGcmFjdGlvbi5qcyB2NC4wLjkgMDkvMDkvMjAxNVxuICogaHR0cDovL3d3dy54YXJnLm9yZy8yMDE0LzAzL3JhdGlvbmFsLW51bWJlcnMtaW4tamF2YXNjcmlwdC9cbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUsIFJvYmVydCBFaXNlbGUgKHJvYmVydEB4YXJnLm9yZylcbiAqIER1YWwgbGljZW5zZWQgdW5kZXIgdGhlIE1JVCBvciBHUEwgVmVyc2lvbiAyIGxpY2Vuc2VzLlxuICoqL1xuXG4gIC8qKlxuICpcbiAqIFRoaXMgY2xhc3Mgb2ZmZXJzIHRoZSBwb3NzaWJpbGl0eSB0byBjYWxjdWxhdGUgZnJhY3Rpb25zLlxuICogWW91IGNhbiBwYXNzIGEgZnJhY3Rpb24gaW4gZGlmZmVyZW50IGZvcm1hdHMuIEVpdGhlciBhcyBhcnJheSwgYXMgZG91YmxlLCBhcyBzdHJpbmcgb3IgYXMgYW4gaW50ZWdlci5cbiAqXG4gKiBBcnJheS9PYmplY3QgZm9ybVxuICogWyAwID0+IDxub21pbmF0b3I+LCAxID0+IDxkZW5vbWluYXRvcj4gXVxuICogWyBuID0+IDxub21pbmF0b3I+LCBkID0+IDxkZW5vbWluYXRvcj4gXVxuICpcbiAqIEludGVnZXIgZm9ybVxuICogLSBTaW5nbGUgaW50ZWdlciB2YWx1ZVxuICpcbiAqIERvdWJsZSBmb3JtXG4gKiAtIFNpbmdsZSBkb3VibGUgdmFsdWVcbiAqXG4gKiBTdHJpbmcgZm9ybVxuICogMTIzLjQ1NiAtIGEgc2ltcGxlIGRvdWJsZVxuICogMTIzLzQ1NiAtIGEgc3RyaW5nIGZyYWN0aW9uXG4gKiAxMjMuJzQ1NicgLSBhIGRvdWJsZSB3aXRoIHJlcGVhdGluZyBkZWNpbWFsIHBsYWNlc1xuICogMTIzLig0NTYpIC0gc3lub255bVxuICogMTIzLjQ1JzYnIC0gYSBkb3VibGUgd2l0aCByZXBlYXRpbmcgbGFzdCBwbGFjZVxuICogMTIzLjQ1KDYpIC0gc3lub255bVxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogdmFyIGYgPSBuZXcgRnJhY3Rpb24oXCI5LjQnMzEnXCIpO1xuICogZi5tdWwoWy00LCAzXSkuZGl2KDQuOSk7XG4gKlxuICovXG5cbiAgKGZ1bmN0aW9uIChyb290KSB7XG4gICAgJ3VzZSBzdHJpY3QnXG5cbiAgICAvLyBNYXhpbXVtIHNlYXJjaCBkZXB0aCBmb3IgY3ljbGljIHJhdGlvbmFsIG51bWJlcnMuIDIwMDAgc2hvdWxkIGJlIG1vcmUgdGhhbiBlbm91Z2guXG4gICAgLy8gRXhhbXBsZTogMS83ID0gMC4oMTQyODU3KSBoYXMgNiByZXBlYXRpbmcgZGVjaW1hbCBwbGFjZXMuXG4gICAgLy8gSWYgTUFYX0NZQ0xFX0xFTiBnZXRzIHJlZHVjZWQsIGxvbmcgY3ljbGVzIHdpbGwgbm90IGJlIGRldGVjdGVkIGFuZCB0b1N0cmluZygpIG9ubHkgZ2V0cyB0aGUgZmlyc3QgMTAgZGlnaXRzXG4gICAgdmFyIE1BWF9DWUNMRV9MRU4gPSAyMDAwXG5cbiAgICAvLyBQYXJzZWQgZGF0YSB0byBhdm9pZCBjYWxsaW5nIFwibmV3XCIgYWxsIHRoZSB0aW1lXG4gICAgdmFyIFAgPSB7XG4gICAgICBzOiAxLFxuICAgICAgbjogMCxcbiAgICAgIGQ6IDFcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVFcnJvciAobmFtZSkge1xuICAgICAgZnVuY3Rpb24gZXJyb3JDb25zdHJ1Y3RvciAoKSB7XG4gICAgICAgIHZhciB0ZW1wID0gRXJyb3IuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgICAgICB0ZW1wLm5hbWUgPSB0aGlzLm5hbWUgPSBuYW1lXG4gICAgICAgIHRoaXMuc3RhY2sgPSB0ZW1wLnN0YWNrXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IHRlbXAubWVzc2FnZVxuICAgICAgfVxuXG4gICAgICAvKipcbiAgICAgKiBFcnJvciBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgICBmdW5jdGlvbiBJbnRlcm1lZGlhdGVJbmhlcml0b3IgKCkge31cbiAgICAgIEludGVybWVkaWF0ZUluaGVyaXRvci5wcm90b3R5cGUgPSBFcnJvci5wcm90b3R5cGVcbiAgICAgIGVycm9yQ29uc3RydWN0b3IucHJvdG90eXBlID0gbmV3IEludGVybWVkaWF0ZUluaGVyaXRvcigpXG5cbiAgICAgIHJldHVybiBlcnJvckNvbnN0cnVjdG9yXG4gICAgfVxuXG4gICAgdmFyIERpdmlzaW9uQnlaZXJvID0gRnJhY3Rpb24uRGl2aXNpb25CeVplcm8gPSBjcmVhdGVFcnJvcignRGl2aXNpb25CeVplcm8nKVxuICAgIHZhciBJbnZhbGlkUGFyYW1ldGVyID0gRnJhY3Rpb24uSW52YWxpZFBhcmFtZXRlciA9IGNyZWF0ZUVycm9yKCdJbnZhbGlkUGFyYW1ldGVyJylcblxuICAgIGZ1bmN0aW9uIGFzc2lnbiAobiwgcykge1xuICAgICAgaWYgKGlzTmFOKG4gPSBwYXJzZUludChuLCAxMCkpKSB7XG4gICAgICAgIHRocm93SW52YWxpZFBhcmFtKClcbiAgICAgIH1cbiAgICAgIHJldHVybiBuICogc1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRocm93SW52YWxpZFBhcmFtICgpIHtcbiAgICAgIHRocm93IG5ldyBJbnZhbGlkUGFyYW1ldGVyKClcbiAgICB9XG5cbiAgICB2YXIgcGFyc2UgPSBmdW5jdGlvbiAocDEsIHAyKSB7XG4gICAgICB2YXIgbiA9IDA7IHZhciBkID0gMTsgdmFyIHMgPSAxXG4gICAgICB2YXIgdiA9IDA7IHZhciB3ID0gMDsgdmFyIHggPSAwOyB2YXIgeSA9IDE7IHZhciB6ID0gMVxuXG4gICAgICB2YXIgQSA9IDA7IHZhciBCID0gMVxuICAgICAgdmFyIEMgPSAxOyB2YXIgRCA9IDFcblxuICAgICAgdmFyIE4gPSAxMDAwMDAwMFxuICAgICAgdmFyIE1cblxuICAgICAgaWYgKHAxID09PSB1bmRlZmluZWQgfHwgcDEgPT09IG51bGwpIHtcbiAgICAgIC8qIHZvaWQgKi9cbiAgICAgIH0gZWxzZSBpZiAocDIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBuID0gcDFcbiAgICAgICAgZCA9IHAyXG4gICAgICAgIHMgPSBuICogZFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3dpdGNoICh0eXBlb2YgcDEpIHtcbiAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlmICgnZCcgaW4gcDEgJiYgJ24nIGluIHAxKSB7XG4gICAgICAgICAgICAgIG4gPSBwMS5uXG4gICAgICAgICAgICAgIGQgPSBwMS5kXG4gICAgICAgICAgICAgIGlmICgncycgaW4gcDEpIHsgbiAqPSBwMS5zIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoMCBpbiBwMSkge1xuICAgICAgICAgICAgICBuID0gcDFbMF1cbiAgICAgICAgICAgICAgaWYgKDEgaW4gcDEpIHsgZCA9IHAxWzFdIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93SW52YWxpZFBhcmFtKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHMgPSBuICogZFxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZiAocDEgPCAwKSB7XG4gICAgICAgICAgICAgIHMgPSBwMVxuICAgICAgICAgICAgICBwMSA9IC1wMVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocDEgJSAxID09PSAwKSB7XG4gICAgICAgICAgICAgIG4gPSBwMVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwMSA+IDApIHsgLy8gY2hlY2sgZm9yICE9IDAsIHNjYWxlIHdvdWxkIGJlY29tZSBOYU4gKGxvZygwKSksIHdoaWNoIGNvbnZlcmdlcyByZWFsbHkgc2xvd1xuICAgICAgICAgICAgICBpZiAocDEgPj0gMSkge1xuICAgICAgICAgICAgICAgIHogPSBNYXRoLnBvdygxMCwgTWF0aC5mbG9vcigxICsgTWF0aC5sb2cocDEpIC8gTWF0aC5MTjEwKSlcbiAgICAgICAgICAgICAgICBwMSAvPSB6XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAvLyBVc2luZyBGYXJleSBTZXF1ZW5jZXNcbiAgICAgICAgICAgICAgLy8gaHR0cDovL3d3dy5qb2huZGNvb2suY29tL2Jsb2cvMjAxMC8xMC8yMC9iZXN0LXJhdGlvbmFsLWFwcHJveGltYXRpb24vXG5cbiAgICAgICAgICAgICAgd2hpbGUgKEIgPD0gTiAmJiBEIDw9IE4pIHtcbiAgICAgICAgICAgICAgICBNID0gKEEgKyBDKSAvIChCICsgRClcblxuICAgICAgICAgICAgICAgIGlmIChwMSA9PT0gTSkge1xuICAgICAgICAgICAgICAgICAgaWYgKEIgKyBEIDw9IE4pIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IEEgKyBDXG4gICAgICAgICAgICAgICAgICAgIGQgPSBCICsgRFxuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChEID4gQikge1xuICAgICAgICAgICAgICAgICAgICBuID0gQ1xuICAgICAgICAgICAgICAgICAgICBkID0gRFxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IEFcbiAgICAgICAgICAgICAgICAgICAgZCA9IEJcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGlmIChwMSA+IE0pIHtcbiAgICAgICAgICAgICAgICAgICAgQSArPSBDXG4gICAgICAgICAgICAgICAgICAgIEIgKz0gRFxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgQyArPSBBXG4gICAgICAgICAgICAgICAgICAgIEQgKz0gQlxuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAoQiA+IE4pIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IENcbiAgICAgICAgICAgICAgICAgICAgZCA9IERcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBBXG4gICAgICAgICAgICAgICAgICAgIGQgPSBCXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG4gKj0gelxuICAgICAgICAgICAgfSBlbHNlIGlmIChpc05hTihwMSkgfHwgaXNOYU4ocDIpKSB7XG4gICAgICAgICAgICAgIGQgPSBuID0gTmFOXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIEIgPSBwMS5tYXRjaCgvXFxkK3wuL2cpXG5cbiAgICAgICAgICAgIGlmIChCID09PSBudWxsKSB7IHRocm93SW52YWxpZFBhcmFtKCkgfVxuXG4gICAgICAgICAgICBpZiAoQltBXSA9PT0gJy0nKSB7IC8vIENoZWNrIGZvciBtaW51cyBzaWduIGF0IHRoZSBiZWdpbm5pbmdcbiAgICAgICAgICAgICAgcyA9IC0xXG4gICAgICAgICAgICAgIEErK1xuICAgICAgICAgICAgfSBlbHNlIGlmIChCW0FdID09PSAnKycpIHsgLy8gQ2hlY2sgZm9yIHBsdXMgc2lnbiBhdCB0aGUgYmVnaW5uaW5nXG4gICAgICAgICAgICAgIEErK1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoQi5sZW5ndGggPT09IEEgKyAxKSB7IC8vIENoZWNrIGlmIGl0J3MganVzdCBhIHNpbXBsZSBudW1iZXIgXCIxMjM0XCJcbiAgICAgICAgICAgICAgdyA9IGFzc2lnbihCW0ErK10sIHMpXG4gICAgICAgICAgICB9IGVsc2UgaWYgKEJbQSArIDFdID09PSAnLicgfHwgQltBXSA9PT0gJy4nKSB7IC8vIENoZWNrIGlmIGl0J3MgYSBkZWNpbWFsIG51bWJlclxuICAgICAgICAgICAgICBpZiAoQltBXSAhPT0gJy4nKSB7IC8vIEhhbmRsZSAwLjUgYW5kIC41XG4gICAgICAgICAgICAgICAgdiA9IGFzc2lnbihCW0ErK10sIHMpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgQSsrXG5cbiAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGRlY2ltYWwgcGxhY2VzXG4gICAgICAgICAgICAgIGlmIChBICsgMSA9PT0gQi5sZW5ndGggfHwgQltBICsgMV0gPT09ICcoJyAmJiBCW0EgKyAzXSA9PT0gJyknIHx8IEJbQSArIDFdID09PSBcIidcIiAmJiBCW0EgKyAzXSA9PT0gXCInXCIpIHtcbiAgICAgICAgICAgICAgICB3ID0gYXNzaWduKEJbQV0sIHMpXG4gICAgICAgICAgICAgICAgeSA9IE1hdGgucG93KDEwLCBCW0FdLmxlbmd0aClcbiAgICAgICAgICAgICAgICBBKytcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIENoZWNrIGZvciByZXBlYXRpbmcgcGxhY2VzXG4gICAgICAgICAgICAgIGlmIChCW0FdID09PSAnKCcgJiYgQltBICsgMl0gPT09ICcpJyB8fCBCW0FdID09PSBcIidcIiAmJiBCW0EgKyAyXSA9PT0gXCInXCIpIHtcbiAgICAgICAgICAgICAgICB4ID0gYXNzaWduKEJbQSArIDFdLCBzKVxuICAgICAgICAgICAgICAgIHogPSBNYXRoLnBvdygxMCwgQltBICsgMV0ubGVuZ3RoKSAtIDFcbiAgICAgICAgICAgICAgICBBICs9IDNcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChCW0EgKyAxXSA9PT0gJy8nIHx8IEJbQSArIDFdID09PSAnOicpIHsgLy8gQ2hlY2sgZm9yIGEgc2ltcGxlIGZyYWN0aW9uIFwiMTIzLzQ1NlwiIG9yIFwiMTIzOjQ1NlwiXG4gICAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBXSwgcylcbiAgICAgICAgICAgICAgeSA9IGFzc2lnbihCW0EgKyAyXSwgMSlcbiAgICAgICAgICAgICAgQSArPSAzXG4gICAgICAgICAgICB9IGVsc2UgaWYgKEJbQSArIDNdID09PSAnLycgJiYgQltBICsgMV0gPT09ICcgJykgeyAvLyBDaGVjayBmb3IgYSBjb21wbGV4IGZyYWN0aW9uIFwiMTIzIDEvMlwiXG4gICAgICAgICAgICAgIHYgPSBhc3NpZ24oQltBXSwgcylcbiAgICAgICAgICAgICAgdyA9IGFzc2lnbihCW0EgKyAyXSwgcylcbiAgICAgICAgICAgICAgeSA9IGFzc2lnbihCW0EgKyA0XSwgMSlcbiAgICAgICAgICAgICAgQSArPSA1XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChCLmxlbmd0aCA8PSBBKSB7IC8vIENoZWNrIGZvciBtb3JlIHRva2VucyBvbiB0aGUgc3RhY2tcbiAgICAgICAgICAgICAgZCA9IHkgKiB6XG4gICAgICAgICAgICAgIHMgPSAvKiB2b2lkICovXG4gICAgICAgICAgICAgICAgICAgIG4gPSB4ICsgZCAqIHYgKyB6ICogd1xuICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgLyogRmFsbCB0aHJvdWdoIG9uIGVycm9yICovXG4gICAgICAgICAgfVxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvd0ludmFsaWRQYXJhbSgpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGQgPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IERpdmlzaW9uQnlaZXJvKClcbiAgICAgIH1cblxuICAgICAgUC5zID0gcyA8IDAgPyAtMSA6IDFcbiAgICAgIFAubiA9IE1hdGguYWJzKG4pXG4gICAgICBQLmQgPSBNYXRoLmFicyhkKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vZHBvdyAoYiwgZSwgbSkge1xuICAgICAgdmFyIHIgPSAxXG4gICAgICBmb3IgKDsgZSA+IDA7IGIgPSAoYiAqIGIpICUgbSwgZSA+Pj0gMSkge1xuICAgICAgICBpZiAoZSAmIDEpIHtcbiAgICAgICAgICByID0gKHIgKiBiKSAlIG1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjeWNsZUxlbiAobiwgZCkge1xuICAgICAgZm9yICg7IGQgJSAyID09PSAwO1xuICAgICAgICBkIC89IDIpIHtcbiAgICAgIH1cblxuICAgICAgZm9yICg7IGQgJSA1ID09PSAwO1xuICAgICAgICBkIC89IDUpIHtcbiAgICAgIH1cblxuICAgICAgaWYgKGQgPT09IDEpIC8vIENhdGNoIG5vbi1jeWNsaWMgbnVtYmVyc1xuICAgICAgeyByZXR1cm4gMCB9XG5cbiAgICAgIC8vIElmIHdlIHdvdWxkIGxpa2UgdG8gY29tcHV0ZSByZWFsbHkgbGFyZ2UgbnVtYmVycyBxdWlja2VyLCB3ZSBjb3VsZCBtYWtlIHVzZSBvZiBGZXJtYXQncyBsaXR0bGUgdGhlb3JlbTpcbiAgICAgIC8vIDEwXihkLTEpICUgZCA9PSAxXG4gICAgICAvLyBIb3dldmVyLCB3ZSBkb24ndCBuZWVkIHN1Y2ggbGFyZ2UgbnVtYmVycyBhbmQgTUFYX0NZQ0xFX0xFTiBzaG91bGQgYmUgdGhlIGNhcHN0b25lLFxuICAgICAgLy8gYXMgd2Ugd2FudCB0byB0cmFuc2xhdGUgdGhlIG51bWJlcnMgdG8gc3RyaW5ncy5cblxuICAgICAgdmFyIHJlbSA9IDEwICUgZFxuICAgICAgdmFyIHQgPSAxXG5cbiAgICAgIGZvciAoOyByZW0gIT09IDE7IHQrKykge1xuICAgICAgICByZW0gPSByZW0gKiAxMCAlIGRcblxuICAgICAgICBpZiAodCA+IE1BWF9DWUNMRV9MRU4pIHsgcmV0dXJuIDAgfSAvLyBSZXR1cm5pbmcgMCBoZXJlIG1lYW5zIHRoYXQgd2UgZG9uJ3QgcHJpbnQgaXQgYXMgYSBjeWNsaWMgbnVtYmVyLiBJdCdzIGxpa2VseSB0aGF0IHRoZSBhbnN3ZXIgaXMgYGQtMWBcbiAgICAgIH1cbiAgICAgIHJldHVybiB0XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3ljbGVTdGFydCAobiwgZCwgbGVuKSB7XG4gICAgICB2YXIgcmVtMSA9IDFcbiAgICAgIHZhciByZW0yID0gbW9kcG93KDEwLCBsZW4sIGQpXG5cbiAgICAgIGZvciAodmFyIHQgPSAwOyB0IDwgMzAwOyB0KyspIHsgLy8gcyA8IH5sb2cxMChOdW1iZXIuTUFYX1ZBTFVFKVxuICAgICAgLy8gU29sdmUgMTBecyA9PSAxMF4ocyt0KSAobW9kIGQpXG5cbiAgICAgICAgaWYgKHJlbTEgPT09IHJlbTIpIHsgcmV0dXJuIHQgfVxuXG4gICAgICAgIHJlbTEgPSByZW0xICogMTAgJSBkXG4gICAgICAgIHJlbTIgPSByZW0yICogMTAgJSBkXG4gICAgICB9XG4gICAgICByZXR1cm4gMFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdjZCAoYSwgYikge1xuICAgICAgaWYgKCFhKSB7IHJldHVybiBiIH1cbiAgICAgIGlmICghYikgeyByZXR1cm4gYSB9XG5cbiAgICAgIHdoaWxlICgxKSB7XG4gICAgICAgIGEgJT0gYlxuICAgICAgICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICAgICAgICBiICU9IGFcbiAgICAgICAgaWYgKCFiKSB7IHJldHVybiBhIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAqIE1vZHVsZSBjb25zdHJ1Y3RvclxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtudW1iZXJ8RnJhY3Rpb249fSBhXG4gICAqIEBwYXJhbSB7bnVtYmVyPX0gYlxuICAgKi9cbiAgICBmdW5jdGlvbiBGcmFjdGlvbiAoYSwgYikge1xuICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZyYWN0aW9uKSkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKGEsIGIpXG4gICAgICB9XG5cbiAgICAgIHBhcnNlKGEsIGIpXG5cbiAgICAgIGlmIChGcmFjdGlvbi5SRURVQ0UpIHtcbiAgICAgICAgYSA9IGdjZChQLmQsIFAubikgLy8gQWJ1c2UgYVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYSA9IDFcbiAgICAgIH1cblxuICAgICAgdGhpcy5zID0gUC5zXG4gICAgICB0aGlzLm4gPSBQLm4gLyBhXG4gICAgICB0aGlzLmQgPSBQLmQgLyBhXG4gICAgfVxuXG4gICAgLyoqXG4gICAqIEJvb2xlYW4gZ2xvYmFsIHZhcmlhYmxlIHRvIGJlIGFibGUgdG8gZGlzYWJsZSBhdXRvbWF0aWMgcmVkdWN0aW9uIG9mIHRoZSBmcmFjdGlvblxuICAgKlxuICAgKi9cbiAgICBGcmFjdGlvbi5SRURVQ0UgPSAxXG5cbiAgICBGcmFjdGlvbi5wcm90b3R5cGUgPSB7XG5cbiAgICAgIHM6IDEsXG4gICAgICBuOiAwLFxuICAgICAgZDogMSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgYWJzb2x1dGUgdmFsdWVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oLTQpLmFicygpID0+IDRcbiAgICAgKiovXG4gICAgICBhYnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzLm4sIHRoaXMuZClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIEludmVydHMgdGhlIHNpZ24gb2YgdGhlIGN1cnJlbnQgZnJhY3Rpb25cbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oLTQpLm5lZygpID0+IDRcbiAgICAgKiovXG4gICAgICBuZWc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbigtdGhpcy5zICogdGhpcy5uLCB0aGlzLmQpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBBZGRzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKHtuOiAyLCBkOiAzfSkuYWRkKFwiMTQuOVwiKSA9PiA0NjcgLyAzMFxuICAgICAqKi9cbiAgICAgIGFkZDogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICB0aGlzLnMgKiB0aGlzLm4gKiBQLmQgKyBQLnMgKiB0aGlzLmQgKiBQLm4sXG4gICAgICAgICAgdGhpcy5kICogUC5kXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFN1YnRyYWN0cyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbih7bjogMiwgZDogM30pLmFkZChcIjE0LjlcIikgPT4gLTQyNyAvIDMwXG4gICAgICoqL1xuICAgICAgc3ViOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIHRoaXMubiAqIFAuZCAtIFAucyAqIHRoaXMuZCAqIFAubixcbiAgICAgICAgICB0aGlzLmQgKiBQLmRcbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogTXVsdGlwbGllcyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIi0xNy4oMzQ1KVwiKS5tdWwoMykgPT4gNTc3NiAvIDExMVxuICAgICAqKi9cbiAgICAgIG11bDogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICB0aGlzLnMgKiBQLnMgKiB0aGlzLm4gKiBQLm4sXG4gICAgICAgICAgdGhpcy5kICogUC5kXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIERpdmlkZXMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCItMTcuKDM0NSlcIikuaW52ZXJzZSgpLmRpdigzKVxuICAgICAqKi9cbiAgICAgIGRpdjogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICB0aGlzLnMgKiBQLnMgKiB0aGlzLm4gKiBQLmQsXG4gICAgICAgICAgdGhpcy5kICogUC5uXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENsb25lcyB0aGUgYWN0dWFsIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIi0xNy4oMzQ1KVwiKS5jbG9uZSgpXG4gICAgICoqL1xuICAgICAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgbW9kdWxvIG9mIHR3byByYXRpb25hbCBudW1iZXJzIC0gYSBtb3JlIHByZWNpc2UgZm1vZFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5tb2QoWzcsIDhdKSA9PiAoMTMvMykgJSAoNy84KSA9ICg1LzYpXG4gICAgICoqL1xuICAgICAgbW9kOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzLnMgKiB0aGlzLm4gJSB0aGlzLmQsIDEpXG4gICAgICAgIH1cblxuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICBpZiAoUC5uID09PSAwICYmIHRoaXMuZCA9PT0gMCkge1xuICAgICAgICAgIEZyYWN0aW9uKDAsIDApIC8vIFRocm93IERpdmlzaW9uQnlaZXJvXG4gICAgICAgIH1cblxuICAgICAgICAvKlxuICAgICAgICogRmlyc3Qgc2lsbHkgYXR0ZW1wdCwga2luZGEgc2xvd1xuICAgICAgICpcbiAgICAgICByZXR1cm4gdGhhdFtcInN1YlwiXSh7XG4gICAgICAgXCJuXCI6IG51bVtcIm5cIl0gKiBNYXRoLmZsb29yKCh0aGlzLm4gLyB0aGlzLmQpIC8gKG51bS5uIC8gbnVtLmQpKSxcbiAgICAgICBcImRcIjogbnVtW1wiZFwiXSxcbiAgICAgICBcInNcIjogdGhpc1tcInNcIl1cbiAgICAgICB9KTsgKi9cblxuICAgICAgICAvKlxuICAgICAgICogTmV3IGF0dGVtcHQ6IGExIC8gYjEgPSBhMiAvIGIyICogcSArIHJcbiAgICAgICAqID0+IGIyICogYTEgPSBhMiAqIGIxICogcSArIGIxICogYjIgKiByXG4gICAgICAgKiA9PiAoYjIgKiBhMSAlIGEyICogYjEpIC8gKGIxICogYjIpXG4gICAgICAgKi9cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICB0aGlzLnMgKiAoUC5kICogdGhpcy5uKSAlIChQLm4gKiB0aGlzLmQpLFxuICAgICAgICAgIFAuZCAqIHRoaXMuZFxuICAgICAgICApXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmcmFjdGlvbmFsIGdjZCBvZiB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbig1LDgpLmdjZCgzLDcpID0+IDEvNTZcbiAgICAgKi9cbiAgICAgIGdjZDogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcblxuICAgICAgICAvLyBnY2QoYSAvIGIsIGMgLyBkKSA9IGdjZChhLCBjKSAvIGxjbShiLCBkKVxuXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oZ2NkKFAubiwgdGhpcy5uKSAqIGdjZChQLmQsIHRoaXMuZCksIFAuZCAqIHRoaXMuZClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZyYWN0aW9uYWwgbGNtIG9mIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDUsOCkubGNtKDMsNykgPT4gMTVcbiAgICAgKi9cbiAgICAgIGxjbTogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcblxuICAgICAgICAvLyBsY20oYSAvIGIsIGMgLyBkKSA9IGxjbShhLCBjKSAvIGdjZChiLCBkKVxuXG4gICAgICAgIGlmIChQLm4gPT09IDAgJiYgdGhpcy5uID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbigpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihQLm4gKiB0aGlzLm4sIGdjZChQLm4sIHRoaXMubikgKiBnY2QoUC5kLCB0aGlzLmQpKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgY2VpbCBvZiBhIHJhdGlvbmFsIG51bWJlclxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5jZWlsKCkgPT4gKDUgLyAxKVxuICAgICAqKi9cbiAgICAgIGNlaWw6IGZ1bmN0aW9uIChwbGFjZXMpIHtcbiAgICAgICAgcGxhY2VzID0gTWF0aC5wb3coMTAsIHBsYWNlcyB8fCAwKVxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGguY2VpbChwbGFjZXMgKiB0aGlzLnMgKiB0aGlzLm4gLyB0aGlzLmQpLCBwbGFjZXMpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmbG9vciBvZiBhIHJhdGlvbmFsIG51bWJlclxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5mbG9vcigpID0+ICg0IC8gMSlcbiAgICAgKiovXG4gICAgICBmbG9vcjogZnVuY3Rpb24gKHBsYWNlcykge1xuICAgICAgICBwbGFjZXMgPSBNYXRoLnBvdygxMCwgcGxhY2VzIHx8IDApXG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5mbG9vcihwbGFjZXMgKiB0aGlzLnMgKiB0aGlzLm4gLyB0aGlzLmQpLCBwbGFjZXMpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBSb3VuZHMgYSByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLnJvdW5kKCkgPT4gKDQgLyAxKVxuICAgICAqKi9cbiAgICAgIHJvdW5kOiBmdW5jdGlvbiAocGxhY2VzKSB7XG4gICAgICAgIHBsYWNlcyA9IE1hdGgucG93KDEwLCBwbGFjZXMgfHwgMClcblxuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLnJvdW5kKHBsYWNlcyAqIHRoaXMucyAqIHRoaXMubiAvIHRoaXMuZCksIHBsYWNlcylcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGludmVyc2Ugb2YgdGhlIGZyYWN0aW9uLCBtZWFucyBudW1lcmF0b3IgYW5kIGRlbnVtZXJhdG9yIGFyZSBleGNoYW5nZWRcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oWy0zLCA0XSkuaW52ZXJzZSgpID0+IC00IC8gM1xuICAgICAqKi9cbiAgICAgIGludmVyc2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzLnMgKiB0aGlzLmQsIHRoaXMubilcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZyYWN0aW9uIHRvIHNvbWUgaW50ZWdlciBleHBvbmVudFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigtMSwyKS5wb3coLTMpID0+IC04XG4gICAgICovXG4gICAgICBwb3c6IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIGlmIChtIDwgMCkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5wb3codGhpcy5zICogdGhpcy5kLCAtbSksIE1hdGgucG93KHRoaXMubiwgLW0pKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5wb3codGhpcy5zICogdGhpcy5uLCBtKSwgTWF0aC5wb3codGhpcy5kLCBtKSlcbiAgICAgICAgfVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdHdvIHJhdGlvbmFsIG51bWJlcnMgYXJlIHRoZSBzYW1lXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDE5LjYpLmVxdWFscyhbOTgsIDVdKTtcbiAgICAgKiovXG4gICAgICBlcXVhbHM6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiB0aGlzLnMgKiB0aGlzLm4gKiBQLmQgPT09IFAucyAqIFAubiAqIHRoaXMuZCAvLyBTYW1lIGFzIGNvbXBhcmUoKSA9PT0gMFxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdHdvIHJhdGlvbmFsIG51bWJlcnMgYXJlIHRoZSBzYW1lXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDE5LjYpLmVxdWFscyhbOTgsIDVdKTtcbiAgICAgKiovXG4gICAgICBjb21wYXJlOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICB2YXIgdCA9ICh0aGlzLnMgKiB0aGlzLm4gKiBQLmQgLSBQLnMgKiBQLm4gKiB0aGlzLmQpXG4gICAgICAgIHJldHVybiAodCA+IDApIC0gKHQgPCAwKVxuICAgICAgfSxcblxuICAgICAgc2ltcGxpZnk6IGZ1bmN0aW9uIChlcHMpIHtcbiAgICAgIC8vIEZpcnN0IG5haXZlIGltcGxlbWVudGF0aW9uLCBuZWVkcyBpbXByb3ZlbWVudFxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNvbnQgPSB0aGlzLmFicygpLnRvQ29udGludWVkKClcblxuICAgICAgICBlcHMgPSBlcHMgfHwgMC4wMDFcblxuICAgICAgICBmdW5jdGlvbiByZWMgKGEpIHtcbiAgICAgICAgICBpZiAoYS5sZW5ndGggPT09IDEpIHsgcmV0dXJuIG5ldyBGcmFjdGlvbihhWzBdKSB9XG4gICAgICAgICAgcmV0dXJuIHJlYyhhLnNsaWNlKDEpKS5pbnZlcnNlKCkuYWRkKGFbMF0pXG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbnQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB2YXIgdG1wID0gcmVjKGNvbnQuc2xpY2UoMCwgaSArIDEpKVxuICAgICAgICAgIGlmICh0bXAuc3ViKHRoaXMuYWJzKCkpLmFicygpLnZhbHVlT2YoKSA8IGVwcykge1xuICAgICAgICAgICAgcmV0dXJuIHRtcC5tdWwodGhpcy5zKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdHdvIHJhdGlvbmFsIG51bWJlcnMgYXJlIGRpdmlzaWJsZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigxOS42KS5kaXZpc2libGUoMS41KTtcbiAgICAgKi9cbiAgICAgIGRpdmlzaWJsZTogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuICEoIShQLm4gKiB0aGlzLmQpIHx8ICgodGhpcy5uICogUC5kKSAlIChQLm4gKiB0aGlzLmQpKSlcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBkZWNpbWFsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBmcmFjdGlvblxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEwMC4nOTE4MjMnXCIpLnZhbHVlT2YoKSA9PiAxMDAuOTE4MjM5MTgyMzkxODNcbiAgICAgKiovXG4gICAgICB2YWx1ZU9mOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnMgKiB0aGlzLm4gLyB0aGlzLmRcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBzdHJpbmctZnJhY3Rpb24gcmVwcmVzZW50YXRpb24gb2YgYSBGcmFjdGlvbiBvYmplY3RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxLiczJ1wiKS50b0ZyYWN0aW9uKCkgPT4gXCI0IDEvM1wiXG4gICAgICoqL1xuICAgICAgdG9GcmFjdGlvbjogZnVuY3Rpb24gKGV4Y2x1ZGVXaG9sZSkge1xuICAgICAgICB2YXIgd2hvbGU7IHZhciBzdHIgPSAnJ1xuICAgICAgICB2YXIgbiA9IHRoaXMublxuICAgICAgICB2YXIgZCA9IHRoaXMuZFxuICAgICAgICBpZiAodGhpcy5zIDwgMCkge1xuICAgICAgICAgIHN0ciArPSAnLSdcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkID09PSAxKSB7XG4gICAgICAgICAgc3RyICs9IG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZXhjbHVkZVdob2xlICYmICh3aG9sZSA9IE1hdGguZmxvb3IobiAvIGQpKSA+IDApIHtcbiAgICAgICAgICAgIHN0ciArPSB3aG9sZVxuICAgICAgICAgICAgc3RyICs9ICcgJ1xuICAgICAgICAgICAgbiAlPSBkXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc3RyICs9IG5cbiAgICAgICAgICBzdHIgKz0gJy8nXG4gICAgICAgICAgc3RyICs9IGRcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RyXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgbGF0ZXggcmVwcmVzZW50YXRpb24gb2YgYSBGcmFjdGlvbiBvYmplY3RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxLiczJ1wiKS50b0xhdGV4KCkgPT4gXCJcXGZyYWN7NH17M31cIlxuICAgICAqKi9cbiAgICAgIHRvTGF0ZXg6IGZ1bmN0aW9uIChleGNsdWRlV2hvbGUpIHtcbiAgICAgICAgdmFyIHdob2xlOyB2YXIgc3RyID0gJydcbiAgICAgICAgdmFyIG4gPSB0aGlzLm5cbiAgICAgICAgdmFyIGQgPSB0aGlzLmRcbiAgICAgICAgaWYgKHRoaXMucyA8IDApIHtcbiAgICAgICAgICBzdHIgKz0gJy0nXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZCA9PT0gMSkge1xuICAgICAgICAgIHN0ciArPSBuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGV4Y2x1ZGVXaG9sZSAmJiAod2hvbGUgPSBNYXRoLmZsb29yKG4gLyBkKSkgPiAwKSB7XG4gICAgICAgICAgICBzdHIgKz0gd2hvbGVcbiAgICAgICAgICAgIG4gJT0gZFxuICAgICAgICAgIH1cblxuICAgICAgICAgIHN0ciArPSAnXFxcXGZyYWN7J1xuICAgICAgICAgIHN0ciArPSBuXG4gICAgICAgICAgc3RyICs9ICd9eydcbiAgICAgICAgICBzdHIgKz0gZFxuICAgICAgICAgIHN0ciArPSAnfSdcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RyXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIGNvbnRpbnVlZCBmcmFjdGlvbiBlbGVtZW50c1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjcvOFwiKS50b0NvbnRpbnVlZCgpID0+IFswLDEsN11cbiAgICAgKi9cbiAgICAgIHRvQ29udGludWVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0XG4gICAgICAgIHZhciBhID0gdGhpcy5uXG4gICAgICAgIHZhciBiID0gdGhpcy5kXG4gICAgICAgIHZhciByZXMgPSBbXVxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gcmVzXG4gICAgICAgIH1cblxuICAgICAgICBkbyB7XG4gICAgICAgICAgcmVzLnB1c2goTWF0aC5mbG9vcihhIC8gYikpXG4gICAgICAgICAgdCA9IGEgJSBiXG4gICAgICAgICAgYSA9IGJcbiAgICAgICAgICBiID0gdFxuICAgICAgICB9IHdoaWxlIChhICE9PSAxKVxuXG4gICAgICAgIHJldHVybiByZXNcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYSBmcmFjdGlvbiB3aXRoIGFsbCBkaWdpdHNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxMDAuJzkxODIzJ1wiKS50b1N0cmluZygpID0+IFwiMTAwLig5MTgyMylcIlxuICAgICAqKi9cbiAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoZGVjKSB7XG4gICAgICAgIHZhciBnXG4gICAgICAgIHZhciBOID0gdGhpcy5uXG4gICAgICAgIHZhciBEID0gdGhpcy5kXG5cbiAgICAgICAgaWYgKGlzTmFOKE4pIHx8IGlzTmFOKEQpKSB7XG4gICAgICAgICAgcmV0dXJuICdOYU4nXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIUZyYWN0aW9uLlJFRFVDRSkge1xuICAgICAgICAgIGcgPSBnY2QoTiwgRClcbiAgICAgICAgICBOIC89IGdcbiAgICAgICAgICBEIC89IGdcbiAgICAgICAgfVxuXG4gICAgICAgIGRlYyA9IGRlYyB8fCAxNSAvLyAxNSA9IGRlY2ltYWwgcGxhY2VzIHdoZW4gbm8gcmVwaXRhdGlvblxuXG4gICAgICAgIHZhciBjeWNMZW4gPSBjeWNsZUxlbihOLCBEKSAvLyBDeWNsZSBsZW5ndGhcbiAgICAgICAgdmFyIGN5Y09mZiA9IGN5Y2xlU3RhcnQoTiwgRCwgY3ljTGVuKSAvLyBDeWNsZSBzdGFydFxuXG4gICAgICAgIHZhciBzdHIgPSB0aGlzLnMgPT09IC0xID8gJy0nIDogJydcblxuICAgICAgICBzdHIgKz0gTiAvIEQgfCAwXG5cbiAgICAgICAgTiAlPSBEXG4gICAgICAgIE4gKj0gMTBcblxuICAgICAgICBpZiAoTikgeyBzdHIgKz0gJy4nIH1cblxuICAgICAgICBpZiAoY3ljTGVuKSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IGN5Y09mZjsgaS0tOykge1xuICAgICAgICAgICAgc3RyICs9IE4gLyBEIHwgMFxuICAgICAgICAgICAgTiAlPSBEXG4gICAgICAgICAgICBOICo9IDEwXG4gICAgICAgICAgfVxuICAgICAgICAgIHN0ciArPSAnKCdcbiAgICAgICAgICBmb3IgKHZhciBpID0gY3ljTGVuOyBpLS07KSB7XG4gICAgICAgICAgICBzdHIgKz0gTiAvIEQgfCAwXG4gICAgICAgICAgICBOICU9IERcbiAgICAgICAgICAgIE4gKj0gMTBcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RyICs9ICcpJ1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZvciAodmFyIGkgPSBkZWM7IE4gJiYgaS0tOykge1xuICAgICAgICAgICAgc3RyICs9IE4gLyBEIHwgMFxuICAgICAgICAgICAgTiAlPSBEXG4gICAgICAgICAgICBOICo9IDEwXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHJcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHVuZGVmaW5lZCA9PT0gJ2Z1bmN0aW9uJyAmJiB1bmRlZmluZWQuYW1kKSB7XG4gICAgICB1bmRlZmluZWQoW10sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIEZyYWN0aW9uXG4gICAgICB9KVxuICAgIH0gZWxzZSBpZiAoJ29iamVjdCcgPT09ICdvYmplY3QnKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pXG4gICAgICBGcmFjdGlvbi5kZWZhdWx0ID0gRnJhY3Rpb25cbiAgICAgIEZyYWN0aW9uLkZyYWN0aW9uID0gRnJhY3Rpb25cbiAgICAgIG1vZHVsZS5leHBvcnRzID0gRnJhY3Rpb25cbiAgICB9IGVsc2Uge1xuICAgICAgcm9vdC5GcmFjdGlvbiA9IEZyYWN0aW9uXG4gICAgfVxuICB9KShjb21tb25qc0hlbHBlcnMuY29tbW9uanNHbG9iYWwpXG59KVxuXG5leHBvcnQgZGVmYXVsdCAvKiBAX19QVVJFX18gKi9jb21tb25qc0hlbHBlcnMuZ2V0RGVmYXVsdEV4cG9ydEZyb21DanMoZnJhY3Rpb24pXG5leHBvcnQgeyBmcmFjdGlvbiBhcyBfX21vZHVsZUV4cG9ydHMgfVxuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgTW9ub21pYWwge1xuICBjb25zdHJ1Y3RvciAoYywgdnMpIHtcbiAgICBpZiAoIWlzTmFOKGMpICYmIHZzIGluc3RhbmNlb2YgTWFwKSB7XG4gICAgICB0aGlzLmMgPSBjXG4gICAgICB0aGlzLnZzID0gdnNcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBjID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5pbml0U3RyKGMpXG4gICAgfSBlbHNlIGlmICghaXNOYU4oYykpIHtcbiAgICAgIHRoaXMuYyA9IGNcbiAgICAgIHRoaXMudnMgPSBuZXcgTWFwKClcbiAgICB9IGVsc2UgeyAvLyBkZWZhdWx0IGFzIGEgdGVzdDogNHheMnlcbiAgICAgIHRoaXMuYyA9IDRcbiAgICAgIHRoaXMudnMgPSBuZXcgTWFwKFtbJ3gnLCAyXSwgWyd5JywgMV1dKVxuICAgIH1cbiAgfVxuXG4gIGNsb25lICgpIHtcbiAgICBjb25zdCB2cyA9IG5ldyBNYXAodGhpcy52cylcbiAgICByZXR1cm4gbmV3IE1vbm9taWFsKHRoaXMuYywgdnMpXG4gIH1cblxuICBtdWwgKHRoYXQpIHtcbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IE1vbm9taWFsKHRoYXQpXG4gICAgfVxuICAgIGNvbnN0IGMgPSB0aGlzLmMgKiB0aGF0LmNcbiAgICBsZXQgdnMgPSBuZXcgTWFwKClcbiAgICB0aGlzLnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKHRoYXQudnMuaGFzKHZhcmlhYmxlKSkge1xuICAgICAgICB2cy5zZXQodmFyaWFibGUsIHRoaXMudnMuZ2V0KHZhcmlhYmxlKSArIHRoYXQudnMuZ2V0KHZhcmlhYmxlKSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZzLnNldCh2YXJpYWJsZSwgdGhpcy52cy5nZXQodmFyaWFibGUpKVxuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGF0LnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKCF2cy5oYXModmFyaWFibGUpKSB7XG4gICAgICAgIHZzLnNldCh2YXJpYWJsZSwgdGhhdC52cy5nZXQodmFyaWFibGUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgdnMgPSBuZXcgTWFwKFsuLi52cy5lbnRyaWVzKCldLnNvcnQoKSlcbiAgICByZXR1cm4gbmV3IE1vbm9taWFsKGMsIHZzKVxuICB9XG5cbiAgdG9MYXRleCAoKSB7XG4gICAgaWYgKHRoaXMudnMuc2l6ZSA9PT0gMCkgcmV0dXJuIHRoaXMuYy50b1N0cmluZygpXG4gICAgbGV0IHN0ciA9IHRoaXMuYyA9PT0gMSA/ICcnXG4gICAgICA6IHRoaXMuYyA9PT0gLTEgPyAnLSdcbiAgICAgICAgOiB0aGlzLmMudG9TdHJpbmcoKVxuICAgIHRoaXMudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAoaW5kZXggPT09IDEpIHtcbiAgICAgICAgc3RyICs9IHZhcmlhYmxlXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgKz0gdmFyaWFibGUgKyAnXicgKyBpbmRleFxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIHN0clxuICB9XG5cbiAgc29ydCAoKSB7XG4gICAgLy8gc29ydHMgKG1vZGlmaWVzIG9iamVjdClcbiAgICB0aGlzLnZzID0gbmV3IE1hcChbLi4udGhpcy52cy5lbnRyaWVzKCldLnNvcnQoKSlcbiAgfVxuXG4gIGNsZWFuWmVyb3MgKCkge1xuICAgIHRoaXMudnMuZm9yRWFjaCgoaWR4LCB2KSA9PiB7XG4gICAgICBpZiAoaWR4ID09PSAwKSB0aGlzLnZzLmRlbGV0ZSh2KVxuICAgIH0pXG4gIH1cblxuICBsaWtlICh0aGF0KSB7XG4gICAgLy8gcmV0dXJuIHRydWUgaWYgbGlrZSB0ZXJtcywgZmFsc2UgaWYgb3RoZXJ3aXNlXG4gICAgLy8gbm90IHRoZSBtb3N0IGVmZmljaWVudCBhdCB0aGUgbW9tZW50LCBidXQgZ29vZCBlbm91Z2guXG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIE1vbm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBNb25vbWlhbCh0aGF0KVxuICAgIH1cblxuICAgIGxldCBsaWtlID0gdHJ1ZVxuICAgIHRoaXMudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAoIXRoYXQudnMuaGFzKHZhcmlhYmxlKSB8fCB0aGF0LnZzLmdldCh2YXJpYWJsZSkgIT09IGluZGV4KSB7XG4gICAgICAgIGxpa2UgPSBmYWxzZVxuICAgICAgfVxuICAgIH0pXG4gICAgdGhhdC52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICghdGhpcy52cy5oYXModmFyaWFibGUpIHx8IHRoaXMudnMuZ2V0KHZhcmlhYmxlKSAhPT0gaW5kZXgpIHtcbiAgICAgICAgbGlrZSA9IGZhbHNlXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gbGlrZVxuICB9XG5cbiAgYWRkICh0aGF0LCBjaGVja0xpa2UpIHtcbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IE1vbm9taWFsKHRoYXQpXG4gICAgfVxuICAgIC8vIGFkZHMgdHdvIGNvbXBhdGlibGUgbW9ub21pYWxzXG4gICAgLy8gY2hlY2tMaWtlIChkZWZhdWx0IHRydWUpIHdpbGwgY2hlY2sgZmlyc3QgaWYgdGhleSBhcmUgbGlrZSBhbmQgdGhyb3cgYW4gZXhjZXB0aW9uXG4gICAgLy8gdW5kZWZpbmVkIGJlaGF2aW91ciBpZiBjaGVja0xpa2UgaXMgZmFsc2VcbiAgICBpZiAoY2hlY2tMaWtlID09PSB1bmRlZmluZWQpIGNoZWNrTGlrZSA9IHRydWVcbiAgICBpZiAoY2hlY2tMaWtlICYmICF0aGlzLmxpa2UodGhhdCkpIHRocm93IG5ldyBFcnJvcignQWRkaW5nIHVubGlrZSB0ZXJtcycpXG4gICAgY29uc3QgYyA9IHRoaXMuYyArIHRoYXQuY1xuICAgIGNvbnN0IHZzID0gdGhpcy52c1xuICAgIHJldHVybiBuZXcgTW9ub21pYWwoYywgdnMpXG4gIH1cblxuICBpbml0U3RyIChzdHIpIHtcbiAgICAvLyBjdXJyZW50bHkgbm8gZXJyb3IgY2hlY2tpbmcgYW5kIGZyYWdpbGVcbiAgICAvLyBUaGluZ3Mgbm90IHRvIHBhc3MgaW46XG4gICAgLy8gIHplcm8gaW5kaWNlc1xuICAgIC8vICBtdWx0aS1jaGFyYWN0ZXIgdmFyaWFibGVzXG4gICAgLy8gIG5lZ2F0aXZlIGluZGljZXNcbiAgICAvLyAgbm9uLWludGVnZXIgY29lZmZpY2llbnRzXG4gICAgY29uc3QgbGVhZCA9IHN0ci5tYXRjaCgvXi0/XFxkKi8pWzBdXG4gICAgY29uc3QgYyA9IGxlYWQgPT09ICcnID8gMVxuICAgICAgOiBsZWFkID09PSAnLScgPyAtMVxuICAgICAgICA6IHBhcnNlSW50KGxlYWQpXG4gICAgbGV0IHZzID0gc3RyLm1hdGNoKC8oW2EtekEtWl0pKFxcXlxcZCspPy9nKVxuICAgIGlmICghdnMpIHZzID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCB2ID0gdnNbaV0uc3BsaXQoJ14nKVxuICAgICAgdlsxXSA9IHZbMV0gPyBwYXJzZUludCh2WzFdKSA6IDFcbiAgICAgIHZzW2ldID0gdlxuICAgIH1cbiAgICB2cyA9IHZzLmZpbHRlcih2ID0+IHZbMV0gIT09IDApXG4gICAgdGhpcy5jID0gY1xuICAgIHRoaXMudnMgPSBuZXcgTWFwKHZzKVxuICB9XG5cbiAgc3RhdGljIHZhciAodikge1xuICAgIC8vIGZhY3RvcnkgZm9yIGEgc2luZ2xlIHZhcmlhYmxlIG1vbm9taWFsXG4gICAgY29uc3QgYyA9IDFcbiAgICBjb25zdCB2cyA9IG5ldyBNYXAoW1t2LCAxXV0pXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbChjLCB2cylcbiAgfVxufVxuIiwiaW1wb3J0IE1vbm9taWFsIGZyb20gJ01vbm9taWFsJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQb2x5bm9taWFsIHtcbiAgY29uc3RydWN0b3IgKHRlcm1zKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGVybXMpICYmICh0ZXJtc1swXSBpbnN0YW5jZW9mIE1vbm9taWFsKSkge1xuICAgICAgdGVybXMubWFwKHQgPT4gdC5jbG9uZSgpKVxuICAgICAgdGhpcy50ZXJtcyA9IHRlcm1zXG4gICAgfSBlbHNlIGlmICghaXNOYU4odGVybXMpKSB7XG4gICAgICB0aGlzLmluaXROdW0odGVybXMpXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGVybXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmluaXRTdHIodGVybXMpXG4gICAgfVxuICB9XG5cbiAgaW5pdFN0ciAoc3RyKSB7XG4gICAgc3RyID0gc3RyLnJlcGxhY2UoL1xcKy0vZywgJy0nKSAvLyBhIGhvcnJpYmxlIGJvZGdlXG4gICAgc3RyID0gc3RyLnJlcGxhY2UoLy0vZywgJystJykgLy8gbWFrZSBuZWdhdGl2ZSB0ZXJtcyBleHBsaWNpdC5cbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvXFxzL2csICcnKSAvLyBzdHJpcCB3aGl0ZXNwYWNlXG4gICAgdGhpcy50ZXJtcyA9IHN0ci5zcGxpdCgnKycpXG4gICAgICAubWFwKHMgPT4gbmV3IE1vbm9taWFsKHMpKVxuICAgICAgLmZpbHRlcih0ID0+IHQuYyAhPT0gMClcbiAgfVxuXG4gIGluaXROdW0gKG4pIHtcbiAgICB0aGlzLnRlcm1zID0gW25ldyBNb25vbWlhbChuKV1cbiAgfVxuXG4gIHRvTGF0ZXggKCkge1xuICAgIGxldCBzdHIgPSAnJ1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50ZXJtcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGkgPiAwICYmIHRoaXMudGVybXNbaV0uYyA+PSAwKSB7XG4gICAgICAgIHN0ciArPSAnKydcbiAgICAgIH1cbiAgICAgIHN0ciArPSB0aGlzLnRlcm1zW2ldLnRvTGF0ZXgoKVxuICAgIH1cbiAgICByZXR1cm4gc3RyXG4gIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuIHRoaXMudG9MYVRlWCgpXG4gIH1cblxuICBjbG9uZSAoKSB7XG4gICAgY29uc3QgdGVybXMgPSB0aGlzLnRlcm1zLm1hcCh0ID0+IHQuY2xvbmUoKSlcbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwodGVybXMpXG4gIH1cblxuICBzaW1wbGlmeSAoKSB7XG4gICAgLy8gY29sbGVjdHMgbGlrZSB0ZXJtcyBhbmQgcmVtb3ZlcyB6ZXJvIHRlcm1zXG4gICAgLy8gZG9lcyBub3QgbW9kaWZ5IG9yaWdpbmFsXG4gICAgLy8gVGhpcyBzZWVtcyBwcm9iYWJseSBpbmVmZmljaWVudCwgZ2l2ZW4gdGhlIGRhdGEgc3RydWN0dXJlXG4gICAgLy8gV291bGQgYmUgYmV0dGVyIHRvIHVzZSBzb21ldGhpbmcgbGlrZSBhIGxpbmtlZCBsaXN0IG1heWJlP1xuICAgIGNvbnN0IHRlcm1zID0gdGhpcy50ZXJtcy5zbGljZSgpXG4gICAgbGV0IG5ld3Rlcm1zID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRlcm1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIXRlcm1zW2ldKSBjb250aW51ZVxuICAgICAgbGV0IG5ld3Rlcm0gPSB0ZXJtc1tpXVxuICAgICAgZm9yIChsZXQgaiA9IGkgKyAxOyBqIDwgdGVybXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKCF0ZXJtc1tqXSkgY29udGludWVcbiAgICAgICAgaWYgKHRlcm1zW2pdLmxpa2UodGVybXNbaV0pKSB7XG4gICAgICAgICAgbmV3dGVybSA9IG5ld3Rlcm0uYWRkKHRlcm1zW2pdKVxuICAgICAgICAgIHRlcm1zW2pdID0gbnVsbFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBuZXd0ZXJtcy5wdXNoKG5ld3Rlcm0pXG4gICAgICB0ZXJtc1tpXSA9IG51bGxcbiAgICB9XG4gICAgbmV3dGVybXMgPSBuZXd0ZXJtcy5maWx0ZXIodCA9PiB0LmMgIT09IDApXG4gICAgcmV0dXJuIG5ldyBQb2x5bm9taWFsKG5ld3Rlcm1zKVxuICB9XG5cbiAgYWRkICh0aGF0LCBzaW1wbGlmeSkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBQb2x5bm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBQb2x5bm9taWFsKHRoYXQpXG4gICAgfVxuICAgIGlmIChzaW1wbGlmeSA9PT0gdW5kZWZpbmVkKSBzaW1wbGlmeSA9IHRydWVcbiAgICBjb25zdCB0ZXJtcyA9IHRoaXMudGVybXMuY29uY2F0KHRoYXQudGVybXMpXG4gICAgbGV0IHJlc3VsdCA9IG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuXG4gICAgaWYgKHNpbXBsaWZ5KSByZXN1bHQgPSByZXN1bHQuc2ltcGxpZnkoKVxuXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG5cbiAgbXVsICh0aGF0LCBzaW1wbGlmeSkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBQb2x5bm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBQb2x5bm9taWFsKHRoYXQpXG4gICAgfVxuICAgIGNvbnN0IHRlcm1zID0gW11cbiAgICBpZiAoc2ltcGxpZnkgPT09IHVuZGVmaW5lZCkgc2ltcGxpZnkgPSB0cnVlXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRlcm1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHRoYXQudGVybXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdGVybXMucHVzaCh0aGlzLnRlcm1zW2ldLm11bCh0aGF0LnRlcm1zW2pdKSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgcmVzdWx0ID0gbmV3IFBvbHlub21pYWwodGVybXMpXG4gICAgaWYgKHNpbXBsaWZ5KSByZXN1bHQgPSByZXN1bHQuc2ltcGxpZnkoKVxuXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG5cbiAgcG93IChuLCBzaW1wbGlmeSkge1xuICAgIGxldCByZXN1bHQgPSB0aGlzXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBuOyBpKyspIHtcbiAgICAgIHJlc3VsdCA9IHJlc3VsdC5tdWwodGhpcylcbiAgICB9XG4gICAgaWYgKHNpbXBsaWZ5KSByZXN1bHQgPSByZXN1bHQuc2ltcGxpZnkoKVxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIHN0YXRpYyB2YXIgKHYpIHtcbiAgICAvLyBmYWN0b3J5IGZvciBhIHNpbmdsZSB2YXJpYWJsZSBwb2x5bm9taWFsXG4gICAgY29uc3QgdGVybXMgPSBbTW9ub21pYWwudmFyKHYpXVxuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbCh0ZXJtcylcbiAgfVxuXG4gIHN0YXRpYyB4ICgpIHtcbiAgICByZXR1cm4gUG9seW5vbWlhbC52YXIoJ3gnKVxuICB9XG5cbiAgc3RhdGljIGNvbnN0IChuKSB7XG4gICAgcmV0dXJuIG5ldyBQb2x5bm9taWFsKG4pXG4gIH1cbn1cbiIsImltcG9ydCB7IEdyYXBoaWNRLCBHcmFwaGljUVZpZXcgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCBGcmFjdGlvbiBmcm9tICd2ZW5kb3IvZnJhY3Rpb24nXG5pbXBvcnQgUG9seW5vbWlhbCBmcm9tICdQb2x5bm9taWFsJ1xuaW1wb3J0IHsgcmFuZEVsZW0sIHJhbmRCZXR3ZWVuLCByYW5kQmV0d2VlbkZpbHRlciwgZ2NkIH0gZnJvbSAndXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBcml0aG1hZ29uUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKSAvLyBwcm9jZXNzZXMgb3B0aW9ucyBpbnRvIHRoaXMuc2V0dGluZ3NcbiAgICB0aGlzLmRhdGEgPSBuZXcgQXJpdGhtYWdvblFEYXRhKHRoaXMuc2V0dGluZ3MpXG4gICAgdGhpcy52aWV3ID0gbmV3IEFyaXRobWFnb25RVmlldyh0aGlzLmRhdGEsIHRoaXMuc2V0dGluZ3MpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHsgcmV0dXJuICdDb21wbGV0ZSB0aGUgYXJpdGhtYWdvbjonIH1cbn1cblxuQXJpdGhtYWdvblEub3B0aW9uc1NwZWMgPSBbXG4gIHtcbiAgICB0aXRsZTogJ1ZlcnRpY2VzJyxcbiAgICBpZDogJ24nLFxuICAgIHR5cGU6ICdpbnQnLFxuICAgIG1pbjogMyxcbiAgICBtYXg6IDIwLFxuICAgIGRlZmF1bHQ6IDNcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVHlwZScsXG4gICAgaWQ6ICd0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ0ludGVnZXIgKCspJywgaWQ6ICdpbnRlZ2VyLWFkZCcgfSxcbiAgICAgIHsgdGl0bGU6ICdJbnRlZ2VyIChcXHUwMGQ3KScsIGlkOiAnaW50ZWdlci1tdWx0aXBseScgfSxcbiAgICAgIHsgdGl0bGU6ICdGcmFjdGlvbiAoKyknLCBpZDogJ2ZyYWN0aW9uLWFkZCcgfSxcbiAgICAgIHsgdGl0bGU6ICdGcmFjdGlvbiAoXFx1MDBkNyknLCBpZDogJ2ZyYWN0aW9uLW11bHRpcGx5JyB9LFxuICAgICAgeyB0aXRsZTogJ0FsZ2VicmEgKCspJywgaWQ6ICdhbGdlYnJhLWFkZCcgfSxcbiAgICAgIHsgdGl0bGU6ICdBbGdlYnJhIChcXHUwMGQ3KScsIGlkOiAnYWxnZWJyYS1tdWx0aXBseScgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogJ2ludGVnZXItYWRkJyxcbiAgICB2ZXJ0aWNhbDogdHJ1ZVxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdQdXp6bGUgdHlwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1leGNsdXNpdmUnLFxuICAgIGlkOiAncHV6X2RpZmYnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdNaXNzaW5nIGVkZ2VzJywgaWQ6ICcxJyB9LFxuICAgICAgeyB0aXRsZTogJ01peGVkJywgaWQ6ICcyJyB9LFxuICAgICAgeyB0aXRsZTogJ01pc3NpbmcgdmVydGljZXMnLCBpZDogJzMnIH1cbiAgICBdLFxuICAgIGRlZmF1bHQ6ICcxJ1xuICB9XG5dXG5cbmNsYXNzIEFyaXRobWFnb25RRGF0YSAvKiBleHRlbmRzIEdyYXBoaWNRRGF0YSAqLyB7XG4gIC8vIFRPRE8gc2ltcGxpZnkgY29uc3RydWN0b3IuIE1vdmUgbG9naWMgaW50byBzdGF0aWMgZmFjdG9yeSBtZXRob2RzXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgLy8gMS4gU2V0IHByb3BlcnRpZXMgZnJvbSBvcHRpb25zXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBuOiAzLCAvLyBudW1iZXIgb2YgdmVydGljZXNcbiAgICAgIG1pbjogLTIwLFxuICAgICAgbWF4OiAyMCxcbiAgICAgIG51bV9kaWZmOiAxLCAvLyBjb21wbGV4aXR5IG9mIHdoYXQncyBpbiB2ZXJ0aWNlcy9lZGdlc1xuICAgICAgcHV6X2RpZmY6IDEsIC8vIDEgLSBWZXJ0aWNlcyBnaXZlbiwgMiAtIHZlcnRpY2VzL2VkZ2VzOyBnaXZlbiAzIC0gb25seSBlZGdlc1xuICAgICAgdHlwZTogJ2ludGVnZXItYWRkJyAvLyBbdHlwZV0tW29wZXJhdGlvbl0gd2hlcmUgW3R5cGVdID0gaW50ZWdlciwgLi4uXG4gICAgICAvLyBhbmQgW29wZXJhdGlvbl0gPSBhZGQvbXVsdGlwbHlcbiAgICB9XG5cbiAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIHRoaXMuc2V0dGluZ3MsIG9wdGlvbnMpXG4gICAgdGhpcy5zZXR0aW5ncy5udW1fZGlmZiA9IHRoaXMuc2V0dGluZ3MuZGlmZmljdWx0eVxuICAgIHRoaXMuc2V0dGluZ3MucHV6X2RpZmYgPSBwYXJzZUludCh0aGlzLnNldHRpbmdzLnB1el9kaWZmKSAvLyEgPyBUaGlzIHNob3VsZCBoYXZlIGJlZW4gZG9uZSB1cHN0cmVhbS4uLlxuXG4gICAgdGhpcy5uID0gdGhpcy5zZXR0aW5ncy5uXG4gICAgdGhpcy52ZXJ0aWNlcyA9IFtdXG4gICAgdGhpcy5zaWRlcyA9IFtdXG5cbiAgICBpZiAodGhpcy5zZXR0aW5ncy50eXBlLmVuZHNXaXRoKCdhZGQnKSkge1xuICAgICAgdGhpcy5vcG5hbWUgPSAnKydcbiAgICAgIHRoaXMub3AgPSAoeCwgeSkgPT4geC5hZGQoeSlcbiAgICB9IGVsc2UgaWYgKHRoaXMuc2V0dGluZ3MudHlwZS5lbmRzV2l0aCgnbXVsdGlwbHknKSkge1xuICAgICAgdGhpcy5vcG5hbWUgPSAnXFx1MDBkNydcbiAgICAgIHRoaXMub3AgPSAoeCwgeSkgPT4geC5tdWwoeSlcbiAgICB9XG5cbiAgICAvLyAyLiBJbml0aWFsaXNlIGJhc2VkIG9uIHR5cGVcbiAgICBzd2l0Y2ggKHRoaXMuc2V0dGluZ3MudHlwZSkge1xuICAgICAgY2FzZSAnaW50ZWdlci1hZGQnOlxuICAgICAgY2FzZSAnaW50ZWdlci1tdWx0aXBseSc6XG4gICAgICAgIHRoaXMuaW5pdEludGVnZXIodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2ZyYWN0aW9uLWFkZCc6XG4gICAgICAgIHRoaXMuaW5pdEZyYWN0aW9uQWRkKHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdmcmFjdGlvbi1tdWx0aXBseSc6XG4gICAgICAgIHRoaXMuaW5pdEZyYWN0aW9uTXVsdGlwbHkodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2FsZ2VicmEtYWRkJzpcbiAgICAgICAgdGhpcy5pbml0QWxnZWJyYUFkZCh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnYWxnZWJyYS1tdWx0aXBseSc6XG4gICAgICAgIHRoaXMuaW5pdEFsZ2VicmFNdWx0aXBseSh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdGVkIHN3aXRjaCBkZWZhdWx0JylcbiAgICB9XG5cbiAgICB0aGlzLmNhbGN1bGF0ZUVkZ2VzKCkgLy8gVXNlIG9wIGZ1bmN0aW9ucyB0byBmaWxsIGluIHRoZSBlZGdlc1xuICAgIHRoaXMuaGlkZUxhYmVscyh0aGlzLnNldHRpbmdzLnB1el9kaWZmKSAvLyBzZXQgc29tZSB2ZXJ0aWNlcy9lZGdlcyBhcyBoaWRkZW4gZGVwZW5kaW5nIG9uIGRpZmZpY3VsdHlcbiAgfVxuXG4gIC8qIE1ldGhvZHMgaW5pdGlhbGlzaW5nIHZlcnRpY2VzICovXG5cbiAgaW5pdEludGVnZXIgKHNldHRpbmdzKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24ocmFuZEJldHdlZW5GaWx0ZXIoXG4gICAgICAgICAgc2V0dGluZ3MubWluLFxuICAgICAgICAgIHNldHRpbmdzLm1heCxcbiAgICAgICAgICB4ID0+IChzZXR0aW5ncy50eXBlLmVuZHNXaXRoKCdhZGQnKSB8fCB4ICE9PSAwKVxuICAgICAgICApKSxcbiAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRGcmFjdGlvbkFkZCAoc2V0dGluZ3MpIHtcbiAgICAvKiBEaWZmaWN1bHR5IHNldHRpbmdzOlxuICAgICAqIDE6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBzYW1lIGRlbm9taW5hdG9yLCBubyBjYW5jZWxsaW5nIGFmdGVyIERPTkVcbiAgICAgKiAyOiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggc2FtZSBkZW5vbWluYXRvciwgbm8gY2FuY2VsbGxpbmcgYW5zd2VyIGltcHJvcGVyIGZyYWN0aW9uXG4gICAgICogMzogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIG9uZSBkZW5vbWluYXRvciBhIG11bHRpcGxlIG9mIGFub3RoZXIsIGdpdmVzIHByb3BlciBmcmFjdGlvblxuICAgICAqIDQ6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBvbmUgZGVub21pbmF0b3IgYSBtdWx0aXBsZSBvZiBhbm90aGVyLCBnaXZlcyBpbXByb3BlciBmcmFjdGlvblxuICAgICAqIDU6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBkaWZmZXJlbnQgZGVub21pbmF0b3JzIChub3QgY28tcHJpbWUpLCBnaXZlcyBpbXByb3BlciBmcmFjdGlvblxuICAgICAqIDY6IG1peGVkIG51bWJlcnNcbiAgICAgKiA3OiBtaXhlZCBudW1iZXJzLCBiaWdnZXIgbnVtZXJhdG9ycyBhbmQgZGVub21pbmF0b3JzXG4gICAgICogODogbWl4ZWQgbnVtYmVycywgYmlnIGludGVnZXIgcGFydHNcbiAgICAgKi9cblxuICAgIC8vIFRPRE8gLSBhbnl0aGluZyBvdGhlciB0aGFuIGRpZmZpY3VsdHkgMS5cbiAgICBjb25zdCBkaWZmID0gc2V0dGluZ3MubnVtX2RpZmZcbiAgICBpZiAoZGlmZiA8IDMpIHtcbiAgICAgIGNvbnN0IGRlbiA9IHJhbmRFbGVtKFs1LCA3LCA5LCAxMSwgMTMsIDE3XSlcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgY29uc3QgcHJldm51bSA9IHRoaXMudmVydGljZXNbaSAtIDFdXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzW2kgLSAxXS52YWwubiA6IHVuZGVmaW5lZFxuICAgICAgICBjb25zdCBuZXh0bnVtID0gdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXVxuICAgICAgICAgID8gdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXS52YWwubiA6IHVuZGVmaW5lZFxuXG4gICAgICAgIGNvbnN0IG1heG51bSA9XG4gICAgICAgICAgZGlmZiA9PT0gMiA/IGRlbiAtIDFcbiAgICAgICAgICAgIDogbmV4dG51bSA/IGRlbiAtIE1hdGgubWF4KG5leHRudW0sIHByZXZudW0pXG4gICAgICAgICAgICAgIDogcHJldm51bSA/IGRlbiAtIHByZXZudW1cbiAgICAgICAgICAgICAgICA6IGRlbiAtIDFcblxuICAgICAgICBjb25zdCBudW0gPSByYW5kQmV0d2VlbkZpbHRlcigxLCBtYXhudW0sIHggPT4gKFxuICAgICAgICAgIC8vIEVuc3VyZXMgbm8gc2ltcGxpZmluZyBhZnRlcndhcmRzIGlmIGRpZmZpY3VsdHkgaXMgMVxuICAgICAgICAgIGdjZCh4LCBkZW4pID09PSAxICYmXG4gICAgICAgICAgKCFwcmV2bnVtIHx8IGdjZCh4ICsgcHJldm51bSwgZGVuKSA9PT0gMSB8fCB4ICsgcHJldm51bSA9PT0gZGVuKSAmJlxuICAgICAgICAgICghbmV4dG51bSB8fCBnY2QoeCArIG5leHRudW0sIGRlbikgPT09IDEgfHwgeCArIG5leHRudW0gPT09IGRlbilcbiAgICAgICAgKSlcblxuICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgIHZhbDogbmV3IEZyYWN0aW9uKG51bSwgZGVuKSxcbiAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZGVuYmFzZSA9IHJhbmRFbGVtKFxuICAgICAgICBkaWZmIDwgNyA/IFsyLCAzLCA1XSA6IFsyLCAzLCA0LCA1LCA2LCA3LCA4LCA5LCAxMCwgMTFdXG4gICAgICApXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHByZXYgPSB0aGlzLnZlcnRpY2VzW2kgLSAxXVxuICAgICAgICAgID8gdGhpcy52ZXJ0aWNlc1tpIC0gMV0udmFsIDogdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dLnZhbCA6IHVuZGVmaW5lZFxuXG4gICAgICAgIGNvbnN0IG1heG11bHRpcGxpZXIgPSBkaWZmIDwgNyA/IDQgOiA4XG5cbiAgICAgICAgY29uc3QgbXVsdGlwbGllciA9XG4gICAgICAgICAgaSAlIDIgPT09IDEgfHwgZGlmZiA+IDQgPyByYW5kQmV0d2VlbkZpbHRlcigyLCBtYXhtdWx0aXBsaWVyLCB4ID0+XG4gICAgICAgICAgICAoIXByZXYgfHwgeCAhPT0gcHJldi5kIC8gZGVuYmFzZSkgJiZcbiAgICAgICAgICAgICghbmV4dCB8fCB4ICE9PSBuZXh0LmQgLyBkZW5iYXNlKVxuICAgICAgICAgICkgOiAxXG5cbiAgICAgICAgY29uc3QgZGVuID0gZGVuYmFzZSAqIG11bHRpcGxpZXJcblxuICAgICAgICBsZXQgbnVtXG4gICAgICAgIGlmIChkaWZmIDwgNikge1xuICAgICAgICAgIG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKDEsIGRlbiAtIDEsIHggPT4gKFxuICAgICAgICAgICAgZ2NkKHgsIGRlbikgPT09IDEgJiZcbiAgICAgICAgICAgIChkaWZmID49IDQgfHwgIXByZXYgfHwgcHJldi5hZGQoeCwgZGVuKSA8PSAxKSAmJlxuICAgICAgICAgICAgKGRpZmYgPj0gNCB8fCAhbmV4dCB8fCBuZXh0LmFkZCh4LCBkZW4pIDw9IDEpXG4gICAgICAgICAgKSlcbiAgICAgICAgfSBlbHNlIGlmIChkaWZmIDwgOCkge1xuICAgICAgICAgIG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKGRlbiArIDEsIGRlbiAqIDYsIHggPT4gZ2NkKHgsIGRlbikgPT09IDEpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoZGVuICogMTAsIGRlbiAqIDEwMCwgeCA9PiBnY2QoeCwgZGVuKSA9PT0gMSlcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24obnVtLCBkZW4pLFxuICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRGcmFjdGlvbk11bHRpcGx5IChzZXR0aW5ncykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIGNvbnN0IGQgPSByYW5kQmV0d2VlbigyLCAxMClcbiAgICAgIGNvbnN0IG4gPSByYW5kQmV0d2VlbigxLCBkIC0gMSlcbiAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgIHZhbDogbmV3IEZyYWN0aW9uKG4sIGQpLFxuICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEFsZ2VicmFBZGQgKHNldHRpbmdzKSB7XG4gICAgY29uc3QgZGlmZiA9IHNldHRpbmdzLm51bV9kaWZmXG4gICAgc3dpdGNoIChkaWZmKSB7XG4gICAgICBjYXNlIDE6IHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmICsgdmFyaWFibGUpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOlxuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSA8IDAuNSkgeyAvLyB2YXJpYWJsZSArIGNvbnN0YW50XG4gICAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IGNvbnN0YW50ID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2YXJpYWJsZSArICcrJyArIGNvbnN0YW50KSxcbiAgICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZTEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICAgIGxldCB2YXJpYWJsZTIgPSB2YXJpYWJsZTFcbiAgICAgICAgICB3aGlsZSAodmFyaWFibGUyID09PSB2YXJpYWJsZTEpIHtcbiAgICAgICAgICAgIHZhcmlhYmxlMiA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgICAgY29uc3QgY29lZmYxID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IGNvZWZmMiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmMSArIHZhcmlhYmxlMSArICcrJyArIGNvZWZmMiArIHZhcmlhYmxlMiksXG4gICAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0QWxnZWJyYU11bHRpcGx5IChzZXR0aW5ncykge1xuICAgIC8qIERpZmZpY3VsdHk6XG4gICAgICogMTogQWx0ZXJuYXRlIDNhIHdpdGggNFxuICAgICAqIDI6IEFsbCB0ZXJtcyBvZiB0aGUgZm9ybSBudiAtIHVwIHRvIHR3byB2YXJpYWJsZXNcbiAgICAgKiAzOiBBbGwgdGVybXMgb2YgdGhlIGZvcm0gbnZebS4gT25lIHZhcmlhYmxlIG9ubHlcbiAgICAgKiA0OiBBTGwgdGVybXMgb2YgdGhlIGZvcm0gbnheayB5Xmwgel5wLiBrLGwscCAwLTNcbiAgICAgKiA1OiBFeHBhbmQgYnJhY2tldHMgMygyeCs1KVxuICAgICAqIDY6IEV4cGFuZCBicmFja2V0cyAzeCgyeCs1KVxuICAgICAqIDc6IEV4cGFuZCBicmFja2V0cyAzeF4yeSgyeHkrNXleMilcbiAgICAgKiA4OiBFeHBhbmQgYnJhY2tldHMgKHgrMykoeCsyKVxuICAgICAqIDk6IEV4cGFuZCBicmFja2V0cyAoMngtMykoM3grNClcbiAgICAgKiAxMDogRXhwYW5kIGJyYWNrZXRzICgyeF4yLTN4KzQpKDJ4LTUpXG4gICAgICovXG4gICAgY29uc3QgZGlmZiA9IHNldHRpbmdzLm51bV9kaWZmXG4gICAgc3dpdGNoIChkaWZmKSB7XG4gICAgICBjYXNlIDE6XG4gICAgICB7XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCB0ZXJtID0gaSAlIDIgPT09IDAgPyBjb2VmZiA6IGNvZWZmICsgdmFyaWFibGVcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh0ZXJtKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSAyOiB7XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlMSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGNvbnN0IHZhcmlhYmxlMiA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgdmFyaWFibGUgPSByYW5kRWxlbShbdmFyaWFibGUxLCB2YXJpYWJsZTJdKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmICsgdmFyaWFibGUpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDM6IHtcbiAgICAgICAgY29uc3QgdiA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgaWR4ID0gcmFuZEJldHdlZW4oMSwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmICsgdiArICdeJyArIGlkeCksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgNDoge1xuICAgICAgICBjb25zdCBzdGFydEFzY2lpID0gcmFuZEJldHdlZW4oOTcsIDEyMClcbiAgICAgICAgY29uc3QgdjEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkpXG4gICAgICAgIGNvbnN0IHYyID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpICsgMSlcbiAgICAgICAgY29uc3QgdjMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkgKyAyKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjEgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjIgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjMgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgdGVybSA9IGEgKyB2MSArIG4xICsgdjIgKyBuMiArIHYzICsgbjNcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh0ZXJtKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSA1OlxuICAgICAgY2FzZSA2OiB7IC8vIGUuZy4gMyh4KSAqICgyeC01KVxuICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgY29uc3RhbnQgPSByYW5kQmV0d2VlbigtOSwgOSkudG9TdHJpbmcoKVxuICAgICAgICAgIGxldCB0ZXJtID0gY29lZmZcbiAgICAgICAgICBpZiAoZGlmZiA9PT0gNiB8fCBpICUgMiA9PT0gMSkgdGVybSArPSB2YXJpYWJsZVxuICAgICAgICAgIGlmIChpICUgMiA9PT0gMSkgdGVybSArPSAnKycgKyBjb25zdGFudFxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDc6IHsgLy8gZS5nLiAzeF4yeSg0eHleMis1eHkpXG4gICAgICAgIGNvbnN0IHN0YXJ0QXNjaWkgPSByYW5kQmV0d2Vlbig5NywgMTIwKVxuICAgICAgICBjb25zdCB2MSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSlcbiAgICAgICAgY29uc3QgdjIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkgKyAxKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgYTEgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4xMSA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMTIgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgbGV0IHRlcm0gPSBhMSArIHYxICsgbjExICsgdjIgKyBuMTJcbiAgICAgICAgICBpZiAoaSAlIDIgPT09IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGEyID0gcmFuZEJldHdlZW4oLTksIDkpLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IG4yMSA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IG4yMiA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICAgIHRlcm0gKz0gJysnICsgYTIgKyB2MSArIG4yMSArIHYyICsgbjIyXG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDg6IC8vIHsgZS5nLiAoeCs1KSAqICh4LTIpXG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvbnN0YW50ID0gcmFuZEJldHdlZW4oLTksIDkpLnRvU3RyaW5nKClcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh2YXJpYWJsZSArICcrJyArIGNvbnN0YW50KSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiBNZXRob2QgdG8gY2FsY3VsYXRlIGVkZ2VzIGZyb20gdmVydGljZXMgKi9cbiAgY2FsY3VsYXRlRWRnZXMgKCkge1xuICAgIC8vIENhbGN1bGF0ZSB0aGUgZWRnZXMgZ2l2ZW4gdGhlIHZlcnRpY2VzIHVzaW5nIHRoaXMub3BcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICB0aGlzLnNpZGVzW2ldID0ge1xuICAgICAgICB2YWw6IHRoaXMub3AodGhpcy52ZXJ0aWNlc1tpXS52YWwsIHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl0udmFsKSxcbiAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qIE1hcmsgaGlkZGVuZCBlZGdlcy92ZXJ0aWNlcyAqL1xuXG4gIGhpZGVMYWJlbHMgKHB1enpsZURpZmZpY3VsdHkpIHtcbiAgICAvLyBIaWRlIHNvbWUgbGFiZWxzIHRvIG1ha2UgYSBwdXp6bGVcbiAgICAvLyAxIC0gU2lkZXMgaGlkZGVuLCB2ZXJ0aWNlcyBzaG93blxuICAgIC8vIDIgLSBTb21lIHNpZGVzIGhpZGRlbiwgc29tZSB2ZXJ0aWNlcyBoaWRkZW5cbiAgICAvLyAzIC0gQWxsIHZlcnRpY2VzIGhpZGRlblxuICAgIHN3aXRjaCAocHV6emxlRGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICB0aGlzLnNpZGVzLmZvckVhY2goeCA9PiB7IHguaGlkZGVuID0gdHJ1ZSB9KVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOiB7XG4gICAgICAgIHRoaXMuc2lkZXMuZm9yRWFjaCh4ID0+IHsgeC5oaWRkZW4gPSB0cnVlIH0pXG4gICAgICAgIGNvbnN0IHNob3dzaWRlID0gcmFuZEJldHdlZW4oMCwgdGhpcy5uIC0gMSwgTWF0aC5yYW5kb20pXG4gICAgICAgIGNvbnN0IGhpZGV2ZXJ0ID0gTWF0aC5yYW5kb20oKSA8IDAuNVxuICAgICAgICAgID8gc2hvd3NpZGUgLy8gcHJldmlvdXMgdmVydGV4XG4gICAgICAgICAgOiAoc2hvd3NpZGUgKyAxKSAlIHRoaXMubiAvLyBuZXh0IHZlcnRleDtcblxuICAgICAgICB0aGlzLnNpZGVzW3Nob3dzaWRlXS5oaWRkZW4gPSBmYWxzZVxuICAgICAgICB0aGlzLnZlcnRpY2VzW2hpZGV2ZXJ0XS5oaWRkZW4gPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlIDM6XG4gICAgICAgIHRoaXMudmVydGljZXMuZm9yRWFjaCh4ID0+IHsgeC5oaWRkZW4gPSB0cnVlIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vX2RpZmZpY3VsdHknKVxuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBBcml0aG1hZ29uUVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICBjb25zdHJ1Y3RvciAoZGF0YSwgb3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIHNldHMgdGhpcy53aWR0aCB0aGlzLmhlaWdodCwgaW5pdGlhbGlzZXMgdGhpcy5sYWJlbHMsIGNyZWF0ZXMgZG9tIGVsZW1lbnRzXG5cbiAgICBjb25zdCB3aWR0aCA9IHRoaXMud2lkdGhcbiAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmhlaWdodFxuICAgIGNvbnN0IHIgPSAwLjM1ICogTWF0aC5taW4od2lkdGgsIGhlaWdodCkgLy8gcmFkaXVzXG4gICAgY29uc3QgbiA9IHRoaXMuZGF0YS5uXG5cbiAgICAvLyBBIHBvaW50IHRvIGxhYmVsIHdpdGggdGhlIG9wZXJhdGlvblxuICAgIC8vIEFsbCBwb2ludHMgZmlyc3Qgc2V0IHVwIHdpdGggKDAsMCkgYXQgY2VudGVyXG4gICAgdGhpcy5vcGVyYXRpb25Qb2ludCA9IG5ldyBQb2ludCgwLCAwKVxuXG4gICAgLy8gUG9zaXRpb24gb2YgdmVydGljZXNcbiAgICB0aGlzLnZlcnRleFBvaW50cyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIGNvbnN0IGFuZ2xlID0gaSAqIE1hdGguUEkgKiAyIC8gbiAtIE1hdGguUEkgLyAyXG4gICAgICB0aGlzLnZlcnRleFBvaW50c1tpXSA9IFBvaW50LmZyb21Qb2xhcihyLCBhbmdsZSlcbiAgICB9XG5cbiAgICAvLyBQb2lzaXRpb24gb2Ygc2lkZSBsYWJlbHNcbiAgICB0aGlzLnNpZGVQb2ludHMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICB0aGlzLnNpZGVQb2ludHNbaV0gPSBQb2ludC5tZWFuKHRoaXMudmVydGV4UG9pbnRzW2ldLCB0aGlzLnZlcnRleFBvaW50c1soaSArIDEpICUgbl0pXG4gICAgfVxuXG4gICAgdGhpcy5hbGxQb2ludHMgPSBbdGhpcy5vcGVyYXRpb25Qb2ludF0uY29uY2F0KHRoaXMudmVydGV4UG9pbnRzKS5jb25jYXQodGhpcy5zaWRlUG9pbnRzKVxuXG4gICAgdGhpcy5yZUNlbnRlcigpIC8vIFJlcG9zaXRpb24gZXZlcnl0aGluZyBwcm9wZXJseVxuXG4gICAgdGhpcy5tYWtlTGFiZWxzKHRydWUpXG5cbiAgICAvLyBEcmF3IGludG8gY2FudmFzXG4gIH1cblxuICByZUNlbnRlciAoKSB7XG4gICAgLy8gRmluZCB0aGUgY2VudGVyIG9mIHRoZSBib3VuZGluZyBib3hcbiAgICBjb25zdCB0b3BsZWZ0ID0gUG9pbnQubWluKHRoaXMuYWxsUG9pbnRzKVxuICAgIGNvbnN0IGJvdHRvbXJpZ2h0ID0gUG9pbnQubWF4KHRoaXMuYWxsUG9pbnRzKVxuICAgIGNvbnN0IGNlbnRlciA9IFBvaW50Lm1lYW4odG9wbGVmdCwgYm90dG9tcmlnaHQpXG5cbiAgICAvLyB0cmFuc2xhdGUgdG8gcHV0IGluIHRoZSBjZW50ZXJcbiAgICB0aGlzLmFsbFBvaW50cy5mb3JFYWNoKHAgPT4ge1xuICAgICAgcC50cmFuc2xhdGUodGhpcy53aWR0aCAvIDIgLSBjZW50ZXIueCwgdGhpcy5oZWlnaHQgLyAyIC0gY2VudGVyLnkpXG4gICAgfSlcbiAgfVxuXG4gIG1ha2VMYWJlbHMgKCkge1xuICAgIC8vIHZlcnRpY2VzXG4gICAgdGhpcy5kYXRhLnZlcnRpY2VzLmZvckVhY2goKHYsIGkpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gdi52YWwudG9MYXRleFxuICAgICAgICA/IHYudmFsLnRvTGF0ZXgodHJ1ZSlcbiAgICAgICAgOiB2LnZhbC50b1N0cmluZygpXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKHtcbiAgICAgICAgcG9zOiB0aGlzLnZlcnRleFBvaW50c1tpXSxcbiAgICAgICAgdGV4dHE6IHYuaGlkZGVuID8gJycgOiB2YWx1ZSxcbiAgICAgICAgdGV4dGE6IHZhbHVlLFxuICAgICAgICBzdHlsZXE6ICdub3JtYWwgdmVydGV4JyxcbiAgICAgICAgc3R5bGVhOiB2LmhpZGRlbiA/ICdhbnN3ZXIgdmVydGV4JyA6ICdub3JtYWwgdmVydGV4J1xuICAgICAgfSlcbiAgICB9KVxuXG4gICAgLy8gc2lkZXNcbiAgICB0aGlzLmRhdGEuc2lkZXMuZm9yRWFjaCgodiwgaSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSB2LnZhbC50b0xhdGV4XG4gICAgICAgID8gdi52YWwudG9MYXRleCh0cnVlKVxuICAgICAgICA6IHYudmFsLnRvU3RyaW5nKClcbiAgICAgIHRoaXMubGFiZWxzLnB1c2goe1xuICAgICAgICBwb3M6IHRoaXMuc2lkZVBvaW50c1tpXSxcbiAgICAgICAgdGV4dHE6IHYuaGlkZGVuID8gJycgOiB2YWx1ZSxcbiAgICAgICAgdGV4dGE6IHZhbHVlLFxuICAgICAgICBzdHlsZXE6ICdub3JtYWwgc2lkZScsXG4gICAgICAgIHN0eWxlYTogdi5oaWRkZW4gPyAnYW5zd2VyIHNpZGUnIDogJ25vcm1hbCBzaWRlJ1xuICAgICAgfSlcbiAgICB9KVxuXG4gICAgLy8gb3BlcmF0aW9uXG4gICAgdGhpcy5sYWJlbHMucHVzaCh7XG4gICAgICBwb3M6IHRoaXMub3BlcmF0aW9uUG9pbnQsXG4gICAgICB0ZXh0cTogdGhpcy5kYXRhLm9wbmFtZSxcbiAgICAgIHRleHRhOiB0aGlzLmRhdGEub3BuYW1lLFxuICAgICAgc3R5bGVxOiAnbm9ybWFsJyxcbiAgICAgIHN0eWxlYTogJ25vcm1hbCdcbiAgICB9KVxuXG4gICAgLy8gc3R5bGluZ1xuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRxXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZXFcbiAgICB9KVxuICB9XG5cbiAgcmVuZGVyICgpIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG4gICAgY29uc3QgbiA9IHRoaXMuZGF0YS5uXG5cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpIC8vIGNsZWFyXG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgY29uc3QgcCA9IHRoaXMudmVydGV4UG9pbnRzW2ldXG4gICAgICBjb25zdCBuZXh0ID0gdGhpcy52ZXJ0ZXhQb2ludHNbKGkgKyAxKSAlIG5dXG4gICAgICBjdHgubW92ZVRvKHAueCwgcC55KVxuICAgICAgY3R4LmxpbmVUbyhuZXh0LngsIG5leHQueSlcbiAgICB9XG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICAvLyBwbGFjZSBsYWJlbHNcbiAgICB0aGlzLnJlbmRlckxhYmVscyh0cnVlKVxuICB9XG5cbiAgc2hvd0Fuc3dlciAoKSB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dGFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlYVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHModHJ1ZSlcbiAgICB0aGlzLmFuc3dlcmVkID0gdHJ1ZVxuICB9XG5cbiAgaGlkZUFuc3dlciAoKSB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHModHJ1ZSlcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxufVxuIiwiaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tICd1dGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRlc3RRIGV4dGVuZHMgVGV4dFEge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDUsXG4gICAgICBsYWJlbDogJ2EnLFxuICAgICAgdGVzdDE6IFsnZm9vJ10sXG4gICAgICB0ZXN0MjogdHJ1ZVxuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyBwaWNrIGEgcmFuZG9tIG9uZSBvZiB0aGUgc2VsZWN0ZWRcbiAgICBsZXQgdGVzdDFcbiAgICBpZiAoc2V0dGluZ3MudGVzdDEubGVuZ3RoID09PSAwKSB7XG4gICAgICB0ZXN0MSA9ICdub25lJ1xuICAgIH0gZWxzZSB7XG4gICAgICB0ZXN0MSA9IHJhbmRFbGVtKHNldHRpbmdzLnRlc3QxKVxuICAgIH1cblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICdkOiAnICsgc2V0dGluZ3MuZGlmZmljdWx0eSArICdcXFxcXFxcXCB0ZXN0MTogJyArIHRlc3QxXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICd0ZXN0MjogJyArIHNldHRpbmdzLnRlc3QyXG5cbiAgICB0aGlzLnJlbmRlcigpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHsgcmV0dXJuICdUZXN0IGNvbW1hbmQgd29yZCcgfVxufVxuXG5UZXN0US5vcHRpb25zU3BlYyA9IFtcbiAge1xuICAgIHRpdGxlOiAnVGVzdCBvcHRpb24gMScsXG4gICAgaWQ6ICd0ZXN0MScsXG4gICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFsnZm9vJywgJ2JhcicsICd3aXp6J10sXG4gICAgZGVmYXVsdDogW11cbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVGVzdCBvcHRpb24gMicsXG4gICAgaWQ6ICd0ZXN0MicsXG4gICAgdHlwZTogJ2Jvb2wnLFxuICAgIGRlZmF1bHQ6IHRydWVcbiAgfVxuXVxuIiwiaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICd1dGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFkZEFaZXJvIGV4dGVuZHMgVGV4dFEge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDUsXG4gICAgICBsYWJlbDogJ2EnXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICB0aGlzLmxhYmVsID0gc2V0dGluZ3MubGFiZWxcblxuICAgIC8vIHJhbmRvbSAyIGRpZ2l0ICdkZWNpbWFsJ1xuICAgIGNvbnN0IHEgPSBTdHJpbmcocmFuZEJldHdlZW4oMSwgOSkpICsgU3RyaW5nKHJhbmRCZXR3ZWVuKDAsIDkpKSArICcuJyArIFN0cmluZyhyYW5kQmV0d2VlbigwLCA5KSlcbiAgICBjb25zdCBhID0gcSArICcwJ1xuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gcSArICdcXFxcdGltZXMgMTAnXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICc9ICcgKyBhXG5cbiAgICB0aGlzLnJlbmRlcigpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ0V2YWx1YXRlJ1xuICB9XG59XG5cbkFkZEFaZXJvLm9wdGlvbnNTcGVjID0gW1xuXVxuIiwiaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5pbXBvcnQgRnJhY3Rpb24gZnJvbSAndmVuZG9yL2ZyYWN0aW9uJ1xuXG4vKiBNYWluIHF1ZXN0aW9uIGNsYXNzLiBUaGlzIHdpbGwgYmUgc3B1biBvZmYgaW50byBkaWZmZXJlbnQgZmlsZSBhbmQgZ2VuZXJhbGlzZWQgKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEVxdWF0aW9uT2ZMaW5lIGV4dGVuZHMgVGV4dFEge1xuICAvLyAnZXh0ZW5kcycgUXVlc3Rpb24sIGJ1dCBub3RoaW5nIHRvIGFjdHVhbGx5IGV4dGVuZFxuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIC8vIGJvaWxlcnBsYXRlXG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogMlxuICAgIH1cblxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG4gICAgY29uc3QgZGlmZmljdWx0eSA9IE1hdGguY2VpbChzZXR0aW5ncy5kaWZmaWN1bHR5IC8gMikgLy8gaW5pdGlhbGx5IHdyaXR0ZW4gZm9yIGRpZmZpY3VsdHkgMS00LCBub3cgbmVlZCAxLTEwXG5cbiAgICAvLyBxdWVzdGlvbiBnZW5lcmF0aW9uIGJlZ2lucyBoZXJlXG4gICAgbGV0IG0sIGMsIHgxLCB5MSwgeDIsIHkyXG4gICAgbGV0IG1pbm0sIG1heG0sIG1pbmMsIG1heGNcblxuICAgIHN3aXRjaCAoZGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOiAvLyBtPjAsIGM+PTBcbiAgICAgIGNhc2UgMjpcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgbWlubSA9IGRpZmZpY3VsdHkgPCAzID8gMSA6IC01XG4gICAgICAgIG1heG0gPSA1XG4gICAgICAgIG1pbmMgPSBkaWZmaWN1bHR5IDwgMiA/IDAgOiAtMTBcbiAgICAgICAgbWF4YyA9IDEwXG4gICAgICAgIG0gPSByYW5kQmV0d2VlbihtaW5tLCBtYXhtKVxuICAgICAgICBjID0gcmFuZEJldHdlZW4obWluYywgbWF4YylcbiAgICAgICAgeDEgPSBkaWZmaWN1bHR5IDwgMyA/IHJhbmRCZXR3ZWVuKDAsIDEwKSA6IHJhbmRCZXR3ZWVuKC0xNSwgMTUpXG4gICAgICAgIHkxID0gbSAqIHgxICsgY1xuXG4gICAgICAgIGlmIChkaWZmaWN1bHR5IDwgMykge1xuICAgICAgICAgIHgyID0gcmFuZEJldHdlZW4oeDEgKyAxLCAxNSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB4MiA9IHgxXG4gICAgICAgICAgd2hpbGUgKHgyID09PSB4MSkgeyB4MiA9IHJhbmRCZXR3ZWVuKC0xNSwgMTUpIH07XG4gICAgICAgIH1cbiAgICAgICAgeTIgPSBtICogeDIgKyBjXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ6IC8vIG0gZnJhY3Rpb24sIHBvaW50cyBhcmUgaW50ZWdlcnNcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgY29uc3QgbWQgPSByYW5kQmV0d2VlbigxLCA1KVxuICAgICAgICBjb25zdCBtbiA9IHJhbmRCZXR3ZWVuKC01LCA1KVxuICAgICAgICBtID0gbmV3IEZyYWN0aW9uKG1uLCBtZClcbiAgICAgICAgeDEgPSBuZXcgRnJhY3Rpb24ocmFuZEJldHdlZW4oLTEwLCAxMCkpXG4gICAgICAgIHkxID0gbmV3IEZyYWN0aW9uKHJhbmRCZXR3ZWVuKC0xMCwgMTApKVxuICAgICAgICBjID0gbmV3IEZyYWN0aW9uKHkxKS5zdWIobS5tdWwoeDEpKVxuICAgICAgICB4MiA9IHgxLmFkZChyYW5kQmV0d2VlbigxLCA1KSAqIG0uZClcbiAgICAgICAgeTIgPSBtLm11bCh4MikuYWRkKGMpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgeHN0ciA9XG4gICAgICAobSA9PT0gMCB8fCAobS5lcXVhbHMgJiYgbS5lcXVhbHMoMCkpKSA/ICcnXG4gICAgICAgIDogKG0gPT09IDEgfHwgKG0uZXF1YWxzICYmIG0uZXF1YWxzKDEpKSkgPyAneCdcbiAgICAgICAgICA6IChtID09PSAtMSB8fCAobS5lcXVhbHMgJiYgbS5lcXVhbHMoLTEpKSkgPyAnLXgnXG4gICAgICAgICAgICA6IChtLnRvTGF0ZXgpID8gbS50b0xhdGV4KCkgKyAneCdcbiAgICAgICAgICAgICAgOiAobSArICd4JylcblxuICAgIGNvbnN0IGNvbnN0c3RyID0gLy8gVE9ETzogV2hlbiBtPWM9MFxuICAgICAgKGMgPT09IDAgfHwgKGMuZXF1YWxzICYmIGMuZXF1YWxzKDApKSkgPyAnJ1xuICAgICAgICA6IChjIDwgMCkgPyAoJyAtICcgKyAoYy5uZWcgPyBjLm5lZygpLnRvTGF0ZXgoKSA6IC1jKSlcbiAgICAgICAgICA6IChjLnRvTGF0ZXgpID8gKCcgKyAnICsgYy50b0xhdGV4KCkpXG4gICAgICAgICAgICA6ICgnICsgJyArIGMpXG5cbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnKCcgKyB4MSArICcsICcgKyB5MSArICcpXFxcXHRleHR7IGFuZCB9KCcgKyB4MiArICcsICcgKyB5MiArICcpJ1xuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAneSA9ICcgKyB4c3RyICsgY29uc3RzdHJcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRmluZCB0aGUgZXF1YXRpb24gb2YgdGhlIGxpbmUgdGhyb3VnaCdcbiAgfVxufVxuIiwiLyogUmVuZGVycyBtaXNzaW5nIGFuZ2xlcyBwcm9ibGVtIHdoZW4gdGhlIGFuZ2xlcyBhcmUgYXQgYSBwb2ludFxuICogSS5lLiBvbiBhIHN0cmFpZ2h0IGxpbmUgb3IgYXJvdW5kIGEgcG9pbnRcbiAqIENvdWxkIGFsc28gYmUgYWRhcHRlZCB0byBhbmdsZXMgZm9ybWluZyBhIHJpZ2h0IGFuZ2xlXG4gKlxuICogU2hvdWxkIGJlIGZsZXhpYmxlIGVub3VnaCBmb3IgbnVtZXJpY2FsIHByb2JsZW1zIG9yIGFsZ2VicmFpYyBvbmVzXG4gKlxuICovXG5cbmltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IEdyYXBoaWNRVmlldywgTGFiZWwgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCB7IHJvdW5kRFAgfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc051bWJlckRhdGEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICByYWRpdXM6IG51bWJlclxuICBPOiBQb2ludFxuICBBOiBQb2ludFxuICBDOiBQb2ludFtdXG4gIHZpZXdBbmdsZXM6IG51bWJlcltdIC8vICdmdWRnZWQnIHZlcnNpb25zIG9mIGRhdGEuYW5nbGVzIGZvciBkaXNwbGF5XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhXG4gIHJvdGF0aW9uOiBudW1iZXJcblxuICBjb25zdHJ1Y3RvciAoZGF0YSA6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhLCBvcHRpb25zIDogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc2V0cyB0aGlzLndpZHRoIHRoaXMuaGVpZ2h0LCBpbml0aWFsaXNlcyB0aGlzLmxhYmVscywgY3JlYXRlcyBkb20gZWxlbWVudHNcbiAgICBjb25zdCB3aWR0aCA9IHRoaXMud2lkdGhcbiAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmhlaWdodFxuICAgIGNvbnN0IHJhZGl1cyA9IHRoaXMucmFkaXVzID0gTWF0aC5taW4od2lkdGgsIGhlaWdodCkgLyAyLjVcbiAgICBjb25zdCBtaW5WaWV3QW5nbGUgPSBvcHRpb25zLm1pblZpZXdBbmdsZSB8fCAyNVxuXG4gICAgdGhpcy52aWV3QW5nbGVzID0gZnVkZ2VBbmdsZXModGhpcy5kYXRhLmFuZ2xlcywgbWluVmlld0FuZ2xlKVxuXG4gICAgLy8gU2V0IHVwIG1haW4gcG9pbnRzXG4gICAgdGhpcy5PID0gbmV3IFBvaW50KDAsIDApIC8vIGNlbnRlciBwb2ludFxuICAgIHRoaXMuQSA9IG5ldyBQb2ludChyYWRpdXMsIDApIC8vIGZpcnN0IHBvaW50XG4gICAgdGhpcy5DID0gW10gLy8gUG9pbnRzIGFyb3VuZCBvdXRzaWRlXG4gICAgbGV0IHRvdGFsYW5nbGUgPSAwIC8vIG5iIGluIHJhZGlhbnNcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZGF0YS5hbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRvdGFsYW5nbGUgKz0gdGhpcy52aWV3QW5nbGVzW2ldICogTWF0aC5QSSAvIDE4MFxuICAgICAgdGhpcy5DW2ldID0gUG9pbnQuZnJvbVBvbGFyKHJhZGl1cywgdG90YWxhbmdsZSlcbiAgICB9XG5cbiAgICAvLyBSYW5kb21seSByb3RhdGUgYW5kIGNlbnRlclxuICAgIHRoaXMucm90YXRpb24gPSAob3B0aW9ucy5yb3RhdGlvbiAhPT0gdW5kZWZpbmVkKSA/IHRoaXMucm90YXRlKG9wdGlvbnMucm90YXRpb24pIDogdGhpcy5yYW5kb21Sb3RhdGUoKVxuICAgIC8vIHRoaXMuc2NhbGVUb0ZpdCh3aWR0aCxoZWlnaHQsMTApXG4gICAgdGhpcy50cmFuc2xhdGUod2lkdGggLyAyLCBoZWlnaHQgLyAyKVxuXG4gICAgLy8gU2V0IHVwIGxhYmVscyAoYWZ0ZXIgc2NhbGluZyBhbmQgcm90YXRpbmcpXG4gICAgdG90YWxhbmdsZSA9IFBvaW50LmFuZ2xlRnJvbSh0aGlzLk8sIHRoaXMuQSkgKiAxODAgLyBNYXRoLlBJIC8vIGFuZ2xlIGZyb20gTyB0aGF0IEEgaXNcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudmlld0FuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gTGFiZWwgdGV4dFxuICAgICAgY29uc3QgbGFiZWwgOiBQYXJ0aWFsPExhYmVsPiA9IHt9XG4gICAgICBjb25zdCB0ZXh0cSA9IHRoaXMuZGF0YS5hbmdsZUxhYmVsc1tpXVxuICAgICAgY29uc3QgdGV4dGEgPSByb3VuZERQKHRoaXMuZGF0YS5hbmdsZXNbaV0sIDIpLnRvU3RyaW5nKCkgKyAnXlxcXFxjaXJjJ1xuXG4gICAgICAvLyBQb3NpdGlvbmluZ1xuICAgICAgY29uc3QgdGhldGEgPSB0aGlzLnZpZXdBbmdsZXNbaV1cbiAgICAgIC8qIGNvdWxkIGJlIHVzZWQgZm9yIG1vcmUgYWR2YW5jZWQgcG9zaXRpb25pbmdcbiAgICAgIGNvbnN0IG1pZEFuZ2xlID0gdG90YWxhbmdsZSArIHRoZXRhIC8gMlxuICAgICAgY29uc3QgbWluRGlzdGFuY2UgPSAwLjMgLy8gYXMgYSBmcmFjdGlvbiBvZiByYWRpdXNcbiAgICAgIGNvbnN0IGxhYmVsTGVuZ3RoID0gTWF0aC5tYXgodGV4dHEubGVuZ3RoLCB0ZXh0YS5sZW5ndGgpIC0gJ15cXFxcY2lyYycubGVuZ3RoIC8vIMKwIHRha2VzIHVwIHZlcnkgbGl0dGxlIHNwYWNlXG4gICAgICAqL1xuXG4gICAgICAvKiBFeHBsYW5hdGlvbjogRnVydGhlciBvdXQgaWY6XG4gICAgICAqICAgTW9yZSB2ZXJ0aWNhbCAoc2luKG1pZEFuZ2xlKSlcbiAgICAgICogICBMb25nZXIgbGFiZWxcbiAgICAgICogICBzbWFsbGVyIGFuZ2xlXG4gICAgICAqICAgRS5nLiB0b3RhbGx5IHZlcnRpY2FsLCA0NcKwLCBsZW5ndGggPSAzXG4gICAgICAqICAgZCA9IDAuMyArIDEqMy80NSA9IDAuMyArIDAuNyA9IDAuMzdcbiAgICAgICovXG4gICAgICAvLyBjb25zdCBmYWN0b3IgPSAxICAgICAgICAvLyBjb25zdGFudCBvZiBwcm9wb3J0aW9uYWxpdHkuIFNldCBieSB0cmlhbCBhbmQgZXJyb3JcbiAgICAgIC8vIGxldCBkaXN0YW5jZSA9IG1pbkRpc3RhbmNlICsgZmFjdG9yICogTWF0aC5hYnMoc2luRGVnKG1pZEFuZ2xlKSkgKiBsYWJlbExlbmd0aCAvIHRoZXRhXG5cbiAgICAgIC8vIEp1c3QgcmV2ZXJ0IHRvIG9sZCBtZXRob2RcblxuICAgICAgY29uc3QgZGlzdGFuY2UgPSAwLjQgKyA2IC8gdGhldGFcblxuICAgICAgbGFiZWwucG9zID0gUG9pbnQuZnJvbVBvbGFyRGVnKHJhZGl1cyAqIGRpc3RhbmNlLCB0b3RhbGFuZ2xlICsgdGhldGEgLyAyKS50cmFuc2xhdGUodGhpcy5PLngsIHRoaXMuTy55KVxuICAgICAgbGFiZWwudGV4dHEgPSB0ZXh0cVxuICAgICAgbGFiZWwuc3R5bGVxID0gJ25vcm1hbCdcblxuICAgICAgaWYgKHRoaXMuZGF0YS5taXNzaW5nW2ldKSB7XG4gICAgICAgIGxhYmVsLnRleHRhID0gdGV4dGFcbiAgICAgICAgbGFiZWwuc3R5bGVhID0gJ2Fuc3dlcidcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxhYmVsLnRleHRhID0gbGFiZWwudGV4dHFcbiAgICAgICAgbGFiZWwuc3R5bGVhID0gbGFiZWwuc3R5bGVxXG4gICAgICB9XG5cbiAgICAgIGxhYmVsLnRleHQgPSBsYWJlbC50ZXh0cVxuICAgICAgbGFiZWwuc3R5bGUgPSBsYWJlbC5zdHlsZXFcblxuICAgICAgdGhpcy5sYWJlbHNbaV0gPSBsYWJlbCBhcyBMYWJlbFxuXG4gICAgICB0b3RhbGFuZ2xlICs9IHRoZXRhXG4gICAgfVxuXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gIH1cblxuICByZW5kZXIgKCkgOiB2b2lkIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG5cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpIC8vIGNsZWFyXG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBjdHgubW92ZVRvKHRoaXMuTy54LCB0aGlzLk8ueSkgLy8gZHJhdyBsaW5lc1xuICAgIGN0eC5saW5lVG8odGhpcy5BLngsIHRoaXMuQS55KVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5DLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjdHgubW92ZVRvKHRoaXMuTy54LCB0aGlzLk8ueSlcbiAgICAgIGN0eC5saW5lVG8odGhpcy5DW2ldLngsIHRoaXMuQ1tpXS55KVxuICAgIH1cbiAgICBjdHguc3Ryb2tlU3R5bGUgPSAnZ3JheSdcbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGxldCB0b3RhbGFuZ2xlID0gdGhpcy5yb3RhdGlvblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy52aWV3QW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCB0aGV0YSA9IHRoaXMudmlld0FuZ2xlc1tpXSAqIE1hdGguUEkgLyAxODBcbiAgICAgIC8vIDAuMDcvdGhldGEgcmFkaWFucyB+PSA0L3RoZXRhXG4gICAgICBjdHguYXJjKHRoaXMuTy54LCB0aGlzLk8ueSwgdGhpcy5yYWRpdXMgKiAoMC4yICsgMC4wNyAvIHRoZXRhKSwgdG90YWxhbmdsZSwgdG90YWxhbmdsZSArIHRoZXRhKVxuICAgICAgY3R4LnN0cm9rZSgpXG4gICAgICB0b3RhbGFuZ2xlICs9IHRoZXRhXG4gICAgfVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgLy8gdGVzdGluZyBsYWJlbCBwb3NpdGlvbmluZzpcbiAgICAvLyB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgIC8vIGN0eC5maWxsU3R5bGUgPSAncmVkJ1xuICAgIC8vIGN0eC5maWxsUmVjdChsLnBvcy54IC0gMSwgbC5wb3MueSAtIDEsIDMsIDMpXG4gICAgLy8gfSlcblxuICAgIHRoaXMucmVuZGVyTGFiZWxzKGZhbHNlKVxuICB9XG5cbiAgZ2V0IGFsbHBvaW50cyAoKSA6IFBvaW50W10ge1xuICAgIGxldCBhbGxwb2ludHMgPSBbdGhpcy5BLCB0aGlzLk9dXG4gICAgYWxscG9pbnRzID0gYWxscG9pbnRzLmNvbmNhdCh0aGlzLkMpXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChmdW5jdGlvbiAobCkge1xuICAgICAgYWxscG9pbnRzLnB1c2gobC5wb3MpXG4gICAgfSlcbiAgICByZXR1cm4gYWxscG9pbnRzXG4gIH1cbn1cblxuLyoqXG4gKiBBZGp1c3RzIGEgc2V0IG9mIGFuZ2xlcyBzbyB0aGF0IGFsbCBhbmdsZXMgYXJlIGdyZWF0ZXIgdGhhbiB7bWluQW5nbGV9IGJ5IHJlZHVjaW5nIG90aGVyIGFuZ2xlcyBpbiBwcm9wb3J0aW9uXG4gKiBAcGFyYW0gYW5nbGVzIFRoZSBzZXQgb2YgYW5nbGVzIHRvIGFkanVzdFxuICogQHBhcmFtIG1pbkFuZ2xlIFRoZSBzbWFsbGVzdCBhbmdsZSBpbiB0aGUgb3V0cHV0XG4gKi9cbmZ1bmN0aW9uIGZ1ZGdlQW5nbGVzIChhbmdsZXM6IG51bWJlcltdLCBtaW5BbmdsZTogbnVtYmVyKSA6IG51bWJlcltdIHtcblxuICBjb25zdCBhbmdsZVN1bSA9IGFuZ2xlcy5yZWR1Y2UoKGEsYyk9PmErYylcbiAgY29uc3QgbWFwcGVkQW5nbGVzID0gYW5nbGVzLm1hcCgoeCwgaSkgPT4gW3gsIGldKSAvLyByZW1lbWJlciBvcmlnaW5hbCBpbmRpY2VzXG4gIGNvbnN0IHNtYWxsQW5nbGVzID0gbWFwcGVkQW5nbGVzLmZpbHRlcih4ID0+IHhbMF0gPCBtaW5BbmdsZSkgIC8vIHNwbGl0IG91dCBhbmdsZXMgd2hpY2ggYXJlIHRvbyBzbWFsbFxuICBjb25zdCBsYXJnZUFuZ2xlcyA9IG1hcHBlZEFuZ2xlcy5maWx0ZXIoeCA9PiB4WzBdID49IG1pbkFuZ2xlKSBcbiAgY29uc3QgbGFyZ2VBbmdsZVN1bSA9IGxhcmdlQW5nbGVzLnJlZHVjZSgoYWNjdW11bGF0b3IsIGN1cnJlbnRWYWx1ZSkgPT4gYWNjdW11bGF0b3IgKyBjdXJyZW50VmFsdWVbMF0sIDApXG5cbiAgc21hbGxBbmdsZXMuZm9yRWFjaChzbWFsbCA9PiB7XG4gICAgY29uc3QgZGlmZmVyZW5jZSA9IG1pbkFuZ2xlIC0gc21hbGxbMF1cbiAgICBzbWFsbFswXSArPSBkaWZmZXJlbmNlXG4gICAgbGFyZ2VBbmdsZXMuZm9yRWFjaChsYXJnZSA9PiB7XG4gICAgICBjb25zdCByZWR1Y3Rpb24gPSBkaWZmZXJlbmNlICogbGFyZ2VbMF0gLyBsYXJnZUFuZ2xlU3VtXG4gICAgICBsYXJnZVswXSA9IE1hdGgucm91bmQobGFyZ2VbMF0gLSByZWR1Y3Rpb24pXG4gICAgfSlcbiAgfSlcblxuICAvLyBmaXggYW55IHJvdW5kaW5nIGVycm9ycyBpbnRyb2R1Y2VkXG5cbiAgbGV0IG5ld0FuZ2xlcyA9ICBzbWFsbEFuZ2xlcy5jb25jYXQobGFyZ2VBbmdsZXMpIC8vIGNvbWJpbmUgdG9nZXRoZXJcbiAgICAuc29ydCgoeCwgeSkgPT4geFsxXSAtIHlbMV0pIC8vIHNvcnQgYnkgcHJldmlvdXMgaW5kZXhcbiAgICAubWFwKHggPT4geFswXSkgLy8gc3RyaXAgb3V0IGluZGV4XG5cbiAgbGV0IG5ld1N1bSA9IG5ld0FuZ2xlcy5yZWR1Y2UoKGFjYyxjdXJyKSA9PiBhY2MgKyBjdXJyKVxuICBpZiAobmV3U3VtICE9PSBhbmdsZVN1bSkge1xuICAgIGNvbnN0IGRpZmZlcmVuY2UgPSBhbmdsZVN1bSAtIG5ld1N1bVxuICAgIG5ld0FuZ2xlc1tuZXdBbmdsZXMuaW5kZXhPZihNYXRoLm1heCguLi5uZXdBbmdsZXMpKV0gKz0gZGlmZmVyZW5jZVxuICB9XG4gIG5ld1N1bSA9IG5ld0FuZ2xlcy5yZWR1Y2UoKGFjYyxjdXJyKSA9PiBhY2MgKyBjdXJyKVxuICBpZiAobmV3U3VtICE9PSBhbmdsZVN1bSkgdGhyb3cgbmV3IEVycm9yIChgRGlkbid0IGZpeCBhbmdsZXMuIE5ldyBzdW0gaXMgJHtuZXdTdW19LCBidXQgc2hvdWxkIGJlICR7YW5nbGVTdW19YClcblxuICByZXR1cm4gbmV3QW5nbGVzXG59XG4iLCIvKiogR2VuZXJhdGVzIGFuZCBob2xkcyBkYXRhIGZvciBhIG1pc3NpbmcgYW5nbGVzIHF1ZXN0aW9uLCB3aGVyZSB0aGVzZSBpcyBzb21lIGdpdmVuIGFuZ2xlIHN1bVxuICogIEFnbm9zdGljIGFzIHRvIGhvdyB0aGVzZSBhbmdsZXMgYXJlIGFycmFuZ2VkIChlLmcuIGluIGEgcG9seWdvbiBvciBhcm91bmQgc29tIHBvaW50KVxuICpcbiAqIE9wdGlvbnMgcGFzc2VkIHRvIGNvbnN0cnVjdG9yczpcbiAqICBhbmdsZVN1bTo6SW50IHRoZSBudW1iZXIgb2YgYW5nbGVzIHRvIGdlbmVyYXRlXG4gKiAgbWluQW5nbGU6OkludCB0aGUgc21hbGxlc3QgYW5nbGUgdG8gZ2VuZXJhdGVcbiAqICBtaW5OOjpJbnQgICAgIHRoZSBzbWFsbGVzdCBudW1iZXIgb2YgYW5nbGVzIHRvIGdlbmVyYXRlXG4gKiAgbWF4Tjo6SW50ICAgICB0aGUgbGFyZ2VzdCBudW1iZXIgb2YgYW5nbGVzIHRvIGdlbmVyYXRlXG4gKlxuICovXG5cbmltcG9ydCB7IHJhbmRCZXR3ZWVuIH0gZnJvbSAndXRpbGl0aWVzJ1xuaW1wb3J0IHsgR3JhcGhpY1FEYXRhIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzRGF0YSB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0RhdGEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVPcHRpb25zIGFzIE9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5cbmV4cG9ydCBjbGFzcyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSBpbXBsZW1lbnRzIE1pc3NpbmdBbmdsZXNEYXRhIHtcbiAgYW5nbGVzIDogbnVtYmVyW10gLy8gbGlzdCBvZiBhbmdsZXNcbiAgbWlzc2luZyA6IGJvb2xlYW5bXSAvLyB0cnVlIGlmIG1pc3NpbmdcbiAgYW5nbGVTdW0gOiBudW1iZXIgLy8gd2hhdCB0aGUgYW5nbGVzIGFkZCB1cCB0b1xuICBhbmdsZUxhYmVsczogc3RyaW5nW11cblxuICBjb25zdHJ1Y3RvciAoYW5nbGVTdW0gOiBudW1iZXIsIGFuZ2xlczogbnVtYmVyW10sIG1pc3Npbmc6IGJvb2xlYW5bXSwgYW5nbGVMYWJlbHM/OiBzdHJpbmdbXSkge1xuICAgIC8vIGluaXRpYWxpc2VzIHdpdGggYW5nbGVzIGdpdmVuIGV4cGxpY2l0bHlcbiAgICBpZiAoYW5nbGVzID09PSBbXSkgeyB0aHJvdyBuZXcgRXJyb3IoJ011c3QgZ2l2ZSBhbmdsZXMnKSB9XG4gICAgaWYgKE1hdGgucm91bmQoYW5nbGVzLnJlZHVjZSgoeCwgeSkgPT4geCArIHkpKSAhPT0gYW5nbGVTdW0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQW5nbGUgc3VtIG11c3QgYmUgJHthbmdsZVN1bX1gKVxuICAgIH1cblxuICAgIHRoaXMuYW5nbGVzID0gYW5nbGVzIC8vIGxpc3Qgb2YgYW5nbGVzXG4gICAgdGhpcy5taXNzaW5nID0gbWlzc2luZyAvLyB3aGljaCBhbmdsZXMgYXJlIG1pc3NpbmcgLSBhcnJheSBvZiBib29sZWFuc1xuICAgIHRoaXMuYW5nbGVTdW0gPSBhbmdsZVN1bSAvLyBzdW0gb2YgYW5nbGVzXG4gICAgdGhpcy5hbmdsZUxhYmVscyA9IGFuZ2xlTGFiZWxzIHx8IFtdXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IFBhcnRpYWw8T3B0aW9ucz4gPSB7XG4gICAgICAvKiBhbmdsZVN1bTogMTgwICovIC8vIG11c3QgYmUgc2V0IGJ5IGNhbGxlclxuICAgICAgbWluQW5nbGU6IDE1LFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDRcbiAgICB9XG5cbiAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICBsZXQgcXVlc3Rpb24gOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YVxuICAgIGlmIChvcHRpb25zLnJlcGVhdGVkKSB7XG4gICAgICBxdWVzdGlvbiA9IHRoaXMucmFuZG9tUmVwZWF0ZWQob3B0aW9ucylcbiAgICB9IGVsc2Uge1xuICAgICAgcXVlc3Rpb24gPSB0aGlzLnJhbmRvbVNpbXBsZShvcHRpb25zKVxuICAgIH1cbiAgICBxdWVzdGlvbi5pbml0TGFiZWxzKClcbiAgICByZXR1cm4gcXVlc3Rpb25cbiAgfVxuXG4gIHN0YXRpYyByYW5kb21TaW1wbGUgKG9wdGlvbnM6IE9wdGlvbnMpOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB7XG4gICAgaWYgKCFvcHRpb25zLmFuZ2xlU3VtKSB7IHRocm93IG5ldyBFcnJvcignTm8gYW5nbGUgc3VtIGdpdmVuJykgfVxuXG4gICAgY29uc3QgYW5nbGVTdW0gPSBvcHRpb25zLmFuZ2xlU3VtXG4gICAgY29uc3QgbiA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTiwgb3B0aW9ucy5tYXhOKVxuICAgIGNvbnN0IG1pbkFuZ2xlID0gb3B0aW9ucy5taW5BbmdsZVxuXG4gICAgaWYgKG4gPCAyKSB0aHJvdyBuZXcgRXJyb3IoJ0NhblxcJ3QgaGF2ZSBtaXNzaW5nIGZld2VyIHRoYW4gMiBhbmdsZXMnKVxuXG4gICAgLy8gQnVpbGQgdXAgYW5nbGVzXG4gICAgY29uc3QgYW5nbGVzID0gW11cbiAgICBsZXQgbGVmdCA9IGFuZ2xlU3VtXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuIC0gMTsgaSsrKSB7XG4gICAgICBjb25zdCBtYXhBbmdsZSA9IGxlZnQgLSBtaW5BbmdsZSAqIChuIC0gaSAtIDEpXG4gICAgICBjb25zdCBuZXh0QW5nbGUgPSByYW5kQmV0d2VlbihtaW5BbmdsZSwgbWF4QW5nbGUpXG4gICAgICBsZWZ0IC09IG5leHRBbmdsZVxuICAgICAgYW5nbGVzLnB1c2gobmV4dEFuZ2xlKVxuICAgIH1cbiAgICBhbmdsZXNbbiAtIDFdID0gbGVmdFxuXG4gICAgLy8gcGljayBvbmUgdG8gYmUgbWlzc2luZ1xuICAgIGNvbnN0IG1pc3NpbmcgPSBbXVxuICAgIG1pc3NpbmcubGVuZ3RoID0gblxuICAgIG1pc3NpbmcuZmlsbChmYWxzZSlcbiAgICBtaXNzaW5nW3JhbmRCZXR3ZWVuKDAsIG4gLSAxKV0gPSB0cnVlXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZylcbiAgfVxuXG4gIHN0YXRpYyByYW5kb21SZXBlYXRlZCAob3B0aW9uczogT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB7XG4gICAgY29uc3QgYW5nbGVTdW06IG51bWJlciA9IG9wdGlvbnMuYW5nbGVTdW1cbiAgICBjb25zdCBtaW5BbmdsZTogbnVtYmVyID0gb3B0aW9ucy5taW5BbmdsZVxuXG4gICAgY29uc3QgbjogbnVtYmVyID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5OLCBvcHRpb25zLm1heE4pXG5cbiAgICBjb25zdCBtOiBudW1iZXIgPSBvcHRpb25zLm5NaXNzaW5nIHx8IChNYXRoLnJhbmRvbSgpIDwgMC4xID8gbiA6IHJhbmRCZXR3ZWVuKDIsIG4gLSAxKSlcblxuICAgIGlmIChuIDwgMiB8fCBtIDwgMSB8fCBtID4gbikgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGFyZ3VtZW50czogbj0ke259LCBtPSR7bX1gKVxuXG4gICAgLy8gQWxsIG1pc3NpbmcgLSBkbyBhcyBhIHNlcGFyYXRlIGNhc2VcbiAgICBpZiAobiA9PT0gbSkge1xuICAgICAgY29uc3QgYW5nbGVzID0gW11cbiAgICAgIGFuZ2xlcy5sZW5ndGggPSBuXG4gICAgICBhbmdsZXMuZmlsbChhbmdsZVN1bSAvIG4pXG5cbiAgICAgIGNvbnN0IG1pc3NpbmcgPSBbXVxuICAgICAgbWlzc2luZy5sZW5ndGggPSBuXG4gICAgICBtaXNzaW5nLmZpbGwodHJ1ZSlcblxuICAgICAgcmV0dXJuIG5ldyB0aGlzKGFuZ2xlU3VtLCBhbmdsZXMsIG1pc3NpbmcpXG4gICAgfVxuXG4gICAgY29uc3QgYW5nbGVzOiBudW1iZXJbXSA9IFtdXG4gICAgY29uc3QgbWlzc2luZzogYm9vbGVhbltdID0gW11cbiAgICBtaXNzaW5nLmxlbmd0aCA9IG5cbiAgICBtaXNzaW5nLmZpbGwoZmFsc2UpXG5cbiAgICAvLyBjaG9vc2UgYSB2YWx1ZSBmb3IgdGhlIG1pc3NpbmcgYW5nbGVzXG4gICAgY29uc3QgbWF4UmVwZWF0ZWRBbmdsZSA9IChhbmdsZVN1bSAtIG1pbkFuZ2xlICogKG4gLSBtKSkgLyBtXG4gICAgY29uc3QgcmVwZWF0ZWRBbmdsZSA9IHJhbmRCZXR3ZWVuKG1pbkFuZ2xlLCBtYXhSZXBlYXRlZEFuZ2xlKVxuXG4gICAgLy8gY2hvb3NlIHZhbHVlcyBmb3IgdGhlIG90aGVyIGFuZ2xlc1xuICAgIGNvbnN0IG90aGVyQW5nbGVzOiBudW1iZXJbXSA9IFtdXG4gICAgbGV0IGxlZnQgPSBhbmdsZVN1bSAtIHJlcGVhdGVkQW5nbGUgKiBtXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuIC0gbSAtIDE7IGkrKykge1xuICAgICAgY29uc3QgbWF4QW5nbGUgPSBsZWZ0IC0gbWluQW5nbGUgKiAobiAtIG0gLSBpIC0gMSlcbiAgICAgIGNvbnN0IG5leHRBbmdsZSA9IHJhbmRCZXR3ZWVuKG1pbkFuZ2xlLCBtYXhBbmdsZSlcbiAgICAgIGxlZnQgLT0gbmV4dEFuZ2xlXG4gICAgICBvdGhlckFuZ2xlcy5wdXNoKG5leHRBbmdsZSlcbiAgICB9XG4gICAgb3RoZXJBbmdsZXNbbiAtIG0gLSAxXSA9IGxlZnRcblxuICAgIC8vIGNob29zZSB3aGVyZSB0aGUgbWlzc2luZyBhbmdsZXMgYXJlXG4gICAge1xuICAgICAgbGV0IGkgPSAwXG4gICAgICB3aGlsZSAoaSA8IG0pIHtcbiAgICAgICAgY29uc3QgaiA9IHJhbmRCZXR3ZWVuKDAsIG4gLSAxKVxuICAgICAgICBpZiAobWlzc2luZ1tqXSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBtaXNzaW5nW2pdID0gdHJ1ZVxuICAgICAgICAgIGFuZ2xlc1tqXSA9IHJlcGVhdGVkQW5nbGVcbiAgICAgICAgICBpKytcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGZpbGwgaW4gdGhlIG90aGVyIGFuZ2xlc1xuICAgIHtcbiAgICAgIGxldCBqID0gMFxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgaWYgKG1pc3NpbmdbaV0gPT09IGZhbHNlKSB7XG4gICAgICAgICAgYW5nbGVzW2ldID0gb3RoZXJBbmdsZXNbal1cbiAgICAgICAgICBqKytcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZylcbiAgfVxuXG4gIGluaXRMYWJlbHMgKCkgOiB2b2lkIHtcbiAgICBjb25zdCBuID0gdGhpcy5hbmdsZXMubGVuZ3RoXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIGlmICghdGhpcy5taXNzaW5nW2ldKSB7XG4gICAgICAgIHRoaXMuYW5nbGVMYWJlbHNbaV0gPSBgJHt0aGlzLmFuZ2xlc1tpXS50b1N0cmluZygpfV5cXFxcY2lyY2BcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYW5nbGVMYWJlbHNbaV0gPSAneF5cXFxcY2lyYydcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiIsIi8qIFF1ZXN0aW9uIHR5cGUgY29tcHJpc2luZyBudW1lcmljYWwgbWlzc2luZyBhbmdsZXMgYXJvdW5kIGEgcG9pbnQgYW5kXG4gKiBhbmdsZXMgb24gYSBzdHJhaWdodCBsaW5lIChzaW5jZSB0aGVzZSBhcmUgdmVyeSBzaW1pbGFyIG51bWVyaWNhbGx5IGFzIHdlbGxcbiAqIGFzIGdyYXBoaWNhbGx5LlxuICpcbiAqIEFsc28gY292ZXJzIGNhc2VzIHdoZXJlIG1vcmUgdGhhbiBvbmUgYW5nbGUgaXMgZXF1YWxcbiAqXG4gKi9cblxuaW1wb3J0IHsgT3B0aW9uc1NwZWMgfSBmcm9tICdPcHRpb25zU3BlYydcbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZFEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhXG4gIHZpZXc6IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3XG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhLCB2aWV3OiBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldykgeyAvLyBlZmZlY3RpdmVseSBwcml2YXRlXG4gICAgc3VwZXIoKSAvLyBidWJibGVzIHRvIFFcbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgdGhpcy52aWV3ID0gdmlld1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogTWlzc2luZ0FuZ2xlT3B0aW9ucywgdmlld09wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzQXJvdW5kUSB7XG4gICAgY29uc3QgZGVmYXVsdHMgOiBNaXNzaW5nQW5nbGVPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAxMCxcbiAgICAgIG1pbk46IDIsXG4gICAgICBtYXhOOiA0LFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlXG4gICAgfVxuICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3KGRhdGEsIHZpZXdPcHRpb25zKSAvLyBUT0RPIGVsaW1pbmF0ZSBwdWJsaWMgY29uc3RydWN0b3JzXG5cbiAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRRKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBHcmFwaGljUVZpZXcsIExhYmVsIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgeyBzaW5EZWcsIGRhc2hlZExpbmUsIHJvdW5kRFAgfSBmcm9tICd1dGlsaXRpZXMnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICBBIDogUG9pbnQgLy8gdGhlIHZlcnRpY2VzIG9mIHRoZSB0cmlhbmdsZVxuICBCIDogUG9pbnRcbiAgQyA6IFBvaW50XG4gIHJvdGF0aW9uOiBudW1iZXJcbiAgLy8gSW5oZXJpdGVkIG1lbWJlcnM6XG4gIGxhYmVsczogTGFiZWxbXVxuICBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50XG4gIERPTTogSFRNTEVsZW1lbnRcbiAgd2lkdGg6IG51bWJlclxuICBoZWlnaHQ6IG51bWJlclxuICBkYXRhOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhXG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEsIG9wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc2V0cyB0aGlzLndpZHRoIHRoaXMuaGVpZ2h0LCB0aGlzLmRhdGEgaW5pdGlhbGlzZXMgdGhpcy5sYWJlbHMsIGNyZWF0ZXMgZG9tIGVsZW1lbnRzXG4gICAgY29uc3Qgd2lkdGggPSB0aGlzLndpZHRoXG4gICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5oZWlnaHRcblxuICAgIC8vIGdlbmVyYXRlIHBvaW50cyAod2l0aCBsb25nZXN0IHNpZGUgMVxuICAgIHRoaXMuQSA9IG5ldyBQb2ludCgwLCAwKVxuICAgIHRoaXMuQiA9IFBvaW50LmZyb21Qb2xhckRlZygxLCBkYXRhLmFuZ2xlc1swXSlcbiAgICB0aGlzLkMgPSBuZXcgUG9pbnQoXG4gICAgICBzaW5EZWcodGhpcy5kYXRhLmFuZ2xlc1sxXSkgLyBzaW5EZWcodGhpcy5kYXRhLmFuZ2xlc1syXSksIDBcbiAgICApXG5cbiAgICAvLyBDcmVhdGUgbGFiZWxzXG4gICAgY29uc3QgaW5DZW50ZXIgPSBQb2ludC5pbkNlbnRlcih0aGlzLkEsIHRoaXMuQiwgdGhpcy5DKVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGNvbnN0IHAgPSBbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ11baV1cblxuICAgICAgY29uc3QgbGFiZWwgOiBQYXJ0aWFsPExhYmVsPiA9IHtcbiAgICAgICAgdGV4dHE6IHRoaXMuZGF0YS5hbmdsZUxhYmVsc1tpXSxcbiAgICAgICAgdGV4dDogdGhpcy5kYXRhLmFuZ2xlTGFiZWxzW2ldLFxuICAgICAgICBzdHlsZXE6ICdub3JtYWwnLFxuICAgICAgICBzdHlsZTogJ25vcm1hbCcsXG4gICAgICAgIHBvczogUG9pbnQubWVhbihwLCBwLCBpbkNlbnRlcilcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuZGF0YS5taXNzaW5nW2ldKSB7XG4gICAgICAgIGxhYmVsLnRleHRhID0gcm91bmREUCh0aGlzLmRhdGEuYW5nbGVzW2ldLCAyKS50b1N0cmluZygpICsgJ15cXFxcY2lyYydcbiAgICAgICAgbGFiZWwuc3R5bGVhID0gJ2Fuc3dlcidcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxhYmVsLnRleHRhID0gbGFiZWwudGV4dHFcbiAgICAgICAgbGFiZWwuc3R5bGVhID0gbGFiZWwuc3R5bGVxXG4gICAgICB9XG5cbiAgICAgIHRoaXMubGFiZWxzW2ldID0gbGFiZWwgYXMgTGFiZWxcbiAgICB9XG5cbiAgICAvLyByb3RhdGUgcmFuZG9tbHlcbiAgICB0aGlzLnJvdGF0aW9uID0gKG9wdGlvbnMucm90YXRpb24gIT09IHVuZGVmaW5lZCkgPyB0aGlzLnJvdGF0ZShvcHRpb25zLnJvdGF0aW9uKSA6IHRoaXMucmFuZG9tUm90YXRlKClcblxuICAgIC8vIHNjYWxlIGFuZCBmaXRcbiAgICAvLyBzY2FsZSB0byBzaXplXG4gICAgY29uc3QgbWFyZ2luID0gMFxuICAgIGxldCB0b3BsZWZ0ID0gUG9pbnQubWluKFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBsZXQgYm90dG9tcmlnaHQgPSBQb2ludC5tYXgoW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGNvbnN0IHRvdGFsV2lkdGggPSBib3R0b21yaWdodC54IC0gdG9wbGVmdC54XG4gICAgY29uc3QgdG90YWxIZWlnaHQgPSBib3R0b21yaWdodC55IC0gdG9wbGVmdC55XG4gICAgdGhpcy5zY2FsZShNYXRoLm1pbigod2lkdGggLSBtYXJnaW4pIC8gdG90YWxXaWR0aCwgKGhlaWdodCAtIG1hcmdpbikgLyB0b3RhbEhlaWdodCkpIC8vIDE1cHggbWFyZ2luXG5cbiAgICAvLyBtb3ZlIHRvIGNlbnRyZVxuICAgIHRvcGxlZnQgPSBQb2ludC5taW4oW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGJvdHRvbXJpZ2h0ID0gUG9pbnQubWF4KFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBjb25zdCBjZW50ZXIgPSBQb2ludC5tZWFuKHRvcGxlZnQsIGJvdHRvbXJpZ2h0KVxuICAgIHRoaXMudHJhbnNsYXRlKHdpZHRoIC8gMiAtIGNlbnRlci54LCBoZWlnaHQgLyAyIC0gY2VudGVyLnkpIC8vIGNlbnRyZVxuICB9XG5cbiAgcmVuZGVyICgpIDogdm9pZCB7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICAgIGNvbnN0IHZlcnRpY2VzID0gW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdXG4gICAgY29uc3QgYXBleCA9IHRoaXMuZGF0YS5hcGV4IC8vIGhtbW1cblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGN0eC5tb3ZlVG8odGhpcy5BLngsIHRoaXMuQS55KVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGNvbnN0IHAgPSB2ZXJ0aWNlc1tpXVxuICAgICAgY29uc3QgbmV4dCA9IHZlcnRpY2VzWyhpICsgMSkgJSAzXVxuICAgICAgaWYgKGFwZXggPT09IGkgfHwgYXBleCA9PT0gKGkgKyAxKSAlIDMpIHsgLy8gdG8vZnJvbSBhcGV4IC0gZHJhdyBkYXNoZWQgbGluZVxuICAgICAgICBkYXNoZWRMaW5lKGN0eCwgcC54LCBwLnksIG5leHQueCwgbmV4dC55KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3R4LmxpbmVUbyhuZXh0LngsIG5leHQueSlcbiAgICAgIH1cbiAgICB9XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gJ2dyYXknXG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGdldCBhbGxwb2ludHMgKCkgOiBQb2ludFtdIHtcbiAgICBjb25zdCBhbGxwb2ludHMgPSBbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ11cbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4geyBhbGxwb2ludHMucHVzaChsLnBvcykgfSlcbiAgICByZXR1cm4gYWxscG9pbnRzXG4gIH1cbn1cbiIsIi8qIEV4dGVuZHMgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgaW4gb3JkZXIgdG8gZG8gaXNvc2NlbGVzIHRyaWFuZ2xlcywgd2hpY2ggZ2VuZXJhdGUgYSBiaXQgZGlmZmVyZW50bHkgKi9cblxuaW1wb3J0IHsgZmlyc3RVbmlxdWVJbmRleCB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5cbnR5cGUgT3B0aW9ucyA9IE1pc3NpbmdBbmdsZU9wdGlvbnMgJiB7Z2l2ZW5BbmdsZT86ICdhcGV4JyB8ICdiYXNlJ31cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBleHRlbmRzIE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBhcGV4PzogMCB8IDEgfCAyIHwgdW5kZWZpbmVkIC8vIHdoaWNoIG9mIHRoZSB0aHJlZSBnaXZlbiBhbmdsZXMgaXMgdGhlIGFwZXggb2YgYW4gaXNvc2NlbGVzIHRyaWFuZ2xlXG4gICAgY29uc3RydWN0b3IgKGFuZ2xlU3VtOiBudW1iZXIsIGFuZ2xlczogbnVtYmVyW10sIG1pc3Npbmc6IGJvb2xlYW5bXSwgYW5nbGVMYWJlbHM/OiBzdHJpbmdbXSwgYXBleD86IDB8MXwyfHVuZGVmaW5lZCkge1xuICAgICAgc3VwZXIoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZywgYW5nbGVMYWJlbHMpXG4gICAgICB0aGlzLmFwZXggPSBhcGV4XG4gICAgfVxuXG4gICAgc3RhdGljIHJhbmRvbVJlcGVhdGVkIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEge1xuICAgICAgb3B0aW9ucy5uTWlzc2luZyA9IDJcbiAgICAgIG9wdGlvbnMuZ2l2ZW5BbmdsZSA9IG9wdGlvbnMuZ2l2ZW5BbmdsZSB8fCBNYXRoLnJhbmRvbSgpIDwgMC41ID8gJ2FwZXgnIDogJ2Jhc2UnXG5cbiAgICAgIC8vIGdlbmVyYXRlIHRoZSByYW5kb20gYW5nbGVzIHdpdGggcmVwZXRpdGlvbiBmaXJzdCBiZWZvcmUgbWFya2luZyBhcGV4IGZvciBkcmF3aW5nXG4gICAgICBjb25zdCBxdWVzdGlvbiA9IHN1cGVyLnJhbmRvbVJlcGVhdGVkKG9wdGlvbnMpIGFzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEgLy8gYWxsb3dlZCBzaW5jZSB1bmRlZmluZWQgXFxpbiBhcGV4XG5cbiAgICAgIC8vIE9sZCBpbXBsZW1lbnRhdGlvbiBoYWQgc29ydGluZyB0aGUgYXJyYXkgLSBub3Qgc3VyZSB3aHlcbiAgICAgIC8vIHNvcnRUb2dldGhlcihxdWVzdGlvbi5hbmdsZXMscXVlc3Rpb24ubWlzc2luZywoeCx5KSA9PiB4IC0geSlcblxuICAgICAgcXVlc3Rpb24uYXBleCA9IGZpcnN0VW5pcXVlSW5kZXgocXVlc3Rpb24uYW5nbGVzKSBhcyAwIHwgMSB8IDJcbiAgICAgIHF1ZXN0aW9uLm1pc3NpbmcgPSBbdHJ1ZSwgdHJ1ZSwgdHJ1ZV1cblxuICAgICAgaWYgKG9wdGlvbnMuZ2l2ZW5BbmdsZSA9PT0gJ2FwZXgnKSB7XG4gICAgICAgIHF1ZXN0aW9uLm1pc3NpbmdbcXVlc3Rpb24uYXBleF0gPSBmYWxzZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcXVlc3Rpb24ubWlzc2luZ1socXVlc3Rpb24uYXBleCArIDEpICUgM10gPSBmYWxzZVxuICAgICAgfVxuXG4gICAgICBxdWVzdGlvbi5pbml0TGFiZWxzKClcblxuICAgICAgcmV0dXJuIHF1ZXN0aW9uXG4gICAgfVxuXG4gICAgaW5pdExhYmVscyAoKTogdm9pZCB7XG4gICAgICBjb25zdCBuID0gdGhpcy5hbmdsZXMubGVuZ3RoXG4gICAgICBsZXQgaiA9IDAgLy8ga2VlcCB0cmFjayBvZiB1bmtub3duc1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgaWYgKCF0aGlzLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzW2ldID0gYCR7dGhpcy5hbmdsZXNbaV0udG9TdHJpbmcoKX1eXFxcXGNpcmNgXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5hbmdsZUxhYmVsc1tpXSA9IGAke1N0cmluZy5mcm9tQ2hhckNvZGUoMTIwICsgail9XlxcXFxjaXJjYCAvLyAxMjAgPSAneCdcbiAgICAgICAgICBqKytcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbn1cbiIsIi8qIE1pc3NpbmcgYW5nbGVzIGluIHRyaWFuZ2xlIC0gbnVtZXJpY2FsICovXG5cbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGNvbnN0cnVjdG9yIChkYXRhLCB2aWV3LCBvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucykgLy8gdGhpcyBzaG91bGQgYmUgYWxsIHRoYXQncyByZXF1aXJlZCB3aGVuIHJlZmFjdG9yZWRcbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgdGhpcy52aWV3ID0gdmlld1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9ucywgdmlld09wdGlvbnMpIHtcbiAgICBjb25zdCBvcHRpb25zT3ZlcnJpZGUgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDI1LFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDNcbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24ob3B0aW9ucywgb3B0aW9uc092ZXJyaWRlKVxuICAgIG9wdGlvbnMucmVwZWF0ZWQgPSBvcHRpb25zLnJlcGVhdGVkIHx8IGZhbHNlXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcoZGF0YSwgdmlld09wdGlvbnMpXG5cbiAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEoZGF0YSwgdmlldywgb3B0aW9ucylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIExpbkV4cHIge1xuLy8gY2xhc3MgTGluRXhwciB7XG4gIGNvbnN0cnVjdG9yIChhLCBiKSB7XG4gICAgdGhpcy5hID0gYVxuICAgIHRoaXMuYiA9IGJcbiAgfVxuXG4gIGlzQ29uc3RhbnQgKCkge1xuICAgIHJldHVybiB0aGlzLmEgPT09IDBcbiAgfVxuXG4gIHRvU3RyaW5nICgpIHtcbiAgICBsZXQgc3RyaW5nID0gJydcblxuICAgIC8vIHggdGVybVxuICAgIGlmICh0aGlzLmEgPT09IDEpIHsgc3RyaW5nICs9ICd4JyB9IGVsc2UgaWYgKHRoaXMuYSA9PT0gLTEpIHsgc3RyaW5nICs9ICcteCcgfSBlbHNlIGlmICh0aGlzLmEgIT09IDApIHsgc3RyaW5nICs9IHRoaXMuYSArICd4JyB9XG5cbiAgICAvLyBzaWduXG4gICAgaWYgKHRoaXMuYSAhPT0gMCAmJiB0aGlzLmIgPiAwKSB7IHN0cmluZyArPSAnICsgJyB9IGVsc2UgaWYgKHRoaXMuYSAhPT0gMCAmJiB0aGlzLmIgPCAwKSB7IHN0cmluZyArPSAnIC0gJyB9XG5cbiAgICAvLyBjb25zdGFudFxuICAgIGlmICh0aGlzLmIgPiAwKSB7IHN0cmluZyArPSB0aGlzLmIgfSBlbHNlIGlmICh0aGlzLmIgPCAwICYmIHRoaXMuYSA9PT0gMCkgeyBzdHJpbmcgKz0gdGhpcy5iIH0gZWxzZSBpZiAodGhpcy5iIDwgMCkgeyBzdHJpbmcgKz0gTWF0aC5hYnModGhpcy5iKSB9XG5cbiAgICByZXR1cm4gc3RyaW5nXG4gIH1cblxuICB0b1N0cmluZ1AgKCkge1xuICAgIC8vIHJldHVybiBleHByZXNzaW9uIGFzIGEgc3RyaW5nLCBzdXJyb3VuZGVkIGluIHBhcmVudGhlc2VzIGlmIGEgYmlub21pYWxcbiAgICBpZiAodGhpcy5hID09PSAwIHx8IHRoaXMuYiA9PT0gMCkgcmV0dXJuIHRoaXMudG9TdHJpbmcoKVxuICAgIGVsc2UgcmV0dXJuICcoJyArIHRoaXMudG9TdHJpbmcoKSArICcpJ1xuICB9XG5cbiAgZXZhbCAoeCkge1xuICAgIHJldHVybiB0aGlzLmEgKiB4ICsgdGhpcy5iXG4gIH1cblxuICBhZGQgKHRoYXQpIHtcbiAgICAvLyBhZGQgZWl0aGVyIGFuIGV4cHJlc3Npb24gb3IgYSBjb25zdGFudFxuICAgIGlmICh0aGF0LmEgIT09IHVuZGVmaW5lZCkgcmV0dXJuIG5ldyBMaW5FeHByKHRoaXMuYSArIHRoYXQuYSwgdGhpcy5iICsgdGhhdC5iKVxuICAgIGVsc2UgcmV0dXJuIG5ldyBMaW5FeHByKHRoaXMuYSwgdGhpcy5iICsgdGhhdClcbiAgfVxuXG4gIHRpbWVzICh0aGF0KSB7XG4gICAgcmV0dXJuIG5ldyBMaW5FeHByKHRoaXMuYSAqIHRoYXQsIHRoaXMuYiAqIHRoYXQpXG4gIH1cblxuICBzdGF0aWMgc29sdmUgKGV4cHIxLCBleHByMikge1xuICAgIC8vIHNvbHZlcyB0aGUgdHdvIGV4cHJlc3Npb25zIHNldCBlcXVhbCB0byBlYWNoIG90aGVyXG4gICAgcmV0dXJuIChleHByMi5iIC0gZXhwcjEuYikgLyAoZXhwcjEuYSAtIGV4cHIyLmEpXG4gIH1cbn1cbiIsImltcG9ydCBMaW5FeHByIGZyb20gJ0xpbkV4cHInXG5cbi8qKiBHaXZlbiBhIHNldCBvZiBleHByZXNzaW9ucywgc2V0IHRoZWlyIHN1bSAgKi9cblxuZXhwb3J0IGZ1bmN0aW9uIHNvbHZlQW5nbGVzIChleHByZXNzaW9uczogTGluRXhwcltdLCBhbmdsZVN1bTogbnVtYmVyKTogeyB4OiBudW1iZXI7IGFuZ2xlczogbnVtYmVyW107IH0ge1xuICBjb25zdCBleHByZXNzaW9uU3VtID0gZXhwcmVzc2lvbnMucmVkdWNlKChleHAxLCBleHAyKSA9PiBleHAxLmFkZChleHAyKSlcbiAgY29uc3QgeCA9IExpbkV4cHIuc29sdmUoZXhwcmVzc2lvblN1bSwgbmV3IExpbkV4cHIoMCwgYW5nbGVTdW0pKVxuXG4gIGNvbnN0IGFuZ2xlcyA9IFtdXG4gIGV4cHJlc3Npb25zLmZvckVhY2goZnVuY3Rpb24gKGV4cHIpIHtcbiAgICBjb25zdCBhbmdsZSA9IGV4cHIuZXZhbCh4KVxuICAgIGlmIChhbmdsZSA8PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ25lZ2F0aXZlIGFuZ2xlJylcbiAgICB9IGVsc2Uge1xuICAgICAgYW5nbGVzLnB1c2goZXhwci5ldmFsKHgpKVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gKHsgeDogeCwgYW5nbGVzOiBhbmdsZXMgfSlcbn1cbiIsImltcG9ydCBMaW5FeHByIGZyb20gJ0xpbkV4cHInXG5pbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4sIHJhbmRFbGVtLCByYW5kTXVsdEJldHdlZW4sIHNodWZmbGUsIHdlYWtJbmNsdWRlcyB9IGZyb20gJ3V0aWxpdGllcydcbmltcG9ydCB7IEFsZ2VicmFPcHRpb25zIH0gZnJvbSAnLi9BbGdlYnJhT3B0aW9ucydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzRGF0YSdcbmltcG9ydCB7IHNvbHZlQW5nbGVzIH0gZnJvbSAnLi9zb2x2ZUFuZ2xlcydcblxudHlwZSBPcHRpb25zID0gQWxnZWJyYU9wdGlvbnNcblxuZXhwb3J0IHR5cGUgRXhwcmVzc2lvblR5cGUgPSAnYWRkJyB8ICdtdWx0aXBseScgfCAnbWl4ZWQnXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgaW1wbGVtZW50cyBNaXNzaW5nQW5nbGVzRGF0YSB7XG4gICAgYW5nbGVzOiBudW1iZXJbXVxuICAgIG1pc3Npbmc6IGJvb2xlYW5bXVxuICAgIGFuZ2xlU3VtOiBudW1iZXJcbiAgICBhbmdsZUxhYmVsczogc3RyaW5nW11cbiAgICB4OiBudW1iZXIgLy9cblxuICAgIGNvbnN0cnVjdG9yIChhbmdsZXM6IG51bWJlcltdLCBtaXNzaW5nOiBib29sZWFuW10sIGFuZ2xlU3VtOiBudW1iZXIsIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSwgeDogbnVtYmVyKSB7XG4gICAgICB0aGlzLmFuZ2xlcyA9IGFuZ2xlc1xuICAgICAgdGhpcy5hbmdsZVN1bSA9IGFuZ2xlU3VtXG4gICAgICB0aGlzLmFuZ2xlTGFiZWxzID0gYW5nbGVMYWJlbHNcbiAgICAgIHRoaXMueCA9IHhcbiAgICAgIHRoaXMubWlzc2luZyA9IG1pc3NpbmdcbiAgICB9XG5cbiAgICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSB7XG4gICAgICBjb25zdCBkZWZhdWx0cyA6IFBhcnRpYWw8T3B0aW9ucz4gPSB7XG4gICAgICAgIGV4cHJlc3Npb25UeXBlczogWydhZGQnLCAnbXVsdGlwbHknLCAnbWl4ZWQnXSxcbiAgICAgICAgZW5zdXJlWDogdHJ1ZSxcbiAgICAgICAgaW5jbHVkZUNvbnN0YW50czogdHJ1ZSxcbiAgICAgICAgbWluQ29lZmZpY2llbnQ6IDEsXG4gICAgICAgIG1heENvZWZmaWNpZW50OiA0LFxuICAgICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgICBtaW5BbmdsZTogMjAsXG4gICAgICAgIG1pbk46IDIsXG4gICAgICAgIG1heE46IDQsXG4gICAgICAgIG1pblhWYWx1ZTogMTVcbiAgICAgIH1cbiAgICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgICAgLy8gYXNzaWduIGNhbGN1bGF0ZWQgZGVmYXVsdHM6XG4gICAgICBvcHRpb25zLm1heENvbnN0YW50ID0gb3B0aW9ucy5tYXhDb25zdGFudCB8fCBvcHRpb25zLmFuZ2xlU3VtIC8gMlxuICAgICAgb3B0aW9ucy5tYXhYVmFsdWUgPSBvcHRpb25zLm1heFhWYWx1ZSB8fCBvcHRpb25zLmFuZ2xlU3VtIC8gNFxuXG4gICAgICAvLyBSYW5kb21pc2Uvc2V0IHVwIG1haW4gZmVhdHVyZXNcbiAgICAgIGNvbnN0IG4gOiBudW1iZXIgPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbk4sIG9wdGlvbnMubWF4TilcblxuICAgICAgY29uc3QgdHlwZSA6IEV4cHJlc3Npb25UeXBlID0gcmFuZEVsZW0ob3B0aW9ucy5leHByZXNzaW9uVHlwZXMpXG5cbiAgICAgIC8vIEdlbmVyYXRlIGV4cHJlc3Npb25zL2FuZ2xlc1xuICAgICAgbGV0IGV4cHJlc3Npb25zIDogTGluRXhwcltdXG4gICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSAnbWl4ZWQnOlxuICAgICAgICAgIGV4cHJlc3Npb25zID0gbWFrZU1peGVkRXhwcmVzc2lvbnMobiwgb3B0aW9ucylcbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICdtdWx0aXBseSc6XG4gICAgICAgICAgZXhwcmVzc2lvbnMgPSBtYWtlTXVsdGlwbGljYXRpb25FeHByZXNzaW9ucyhuLCBvcHRpb25zKVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ2FkZCc6XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgZXhwcmVzc2lvbnMgPSBtYWtlQWRkRXhwcmVzc2lvbnMobiwgb3B0aW9ucylcbiAgICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgZXhwcmVzc2lvbnMgPSBzaHVmZmxlKGV4cHJlc3Npb25zKVxuXG4gICAgICAvLyBTb2x2ZSBmb3IgeCBhbmQgYW5nbGVzXG4gICAgICBjb25zdCB7IHgsIGFuZ2xlcyB9IDoge3g6bnVtYmVyLCBhbmdsZXM6IG51bWJlcltdfSA9IHNvbHZlQW5nbGVzKGV4cHJlc3Npb25zLCBvcHRpb25zLmFuZ2xlU3VtKVxuXG4gICAgICAvLyBsYWJlbHMgYXJlIGp1c3QgZXhwcmVzc2lvbnMgYXMgc3RyaW5nc1xuICAgICAgY29uc3QgbGFiZWxzID0gZXhwcmVzc2lvbnMubWFwKGUgPT4gYCR7ZS50b1N0cmluZ1AoKX1eXFxcXGNpcmNgKVxuXG4gICAgICAvLyBtaXNzaW5nIHZhbHVlcyBhcmUgdGhlIG9uZXMgd2hpY2ggYXJlbid0IGNvbnN0YW50XG4gICAgICBjb25zdCBtaXNzaW5nID0gZXhwcmVzc2lvbnMubWFwKGUgPT4gIWUuaXNDb25zdGFudCgpKVxuXG4gICAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YShhbmdsZXMsIG1pc3NpbmcsIG9wdGlvbnMuYW5nbGVTdW0sIGxhYmVscywgeClcbiAgICB9XG5cbiAgICAvLyBtYWtlcyB0eXBlc2NyaXB0IHNodXQgdXAsIG1ha2VzIGVzbGludCBub2lzeVxuICAgIGluaXRMYWJlbHMgKCkgOiB2b2lkIHt9ICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG59XG5cbmZ1bmN0aW9uIG1ha2VNaXhlZEV4cHJlc3Npb25zIChuOiBudW1iZXIsIG9wdGlvbnM6IE9wdGlvbnMpIDogTGluRXhwcltdIHtcbiAgY29uc3QgZXhwcmVzc2lvbnM6IExpbkV4cHJbXSA9IFtdXG4gIGNvbnN0IHggPSByYW5kQmV0d2VlbihvcHRpb25zLm1pblhWYWx1ZSwgb3B0aW9ucy5tYXhYVmFsdWUpXG4gIGxldCBsZWZ0ID0gb3B0aW9ucy5hbmdsZVN1bVxuICBsZXQgYWxsY29uc3RhbnQgPSB0cnVlXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbiAtIDE7IGkrKykge1xuICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbigxLCBvcHRpb25zLm1heENvZWZmaWNpZW50KVxuICAgIGxlZnQgLT0gYSAqIHhcbiAgICBjb25zdCBtYXhiID0gTWF0aC5taW4obGVmdCAtIG9wdGlvbnMubWluQW5nbGUgKiAobiAtIGkgLSAxKSwgb3B0aW9ucy5tYXhDb25zdGFudClcbiAgICBjb25zdCBtaW5iID0gb3B0aW9ucy5taW5BbmdsZSAtIGEgKiB4XG4gICAgY29uc3QgYiA9IHJhbmRCZXR3ZWVuKG1pbmIsIG1heGIpXG4gICAgaWYgKGEgIT09IDApIHsgYWxsY29uc3RhbnQgPSBmYWxzZSB9XG4gICAgbGVmdCAtPSBiXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihhLCBiKSlcbiAgfVxuICBjb25zdCBsYXN0TWluWENvZWZmID0gYWxsY29uc3RhbnQgPyAxIDogb3B0aW9ucy5taW5Db2VmZmljaWVudFxuICBjb25zdCBhID0gcmFuZEJldHdlZW4obGFzdE1pblhDb2VmZiwgb3B0aW9ucy5tYXhDb2VmZmljaWVudClcbiAgY29uc3QgYiA9IGxlZnQgLSBhICogeFxuICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKGEsIGIpKVxuXG4gIHJldHVybiBleHByZXNzaW9uc1xufVxuXG5mdW5jdGlvbiBtYWtlQWRkRXhwcmVzc2lvbnMgKG46IG51bWJlciwgb3B0aW9uczogT3B0aW9ucykgOiBMaW5FeHByW10ge1xuICBjb25zdCBleHByZXNzaW9uczogTGluRXhwcltdID0gW11cbiAgY29uc3QgYW5nbGVzOiBudW1iZXJbXSA9IFtdXG4gIGNvbnN0IGNvbnN0YW50cyA9IChvcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPT09IHRydWUgfHwgd2Vha0luY2x1ZGVzKG9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cywgJ2FkZCcpKVxuICBpZiAobiA9PT0gMiAmJiBvcHRpb25zLmVuc3VyZVggJiYgY29uc3RhbnRzKSBuID0gM1xuXG4gIGNvbnN0IHggPSByYW5kQmV0d2VlbihvcHRpb25zLm1pblhWYWx1ZSwgb3B0aW9ucy5tYXhYVmFsdWUpXG4gIGxldCBsZWZ0ID0gb3B0aW9ucy5hbmdsZVN1bVxuICBsZXQgYW5nbGVzTGVmdCA9IG5cblxuICAvLyBmaXJzdCBkbyB0aGUgZXhwcmVzc2lvbnMgZW5zdXJlZCBieSBlbnN1cmVfeCBhbmQgY29uc3RhbnRzXG4gIGlmIChvcHRpb25zLmVuc3VyZVgpIHtcbiAgICBhbmdsZXNMZWZ0LS1cbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKVxuICAgIGFuZ2xlcy5wdXNoKHgpXG4gICAgbGVmdCAtPSB4XG4gIH1cblxuICBpZiAoY29uc3RhbnRzKSB7XG4gICAgYW5nbGVzTGVmdC0tXG4gICAgY29uc3QgYyA9IHJhbmRCZXR3ZWVuKFxuICAgICAgb3B0aW9ucy5taW5BbmdsZSxcbiAgICAgIGxlZnQgLSBvcHRpb25zLm1pbkFuZ2xlICogYW5nbGVzTGVmdFxuICAgIClcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDAsIGMpKVxuICAgIGFuZ2xlcy5wdXNoKGMpXG4gICAgbGVmdCAtPSBjXG4gIH1cblxuICAvLyBtaWRkbGUgYW5nbGVzXG4gIHdoaWxlIChhbmdsZXNMZWZ0ID4gMSkge1xuICAgIC8vIGFkZCAneCtiJyBhcyBhbiBleHByZXNzaW9uLiBNYWtlIHN1cmUgYiBnaXZlcyBzcGFjZVxuICAgIGFuZ2xlc0xlZnQtLVxuICAgIGxlZnQgLT0geFxuICAgIGNvbnN0IG1heGIgPSBNYXRoLm1pbihcbiAgICAgIGxlZnQgLSBvcHRpb25zLm1pbkFuZ2xlICogYW5nbGVzTGVmdCxcbiAgICAgIG9wdGlvbnMubWF4Q29uc3RhbnRcbiAgICApXG4gICAgY29uc3QgbWluYiA9IE1hdGgubWF4KFxuICAgICAgb3B0aW9ucy5taW5BbmdsZSAtIHgsXG4gICAgICAtb3B0aW9ucy5tYXhDb25zdGFudFxuICAgIClcbiAgICBjb25zdCBiID0gcmFuZEJldHdlZW4obWluYiwgbWF4YilcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIGIpKVxuICAgIGFuZ2xlcy5wdXNoKHggKyBiKVxuICAgIGxlZnQgLT0gYlxuICB9XG5cbiAgLy8gbGFzdCBhbmdsZVxuICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIGxlZnQgLSB4KSlcbiAgYW5nbGVzLnB1c2gobGVmdClcblxuICByZXR1cm4gZXhwcmVzc2lvbnNcbn1cblxuZnVuY3Rpb24gbWFrZU11bHRpcGxpY2F0aW9uRXhwcmVzc2lvbnMgKG46IG51bWJlciwgb3B0aW9uczogT3B0aW9ucykgOiBMaW5FeHByW10ge1xuICBjb25zdCBleHByZXNzaW9ucyA6IExpbkV4cHJbXSA9IFtdXG5cbiAgY29uc3QgY29uc3RhbnRzIDogYm9vbGVhbiA9IChvcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPT09IHRydWUgfHwgd2Vha0luY2x1ZGVzKG9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cywgJ211bHQnKSlcbiAgaWYgKG4gPT09IDIgJiYgb3B0aW9ucy5lbnN1cmVYICYmIGNvbnN0YW50cykgbiA9IDMgLy8gbmVlZCBhdCBsZWFzdCAzIGFuZ2xlcyBmb3IgdGhpcyB0byBtYWtlIHNlbnNlXG5cbiAgLy8gY2hvb3NlIGEgdG90YWwgb2YgY29lZmZpY2llbnRzXG4gIC8vIHBpY2sgeCBiYXNlZCBvbiB0aGF0XG4gIGxldCBhbmdsZXNsZWZ0ID0gblxuICBjb25zdCB0b3RhbENvZWZmID0gY29uc3RhbnRzXG4gICAgPyByYW5kQmV0d2VlbihuLCAob3B0aW9ucy5hbmdsZVN1bSAtIG9wdGlvbnMubWluQW5nbGUpIC8gb3B0aW9ucy5taW5BbmdsZSwgTWF0aC5yYW5kb20pIC8vIGlmIGl0J3MgdG9vIGJpZywgYW5nbGVzIGdldCB0b28gc21hbGxcbiAgICA6IHJhbmRFbGVtKFszLCA0LCA1LCA2LCA4LCA5LCAxMF0uZmlsdGVyKHggPT4geCA+PSBuKSwgTWF0aC5yYW5kb20pXG4gIGxldCBjb2VmZmxlZnQgPSB0b3RhbENvZWZmXG5cbiAgLy8gZmlyc3QgMC8xLzJcbiAgaWYgKGNvbnN0YW50cykge1xuICAgIC8vIHJlZHVjZSB0byBtYWtlIHdoYXQncyBsZWZ0IGEgbXVsdGlwbGUgb2YgdG90YWxfY29lZmZcbiAgICBhbmdsZXNsZWZ0LS1cbiAgICBjb25zdCBuZXdsZWZ0ID0gcmFuZE11bHRCZXR3ZWVuKHRvdGFsQ29lZmYgKiBvcHRpb25zLm1pbkFuZ2xlLCBvcHRpb25zLmFuZ2xlU3VtIC0gb3B0aW9ucy5taW5BbmdsZSwgdG90YWxDb2VmZilcbiAgICBjb25zdCBjID0gb3B0aW9ucy5hbmdsZVN1bSAtIG5ld2xlZnRcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDAsIGMpKVxuICB9XG5cbiAgLy8gRG9uJ3QgdXNlIHggaGVyZSwgYnV0OlxuICAvLyB4ID0gbGVmdCAvIHRvdGFsQ29lZmZcblxuICBpZiAob3B0aW9ucy5lbnN1cmVYKSB7XG4gICAgYW5nbGVzbGVmdC0tXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCAwKSlcbiAgICBjb2VmZmxlZnQgLT0gMVxuICB9XG5cbiAgLy8gbWlkZGxlXG4gIHdoaWxlIChhbmdsZXNsZWZ0ID4gMSkge1xuICAgIGFuZ2xlc2xlZnQtLVxuICAgIGNvbnN0IG1pbmEgPSAxXG4gICAgY29uc3QgbWF4YSA9IGNvZWZmbGVmdCAtIGFuZ2xlc2xlZnQgLy8gbGVhdmUgZW5vdWdoIGZvciBvdGhlcnMgVE9ETzogYWRkIG1heF9jb2VmZlxuICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbihtaW5hLCBtYXhhKVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoYSwgMCkpXG4gICAgY29lZmZsZWZ0IC09IGFcbiAgfVxuXG4gIC8vIGxhc3RcbiAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihjb2VmZmxlZnQsIDApKVxuICByZXR1cm4gZXhwcmVzc2lvbnNcbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3IGV4dGVuZHMgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcge1xuICAgIE8gOiBQb2ludFxuICAgIEE6IFBvaW50XG4gICAgQzogUG9pbnRbXVxuICAgIGxhYmVsczogTGFiZWxbXVxuICAgIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnRcbiAgICBET006IEhUTUxFbGVtZW50XG4gICAgcm90YXRpb246IG51bWJlclxuICAgIHdpZHRoOiBudW1iZXJcbiAgICBoZWlnaHQ6IG51bWJlclxuICAgIGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YVxuXG4gICAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSwgb3B0aW9uczogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSB7XG4gICAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBzdXBlciBjb25zdHJ1Y3RvciBkb2VzIHJlYWwgd29ya1xuICAgICAgY29uc3Qgc29sdXRpb25MYWJlbDogUGFydGlhbDxMYWJlbD4gPSB7XG4gICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwKSxcbiAgICAgICAgdGV4dHE6ICcnLFxuICAgICAgICB0ZXh0YTogYHggPSAke3RoaXMuZGF0YS54fV5cXFxcY2lyY2AsXG4gICAgICAgIHN0eWxlcTogJ2hpZGRlbicsXG4gICAgICAgIHN0eWxlYTogJ2V4dHJhLWFuc3dlcidcbiAgICAgIH1cbiAgICAgIHNvbHV0aW9uTGFiZWwuc3R5bGUgPSBzb2x1dGlvbkxhYmVsLnN0eWxlcVxuICAgICAgc29sdXRpb25MYWJlbC50ZXh0ID0gc29sdXRpb25MYWJlbC50ZXh0cVxuXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKHNvbHV0aW9uTGFiZWwgYXMgTGFiZWwpXG4gICAgfVxufVxuIiwiLyoqIE1pc3NpbmcgYW5nbGVzIGFyb3VuZCBhIHBvaW50IG9yIG9uIGEgc3RyYWlnaHQgbGluZSwgdXNpbmcgYWxnZWJyYWljIGV4cHJlc3Npb25zICovXG5cbmltcG9ydCB7IE9wdGlvbnNTcGVjIH0gZnJvbSAnT3B0aW9uc1NwZWMnXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tICcuL0FsZ2VicmFPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGFcbiAgdmlldzogTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3XG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSwgdmlldzogTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3KSB7IC8vIGVmZmVjdGl2ZWx5IHByaXZhdGVcbiAgICBzdXBlcigpIC8vIGJ1YmJsZXMgdG8gUVxuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICB0aGlzLnZpZXcgPSB2aWV3XG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBBbGdlYnJhT3B0aW9ucywgdmlld09wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEge1xuICAgIGNvbnN0IGRlZmF1bHRzIDogQWxnZWJyYU9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDEwLFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDQsXG4gICAgICByZXBlYXRlZDogZmFsc2VcbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlldyhkYXRhLCB2aWV3T3B0aW9ucykgLy8gVE9ETyBlbGltaW5hdGUgcHVibGljIGNvbnN0cnVjdG9yc1xuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cblxuICBzdGF0aWMgZ2V0IG9wdGlvbnNTcGVjICgpIDogT3B0aW9uc1NwZWMge1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnZXhwcmVzc2lvblR5cGVzJyxcbiAgICAgICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgICAgICB0aXRsZTogJ1R5cGVzIG9mIGV4cHJlc3Npb24nLFxuICAgICAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICAgICAge3RpdGxlOiAnPGVtPmE8L2VtPis8ZW0+eDwvZW0+JywgaWQ6J2FkZCd9LFxuICAgICAgICAgIHt0aXRsZTogJzxlbT5heDwvZW0+JywgaWQ6ICdtdWx0aXBseSd9LFxuICAgICAgICAgIHt0aXRsZTogJ21peGVkJywgaWQ6ICdtaXhlZCd9XG4gICAgICAgIF0sXG4gICAgICAgIGRlZmF1bHQ6IFsnYWRkJywnbXVsdGlwbHknLCdtaXhlZCddXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogJ2Vuc3VyZVgnLFxuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnRW5zdXJlIG9uZSBhbmdsZSBpcyA8ZW0+eDwvZW0+JyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgaWQ6ICdpbmNsdWRlQ29uc3RhbnRzJyxcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJ0Vuc3VyZSBhIGNvbnN0YW50IGFuZ2xlJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgfVxuICAgIF1cbiAgfVxufVxuIiwiaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgTGFiZWwgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFWaWV3IGV4dGVuZHMgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YVxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLCBvcHRpb25zOiBWaWV3T3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpXG5cbiAgICBjb25zdCBzb2x1dGlvbkxhYmVsOiBQYXJ0aWFsPExhYmVsPiA9IHtcbiAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwKSxcbiAgICAgIHRleHRxOiAnJyxcbiAgICAgIHRleHRhOiBgeCA9ICR7dGhpcy5kYXRhLnh9XlxcXFxjaXJjYCxcbiAgICAgIHN0eWxlcTogJ2hpZGRlbicsXG4gICAgICBzdHlsZWE6ICdleHRyYS1hbnN3ZXInXG4gICAgfVxuICAgIHNvbHV0aW9uTGFiZWwuc3R5bGUgPSBzb2x1dGlvbkxhYmVsLnN0eWxlcVxuICAgIHNvbHV0aW9uTGFiZWwudGV4dCA9IHNvbHV0aW9uTGFiZWwudGV4dHFcblxuICAgIHRoaXMubGFiZWxzLnB1c2goc29sdXRpb25MYWJlbCBhcyBMYWJlbClcbiAgfVxufVxuIiwiaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCB7IEFsZ2VicmFPcHRpb25zIH0gZnJvbSAnLi9BbGdlYnJhT3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldydcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YVxuICB2aWV3OiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3XG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSwgdmlldzogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldykge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgdGhpcy52aWV3ID0gdmlld1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogQWxnZWJyYU9wdGlvbnMsIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUSB7XG4gICAgY29uc3Qgb3B0aW9uc092ZXJyaWRlIDogQWxnZWJyYU9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDMsXG4gICAgICByZXBlYXRlZDogZmFsc2VcbiAgICB9XG4gICAgT2JqZWN0LmFzc2lnbihvcHRpb25zLCBvcHRpb25zT3ZlcnJpZGUpXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVZpZXcoZGF0YSwgdmlld09wdGlvbnMpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzV29yZGVkRGF0YSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkVmlldyBleHRlbmRzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcge1xuICBkYXRhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YVxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEsIG9wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucylcbiAgICBzdXBlci5zY2FsZVRvRml0KHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0LCA0MClcbiAgICBzdXBlci50cmFuc2xhdGUoMCwgLTMwKVxuXG4gICAgY29uc3QgaW5zdHJ1Y3Rpb25MYWJlbDogTGFiZWwgPSB7XG4gICAgICB0ZXh0cTogdGhpcy5kYXRhLmluc3RydWN0aW9ucy5qb2luKCdcXFxcXFxcXCcpLFxuICAgICAgdGV4dGE6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHRleHQ6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHN0eWxlcTogJ2V4dHJhLWluZm8nLFxuICAgICAgc3R5bGVhOiAnZXh0cmEtaW5mbycsXG4gICAgICBzdHlsZTogJ2V4dHJhLWluZm8nLFxuICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIHRoaXMuaGVpZ2h0IC0gMTApXG4gICAgfVxuICAgIHRoaXMubGFiZWxzLnB1c2goaW5zdHJ1Y3Rpb25MYWJlbClcbiAgfVxufVxuIiwiaW1wb3J0IExpbkV4cHIgZnJvbSAnTGluRXhwcidcbmltcG9ydCB7IHJhbmRCZXR3ZWVuLCByYW5kRWxlbSwgcmFuZE11bHRCZXR3ZWVuIH0gZnJvbSAndXRpbGl0aWVzJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSdcbmltcG9ydCB7IHNvbHZlQW5nbGVzIH0gZnJvbSAnLi9zb2x2ZUFuZ2xlcydcbmltcG9ydCB7IFdvcmRlZE9wdGlvbnMgfSBmcm9tICcuL1dvcmRlZE9wdGlvbnMnXG5cbmV4cG9ydCB0eXBlIFdvcmRlZFR5cGUgPSAnYWRkJyB8ICdtdWx0aXBseScgfCAncmF0aW8nIHwgJ3BlcmNlbnQnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGV4dGVuZHMgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIHtcbiAgYW5nbGVzOiBudW1iZXJbXSAvLyBJbmhlcml0ZWRcbiAgbWlzc2luZzogYm9vbGVhbltdIC8vICAgIHxcbiAgYW5nbGVTdW06IG51bWJlciAvLyAgICB8XG4gIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSAvLyAgICB2XG4gIGluc3RydWN0aW9uczogc3RyaW5nW10gLy8gVGhlICdpbnN0cnVjdGlvbnMnIGdpdmVuXG4gIHg6IG51bWJlciAvLyB1bnVzZWQgYnV0IGluaGVyaXRlZFxuXG4gIGNvbnN0cnVjdG9yIChhbmdsZXM6IG51bWJlcltdLCBtaXNzaW5nOiBib29sZWFuW10sIGFuZ2xlU3VtOiBudW1iZXIsIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSwgaW5zdHJ1Y3Rpb25zOiBzdHJpbmdbXSkge1xuICAgIHN1cGVyKGFuZ2xlcywgbWlzc2luZywgYW5nbGVTdW0sIGFuZ2xlTGFiZWxzLCBudWxsKVxuICAgIHRoaXMuaW5zdHJ1Y3Rpb25zID0gaW5zdHJ1Y3Rpb25zXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zIDogV29yZGVkT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSB7XG4gICAgY29uc3QgZGVmYXVsdHMgOiBXb3JkZWRPcHRpb25zID0ge1xuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDIsXG4gICAgICBtaW5BbmdsZTogMTAsXG4gICAgICBtaW5BZGRlbmQ6IC05MCxcbiAgICAgIG1heEFkZGVuZDogOTAsXG4gICAgICBtaW5NdWx0aXBsaWVyOiAxLFxuICAgICAgbWF4TXVsdGlwbGllcjogNSxcbiAgICAgIHR5cGVzOiBbJ2FkZCcsICdtdWx0aXBseScsICdwZXJjZW50JywgJ3JhdGlvJ11cbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgY29uc3QgbiA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTiwgb3B0aW9ucy5tYXhOKVxuICAgIGNvbnN0IGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIGFuZ2xlTGFiZWxzW2ldID0gU3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpIC8vIDY1ID0gJ0EnXG4gICAgfVxuICAgIGxldCBleHByZXNzaW9uczogTGluRXhwcltdID0gW11cbiAgICBsZXQgaW5zdHJ1Y3Rpb25zOiBzdHJpbmdbXSA9IFtdXG5cbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKVxuXG4gICAgLy8gTG9vcCB0aWwgd2UgZ2V0IG9uZSB0aGF0IHdvcmtzXG4gICAgLy8gUHJvYmFibHkgcmVhbGx5IGluZWZmaWNpZW50ISFcblxuICAgIGxldCBzdWNjZXNzID0gZmFsc2VcbiAgICBsZXQgYXR0ZW1wdGNvdW50ID0gMFxuICAgIHdoaWxlICghc3VjY2Vzcykge1xuICAgICAgaWYgKGF0dGVtcHRjb3VudCA+IDIwKSB7XG4gICAgICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgMCkpXG4gICAgICAgIGNvbnNvbGUubG9nKCdHYXZlIHVwIGFmdGVyICcgKyBhdHRlbXB0Y291bnQgKyAnIGF0dGVtcHRzJylcbiAgICAgICAgc3VjY2VzcyA9IHRydWVcbiAgICAgIH1cbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSByYW5kRWxlbShvcHRpb25zLnR5cGVzKVxuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICBjYXNlICdhZGQnOiB7XG4gICAgICAgICAgICBjb25zdCBhZGRlbmQgPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbkFkZGVuZCwgb3B0aW9ucy5tYXhBZGRlbmQpXG4gICAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb25zW2kgLSAxXS5hZGQoYWRkZW5kKSlcbiAgICAgICAgICAgIGluc3RydWN0aW9ucy5wdXNoKGBcXFxcdGV4dHtBbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSl9JCBpcyAke2NvbXBhcmF0b3IoYWRkZW5kLCAnKycpfSBhbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY0ICsgaSl9JH1gKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSAnbXVsdGlwbHknOiB7XG4gICAgICAgICAgICBjb25zdCBtdWx0aXBsaWVyID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5NdWx0aXBsaWVyLCBvcHRpb25zLm1heE11bHRpcGxpZXIpXG4gICAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb25zW2kgLSAxXS50aW1lcyhtdWx0aXBsaWVyKSlcbiAgICAgICAgICAgIGluc3RydWN0aW9ucy5wdXNoKGBcXFxcdGV4dHtBbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSl9JCBpcyAke2NvbXBhcmF0b3IobXVsdGlwbGllciwgJyonKX0gYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NCArIGkpfSR9YClcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ3BlcmNlbnQnOiB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50YWdlID0gcmFuZE11bHRCZXR3ZWVuKDUsIDEwMCwgNSlcbiAgICAgICAgICAgIGNvbnN0IGluY3JlYXNlID0gTWF0aC5yYW5kb20oKSA8IDAuNVxuICAgICAgICAgICAgY29uc3QgbXVsdGlwbGllciA9IGluY3JlYXNlID8gMSArIHBlcmNlbnRhZ2UgLyAxMDAgOiAxIC0gcGVyY2VudGFnZSAvIDEwMFxuICAgICAgICAgICAgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uc1tpIC0gMV0udGltZXMobXVsdGlwbGllcikpXG4gICAgICAgICAgICBpbnN0cnVjdGlvbnMucHVzaChcbiAgICAgICAgICAgICAgYFxcXFx0ZXh0e0FuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKX0kIGlzICQke3BlcmNlbnRhZ2V9XFxcXCUkICR7aW5jcmVhc2UgPyAnYmlnZ2VyJyA6ICdzbWFsbGVyJ30gdGhhbiBhbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY0ICsgaSl9JH1gKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSAncmF0aW8nOiB7XG4gICAgICAgICAgICBjb25zdCBhID0gcmFuZEJldHdlZW4oMSwgMTApXG4gICAgICAgICAgICBjb25zdCBiID0gcmFuZEJldHdlZW4oMSwgMTApXG4gICAgICAgICAgICBjb25zdCBtdWx0aXBsaWVyID0gYiAvIGFcbiAgICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2goZXhwcmVzc2lvbnNbaSAtIDFdLnRpbWVzKG11bHRpcGxpZXIpKVxuICAgICAgICAgICAgaW5zdHJ1Y3Rpb25zLnB1c2goXG4gICAgICAgICAgICAgIGBcXFxcdGV4dHtUaGUgcmF0aW8gb2YgYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NCArIGkpfSQgdG8gYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpfSQgaXMgJCR7YX06JHtifSR9YFxuICAgICAgICAgICAgKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gY2hlY2sgaXQgbWFrZXMgc2Vuc2VcbiAgICAgIHN1Y2Nlc3MgPSB0cnVlXG4gICAgICBjb25zdCBleHByZXNzaW9uc3VtID0gZXhwcmVzc2lvbnMucmVkdWNlKChleHAxLCBleHAyKSA9PiBleHAxLmFkZChleHAyKSlcbiAgICAgIGNvbnN0IHggPSBMaW5FeHByLnNvbHZlKGV4cHJlc3Npb25zdW0sIG5ldyBMaW5FeHByKDAsIG9wdGlvbnMuYW5nbGVTdW0pKVxuXG4gICAgICBleHByZXNzaW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChleHByKSB7XG4gICAgICAgIGlmICghc3VjY2VzcyB8fCBleHByLmV2YWwoeCkgPCBvcHRpb25zLm1pbkFuZ2xlKSB7XG4gICAgICAgICAgc3VjY2VzcyA9IGZhbHNlXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zID0gW11cbiAgICAgICAgICBleHByZXNzaW9ucyA9IFtleHByZXNzaW9uc1swXV1cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgYXR0ZW1wdGNvdW50KytcbiAgICB9XG4gICAgY29uc29sZS5sb2coJ0F0dGVtcHRzOiAnICsgYXR0ZW1wdGNvdW50KVxuXG4gICAgY29uc3QgYW5nbGVzID0gc29sdmVBbmdsZXMoZXhwcmVzc2lvbnMsIG9wdGlvbnMuYW5nbGVTdW0pLmFuZ2xlc1xuICAgIGNvbnN0IG1pc3NpbmcgPSBhbmdsZXMubWFwKCgpID0+IHRydWUpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVzLCBtaXNzaW5nLCBvcHRpb25zLmFuZ2xlU3VtLCBhbmdsZUxhYmVscywgaW5zdHJ1Y3Rpb25zKVxuICB9XG59XG5cbi8qKlxuICogR2VuZXJhdGVzIHdvcmRlZCB2ZXJzaW9uIG9mIGFuIG9wZXJhdGlvXG4gKiBAcGFyYW0gbnVtYmVyIFRoZSBtdWx0aXBsaWVyIG9yIGFkZGVuZFxuICogQHBhcmFtIG9wZXJhdG9yIFRoZSBvcGVyYXRvciwgZS5nIGFkZGluZyAnbW9yZSB0aGFuJywgb3IgbXVsdGlwbHlpbmcgJ3RpbWVzIGxhcmdlciB0aGFuJ1xuICovXG5mdW5jdGlvbiBjb21wYXJhdG9yIChudW1iZXI6IG51bWJlciwgb3BlcmF0b3I6ICcqJ3wnKycpIHtcbiAgc3dpdGNoIChvcGVyYXRvcikge1xuICAgIGNhc2UgJyonOlxuICAgICAgc3dpdGNoIChudW1iZXIpIHtcbiAgICAgICAgY2FzZSAxOiByZXR1cm4gJ3RoZSBzYW1lIGFzJ1xuICAgICAgICBjYXNlIDI6IHJldHVybiAnZG91YmxlJ1xuICAgICAgICBkZWZhdWx0OiByZXR1cm4gYCQke251bWJlcn0kIHRpbWVzIGxhcmdlciB0aGFuYFxuICAgICAgfVxuICAgIGNhc2UgJysnOlxuICAgICAgc3dpdGNoIChudW1iZXIpIHtcbiAgICAgICAgY2FzZSAwOiByZXR1cm4gJ3RoZSBzYW1lIGFzJ1xuICAgICAgICBkZWZhdWx0OiByZXR1cm4gYCQke01hdGguYWJzKG51bWJlcikudG9TdHJpbmcoKX1eXFxcXGNpcmMkICR7KG51bWJlciA8IDApID8gJ2xlc3MgdGhhbicgOiAnbW9yZSB0aGFuJ31gXG4gICAgICB9XG4gIH1cbn1cbiIsImltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXcnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzV29yZGVkRGF0YSdcbmltcG9ydCB7IFdvcmRlZE9wdGlvbnMgfSBmcm9tICcuL1dvcmRlZE9wdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhXG4gIHZpZXc6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXdcbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLCB2aWV3OiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3KSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICB0aGlzLnZpZXcgPSB2aWV3XG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBXb3JkZWRPcHRpb25zLCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkUSB7XG4gICAgY29uc3Qgb3B0aW9uc092ZXJyaWRlIDogV29yZGVkT3B0aW9ucyA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5OOiAzLFxuICAgICAgbWF4TjogMyxcbiAgICAgIHJlcGVhdGVkOiBmYWxzZVxuICAgIH1cbiAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIG9wdGlvbnNPdmVycmlkZSlcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXcoZGF0YSwgdmlld09wdGlvbnMpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3IGV4dGVuZHMgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcge1xuICBkYXRhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YVxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEsIG9wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIGRvZXMgbW9zdCBvZiB0aGUgc2V0IHVwXG4gICAgc3VwZXIudHJhbnNsYXRlKDAsIC0xNSlcbiAgICBjb25zdCBpbnN0cnVjdGlvbkxhYmVsIDogTGFiZWwgPSB7XG4gICAgICB0ZXh0cTogdGhpcy5kYXRhLmluc3RydWN0aW9ucy5qb2luKCdcXFxcXFxcXCcpLFxuICAgICAgdGV4dGE6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHRleHQ6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHN0eWxlcTogJ2V4dHJhLWluZm8nLFxuICAgICAgc3R5bGVhOiAnZXh0cmEtaW5mbycsXG4gICAgICBzdHlsZTogJ2V4dHJhLWluZm8nLFxuICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIHRoaXMuaGVpZ2h0IC0gMTApXG4gICAgfVxuICAgIHRoaXMubGFiZWxzLnB1c2goaW5zdHJ1Y3Rpb25MYWJlbClcbiAgfVxufVxuIiwiaW1wb3J0IHsgT3B0aW9uc1NwZWMgfSBmcm9tICdPcHRpb25zU3BlYydcbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEnXG5pbXBvcnQgeyBXb3JkZWRPcHRpb25zIH0gZnJvbSAnLi9Xb3JkZWRPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzV29yZGVkUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGFcbiAgdmlldzogTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXdcblxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEsIHZpZXc6IE1pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3KSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICB0aGlzLnZpZXcgPSB2aWV3XG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBXb3JkZWRPcHRpb25zLCB2aWV3T3B0aW9uczogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNXb3JkZWRRIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IFdvcmRlZE9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDEwLFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDIsXG4gICAgICByZXBlYXRlZDogZmFsc2VcbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgdmlld09wdGlvbnMgPSB2aWV3T3B0aW9ucyB8fCB7fVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcoZGF0YSwgdmlld09wdGlvbnMpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgb3B0aW9uc1NwZWMoKTogT3B0aW9uc1NwZWMge1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICAgICAgdGl0bGU6ICdRdWVzdGlvbiB0eXBlcycsXG4gICAgICAgIGlkOiAndHlwZXMnLFxuICAgICAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICAgICAgeyB0aXRsZTogJ01vcmUgdGhhbi9sZXNzIHRoYW4nLCBpZDogJ2FkZCcgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnTXVsdGlwbGVzJywgaWQ6ICdtdWx0aXBseScgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnUGVyY2VudGFnZSBjaGFuZ2UnLCBpZDogJ3BlcmNlbnQnIH0sXG4gICAgICAgICAgeyB0aXRsZTogJ1JhdGlvcycsIGlkOiAncmF0aW8nIH1cbiAgICAgICAgXSxcbiAgICAgICAgZGVmYXVsdDogWydhZGQnLCAnbXVsdGlwbHknXVxuICAgICAgfVxuICAgIF1cbiAgfVxuXG59XG4iLCIvKiogIENsYXNzIHRvIHdyYXAgdmFyaW91cyBtaXNzaW5nIGFuZ2xlcyBjbGFzc2VzXG4gKiBSZWFkcyBvcHRpb25zIGFuZCB0aGVuIHdyYXBzIHRoZSBhcHByb3ByaWF0ZSBvYmplY3QsIG1pcnJvcmluZyB0aGUgbWFpblxuICogcHVibGljIG1ldGhvZHNcbiAqXG4gKiBUaGlzIGNsYXNzIGRlYWxzIHdpdGggdHJhbnNsYXRpbmcgZGlmZmljdWx0eSBpbnRvIHF1ZXN0aW9uIHR5cGVzXG4qL1xuXG5pbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tICd1dGlsaXRpZXMnXG5cbmltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbi9RdWVzdGlvbidcbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5cbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVRJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSBmcm9tICcuL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFRJ1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tICcuL0FsZ2VicmFPcHRpb25zJ1xuXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkUSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1dvcmRlZFEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzV29yZGVkUSdcbmltcG9ydCB7IFdvcmRlZE9wdGlvbnMgfSBmcm9tICcuL1dvcmRlZE9wdGlvbnMnXG5cbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuXG50eXBlIFF1ZXN0aW9uVHlwZSA9ICdhb3NsJyB8ICdhYWFwJyB8ICd0cmlhbmdsZSdcbnR5cGUgUXVlc3Rpb25TdWJUeXBlID0gJ3NpbXBsZScgfCAncmVwZWF0ZWQnIHwgJ2FsZ2VicmEnIHwgJ3dvcmRlZCdcblxudHlwZSBRdWVzdGlvbk9wdGlvbnMgPSBNaXNzaW5nQW5nbGVPcHRpb25zICYgQWxnZWJyYU9wdGlvbnMgJiBXb3JkZWRPcHRpb25zIC8vIG9wdGlvbnMgdG8gcGFzcyB0byBxdWVzdGlvbnNcblxuLyoqIFRoZSBvcHRpb25zIHBhc3NlZCB1c2luZyBvcHRpb25zU3BlYyAqL1xuaW50ZXJmYWNlIFdyYXBwZXJPcHRpb25zIHtcbiAgZGlmZmljdWx0eTogbnVtYmVyLFxuICB0eXBlczogUXVlc3Rpb25UeXBlW10sXG4gIGN1c3RvbTogYm9vbGVhbixcbiAgbWluTjogbnVtYmVyLFxuICBtYXhOOiBudW1iZXIsXG4gIHNpbXBsZTogYm9vbGVhbixcbiAgcmVwZWF0ZWQ6IGJvb2xlYW4sXG4gIGFsZ2VicmE6IGJvb2xlYW4sXG4gIGFsZ2VicmFPcHRpb25zOiBBbGdlYnJhT3B0aW9uc1xuICB3b3JkZWQ6IGJvb2xlYW4sXG4gIHdvcmRlZE9wdGlvbnM6IFdvcmRlZE9wdGlvbnNcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1EgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIHF1ZXN0aW9uOiBHcmFwaGljUVxuXG4gIGNvbnN0cnVjdG9yIChxdWVzdGlvbjogR3JhcGhpY1EpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5xdWVzdGlvbiA9IHF1ZXN0aW9uXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tICggb3B0aW9uczogV3JhcHBlck9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1Ege1xuICAgIGlmIChvcHRpb25zLnR5cGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUeXBlcyBsaXN0IG11c3QgYmUgbm9uLWVtcHR5JylcbiAgICB9XG4gICAgY29uc3QgdHlwZSA6IFF1ZXN0aW9uVHlwZSA9IHJhbmRFbGVtKG9wdGlvbnMudHlwZXMpXG5cbiAgICBpZiAoIW9wdGlvbnMuY3VzdG9tKSB7XG4gICAgICByZXR1cm4gTWlzc2luZ0FuZ2xlc1EucmFuZG9tRnJvbURpZmZpY3VsdHkodHlwZSwgb3B0aW9ucy5kaWZmaWN1bHR5KVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjaG9vc2Ugc3VidHlwZVxuICAgICAgY29uc3QgYXZhaWxhYmxlU3VidHlwZXMgOiBRdWVzdGlvblN1YlR5cGVbXSA9IFsnc2ltcGxlJywncmVwZWF0ZWQnLCdhbGdlYnJhJywnd29yZGVkJ11cbiAgICAgIGxldCBzdWJ0eXBlcyA6IFF1ZXN0aW9uU3ViVHlwZVtdID0gW11cbiAgICAgIGF2YWlsYWJsZVN1YnR5cGVzLmZvckVhY2goc3VidHlwZSA9PiB7XG4gICAgICAgIGlmIChvcHRpb25zW3N1YnR5cGVdKSB7c3VidHlwZXMucHVzaChzdWJ0eXBlKX1cbiAgICAgIH0pXG4gICAgICBjb25zdCBzdWJ0eXBlIDogUXVlc3Rpb25TdWJUeXBlID0gcmFuZEVsZW0oc3VidHlwZXMpXG5cbiAgICAgIC8vIGJ1aWxkIG9wdGlvbnMgb2JqZWN0XG4gICAgICBsZXQgcXVlc3Rpb25PcHRpb25zIDogUXVlc3Rpb25PcHRpb25zXG4gICAgICBpZiAoc3VidHlwZSA9PT0gJ3NpbXBsZScgfHwgc3VidHlwZSA9PT0gJ3JlcGVhdGVkJykge1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMgPSB7fVxuICAgICAgfSBlbHNlIGlmIChzdWJ0eXBlID09PSAnYWxnZWJyYScpIHtcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zID0gb3B0aW9ucy5hbGdlYnJhT3B0aW9uc1xuICAgICAgfSBlbHNlIGlmIChzdWJ0eXBlID09PSAnd29yZGVkJykge1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMgPSBvcHRpb25zLndvcmRlZE9wdGlvbnNcbiAgICAgIH1cbiAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gb3B0aW9ucy5taW5OXG4gICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IG9wdGlvbnMubWF4TlxuXG4gICAgICByZXR1cm4gTWlzc2luZ0FuZ2xlc1EucmFuZG9tRnJvbVR5cGVXaXRoT3B0aW9ucyh0eXBlLHN1YnR5cGUscXVlc3Rpb25PcHRpb25zKVxuICAgICB9XG4gICAgfVxuICAgICAgICAgIFxuICBzdGF0aWMgcmFuZG9tRnJvbURpZmZpY3VsdHkodHlwZSwgZGlmZmljdWx0eSkge1xuICAgIGxldCBzdWJ0eXBlIDogUXVlc3Rpb25TdWJUeXBlXG4gICAgbGV0IHF1ZXN0aW9uT3B0aW9ucyA6IFF1ZXN0aW9uT3B0aW9ucyA9IHt9XG4gICAgc3dpdGNoIChkaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHN1YnR5cGUgPSAnc2ltcGxlJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDJcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSAyXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDI6XG4gICAgICAgIHN1YnR5cGUgPSAnc2ltcGxlJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDNcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSA0XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDM6XG4gICAgICAgIHN1YnR5cGUgPSAncmVwZWF0ZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gM1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDRcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNDpcbiAgICAgICAgc3VidHlwZSA9ICdhbGdlYnJhJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZXhwcmVzc2lvblR5cGVzID0gWydtdWx0aXBseSddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5pbmNsdWRlQ29uc3RhbnRzID0gZmFsc2VcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAyXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gNFxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA1OlxuICAgICAgICBzdWJ0eXBlID0gJ2FsZ2VicmEnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5leHByZXNzaW9uVHlwZXMgPSBbJ2FkZCcsICdtdWx0aXBseSddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5pbmNsdWRlQ29uc3RhbnRzID0gWydtdWx0aXBseSddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5lbnN1cmVYID0gdHJ1ZVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDJcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSAzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDY6XG4gICAgICAgIHN1YnR5cGUgPSAnYWxnZWJyYSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmV4cHJlc3Npb25UeXBlcyA9IFsnbWl4ZWQnXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDJcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSAzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDc6XG4gICAgICAgIHN1YnR5cGUgPSAnd29yZGVkJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMudHlwZXMgPSBbcmFuZEVsZW0oWydhZGQnLCAnbXVsdGlwbHknXSldXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gcXVlc3Rpb25PcHRpb25zLm1heE4gPSAyXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDg6XG4gICAgICAgIHN1YnR5cGUgPSAnd29yZGVkJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMudHlwZXMgPSBbJ2FkZCcsICdtdWx0aXBseSddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gcXVlc3Rpb25PcHRpb25zLm1heE4gPSAzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDk6XG4gICAgICAgIHN1YnR5cGUgPSAnd29yZGVkJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMudHlwZXMgPSBbJ211bHRpcGx5JywgJ3JhdGlvJ11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMTA6XG4gICAgICAgIHN1YnR5cGUgPSAnd29yZGVkJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMudHlwZXMgPSBbJ211bHRpcGx5JywgJ2FkZCcsICdyYXRpbycsICdwZXJjZW50J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ2FuJ3QgZ2VuZXJhdGUgZGlmZmljdWx0eSAke2RpZmZpY3VsdHl9YClcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5yYW5kb21Gcm9tVHlwZVdpdGhPcHRpb25zKHR5cGUsIHN1YnR5cGUsIHF1ZXN0aW9uT3B0aW9ucylcbiAgfVxuICBcblxuICBzdGF0aWMgcmFuZG9tRnJvbVR5cGVXaXRoT3B0aW9ucyAodHlwZTogUXVlc3Rpb25UeXBlLCBzdWJ0eXBlPzogUXVlc3Rpb25TdWJUeXBlLCBxdWVzdGlvbk9wdGlvbnM/OiBRdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zPzogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNRIHtcbiAgICBsZXQgcXVlc3Rpb246IEdyYXBoaWNRXG4gICAgcXVlc3Rpb25PcHRpb25zID0gcXVlc3Rpb25PcHRpb25zIHx8IHt9XG4gICAgdmlld09wdGlvbnMgPSB2aWV3T3B0aW9ucyB8fCB7fVxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSAnYWFhcCc6XG4gICAgICBjYXNlICdhb3NsJzoge1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuYW5nbGVTdW0gPSAodHlwZSA9PT0gJ2FhYXAnKSA/IDM2MCA6IDE4MFxuICAgICAgICBzd2l0Y2ggKHN1YnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdzaW1wbGUnOlxuICAgICAgICAgIGNhc2UgJ3JlcGVhdGVkJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uXG4gICAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMucmVwZWF0ZWQgPSBzdWJ0eXBlID09PSAncmVwZWF0ZWQnXG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNBcm91bmRRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdhbGdlYnJhJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICd3b3JkZWQnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzV29yZGVkUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgdW5leHBlY3RlZCBzdWJ0eXBlICR7c3VidHlwZX1gKVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICd0cmlhbmdsZSc6IHtcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnJlcGVhdGVkID0gKHN1YnR5cGUgPT09ICdyZXBlYXRlZCcpXG4gICAgICAgIHN3aXRjaCAoc3VidHlwZSkge1xuICAgICAgICAgIGNhc2UgJ3NpbXBsZSc6XG4gICAgICAgICAgY2FzZSAncmVwZWF0ZWQnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdhbGdlYnJhJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3dvcmRlZCc6XG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHVuZXhwZWN0ZWQgc3VidHlwZSAke3N1YnR5cGV9YClcbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHR5cGUgJHt0eXBlfWApXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzUShxdWVzdGlvbilcbiAgfVxuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHsgcmV0dXJuIHRoaXMucXVlc3Rpb24uZ2V0RE9NKCkgfVxuICByZW5kZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5yZW5kZXIoKSB9XG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5zaG93QW5zd2VyKCkgfVxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24uaGlkZUFuc3dlcigpIH1cbiAgdG9nZ2xlQW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24udG9nZ2xlQW5zd2VyKCkgfVxuXG4gIHN0YXRpYyBnZXQgb3B0aW9uc1NwZWMgKCk6IE9wdGlvbnNTcGVjIHtcbiAgICByZXR1cm4gW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnaGVhZGluZycsXG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgfSxcblxuICAgICAge1xuICAgICAgICB0aXRsZTogJ1R5cGVzJyxcbiAgICAgICAgaWQ6ICd0eXBlcycsXG4gICAgICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICAgICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgICAgIHsgdGl0bGU6ICdPbiBhIHN0cmFpZ2h0IGxpbmUnLCBpZDogJ2Fvc2wnIH0sXG4gICAgICAgICAgeyB0aXRsZTogJ0Fyb3VuZCBhIHBvaW50JywgaWQ6ICdhYWFwJyB9LFxuICAgICAgICAgIHsgdGl0bGU6ICdUcmlhbmdsZScsIGlkOiAndHJpYW5nbGUnIH1cbiAgICAgICAgXSxcbiAgICAgICAgZGVmYXVsdDogWydhb3NsJywgJ2FhYXAnLCAndHJpYW5nbGUnXSxcbiAgICAgICAgdmVydGljYWw6IHRydWVcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjb2x1bW4tYnJlYWsnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnPGI+Q3VzdG9tIHNldHRpbmdzIChkaXNhYmxlcyBkaWZmaWN1bHR5KTwvYj4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgaWQ6ICdjdXN0b20nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAncmFuZ2UnLFxuICAgICAgICBpZDogJ24tYW5nbGVzJyxcbiAgICAgICAgaWRMQjogJ21pbk4nLFxuICAgICAgICBpZFVCOiAnbWF4TicsXG4gICAgICAgIGRlZmF1bHRMQjogMixcbiAgICAgICAgZGVmYXVsdFVCOiA0LFxuICAgICAgICBtaW46IDIsXG4gICAgICAgIG1heDogOCxcbiAgICAgICAgdGl0bGU6ICdOdW1iZXIgb2YgYW5nbGVzJyxcbiAgICAgICAgZW5hYmxlZElmOiAnY3VzdG9tJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJ1NpbXBsZScsXG4gICAgICAgIGlkOiAnc2ltcGxlJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlZElmOiAnY3VzdG9tJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJ1JlcGVhdGVkL0lzb3NjZWxlcycsXG4gICAgICAgIGlkOiAncmVwZWF0ZWQnLFxuICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICBlbmFibGVkSWY6ICdjdXN0b20nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnQWxnZWJyYWljJyxcbiAgICAgICAgaWQ6ICdhbGdlYnJhJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlZElmOiAnY3VzdG9tJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3N1Ym9wdGlvbnMnLFxuICAgICAgICB0aXRsZTogJycsXG4gICAgICAgIGlkOiAnYWxnZWJyYU9wdGlvbnMnLFxuICAgICAgICBvcHRpb25zU3BlYzogTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRLm9wdGlvbnNTcGVjLFxuICAgICAgICBlbmFibGVkSWY6ICdjdXN0b20mYWxnZWJyYSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgdGl0bGU6ICdXb3JkZWQnLFxuICAgICAgICBpZDogJ3dvcmRlZCcsXG4gICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgIGVuYWJsZWRJZjogJ2N1c3RvbSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdzdWJvcHRpb25zJyxcbiAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICBpZDogJ3dvcmRlZE9wdGlvbnMnLFxuICAgICAgICBvcHRpb25zU3BlYzogTWlzc2luZ0FuZ2xlc1dvcmRlZFEub3B0aW9uc1NwZWMsXG4gICAgICAgIGVuYWJsZWRJZjogJ2N1c3RvbSZ3b3JkZWQnXG4gICAgICB9XG4gICAgXVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnXG4gIH1cbn1cbiIsImltcG9ydCB7IHJhbmRCZXR3ZWVuLCByYW5kRWxlbSB9IGZyb20gXCJ1dGlsaXRpZXNcIlxuaW1wb3J0IHsgUXVlc3Rpb25PcHRpb25zIH0gZnJvbSBcIi4vdHlwZXNcIlxuXG4vKipcbiAqIEEgdmFsdWUgZm9yIHNpZGVzLCBhcmVhcyBhbmQgcGVyaW1ldGVyc1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFZhbHVlIHtcbiAgdmFsOiBudW1iZXIsICAgICAgLy8gdGhlIG51bWVyaWNhbCB2YWx1ZVxuICBzaG93OiBib29sZWFuLCAgICAvLyB3aGV0aGVyIHRoYXQgdmFsdWUgaXMgc2hvd24gaW4gdGhlIHF1ZXN0aW9uIG9yIGFuc3dlciBhdCBhbGxcbiAgbWlzc2luZzogYm9vbGVhbiAgLy8gd2hldGhlciB0aGUgdmFsdWUgaXMgc2hvd24gaW4gdGhlIHF1ZXN0aW9uXG59XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjdGFuZ2xlQXJlYURhdGEge1xuICByZWFkb25seSBiYXNlIDogVmFsdWVcbiAgcmVhZG9ubHkgaGVpZ2h0OiBWYWx1ZVxuICByZWFkb25seSBzaG93T3Bwb3NpdGVzOiBib29sZWFuXG4gIHByaXZhdGUgX2FyZWE/OiBQYXJ0aWFsPFZhbHVlPiAgICAgICAvLyBsYXppbHkgY2FsY3VsYXRlZFxuICBwcml2YXRlIF9wZXJpbWV0ZXI/OiBQYXJ0aWFsPFZhbHVlPlxuXG4gIGNvbnN0cnVjdG9yKGJhc2U6IFZhbHVlLCBoZWlnaHQ6IFZhbHVlLCBzaG93T3Bwb3NpdGVzOiBib29sZWFuLCBhcmVhUHJvcGVydGllcz86IE9taXQ8VmFsdWUsJ3ZhbCc+LCBwZXJpbWV0ZXJQcm9wZXJ0aWVzPzogT21pdDxWYWx1ZSwndmFsJz4gKSB7XG4gICAgdGhpcy5iYXNlID0gYmFzZVxuICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0XG4gICAgdGhpcy5zaG93T3Bwb3NpdGVzID0gc2hvd09wcG9zaXRlc1xuICAgIHRoaXMuX2FyZWEgPSBhcmVhUHJvcGVydGllc1xuICAgIHRoaXMuX3BlcmltZXRlciA9IHBlcmltZXRlclByb3BlcnRpZXNcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20ob3B0aW9uczogUXVlc3Rpb25PcHRpb25zKSA6IFJlY3RhbmdsZUFyZWFEYXRhIHtcbiAgICBvcHRpb25zLm1heExlbmd0aCA9IG9wdGlvbnMubWF4TGVuZ3RoIHx8IDIwIC8vIGRlZmF1bHQgdmFsdWVzXG4gICAgb3B0aW9ucy5kcCA9IG9wdGlvbnMuZHAgfHwgMFxuXG4gICAgY29uc3Qgc2lkZXMgPSB7XG4gICAgICBiYXNlOiByYW5kQmV0d2VlbigxLG9wdGlvbnMubWF4TGVuZ3RoKSxcbiAgICAgIGhlaWdodDogcmFuZEJldHdlZW4oMSxvcHRpb25zLm1heExlbmd0aClcbiAgICB9XG5cbiAgICBjb25zdCBiYXNlIDogVmFsdWUgPSB7dmFsOiBzaWRlcy5iYXNlLCBzaG93OiB0cnVlLCBtaXNzaW5nOiBmYWxzZX07XG4gICAgY29uc3QgaGVpZ2h0IDogVmFsdWUgPSB7dmFsOiBzaWRlcy5oZWlnaHQsIHNob3c6IHRydWUsIG1pc3Npbmc6IGZhbHNlfTtcbiAgICBsZXQgc2hvd09wcG9zaXRlcyA6IGJvb2xlYW5cbiAgICBsZXQgYXJlYVByb3BlcnRpZXMgOiBQYXJ0aWFsPE9taXQ8VmFsdWUsICd2YWwnPj4gPSB7fVxuICAgIGxldCBwZXJpbWV0ZXJQcm9wZXJ0aWVzIDogUGFydGlhbDxPbWl0PFZhbHVlLCAndmFsJz4+ID0ge31cblxuICAgIC8vc2VsZWN0aXZlbHkgaGlkZS9taXNzaW5nIGRlcGVuZGluZyBvbiB0eXBlXG4gICAgc3dpdGNoKG9wdGlvbnMucXVlc3Rpb25UeXBlKSB7XG4gICAgY2FzZSBcImFyZWFcIjpcbiAgICAgIGFyZWFQcm9wZXJ0aWVzLnNob3c9dHJ1ZTtcbiAgICAgIGFyZWFQcm9wZXJ0aWVzLm1pc3Npbmc9dHJ1ZTtcbiAgICAgIHNob3dPcHBvc2l0ZXM9IW9wdGlvbnMubm9EaXN0cmFjdG9ycztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJwZXJpbWV0ZXJcIjpcbiAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdz10cnVlO1xuICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nPXRydWU7XG4gICAgICBzaG93T3Bwb3NpdGVzPW9wdGlvbnMubm9EaXN0cmFjdG9ycztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJyZXZlcnNlQXJlYVwiOlxuICAgICAgYXJlYVByb3BlcnRpZXMuc2hvdz10cnVlO1xuICAgICAgYXJlYVByb3BlcnRpZXMubWlzc2luZz1mYWxzZTtcbiAgICAgIHJhbmRFbGVtKFtiYXNlLGhlaWdodF0pLm1pc3NpbmcgPSB0cnVlO1xuICAgICAgc2hvd09wcG9zaXRlcz1mYWxzZTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJyZXZlcnNlUGVyaW1ldGVyXCI6XG4gICAgZGVmYXVsdDpcbiAgICAgIHBlcmltZXRlclByb3BlcnRpZXMuc2hvdz10cnVlO1xuICAgICAgcGVyaW1ldGVyUHJvcGVydGllcy5taXNzaW5nPWZhbHNlO1xuICAgICAgcmFuZEVsZW0oW2Jhc2UsaGVpZ2h0XSkubWlzc2luZyA9IHRydWU7XG4gICAgICBzaG93T3Bwb3NpdGVzPWZhbHNlO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGJhc2UsaGVpZ2h0LHNob3dPcHBvc2l0ZXMsYXJlYVByb3BlcnRpZXMgYXMgT21pdDxWYWx1ZSwgJ3ZhbCc+LHBlcmltZXRlclByb3BlcnRpZXMgYXMgT21pdDxWYWx1ZSwgJ3ZhbCc+KVxuICB9XG5cbiAgZ2V0IHBlcmltZXRlcigpIDogVmFsdWUge1xuICAgIGlmICghdGhpcy5fcGVyaW1ldGVyKSB7XG4gICAgICB0aGlzLl9wZXJpbWV0ZXIgPSB7XG4gICAgICAgIHNob3c6IGZhbHNlLFxuICAgICAgICBtaXNzaW5nOiB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5fcGVyaW1ldGVyLnZhbCkge1xuICAgICAgdGhpcy5fcGVyaW1ldGVyLnZhbCA9IDIqKHRoaXMuYmFzZS52YWwrdGhpcy5oZWlnaHQudmFsKVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcGVyaW1ldGVyIGFzIFZhbHVlXG4gIH1cblxuICBnZXQgYXJlYSgpIDogVmFsdWUge1xuICAgIGlmICghdGhpcy5fYXJlYSkge1xuICAgICAgdGhpcy5fYXJlYSA9IHtcbiAgICAgICAgc2hvdzogZmFsc2UsXG4gICAgICAgIG1pc3Npbmc6IHRydWVcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0aGlzLl9hcmVhLnZhbCkge1xuICAgICAgdGhpcy5fYXJlYS52YWwgPSB0aGlzLmJhc2UudmFsICogdGhpcy5oZWlnaHQudmFsXG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9hcmVhIGFzIFZhbHVlXG4gIH1cbn0iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5cbi8qIENhbnZhcyBkcmF3aW5nLCB1c2luZyB0aGUgUG9pbnQgY2xhc3MgKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGRhc2hlZExpbmUoY3R4LHgxLHkxLHgyLHkyKSB7XG4gIC8vIFdvcmsgaWYgZ2l2ZW4gdHdvIHBvaW50cyBpbnN0ZWFkOlxuICBpZiAoeDEgaW5zdGFuY2VvZiBQb2ludCAmJiB4MiBpbnN0YW5jZW9mIFBvaW50KSB7XG4gICAgY29uc3QgcDEgPSB4MSwgcDIgPSB4MjtcbiAgICB4MSA9IHAxLngsIHkxID0gcDEueSwgeDIgPSBwMi54LCB5MiA9IHAyLnk7XG4gIH1cblxuICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHgyLXgxLHkyLXkxKTtcbiAgY29uc3QgZGFzaHggPSAoeTEteTIpL2xlbmd0aDsgLy8gdW5pdCB2ZWN0b3IgcGVycGVuZGljdWxhciB0byBsaW5lXG4gIGNvbnN0IGRhc2h5ID0gKHgyLXgxKS9sZW5ndGg7XG4gIGNvbnN0IG1pZHggPSAoeDEreDIpLzI7XG4gIGNvbnN0IG1pZHkgPSAoeTEreTIpLzI7XG5cbiAgLy8gZHJhdyB0aGUgYmFzZSBsaW5lXG4gIGN0eC5tb3ZlVG8oeDEseTEpO1xuICBjdHgubGluZVRvKHgyLHkyKTtcblxuICAvLyBkcmF3IHRoZSBkYXNoXG4gIGN0eC5tb3ZlVG8obWlkeCs1KmRhc2h4LG1pZHkrNSpkYXNoeSk7XG4gIGN0eC5saW5lVG8obWlkeC01KmRhc2h4LG1pZHktNSpkYXNoeSk7XG5cbiAgY3R4Lm1vdmVUbyh4Mix5Mik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcnJvd0xpbmUoY3R4LHB0MSxwdDIsc2l6ZSxtKSB7XG4gIGlmICghbSkgbT0wLjU7XG5cbiAgbGV0IHVuaXQgPSBQb2ludC51bml0VmVjdG9yKHB0MSxwdDIpO1xuICB1bml0LnggKj0gc2l6ZTtcbiAgdW5pdC55ICo9IHNpemU7XG4gIGxldCBub3JtYWwgPSB7eDogLXVuaXQueSwgeTogdW5pdC54fTtcbiAgbm9ybWFsLnggKj0gbTtcbiAgbm9ybWFsLnkgKj0gbTtcblxuICBjb25zdCBjb250cm9sMSA9IHB0Mi5jbG9uZSgpXG4gICAgLnRyYW5zbGF0ZSgtdW5pdC54LC11bml0LnkpXG4gICAgLnRyYW5zbGF0ZShub3JtYWwueCxub3JtYWwueSk7XG5cbiAgY29uc3QgY29udHJvbDIgPSBwdDIuY2xvbmUoKVxuICAgIC50cmFuc2xhdGUoLXVuaXQueCwtdW5pdC55KVxuICAgIC50cmFuc2xhdGUoLW5vcm1hbC54LC1ub3JtYWwueSk7XG5cbiAgY3R4Lm1vdmVUbyhwdDEueCxwdDEueSk7XG4gIGN0eC5saW5lVG8ocHQyLngscHQyLnkpO1xuICBjdHgubGluZVRvKGNvbnRyb2wxLngsY29udHJvbDEueSk7XG4gIGN0eC5tb3ZlVG8ocHQyLngscHQyLnkpO1xuICBjdHgubGluZVRvKGNvbnRyb2wyLngsY29udHJvbDIueSk7XG59XG5cbi8qKlxuICogRHJhdyBhIHJpZ2h0IGFuZ2xlIHN5bWJvbCBmb3IgYW5nbGUgQU9DLiBOQjogbm8gY2hlY2sgaXMgbWFkZSB0aGF0IEFPQyBpcyBpbmRlZWQgYSByaWdodCBhbmdsZVxuICogQHBhcmFtIHtDYW52YXNSZW5kZXJpbmdDb250ZXh0MkR9IGN0eCBUaGUgY29udGV4dCB0byBkcmF3IGluXG4gKiBAcGFyYW0ge1BvaW50fSBBIFN0YXJ0IHBvaW50XG4gKiBAcGFyYW0ge1BvaW50fSBPIFZlcnRleCBwb2ludFxuICogQHBhcmFtIHtQb2ludH0gQyBFbmQgcG9pbnRcbiAqIEBwYXJhbSB7bnVtYmVyfSBzaXplIFNpemUgb2YgcmlnaHQgYW5nbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRyYXdSaWdodEFuZ2xlIChjdHgsIEEsIE8sIEMsIHNpemUpIHtcbiAgY29uc3QgdW5pdE9BID0gUG9pbnQudW5pdFZlY3RvcihPLEEpO1xuICBjb25zdCB1bml0T0MgPSBQb2ludC51bml0VmVjdG9yKE8sQyk7XG4gIGNvbnN0IGN0bDEgPSBPLmNsb25lKCkudHJhbnNsYXRlKHVuaXRPQS54KnNpemUsdW5pdE9BLnkqc2l6ZSk7XG4gIGNvbnN0IGN0bDIgPSBjdGwxLmNsb25lKCkudHJhbnNsYXRlKHVuaXRPQy54KnNpemUsdW5pdE9DLnkqc2l6ZSk7XG4gIGNvbnN0IGN0bDMgPSBPLmNsb25lKCkudHJhbnNsYXRlKHVuaXRPQy54KnNpemUsdW5pdE9DLnkqc2l6ZSk7XG4gIGN0eC5tb3ZlVG8oY3RsMS54LGN0bDEueSk7XG4gIGN0eC5saW5lVG8oY3RsMi54LGN0bDIueSk7XG4gIGN0eC5saW5lVG8oY3RsMy54LGN0bDMueSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJhbGxlbFNpZ24gKGN0eCwgQSwgQiwgc2l6ZSwgbnVtYmVyLCBnYXApIHtcbiAgaWYgKCFzaXplKSBzaXplID0gMTA7XG4gIGlmICghbnVtYmVyKSBudW1iZXIgPSAxO1xuICBpZiAoIWdhcCkgZ2FwID0gc2l6ZTtcblxuICBsZXQgdW5pdCA9IFBvaW50LnVuaXRWZWN0b3IoQSxCKTtcbiAgdW5pdC54ICo9IHNpemU7XG4gIHVuaXQueSAqPSBzaXplO1xuICBjb25zdCBub3JtYWwgPSB7eDogLXVuaXQueSwgeTogdW5pdC54fTtcblxuICBjb25zdCBNID0gUG9pbnQubWVhbihbQSxCXSk7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGk8bnVtYmVyOyBpKyspIHtcbiAgICBjb25zdCBjdGwyID0gTS5jbG9uZSgpLm1vdmVUb3dhcmQoQixpKmdhcCk7XG4gICAgY29uc3QgY3RsMSA9IGN0bDIuY2xvbmUoKVxuICAgICAgLnRyYW5zbGF0ZSgtdW5pdC54LC11bml0LnkpXG4gICAgICAudHJhbnNsYXRlKG5vcm1hbC54LG5vcm1hbC55KTtcbiAgICBjb25zdCBjdGwzID0gY3RsMi5jbG9uZSgpXG4gICAgICAudHJhbnNsYXRlKC11bml0LngsLXVuaXQueSlcbiAgICAgIC50cmFuc2xhdGUoLW5vcm1hbC54LC1ub3JtYWwueSk7XG5cbiAgICBjdHgubW92ZVRvKGN0bDEueCxjdGwxLnkpO1xuICAgIGN0eC5saW5lVG8oY3RsMi54LGN0bDIueSk7XG4gICAgY3R4LmxpbmVUbyhjdGwzLngsY3RsMy55KTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgZHJhd1JpZ2h0QW5nbGUgfSBmcm9tIFwiZHJhd2luZ1wiO1xuaW1wb3J0IFBvaW50IGZyb20gXCJQb2ludFwiO1xuaW1wb3J0IHsgR3JhcGhpY1FEYXRhLCBHcmFwaGljUVZpZXcsIExhYmVsIH0gZnJvbSBcIi4uL0dyYXBoaWNRXCI7XG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSBcIi4uL1ZpZXdPcHRpb25zXCI7XG5pbXBvcnQgUmVjdGFuZ2xlQXJlYURhdGEsIHsgVmFsdWUgfSBmcm9tIFwiLi9SZWN0YW5nbGVBcmVhRGF0YVwiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWN0YW5nbGVBcmVhVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIGRhdGE6IFJlY3RhbmdsZUFyZWFEYXRhXG4gIEE6IFBvaW50XG4gIEI6IFBvaW50XG4gIEM6IFBvaW50XG4gIEQ6IFBvaW50XG5cbiAgY29uc3RydWN0b3IoQTogUG9pbnQsQjogUG9pbnQsQzogUG9pbnQsRDogUG9pbnQsbGFiZWxzOiBMYWJlbFtdLGRhdGE6IFJlY3RhbmdsZUFyZWFEYXRhLCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICAvKiBTdXBlciBkb2VzOlxuICAgICAqICBTZXRzIHRoaXMud2lkdGggYW5kIHRoaXMuaGVpZ2h0XG4gICAgICogIFNldHMgdGhpcy5kYXRhXG4gICAgICogIENyZWF0ZXMgRE9NIGVsZW1lbnRzLCBpbmNsdWRpbmcgY2FudmFzXG4gICAgICogIENyZWF0ZXMgZW1wdHkgdGhpcy5sYWJlbHMgbGlzdFxuICAgICAqL1xuICAgIHN1cGVyKGRhdGEsdmlld09wdGlvbnMpIFxuICAgIHRoaXMuQSA9IEFcbiAgICB0aGlzLkIgPSBCXG4gICAgdGhpcy5DID0gQ1xuICAgIHRoaXMuRCA9IERcbiAgICB0aGlzLmxhYmVscyA9IGxhYmVsc1xuICB9XG5cbiAgLyoqXG4gICAqIFN0YXRpYyBmYWN0b3J5IG1ldGhvZCByZXR1cm5pbmcgdmlldyBmcm9tIGRhdGEgXG4gICAqIEBwYXJhbSBkYXRhIEEgZGF0YSBvYmplY3QsIHdoaWNoIGhhZCBkZXRhaWxzIG9mIHdpZHRoLCBoZWlnaHQgYW5kIGFyZWFcbiAgICogQHBhcmFtIHZpZXdPcHRpb25zIFZpZXcgb3B0aW9ucyAtIGNvbnRhaW5pbmcgd2lkdGggYW5kIGhlaWdodFxuICAgKi9cbiAgc3RhdGljIGZyb21EYXRhKGRhdGE6IFJlY3RhbmdsZUFyZWFEYXRhLCB2aWV3T3B0aW9ucz86IFZpZXdPcHRpb25zKSA6IFJlY3RhbmdsZUFyZWFWaWV3IHtcbiAgICAvLyBEZWZhdWx0cyAoTkI6IGR1cGxpY2F0ZXMgZWZmb3J0IGluIGNvbnN0cnVjdG9yLCBnaXZlbiB1c2Ugb2Ygc3RhdGljIGZhY3RvcnkgY29uc3RydWN0b3IgaW5zdGVhZCBvZiBHcmFwaGljUSdzIG1ldGhvZClcbiAgICB2aWV3T3B0aW9ucyA9IHZpZXdPcHRpb25zID8/IHt9XG4gICAgdmlld09wdGlvbnMud2lkdGggPSB2aWV3T3B0aW9ucy53aWR0aCA/PyAzMDBcbiAgICB2aWV3T3B0aW9ucy5oZWlnaHQgPSB2aWV3T3B0aW9ucy5oZWlnaHQgPz8gMzAwXG5cbiAgICAvLyBpbml0aWFsIHBvaW50c1xuICAgIGNvbnN0IEEgPSBuZXcgUG9pbnQoMCwwKTtcbiAgICBjb25zdCBCID0gbmV3IFBvaW50KDAsZGF0YS5oZWlnaHQudmFsKTtcbiAgICBjb25zdCBDID0gbmV3IFBvaW50KGRhdGEuYmFzZS52YWwsZGF0YS5oZWlnaHQudmFsKTtcbiAgICBjb25zdCBEID0gbmV3IFBvaW50KGRhdGEuYmFzZS52YWwsMCk7XG5cbiAgICAvLyByb3RhdGUsIHNjYWxlIGFuZCBjZW50ZXJcbiAgICBjb25zdCByb3RhdGlvbiA9IHZpZXdPcHRpb25zLnJvdGF0aW9uID8/IDIqTWF0aC5QSSpNYXRoLnJhbmRvbSgpXG4gICAgO1tBLEIsQyxEXS5mb3JFYWNoKCBwdCA9PiBwdC5yb3RhdGUocm90YXRpb24pIClcbiAgICBQb2ludC5zY2FsZVRvRml0KFtBLEIsQyxEXSx2aWV3T3B0aW9ucy53aWR0aCx2aWV3T3B0aW9ucy5oZWlnaHQsODApXG5cbiAgICAvLyBTZXQgdXAgbGFiZWxzXG4gICAgbGV0IGxhYmVscyA6IExhYmVsW10gPSBbXTtcblxuICAgIGNvbnN0IHNpZGVzIDogW1BvaW50LFBvaW50LFZhbHVlXVtdID0gWyAvL1sxc3QgcG9pbnQsIDJuZCBwb2ludCwgbGVuZ3RoXVxuICAgICAgW0EsQixkYXRhLmhlaWdodF0sXG4gICAgICBbQixDLGRhdGEuYmFzZV0sXG4gICAgXTtcblxuICAgIGlmIChkYXRhLnNob3dPcHBvc2l0ZXMpIHtcbiAgICAgIHNpZGVzLnB1c2goW0MsRCxkYXRhLmhlaWdodF0pO1xuICAgICAgc2lkZXMucHVzaChbRCxBLGRhdGEuYmFzZV0pO1xuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwLCBuPXNpZGVzLmxlbmd0aDsgaSA8IG47IGkrKykgeyAvL3NpZGVzXG4gICAgICBpZiAoIXNpZGVzW2ldWzJdLnNob3cpIGNvbnRpbnVlO1xuICAgICAgY29uc3Qgb2Zmc2V0ID0gMjA7XG4gICAgICBsZXQgcG9zID0gUG9pbnQubWVhbihzaWRlc1tpXVswXSxzaWRlc1tpXVsxXSk7XG4gICAgICBjb25zdCB1bml0dmVjID0gUG9pbnQudW5pdFZlY3RvcihzaWRlc1tpXVswXSwgc2lkZXNbaV1bMV0pO1xuICAgICAgXG4gICAgICBwb3MudHJhbnNsYXRlKC11bml0dmVjLnkqb2Zmc2V0LCB1bml0dmVjLngqb2Zmc2V0KTsgXG5cbiAgICAgIGNvbnN0IHRleHRhID0gc2lkZXNbaV1bMl0udmFsLnRvU3RyaW5nKCkgKyBcIlxcXFxtYXRocm17Y219XCI7XG4gICAgICBjb25zdCB0ZXh0cSA9IHNpZGVzW2ldWzJdLm1pc3Npbmc/IFwiP1wiIDogdGV4dGE7XG4gICAgICBjb25zdCBzdHlsZXEgPSBcIm5vcm1hbFwiO1xuICAgICAgY29uc3Qgc3R5bGVhID0gc2lkZXNbaV1bMl0ubWlzc2luZz8gXCJhbnN3ZXJcIiA6IFwibm9ybWFsXCI7XG5cbiAgICAgIGxhYmVscy5wdXNoKHtcbiAgICAgICAgcG9zOiBwb3MsXG4gICAgICAgIHRleHRhOiB0ZXh0YSxcbiAgICAgICAgdGV4dHE6IHRleHRxLFxuICAgICAgICB0ZXh0OiB0ZXh0cSxcbiAgICAgICAgc3R5bGVhOiBzdHlsZWEsXG4gICAgICAgIHN0eWxlcTogc3R5bGVxLFxuICAgICAgICBzdHlsZTogc3R5bGVxXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBsZXQgbl9pbmZvID0gMDtcbiAgICBpZiAoZGF0YS5hcmVhLnNob3cpIHtcbiAgICAgIGNvbnN0IHRleHRhID0gZGF0YS5hcmVhLnZhbC50b1N0cmluZygpICsgXCJcXFxcbWF0aHJte2NtfV4yXCI7XG4gICAgICBjb25zdCB0ZXh0cSA9IGRhdGEuYXJlYS5taXNzaW5nPyBcIj9cIiA6IHRleHRhO1xuICAgICAgY29uc3Qgc3R5bGVxID0gXCJleHRyYS1pbmZvXCI7XG4gICAgICBjb25zdCBzdHlsZWEgPSBkYXRhLmFyZWEubWlzc2luZz8gXCJleHRyYS1hbnN3ZXJcIiA6IFwiZXh0cmEtaW5mb1wiO1xuICAgICAgbGFiZWxzLnB1c2goXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXh0YTogXCJBcmVhID0gXCIgKyB0ZXh0YSxcbiAgICAgICAgICB0ZXh0cTogXCJBcmVhID0gXCIgKyB0ZXh0cSxcbiAgICAgICAgICB0ZXh0OiBcIkFyZWEgPSBcIiArIHRleHRxLFxuICAgICAgICAgIHN0eWxlcTogc3R5bGVxLFxuICAgICAgICAgIHN0eWxlYTogc3R5bGVhLFxuICAgICAgICAgIHN0eWxlOiBzdHlsZXEsXG4gICAgICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIHZpZXdPcHRpb25zLmhlaWdodCAtIDEwIC0gMTUqbl9pbmZvKSxcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICAgIG5faW5mbysrO1xuICAgIH1cblxuICAgIGlmIChkYXRhLnBlcmltZXRlci5zaG93KSB7XG4gICAgICBjb25zdCB0ZXh0YSA9IGRhdGEucGVyaW1ldGVyLnZhbC50b1N0cmluZygpICsgXCJcXFxcbWF0aHJte2NtfVwiO1xuICAgICAgY29uc3QgdGV4dHEgPSBkYXRhLnBlcmltZXRlci5taXNzaW5nPyBcIj9cIiA6IHRleHRhO1xuICAgICAgY29uc3Qgc3R5bGVxID0gXCJleHRyYS1pbmZvXCI7XG4gICAgICBjb25zdCBzdHlsZWEgPSBkYXRhLnBlcmltZXRlci5taXNzaW5nPyBcImV4dHJhLWFuc3dlclwiIDogXCJleHRyYS1pbmZvXCI7XG4gICAgICBsYWJlbHMucHVzaChcbiAgICAgICAge1xuICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB2aWV3T3B0aW9ucy5oZWlnaHQgLSAxMCAtIDIwKm5faW5mbyksXG4gICAgICAgICAgdGV4dGE6IFwiUGVyaW1ldGVyID0gXCIgKyB0ZXh0YSxcbiAgICAgICAgICB0ZXh0cTogXCJQZXJpbWV0ZXIgPSBcIiArIHRleHRxLFxuICAgICAgICAgIHRleHQ6IFwiUGVyaW1ldGVyID0gXCIgKyB0ZXh0cSxcbiAgICAgICAgICBzdHlsZXE6IHN0eWxlcSxcbiAgICAgICAgICBzdHlsZWE6IHN0eWxlYSxcbiAgICAgICAgICBzdHlsZTogc3R5bGVxLFxuICAgICAgICB9XG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVjdGFuZ2xlQXJlYVZpZXcoQSxCLEMsRCxsYWJlbHMsZGF0YSx2aWV3T3B0aW9ucylcbiAgfVxuXG4gIHJlbmRlcigpOiB2b2lkIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgY3R4LmNsZWFyUmVjdCgwLDAsdGhpcy5jYW52YXMud2lkdGgsdGhpcy5jYW52YXMuaGVpZ2h0KTsgLy8gY2xlYXJcbiAgICBjdHguc2V0TGluZURhc2goW10pO1xuXG4gICAgLy8gZHJhdyByZWN0YW5nbGVcbiAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgY3R4Lm1vdmVUbyh0aGlzLkEueCx0aGlzLkEueSk7XG4gICAgY3R4LmxpbmVUbyh0aGlzLkIueCx0aGlzLkIueSk7XG4gICAgY3R4LmxpbmVUbyh0aGlzLkMueCx0aGlzLkMueSk7XG4gICAgY3R4LmxpbmVUbyh0aGlzLkQueCx0aGlzLkQueSk7XG4gICAgY3R4LmxpbmVUbyh0aGlzLkEueCx0aGlzLkEueSk7XG4gICAgY3R4LnN0cm9rZSgpO1xuICAgIGN0eC5maWxsU3R5bGU9XCJMaWdodEdyZXlcIjtcbiAgICBjdHguZmlsbCgpO1xuICAgIGN0eC5jbG9zZVBhdGgoKTtcblxuICAgIC8vIHJpZ2h0IGFuZ2xlc1xuICAgIGNvbnN0IHNpemUgPSBNYXRoLm1pbihcbiAgICAgIDE1LFxuICAgICAgTWF0aC5taW4oUG9pbnQuZGlzdGFuY2UodGhpcy5BLHRoaXMuQiksUG9pbnQuZGlzdGFuY2UodGhpcy5CLHRoaXMuQykpLzNcbiAgICApO1xuICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICBkcmF3UmlnaHRBbmdsZShjdHgsdGhpcy5BLHRoaXMuQix0aGlzLkMsIHNpemUpO1xuICAgIGRyYXdSaWdodEFuZ2xlKGN0eCx0aGlzLkIsdGhpcy5DLHRoaXMuRCwgc2l6ZSk7XG4gICAgZHJhd1JpZ2h0QW5nbGUoY3R4LHRoaXMuQyx0aGlzLkQsdGhpcy5BLCBzaXplKTtcbiAgICBkcmF3UmlnaHRBbmdsZShjdHgsdGhpcy5ELHRoaXMuQSx0aGlzLkIsIHNpemUpO1xuICAgIGN0eC5zdHJva2UoKTtcbiAgICBjdHguY2xvc2VQYXRoKCk7XG5cbiAgICB0aGlzLnJlbmRlckxhYmVscygpXG4gIH1cblxuICBcblxufSIsImltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSBcIi4uL0dyYXBoaWNRXCI7XG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSBcIi4uL1ZpZXdPcHRpb25zXCI7XG5pbXBvcnQgUmVjdGFuZ2xlQXJlYURhdGEgZnJvbSBcIi4vUmVjdGFuZ2xlQXJlYURhdGFcIjtcbmltcG9ydCBSZWN0YW5nbGVBcmVhVmlldyBmcm9tIFwiLi9SZWN0YW5nbGVBcmVhVmlld1wiO1xuaW1wb3J0IHsgUXVlc3Rpb25PcHRpb25zIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuLy8gUmVjdGFuZ2xlIG5lZWRzIG5vIGZ1cnRoZXIgb3B0aW9uc1xuLy8gVHJpYW5nbGUgbmVlZHMgbm8gZnVydGhlciBvcHRpb25zIC0tIG5lZWRzIHBhc3NpbmcgaW4gXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlY3RhbmdsZUFyZWFRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhOiBSZWN0YW5nbGVBcmVhRGF0YVxuICB2aWV3OiBSZWN0YW5nbGVBcmVhVmlld1xuXG4gIGNvbnN0cnVjdG9yKGRhdGE6IFJlY3RhbmdsZUFyZWFEYXRhLHZpZXc6IFJlY3RhbmdsZUFyZWFWaWV3KSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgdGhpcy52aWV3ID0gdmlld1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbShvcHRpb25zOiBRdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucykge1xuICAgIGNvbnN0IGRhdGEgPSBSZWN0YW5nbGVBcmVhRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gUmVjdGFuZ2xlQXJlYVZpZXcuZnJvbURhdGEoZGF0YSx2aWV3T3B0aW9ucylcbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSx2aWV3KVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCgpIHtcbiAgICByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWVzJ1xuICB9XG5cbn0iLCJpbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gXCJPcHRpb25zU3BlY1wiO1xuaW1wb3J0IFF1ZXN0aW9uIGZyb20gXCJRdWVzdGlvbi9RdWVzdGlvblwiO1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tIFwidXRpbGl0aWVzXCI7XG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gXCIuLi9HcmFwaGljUVwiO1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gXCIuLi9WaWV3T3B0aW9uc1wiO1xuaW1wb3J0IFJlY3RhbmdsZUFyZWFRIGZyb20gXCIuL1JlY3RhbmdsZUFyZWFRXCI7XG5pbXBvcnQgeyBXcmFwcGVyT3B0aW9ucywgU2hhcGUsIFF1ZXN0aW9uVHlwZVNpbXBsZSwgUXVlc3Rpb25PcHRpb25zIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXJlYVBlcmltZXRlclEgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIHF1ZXN0aW9uOiBHcmFwaGljUSAvLyBtYWtlIG1vcmUgcHJlY2lzZSB3aXRoIHVuaW9uIG9mIGFjdHVhbCB0eXBlc1xuICBET006IEhUTUxFbGVtZW50XG4gIGFuc3dlcmVkOiBib29sZWFuXG4gIGNvbnN0cnVjdG9yKHF1ZXN0aW9uKSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMucXVlc3Rpb24gPSBxdWVzdGlvblxuICAgIHRoaXMuRE9NID0gcXVlc3Rpb24uRE9NXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tKG9wdGlvbnM6IFdyYXBwZXJPcHRpb25zKSB7XG4gICAgY29uc3QgcXVlc3Rpb25PcHRpb25zIDogUXVlc3Rpb25PcHRpb25zID0ge1xuICAgICAgbm9EaXN0cmFjdG9yczogZmFsc2UsXG4gICAgICBxdWVzdGlvblR5cGU6IFwiYXJlYVwiLFxuICAgICAgZHA6IDAsXG4gICAgICBtYXhMZW5ndGg6IDIwXG4gICAgfVxuICAgIGNvbnN0IHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucyAgPSB7XG4gICAgICBoZWlnaHQ6IDMwMCxcbiAgICAgIHdpZHRoOiAzMDAsXG4gICAgfVxuICAgIHJldHVybiBSZWN0YW5nbGVBcmVhUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLHZpZXdPcHRpb25zKVxuICAgIFxuICAgIC8qIE1vcmUgbG9naWMgLSB0byByZWluc3RhdGUgbGF0ZXJcbiAgICBjb25zdCBzaGFwZSA9IHJhbmRFbGVtKG9wdGlvbnMuc2hhcGVzKVxuICAgIGxldCBxdWVzdGlvbiA6IFF1ZXN0aW9uXG4gICAgaWYgKCFvcHRpb25zLmN1c3RvbSkge1xuICAgICAgcmV0dXJuIHRoaXMucmFuZG9tRnJvbURpZmZpY3VsdHkob3B0aW9ucy5kaWZmaWN1bHR5LCBzaGFwZSwgb3B0aW9ucy5xdWVzdGlvblR5cGVzU2ltcGxlKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBxdWVzdGlvblR5cGUgPSByYW5kRWxlbShvcHRpb25zLnF1ZXN0aW9uVHlwZXNDdXN0b20pXG4gICAgICBjb25zdCBxdWVzdGlvbk9wdGlvbnM6IFF1ZXN0aW9uT3B0aW9ucyA9IHtcbiAgICAgICAgcXVlc3Rpb25UeXBlOiBxdWVzdGlvblR5cGUsXG4gICAgICAgIGRwIDogMCxcbiAgICAgICAgbm9EaXN0cmFjdG9ycyA6IHRydWVcbiAgICAgIH1cbiAgICAgIGNvbnN0IHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucyA9IHt9XG4gICAgICBjb25zdCBxdWVzdGlvbiA9IFJlY3RhbmdsZUFyZWFRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsdmlld09wdGlvbnMpXG4gICAgICByZXR1cm4gbmV3IHRoaXMocXVlc3Rpb24pXG4gICAgfVxuICAgICovXG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyByYW5kb21Gcm9tRGlmZmljdWx0eShkaWZmaWN1bHR5OiBudW1iZXIsIHNoYXBlOiBTaGFwZSwgcXVlc3Rpb25UeXBlczogUXVlc3Rpb25UeXBlU2ltcGxlW10pOiBBcmVhUGVyaW1ldGVyUSB7XG4gICAgY29uc3QgcXVlc3Rpb25PcHRpb25zOiBRdWVzdGlvbk9wdGlvbnMgPSB7XG4gICAgICBxdWVzdGlvblR5cGU6IHJhbmRFbGVtKHF1ZXN0aW9uVHlwZXMpLFxuICAgICAgZHA6IDAsXG4gICAgICBub0Rpc3RyYWN0b3JzOiB0cnVlXG4gICAgfVxuICAgIGNvbnN0IHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucyA9IHt9XG4gICAgY29uc3QgcXVlc3Rpb24gPSBSZWN0YW5nbGVBcmVhUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICByZXR1cm4gbmV3IHRoaXMocXVlc3Rpb24pXG4gIH1cblxuICAvKiBXcmFwcyB0aGUgbWV0aG9kcyBvZiB0aGUgd3JhcHBlZCBxdWVzdGlvbiAqL1xuICByZW5kZXIoKTogdm9pZCB7IHRoaXMucXVlc3Rpb24ucmVuZGVyKCl9ICAgICAgXG4gIHNob3dBbnN3ZXIoKSA6IHZvaWQge3RoaXMucXVlc3Rpb24uc2hvd0Fuc3dlcigpfVxuICBoaWRlQW5zd2VyKCkgOiB2b2lkIHt0aGlzLnF1ZXN0aW9uLmhpZGVBbnN3ZXIoKX1cbiAgdG9nZ2xlQW5zd2VyKCkgOiB2b2lkIHt0aGlzLnF1ZXN0aW9uLnRvZ2dsZUFuc3dlcigpfVxuXG4gIHN0YXRpYyBnZXQgb3B0aW9uc1NwZWMoKSA6IE9wdGlvbnNTcGVje1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnc2hhcGVzJyxcbiAgICAgICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgICAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICAgICAge2lkOiAncmVjdGFuZ2xlJywgdGl0bGU6ICdSZWN0YW5nbGUnfVxuICAgICAgICBdLFxuICAgICAgICBkZWZhdWx0OiBbJ3JlY3RhbmdsZSddLFxuICAgICAgICB0aXRsZTogJ1NoYXBlcydcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiAncXVlc3Rpb25UeXBlc1NpbXBsZScsXG4gICAgICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICAgICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgICAgIHtpZDogJ2FyZWEnLCB0aXRsZTogJ0FyZWEnfSxcbiAgICAgICAgICB7aWQ6ICdwZXJpbWV0ZXInLCB0aXRsZTogJ1BlcmltZXRlcid9XG4gICAgICAgIF0sXG4gICAgICAgIGRlZmF1bHQ6IFsnYXJlYScsICdwZXJpbWV0ZXInXSxcbiAgICAgICAgdGl0bGU6ICdUeXBlIG9mIHF1ZXN0aW9uJ1xuICAgICAgfVxuICAgIF1cbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQoKSA6IHN0cmluZyB7XG4gICAgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJ1xuICB9XG5cbn0iLCJpbXBvcnQgQWxnZWJyYWljRnJhY3Rpb25RIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0FsZ2VicmFpY0ZyYWN0aW9uUSdcbmltcG9ydCBJbnRlZ2VyQWRkUSBmcm9tICdRdWVzdGlvbi9UZXh0US9JbnRlZ2VyQWRkJ1xuaW1wb3J0IEFyaXRobWFnb25RIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0FyaXRobWFnb25RJ1xuaW1wb3J0IFRlc3RRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1Rlc3RRJ1xuaW1wb3J0IEFkZEFaZXJvIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0FkZEFaZXJvJ1xuaW1wb3J0IEVxdWF0aW9uT2ZMaW5lIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0VxdWF0aW9uT2ZMaW5lJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNRIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dyYXBwZXInXG5pbXBvcnQgQXJlYVBlcmltZXRlclEgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvQXJlYVBlcmltZXRlci9BcmVhV3JhcHBlcidcblxuaW1wb3J0IE9wdGlvbnNTZXQgZnJvbSAnT3B0aW9uc1NldCdcblxuY29uc3QgdG9waWNMaXN0ID0gW1xuICB7XG4gICAgaWQ6ICdhbGdlYnJhaWMtZnJhY3Rpb24nLFxuICAgIHRpdGxlOiAnU2ltcGxpZnkgYWxnZWJyYWljIGZyYWN0aW9ucycsXG4gICAgY2xhc3M6IEFsZ2VicmFpY0ZyYWN0aW9uUVxuICB9LFxuICB7XG4gICAgaWQ6ICdhZGQtYS16ZXJvJyxcbiAgICB0aXRsZTogJ011bHRpcGx5IGJ5IDEwIChob25lc3QhKScsXG4gICAgY2xhc3M6IEFkZEFaZXJvXG4gIH0sXG4gIHtcbiAgICBpZDogJ2ludGVnZXItYWRkJyxcbiAgICB0aXRsZTogJ0FkZCBpbnRlZ2VycyAodiBzaW1wbGUpJyxcbiAgICBjbGFzczogSW50ZWdlckFkZFFcbiAgfSxcbiAge1xuICAgIGlkOiAnbWlzc2luZy1hbmdsZXMnLFxuICAgIHRpdGxlOiAnTWlzc2luZyBhbmdsZXMnLFxuICAgIGNsYXNzOiBNaXNzaW5nQW5nbGVzUVxuICB9LFxuICB7XG4gICAgaWQ6ICdhcmVhLXBlcmltdGVyJyxcbiAgICB0aXRsZTogJ0FyZWEgYW5kIHBlcmltZXRlciBvZiBzaGFwZXMnLFxuICAgIGNsYXNzOiBBcmVhUGVyaW1ldGVyUVxuICB9LFxuICB7XG4gICAgaWQ6ICdlcXVhdGlvbi1vZi1saW5lJyxcbiAgICB0aXRsZTogJ0VxdWF0aW9uIG9mIGEgbGluZSAoZnJvbSB0d28gcG9pbnRzKScsXG4gICAgY2xhc3M6IEVxdWF0aW9uT2ZMaW5lXG4gIH0sXG4gIHtcbiAgICBpZDogJ2FyaXRobWFnb24tYWRkJyxcbiAgICB0aXRsZTogJ0FyaXRobWFnb25zJyxcbiAgICBjbGFzczogQXJpdGhtYWdvblFcbiAgfSxcbiAge1xuICAgIGlkOiAndGVzdCcsXG4gICAgdGl0bGU6ICdUZXN0IHF1ZXN0aW9ucycsXG4gICAgY2xhc3M6IFRlc3RRXG4gIH1cbl1cblxuZnVuY3Rpb24gZ2V0Q2xhc3MgKGlkKSB7XG4gIC8vIFJldHVybiB0aGUgY2xhc3MgZ2l2ZW4gYW4gaWQgb2YgYSBxdWVzdGlvblxuXG4gIC8vIE9idmlvdXNseSB0aGlzIGlzIGFuIGluZWZmaWNpZW50IHNlYXJjaCwgYnV0IHdlIGRvbid0IG5lZWQgbWFzc2l2ZSBwZXJmb3JtYW5jZVxuICBmb3IgKGxldCBpID0gMDsgaSA8IHRvcGljTGlzdC5sZW5ndGg7IGkrKykge1xuICAgIGlmICh0b3BpY0xpc3RbaV0uaWQgPT09IGlkKSB7XG4gICAgICByZXR1cm4gdG9waWNMaXN0W2ldLmNsYXNzXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGxcbn1cblxuZnVuY3Rpb24gZ2V0VGl0bGUgKGlkKSB7XG4gIC8vIFJldHVybiB0aXRsZSBvZiBhIGdpdmVuIGlkXG4gIC8vXG4gIHJldHVybiB0b3BpY0xpc3QuZmluZCh0ID0+ICh0LmlkID09PSBpZCkpLnRpdGxlXG59XG5cbmZ1bmN0aW9uIGdldENvbW1hbmRXb3JkIChpZCkge1xuICByZXR1cm4gZ2V0Q2xhc3MoaWQpLmNvbW1hbmRXb3JkXG59XG5cbmZ1bmN0aW9uIGdldFRvcGljcyAoKSB7XG4gIC8vIHJldHVybnMgdG9waWNzIHdpdGggY2xhc3NlcyBzdHJpcHBlZCBvdXRcbiAgcmV0dXJuIHRvcGljTGlzdC5tYXAoeCA9PiAoeyBpZDogeC5pZCwgdGl0bGU6IHgudGl0bGUgfSkpXG59XG5cbmZ1bmN0aW9uIG5ld1F1ZXN0aW9uIChpZCwgb3B0aW9ucykge1xuICAvLyB0byBhdm9pZCB3cml0aW5nIGBsZXQgcSA9IG5ldyAoVG9waWNDaG9vc2VyLmdldENsYXNzKGlkKSkob3B0aW9ucylcbiAgY29uc3QgUXVlc3Rpb25DbGFzcyA9IGdldENsYXNzKGlkKVxuICBsZXQgcXVlc3Rpb25cbiAgaWYgKFF1ZXN0aW9uQ2xhc3MucmFuZG9tKSB7XG4gICAgcXVlc3Rpb24gPSBRdWVzdGlvbkNsYXNzLnJhbmRvbShvcHRpb25zKVxuICB9IGVsc2Uge1xuICAgIHF1ZXN0aW9uID0gbmV3IFF1ZXN0aW9uQ2xhc3Mob3B0aW9ucylcbiAgfVxuICByZXR1cm4gcXVlc3Rpb25cbn1cblxuZnVuY3Rpb24gbmV3T3B0aW9uc1NldCAoaWQpIHtcbiAgY29uc3Qgb3B0aW9uc1NwZWMgPSAoZ2V0Q2xhc3MoaWQpKS5vcHRpb25zU3BlYyB8fCBbXVxuICByZXR1cm4gbmV3IE9wdGlvbnNTZXQob3B0aW9uc1NwZWMpXG59XG5cbmZ1bmN0aW9uIGhhc09wdGlvbnMgKGlkKSB7XG4gIHJldHVybiAhIShnZXRDbGFzcyhpZCkub3B0aW9uc1NwZWMgJiYgZ2V0Q2xhc3MoaWQpLm9wdGlvbnNTcGVjLmxlbmd0aCA+IDApIC8vIHdlaXJkIGJvb2wgdHlwY2FzdGluZyB3b28hXG59XG5cbmV4cG9ydCB7IHRvcGljTGlzdCwgZ2V0Q2xhc3MsIG5ld1F1ZXN0aW9uLCBnZXRUb3BpY3MsIGdldFRpdGxlLCBuZXdPcHRpb25zU2V0LCBnZXRDb21tYW5kV29yZCwgaGFzT3B0aW9ucyB9XG4iLCIhZnVuY3Rpb24odCxvKXtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKG8pOlwib2JqZWN0XCI9PXR5cGVvZiBleHBvcnRzP21vZHVsZS5leHBvcnRzPW8oKTp0LnRpbmdsZT1vKCl9KHRoaXMsZnVuY3Rpb24oKXt2YXIgbz0hMTtmdW5jdGlvbiB0KHQpe3RoaXMub3B0cz1mdW5jdGlvbigpe2Zvcih2YXIgdD0xO3Q8YXJndW1lbnRzLmxlbmd0aDt0KyspZm9yKHZhciBvIGluIGFyZ3VtZW50c1t0XSlhcmd1bWVudHNbdF0uaGFzT3duUHJvcGVydHkobykmJihhcmd1bWVudHNbMF1bb109YXJndW1lbnRzW3RdW29dKTtyZXR1cm4gYXJndW1lbnRzWzBdfSh7fSx7b25DbG9zZTpudWxsLG9uT3BlbjpudWxsLGJlZm9yZU9wZW46bnVsbCxiZWZvcmVDbG9zZTpudWxsLHN0aWNreUZvb3RlcjohMSxmb290ZXI6ITEsY3NzQ2xhc3M6W10sY2xvc2VMYWJlbDpcIkNsb3NlXCIsY2xvc2VNZXRob2RzOltcIm92ZXJsYXlcIixcImJ1dHRvblwiLFwiZXNjYXBlXCJdfSx0KSx0aGlzLmluaXQoKX1mdW5jdGlvbiBlKCl7dGhpcy5tb2RhbEJveEZvb3RlciYmKHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUud2lkdGg9dGhpcy5tb2RhbEJveC5jbGllbnRXaWR0aCtcInB4XCIsdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS5sZWZ0PXRoaXMubW9kYWxCb3gub2Zmc2V0TGVmdCtcInB4XCIpfXJldHVybiB0LnByb3RvdHlwZS5pbml0PWZ1bmN0aW9uKCl7aWYoIXRoaXMubW9kYWwpcmV0dXJuIGZ1bmN0aW9uKCl7dGhpcy5tb2RhbD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpLHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbFwiKSwwIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5sZW5ndGgmJi0xIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKFwib3ZlcmxheVwiKXx8dGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsLS1ub092ZXJsYXlDbG9zZVwiKTt0aGlzLm1vZGFsLnN0eWxlLmRpc3BsYXk9XCJub25lXCIsdGhpcy5vcHRzLmNzc0NsYXNzLmZvckVhY2goZnVuY3Rpb24odCl7XCJzdHJpbmdcIj09dHlwZW9mIHQmJnRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZCh0KX0sdGhpcyksLTEhPT10aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoXCJidXR0b25cIikmJih0aGlzLm1vZGFsQ2xvc2VCdG49ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKSx0aGlzLm1vZGFsQ2xvc2VCdG4udHlwZT1cImJ1dHRvblwiLHRoaXMubW9kYWxDbG9zZUJ0bi5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsX19jbG9zZVwiKSx0aGlzLm1vZGFsQ2xvc2VCdG5JY29uPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpLHRoaXMubW9kYWxDbG9zZUJ0bkljb24uY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbF9fY2xvc2VJY29uXCIpLHRoaXMubW9kYWxDbG9zZUJ0bkljb24uaW5uZXJIVE1MPSc8c3ZnIHZpZXdCb3g9XCIwIDAgMTAgMTBcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+PHBhdGggZD1cIk0uMyA5LjdjLjIuMi40LjMuNy4zLjMgMCAuNS0uMS43LS4zTDUgNi40bDMuMyAzLjNjLjIuMi41LjMuNy4zLjIgMCAuNS0uMS43LS4zLjQtLjQuNC0xIDAtMS40TDYuNCA1bDMuMy0zLjNjLjQtLjQuNC0xIDAtMS40LS40LS40LTEtLjQtMS40IDBMNSAzLjYgMS43LjNDMS4zLS4xLjctLjEuMy4zYy0uNC40LS40IDEgMCAxLjRMMy42IDUgLjMgOC4zYy0uNC40LS40IDEgMCAxLjR6XCIgZmlsbD1cIiMwMDBcIiBmaWxsLXJ1bGU9XCJub256ZXJvXCIvPjwvc3ZnPicsdGhpcy5tb2RhbENsb3NlQnRuTGFiZWw9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIiksdGhpcy5tb2RhbENsb3NlQnRuTGFiZWwuY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbF9fY2xvc2VMYWJlbFwiKSx0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbC5pbm5lckhUTUw9dGhpcy5vcHRzLmNsb3NlTGFiZWwsdGhpcy5tb2RhbENsb3NlQnRuLmFwcGVuZENoaWxkKHRoaXMubW9kYWxDbG9zZUJ0bkljb24pLHRoaXMubW9kYWxDbG9zZUJ0bi5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbCkpO3RoaXMubW9kYWxCb3g9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKSx0aGlzLm1vZGFsQm94LmNsYXNzTGlzdC5hZGQoXCJ0aW5nbGUtbW9kYWwtYm94XCIpLHRoaXMubW9kYWxCb3hDb250ZW50PWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiksdGhpcy5tb2RhbEJveENvbnRlbnQuY2xhc3NMaXN0LmFkZChcInRpbmdsZS1tb2RhbC1ib3hfX2NvbnRlbnRcIiksdGhpcy5tb2RhbEJveC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Q29udGVudCksLTEhPT10aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoXCJidXR0b25cIikmJnRoaXMubW9kYWwuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbENsb3NlQnRuKTt0aGlzLm1vZGFsLmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3gpfS5jYWxsKHRoaXMpLGZ1bmN0aW9uKCl7dGhpcy5fZXZlbnRzPXtjbGlja0Nsb3NlQnRuOnRoaXMuY2xvc2UuYmluZCh0aGlzKSxjbGlja092ZXJsYXk6ZnVuY3Rpb24odCl7dmFyIG89dGhpcy5tb2RhbC5vZmZzZXRXaWR0aC10aGlzLm1vZGFsLmNsaWVudFdpZHRoLGU9dC5jbGllbnRYPj10aGlzLm1vZGFsLm9mZnNldFdpZHRoLTE1LHM9dGhpcy5tb2RhbC5zY3JvbGxIZWlnaHQhPT10aGlzLm1vZGFsLm9mZnNldEhlaWdodDtpZihcIk1hY0ludGVsXCI9PT1uYXZpZ2F0b3IucGxhdGZvcm0mJjA9PW8mJmUmJnMpcmV0dXJuOy0xIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKFwib3ZlcmxheVwiKSYmIWZ1bmN0aW9uKHQsbyl7Zm9yKDsodD10LnBhcmVudEVsZW1lbnQpJiYhdC5jbGFzc0xpc3QuY29udGFpbnMobyk7KTtyZXR1cm4gdH0odC50YXJnZXQsXCJ0aW5nbGUtbW9kYWxcIikmJnQuY2xpZW50WDx0aGlzLm1vZGFsLmNsaWVudFdpZHRoJiZ0aGlzLmNsb3NlKCl9LmJpbmQodGhpcykscmVzaXplOnRoaXMuY2hlY2tPdmVyZmxvdy5iaW5kKHRoaXMpLGtleWJvYXJkTmF2OmZ1bmN0aW9uKHQpey0xIT09dGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKFwiZXNjYXBlXCIpJiYyNz09PXQud2hpY2gmJnRoaXMuaXNPcGVuKCkmJnRoaXMuY2xvc2UoKX0uYmluZCh0aGlzKX0sLTEhPT10aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoXCJidXR0b25cIikmJnRoaXMubW9kYWxDbG9zZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIix0aGlzLl9ldmVudHMuY2xpY2tDbG9zZUJ0bik7dGhpcy5tb2RhbC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsdGhpcy5fZXZlbnRzLmNsaWNrT3ZlcmxheSksd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIix0aGlzLl9ldmVudHMucmVzaXplKSxkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLHRoaXMuX2V2ZW50cy5rZXlib2FyZE5hdil9LmNhbGwodGhpcyksZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsLGRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZCksdGhpcy5vcHRzLmZvb3RlciYmdGhpcy5hZGRGb290ZXIoKSx0aGlzfSx0LnByb3RvdHlwZS5fYnVzeT1mdW5jdGlvbih0KXtvPXR9LHQucHJvdG90eXBlLl9pc0J1c3k9ZnVuY3Rpb24oKXtyZXR1cm4gb30sdC5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe251bGwhPT10aGlzLm1vZGFsJiYodGhpcy5pc09wZW4oKSYmdGhpcy5jbG9zZSghMCksZnVuY3Rpb24oKXstMSE9PXRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZihcImJ1dHRvblwiKSYmdGhpcy5tb2RhbENsb3NlQnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLHRoaXMuX2V2ZW50cy5jbGlja0Nsb3NlQnRuKTt0aGlzLm1vZGFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIix0aGlzLl9ldmVudHMuY2xpY2tPdmVybGF5KSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLHRoaXMuX2V2ZW50cy5yZXNpemUpLGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsdGhpcy5fZXZlbnRzLmtleWJvYXJkTmF2KX0uY2FsbCh0aGlzKSx0aGlzLm1vZGFsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbCksdGhpcy5tb2RhbD1udWxsKX0sdC5wcm90b3R5cGUuaXNPcGVuPWZ1bmN0aW9uKCl7cmV0dXJuISF0aGlzLm1vZGFsLmNsYXNzTGlzdC5jb250YWlucyhcInRpbmdsZS1tb2RhbC0tdmlzaWJsZVwiKX0sdC5wcm90b3R5cGUub3Blbj1mdW5jdGlvbigpe2lmKCF0aGlzLl9pc0J1c3koKSl7dGhpcy5fYnVzeSghMCk7dmFyIHQ9dGhpcztyZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiB0Lm9wdHMuYmVmb3JlT3BlbiYmdC5vcHRzLmJlZm9yZU9wZW4oKSx0aGlzLm1vZGFsLnN0eWxlLnJlbW92ZVByb3BlcnR5P3RoaXMubW9kYWwuc3R5bGUucmVtb3ZlUHJvcGVydHkoXCJkaXNwbGF5XCIpOnRoaXMubW9kYWwuc3R5bGUucmVtb3ZlQXR0cmlidXRlKFwiZGlzcGxheVwiKSx0aGlzLl9zY3JvbGxQb3NpdGlvbj13aW5kb3cucGFnZVlPZmZzZXQsZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLWVuYWJsZWRcIiksZG9jdW1lbnQuYm9keS5zdHlsZS50b3A9LXRoaXMuX3Njcm9sbFBvc2l0aW9uK1wicHhcIix0aGlzLnNldFN0aWNreUZvb3Rlcih0aGlzLm9wdHMuc3RpY2t5Rm9vdGVyKSx0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoXCJ0aW5nbGUtbW9kYWwtLXZpc2libGVcIiksXCJmdW5jdGlvblwiPT10eXBlb2YgdC5vcHRzLm9uT3BlbiYmdC5vcHRzLm9uT3Blbi5jYWxsKHQpLHQuX2J1c3koITEpLHRoaXMuY2hlY2tPdmVyZmxvdygpLHRoaXN9fSx0LnByb3RvdHlwZS5jbG9zZT1mdW5jdGlvbih0KXtpZighdGhpcy5faXNCdXN5KCkpe2lmKHRoaXMuX2J1c3koITApLCExLFwiZnVuY3Rpb25cIj09dHlwZW9mIHRoaXMub3B0cy5iZWZvcmVDbG9zZSlpZighdGhpcy5vcHRzLmJlZm9yZUNsb3NlLmNhbGwodGhpcykpcmV0dXJuIHZvaWQgdGhpcy5fYnVzeSghMSk7ZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwidGluZ2xlLWVuYWJsZWRcIiksZG9jdW1lbnQuYm9keS5zdHlsZS50b3A9bnVsbCx3aW5kb3cuc2Nyb2xsVG8oe3RvcDp0aGlzLl9zY3JvbGxQb3NpdGlvbixiZWhhdmlvcjpcImluc3RhbnRcIn0pLHRoaXMubW9kYWwuY2xhc3NMaXN0LnJlbW92ZShcInRpbmdsZS1tb2RhbC0tdmlzaWJsZVwiKTt2YXIgbz10aGlzO28ubW9kYWwuc3R5bGUuZGlzcGxheT1cIm5vbmVcIixcImZ1bmN0aW9uXCI9PXR5cGVvZiBvLm9wdHMub25DbG9zZSYmby5vcHRzLm9uQ2xvc2UuY2FsbCh0aGlzKSxvLl9idXN5KCExKX19LHQucHJvdG90eXBlLnNldENvbnRlbnQ9ZnVuY3Rpb24odCl7cmV0dXJuXCJzdHJpbmdcIj09dHlwZW9mIHQ/dGhpcy5tb2RhbEJveENvbnRlbnQuaW5uZXJIVE1MPXQ6KHRoaXMubW9kYWxCb3hDb250ZW50LmlubmVySFRNTD1cIlwiLHRoaXMubW9kYWxCb3hDb250ZW50LmFwcGVuZENoaWxkKHQpKSx0aGlzLmlzT3BlbigpJiZ0aGlzLmNoZWNrT3ZlcmZsb3coKSx0aGlzfSx0LnByb3RvdHlwZS5nZXRDb250ZW50PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMubW9kYWxCb3hDb250ZW50fSx0LnByb3RvdHlwZS5hZGRGb290ZXI9ZnVuY3Rpb24oKXtyZXR1cm4gZnVuY3Rpb24oKXt0aGlzLm1vZGFsQm94Rm9vdGVyPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiksdGhpcy5tb2RhbEJveEZvb3Rlci5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsLWJveF9fZm9vdGVyXCIpLHRoaXMubW9kYWxCb3guYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveEZvb3Rlcil9LmNhbGwodGhpcyksdGhpc30sdC5wcm90b3R5cGUuc2V0Rm9vdGVyQ29udGVudD1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5tb2RhbEJveEZvb3Rlci5pbm5lckhUTUw9dCx0aGlzfSx0LnByb3RvdHlwZS5nZXRGb290ZXJDb250ZW50PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMubW9kYWxCb3hGb290ZXJ9LHQucHJvdG90eXBlLnNldFN0aWNreUZvb3Rlcj1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5pc092ZXJmbG93KCl8fCh0PSExKSx0P3RoaXMubW9kYWxCb3guY29udGFpbnModGhpcy5tb2RhbEJveEZvb3RlcikmJih0aGlzLm1vZGFsQm94LnJlbW92ZUNoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpLHRoaXMubW9kYWwuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlciksdGhpcy5tb2RhbEJveEZvb3Rlci5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsLWJveF9fZm9vdGVyLS1zdGlja3lcIiksZS5jYWxsKHRoaXMpLHRoaXMubW9kYWxCb3hDb250ZW50LnN0eWxlW1wicGFkZGluZy1ib3R0b21cIl09dGhpcy5tb2RhbEJveEZvb3Rlci5jbGllbnRIZWlnaHQrMjArXCJweFwiKTp0aGlzLm1vZGFsQm94Rm9vdGVyJiYodGhpcy5tb2RhbEJveC5jb250YWlucyh0aGlzLm1vZGFsQm94Rm9vdGVyKXx8KHRoaXMubW9kYWwucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlciksdGhpcy5tb2RhbEJveC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKSx0aGlzLm1vZGFsQm94Rm9vdGVyLnN0eWxlLndpZHRoPVwiYXV0b1wiLHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUubGVmdD1cIlwiLHRoaXMubW9kYWxCb3hDb250ZW50LnN0eWxlW1wicGFkZGluZy1ib3R0b21cIl09XCJcIix0aGlzLm1vZGFsQm94Rm9vdGVyLmNsYXNzTGlzdC5yZW1vdmUoXCJ0aW5nbGUtbW9kYWwtYm94X19mb290ZXItLXN0aWNreVwiKSkpLHRoaXN9LHQucHJvdG90eXBlLmFkZEZvb3RlckJ0bj1mdW5jdGlvbih0LG8sZSl7dmFyIHM9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtyZXR1cm4gcy5pbm5lckhUTUw9dCxzLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLGUpLFwic3RyaW5nXCI9PXR5cGVvZiBvJiZvLmxlbmd0aCYmby5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbih0KXtzLmNsYXNzTGlzdC5hZGQodCl9KSx0aGlzLm1vZGFsQm94Rm9vdGVyLmFwcGVuZENoaWxkKHMpLHN9LHQucHJvdG90eXBlLnJlc2l6ZT1mdW5jdGlvbigpe2NvbnNvbGUud2FybihcIlJlc2l6ZSBpcyBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gdmVyc2lvbiAxLjBcIil9LHQucHJvdG90eXBlLmlzT3ZlcmZsb3c9ZnVuY3Rpb24oKXtyZXR1cm4gd2luZG93LmlubmVySGVpZ2h0PD10aGlzLm1vZGFsQm94LmNsaWVudEhlaWdodH0sdC5wcm90b3R5cGUuY2hlY2tPdmVyZmxvdz1mdW5jdGlvbigpe3RoaXMubW9kYWwuY2xhc3NMaXN0LmNvbnRhaW5zKFwidGluZ2xlLW1vZGFsLS12aXNpYmxlXCIpJiYodGhpcy5pc092ZXJmbG93KCk/dGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKFwidGluZ2xlLW1vZGFsLS1vdmVyZmxvd1wiKTp0aGlzLm1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoXCJ0aW5nbGUtbW9kYWwtLW92ZXJmbG93XCIpLCF0aGlzLmlzT3ZlcmZsb3coKSYmdGhpcy5vcHRzLnN0aWNreUZvb3Rlcj90aGlzLnNldFN0aWNreUZvb3RlcighMSk6dGhpcy5pc092ZXJmbG93KCkmJnRoaXMub3B0cy5zdGlja3lGb290ZXImJihlLmNhbGwodGhpcyksdGhpcy5zZXRTdGlja3lGb290ZXIoITApKSl9LHttb2RhbDp0fX0pOyIsImltcG9ydCBSU2xpZGVyIGZyb20gJ3ZlbmRvci9yc2xpZGVyJ1xuaW1wb3J0IE9wdGlvbnNTZXQgZnJvbSAnT3B0aW9uc1NldCdcbmltcG9ydCAqIGFzIFRvcGljQ2hvb3NlciBmcm9tICdUb3BpY0Nob29zZXInXG5pbXBvcnQge21vZGFsIGFzIFRNb2RhbH0gZnJvbSAndGluZ2xlLmpzJ1xuaW1wb3J0IHsgcmFuZEVsZW0sIGNyZWF0ZUVsZW0sIGhhc0FuY2VzdG9yQ2xhc3MsIGJvb2xPYmplY3RUb0FycmF5IH0gZnJvbSAndXRpbGl0aWVzJ1xuaW1wb3J0IFF1ZXN0aW9uIGZyb20gJ1F1ZXN0aW9uL1F1ZXN0aW9uJ1xuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIGludGVyZmFjZSBXaW5kb3cge1xuICAgIFNIT1dfRElGRklDVUxUWTogYm9vbGVhblxuICB9XG59XG53aW5kb3cuU0hPV19ESUZGSUNVTFRZID0gZmFsc2UgLy8gZm9yIGRlYnVnZ2luZyBxdWVzdGlvbnNcblxuLyogdHMgY29udmVyc2lubyB0b2RvIGxpc3RcbiAqL1xuXG4vKiBUeXBlcyAqL1xuaW50ZXJmYWNlIFF1ZXN0aW9uSW5mbyB7XG4gIGNvbnRhaW5lcj86IEhUTUxFbGVtZW50LFxuICBxdWVzdGlvbj86IFF1ZXN0aW9uLFxuICB0b3BpY0lkPzogc3RyaW5nLFxuXG59XG5cbi8vIE1ha2UgYW4gb3ZlcmxheSB0byBjYXB0dXJlIGFueSBjbGlja3Mgb3V0c2lkZSBib3hlcywgaWYgbmVjZXNzYXJ5XG5jcmVhdGVFbGVtKCdkaXYnLCAnb3ZlcmxheSBoaWRkZW4nLCBkb2N1bWVudC5ib2R5KS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGhpZGVBbGxBY3Rpb25zKVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBRdWVzdGlvblNldCB7XG4gIC8vIFRoZSBtYWluIHF1ZXN0aW9uXG4gIHFOdW1iZXI6IG51bWJlclxuICBhbnN3ZXJlZDogYm9vbGVhblxuICBjb21tYW5kV29yZDogc3RyaW5nXG4gIHVzZUNvbW1hbmRXb3JkOiBib29sZWFuXG5cbiAgLy8gcXVlc3Rpb25zIGFuZCB0aGVpciBvcHRpb25zXG4gIG46IG51bWJlciAgICAgICAgICAgICAgICAgLy8gTnVtYmVyIG9mIHF1ZXN0aW9uc1xuICBxdWVzdGlvbnM6IFF1ZXN0aW9uSW5mb1tdIC8vIGxpc3Qgb2YgcXVlc3Rpb25zIGFuZCB0aGUgRE9NIGVsZW1lbnQgdGhleSdyZSByZW5kZXJlZCBpblxuICB0b3BpY3NPcHRpb25zOiBPcHRpb25zU2V0IC8vIE9wdGlvbnNTZXQgb2JqZWN0IGZvciBjaG9vc2luZyB0b3BpY3NcbiAgdG9waWNzTW9kYWw6IFRNb2RhbCAgICAgICAgLy8gQSBtb2RhbCBkaWFsb2cgZm9yIGRpc3BsYXlpbmcgdG9waWNzT3B0aW9uc1xuICB0b3BpY3M6IHN0cmluZ1tdICAgICAgICAgIC8vIExpc3Qgb2Ygc2VsZWN0ZWQgdG9waWMgSWRzXG4gIG9wdGlvbnNTZXRzOiBSZWNvcmQ8c3RyaW5nLCBPcHRpb25zU2V0PiAvLyBtYXAgZnJvbSB0b3BpYyBpZHMgdG8gdGhlaXIgb3B0aW9ucyBzZXRcblxuICAvLyBVSSBlbGVtZW50c1xuICB0b3BpY0Nob29zZXJCdXR0b246IEhUTUxFbGVtZW50IC8vIFRoZSBidXR0b24gdG8gb3BlbiB0aGUgdG9waWMgY2hvb3NlclxuICBkaWZmaWN1bHR5U2xpZGVyRWxlbWVudDogSFRNTElucHV0RWxlbWVudFxuICBkaWZmaWN1bHR5U2xpZGVyOiBSU2xpZGVyXG4gIGdlbmVyYXRlQnV0dG9uOiBIVE1MQnV0dG9uRWxlbWVudFxuICBhbnN3ZXJCdXR0b246IEhUTUxFbGVtZW50XG5cbiAgLy8gRE9NIGVsZW1lbnRzXG4gIGhlYWRlckJveDogSFRNTEVsZW1lbnRcbiAgb3V0ZXJCb3g6IEhUTUxFbGVtZW50XG4gIGRpc3BsYXlCb3g6IEhUTUxFbGVtZW50XG5cbiAgY29uc3RydWN0b3IgKHFOdW1iZXIpIHtcbiAgICB0aGlzLnF1ZXN0aW9ucyA9IFtdIC8vIGxpc3Qgb2YgcXVlc3Rpb25zIGFuZCB0aGUgRE9NIGVsZW1lbnQgdGhleSdyZSByZW5kZXJlZCBpblxuICAgIHRoaXMudG9waWNzID0gW10gLy8gbGlzdCBvZiB0b3BpY3Mgd2hpY2ggaGF2ZSBiZWVuIHNlbGVjdGVkIGZvciB0aGlzIHNldFxuICAgIHRoaXMub3B0aW9uc1NldHMgPSB7fSAvLyBsaXN0IG9mIE9wdGlvbnNTZXQgb2JqZWN0cyBjYXJyeWluZyBvcHRpb25zIGZvciB0b3BpY3Mgd2l0aCBvcHRpb25zXG4gICAgdGhpcy5xTnVtYmVyID0gcU51bWJlciB8fCAxIC8vIFF1ZXN0aW9uIG51bWJlciAocGFzc2VkIGluIGJ5IGNhbGxlciwgd2hpY2ggd2lsbCBrZWVwIGNvdW50KVxuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZSAvLyBXaGV0aGVyIGFuc3dlcmVkIG9yIG5vdFxuICAgIHRoaXMuY29tbWFuZFdvcmQgPSAnJyAvLyBTb21ldGhpbmcgbGlrZSAnc2ltcGxpZnknXG4gICAgdGhpcy51c2VDb21tYW5kV29yZCA9IHRydWUgLy8gVXNlIHRoZSBjb21tYW5kIHdvcmQgaW4gdGhlIG1haW4gcXVlc3Rpb24sIGZhbHNlIGdpdmUgY29tbWFuZCB3b3JkIHdpdGggZWFjaCBzdWJxdWVzdGlvblxuICAgIHRoaXMubiA9IDggLy8gTnVtYmVyIG9mIHF1ZXN0aW9uc1xuXG4gICAgdGhpcy5fYnVpbGQoKVxuICB9XG5cbiAgX2J1aWxkICgpIHtcbiAgICB0aGlzLm91dGVyQm94ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLW91dGVyYm94JylcbiAgICB0aGlzLmhlYWRlckJveCA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1oZWFkZXJib3gnLCB0aGlzLm91dGVyQm94KVxuICAgIHRoaXMuZGlzcGxheUJveCA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1kaXNwbGF5Ym94JywgdGhpcy5vdXRlckJveClcblxuICAgIHRoaXMuX2J1aWxkT3B0aW9uc0JveCgpXG5cbiAgICB0aGlzLl9idWlsZFRvcGljQ2hvb3NlcigpXG4gIH1cblxuICBfYnVpbGRPcHRpb25zQm94ICgpIHtcbiAgICBjb25zdCB0b3BpY1NwYW4gPSBjcmVhdGVFbGVtKCdzcGFuJywgbnVsbCwgdGhpcy5oZWFkZXJCb3gpXG4gICAgdGhpcy50b3BpY0Nob29zZXJCdXR0b24gPSBjcmVhdGVFbGVtKCdzcGFuJywgJ3RvcGljLWNob29zZXIgYnV0dG9uJywgdG9waWNTcGFuKVxuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uLmlubmVySFRNTCA9ICdDaG9vc2UgdG9waWMnXG4gICAgdGhpcy50b3BpY0Nob29zZXJCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLmNob29zZVRvcGljcygpKVxuXG4gICAgY29uc3QgZGlmZmljdWx0eVNwYW4gPSBjcmVhdGVFbGVtKCdzcGFuJywgbnVsbCwgdGhpcy5oZWFkZXJCb3gpXG4gICAgZGlmZmljdWx0eVNwYW4uYXBwZW5kKCdEaWZmaWN1bHR5OiAnKVxuICAgIGNvbnN0IGRpZmZpY3VsdHlTbGlkZXJPdXRlciA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCAnc2xpZGVyLW91dGVyJywgZGlmZmljdWx0eVNwYW4pXG4gICAgdGhpcy5kaWZmaWN1bHR5U2xpZGVyRWxlbWVudCA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgbnVsbCwgZGlmZmljdWx0eVNsaWRlck91dGVyKSBhcyBIVE1MSW5wdXRFbGVtZW50XG5cbiAgICBjb25zdCBuU3BhbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCBudWxsLCB0aGlzLmhlYWRlckJveClcbiAgICBuU3Bhbi5hcHBlbmQoJ051bWJlciBvZiBxdWVzdGlvbnM6ICcpXG4gICAgY29uc3QgblF1ZXN0aW9uc0lucHV0ID0gY3JlYXRlRWxlbSgnaW5wdXQnLCAnbi1xdWVzdGlvbnMnLCBuU3BhbikgYXMgSFRNTElucHV0RWxlbWVudFxuICAgIG5RdWVzdGlvbnNJbnB1dC50eXBlID0gJ251bWJlcidcbiAgICBuUXVlc3Rpb25zSW5wdXQubWluID0gJzEnXG4gICAgblF1ZXN0aW9uc0lucHV0LnZhbHVlID0gJzgnXG4gICAgblF1ZXN0aW9uc0lucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHtcbiAgICAgIHRoaXMubiA9IHBhcnNlSW50KG5RdWVzdGlvbnNJbnB1dC52YWx1ZSlcbiAgICB9KVxuXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbiA9IGNyZWF0ZUVsZW0oJ2J1dHRvbicsICdnZW5lcmF0ZS1idXR0b24gYnV0dG9uJywgdGhpcy5oZWFkZXJCb3gpIGFzIEhUTUxCdXR0b25FbGVtZW50XG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5kaXNhYmxlZCA9IHRydWVcbiAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmlubmVySFRNTCA9ICdHZW5lcmF0ZSEnXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuZ2VuZXJhdGVBbGwoKSlcbiAgfVxuXG4gIF9pbml0U2xpZGVyICgpIHtcbiAgICB0aGlzLmRpZmZpY3VsdHlTbGlkZXIgPSBuZXcgUlNsaWRlcih7XG4gICAgICB0YXJnZXQ6IHRoaXMuZGlmZmljdWx0eVNsaWRlckVsZW1lbnQsXG4gICAgICB2YWx1ZXM6IHsgbWluOiAxLCBtYXg6IDEwIH0sXG4gICAgICByYW5nZTogdHJ1ZSxcbiAgICAgIHNldDogWzIsIDZdLFxuICAgICAgc3RlcDogMSxcbiAgICAgIHRvb2x0aXA6IGZhbHNlLFxuICAgICAgc2NhbGU6IHRydWUsXG4gICAgICBsYWJlbHM6IHRydWVcbiAgICB9KVxuICB9XG5cbiAgX2J1aWxkVG9waWNDaG9vc2VyICgpIHtcbiAgICAvLyBidWlsZCBhbiBPcHRpb25zU2V0IG9iamVjdCBmb3IgdGhlIHRvcGljc1xuICAgIGNvbnN0IHRvcGljcyA9IFRvcGljQ2hvb3Nlci5nZXRUb3BpY3MoKVxuICAgIGNvbnN0IG9wdGlvbnNTcGVjID0gW11cbiAgICB0b3BpY3MuZm9yRWFjaCh0b3BpYyA9PiB7XG4gICAgICBvcHRpb25zU3BlYy5wdXNoKHtcbiAgICAgICAgdGl0bGU6IHRvcGljLnRpdGxlLFxuICAgICAgICBpZDogdG9waWMuaWQsXG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICAgIHN3YXBMYWJlbDogdHJ1ZVxuICAgICAgfSlcbiAgICB9KVxuICAgIHRoaXMudG9waWNzT3B0aW9ucyA9IG5ldyBPcHRpb25zU2V0KG9wdGlvbnNTcGVjKVxuXG4gICAgLy8gQnVpbGQgYSBtb2RhbCBkaWFsb2cgdG8gcHV0IHRoZW0gaW5cbiAgICB0aGlzLnRvcGljc01vZGFsID0gbmV3IFRNb2RhbCh7XG4gICAgICBmb290ZXI6IHRydWUsXG4gICAgICBzdGlja3lGb290ZXI6IGZhbHNlLFxuICAgICAgY2xvc2VNZXRob2RzOiBbJ292ZXJsYXknLCAnZXNjYXBlJ10sXG4gICAgICBjbG9zZUxhYmVsOiAnQ2xvc2UnLFxuICAgICAgb25DbG9zZTogKCkgPT4ge1xuICAgICAgICB0aGlzLnVwZGF0ZVRvcGljcygpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoaXMudG9waWNzTW9kYWwuYWRkRm9vdGVyQnRuKFxuICAgICAgJ09LJyxcbiAgICAgICdidXR0b24gbW9kYWwtYnV0dG9uJyxcbiAgICAgICgpID0+IHtcbiAgICAgICAgdGhpcy50b3BpY3NNb2RhbC5jbG9zZSgpXG4gICAgICB9KVxuXG4gICAgLy8gcmVuZGVyIG9wdGlvbnMgaW50byBtb2RhbFxuICAgIHRoaXMudG9waWNzT3B0aW9ucy5yZW5kZXJJbih0aGlzLnRvcGljc01vZGFsLmdldENvbnRlbnQoKSlcblxuICAgIC8vIEFkZCBmdXJ0aGVyIG9wdGlvbnMgYnV0dG9uc1xuICAgIC8vIFRoaXMgZmVlbHMgYSBiaXQgaWZmeSAtIGRlcGVuZHMgdG9vIG11Y2ggb24gaW1wbGVtZW50YXRpb24gb2YgT3B0aW9uc1NldFxuICAgIGNvbnN0IGxpcyA9IEFycmF5LmZyb20odGhpcy50b3BpY3NNb2RhbC5nZXRDb250ZW50KCkuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2xpJykpXG4gICAgbGlzLmZvckVhY2gobGkgPT4ge1xuICAgICAgY29uc3QgdG9waWNJZCA9IGxpLmRhdGFzZXQub3B0aW9uSWRcbiAgICAgIGlmIChUb3BpY0Nob29zZXIuaGFzT3B0aW9ucyh0b3BpY0lkKSkge1xuICAgICAgICBjb25zdCBvcHRpb25zQnV0dG9uID0gY3JlYXRlRWxlbSgnZGl2JywgJ2ljb24tYnV0dG9uIGV4dHJhLW9wdGlvbnMtYnV0dG9uJywgbGkpXG4gICAgICAgIHRoaXMuX2J1aWxkVG9waWNPcHRpb25zKGxpLmRhdGFzZXQub3B0aW9uSWQsIG9wdGlvbnNCdXR0b24pXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIF9idWlsZFRvcGljT3B0aW9ucyAodG9waWNJZCwgb3B0aW9uc0J1dHRvbikge1xuICAgIC8vIEJ1aWxkIHRoZSBVSSBhbmQgT3B0aW9uc1NldCBvYmplY3QgbGlua2VkIHRvIHRvcGljSWQuIFBhc3MgaW4gYSBidXR0b24gd2hpY2ggc2hvdWxkIGxhdW5jaCBpdFxuXG4gICAgLy8gTWFrZSB0aGUgT3B0aW9uc1NldCBvYmplY3QgYW5kIHN0b3JlIGEgcmVmZXJlbmNlIHRvIGl0XG4gICAgLy8gT25seSBzdG9yZSBpZiBvYmplY3QgaXMgY3JlYXRlZD9cbiAgICBjb25zdCBvcHRpb25zU2V0ID0gVG9waWNDaG9vc2VyLm5ld09wdGlvbnNTZXQodG9waWNJZClcbiAgICB0aGlzLm9wdGlvbnNTZXRzW3RvcGljSWRdID0gb3B0aW9uc1NldFxuXG4gICAgLy8gTWFrZSBhIG1vZGFsIGRpYWxvZyBmb3IgaXRcbiAgICBjb25zdCBtb2RhbCA9IG5ldyBUTW9kYWwoe1xuICAgICAgZm9vdGVyOiB0cnVlLFxuICAgICAgc3RpY2t5Rm9vdGVyOiBmYWxzZSxcbiAgICAgIGNsb3NlTWV0aG9kczogWydvdmVybGF5JywgJ2VzY2FwZSddLFxuICAgICAgY2xvc2VMYWJlbDogJ0Nsb3NlJ1xuICAgIH0pXG5cbiAgICBtb2RhbC5hZGRGb290ZXJCdG4oXG4gICAgICAnT0snLFxuICAgICAgJ2J1dHRvbiBtb2RhbC1idXR0b24nLFxuICAgICAgKCkgPT4ge1xuICAgICAgICBtb2RhbC5jbG9zZSgpXG4gICAgICB9KVxuXG4gICAgb3B0aW9uc1NldC5yZW5kZXJJbihtb2RhbC5nZXRDb250ZW50KCkpXG5cbiAgICAvLyBsaW5rIHRoZSBtb2RhbCB0byB0aGUgYnV0dG9uXG4gICAgb3B0aW9uc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIG1vZGFsLm9wZW4oKVxuICAgIH0pXG4gIH1cblxuICBjaG9vc2VUb3BpY3MgKCkge1xuICAgIHRoaXMudG9waWNzTW9kYWwub3BlbigpXG4gIH1cblxuICB1cGRhdGVUb3BpY3MgKCkge1xuICAgIC8vIHRvcGljIGNob2ljZXMgYXJlIHN0b3JlZCBpbiB0aGlzLnRvcGljc09wdGlvbnMgYXV0b21hdGljYWxseVxuICAgIC8vIHB1bGwgdGhpcyBpbnRvIHRoaXMudG9waWNzIGFuZCB1cGRhdGUgYnV0dG9uIGRpc3BsYXlzXG5cbiAgICAvLyBoYXZlIG9iamVjdCB3aXRoIGJvb2xlYW4gcHJvcGVydGllcy4gSnVzdCB3YW50IHRoZSB0cnVlIHZhbHVlc1xuICAgIGNvbnN0IHRvcGljcyA9IGJvb2xPYmplY3RUb0FycmF5KHRoaXMudG9waWNzT3B0aW9ucy5vcHRpb25zKVxuICAgIHRoaXMudG9waWNzID0gdG9waWNzXG5cbiAgICBsZXQgdGV4dFxuXG4gICAgaWYgKHRvcGljcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRleHQgPSAnQ2hvb3NlIHRvcGljJyAvLyBub3RoaW5nIHNlbGVjdGVkXG4gICAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmRpc2FibGVkID0gdHJ1ZVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBpZCA9IHRvcGljc1swXSAvLyBmaXJzdCBpdGVtIHNlbGVjdGVkXG4gICAgICB0ZXh0ID0gVG9waWNDaG9vc2VyLmdldFRpdGxlKGlkKVxuICAgICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlXG4gICAgfVxuXG4gICAgaWYgKHRvcGljcy5sZW5ndGggPiAxKSB7IC8vIGFueSBhZGRpdGlvbmFsIHNob3cgYXMgZS5nLiAnICsgMVxuICAgICAgdGV4dCArPSAnICsnICsgKHRvcGljcy5sZW5ndGggLSAxKVxuICAgIH1cblxuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uLmlubmVySFRNTCA9IHRleHRcbiAgfVxuXG4gIHNldENvbW1hbmRXb3JkICgpIHtcbiAgICAvLyBmaXJzdCBzZXQgdG8gZmlyc3QgdG9waWMgY29tbWFuZCB3b3JkXG4gICAgbGV0IGNvbW1hbmRXb3JkID0gVG9waWNDaG9vc2VyLmdldENsYXNzKHRoaXMudG9waWNzWzBdKS5jb21tYW5kV29yZFxuICAgIGxldCB1c2VDb21tYW5kV29yZCA9IHRydWUgLy8gdHJ1ZSBpZiBzaGFyZWQgY29tbWFuZCB3b3JkXG5cbiAgICAvLyBjeWNsZSB0aHJvdWdoIHJlc3Qgb2YgdG9waWNzLCByZXNldCBjb21tYW5kIHdvcmQgaWYgdGhleSBkb24ndCBtYXRjaFxuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgdGhpcy50b3BpY3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChUb3BpY0Nob29zZXIuZ2V0Q2xhc3ModGhpcy50b3BpY3NbaV0pLmNvbW1hbmRXb3JkICE9PSBjb21tYW5kV29yZCkge1xuICAgICAgICBjb21tYW5kV29yZCA9ICcnXG4gICAgICAgIHVzZUNvbW1hbmRXb3JkID0gZmFsc2VcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNvbW1hbmRXb3JkID0gY29tbWFuZFdvcmRcbiAgICB0aGlzLnVzZUNvbW1hbmRXb3JkID0gdXNlQ29tbWFuZFdvcmRcbiAgfVxuXG4gIGdlbmVyYXRlQWxsICgpIHtcbiAgICAvLyBDbGVhciBkaXNwbGF5LWJveCBhbmQgcXVlc3Rpb24gbGlzdFxuICAgIHRoaXMuZGlzcGxheUJveC5pbm5lckhUTUwgPSAnJ1xuICAgIHRoaXMucXVlc3Rpb25zID0gW11cbiAgICB0aGlzLnNldENvbW1hbmRXb3JkKClcblxuICAgIC8vIFNldCBudW1iZXIgYW5kIG1haW4gY29tbWFuZCB3b3JkXG4gICAgY29uc3QgbWFpbnEgPSBjcmVhdGVFbGVtKCdwJywgJ2thdGV4IG1haW5xJywgdGhpcy5kaXNwbGF5Qm94KVxuICAgIG1haW5xLmlubmVySFRNTCA9IGAke3RoaXMucU51bWJlcn0uICR7dGhpcy5jb21tYW5kV29yZH1gIC8vIFRPRE86IGdldCBjb21tYW5kIHdvcmQgZnJvbSBxdWVzdGlvbnNcblxuICAgIC8vIE1ha2Ugc2hvdyBhbnN3ZXJzIGJ1dHRvblxuICAgIHRoaXMuYW5zd2VyQnV0dG9uID0gY3JlYXRlRWxlbSgncCcsICdidXR0b24gc2hvdy1hbnN3ZXJzJywgdGhpcy5kaXNwbGF5Qm94KVxuICAgIHRoaXMuYW5zd2VyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgdGhpcy50b2dnbGVBbnN3ZXJzKClcbiAgICB9KVxuICAgIHRoaXMuYW5zd2VyQnV0dG9uLmlubmVySFRNTCA9ICdTaG93IGFuc3dlcnMnXG5cbiAgICAvLyBHZXQgZGlmZmljdWx0eSBmcm9tIHNsaWRlclxuICAgIGNvbnN0IG1pbmRpZmYgPSB0aGlzLmRpZmZpY3VsdHlTbGlkZXIuZ2V0VmFsdWVMKClcbiAgICBjb25zdCBtYXhkaWZmID0gdGhpcy5kaWZmaWN1bHR5U2xpZGVyLmdldFZhbHVlUigpXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAvLyBNYWtlIHF1ZXN0aW9uIGNvbnRhaW5lciBET00gZWxlbWVudFxuICAgICAgY29uc3QgY29udGFpbmVyID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWNvbnRhaW5lcicsIHRoaXMuZGlzcGxheUJveClcbiAgICAgIGNvbnRhaW5lci5kYXRhc2V0LnF1ZXN0aW9uX2luZGV4ID0gaStcIlwiIC8vIG5vdCBzdXJlIHRoaXMgaXMgYWN0dWFsbHkgbmVlZGVkXG5cbiAgICAgIC8vIEFkZCBjb250YWluZXIgbGluayB0byBvYmplY3QgaW4gcXVlc3Rpb25zIGxpc3RcbiAgICAgIGlmICghdGhpcy5xdWVzdGlvbnNbaV0pIHRoaXMucXVlc3Rpb25zW2ldID0ge31cbiAgICAgIHRoaXMucXVlc3Rpb25zW2ldLmNvbnRhaW5lciA9IGNvbnRhaW5lclxuXG4gICAgICAvLyBjaG9vc2UgYSBkaWZmaWN1bHR5IGFuZCBnZW5lcmF0ZVxuICAgICAgY29uc3QgZGlmZmljdWx0eSA9IG1pbmRpZmYgKyBNYXRoLmZsb29yKGkgKiAobWF4ZGlmZiAtIG1pbmRpZmYgKyAxKSAvIHRoaXMubilcblxuICAgICAgLy8gY2hvb3NlIGEgdG9waWMgaWRcbiAgICAgIHRoaXMuZ2VuZXJhdGUoaSwgZGlmZmljdWx0eSlcbiAgICB9XG4gIH1cblxuICBnZW5lcmF0ZSAoaSwgZGlmZmljdWx0eSwgdG9waWNJZD8pIHtcbiAgICAvLyBUT0RPIGdldCBvcHRpb25zIHByb3Blcmx5XG4gICAgdG9waWNJZCA9IHRvcGljSWQgfHwgcmFuZEVsZW0odGhpcy50b3BpY3MpXG5cbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgbGFiZWw6ICcnLFxuICAgICAgZGlmZmljdWx0eTogZGlmZmljdWx0eSxcbiAgICAgIHVzZUNvbW1hbmRXb3JkOiBmYWxzZVxuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnNTZXRzW3RvcGljSWRdKSB7XG4gICAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHRoaXMub3B0aW9uc1NldHNbdG9waWNJZF0ub3B0aW9ucylcbiAgICB9XG5cbiAgICAvLyBjaG9vc2UgYSBxdWVzdGlvblxuICAgIGNvbnN0IHF1ZXN0aW9uID0gVG9waWNDaG9vc2VyLm5ld1F1ZXN0aW9uKHRvcGljSWQsIG9wdGlvbnMpXG5cbiAgICAvLyBzZXQgc29tZSBtb3JlIGRhdGEgaW4gdGhlIHF1ZXN0aW9uc1tdIGxpc3RcbiAgICBpZiAoIXRoaXMucXVlc3Rpb25zW2ldKSB0aHJvdyBuZXcgRXJyb3IoJ3F1ZXN0aW9uIG5vdCBtYWRlJylcbiAgICB0aGlzLnF1ZXN0aW9uc1tpXS5xdWVzdGlvbiA9IHF1ZXN0aW9uXG4gICAgdGhpcy5xdWVzdGlvbnNbaV0udG9waWNJZCA9IHRvcGljSWRcblxuICAgIC8vIFJlbmRlciBpbnRvIHRoZSBjb250YWluZXJcbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLnF1ZXN0aW9uc1tpXS5jb250YWluZXJcbiAgICBjb250YWluZXIuaW5uZXJIVE1MID0gJycgLy8gY2xlYXIgaW4gY2FzZSBvZiByZWZyZXNoXG5cbiAgICAvLyBtYWtlIGFuZCByZW5kZXIgcXVlc3Rpb24gbnVtYmVyIGFuZCBjb21tYW5kIHdvcmQgKGlmIG5lZWRlZClcbiAgICBsZXQgcU51bWJlclRleHQgPSBxdWVzdGlvbkxldHRlcihpKSArICcpJ1xuICAgIGlmICh3aW5kb3cuU0hPV19ESUZGSUNVTFRZKSB7IHFOdW1iZXJUZXh0ICs9IG9wdGlvbnMuZGlmZmljdWx0eSB9XG4gICAgaWYgKCF0aGlzLnVzZUNvbW1hbmRXb3JkKSB7XG4gICAgICBxTnVtYmVyVGV4dCArPSAnICcgKyBUb3BpY0Nob29zZXIuZ2V0Q29tbWFuZFdvcmQodG9waWNJZClcbiAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdpbmRpdmlkdWFsLWNvbW1hbmQtd29yZCcpXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QucmVtb3ZlKCdpbmRpdmlkdWFsLWNvbW1hbmQtd29yZCcpXG4gICAgfVxuXG4gICAgY29uc3QgcXVlc3Rpb25OdW1iZXJEaXYgPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tbnVtYmVyIGthdGV4JywgY29udGFpbmVyKVxuICAgIHF1ZXN0aW9uTnVtYmVyRGl2LmlubmVySFRNTCA9IHFOdW1iZXJUZXh0XG5cbiAgICAvLyByZW5kZXIgdGhlIHF1ZXN0aW9uXG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHF1ZXN0aW9uLmdldERPTSgpKSAvLyB0aGlzIGlzIGEgLnF1ZXN0aW9uLWRpdiBlbGVtZW50XG4gICAgcXVlc3Rpb24ucmVuZGVyKCkgLy8gc29tZSBxdWVzdGlvbnMgbmVlZCByZW5kZXJpbmcgYWZ0ZXIgYXR0YWNoaW5nIHRvIERPTVxuXG4gICAgLy8gbWFrZSBoaWRkZW4gYWN0aW9ucyBtZW51XG4gICAgY29uc3QgYWN0aW9ucyA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1hY3Rpb25zIGhpZGRlbicsIGNvbnRhaW5lcilcbiAgICBjb25zdCByZWZyZXNoSWNvbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1yZWZyZXNoIGljb24tYnV0dG9uJywgYWN0aW9ucylcbiAgICBjb25zdCBhbnN3ZXJJY29uID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWFuc3dlciBpY29uLWJ1dHRvbicsIGFjdGlvbnMpXG5cbiAgICBhbnN3ZXJJY29uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgcXVlc3Rpb24udG9nZ2xlQW5zd2VyKClcbiAgICAgIGhpZGVBbGxBY3Rpb25zKClcbiAgICB9KVxuXG4gICAgcmVmcmVzaEljb24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLmdlbmVyYXRlKGksIGRpZmZpY3VsdHkpXG4gICAgICBoaWRlQWxsQWN0aW9ucygpXG4gICAgfSlcblxuICAgIC8vIFE6IGlzIHRoaXMgYmVzdCB3YXkgLSBvciBhbiBldmVudCBsaXN0ZW5lciBvbiB0aGUgd2hvbGUgZGlzcGxheUJveD9cbiAgICBjb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBlID0+IHtcbiAgICAgIGlmICghaGFzQW5jZXN0b3JDbGFzcyhlLnRhcmdldCwgJ3F1ZXN0aW9uLWFjdGlvbnMnKSkge1xuICAgICAgICAvLyBvbmx5IGRvIHRoaXMgaWYgaXQgZGlkbid0IG9yaWdpbmF0ZSBpbiBhY3Rpb24gYnV0dG9uXG4gICAgICAgIHRoaXMuc2hvd1F1ZXN0aW9uQWN0aW9ucyhlLCBpKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICB0b2dnbGVBbnN3ZXJzICgpIHtcbiAgICBpZiAodGhpcy5hbnN3ZXJlZCkge1xuICAgICAgdGhpcy5xdWVzdGlvbnMuZm9yRWFjaChxID0+IHtcbiAgICAgICAgcS5xdWVzdGlvbi5oaWRlQW5zd2VyKClcbiAgICAgICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gICAgICAgIHRoaXMuYW5zd2VyQnV0dG9uLmlubmVySFRNTCA9ICdTaG93IGFuc3dlcnMnXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnF1ZXN0aW9ucy5mb3JFYWNoKHEgPT4ge1xuICAgICAgICBxLnF1ZXN0aW9uLnNob3dBbnN3ZXIoKVxuICAgICAgICB0aGlzLmFuc3dlcmVkID0gdHJ1ZVxuICAgICAgICB0aGlzLmFuc3dlckJ1dHRvbi5pbm5lckhUTUwgPSAnSGlkZSBhbnN3ZXJzJ1xuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2NhbnMgZm9yIHdpZGVzdCBxdWVzdGlvbiBhbmQgdGhlbiBzZXRzIHRoZSBncmlkIHdpZHRoIHRvIHRoYXRcbiAgICovXG4gIGFkanVzdEdyaWRXaWR0aCAoKSB7XG5cbiAgfVxuXG4gIHNob3dRdWVzdGlvbkFjdGlvbnMgKGV2ZW50LCBxdWVzdGlvbkluZGV4KSB7XG4gICAgLy8gZmlyc3QgaGlkZSBhbnkgb3RoZXIgYWN0aW9uc1xuICAgIGhpZGVBbGxBY3Rpb25zKClcblxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMucXVlc3Rpb25zW3F1ZXN0aW9uSW5kZXhdLmNvbnRhaW5lclxuICAgIGNvbnN0IGFjdGlvbnMgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcignLnF1ZXN0aW9uLWFjdGlvbnMnKSBhcyBIVE1MRWxlbWVudFxuXG4gICAgLy8gVW5oaWRlIHRoZSBvdmVybGF5XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm92ZXJsYXknKS5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgIGFjdGlvbnMuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJylcbiAgICBhY3Rpb25zLnN0eWxlLmxlZnQgPSAoY29udGFpbmVyLm9mZnNldFdpZHRoIC8gMiAtIGFjdGlvbnMub2Zmc2V0V2lkdGggLyAyKSArICdweCdcbiAgICBhY3Rpb25zLnN0eWxlLnRvcCA9IChjb250YWluZXIub2Zmc2V0SGVpZ2h0IC8gMiAtIGFjdGlvbnMub2Zmc2V0SGVpZ2h0IC8gMikgKyAncHgnXG4gIH1cblxuICBhcHBlbmRUbyAoZWxlbSkge1xuICAgIGVsZW0uYXBwZW5kQ2hpbGQodGhpcy5vdXRlckJveClcbiAgICB0aGlzLl9pbml0U2xpZGVyKCkgLy8gaGFzIHRvIGJlIGluIGRvY3VtZW50J3MgRE9NIHRvIHdvcmsgcHJvcGVybHlcbiAgfVxuXG4gIGFwcGVuZEJlZm9yZSAocGFyZW50LCBlbGVtKSB7XG4gICAgcGFyZW50Lmluc2VydEJlZm9yZSh0aGlzLm91dGVyQm94LCBlbGVtKVxuICAgIHRoaXMuX2luaXRTbGlkZXIoKSAvLyBoYXMgdG8gYmUgaW4gZG9jdW1lbnQncyBET00gdG8gd29yayBwcm9wZXJseVxuICB9XG59XG5cbmZ1bmN0aW9uIHF1ZXN0aW9uTGV0dGVyIChpKSB7XG4gIC8vIHJldHVybiBhIHF1ZXN0aW9uIG51bWJlci4gZS5nLiBxTnVtYmVyKDApPVwiYVwiLlxuICAvLyBBZnRlciBsZXR0ZXJzLCB3ZSBnZXQgb24gdG8gZ3JlZWtcbiAgdmFyIGxldHRlciA9XG4gICAgICAgIGkgPCAyNiA/IFN0cmluZy5mcm9tQ2hhckNvZGUoMHg2MSArIGkpXG4gICAgICAgICAgOiBpIDwgNTIgPyBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4NDEgKyBpIC0gMjYpXG4gICAgICAgICAgICA6IFN0cmluZy5mcm9tQ2hhckNvZGUoMHgzQjEgKyBpIC0gNTIpXG4gIHJldHVybiBsZXR0ZXJcbn1cblxuZnVuY3Rpb24gaGlkZUFsbEFjdGlvbnMgKCkge1xuICAvLyBoaWRlIGFsbCBxdWVzdGlvbiBhY3Rpb25zXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5xdWVzdGlvbi1hY3Rpb25zJykuZm9yRWFjaChlbCA9PiB7XG4gICAgZWwuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcbiAgfSlcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm92ZXJsYXknKS5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxufVxuIiwiaW1wb3J0IFF1ZXN0aW9uU2V0IGZyb20gJ1F1ZXN0aW9uU2V0J1xuXG4vLyBUT0RPOlxuLy8gIC0gSW1wb3J0IGV4aXN0aW5nIHF1ZXN0aW9uIHR5cGVzIChHIC0gZ3JhcGhpYywgVCAtIHRleHRcbi8vICAgIC0gRyBhcmVhXG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG4gIGNvbnN0IHFzID0gbmV3IFF1ZXN0aW9uU2V0KClcbiAgcXMuYXBwZW5kVG8oZG9jdW1lbnQuYm9keSlcbiAgcXMuY2hvb3NlVG9waWNzKClcbn0pXG4iXSwibmFtZXMiOlsiY29tbW9uanNIZWxwZXJzLmNyZWF0ZUNvbW1vbmpzTW9kdWxlIiwiY29tbW9uanNIZWxwZXJzLmdldERlZmF1bHRFeHBvcnRGcm9tQ2pzIiwidGhpcyIsIlJTbGlkZXIiLCJUb3BpY0Nob29zZXIuZ2V0VG9waWNzIiwiVE1vZGFsIiwiVG9waWNDaG9vc2VyLmhhc09wdGlvbnMiLCJUb3BpY0Nob29zZXIubmV3T3B0aW9uc1NldCIsIlRvcGljQ2hvb3Nlci5nZXRUaXRsZSIsIlRvcGljQ2hvb3Nlci5nZXRDbGFzcyIsIlRvcGljQ2hvb3Nlci5uZXdRdWVzdGlvbiIsIlRvcGljQ2hvb3Nlci5nZXRDb21tYW5kV29yZCJdLCJtYXBwaW5ncyI6Ijs7O0VBQUE7RUFDQTtFQUNBO0FBQ0E7RUFDQSxJQUFJLEVBQUUsR0FBRyxVQUFVLElBQUksRUFBRTtFQUN6QixFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSTtFQUNuQixFQUFFLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSTtFQUMxQixFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSTtFQUNwQixFQUFFLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBQztFQUN0QixFQUFFLElBQUksQ0FBQyxVQUFVLEdBQUcs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O0FBQ0Q7RUFDQSxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxVQUFVLEtBQUssRUFBRSxHQUFHLEVBQUU7RUFDL0MsRUFBRSxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLEdBQUcsTUFBSztBQUN2RDtFQUNBLEVBQUUsSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFDLEVBQUU7QUFDckg7RUFDQSxFQUFFLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUMsRUFBRTtBQUNwRztFQUNBLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBRyxFQUFFO0FBQ3JHO0VBQ0EsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFJO0FBQ3RHO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO0VBQ3ZCLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtFQUMzQixNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFDO0VBQy9ELE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDN0QsS0FBSztFQUNMLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDcEcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSTtFQUM3RixHQUFHLE1BQU07RUFDVCxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQyxFQUFFO0VBQ3RGLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDeEQsR0FBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUM7RUFDbEcsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxFQUFDO0FBQ2xEO0VBQ0EsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUk7RUFDdEYsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFJO0FBQ2pFO0VBQ0EsRUFBRSxPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDeEIsRUFBQztBQUNEO0VBQ0EsRUFBRSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDLEVBQUU7RUFDekMsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU07QUFDaEM7RUFDQSxFQUFFLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLElBQUksRUFBQztBQUNqRTtFQUNBLEVBQUUsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUM7RUFDMUUsRUFBRSxJ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Q0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQzdDLE1BQU0sV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUM3QixNQUFNO0VBQ04sTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsS0FBSztBQUNMO0VBQ0E7RUFDQSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQzFCLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBQztFQUNaLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBQztFQUNaLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBQztFQUNaLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBQztFQUNaLEtBQUs7QUFDTDtFQUNBLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFDO0VBQzNDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcs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QUFTO0FBQ1Q7RUFDQSxRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ25CLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRTtFQUN2QyxVQUFVLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3hCLFNBQVM7QUFDVDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7QUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxRQUFRLE9BQU8sSUFBSSxRQUFRO0VBQzNCLFVBQVUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDbEQsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0VBQ3RCLFNBQVM7RUFDVCxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxHQUFHLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzNCLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7QUFDbkI7RUFDQTtBQUNBO0VBQ0EsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQzlFLE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDM0IsUUFBUSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztBQUNuQjtFQUNBO0FBQ0E7RUFDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDdkMsVUFBVSxPQUFPLElBQUksUUFBUSxFQUFFO0VBQy9CLFNBQVM7RUFDVCxRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDOUUsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sSUFBSSxFQUFFLFVBQVUsTUFBTSxFQUFFO0VBQzlCLFFBQVEsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxDQUFDLEVBQUM7QUFDMUM7RUFDQSxRQUFRLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzVDLFVBQVUsT0FBTyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUM7RUFDbEMsU0FBUztFQUNULFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztFQUNqRixPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxLQUFLLEVBQUUsVUFBVSxNQUFNLEVBQUU7RUFDL0IsUUFBUSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxJQUFJLENBQUMsRUFBQztBQUMxQztFQUNBLFFBQVEs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QUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBQztFQUM1RCxRQUFRLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDaEMsT0FBTztBQUNQO0VBQ0EsTUFBTSxRQUFRLEVBQUUsVUFBVSxHQUFHLEVBQUU7RUFDL0I7QUFDQTtFQUNBLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDNUMsVUFBVSxPQUFPLElBQUk7RUFDckIsU0FBUztBQUNUO0VBQ0EsUUFBUSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsV0FBVyxHQUFFO0FBQzNDO0VBQ0EsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLE1BQUs7QUFDMUI7RUFDQSxRQUFRLFNBQVMsR0FBRyxFQUFFLENBQUMsRUFBRTtFQUN6QixVQUFVLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsRUFBRSxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzNELFVBQVUsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDcEQsU0FBUztBQUNUO0VBQ0EsUUFBUSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUM5QyxVQUFVLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDN0MsVUFBVSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFD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QyxDQUFDLFFBQVEsR0FBRTtFQUN2RCxVQUFVLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUU7RUFDdEQsVUFBVSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHO0VBQzdCLFlBQVksR0FBRyxFQUFFLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQztFQUNyQyxZQUFZLE1BQU0sRUFBRSxLQUFLO0VBQ3pCLFlBQVc7RUFDWCxTQUFTO0VBQ1QsUUFBUSxLQUFLO0VBQ2IsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsQ0FBQztFQUNiLE1BQU0sS0FBSyxDQUFDLEVBQUU7RUFDZCxRQUFRLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBQztFQUNsRSxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3pDLFVBQVUsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDckQsVUFBVSxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQ3hELFVBQVUsSUFBSSxJQUFJLEdBQUcsTUFBSztFQUMxQixVQUFVLElBQUksSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLElBQUksU0FBUTtFQUN6RCxVQUFVLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxJQUFJLEdBQUcsR0FBRyxTQUFRO0VBQ2pELFVBQVUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRztFQUM3QixZQUFZLEdBQUcsRUFBRSxJQUFJLFVBQVUs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QUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBOztVQUV0RyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBOztVQUdyQyxVQUFVLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQTtVQUM1RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7O2NBRS9DLE1BQU0sS0FBSyxHQUFvQixFQUFFLENBQUE7Y0FDakMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7Y0FDdEMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLFNBQVMsQ0FBQTs7Y0FHcEUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTs7Ozs7Ozs7Ozs7Ozs7OztjQW1CaEMsTUFBTSxRQUFRLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUE7Y0FFaEMsS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxRQUFRLEVBQUUsVUFBVSxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtjQUN2RyxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtjQUNuQixLQUFLLENBQUMsTUFBTSxHQUFHLFFBQVEs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R0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxXQUFXLElBQUksR0FBRTtFQUN0RCxFQUFFLE9BQU8sSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDO0VBQ3BDLENBQUM7QUFDRDtFQUNBLFNBQVMsVUFBVSxFQUFFLEVBQUUsRUFBRTtFQUN6QixFQUFFLE9BQU8sQ0FBQyxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXLElBQUksUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0VBQzVFOzs7RUNyR0EsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBMEUsY0FBYyxDQUFDLENBQUMsR0FBZSxDQUFDLENBQUNDLGNBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksRUFBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLHVVQUF1VSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsR0FBRyxVQUFVLEdBQUcsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFNLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFJLFVBQVUsRUFBRSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU0sUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGtDQUFrQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHlEQUF5RCxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsT0FBTyxNQUFNLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7OztFQ1k1eE8sTUFBTSxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUE7RUFhOUI7RUFDQSxVQUFVLENBQUMsS0FBSyxFQUFFLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFFdkUsV0FBVztNQTJCOUIsWUFBYSxPQUFPO1VBQ2xCLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFBO1VBQ25CLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFBO1VBQ2hCLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFBO1VBQ3JCLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxJQUFJLENBQUMsQ0FBQTtVQUMzQixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQTtVQUNyQixJQUFJLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQTtVQUNyQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQTtVQUMxQixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtVQUVWLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtPQUNkO01BRUQsTUFBTTtVQUNKLElBQUksQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1VBQ3RELElBQUksQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxvQkFBb0IsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7VUFDdkUsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLHFCQUFxQixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtVQUV6RSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtVQUV2QixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtPQUMxQjtNQUVELGdCQUFnQjtVQUNkLE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtVQUMxRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxzQkFBc0IsRUFBRSxTQUFTLENBQUMsQ0FBQTtVQUMvRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxHQUFHLGNBQWMsQ0FBQTtVQUNsRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE1BQU0sSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUE7VUFFNUUsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1VBQy9ELGNBQWMsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUE7VUFDckMsTUFBTSxxQkFBcUIsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQTtVQUNoRixJQUFJLENBQUMsdUJBQXVCLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUscUJBQXFCLENBQXFCLENBQUE7VUFFbkcsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1VBQ3RELEtBQUssQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtVQUNyQyxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxLQUFLLENBQXFCLENBQUE7VUFDckYsZUFBZSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUE7VUFDL0IsZUFBZSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUE7VUFDekIsZUFBZSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUE7VUFDM0IsZUFBZSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRTtjQUN6QyxJQUFJLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUE7V0FDekMsQ0FBQyxDQUFBO1VBRUYsSUFBSSxDQUFDLGNBQWMsR0FBRyxVQUFVLENBQUMsUUFBUSxFQUFFLHdCQUF3QixFQUFFLElBQUksQ0FBQyxTQUFTLENBQXNCLENBQUE7VUFDekcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFBO1VBQ25DLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxHQUFHLFdBQVcsQ0FBQTtVQUMzQyxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxNQUFNLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFBO09BQ3hFO01BRUQsV0FBVztVQUNULElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJQyxFQUFPLENBQUM7Y0FDbEMsTUFBTSxFQUFFLElBQUksQ0FBQyx1QkFBdUI7Y0FDcEMsTUFBTSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFO2NBQzNCLEtBQUssRUFBRSxJQUFJO2NBQ1gsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztjQUNYLElBQUksRUFBRSxDQUFDO2NBQ1AsT0FBTyxFQUFFLEtBQUs7Y0FDZCxLQUFLLEVBQUUsSUFBSTtjQUNYLE1BQU0sRUFBRSxJQUFJO1dBQ2IsQ0FBQyxDQUFBO09BQ0g7TUFFRCxrQkFBa0I7O1VBRWhCLE1BQU0sTUFBTSxHQUFHQyxTQUFzQixFQUFFLENBQUE7VUFDdkMsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFBO1VBQ3RCLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSztjQUNsQixXQUFXLENBQUMsSUFBSSxDQUFDO2tCQUNmLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztrQkFDbEIsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFO2tCQUNaLElBQUksRUFBRSxNQUFNO2tCQUNaLE9BQU8sRUFBRSxLQUFLO2tCQUNkLFNBQVMsRUFBRSxJQUFJO2VBQ2hCLENBQUMsQ0FBQTtXQUNILENBQUMsQ0FBQTtVQUNGLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUE7O1VBR2hELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSUMsZ0JBQU0sQ0FBQztjQUM1QixNQUFNLEVBQUUsSUFBSTtjQUNaLFlBQVksRUFBRSxLQUFLO2NBQ25CLFlBQVksRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUM7Y0FDbkMsVUFBVSxFQUFFLE9BQU87Y0FDbkIsT0FBTyxFQUFFO2tCQUNQLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtlQUNwQjtXQUNGLENBQUMsQ0FBQTtVQUVGLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUMzQixJQUFJLEVBQ0oscUJBQXFCLEVBQ3JCO2NBQ0UsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtXQUN6QixDQUFDLENBQUE7O1VBR0osSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBOzs7VUFJMUQsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7VUFDaEYsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFO2NBQ1osTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUE7Y0FDbkMsSUFBSUMsVUFBdUIsQ0FBQyxPQUFPLENBQUMsRUFBRTtrQkFDcEMsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxrQ0FBa0MsRUFBRSxFQUFFLENBQUMsQ0FBQTtrQkFDL0UsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFBO2VBQzVEO1dBQ0YsQ0FBQyxDQUFBO09BQ0g7TUFFRCxrQkFBa0IsQ0FBRSxPQUFPLEVBQUUsYUFBYTs7OztVQUt4QyxNQUFNLFVBQVUsR0FBR0MsYUFBMEIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtVQUN0RCxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLFVBQVUsQ0FBQTs7VUFHdEMsTUFBTSxLQUFLLEdBQUcsSUFBSUYsZ0JBQU0sQ0FBQztjQUN2QixNQUFNLEVBQUUsSUFBSTtjQUNaLFlBQVksRUFBRSxLQUFLO2NBQ25CLFlBQVksRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUM7Y0FDbkMsVUFBVSxFQUFFLE9BQU87V0FDcEIsQ0FBQyxDQUFBO1VBRUYsS0FBSyxDQUFDLFlBQVksQ0FDaEIsSUFBSSxFQUNKLHFCQUFxQixFQUNyQjtjQUNFLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQTtXQUNkLENBQUMsQ0FBQTtVQUVKLFVBQVUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUE7O1VBR3ZDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUU7Y0FDdEMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFBO1dBQ2IsQ0FBQyxDQUFBO09BQ0g7TUFFRCxZQUFZO1VBQ1YsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtPQUN4QjtNQUVELFlBQVk7Ozs7VUFLVixNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1VBQzVELElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO1VBRXBCLElBQUksSUFBSSxDQUFBO1VBRVIsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtjQUN2QixJQUFJLEdBQUcsY0FBYyxDQUFBO2NBQ3JCLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQTtXQUNwQztlQUFNO2NBQ0wsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO2NBQ3BCLElBQUksR0FBR0csUUFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQTtjQUNoQyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUE7V0FDckM7VUFFRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2NBQ3JCLElBQUksSUFBSSxJQUFJLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtXQUNuQztVQUVELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFBO09BQ3pDO01BRUQsY0FBYzs7VUFFWixJQUFJLFdBQVcsR0FBR0MsUUFBcUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFBO1VBQ25FLElBQUksY0FBYyxHQUFHLElBQUksQ0FBQTs7VUFHekIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO2NBQzNDLElBQUlBLFFBQXFCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsS0FBSyxXQUFXLEVBQUU7a0JBQ3JFLFdBQVcsR0FBRyxFQUFFLENBQUE7a0JBQ2hCLGNBQWMsR0FBRyxLQUFLLENBQUE7a0JBQ3RCLE1BQUs7ZUFDTjtXQUNGO1VBRUQsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUE7VUFDOUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUE7T0FDckM7TUFFRCxXQUFXOztVQUVULElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQTtVQUM5QixJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQTtVQUNuQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7O1VBR3JCLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtVQUM3RCxLQUFLLENBQUMsU0FBUyxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7O1VBR3hELElBQUksQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRSxxQkFBcUIsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7VUFDM0UsSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUU7Y0FDMUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO1dBQ3JCLENBQUMsQ0FBQTtVQUNGLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxHQUFHLGNBQWMsQ0FBQTs7VUFHNUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxDQUFBO1VBQ2pELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtVQUVqRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTs7Y0FFL0IsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxvQkFBb0IsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7Y0FDMUUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEdBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQTs7Y0FHdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2tCQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFBO2NBQzlDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTs7Y0FHdkMsTUFBTSxVQUFVLEdBQUcsT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLE9BQU8sR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBOztjQUc3RSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtXQUM3QjtPQUNGO01BRUQsUUFBUSxDQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsT0FBUTs7VUFFL0IsT0FBTyxHQUFHLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1VBRTFDLE1BQU0sT0FBTyxHQUFHO2NBQ2QsS0FBSyxFQUFFLEVBQUU7Y0FDVCxVQUFVLEVBQUUsVUFBVTtjQUN0QixjQUFjLEVBQUUsS0FBSztXQUN0QixDQUFBO1VBRUQsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFO2NBQzdCLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7V0FDMUQ7O1VBR0QsTUFBTSxRQUFRLEdBQUdDLFdBQXdCLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBOztVQUczRCxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7Y0FBRSxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUE7VUFDNUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFBO1VBQ3JDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTs7VUFHbkMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7VUFDN0MsU0FBUyxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUE7O1VBR3hCLElBQUksV0FBVyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUE7VUFDekMsSUFBSSxNQUFNLENBQUMsZUFBZSxFQUFFO2NBQUUsV0FBVyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUE7V0FBRTtVQUNqRSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRTtjQUN4QixXQUFXLElBQUksR0FBRyxHQUFHQyxjQUEyQixDQUFDLE9BQU8sQ0FBQyxDQUFBO2NBQ3pELFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUE7V0FDbkQ7ZUFBTTtjQUNMLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLHlCQUF5QixDQUFDLENBQUE7V0FDdEQ7VUFFRCxNQUFNLGlCQUFpQixHQUFHLFVBQVUsQ0FBQyxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsU0FBUyxDQUFDLENBQUE7VUFDL0UsaUJBQWlCLENBQUMsU0FBUyxHQUFHLFdBQVcsQ0FBQTs7VUFHekMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtVQUN4QyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUE7O1VBR2pCLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxLQUFLLEVBQUUseUJBQXlCLEVBQUUsU0FBUyxDQUFDLENBQUE7VUFDdkUsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSw4QkFBOEIsRUFBRSxPQUFPLENBQUMsQ0FBQTtVQUM5RSxNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLDZCQUE2QixFQUFFLE9BQU8sQ0FBQyxDQUFBO1VBRTVFLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUU7Y0FDbkMsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFBO2NBQ3ZCLGNBQWMsRUFBRSxDQUFBO1dBQ2pCLENBQUMsQ0FBQTtVQUVGLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUU7Y0FDcEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7Y0FDNUIsY0FBYyxFQUFFLENBQUE7V0FDakIsQ0FBQyxDQUFBOztVQUdGLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztjQUNuQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxFQUFFOztrQkFFbkQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtlQUMvQjtXQUNGLENBQUMsQ0FBQTtPQUNIO01BRUQsYUFBYTtVQUNYLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtjQUNqQixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2tCQUN0QixDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFBO2tCQUN2QixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQTtrQkFDckIsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEdBQUcsY0FBYyxDQUFBO2VBQzdDLENBQUMsQ0FBQTtXQUNIO2VBQU07Y0FDTCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2tCQUN0QixDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFBO2tCQUN2QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQTtrQkFDcEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEdBQUcsY0FBYyxDQUFBO2VBQzdDLENBQUMsQ0FBQTtXQUNIO09BQ0Y7Ozs7TUFLRCxlQUFlO09BRWQ7TUFFRCxtQkFBbUIsQ0FBRSxLQUFLLEVBQUUsYUFBYTs7VUFFdkMsY0FBYyxFQUFFLENBQUE7VUFFaEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxTQUFTLENBQUE7VUFDekQsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBZ0IsQ0FBQTs7VUFHM0UsUUFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1VBQzdELE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1VBQ2xDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLFdBQVcsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFBO1VBQ2pGLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLFlBQVksR0FBRyxDQUFDLElBQUksSUFBSSxDQUFBO09BQ25GO01BRUQsUUFBUSxDQUFFLElBQUk7VUFDWixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtVQUMvQixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7T0FDbkI7TUFFRCxZQUFZLENBQUUsTUFBTSxFQUFFLElBQUk7VUFDeEIsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1VBQ3hDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtPQUNuQjtHQUNGO0VBRUQsU0FBUyxjQUFjLENBQUUsQ0FBQzs7O01BR3hCLElBQUksTUFBTSxHQUNKLENBQUMsR0FBRyxFQUFFLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO1lBQ2xDLENBQUMsR0FBRyxFQUFFLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDekMsTUFBTSxDQUFDLFlBQVksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFBO01BQy9DLE9BQU8sTUFBTSxDQUFBO0VBQ2YsQ0FBQztFQUVELFNBQVMsY0FBYzs7TUFFckIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUU7VUFDdkQsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7T0FDM0IsQ0FBQyxDQUFBO01BQ0YsUUFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0VBQzVEOztFQzVaQTtFQUNBO0VBQ0E7QUFDQTtFQUNBLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsRUFBRSxNQUFNO0VBQ3BELEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxXQUFXLEdBQUU7RUFDOUIsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUM7RUFDNUIsRUFBRSxFQUFFLENBQUMsWUFBWSxHQUFFO0VBQ25CLENBQUM7Ozs7OzsifQ==
