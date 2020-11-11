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
              if (isRealOption(option) && option.type !== 'suboptions') {
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
                  this.options[option.id] = new OptionsSet(option.optionsSpec);
                  const subOptionsElement = this.options[option.id].renderIn(column, "suboptions");
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
                  id: 'algebraic',
                  default: true,
                  enabledIf: 'custom'
              },
              {
                  type: 'suboptions',
                  title: '',
                  id: 'algebraic-options',
                  optionsSpec: MissingAnglesAroundAlgebraQ.optionsSpec,
                  enabledIf: 'custom&algebraic'
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
                  id: 'worded-options',
                  optionsSpec: MissingAnglesWordedQ.optionsSpec,
                  enabledIf: 'custom&worded'
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vbW9kdWxlcy92ZW5kb3IvcnNsaWRlci5qcyIsIi4uL21vZHVsZXMvVXRpbGl0aWVzLmpzIiwiLi4vLi4vbW9kdWxlcy9PcHRpb25zU2V0LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9RdWVzdGlvbi50cyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGV4dFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FsZ2VicmFpY0ZyYWN0aW9uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvSW50ZWdlckFkZC5qcyIsIi4uL21vZHVsZXMvUG9pbnQuanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRLnRzIiwiLi4vbW9kdWxlcy92ZW5kb3IvZnJhY3Rpb24uanMiLCIuLi9tb2R1bGVzL01vbm9taWFsLmpzIiwiLi4vbW9kdWxlcy9Qb2x5bm9taWFsLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9Bcml0aG1hZ29uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGVzdFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FkZEFaZXJvLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9UZXh0US9FcXVhdGlvbk9mTGluZS5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEudHMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUS5qcyIsIi4uL21vZHVsZXMvTGluRXhwci5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9zb2x2ZUFuZ2xlcy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dvcmRlZFEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dyYXBwZXIudHMiLCIuLi9tb2R1bGVzL1RvcGljQ2hvb3Nlci5qcyIsIi4uL21vZHVsZXMvdmVuZG9yL1RpbmdsZS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb25TZXQuanMiLCIuLi9tYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIFJzbGlkZXIuIERvd25sb2FkZWQgZnJvbSBodHRwczovL3NsYXdvbWlyLXphemlhYmxvLmdpdGh1Yi5pby9yYW5nZS1zbGlkZXIvXG4gKiBNb2RpZmllZCB0byBtYWtlIGludG8gRVM2IG1vZHVsZSBhbmQgZml4IGEgZmV3IGJ1Z3NcbiAqL1xuXG52YXIgUlMgPSBmdW5jdGlvbiAoY29uZikge1xuICB0aGlzLmlucHV0ID0gbnVsbFxuICB0aGlzLmlucHV0RGlzcGxheSA9IG51bGxcbiAgdGhpcy5zbGlkZXIgPSBudWxsXG4gIHRoaXMuc2xpZGVyV2lkdGggPSAwXG4gIHRoaXMuc2xpZGVyTGVmdCA9IDBcbiAgdGhpcy5wb2ludGVyV2lkdGggPSAwXG4gIHRoaXMucG9pbnRlclIgPSBudWxsXG4gIHRoaXMucG9pbnRlckwgPSBudWxsXG4gIHRoaXMuYWN0aXZlUG9pbnRlciA9IG51bGxcbiAgdGhpcy5zZWxlY3RlZCA9IG51bGxcbiAgdGhpcy5zY2FsZSA9IG51bGxcbiAgdGhpcy5zdGVwID0gMFxuICB0aGlzLnRpcEwgPSBudWxsXG4gIHRoaXMudGlwUiA9IG51bGxcbiAgdGhpcy50aW1lb3V0ID0gbnVsbFxuICB0aGlzLnZhbFJhbmdlID0gZmFsc2VcblxuICB0aGlzLnZhbHVlcyA9IHtcbiAgICBzdGFydDogbnVsbCxcbiAgICBlbmQ6IG51bGxcbiAgfVxuICB0aGlzLmNvbmYgPSB7XG4gICAgdGFyZ2V0OiBudWxsLFxuICAgIHZhbHVlczogbnVsbCxcbiAgICBzZXQ6IG51bGwsXG4gICAgcmFuZ2U6IGZhbHNlLFxuICAgIHdpZHRoOiBudWxsLFxuICAgIHNjYWxlOiB0cnVlLFxuICAgIGxhYmVsczogdHJ1ZSxcbiAgICB0b29sdGlwOiB0cnVlLFxuICAgIHN0ZXA6IG51bGwsXG4gICAgZGlzYWJsZWQ6IGZhbHNlLFxuICAgIG9uQ2hhbmdlOiBudWxsXG4gIH1cblxuICB0aGlzLmNscyA9IHtcbiAgICBjb250YWluZXI6ICdycy1jb250YWluZXInLFxuICAgIGJhY2tncm91bmQ6ICdycy1iZycsXG4gICAgc2VsZWN0ZWQ6ICdycy1zZWxlY3RlZCcsXG4gICAgcG9pbnRlcjogJ3JzLXBvaW50ZXInLFxuICAgIHNjYWxlOiAncnMtc2NhbGUnLFxuICAgIG5vc2NhbGU6ICdycy1ub3NjYWxlJyxcbiAgICB0aXA6ICdycy10b29sdGlwJ1xuICB9XG5cbiAgZm9yICh2YXIgaSBpbiB0aGlzLmNvbmYpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb25mLCBpKSkgdGhpcy5jb25mW2ldID0gY29uZltpXSB9XG5cbiAgdGhpcy5pbml0KClcbn1cblxuUlMucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgdGhpcy5jb25mLnRhcmdldCA9PT0gJ29iamVjdCcpIHRoaXMuaW5wdXQgPSB0aGlzLmNvbmYudGFyZ2V0XG4gIGVsc2UgdGhpcy5pbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMuY29uZi50YXJnZXQucmVwbGFjZSgnIycsICcnKSlcblxuICBpZiAoIXRoaXMuaW5wdXQpIHJldHVybiBjb25zb2xlLmxvZygnQ2Fubm90IGZpbmQgdGFyZ2V0IGVsZW1lbnQuLi4nKVxuXG4gIHRoaXMuaW5wdXREaXNwbGF5ID0gZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLmlucHV0LCBudWxsKS5kaXNwbGF5XG4gIHRoaXMuaW5wdXQuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuICB0aGlzLnZhbFJhbmdlID0gISh0aGlzLmNvbmYudmFsdWVzIGluc3RhbmNlb2YgQXJyYXkpXG5cbiAgaWYgKHRoaXMudmFsUmFuZ2UpIHtcbiAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLmNvbmYudmFsdWVzLCAnbWluJykgfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLmNvbmYudmFsdWVzLCAnbWF4JykpIHsgcmV0dXJuIGNvbnNvbGUubG9nKCdNaXNzaW5nIG1pbiBvciBtYXggdmFsdWUuLi4nKSB9XG4gIH1cbiAgcmV0dXJuIHRoaXMuY3JlYXRlU2xpZGVyKClcbn1cblxuUlMucHJvdG90eXBlLmNyZWF0ZVNsaWRlciA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zbGlkZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy5jb250YWluZXIpXG4gIHRoaXMuc2xpZGVyLmlubmVySFRNTCA9ICc8ZGl2IGNsYXNzPVwicnMtYmdcIj48L2Rpdj4nXG4gIHRoaXMuc2VsZWN0ZWQgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy5zZWxlY3RlZClcbiAgdGhpcy5wb2ludGVyTCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnBvaW50ZXIsIFsnZGlyJywgJ2xlZnQnXSlcbiAgdGhpcy5zY2FsZSA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnNjYWxlKVxuXG4gIGlmICh0aGlzLmNvbmYudG9vbHRpcCkge1xuICAgIHRoaXMudGlwTCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnRpcClcbiAgICB0aGlzLnRpcFIgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy50aXApXG4gICAgdGhpcy5wb2ludGVyTC5hcHBlbmRDaGlsZCh0aGlzLnRpcEwpXG4gIH1cbiAgdGhpcy5zbGlkZXIuYXBwZW5kQ2hpbGQodGhpcy5zZWxlY3RlZClcbiAgdGhpcy5zbGlkZXIuYXBwZW5kQ2hpbGQodGhpcy5zY2FsZSlcbiAgdGhpcy5zbGlkZXIuYXBwZW5kQ2hpbGQodGhpcy5wb2ludGVyTClcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgdGhpcy5wb2ludGVyUiA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnBvaW50ZXIsIFsnZGlyJywgJ3JpZ2h0J10pXG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB0aGlzLnBvaW50ZXJSLmFwcGVuZENoaWxkKHRoaXMudGlwUilcbiAgICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnBvaW50ZXJSKVxuICB9XG5cbiAgdGhpcy5pbnB1dC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLnNsaWRlciwgdGhpcy5pbnB1dC5uZXh0U2libGluZylcblxuICBpZiAodGhpcy5jb25mLndpZHRoKSB0aGlzLnNsaWRlci5zdHlsZS53aWR0aCA9IHBhcnNlSW50KHRoaXMuY29uZi53aWR0aCkgKyAncHgnXG4gIHRoaXMuc2xpZGVyTGVmdCA9IHRoaXMuc2xpZGVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmxlZnRcbiAgdGhpcy5zbGlkZXJXaWR0aCA9IHRoaXMuc2xpZGVyLmNsaWVudFdpZHRoXG4gIHRoaXMucG9pbnRlcldpZHRoID0gdGhpcy5wb2ludGVyTC5jbGllbnRXaWR0aFxuXG4gIGlmICghdGhpcy5jb25mLnNjYWxlKSB0aGlzLnNsaWRlci5jbGFzc0xpc3QuYWRkKHRoaXMuY2xzLm5vc2NhbGUpXG5cbiAgcmV0dXJuIHRoaXMuc2V0SW5pdGlhbFZhbHVlcygpXG59XG5cblJTLnByb3RvdHlwZS5zZXRJbml0aWFsVmFsdWVzID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmRpc2FibGVkKHRoaXMuY29uZi5kaXNhYmxlZClcblxuICBpZiAodGhpcy52YWxSYW5nZSkgdGhpcy5jb25mLnZhbHVlcyA9IHByZXBhcmVBcnJheVZhbHVlcyh0aGlzLmNvbmYpXG5cbiAgdGhpcy52YWx1ZXMuc3RhcnQgPSAwXG4gIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi5yYW5nZSA/IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSA6IDBcblxuICBpZiAodGhpcy5jb25mLnNldCAmJiB0aGlzLmNvbmYuc2V0Lmxlbmd0aCAmJiBjaGVja0luaXRpYWwodGhpcy5jb25mKSkge1xuICAgIHZhciB2YWxzID0gdGhpcy5jb25mLnNldFxuXG4gICAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgICAgdGhpcy52YWx1ZXMuc3RhcnQgPSB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YodmFsc1swXSlcbiAgICAgIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi5zZXRbMV0gPyB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YodmFsc1sxXSkgOiBudWxsXG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzBdKVxuICB9XG4gIHJldHVybiB0aGlzLmNyZWF0ZVNjYWxlKClcbn1cblxuUlMucHJvdG90eXBlLmNyZWF0ZVNjYWxlID0gZnVuY3Rpb24gKHJlc2l6ZSkge1xuICB0aGlzLnN0ZXAgPSB0aGlzLnNsaWRlcldpZHRoIC8gKHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSlcblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7XG4gICAgdmFyIHNwYW4gPSBjcmVhdGVFbGVtZW50KCdzcGFuJylcbiAgICB2YXIgaW5zID0gY3JlYXRlRWxlbWVudCgnaW5zJylcblxuICAgIHNwYW4uYXBwZW5kQ2hpbGQoaW5zKVxuICAgIHRoaXMuc2NhbGUuYXBwZW5kQ2hpbGQoc3BhbilcblxuICAgIHNwYW4uc3R5bGUud2lkdGggPSBpID09PSBpTGVuIC0gMSA/IDAgOiB0aGlzLnN0ZXAgKyAncHgnXG5cbiAgICBpZiAoIXRoaXMuY29uZi5sYWJlbHMpIHtcbiAgICAgIGlmIChpID09PSAwIHx8IGkgPT09IGlMZW4gLSAxKSBpbnMuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1tpXVxuICAgIH0gZWxzZSBpbnMuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1tpXVxuXG4gICAgaW5zLnN0eWxlLm1hcmdpbkxlZnQgPSAoaW5zLmNsaWVudFdpZHRoIC8gMikgKiAtMSArICdweCdcbiAgfVxuICByZXR1cm4gdGhpcy5hZGRFdmVudHMoKVxufVxuXG5SUy5wcm90b3R5cGUudXBkYXRlU2NhbGUgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc3RlcCA9IHRoaXMuc2xpZGVyV2lkdGggLyAodGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKVxuXG4gIHZhciBwaWVjZXMgPSB0aGlzLnNsaWRlci5xdWVyeVNlbGVjdG9yQWxsKCdzcGFuJylcblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IHBpZWNlcy5sZW5ndGg7IGkgPCBpTGVuIC0gMTsgaSsrKSB7IHBpZWNlc1tpXS5zdHlsZS53aWR0aCA9IHRoaXMuc3RlcCArICdweCcgfVxuXG4gIHJldHVybiB0aGlzLnNldFZhbHVlcygpXG59XG5cblJTLnByb3RvdHlwZS5hZGRFdmVudHMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBwb2ludGVycyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy4nICsgdGhpcy5jbHMucG9pbnRlcilcbiAgdmFyIHBpZWNlcyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NwYW4nKVxuXG4gIGNyZWF0ZUV2ZW50cyhkb2N1bWVudCwgJ21vdXNlbW92ZSB0b3VjaG1vdmUnLCB0aGlzLm1vdmUuYmluZCh0aGlzKSlcbiAgY3JlYXRlRXZlbnRzKGRvY3VtZW50LCAnbW91c2V1cCB0b3VjaGVuZCB0b3VjaGNhbmNlbCcsIHRoaXMuZHJvcC5iaW5kKHRoaXMpKVxuXG4gIGZvciAobGV0IGkgPSAwLCBpTGVuID0gcG9pbnRlcnMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7IGNyZWF0ZUV2ZW50cyhwb2ludGVyc1tpXSwgJ21vdXNlZG93biB0b3VjaHN0YXJ0JywgdGhpcy5kcmFnLmJpbmQodGhpcykpIH1cblxuICBmb3IgKGxldCBpID0gMCwgaUxlbiA9IHBpZWNlcy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgY3JlYXRlRXZlbnRzKHBpZWNlc1tpXSwgJ2NsaWNrJywgdGhpcy5vbkNsaWNrUGllY2UuYmluZCh0aGlzKSkgfVxuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLm9uUmVzaXplLmJpbmQodGhpcykpXG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLmRyYWcgPSBmdW5jdGlvbiAoZSkge1xuICBlLnByZXZlbnREZWZhdWx0KClcblxuICBpZiAodGhpcy5jb25mLmRpc2FibGVkKSByZXR1cm5cblxuICB2YXIgZGlyID0gZS50YXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLWRpcicpXG4gIGlmIChkaXIgPT09ICdsZWZ0JykgdGhpcy5hY3RpdmVQb2ludGVyID0gdGhpcy5wb2ludGVyTFxuICBpZiAoZGlyID09PSAncmlnaHQnKSB0aGlzLmFjdGl2ZVBvaW50ZXIgPSB0aGlzLnBvaW50ZXJSXG5cbiAgcmV0dXJuIHRoaXMuc2xpZGVyLmNsYXNzTGlzdC5hZGQoJ3NsaWRpbmcnKVxufVxuXG5SUy5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uIChlKSB7XG4gIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgJiYgIXRoaXMuY29uZi5kaXNhYmxlZCkge1xuICAgIHZhciBjb29yZFggPSBlLnR5cGUgPT09ICd0b3VjaG1vdmUnID8gZS50b3VjaGVzWzBdLmNsaWVudFggOiBlLnBhZ2VYXG4gICAgdmFyIGluZGV4ID0gY29vcmRYIC0gdGhpcy5zbGlkZXJMZWZ0IC0gKHRoaXMucG9pbnRlcldpZHRoIC8gMilcblxuICAgIGluZGV4ID0gTWF0aC5yb3VuZChpbmRleCAvIHRoaXMuc3RlcClcblxuICAgIGlmIChpbmRleCA8PSAwKSBpbmRleCA9IDBcbiAgICBpZiAoaW5kZXggPiB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpIGluZGV4ID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG5cbiAgICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgICBpZiAodGhpcy5hY3RpdmVQb2ludGVyID09PSB0aGlzLnBvaW50ZXJMKSB0aGlzLnZhbHVlcy5zdGFydCA9IGluZGV4XG4gICAgICBpZiAodGhpcy5hY3RpdmVQb2ludGVyID09PSB0aGlzLnBvaW50ZXJSKSB0aGlzLnZhbHVlcy5lbmQgPSBpbmRleFxuICAgIH0gZWxzZSB0aGlzLnZhbHVlcy5lbmQgPSBpbmRleFxuXG4gICAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbiAgfVxufVxuXG5SUy5wcm90b3R5cGUuZHJvcCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5hY3RpdmVQb2ludGVyID0gbnVsbFxufVxuXG5SUy5wcm90b3R5cGUuc2V0VmFsdWVzID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGFjdGl2ZVBvaW50ZXIgPSB0aGlzLmNvbmYucmFuZ2UgPyAnc3RhcnQnIDogJ2VuZCdcblxuICBpZiAoc3RhcnQgJiYgdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHN0YXJ0KSA+IC0xKSB7IHRoaXMudmFsdWVzW2FjdGl2ZVBvaW50ZXJdID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHN0YXJ0KSB9XG5cbiAgaWYgKGVuZCAmJiB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YoZW5kKSA+IC0xKSB7IHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZihlbmQpIH1cblxuICBpZiAodGhpcy5jb25mLnJhbmdlICYmIHRoaXMudmFsdWVzLnN0YXJ0ID4gdGhpcy52YWx1ZXMuZW5kKSB7IHRoaXMudmFsdWVzLnN0YXJ0ID0gdGhpcy52YWx1ZXMuZW5kIH1cblxuICB0aGlzLnBvaW50ZXJMLnN0eWxlLmxlZnQgPSAodGhpcy52YWx1ZXNbYWN0aXZlUG9pbnRlcl0gKiB0aGlzLnN0ZXAgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKSkgKyAncHgnXG5cbiAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgIGlmICh0aGlzLmNvbmYudG9vbHRpcCkge1xuICAgICAgdGhpcy50aXBMLmlubmVySFRNTCA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdXG4gICAgICB0aGlzLnRpcFIuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG4gICAgfVxuICAgIHRoaXMuaW5wdXQudmFsdWUgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLnN0YXJ0XSArICcsJyArIHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxuICAgIHRoaXMucG9pbnRlclIuc3R5bGUubGVmdCA9ICh0aGlzLnZhbHVlcy5lbmQgKiB0aGlzLnN0ZXAgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKSkgKyAncHgnXG4gIH0gZWxzZSB7XG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7IHRoaXMudGlwTC5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF0gfVxuICAgIHRoaXMuaW5wdXQudmFsdWUgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1cbiAgfVxuXG4gIGlmICh0aGlzLnZhbHVlcy5lbmQgPiB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMVxuICBpZiAodGhpcy52YWx1ZXMuc3RhcnQgPCAwKSB0aGlzLnZhbHVlcy5zdGFydCA9IDBcblxuICB0aGlzLnNlbGVjdGVkLnN0eWxlLndpZHRoID0gKHRoaXMudmFsdWVzLmVuZCAtIHRoaXMudmFsdWVzLnN0YXJ0KSAqIHRoaXMuc3RlcCArICdweCdcbiAgdGhpcy5zZWxlY3RlZC5zdHlsZS5sZWZ0ID0gdGhpcy52YWx1ZXMuc3RhcnQgKiB0aGlzLnN0ZXAgKyAncHgnXG5cbiAgcmV0dXJuIHRoaXMub25DaGFuZ2UoKVxufVxuXG5SUy5wcm90b3R5cGUub25DbGlja1BpZWNlID0gZnVuY3Rpb24gKGUpIHtcbiAgaWYgKHRoaXMuY29uZi5kaXNhYmxlZCkgcmV0dXJuXG5cbiAgdmFyIGlkeCA9IE1hdGgucm91bmQoKGUuY2xpZW50WCAtIHRoaXMuc2xpZGVyTGVmdCkgLyB0aGlzLnN0ZXApXG5cbiAgaWYgKGlkeCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgaWR4ID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG4gIGlmIChpZHggPCAwKSBpZHggPSAwXG5cbiAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgIGlmIChpZHggLSB0aGlzLnZhbHVlcy5zdGFydCA8PSB0aGlzLnZhbHVlcy5lbmQgLSBpZHgpIHtcbiAgICAgIHRoaXMudmFsdWVzLnN0YXJ0ID0gaWR4XG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IGlkeFxuICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gaWR4XG5cbiAgdGhpcy5zbGlkZXIuY2xhc3NMaXN0LnJlbW92ZSgnc2xpZGluZycpXG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLm9uQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX3RoaXMgPSB0aGlzXG5cbiAgaWYgKHRoaXMudGltZW91dCkgY2xlYXJUaW1lb3V0KHRoaXMudGltZW91dClcblxuICB0aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoX3RoaXMuY29uZi5vbkNoYW5nZSAmJiB0eXBlb2YgX3RoaXMuY29uZi5vbkNoYW5nZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIF90aGlzLmNvbmYub25DaGFuZ2UoX3RoaXMuaW5wdXQudmFsdWUpXG4gICAgfVxuICB9LCA1MDApXG59XG5cblJTLnByb3RvdHlwZS5vblJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gdGhpcy5zbGlkZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdFxuICB0aGlzLnNsaWRlcldpZHRoID0gdGhpcy5zbGlkZXIuY2xpZW50V2lkdGhcbiAgcmV0dXJuIHRoaXMudXBkYXRlU2NhbGUoKVxufVxuXG5SUy5wcm90b3R5cGUuZGlzYWJsZWQgPSBmdW5jdGlvbiAoZGlzYWJsZWQpIHtcbiAgdGhpcy5jb25mLmRpc2FibGVkID0gZGlzYWJsZWRcbiAgdGhpcy5zbGlkZXIuY2xhc3NMaXN0W2Rpc2FibGVkID8gJ2FkZCcgOiAncmVtb3ZlJ10oJ2Rpc2FibGVkJylcbn1cblxuUlMucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAvLyBSZXR1cm4gbGlzdCBvZiBudW1iZXJzLCByYXRoZXIgdGhhbiBhIHN0cmluZywgd2hpY2ggd291bGQganVzdCBiZSBzaWxseVxuICAvLyAgcmV0dXJuIHRoaXMuaW5wdXQudmFsdWVcbiAgcmV0dXJuIFt0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLnN0YXJ0XSwgdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXVxufVxuXG5SUy5wcm90b3R5cGUuZ2V0VmFsdWVMID0gZnVuY3Rpb24gKCkge1xuICAvLyBHZXQgbGVmdCAoaS5lLiBzbWFsbGVzdCkgdmFsdWVcbiAgcmV0dXJuIHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdXG59XG5cblJTLnByb3RvdHlwZS5nZXRWYWx1ZVIgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIEdldCByaWdodCAoaS5lLiBzbWFsbGVzdCkgdmFsdWVcbiAgcmV0dXJuIHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxufVxuXG5SUy5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5pbnB1dC5zdHlsZS5kaXNwbGF5ID0gdGhpcy5pbnB1dERpc3BsYXlcbiAgdGhpcy5zbGlkZXIucmVtb3ZlKClcbn1cblxudmFyIGNyZWF0ZUVsZW1lbnQgPSBmdW5jdGlvbiAoZWwsIGNscywgZGF0YUF0dHIpIHtcbiAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGVsKVxuICBpZiAoY2xzKSBlbGVtZW50LmNsYXNzTmFtZSA9IGNsc1xuICBpZiAoZGF0YUF0dHIgJiYgZGF0YUF0dHIubGVuZ3RoID09PSAyKSB7IGVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLScgKyBkYXRhQXR0clswXSwgZGF0YUF0dHJbMV0pIH1cblxuICByZXR1cm4gZWxlbWVudFxufVxuXG52YXIgY3JlYXRlRXZlbnRzID0gZnVuY3Rpb24gKGVsLCBldiwgY2FsbGJhY2spIHtcbiAgdmFyIGV2ZW50cyA9IGV2LnNwbGl0KCcgJylcblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IGV2ZW50cy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudHNbaV0sIGNhbGxiYWNrKSB9XG59XG5cbnZhciBwcmVwYXJlQXJyYXlWYWx1ZXMgPSBmdW5jdGlvbiAoY29uZikge1xuICB2YXIgdmFsdWVzID0gW11cbiAgdmFyIHJhbmdlID0gY29uZi52YWx1ZXMubWF4IC0gY29uZi52YWx1ZXMubWluXG5cbiAgaWYgKCFjb25mLnN0ZXApIHtcbiAgICBjb25zb2xlLmxvZygnTm8gc3RlcCBkZWZpbmVkLi4uJylcbiAgICByZXR1cm4gW2NvbmYudmFsdWVzLm1pbiwgY29uZi52YWx1ZXMubWF4XVxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGlMZW4gPSAocmFuZ2UgLyBjb25mLnN0ZXApOyBpIDwgaUxlbjsgaSsrKSB7IHZhbHVlcy5wdXNoKGNvbmYudmFsdWVzLm1pbiArIGkgKiBjb25mLnN0ZXApIH1cblxuICBpZiAodmFsdWVzLmluZGV4T2YoY29uZi52YWx1ZXMubWF4KSA8IDApIHZhbHVlcy5wdXNoKGNvbmYudmFsdWVzLm1heClcblxuICByZXR1cm4gdmFsdWVzXG59XG5cbnZhciBjaGVja0luaXRpYWwgPSBmdW5jdGlvbiAoY29uZikge1xuICBpZiAoIWNvbmYuc2V0IHx8IGNvbmYuc2V0Lmxlbmd0aCA8IDEpIHJldHVybiBudWxsXG4gIGlmIChjb25mLnZhbHVlcy5pbmRleE9mKGNvbmYuc2V0WzBdKSA8IDApIHJldHVybiBudWxsXG5cbiAgaWYgKGNvbmYucmFuZ2UpIHtcbiAgICBpZiAoY29uZi5zZXQubGVuZ3RoIDwgMiB8fCBjb25mLnZhbHVlcy5pbmRleE9mKGNvbmYuc2V0WzFdKSA8IDApIHJldHVybiBudWxsXG4gIH1cbiAgcmV0dXJuIHRydWVcbn1cblxuZXhwb3J0IGRlZmF1bHQgUlNcbiIsIi8qIFJOR3MgLyBzZWxlY3RvcnMgKi9cbmV4cG9ydCBmdW5jdGlvbiBnYXVzc2lhbiAobikge1xuICBsZXQgcm51bSA9IDBcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICBybnVtICs9IE1hdGgucmFuZG9tKClcbiAgfVxuICByZXR1cm4gcm51bSAvIG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJhbmRCZXR3ZWVuIChuLCBtLCBkaXN0KSB7XG4gIC8vIHJldHVybiBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbiBhbmQgbSBpbmNsdXNpdmVcbiAgLy8gZGlzdCAob3B0aW9uYWwpIGlzIGEgZnVuY3Rpb24gcmV0dXJuaW5nIGEgdmFsdWUgaW4gWzAsMSlcbiAgLy8gZGVmYXVsdCBpcyBzbGlnaHRseSBiaWFzZWQgdG93YXJkcyBtaWRkbGVcbiAgaWYgKCFkaXN0KSBkaXN0ID0gTWF0aC5yYW5kb21cbiAgcmV0dXJuIG4gKyBNYXRoLmZsb29yKGRpc3QoKSAqIChtIC0gbiArIDEpKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZEJldHdlZW5GaWx0ZXIgKG4sIG0sIGZpbHRlcikge1xuICAvKiByZXR1cm5zIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBuIGFuZCBtIGluY2x1c2l2ZSB3aGljaCBzYXRpc2ZpZXMgdGhlIGZpbHRlclxuICAvICBuLCBtOiBpbnRlZ2VyXG4gIC8gIGZpbHRlcjogSW50LT4gQm9vbFxuICAqL1xuICBjb25zdCBhcnIgPSBbXVxuICBmb3IgKGxldCBpID0gbjsgaSA8IG0gKyAxOyBpKyspIHtcbiAgICBpZiAoZmlsdGVyKGkpKSBhcnIucHVzaChpKVxuICB9XG4gIGlmIChhcnIgPT09IFtdKSB0aHJvdyBuZXcgRXJyb3IoJ292ZXJmaWx0ZXJlZCcpXG4gIGNvbnN0IGkgPSByYW5kQmV0d2VlbigwLCBhcnIubGVuZ3RoIC0gMSlcbiAgcmV0dXJuIGFycltpXVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZE11bHRCZXR3ZWVuIChtaW4sIG1heCwgbikge1xuICAvLyByZXR1cm4gYSByYW5kb20gbXVsdGlwbGUgb2YgbiBiZXR3ZWVuIG4gYW5kIG0gKGluY2x1c2l2ZSBpZiBwb3NzaWJsZSlcbiAgbWluID0gTWF0aC5jZWlsKG1pbiAvIG4pICogblxuICBtYXggPSBNYXRoLmZsb29yKG1heCAvIG4pICogbiAvLyBjb3VsZCBjaGVjayBkaXZpc2liaWxpdHkgZmlyc3QgdG8gbWF4aW1pc2UgcGVyZm9ybWFjZSwgYnV0IEknbSBzdXJlIHRoZSBoaXQgaXNuJ3QgYmFkXG5cbiAgcmV0dXJuIHJhbmRCZXR3ZWVuKG1pbiAvIG4sIG1heCAvIG4pICogblxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZEVsZW0gKGFycmF5LCBkaXN0KSB7XG4gIGlmIChbLi4uYXJyYXldLmxlbmd0aCA9PT0gMCkgdGhyb3cgbmV3IEVycm9yKCdlbXB0eSBhcnJheScpXG4gIGlmICghZGlzdCkgZGlzdCA9IE1hdGgucmFuZG9tXG4gIGNvbnN0IG4gPSBhcnJheS5sZW5ndGggfHwgYXJyYXkuc2l6ZVxuICBjb25zdCBpID0gcmFuZEJldHdlZW4oMCwgbiAtIDEsIGRpc3QpXG4gIHJldHVybiBbLi4uYXJyYXldW2ldXG59XG5cbi8qIE1hdGhzICovXG5leHBvcnQgZnVuY3Rpb24gcm91bmRUb1RlbiAobikge1xuICByZXR1cm4gTWF0aC5yb3VuZChuIC8gMTApICogMTBcbn1cblxuLyoqXG4gKiBSb3VuZHMgYSBudW1iZXIgdG8gYSBnaXZlbiBudW1iZXIgb2YgZGVjaW1hbCBwbGFjZXNcbiAqIEBwYXJhbSB7bnVtYmVyfSB4IFRoZSBudW1iZXIgdG8gcm91bmRcbiAqIEBwYXJhbSB7bnVtYmVyfSBuIFRoZSBudW1iZXIgb2YgZGVjaW1hbCBwbGFjZXNcbiAqIEByZXR1cm5zIHtudW1iZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByb3VuZERQICh4LCBuKSB7XG4gIHJldHVybiBNYXRoLnJvdW5kKHggKiBNYXRoLnBvdygxMCwgbikpIC8gTWF0aC5wb3coMTAsIG4pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWdUb1JhZCAoeCkge1xuICByZXR1cm4geCAqIE1hdGguUEkgLyAxODBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNpbkRlZyAoeCkge1xuICByZXR1cm4gTWF0aC5zaW4oeCAqIE1hdGguUEkgLyAxODApXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb3NEZWcgKHgpIHtcbiAgcmV0dXJuIE1hdGguY29zKHggKiBNYXRoLlBJIC8gMTgwKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2NhbGVkU3RyIChuLCBkcCkge1xuICAvLyByZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGluZyBuLzEwXmRwXG4gIC8vIGUuZy4gc2NhbGVkU3RyKDM0LDEpPVwiMy40XCJcbiAgLy8gc2NhbGVkU3RyKDMxNCwyKT1cIjMuMTRcIlxuICAvLyBzY2FsZWRTdHIoMzAsMSk9XCIzXCJcbiAgLy8gVHJ5aW5nIHRvIGF2b2lkIHByZWNpc2lvbiBlcnJvcnMhXG4gIGlmIChkcCA9PT0gMCkgcmV0dXJuIG5cbiAgY29uc3QgZmFjdG9yID0gTWF0aC5wb3coMTAsIGRwKVxuICBjb25zdCBpbnRwYXJ0ID0gTWF0aC5mbG9vcihuIC8gZmFjdG9yKVxuICBjb25zdCBkZWNwYXJ0ID0gbiAlIGZhY3RvclxuICBpZiAoZGVjcGFydCA9PT0gMCkge1xuICAgIHJldHVybiBpbnRwYXJ0XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGludHBhcnQgKyAnLicgKyBkZWNwYXJ0XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdjZCAoYSwgYikge1xuICAvLyB0YWtlbiBmcm9tIGZyYWN0aW9uLmpzXG4gIGlmICghYSkgeyByZXR1cm4gYiB9XG4gIGlmICghYikgeyByZXR1cm4gYSB9XG5cbiAgd2hpbGUgKDEpIHtcbiAgICBhICU9IGJcbiAgICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICAgIGIgJT0gYVxuICAgIGlmICghYikgeyByZXR1cm4gYSB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxjbSAoYSwgYikge1xuICByZXR1cm4gYSAqIGIgLyBnY2QoYSwgYilcbn1cblxuLyogQXJyYXlzIGFuZCBzaW1pbGFyICovXG5cbi8qKlxuICogU29ydHMgdHdvIGFycmF5cyB0b2dldGhlciBiYXNlZCBvbiBzb3J0aW5nIGFycjBcbiAqIEBwYXJhbSB7KltdfSBhcnIwXG4gKiBAcGFyYW0geypbXX0gYXJyMVxuICogQHBhcmFtIHsqfSBmXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzb3J0VG9nZXRoZXIgKGFycjAsIGFycjEsIGYpIHtcbiAgaWYgKGFycjAubGVuZ3RoICE9PSBhcnIxLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JvdGggYXJndW1lbnRzIG11c3QgYmUgYXJyYXlzIG9mIHRoZSBzYW1lIGxlbmd0aCcpXG4gIH1cblxuICBmID0gZiB8fCAoKHgsIHkpID0+IHggLSB5KVxuXG4gIGNvbnN0IG4gPSBhcnIwLmxlbmd0aFxuICBjb25zdCBjb21iaW5lZCA9IFtdXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgY29tYmluZWRbaV0gPSBbYXJyMFtpXSwgYXJyMVtpXV1cbiAgfVxuXG4gIGNvbWJpbmVkLnNvcnQoKHgsIHkpID0+IGYoeFswXSwgeVswXSkpXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICBhcnIwW2ldID0gY29tYmluZWRbaV1bMF1cbiAgICBhcnIxW2ldID0gY29tYmluZWRbaV1bMV1cbiAgfVxuXG4gIHJldHVybiBbYXJyMCwgYXJyMV1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGUgKGFycmF5KSB7XG4gIC8vIEtudXRoLUZpc2hlci1ZYXRlc1xuICAvLyBmcm9tIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yNDUwOTc2LzM3MzcyOTVcbiAgLy8gbmIuIHNodWZmbGVzIGluIHBsYWNlXG4gIHZhciBjdXJyZW50SW5kZXggPSBhcnJheS5sZW5ndGg7IHZhciB0ZW1wb3JhcnlWYWx1ZTsgdmFyIHJhbmRvbUluZGV4XG5cbiAgLy8gV2hpbGUgdGhlcmUgcmVtYWluIGVsZW1lbnRzIHRvIHNodWZmbGUuLi5cbiAgd2hpbGUgKGN1cnJlbnRJbmRleCAhPT0gMCkge1xuICAgIC8vIFBpY2sgYSByZW1haW5pbmcgZWxlbWVudC4uLlxuICAgIHJhbmRvbUluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY3VycmVudEluZGV4KVxuICAgIGN1cnJlbnRJbmRleCAtPSAxXG5cbiAgICAvLyBBbmQgc3dhcCBpdCB3aXRoIHRoZSBjdXJyZW50IGVsZW1lbnQuXG4gICAgdGVtcG9yYXJ5VmFsdWUgPSBhcnJheVtjdXJyZW50SW5kZXhdXG4gICAgYXJyYXlbY3VycmVudEluZGV4XSA9IGFycmF5W3JhbmRvbUluZGV4XVxuICAgIGFycmF5W3JhbmRvbUluZGV4XSA9IHRlbXBvcmFyeVZhbHVlXG4gIH1cblxuICByZXR1cm4gYXJyYXlcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgYSBpcyBhbiBhcnJheSBjb250YWluaW5nIGUsIGZhbHNlIG90aGVyd2lzZSAoaW5jbHVkaW5nIGlmIGEgaXMgbm90IGFuIGFycmF5KVxuICogQHBhcmFtIHsqfSBhICBBbiBhcnJheVxuICogQHBhcmFtIHsqfSBlIEFuIGVsZW1lbnQgdG8gY2hlY2sgaWYgaXMgaW4gdGhlIGFycmF5XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdlYWtJbmNsdWRlcyAoYSwgZSkge1xuICByZXR1cm4gKEFycmF5LmlzQXJyYXkoYSkgJiYgYS5pbmNsdWRlcyhlKSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpcnN0VW5pcXVlSW5kZXggKGFycmF5KSB7XG4gIC8vIHJldHVybnMgaW5kZXggb2YgZmlyc3QgdW5pcXVlIGVsZW1lbnRcbiAgLy8gaWYgbm9uZSwgcmV0dXJucyBsZW5ndGggb2YgYXJyYXlcbiAgbGV0IGkgPSAwXG4gIHdoaWxlIChpIDwgYXJyYXkubGVuZ3RoKSB7XG4gICAgaWYgKGFycmF5LmluZGV4T2YoYXJyYXlbaV0pID09PSBhcnJheS5sYXN0SW5kZXhPZihhcnJheVtpXSkpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIGkrK1xuICB9XG4gIHJldHVybiBpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBib29sT2JqZWN0VG9BcnJheSAob2JqKSB7XG4gIC8vIEdpdmVuIGFuIG9iamVjdCB3aGVyZSBhbGwgdmFsdWVzIGFyZSBib29sZWFuLCByZXR1cm4ga2V5cyB3aGVyZSB0aGUgdmFsdWUgaXMgdHJ1ZVxuICBjb25zdCByZXN1bHQgPSBbXVxuICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHtcbiAgICBpZiAob2JqW2tleV0pIHJlc3VsdC5wdXNoKGtleSlcbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qIE9iamVjdCBwcm9wZXJ0eSBhY2Nlc3MgYnkgc3RyaW5nICovXG5leHBvcnQgZnVuY3Rpb24gcHJvcEJ5U3RyaW5nIChvLCBzLCB4KSB7XG4gIC8qIEUuZy4gYnlTdHJpbmcobXlPYmosXCJmb28uYmFyXCIpIC0+IG15T2JqLmZvby5iYXJcbiAgICAgKiBieVN0cmluZyhteU9iaixcImZvby5iYXJcIixcImJhelwiKSAtPiBteU9iai5mb28uYmFyID0gXCJiYXpcIlxuICAgICAqL1xuICBzID0gcy5yZXBsYWNlKC9cXFsoXFx3KylcXF0vZywgJy4kMScpIC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gIHMgPSBzLnJlcGxhY2UoL15cXC4vLCAnJykgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICB2YXIgYSA9IHMuc3BsaXQoJy4nKVxuICBmb3IgKHZhciBpID0gMCwgbiA9IGEubGVuZ3RoIC0gMTsgaSA8IG47ICsraSkge1xuICAgIHZhciBrID0gYVtpXVxuICAgIGlmIChrIGluIG8pIHtcbiAgICAgIG8gPSBvW2tdXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgfVxuICBpZiAoeCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gb1thW25dXVxuICBlbHNlIG9bYVtuXV0gPSB4XG59XG5cbi8qIExvZ2ljICovXG5leHBvcnQgZnVuY3Rpb24gbUlmIChwLCBxKSB7IC8vIG1hdGVyaWFsIGNvbmRpdGlvbmFsXG4gIHJldHVybiAoIXAgfHwgcSlcbn1cblxuLyogRE9NIG1hbmlwdWxhdGlvbiBhbmQgcXVlcnlpbmcgKi9cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IEhUTUwgZWxlbWVudCwgc2V0cyBjbGFzc2VzIGFuZCBhcHBlbmRzXG4gKiBAcGFyYW0ge3N0cmluZ30gdGFnTmFtZSBUYWcgbmFtZSBvZiBlbGVtZW50XG4gKiBAcGFyYW0ge3N0cmluZ3x1bmRlZmluZWR9IFtjbGFzc05hbWVdIEEgY2xhc3Mgb3IgY2xhc3NlcyB0byBhc3NpZ24gdG8gdGhlIGVsZW1lbnRcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IFtwYXJlbnRdIEEgcGFyZW50IGVsZW1lbnQgdG8gYXBwZW5kIHRoZSBlbGVtZW50IHRvXG4gKiBAcmV0dXJucyB7SFRNTEVsZW1lbnR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbGVtICh0YWdOYW1lLCBjbGFzc05hbWUsIHBhcmVudCkge1xuICAvLyBjcmVhdGUsIHNldCBjbGFzcyBhbmQgYXBwZW5kIGluIG9uZVxuICBjb25zdCBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKVxuICBpZiAoY2xhc3NOYW1lKSBlbGVtLmNsYXNzTmFtZSA9IGNsYXNzTmFtZVxuICBpZiAocGFyZW50KSBwYXJlbnQuYXBwZW5kQ2hpbGQoZWxlbSlcbiAgcmV0dXJuIGVsZW1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc0FuY2VzdG9yQ2xhc3MgKGVsZW0sIGNsYXNzTmFtZSkge1xuICAvLyBjaGVjayBpZiBhbiBlbGVtZW50IGVsZW0gb3IgYW55IG9mIGl0cyBhbmNlc3RvcnMgaGFzIGNsc3NcbiAgbGV0IHJlc3VsdCA9IGZhbHNlXG4gIGZvciAoO2VsZW0gJiYgZWxlbSAhPT0gZG9jdW1lbnQ7IGVsZW0gPSBlbGVtLnBhcmVudE5vZGUpIHsgLy8gdHJhdmVyc2UgRE9NIHVwd2FyZHNcbiAgICBpZiAoZWxlbS5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKSkge1xuICAgICAgcmVzdWx0ID0gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qIENhbnZhcyBkcmF3aW5nICovXG5leHBvcnQgZnVuY3Rpb24gZGFzaGVkTGluZSAoY3R4LCB4MSwgeTEsIHgyLCB5Mikge1xuICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHgyIC0geDEsIHkyIC0geTEpXG4gIGNvbnN0IGRhc2h4ID0gKHkxIC0geTIpIC8gbGVuZ3RoIC8vIHVuaXQgdmVjdG9yIHBlcnBlbmRpY3VsYXIgdG8gbGluZVxuICBjb25zdCBkYXNoeSA9ICh4MiAtIHgxKSAvIGxlbmd0aFxuICBjb25zdCBtaWR4ID0gKHgxICsgeDIpIC8gMlxuICBjb25zdCBtaWR5ID0gKHkxICsgeTIpIC8gMlxuXG4gIC8vIGRyYXcgdGhlIGJhc2UgbGluZVxuICBjdHgubW92ZVRvKHgxLCB5MSlcbiAgY3R4LmxpbmVUbyh4MiwgeTIpXG5cbiAgLy8gZHJhdyB0aGUgZGFzaFxuICBjdHgubW92ZVRvKG1pZHggKyA1ICogZGFzaHgsIG1pZHkgKyA1ICogZGFzaHkpXG4gIGN0eC5saW5lVG8obWlkeCAtIDUgKiBkYXNoeCwgbWlkeSAtIDUgKiBkYXNoeSlcblxuICBjdHgubW92ZVRvKHgyLCB5Milcbn1cbiIsImltcG9ydCB7IE9wdGlvbnNTcGVjICwgT3B0aW9uIGFzIE9wdGlvbkksIFNlbGVjdE9wdGlvbiwgU2VsZWN0RXhjbHVzaXZlT3B0aW9uLCBTZWxlY3RJbmNsdXNpdmVPcHRpb24sIFJlYWxPcHRpb24sIFJhbmdlT3B0aW9ufSBmcm9tICdPcHRpb25zU3BlYydcbmltcG9ydCB7IGNyZWF0ZUVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5cbnR5cGUgT3B0aW9ucyA9IChPcHRpb25zU3BlY1swXSAmIHtlbGVtZW50PzogSFRNTEVsZW1lbnR9KVtdIC8vIGxpa2UgT3B0aW9uc1NwZWMgYnV0IHdpdGggb3B0aW9uYWwgZWxlbWVudCBmb3IgZWFjaCBvcHRpb25cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgT3B0aW9uc1NldCB7XG4gIG9wdGlvbnNTcGVjIDogT3B0aW9uc1xuICBvcHRpb25zIDogUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IHN0cmluZ1tdIHwgT3B0aW9uc1NldD5cbiAgdGVtcGxhdGU/IDogc3RyaW5nXG4gIGdsb2JhbElkOiBzdHJpbmdcbiAgc3RhdGljIGlkQ291bnRlcjogbnVtYmVyID0gMCAvLyBpbmNyZW1lbnQgZWFjaCB0aW1lIHRvIGNyZWF0ZSB1bmlxdWUgaWRzIHRvIHVzZSBpbiBpZHMvbmFtZXMgb2YgZWxlbWVudHNcblxuICBzdGF0aWMgZ2V0SWQoKTogc3RyaW5nIHtcbiAgICBpZiAoT3B0aW9uc1NldC5pZENvdW50ZXIgPj0gMjYgKiogMikgdGhyb3cgbmV3IEVycm9yKCdUb28gbWFueSBvcHRpb25zIG9iamVjdHMhJylcbiAgICBjb25zdCBpZCA9IFN0cmluZy5mcm9tQ2hhckNvZGUofn4oT3B0aW9uc1NldC5pZENvdW50ZXIgLyAyNikgKyA5NykgK1xuICAgICAgU3RyaW5nLmZyb21DaGFyQ29kZShPcHRpb25zU2V0LmlkQ291bnRlciAlIDI2ICsgOTcpXG5cbiAgICBPcHRpb25zU2V0LmlkQ291bnRlciArPSAxXG5cbiAgICByZXR1cm4gaWRcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgb3B0aW9ucyBzcGVjXG4gICAqIEBwYXJhbSBvcHRpb25zU3BlYyBTcGVjaWZpY2F0aW9uIG9mIG9wdGlvbnNcbiAgICogQHBhcmFtIHRlbXBsYXRlIEEgdGVtcGxhdGUgZm9yIGRpc3BsYXlpbmcgb3B0aW9ucywgdXNpbmcge3ttdXN0YWNoZX19IHN5bnRheFxuICAgKi9cbiAgY29uc3RydWN0b3IgKG9wdGlvbnNTcGVjIDogT3B0aW9uc1NwZWMsIHRlbXBsYXRlPyA6IHN0cmluZykge1xuICAgIHRoaXMub3B0aW9uc1NwZWMgPSBvcHRpb25zU3BlYyBhcyBPcHRpb25zXG5cbiAgICB0aGlzLm9wdGlvbnMgPSB7fVxuICAgIHRoaXMub3B0aW9uc1NwZWMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgaWYgKGlzUmVhbE9wdGlvbihvcHRpb24pICYmIG9wdGlvbi50eXBlICE9PSAnc3Vib3B0aW9ucycpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBvcHRpb24uZGVmYXVsdFxuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGUgLy8gaHRtbCB0ZW1wbGF0ZSAob3B0aW9uYWwpXG5cbiAgICAvLyBzZXQgYW4gaWQgYmFzZWQgb24gYSBjb3VudGVyIC0gdXNlZCBmb3IgbmFtZXMgb2YgZm9ybSBlbGVtZW50c1xuICAgIHRoaXMuZ2xvYmFsSWQgPSBPcHRpb25zU2V0LmdldElkKClcbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhbiBvcHRpb24sIGZpbmQgaXRzIFVJIGVsZW1lbnQgYW5kIHVwZGF0ZSB0aGUgc3RhdGUgZnJvbSB0aGF0XG4gICAqIEBwYXJhbSB7Kn0gb3B0aW9uIEFuIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25TcGVjIG9yIGFuIGlkXG4gICAqL1xuICB1cGRhdGVTdGF0ZUZyb21VSSAob3B0aW9uIDogT3B0aW9uc1swXSB8IHN0cmluZykge1xuICAgIC8vIGlucHV0IC0gZWl0aGVyIGFuIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25zU3BlYyBvciBhbiBvcHRpb24gaWRcbiAgICBpZiAodHlwZW9mIChvcHRpb24pID09PSAnc3RyaW5nJykge1xuICAgICAgb3B0aW9uID0gdGhpcy5vcHRpb25zU3BlYy5maW5kKHggPT4gKCh4IGFzIE9wdGlvbkkpLmlkID09PSBvcHRpb24pKVxuICAgICAgaWYgKCFvcHRpb24pIHRocm93IG5ldyBFcnJvcihgbm8gb3B0aW9uIHdpdGggaWQgJyR7b3B0aW9ufSdgKVxuICAgIH1cbiAgICBpZiAoIW9wdGlvbi5lbGVtZW50KSB0aHJvdyBuZXcgRXJyb3IoYG9wdGlvbiAkeyhvcHRpb24gYXMgT3B0aW9uSSkuaWR9IGRvZXNuJ3QgaGF2ZSBhIFVJIGVsZW1lbnRgKVxuXG4gICAgc3dpdGNoIChvcHRpb24udHlwZSkge1xuICAgICAgY2FzZSAnaW50Jzoge1xuICAgICAgICBjb25zdCBpbnB1dCA6IEhUTUxJbnB1dEVsZW1lbnQgPSBvcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKVswXVxuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IE51bWJlcihpbnB1dC52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2Jvb2wnOiB7XG4gICAgICAgIGNvbnN0IGlucHV0IDogSFRNTElucHV0RWxlbWVudCA9IG9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpWzBdXG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gaW5wdXQuY2hlY2tlZFxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAnc2VsZWN0LWV4Y2x1c2l2ZSc6IHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSAob3B0aW9uLmVsZW1lbnQucXVlcnlTZWxlY3RvcignaW5wdXQ6Y2hlY2tlZCcpIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdzZWxlY3QtaW5jbHVzaXZlJzoge1xuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9XG4gICAgICAgICAgQXJyYXkuZnJvbShvcHRpb24uZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dDpjaGVja2VkJyksICh4IDogSFRNTElucHV0RWxlbWVudCkgPT4geC52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3JhbmdlJzoge1xuICAgICAgICBjb25zdCBpbnB1dExCIDogSFRNTElucHV0RWxlbWVudCA9IG9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpWzBdXG4gICAgICAgIGNvbnN0IGlucHV0VUIgOiBIVE1MSW5wdXRFbGVtZW50ID0gb3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JylbMV1cbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZExCXSA9IGlucHV0TEIudmFsdWVcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZFVCXSA9IGlucHV0VUIudmFsdWVcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBvcHRpb24gd2l0aCBpZCAkeyhvcHRpb24gYXMgT3B0aW9uSSkuaWR9IGhhcyB1bnJlY29nbmlzZWQgb3B0aW9uIHR5cGUgJHtvcHRpb24udHlwZX1gKVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0aGlzLm9wdGlvbnMpXG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBzdHJpbmcsIHJldHVybiB0aGUgZWxlbWVudCBvZiB0aGlzLm9wdGlvbnMgd2l0aCB0aGF0IGlkXG4gICAqIEBwYXJhbSBpZCBUaGUgaWRcbiAgICovXG5cbiAgdXBkYXRlU3RhdGVGcm9tVUlBbGwgKCkge1xuICAgIHRoaXMub3B0aW9uc1NwZWMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgaWYgKGlzUmVhbE9wdGlvbihvcHRpb24pKSB7IFxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXRlRnJvbVVJKG9wdGlvbilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZGlzYWJsZU9yRW5hYmxlQWxsICgpIHtcbiAgICB0aGlzLm9wdGlvbnNTcGVjLmZvckVhY2gob3B0aW9uID0+IHRoaXMuZGlzYWJsZU9yRW5hYmxlKG9wdGlvbikpXG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYW4gb3B0aW9uLCBmaW5kIGl0cyBVSSBlbGVtZW50IGFuZCB1cGRhdGUgaXQgYWNjb3JkaW5nIHRvIHRoZSBvcHRpb25zIElEXG4gICAqIEBwYXJhbSB7Kn0gb3B0aW9uIEFuIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25zU3BlYyBvciBhbiBvcHRpb24gaWRcbiAgICovXG4gIHVwZGF0ZVVJRnJvbVN0YXRlIChvcHRpb24pIHtcbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhbiBvcHRpb24sIGVuYWJsZSB0aGUgVUkgZWxlbWVudHMgaWYgYW5kIG9ubHkgaWYgYWxsIHRoZSBib29sZWFuXG4gICAqIG9wdGlvbnMgaW4gb3B0aW9uLmVuYWJsZWRJZiBhcmUgdHJ1ZVxuICAgKiBAcGFyYW0gb3B0aW9uIEFuIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25zU3BlYyBvciBhbiBvcHRpb24gaWRcbiAgICovXG4gIGRpc2FibGVPckVuYWJsZShvcHRpb24gOiBzdHJpbmcgfCBPcHRpb25zWzBdKSB7XG4gICAgaWYgKHR5cGVvZiAob3B0aW9uKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIG9wdGlvbiA9IHRoaXMub3B0aW9uc1NwZWMuZmluZCh4ID0+IChpc1JlYWxPcHRpb24oeCkgJiYgeC5pZCA9PT0gb3B0aW9uKSlcbiAgICAgIGlmICghb3B0aW9uKSB0aHJvdyBuZXcgRXJyb3IoYG5vIG9wdGlvbiB3aXRoIGlkICcke29wdGlvbn0nYClcbiAgICB9XG5cbiAgICBpZiAoIShpc1JlYWxPcHRpb24ob3B0aW9uKSAmJiBvcHRpb24uZW5hYmxlZElmKSkgcmV0dXJuXG5cbiAgICBjb25zdCBlbmFibGVyTGlzdCA9IG9wdGlvbi5lbmFibGVkSWYuc3BsaXQoXCImXCIpIC8vXG4gICAgbGV0IGVuYWJsZSA9IHRydWUgLy8gd2lsbCBkaXNhYmxlIGlmIGp1c3Qgb25lIG9mIHRoZSBlbGVtZW50cyBvZiBlbmFibGVyTGlzdCBpcyBmYWxzZVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbmFibGVyTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IGVuYWJsZXJJZCA9IGVuYWJsZXJMaXN0W2ldXG4gICAgICBsZXQgbmVnYXRlID0gZmFsc2UgLy8gaWYgaXQgc3RhcnRzIHdpdGggISwgbmVnYXRpdmUgb3V0cHV0XG4gICAgICBpZiAoZW5hYmxlcklkLnN0YXJ0c1dpdGgoJyEnKSkge1xuICAgICAgICBuZWdhdGUgPSB0cnVlIFxuICAgICAgICBlbmFibGVySWQgPSBlbmFibGVySWQuc2xpY2UoMSlcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB0aGlzLm9wdGlvbnNbZW5hYmxlcklkXSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvciAoYEludmFsaWQgJ2VuYWJsZWRJZic6ICR7ZW5hYmxlcklkfSBpcyBub3QgYSBib29sZWFuIG9wdGlvbmApXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGVuYWJsZXJWYWx1ZSA6IGJvb2xlYW4gPSB0aGlzLm9wdGlvbnNbZW5hYmxlcklkXSBhcyBib29sZWFuIC8vIT09IG5lZ2F0ZSAvLyAhPT0gZXF1aXZhbGVudCB0byBYT1JcblxuICAgICAgaWYgKCFlbmFibGVyVmFsdWUpIHtcbiAgICAgICAgZW5hYmxlID0gZmFsc2VcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZW5hYmxlKSB7XG4gICAgICBvcHRpb24uZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKCdkaXNhYmxlZCcpXG4gICAgICAgIDtbLi4ub3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JyldLmZvckVhY2goZSA9PiB7IGUuZGlzYWJsZWQgPSBmYWxzZSB9KVxuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb24uZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdkaXNhYmxlZCcpXG4gICAgICAgIDtbLi4ub3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JyldLmZvckVhY2goZSA9PiB7IGUuZGlzYWJsZWQgPSB0cnVlIH0pXG4gICAgfVxuICB9XG5cbiAgcmVuZGVySW4gKGVsZW1lbnQsIHVsRXh0cmFDbGFzcz8gOiBzdHJpbmcpIDogSFRNTEVsZW1lbnR7XG4gICAgY29uc3QgbGlzdCA9IGNyZWF0ZUVsZW0oJ3VsJywgJ29wdGlvbnMtbGlzdCcpXG4gICAgaWYgKHVsRXh0cmFDbGFzcykgbGlzdC5jbGFzc0xpc3QuYWRkKHVsRXh0cmFDbGFzcylcbiAgICBsZXQgY29sdW1uID0gY3JlYXRlRWxlbSgnZGl2JywgJ29wdGlvbnMtY29sdW1uJywgbGlzdClcblxuICAgIHRoaXMub3B0aW9uc1NwZWMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgaWYgKG9wdGlvbi50eXBlID09PSAnY29sdW1uLWJyZWFrJykgeyAvLyBzdGFydCBuZXcgY29sdW1uXG4gICAgICAgIGNvbHVtbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdvcHRpb25zLWNvbHVtbicsIGxpc3QpXG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbi50eXBlID09PSAnc3Vib3B0aW9ucycpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBuZXcgT3B0aW9uc1NldChvcHRpb24ub3B0aW9uc1NwZWMpXG4gICAgICAgIGNvbnN0IHN1Yk9wdGlvbnNFbGVtZW50ID0gKHRoaXMub3B0aW9uc1tvcHRpb24uaWRdIGFzIE9wdGlvbnNTZXQpLnJlbmRlckluKGNvbHVtbixcInN1Ym9wdGlvbnNcIilcbiAgICAgICAgb3B0aW9uLmVsZW1lbnQgPSBzdWJPcHRpb25zRWxlbWVudFxuICAgICAgfVxuICAgICAgZWxzZSB7IC8vIG1ha2UgbGlzdCBpdGVtXG4gICAgICAgIGNvbnN0IGxpID0gY3JlYXRlRWxlbSgnbGknLCB1bmRlZmluZWQsIGNvbHVtbilcbiAgICAgICAgaWYgKGlzUmVhbE9wdGlvbihvcHRpb24pKSB7XG4gICAgICAgICAgbGkuZGF0YXNldC5vcHRpb25JZCA9IG9wdGlvbi5pZFxuICAgICAgICB9XG5cbiAgICAgICAgc3dpdGNoIChvcHRpb24udHlwZSkge1xuICAgICAgICAgIGNhc2UgJ2hlYWRpbmcnOlxuICAgICAgICAgICAgcmVuZGVySGVhZGluZyhvcHRpb24udGl0bGUsIGxpKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdpbnQnOlxuICAgICAgICAgIGNhc2UgJ2Jvb2wnOlxuICAgICAgICAgICAgcmVuZGVyU2luZ2xlT3B0aW9uKG9wdGlvbiwgbGkpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3NlbGVjdC1pbmNsdXNpdmUnOlxuICAgICAgICAgIGNhc2UgJ3NlbGVjdC1leGNsdXNpdmUnOlxuICAgICAgICAgICAgdGhpcy5yZW5kZXJMaXN0T3B0aW9uKG9wdGlvbiwgbGkpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3JhbmdlJzpcbiAgICAgICAgICAgIHJlbmRlclJhbmdlT3B0aW9uKG9wdGlvbiwgbGkpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICAgIGxpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGUgPT4geyB0aGlzLnVwZGF0ZVN0YXRlRnJvbVVJKG9wdGlvbik7IHRoaXMuZGlzYWJsZU9yRW5hYmxlQWxsKCkgfSlcbiAgICAgICAgb3B0aW9uLmVsZW1lbnQgPSBsaVxuXG4gICAgICB9XG4gICAgfSlcbiAgICBlbGVtZW50LmFwcGVuZChsaXN0KVxuXG4gICAgdGhpcy5kaXNhYmxlT3JFbmFibGVBbGwoKVxuXG4gICAgcmV0dXJuIGxpc3RcbiAgfVxuXG4gIHJlbmRlcldpdGhUZW1wbGF0ZShlbGVtZW50IDogSFRNTEVsZW1lbnQpIHtcbiAgICAvLyBjcmVhdGUgYXBwcm9wcmlhdGUgb2JqZWN0IGZvciBtdXN0YWNoZVxuICAgIGxldCBvcHRpb25zOiBSZWNvcmQ8c3RyaW5nLE9wdGlvbkk+XG4gICAgdGhpcy5vcHRpb25zU3BlYy5mb3JFYWNoKCBvcHRpb24gPT4ge1xuICAgICAgaWYgKGlzUmVhbE9wdGlvbihvcHRpb24pKSB7XG4gICAgICAgIG9wdGlvbnNbb3B0aW9uLmlkXSA9IG9wdGlvblxuICAgICAgfVxuICAgIH0pXG5cbiAgICBsZXQgaHRtbFN0cmluZyA9IHRoaXMudGVtcGxhdGVcbiAgfVxuXG4gIHJlbmRlckxpc3RPcHRpb24gKG9wdGlvbjogU2VsZWN0RXhjbHVzaXZlT3B0aW9uIHwgU2VsZWN0SW5jbHVzaXZlT3B0aW9uICwgbGkgOiBIVE1MRWxlbWVudCkge1xuICAgIGxpLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJyxvcHRpb24udGl0bGUgKyAnOiAnKVxuXG4gICAgY29uc3Qgc3VibGlzdCA9IGNyZWF0ZUVsZW0oJ3VsJywgJ29wdGlvbnMtc3VibGlzdCcsIGxpKVxuICAgIGlmIChvcHRpb24udmVydGljYWwpIHN1Ymxpc3QuY2xhc3NMaXN0LmFkZCgnb3B0aW9ucy1zdWJsaXN0LXZlcnRpY2FsJylcblxuICAgIG9wdGlvbi5zZWxlY3RPcHRpb25zLmZvckVhY2goc2VsZWN0T3B0aW9uID0+IHtcbiAgICAgIGNvbnN0IHN1Ymxpc3RMaSA9IGNyZWF0ZUVsZW0oJ2xpJywgbnVsbCwgc3VibGlzdClcbiAgICAgIGNvbnN0IGxhYmVsID0gY3JlYXRlRWxlbSgnbGFiZWwnLCBudWxsLCBzdWJsaXN0TGkpXG5cbiAgICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKVxuICAgICAgaW5wdXQudHlwZSA9IG9wdGlvbi50eXBlID09PSAnc2VsZWN0LWV4Y2x1c2l2ZScgPyAncmFkaW8nIDogJ2NoZWNrYm94J1xuICAgICAgaW5wdXQubmFtZSA9IHRoaXMuZ2xvYmFsSWQgKyAnLScgKyBvcHRpb24uaWRcbiAgICAgIGlucHV0LnZhbHVlID0gc2VsZWN0T3B0aW9uLmlkXG5cbiAgICAgIGlmIChvcHRpb24udHlwZSA9PT0gJ3NlbGVjdC1pbmNsdXNpdmUnKSB7IC8vIGRlZmF1bHRzIHdvcmsgZGlmZmVyZW50IGZvciBpbmNsdXNpdmUvZXhjbHVzaXZlXG4gICAgICAgIGlucHV0LmNoZWNrZWQgPSBvcHRpb24uZGVmYXVsdC5pbmNsdWRlcyhzZWxlY3RPcHRpb24uaWQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbnB1dC5jaGVja2VkID0gb3B0aW9uLmRlZmF1bHQgPT09IHNlbGVjdE9wdGlvbi5pZFxuICAgICAgfVxuXG4gICAgICBsYWJlbC5hcHBlbmQoaW5wdXQpXG5cbiAgICAgIGlucHV0LmNsYXNzTGlzdC5hZGQoJ29wdGlvbicpXG5cbiAgICAgIGxhYmVsLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJyxzZWxlY3RPcHRpb24udGl0bGUpXG4gICAgfSlcbiAgfVxufVxuXG4vKipcbiAqIFJlbmRlcnMgYSBoZWFkaW5nIG9wdGlvblxuICogQHBhcmFtIHtzdHJpbmd9IHRpdGxlIFRoZSB0aXRsZSBvZiB0aGUgaGVhZGluZ1xuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gbGkgVGhlIGVsZW1lbnQgdG8gcmVuZGVyIGludG9cbiAqL1xuZnVuY3Rpb24gcmVuZGVySGVhZGluZyAodGl0bGUsIGxpKSB7XG4gIGxpLmlubmVySFRNTCA9IHRpdGxlXG4gIGxpLmNsYXNzTGlzdC5hZGQoJ29wdGlvbnMtaGVhZGluZycpXG59XG5cbi8qKlxuICogUmVuZGVycyBzaW5nbGUgcGFyYW1ldGVyXG4gKiBAcGFyYW0geyp9IG9wdGlvblxuICogQHBhcmFtIHsqfSBsaVxuICovXG5mdW5jdGlvbiByZW5kZXJTaW5nbGVPcHRpb24gKG9wdGlvbiwgbGkpIHtcbiAgY29uc3QgbGFiZWwgPSBjcmVhdGVFbGVtKCdsYWJlbCcsIHVuZGVmaW5lZCwgbGkpXG5cbiAgaWYgKCFvcHRpb24uc3dhcExhYmVsICYmIG9wdGlvbi50aXRsZSAhPT0gJycpIGxhYmVsLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJyxgJHtvcHRpb24udGl0bGV9OiBgKVxuXG4gIGNvbnN0IGlucHV0IDogSFRNTElucHV0RWxlbWVudCA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgJ29wdGlvbicsIGxhYmVsKSBhcyBIVE1MSW5wdXRFbGVtZW50XG4gIHN3aXRjaCAob3B0aW9uLnR5cGUpIHtcbiAgICBjYXNlICdpbnQnOlxuICAgICAgaW5wdXQudHlwZSA9ICdudW1iZXInXG4gICAgICBpbnB1dC5taW4gPSBvcHRpb24ubWluXG4gICAgICBpbnB1dC5tYXggPSBvcHRpb24ubWF4XG4gICAgICBpbnB1dC52YWx1ZSA9IG9wdGlvbi5kZWZhdWx0XG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jvb2wnOlxuICAgICAgaW5wdXQudHlwZSA9ICdjaGVja2JveCdcbiAgICAgIGlucHV0LmNoZWNrZWQgPSBvcHRpb24uZGVmYXVsdFxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIG9wdGlvbiB0eXBlICR7b3B0aW9uLnR5cGV9YClcbiAgfVxuXG4gIGlmIChvcHRpb24uc3dhcExhYmVsICYmIG9wdGlvbi50aXRsZSAhPT0gJycpIGxhYmVsLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJyxgICR7b3B0aW9uLnRpdGxlfWApXG59XG5cbmZ1bmN0aW9uIHJlbmRlclJhbmdlT3B0aW9uKG9wdGlvbjogUmFuZ2VPcHRpb24sIGxpKSB7XG4gIGNvbnN0IGxhYmVsID0gY3JlYXRlRWxlbSgnbGFiZWwnLHVuZGVmaW5lZCwgbGkpXG4gIGNvbnN0IGlucHV0TEIgPSBjcmVhdGVFbGVtKCdpbnB1dCcsICdvcHRpb24nLCBsYWJlbCkgYXMgSFRNTElucHV0RWxlbWVudFxuICBpbnB1dExCLnR5cGUgPSAnbnVtYmVyJ1xuICBpbnB1dExCLm1pbiA9IG9wdGlvbi5taW4udG9TdHJpbmcoKVxuICBpbnB1dExCLm1heCA9IG9wdGlvbi5tYXgudG9TdHJpbmcoKVxuICBpbnB1dExCLnZhbHVlID0gb3B0aW9uLmRlZmF1bHRMQi50b1N0cmluZygpXG5cbiAgbGFiZWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLGAgJmxlcTsgJHtvcHRpb24udGl0bGV9ICZsZXE7IGApXG5cbiAgY29uc3QgaW5wdXRVQiA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgJ29wdGlvbicsIGxhYmVsKSBhcyBIVE1MSW5wdXRFbGVtZW50XG4gIGlucHV0VUIudHlwZSA9ICdudW1iZXInXG4gIGlucHV0VUIubWluID0gb3B0aW9uLm1pbi50b1N0cmluZygpXG4gIGlucHV0VUIubWF4ID0gb3B0aW9uLm1heC50b1N0cmluZygpXG4gIGlucHV0VUIudmFsdWUgPSBvcHRpb24uZGVmYXVsdFVCLnRvU3RyaW5nKClcbn1cblxuLyoqIERldGVybWluZXMgaWYgYW4gb3B0aW9uIGluIE9wdGlvbnNTcGVjIGlzIGEgcmVhbCBvcHRpb24gYXMgb3Bwb3NlZCB0b1xuICogYSBoZWFkaW5nIG9yIGNvbHVtbiBicmVha1xuICovXG5mdW5jdGlvbiBpc1JlYWxPcHRpb24ob3B0aW9uIDogT3B0aW9uc1NwZWNbMF0pIDogb3B0aW9uIGlzIFJlYWxPcHRpb257XG4gIHJldHVybiAob3B0aW9uIGFzIE9wdGlvbkkpLmlkICE9PSB1bmRlZmluZWRcbn1cblxuY29uc3QgZGVtb1NwZWMgOiBPcHRpb25zU3BlYyA9IFtcbiAge1xuICAgIHRpdGxlOiAnRGlmZmljdWx0eScsXG4gICAgaWQ6ICdkaWZmaWN1bHR5JyxcbiAgICB0eXBlOiAnaW50JyxcbiAgICBtaW46IDEsXG4gICAgbWF4OiAxMCxcbiAgICBkZWZhdWx0OiA1XG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1R5cGUnLFxuICAgIGlkOiAndHlwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1leGNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdSZWN0YW5nbGUnLCBpZDogJ3JlY3RhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdUcmlhbmdsZScsIGlkOiAndHJpYW5nbGUnIH0sXG4gICAgICB7IHRpdGxlOiAnU3F1b3ZhbCcsIGlkOiAnc3F1b3ZhbCcgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogJ3JlY3RhbmdsZSdcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnQSBoZWFkaW5nJyxcbiAgICB0eXBlOiAnaGVhZGluZydcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnU2hhcGUnLFxuICAgIGlkOiAnc2hhcGUnLFxuICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICB7IHRpdGxlOiAnUmVjdGFuZ2xlIHNoYXBlIHRoaW5nJywgaWQ6ICdyZWN0YW5nbGUnIH0sXG4gICAgICB7IHRpdGxlOiAnVHJpYW5nbGUgc2hhcGUgdGhpbmcnLCBpZDogJ3RyaWFuZ2xlJyB9LFxuICAgICAgeyB0aXRsZTogJ1NxdW92YWwgc2hhcGUgbG9uZycsIGlkOiAnc3F1b3ZhbCcgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogWydyZWN0YW5nbGUnLCAnc3F1b3ZhbCddLFxuICAgIHZlcnRpY2FsOiB0cnVlIC8vIGxheW91dCB2ZXJ0aWNhbGx5LCByYXRoZXIgdGhhbiBob3Jpem9udGFsbHlcbiAgfSxcbiAge1xuICAgIHR5cGU6ICdjb2x1bW4tYnJlYWsnXG4gIH0sXG4gIHtcbiAgICB0eXBlOiAnaGVhZGluZycsXG4gICAgdGl0bGU6ICdBIG5ldyBjb2x1bW4nXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ0RvIHNvbWV0aGluZycsXG4gICAgaWQ6ICdzb21ldGhpbmcnLFxuICAgIHR5cGU6ICdib29sJyxcbiAgICBkZWZhdWx0OiB0cnVlLFxuICAgIHN3YXBMYWJlbDogdHJ1ZSAvLyBwdXQgY29udHJvbCBiZWZvcmUgbGFiZWxcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnT3B0aW9ucyBmb3IgcmVjdGFuZ2xlcycsXG4gICAgaWQ6ICdyZWN0YW5nbGUtb3B0aW9ucycsXG4gICAgdHlwZTogJ3N1Ym9wdGlvbnMnLFxuICAgIG9wdGlvbnNTcGVjOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnTWluaW11bSB4JyxcbiAgICAgICAgaWQ6ICdtaW5YJyxcbiAgICAgICAgdHlwZTogJ2ludCcsXG4gICAgICAgIG1pbjogMCxcbiAgICAgICAgbWF4OiAxMCxcbiAgICAgICAgZGVmYXVsdDogMlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdNYXhpbXVtIHgnLFxuICAgICAgICBpZDogJ21heFgnLFxuICAgICAgICB0eXBlOiAnaW50JyxcbiAgICAgICAgbWluOiAwLFxuICAgICAgICBtYXg6IDEwLFxuICAgICAgICBkZWZhdWx0OiA0XG4gICAgICB9XG4gICAgXVxuICB9XG5dXG5cbmNvbnN0IGRlbW9UZW1wbGF0ZSA6IHN0cmluZyA9XG5cIjxsaT57e2RpZmZpY3VsdHkucmVuZGVyZWR9fTwvbGk+XFxuXCIgKyAgICAgIC8vIEluc2VydHMgZnVsbCAnZGlmZml1bHR5JyBvcHRpb24gYXMgYmVmb3JlXG5cIjxsaT48Yj57e3R5cGUudGl0bGV9fTwvYj4gXFxuXCIgKyAgICAgICAgICAgIC8vIGp1c3QgdGhlIHRpdGxlXG5cIjxsaT57e3R5cGUuaW5wdXR9fSBcXG5cIiArICAgICAgICAgICAgICAgICAgIC8vIHRoZSBpbnB1dCBlbGVtZW50XG5cInt7dHlwZS5zZWxlY3RPcHRpb25zUmVuZGVyZWRBbGx9fTwvbGk+XCIgKyAgLy8gVGhlIG9wdGlvbnMsIHJlZGVyZWQgdXN1YWxseVxuXCI8bGk+PHVsPnt7IyB0eXBlLnNlbGVjdE9wdGlvbnN9fVwiICsgICAgICAgLy8gSW5kaXZpZHVhbCBzZWxlY3Qgb3B0aW9ucywgcmVuZGVyZWRcbiAgXCI8bGk+IHt7cmVuZGVyZWR9fSA8L2xpPlwiICsgICAgICAgICAgICAgICAvLyBUaGUgdXN1YWwgcmVuZGVyZWQgb3B0aW9uXG5cInt7LyB0eXBlLnNlbGVjdE9wdGlvbnN9fTwvdWw+XCJcblxuY29uc3QgZXhhbXBsZVRlbXBsYXRlIDogc3RyaW5nID0gIC8vIEFub3RoZXIgZXhhbXBsZSwgd2l0aCBmZXdlciBjb21tZW50c1xuYDxkaXYgY2xhc3MgPSBcIm9wdGlvbnMtY29sdW1uXCI+XG4gIDx1bCBjbGFzcz1cIm9wdGlvbnMtbGlzdFwiPlxuICAgIDxsaT4gPGI+U29tZSBvcHRpb25zIDwvYj4gPC9saT5cbiAgICA8bGk+IHt7ZGlmZmljdWx0eS5yZW5kZXJlZH19IDwvbGk+XG4gICAgPGxpIHN0eWxlPVwiZGlzcGxheTpibG9ja1wiPiB7e3NpbXBsZS50aXRsZX19IHt7c2ltcGxlLmlucHV0fX1cbiAgICAgIHt7I3NpbXBsZU1pblh9fVxuYCAiLCJleHBvcnQgZGVmYXVsdCBhYnN0cmFjdCBjbGFzcyBRdWVzdGlvbiB7XG4gIERPTTogSFRNTEVsZW1lbnRcbiAgYW5zd2VyZWQ6IGJvb2xlYW5cblxuICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgdGhpcy5ET00gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgIHRoaXMuRE9NLmNsYXNzTmFtZSA9ICdxdWVzdGlvbi1kaXYnXG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gIH1cblxuICBnZXRET00gKCkgOiBIVE1MRWxlbWVudCB7XG4gICAgcmV0dXJuIHRoaXMuRE9NXG4gIH1cblxuICBhYnN0cmFjdCByZW5kZXIgKCkgOiB2b2lkXG5cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQge1xuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gIH1cblxuICB0b2dnbGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICBpZiAodGhpcy5hbnN3ZXJlZCkge1xuICAgICAgdGhpcy5oaWRlQW5zd2VyKClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaG93QW5zd2VyKClcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgLy8gU2hvdWxkIGJlIG92ZXJyaWRkZW5cbiAgICByZXR1cm4gJydcbiAgfVxufVxuIiwiLyogZ2xvYmFsIGthdGV4ICovXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRleHRRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKClcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYSdcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIC8vIHN0b3JlIHRoZSBsYWJlbCBmb3IgZnV0dXJlIHJlbmRlcmluZ1xuICAgIHRoaXMubGFiZWwgPSBzZXR0aW5ncy5sYWJlbFxuXG4gICAgLy8gRHVtbXkgcXVlc3Rpb24gZ2VuZXJhdGluZyAtIHN1YmNsYXNzZXMgZG8gc29tZXRoaW5nIHN1YnN0YW50aWFsIGhlcmVcbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnMisyJ1xuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPTUnXG5cbiAgICAvLyBNYWtlIHRoZSBET00gdHJlZSBmb3IgdGhlIGVsZW1lbnRcbiAgICB0aGlzLnF1ZXN0aW9ucCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKVxuICAgIHRoaXMuYW5zd2VycCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKVxuXG4gICAgdGhpcy5xdWVzdGlvbnAuY2xhc3NOYW1lID0gJ3F1ZXN0aW9uJ1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc05hbWUgPSAnYW5zd2VyJ1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuXG4gICAgdGhpcy5ET00uYXBwZW5kQ2hpbGQodGhpcy5xdWVzdGlvbnApXG4gICAgdGhpcy5ET00uYXBwZW5kQ2hpbGQodGhpcy5hbnN3ZXJwKVxuXG4gICAgLy8gc3ViY2xhc3NlcyBzaG91bGQgZ2VuZXJhdGUgcXVlc3Rpb25MYVRlWCBhbmQgYW5zd2VyTGFUZVgsXG4gICAgLy8gLnJlbmRlcigpIHdpbGwgYmUgY2FsbGVkIGJ5IHVzZXJcbiAgfVxuXG4gIHJlbmRlciAoKSB7XG4gICAgLy8gdXBkYXRlIHRoZSBET00gaXRlbSB3aXRoIHF1ZXN0aW9uTGFUZVggYW5kIGFuc3dlckxhVGVYXG4gICAgdmFyIHFudW0gPSB0aGlzLmxhYmVsXG4gICAgICA/ICdcXFxcdGV4dHsnICsgdGhpcy5sYWJlbCArICcpIH0nXG4gICAgICA6ICcnXG4gICAga2F0ZXgucmVuZGVyKHFudW0gKyB0aGlzLnF1ZXN0aW9uTGFUZVgsIHRoaXMucXVlc3Rpb25wLCB7IGRpc3BsYXlNb2RlOiB0cnVlLCBzdHJpY3Q6ICdpZ25vcmUnIH0pXG4gICAga2F0ZXgucmVuZGVyKHRoaXMuYW5zd2VyTGFUZVgsIHRoaXMuYW5zd2VycCwgeyBkaXNwbGF5TW9kZTogdHJ1ZSB9KVxuICB9XG5cbiAgZ2V0RE9NICgpIHtcbiAgICByZXR1cm4gdGhpcy5ET01cbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkge1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIHtcbiAgICB0aGlzLmFuc3dlcnAuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxufVxuIiwiaW1wb3J0IHsgcmFuZEJldHdlZW4sIGdjZCB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcblxuLyogTWFpbiBxdWVzdGlvbiBjbGFzcy4gVGhpcyB3aWxsIGJlIHNwdW4gb2ZmIGludG8gZGlmZmVyZW50IGZpbGUgYW5kIGdlbmVyYWxpc2VkICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBbGdlYnJhaWNGcmFjdGlvblEgZXh0ZW5kcyBUZXh0USB7XG4gIC8vICdleHRlbmRzJyBRdWVzdGlvbiwgYnV0IG5vdGhpbmcgdG8gYWN0dWFsbHkgZXh0ZW5kXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogMlxuICAgIH1cblxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG4gICAgY29uc3QgZGlmZmljdWx0eSA9IHNldHRpbmdzLmRpZmZpY3VsdHlcblxuICAgIC8vIGxvZ2ljIGZvciBnZW5lcmF0aW5nIHRoZSBxdWVzdGlvbiBhbmQgYW5zd2VyIHN0YXJ0cyBoZXJlXG4gICAgdmFyIGEsIGIsIGMsIGQsIGUsIGYgLy8gKGF4K2IpKGV4K2YpLyhjeCtkKShleCtmKSA9IChweF4yK3F4K3IpLyh0eF4yK3V4K3YpXG4gICAgdmFyIHAsIHEsIHIsIHQsIHUsIHZcbiAgICB2YXIgbWluQ29lZmYsIG1heENvZWZmLCBtaW5Db25zdCwgbWF4Q29uc3RcblxuICAgIHN3aXRjaCAoZGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMTsgbWluQ29uc3QgPSAxOyBtYXhDb25zdCA9IDZcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgbWluQ29lZmYgPSAxOyBtYXhDb2VmZiA9IDE7IG1pbkNvbnN0ID0gLTY7IG1heENvbnN0ID0gNlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAzOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMzsgbWluQ29uc3QgPSAtNTsgbWF4Q29uc3QgPSA1XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ6XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBtaW5Db2VmZiA9IC0zOyBtYXhDb2VmZiA9IDM7IG1pbkNvbnN0ID0gLTU7IG1heENvbnN0ID0gNVxuICAgICAgICBicmVha1xuICAgIH1cblxuICAgIC8vIFBpY2sgc29tZSBjb2VmZmljaWVudHNcbiAgICB3aGlsZSAoXG4gICAgICAoKCFhICYmICFiKSB8fCAoIWMgJiYgIWQpIHx8ICghZSAmJiAhZikpIHx8IC8vIHJldHJ5IGlmIGFueSBleHByZXNzaW9uIGlzIDBcbiAgICAgIGNhblNpbXBsaWZ5KGEsIGIsIGMsIGQpIC8vIHJldHJ5IGlmIHRoZXJlJ3MgYSBjb21tb24gbnVtZXJpY2FsIGZhY3RvclxuICAgICkge1xuICAgICAgYSA9IHJhbmRCZXR3ZWVuKG1pbkNvZWZmLCBtYXhDb2VmZilcbiAgICAgIGMgPSByYW5kQmV0d2VlbihtaW5Db2VmZiwgbWF4Q29lZmYpXG4gICAgICBlID0gcmFuZEJldHdlZW4obWluQ29lZmYsIG1heENvZWZmKVxuICAgICAgYiA9IHJhbmRCZXR3ZWVuKG1pbkNvbnN0LCBtYXhDb25zdClcbiAgICAgIGQgPSByYW5kQmV0d2VlbihtaW5Db25zdCwgbWF4Q29uc3QpXG4gICAgICBmID0gcmFuZEJldHdlZW4obWluQ29uc3QsIG1heENvbnN0KVxuICAgIH1cblxuICAgIC8vIGlmIHRoZSBkZW5vbWluYXRvciBpcyBuZWdhdGl2ZSBmb3IgZWFjaCB0ZXJtLCB0aGVuIG1ha2UgdGhlIG51bWVyYXRvciBuZWdhdGl2ZSBpbnN0ZWFkXG4gICAgaWYgKGMgPD0gMCAmJiBkIDw9IDApIHtcbiAgICAgIGMgPSAtY1xuICAgICAgZCA9IC1kXG4gICAgICBhID0gLWFcbiAgICAgIGIgPSAtYlxuICAgIH1cblxuICAgIHAgPSBhICogZTsgcSA9IGEgKiBmICsgYiAqIGU7IHIgPSBiICogZlxuICAgIHQgPSBjICogZTsgdSA9IGMgKiBmICsgZCAqIGU7IHYgPSBkICogZlxuXG4gICAgLy8gTm93IHB1dCB0aGUgcXVlc3Rpb24gYW5kIGFuc3dlciBpbiBhIG5pY2UgZm9ybWF0IGludG8gcXVlc3Rpb25MYVRlWCBhbmQgYW5zd2VyTGFUZVhcbiAgICBjb25zdCBxdWVzdGlvbiA9IGBcXFxcZnJhY3ske3F1YWRyYXRpY1N0cmluZyhwLCBxLCByKX19eyR7cXVhZHJhdGljU3RyaW5nKHQsIHUsIHYpfX1gXG4gICAgaWYgKHNldHRpbmdzLnVzZUNvbW1hbmRXb3JkKSB7XG4gICAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnXFxcXHRleHR7U2ltcGxpZnl9ICcgKyBxdWVzdGlvblxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSBxdWVzdGlvblxuICAgIH1cbiAgICB0aGlzLmFuc3dlckxhVGVYID1cbiAgICAgIChjID09PSAwICYmIGQgPT09IDEpID8gcXVhZHJhdGljU3RyaW5nKDAsIGEsIGIpXG4gICAgICAgIDogYFxcXFxmcmFjeyR7cXVhZHJhdGljU3RyaW5nKDAsIGEsIGIpfX17JHtxdWFkcmF0aWNTdHJpbmcoMCwgYywgZCl9fWBcblxuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPSAnICsgdGhpcy5hbnN3ZXJMYVRlWFxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdTaW1wbGlmeSdcbiAgfVxufVxuXG4vKiBVdGlsaXR5IGZ1bmN0aW9uc1xuICogQXQgc29tZSBwb2ludCwgSSdsbCBtb3ZlIHNvbWUgb2YgdGhlc2UgaW50byBhIGdlbmVyYWwgdXRpbGl0aWVzIG1vZHVsZVxuICogYnV0IHRoaXMgd2lsbCBkbyBmb3Igbm93XG4gKi9cblxuLy8gVE9ETyBJIGhhdmUgcXVhZHJhdGljU3RyaW5nIGhlcmUgYW5kIGFsc28gYSBQb2x5bm9taWFsIGNsYXNzLiBXaGF0IGlzIGJlaW5nIHJlcGxpY2F0ZWQ/wqdcbmZ1bmN0aW9uIHF1YWRyYXRpY1N0cmluZyAoYSwgYiwgYykge1xuICBpZiAoYSA9PT0gMCAmJiBiID09PSAwICYmIGMgPT09IDApIHJldHVybiAnMCdcblxuICB2YXIgeDJzdHJpbmcgPVxuICAgIGEgPT09IDAgPyAnJ1xuICAgICAgOiBhID09PSAxID8gJ3heMidcbiAgICAgICAgOiBhID09PSAtMSA/ICcteF4yJ1xuICAgICAgICAgIDogYSArICd4XjInXG5cbiAgdmFyIHhzaWduID1cbiAgICBiIDwgMCA/ICctJ1xuICAgICAgOiAoYSA9PT0gMCB8fCBiID09PSAwKSA/ICcnXG4gICAgICAgIDogJysnXG5cbiAgdmFyIHhzdHJpbmcgPVxuICAgIGIgPT09IDAgPyAnJ1xuICAgICAgOiAoYiA9PT0gMSB8fCBiID09PSAtMSkgPyAneCdcbiAgICAgICAgOiBNYXRoLmFicyhiKSArICd4J1xuXG4gIHZhciBjb25zdHNpZ24gPVxuICAgIGMgPCAwID8gJy0nXG4gICAgICA6ICgoYSA9PT0gMCAmJiBiID09PSAwKSB8fCBjID09PSAwKSA/ICcnXG4gICAgICAgIDogJysnXG5cbiAgdmFyIGNvbnN0c3RyaW5nID1cbiAgICBjID09PSAwID8gJycgOiBNYXRoLmFicyhjKVxuXG4gIHJldHVybiB4MnN0cmluZyArIHhzaWduICsgeHN0cmluZyArIGNvbnN0c2lnbiArIGNvbnN0c3RyaW5nXG59XG5cbmZ1bmN0aW9uIGNhblNpbXBsaWZ5IChhMSwgYjEsIGEyLCBiMikge1xuICAvLyBjYW4gKGExeCtiMSkvKGEyeCtiMikgYmUgc2ltcGxpZmllZD9cbiAgLy9cbiAgLy8gRmlyc3QsIHRha2Ugb3V0IGdjZCwgYW5kIHdyaXRlIGFzIGMxKGExeCtiMSkgZXRjXG5cbiAgdmFyIGMxID0gZ2NkKGExLCBiMSlcbiAgYTEgPSBhMSAvIGMxXG4gIGIxID0gYjEgLyBjMVxuXG4gIHZhciBjMiA9IGdjZChhMiwgYjIpXG4gIGEyID0gYTIgLyBjMlxuICBiMiA9IGIyIC8gYzJcblxuICB2YXIgcmVzdWx0ID0gZmFsc2VcblxuICBpZiAoZ2NkKGMxLCBjMikgPiAxIHx8IChhMSA9PT0gYTIgJiYgYjEgPT09IGIyKSkge1xuICAgIHJlc3VsdCA9IHRydWVcbiAgfVxuXG4gIHJldHVybiByZXN1bHRcbn1cbiIsImltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCB7IHJhbmRCZXR3ZWVuIH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJbnRlZ2VyQWRkUSBleHRlbmRzIFRleHRRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiA1LFxuICAgICAgbGFiZWw6ICdhJ1xuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyBUaGlzIGlzIGp1c3QgYSBkZW1vIHF1ZXN0aW9uIHR5cGUgZm9yIG5vdywgc28gbm90IHByb2Nlc3NpbmcgZGlmZmljdWx0eVxuICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbigxMCwgMTAwMClcbiAgICBjb25zdCBiID0gcmFuZEJldHdlZW4oMTAsIDEwMDApXG4gICAgY29uc3Qgc3VtID0gYSArIGJcblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9IGEgKyAnICsgJyArIGJcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJz0gJyArIHN1bVxuXG4gICAgdGhpcy5yZW5kZXIoKVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdFdmFsdWF0ZSdcbiAgfVxufVxuIiwiLyoqXG4gKiBDbGFzcyByZXByZXNlbnRpbmcgYSBwb2ludCwgYW5kIHN0YXRpYyB1dGl0bGl0eSBtZXRob2RzXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBvaW50IHtcbiAgY29uc3RydWN0b3IgKHgsIHkpIHtcbiAgICB0aGlzLnggPSB4XG4gICAgdGhpcy55ID0geVxuICB9XG5cbiAgcm90YXRlIChhbmdsZSkge1xuICAgIHZhciBuZXd4LCBuZXd5XG4gICAgbmV3eCA9IE1hdGguY29zKGFuZ2xlKSAqIHRoaXMueCAtIE1hdGguc2luKGFuZ2xlKSAqIHRoaXMueVxuICAgIG5ld3kgPSBNYXRoLnNpbihhbmdsZSkgKiB0aGlzLnggKyBNYXRoLmNvcyhhbmdsZSkgKiB0aGlzLnlcbiAgICB0aGlzLnggPSBuZXd4XG4gICAgdGhpcy55ID0gbmV3eVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzY2FsZSAoc2YpIHtcbiAgICB0aGlzLnggPSB0aGlzLnggKiBzZlxuICAgIHRoaXMueSA9IHRoaXMueSAqIHNmXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHRyYW5zbGF0ZSAoeCwgeSkge1xuICAgIHRoaXMueCArPSB4XG4gICAgdGhpcy55ICs9IHlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgY2xvbmUgKCkge1xuICAgIHJldHVybiBuZXcgUG9pbnQodGhpcy54LCB0aGlzLnkpXG4gIH1cblxuICBlcXVhbHMgKHRoYXQpIHtcbiAgICByZXR1cm4gKHRoaXMueCA9PT0gdGhhdC54ICYmIHRoaXMueSA9PT0gdGhhdC55KVxuICB9XG5cbiAgbW92ZVRvd2FyZCAodGhhdCwgZCkge1xuICAgIC8vIG1vdmVzIFtkXSBpbiB0aGUgZGlyZWN0aW9uIG9mIFt0aGF0OjpQb2ludF1cbiAgICBjb25zdCB1dmVjID0gUG9pbnQudW5pdFZlY3Rvcih0aGlzLCB0aGF0KVxuICAgIHRoaXMudHJhbnNsYXRlKHV2ZWMueCAqIGQsIHV2ZWMueSAqIGQpXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHN0YXRpYyBmcm9tUG9sYXIgKHIsIHRoZXRhKSB7XG4gICAgcmV0dXJuIG5ldyBQb2ludChcbiAgICAgIE1hdGguY29zKHRoZXRhKSAqIHIsXG4gICAgICBNYXRoLnNpbih0aGV0YSkgKiByXG4gICAgKVxuICB9XG5cbiAgc3RhdGljIGZyb21Qb2xhckRlZyAociwgdGhldGEpIHtcbiAgICB0aGV0YSA9IHRoZXRhICogTWF0aC5QSSAvIDE4MFxuICAgIHJldHVybiBQb2ludC5mcm9tUG9sYXIociwgdGhldGEpXG4gIH1cblxuICAvKipcbiAgICogRmluZCB0aGUgbWVhbiBvZlxuICAgKiBAcGFyYW0gIHsuLi5Qb2ludH0gcG9pbnRzIFRoZSBwb2ludHMgdG8gZmluZCB0aGUgbWVhbiBvZlxuICAgKi9cbiAgc3RhdGljIG1lYW4gKC4uLnBvaW50cykge1xuICAgIGNvbnN0IHN1bXggPSBwb2ludHMubWFwKHAgPT4gcC54KS5yZWR1Y2UoKHgsIHkpID0+IHggKyB5KVxuICAgIGNvbnN0IHN1bXkgPSBwb2ludHMubWFwKHAgPT4gcC55KS5yZWR1Y2UoKHgsIHkpID0+IHggKyB5KVxuICAgIGNvbnN0IG4gPSBwb2ludHMubGVuZ3RoXG5cbiAgICByZXR1cm4gbmV3IFBvaW50KHN1bXggLyBuLCBzdW15IC8gbilcbiAgfVxuXG4gIHN0YXRpYyBpbkNlbnRlciAoQSwgQiwgQykge1xuICAgIC8vIGluY2VudGVyIG9mIGEgdHJpYW5nbGUgZ2l2ZW4gdmVydGV4IHBvaW50cyBBLCBCIGFuZCBDXG4gICAgY29uc3QgYSA9IFBvaW50LmRpc3RhbmNlKEIsIEMpXG4gICAgY29uc3QgYiA9IFBvaW50LmRpc3RhbmNlKEEsIEMpXG4gICAgY29uc3QgYyA9IFBvaW50LmRpc3RhbmNlKEEsIEIpXG5cbiAgICBjb25zdCBwZXJpbWV0ZXIgPSBhICsgYiArIGNcbiAgICBjb25zdCBzdW14ID0gYSAqIEEueCArIGIgKiBCLnggKyBjICogQy54XG4gICAgY29uc3Qgc3VteSA9IGEgKiBBLnkgKyBiICogQi55ICsgYyAqIEMueVxuXG4gICAgcmV0dXJuIG5ldyBQb2ludChzdW14IC8gcGVyaW1ldGVyLCBzdW15IC8gcGVyaW1ldGVyKVxuICB9XG5cbiAgc3RhdGljIG1pbiAocG9pbnRzKSB7XG4gICAgY29uc3QgbWlueCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWluKHgsIHAueCksIEluZmluaXR5KVxuICAgIGNvbnN0IG1pbnkgPSBwb2ludHMucmVkdWNlKCh5LCBwKSA9PiBNYXRoLm1pbih5LCBwLnkpLCBJbmZpbml0eSlcbiAgICByZXR1cm4gbmV3IFBvaW50KG1pbngsIG1pbnkpXG4gIH1cblxuICBzdGF0aWMgbWF4IChwb2ludHMpIHtcbiAgICBjb25zdCBtYXh4ID0gcG9pbnRzLnJlZHVjZSgoeCwgcCkgPT4gTWF0aC5tYXgoeCwgcC54KSwgLUluZmluaXR5KVxuICAgIGNvbnN0IG1heHkgPSBwb2ludHMucmVkdWNlKCh5LCBwKSA9PiBNYXRoLm1heCh5LCBwLnkpLCAtSW5maW5pdHkpXG4gICAgcmV0dXJuIG5ldyBQb2ludChtYXh4LCBtYXh5KVxuICB9XG5cbiAgc3RhdGljIGNlbnRlciAocG9pbnRzKSB7XG4gICAgY29uc3QgbWlueCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWluKHgsIHAueCksIEluZmluaXR5KVxuICAgIGNvbnN0IG1pbnkgPSBwb2ludHMucmVkdWNlKCh5LCBwKSA9PiBNYXRoLm1pbih5LCBwLnkpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtYXh4ID0gcG9pbnRzLnJlZHVjZSgoeCwgcCkgPT4gTWF0aC5tYXgoeCwgcC54KSwgLUluZmluaXR5KVxuICAgIGNvbnN0IG1heHkgPSBwb2ludHMucmVkdWNlKCh5LCBwKSA9PiBNYXRoLm1heCh5LCBwLnkpLCAtSW5maW5pdHkpXG4gICAgcmV0dXJuIG5ldyBQb2ludCgobWF4eCArIG1pbngpIC8gMiwgKG1heHkgKyBtaW55KSAvIDIpXG4gIH1cblxuICBzdGF0aWMgdW5pdFZlY3RvciAocDEsIHAyKSB7XG4gICAgLy8gcmV0dXJucyBhIHVuaXQgdmVjdG9yIGluIHRoZSBkaXJlY3Rpb24gb2YgcDEgdG8gcDJcbiAgICAvLyBpbiB0aGUgZm9ybSB7eDouLi4sIHk6Li4ufVxuICAgIGNvbnN0IHZlY3ggPSBwMi54IC0gcDEueFxuICAgIGNvbnN0IHZlY3kgPSBwMi55IC0gcDEueVxuICAgIGNvbnN0IGxlbmd0aCA9IE1hdGguaHlwb3QodmVjeCwgdmVjeSlcbiAgICByZXR1cm4geyB4OiB2ZWN4IC8gbGVuZ3RoLCB5OiB2ZWN5IC8gbGVuZ3RoIH1cbiAgfVxuXG4gIHN0YXRpYyBkaXN0YW5jZSAocDEsIHAyKSB7XG4gICAgcmV0dXJuIE1hdGguaHlwb3QocDEueCAtIHAyLngsIHAxLnkgLSBwMi55KVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGN1bGF0ZSB0aGUgYW5nbGUgaW4gcmFkaWFucyBmcm9tIGhvcml6b250YWwgdG8gcDIsIHdpdGggY2VudHJlIHAxLlxuICAgKiBFLmcuIGFuZ2xlRnJvbSggKDAsMCksICgxLDEpICkgPSBwaS8yXG4gICAqIEFuZ2xlIGlzIGZyb20gMCB0byAycGlcbiAgICogQHBhcmFtIHtQb2ludH0gcDEgVGhlIHN0YXJ0IHBvaW50XG4gICAqIEBwYXJhbSB7UG9pbnR9IHAyIFRoZSBlbmQgcG9pbnRcbiAgICogQHJldHVybnMge251bWJlcn0gVGhlIGFuZ2xlIGluIHJhZGlhbnNcbiAgICovXG4gIHN0YXRpYyBhbmdsZUZyb20gKHAxLCBwMikge1xuICAgIGNvbnN0IGFuZ2xlID0gTWF0aC5hdGFuMihwMi55IC0gcDEueSwgcDIueCAtIHAxLngpXG4gICAgcmV0dXJuIGFuZ2xlID49IDAgPyBhbmdsZSA6IDIgKiBNYXRoLlBJICsgYW5nbGVcbiAgfVxuXG4gIHN0YXRpYyByZXBlbCAocDEsIHAyLCB0cmlnZ2VyLCBkaXN0YW5jZSkge1xuICAgIC8vIFdoZW4gcDEgYW5kIHAyIGFyZSBsZXNzIHRoYW4gW3RyaWdnZXJdIGFwYXJ0LCB0aGV5IGFyZVxuICAgIC8vIG1vdmVkIHNvIHRoYXQgdGhleSBhcmUgW2Rpc3RhbmNlXSBhcGFydFxuICAgIGNvbnN0IGQgPSBNYXRoLmh5cG90KHAxLnggLSBwMi54LCBwMS55IC0gcDIueSlcbiAgICBpZiAoZCA+PSB0cmlnZ2VyKSByZXR1cm4gZmFsc2VcblxuICAgIGNvbnN0IHIgPSAoZGlzdGFuY2UgLSBkKSAvIDIgLy8gZGlzdGFuY2UgdGhleSBuZWVkIG1vdmluZ1xuICAgIHAxLm1vdmVUb3dhcmQocDIsIC1yKVxuICAgIHAyLm1vdmVUb3dhcmQocDEsIC1yKVxuICAgIHJldHVybiB0cnVlXG4gIH1cbn1cbiIsImltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbi9RdWVzdGlvbidcbmltcG9ydCB7IGNyZWF0ZUVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi9WaWV3T3B0aW9ucydcbmRlY2xhcmUgY29uc3Qga2F0ZXggOiB7cmVuZGVyIDogKHN0cmluZzogc3RyaW5nLCBlbGVtZW50OiBIVE1MRWxlbWVudCkgPT4gdm9pZH1cblxuLyogR3JhcGhpY1FEYXRhIGNhbiBhbGwgYmUgdmVyeSBkaWZmZXJlbnQsIHNvIGludGVyZmFjZSBpcyBlbXB0eVxuICogSGVyZSBmb3IgY29kZSBkb2N1bWVudGF0aW9uIHJhdGhlciB0aGFuIHR5cGUgc2FmZXR5ICh3aGljaCBpc24ndCBwcm92aWRlZCkgKi9cblxuLyogZXNsaW50LWRpc2FibGUgKi9cbmV4cG9ydCBpbnRlcmZhY2UgR3JhcGhpY1FEYXRhIHtcbn1cbi8qIGVzbGludC1lbmFibGUgKi9cblxuLyogTm90IHdvcnRoIHRoZSBoYXNzbHkgdHJ5aW5nIHRvIGdldCBpbnRlcmZhY2VzIGZvciBzdGF0aWMgbWV0aG9kc1xuICpcbiAqIGV4cG9ydCBpbnRlcmZhY2UgR3JhcGhpY1FEYXRhQ29uc3RydWN0b3Ige1xuICogICBuZXcoLi4uYXJncyA6IHVua25vd25bXSk6IEdyYXBoaWNRRGF0YVxuICogICByYW5kb20ob3B0aW9uczogdW5rbm93bikgOiBHcmFwaGljUURhdGFcbiAqIH1cbiovXG5cbmV4cG9ydCBpbnRlcmZhY2UgTGFiZWwge1xuICBwb3M6IFBvaW50LFxuICB0ZXh0cTogc3RyaW5nLFxuICB0ZXh0YTogc3RyaW5nLFxuICBzdHlsZXE6IHN0cmluZyxcbiAgc3R5bGVhOiBzdHJpbmcsXG4gIHRleHQ6IHN0cmluZyxcbiAgc3R5bGU6IHN0cmluZ1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgR3JhcGhpY1FWaWV3IHtcbiAgRE9NOiBIVE1MRWxlbWVudFxuICBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50XG4gIHdpZHRoOiBudW1iZXJcbiAgaGVpZ2h0OiBudW1iZXJcbiAgZGF0YTogR3JhcGhpY1FEYXRhXG4gIGxhYmVsczogTGFiZWxbXVxuXG4gIGNvbnN0cnVjdG9yIChkYXRhIDogR3JhcGhpY1FEYXRhLCB2aWV3T3B0aW9ucyA6IFZpZXdPcHRpb25zKSB7XG4gICAgY29uc3QgZGVmYXVsdHMgOiBWaWV3T3B0aW9ucyA9IHtcbiAgICAgIHdpZHRoOiAyNTAsXG4gICAgICBoZWlnaHQ6IDI1MFxuICAgIH1cblxuICAgIHZpZXdPcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIHZpZXdPcHRpb25zKVxuXG4gICAgdGhpcy53aWR0aCA9IHZpZXdPcHRpb25zLndpZHRoXG4gICAgdGhpcy5oZWlnaHQgPSB2aWV3T3B0aW9ucy5oZWlnaHQgLy8gb25seSB0aGluZ3MgSSBuZWVkIGZyb20gdGhlIG9wdGlvbnMsIGdlbmVyYWxseT9cbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgLy8gdGhpcy5yb3RhdGlvbj9cblxuICAgIHRoaXMubGFiZWxzID0gW10gLy8gbGFiZWxzIG9uIGRpYWdyYW1cblxuICAgIC8vIERPTSBlbGVtZW50c1xuICAgIHRoaXMuRE9NID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWRpdicpXG4gICAgdGhpcy5jYW52YXMgPSBjcmVhdGVFbGVtKCdjYW52YXMnLCAncXVlc3Rpb24tY2FudmFzJywgdGhpcy5ET00pIGFzIEhUTUxDYW52YXNFbGVtZW50XG4gICAgdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLndpZHRoXG4gICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHRcbiAgfVxuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHtcbiAgICByZXR1cm4gdGhpcy5ET01cbiAgfVxuXG4gIGFic3RyYWN0IHJlbmRlciAoKSA6IHZvaWRcblxuICByZW5kZXJMYWJlbHMgKG51ZGdlPyA6IGJvb2xlYW4pIDogdm9pZCB7XG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5ET01cblxuICAgIC8vIHJlbW92ZSBhbnkgZXhpc3RpbmcgbGFiZWxzXG4gICAgY29uc3Qgb2xkTGFiZWxzID0gY29udGFpbmVyLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2xhYmVsJylcbiAgICB3aGlsZSAob2xkTGFiZWxzLmxlbmd0aCA+IDApIHtcbiAgICAgIG9sZExhYmVsc1swXS5yZW1vdmUoKVxuICAgIH1cblxuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBjb25zdCBsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgICBjb25zdCBpbm5lcmxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICAgIGxhYmVsLmNsYXNzTGlzdC5hZGQoJ2xhYmVsJylcbiAgICAgIGxhYmVsLmNsYXNzTmFtZSArPSAnICcgKyBsLnN0eWxlIC8vIHVzaW5nIGNsYXNzTmFtZSBvdmVyIGNsYXNzTGlzdCBzaW5jZSBsLnN0eWxlIGlzIHNwYWNlLWRlbGltaXRlZCBsaXN0IG9mIGNsYXNzZXNcbiAgICAgIGxhYmVsLnN0eWxlLmxlZnQgPSBsLnBvcy54ICsgJ3B4J1xuICAgICAgbGFiZWwuc3R5bGUudG9wID0gbC5wb3MueSArICdweCdcblxuICAgICAga2F0ZXgucmVuZGVyKGwudGV4dCwgaW5uZXJsYWJlbClcbiAgICAgIGxhYmVsLmFwcGVuZENoaWxkKGlubmVybGFiZWwpXG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQobGFiZWwpXG5cbiAgICAgIC8vIHJlbW92ZSBzcGFjZSBpZiB0aGUgaW5uZXIgbGFiZWwgaXMgdG9vIGJpZ1xuICAgICAgaWYgKGlubmVybGFiZWwub2Zmc2V0V2lkdGggLyBpbm5lcmxhYmVsLm9mZnNldEhlaWdodCA+IDIpIHtcbiAgICAgICAgY29uc29sZS5sb2coYHJlbW92ZWQgc3BhY2UgaW4gJHtsLnRleHR9YClcbiAgICAgICAgY29uc3QgbmV3bGFiZWx0ZXh0ID0gbC50ZXh0LnJlcGxhY2UoL1xcKy8sICdcXFxcIStcXFxcIScpLnJlcGxhY2UoLy0vLCAnXFxcXCEtXFxcXCEnKVxuICAgICAgICBrYXRleC5yZW5kZXIobmV3bGFiZWx0ZXh0LCBpbm5lcmxhYmVsKVxuICAgICAgfVxuXG4gICAgICAvLyBJIGRvbid0IHVuZGVyc3RhbmQgdGhpcyBhZGp1c3RtZW50LiBJIHRoaW5rIGl0IG1pZ2h0IGJlIG5lZWRlZCBpbiBhcml0aG1hZ29ucywgYnV0IGl0IG1ha2VzXG4gICAgICAvLyBvdGhlcnMgZ28gZnVubnkuXG5cbiAgICAgIGlmIChudWRnZSkge1xuICAgICAgICBjb25zdCBsd2lkdGggPSBsYWJlbC5vZmZzZXRXaWR0aFxuICAgICAgICBpZiAobC5wb3MueCA8IHRoaXMuY2FudmFzLndpZHRoIC8gMiAtIDUgJiYgbC5wb3MueCArIGx3aWR0aCAvIDIgPiB0aGlzLmNhbnZhcy53aWR0aCAvIDIpIHtcbiAgICAgICAgICBsYWJlbC5zdHlsZS5sZWZ0ID0gKHRoaXMuY2FudmFzLndpZHRoIC8gMiAtIGx3aWR0aCAtIDMpICsgJ3B4J1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBudWRnZWQgJyR7bC50ZXh0fSdgKVxuICAgICAgICB9XG4gICAgICAgIGlmIChsLnBvcy54ID4gdGhpcy5jYW52YXMud2lkdGggLyAyICsgNSAmJiBsLnBvcy54IC0gbHdpZHRoIC8gMiA8IHRoaXMuY2FudmFzLndpZHRoIC8gMikge1xuICAgICAgICAgIGxhYmVsLnN0eWxlLmxlZnQgPSAodGhpcy5jYW52YXMud2lkdGggLyAyICsgMykgKyAncHgnXG4gICAgICAgICAgY29uc29sZS5sb2coYG51ZGdlZCAnJHtsLnRleHR9J2ApXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQge1xuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRhXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZWFcbiAgICB9KVxuICAgIHRoaXMucmVuZGVyTGFiZWxzKGZhbHNlKVxuICB9XG5cbiAgaGlkZUFuc3dlciAoKSA6IHZvaWQge1xuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRxXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZXFcbiAgICB9KVxuICAgIHRoaXMucmVuZGVyTGFiZWxzKGZhbHNlKVxuICB9XG5cbiAgLy8gUG9pbnQgdHJhbmZvcm1hdGlvbnMgb2YgYWxsIHBvaW50c1xuXG4gIGdldCBhbGxwb2ludHMgKCkgOiBQb2ludFtdIHtcbiAgICByZXR1cm4gW11cbiAgfVxuXG4gIHNjYWxlIChzZiA6IG51bWJlcikgOiB2b2lkIHtcbiAgICB0aGlzLmFsbHBvaW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICBwLnNjYWxlKHNmKVxuICAgIH0pXG4gIH1cblxuICByb3RhdGUgKGFuZ2xlIDogbnVtYmVyKSA6IG51bWJlciB7XG4gICAgdGhpcy5hbGxwb2ludHMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgcC5yb3RhdGUoYW5nbGUpXG4gICAgfSlcbiAgICByZXR1cm4gYW5nbGVcbiAgfVxuXG4gIHRyYW5zbGF0ZSAoeCA6IG51bWJlciwgeSA6IG51bWJlcikgOiB2b2lkIHtcbiAgICB0aGlzLmFsbHBvaW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICBwLnRyYW5zbGF0ZSh4LCB5KVxuICAgIH0pXG4gIH1cblxuICByYW5kb21Sb3RhdGUgKCkgOiBudW1iZXIge1xuICAgIGNvbnN0IGFuZ2xlID0gMiAqIE1hdGguUEkgKiBNYXRoLnJhbmRvbSgpXG4gICAgdGhpcy5yb3RhdGUoYW5nbGUpXG4gICAgcmV0dXJuIGFuZ2xlXG4gIH1cblxuICAvKipcbiAgICogU2NhbGVzIGFsbCB0aGUgcG9pbnRzIHRvIHdpdGhpbiBhIGdpdmVuIHdpZHRoIGFuZCBoZWlnaHQsIGNlbnRlcmluZyB0aGUgcmVzdWx0LiBSZXR1cm5zIHRoZSBzY2FsZSBmYWN0b3JcbiAgICogQHBhcmFtIHdpZHRoIFRoZSB3aWR0aCBvZiB0aGUgYm91bmRpbmcgcmVjdGFuZ2xlIHRvIHNjYWxlIHRvXG4gICAqIEBwYXJhbSBoZWlnaHQgVGhlIGhlaWdodCBvZiB0aGUgYm91bmRpbmcgcmVjdGFuZ2xlIHRvIHNjYWxlIHRvXG4gICAqIEBwYXJhbSBtYXJnaW4gTWFyZ2luIHRvIGxlYXZlIG91dHNpZGUgdGhlIHJlY3RhbmdsZVxuICAgKiBAcmV0dXJuc1xuICAgKi9cbiAgc2NhbGVUb0ZpdCAod2lkdGggOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBtYXJnaW4gOiBudW1iZXIpIDogbnVtYmVyIHtcbiAgICBsZXQgdG9wTGVmdCA6IFBvaW50ID0gUG9pbnQubWluKHRoaXMuYWxscG9pbnRzKVxuICAgIGxldCBib3R0b21SaWdodCA6IFBvaW50ID0gUG9pbnQubWF4KHRoaXMuYWxscG9pbnRzKVxuICAgIGNvbnN0IHRvdGFsV2lkdGggOiBudW1iZXIgPSBib3R0b21SaWdodC54IC0gdG9wTGVmdC54XG4gICAgY29uc3QgdG90YWxIZWlnaHQgOiBudW1iZXIgPSBib3R0b21SaWdodC55IC0gdG9wTGVmdC55XG4gICAgY29uc3Qgc2YgPSBNYXRoLm1pbigod2lkdGggLSBtYXJnaW4pIC8gdG90YWxXaWR0aCwgKGhlaWdodCAtIG1hcmdpbikgLyB0b3RhbEhlaWdodClcbiAgICB0aGlzLnNjYWxlKHNmKVxuXG4gICAgLy8gY2VudHJlXG4gICAgdG9wTGVmdCA9IFBvaW50Lm1pbih0aGlzLmFsbHBvaW50cylcbiAgICBib3R0b21SaWdodCA9IFBvaW50Lm1heCh0aGlzLmFsbHBvaW50cylcbiAgICBjb25zdCBjZW50ZXIgPSBQb2ludC5tZWFuKHRvcExlZnQsIGJvdHRvbVJpZ2h0KVxuICAgIHRoaXMudHJhbnNsYXRlKHdpZHRoIC8gMiAtIGNlbnRlci54LCBoZWlnaHQgLyAyIC0gY2VudGVyLnkpIC8vIGNlbnRyZVxuXG4gICAgcmV0dXJuIHNmXG4gIH1cbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEdyYXBoaWNRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBkYXRhOiBHcmFwaGljUURhdGFcbiAgdmlldzogR3JhcGhpY1FWaWV3XG5cbiAgY29uc3RydWN0b3IgKCkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgIHN1cGVyKCkgLy8gdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gICAgZGVsZXRlICh0aGlzLkRPTSkgLy8gZ29pbmcgdG8gb3ZlcnJpZGUgZ2V0RE9NIHVzaW5nIHRoZSB2aWV3J3MgRE9NXG5cbiAgICAvKiBUaGVzZSBhcmUgZ3VhcmFudGVlZCB0byBiZSBvdmVycmlkZGVuLCBzbyBubyBwb2ludCBpbml0aWFsaXppbmcgaGVyZVxuICAgICAqXG4gICAgICogIHRoaXMuZGF0YSA9IG5ldyBHcmFwaGljUURhdGEob3B0aW9ucylcbiAgICAgKiAgdGhpcy52aWV3ID0gbmV3IEdyYXBoaWNRVmlldyh0aGlzLmRhdGEsIG9wdGlvbnMpXG4gICAgICpcbiAgICAgKi9cbiAgfVxuXG4gIC8qIE5lZWQgdG8gcmVmYWN0b3Igc3ViY2xhc3NlcyB0byBkbyB0aGlzOlxuICAgKiBjb25zdHJ1Y3RvciAoZGF0YSwgdmlldykge1xuICAgKiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAqICAgIHRoaXMudmlldyA9IHZpZXdcbiAgICogfVxuICAgKlxuICAgKiBzdGF0aWMgcmFuZG9tKG9wdGlvbnMpIHtcbiAgICogIC8vIGFuIGF0dGVtcHQgYXQgaGF2aW5nIGFic3RyYWN0IHN0YXRpYyBtZXRob2RzLCBhbGJlaXQgcnVudGltZSBlcnJvclxuICAgKiAgdGhyb3cgbmV3IEVycm9yKFwiYHJhbmRvbSgpYCBtdXN0IGJlIG92ZXJyaWRkZW4gaW4gc3ViY2xhc3MgXCIgKyB0aGlzLm5hbWUpXG4gICAqIH1cbiAgICpcbiAgICogdHlwaWNhbCBpbXBsZW1lbnRhdGlvbjpcbiAgICogc3RhdGljIHJhbmRvbShvcHRpb25zKSB7XG4gICAqICBjb25zdCBkYXRhID0gbmV3IERlcml2ZWRRRGF0YShvcHRpb25zKVxuICAgKiAgY29uc3QgdmlldyA9IG5ldyBEZXJpdmVkUVZpZXcob3B0aW9ucylcbiAgICogIHJldHVybiBuZXcgRGVyaXZlZFFEYXRhKGRhdGEsdmlldylcbiAgICogfVxuICAgKlxuICAgKi9cblxuICBnZXRET00gKCkgOiBIVE1MRWxlbWVudCB7IHJldHVybiB0aGlzLnZpZXcuZ2V0RE9NKCkgfVxuXG4gIHJlbmRlciAoKSA6IHZvaWQgeyB0aGlzLnZpZXcucmVuZGVyKCkgfVxuXG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICBzdXBlci5zaG93QW5zd2VyKClcbiAgICB0aGlzLnZpZXcuc2hvd0Fuc3dlcigpXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7XG4gICAgc3VwZXIuaGlkZUFuc3dlcigpXG4gICAgdGhpcy52aWV3LmhpZGVBbnN3ZXIoKVxuICB9XG59XG4iLCJpbXBvcnQgKiBhcyBjb21tb25qc0hlbHBlcnMgZnJvbSAnXHUwMDAwY29tbW9uanNIZWxwZXJzLmpzJ1xuXG52YXIgZnJhY3Rpb24gPSBjb21tb25qc0hlbHBlcnMuY3JlYXRlQ29tbW9uanNNb2R1bGUoZnVuY3Rpb24gKG1vZHVsZSwgZXhwb3J0cykge1xuLyoqXG4gKiBAbGljZW5zZSBGcmFjdGlvbi5qcyB2NC4wLjkgMDkvMDkvMjAxNVxuICogaHR0cDovL3d3dy54YXJnLm9yZy8yMDE0LzAzL3JhdGlvbmFsLW51bWJlcnMtaW4tamF2YXNjcmlwdC9cbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUsIFJvYmVydCBFaXNlbGUgKHJvYmVydEB4YXJnLm9yZylcbiAqIER1YWwgbGljZW5zZWQgdW5kZXIgdGhlIE1JVCBvciBHUEwgVmVyc2lvbiAyIGxpY2Vuc2VzLlxuICoqL1xuXG4gIC8qKlxuICpcbiAqIFRoaXMgY2xhc3Mgb2ZmZXJzIHRoZSBwb3NzaWJpbGl0eSB0byBjYWxjdWxhdGUgZnJhY3Rpb25zLlxuICogWW91IGNhbiBwYXNzIGEgZnJhY3Rpb24gaW4gZGlmZmVyZW50IGZvcm1hdHMuIEVpdGhlciBhcyBhcnJheSwgYXMgZG91YmxlLCBhcyBzdHJpbmcgb3IgYXMgYW4gaW50ZWdlci5cbiAqXG4gKiBBcnJheS9PYmplY3QgZm9ybVxuICogWyAwID0+IDxub21pbmF0b3I+LCAxID0+IDxkZW5vbWluYXRvcj4gXVxuICogWyBuID0+IDxub21pbmF0b3I+LCBkID0+IDxkZW5vbWluYXRvcj4gXVxuICpcbiAqIEludGVnZXIgZm9ybVxuICogLSBTaW5nbGUgaW50ZWdlciB2YWx1ZVxuICpcbiAqIERvdWJsZSBmb3JtXG4gKiAtIFNpbmdsZSBkb3VibGUgdmFsdWVcbiAqXG4gKiBTdHJpbmcgZm9ybVxuICogMTIzLjQ1NiAtIGEgc2ltcGxlIGRvdWJsZVxuICogMTIzLzQ1NiAtIGEgc3RyaW5nIGZyYWN0aW9uXG4gKiAxMjMuJzQ1NicgLSBhIGRvdWJsZSB3aXRoIHJlcGVhdGluZyBkZWNpbWFsIHBsYWNlc1xuICogMTIzLig0NTYpIC0gc3lub255bVxuICogMTIzLjQ1JzYnIC0gYSBkb3VibGUgd2l0aCByZXBlYXRpbmcgbGFzdCBwbGFjZVxuICogMTIzLjQ1KDYpIC0gc3lub255bVxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogdmFyIGYgPSBuZXcgRnJhY3Rpb24oXCI5LjQnMzEnXCIpO1xuICogZi5tdWwoWy00LCAzXSkuZGl2KDQuOSk7XG4gKlxuICovXG5cbiAgKGZ1bmN0aW9uIChyb290KSB7XG4gICAgJ3VzZSBzdHJpY3QnXG5cbiAgICAvLyBNYXhpbXVtIHNlYXJjaCBkZXB0aCBmb3IgY3ljbGljIHJhdGlvbmFsIG51bWJlcnMuIDIwMDAgc2hvdWxkIGJlIG1vcmUgdGhhbiBlbm91Z2guXG4gICAgLy8gRXhhbXBsZTogMS83ID0gMC4oMTQyODU3KSBoYXMgNiByZXBlYXRpbmcgZGVjaW1hbCBwbGFjZXMuXG4gICAgLy8gSWYgTUFYX0NZQ0xFX0xFTiBnZXRzIHJlZHVjZWQsIGxvbmcgY3ljbGVzIHdpbGwgbm90IGJlIGRldGVjdGVkIGFuZCB0b1N0cmluZygpIG9ubHkgZ2V0cyB0aGUgZmlyc3QgMTAgZGlnaXRzXG4gICAgdmFyIE1BWF9DWUNMRV9MRU4gPSAyMDAwXG5cbiAgICAvLyBQYXJzZWQgZGF0YSB0byBhdm9pZCBjYWxsaW5nIFwibmV3XCIgYWxsIHRoZSB0aW1lXG4gICAgdmFyIFAgPSB7XG4gICAgICBzOiAxLFxuICAgICAgbjogMCxcbiAgICAgIGQ6IDFcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVFcnJvciAobmFtZSkge1xuICAgICAgZnVuY3Rpb24gZXJyb3JDb25zdHJ1Y3RvciAoKSB7XG4gICAgICAgIHZhciB0ZW1wID0gRXJyb3IuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgICAgICB0ZW1wLm5hbWUgPSB0aGlzLm5hbWUgPSBuYW1lXG4gICAgICAgIHRoaXMuc3RhY2sgPSB0ZW1wLnN0YWNrXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IHRlbXAubWVzc2FnZVxuICAgICAgfVxuXG4gICAgICAvKipcbiAgICAgKiBFcnJvciBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgICBmdW5jdGlvbiBJbnRlcm1lZGlhdGVJbmhlcml0b3IgKCkge31cbiAgICAgIEludGVybWVkaWF0ZUluaGVyaXRvci5wcm90b3R5cGUgPSBFcnJvci5wcm90b3R5cGVcbiAgICAgIGVycm9yQ29uc3RydWN0b3IucHJvdG90eXBlID0gbmV3IEludGVybWVkaWF0ZUluaGVyaXRvcigpXG5cbiAgICAgIHJldHVybiBlcnJvckNvbnN0cnVjdG9yXG4gICAgfVxuXG4gICAgdmFyIERpdmlzaW9uQnlaZXJvID0gRnJhY3Rpb24uRGl2aXNpb25CeVplcm8gPSBjcmVhdGVFcnJvcignRGl2aXNpb25CeVplcm8nKVxuICAgIHZhciBJbnZhbGlkUGFyYW1ldGVyID0gRnJhY3Rpb24uSW52YWxpZFBhcmFtZXRlciA9IGNyZWF0ZUVycm9yKCdJbnZhbGlkUGFyYW1ldGVyJylcblxuICAgIGZ1bmN0aW9uIGFzc2lnbiAobiwgcykge1xuICAgICAgaWYgKGlzTmFOKG4gPSBwYXJzZUludChuLCAxMCkpKSB7XG4gICAgICAgIHRocm93SW52YWxpZFBhcmFtKClcbiAgICAgIH1cbiAgICAgIHJldHVybiBuICogc1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRocm93SW52YWxpZFBhcmFtICgpIHtcbiAgICAgIHRocm93IG5ldyBJbnZhbGlkUGFyYW1ldGVyKClcbiAgICB9XG5cbiAgICB2YXIgcGFyc2UgPSBmdW5jdGlvbiAocDEsIHAyKSB7XG4gICAgICB2YXIgbiA9IDA7IHZhciBkID0gMTsgdmFyIHMgPSAxXG4gICAgICB2YXIgdiA9IDA7IHZhciB3ID0gMDsgdmFyIHggPSAwOyB2YXIgeSA9IDE7IHZhciB6ID0gMVxuXG4gICAgICB2YXIgQSA9IDA7IHZhciBCID0gMVxuICAgICAgdmFyIEMgPSAxOyB2YXIgRCA9IDFcblxuICAgICAgdmFyIE4gPSAxMDAwMDAwMFxuICAgICAgdmFyIE1cblxuICAgICAgaWYgKHAxID09PSB1bmRlZmluZWQgfHwgcDEgPT09IG51bGwpIHtcbiAgICAgIC8qIHZvaWQgKi9cbiAgICAgIH0gZWxzZSBpZiAocDIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBuID0gcDFcbiAgICAgICAgZCA9IHAyXG4gICAgICAgIHMgPSBuICogZFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3dpdGNoICh0eXBlb2YgcDEpIHtcbiAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlmICgnZCcgaW4gcDEgJiYgJ24nIGluIHAxKSB7XG4gICAgICAgICAgICAgIG4gPSBwMS5uXG4gICAgICAgICAgICAgIGQgPSBwMS5kXG4gICAgICAgICAgICAgIGlmICgncycgaW4gcDEpIHsgbiAqPSBwMS5zIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoMCBpbiBwMSkge1xuICAgICAgICAgICAgICBuID0gcDFbMF1cbiAgICAgICAgICAgICAgaWYgKDEgaW4gcDEpIHsgZCA9IHAxWzFdIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93SW52YWxpZFBhcmFtKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHMgPSBuICogZFxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZiAocDEgPCAwKSB7XG4gICAgICAgICAgICAgIHMgPSBwMVxuICAgICAgICAgICAgICBwMSA9IC1wMVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocDEgJSAxID09PSAwKSB7XG4gICAgICAgICAgICAgIG4gPSBwMVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwMSA+IDApIHsgLy8gY2hlY2sgZm9yICE9IDAsIHNjYWxlIHdvdWxkIGJlY29tZSBOYU4gKGxvZygwKSksIHdoaWNoIGNvbnZlcmdlcyByZWFsbHkgc2xvd1xuICAgICAgICAgICAgICBpZiAocDEgPj0gMSkge1xuICAgICAgICAgICAgICAgIHogPSBNYXRoLnBvdygxMCwgTWF0aC5mbG9vcigxICsgTWF0aC5sb2cocDEpIC8gTWF0aC5MTjEwKSlcbiAgICAgICAgICAgICAgICBwMSAvPSB6XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAvLyBVc2luZyBGYXJleSBTZXF1ZW5jZXNcbiAgICAgICAgICAgICAgLy8gaHR0cDovL3d3dy5qb2huZGNvb2suY29tL2Jsb2cvMjAxMC8xMC8yMC9iZXN0LXJhdGlvbmFsLWFwcHJveGltYXRpb24vXG5cbiAgICAgICAgICAgICAgd2hpbGUgKEIgPD0gTiAmJiBEIDw9IE4pIHtcbiAgICAgICAgICAgICAgICBNID0gKEEgKyBDKSAvIChCICsgRClcblxuICAgICAgICAgICAgICAgIGlmIChwMSA9PT0gTSkge1xuICAgICAgICAgICAgICAgICAgaWYgKEIgKyBEIDw9IE4pIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IEEgKyBDXG4gICAgICAgICAgICAgICAgICAgIGQgPSBCICsgRFxuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChEID4gQikge1xuICAgICAgICAgICAgICAgICAgICBuID0gQ1xuICAgICAgICAgICAgICAgICAgICBkID0gRFxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IEFcbiAgICAgICAgICAgICAgICAgICAgZCA9IEJcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGlmIChwMSA+IE0pIHtcbiAgICAgICAgICAgICAgICAgICAgQSArPSBDXG4gICAgICAgICAgICAgICAgICAgIEIgKz0gRFxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgQyArPSBBXG4gICAgICAgICAgICAgICAgICAgIEQgKz0gQlxuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAoQiA+IE4pIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IENcbiAgICAgICAgICAgICAgICAgICAgZCA9IERcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBBXG4gICAgICAgICAgICAgICAgICAgIGQgPSBCXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG4gKj0gelxuICAgICAgICAgICAgfSBlbHNlIGlmIChpc05hTihwMSkgfHwgaXNOYU4ocDIpKSB7XG4gICAgICAgICAgICAgIGQgPSBuID0gTmFOXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIEIgPSBwMS5tYXRjaCgvXFxkK3wuL2cpXG5cbiAgICAgICAgICAgIGlmIChCID09PSBudWxsKSB7IHRocm93SW52YWxpZFBhcmFtKCkgfVxuXG4gICAgICAgICAgICBpZiAoQltBXSA9PT0gJy0nKSB7IC8vIENoZWNrIGZvciBtaW51cyBzaWduIGF0IHRoZSBiZWdpbm5pbmdcbiAgICAgICAgICAgICAgcyA9IC0xXG4gICAgICAgICAgICAgIEErK1xuICAgICAgICAgICAgfSBlbHNlIGlmIChCW0FdID09PSAnKycpIHsgLy8gQ2hlY2sgZm9yIHBsdXMgc2lnbiBhdCB0aGUgYmVnaW5uaW5nXG4gICAgICAgICAgICAgIEErK1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoQi5sZW5ndGggPT09IEEgKyAxKSB7IC8vIENoZWNrIGlmIGl0J3MganVzdCBhIHNpbXBsZSBudW1iZXIgXCIxMjM0XCJcbiAgICAgICAgICAgICAgdyA9IGFzc2lnbihCW0ErK10sIHMpXG4gICAgICAgICAgICB9IGVsc2UgaWYgKEJbQSArIDFdID09PSAnLicgfHwgQltBXSA9PT0gJy4nKSB7IC8vIENoZWNrIGlmIGl0J3MgYSBkZWNpbWFsIG51bWJlclxuICAgICAgICAgICAgICBpZiAoQltBXSAhPT0gJy4nKSB7IC8vIEhhbmRsZSAwLjUgYW5kIC41XG4gICAgICAgICAgICAgICAgdiA9IGFzc2lnbihCW0ErK10sIHMpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgQSsrXG5cbiAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGRlY2ltYWwgcGxhY2VzXG4gICAgICAgICAgICAgIGlmIChBICsgMSA9PT0gQi5sZW5ndGggfHwgQltBICsgMV0gPT09ICcoJyAmJiBCW0EgKyAzXSA9PT0gJyknIHx8IEJbQSArIDFdID09PSBcIidcIiAmJiBCW0EgKyAzXSA9PT0gXCInXCIpIHtcbiAgICAgICAgICAgICAgICB3ID0gYXNzaWduKEJbQV0sIHMpXG4gICAgICAgICAgICAgICAgeSA9IE1hdGgucG93KDEwLCBCW0FdLmxlbmd0aClcbiAgICAgICAgICAgICAgICBBKytcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIENoZWNrIGZvciByZXBlYXRpbmcgcGxhY2VzXG4gICAgICAgICAgICAgIGlmIChCW0FdID09PSAnKCcgJiYgQltBICsgMl0gPT09ICcpJyB8fCBCW0FdID09PSBcIidcIiAmJiBCW0EgKyAyXSA9PT0gXCInXCIpIHtcbiAgICAgICAgICAgICAgICB4ID0gYXNzaWduKEJbQSArIDFdLCBzKVxuICAgICAgICAgICAgICAgIHogPSBNYXRoLnBvdygxMCwgQltBICsgMV0ubGVuZ3RoKSAtIDFcbiAgICAgICAgICAgICAgICBBICs9IDNcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChCW0EgKyAxXSA9PT0gJy8nIHx8IEJbQSArIDFdID09PSAnOicpIHsgLy8gQ2hlY2sgZm9yIGEgc2ltcGxlIGZyYWN0aW9uIFwiMTIzLzQ1NlwiIG9yIFwiMTIzOjQ1NlwiXG4gICAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBXSwgcylcbiAgICAgICAgICAgICAgeSA9IGFzc2lnbihCW0EgKyAyXSwgMSlcbiAgICAgICAgICAgICAgQSArPSAzXG4gICAgICAgICAgICB9IGVsc2UgaWYgKEJbQSArIDNdID09PSAnLycgJiYgQltBICsgMV0gPT09ICcgJykgeyAvLyBDaGVjayBmb3IgYSBjb21wbGV4IGZyYWN0aW9uIFwiMTIzIDEvMlwiXG4gICAgICAgICAgICAgIHYgPSBhc3NpZ24oQltBXSwgcylcbiAgICAgICAgICAgICAgdyA9IGFzc2lnbihCW0EgKyAyXSwgcylcbiAgICAgICAgICAgICAgeSA9IGFzc2lnbihCW0EgKyA0XSwgMSlcbiAgICAgICAgICAgICAgQSArPSA1XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChCLmxlbmd0aCA8PSBBKSB7IC8vIENoZWNrIGZvciBtb3JlIHRva2VucyBvbiB0aGUgc3RhY2tcbiAgICAgICAgICAgICAgZCA9IHkgKiB6XG4gICAgICAgICAgICAgIHMgPSAvKiB2b2lkICovXG4gICAgICAgICAgICAgICAgICAgIG4gPSB4ICsgZCAqIHYgKyB6ICogd1xuICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgLyogRmFsbCB0aHJvdWdoIG9uIGVycm9yICovXG4gICAgICAgICAgfVxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvd0ludmFsaWRQYXJhbSgpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGQgPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IERpdmlzaW9uQnlaZXJvKClcbiAgICAgIH1cblxuICAgICAgUC5zID0gcyA8IDAgPyAtMSA6IDFcbiAgICAgIFAubiA9IE1hdGguYWJzKG4pXG4gICAgICBQLmQgPSBNYXRoLmFicyhkKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vZHBvdyAoYiwgZSwgbSkge1xuICAgICAgdmFyIHIgPSAxXG4gICAgICBmb3IgKDsgZSA+IDA7IGIgPSAoYiAqIGIpICUgbSwgZSA+Pj0gMSkge1xuICAgICAgICBpZiAoZSAmIDEpIHtcbiAgICAgICAgICByID0gKHIgKiBiKSAlIG1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjeWNsZUxlbiAobiwgZCkge1xuICAgICAgZm9yICg7IGQgJSAyID09PSAwO1xuICAgICAgICBkIC89IDIpIHtcbiAgICAgIH1cblxuICAgICAgZm9yICg7IGQgJSA1ID09PSAwO1xuICAgICAgICBkIC89IDUpIHtcbiAgICAgIH1cblxuICAgICAgaWYgKGQgPT09IDEpIC8vIENhdGNoIG5vbi1jeWNsaWMgbnVtYmVyc1xuICAgICAgeyByZXR1cm4gMCB9XG5cbiAgICAgIC8vIElmIHdlIHdvdWxkIGxpa2UgdG8gY29tcHV0ZSByZWFsbHkgbGFyZ2UgbnVtYmVycyBxdWlja2VyLCB3ZSBjb3VsZCBtYWtlIHVzZSBvZiBGZXJtYXQncyBsaXR0bGUgdGhlb3JlbTpcbiAgICAgIC8vIDEwXihkLTEpICUgZCA9PSAxXG4gICAgICAvLyBIb3dldmVyLCB3ZSBkb24ndCBuZWVkIHN1Y2ggbGFyZ2UgbnVtYmVycyBhbmQgTUFYX0NZQ0xFX0xFTiBzaG91bGQgYmUgdGhlIGNhcHN0b25lLFxuICAgICAgLy8gYXMgd2Ugd2FudCB0byB0cmFuc2xhdGUgdGhlIG51bWJlcnMgdG8gc3RyaW5ncy5cblxuICAgICAgdmFyIHJlbSA9IDEwICUgZFxuICAgICAgdmFyIHQgPSAxXG5cbiAgICAgIGZvciAoOyByZW0gIT09IDE7IHQrKykge1xuICAgICAgICByZW0gPSByZW0gKiAxMCAlIGRcblxuICAgICAgICBpZiAodCA+IE1BWF9DWUNMRV9MRU4pIHsgcmV0dXJuIDAgfSAvLyBSZXR1cm5pbmcgMCBoZXJlIG1lYW5zIHRoYXQgd2UgZG9uJ3QgcHJpbnQgaXQgYXMgYSBjeWNsaWMgbnVtYmVyLiBJdCdzIGxpa2VseSB0aGF0IHRoZSBhbnN3ZXIgaXMgYGQtMWBcbiAgICAgIH1cbiAgICAgIHJldHVybiB0XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3ljbGVTdGFydCAobiwgZCwgbGVuKSB7XG4gICAgICB2YXIgcmVtMSA9IDFcbiAgICAgIHZhciByZW0yID0gbW9kcG93KDEwLCBsZW4sIGQpXG5cbiAgICAgIGZvciAodmFyIHQgPSAwOyB0IDwgMzAwOyB0KyspIHsgLy8gcyA8IH5sb2cxMChOdW1iZXIuTUFYX1ZBTFVFKVxuICAgICAgLy8gU29sdmUgMTBecyA9PSAxMF4ocyt0KSAobW9kIGQpXG5cbiAgICAgICAgaWYgKHJlbTEgPT09IHJlbTIpIHsgcmV0dXJuIHQgfVxuXG4gICAgICAgIHJlbTEgPSByZW0xICogMTAgJSBkXG4gICAgICAgIHJlbTIgPSByZW0yICogMTAgJSBkXG4gICAgICB9XG4gICAgICByZXR1cm4gMFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdjZCAoYSwgYikge1xuICAgICAgaWYgKCFhKSB7IHJldHVybiBiIH1cbiAgICAgIGlmICghYikgeyByZXR1cm4gYSB9XG5cbiAgICAgIHdoaWxlICgxKSB7XG4gICAgICAgIGEgJT0gYlxuICAgICAgICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICAgICAgICBiICU9IGFcbiAgICAgICAgaWYgKCFiKSB7IHJldHVybiBhIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAqIE1vZHVsZSBjb25zdHJ1Y3RvclxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtudW1iZXJ8RnJhY3Rpb249fSBhXG4gICAqIEBwYXJhbSB7bnVtYmVyPX0gYlxuICAgKi9cbiAgICBmdW5jdGlvbiBGcmFjdGlvbiAoYSwgYikge1xuICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZyYWN0aW9uKSkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKGEsIGIpXG4gICAgICB9XG5cbiAgICAgIHBhcnNlKGEsIGIpXG5cbiAgICAgIGlmIChGcmFjdGlvbi5SRURVQ0UpIHtcbiAgICAgICAgYSA9IGdjZChQLmQsIFAubikgLy8gQWJ1c2UgYVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYSA9IDFcbiAgICAgIH1cblxuICAgICAgdGhpcy5zID0gUC5zXG4gICAgICB0aGlzLm4gPSBQLm4gLyBhXG4gICAgICB0aGlzLmQgPSBQLmQgLyBhXG4gICAgfVxuXG4gICAgLyoqXG4gICAqIEJvb2xlYW4gZ2xvYmFsIHZhcmlhYmxlIHRvIGJlIGFibGUgdG8gZGlzYWJsZSBhdXRvbWF0aWMgcmVkdWN0aW9uIG9mIHRoZSBmcmFjdGlvblxuICAgKlxuICAgKi9cbiAgICBGcmFjdGlvbi5SRURVQ0UgPSAxXG5cbiAgICBGcmFjdGlvbi5wcm90b3R5cGUgPSB7XG5cbiAgICAgIHM6IDEsXG4gICAgICBuOiAwLFxuICAgICAgZDogMSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgYWJzb2x1dGUgdmFsdWVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oLTQpLmFicygpID0+IDRcbiAgICAgKiovXG4gICAgICBhYnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzLm4sIHRoaXMuZClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIEludmVydHMgdGhlIHNpZ24gb2YgdGhlIGN1cnJlbnQgZnJhY3Rpb25cbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oLTQpLm5lZygpID0+IDRcbiAgICAgKiovXG4gICAgICBuZWc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbigtdGhpcy5zICogdGhpcy5uLCB0aGlzLmQpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBBZGRzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKHtuOiAyLCBkOiAzfSkuYWRkKFwiMTQuOVwiKSA9PiA0NjcgLyAzMFxuICAgICAqKi9cbiAgICAgIGFkZDogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICB0aGlzLnMgKiB0aGlzLm4gKiBQLmQgKyBQLnMgKiB0aGlzLmQgKiBQLm4sXG4gICAgICAgICAgdGhpcy5kICogUC5kXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFN1YnRyYWN0cyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbih7bjogMiwgZDogM30pLmFkZChcIjE0LjlcIikgPT4gLTQyNyAvIDMwXG4gICAgICoqL1xuICAgICAgc3ViOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIHRoaXMubiAqIFAuZCAtIFAucyAqIHRoaXMuZCAqIFAubixcbiAgICAgICAgICB0aGlzLmQgKiBQLmRcbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogTXVsdGlwbGllcyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIi0xNy4oMzQ1KVwiKS5tdWwoMykgPT4gNTc3NiAvIDExMVxuICAgICAqKi9cbiAgICAgIG11bDogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICB0aGlzLnMgKiBQLnMgKiB0aGlzLm4gKiBQLm4sXG4gICAgICAgICAgdGhpcy5kICogUC5kXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIERpdmlkZXMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCItMTcuKDM0NSlcIikuaW52ZXJzZSgpLmRpdigzKVxuICAgICAqKi9cbiAgICAgIGRpdjogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICB0aGlzLnMgKiBQLnMgKiB0aGlzLm4gKiBQLmQsXG4gICAgICAgICAgdGhpcy5kICogUC5uXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENsb25lcyB0aGUgYWN0dWFsIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIi0xNy4oMzQ1KVwiKS5jbG9uZSgpXG4gICAgICoqL1xuICAgICAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgbW9kdWxvIG9mIHR3byByYXRpb25hbCBudW1iZXJzIC0gYSBtb3JlIHByZWNpc2UgZm1vZFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5tb2QoWzcsIDhdKSA9PiAoMTMvMykgJSAoNy84KSA9ICg1LzYpXG4gICAgICoqL1xuICAgICAgbW9kOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzLnMgKiB0aGlzLm4gJSB0aGlzLmQsIDEpXG4gICAgICAgIH1cblxuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICBpZiAoUC5uID09PSAwICYmIHRoaXMuZCA9PT0gMCkge1xuICAgICAgICAgIEZyYWN0aW9uKDAsIDApIC8vIFRocm93IERpdmlzaW9uQnlaZXJvXG4gICAgICAgIH1cblxuICAgICAgICAvKlxuICAgICAgICogRmlyc3Qgc2lsbHkgYXR0ZW1wdCwga2luZGEgc2xvd1xuICAgICAgICpcbiAgICAgICByZXR1cm4gdGhhdFtcInN1YlwiXSh7XG4gICAgICAgXCJuXCI6IG51bVtcIm5cIl0gKiBNYXRoLmZsb29yKCh0aGlzLm4gLyB0aGlzLmQpIC8gKG51bS5uIC8gbnVtLmQpKSxcbiAgICAgICBcImRcIjogbnVtW1wiZFwiXSxcbiAgICAgICBcInNcIjogdGhpc1tcInNcIl1cbiAgICAgICB9KTsgKi9cblxuICAgICAgICAvKlxuICAgICAgICogTmV3IGF0dGVtcHQ6IGExIC8gYjEgPSBhMiAvIGIyICogcSArIHJcbiAgICAgICAqID0+IGIyICogYTEgPSBhMiAqIGIxICogcSArIGIxICogYjIgKiByXG4gICAgICAgKiA9PiAoYjIgKiBhMSAlIGEyICogYjEpIC8gKGIxICogYjIpXG4gICAgICAgKi9cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICB0aGlzLnMgKiAoUC5kICogdGhpcy5uKSAlIChQLm4gKiB0aGlzLmQpLFxuICAgICAgICAgIFAuZCAqIHRoaXMuZFxuICAgICAgICApXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmcmFjdGlvbmFsIGdjZCBvZiB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbig1LDgpLmdjZCgzLDcpID0+IDEvNTZcbiAgICAgKi9cbiAgICAgIGdjZDogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcblxuICAgICAgICAvLyBnY2QoYSAvIGIsIGMgLyBkKSA9IGdjZChhLCBjKSAvIGxjbShiLCBkKVxuXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oZ2NkKFAubiwgdGhpcy5uKSAqIGdjZChQLmQsIHRoaXMuZCksIFAuZCAqIHRoaXMuZClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZyYWN0aW9uYWwgbGNtIG9mIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDUsOCkubGNtKDMsNykgPT4gMTVcbiAgICAgKi9cbiAgICAgIGxjbTogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcblxuICAgICAgICAvLyBsY20oYSAvIGIsIGMgLyBkKSA9IGxjbShhLCBjKSAvIGdjZChiLCBkKVxuXG4gICAgICAgIGlmIChQLm4gPT09IDAgJiYgdGhpcy5uID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbigpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihQLm4gKiB0aGlzLm4sIGdjZChQLm4sIHRoaXMubikgKiBnY2QoUC5kLCB0aGlzLmQpKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgY2VpbCBvZiBhIHJhdGlvbmFsIG51bWJlclxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5jZWlsKCkgPT4gKDUgLyAxKVxuICAgICAqKi9cbiAgICAgIGNlaWw6IGZ1bmN0aW9uIChwbGFjZXMpIHtcbiAgICAgICAgcGxhY2VzID0gTWF0aC5wb3coMTAsIHBsYWNlcyB8fCAwKVxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGguY2VpbChwbGFjZXMgKiB0aGlzLnMgKiB0aGlzLm4gLyB0aGlzLmQpLCBwbGFjZXMpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmbG9vciBvZiBhIHJhdGlvbmFsIG51bWJlclxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5mbG9vcigpID0+ICg0IC8gMSlcbiAgICAgKiovXG4gICAgICBmbG9vcjogZnVuY3Rpb24gKHBsYWNlcykge1xuICAgICAgICBwbGFjZXMgPSBNYXRoLnBvdygxMCwgcGxhY2VzIHx8IDApXG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5mbG9vcihwbGFjZXMgKiB0aGlzLnMgKiB0aGlzLm4gLyB0aGlzLmQpLCBwbGFjZXMpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBSb3VuZHMgYSByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLnJvdW5kKCkgPT4gKDQgLyAxKVxuICAgICAqKi9cbiAgICAgIHJvdW5kOiBmdW5jdGlvbiAocGxhY2VzKSB7XG4gICAgICAgIHBsYWNlcyA9IE1hdGgucG93KDEwLCBwbGFjZXMgfHwgMClcblxuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLnJvdW5kKHBsYWNlcyAqIHRoaXMucyAqIHRoaXMubiAvIHRoaXMuZCksIHBsYWNlcylcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGludmVyc2Ugb2YgdGhlIGZyYWN0aW9uLCBtZWFucyBudW1lcmF0b3IgYW5kIGRlbnVtZXJhdG9yIGFyZSBleGNoYW5nZWRcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oWy0zLCA0XSkuaW52ZXJzZSgpID0+IC00IC8gM1xuICAgICAqKi9cbiAgICAgIGludmVyc2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzLnMgKiB0aGlzLmQsIHRoaXMubilcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZyYWN0aW9uIHRvIHNvbWUgaW50ZWdlciBleHBvbmVudFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigtMSwyKS5wb3coLTMpID0+IC04XG4gICAgICovXG4gICAgICBwb3c6IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIGlmIChtIDwgMCkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5wb3codGhpcy5zICogdGhpcy5kLCAtbSksIE1hdGgucG93KHRoaXMubiwgLW0pKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5wb3codGhpcy5zICogdGhpcy5uLCBtKSwgTWF0aC5wb3codGhpcy5kLCBtKSlcbiAgICAgICAgfVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdHdvIHJhdGlvbmFsIG51bWJlcnMgYXJlIHRoZSBzYW1lXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDE5LjYpLmVxdWFscyhbOTgsIDVdKTtcbiAgICAgKiovXG4gICAgICBlcXVhbHM6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiB0aGlzLnMgKiB0aGlzLm4gKiBQLmQgPT09IFAucyAqIFAubiAqIHRoaXMuZCAvLyBTYW1lIGFzIGNvbXBhcmUoKSA9PT0gMFxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdHdvIHJhdGlvbmFsIG51bWJlcnMgYXJlIHRoZSBzYW1lXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDE5LjYpLmVxdWFscyhbOTgsIDVdKTtcbiAgICAgKiovXG4gICAgICBjb21wYXJlOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICB2YXIgdCA9ICh0aGlzLnMgKiB0aGlzLm4gKiBQLmQgLSBQLnMgKiBQLm4gKiB0aGlzLmQpXG4gICAgICAgIHJldHVybiAodCA+IDApIC0gKHQgPCAwKVxuICAgICAgfSxcblxuICAgICAgc2ltcGxpZnk6IGZ1bmN0aW9uIChlcHMpIHtcbiAgICAgIC8vIEZpcnN0IG5haXZlIGltcGxlbWVudGF0aW9uLCBuZWVkcyBpbXByb3ZlbWVudFxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNvbnQgPSB0aGlzLmFicygpLnRvQ29udGludWVkKClcblxuICAgICAgICBlcHMgPSBlcHMgfHwgMC4wMDFcblxuICAgICAgICBmdW5jdGlvbiByZWMgKGEpIHtcbiAgICAgICAgICBpZiAoYS5sZW5ndGggPT09IDEpIHsgcmV0dXJuIG5ldyBGcmFjdGlvbihhWzBdKSB9XG4gICAgICAgICAgcmV0dXJuIHJlYyhhLnNsaWNlKDEpKS5pbnZlcnNlKCkuYWRkKGFbMF0pXG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbnQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB2YXIgdG1wID0gcmVjKGNvbnQuc2xpY2UoMCwgaSArIDEpKVxuICAgICAgICAgIGlmICh0bXAuc3ViKHRoaXMuYWJzKCkpLmFicygpLnZhbHVlT2YoKSA8IGVwcykge1xuICAgICAgICAgICAgcmV0dXJuIHRtcC5tdWwodGhpcy5zKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdHdvIHJhdGlvbmFsIG51bWJlcnMgYXJlIGRpdmlzaWJsZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigxOS42KS5kaXZpc2libGUoMS41KTtcbiAgICAgKi9cbiAgICAgIGRpdmlzaWJsZTogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuICEoIShQLm4gKiB0aGlzLmQpIHx8ICgodGhpcy5uICogUC5kKSAlIChQLm4gKiB0aGlzLmQpKSlcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBkZWNpbWFsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBmcmFjdGlvblxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEwMC4nOTE4MjMnXCIpLnZhbHVlT2YoKSA9PiAxMDAuOTE4MjM5MTgyMzkxODNcbiAgICAgKiovXG4gICAgICB2YWx1ZU9mOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnMgKiB0aGlzLm4gLyB0aGlzLmRcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBzdHJpbmctZnJhY3Rpb24gcmVwcmVzZW50YXRpb24gb2YgYSBGcmFjdGlvbiBvYmplY3RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxLiczJ1wiKS50b0ZyYWN0aW9uKCkgPT4gXCI0IDEvM1wiXG4gICAgICoqL1xuICAgICAgdG9GcmFjdGlvbjogZnVuY3Rpb24gKGV4Y2x1ZGVXaG9sZSkge1xuICAgICAgICB2YXIgd2hvbGU7IHZhciBzdHIgPSAnJ1xuICAgICAgICB2YXIgbiA9IHRoaXMublxuICAgICAgICB2YXIgZCA9IHRoaXMuZFxuICAgICAgICBpZiAodGhpcy5zIDwgMCkge1xuICAgICAgICAgIHN0ciArPSAnLSdcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkID09PSAxKSB7XG4gICAgICAgICAgc3RyICs9IG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZXhjbHVkZVdob2xlICYmICh3aG9sZSA9IE1hdGguZmxvb3IobiAvIGQpKSA+IDApIHtcbiAgICAgICAgICAgIHN0ciArPSB3aG9sZVxuICAgICAgICAgICAgc3RyICs9ICcgJ1xuICAgICAgICAgICAgbiAlPSBkXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc3RyICs9IG5cbiAgICAgICAgICBzdHIgKz0gJy8nXG4gICAgICAgICAgc3RyICs9IGRcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RyXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgbGF0ZXggcmVwcmVzZW50YXRpb24gb2YgYSBGcmFjdGlvbiBvYmplY3RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxLiczJ1wiKS50b0xhdGV4KCkgPT4gXCJcXGZyYWN7NH17M31cIlxuICAgICAqKi9cbiAgICAgIHRvTGF0ZXg6IGZ1bmN0aW9uIChleGNsdWRlV2hvbGUpIHtcbiAgICAgICAgdmFyIHdob2xlOyB2YXIgc3RyID0gJydcbiAgICAgICAgdmFyIG4gPSB0aGlzLm5cbiAgICAgICAgdmFyIGQgPSB0aGlzLmRcbiAgICAgICAgaWYgKHRoaXMucyA8IDApIHtcbiAgICAgICAgICBzdHIgKz0gJy0nXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZCA9PT0gMSkge1xuICAgICAgICAgIHN0ciArPSBuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGV4Y2x1ZGVXaG9sZSAmJiAod2hvbGUgPSBNYXRoLmZsb29yKG4gLyBkKSkgPiAwKSB7XG4gICAgICAgICAgICBzdHIgKz0gd2hvbGVcbiAgICAgICAgICAgIG4gJT0gZFxuICAgICAgICAgIH1cblxuICAgICAgICAgIHN0ciArPSAnXFxcXGZyYWN7J1xuICAgICAgICAgIHN0ciArPSBuXG4gICAgICAgICAgc3RyICs9ICd9eydcbiAgICAgICAgICBzdHIgKz0gZFxuICAgICAgICAgIHN0ciArPSAnfSdcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RyXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIGNvbnRpbnVlZCBmcmFjdGlvbiBlbGVtZW50c1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjcvOFwiKS50b0NvbnRpbnVlZCgpID0+IFswLDEsN11cbiAgICAgKi9cbiAgICAgIHRvQ29udGludWVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0XG4gICAgICAgIHZhciBhID0gdGhpcy5uXG4gICAgICAgIHZhciBiID0gdGhpcy5kXG4gICAgICAgIHZhciByZXMgPSBbXVxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gcmVzXG4gICAgICAgIH1cblxuICAgICAgICBkbyB7XG4gICAgICAgICAgcmVzLnB1c2goTWF0aC5mbG9vcihhIC8gYikpXG4gICAgICAgICAgdCA9IGEgJSBiXG4gICAgICAgICAgYSA9IGJcbiAgICAgICAgICBiID0gdFxuICAgICAgICB9IHdoaWxlIChhICE9PSAxKVxuXG4gICAgICAgIHJldHVybiByZXNcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYSBmcmFjdGlvbiB3aXRoIGFsbCBkaWdpdHNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxMDAuJzkxODIzJ1wiKS50b1N0cmluZygpID0+IFwiMTAwLig5MTgyMylcIlxuICAgICAqKi9cbiAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoZGVjKSB7XG4gICAgICAgIHZhciBnXG4gICAgICAgIHZhciBOID0gdGhpcy5uXG4gICAgICAgIHZhciBEID0gdGhpcy5kXG5cbiAgICAgICAgaWYgKGlzTmFOKE4pIHx8IGlzTmFOKEQpKSB7XG4gICAgICAgICAgcmV0dXJuICdOYU4nXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIUZyYWN0aW9uLlJFRFVDRSkge1xuICAgICAgICAgIGcgPSBnY2QoTiwgRClcbiAgICAgICAgICBOIC89IGdcbiAgICAgICAgICBEIC89IGdcbiAgICAgICAgfVxuXG4gICAgICAgIGRlYyA9IGRlYyB8fCAxNSAvLyAxNSA9IGRlY2ltYWwgcGxhY2VzIHdoZW4gbm8gcmVwaXRhdGlvblxuXG4gICAgICAgIHZhciBjeWNMZW4gPSBjeWNsZUxlbihOLCBEKSAvLyBDeWNsZSBsZW5ndGhcbiAgICAgICAgdmFyIGN5Y09mZiA9IGN5Y2xlU3RhcnQoTiwgRCwgY3ljTGVuKSAvLyBDeWNsZSBzdGFydFxuXG4gICAgICAgIHZhciBzdHIgPSB0aGlzLnMgPT09IC0xID8gJy0nIDogJydcblxuICAgICAgICBzdHIgKz0gTiAvIEQgfCAwXG5cbiAgICAgICAgTiAlPSBEXG4gICAgICAgIE4gKj0gMTBcblxuICAgICAgICBpZiAoTikgeyBzdHIgKz0gJy4nIH1cblxuICAgICAgICBpZiAoY3ljTGVuKSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IGN5Y09mZjsgaS0tOykge1xuICAgICAgICAgICAgc3RyICs9IE4gLyBEIHwgMFxuICAgICAgICAgICAgTiAlPSBEXG4gICAgICAgICAgICBOICo9IDEwXG4gICAgICAgICAgfVxuICAgICAgICAgIHN0ciArPSAnKCdcbiAgICAgICAgICBmb3IgKHZhciBpID0gY3ljTGVuOyBpLS07KSB7XG4gICAgICAgICAgICBzdHIgKz0gTiAvIEQgfCAwXG4gICAgICAgICAgICBOICU9IERcbiAgICAgICAgICAgIE4gKj0gMTBcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RyICs9ICcpJ1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZvciAodmFyIGkgPSBkZWM7IE4gJiYgaS0tOykge1xuICAgICAgICAgICAgc3RyICs9IE4gLyBEIHwgMFxuICAgICAgICAgICAgTiAlPSBEXG4gICAgICAgICAgICBOICo9IDEwXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHJcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHVuZGVmaW5lZCA9PT0gJ2Z1bmN0aW9uJyAmJiB1bmRlZmluZWQuYW1kKSB7XG4gICAgICB1bmRlZmluZWQoW10sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIEZyYWN0aW9uXG4gICAgICB9KVxuICAgIH0gZWxzZSBpZiAoJ29iamVjdCcgPT09ICdvYmplY3QnKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pXG4gICAgICBGcmFjdGlvbi5kZWZhdWx0ID0gRnJhY3Rpb25cbiAgICAgIEZyYWN0aW9uLkZyYWN0aW9uID0gRnJhY3Rpb25cbiAgICAgIG1vZHVsZS5leHBvcnRzID0gRnJhY3Rpb25cbiAgICB9IGVsc2Uge1xuICAgICAgcm9vdC5GcmFjdGlvbiA9IEZyYWN0aW9uXG4gICAgfVxuICB9KShjb21tb25qc0hlbHBlcnMuY29tbW9uanNHbG9iYWwpXG59KVxuXG5leHBvcnQgZGVmYXVsdCAvKiBAX19QVVJFX18gKi9jb21tb25qc0hlbHBlcnMuZ2V0RGVmYXVsdEV4cG9ydEZyb21DanMoZnJhY3Rpb24pXG5leHBvcnQgeyBmcmFjdGlvbiBhcyBfX21vZHVsZUV4cG9ydHMgfVxuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgTW9ub21pYWwge1xuICBjb25zdHJ1Y3RvciAoYywgdnMpIHtcbiAgICBpZiAoIWlzTmFOKGMpICYmIHZzIGluc3RhbmNlb2YgTWFwKSB7XG4gICAgICB0aGlzLmMgPSBjXG4gICAgICB0aGlzLnZzID0gdnNcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBjID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5pbml0U3RyKGMpXG4gICAgfSBlbHNlIGlmICghaXNOYU4oYykpIHtcbiAgICAgIHRoaXMuYyA9IGNcbiAgICAgIHRoaXMudnMgPSBuZXcgTWFwKClcbiAgICB9IGVsc2UgeyAvLyBkZWZhdWx0IGFzIGEgdGVzdDogNHheMnlcbiAgICAgIHRoaXMuYyA9IDRcbiAgICAgIHRoaXMudnMgPSBuZXcgTWFwKFtbJ3gnLCAyXSwgWyd5JywgMV1dKVxuICAgIH1cbiAgfVxuXG4gIGNsb25lICgpIHtcbiAgICBjb25zdCB2cyA9IG5ldyBNYXAodGhpcy52cylcbiAgICByZXR1cm4gbmV3IE1vbm9taWFsKHRoaXMuYywgdnMpXG4gIH1cblxuICBtdWwgKHRoYXQpIHtcbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IE1vbm9taWFsKHRoYXQpXG4gICAgfVxuICAgIGNvbnN0IGMgPSB0aGlzLmMgKiB0aGF0LmNcbiAgICBsZXQgdnMgPSBuZXcgTWFwKClcbiAgICB0aGlzLnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKHRoYXQudnMuaGFzKHZhcmlhYmxlKSkge1xuICAgICAgICB2cy5zZXQodmFyaWFibGUsIHRoaXMudnMuZ2V0KHZhcmlhYmxlKSArIHRoYXQudnMuZ2V0KHZhcmlhYmxlKSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZzLnNldCh2YXJpYWJsZSwgdGhpcy52cy5nZXQodmFyaWFibGUpKVxuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGF0LnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKCF2cy5oYXModmFyaWFibGUpKSB7XG4gICAgICAgIHZzLnNldCh2YXJpYWJsZSwgdGhhdC52cy5nZXQodmFyaWFibGUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgdnMgPSBuZXcgTWFwKFsuLi52cy5lbnRyaWVzKCldLnNvcnQoKSlcbiAgICByZXR1cm4gbmV3IE1vbm9taWFsKGMsIHZzKVxuICB9XG5cbiAgdG9MYXRleCAoKSB7XG4gICAgaWYgKHRoaXMudnMuc2l6ZSA9PT0gMCkgcmV0dXJuIHRoaXMuYy50b1N0cmluZygpXG4gICAgbGV0IHN0ciA9IHRoaXMuYyA9PT0gMSA/ICcnXG4gICAgICA6IHRoaXMuYyA9PT0gLTEgPyAnLSdcbiAgICAgICAgOiB0aGlzLmMudG9TdHJpbmcoKVxuICAgIHRoaXMudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAoaW5kZXggPT09IDEpIHtcbiAgICAgICAgc3RyICs9IHZhcmlhYmxlXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgKz0gdmFyaWFibGUgKyAnXicgKyBpbmRleFxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIHN0clxuICB9XG5cbiAgc29ydCAoKSB7XG4gICAgLy8gc29ydHMgKG1vZGlmaWVzIG9iamVjdClcbiAgICB0aGlzLnZzID0gbmV3IE1hcChbLi4udGhpcy52cy5lbnRyaWVzKCldLnNvcnQoKSlcbiAgfVxuXG4gIGNsZWFuWmVyb3MgKCkge1xuICAgIHRoaXMudnMuZm9yRWFjaCgoaWR4LCB2KSA9PiB7XG4gICAgICBpZiAoaWR4ID09PSAwKSB0aGlzLnZzLmRlbGV0ZSh2KVxuICAgIH0pXG4gIH1cblxuICBsaWtlICh0aGF0KSB7XG4gICAgLy8gcmV0dXJuIHRydWUgaWYgbGlrZSB0ZXJtcywgZmFsc2UgaWYgb3RoZXJ3aXNlXG4gICAgLy8gbm90IHRoZSBtb3N0IGVmZmljaWVudCBhdCB0aGUgbW9tZW50LCBidXQgZ29vZCBlbm91Z2guXG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIE1vbm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBNb25vbWlhbCh0aGF0KVxuICAgIH1cblxuICAgIGxldCBsaWtlID0gdHJ1ZVxuICAgIHRoaXMudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAoIXRoYXQudnMuaGFzKHZhcmlhYmxlKSB8fCB0aGF0LnZzLmdldCh2YXJpYWJsZSkgIT09IGluZGV4KSB7XG4gICAgICAgIGxpa2UgPSBmYWxzZVxuICAgICAgfVxuICAgIH0pXG4gICAgdGhhdC52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICghdGhpcy52cy5oYXModmFyaWFibGUpIHx8IHRoaXMudnMuZ2V0KHZhcmlhYmxlKSAhPT0gaW5kZXgpIHtcbiAgICAgICAgbGlrZSA9IGZhbHNlXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gbGlrZVxuICB9XG5cbiAgYWRkICh0aGF0LCBjaGVja0xpa2UpIHtcbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IE1vbm9taWFsKHRoYXQpXG4gICAgfVxuICAgIC8vIGFkZHMgdHdvIGNvbXBhdGlibGUgbW9ub21pYWxzXG4gICAgLy8gY2hlY2tMaWtlIChkZWZhdWx0IHRydWUpIHdpbGwgY2hlY2sgZmlyc3QgaWYgdGhleSBhcmUgbGlrZSBhbmQgdGhyb3cgYW4gZXhjZXB0aW9uXG4gICAgLy8gdW5kZWZpbmVkIGJlaGF2aW91ciBpZiBjaGVja0xpa2UgaXMgZmFsc2VcbiAgICBpZiAoY2hlY2tMaWtlID09PSB1bmRlZmluZWQpIGNoZWNrTGlrZSA9IHRydWVcbiAgICBpZiAoY2hlY2tMaWtlICYmICF0aGlzLmxpa2UodGhhdCkpIHRocm93IG5ldyBFcnJvcignQWRkaW5nIHVubGlrZSB0ZXJtcycpXG4gICAgY29uc3QgYyA9IHRoaXMuYyArIHRoYXQuY1xuICAgIGNvbnN0IHZzID0gdGhpcy52c1xuICAgIHJldHVybiBuZXcgTW9ub21pYWwoYywgdnMpXG4gIH1cblxuICBpbml0U3RyIChzdHIpIHtcbiAgICAvLyBjdXJyZW50bHkgbm8gZXJyb3IgY2hlY2tpbmcgYW5kIGZyYWdpbGVcbiAgICAvLyBUaGluZ3Mgbm90IHRvIHBhc3MgaW46XG4gICAgLy8gIHplcm8gaW5kaWNlc1xuICAgIC8vICBtdWx0aS1jaGFyYWN0ZXIgdmFyaWFibGVzXG4gICAgLy8gIG5lZ2F0aXZlIGluZGljZXNcbiAgICAvLyAgbm9uLWludGVnZXIgY29lZmZpY2llbnRzXG4gICAgY29uc3QgbGVhZCA9IHN0ci5tYXRjaCgvXi0/XFxkKi8pWzBdXG4gICAgY29uc3QgYyA9IGxlYWQgPT09ICcnID8gMVxuICAgICAgOiBsZWFkID09PSAnLScgPyAtMVxuICAgICAgICA6IHBhcnNlSW50KGxlYWQpXG4gICAgbGV0IHZzID0gc3RyLm1hdGNoKC8oW2EtekEtWl0pKFxcXlxcZCspPy9nKVxuICAgIGlmICghdnMpIHZzID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCB2ID0gdnNbaV0uc3BsaXQoJ14nKVxuICAgICAgdlsxXSA9IHZbMV0gPyBwYXJzZUludCh2WzFdKSA6IDFcbiAgICAgIHZzW2ldID0gdlxuICAgIH1cbiAgICB2cyA9IHZzLmZpbHRlcih2ID0+IHZbMV0gIT09IDApXG4gICAgdGhpcy5jID0gY1xuICAgIHRoaXMudnMgPSBuZXcgTWFwKHZzKVxuICB9XG5cbiAgc3RhdGljIHZhciAodikge1xuICAgIC8vIGZhY3RvcnkgZm9yIGEgc2luZ2xlIHZhcmlhYmxlIG1vbm9taWFsXG4gICAgY29uc3QgYyA9IDFcbiAgICBjb25zdCB2cyA9IG5ldyBNYXAoW1t2LCAxXV0pXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbChjLCB2cylcbiAgfVxufVxuIiwiaW1wb3J0IE1vbm9taWFsIGZyb20gJ01vbm9taWFsJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQb2x5bm9taWFsIHtcbiAgY29uc3RydWN0b3IgKHRlcm1zKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGVybXMpICYmICh0ZXJtc1swXSBpbnN0YW5jZW9mIE1vbm9taWFsKSkge1xuICAgICAgdGVybXMubWFwKHQgPT4gdC5jbG9uZSgpKVxuICAgICAgdGhpcy50ZXJtcyA9IHRlcm1zXG4gICAgfSBlbHNlIGlmICghaXNOYU4odGVybXMpKSB7XG4gICAgICB0aGlzLmluaXROdW0odGVybXMpXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGVybXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmluaXRTdHIodGVybXMpXG4gICAgfVxuICB9XG5cbiAgaW5pdFN0ciAoc3RyKSB7XG4gICAgc3RyID0gc3RyLnJlcGxhY2UoL1xcKy0vZywgJy0nKSAvLyBhIGhvcnJpYmxlIGJvZGdlXG4gICAgc3RyID0gc3RyLnJlcGxhY2UoLy0vZywgJystJykgLy8gbWFrZSBuZWdhdGl2ZSB0ZXJtcyBleHBsaWNpdC5cbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvXFxzL2csICcnKSAvLyBzdHJpcCB3aGl0ZXNwYWNlXG4gICAgdGhpcy50ZXJtcyA9IHN0ci5zcGxpdCgnKycpXG4gICAgICAubWFwKHMgPT4gbmV3IE1vbm9taWFsKHMpKVxuICAgICAgLmZpbHRlcih0ID0+IHQuYyAhPT0gMClcbiAgfVxuXG4gIGluaXROdW0gKG4pIHtcbiAgICB0aGlzLnRlcm1zID0gW25ldyBNb25vbWlhbChuKV1cbiAgfVxuXG4gIHRvTGF0ZXggKCkge1xuICAgIGxldCBzdHIgPSAnJ1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50ZXJtcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGkgPiAwICYmIHRoaXMudGVybXNbaV0uYyA+PSAwKSB7XG4gICAgICAgIHN0ciArPSAnKydcbiAgICAgIH1cbiAgICAgIHN0ciArPSB0aGlzLnRlcm1zW2ldLnRvTGF0ZXgoKVxuICAgIH1cbiAgICByZXR1cm4gc3RyXG4gIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuIHRoaXMudG9MYVRlWCgpXG4gIH1cblxuICBjbG9uZSAoKSB7XG4gICAgY29uc3QgdGVybXMgPSB0aGlzLnRlcm1zLm1hcCh0ID0+IHQuY2xvbmUoKSlcbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwodGVybXMpXG4gIH1cblxuICBzaW1wbGlmeSAoKSB7XG4gICAgLy8gY29sbGVjdHMgbGlrZSB0ZXJtcyBhbmQgcmVtb3ZlcyB6ZXJvIHRlcm1zXG4gICAgLy8gZG9lcyBub3QgbW9kaWZ5IG9yaWdpbmFsXG4gICAgLy8gVGhpcyBzZWVtcyBwcm9iYWJseSBpbmVmZmljaWVudCwgZ2l2ZW4gdGhlIGRhdGEgc3RydWN0dXJlXG4gICAgLy8gV291bGQgYmUgYmV0dGVyIHRvIHVzZSBzb21ldGhpbmcgbGlrZSBhIGxpbmtlZCBsaXN0IG1heWJlP1xuICAgIGNvbnN0IHRlcm1zID0gdGhpcy50ZXJtcy5zbGljZSgpXG4gICAgbGV0IG5ld3Rlcm1zID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRlcm1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIXRlcm1zW2ldKSBjb250aW51ZVxuICAgICAgbGV0IG5ld3Rlcm0gPSB0ZXJtc1tpXVxuICAgICAgZm9yIChsZXQgaiA9IGkgKyAxOyBqIDwgdGVybXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKCF0ZXJtc1tqXSkgY29udGludWVcbiAgICAgICAgaWYgKHRlcm1zW2pdLmxpa2UodGVybXNbaV0pKSB7XG4gICAgICAgICAgbmV3dGVybSA9IG5ld3Rlcm0uYWRkKHRlcm1zW2pdKVxuICAgICAgICAgIHRlcm1zW2pdID0gbnVsbFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBuZXd0ZXJtcy5wdXNoKG5ld3Rlcm0pXG4gICAgICB0ZXJtc1tpXSA9IG51bGxcbiAgICB9XG4gICAgbmV3dGVybXMgPSBuZXd0ZXJtcy5maWx0ZXIodCA9PiB0LmMgIT09IDApXG4gICAgcmV0dXJuIG5ldyBQb2x5bm9taWFsKG5ld3Rlcm1zKVxuICB9XG5cbiAgYWRkICh0aGF0LCBzaW1wbGlmeSkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBQb2x5bm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBQb2x5bm9taWFsKHRoYXQpXG4gICAgfVxuICAgIGlmIChzaW1wbGlmeSA9PT0gdW5kZWZpbmVkKSBzaW1wbGlmeSA9IHRydWVcbiAgICBjb25zdCB0ZXJtcyA9IHRoaXMudGVybXMuY29uY2F0KHRoYXQudGVybXMpXG4gICAgbGV0IHJlc3VsdCA9IG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuXG4gICAgaWYgKHNpbXBsaWZ5KSByZXN1bHQgPSByZXN1bHQuc2ltcGxpZnkoKVxuXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG5cbiAgbXVsICh0aGF0LCBzaW1wbGlmeSkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBQb2x5bm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBQb2x5bm9taWFsKHRoYXQpXG4gICAgfVxuICAgIGNvbnN0IHRlcm1zID0gW11cbiAgICBpZiAoc2ltcGxpZnkgPT09IHVuZGVmaW5lZCkgc2ltcGxpZnkgPSB0cnVlXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRlcm1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHRoYXQudGVybXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdGVybXMucHVzaCh0aGlzLnRlcm1zW2ldLm11bCh0aGF0LnRlcm1zW2pdKSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgcmVzdWx0ID0gbmV3IFBvbHlub21pYWwodGVybXMpXG4gICAgaWYgKHNpbXBsaWZ5KSByZXN1bHQgPSByZXN1bHQuc2ltcGxpZnkoKVxuXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG5cbiAgcG93IChuLCBzaW1wbGlmeSkge1xuICAgIGxldCByZXN1bHQgPSB0aGlzXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBuOyBpKyspIHtcbiAgICAgIHJlc3VsdCA9IHJlc3VsdC5tdWwodGhpcylcbiAgICB9XG4gICAgaWYgKHNpbXBsaWZ5KSByZXN1bHQgPSByZXN1bHQuc2ltcGxpZnkoKVxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIHN0YXRpYyB2YXIgKHYpIHtcbiAgICAvLyBmYWN0b3J5IGZvciBhIHNpbmdsZSB2YXJpYWJsZSBwb2x5bm9taWFsXG4gICAgY29uc3QgdGVybXMgPSBbTW9ub21pYWwudmFyKHYpXVxuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbCh0ZXJtcylcbiAgfVxuXG4gIHN0YXRpYyB4ICgpIHtcbiAgICByZXR1cm4gUG9seW5vbWlhbC52YXIoJ3gnKVxuICB9XG5cbiAgc3RhdGljIGNvbnN0IChuKSB7XG4gICAgcmV0dXJuIG5ldyBQb2x5bm9taWFsKG4pXG4gIH1cbn1cbiIsImltcG9ydCB7IEdyYXBoaWNRLCBHcmFwaGljUVZpZXcgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCBGcmFjdGlvbiBmcm9tICd2ZW5kb3IvZnJhY3Rpb24nXG5pbXBvcnQgUG9seW5vbWlhbCBmcm9tICdQb2x5bm9taWFsJ1xuaW1wb3J0IHsgcmFuZEVsZW0sIHJhbmRCZXR3ZWVuLCByYW5kQmV0d2VlbkZpbHRlciwgZ2NkIH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBcml0aG1hZ29uUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKSAvLyBwcm9jZXNzZXMgb3B0aW9ucyBpbnRvIHRoaXMuc2V0dGluZ3NcbiAgICB0aGlzLmRhdGEgPSBuZXcgQXJpdGhtYWdvblFEYXRhKHRoaXMuc2V0dGluZ3MpXG4gICAgdGhpcy52aWV3ID0gbmV3IEFyaXRobWFnb25RVmlldyh0aGlzLmRhdGEsIHRoaXMuc2V0dGluZ3MpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHsgcmV0dXJuICdDb21wbGV0ZSB0aGUgYXJpdGhtYWdvbjonIH1cbn1cblxuQXJpdGhtYWdvblEub3B0aW9uc1NwZWMgPSBbXG4gIHtcbiAgICB0aXRsZTogJ1ZlcnRpY2VzJyxcbiAgICBpZDogJ24nLFxuICAgIHR5cGU6ICdpbnQnLFxuICAgIG1pbjogMyxcbiAgICBtYXg6IDIwLFxuICAgIGRlZmF1bHQ6IDNcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVHlwZScsXG4gICAgaWQ6ICd0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ0ludGVnZXIgKCspJywgaWQ6ICdpbnRlZ2VyLWFkZCcgfSxcbiAgICAgIHsgdGl0bGU6ICdJbnRlZ2VyIChcXHUwMGQ3KScsIGlkOiAnaW50ZWdlci1tdWx0aXBseScgfSxcbiAgICAgIHsgdGl0bGU6ICdGcmFjdGlvbiAoKyknLCBpZDogJ2ZyYWN0aW9uLWFkZCcgfSxcbiAgICAgIHsgdGl0bGU6ICdGcmFjdGlvbiAoXFx1MDBkNyknLCBpZDogJ2ZyYWN0aW9uLW11bHRpcGx5JyB9LFxuICAgICAgeyB0aXRsZTogJ0FsZ2VicmEgKCspJywgaWQ6ICdhbGdlYnJhLWFkZCcgfSxcbiAgICAgIHsgdGl0bGU6ICdBbGdlYnJhIChcXHUwMGQ3KScsIGlkOiAnYWxnZWJyYS1tdWx0aXBseScgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogJ2ludGVnZXItYWRkJyxcbiAgICB2ZXJ0aWNhbDogdHJ1ZVxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdQdXp6bGUgdHlwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1leGNsdXNpdmUnLFxuICAgIGlkOiAncHV6X2RpZmYnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdNaXNzaW5nIGVkZ2VzJywgaWQ6ICcxJyB9LFxuICAgICAgeyB0aXRsZTogJ01peGVkJywgaWQ6ICcyJyB9LFxuICAgICAgeyB0aXRsZTogJ01pc3NpbmcgdmVydGljZXMnLCBpZDogJzMnIH1cbiAgICBdLFxuICAgIGRlZmF1bHQ6ICcxJ1xuICB9XG5dXG5cbmNsYXNzIEFyaXRobWFnb25RRGF0YSAvKiBleHRlbmRzIEdyYXBoaWNRRGF0YSAqLyB7XG4gIC8vIFRPRE8gc2ltcGxpZnkgY29uc3RydWN0b3IuIE1vdmUgbG9naWMgaW50byBzdGF0aWMgZmFjdG9yeSBtZXRob2RzXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgLy8gMS4gU2V0IHByb3BlcnRpZXMgZnJvbSBvcHRpb25zXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBuOiAzLCAvLyBudW1iZXIgb2YgdmVydGljZXNcbiAgICAgIG1pbjogLTIwLFxuICAgICAgbWF4OiAyMCxcbiAgICAgIG51bV9kaWZmOiAxLCAvLyBjb21wbGV4aXR5IG9mIHdoYXQncyBpbiB2ZXJ0aWNlcy9lZGdlc1xuICAgICAgcHV6X2RpZmY6IDEsIC8vIDEgLSBWZXJ0aWNlcyBnaXZlbiwgMiAtIHZlcnRpY2VzL2VkZ2VzOyBnaXZlbiAzIC0gb25seSBlZGdlc1xuICAgICAgdHlwZTogJ2ludGVnZXItYWRkJyAvLyBbdHlwZV0tW29wZXJhdGlvbl0gd2hlcmUgW3R5cGVdID0gaW50ZWdlciwgLi4uXG4gICAgICAvLyBhbmQgW29wZXJhdGlvbl0gPSBhZGQvbXVsdGlwbHlcbiAgICB9XG5cbiAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIHRoaXMuc2V0dGluZ3MsIG9wdGlvbnMpXG4gICAgdGhpcy5zZXR0aW5ncy5udW1fZGlmZiA9IHRoaXMuc2V0dGluZ3MuZGlmZmljdWx0eVxuICAgIHRoaXMuc2V0dGluZ3MucHV6X2RpZmYgPSBwYXJzZUludCh0aGlzLnNldHRpbmdzLnB1el9kaWZmKSAvLyEgPyBUaGlzIHNob3VsZCBoYXZlIGJlZW4gZG9uZSB1cHN0cmVhbS4uLlxuXG4gICAgdGhpcy5uID0gdGhpcy5zZXR0aW5ncy5uXG4gICAgdGhpcy52ZXJ0aWNlcyA9IFtdXG4gICAgdGhpcy5zaWRlcyA9IFtdXG5cbiAgICBpZiAodGhpcy5zZXR0aW5ncy50eXBlLmVuZHNXaXRoKCdhZGQnKSkge1xuICAgICAgdGhpcy5vcG5hbWUgPSAnKydcbiAgICAgIHRoaXMub3AgPSAoeCwgeSkgPT4geC5hZGQoeSlcbiAgICB9IGVsc2UgaWYgKHRoaXMuc2V0dGluZ3MudHlwZS5lbmRzV2l0aCgnbXVsdGlwbHknKSkge1xuICAgICAgdGhpcy5vcG5hbWUgPSAnXFx1MDBkNydcbiAgICAgIHRoaXMub3AgPSAoeCwgeSkgPT4geC5tdWwoeSlcbiAgICB9XG5cbiAgICAvLyAyLiBJbml0aWFsaXNlIGJhc2VkIG9uIHR5cGVcbiAgICBzd2l0Y2ggKHRoaXMuc2V0dGluZ3MudHlwZSkge1xuICAgICAgY2FzZSAnaW50ZWdlci1hZGQnOlxuICAgICAgY2FzZSAnaW50ZWdlci1tdWx0aXBseSc6XG4gICAgICAgIHRoaXMuaW5pdEludGVnZXIodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2ZyYWN0aW9uLWFkZCc6XG4gICAgICAgIHRoaXMuaW5pdEZyYWN0aW9uQWRkKHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdmcmFjdGlvbi1tdWx0aXBseSc6XG4gICAgICAgIHRoaXMuaW5pdEZyYWN0aW9uTXVsdGlwbHkodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2FsZ2VicmEtYWRkJzpcbiAgICAgICAgdGhpcy5pbml0QWxnZWJyYUFkZCh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnYWxnZWJyYS1tdWx0aXBseSc6XG4gICAgICAgIHRoaXMuaW5pdEFsZ2VicmFNdWx0aXBseSh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdGVkIHN3aXRjaCBkZWZhdWx0JylcbiAgICB9XG5cbiAgICB0aGlzLmNhbGN1bGF0ZUVkZ2VzKCkgLy8gVXNlIG9wIGZ1bmN0aW9ucyB0byBmaWxsIGluIHRoZSBlZGdlc1xuICAgIHRoaXMuaGlkZUxhYmVscyh0aGlzLnNldHRpbmdzLnB1el9kaWZmKSAvLyBzZXQgc29tZSB2ZXJ0aWNlcy9lZGdlcyBhcyBoaWRkZW4gZGVwZW5kaW5nIG9uIGRpZmZpY3VsdHlcbiAgfVxuXG4gIC8qIE1ldGhvZHMgaW5pdGlhbGlzaW5nIHZlcnRpY2VzICovXG5cbiAgaW5pdEludGVnZXIgKHNldHRpbmdzKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24ocmFuZEJldHdlZW5GaWx0ZXIoXG4gICAgICAgICAgc2V0dGluZ3MubWluLFxuICAgICAgICAgIHNldHRpbmdzLm1heCxcbiAgICAgICAgICB4ID0+IChzZXR0aW5ncy50eXBlLmVuZHNXaXRoKCdhZGQnKSB8fCB4ICE9PSAwKVxuICAgICAgICApKSxcbiAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRGcmFjdGlvbkFkZCAoc2V0dGluZ3MpIHtcbiAgICAvKiBEaWZmaWN1bHR5IHNldHRpbmdzOlxuICAgICAqIDE6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBzYW1lIGRlbm9taW5hdG9yLCBubyBjYW5jZWxsaW5nIGFmdGVyIERPTkVcbiAgICAgKiAyOiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggc2FtZSBkZW5vbWluYXRvciwgbm8gY2FuY2VsbGxpbmcgYW5zd2VyIGltcHJvcGVyIGZyYWN0aW9uXG4gICAgICogMzogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIG9uZSBkZW5vbWluYXRvciBhIG11bHRpcGxlIG9mIGFub3RoZXIsIGdpdmVzIHByb3BlciBmcmFjdGlvblxuICAgICAqIDQ6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBvbmUgZGVub21pbmF0b3IgYSBtdWx0aXBsZSBvZiBhbm90aGVyLCBnaXZlcyBpbXByb3BlciBmcmFjdGlvblxuICAgICAqIDU6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBkaWZmZXJlbnQgZGVub21pbmF0b3JzIChub3QgY28tcHJpbWUpLCBnaXZlcyBpbXByb3BlciBmcmFjdGlvblxuICAgICAqIDY6IG1peGVkIG51bWJlcnNcbiAgICAgKiA3OiBtaXhlZCBudW1iZXJzLCBiaWdnZXIgbnVtZXJhdG9ycyBhbmQgZGVub21pbmF0b3JzXG4gICAgICogODogbWl4ZWQgbnVtYmVycywgYmlnIGludGVnZXIgcGFydHNcbiAgICAgKi9cblxuICAgIC8vIFRPRE8gLSBhbnl0aGluZyBvdGhlciB0aGFuIGRpZmZpY3VsdHkgMS5cbiAgICBjb25zdCBkaWZmID0gc2V0dGluZ3MubnVtX2RpZmZcbiAgICBpZiAoZGlmZiA8IDMpIHtcbiAgICAgIGNvbnN0IGRlbiA9IHJhbmRFbGVtKFs1LCA3LCA5LCAxMSwgMTMsIDE3XSlcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgY29uc3QgcHJldm51bSA9IHRoaXMudmVydGljZXNbaSAtIDFdXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzW2kgLSAxXS52YWwubiA6IHVuZGVmaW5lZFxuICAgICAgICBjb25zdCBuZXh0bnVtID0gdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXVxuICAgICAgICAgID8gdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXS52YWwubiA6IHVuZGVmaW5lZFxuXG4gICAgICAgIGNvbnN0IG1heG51bSA9XG4gICAgICAgICAgZGlmZiA9PT0gMiA/IGRlbiAtIDFcbiAgICAgICAgICAgIDogbmV4dG51bSA/IGRlbiAtIE1hdGgubWF4KG5leHRudW0sIHByZXZudW0pXG4gICAgICAgICAgICAgIDogcHJldm51bSA/IGRlbiAtIHByZXZudW1cbiAgICAgICAgICAgICAgICA6IGRlbiAtIDFcblxuICAgICAgICBjb25zdCBudW0gPSByYW5kQmV0d2VlbkZpbHRlcigxLCBtYXhudW0sIHggPT4gKFxuICAgICAgICAgIC8vIEVuc3VyZXMgbm8gc2ltcGxpZmluZyBhZnRlcndhcmRzIGlmIGRpZmZpY3VsdHkgaXMgMVxuICAgICAgICAgIGdjZCh4LCBkZW4pID09PSAxICYmXG4gICAgICAgICAgKCFwcmV2bnVtIHx8IGdjZCh4ICsgcHJldm51bSwgZGVuKSA9PT0gMSB8fCB4ICsgcHJldm51bSA9PT0gZGVuKSAmJlxuICAgICAgICAgICghbmV4dG51bSB8fCBnY2QoeCArIG5leHRudW0sIGRlbikgPT09IDEgfHwgeCArIG5leHRudW0gPT09IGRlbilcbiAgICAgICAgKSlcblxuICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgIHZhbDogbmV3IEZyYWN0aW9uKG51bSwgZGVuKSxcbiAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZGVuYmFzZSA9IHJhbmRFbGVtKFxuICAgICAgICBkaWZmIDwgNyA/IFsyLCAzLCA1XSA6IFsyLCAzLCA0LCA1LCA2LCA3LCA4LCA5LCAxMCwgMTFdXG4gICAgICApXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHByZXYgPSB0aGlzLnZlcnRpY2VzW2kgLSAxXVxuICAgICAgICAgID8gdGhpcy52ZXJ0aWNlc1tpIC0gMV0udmFsIDogdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dLnZhbCA6IHVuZGVmaW5lZFxuXG4gICAgICAgIGNvbnN0IG1heG11bHRpcGxpZXIgPSBkaWZmIDwgNyA/IDQgOiA4XG5cbiAgICAgICAgY29uc3QgbXVsdGlwbGllciA9XG4gICAgICAgICAgaSAlIDIgPT09IDEgfHwgZGlmZiA+IDQgPyByYW5kQmV0d2VlbkZpbHRlcigyLCBtYXhtdWx0aXBsaWVyLCB4ID0+XG4gICAgICAgICAgICAoIXByZXYgfHwgeCAhPT0gcHJldi5kIC8gZGVuYmFzZSkgJiZcbiAgICAgICAgICAgICghbmV4dCB8fCB4ICE9PSBuZXh0LmQgLyBkZW5iYXNlKVxuICAgICAgICAgICkgOiAxXG5cbiAgICAgICAgY29uc3QgZGVuID0gZGVuYmFzZSAqIG11bHRpcGxpZXJcblxuICAgICAgICBsZXQgbnVtXG4gICAgICAgIGlmIChkaWZmIDwgNikge1xuICAgICAgICAgIG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKDEsIGRlbiAtIDEsIHggPT4gKFxuICAgICAgICAgICAgZ2NkKHgsIGRlbikgPT09IDEgJiZcbiAgICAgICAgICAgIChkaWZmID49IDQgfHwgIXByZXYgfHwgcHJldi5hZGQoeCwgZGVuKSA8PSAxKSAmJlxuICAgICAgICAgICAgKGRpZmYgPj0gNCB8fCAhbmV4dCB8fCBuZXh0LmFkZCh4LCBkZW4pIDw9IDEpXG4gICAgICAgICAgKSlcbiAgICAgICAgfSBlbHNlIGlmIChkaWZmIDwgOCkge1xuICAgICAgICAgIG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKGRlbiArIDEsIGRlbiAqIDYsIHggPT4gZ2NkKHgsIGRlbikgPT09IDEpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoZGVuICogMTAsIGRlbiAqIDEwMCwgeCA9PiBnY2QoeCwgZGVuKSA9PT0gMSlcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24obnVtLCBkZW4pLFxuICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRGcmFjdGlvbk11bHRpcGx5IChzZXR0aW5ncykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIGNvbnN0IGQgPSByYW5kQmV0d2VlbigyLCAxMClcbiAgICAgIGNvbnN0IG4gPSByYW5kQmV0d2VlbigxLCBkIC0gMSlcbiAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgIHZhbDogbmV3IEZyYWN0aW9uKG4sIGQpLFxuICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEFsZ2VicmFBZGQgKHNldHRpbmdzKSB7XG4gICAgY29uc3QgZGlmZiA9IHNldHRpbmdzLm51bV9kaWZmXG4gICAgc3dpdGNoIChkaWZmKSB7XG4gICAgICBjYXNlIDE6IHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmICsgdmFyaWFibGUpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOlxuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSA8IDAuNSkgeyAvLyB2YXJpYWJsZSArIGNvbnN0YW50XG4gICAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IGNvbnN0YW50ID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2YXJpYWJsZSArICcrJyArIGNvbnN0YW50KSxcbiAgICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZTEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICAgIGxldCB2YXJpYWJsZTIgPSB2YXJpYWJsZTFcbiAgICAgICAgICB3aGlsZSAodmFyaWFibGUyID09PSB2YXJpYWJsZTEpIHtcbiAgICAgICAgICAgIHZhcmlhYmxlMiA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgICAgY29uc3QgY29lZmYxID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IGNvZWZmMiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmMSArIHZhcmlhYmxlMSArICcrJyArIGNvZWZmMiArIHZhcmlhYmxlMiksXG4gICAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0QWxnZWJyYU11bHRpcGx5IChzZXR0aW5ncykge1xuICAgIC8qIERpZmZpY3VsdHk6XG4gICAgICogMTogQWx0ZXJuYXRlIDNhIHdpdGggNFxuICAgICAqIDI6IEFsbCB0ZXJtcyBvZiB0aGUgZm9ybSBudiAtIHVwIHRvIHR3byB2YXJpYWJsZXNcbiAgICAgKiAzOiBBbGwgdGVybXMgb2YgdGhlIGZvcm0gbnZebS4gT25lIHZhcmlhYmxlIG9ubHlcbiAgICAgKiA0OiBBTGwgdGVybXMgb2YgdGhlIGZvcm0gbnheayB5Xmwgel5wLiBrLGwscCAwLTNcbiAgICAgKiA1OiBFeHBhbmQgYnJhY2tldHMgMygyeCs1KVxuICAgICAqIDY6IEV4cGFuZCBicmFja2V0cyAzeCgyeCs1KVxuICAgICAqIDc6IEV4cGFuZCBicmFja2V0cyAzeF4yeSgyeHkrNXleMilcbiAgICAgKiA4OiBFeHBhbmQgYnJhY2tldHMgKHgrMykoeCsyKVxuICAgICAqIDk6IEV4cGFuZCBicmFja2V0cyAoMngtMykoM3grNClcbiAgICAgKiAxMDogRXhwYW5kIGJyYWNrZXRzICgyeF4yLTN4KzQpKDJ4LTUpXG4gICAgICovXG4gICAgY29uc3QgZGlmZiA9IHNldHRpbmdzLm51bV9kaWZmXG4gICAgc3dpdGNoIChkaWZmKSB7XG4gICAgICBjYXNlIDE6XG4gICAgICB7XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCB0ZXJtID0gaSAlIDIgPT09IDAgPyBjb2VmZiA6IGNvZWZmICsgdmFyaWFibGVcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh0ZXJtKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSAyOiB7XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlMSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGNvbnN0IHZhcmlhYmxlMiA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgdmFyaWFibGUgPSByYW5kRWxlbShbdmFyaWFibGUxLCB2YXJpYWJsZTJdKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmICsgdmFyaWFibGUpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDM6IHtcbiAgICAgICAgY29uc3QgdiA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgaWR4ID0gcmFuZEJldHdlZW4oMSwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmICsgdiArICdeJyArIGlkeCksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgNDoge1xuICAgICAgICBjb25zdCBzdGFydEFzY2lpID0gcmFuZEJldHdlZW4oOTcsIDEyMClcbiAgICAgICAgY29uc3QgdjEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkpXG4gICAgICAgIGNvbnN0IHYyID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpICsgMSlcbiAgICAgICAgY29uc3QgdjMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkgKyAyKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjEgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjIgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjMgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgdGVybSA9IGEgKyB2MSArIG4xICsgdjIgKyBuMiArIHYzICsgbjNcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh0ZXJtKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSA1OlxuICAgICAgY2FzZSA2OiB7IC8vIGUuZy4gMyh4KSAqICgyeC01KVxuICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgY29uc3RhbnQgPSByYW5kQmV0d2VlbigtOSwgOSkudG9TdHJpbmcoKVxuICAgICAgICAgIGxldCB0ZXJtID0gY29lZmZcbiAgICAgICAgICBpZiAoZGlmZiA9PT0gNiB8fCBpICUgMiA9PT0gMSkgdGVybSArPSB2YXJpYWJsZVxuICAgICAgICAgIGlmIChpICUgMiA9PT0gMSkgdGVybSArPSAnKycgKyBjb25zdGFudFxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDc6IHsgLy8gZS5nLiAzeF4yeSg0eHleMis1eHkpXG4gICAgICAgIGNvbnN0IHN0YXJ0QXNjaWkgPSByYW5kQmV0d2Vlbig5NywgMTIwKVxuICAgICAgICBjb25zdCB2MSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSlcbiAgICAgICAgY29uc3QgdjIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkgKyAxKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgYTEgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4xMSA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMTIgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgbGV0IHRlcm0gPSBhMSArIHYxICsgbjExICsgdjIgKyBuMTJcbiAgICAgICAgICBpZiAoaSAlIDIgPT09IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGEyID0gcmFuZEJldHdlZW4oLTksIDkpLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IG4yMSA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IG4yMiA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICAgIHRlcm0gKz0gJysnICsgYTIgKyB2MSArIG4yMSArIHYyICsgbjIyXG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDg6IC8vIHsgZS5nLiAoeCs1KSAqICh4LTIpXG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvbnN0YW50ID0gcmFuZEJldHdlZW4oLTksIDkpLnRvU3RyaW5nKClcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh2YXJpYWJsZSArICcrJyArIGNvbnN0YW50KSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiBNZXRob2QgdG8gY2FsY3VsYXRlIGVkZ2VzIGZyb20gdmVydGljZXMgKi9cbiAgY2FsY3VsYXRlRWRnZXMgKCkge1xuICAgIC8vIENhbGN1bGF0ZSB0aGUgZWRnZXMgZ2l2ZW4gdGhlIHZlcnRpY2VzIHVzaW5nIHRoaXMub3BcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICB0aGlzLnNpZGVzW2ldID0ge1xuICAgICAgICB2YWw6IHRoaXMub3AodGhpcy52ZXJ0aWNlc1tpXS52YWwsIHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl0udmFsKSxcbiAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qIE1hcmsgaGlkZGVuZCBlZGdlcy92ZXJ0aWNlcyAqL1xuXG4gIGhpZGVMYWJlbHMgKHB1enpsZURpZmZpY3VsdHkpIHtcbiAgICAvLyBIaWRlIHNvbWUgbGFiZWxzIHRvIG1ha2UgYSBwdXp6bGVcbiAgICAvLyAxIC0gU2lkZXMgaGlkZGVuLCB2ZXJ0aWNlcyBzaG93blxuICAgIC8vIDIgLSBTb21lIHNpZGVzIGhpZGRlbiwgc29tZSB2ZXJ0aWNlcyBoaWRkZW5cbiAgICAvLyAzIC0gQWxsIHZlcnRpY2VzIGhpZGRlblxuICAgIHN3aXRjaCAocHV6emxlRGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICB0aGlzLnNpZGVzLmZvckVhY2goeCA9PiB7IHguaGlkZGVuID0gdHJ1ZSB9KVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOiB7XG4gICAgICAgIHRoaXMuc2lkZXMuZm9yRWFjaCh4ID0+IHsgeC5oaWRkZW4gPSB0cnVlIH0pXG4gICAgICAgIGNvbnN0IHNob3dzaWRlID0gcmFuZEJldHdlZW4oMCwgdGhpcy5uIC0gMSwgTWF0aC5yYW5kb20pXG4gICAgICAgIGNvbnN0IGhpZGV2ZXJ0ID0gTWF0aC5yYW5kb20oKSA8IDAuNVxuICAgICAgICAgID8gc2hvd3NpZGUgLy8gcHJldmlvdXMgdmVydGV4XG4gICAgICAgICAgOiAoc2hvd3NpZGUgKyAxKSAlIHRoaXMubiAvLyBuZXh0IHZlcnRleDtcblxuICAgICAgICB0aGlzLnNpZGVzW3Nob3dzaWRlXS5oaWRkZW4gPSBmYWxzZVxuICAgICAgICB0aGlzLnZlcnRpY2VzW2hpZGV2ZXJ0XS5oaWRkZW4gPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlIDM6XG4gICAgICAgIHRoaXMudmVydGljZXMuZm9yRWFjaCh4ID0+IHsgeC5oaWRkZW4gPSB0cnVlIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vX2RpZmZpY3VsdHknKVxuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBBcml0aG1hZ29uUVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICBjb25zdHJ1Y3RvciAoZGF0YSwgb3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIHNldHMgdGhpcy53aWR0aCB0aGlzLmhlaWdodCwgaW5pdGlhbGlzZXMgdGhpcy5sYWJlbHMsIGNyZWF0ZXMgZG9tIGVsZW1lbnRzXG5cbiAgICBjb25zdCB3aWR0aCA9IHRoaXMud2lkdGhcbiAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmhlaWdodFxuICAgIGNvbnN0IHIgPSAwLjM1ICogTWF0aC5taW4od2lkdGgsIGhlaWdodCkgLy8gcmFkaXVzXG4gICAgY29uc3QgbiA9IHRoaXMuZGF0YS5uXG5cbiAgICAvLyBBIHBvaW50IHRvIGxhYmVsIHdpdGggdGhlIG9wZXJhdGlvblxuICAgIC8vIEFsbCBwb2ludHMgZmlyc3Qgc2V0IHVwIHdpdGggKDAsMCkgYXQgY2VudGVyXG4gICAgdGhpcy5vcGVyYXRpb25Qb2ludCA9IG5ldyBQb2ludCgwLCAwKVxuXG4gICAgLy8gUG9zaXRpb24gb2YgdmVydGljZXNcbiAgICB0aGlzLnZlcnRleFBvaW50cyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIGNvbnN0IGFuZ2xlID0gaSAqIE1hdGguUEkgKiAyIC8gbiAtIE1hdGguUEkgLyAyXG4gICAgICB0aGlzLnZlcnRleFBvaW50c1tpXSA9IFBvaW50LmZyb21Qb2xhcihyLCBhbmdsZSlcbiAgICB9XG5cbiAgICAvLyBQb2lzaXRpb24gb2Ygc2lkZSBsYWJlbHNcbiAgICB0aGlzLnNpZGVQb2ludHMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICB0aGlzLnNpZGVQb2ludHNbaV0gPSBQb2ludC5tZWFuKHRoaXMudmVydGV4UG9pbnRzW2ldLCB0aGlzLnZlcnRleFBvaW50c1soaSArIDEpICUgbl0pXG4gICAgfVxuXG4gICAgdGhpcy5hbGxQb2ludHMgPSBbdGhpcy5vcGVyYXRpb25Qb2ludF0uY29uY2F0KHRoaXMudmVydGV4UG9pbnRzKS5jb25jYXQodGhpcy5zaWRlUG9pbnRzKVxuXG4gICAgdGhpcy5yZUNlbnRlcigpIC8vIFJlcG9zaXRpb24gZXZlcnl0aGluZyBwcm9wZXJseVxuXG4gICAgdGhpcy5tYWtlTGFiZWxzKHRydWUpXG5cbiAgICAvLyBEcmF3IGludG8gY2FudmFzXG4gIH1cblxuICByZUNlbnRlciAoKSB7XG4gICAgLy8gRmluZCB0aGUgY2VudGVyIG9mIHRoZSBib3VuZGluZyBib3hcbiAgICBjb25zdCB0b3BsZWZ0ID0gUG9pbnQubWluKHRoaXMuYWxsUG9pbnRzKVxuICAgIGNvbnN0IGJvdHRvbXJpZ2h0ID0gUG9pbnQubWF4KHRoaXMuYWxsUG9pbnRzKVxuICAgIGNvbnN0IGNlbnRlciA9IFBvaW50Lm1lYW4odG9wbGVmdCwgYm90dG9tcmlnaHQpXG5cbiAgICAvLyB0cmFuc2xhdGUgdG8gcHV0IGluIHRoZSBjZW50ZXJcbiAgICB0aGlzLmFsbFBvaW50cy5mb3JFYWNoKHAgPT4ge1xuICAgICAgcC50cmFuc2xhdGUodGhpcy53aWR0aCAvIDIgLSBjZW50ZXIueCwgdGhpcy5oZWlnaHQgLyAyIC0gY2VudGVyLnkpXG4gICAgfSlcbiAgfVxuXG4gIG1ha2VMYWJlbHMgKCkge1xuICAgIC8vIHZlcnRpY2VzXG4gICAgdGhpcy5kYXRhLnZlcnRpY2VzLmZvckVhY2goKHYsIGkpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gdi52YWwudG9MYXRleFxuICAgICAgICA/IHYudmFsLnRvTGF0ZXgodHJ1ZSlcbiAgICAgICAgOiB2LnZhbC50b1N0cmluZygpXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKHtcbiAgICAgICAgcG9zOiB0aGlzLnZlcnRleFBvaW50c1tpXSxcbiAgICAgICAgdGV4dHE6IHYuaGlkZGVuID8gJycgOiB2YWx1ZSxcbiAgICAgICAgdGV4dGE6IHZhbHVlLFxuICAgICAgICBzdHlsZXE6ICdub3JtYWwgdmVydGV4JyxcbiAgICAgICAgc3R5bGVhOiB2LmhpZGRlbiA/ICdhbnN3ZXIgdmVydGV4JyA6ICdub3JtYWwgdmVydGV4J1xuICAgICAgfSlcbiAgICB9KVxuXG4gICAgLy8gc2lkZXNcbiAgICB0aGlzLmRhdGEuc2lkZXMuZm9yRWFjaCgodiwgaSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSB2LnZhbC50b0xhdGV4XG4gICAgICAgID8gdi52YWwudG9MYXRleCh0cnVlKVxuICAgICAgICA6IHYudmFsLnRvU3RyaW5nKClcbiAgICAgIHRoaXMubGFiZWxzLnB1c2goe1xuICAgICAgICBwb3M6IHRoaXMuc2lkZVBvaW50c1tpXSxcbiAgICAgICAgdGV4dHE6IHYuaGlkZGVuID8gJycgOiB2YWx1ZSxcbiAgICAgICAgdGV4dGE6IHZhbHVlLFxuICAgICAgICBzdHlsZXE6ICdub3JtYWwgc2lkZScsXG4gICAgICAgIHN0eWxlYTogdi5oaWRkZW4gPyAnYW5zd2VyIHNpZGUnIDogJ25vcm1hbCBzaWRlJ1xuICAgICAgfSlcbiAgICB9KVxuXG4gICAgLy8gb3BlcmF0aW9uXG4gICAgdGhpcy5sYWJlbHMucHVzaCh7XG4gICAgICBwb3M6IHRoaXMub3BlcmF0aW9uUG9pbnQsXG4gICAgICB0ZXh0cTogdGhpcy5kYXRhLm9wbmFtZSxcbiAgICAgIHRleHRhOiB0aGlzLmRhdGEub3BuYW1lLFxuICAgICAgc3R5bGVxOiAnbm9ybWFsJyxcbiAgICAgIHN0eWxlYTogJ25vcm1hbCdcbiAgICB9KVxuXG4gICAgLy8gc3R5bGluZ1xuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRxXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZXFcbiAgICB9KVxuICB9XG5cbiAgcmVuZGVyICgpIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG4gICAgY29uc3QgbiA9IHRoaXMuZGF0YS5uXG5cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpIC8vIGNsZWFyXG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgY29uc3QgcCA9IHRoaXMudmVydGV4UG9pbnRzW2ldXG4gICAgICBjb25zdCBuZXh0ID0gdGhpcy52ZXJ0ZXhQb2ludHNbKGkgKyAxKSAlIG5dXG4gICAgICBjdHgubW92ZVRvKHAueCwgcC55KVxuICAgICAgY3R4LmxpbmVUbyhuZXh0LngsIG5leHQueSlcbiAgICB9XG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICAvLyBwbGFjZSBsYWJlbHNcbiAgICB0aGlzLnJlbmRlckxhYmVscyh0cnVlKVxuICB9XG5cbiAgc2hvd0Fuc3dlciAoKSB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dGFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlYVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHModHJ1ZSlcbiAgICB0aGlzLmFuc3dlcmVkID0gdHJ1ZVxuICB9XG5cbiAgaGlkZUFuc3dlciAoKSB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHModHJ1ZSlcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxufVxuIiwiaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRlc3RRIGV4dGVuZHMgVGV4dFEge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDUsXG4gICAgICBsYWJlbDogJ2EnLFxuICAgICAgdGVzdDE6IFsnZm9vJ10sXG4gICAgICB0ZXN0MjogdHJ1ZVxuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyBwaWNrIGEgcmFuZG9tIG9uZSBvZiB0aGUgc2VsZWN0ZWRcbiAgICBsZXQgdGVzdDFcbiAgICBpZiAoc2V0dGluZ3MudGVzdDEubGVuZ3RoID09PSAwKSB7XG4gICAgICB0ZXN0MSA9ICdub25lJ1xuICAgIH0gZWxzZSB7XG4gICAgICB0ZXN0MSA9IHJhbmRFbGVtKHNldHRpbmdzLnRlc3QxKVxuICAgIH1cblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICdkOiAnICsgc2V0dGluZ3MuZGlmZmljdWx0eSArICdcXFxcXFxcXCB0ZXN0MTogJyArIHRlc3QxXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICd0ZXN0MjogJyArIHNldHRpbmdzLnRlc3QyXG5cbiAgICB0aGlzLnJlbmRlcigpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHsgcmV0dXJuICdUZXN0IGNvbW1hbmQgd29yZCcgfVxufVxuXG5UZXN0US5vcHRpb25zU3BlYyA9IFtcbiAge1xuICAgIHRpdGxlOiAnVGVzdCBvcHRpb24gMScsXG4gICAgaWQ6ICd0ZXN0MScsXG4gICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFsnZm9vJywgJ2JhcicsICd3aXp6J10sXG4gICAgZGVmYXVsdDogW11cbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVGVzdCBvcHRpb24gMicsXG4gICAgaWQ6ICd0ZXN0MicsXG4gICAgdHlwZTogJ2Jvb2wnLFxuICAgIGRlZmF1bHQ6IHRydWVcbiAgfVxuXVxuIiwiaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFkZEFaZXJvIGV4dGVuZHMgVGV4dFEge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDUsXG4gICAgICBsYWJlbDogJ2EnXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICB0aGlzLmxhYmVsID0gc2V0dGluZ3MubGFiZWxcblxuICAgIC8vIHJhbmRvbSAyIGRpZ2l0ICdkZWNpbWFsJ1xuICAgIGNvbnN0IHEgPSBTdHJpbmcocmFuZEJldHdlZW4oMSwgOSkpICsgU3RyaW5nKHJhbmRCZXR3ZWVuKDAsIDkpKSArICcuJyArIFN0cmluZyhyYW5kQmV0d2VlbigwLCA5KSlcbiAgICBjb25zdCBhID0gcSArICcwJ1xuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gcSArICdcXFxcdGltZXMgMTAnXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICc9ICcgKyBhXG5cbiAgICB0aGlzLnJlbmRlcigpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ0V2YWx1YXRlJ1xuICB9XG59XG5cbkFkZEFaZXJvLm9wdGlvbnNTcGVjID0gW1xuXVxuIiwiaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5pbXBvcnQgRnJhY3Rpb24gZnJvbSAndmVuZG9yL2ZyYWN0aW9uJ1xuXG4vKiBNYWluIHF1ZXN0aW9uIGNsYXNzLiBUaGlzIHdpbGwgYmUgc3B1biBvZmYgaW50byBkaWZmZXJlbnQgZmlsZSBhbmQgZ2VuZXJhbGlzZWQgKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEVxdWF0aW9uT2ZMaW5lIGV4dGVuZHMgVGV4dFEge1xuICAvLyAnZXh0ZW5kcycgUXVlc3Rpb24sIGJ1dCBub3RoaW5nIHRvIGFjdHVhbGx5IGV4dGVuZFxuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIC8vIGJvaWxlcnBsYXRlXG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogMlxuICAgIH1cblxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG4gICAgY29uc3QgZGlmZmljdWx0eSA9IE1hdGguY2VpbChzZXR0aW5ncy5kaWZmaWN1bHR5IC8gMikgLy8gaW5pdGlhbGx5IHdyaXR0ZW4gZm9yIGRpZmZpY3VsdHkgMS00LCBub3cgbmVlZCAxLTEwXG5cbiAgICAvLyBxdWVzdGlvbiBnZW5lcmF0aW9uIGJlZ2lucyBoZXJlXG4gICAgbGV0IG0sIGMsIHgxLCB5MSwgeDIsIHkyXG4gICAgbGV0IG1pbm0sIG1heG0sIG1pbmMsIG1heGNcblxuICAgIHN3aXRjaCAoZGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOiAvLyBtPjAsIGM+PTBcbiAgICAgIGNhc2UgMjpcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgbWlubSA9IGRpZmZpY3VsdHkgPCAzID8gMSA6IC01XG4gICAgICAgIG1heG0gPSA1XG4gICAgICAgIG1pbmMgPSBkaWZmaWN1bHR5IDwgMiA/IDAgOiAtMTBcbiAgICAgICAgbWF4YyA9IDEwXG4gICAgICAgIG0gPSByYW5kQmV0d2VlbihtaW5tLCBtYXhtKVxuICAgICAgICBjID0gcmFuZEJldHdlZW4obWluYywgbWF4YylcbiAgICAgICAgeDEgPSBkaWZmaWN1bHR5IDwgMyA/IHJhbmRCZXR3ZWVuKDAsIDEwKSA6IHJhbmRCZXR3ZWVuKC0xNSwgMTUpXG4gICAgICAgIHkxID0gbSAqIHgxICsgY1xuXG4gICAgICAgIGlmIChkaWZmaWN1bHR5IDwgMykge1xuICAgICAgICAgIHgyID0gcmFuZEJldHdlZW4oeDEgKyAxLCAxNSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB4MiA9IHgxXG4gICAgICAgICAgd2hpbGUgKHgyID09PSB4MSkgeyB4MiA9IHJhbmRCZXR3ZWVuKC0xNSwgMTUpIH07XG4gICAgICAgIH1cbiAgICAgICAgeTIgPSBtICogeDIgKyBjXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ6IC8vIG0gZnJhY3Rpb24sIHBvaW50cyBhcmUgaW50ZWdlcnNcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgY29uc3QgbWQgPSByYW5kQmV0d2VlbigxLCA1KVxuICAgICAgICBjb25zdCBtbiA9IHJhbmRCZXR3ZWVuKC01LCA1KVxuICAgICAgICBtID0gbmV3IEZyYWN0aW9uKG1uLCBtZClcbiAgICAgICAgeDEgPSBuZXcgRnJhY3Rpb24ocmFuZEJldHdlZW4oLTEwLCAxMCkpXG4gICAgICAgIHkxID0gbmV3IEZyYWN0aW9uKHJhbmRCZXR3ZWVuKC0xMCwgMTApKVxuICAgICAgICBjID0gbmV3IEZyYWN0aW9uKHkxKS5zdWIobS5tdWwoeDEpKVxuICAgICAgICB4MiA9IHgxLmFkZChyYW5kQmV0d2VlbigxLCA1KSAqIG0uZClcbiAgICAgICAgeTIgPSBtLm11bCh4MikuYWRkKGMpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgeHN0ciA9XG4gICAgICAobSA9PT0gMCB8fCAobS5lcXVhbHMgJiYgbS5lcXVhbHMoMCkpKSA/ICcnXG4gICAgICAgIDogKG0gPT09IDEgfHwgKG0uZXF1YWxzICYmIG0uZXF1YWxzKDEpKSkgPyAneCdcbiAgICAgICAgICA6IChtID09PSAtMSB8fCAobS5lcXVhbHMgJiYgbS5lcXVhbHMoLTEpKSkgPyAnLXgnXG4gICAgICAgICAgICA6IChtLnRvTGF0ZXgpID8gbS50b0xhdGV4KCkgKyAneCdcbiAgICAgICAgICAgICAgOiAobSArICd4JylcblxuICAgIGNvbnN0IGNvbnN0c3RyID0gLy8gVE9ETzogV2hlbiBtPWM9MFxuICAgICAgKGMgPT09IDAgfHwgKGMuZXF1YWxzICYmIGMuZXF1YWxzKDApKSkgPyAnJ1xuICAgICAgICA6IChjIDwgMCkgPyAoJyAtICcgKyAoYy5uZWcgPyBjLm5lZygpLnRvTGF0ZXgoKSA6IC1jKSlcbiAgICAgICAgICA6IChjLnRvTGF0ZXgpID8gKCcgKyAnICsgYy50b0xhdGV4KCkpXG4gICAgICAgICAgICA6ICgnICsgJyArIGMpXG5cbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnKCcgKyB4MSArICcsICcgKyB5MSArICcpXFxcXHRleHR7IGFuZCB9KCcgKyB4MiArICcsICcgKyB5MiArICcpJ1xuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAneSA9ICcgKyB4c3RyICsgY29uc3RzdHJcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRmluZCB0aGUgZXF1YXRpb24gb2YgdGhlIGxpbmUgdGhyb3VnaCdcbiAgfVxufVxuIiwiLyogUmVuZGVycyBtaXNzaW5nIGFuZ2xlcyBwcm9ibGVtIHdoZW4gdGhlIGFuZ2xlcyBhcmUgYXQgYSBwb2ludFxuICogSS5lLiBvbiBhIHN0cmFpZ2h0IGxpbmUgb3IgYXJvdW5kIGEgcG9pbnRcbiAqIENvdWxkIGFsc28gYmUgYWRhcHRlZCB0byBhbmdsZXMgZm9ybWluZyBhIHJpZ2h0IGFuZ2xlXG4gKlxuICogU2hvdWxkIGJlIGZsZXhpYmxlIGVub3VnaCBmb3IgbnVtZXJpY2FsIHByb2JsZW1zIG9yIGFsZ2VicmFpYyBvbmVzXG4gKlxuICovXG5cbmltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IEdyYXBoaWNRVmlldywgTGFiZWwgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCB7IHJvdW5kRFAgfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc051bWJlckRhdGEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICByYWRpdXM6IG51bWJlclxuICBPOiBQb2ludFxuICBBOiBQb2ludFxuICBDOiBQb2ludFtdXG4gIHZpZXdBbmdsZXM6IG51bWJlcltdIC8vICdmdWRnZWQnIHZlcnNpb25zIG9mIGRhdGEuYW5nbGVzIGZvciBkaXNwbGF5XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhXG4gIHJvdGF0aW9uOiBudW1iZXJcblxuICBjb25zdHJ1Y3RvciAoZGF0YSA6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhLCBvcHRpb25zIDogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc2V0cyB0aGlzLndpZHRoIHRoaXMuaGVpZ2h0LCBpbml0aWFsaXNlcyB0aGlzLmxhYmVscywgY3JlYXRlcyBkb20gZWxlbWVudHNcbiAgICBjb25zdCB3aWR0aCA9IHRoaXMud2lkdGhcbiAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmhlaWdodFxuICAgIGNvbnN0IHJhZGl1cyA9IHRoaXMucmFkaXVzID0gTWF0aC5taW4od2lkdGgsIGhlaWdodCkgLyAyLjVcbiAgICBjb25zdCBtaW5WaWV3QW5nbGUgPSBvcHRpb25zLm1pblZpZXdBbmdsZSB8fCAyNVxuXG4gICAgdGhpcy52aWV3QW5nbGVzID0gZnVkZ2VBbmdsZXModGhpcy5kYXRhLmFuZ2xlcywgbWluVmlld0FuZ2xlKVxuXG4gICAgLy8gU2V0IHVwIG1haW4gcG9pbnRzXG4gICAgdGhpcy5PID0gbmV3IFBvaW50KDAsIDApIC8vIGNlbnRlciBwb2ludFxuICAgIHRoaXMuQSA9IG5ldyBQb2ludChyYWRpdXMsIDApIC8vIGZpcnN0IHBvaW50XG4gICAgdGhpcy5DID0gW10gLy8gUG9pbnRzIGFyb3VuZCBvdXRzaWRlXG4gICAgbGV0IHRvdGFsYW5nbGUgPSAwIC8vIG5iIGluIHJhZGlhbnNcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZGF0YS5hbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRvdGFsYW5nbGUgKz0gdGhpcy52aWV3QW5nbGVzW2ldICogTWF0aC5QSSAvIDE4MFxuICAgICAgdGhpcy5DW2ldID0gUG9pbnQuZnJvbVBvbGFyKHJhZGl1cywgdG90YWxhbmdsZSlcbiAgICB9XG5cbiAgICAvLyBSYW5kb21seSByb3RhdGUgYW5kIGNlbnRlclxuICAgIHRoaXMucm90YXRpb24gPSAob3B0aW9ucy5yb3RhdGlvbiAhPT0gdW5kZWZpbmVkKSA/IHRoaXMucm90YXRlKG9wdGlvbnMucm90YXRpb24pIDogdGhpcy5yYW5kb21Sb3RhdGUoKVxuICAgIC8vIHRoaXMuc2NhbGVUb0ZpdCh3aWR0aCxoZWlnaHQsMTApXG4gICAgdGhpcy50cmFuc2xhdGUod2lkdGggLyAyLCBoZWlnaHQgLyAyKVxuXG4gICAgLy8gU2V0IHVwIGxhYmVscyAoYWZ0ZXIgc2NhbGluZyBhbmQgcm90YXRpbmcpXG4gICAgdG90YWxhbmdsZSA9IFBvaW50LmFuZ2xlRnJvbSh0aGlzLk8sIHRoaXMuQSkgKiAxODAgLyBNYXRoLlBJIC8vIGFuZ2xlIGZyb20gTyB0aGF0IEEgaXNcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudmlld0FuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gTGFiZWwgdGV4dFxuICAgICAgY29uc3QgbGFiZWwgOiBQYXJ0aWFsPExhYmVsPiA9IHt9XG4gICAgICBjb25zdCB0ZXh0cSA9IHRoaXMuZGF0YS5hbmdsZUxhYmVsc1tpXVxuICAgICAgY29uc3QgdGV4dGEgPSByb3VuZERQKHRoaXMuZGF0YS5hbmdsZXNbaV0sIDIpLnRvU3RyaW5nKCkgKyAnXlxcXFxjaXJjJ1xuXG4gICAgICAvLyBQb3NpdGlvbmluZ1xuICAgICAgY29uc3QgdGhldGEgPSB0aGlzLnZpZXdBbmdsZXNbaV1cbiAgICAgIC8qIGNvdWxkIGJlIHVzZWQgZm9yIG1vcmUgYWR2YW5jZWQgcG9zaXRpb25pbmdcbiAgICAgIGNvbnN0IG1pZEFuZ2xlID0gdG90YWxhbmdsZSArIHRoZXRhIC8gMlxuICAgICAgY29uc3QgbWluRGlzdGFuY2UgPSAwLjMgLy8gYXMgYSBmcmFjdGlvbiBvZiByYWRpdXNcbiAgICAgIGNvbnN0IGxhYmVsTGVuZ3RoID0gTWF0aC5tYXgodGV4dHEubGVuZ3RoLCB0ZXh0YS5sZW5ndGgpIC0gJ15cXFxcY2lyYycubGVuZ3RoIC8vIMKwIHRha2VzIHVwIHZlcnkgbGl0dGxlIHNwYWNlXG4gICAgICAqL1xuXG4gICAgICAvKiBFeHBsYW5hdGlvbjogRnVydGhlciBvdXQgaWY6XG4gICAgICAqICAgTW9yZSB2ZXJ0aWNhbCAoc2luKG1pZEFuZ2xlKSlcbiAgICAgICogICBMb25nZXIgbGFiZWxcbiAgICAgICogICBzbWFsbGVyIGFuZ2xlXG4gICAgICAqICAgRS5nLiB0b3RhbGx5IHZlcnRpY2FsLCA0NcKwLCBsZW5ndGggPSAzXG4gICAgICAqICAgZCA9IDAuMyArIDEqMy80NSA9IDAuMyArIDAuNyA9IDAuMzdcbiAgICAgICovXG4gICAgICAvLyBjb25zdCBmYWN0b3IgPSAxICAgICAgICAvLyBjb25zdGFudCBvZiBwcm9wb3J0aW9uYWxpdHkuIFNldCBieSB0cmlhbCBhbmQgZXJyb3JcbiAgICAgIC8vIGxldCBkaXN0YW5jZSA9IG1pbkRpc3RhbmNlICsgZmFjdG9yICogTWF0aC5hYnMoc2luRGVnKG1pZEFuZ2xlKSkgKiBsYWJlbExlbmd0aCAvIHRoZXRhXG5cbiAgICAgIC8vIEp1c3QgcmV2ZXJ0IHRvIG9sZCBtZXRob2RcblxuICAgICAgY29uc3QgZGlzdGFuY2UgPSAwLjQgKyA2IC8gdGhldGFcblxuICAgICAgbGFiZWwucG9zID0gUG9pbnQuZnJvbVBvbGFyRGVnKHJhZGl1cyAqIGRpc3RhbmNlLCB0b3RhbGFuZ2xlICsgdGhldGEgLyAyKS50cmFuc2xhdGUodGhpcy5PLngsIHRoaXMuTy55KVxuICAgICAgbGFiZWwudGV4dHEgPSB0ZXh0cVxuICAgICAgbGFiZWwuc3R5bGVxID0gJ25vcm1hbCdcblxuICAgICAgaWYgKHRoaXMuZGF0YS5taXNzaW5nW2ldKSB7XG4gICAgICAgIGxhYmVsLnRleHRhID0gdGV4dGFcbiAgICAgICAgbGFiZWwuc3R5bGVhID0gJ2Fuc3dlcidcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxhYmVsLnRleHRhID0gbGFiZWwudGV4dHFcbiAgICAgICAgbGFiZWwuc3R5bGVhID0gbGFiZWwuc3R5bGVxXG4gICAgICB9XG5cbiAgICAgIGxhYmVsLnRleHQgPSBsYWJlbC50ZXh0cVxuICAgICAgbGFiZWwuc3R5bGUgPSBsYWJlbC5zdHlsZXFcblxuICAgICAgdGhpcy5sYWJlbHNbaV0gPSBsYWJlbCBhcyBMYWJlbFxuXG4gICAgICB0b3RhbGFuZ2xlICs9IHRoZXRhXG4gICAgfVxuXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gIH1cblxuICByZW5kZXIgKCkgOiB2b2lkIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG5cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpIC8vIGNsZWFyXG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBjdHgubW92ZVRvKHRoaXMuTy54LCB0aGlzLk8ueSkgLy8gZHJhdyBsaW5lc1xuICAgIGN0eC5saW5lVG8odGhpcy5BLngsIHRoaXMuQS55KVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5DLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjdHgubW92ZVRvKHRoaXMuTy54LCB0aGlzLk8ueSlcbiAgICAgIGN0eC5saW5lVG8odGhpcy5DW2ldLngsIHRoaXMuQ1tpXS55KVxuICAgIH1cbiAgICBjdHguc3Ryb2tlU3R5bGUgPSAnZ3JheSdcbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGxldCB0b3RhbGFuZ2xlID0gdGhpcy5yb3RhdGlvblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy52aWV3QW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCB0aGV0YSA9IHRoaXMudmlld0FuZ2xlc1tpXSAqIE1hdGguUEkgLyAxODBcbiAgICAgIC8vIDAuMDcvdGhldGEgcmFkaWFucyB+PSA0L3RoZXRhXG4gICAgICBjdHguYXJjKHRoaXMuTy54LCB0aGlzLk8ueSwgdGhpcy5yYWRpdXMgKiAoMC4yICsgMC4wNyAvIHRoZXRhKSwgdG90YWxhbmdsZSwgdG90YWxhbmdsZSArIHRoZXRhKVxuICAgICAgY3R4LnN0cm9rZSgpXG4gICAgICB0b3RhbGFuZ2xlICs9IHRoZXRhXG4gICAgfVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgLy8gdGVzdGluZyBsYWJlbCBwb3NpdGlvbmluZzpcbiAgICAvLyB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgIC8vIGN0eC5maWxsU3R5bGUgPSAncmVkJ1xuICAgIC8vIGN0eC5maWxsUmVjdChsLnBvcy54IC0gMSwgbC5wb3MueSAtIDEsIDMsIDMpXG4gICAgLy8gfSlcblxuICAgIHRoaXMucmVuZGVyTGFiZWxzKGZhbHNlKVxuICB9XG5cbiAgZ2V0IGFsbHBvaW50cyAoKSA6IFBvaW50W10ge1xuICAgIGxldCBhbGxwb2ludHMgPSBbdGhpcy5BLCB0aGlzLk9dXG4gICAgYWxscG9pbnRzID0gYWxscG9pbnRzLmNvbmNhdCh0aGlzLkMpXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChmdW5jdGlvbiAobCkge1xuICAgICAgYWxscG9pbnRzLnB1c2gobC5wb3MpXG4gICAgfSlcbiAgICByZXR1cm4gYWxscG9pbnRzXG4gIH1cbn1cblxuLyoqXG4gKiBBZGp1c3RzIGEgc2V0IG9mIGFuZ2xlcyBzbyB0aGF0IGFsbCBhbmdsZXMgYXJlIGdyZWF0ZXIgdGhhbiB7bWluQW5nbGV9IGJ5IHJlZHVjaW5nIG90aGVyIGFuZ2xlcyBpbiBwcm9wb3J0aW9uXG4gKiBAcGFyYW0gYW5nbGVzIFRoZSBzZXQgb2YgYW5nbGVzIHRvIGFkanVzdFxuICogQHBhcmFtIG1pbkFuZ2xlIFRoZSBzbWFsbGVzdCBhbmdsZSBpbiB0aGUgb3V0cHV0XG4gKi9cbmZ1bmN0aW9uIGZ1ZGdlQW5nbGVzIChhbmdsZXM6IG51bWJlcltdLCBtaW5BbmdsZTogbnVtYmVyKSA6IG51bWJlcltdIHtcbiAgY29uc3QgbWFwcGVkQW5nbGVzID0gYW5nbGVzLm1hcCgoeCwgaSkgPT4gW3gsIGldKSAvLyByZW1lbWJlciBvcmlnaW5hbCBpbmRpY2VzXG4gIGNvbnN0IHNtYWxsQW5nbGVzID0gbWFwcGVkQW5nbGVzLmZpbHRlcih4ID0+IHhbMF0gPCBtaW5BbmdsZSlcbiAgY29uc3QgbGFyZ2VBbmdsZXMgPSBtYXBwZWRBbmdsZXMuZmlsdGVyKHggPT4geFswXSA+PSBtaW5BbmdsZSlcbiAgY29uc3QgbGFyZ2VBbmdsZVN1bSA9IGxhcmdlQW5nbGVzLnJlZHVjZSgoYWNjdW11bGF0b3IsIGN1cnJlbnRWYWx1ZSkgPT4gYWNjdW11bGF0b3IgKyBjdXJyZW50VmFsdWVbMF0sIDApXG5cbiAgc21hbGxBbmdsZXMuZm9yRWFjaChzbWFsbCA9PiB7XG4gICAgY29uc3QgZGlmZmVyZW5jZSA9IG1pbkFuZ2xlIC0gc21hbGxbMF1cbiAgICBzbWFsbFswXSArPSBkaWZmZXJlbmNlXG4gICAgbGFyZ2VBbmdsZXMuZm9yRWFjaChsYXJnZSA9PiB7XG4gICAgICBjb25zdCByZWR1Y3Rpb24gPSBkaWZmZXJlbmNlICogbGFyZ2VbMF0gLyBsYXJnZUFuZ2xlU3VtXG4gICAgICBsYXJnZVswXSAtPSByZWR1Y3Rpb25cbiAgICB9KVxuICB9KVxuXG4gIHJldHVybiBzbWFsbEFuZ2xlcy5jb25jYXQobGFyZ2VBbmdsZXMpIC8vIGNvbWJpbmUgdG9nZXRoZXJcbiAgICAuc29ydCgoeCwgeSkgPT4geFsxXSAtIHlbMV0pIC8vIHNvcnQgYnkgcHJldmlvdXMgaW5kZXhcbiAgICAubWFwKHggPT4geFswXSkgLy8gc3RyaXAgb3V0IGluZGV4XG59XG4iLCIvKiogR2VuZXJhdGVzIGFuZCBob2xkcyBkYXRhIGZvciBhIG1pc3NpbmcgYW5nbGVzIHF1ZXN0aW9uLCB3aGVyZSB0aGVzZSBpcyBzb21lIGdpdmVuIGFuZ2xlIHN1bVxuICogIEFnbm9zdGljIGFzIHRvIGhvdyB0aGVzZSBhbmdsZXMgYXJlIGFycmFuZ2VkIChlLmcuIGluIGEgcG9seWdvbiBvciBhcm91bmQgc29tIHBvaW50KVxuICpcbiAqIE9wdGlvbnMgcGFzc2VkIHRvIGNvbnN0cnVjdG9yczpcbiAqICBhbmdsZVN1bTo6SW50IHRoZSBudW1iZXIgb2YgYW5nbGVzIHRvIGdlbmVyYXRlXG4gKiAgbWluQW5nbGU6OkludCB0aGUgc21hbGxlc3QgYW5nbGUgdG8gZ2VuZXJhdGVcbiAqICBtaW5OOjpJbnQgICAgIHRoZSBzbWFsbGVzdCBudW1iZXIgb2YgYW5nbGVzIHRvIGdlbmVyYXRlXG4gKiAgbWF4Tjo6SW50ICAgICB0aGUgbGFyZ2VzdCBudW1iZXIgb2YgYW5nbGVzIHRvIGdlbmVyYXRlXG4gKlxuICovXG5cbmltcG9ydCB7IHJhbmRCZXR3ZWVuIH0gZnJvbSAnVXRpbGl0aWVzJ1xuaW1wb3J0IHsgR3JhcGhpY1FEYXRhIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzRGF0YSB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0RhdGEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVPcHRpb25zIGFzIE9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5cbmV4cG9ydCBjbGFzcyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSBpbXBsZW1lbnRzIE1pc3NpbmdBbmdsZXNEYXRhIHtcbiAgYW5nbGVzIDogbnVtYmVyW10gLy8gbGlzdCBvZiBhbmdsZXNcbiAgbWlzc2luZyA6IGJvb2xlYW5bXSAvLyB0cnVlIGlmIG1pc3NpbmdcbiAgYW5nbGVTdW0gOiBudW1iZXIgLy8gd2hhdCB0aGUgYW5nbGVzIGFkZCB1cCB0b1xuICBhbmdsZUxhYmVsczogc3RyaW5nW11cblxuICBjb25zdHJ1Y3RvciAoYW5nbGVTdW0gOiBudW1iZXIsIGFuZ2xlczogbnVtYmVyW10sIG1pc3Npbmc6IGJvb2xlYW5bXSwgYW5nbGVMYWJlbHM/OiBzdHJpbmdbXSkge1xuICAgIC8vIGluaXRpYWxpc2VzIHdpdGggYW5nbGVzIGdpdmVuIGV4cGxpY2l0bHlcbiAgICBpZiAoYW5nbGVzID09PSBbXSkgeyB0aHJvdyBuZXcgRXJyb3IoJ011c3QgZ2l2ZSBhbmdsZXMnKSB9XG4gICAgaWYgKE1hdGgucm91bmQoYW5nbGVzLnJlZHVjZSgoeCwgeSkgPT4geCArIHkpKSAhPT0gYW5nbGVTdW0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQW5nbGUgc3VtIG11c3QgYmUgJHthbmdsZVN1bX1gKVxuICAgIH1cblxuICAgIHRoaXMuYW5nbGVzID0gYW5nbGVzIC8vIGxpc3Qgb2YgYW5nbGVzXG4gICAgdGhpcy5taXNzaW5nID0gbWlzc2luZyAvLyB3aGljaCBhbmdsZXMgYXJlIG1pc3NpbmcgLSBhcnJheSBvZiBib29sZWFuc1xuICAgIHRoaXMuYW5nbGVTdW0gPSBhbmdsZVN1bSAvLyBzdW0gb2YgYW5nbGVzXG4gICAgdGhpcy5hbmdsZUxhYmVscyA9IGFuZ2xlTGFiZWxzIHx8IFtdXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IFBhcnRpYWw8T3B0aW9ucz4gPSB7XG4gICAgICAvKiBhbmdsZVN1bTogMTgwICovIC8vIG11c3QgYmUgc2V0IGJ5IGNhbGxlclxuICAgICAgbWluQW5nbGU6IDE1LFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDRcbiAgICB9XG5cbiAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICBsZXQgcXVlc3Rpb24gOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YVxuICAgIGlmIChvcHRpb25zLnJlcGVhdGVkKSB7XG4gICAgICBxdWVzdGlvbiA9IHRoaXMucmFuZG9tUmVwZWF0ZWQob3B0aW9ucylcbiAgICB9IGVsc2Uge1xuICAgICAgcXVlc3Rpb24gPSB0aGlzLnJhbmRvbVNpbXBsZShvcHRpb25zKVxuICAgIH1cbiAgICBxdWVzdGlvbi5pbml0TGFiZWxzKClcbiAgICByZXR1cm4gcXVlc3Rpb25cbiAgfVxuXG4gIHN0YXRpYyByYW5kb21TaW1wbGUgKG9wdGlvbnM6IE9wdGlvbnMpOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB7XG4gICAgaWYgKCFvcHRpb25zLmFuZ2xlU3VtKSB7IHRocm93IG5ldyBFcnJvcignTm8gYW5nbGUgc3VtIGdpdmVuJykgfVxuXG4gICAgY29uc3QgYW5nbGVTdW0gPSBvcHRpb25zLmFuZ2xlU3VtXG4gICAgY29uc3QgbiA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTiwgb3B0aW9ucy5tYXhOKVxuICAgIGNvbnN0IG1pbkFuZ2xlID0gb3B0aW9ucy5taW5BbmdsZVxuXG4gICAgaWYgKG4gPCAyKSB0aHJvdyBuZXcgRXJyb3IoJ0NhblxcJ3QgaGF2ZSBtaXNzaW5nIGZld2VyIHRoYW4gMiBhbmdsZXMnKVxuXG4gICAgLy8gQnVpbGQgdXAgYW5nbGVzXG4gICAgY29uc3QgYW5nbGVzID0gW11cbiAgICBsZXQgbGVmdCA9IGFuZ2xlU3VtXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuIC0gMTsgaSsrKSB7XG4gICAgICBjb25zdCBtYXhBbmdsZSA9IGxlZnQgLSBtaW5BbmdsZSAqIChuIC0gaSAtIDEpXG4gICAgICBjb25zdCBuZXh0QW5nbGUgPSByYW5kQmV0d2VlbihtaW5BbmdsZSwgbWF4QW5nbGUpXG4gICAgICBsZWZ0IC09IG5leHRBbmdsZVxuICAgICAgYW5nbGVzLnB1c2gobmV4dEFuZ2xlKVxuICAgIH1cbiAgICBhbmdsZXNbbiAtIDFdID0gbGVmdFxuXG4gICAgLy8gcGljayBvbmUgdG8gYmUgbWlzc2luZ1xuICAgIGNvbnN0IG1pc3NpbmcgPSBbXVxuICAgIG1pc3NpbmcubGVuZ3RoID0gblxuICAgIG1pc3NpbmcuZmlsbChmYWxzZSlcbiAgICBtaXNzaW5nW3JhbmRCZXR3ZWVuKDAsIG4gLSAxKV0gPSB0cnVlXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZylcbiAgfVxuXG4gIHN0YXRpYyByYW5kb21SZXBlYXRlZCAob3B0aW9uczogT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB7XG4gICAgY29uc3QgYW5nbGVTdW06IG51bWJlciA9IG9wdGlvbnMuYW5nbGVTdW1cbiAgICBjb25zdCBtaW5BbmdsZTogbnVtYmVyID0gb3B0aW9ucy5taW5BbmdsZVxuXG4gICAgY29uc3QgbjogbnVtYmVyID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5OLCBvcHRpb25zLm1heE4pXG5cbiAgICBjb25zdCBtOiBudW1iZXIgPSBvcHRpb25zLm5NaXNzaW5nIHx8IChNYXRoLnJhbmRvbSgpIDwgMC4xID8gbiA6IHJhbmRCZXR3ZWVuKDIsIG4gLSAxKSlcblxuICAgIGlmIChuIDwgMiB8fCBtIDwgMSB8fCBtID4gbikgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGFyZ3VtZW50czogbj0ke259LCBtPSR7bX1gKVxuXG4gICAgLy8gQWxsIG1pc3NpbmcgLSBkbyBhcyBhIHNlcGFyYXRlIGNhc2VcbiAgICBpZiAobiA9PT0gbSkge1xuICAgICAgY29uc3QgYW5nbGVzID0gW11cbiAgICAgIGFuZ2xlcy5sZW5ndGggPSBuXG4gICAgICBhbmdsZXMuZmlsbChhbmdsZVN1bSAvIG4pXG5cbiAgICAgIGNvbnN0IG1pc3NpbmcgPSBbXVxuICAgICAgbWlzc2luZy5sZW5ndGggPSBuXG4gICAgICBtaXNzaW5nLmZpbGwodHJ1ZSlcblxuICAgICAgcmV0dXJuIG5ldyB0aGlzKGFuZ2xlU3VtLCBhbmdsZXMsIG1pc3NpbmcpXG4gICAgfVxuXG4gICAgY29uc3QgYW5nbGVzOiBudW1iZXJbXSA9IFtdXG4gICAgY29uc3QgbWlzc2luZzogYm9vbGVhbltdID0gW11cbiAgICBtaXNzaW5nLmxlbmd0aCA9IG5cbiAgICBtaXNzaW5nLmZpbGwoZmFsc2UpXG5cbiAgICAvLyBjaG9vc2UgYSB2YWx1ZSBmb3IgdGhlIG1pc3NpbmcgYW5nbGVzXG4gICAgY29uc3QgbWF4UmVwZWF0ZWRBbmdsZSA9IChhbmdsZVN1bSAtIG1pbkFuZ2xlICogKG4gLSBtKSkgLyBtXG4gICAgY29uc3QgcmVwZWF0ZWRBbmdsZSA9IHJhbmRCZXR3ZWVuKG1pbkFuZ2xlLCBtYXhSZXBlYXRlZEFuZ2xlKVxuXG4gICAgLy8gY2hvb3NlIHZhbHVlcyBmb3IgdGhlIG90aGVyIGFuZ2xlc1xuICAgIGNvbnN0IG90aGVyQW5nbGVzOiBudW1iZXJbXSA9IFtdXG4gICAgbGV0IGxlZnQgPSBhbmdsZVN1bSAtIHJlcGVhdGVkQW5nbGUgKiBtXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuIC0gbSAtIDE7IGkrKykge1xuICAgICAgY29uc3QgbWF4QW5nbGUgPSBsZWZ0IC0gbWluQW5nbGUgKiAobiAtIG0gLSBpIC0gMSlcbiAgICAgIGNvbnN0IG5leHRBbmdsZSA9IHJhbmRCZXR3ZWVuKG1pbkFuZ2xlLCBtYXhBbmdsZSlcbiAgICAgIGxlZnQgLT0gbmV4dEFuZ2xlXG4gICAgICBvdGhlckFuZ2xlcy5wdXNoKG5leHRBbmdsZSlcbiAgICB9XG4gICAgb3RoZXJBbmdsZXNbbiAtIG0gLSAxXSA9IGxlZnRcblxuICAgIC8vIGNob29zZSB3aGVyZSB0aGUgbWlzc2luZyBhbmdsZXMgYXJlXG4gICAge1xuICAgICAgbGV0IGkgPSAwXG4gICAgICB3aGlsZSAoaSA8IG0pIHtcbiAgICAgICAgY29uc3QgaiA9IHJhbmRCZXR3ZWVuKDAsIG4gLSAxKVxuICAgICAgICBpZiAobWlzc2luZ1tqXSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBtaXNzaW5nW2pdID0gdHJ1ZVxuICAgICAgICAgIGFuZ2xlc1tqXSA9IHJlcGVhdGVkQW5nbGVcbiAgICAgICAgICBpKytcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGZpbGwgaW4gdGhlIG90aGVyIGFuZ2xlc1xuICAgIHtcbiAgICAgIGxldCBqID0gMFxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgaWYgKG1pc3NpbmdbaV0gPT09IGZhbHNlKSB7XG4gICAgICAgICAgYW5nbGVzW2ldID0gb3RoZXJBbmdsZXNbal1cbiAgICAgICAgICBqKytcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZylcbiAgfVxuXG4gIGluaXRMYWJlbHMgKCkgOiB2b2lkIHtcbiAgICBjb25zdCBuID0gdGhpcy5hbmdsZXMubGVuZ3RoXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIGlmICghdGhpcy5taXNzaW5nW2ldKSB7XG4gICAgICAgIHRoaXMuYW5nbGVMYWJlbHNbaV0gPSBgJHt0aGlzLmFuZ2xlc1tpXS50b1N0cmluZygpfV5cXFxcY2lyY2BcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYW5nbGVMYWJlbHNbaV0gPSAneF5cXFxcY2lyYydcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiIsIi8qIFF1ZXN0aW9uIHR5cGUgY29tcHJpc2luZyBudW1lcmljYWwgbWlzc2luZyBhbmdsZXMgYXJvdW5kIGEgcG9pbnQgYW5kXG4gKiBhbmdsZXMgb24gYSBzdHJhaWdodCBsaW5lIChzaW5jZSB0aGVzZSBhcmUgdmVyeSBzaW1pbGFyIG51bWVyaWNhbGx5IGFzIHdlbGxcbiAqIGFzIGdyYXBoaWNhbGx5LlxuICpcbiAqIEFsc28gY292ZXJzIGNhc2VzIHdoZXJlIG1vcmUgdGhhbiBvbmUgYW5nbGUgaXMgZXF1YWxcbiAqXG4gKi9cblxuaW1wb3J0IHsgT3B0aW9uc1NwZWMgfSBmcm9tICdPcHRpb25zU3BlYydcbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZFEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhXG4gIHZpZXc6IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3XG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhLCB2aWV3OiBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldykgeyAvLyBlZmZlY3RpdmVseSBwcml2YXRlXG4gICAgc3VwZXIoKSAvLyBidWJibGVzIHRvIFFcbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgdGhpcy52aWV3ID0gdmlld1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogTWlzc2luZ0FuZ2xlT3B0aW9ucywgdmlld09wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzQXJvdW5kUSB7XG4gICAgY29uc3QgZGVmYXVsdHMgOiBNaXNzaW5nQW5nbGVPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAxMCxcbiAgICAgIG1pbk46IDIsXG4gICAgICBtYXhOOiA0LFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlXG4gICAgfVxuICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3KGRhdGEsIHZpZXdPcHRpb25zKSAvLyBUT0RPIGVsaW1pbmF0ZSBwdWJsaWMgY29uc3RydWN0b3JzXG5cbiAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRRKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBHcmFwaGljUVZpZXcsIExhYmVsIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgeyBzaW5EZWcsIGRhc2hlZExpbmUsIHJvdW5kRFAgfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICBBIDogUG9pbnQgLy8gdGhlIHZlcnRpY2VzIG9mIHRoZSB0cmlhbmdsZVxuICBCIDogUG9pbnRcbiAgQyA6IFBvaW50XG4gIHJvdGF0aW9uOiBudW1iZXJcbiAgLy8gSW5oZXJpdGVkIG1lbWJlcnM6XG4gIGxhYmVsczogTGFiZWxbXVxuICBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50XG4gIERPTTogSFRNTEVsZW1lbnRcbiAgd2lkdGg6IG51bWJlclxuICBoZWlnaHQ6IG51bWJlclxuICBkYXRhOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhXG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEsIG9wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc2V0cyB0aGlzLndpZHRoIHRoaXMuaGVpZ2h0LCB0aGlzLmRhdGEgaW5pdGlhbGlzZXMgdGhpcy5sYWJlbHMsIGNyZWF0ZXMgZG9tIGVsZW1lbnRzXG4gICAgY29uc3Qgd2lkdGggPSB0aGlzLndpZHRoXG4gICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5oZWlnaHRcblxuICAgIC8vIGdlbmVyYXRlIHBvaW50cyAod2l0aCBsb25nZXN0IHNpZGUgMVxuICAgIHRoaXMuQSA9IG5ldyBQb2ludCgwLCAwKVxuICAgIHRoaXMuQiA9IFBvaW50LmZyb21Qb2xhckRlZygxLCBkYXRhLmFuZ2xlc1swXSlcbiAgICB0aGlzLkMgPSBuZXcgUG9pbnQoXG4gICAgICBzaW5EZWcodGhpcy5kYXRhLmFuZ2xlc1sxXSkgLyBzaW5EZWcodGhpcy5kYXRhLmFuZ2xlc1syXSksIDBcbiAgICApXG5cbiAgICAvLyBDcmVhdGUgbGFiZWxzXG4gICAgY29uc3QgaW5DZW50ZXIgPSBQb2ludC5pbkNlbnRlcih0aGlzLkEsIHRoaXMuQiwgdGhpcy5DKVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGNvbnN0IHAgPSBbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ11baV1cblxuICAgICAgY29uc3QgbGFiZWwgOiBQYXJ0aWFsPExhYmVsPiA9IHtcbiAgICAgICAgdGV4dHE6IHRoaXMuZGF0YS5hbmdsZUxhYmVsc1tpXSxcbiAgICAgICAgdGV4dDogdGhpcy5kYXRhLmFuZ2xlTGFiZWxzW2ldLFxuICAgICAgICBzdHlsZXE6ICdub3JtYWwnLFxuICAgICAgICBzdHlsZTogJ25vcm1hbCcsXG4gICAgICAgIHBvczogUG9pbnQubWVhbihwLCBwLCBpbkNlbnRlcilcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuZGF0YS5taXNzaW5nW2ldKSB7XG4gICAgICAgIGxhYmVsLnRleHRhID0gcm91bmREUCh0aGlzLmRhdGEuYW5nbGVzW2ldLCAyKS50b1N0cmluZygpICsgJ15cXFxcY2lyYydcbiAgICAgICAgbGFiZWwuc3R5bGVhID0gJ2Fuc3dlcidcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxhYmVsLnRleHRhID0gbGFiZWwudGV4dHFcbiAgICAgICAgbGFiZWwuc3R5bGVhID0gbGFiZWwuc3R5bGVxXG4gICAgICB9XG5cbiAgICAgIHRoaXMubGFiZWxzW2ldID0gbGFiZWwgYXMgTGFiZWxcbiAgICB9XG5cbiAgICAvLyByb3RhdGUgcmFuZG9tbHlcbiAgICB0aGlzLnJvdGF0aW9uID0gKG9wdGlvbnMucm90YXRpb24gIT09IHVuZGVmaW5lZCkgPyB0aGlzLnJvdGF0ZShvcHRpb25zLnJvdGF0aW9uKSA6IHRoaXMucmFuZG9tUm90YXRlKClcblxuICAgIC8vIHNjYWxlIGFuZCBmaXRcbiAgICAvLyBzY2FsZSB0byBzaXplXG4gICAgY29uc3QgbWFyZ2luID0gMFxuICAgIGxldCB0b3BsZWZ0ID0gUG9pbnQubWluKFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBsZXQgYm90dG9tcmlnaHQgPSBQb2ludC5tYXgoW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGNvbnN0IHRvdGFsV2lkdGggPSBib3R0b21yaWdodC54IC0gdG9wbGVmdC54XG4gICAgY29uc3QgdG90YWxIZWlnaHQgPSBib3R0b21yaWdodC55IC0gdG9wbGVmdC55XG4gICAgdGhpcy5zY2FsZShNYXRoLm1pbigod2lkdGggLSBtYXJnaW4pIC8gdG90YWxXaWR0aCwgKGhlaWdodCAtIG1hcmdpbikgLyB0b3RhbEhlaWdodCkpIC8vIDE1cHggbWFyZ2luXG5cbiAgICAvLyBtb3ZlIHRvIGNlbnRyZVxuICAgIHRvcGxlZnQgPSBQb2ludC5taW4oW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGJvdHRvbXJpZ2h0ID0gUG9pbnQubWF4KFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBjb25zdCBjZW50ZXIgPSBQb2ludC5tZWFuKHRvcGxlZnQsIGJvdHRvbXJpZ2h0KVxuICAgIHRoaXMudHJhbnNsYXRlKHdpZHRoIC8gMiAtIGNlbnRlci54LCBoZWlnaHQgLyAyIC0gY2VudGVyLnkpIC8vIGNlbnRyZVxuICB9XG5cbiAgcmVuZGVyICgpIDogdm9pZCB7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICAgIGNvbnN0IHZlcnRpY2VzID0gW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdXG4gICAgY29uc3QgYXBleCA9IHRoaXMuZGF0YS5hcGV4IC8vIGhtbW1cblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGN0eC5tb3ZlVG8odGhpcy5BLngsIHRoaXMuQS55KVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGNvbnN0IHAgPSB2ZXJ0aWNlc1tpXVxuICAgICAgY29uc3QgbmV4dCA9IHZlcnRpY2VzWyhpICsgMSkgJSAzXVxuICAgICAgaWYgKGFwZXggPT09IGkgfHwgYXBleCA9PT0gKGkgKyAxKSAlIDMpIHsgLy8gdG8vZnJvbSBhcGV4IC0gZHJhdyBkYXNoZWQgbGluZVxuICAgICAgICBkYXNoZWRMaW5lKGN0eCwgcC54LCBwLnksIG5leHQueCwgbmV4dC55KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3R4LmxpbmVUbyhuZXh0LngsIG5leHQueSlcbiAgICAgIH1cbiAgICB9XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gJ2dyYXknXG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGdldCBhbGxwb2ludHMgKCkgOiBQb2ludFtdIHtcbiAgICBjb25zdCBhbGxwb2ludHMgPSBbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ11cbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4geyBhbGxwb2ludHMucHVzaChsLnBvcykgfSlcbiAgICByZXR1cm4gYWxscG9pbnRzXG4gIH1cbn1cbiIsIi8qIEV4dGVuZHMgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgaW4gb3JkZXIgdG8gZG8gaXNvc2NlbGVzIHRyaWFuZ2xlcywgd2hpY2ggZ2VuZXJhdGUgYSBiaXQgZGlmZmVyZW50bHkgKi9cblxuaW1wb3J0IHsgZmlyc3RVbmlxdWVJbmRleCB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5cbnR5cGUgT3B0aW9ucyA9IE1pc3NpbmdBbmdsZU9wdGlvbnMgJiB7Z2l2ZW5BbmdsZT86ICdhcGV4JyB8ICdiYXNlJ31cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBleHRlbmRzIE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBhcGV4PzogMCB8IDEgfCAyIHwgdW5kZWZpbmVkIC8vIHdoaWNoIG9mIHRoZSB0aHJlZSBnaXZlbiBhbmdsZXMgaXMgdGhlIGFwZXggb2YgYW4gaXNvc2NlbGVzIHRyaWFuZ2xlXG4gICAgY29uc3RydWN0b3IgKGFuZ2xlU3VtOiBudW1iZXIsIGFuZ2xlczogbnVtYmVyW10sIG1pc3Npbmc6IGJvb2xlYW5bXSwgYW5nbGVMYWJlbHM/OiBzdHJpbmdbXSwgYXBleD86IDB8MXwyfHVuZGVmaW5lZCkge1xuICAgICAgc3VwZXIoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZywgYW5nbGVMYWJlbHMpXG4gICAgICB0aGlzLmFwZXggPSBhcGV4XG4gICAgfVxuXG4gICAgc3RhdGljIHJhbmRvbVJlcGVhdGVkIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEge1xuICAgICAgb3B0aW9ucy5uTWlzc2luZyA9IDJcbiAgICAgIG9wdGlvbnMuZ2l2ZW5BbmdsZSA9IG9wdGlvbnMuZ2l2ZW5BbmdsZSB8fCBNYXRoLnJhbmRvbSgpIDwgMC41ID8gJ2FwZXgnIDogJ2Jhc2UnXG5cbiAgICAgIC8vIGdlbmVyYXRlIHRoZSByYW5kb20gYW5nbGVzIHdpdGggcmVwZXRpdGlvbiBmaXJzdCBiZWZvcmUgbWFya2luZyBhcGV4IGZvciBkcmF3aW5nXG4gICAgICBjb25zdCBxdWVzdGlvbiA9IHN1cGVyLnJhbmRvbVJlcGVhdGVkKG9wdGlvbnMpIGFzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEgLy8gYWxsb3dlZCBzaW5jZSB1bmRlZmluZWQgXFxpbiBhcGV4XG5cbiAgICAgIC8vIE9sZCBpbXBsZW1lbnRhdGlvbiBoYWQgc29ydGluZyB0aGUgYXJyYXkgLSBub3Qgc3VyZSB3aHlcbiAgICAgIC8vIHNvcnRUb2dldGhlcihxdWVzdGlvbi5hbmdsZXMscXVlc3Rpb24ubWlzc2luZywoeCx5KSA9PiB4IC0geSlcblxuICAgICAgcXVlc3Rpb24uYXBleCA9IGZpcnN0VW5pcXVlSW5kZXgocXVlc3Rpb24uYW5nbGVzKSBhcyAwIHwgMSB8IDJcbiAgICAgIHF1ZXN0aW9uLm1pc3NpbmcgPSBbdHJ1ZSwgdHJ1ZSwgdHJ1ZV1cblxuICAgICAgaWYgKG9wdGlvbnMuZ2l2ZW5BbmdsZSA9PT0gJ2FwZXgnKSB7XG4gICAgICAgIHF1ZXN0aW9uLm1pc3NpbmdbcXVlc3Rpb24uYXBleF0gPSBmYWxzZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcXVlc3Rpb24ubWlzc2luZ1socXVlc3Rpb24uYXBleCArIDEpICUgM10gPSBmYWxzZVxuICAgICAgfVxuXG4gICAgICBxdWVzdGlvbi5pbml0TGFiZWxzKClcblxuICAgICAgcmV0dXJuIHF1ZXN0aW9uXG4gICAgfVxuXG4gICAgaW5pdExhYmVscyAoKTogdm9pZCB7XG4gICAgICBjb25zdCBuID0gdGhpcy5hbmdsZXMubGVuZ3RoXG4gICAgICBsZXQgaiA9IDAgLy8ga2VlcCB0cmFjayBvZiB1bmtub3duc1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgaWYgKCF0aGlzLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzW2ldID0gYCR7dGhpcy5hbmdsZXNbaV0udG9TdHJpbmcoKX1eXFxcXGNpcmNgXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5hbmdsZUxhYmVsc1tpXSA9IGAke1N0cmluZy5mcm9tQ2hhckNvZGUoMTIwICsgail9XlxcXFxjaXJjYCAvLyAxMjAgPSAneCdcbiAgICAgICAgICBqKytcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbn1cbiIsIi8qIE1pc3NpbmcgYW5nbGVzIGluIHRyaWFuZ2xlIC0gbnVtZXJpY2FsICovXG5cbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGNvbnN0cnVjdG9yIChkYXRhLCB2aWV3LCBvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucykgLy8gdGhpcyBzaG91bGQgYmUgYWxsIHRoYXQncyByZXF1aXJlZCB3aGVuIHJlZmFjdG9yZWRcbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgdGhpcy52aWV3ID0gdmlld1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9ucywgdmlld09wdGlvbnMpIHtcbiAgICBjb25zdCBvcHRpb25zT3ZlcnJpZGUgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDI1LFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDNcbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24ob3B0aW9ucywgb3B0aW9uc092ZXJyaWRlKVxuICAgIG9wdGlvbnMucmVwZWF0ZWQgPSBvcHRpb25zLnJlcGVhdGVkIHx8IGZhbHNlXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcoZGF0YSwgdmlld09wdGlvbnMpXG5cbiAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEoZGF0YSwgdmlldywgb3B0aW9ucylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIExpbkV4cHIge1xuLy8gY2xhc3MgTGluRXhwciB7XG4gIGNvbnN0cnVjdG9yIChhLCBiKSB7XG4gICAgdGhpcy5hID0gYVxuICAgIHRoaXMuYiA9IGJcbiAgfVxuXG4gIGlzQ29uc3RhbnQgKCkge1xuICAgIHJldHVybiB0aGlzLmEgPT09IDBcbiAgfVxuXG4gIHRvU3RyaW5nICgpIHtcbiAgICBsZXQgc3RyaW5nID0gJydcblxuICAgIC8vIHggdGVybVxuICAgIGlmICh0aGlzLmEgPT09IDEpIHsgc3RyaW5nICs9ICd4JyB9IGVsc2UgaWYgKHRoaXMuYSA9PT0gLTEpIHsgc3RyaW5nICs9ICcteCcgfSBlbHNlIGlmICh0aGlzLmEgIT09IDApIHsgc3RyaW5nICs9IHRoaXMuYSArICd4JyB9XG5cbiAgICAvLyBzaWduXG4gICAgaWYgKHRoaXMuYSAhPT0gMCAmJiB0aGlzLmIgPiAwKSB7IHN0cmluZyArPSAnICsgJyB9IGVsc2UgaWYgKHRoaXMuYSAhPT0gMCAmJiB0aGlzLmIgPCAwKSB7IHN0cmluZyArPSAnIC0gJyB9XG5cbiAgICAvLyBjb25zdGFudFxuICAgIGlmICh0aGlzLmIgPiAwKSB7IHN0cmluZyArPSB0aGlzLmIgfSBlbHNlIGlmICh0aGlzLmIgPCAwICYmIHRoaXMuYSA9PT0gMCkgeyBzdHJpbmcgKz0gdGhpcy5iIH0gZWxzZSBpZiAodGhpcy5iIDwgMCkgeyBzdHJpbmcgKz0gTWF0aC5hYnModGhpcy5iKSB9XG5cbiAgICByZXR1cm4gc3RyaW5nXG4gIH1cblxuICB0b1N0cmluZ1AgKCkge1xuICAgIC8vIHJldHVybiBleHByZXNzaW9uIGFzIGEgc3RyaW5nLCBzdXJyb3VuZGVkIGluIHBhcmVudGhlc2VzIGlmIGEgYmlub21pYWxcbiAgICBpZiAodGhpcy5hID09PSAwIHx8IHRoaXMuYiA9PT0gMCkgcmV0dXJuIHRoaXMudG9TdHJpbmcoKVxuICAgIGVsc2UgcmV0dXJuICcoJyArIHRoaXMudG9TdHJpbmcoKSArICcpJ1xuICB9XG5cbiAgZXZhbCAoeCkge1xuICAgIHJldHVybiB0aGlzLmEgKiB4ICsgdGhpcy5iXG4gIH1cblxuICBhZGQgKHRoYXQpIHtcbiAgICAvLyBhZGQgZWl0aGVyIGFuIGV4cHJlc3Npb24gb3IgYSBjb25zdGFudFxuICAgIGlmICh0aGF0LmEgIT09IHVuZGVmaW5lZCkgcmV0dXJuIG5ldyBMaW5FeHByKHRoaXMuYSArIHRoYXQuYSwgdGhpcy5iICsgdGhhdC5iKVxuICAgIGVsc2UgcmV0dXJuIG5ldyBMaW5FeHByKHRoaXMuYSwgdGhpcy5iICsgdGhhdClcbiAgfVxuXG4gIHRpbWVzICh0aGF0KSB7XG4gICAgcmV0dXJuIG5ldyBMaW5FeHByKHRoaXMuYSAqIHRoYXQsIHRoaXMuYiAqIHRoYXQpXG4gIH1cblxuICBzdGF0aWMgc29sdmUgKGV4cHIxLCBleHByMikge1xuICAgIC8vIHNvbHZlcyB0aGUgdHdvIGV4cHJlc3Npb25zIHNldCBlcXVhbCB0byBlYWNoIG90aGVyXG4gICAgcmV0dXJuIChleHByMi5iIC0gZXhwcjEuYikgLyAoZXhwcjEuYSAtIGV4cHIyLmEpXG4gIH1cbn1cbiIsImltcG9ydCBMaW5FeHByIGZyb20gJ0xpbkV4cHInXG5cbi8qKiBHaXZlbiBhIHNldCBvZiBleHByZXNzaW9ucywgc2V0IHRoZWlyIHN1bSAgKi9cblxuZXhwb3J0IGZ1bmN0aW9uIHNvbHZlQW5nbGVzIChleHByZXNzaW9uczogTGluRXhwcltdLCBhbmdsZVN1bTogbnVtYmVyKTogeyB4OiBudW1iZXI7IGFuZ2xlczogbnVtYmVyW107IH0ge1xuICBjb25zdCBleHByZXNzaW9uU3VtID0gZXhwcmVzc2lvbnMucmVkdWNlKChleHAxLCBleHAyKSA9PiBleHAxLmFkZChleHAyKSlcbiAgY29uc3QgeCA9IExpbkV4cHIuc29sdmUoZXhwcmVzc2lvblN1bSwgbmV3IExpbkV4cHIoMCwgYW5nbGVTdW0pKVxuXG4gIGNvbnN0IGFuZ2xlcyA9IFtdXG4gIGV4cHJlc3Npb25zLmZvckVhY2goZnVuY3Rpb24gKGV4cHIpIHtcbiAgICBjb25zdCBhbmdsZSA9IGV4cHIuZXZhbCh4KVxuICAgIGlmIChhbmdsZSA8PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ25lZ2F0aXZlIGFuZ2xlJylcbiAgICB9IGVsc2Uge1xuICAgICAgYW5nbGVzLnB1c2goZXhwci5ldmFsKHgpKVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gKHsgeDogeCwgYW5nbGVzOiBhbmdsZXMgfSlcbn1cbiIsImltcG9ydCBMaW5FeHByIGZyb20gJ0xpbkV4cHInXG5pbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4sIHJhbmRFbGVtLCByYW5kTXVsdEJldHdlZW4sIHNodWZmbGUsIHdlYWtJbmNsdWRlcyB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCB7IEFsZ2VicmFPcHRpb25zIH0gZnJvbSAnLi9BbGdlYnJhT3B0aW9ucydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzRGF0YSdcbmltcG9ydCB7IHNvbHZlQW5nbGVzIH0gZnJvbSAnLi9zb2x2ZUFuZ2xlcydcblxudHlwZSBPcHRpb25zID0gQWxnZWJyYU9wdGlvbnNcblxuZXhwb3J0IHR5cGUgRXhwcmVzc2lvblR5cGUgPSAnYWRkJyB8ICdtdWx0aXBseScgfCAnbWl4ZWQnXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgaW1wbGVtZW50cyBNaXNzaW5nQW5nbGVzRGF0YSB7XG4gICAgYW5nbGVzOiBudW1iZXJbXVxuICAgIG1pc3Npbmc6IGJvb2xlYW5bXVxuICAgIGFuZ2xlU3VtOiBudW1iZXJcbiAgICBhbmdsZUxhYmVsczogc3RyaW5nW11cbiAgICB4OiBudW1iZXIgLy9cblxuICAgIGNvbnN0cnVjdG9yIChhbmdsZXM6IG51bWJlcltdLCBtaXNzaW5nOiBib29sZWFuW10sIGFuZ2xlU3VtOiBudW1iZXIsIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSwgeDogbnVtYmVyKSB7XG4gICAgICB0aGlzLmFuZ2xlcyA9IGFuZ2xlc1xuICAgICAgdGhpcy5hbmdsZVN1bSA9IGFuZ2xlU3VtXG4gICAgICB0aGlzLmFuZ2xlTGFiZWxzID0gYW5nbGVMYWJlbHNcbiAgICAgIHRoaXMueCA9IHhcbiAgICAgIHRoaXMubWlzc2luZyA9IG1pc3NpbmdcbiAgICB9XG5cbiAgICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSB7XG4gICAgICBjb25zdCBkZWZhdWx0cyA6IFBhcnRpYWw8T3B0aW9ucz4gPSB7XG4gICAgICAgIGV4cHJlc3Npb25UeXBlczogWydhZGQnLCAnbXVsdGlwbHknLCAnbWl4ZWQnXSxcbiAgICAgICAgZW5zdXJlWDogdHJ1ZSxcbiAgICAgICAgaW5jbHVkZUNvbnN0YW50czogdHJ1ZSxcbiAgICAgICAgbWluQ29lZmZpY2llbnQ6IDEsXG4gICAgICAgIG1heENvZWZmaWNpZW50OiA0LFxuICAgICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgICBtaW5BbmdsZTogMjAsXG4gICAgICAgIG1pbk46IDIsXG4gICAgICAgIG1heE46IDQsXG4gICAgICAgIG1pblhWYWx1ZTogMTVcbiAgICAgIH1cbiAgICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgICAgLy8gYXNzaWduIGNhbGN1bGF0ZWQgZGVmYXVsdHM6XG4gICAgICBvcHRpb25zLm1heENvbnN0YW50ID0gb3B0aW9ucy5tYXhDb25zdGFudCB8fCBvcHRpb25zLmFuZ2xlU3VtIC8gMlxuICAgICAgb3B0aW9ucy5tYXhYVmFsdWUgPSBvcHRpb25zLm1heFhWYWx1ZSB8fCBvcHRpb25zLmFuZ2xlU3VtIC8gNFxuXG4gICAgICAvLyBSYW5kb21pc2Uvc2V0IHVwIG1haW4gZmVhdHVyZXNcbiAgICAgIGNvbnN0IG4gOiBudW1iZXIgPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbk4sIG9wdGlvbnMubWF4TilcblxuICAgICAgY29uc3QgdHlwZSA6IEV4cHJlc3Npb25UeXBlID0gcmFuZEVsZW0ob3B0aW9ucy5leHByZXNzaW9uVHlwZXMpXG5cbiAgICAgIC8vIEdlbmVyYXRlIGV4cHJlc3Npb25zL2FuZ2xlc1xuICAgICAgbGV0IGV4cHJlc3Npb25zIDogTGluRXhwcltdXG4gICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSAnbWl4ZWQnOlxuICAgICAgICAgIGV4cHJlc3Npb25zID0gbWFrZU1peGVkRXhwcmVzc2lvbnMobiwgb3B0aW9ucylcbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICdtdWx0aXBseSc6XG4gICAgICAgICAgZXhwcmVzc2lvbnMgPSBtYWtlTXVsdGlwbGljYXRpb25FeHByZXNzaW9ucyhuLCBvcHRpb25zKVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ2FkZCc6XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgZXhwcmVzc2lvbnMgPSBtYWtlQWRkRXhwcmVzc2lvbnMobiwgb3B0aW9ucylcbiAgICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgZXhwcmVzc2lvbnMgPSBzaHVmZmxlKGV4cHJlc3Npb25zKVxuXG4gICAgICAvLyBTb2x2ZSBmb3IgeCBhbmQgYW5nbGVzXG4gICAgICBjb25zdCB7IHgsIGFuZ2xlcyB9IDoge3g6bnVtYmVyLCBhbmdsZXM6IG51bWJlcltdfSA9IHNvbHZlQW5nbGVzKGV4cHJlc3Npb25zLCBvcHRpb25zLmFuZ2xlU3VtKVxuXG4gICAgICAvLyBsYWJlbHMgYXJlIGp1c3QgZXhwcmVzc2lvbnMgYXMgc3RyaW5nc1xuICAgICAgY29uc3QgbGFiZWxzID0gZXhwcmVzc2lvbnMubWFwKGUgPT4gYCR7ZS50b1N0cmluZ1AoKX1eXFxcXGNpcmNgKVxuXG4gICAgICAvLyBtaXNzaW5nIHZhbHVlcyBhcmUgdGhlIG9uZXMgd2hpY2ggYXJlbid0IGNvbnN0YW50XG4gICAgICBjb25zdCBtaXNzaW5nID0gZXhwcmVzc2lvbnMubWFwKGUgPT4gIWUuaXNDb25zdGFudCgpKVxuXG4gICAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YShhbmdsZXMsIG1pc3NpbmcsIG9wdGlvbnMuYW5nbGVTdW0sIGxhYmVscywgeClcbiAgICB9XG5cbiAgICAvLyBtYWtlcyB0eXBlc2NyaXB0IHNodXQgdXAsIG1ha2VzIGVzbGludCBub2lzeVxuICAgIGluaXRMYWJlbHMgKCkgOiB2b2lkIHt9ICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG59XG5cbmZ1bmN0aW9uIG1ha2VNaXhlZEV4cHJlc3Npb25zIChuOiBudW1iZXIsIG9wdGlvbnM6IE9wdGlvbnMpIDogTGluRXhwcltdIHtcbiAgY29uc3QgZXhwcmVzc2lvbnM6IExpbkV4cHJbXSA9IFtdXG4gIGNvbnN0IHggPSByYW5kQmV0d2VlbihvcHRpb25zLm1pblhWYWx1ZSwgb3B0aW9ucy5tYXhYVmFsdWUpXG4gIGxldCBsZWZ0ID0gb3B0aW9ucy5hbmdsZVN1bVxuICBsZXQgYWxsY29uc3RhbnQgPSB0cnVlXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbiAtIDE7IGkrKykge1xuICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbigxLCBvcHRpb25zLm1heENvZWZmaWNpZW50KVxuICAgIGxlZnQgLT0gYSAqIHhcbiAgICBjb25zdCBtYXhiID0gTWF0aC5taW4obGVmdCAtIG9wdGlvbnMubWluQW5nbGUgKiAobiAtIGkgLSAxKSwgb3B0aW9ucy5tYXhDb25zdGFudClcbiAgICBjb25zdCBtaW5iID0gb3B0aW9ucy5taW5BbmdsZSAtIGEgKiB4XG4gICAgY29uc3QgYiA9IHJhbmRCZXR3ZWVuKG1pbmIsIG1heGIpXG4gICAgaWYgKGEgIT09IDApIHsgYWxsY29uc3RhbnQgPSBmYWxzZSB9XG4gICAgbGVmdCAtPSBiXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihhLCBiKSlcbiAgfVxuICBjb25zdCBsYXN0TWluWENvZWZmID0gYWxsY29uc3RhbnQgPyAxIDogb3B0aW9ucy5taW5Db2VmZmljaWVudFxuICBjb25zdCBhID0gcmFuZEJldHdlZW4obGFzdE1pblhDb2VmZiwgb3B0aW9ucy5tYXhDb2VmZmljaWVudClcbiAgY29uc3QgYiA9IGxlZnQgLSBhICogeFxuICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKGEsIGIpKVxuXG4gIHJldHVybiBleHByZXNzaW9uc1xufVxuXG5mdW5jdGlvbiBtYWtlQWRkRXhwcmVzc2lvbnMgKG46IG51bWJlciwgb3B0aW9uczogT3B0aW9ucykgOiBMaW5FeHByW10ge1xuICBjb25zdCBleHByZXNzaW9uczogTGluRXhwcltdID0gW11cbiAgY29uc3QgYW5nbGVzOiBudW1iZXJbXSA9IFtdXG4gIGNvbnN0IGNvbnN0YW50cyA9IChvcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPT09IHRydWUgfHwgd2Vha0luY2x1ZGVzKG9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cywgJ2FkZCcpKVxuICBpZiAobiA9PT0gMiAmJiBvcHRpb25zLmVuc3VyZVggJiYgY29uc3RhbnRzKSBuID0gM1xuXG4gIGNvbnN0IHggPSByYW5kQmV0d2VlbihvcHRpb25zLm1pblhWYWx1ZSwgb3B0aW9ucy5tYXhYVmFsdWUpXG4gIGxldCBsZWZ0ID0gb3B0aW9ucy5hbmdsZVN1bVxuICBsZXQgYW5nbGVzTGVmdCA9IG5cblxuICAvLyBmaXJzdCBkbyB0aGUgZXhwcmVzc2lvbnMgZW5zdXJlZCBieSBlbnN1cmVfeCBhbmQgY29uc3RhbnRzXG4gIGlmIChvcHRpb25zLmVuc3VyZVgpIHtcbiAgICBhbmdsZXNMZWZ0LS1cbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKVxuICAgIGFuZ2xlcy5wdXNoKHgpXG4gICAgbGVmdCAtPSB4XG4gIH1cblxuICBpZiAoY29uc3RhbnRzKSB7XG4gICAgYW5nbGVzTGVmdC0tXG4gICAgY29uc3QgYyA9IHJhbmRCZXR3ZWVuKFxuICAgICAgb3B0aW9ucy5taW5BbmdsZSxcbiAgICAgIGxlZnQgLSBvcHRpb25zLm1pbkFuZ2xlICogYW5nbGVzTGVmdFxuICAgIClcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDAsIGMpKVxuICAgIGFuZ2xlcy5wdXNoKGMpXG4gICAgbGVmdCAtPSBjXG4gIH1cblxuICAvLyBtaWRkbGUgYW5nbGVzXG4gIHdoaWxlIChhbmdsZXNMZWZ0ID4gMSkge1xuICAgIC8vIGFkZCAneCtiJyBhcyBhbiBleHByZXNzaW9uLiBNYWtlIHN1cmUgYiBnaXZlcyBzcGFjZVxuICAgIGFuZ2xlc0xlZnQtLVxuICAgIGxlZnQgLT0geFxuICAgIGNvbnN0IG1heGIgPSBNYXRoLm1pbihcbiAgICAgIGxlZnQgLSBvcHRpb25zLm1pbkFuZ2xlICogYW5nbGVzTGVmdCxcbiAgICAgIG9wdGlvbnMubWF4Q29uc3RhbnRcbiAgICApXG4gICAgY29uc3QgbWluYiA9IE1hdGgubWF4KFxuICAgICAgb3B0aW9ucy5taW5BbmdsZSAtIHgsXG4gICAgICAtb3B0aW9ucy5tYXhDb25zdGFudFxuICAgIClcbiAgICBjb25zdCBiID0gcmFuZEJldHdlZW4obWluYiwgbWF4YilcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIGIpKVxuICAgIGFuZ2xlcy5wdXNoKHggKyBiKVxuICAgIGxlZnQgLT0gYlxuICB9XG5cbiAgLy8gbGFzdCBhbmdsZVxuICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIGxlZnQgLSB4KSlcbiAgYW5nbGVzLnB1c2gobGVmdClcblxuICByZXR1cm4gZXhwcmVzc2lvbnNcbn1cblxuZnVuY3Rpb24gbWFrZU11bHRpcGxpY2F0aW9uRXhwcmVzc2lvbnMgKG46IG51bWJlciwgb3B0aW9uczogT3B0aW9ucykgOiBMaW5FeHByW10ge1xuICBjb25zdCBleHByZXNzaW9ucyA6IExpbkV4cHJbXSA9IFtdXG5cbiAgY29uc3QgY29uc3RhbnRzIDogYm9vbGVhbiA9IChvcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPT09IHRydWUgfHwgd2Vha0luY2x1ZGVzKG9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cywgJ211bHQnKSlcbiAgaWYgKG4gPT09IDIgJiYgb3B0aW9ucy5lbnN1cmVYICYmIGNvbnN0YW50cykgbiA9IDMgLy8gbmVlZCBhdCBsZWFzdCAzIGFuZ2xlcyBmb3IgdGhpcyB0byBtYWtlIHNlbnNlXG5cbiAgLy8gY2hvb3NlIGEgdG90YWwgb2YgY29lZmZpY2llbnRzXG4gIC8vIHBpY2sgeCBiYXNlZCBvbiB0aGF0XG4gIGxldCBhbmdsZXNsZWZ0ID0gblxuICBjb25zdCB0b3RhbENvZWZmID0gY29uc3RhbnRzXG4gICAgPyByYW5kQmV0d2VlbihuLCAob3B0aW9ucy5hbmdsZVN1bSAtIG9wdGlvbnMubWluQW5nbGUpIC8gb3B0aW9ucy5taW5BbmdsZSwgTWF0aC5yYW5kb20pIC8vIGlmIGl0J3MgdG9vIGJpZywgYW5nbGVzIGdldCB0b28gc21hbGxcbiAgICA6IHJhbmRFbGVtKFszLCA0LCA1LCA2LCA4LCA5LCAxMF0uZmlsdGVyKHggPT4geCA+PSBuKSwgTWF0aC5yYW5kb20pXG4gIGxldCBjb2VmZmxlZnQgPSB0b3RhbENvZWZmXG5cbiAgLy8gZmlyc3QgMC8xLzJcbiAgaWYgKGNvbnN0YW50cykge1xuICAgIC8vIHJlZHVjZSB0byBtYWtlIHdoYXQncyBsZWZ0IGEgbXVsdGlwbGUgb2YgdG90YWxfY29lZmZcbiAgICBhbmdsZXNsZWZ0LS1cbiAgICBjb25zdCBuZXdsZWZ0ID0gcmFuZE11bHRCZXR3ZWVuKHRvdGFsQ29lZmYgKiBvcHRpb25zLm1pbkFuZ2xlLCBvcHRpb25zLmFuZ2xlU3VtIC0gb3B0aW9ucy5taW5BbmdsZSwgdG90YWxDb2VmZilcbiAgICBjb25zdCBjID0gb3B0aW9ucy5hbmdsZVN1bSAtIG5ld2xlZnRcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDAsIGMpKVxuICB9XG5cbiAgLy8gRG9uJ3QgdXNlIHggaGVyZSwgYnV0OlxuICAvLyB4ID0gbGVmdCAvIHRvdGFsQ29lZmZcblxuICBpZiAob3B0aW9ucy5lbnN1cmVYKSB7XG4gICAgYW5nbGVzbGVmdC0tXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCAwKSlcbiAgICBjb2VmZmxlZnQgLT0gMVxuICB9XG5cbiAgLy8gbWlkZGxlXG4gIHdoaWxlIChhbmdsZXNsZWZ0ID4gMSkge1xuICAgIGFuZ2xlc2xlZnQtLVxuICAgIGNvbnN0IG1pbmEgPSAxXG4gICAgY29uc3QgbWF4YSA9IGNvZWZmbGVmdCAtIGFuZ2xlc2xlZnQgLy8gbGVhdmUgZW5vdWdoIGZvciBvdGhlcnMgVE9ETzogYWRkIG1heF9jb2VmZlxuICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbihtaW5hLCBtYXhhKVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoYSwgMCkpXG4gICAgY29lZmZsZWZ0IC09IGFcbiAgfVxuXG4gIC8vIGxhc3RcbiAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihjb2VmZmxlZnQsIDApKVxuICByZXR1cm4gZXhwcmVzc2lvbnNcbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3IGV4dGVuZHMgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcge1xuICAgIE8gOiBQb2ludFxuICAgIEE6IFBvaW50XG4gICAgQzogUG9pbnRbXVxuICAgIGxhYmVsczogTGFiZWxbXVxuICAgIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnRcbiAgICBET006IEhUTUxFbGVtZW50XG4gICAgcm90YXRpb246IG51bWJlclxuICAgIHdpZHRoOiBudW1iZXJcbiAgICBoZWlnaHQ6IG51bWJlclxuICAgIGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YVxuXG4gICAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSwgb3B0aW9uczogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSB7XG4gICAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBzdXBlciBjb25zdHJ1Y3RvciBkb2VzIHJlYWwgd29ya1xuICAgICAgY29uc3Qgc29sdXRpb25MYWJlbDogUGFydGlhbDxMYWJlbD4gPSB7XG4gICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwKSxcbiAgICAgICAgdGV4dHE6ICcnLFxuICAgICAgICB0ZXh0YTogYHggPSAke3RoaXMuZGF0YS54fV5cXFxcY2lyY2AsXG4gICAgICAgIHN0eWxlcTogJ2hpZGRlbicsXG4gICAgICAgIHN0eWxlYTogJ2V4dHJhLWFuc3dlcidcbiAgICAgIH1cbiAgICAgIHNvbHV0aW9uTGFiZWwuc3R5bGUgPSBzb2x1dGlvbkxhYmVsLnN0eWxlcVxuICAgICAgc29sdXRpb25MYWJlbC50ZXh0ID0gc29sdXRpb25MYWJlbC50ZXh0cVxuXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKHNvbHV0aW9uTGFiZWwgYXMgTGFiZWwpXG4gICAgfVxufVxuIiwiLyoqIE1pc3NpbmcgYW5nbGVzIGFyb3VuZCBhIHBvaW50IG9yIG9uIGEgc3RyYWlnaHQgbGluZSwgdXNpbmcgYWxnZWJyYWljIGV4cHJlc3Npb25zICovXG5cbmltcG9ydCB7IE9wdGlvbnNTcGVjIH0gZnJvbSAnT3B0aW9uc1NwZWMnXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tICcuL0FsZ2VicmFPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGFcbiAgdmlldzogTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3XG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSwgdmlldzogTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3KSB7IC8vIGVmZmVjdGl2ZWx5IHByaXZhdGVcbiAgICBzdXBlcigpIC8vIGJ1YmJsZXMgdG8gUVxuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICB0aGlzLnZpZXcgPSB2aWV3XG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBBbGdlYnJhT3B0aW9ucywgdmlld09wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEge1xuICAgIGNvbnN0IGRlZmF1bHRzIDogQWxnZWJyYU9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDEwLFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDQsXG4gICAgICByZXBlYXRlZDogZmFsc2VcbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlldyhkYXRhLCB2aWV3T3B0aW9ucykgLy8gVE9ETyBlbGltaW5hdGUgcHVibGljIGNvbnN0cnVjdG9yc1xuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cblxuICBzdGF0aWMgZ2V0IG9wdGlvbnNTcGVjICgpIDogT3B0aW9uc1NwZWMge1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnZXhwcmVzc2lvblR5cGVzJyxcbiAgICAgICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgICAgICB0aXRsZTogJ1R5cGVzIG9mIGV4cHJlc3Npb24nLFxuICAgICAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICAgICAge3RpdGxlOiAnPGVtPmE8L2VtPis8ZW0+eDwvZW0+JywgaWQ6J2FkZCd9LFxuICAgICAgICAgIHt0aXRsZTogJzxlbT5heDwvZW0+JywgaWQ6ICdtdWx0aXBseSd9LFxuICAgICAgICAgIHt0aXRsZTogJ21peGVkJywgaWQ6ICdtaXhlZCd9XG4gICAgICAgIF0sXG4gICAgICAgIGRlZmF1bHQ6IFsnYWRkJywnbXVsdGlwbHknLCdtaXhlZCddXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogJ2Vuc3VyZVgnLFxuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnRW5zdXJlIG9uZSBhbmdsZSBpcyA8ZW0+eDwvZW0+JyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgaWQ6ICdpbmNsdWRlQ29uc3RhbnRzJyxcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJ0Vuc3VyZSBhIGNvbnN0YW50IGFuZ2xlJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgfVxuICAgIF1cbiAgfVxufVxuIiwiaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgTGFiZWwgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFWaWV3IGV4dGVuZHMgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YVxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLCBvcHRpb25zOiBWaWV3T3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpXG5cbiAgICBjb25zdCBzb2x1dGlvbkxhYmVsOiBQYXJ0aWFsPExhYmVsPiA9IHtcbiAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwKSxcbiAgICAgIHRleHRxOiAnJyxcbiAgICAgIHRleHRhOiBgeCA9ICR7dGhpcy5kYXRhLnh9XlxcXFxjaXJjYCxcbiAgICAgIHN0eWxlcTogJ2hpZGRlbicsXG4gICAgICBzdHlsZWE6ICdleHRyYS1hbnN3ZXInXG4gICAgfVxuICAgIHNvbHV0aW9uTGFiZWwuc3R5bGUgPSBzb2x1dGlvbkxhYmVsLnN0eWxlcVxuICAgIHNvbHV0aW9uTGFiZWwudGV4dCA9IHNvbHV0aW9uTGFiZWwudGV4dHFcblxuICAgIHRoaXMubGFiZWxzLnB1c2goc29sdXRpb25MYWJlbCBhcyBMYWJlbClcbiAgfVxufVxuIiwiaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCB7IEFsZ2VicmFPcHRpb25zIH0gZnJvbSAnLi9BbGdlYnJhT3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldydcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YVxuICB2aWV3OiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3XG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSwgdmlldzogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldykge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgdGhpcy52aWV3ID0gdmlld1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogQWxnZWJyYU9wdGlvbnMsIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUSB7XG4gICAgY29uc3Qgb3B0aW9uc092ZXJyaWRlIDogQWxnZWJyYU9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDMsXG4gICAgICByZXBlYXRlZDogZmFsc2VcbiAgICB9XG4gICAgT2JqZWN0LmFzc2lnbihvcHRpb25zLCBvcHRpb25zT3ZlcnJpZGUpXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVZpZXcoZGF0YSwgdmlld09wdGlvbnMpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzV29yZGVkRGF0YSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkVmlldyBleHRlbmRzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcge1xuICBkYXRhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YVxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEsIG9wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucylcbiAgICBzdXBlci5zY2FsZVRvRml0KHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0LCA0MClcbiAgICBzdXBlci50cmFuc2xhdGUoMCwgLTMwKVxuXG4gICAgY29uc3QgaW5zdHJ1Y3Rpb25MYWJlbDogTGFiZWwgPSB7XG4gICAgICB0ZXh0cTogdGhpcy5kYXRhLmluc3RydWN0aW9ucy5qb2luKCdcXFxcXFxcXCcpLFxuICAgICAgdGV4dGE6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHRleHQ6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHN0eWxlcTogJ2V4dHJhLWluZm8nLFxuICAgICAgc3R5bGVhOiAnZXh0cmEtaW5mbycsXG4gICAgICBzdHlsZTogJ2V4dHJhLWluZm8nLFxuICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIHRoaXMuaGVpZ2h0IC0gMTApXG4gICAgfVxuICAgIHRoaXMubGFiZWxzLnB1c2goaW5zdHJ1Y3Rpb25MYWJlbClcbiAgfVxufVxuIiwiaW1wb3J0IExpbkV4cHIgZnJvbSAnTGluRXhwcidcbmltcG9ydCB7IHJhbmRCZXR3ZWVuLCByYW5kRWxlbSwgcmFuZE11bHRCZXR3ZWVuIH0gZnJvbSAnVXRpbGl0aWVzJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSdcbmltcG9ydCB7IHNvbHZlQW5nbGVzIH0gZnJvbSAnLi9zb2x2ZUFuZ2xlcydcbmltcG9ydCB7IFdvcmRlZE9wdGlvbnMgfSBmcm9tICcuL1dvcmRlZE9wdGlvbnMnXG5cbmV4cG9ydCB0eXBlIFdvcmRlZFR5cGUgPSAnYWRkJyB8ICdtdWx0aXBseScgfCAncmF0aW8nIHwgJ3BlcmNlbnQnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGV4dGVuZHMgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIHtcbiAgYW5nbGVzOiBudW1iZXJbXSAvLyBJbmhlcml0ZWRcbiAgbWlzc2luZzogYm9vbGVhbltdIC8vICAgIHxcbiAgYW5nbGVTdW06IG51bWJlciAvLyAgICB8XG4gIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSAvLyAgICB2XG4gIGluc3RydWN0aW9uczogc3RyaW5nW10gLy8gVGhlICdpbnN0cnVjdGlvbnMnIGdpdmVuXG4gIHg6IG51bWJlciAvLyB1bnVzZWQgYnV0IGluaGVyaXRlZFxuXG4gIGNvbnN0cnVjdG9yIChhbmdsZXM6IG51bWJlcltdLCBtaXNzaW5nOiBib29sZWFuW10sIGFuZ2xlU3VtOiBudW1iZXIsIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSwgaW5zdHJ1Y3Rpb25zOiBzdHJpbmdbXSkge1xuICAgIHN1cGVyKGFuZ2xlcywgbWlzc2luZywgYW5nbGVTdW0sIGFuZ2xlTGFiZWxzLCBudWxsKVxuICAgIHRoaXMuaW5zdHJ1Y3Rpb25zID0gaW5zdHJ1Y3Rpb25zXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zIDogV29yZGVkT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSB7XG4gICAgY29uc3QgZGVmYXVsdHMgOiBXb3JkZWRPcHRpb25zID0ge1xuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDIsXG4gICAgICBtaW5BbmdsZTogMTAsXG4gICAgICBtaW5BZGRlbmQ6IC05MCxcbiAgICAgIG1heEFkZGVuZDogOTAsXG4gICAgICBtaW5NdWx0aXBsaWVyOiAxLFxuICAgICAgbWF4TXVsdGlwbGllcjogNSxcbiAgICAgIHR5cGVzOiBbJ2FkZCcsICdtdWx0aXBseScsICdwZXJjZW50JywgJ3JhdGlvJ11cbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgY29uc3QgbiA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTiwgb3B0aW9ucy5tYXhOKVxuICAgIGNvbnN0IGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIGFuZ2xlTGFiZWxzW2ldID0gU3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpIC8vIDY1ID0gJ0EnXG4gICAgfVxuICAgIGxldCBleHByZXNzaW9uczogTGluRXhwcltdID0gW11cbiAgICBsZXQgaW5zdHJ1Y3Rpb25zOiBzdHJpbmdbXSA9IFtdXG5cbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKVxuXG4gICAgLy8gTG9vcCB0aWwgd2UgZ2V0IG9uZSB0aGF0IHdvcmtzXG4gICAgLy8gUHJvYmFibHkgcmVhbGx5IGluZWZmaWNpZW50ISFcblxuICAgIGxldCBzdWNjZXNzID0gZmFsc2VcbiAgICBsZXQgYXR0ZW1wdGNvdW50ID0gMFxuICAgIHdoaWxlICghc3VjY2Vzcykge1xuICAgICAgaWYgKGF0dGVtcHRjb3VudCA+IDIwKSB7XG4gICAgICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgMCkpXG4gICAgICAgIGNvbnNvbGUubG9nKCdHYXZlIHVwIGFmdGVyICcgKyBhdHRlbXB0Y291bnQgKyAnIGF0dGVtcHRzJylcbiAgICAgICAgc3VjY2VzcyA9IHRydWVcbiAgICAgIH1cbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSByYW5kRWxlbShvcHRpb25zLnR5cGVzKVxuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICBjYXNlICdhZGQnOiB7XG4gICAgICAgICAgICBjb25zdCBhZGRlbmQgPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbkFkZGVuZCwgb3B0aW9ucy5tYXhBZGRlbmQpXG4gICAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb25zW2kgLSAxXS5hZGQoYWRkZW5kKSlcbiAgICAgICAgICAgIGluc3RydWN0aW9ucy5wdXNoKGBcXFxcdGV4dHtBbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSl9JCBpcyAke2NvbXBhcmF0b3IoYWRkZW5kLCAnKycpfSBhbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY0ICsgaSl9JH1gKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSAnbXVsdGlwbHknOiB7XG4gICAgICAgICAgICBjb25zdCBtdWx0aXBsaWVyID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5NdWx0aXBsaWVyLCBvcHRpb25zLm1heE11bHRpcGxpZXIpXG4gICAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb25zW2kgLSAxXS50aW1lcyhtdWx0aXBsaWVyKSlcbiAgICAgICAgICAgIGluc3RydWN0aW9ucy5wdXNoKGBcXFxcdGV4dHtBbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSl9JCBpcyAke2NvbXBhcmF0b3IobXVsdGlwbGllciwgJyonKX0gYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NCArIGkpfSR9YClcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ3BlcmNlbnQnOiB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50YWdlID0gcmFuZE11bHRCZXR3ZWVuKDUsIDEwMCwgNSlcbiAgICAgICAgICAgIGNvbnN0IGluY3JlYXNlID0gTWF0aC5yYW5kb20oKSA8IDAuNVxuICAgICAgICAgICAgY29uc3QgbXVsdGlwbGllciA9IGluY3JlYXNlID8gMSArIHBlcmNlbnRhZ2UgLyAxMDAgOiAxIC0gcGVyY2VudGFnZSAvIDEwMFxuICAgICAgICAgICAgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uc1tpIC0gMV0udGltZXMobXVsdGlwbGllcikpXG4gICAgICAgICAgICBpbnN0cnVjdGlvbnMucHVzaChcbiAgICAgICAgICAgICAgYFxcXFx0ZXh0e0FuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKX0kIGlzICQke3BlcmNlbnRhZ2V9XFxcXCUkICR7aW5jcmVhc2UgPyAnYmlnZ2VyJyA6ICdzbWFsbGVyJ30gdGhhbiBhbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY0ICsgaSl9JH1gKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSAncmF0aW8nOiB7XG4gICAgICAgICAgICBjb25zdCBhID0gcmFuZEJldHdlZW4oMSwgMTApXG4gICAgICAgICAgICBjb25zdCBiID0gcmFuZEJldHdlZW4oMSwgMTApXG4gICAgICAgICAgICBjb25zdCBtdWx0aXBsaWVyID0gYiAvIGFcbiAgICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2goZXhwcmVzc2lvbnNbaSAtIDFdLnRpbWVzKG11bHRpcGxpZXIpKVxuICAgICAgICAgICAgaW5zdHJ1Y3Rpb25zLnB1c2goXG4gICAgICAgICAgICAgIGBcXFxcdGV4dHtUaGUgcmF0aW8gb2YgYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NCArIGkpfSQgdG8gYW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpfSQgaXMgJCR7YX06JHtifSR9YFxuICAgICAgICAgICAgKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gY2hlY2sgaXQgbWFrZXMgc2Vuc2VcbiAgICAgIHN1Y2Nlc3MgPSB0cnVlXG4gICAgICBjb25zdCBleHByZXNzaW9uc3VtID0gZXhwcmVzc2lvbnMucmVkdWNlKChleHAxLCBleHAyKSA9PiBleHAxLmFkZChleHAyKSlcbiAgICAgIGNvbnN0IHggPSBMaW5FeHByLnNvbHZlKGV4cHJlc3Npb25zdW0sIG5ldyBMaW5FeHByKDAsIG9wdGlvbnMuYW5nbGVTdW0pKVxuXG4gICAgICBleHByZXNzaW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChleHByKSB7XG4gICAgICAgIGlmICghc3VjY2VzcyB8fCBleHByLmV2YWwoeCkgPCBvcHRpb25zLm1pbkFuZ2xlKSB7XG4gICAgICAgICAgc3VjY2VzcyA9IGZhbHNlXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zID0gW11cbiAgICAgICAgICBleHByZXNzaW9ucyA9IFtleHByZXNzaW9uc1swXV1cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgYXR0ZW1wdGNvdW50KytcbiAgICB9XG4gICAgY29uc29sZS5sb2coJ0F0dGVtcHRzOiAnICsgYXR0ZW1wdGNvdW50KVxuXG4gICAgY29uc3QgYW5nbGVzID0gc29sdmVBbmdsZXMoZXhwcmVzc2lvbnMsIG9wdGlvbnMuYW5nbGVTdW0pLmFuZ2xlc1xuICAgIGNvbnN0IG1pc3NpbmcgPSBhbmdsZXMubWFwKCgpID0+IHRydWUpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVzLCBtaXNzaW5nLCBvcHRpb25zLmFuZ2xlU3VtLCBhbmdsZUxhYmVscywgaW5zdHJ1Y3Rpb25zKVxuICB9XG59XG5cbi8qKlxuICogR2VuZXJhdGVzIHdvcmRlZCB2ZXJzaW9uIG9mIGFuIG9wZXJhdGlvXG4gKiBAcGFyYW0gbnVtYmVyIFRoZSBtdWx0aXBsaWVyIG9yIGFkZGVuZFxuICogQHBhcmFtIG9wZXJhdG9yIFRoZSBvcGVyYXRvciwgZS5nIGFkZGluZyAnbW9yZSB0aGFuJywgb3IgbXVsdGlwbHlpbmcgJ3RpbWVzIGxhcmdlciB0aGFuJ1xuICovXG5mdW5jdGlvbiBjb21wYXJhdG9yIChudW1iZXI6IG51bWJlciwgb3BlcmF0b3I6ICcqJ3wnKycpIHtcbiAgc3dpdGNoIChvcGVyYXRvcikge1xuICAgIGNhc2UgJyonOlxuICAgICAgc3dpdGNoIChudW1iZXIpIHtcbiAgICAgICAgY2FzZSAxOiByZXR1cm4gJ3RoZSBzYW1lIGFzJ1xuICAgICAgICBjYXNlIDI6IHJldHVybiAnZG91YmxlJ1xuICAgICAgICBkZWZhdWx0OiByZXR1cm4gYCQke251bWJlcn0kIHRpbWVzIGxhcmdlciB0aGFuYFxuICAgICAgfVxuICAgIGNhc2UgJysnOlxuICAgICAgc3dpdGNoIChudW1iZXIpIHtcbiAgICAgICAgY2FzZSAwOiByZXR1cm4gJ3RoZSBzYW1lIGFzJ1xuICAgICAgICBkZWZhdWx0OiByZXR1cm4gYCQke01hdGguYWJzKG51bWJlcikudG9TdHJpbmcoKX1eXFxcXGNpcmMkICR7KG51bWJlciA8IDApID8gJ2xlc3MgdGhhbicgOiAnbW9yZSB0aGFuJ31gXG4gICAgICB9XG4gIH1cbn1cbiIsImltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXcnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzV29yZGVkRGF0YSdcbmltcG9ydCB7IFdvcmRlZE9wdGlvbnMgfSBmcm9tICcuL1dvcmRlZE9wdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhXG4gIHZpZXc6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXdcbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLCB2aWV3OiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3KSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICB0aGlzLnZpZXcgPSB2aWV3XG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBXb3JkZWRPcHRpb25zLCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkUSB7XG4gICAgY29uc3Qgb3B0aW9uc092ZXJyaWRlIDogV29yZGVkT3B0aW9ucyA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5OOiAzLFxuICAgICAgbWF4TjogMyxcbiAgICAgIHJlcGVhdGVkOiBmYWxzZVxuICAgIH1cbiAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIG9wdGlvbnNPdmVycmlkZSlcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXcoZGF0YSwgdmlld09wdGlvbnMpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3IGV4dGVuZHMgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcge1xuICBkYXRhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YVxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEsIG9wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIGRvZXMgbW9zdCBvZiB0aGUgc2V0IHVwXG4gICAgc3VwZXIudHJhbnNsYXRlKDAsIC0xNSlcbiAgICBjb25zdCBpbnN0cnVjdGlvbkxhYmVsIDogTGFiZWwgPSB7XG4gICAgICB0ZXh0cTogdGhpcy5kYXRhLmluc3RydWN0aW9ucy5qb2luKCdcXFxcXFxcXCcpLFxuICAgICAgdGV4dGE6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHRleHQ6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgIHN0eWxlcTogJ2V4dHJhLWluZm8nLFxuICAgICAgc3R5bGVhOiAnZXh0cmEtaW5mbycsXG4gICAgICBzdHlsZTogJ2V4dHJhLWluZm8nLFxuICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIHRoaXMuaGVpZ2h0IC0gMTApXG4gICAgfVxuICAgIHRoaXMubGFiZWxzLnB1c2goaW5zdHJ1Y3Rpb25MYWJlbClcbiAgfVxufVxuIiwiaW1wb3J0IHsgT3B0aW9uc1NwZWMgfSBmcm9tICdPcHRpb25zU3BlYydcbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEnXG5pbXBvcnQgeyBXb3JkZWRPcHRpb25zIH0gZnJvbSAnLi9Xb3JkZWRPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzV29yZGVkUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGFcbiAgdmlldzogTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXdcblxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEsIHZpZXc6IE1pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3KSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICB0aGlzLnZpZXcgPSB2aWV3XG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBXb3JkZWRPcHRpb25zLCB2aWV3T3B0aW9uczogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNXb3JkZWRRIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IFdvcmRlZE9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDEwLFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDIsXG4gICAgICByZXBlYXRlZDogZmFsc2VcbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgdmlld09wdGlvbnMgPSB2aWV3T3B0aW9ucyB8fCB7fVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcoZGF0YSwgdmlld09wdGlvbnMpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgb3B0aW9uc1NwZWMoKTogT3B0aW9uc1NwZWMge1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICAgICAgdGl0bGU6ICdRdWVzdGlvbiB0eXBlcycsXG4gICAgICAgIGlkOiAndHlwZXMnLFxuICAgICAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICAgICAgeyB0aXRsZTogJ01vcmUgdGhhbi9sZXNzIHRoYW4nLCBpZDogJ2FkZCcgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnTXVsdGlwbGVzJywgaWQ6ICdtdWx0aXBseScgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnUGVyY2VudGFnZSBjaGFuZ2UnLCBpZDogJ3BlcmNlbnQnIH0sXG4gICAgICAgICAgeyB0aXRsZTogJ1JhdGlvcycsIGlkOiAncmF0aW8nIH1cbiAgICAgICAgXSxcbiAgICAgICAgZGVmYXVsdDogWydhZGQnLCAnbXVsdGlwbHknXVxuICAgICAgfVxuICAgIF1cbiAgfVxuXG59XG4iLCIvKiogIENsYXNzIHRvIHdyYXAgdmFyaW91cyBtaXNzaW5nIGFuZ2xlcyBjbGFzc2VzXG4gKiBSZWFkcyBvcHRpb25zIGFuZCB0aGVuIHdyYXBzIHRoZSBhcHByb3ByaWF0ZSBvYmplY3QsIG1pcnJvcmluZyB0aGUgbWFpblxuICogcHVibGljIG1ldGhvZHNcbiAqXG4gKiBUaGlzIGNsYXNzIGRlYWxzIHdpdGggdHJhbnNsYXRpbmcgZGlmZmljdWx0eSBpbnRvIHF1ZXN0aW9uIHR5cGVzXG4qL1xuXG5pbXBvcnQgeyBPcHRpb25zU3BlYyB9IGZyb20gJ09wdGlvbnNTcGVjJ1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5cbmltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbi9RdWVzdGlvbidcbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5cbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVRJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSBmcm9tICcuL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFRJ1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tICcuL0FsZ2VicmFPcHRpb25zJ1xuXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkUSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1dvcmRlZFEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzV29yZGVkUSdcbmltcG9ydCB7IFdvcmRlZE9wdGlvbnMgfSBmcm9tICcuL1dvcmRlZE9wdGlvbnMnXG5cbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuXG50eXBlIFF1ZXN0aW9uVHlwZSA9ICdhb3NsJyB8ICdhYWFwJyB8ICd0cmlhbmdsZSdcbnR5cGUgUXVlc3Rpb25TdWJUeXBlID0gJ3NpbXBsZScgfCAncmVwZWF0ZWQnIHwgJ2FsZ2VicmEnIHwgJ3dvcmRlZCdcblxudHlwZSBRdWVzdGlvbk9wdGlvbnMgPSBNaXNzaW5nQW5nbGVPcHRpb25zICYgQWxnZWJyYU9wdGlvbnMgJiBXb3JkZWRPcHRpb25zXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBxdWVzdGlvbjogR3JhcGhpY1FcblxuICBjb25zdHJ1Y3RvciAocXVlc3Rpb246IEdyYXBoaWNRKSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMucXVlc3Rpb24gPSBxdWVzdGlvblxuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAoXG4gICAgb3B0aW9uczoge1xuICAgICAgdHlwZXM6IFF1ZXN0aW9uVHlwZVtdLFxuICAgICAgZGlmZmljdWx0eTogbnVtYmVyLFxuICAgICAgY3VzdG9tOiBib29sZWFuLFxuICAgICAgc3VidHlwZT86IFF1ZXN0aW9uU3ViVHlwZVxuICAgIH0pIDogTWlzc2luZ0FuZ2xlc1Ege1xuICAgIGlmIChvcHRpb25zLnR5cGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUeXBlcyBsaXN0IG11c3QgYmUgbm9uLWVtcHR5JylcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlID0gcmFuZEVsZW0ob3B0aW9ucy50eXBlcylcbiAgICBsZXQgc3VidHlwZSA6IFF1ZXN0aW9uU3ViVHlwZVxuICAgIGNvbnN0IHF1ZXN0aW9uT3B0aW9ucyA6IFF1ZXN0aW9uT3B0aW9ucyA9IHt9XG5cbiAgICBzd2l0Y2ggKG9wdGlvbnMuZGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICBzdWJ0eXBlID0gJ3NpbXBsZSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAyXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gMlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOlxuICAgICAgICBzdWJ0eXBlID0gJ3NpbXBsZSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAzXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gNFxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAzOlxuICAgICAgICBzdWJ0eXBlID0gJ3JlcGVhdGVkJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDNcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSA0XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ6XG4gICAgICAgIHN1YnR5cGUgPSAnYWxnZWJyYSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmV4cHJlc3Npb25UeXBlcyA9IFsnbXVsdGlwbHknXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cyA9IGZhbHNlXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDRcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNTpcbiAgICAgICAgc3VidHlwZSA9ICdhbGdlYnJhJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZXhwcmVzc2lvblR5cGVzID0gWydhZGQnLCAnbXVsdGlwbHknXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cyA9IFsnbXVsdGlwbHknXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZW5zdXJlWCA9IHRydWVcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAyXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA2OlxuICAgICAgICBzdWJ0eXBlID0gJ2FsZ2VicmEnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5leHByZXNzaW9uVHlwZXMgPSBbJ21peGVkJ11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAyXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA3OlxuICAgICAgICBzdWJ0eXBlID0gJ3dvcmRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnR5cGVzID0gW3JhbmRFbGVtKFsnYWRkJywgJ211bHRpcGx5J10pXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gMlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA4OlxuICAgICAgICBzdWJ0eXBlID0gJ3dvcmRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnR5cGVzID0gWydhZGQnLCAnbXVsdGlwbHknXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA5OlxuICAgICAgICBzdWJ0eXBlID0gJ3dvcmRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnR5cGVzID0gWydtdWx0aXBseScsICdyYXRpbyddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gcXVlc3Rpb25PcHRpb25zLm1heE4gPSAzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDEwOlxuICAgICAgICBzdWJ0eXBlID0gJ3dvcmRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnR5cGVzID0gWydtdWx0aXBseScsICdhZGQnLCAncmF0aW8nLCAncGVyY2VudCddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gcXVlc3Rpb25PcHRpb25zLm1heE4gPSAzXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbid0IGdlbmVyYXRlIGRpZmZpY3VsdHkgJHtvcHRpb25zLmRpZmZpY3VsdHl9YClcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5yYW5kb21Gcm9tVHlwZVdpdGhPcHRpb25zKHR5cGUsIHN1YnR5cGUsIHF1ZXN0aW9uT3B0aW9ucylcbiAgfVxuXG4gIHN0YXRpYyByYW5kb21Gcm9tVHlwZVdpdGhPcHRpb25zICh0eXBlOiBRdWVzdGlvblR5cGUsIHN1YnR5cGU/OiBRdWVzdGlvblN1YlR5cGUsIHF1ZXN0aW9uT3B0aW9ucz86IFF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnM/OiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1Ege1xuICAgIGxldCBxdWVzdGlvbjogR3JhcGhpY1FcbiAgICBxdWVzdGlvbk9wdGlvbnMgPSBxdWVzdGlvbk9wdGlvbnMgfHwge31cbiAgICB2aWV3T3B0aW9ucyA9IHZpZXdPcHRpb25zIHx8IHt9XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICBjYXNlICdhYWFwJzpcbiAgICAgIGNhc2UgJ2Fvc2wnOiB7XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5hbmdsZVN1bSA9ICh0eXBlID09PSAnYWFhcCcpID8gMzYwIDogMTgwXG4gICAgICAgIHN3aXRjaCAoc3VidHlwZSkge1xuICAgICAgICAgIGNhc2UgJ3NpbXBsZSc6XG4gICAgICAgICAgY2FzZSAncmVwZWF0ZWQnOlxuICAgICAgICAgICAgcXVlc3Rpb25PcHRpb25zLnJlcGVhdGVkID0gc3VidHlwZSA9PT0gJ3JlcGVhdGVkJ1xuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzQXJvdW5kUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAnYWxnZWJyYSc6XG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAnd29yZGVkJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc1dvcmRlZFEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHVuZXhwZWN0ZWQgc3VidHlwZSAke3N1YnR5cGV9YClcbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAndHJpYW5nbGUnOiB7XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5yZXBlYXRlZCA9IChzdWJ0eXBlID09PSAncmVwZWF0ZWQnKVxuICAgICAgICBzd2l0Y2ggKHN1YnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdzaW1wbGUnOlxuICAgICAgICAgIGNhc2UgJ3JlcGVhdGVkJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAnYWxnZWJyYSc6XG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICd3b3JkZWQnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bmV4cGVjdGVkIHN1YnR5cGUgJHtzdWJ0eXBlfWApXG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0eXBlICR7dHlwZX1gKVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc1EocXVlc3Rpb24pXG4gIH1cblxuICBnZXRET00gKCkgOiBIVE1MRWxlbWVudCB7IHJldHVybiB0aGlzLnF1ZXN0aW9uLmdldERPTSgpIH1cbiAgcmVuZGVyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24ucmVuZGVyKCkgfVxuICBzaG93QW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24uc2hvd0Fuc3dlcigpIH1cbiAgaGlkZUFuc3dlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLmhpZGVBbnN3ZXIoKSB9XG4gIHRvZ2dsZUFuc3dlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLnRvZ2dsZUFuc3dlcigpIH1cblxuICBzdGF0aWMgZ2V0IG9wdGlvbnNTcGVjICgpOiBPcHRpb25zU3BlYyB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2hlYWRpbmcnLFxuICAgICAgICB0aXRsZTogJydcbiAgICAgIH0sXG5cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdUeXBlcycsXG4gICAgICAgIGlkOiAndHlwZXMnLFxuICAgICAgICB0eXBlOiAnc2VsZWN0LWluY2x1c2l2ZScsXG4gICAgICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgICAgICB7IHRpdGxlOiAnT24gYSBzdHJhaWdodCBsaW5lJywgaWQ6ICdhb3NsJyB9LFxuICAgICAgICAgIHsgdGl0bGU6ICdBcm91bmQgYSBwb2ludCcsIGlkOiAnYWFhcCcgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnVHJpYW5nbGUnLCBpZDogJ3RyaWFuZ2xlJyB9XG4gICAgICAgIF0sXG4gICAgICAgIGRlZmF1bHQ6IFsnYW9zbCcsICdhYWFwJywgJ3RyaWFuZ2xlJ10sXG4gICAgICAgIHZlcnRpY2FsOiB0cnVlXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnY29sdW1uLWJyZWFrJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICB0aXRsZTogJzxiPlVzZSBjdXN0b20gc2V0dGluZ3MgKGRpc2FibGVzIGRpZmZpY3VsdHkpPC9iPicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICBpZDogJ2N1c3RvbSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdyYW5nZScsXG4gICAgICAgIGlkOiAnbi1hbmdsZXMnLFxuICAgICAgICBpZExCOiAnbWluTicsXG4gICAgICAgIGlkVUI6ICdtYXhOJyxcbiAgICAgICAgZGVmYXVsdExCOiAyLFxuICAgICAgICBkZWZhdWx0VUI6IDQsXG4gICAgICAgIG1pbjogMixcbiAgICAgICAgbWF4OiA4LFxuICAgICAgICB0aXRsZTogJ051bWJlciBvZiBhbmdsZXMnLFxuICAgICAgICBlbmFibGVkSWY6ICdjdXN0b20nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnU2ltcGxlJyxcbiAgICAgICAgaWQ6ICdzaW1wbGUnLFxuICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICBlbmFibGVkSWY6ICdjdXN0b20nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnUmVwZWF0ZWQvSXNvc2NlbGVzJyxcbiAgICAgICAgaWQ6ICdyZXBlYXRlZCcsXG4gICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgIGVuYWJsZWRJZjogJ2N1c3RvbSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgdGl0bGU6ICdBbGdlYnJhaWMnLFxuICAgICAgICBpZDogJ2FsZ2VicmFpYycsXG4gICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgIGVuYWJsZWRJZjogJ2N1c3RvbSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdzdWJvcHRpb25zJyxcbiAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICBpZDogJ2FsZ2VicmFpYy1vcHRpb25zJyxcbiAgICAgICAgb3B0aW9uc1NwZWM6IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUS5vcHRpb25zU3BlYyxcbiAgICAgICAgZW5hYmxlZElmOiAnY3VzdG9tJmFsZ2VicmFpYydcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgdGl0bGU6ICdXb3JkZWQnLFxuICAgICAgICBpZDogJ3dvcmRlZCcsXG4gICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgIGVuYWJsZWRJZjogJ2N1c3RvbSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdzdWJvcHRpb25zJyxcbiAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICBpZDogJ3dvcmRlZC1vcHRpb25zJyxcbiAgICAgICAgb3B0aW9uc1NwZWM6IE1pc3NpbmdBbmdsZXNXb3JkZWRRLm9wdGlvbnNTcGVjLFxuICAgICAgICBlbmFibGVkSWY6ICdjdXN0b20md29yZGVkJ1xuICAgICAgfVxuICAgIF1cbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJ1xuICB9XG59XG4iLCJpbXBvcnQgQWxnZWJyYWljRnJhY3Rpb25RIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0FsZ2VicmFpY0ZyYWN0aW9uUSdcbmltcG9ydCBJbnRlZ2VyQWRkUSBmcm9tICdRdWVzdGlvbi9UZXh0US9JbnRlZ2VyQWRkJ1xuaW1wb3J0IEFyaXRobWFnb25RIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0FyaXRobWFnb25RJ1xuaW1wb3J0IFRlc3RRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1Rlc3RRJ1xuaW1wb3J0IEFkZEFaZXJvIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0FkZEFaZXJvJ1xuaW1wb3J0IEVxdWF0aW9uT2ZMaW5lIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0VxdWF0aW9uT2ZMaW5lJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNRIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dyYXBwZXInXG5cbmltcG9ydCBPcHRpb25zU2V0IGZyb20gJ09wdGlvbnNTZXQnXG5cbmNvbnN0IHRvcGljTGlzdCA9IFtcbiAge1xuICAgIGlkOiAnYWxnZWJyYWljLWZyYWN0aW9uJyxcbiAgICB0aXRsZTogJ1NpbXBsaWZ5IGFsZ2VicmFpYyBmcmFjdGlvbnMnLFxuICAgIGNsYXNzOiBBbGdlYnJhaWNGcmFjdGlvblFcbiAgfSxcbiAge1xuICAgIGlkOiAnYWRkLWEtemVybycsXG4gICAgdGl0bGU6ICdNdWx0aXBseSBieSAxMCAoaG9uZXN0ISknLFxuICAgIGNsYXNzOiBBZGRBWmVyb1xuICB9LFxuICB7XG4gICAgaWQ6ICdpbnRlZ2VyLWFkZCcsXG4gICAgdGl0bGU6ICdBZGQgaW50ZWdlcnMgKHYgc2ltcGxlKScsXG4gICAgY2xhc3M6IEludGVnZXJBZGRRXG4gIH0sXG4gIHtcbiAgICBpZDogJ21pc3NpbmctYW5nbGVzJyxcbiAgICB0aXRsZTogJ01pc3NpbmcgYW5nbGVzJyxcbiAgICBjbGFzczogTWlzc2luZ0FuZ2xlc1FcbiAgfSxcbiAge1xuICAgIGlkOiAnZXF1YXRpb24tb2YtbGluZScsXG4gICAgdGl0bGU6ICdFcXVhdGlvbiBvZiBhIGxpbmUgKGZyb20gdHdvIHBvaW50cyknLFxuICAgIGNsYXNzOiBFcXVhdGlvbk9mTGluZVxuICB9LFxuICB7XG4gICAgaWQ6ICdhcml0aG1hZ29uLWFkZCcsXG4gICAgdGl0bGU6ICdBcml0aG1hZ29ucycsXG4gICAgY2xhc3M6IEFyaXRobWFnb25RXG4gIH0sXG4gIHtcbiAgICBpZDogJ3Rlc3QnLFxuICAgIHRpdGxlOiAnVGVzdCBxdWVzdGlvbnMnLFxuICAgIGNsYXNzOiBUZXN0UVxuICB9XG5dXG5cbmZ1bmN0aW9uIGdldENsYXNzIChpZCkge1xuICAvLyBSZXR1cm4gdGhlIGNsYXNzIGdpdmVuIGFuIGlkIG9mIGEgcXVlc3Rpb25cblxuICAvLyBPYnZpb3VzbHkgdGhpcyBpcyBhbiBpbmVmZmljaWVudCBzZWFyY2gsIGJ1dCB3ZSBkb24ndCBuZWVkIG1hc3NpdmUgcGVyZm9ybWFuY2VcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b3BpY0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodG9waWNMaXN0W2ldLmlkID09PSBpZCkge1xuICAgICAgcmV0dXJuIHRvcGljTGlzdFtpXS5jbGFzc1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsXG59XG5cbmZ1bmN0aW9uIGdldFRpdGxlIChpZCkge1xuICAvLyBSZXR1cm4gdGl0bGUgb2YgYSBnaXZlbiBpZFxuICAvL1xuICByZXR1cm4gdG9waWNMaXN0LmZpbmQodCA9PiAodC5pZCA9PT0gaWQpKS50aXRsZVxufVxuXG5mdW5jdGlvbiBnZXRDb21tYW5kV29yZCAoaWQpIHtcbiAgcmV0dXJuIGdldENsYXNzKGlkKS5jb21tYW5kV29yZFxufVxuXG5mdW5jdGlvbiBnZXRUb3BpY3MgKCkge1xuICAvLyByZXR1cm5zIHRvcGljcyB3aXRoIGNsYXNzZXMgc3RyaXBwZWQgb3V0XG4gIHJldHVybiB0b3BpY0xpc3QubWFwKHggPT4gKHsgaWQ6IHguaWQsIHRpdGxlOiB4LnRpdGxlIH0pKVxufVxuXG5mdW5jdGlvbiBuZXdRdWVzdGlvbiAoaWQsIG9wdGlvbnMpIHtcbiAgLy8gdG8gYXZvaWQgd3JpdGluZyBgbGV0IHEgPSBuZXcgKFRvcGljQ2hvb3Nlci5nZXRDbGFzcyhpZCkpKG9wdGlvbnMpXG4gIGNvbnN0IFF1ZXN0aW9uQ2xhc3MgPSBnZXRDbGFzcyhpZClcbiAgbGV0IHF1ZXN0aW9uXG4gIGlmIChRdWVzdGlvbkNsYXNzLnJhbmRvbSkge1xuICAgIHF1ZXN0aW9uID0gUXVlc3Rpb25DbGFzcy5yYW5kb20ob3B0aW9ucylcbiAgfSBlbHNlIHtcbiAgICBxdWVzdGlvbiA9IG5ldyBRdWVzdGlvbkNsYXNzKG9wdGlvbnMpXG4gIH1cbiAgcmV0dXJuIHF1ZXN0aW9uXG59XG5cbmZ1bmN0aW9uIG5ld09wdGlvbnNTZXQgKGlkKSB7XG4gIGNvbnN0IG9wdGlvbnNTcGVjID0gKGdldENsYXNzKGlkKSkub3B0aW9uc1NwZWMgfHwgW11cbiAgcmV0dXJuIG5ldyBPcHRpb25zU2V0KG9wdGlvbnNTcGVjKVxufVxuXG5mdW5jdGlvbiBoYXNPcHRpb25zIChpZCkge1xuICByZXR1cm4gISEoZ2V0Q2xhc3MoaWQpLm9wdGlvbnNTcGVjICYmIGdldENsYXNzKGlkKS5vcHRpb25zU3BlYy5sZW5ndGggPiAwKSAvLyB3ZWlyZCBib29sIHR5cGNhc3Rpbmcgd29vIVxufVxuXG5leHBvcnQgeyB0b3BpY0xpc3QsIGdldENsYXNzLCBuZXdRdWVzdGlvbiwgZ2V0VG9waWNzLCBnZXRUaXRsZSwgbmV3T3B0aW9uc1NldCwgZ2V0Q29tbWFuZFdvcmQsIGhhc09wdGlvbnMgfVxuIiwiLyogIVxuKiB0aW5nbGUuanNcbiogQGF1dGhvciAgcm9iaW5fcGFyaXNpXG4qIEB2ZXJzaW9uIDAuMTUuMlxuKiBAdXJsXG4qL1xuLy8gTW9kaWZpZWQgdG8gYmUgRVM2IG1vZHVsZVxuXG52YXIgaXNCdXN5ID0gZmFsc2VcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gTW9kYWwgKG9wdGlvbnMpIHtcbiAgdmFyIGRlZmF1bHRzID0ge1xuICAgIG9uQ2xvc2U6IG51bGwsXG4gICAgb25PcGVuOiBudWxsLFxuICAgIGJlZm9yZU9wZW46IG51bGwsXG4gICAgYmVmb3JlQ2xvc2U6IG51bGwsXG4gICAgc3RpY2t5Rm9vdGVyOiBmYWxzZSxcbiAgICBmb290ZXI6IGZhbHNlLFxuICAgIGNzc0NsYXNzOiBbXSxcbiAgICBjbG9zZUxhYmVsOiAnQ2xvc2UnLFxuICAgIGNsb3NlTWV0aG9kczogWydvdmVybGF5JywgJ2J1dHRvbicsICdlc2NhcGUnXVxuICB9XG5cbiAgLy8gZXh0ZW5kcyBjb25maWdcbiAgdGhpcy5vcHRzID0gZXh0ZW5kKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAvLyBpbml0IG1vZGFsXG4gIHRoaXMuaW5pdCgpXG59XG5cbk1vZGFsLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5tb2RhbCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgX2J1aWxkLmNhbGwodGhpcylcbiAgX2JpbmRFdmVudHMuY2FsbCh0aGlzKVxuXG4gIC8vIGluc2VydCBtb2RhbCBpbiBkb21cbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsLCBkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpXG5cbiAgaWYgKHRoaXMub3B0cy5mb290ZXIpIHtcbiAgICB0aGlzLmFkZEZvb3RlcigpXG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuX2J1c3kgPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgaXNCdXN5ID0gc3RhdGVcbn1cblxuTW9kYWwucHJvdG90eXBlLl9pc0J1c3kgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBpc0J1c3lcbn1cblxuTW9kYWwucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLm1vZGFsID09PSBudWxsKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICAvLyByZXN0b3JlIHNjcm9sbGluZ1xuICBpZiAodGhpcy5pc09wZW4oKSkge1xuICAgIHRoaXMuY2xvc2UodHJ1ZSlcbiAgfVxuXG4gIC8vIHVuYmluZCBhbGwgZXZlbnRzXG4gIF91bmJpbmRFdmVudHMuY2FsbCh0aGlzKVxuXG4gIC8vIHJlbW92ZSBtb2RhbCBmcm9tIGRvbVxuICB0aGlzLm1vZGFsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbClcblxuICB0aGlzLm1vZGFsID0gbnVsbFxufVxuXG5Nb2RhbC5wcm90b3R5cGUuaXNPcGVuID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gISF0aGlzLm1vZGFsLmNsYXNzTGlzdC5jb250YWlucygndGluZ2xlLW1vZGFsLS12aXNpYmxlJylcbn1cblxuTW9kYWwucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLl9pc0J1c3koKSkgcmV0dXJuXG4gIHRoaXMuX2J1c3kodHJ1ZSlcblxuICB2YXIgc2VsZiA9IHRoaXNcblxuICAvLyBiZWZvcmUgb3BlbiBjYWxsYmFja1xuICBpZiAodHlwZW9mIHNlbGYub3B0cy5iZWZvcmVPcGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgc2VsZi5vcHRzLmJlZm9yZU9wZW4oKVxuICB9XG5cbiAgaWYgKHRoaXMubW9kYWwuc3R5bGUucmVtb3ZlUHJvcGVydHkpIHtcbiAgICB0aGlzLm1vZGFsLnN0eWxlLnJlbW92ZVByb3BlcnR5KCdkaXNwbGF5JylcbiAgfSBlbHNlIHtcbiAgICB0aGlzLm1vZGFsLnN0eWxlLnJlbW92ZUF0dHJpYnV0ZSgnZGlzcGxheScpXG4gIH1cblxuICAvLyBwcmV2ZW50IGRvdWJsZSBzY3JvbGxcbiAgdGhpcy5fc2Nyb2xsUG9zaXRpb24gPSB3aW5kb3cucGFnZVlPZmZzZXRcbiAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtZW5hYmxlZCcpXG4gIGRvY3VtZW50LmJvZHkuc3R5bGUudG9wID0gLXRoaXMuX3Njcm9sbFBvc2l0aW9uICsgJ3B4J1xuXG4gIC8vIHN0aWNreSBmb290ZXJcbiAgdGhpcy5zZXRTdGlja3lGb290ZXIodGhpcy5vcHRzLnN0aWNreUZvb3RlcilcblxuICAvLyBzaG93IG1vZGFsXG4gIHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsLS12aXNpYmxlJylcblxuICAvLyBvbk9wZW4gY2FsbGJhY2tcbiAgaWYgKHR5cGVvZiBzZWxmLm9wdHMub25PcGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgc2VsZi5vcHRzLm9uT3Blbi5jYWxsKHNlbGYpXG4gIH1cblxuICBzZWxmLl9idXN5KGZhbHNlKVxuXG4gIC8vIGNoZWNrIGlmIG1vZGFsIGlzIGJpZ2dlciB0aGFuIHNjcmVlbiBoZWlnaHRcbiAgdGhpcy5jaGVja092ZXJmbG93KClcblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoZm9yY2UpIHtcbiAgaWYgKHRoaXMuX2lzQnVzeSgpKSByZXR1cm5cbiAgdGhpcy5fYnVzeSh0cnVlKVxuICBmb3JjZSA9IGZvcmNlIHx8IGZhbHNlXG5cbiAgLy8gIGJlZm9yZSBjbG9zZVxuICBpZiAodHlwZW9mIHRoaXMub3B0cy5iZWZvcmVDbG9zZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHZhciBjbG9zZSA9IHRoaXMub3B0cy5iZWZvcmVDbG9zZS5jYWxsKHRoaXMpXG4gICAgaWYgKCFjbG9zZSkge1xuICAgICAgdGhpcy5fYnVzeShmYWxzZSlcbiAgICAgIHJldHVyblxuICAgIH1cbiAgfVxuXG4gIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZSgndGluZ2xlLWVuYWJsZWQnKVxuICBkb2N1bWVudC5ib2R5LnN0eWxlLnRvcCA9IG51bGxcbiAgd2luZG93LnNjcm9sbFRvKHtcbiAgICB0b3A6IHRoaXMuX3Njcm9sbFBvc2l0aW9uLFxuICAgIGJlaGF2aW9yOiAnaW5zdGFudCdcbiAgfSlcblxuICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3RpbmdsZS1tb2RhbC0tdmlzaWJsZScpXG5cbiAgLy8gdXNpbmcgc2ltaWxhciBzZXR1cCBhcyBvbk9wZW5cbiAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgc2VsZi5tb2RhbC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG5cbiAgLy8gb25DbG9zZSBjYWxsYmFja1xuICBpZiAodHlwZW9mIHNlbGYub3B0cy5vbkNsb3NlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgc2VsZi5vcHRzLm9uQ2xvc2UuY2FsbCh0aGlzKVxuICB9XG5cbiAgLy8gcmVsZWFzZSBtb2RhbFxuICBzZWxmLl9idXN5KGZhbHNlKVxufVxuXG5Nb2RhbC5wcm90b3R5cGUuc2V0Q29udGVudCA9IGZ1bmN0aW9uIChjb250ZW50KSB7XG4gIC8vIGNoZWNrIHR5cGUgb2YgY29udGVudCA6IFN0cmluZyBvciBOb2RlXG4gIGlmICh0eXBlb2YgY29udGVudCA9PT0gJ3N0cmluZycpIHtcbiAgICB0aGlzLm1vZGFsQm94Q29udGVudC5pbm5lckhUTUwgPSBjb250ZW50XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5tb2RhbEJveENvbnRlbnQuaW5uZXJIVE1MID0gJydcbiAgICB0aGlzLm1vZGFsQm94Q29udGVudC5hcHBlbmRDaGlsZChjb250ZW50KVxuICB9XG5cbiAgaWYgKHRoaXMuaXNPcGVuKCkpIHtcbiAgICAvLyBjaGVjayBpZiBtb2RhbCBpcyBiaWdnZXIgdGhhbiBzY3JlZW4gaGVpZ2h0XG4gICAgdGhpcy5jaGVja092ZXJmbG93KClcbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5nZXRDb250ZW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5tb2RhbEJveENvbnRlbnRcbn1cblxuTW9kYWwucHJvdG90eXBlLmFkZEZvb3RlciA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gYWRkIGZvb3RlciB0byBtb2RhbFxuICBfYnVpbGRGb290ZXIuY2FsbCh0aGlzKVxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5zZXRGb290ZXJDb250ZW50ID0gZnVuY3Rpb24gKGNvbnRlbnQpIHtcbiAgLy8gc2V0IGZvb3RlciBjb250ZW50XG4gIHRoaXMubW9kYWxCb3hGb290ZXIuaW5uZXJIVE1MID0gY29udGVudFxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5nZXRGb290ZXJDb250ZW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5tb2RhbEJveEZvb3RlclxufVxuXG5Nb2RhbC5wcm90b3R5cGUuc2V0U3RpY2t5Rm9vdGVyID0gZnVuY3Rpb24gKGlzU3RpY2t5KSB7XG4gIC8vIGlmIHRoZSBtb2RhbCBpcyBzbWFsbGVyIHRoYW4gdGhlIHZpZXdwb3J0IGhlaWdodCwgd2UgZG9uJ3QgbmVlZCBzdGlja3lcbiAgaWYgKCF0aGlzLmlzT3ZlcmZsb3coKSkge1xuICAgIGlzU3RpY2t5ID0gZmFsc2VcbiAgfVxuXG4gIGlmIChpc1N0aWNreSkge1xuICAgIGlmICh0aGlzLm1vZGFsQm94LmNvbnRhaW5zKHRoaXMubW9kYWxCb3hGb290ZXIpKSB7XG4gICAgICB0aGlzLm1vZGFsQm94LnJlbW92ZUNoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpXG4gICAgICB0aGlzLm1vZGFsLmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpXG4gICAgICB0aGlzLm1vZGFsQm94Rm9vdGVyLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC1ib3hfX2Zvb3Rlci0tc3RpY2t5JylcbiAgICAgIF9yZWNhbGN1bGF0ZUZvb3RlclBvc2l0aW9uLmNhbGwodGhpcylcbiAgICAgIHRoaXMubW9kYWxCb3hDb250ZW50LnN0eWxlWydwYWRkaW5nLWJvdHRvbSddID0gdGhpcy5tb2RhbEJveEZvb3Rlci5jbGllbnRIZWlnaHQgKyAyMCArICdweCdcbiAgICB9XG4gIH0gZWxzZSBpZiAodGhpcy5tb2RhbEJveEZvb3Rlcikge1xuICAgIGlmICghdGhpcy5tb2RhbEJveC5jb250YWlucyh0aGlzLm1vZGFsQm94Rm9vdGVyKSkge1xuICAgICAgdGhpcy5tb2RhbC5yZW1vdmVDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKVxuICAgICAgdGhpcy5tb2RhbEJveC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKVxuICAgICAgdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS53aWR0aCA9ICdhdXRvJ1xuICAgICAgdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS5sZWZ0ID0gJydcbiAgICAgIHRoaXMubW9kYWxCb3hDb250ZW50LnN0eWxlWydwYWRkaW5nLWJvdHRvbSddID0gJydcbiAgICAgIHRoaXMubW9kYWxCb3hGb290ZXIuY2xhc3NMaXN0LnJlbW92ZSgndGluZ2xlLW1vZGFsLWJveF9fZm9vdGVyLS1zdGlja3knKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5hZGRGb290ZXJCdG4gPSBmdW5jdGlvbiAobGFiZWwsIGNzc0NsYXNzLCBjYWxsYmFjaykge1xuICB2YXIgYnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJylcblxuICAvLyBzZXQgbGFiZWxcbiAgYnRuLmlubmVySFRNTCA9IGxhYmVsXG5cbiAgLy8gYmluZCBjYWxsYmFja1xuICBidG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjYWxsYmFjaylcblxuICBpZiAodHlwZW9mIGNzc0NsYXNzID09PSAnc3RyaW5nJyAmJiBjc3NDbGFzcy5sZW5ndGgpIHtcbiAgICAvLyBhZGQgY2xhc3NlcyB0byBidG5cbiAgICBjc3NDbGFzcy5zcGxpdCgnICcpLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIGJ0bi5jbGFzc0xpc3QuYWRkKGl0ZW0pXG4gICAgfSlcbiAgfVxuXG4gIHRoaXMubW9kYWxCb3hGb290ZXIuYXBwZW5kQ2hpbGQoYnRuKVxuXG4gIHJldHVybiBidG5cbn1cblxuTW9kYWwucHJvdG90eXBlLnJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS53YXJuKCdSZXNpemUgaXMgZGVwcmVjYXRlZCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIHZlcnNpb24gMS4wJylcbn1cblxuTW9kYWwucHJvdG90eXBlLmlzT3ZlcmZsb3cgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciB2aWV3cG9ydEhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodFxuICB2YXIgbW9kYWxIZWlnaHQgPSB0aGlzLm1vZGFsQm94LmNsaWVudEhlaWdodFxuXG4gIHJldHVybiBtb2RhbEhlaWdodCA+PSB2aWV3cG9ydEhlaWdodFxufVxuXG5Nb2RhbC5wcm90b3R5cGUuY2hlY2tPdmVyZmxvdyA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gb25seSBpZiB0aGUgbW9kYWwgaXMgY3VycmVudGx5IHNob3duXG4gIGlmICh0aGlzLm1vZGFsLmNsYXNzTGlzdC5jb250YWlucygndGluZ2xlLW1vZGFsLS12aXNpYmxlJykpIHtcbiAgICBpZiAodGhpcy5pc092ZXJmbG93KCkpIHtcbiAgICAgIHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsLS1vdmVyZmxvdycpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgndGluZ2xlLW1vZGFsLS1vdmVyZmxvdycpXG4gICAgfVxuXG4gICAgLy8gdE9ETzogcmVtb3ZlIG9mZnNldFxuICAgIC8vIF9vZmZzZXQuY2FsbCh0aGlzKTtcbiAgICBpZiAoIXRoaXMuaXNPdmVyZmxvdygpICYmIHRoaXMub3B0cy5zdGlja3lGb290ZXIpIHtcbiAgICAgIHRoaXMuc2V0U3RpY2t5Rm9vdGVyKGZhbHNlKVxuICAgIH0gZWxzZSBpZiAodGhpcy5pc092ZXJmbG93KCkgJiYgdGhpcy5vcHRzLnN0aWNreUZvb3Rlcikge1xuICAgICAgX3JlY2FsY3VsYXRlRm9vdGVyUG9zaXRpb24uY2FsbCh0aGlzKVxuICAgICAgdGhpcy5zZXRTdGlja3lGb290ZXIodHJ1ZSlcbiAgICB9XG4gIH1cbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbi8qID09IHByaXZhdGUgbWV0aG9kcyAqL1xuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuZnVuY3Rpb24gY2xvc2VJY29uICgpIHtcbiAgcmV0dXJuICc8c3ZnIHZpZXdCb3g9XCIwIDAgMTAgMTBcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+PHBhdGggZD1cIk0uMyA5LjdjLjIuMi40LjMuNy4zLjMgMCAuNS0uMS43LS4zTDUgNi40bDMuMyAzLjNjLjIuMi41LjMuNy4zLjIgMCAuNS0uMS43LS4zLjQtLjQuNC0xIDAtMS40TDYuNCA1bDMuMy0zLjNjLjQtLjQuNC0xIDAtMS40LS40LS40LTEtLjQtMS40IDBMNSAzLjYgMS43LjNDMS4zLS4xLjctLjEuMy4zYy0uNC40LS40IDEgMCAxLjRMMy42IDUgLjMgOC4zYy0uNC40LS40IDEgMCAxLjR6XCIgZmlsbD1cIiMwMDBcIiBmaWxsLXJ1bGU9XCJub256ZXJvXCIvPjwvc3ZnPidcbn1cblxuZnVuY3Rpb24gX3JlY2FsY3VsYXRlRm9vdGVyUG9zaXRpb24gKCkge1xuICBpZiAoIXRoaXMubW9kYWxCb3hGb290ZXIpIHtcbiAgICByZXR1cm5cbiAgfVxuICB0aGlzLm1vZGFsQm94Rm9vdGVyLnN0eWxlLndpZHRoID0gdGhpcy5tb2RhbEJveC5jbGllbnRXaWR0aCArICdweCdcbiAgdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS5sZWZ0ID0gdGhpcy5tb2RhbEJveC5vZmZzZXRMZWZ0ICsgJ3B4J1xufVxuXG5mdW5jdGlvbiBfYnVpbGQgKCkge1xuICAvLyB3cmFwcGVyXG4gIHRoaXMubW9kYWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbCcpXG5cbiAgLy8gcmVtb3ZlIGN1c29yIGlmIG5vIG92ZXJsYXkgY2xvc2UgbWV0aG9kXG4gIGlmICh0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmxlbmd0aCA9PT0gMCB8fCB0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoJ292ZXJsYXknKSA9PT0gLTEpIHtcbiAgICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC0tbm9PdmVybGF5Q2xvc2UnKVxuICB9XG5cbiAgdGhpcy5tb2RhbC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG5cbiAgLy8gY3VzdG9tIGNsYXNzXG4gIHRoaXMub3B0cy5jc3NDbGFzcy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKGl0ZW0pXG4gICAgfVxuICB9LCB0aGlzKVxuXG4gIC8vIGNsb3NlIGJ0blxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdidXR0b24nKSAhPT0gLTEpIHtcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKVxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bi50eXBlID0gJ2J1dHRvbidcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4uY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsX19jbG9zZScpXG5cbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG5JY29uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuSWNvbi5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWxfX2Nsb3NlSWNvbicpXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuSWNvbi5pbm5lckhUTUwgPSBjbG9zZUljb24oKVxuXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuTGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJylcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWxfX2Nsb3NlTGFiZWwnKVxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bkxhYmVsLmlubmVySFRNTCA9IHRoaXMub3B0cy5jbG9zZUxhYmVsXG5cbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4uYXBwZW5kQ2hpbGQodGhpcy5tb2RhbENsb3NlQnRuSWNvbilcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4uYXBwZW5kQ2hpbGQodGhpcy5tb2RhbENsb3NlQnRuTGFiZWwpXG4gIH1cblxuICAvLyBtb2RhbFxuICB0aGlzLm1vZGFsQm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgdGhpcy5tb2RhbEJveC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtYm94JylcblxuICAvLyBtb2RhbCBib3ggY29udGVudFxuICB0aGlzLm1vZGFsQm94Q29udGVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIHRoaXMubW9kYWxCb3hDb250ZW50LmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC1ib3hfX2NvbnRlbnQnKVxuXG4gIHRoaXMubW9kYWxCb3guYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveENvbnRlbnQpXG5cbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignYnV0dG9uJykgIT09IC0xKSB7XG4gICAgdGhpcy5tb2RhbC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQ2xvc2VCdG4pXG4gIH1cblxuICB0aGlzLm1vZGFsLmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3gpXG59XG5cbmZ1bmN0aW9uIF9idWlsZEZvb3RlciAoKSB7XG4gIHRoaXMubW9kYWxCb3hGb290ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICB0aGlzLm1vZGFsQm94Rm9vdGVyLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC1ib3hfX2Zvb3RlcicpXG4gIHRoaXMubW9kYWxCb3guYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveEZvb3Rlcilcbn1cblxuZnVuY3Rpb24gX2JpbmRFdmVudHMgKCkge1xuICB0aGlzLl9ldmVudHMgPSB7XG4gICAgY2xpY2tDbG9zZUJ0bjogdGhpcy5jbG9zZS5iaW5kKHRoaXMpLFxuICAgIGNsaWNrT3ZlcmxheTogX2hhbmRsZUNsaWNrT3V0c2lkZS5iaW5kKHRoaXMpLFxuICAgIHJlc2l6ZTogdGhpcy5jaGVja092ZXJmbG93LmJpbmQodGhpcyksXG4gICAga2V5Ym9hcmROYXY6IF9oYW5kbGVLZXlib2FyZE5hdi5iaW5kKHRoaXMpXG4gIH1cblxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdidXR0b24nKSAhPT0gLTEpIHtcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLl9ldmVudHMuY2xpY2tDbG9zZUJ0bilcbiAgfVxuXG4gIHRoaXMubW9kYWwuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGhpcy5fZXZlbnRzLmNsaWNrT3ZlcmxheSlcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMuX2V2ZW50cy5yZXNpemUpXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLl9ldmVudHMua2V5Ym9hcmROYXYpXG59XG5cbmZ1bmN0aW9uIF9oYW5kbGVLZXlib2FyZE5hdiAoZXZlbnQpIHtcbiAgLy8gZXNjYXBlIGtleVxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdlc2NhcGUnKSAhPT0gLTEgJiYgZXZlbnQud2hpY2ggPT09IDI3ICYmIHRoaXMuaXNPcGVuKCkpIHtcbiAgICB0aGlzLmNsb3NlKClcbiAgfVxufVxuXG5mdW5jdGlvbiBfaGFuZGxlQ2xpY2tPdXRzaWRlIChldmVudCkge1xuICAvLyBvbiBtYWNPUywgY2xpY2sgb24gc2Nyb2xsYmFyIChoaWRkZW4gbW9kZSkgd2lsbCB0cmlnZ2VyIGNsb3NlIGV2ZW50IHNvIHdlIG5lZWQgdG8gYnlwYXNzIHRoaXMgYmVoYXZpb3IgYnkgZGV0ZWN0aW5nIHNjcm9sbGJhciBtb2RlXG4gIHZhciBzY3JvbGxiYXJXaWR0aCA9IHRoaXMubW9kYWwub2Zmc2V0V2lkdGggLSB0aGlzLm1vZGFsLmNsaWVudFdpZHRoXG4gIHZhciBjbGlja2VkT25TY3JvbGxiYXIgPSBldmVudC5jbGllbnRYID49IHRoaXMubW9kYWwub2Zmc2V0V2lkdGggLSAxNSAvLyAxNXB4IGlzIG1hY09TIHNjcm9sbGJhciBkZWZhdWx0IHdpZHRoXG4gIHZhciBpc1Njcm9sbGFibGUgPSB0aGlzLm1vZGFsLnNjcm9sbEhlaWdodCAhPT0gdGhpcy5tb2RhbC5vZmZzZXRIZWlnaHRcbiAgaWYgKG5hdmlnYXRvci5wbGF0Zm9ybSA9PT0gJ01hY0ludGVsJyAmJiBzY3JvbGxiYXJXaWR0aCA9PT0gMCAmJiBjbGlja2VkT25TY3JvbGxiYXIgJiYgaXNTY3JvbGxhYmxlKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICAvLyBpZiBjbGljayBpcyBvdXRzaWRlIHRoZSBtb2RhbFxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdvdmVybGF5JykgIT09IC0xICYmICFfZmluZEFuY2VzdG9yKGV2ZW50LnRhcmdldCwgJ3RpbmdsZS1tb2RhbCcpICYmXG4gICAgZXZlbnQuY2xpZW50WCA8IHRoaXMubW9kYWwuY2xpZW50V2lkdGgpIHtcbiAgICB0aGlzLmNsb3NlKClcbiAgfVxufVxuXG5mdW5jdGlvbiBfZmluZEFuY2VzdG9yIChlbCwgY2xzKSB7XG4gIHdoaWxlICgoZWwgPSBlbC5wYXJlbnRFbGVtZW50KSAmJiAhZWwuY2xhc3NMaXN0LmNvbnRhaW5zKGNscykpO1xuICByZXR1cm4gZWxcbn1cblxuZnVuY3Rpb24gX3VuYmluZEV2ZW50cyAoKSB7XG4gIGlmICh0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoJ2J1dHRvbicpICE9PSAtMSkge1xuICAgIHRoaXMubW9kYWxDbG9zZUJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuX2V2ZW50cy5jbGlja0Nsb3NlQnRuKVxuICB9XG4gIHRoaXMubW9kYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGhpcy5fZXZlbnRzLmNsaWNrT3ZlcmxheSlcbiAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMuX2V2ZW50cy5yZXNpemUpXG4gIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLl9ldmVudHMua2V5Ym9hcmROYXYpXG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiA9PSBoZWxwZXJzICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuXG5mdW5jdGlvbiBleHRlbmQgKCkge1xuICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGZvciAodmFyIGtleSBpbiBhcmd1bWVudHNbaV0pIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYXJndW1lbnRzW2ldLCBrZXkpKSB7XG4gICAgICAgIGFyZ3VtZW50c1swXVtrZXldID0gYXJndW1lbnRzW2ldW2tleV1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGFyZ3VtZW50c1swXVxufVxuIiwiaW1wb3J0IFJTbGlkZXIgZnJvbSAndmVuZG9yL3JzbGlkZXInXG5pbXBvcnQgT3B0aW9uc1NldCBmcm9tICdPcHRpb25zU2V0J1xuaW1wb3J0ICogYXMgVG9waWNDaG9vc2VyIGZyb20gJ1RvcGljQ2hvb3NlcidcbmltcG9ydCBNb2RhbCBmcm9tICd2ZW5kb3IvVGluZ2xlJ1xuaW1wb3J0IHsgcmFuZEVsZW0sIGNyZWF0ZUVsZW0sIGhhc0FuY2VzdG9yQ2xhc3MsIGJvb2xPYmplY3RUb0FycmF5IH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG53aW5kb3cuU0hPV19ESUZGSUNVTFRZID0gZmFsc2UgLy8gZm9yIGRlYnVnZ2luZyBxdWVzdGlvbnNcblxuLyogVE9ETyBsaXN0OlxuICogQWRkaXRpb25hbCBxdWVzdGlvbiBibG9jayAtIHByb2JhYmx5IGluIG1haW4uanNcbiAqIFpvb20vc2NhbGUgYnV0dG9uc1xuICogICAgTmVlZCB0byBjaGFuZ2UgY3NzIGdyaWQgc3BhY2luZyB3aXRoIEpTIG9uIGdlbmVyYXRpb25cbiAqIERpc3BsYXkgb3B0aW9uc1xuICovXG5cbi8vIE1ha2UgYW4gb3ZlcmxheSB0byBjYXB0dXJlIGFueSBjbGlja3Mgb3V0c2lkZSBib3hlcywgaWYgbmVjZXNzYXJ5XG5jcmVhdGVFbGVtKCdkaXYnLCAnb3ZlcmxheSBoaWRkZW4nLCBkb2N1bWVudC5ib2R5KS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGhpZGVBbGxBY3Rpb25zKVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBRdWVzdGlvblNldCB7XG4gIGNvbnN0cnVjdG9yIChxTnVtYmVyKSB7XG4gICAgdGhpcy5xdWVzdGlvbnMgPSBbXSAvLyBsaXN0IG9mIHF1ZXN0aW9ucyBhbmQgdGhlIERPTSBlbGVtZW50IHRoZXkncmUgcmVuZGVyZWQgaW5cbiAgICB0aGlzLnRvcGljcyA9IFtdIC8vIGxpc3Qgb2YgdG9waWNzIHdoaWNoIGhhdmUgYmVlbiBzZWxlY3RlZCBmb3IgdGhpcyBzZXRcbiAgICB0aGlzLm9wdGlvbnNTZXRzID0gW10gLy8gbGlzdCBvZiBPcHRpb25zU2V0IG9iamVjdHMgY2Fycnlpbmcgb3B0aW9ucyBmb3IgdG9waWNzIHdpdGggb3B0aW9uc1xuICAgIHRoaXMucU51bWJlciA9IHFOdW1iZXIgfHwgMSAvLyBRdWVzdGlvbiBudW1iZXIgKHBhc3NlZCBpbiBieSBjYWxsZXIsIHdoaWNoIHdpbGwga2VlcCBjb3VudClcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2UgLy8gV2hldGhlciBhbnN3ZXJlZCBvciBub3RcbiAgICB0aGlzLmNvbW1hbmRXb3JkID0gJycgLy8gU29tZXRoaW5nIGxpa2UgJ3NpbXBsaWZ5J1xuICAgIHRoaXMudXNlQ29tbWFuZFdvcmQgPSB0cnVlIC8vIFVzZSB0aGUgY29tbWFuZCB3b3JkIGluIHRoZSBtYWluIHF1ZXN0aW9uLCBmYWxzZSBnaXZlIGNvbW1hbmQgd29yZCB3aXRoIGVhY2ggc3VicXVlc3Rpb25cbiAgICB0aGlzLm4gPSA4IC8vIE51bWJlciBvZiBxdWVzdGlvbnNcblxuICAgIHRoaXMuX2J1aWxkKClcbiAgfVxuXG4gIF9idWlsZCAoKSB7XG4gICAgdGhpcy5vdXRlckJveCA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1vdXRlcmJveCcpXG4gICAgdGhpcy5oZWFkZXJCb3ggPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24taGVhZGVyYm94JywgdGhpcy5vdXRlckJveClcbiAgICB0aGlzLmRpc3BsYXlCb3ggPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tZGlzcGxheWJveCcsIHRoaXMub3V0ZXJCb3gpXG5cbiAgICB0aGlzLl9idWlsZE9wdGlvbnNCb3goKVxuXG4gICAgdGhpcy5fYnVpbGRUb3BpY0Nob29zZXIoKVxuICB9XG5cbiAgX2J1aWxkT3B0aW9uc0JveCAoKSB7XG4gICAgY29uc3QgdG9waWNTcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIG51bGwsIHRoaXMuaGVhZGVyQm94KVxuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uID0gY3JlYXRlRWxlbSgnc3BhbicsICd0b3BpYy1jaG9vc2VyIGJ1dHRvbicsIHRvcGljU3BhbilcbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbi5pbm5lckhUTUwgPSAnQ2hvb3NlIHRvcGljJ1xuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5jaG9vc2VUb3BpY3MoKSlcblxuICAgIGNvbnN0IGRpZmZpY3VsdHlTcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIG51bGwsIHRoaXMuaGVhZGVyQm94KVxuICAgIGRpZmZpY3VsdHlTcGFuLmFwcGVuZCgnRGlmZmljdWx0eTogJylcbiAgICBjb25zdCBkaWZmaWN1bHR5U2xpZGVyT3V0ZXIgPSBjcmVhdGVFbGVtKCdzcGFuJywgJ3NsaWRlci1vdXRlcicsIGRpZmZpY3VsdHlTcGFuKVxuICAgIHRoaXMuZGlmZmljdWx0eVNsaWRlckVsZW1lbnQgPSBjcmVhdGVFbGVtKCdpbnB1dCcsIG51bGwsIGRpZmZpY3VsdHlTbGlkZXJPdXRlcilcblxuICAgIGNvbnN0IG5TcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIG51bGwsIHRoaXMuaGVhZGVyQm94KVxuICAgIG5TcGFuLmFwcGVuZCgnTnVtYmVyIG9mIHF1ZXN0aW9uczogJylcbiAgICBjb25zdCBuUXVlc3Rpb25zSW5wdXQgPSBjcmVhdGVFbGVtKCdpbnB1dCcsICduLXF1ZXN0aW9ucycsIG5TcGFuKVxuICAgIG5RdWVzdGlvbnNJbnB1dC50eXBlID0gJ251bWJlcidcbiAgICBuUXVlc3Rpb25zSW5wdXQubWluID0gJzEnXG4gICAgblF1ZXN0aW9uc0lucHV0LnZhbHVlID0gJzgnXG4gICAgblF1ZXN0aW9uc0lucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHtcbiAgICAgIHRoaXMubiA9IHBhcnNlSW50KG5RdWVzdGlvbnNJbnB1dC52YWx1ZSlcbiAgICB9KVxuXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbiA9IGNyZWF0ZUVsZW0oJ2J1dHRvbicsICdnZW5lcmF0ZS1idXR0b24gYnV0dG9uJywgdGhpcy5oZWFkZXJCb3gpXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5kaXNhYmxlZCA9IHRydWVcbiAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmlubmVySFRNTCA9ICdHZW5lcmF0ZSEnXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuZ2VuZXJhdGVBbGwoKSlcbiAgfVxuXG4gIF9pbml0U2xpZGVyICgpIHtcbiAgICB0aGlzLmRpZmZpY3VsdHlTbGlkZXIgPSBuZXcgUlNsaWRlcih7XG4gICAgICB0YXJnZXQ6IHRoaXMuZGlmZmljdWx0eVNsaWRlckVsZW1lbnQsXG4gICAgICB2YWx1ZXM6IHsgbWluOiAxLCBtYXg6IDEwIH0sXG4gICAgICByYW5nZTogdHJ1ZSxcbiAgICAgIHNldDogWzIsIDZdLFxuICAgICAgc3RlcDogMSxcbiAgICAgIHRvb2x0aXA6IGZhbHNlLFxuICAgICAgc2NhbGU6IHRydWUsXG4gICAgICBsYWJlbHM6IHRydWVcbiAgICB9KVxuICB9XG5cbiAgX2J1aWxkVG9waWNDaG9vc2VyICgpIHtcbiAgICAvLyBidWlsZCBhbiBPcHRpb25zU2V0IG9iamVjdCBmb3IgdGhlIHRvcGljc1xuICAgIGNvbnN0IHRvcGljcyA9IFRvcGljQ2hvb3Nlci5nZXRUb3BpY3MoKVxuICAgIGNvbnN0IG9wdGlvbnNTcGVjID0gW11cbiAgICB0b3BpY3MuZm9yRWFjaCh0b3BpYyA9PiB7XG4gICAgICBvcHRpb25zU3BlYy5wdXNoKHtcbiAgICAgICAgdGl0bGU6IHRvcGljLnRpdGxlLFxuICAgICAgICBpZDogdG9waWMuaWQsXG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICAgIHN3YXBMYWJlbDogdHJ1ZVxuICAgICAgfSlcbiAgICB9KVxuICAgIHRoaXMudG9waWNzT3B0aW9ucyA9IG5ldyBPcHRpb25zU2V0KG9wdGlvbnNTcGVjKVxuXG4gICAgLy8gQnVpbGQgYSBtb2RhbCBkaWFsb2cgdG8gcHV0IHRoZW0gaW5cbiAgICB0aGlzLnRvcGljc01vZGFsID0gbmV3IE1vZGFsKHtcbiAgICAgIGZvb3RlcjogdHJ1ZSxcbiAgICAgIHN0aWNreUZvb3RlcjogZmFsc2UsXG4gICAgICBjbG9zZU1ldGhvZHM6IFsnb3ZlcmxheScsICdlc2NhcGUnXSxcbiAgICAgIGNsb3NlTGFiZWw6ICdDbG9zZScsXG4gICAgICBvbkNsb3NlOiAoKSA9PiB7XG4gICAgICAgIHRoaXMudXBkYXRlVG9waWNzKClcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhpcy50b3BpY3NNb2RhbC5hZGRGb290ZXJCdG4oXG4gICAgICAnT0snLFxuICAgICAgJ2J1dHRvbiBtb2RhbC1idXR0b24nLFxuICAgICAgKCkgPT4ge1xuICAgICAgICB0aGlzLnRvcGljc01vZGFsLmNsb3NlKClcbiAgICAgIH0pXG5cbiAgICAvLyByZW5kZXIgb3B0aW9ucyBpbnRvIG1vZGFsXG4gICAgdGhpcy50b3BpY3NPcHRpb25zLnJlbmRlckluKHRoaXMudG9waWNzTW9kYWwubW9kYWxCb3hDb250ZW50KVxuXG4gICAgLy8gQWRkIGZ1cnRoZXIgb3B0aW9ucyBidXR0b25zXG4gICAgLy8gVGhpcyBmZWVscyBhIGJpdCBpZmZ5IC0gZGVwZW5kcyB0b28gbXVjaCBvbiBpbXBsZW1lbnRhdGlvbiBvZiBPcHRpb25zU2V0XG4gICAgY29uc3QgbGlzID0gQXJyYXkuZnJvbSh0aGlzLnRvcGljc01vZGFsLm1vZGFsQm94Q29udGVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnbGknKSlcbiAgICBsaXMuZm9yRWFjaChsaSA9PiB7XG4gICAgICBjb25zdCB0b3BpY0lkID0gbGkuZGF0YXNldC5vcHRpb25JZFxuICAgICAgaWYgKFRvcGljQ2hvb3Nlci5oYXNPcHRpb25zKHRvcGljSWQpKSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnNCdXR0b24gPSBjcmVhdGVFbGVtKCdkaXYnLCAnaWNvbi1idXR0b24gZXh0cmEtb3B0aW9ucy1idXR0b24nLCBsaSlcbiAgICAgICAgdGhpcy5fYnVpbGRUb3BpY09wdGlvbnMobGkuZGF0YXNldC5vcHRpb25JZCwgb3B0aW9uc0J1dHRvbilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgX2J1aWxkVG9waWNPcHRpb25zICh0b3BpY0lkLCBvcHRpb25zQnV0dG9uKSB7XG4gICAgLy8gQnVpbGQgdGhlIFVJIGFuZCBPcHRpb25zU2V0IG9iamVjdCBsaW5rZWQgdG8gdG9waWNJZC4gUGFzcyBpbiBhIGJ1dHRvbiB3aGljaCBzaG91bGQgbGF1bmNoIGl0XG5cbiAgICAvLyBNYWtlIHRoZSBPcHRpb25zU2V0IG9iamVjdCBhbmQgc3RvcmUgYSByZWZlcmVuY2UgdG8gaXRcbiAgICAvLyBPbmx5IHN0b3JlIGlmIG9iamVjdCBpcyBjcmVhdGVkP1xuICAgIGNvbnN0IG9wdGlvbnNTZXQgPSBUb3BpY0Nob29zZXIubmV3T3B0aW9uc1NldCh0b3BpY0lkKVxuICAgIHRoaXMub3B0aW9uc1NldHNbdG9waWNJZF0gPSBvcHRpb25zU2V0XG5cbiAgICAvLyBNYWtlIGEgbW9kYWwgZGlhbG9nIGZvciBpdFxuICAgIGNvbnN0IG1vZGFsID0gbmV3IE1vZGFsKHtcbiAgICAgIGZvb3RlcjogdHJ1ZSxcbiAgICAgIHN0aWNreUZvb3RlcjogZmFsc2UsXG4gICAgICBjbG9zZU1ldGhvZHM6IFsnb3ZlcmxheScsICdlc2NhcGUnXSxcbiAgICAgIGNsb3NlTGFiZWw6ICdDbG9zZSdcbiAgICB9KVxuXG4gICAgbW9kYWwuYWRkRm9vdGVyQnRuKFxuICAgICAgJ09LJyxcbiAgICAgICdidXR0b24gbW9kYWwtYnV0dG9uJyxcbiAgICAgICgpID0+IHtcbiAgICAgICAgbW9kYWwuY2xvc2UoKVxuICAgICAgfSlcblxuICAgIG9wdGlvbnNTZXQucmVuZGVySW4obW9kYWwubW9kYWxCb3hDb250ZW50KVxuXG4gICAgLy8gbGluayB0aGUgbW9kYWwgdG8gdGhlIGJ1dHRvblxuICAgIG9wdGlvbnNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICBtb2RhbC5vcGVuKClcbiAgICB9KVxuICB9XG5cbiAgY2hvb3NlVG9waWNzICgpIHtcbiAgICB0aGlzLnRvcGljc01vZGFsLm9wZW4oKVxuICB9XG5cbiAgdXBkYXRlVG9waWNzICgpIHtcbiAgICAvLyB0b3BpYyBjaG9pY2VzIGFyZSBzdG9yZWQgaW4gdGhpcy50b3BpY3NPcHRpb25zIGF1dG9tYXRpY2FsbHlcbiAgICAvLyBwdWxsIHRoaXMgaW50byB0aGlzLnRvcGljcyBhbmQgdXBkYXRlIGJ1dHRvbiBkaXNwbGF5c1xuXG4gICAgLy8gaGF2ZSBvYmplY3Qgd2l0aCBib29sZWFuIHByb3BlcnRpZXMuIEp1c3Qgd2FudCB0aGUgdHJ1ZSB2YWx1ZXNcbiAgICBjb25zdCB0b3BpY3MgPSBib29sT2JqZWN0VG9BcnJheSh0aGlzLnRvcGljc09wdGlvbnMub3B0aW9ucylcbiAgICB0aGlzLnRvcGljcyA9IHRvcGljc1xuXG4gICAgbGV0IHRleHRcblxuICAgIGlmICh0b3BpY3MubGVuZ3RoID09PSAwKSB7XG4gICAgICB0ZXh0ID0gJ0Nob29zZSB0b3BpYycgLy8gbm90aGluZyBzZWxlY3RlZFxuICAgICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5kaXNhYmxlZCA9IHRydWVcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgaWQgPSB0b3BpY3NbMF0gLy8gZmlyc3QgaXRlbSBzZWxlY3RlZFxuICAgICAgdGV4dCA9IFRvcGljQ2hvb3Nlci5nZXRUaXRsZShpZClcbiAgICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uZGlzYWJsZWQgPSBmYWxzZVxuICAgIH1cblxuICAgIGlmICh0b3BpY3MubGVuZ3RoID4gMSkgeyAvLyBhbnkgYWRkaXRpb25hbCBzaG93IGFzIGUuZy4gJyArIDFcbiAgICAgIHRleHQgKz0gJyArJyArICh0b3BpY3MubGVuZ3RoIC0gMSlcbiAgICB9XG5cbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbi5pbm5lckhUTUwgPSB0ZXh0XG4gIH1cblxuICBzZXRDb21tYW5kV29yZCAoKSB7XG4gICAgLy8gZmlyc3Qgc2V0IHRvIGZpcnN0IHRvcGljIGNvbW1hbmQgd29yZFxuICAgIGxldCBjb21tYW5kV29yZCA9IFRvcGljQ2hvb3Nlci5nZXRDbGFzcyh0aGlzLnRvcGljc1swXSkuY29tbWFuZFdvcmRcbiAgICBsZXQgdXNlQ29tbWFuZFdvcmQgPSB0cnVlIC8vIHRydWUgaWYgc2hhcmVkIGNvbW1hbmQgd29yZFxuXG4gICAgLy8gY3ljbGUgdGhyb3VnaCByZXN0IG9mIHRvcGljcywgcmVzZXQgY29tbWFuZCB3b3JkIGlmIHRoZXkgZG9uJ3QgbWF0Y2hcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IHRoaXMudG9waWNzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoVG9waWNDaG9vc2VyLmdldENsYXNzKHRoaXMudG9waWNzW2ldKS5jb21tYW5kV29yZCAhPT0gY29tbWFuZFdvcmQpIHtcbiAgICAgICAgY29tbWFuZFdvcmQgPSAnJ1xuICAgICAgICB1c2VDb21tYW5kV29yZCA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jb21tYW5kV29yZCA9IGNvbW1hbmRXb3JkXG4gICAgdGhpcy51c2VDb21tYW5kV29yZCA9IHVzZUNvbW1hbmRXb3JkXG4gIH1cblxuICBnZW5lcmF0ZUFsbCAoKSB7XG4gICAgLy8gQ2xlYXIgZGlzcGxheS1ib3ggYW5kIHF1ZXN0aW9uIGxpc3RcbiAgICB0aGlzLmRpc3BsYXlCb3guaW5uZXJIVE1MID0gJydcbiAgICB0aGlzLnF1ZXN0aW9ucyA9IFtdXG4gICAgdGhpcy5zZXRDb21tYW5kV29yZCgpXG5cbiAgICAvLyBTZXQgbnVtYmVyIGFuZCBtYWluIGNvbW1hbmQgd29yZFxuICAgIGNvbnN0IG1haW5xID0gY3JlYXRlRWxlbSgncCcsICdrYXRleCBtYWlucScsIHRoaXMuZGlzcGxheUJveClcbiAgICBtYWlucS5pbm5lckhUTUwgPSBgJHt0aGlzLnFOdW1iZXJ9LiAke3RoaXMuY29tbWFuZFdvcmR9YCAvLyBUT0RPOiBnZXQgY29tbWFuZCB3b3JkIGZyb20gcXVlc3Rpb25zXG5cbiAgICAvLyBNYWtlIHNob3cgYW5zd2VycyBidXR0b25cbiAgICB0aGlzLmFuc3dlckJ1dHRvbiA9IGNyZWF0ZUVsZW0oJ3AnLCAnYnV0dG9uIHNob3ctYW5zd2VycycsIHRoaXMuZGlzcGxheUJveClcbiAgICB0aGlzLmFuc3dlckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHRoaXMudG9nZ2xlQW5zd2VycygpXG4gICAgfSlcbiAgICB0aGlzLmFuc3dlckJ1dHRvbi5pbm5lckhUTUwgPSAnU2hvdyBhbnN3ZXJzJ1xuXG4gICAgLy8gR2V0IGRpZmZpY3VsdHkgZnJvbSBzbGlkZXJcbiAgICBjb25zdCBtaW5kaWZmID0gdGhpcy5kaWZmaWN1bHR5U2xpZGVyLmdldFZhbHVlTCgpXG4gICAgY29uc3QgbWF4ZGlmZiA9IHRoaXMuZGlmZmljdWx0eVNsaWRlci5nZXRWYWx1ZVIoKVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgLy8gTWFrZSBxdWVzdGlvbiBjb250YWluZXIgRE9NIGVsZW1lbnRcbiAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1jb250YWluZXInLCB0aGlzLmRpc3BsYXlCb3gpXG4gICAgICBjb250YWluZXIuZGF0YXNldC5xdWVzdGlvbl9pbmRleCA9IGkgLy8gbm90IHN1cmUgdGhpcyBpcyBhY3R1YWxseSBuZWVkZWRcblxuICAgICAgLy8gQWRkIGNvbnRhaW5lciBsaW5rIHRvIG9iamVjdCBpbiBxdWVzdGlvbnMgbGlzdFxuICAgICAgaWYgKCF0aGlzLnF1ZXN0aW9uc1tpXSkgdGhpcy5xdWVzdGlvbnNbaV0gPSB7fVxuICAgICAgdGhpcy5xdWVzdGlvbnNbaV0uY29udGFpbmVyID0gY29udGFpbmVyXG5cbiAgICAgIC8vIGNob29zZSBhIGRpZmZpY3VsdHkgYW5kIGdlbmVyYXRlXG4gICAgICBjb25zdCBkaWZmaWN1bHR5ID0gbWluZGlmZiArIE1hdGguZmxvb3IoaSAqIChtYXhkaWZmIC0gbWluZGlmZiArIDEpIC8gdGhpcy5uKVxuXG4gICAgICAvLyBjaG9vc2UgYSB0b3BpYyBpZFxuICAgICAgdGhpcy5nZW5lcmF0ZShpLCBkaWZmaWN1bHR5KVxuICAgIH1cbiAgfVxuXG4gIGdlbmVyYXRlIChpLCBkaWZmaWN1bHR5LCB0b3BpY0lkKSB7XG4gICAgLy8gVE9ETyBnZXQgb3B0aW9ucyBwcm9wZXJseVxuICAgIHRvcGljSWQgPSB0b3BpY0lkIHx8IHJhbmRFbGVtKHRoaXMudG9waWNzKVxuXG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgIGxhYmVsOiAnJyxcbiAgICAgIGRpZmZpY3VsdHk6IGRpZmZpY3VsdHksXG4gICAgICB1c2VDb21tYW5kV29yZDogZmFsc2VcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zU2V0c1t0b3BpY0lkXSkge1xuICAgICAgT2JqZWN0LmFzc2lnbihvcHRpb25zLCB0aGlzLm9wdGlvbnNTZXRzW3RvcGljSWRdLm9wdGlvbnMpXG4gICAgfVxuXG4gICAgLy8gY2hvb3NlIGEgcXVlc3Rpb25cbiAgICBjb25zdCBxdWVzdGlvbiA9IFRvcGljQ2hvb3Nlci5uZXdRdWVzdGlvbih0b3BpY0lkLCBvcHRpb25zKVxuXG4gICAgLy8gc2V0IHNvbWUgbW9yZSBkYXRhIGluIHRoZSBxdWVzdGlvbnNbXSBsaXN0XG4gICAgaWYgKCF0aGlzLnF1ZXN0aW9uc1tpXSkgdGhyb3cgbmV3IEVycm9yKCdxdWVzdGlvbiBub3QgbWFkZScpXG4gICAgdGhpcy5xdWVzdGlvbnNbaV0ucXVlc3Rpb24gPSBxdWVzdGlvblxuICAgIHRoaXMucXVlc3Rpb25zW2ldLnRvcGljSWQgPSB0b3BpY0lkXG5cbiAgICAvLyBSZW5kZXIgaW50byB0aGUgY29udGFpbmVyXG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5xdWVzdGlvbnNbaV0uY29udGFpbmVyXG4gICAgY29udGFpbmVyLmlubmVySFRNTCA9ICcnIC8vIGNsZWFyIGluIGNhc2Ugb2YgcmVmcmVzaFxuXG4gICAgLy8gbWFrZSBhbmQgcmVuZGVyIHF1ZXN0aW9uIG51bWJlciBhbmQgY29tbWFuZCB3b3JkIChpZiBuZWVkZWQpXG4gICAgbGV0IHFOdW1iZXJUZXh0ID0gcXVlc3Rpb25MZXR0ZXIoaSkgKyAnKSdcbiAgICBpZiAod2luZG93LlNIT1dfRElGRklDVUxUWSkgeyBxTnVtYmVyVGV4dCArPSBvcHRpb25zLmRpZmZpY3VsdHkgfVxuICAgIGlmICghdGhpcy51c2VDb21tYW5kV29yZCkge1xuICAgICAgcU51bWJlclRleHQgKz0gJyAnICsgVG9waWNDaG9vc2VyLmdldENvbW1hbmRXb3JkKHRvcGljSWQpXG4gICAgICBjb250YWluZXIuY2xhc3NMaXN0LmFkZCgnaW5kaXZpZHVhbC1jb21tYW5kLXdvcmQnKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZSgnaW5kaXZpZHVhbC1jb21tYW5kLXdvcmQnKVxuICAgIH1cblxuICAgIGNvbnN0IHF1ZXN0aW9uTnVtYmVyRGl2ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLW51bWJlciBrYXRleCcsIGNvbnRhaW5lcilcbiAgICBxdWVzdGlvbk51bWJlckRpdi5pbm5lckhUTUwgPSBxTnVtYmVyVGV4dFxuXG4gICAgLy8gcmVuZGVyIHRoZSBxdWVzdGlvblxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChxdWVzdGlvbi5nZXRET00oKSkgLy8gdGhpcyBpcyBhIC5xdWVzdGlvbi1kaXYgZWxlbWVudFxuICAgIHF1ZXN0aW9uLnJlbmRlcigpIC8vIHNvbWUgcXVlc3Rpb25zIG5lZWQgcmVuZGVyaW5nIGFmdGVyIGF0dGFjaGluZyB0byBET01cblxuICAgIC8vIG1ha2UgaGlkZGVuIGFjdGlvbnMgbWVudVxuICAgIGNvbnN0IGFjdGlvbnMgPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tYWN0aW9ucyBoaWRkZW4nLCBjb250YWluZXIpXG4gICAgY29uc3QgcmVmcmVzaEljb24gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tcmVmcmVzaCBpY29uLWJ1dHRvbicsIGFjdGlvbnMpXG4gICAgY29uc3QgYW5zd2VySWNvbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1hbnN3ZXIgaWNvbi1idXR0b24nLCBhY3Rpb25zKVxuXG4gICAgYW5zd2VySWNvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHF1ZXN0aW9uLnRvZ2dsZUFuc3dlcigpXG4gICAgICBoaWRlQWxsQWN0aW9ucygpXG4gICAgfSlcblxuICAgIHJlZnJlc2hJY29uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgdGhpcy5nZW5lcmF0ZShpLCBkaWZmaWN1bHR5KVxuICAgICAgaGlkZUFsbEFjdGlvbnMoKVxuICAgIH0pXG5cbiAgICAvLyBROiBpcyB0aGlzIGJlc3Qgd2F5IC0gb3IgYW4gZXZlbnQgbGlzdGVuZXIgb24gdGhlIHdob2xlIGRpc3BsYXlCb3g/XG4gICAgY29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZSA9PiB7XG4gICAgICBpZiAoIWhhc0FuY2VzdG9yQ2xhc3MoZS50YXJnZXQsICdxdWVzdGlvbi1hY3Rpb25zJykpIHtcbiAgICAgICAgLy8gb25seSBkbyB0aGlzIGlmIGl0IGRpZG4ndCBvcmlnaW5hdGUgaW4gYWN0aW9uIGJ1dHRvblxuICAgICAgICB0aGlzLnNob3dRdWVzdGlvbkFjdGlvbnMoZSwgaSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgdG9nZ2xlQW5zd2VycyAoKSB7XG4gICAgaWYgKHRoaXMuYW5zd2VyZWQpIHtcbiAgICAgIHRoaXMucXVlc3Rpb25zLmZvckVhY2gocSA9PiB7XG4gICAgICAgIHEucXVlc3Rpb24uaGlkZUFuc3dlcigpXG4gICAgICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICAgICAgICB0aGlzLmFuc3dlckJ1dHRvbi5pbm5lckhUTUwgPSAnU2hvdyBhbnN3ZXJzJ1xuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5xdWVzdGlvbnMuZm9yRWFjaChxID0+IHtcbiAgICAgICAgcS5xdWVzdGlvbi5zaG93QW5zd2VyKClcbiAgICAgICAgdGhpcy5hbnN3ZXJlZCA9IHRydWVcbiAgICAgICAgdGhpcy5hbnN3ZXJCdXR0b24uaW5uZXJIVE1MID0gJ0hpZGUgYW5zd2VycydcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgc2hvd1F1ZXN0aW9uQWN0aW9ucyAoZXZlbnQsIHF1ZXN0aW9uSW5kZXgpIHtcbiAgICAvLyBmaXJzdCBoaWRlIGFueSBvdGhlciBhY3Rpb25zXG4gICAgaGlkZUFsbEFjdGlvbnMoKVxuXG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5xdWVzdGlvbnNbcXVlc3Rpb25JbmRleF0uY29udGFpbmVyXG4gICAgY29uc3QgYWN0aW9ucyA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcucXVlc3Rpb24tYWN0aW9ucycpXG5cbiAgICAvLyBVbmhpZGUgdGhlIG92ZXJsYXlcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcub3ZlcmxheScpLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpXG4gICAgYWN0aW9ucy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgIGFjdGlvbnMuc3R5bGUubGVmdCA9IChjb250YWluZXIub2Zmc2V0V2lkdGggLyAyIC0gYWN0aW9ucy5vZmZzZXRXaWR0aCAvIDIpICsgJ3B4J1xuICAgIGFjdGlvbnMuc3R5bGUudG9wID0gKGNvbnRhaW5lci5vZmZzZXRIZWlnaHQgLyAyIC0gYWN0aW9ucy5vZmZzZXRIZWlnaHQgLyAyKSArICdweCdcbiAgfVxuXG4gIGFwcGVuZFRvIChlbGVtKSB7XG4gICAgZWxlbS5hcHBlbmRDaGlsZCh0aGlzLm91dGVyQm94KVxuICAgIHRoaXMuX2luaXRTbGlkZXIoKSAvLyBoYXMgdG8gYmUgaW4gZG9jdW1lbnQncyBET00gdG8gd29yayBwcm9wZXJseVxuICB9XG5cbiAgYXBwZW5kQmVmb3JlIChwYXJlbnQsIGVsZW0pIHtcbiAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHRoaXMub3V0ZXJCb3gsIGVsZW0pXG4gICAgdGhpcy5faW5pdFNsaWRlcigpIC8vIGhhcyB0byBiZSBpbiBkb2N1bWVudCdzIERPTSB0byB3b3JrIHByb3Blcmx5XG4gIH1cbn1cblxuZnVuY3Rpb24gcXVlc3Rpb25MZXR0ZXIgKGkpIHtcbiAgLy8gcmV0dXJuIGEgcXVlc3Rpb24gbnVtYmVyLiBlLmcuIHFOdW1iZXIoMCk9XCJhXCIuXG4gIC8vIEFmdGVyIGxldHRlcnMsIHdlIGdldCBvbiB0byBncmVla1xuICB2YXIgbGV0dGVyID1cbiAgICAgICAgaSA8IDI2ID8gU3RyaW5nLmZyb21DaGFyQ29kZSgweDYxICsgaSlcbiAgICAgICAgICA6IGkgPCA1MiA/IFN0cmluZy5mcm9tQ2hhckNvZGUoMHg0MSArIGkgLSAyNilcbiAgICAgICAgICAgIDogU3RyaW5nLmZyb21DaGFyQ29kZSgweDNCMSArIGkgLSA1MilcbiAgcmV0dXJuIGxldHRlclxufVxuXG5mdW5jdGlvbiBoaWRlQWxsQWN0aW9ucyAoZSkge1xuICAvLyBoaWRlIGFsbCBxdWVzdGlvbiBhY3Rpb25zXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5xdWVzdGlvbi1hY3Rpb25zJykuZm9yRWFjaChlbCA9PiB7XG4gICAgZWwuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcbiAgfSlcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm92ZXJsYXknKS5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxufVxuIiwiaW1wb3J0IFF1ZXN0aW9uU2V0IGZyb20gJ1F1ZXN0aW9uU2V0J1xuXG4vLyBUT0RPOlxuLy8gIC0gUXVlc3Rpb25TZXQgLSByZWZhY3RvciBpbnRvIG1vcmUgY2xhc3Nlcz8gRS5nLiBvcHRpb25zIHdpbmRvd1xuLy8gIC0gSW1wb3J0IGV4aXN0aW5nIHF1ZXN0aW9uIHR5cGVzIChHIC0gZ3JhcGhpYywgVCAtIHRleHRcbi8vICAgIC0gRyBhbmdsZXNcbi8vICAgIC0gRyBhcmVhXG4vLyAgICAtIFQgZXF1YXRpb24gb2YgYSBsaW5lXG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG4gIGNvbnN0IHFzID0gbmV3IFF1ZXN0aW9uU2V0KClcbiAgcXMuYXBwZW5kVG8oZG9jdW1lbnQuYm9keSlcbiAgcXMuY2hvb3NlVG9waWNzKClcbn0pXG4iXSwibmFtZXMiOlsiY29tbW9uanNIZWxwZXJzLmNyZWF0ZUNvbW1vbmpzTW9kdWxlIiwiY29tbW9uanNIZWxwZXJzLmdldERlZmF1bHRFeHBvcnRGcm9tQ2pzIiwiUlNsaWRlciIsIlRvcGljQ2hvb3Nlci5nZXRUb3BpY3MiLCJUb3BpY0Nob29zZXIuaGFzT3B0aW9ucyIsIlRvcGljQ2hvb3Nlci5uZXdPcHRpb25zU2V0IiwiVG9waWNDaG9vc2VyLmdldFRpdGxlIiwiVG9waWNDaG9vc2VyLmdldENsYXNzIiwiVG9waWNDaG9vc2VyLm5ld1F1ZXN0aW9uIiwiVG9waWNDaG9vc2VyLmdldENvbW1hbmRXb3JkIl0sIm1hcHBpbmdzIjoiOzs7RUFBQTtFQUNBO0VBQ0E7QUFDQTtFQUNBLElBQUksRUFBRSxHQUFHLFVBQVUsSUFBSSxFQUFFO0VBQ3pCLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFJO0VBQ25CLEVBQUUsSUFBSSxDQUFDLFlB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YSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUk7QUFDdEc7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7RUFDdkIsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO0VBQzNCLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUM7RUFDL0QsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQztFQUM3RCxLQUFLO0VBQ0wsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQztFQUNwRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFJO0VBQzdGLEdBQUcsTUFBTTtFQUNULElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFDLEVBQUU7RUFDdEYsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUss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QUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7RUFDbkQsS0FBSztFQUNMLEdBQUcsRUFBRSxHQUFHLEVBQUM7RUFDVCxFQUFDO0FBQ0Q7RUFDQSxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxZQUFZO0VBQ3BDLEVBQUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLHFCQUFxQixFQUFFLENBQUMsS0FBSTtFQUM1RCxFQUFFLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFXO0VBQzVDLEVBQUUsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFO0VBQzNCLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFHLFVBQVUsUUFBUSxFQUFFO0VBQzVDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUTtFQUMvQixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxLQUFLLEdBQUcsUUFBUSxDQUFDLENBQUMsVUFBVSxFQUFDO0VBQ2hFLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFHLFlBQVk7RUFDcEM7RUFDQTtFQUNBLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUNqRixFQUFDO0FBQ0Q7RUFDQSxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxZQUFZO0VBQ3JDO0VBQ0EsRUFBRSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO0VBQzVDLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFHLFlBQVk7RUFD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Q0EsSUFBSSxRQUFRLFVBQVU7RUFDdEIsTUFBTSxLQUFLLENBQUM7RUFDWixRQUFRLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxFQUFDO0VBQzlELFFBQVEsS0FBSztFQUNiLE1BQU0sS0FBSyxDQUFDO0VBQ1osUUFBUSxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxFQUFDO0VBQy9ELFFBQVEsS0FBSztFQUNiLE1BQU0sS0FBSyxDQUFDO0VBQ1osUUFBUSxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxFQUFDO0VBQy9ELFFBQVEsS0FBSztFQUNiLE1BQU0sS0FBSyxDQUFDLENBQUM7RUFDYixNQUFNO0VBQ04sUUFBUSxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLEVBQUM7RUFDaEUsUUFBUSxLQUFLO0VBQ2IsS0FBSztBQUNMO0VBQ0E7RUFDQSxJQUFJO0VBQ0osTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUM3QyxNQUFNLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDN0IsTUFBTTtFQUNOLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFDO0VBQ3pDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFDO0VBQ3pDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFDO0VBQ3pDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFDO0VBQ3pDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFDO0VBQ3pDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFDO0VBQ3pDLEtBQUs7QUFDTDtFQUNBO0VBQ0EsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtFQUMxQixNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUM7RUFDWixNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUM7RUFDWixNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUM7RUFDWixNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUM7RUFDWixLQUFLO0FBQ0w7RUFDQSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztFQUMzQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztBQUMzQztFQUNBO0VBQ0EsSUFBSSxNQUFNLFFBQVEsR0FBRyxDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQ3ZGLElBQUksSUFBSSxRQUFRLENBQUMsY0FBYyxFQUFFO0VBQ2pDLE1BQU0sSUFBSSxDQUFD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QUFLLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUM7RUFDcEMsR0FBRztBQUNIO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxFQUFFLE9BQU8sSUFBSSxDQUFDLENBQUMsR0FBRyxNQUFNLEVBQUU7RUFDMUIsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQzdELElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBQztFQUM3RCxJQUFJLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxPQUFNO0FBQzNCO0VBQ0EsSUFBSSxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQztFQUN4QyxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDNUI7RUFDQSxJQUFJLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNsQyxJQUFJLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNsQyxJQUFJLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztBQUNsQztFQUNBLElBQUksTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFDO0VBQy9CLElBQUksTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDO0VBQzVDLElBQUksTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDO0FBQzVDO0VBQ0EsSUFBSSxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksR0FBRyxTQUFTLEVBQUUsSUFBSSxHQUFHLFNBQVMsQ0FBQztFQUN4RCxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFO0VBQ3RCLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBQztFQUNwRSxJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUM7RUFDcEUsSUFBSSxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7RUFDaEMsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRTtFQUN0QixJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQztFQUNyRSxJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQztFQUNyRSxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQztFQUNoQyxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sTUFBTSxDQUFDLENBQUMsTUFBTSxFQUFFO0VBQ3pCLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBQztFQUNwRSxJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUM7RUFDcEUsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUM7RUFDckUsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUM7RUFDckUsSUFBSSxPQUFPLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQztFQUMxRCxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sVUFBVSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRTtFQUM3QjtFQUNBO0VBQ0EsSUFBSSxNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFDO0VBQzVCLElBQUksTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBQztFQUM1QixJQUFJLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksRUFBQztFQUN6QyxJQUFJLE9BQU8sRUFBRSxDQUFDLEVBQUUsSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxHQUFHLE1BQU0sRUFBRTtFQUNqRCxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRTtFQUMzQixJQUFJLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQy9DLEdBQUc7QUFDSDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxFQUFFLE9BQU8sU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRTtFQUM1QixJQUFJLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBQztFQUN0RCxJQUFJLE9BQU8sS0FBSyxJQUFJLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsS0FBSztFQUNuRCxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFO0VBQzNDO0VBQ0E7RUFDQSxJQUFJLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENB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USxPQUFPLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQzlFLE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDM0IsUUFBUSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztBQUNuQjtFQUNBO0FBQ0E7RUFDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDdkMsVUFBVSxPQUFPLElBQUksUUFBUSxFQUFFO0VBQy9CLFNBQVM7RUFDVCxRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDOUUsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sSUFBSSxFQUFFLFVBQVUsTUFBTSxFQUFFO0VBQzlCLFFBQVEsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxDQUFDLEVBQUM7QUFDMUM7RUFDQSxRQUFRLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzVDLFVBQVUsT0FBTyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUM7RUFDbEMsU0FBUztFQUNULFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztFQUNqRixPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxLQUFLLEVBQUUsVUFBVSxNQUFNLEVBQUU7RUFDL0IsUUFBUSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxJQUFJLENBQUMsRUFBQztBQUMxQztFQUNBLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDNUMsVUFBVSxPQUFPLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQztFQUNsQyxTQUFTO0VBQ1QsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0VBQ2xGLE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEtBQUssRUFBRSxVQUFVLE1BQU0sRUFBRTtFQUMvQixRQUFRLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxNQUFNLElBQUksQ0FBQyxFQUFDO0FBQzFDO0VBQ0EsUUFBUSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUM1QyxVQUFVLE9BQU8sSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDO0VBQ2xDLFNBQVM7RUFDVCxRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDbEYsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sT0FBTyxFQUFFLFlBQVk7RUFDM0IsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ3BELE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRTtFQUN4QixRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtFQUNuQixVQUFVLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNsRixTQUFTLE1BQU07RUFDZixVQUFVLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQ2hGLFNBQVM7RUFDVCxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxNQUFNLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzlCLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbkIsUUFBUSxPQUFPLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztFQUMzRCxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxPQUFPLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQy9CLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbkIsUUFBUSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBQztFQUM1RCxRQUFRLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDaEMsT0FBTztBQUNQO0VBQ0EsTUFBTSxRQUFRLEVBQUUsVUFBVSxHQUFHLEVBQUU7RUFDL0I7QUFDQTtFQUNBLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDNUMsVUFBVSxPQUFPLElBQUk7RUFDckIsU0FBUztBQUNUO0VBQ0EsUUFBUSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsV0FBVyxHQUFFO0FBQzNDO0VBQ0EsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLE1BQUs7QUFDMUI7RUFDQSxRQUFRLFNBQVMsR0FBRyxFQUFFLENBQUMsRUFBRTtFQUN6QixVQUFVLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsRUFBRSxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzNELFVBQVUsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9B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QUFPLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFDO0VBQzFDLElBQUksT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO0VBQzlCLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxDQUFDLEdBQUc7RUFDYixJQUFJLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUU7RUFDcEQsSUFBSSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFO0VBQy9CLFFBQVEsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHO0VBQzNCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDM0IsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEtBQUs7RUFDekMsTUFBTSxJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUU7RUFDdkIsUUFBUSxHQUFHLElBQUksU0FBUTtFQUN2QixPQUFPLE1BQU07RUFDYixRQUFRLEdBQUcsSUFBSSxRQUFRLEdBQUcsR0FBRyxHQUFHLE1BQUs7RUFDckMsT0FBTztFQUNQLEtBQUssRUFBQztFQUNOLElBQUksT0FBTyxHQUFHO0VBQ2QsR0FBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLENBQUMsR0FBRztFQUNWO0VBQ0EsSUFBSSxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUM7RUFDcEQsR0FBRztBQUNIO0VBQ0EsRUFBRSxVQUFVLENBQUMsR0FBRztFQUNoQixJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSztFQUNoQyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsRUFB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R0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUM7RUFDakMsS0FBSztFQUNMLElBQUksTUFBTSxLQUFLLEdBQUcsR0FBRTtFQUNwQixJQUFJLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRSxRQUFRLEdBQUcsS0FBSTtFQUMvQyxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUNoRCxNQUFNLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUNsRCxRQUFRLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQ3BELE9BQU87RUFDUCxLQUFLO0FBQ0w7RUFDQSxJQUFJLElBQUksTUFBTSxHQUFHLElBQUksVUFBVSxDQUFDLEtBQUssRUFBQztFQUN0QyxJQUFJLElBQUksUUFBUSxFQUFFLE1BQU0sR0FBRyxNQUFNLENBQUMsUUFBUSxHQUFFO0FBQzVDO0VBQ0EsSUFBSSxPQUFPLE1BQU07RUFDakIsR0FBRztBQUNIO0VBQ0EsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFO0VBQ3BCLElBQUksSUFBSSxNQUFNLEdBQUcsS0FBSTtFQUNyQixJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDaEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUM7RUFDL0IsS0FBSztFQUNMLElBQUksSUFBSSxRQUFRLEVBQUUsTUFBTSxHQUFHLE1BQU0sQ0FBQyxRQUFRLEdBQUU7RUFDNUMsSUFBSSxPQUFPLE1BQU07RUFDakIs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QUU7RUFDekMsVUFBVSxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUNqRCxVQUFVLE1BQU0sRUFBRSxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUN2RCxVQUFVLE1BQU0sRUFBRSxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUN2RCxVQUFVLE1BQU0sRUFBRSxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUN2RCxVQUFVLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUU7RUFDdEQsVUFBVSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHO0VBQzdCLFlBQVksR0FBRyxFQUFFLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQztFQUNyQyxZQUFZLE1BQU0sRUFBRSxLQUFLO0VBQ3pCLFlBQVc7RUFDWCxTQUFTO0VBQ1QsUUFBUSxLQUFLO0VBQ2IsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsQ0FBQztFQUNiLE1BQU0sS0FBSyxDQUFDLEVBQUU7RUFDZCxRQUFRLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBQztFQUNsRSxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3pDLFVBQVUsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDckQsVUFBVSxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMs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QUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Y0FDaEQsVUFBVSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUE7Y0FDaEQsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQTtXQUNoRDs7VUFHRCxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBOztVQUV0RyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBOztVQUdyQyxVQUFVLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQTtVQUM1RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7O2NBRS9DLE1BQU0sS0FBSyxHQUFvQixFQUFFLENBQUE7Y0FDakMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7Y0FDdEMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLFNBQVMsQ0FBQTs7Y0FHcEUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTs7Ozs7Ozs7Ozs7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
