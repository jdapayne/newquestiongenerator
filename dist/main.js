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
              if (isRealOption(option)) {
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
              case 'range': {
                  const inputLB = option.element.getElementsByTagName('input')[0];
                  const inputUB = option.element.getElementsByTagName('input')[1];
                  this.options[option.idLB] = inputLB.value;
                  this.options[option.idUB] = inputUB.value;
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
       * Given an option, enable or disable the UI element depending on the value of option.disableIf and the
       * state of the corresponding boolean option
       * @param {*} option An element of this.optionsSpec or an option id
       */
      disableOrEnable(option) {
          if (typeof (option) === 'string') {
              option = this.optionsSpec.find(x => (isRealOption(x) && x.id === option));
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
                  this.options[option.id] = new OptionsSet(option.optionsSpec);
                  this.options[option.id].renderIn(column, "suboptions");
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
          this.updateStateFromUIAll();
          this.disableOrEnableAll();
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
                  type: 'range',
                  id: 'n-angles',
                  idLB: 'minN',
                  idUB: 'maxN',
                  defaultLB: 2,
                  defaultUB: 4,
                  min: 2,
                  max: 8,
                  title: 'Number of angles'
              },
              {
                  type: 'bool',
                  title: 'Simple',
                  id: 'simple',
                  default: true,
                  disabledIf: '!custom'
              },
              {
                  type: 'bool',
                  title: 'Repeated/Isosceles',
                  id: 'repeated',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vbW9kdWxlcy92ZW5kb3IvcnNsaWRlci5qcyIsIi4uL21vZHVsZXMvVXRpbGl0aWVzLmpzIiwiLi4vLi4vbW9kdWxlcy9PcHRpb25zU2V0LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9RdWVzdGlvbi50cyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGV4dFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FsZ2VicmFpY0ZyYWN0aW9uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvSW50ZWdlckFkZC5qcyIsIi4uL21vZHVsZXMvUG9pbnQuanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRLnRzIiwiLi4vbW9kdWxlcy92ZW5kb3IvZnJhY3Rpb24uanMiLCIuLi9tb2R1bGVzL01vbm9taWFsLmpzIiwiLi4vbW9kdWxlcy9Qb2x5bm9taWFsLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9Bcml0aG1hZ29uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGVzdFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FkZEFaZXJvLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9UZXh0US9FcXVhdGlvbk9mTGluZS5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEudHMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUS5qcyIsIi4uL21vZHVsZXMvTGluRXhwci5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9zb2x2ZUFuZ2xlcy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dvcmRlZFEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dyYXBwZXIudHMiLCIuLi9tb2R1bGVzL1RvcGljQ2hvb3Nlci5qcyIsIi4uL21vZHVsZXMvdmVuZG9yL1RpbmdsZS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb25TZXQuanMiLCIuLi9tYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIFJzbGlkZXIuIERvd25sb2FkZWQgZnJvbSBodHRwczovL3NsYXdvbWlyLXphemlhYmxvLmdpdGh1Yi5pby9yYW5nZS1zbGlkZXIvXG4gKiBNb2RpZmllZCB0byBtYWtlIGludG8gRVM2IG1vZHVsZSBhbmQgZml4IGEgZmV3IGJ1Z3NcbiAqL1xuXG52YXIgUlMgPSBmdW5jdGlvbiAoY29uZikge1xuICB0aGlzLmlucHV0ID0gbnVsbFxuICB0aGlzLmlucHV0RGlzcGxheSA9IG51bGxcbiAgdGhpcy5zbGlkZXIgPSBudWxsXG4gIHRoaXMuc2xpZGVyV2lkdGggPSAwXG4gIHRoaXMuc2xpZGVyTGVmdCA9IDBcbiAgdGhpcy5wb2ludGVyV2lkdGggPSAwXG4gIHRoaXMucG9pbnRlclIgPSBudWxsXG4gIHRoaXMucG9pbnRlckwgPSBudWxsXG4gIHRoaXMuYWN0aXZlUG9pbnRlciA9IG51bGxcbiAgdGhpcy5zZWxlY3RlZCA9IG51bGxcbiAgdGhpcy5zY2FsZSA9IG51bGxcbiAgdGhpcy5zdGVwID0gMFxuICB0aGlzLnRpcEwgPSBudWxsXG4gIHRoaXMudGlwUiA9IG51bGxcbiAgdGhpcy50aW1lb3V0ID0gbnVsbFxuICB0aGlzLnZhbFJhbmdlID0gZmFsc2VcblxuICB0aGlzLnZhbHVlcyA9IHtcbiAgICBzdGFydDogbnVsbCxcbiAgICBlbmQ6IG51bGxcbiAgfVxuICB0aGlzLmNvbmYgPSB7XG4gICAgdGFyZ2V0OiBudWxsLFxuICAgIHZhbHVlczogbnVsbCxcbiAgICBzZXQ6IG51bGwsXG4gICAgcmFuZ2U6IGZhbHNlLFxuICAgIHdpZHRoOiBudWxsLFxuICAgIHNjYWxlOiB0cnVlLFxuICAgIGxhYmVsczogdHJ1ZSxcbiAgICB0b29sdGlwOiB0cnVlLFxuICAgIHN0ZXA6IG51bGwsXG4gICAgZGlzYWJsZWQ6IGZhbHNlLFxuICAgIG9uQ2hhbmdlOiBudWxsXG4gIH1cblxuICB0aGlzLmNscyA9IHtcbiAgICBjb250YWluZXI6ICdycy1jb250YWluZXInLFxuICAgIGJhY2tncm91bmQ6ICdycy1iZycsXG4gICAgc2VsZWN0ZWQ6ICdycy1zZWxlY3RlZCcsXG4gICAgcG9pbnRlcjogJ3JzLXBvaW50ZXInLFxuICAgIHNjYWxlOiAncnMtc2NhbGUnLFxuICAgIG5vc2NhbGU6ICdycy1ub3NjYWxlJyxcbiAgICB0aXA6ICdycy10b29sdGlwJ1xuICB9XG5cbiAgZm9yICh2YXIgaSBpbiB0aGlzLmNvbmYpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb25mLCBpKSkgdGhpcy5jb25mW2ldID0gY29uZltpXSB9XG5cbiAgdGhpcy5pbml0KClcbn1cblxuUlMucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgdGhpcy5jb25mLnRhcmdldCA9PT0gJ29iamVjdCcpIHRoaXMuaW5wdXQgPSB0aGlzLmNvbmYudGFyZ2V0XG4gIGVsc2UgdGhpcy5pbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMuY29uZi50YXJnZXQucmVwbGFjZSgnIycsICcnKSlcblxuICBpZiAoIXRoaXMuaW5wdXQpIHJldHVybiBjb25zb2xlLmxvZygnQ2Fubm90IGZpbmQgdGFyZ2V0IGVsZW1lbnQuLi4nKVxuXG4gIHRoaXMuaW5wdXREaXNwbGF5ID0gZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLmlucHV0LCBudWxsKS5kaXNwbGF5XG4gIHRoaXMuaW5wdXQuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuICB0aGlzLnZhbFJhbmdlID0gISh0aGlzLmNvbmYudmFsdWVzIGluc3RhbmNlb2YgQXJyYXkpXG5cbiAgaWYgKHRoaXMudmFsUmFuZ2UpIHtcbiAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLmNvbmYudmFsdWVzLCAnbWluJykgfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLmNvbmYudmFsdWVzLCAnbWF4JykpIHsgcmV0dXJuIGNvbnNvbGUubG9nKCdNaXNzaW5nIG1pbiBvciBtYXggdmFsdWUuLi4nKSB9XG4gIH1cbiAgcmV0dXJuIHRoaXMuY3JlYXRlU2xpZGVyKClcbn1cblxuUlMucHJvdG90eXBlLmNyZWF0ZVNsaWRlciA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zbGlkZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy5jb250YWluZXIpXG4gIHRoaXMuc2xpZGVyLmlubmVySFRNTCA9ICc8ZGl2IGNsYXNzPVwicnMtYmdcIj48L2Rpdj4nXG4gIHRoaXMuc2VsZWN0ZWQgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy5zZWxlY3RlZClcbiAgdGhpcy5wb2ludGVyTCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnBvaW50ZXIsIFsnZGlyJywgJ2xlZnQnXSlcbiAgdGhpcy5zY2FsZSA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnNjYWxlKVxuXG4gIGlmICh0aGlzLmNvbmYudG9vbHRpcCkge1xuICAgIHRoaXMudGlwTCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnRpcClcbiAgICB0aGlzLnRpcFIgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy50aXApXG4gICAgdGhpcy5wb2ludGVyTC5hcHBlbmRDaGlsZCh0aGlzLnRpcEwpXG4gIH1cbiAgdGhpcy5zbGlkZXIuYXBwZW5kQ2hpbGQodGhpcy5zZWxlY3RlZClcbiAgdGhpcy5zbGlkZXIuYXBwZW5kQ2hpbGQodGhpcy5zY2FsZSlcbiAgdGhpcy5zbGlkZXIuYXBwZW5kQ2hpbGQodGhpcy5wb2ludGVyTClcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgdGhpcy5wb2ludGVyUiA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnBvaW50ZXIsIFsnZGlyJywgJ3JpZ2h0J10pXG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB0aGlzLnBvaW50ZXJSLmFwcGVuZENoaWxkKHRoaXMudGlwUilcbiAgICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnBvaW50ZXJSKVxuICB9XG5cbiAgdGhpcy5pbnB1dC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLnNsaWRlciwgdGhpcy5pbnB1dC5uZXh0U2libGluZylcblxuICBpZiAodGhpcy5jb25mLndpZHRoKSB0aGlzLnNsaWRlci5zdHlsZS53aWR0aCA9IHBhcnNlSW50KHRoaXMuY29uZi53aWR0aCkgKyAncHgnXG4gIHRoaXMuc2xpZGVyTGVmdCA9IHRoaXMuc2xpZGVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmxlZnRcbiAgdGhpcy5zbGlkZXJXaWR0aCA9IHRoaXMuc2xpZGVyLmNsaWVudFdpZHRoXG4gIHRoaXMucG9pbnRlcldpZHRoID0gdGhpcy5wb2ludGVyTC5jbGllbnRXaWR0aFxuXG4gIGlmICghdGhpcy5jb25mLnNjYWxlKSB0aGlzLnNsaWRlci5jbGFzc0xpc3QuYWRkKHRoaXMuY2xzLm5vc2NhbGUpXG5cbiAgcmV0dXJuIHRoaXMuc2V0SW5pdGlhbFZhbHVlcygpXG59XG5cblJTLnByb3RvdHlwZS5zZXRJbml0aWFsVmFsdWVzID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmRpc2FibGVkKHRoaXMuY29uZi5kaXNhYmxlZClcblxuICBpZiAodGhpcy52YWxSYW5nZSkgdGhpcy5jb25mLnZhbHVlcyA9IHByZXBhcmVBcnJheVZhbHVlcyh0aGlzLmNvbmYpXG5cbiAgdGhpcy52YWx1ZXMuc3RhcnQgPSAwXG4gIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi5yYW5nZSA/IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSA6IDBcblxuICBpZiAodGhpcy5jb25mLnNldCAmJiB0aGlzLmNvbmYuc2V0Lmxlbmd0aCAmJiBjaGVja0luaXRpYWwodGhpcy5jb25mKSkge1xuICAgIHZhciB2YWxzID0gdGhpcy5jb25mLnNldFxuXG4gICAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgICAgdGhpcy52YWx1ZXMuc3RhcnQgPSB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YodmFsc1swXSlcbiAgICAgIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi5zZXRbMV0gPyB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YodmFsc1sxXSkgOiBudWxsXG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzBdKVxuICB9XG4gIHJldHVybiB0aGlzLmNyZWF0ZVNjYWxlKClcbn1cblxuUlMucHJvdG90eXBlLmNyZWF0ZVNjYWxlID0gZnVuY3Rpb24gKHJlc2l6ZSkge1xuICB0aGlzLnN0ZXAgPSB0aGlzLnNsaWRlcldpZHRoIC8gKHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSlcblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7XG4gICAgdmFyIHNwYW4gPSBjcmVhdGVFbGVtZW50KCdzcGFuJylcbiAgICB2YXIgaW5zID0gY3JlYXRlRWxlbWVudCgnaW5zJylcblxuICAgIHNwYW4uYXBwZW5kQ2hpbGQoaW5zKVxuICAgIHRoaXMuc2NhbGUuYXBwZW5kQ2hpbGQoc3BhbilcblxuICAgIHNwYW4uc3R5bGUud2lkdGggPSBpID09PSBpTGVuIC0gMSA/IDAgOiB0aGlzLnN0ZXAgKyAncHgnXG5cbiAgICBpZiAoIXRoaXMuY29uZi5sYWJlbHMpIHtcbiAgICAgIGlmIChpID09PSAwIHx8IGkgPT09IGlMZW4gLSAxKSBpbnMuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1tpXVxuICAgIH0gZWxzZSBpbnMuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1tpXVxuXG4gICAgaW5zLnN0eWxlLm1hcmdpbkxlZnQgPSAoaW5zLmNsaWVudFdpZHRoIC8gMikgKiAtMSArICdweCdcbiAgfVxuICByZXR1cm4gdGhpcy5hZGRFdmVudHMoKVxufVxuXG5SUy5wcm90b3R5cGUudXBkYXRlU2NhbGUgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc3RlcCA9IHRoaXMuc2xpZGVyV2lkdGggLyAodGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKVxuXG4gIHZhciBwaWVjZXMgPSB0aGlzLnNsaWRlci5xdWVyeVNlbGVjdG9yQWxsKCdzcGFuJylcblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IHBpZWNlcy5sZW5ndGg7IGkgPCBpTGVuIC0gMTsgaSsrKSB7IHBpZWNlc1tpXS5zdHlsZS53aWR0aCA9IHRoaXMuc3RlcCArICdweCcgfVxuXG4gIHJldHVybiB0aGlzLnNldFZhbHVlcygpXG59XG5cblJTLnByb3RvdHlwZS5hZGRFdmVudHMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBwb2ludGVycyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy4nICsgdGhpcy5jbHMucG9pbnRlcilcbiAgdmFyIHBpZWNlcyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NwYW4nKVxuXG4gIGNyZWF0ZUV2ZW50cyhkb2N1bWVudCwgJ21vdXNlbW92ZSB0b3VjaG1vdmUnLCB0aGlzLm1vdmUuYmluZCh0aGlzKSlcbiAgY3JlYXRlRXZlbnRzKGRvY3VtZW50LCAnbW91c2V1cCB0b3VjaGVuZCB0b3VjaGNhbmNlbCcsIHRoaXMuZHJvcC5iaW5kKHRoaXMpKVxuXG4gIGZvciAobGV0IGkgPSAwLCBpTGVuID0gcG9pbnRlcnMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7IGNyZWF0ZUV2ZW50cyhwb2ludGVyc1tpXSwgJ21vdXNlZG93biB0b3VjaHN0YXJ0JywgdGhpcy5kcmFnLmJpbmQodGhpcykpIH1cblxuICBmb3IgKGxldCBpID0gMCwgaUxlbiA9IHBpZWNlcy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgY3JlYXRlRXZlbnRzKHBpZWNlc1tpXSwgJ2NsaWNrJywgdGhpcy5vbkNsaWNrUGllY2UuYmluZCh0aGlzKSkgfVxuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLm9uUmVzaXplLmJpbmQodGhpcykpXG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLmRyYWcgPSBmdW5jdGlvbiAoZSkge1xuICBlLnByZXZlbnREZWZhdWx0KClcblxuICBpZiAodGhpcy5jb25mLmRpc2FibGVkKSByZXR1cm5cblxuICB2YXIgZGlyID0gZS50YXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLWRpcicpXG4gIGlmIChkaXIgPT09ICdsZWZ0JykgdGhpcy5hY3RpdmVQb2ludGVyID0gdGhpcy5wb2ludGVyTFxuICBpZiAoZGlyID09PSAncmlnaHQnKSB0aGlzLmFjdGl2ZVBvaW50ZXIgPSB0aGlzLnBvaW50ZXJSXG5cbiAgcmV0dXJuIHRoaXMuc2xpZGVyLmNsYXNzTGlzdC5hZGQoJ3NsaWRpbmcnKVxufVxuXG5SUy5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uIChlKSB7XG4gIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgJiYgIXRoaXMuY29uZi5kaXNhYmxlZCkge1xuICAgIHZhciBjb29yZFggPSBlLnR5cGUgPT09ICd0b3VjaG1vdmUnID8gZS50b3VjaGVzWzBdLmNsaWVudFggOiBlLnBhZ2VYXG4gICAgdmFyIGluZGV4ID0gY29vcmRYIC0gdGhpcy5zbGlkZXJMZWZ0IC0gKHRoaXMucG9pbnRlcldpZHRoIC8gMilcblxuICAgIGluZGV4ID0gTWF0aC5yb3VuZChpbmRleCAvIHRoaXMuc3RlcClcblxuICAgIGlmIChpbmRleCA8PSAwKSBpbmRleCA9IDBcbiAgICBpZiAoaW5kZXggPiB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpIGluZGV4ID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG5cbiAgICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgICBpZiAodGhpcy5hY3RpdmVQb2ludGVyID09PSB0aGlzLnBvaW50ZXJMKSB0aGlzLnZhbHVlcy5zdGFydCA9IGluZGV4XG4gICAgICBpZiAodGhpcy5hY3RpdmVQb2ludGVyID09PSB0aGlzLnBvaW50ZXJSKSB0aGlzLnZhbHVlcy5lbmQgPSBpbmRleFxuICAgIH0gZWxzZSB0aGlzLnZhbHVlcy5lbmQgPSBpbmRleFxuXG4gICAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbiAgfVxufVxuXG5SUy5wcm90b3R5cGUuZHJvcCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5hY3RpdmVQb2ludGVyID0gbnVsbFxufVxuXG5SUy5wcm90b3R5cGUuc2V0VmFsdWVzID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGFjdGl2ZVBvaW50ZXIgPSB0aGlzLmNvbmYucmFuZ2UgPyAnc3RhcnQnIDogJ2VuZCdcblxuICBpZiAoc3RhcnQgJiYgdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHN0YXJ0KSA+IC0xKSB7IHRoaXMudmFsdWVzW2FjdGl2ZVBvaW50ZXJdID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHN0YXJ0KSB9XG5cbiAgaWYgKGVuZCAmJiB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YoZW5kKSA+IC0xKSB7IHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZihlbmQpIH1cblxuICBpZiAodGhpcy5jb25mLnJhbmdlICYmIHRoaXMudmFsdWVzLnN0YXJ0ID4gdGhpcy52YWx1ZXMuZW5kKSB7IHRoaXMudmFsdWVzLnN0YXJ0ID0gdGhpcy52YWx1ZXMuZW5kIH1cblxuICB0aGlzLnBvaW50ZXJMLnN0eWxlLmxlZnQgPSAodGhpcy52YWx1ZXNbYWN0aXZlUG9pbnRlcl0gKiB0aGlzLnN0ZXAgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKSkgKyAncHgnXG5cbiAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgIGlmICh0aGlzLmNvbmYudG9vbHRpcCkge1xuICAgICAgdGhpcy50aXBMLmlubmVySFRNTCA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdXG4gICAgICB0aGlzLnRpcFIuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG4gICAgfVxuICAgIHRoaXMuaW5wdXQudmFsdWUgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLnN0YXJ0XSArICcsJyArIHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxuICAgIHRoaXMucG9pbnRlclIuc3R5bGUubGVmdCA9ICh0aGlzLnZhbHVlcy5lbmQgKiB0aGlzLnN0ZXAgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKSkgKyAncHgnXG4gIH0gZWxzZSB7XG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7IHRoaXMudGlwTC5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF0gfVxuICAgIHRoaXMuaW5wdXQudmFsdWUgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1cbiAgfVxuXG4gIGlmICh0aGlzLnZhbHVlcy5lbmQgPiB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMVxuICBpZiAodGhpcy52YWx1ZXMuc3RhcnQgPCAwKSB0aGlzLnZhbHVlcy5zdGFydCA9IDBcblxuICB0aGlzLnNlbGVjdGVkLnN0eWxlLndpZHRoID0gKHRoaXMudmFsdWVzLmVuZCAtIHRoaXMudmFsdWVzLnN0YXJ0KSAqIHRoaXMuc3RlcCArICdweCdcbiAgdGhpcy5zZWxlY3RlZC5zdHlsZS5sZWZ0ID0gdGhpcy52YWx1ZXMuc3RhcnQgKiB0aGlzLnN0ZXAgKyAncHgnXG5cbiAgcmV0dXJuIHRoaXMub25DaGFuZ2UoKVxufVxuXG5SUy5wcm90b3R5cGUub25DbGlja1BpZWNlID0gZnVuY3Rpb24gKGUpIHtcbiAgaWYgKHRoaXMuY29uZi5kaXNhYmxlZCkgcmV0dXJuXG5cbiAgdmFyIGlkeCA9IE1hdGgucm91bmQoKGUuY2xpZW50WCAtIHRoaXMuc2xpZGVyTGVmdCkgLyB0aGlzLnN0ZXApXG5cbiAgaWYgKGlkeCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgaWR4ID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG4gIGlmIChpZHggPCAwKSBpZHggPSAwXG5cbiAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgIGlmIChpZHggLSB0aGlzLnZhbHVlcy5zdGFydCA8PSB0aGlzLnZhbHVlcy5lbmQgLSBpZHgpIHtcbiAgICAgIHRoaXMudmFsdWVzLnN0YXJ0ID0gaWR4XG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IGlkeFxuICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gaWR4XG5cbiAgdGhpcy5zbGlkZXIuY2xhc3NMaXN0LnJlbW92ZSgnc2xpZGluZycpXG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLm9uQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX3RoaXMgPSB0aGlzXG5cbiAgaWYgKHRoaXMudGltZW91dCkgY2xlYXJUaW1lb3V0KHRoaXMudGltZW91dClcblxuICB0aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoX3RoaXMuY29uZi5vbkNoYW5nZSAmJiB0eXBlb2YgX3RoaXMuY29uZi5vbkNoYW5nZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIF90aGlzLmNvbmYub25DaGFuZ2UoX3RoaXMuaW5wdXQudmFsdWUpXG4gICAgfVxuICB9LCA1MDApXG59XG5cblJTLnByb3RvdHlwZS5vblJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gdGhpcy5zbGlkZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdFxuICB0aGlzLnNsaWRlcldpZHRoID0gdGhpcy5zbGlkZXIuY2xpZW50V2lkdGhcbiAgcmV0dXJuIHRoaXMudXBkYXRlU2NhbGUoKVxufVxuXG5SUy5wcm90b3R5cGUuZGlzYWJsZWQgPSBmdW5jdGlvbiAoZGlzYWJsZWQpIHtcbiAgdGhpcy5jb25mLmRpc2FibGVkID0gZGlzYWJsZWRcbiAgdGhpcy5zbGlkZXIuY2xhc3NMaXN0W2Rpc2FibGVkID8gJ2FkZCcgOiAncmVtb3ZlJ10oJ2Rpc2FibGVkJylcbn1cblxuUlMucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAvLyBSZXR1cm4gbGlzdCBvZiBudW1iZXJzLCByYXRoZXIgdGhhbiBhIHN0cmluZywgd2hpY2ggd291bGQganVzdCBiZSBzaWxseVxuICAvLyAgcmV0dXJuIHRoaXMuaW5wdXQudmFsdWVcbiAgcmV0dXJuIFt0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLnN0YXJ0XSwgdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXVxufVxuXG5SUy5wcm90b3R5cGUuZ2V0VmFsdWVMID0gZnVuY3Rpb24gKCkge1xuICAvLyBHZXQgbGVmdCAoaS5lLiBzbWFsbGVzdCkgdmFsdWVcbiAgcmV0dXJuIHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdXG59XG5cblJTLnByb3RvdHlwZS5nZXRWYWx1ZVIgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIEdldCByaWdodCAoaS5lLiBzbWFsbGVzdCkgdmFsdWVcbiAgcmV0dXJuIHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxufVxuXG5SUy5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5pbnB1dC5zdHlsZS5kaXNwbGF5ID0gdGhpcy5pbnB1dERpc3BsYXlcbiAgdGhpcy5zbGlkZXIucmVtb3ZlKClcbn1cblxudmFyIGNyZWF0ZUVsZW1lbnQgPSBmdW5jdGlvbiAoZWwsIGNscywgZGF0YUF0dHIpIHtcbiAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGVsKVxuICBpZiAoY2xzKSBlbGVtZW50LmNsYXNzTmFtZSA9IGNsc1xuICBpZiAoZGF0YUF0dHIgJiYgZGF0YUF0dHIubGVuZ3RoID09PSAyKSB7IGVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLScgKyBkYXRhQXR0clswXSwgZGF0YUF0dHJbMV0pIH1cblxuICByZXR1cm4gZWxlbWVudFxufVxuXG52YXIgY3JlYXRlRXZlbnRzID0gZnVuY3Rpb24gKGVsLCBldiwgY2FsbGJhY2spIHtcbiAgdmFyIGV2ZW50cyA9IGV2LnNwbGl0KCcgJylcblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IGV2ZW50cy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudHNbaV0sIGNhbGxiYWNrKSB9XG59XG5cbnZhciBwcmVwYXJlQXJyYXlWYWx1ZXMgPSBmdW5jdGlvbiAoY29uZikge1xuICB2YXIgdmFsdWVzID0gW11cbiAgdmFyIHJhbmdlID0gY29uZi52YWx1ZXMubWF4IC0gY29uZi52YWx1ZXMubWluXG5cbiAgaWYgKCFjb25mLnN0ZXApIHtcbiAgICBjb25zb2xlLmxvZygnTm8gc3RlcCBkZWZpbmVkLi4uJylcbiAgICByZXR1cm4gW2NvbmYudmFsdWVzLm1pbiwgY29uZi52YWx1ZXMubWF4XVxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGlMZW4gPSAocmFuZ2UgLyBjb25mLnN0ZXApOyBpIDwgaUxlbjsgaSsrKSB7IHZhbHVlcy5wdXNoKGNvbmYudmFsdWVzLm1pbiArIGkgKiBjb25mLnN0ZXApIH1cblxuICBpZiAodmFsdWVzLmluZGV4T2YoY29uZi52YWx1ZXMubWF4KSA8IDApIHZhbHVlcy5wdXNoKGNvbmYudmFsdWVzLm1heClcblxuICByZXR1cm4gdmFsdWVzXG59XG5cbnZhciBjaGVja0luaXRpYWwgPSBmdW5jdGlvbiAoY29uZikge1xuICBpZiAoIWNvbmYuc2V0IHx8IGNvbmYuc2V0Lmxlbmd0aCA8IDEpIHJldHVybiBudWxsXG4gIGlmIChjb25mLnZhbHVlcy5pbmRleE9mKGNvbmYuc2V0WzBdKSA8IDApIHJldHVybiBudWxsXG5cbiAgaWYgKGNvbmYucmFuZ2UpIHtcbiAgICBpZiAoY29uZi5zZXQubGVuZ3RoIDwgMiB8fCBjb25mLnZhbHVlcy5pbmRleE9mKGNvbmYuc2V0WzFdKSA8IDApIHJldHVybiBudWxsXG4gIH1cbiAgcmV0dXJuIHRydWVcbn1cblxuZXhwb3J0IGRlZmF1bHQgUlNcbiIsIi8qIFJOR3MgLyBzZWxlY3RvcnMgKi9cbmV4cG9ydCBmdW5jdGlvbiBnYXVzc2lhbiAobikge1xuICBsZXQgcm51bSA9IDBcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICBybnVtICs9IE1hdGgucmFuZG9tKClcbiAgfVxuICByZXR1cm4gcm51bSAvIG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJhbmRCZXR3ZWVuIChuLCBtLCBkaXN0KSB7XG4gIC8vIHJldHVybiBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbiBhbmQgbSBpbmNsdXNpdmVcbiAgLy8gZGlzdCAob3B0aW9uYWwpIGlzIGEgZnVuY3Rpb24gcmV0dXJuaW5nIGEgdmFsdWUgaW4gWzAsMSlcbiAgLy8gZGVmYXVsdCBpcyBzbGlnaHRseSBiaWFzZWQgdG93YXJkcyBtaWRkbGVcbiAgaWYgKCFkaXN0KSBkaXN0ID0gTWF0aC5yYW5kb21cbiAgcmV0dXJuIG4gKyBNYXRoLmZsb29yKGRpc3QoKSAqIChtIC0gbiArIDEpKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZEJldHdlZW5GaWx0ZXIgKG4sIG0sIGZpbHRlcikge1xuICAvKiByZXR1cm5zIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBuIGFuZCBtIGluY2x1c2l2ZSB3aGljaCBzYXRpc2ZpZXMgdGhlIGZpbHRlclxuICAvICBuLCBtOiBpbnRlZ2VyXG4gIC8gIGZpbHRlcjogSW50LT4gQm9vbFxuICAqL1xuICBjb25zdCBhcnIgPSBbXVxuICBmb3IgKGxldCBpID0gbjsgaSA8IG0gKyAxOyBpKyspIHtcbiAgICBpZiAoZmlsdGVyKGkpKSBhcnIucHVzaChpKVxuICB9XG4gIGlmIChhcnIgPT09IFtdKSB0aHJvdyBuZXcgRXJyb3IoJ292ZXJmaWx0ZXJlZCcpXG4gIGNvbnN0IGkgPSByYW5kQmV0d2VlbigwLCBhcnIubGVuZ3RoIC0gMSlcbiAgcmV0dXJuIGFycltpXVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZE11bHRCZXR3ZWVuIChtaW4sIG1heCwgbikge1xuICAvLyByZXR1cm4gYSByYW5kb20gbXVsdGlwbGUgb2YgbiBiZXR3ZWVuIG4gYW5kIG0gKGluY2x1c2l2ZSBpZiBwb3NzaWJsZSlcbiAgbWluID0gTWF0aC5jZWlsKG1pbiAvIG4pICogblxuICBtYXggPSBNYXRoLmZsb29yKG1heCAvIG4pICogbiAvLyBjb3VsZCBjaGVjayBkaXZpc2liaWxpdHkgZmlyc3QgdG8gbWF4aW1pc2UgcGVyZm9ybWFjZSwgYnV0IEknbSBzdXJlIHRoZSBoaXQgaXNuJ3QgYmFkXG5cbiAgcmV0dXJuIHJhbmRCZXR3ZWVuKG1pbiAvIG4sIG1heCAvIG4pICogblxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZEVsZW0gKGFycmF5LCBkaXN0KSB7XG4gIGlmIChbLi4uYXJyYXldLmxlbmd0aCA9PT0gMCkgdGhyb3cgbmV3IEVycm9yKCdlbXB0eSBhcnJheScpXG4gIGlmICghZGlzdCkgZGlzdCA9IE1hdGgucmFuZG9tXG4gIGNvbnN0IG4gPSBhcnJheS5sZW5ndGggfHwgYXJyYXkuc2l6ZVxuICBjb25zdCBpID0gcmFuZEJldHdlZW4oMCwgbiAtIDEsIGRpc3QpXG4gIHJldHVybiBbLi4uYXJyYXldW2ldXG59XG5cbi8qIE1hdGhzICovXG5leHBvcnQgZnVuY3Rpb24gcm91bmRUb1RlbiAobikge1xuICByZXR1cm4gTWF0aC5yb3VuZChuIC8gMTApICogMTBcbn1cblxuLyoqXG4gKiBSb3VuZHMgYSBudW1iZXIgdG8gYSBnaXZlbiBudW1iZXIgb2YgZGVjaW1hbCBwbGFjZXNcbiAqIEBwYXJhbSB7bnVtYmVyfSB4IFRoZSBudW1iZXIgdG8gcm91bmRcbiAqIEBwYXJhbSB7bnVtYmVyfSBuIFRoZSBudW1iZXIgb2YgZGVjaW1hbCBwbGFjZXNcbiAqIEByZXR1cm5zIHtudW1iZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByb3VuZERQICh4LCBuKSB7XG4gIHJldHVybiBNYXRoLnJvdW5kKHggKiBNYXRoLnBvdygxMCwgbikpIC8gTWF0aC5wb3coMTAsIG4pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWdUb1JhZCAoeCkge1xuICByZXR1cm4geCAqIE1hdGguUEkgLyAxODBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNpbkRlZyAoeCkge1xuICByZXR1cm4gTWF0aC5zaW4oeCAqIE1hdGguUEkgLyAxODApXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb3NEZWcgKHgpIHtcbiAgcmV0dXJuIE1hdGguY29zKHggKiBNYXRoLlBJIC8gMTgwKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2NhbGVkU3RyIChuLCBkcCkge1xuICAvLyByZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGluZyBuLzEwXmRwXG4gIC8vIGUuZy4gc2NhbGVkU3RyKDM0LDEpPVwiMy40XCJcbiAgLy8gc2NhbGVkU3RyKDMxNCwyKT1cIjMuMTRcIlxuICAvLyBzY2FsZWRTdHIoMzAsMSk9XCIzXCJcbiAgLy8gVHJ5aW5nIHRvIGF2b2lkIHByZWNpc2lvbiBlcnJvcnMhXG4gIGlmIChkcCA9PT0gMCkgcmV0dXJuIG5cbiAgY29uc3QgZmFjdG9yID0gTWF0aC5wb3coMTAsIGRwKVxuICBjb25zdCBpbnRwYXJ0ID0gTWF0aC5mbG9vcihuIC8gZmFjdG9yKVxuICBjb25zdCBkZWNwYXJ0ID0gbiAlIGZhY3RvclxuICBpZiAoZGVjcGFydCA9PT0gMCkge1xuICAgIHJldHVybiBpbnRwYXJ0XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGludHBhcnQgKyAnLicgKyBkZWNwYXJ0XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdjZCAoYSwgYikge1xuICAvLyB0YWtlbiBmcm9tIGZyYWN0aW9uLmpzXG4gIGlmICghYSkgeyByZXR1cm4gYiB9XG4gIGlmICghYikgeyByZXR1cm4gYSB9XG5cbiAgd2hpbGUgKDEpIHtcbiAgICBhICU9IGJcbiAgICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICAgIGIgJT0gYVxuICAgIGlmICghYikgeyByZXR1cm4gYSB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxjbSAoYSwgYikge1xuICByZXR1cm4gYSAqIGIgLyBnY2QoYSwgYilcbn1cblxuLyogQXJyYXlzIGFuZCBzaW1pbGFyICovXG5cbi8qKlxuICogU29ydHMgdHdvIGFycmF5cyB0b2dldGhlciBiYXNlZCBvbiBzb3J0aW5nIGFycjBcbiAqIEBwYXJhbSB7KltdfSBhcnIwXG4gKiBAcGFyYW0geypbXX0gYXJyMVxuICogQHBhcmFtIHsqfSBmXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzb3J0VG9nZXRoZXIgKGFycjAsIGFycjEsIGYpIHtcbiAgaWYgKGFycjAubGVuZ3RoICE9PSBhcnIxLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JvdGggYXJndW1lbnRzIG11c3QgYmUgYXJyYXlzIG9mIHRoZSBzYW1lIGxlbmd0aCcpXG4gIH1cblxuICBmID0gZiB8fCAoKHgsIHkpID0+IHggLSB5KVxuXG4gIGNvbnN0IG4gPSBhcnIwLmxlbmd0aFxuICBjb25zdCBjb21iaW5lZCA9IFtdXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgY29tYmluZWRbaV0gPSBbYXJyMFtpXSwgYXJyMVtpXV1cbiAgfVxuXG4gIGNvbWJpbmVkLnNvcnQoKHgsIHkpID0+IGYoeFswXSwgeVswXSkpXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICBhcnIwW2ldID0gY29tYmluZWRbaV1bMF1cbiAgICBhcnIxW2ldID0gY29tYmluZWRbaV1bMV1cbiAgfVxuXG4gIHJldHVybiBbYXJyMCwgYXJyMV1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGUgKGFycmF5KSB7XG4gIC8vIEtudXRoLUZpc2hlci1ZYXRlc1xuICAvLyBmcm9tIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yNDUwOTc2LzM3MzcyOTVcbiAgLy8gbmIuIHNodWZmbGVzIGluIHBsYWNlXG4gIHZhciBjdXJyZW50SW5kZXggPSBhcnJheS5sZW5ndGg7IHZhciB0ZW1wb3JhcnlWYWx1ZTsgdmFyIHJhbmRvbUluZGV4XG5cbiAgLy8gV2hpbGUgdGhlcmUgcmVtYWluIGVsZW1lbnRzIHRvIHNodWZmbGUuLi5cbiAgd2hpbGUgKGN1cnJlbnRJbmRleCAhPT0gMCkge1xuICAgIC8vIFBpY2sgYSByZW1haW5pbmcgZWxlbWVudC4uLlxuICAgIHJhbmRvbUluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY3VycmVudEluZGV4KVxuICAgIGN1cnJlbnRJbmRleCAtPSAxXG5cbiAgICAvLyBBbmQgc3dhcCBpdCB3aXRoIHRoZSBjdXJyZW50IGVsZW1lbnQuXG4gICAgdGVtcG9yYXJ5VmFsdWUgPSBhcnJheVtjdXJyZW50SW5kZXhdXG4gICAgYXJyYXlbY3VycmVudEluZGV4XSA9IGFycmF5W3JhbmRvbUluZGV4XVxuICAgIGFycmF5W3JhbmRvbUluZGV4XSA9IHRlbXBvcmFyeVZhbHVlXG4gIH1cblxuICByZXR1cm4gYXJyYXlcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgYSBpcyBhbiBhcnJheSBjb250YWluaW5nIGUsIGZhbHNlIG90aGVyd2lzZSAoaW5jbHVkaW5nIGlmIGEgaXMgbm90IGFuIGFycmF5KVxuICogQHBhcmFtIHsqfSBhICBBbiBhcnJheVxuICogQHBhcmFtIHsqfSBlIEFuIGVsZW1lbnQgdG8gY2hlY2sgaWYgaXMgaW4gdGhlIGFycmF5XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdlYWtJbmNsdWRlcyAoYSwgZSkge1xuICByZXR1cm4gKEFycmF5LmlzQXJyYXkoYSkgJiYgYS5pbmNsdWRlcyhlKSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpcnN0VW5pcXVlSW5kZXggKGFycmF5KSB7XG4gIC8vIHJldHVybnMgaW5kZXggb2YgZmlyc3QgdW5pcXVlIGVsZW1lbnRcbiAgLy8gaWYgbm9uZSwgcmV0dXJucyBsZW5ndGggb2YgYXJyYXlcbiAgbGV0IGkgPSAwXG4gIHdoaWxlIChpIDwgYXJyYXkubGVuZ3RoKSB7XG4gICAgaWYgKGFycmF5LmluZGV4T2YoYXJyYXlbaV0pID09PSBhcnJheS5sYXN0SW5kZXhPZihhcnJheVtpXSkpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIGkrK1xuICB9XG4gIHJldHVybiBpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBib29sT2JqZWN0VG9BcnJheSAob2JqKSB7XG4gIC8vIEdpdmVuIGFuIG9iamVjdCB3aGVyZSBhbGwgdmFsdWVzIGFyZSBib29sZWFuLCByZXR1cm4ga2V5cyB3aGVyZSB0aGUgdmFsdWUgaXMgdHJ1ZVxuICBjb25zdCByZXN1bHQgPSBbXVxuICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHtcbiAgICBpZiAob2JqW2tleV0pIHJlc3VsdC5wdXNoKGtleSlcbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qIE9iamVjdCBwcm9wZXJ0eSBhY2Nlc3MgYnkgc3RyaW5nICovXG5leHBvcnQgZnVuY3Rpb24gcHJvcEJ5U3RyaW5nIChvLCBzLCB4KSB7XG4gIC8qIEUuZy4gYnlTdHJpbmcobXlPYmosXCJmb28uYmFyXCIpIC0+IG15T2JqLmZvby5iYXJcbiAgICAgKiBieVN0cmluZyhteU9iaixcImZvby5iYXJcIixcImJhelwiKSAtPiBteU9iai5mb28uYmFyID0gXCJiYXpcIlxuICAgICAqL1xuICBzID0gcy5yZXBsYWNlKC9cXFsoXFx3KylcXF0vZywgJy4kMScpIC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gIHMgPSBzLnJlcGxhY2UoL15cXC4vLCAnJykgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICB2YXIgYSA9IHMuc3BsaXQoJy4nKVxuICBmb3IgKHZhciBpID0gMCwgbiA9IGEubGVuZ3RoIC0gMTsgaSA8IG47ICsraSkge1xuICAgIHZhciBrID0gYVtpXVxuICAgIGlmIChrIGluIG8pIHtcbiAgICAgIG8gPSBvW2tdXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgfVxuICBpZiAoeCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gb1thW25dXVxuICBlbHNlIG9bYVtuXV0gPSB4XG59XG5cbi8qIExvZ2ljICovXG5leHBvcnQgZnVuY3Rpb24gbUlmIChwLCBxKSB7IC8vIG1hdGVyaWFsIGNvbmRpdGlvbmFsXG4gIHJldHVybiAoIXAgfHwgcSlcbn1cblxuLyogRE9NIG1hbmlwdWxhdGlvbiBhbmQgcXVlcnlpbmcgKi9cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IEhUTUwgZWxlbWVudCwgc2V0cyBjbGFzc2VzIGFuZCBhcHBlbmRzXG4gKiBAcGFyYW0ge3N0cmluZ30gdGFnTmFtZSBUYWcgbmFtZSBvZiBlbGVtZW50XG4gKiBAcGFyYW0ge3N0cmluZ3x1bmRlZmluZWR9IFtjbGFzc05hbWVdIEEgY2xhc3Mgb3IgY2xhc3NlcyB0byBhc3NpZ24gdG8gdGhlIGVsZW1lbnRcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IFtwYXJlbnRdIEEgcGFyZW50IGVsZW1lbnQgdG8gYXBwZW5kIHRoZSBlbGVtZW50IHRvXG4gKiBAcmV0dXJucyB7SFRNTEVsZW1lbnR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbGVtICh0YWdOYW1lLCBjbGFzc05hbWUsIHBhcmVudCkge1xuICAvLyBjcmVhdGUsIHNldCBjbGFzcyBhbmQgYXBwZW5kIGluIG9uZVxuICBjb25zdCBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKVxuICBpZiAoY2xhc3NOYW1lKSBlbGVtLmNsYXNzTmFtZSA9IGNsYXNzTmFtZVxuICBpZiAocGFyZW50KSBwYXJlbnQuYXBwZW5kQ2hpbGQoZWxlbSlcbiAgcmV0dXJuIGVsZW1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc0FuY2VzdG9yQ2xhc3MgKGVsZW0sIGNsYXNzTmFtZSkge1xuICAvLyBjaGVjayBpZiBhbiBlbGVtZW50IGVsZW0gb3IgYW55IG9mIGl0cyBhbmNlc3RvcnMgaGFzIGNsc3NcbiAgbGV0IHJlc3VsdCA9IGZhbHNlXG4gIGZvciAoO2VsZW0gJiYgZWxlbSAhPT0gZG9jdW1lbnQ7IGVsZW0gPSBlbGVtLnBhcmVudE5vZGUpIHsgLy8gdHJhdmVyc2UgRE9NIHVwd2FyZHNcbiAgICBpZiAoZWxlbS5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKSkge1xuICAgICAgcmVzdWx0ID0gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qIENhbnZhcyBkcmF3aW5nICovXG5leHBvcnQgZnVuY3Rpb24gZGFzaGVkTGluZSAoY3R4LCB4MSwgeTEsIHgyLCB5Mikge1xuICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHgyIC0geDEsIHkyIC0geTEpXG4gIGNvbnN0IGRhc2h4ID0gKHkxIC0geTIpIC8gbGVuZ3RoIC8vIHVuaXQgdmVjdG9yIHBlcnBlbmRpY3VsYXIgdG8gbGluZVxuICBjb25zdCBkYXNoeSA9ICh4MiAtIHgxKSAvIGxlbmd0aFxuICBjb25zdCBtaWR4ID0gKHgxICsgeDIpIC8gMlxuICBjb25zdCBtaWR5ID0gKHkxICsgeTIpIC8gMlxuXG4gIC8vIGRyYXcgdGhlIGJhc2UgbGluZVxuICBjdHgubW92ZVRvKHgxLCB5MSlcbiAgY3R4LmxpbmVUbyh4MiwgeTIpXG5cbiAgLy8gZHJhdyB0aGUgZGFzaFxuICBjdHgubW92ZVRvKG1pZHggKyA1ICogZGFzaHgsIG1pZHkgKyA1ICogZGFzaHkpXG4gIGN0eC5saW5lVG8obWlkeCAtIDUgKiBkYXNoeCwgbWlkeSAtIDUgKiBkYXNoeSlcblxuICBjdHgubW92ZVRvKHgyLCB5Milcbn1cbiIsImltcG9ydCB7IE9wdGlvbnNTcGVjICwgT3B0aW9uIGFzIE9wdGlvbkksIFNlbGVjdE9wdGlvbiwgU2VsZWN0RXhjbHVzaXZlT3B0aW9uLCBTZWxlY3RJbmNsdXNpdmVPcHRpb24sIFJlYWxPcHRpb24sIFJhbmdlT3B0aW9ufSBmcm9tICdPcHRpb25zU3BlYydcbmltcG9ydCB7IGNyZWF0ZUVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgKiBhcyBNdXN0YWNoZSBmcm9tICdtdXN0YWNoZSdcblxudHlwZSBPcHRpb25zID0gKE9wdGlvbnNTcGVjWzBdICYge2VsZW1lbnQ/OiBIVE1MRWxlbWVudH0pW10gLy8gbGlrZSBPcHRpb25zU3BlYyBidXQgd2l0aCBvcHRpb25hbCBlbGVtZW50IGZvciBlYWNoIG9wdGlvblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBPcHRpb25zU2V0IHtcbiAgb3B0aW9uc1NwZWMgOiBPcHRpb25zXG4gIG9wdGlvbnMgOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgc3RyaW5nW10gfCBPcHRpb25zU2V0PlxuICB0ZW1wbGF0ZT8gOiBzdHJpbmdcbiAgZ2xvYmFsSWQ6IHN0cmluZ1xuICBzdGF0aWMgaWRDb3VudGVyOiBudW1iZXIgPSAwIC8vIGluY3JlbWVudCBlYWNoIHRpbWUgdG8gY3JlYXRlIHVuaXF1ZSBpZHMgdG8gdXNlIGluIGlkcy9uYW1lcyBvZiBlbGVtZW50c1xuXG4gIHN0YXRpYyBnZXRJZCgpOiBzdHJpbmcge1xuICAgIGlmIChPcHRpb25zU2V0LmlkQ291bnRlciA+PSAyNiAqKiAyKSB0aHJvdyBuZXcgRXJyb3IoJ1RvbyBtYW55IG9wdGlvbnMgb2JqZWN0cyEnKVxuICAgIGNvbnN0IGlkID0gU3RyaW5nLmZyb21DaGFyQ29kZSh+fihPcHRpb25zU2V0LmlkQ291bnRlciAvIDI2KSArIDk3KSArXG4gICAgICBTdHJpbmcuZnJvbUNoYXJDb2RlKE9wdGlvbnNTZXQuaWRDb3VudGVyICUgMjYgKyA5NylcblxuICAgIE9wdGlvbnNTZXQuaWRDb3VudGVyICs9IDFcblxuICAgIHJldHVybiBpZFxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBvcHRpb25zIHNwZWNcbiAgICogQHBhcmFtIG9wdGlvbnNTcGVjIFNwZWNpZmljYXRpb24gb2Ygb3B0aW9uc1xuICAgKiBAcGFyYW0gdGVtcGxhdGUgQSB0ZW1wbGF0ZSBmb3IgZGlzcGxheWluZyBvcHRpb25zLCB1c2luZyB7e211c3RhY2hlfX0gc3ludGF4XG4gICAqL1xuICBjb25zdHJ1Y3RvciAob3B0aW9uc1NwZWMgOiBPcHRpb25zU3BlYywgdGVtcGxhdGU/IDogc3RyaW5nKSB7XG4gICAgdGhpcy5vcHRpb25zU3BlYyA9IG9wdGlvbnNTcGVjIGFzIE9wdGlvbnNcblxuICAgIHRoaXMub3B0aW9ucyA9IHt9XG4gICAgdGhpcy5vcHRpb25zU3BlYy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICBpZiAoaXNSZWFsT3B0aW9uKG9wdGlvbikpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBvcHRpb24uZGVmYXVsdFxuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGUgLy8gaHRtbCB0ZW1wbGF0ZSAob3B0aW9uYWwpXG5cbiAgICAvLyBzZXQgYW4gaWQgYmFzZWQgb24gYSBjb3VudGVyIC0gdXNlZCBmb3IgbmFtZXMgb2YgZm9ybSBlbGVtZW50c1xuICAgIHRoaXMuZ2xvYmFsSWQgPSBPcHRpb25zU2V0LmdldElkKClcbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhbiBvcHRpb24sIGZpbmQgaXRzIFVJIGVsZW1lbnQgYW5kIHVwZGF0ZSB0aGUgc3RhdGUgZnJvbSB0aGF0XG4gICAqIEBwYXJhbSB7Kn0gb3B0aW9uIEFuIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25TcGVjIG9yIGFuIGlkXG4gICAqL1xuICB1cGRhdGVTdGF0ZUZyb21VSSAob3B0aW9uIDogT3B0aW9uc1swXSB8IHN0cmluZykge1xuICAgIC8vIGlucHV0IC0gZWl0aGVyIGFuIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25zU3BlYyBvciBhbiBvcHRpb24gaWRcbiAgICBpZiAodHlwZW9mIChvcHRpb24pID09PSAnc3RyaW5nJykge1xuICAgICAgb3B0aW9uID0gdGhpcy5vcHRpb25zU3BlYy5maW5kKHggPT4gKCh4IGFzIE9wdGlvbkkpLmlkID09PSBvcHRpb24pKVxuICAgICAgaWYgKCFvcHRpb24pIHRocm93IG5ldyBFcnJvcihgbm8gb3B0aW9uIHdpdGggaWQgJyR7b3B0aW9ufSdgKVxuICAgIH1cbiAgICBpZiAoIW9wdGlvbi5lbGVtZW50KSB0aHJvdyBuZXcgRXJyb3IoYG9wdGlvbiAkeyhvcHRpb24gYXMgT3B0aW9uSSkuaWR9IGRvZXNuJ3QgaGF2ZSBhIFVJIGVsZW1lbnRgKVxuXG4gICAgc3dpdGNoIChvcHRpb24udHlwZSkge1xuICAgICAgY2FzZSAnaW50Jzoge1xuICAgICAgICBjb25zdCBpbnB1dCA6IEhUTUxJbnB1dEVsZW1lbnQgPSBvcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKVswXVxuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IE51bWJlcihpbnB1dC52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2Jvb2wnOiB7XG4gICAgICAgIGNvbnN0IGlucHV0IDogSFRNTElucHV0RWxlbWVudCA9IG9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpWzBdXG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gaW5wdXQuY2hlY2tlZFxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAnc2VsZWN0LWV4Y2x1c2l2ZSc6IHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSAob3B0aW9uLmVsZW1lbnQucXVlcnlTZWxlY3RvcignaW5wdXQ6Y2hlY2tlZCcpIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdzZWxlY3QtaW5jbHVzaXZlJzoge1xuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9XG4gICAgICAgICAgQXJyYXkuZnJvbShvcHRpb24uZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dDpjaGVja2VkJyksICh4IDogSFRNTElucHV0RWxlbWVudCkgPT4geC52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3JhbmdlJzoge1xuICAgICAgICBjb25zdCBpbnB1dExCIDogSFRNTElucHV0RWxlbWVudCA9IG9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpWzBdXG4gICAgICAgIGNvbnN0IGlucHV0VUIgOiBIVE1MSW5wdXRFbGVtZW50ID0gb3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JylbMV1cbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZExCXSA9IGlucHV0TEIudmFsdWVcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZFVCXSA9IGlucHV0VUIudmFsdWVcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBvcHRpb24gd2l0aCBpZCAkeyhvcHRpb24gYXMgT3B0aW9uSSkuaWR9IGhhcyB1bnJlY29nbmlzZWQgb3B0aW9uIHR5cGUgJHtvcHRpb24udHlwZX1gKVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0aGlzLm9wdGlvbnMpXG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBzdHJpbmcsIHJldHVybiB0aGUgZWxlbWVudCBvZiB0aGlzLm9wdGlvbnMgd2l0aCB0aGF0IGlkXG4gICAqIEBwYXJhbSBpZCBUaGUgaWRcbiAgICovXG5cbiAgdXBkYXRlU3RhdGVGcm9tVUlBbGwgKCkge1xuICAgIHRoaXMub3B0aW9uc1NwZWMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgaWYgKGlzUmVhbE9wdGlvbihvcHRpb24pKSB7IFxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXRlRnJvbVVJKG9wdGlvbilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZGlzYWJsZU9yRW5hYmxlQWxsICgpIHtcbiAgICB0aGlzLm9wdGlvbnNTcGVjLmZvckVhY2gob3B0aW9uID0+IHRoaXMuZGlzYWJsZU9yRW5hYmxlKG9wdGlvbikpXG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYW4gb3B0aW9uLCBmaW5kIGl0cyBVSSBlbGVtZW50IGFuZCB1cGRhdGUgaXQgYWNjb3JkaW5nIHRvIHRoZSBvcHRpb25zIElEXG4gICAqIEBwYXJhbSB7Kn0gb3B0aW9uIEFuIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25zU3BlYyBvciBhbiBvcHRpb24gaWRcbiAgICovXG4gIHVwZGF0ZVVJRnJvbVN0YXRlIChvcHRpb24pIHtcbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhbiBvcHRpb24sIGVuYWJsZSBvciBkaXNhYmxlIHRoZSBVSSBlbGVtZW50IGRlcGVuZGluZyBvbiB0aGUgdmFsdWUgb2Ygb3B0aW9uLmRpc2FibGVJZiBhbmQgdGhlXG4gICAqIHN0YXRlIG9mIHRoZSBjb3JyZXNwb25kaW5nIGJvb2xlYW4gb3B0aW9uXG4gICAqIEBwYXJhbSB7Kn0gb3B0aW9uIEFuIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25zU3BlYyBvciBhbiBvcHRpb24gaWRcbiAgICovXG4gIGRpc2FibGVPckVuYWJsZSAob3B0aW9uKSB7XG4gICAgaWYgKHR5cGVvZiAob3B0aW9uKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIG9wdGlvbiA9IHRoaXMub3B0aW9uc1NwZWMuZmluZCh4ID0+IChpc1JlYWxPcHRpb24oeCkgJiYgeC5pZCA9PT0gb3B0aW9uKSlcbiAgICAgIGlmICghb3B0aW9uKSB0aHJvdyBuZXcgRXJyb3IoYG5vIG9wdGlvbiB3aXRoIGlkICcke29wdGlvbn0nYClcbiAgICB9XG5cbiAgICBpZiAoIW9wdGlvbi5kaXNhYmxlZElmKSByZXR1cm5cblxuICAgIC8vIEludmVyc2UgZXZlcnl0aGluZyBpZiBiZWdpbmluZyB3aXRoICFcbiAgICBsZXQgZGlzYWJsZXJJZCA9IG9wdGlvbi5kaXNhYmxlZElmXG4gICAgbGV0IGVuYWJsZSA9IGZhbHNlIC8vIGRpc2FibGUgaWZmIGRpc2FibGVyIGlzIHRydWVcbiAgICBpZiAoZGlzYWJsZXJJZC5zdGFydHNXaXRoKCchJykpIHtcbiAgICAgIGVuYWJsZSA9IHRydWUgLy8gZW5kYWJsZSBpZmYgZGlzYWJsZXIgaXMgdHJ1ZVxuICAgICAgZGlzYWJsZXJJZCA9IGRpc2FibGVySWQuc2xpY2UoMSlcbiAgICB9XG5cbiAgICAvLyBFbmRhYmxlIG9yIGRpc2FibGVcbiAgICBpZiAodGhpcy5vcHRpb25zW2Rpc2FibGVySWRdID09PSBlbmFibGUpIHsgLy8gZW5hYmxlXG4gICAgICBvcHRpb24uZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKCdkaXNhYmxlZCcpXG4gICAgICA7Wy4uLm9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpXS5mb3JFYWNoKGUgPT4geyBlLmRpc2FibGVkID0gZmFsc2UgfSlcbiAgICB9IGVsc2UgeyAvLyBkaXNhYmxlXG4gICAgICBvcHRpb24uZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdkaXNhYmxlZCcpXG4gICAgICA7Wy4uLm9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpXS5mb3JFYWNoKGUgPT4geyBlLmRpc2FibGVkID0gdHJ1ZSB9KVxuICAgIH1cbiAgfVxuXG4gIHJlbmRlckluIChlbGVtZW50LCB1bEV4dHJhQ2xhc3M/IDogc3RyaW5nKSB7XG4gICAgY29uc3QgbGlzdCA9IGNyZWF0ZUVsZW0oJ3VsJywgJ29wdGlvbnMtbGlzdCcpXG4gICAgaWYgKHVsRXh0cmFDbGFzcykgbGlzdC5jbGFzc0xpc3QuYWRkKHVsRXh0cmFDbGFzcylcbiAgICBsZXQgY29sdW1uID0gY3JlYXRlRWxlbSgnZGl2JywgJ29wdGlvbnMtY29sdW1uJywgbGlzdClcblxuICAgIHRoaXMub3B0aW9uc1NwZWMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgaWYgKG9wdGlvbi50eXBlID09PSAnY29sdW1uLWJyZWFrJykgeyAvLyBzdGFydCBuZXcgY29sdW1uXG4gICAgICAgIGNvbHVtbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdvcHRpb25zLWNvbHVtbicsIGxpc3QpXG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbi50eXBlID09PSAnc3Vib3B0aW9ucycpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBuZXcgT3B0aW9uc1NldChvcHRpb24ub3B0aW9uc1NwZWMpXG4gICAgICAgIDsodGhpcy5vcHRpb25zW29wdGlvbi5pZF0gYXMgT3B0aW9uc1NldCkucmVuZGVySW4oY29sdW1uLFwic3Vib3B0aW9uc1wiKVxuICAgICAgfVxuICAgICAgZWxzZSB7IC8vIG1ha2UgbGlzdCBpdGVtXG4gICAgICAgIGNvbnN0IGxpID0gY3JlYXRlRWxlbSgnbGknLCB1bmRlZmluZWQsIGNvbHVtbilcbiAgICAgICAgaWYgKGlzUmVhbE9wdGlvbihvcHRpb24pKSB7XG4gICAgICAgICAgbGkuZGF0YXNldC5vcHRpb25JZCA9IG9wdGlvbi5pZFxuICAgICAgICB9XG5cbiAgICAgICAgc3dpdGNoIChvcHRpb24udHlwZSkge1xuICAgICAgICAgIGNhc2UgJ2hlYWRpbmcnOlxuICAgICAgICAgICAgcmVuZGVySGVhZGluZyhvcHRpb24udGl0bGUsIGxpKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdpbnQnOlxuICAgICAgICAgIGNhc2UgJ2Jvb2wnOlxuICAgICAgICAgICAgcmVuZGVyU2luZ2xlT3B0aW9uKG9wdGlvbiwgbGkpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3NlbGVjdC1pbmNsdXNpdmUnOlxuICAgICAgICAgIGNhc2UgJ3NlbGVjdC1leGNsdXNpdmUnOlxuICAgICAgICAgICAgdGhpcy5yZW5kZXJMaXN0T3B0aW9uKG9wdGlvbiwgbGkpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3JhbmdlJzpcbiAgICAgICAgICAgIHJlbmRlclJhbmdlT3B0aW9uKG9wdGlvbiwgbGkpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICAgIGxpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGUgPT4geyB0aGlzLnVwZGF0ZVN0YXRlRnJvbVVJKG9wdGlvbik7IHRoaXMuZGlzYWJsZU9yRW5hYmxlQWxsKCkgfSlcbiAgICAgICAgb3B0aW9uLmVsZW1lbnQgPSBsaVxuXG4gICAgICB9XG4gICAgfSlcbiAgICBlbGVtZW50LmFwcGVuZChsaXN0KVxuXG4gICAgdGhpcy51cGRhdGVTdGF0ZUZyb21VSUFsbCgpXG4gICAgdGhpcy5kaXNhYmxlT3JFbmFibGVBbGwoKVxuICB9XG5cbiAgcmVuZGVyV2l0aFRlbXBsYXRlKGVsZW1lbnQgOiBIVE1MRWxlbWVudCkge1xuICAgIC8vIGNyZWF0ZSBhcHByb3ByaWF0ZSBvYmplY3QgZm9yIG11c3RhY2hlXG4gICAgbGV0IG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsT3B0aW9uST5cbiAgICB0aGlzLm9wdGlvbnNTcGVjLmZvckVhY2goIG9wdGlvbiA9PiB7XG4gICAgICBpZiAoaXNSZWFsT3B0aW9uKG9wdGlvbikpIHtcbiAgICAgICAgb3B0aW9uc1tvcHRpb24uaWRdID0gb3B0aW9uXG4gICAgICB9XG4gICAgfSlcblxuICAgIGxldCBodG1sU3RyaW5nID0gdGhpcy50ZW1wbGF0ZVxuICB9XG5cbiAgcmVuZGVyTGlzdE9wdGlvbiAob3B0aW9uOiBTZWxlY3RFeGNsdXNpdmVPcHRpb24gfCBTZWxlY3RJbmNsdXNpdmVPcHRpb24gLCBsaSA6IEhUTUxFbGVtZW50KSB7XG4gICAgbGkuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLG9wdGlvbi50aXRsZSArICc6ICcpXG5cbiAgICBjb25zdCBzdWJsaXN0ID0gY3JlYXRlRWxlbSgndWwnLCAnb3B0aW9ucy1zdWJsaXN0JywgbGkpXG4gICAgaWYgKG9wdGlvbi52ZXJ0aWNhbCkgc3VibGlzdC5jbGFzc0xpc3QuYWRkKCdvcHRpb25zLXN1Ymxpc3QtdmVydGljYWwnKVxuXG4gICAgb3B0aW9uLnNlbGVjdE9wdGlvbnMuZm9yRWFjaChzZWxlY3RPcHRpb24gPT4ge1xuICAgICAgY29uc3Qgc3VibGlzdExpID0gY3JlYXRlRWxlbSgnbGknLCBudWxsLCBzdWJsaXN0KVxuICAgICAgY29uc3QgbGFiZWwgPSBjcmVhdGVFbGVtKCdsYWJlbCcsIG51bGwsIHN1Ymxpc3RMaSlcblxuICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpXG4gICAgICBpbnB1dC50eXBlID0gb3B0aW9uLnR5cGUgPT09ICdzZWxlY3QtZXhjbHVzaXZlJyA/ICdyYWRpbycgOiAnY2hlY2tib3gnXG4gICAgICBpbnB1dC5uYW1lID0gdGhpcy5nbG9iYWxJZCArICctJyArIG9wdGlvbi5pZFxuICAgICAgaW5wdXQudmFsdWUgPSBzZWxlY3RPcHRpb24uaWRcblxuICAgICAgaWYgKG9wdGlvbi50eXBlID09PSAnc2VsZWN0LWluY2x1c2l2ZScpIHsgLy8gZGVmYXVsdHMgd29yayBkaWZmZXJlbnQgZm9yIGluY2x1c2l2ZS9leGNsdXNpdmVcbiAgICAgICAgaW5wdXQuY2hlY2tlZCA9IG9wdGlvbi5kZWZhdWx0LmluY2x1ZGVzKHNlbGVjdE9wdGlvbi5pZClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlucHV0LmNoZWNrZWQgPSBvcHRpb24uZGVmYXVsdCA9PT0gc2VsZWN0T3B0aW9uLmlkXG4gICAgICB9XG5cbiAgICAgIGxhYmVsLmFwcGVuZChpbnB1dClcblxuICAgICAgaW5wdXQuY2xhc3NMaXN0LmFkZCgnb3B0aW9uJylcblxuICAgICAgbGFiZWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLHNlbGVjdE9wdGlvbi50aXRsZSlcbiAgICB9KVxuICB9XG59XG5cbi8qKlxuICogUmVuZGVycyBhIGhlYWRpbmcgb3B0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gdGl0bGUgVGhlIHRpdGxlIG9mIHRoZSBoZWFkaW5nXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBsaSBUaGUgZWxlbWVudCB0byByZW5kZXIgaW50b1xuICovXG5mdW5jdGlvbiByZW5kZXJIZWFkaW5nICh0aXRsZSwgbGkpIHtcbiAgbGkuaW5uZXJIVE1MID0gdGl0bGVcbiAgbGkuY2xhc3NMaXN0LmFkZCgnb3B0aW9ucy1oZWFkaW5nJylcbn1cblxuLyoqXG4gKiBSZW5kZXJzIHNpbmdsZSBwYXJhbWV0ZXJcbiAqIEBwYXJhbSB7Kn0gb3B0aW9uXG4gKiBAcGFyYW0geyp9IGxpXG4gKi9cbmZ1bmN0aW9uIHJlbmRlclNpbmdsZU9wdGlvbiAob3B0aW9uLCBsaSkge1xuICBjb25zdCBsYWJlbCA9IGNyZWF0ZUVsZW0oJ2xhYmVsJywgdW5kZWZpbmVkLCBsaSlcblxuICBpZiAoIW9wdGlvbi5zd2FwTGFiZWwgJiYgb3B0aW9uLnRpdGxlICE9PSAnJykgbGFiZWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLGAke29wdGlvbi50aXRsZX06IGApXG5cbiAgY29uc3QgaW5wdXQgOiBIVE1MSW5wdXRFbGVtZW50ID0gY3JlYXRlRWxlbSgnaW5wdXQnLCAnb3B0aW9uJywgbGFiZWwpIGFzIEhUTUxJbnB1dEVsZW1lbnRcbiAgc3dpdGNoIChvcHRpb24udHlwZSkge1xuICAgIGNhc2UgJ2ludCc6XG4gICAgICBpbnB1dC50eXBlID0gJ251bWJlcidcbiAgICAgIGlucHV0Lm1pbiA9IG9wdGlvbi5taW5cbiAgICAgIGlucHV0Lm1heCA9IG9wdGlvbi5tYXhcbiAgICAgIGlucHV0LnZhbHVlID0gb3B0aW9uLmRlZmF1bHRcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYm9vbCc6XG4gICAgICBpbnB1dC50eXBlID0gJ2NoZWNrYm94J1xuICAgICAgaW5wdXQuY2hlY2tlZCA9IG9wdGlvbi5kZWZhdWx0XG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHVua25vd24gb3B0aW9uIHR5cGUgJHtvcHRpb24udHlwZX1gKVxuICB9XG5cbiAgaWYgKG9wdGlvbi5zd2FwTGFiZWwgJiYgb3B0aW9uLnRpdGxlICE9PSAnJykgbGFiZWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLGAgJHtvcHRpb24udGl0bGV9YClcbn1cblxuZnVuY3Rpb24gcmVuZGVyUmFuZ2VPcHRpb24ob3B0aW9uOiBSYW5nZU9wdGlvbiwgbGkpIHtcbiAgY29uc3QgbGFiZWwgPSBjcmVhdGVFbGVtKCdsYWJlbCcsdW5kZWZpbmVkLCBsaSlcbiAgY29uc3QgaW5wdXRMQiA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgJ29wdGlvbicsIGxhYmVsKSBhcyBIVE1MSW5wdXRFbGVtZW50XG4gIGlucHV0TEIudHlwZSA9ICdudW1iZXInXG4gIGlucHV0TEIubWluID0gb3B0aW9uLm1pbi50b1N0cmluZygpXG4gIGlucHV0TEIubWF4ID0gb3B0aW9uLm1heC50b1N0cmluZygpXG4gIGlucHV0TEIudmFsdWUgPSBvcHRpb24uZGVmYXVsdExCLnRvU3RyaW5nKClcblxuICBsYWJlbC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsYCAmbGVxOyAke29wdGlvbi50aXRsZX0gJmxlcTsgYClcblxuICBjb25zdCBpbnB1dFVCID0gY3JlYXRlRWxlbSgnaW5wdXQnLCAnb3B0aW9uJywgbGFiZWwpIGFzIEhUTUxJbnB1dEVsZW1lbnRcbiAgaW5wdXRVQi50eXBlID0gJ251bWJlcidcbiAgaW5wdXRVQi5taW4gPSBvcHRpb24ubWluLnRvU3RyaW5nKClcbiAgaW5wdXRVQi5tYXggPSBvcHRpb24ubWF4LnRvU3RyaW5nKClcbiAgaW5wdXRVQi52YWx1ZSA9IG9wdGlvbi5kZWZhdWx0VUIudG9TdHJpbmcoKVxufVxuXG4vKiogRGV0ZXJtaW5lcyBpZiBhbiBvcHRpb24gaW4gT3B0aW9uc1NwZWMgaXMgYSByZWFsIG9wdGlvbiBhcyBvcHBvc2VkIHRvXG4gKiBhIGhlYWRpbmcgb3IgY29sdW1uIGJyZWFrXG4gKi9cbmZ1bmN0aW9uIGlzUmVhbE9wdGlvbihvcHRpb24gOiBPcHRpb25zU3BlY1swXSkgOiBvcHRpb24gaXMgUmVhbE9wdGlvbntcbiAgcmV0dXJuIChvcHRpb24gYXMgT3B0aW9uSSkuaWQgIT09IHVuZGVmaW5lZFxufVxuXG5jb25zdCBkZW1vU3BlYyA6IE9wdGlvbnNTcGVjID0gW1xuICB7XG4gICAgdGl0bGU6ICdEaWZmaWN1bHR5JyxcbiAgICBpZDogJ2RpZmZpY3VsdHknLFxuICAgIHR5cGU6ICdpbnQnLFxuICAgIG1pbjogMSxcbiAgICBtYXg6IDEwLFxuICAgIGRlZmF1bHQ6IDVcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVHlwZScsXG4gICAgaWQ6ICd0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ1JlY3RhbmdsZScsIGlkOiAncmVjdGFuZ2xlJyB9LFxuICAgICAgeyB0aXRsZTogJ1RyaWFuZ2xlJywgaWQ6ICd0cmlhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdTcXVvdmFsJywgaWQ6ICdzcXVvdmFsJyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiAncmVjdGFuZ2xlJ1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdBIGhlYWRpbmcnLFxuICAgIHR5cGU6ICdoZWFkaW5nJ1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdTaGFwZScsXG4gICAgaWQ6ICdzaGFwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdSZWN0YW5nbGUgc2hhcGUgdGhpbmcnLCBpZDogJ3JlY3RhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdUcmlhbmdsZSBzaGFwZSB0aGluZycsIGlkOiAndHJpYW5nbGUnIH0sXG4gICAgICB7IHRpdGxlOiAnU3F1b3ZhbCBzaGFwZSBsb25nJywgaWQ6ICdzcXVvdmFsJyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiBbJ3JlY3RhbmdsZScsICdzcXVvdmFsJ10sXG4gICAgdmVydGljYWw6IHRydWUgLy8gbGF5b3V0IHZlcnRpY2FsbHksIHJhdGhlciB0aGFuIGhvcml6b250YWxseVxuICB9LFxuICB7XG4gICAgdHlwZTogJ2NvbHVtbi1icmVhaydcbiAgfSxcbiAge1xuICAgIHR5cGU6ICdoZWFkaW5nJyxcbiAgICB0aXRsZTogJ0EgbmV3IGNvbHVtbidcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnRG8gc29tZXRoaW5nJyxcbiAgICBpZDogJ3NvbWV0aGluZycsXG4gICAgdHlwZTogJ2Jvb2wnLFxuICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgc3dhcExhYmVsOiB0cnVlIC8vIHB1dCBjb250cm9sIGJlZm9yZSBsYWJlbFxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdPcHRpb25zIGZvciByZWN0YW5nbGVzJyxcbiAgICBpZDogJ3JlY3RhbmdsZS1vcHRpb25zJyxcbiAgICB0eXBlOiAnc3Vib3B0aW9ucycsXG4gICAgb3B0aW9uc1NwZWM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdNaW5pbXVtIHgnLFxuICAgICAgICBpZDogJ21pblgnLFxuICAgICAgICB0eXBlOiAnaW50JyxcbiAgICAgICAgbWluOiAwLFxuICAgICAgICBtYXg6IDEwLFxuICAgICAgICBkZWZhdWx0OiAyXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0aXRsZTogJ01heGltdW0geCcsXG4gICAgICAgIGlkOiAnbWF4WCcsXG4gICAgICAgIHR5cGU6ICdpbnQnLFxuICAgICAgICBtaW46IDAsXG4gICAgICAgIG1heDogMTAsXG4gICAgICAgIGRlZmF1bHQ6IDRcbiAgICAgIH1cbiAgICBdXG4gIH1cbl1cblxuY29uc3QgZGVtb1RlbXBsYXRlIDogc3RyaW5nID1cblwiPGxpPnt7ZGlmZmljdWx0eS5yZW5kZXJlZH19PC9saT5cXG5cIiArICAgICAgLy8gSW5zZXJ0cyBmdWxsICdkaWZmaXVsdHknIG9wdGlvbiBhcyBiZWZvcmVcblwiPGxpPjxiPnt7dHlwZS50aXRsZX19PC9iPiBcXG5cIiArICAgICAgICAgICAgLy8ganVzdCB0aGUgdGl0bGVcblwiPGxpPnt7dHlwZS5pbnB1dH19IFxcblwiICsgICAgICAgICAgICAgICAgICAgLy8gdGhlIGlucHV0IGVsZW1lbnRcblwie3t0eXBlLnNlbGVjdE9wdGlvbnNSZW5kZXJlZEFsbH19PC9saT5cIiArICAvLyBUaGUgb3B0aW9ucywgcmVkZXJlZCB1c3VhbGx5XG5cIjxsaT48dWw+e3sjIHR5cGUuc2VsZWN0T3B0aW9uc319XCIgKyAgICAgICAvLyBJbmRpdmlkdWFsIHNlbGVjdCBvcHRpb25zLCByZW5kZXJlZFxuICBcIjxsaT4ge3tyZW5kZXJlZH19IDwvbGk+XCIgKyAgICAgICAgICAgICAgIC8vIFRoZSB1c3VhbCByZW5kZXJlZCBvcHRpb25cblwie3svIHR5cGUuc2VsZWN0T3B0aW9uc319PC91bD5cIlxuXG5jb25zdCBleGFtcGxlVGVtcGxhdGUgOiBzdHJpbmcgPSAgLy8gQW5vdGhlciBleGFtcGxlLCB3aXRoIGZld2VyIGNvbW1lbnRzXG5gPGRpdiBjbGFzcyA9IFwib3B0aW9ucy1jb2x1bW5cIj5cbiAgPHVsIGNsYXNzPVwib3B0aW9ucy1saXN0XCI+XG4gICAgPGxpPiA8Yj5Tb21lIG9wdGlvbnMgPC9iPiA8L2xpPlxuICAgIDxsaT4ge3tkaWZmaWN1bHR5LnJlbmRlcmVkfX0gPC9saT5cbiAgICA8bGkgc3R5bGU9XCJkaXNwbGF5OmJsb2NrXCI+IHt7c2ltcGxlLnRpdGxlfX0ge3tzaW1wbGUuaW5wdXR9fVxuICAgICAge3sjc2ltcGxlTWluWH19XG5gICIsImV4cG9ydCBkZWZhdWx0IGFic3RyYWN0IGNsYXNzIFF1ZXN0aW9uIHtcbiAgRE9NOiBIVE1MRWxlbWVudFxuICBhbnN3ZXJlZDogYm9vbGVhblxuXG4gIGNvbnN0cnVjdG9yICgpIHtcbiAgICB0aGlzLkRPTSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgdGhpcy5ET00uY2xhc3NOYW1lID0gJ3F1ZXN0aW9uLWRpdidcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHtcbiAgICByZXR1cm4gdGhpcy5ET01cbiAgfVxuXG4gIGFic3RyYWN0IHJlbmRlciAoKSA6IHZvaWRcblxuICBzaG93QW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5hbnN3ZXJlZCA9IHRydWVcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxuXG4gIHRvZ2dsZUFuc3dlciAoKSA6IHZvaWQge1xuICAgIGlmICh0aGlzLmFuc3dlcmVkKSB7XG4gICAgICB0aGlzLmhpZGVBbnN3ZXIoKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNob3dBbnN3ZXIoKVxuICAgIH1cbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyAvLyBTaG91bGQgYmUgb3ZlcnJpZGRlblxuICAgIHJldHVybiAnJ1xuICB9XG59XG4iLCIvKiBnbG9iYWwga2F0ZXggKi9cbmltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbi9RdWVzdGlvbidcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGV4dFEgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIoKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiA1LFxuICAgICAgbGFiZWw6ICdhJ1xuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgLy8gc3RvcmUgdGhlIGxhYmVsIGZvciBmdXR1cmUgcmVuZGVyaW5nXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyBEdW1teSBxdWVzdGlvbiBnZW5lcmF0aW5nIC0gc3ViY2xhc3NlcyBkbyBzb21ldGhpbmcgc3Vic3RhbnRpYWwgaGVyZVxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICcyKzInXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICc9NSdcblxuICAgIC8vIE1ha2UgdGhlIERPTSB0cmVlIGZvciB0aGUgZWxlbWVudFxuICAgIHRoaXMucXVlc3Rpb25wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpXG4gICAgdGhpcy5hbnN3ZXJwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpXG5cbiAgICB0aGlzLnF1ZXN0aW9ucC5jbGFzc05hbWUgPSAncXVlc3Rpb24nXG4gICAgdGhpcy5hbnN3ZXJwLmNsYXNzTmFtZSA9ICdhbnN3ZXInXG4gICAgdGhpcy5hbnN3ZXJwLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpXG5cbiAgICB0aGlzLkRPTS5hcHBlbmRDaGlsZCh0aGlzLnF1ZXN0aW9ucClcbiAgICB0aGlzLkRPTS5hcHBlbmRDaGlsZCh0aGlzLmFuc3dlcnApXG5cbiAgICAvLyBzdWJjbGFzc2VzIHNob3VsZCBnZW5lcmF0ZSBxdWVzdGlvbkxhVGVYIGFuZCBhbnN3ZXJMYVRlWCxcbiAgICAvLyAucmVuZGVyKCkgd2lsbCBiZSBjYWxsZWQgYnkgdXNlclxuICB9XG5cbiAgcmVuZGVyICgpIHtcbiAgICAvLyB1cGRhdGUgdGhlIERPTSBpdGVtIHdpdGggcXVlc3Rpb25MYVRlWCBhbmQgYW5zd2VyTGFUZVhcbiAgICB2YXIgcW51bSA9IHRoaXMubGFiZWxcbiAgICAgID8gJ1xcXFx0ZXh0eycgKyB0aGlzLmxhYmVsICsgJykgfSdcbiAgICAgIDogJydcbiAgICBrYXRleC5yZW5kZXIocW51bSArIHRoaXMucXVlc3Rpb25MYVRlWCwgdGhpcy5xdWVzdGlvbnAsIHsgZGlzcGxheU1vZGU6IHRydWUsIHN0cmljdDogJ2lnbm9yZScgfSlcbiAgICBrYXRleC5yZW5kZXIodGhpcy5hbnN3ZXJMYVRlWCwgdGhpcy5hbnN3ZXJwLCB7IGRpc3BsYXlNb2RlOiB0cnVlIH0pXG4gIH1cblxuICBnZXRET00gKCkge1xuICAgIHJldHVybiB0aGlzLkRPTVxuICB9XG5cbiAgc2hvd0Fuc3dlciAoKSB7XG4gICAgdGhpcy5hbnN3ZXJwLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IHRydWVcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkge1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICB9XG59XG4iLCJpbXBvcnQgeyByYW5kQmV0d2VlbiwgZ2NkIH0gZnJvbSAnVXRpbGl0aWVzJ1xuaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuXG4vKiBNYWluIHF1ZXN0aW9uIGNsYXNzLiBUaGlzIHdpbGwgYmUgc3B1biBvZmYgaW50byBkaWZmZXJlbnQgZmlsZSBhbmQgZ2VuZXJhbGlzZWQgKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFsZ2VicmFpY0ZyYWN0aW9uUSBleHRlbmRzIFRleHRRIHtcbiAgLy8gJ2V4dGVuZHMnIFF1ZXN0aW9uLCBidXQgbm90aGluZyB0byBhY3R1YWxseSBleHRlbmRcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiAyXG4gICAgfVxuXG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcbiAgICBjb25zdCBkaWZmaWN1bHR5ID0gc2V0dGluZ3MuZGlmZmljdWx0eVxuXG4gICAgLy8gbG9naWMgZm9yIGdlbmVyYXRpbmcgdGhlIHF1ZXN0aW9uIGFuZCBhbnN3ZXIgc3RhcnRzIGhlcmVcbiAgICB2YXIgYSwgYiwgYywgZCwgZSwgZiAvLyAoYXgrYikoZXgrZikvKGN4K2QpKGV4K2YpID0gKHB4XjIrcXgrcikvKHR4XjIrdXgrdilcbiAgICB2YXIgcCwgcSwgciwgdCwgdSwgdlxuICAgIHZhciBtaW5Db2VmZiwgbWF4Q29lZmYsIG1pbkNvbnN0LCBtYXhDb25zdFxuXG4gICAgc3dpdGNoIChkaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIG1pbkNvZWZmID0gMTsgbWF4Q29lZmYgPSAxOyBtaW5Db25zdCA9IDE7IG1heENvbnN0ID0gNlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMTsgbWluQ29uc3QgPSAtNjsgbWF4Q29uc3QgPSA2XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDM6XG4gICAgICAgIG1pbkNvZWZmID0gMTsgbWF4Q29lZmYgPSAzOyBtaW5Db25zdCA9IC01OyBtYXhDb25zdCA9IDVcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNDpcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIG1pbkNvZWZmID0gLTM7IG1heENvZWZmID0gMzsgbWluQ29uc3QgPSAtNTsgbWF4Q29uc3QgPSA1XG4gICAgICAgIGJyZWFrXG4gICAgfVxuXG4gICAgLy8gUGljayBzb21lIGNvZWZmaWNpZW50c1xuICAgIHdoaWxlIChcbiAgICAgICgoIWEgJiYgIWIpIHx8ICghYyAmJiAhZCkgfHwgKCFlICYmICFmKSkgfHwgLy8gcmV0cnkgaWYgYW55IGV4cHJlc3Npb24gaXMgMFxuICAgICAgY2FuU2ltcGxpZnkoYSwgYiwgYywgZCkgLy8gcmV0cnkgaWYgdGhlcmUncyBhIGNvbW1vbiBudW1lcmljYWwgZmFjdG9yXG4gICAgKSB7XG4gICAgICBhID0gcmFuZEJldHdlZW4obWluQ29lZmYsIG1heENvZWZmKVxuICAgICAgYyA9IHJhbmRCZXR3ZWVuKG1pbkNvZWZmLCBtYXhDb2VmZilcbiAgICAgIGUgPSByYW5kQmV0d2VlbihtaW5Db2VmZiwgbWF4Q29lZmYpXG4gICAgICBiID0gcmFuZEJldHdlZW4obWluQ29uc3QsIG1heENvbnN0KVxuICAgICAgZCA9IHJhbmRCZXR3ZWVuKG1pbkNvbnN0LCBtYXhDb25zdClcbiAgICAgIGYgPSByYW5kQmV0d2VlbihtaW5Db25zdCwgbWF4Q29uc3QpXG4gICAgfVxuXG4gICAgLy8gaWYgdGhlIGRlbm9taW5hdG9yIGlzIG5lZ2F0aXZlIGZvciBlYWNoIHRlcm0sIHRoZW4gbWFrZSB0aGUgbnVtZXJhdG9yIG5lZ2F0aXZlIGluc3RlYWRcbiAgICBpZiAoYyA8PSAwICYmIGQgPD0gMCkge1xuICAgICAgYyA9IC1jXG4gICAgICBkID0gLWRcbiAgICAgIGEgPSAtYVxuICAgICAgYiA9IC1iXG4gICAgfVxuXG4gICAgcCA9IGEgKiBlOyBxID0gYSAqIGYgKyBiICogZTsgciA9IGIgKiBmXG4gICAgdCA9IGMgKiBlOyB1ID0gYyAqIGYgKyBkICogZTsgdiA9IGQgKiBmXG5cbiAgICAvLyBOb3cgcHV0IHRoZSBxdWVzdGlvbiBhbmQgYW5zd2VyIGluIGEgbmljZSBmb3JtYXQgaW50byBxdWVzdGlvbkxhVGVYIGFuZCBhbnN3ZXJMYVRlWFxuICAgIGNvbnN0IHF1ZXN0aW9uID0gYFxcXFxmcmFjeyR7cXVhZHJhdGljU3RyaW5nKHAsIHEsIHIpfX17JHtxdWFkcmF0aWNTdHJpbmcodCwgdSwgdil9fWBcbiAgICBpZiAoc2V0dGluZ3MudXNlQ29tbWFuZFdvcmQpIHtcbiAgICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICdcXFxcdGV4dHtTaW1wbGlmeX0gJyArIHF1ZXN0aW9uXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9IHF1ZXN0aW9uXG4gICAgfVxuICAgIHRoaXMuYW5zd2VyTGFUZVggPVxuICAgICAgKGMgPT09IDAgJiYgZCA9PT0gMSkgPyBxdWFkcmF0aWNTdHJpbmcoMCwgYSwgYilcbiAgICAgICAgOiBgXFxcXGZyYWN7JHtxdWFkcmF0aWNTdHJpbmcoMCwgYSwgYil9fXske3F1YWRyYXRpY1N0cmluZygwLCBjLCBkKX19YFxuXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICc9ICcgKyB0aGlzLmFuc3dlckxhVGVYXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ1NpbXBsaWZ5J1xuICB9XG59XG5cbi8qIFV0aWxpdHkgZnVuY3Rpb25zXG4gKiBBdCBzb21lIHBvaW50LCBJJ2xsIG1vdmUgc29tZSBvZiB0aGVzZSBpbnRvIGEgZ2VuZXJhbCB1dGlsaXRpZXMgbW9kdWxlXG4gKiBidXQgdGhpcyB3aWxsIGRvIGZvciBub3dcbiAqL1xuXG4vLyBUT0RPIEkgaGF2ZSBxdWFkcmF0aWNTdHJpbmcgaGVyZSBhbmQgYWxzbyBhIFBvbHlub21pYWwgY2xhc3MuIFdoYXQgaXMgYmVpbmcgcmVwbGljYXRlZD/Cp1xuZnVuY3Rpb24gcXVhZHJhdGljU3RyaW5nIChhLCBiLCBjKSB7XG4gIGlmIChhID09PSAwICYmIGIgPT09IDAgJiYgYyA9PT0gMCkgcmV0dXJuICcwJ1xuXG4gIHZhciB4MnN0cmluZyA9XG4gICAgYSA9PT0gMCA/ICcnXG4gICAgICA6IGEgPT09IDEgPyAneF4yJ1xuICAgICAgICA6IGEgPT09IC0xID8gJy14XjInXG4gICAgICAgICAgOiBhICsgJ3heMidcblxuICB2YXIgeHNpZ24gPVxuICAgIGIgPCAwID8gJy0nXG4gICAgICA6IChhID09PSAwIHx8IGIgPT09IDApID8gJydcbiAgICAgICAgOiAnKydcblxuICB2YXIgeHN0cmluZyA9XG4gICAgYiA9PT0gMCA/ICcnXG4gICAgICA6IChiID09PSAxIHx8IGIgPT09IC0xKSA/ICd4J1xuICAgICAgICA6IE1hdGguYWJzKGIpICsgJ3gnXG5cbiAgdmFyIGNvbnN0c2lnbiA9XG4gICAgYyA8IDAgPyAnLSdcbiAgICAgIDogKChhID09PSAwICYmIGIgPT09IDApIHx8IGMgPT09IDApID8gJydcbiAgICAgICAgOiAnKydcblxuICB2YXIgY29uc3RzdHJpbmcgPVxuICAgIGMgPT09IDAgPyAnJyA6IE1hdGguYWJzKGMpXG5cbiAgcmV0dXJuIHgyc3RyaW5nICsgeHNpZ24gKyB4c3RyaW5nICsgY29uc3RzaWduICsgY29uc3RzdHJpbmdcbn1cblxuZnVuY3Rpb24gY2FuU2ltcGxpZnkgKGExLCBiMSwgYTIsIGIyKSB7XG4gIC8vIGNhbiAoYTF4K2IxKS8oYTJ4K2IyKSBiZSBzaW1wbGlmaWVkP1xuICAvL1xuICAvLyBGaXJzdCwgdGFrZSBvdXQgZ2NkLCBhbmQgd3JpdGUgYXMgYzEoYTF4K2IxKSBldGNcblxuICB2YXIgYzEgPSBnY2QoYTEsIGIxKVxuICBhMSA9IGExIC8gYzFcbiAgYjEgPSBiMSAvIGMxXG5cbiAgdmFyIGMyID0gZ2NkKGEyLCBiMilcbiAgYTIgPSBhMiAvIGMyXG4gIGIyID0gYjIgLyBjMlxuXG4gIHZhciByZXN1bHQgPSBmYWxzZVxuXG4gIGlmIChnY2QoYzEsIGMyKSA+IDEgfHwgKGExID09PSBhMiAmJiBiMSA9PT0gYjIpKSB7XG4gICAgcmVzdWx0ID0gdHJ1ZVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdFxufVxuIiwiaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEludGVnZXJBZGRRIGV4dGVuZHMgVGV4dFEge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDUsXG4gICAgICBsYWJlbDogJ2EnXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICB0aGlzLmxhYmVsID0gc2V0dGluZ3MubGFiZWxcblxuICAgIC8vIFRoaXMgaXMganVzdCBhIGRlbW8gcXVlc3Rpb24gdHlwZSBmb3Igbm93LCBzbyBub3QgcHJvY2Vzc2luZyBkaWZmaWN1bHR5XG4gICAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKDEwLCAxMDAwKVxuICAgIGNvbnN0IGIgPSByYW5kQmV0d2VlbigxMCwgMTAwMClcbiAgICBjb25zdCBzdW0gPSBhICsgYlxuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gYSArICcgKyAnICsgYlxuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPSAnICsgc3VtXG5cbiAgICB0aGlzLnJlbmRlcigpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ0V2YWx1YXRlJ1xuICB9XG59XG4iLCIvKipcbiAqIENsYXNzIHJlcHJlc2VudGluZyBhIHBvaW50LCBhbmQgc3RhdGljIHV0aXRsaXR5IG1ldGhvZHNcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUG9pbnQge1xuICBjb25zdHJ1Y3RvciAoeCwgeSkge1xuICAgIHRoaXMueCA9IHhcbiAgICB0aGlzLnkgPSB5XG4gIH1cblxuICByb3RhdGUgKGFuZ2xlKSB7XG4gICAgdmFyIG5ld3gsIG5ld3lcbiAgICBuZXd4ID0gTWF0aC5jb3MoYW5nbGUpICogdGhpcy54IC0gTWF0aC5zaW4oYW5nbGUpICogdGhpcy55XG4gICAgbmV3eSA9IE1hdGguc2luKGFuZ2xlKSAqIHRoaXMueCArIE1hdGguY29zKGFuZ2xlKSAqIHRoaXMueVxuICAgIHRoaXMueCA9IG5ld3hcbiAgICB0aGlzLnkgPSBuZXd5XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHNjYWxlIChzZikge1xuICAgIHRoaXMueCA9IHRoaXMueCAqIHNmXG4gICAgdGhpcy55ID0gdGhpcy55ICogc2ZcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgdHJhbnNsYXRlICh4LCB5KSB7XG4gICAgdGhpcy54ICs9IHhcbiAgICB0aGlzLnkgKz0geVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBjbG9uZSAoKSB7XG4gICAgcmV0dXJuIG5ldyBQb2ludCh0aGlzLngsIHRoaXMueSlcbiAgfVxuXG4gIGVxdWFscyAodGhhdCkge1xuICAgIHJldHVybiAodGhpcy54ID09PSB0aGF0LnggJiYgdGhpcy55ID09PSB0aGF0LnkpXG4gIH1cblxuICBtb3ZlVG93YXJkICh0aGF0LCBkKSB7XG4gICAgLy8gbW92ZXMgW2RdIGluIHRoZSBkaXJlY3Rpb24gb2YgW3RoYXQ6OlBvaW50XVxuICAgIGNvbnN0IHV2ZWMgPSBQb2ludC51bml0VmVjdG9yKHRoaXMsIHRoYXQpXG4gICAgdGhpcy50cmFuc2xhdGUodXZlYy54ICogZCwgdXZlYy55ICogZClcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3RhdGljIGZyb21Qb2xhciAociwgdGhldGEpIHtcbiAgICByZXR1cm4gbmV3IFBvaW50KFxuICAgICAgTWF0aC5jb3ModGhldGEpICogcixcbiAgICAgIE1hdGguc2luKHRoZXRhKSAqIHJcbiAgICApXG4gIH1cblxuICBzdGF0aWMgZnJvbVBvbGFyRGVnIChyLCB0aGV0YSkge1xuICAgIHRoZXRhID0gdGhldGEgKiBNYXRoLlBJIC8gMTgwXG4gICAgcmV0dXJuIFBvaW50LmZyb21Qb2xhcihyLCB0aGV0YSlcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBtZWFuIG9mXG4gICAqIEBwYXJhbSAgey4uLlBvaW50fSBwb2ludHMgVGhlIHBvaW50cyB0byBmaW5kIHRoZSBtZWFuIG9mXG4gICAqL1xuICBzdGF0aWMgbWVhbiAoLi4ucG9pbnRzKSB7XG4gICAgY29uc3Qgc3VteCA9IHBvaW50cy5tYXAocCA9PiBwLngpLnJlZHVjZSgoeCwgeSkgPT4geCArIHkpXG4gICAgY29uc3Qgc3VteSA9IHBvaW50cy5tYXAocCA9PiBwLnkpLnJlZHVjZSgoeCwgeSkgPT4geCArIHkpXG4gICAgY29uc3QgbiA9IHBvaW50cy5sZW5ndGhcblxuICAgIHJldHVybiBuZXcgUG9pbnQoc3VteCAvIG4sIHN1bXkgLyBuKVxuICB9XG5cbiAgc3RhdGljIGluQ2VudGVyIChBLCBCLCBDKSB7XG4gICAgLy8gaW5jZW50ZXIgb2YgYSB0cmlhbmdsZSBnaXZlbiB2ZXJ0ZXggcG9pbnRzIEEsIEIgYW5kIENcbiAgICBjb25zdCBhID0gUG9pbnQuZGlzdGFuY2UoQiwgQylcbiAgICBjb25zdCBiID0gUG9pbnQuZGlzdGFuY2UoQSwgQylcbiAgICBjb25zdCBjID0gUG9pbnQuZGlzdGFuY2UoQSwgQilcblxuICAgIGNvbnN0IHBlcmltZXRlciA9IGEgKyBiICsgY1xuICAgIGNvbnN0IHN1bXggPSBhICogQS54ICsgYiAqIEIueCArIGMgKiBDLnhcbiAgICBjb25zdCBzdW15ID0gYSAqIEEueSArIGIgKiBCLnkgKyBjICogQy55XG5cbiAgICByZXR1cm4gbmV3IFBvaW50KHN1bXggLyBwZXJpbWV0ZXIsIHN1bXkgLyBwZXJpbWV0ZXIpXG4gIH1cblxuICBzdGF0aWMgbWluIChwb2ludHMpIHtcbiAgICBjb25zdCBtaW54ID0gcG9pbnRzLnJlZHVjZSgoeCwgcCkgPT4gTWF0aC5taW4oeCwgcC54KSwgSW5maW5pdHkpXG4gICAgY29uc3QgbWlueSA9IHBvaW50cy5yZWR1Y2UoKHksIHApID0+IE1hdGgubWluKHksIHAueSksIEluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQobWlueCwgbWlueSlcbiAgfVxuXG4gIHN0YXRpYyBtYXggKHBvaW50cykge1xuICAgIGNvbnN0IG1heHggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1heCh4LCBwLngpLCAtSW5maW5pdHkpXG4gICAgY29uc3QgbWF4eSA9IHBvaW50cy5yZWR1Y2UoKHksIHApID0+IE1hdGgubWF4KHksIHAueSksIC1JbmZpbml0eSlcbiAgICByZXR1cm4gbmV3IFBvaW50KG1heHgsIG1heHkpXG4gIH1cblxuICBzdGF0aWMgY2VudGVyIChwb2ludHMpIHtcbiAgICBjb25zdCBtaW54ID0gcG9pbnRzLnJlZHVjZSgoeCwgcCkgPT4gTWF0aC5taW4oeCwgcC54KSwgSW5maW5pdHkpXG4gICAgY29uc3QgbWlueSA9IHBvaW50cy5yZWR1Y2UoKHksIHApID0+IE1hdGgubWluKHksIHAueSksIEluZmluaXR5KVxuICAgIGNvbnN0IG1heHggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1heCh4LCBwLngpLCAtSW5maW5pdHkpXG4gICAgY29uc3QgbWF4eSA9IHBvaW50cy5yZWR1Y2UoKHksIHApID0+IE1hdGgubWF4KHksIHAueSksIC1JbmZpbml0eSlcbiAgICByZXR1cm4gbmV3IFBvaW50KChtYXh4ICsgbWlueCkgLyAyLCAobWF4eSArIG1pbnkpIC8gMilcbiAgfVxuXG4gIHN0YXRpYyB1bml0VmVjdG9yIChwMSwgcDIpIHtcbiAgICAvLyByZXR1cm5zIGEgdW5pdCB2ZWN0b3IgaW4gdGhlIGRpcmVjdGlvbiBvZiBwMSB0byBwMlxuICAgIC8vIGluIHRoZSBmb3JtIHt4Oi4uLiwgeTouLi59XG4gICAgY29uc3QgdmVjeCA9IHAyLnggLSBwMS54XG4gICAgY29uc3QgdmVjeSA9IHAyLnkgLSBwMS55XG4gICAgY29uc3QgbGVuZ3RoID0gTWF0aC5oeXBvdCh2ZWN4LCB2ZWN5KVxuICAgIHJldHVybiB7IHg6IHZlY3ggLyBsZW5ndGgsIHk6IHZlY3kgLyBsZW5ndGggfVxuICB9XG5cbiAgc3RhdGljIGRpc3RhbmNlIChwMSwgcDIpIHtcbiAgICByZXR1cm4gTWF0aC5oeXBvdChwMS54IC0gcDIueCwgcDEueSAtIHAyLnkpXG4gIH1cblxuICAvKipcbiAgICogQ2FsY3VsYXRlIHRoZSBhbmdsZSBpbiByYWRpYW5zIGZyb20gaG9yaXpvbnRhbCB0byBwMiwgd2l0aCBjZW50cmUgcDEuXG4gICAqIEUuZy4gYW5nbGVGcm9tKCAoMCwwKSwgKDEsMSkgKSA9IHBpLzJcbiAgICogQW5nbGUgaXMgZnJvbSAwIHRvIDJwaVxuICAgKiBAcGFyYW0ge1BvaW50fSBwMSBUaGUgc3RhcnQgcG9pbnRcbiAgICogQHBhcmFtIHtQb2ludH0gcDIgVGhlIGVuZCBwb2ludFxuICAgKiBAcmV0dXJucyB7bnVtYmVyfSBUaGUgYW5nbGUgaW4gcmFkaWFuc1xuICAgKi9cbiAgc3RhdGljIGFuZ2xlRnJvbSAocDEsIHAyKSB7XG4gICAgY29uc3QgYW5nbGUgPSBNYXRoLmF0YW4yKHAyLnkgLSBwMS55LCBwMi54IC0gcDEueClcbiAgICByZXR1cm4gYW5nbGUgPj0gMCA/IGFuZ2xlIDogMiAqIE1hdGguUEkgKyBhbmdsZVxuICB9XG5cbiAgc3RhdGljIHJlcGVsIChwMSwgcDIsIHRyaWdnZXIsIGRpc3RhbmNlKSB7XG4gICAgLy8gV2hlbiBwMSBhbmQgcDIgYXJlIGxlc3MgdGhhbiBbdHJpZ2dlcl0gYXBhcnQsIHRoZXkgYXJlXG4gICAgLy8gbW92ZWQgc28gdGhhdCB0aGV5IGFyZSBbZGlzdGFuY2VdIGFwYXJ0XG4gICAgY29uc3QgZCA9IE1hdGguaHlwb3QocDEueCAtIHAyLngsIHAxLnkgLSBwMi55KVxuICAgIGlmIChkID49IHRyaWdnZXIpIHJldHVybiBmYWxzZVxuXG4gICAgY29uc3QgciA9IChkaXN0YW5jZSAtIGQpIC8gMiAvLyBkaXN0YW5jZSB0aGV5IG5lZWQgbW92aW5nXG4gICAgcDEubW92ZVRvd2FyZChwMiwgLXIpXG4gICAgcDIubW92ZVRvd2FyZChwMSwgLXIpXG4gICAgcmV0dXJuIHRydWVcbiAgfVxufVxuIiwiaW1wb3J0IFF1ZXN0aW9uIGZyb20gJ1F1ZXN0aW9uL1F1ZXN0aW9uJ1xuaW1wb3J0IHsgY3JlYXRlRWxlbSB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuL1ZpZXdPcHRpb25zJ1xuZGVjbGFyZSBjb25zdCBrYXRleCA6IHtyZW5kZXIgOiAoc3RyaW5nOiBzdHJpbmcsIGVsZW1lbnQ6IEhUTUxFbGVtZW50KSA9PiB2b2lkfVxuXG4vKiBHcmFwaGljUURhdGEgY2FuIGFsbCBiZSB2ZXJ5IGRpZmZlcmVudCwgc28gaW50ZXJmYWNlIGlzIGVtcHR5XG4gKiBIZXJlIGZvciBjb2RlIGRvY3VtZW50YXRpb24gcmF0aGVyIHRoYW4gdHlwZSBzYWZldHkgKHdoaWNoIGlzbid0IHByb3ZpZGVkKSAqL1xuXG4vKiBlc2xpbnQtZGlzYWJsZSAqL1xuZXhwb3J0IGludGVyZmFjZSBHcmFwaGljUURhdGEge1xufVxuLyogZXNsaW50LWVuYWJsZSAqL1xuXG4vKiBOb3Qgd29ydGggdGhlIGhhc3NseSB0cnlpbmcgdG8gZ2V0IGludGVyZmFjZXMgZm9yIHN0YXRpYyBtZXRob2RzXG4gKlxuICogZXhwb3J0IGludGVyZmFjZSBHcmFwaGljUURhdGFDb25zdHJ1Y3RvciB7XG4gKiAgIG5ldyguLi5hcmdzIDogdW5rbm93bltdKTogR3JhcGhpY1FEYXRhXG4gKiAgIHJhbmRvbShvcHRpb25zOiB1bmtub3duKSA6IEdyYXBoaWNRRGF0YVxuICogfVxuKi9cblxuZXhwb3J0IGludGVyZmFjZSBMYWJlbCB7XG4gIHBvczogUG9pbnQsXG4gIHRleHRxOiBzdHJpbmcsXG4gIHRleHRhOiBzdHJpbmcsXG4gIHN0eWxlcTogc3RyaW5nLFxuICBzdHlsZWE6IHN0cmluZyxcbiAgdGV4dDogc3RyaW5nLFxuICBzdHlsZTogc3RyaW5nXG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBHcmFwaGljUVZpZXcge1xuICBET006IEhUTUxFbGVtZW50XG4gIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnRcbiAgd2lkdGg6IG51bWJlclxuICBoZWlnaHQ6IG51bWJlclxuICBkYXRhOiBHcmFwaGljUURhdGFcbiAgbGFiZWxzOiBMYWJlbFtdXG5cbiAgY29uc3RydWN0b3IgKGRhdGEgOiBHcmFwaGljUURhdGEsIHZpZXdPcHRpb25zIDogVmlld09wdGlvbnMpIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IFZpZXdPcHRpb25zID0ge1xuICAgICAgd2lkdGg6IDI1MCxcbiAgICAgIGhlaWdodDogMjUwXG4gICAgfVxuXG4gICAgdmlld09wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgdmlld09wdGlvbnMpXG5cbiAgICB0aGlzLndpZHRoID0gdmlld09wdGlvbnMud2lkdGhcbiAgICB0aGlzLmhlaWdodCA9IHZpZXdPcHRpb25zLmhlaWdodCAvLyBvbmx5IHRoaW5ncyBJIG5lZWQgZnJvbSB0aGUgb3B0aW9ucywgZ2VuZXJhbGx5P1xuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICAvLyB0aGlzLnJvdGF0aW9uP1xuXG4gICAgdGhpcy5sYWJlbHMgPSBbXSAvLyBsYWJlbHMgb24gZGlhZ3JhbVxuXG4gICAgLy8gRE9NIGVsZW1lbnRzXG4gICAgdGhpcy5ET00gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tZGl2JylcbiAgICB0aGlzLmNhbnZhcyA9IGNyZWF0ZUVsZW0oJ2NhbnZhcycsICdxdWVzdGlvbi1jYW52YXMnLCB0aGlzLkRPTSkgYXMgSFRNTENhbnZhc0VsZW1lbnRcbiAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMud2lkdGhcbiAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodFxuICB9XG5cbiAgZ2V0RE9NICgpIDogSFRNTEVsZW1lbnQge1xuICAgIHJldHVybiB0aGlzLkRPTVxuICB9XG5cbiAgYWJzdHJhY3QgcmVuZGVyICgpIDogdm9pZFxuXG4gIHJlbmRlckxhYmVscyAobnVkZ2U/IDogYm9vbGVhbikgOiB2b2lkIHtcbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLkRPTVxuXG4gICAgLy8gcmVtb3ZlIGFueSBleGlzdGluZyBsYWJlbHNcbiAgICBjb25zdCBvbGRMYWJlbHMgPSBjb250YWluZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnbGFiZWwnKVxuICAgIHdoaWxlIChvbGRMYWJlbHMubGVuZ3RoID4gMCkge1xuICAgICAgb2xkTGFiZWxzWzBdLnJlbW92ZSgpXG4gICAgfVxuXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICAgIGNvbnN0IGlubmVybGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgICAgbGFiZWwuY2xhc3NMaXN0LmFkZCgnbGFiZWwnKVxuICAgICAgbGFiZWwuY2xhc3NOYW1lICs9ICcgJyArIGwuc3R5bGUgLy8gdXNpbmcgY2xhc3NOYW1lIG92ZXIgY2xhc3NMaXN0IHNpbmNlIGwuc3R5bGUgaXMgc3BhY2UtZGVsaW1pdGVkIGxpc3Qgb2YgY2xhc3Nlc1xuICAgICAgbGFiZWwuc3R5bGUubGVmdCA9IGwucG9zLnggKyAncHgnXG4gICAgICBsYWJlbC5zdHlsZS50b3AgPSBsLnBvcy55ICsgJ3B4J1xuXG4gICAgICBrYXRleC5yZW5kZXIobC50ZXh0LCBpbm5lcmxhYmVsKVxuICAgICAgbGFiZWwuYXBwZW5kQ2hpbGQoaW5uZXJsYWJlbClcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChsYWJlbClcblxuICAgICAgLy8gcmVtb3ZlIHNwYWNlIGlmIHRoZSBpbm5lciBsYWJlbCBpcyB0b28gYmlnXG4gICAgICBpZiAoaW5uZXJsYWJlbC5vZmZzZXRXaWR0aCAvIGlubmVybGFiZWwub2Zmc2V0SGVpZ2h0ID4gMikge1xuICAgICAgICBjb25zb2xlLmxvZyhgcmVtb3ZlZCBzcGFjZSBpbiAke2wudGV4dH1gKVxuICAgICAgICBjb25zdCBuZXdsYWJlbHRleHQgPSBsLnRleHQucmVwbGFjZSgvXFwrLywgJ1xcXFwhK1xcXFwhJykucmVwbGFjZSgvLS8sICdcXFxcIS1cXFxcIScpXG4gICAgICAgIGthdGV4LnJlbmRlcihuZXdsYWJlbHRleHQsIGlubmVybGFiZWwpXG4gICAgICB9XG5cbiAgICAgIC8vIEkgZG9uJ3QgdW5kZXJzdGFuZCB0aGlzIGFkanVzdG1lbnQuIEkgdGhpbmsgaXQgbWlnaHQgYmUgbmVlZGVkIGluIGFyaXRobWFnb25zLCBidXQgaXQgbWFrZXNcbiAgICAgIC8vIG90aGVycyBnbyBmdW5ueS5cblxuICAgICAgaWYgKG51ZGdlKSB7XG4gICAgICAgIGNvbnN0IGx3aWR0aCA9IGxhYmVsLm9mZnNldFdpZHRoXG4gICAgICAgIGlmIChsLnBvcy54IDwgdGhpcy5jYW52YXMud2lkdGggLyAyIC0gNSAmJiBsLnBvcy54ICsgbHdpZHRoIC8gMiA+IHRoaXMuY2FudmFzLndpZHRoIC8gMikge1xuICAgICAgICAgIGxhYmVsLnN0eWxlLmxlZnQgPSAodGhpcy5jYW52YXMud2lkdGggLyAyIC0gbHdpZHRoIC0gMykgKyAncHgnXG4gICAgICAgICAgY29uc29sZS5sb2coYG51ZGdlZCAnJHtsLnRleHR9J2ApXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGwucG9zLnggPiB0aGlzLmNhbnZhcy53aWR0aCAvIDIgKyA1ICYmIGwucG9zLnggLSBsd2lkdGggLyAyIDwgdGhpcy5jYW52YXMud2lkdGggLyAyKSB7XG4gICAgICAgICAgbGFiZWwuc3R5bGUubGVmdCA9ICh0aGlzLmNhbnZhcy53aWR0aCAvIDIgKyAzKSArICdweCdcbiAgICAgICAgICBjb25zb2xlLmxvZyhgbnVkZ2VkICcke2wudGV4dH0nYClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBzaG93QW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dGFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlYVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoZmFsc2UpXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoZmFsc2UpXG4gIH1cblxuICAvLyBQb2ludCB0cmFuZm9ybWF0aW9ucyBvZiBhbGwgcG9pbnRzXG5cbiAgZ2V0IGFsbHBvaW50cyAoKSA6IFBvaW50W10ge1xuICAgIHJldHVybiBbXVxuICB9XG5cbiAgc2NhbGUgKHNmIDogbnVtYmVyKSA6IHZvaWQge1xuICAgIHRoaXMuYWxscG9pbnRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHAuc2NhbGUoc2YpXG4gICAgfSlcbiAgfVxuXG4gIHJvdGF0ZSAoYW5nbGUgOiBudW1iZXIpIDogbnVtYmVyIHtcbiAgICB0aGlzLmFsbHBvaW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICBwLnJvdGF0ZShhbmdsZSlcbiAgICB9KVxuICAgIHJldHVybiBhbmdsZVxuICB9XG5cbiAgdHJhbnNsYXRlICh4IDogbnVtYmVyLCB5IDogbnVtYmVyKSA6IHZvaWQge1xuICAgIHRoaXMuYWxscG9pbnRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHAudHJhbnNsYXRlKHgsIHkpXG4gICAgfSlcbiAgfVxuXG4gIHJhbmRvbVJvdGF0ZSAoKSA6IG51bWJlciB7XG4gICAgY29uc3QgYW5nbGUgPSAyICogTWF0aC5QSSAqIE1hdGgucmFuZG9tKClcbiAgICB0aGlzLnJvdGF0ZShhbmdsZSlcbiAgICByZXR1cm4gYW5nbGVcbiAgfVxuXG4gIC8qKlxuICAgKiBTY2FsZXMgYWxsIHRoZSBwb2ludHMgdG8gd2l0aGluIGEgZ2l2ZW4gd2lkdGggYW5kIGhlaWdodCwgY2VudGVyaW5nIHRoZSByZXN1bHQuIFJldHVybnMgdGhlIHNjYWxlIGZhY3RvclxuICAgKiBAcGFyYW0gd2lkdGggVGhlIHdpZHRoIG9mIHRoZSBib3VuZGluZyByZWN0YW5nbGUgdG8gc2NhbGUgdG9cbiAgICogQHBhcmFtIGhlaWdodCBUaGUgaGVpZ2h0IG9mIHRoZSBib3VuZGluZyByZWN0YW5nbGUgdG8gc2NhbGUgdG9cbiAgICogQHBhcmFtIG1hcmdpbiBNYXJnaW4gdG8gbGVhdmUgb3V0c2lkZSB0aGUgcmVjdGFuZ2xlXG4gICAqIEByZXR1cm5zXG4gICAqL1xuICBzY2FsZVRvRml0ICh3aWR0aCA6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIG1hcmdpbiA6IG51bWJlcikgOiBudW1iZXIge1xuICAgIGxldCB0b3BMZWZ0IDogUG9pbnQgPSBQb2ludC5taW4odGhpcy5hbGxwb2ludHMpXG4gICAgbGV0IGJvdHRvbVJpZ2h0IDogUG9pbnQgPSBQb2ludC5tYXgodGhpcy5hbGxwb2ludHMpXG4gICAgY29uc3QgdG90YWxXaWR0aCA6IG51bWJlciA9IGJvdHRvbVJpZ2h0LnggLSB0b3BMZWZ0LnhcbiAgICBjb25zdCB0b3RhbEhlaWdodCA6IG51bWJlciA9IGJvdHRvbVJpZ2h0LnkgLSB0b3BMZWZ0LnlcbiAgICBjb25zdCBzZiA9IE1hdGgubWluKCh3aWR0aCAtIG1hcmdpbikgLyB0b3RhbFdpZHRoLCAoaGVpZ2h0IC0gbWFyZ2luKSAvIHRvdGFsSGVpZ2h0KVxuICAgIHRoaXMuc2NhbGUoc2YpXG5cbiAgICAvLyBjZW50cmVcbiAgICB0b3BMZWZ0ID0gUG9pbnQubWluKHRoaXMuYWxscG9pbnRzKVxuICAgIGJvdHRvbVJpZ2h0ID0gUG9pbnQubWF4KHRoaXMuYWxscG9pbnRzKVxuICAgIGNvbnN0IGNlbnRlciA9IFBvaW50Lm1lYW4odG9wTGVmdCwgYm90dG9tUmlnaHQpXG4gICAgdGhpcy50cmFuc2xhdGUod2lkdGggLyAyIC0gY2VudGVyLngsIGhlaWdodCAvIDIgLSBjZW50ZXIueSkgLy8gY2VudHJlXG5cbiAgICByZXR1cm4gc2ZcbiAgfVxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgR3JhcGhpY1EgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIGRhdGE6IEdyYXBoaWNRRGF0YVxuICB2aWV3OiBHcmFwaGljUVZpZXdcblxuICBjb25zdHJ1Y3RvciAoKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgc3VwZXIoKSAvLyB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgICBkZWxldGUgKHRoaXMuRE9NKSAvLyBnb2luZyB0byBvdmVycmlkZSBnZXRET00gdXNpbmcgdGhlIHZpZXcncyBET01cblxuICAgIC8qIFRoZXNlIGFyZSBndWFyYW50ZWVkIHRvIGJlIG92ZXJyaWRkZW4sIHNvIG5vIHBvaW50IGluaXRpYWxpemluZyBoZXJlXG4gICAgICpcbiAgICAgKiAgdGhpcy5kYXRhID0gbmV3IEdyYXBoaWNRRGF0YShvcHRpb25zKVxuICAgICAqICB0aGlzLnZpZXcgPSBuZXcgR3JhcGhpY1FWaWV3KHRoaXMuZGF0YSwgb3B0aW9ucylcbiAgICAgKlxuICAgICAqL1xuICB9XG5cbiAgLyogTmVlZCB0byByZWZhY3RvciBzdWJjbGFzc2VzIHRvIGRvIHRoaXM6XG4gICAqIGNvbnN0cnVjdG9yIChkYXRhLCB2aWV3KSB7XG4gICAqICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICogICAgdGhpcy52aWV3ID0gdmlld1xuICAgKiB9XG4gICAqXG4gICAqIHN0YXRpYyByYW5kb20ob3B0aW9ucykge1xuICAgKiAgLy8gYW4gYXR0ZW1wdCBhdCBoYXZpbmcgYWJzdHJhY3Qgc3RhdGljIG1ldGhvZHMsIGFsYmVpdCBydW50aW1lIGVycm9yXG4gICAqICB0aHJvdyBuZXcgRXJyb3IoXCJgcmFuZG9tKClgIG11c3QgYmUgb3ZlcnJpZGRlbiBpbiBzdWJjbGFzcyBcIiArIHRoaXMubmFtZSlcbiAgICogfVxuICAgKlxuICAgKiB0eXBpY2FsIGltcGxlbWVudGF0aW9uOlxuICAgKiBzdGF0aWMgcmFuZG9tKG9wdGlvbnMpIHtcbiAgICogIGNvbnN0IGRhdGEgPSBuZXcgRGVyaXZlZFFEYXRhKG9wdGlvbnMpXG4gICAqICBjb25zdCB2aWV3ID0gbmV3IERlcml2ZWRRVmlldyhvcHRpb25zKVxuICAgKiAgcmV0dXJuIG5ldyBEZXJpdmVkUURhdGEoZGF0YSx2aWV3KVxuICAgKiB9XG4gICAqXG4gICAqL1xuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHsgcmV0dXJuIHRoaXMudmlldy5nZXRET00oKSB9XG5cbiAgcmVuZGVyICgpIDogdm9pZCB7IHRoaXMudmlldy5yZW5kZXIoKSB9XG5cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQge1xuICAgIHN1cGVyLnNob3dBbnN3ZXIoKVxuICAgIHRoaXMudmlldy5zaG93QW5zd2VyKClcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICBzdXBlci5oaWRlQW5zd2VyKClcbiAgICB0aGlzLnZpZXcuaGlkZUFuc3dlcigpXG4gIH1cbn1cbiIsImltcG9ydCAqIGFzIGNvbW1vbmpzSGVscGVycyBmcm9tICdcdTAwMDBjb21tb25qc0hlbHBlcnMuanMnXG5cbnZhciBmcmFjdGlvbiA9IGNvbW1vbmpzSGVscGVycy5jcmVhdGVDb21tb25qc01vZHVsZShmdW5jdGlvbiAobW9kdWxlLCBleHBvcnRzKSB7XG4vKipcbiAqIEBsaWNlbnNlIEZyYWN0aW9uLmpzIHY0LjAuOSAwOS8wOS8yMDE1XG4gKiBodHRwOi8vd3d3Lnhhcmcub3JnLzIwMTQvMDMvcmF0aW9uYWwtbnVtYmVycy1pbi1qYXZhc2NyaXB0L1xuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSwgUm9iZXJ0IEVpc2VsZSAocm9iZXJ0QHhhcmcub3JnKVxuICogRHVhbCBsaWNlbnNlZCB1bmRlciB0aGUgTUlUIG9yIEdQTCBWZXJzaW9uIDIgbGljZW5zZXMuXG4gKiovXG5cbiAgLyoqXG4gKlxuICogVGhpcyBjbGFzcyBvZmZlcnMgdGhlIHBvc3NpYmlsaXR5IHRvIGNhbGN1bGF0ZSBmcmFjdGlvbnMuXG4gKiBZb3UgY2FuIHBhc3MgYSBmcmFjdGlvbiBpbiBkaWZmZXJlbnQgZm9ybWF0cy4gRWl0aGVyIGFzIGFycmF5LCBhcyBkb3VibGUsIGFzIHN0cmluZyBvciBhcyBhbiBpbnRlZ2VyLlxuICpcbiAqIEFycmF5L09iamVjdCBmb3JtXG4gKiBbIDAgPT4gPG5vbWluYXRvcj4sIDEgPT4gPGRlbm9taW5hdG9yPiBdXG4gKiBbIG4gPT4gPG5vbWluYXRvcj4sIGQgPT4gPGRlbm9taW5hdG9yPiBdXG4gKlxuICogSW50ZWdlciBmb3JtXG4gKiAtIFNpbmdsZSBpbnRlZ2VyIHZhbHVlXG4gKlxuICogRG91YmxlIGZvcm1cbiAqIC0gU2luZ2xlIGRvdWJsZSB2YWx1ZVxuICpcbiAqIFN0cmluZyBmb3JtXG4gKiAxMjMuNDU2IC0gYSBzaW1wbGUgZG91YmxlXG4gKiAxMjMvNDU2IC0gYSBzdHJpbmcgZnJhY3Rpb25cbiAqIDEyMy4nNDU2JyAtIGEgZG91YmxlIHdpdGggcmVwZWF0aW5nIGRlY2ltYWwgcGxhY2VzXG4gKiAxMjMuKDQ1NikgLSBzeW5vbnltXG4gKiAxMjMuNDUnNicgLSBhIGRvdWJsZSB3aXRoIHJlcGVhdGluZyBsYXN0IHBsYWNlXG4gKiAxMjMuNDUoNikgLSBzeW5vbnltXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiB2YXIgZiA9IG5ldyBGcmFjdGlvbihcIjkuNCczMSdcIik7XG4gKiBmLm11bChbLTQsIDNdKS5kaXYoNC45KTtcbiAqXG4gKi9cblxuICAoZnVuY3Rpb24gKHJvb3QpIHtcbiAgICAndXNlIHN0cmljdCdcblxuICAgIC8vIE1heGltdW0gc2VhcmNoIGRlcHRoIGZvciBjeWNsaWMgcmF0aW9uYWwgbnVtYmVycy4gMjAwMCBzaG91bGQgYmUgbW9yZSB0aGFuIGVub3VnaC5cbiAgICAvLyBFeGFtcGxlOiAxLzcgPSAwLigxNDI4NTcpIGhhcyA2IHJlcGVhdGluZyBkZWNpbWFsIHBsYWNlcy5cbiAgICAvLyBJZiBNQVhfQ1lDTEVfTEVOIGdldHMgcmVkdWNlZCwgbG9uZyBjeWNsZXMgd2lsbCBub3QgYmUgZGV0ZWN0ZWQgYW5kIHRvU3RyaW5nKCkgb25seSBnZXRzIHRoZSBmaXJzdCAxMCBkaWdpdHNcbiAgICB2YXIgTUFYX0NZQ0xFX0xFTiA9IDIwMDBcblxuICAgIC8vIFBhcnNlZCBkYXRhIHRvIGF2b2lkIGNhbGxpbmcgXCJuZXdcIiBhbGwgdGhlIHRpbWVcbiAgICB2YXIgUCA9IHtcbiAgICAgIHM6IDEsXG4gICAgICBuOiAwLFxuICAgICAgZDogMVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUVycm9yIChuYW1lKSB7XG4gICAgICBmdW5jdGlvbiBlcnJvckNvbnN0cnVjdG9yICgpIHtcbiAgICAgICAgdmFyIHRlbXAgPSBFcnJvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgICAgIHRlbXAubmFtZSA9IHRoaXMubmFtZSA9IG5hbWVcbiAgICAgICAgdGhpcy5zdGFjayA9IHRlbXAuc3RhY2tcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gdGVtcC5tZXNzYWdlXG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAqIEVycm9yIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICAgIGZ1bmN0aW9uIEludGVybWVkaWF0ZUluaGVyaXRvciAoKSB7fVxuICAgICAgSW50ZXJtZWRpYXRlSW5oZXJpdG9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZVxuICAgICAgZXJyb3JDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBuZXcgSW50ZXJtZWRpYXRlSW5oZXJpdG9yKClcblxuICAgICAgcmV0dXJuIGVycm9yQ29uc3RydWN0b3JcbiAgICB9XG5cbiAgICB2YXIgRGl2aXNpb25CeVplcm8gPSBGcmFjdGlvbi5EaXZpc2lvbkJ5WmVybyA9IGNyZWF0ZUVycm9yKCdEaXZpc2lvbkJ5WmVybycpXG4gICAgdmFyIEludmFsaWRQYXJhbWV0ZXIgPSBGcmFjdGlvbi5JbnZhbGlkUGFyYW1ldGVyID0gY3JlYXRlRXJyb3IoJ0ludmFsaWRQYXJhbWV0ZXInKVxuXG4gICAgZnVuY3Rpb24gYXNzaWduIChuLCBzKSB7XG4gICAgICBpZiAoaXNOYU4obiA9IHBhcnNlSW50KG4sIDEwKSkpIHtcbiAgICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKVxuICAgICAgfVxuICAgICAgcmV0dXJuIG4gKiBzXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdGhyb3dJbnZhbGlkUGFyYW0gKCkge1xuICAgICAgdGhyb3cgbmV3IEludmFsaWRQYXJhbWV0ZXIoKVxuICAgIH1cblxuICAgIHZhciBwYXJzZSA9IGZ1bmN0aW9uIChwMSwgcDIpIHtcbiAgICAgIHZhciBuID0gMDsgdmFyIGQgPSAxOyB2YXIgcyA9IDFcbiAgICAgIHZhciB2ID0gMDsgdmFyIHcgPSAwOyB2YXIgeCA9IDA7IHZhciB5ID0gMTsgdmFyIHogPSAxXG5cbiAgICAgIHZhciBBID0gMDsgdmFyIEIgPSAxXG4gICAgICB2YXIgQyA9IDE7IHZhciBEID0gMVxuXG4gICAgICB2YXIgTiA9IDEwMDAwMDAwXG4gICAgICB2YXIgTVxuXG4gICAgICBpZiAocDEgPT09IHVuZGVmaW5lZCB8fCBwMSA9PT0gbnVsbCkge1xuICAgICAgLyogdm9pZCAqL1xuICAgICAgfSBlbHNlIGlmIChwMiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG4gPSBwMVxuICAgICAgICBkID0gcDJcbiAgICAgICAgcyA9IG4gKiBkXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzd2l0Y2ggKHR5cGVvZiBwMSkge1xuICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAge1xuICAgICAgICAgICAgaWYgKCdkJyBpbiBwMSAmJiAnbicgaW4gcDEpIHtcbiAgICAgICAgICAgICAgbiA9IHAxLm5cbiAgICAgICAgICAgICAgZCA9IHAxLmRcbiAgICAgICAgICAgICAgaWYgKCdzJyBpbiBwMSkgeyBuICo9IHAxLnMgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICgwIGluIHAxKSB7XG4gICAgICAgICAgICAgIG4gPSBwMVswXVxuICAgICAgICAgICAgICBpZiAoMSBpbiBwMSkgeyBkID0gcDFbMV0gfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcyA9IG4gKiBkXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlmIChwMSA8IDApIHtcbiAgICAgICAgICAgICAgcyA9IHAxXG4gICAgICAgICAgICAgIHAxID0gLXAxXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwMSAlIDEgPT09IDApIHtcbiAgICAgICAgICAgICAgbiA9IHAxXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHAxID4gMCkgeyAvLyBjaGVjayBmb3IgIT0gMCwgc2NhbGUgd291bGQgYmVjb21lIE5hTiAobG9nKDApKSwgd2hpY2ggY29udmVyZ2VzIHJlYWxseSBzbG93XG4gICAgICAgICAgICAgIGlmIChwMSA+PSAxKSB7XG4gICAgICAgICAgICAgICAgeiA9IE1hdGgucG93KDEwLCBNYXRoLmZsb29yKDEgKyBNYXRoLmxvZyhwMSkgLyBNYXRoLkxOMTApKVxuICAgICAgICAgICAgICAgIHAxIC89IHpcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIFVzaW5nIEZhcmV5IFNlcXVlbmNlc1xuICAgICAgICAgICAgICAvLyBodHRwOi8vd3d3LmpvaG5kY29vay5jb20vYmxvZy8yMDEwLzEwLzIwL2Jlc3QtcmF0aW9uYWwtYXBwcm94aW1hdGlvbi9cblxuICAgICAgICAgICAgICB3aGlsZSAoQiA8PSBOICYmIEQgPD0gTikge1xuICAgICAgICAgICAgICAgIE0gPSAoQSArIEMpIC8gKEIgKyBEKVxuXG4gICAgICAgICAgICAgICAgaWYgKHAxID09PSBNKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoQiArIEQgPD0gTikge1xuICAgICAgICAgICAgICAgICAgICBuID0gQSArIENcbiAgICAgICAgICAgICAgICAgICAgZCA9IEIgKyBEXG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKEQgPiBCKSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBDXG4gICAgICAgICAgICAgICAgICAgIGQgPSBEXG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBuID0gQVxuICAgICAgICAgICAgICAgICAgICBkID0gQlxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgaWYgKHAxID4gTSkge1xuICAgICAgICAgICAgICAgICAgICBBICs9IENcbiAgICAgICAgICAgICAgICAgICAgQiArPSBEXG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBDICs9IEFcbiAgICAgICAgICAgICAgICAgICAgRCArPSBCXG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGlmIChCID4gTikge1xuICAgICAgICAgICAgICAgICAgICBuID0gQ1xuICAgICAgICAgICAgICAgICAgICBkID0gRFxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IEFcbiAgICAgICAgICAgICAgICAgICAgZCA9IEJcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbiAqPSB6XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzTmFOKHAxKSB8fCBpc05hTihwMikpIHtcbiAgICAgICAgICAgICAgZCA9IG4gPSBOYU5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAge1xuICAgICAgICAgICAgQiA9IHAxLm1hdGNoKC9cXGQrfC4vZylcblxuICAgICAgICAgICAgaWYgKEIgPT09IG51bGwpIHsgdGhyb3dJbnZhbGlkUGFyYW0oKSB9XG5cbiAgICAgICAgICAgIGlmIChCW0FdID09PSAnLScpIHsgLy8gQ2hlY2sgZm9yIG1pbnVzIHNpZ24gYXQgdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgICBzID0gLTFcbiAgICAgICAgICAgICAgQSsrXG4gICAgICAgICAgICB9IGVsc2UgaWYgKEJbQV0gPT09ICcrJykgeyAvLyBDaGVjayBmb3IgcGx1cyBzaWduIGF0IHRoZSBiZWdpbm5pbmdcbiAgICAgICAgICAgICAgQSsrXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChCLmxlbmd0aCA9PT0gQSArIDEpIHsgLy8gQ2hlY2sgaWYgaXQncyBqdXN0IGEgc2ltcGxlIG51bWJlciBcIjEyMzRcIlxuICAgICAgICAgICAgICB3ID0gYXNzaWduKEJbQSsrXSwgcylcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQltBICsgMV0gPT09ICcuJyB8fCBCW0FdID09PSAnLicpIHsgLy8gQ2hlY2sgaWYgaXQncyBhIGRlY2ltYWwgbnVtYmVyXG4gICAgICAgICAgICAgIGlmIChCW0FdICE9PSAnLicpIHsgLy8gSGFuZGxlIDAuNSBhbmQgLjVcbiAgICAgICAgICAgICAgICB2ID0gYXNzaWduKEJbQSsrXSwgcylcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBBKytcblxuICAgICAgICAgICAgICAvLyBDaGVjayBmb3IgZGVjaW1hbCBwbGFjZXNcbiAgICAgICAgICAgICAgaWYgKEEgKyAxID09PSBCLmxlbmd0aCB8fCBCW0EgKyAxXSA9PT0gJygnICYmIEJbQSArIDNdID09PSAnKScgfHwgQltBICsgMV0gPT09IFwiJ1wiICYmIEJbQSArIDNdID09PSBcIidcIikge1xuICAgICAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBXSwgcylcbiAgICAgICAgICAgICAgICB5ID0gTWF0aC5wb3coMTAsIEJbQV0ubGVuZ3RoKVxuICAgICAgICAgICAgICAgIEErK1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHJlcGVhdGluZyBwbGFjZXNcbiAgICAgICAgICAgICAgaWYgKEJbQV0gPT09ICcoJyAmJiBCW0EgKyAyXSA9PT0gJyknIHx8IEJbQV0gPT09IFwiJ1wiICYmIEJbQSArIDJdID09PSBcIidcIikge1xuICAgICAgICAgICAgICAgIHggPSBhc3NpZ24oQltBICsgMV0sIHMpXG4gICAgICAgICAgICAgICAgeiA9IE1hdGgucG93KDEwLCBCW0EgKyAxXS5sZW5ndGgpIC0gMVxuICAgICAgICAgICAgICAgIEEgKz0gM1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKEJbQSArIDFdID09PSAnLycgfHwgQltBICsgMV0gPT09ICc6JykgeyAvLyBDaGVjayBmb3IgYSBzaW1wbGUgZnJhY3Rpb24gXCIxMjMvNDU2XCIgb3IgXCIxMjM6NDU2XCJcbiAgICAgICAgICAgICAgdyA9IGFzc2lnbihCW0FdLCBzKVxuICAgICAgICAgICAgICB5ID0gYXNzaWduKEJbQSArIDJdLCAxKVxuICAgICAgICAgICAgICBBICs9IDNcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQltBICsgM10gPT09ICcvJyAmJiBCW0EgKyAxXSA9PT0gJyAnKSB7IC8vIENoZWNrIGZvciBhIGNvbXBsZXggZnJhY3Rpb24gXCIxMjMgMS8yXCJcbiAgICAgICAgICAgICAgdiA9IGFzc2lnbihCW0FdLCBzKVxuICAgICAgICAgICAgICB3ID0gYXNzaWduKEJbQSArIDJdLCBzKVxuICAgICAgICAgICAgICB5ID0gYXNzaWduKEJbQSArIDRdLCAxKVxuICAgICAgICAgICAgICBBICs9IDVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKEIubGVuZ3RoIDw9IEEpIHsgLy8gQ2hlY2sgZm9yIG1vcmUgdG9rZW5zIG9uIHRoZSBzdGFja1xuICAgICAgICAgICAgICBkID0geSAqIHpcbiAgICAgICAgICAgICAgcyA9IC8qIHZvaWQgKi9cbiAgICAgICAgICAgICAgICAgICAgbiA9IHggKyBkICogdiArIHogKiB3XG4gICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAvKiBGYWxsIHRocm91Z2ggb24gZXJyb3IgKi9cbiAgICAgICAgICB9XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93SW52YWxpZFBhcmFtKClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRGl2aXNpb25CeVplcm8oKVxuICAgICAgfVxuXG4gICAgICBQLnMgPSBzIDwgMCA/IC0xIDogMVxuICAgICAgUC5uID0gTWF0aC5hYnMobilcbiAgICAgIFAuZCA9IE1hdGguYWJzKGQpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW9kcG93IChiLCBlLCBtKSB7XG4gICAgICB2YXIgciA9IDFcbiAgICAgIGZvciAoOyBlID4gMDsgYiA9IChiICogYikgJSBtLCBlID4+PSAxKSB7XG4gICAgICAgIGlmIChlICYgMSkge1xuICAgICAgICAgIHIgPSAociAqIGIpICUgbVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gclxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGN5Y2xlTGVuIChuLCBkKSB7XG4gICAgICBmb3IgKDsgZCAlIDIgPT09IDA7XG4gICAgICAgIGQgLz0gMikge1xuICAgICAgfVxuXG4gICAgICBmb3IgKDsgZCAlIDUgPT09IDA7XG4gICAgICAgIGQgLz0gNSkge1xuICAgICAgfVxuXG4gICAgICBpZiAoZCA9PT0gMSkgLy8gQ2F0Y2ggbm9uLWN5Y2xpYyBudW1iZXJzXG4gICAgICB7IHJldHVybiAwIH1cblxuICAgICAgLy8gSWYgd2Ugd291bGQgbGlrZSB0byBjb21wdXRlIHJlYWxseSBsYXJnZSBudW1iZXJzIHF1aWNrZXIsIHdlIGNvdWxkIG1ha2UgdXNlIG9mIEZlcm1hdCdzIGxpdHRsZSB0aGVvcmVtOlxuICAgICAgLy8gMTBeKGQtMSkgJSBkID09IDFcbiAgICAgIC8vIEhvd2V2ZXIsIHdlIGRvbid0IG5lZWQgc3VjaCBsYXJnZSBudW1iZXJzIGFuZCBNQVhfQ1lDTEVfTEVOIHNob3VsZCBiZSB0aGUgY2Fwc3RvbmUsXG4gICAgICAvLyBhcyB3ZSB3YW50IHRvIHRyYW5zbGF0ZSB0aGUgbnVtYmVycyB0byBzdHJpbmdzLlxuXG4gICAgICB2YXIgcmVtID0gMTAgJSBkXG4gICAgICB2YXIgdCA9IDFcblxuICAgICAgZm9yICg7IHJlbSAhPT0gMTsgdCsrKSB7XG4gICAgICAgIHJlbSA9IHJlbSAqIDEwICUgZFxuXG4gICAgICAgIGlmICh0ID4gTUFYX0NZQ0xFX0xFTikgeyByZXR1cm4gMCB9IC8vIFJldHVybmluZyAwIGhlcmUgbWVhbnMgdGhhdCB3ZSBkb24ndCBwcmludCBpdCBhcyBhIGN5Y2xpYyBudW1iZXIuIEl0J3MgbGlrZWx5IHRoYXQgdGhlIGFuc3dlciBpcyBgZC0xYFxuICAgICAgfVxuICAgICAgcmV0dXJuIHRcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjeWNsZVN0YXJ0IChuLCBkLCBsZW4pIHtcbiAgICAgIHZhciByZW0xID0gMVxuICAgICAgdmFyIHJlbTIgPSBtb2Rwb3coMTAsIGxlbiwgZClcblxuICAgICAgZm9yICh2YXIgdCA9IDA7IHQgPCAzMDA7IHQrKykgeyAvLyBzIDwgfmxvZzEwKE51bWJlci5NQVhfVkFMVUUpXG4gICAgICAvLyBTb2x2ZSAxMF5zID09IDEwXihzK3QpIChtb2QgZClcblxuICAgICAgICBpZiAocmVtMSA9PT0gcmVtMikgeyByZXR1cm4gdCB9XG5cbiAgICAgICAgcmVtMSA9IHJlbTEgKiAxMCAlIGRcbiAgICAgICAgcmVtMiA9IHJlbTIgKiAxMCAlIGRcbiAgICAgIH1cbiAgICAgIHJldHVybiAwXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2NkIChhLCBiKSB7XG4gICAgICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICAgICAgaWYgKCFiKSB7IHJldHVybiBhIH1cblxuICAgICAgd2hpbGUgKDEpIHtcbiAgICAgICAgYSAlPSBiXG4gICAgICAgIGlmICghYSkgeyByZXR1cm4gYiB9XG4gICAgICAgIGIgJT0gYVxuICAgICAgICBpZiAoIWIpIHsgcmV0dXJuIGEgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICogTW9kdWxlIGNvbnN0cnVjdG9yXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge251bWJlcnxGcmFjdGlvbj19IGFcbiAgICogQHBhcmFtIHtudW1iZXI9fSBiXG4gICAqL1xuICAgIGZ1bmN0aW9uIEZyYWN0aW9uIChhLCBiKSB7XG4gICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRnJhY3Rpb24pKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oYSwgYilcbiAgICAgIH1cblxuICAgICAgcGFyc2UoYSwgYilcblxuICAgICAgaWYgKEZyYWN0aW9uLlJFRFVDRSkge1xuICAgICAgICBhID0gZ2NkKFAuZCwgUC5uKSAvLyBBYnVzZSBhXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhID0gMVxuICAgICAgfVxuXG4gICAgICB0aGlzLnMgPSBQLnNcbiAgICAgIHRoaXMubiA9IFAubiAvIGFcbiAgICAgIHRoaXMuZCA9IFAuZCAvIGFcbiAgICB9XG5cbiAgICAvKipcbiAgICogQm9vbGVhbiBnbG9iYWwgdmFyaWFibGUgdG8gYmUgYWJsZSB0byBkaXNhYmxlIGF1dG9tYXRpYyByZWR1Y3Rpb24gb2YgdGhlIGZyYWN0aW9uXG4gICAqXG4gICAqL1xuICAgIEZyYWN0aW9uLlJFRFVDRSA9IDFcblxuICAgIEZyYWN0aW9uLnByb3RvdHlwZSA9IHtcblxuICAgICAgczogMSxcbiAgICAgIG46IDAsXG4gICAgICBkOiAxLFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBhYnNvbHV0ZSB2YWx1ZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigtNCkuYWJzKCkgPT4gNFxuICAgICAqKi9cbiAgICAgIGFiczogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMubiwgdGhpcy5kKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogSW52ZXJ0cyB0aGUgc2lnbiBvZiB0aGUgY3VycmVudCBmcmFjdGlvblxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigtNCkubmVnKCkgPT4gNFxuICAgICAqKi9cbiAgICAgIG5lZzogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKC10aGlzLnMgKiB0aGlzLm4sIHRoaXMuZClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIEFkZHMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oe246IDIsIGQ6IDN9KS5hZGQoXCIxNC45XCIpID0+IDQ2NyAvIDMwXG4gICAgICoqL1xuICAgICAgYWRkOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIHRoaXMubiAqIFAuZCArIFAucyAqIHRoaXMuZCAqIFAubixcbiAgICAgICAgICB0aGlzLmQgKiBQLmRcbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogU3VidHJhY3RzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKHtuOiAyLCBkOiAzfSkuYWRkKFwiMTQuOVwiKSA9PiAtNDI3IC8gMzBcbiAgICAgKiovXG4gICAgICBzdWI6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgdGhpcy5zICogdGhpcy5uICogUC5kIC0gUC5zICogdGhpcy5kICogUC5uLFxuICAgICAgICAgIHRoaXMuZCAqIFAuZFxuICAgICAgICApXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBNdWx0aXBsaWVzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiLTE3LigzNDUpXCIpLm11bCgzKSA9PiA1Nzc2IC8gMTExXG4gICAgICoqL1xuICAgICAgbXVsOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIFAucyAqIHRoaXMubiAqIFAubixcbiAgICAgICAgICB0aGlzLmQgKiBQLmRcbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogRGl2aWRlcyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIi0xNy4oMzQ1KVwiKS5pbnZlcnNlKCkuZGl2KDMpXG4gICAgICoqL1xuICAgICAgZGl2OiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIFAucyAqIHRoaXMubiAqIFAuZCxcbiAgICAgICAgICB0aGlzLmQgKiBQLm5cbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2xvbmVzIHRoZSBhY3R1YWwgb2JqZWN0XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiLTE3LigzNDUpXCIpLmNsb25lKClcbiAgICAgKiovXG4gICAgICBjbG9uZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBtb2R1bG8gb2YgdHdvIHJhdGlvbmFsIG51bWJlcnMgLSBhIG1vcmUgcHJlY2lzZSBmbW9kXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLm1vZChbNywgOF0pID0+ICgxMy8zKSAlICg3LzgpID0gKDUvNilcbiAgICAgKiovXG4gICAgICBtb2Q6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTilcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMucyAqIHRoaXMubiAlIHRoaXMuZCwgMSlcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIGlmIChQLm4gPT09IDAgJiYgdGhpcy5kID09PSAwKSB7XG4gICAgICAgICAgRnJhY3Rpb24oMCwgMCkgLy8gVGhyb3cgRGl2aXNpb25CeVplcm9cbiAgICAgICAgfVxuXG4gICAgICAgIC8qXG4gICAgICAgKiBGaXJzdCBzaWxseSBhdHRlbXB0LCBraW5kYSBzbG93XG4gICAgICAgKlxuICAgICAgIHJldHVybiB0aGF0W1wic3ViXCJdKHtcbiAgICAgICBcIm5cIjogbnVtW1wiblwiXSAqIE1hdGguZmxvb3IoKHRoaXMubiAvIHRoaXMuZCkgLyAobnVtLm4gLyBudW0uZCkpLFxuICAgICAgIFwiZFwiOiBudW1bXCJkXCJdLFxuICAgICAgIFwic1wiOiB0aGlzW1wic1wiXVxuICAgICAgIH0pOyAqL1xuXG4gICAgICAgIC8qXG4gICAgICAgKiBOZXcgYXR0ZW1wdDogYTEgLyBiMSA9IGEyIC8gYjIgKiBxICsgclxuICAgICAgICogPT4gYjIgKiBhMSA9IGEyICogYjEgKiBxICsgYjEgKiBiMiAqIHJcbiAgICAgICAqID0+IChiMiAqIGExICUgYTIgKiBiMSkgLyAoYjEgKiBiMilcbiAgICAgICAqL1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIChQLmQgKiB0aGlzLm4pICUgKFAubiAqIHRoaXMuZCksXG4gICAgICAgICAgUC5kICogdGhpcy5kXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZyYWN0aW9uYWwgZ2NkIG9mIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDUsOCkuZ2NkKDMsNykgPT4gMS81NlxuICAgICAqL1xuICAgICAgZ2NkOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuXG4gICAgICAgIC8vIGdjZChhIC8gYiwgYyAvIGQpID0gZ2NkKGEsIGMpIC8gbGNtKGIsIGQpXG5cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihnY2QoUC5uLCB0aGlzLm4pICogZ2NkKFAuZCwgdGhpcy5kKSwgUC5kICogdGhpcy5kKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZnJhY3Rpb25hbCBsY20gb2YgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oNSw4KS5sY20oMyw3KSA9PiAxNVxuICAgICAqL1xuICAgICAgbGNtOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuXG4gICAgICAgIC8vIGxjbShhIC8gYiwgYyAvIGQpID0gbGNtKGEsIGMpIC8gZ2NkKGIsIGQpXG5cbiAgICAgICAgaWYgKFAubiA9PT0gMCAmJiB0aGlzLm4gPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFAubiAqIHRoaXMubiwgZ2NkKFAubiwgdGhpcy5uKSAqIGdjZChQLmQsIHRoaXMuZCkpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBjZWlsIG9mIGEgcmF0aW9uYWwgbnVtYmVyXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLmNlaWwoKSA9PiAoNSAvIDEpXG4gICAgICoqL1xuICAgICAgY2VpbDogZnVuY3Rpb24gKHBsYWNlcykge1xuICAgICAgICBwbGFjZXMgPSBNYXRoLnBvdygxMCwgcGxhY2VzIHx8IDApXG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5jZWlsKHBsYWNlcyAqIHRoaXMucyAqIHRoaXMubiAvIHRoaXMuZCksIHBsYWNlcylcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZsb29yIG9mIGEgcmF0aW9uYWwgbnVtYmVyXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLmZsb29yKCkgPT4gKDQgLyAxKVxuICAgICAqKi9cbiAgICAgIGZsb29yOiBmdW5jdGlvbiAocGxhY2VzKSB7XG4gICAgICAgIHBsYWNlcyA9IE1hdGgucG93KDEwLCBwbGFjZXMgfHwgMClcblxuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLmZsb29yKHBsYWNlcyAqIHRoaXMucyAqIHRoaXMubiAvIHRoaXMuZCksIHBsYWNlcylcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJvdW5kcyBhIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykucm91bmQoKSA9PiAoNCAvIDEpXG4gICAgICoqL1xuICAgICAgcm91bmQ6IGZ1bmN0aW9uIChwbGFjZXMpIHtcbiAgICAgICAgcGxhY2VzID0gTWF0aC5wb3coMTAsIHBsYWNlcyB8fCAwKVxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGgucm91bmQocGxhY2VzICogdGhpcy5zICogdGhpcy5uIC8gdGhpcy5kKSwgcGxhY2VzKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogR2V0cyB0aGUgaW52ZXJzZSBvZiB0aGUgZnJhY3Rpb24sIG1lYW5zIG51bWVyYXRvciBhbmQgZGVudW1lcmF0b3IgYXJlIGV4Y2hhbmdlZFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihbLTMsIDRdKS5pbnZlcnNlKCkgPT4gLTQgLyAzXG4gICAgICoqL1xuICAgICAgaW52ZXJzZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMucyAqIHRoaXMuZCwgdGhpcy5uKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZnJhY3Rpb24gdG8gc29tZSBpbnRlZ2VyIGV4cG9uZW50XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKC0xLDIpLnBvdygtMykgPT4gLThcbiAgICAgKi9cbiAgICAgIHBvdzogZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgaWYgKG0gPCAwKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLnBvdyh0aGlzLnMgKiB0aGlzLmQsIC1tKSwgTWF0aC5wb3codGhpcy5uLCAtbSkpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLnBvdyh0aGlzLnMgKiB0aGlzLm4sIG0pLCBNYXRoLnBvdyh0aGlzLmQsIG0pKVxuICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0d28gcmF0aW9uYWwgbnVtYmVycyBhcmUgdGhlIHNhbWVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oMTkuNikuZXF1YWxzKFs5OCwgNV0pO1xuICAgICAqKi9cbiAgICAgIGVxdWFsczogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIHRoaXMucyAqIHRoaXMubiAqIFAuZCA9PT0gUC5zICogUC5uICogdGhpcy5kIC8vIFNhbWUgYXMgY29tcGFyZSgpID09PSAwXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0d28gcmF0aW9uYWwgbnVtYmVycyBhcmUgdGhlIHNhbWVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oMTkuNikuZXF1YWxzKFs5OCwgNV0pO1xuICAgICAqKi9cbiAgICAgIGNvbXBhcmU6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHZhciB0ID0gKHRoaXMucyAqIHRoaXMubiAqIFAuZCAtIFAucyAqIFAubiAqIHRoaXMuZClcbiAgICAgICAgcmV0dXJuICh0ID4gMCkgLSAodCA8IDApXG4gICAgICB9LFxuXG4gICAgICBzaW1wbGlmeTogZnVuY3Rpb24gKGVwcykge1xuICAgICAgLy8gRmlyc3QgbmFpdmUgaW1wbGVtZW50YXRpb24sIG5lZWRzIGltcHJvdmVtZW50XG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiB0aGlzXG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY29udCA9IHRoaXMuYWJzKCkudG9Db250aW51ZWQoKVxuXG4gICAgICAgIGVwcyA9IGVwcyB8fCAwLjAwMVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlYyAoYSkge1xuICAgICAgICAgIGlmIChhLmxlbmd0aCA9PT0gMSkgeyByZXR1cm4gbmV3IEZyYWN0aW9uKGFbMF0pIH1cbiAgICAgICAgICByZXR1cm4gcmVjKGEuc2xpY2UoMSkpLmludmVyc2UoKS5hZGQoYVswXSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29udC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHZhciB0bXAgPSByZWMoY29udC5zbGljZSgwLCBpICsgMSkpXG4gICAgICAgICAgaWYgKHRtcC5zdWIodGhpcy5hYnMoKSkuYWJzKCkudmFsdWVPZigpIDwgZXBzKSB7XG4gICAgICAgICAgICByZXR1cm4gdG1wLm11bCh0aGlzLnMpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0d28gcmF0aW9uYWwgbnVtYmVycyBhcmUgZGl2aXNpYmxlXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDE5LjYpLmRpdmlzaWJsZSgxLjUpO1xuICAgICAqL1xuICAgICAgZGl2aXNpYmxlOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gISghKFAubiAqIHRoaXMuZCkgfHwgKCh0aGlzLm4gKiBQLmQpICUgKFAubiAqIHRoaXMuZCkpKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogUmV0dXJucyBhIGRlY2ltYWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGZyYWN0aW9uXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiMTAwLic5MTgyMydcIikudmFsdWVPZigpID0+IDEwMC45MTgyMzkxODIzOTE4M1xuICAgICAqKi9cbiAgICAgIHZhbHVlT2Y6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucyAqIHRoaXMubiAvIHRoaXMuZFxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogUmV0dXJucyBhIHN0cmluZy1mcmFjdGlvbiByZXByZXNlbnRhdGlvbiBvZiBhIEZyYWN0aW9uIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEuJzMnXCIpLnRvRnJhY3Rpb24oKSA9PiBcIjQgMS8zXCJcbiAgICAgKiovXG4gICAgICB0b0ZyYWN0aW9uOiBmdW5jdGlvbiAoZXhjbHVkZVdob2xlKSB7XG4gICAgICAgIHZhciB3aG9sZTsgdmFyIHN0ciA9ICcnXG4gICAgICAgIHZhciBuID0gdGhpcy5uXG4gICAgICAgIHZhciBkID0gdGhpcy5kXG4gICAgICAgIGlmICh0aGlzLnMgPCAwKSB7XG4gICAgICAgICAgc3RyICs9ICctJ1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGQgPT09IDEpIHtcbiAgICAgICAgICBzdHIgKz0gblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChleGNsdWRlV2hvbGUgJiYgKHdob2xlID0gTWF0aC5mbG9vcihuIC8gZCkpID4gMCkge1xuICAgICAgICAgICAgc3RyICs9IHdob2xlXG4gICAgICAgICAgICBzdHIgKz0gJyAnXG4gICAgICAgICAgICBuICU9IGRcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzdHIgKz0gblxuICAgICAgICAgIHN0ciArPSAnLydcbiAgICAgICAgICBzdHIgKz0gZFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHJcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBsYXRleCByZXByZXNlbnRhdGlvbiBvZiBhIEZyYWN0aW9uIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEuJzMnXCIpLnRvTGF0ZXgoKSA9PiBcIlxcZnJhY3s0fXszfVwiXG4gICAgICoqL1xuICAgICAgdG9MYXRleDogZnVuY3Rpb24gKGV4Y2x1ZGVXaG9sZSkge1xuICAgICAgICB2YXIgd2hvbGU7IHZhciBzdHIgPSAnJ1xuICAgICAgICB2YXIgbiA9IHRoaXMublxuICAgICAgICB2YXIgZCA9IHRoaXMuZFxuICAgICAgICBpZiAodGhpcy5zIDwgMCkge1xuICAgICAgICAgIHN0ciArPSAnLSdcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkID09PSAxKSB7XG4gICAgICAgICAgc3RyICs9IG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZXhjbHVkZVdob2xlICYmICh3aG9sZSA9IE1hdGguZmxvb3IobiAvIGQpKSA+IDApIHtcbiAgICAgICAgICAgIHN0ciArPSB3aG9sZVxuICAgICAgICAgICAgbiAlPSBkXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc3RyICs9ICdcXFxcZnJhY3snXG4gICAgICAgICAgc3RyICs9IG5cbiAgICAgICAgICBzdHIgKz0gJ317J1xuICAgICAgICAgIHN0ciArPSBkXG4gICAgICAgICAgc3RyICs9ICd9J1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHJcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YgY29udGludWVkIGZyYWN0aW9uIGVsZW1lbnRzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiNy84XCIpLnRvQ29udGludWVkKCkgPT4gWzAsMSw3XVxuICAgICAqL1xuICAgICAgdG9Db250aW51ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRcbiAgICAgICAgdmFyIGEgPSB0aGlzLm5cbiAgICAgICAgdmFyIGIgPSB0aGlzLmRcbiAgICAgICAgdmFyIHJlcyA9IFtdXG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiByZXNcbiAgICAgICAgfVxuXG4gICAgICAgIGRvIHtcbiAgICAgICAgICByZXMucHVzaChNYXRoLmZsb29yKGEgLyBiKSlcbiAgICAgICAgICB0ID0gYSAlIGJcbiAgICAgICAgICBhID0gYlxuICAgICAgICAgIGIgPSB0XG4gICAgICAgIH0gd2hpbGUgKGEgIT09IDEpXG5cbiAgICAgICAgcmV0dXJuIHJlc1xuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhIGZyYWN0aW9uIHdpdGggYWxsIGRpZ2l0c1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEwMC4nOTE4MjMnXCIpLnRvU3RyaW5nKCkgPT4gXCIxMDAuKDkxODIzKVwiXG4gICAgICoqL1xuICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uIChkZWMpIHtcbiAgICAgICAgdmFyIGdcbiAgICAgICAgdmFyIE4gPSB0aGlzLm5cbiAgICAgICAgdmFyIEQgPSB0aGlzLmRcblxuICAgICAgICBpZiAoaXNOYU4oTikgfHwgaXNOYU4oRCkpIHtcbiAgICAgICAgICByZXR1cm4gJ05hTidcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghRnJhY3Rpb24uUkVEVUNFKSB7XG4gICAgICAgICAgZyA9IGdjZChOLCBEKVxuICAgICAgICAgIE4gLz0gZ1xuICAgICAgICAgIEQgLz0gZ1xuICAgICAgICB9XG5cbiAgICAgICAgZGVjID0gZGVjIHx8IDE1IC8vIDE1ID0gZGVjaW1hbCBwbGFjZXMgd2hlbiBubyByZXBpdGF0aW9uXG5cbiAgICAgICAgdmFyIGN5Y0xlbiA9IGN5Y2xlTGVuKE4sIEQpIC8vIEN5Y2xlIGxlbmd0aFxuICAgICAgICB2YXIgY3ljT2ZmID0gY3ljbGVTdGFydChOLCBELCBjeWNMZW4pIC8vIEN5Y2xlIHN0YXJ0XG5cbiAgICAgICAgdmFyIHN0ciA9IHRoaXMucyA9PT0gLTEgPyAnLScgOiAnJ1xuXG4gICAgICAgIHN0ciArPSBOIC8gRCB8IDBcblxuICAgICAgICBOICU9IERcbiAgICAgICAgTiAqPSAxMFxuXG4gICAgICAgIGlmIChOKSB7IHN0ciArPSAnLicgfVxuXG4gICAgICAgIGlmIChjeWNMZW4pIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gY3ljT2ZmOyBpLS07KSB7XG4gICAgICAgICAgICBzdHIgKz0gTiAvIEQgfCAwXG4gICAgICAgICAgICBOICU9IERcbiAgICAgICAgICAgIE4gKj0gMTBcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RyICs9ICcoJ1xuICAgICAgICAgIGZvciAodmFyIGkgPSBjeWNMZW47IGktLTspIHtcbiAgICAgICAgICAgIHN0ciArPSBOIC8gRCB8IDBcbiAgICAgICAgICAgIE4gJT0gRFxuICAgICAgICAgICAgTiAqPSAxMFxuICAgICAgICAgIH1cbiAgICAgICAgICBzdHIgKz0gJyknXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IGRlYzsgTiAmJiBpLS07KSB7XG4gICAgICAgICAgICBzdHIgKz0gTiAvIEQgfCAwXG4gICAgICAgICAgICBOICU9IERcbiAgICAgICAgICAgIE4gKj0gMTBcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0clxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdW5kZWZpbmVkID09PSAnZnVuY3Rpb24nICYmIHVuZGVmaW5lZC5hbWQpIHtcbiAgICAgIHVuZGVmaW5lZChbXSwgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gRnJhY3Rpb25cbiAgICAgIH0pXG4gICAgfSBlbHNlIGlmICgnb2JqZWN0JyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSlcbiAgICAgIEZyYWN0aW9uLmRlZmF1bHQgPSBGcmFjdGlvblxuICAgICAgRnJhY3Rpb24uRnJhY3Rpb24gPSBGcmFjdGlvblxuICAgICAgbW9kdWxlLmV4cG9ydHMgPSBGcmFjdGlvblxuICAgIH0gZWxzZSB7XG4gICAgICByb290LkZyYWN0aW9uID0gRnJhY3Rpb25cbiAgICB9XG4gIH0pKGNvbW1vbmpzSGVscGVycy5jb21tb25qc0dsb2JhbClcbn0pXG5cbmV4cG9ydCBkZWZhdWx0IC8qIEBfX1BVUkVfXyAqL2NvbW1vbmpzSGVscGVycy5nZXREZWZhdWx0RXhwb3J0RnJvbUNqcyhmcmFjdGlvbilcbmV4cG9ydCB7IGZyYWN0aW9uIGFzIF9fbW9kdWxlRXhwb3J0cyB9XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBNb25vbWlhbCB7XG4gIGNvbnN0cnVjdG9yIChjLCB2cykge1xuICAgIGlmICghaXNOYU4oYykgJiYgdnMgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgIHRoaXMuYyA9IGNcbiAgICAgIHRoaXMudnMgPSB2c1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGMgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmluaXRTdHIoYylcbiAgICB9IGVsc2UgaWYgKCFpc05hTihjKSkge1xuICAgICAgdGhpcy5jID0gY1xuICAgICAgdGhpcy52cyA9IG5ldyBNYXAoKVxuICAgIH0gZWxzZSB7IC8vIGRlZmF1bHQgYXMgYSB0ZXN0OiA0eF4yeVxuICAgICAgdGhpcy5jID0gNFxuICAgICAgdGhpcy52cyA9IG5ldyBNYXAoW1sneCcsIDJdLCBbJ3knLCAxXV0pXG4gICAgfVxuICB9XG5cbiAgY2xvbmUgKCkge1xuICAgIGNvbnN0IHZzID0gbmV3IE1hcCh0aGlzLnZzKVxuICAgIHJldHVybiBuZXcgTW9ub21pYWwodGhpcy5jLCB2cylcbiAgfVxuXG4gIG11bCAodGhhdCkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgTW9ub21pYWwodGhhdClcbiAgICB9XG4gICAgY29uc3QgYyA9IHRoaXMuYyAqIHRoYXQuY1xuICAgIGxldCB2cyA9IG5ldyBNYXAoKVxuICAgIHRoaXMudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAodGhhdC52cy5oYXModmFyaWFibGUpKSB7XG4gICAgICAgIHZzLnNldCh2YXJpYWJsZSwgdGhpcy52cy5nZXQodmFyaWFibGUpICsgdGhhdC52cy5nZXQodmFyaWFibGUpKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdnMuc2V0KHZhcmlhYmxlLCB0aGlzLnZzLmdldCh2YXJpYWJsZSkpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoYXQudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAoIXZzLmhhcyh2YXJpYWJsZSkpIHtcbiAgICAgICAgdnMuc2V0KHZhcmlhYmxlLCB0aGF0LnZzLmdldCh2YXJpYWJsZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICB2cyA9IG5ldyBNYXAoWy4uLnZzLmVudHJpZXMoKV0uc29ydCgpKVxuICAgIHJldHVybiBuZXcgTW9ub21pYWwoYywgdnMpXG4gIH1cblxuICB0b0xhdGV4ICgpIHtcbiAgICBpZiAodGhpcy52cy5zaXplID09PSAwKSByZXR1cm4gdGhpcy5jLnRvU3RyaW5nKClcbiAgICBsZXQgc3RyID0gdGhpcy5jID09PSAxID8gJydcbiAgICAgIDogdGhpcy5jID09PSAtMSA/ICctJ1xuICAgICAgICA6IHRoaXMuYy50b1N0cmluZygpXG4gICAgdGhpcy52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmIChpbmRleCA9PT0gMSkge1xuICAgICAgICBzdHIgKz0gdmFyaWFibGVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciArPSB2YXJpYWJsZSArICdeJyArIGluZGV4XG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gc3RyXG4gIH1cblxuICBzb3J0ICgpIHtcbiAgICAvLyBzb3J0cyAobW9kaWZpZXMgb2JqZWN0KVxuICAgIHRoaXMudnMgPSBuZXcgTWFwKFsuLi50aGlzLnZzLmVudHJpZXMoKV0uc29ydCgpKVxuICB9XG5cbiAgY2xlYW5aZXJvcyAoKSB7XG4gICAgdGhpcy52cy5mb3JFYWNoKChpZHgsIHYpID0+IHtcbiAgICAgIGlmIChpZHggPT09IDApIHRoaXMudnMuZGVsZXRlKHYpXG4gICAgfSlcbiAgfVxuXG4gIGxpa2UgKHRoYXQpIHtcbiAgICAvLyByZXR1cm4gdHJ1ZSBpZiBsaWtlIHRlcm1zLCBmYWxzZSBpZiBvdGhlcndpc2VcbiAgICAvLyBub3QgdGhlIG1vc3QgZWZmaWNpZW50IGF0IHRoZSBtb21lbnQsIGJ1dCBnb29kIGVub3VnaC5cbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IE1vbm9taWFsKHRoYXQpXG4gICAgfVxuXG4gICAgbGV0IGxpa2UgPSB0cnVlXG4gICAgdGhpcy52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICghdGhhdC52cy5oYXModmFyaWFibGUpIHx8IHRoYXQudnMuZ2V0KHZhcmlhYmxlKSAhPT0gaW5kZXgpIHtcbiAgICAgICAgbGlrZSA9IGZhbHNlXG4gICAgICB9XG4gICAgfSlcbiAgICB0aGF0LnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKCF0aGlzLnZzLmhhcyh2YXJpYWJsZSkgfHwgdGhpcy52cy5nZXQodmFyaWFibGUpICE9PSBpbmRleCkge1xuICAgICAgICBsaWtlID0gZmFsc2VcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBsaWtlXG4gIH1cblxuICBhZGQgKHRoYXQsIGNoZWNrTGlrZSkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgTW9ub21pYWwodGhhdClcbiAgICB9XG4gICAgLy8gYWRkcyB0d28gY29tcGF0aWJsZSBtb25vbWlhbHNcbiAgICAvLyBjaGVja0xpa2UgKGRlZmF1bHQgdHJ1ZSkgd2lsbCBjaGVjayBmaXJzdCBpZiB0aGV5IGFyZSBsaWtlIGFuZCB0aHJvdyBhbiBleGNlcHRpb25cbiAgICAvLyB1bmRlZmluZWQgYmVoYXZpb3VyIGlmIGNoZWNrTGlrZSBpcyBmYWxzZVxuICAgIGlmIChjaGVja0xpa2UgPT09IHVuZGVmaW5lZCkgY2hlY2tMaWtlID0gdHJ1ZVxuICAgIGlmIChjaGVja0xpa2UgJiYgIXRoaXMubGlrZSh0aGF0KSkgdGhyb3cgbmV3IEVycm9yKCdBZGRpbmcgdW5saWtlIHRlcm1zJylcbiAgICBjb25zdCBjID0gdGhpcy5jICsgdGhhdC5jXG4gICAgY29uc3QgdnMgPSB0aGlzLnZzXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbChjLCB2cylcbiAgfVxuXG4gIGluaXRTdHIgKHN0cikge1xuICAgIC8vIGN1cnJlbnRseSBubyBlcnJvciBjaGVja2luZyBhbmQgZnJhZ2lsZVxuICAgIC8vIFRoaW5ncyBub3QgdG8gcGFzcyBpbjpcbiAgICAvLyAgemVybyBpbmRpY2VzXG4gICAgLy8gIG11bHRpLWNoYXJhY3RlciB2YXJpYWJsZXNcbiAgICAvLyAgbmVnYXRpdmUgaW5kaWNlc1xuICAgIC8vICBub24taW50ZWdlciBjb2VmZmljaWVudHNcbiAgICBjb25zdCBsZWFkID0gc3RyLm1hdGNoKC9eLT9cXGQqLylbMF1cbiAgICBjb25zdCBjID0gbGVhZCA9PT0gJycgPyAxXG4gICAgICA6IGxlYWQgPT09ICctJyA/IC0xXG4gICAgICAgIDogcGFyc2VJbnQobGVhZClcbiAgICBsZXQgdnMgPSBzdHIubWF0Y2goLyhbYS16QS1aXSkoXFxeXFxkKyk/L2cpXG4gICAgaWYgKCF2cykgdnMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHYgPSB2c1tpXS5zcGxpdCgnXicpXG4gICAgICB2WzFdID0gdlsxXSA/IHBhcnNlSW50KHZbMV0pIDogMVxuICAgICAgdnNbaV0gPSB2XG4gICAgfVxuICAgIHZzID0gdnMuZmlsdGVyKHYgPT4gdlsxXSAhPT0gMClcbiAgICB0aGlzLmMgPSBjXG4gICAgdGhpcy52cyA9IG5ldyBNYXAodnMpXG4gIH1cblxuICBzdGF0aWMgdmFyICh2KSB7XG4gICAgLy8gZmFjdG9yeSBmb3IgYSBzaW5nbGUgdmFyaWFibGUgbW9ub21pYWxcbiAgICBjb25zdCBjID0gMVxuICAgIGNvbnN0IHZzID0gbmV3IE1hcChbW3YsIDFdXSlcbiAgICByZXR1cm4gbmV3IE1vbm9taWFsKGMsIHZzKVxuICB9XG59XG4iLCJpbXBvcnQgTW9ub21pYWwgZnJvbSAnTW9ub21pYWwnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBvbHlub21pYWwge1xuICBjb25zdHJ1Y3RvciAodGVybXMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0ZXJtcykgJiYgKHRlcm1zWzBdIGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0ZXJtcy5tYXAodCA9PiB0LmNsb25lKCkpXG4gICAgICB0aGlzLnRlcm1zID0gdGVybXNcbiAgICB9IGVsc2UgaWYgKCFpc05hTih0ZXJtcykpIHtcbiAgICAgIHRoaXMuaW5pdE51bSh0ZXJtcylcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0ZXJtcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuaW5pdFN0cih0ZXJtcylcbiAgICB9XG4gIH1cblxuICBpbml0U3RyIChzdHIpIHtcbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvXFwrLS9nLCAnLScpIC8vIGEgaG9ycmlibGUgYm9kZ2VcbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvLS9nLCAnKy0nKSAvLyBtYWtlIG5lZ2F0aXZlIHRlcm1zIGV4cGxpY2l0LlxuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9cXHMvZywgJycpIC8vIHN0cmlwIHdoaXRlc3BhY2VcbiAgICB0aGlzLnRlcm1zID0gc3RyLnNwbGl0KCcrJylcbiAgICAgIC5tYXAocyA9PiBuZXcgTW9ub21pYWwocykpXG4gICAgICAuZmlsdGVyKHQgPT4gdC5jICE9PSAwKVxuICB9XG5cbiAgaW5pdE51bSAobikge1xuICAgIHRoaXMudGVybXMgPSBbbmV3IE1vbm9taWFsKG4pXVxuICB9XG5cbiAgdG9MYXRleCAoKSB7XG4gICAgbGV0IHN0ciA9ICcnXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRlcm1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoaSA+IDAgJiYgdGhpcy50ZXJtc1tpXS5jID49IDApIHtcbiAgICAgICAgc3RyICs9ICcrJ1xuICAgICAgfVxuICAgICAgc3RyICs9IHRoaXMudGVybXNbaV0udG9MYXRleCgpXG4gICAgfVxuICAgIHJldHVybiBzdHJcbiAgfVxuXG4gIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gdGhpcy50b0xhVGVYKClcbiAgfVxuXG4gIGNsb25lICgpIHtcbiAgICBjb25zdCB0ZXJtcyA9IHRoaXMudGVybXMubWFwKHQgPT4gdC5jbG9uZSgpKVxuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbCh0ZXJtcylcbiAgfVxuXG4gIHNpbXBsaWZ5ICgpIHtcbiAgICAvLyBjb2xsZWN0cyBsaWtlIHRlcm1zIGFuZCByZW1vdmVzIHplcm8gdGVybXNcbiAgICAvLyBkb2VzIG5vdCBtb2RpZnkgb3JpZ2luYWxcbiAgICAvLyBUaGlzIHNlZW1zIHByb2JhYmx5IGluZWZmaWNpZW50LCBnaXZlbiB0aGUgZGF0YSBzdHJ1Y3R1cmVcbiAgICAvLyBXb3VsZCBiZSBiZXR0ZXIgdG8gdXNlIHNvbWV0aGluZyBsaWtlIGEgbGlua2VkIGxpc3QgbWF5YmU/XG4gICAgY29uc3QgdGVybXMgPSB0aGlzLnRlcm1zLnNsaWNlKClcbiAgICBsZXQgbmV3dGVybXMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGVybXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghdGVybXNbaV0pIGNvbnRpbnVlXG4gICAgICBsZXQgbmV3dGVybSA9IHRlcm1zW2ldXG4gICAgICBmb3IgKGxldCBqID0gaSArIDE7IGogPCB0ZXJtcy5sZW5ndGg7IGorKykge1xuICAgICAgICBpZiAoIXRlcm1zW2pdKSBjb250aW51ZVxuICAgICAgICBpZiAodGVybXNbal0ubGlrZSh0ZXJtc1tpXSkpIHtcbiAgICAgICAgICBuZXd0ZXJtID0gbmV3dGVybS5hZGQodGVybXNbal0pXG4gICAgICAgICAgdGVybXNbal0gPSBudWxsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG5ld3Rlcm1zLnB1c2gobmV3dGVybSlcbiAgICAgIHRlcm1zW2ldID0gbnVsbFxuICAgIH1cbiAgICBuZXd0ZXJtcyA9IG5ld3Rlcm1zLmZpbHRlcih0ID0+IHQuYyAhPT0gMClcbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwobmV3dGVybXMpXG4gIH1cblxuICBhZGQgKHRoYXQsIHNpbXBsaWZ5KSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIFBvbHlub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IFBvbHlub21pYWwodGhhdClcbiAgICB9XG4gICAgaWYgKHNpbXBsaWZ5ID09PSB1bmRlZmluZWQpIHNpbXBsaWZ5ID0gdHJ1ZVxuICAgIGNvbnN0IHRlcm1zID0gdGhpcy50ZXJtcy5jb25jYXQodGhhdC50ZXJtcylcbiAgICBsZXQgcmVzdWx0ID0gbmV3IFBvbHlub21pYWwodGVybXMpXG5cbiAgICBpZiAoc2ltcGxpZnkpIHJlc3VsdCA9IHJlc3VsdC5zaW1wbGlmeSgpXG5cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICBtdWwgKHRoYXQsIHNpbXBsaWZ5KSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIFBvbHlub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IFBvbHlub21pYWwodGhhdClcbiAgICB9XG4gICAgY29uc3QgdGVybXMgPSBbXVxuICAgIGlmIChzaW1wbGlmeSA9PT0gdW5kZWZpbmVkKSBzaW1wbGlmeSA9IHRydWVcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGVybXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhhdC50ZXJtcy5sZW5ndGg7IGorKykge1xuICAgICAgICB0ZXJtcy5wdXNoKHRoaXMudGVybXNbaV0ubXVsKHRoYXQudGVybXNbal0pKVxuICAgICAgfVxuICAgIH1cblxuICAgIGxldCByZXN1bHQgPSBuZXcgUG9seW5vbWlhbCh0ZXJtcylcbiAgICBpZiAoc2ltcGxpZnkpIHJlc3VsdCA9IHJlc3VsdC5zaW1wbGlmeSgpXG5cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICBwb3cgKG4sIHNpbXBsaWZ5KSB7XG4gICAgbGV0IHJlc3VsdCA9IHRoaXNcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IG47IGkrKykge1xuICAgICAgcmVzdWx0ID0gcmVzdWx0Lm11bCh0aGlzKVxuICAgIH1cbiAgICBpZiAoc2ltcGxpZnkpIHJlc3VsdCA9IHJlc3VsdC5zaW1wbGlmeSgpXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG5cbiAgc3RhdGljIHZhciAodikge1xuICAgIC8vIGZhY3RvcnkgZm9yIGEgc2luZ2xlIHZhcmlhYmxlIHBvbHlub21pYWxcbiAgICBjb25zdCB0ZXJtcyA9IFtNb25vbWlhbC52YXIodildXG4gICAgcmV0dXJuIG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuICB9XG5cbiAgc3RhdGljIHggKCkge1xuICAgIHJldHVybiBQb2x5bm9taWFsLnZhcigneCcpXG4gIH1cblxuICBzdGF0aWMgY29uc3QgKG4pIHtcbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwobilcbiAgfVxufVxuIiwiaW1wb3J0IHsgR3JhcGhpY1EsIEdyYXBoaWNRVmlldyB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IEZyYWN0aW9uIGZyb20gJ3ZlbmRvci9mcmFjdGlvbidcbmltcG9ydCBQb2x5bm9taWFsIGZyb20gJ1BvbHlub21pYWwnXG5pbXBvcnQgeyByYW5kRWxlbSwgcmFuZEJldHdlZW4sIHJhbmRCZXR3ZWVuRmlsdGVyLCBnY2QgfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFyaXRobWFnb25RIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpIC8vIHByb2Nlc3NlcyBvcHRpb25zIGludG8gdGhpcy5zZXR0aW5nc1xuICAgIHRoaXMuZGF0YSA9IG5ldyBBcml0aG1hZ29uUURhdGEodGhpcy5zZXR0aW5ncylcbiAgICB0aGlzLnZpZXcgPSBuZXcgQXJpdGhtYWdvblFWaWV3KHRoaXMuZGF0YSwgdGhpcy5zZXR0aW5ncylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgeyByZXR1cm4gJ0NvbXBsZXRlIHRoZSBhcml0aG1hZ29uOicgfVxufVxuXG5Bcml0aG1hZ29uUS5vcHRpb25zU3BlYyA9IFtcbiAge1xuICAgIHRpdGxlOiAnVmVydGljZXMnLFxuICAgIGlkOiAnbicsXG4gICAgdHlwZTogJ2ludCcsXG4gICAgbWluOiAzLFxuICAgIG1heDogMjAsXG4gICAgZGVmYXVsdDogM1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdUeXBlJyxcbiAgICBpZDogJ3R5cGUnLFxuICAgIHR5cGU6ICdzZWxlY3QtZXhjbHVzaXZlJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICB7IHRpdGxlOiAnSW50ZWdlciAoKyknLCBpZDogJ2ludGVnZXItYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0ludGVnZXIgKFxcdTAwZDcpJywgaWQ6ICdpbnRlZ2VyLW11bHRpcGx5JyB9LFxuICAgICAgeyB0aXRsZTogJ0ZyYWN0aW9uICgrKScsIGlkOiAnZnJhY3Rpb24tYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0ZyYWN0aW9uIChcXHUwMGQ3KScsIGlkOiAnZnJhY3Rpb24tbXVsdGlwbHknIH0sXG4gICAgICB7IHRpdGxlOiAnQWxnZWJyYSAoKyknLCBpZDogJ2FsZ2VicmEtYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0FsZ2VicmEgKFxcdTAwZDcpJywgaWQ6ICdhbGdlYnJhLW11bHRpcGx5JyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiAnaW50ZWdlci1hZGQnLFxuICAgIHZlcnRpY2FsOiB0cnVlXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1B1enpsZSB0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgaWQ6ICdwdXpfZGlmZicsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ01pc3NpbmcgZWRnZXMnLCBpZDogJzEnIH0sXG4gICAgICB7IHRpdGxlOiAnTWl4ZWQnLCBpZDogJzInIH0sXG4gICAgICB7IHRpdGxlOiAnTWlzc2luZyB2ZXJ0aWNlcycsIGlkOiAnMycgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogJzEnXG4gIH1cbl1cblxuY2xhc3MgQXJpdGhtYWdvblFEYXRhIC8qIGV4dGVuZHMgR3JhcGhpY1FEYXRhICovIHtcbiAgLy8gVE9ETyBzaW1wbGlmeSBjb25zdHJ1Y3Rvci4gTW92ZSBsb2dpYyBpbnRvIHN0YXRpYyBmYWN0b3J5IG1ldGhvZHNcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICAvLyAxLiBTZXQgcHJvcGVydGllcyBmcm9tIG9wdGlvbnNcbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIG46IDMsIC8vIG51bWJlciBvZiB2ZXJ0aWNlc1xuICAgICAgbWluOiAtMjAsXG4gICAgICBtYXg6IDIwLFxuICAgICAgbnVtX2RpZmY6IDEsIC8vIGNvbXBsZXhpdHkgb2Ygd2hhdCdzIGluIHZlcnRpY2VzL2VkZ2VzXG4gICAgICBwdXpfZGlmZjogMSwgLy8gMSAtIFZlcnRpY2VzIGdpdmVuLCAyIC0gdmVydGljZXMvZWRnZXM7IGdpdmVuIDMgLSBvbmx5IGVkZ2VzXG4gICAgICB0eXBlOiAnaW50ZWdlci1hZGQnIC8vIFt0eXBlXS1bb3BlcmF0aW9uXSB3aGVyZSBbdHlwZV0gPSBpbnRlZ2VyLCAuLi5cbiAgICAgIC8vIGFuZCBbb3BlcmF0aW9uXSA9IGFkZC9tdWx0aXBseVxuICAgIH1cblxuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgdGhpcy5zZXR0aW5ncywgb3B0aW9ucylcbiAgICB0aGlzLnNldHRpbmdzLm51bV9kaWZmID0gdGhpcy5zZXR0aW5ncy5kaWZmaWN1bHR5XG4gICAgdGhpcy5zZXR0aW5ncy5wdXpfZGlmZiA9IHBhcnNlSW50KHRoaXMuc2V0dGluZ3MucHV6X2RpZmYpIC8vISA/IFRoaXMgc2hvdWxkIGhhdmUgYmVlbiBkb25lIHVwc3RyZWFtLi4uXG5cbiAgICB0aGlzLm4gPSB0aGlzLnNldHRpbmdzLm5cbiAgICB0aGlzLnZlcnRpY2VzID0gW11cbiAgICB0aGlzLnNpZGVzID0gW11cblxuICAgIGlmICh0aGlzLnNldHRpbmdzLnR5cGUuZW5kc1dpdGgoJ2FkZCcpKSB7XG4gICAgICB0aGlzLm9wbmFtZSA9ICcrJ1xuICAgICAgdGhpcy5vcCA9ICh4LCB5KSA9PiB4LmFkZCh5KVxuICAgIH0gZWxzZSBpZiAodGhpcy5zZXR0aW5ncy50eXBlLmVuZHNXaXRoKCdtdWx0aXBseScpKSB7XG4gICAgICB0aGlzLm9wbmFtZSA9ICdcXHUwMGQ3J1xuICAgICAgdGhpcy5vcCA9ICh4LCB5KSA9PiB4Lm11bCh5KVxuICAgIH1cblxuICAgIC8vIDIuIEluaXRpYWxpc2UgYmFzZWQgb24gdHlwZVxuICAgIHN3aXRjaCAodGhpcy5zZXR0aW5ncy50eXBlKSB7XG4gICAgICBjYXNlICdpbnRlZ2VyLWFkZCc6XG4gICAgICBjYXNlICdpbnRlZ2VyLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0SW50ZWdlcih0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnZnJhY3Rpb24tYWRkJzpcbiAgICAgICAgdGhpcy5pbml0RnJhY3Rpb25BZGQodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2ZyYWN0aW9uLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0RnJhY3Rpb25NdWx0aXBseSh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnYWxnZWJyYS1hZGQnOlxuICAgICAgICB0aGlzLmluaXRBbGdlYnJhQWRkKHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdhbGdlYnJhLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0QWxnZWJyYU11bHRpcGx5KHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgc3dpdGNoIGRlZmF1bHQnKVxuICAgIH1cblxuICAgIHRoaXMuY2FsY3VsYXRlRWRnZXMoKSAvLyBVc2Ugb3AgZnVuY3Rpb25zIHRvIGZpbGwgaW4gdGhlIGVkZ2VzXG4gICAgdGhpcy5oaWRlTGFiZWxzKHRoaXMuc2V0dGluZ3MucHV6X2RpZmYpIC8vIHNldCBzb21lIHZlcnRpY2VzL2VkZ2VzIGFzIGhpZGRlbiBkZXBlbmRpbmcgb24gZGlmZmljdWx0eVxuICB9XG5cbiAgLyogTWV0aG9kcyBpbml0aWFsaXNpbmcgdmVydGljZXMgKi9cblxuICBpbml0SW50ZWdlciAoc2V0dGluZ3MpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihyYW5kQmV0d2VlbkZpbHRlcihcbiAgICAgICAgICBzZXR0aW5ncy5taW4sXG4gICAgICAgICAgc2V0dGluZ3MubWF4LFxuICAgICAgICAgIHggPT4gKHNldHRpbmdzLnR5cGUuZW5kc1dpdGgoJ2FkZCcpIHx8IHggIT09IDApXG4gICAgICAgICkpLFxuICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEZyYWN0aW9uQWRkIChzZXR0aW5ncykge1xuICAgIC8qIERpZmZpY3VsdHkgc2V0dGluZ3M6XG4gICAgICogMTogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIHNhbWUgZGVub21pbmF0b3IsIG5vIGNhbmNlbGxpbmcgYWZ0ZXIgRE9ORVxuICAgICAqIDI6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBzYW1lIGRlbm9taW5hdG9yLCBubyBjYW5jZWxsbGluZyBhbnN3ZXIgaW1wcm9wZXIgZnJhY3Rpb25cbiAgICAgKiAzOiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggb25lIGRlbm9taW5hdG9yIGEgbXVsdGlwbGUgb2YgYW5vdGhlciwgZ2l2ZXMgcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNDogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIG9uZSBkZW5vbWluYXRvciBhIG11bHRpcGxlIG9mIGFub3RoZXIsIGdpdmVzIGltcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNTogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIGRpZmZlcmVudCBkZW5vbWluYXRvcnMgKG5vdCBjby1wcmltZSksIGdpdmVzIGltcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNjogbWl4ZWQgbnVtYmVyc1xuICAgICAqIDc6IG1peGVkIG51bWJlcnMsIGJpZ2dlciBudW1lcmF0b3JzIGFuZCBkZW5vbWluYXRvcnNcbiAgICAgKiA4OiBtaXhlZCBudW1iZXJzLCBiaWcgaW50ZWdlciBwYXJ0c1xuICAgICAqL1xuXG4gICAgLy8gVE9ETyAtIGFueXRoaW5nIG90aGVyIHRoYW4gZGlmZmljdWx0eSAxLlxuICAgIGNvbnN0IGRpZmYgPSBzZXR0aW5ncy5udW1fZGlmZlxuICAgIGlmIChkaWZmIDwgMykge1xuICAgICAgY29uc3QgZGVuID0gcmFuZEVsZW0oWzUsIDcsIDksIDExLCAxMywgMTddKVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICBjb25zdCBwcmV2bnVtID0gdGhpcy52ZXJ0aWNlc1tpIC0gMV1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbaSAtIDFdLnZhbC5uIDogdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IG5leHRudW0gPSB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dLnZhbC5uIDogdW5kZWZpbmVkXG5cbiAgICAgICAgY29uc3QgbWF4bnVtID1cbiAgICAgICAgICBkaWZmID09PSAyID8gZGVuIC0gMVxuICAgICAgICAgICAgOiBuZXh0bnVtID8gZGVuIC0gTWF0aC5tYXgobmV4dG51bSwgcHJldm51bSlcbiAgICAgICAgICAgICAgOiBwcmV2bnVtID8gZGVuIC0gcHJldm51bVxuICAgICAgICAgICAgICAgIDogZGVuIC0gMVxuXG4gICAgICAgIGNvbnN0IG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKDEsIG1heG51bSwgeCA9PiAoXG4gICAgICAgICAgLy8gRW5zdXJlcyBubyBzaW1wbGlmaW5nIGFmdGVyd2FyZHMgaWYgZGlmZmljdWx0eSBpcyAxXG4gICAgICAgICAgZ2NkKHgsIGRlbikgPT09IDEgJiZcbiAgICAgICAgICAoIXByZXZudW0gfHwgZ2NkKHggKyBwcmV2bnVtLCBkZW4pID09PSAxIHx8IHggKyBwcmV2bnVtID09PSBkZW4pICYmXG4gICAgICAgICAgKCFuZXh0bnVtIHx8IGdjZCh4ICsgbmV4dG51bSwgZGVuKSA9PT0gMSB8fCB4ICsgbmV4dG51bSA9PT0gZGVuKVxuICAgICAgICApKVxuXG4gICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24obnVtLCBkZW4pLFxuICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBkZW5iYXNlID0gcmFuZEVsZW0oXG4gICAgICAgIGRpZmYgPCA3ID8gWzIsIDMsIDVdIDogWzIsIDMsIDQsIDUsIDYsIDcsIDgsIDksIDEwLCAxMV1cbiAgICAgIClcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgY29uc3QgcHJldiA9IHRoaXMudmVydGljZXNbaSAtIDFdXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzW2kgLSAxXS52YWwgOiB1bmRlZmluZWRcbiAgICAgICAgY29uc3QgbmV4dCA9IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl0udmFsIDogdW5kZWZpbmVkXG5cbiAgICAgICAgY29uc3QgbWF4bXVsdGlwbGllciA9IGRpZmYgPCA3ID8gNCA6IDhcblxuICAgICAgICBjb25zdCBtdWx0aXBsaWVyID1cbiAgICAgICAgICBpICUgMiA9PT0gMSB8fCBkaWZmID4gNCA/IHJhbmRCZXR3ZWVuRmlsdGVyKDIsIG1heG11bHRpcGxpZXIsIHggPT5cbiAgICAgICAgICAgICghcHJldiB8fCB4ICE9PSBwcmV2LmQgLyBkZW5iYXNlKSAmJlxuICAgICAgICAgICAgKCFuZXh0IHx8IHggIT09IG5leHQuZCAvIGRlbmJhc2UpXG4gICAgICAgICAgKSA6IDFcblxuICAgICAgICBjb25zdCBkZW4gPSBkZW5iYXNlICogbXVsdGlwbGllclxuXG4gICAgICAgIGxldCBudW1cbiAgICAgICAgaWYgKGRpZmYgPCA2KSB7XG4gICAgICAgICAgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoMSwgZGVuIC0gMSwgeCA9PiAoXG4gICAgICAgICAgICBnY2QoeCwgZGVuKSA9PT0gMSAmJlxuICAgICAgICAgICAgKGRpZmYgPj0gNCB8fCAhcHJldiB8fCBwcmV2LmFkZCh4LCBkZW4pIDw9IDEpICYmXG4gICAgICAgICAgICAoZGlmZiA+PSA0IHx8ICFuZXh0IHx8IG5leHQuYWRkKHgsIGRlbikgPD0gMSlcbiAgICAgICAgICApKVxuICAgICAgICB9IGVsc2UgaWYgKGRpZmYgPCA4KSB7XG4gICAgICAgICAgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoZGVuICsgMSwgZGVuICogNiwgeCA9PiBnY2QoeCwgZGVuKSA9PT0gMSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBudW0gPSByYW5kQmV0d2VlbkZpbHRlcihkZW4gKiAxMCwgZGVuICogMTAwLCB4ID0+IGdjZCh4LCBkZW4pID09PSAxKVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihudW0sIGRlbiksXG4gICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEZyYWN0aW9uTXVsdGlwbHkgKHNldHRpbmdzKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgY29uc3QgZCA9IHJhbmRCZXR3ZWVuKDIsIDEwKVxuICAgICAgY29uc3QgbiA9IHJhbmRCZXR3ZWVuKDEsIGQgLSAxKVxuICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24obiwgZCksXG4gICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0QWxnZWJyYUFkZCAoc2V0dGluZ3MpIHtcbiAgICBjb25zdCBkaWZmID0gc2V0dGluZ3MubnVtX2RpZmZcbiAgICBzd2l0Y2ggKGRpZmYpIHtcbiAgICAgIGNhc2UgMToge1xuICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2YXJpYWJsZSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDI6XG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGlmIChNYXRoLnJhbmRvbSgpIDwgMC41KSB7IC8vIHZhcmlhYmxlICsgY29uc3RhbnRcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgY29uc3RhbnQgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbChjb2VmZiArIHZhcmlhYmxlICsgJysnICsgY29uc3RhbnQpLFxuICAgICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IHZhcmlhYmxlMSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgICAgbGV0IHZhcmlhYmxlMiA9IHZhcmlhYmxlMVxuICAgICAgICAgIHdoaWxlICh2YXJpYWJsZTIgPT09IHZhcmlhYmxlMSkge1xuICAgICAgICAgICAgdmFyaWFibGUyID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBjb2VmZjEgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgY29lZmYyID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYxICsgdmFyaWFibGUxICsgJysnICsgY29lZmYyICsgdmFyaWFibGUyKSxcbiAgICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRBbGdlYnJhTXVsdGlwbHkgKHNldHRpbmdzKSB7XG4gICAgLyogRGlmZmljdWx0eTpcbiAgICAgKiAxOiBBbHRlcm5hdGUgM2Egd2l0aCA0XG4gICAgICogMjogQWxsIHRlcm1zIG9mIHRoZSBmb3JtIG52IC0gdXAgdG8gdHdvIHZhcmlhYmxlc1xuICAgICAqIDM6IEFsbCB0ZXJtcyBvZiB0aGUgZm9ybSBudl5tLiBPbmUgdmFyaWFibGUgb25seVxuICAgICAqIDQ6IEFMbCB0ZXJtcyBvZiB0aGUgZm9ybSBueF5rIHlebCB6XnAuIGssbCxwIDAtM1xuICAgICAqIDU6IEV4cGFuZCBicmFja2V0cyAzKDJ4KzUpXG4gICAgICogNjogRXhwYW5kIGJyYWNrZXRzIDN4KDJ4KzUpXG4gICAgICogNzogRXhwYW5kIGJyYWNrZXRzIDN4XjJ5KDJ4eSs1eV4yKVxuICAgICAqIDg6IEV4cGFuZCBicmFja2V0cyAoeCszKSh4KzIpXG4gICAgICogOTogRXhwYW5kIGJyYWNrZXRzICgyeC0zKSgzeCs0KVxuICAgICAqIDEwOiBFeHBhbmQgYnJhY2tldHMgKDJ4XjItM3grNCkoMngtNSlcbiAgICAgKi9cbiAgICBjb25zdCBkaWZmID0gc2V0dGluZ3MubnVtX2RpZmZcbiAgICBzd2l0Y2ggKGRpZmYpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgIHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IHRlcm0gPSBpICUgMiA9PT0gMCA/IGNvZWZmIDogY29lZmYgKyB2YXJpYWJsZVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDI6IHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUxID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgY29uc3QgdmFyaWFibGUyID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZSA9IHJhbmRFbGVtKFt2YXJpYWJsZTEsIHZhcmlhYmxlMl0pXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2YXJpYWJsZSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgMzoge1xuICAgICAgICBjb25zdCB2ID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBpZHggPSByYW5kQmV0d2VlbigxLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2ICsgJ14nICsgaWR4KSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSA0OiB7XG4gICAgICAgIGNvbnN0IHN0YXJ0QXNjaWkgPSByYW5kQmV0d2Vlbig5NywgMTIwKVxuICAgICAgICBjb25zdCB2MSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSlcbiAgICAgICAgY29uc3QgdjIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkgKyAxKVxuICAgICAgICBjb25zdCB2MyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSArIDIpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBhID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMSA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMiA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMyA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCB0ZXJtID0gYSArIHYxICsgbjEgKyB2MiArIG4yICsgdjMgKyBuM1xuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDU6XG4gICAgICBjYXNlIDY6IHsgLy8gZS5nLiAzKHgpICogKDJ4LTUpXG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBjb25zdGFudCA9IHJhbmRCZXR3ZWVuKC05LCA5KS50b1N0cmluZygpXG4gICAgICAgICAgbGV0IHRlcm0gPSBjb2VmZlxuICAgICAgICAgIGlmIChkaWZmID09PSA2IHx8IGkgJSAyID09PSAxKSB0ZXJtICs9IHZhcmlhYmxlXG4gICAgICAgICAgaWYgKGkgJSAyID09PSAxKSB0ZXJtICs9ICcrJyArIGNvbnN0YW50XG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgNzogeyAvLyBlLmcuIDN4XjJ5KDR4eV4yKzV4eSlcbiAgICAgICAgY29uc3Qgc3RhcnRBc2NpaSA9IHJhbmRCZXR3ZWVuKDk3LCAxMjApXG4gICAgICAgIGNvbnN0IHYxID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpKVxuICAgICAgICBjb25zdCB2MiA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSArIDEpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBhMSA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjExID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4xMiA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBsZXQgdGVybSA9IGExICsgdjEgKyBuMTEgKyB2MiArIG4xMlxuICAgICAgICAgIGlmIChpICUgMiA9PT0gMSkge1xuICAgICAgICAgICAgY29uc3QgYTIgPSByYW5kQmV0d2VlbigtOSwgOSkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgbjIxID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgbjIyID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgICAgdGVybSArPSAnKycgKyBhMiArIHYxICsgbjIxICsgdjIgKyBuMjJcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgODogLy8geyBlLmcuICh4KzUpICogKHgtMilcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29uc3RhbnQgPSByYW5kQmV0d2VlbigtOSwgOSkudG9TdHJpbmcoKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHZhcmlhYmxlICsgJysnICsgY29uc3RhbnQpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qIE1ldGhvZCB0byBjYWxjdWxhdGUgZWRnZXMgZnJvbSB2ZXJ0aWNlcyAqL1xuICBjYWxjdWxhdGVFZGdlcyAoKSB7XG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBlZGdlcyBnaXZlbiB0aGUgdmVydGljZXMgdXNpbmcgdGhpcy5vcFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIHRoaXMuc2lkZXNbaV0gPSB7XG4gICAgICAgIHZhbDogdGhpcy5vcCh0aGlzLnZlcnRpY2VzW2ldLnZhbCwgdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXS52YWwpLFxuICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyogTWFyayBoaWRkZW5kIGVkZ2VzL3ZlcnRpY2VzICovXG5cbiAgaGlkZUxhYmVscyAocHV6emxlRGlmZmljdWx0eSkge1xuICAgIC8vIEhpZGUgc29tZSBsYWJlbHMgdG8gbWFrZSBhIHB1enpsZVxuICAgIC8vIDEgLSBTaWRlcyBoaWRkZW4sIHZlcnRpY2VzIHNob3duXG4gICAgLy8gMiAtIFNvbWUgc2lkZXMgaGlkZGVuLCBzb21lIHZlcnRpY2VzIGhpZGRlblxuICAgIC8vIDMgLSBBbGwgdmVydGljZXMgaGlkZGVuXG4gICAgc3dpdGNoIChwdXp6bGVEaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHRoaXMuc2lkZXMuZm9yRWFjaCh4ID0+IHsgeC5oaWRkZW4gPSB0cnVlIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDI6IHtcbiAgICAgICAgdGhpcy5zaWRlcy5mb3JFYWNoKHggPT4geyB4LmhpZGRlbiA9IHRydWUgfSlcbiAgICAgICAgY29uc3Qgc2hvd3NpZGUgPSByYW5kQmV0d2VlbigwLCB0aGlzLm4gLSAxLCBNYXRoLnJhbmRvbSlcbiAgICAgICAgY29uc3QgaGlkZXZlcnQgPSBNYXRoLnJhbmRvbSgpIDwgMC41XG4gICAgICAgICAgPyBzaG93c2lkZSAvLyBwcmV2aW91cyB2ZXJ0ZXhcbiAgICAgICAgICA6IChzaG93c2lkZSArIDEpICUgdGhpcy5uIC8vIG5leHQgdmVydGV4O1xuXG4gICAgICAgIHRoaXMuc2lkZXNbc2hvd3NpZGVdLmhpZGRlbiA9IGZhbHNlXG4gICAgICAgIHRoaXMudmVydGljZXNbaGlkZXZlcnRdLmhpZGRlbiA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgMzpcbiAgICAgICAgdGhpcy52ZXJ0aWNlcy5mb3JFYWNoKHggPT4geyB4LmhpZGRlbiA9IHRydWUgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm9fZGlmZmljdWx0eScpXG4gICAgfVxuICB9XG59XG5cbmNsYXNzIEFyaXRobWFnb25RVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIGNvbnN0cnVjdG9yIChkYXRhLCBvcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc2V0cyB0aGlzLndpZHRoIHRoaXMuaGVpZ2h0LCBpbml0aWFsaXNlcyB0aGlzLmxhYmVscywgY3JlYXRlcyBkb20gZWxlbWVudHNcblxuICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aFxuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuaGVpZ2h0XG4gICAgY29uc3QgciA9IDAuMzUgKiBNYXRoLm1pbih3aWR0aCwgaGVpZ2h0KSAvLyByYWRpdXNcbiAgICBjb25zdCBuID0gdGhpcy5kYXRhLm5cblxuICAgIC8vIEEgcG9pbnQgdG8gbGFiZWwgd2l0aCB0aGUgb3BlcmF0aW9uXG4gICAgLy8gQWxsIHBvaW50cyBmaXJzdCBzZXQgdXAgd2l0aCAoMCwwKSBhdCBjZW50ZXJcbiAgICB0aGlzLm9wZXJhdGlvblBvaW50ID0gbmV3IFBvaW50KDAsIDApXG5cbiAgICAvLyBQb3NpdGlvbiBvZiB2ZXJ0aWNlc1xuICAgIHRoaXMudmVydGV4UG9pbnRzID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgY29uc3QgYW5nbGUgPSBpICogTWF0aC5QSSAqIDIgLyBuIC0gTWF0aC5QSSAvIDJcbiAgICAgIHRoaXMudmVydGV4UG9pbnRzW2ldID0gUG9pbnQuZnJvbVBvbGFyKHIsIGFuZ2xlKVxuICAgIH1cblxuICAgIC8vIFBvaXNpdGlvbiBvZiBzaWRlIGxhYmVsc1xuICAgIHRoaXMuc2lkZVBvaW50cyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIHRoaXMuc2lkZVBvaW50c1tpXSA9IFBvaW50Lm1lYW4odGhpcy52ZXJ0ZXhQb2ludHNbaV0sIHRoaXMudmVydGV4UG9pbnRzWyhpICsgMSkgJSBuXSlcbiAgICB9XG5cbiAgICB0aGlzLmFsbFBvaW50cyA9IFt0aGlzLm9wZXJhdGlvblBvaW50XS5jb25jYXQodGhpcy52ZXJ0ZXhQb2ludHMpLmNvbmNhdCh0aGlzLnNpZGVQb2ludHMpXG5cbiAgICB0aGlzLnJlQ2VudGVyKCkgLy8gUmVwb3NpdGlvbiBldmVyeXRoaW5nIHByb3Blcmx5XG5cbiAgICB0aGlzLm1ha2VMYWJlbHModHJ1ZSlcblxuICAgIC8vIERyYXcgaW50byBjYW52YXNcbiAgfVxuXG4gIHJlQ2VudGVyICgpIHtcbiAgICAvLyBGaW5kIHRoZSBjZW50ZXIgb2YgdGhlIGJvdW5kaW5nIGJveFxuICAgIGNvbnN0IHRvcGxlZnQgPSBQb2ludC5taW4odGhpcy5hbGxQb2ludHMpXG4gICAgY29uc3QgYm90dG9tcmlnaHQgPSBQb2ludC5tYXgodGhpcy5hbGxQb2ludHMpXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbih0b3BsZWZ0LCBib3R0b21yaWdodClcblxuICAgIC8vIHRyYW5zbGF0ZSB0byBwdXQgaW4gdGhlIGNlbnRlclxuICAgIHRoaXMuYWxsUG9pbnRzLmZvckVhY2gocCA9PiB7XG4gICAgICBwLnRyYW5zbGF0ZSh0aGlzLndpZHRoIC8gMiAtIGNlbnRlci54LCB0aGlzLmhlaWdodCAvIDIgLSBjZW50ZXIueSlcbiAgICB9KVxuICB9XG5cbiAgbWFrZUxhYmVscyAoKSB7XG4gICAgLy8gdmVydGljZXNcbiAgICB0aGlzLmRhdGEudmVydGljZXMuZm9yRWFjaCgodiwgaSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSB2LnZhbC50b0xhdGV4XG4gICAgICAgID8gdi52YWwudG9MYXRleCh0cnVlKVxuICAgICAgICA6IHYudmFsLnRvU3RyaW5nKClcbiAgICAgIHRoaXMubGFiZWxzLnB1c2goe1xuICAgICAgICBwb3M6IHRoaXMudmVydGV4UG9pbnRzW2ldLFxuICAgICAgICB0ZXh0cTogdi5oaWRkZW4gPyAnJyA6IHZhbHVlLFxuICAgICAgICB0ZXh0YTogdmFsdWUsXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCB2ZXJ0ZXgnLFxuICAgICAgICBzdHlsZWE6IHYuaGlkZGVuID8gJ2Fuc3dlciB2ZXJ0ZXgnIDogJ25vcm1hbCB2ZXJ0ZXgnXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBzaWRlc1xuICAgIHRoaXMuZGF0YS5zaWRlcy5mb3JFYWNoKCh2LCBpKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHYudmFsLnRvTGF0ZXhcbiAgICAgICAgPyB2LnZhbC50b0xhdGV4KHRydWUpXG4gICAgICAgIDogdi52YWwudG9TdHJpbmcoKVxuICAgICAgdGhpcy5sYWJlbHMucHVzaCh7XG4gICAgICAgIHBvczogdGhpcy5zaWRlUG9pbnRzW2ldLFxuICAgICAgICB0ZXh0cTogdi5oaWRkZW4gPyAnJyA6IHZhbHVlLFxuICAgICAgICB0ZXh0YTogdmFsdWUsXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCBzaWRlJyxcbiAgICAgICAgc3R5bGVhOiB2LmhpZGRlbiA/ICdhbnN3ZXIgc2lkZScgOiAnbm9ybWFsIHNpZGUnXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBvcGVyYXRpb25cbiAgICB0aGlzLmxhYmVscy5wdXNoKHtcbiAgICAgIHBvczogdGhpcy5vcGVyYXRpb25Qb2ludCxcbiAgICAgIHRleHRxOiB0aGlzLmRhdGEub3BuYW1lLFxuICAgICAgdGV4dGE6IHRoaXMuZGF0YS5vcG5hbWUsXG4gICAgICBzdHlsZXE6ICdub3JtYWwnLFxuICAgICAgc3R5bGVhOiAnbm9ybWFsJ1xuICAgIH0pXG5cbiAgICAvLyBzdHlsaW5nXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gIH1cblxuICByZW5kZXIgKCkge1xuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICBjb25zdCBuID0gdGhpcy5kYXRhLm5cblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBjb25zdCBwID0gdGhpcy52ZXJ0ZXhQb2ludHNbaV1cbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnZlcnRleFBvaW50c1soaSArIDEpICUgbl1cbiAgICAgIGN0eC5tb3ZlVG8ocC54LCBwLnkpXG4gICAgICBjdHgubGluZVRvKG5leHQueCwgbmV4dC55KVxuICAgIH1cbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIC8vIHBsYWNlIGxhYmVsc1xuICAgIHRoaXMucmVuZGVyTGFiZWxzKHRydWUpXG4gIH1cblxuICBzaG93QW5zd2VyICgpIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0YVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVhXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyh0cnVlKVxuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyh0cnVlKVxuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICB9XG59XG4iLCJpbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5pbXBvcnQgeyByYW5kRWxlbSB9IGZyb20gJ1V0aWxpdGllcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGVzdFEgZXh0ZW5kcyBUZXh0USB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYScsXG4gICAgICB0ZXN0MTogWydmb28nXSxcbiAgICAgIHRlc3QyOiB0cnVlXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICB0aGlzLmxhYmVsID0gc2V0dGluZ3MubGFiZWxcblxuICAgIC8vIHBpY2sgYSByYW5kb20gb25lIG9mIHRoZSBzZWxlY3RlZFxuICAgIGxldCB0ZXN0MVxuICAgIGlmIChzZXR0aW5ncy50ZXN0MS5sZW5ndGggPT09IDApIHtcbiAgICAgIHRlc3QxID0gJ25vbmUnXG4gICAgfSBlbHNlIHtcbiAgICAgIHRlc3QxID0gcmFuZEVsZW0oc2V0dGluZ3MudGVzdDEpXG4gICAgfVxuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gJ2Q6ICcgKyBzZXR0aW5ncy5kaWZmaWN1bHR5ICsgJ1xcXFxcXFxcIHRlc3QxOiAnICsgdGVzdDFcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJ3Rlc3QyOiAnICsgc2V0dGluZ3MudGVzdDJcblxuICAgIHRoaXMucmVuZGVyKClcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgeyByZXR1cm4gJ1Rlc3QgY29tbWFuZCB3b3JkJyB9XG59XG5cblRlc3RRLm9wdGlvbnNTcGVjID0gW1xuICB7XG4gICAgdGl0bGU6ICdUZXN0IG9wdGlvbiAxJyxcbiAgICBpZDogJ3Rlc3QxJyxcbiAgICB0eXBlOiAnc2VsZWN0LWluY2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogWydmb28nLCAnYmFyJywgJ3dpenonXSxcbiAgICBkZWZhdWx0OiBbXVxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdUZXN0IG9wdGlvbiAyJyxcbiAgICBpZDogJ3Rlc3QyJyxcbiAgICB0eXBlOiAnYm9vbCcsXG4gICAgZGVmYXVsdDogdHJ1ZVxuICB9XG5dXG4iLCJpbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5pbXBvcnQgeyByYW5kQmV0d2VlbiB9IGZyb20gJ1V0aWxpdGllcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQWRkQVplcm8gZXh0ZW5kcyBUZXh0USB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYSdcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIHRoaXMubGFiZWwgPSBzZXR0aW5ncy5sYWJlbFxuXG4gICAgLy8gcmFuZG9tIDIgZGlnaXQgJ2RlY2ltYWwnXG4gICAgY29uc3QgcSA9IFN0cmluZyhyYW5kQmV0d2VlbigxLCA5KSkgKyBTdHJpbmcocmFuZEJldHdlZW4oMCwgOSkpICsgJy4nICsgU3RyaW5nKHJhbmRCZXR3ZWVuKDAsIDkpKVxuICAgIGNvbnN0IGEgPSBxICsgJzAnXG5cbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSBxICsgJ1xcXFx0aW1lcyAxMCdcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJz0gJyArIGFcblxuICAgIHRoaXMucmVuZGVyKClcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRXZhbHVhdGUnXG4gIH1cbn1cblxuQWRkQVplcm8ub3B0aW9uc1NwZWMgPSBbXG5dXG4iLCJpbXBvcnQgeyByYW5kQmV0d2VlbiB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCBGcmFjdGlvbiBmcm9tICd2ZW5kb3IvZnJhY3Rpb24nXG5cbi8qIE1haW4gcXVlc3Rpb24gY2xhc3MuIFRoaXMgd2lsbCBiZSBzcHVuIG9mZiBpbnRvIGRpZmZlcmVudCBmaWxlIGFuZCBnZW5lcmFsaXNlZCAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRXF1YXRpb25PZkxpbmUgZXh0ZW5kcyBUZXh0USB7XG4gIC8vICdleHRlbmRzJyBRdWVzdGlvbiwgYnV0IG5vdGhpbmcgdG8gYWN0dWFsbHkgZXh0ZW5kXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgLy8gYm9pbGVycGxhdGVcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiAyXG4gICAgfVxuXG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcbiAgICBjb25zdCBkaWZmaWN1bHR5ID0gTWF0aC5jZWlsKHNldHRpbmdzLmRpZmZpY3VsdHkgLyAyKSAvLyBpbml0aWFsbHkgd3JpdHRlbiBmb3IgZGlmZmljdWx0eSAxLTQsIG5vdyBuZWVkIDEtMTBcblxuICAgIC8vIHF1ZXN0aW9uIGdlbmVyYXRpb24gYmVnaW5zIGhlcmVcbiAgICBsZXQgbSwgYywgeDEsIHkxLCB4MiwgeTJcbiAgICBsZXQgbWlubSwgbWF4bSwgbWluYywgbWF4Y1xuXG4gICAgc3dpdGNoIChkaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6IC8vIG0+MCwgYz49MFxuICAgICAgY2FzZSAyOlxuICAgICAgY2FzZSAzOlxuICAgICAgICBtaW5tID0gZGlmZmljdWx0eSA8IDMgPyAxIDogLTVcbiAgICAgICAgbWF4bSA9IDVcbiAgICAgICAgbWluYyA9IGRpZmZpY3VsdHkgPCAyID8gMCA6IC0xMFxuICAgICAgICBtYXhjID0gMTBcbiAgICAgICAgbSA9IHJhbmRCZXR3ZWVuKG1pbm0sIG1heG0pXG4gICAgICAgIGMgPSByYW5kQmV0d2VlbihtaW5jLCBtYXhjKVxuICAgICAgICB4MSA9IGRpZmZpY3VsdHkgPCAzID8gcmFuZEJldHdlZW4oMCwgMTApIDogcmFuZEJldHdlZW4oLTE1LCAxNSlcbiAgICAgICAgeTEgPSBtICogeDEgKyBjXG5cbiAgICAgICAgaWYgKGRpZmZpY3VsdHkgPCAzKSB7XG4gICAgICAgICAgeDIgPSByYW5kQmV0d2Vlbih4MSArIDEsIDE1KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHgyID0geDFcbiAgICAgICAgICB3aGlsZSAoeDIgPT09IHgxKSB7IHgyID0gcmFuZEJldHdlZW4oLTE1LCAxNSkgfTtcbiAgICAgICAgfVxuICAgICAgICB5MiA9IG0gKiB4MiArIGNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNDogLy8gbSBmcmFjdGlvbiwgcG9pbnRzIGFyZSBpbnRlZ2Vyc1xuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBjb25zdCBtZCA9IHJhbmRCZXR3ZWVuKDEsIDUpXG4gICAgICAgIGNvbnN0IG1uID0gcmFuZEJldHdlZW4oLTUsIDUpXG4gICAgICAgIG0gPSBuZXcgRnJhY3Rpb24obW4sIG1kKVxuICAgICAgICB4MSA9IG5ldyBGcmFjdGlvbihyYW5kQmV0d2VlbigtMTAsIDEwKSlcbiAgICAgICAgeTEgPSBuZXcgRnJhY3Rpb24ocmFuZEJldHdlZW4oLTEwLCAxMCkpXG4gICAgICAgIGMgPSBuZXcgRnJhY3Rpb24oeTEpLnN1YihtLm11bCh4MSkpXG4gICAgICAgIHgyID0geDEuYWRkKHJhbmRCZXR3ZWVuKDEsIDUpICogbS5kKVxuICAgICAgICB5MiA9IG0ubXVsKHgyKS5hZGQoYylcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB4c3RyID1cbiAgICAgIChtID09PSAwIHx8IChtLmVxdWFscyAmJiBtLmVxdWFscygwKSkpID8gJydcbiAgICAgICAgOiAobSA9PT0gMSB8fCAobS5lcXVhbHMgJiYgbS5lcXVhbHMoMSkpKSA/ICd4J1xuICAgICAgICAgIDogKG0gPT09IC0xIHx8IChtLmVxdWFscyAmJiBtLmVxdWFscygtMSkpKSA/ICcteCdcbiAgICAgICAgICAgIDogKG0udG9MYXRleCkgPyBtLnRvTGF0ZXgoKSArICd4J1xuICAgICAgICAgICAgICA6IChtICsgJ3gnKVxuXG4gICAgY29uc3QgY29uc3RzdHIgPSAvLyBUT0RPOiBXaGVuIG09Yz0wXG4gICAgICAoYyA9PT0gMCB8fCAoYy5lcXVhbHMgJiYgYy5lcXVhbHMoMCkpKSA/ICcnXG4gICAgICAgIDogKGMgPCAwKSA/ICgnIC0gJyArIChjLm5lZyA/IGMubmVnKCkudG9MYXRleCgpIDogLWMpKVxuICAgICAgICAgIDogKGMudG9MYXRleCkgPyAoJyArICcgKyBjLnRvTGF0ZXgoKSlcbiAgICAgICAgICAgIDogKCcgKyAnICsgYylcblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICcoJyArIHgxICsgJywgJyArIHkxICsgJylcXFxcdGV4dHsgYW5kIH0oJyArIHgyICsgJywgJyArIHkyICsgJyknXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICd5ID0gJyArIHhzdHIgKyBjb25zdHN0clxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdGaW5kIHRoZSBlcXVhdGlvbiBvZiB0aGUgbGluZSB0aHJvdWdoJ1xuICB9XG59XG4iLCIvKiBSZW5kZXJzIG1pc3NpbmcgYW5nbGVzIHByb2JsZW0gd2hlbiB0aGUgYW5nbGVzIGFyZSBhdCBhIHBvaW50XG4gKiBJLmUuIG9uIGEgc3RyYWlnaHQgbGluZSBvciBhcm91bmQgYSBwb2ludFxuICogQ291bGQgYWxzbyBiZSBhZGFwdGVkIHRvIGFuZ2xlcyBmb3JtaW5nIGEgcmlnaHQgYW5nbGVcbiAqXG4gKiBTaG91bGQgYmUgZmxleGlibGUgZW5vdWdoIGZvciBudW1lcmljYWwgcHJvYmxlbXMgb3IgYWxnZWJyYWljIG9uZXNcbiAqXG4gKi9cblxuaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgR3JhcGhpY1FWaWV3LCBMYWJlbCB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IHsgcm91bmREUCB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIHJhZGl1czogbnVtYmVyXG4gIE86IFBvaW50XG4gIEE6IFBvaW50XG4gIEM6IFBvaW50W11cbiAgdmlld0FuZ2xlczogbnVtYmVyW10gLy8gJ2Z1ZGdlZCcgdmVyc2lvbnMgb2YgZGF0YS5hbmdsZXMgZm9yIGRpc3BsYXlcbiAgZGF0YTogTWlzc2luZ0FuZ2xlc051bWJlckRhdGFcbiAgcm90YXRpb246IG51bWJlclxuXG4gIGNvbnN0cnVjdG9yIChkYXRhIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEsIG9wdGlvbnMgOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBzZXRzIHRoaXMud2lkdGggdGhpcy5oZWlnaHQsIGluaXRpYWxpc2VzIHRoaXMubGFiZWxzLCBjcmVhdGVzIGRvbSBlbGVtZW50c1xuICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aFxuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuaGVpZ2h0XG4gICAgY29uc3QgcmFkaXVzID0gdGhpcy5yYWRpdXMgPSBNYXRoLm1pbih3aWR0aCwgaGVpZ2h0KSAvIDIuNVxuICAgIGNvbnN0IG1pblZpZXdBbmdsZSA9IG9wdGlvbnMubWluVmlld0FuZ2xlIHx8IDI1XG5cbiAgICB0aGlzLnZpZXdBbmdsZXMgPSBmdWRnZUFuZ2xlcyh0aGlzLmRhdGEuYW5nbGVzLCBtaW5WaWV3QW5nbGUpXG5cbiAgICAvLyBTZXQgdXAgbWFpbiBwb2ludHNcbiAgICB0aGlzLk8gPSBuZXcgUG9pbnQoMCwgMCkgLy8gY2VudGVyIHBvaW50XG4gICAgdGhpcy5BID0gbmV3IFBvaW50KHJhZGl1cywgMCkgLy8gZmlyc3QgcG9pbnRcbiAgICB0aGlzLkMgPSBbXSAvLyBQb2ludHMgYXJvdW5kIG91dHNpZGVcbiAgICBsZXQgdG90YWxhbmdsZSA9IDAgLy8gbmIgaW4gcmFkaWFuc1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5kYXRhLmFuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdG90YWxhbmdsZSArPSB0aGlzLnZpZXdBbmdsZXNbaV0gKiBNYXRoLlBJIC8gMTgwXG4gICAgICB0aGlzLkNbaV0gPSBQb2ludC5mcm9tUG9sYXIocmFkaXVzLCB0b3RhbGFuZ2xlKVxuICAgIH1cblxuICAgIC8vIFJhbmRvbWx5IHJvdGF0ZSBhbmQgY2VudGVyXG4gICAgdGhpcy5yb3RhdGlvbiA9IChvcHRpb25zLnJvdGF0aW9uICE9PSB1bmRlZmluZWQpID8gdGhpcy5yb3RhdGUob3B0aW9ucy5yb3RhdGlvbikgOiB0aGlzLnJhbmRvbVJvdGF0ZSgpXG4gICAgLy8gdGhpcy5zY2FsZVRvRml0KHdpZHRoLGhlaWdodCwxMClcbiAgICB0aGlzLnRyYW5zbGF0ZSh3aWR0aCAvIDIsIGhlaWdodCAvIDIpXG5cbiAgICAvLyBTZXQgdXAgbGFiZWxzIChhZnRlciBzY2FsaW5nIGFuZCByb3RhdGluZylcbiAgICB0b3RhbGFuZ2xlID0gUG9pbnQuYW5nbGVGcm9tKHRoaXMuTywgdGhpcy5BKSAqIDE4MCAvIE1hdGguUEkgLy8gYW5nbGUgZnJvbSBPIHRoYXQgQSBpc1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy52aWV3QW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAvLyBMYWJlbCB0ZXh0XG4gICAgICBjb25zdCBsYWJlbCA6IFBhcnRpYWw8TGFiZWw+ID0ge31cbiAgICAgIGNvbnN0IHRleHRxID0gdGhpcy5kYXRhLmFuZ2xlTGFiZWxzW2ldXG4gICAgICBjb25zdCB0ZXh0YSA9IHJvdW5kRFAodGhpcy5kYXRhLmFuZ2xlc1tpXSwgMikudG9TdHJpbmcoKSArICdeXFxcXGNpcmMnXG5cbiAgICAgIC8vIFBvc2l0aW9uaW5nXG4gICAgICBjb25zdCB0aGV0YSA9IHRoaXMudmlld0FuZ2xlc1tpXVxuICAgICAgLyogY291bGQgYmUgdXNlZCBmb3IgbW9yZSBhZHZhbmNlZCBwb3NpdGlvbmluZ1xuICAgICAgY29uc3QgbWlkQW5nbGUgPSB0b3RhbGFuZ2xlICsgdGhldGEgLyAyXG4gICAgICBjb25zdCBtaW5EaXN0YW5jZSA9IDAuMyAvLyBhcyBhIGZyYWN0aW9uIG9mIHJhZGl1c1xuICAgICAgY29uc3QgbGFiZWxMZW5ndGggPSBNYXRoLm1heCh0ZXh0cS5sZW5ndGgsIHRleHRhLmxlbmd0aCkgLSAnXlxcXFxjaXJjJy5sZW5ndGggLy8gwrAgdGFrZXMgdXAgdmVyeSBsaXR0bGUgc3BhY2VcbiAgICAgICovXG5cbiAgICAgIC8qIEV4cGxhbmF0aW9uOiBGdXJ0aGVyIG91dCBpZjpcbiAgICAgICogICBNb3JlIHZlcnRpY2FsIChzaW4obWlkQW5nbGUpKVxuICAgICAgKiAgIExvbmdlciBsYWJlbFxuICAgICAgKiAgIHNtYWxsZXIgYW5nbGVcbiAgICAgICogICBFLmcuIHRvdGFsbHkgdmVydGljYWwsIDQ1wrAsIGxlbmd0aCA9IDNcbiAgICAgICogICBkID0gMC4zICsgMSozLzQ1ID0gMC4zICsgMC43ID0gMC4zN1xuICAgICAgKi9cbiAgICAgIC8vIGNvbnN0IGZhY3RvciA9IDEgICAgICAgIC8vIGNvbnN0YW50IG9mIHByb3BvcnRpb25hbGl0eS4gU2V0IGJ5IHRyaWFsIGFuZCBlcnJvclxuICAgICAgLy8gbGV0IGRpc3RhbmNlID0gbWluRGlzdGFuY2UgKyBmYWN0b3IgKiBNYXRoLmFicyhzaW5EZWcobWlkQW5nbGUpKSAqIGxhYmVsTGVuZ3RoIC8gdGhldGFcblxuICAgICAgLy8gSnVzdCByZXZlcnQgdG8gb2xkIG1ldGhvZFxuXG4gICAgICBjb25zdCBkaXN0YW5jZSA9IDAuNCArIDYgLyB0aGV0YVxuXG4gICAgICBsYWJlbC5wb3MgPSBQb2ludC5mcm9tUG9sYXJEZWcocmFkaXVzICogZGlzdGFuY2UsIHRvdGFsYW5nbGUgKyB0aGV0YSAvIDIpLnRyYW5zbGF0ZSh0aGlzLk8ueCwgdGhpcy5PLnkpXG4gICAgICBsYWJlbC50ZXh0cSA9IHRleHRxXG4gICAgICBsYWJlbC5zdHlsZXEgPSAnbm9ybWFsJ1xuXG4gICAgICBpZiAodGhpcy5kYXRhLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSB0ZXh0YVxuICAgICAgICBsYWJlbC5zdHlsZWEgPSAnYW5zd2VyJ1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSBsYWJlbC50ZXh0cVxuICAgICAgICBsYWJlbC5zdHlsZWEgPSBsYWJlbC5zdHlsZXFcbiAgICAgIH1cblxuICAgICAgbGFiZWwudGV4dCA9IGxhYmVsLnRleHRxXG4gICAgICBsYWJlbC5zdHlsZSA9IGxhYmVsLnN0eWxlcVxuXG4gICAgICB0aGlzLmxhYmVsc1tpXSA9IGxhYmVsIGFzIExhYmVsXG5cbiAgICAgIHRvdGFsYW5nbGUgKz0gdGhldGFcbiAgICB9XG5cbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgfVxuXG4gIHJlbmRlciAoKSA6IHZvaWQge1xuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGN0eC5tb3ZlVG8odGhpcy5PLngsIHRoaXMuTy55KSAvLyBkcmF3IGxpbmVzXG4gICAgY3R4LmxpbmVUbyh0aGlzLkEueCwgdGhpcy5BLnkpXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLkMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGN0eC5tb3ZlVG8odGhpcy5PLngsIHRoaXMuTy55KVxuICAgICAgY3R4LmxpbmVUbyh0aGlzLkNbaV0ueCwgdGhpcy5DW2ldLnkpXG4gICAgfVxuICAgIGN0eC5zdHJva2VTdHlsZSA9ICdncmF5J1xuICAgIGN0eC5zdHJva2UoKVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgY3R4LmJlZ2luUGF0aCgpXG4gICAgbGV0IHRvdGFsYW5nbGUgPSB0aGlzLnJvdGF0aW9uXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnZpZXdBbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHRoZXRhID0gdGhpcy52aWV3QW5nbGVzW2ldICogTWF0aC5QSSAvIDE4MFxuICAgICAgLy8gMC4wNy90aGV0YSByYWRpYW5zIH49IDQvdGhldGFcbiAgICAgIGN0eC5hcmModGhpcy5PLngsIHRoaXMuTy55LCB0aGlzLnJhZGl1cyAqICgwLjIgKyAwLjA3IC8gdGhldGEpLCB0b3RhbGFuZ2xlLCB0b3RhbGFuZ2xlICsgdGhldGEpXG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIHRvdGFsYW5nbGUgKz0gdGhldGFcbiAgICB9XG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICAvLyB0ZXN0aW5nIGxhYmVsIHBvc2l0aW9uaW5nOlxuICAgIC8vIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgLy8gY3R4LmZpbGxTdHlsZSA9ICdyZWQnXG4gICAgLy8gY3R4LmZpbGxSZWN0KGwucG9zLnggLSAxLCBsLnBvcy55IC0gMSwgMywgMylcbiAgICAvLyB9KVxuXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoZmFsc2UpXG4gIH1cblxuICBnZXQgYWxscG9pbnRzICgpIDogUG9pbnRbXSB7XG4gICAgbGV0IGFsbHBvaW50cyA9IFt0aGlzLkEsIHRoaXMuT11cbiAgICBhbGxwb2ludHMgPSBhbGxwb2ludHMuY29uY2F0KHRoaXMuQylcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGZ1bmN0aW9uIChsKSB7XG4gICAgICBhbGxwb2ludHMucHVzaChsLnBvcylcbiAgICB9KVxuICAgIHJldHVybiBhbGxwb2ludHNcbiAgfVxufVxuXG4vKipcbiAqIEFkanVzdHMgYSBzZXQgb2YgYW5nbGVzIHNvIHRoYXQgYWxsIGFuZ2xlcyBhcmUgZ3JlYXRlciB0aGFuIHttaW5BbmdsZX0gYnkgcmVkdWNpbmcgb3RoZXIgYW5nbGVzIGluIHByb3BvcnRpb25cbiAqIEBwYXJhbSBhbmdsZXMgVGhlIHNldCBvZiBhbmdsZXMgdG8gYWRqdXN0XG4gKiBAcGFyYW0gbWluQW5nbGUgVGhlIHNtYWxsZXN0IGFuZ2xlIGluIHRoZSBvdXRwdXRcbiAqL1xuZnVuY3Rpb24gZnVkZ2VBbmdsZXMgKGFuZ2xlczogbnVtYmVyW10sIG1pbkFuZ2xlOiBudW1iZXIpIDogbnVtYmVyW10ge1xuICBjb25zdCBtYXBwZWRBbmdsZXMgPSBhbmdsZXMubWFwKCh4LCBpKSA9PiBbeCwgaV0pIC8vIHJlbWVtYmVyIG9yaWdpbmFsIGluZGljZXNcbiAgY29uc3Qgc21hbGxBbmdsZXMgPSBtYXBwZWRBbmdsZXMuZmlsdGVyKHggPT4geFswXSA8IG1pbkFuZ2xlKVxuICBjb25zdCBsYXJnZUFuZ2xlcyA9IG1hcHBlZEFuZ2xlcy5maWx0ZXIoeCA9PiB4WzBdID49IG1pbkFuZ2xlKVxuICBjb25zdCBsYXJnZUFuZ2xlU3VtID0gbGFyZ2VBbmdsZXMucmVkdWNlKChhY2N1bXVsYXRvciwgY3VycmVudFZhbHVlKSA9PiBhY2N1bXVsYXRvciArIGN1cnJlbnRWYWx1ZVswXSwgMClcblxuICBzbWFsbEFuZ2xlcy5mb3JFYWNoKHNtYWxsID0+IHtcbiAgICBjb25zdCBkaWZmZXJlbmNlID0gbWluQW5nbGUgLSBzbWFsbFswXVxuICAgIHNtYWxsWzBdICs9IGRpZmZlcmVuY2VcbiAgICBsYXJnZUFuZ2xlcy5mb3JFYWNoKGxhcmdlID0+IHtcbiAgICAgIGNvbnN0IHJlZHVjdGlvbiA9IGRpZmZlcmVuY2UgKiBsYXJnZVswXSAvIGxhcmdlQW5nbGVTdW1cbiAgICAgIGxhcmdlWzBdIC09IHJlZHVjdGlvblxuICAgIH0pXG4gIH0pXG5cbiAgcmV0dXJuIHNtYWxsQW5nbGVzLmNvbmNhdChsYXJnZUFuZ2xlcykgLy8gY29tYmluZSB0b2dldGhlclxuICAgIC5zb3J0KCh4LCB5KSA9PiB4WzFdIC0geVsxXSkgLy8gc29ydCBieSBwcmV2aW91cyBpbmRleFxuICAgIC5tYXAoeCA9PiB4WzBdKSAvLyBzdHJpcCBvdXQgaW5kZXhcbn1cbiIsIi8qKiBHZW5lcmF0ZXMgYW5kIGhvbGRzIGRhdGEgZm9yIGEgbWlzc2luZyBhbmdsZXMgcXVlc3Rpb24sIHdoZXJlIHRoZXNlIGlzIHNvbWUgZ2l2ZW4gYW5nbGUgc3VtXG4gKiAgQWdub3N0aWMgYXMgdG8gaG93IHRoZXNlIGFuZ2xlcyBhcmUgYXJyYW5nZWQgKGUuZy4gaW4gYSBwb2x5Z29uIG9yIGFyb3VuZCBzb20gcG9pbnQpXG4gKlxuICogT3B0aW9ucyBwYXNzZWQgdG8gY29uc3RydWN0b3JzOlxuICogIGFuZ2xlU3VtOjpJbnQgdGhlIG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqICBtaW5BbmdsZTo6SW50IHRoZSBzbWFsbGVzdCBhbmdsZSB0byBnZW5lcmF0ZVxuICogIG1pbk46OkludCAgICAgdGhlIHNtYWxsZXN0IG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqICBtYXhOOjpJbnQgICAgIHRoZSBsYXJnZXN0IG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqXG4gKi9cblxuaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUURhdGEgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgYXMgT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxuZXhwb3J0IGNsYXNzIE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIGltcGxlbWVudHMgTWlzc2luZ0FuZ2xlc0RhdGEge1xuICBhbmdsZXMgOiBudW1iZXJbXSAvLyBsaXN0IG9mIGFuZ2xlc1xuICBtaXNzaW5nIDogYm9vbGVhbltdIC8vIHRydWUgaWYgbWlzc2luZ1xuICBhbmdsZVN1bSA6IG51bWJlciAvLyB3aGF0IHRoZSBhbmdsZXMgYWRkIHVwIHRvXG4gIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXVxuXG4gIGNvbnN0cnVjdG9yIChhbmdsZVN1bSA6IG51bWJlciwgYW5nbGVzOiBudW1iZXJbXSwgbWlzc2luZzogYm9vbGVhbltdLCBhbmdsZUxhYmVscz86IHN0cmluZ1tdKSB7XG4gICAgLy8gaW5pdGlhbGlzZXMgd2l0aCBhbmdsZXMgZ2l2ZW4gZXhwbGljaXRseVxuICAgIGlmIChhbmdsZXMgPT09IFtdKSB7IHRocm93IG5ldyBFcnJvcignTXVzdCBnaXZlIGFuZ2xlcycpIH1cbiAgICBpZiAoTWF0aC5yb3VuZChhbmdsZXMucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSkpICE9PSBhbmdsZVN1bSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBbmdsZSBzdW0gbXVzdCBiZSAke2FuZ2xlU3VtfWApXG4gICAgfVxuXG4gICAgdGhpcy5hbmdsZXMgPSBhbmdsZXMgLy8gbGlzdCBvZiBhbmdsZXNcbiAgICB0aGlzLm1pc3NpbmcgPSBtaXNzaW5nIC8vIHdoaWNoIGFuZ2xlcyBhcmUgbWlzc2luZyAtIGFycmF5IG9mIGJvb2xlYW5zXG4gICAgdGhpcy5hbmdsZVN1bSA9IGFuZ2xlU3VtIC8vIHN1bSBvZiBhbmdsZXNcbiAgICB0aGlzLmFuZ2xlTGFiZWxzID0gYW5nbGVMYWJlbHMgfHwgW11cbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IE9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEge1xuICAgIGNvbnN0IGRlZmF1bHRzIDogUGFydGlhbDxPcHRpb25zPiA9IHtcbiAgICAgIC8qIGFuZ2xlU3VtOiAxODAgKi8gLy8gbXVzdCBiZSBzZXQgYnkgY2FsbGVyXG4gICAgICBtaW5BbmdsZTogMTUsXG4gICAgICBtaW5OOiAyLFxuICAgICAgbWF4TjogNFxuICAgIH1cblxuICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIGxldCBxdWVzdGlvbiA6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhXG4gICAgaWYgKG9wdGlvbnMucmVwZWF0ZWQpIHtcbiAgICAgIHF1ZXN0aW9uID0gdGhpcy5yYW5kb21SZXBlYXRlZChvcHRpb25zKVxuICAgIH0gZWxzZSB7XG4gICAgICBxdWVzdGlvbiA9IHRoaXMucmFuZG9tU2ltcGxlKG9wdGlvbnMpXG4gICAgfVxuICAgIHF1ZXN0aW9uLmluaXRMYWJlbHMoKVxuICAgIHJldHVybiBxdWVzdGlvblxuICB9XG5cbiAgc3RhdGljIHJhbmRvbVNpbXBsZSAob3B0aW9uczogT3B0aW9ucyk6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBpZiAoIW9wdGlvbnMuYW5nbGVTdW0pIHsgdGhyb3cgbmV3IEVycm9yKCdObyBhbmdsZSBzdW0gZ2l2ZW4nKSB9XG5cbiAgICBjb25zdCBhbmdsZVN1bSA9IG9wdGlvbnMuYW5nbGVTdW1cbiAgICBjb25zdCBuID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5OLCBvcHRpb25zLm1heE4pXG4gICAgY29uc3QgbWluQW5nbGUgPSBvcHRpb25zLm1pbkFuZ2xlXG5cbiAgICBpZiAobiA8IDIpIHRocm93IG5ldyBFcnJvcignQ2FuXFwndCBoYXZlIG1pc3NpbmcgZmV3ZXIgdGhhbiAyIGFuZ2xlcycpXG5cbiAgICAvLyBCdWlsZCB1cCBhbmdsZXNcbiAgICBjb25zdCBhbmdsZXMgPSBbXVxuICAgIGxldCBsZWZ0ID0gYW5nbGVTdW1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG4gLSAxOyBpKyspIHtcbiAgICAgIGNvbnN0IG1heEFuZ2xlID0gbGVmdCAtIG1pbkFuZ2xlICogKG4gLSBpIC0gMSlcbiAgICAgIGNvbnN0IG5leHRBbmdsZSA9IHJhbmRCZXR3ZWVuKG1pbkFuZ2xlLCBtYXhBbmdsZSlcbiAgICAgIGxlZnQgLT0gbmV4dEFuZ2xlXG4gICAgICBhbmdsZXMucHVzaChuZXh0QW5nbGUpXG4gICAgfVxuICAgIGFuZ2xlc1tuIC0gMV0gPSBsZWZ0XG5cbiAgICAvLyBwaWNrIG9uZSB0byBiZSBtaXNzaW5nXG4gICAgY29uc3QgbWlzc2luZyA9IFtdXG4gICAgbWlzc2luZy5sZW5ndGggPSBuXG4gICAgbWlzc2luZy5maWxsKGZhbHNlKVxuICAgIG1pc3NpbmdbcmFuZEJldHdlZW4oMCwgbiAtIDEpXSA9IHRydWVcblxuICAgIHJldHVybiBuZXcgdGhpcyhhbmdsZVN1bSwgYW5nbGVzLCBtaXNzaW5nKVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbVJlcGVhdGVkIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBjb25zdCBhbmdsZVN1bTogbnVtYmVyID0gb3B0aW9ucy5hbmdsZVN1bVxuICAgIGNvbnN0IG1pbkFuZ2xlOiBudW1iZXIgPSBvcHRpb25zLm1pbkFuZ2xlXG5cbiAgICBjb25zdCBuOiBudW1iZXIgPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbk4sIG9wdGlvbnMubWF4TilcblxuICAgIGNvbnN0IG06IG51bWJlciA9IG9wdGlvbnMubk1pc3NpbmcgfHwgKE1hdGgucmFuZG9tKCkgPCAwLjEgPyBuIDogcmFuZEJldHdlZW4oMiwgbiAtIDEpKVxuXG4gICAgaWYgKG4gPCAyIHx8IG0gPCAxIHx8IG0gPiBuKSB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgYXJndW1lbnRzOiBuPSR7bn0sIG09JHttfWApXG5cbiAgICAvLyBBbGwgbWlzc2luZyAtIGRvIGFzIGEgc2VwYXJhdGUgY2FzZVxuICAgIGlmIChuID09PSBtKSB7XG4gICAgICBjb25zdCBhbmdsZXMgPSBbXVxuICAgICAgYW5nbGVzLmxlbmd0aCA9IG5cbiAgICAgIGFuZ2xlcy5maWxsKGFuZ2xlU3VtIC8gbilcblxuICAgICAgY29uc3QgbWlzc2luZyA9IFtdXG4gICAgICBtaXNzaW5nLmxlbmd0aCA9IG5cbiAgICAgIG1pc3NpbmcuZmlsbCh0cnVlKVxuXG4gICAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZylcbiAgICB9XG5cbiAgICBjb25zdCBhbmdsZXM6IG51bWJlcltdID0gW11cbiAgICBjb25zdCBtaXNzaW5nOiBib29sZWFuW10gPSBbXVxuICAgIG1pc3NpbmcubGVuZ3RoID0gblxuICAgIG1pc3NpbmcuZmlsbChmYWxzZSlcblxuICAgIC8vIGNob29zZSBhIHZhbHVlIGZvciB0aGUgbWlzc2luZyBhbmdsZXNcbiAgICBjb25zdCBtYXhSZXBlYXRlZEFuZ2xlID0gKGFuZ2xlU3VtIC0gbWluQW5nbGUgKiAobiAtIG0pKSAvIG1cbiAgICBjb25zdCByZXBlYXRlZEFuZ2xlID0gcmFuZEJldHdlZW4obWluQW5nbGUsIG1heFJlcGVhdGVkQW5nbGUpXG5cbiAgICAvLyBjaG9vc2UgdmFsdWVzIGZvciB0aGUgb3RoZXIgYW5nbGVzXG4gICAgY29uc3Qgb3RoZXJBbmdsZXM6IG51bWJlcltdID0gW11cbiAgICBsZXQgbGVmdCA9IGFuZ2xlU3VtIC0gcmVwZWF0ZWRBbmdsZSAqIG1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG4gLSBtIC0gMTsgaSsrKSB7XG4gICAgICBjb25zdCBtYXhBbmdsZSA9IGxlZnQgLSBtaW5BbmdsZSAqIChuIC0gbSAtIGkgLSAxKVxuICAgICAgY29uc3QgbmV4dEFuZ2xlID0gcmFuZEJldHdlZW4obWluQW5nbGUsIG1heEFuZ2xlKVxuICAgICAgbGVmdCAtPSBuZXh0QW5nbGVcbiAgICAgIG90aGVyQW5nbGVzLnB1c2gobmV4dEFuZ2xlKVxuICAgIH1cbiAgICBvdGhlckFuZ2xlc1tuIC0gbSAtIDFdID0gbGVmdFxuXG4gICAgLy8gY2hvb3NlIHdoZXJlIHRoZSBtaXNzaW5nIGFuZ2xlcyBhcmVcbiAgICB7XG4gICAgICBsZXQgaSA9IDBcbiAgICAgIHdoaWxlIChpIDwgbSkge1xuICAgICAgICBjb25zdCBqID0gcmFuZEJldHdlZW4oMCwgbiAtIDEpXG4gICAgICAgIGlmIChtaXNzaW5nW2pdID09PSBmYWxzZSkge1xuICAgICAgICAgIG1pc3Npbmdbal0gPSB0cnVlXG4gICAgICAgICAgYW5nbGVzW2pdID0gcmVwZWF0ZWRBbmdsZVxuICAgICAgICAgIGkrK1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZmlsbCBpbiB0aGUgb3RoZXIgYW5nbGVzXG4gICAge1xuICAgICAgbGV0IGogPSAwXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICBpZiAobWlzc2luZ1tpXSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBhbmdsZXNbaV0gPSBvdGhlckFuZ2xlc1tqXVxuICAgICAgICAgIGorK1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgdGhpcyhhbmdsZVN1bSwgYW5nbGVzLCBtaXNzaW5nKVxuICB9XG5cbiAgaW5pdExhYmVscyAoKSA6IHZvaWQge1xuICAgIGNvbnN0IG4gPSB0aGlzLmFuZ2xlcy5sZW5ndGhcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgaWYgKCF0aGlzLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgdGhpcy5hbmdsZUxhYmVsc1tpXSA9IGAke3RoaXMuYW5nbGVzW2ldLnRvU3RyaW5nKCl9XlxcXFxjaXJjYFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5hbmdsZUxhYmVsc1tpXSA9ICd4XlxcXFxjaXJjJ1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwiLyogUXVlc3Rpb24gdHlwZSBjb21wcmlzaW5nIG51bWVyaWNhbCBtaXNzaW5nIGFuZ2xlcyBhcm91bmQgYSBwb2ludCBhbmRcbiAqIGFuZ2xlcyBvbiBhIHN0cmFpZ2h0IGxpbmUgKHNpbmNlIHRoZXNlIGFyZSB2ZXJ5IHNpbWlsYXIgbnVtZXJpY2FsbHkgYXMgd2VsbFxuICogYXMgZ3JhcGhpY2FsbHkuXG4gKlxuICogQWxzbyBjb3ZlcnMgY2FzZXMgd2hlcmUgbW9yZSB0aGFuIG9uZSBhbmdsZSBpcyBlcXVhbFxuICpcbiAqL1xuXG5pbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRWaWV3J1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNOdW1iZXJEYXRhJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzVmlld09wdGlvbnMnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVPcHRpb25zIH0gZnJvbSAnLi9OdW1iZXJPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YTogTWlzc2luZ0FuZ2xlc051bWJlckRhdGFcbiAgdmlldzogTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXdcblxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEsIHZpZXc6IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3KSB7IC8vIGVmZmVjdGl2ZWx5IHByaXZhdGVcbiAgICBzdXBlcigpIC8vIGJ1YmJsZXMgdG8gUVxuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICB0aGlzLnZpZXcgPSB2aWV3XG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBNaXNzaW5nQW5nbGVPcHRpb25zLCB2aWV3T3B0aW9uczogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNBcm91bmRRIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IE1pc3NpbmdBbmdsZU9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDEwLFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDQsXG4gICAgICByZXBlYXRlZDogZmFsc2VcbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcoZGF0YSwgdmlld09wdGlvbnMpIC8vIFRPRE8gZWxpbWluYXRlIHB1YmxpYyBjb25zdHJ1Y3RvcnNcblxuICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZFEoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IEdyYXBoaWNRVmlldywgTGFiZWwgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCB7IHNpbkRlZywgZGFzaGVkTGluZSwgcm91bmREUCB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIEEgOiBQb2ludCAvLyB0aGUgdmVydGljZXMgb2YgdGhlIHRyaWFuZ2xlXG4gIEIgOiBQb2ludFxuICBDIDogUG9pbnRcbiAgcm90YXRpb246IG51bWJlclxuICAvLyBJbmhlcml0ZWQgbWVtYmVyczpcbiAgbGFiZWxzOiBMYWJlbFtdXG4gIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnRcbiAgRE9NOiBIVE1MRWxlbWVudFxuICB3aWR0aDogbnVtYmVyXG4gIGhlaWdodDogbnVtYmVyXG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGFcblxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSwgb3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBzZXRzIHRoaXMud2lkdGggdGhpcy5oZWlnaHQsIHRoaXMuZGF0YSBpbml0aWFsaXNlcyB0aGlzLmxhYmVscywgY3JlYXRlcyBkb20gZWxlbWVudHNcbiAgICBjb25zdCB3aWR0aCA9IHRoaXMud2lkdGhcbiAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmhlaWdodFxuXG4gICAgLy8gZ2VuZXJhdGUgcG9pbnRzICh3aXRoIGxvbmdlc3Qgc2lkZSAxXG4gICAgdGhpcy5BID0gbmV3IFBvaW50KDAsIDApXG4gICAgdGhpcy5CID0gUG9pbnQuZnJvbVBvbGFyRGVnKDEsIGRhdGEuYW5nbGVzWzBdKVxuICAgIHRoaXMuQyA9IG5ldyBQb2ludChcbiAgICAgIHNpbkRlZyh0aGlzLmRhdGEuYW5nbGVzWzFdKSAvIHNpbkRlZyh0aGlzLmRhdGEuYW5nbGVzWzJdKSwgMFxuICAgIClcblxuICAgIC8vIENyZWF0ZSBsYWJlbHNcbiAgICBjb25zdCBpbkNlbnRlciA9IFBvaW50LmluQ2VudGVyKHRoaXMuQSwgdGhpcy5CLCB0aGlzLkMpXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgY29uc3QgcCA9IFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXVtpXVxuXG4gICAgICBjb25zdCBsYWJlbCA6IFBhcnRpYWw8TGFiZWw+ID0ge1xuICAgICAgICB0ZXh0cTogdGhpcy5kYXRhLmFuZ2xlTGFiZWxzW2ldLFxuICAgICAgICB0ZXh0OiB0aGlzLmRhdGEuYW5nbGVMYWJlbHNbaV0sXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCcsXG4gICAgICAgIHN0eWxlOiAnbm9ybWFsJyxcbiAgICAgICAgcG9zOiBQb2ludC5tZWFuKHAsIHAsIGluQ2VudGVyKVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5kYXRhLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSByb3VuZERQKHRoaXMuZGF0YS5hbmdsZXNbaV0sIDIpLnRvU3RyaW5nKCkgKyAnXlxcXFxjaXJjJ1xuICAgICAgICBsYWJlbC5zdHlsZWEgPSAnYW5zd2VyJ1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSBsYWJlbC50ZXh0cVxuICAgICAgICBsYWJlbC5zdHlsZWEgPSBsYWJlbC5zdHlsZXFcbiAgICAgIH1cblxuICAgICAgdGhpcy5sYWJlbHNbaV0gPSBsYWJlbCBhcyBMYWJlbFxuICAgIH1cblxuICAgIC8vIHJvdGF0ZSByYW5kb21seVxuICAgIHRoaXMucm90YXRpb24gPSAob3B0aW9ucy5yb3RhdGlvbiAhPT0gdW5kZWZpbmVkKSA/IHRoaXMucm90YXRlKG9wdGlvbnMucm90YXRpb24pIDogdGhpcy5yYW5kb21Sb3RhdGUoKVxuXG4gICAgLy8gc2NhbGUgYW5kIGZpdFxuICAgIC8vIHNjYWxlIHRvIHNpemVcbiAgICBjb25zdCBtYXJnaW4gPSAwXG4gICAgbGV0IHRvcGxlZnQgPSBQb2ludC5taW4oW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGxldCBib3R0b21yaWdodCA9IFBvaW50Lm1heChbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgY29uc3QgdG90YWxXaWR0aCA9IGJvdHRvbXJpZ2h0LnggLSB0b3BsZWZ0LnhcbiAgICBjb25zdCB0b3RhbEhlaWdodCA9IGJvdHRvbXJpZ2h0LnkgLSB0b3BsZWZ0LnlcbiAgICB0aGlzLnNjYWxlKE1hdGgubWluKCh3aWR0aCAtIG1hcmdpbikgLyB0b3RhbFdpZHRoLCAoaGVpZ2h0IC0gbWFyZ2luKSAvIHRvdGFsSGVpZ2h0KSkgLy8gMTVweCBtYXJnaW5cblxuICAgIC8vIG1vdmUgdG8gY2VudHJlXG4gICAgdG9wbGVmdCA9IFBvaW50Lm1pbihbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgYm90dG9tcmlnaHQgPSBQb2ludC5tYXgoW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGNvbnN0IGNlbnRlciA9IFBvaW50Lm1lYW4odG9wbGVmdCwgYm90dG9tcmlnaHQpXG4gICAgdGhpcy50cmFuc2xhdGUod2lkdGggLyAyIC0gY2VudGVyLngsIGhlaWdodCAvIDIgLSBjZW50ZXIueSkgLy8gY2VudHJlXG4gIH1cblxuICByZW5kZXIgKCkgOiB2b2lkIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG4gICAgY29uc3QgdmVydGljZXMgPSBbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ11cbiAgICBjb25zdCBhcGV4ID0gdGhpcy5kYXRhLmFwZXggLy8gaG1tbVxuXG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KSAvLyBjbGVhclxuXG4gICAgY3R4LmJlZ2luUGF0aCgpXG4gICAgY3R4Lm1vdmVUbyh0aGlzLkEueCwgdGhpcy5BLnkpXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgY29uc3QgcCA9IHZlcnRpY2VzW2ldXG4gICAgICBjb25zdCBuZXh0ID0gdmVydGljZXNbKGkgKyAxKSAlIDNdXG4gICAgICBpZiAoYXBleCA9PT0gaSB8fCBhcGV4ID09PSAoaSArIDEpICUgMykgeyAvLyB0by9mcm9tIGFwZXggLSBkcmF3IGRhc2hlZCBsaW5lXG4gICAgICAgIGRhc2hlZExpbmUoY3R4LCBwLngsIHAueSwgbmV4dC54LCBuZXh0LnkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjdHgubGluZVRvKG5leHQueCwgbmV4dC55KVxuICAgICAgfVxuICAgIH1cbiAgICBjdHguc3Ryb2tlU3R5bGUgPSAnZ3JheSdcbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIHRoaXMucmVuZGVyTGFiZWxzKGZhbHNlKVxuICB9XG5cbiAgZ2V0IGFsbHBvaW50cyAoKSA6IFBvaW50W10ge1xuICAgIGNvbnN0IGFsbHBvaW50cyA9IFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXVxuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7IGFsbHBvaW50cy5wdXNoKGwucG9zKSB9KVxuICAgIHJldHVybiBhbGxwb2ludHNcbiAgfVxufVxuIiwiLyogRXh0ZW5kcyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSBpbiBvcmRlciB0byBkbyBpc29zY2VsZXMgdHJpYW5nbGVzLCB3aGljaCBnZW5lcmF0ZSBhIGJpdCBkaWZmZXJlbnRseSAqL1xuXG5pbXBvcnQgeyBmaXJzdFVuaXF1ZUluZGV4IH0gZnJvbSAnVXRpbGl0aWVzJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNOdW1iZXJEYXRhJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxudHlwZSBPcHRpb25zID0gTWlzc2luZ0FuZ2xlT3B0aW9ucyAmIHtnaXZlbkFuZ2xlPzogJ2FwZXgnIHwgJ2Jhc2UnfVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhIGV4dGVuZHMgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEge1xuICAgIGFwZXg/OiAwIHwgMSB8IDIgfCB1bmRlZmluZWQgLy8gd2hpY2ggb2YgdGhlIHRocmVlIGdpdmVuIGFuZ2xlcyBpcyB0aGUgYXBleCBvZiBhbiBpc29zY2VsZXMgdHJpYW5nbGVcbiAgICBjb25zdHJ1Y3RvciAoYW5nbGVTdW06IG51bWJlciwgYW5nbGVzOiBudW1iZXJbXSwgbWlzc2luZzogYm9vbGVhbltdLCBhbmdsZUxhYmVscz86IHN0cmluZ1tdLCBhcGV4PzogMHwxfDJ8dW5kZWZpbmVkKSB7XG4gICAgICBzdXBlcihhbmdsZVN1bSwgYW5nbGVzLCBtaXNzaW5nLCBhbmdsZUxhYmVscylcbiAgICAgIHRoaXMuYXBleCA9IGFwZXhcbiAgICB9XG5cbiAgICBzdGF0aWMgcmFuZG9tUmVwZWF0ZWQgKG9wdGlvbnM6IE9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSB7XG4gICAgICBvcHRpb25zLm5NaXNzaW5nID0gMlxuICAgICAgb3B0aW9ucy5naXZlbkFuZ2xlID0gb3B0aW9ucy5naXZlbkFuZ2xlIHx8IE1hdGgucmFuZG9tKCkgPCAwLjUgPyAnYXBleCcgOiAnYmFzZSdcblxuICAgICAgLy8gZ2VuZXJhdGUgdGhlIHJhbmRvbSBhbmdsZXMgd2l0aCByZXBldGl0aW9uIGZpcnN0IGJlZm9yZSBtYXJraW5nIGFwZXggZm9yIGRyYXdpbmdcbiAgICAgIGNvbnN0IHF1ZXN0aW9uID0gc3VwZXIucmFuZG9tUmVwZWF0ZWQob3B0aW9ucykgYXMgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSAvLyBhbGxvd2VkIHNpbmNlIHVuZGVmaW5lZCBcXGluIGFwZXhcblxuICAgICAgLy8gT2xkIGltcGxlbWVudGF0aW9uIGhhZCBzb3J0aW5nIHRoZSBhcnJheSAtIG5vdCBzdXJlIHdoeVxuICAgICAgLy8gc29ydFRvZ2V0aGVyKHF1ZXN0aW9uLmFuZ2xlcyxxdWVzdGlvbi5taXNzaW5nLCh4LHkpID0+IHggLSB5KVxuXG4gICAgICBxdWVzdGlvbi5hcGV4ID0gZmlyc3RVbmlxdWVJbmRleChxdWVzdGlvbi5hbmdsZXMpIGFzIDAgfCAxIHwgMlxuICAgICAgcXVlc3Rpb24ubWlzc2luZyA9IFt0cnVlLCB0cnVlLCB0cnVlXVxuXG4gICAgICBpZiAob3B0aW9ucy5naXZlbkFuZ2xlID09PSAnYXBleCcpIHtcbiAgICAgICAgcXVlc3Rpb24ubWlzc2luZ1txdWVzdGlvbi5hcGV4XSA9IGZhbHNlXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBxdWVzdGlvbi5taXNzaW5nWyhxdWVzdGlvbi5hcGV4ICsgMSkgJSAzXSA9IGZhbHNlXG4gICAgICB9XG5cbiAgICAgIHF1ZXN0aW9uLmluaXRMYWJlbHMoKVxuXG4gICAgICByZXR1cm4gcXVlc3Rpb25cbiAgICB9XG5cbiAgICBpbml0TGFiZWxzICgpOiB2b2lkIHtcbiAgICAgIGNvbnN0IG4gPSB0aGlzLmFuZ2xlcy5sZW5ndGhcbiAgICAgIGxldCBqID0gMCAvLyBrZWVwIHRyYWNrIG9mIHVua25vd25zXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICBpZiAoIXRoaXMubWlzc2luZ1tpXSkge1xuICAgICAgICAgIHRoaXMuYW5nbGVMYWJlbHNbaV0gPSBgJHt0aGlzLmFuZ2xlc1tpXS50b1N0cmluZygpfV5cXFxcY2lyY2BcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzW2ldID0gYCR7U3RyaW5nLmZyb21DaGFyQ29kZSgxMjAgKyBqKX1eXFxcXGNpcmNgIC8vIDEyMCA9ICd4J1xuICAgICAgICAgIGorK1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxufVxuIiwiLyogTWlzc2luZyBhbmdsZXMgaW4gdHJpYW5nbGUgLSBudW1lcmljYWwgKi9cblxuaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldydcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgY29uc3RydWN0b3IgKGRhdGEsIHZpZXcsIG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKSAvLyB0aGlzIHNob3VsZCBiZSBhbGwgdGhhdCdzIHJlcXVpcmVkIHdoZW4gcmVmYWN0b3JlZFxuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICB0aGlzLnZpZXcgPSB2aWV3XG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zLCB2aWV3T3B0aW9ucykge1xuICAgIGNvbnN0IG9wdGlvbnNPdmVycmlkZSA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5BbmdsZTogMjUsXG4gICAgICBtaW5OOiAzLFxuICAgICAgbWF4TjogM1xuICAgIH1cbiAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbihvcHRpb25zLCBvcHRpb25zT3ZlcnJpZGUpXG4gICAgb3B0aW9ucy5yZXBlYXRlZCA9IG9wdGlvbnMucmVwZWF0ZWQgfHwgZmFsc2VcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyhkYXRhLCB2aWV3T3B0aW9ucylcblxuICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUShkYXRhLCB2aWV3LCBvcHRpb25zKVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7IHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZScgfVxufVxuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgTGluRXhwciB7XG4vLyBjbGFzcyBMaW5FeHByIHtcbiAgY29uc3RydWN0b3IgKGEsIGIpIHtcbiAgICB0aGlzLmEgPSBhXG4gICAgdGhpcy5iID0gYlxuICB9XG5cbiAgaXNDb25zdGFudCAoKSB7XG4gICAgcmV0dXJuIHRoaXMuYSA9PT0gMFxuICB9XG5cbiAgdG9TdHJpbmcgKCkge1xuICAgIGxldCBzdHJpbmcgPSAnJ1xuXG4gICAgLy8geCB0ZXJtXG4gICAgaWYgKHRoaXMuYSA9PT0gMSkgeyBzdHJpbmcgKz0gJ3gnIH0gZWxzZSBpZiAodGhpcy5hID09PSAtMSkgeyBzdHJpbmcgKz0gJy14JyB9IGVsc2UgaWYgKHRoaXMuYSAhPT0gMCkgeyBzdHJpbmcgKz0gdGhpcy5hICsgJ3gnIH1cblxuICAgIC8vIHNpZ25cbiAgICBpZiAodGhpcy5hICE9PSAwICYmIHRoaXMuYiA+IDApIHsgc3RyaW5nICs9ICcgKyAnIH0gZWxzZSBpZiAodGhpcy5hICE9PSAwICYmIHRoaXMuYiA8IDApIHsgc3RyaW5nICs9ICcgLSAnIH1cblxuICAgIC8vIGNvbnN0YW50XG4gICAgaWYgKHRoaXMuYiA+IDApIHsgc3RyaW5nICs9IHRoaXMuYiB9IGVsc2UgaWYgKHRoaXMuYiA8IDAgJiYgdGhpcy5hID09PSAwKSB7IHN0cmluZyArPSB0aGlzLmIgfSBlbHNlIGlmICh0aGlzLmIgPCAwKSB7IHN0cmluZyArPSBNYXRoLmFicyh0aGlzLmIpIH1cblxuICAgIHJldHVybiBzdHJpbmdcbiAgfVxuXG4gIHRvU3RyaW5nUCAoKSB7XG4gICAgLy8gcmV0dXJuIGV4cHJlc3Npb24gYXMgYSBzdHJpbmcsIHN1cnJvdW5kZWQgaW4gcGFyZW50aGVzZXMgaWYgYSBiaW5vbWlhbFxuICAgIGlmICh0aGlzLmEgPT09IDAgfHwgdGhpcy5iID09PSAwKSByZXR1cm4gdGhpcy50b1N0cmluZygpXG4gICAgZWxzZSByZXR1cm4gJygnICsgdGhpcy50b1N0cmluZygpICsgJyknXG4gIH1cblxuICBldmFsICh4KSB7XG4gICAgcmV0dXJuIHRoaXMuYSAqIHggKyB0aGlzLmJcbiAgfVxuXG4gIGFkZCAodGhhdCkge1xuICAgIC8vIGFkZCBlaXRoZXIgYW4gZXhwcmVzc2lvbiBvciBhIGNvbnN0YW50XG4gICAgaWYgKHRoYXQuYSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gbmV3IExpbkV4cHIodGhpcy5hICsgdGhhdC5hLCB0aGlzLmIgKyB0aGF0LmIpXG4gICAgZWxzZSByZXR1cm4gbmV3IExpbkV4cHIodGhpcy5hLCB0aGlzLmIgKyB0aGF0KVxuICB9XG5cbiAgdGltZXMgKHRoYXQpIHtcbiAgICByZXR1cm4gbmV3IExpbkV4cHIodGhpcy5hICogdGhhdCwgdGhpcy5iICogdGhhdClcbiAgfVxuXG4gIHN0YXRpYyBzb2x2ZSAoZXhwcjEsIGV4cHIyKSB7XG4gICAgLy8gc29sdmVzIHRoZSB0d28gZXhwcmVzc2lvbnMgc2V0IGVxdWFsIHRvIGVhY2ggb3RoZXJcbiAgICByZXR1cm4gKGV4cHIyLmIgLSBleHByMS5iKSAvIChleHByMS5hIC0gZXhwcjIuYSlcbiAgfVxufVxuIiwiaW1wb3J0IExpbkV4cHIgZnJvbSAnTGluRXhwcidcblxuLyoqIEdpdmVuIGEgc2V0IG9mIGV4cHJlc3Npb25zLCBzZXQgdGhlaXIgc3VtICAqL1xuXG5leHBvcnQgZnVuY3Rpb24gc29sdmVBbmdsZXMgKGV4cHJlc3Npb25zOiBMaW5FeHByW10sIGFuZ2xlU3VtOiBudW1iZXIpOiB7IHg6IG51bWJlcjsgYW5nbGVzOiBudW1iZXJbXTsgfSB7XG4gIGNvbnN0IGV4cHJlc3Npb25TdW0gPSBleHByZXNzaW9ucy5yZWR1Y2UoKGV4cDEsIGV4cDIpID0+IGV4cDEuYWRkKGV4cDIpKVxuICBjb25zdCB4ID0gTGluRXhwci5zb2x2ZShleHByZXNzaW9uU3VtLCBuZXcgTGluRXhwcigwLCBhbmdsZVN1bSkpXG5cbiAgY29uc3QgYW5nbGVzID0gW11cbiAgZXhwcmVzc2lvbnMuZm9yRWFjaChmdW5jdGlvbiAoZXhwcikge1xuICAgIGNvbnN0IGFuZ2xlID0gZXhwci5ldmFsKHgpXG4gICAgaWYgKGFuZ2xlIDw9IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignbmVnYXRpdmUgYW5nbGUnKVxuICAgIH0gZWxzZSB7XG4gICAgICBhbmdsZXMucHVzaChleHByLmV2YWwoeCkpXG4gICAgfVxuICB9KVxuXG4gIHJldHVybiAoeyB4OiB4LCBhbmdsZXM6IGFuZ2xlcyB9KVxufVxuIiwiaW1wb3J0IExpbkV4cHIgZnJvbSAnTGluRXhwcidcbmltcG9ydCB7IHJhbmRCZXR3ZWVuLCByYW5kRWxlbSwgcmFuZE11bHRCZXR3ZWVuLCBzaHVmZmxlLCB3ZWFrSW5jbHVkZXMgfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgeyBBbGdlYnJhT3B0aW9ucyB9IGZyb20gJy4vQWxnZWJyYU9wdGlvbnMnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzRGF0YSB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0RhdGEnXG5pbXBvcnQgeyBzb2x2ZUFuZ2xlcyB9IGZyb20gJy4vc29sdmVBbmdsZXMnXG5cbnR5cGUgT3B0aW9ucyA9IEFsZ2VicmFPcHRpb25zXG5cbmV4cG9ydCB0eXBlIEV4cHJlc3Npb25UeXBlID0gJ2FkZCcgfCAnbXVsdGlwbHknIHwgJ21peGVkJ1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGltcGxlbWVudHMgTWlzc2luZ0FuZ2xlc0RhdGEge1xuICAgIGFuZ2xlczogbnVtYmVyW11cbiAgICBtaXNzaW5nOiBib29sZWFuW11cbiAgICBhbmdsZVN1bTogbnVtYmVyXG4gICAgYW5nbGVMYWJlbHM6IHN0cmluZ1tdXG4gICAgeDogbnVtYmVyIC8vXG5cbiAgICBjb25zdHJ1Y3RvciAoYW5nbGVzOiBudW1iZXJbXSwgbWlzc2luZzogYm9vbGVhbltdLCBhbmdsZVN1bTogbnVtYmVyLCBhbmdsZUxhYmVsczogc3RyaW5nW10sIHg6IG51bWJlcikge1xuICAgICAgdGhpcy5hbmdsZXMgPSBhbmdsZXNcbiAgICAgIHRoaXMuYW5nbGVTdW0gPSBhbmdsZVN1bVxuICAgICAgdGhpcy5hbmdsZUxhYmVscyA9IGFuZ2xlTGFiZWxzXG4gICAgICB0aGlzLnggPSB4XG4gICAgICB0aGlzLm1pc3NpbmcgPSBtaXNzaW5nXG4gICAgfVxuXG4gICAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEge1xuICAgICAgY29uc3QgZGVmYXVsdHMgOiBQYXJ0aWFsPE9wdGlvbnM+ID0ge1xuICAgICAgICBleHByZXNzaW9uVHlwZXM6IFsnYWRkJywgJ211bHRpcGx5JywgJ21peGVkJ10sXG4gICAgICAgIGVuc3VyZVg6IHRydWUsXG4gICAgICAgIGluY2x1ZGVDb25zdGFudHM6IHRydWUsXG4gICAgICAgIG1pbkNvZWZmaWNpZW50OiAxLFxuICAgICAgICBtYXhDb2VmZmljaWVudDogNCxcbiAgICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgICAgbWluQW5nbGU6IDIwLFxuICAgICAgICBtaW5OOiAyLFxuICAgICAgICBtYXhOOiA0LFxuICAgICAgICBtaW5YVmFsdWU6IDE1XG4gICAgICB9XG4gICAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICAgIC8vIGFzc2lnbiBjYWxjdWxhdGVkIGRlZmF1bHRzOlxuICAgICAgb3B0aW9ucy5tYXhDb25zdGFudCA9IG9wdGlvbnMubWF4Q29uc3RhbnQgfHwgb3B0aW9ucy5hbmdsZVN1bSAvIDJcbiAgICAgIG9wdGlvbnMubWF4WFZhbHVlID0gb3B0aW9ucy5tYXhYVmFsdWUgfHwgb3B0aW9ucy5hbmdsZVN1bSAvIDRcblxuICAgICAgLy8gUmFuZG9taXNlL3NldCB1cCBtYWluIGZlYXR1cmVzXG4gICAgICBjb25zdCBuIDogbnVtYmVyID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5OLCBvcHRpb25zLm1heE4pXG5cbiAgICAgIGNvbnN0IHR5cGUgOiBFeHByZXNzaW9uVHlwZSA9IHJhbmRFbGVtKG9wdGlvbnMuZXhwcmVzc2lvblR5cGVzKVxuXG4gICAgICAvLyBHZW5lcmF0ZSBleHByZXNzaW9ucy9hbmdsZXNcbiAgICAgIGxldCBleHByZXNzaW9ucyA6IExpbkV4cHJbXVxuICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ21peGVkJzpcbiAgICAgICAgICBleHByZXNzaW9ucyA9IG1ha2VNaXhlZEV4cHJlc3Npb25zKG4sIG9wdGlvbnMpXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAnbXVsdGlwbHknOlxuICAgICAgICAgIGV4cHJlc3Npb25zID0gbWFrZU11bHRpcGxpY2F0aW9uRXhwcmVzc2lvbnMobiwgb3B0aW9ucylcbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICdhZGQnOlxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGV4cHJlc3Npb25zID0gbWFrZUFkZEV4cHJlc3Npb25zKG4sIG9wdGlvbnMpXG4gICAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGV4cHJlc3Npb25zID0gc2h1ZmZsZShleHByZXNzaW9ucylcblxuICAgICAgLy8gU29sdmUgZm9yIHggYW5kIGFuZ2xlc1xuICAgICAgY29uc3QgeyB4LCBhbmdsZXMgfSA6IHt4Om51bWJlciwgYW5nbGVzOiBudW1iZXJbXX0gPSBzb2x2ZUFuZ2xlcyhleHByZXNzaW9ucywgb3B0aW9ucy5hbmdsZVN1bSlcblxuICAgICAgLy8gbGFiZWxzIGFyZSBqdXN0IGV4cHJlc3Npb25zIGFzIHN0cmluZ3NcbiAgICAgIGNvbnN0IGxhYmVscyA9IGV4cHJlc3Npb25zLm1hcChlID0+IGAke2UudG9TdHJpbmdQKCl9XlxcXFxjaXJjYClcblxuICAgICAgLy8gbWlzc2luZyB2YWx1ZXMgYXJlIHRoZSBvbmVzIHdoaWNoIGFyZW4ndCBjb25zdGFudFxuICAgICAgY29uc3QgbWlzc2luZyA9IGV4cHJlc3Npb25zLm1hcChlID0+ICFlLmlzQ29uc3RhbnQoKSlcblxuICAgICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEoYW5nbGVzLCBtaXNzaW5nLCBvcHRpb25zLmFuZ2xlU3VtLCBsYWJlbHMsIHgpXG4gICAgfVxuXG4gICAgLy8gbWFrZXMgdHlwZXNjcmlwdCBzaHV0IHVwLCBtYWtlcyBlc2xpbnQgbm9pc3lcbiAgICBpbml0TGFiZWxzICgpIDogdm9pZCB7fSAgLy8gZXNsaW50LWRpc2FibGUtbGluZVxufVxuXG5mdW5jdGlvbiBtYWtlTWl4ZWRFeHByZXNzaW9ucyAobjogbnVtYmVyLCBvcHRpb25zOiBPcHRpb25zKSA6IExpbkV4cHJbXSB7XG4gIGNvbnN0IGV4cHJlc3Npb25zOiBMaW5FeHByW10gPSBbXVxuICBjb25zdCB4ID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5YVmFsdWUsIG9wdGlvbnMubWF4WFZhbHVlKVxuICBsZXQgbGVmdCA9IG9wdGlvbnMuYW5nbGVTdW1cbiAgbGV0IGFsbGNvbnN0YW50ID0gdHJ1ZVxuICBmb3IgKGxldCBpID0gMDsgaSA8IG4gLSAxOyBpKyspIHtcbiAgICBjb25zdCBhID0gcmFuZEJldHdlZW4oMSwgb3B0aW9ucy5tYXhDb2VmZmljaWVudClcbiAgICBsZWZ0IC09IGEgKiB4XG4gICAgY29uc3QgbWF4YiA9IE1hdGgubWluKGxlZnQgLSBvcHRpb25zLm1pbkFuZ2xlICogKG4gLSBpIC0gMSksIG9wdGlvbnMubWF4Q29uc3RhbnQpXG4gICAgY29uc3QgbWluYiA9IG9wdGlvbnMubWluQW5nbGUgLSBhICogeFxuICAgIGNvbnN0IGIgPSByYW5kQmV0d2VlbihtaW5iLCBtYXhiKVxuICAgIGlmIChhICE9PSAwKSB7IGFsbGNvbnN0YW50ID0gZmFsc2UgfVxuICAgIGxlZnQgLT0gYlxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoYSwgYikpXG4gIH1cbiAgY29uc3QgbGFzdE1pblhDb2VmZiA9IGFsbGNvbnN0YW50ID8gMSA6IG9wdGlvbnMubWluQ29lZmZpY2llbnRcbiAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKGxhc3RNaW5YQ29lZmYsIG9wdGlvbnMubWF4Q29lZmZpY2llbnQpXG4gIGNvbnN0IGIgPSBsZWZ0IC0gYSAqIHhcbiAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihhLCBiKSlcblxuICByZXR1cm4gZXhwcmVzc2lvbnNcbn1cblxuZnVuY3Rpb24gbWFrZUFkZEV4cHJlc3Npb25zIChuOiBudW1iZXIsIG9wdGlvbnM6IE9wdGlvbnMpIDogTGluRXhwcltdIHtcbiAgY29uc3QgZXhwcmVzc2lvbnM6IExpbkV4cHJbXSA9IFtdXG4gIGNvbnN0IGFuZ2xlczogbnVtYmVyW10gPSBbXVxuICBjb25zdCBjb25zdGFudHMgPSAob3B0aW9ucy5pbmNsdWRlQ29uc3RhbnRzID09PSB0cnVlIHx8IHdlYWtJbmNsdWRlcyhvcHRpb25zLmluY2x1ZGVDb25zdGFudHMsICdhZGQnKSlcbiAgaWYgKG4gPT09IDIgJiYgb3B0aW9ucy5lbnN1cmVYICYmIGNvbnN0YW50cykgbiA9IDNcblxuICBjb25zdCB4ID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5YVmFsdWUsIG9wdGlvbnMubWF4WFZhbHVlKVxuICBsZXQgbGVmdCA9IG9wdGlvbnMuYW5nbGVTdW1cbiAgbGV0IGFuZ2xlc0xlZnQgPSBuXG5cbiAgLy8gZmlyc3QgZG8gdGhlIGV4cHJlc3Npb25zIGVuc3VyZWQgYnkgZW5zdXJlX3ggYW5kIGNvbnN0YW50c1xuICBpZiAob3B0aW9ucy5lbnN1cmVYKSB7XG4gICAgYW5nbGVzTGVmdC0tXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCAwKSlcbiAgICBhbmdsZXMucHVzaCh4KVxuICAgIGxlZnQgLT0geFxuICB9XG5cbiAgaWYgKGNvbnN0YW50cykge1xuICAgIGFuZ2xlc0xlZnQtLVxuICAgIGNvbnN0IGMgPSByYW5kQmV0d2VlbihcbiAgICAgIG9wdGlvbnMubWluQW5nbGUsXG4gICAgICBsZWZ0IC0gb3B0aW9ucy5taW5BbmdsZSAqIGFuZ2xlc0xlZnRcbiAgICApXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigwLCBjKSlcbiAgICBhbmdsZXMucHVzaChjKVxuICAgIGxlZnQgLT0gY1xuICB9XG5cbiAgLy8gbWlkZGxlIGFuZ2xlc1xuICB3aGlsZSAoYW5nbGVzTGVmdCA+IDEpIHtcbiAgICAvLyBhZGQgJ3grYicgYXMgYW4gZXhwcmVzc2lvbi4gTWFrZSBzdXJlIGIgZ2l2ZXMgc3BhY2VcbiAgICBhbmdsZXNMZWZ0LS1cbiAgICBsZWZ0IC09IHhcbiAgICBjb25zdCBtYXhiID0gTWF0aC5taW4oXG4gICAgICBsZWZ0IC0gb3B0aW9ucy5taW5BbmdsZSAqIGFuZ2xlc0xlZnQsXG4gICAgICBvcHRpb25zLm1heENvbnN0YW50XG4gICAgKVxuICAgIGNvbnN0IG1pbmIgPSBNYXRoLm1heChcbiAgICAgIG9wdGlvbnMubWluQW5nbGUgLSB4LFxuICAgICAgLW9wdGlvbnMubWF4Q29uc3RhbnRcbiAgICApXG4gICAgY29uc3QgYiA9IHJhbmRCZXR3ZWVuKG1pbmIsIG1heGIpXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCBiKSlcbiAgICBhbmdsZXMucHVzaCh4ICsgYilcbiAgICBsZWZ0IC09IGJcbiAgfVxuXG4gIC8vIGxhc3QgYW5nbGVcbiAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCBsZWZ0IC0geCkpXG4gIGFuZ2xlcy5wdXNoKGxlZnQpXG5cbiAgcmV0dXJuIGV4cHJlc3Npb25zXG59XG5cbmZ1bmN0aW9uIG1ha2VNdWx0aXBsaWNhdGlvbkV4cHJlc3Npb25zIChuOiBudW1iZXIsIG9wdGlvbnM6IE9wdGlvbnMpIDogTGluRXhwcltdIHtcbiAgY29uc3QgZXhwcmVzc2lvbnMgOiBMaW5FeHByW10gPSBbXVxuXG4gIGNvbnN0IGNvbnN0YW50cyA6IGJvb2xlYW4gPSAob3B0aW9ucy5pbmNsdWRlQ29uc3RhbnRzID09PSB0cnVlIHx8IHdlYWtJbmNsdWRlcyhvcHRpb25zLmluY2x1ZGVDb25zdGFudHMsICdtdWx0JykpXG4gIGlmIChuID09PSAyICYmIG9wdGlvbnMuZW5zdXJlWCAmJiBjb25zdGFudHMpIG4gPSAzIC8vIG5lZWQgYXQgbGVhc3QgMyBhbmdsZXMgZm9yIHRoaXMgdG8gbWFrZSBzZW5zZVxuXG4gIC8vIGNob29zZSBhIHRvdGFsIG9mIGNvZWZmaWNpZW50c1xuICAvLyBwaWNrIHggYmFzZWQgb24gdGhhdFxuICBsZXQgYW5nbGVzbGVmdCA9IG5cbiAgY29uc3QgdG90YWxDb2VmZiA9IGNvbnN0YW50c1xuICAgID8gcmFuZEJldHdlZW4obiwgKG9wdGlvbnMuYW5nbGVTdW0gLSBvcHRpb25zLm1pbkFuZ2xlKSAvIG9wdGlvbnMubWluQW5nbGUsIE1hdGgucmFuZG9tKSAvLyBpZiBpdCdzIHRvbyBiaWcsIGFuZ2xlcyBnZXQgdG9vIHNtYWxsXG4gICAgOiByYW5kRWxlbShbMywgNCwgNSwgNiwgOCwgOSwgMTBdLmZpbHRlcih4ID0+IHggPj0gbiksIE1hdGgucmFuZG9tKVxuICBsZXQgY29lZmZsZWZ0ID0gdG90YWxDb2VmZlxuXG4gIC8vIGZpcnN0IDAvMS8yXG4gIGlmIChjb25zdGFudHMpIHtcbiAgICAvLyByZWR1Y2UgdG8gbWFrZSB3aGF0J3MgbGVmdCBhIG11bHRpcGxlIG9mIHRvdGFsX2NvZWZmXG4gICAgYW5nbGVzbGVmdC0tXG4gICAgY29uc3QgbmV3bGVmdCA9IHJhbmRNdWx0QmV0d2Vlbih0b3RhbENvZWZmICogb3B0aW9ucy5taW5BbmdsZSwgb3B0aW9ucy5hbmdsZVN1bSAtIG9wdGlvbnMubWluQW5nbGUsIHRvdGFsQ29lZmYpXG4gICAgY29uc3QgYyA9IG9wdGlvbnMuYW5nbGVTdW0gLSBuZXdsZWZ0XG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigwLCBjKSlcbiAgfVxuXG4gIC8vIERvbid0IHVzZSB4IGhlcmUsIGJ1dDpcbiAgLy8geCA9IGxlZnQgLyB0b3RhbENvZWZmXG5cbiAgaWYgKG9wdGlvbnMuZW5zdXJlWCkge1xuICAgIGFuZ2xlc2xlZnQtLVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgMCkpXG4gICAgY29lZmZsZWZ0IC09IDFcbiAgfVxuXG4gIC8vIG1pZGRsZVxuICB3aGlsZSAoYW5nbGVzbGVmdCA+IDEpIHtcbiAgICBhbmdsZXNsZWZ0LS1cbiAgICBjb25zdCBtaW5hID0gMVxuICAgIGNvbnN0IG1heGEgPSBjb2VmZmxlZnQgLSBhbmdsZXNsZWZ0IC8vIGxlYXZlIGVub3VnaCBmb3Igb3RoZXJzIFRPRE86IGFkZCBtYXhfY29lZmZcbiAgICBjb25zdCBhID0gcmFuZEJldHdlZW4obWluYSwgbWF4YSlcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKGEsIDApKVxuICAgIGNvZWZmbGVmdCAtPSBhXG4gIH1cblxuICAvLyBsYXN0XG4gIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoY29lZmZsZWZ0LCAwKSlcbiAgcmV0dXJuIGV4cHJlc3Npb25zXG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBMYWJlbCB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNBcm91bmRWaWV3J1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzVmlld09wdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlldyBleHRlbmRzIE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IHtcbiAgICBPIDogUG9pbnRcbiAgICBBOiBQb2ludFxuICAgIEM6IFBvaW50W11cbiAgICBsYWJlbHM6IExhYmVsW11cbiAgICBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50XG4gICAgRE9NOiBIVE1MRWxlbWVudFxuICAgIHJvdGF0aW9uOiBudW1iZXJcbiAgICB3aWR0aDogbnVtYmVyXG4gICAgaGVpZ2h0OiBudW1iZXJcbiAgICBkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGFcblxuICAgIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEsIG9wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykge1xuICAgICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc3VwZXIgY29uc3RydWN0b3IgZG9lcyByZWFsIHdvcmtcbiAgICAgIGNvbnN0IHNvbHV0aW9uTGFiZWw6IFBhcnRpYWw8TGFiZWw+ID0ge1xuICAgICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdGhpcy5oZWlnaHQgLSAxMCksXG4gICAgICAgIHRleHRxOiAnJyxcbiAgICAgICAgdGV4dGE6IGB4ID0gJHt0aGlzLmRhdGEueH1eXFxcXGNpcmNgLFxuICAgICAgICBzdHlsZXE6ICdoaWRkZW4nLFxuICAgICAgICBzdHlsZWE6ICdleHRyYS1hbnN3ZXInXG4gICAgICB9XG4gICAgICBzb2x1dGlvbkxhYmVsLnN0eWxlID0gc29sdXRpb25MYWJlbC5zdHlsZXFcbiAgICAgIHNvbHV0aW9uTGFiZWwudGV4dCA9IHNvbHV0aW9uTGFiZWwudGV4dHFcblxuICAgICAgdGhpcy5sYWJlbHMucHVzaChzb2x1dGlvbkxhYmVsIGFzIExhYmVsKVxuICAgIH1cbn1cbiIsIi8qKiBNaXNzaW5nIGFuZ2xlcyBhcm91bmQgYSBwb2ludCBvciBvbiBhIHN0cmFpZ2h0IGxpbmUsIHVzaW5nIGFsZ2VicmFpYyBleHByZXNzaW9ucyAqL1xuXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tICcuL0FsZ2VicmFPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGFcbiAgdmlldzogTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3XG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSwgdmlldzogTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3KSB7IC8vIGVmZmVjdGl2ZWx5IHByaXZhdGVcbiAgICBzdXBlcigpIC8vIGJ1YmJsZXMgdG8gUVxuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICB0aGlzLnZpZXcgPSB2aWV3XG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBBbGdlYnJhT3B0aW9ucywgdmlld09wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEge1xuICAgIGNvbnN0IGRlZmF1bHRzIDogQWxnZWJyYU9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDEwLFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDQsXG4gICAgICByZXBlYXRlZDogZmFsc2VcbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlldyhkYXRhLCB2aWV3T3B0aW9ucykgLy8gVE9ETyBlbGltaW5hdGUgcHVibGljIGNvbnN0cnVjdG9yc1xuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3J1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldyBleHRlbmRzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcge1xuICBkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGFcbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSwgb3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKVxuXG4gICAgY29uc3Qgc29sdXRpb25MYWJlbDogUGFydGlhbDxMYWJlbD4gPSB7XG4gICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdGhpcy5oZWlnaHQgLSAxMCksXG4gICAgICB0ZXh0cTogJycsXG4gICAgICB0ZXh0YTogYHggPSAke3RoaXMuZGF0YS54fV5cXFxcY2lyY2AsXG4gICAgICBzdHlsZXE6ICdoaWRkZW4nLFxuICAgICAgc3R5bGVhOiAnZXh0cmEtYW5zd2VyJ1xuICAgIH1cbiAgICBzb2x1dGlvbkxhYmVsLnN0eWxlID0gc29sdXRpb25MYWJlbC5zdHlsZXFcbiAgICBzb2x1dGlvbkxhYmVsLnRleHQgPSBzb2x1dGlvbkxhYmVsLnRleHRxXG5cbiAgICB0aGlzLmxhYmVscy5wdXNoKHNvbHV0aW9uTGFiZWwgYXMgTGFiZWwpXG4gIH1cbn1cbiIsImltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgeyBBbGdlYnJhT3B0aW9ucyB9IGZyb20gJy4vQWxnZWJyYU9wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVZpZXcnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGFcbiAgdmlldzogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlld1xuXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEsIHZpZXc6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIHRoaXMudmlldyA9IHZpZXdcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IEFsZ2VicmFPcHRpb25zLCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEge1xuICAgIGNvbnN0IG9wdGlvbnNPdmVycmlkZSA6IEFsZ2VicmFPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbk46IDMsXG4gICAgICBtYXhOOiAzLFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlXG4gICAgfVxuICAgIE9iamVjdC5hc3NpZ24ob3B0aW9ucywgb3B0aW9uc092ZXJyaWRlKVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFWaWV3KGRhdGEsIHZpZXdPcHRpb25zKVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBMYWJlbCB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3J1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXcgZXh0ZW5kcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IHtcbiAgZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGFcbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLCBvcHRpb25zOiBWaWV3T3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpXG4gICAgc3VwZXIuc2NhbGVUb0ZpdCh0aGlzLndpZHRoLCB0aGlzLmhlaWdodCwgNDApXG4gICAgc3VwZXIudHJhbnNsYXRlKDAsIC0zMClcblxuICAgIGNvbnN0IGluc3RydWN0aW9uTGFiZWw6IExhYmVsID0ge1xuICAgICAgdGV4dHE6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHRleHRhOiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICB0ZXh0OiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICBzdHlsZXE6ICdleHRyYS1pbmZvJyxcbiAgICAgIHN0eWxlYTogJ2V4dHJhLWluZm8nLFxuICAgICAgc3R5bGU6ICdleHRyYS1pbmZvJyxcbiAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwKVxuICAgIH1cbiAgICB0aGlzLmxhYmVscy5wdXNoKGluc3RydWN0aW9uTGFiZWwpXG4gIH1cbn1cbiIsImltcG9ydCBMaW5FeHByIGZyb20gJ0xpbkV4cHInXG5pbXBvcnQgeyByYW5kQmV0d2VlbiwgcmFuZEVsZW0sIHJhbmRNdWx0QmV0d2VlbiB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEnXG5pbXBvcnQgeyBzb2x2ZUFuZ2xlcyB9IGZyb20gJy4vc29sdmVBbmdsZXMnXG5pbXBvcnQgeyBXb3JkZWRPcHRpb25zIH0gZnJvbSAnLi9Xb3JkZWRPcHRpb25zJ1xuXG5leHBvcnQgdHlwZSBXb3JkZWRUeXBlID0gJ2FkZCcgfCAnbXVsdGlwbHknIHwgJ3JhdGlvJyB8ICdwZXJjZW50J1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSBleHRlbmRzIE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSB7XG4gIGFuZ2xlczogbnVtYmVyW10gLy8gSW5oZXJpdGVkXG4gIG1pc3Npbmc6IGJvb2xlYW5bXSAvLyAgICB8XG4gIGFuZ2xlU3VtOiBudW1iZXIgLy8gICAgfFxuICBhbmdsZUxhYmVsczogc3RyaW5nW10gLy8gICAgdlxuICBpbnN0cnVjdGlvbnM6IHN0cmluZ1tdIC8vIFRoZSAnaW5zdHJ1Y3Rpb25zJyBnaXZlblxuICB4OiBudW1iZXIgLy8gdW51c2VkIGJ1dCBpbmhlcml0ZWRcblxuICBjb25zdHJ1Y3RvciAoYW5nbGVzOiBudW1iZXJbXSwgbWlzc2luZzogYm9vbGVhbltdLCBhbmdsZVN1bTogbnVtYmVyLCBhbmdsZUxhYmVsczogc3RyaW5nW10sIGluc3RydWN0aW9uczogc3RyaW5nW10pIHtcbiAgICBzdXBlcihhbmdsZXMsIG1pc3NpbmcsIGFuZ2xlU3VtLCBhbmdsZUxhYmVscywgbnVsbClcbiAgICB0aGlzLmluc3RydWN0aW9ucyA9IGluc3RydWN0aW9uc1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9ucyA6IFdvcmRlZE9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEge1xuICAgIGNvbnN0IGRlZmF1bHRzIDogV29yZGVkT3B0aW9ucyA9IHtcbiAgICAgIG1pbk46IDIsXG4gICAgICBtYXhOOiAyLFxuICAgICAgbWluQW5nbGU6IDEwLFxuICAgICAgbWluQWRkZW5kOiAtOTAsXG4gICAgICBtYXhBZGRlbmQ6IDkwLFxuICAgICAgbWluTXVsdGlwbGllcjogMSxcbiAgICAgIG1heE11bHRpcGxpZXI6IDUsXG4gICAgICB0eXBlczogWydhZGQnLCAnbXVsdGlwbHknLCAncGVyY2VudCcsICdyYXRpbyddXG4gICAgfVxuICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIGNvbnN0IG4gPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbk4sIG9wdGlvbnMubWF4TilcbiAgICBjb25zdCBhbmdsZUxhYmVsczogc3RyaW5nW10gPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBhbmdsZUxhYmVsc1tpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKSAvLyA2NSA9ICdBJ1xuICAgIH1cbiAgICBsZXQgZXhwcmVzc2lvbnM6IExpbkV4cHJbXSA9IFtdXG4gICAgbGV0IGluc3RydWN0aW9uczogc3RyaW5nW10gPSBbXVxuXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCAwKSlcblxuICAgIC8vIExvb3AgdGlsIHdlIGdldCBvbmUgdGhhdCB3b3Jrc1xuICAgIC8vIFByb2JhYmx5IHJlYWxseSBpbmVmZmljaWVudCEhXG5cbiAgICBsZXQgc3VjY2VzcyA9IGZhbHNlXG4gICAgbGV0IGF0dGVtcHRjb3VudCA9IDBcbiAgICB3aGlsZSAoIXN1Y2Nlc3MpIHtcbiAgICAgIGlmIChhdHRlbXB0Y291bnQgPiAyMCkge1xuICAgICAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKVxuICAgICAgICBjb25zb2xlLmxvZygnR2F2ZSB1cCBhZnRlciAnICsgYXR0ZW1wdGNvdW50ICsgJyBhdHRlbXB0cycpXG4gICAgICAgIHN1Y2Nlc3MgPSB0cnVlXG4gICAgICB9XG4gICAgICBmb3IgKGxldCBpID0gMTsgaSA8IG47IGkrKykge1xuICAgICAgICBjb25zdCB0eXBlID0gcmFuZEVsZW0ob3B0aW9ucy50eXBlcylcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgY2FzZSAnYWRkJzoge1xuICAgICAgICAgICAgY29uc3QgYWRkZW5kID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5BZGRlbmQsIG9wdGlvbnMubWF4QWRkZW5kKVxuICAgICAgICAgICAgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uc1tpIC0gMV0uYWRkKGFkZGVuZCkpXG4gICAgICAgICAgICBpbnN0cnVjdGlvbnMucHVzaChgXFxcXHRleHR7QW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpfSQgaXMgJHtjb21wYXJhdG9yKGFkZGVuZCwgJysnKX0gYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NCArIGkpfSR9YClcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ211bHRpcGx5Jzoge1xuICAgICAgICAgICAgY29uc3QgbXVsdGlwbGllciA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTXVsdGlwbGllciwgb3B0aW9ucy5tYXhNdWx0aXBsaWVyKVxuICAgICAgICAgICAgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uc1tpIC0gMV0udGltZXMobXVsdGlwbGllcikpXG4gICAgICAgICAgICBpbnN0cnVjdGlvbnMucHVzaChgXFxcXHRleHR7QW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpfSQgaXMgJHtjb21wYXJhdG9yKG11bHRpcGxpZXIsICcqJyl9IGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjQgKyBpKX0kfWApXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlICdwZXJjZW50Jzoge1xuICAgICAgICAgICAgY29uc3QgcGVyY2VudGFnZSA9IHJhbmRNdWx0QmV0d2Vlbig1LCAxMDAsIDUpXG4gICAgICAgICAgICBjb25zdCBpbmNyZWFzZSA9IE1hdGgucmFuZG9tKCkgPCAwLjVcbiAgICAgICAgICAgIGNvbnN0IG11bHRpcGxpZXIgPSBpbmNyZWFzZSA/IDEgKyBwZXJjZW50YWdlIC8gMTAwIDogMSAtIHBlcmNlbnRhZ2UgLyAxMDBcbiAgICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2goZXhwcmVzc2lvbnNbaSAtIDFdLnRpbWVzKG11bHRpcGxpZXIpKVxuICAgICAgICAgICAgaW5zdHJ1Y3Rpb25zLnB1c2goXG4gICAgICAgICAgICAgIGBcXFxcdGV4dHtBbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSl9JCBpcyAkJHtwZXJjZW50YWdlfVxcXFwlJCAke2luY3JlYXNlID8gJ2JpZ2dlcicgOiAnc21hbGxlcid9IHRoYW4gYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NCArIGkpfSR9YClcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ3JhdGlvJzoge1xuICAgICAgICAgICAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKDEsIDEwKVxuICAgICAgICAgICAgY29uc3QgYiA9IHJhbmRCZXR3ZWVuKDEsIDEwKVxuICAgICAgICAgICAgY29uc3QgbXVsdGlwbGllciA9IGIgLyBhXG4gICAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb25zW2kgLSAxXS50aW1lcyhtdWx0aXBsaWVyKSlcbiAgICAgICAgICAgIGluc3RydWN0aW9ucy5wdXNoKFxuICAgICAgICAgICAgICBgXFxcXHRleHR7VGhlIHJhdGlvIG9mIGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjQgKyBpKX0kIHRvIGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKX0kIGlzICQke2F9OiR7Yn0kfWBcbiAgICAgICAgICAgIClcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGNoZWNrIGl0IG1ha2VzIHNlbnNlXG4gICAgICBzdWNjZXNzID0gdHJ1ZVxuICAgICAgY29uc3QgZXhwcmVzc2lvbnN1bSA9IGV4cHJlc3Npb25zLnJlZHVjZSgoZXhwMSwgZXhwMikgPT4gZXhwMS5hZGQoZXhwMikpXG4gICAgICBjb25zdCB4ID0gTGluRXhwci5zb2x2ZShleHByZXNzaW9uc3VtLCBuZXcgTGluRXhwcigwLCBvcHRpb25zLmFuZ2xlU3VtKSlcblxuICAgICAgZXhwcmVzc2lvbnMuZm9yRWFjaChmdW5jdGlvbiAoZXhwcikge1xuICAgICAgICBpZiAoIXN1Y2Nlc3MgfHwgZXhwci5ldmFsKHgpIDwgb3B0aW9ucy5taW5BbmdsZSkge1xuICAgICAgICAgIHN1Y2Nlc3MgPSBmYWxzZVxuICAgICAgICAgIGluc3RydWN0aW9ucyA9IFtdXG4gICAgICAgICAgZXhwcmVzc2lvbnMgPSBbZXhwcmVzc2lvbnNbMF1dXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIGF0dGVtcHRjb3VudCsrXG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdBdHRlbXB0czogJyArIGF0dGVtcHRjb3VudClcblxuICAgIGNvbnN0IGFuZ2xlcyA9IHNvbHZlQW5nbGVzKGV4cHJlc3Npb25zLCBvcHRpb25zLmFuZ2xlU3VtKS5hbmdsZXNcbiAgICBjb25zdCBtaXNzaW5nID0gYW5nbGVzLm1hcCgoKSA9PiB0cnVlKVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGFuZ2xlcywgbWlzc2luZywgb3B0aW9ucy5hbmdsZVN1bSwgYW5nbGVMYWJlbHMsIGluc3RydWN0aW9ucylcbiAgfVxufVxuXG4vKipcbiAqIEdlbmVyYXRlcyB3b3JkZWQgdmVyc2lvbiBvZiBhbiBvcGVyYXRpb1xuICogQHBhcmFtIG51bWJlciBUaGUgbXVsdGlwbGllciBvciBhZGRlbmRcbiAqIEBwYXJhbSBvcGVyYXRvciBUaGUgb3BlcmF0b3IsIGUuZyBhZGRpbmcgJ21vcmUgdGhhbicsIG9yIG11bHRpcGx5aW5nICd0aW1lcyBsYXJnZXIgdGhhbidcbiAqL1xuZnVuY3Rpb24gY29tcGFyYXRvciAobnVtYmVyOiBudW1iZXIsIG9wZXJhdG9yOiAnKid8JysnKSB7XG4gIHN3aXRjaCAob3BlcmF0b3IpIHtcbiAgICBjYXNlICcqJzpcbiAgICAgIHN3aXRjaCAobnVtYmVyKSB7XG4gICAgICAgIGNhc2UgMTogcmV0dXJuICd0aGUgc2FtZSBhcydcbiAgICAgICAgY2FzZSAyOiByZXR1cm4gJ2RvdWJsZSdcbiAgICAgICAgZGVmYXVsdDogcmV0dXJuIGAkJHtudW1iZXJ9JCB0aW1lcyBsYXJnZXIgdGhhbmBcbiAgICAgIH1cbiAgICBjYXNlICcrJzpcbiAgICAgIHN3aXRjaCAobnVtYmVyKSB7XG4gICAgICAgIGNhc2UgMDogcmV0dXJuICd0aGUgc2FtZSBhcydcbiAgICAgICAgZGVmYXVsdDogcmV0dXJuIGAkJHtNYXRoLmFicyhudW1iZXIpLnRvU3RyaW5nKCl9XlxcXFxjaXJjJCAkeyhudW1iZXIgPCAwKSA/ICdsZXNzIHRoYW4nIDogJ21vcmUgdGhhbid9YFxuICAgICAgfVxuICB9XG59XG4iLCJpbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3J1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEnXG5pbXBvcnQgeyBXb3JkZWRPcHRpb25zIH0gZnJvbSAnLi9Xb3JkZWRPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YVxuICB2aWV3OiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3XG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSwgdmlldzogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkVmlldykge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgdGhpcy52aWV3ID0gdmlld1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogV29yZGVkT3B0aW9ucywgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEge1xuICAgIGNvbnN0IG9wdGlvbnNPdmVycmlkZSA6IFdvcmRlZE9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDMsXG4gICAgICByZXBlYXRlZDogZmFsc2VcbiAgICB9XG4gICAgT2JqZWN0LmFzc2lnbihvcHRpb25zLCBvcHRpb25zT3ZlcnJpZGUpXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEucmFuZG9tKG9wdGlvbnMpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3KGRhdGEsIHZpZXdPcHRpb25zKVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBMYWJlbCB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldyBleHRlbmRzIE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IHtcbiAgZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGFcbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLCBvcHRpb25zOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBkb2VzIG1vc3Qgb2YgdGhlIHNldCB1cFxuICAgIHN1cGVyLnRyYW5zbGF0ZSgwLCAtMTUpXG4gICAgY29uc3QgaW5zdHJ1Y3Rpb25MYWJlbCA6IExhYmVsID0ge1xuICAgICAgdGV4dHE6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHRleHRhOiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICB0ZXh0OiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICBzdHlsZXE6ICdleHRyYS1pbmZvJyxcbiAgICAgIHN0eWxlYTogJ2V4dHJhLWluZm8nLFxuICAgICAgc3R5bGU6ICdleHRyYS1pbmZvJyxcbiAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwKVxuICAgIH1cbiAgICB0aGlzLmxhYmVscy5wdXNoKGluc3RydWN0aW9uTGFiZWwpXG4gIH1cbn1cbiIsImltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEnXG5pbXBvcnQgeyBXb3JkZWRPcHRpb25zIH0gZnJvbSAnLi9Xb3JkZWRPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzV29yZGVkUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGFcbiAgdmlldzogTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXdcblxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEsIHZpZXc6IE1pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3KSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICB0aGlzLnZpZXcgPSB2aWV3XG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBXb3JkZWRPcHRpb25zLCB2aWV3T3B0aW9uczogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNXb3JkZWRRIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IFdvcmRlZE9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDEwLFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDIsXG4gICAgICByZXBlYXRlZDogZmFsc2VcbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgdmlld09wdGlvbnMgPSB2aWV3T3B0aW9ucyB8fCB7fVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcoZGF0YSwgdmlld09wdGlvbnMpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxufVxuIiwiLyoqICBDbGFzcyB0byB3cmFwIHZhcmlvdXMgbWlzc2luZyBhbmdsZXMgY2xhc3Nlc1xuICogUmVhZHMgb3B0aW9ucyBhbmQgdGhlbiB3cmFwcyB0aGUgYXBwcm9wcmlhdGUgb2JqZWN0LCBtaXJyb3JpbmcgdGhlIG1haW5cbiAqIHB1YmxpYyBtZXRob2RzXG4gKlxuICogVGhpcyBjbGFzcyBkZWFscyB3aXRoIHRyYW5zbGF0aW5nIGRpZmZpY3VsdHkgaW50byBxdWVzdGlvbiB0eXBlc1xuKi9cblxuaW1wb3J0IHsgT3B0aW9uc1NwZWMgfSBmcm9tICdPcHRpb25zU3BlYydcbmltcG9ydCB7IHJhbmRFbGVtIH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFEgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5cbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUSdcbmltcG9ydCB7IEFsZ2VicmFPcHRpb25zIH0gZnJvbSAnLi9BbGdlYnJhT3B0aW9ucydcblxuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWRRIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZFEnXG5pbXBvcnQgeyBXb3JkZWRPcHRpb25zIH0gZnJvbSAnLi9Xb3JkZWRPcHRpb25zJ1xuXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxudHlwZSBRdWVzdGlvblR5cGUgPSAnYW9zbCcgfCAnYWFhcCcgfCAndHJpYW5nbGUnXG50eXBlIFF1ZXN0aW9uU3ViVHlwZSA9ICdzaW1wbGUnIHwgJ3JlcGVhdGVkJyB8ICdhbGdlYnJhJyB8ICd3b3JkZWQnXG5cbnR5cGUgUXVlc3Rpb25PcHRpb25zID0gTWlzc2luZ0FuZ2xlT3B0aW9ucyAmIEFsZ2VicmFPcHRpb25zICYgV29yZGVkT3B0aW9uc1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzUSBleHRlbmRzIFF1ZXN0aW9uIHtcbiAgcXVlc3Rpb246IEdyYXBoaWNRXG5cbiAgY29uc3RydWN0b3IgKHF1ZXN0aW9uOiBHcmFwaGljUSkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLnF1ZXN0aW9uID0gcXVlc3Rpb25cbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKFxuICAgIG9wdGlvbnM6IHtcbiAgICAgIHR5cGVzOiBRdWVzdGlvblR5cGVbXSxcbiAgICAgIGRpZmZpY3VsdHk6IG51bWJlcixcbiAgICAgIGN1c3RvbTogYm9vbGVhbixcbiAgICAgIHN1YnR5cGU/OiBRdWVzdGlvblN1YlR5cGVcbiAgICB9KSA6IE1pc3NpbmdBbmdsZXNRIHtcbiAgICBpZiAob3B0aW9ucy50eXBlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVHlwZXMgbGlzdCBtdXN0IGJlIG5vbi1lbXB0eScpXG4gICAgfVxuXG4gICAgY29uc3QgdHlwZSA9IHJhbmRFbGVtKG9wdGlvbnMudHlwZXMpXG4gICAgbGV0IHN1YnR5cGUgOiBRdWVzdGlvblN1YlR5cGVcbiAgICBjb25zdCBxdWVzdGlvbk9wdGlvbnMgOiBRdWVzdGlvbk9wdGlvbnMgPSB7fVxuXG4gICAgc3dpdGNoIChvcHRpb25zLmRpZmZpY3VsdHkpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgc3VidHlwZSA9ICdzaW1wbGUnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDJcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgc3VidHlwZSA9ICdzaW1wbGUnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gM1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDRcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgc3VidHlwZSA9ICdyZXBlYXRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAzXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gNFxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA0OlxuICAgICAgICBzdWJ0eXBlID0gJ2FsZ2VicmEnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5leHByZXNzaW9uVHlwZXMgPSBbJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPSBmYWxzZVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDJcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSA0XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDU6XG4gICAgICAgIHN1YnR5cGUgPSAnYWxnZWJyYSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmV4cHJlc3Npb25UeXBlcyA9IFsnYWRkJywgJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPSBbJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmVuc3VyZVggPSB0cnVlXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNjpcbiAgICAgICAgc3VidHlwZSA9ICdhbGdlYnJhJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZXhwcmVzc2lvblR5cGVzID0gWydtaXhlZCddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNzpcbiAgICAgICAgc3VidHlwZSA9ICd3b3JkZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy50eXBlcyA9IFtyYW5kRWxlbShbJ2FkZCcsICdtdWx0aXBseSddKV1cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDJcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgODpcbiAgICAgICAgc3VidHlwZSA9ICd3b3JkZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy50eXBlcyA9IFsnYWRkJywgJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgOTpcbiAgICAgICAgc3VidHlwZSA9ICd3b3JkZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy50eXBlcyA9IFsnbXVsdGlwbHknLCAncmF0aW8nXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSAxMDpcbiAgICAgICAgc3VidHlwZSA9ICd3b3JkZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy50eXBlcyA9IFsnbXVsdGlwbHknLCAnYWRkJywgJ3JhdGlvJywgJ3BlcmNlbnQnXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4ndCBnZW5lcmF0ZSBkaWZmaWN1bHR5ICR7b3B0aW9ucy5kaWZmaWN1bHR5fWApXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmFuZG9tRnJvbVR5cGVXaXRoT3B0aW9ucyh0eXBlLCBzdWJ0eXBlLCBxdWVzdGlvbk9wdGlvbnMpXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tRnJvbVR5cGVXaXRoT3B0aW9ucyAodHlwZTogUXVlc3Rpb25UeXBlLCBzdWJ0eXBlPzogUXVlc3Rpb25TdWJUeXBlLCBxdWVzdGlvbk9wdGlvbnM/OiBRdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zPzogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNRIHtcbiAgICBsZXQgcXVlc3Rpb246IEdyYXBoaWNRXG4gICAgcXVlc3Rpb25PcHRpb25zID0gcXVlc3Rpb25PcHRpb25zIHx8IHt9XG4gICAgdmlld09wdGlvbnMgPSB2aWV3T3B0aW9ucyB8fCB7fVxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSAnYWFhcCc6XG4gICAgICBjYXNlICdhb3NsJzoge1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuYW5nbGVTdW0gPSAodHlwZSA9PT0gJ2FhYXAnKSA/IDM2MCA6IDE4MFxuICAgICAgICBzd2l0Y2ggKHN1YnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdzaW1wbGUnOlxuICAgICAgICAgIGNhc2UgJ3JlcGVhdGVkJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5yZXBlYXRlZCA9IHN1YnR5cGUgPT09ICdyZXBlYXRlZCdcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc0Fyb3VuZFEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ2FsZ2VicmEnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3dvcmRlZCc6XG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNXb3JkZWRRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bmV4cGVjdGVkIHN1YnR5cGUgJHtzdWJ0eXBlfWApXG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3RyaWFuZ2xlJzoge1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMucmVwZWF0ZWQgPSAoc3VidHlwZSA9PT0gJ3JlcGVhdGVkJylcbiAgICAgICAgc3dpdGNoIChzdWJ0eXBlKSB7XG4gICAgICAgICAgY2FzZSAnc2ltcGxlJzpcbiAgICAgICAgICBjYXNlICdyZXBlYXRlZCc6XG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ2FsZ2VicmEnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAnd29yZGVkJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgdW5leHBlY3RlZCBzdWJ0eXBlICR7c3VidHlwZX1gKVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdHlwZSAke3R5cGV9YClcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNRKHF1ZXN0aW9uKVxuICB9XG5cbiAgZ2V0RE9NICgpIDogSFRNTEVsZW1lbnQgeyByZXR1cm4gdGhpcy5xdWVzdGlvbi5nZXRET00oKSB9XG4gIHJlbmRlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLnJlbmRlcigpIH1cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLnNob3dBbnN3ZXIoKSB9XG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5oaWRlQW5zd2VyKCkgfVxuICB0b2dnbGVBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi50b2dnbGVBbnN3ZXIoKSB9XG5cbiAgc3RhdGljIGdldCBvcHRpb25zU3BlYyAoKTogT3B0aW9uc1NwZWMge1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdoZWFkaW5nJyxcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICB9LFxuXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnVHlwZXMnLFxuICAgICAgICBpZDogJ3R5cGVzJyxcbiAgICAgICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgICAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICAgICAgeyB0aXRsZTogJ09uIGEgc3RyYWlnaHQgbGluZScsIGlkOiAnYW9zbCcgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnQXJvdW5kIGEgcG9pbnQnLCBpZDogJ2FhYXAnIH0sXG4gICAgICAgICAgeyB0aXRsZTogJ1RyaWFuZ2xlJywgaWQ6ICd0cmlhbmdsZScgfVxuICAgICAgICBdLFxuICAgICAgICBkZWZhdWx0OiBbJ2Fvc2wnLCAnYWFhcCcsICd0cmlhbmdsZSddLFxuICAgICAgICB2ZXJ0aWNhbDogdHJ1ZVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2NvbHVtbi1icmVhaydcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgdGl0bGU6ICc8Yj5Vc2UgY3VzdG9tIHNldHRpbmdzIChkaXNhYmxlcyBkaWZmaWN1bHR5KTwvYj4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgaWQ6ICdjdXN0b20nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAncmFuZ2UnLFxuICAgICAgICBpZDogJ24tYW5nbGVzJyxcbiAgICAgICAgaWRMQjogJ21pbk4nLFxuICAgICAgICBpZFVCOiAnbWF4TicsXG4gICAgICAgIGRlZmF1bHRMQjogMixcbiAgICAgICAgZGVmYXVsdFVCOiA0LFxuICAgICAgICBtaW46IDIsXG4gICAgICAgIG1heDogOCxcbiAgICAgICAgdGl0bGU6ICdOdW1iZXIgb2YgYW5nbGVzJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJ1NpbXBsZScsXG4gICAgICAgIGlkOiAnc2ltcGxlJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgZGlzYWJsZWRJZjogJyFjdXN0b20nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnUmVwZWF0ZWQvSXNvc2NlbGVzJyxcbiAgICAgICAgaWQ6ICdyZXBlYXRlZCcsXG4gICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgIGRpc2FibGVkSWY6ICchY3VzdG9tJ1xuICAgICAgfVxuICAgIF1cbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJ1xuICB9XG59XG4iLCJpbXBvcnQgQWxnZWJyYWljRnJhY3Rpb25RIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0FsZ2VicmFpY0ZyYWN0aW9uUSdcbmltcG9ydCBJbnRlZ2VyQWRkUSBmcm9tICdRdWVzdGlvbi9UZXh0US9JbnRlZ2VyQWRkJ1xuaW1wb3J0IEFyaXRobWFnb25RIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0FyaXRobWFnb25RJ1xuaW1wb3J0IFRlc3RRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1Rlc3RRJ1xuaW1wb3J0IEFkZEFaZXJvIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0FkZEFaZXJvJ1xuaW1wb3J0IEVxdWF0aW9uT2ZMaW5lIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0VxdWF0aW9uT2ZMaW5lJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNRIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dyYXBwZXInXG5cbmltcG9ydCBPcHRpb25zU2V0IGZyb20gJ09wdGlvbnNTZXQnXG5cbmNvbnN0IHRvcGljTGlzdCA9IFtcbiAge1xuICAgIGlkOiAnYWxnZWJyYWljLWZyYWN0aW9uJyxcbiAgICB0aXRsZTogJ1NpbXBsaWZ5IGFsZ2VicmFpYyBmcmFjdGlvbnMnLFxuICAgIGNsYXNzOiBBbGdlYnJhaWNGcmFjdGlvblFcbiAgfSxcbiAge1xuICAgIGlkOiAnYWRkLWEtemVybycsXG4gICAgdGl0bGU6ICdNdWx0aXBseSBieSAxMCAoaG9uZXN0ISknLFxuICAgIGNsYXNzOiBBZGRBWmVyb1xuICB9LFxuICB7XG4gICAgaWQ6ICdpbnRlZ2VyLWFkZCcsXG4gICAgdGl0bGU6ICdBZGQgaW50ZWdlcnMgKHYgc2ltcGxlKScsXG4gICAgY2xhc3M6IEludGVnZXJBZGRRXG4gIH0sXG4gIHtcbiAgICBpZDogJ21pc3NpbmctYW5nbGVzJyxcbiAgICB0aXRsZTogJ01pc3NpbmcgYW5nbGVzJyxcbiAgICBjbGFzczogTWlzc2luZ0FuZ2xlc1FcbiAgfSxcbiAge1xuICAgIGlkOiAnZXF1YXRpb24tb2YtbGluZScsXG4gICAgdGl0bGU6ICdFcXVhdGlvbiBvZiBhIGxpbmUgKGZyb20gdHdvIHBvaW50cyknLFxuICAgIGNsYXNzOiBFcXVhdGlvbk9mTGluZVxuICB9LFxuICB7XG4gICAgaWQ6ICdhcml0aG1hZ29uLWFkZCcsXG4gICAgdGl0bGU6ICdBcml0aG1hZ29ucycsXG4gICAgY2xhc3M6IEFyaXRobWFnb25RXG4gIH0sXG4gIHtcbiAgICBpZDogJ3Rlc3QnLFxuICAgIHRpdGxlOiAnVGVzdCBxdWVzdGlvbnMnLFxuICAgIGNsYXNzOiBUZXN0UVxuICB9XG5dXG5cbmZ1bmN0aW9uIGdldENsYXNzIChpZCkge1xuICAvLyBSZXR1cm4gdGhlIGNsYXNzIGdpdmVuIGFuIGlkIG9mIGEgcXVlc3Rpb25cblxuICAvLyBPYnZpb3VzbHkgdGhpcyBpcyBhbiBpbmVmZmljaWVudCBzZWFyY2gsIGJ1dCB3ZSBkb24ndCBuZWVkIG1hc3NpdmUgcGVyZm9ybWFuY2VcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b3BpY0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodG9waWNMaXN0W2ldLmlkID09PSBpZCkge1xuICAgICAgcmV0dXJuIHRvcGljTGlzdFtpXS5jbGFzc1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsXG59XG5cbmZ1bmN0aW9uIGdldFRpdGxlIChpZCkge1xuICAvLyBSZXR1cm4gdGl0bGUgb2YgYSBnaXZlbiBpZFxuICAvL1xuICByZXR1cm4gdG9waWNMaXN0LmZpbmQodCA9PiAodC5pZCA9PT0gaWQpKS50aXRsZVxufVxuXG5mdW5jdGlvbiBnZXRDb21tYW5kV29yZCAoaWQpIHtcbiAgcmV0dXJuIGdldENsYXNzKGlkKS5jb21tYW5kV29yZFxufVxuXG5mdW5jdGlvbiBnZXRUb3BpY3MgKCkge1xuICAvLyByZXR1cm5zIHRvcGljcyB3aXRoIGNsYXNzZXMgc3RyaXBwZWQgb3V0XG4gIHJldHVybiB0b3BpY0xpc3QubWFwKHggPT4gKHsgaWQ6IHguaWQsIHRpdGxlOiB4LnRpdGxlIH0pKVxufVxuXG5mdW5jdGlvbiBuZXdRdWVzdGlvbiAoaWQsIG9wdGlvbnMpIHtcbiAgLy8gdG8gYXZvaWQgd3JpdGluZyBgbGV0IHEgPSBuZXcgKFRvcGljQ2hvb3Nlci5nZXRDbGFzcyhpZCkpKG9wdGlvbnMpXG4gIGNvbnN0IFF1ZXN0aW9uQ2xhc3MgPSBnZXRDbGFzcyhpZClcbiAgbGV0IHF1ZXN0aW9uXG4gIGlmIChRdWVzdGlvbkNsYXNzLnJhbmRvbSkge1xuICAgIHF1ZXN0aW9uID0gUXVlc3Rpb25DbGFzcy5yYW5kb20ob3B0aW9ucylcbiAgfSBlbHNlIHtcbiAgICBxdWVzdGlvbiA9IG5ldyBRdWVzdGlvbkNsYXNzKG9wdGlvbnMpXG4gIH1cbiAgcmV0dXJuIHF1ZXN0aW9uXG59XG5cbmZ1bmN0aW9uIG5ld09wdGlvbnNTZXQgKGlkKSB7XG4gIGNvbnN0IG9wdGlvbnNTcGVjID0gKGdldENsYXNzKGlkKSkub3B0aW9uc1NwZWMgfHwgW11cbiAgcmV0dXJuIG5ldyBPcHRpb25zU2V0KG9wdGlvbnNTcGVjKVxufVxuXG5mdW5jdGlvbiBoYXNPcHRpb25zIChpZCkge1xuICByZXR1cm4gISEoZ2V0Q2xhc3MoaWQpLm9wdGlvbnNTcGVjICYmIGdldENsYXNzKGlkKS5vcHRpb25zU3BlYy5sZW5ndGggPiAwKSAvLyB3ZWlyZCBib29sIHR5cGNhc3Rpbmcgd29vIVxufVxuXG5leHBvcnQgeyB0b3BpY0xpc3QsIGdldENsYXNzLCBuZXdRdWVzdGlvbiwgZ2V0VG9waWNzLCBnZXRUaXRsZSwgbmV3T3B0aW9uc1NldCwgZ2V0Q29tbWFuZFdvcmQsIGhhc09wdGlvbnMgfVxuIiwiLyogIVxuKiB0aW5nbGUuanNcbiogQGF1dGhvciAgcm9iaW5fcGFyaXNpXG4qIEB2ZXJzaW9uIDAuMTUuMlxuKiBAdXJsXG4qL1xuLy8gTW9kaWZpZWQgdG8gYmUgRVM2IG1vZHVsZVxuXG52YXIgaXNCdXN5ID0gZmFsc2VcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gTW9kYWwgKG9wdGlvbnMpIHtcbiAgdmFyIGRlZmF1bHRzID0ge1xuICAgIG9uQ2xvc2U6IG51bGwsXG4gICAgb25PcGVuOiBudWxsLFxuICAgIGJlZm9yZU9wZW46IG51bGwsXG4gICAgYmVmb3JlQ2xvc2U6IG51bGwsXG4gICAgc3RpY2t5Rm9vdGVyOiBmYWxzZSxcbiAgICBmb290ZXI6IGZhbHNlLFxuICAgIGNzc0NsYXNzOiBbXSxcbiAgICBjbG9zZUxhYmVsOiAnQ2xvc2UnLFxuICAgIGNsb3NlTWV0aG9kczogWydvdmVybGF5JywgJ2J1dHRvbicsICdlc2NhcGUnXVxuICB9XG5cbiAgLy8gZXh0ZW5kcyBjb25maWdcbiAgdGhpcy5vcHRzID0gZXh0ZW5kKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAvLyBpbml0IG1vZGFsXG4gIHRoaXMuaW5pdCgpXG59XG5cbk1vZGFsLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5tb2RhbCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgX2J1aWxkLmNhbGwodGhpcylcbiAgX2JpbmRFdmVudHMuY2FsbCh0aGlzKVxuXG4gIC8vIGluc2VydCBtb2RhbCBpbiBkb21cbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsLCBkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpXG5cbiAgaWYgKHRoaXMub3B0cy5mb290ZXIpIHtcbiAgICB0aGlzLmFkZEZvb3RlcigpXG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuX2J1c3kgPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgaXNCdXN5ID0gc3RhdGVcbn1cblxuTW9kYWwucHJvdG90eXBlLl9pc0J1c3kgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBpc0J1c3lcbn1cblxuTW9kYWwucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLm1vZGFsID09PSBudWxsKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICAvLyByZXN0b3JlIHNjcm9sbGluZ1xuICBpZiAodGhpcy5pc09wZW4oKSkge1xuICAgIHRoaXMuY2xvc2UodHJ1ZSlcbiAgfVxuXG4gIC8vIHVuYmluZCBhbGwgZXZlbnRzXG4gIF91bmJpbmRFdmVudHMuY2FsbCh0aGlzKVxuXG4gIC8vIHJlbW92ZSBtb2RhbCBmcm9tIGRvbVxuICB0aGlzLm1vZGFsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbClcblxuICB0aGlzLm1vZGFsID0gbnVsbFxufVxuXG5Nb2RhbC5wcm90b3R5cGUuaXNPcGVuID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gISF0aGlzLm1vZGFsLmNsYXNzTGlzdC5jb250YWlucygndGluZ2xlLW1vZGFsLS12aXNpYmxlJylcbn1cblxuTW9kYWwucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLl9pc0J1c3koKSkgcmV0dXJuXG4gIHRoaXMuX2J1c3kodHJ1ZSlcblxuICB2YXIgc2VsZiA9IHRoaXNcblxuICAvLyBiZWZvcmUgb3BlbiBjYWxsYmFja1xuICBpZiAodHlwZW9mIHNlbGYub3B0cy5iZWZvcmVPcGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgc2VsZi5vcHRzLmJlZm9yZU9wZW4oKVxuICB9XG5cbiAgaWYgKHRoaXMubW9kYWwuc3R5bGUucmVtb3ZlUHJvcGVydHkpIHtcbiAgICB0aGlzLm1vZGFsLnN0eWxlLnJlbW92ZVByb3BlcnR5KCdkaXNwbGF5JylcbiAgfSBlbHNlIHtcbiAgICB0aGlzLm1vZGFsLnN0eWxlLnJlbW92ZUF0dHJpYnV0ZSgnZGlzcGxheScpXG4gIH1cblxuICAvLyBwcmV2ZW50IGRvdWJsZSBzY3JvbGxcbiAgdGhpcy5fc2Nyb2xsUG9zaXRpb24gPSB3aW5kb3cucGFnZVlPZmZzZXRcbiAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtZW5hYmxlZCcpXG4gIGRvY3VtZW50LmJvZHkuc3R5bGUudG9wID0gLXRoaXMuX3Njcm9sbFBvc2l0aW9uICsgJ3B4J1xuXG4gIC8vIHN0aWNreSBmb290ZXJcbiAgdGhpcy5zZXRTdGlja3lGb290ZXIodGhpcy5vcHRzLnN0aWNreUZvb3RlcilcblxuICAvLyBzaG93IG1vZGFsXG4gIHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsLS12aXNpYmxlJylcblxuICAvLyBvbk9wZW4gY2FsbGJhY2tcbiAgaWYgKHR5cGVvZiBzZWxmLm9wdHMub25PcGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgc2VsZi5vcHRzLm9uT3Blbi5jYWxsKHNlbGYpXG4gIH1cblxuICBzZWxmLl9idXN5KGZhbHNlKVxuXG4gIC8vIGNoZWNrIGlmIG1vZGFsIGlzIGJpZ2dlciB0aGFuIHNjcmVlbiBoZWlnaHRcbiAgdGhpcy5jaGVja092ZXJmbG93KClcblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoZm9yY2UpIHtcbiAgaWYgKHRoaXMuX2lzQnVzeSgpKSByZXR1cm5cbiAgdGhpcy5fYnVzeSh0cnVlKVxuICBmb3JjZSA9IGZvcmNlIHx8IGZhbHNlXG5cbiAgLy8gIGJlZm9yZSBjbG9zZVxuICBpZiAodHlwZW9mIHRoaXMub3B0cy5iZWZvcmVDbG9zZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHZhciBjbG9zZSA9IHRoaXMub3B0cy5iZWZvcmVDbG9zZS5jYWxsKHRoaXMpXG4gICAgaWYgKCFjbG9zZSkge1xuICAgICAgdGhpcy5fYnVzeShmYWxzZSlcbiAgICAgIHJldHVyblxuICAgIH1cbiAgfVxuXG4gIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZSgndGluZ2xlLWVuYWJsZWQnKVxuICBkb2N1bWVudC5ib2R5LnN0eWxlLnRvcCA9IG51bGxcbiAgd2luZG93LnNjcm9sbFRvKHtcbiAgICB0b3A6IHRoaXMuX3Njcm9sbFBvc2l0aW9uLFxuICAgIGJlaGF2aW9yOiAnaW5zdGFudCdcbiAgfSlcblxuICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3RpbmdsZS1tb2RhbC0tdmlzaWJsZScpXG5cbiAgLy8gdXNpbmcgc2ltaWxhciBzZXR1cCBhcyBvbk9wZW5cbiAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgc2VsZi5tb2RhbC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG5cbiAgLy8gb25DbG9zZSBjYWxsYmFja1xuICBpZiAodHlwZW9mIHNlbGYub3B0cy5vbkNsb3NlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgc2VsZi5vcHRzLm9uQ2xvc2UuY2FsbCh0aGlzKVxuICB9XG5cbiAgLy8gcmVsZWFzZSBtb2RhbFxuICBzZWxmLl9idXN5KGZhbHNlKVxufVxuXG5Nb2RhbC5wcm90b3R5cGUuc2V0Q29udGVudCA9IGZ1bmN0aW9uIChjb250ZW50KSB7XG4gIC8vIGNoZWNrIHR5cGUgb2YgY29udGVudCA6IFN0cmluZyBvciBOb2RlXG4gIGlmICh0eXBlb2YgY29udGVudCA9PT0gJ3N0cmluZycpIHtcbiAgICB0aGlzLm1vZGFsQm94Q29udGVudC5pbm5lckhUTUwgPSBjb250ZW50XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5tb2RhbEJveENvbnRlbnQuaW5uZXJIVE1MID0gJydcbiAgICB0aGlzLm1vZGFsQm94Q29udGVudC5hcHBlbmRDaGlsZChjb250ZW50KVxuICB9XG5cbiAgaWYgKHRoaXMuaXNPcGVuKCkpIHtcbiAgICAvLyBjaGVjayBpZiBtb2RhbCBpcyBiaWdnZXIgdGhhbiBzY3JlZW4gaGVpZ2h0XG4gICAgdGhpcy5jaGVja092ZXJmbG93KClcbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5nZXRDb250ZW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5tb2RhbEJveENvbnRlbnRcbn1cblxuTW9kYWwucHJvdG90eXBlLmFkZEZvb3RlciA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gYWRkIGZvb3RlciB0byBtb2RhbFxuICBfYnVpbGRGb290ZXIuY2FsbCh0aGlzKVxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5zZXRGb290ZXJDb250ZW50ID0gZnVuY3Rpb24gKGNvbnRlbnQpIHtcbiAgLy8gc2V0IGZvb3RlciBjb250ZW50XG4gIHRoaXMubW9kYWxCb3hGb290ZXIuaW5uZXJIVE1MID0gY29udGVudFxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5nZXRGb290ZXJDb250ZW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5tb2RhbEJveEZvb3RlclxufVxuXG5Nb2RhbC5wcm90b3R5cGUuc2V0U3RpY2t5Rm9vdGVyID0gZnVuY3Rpb24gKGlzU3RpY2t5KSB7XG4gIC8vIGlmIHRoZSBtb2RhbCBpcyBzbWFsbGVyIHRoYW4gdGhlIHZpZXdwb3J0IGhlaWdodCwgd2UgZG9uJ3QgbmVlZCBzdGlja3lcbiAgaWYgKCF0aGlzLmlzT3ZlcmZsb3coKSkge1xuICAgIGlzU3RpY2t5ID0gZmFsc2VcbiAgfVxuXG4gIGlmIChpc1N0aWNreSkge1xuICAgIGlmICh0aGlzLm1vZGFsQm94LmNvbnRhaW5zKHRoaXMubW9kYWxCb3hGb290ZXIpKSB7XG4gICAgICB0aGlzLm1vZGFsQm94LnJlbW92ZUNoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpXG4gICAgICB0aGlzLm1vZGFsLmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpXG4gICAgICB0aGlzLm1vZGFsQm94Rm9vdGVyLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC1ib3hfX2Zvb3Rlci0tc3RpY2t5JylcbiAgICAgIF9yZWNhbGN1bGF0ZUZvb3RlclBvc2l0aW9uLmNhbGwodGhpcylcbiAgICAgIHRoaXMubW9kYWxCb3hDb250ZW50LnN0eWxlWydwYWRkaW5nLWJvdHRvbSddID0gdGhpcy5tb2RhbEJveEZvb3Rlci5jbGllbnRIZWlnaHQgKyAyMCArICdweCdcbiAgICB9XG4gIH0gZWxzZSBpZiAodGhpcy5tb2RhbEJveEZvb3Rlcikge1xuICAgIGlmICghdGhpcy5tb2RhbEJveC5jb250YWlucyh0aGlzLm1vZGFsQm94Rm9vdGVyKSkge1xuICAgICAgdGhpcy5tb2RhbC5yZW1vdmVDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKVxuICAgICAgdGhpcy5tb2RhbEJveC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKVxuICAgICAgdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS53aWR0aCA9ICdhdXRvJ1xuICAgICAgdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS5sZWZ0ID0gJydcbiAgICAgIHRoaXMubW9kYWxCb3hDb250ZW50LnN0eWxlWydwYWRkaW5nLWJvdHRvbSddID0gJydcbiAgICAgIHRoaXMubW9kYWxCb3hGb290ZXIuY2xhc3NMaXN0LnJlbW92ZSgndGluZ2xlLW1vZGFsLWJveF9fZm9vdGVyLS1zdGlja3knKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5hZGRGb290ZXJCdG4gPSBmdW5jdGlvbiAobGFiZWwsIGNzc0NsYXNzLCBjYWxsYmFjaykge1xuICB2YXIgYnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJylcblxuICAvLyBzZXQgbGFiZWxcbiAgYnRuLmlubmVySFRNTCA9IGxhYmVsXG5cbiAgLy8gYmluZCBjYWxsYmFja1xuICBidG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjYWxsYmFjaylcblxuICBpZiAodHlwZW9mIGNzc0NsYXNzID09PSAnc3RyaW5nJyAmJiBjc3NDbGFzcy5sZW5ndGgpIHtcbiAgICAvLyBhZGQgY2xhc3NlcyB0byBidG5cbiAgICBjc3NDbGFzcy5zcGxpdCgnICcpLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIGJ0bi5jbGFzc0xpc3QuYWRkKGl0ZW0pXG4gICAgfSlcbiAgfVxuXG4gIHRoaXMubW9kYWxCb3hGb290ZXIuYXBwZW5kQ2hpbGQoYnRuKVxuXG4gIHJldHVybiBidG5cbn1cblxuTW9kYWwucHJvdG90eXBlLnJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS53YXJuKCdSZXNpemUgaXMgZGVwcmVjYXRlZCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIHZlcnNpb24gMS4wJylcbn1cblxuTW9kYWwucHJvdG90eXBlLmlzT3ZlcmZsb3cgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciB2aWV3cG9ydEhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodFxuICB2YXIgbW9kYWxIZWlnaHQgPSB0aGlzLm1vZGFsQm94LmNsaWVudEhlaWdodFxuXG4gIHJldHVybiBtb2RhbEhlaWdodCA+PSB2aWV3cG9ydEhlaWdodFxufVxuXG5Nb2RhbC5wcm90b3R5cGUuY2hlY2tPdmVyZmxvdyA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gb25seSBpZiB0aGUgbW9kYWwgaXMgY3VycmVudGx5IHNob3duXG4gIGlmICh0aGlzLm1vZGFsLmNsYXNzTGlzdC5jb250YWlucygndGluZ2xlLW1vZGFsLS12aXNpYmxlJykpIHtcbiAgICBpZiAodGhpcy5pc092ZXJmbG93KCkpIHtcbiAgICAgIHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsLS1vdmVyZmxvdycpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgndGluZ2xlLW1vZGFsLS1vdmVyZmxvdycpXG4gICAgfVxuXG4gICAgLy8gdE9ETzogcmVtb3ZlIG9mZnNldFxuICAgIC8vIF9vZmZzZXQuY2FsbCh0aGlzKTtcbiAgICBpZiAoIXRoaXMuaXNPdmVyZmxvdygpICYmIHRoaXMub3B0cy5zdGlja3lGb290ZXIpIHtcbiAgICAgIHRoaXMuc2V0U3RpY2t5Rm9vdGVyKGZhbHNlKVxuICAgIH0gZWxzZSBpZiAodGhpcy5pc092ZXJmbG93KCkgJiYgdGhpcy5vcHRzLnN0aWNreUZvb3Rlcikge1xuICAgICAgX3JlY2FsY3VsYXRlRm9vdGVyUG9zaXRpb24uY2FsbCh0aGlzKVxuICAgICAgdGhpcy5zZXRTdGlja3lGb290ZXIodHJ1ZSlcbiAgICB9XG4gIH1cbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbi8qID09IHByaXZhdGUgbWV0aG9kcyAqL1xuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuZnVuY3Rpb24gY2xvc2VJY29uICgpIHtcbiAgcmV0dXJuICc8c3ZnIHZpZXdCb3g9XCIwIDAgMTAgMTBcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+PHBhdGggZD1cIk0uMyA5LjdjLjIuMi40LjMuNy4zLjMgMCAuNS0uMS43LS4zTDUgNi40bDMuMyAzLjNjLjIuMi41LjMuNy4zLjIgMCAuNS0uMS43LS4zLjQtLjQuNC0xIDAtMS40TDYuNCA1bDMuMy0zLjNjLjQtLjQuNC0xIDAtMS40LS40LS40LTEtLjQtMS40IDBMNSAzLjYgMS43LjNDMS4zLS4xLjctLjEuMy4zYy0uNC40LS40IDEgMCAxLjRMMy42IDUgLjMgOC4zYy0uNC40LS40IDEgMCAxLjR6XCIgZmlsbD1cIiMwMDBcIiBmaWxsLXJ1bGU9XCJub256ZXJvXCIvPjwvc3ZnPidcbn1cblxuZnVuY3Rpb24gX3JlY2FsY3VsYXRlRm9vdGVyUG9zaXRpb24gKCkge1xuICBpZiAoIXRoaXMubW9kYWxCb3hGb290ZXIpIHtcbiAgICByZXR1cm5cbiAgfVxuICB0aGlzLm1vZGFsQm94Rm9vdGVyLnN0eWxlLndpZHRoID0gdGhpcy5tb2RhbEJveC5jbGllbnRXaWR0aCArICdweCdcbiAgdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS5sZWZ0ID0gdGhpcy5tb2RhbEJveC5vZmZzZXRMZWZ0ICsgJ3B4J1xufVxuXG5mdW5jdGlvbiBfYnVpbGQgKCkge1xuICAvLyB3cmFwcGVyXG4gIHRoaXMubW9kYWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbCcpXG5cbiAgLy8gcmVtb3ZlIGN1c29yIGlmIG5vIG92ZXJsYXkgY2xvc2UgbWV0aG9kXG4gIGlmICh0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmxlbmd0aCA9PT0gMCB8fCB0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoJ292ZXJsYXknKSA9PT0gLTEpIHtcbiAgICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC0tbm9PdmVybGF5Q2xvc2UnKVxuICB9XG5cbiAgdGhpcy5tb2RhbC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG5cbiAgLy8gY3VzdG9tIGNsYXNzXG4gIHRoaXMub3B0cy5jc3NDbGFzcy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKGl0ZW0pXG4gICAgfVxuICB9LCB0aGlzKVxuXG4gIC8vIGNsb3NlIGJ0blxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdidXR0b24nKSAhPT0gLTEpIHtcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKVxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bi50eXBlID0gJ2J1dHRvbidcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4uY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsX19jbG9zZScpXG5cbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG5JY29uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuSWNvbi5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWxfX2Nsb3NlSWNvbicpXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuSWNvbi5pbm5lckhUTUwgPSBjbG9zZUljb24oKVxuXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuTGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJylcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWxfX2Nsb3NlTGFiZWwnKVxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bkxhYmVsLmlubmVySFRNTCA9IHRoaXMub3B0cy5jbG9zZUxhYmVsXG5cbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4uYXBwZW5kQ2hpbGQodGhpcy5tb2RhbENsb3NlQnRuSWNvbilcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4uYXBwZW5kQ2hpbGQodGhpcy5tb2RhbENsb3NlQnRuTGFiZWwpXG4gIH1cblxuICAvLyBtb2RhbFxuICB0aGlzLm1vZGFsQm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgdGhpcy5tb2RhbEJveC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtYm94JylcblxuICAvLyBtb2RhbCBib3ggY29udGVudFxuICB0aGlzLm1vZGFsQm94Q29udGVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIHRoaXMubW9kYWxCb3hDb250ZW50LmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC1ib3hfX2NvbnRlbnQnKVxuXG4gIHRoaXMubW9kYWxCb3guYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveENvbnRlbnQpXG5cbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignYnV0dG9uJykgIT09IC0xKSB7XG4gICAgdGhpcy5tb2RhbC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQ2xvc2VCdG4pXG4gIH1cblxuICB0aGlzLm1vZGFsLmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3gpXG59XG5cbmZ1bmN0aW9uIF9idWlsZEZvb3RlciAoKSB7XG4gIHRoaXMubW9kYWxCb3hGb290ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICB0aGlzLm1vZGFsQm94Rm9vdGVyLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC1ib3hfX2Zvb3RlcicpXG4gIHRoaXMubW9kYWxCb3guYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveEZvb3Rlcilcbn1cblxuZnVuY3Rpb24gX2JpbmRFdmVudHMgKCkge1xuICB0aGlzLl9ldmVudHMgPSB7XG4gICAgY2xpY2tDbG9zZUJ0bjogdGhpcy5jbG9zZS5iaW5kKHRoaXMpLFxuICAgIGNsaWNrT3ZlcmxheTogX2hhbmRsZUNsaWNrT3V0c2lkZS5iaW5kKHRoaXMpLFxuICAgIHJlc2l6ZTogdGhpcy5jaGVja092ZXJmbG93LmJpbmQodGhpcyksXG4gICAga2V5Ym9hcmROYXY6IF9oYW5kbGVLZXlib2FyZE5hdi5iaW5kKHRoaXMpXG4gIH1cblxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdidXR0b24nKSAhPT0gLTEpIHtcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLl9ldmVudHMuY2xpY2tDbG9zZUJ0bilcbiAgfVxuXG4gIHRoaXMubW9kYWwuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGhpcy5fZXZlbnRzLmNsaWNrT3ZlcmxheSlcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMuX2V2ZW50cy5yZXNpemUpXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLl9ldmVudHMua2V5Ym9hcmROYXYpXG59XG5cbmZ1bmN0aW9uIF9oYW5kbGVLZXlib2FyZE5hdiAoZXZlbnQpIHtcbiAgLy8gZXNjYXBlIGtleVxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdlc2NhcGUnKSAhPT0gLTEgJiYgZXZlbnQud2hpY2ggPT09IDI3ICYmIHRoaXMuaXNPcGVuKCkpIHtcbiAgICB0aGlzLmNsb3NlKClcbiAgfVxufVxuXG5mdW5jdGlvbiBfaGFuZGxlQ2xpY2tPdXRzaWRlIChldmVudCkge1xuICAvLyBvbiBtYWNPUywgY2xpY2sgb24gc2Nyb2xsYmFyIChoaWRkZW4gbW9kZSkgd2lsbCB0cmlnZ2VyIGNsb3NlIGV2ZW50IHNvIHdlIG5lZWQgdG8gYnlwYXNzIHRoaXMgYmVoYXZpb3IgYnkgZGV0ZWN0aW5nIHNjcm9sbGJhciBtb2RlXG4gIHZhciBzY3JvbGxiYXJXaWR0aCA9IHRoaXMubW9kYWwub2Zmc2V0V2lkdGggLSB0aGlzLm1vZGFsLmNsaWVudFdpZHRoXG4gIHZhciBjbGlja2VkT25TY3JvbGxiYXIgPSBldmVudC5jbGllbnRYID49IHRoaXMubW9kYWwub2Zmc2V0V2lkdGggLSAxNSAvLyAxNXB4IGlzIG1hY09TIHNjcm9sbGJhciBkZWZhdWx0IHdpZHRoXG4gIHZhciBpc1Njcm9sbGFibGUgPSB0aGlzLm1vZGFsLnNjcm9sbEhlaWdodCAhPT0gdGhpcy5tb2RhbC5vZmZzZXRIZWlnaHRcbiAgaWYgKG5hdmlnYXRvci5wbGF0Zm9ybSA9PT0gJ01hY0ludGVsJyAmJiBzY3JvbGxiYXJXaWR0aCA9PT0gMCAmJiBjbGlja2VkT25TY3JvbGxiYXIgJiYgaXNTY3JvbGxhYmxlKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICAvLyBpZiBjbGljayBpcyBvdXRzaWRlIHRoZSBtb2RhbFxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdvdmVybGF5JykgIT09IC0xICYmICFfZmluZEFuY2VzdG9yKGV2ZW50LnRhcmdldCwgJ3RpbmdsZS1tb2RhbCcpICYmXG4gICAgZXZlbnQuY2xpZW50WCA8IHRoaXMubW9kYWwuY2xpZW50V2lkdGgpIHtcbiAgICB0aGlzLmNsb3NlKClcbiAgfVxufVxuXG5mdW5jdGlvbiBfZmluZEFuY2VzdG9yIChlbCwgY2xzKSB7XG4gIHdoaWxlICgoZWwgPSBlbC5wYXJlbnRFbGVtZW50KSAmJiAhZWwuY2xhc3NMaXN0LmNvbnRhaW5zKGNscykpO1xuICByZXR1cm4gZWxcbn1cblxuZnVuY3Rpb24gX3VuYmluZEV2ZW50cyAoKSB7XG4gIGlmICh0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoJ2J1dHRvbicpICE9PSAtMSkge1xuICAgIHRoaXMubW9kYWxDbG9zZUJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuX2V2ZW50cy5jbGlja0Nsb3NlQnRuKVxuICB9XG4gIHRoaXMubW9kYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGhpcy5fZXZlbnRzLmNsaWNrT3ZlcmxheSlcbiAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMuX2V2ZW50cy5yZXNpemUpXG4gIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLl9ldmVudHMua2V5Ym9hcmROYXYpXG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiA9PSBoZWxwZXJzICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuXG5mdW5jdGlvbiBleHRlbmQgKCkge1xuICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGZvciAodmFyIGtleSBpbiBhcmd1bWVudHNbaV0pIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYXJndW1lbnRzW2ldLCBrZXkpKSB7XG4gICAgICAgIGFyZ3VtZW50c1swXVtrZXldID0gYXJndW1lbnRzW2ldW2tleV1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGFyZ3VtZW50c1swXVxufVxuIiwiaW1wb3J0IFJTbGlkZXIgZnJvbSAndmVuZG9yL3JzbGlkZXInXG5pbXBvcnQgT3B0aW9uc1NldCBmcm9tICdPcHRpb25zU2V0J1xuaW1wb3J0ICogYXMgVG9waWNDaG9vc2VyIGZyb20gJ1RvcGljQ2hvb3NlcidcbmltcG9ydCBNb2RhbCBmcm9tICd2ZW5kb3IvVGluZ2xlJ1xuaW1wb3J0IHsgcmFuZEVsZW0sIGNyZWF0ZUVsZW0sIGhhc0FuY2VzdG9yQ2xhc3MsIGJvb2xPYmplY3RUb0FycmF5IH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG53aW5kb3cuU0hPV19ESUZGSUNVTFRZID0gZmFsc2UgLy8gZm9yIGRlYnVnZ2luZyBxdWVzdGlvbnNcblxuLyogVE9ETyBsaXN0OlxuICogQWRkaXRpb25hbCBxdWVzdGlvbiBibG9jayAtIHByb2JhYmx5IGluIG1haW4uanNcbiAqIFpvb20vc2NhbGUgYnV0dG9uc1xuICogICAgTmVlZCB0byBjaGFuZ2UgY3NzIGdyaWQgc3BhY2luZyB3aXRoIEpTIG9uIGdlbmVyYXRpb25cbiAqIERpc3BsYXkgb3B0aW9uc1xuICovXG5cbi8vIE1ha2UgYW4gb3ZlcmxheSB0byBjYXB0dXJlIGFueSBjbGlja3Mgb3V0c2lkZSBib3hlcywgaWYgbmVjZXNzYXJ5XG5jcmVhdGVFbGVtKCdkaXYnLCAnb3ZlcmxheSBoaWRkZW4nLCBkb2N1bWVudC5ib2R5KS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGhpZGVBbGxBY3Rpb25zKVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBRdWVzdGlvblNldCB7XG4gIGNvbnN0cnVjdG9yIChxTnVtYmVyKSB7XG4gICAgdGhpcy5xdWVzdGlvbnMgPSBbXSAvLyBsaXN0IG9mIHF1ZXN0aW9ucyBhbmQgdGhlIERPTSBlbGVtZW50IHRoZXkncmUgcmVuZGVyZWQgaW5cbiAgICB0aGlzLnRvcGljcyA9IFtdIC8vIGxpc3Qgb2YgdG9waWNzIHdoaWNoIGhhdmUgYmVlbiBzZWxlY3RlZCBmb3IgdGhpcyBzZXRcbiAgICB0aGlzLm9wdGlvbnNTZXRzID0gW10gLy8gbGlzdCBvZiBPcHRpb25zU2V0IG9iamVjdHMgY2Fycnlpbmcgb3B0aW9ucyBmb3IgdG9waWNzIHdpdGggb3B0aW9uc1xuICAgIHRoaXMucU51bWJlciA9IHFOdW1iZXIgfHwgMSAvLyBRdWVzdGlvbiBudW1iZXIgKHBhc3NlZCBpbiBieSBjYWxsZXIsIHdoaWNoIHdpbGwga2VlcCBjb3VudClcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2UgLy8gV2hldGhlciBhbnN3ZXJlZCBvciBub3RcbiAgICB0aGlzLmNvbW1hbmRXb3JkID0gJycgLy8gU29tZXRoaW5nIGxpa2UgJ3NpbXBsaWZ5J1xuICAgIHRoaXMudXNlQ29tbWFuZFdvcmQgPSB0cnVlIC8vIFVzZSB0aGUgY29tbWFuZCB3b3JkIGluIHRoZSBtYWluIHF1ZXN0aW9uLCBmYWxzZSBnaXZlIGNvbW1hbmQgd29yZCB3aXRoIGVhY2ggc3VicXVlc3Rpb25cbiAgICB0aGlzLm4gPSA4IC8vIE51bWJlciBvZiBxdWVzdGlvbnNcblxuICAgIHRoaXMuX2J1aWxkKClcbiAgfVxuXG4gIF9idWlsZCAoKSB7XG4gICAgdGhpcy5vdXRlckJveCA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1vdXRlcmJveCcpXG4gICAgdGhpcy5oZWFkZXJCb3ggPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24taGVhZGVyYm94JywgdGhpcy5vdXRlckJveClcbiAgICB0aGlzLmRpc3BsYXlCb3ggPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tZGlzcGxheWJveCcsIHRoaXMub3V0ZXJCb3gpXG5cbiAgICB0aGlzLl9idWlsZE9wdGlvbnNCb3goKVxuXG4gICAgdGhpcy5fYnVpbGRUb3BpY0Nob29zZXIoKVxuICB9XG5cbiAgX2J1aWxkT3B0aW9uc0JveCAoKSB7XG4gICAgY29uc3QgdG9waWNTcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIG51bGwsIHRoaXMuaGVhZGVyQm94KVxuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uID0gY3JlYXRlRWxlbSgnc3BhbicsICd0b3BpYy1jaG9vc2VyIGJ1dHRvbicsIHRvcGljU3BhbilcbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbi5pbm5lckhUTUwgPSAnQ2hvb3NlIHRvcGljJ1xuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5jaG9vc2VUb3BpY3MoKSlcblxuICAgIGNvbnN0IGRpZmZpY3VsdHlTcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIG51bGwsIHRoaXMuaGVhZGVyQm94KVxuICAgIGRpZmZpY3VsdHlTcGFuLmFwcGVuZCgnRGlmZmljdWx0eTogJylcbiAgICBjb25zdCBkaWZmaWN1bHR5U2xpZGVyT3V0ZXIgPSBjcmVhdGVFbGVtKCdzcGFuJywgJ3NsaWRlci1vdXRlcicsIGRpZmZpY3VsdHlTcGFuKVxuICAgIHRoaXMuZGlmZmljdWx0eVNsaWRlckVsZW1lbnQgPSBjcmVhdGVFbGVtKCdpbnB1dCcsIG51bGwsIGRpZmZpY3VsdHlTbGlkZXJPdXRlcilcblxuICAgIGNvbnN0IG5TcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIG51bGwsIHRoaXMuaGVhZGVyQm94KVxuICAgIG5TcGFuLmFwcGVuZCgnTnVtYmVyIG9mIHF1ZXN0aW9uczogJylcbiAgICBjb25zdCBuUXVlc3Rpb25zSW5wdXQgPSBjcmVhdGVFbGVtKCdpbnB1dCcsICduLXF1ZXN0aW9ucycsIG5TcGFuKVxuICAgIG5RdWVzdGlvbnNJbnB1dC50eXBlID0gJ251bWJlcidcbiAgICBuUXVlc3Rpb25zSW5wdXQubWluID0gJzEnXG4gICAgblF1ZXN0aW9uc0lucHV0LnZhbHVlID0gJzgnXG4gICAgblF1ZXN0aW9uc0lucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHtcbiAgICAgIHRoaXMubiA9IHBhcnNlSW50KG5RdWVzdGlvbnNJbnB1dC52YWx1ZSlcbiAgICB9KVxuXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbiA9IGNyZWF0ZUVsZW0oJ2J1dHRvbicsICdnZW5lcmF0ZS1idXR0b24gYnV0dG9uJywgdGhpcy5oZWFkZXJCb3gpXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5kaXNhYmxlZCA9IHRydWVcbiAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmlubmVySFRNTCA9ICdHZW5lcmF0ZSEnXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuZ2VuZXJhdGVBbGwoKSlcbiAgfVxuXG4gIF9pbml0U2xpZGVyICgpIHtcbiAgICB0aGlzLmRpZmZpY3VsdHlTbGlkZXIgPSBuZXcgUlNsaWRlcih7XG4gICAgICB0YXJnZXQ6IHRoaXMuZGlmZmljdWx0eVNsaWRlckVsZW1lbnQsXG4gICAgICB2YWx1ZXM6IHsgbWluOiAxLCBtYXg6IDEwIH0sXG4gICAgICByYW5nZTogdHJ1ZSxcbiAgICAgIHNldDogWzIsIDZdLFxuICAgICAgc3RlcDogMSxcbiAgICAgIHRvb2x0aXA6IGZhbHNlLFxuICAgICAgc2NhbGU6IHRydWUsXG4gICAgICBsYWJlbHM6IHRydWVcbiAgICB9KVxuICB9XG5cbiAgX2J1aWxkVG9waWNDaG9vc2VyICgpIHtcbiAgICAvLyBidWlsZCBhbiBPcHRpb25zU2V0IG9iamVjdCBmb3IgdGhlIHRvcGljc1xuICAgIGNvbnN0IHRvcGljcyA9IFRvcGljQ2hvb3Nlci5nZXRUb3BpY3MoKVxuICAgIGNvbnN0IG9wdGlvbnNTcGVjID0gW11cbiAgICB0b3BpY3MuZm9yRWFjaCh0b3BpYyA9PiB7XG4gICAgICBvcHRpb25zU3BlYy5wdXNoKHtcbiAgICAgICAgdGl0bGU6IHRvcGljLnRpdGxlLFxuICAgICAgICBpZDogdG9waWMuaWQsXG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICAgIHN3YXBMYWJlbDogdHJ1ZVxuICAgICAgfSlcbiAgICB9KVxuICAgIHRoaXMudG9waWNzT3B0aW9ucyA9IG5ldyBPcHRpb25zU2V0KG9wdGlvbnNTcGVjKVxuXG4gICAgLy8gQnVpbGQgYSBtb2RhbCBkaWFsb2cgdG8gcHV0IHRoZW0gaW5cbiAgICB0aGlzLnRvcGljc01vZGFsID0gbmV3IE1vZGFsKHtcbiAgICAgIGZvb3RlcjogdHJ1ZSxcbiAgICAgIHN0aWNreUZvb3RlcjogZmFsc2UsXG4gICAgICBjbG9zZU1ldGhvZHM6IFsnb3ZlcmxheScsICdlc2NhcGUnXSxcbiAgICAgIGNsb3NlTGFiZWw6ICdDbG9zZScsXG4gICAgICBvbkNsb3NlOiAoKSA9PiB7XG4gICAgICAgIHRoaXMudXBkYXRlVG9waWNzKClcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhpcy50b3BpY3NNb2RhbC5hZGRGb290ZXJCdG4oXG4gICAgICAnT0snLFxuICAgICAgJ2J1dHRvbiBtb2RhbC1idXR0b24nLFxuICAgICAgKCkgPT4ge1xuICAgICAgICB0aGlzLnRvcGljc01vZGFsLmNsb3NlKClcbiAgICAgIH0pXG5cbiAgICAvLyByZW5kZXIgb3B0aW9ucyBpbnRvIG1vZGFsXG4gICAgdGhpcy50b3BpY3NPcHRpb25zLnJlbmRlckluKHRoaXMudG9waWNzTW9kYWwubW9kYWxCb3hDb250ZW50KVxuXG4gICAgLy8gQWRkIGZ1cnRoZXIgb3B0aW9ucyBidXR0b25zXG4gICAgLy8gVGhpcyBmZWVscyBhIGJpdCBpZmZ5IC0gZGVwZW5kcyB0b28gbXVjaCBvbiBpbXBsZW1lbnRhdGlvbiBvZiBPcHRpb25zU2V0XG4gICAgY29uc3QgbGlzID0gQXJyYXkuZnJvbSh0aGlzLnRvcGljc01vZGFsLm1vZGFsQm94Q29udGVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnbGknKSlcbiAgICBsaXMuZm9yRWFjaChsaSA9PiB7XG4gICAgICBjb25zdCB0b3BpY0lkID0gbGkuZGF0YXNldC5vcHRpb25JZFxuICAgICAgaWYgKFRvcGljQ2hvb3Nlci5oYXNPcHRpb25zKHRvcGljSWQpKSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnNCdXR0b24gPSBjcmVhdGVFbGVtKCdkaXYnLCAnaWNvbi1idXR0b24gZXh0cmEtb3B0aW9ucy1idXR0b24nLCBsaSlcbiAgICAgICAgdGhpcy5fYnVpbGRUb3BpY09wdGlvbnMobGkuZGF0YXNldC5vcHRpb25JZCwgb3B0aW9uc0J1dHRvbilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgX2J1aWxkVG9waWNPcHRpb25zICh0b3BpY0lkLCBvcHRpb25zQnV0dG9uKSB7XG4gICAgLy8gQnVpbGQgdGhlIFVJIGFuZCBPcHRpb25zU2V0IG9iamVjdCBsaW5rZWQgdG8gdG9waWNJZC4gUGFzcyBpbiBhIGJ1dHRvbiB3aGljaCBzaG91bGQgbGF1bmNoIGl0XG5cbiAgICAvLyBNYWtlIHRoZSBPcHRpb25zU2V0IG9iamVjdCBhbmQgc3RvcmUgYSByZWZlcmVuY2UgdG8gaXRcbiAgICAvLyBPbmx5IHN0b3JlIGlmIG9iamVjdCBpcyBjcmVhdGVkP1xuICAgIGNvbnN0IG9wdGlvbnNTZXQgPSBUb3BpY0Nob29zZXIubmV3T3B0aW9uc1NldCh0b3BpY0lkKVxuICAgIHRoaXMub3B0aW9uc1NldHNbdG9waWNJZF0gPSBvcHRpb25zU2V0XG5cbiAgICAvLyBNYWtlIGEgbW9kYWwgZGlhbG9nIGZvciBpdFxuICAgIGNvbnN0IG1vZGFsID0gbmV3IE1vZGFsKHtcbiAgICAgIGZvb3RlcjogdHJ1ZSxcbiAgICAgIHN0aWNreUZvb3RlcjogZmFsc2UsXG4gICAgICBjbG9zZU1ldGhvZHM6IFsnb3ZlcmxheScsICdlc2NhcGUnXSxcbiAgICAgIGNsb3NlTGFiZWw6ICdDbG9zZSdcbiAgICB9KVxuXG4gICAgbW9kYWwuYWRkRm9vdGVyQnRuKFxuICAgICAgJ09LJyxcbiAgICAgICdidXR0b24gbW9kYWwtYnV0dG9uJyxcbiAgICAgICgpID0+IHtcbiAgICAgICAgbW9kYWwuY2xvc2UoKVxuICAgICAgfSlcblxuICAgIG9wdGlvbnNTZXQucmVuZGVySW4obW9kYWwubW9kYWxCb3hDb250ZW50KVxuXG4gICAgLy8gbGluayB0aGUgbW9kYWwgdG8gdGhlIGJ1dHRvblxuICAgIG9wdGlvbnNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICBtb2RhbC5vcGVuKClcbiAgICB9KVxuICB9XG5cbiAgY2hvb3NlVG9waWNzICgpIHtcbiAgICB0aGlzLnRvcGljc01vZGFsLm9wZW4oKVxuICB9XG5cbiAgdXBkYXRlVG9waWNzICgpIHtcbiAgICAvLyB0b3BpYyBjaG9pY2VzIGFyZSBzdG9yZWQgaW4gdGhpcy50b3BpY3NPcHRpb25zIGF1dG9tYXRpY2FsbHlcbiAgICAvLyBwdWxsIHRoaXMgaW50byB0aGlzLnRvcGljcyBhbmQgdXBkYXRlIGJ1dHRvbiBkaXNwbGF5c1xuXG4gICAgLy8gaGF2ZSBvYmplY3Qgd2l0aCBib29sZWFuIHByb3BlcnRpZXMuIEp1c3Qgd2FudCB0aGUgdHJ1ZSB2YWx1ZXNcbiAgICBjb25zdCB0b3BpY3MgPSBib29sT2JqZWN0VG9BcnJheSh0aGlzLnRvcGljc09wdGlvbnMub3B0aW9ucylcbiAgICB0aGlzLnRvcGljcyA9IHRvcGljc1xuXG4gICAgbGV0IHRleHRcblxuICAgIGlmICh0b3BpY3MubGVuZ3RoID09PSAwKSB7XG4gICAgICB0ZXh0ID0gJ0Nob29zZSB0b3BpYycgLy8gbm90aGluZyBzZWxlY3RlZFxuICAgICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5kaXNhYmxlZCA9IHRydWVcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgaWQgPSB0b3BpY3NbMF0gLy8gZmlyc3QgaXRlbSBzZWxlY3RlZFxuICAgICAgdGV4dCA9IFRvcGljQ2hvb3Nlci5nZXRUaXRsZShpZClcbiAgICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uZGlzYWJsZWQgPSBmYWxzZVxuICAgIH1cblxuICAgIGlmICh0b3BpY3MubGVuZ3RoID4gMSkgeyAvLyBhbnkgYWRkaXRpb25hbCBzaG93IGFzIGUuZy4gJyArIDFcbiAgICAgIHRleHQgKz0gJyArJyArICh0b3BpY3MubGVuZ3RoIC0gMSlcbiAgICB9XG5cbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbi5pbm5lckhUTUwgPSB0ZXh0XG4gIH1cblxuICBzZXRDb21tYW5kV29yZCAoKSB7XG4gICAgLy8gZmlyc3Qgc2V0IHRvIGZpcnN0IHRvcGljIGNvbW1hbmQgd29yZFxuICAgIGxldCBjb21tYW5kV29yZCA9IFRvcGljQ2hvb3Nlci5nZXRDbGFzcyh0aGlzLnRvcGljc1swXSkuY29tbWFuZFdvcmRcbiAgICBsZXQgdXNlQ29tbWFuZFdvcmQgPSB0cnVlIC8vIHRydWUgaWYgc2hhcmVkIGNvbW1hbmQgd29yZFxuXG4gICAgLy8gY3ljbGUgdGhyb3VnaCByZXN0IG9mIHRvcGljcywgcmVzZXQgY29tbWFuZCB3b3JkIGlmIHRoZXkgZG9uJ3QgbWF0Y2hcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IHRoaXMudG9waWNzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoVG9waWNDaG9vc2VyLmdldENsYXNzKHRoaXMudG9waWNzW2ldKS5jb21tYW5kV29yZCAhPT0gY29tbWFuZFdvcmQpIHtcbiAgICAgICAgY29tbWFuZFdvcmQgPSAnJ1xuICAgICAgICB1c2VDb21tYW5kV29yZCA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jb21tYW5kV29yZCA9IGNvbW1hbmRXb3JkXG4gICAgdGhpcy51c2VDb21tYW5kV29yZCA9IHVzZUNvbW1hbmRXb3JkXG4gIH1cblxuICBnZW5lcmF0ZUFsbCAoKSB7XG4gICAgLy8gQ2xlYXIgZGlzcGxheS1ib3ggYW5kIHF1ZXN0aW9uIGxpc3RcbiAgICB0aGlzLmRpc3BsYXlCb3guaW5uZXJIVE1MID0gJydcbiAgICB0aGlzLnF1ZXN0aW9ucyA9IFtdXG4gICAgdGhpcy5zZXRDb21tYW5kV29yZCgpXG5cbiAgICAvLyBTZXQgbnVtYmVyIGFuZCBtYWluIGNvbW1hbmQgd29yZFxuICAgIGNvbnN0IG1haW5xID0gY3JlYXRlRWxlbSgncCcsICdrYXRleCBtYWlucScsIHRoaXMuZGlzcGxheUJveClcbiAgICBtYWlucS5pbm5lckhUTUwgPSBgJHt0aGlzLnFOdW1iZXJ9LiAke3RoaXMuY29tbWFuZFdvcmR9YCAvLyBUT0RPOiBnZXQgY29tbWFuZCB3b3JkIGZyb20gcXVlc3Rpb25zXG5cbiAgICAvLyBNYWtlIHNob3cgYW5zd2VycyBidXR0b25cbiAgICB0aGlzLmFuc3dlckJ1dHRvbiA9IGNyZWF0ZUVsZW0oJ3AnLCAnYnV0dG9uIHNob3ctYW5zd2VycycsIHRoaXMuZGlzcGxheUJveClcbiAgICB0aGlzLmFuc3dlckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHRoaXMudG9nZ2xlQW5zd2VycygpXG4gICAgfSlcbiAgICB0aGlzLmFuc3dlckJ1dHRvbi5pbm5lckhUTUwgPSAnU2hvdyBhbnN3ZXJzJ1xuXG4gICAgLy8gR2V0IGRpZmZpY3VsdHkgZnJvbSBzbGlkZXJcbiAgICBjb25zdCBtaW5kaWZmID0gdGhpcy5kaWZmaWN1bHR5U2xpZGVyLmdldFZhbHVlTCgpXG4gICAgY29uc3QgbWF4ZGlmZiA9IHRoaXMuZGlmZmljdWx0eVNsaWRlci5nZXRWYWx1ZVIoKVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgLy8gTWFrZSBxdWVzdGlvbiBjb250YWluZXIgRE9NIGVsZW1lbnRcbiAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1jb250YWluZXInLCB0aGlzLmRpc3BsYXlCb3gpXG4gICAgICBjb250YWluZXIuZGF0YXNldC5xdWVzdGlvbl9pbmRleCA9IGkgLy8gbm90IHN1cmUgdGhpcyBpcyBhY3R1YWxseSBuZWVkZWRcblxuICAgICAgLy8gQWRkIGNvbnRhaW5lciBsaW5rIHRvIG9iamVjdCBpbiBxdWVzdGlvbnMgbGlzdFxuICAgICAgaWYgKCF0aGlzLnF1ZXN0aW9uc1tpXSkgdGhpcy5xdWVzdGlvbnNbaV0gPSB7fVxuICAgICAgdGhpcy5xdWVzdGlvbnNbaV0uY29udGFpbmVyID0gY29udGFpbmVyXG5cbiAgICAgIC8vIGNob29zZSBhIGRpZmZpY3VsdHkgYW5kIGdlbmVyYXRlXG4gICAgICBjb25zdCBkaWZmaWN1bHR5ID0gbWluZGlmZiArIE1hdGguZmxvb3IoaSAqIChtYXhkaWZmIC0gbWluZGlmZiArIDEpIC8gdGhpcy5uKVxuXG4gICAgICAvLyBjaG9vc2UgYSB0b3BpYyBpZFxuICAgICAgdGhpcy5nZW5lcmF0ZShpLCBkaWZmaWN1bHR5KVxuICAgIH1cbiAgfVxuXG4gIGdlbmVyYXRlIChpLCBkaWZmaWN1bHR5LCB0b3BpY0lkKSB7XG4gICAgLy8gVE9ETyBnZXQgb3B0aW9ucyBwcm9wZXJseVxuICAgIHRvcGljSWQgPSB0b3BpY0lkIHx8IHJhbmRFbGVtKHRoaXMudG9waWNzKVxuXG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgIGxhYmVsOiAnJyxcbiAgICAgIGRpZmZpY3VsdHk6IGRpZmZpY3VsdHksXG4gICAgICB1c2VDb21tYW5kV29yZDogZmFsc2VcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zU2V0c1t0b3BpY0lkXSkge1xuICAgICAgT2JqZWN0LmFzc2lnbihvcHRpb25zLCB0aGlzLm9wdGlvbnNTZXRzW3RvcGljSWRdLm9wdGlvbnMpXG4gICAgfVxuXG4gICAgLy8gY2hvb3NlIGEgcXVlc3Rpb25cbiAgICBjb25zdCBxdWVzdGlvbiA9IFRvcGljQ2hvb3Nlci5uZXdRdWVzdGlvbih0b3BpY0lkLCBvcHRpb25zKVxuXG4gICAgLy8gc2V0IHNvbWUgbW9yZSBkYXRhIGluIHRoZSBxdWVzdGlvbnNbXSBsaXN0XG4gICAgaWYgKCF0aGlzLnF1ZXN0aW9uc1tpXSkgdGhyb3cgbmV3IEVycm9yKCdxdWVzdGlvbiBub3QgbWFkZScpXG4gICAgdGhpcy5xdWVzdGlvbnNbaV0ucXVlc3Rpb24gPSBxdWVzdGlvblxuICAgIHRoaXMucXVlc3Rpb25zW2ldLnRvcGljSWQgPSB0b3BpY0lkXG5cbiAgICAvLyBSZW5kZXIgaW50byB0aGUgY29udGFpbmVyXG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5xdWVzdGlvbnNbaV0uY29udGFpbmVyXG4gICAgY29udGFpbmVyLmlubmVySFRNTCA9ICcnIC8vIGNsZWFyIGluIGNhc2Ugb2YgcmVmcmVzaFxuXG4gICAgLy8gbWFrZSBhbmQgcmVuZGVyIHF1ZXN0aW9uIG51bWJlciBhbmQgY29tbWFuZCB3b3JkIChpZiBuZWVkZWQpXG4gICAgbGV0IHFOdW1iZXJUZXh0ID0gcXVlc3Rpb25MZXR0ZXIoaSkgKyAnKSdcbiAgICBpZiAod2luZG93LlNIT1dfRElGRklDVUxUWSkgeyBxTnVtYmVyVGV4dCArPSBvcHRpb25zLmRpZmZpY3VsdHkgfVxuICAgIGlmICghdGhpcy51c2VDb21tYW5kV29yZCkge1xuICAgICAgcU51bWJlclRleHQgKz0gJyAnICsgVG9waWNDaG9vc2VyLmdldENvbW1hbmRXb3JkKHRvcGljSWQpXG4gICAgICBjb250YWluZXIuY2xhc3NMaXN0LmFkZCgnaW5kaXZpZHVhbC1jb21tYW5kLXdvcmQnKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZSgnaW5kaXZpZHVhbC1jb21tYW5kLXdvcmQnKVxuICAgIH1cblxuICAgIGNvbnN0IHF1ZXN0aW9uTnVtYmVyRGl2ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLW51bWJlciBrYXRleCcsIGNvbnRhaW5lcilcbiAgICBxdWVzdGlvbk51bWJlckRpdi5pbm5lckhUTUwgPSBxTnVtYmVyVGV4dFxuXG4gICAgLy8gcmVuZGVyIHRoZSBxdWVzdGlvblxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChxdWVzdGlvbi5nZXRET00oKSkgLy8gdGhpcyBpcyBhIC5xdWVzdGlvbi1kaXYgZWxlbWVudFxuICAgIHF1ZXN0aW9uLnJlbmRlcigpIC8vIHNvbWUgcXVlc3Rpb25zIG5lZWQgcmVuZGVyaW5nIGFmdGVyIGF0dGFjaGluZyB0byBET01cblxuICAgIC8vIG1ha2UgaGlkZGVuIGFjdGlvbnMgbWVudVxuICAgIGNvbnN0IGFjdGlvbnMgPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tYWN0aW9ucyBoaWRkZW4nLCBjb250YWluZXIpXG4gICAgY29uc3QgcmVmcmVzaEljb24gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tcmVmcmVzaCBpY29uLWJ1dHRvbicsIGFjdGlvbnMpXG4gICAgY29uc3QgYW5zd2VySWNvbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1hbnN3ZXIgaWNvbi1idXR0b24nLCBhY3Rpb25zKVxuXG4gICAgYW5zd2VySWNvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHF1ZXN0aW9uLnRvZ2dsZUFuc3dlcigpXG4gICAgICBoaWRlQWxsQWN0aW9ucygpXG4gICAgfSlcblxuICAgIHJlZnJlc2hJY29uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgdGhpcy5nZW5lcmF0ZShpLCBkaWZmaWN1bHR5KVxuICAgICAgaGlkZUFsbEFjdGlvbnMoKVxuICAgIH0pXG5cbiAgICAvLyBROiBpcyB0aGlzIGJlc3Qgd2F5IC0gb3IgYW4gZXZlbnQgbGlzdGVuZXIgb24gdGhlIHdob2xlIGRpc3BsYXlCb3g/XG4gICAgY29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZSA9PiB7XG4gICAgICBpZiAoIWhhc0FuY2VzdG9yQ2xhc3MoZS50YXJnZXQsICdxdWVzdGlvbi1hY3Rpb25zJykpIHtcbiAgICAgICAgLy8gb25seSBkbyB0aGlzIGlmIGl0IGRpZG4ndCBvcmlnaW5hdGUgaW4gYWN0aW9uIGJ1dHRvblxuICAgICAgICB0aGlzLnNob3dRdWVzdGlvbkFjdGlvbnMoZSwgaSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgdG9nZ2xlQW5zd2VycyAoKSB7XG4gICAgaWYgKHRoaXMuYW5zd2VyZWQpIHtcbiAgICAgIHRoaXMucXVlc3Rpb25zLmZvckVhY2gocSA9PiB7XG4gICAgICAgIHEucXVlc3Rpb24uaGlkZUFuc3dlcigpXG4gICAgICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICAgICAgICB0aGlzLmFuc3dlckJ1dHRvbi5pbm5lckhUTUwgPSAnU2hvdyBhbnN3ZXJzJ1xuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5xdWVzdGlvbnMuZm9yRWFjaChxID0+IHtcbiAgICAgICAgcS5xdWVzdGlvbi5zaG93QW5zd2VyKClcbiAgICAgICAgdGhpcy5hbnN3ZXJlZCA9IHRydWVcbiAgICAgICAgdGhpcy5hbnN3ZXJCdXR0b24uaW5uZXJIVE1MID0gJ0hpZGUgYW5zd2VycydcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgc2hvd1F1ZXN0aW9uQWN0aW9ucyAoZXZlbnQsIHF1ZXN0aW9uSW5kZXgpIHtcbiAgICAvLyBmaXJzdCBoaWRlIGFueSBvdGhlciBhY3Rpb25zXG4gICAgaGlkZUFsbEFjdGlvbnMoKVxuXG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5xdWVzdGlvbnNbcXVlc3Rpb25JbmRleF0uY29udGFpbmVyXG4gICAgY29uc3QgYWN0aW9ucyA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcucXVlc3Rpb24tYWN0aW9ucycpXG5cbiAgICAvLyBVbmhpZGUgdGhlIG92ZXJsYXlcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcub3ZlcmxheScpLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpXG4gICAgYWN0aW9ucy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgIGFjdGlvbnMuc3R5bGUubGVmdCA9IChjb250YWluZXIub2Zmc2V0V2lkdGggLyAyIC0gYWN0aW9ucy5vZmZzZXRXaWR0aCAvIDIpICsgJ3B4J1xuICAgIGFjdGlvbnMuc3R5bGUudG9wID0gKGNvbnRhaW5lci5vZmZzZXRIZWlnaHQgLyAyIC0gYWN0aW9ucy5vZmZzZXRIZWlnaHQgLyAyKSArICdweCdcbiAgfVxuXG4gIGFwcGVuZFRvIChlbGVtKSB7XG4gICAgZWxlbS5hcHBlbmRDaGlsZCh0aGlzLm91dGVyQm94KVxuICAgIHRoaXMuX2luaXRTbGlkZXIoKSAvLyBoYXMgdG8gYmUgaW4gZG9jdW1lbnQncyBET00gdG8gd29yayBwcm9wZXJseVxuICB9XG5cbiAgYXBwZW5kQmVmb3JlIChwYXJlbnQsIGVsZW0pIHtcbiAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHRoaXMub3V0ZXJCb3gsIGVsZW0pXG4gICAgdGhpcy5faW5pdFNsaWRlcigpIC8vIGhhcyB0byBiZSBpbiBkb2N1bWVudCdzIERPTSB0byB3b3JrIHByb3Blcmx5XG4gIH1cbn1cblxuZnVuY3Rpb24gcXVlc3Rpb25MZXR0ZXIgKGkpIHtcbiAgLy8gcmV0dXJuIGEgcXVlc3Rpb24gbnVtYmVyLiBlLmcuIHFOdW1iZXIoMCk9XCJhXCIuXG4gIC8vIEFmdGVyIGxldHRlcnMsIHdlIGdldCBvbiB0byBncmVla1xuICB2YXIgbGV0dGVyID1cbiAgICAgICAgaSA8IDI2ID8gU3RyaW5nLmZyb21DaGFyQ29kZSgweDYxICsgaSlcbiAgICAgICAgICA6IGkgPCA1MiA/IFN0cmluZy5mcm9tQ2hhckNvZGUoMHg0MSArIGkgLSAyNilcbiAgICAgICAgICAgIDogU3RyaW5nLmZyb21DaGFyQ29kZSgweDNCMSArIGkgLSA1MilcbiAgcmV0dXJuIGxldHRlclxufVxuXG5mdW5jdGlvbiBoaWRlQWxsQWN0aW9ucyAoZSkge1xuICAvLyBoaWRlIGFsbCBxdWVzdGlvbiBhY3Rpb25zXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5xdWVzdGlvbi1hY3Rpb25zJykuZm9yRWFjaChlbCA9PiB7XG4gICAgZWwuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcbiAgfSlcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm92ZXJsYXknKS5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxufVxuIiwiaW1wb3J0IFF1ZXN0aW9uU2V0IGZyb20gJ1F1ZXN0aW9uU2V0J1xuXG4vLyBUT0RPOlxuLy8gIC0gUXVlc3Rpb25TZXQgLSByZWZhY3RvciBpbnRvIG1vcmUgY2xhc3Nlcz8gRS5nLiBvcHRpb25zIHdpbmRvd1xuLy8gIC0gSW1wb3J0IGV4aXN0aW5nIHF1ZXN0aW9uIHR5cGVzIChHIC0gZ3JhcGhpYywgVCAtIHRleHRcbi8vICAgIC0gRyBhbmdsZXNcbi8vICAgIC0gRyBhcmVhXG4vLyAgICAtIFQgZXF1YXRpb24gb2YgYSBsaW5lXG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG4gIGNvbnN0IHFzID0gbmV3IFF1ZXN0aW9uU2V0KClcbiAgcXMuYXBwZW5kVG8oZG9jdW1lbnQuYm9keSlcbiAgcXMuY2hvb3NlVG9waWNzKClcbn0pXG4iXSwibmFtZXMiOlsiY29tbW9uanNIZWxwZXJzLmNyZWF0ZUNvbW1vbmpzTW9kdWxlIiwiY29tbW9uanNIZWxwZXJzLmdldERlZmF1bHRFeHBvcnRGcm9tQ2pzIiwiUlNsaWRlciIsIlRvcGljQ2hvb3Nlci5nZXRUb3BpY3MiLCJUb3BpY0Nob29zZXIuaGFzT3B0aW9ucyIsIlRvcGljQ2hvb3Nlci5uZXdPcHRpb25zU2V0IiwiVG9waWNDaG9vc2VyLmdldFRpdGxlIiwiVG9waWNDaG9vc2VyLmdldENsYXNzIiwiVG9waWNDaG9vc2VyLm5ld1F1ZXN0aW9uIiwiVG9waWNDaG9vc2VyLmdldENvbW1hbmRXb3JkIl0sIm1hcHBpbmdzIjoiOzs7RUFBQTtFQUNBO0VBQ0E7QUFDQTtFQUNBLElBQUksRUFBRSxHQUFHLFVBQVUsSUFBSSxFQUFFO0VBQ3pCLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFJO0VBQ25CLEVBQUUsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFJO0VBQzFCLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFJO0VBQ3BCLEVBQUUsSUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFDO0VBQ3RCLEVBQUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFDO0VBQ3JCLEVBQUUsSUFBSSxDQUFDLFlBQVksR0FBRyxFQUFDO0VBQ3ZCLEVBQUUsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFJO0VBQ3RCLEVBQUUsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFJO0VBQ3RCLEVBQUUsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFJO0VBQzNCLEVBQUUsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFJO0VBQ3RCLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFJO0VBQ25CLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFDO0VBQ2YsRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUk7RUFDbEIsRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUk7RUFDbEIsRUFBRSxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUk7RUFDckIsRUFBRSxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQUs7QUFDdkI7RUFDQSxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUc7RUFDaEIsSUFBSSxLQUFLLEVBQUUsSUFBSTtFQUNmLElBQUksR0FBRyxFQUFFLElBQUk7RUFDYixJQUFHO0VBQ0gsRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHO0VBQ2QsSUFBSSxNQUFNLEVBQUUsSUFBSTtFQUNoQixJQUFJLE1BQU0sRUFBRSxJQUFJO0VBQ2hCLElBQUksR0FB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QixFQUFDO0FBQ0Q7RUFDQSxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBRyxVQUFVLE1BQU0sRUFBRTtFQUM3QyxFQUFFLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFDO0FBQzlEO0VBQ0EsRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDakUsSUFBSSxJQUFJLElBQUksR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFDO0VBQ3BDLElBQUksSUFBSSxHQUFHLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBQztBQUNsQztFQUNBLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUM7RUFDekIsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUM7QUFDaEM7RUFDQSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUk7QUFDNUQ7RUFDQSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtFQUMzQixNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQztFQUN4RSxLQUFLLE1BQU0sR0FBRyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUM7QUFDOUM7RUFDQSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSTtFQUM1RCxHQUFHO0VBQ0gsRUFBRSxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUU7RUFDekIsRUFBQztBQUNEO0VBQ0EsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsWUFBWTtFQUN2QyxFQUFFLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFDO0FBQzlEO0VBQ0EsRUFBRSxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBQztBQUNuRDtFQUNBLEVBQUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUksRUFBRTtBQUN2RztFQUNBLEVBQUUsT0FBTyxJQUFJLENBQUMsU0FBUyxFQUFFO0VBQ3pCLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFHLFlBQVk7RUFDckMsRUFBRSxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBQztFQUNyRSxFQUFFLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFDO0FBQ25EO0VBQ0EsRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFLHFCQUFxQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDO0VBQ3JFLEVBQUUsWUFBWSxDQUFDLFFBQVEsRUFBRSw4QkFBOEIsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQztBQUM5RTtFQUNBLEVBQUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsRUFBRTtBQUNwSTtFQUNBLEVBQUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLEVBQUU7QUFDekg7RUFDQSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUM7QUFDN0Q7RUFDQSxFQUFFLE9BQU8sSUFBSSxDQUFDLFNBQVMsRUFBRTtFQUN6QixFQUFDO0FBQ0Q7RUFDQSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsRUFBRTtFQUNqQyxFQUFFLENBQUMsQ0FBQyxjQUFjLEdBQUU7QUFDcEI7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTTtBQUNoQztFQUNBLEVBQUUsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFDO0VBQzdDLEVBQUUsSUFBSSxHQUFHLEtBQUssTUFBTSxFQUFFLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVE7RUFDeEQsRUFBRSxJQUFJLEdBQUcsS0FBSyxPQUFPLEVBQUUsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUTtBQUN6RDtFQUNBLEVBQUUsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDO0VBQzdDLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQyxFQUFFO0VBQ2pDLEVBQUUsSUFBSSxJQUFJLENBQUMsYUFBYSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDakQsSUFBSSxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLFdBQVcsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsTUFBSztFQUN4RSxJQUFJLElBQUksS0FBSyxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxFQUFDO0FBQ2xFO0VBQ0EsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBQztBQUN6QztFQUNBLElBQUksSUFBSSxLQUFLLElBQUksQ0FBQyxFQUFFLEtBQUssR0FBRyxFQUFDO0VBQzdCLElBQUksSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUM7QUFDaEY7RUFDQSxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7RUFDekIsTUFBTSxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxNQUFLO0VBQ3pFLE1BQU0sSUFBSSxJQUFJLENBQUMsYUFBYSxLQUFLLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBSztFQUN2RSxLQUFLLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBSztBQUNsQztFQUNBLElBQUksT0FBTyxJQUFJLENBQUMsU0FBUyxFQUFFO0VBQzNCLEdBQUc7RUFDSCxFQUFDO0FBQ0Q7RUFDQSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxZQUFZO0VBQ2hDLEVBQUUsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFJO0VBQzNCLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFHLFVBQVUsS0FBSyxFQUFFLEdBQUcsRUFBRTtFQUMvQyxFQUFFLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sR0FBRyxNQUFLO0FBQ3ZEO0VBQ0EsRUFBRSxJQUFJLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUMsRUFBRTtBQUNySDtFQUNBLEVBQUUsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBQyxFQUFFO0FBQ3BHO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFHLEVBQUU7QUFDckc7RUFDQSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUk7QUFDdEc7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7RUFDdkIsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO0VBQzNCLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUM7RUFDL0QsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQztFQUM3RCxLQUFLO0VBQ0wsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQztFQUNwRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFJO0VBQzdGLEdBQUcsTUFBTTtFQUNULElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFDLEVBQUU7RUFDdEYsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQztFQUN4RCxHQUFHO0FBQ0g7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsRUFBQztFQUNsRyxFQUFFLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLEVBQUM7QUFDbEQ7RUFDQSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSTtFQUN0RixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUk7QUFDakU7RUFDQSxFQUFFLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRTtFQUN4QixFQUFDO0FBQ0Q7RUFDQSxFQUFFLENBQUMsU0FBUyxDQUFDLFlBQVksR0FBRyxVQUFVLENBQUMsRUFBRTtFQUN6QyxF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QyxDQUFDLENBQUMsUUFBUSxHQUFHLEVBQUM7RUFDL0QsUUFBUSxLQUFLO0VBQ2IsTUFBTSxLQUFLLENBQUM7RUFDWixRQUFRLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLEVBQUM7RUFDL0QsUUFBUSxLQUFLO0VBQ2IsTUFBTSxLQUFLLENBQUMsQ0FBQztFQUNiLE1BQU07RUFDTixRQUFRLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsRUFBQztFQUNoRSxRQUFRLEtBQUs7RUFDYixLQUFLO0FBQ0w7RUFDQTtFQUNBLElBQUk7RUFDSixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQzdDLE1BQU0sV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUM3QixNQUFNO0VBQ04sTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsS0FBSztBQUNMO0VBQ0E7RUFDQSxJQUFJLElB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QUM7RUFDN0QsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQzdELElBQUksTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLE9BQU07QUFDM0I7RUFDQSxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDO0VBQ3hDLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUM1QjtFQUNBLElBQUksTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ2xDLElBQUksTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ2xDLElBQUksTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0FBQ2xDO0VBQ0EsSUFBSSxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDL0IsSUFBSSxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDNUMsSUFBSSxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7QUFDNUM7RUFDQSxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxHQUFHLFNBQVMsRUFBRSxJQUFJLEdBQUcsU0FBUyxDQUFDO0VBQ3hELEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUU7RUFDdEIsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFDO0VBQ3BFLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBQztFQUNwRSxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQztFQUNoQyxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFO0VBQ3RCLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDO0VBQ3JFLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDO0VBQ3JFLElBQUksT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO0VBQ2hDLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUU7RUFDekIsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFDO0VBQ3BFLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBQztFQUNwRSxJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQztFQUNyRSxJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQztFQUNyRSxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDO0VBQzFELEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxVQUFVLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQzdCO0VBQ0E7RUFDQSxJQUFJLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUM7RUFDNUIsSUFBSSxNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFDO0VBQzVCLElBQUksTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFDO0VBQ3pDLElBQUksT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLEdBQUcsTUFBTSxFQUFFO0VBQ2pELEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQzNCLElBQUksT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDL0MsR0FBRztBQUNIO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLEVBQUUsT0FBTyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQzVCLElBQUksTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFDO0VBQ3RELElBQUksT0FBTyxLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxLQUFLO0VBQ25ELEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUU7RUFDM0M7RUFDQTtFQUNBLElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFDO0VBQ2xELElBQUksSUFBSSxDQUFDLElBQUksT0FBTyxFQUFFLE9BQU8sS0FBSztBQUNsQztFQUNBLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFJLEVBQUM7RUFDaEMsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBQztFQUN6QixJ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Q0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQzFELFNBQVM7QUFDVDtFQUNBLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbkIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFO0VBQ3ZDLFVBQVUsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDeEIsU0FBUztBQUNUO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtBQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLFFBQVEsT0FBTyxJQUFJLFFBQVE7RUFDM0IsVUFBVSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUNsRCxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7RUFDdEIsU0FBUztFQUNULE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDM0IsUUFBUSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztBQUNuQjtFQUNBO0FBQ0E7RUFDQSxRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDOUUsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUMzQixRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0FBQ25CO0VBQ0E7QUFDQTtFQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRTtFQUN2QyxVQUFVLE9BQU8sSUFBSSxRQUFRLEVBQUU7RUFDL0IsU0FBUztFQUNULFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUM5RSxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxJQUFJLEVBQUUsVUFBVSxNQUFNLEVBQUU7RUFDOUIsUUFBUSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxJQUFJLENBQUMsRUFBQztBQUMxQztFQUNBLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDNUMsVUFBVSxPQUFPLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQztFQUNsQyxTQUFTO0VBQ1QsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0VBQ2pGLE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEtBQUssRUFBRSxVQUFVLE1BQU0sRUFBRTtFQUMvQixRQUFRLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxNQUFNLElBQUksQ0FBQyxFQUFDO0FBQzFDO0VBQ0EsUUFBUSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUM1QyxVQUFVLE9BQU8sSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDO0VBQ2xDLFNBQVM7RUFDVCxRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDbEYsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sS0FBSyxFQUFFLFVBQVUsTUFBTSxFQUFFO0VBQy9CLFFBQVEsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxDQUFDLEVBQUM7QUFDMUM7RUFDQSxRQUFRLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzVDLFVBQVUsT0FBTyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUM7RUFDbEMsU0FBUztFQUNULFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztFQUNsRixPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxPQUFPLEVBQUUsWUFBWTtFQUMzQixRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDcEQsT0FB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LEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBQztFQUNoRCxJQUFJLE9BQU8sSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDO0VBQ2hDLEdBQUc7QUFDSDtFQUNBLEVBQUUsUUFBUSxDQUFDLEdBQUc7RUFDZDtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUU7RUFDcEMsSUFBSSxJQUFJLFFBQVEsR0FBRyxHQUFFO0VBQ3JCLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDM0MsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVE7RUFDN0IsTUFBTSxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUMsQ0FBQyxFQUFDO0VBQzVCLE1BQU0sS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ2pELFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRO0VBQy9CLFFBQVEsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQ3JDLFVBQVUsT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQ3pDLFVBQVUsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUk7RUFDekIsU0FBUztFQUNULE9BQU87RUFDUCxNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDO0VBQzVCLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUk7RUFDckIsS0FBSztFQUNMLElBQUksUUFBUSxHQUFHLFFBQVEs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QUNyQyxZQUFZLE1BQU0sRUFBRSxLQUFLO0VBQ3pCLFlBQVc7RUFDWCxTQUFTO0VBQ1QsUUFBUSxLQUFLO0VBQ2IsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsRUFBRTtFQUNkLFFBQVEsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFDO0VBQ25FLFFBQVEsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFDO0VBQ25FLFFBQVEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDekMsVUFBVSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUNyRCxVQUFVLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFBQztFQUMzRCxVQUFVLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUc7RUFDN0IsWUFBWSxHQUFHLEVBQUUsSUFBSSxVQUFVLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQztFQUNqRCxZQUFZLE1BQU0sRUFBRSxLQUFLO0VBQ3pCLFlBQVc7RUFDWCxTQUFTO0VBQ1QsUUFBUSxLQUFLO0VBQ2IsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsRUFBRTtFQUNkLFFBQVEsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFDO0VBQzNELFFBQVEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDekMsVUFBVSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFF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LENBQUMsQ0FBQyxHQUFHO0VBQzdCLFlBQVksR0FBRyxFQUFFLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQztFQUNyQyxZQUFZLE1BQU0sRUFBRSxLQUFLO0VBQ3pCLFlBQVc7RUFDWCxTQUFTO0VBQ1QsUUFBUSxLQUFLO0VBQ2IsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsRUFBRTtFQUNkLFFBQVEsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUM7RUFDL0MsUUFBUSxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBQztFQUNsRCxRQUFRLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBQztFQUN0RCxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3pDLFVBQVUsTUFBTSxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDbEQsVUFBVSxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDeEQsVUFBVSxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDeEQsVUFBVSxJQUFJLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBRztFQUM3QyxVQUFVLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDM0IsWUFBWSxNQUFNLEVBQUUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQ3BELFlBQVksTUFBTSxHQUFHLEdBQUcsR0FBRyxHQUFHLFdBQVcsQ0FBQyxD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VCxRQUFRLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUM7RUFDdkIsUUFBUSxLQUFLO0VBQ2IsTUFBTSxLQUFLLENBQUMsQ0FBQztFQUNiLE1BQU0sU0FBUztFQUNmLFFBQVEsTUFBTSxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDcEMsUUFBUSxNQUFNLEVBQUUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3JDLFFBQVEsQ0FBQyxHQUFHLElBQUksUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUM7RUFDaEMsUUFBUSxFQUFFLEdBQUcsSUFBSSxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFDO0VBQy9DLFFBQVEsRUFBRSxHQUFHLElBQUksUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBQztFQUMvQyxRQUFRLENBQUMsR0FBRyxJQUFJLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUMzQyxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQztFQUM1QyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDN0IsUUFBUSxLQUFLO0VBQ2IsT0FBTztFQUNQLEtBQUs7QUFDTDtFQUNBLElBQUksTUFBTSxJQUFJO0VBQ2QsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTtFQUNqRCxVQUFVLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsTUFB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RyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDekMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUE7VUFFM0IsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7VUFFMUQsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFBO1VBQ2YsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1VBRTlCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Y0FDMUIsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO2NBQ3JCLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7Y0FDbEMsSUFBSSxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2tCQUN0QyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtlQUMxQzttQkFBTTtrQkFDTCxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO2VBQzNCO1dBQ0Y7VUFDRCxHQUFHLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQTtVQUN4QixHQUFHLENBQUMsTUFBTSxFQUFFLENBQUE7VUFDWixHQUFHLENBQUMsU0FBUyxFQUFFLENBQUE7VUFFZixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFBO09BQ3pCO01BRUQsSUFBSSxTQUFTO1VBQ1gsTUFBTSxTQUFTLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1VBQzFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQSxFQUFFLENBQUMsQ0FBQTtVQUNuRCxPQUFPLFNBQVMsQ0FBQTtPQUNqQjs7O0VDekdIO1FBUXFCLHlCQUEwQixTQUFRLHVCQUF1QjtNQUUxRSxZQUFhLFFBQWdCLEVBQUUsTUFBZ0IsRUFBRSxPQUFrQixFQUFFLFdBQXNCLEVBQUUsSUFBc0I7VUFDakgsS0FBSyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1VBQzdDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO09BQ2pCO01BRUQsT0FBTyxjQUFjLENBQUUsT0FBZ0I7VUFDckMsT0FBTyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUE7VUFDcEIsT0FBTyxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxHQUFHLEdBQUcsTUFBTSxHQUFHLE1BQU0sQ0FBQTs7VUFHaEYsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQThCLENBQUE7OztVQUszRSxRQUFRLENBQUMsSUFBSSxHQUFHLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQWMsQ0FBQTtVQUM5RCxRQUFRLENBQUMsT0FBTyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtVQUVyQyxJQUFJLE9BQU8sQ0FBQyxVQUFVLEtBQUssTUFBTSxFQUFFO2NBQ2pDLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQTtXQUN4QztlQUFNO2NBQ0wsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQTtXQUNsRDtVQUVELFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtVQUVyQixPQUFPLFFBQVEsQ0FBQTtPQUNoQjtNQUVELFVBQVU7VUFDUixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQTtVQUM1QixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7VUFDVCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2NBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO2tCQUNwQixJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFBO2VBQzVEO21CQUFNO2tCQUNMLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFBO2tCQUM5RCxDQUFDLEVBQUUsQ0FBQTtlQUNKO1dBQ0Y7T0FDRjs7O0VDbERMO0FBS0E7RUFDZSxNQUFNLHNCQUFzQixTQUFTLFFBQVEsQ0FBQztFQUM3RCxFQUFFLFdBQVcsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFO0VBQ3BDLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBQztFQUNsQixJQUFJLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSTtFQUNwQixJQUFJLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSTtFQUNwQixHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRTtFQUN2QyxJQUFJLE1BQU0sZUFBZSxHQUFHO0VBQzVCLE1BQU0sUUFBUSxFQUFFLEdBQUc7RUFDbkIsTUFBTSxRQUFRLEVBQUUsRUFBRTtFQUNsQixNQUFNLElBQUksRUFBRSxDQUFDO0VBQ2IsTUFBTSxJQUFJLEVBQUUsQ0FBQztFQUNiLE1BQUs7RUFDTCxJQUFJLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxlQUFlLEVBQUM7RUFDckQsSUFBSSxPQUFPLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLElBQUksTUFBSztBQUNoRDtFQUNBLElBQUksTUFBTSxJQUFJLEdBQUcseUJBQXlCLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBQztFQUMxRCxJQUFJLE1BQU0sSUFBSSxHQUFHLElBQUkseUJBQXlCLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBQztBQUNqRTtFQUNBLElBQUksT0FBTyxJQUFJLHNCQUFzQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDO0VBQzFELEdBQUc7QUFDSDtFQUNBLEVBQUUsV0FBVyxXQUFXLENBQUMsR0FBRyxFQUFFLE9BQU8sd0JBQXdCLEVBQUU7RUFDL0Q7O0VDOUJlLE1BQU0sT0FBTyxDQUFDO0VBQzdCO0VBQ0EsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQ3JCLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFDO0VBQ2QsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUM7RUFDZCxHQUFHO0FBQ0g7RUFDQSxFQUFFLFVBQVUsQ0FBQyxHQUFHO0VBQ2hCLElBQUksT0FBTyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUM7RUFDdkIsR0FBRztBQUNIO0VBQ0EsRUFBRSxRQUFRLENBQUMsR0FBRztFQUNkLElBQUksSUFBSSxNQUFNLEdBQUcsR0FBRTtBQUNuQjtFQUNBO0VBQ0EsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsTUFBTSxJQUFJLElBQUcsRUFBRSxNQUFNLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxLQUFJLEVBQUUsTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBRyxFQUFFO0FBQ3BJO0VBQ0E7RUFDQSxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxNQUFNLElBQUksTUFBSyxFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxNQUFLLEVBQUU7QUFDaEg7RUFDQTtFQUNBLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUMsRUFBQyxFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUMsRUFBQyxFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsRUFBRTtBQUN0SjtFQUNBLElBQUksT0FBTyxNQUFNO0VBQ2pCLEdBQUc7QUFDSDtFQUNBLEVBQUUsU0FBUyxDQUFDLEdBQUc7RUFDZjtFQUNBLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDNUQsU0FBUyxPQUFPLEdBQUcsR0FBRyxJ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
