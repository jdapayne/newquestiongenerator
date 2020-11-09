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
    constructor (optionSpec, template) {
      this.optionSpec = optionSpec;

      this.options = {};
      this.optionSpec.forEach(option => {
        if (option.type !== 'heading' && option.type !== 'column-break') {
          this.options[option.id] = option.default;
        }
      });

      this.template = template; // html template (optional)

      // set an id based on a counter - used for names of form elements
      this.globalId = OptionsSet.getId();
    }

    /**
     * Given an option, find its UI element and update the state from that
     * @param {*} option An element of this.optionSpec or an id
     */
    updateStateFromUI (option) {
      // input - either an element of this.optionsSpec or an option id
      if (typeof (option) === 'string') {
        option = this.optionsSpec.find(x => x.id === option);
        if (!option) throw new Error(`no option with id '${option}'`)
      }
      if (!option.element) throw new Error(`option ${option.id} doesn't have a UI element`)

      switch (option.type) {
        case 'int': {
          const input = option.element.getElementsByTagName('input')[0];
          this.options[option.id] = Number(input.value);
          break
        }
        case 'bool': {
          const input = option.element.getElementsByTagName('input')[0];
          this.options[option.id] = input.checked;
          break
        }
        case 'select-exclusive': {
          this.options[option.id] = option.element.querySelector('input:checked').value;
          break
        }
        case 'select-inclusive': {
          this.options[option.id] =
            Array.from(option.element.querySelectorAll('input:checked'), x => x.value);
          break
        }
        default:
          throw new Error(`option with id ${option.id} has unrecognised option type ${option.type}`)
      }
      // console.log(this.options)
    }

    updateStateFromUIAll () {
      this.optionSpec.forEach(option => this.updateStateFromUI(option));
    }

    disableOrEnableAll () {
      this.optionSpec.forEach(option => this.disableOrEnable(option));
    }

    /**
     * Given an option, find its UI element and update it according to the options ID
     * @param {*} option An element of this.optionsSpec or an option id
     */
    updateUIFromState (option) {
    }

    /**
     * Given an option, enable or disable the UI element depending on the value of option.disableIf and the
     * state of the corresponding boolean option
     * @param {*} option An element of this.optionsSpec or an option id
     */
    disableOrEnable (option) {
      if (typeof (option) === 'string') {
        option = this.optionsSpec.find(x => x.id === option);
        if (!option) throw new Error(`no option with id '${option}'`)
      }

      if (!option.disabledIf) return

      // Inverse everything if begining with !
      let disablerId = option.disabledIf;
      let enable = false; // disable iff disabler is true
      if (disablerId.startsWith('!')) {
        enable = true; // endable iff disabler is true
        disablerId = disablerId.slice(1);
      }

      // Endable or disable
      if (this.options[disablerId] === enable) { // enable
        option.element.classList.remove('disabled')
        ;[...option.element.getElementsByTagName('input')].forEach(e => { e.disabled = false; });
      } else { // disable
        option.element.classList.add('disabled')
        ;[...option.element.getElementsByTagName('input')].forEach(e => { e.disabled = true; });
      }
    }

    renderIn (element) {
      const list = createElem('ul', 'options-list');
      let column = createElem('div', 'options-column', list);

      this.optionSpec.forEach(option => {
        if (option.type === 'column-break') { // start new column
          column = createElem('div', 'options-column', list);
        } else { // make list item
          const li = createElem('li', undefined, column);
          li.dataset.optionId = option.id;

          switch (option.type) {
            case 'heading':
              renderHeading(option.title, li);
              break
            case 'int':
            case 'bool':
              renderSingleOption(option, li);
              break
            case 'select-inclusive':
            case 'select-exclusive':
              this.renderListOption(option, li);
          }
          li.addEventListener('change', e => { this.updateStateFromUI(option); this.disableOrEnableAll(); });
          option.element = li;

          if (option.style === 'emph') { li.classList.add('emphasise'); }
        }
      });
      element.append(list);

      this.disableOrEnableAll();
    }

    renderListOption (option, li) {
      li.append(option.title + ': ');

      const sublist = createElem('ul', 'options-sublist', li);
      if (option.vertical) sublist.classList.add('options-sublist-vertical');

      option.selectOptions.forEach(selectOption => {
        const sublistLi = createElem('li', null, sublist);
        const label = createElem('label', null, sublistLi);

        const input = document.createElement('input');
        input.type = option.type === 'select-exclusive' ? 'radio' : 'checkbox';
        input.name = this.globalId + '-' + option.id;
        input.value = selectOption.id;

        if (option.type === 'select-inclusive') { // defaults work different for inclusive/exclusive
          input.checked = option.default.includes(selectOption.id);
        } else {
          input.checked = option.default === selectOption.id;
        }

        label.append(input);

        input.classList.add('option');

        label.append(selectOption.title);
      });
    }
  }

  /**
   * Renders a heading option
   * @param {string} title The title of the heading
   * @param {HTMLElement} li The element to render into
   */
  function renderHeading (title, li) {
    li.append(title);
    li.classList.add('options-heading');
  }

  /**
   * Renders single parameter
   * @param {*} option
   * @param {*} li
   */
  function renderSingleOption (option, li) {
    const label = createElem('label', undefined, li);

    if (!option.swapLabel && option.title !== '') label.append(option.title + ': ');

    const input = createElem('input', 'option', label);
    switch (option.type) {
      case 'int':
        input.type = 'number';
        input.min = option.min;
        input.max = option.max;
        input.value = option.default;
        break
      case 'bool':
        input.type = 'checkbox';
        input.checked = option.default;
        break
      default:
        throw new Error(`unknown option type ${option.type}`)
    }

    if (option.swapLabel && option.title !== '') label.append(' ' + option.title);
  }

  OptionsSet.idCounter = 0; // increment each time to create unique ids to use in ids/names of elements

  OptionsSet.getId = function () {
    if (OptionsSet.idCounter >= 26 ** 2) throw new Error('Too many options objects!')
    const id = String.fromCharCode(~~(OptionsSet.idCounter / 26) + 97) +
      String.fromCharCode(OptionsSet.idCounter % 26 + 97);

    OptionsSet.idCounter += 1;

    return id
  };

  OptionsSet.demoSpec = [
    {
      title: 'Difficulty',
      id: 'difficulty',
      type: 'int',
      min: 1,
      max: 10,
      default: 5
    },
    {
      title: 'Type',
      id: 'type',
      type: 'select-exclusive',
      selectOptions: [
        { title: 'Rectangle', id: 'rectangle' },
        { title: 'Triangle', id: 'triangle' },
        { title: 'Squoval', id: 'squoval' }
      ],
      default: 'rectangle'
    },
    {
      title: 'A heading',
      type: 'heading'
    },
    {
      title: 'Shape',
      id: 'shape',
      type: 'select-inclusive',
      selectOptions: [
        { title: 'Rectangle shape thing', id: 'rectangle' },
        { title: 'Triangle shape thing', id: 'triangle' },
        { title: 'Squoval shape long', id: 'squoval' }
      ],
      default: ['rectangle', 'squoval'],
      vertical: true // layout vertically, rather than horizontally
    },
    {
      type: 'column-break'
    },
    {
      type: 'heading',
      title: 'A new column'
    },
    {
      title: 'Do something',
      id: 'something',
      type: 'bool',
      default: true,
      swapLabel: true // put control before label
    }
  ];

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
                  title: 'Use custom settings (disables difficulty)',
                  default: false,
                  id: 'custom',
                  style: 'emph'
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vbW9kdWxlcy92ZW5kb3IvcnNsaWRlci5qcyIsIi4uL21vZHVsZXMvVXRpbGl0aWVzLmpzIiwiLi4vbW9kdWxlcy9PcHRpb25zU2V0LmpzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9RdWVzdGlvbi50cyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGV4dFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FsZ2VicmFpY0ZyYWN0aW9uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvSW50ZWdlckFkZC5qcyIsIi4uL21vZHVsZXMvUG9pbnQuanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRLnRzIiwiLi4vbW9kdWxlcy92ZW5kb3IvZnJhY3Rpb24uanMiLCIuLi9tb2R1bGVzL01vbm9taWFsLmpzIiwiLi4vbW9kdWxlcy9Qb2x5bm9taWFsLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9Bcml0aG1hZ29uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGVzdFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FkZEFaZXJvLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9UZXh0US9FcXVhdGlvbk9mTGluZS5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEudHMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUS5qcyIsIi4uL21vZHVsZXMvTGluRXhwci5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9zb2x2ZUFuZ2xlcy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhLnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dvcmRlZFEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dyYXBwZXIudHMiLCIuLi9tb2R1bGVzL1RvcGljQ2hvb3Nlci5qcyIsIi4uL21vZHVsZXMvdmVuZG9yL1RpbmdsZS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb25TZXQuanMiLCIuLi9tYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIFJzbGlkZXIuIERvd25sb2FkZWQgZnJvbSBodHRwczovL3NsYXdvbWlyLXphemlhYmxvLmdpdGh1Yi5pby9yYW5nZS1zbGlkZXIvXG4gKiBNb2RpZmllZCB0byBtYWtlIGludG8gRVM2IG1vZHVsZSBhbmQgZml4IGEgZmV3IGJ1Z3NcbiAqL1xuXG52YXIgUlMgPSBmdW5jdGlvbiAoY29uZikge1xuICB0aGlzLmlucHV0ID0gbnVsbFxuICB0aGlzLmlucHV0RGlzcGxheSA9IG51bGxcbiAgdGhpcy5zbGlkZXIgPSBudWxsXG4gIHRoaXMuc2xpZGVyV2lkdGggPSAwXG4gIHRoaXMuc2xpZGVyTGVmdCA9IDBcbiAgdGhpcy5wb2ludGVyV2lkdGggPSAwXG4gIHRoaXMucG9pbnRlclIgPSBudWxsXG4gIHRoaXMucG9pbnRlckwgPSBudWxsXG4gIHRoaXMuYWN0aXZlUG9pbnRlciA9IG51bGxcbiAgdGhpcy5zZWxlY3RlZCA9IG51bGxcbiAgdGhpcy5zY2FsZSA9IG51bGxcbiAgdGhpcy5zdGVwID0gMFxuICB0aGlzLnRpcEwgPSBudWxsXG4gIHRoaXMudGlwUiA9IG51bGxcbiAgdGhpcy50aW1lb3V0ID0gbnVsbFxuICB0aGlzLnZhbFJhbmdlID0gZmFsc2VcblxuICB0aGlzLnZhbHVlcyA9IHtcbiAgICBzdGFydDogbnVsbCxcbiAgICBlbmQ6IG51bGxcbiAgfVxuICB0aGlzLmNvbmYgPSB7XG4gICAgdGFyZ2V0OiBudWxsLFxuICAgIHZhbHVlczogbnVsbCxcbiAgICBzZXQ6IG51bGwsXG4gICAgcmFuZ2U6IGZhbHNlLFxuICAgIHdpZHRoOiBudWxsLFxuICAgIHNjYWxlOiB0cnVlLFxuICAgIGxhYmVsczogdHJ1ZSxcbiAgICB0b29sdGlwOiB0cnVlLFxuICAgIHN0ZXA6IG51bGwsXG4gICAgZGlzYWJsZWQ6IGZhbHNlLFxuICAgIG9uQ2hhbmdlOiBudWxsXG4gIH1cblxuICB0aGlzLmNscyA9IHtcbiAgICBjb250YWluZXI6ICdycy1jb250YWluZXInLFxuICAgIGJhY2tncm91bmQ6ICdycy1iZycsXG4gICAgc2VsZWN0ZWQ6ICdycy1zZWxlY3RlZCcsXG4gICAgcG9pbnRlcjogJ3JzLXBvaW50ZXInLFxuICAgIHNjYWxlOiAncnMtc2NhbGUnLFxuICAgIG5vc2NhbGU6ICdycy1ub3NjYWxlJyxcbiAgICB0aXA6ICdycy10b29sdGlwJ1xuICB9XG5cbiAgZm9yICh2YXIgaSBpbiB0aGlzLmNvbmYpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb25mLCBpKSkgdGhpcy5jb25mW2ldID0gY29uZltpXSB9XG5cbiAgdGhpcy5pbml0KClcbn1cblxuUlMucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgdGhpcy5jb25mLnRhcmdldCA9PT0gJ29iamVjdCcpIHRoaXMuaW5wdXQgPSB0aGlzLmNvbmYudGFyZ2V0XG4gIGVsc2UgdGhpcy5pbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMuY29uZi50YXJnZXQucmVwbGFjZSgnIycsICcnKSlcblxuICBpZiAoIXRoaXMuaW5wdXQpIHJldHVybiBjb25zb2xlLmxvZygnQ2Fubm90IGZpbmQgdGFyZ2V0IGVsZW1lbnQuLi4nKVxuXG4gIHRoaXMuaW5wdXREaXNwbGF5ID0gZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLmlucHV0LCBudWxsKS5kaXNwbGF5XG4gIHRoaXMuaW5wdXQuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuICB0aGlzLnZhbFJhbmdlID0gISh0aGlzLmNvbmYudmFsdWVzIGluc3RhbmNlb2YgQXJyYXkpXG5cbiAgaWYgKHRoaXMudmFsUmFuZ2UpIHtcbiAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLmNvbmYudmFsdWVzLCAnbWluJykgfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLmNvbmYudmFsdWVzLCAnbWF4JykpIHsgcmV0dXJuIGNvbnNvbGUubG9nKCdNaXNzaW5nIG1pbiBvciBtYXggdmFsdWUuLi4nKSB9XG4gIH1cbiAgcmV0dXJuIHRoaXMuY3JlYXRlU2xpZGVyKClcbn1cblxuUlMucHJvdG90eXBlLmNyZWF0ZVNsaWRlciA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zbGlkZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy5jb250YWluZXIpXG4gIHRoaXMuc2xpZGVyLmlubmVySFRNTCA9ICc8ZGl2IGNsYXNzPVwicnMtYmdcIj48L2Rpdj4nXG4gIHRoaXMuc2VsZWN0ZWQgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy5zZWxlY3RlZClcbiAgdGhpcy5wb2ludGVyTCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnBvaW50ZXIsIFsnZGlyJywgJ2xlZnQnXSlcbiAgdGhpcy5zY2FsZSA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnNjYWxlKVxuXG4gIGlmICh0aGlzLmNvbmYudG9vbHRpcCkge1xuICAgIHRoaXMudGlwTCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnRpcClcbiAgICB0aGlzLnRpcFIgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy50aXApXG4gICAgdGhpcy5wb2ludGVyTC5hcHBlbmRDaGlsZCh0aGlzLnRpcEwpXG4gIH1cbiAgdGhpcy5zbGlkZXIuYXBwZW5kQ2hpbGQodGhpcy5zZWxlY3RlZClcbiAgdGhpcy5zbGlkZXIuYXBwZW5kQ2hpbGQodGhpcy5zY2FsZSlcbiAgdGhpcy5zbGlkZXIuYXBwZW5kQ2hpbGQodGhpcy5wb2ludGVyTClcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgdGhpcy5wb2ludGVyUiA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnBvaW50ZXIsIFsnZGlyJywgJ3JpZ2h0J10pXG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB0aGlzLnBvaW50ZXJSLmFwcGVuZENoaWxkKHRoaXMudGlwUilcbiAgICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnBvaW50ZXJSKVxuICB9XG5cbiAgdGhpcy5pbnB1dC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLnNsaWRlciwgdGhpcy5pbnB1dC5uZXh0U2libGluZylcblxuICBpZiAodGhpcy5jb25mLndpZHRoKSB0aGlzLnNsaWRlci5zdHlsZS53aWR0aCA9IHBhcnNlSW50KHRoaXMuY29uZi53aWR0aCkgKyAncHgnXG4gIHRoaXMuc2xpZGVyTGVmdCA9IHRoaXMuc2xpZGVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmxlZnRcbiAgdGhpcy5zbGlkZXJXaWR0aCA9IHRoaXMuc2xpZGVyLmNsaWVudFdpZHRoXG4gIHRoaXMucG9pbnRlcldpZHRoID0gdGhpcy5wb2ludGVyTC5jbGllbnRXaWR0aFxuXG4gIGlmICghdGhpcy5jb25mLnNjYWxlKSB0aGlzLnNsaWRlci5jbGFzc0xpc3QuYWRkKHRoaXMuY2xzLm5vc2NhbGUpXG5cbiAgcmV0dXJuIHRoaXMuc2V0SW5pdGlhbFZhbHVlcygpXG59XG5cblJTLnByb3RvdHlwZS5zZXRJbml0aWFsVmFsdWVzID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmRpc2FibGVkKHRoaXMuY29uZi5kaXNhYmxlZClcblxuICBpZiAodGhpcy52YWxSYW5nZSkgdGhpcy5jb25mLnZhbHVlcyA9IHByZXBhcmVBcnJheVZhbHVlcyh0aGlzLmNvbmYpXG5cbiAgdGhpcy52YWx1ZXMuc3RhcnQgPSAwXG4gIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi5yYW5nZSA/IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSA6IDBcblxuICBpZiAodGhpcy5jb25mLnNldCAmJiB0aGlzLmNvbmYuc2V0Lmxlbmd0aCAmJiBjaGVja0luaXRpYWwodGhpcy5jb25mKSkge1xuICAgIHZhciB2YWxzID0gdGhpcy5jb25mLnNldFxuXG4gICAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgICAgdGhpcy52YWx1ZXMuc3RhcnQgPSB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YodmFsc1swXSlcbiAgICAgIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi5zZXRbMV0gPyB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YodmFsc1sxXSkgOiBudWxsXG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzBdKVxuICB9XG4gIHJldHVybiB0aGlzLmNyZWF0ZVNjYWxlKClcbn1cblxuUlMucHJvdG90eXBlLmNyZWF0ZVNjYWxlID0gZnVuY3Rpb24gKHJlc2l6ZSkge1xuICB0aGlzLnN0ZXAgPSB0aGlzLnNsaWRlcldpZHRoIC8gKHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSlcblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7XG4gICAgdmFyIHNwYW4gPSBjcmVhdGVFbGVtZW50KCdzcGFuJylcbiAgICB2YXIgaW5zID0gY3JlYXRlRWxlbWVudCgnaW5zJylcblxuICAgIHNwYW4uYXBwZW5kQ2hpbGQoaW5zKVxuICAgIHRoaXMuc2NhbGUuYXBwZW5kQ2hpbGQoc3BhbilcblxuICAgIHNwYW4uc3R5bGUud2lkdGggPSBpID09PSBpTGVuIC0gMSA/IDAgOiB0aGlzLnN0ZXAgKyAncHgnXG5cbiAgICBpZiAoIXRoaXMuY29uZi5sYWJlbHMpIHtcbiAgICAgIGlmIChpID09PSAwIHx8IGkgPT09IGlMZW4gLSAxKSBpbnMuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1tpXVxuICAgIH0gZWxzZSBpbnMuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1tpXVxuXG4gICAgaW5zLnN0eWxlLm1hcmdpbkxlZnQgPSAoaW5zLmNsaWVudFdpZHRoIC8gMikgKiAtMSArICdweCdcbiAgfVxuICByZXR1cm4gdGhpcy5hZGRFdmVudHMoKVxufVxuXG5SUy5wcm90b3R5cGUudXBkYXRlU2NhbGUgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc3RlcCA9IHRoaXMuc2xpZGVyV2lkdGggLyAodGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKVxuXG4gIHZhciBwaWVjZXMgPSB0aGlzLnNsaWRlci5xdWVyeVNlbGVjdG9yQWxsKCdzcGFuJylcblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IHBpZWNlcy5sZW5ndGg7IGkgPCBpTGVuIC0gMTsgaSsrKSB7IHBpZWNlc1tpXS5zdHlsZS53aWR0aCA9IHRoaXMuc3RlcCArICdweCcgfVxuXG4gIHJldHVybiB0aGlzLnNldFZhbHVlcygpXG59XG5cblJTLnByb3RvdHlwZS5hZGRFdmVudHMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBwb2ludGVycyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy4nICsgdGhpcy5jbHMucG9pbnRlcilcbiAgdmFyIHBpZWNlcyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NwYW4nKVxuXG4gIGNyZWF0ZUV2ZW50cyhkb2N1bWVudCwgJ21vdXNlbW92ZSB0b3VjaG1vdmUnLCB0aGlzLm1vdmUuYmluZCh0aGlzKSlcbiAgY3JlYXRlRXZlbnRzKGRvY3VtZW50LCAnbW91c2V1cCB0b3VjaGVuZCB0b3VjaGNhbmNlbCcsIHRoaXMuZHJvcC5iaW5kKHRoaXMpKVxuXG4gIGZvciAobGV0IGkgPSAwLCBpTGVuID0gcG9pbnRlcnMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7IGNyZWF0ZUV2ZW50cyhwb2ludGVyc1tpXSwgJ21vdXNlZG93biB0b3VjaHN0YXJ0JywgdGhpcy5kcmFnLmJpbmQodGhpcykpIH1cblxuICBmb3IgKGxldCBpID0gMCwgaUxlbiA9IHBpZWNlcy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgY3JlYXRlRXZlbnRzKHBpZWNlc1tpXSwgJ2NsaWNrJywgdGhpcy5vbkNsaWNrUGllY2UuYmluZCh0aGlzKSkgfVxuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLm9uUmVzaXplLmJpbmQodGhpcykpXG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLmRyYWcgPSBmdW5jdGlvbiAoZSkge1xuICBlLnByZXZlbnREZWZhdWx0KClcblxuICBpZiAodGhpcy5jb25mLmRpc2FibGVkKSByZXR1cm5cblxuICB2YXIgZGlyID0gZS50YXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLWRpcicpXG4gIGlmIChkaXIgPT09ICdsZWZ0JykgdGhpcy5hY3RpdmVQb2ludGVyID0gdGhpcy5wb2ludGVyTFxuICBpZiAoZGlyID09PSAncmlnaHQnKSB0aGlzLmFjdGl2ZVBvaW50ZXIgPSB0aGlzLnBvaW50ZXJSXG5cbiAgcmV0dXJuIHRoaXMuc2xpZGVyLmNsYXNzTGlzdC5hZGQoJ3NsaWRpbmcnKVxufVxuXG5SUy5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uIChlKSB7XG4gIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgJiYgIXRoaXMuY29uZi5kaXNhYmxlZCkge1xuICAgIHZhciBjb29yZFggPSBlLnR5cGUgPT09ICd0b3VjaG1vdmUnID8gZS50b3VjaGVzWzBdLmNsaWVudFggOiBlLnBhZ2VYXG4gICAgdmFyIGluZGV4ID0gY29vcmRYIC0gdGhpcy5zbGlkZXJMZWZ0IC0gKHRoaXMucG9pbnRlcldpZHRoIC8gMilcblxuICAgIGluZGV4ID0gTWF0aC5yb3VuZChpbmRleCAvIHRoaXMuc3RlcClcblxuICAgIGlmIChpbmRleCA8PSAwKSBpbmRleCA9IDBcbiAgICBpZiAoaW5kZXggPiB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpIGluZGV4ID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG5cbiAgICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgICBpZiAodGhpcy5hY3RpdmVQb2ludGVyID09PSB0aGlzLnBvaW50ZXJMKSB0aGlzLnZhbHVlcy5zdGFydCA9IGluZGV4XG4gICAgICBpZiAodGhpcy5hY3RpdmVQb2ludGVyID09PSB0aGlzLnBvaW50ZXJSKSB0aGlzLnZhbHVlcy5lbmQgPSBpbmRleFxuICAgIH0gZWxzZSB0aGlzLnZhbHVlcy5lbmQgPSBpbmRleFxuXG4gICAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbiAgfVxufVxuXG5SUy5wcm90b3R5cGUuZHJvcCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5hY3RpdmVQb2ludGVyID0gbnVsbFxufVxuXG5SUy5wcm90b3R5cGUuc2V0VmFsdWVzID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGFjdGl2ZVBvaW50ZXIgPSB0aGlzLmNvbmYucmFuZ2UgPyAnc3RhcnQnIDogJ2VuZCdcblxuICBpZiAoc3RhcnQgJiYgdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHN0YXJ0KSA+IC0xKSB7IHRoaXMudmFsdWVzW2FjdGl2ZVBvaW50ZXJdID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHN0YXJ0KSB9XG5cbiAgaWYgKGVuZCAmJiB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YoZW5kKSA+IC0xKSB7IHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZihlbmQpIH1cblxuICBpZiAodGhpcy5jb25mLnJhbmdlICYmIHRoaXMudmFsdWVzLnN0YXJ0ID4gdGhpcy52YWx1ZXMuZW5kKSB7IHRoaXMudmFsdWVzLnN0YXJ0ID0gdGhpcy52YWx1ZXMuZW5kIH1cblxuICB0aGlzLnBvaW50ZXJMLnN0eWxlLmxlZnQgPSAodGhpcy52YWx1ZXNbYWN0aXZlUG9pbnRlcl0gKiB0aGlzLnN0ZXAgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKSkgKyAncHgnXG5cbiAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgIGlmICh0aGlzLmNvbmYudG9vbHRpcCkge1xuICAgICAgdGhpcy50aXBMLmlubmVySFRNTCA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdXG4gICAgICB0aGlzLnRpcFIuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG4gICAgfVxuICAgIHRoaXMuaW5wdXQudmFsdWUgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLnN0YXJ0XSArICcsJyArIHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxuICAgIHRoaXMucG9pbnRlclIuc3R5bGUubGVmdCA9ICh0aGlzLnZhbHVlcy5lbmQgKiB0aGlzLnN0ZXAgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKSkgKyAncHgnXG4gIH0gZWxzZSB7XG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7IHRoaXMudGlwTC5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF0gfVxuICAgIHRoaXMuaW5wdXQudmFsdWUgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1cbiAgfVxuXG4gIGlmICh0aGlzLnZhbHVlcy5lbmQgPiB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpIHRoaXMudmFsdWVzLmVuZCA9IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMVxuICBpZiAodGhpcy52YWx1ZXMuc3RhcnQgPCAwKSB0aGlzLnZhbHVlcy5zdGFydCA9IDBcblxuICB0aGlzLnNlbGVjdGVkLnN0eWxlLndpZHRoID0gKHRoaXMudmFsdWVzLmVuZCAtIHRoaXMudmFsdWVzLnN0YXJ0KSAqIHRoaXMuc3RlcCArICdweCdcbiAgdGhpcy5zZWxlY3RlZC5zdHlsZS5sZWZ0ID0gdGhpcy52YWx1ZXMuc3RhcnQgKiB0aGlzLnN0ZXAgKyAncHgnXG5cbiAgcmV0dXJuIHRoaXMub25DaGFuZ2UoKVxufVxuXG5SUy5wcm90b3R5cGUub25DbGlja1BpZWNlID0gZnVuY3Rpb24gKGUpIHtcbiAgaWYgKHRoaXMuY29uZi5kaXNhYmxlZCkgcmV0dXJuXG5cbiAgdmFyIGlkeCA9IE1hdGgucm91bmQoKGUuY2xpZW50WCAtIHRoaXMuc2xpZGVyTGVmdCkgLyB0aGlzLnN0ZXApXG5cbiAgaWYgKGlkeCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgaWR4ID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG4gIGlmIChpZHggPCAwKSBpZHggPSAwXG5cbiAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgIGlmIChpZHggLSB0aGlzLnZhbHVlcy5zdGFydCA8PSB0aGlzLnZhbHVlcy5lbmQgLSBpZHgpIHtcbiAgICAgIHRoaXMudmFsdWVzLnN0YXJ0ID0gaWR4XG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IGlkeFxuICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gaWR4XG5cbiAgdGhpcy5zbGlkZXIuY2xhc3NMaXN0LnJlbW92ZSgnc2xpZGluZycpXG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLm9uQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX3RoaXMgPSB0aGlzXG5cbiAgaWYgKHRoaXMudGltZW91dCkgY2xlYXJUaW1lb3V0KHRoaXMudGltZW91dClcblxuICB0aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoX3RoaXMuY29uZi5vbkNoYW5nZSAmJiB0eXBlb2YgX3RoaXMuY29uZi5vbkNoYW5nZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIF90aGlzLmNvbmYub25DaGFuZ2UoX3RoaXMuaW5wdXQudmFsdWUpXG4gICAgfVxuICB9LCA1MDApXG59XG5cblJTLnByb3RvdHlwZS5vblJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gdGhpcy5zbGlkZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdFxuICB0aGlzLnNsaWRlcldpZHRoID0gdGhpcy5zbGlkZXIuY2xpZW50V2lkdGhcbiAgcmV0dXJuIHRoaXMudXBkYXRlU2NhbGUoKVxufVxuXG5SUy5wcm90b3R5cGUuZGlzYWJsZWQgPSBmdW5jdGlvbiAoZGlzYWJsZWQpIHtcbiAgdGhpcy5jb25mLmRpc2FibGVkID0gZGlzYWJsZWRcbiAgdGhpcy5zbGlkZXIuY2xhc3NMaXN0W2Rpc2FibGVkID8gJ2FkZCcgOiAncmVtb3ZlJ10oJ2Rpc2FibGVkJylcbn1cblxuUlMucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAvLyBSZXR1cm4gbGlzdCBvZiBudW1iZXJzLCByYXRoZXIgdGhhbiBhIHN0cmluZywgd2hpY2ggd291bGQganVzdCBiZSBzaWxseVxuICAvLyAgcmV0dXJuIHRoaXMuaW5wdXQudmFsdWVcbiAgcmV0dXJuIFt0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLnN0YXJ0XSwgdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXVxufVxuXG5SUy5wcm90b3R5cGUuZ2V0VmFsdWVMID0gZnVuY3Rpb24gKCkge1xuICAvLyBHZXQgbGVmdCAoaS5lLiBzbWFsbGVzdCkgdmFsdWVcbiAgcmV0dXJuIHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdXG59XG5cblJTLnByb3RvdHlwZS5nZXRWYWx1ZVIgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIEdldCByaWdodCAoaS5lLiBzbWFsbGVzdCkgdmFsdWVcbiAgcmV0dXJuIHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxufVxuXG5SUy5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5pbnB1dC5zdHlsZS5kaXNwbGF5ID0gdGhpcy5pbnB1dERpc3BsYXlcbiAgdGhpcy5zbGlkZXIucmVtb3ZlKClcbn1cblxudmFyIGNyZWF0ZUVsZW1lbnQgPSBmdW5jdGlvbiAoZWwsIGNscywgZGF0YUF0dHIpIHtcbiAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGVsKVxuICBpZiAoY2xzKSBlbGVtZW50LmNsYXNzTmFtZSA9IGNsc1xuICBpZiAoZGF0YUF0dHIgJiYgZGF0YUF0dHIubGVuZ3RoID09PSAyKSB7IGVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLScgKyBkYXRhQXR0clswXSwgZGF0YUF0dHJbMV0pIH1cblxuICByZXR1cm4gZWxlbWVudFxufVxuXG52YXIgY3JlYXRlRXZlbnRzID0gZnVuY3Rpb24gKGVsLCBldiwgY2FsbGJhY2spIHtcbiAgdmFyIGV2ZW50cyA9IGV2LnNwbGl0KCcgJylcblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IGV2ZW50cy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudHNbaV0sIGNhbGxiYWNrKSB9XG59XG5cbnZhciBwcmVwYXJlQXJyYXlWYWx1ZXMgPSBmdW5jdGlvbiAoY29uZikge1xuICB2YXIgdmFsdWVzID0gW11cbiAgdmFyIHJhbmdlID0gY29uZi52YWx1ZXMubWF4IC0gY29uZi52YWx1ZXMubWluXG5cbiAgaWYgKCFjb25mLnN0ZXApIHtcbiAgICBjb25zb2xlLmxvZygnTm8gc3RlcCBkZWZpbmVkLi4uJylcbiAgICByZXR1cm4gW2NvbmYudmFsdWVzLm1pbiwgY29uZi52YWx1ZXMubWF4XVxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGlMZW4gPSAocmFuZ2UgLyBjb25mLnN0ZXApOyBpIDwgaUxlbjsgaSsrKSB7IHZhbHVlcy5wdXNoKGNvbmYudmFsdWVzLm1pbiArIGkgKiBjb25mLnN0ZXApIH1cblxuICBpZiAodmFsdWVzLmluZGV4T2YoY29uZi52YWx1ZXMubWF4KSA8IDApIHZhbHVlcy5wdXNoKGNvbmYudmFsdWVzLm1heClcblxuICByZXR1cm4gdmFsdWVzXG59XG5cbnZhciBjaGVja0luaXRpYWwgPSBmdW5jdGlvbiAoY29uZikge1xuICBpZiAoIWNvbmYuc2V0IHx8IGNvbmYuc2V0Lmxlbmd0aCA8IDEpIHJldHVybiBudWxsXG4gIGlmIChjb25mLnZhbHVlcy5pbmRleE9mKGNvbmYuc2V0WzBdKSA8IDApIHJldHVybiBudWxsXG5cbiAgaWYgKGNvbmYucmFuZ2UpIHtcbiAgICBpZiAoY29uZi5zZXQubGVuZ3RoIDwgMiB8fCBjb25mLnZhbHVlcy5pbmRleE9mKGNvbmYuc2V0WzFdKSA8IDApIHJldHVybiBudWxsXG4gIH1cbiAgcmV0dXJuIHRydWVcbn1cblxuZXhwb3J0IGRlZmF1bHQgUlNcbiIsIi8qIFJOR3MgLyBzZWxlY3RvcnMgKi9cbmV4cG9ydCBmdW5jdGlvbiBnYXVzc2lhbiAobikge1xuICBsZXQgcm51bSA9IDBcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICBybnVtICs9IE1hdGgucmFuZG9tKClcbiAgfVxuICByZXR1cm4gcm51bSAvIG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJhbmRCZXR3ZWVuIChuLCBtLCBkaXN0KSB7XG4gIC8vIHJldHVybiBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbiBhbmQgbSBpbmNsdXNpdmVcbiAgLy8gZGlzdCAob3B0aW9uYWwpIGlzIGEgZnVuY3Rpb24gcmV0dXJuaW5nIGEgdmFsdWUgaW4gWzAsMSlcbiAgLy8gZGVmYXVsdCBpcyBzbGlnaHRseSBiaWFzZWQgdG93YXJkcyBtaWRkbGVcbiAgaWYgKCFkaXN0KSBkaXN0ID0gTWF0aC5yYW5kb21cbiAgcmV0dXJuIG4gKyBNYXRoLmZsb29yKGRpc3QoKSAqIChtIC0gbiArIDEpKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZEJldHdlZW5GaWx0ZXIgKG4sIG0sIGZpbHRlcikge1xuICAvKiByZXR1cm5zIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBuIGFuZCBtIGluY2x1c2l2ZSB3aGljaCBzYXRpc2ZpZXMgdGhlIGZpbHRlclxuICAvICBuLCBtOiBpbnRlZ2VyXG4gIC8gIGZpbHRlcjogSW50LT4gQm9vbFxuICAqL1xuICBjb25zdCBhcnIgPSBbXVxuICBmb3IgKGxldCBpID0gbjsgaSA8IG0gKyAxOyBpKyspIHtcbiAgICBpZiAoZmlsdGVyKGkpKSBhcnIucHVzaChpKVxuICB9XG4gIGlmIChhcnIgPT09IFtdKSB0aHJvdyBuZXcgRXJyb3IoJ292ZXJmaWx0ZXJlZCcpXG4gIGNvbnN0IGkgPSByYW5kQmV0d2VlbigwLCBhcnIubGVuZ3RoIC0gMSlcbiAgcmV0dXJuIGFycltpXVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZE11bHRCZXR3ZWVuIChtaW4sIG1heCwgbikge1xuICAvLyByZXR1cm4gYSByYW5kb20gbXVsdGlwbGUgb2YgbiBiZXR3ZWVuIG4gYW5kIG0gKGluY2x1c2l2ZSBpZiBwb3NzaWJsZSlcbiAgbWluID0gTWF0aC5jZWlsKG1pbiAvIG4pICogblxuICBtYXggPSBNYXRoLmZsb29yKG1heCAvIG4pICogbiAvLyBjb3VsZCBjaGVjayBkaXZpc2liaWxpdHkgZmlyc3QgdG8gbWF4aW1pc2UgcGVyZm9ybWFjZSwgYnV0IEknbSBzdXJlIHRoZSBoaXQgaXNuJ3QgYmFkXG5cbiAgcmV0dXJuIHJhbmRCZXR3ZWVuKG1pbiAvIG4sIG1heCAvIG4pICogblxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZEVsZW0gKGFycmF5LCBkaXN0KSB7XG4gIGlmIChbLi4uYXJyYXldLmxlbmd0aCA9PT0gMCkgdGhyb3cgbmV3IEVycm9yKCdlbXB0eSBhcnJheScpXG4gIGlmICghZGlzdCkgZGlzdCA9IE1hdGgucmFuZG9tXG4gIGNvbnN0IG4gPSBhcnJheS5sZW5ndGggfHwgYXJyYXkuc2l6ZVxuICBjb25zdCBpID0gcmFuZEJldHdlZW4oMCwgbiAtIDEsIGRpc3QpXG4gIHJldHVybiBbLi4uYXJyYXldW2ldXG59XG5cbi8qIE1hdGhzICovXG5leHBvcnQgZnVuY3Rpb24gcm91bmRUb1RlbiAobikge1xuICByZXR1cm4gTWF0aC5yb3VuZChuIC8gMTApICogMTBcbn1cblxuLyoqXG4gKiBSb3VuZHMgYSBudW1iZXIgdG8gYSBnaXZlbiBudW1iZXIgb2YgZGVjaW1hbCBwbGFjZXNcbiAqIEBwYXJhbSB7bnVtYmVyfSB4IFRoZSBudW1iZXIgdG8gcm91bmRcbiAqIEBwYXJhbSB7bnVtYmVyfSBuIFRoZSBudW1iZXIgb2YgZGVjaW1hbCBwbGFjZXNcbiAqIEByZXR1cm5zIHtudW1iZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByb3VuZERQICh4LCBuKSB7XG4gIHJldHVybiBNYXRoLnJvdW5kKHggKiBNYXRoLnBvdygxMCwgbikpIC8gTWF0aC5wb3coMTAsIG4pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWdUb1JhZCAoeCkge1xuICByZXR1cm4geCAqIE1hdGguUEkgLyAxODBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNpbkRlZyAoeCkge1xuICByZXR1cm4gTWF0aC5zaW4oeCAqIE1hdGguUEkgLyAxODApXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb3NEZWcgKHgpIHtcbiAgcmV0dXJuIE1hdGguY29zKHggKiBNYXRoLlBJIC8gMTgwKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2NhbGVkU3RyIChuLCBkcCkge1xuICAvLyByZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGluZyBuLzEwXmRwXG4gIC8vIGUuZy4gc2NhbGVkU3RyKDM0LDEpPVwiMy40XCJcbiAgLy8gc2NhbGVkU3RyKDMxNCwyKT1cIjMuMTRcIlxuICAvLyBzY2FsZWRTdHIoMzAsMSk9XCIzXCJcbiAgLy8gVHJ5aW5nIHRvIGF2b2lkIHByZWNpc2lvbiBlcnJvcnMhXG4gIGlmIChkcCA9PT0gMCkgcmV0dXJuIG5cbiAgY29uc3QgZmFjdG9yID0gTWF0aC5wb3coMTAsIGRwKVxuICBjb25zdCBpbnRwYXJ0ID0gTWF0aC5mbG9vcihuIC8gZmFjdG9yKVxuICBjb25zdCBkZWNwYXJ0ID0gbiAlIGZhY3RvclxuICBpZiAoZGVjcGFydCA9PT0gMCkge1xuICAgIHJldHVybiBpbnRwYXJ0XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGludHBhcnQgKyAnLicgKyBkZWNwYXJ0XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdjZCAoYSwgYikge1xuICAvLyB0YWtlbiBmcm9tIGZyYWN0aW9uLmpzXG4gIGlmICghYSkgeyByZXR1cm4gYiB9XG4gIGlmICghYikgeyByZXR1cm4gYSB9XG5cbiAgd2hpbGUgKDEpIHtcbiAgICBhICU9IGJcbiAgICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICAgIGIgJT0gYVxuICAgIGlmICghYikgeyByZXR1cm4gYSB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxjbSAoYSwgYikge1xuICByZXR1cm4gYSAqIGIgLyBnY2QoYSwgYilcbn1cblxuLyogQXJyYXlzIGFuZCBzaW1pbGFyICovXG5cbi8qKlxuICogU29ydHMgdHdvIGFycmF5cyB0b2dldGhlciBiYXNlZCBvbiBzb3J0aW5nIGFycjBcbiAqIEBwYXJhbSB7KltdfSBhcnIwXG4gKiBAcGFyYW0geypbXX0gYXJyMVxuICogQHBhcmFtIHsqfSBmXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzb3J0VG9nZXRoZXIgKGFycjAsIGFycjEsIGYpIHtcbiAgaWYgKGFycjAubGVuZ3RoICE9PSBhcnIxLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JvdGggYXJndW1lbnRzIG11c3QgYmUgYXJyYXlzIG9mIHRoZSBzYW1lIGxlbmd0aCcpXG4gIH1cblxuICBmID0gZiB8fCAoKHgsIHkpID0+IHggLSB5KVxuXG4gIGNvbnN0IG4gPSBhcnIwLmxlbmd0aFxuICBjb25zdCBjb21iaW5lZCA9IFtdXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgY29tYmluZWRbaV0gPSBbYXJyMFtpXSwgYXJyMVtpXV1cbiAgfVxuXG4gIGNvbWJpbmVkLnNvcnQoKHgsIHkpID0+IGYoeFswXSwgeVswXSkpXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICBhcnIwW2ldID0gY29tYmluZWRbaV1bMF1cbiAgICBhcnIxW2ldID0gY29tYmluZWRbaV1bMV1cbiAgfVxuXG4gIHJldHVybiBbYXJyMCwgYXJyMV1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGUgKGFycmF5KSB7XG4gIC8vIEtudXRoLUZpc2hlci1ZYXRlc1xuICAvLyBmcm9tIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yNDUwOTc2LzM3MzcyOTVcbiAgLy8gbmIuIHNodWZmbGVzIGluIHBsYWNlXG4gIHZhciBjdXJyZW50SW5kZXggPSBhcnJheS5sZW5ndGg7IHZhciB0ZW1wb3JhcnlWYWx1ZTsgdmFyIHJhbmRvbUluZGV4XG5cbiAgLy8gV2hpbGUgdGhlcmUgcmVtYWluIGVsZW1lbnRzIHRvIHNodWZmbGUuLi5cbiAgd2hpbGUgKGN1cnJlbnRJbmRleCAhPT0gMCkge1xuICAgIC8vIFBpY2sgYSByZW1haW5pbmcgZWxlbWVudC4uLlxuICAgIHJhbmRvbUluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY3VycmVudEluZGV4KVxuICAgIGN1cnJlbnRJbmRleCAtPSAxXG5cbiAgICAvLyBBbmQgc3dhcCBpdCB3aXRoIHRoZSBjdXJyZW50IGVsZW1lbnQuXG4gICAgdGVtcG9yYXJ5VmFsdWUgPSBhcnJheVtjdXJyZW50SW5kZXhdXG4gICAgYXJyYXlbY3VycmVudEluZGV4XSA9IGFycmF5W3JhbmRvbUluZGV4XVxuICAgIGFycmF5W3JhbmRvbUluZGV4XSA9IHRlbXBvcmFyeVZhbHVlXG4gIH1cblxuICByZXR1cm4gYXJyYXlcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgYSBpcyBhbiBhcnJheSBjb250YWluaW5nIGUsIGZhbHNlIG90aGVyd2lzZSAoaW5jbHVkaW5nIGlmIGEgaXMgbm90IGFuIGFycmF5KVxuICogQHBhcmFtIHsqfSBhICBBbiBhcnJheVxuICogQHBhcmFtIHsqfSBlIEFuIGVsZW1lbnQgdG8gY2hlY2sgaWYgaXMgaW4gdGhlIGFycmF5XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdlYWtJbmNsdWRlcyAoYSwgZSkge1xuICByZXR1cm4gKEFycmF5LmlzQXJyYXkoYSkgJiYgYS5pbmNsdWRlcyhlKSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpcnN0VW5pcXVlSW5kZXggKGFycmF5KSB7XG4gIC8vIHJldHVybnMgaW5kZXggb2YgZmlyc3QgdW5pcXVlIGVsZW1lbnRcbiAgLy8gaWYgbm9uZSwgcmV0dXJucyBsZW5ndGggb2YgYXJyYXlcbiAgbGV0IGkgPSAwXG4gIHdoaWxlIChpIDwgYXJyYXkubGVuZ3RoKSB7XG4gICAgaWYgKGFycmF5LmluZGV4T2YoYXJyYXlbaV0pID09PSBhcnJheS5sYXN0SW5kZXhPZihhcnJheVtpXSkpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIGkrK1xuICB9XG4gIHJldHVybiBpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBib29sT2JqZWN0VG9BcnJheSAob2JqKSB7XG4gIC8vIEdpdmVuIGFuIG9iamVjdCB3aGVyZSBhbGwgdmFsdWVzIGFyZSBib29sZWFuLCByZXR1cm4ga2V5cyB3aGVyZSB0aGUgdmFsdWUgaXMgdHJ1ZVxuICBjb25zdCByZXN1bHQgPSBbXVxuICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHtcbiAgICBpZiAob2JqW2tleV0pIHJlc3VsdC5wdXNoKGtleSlcbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qIE9iamVjdCBwcm9wZXJ0eSBhY2Nlc3MgYnkgc3RyaW5nICovXG5leHBvcnQgZnVuY3Rpb24gcHJvcEJ5U3RyaW5nIChvLCBzLCB4KSB7XG4gIC8qIEUuZy4gYnlTdHJpbmcobXlPYmosXCJmb28uYmFyXCIpIC0+IG15T2JqLmZvby5iYXJcbiAgICAgKiBieVN0cmluZyhteU9iaixcImZvby5iYXJcIixcImJhelwiKSAtPiBteU9iai5mb28uYmFyID0gXCJiYXpcIlxuICAgICAqL1xuICBzID0gcy5yZXBsYWNlKC9cXFsoXFx3KylcXF0vZywgJy4kMScpIC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gIHMgPSBzLnJlcGxhY2UoL15cXC4vLCAnJykgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICB2YXIgYSA9IHMuc3BsaXQoJy4nKVxuICBmb3IgKHZhciBpID0gMCwgbiA9IGEubGVuZ3RoIC0gMTsgaSA8IG47ICsraSkge1xuICAgIHZhciBrID0gYVtpXVxuICAgIGlmIChrIGluIG8pIHtcbiAgICAgIG8gPSBvW2tdXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgfVxuICBpZiAoeCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gb1thW25dXVxuICBlbHNlIG9bYVtuXV0gPSB4XG59XG5cbi8qIExvZ2ljICovXG5leHBvcnQgZnVuY3Rpb24gbUlmIChwLCBxKSB7IC8vIG1hdGVyaWFsIGNvbmRpdGlvbmFsXG4gIHJldHVybiAoIXAgfHwgcSlcbn1cblxuLyogRE9NIG1hbmlwdWxhdGlvbiBhbmQgcXVlcnlpbmcgKi9cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IEhUTUwgZWxlbWVudCwgc2V0cyBjbGFzc2VzIGFuZCBhcHBlbmRzXG4gKiBAcGFyYW0ge3N0cmluZ30gdGFnTmFtZSBUYWcgbmFtZSBvZiBlbGVtZW50XG4gKiBAcGFyYW0ge3N0cmluZ3x1bmRlZmluZWR9IFtjbGFzc05hbWVdIEEgY2xhc3Mgb3IgY2xhc3NlcyB0byBhc3NpZ24gdG8gdGhlIGVsZW1lbnRcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IFtwYXJlbnRdIEEgcGFyZW50IGVsZW1lbnQgdG8gYXBwZW5kIHRoZSBlbGVtZW50IHRvXG4gKiBAcmV0dXJucyB7SFRNTEVsZW1lbnR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbGVtICh0YWdOYW1lLCBjbGFzc05hbWUsIHBhcmVudCkge1xuICAvLyBjcmVhdGUsIHNldCBjbGFzcyBhbmQgYXBwZW5kIGluIG9uZVxuICBjb25zdCBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKVxuICBpZiAoY2xhc3NOYW1lKSBlbGVtLmNsYXNzTmFtZSA9IGNsYXNzTmFtZVxuICBpZiAocGFyZW50KSBwYXJlbnQuYXBwZW5kQ2hpbGQoZWxlbSlcbiAgcmV0dXJuIGVsZW1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc0FuY2VzdG9yQ2xhc3MgKGVsZW0sIGNsYXNzTmFtZSkge1xuICAvLyBjaGVjayBpZiBhbiBlbGVtZW50IGVsZW0gb3IgYW55IG9mIGl0cyBhbmNlc3RvcnMgaGFzIGNsc3NcbiAgbGV0IHJlc3VsdCA9IGZhbHNlXG4gIGZvciAoO2VsZW0gJiYgZWxlbSAhPT0gZG9jdW1lbnQ7IGVsZW0gPSBlbGVtLnBhcmVudE5vZGUpIHsgLy8gdHJhdmVyc2UgRE9NIHVwd2FyZHNcbiAgICBpZiAoZWxlbS5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKSkge1xuICAgICAgcmVzdWx0ID0gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qIENhbnZhcyBkcmF3aW5nICovXG5leHBvcnQgZnVuY3Rpb24gZGFzaGVkTGluZSAoY3R4LCB4MSwgeTEsIHgyLCB5Mikge1xuICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHgyIC0geDEsIHkyIC0geTEpXG4gIGNvbnN0IGRhc2h4ID0gKHkxIC0geTIpIC8gbGVuZ3RoIC8vIHVuaXQgdmVjdG9yIHBlcnBlbmRpY3VsYXIgdG8gbGluZVxuICBjb25zdCBkYXNoeSA9ICh4MiAtIHgxKSAvIGxlbmd0aFxuICBjb25zdCBtaWR4ID0gKHgxICsgeDIpIC8gMlxuICBjb25zdCBtaWR5ID0gKHkxICsgeTIpIC8gMlxuXG4gIC8vIGRyYXcgdGhlIGJhc2UgbGluZVxuICBjdHgubW92ZVRvKHgxLCB5MSlcbiAgY3R4LmxpbmVUbyh4MiwgeTIpXG5cbiAgLy8gZHJhdyB0aGUgZGFzaFxuICBjdHgubW92ZVRvKG1pZHggKyA1ICogZGFzaHgsIG1pZHkgKyA1ICogZGFzaHkpXG4gIGN0eC5saW5lVG8obWlkeCAtIDUgKiBkYXNoeCwgbWlkeSAtIDUgKiBkYXNoeSlcblxuICBjdHgubW92ZVRvKHgyLCB5Milcbn1cbiIsImltcG9ydCB7IGNyZWF0ZUVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE9wdGlvbnNTZXQge1xuICBjb25zdHJ1Y3RvciAob3B0aW9uU3BlYywgdGVtcGxhdGUpIHtcbiAgICB0aGlzLm9wdGlvblNwZWMgPSBvcHRpb25TcGVjXG5cbiAgICB0aGlzLm9wdGlvbnMgPSB7fVxuICAgIHRoaXMub3B0aW9uU3BlYy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICBpZiAob3B0aW9uLnR5cGUgIT09ICdoZWFkaW5nJyAmJiBvcHRpb24udHlwZSAhPT0gJ2NvbHVtbi1icmVhaycpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBvcHRpb24uZGVmYXVsdFxuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGUgLy8gaHRtbCB0ZW1wbGF0ZSAob3B0aW9uYWwpXG5cbiAgICAvLyBzZXQgYW4gaWQgYmFzZWQgb24gYSBjb3VudGVyIC0gdXNlZCBmb3IgbmFtZXMgb2YgZm9ybSBlbGVtZW50c1xuICAgIHRoaXMuZ2xvYmFsSWQgPSBPcHRpb25zU2V0LmdldElkKClcbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhbiBvcHRpb24sIGZpbmQgaXRzIFVJIGVsZW1lbnQgYW5kIHVwZGF0ZSB0aGUgc3RhdGUgZnJvbSB0aGF0XG4gICAqIEBwYXJhbSB7Kn0gb3B0aW9uIEFuIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25TcGVjIG9yIGFuIGlkXG4gICAqL1xuICB1cGRhdGVTdGF0ZUZyb21VSSAob3B0aW9uKSB7XG4gICAgLy8gaW5wdXQgLSBlaXRoZXIgYW4gZWxlbWVudCBvZiB0aGlzLm9wdGlvbnNTcGVjIG9yIGFuIG9wdGlvbiBpZFxuICAgIGlmICh0eXBlb2YgKG9wdGlvbikgPT09ICdzdHJpbmcnKSB7XG4gICAgICBvcHRpb24gPSB0aGlzLm9wdGlvbnNTcGVjLmZpbmQoeCA9PiB4LmlkID09PSBvcHRpb24pXG4gICAgICBpZiAoIW9wdGlvbikgdGhyb3cgbmV3IEVycm9yKGBubyBvcHRpb24gd2l0aCBpZCAnJHtvcHRpb259J2ApXG4gICAgfVxuICAgIGlmICghb3B0aW9uLmVsZW1lbnQpIHRocm93IG5ldyBFcnJvcihgb3B0aW9uICR7b3B0aW9uLmlkfSBkb2Vzbid0IGhhdmUgYSBVSSBlbGVtZW50YClcblxuICAgIHN3aXRjaCAob3B0aW9uLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2ludCc6IHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSBvcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKVswXVxuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IE51bWJlcihpbnB1dC52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2Jvb2wnOiB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gb3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JylbMF1cbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBpbnB1dC5jaGVja2VkXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdzZWxlY3QtZXhjbHVzaXZlJzoge1xuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IG9wdGlvbi5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0OmNoZWNrZWQnKS52YWx1ZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAnc2VsZWN0LWluY2x1c2l2ZSc6IHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPVxuICAgICAgICAgIEFycmF5LmZyb20ob3B0aW9uLmVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnaW5wdXQ6Y2hlY2tlZCcpLCB4ID0+IHgudmFsdWUpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYG9wdGlvbiB3aXRoIGlkICR7b3B0aW9uLmlkfSBoYXMgdW5yZWNvZ25pc2VkIG9wdGlvbiB0eXBlICR7b3B0aW9uLnR5cGV9YClcbiAgICB9XG4gICAgLy8gY29uc29sZS5sb2codGhpcy5vcHRpb25zKVxuICB9XG5cbiAgdXBkYXRlU3RhdGVGcm9tVUlBbGwgKCkge1xuICAgIHRoaXMub3B0aW9uU3BlYy5mb3JFYWNoKG9wdGlvbiA9PiB0aGlzLnVwZGF0ZVN0YXRlRnJvbVVJKG9wdGlvbikpXG4gIH1cblxuICBkaXNhYmxlT3JFbmFibGVBbGwgKCkge1xuICAgIHRoaXMub3B0aW9uU3BlYy5mb3JFYWNoKG9wdGlvbiA9PiB0aGlzLmRpc2FibGVPckVuYWJsZShvcHRpb24pKVxuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIGFuIG9wdGlvbiwgZmluZCBpdHMgVUkgZWxlbWVudCBhbmQgdXBkYXRlIGl0IGFjY29yZGluZyB0byB0aGUgb3B0aW9ucyBJRFxuICAgKiBAcGFyYW0geyp9IG9wdGlvbiBBbiBlbGVtZW50IG9mIHRoaXMub3B0aW9uc1NwZWMgb3IgYW4gb3B0aW9uIGlkXG4gICAqL1xuICB1cGRhdGVVSUZyb21TdGF0ZSAob3B0aW9uKSB7XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYW4gb3B0aW9uLCBlbmFibGUgb3IgZGlzYWJsZSB0aGUgVUkgZWxlbWVudCBkZXBlbmRpbmcgb24gdGhlIHZhbHVlIG9mIG9wdGlvbi5kaXNhYmxlSWYgYW5kIHRoZVxuICAgKiBzdGF0ZSBvZiB0aGUgY29ycmVzcG9uZGluZyBib29sZWFuIG9wdGlvblxuICAgKiBAcGFyYW0geyp9IG9wdGlvbiBBbiBlbGVtZW50IG9mIHRoaXMub3B0aW9uc1NwZWMgb3IgYW4gb3B0aW9uIGlkXG4gICAqL1xuICBkaXNhYmxlT3JFbmFibGUgKG9wdGlvbikge1xuICAgIGlmICh0eXBlb2YgKG9wdGlvbikgPT09ICdzdHJpbmcnKSB7XG4gICAgICBvcHRpb24gPSB0aGlzLm9wdGlvbnNTcGVjLmZpbmQoeCA9PiB4LmlkID09PSBvcHRpb24pXG4gICAgICBpZiAoIW9wdGlvbikgdGhyb3cgbmV3IEVycm9yKGBubyBvcHRpb24gd2l0aCBpZCAnJHtvcHRpb259J2ApXG4gICAgfVxuXG4gICAgaWYgKCFvcHRpb24uZGlzYWJsZWRJZikgcmV0dXJuXG5cbiAgICAvLyBJbnZlcnNlIGV2ZXJ5dGhpbmcgaWYgYmVnaW5pbmcgd2l0aCAhXG4gICAgbGV0IGRpc2FibGVySWQgPSBvcHRpb24uZGlzYWJsZWRJZlxuICAgIGxldCBlbmFibGUgPSBmYWxzZSAvLyBkaXNhYmxlIGlmZiBkaXNhYmxlciBpcyB0cnVlXG4gICAgaWYgKGRpc2FibGVySWQuc3RhcnRzV2l0aCgnIScpKSB7XG4gICAgICBlbmFibGUgPSB0cnVlIC8vIGVuZGFibGUgaWZmIGRpc2FibGVyIGlzIHRydWVcbiAgICAgIGRpc2FibGVySWQgPSBkaXNhYmxlcklkLnNsaWNlKDEpXG4gICAgfVxuXG4gICAgLy8gRW5kYWJsZSBvciBkaXNhYmxlXG4gICAgaWYgKHRoaXMub3B0aW9uc1tkaXNhYmxlcklkXSA9PT0gZW5hYmxlKSB7IC8vIGVuYWJsZVxuICAgICAgb3B0aW9uLmVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSgnZGlzYWJsZWQnKVxuICAgICAgO1suLi5vcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKV0uZm9yRWFjaChlID0+IHsgZS5kaXNhYmxlZCA9IGZhbHNlIH0pXG4gICAgfSBlbHNlIHsgLy8gZGlzYWJsZVxuICAgICAgb3B0aW9uLmVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnZGlzYWJsZWQnKVxuICAgICAgO1suLi5vcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKV0uZm9yRWFjaChlID0+IHsgZS5kaXNhYmxlZCA9IHRydWUgfSlcbiAgICB9XG4gIH1cblxuICByZW5kZXJJbiAoZWxlbWVudCkge1xuICAgIGNvbnN0IGxpc3QgPSBjcmVhdGVFbGVtKCd1bCcsICdvcHRpb25zLWxpc3QnKVxuICAgIGxldCBjb2x1bW4gPSBjcmVhdGVFbGVtKCdkaXYnLCAnb3B0aW9ucy1jb2x1bW4nLCBsaXN0KVxuXG4gICAgdGhpcy5vcHRpb25TcGVjLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgIGlmIChvcHRpb24udHlwZSA9PT0gJ2NvbHVtbi1icmVhaycpIHsgLy8gc3RhcnQgbmV3IGNvbHVtblxuICAgICAgICBjb2x1bW4gPSBjcmVhdGVFbGVtKCdkaXYnLCAnb3B0aW9ucy1jb2x1bW4nLCBsaXN0KVxuICAgICAgfSBlbHNlIHsgLy8gbWFrZSBsaXN0IGl0ZW1cbiAgICAgICAgY29uc3QgbGkgPSBjcmVhdGVFbGVtKCdsaScsIHVuZGVmaW5lZCwgY29sdW1uKVxuICAgICAgICBsaS5kYXRhc2V0Lm9wdGlvbklkID0gb3B0aW9uLmlkXG5cbiAgICAgICAgc3dpdGNoIChvcHRpb24udHlwZSkge1xuICAgICAgICAgIGNhc2UgJ2hlYWRpbmcnOlxuICAgICAgICAgICAgcmVuZGVySGVhZGluZyhvcHRpb24udGl0bGUsIGxpKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdpbnQnOlxuICAgICAgICAgIGNhc2UgJ2Jvb2wnOlxuICAgICAgICAgICAgcmVuZGVyU2luZ2xlT3B0aW9uKG9wdGlvbiwgbGkpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3NlbGVjdC1pbmNsdXNpdmUnOlxuICAgICAgICAgIGNhc2UgJ3NlbGVjdC1leGNsdXNpdmUnOlxuICAgICAgICAgICAgdGhpcy5yZW5kZXJMaXN0T3B0aW9uKG9wdGlvbiwgbGkpXG4gICAgICAgIH1cbiAgICAgICAgbGkuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZSA9PiB7IHRoaXMudXBkYXRlU3RhdGVGcm9tVUkob3B0aW9uKTsgdGhpcy5kaXNhYmxlT3JFbmFibGVBbGwoKSB9KVxuICAgICAgICBvcHRpb24uZWxlbWVudCA9IGxpXG5cbiAgICAgICAgaWYgKG9wdGlvbi5zdHlsZSA9PT0gJ2VtcGgnKSB7IGxpLmNsYXNzTGlzdC5hZGQoJ2VtcGhhc2lzZScpIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIGVsZW1lbnQuYXBwZW5kKGxpc3QpXG5cbiAgICB0aGlzLmRpc2FibGVPckVuYWJsZUFsbCgpXG4gIH1cblxuICByZW5kZXJMaXN0T3B0aW9uIChvcHRpb24sIGxpKSB7XG4gICAgbGkuYXBwZW5kKG9wdGlvbi50aXRsZSArICc6ICcpXG5cbiAgICBjb25zdCBzdWJsaXN0ID0gY3JlYXRlRWxlbSgndWwnLCAnb3B0aW9ucy1zdWJsaXN0JywgbGkpXG4gICAgaWYgKG9wdGlvbi52ZXJ0aWNhbCkgc3VibGlzdC5jbGFzc0xpc3QuYWRkKCdvcHRpb25zLXN1Ymxpc3QtdmVydGljYWwnKVxuXG4gICAgb3B0aW9uLnNlbGVjdE9wdGlvbnMuZm9yRWFjaChzZWxlY3RPcHRpb24gPT4ge1xuICAgICAgY29uc3Qgc3VibGlzdExpID0gY3JlYXRlRWxlbSgnbGknLCBudWxsLCBzdWJsaXN0KVxuICAgICAgY29uc3QgbGFiZWwgPSBjcmVhdGVFbGVtKCdsYWJlbCcsIG51bGwsIHN1Ymxpc3RMaSlcblxuICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpXG4gICAgICBpbnB1dC50eXBlID0gb3B0aW9uLnR5cGUgPT09ICdzZWxlY3QtZXhjbHVzaXZlJyA/ICdyYWRpbycgOiAnY2hlY2tib3gnXG4gICAgICBpbnB1dC5uYW1lID0gdGhpcy5nbG9iYWxJZCArICctJyArIG9wdGlvbi5pZFxuICAgICAgaW5wdXQudmFsdWUgPSBzZWxlY3RPcHRpb24uaWRcblxuICAgICAgaWYgKG9wdGlvbi50eXBlID09PSAnc2VsZWN0LWluY2x1c2l2ZScpIHsgLy8gZGVmYXVsdHMgd29yayBkaWZmZXJlbnQgZm9yIGluY2x1c2l2ZS9leGNsdXNpdmVcbiAgICAgICAgaW5wdXQuY2hlY2tlZCA9IG9wdGlvbi5kZWZhdWx0LmluY2x1ZGVzKHNlbGVjdE9wdGlvbi5pZClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlucHV0LmNoZWNrZWQgPSBvcHRpb24uZGVmYXVsdCA9PT0gc2VsZWN0T3B0aW9uLmlkXG4gICAgICB9XG5cbiAgICAgIGxhYmVsLmFwcGVuZChpbnB1dClcblxuICAgICAgaW5wdXQuY2xhc3NMaXN0LmFkZCgnb3B0aW9uJylcblxuICAgICAgbGFiZWwuYXBwZW5kKHNlbGVjdE9wdGlvbi50aXRsZSlcbiAgICB9KVxuICB9XG59XG5cbi8qKlxuICogUmVuZGVycyBhIGhlYWRpbmcgb3B0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gdGl0bGUgVGhlIHRpdGxlIG9mIHRoZSBoZWFkaW5nXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBsaSBUaGUgZWxlbWVudCB0byByZW5kZXIgaW50b1xuICovXG5mdW5jdGlvbiByZW5kZXJIZWFkaW5nICh0aXRsZSwgbGkpIHtcbiAgbGkuYXBwZW5kKHRpdGxlKVxuICBsaS5jbGFzc0xpc3QuYWRkKCdvcHRpb25zLWhlYWRpbmcnKVxufVxuXG4vKipcbiAqIFJlbmRlcnMgc2luZ2xlIHBhcmFtZXRlclxuICogQHBhcmFtIHsqfSBvcHRpb25cbiAqIEBwYXJhbSB7Kn0gbGlcbiAqL1xuZnVuY3Rpb24gcmVuZGVyU2luZ2xlT3B0aW9uIChvcHRpb24sIGxpKSB7XG4gIGNvbnN0IGxhYmVsID0gY3JlYXRlRWxlbSgnbGFiZWwnLCB1bmRlZmluZWQsIGxpKVxuXG4gIGlmICghb3B0aW9uLnN3YXBMYWJlbCAmJiBvcHRpb24udGl0bGUgIT09ICcnKSBsYWJlbC5hcHBlbmQob3B0aW9uLnRpdGxlICsgJzogJylcblxuICBjb25zdCBpbnB1dCA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgJ29wdGlvbicsIGxhYmVsKVxuICBzd2l0Y2ggKG9wdGlvbi50eXBlKSB7XG4gICAgY2FzZSAnaW50JzpcbiAgICAgIGlucHV0LnR5cGUgPSAnbnVtYmVyJ1xuICAgICAgaW5wdXQubWluID0gb3B0aW9uLm1pblxuICAgICAgaW5wdXQubWF4ID0gb3B0aW9uLm1heFxuICAgICAgaW5wdXQudmFsdWUgPSBvcHRpb24uZGVmYXVsdFxuICAgICAgYnJlYWtcbiAgICBjYXNlICdib29sJzpcbiAgICAgIGlucHV0LnR5cGUgPSAnY2hlY2tib3gnXG4gICAgICBpbnB1dC5jaGVja2VkID0gb3B0aW9uLmRlZmF1bHRcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgdW5rbm93biBvcHRpb24gdHlwZSAke29wdGlvbi50eXBlfWApXG4gIH1cblxuICBpZiAob3B0aW9uLnN3YXBMYWJlbCAmJiBvcHRpb24udGl0bGUgIT09ICcnKSBsYWJlbC5hcHBlbmQoJyAnICsgb3B0aW9uLnRpdGxlKVxufVxuXG5PcHRpb25zU2V0LmlkQ291bnRlciA9IDAgLy8gaW5jcmVtZW50IGVhY2ggdGltZSB0byBjcmVhdGUgdW5pcXVlIGlkcyB0byB1c2UgaW4gaWRzL25hbWVzIG9mIGVsZW1lbnRzXG5cbk9wdGlvbnNTZXQuZ2V0SWQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmIChPcHRpb25zU2V0LmlkQ291bnRlciA+PSAyNiAqKiAyKSB0aHJvdyBuZXcgRXJyb3IoJ1RvbyBtYW55IG9wdGlvbnMgb2JqZWN0cyEnKVxuICBjb25zdCBpZCA9IFN0cmluZy5mcm9tQ2hhckNvZGUofn4oT3B0aW9uc1NldC5pZENvdW50ZXIgLyAyNikgKyA5NykgK1xuICAgIFN0cmluZy5mcm9tQ2hhckNvZGUoT3B0aW9uc1NldC5pZENvdW50ZXIgJSAyNiArIDk3KVxuXG4gIE9wdGlvbnNTZXQuaWRDb3VudGVyICs9IDFcblxuICByZXR1cm4gaWRcbn1cblxuT3B0aW9uc1NldC5kZW1vU3BlYyA9IFtcbiAge1xuICAgIHRpdGxlOiAnRGlmZmljdWx0eScsXG4gICAgaWQ6ICdkaWZmaWN1bHR5JyxcbiAgICB0eXBlOiAnaW50JyxcbiAgICBtaW46IDEsXG4gICAgbWF4OiAxMCxcbiAgICBkZWZhdWx0OiA1XG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1R5cGUnLFxuICAgIGlkOiAndHlwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1leGNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdSZWN0YW5nbGUnLCBpZDogJ3JlY3RhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdUcmlhbmdsZScsIGlkOiAndHJpYW5nbGUnIH0sXG4gICAgICB7IHRpdGxlOiAnU3F1b3ZhbCcsIGlkOiAnc3F1b3ZhbCcgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogJ3JlY3RhbmdsZSdcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnQSBoZWFkaW5nJyxcbiAgICB0eXBlOiAnaGVhZGluZydcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnU2hhcGUnLFxuICAgIGlkOiAnc2hhcGUnLFxuICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICB7IHRpdGxlOiAnUmVjdGFuZ2xlIHNoYXBlIHRoaW5nJywgaWQ6ICdyZWN0YW5nbGUnIH0sXG4gICAgICB7IHRpdGxlOiAnVHJpYW5nbGUgc2hhcGUgdGhpbmcnLCBpZDogJ3RyaWFuZ2xlJyB9LFxuICAgICAgeyB0aXRsZTogJ1NxdW92YWwgc2hhcGUgbG9uZycsIGlkOiAnc3F1b3ZhbCcgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogWydyZWN0YW5nbGUnLCAnc3F1b3ZhbCddLFxuICAgIHZlcnRpY2FsOiB0cnVlIC8vIGxheW91dCB2ZXJ0aWNhbGx5LCByYXRoZXIgdGhhbiBob3Jpem9udGFsbHlcbiAgfSxcbiAge1xuICAgIHR5cGU6ICdjb2x1bW4tYnJlYWsnXG4gIH0sXG4gIHtcbiAgICB0eXBlOiAnaGVhZGluZycsXG4gICAgdGl0bGU6ICdBIG5ldyBjb2x1bW4nXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ0RvIHNvbWV0aGluZycsXG4gICAgaWQ6ICdzb21ldGhpbmcnLFxuICAgIHR5cGU6ICdib29sJyxcbiAgICBkZWZhdWx0OiB0cnVlLFxuICAgIHN3YXBMYWJlbDogdHJ1ZSAvLyBwdXQgY29udHJvbCBiZWZvcmUgbGFiZWxcbiAgfVxuXVxuIiwiZXhwb3J0IGRlZmF1bHQgYWJzdHJhY3QgY2xhc3MgUXVlc3Rpb24ge1xuICBET006IEhUTUxFbGVtZW50XG4gIGFuc3dlcmVkOiBib29sZWFuXG5cbiAgY29uc3RydWN0b3IgKCkge1xuICAgIHRoaXMuRE9NID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICB0aGlzLkRPTS5jbGFzc05hbWUgPSAncXVlc3Rpb24tZGl2J1xuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICB9XG5cbiAgZ2V0RE9NICgpIDogSFRNTEVsZW1lbnQge1xuICAgIHJldHVybiB0aGlzLkRPTVxuICB9XG5cbiAgYWJzdHJhY3QgcmVuZGVyICgpIDogdm9pZFxuXG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmFuc3dlcmVkID0gdHJ1ZVxuICB9XG5cbiAgaGlkZUFuc3dlciAoKSA6IHZvaWQge1xuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICB9XG5cbiAgdG9nZ2xlQW5zd2VyICgpIDogdm9pZCB7XG4gICAgaWYgKHRoaXMuYW5zd2VyZWQpIHtcbiAgICAgIHRoaXMuaGlkZUFuc3dlcigpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2hvd0Fuc3dlcigpXG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSA6IHN0cmluZyB7IC8vIFNob3VsZCBiZSBvdmVycmlkZGVuXG4gICAgcmV0dXJuICcnXG4gIH1cbn1cbiIsIi8qIGdsb2JhbCBrYXRleCAqL1xuaW1wb3J0IFF1ZXN0aW9uIGZyb20gJ1F1ZXN0aW9uL1F1ZXN0aW9uJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUZXh0USBleHRlbmRzIFF1ZXN0aW9uIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcigpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDUsXG4gICAgICBsYWJlbDogJ2EnXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICAvLyBzdG9yZSB0aGUgbGFiZWwgZm9yIGZ1dHVyZSByZW5kZXJpbmdcbiAgICB0aGlzLmxhYmVsID0gc2V0dGluZ3MubGFiZWxcblxuICAgIC8vIER1bW15IHF1ZXN0aW9uIGdlbmVyYXRpbmcgLSBzdWJjbGFzc2VzIGRvIHNvbWV0aGluZyBzdWJzdGFudGlhbCBoZXJlXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gJzIrMidcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJz01J1xuXG4gICAgLy8gTWFrZSB0aGUgRE9NIHRyZWUgZm9yIHRoZSBlbGVtZW50XG4gICAgdGhpcy5xdWVzdGlvbnAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJylcbiAgICB0aGlzLmFuc3dlcnAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJylcblxuICAgIHRoaXMucXVlc3Rpb25wLmNsYXNzTmFtZSA9ICdxdWVzdGlvbidcbiAgICB0aGlzLmFuc3dlcnAuY2xhc3NOYW1lID0gJ2Fuc3dlcidcbiAgICB0aGlzLmFuc3dlcnAuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcblxuICAgIHRoaXMuRE9NLmFwcGVuZENoaWxkKHRoaXMucXVlc3Rpb25wKVxuICAgIHRoaXMuRE9NLmFwcGVuZENoaWxkKHRoaXMuYW5zd2VycClcblxuICAgIC8vIHN1YmNsYXNzZXMgc2hvdWxkIGdlbmVyYXRlIHF1ZXN0aW9uTGFUZVggYW5kIGFuc3dlckxhVGVYLFxuICAgIC8vIC5yZW5kZXIoKSB3aWxsIGJlIGNhbGxlZCBieSB1c2VyXG4gIH1cblxuICByZW5kZXIgKCkge1xuICAgIC8vIHVwZGF0ZSB0aGUgRE9NIGl0ZW0gd2l0aCBxdWVzdGlvbkxhVGVYIGFuZCBhbnN3ZXJMYVRlWFxuICAgIHZhciBxbnVtID0gdGhpcy5sYWJlbFxuICAgICAgPyAnXFxcXHRleHR7JyArIHRoaXMubGFiZWwgKyAnKSB9J1xuICAgICAgOiAnJ1xuICAgIGthdGV4LnJlbmRlcihxbnVtICsgdGhpcy5xdWVzdGlvbkxhVGVYLCB0aGlzLnF1ZXN0aW9ucCwgeyBkaXNwbGF5TW9kZTogdHJ1ZSwgc3RyaWN0OiAnaWdub3JlJyB9KVxuICAgIGthdGV4LnJlbmRlcih0aGlzLmFuc3dlckxhVGVYLCB0aGlzLmFuc3dlcnAsIHsgZGlzcGxheU1vZGU6IHRydWUgfSlcbiAgfVxuXG4gIGdldERPTSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuRE9NXG4gIH1cblxuICBzaG93QW5zd2VyICgpIHtcbiAgICB0aGlzLmFuc3dlcnAuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJylcbiAgICB0aGlzLmFuc3dlcmVkID0gdHJ1ZVxuICB9XG5cbiAgaGlkZUFuc3dlciAoKSB7XG4gICAgdGhpcy5hbnN3ZXJwLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gIH1cbn1cbiIsImltcG9ydCB7IHJhbmRCZXR3ZWVuLCBnY2QgfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5cbi8qIE1haW4gcXVlc3Rpb24gY2xhc3MuIFRoaXMgd2lsbCBiZSBzcHVuIG9mZiBpbnRvIGRpZmZlcmVudCBmaWxlIGFuZCBnZW5lcmFsaXNlZCAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQWxnZWJyYWljRnJhY3Rpb25RIGV4dGVuZHMgVGV4dFEge1xuICAvLyAnZXh0ZW5kcycgUXVlc3Rpb24sIGJ1dCBub3RoaW5nIHRvIGFjdHVhbGx5IGV4dGVuZFxuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDJcbiAgICB9XG5cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuICAgIGNvbnN0IGRpZmZpY3VsdHkgPSBzZXR0aW5ncy5kaWZmaWN1bHR5XG5cbiAgICAvLyBsb2dpYyBmb3IgZ2VuZXJhdGluZyB0aGUgcXVlc3Rpb24gYW5kIGFuc3dlciBzdGFydHMgaGVyZVxuICAgIHZhciBhLCBiLCBjLCBkLCBlLCBmIC8vIChheCtiKShleCtmKS8oY3grZCkoZXgrZikgPSAocHheMitxeCtyKS8odHheMit1eCt2KVxuICAgIHZhciBwLCBxLCByLCB0LCB1LCB2XG4gICAgdmFyIG1pbkNvZWZmLCBtYXhDb2VmZiwgbWluQ29uc3QsIG1heENvbnN0XG5cbiAgICBzd2l0Y2ggKGRpZmZpY3VsdHkpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgbWluQ29lZmYgPSAxOyBtYXhDb2VmZiA9IDE7IG1pbkNvbnN0ID0gMTsgbWF4Q29uc3QgPSA2XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDI6XG4gICAgICAgIG1pbkNvZWZmID0gMTsgbWF4Q29lZmYgPSAxOyBtaW5Db25zdCA9IC02OyBtYXhDb25zdCA9IDZcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgbWluQ29lZmYgPSAxOyBtYXhDb2VmZiA9IDM7IG1pbkNvbnN0ID0gLTU7IG1heENvbnN0ID0gNVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA0OlxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbWluQ29lZmYgPSAtMzsgbWF4Q29lZmYgPSAzOyBtaW5Db25zdCA9IC01OyBtYXhDb25zdCA9IDVcbiAgICAgICAgYnJlYWtcbiAgICB9XG5cbiAgICAvLyBQaWNrIHNvbWUgY29lZmZpY2llbnRzXG4gICAgd2hpbGUgKFxuICAgICAgKCghYSAmJiAhYikgfHwgKCFjICYmICFkKSB8fCAoIWUgJiYgIWYpKSB8fCAvLyByZXRyeSBpZiBhbnkgZXhwcmVzc2lvbiBpcyAwXG4gICAgICBjYW5TaW1wbGlmeShhLCBiLCBjLCBkKSAvLyByZXRyeSBpZiB0aGVyZSdzIGEgY29tbW9uIG51bWVyaWNhbCBmYWN0b3JcbiAgICApIHtcbiAgICAgIGEgPSByYW5kQmV0d2VlbihtaW5Db2VmZiwgbWF4Q29lZmYpXG4gICAgICBjID0gcmFuZEJldHdlZW4obWluQ29lZmYsIG1heENvZWZmKVxuICAgICAgZSA9IHJhbmRCZXR3ZWVuKG1pbkNvZWZmLCBtYXhDb2VmZilcbiAgICAgIGIgPSByYW5kQmV0d2VlbihtaW5Db25zdCwgbWF4Q29uc3QpXG4gICAgICBkID0gcmFuZEJldHdlZW4obWluQ29uc3QsIG1heENvbnN0KVxuICAgICAgZiA9IHJhbmRCZXR3ZWVuKG1pbkNvbnN0LCBtYXhDb25zdClcbiAgICB9XG5cbiAgICAvLyBpZiB0aGUgZGVub21pbmF0b3IgaXMgbmVnYXRpdmUgZm9yIGVhY2ggdGVybSwgdGhlbiBtYWtlIHRoZSBudW1lcmF0b3IgbmVnYXRpdmUgaW5zdGVhZFxuICAgIGlmIChjIDw9IDAgJiYgZCA8PSAwKSB7XG4gICAgICBjID0gLWNcbiAgICAgIGQgPSAtZFxuICAgICAgYSA9IC1hXG4gICAgICBiID0gLWJcbiAgICB9XG5cbiAgICBwID0gYSAqIGU7IHEgPSBhICogZiArIGIgKiBlOyByID0gYiAqIGZcbiAgICB0ID0gYyAqIGU7IHUgPSBjICogZiArIGQgKiBlOyB2ID0gZCAqIGZcblxuICAgIC8vIE5vdyBwdXQgdGhlIHF1ZXN0aW9uIGFuZCBhbnN3ZXIgaW4gYSBuaWNlIGZvcm1hdCBpbnRvIHF1ZXN0aW9uTGFUZVggYW5kIGFuc3dlckxhVGVYXG4gICAgY29uc3QgcXVlc3Rpb24gPSBgXFxcXGZyYWN7JHtxdWFkcmF0aWNTdHJpbmcocCwgcSwgcil9fXske3F1YWRyYXRpY1N0cmluZyh0LCB1LCB2KX19YFxuICAgIGlmIChzZXR0aW5ncy51c2VDb21tYW5kV29yZCkge1xuICAgICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gJ1xcXFx0ZXh0e1NpbXBsaWZ5fSAnICsgcXVlc3Rpb25cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gcXVlc3Rpb25cbiAgICB9XG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9XG4gICAgICAoYyA9PT0gMCAmJiBkID09PSAxKSA/IHF1YWRyYXRpY1N0cmluZygwLCBhLCBiKVxuICAgICAgICA6IGBcXFxcZnJhY3ske3F1YWRyYXRpY1N0cmluZygwLCBhLCBiKX19eyR7cXVhZHJhdGljU3RyaW5nKDAsIGMsIGQpfX1gXG5cbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJz0gJyArIHRoaXMuYW5zd2VyTGFUZVhcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnU2ltcGxpZnknXG4gIH1cbn1cblxuLyogVXRpbGl0eSBmdW5jdGlvbnNcbiAqIEF0IHNvbWUgcG9pbnQsIEknbGwgbW92ZSBzb21lIG9mIHRoZXNlIGludG8gYSBnZW5lcmFsIHV0aWxpdGllcyBtb2R1bGVcbiAqIGJ1dCB0aGlzIHdpbGwgZG8gZm9yIG5vd1xuICovXG5cbi8vIFRPRE8gSSBoYXZlIHF1YWRyYXRpY1N0cmluZyBoZXJlIGFuZCBhbHNvIGEgUG9seW5vbWlhbCBjbGFzcy4gV2hhdCBpcyBiZWluZyByZXBsaWNhdGVkP8KnXG5mdW5jdGlvbiBxdWFkcmF0aWNTdHJpbmcgKGEsIGIsIGMpIHtcbiAgaWYgKGEgPT09IDAgJiYgYiA9PT0gMCAmJiBjID09PSAwKSByZXR1cm4gJzAnXG5cbiAgdmFyIHgyc3RyaW5nID1cbiAgICBhID09PSAwID8gJydcbiAgICAgIDogYSA9PT0gMSA/ICd4XjInXG4gICAgICAgIDogYSA9PT0gLTEgPyAnLXheMidcbiAgICAgICAgICA6IGEgKyAneF4yJ1xuXG4gIHZhciB4c2lnbiA9XG4gICAgYiA8IDAgPyAnLSdcbiAgICAgIDogKGEgPT09IDAgfHwgYiA9PT0gMCkgPyAnJ1xuICAgICAgICA6ICcrJ1xuXG4gIHZhciB4c3RyaW5nID1cbiAgICBiID09PSAwID8gJydcbiAgICAgIDogKGIgPT09IDEgfHwgYiA9PT0gLTEpID8gJ3gnXG4gICAgICAgIDogTWF0aC5hYnMoYikgKyAneCdcblxuICB2YXIgY29uc3RzaWduID1cbiAgICBjIDwgMCA/ICctJ1xuICAgICAgOiAoKGEgPT09IDAgJiYgYiA9PT0gMCkgfHwgYyA9PT0gMCkgPyAnJ1xuICAgICAgICA6ICcrJ1xuXG4gIHZhciBjb25zdHN0cmluZyA9XG4gICAgYyA9PT0gMCA/ICcnIDogTWF0aC5hYnMoYylcblxuICByZXR1cm4geDJzdHJpbmcgKyB4c2lnbiArIHhzdHJpbmcgKyBjb25zdHNpZ24gKyBjb25zdHN0cmluZ1xufVxuXG5mdW5jdGlvbiBjYW5TaW1wbGlmeSAoYTEsIGIxLCBhMiwgYjIpIHtcbiAgLy8gY2FuIChhMXgrYjEpLyhhMngrYjIpIGJlIHNpbXBsaWZpZWQ/XG4gIC8vXG4gIC8vIEZpcnN0LCB0YWtlIG91dCBnY2QsIGFuZCB3cml0ZSBhcyBjMShhMXgrYjEpIGV0Y1xuXG4gIHZhciBjMSA9IGdjZChhMSwgYjEpXG4gIGExID0gYTEgLyBjMVxuICBiMSA9IGIxIC8gYzFcblxuICB2YXIgYzIgPSBnY2QoYTIsIGIyKVxuICBhMiA9IGEyIC8gYzJcbiAgYjIgPSBiMiAvIGMyXG5cbiAgdmFyIHJlc3VsdCA9IGZhbHNlXG5cbiAgaWYgKGdjZChjMSwgYzIpID4gMSB8fCAoYTEgPT09IGEyICYmIGIxID09PSBiMikpIHtcbiAgICByZXN1bHQgPSB0cnVlXG4gIH1cblxuICByZXR1cm4gcmVzdWx0XG59XG4iLCJpbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5pbXBvcnQgeyByYW5kQmV0d2VlbiB9IGZyb20gJ1V0aWxpdGllcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSW50ZWdlckFkZFEgZXh0ZW5kcyBUZXh0USB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYSdcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIHRoaXMubGFiZWwgPSBzZXR0aW5ncy5sYWJlbFxuXG4gICAgLy8gVGhpcyBpcyBqdXN0IGEgZGVtbyBxdWVzdGlvbiB0eXBlIGZvciBub3csIHNvIG5vdCBwcm9jZXNzaW5nIGRpZmZpY3VsdHlcbiAgICBjb25zdCBhID0gcmFuZEJldHdlZW4oMTAsIDEwMDApXG4gICAgY29uc3QgYiA9IHJhbmRCZXR3ZWVuKDEwLCAxMDAwKVxuICAgIGNvbnN0IHN1bSA9IGEgKyBiXG5cbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSBhICsgJyArICcgKyBiXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICc9ICcgKyBzdW1cblxuICAgIHRoaXMucmVuZGVyKClcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRXZhbHVhdGUnXG4gIH1cbn1cbiIsIi8qKlxuICogQ2xhc3MgcmVwcmVzZW50aW5nIGEgcG9pbnQsIGFuZCBzdGF0aWMgdXRpdGxpdHkgbWV0aG9kc1xuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQb2ludCB7XG4gIGNvbnN0cnVjdG9yICh4LCB5KSB7XG4gICAgdGhpcy54ID0geFxuICAgIHRoaXMueSA9IHlcbiAgfVxuXG4gIHJvdGF0ZSAoYW5nbGUpIHtcbiAgICB2YXIgbmV3eCwgbmV3eVxuICAgIG5ld3ggPSBNYXRoLmNvcyhhbmdsZSkgKiB0aGlzLnggLSBNYXRoLnNpbihhbmdsZSkgKiB0aGlzLnlcbiAgICBuZXd5ID0gTWF0aC5zaW4oYW5nbGUpICogdGhpcy54ICsgTWF0aC5jb3MoYW5nbGUpICogdGhpcy55XG4gICAgdGhpcy54ID0gbmV3eFxuICAgIHRoaXMueSA9IG5ld3lcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc2NhbGUgKHNmKSB7XG4gICAgdGhpcy54ID0gdGhpcy54ICogc2ZcbiAgICB0aGlzLnkgPSB0aGlzLnkgKiBzZlxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICB0cmFuc2xhdGUgKHgsIHkpIHtcbiAgICB0aGlzLnggKz0geFxuICAgIHRoaXMueSArPSB5XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIGNsb25lICgpIHtcbiAgICByZXR1cm4gbmV3IFBvaW50KHRoaXMueCwgdGhpcy55KVxuICB9XG5cbiAgZXF1YWxzICh0aGF0KSB7XG4gICAgcmV0dXJuICh0aGlzLnggPT09IHRoYXQueCAmJiB0aGlzLnkgPT09IHRoYXQueSlcbiAgfVxuXG4gIG1vdmVUb3dhcmQgKHRoYXQsIGQpIHtcbiAgICAvLyBtb3ZlcyBbZF0gaW4gdGhlIGRpcmVjdGlvbiBvZiBbdGhhdDo6UG9pbnRdXG4gICAgY29uc3QgdXZlYyA9IFBvaW50LnVuaXRWZWN0b3IodGhpcywgdGhhdClcbiAgICB0aGlzLnRyYW5zbGF0ZSh1dmVjLnggKiBkLCB1dmVjLnkgKiBkKVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzdGF0aWMgZnJvbVBvbGFyIChyLCB0aGV0YSkge1xuICAgIHJldHVybiBuZXcgUG9pbnQoXG4gICAgICBNYXRoLmNvcyh0aGV0YSkgKiByLFxuICAgICAgTWF0aC5zaW4odGhldGEpICogclxuICAgIClcbiAgfVxuXG4gIHN0YXRpYyBmcm9tUG9sYXJEZWcgKHIsIHRoZXRhKSB7XG4gICAgdGhldGEgPSB0aGV0YSAqIE1hdGguUEkgLyAxODBcbiAgICByZXR1cm4gUG9pbnQuZnJvbVBvbGFyKHIsIHRoZXRhKVxuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIG1lYW4gb2ZcbiAgICogQHBhcmFtICB7Li4uUG9pbnR9IHBvaW50cyBUaGUgcG9pbnRzIHRvIGZpbmQgdGhlIG1lYW4gb2ZcbiAgICovXG4gIHN0YXRpYyBtZWFuICguLi5wb2ludHMpIHtcbiAgICBjb25zdCBzdW14ID0gcG9pbnRzLm1hcChwID0+IHAueCkucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSlcbiAgICBjb25zdCBzdW15ID0gcG9pbnRzLm1hcChwID0+IHAueSkucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSlcbiAgICBjb25zdCBuID0gcG9pbnRzLmxlbmd0aFxuXG4gICAgcmV0dXJuIG5ldyBQb2ludChzdW14IC8gbiwgc3VteSAvIG4pXG4gIH1cblxuICBzdGF0aWMgaW5DZW50ZXIgKEEsIEIsIEMpIHtcbiAgICAvLyBpbmNlbnRlciBvZiBhIHRyaWFuZ2xlIGdpdmVuIHZlcnRleCBwb2ludHMgQSwgQiBhbmQgQ1xuICAgIGNvbnN0IGEgPSBQb2ludC5kaXN0YW5jZShCLCBDKVxuICAgIGNvbnN0IGIgPSBQb2ludC5kaXN0YW5jZShBLCBDKVxuICAgIGNvbnN0IGMgPSBQb2ludC5kaXN0YW5jZShBLCBCKVxuXG4gICAgY29uc3QgcGVyaW1ldGVyID0gYSArIGIgKyBjXG4gICAgY29uc3Qgc3VteCA9IGEgKiBBLnggKyBiICogQi54ICsgYyAqIEMueFxuICAgIGNvbnN0IHN1bXkgPSBhICogQS55ICsgYiAqIEIueSArIGMgKiBDLnlcblxuICAgIHJldHVybiBuZXcgUG9pbnQoc3VteCAvIHBlcmltZXRlciwgc3VteSAvIHBlcmltZXRlcilcbiAgfVxuXG4gIHN0YXRpYyBtaW4gKHBvaW50cykge1xuICAgIGNvbnN0IG1pbnggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1pbih4LCBwLngpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtaW55ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5taW4oeSwgcC55KSwgSW5maW5pdHkpXG4gICAgcmV0dXJuIG5ldyBQb2ludChtaW54LCBtaW55KVxuICB9XG5cbiAgc3RhdGljIG1heCAocG9pbnRzKSB7XG4gICAgY29uc3QgbWF4eCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWF4KHgsIHAueCksIC1JbmZpbml0eSlcbiAgICBjb25zdCBtYXh5ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5tYXgoeSwgcC55KSwgLUluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQobWF4eCwgbWF4eSlcbiAgfVxuXG4gIHN0YXRpYyBjZW50ZXIgKHBvaW50cykge1xuICAgIGNvbnN0IG1pbnggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1pbih4LCBwLngpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtaW55ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5taW4oeSwgcC55KSwgSW5maW5pdHkpXG4gICAgY29uc3QgbWF4eCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWF4KHgsIHAueCksIC1JbmZpbml0eSlcbiAgICBjb25zdCBtYXh5ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5tYXgoeSwgcC55KSwgLUluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQoKG1heHggKyBtaW54KSAvIDIsIChtYXh5ICsgbWlueSkgLyAyKVxuICB9XG5cbiAgc3RhdGljIHVuaXRWZWN0b3IgKHAxLCBwMikge1xuICAgIC8vIHJldHVybnMgYSB1bml0IHZlY3RvciBpbiB0aGUgZGlyZWN0aW9uIG9mIHAxIHRvIHAyXG4gICAgLy8gaW4gdGhlIGZvcm0ge3g6Li4uLCB5Oi4uLn1cbiAgICBjb25zdCB2ZWN4ID0gcDIueCAtIHAxLnhcbiAgICBjb25zdCB2ZWN5ID0gcDIueSAtIHAxLnlcbiAgICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHZlY3gsIHZlY3kpXG4gICAgcmV0dXJuIHsgeDogdmVjeCAvIGxlbmd0aCwgeTogdmVjeSAvIGxlbmd0aCB9XG4gIH1cblxuICBzdGF0aWMgZGlzdGFuY2UgKHAxLCBwMikge1xuICAgIHJldHVybiBNYXRoLmh5cG90KHAxLnggLSBwMi54LCBwMS55IC0gcDIueSlcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGUgdGhlIGFuZ2xlIGluIHJhZGlhbnMgZnJvbSBob3Jpem9udGFsIHRvIHAyLCB3aXRoIGNlbnRyZSBwMS5cbiAgICogRS5nLiBhbmdsZUZyb20oICgwLDApLCAoMSwxKSApID0gcGkvMlxuICAgKiBBbmdsZSBpcyBmcm9tIDAgdG8gMnBpXG4gICAqIEBwYXJhbSB7UG9pbnR9IHAxIFRoZSBzdGFydCBwb2ludFxuICAgKiBAcGFyYW0ge1BvaW50fSBwMiBUaGUgZW5kIHBvaW50XG4gICAqIEByZXR1cm5zIHtudW1iZXJ9IFRoZSBhbmdsZSBpbiByYWRpYW5zXG4gICAqL1xuICBzdGF0aWMgYW5nbGVGcm9tIChwMSwgcDIpIHtcbiAgICBjb25zdCBhbmdsZSA9IE1hdGguYXRhbjIocDIueSAtIHAxLnksIHAyLnggLSBwMS54KVxuICAgIHJldHVybiBhbmdsZSA+PSAwID8gYW5nbGUgOiAyICogTWF0aC5QSSArIGFuZ2xlXG4gIH1cblxuICBzdGF0aWMgcmVwZWwgKHAxLCBwMiwgdHJpZ2dlciwgZGlzdGFuY2UpIHtcbiAgICAvLyBXaGVuIHAxIGFuZCBwMiBhcmUgbGVzcyB0aGFuIFt0cmlnZ2VyXSBhcGFydCwgdGhleSBhcmVcbiAgICAvLyBtb3ZlZCBzbyB0aGF0IHRoZXkgYXJlIFtkaXN0YW5jZV0gYXBhcnRcbiAgICBjb25zdCBkID0gTWF0aC5oeXBvdChwMS54IC0gcDIueCwgcDEueSAtIHAyLnkpXG4gICAgaWYgKGQgPj0gdHJpZ2dlcikgcmV0dXJuIGZhbHNlXG5cbiAgICBjb25zdCByID0gKGRpc3RhbmNlIC0gZCkgLyAyIC8vIGRpc3RhbmNlIHRoZXkgbmVlZCBtb3ZpbmdcbiAgICBwMS5tb3ZlVG93YXJkKHAyLCAtcilcbiAgICBwMi5tb3ZlVG93YXJkKHAxLCAtcilcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG59XG4iLCJpbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5pbXBvcnQgeyBjcmVhdGVFbGVtIH0gZnJvbSAnVXRpbGl0aWVzJ1xuaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4vVmlld09wdGlvbnMnXG5kZWNsYXJlIGNvbnN0IGthdGV4IDoge3JlbmRlciA6IChzdHJpbmc6IHN0cmluZywgZWxlbWVudDogSFRNTEVsZW1lbnQpID0+IHZvaWR9XG5cbi8qIEdyYXBoaWNRRGF0YSBjYW4gYWxsIGJlIHZlcnkgZGlmZmVyZW50LCBzbyBpbnRlcmZhY2UgaXMgZW1wdHlcbiAqIEhlcmUgZm9yIGNvZGUgZG9jdW1lbnRhdGlvbiByYXRoZXIgdGhhbiB0eXBlIHNhZmV0eSAod2hpY2ggaXNuJ3QgcHJvdmlkZWQpICovXG5cbi8qIGVzbGludC1kaXNhYmxlICovXG5leHBvcnQgaW50ZXJmYWNlIEdyYXBoaWNRRGF0YSB7XG59XG4vKiBlc2xpbnQtZW5hYmxlICovXG5cbi8qIE5vdCB3b3J0aCB0aGUgaGFzc2x5IHRyeWluZyB0byBnZXQgaW50ZXJmYWNlcyBmb3Igc3RhdGljIG1ldGhvZHNcbiAqXG4gKiBleHBvcnQgaW50ZXJmYWNlIEdyYXBoaWNRRGF0YUNvbnN0cnVjdG9yIHtcbiAqICAgbmV3KC4uLmFyZ3MgOiB1bmtub3duW10pOiBHcmFwaGljUURhdGFcbiAqICAgcmFuZG9tKG9wdGlvbnM6IHVua25vd24pIDogR3JhcGhpY1FEYXRhXG4gKiB9XG4qL1xuXG5leHBvcnQgaW50ZXJmYWNlIExhYmVsIHtcbiAgcG9zOiBQb2ludCxcbiAgdGV4dHE6IHN0cmluZyxcbiAgdGV4dGE6IHN0cmluZyxcbiAgc3R5bGVxOiBzdHJpbmcsXG4gIHN0eWxlYTogc3RyaW5nLFxuICB0ZXh0OiBzdHJpbmcsXG4gIHN0eWxlOiBzdHJpbmdcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEdyYXBoaWNRVmlldyB7XG4gIERPTTogSFRNTEVsZW1lbnRcbiAgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudFxuICB3aWR0aDogbnVtYmVyXG4gIGhlaWdodDogbnVtYmVyXG4gIGRhdGE6IEdyYXBoaWNRRGF0YVxuICBsYWJlbHM6IExhYmVsW11cblxuICBjb25zdHJ1Y3RvciAoZGF0YSA6IEdyYXBoaWNRRGF0YSwgdmlld09wdGlvbnMgOiBWaWV3T3B0aW9ucykge1xuICAgIGNvbnN0IGRlZmF1bHRzIDogVmlld09wdGlvbnMgPSB7XG4gICAgICB3aWR0aDogMjUwLFxuICAgICAgaGVpZ2h0OiAyNTBcbiAgICB9XG5cbiAgICB2aWV3T3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCB2aWV3T3B0aW9ucylcblxuICAgIHRoaXMud2lkdGggPSB2aWV3T3B0aW9ucy53aWR0aFxuICAgIHRoaXMuaGVpZ2h0ID0gdmlld09wdGlvbnMuaGVpZ2h0IC8vIG9ubHkgdGhpbmdzIEkgbmVlZCBmcm9tIHRoZSBvcHRpb25zLCBnZW5lcmFsbHk/XG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIC8vIHRoaXMucm90YXRpb24/XG5cbiAgICB0aGlzLmxhYmVscyA9IFtdIC8vIGxhYmVscyBvbiBkaWFncmFtXG5cbiAgICAvLyBET00gZWxlbWVudHNcbiAgICB0aGlzLkRPTSA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1kaXYnKVxuICAgIHRoaXMuY2FudmFzID0gY3JlYXRlRWxlbSgnY2FudmFzJywgJ3F1ZXN0aW9uLWNhbnZhcycsIHRoaXMuRE9NKSBhcyBIVE1MQ2FudmFzRWxlbWVudFxuICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy53aWR0aFxuICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMuaGVpZ2h0XG4gIH1cblxuICBnZXRET00gKCkgOiBIVE1MRWxlbWVudCB7XG4gICAgcmV0dXJuIHRoaXMuRE9NXG4gIH1cblxuICBhYnN0cmFjdCByZW5kZXIgKCkgOiB2b2lkXG5cbiAgcmVuZGVyTGFiZWxzIChudWRnZT8gOiBib29sZWFuKSA6IHZvaWQge1xuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuRE9NXG5cbiAgICAvLyByZW1vdmUgYW55IGV4aXN0aW5nIGxhYmVsc1xuICAgIGNvbnN0IG9sZExhYmVscyA9IGNvbnRhaW5lci5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdsYWJlbCcpXG4gICAgd2hpbGUgKG9sZExhYmVscy5sZW5ndGggPiAwKSB7XG4gICAgICBvbGRMYWJlbHNbMF0ucmVtb3ZlKClcbiAgICB9XG5cbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgY29uc3QgbGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgICAgY29uc3QgaW5uZXJsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgICBsYWJlbC5jbGFzc0xpc3QuYWRkKCdsYWJlbCcpXG4gICAgICBsYWJlbC5jbGFzc05hbWUgKz0gJyAnICsgbC5zdHlsZSAvLyB1c2luZyBjbGFzc05hbWUgb3ZlciBjbGFzc0xpc3Qgc2luY2UgbC5zdHlsZSBpcyBzcGFjZS1kZWxpbWl0ZWQgbGlzdCBvZiBjbGFzc2VzXG4gICAgICBsYWJlbC5zdHlsZS5sZWZ0ID0gbC5wb3MueCArICdweCdcbiAgICAgIGxhYmVsLnN0eWxlLnRvcCA9IGwucG9zLnkgKyAncHgnXG5cbiAgICAgIGthdGV4LnJlbmRlcihsLnRleHQsIGlubmVybGFiZWwpXG4gICAgICBsYWJlbC5hcHBlbmRDaGlsZChpbm5lcmxhYmVsKVxuICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGxhYmVsKVxuXG4gICAgICAvLyByZW1vdmUgc3BhY2UgaWYgdGhlIGlubmVyIGxhYmVsIGlzIHRvbyBiaWdcbiAgICAgIGlmIChpbm5lcmxhYmVsLm9mZnNldFdpZHRoIC8gaW5uZXJsYWJlbC5vZmZzZXRIZWlnaHQgPiAyKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGByZW1vdmVkIHNwYWNlIGluICR7bC50ZXh0fWApXG4gICAgICAgIGNvbnN0IG5ld2xhYmVsdGV4dCA9IGwudGV4dC5yZXBsYWNlKC9cXCsvLCAnXFxcXCErXFxcXCEnKS5yZXBsYWNlKC8tLywgJ1xcXFwhLVxcXFwhJylcbiAgICAgICAga2F0ZXgucmVuZGVyKG5ld2xhYmVsdGV4dCwgaW5uZXJsYWJlbClcbiAgICAgIH1cblxuICAgICAgLy8gSSBkb24ndCB1bmRlcnN0YW5kIHRoaXMgYWRqdXN0bWVudC4gSSB0aGluayBpdCBtaWdodCBiZSBuZWVkZWQgaW4gYXJpdGhtYWdvbnMsIGJ1dCBpdCBtYWtlc1xuICAgICAgLy8gb3RoZXJzIGdvIGZ1bm55LlxuXG4gICAgICBpZiAobnVkZ2UpIHtcbiAgICAgICAgY29uc3QgbHdpZHRoID0gbGFiZWwub2Zmc2V0V2lkdGhcbiAgICAgICAgaWYgKGwucG9zLnggPCB0aGlzLmNhbnZhcy53aWR0aCAvIDIgLSA1ICYmIGwucG9zLnggKyBsd2lkdGggLyAyID4gdGhpcy5jYW52YXMud2lkdGggLyAyKSB7XG4gICAgICAgICAgbGFiZWwuc3R5bGUubGVmdCA9ICh0aGlzLmNhbnZhcy53aWR0aCAvIDIgLSBsd2lkdGggLSAzKSArICdweCdcbiAgICAgICAgICBjb25zb2xlLmxvZyhgbnVkZ2VkICcke2wudGV4dH0nYClcbiAgICAgICAgfVxuICAgICAgICBpZiAobC5wb3MueCA+IHRoaXMuY2FudmFzLndpZHRoIC8gMiArIDUgJiYgbC5wb3MueCAtIGx3aWR0aCAvIDIgPCB0aGlzLmNhbnZhcy53aWR0aCAvIDIpIHtcbiAgICAgICAgICBsYWJlbC5zdHlsZS5sZWZ0ID0gKHRoaXMuY2FudmFzLndpZHRoIC8gMiArIDMpICsgJ3B4J1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBudWRnZWQgJyR7bC50ZXh0fSdgKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0YVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVhXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIC8vIFBvaW50IHRyYW5mb3JtYXRpb25zIG9mIGFsbCBwb2ludHNcblxuICBnZXQgYWxscG9pbnRzICgpIDogUG9pbnRbXSB7XG4gICAgcmV0dXJuIFtdXG4gIH1cblxuICBzY2FsZSAoc2YgOiBudW1iZXIpIDogdm9pZCB7XG4gICAgdGhpcy5hbGxwb2ludHMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgcC5zY2FsZShzZilcbiAgICB9KVxuICB9XG5cbiAgcm90YXRlIChhbmdsZSA6IG51bWJlcikgOiBudW1iZXIge1xuICAgIHRoaXMuYWxscG9pbnRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHAucm90YXRlKGFuZ2xlKVxuICAgIH0pXG4gICAgcmV0dXJuIGFuZ2xlXG4gIH1cblxuICB0cmFuc2xhdGUgKHggOiBudW1iZXIsIHkgOiBudW1iZXIpIDogdm9pZCB7XG4gICAgdGhpcy5hbGxwb2ludHMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgcC50cmFuc2xhdGUoeCwgeSlcbiAgICB9KVxuICB9XG5cbiAgcmFuZG9tUm90YXRlICgpIDogbnVtYmVyIHtcbiAgICBjb25zdCBhbmdsZSA9IDIgKiBNYXRoLlBJICogTWF0aC5yYW5kb20oKVxuICAgIHRoaXMucm90YXRlKGFuZ2xlKVxuICAgIHJldHVybiBhbmdsZVxuICB9XG5cbiAgLyoqXG4gICAqIFNjYWxlcyBhbGwgdGhlIHBvaW50cyB0byB3aXRoaW4gYSBnaXZlbiB3aWR0aCBhbmQgaGVpZ2h0LCBjZW50ZXJpbmcgdGhlIHJlc3VsdC4gUmV0dXJucyB0aGUgc2NhbGUgZmFjdG9yXG4gICAqIEBwYXJhbSB3aWR0aCBUaGUgd2lkdGggb2YgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSB0byBzY2FsZSB0b1xuICAgKiBAcGFyYW0gaGVpZ2h0IFRoZSBoZWlnaHQgb2YgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSB0byBzY2FsZSB0b1xuICAgKiBAcGFyYW0gbWFyZ2luIE1hcmdpbiB0byBsZWF2ZSBvdXRzaWRlIHRoZSByZWN0YW5nbGVcbiAgICogQHJldHVybnNcbiAgICovXG4gIHNjYWxlVG9GaXQgKHdpZHRoIDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgbWFyZ2luIDogbnVtYmVyKSA6IG51bWJlciB7XG4gICAgbGV0IHRvcExlZnQgOiBQb2ludCA9IFBvaW50Lm1pbih0aGlzLmFsbHBvaW50cylcbiAgICBsZXQgYm90dG9tUmlnaHQgOiBQb2ludCA9IFBvaW50Lm1heCh0aGlzLmFsbHBvaW50cylcbiAgICBjb25zdCB0b3RhbFdpZHRoIDogbnVtYmVyID0gYm90dG9tUmlnaHQueCAtIHRvcExlZnQueFxuICAgIGNvbnN0IHRvdGFsSGVpZ2h0IDogbnVtYmVyID0gYm90dG9tUmlnaHQueSAtIHRvcExlZnQueVxuICAgIGNvbnN0IHNmID0gTWF0aC5taW4oKHdpZHRoIC0gbWFyZ2luKSAvIHRvdGFsV2lkdGgsIChoZWlnaHQgLSBtYXJnaW4pIC8gdG90YWxIZWlnaHQpXG4gICAgdGhpcy5zY2FsZShzZilcblxuICAgIC8vIGNlbnRyZVxuICAgIHRvcExlZnQgPSBQb2ludC5taW4odGhpcy5hbGxwb2ludHMpXG4gICAgYm90dG9tUmlnaHQgPSBQb2ludC5tYXgodGhpcy5hbGxwb2ludHMpXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbih0b3BMZWZ0LCBib3R0b21SaWdodClcbiAgICB0aGlzLnRyYW5zbGF0ZSh3aWR0aCAvIDIgLSBjZW50ZXIueCwgaGVpZ2h0IC8gMiAtIGNlbnRlci55KSAvLyBjZW50cmVcblxuICAgIHJldHVybiBzZlxuICB9XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBHcmFwaGljUSBleHRlbmRzIFF1ZXN0aW9uIHtcbiAgZGF0YTogR3JhcGhpY1FEYXRhXG4gIHZpZXc6IEdyYXBoaWNRVmlld1xuXG4gIGNvbnN0cnVjdG9yICgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICBzdXBlcigpIC8vIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICAgIGRlbGV0ZSAodGhpcy5ET00pIC8vIGdvaW5nIHRvIG92ZXJyaWRlIGdldERPTSB1c2luZyB0aGUgdmlldydzIERPTVxuXG4gICAgLyogVGhlc2UgYXJlIGd1YXJhbnRlZWQgdG8gYmUgb3ZlcnJpZGRlbiwgc28gbm8gcG9pbnQgaW5pdGlhbGl6aW5nIGhlcmVcbiAgICAgKlxuICAgICAqICB0aGlzLmRhdGEgPSBuZXcgR3JhcGhpY1FEYXRhKG9wdGlvbnMpXG4gICAgICogIHRoaXMudmlldyA9IG5ldyBHcmFwaGljUVZpZXcodGhpcy5kYXRhLCBvcHRpb25zKVxuICAgICAqXG4gICAgICovXG4gIH1cblxuICAvKiBOZWVkIHRvIHJlZmFjdG9yIHN1YmNsYXNzZXMgdG8gZG8gdGhpczpcbiAgICogY29uc3RydWN0b3IgKGRhdGEsIHZpZXcpIHtcbiAgICogICAgdGhpcy5kYXRhID0gZGF0YVxuICAgKiAgICB0aGlzLnZpZXcgPSB2aWV3XG4gICAqIH1cbiAgICpcbiAgICogc3RhdGljIHJhbmRvbShvcHRpb25zKSB7XG4gICAqICAvLyBhbiBhdHRlbXB0IGF0IGhhdmluZyBhYnN0cmFjdCBzdGF0aWMgbWV0aG9kcywgYWxiZWl0IHJ1bnRpbWUgZXJyb3JcbiAgICogIHRocm93IG5ldyBFcnJvcihcImByYW5kb20oKWAgbXVzdCBiZSBvdmVycmlkZGVuIGluIHN1YmNsYXNzIFwiICsgdGhpcy5uYW1lKVxuICAgKiB9XG4gICAqXG4gICAqIHR5cGljYWwgaW1wbGVtZW50YXRpb246XG4gICAqIHN0YXRpYyByYW5kb20ob3B0aW9ucykge1xuICAgKiAgY29uc3QgZGF0YSA9IG5ldyBEZXJpdmVkUURhdGEob3B0aW9ucylcbiAgICogIGNvbnN0IHZpZXcgPSBuZXcgRGVyaXZlZFFWaWV3KG9wdGlvbnMpXG4gICAqICByZXR1cm4gbmV3IERlcml2ZWRRRGF0YShkYXRhLHZpZXcpXG4gICAqIH1cbiAgICpcbiAgICovXG5cbiAgZ2V0RE9NICgpIDogSFRNTEVsZW1lbnQgeyByZXR1cm4gdGhpcy52aWV3LmdldERPTSgpIH1cblxuICByZW5kZXIgKCkgOiB2b2lkIHsgdGhpcy52aWV3LnJlbmRlcigpIH1cblxuICBzaG93QW5zd2VyICgpIDogdm9pZCB7XG4gICAgc3VwZXIuc2hvd0Fuc3dlcigpXG4gICAgdGhpcy52aWV3LnNob3dBbnN3ZXIoKVxuICB9XG5cbiAgaGlkZUFuc3dlciAoKSA6IHZvaWQge1xuICAgIHN1cGVyLmhpZGVBbnN3ZXIoKVxuICAgIHRoaXMudmlldy5oaWRlQW5zd2VyKClcbiAgfVxufVxuIiwiaW1wb3J0ICogYXMgY29tbW9uanNIZWxwZXJzIGZyb20gJ1x1MDAwMGNvbW1vbmpzSGVscGVycy5qcydcblxudmFyIGZyYWN0aW9uID0gY29tbW9uanNIZWxwZXJzLmNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZ1bmN0aW9uIChtb2R1bGUsIGV4cG9ydHMpIHtcbi8qKlxuICogQGxpY2Vuc2UgRnJhY3Rpb24uanMgdjQuMC45IDA5LzA5LzIwMTVcbiAqIGh0dHA6Ly93d3cueGFyZy5vcmcvMjAxNC8wMy9yYXRpb25hbC1udW1iZXJzLWluLWphdmFzY3JpcHQvXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1LCBSb2JlcnQgRWlzZWxlIChyb2JlcnRAeGFyZy5vcmcpXG4gKiBEdWFsIGxpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgb3IgR1BMIFZlcnNpb24gMiBsaWNlbnNlcy5cbiAqKi9cblxuICAvKipcbiAqXG4gKiBUaGlzIGNsYXNzIG9mZmVycyB0aGUgcG9zc2liaWxpdHkgdG8gY2FsY3VsYXRlIGZyYWN0aW9ucy5cbiAqIFlvdSBjYW4gcGFzcyBhIGZyYWN0aW9uIGluIGRpZmZlcmVudCBmb3JtYXRzLiBFaXRoZXIgYXMgYXJyYXksIGFzIGRvdWJsZSwgYXMgc3RyaW5nIG9yIGFzIGFuIGludGVnZXIuXG4gKlxuICogQXJyYXkvT2JqZWN0IGZvcm1cbiAqIFsgMCA9PiA8bm9taW5hdG9yPiwgMSA9PiA8ZGVub21pbmF0b3I+IF1cbiAqIFsgbiA9PiA8bm9taW5hdG9yPiwgZCA9PiA8ZGVub21pbmF0b3I+IF1cbiAqXG4gKiBJbnRlZ2VyIGZvcm1cbiAqIC0gU2luZ2xlIGludGVnZXIgdmFsdWVcbiAqXG4gKiBEb3VibGUgZm9ybVxuICogLSBTaW5nbGUgZG91YmxlIHZhbHVlXG4gKlxuICogU3RyaW5nIGZvcm1cbiAqIDEyMy40NTYgLSBhIHNpbXBsZSBkb3VibGVcbiAqIDEyMy80NTYgLSBhIHN0cmluZyBmcmFjdGlvblxuICogMTIzLic0NTYnIC0gYSBkb3VibGUgd2l0aCByZXBlYXRpbmcgZGVjaW1hbCBwbGFjZXNcbiAqIDEyMy4oNDU2KSAtIHN5bm9ueW1cbiAqIDEyMy40NSc2JyAtIGEgZG91YmxlIHdpdGggcmVwZWF0aW5nIGxhc3QgcGxhY2VcbiAqIDEyMy40NSg2KSAtIHN5bm9ueW1cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIHZhciBmID0gbmV3IEZyYWN0aW9uKFwiOS40JzMxJ1wiKTtcbiAqIGYubXVsKFstNCwgM10pLmRpdig0LjkpO1xuICpcbiAqL1xuXG4gIChmdW5jdGlvbiAocm9vdCkge1xuICAgICd1c2Ugc3RyaWN0J1xuXG4gICAgLy8gTWF4aW11bSBzZWFyY2ggZGVwdGggZm9yIGN5Y2xpYyByYXRpb25hbCBudW1iZXJzLiAyMDAwIHNob3VsZCBiZSBtb3JlIHRoYW4gZW5vdWdoLlxuICAgIC8vIEV4YW1wbGU6IDEvNyA9IDAuKDE0Mjg1NykgaGFzIDYgcmVwZWF0aW5nIGRlY2ltYWwgcGxhY2VzLlxuICAgIC8vIElmIE1BWF9DWUNMRV9MRU4gZ2V0cyByZWR1Y2VkLCBsb25nIGN5Y2xlcyB3aWxsIG5vdCBiZSBkZXRlY3RlZCBhbmQgdG9TdHJpbmcoKSBvbmx5IGdldHMgdGhlIGZpcnN0IDEwIGRpZ2l0c1xuICAgIHZhciBNQVhfQ1lDTEVfTEVOID0gMjAwMFxuXG4gICAgLy8gUGFyc2VkIGRhdGEgdG8gYXZvaWQgY2FsbGluZyBcIm5ld1wiIGFsbCB0aGUgdGltZVxuICAgIHZhciBQID0ge1xuICAgICAgczogMSxcbiAgICAgIG46IDAsXG4gICAgICBkOiAxXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlRXJyb3IgKG5hbWUpIHtcbiAgICAgIGZ1bmN0aW9uIGVycm9yQ29uc3RydWN0b3IgKCkge1xuICAgICAgICB2YXIgdGVtcCA9IEVycm9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICAgICAgdGVtcC5uYW1lID0gdGhpcy5uYW1lID0gbmFtZVxuICAgICAgICB0aGlzLnN0YWNrID0gdGVtcC5zdGFja1xuICAgICAgICB0aGlzLm1lc3NhZ2UgPSB0ZW1wLm1lc3NhZ2VcbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICogRXJyb3IgY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgICAgZnVuY3Rpb24gSW50ZXJtZWRpYXRlSW5oZXJpdG9yICgpIHt9XG4gICAgICBJbnRlcm1lZGlhdGVJbmhlcml0b3IucHJvdG90eXBlID0gRXJyb3IucHJvdG90eXBlXG4gICAgICBlcnJvckNvbnN0cnVjdG9yLnByb3RvdHlwZSA9IG5ldyBJbnRlcm1lZGlhdGVJbmhlcml0b3IoKVxuXG4gICAgICByZXR1cm4gZXJyb3JDb25zdHJ1Y3RvclxuICAgIH1cblxuICAgIHZhciBEaXZpc2lvbkJ5WmVybyA9IEZyYWN0aW9uLkRpdmlzaW9uQnlaZXJvID0gY3JlYXRlRXJyb3IoJ0RpdmlzaW9uQnlaZXJvJylcbiAgICB2YXIgSW52YWxpZFBhcmFtZXRlciA9IEZyYWN0aW9uLkludmFsaWRQYXJhbWV0ZXIgPSBjcmVhdGVFcnJvcignSW52YWxpZFBhcmFtZXRlcicpXG5cbiAgICBmdW5jdGlvbiBhc3NpZ24gKG4sIHMpIHtcbiAgICAgIGlmIChpc05hTihuID0gcGFyc2VJbnQobiwgMTApKSkge1xuICAgICAgICB0aHJvd0ludmFsaWRQYXJhbSgpXG4gICAgICB9XG4gICAgICByZXR1cm4gbiAqIHNcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0aHJvd0ludmFsaWRQYXJhbSAoKSB7XG4gICAgICB0aHJvdyBuZXcgSW52YWxpZFBhcmFtZXRlcigpXG4gICAgfVxuXG4gICAgdmFyIHBhcnNlID0gZnVuY3Rpb24gKHAxLCBwMikge1xuICAgICAgdmFyIG4gPSAwOyB2YXIgZCA9IDE7IHZhciBzID0gMVxuICAgICAgdmFyIHYgPSAwOyB2YXIgdyA9IDA7IHZhciB4ID0gMDsgdmFyIHkgPSAxOyB2YXIgeiA9IDFcblxuICAgICAgdmFyIEEgPSAwOyB2YXIgQiA9IDFcbiAgICAgIHZhciBDID0gMTsgdmFyIEQgPSAxXG5cbiAgICAgIHZhciBOID0gMTAwMDAwMDBcbiAgICAgIHZhciBNXG5cbiAgICAgIGlmIChwMSA9PT0gdW5kZWZpbmVkIHx8IHAxID09PSBudWxsKSB7XG4gICAgICAvKiB2b2lkICovXG4gICAgICB9IGVsc2UgaWYgKHAyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbiA9IHAxXG4gICAgICAgIGQgPSBwMlxuICAgICAgICBzID0gbiAqIGRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN3aXRjaCAodHlwZW9mIHAxKSB7XG4gICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZiAoJ2QnIGluIHAxICYmICduJyBpbiBwMSkge1xuICAgICAgICAgICAgICBuID0gcDEublxuICAgICAgICAgICAgICBkID0gcDEuZFxuICAgICAgICAgICAgICBpZiAoJ3MnIGluIHAxKSB7IG4gKj0gcDEucyB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKDAgaW4gcDEpIHtcbiAgICAgICAgICAgICAgbiA9IHAxWzBdXG4gICAgICAgICAgICAgIGlmICgxIGluIHAxKSB7IGQgPSBwMVsxXSB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvd0ludmFsaWRQYXJhbSgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzID0gbiAqIGRcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAge1xuICAgICAgICAgICAgaWYgKHAxIDwgMCkge1xuICAgICAgICAgICAgICBzID0gcDFcbiAgICAgICAgICAgICAgcDEgPSAtcDFcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHAxICUgMSA9PT0gMCkge1xuICAgICAgICAgICAgICBuID0gcDFcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocDEgPiAwKSB7IC8vIGNoZWNrIGZvciAhPSAwLCBzY2FsZSB3b3VsZCBiZWNvbWUgTmFOIChsb2coMCkpLCB3aGljaCBjb252ZXJnZXMgcmVhbGx5IHNsb3dcbiAgICAgICAgICAgICAgaWYgKHAxID49IDEpIHtcbiAgICAgICAgICAgICAgICB6ID0gTWF0aC5wb3coMTAsIE1hdGguZmxvb3IoMSArIE1hdGgubG9nKHAxKSAvIE1hdGguTE4xMCkpXG4gICAgICAgICAgICAgICAgcDEgLz0gelxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gVXNpbmcgRmFyZXkgU2VxdWVuY2VzXG4gICAgICAgICAgICAgIC8vIGh0dHA6Ly93d3cuam9obmRjb29rLmNvbS9ibG9nLzIwMTAvMTAvMjAvYmVzdC1yYXRpb25hbC1hcHByb3hpbWF0aW9uL1xuXG4gICAgICAgICAgICAgIHdoaWxlIChCIDw9IE4gJiYgRCA8PSBOKSB7XG4gICAgICAgICAgICAgICAgTSA9IChBICsgQykgLyAoQiArIEQpXG5cbiAgICAgICAgICAgICAgICBpZiAocDEgPT09IE0pIHtcbiAgICAgICAgICAgICAgICAgIGlmIChCICsgRCA8PSBOKSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBBICsgQ1xuICAgICAgICAgICAgICAgICAgICBkID0gQiArIERcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoRCA+IEIpIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IENcbiAgICAgICAgICAgICAgICAgICAgZCA9IERcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBBXG4gICAgICAgICAgICAgICAgICAgIGQgPSBCXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBpZiAocDEgPiBNKSB7XG4gICAgICAgICAgICAgICAgICAgIEEgKz0gQ1xuICAgICAgICAgICAgICAgICAgICBCICs9IERcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIEMgKz0gQVxuICAgICAgICAgICAgICAgICAgICBEICs9IEJcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKEIgPiBOKSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBDXG4gICAgICAgICAgICAgICAgICAgIGQgPSBEXG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBuID0gQVxuICAgICAgICAgICAgICAgICAgICBkID0gQlxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBuICo9IHpcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNOYU4ocDEpIHx8IGlzTmFOKHAyKSkge1xuICAgICAgICAgICAgICBkID0gbiA9IE5hTlxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICB7XG4gICAgICAgICAgICBCID0gcDEubWF0Y2goL1xcZCt8Li9nKVxuXG4gICAgICAgICAgICBpZiAoQiA9PT0gbnVsbCkgeyB0aHJvd0ludmFsaWRQYXJhbSgpIH1cblxuICAgICAgICAgICAgaWYgKEJbQV0gPT09ICctJykgeyAvLyBDaGVjayBmb3IgbWludXMgc2lnbiBhdCB0aGUgYmVnaW5uaW5nXG4gICAgICAgICAgICAgIHMgPSAtMVxuICAgICAgICAgICAgICBBKytcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQltBXSA9PT0gJysnKSB7IC8vIENoZWNrIGZvciBwbHVzIHNpZ24gYXQgdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgICBBKytcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKEIubGVuZ3RoID09PSBBICsgMSkgeyAvLyBDaGVjayBpZiBpdCdzIGp1c3QgYSBzaW1wbGUgbnVtYmVyIFwiMTIzNFwiXG4gICAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBKytdLCBzKVxuICAgICAgICAgICAgfSBlbHNlIGlmIChCW0EgKyAxXSA9PT0gJy4nIHx8IEJbQV0gPT09ICcuJykgeyAvLyBDaGVjayBpZiBpdCdzIGEgZGVjaW1hbCBudW1iZXJcbiAgICAgICAgICAgICAgaWYgKEJbQV0gIT09ICcuJykgeyAvLyBIYW5kbGUgMC41IGFuZCAuNVxuICAgICAgICAgICAgICAgIHYgPSBhc3NpZ24oQltBKytdLCBzKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIEErK1xuXG4gICAgICAgICAgICAgIC8vIENoZWNrIGZvciBkZWNpbWFsIHBsYWNlc1xuICAgICAgICAgICAgICBpZiAoQSArIDEgPT09IEIubGVuZ3RoIHx8IEJbQSArIDFdID09PSAnKCcgJiYgQltBICsgM10gPT09ICcpJyB8fCBCW0EgKyAxXSA9PT0gXCInXCIgJiYgQltBICsgM10gPT09IFwiJ1wiKSB7XG4gICAgICAgICAgICAgICAgdyA9IGFzc2lnbihCW0FdLCBzKVxuICAgICAgICAgICAgICAgIHkgPSBNYXRoLnBvdygxMCwgQltBXS5sZW5ndGgpXG4gICAgICAgICAgICAgICAgQSsrXG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAvLyBDaGVjayBmb3IgcmVwZWF0aW5nIHBsYWNlc1xuICAgICAgICAgICAgICBpZiAoQltBXSA9PT0gJygnICYmIEJbQSArIDJdID09PSAnKScgfHwgQltBXSA9PT0gXCInXCIgJiYgQltBICsgMl0gPT09IFwiJ1wiKSB7XG4gICAgICAgICAgICAgICAgeCA9IGFzc2lnbihCW0EgKyAxXSwgcylcbiAgICAgICAgICAgICAgICB6ID0gTWF0aC5wb3coMTAsIEJbQSArIDFdLmxlbmd0aCkgLSAxXG4gICAgICAgICAgICAgICAgQSArPSAzXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQltBICsgMV0gPT09ICcvJyB8fCBCW0EgKyAxXSA9PT0gJzonKSB7IC8vIENoZWNrIGZvciBhIHNpbXBsZSBmcmFjdGlvbiBcIjEyMy80NTZcIiBvciBcIjEyMzo0NTZcIlxuICAgICAgICAgICAgICB3ID0gYXNzaWduKEJbQV0sIHMpXG4gICAgICAgICAgICAgIHkgPSBhc3NpZ24oQltBICsgMl0sIDEpXG4gICAgICAgICAgICAgIEEgKz0gM1xuICAgICAgICAgICAgfSBlbHNlIGlmIChCW0EgKyAzXSA9PT0gJy8nICYmIEJbQSArIDFdID09PSAnICcpIHsgLy8gQ2hlY2sgZm9yIGEgY29tcGxleCBmcmFjdGlvbiBcIjEyMyAxLzJcIlxuICAgICAgICAgICAgICB2ID0gYXNzaWduKEJbQV0sIHMpXG4gICAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBICsgMl0sIHMpXG4gICAgICAgICAgICAgIHkgPSBhc3NpZ24oQltBICsgNF0sIDEpXG4gICAgICAgICAgICAgIEEgKz0gNVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoQi5sZW5ndGggPD0gQSkgeyAvLyBDaGVjayBmb3IgbW9yZSB0b2tlbnMgb24gdGhlIHN0YWNrXG4gICAgICAgICAgICAgIGQgPSB5ICogelxuICAgICAgICAgICAgICBzID0gLyogdm9pZCAqL1xuICAgICAgICAgICAgICAgICAgICBuID0geCArIGQgKiB2ICsgeiAqIHdcbiAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIC8qIEZhbGwgdGhyb3VnaCBvbiBlcnJvciAqL1xuICAgICAgICAgIH1cbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChkID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBEaXZpc2lvbkJ5WmVybygpXG4gICAgICB9XG5cbiAgICAgIFAucyA9IHMgPCAwID8gLTEgOiAxXG4gICAgICBQLm4gPSBNYXRoLmFicyhuKVxuICAgICAgUC5kID0gTWF0aC5hYnMoZClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb2Rwb3cgKGIsIGUsIG0pIHtcbiAgICAgIHZhciByID0gMVxuICAgICAgZm9yICg7IGUgPiAwOyBiID0gKGIgKiBiKSAlIG0sIGUgPj49IDEpIHtcbiAgICAgICAgaWYgKGUgJiAxKSB7XG4gICAgICAgICAgciA9IChyICogYikgJSBtXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3ljbGVMZW4gKG4sIGQpIHtcbiAgICAgIGZvciAoOyBkICUgMiA9PT0gMDtcbiAgICAgICAgZCAvPSAyKSB7XG4gICAgICB9XG5cbiAgICAgIGZvciAoOyBkICUgNSA9PT0gMDtcbiAgICAgICAgZCAvPSA1KSB7XG4gICAgICB9XG5cbiAgICAgIGlmIChkID09PSAxKSAvLyBDYXRjaCBub24tY3ljbGljIG51bWJlcnNcbiAgICAgIHsgcmV0dXJuIDAgfVxuXG4gICAgICAvLyBJZiB3ZSB3b3VsZCBsaWtlIHRvIGNvbXB1dGUgcmVhbGx5IGxhcmdlIG51bWJlcnMgcXVpY2tlciwgd2UgY291bGQgbWFrZSB1c2Ugb2YgRmVybWF0J3MgbGl0dGxlIHRoZW9yZW06XG4gICAgICAvLyAxMF4oZC0xKSAlIGQgPT0gMVxuICAgICAgLy8gSG93ZXZlciwgd2UgZG9uJ3QgbmVlZCBzdWNoIGxhcmdlIG51bWJlcnMgYW5kIE1BWF9DWUNMRV9MRU4gc2hvdWxkIGJlIHRoZSBjYXBzdG9uZSxcbiAgICAgIC8vIGFzIHdlIHdhbnQgdG8gdHJhbnNsYXRlIHRoZSBudW1iZXJzIHRvIHN0cmluZ3MuXG5cbiAgICAgIHZhciByZW0gPSAxMCAlIGRcbiAgICAgIHZhciB0ID0gMVxuXG4gICAgICBmb3IgKDsgcmVtICE9PSAxOyB0KyspIHtcbiAgICAgICAgcmVtID0gcmVtICogMTAgJSBkXG5cbiAgICAgICAgaWYgKHQgPiBNQVhfQ1lDTEVfTEVOKSB7IHJldHVybiAwIH0gLy8gUmV0dXJuaW5nIDAgaGVyZSBtZWFucyB0aGF0IHdlIGRvbid0IHByaW50IGl0IGFzIGEgY3ljbGljIG51bWJlci4gSXQncyBsaWtlbHkgdGhhdCB0aGUgYW5zd2VyIGlzIGBkLTFgXG4gICAgICB9XG4gICAgICByZXR1cm4gdFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGN5Y2xlU3RhcnQgKG4sIGQsIGxlbikge1xuICAgICAgdmFyIHJlbTEgPSAxXG4gICAgICB2YXIgcmVtMiA9IG1vZHBvdygxMCwgbGVuLCBkKVxuXG4gICAgICBmb3IgKHZhciB0ID0gMDsgdCA8IDMwMDsgdCsrKSB7IC8vIHMgPCB+bG9nMTAoTnVtYmVyLk1BWF9WQUxVRSlcbiAgICAgIC8vIFNvbHZlIDEwXnMgPT0gMTBeKHMrdCkgKG1vZCBkKVxuXG4gICAgICAgIGlmIChyZW0xID09PSByZW0yKSB7IHJldHVybiB0IH1cblxuICAgICAgICByZW0xID0gcmVtMSAqIDEwICUgZFxuICAgICAgICByZW0yID0gcmVtMiAqIDEwICUgZFxuICAgICAgfVxuICAgICAgcmV0dXJuIDBcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnY2QgKGEsIGIpIHtcbiAgICAgIGlmICghYSkgeyByZXR1cm4gYiB9XG4gICAgICBpZiAoIWIpIHsgcmV0dXJuIGEgfVxuXG4gICAgICB3aGlsZSAoMSkge1xuICAgICAgICBhICU9IGJcbiAgICAgICAgaWYgKCFhKSB7IHJldHVybiBiIH1cbiAgICAgICAgYiAlPSBhXG4gICAgICAgIGlmICghYikgeyByZXR1cm4gYSB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgKiBNb2R1bGUgY29uc3RydWN0b3JcbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7bnVtYmVyfEZyYWN0aW9uPX0gYVxuICAgKiBAcGFyYW0ge251bWJlcj19IGJcbiAgICovXG4gICAgZnVuY3Rpb24gRnJhY3Rpb24gKGEsIGIpIHtcbiAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGcmFjdGlvbikpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihhLCBiKVxuICAgICAgfVxuXG4gICAgICBwYXJzZShhLCBiKVxuXG4gICAgICBpZiAoRnJhY3Rpb24uUkVEVUNFKSB7XG4gICAgICAgIGEgPSBnY2QoUC5kLCBQLm4pIC8vIEFidXNlIGFcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGEgPSAxXG4gICAgICB9XG5cbiAgICAgIHRoaXMucyA9IFAuc1xuICAgICAgdGhpcy5uID0gUC5uIC8gYVxuICAgICAgdGhpcy5kID0gUC5kIC8gYVxuICAgIH1cblxuICAgIC8qKlxuICAgKiBCb29sZWFuIGdsb2JhbCB2YXJpYWJsZSB0byBiZSBhYmxlIHRvIGRpc2FibGUgYXV0b21hdGljIHJlZHVjdGlvbiBvZiB0aGUgZnJhY3Rpb25cbiAgICpcbiAgICovXG4gICAgRnJhY3Rpb24uUkVEVUNFID0gMVxuXG4gICAgRnJhY3Rpb24ucHJvdG90eXBlID0ge1xuXG4gICAgICBzOiAxLFxuICAgICAgbjogMCxcbiAgICAgIGQ6IDEsXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGFic29sdXRlIHZhbHVlXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKC00KS5hYnMoKSA9PiA0XG4gICAgICoqL1xuICAgICAgYWJzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24odGhpcy5uLCB0aGlzLmQpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBJbnZlcnRzIHRoZSBzaWduIG9mIHRoZSBjdXJyZW50IGZyYWN0aW9uXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKC00KS5uZWcoKSA9PiA0XG4gICAgICoqL1xuICAgICAgbmVnOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oLXRoaXMucyAqIHRoaXMubiwgdGhpcy5kKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQWRkcyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbih7bjogMiwgZDogM30pLmFkZChcIjE0LjlcIikgPT4gNDY3IC8gMzBcbiAgICAgKiovXG4gICAgICBhZGQ6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgdGhpcy5zICogdGhpcy5uICogUC5kICsgUC5zICogdGhpcy5kICogUC5uLFxuICAgICAgICAgIHRoaXMuZCAqIFAuZFxuICAgICAgICApXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBTdWJ0cmFjdHMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oe246IDIsIGQ6IDN9KS5hZGQoXCIxNC45XCIpID0+IC00MjcgLyAzMFxuICAgICAqKi9cbiAgICAgIHN1YjogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICB0aGlzLnMgKiB0aGlzLm4gKiBQLmQgLSBQLnMgKiB0aGlzLmQgKiBQLm4sXG4gICAgICAgICAgdGhpcy5kICogUC5kXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIE11bHRpcGxpZXMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCItMTcuKDM0NSlcIikubXVsKDMpID0+IDU3NzYgLyAxMTFcbiAgICAgKiovXG4gICAgICBtdWw6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgdGhpcy5zICogUC5zICogdGhpcy5uICogUC5uLFxuICAgICAgICAgIHRoaXMuZCAqIFAuZFxuICAgICAgICApXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBEaXZpZGVzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiLTE3LigzNDUpXCIpLmludmVyc2UoKS5kaXYoMylcbiAgICAgKiovXG4gICAgICBkaXY6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgdGhpcy5zICogUC5zICogdGhpcy5uICogUC5kLFxuICAgICAgICAgIHRoaXMuZCAqIFAublxuICAgICAgICApXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDbG9uZXMgdGhlIGFjdHVhbCBvYmplY3RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCItMTcuKDM0NSlcIikuY2xvbmUoKVxuICAgICAqKi9cbiAgICAgIGNsb25lOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24odGhpcylcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIG1vZHVsbyBvZiB0d28gcmF0aW9uYWwgbnVtYmVycyAtIGEgbW9yZSBwcmVjaXNlIGZtb2RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykubW9kKFs3LCA4XSkgPT4gKDEzLzMpICUgKDcvOCkgPSAoNS82KVxuICAgICAqKi9cbiAgICAgIG1vZDogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24odGhpcy5zICogdGhpcy5uICUgdGhpcy5kLCAxKVxuICAgICAgICB9XG5cbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgaWYgKFAubiA9PT0gMCAmJiB0aGlzLmQgPT09IDApIHtcbiAgICAgICAgICBGcmFjdGlvbigwLCAwKSAvLyBUaHJvdyBEaXZpc2lvbkJ5WmVyb1xuICAgICAgICB9XG5cbiAgICAgICAgLypcbiAgICAgICAqIEZpcnN0IHNpbGx5IGF0dGVtcHQsIGtpbmRhIHNsb3dcbiAgICAgICAqXG4gICAgICAgcmV0dXJuIHRoYXRbXCJzdWJcIl0oe1xuICAgICAgIFwiblwiOiBudW1bXCJuXCJdICogTWF0aC5mbG9vcigodGhpcy5uIC8gdGhpcy5kKSAvIChudW0ubiAvIG51bS5kKSksXG4gICAgICAgXCJkXCI6IG51bVtcImRcIl0sXG4gICAgICAgXCJzXCI6IHRoaXNbXCJzXCJdXG4gICAgICAgfSk7ICovXG5cbiAgICAgICAgLypcbiAgICAgICAqIE5ldyBhdHRlbXB0OiBhMSAvIGIxID0gYTIgLyBiMiAqIHEgKyByXG4gICAgICAgKiA9PiBiMiAqIGExID0gYTIgKiBiMSAqIHEgKyBiMSAqIGIyICogclxuICAgICAgICogPT4gKGIyICogYTEgJSBhMiAqIGIxKSAvIChiMSAqIGIyKVxuICAgICAgICovXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgdGhpcy5zICogKFAuZCAqIHRoaXMubikgJSAoUC5uICogdGhpcy5kKSxcbiAgICAgICAgICBQLmQgKiB0aGlzLmRcbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZnJhY3Rpb25hbCBnY2Qgb2YgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oNSw4KS5nY2QoMyw3KSA9PiAxLzU2XG4gICAgICovXG4gICAgICBnY2Q6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG5cbiAgICAgICAgLy8gZ2NkKGEgLyBiLCBjIC8gZCkgPSBnY2QoYSwgYykgLyBsY20oYiwgZClcblxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKGdjZChQLm4sIHRoaXMubikgKiBnY2QoUC5kLCB0aGlzLmQpLCBQLmQgKiB0aGlzLmQpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmcmFjdGlvbmFsIGxjbSBvZiB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbig1LDgpLmxjbSgzLDcpID0+IDE1XG4gICAgICovXG4gICAgICBsY206IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG5cbiAgICAgICAgLy8gbGNtKGEgLyBiLCBjIC8gZCkgPSBsY20oYSwgYykgLyBnY2QoYiwgZClcblxuICAgICAgICBpZiAoUC5uID09PSAwICYmIHRoaXMubiA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oUC5uICogdGhpcy5uLCBnY2QoUC5uLCB0aGlzLm4pICogZ2NkKFAuZCwgdGhpcy5kKSlcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGNlaWwgb2YgYSByYXRpb25hbCBudW1iZXJcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykuY2VpbCgpID0+ICg1IC8gMSlcbiAgICAgKiovXG4gICAgICBjZWlsOiBmdW5jdGlvbiAocGxhY2VzKSB7XG4gICAgICAgIHBsYWNlcyA9IE1hdGgucG93KDEwLCBwbGFjZXMgfHwgMClcblxuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLmNlaWwocGxhY2VzICogdGhpcy5zICogdGhpcy5uIC8gdGhpcy5kKSwgcGxhY2VzKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZmxvb3Igb2YgYSByYXRpb25hbCBudW1iZXJcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykuZmxvb3IoKSA9PiAoNCAvIDEpXG4gICAgICoqL1xuICAgICAgZmxvb3I6IGZ1bmN0aW9uIChwbGFjZXMpIHtcbiAgICAgICAgcGxhY2VzID0gTWF0aC5wb3coMTAsIHBsYWNlcyB8fCAwKVxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGguZmxvb3IocGxhY2VzICogdGhpcy5zICogdGhpcy5uIC8gdGhpcy5kKSwgcGxhY2VzKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogUm91bmRzIGEgcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5yb3VuZCgpID0+ICg0IC8gMSlcbiAgICAgKiovXG4gICAgICByb3VuZDogZnVuY3Rpb24gKHBsYWNlcykge1xuICAgICAgICBwbGFjZXMgPSBNYXRoLnBvdygxMCwgcGxhY2VzIHx8IDApXG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5yb3VuZChwbGFjZXMgKiB0aGlzLnMgKiB0aGlzLm4gLyB0aGlzLmQpLCBwbGFjZXMpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBpbnZlcnNlIG9mIHRoZSBmcmFjdGlvbiwgbWVhbnMgbnVtZXJhdG9yIGFuZCBkZW51bWVyYXRvciBhcmUgZXhjaGFuZ2VkXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFstMywgNF0pLmludmVyc2UoKSA9PiAtNCAvIDNcbiAgICAgKiovXG4gICAgICBpbnZlcnNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24odGhpcy5zICogdGhpcy5kLCB0aGlzLm4pXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmcmFjdGlvbiB0byBzb21lIGludGVnZXIgZXhwb25lbnRcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oLTEsMikucG93KC0zKSA9PiAtOFxuICAgICAqL1xuICAgICAgcG93OiBmdW5jdGlvbiAobSkge1xuICAgICAgICBpZiAobSA8IDApIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGgucG93KHRoaXMucyAqIHRoaXMuZCwgLW0pLCBNYXRoLnBvdyh0aGlzLm4sIC1tKSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGgucG93KHRoaXMucyAqIHRoaXMubiwgbSksIE1hdGgucG93KHRoaXMuZCwgbSkpXG4gICAgICAgIH1cbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHR3byByYXRpb25hbCBudW1iZXJzIGFyZSB0aGUgc2FtZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigxOS42KS5lcXVhbHMoWzk4LCA1XSk7XG4gICAgICoqL1xuICAgICAgZXF1YWxzOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gdGhpcy5zICogdGhpcy5uICogUC5kID09PSBQLnMgKiBQLm4gKiB0aGlzLmQgLy8gU2FtZSBhcyBjb21wYXJlKCkgPT09IDBcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHR3byByYXRpb25hbCBudW1iZXJzIGFyZSB0aGUgc2FtZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigxOS42KS5lcXVhbHMoWzk4LCA1XSk7XG4gICAgICoqL1xuICAgICAgY29tcGFyZTogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgdmFyIHQgPSAodGhpcy5zICogdGhpcy5uICogUC5kIC0gUC5zICogUC5uICogdGhpcy5kKVxuICAgICAgICByZXR1cm4gKHQgPiAwKSAtICh0IDwgMClcbiAgICAgIH0sXG5cbiAgICAgIHNpbXBsaWZ5OiBmdW5jdGlvbiAoZXBzKSB7XG4gICAgICAvLyBGaXJzdCBuYWl2ZSBpbXBsZW1lbnRhdGlvbiwgbmVlZHMgaW1wcm92ZW1lbnRcblxuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjb250ID0gdGhpcy5hYnMoKS50b0NvbnRpbnVlZCgpXG5cbiAgICAgICAgZXBzID0gZXBzIHx8IDAuMDAxXG5cbiAgICAgICAgZnVuY3Rpb24gcmVjIChhKSB7XG4gICAgICAgICAgaWYgKGEubGVuZ3RoID09PSAxKSB7IHJldHVybiBuZXcgRnJhY3Rpb24oYVswXSkgfVxuICAgICAgICAgIHJldHVybiByZWMoYS5zbGljZSgxKSkuaW52ZXJzZSgpLmFkZChhWzBdKVxuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb250Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdmFyIHRtcCA9IHJlYyhjb250LnNsaWNlKDAsIGkgKyAxKSlcbiAgICAgICAgICBpZiAodG1wLnN1Yih0aGlzLmFicygpKS5hYnMoKS52YWx1ZU9mKCkgPCBlcHMpIHtcbiAgICAgICAgICAgIHJldHVybiB0bXAubXVsKHRoaXMucylcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHR3byByYXRpb25hbCBudW1iZXJzIGFyZSBkaXZpc2libGVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oMTkuNikuZGl2aXNpYmxlKDEuNSk7XG4gICAgICovXG4gICAgICBkaXZpc2libGU6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiAhKCEoUC5uICogdGhpcy5kKSB8fCAoKHRoaXMubiAqIFAuZCkgJSAoUC5uICogdGhpcy5kKSkpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgZGVjaW1hbCByZXByZXNlbnRhdGlvbiBvZiB0aGUgZnJhY3Rpb25cbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxMDAuJzkxODIzJ1wiKS52YWx1ZU9mKCkgPT4gMTAwLjkxODIzOTE4MjM5MTgzXG4gICAgICoqL1xuICAgICAgdmFsdWVPZjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zICogdGhpcy5uIC8gdGhpcy5kXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgc3RyaW5nLWZyYWN0aW9uIHJlcHJlc2VudGF0aW9uIG9mIGEgRnJhY3Rpb24gb2JqZWN0XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiMS4nMydcIikudG9GcmFjdGlvbigpID0+IFwiNCAxLzNcIlxuICAgICAqKi9cbiAgICAgIHRvRnJhY3Rpb246IGZ1bmN0aW9uIChleGNsdWRlV2hvbGUpIHtcbiAgICAgICAgdmFyIHdob2xlOyB2YXIgc3RyID0gJydcbiAgICAgICAgdmFyIG4gPSB0aGlzLm5cbiAgICAgICAgdmFyIGQgPSB0aGlzLmRcbiAgICAgICAgaWYgKHRoaXMucyA8IDApIHtcbiAgICAgICAgICBzdHIgKz0gJy0nXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZCA9PT0gMSkge1xuICAgICAgICAgIHN0ciArPSBuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGV4Y2x1ZGVXaG9sZSAmJiAod2hvbGUgPSBNYXRoLmZsb29yKG4gLyBkKSkgPiAwKSB7XG4gICAgICAgICAgICBzdHIgKz0gd2hvbGVcbiAgICAgICAgICAgIHN0ciArPSAnICdcbiAgICAgICAgICAgIG4gJT0gZFxuICAgICAgICAgIH1cblxuICAgICAgICAgIHN0ciArPSBuXG4gICAgICAgICAgc3RyICs9ICcvJ1xuICAgICAgICAgIHN0ciArPSBkXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0clxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogUmV0dXJucyBhIGxhdGV4IHJlcHJlc2VudGF0aW9uIG9mIGEgRnJhY3Rpb24gb2JqZWN0XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiMS4nMydcIikudG9MYXRleCgpID0+IFwiXFxmcmFjezR9ezN9XCJcbiAgICAgKiovXG4gICAgICB0b0xhdGV4OiBmdW5jdGlvbiAoZXhjbHVkZVdob2xlKSB7XG4gICAgICAgIHZhciB3aG9sZTsgdmFyIHN0ciA9ICcnXG4gICAgICAgIHZhciBuID0gdGhpcy5uXG4gICAgICAgIHZhciBkID0gdGhpcy5kXG4gICAgICAgIGlmICh0aGlzLnMgPCAwKSB7XG4gICAgICAgICAgc3RyICs9ICctJ1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGQgPT09IDEpIHtcbiAgICAgICAgICBzdHIgKz0gblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChleGNsdWRlV2hvbGUgJiYgKHdob2xlID0gTWF0aC5mbG9vcihuIC8gZCkpID4gMCkge1xuICAgICAgICAgICAgc3RyICs9IHdob2xlXG4gICAgICAgICAgICBuICU9IGRcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzdHIgKz0gJ1xcXFxmcmFjeydcbiAgICAgICAgICBzdHIgKz0gblxuICAgICAgICAgIHN0ciArPSAnfXsnXG4gICAgICAgICAgc3RyICs9IGRcbiAgICAgICAgICBzdHIgKz0gJ30nXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0clxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogUmV0dXJucyBhbiBhcnJheSBvZiBjb250aW51ZWQgZnJhY3Rpb24gZWxlbWVudHNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCI3LzhcIikudG9Db250aW51ZWQoKSA9PiBbMCwxLDddXG4gICAgICovXG4gICAgICB0b0NvbnRpbnVlZDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdFxuICAgICAgICB2YXIgYSA9IHRoaXMublxuICAgICAgICB2YXIgYiA9IHRoaXMuZFxuICAgICAgICB2YXIgcmVzID0gW11cblxuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc1xuICAgICAgICB9XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgIHJlcy5wdXNoKE1hdGguZmxvb3IoYSAvIGIpKVxuICAgICAgICAgIHQgPSBhICUgYlxuICAgICAgICAgIGEgPSBiXG4gICAgICAgICAgYiA9IHRcbiAgICAgICAgfSB3aGlsZSAoYSAhPT0gMSlcblxuICAgICAgICByZXR1cm4gcmVzXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGEgZnJhY3Rpb24gd2l0aCBhbGwgZGlnaXRzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiMTAwLic5MTgyMydcIikudG9TdHJpbmcoKSA9PiBcIjEwMC4oOTE4MjMpXCJcbiAgICAgKiovXG4gICAgICB0b1N0cmluZzogZnVuY3Rpb24gKGRlYykge1xuICAgICAgICB2YXIgZ1xuICAgICAgICB2YXIgTiA9IHRoaXMublxuICAgICAgICB2YXIgRCA9IHRoaXMuZFxuXG4gICAgICAgIGlmIChpc05hTihOKSB8fCBpc05hTihEKSkge1xuICAgICAgICAgIHJldHVybiAnTmFOJ1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFGcmFjdGlvbi5SRURVQ0UpIHtcbiAgICAgICAgICBnID0gZ2NkKE4sIEQpXG4gICAgICAgICAgTiAvPSBnXG4gICAgICAgICAgRCAvPSBnXG4gICAgICAgIH1cblxuICAgICAgICBkZWMgPSBkZWMgfHwgMTUgLy8gMTUgPSBkZWNpbWFsIHBsYWNlcyB3aGVuIG5vIHJlcGl0YXRpb25cblxuICAgICAgICB2YXIgY3ljTGVuID0gY3ljbGVMZW4oTiwgRCkgLy8gQ3ljbGUgbGVuZ3RoXG4gICAgICAgIHZhciBjeWNPZmYgPSBjeWNsZVN0YXJ0KE4sIEQsIGN5Y0xlbikgLy8gQ3ljbGUgc3RhcnRcblxuICAgICAgICB2YXIgc3RyID0gdGhpcy5zID09PSAtMSA/ICctJyA6ICcnXG5cbiAgICAgICAgc3RyICs9IE4gLyBEIHwgMFxuXG4gICAgICAgIE4gJT0gRFxuICAgICAgICBOICo9IDEwXG5cbiAgICAgICAgaWYgKE4pIHsgc3RyICs9ICcuJyB9XG5cbiAgICAgICAgaWYgKGN5Y0xlbikge1xuICAgICAgICAgIGZvciAodmFyIGkgPSBjeWNPZmY7IGktLTspIHtcbiAgICAgICAgICAgIHN0ciArPSBOIC8gRCB8IDBcbiAgICAgICAgICAgIE4gJT0gRFxuICAgICAgICAgICAgTiAqPSAxMFxuICAgICAgICAgIH1cbiAgICAgICAgICBzdHIgKz0gJygnXG4gICAgICAgICAgZm9yICh2YXIgaSA9IGN5Y0xlbjsgaS0tOykge1xuICAgICAgICAgICAgc3RyICs9IE4gLyBEIHwgMFxuICAgICAgICAgICAgTiAlPSBEXG4gICAgICAgICAgICBOICo9IDEwXG4gICAgICAgICAgfVxuICAgICAgICAgIHN0ciArPSAnKSdcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gZGVjOyBOICYmIGktLTspIHtcbiAgICAgICAgICAgIHN0ciArPSBOIC8gRCB8IDBcbiAgICAgICAgICAgIE4gJT0gRFxuICAgICAgICAgICAgTiAqPSAxMFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RyXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB1bmRlZmluZWQgPT09ICdmdW5jdGlvbicgJiYgdW5kZWZpbmVkLmFtZCkge1xuICAgICAgdW5kZWZpbmVkKFtdLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBGcmFjdGlvblxuICAgICAgfSlcbiAgICB9IGVsc2UgaWYgKCdvYmplY3QnID09PSAnb2JqZWN0Jykge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KVxuICAgICAgRnJhY3Rpb24uZGVmYXVsdCA9IEZyYWN0aW9uXG4gICAgICBGcmFjdGlvbi5GcmFjdGlvbiA9IEZyYWN0aW9uXG4gICAgICBtb2R1bGUuZXhwb3J0cyA9IEZyYWN0aW9uXG4gICAgfSBlbHNlIHtcbiAgICAgIHJvb3QuRnJhY3Rpb24gPSBGcmFjdGlvblxuICAgIH1cbiAgfSkoY29tbW9uanNIZWxwZXJzLmNvbW1vbmpzR2xvYmFsKVxufSlcblxuZXhwb3J0IGRlZmF1bHQgLyogQF9fUFVSRV9fICovY29tbW9uanNIZWxwZXJzLmdldERlZmF1bHRFeHBvcnRGcm9tQ2pzKGZyYWN0aW9uKVxuZXhwb3J0IHsgZnJhY3Rpb24gYXMgX19tb2R1bGVFeHBvcnRzIH1cbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIE1vbm9taWFsIHtcbiAgY29uc3RydWN0b3IgKGMsIHZzKSB7XG4gICAgaWYgKCFpc05hTihjKSAmJiB2cyBpbnN0YW5jZW9mIE1hcCkge1xuICAgICAgdGhpcy5jID0gY1xuICAgICAgdGhpcy52cyA9IHZzXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgYyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuaW5pdFN0cihjKVxuICAgIH0gZWxzZSBpZiAoIWlzTmFOKGMpKSB7XG4gICAgICB0aGlzLmMgPSBjXG4gICAgICB0aGlzLnZzID0gbmV3IE1hcCgpXG4gICAgfSBlbHNlIHsgLy8gZGVmYXVsdCBhcyBhIHRlc3Q6IDR4XjJ5XG4gICAgICB0aGlzLmMgPSA0XG4gICAgICB0aGlzLnZzID0gbmV3IE1hcChbWyd4JywgMl0sIFsneScsIDFdXSlcbiAgICB9XG4gIH1cblxuICBjbG9uZSAoKSB7XG4gICAgY29uc3QgdnMgPSBuZXcgTWFwKHRoaXMudnMpXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbCh0aGlzLmMsIHZzKVxuICB9XG5cbiAgbXVsICh0aGF0KSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIE1vbm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBNb25vbWlhbCh0aGF0KVxuICAgIH1cbiAgICBjb25zdCBjID0gdGhpcy5jICogdGhhdC5jXG4gICAgbGV0IHZzID0gbmV3IE1hcCgpXG4gICAgdGhpcy52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICh0aGF0LnZzLmhhcyh2YXJpYWJsZSkpIHtcbiAgICAgICAgdnMuc2V0KHZhcmlhYmxlLCB0aGlzLnZzLmdldCh2YXJpYWJsZSkgKyB0aGF0LnZzLmdldCh2YXJpYWJsZSkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2cy5zZXQodmFyaWFibGUsIHRoaXMudnMuZ2V0KHZhcmlhYmxlKSlcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhhdC52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICghdnMuaGFzKHZhcmlhYmxlKSkge1xuICAgICAgICB2cy5zZXQodmFyaWFibGUsIHRoYXQudnMuZ2V0KHZhcmlhYmxlKSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHZzID0gbmV3IE1hcChbLi4udnMuZW50cmllcygpXS5zb3J0KCkpXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbChjLCB2cylcbiAgfVxuXG4gIHRvTGF0ZXggKCkge1xuICAgIGlmICh0aGlzLnZzLnNpemUgPT09IDApIHJldHVybiB0aGlzLmMudG9TdHJpbmcoKVxuICAgIGxldCBzdHIgPSB0aGlzLmMgPT09IDEgPyAnJ1xuICAgICAgOiB0aGlzLmMgPT09IC0xID8gJy0nXG4gICAgICAgIDogdGhpcy5jLnRvU3RyaW5nKClcbiAgICB0aGlzLnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKGluZGV4ID09PSAxKSB7XG4gICAgICAgIHN0ciArPSB2YXJpYWJsZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyICs9IHZhcmlhYmxlICsgJ14nICsgaW5kZXhcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBzdHJcbiAgfVxuXG4gIHNvcnQgKCkge1xuICAgIC8vIHNvcnRzIChtb2RpZmllcyBvYmplY3QpXG4gICAgdGhpcy52cyA9IG5ldyBNYXAoWy4uLnRoaXMudnMuZW50cmllcygpXS5zb3J0KCkpXG4gIH1cblxuICBjbGVhblplcm9zICgpIHtcbiAgICB0aGlzLnZzLmZvckVhY2goKGlkeCwgdikgPT4ge1xuICAgICAgaWYgKGlkeCA9PT0gMCkgdGhpcy52cy5kZWxldGUodilcbiAgICB9KVxuICB9XG5cbiAgbGlrZSAodGhhdCkge1xuICAgIC8vIHJldHVybiB0cnVlIGlmIGxpa2UgdGVybXMsIGZhbHNlIGlmIG90aGVyd2lzZVxuICAgIC8vIG5vdCB0aGUgbW9zdCBlZmZpY2llbnQgYXQgdGhlIG1vbWVudCwgYnV0IGdvb2QgZW5vdWdoLlxuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgTW9ub21pYWwodGhhdClcbiAgICB9XG5cbiAgICBsZXQgbGlrZSA9IHRydWVcbiAgICB0aGlzLnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKCF0aGF0LnZzLmhhcyh2YXJpYWJsZSkgfHwgdGhhdC52cy5nZXQodmFyaWFibGUpICE9PSBpbmRleCkge1xuICAgICAgICBsaWtlID0gZmFsc2VcbiAgICAgIH1cbiAgICB9KVxuICAgIHRoYXQudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAoIXRoaXMudnMuaGFzKHZhcmlhYmxlKSB8fCB0aGlzLnZzLmdldCh2YXJpYWJsZSkgIT09IGluZGV4KSB7XG4gICAgICAgIGxpa2UgPSBmYWxzZVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGxpa2VcbiAgfVxuXG4gIGFkZCAodGhhdCwgY2hlY2tMaWtlKSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIE1vbm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBNb25vbWlhbCh0aGF0KVxuICAgIH1cbiAgICAvLyBhZGRzIHR3byBjb21wYXRpYmxlIG1vbm9taWFsc1xuICAgIC8vIGNoZWNrTGlrZSAoZGVmYXVsdCB0cnVlKSB3aWxsIGNoZWNrIGZpcnN0IGlmIHRoZXkgYXJlIGxpa2UgYW5kIHRocm93IGFuIGV4Y2VwdGlvblxuICAgIC8vIHVuZGVmaW5lZCBiZWhhdmlvdXIgaWYgY2hlY2tMaWtlIGlzIGZhbHNlXG4gICAgaWYgKGNoZWNrTGlrZSA9PT0gdW5kZWZpbmVkKSBjaGVja0xpa2UgPSB0cnVlXG4gICAgaWYgKGNoZWNrTGlrZSAmJiAhdGhpcy5saWtlKHRoYXQpKSB0aHJvdyBuZXcgRXJyb3IoJ0FkZGluZyB1bmxpa2UgdGVybXMnKVxuICAgIGNvbnN0IGMgPSB0aGlzLmMgKyB0aGF0LmNcbiAgICBjb25zdCB2cyA9IHRoaXMudnNcbiAgICByZXR1cm4gbmV3IE1vbm9taWFsKGMsIHZzKVxuICB9XG5cbiAgaW5pdFN0ciAoc3RyKSB7XG4gICAgLy8gY3VycmVudGx5IG5vIGVycm9yIGNoZWNraW5nIGFuZCBmcmFnaWxlXG4gICAgLy8gVGhpbmdzIG5vdCB0byBwYXNzIGluOlxuICAgIC8vICB6ZXJvIGluZGljZXNcbiAgICAvLyAgbXVsdGktY2hhcmFjdGVyIHZhcmlhYmxlc1xuICAgIC8vICBuZWdhdGl2ZSBpbmRpY2VzXG4gICAgLy8gIG5vbi1pbnRlZ2VyIGNvZWZmaWNpZW50c1xuICAgIGNvbnN0IGxlYWQgPSBzdHIubWF0Y2goL14tP1xcZCovKVswXVxuICAgIGNvbnN0IGMgPSBsZWFkID09PSAnJyA/IDFcbiAgICAgIDogbGVhZCA9PT0gJy0nID8gLTFcbiAgICAgICAgOiBwYXJzZUludChsZWFkKVxuICAgIGxldCB2cyA9IHN0ci5tYXRjaCgvKFthLXpBLVpdKShcXF5cXGQrKT8vZylcbiAgICBpZiAoIXZzKSB2cyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgdiA9IHZzW2ldLnNwbGl0KCdeJylcbiAgICAgIHZbMV0gPSB2WzFdID8gcGFyc2VJbnQodlsxXSkgOiAxXG4gICAgICB2c1tpXSA9IHZcbiAgICB9XG4gICAgdnMgPSB2cy5maWx0ZXIodiA9PiB2WzFdICE9PSAwKVxuICAgIHRoaXMuYyA9IGNcbiAgICB0aGlzLnZzID0gbmV3IE1hcCh2cylcbiAgfVxuXG4gIHN0YXRpYyB2YXIgKHYpIHtcbiAgICAvLyBmYWN0b3J5IGZvciBhIHNpbmdsZSB2YXJpYWJsZSBtb25vbWlhbFxuICAgIGNvbnN0IGMgPSAxXG4gICAgY29uc3QgdnMgPSBuZXcgTWFwKFtbdiwgMV1dKVxuICAgIHJldHVybiBuZXcgTW9ub21pYWwoYywgdnMpXG4gIH1cbn1cbiIsImltcG9ydCBNb25vbWlhbCBmcm9tICdNb25vbWlhbCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUG9seW5vbWlhbCB7XG4gIGNvbnN0cnVjdG9yICh0ZXJtcykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHRlcm1zKSAmJiAodGVybXNbMF0gaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRlcm1zLm1hcCh0ID0+IHQuY2xvbmUoKSlcbiAgICAgIHRoaXMudGVybXMgPSB0ZXJtc1xuICAgIH0gZWxzZSBpZiAoIWlzTmFOKHRlcm1zKSkge1xuICAgICAgdGhpcy5pbml0TnVtKHRlcm1zKVxuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRlcm1zID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5pbml0U3RyKHRlcm1zKVxuICAgIH1cbiAgfVxuXG4gIGluaXRTdHIgKHN0cikge1xuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9cXCstL2csICctJykgLy8gYSBob3JyaWJsZSBib2RnZVxuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC8tL2csICcrLScpIC8vIG1ha2UgbmVnYXRpdmUgdGVybXMgZXhwbGljaXQuXG4gICAgc3RyID0gc3RyLnJlcGxhY2UoL1xccy9nLCAnJykgLy8gc3RyaXAgd2hpdGVzcGFjZVxuICAgIHRoaXMudGVybXMgPSBzdHIuc3BsaXQoJysnKVxuICAgICAgLm1hcChzID0+IG5ldyBNb25vbWlhbChzKSlcbiAgICAgIC5maWx0ZXIodCA9PiB0LmMgIT09IDApXG4gIH1cblxuICBpbml0TnVtIChuKSB7XG4gICAgdGhpcy50ZXJtcyA9IFtuZXcgTW9ub21pYWwobildXG4gIH1cblxuICB0b0xhdGV4ICgpIHtcbiAgICBsZXQgc3RyID0gJydcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGVybXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChpID4gMCAmJiB0aGlzLnRlcm1zW2ldLmMgPj0gMCkge1xuICAgICAgICBzdHIgKz0gJysnXG4gICAgICB9XG4gICAgICBzdHIgKz0gdGhpcy50ZXJtc1tpXS50b0xhdGV4KClcbiAgICB9XG4gICAgcmV0dXJuIHN0clxuICB9XG5cbiAgdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiB0aGlzLnRvTGFUZVgoKVxuICB9XG5cbiAgY2xvbmUgKCkge1xuICAgIGNvbnN0IHRlcm1zID0gdGhpcy50ZXJtcy5tYXAodCA9PiB0LmNsb25lKCkpXG4gICAgcmV0dXJuIG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuICB9XG5cbiAgc2ltcGxpZnkgKCkge1xuICAgIC8vIGNvbGxlY3RzIGxpa2UgdGVybXMgYW5kIHJlbW92ZXMgemVybyB0ZXJtc1xuICAgIC8vIGRvZXMgbm90IG1vZGlmeSBvcmlnaW5hbFxuICAgIC8vIFRoaXMgc2VlbXMgcHJvYmFibHkgaW5lZmZpY2llbnQsIGdpdmVuIHRoZSBkYXRhIHN0cnVjdHVyZVxuICAgIC8vIFdvdWxkIGJlIGJldHRlciB0byB1c2Ugc29tZXRoaW5nIGxpa2UgYSBsaW5rZWQgbGlzdCBtYXliZT9cbiAgICBjb25zdCB0ZXJtcyA9IHRoaXMudGVybXMuc2xpY2UoKVxuICAgIGxldCBuZXd0ZXJtcyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0ZXJtcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCF0ZXJtc1tpXSkgY29udGludWVcbiAgICAgIGxldCBuZXd0ZXJtID0gdGVybXNbaV1cbiAgICAgIGZvciAobGV0IGogPSBpICsgMTsgaiA8IHRlcm1zLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmICghdGVybXNbal0pIGNvbnRpbnVlXG4gICAgICAgIGlmICh0ZXJtc1tqXS5saWtlKHRlcm1zW2ldKSkge1xuICAgICAgICAgIG5ld3Rlcm0gPSBuZXd0ZXJtLmFkZCh0ZXJtc1tqXSlcbiAgICAgICAgICB0ZXJtc1tqXSA9IG51bGxcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbmV3dGVybXMucHVzaChuZXd0ZXJtKVxuICAgICAgdGVybXNbaV0gPSBudWxsXG4gICAgfVxuICAgIG5ld3Rlcm1zID0gbmV3dGVybXMuZmlsdGVyKHQgPT4gdC5jICE9PSAwKVxuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbChuZXd0ZXJtcylcbiAgfVxuXG4gIGFkZCAodGhhdCwgc2ltcGxpZnkpIHtcbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgUG9seW5vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgUG9seW5vbWlhbCh0aGF0KVxuICAgIH1cbiAgICBpZiAoc2ltcGxpZnkgPT09IHVuZGVmaW5lZCkgc2ltcGxpZnkgPSB0cnVlXG4gICAgY29uc3QgdGVybXMgPSB0aGlzLnRlcm1zLmNvbmNhdCh0aGF0LnRlcm1zKVxuICAgIGxldCByZXN1bHQgPSBuZXcgUG9seW5vbWlhbCh0ZXJtcylcblxuICAgIGlmIChzaW1wbGlmeSkgcmVzdWx0ID0gcmVzdWx0LnNpbXBsaWZ5KClcblxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIG11bCAodGhhdCwgc2ltcGxpZnkpIHtcbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgUG9seW5vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgUG9seW5vbWlhbCh0aGF0KVxuICAgIH1cbiAgICBjb25zdCB0ZXJtcyA9IFtdXG4gICAgaWYgKHNpbXBsaWZ5ID09PSB1bmRlZmluZWQpIHNpbXBsaWZ5ID0gdHJ1ZVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50ZXJtcy5sZW5ndGg7IGkrKykge1xuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB0aGF0LnRlcm1zLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHRlcm1zLnB1c2godGhpcy50ZXJtc1tpXS5tdWwodGhhdC50ZXJtc1tqXSkpXG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IHJlc3VsdCA9IG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuICAgIGlmIChzaW1wbGlmeSkgcmVzdWx0ID0gcmVzdWx0LnNpbXBsaWZ5KClcblxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIHBvdyAobiwgc2ltcGxpZnkpIHtcbiAgICBsZXQgcmVzdWx0ID0gdGhpc1xuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbjsgaSsrKSB7XG4gICAgICByZXN1bHQgPSByZXN1bHQubXVsKHRoaXMpXG4gICAgfVxuICAgIGlmIChzaW1wbGlmeSkgcmVzdWx0ID0gcmVzdWx0LnNpbXBsaWZ5KClcbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICBzdGF0aWMgdmFyICh2KSB7XG4gICAgLy8gZmFjdG9yeSBmb3IgYSBzaW5nbGUgdmFyaWFibGUgcG9seW5vbWlhbFxuICAgIGNvbnN0IHRlcm1zID0gW01vbm9taWFsLnZhcih2KV1cbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwodGVybXMpXG4gIH1cblxuICBzdGF0aWMgeCAoKSB7XG4gICAgcmV0dXJuIFBvbHlub21pYWwudmFyKCd4JylcbiAgfVxuXG4gIHN0YXRpYyBjb25zdCAobikge1xuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbChuKVxuICB9XG59XG4iLCJpbXBvcnQgeyBHcmFwaGljUSwgR3JhcGhpY1FWaWV3IH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgRnJhY3Rpb24gZnJvbSAndmVuZG9yL2ZyYWN0aW9uJ1xuaW1wb3J0IFBvbHlub21pYWwgZnJvbSAnUG9seW5vbWlhbCdcbmltcG9ydCB7IHJhbmRFbGVtLCByYW5kQmV0d2VlbiwgcmFuZEJldHdlZW5GaWx0ZXIsIGdjZCB9IGZyb20gJ1V0aWxpdGllcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXJpdGhtYWdvblEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucykgLy8gcHJvY2Vzc2VzIG9wdGlvbnMgaW50byB0aGlzLnNldHRpbmdzXG4gICAgdGhpcy5kYXRhID0gbmV3IEFyaXRobWFnb25RRGF0YSh0aGlzLnNldHRpbmdzKVxuICAgIHRoaXMudmlldyA9IG5ldyBBcml0aG1hZ29uUVZpZXcodGhpcy5kYXRhLCB0aGlzLnNldHRpbmdzKVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7IHJldHVybiAnQ29tcGxldGUgdGhlIGFyaXRobWFnb246JyB9XG59XG5cbkFyaXRobWFnb25RLm9wdGlvbnNTcGVjID0gW1xuICB7XG4gICAgdGl0bGU6ICdWZXJ0aWNlcycsXG4gICAgaWQ6ICduJyxcbiAgICB0eXBlOiAnaW50JyxcbiAgICBtaW46IDMsXG4gICAgbWF4OiAyMCxcbiAgICBkZWZhdWx0OiAzXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1R5cGUnLFxuICAgIGlkOiAndHlwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1leGNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdJbnRlZ2VyICgrKScsIGlkOiAnaW50ZWdlci1hZGQnIH0sXG4gICAgICB7IHRpdGxlOiAnSW50ZWdlciAoXFx1MDBkNyknLCBpZDogJ2ludGVnZXItbXVsdGlwbHknIH0sXG4gICAgICB7IHRpdGxlOiAnRnJhY3Rpb24gKCspJywgaWQ6ICdmcmFjdGlvbi1hZGQnIH0sXG4gICAgICB7IHRpdGxlOiAnRnJhY3Rpb24gKFxcdTAwZDcpJywgaWQ6ICdmcmFjdGlvbi1tdWx0aXBseScgfSxcbiAgICAgIHsgdGl0bGU6ICdBbGdlYnJhICgrKScsIGlkOiAnYWxnZWJyYS1hZGQnIH0sXG4gICAgICB7IHRpdGxlOiAnQWxnZWJyYSAoXFx1MDBkNyknLCBpZDogJ2FsZ2VicmEtbXVsdGlwbHknIH1cbiAgICBdLFxuICAgIGRlZmF1bHQ6ICdpbnRlZ2VyLWFkZCcsXG4gICAgdmVydGljYWw6IHRydWVcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnUHV6emxlIHR5cGUnLFxuICAgIHR5cGU6ICdzZWxlY3QtZXhjbHVzaXZlJyxcbiAgICBpZDogJ3B1el9kaWZmJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICB7IHRpdGxlOiAnTWlzc2luZyBlZGdlcycsIGlkOiAnMScgfSxcbiAgICAgIHsgdGl0bGU6ICdNaXhlZCcsIGlkOiAnMicgfSxcbiAgICAgIHsgdGl0bGU6ICdNaXNzaW5nIHZlcnRpY2VzJywgaWQ6ICczJyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiAnMSdcbiAgfVxuXVxuXG5jbGFzcyBBcml0aG1hZ29uUURhdGEgLyogZXh0ZW5kcyBHcmFwaGljUURhdGEgKi8ge1xuICAvLyBUT0RPIHNpbXBsaWZ5IGNvbnN0cnVjdG9yLiBNb3ZlIGxvZ2ljIGludG8gc3RhdGljIGZhY3RvcnkgbWV0aG9kc1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIC8vIDEuIFNldCBwcm9wZXJ0aWVzIGZyb20gb3B0aW9uc1xuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgbjogMywgLy8gbnVtYmVyIG9mIHZlcnRpY2VzXG4gICAgICBtaW46IC0yMCxcbiAgICAgIG1heDogMjAsXG4gICAgICBudW1fZGlmZjogMSwgLy8gY29tcGxleGl0eSBvZiB3aGF0J3MgaW4gdmVydGljZXMvZWRnZXNcbiAgICAgIHB1el9kaWZmOiAxLCAvLyAxIC0gVmVydGljZXMgZ2l2ZW4sIDIgLSB2ZXJ0aWNlcy9lZGdlczsgZ2l2ZW4gMyAtIG9ubHkgZWRnZXNcbiAgICAgIHR5cGU6ICdpbnRlZ2VyLWFkZCcgLy8gW3R5cGVdLVtvcGVyYXRpb25dIHdoZXJlIFt0eXBlXSA9IGludGVnZXIsIC4uLlxuICAgICAgLy8gYW5kIFtvcGVyYXRpb25dID0gYWRkL211bHRpcGx5XG4gICAgfVxuXG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCB0aGlzLnNldHRpbmdzLCBvcHRpb25zKVxuICAgIHRoaXMuc2V0dGluZ3MubnVtX2RpZmYgPSB0aGlzLnNldHRpbmdzLmRpZmZpY3VsdHlcbiAgICB0aGlzLnNldHRpbmdzLnB1el9kaWZmID0gcGFyc2VJbnQodGhpcy5zZXR0aW5ncy5wdXpfZGlmZikgLy8hID8gVGhpcyBzaG91bGQgaGF2ZSBiZWVuIGRvbmUgdXBzdHJlYW0uLi5cblxuICAgIHRoaXMubiA9IHRoaXMuc2V0dGluZ3MublxuICAgIHRoaXMudmVydGljZXMgPSBbXVxuICAgIHRoaXMuc2lkZXMgPSBbXVxuXG4gICAgaWYgKHRoaXMuc2V0dGluZ3MudHlwZS5lbmRzV2l0aCgnYWRkJykpIHtcbiAgICAgIHRoaXMub3BuYW1lID0gJysnXG4gICAgICB0aGlzLm9wID0gKHgsIHkpID0+IHguYWRkKHkpXG4gICAgfSBlbHNlIGlmICh0aGlzLnNldHRpbmdzLnR5cGUuZW5kc1dpdGgoJ211bHRpcGx5JykpIHtcbiAgICAgIHRoaXMub3BuYW1lID0gJ1xcdTAwZDcnXG4gICAgICB0aGlzLm9wID0gKHgsIHkpID0+IHgubXVsKHkpXG4gICAgfVxuXG4gICAgLy8gMi4gSW5pdGlhbGlzZSBiYXNlZCBvbiB0eXBlXG4gICAgc3dpdGNoICh0aGlzLnNldHRpbmdzLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2ludGVnZXItYWRkJzpcbiAgICAgIGNhc2UgJ2ludGVnZXItbXVsdGlwbHknOlxuICAgICAgICB0aGlzLmluaXRJbnRlZ2VyKHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdmcmFjdGlvbi1hZGQnOlxuICAgICAgICB0aGlzLmluaXRGcmFjdGlvbkFkZCh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnZnJhY3Rpb24tbXVsdGlwbHknOlxuICAgICAgICB0aGlzLmluaXRGcmFjdGlvbk11bHRpcGx5KHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdhbGdlYnJhLWFkZCc6XG4gICAgICAgIHRoaXMuaW5pdEFsZ2VicmFBZGQodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2FsZ2VicmEtbXVsdGlwbHknOlxuICAgICAgICB0aGlzLmluaXRBbGdlYnJhTXVsdGlwbHkodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5leHBlY3RlZCBzd2l0Y2ggZGVmYXVsdCcpXG4gICAgfVxuXG4gICAgdGhpcy5jYWxjdWxhdGVFZGdlcygpIC8vIFVzZSBvcCBmdW5jdGlvbnMgdG8gZmlsbCBpbiB0aGUgZWRnZXNcbiAgICB0aGlzLmhpZGVMYWJlbHModGhpcy5zZXR0aW5ncy5wdXpfZGlmZikgLy8gc2V0IHNvbWUgdmVydGljZXMvZWRnZXMgYXMgaGlkZGVuIGRlcGVuZGluZyBvbiBkaWZmaWN1bHR5XG4gIH1cblxuICAvKiBNZXRob2RzIGluaXRpYWxpc2luZyB2ZXJ0aWNlcyAqL1xuXG4gIGluaXRJbnRlZ2VyIChzZXR0aW5ncykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgIHZhbDogbmV3IEZyYWN0aW9uKHJhbmRCZXR3ZWVuRmlsdGVyKFxuICAgICAgICAgIHNldHRpbmdzLm1pbixcbiAgICAgICAgICBzZXR0aW5ncy5tYXgsXG4gICAgICAgICAgeCA9PiAoc2V0dGluZ3MudHlwZS5lbmRzV2l0aCgnYWRkJykgfHwgeCAhPT0gMClcbiAgICAgICAgKSksXG4gICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0RnJhY3Rpb25BZGQgKHNldHRpbmdzKSB7XG4gICAgLyogRGlmZmljdWx0eSBzZXR0aW5nczpcbiAgICAgKiAxOiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggc2FtZSBkZW5vbWluYXRvciwgbm8gY2FuY2VsbGluZyBhZnRlciBET05FXG4gICAgICogMjogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIHNhbWUgZGVub21pbmF0b3IsIG5vIGNhbmNlbGxsaW5nIGFuc3dlciBpbXByb3BlciBmcmFjdGlvblxuICAgICAqIDM6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBvbmUgZGVub21pbmF0b3IgYSBtdWx0aXBsZSBvZiBhbm90aGVyLCBnaXZlcyBwcm9wZXIgZnJhY3Rpb25cbiAgICAgKiA0OiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggb25lIGRlbm9taW5hdG9yIGEgbXVsdGlwbGUgb2YgYW5vdGhlciwgZ2l2ZXMgaW1wcm9wZXIgZnJhY3Rpb25cbiAgICAgKiA1OiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggZGlmZmVyZW50IGRlbm9taW5hdG9ycyAobm90IGNvLXByaW1lKSwgZ2l2ZXMgaW1wcm9wZXIgZnJhY3Rpb25cbiAgICAgKiA2OiBtaXhlZCBudW1iZXJzXG4gICAgICogNzogbWl4ZWQgbnVtYmVycywgYmlnZ2VyIG51bWVyYXRvcnMgYW5kIGRlbm9taW5hdG9yc1xuICAgICAqIDg6IG1peGVkIG51bWJlcnMsIGJpZyBpbnRlZ2VyIHBhcnRzXG4gICAgICovXG5cbiAgICAvLyBUT0RPIC0gYW55dGhpbmcgb3RoZXIgdGhhbiBkaWZmaWN1bHR5IDEuXG4gICAgY29uc3QgZGlmZiA9IHNldHRpbmdzLm51bV9kaWZmXG4gICAgaWYgKGRpZmYgPCAzKSB7XG4gICAgICBjb25zdCBkZW4gPSByYW5kRWxlbShbNSwgNywgOSwgMTEsIDEzLCAxN10pXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHByZXZudW0gPSB0aGlzLnZlcnRpY2VzW2kgLSAxXVxuICAgICAgICAgID8gdGhpcy52ZXJ0aWNlc1tpIC0gMV0udmFsLm4gOiB1bmRlZmluZWRcbiAgICAgICAgY29uc3QgbmV4dG51bSA9IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl0udmFsLm4gOiB1bmRlZmluZWRcblxuICAgICAgICBjb25zdCBtYXhudW0gPVxuICAgICAgICAgIGRpZmYgPT09IDIgPyBkZW4gLSAxXG4gICAgICAgICAgICA6IG5leHRudW0gPyBkZW4gLSBNYXRoLm1heChuZXh0bnVtLCBwcmV2bnVtKVxuICAgICAgICAgICAgICA6IHByZXZudW0gPyBkZW4gLSBwcmV2bnVtXG4gICAgICAgICAgICAgICAgOiBkZW4gLSAxXG5cbiAgICAgICAgY29uc3QgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoMSwgbWF4bnVtLCB4ID0+IChcbiAgICAgICAgICAvLyBFbnN1cmVzIG5vIHNpbXBsaWZpbmcgYWZ0ZXJ3YXJkcyBpZiBkaWZmaWN1bHR5IGlzIDFcbiAgICAgICAgICBnY2QoeCwgZGVuKSA9PT0gMSAmJlxuICAgICAgICAgICghcHJldm51bSB8fCBnY2QoeCArIHByZXZudW0sIGRlbikgPT09IDEgfHwgeCArIHByZXZudW0gPT09IGRlbikgJiZcbiAgICAgICAgICAoIW5leHRudW0gfHwgZ2NkKHggKyBuZXh0bnVtLCBkZW4pID09PSAxIHx8IHggKyBuZXh0bnVtID09PSBkZW4pXG4gICAgICAgICkpXG5cbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihudW0sIGRlbiksXG4gICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGRlbmJhc2UgPSByYW5kRWxlbShcbiAgICAgICAgZGlmZiA8IDcgPyBbMiwgMywgNV0gOiBbMiwgMywgNCwgNSwgNiwgNywgOCwgOSwgMTAsIDExXVxuICAgICAgKVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICBjb25zdCBwcmV2ID0gdGhpcy52ZXJ0aWNlc1tpIC0gMV1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbaSAtIDFdLnZhbCA6IHVuZGVmaW5lZFxuICAgICAgICBjb25zdCBuZXh0ID0gdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXVxuICAgICAgICAgID8gdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXS52YWwgOiB1bmRlZmluZWRcblxuICAgICAgICBjb25zdCBtYXhtdWx0aXBsaWVyID0gZGlmZiA8IDcgPyA0IDogOFxuXG4gICAgICAgIGNvbnN0IG11bHRpcGxpZXIgPVxuICAgICAgICAgIGkgJSAyID09PSAxIHx8IGRpZmYgPiA0ID8gcmFuZEJldHdlZW5GaWx0ZXIoMiwgbWF4bXVsdGlwbGllciwgeCA9PlxuICAgICAgICAgICAgKCFwcmV2IHx8IHggIT09IHByZXYuZCAvIGRlbmJhc2UpICYmXG4gICAgICAgICAgICAoIW5leHQgfHwgeCAhPT0gbmV4dC5kIC8gZGVuYmFzZSlcbiAgICAgICAgICApIDogMVxuXG4gICAgICAgIGNvbnN0IGRlbiA9IGRlbmJhc2UgKiBtdWx0aXBsaWVyXG5cbiAgICAgICAgbGV0IG51bVxuICAgICAgICBpZiAoZGlmZiA8IDYpIHtcbiAgICAgICAgICBudW0gPSByYW5kQmV0d2VlbkZpbHRlcigxLCBkZW4gLSAxLCB4ID0+IChcbiAgICAgICAgICAgIGdjZCh4LCBkZW4pID09PSAxICYmXG4gICAgICAgICAgICAoZGlmZiA+PSA0IHx8ICFwcmV2IHx8IHByZXYuYWRkKHgsIGRlbikgPD0gMSkgJiZcbiAgICAgICAgICAgIChkaWZmID49IDQgfHwgIW5leHQgfHwgbmV4dC5hZGQoeCwgZGVuKSA8PSAxKVxuICAgICAgICAgICkpXG4gICAgICAgIH0gZWxzZSBpZiAoZGlmZiA8IDgpIHtcbiAgICAgICAgICBudW0gPSByYW5kQmV0d2VlbkZpbHRlcihkZW4gKyAxLCBkZW4gKiA2LCB4ID0+IGdjZCh4LCBkZW4pID09PSAxKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKGRlbiAqIDEwLCBkZW4gKiAxMDAsIHggPT4gZ2NkKHgsIGRlbikgPT09IDEpXG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgIHZhbDogbmV3IEZyYWN0aW9uKG51bSwgZGVuKSxcbiAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0RnJhY3Rpb25NdWx0aXBseSAoc2V0dGluZ3MpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICBjb25zdCBkID0gcmFuZEJldHdlZW4oMiwgMTApXG4gICAgICBjb25zdCBuID0gcmFuZEJldHdlZW4oMSwgZCAtIDEpXG4gICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihuLCBkKSxcbiAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRBbGdlYnJhQWRkIChzZXR0aW5ncykge1xuICAgIGNvbnN0IGRpZmYgPSBzZXR0aW5ncy5udW1fZGlmZlxuICAgIHN3aXRjaCAoZGlmZikge1xuICAgICAgY2FzZSAxOiB7XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbChjb2VmZiArIHZhcmlhYmxlKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjpcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgaWYgKE1hdGgucmFuZG9tKCkgPCAwLjUpIHsgLy8gdmFyaWFibGUgKyBjb25zdGFudFxuICAgICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgICBjb25zdCBjb25zdGFudCA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmICsgdmFyaWFibGUgKyAnKycgKyBjb25zdGFudCksXG4gICAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgdmFyaWFibGUxID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgICBsZXQgdmFyaWFibGUyID0gdmFyaWFibGUxXG4gICAgICAgICAgd2hpbGUgKHZhcmlhYmxlMiA9PT0gdmFyaWFibGUxKSB7XG4gICAgICAgICAgICB2YXJpYWJsZTIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGNvZWZmMSA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgICBjb25zdCBjb2VmZjIgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbChjb2VmZjEgKyB2YXJpYWJsZTEgKyAnKycgKyBjb2VmZjIgKyB2YXJpYWJsZTIpLFxuICAgICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEFsZ2VicmFNdWx0aXBseSAoc2V0dGluZ3MpIHtcbiAgICAvKiBEaWZmaWN1bHR5OlxuICAgICAqIDE6IEFsdGVybmF0ZSAzYSB3aXRoIDRcbiAgICAgKiAyOiBBbGwgdGVybXMgb2YgdGhlIGZvcm0gbnYgLSB1cCB0byB0d28gdmFyaWFibGVzXG4gICAgICogMzogQWxsIHRlcm1zIG9mIHRoZSBmb3JtIG52Xm0uIE9uZSB2YXJpYWJsZSBvbmx5XG4gICAgICogNDogQUxsIHRlcm1zIG9mIHRoZSBmb3JtIG54XmsgeV5sIHpecC4gayxsLHAgMC0zXG4gICAgICogNTogRXhwYW5kIGJyYWNrZXRzIDMoMngrNSlcbiAgICAgKiA2OiBFeHBhbmQgYnJhY2tldHMgM3goMngrNSlcbiAgICAgKiA3OiBFeHBhbmQgYnJhY2tldHMgM3heMnkoMnh5KzV5XjIpXG4gICAgICogODogRXhwYW5kIGJyYWNrZXRzICh4KzMpKHgrMilcbiAgICAgKiA5OiBFeHBhbmQgYnJhY2tldHMgKDJ4LTMpKDN4KzQpXG4gICAgICogMTA6IEV4cGFuZCBicmFja2V0cyAoMnheMi0zeCs0KSgyeC01KVxuICAgICAqL1xuICAgIGNvbnN0IGRpZmYgPSBzZXR0aW5ncy5udW1fZGlmZlxuICAgIHN3aXRjaCAoZGlmZikge1xuICAgICAgY2FzZSAxOlxuICAgICAge1xuICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgdGVybSA9IGkgJSAyID09PSAwID8gY29lZmYgOiBjb2VmZiArIHZhcmlhYmxlXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgMjoge1xuICAgICAgICBjb25zdCB2YXJpYWJsZTEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBjb25zdCB2YXJpYWJsZTIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IHZhcmlhYmxlID0gcmFuZEVsZW0oW3ZhcmlhYmxlMSwgdmFyaWFibGUyXSlcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbChjb2VmZiArIHZhcmlhYmxlKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSAzOiB7XG4gICAgICAgIGNvbnN0IHYgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IGlkeCA9IHJhbmRCZXR3ZWVuKDEsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbChjb2VmZiArIHYgKyAnXicgKyBpZHgpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDQ6IHtcbiAgICAgICAgY29uc3Qgc3RhcnRBc2NpaSA9IHJhbmRCZXR3ZWVuKDk3LCAxMjApXG4gICAgICAgIGNvbnN0IHYxID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpKVxuICAgICAgICBjb25zdCB2MiA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSArIDEpXG4gICAgICAgIGNvbnN0IHYzID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpICsgMilcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4xID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4yID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4zID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IHRlcm0gPSBhICsgdjEgKyBuMSArIHYyICsgbjIgKyB2MyArIG4zXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgNTpcbiAgICAgIGNhc2UgNjogeyAvLyBlLmcuIDMoeCkgKiAoMngtNSlcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IGNvbnN0YW50ID0gcmFuZEJldHdlZW4oLTksIDkpLnRvU3RyaW5nKClcbiAgICAgICAgICBsZXQgdGVybSA9IGNvZWZmXG4gICAgICAgICAgaWYgKGRpZmYgPT09IDYgfHwgaSAlIDIgPT09IDEpIHRlcm0gKz0gdmFyaWFibGVcbiAgICAgICAgICBpZiAoaSAlIDIgPT09IDEpIHRlcm0gKz0gJysnICsgY29uc3RhbnRcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh0ZXJtKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSA3OiB7IC8vIGUuZy4gM3heMnkoNHh5XjIrNXh5KVxuICAgICAgICBjb25zdCBzdGFydEFzY2lpID0gcmFuZEJldHdlZW4oOTcsIDEyMClcbiAgICAgICAgY29uc3QgdjEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkpXG4gICAgICAgIGNvbnN0IHYyID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpICsgMSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGExID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMTEgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjEyID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIGxldCB0ZXJtID0gYTEgKyB2MSArIG4xMSArIHYyICsgbjEyXG4gICAgICAgICAgaWYgKGkgJSAyID09PSAxKSB7XG4gICAgICAgICAgICBjb25zdCBhMiA9IHJhbmRCZXR3ZWVuKC05LCA5KS50b1N0cmluZygpXG4gICAgICAgICAgICBjb25zdCBuMjEgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgICBjb25zdCBuMjIgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgICB0ZXJtICs9ICcrJyArIGEyICsgdjEgKyBuMjEgKyB2MiArIG4yMlxuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh0ZXJtKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSA4OiAvLyB7IGUuZy4gKHgrNSkgKiAoeC0yKVxuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb25zdGFudCA9IHJhbmRCZXR3ZWVuKC05LCA5KS50b1N0cmluZygpXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodmFyaWFibGUgKyAnKycgKyBjb25zdGFudCksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyogTWV0aG9kIHRvIGNhbGN1bGF0ZSBlZGdlcyBmcm9tIHZlcnRpY2VzICovXG4gIGNhbGN1bGF0ZUVkZ2VzICgpIHtcbiAgICAvLyBDYWxjdWxhdGUgdGhlIGVkZ2VzIGdpdmVuIHRoZSB2ZXJ0aWNlcyB1c2luZyB0aGlzLm9wXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgdGhpcy5zaWRlc1tpXSA9IHtcbiAgICAgICAgdmFsOiB0aGlzLm9wKHRoaXMudmVydGljZXNbaV0udmFsLCB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dLnZhbCksXG4gICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiBNYXJrIGhpZGRlbmQgZWRnZXMvdmVydGljZXMgKi9cblxuICBoaWRlTGFiZWxzIChwdXp6bGVEaWZmaWN1bHR5KSB7XG4gICAgLy8gSGlkZSBzb21lIGxhYmVscyB0byBtYWtlIGEgcHV6emxlXG4gICAgLy8gMSAtIFNpZGVzIGhpZGRlbiwgdmVydGljZXMgc2hvd25cbiAgICAvLyAyIC0gU29tZSBzaWRlcyBoaWRkZW4sIHNvbWUgdmVydGljZXMgaGlkZGVuXG4gICAgLy8gMyAtIEFsbCB2ZXJ0aWNlcyBoaWRkZW5cbiAgICBzd2l0Y2ggKHB1enpsZURpZmZpY3VsdHkpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgdGhpcy5zaWRlcy5mb3JFYWNoKHggPT4geyB4LmhpZGRlbiA9IHRydWUgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjoge1xuICAgICAgICB0aGlzLnNpZGVzLmZvckVhY2goeCA9PiB7IHguaGlkZGVuID0gdHJ1ZSB9KVxuICAgICAgICBjb25zdCBzaG93c2lkZSA9IHJhbmRCZXR3ZWVuKDAsIHRoaXMubiAtIDEsIE1hdGgucmFuZG9tKVxuICAgICAgICBjb25zdCBoaWRldmVydCA9IE1hdGgucmFuZG9tKCkgPCAwLjVcbiAgICAgICAgICA/IHNob3dzaWRlIC8vIHByZXZpb3VzIHZlcnRleFxuICAgICAgICAgIDogKHNob3dzaWRlICsgMSkgJSB0aGlzLm4gLy8gbmV4dCB2ZXJ0ZXg7XG5cbiAgICAgICAgdGhpcy5zaWRlc1tzaG93c2lkZV0uaGlkZGVuID0gZmFsc2VcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1toaWRldmVydF0uaGlkZGVuID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAzOlxuICAgICAgICB0aGlzLnZlcnRpY2VzLmZvckVhY2goeCA9PiB7IHguaGlkZGVuID0gdHJ1ZSB9KVxuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdub19kaWZmaWN1bHR5JylcbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgQXJpdGhtYWdvblFWaWV3IGV4dGVuZHMgR3JhcGhpY1FWaWV3IHtcbiAgY29uc3RydWN0b3IgKGRhdGEsIG9wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBzZXRzIHRoaXMud2lkdGggdGhpcy5oZWlnaHQsIGluaXRpYWxpc2VzIHRoaXMubGFiZWxzLCBjcmVhdGVzIGRvbSBlbGVtZW50c1xuXG4gICAgY29uc3Qgd2lkdGggPSB0aGlzLndpZHRoXG4gICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5oZWlnaHRcbiAgICBjb25zdCByID0gMC4zNSAqIE1hdGgubWluKHdpZHRoLCBoZWlnaHQpIC8vIHJhZGl1c1xuICAgIGNvbnN0IG4gPSB0aGlzLmRhdGEublxuXG4gICAgLy8gQSBwb2ludCB0byBsYWJlbCB3aXRoIHRoZSBvcGVyYXRpb25cbiAgICAvLyBBbGwgcG9pbnRzIGZpcnN0IHNldCB1cCB3aXRoICgwLDApIGF0IGNlbnRlclxuICAgIHRoaXMub3BlcmF0aW9uUG9pbnQgPSBuZXcgUG9pbnQoMCwgMClcblxuICAgIC8vIFBvc2l0aW9uIG9mIHZlcnRpY2VzXG4gICAgdGhpcy52ZXJ0ZXhQb2ludHMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBjb25zdCBhbmdsZSA9IGkgKiBNYXRoLlBJICogMiAvIG4gLSBNYXRoLlBJIC8gMlxuICAgICAgdGhpcy52ZXJ0ZXhQb2ludHNbaV0gPSBQb2ludC5mcm9tUG9sYXIociwgYW5nbGUpXG4gICAgfVxuXG4gICAgLy8gUG9pc2l0aW9uIG9mIHNpZGUgbGFiZWxzXG4gICAgdGhpcy5zaWRlUG9pbnRzID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgdGhpcy5zaWRlUG9pbnRzW2ldID0gUG9pbnQubWVhbih0aGlzLnZlcnRleFBvaW50c1tpXSwgdGhpcy52ZXJ0ZXhQb2ludHNbKGkgKyAxKSAlIG5dKVxuICAgIH1cblxuICAgIHRoaXMuYWxsUG9pbnRzID0gW3RoaXMub3BlcmF0aW9uUG9pbnRdLmNvbmNhdCh0aGlzLnZlcnRleFBvaW50cykuY29uY2F0KHRoaXMuc2lkZVBvaW50cylcblxuICAgIHRoaXMucmVDZW50ZXIoKSAvLyBSZXBvc2l0aW9uIGV2ZXJ5dGhpbmcgcHJvcGVybHlcblxuICAgIHRoaXMubWFrZUxhYmVscyh0cnVlKVxuXG4gICAgLy8gRHJhdyBpbnRvIGNhbnZhc1xuICB9XG5cbiAgcmVDZW50ZXIgKCkge1xuICAgIC8vIEZpbmQgdGhlIGNlbnRlciBvZiB0aGUgYm91bmRpbmcgYm94XG4gICAgY29uc3QgdG9wbGVmdCA9IFBvaW50Lm1pbih0aGlzLmFsbFBvaW50cylcbiAgICBjb25zdCBib3R0b21yaWdodCA9IFBvaW50Lm1heCh0aGlzLmFsbFBvaW50cylcbiAgICBjb25zdCBjZW50ZXIgPSBQb2ludC5tZWFuKHRvcGxlZnQsIGJvdHRvbXJpZ2h0KVxuXG4gICAgLy8gdHJhbnNsYXRlIHRvIHB1dCBpbiB0aGUgY2VudGVyXG4gICAgdGhpcy5hbGxQb2ludHMuZm9yRWFjaChwID0+IHtcbiAgICAgIHAudHJhbnNsYXRlKHRoaXMud2lkdGggLyAyIC0gY2VudGVyLngsIHRoaXMuaGVpZ2h0IC8gMiAtIGNlbnRlci55KVxuICAgIH0pXG4gIH1cblxuICBtYWtlTGFiZWxzICgpIHtcbiAgICAvLyB2ZXJ0aWNlc1xuICAgIHRoaXMuZGF0YS52ZXJ0aWNlcy5mb3JFYWNoKCh2LCBpKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHYudmFsLnRvTGF0ZXhcbiAgICAgICAgPyB2LnZhbC50b0xhdGV4KHRydWUpXG4gICAgICAgIDogdi52YWwudG9TdHJpbmcoKVxuICAgICAgdGhpcy5sYWJlbHMucHVzaCh7XG4gICAgICAgIHBvczogdGhpcy52ZXJ0ZXhQb2ludHNbaV0sXG4gICAgICAgIHRleHRxOiB2LmhpZGRlbiA/ICcnIDogdmFsdWUsXG4gICAgICAgIHRleHRhOiB2YWx1ZSxcbiAgICAgICAgc3R5bGVxOiAnbm9ybWFsIHZlcnRleCcsXG4gICAgICAgIHN0eWxlYTogdi5oaWRkZW4gPyAnYW5zd2VyIHZlcnRleCcgOiAnbm9ybWFsIHZlcnRleCdcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIC8vIHNpZGVzXG4gICAgdGhpcy5kYXRhLnNpZGVzLmZvckVhY2goKHYsIGkpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gdi52YWwudG9MYXRleFxuICAgICAgICA/IHYudmFsLnRvTGF0ZXgodHJ1ZSlcbiAgICAgICAgOiB2LnZhbC50b1N0cmluZygpXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKHtcbiAgICAgICAgcG9zOiB0aGlzLnNpZGVQb2ludHNbaV0sXG4gICAgICAgIHRleHRxOiB2LmhpZGRlbiA/ICcnIDogdmFsdWUsXG4gICAgICAgIHRleHRhOiB2YWx1ZSxcbiAgICAgICAgc3R5bGVxOiAnbm9ybWFsIHNpZGUnLFxuICAgICAgICBzdHlsZWE6IHYuaGlkZGVuID8gJ2Fuc3dlciBzaWRlJyA6ICdub3JtYWwgc2lkZSdcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIC8vIG9wZXJhdGlvblxuICAgIHRoaXMubGFiZWxzLnB1c2goe1xuICAgICAgcG9zOiB0aGlzLm9wZXJhdGlvblBvaW50LFxuICAgICAgdGV4dHE6IHRoaXMuZGF0YS5vcG5hbWUsXG4gICAgICB0ZXh0YTogdGhpcy5kYXRhLm9wbmFtZSxcbiAgICAgIHN0eWxlcTogJ25vcm1hbCcsXG4gICAgICBzdHlsZWE6ICdub3JtYWwnXG4gICAgfSlcblxuICAgIC8vIHN0eWxpbmdcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgfVxuXG4gIHJlbmRlciAoKSB7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICAgIGNvbnN0IG4gPSB0aGlzLmRhdGEublxuXG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KSAvLyBjbGVhclxuXG4gICAgY3R4LmJlZ2luUGF0aCgpXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIGNvbnN0IHAgPSB0aGlzLnZlcnRleFBvaW50c1tpXVxuICAgICAgY29uc3QgbmV4dCA9IHRoaXMudmVydGV4UG9pbnRzWyhpICsgMSkgJSBuXVxuICAgICAgY3R4Lm1vdmVUbyhwLngsIHAueSlcbiAgICAgIGN0eC5saW5lVG8obmV4dC54LCBuZXh0LnkpXG4gICAgfVxuICAgIGN0eC5zdHJva2UoKVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgLy8gcGxhY2UgbGFiZWxzXG4gICAgdGhpcy5yZW5kZXJMYWJlbHModHJ1ZSlcbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkge1xuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRhXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZWFcbiAgICB9KVxuICAgIHRoaXMucmVuZGVyTGFiZWxzKHRydWUpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IHRydWVcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkge1xuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRxXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZXFcbiAgICB9KVxuICAgIHRoaXMucmVuZGVyTGFiZWxzKHRydWUpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gIH1cbn1cbiIsImltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCB7IHJhbmRFbGVtIH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUZXN0USBleHRlbmRzIFRleHRRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiA1LFxuICAgICAgbGFiZWw6ICdhJyxcbiAgICAgIHRlc3QxOiBbJ2ZvbyddLFxuICAgICAgdGVzdDI6IHRydWVcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIHRoaXMubGFiZWwgPSBzZXR0aW5ncy5sYWJlbFxuXG4gICAgLy8gcGljayBhIHJhbmRvbSBvbmUgb2YgdGhlIHNlbGVjdGVkXG4gICAgbGV0IHRlc3QxXG4gICAgaWYgKHNldHRpbmdzLnRlc3QxLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGVzdDEgPSAnbm9uZSdcbiAgICB9IGVsc2Uge1xuICAgICAgdGVzdDEgPSByYW5kRWxlbShzZXR0aW5ncy50ZXN0MSlcbiAgICB9XG5cbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnZDogJyArIHNldHRpbmdzLmRpZmZpY3VsdHkgKyAnXFxcXFxcXFwgdGVzdDE6ICcgKyB0ZXN0MVxuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAndGVzdDI6ICcgKyBzZXR0aW5ncy50ZXN0MlxuXG4gICAgdGhpcy5yZW5kZXIoKVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7IHJldHVybiAnVGVzdCBjb21tYW5kIHdvcmQnIH1cbn1cblxuVGVzdFEub3B0aW9uc1NwZWMgPSBbXG4gIHtcbiAgICB0aXRsZTogJ1Rlc3Qgb3B0aW9uIDEnLFxuICAgIGlkOiAndGVzdDEnLFxuICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbJ2ZvbycsICdiYXInLCAnd2l6eiddLFxuICAgIGRlZmF1bHQ6IFtdXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1Rlc3Qgb3B0aW9uIDInLFxuICAgIGlkOiAndGVzdDInLFxuICAgIHR5cGU6ICdib29sJyxcbiAgICBkZWZhdWx0OiB0cnVlXG4gIH1cbl1cbiIsImltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCB7IHJhbmRCZXR3ZWVuIH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBZGRBWmVybyBleHRlbmRzIFRleHRRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiA1LFxuICAgICAgbGFiZWw6ICdhJ1xuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyByYW5kb20gMiBkaWdpdCAnZGVjaW1hbCdcbiAgICBjb25zdCBxID0gU3RyaW5nKHJhbmRCZXR3ZWVuKDEsIDkpKSArIFN0cmluZyhyYW5kQmV0d2VlbigwLCA5KSkgKyAnLicgKyBTdHJpbmcocmFuZEJldHdlZW4oMCwgOSkpXG4gICAgY29uc3QgYSA9IHEgKyAnMCdcblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9IHEgKyAnXFxcXHRpbWVzIDEwJ1xuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPSAnICsgYVxuXG4gICAgdGhpcy5yZW5kZXIoKVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdFdmFsdWF0ZSdcbiAgfVxufVxuXG5BZGRBWmVyby5vcHRpb25zU3BlYyA9IFtcbl1cbiIsImltcG9ydCB7IHJhbmRCZXR3ZWVuIH0gZnJvbSAnVXRpbGl0aWVzJ1xuaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuaW1wb3J0IEZyYWN0aW9uIGZyb20gJ3ZlbmRvci9mcmFjdGlvbidcblxuLyogTWFpbiBxdWVzdGlvbiBjbGFzcy4gVGhpcyB3aWxsIGJlIHNwdW4gb2ZmIGludG8gZGlmZmVyZW50IGZpbGUgYW5kIGdlbmVyYWxpc2VkICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFcXVhdGlvbk9mTGluZSBleHRlbmRzIFRleHRRIHtcbiAgLy8gJ2V4dGVuZHMnIFF1ZXN0aW9uLCBidXQgbm90aGluZyB0byBhY3R1YWxseSBleHRlbmRcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICAvLyBib2lsZXJwbGF0ZVxuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDJcbiAgICB9XG5cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuICAgIGNvbnN0IGRpZmZpY3VsdHkgPSBNYXRoLmNlaWwoc2V0dGluZ3MuZGlmZmljdWx0eSAvIDIpIC8vIGluaXRpYWxseSB3cml0dGVuIGZvciBkaWZmaWN1bHR5IDEtNCwgbm93IG5lZWQgMS0xMFxuXG4gICAgLy8gcXVlc3Rpb24gZ2VuZXJhdGlvbiBiZWdpbnMgaGVyZVxuICAgIGxldCBtLCBjLCB4MSwgeTEsIHgyLCB5MlxuICAgIGxldCBtaW5tLCBtYXhtLCBtaW5jLCBtYXhjXG5cbiAgICBzd2l0Y2ggKGRpZmZpY3VsdHkpIHtcbiAgICAgIGNhc2UgMTogLy8gbT4wLCBjPj0wXG4gICAgICBjYXNlIDI6XG4gICAgICBjYXNlIDM6XG4gICAgICAgIG1pbm0gPSBkaWZmaWN1bHR5IDwgMyA/IDEgOiAtNVxuICAgICAgICBtYXhtID0gNVxuICAgICAgICBtaW5jID0gZGlmZmljdWx0eSA8IDIgPyAwIDogLTEwXG4gICAgICAgIG1heGMgPSAxMFxuICAgICAgICBtID0gcmFuZEJldHdlZW4obWlubSwgbWF4bSlcbiAgICAgICAgYyA9IHJhbmRCZXR3ZWVuKG1pbmMsIG1heGMpXG4gICAgICAgIHgxID0gZGlmZmljdWx0eSA8IDMgPyByYW5kQmV0d2VlbigwLCAxMCkgOiByYW5kQmV0d2VlbigtMTUsIDE1KVxuICAgICAgICB5MSA9IG0gKiB4MSArIGNcblxuICAgICAgICBpZiAoZGlmZmljdWx0eSA8IDMpIHtcbiAgICAgICAgICB4MiA9IHJhbmRCZXR3ZWVuKHgxICsgMSwgMTUpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgeDIgPSB4MVxuICAgICAgICAgIHdoaWxlICh4MiA9PT0geDEpIHsgeDIgPSByYW5kQmV0d2VlbigtMTUsIDE1KSB9O1xuICAgICAgICB9XG4gICAgICAgIHkyID0gbSAqIHgyICsgY1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA0OiAvLyBtIGZyYWN0aW9uLCBwb2ludHMgYXJlIGludGVnZXJzXG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGNvbnN0IG1kID0gcmFuZEJldHdlZW4oMSwgNSlcbiAgICAgICAgY29uc3QgbW4gPSByYW5kQmV0d2VlbigtNSwgNSlcbiAgICAgICAgbSA9IG5ldyBGcmFjdGlvbihtbiwgbWQpXG4gICAgICAgIHgxID0gbmV3IEZyYWN0aW9uKHJhbmRCZXR3ZWVuKC0xMCwgMTApKVxuICAgICAgICB5MSA9IG5ldyBGcmFjdGlvbihyYW5kQmV0d2VlbigtMTAsIDEwKSlcbiAgICAgICAgYyA9IG5ldyBGcmFjdGlvbih5MSkuc3ViKG0ubXVsKHgxKSlcbiAgICAgICAgeDIgPSB4MS5hZGQocmFuZEJldHdlZW4oMSwgNSkgKiBtLmQpXG4gICAgICAgIHkyID0gbS5tdWwoeDIpLmFkZChjKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHhzdHIgPVxuICAgICAgKG0gPT09IDAgfHwgKG0uZXF1YWxzICYmIG0uZXF1YWxzKDApKSkgPyAnJ1xuICAgICAgICA6IChtID09PSAxIHx8IChtLmVxdWFscyAmJiBtLmVxdWFscygxKSkpID8gJ3gnXG4gICAgICAgICAgOiAobSA9PT0gLTEgfHwgKG0uZXF1YWxzICYmIG0uZXF1YWxzKC0xKSkpID8gJy14J1xuICAgICAgICAgICAgOiAobS50b0xhdGV4KSA/IG0udG9MYXRleCgpICsgJ3gnXG4gICAgICAgICAgICAgIDogKG0gKyAneCcpXG5cbiAgICBjb25zdCBjb25zdHN0ciA9IC8vIFRPRE86IFdoZW4gbT1jPTBcbiAgICAgIChjID09PSAwIHx8IChjLmVxdWFscyAmJiBjLmVxdWFscygwKSkpID8gJydcbiAgICAgICAgOiAoYyA8IDApID8gKCcgLSAnICsgKGMubmVnID8gYy5uZWcoKS50b0xhdGV4KCkgOiAtYykpXG4gICAgICAgICAgOiAoYy50b0xhdGV4KSA/ICgnICsgJyArIGMudG9MYXRleCgpKVxuICAgICAgICAgICAgOiAoJyArICcgKyBjKVxuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gJygnICsgeDEgKyAnLCAnICsgeTEgKyAnKVxcXFx0ZXh0eyBhbmQgfSgnICsgeDIgKyAnLCAnICsgeTIgKyAnKSdcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJ3kgPSAnICsgeHN0ciArIGNvbnN0c3RyXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ0ZpbmQgdGhlIGVxdWF0aW9uIG9mIHRoZSBsaW5lIHRocm91Z2gnXG4gIH1cbn1cbiIsIi8qIFJlbmRlcnMgbWlzc2luZyBhbmdsZXMgcHJvYmxlbSB3aGVuIHRoZSBhbmdsZXMgYXJlIGF0IGEgcG9pbnRcbiAqIEkuZS4gb24gYSBzdHJhaWdodCBsaW5lIG9yIGFyb3VuZCBhIHBvaW50XG4gKiBDb3VsZCBhbHNvIGJlIGFkYXB0ZWQgdG8gYW5nbGVzIGZvcm1pbmcgYSByaWdodCBhbmdsZVxuICpcbiAqIFNob3VsZCBiZSBmbGV4aWJsZSBlbm91Z2ggZm9yIG51bWVyaWNhbCBwcm9ibGVtcyBvciBhbGdlYnJhaWMgb25lc1xuICpcbiAqL1xuXG5pbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBHcmFwaGljUVZpZXcsIExhYmVsIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgeyByb3VuZERQIH0gZnJvbSAnVXRpbGl0aWVzJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNOdW1iZXJEYXRhJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzVmlld09wdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGV4dGVuZHMgR3JhcGhpY1FWaWV3IHtcbiAgcmFkaXVzOiBudW1iZXJcbiAgTzogUG9pbnRcbiAgQTogUG9pbnRcbiAgQzogUG9pbnRbXVxuICB2aWV3QW5nbGVzOiBudW1iZXJbXSAvLyAnZnVkZ2VkJyB2ZXJzaW9ucyBvZiBkYXRhLmFuZ2xlcyBmb3IgZGlzcGxheVxuICBkYXRhOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YVxuICByb3RhdGlvbjogbnVtYmVyXG5cbiAgY29uc3RydWN0b3IgKGRhdGEgOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSwgb3B0aW9ucyA6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIHNldHMgdGhpcy53aWR0aCB0aGlzLmhlaWdodCwgaW5pdGlhbGlzZXMgdGhpcy5sYWJlbHMsIGNyZWF0ZXMgZG9tIGVsZW1lbnRzXG4gICAgY29uc3Qgd2lkdGggPSB0aGlzLndpZHRoXG4gICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5oZWlnaHRcbiAgICBjb25zdCByYWRpdXMgPSB0aGlzLnJhZGl1cyA9IE1hdGgubWluKHdpZHRoLCBoZWlnaHQpIC8gMi41XG4gICAgY29uc3QgbWluVmlld0FuZ2xlID0gb3B0aW9ucy5taW5WaWV3QW5nbGUgfHwgMjVcblxuICAgIHRoaXMudmlld0FuZ2xlcyA9IGZ1ZGdlQW5nbGVzKHRoaXMuZGF0YS5hbmdsZXMsIG1pblZpZXdBbmdsZSlcblxuICAgIC8vIFNldCB1cCBtYWluIHBvaW50c1xuICAgIHRoaXMuTyA9IG5ldyBQb2ludCgwLCAwKSAvLyBjZW50ZXIgcG9pbnRcbiAgICB0aGlzLkEgPSBuZXcgUG9pbnQocmFkaXVzLCAwKSAvLyBmaXJzdCBwb2ludFxuICAgIHRoaXMuQyA9IFtdIC8vIFBvaW50cyBhcm91bmQgb3V0c2lkZVxuICAgIGxldCB0b3RhbGFuZ2xlID0gMCAvLyBuYiBpbiByYWRpYW5zXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmRhdGEuYW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0b3RhbGFuZ2xlICs9IHRoaXMudmlld0FuZ2xlc1tpXSAqIE1hdGguUEkgLyAxODBcbiAgICAgIHRoaXMuQ1tpXSA9IFBvaW50LmZyb21Qb2xhcihyYWRpdXMsIHRvdGFsYW5nbGUpXG4gICAgfVxuXG4gICAgLy8gUmFuZG9tbHkgcm90YXRlIGFuZCBjZW50ZXJcbiAgICB0aGlzLnJvdGF0aW9uID0gKG9wdGlvbnMucm90YXRpb24gIT09IHVuZGVmaW5lZCkgPyB0aGlzLnJvdGF0ZShvcHRpb25zLnJvdGF0aW9uKSA6IHRoaXMucmFuZG9tUm90YXRlKClcbiAgICAvLyB0aGlzLnNjYWxlVG9GaXQod2lkdGgsaGVpZ2h0LDEwKVxuICAgIHRoaXMudHJhbnNsYXRlKHdpZHRoIC8gMiwgaGVpZ2h0IC8gMilcblxuICAgIC8vIFNldCB1cCBsYWJlbHMgKGFmdGVyIHNjYWxpbmcgYW5kIHJvdGF0aW5nKVxuICAgIHRvdGFsYW5nbGUgPSBQb2ludC5hbmdsZUZyb20odGhpcy5PLCB0aGlzLkEpICogMTgwIC8gTWF0aC5QSSAvLyBhbmdsZSBmcm9tIE8gdGhhdCBBIGlzXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnZpZXdBbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIC8vIExhYmVsIHRleHRcbiAgICAgIGNvbnN0IGxhYmVsIDogUGFydGlhbDxMYWJlbD4gPSB7fVxuICAgICAgY29uc3QgdGV4dHEgPSB0aGlzLmRhdGEuYW5nbGVMYWJlbHNbaV1cbiAgICAgIGNvbnN0IHRleHRhID0gcm91bmREUCh0aGlzLmRhdGEuYW5nbGVzW2ldLCAyKS50b1N0cmluZygpICsgJ15cXFxcY2lyYydcblxuICAgICAgLy8gUG9zaXRpb25pbmdcbiAgICAgIGNvbnN0IHRoZXRhID0gdGhpcy52aWV3QW5nbGVzW2ldXG4gICAgICAvKiBjb3VsZCBiZSB1c2VkIGZvciBtb3JlIGFkdmFuY2VkIHBvc2l0aW9uaW5nXG4gICAgICBjb25zdCBtaWRBbmdsZSA9IHRvdGFsYW5nbGUgKyB0aGV0YSAvIDJcbiAgICAgIGNvbnN0IG1pbkRpc3RhbmNlID0gMC4zIC8vIGFzIGEgZnJhY3Rpb24gb2YgcmFkaXVzXG4gICAgICBjb25zdCBsYWJlbExlbmd0aCA9IE1hdGgubWF4KHRleHRxLmxlbmd0aCwgdGV4dGEubGVuZ3RoKSAtICdeXFxcXGNpcmMnLmxlbmd0aCAvLyDCsCB0YWtlcyB1cCB2ZXJ5IGxpdHRsZSBzcGFjZVxuICAgICAgKi9cblxuICAgICAgLyogRXhwbGFuYXRpb246IEZ1cnRoZXIgb3V0IGlmOlxuICAgICAgKiAgIE1vcmUgdmVydGljYWwgKHNpbihtaWRBbmdsZSkpXG4gICAgICAqICAgTG9uZ2VyIGxhYmVsXG4gICAgICAqICAgc21hbGxlciBhbmdsZVxuICAgICAgKiAgIEUuZy4gdG90YWxseSB2ZXJ0aWNhbCwgNDXCsCwgbGVuZ3RoID0gM1xuICAgICAgKiAgIGQgPSAwLjMgKyAxKjMvNDUgPSAwLjMgKyAwLjcgPSAwLjM3XG4gICAgICAqL1xuICAgICAgLy8gY29uc3QgZmFjdG9yID0gMSAgICAgICAgLy8gY29uc3RhbnQgb2YgcHJvcG9ydGlvbmFsaXR5LiBTZXQgYnkgdHJpYWwgYW5kIGVycm9yXG4gICAgICAvLyBsZXQgZGlzdGFuY2UgPSBtaW5EaXN0YW5jZSArIGZhY3RvciAqIE1hdGguYWJzKHNpbkRlZyhtaWRBbmdsZSkpICogbGFiZWxMZW5ndGggLyB0aGV0YVxuXG4gICAgICAvLyBKdXN0IHJldmVydCB0byBvbGQgbWV0aG9kXG5cbiAgICAgIGNvbnN0IGRpc3RhbmNlID0gMC40ICsgNiAvIHRoZXRhXG5cbiAgICAgIGxhYmVsLnBvcyA9IFBvaW50LmZyb21Qb2xhckRlZyhyYWRpdXMgKiBkaXN0YW5jZSwgdG90YWxhbmdsZSArIHRoZXRhIC8gMikudHJhbnNsYXRlKHRoaXMuTy54LCB0aGlzLk8ueSlcbiAgICAgIGxhYmVsLnRleHRxID0gdGV4dHFcbiAgICAgIGxhYmVsLnN0eWxlcSA9ICdub3JtYWwnXG5cbiAgICAgIGlmICh0aGlzLmRhdGEubWlzc2luZ1tpXSkge1xuICAgICAgICBsYWJlbC50ZXh0YSA9IHRleHRhXG4gICAgICAgIGxhYmVsLnN0eWxlYSA9ICdhbnN3ZXInXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsYWJlbC50ZXh0YSA9IGxhYmVsLnRleHRxXG4gICAgICAgIGxhYmVsLnN0eWxlYSA9IGxhYmVsLnN0eWxlcVxuICAgICAgfVxuXG4gICAgICBsYWJlbC50ZXh0ID0gbGFiZWwudGV4dHFcbiAgICAgIGxhYmVsLnN0eWxlID0gbGFiZWwuc3R5bGVxXG5cbiAgICAgIHRoaXMubGFiZWxzW2ldID0gbGFiZWwgYXMgTGFiZWxcblxuICAgICAgdG90YWxhbmdsZSArPSB0aGV0YVxuICAgIH1cblxuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRxXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZXFcbiAgICB9KVxuICB9XG5cbiAgcmVuZGVyICgpIDogdm9pZCB7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuXG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KSAvLyBjbGVhclxuXG4gICAgY3R4LmJlZ2luUGF0aCgpXG4gICAgY3R4Lm1vdmVUbyh0aGlzLk8ueCwgdGhpcy5PLnkpIC8vIGRyYXcgbGluZXNcbiAgICBjdHgubGluZVRvKHRoaXMuQS54LCB0aGlzLkEueSlcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuQy5sZW5ndGg7IGkrKykge1xuICAgICAgY3R4Lm1vdmVUbyh0aGlzLk8ueCwgdGhpcy5PLnkpXG4gICAgICBjdHgubGluZVRvKHRoaXMuQ1tpXS54LCB0aGlzLkNbaV0ueSlcbiAgICB9XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gJ2dyYXknXG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBsZXQgdG90YWxhbmdsZSA9IHRoaXMucm90YXRpb25cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudmlld0FuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgdGhldGEgPSB0aGlzLnZpZXdBbmdsZXNbaV0gKiBNYXRoLlBJIC8gMTgwXG4gICAgICAvLyAwLjA3L3RoZXRhIHJhZGlhbnMgfj0gNC90aGV0YVxuICAgICAgY3R4LmFyYyh0aGlzLk8ueCwgdGhpcy5PLnksIHRoaXMucmFkaXVzICogKDAuMiArIDAuMDcgLyB0aGV0YSksIHRvdGFsYW5nbGUsIHRvdGFsYW5nbGUgKyB0aGV0YSlcbiAgICAgIGN0eC5zdHJva2UoKVxuICAgICAgdG90YWxhbmdsZSArPSB0aGV0YVxuICAgIH1cbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIC8vIHRlc3RpbmcgbGFiZWwgcG9zaXRpb25pbmc6XG4gICAgLy8gdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAvLyBjdHguZmlsbFN0eWxlID0gJ3JlZCdcbiAgICAvLyBjdHguZmlsbFJlY3QobC5wb3MueCAtIDEsIGwucG9zLnkgLSAxLCAzLCAzKVxuICAgIC8vIH0pXG5cbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGdldCBhbGxwb2ludHMgKCkgOiBQb2ludFtdIHtcbiAgICBsZXQgYWxscG9pbnRzID0gW3RoaXMuQSwgdGhpcy5PXVxuICAgIGFsbHBvaW50cyA9IGFsbHBvaW50cy5jb25jYXQodGhpcy5DKVxuICAgIHRoaXMubGFiZWxzLmZvckVhY2goZnVuY3Rpb24gKGwpIHtcbiAgICAgIGFsbHBvaW50cy5wdXNoKGwucG9zKVxuICAgIH0pXG4gICAgcmV0dXJuIGFsbHBvaW50c1xuICB9XG59XG5cbi8qKlxuICogQWRqdXN0cyBhIHNldCBvZiBhbmdsZXMgc28gdGhhdCBhbGwgYW5nbGVzIGFyZSBncmVhdGVyIHRoYW4ge21pbkFuZ2xlfSBieSByZWR1Y2luZyBvdGhlciBhbmdsZXMgaW4gcHJvcG9ydGlvblxuICogQHBhcmFtIGFuZ2xlcyBUaGUgc2V0IG9mIGFuZ2xlcyB0byBhZGp1c3RcbiAqIEBwYXJhbSBtaW5BbmdsZSBUaGUgc21hbGxlc3QgYW5nbGUgaW4gdGhlIG91dHB1dFxuICovXG5mdW5jdGlvbiBmdWRnZUFuZ2xlcyAoYW5nbGVzOiBudW1iZXJbXSwgbWluQW5nbGU6IG51bWJlcikgOiBudW1iZXJbXSB7XG4gIGNvbnN0IG1hcHBlZEFuZ2xlcyA9IGFuZ2xlcy5tYXAoKHgsIGkpID0+IFt4LCBpXSkgLy8gcmVtZW1iZXIgb3JpZ2luYWwgaW5kaWNlc1xuICBjb25zdCBzbWFsbEFuZ2xlcyA9IG1hcHBlZEFuZ2xlcy5maWx0ZXIoeCA9PiB4WzBdIDwgbWluQW5nbGUpXG4gIGNvbnN0IGxhcmdlQW5nbGVzID0gbWFwcGVkQW5nbGVzLmZpbHRlcih4ID0+IHhbMF0gPj0gbWluQW5nbGUpXG4gIGNvbnN0IGxhcmdlQW5nbGVTdW0gPSBsYXJnZUFuZ2xlcy5yZWR1Y2UoKGFjY3VtdWxhdG9yLCBjdXJyZW50VmFsdWUpID0+IGFjY3VtdWxhdG9yICsgY3VycmVudFZhbHVlWzBdLCAwKVxuXG4gIHNtYWxsQW5nbGVzLmZvckVhY2goc21hbGwgPT4ge1xuICAgIGNvbnN0IGRpZmZlcmVuY2UgPSBtaW5BbmdsZSAtIHNtYWxsWzBdXG4gICAgc21hbGxbMF0gKz0gZGlmZmVyZW5jZVxuICAgIGxhcmdlQW5nbGVzLmZvckVhY2gobGFyZ2UgPT4ge1xuICAgICAgY29uc3QgcmVkdWN0aW9uID0gZGlmZmVyZW5jZSAqIGxhcmdlWzBdIC8gbGFyZ2VBbmdsZVN1bVxuICAgICAgbGFyZ2VbMF0gLT0gcmVkdWN0aW9uXG4gICAgfSlcbiAgfSlcblxuICByZXR1cm4gc21hbGxBbmdsZXMuY29uY2F0KGxhcmdlQW5nbGVzKSAvLyBjb21iaW5lIHRvZ2V0aGVyXG4gICAgLnNvcnQoKHgsIHkpID0+IHhbMV0gLSB5WzFdKSAvLyBzb3J0IGJ5IHByZXZpb3VzIGluZGV4XG4gICAgLm1hcCh4ID0+IHhbMF0pIC8vIHN0cmlwIG91dCBpbmRleFxufVxuIiwiLyoqIEdlbmVyYXRlcyBhbmQgaG9sZHMgZGF0YSBmb3IgYSBtaXNzaW5nIGFuZ2xlcyBxdWVzdGlvbiwgd2hlcmUgdGhlc2UgaXMgc29tZSBnaXZlbiBhbmdsZSBzdW1cbiAqICBBZ25vc3RpYyBhcyB0byBob3cgdGhlc2UgYW5nbGVzIGFyZSBhcnJhbmdlZCAoZS5nLiBpbiBhIHBvbHlnb24gb3IgYXJvdW5kIHNvbSBwb2ludClcbiAqXG4gKiBPcHRpb25zIHBhc3NlZCB0byBjb25zdHJ1Y3RvcnM6XG4gKiAgYW5nbGVTdW06OkludCB0aGUgbnVtYmVyIG9mIGFuZ2xlcyB0byBnZW5lcmF0ZVxuICogIG1pbkFuZ2xlOjpJbnQgdGhlIHNtYWxsZXN0IGFuZ2xlIHRvIGdlbmVyYXRlXG4gKiAgbWluTjo6SW50ICAgICB0aGUgc21hbGxlc3QgbnVtYmVyIG9mIGFuZ2xlcyB0byBnZW5lcmF0ZVxuICogIG1heE46OkludCAgICAgdGhlIGxhcmdlc3QgbnVtYmVyIG9mIGFuZ2xlcyB0byBnZW5lcmF0ZVxuICpcbiAqL1xuXG5pbXBvcnQgeyByYW5kQmV0d2VlbiB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCB7IEdyYXBoaWNRRGF0YSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc0RhdGEgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNEYXRhJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlT3B0aW9ucyBhcyBPcHRpb25zIH0gZnJvbSAnLi9OdW1iZXJPcHRpb25zJ1xuXG5leHBvcnQgY2xhc3MgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgaW1wbGVtZW50cyBNaXNzaW5nQW5nbGVzRGF0YSB7XG4gIGFuZ2xlcyA6IG51bWJlcltdIC8vIGxpc3Qgb2YgYW5nbGVzXG4gIG1pc3NpbmcgOiBib29sZWFuW10gLy8gdHJ1ZSBpZiBtaXNzaW5nXG4gIGFuZ2xlU3VtIDogbnVtYmVyIC8vIHdoYXQgdGhlIGFuZ2xlcyBhZGQgdXAgdG9cbiAgYW5nbGVMYWJlbHM6IHN0cmluZ1tdXG5cbiAgY29uc3RydWN0b3IgKGFuZ2xlU3VtIDogbnVtYmVyLCBhbmdsZXM6IG51bWJlcltdLCBtaXNzaW5nOiBib29sZWFuW10sIGFuZ2xlTGFiZWxzPzogc3RyaW5nW10pIHtcbiAgICAvLyBpbml0aWFsaXNlcyB3aXRoIGFuZ2xlcyBnaXZlbiBleHBsaWNpdGx5XG4gICAgaWYgKGFuZ2xlcyA9PT0gW10pIHsgdGhyb3cgbmV3IEVycm9yKCdNdXN0IGdpdmUgYW5nbGVzJykgfVxuICAgIGlmIChNYXRoLnJvdW5kKGFuZ2xlcy5yZWR1Y2UoKHgsIHkpID0+IHggKyB5KSkgIT09IGFuZ2xlU3VtKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFuZ2xlIHN1bSBtdXN0IGJlICR7YW5nbGVTdW19YClcbiAgICB9XG5cbiAgICB0aGlzLmFuZ2xlcyA9IGFuZ2xlcyAvLyBsaXN0IG9mIGFuZ2xlc1xuICAgIHRoaXMubWlzc2luZyA9IG1pc3NpbmcgLy8gd2hpY2ggYW5nbGVzIGFyZSBtaXNzaW5nIC0gYXJyYXkgb2YgYm9vbGVhbnNcbiAgICB0aGlzLmFuZ2xlU3VtID0gYW5nbGVTdW0gLy8gc3VtIG9mIGFuZ2xlc1xuICAgIHRoaXMuYW5nbGVMYWJlbHMgPSBhbmdsZUxhYmVscyB8fCBbXVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB7XG4gICAgY29uc3QgZGVmYXVsdHMgOiBQYXJ0aWFsPE9wdGlvbnM+ID0ge1xuICAgICAgLyogYW5nbGVTdW06IDE4MCAqLyAvLyBtdXN0IGJlIHNldCBieSBjYWxsZXJcbiAgICAgIG1pbkFuZ2xlOiAxNSxcbiAgICAgIG1pbk46IDIsXG4gICAgICBtYXhOOiA0XG4gICAgfVxuXG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgbGV0IHF1ZXN0aW9uIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGFcbiAgICBpZiAob3B0aW9ucy5yZXBlYXRlZCkge1xuICAgICAgcXVlc3Rpb24gPSB0aGlzLnJhbmRvbVJlcGVhdGVkKG9wdGlvbnMpXG4gICAgfSBlbHNlIHtcbiAgICAgIHF1ZXN0aW9uID0gdGhpcy5yYW5kb21TaW1wbGUob3B0aW9ucylcbiAgICB9XG4gICAgcXVlc3Rpb24uaW5pdExhYmVscygpXG4gICAgcmV0dXJuIHF1ZXN0aW9uXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tU2ltcGxlIChvcHRpb25zOiBPcHRpb25zKTogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEge1xuICAgIGlmICghb3B0aW9ucy5hbmdsZVN1bSkgeyB0aHJvdyBuZXcgRXJyb3IoJ05vIGFuZ2xlIHN1bSBnaXZlbicpIH1cblxuICAgIGNvbnN0IGFuZ2xlU3VtID0gb3B0aW9ucy5hbmdsZVN1bVxuICAgIGNvbnN0IG4gPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbk4sIG9wdGlvbnMubWF4TilcbiAgICBjb25zdCBtaW5BbmdsZSA9IG9wdGlvbnMubWluQW5nbGVcblxuICAgIGlmIChuIDwgMikgdGhyb3cgbmV3IEVycm9yKCdDYW5cXCd0IGhhdmUgbWlzc2luZyBmZXdlciB0aGFuIDIgYW5nbGVzJylcblxuICAgIC8vIEJ1aWxkIHVwIGFuZ2xlc1xuICAgIGNvbnN0IGFuZ2xlcyA9IFtdXG4gICAgbGV0IGxlZnQgPSBhbmdsZVN1bVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbiAtIDE7IGkrKykge1xuICAgICAgY29uc3QgbWF4QW5nbGUgPSBsZWZ0IC0gbWluQW5nbGUgKiAobiAtIGkgLSAxKVxuICAgICAgY29uc3QgbmV4dEFuZ2xlID0gcmFuZEJldHdlZW4obWluQW5nbGUsIG1heEFuZ2xlKVxuICAgICAgbGVmdCAtPSBuZXh0QW5nbGVcbiAgICAgIGFuZ2xlcy5wdXNoKG5leHRBbmdsZSlcbiAgICB9XG4gICAgYW5nbGVzW24gLSAxXSA9IGxlZnRcblxuICAgIC8vIHBpY2sgb25lIHRvIGJlIG1pc3NpbmdcbiAgICBjb25zdCBtaXNzaW5nID0gW11cbiAgICBtaXNzaW5nLmxlbmd0aCA9IG5cbiAgICBtaXNzaW5nLmZpbGwoZmFsc2UpXG4gICAgbWlzc2luZ1tyYW5kQmV0d2VlbigwLCBuIC0gMSldID0gdHJ1ZVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGFuZ2xlU3VtLCBhbmdsZXMsIG1pc3NpbmcpXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tUmVwZWF0ZWQgKG9wdGlvbnM6IE9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEge1xuICAgIGNvbnN0IGFuZ2xlU3VtOiBudW1iZXIgPSBvcHRpb25zLmFuZ2xlU3VtXG4gICAgY29uc3QgbWluQW5nbGU6IG51bWJlciA9IG9wdGlvbnMubWluQW5nbGVcblxuICAgIGNvbnN0IG46IG51bWJlciA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTiwgb3B0aW9ucy5tYXhOKVxuXG4gICAgY29uc3QgbTogbnVtYmVyID0gb3B0aW9ucy5uTWlzc2luZyB8fCAoTWF0aC5yYW5kb20oKSA8IDAuMSA/IG4gOiByYW5kQmV0d2VlbigyLCBuIC0gMSkpXG5cbiAgICBpZiAobiA8IDIgfHwgbSA8IDEgfHwgbSA+IG4pIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBhcmd1bWVudHM6IG49JHtufSwgbT0ke219YClcblxuICAgIC8vIEFsbCBtaXNzaW5nIC0gZG8gYXMgYSBzZXBhcmF0ZSBjYXNlXG4gICAgaWYgKG4gPT09IG0pIHtcbiAgICAgIGNvbnN0IGFuZ2xlcyA9IFtdXG4gICAgICBhbmdsZXMubGVuZ3RoID0gblxuICAgICAgYW5nbGVzLmZpbGwoYW5nbGVTdW0gLyBuKVxuXG4gICAgICBjb25zdCBtaXNzaW5nID0gW11cbiAgICAgIG1pc3NpbmcubGVuZ3RoID0gblxuICAgICAgbWlzc2luZy5maWxsKHRydWUpXG5cbiAgICAgIHJldHVybiBuZXcgdGhpcyhhbmdsZVN1bSwgYW5nbGVzLCBtaXNzaW5nKVxuICAgIH1cblxuICAgIGNvbnN0IGFuZ2xlczogbnVtYmVyW10gPSBbXVxuICAgIGNvbnN0IG1pc3Npbmc6IGJvb2xlYW5bXSA9IFtdXG4gICAgbWlzc2luZy5sZW5ndGggPSBuXG4gICAgbWlzc2luZy5maWxsKGZhbHNlKVxuXG4gICAgLy8gY2hvb3NlIGEgdmFsdWUgZm9yIHRoZSBtaXNzaW5nIGFuZ2xlc1xuICAgIGNvbnN0IG1heFJlcGVhdGVkQW5nbGUgPSAoYW5nbGVTdW0gLSBtaW5BbmdsZSAqIChuIC0gbSkpIC8gbVxuICAgIGNvbnN0IHJlcGVhdGVkQW5nbGUgPSByYW5kQmV0d2VlbihtaW5BbmdsZSwgbWF4UmVwZWF0ZWRBbmdsZSlcblxuICAgIC8vIGNob29zZSB2YWx1ZXMgZm9yIHRoZSBvdGhlciBhbmdsZXNcbiAgICBjb25zdCBvdGhlckFuZ2xlczogbnVtYmVyW10gPSBbXVxuICAgIGxldCBsZWZ0ID0gYW5nbGVTdW0gLSByZXBlYXRlZEFuZ2xlICogbVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbiAtIG0gLSAxOyBpKyspIHtcbiAgICAgIGNvbnN0IG1heEFuZ2xlID0gbGVmdCAtIG1pbkFuZ2xlICogKG4gLSBtIC0gaSAtIDEpXG4gICAgICBjb25zdCBuZXh0QW5nbGUgPSByYW5kQmV0d2VlbihtaW5BbmdsZSwgbWF4QW5nbGUpXG4gICAgICBsZWZ0IC09IG5leHRBbmdsZVxuICAgICAgb3RoZXJBbmdsZXMucHVzaChuZXh0QW5nbGUpXG4gICAgfVxuICAgIG90aGVyQW5nbGVzW24gLSBtIC0gMV0gPSBsZWZ0XG5cbiAgICAvLyBjaG9vc2Ugd2hlcmUgdGhlIG1pc3NpbmcgYW5nbGVzIGFyZVxuICAgIHtcbiAgICAgIGxldCBpID0gMFxuICAgICAgd2hpbGUgKGkgPCBtKSB7XG4gICAgICAgIGNvbnN0IGogPSByYW5kQmV0d2VlbigwLCBuIC0gMSlcbiAgICAgICAgaWYgKG1pc3Npbmdbal0gPT09IGZhbHNlKSB7XG4gICAgICAgICAgbWlzc2luZ1tqXSA9IHRydWVcbiAgICAgICAgICBhbmdsZXNbal0gPSByZXBlYXRlZEFuZ2xlXG4gICAgICAgICAgaSsrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBmaWxsIGluIHRoZSBvdGhlciBhbmdsZXNcbiAgICB7XG4gICAgICBsZXQgaiA9IDBcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGlmIChtaXNzaW5nW2ldID09PSBmYWxzZSkge1xuICAgICAgICAgIGFuZ2xlc1tpXSA9IG90aGVyQW5nbGVzW2pdXG4gICAgICAgICAgaisrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ldyB0aGlzKGFuZ2xlU3VtLCBhbmdsZXMsIG1pc3NpbmcpXG4gIH1cblxuICBpbml0TGFiZWxzICgpIDogdm9pZCB7XG4gICAgY29uc3QgbiA9IHRoaXMuYW5nbGVzLmxlbmd0aFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBpZiAoIXRoaXMubWlzc2luZ1tpXSkge1xuICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzW2ldID0gYCR7dGhpcy5hbmdsZXNbaV0udG9TdHJpbmcoKX1eXFxcXGNpcmNgXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzW2ldID0gJ3heXFxcXGNpcmMnXG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iLCIvKiBRdWVzdGlvbiB0eXBlIGNvbXByaXNpbmcgbnVtZXJpY2FsIG1pc3NpbmcgYW5nbGVzIGFyb3VuZCBhIHBvaW50IGFuZFxuICogYW5nbGVzIG9uIGEgc3RyYWlnaHQgbGluZSAoc2luY2UgdGhlc2UgYXJlIHZlcnkgc2ltaWxhciBudW1lcmljYWxseSBhcyB3ZWxsXG4gKiBhcyBncmFwaGljYWxseS5cbiAqXG4gKiBBbHNvIGNvdmVycyBjYXNlcyB3aGVyZSBtb3JlIHRoYW4gb25lIGFuZ2xlIGlzIGVxdWFsXG4gKlxuICovXG5cbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZFEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhXG4gIHZpZXc6IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3XG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhLCB2aWV3OiBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldykgeyAvLyBlZmZlY3RpdmVseSBwcml2YXRlXG4gICAgc3VwZXIoKSAvLyBidWJibGVzIHRvIFFcbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgdGhpcy52aWV3ID0gdmlld1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogTWlzc2luZ0FuZ2xlT3B0aW9ucywgdmlld09wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzQXJvdW5kUSB7XG4gICAgY29uc3QgZGVmYXVsdHMgOiBNaXNzaW5nQW5nbGVPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAxMCxcbiAgICAgIG1pbk46IDIsXG4gICAgICBtYXhOOiA0LFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlXG4gICAgfVxuICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3KGRhdGEsIHZpZXdPcHRpb25zKSAvLyBUT0RPIGVsaW1pbmF0ZSBwdWJsaWMgY29uc3RydWN0b3JzXG5cbiAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRRKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBHcmFwaGljUVZpZXcsIExhYmVsIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgeyBzaW5EZWcsIGRhc2hlZExpbmUsIHJvdW5kRFAgfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICBBIDogUG9pbnQgLy8gdGhlIHZlcnRpY2VzIG9mIHRoZSB0cmlhbmdsZVxuICBCIDogUG9pbnRcbiAgQyA6IFBvaW50XG4gIHJvdGF0aW9uOiBudW1iZXJcbiAgLy8gSW5oZXJpdGVkIG1lbWJlcnM6XG4gIGxhYmVsczogTGFiZWxbXVxuICBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50XG4gIERPTTogSFRNTEVsZW1lbnRcbiAgd2lkdGg6IG51bWJlclxuICBoZWlnaHQ6IG51bWJlclxuICBkYXRhOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhXG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEsIG9wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc2V0cyB0aGlzLndpZHRoIHRoaXMuaGVpZ2h0LCB0aGlzLmRhdGEgaW5pdGlhbGlzZXMgdGhpcy5sYWJlbHMsIGNyZWF0ZXMgZG9tIGVsZW1lbnRzXG4gICAgY29uc3Qgd2lkdGggPSB0aGlzLndpZHRoXG4gICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5oZWlnaHRcblxuICAgIC8vIGdlbmVyYXRlIHBvaW50cyAod2l0aCBsb25nZXN0IHNpZGUgMVxuICAgIHRoaXMuQSA9IG5ldyBQb2ludCgwLCAwKVxuICAgIHRoaXMuQiA9IFBvaW50LmZyb21Qb2xhckRlZygxLCBkYXRhLmFuZ2xlc1swXSlcbiAgICB0aGlzLkMgPSBuZXcgUG9pbnQoXG4gICAgICBzaW5EZWcodGhpcy5kYXRhLmFuZ2xlc1sxXSkgLyBzaW5EZWcodGhpcy5kYXRhLmFuZ2xlc1syXSksIDBcbiAgICApXG5cbiAgICAvLyBDcmVhdGUgbGFiZWxzXG4gICAgY29uc3QgaW5DZW50ZXIgPSBQb2ludC5pbkNlbnRlcih0aGlzLkEsIHRoaXMuQiwgdGhpcy5DKVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGNvbnN0IHAgPSBbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ11baV1cblxuICAgICAgY29uc3QgbGFiZWwgOiBQYXJ0aWFsPExhYmVsPiA9IHtcbiAgICAgICAgdGV4dHE6IHRoaXMuZGF0YS5hbmdsZUxhYmVsc1tpXSxcbiAgICAgICAgdGV4dDogdGhpcy5kYXRhLmFuZ2xlTGFiZWxzW2ldLFxuICAgICAgICBzdHlsZXE6ICdub3JtYWwnLFxuICAgICAgICBzdHlsZTogJ25vcm1hbCcsXG4gICAgICAgIHBvczogUG9pbnQubWVhbihwLCBwLCBpbkNlbnRlcilcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuZGF0YS5taXNzaW5nW2ldKSB7XG4gICAgICAgIGxhYmVsLnRleHRhID0gcm91bmREUCh0aGlzLmRhdGEuYW5nbGVzW2ldLCAyKS50b1N0cmluZygpICsgJ15cXFxcY2lyYydcbiAgICAgICAgbGFiZWwuc3R5bGVhID0gJ2Fuc3dlcidcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxhYmVsLnRleHRhID0gbGFiZWwudGV4dHFcbiAgICAgICAgbGFiZWwuc3R5bGVhID0gbGFiZWwuc3R5bGVxXG4gICAgICB9XG5cbiAgICAgIHRoaXMubGFiZWxzW2ldID0gbGFiZWwgYXMgTGFiZWxcbiAgICB9XG5cbiAgICAvLyByb3RhdGUgcmFuZG9tbHlcbiAgICB0aGlzLnJvdGF0aW9uID0gKG9wdGlvbnMucm90YXRpb24gIT09IHVuZGVmaW5lZCkgPyB0aGlzLnJvdGF0ZShvcHRpb25zLnJvdGF0aW9uKSA6IHRoaXMucmFuZG9tUm90YXRlKClcblxuICAgIC8vIHNjYWxlIGFuZCBmaXRcbiAgICAvLyBzY2FsZSB0byBzaXplXG4gICAgY29uc3QgbWFyZ2luID0gMFxuICAgIGxldCB0b3BsZWZ0ID0gUG9pbnQubWluKFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBsZXQgYm90dG9tcmlnaHQgPSBQb2ludC5tYXgoW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGNvbnN0IHRvdGFsV2lkdGggPSBib3R0b21yaWdodC54IC0gdG9wbGVmdC54XG4gICAgY29uc3QgdG90YWxIZWlnaHQgPSBib3R0b21yaWdodC55IC0gdG9wbGVmdC55XG4gICAgdGhpcy5zY2FsZShNYXRoLm1pbigod2lkdGggLSBtYXJnaW4pIC8gdG90YWxXaWR0aCwgKGhlaWdodCAtIG1hcmdpbikgLyB0b3RhbEhlaWdodCkpIC8vIDE1cHggbWFyZ2luXG5cbiAgICAvLyBtb3ZlIHRvIGNlbnRyZVxuICAgIHRvcGxlZnQgPSBQb2ludC5taW4oW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGJvdHRvbXJpZ2h0ID0gUG9pbnQubWF4KFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBjb25zdCBjZW50ZXIgPSBQb2ludC5tZWFuKHRvcGxlZnQsIGJvdHRvbXJpZ2h0KVxuICAgIHRoaXMudHJhbnNsYXRlKHdpZHRoIC8gMiAtIGNlbnRlci54LCBoZWlnaHQgLyAyIC0gY2VudGVyLnkpIC8vIGNlbnRyZVxuICB9XG5cbiAgcmVuZGVyICgpIDogdm9pZCB7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICAgIGNvbnN0IHZlcnRpY2VzID0gW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdXG4gICAgY29uc3QgYXBleCA9IHRoaXMuZGF0YS5hcGV4IC8vIGhtbW1cblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGN0eC5tb3ZlVG8odGhpcy5BLngsIHRoaXMuQS55KVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGNvbnN0IHAgPSB2ZXJ0aWNlc1tpXVxuICAgICAgY29uc3QgbmV4dCA9IHZlcnRpY2VzWyhpICsgMSkgJSAzXVxuICAgICAgaWYgKGFwZXggPT09IGkgfHwgYXBleCA9PT0gKGkgKyAxKSAlIDMpIHsgLy8gdG8vZnJvbSBhcGV4IC0gZHJhdyBkYXNoZWQgbGluZVxuICAgICAgICBkYXNoZWRMaW5lKGN0eCwgcC54LCBwLnksIG5leHQueCwgbmV4dC55KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3R4LmxpbmVUbyhuZXh0LngsIG5leHQueSlcbiAgICAgIH1cbiAgICB9XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gJ2dyYXknXG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGdldCBhbGxwb2ludHMgKCkgOiBQb2ludFtdIHtcbiAgICBjb25zdCBhbGxwb2ludHMgPSBbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ11cbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4geyBhbGxwb2ludHMucHVzaChsLnBvcykgfSlcbiAgICByZXR1cm4gYWxscG9pbnRzXG4gIH1cbn1cbiIsIi8qIEV4dGVuZHMgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgaW4gb3JkZXIgdG8gZG8gaXNvc2NlbGVzIHRyaWFuZ2xlcywgd2hpY2ggZ2VuZXJhdGUgYSBiaXQgZGlmZmVyZW50bHkgKi9cblxuaW1wb3J0IHsgZmlyc3RVbmlxdWVJbmRleCB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5cbnR5cGUgT3B0aW9ucyA9IE1pc3NpbmdBbmdsZU9wdGlvbnMgJiB7Z2l2ZW5BbmdsZT86ICdhcGV4JyB8ICdiYXNlJ31cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBleHRlbmRzIE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBhcGV4PzogMCB8IDEgfCAyIHwgdW5kZWZpbmVkIC8vIHdoaWNoIG9mIHRoZSB0aHJlZSBnaXZlbiBhbmdsZXMgaXMgdGhlIGFwZXggb2YgYW4gaXNvc2NlbGVzIHRyaWFuZ2xlXG4gICAgY29uc3RydWN0b3IgKGFuZ2xlU3VtOiBudW1iZXIsIGFuZ2xlczogbnVtYmVyW10sIG1pc3Npbmc6IGJvb2xlYW5bXSwgYW5nbGVMYWJlbHM/OiBzdHJpbmdbXSwgYXBleD86IDB8MXwyfHVuZGVmaW5lZCkge1xuICAgICAgc3VwZXIoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZywgYW5nbGVMYWJlbHMpXG4gICAgICB0aGlzLmFwZXggPSBhcGV4XG4gICAgfVxuXG4gICAgc3RhdGljIHJhbmRvbVJlcGVhdGVkIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEge1xuICAgICAgb3B0aW9ucy5uTWlzc2luZyA9IDJcbiAgICAgIG9wdGlvbnMuZ2l2ZW5BbmdsZSA9IG9wdGlvbnMuZ2l2ZW5BbmdsZSB8fCBNYXRoLnJhbmRvbSgpIDwgMC41ID8gJ2FwZXgnIDogJ2Jhc2UnXG5cbiAgICAgIC8vIGdlbmVyYXRlIHRoZSByYW5kb20gYW5nbGVzIHdpdGggcmVwZXRpdGlvbiBmaXJzdCBiZWZvcmUgbWFya2luZyBhcGV4IGZvciBkcmF3aW5nXG4gICAgICBjb25zdCBxdWVzdGlvbiA9IHN1cGVyLnJhbmRvbVJlcGVhdGVkKG9wdGlvbnMpIGFzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEgLy8gYWxsb3dlZCBzaW5jZSB1bmRlZmluZWQgXFxpbiBhcGV4XG5cbiAgICAgIC8vIE9sZCBpbXBsZW1lbnRhdGlvbiBoYWQgc29ydGluZyB0aGUgYXJyYXkgLSBub3Qgc3VyZSB3aHlcbiAgICAgIC8vIHNvcnRUb2dldGhlcihxdWVzdGlvbi5hbmdsZXMscXVlc3Rpb24ubWlzc2luZywoeCx5KSA9PiB4IC0geSlcblxuICAgICAgcXVlc3Rpb24uYXBleCA9IGZpcnN0VW5pcXVlSW5kZXgocXVlc3Rpb24uYW5nbGVzKSBhcyAwIHwgMSB8IDJcbiAgICAgIHF1ZXN0aW9uLm1pc3NpbmcgPSBbdHJ1ZSwgdHJ1ZSwgdHJ1ZV1cblxuICAgICAgaWYgKG9wdGlvbnMuZ2l2ZW5BbmdsZSA9PT0gJ2FwZXgnKSB7XG4gICAgICAgIHF1ZXN0aW9uLm1pc3NpbmdbcXVlc3Rpb24uYXBleF0gPSBmYWxzZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcXVlc3Rpb24ubWlzc2luZ1socXVlc3Rpb24uYXBleCArIDEpICUgM10gPSBmYWxzZVxuICAgICAgfVxuXG4gICAgICBxdWVzdGlvbi5pbml0TGFiZWxzKClcblxuICAgICAgcmV0dXJuIHF1ZXN0aW9uXG4gICAgfVxuXG4gICAgaW5pdExhYmVscyAoKTogdm9pZCB7XG4gICAgICBjb25zdCBuID0gdGhpcy5hbmdsZXMubGVuZ3RoXG4gICAgICBsZXQgaiA9IDAgLy8ga2VlcCB0cmFjayBvZiB1bmtub3duc1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgaWYgKCF0aGlzLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzW2ldID0gYCR7dGhpcy5hbmdsZXNbaV0udG9TdHJpbmcoKX1eXFxcXGNpcmNgXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5hbmdsZUxhYmVsc1tpXSA9IGAke1N0cmluZy5mcm9tQ2hhckNvZGUoMTIwICsgail9XlxcXFxjaXJjYCAvLyAxMjAgPSAneCdcbiAgICAgICAgICBqKytcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbn1cbiIsIi8qIE1pc3NpbmcgYW5nbGVzIGluIHRyaWFuZ2xlIC0gbnVtZXJpY2FsICovXG5cbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGNvbnN0cnVjdG9yIChkYXRhLCB2aWV3LCBvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucykgLy8gdGhpcyBzaG91bGQgYmUgYWxsIHRoYXQncyByZXF1aXJlZCB3aGVuIHJlZmFjdG9yZWRcbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgdGhpcy52aWV3ID0gdmlld1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9ucywgdmlld09wdGlvbnMpIHtcbiAgICBjb25zdCBvcHRpb25zT3ZlcnJpZGUgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDI1LFxuICAgICAgbWluTjogMyxcbiAgICAgIG1heE46IDNcbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24ob3B0aW9ucywgb3B0aW9uc092ZXJyaWRlKVxuICAgIG9wdGlvbnMucmVwZWF0ZWQgPSBvcHRpb25zLnJlcGVhdGVkIHx8IGZhbHNlXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcoZGF0YSwgdmlld09wdGlvbnMpXG5cbiAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEoZGF0YSwgdmlldywgb3B0aW9ucylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIExpbkV4cHIge1xuLy8gY2xhc3MgTGluRXhwciB7XG4gIGNvbnN0cnVjdG9yIChhLCBiKSB7XG4gICAgdGhpcy5hID0gYVxuICAgIHRoaXMuYiA9IGJcbiAgfVxuXG4gIGlzQ29uc3RhbnQgKCkge1xuICAgIHJldHVybiB0aGlzLmEgPT09IDBcbiAgfVxuXG4gIHRvU3RyaW5nICgpIHtcbiAgICBsZXQgc3RyaW5nID0gJydcblxuICAgIC8vIHggdGVybVxuICAgIGlmICh0aGlzLmEgPT09IDEpIHsgc3RyaW5nICs9ICd4JyB9IGVsc2UgaWYgKHRoaXMuYSA9PT0gLTEpIHsgc3RyaW5nICs9ICcteCcgfSBlbHNlIGlmICh0aGlzLmEgIT09IDApIHsgc3RyaW5nICs9IHRoaXMuYSArICd4JyB9XG5cbiAgICAvLyBzaWduXG4gICAgaWYgKHRoaXMuYSAhPT0gMCAmJiB0aGlzLmIgPiAwKSB7IHN0cmluZyArPSAnICsgJyB9IGVsc2UgaWYgKHRoaXMuYSAhPT0gMCAmJiB0aGlzLmIgPCAwKSB7IHN0cmluZyArPSAnIC0gJyB9XG5cbiAgICAvLyBjb25zdGFudFxuICAgIGlmICh0aGlzLmIgPiAwKSB7IHN0cmluZyArPSB0aGlzLmIgfSBlbHNlIGlmICh0aGlzLmIgPCAwICYmIHRoaXMuYSA9PT0gMCkgeyBzdHJpbmcgKz0gdGhpcy5iIH0gZWxzZSBpZiAodGhpcy5iIDwgMCkgeyBzdHJpbmcgKz0gTWF0aC5hYnModGhpcy5iKSB9XG5cbiAgICByZXR1cm4gc3RyaW5nXG4gIH1cblxuICB0b1N0cmluZ1AgKCkge1xuICAgIC8vIHJldHVybiBleHByZXNzaW9uIGFzIGEgc3RyaW5nLCBzdXJyb3VuZGVkIGluIHBhcmVudGhlc2VzIGlmIGEgYmlub21pYWxcbiAgICBpZiAodGhpcy5hID09PSAwIHx8IHRoaXMuYiA9PT0gMCkgcmV0dXJuIHRoaXMudG9TdHJpbmcoKVxuICAgIGVsc2UgcmV0dXJuICcoJyArIHRoaXMudG9TdHJpbmcoKSArICcpJ1xuICB9XG5cbiAgZXZhbCAoeCkge1xuICAgIHJldHVybiB0aGlzLmEgKiB4ICsgdGhpcy5iXG4gIH1cblxuICBhZGQgKHRoYXQpIHtcbiAgICAvLyBhZGQgZWl0aGVyIGFuIGV4cHJlc3Npb24gb3IgYSBjb25zdGFudFxuICAgIGlmICh0aGF0LmEgIT09IHVuZGVmaW5lZCkgcmV0dXJuIG5ldyBMaW5FeHByKHRoaXMuYSArIHRoYXQuYSwgdGhpcy5iICsgdGhhdC5iKVxuICAgIGVsc2UgcmV0dXJuIG5ldyBMaW5FeHByKHRoaXMuYSwgdGhpcy5iICsgdGhhdClcbiAgfVxuXG4gIHRpbWVzICh0aGF0KSB7XG4gICAgcmV0dXJuIG5ldyBMaW5FeHByKHRoaXMuYSAqIHRoYXQsIHRoaXMuYiAqIHRoYXQpXG4gIH1cblxuICBzdGF0aWMgc29sdmUgKGV4cHIxLCBleHByMikge1xuICAgIC8vIHNvbHZlcyB0aGUgdHdvIGV4cHJlc3Npb25zIHNldCBlcXVhbCB0byBlYWNoIG90aGVyXG4gICAgcmV0dXJuIChleHByMi5iIC0gZXhwcjEuYikgLyAoZXhwcjEuYSAtIGV4cHIyLmEpXG4gIH1cbn1cbiIsImltcG9ydCBMaW5FeHByIGZyb20gJ0xpbkV4cHInXG5cbi8qKiBHaXZlbiBhIHNldCBvZiBleHByZXNzaW9ucywgc2V0IHRoZWlyIHN1bSAgKi9cblxuZXhwb3J0IGZ1bmN0aW9uIHNvbHZlQW5nbGVzIChleHByZXNzaW9uczogTGluRXhwcltdLCBhbmdsZVN1bTogbnVtYmVyKTogeyB4OiBudW1iZXI7IGFuZ2xlczogbnVtYmVyW107IH0ge1xuICBjb25zdCBleHByZXNzaW9uU3VtID0gZXhwcmVzc2lvbnMucmVkdWNlKChleHAxLCBleHAyKSA9PiBleHAxLmFkZChleHAyKSlcbiAgY29uc3QgeCA9IExpbkV4cHIuc29sdmUoZXhwcmVzc2lvblN1bSwgbmV3IExpbkV4cHIoMCwgYW5nbGVTdW0pKVxuXG4gIGNvbnN0IGFuZ2xlcyA9IFtdXG4gIGV4cHJlc3Npb25zLmZvckVhY2goZnVuY3Rpb24gKGV4cHIpIHtcbiAgICBjb25zdCBhbmdsZSA9IGV4cHIuZXZhbCh4KVxuICAgIGlmIChhbmdsZSA8PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ25lZ2F0aXZlIGFuZ2xlJylcbiAgICB9IGVsc2Uge1xuICAgICAgYW5nbGVzLnB1c2goZXhwci5ldmFsKHgpKVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gKHsgeDogeCwgYW5nbGVzOiBhbmdsZXMgfSlcbn1cbiIsImltcG9ydCBMaW5FeHByIGZyb20gJ0xpbkV4cHInXG5pbXBvcnQgeyByYW5kQmV0d2VlbiwgcmFuZEVsZW0sIHJhbmRNdWx0QmV0d2Vlbiwgc2h1ZmZsZSwgd2Vha0luY2x1ZGVzIH0gZnJvbSAnVXRpbGl0aWVzJ1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tICcuL0FsZ2VicmFPcHRpb25zJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc0RhdGEgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNEYXRhJ1xuaW1wb3J0IHsgc29sdmVBbmdsZXMgfSBmcm9tICcuL3NvbHZlQW5nbGVzJ1xuXG50eXBlIE9wdGlvbnMgPSBBbGdlYnJhT3B0aW9uc1xuXG5leHBvcnQgdHlwZSBFeHByZXNzaW9uVHlwZSA9ICdhZGQnIHwgJ211bHRpcGx5JyB8ICdtaXhlZCdcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBpbXBsZW1lbnRzIE1pc3NpbmdBbmdsZXNEYXRhIHtcbiAgICBhbmdsZXM6IG51bWJlcltdXG4gICAgbWlzc2luZzogYm9vbGVhbltdXG4gICAgYW5nbGVTdW06IG51bWJlclxuICAgIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXVxuICAgIHg6IG51bWJlciAvL1xuXG4gICAgY29uc3RydWN0b3IgKGFuZ2xlczogbnVtYmVyW10sIG1pc3Npbmc6IGJvb2xlYW5bXSwgYW5nbGVTdW06IG51bWJlciwgYW5nbGVMYWJlbHM6IHN0cmluZ1tdLCB4OiBudW1iZXIpIHtcbiAgICAgIHRoaXMuYW5nbGVzID0gYW5nbGVzXG4gICAgICB0aGlzLmFuZ2xlU3VtID0gYW5nbGVTdW1cbiAgICAgIHRoaXMuYW5nbGVMYWJlbHMgPSBhbmdsZUxhYmVsc1xuICAgICAgdGhpcy54ID0geFxuICAgICAgdGhpcy5taXNzaW5nID0gbWlzc2luZ1xuICAgIH1cblxuICAgIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IE9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIHtcbiAgICAgIGNvbnN0IGRlZmF1bHRzIDogUGFydGlhbDxPcHRpb25zPiA9IHtcbiAgICAgICAgZXhwcmVzc2lvblR5cGVzOiBbJ2FkZCcsICdtdWx0aXBseScsICdtaXhlZCddLFxuICAgICAgICBlbnN1cmVYOiB0cnVlLFxuICAgICAgICBpbmNsdWRlQ29uc3RhbnRzOiB0cnVlLFxuICAgICAgICBtaW5Db2VmZmljaWVudDogMSxcbiAgICAgICAgbWF4Q29lZmZpY2llbnQ6IDQsXG4gICAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICAgIG1pbkFuZ2xlOiAyMCxcbiAgICAgICAgbWluTjogMixcbiAgICAgICAgbWF4TjogNCxcbiAgICAgICAgbWluWFZhbHVlOiAxNVxuICAgICAgfVxuICAgICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgICAvLyBhc3NpZ24gY2FsY3VsYXRlZCBkZWZhdWx0czpcbiAgICAgIG9wdGlvbnMubWF4Q29uc3RhbnQgPSBvcHRpb25zLm1heENvbnN0YW50IHx8IG9wdGlvbnMuYW5nbGVTdW0gLyAyXG4gICAgICBvcHRpb25zLm1heFhWYWx1ZSA9IG9wdGlvbnMubWF4WFZhbHVlIHx8IG9wdGlvbnMuYW5nbGVTdW0gLyA0XG5cbiAgICAgIC8vIFJhbmRvbWlzZS9zZXQgdXAgbWFpbiBmZWF0dXJlc1xuICAgICAgY29uc3QgbiA6IG51bWJlciA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTiwgb3B0aW9ucy5tYXhOKVxuXG4gICAgICBjb25zdCB0eXBlIDogRXhwcmVzc2lvblR5cGUgPSByYW5kRWxlbShvcHRpb25zLmV4cHJlc3Npb25UeXBlcylcblxuICAgICAgLy8gR2VuZXJhdGUgZXhwcmVzc2lvbnMvYW5nbGVzXG4gICAgICBsZXQgZXhwcmVzc2lvbnMgOiBMaW5FeHByW11cbiAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlICdtaXhlZCc6XG4gICAgICAgICAgZXhwcmVzc2lvbnMgPSBtYWtlTWl4ZWRFeHByZXNzaW9ucyhuLCBvcHRpb25zKVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ211bHRpcGx5JzpcbiAgICAgICAgICBleHByZXNzaW9ucyA9IG1ha2VNdWx0aXBsaWNhdGlvbkV4cHJlc3Npb25zKG4sIG9wdGlvbnMpXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAnYWRkJzpcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBleHByZXNzaW9ucyA9IG1ha2VBZGRFeHByZXNzaW9ucyhuLCBvcHRpb25zKVxuICAgICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBleHByZXNzaW9ucyA9IHNodWZmbGUoZXhwcmVzc2lvbnMpXG5cbiAgICAgIC8vIFNvbHZlIGZvciB4IGFuZCBhbmdsZXNcbiAgICAgIGNvbnN0IHsgeCwgYW5nbGVzIH0gOiB7eDpudW1iZXIsIGFuZ2xlczogbnVtYmVyW119ID0gc29sdmVBbmdsZXMoZXhwcmVzc2lvbnMsIG9wdGlvbnMuYW5nbGVTdW0pXG5cbiAgICAgIC8vIGxhYmVscyBhcmUganVzdCBleHByZXNzaW9ucyBhcyBzdHJpbmdzXG4gICAgICBjb25zdCBsYWJlbHMgPSBleHByZXNzaW9ucy5tYXAoZSA9PiBgJHtlLnRvU3RyaW5nUCgpfV5cXFxcY2lyY2ApXG5cbiAgICAgIC8vIG1pc3NpbmcgdmFsdWVzIGFyZSB0aGUgb25lcyB3aGljaCBhcmVuJ3QgY29uc3RhbnRcbiAgICAgIGNvbnN0IG1pc3NpbmcgPSBleHByZXNzaW9ucy5tYXAoZSA9PiAhZS5pc0NvbnN0YW50KCkpXG5cbiAgICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhKGFuZ2xlcywgbWlzc2luZywgb3B0aW9ucy5hbmdsZVN1bSwgbGFiZWxzLCB4KVxuICAgIH1cblxuICAgIC8vIG1ha2VzIHR5cGVzY3JpcHQgc2h1dCB1cCwgbWFrZXMgZXNsaW50IG5vaXN5XG4gICAgaW5pdExhYmVscyAoKSA6IHZvaWQge30gIC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbn1cblxuZnVuY3Rpb24gbWFrZU1peGVkRXhwcmVzc2lvbnMgKG46IG51bWJlciwgb3B0aW9uczogT3B0aW9ucykgOiBMaW5FeHByW10ge1xuICBjb25zdCBleHByZXNzaW9uczogTGluRXhwcltdID0gW11cbiAgY29uc3QgeCA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluWFZhbHVlLCBvcHRpb25zLm1heFhWYWx1ZSlcbiAgbGV0IGxlZnQgPSBvcHRpb25zLmFuZ2xlU3VtXG4gIGxldCBhbGxjb25zdGFudCA9IHRydWVcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuIC0gMTsgaSsrKSB7XG4gICAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKDEsIG9wdGlvbnMubWF4Q29lZmZpY2llbnQpXG4gICAgbGVmdCAtPSBhICogeFxuICAgIGNvbnN0IG1heGIgPSBNYXRoLm1pbihsZWZ0IC0gb3B0aW9ucy5taW5BbmdsZSAqIChuIC0gaSAtIDEpLCBvcHRpb25zLm1heENvbnN0YW50KVxuICAgIGNvbnN0IG1pbmIgPSBvcHRpb25zLm1pbkFuZ2xlIC0gYSAqIHhcbiAgICBjb25zdCBiID0gcmFuZEJldHdlZW4obWluYiwgbWF4YilcbiAgICBpZiAoYSAhPT0gMCkgeyBhbGxjb25zdGFudCA9IGZhbHNlIH1cbiAgICBsZWZ0IC09IGJcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKGEsIGIpKVxuICB9XG4gIGNvbnN0IGxhc3RNaW5YQ29lZmYgPSBhbGxjb25zdGFudCA/IDEgOiBvcHRpb25zLm1pbkNvZWZmaWNpZW50XG4gIGNvbnN0IGEgPSByYW5kQmV0d2VlbihsYXN0TWluWENvZWZmLCBvcHRpb25zLm1heENvZWZmaWNpZW50KVxuICBjb25zdCBiID0gbGVmdCAtIGEgKiB4XG4gIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoYSwgYikpXG5cbiAgcmV0dXJuIGV4cHJlc3Npb25zXG59XG5cbmZ1bmN0aW9uIG1ha2VBZGRFeHByZXNzaW9ucyAobjogbnVtYmVyLCBvcHRpb25zOiBPcHRpb25zKSA6IExpbkV4cHJbXSB7XG4gIGNvbnN0IGV4cHJlc3Npb25zOiBMaW5FeHByW10gPSBbXVxuICBjb25zdCBhbmdsZXM6IG51bWJlcltdID0gW11cbiAgY29uc3QgY29uc3RhbnRzID0gKG9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cyA9PT0gdHJ1ZSB8fCB3ZWFrSW5jbHVkZXMob3B0aW9ucy5pbmNsdWRlQ29uc3RhbnRzLCAnYWRkJykpXG4gIGlmIChuID09PSAyICYmIG9wdGlvbnMuZW5zdXJlWCAmJiBjb25zdGFudHMpIG4gPSAzXG5cbiAgY29uc3QgeCA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluWFZhbHVlLCBvcHRpb25zLm1heFhWYWx1ZSlcbiAgbGV0IGxlZnQgPSBvcHRpb25zLmFuZ2xlU3VtXG4gIGxldCBhbmdsZXNMZWZ0ID0gblxuXG4gIC8vIGZpcnN0IGRvIHRoZSBleHByZXNzaW9ucyBlbnN1cmVkIGJ5IGVuc3VyZV94IGFuZCBjb25zdGFudHNcbiAgaWYgKG9wdGlvbnMuZW5zdXJlWCkge1xuICAgIGFuZ2xlc0xlZnQtLVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgMCkpXG4gICAgYW5nbGVzLnB1c2goeClcbiAgICBsZWZ0IC09IHhcbiAgfVxuXG4gIGlmIChjb25zdGFudHMpIHtcbiAgICBhbmdsZXNMZWZ0LS1cbiAgICBjb25zdCBjID0gcmFuZEJldHdlZW4oXG4gICAgICBvcHRpb25zLm1pbkFuZ2xlLFxuICAgICAgbGVmdCAtIG9wdGlvbnMubWluQW5nbGUgKiBhbmdsZXNMZWZ0XG4gICAgKVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMCwgYykpXG4gICAgYW5nbGVzLnB1c2goYylcbiAgICBsZWZ0IC09IGNcbiAgfVxuXG4gIC8vIG1pZGRsZSBhbmdsZXNcbiAgd2hpbGUgKGFuZ2xlc0xlZnQgPiAxKSB7XG4gICAgLy8gYWRkICd4K2InIGFzIGFuIGV4cHJlc3Npb24uIE1ha2Ugc3VyZSBiIGdpdmVzIHNwYWNlXG4gICAgYW5nbGVzTGVmdC0tXG4gICAgbGVmdCAtPSB4XG4gICAgY29uc3QgbWF4YiA9IE1hdGgubWluKFxuICAgICAgbGVmdCAtIG9wdGlvbnMubWluQW5nbGUgKiBhbmdsZXNMZWZ0LFxuICAgICAgb3B0aW9ucy5tYXhDb25zdGFudFxuICAgIClcbiAgICBjb25zdCBtaW5iID0gTWF0aC5tYXgoXG4gICAgICBvcHRpb25zLm1pbkFuZ2xlIC0geCxcbiAgICAgIC1vcHRpb25zLm1heENvbnN0YW50XG4gICAgKVxuICAgIGNvbnN0IGIgPSByYW5kQmV0d2VlbihtaW5iLCBtYXhiKVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgYikpXG4gICAgYW5nbGVzLnB1c2goeCArIGIpXG4gICAgbGVmdCAtPSBiXG4gIH1cblxuICAvLyBsYXN0IGFuZ2xlXG4gIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgbGVmdCAtIHgpKVxuICBhbmdsZXMucHVzaChsZWZ0KVxuXG4gIHJldHVybiBleHByZXNzaW9uc1xufVxuXG5mdW5jdGlvbiBtYWtlTXVsdGlwbGljYXRpb25FeHByZXNzaW9ucyAobjogbnVtYmVyLCBvcHRpb25zOiBPcHRpb25zKSA6IExpbkV4cHJbXSB7XG4gIGNvbnN0IGV4cHJlc3Npb25zIDogTGluRXhwcltdID0gW11cblxuICBjb25zdCBjb25zdGFudHMgOiBib29sZWFuID0gKG9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cyA9PT0gdHJ1ZSB8fCB3ZWFrSW5jbHVkZXMob3B0aW9ucy5pbmNsdWRlQ29uc3RhbnRzLCAnbXVsdCcpKVxuICBpZiAobiA9PT0gMiAmJiBvcHRpb25zLmVuc3VyZVggJiYgY29uc3RhbnRzKSBuID0gMyAvLyBuZWVkIGF0IGxlYXN0IDMgYW5nbGVzIGZvciB0aGlzIHRvIG1ha2Ugc2Vuc2VcblxuICAvLyBjaG9vc2UgYSB0b3RhbCBvZiBjb2VmZmljaWVudHNcbiAgLy8gcGljayB4IGJhc2VkIG9uIHRoYXRcbiAgbGV0IGFuZ2xlc2xlZnQgPSBuXG4gIGNvbnN0IHRvdGFsQ29lZmYgPSBjb25zdGFudHNcbiAgICA/IHJhbmRCZXR3ZWVuKG4sIChvcHRpb25zLmFuZ2xlU3VtIC0gb3B0aW9ucy5taW5BbmdsZSkgLyBvcHRpb25zLm1pbkFuZ2xlLCBNYXRoLnJhbmRvbSkgLy8gaWYgaXQncyB0b28gYmlnLCBhbmdsZXMgZ2V0IHRvbyBzbWFsbFxuICAgIDogcmFuZEVsZW0oWzMsIDQsIDUsIDYsIDgsIDksIDEwXS5maWx0ZXIoeCA9PiB4ID49IG4pLCBNYXRoLnJhbmRvbSlcbiAgbGV0IGNvZWZmbGVmdCA9IHRvdGFsQ29lZmZcblxuICAvLyBmaXJzdCAwLzEvMlxuICBpZiAoY29uc3RhbnRzKSB7XG4gICAgLy8gcmVkdWNlIHRvIG1ha2Ugd2hhdCdzIGxlZnQgYSBtdWx0aXBsZSBvZiB0b3RhbF9jb2VmZlxuICAgIGFuZ2xlc2xlZnQtLVxuICAgIGNvbnN0IG5ld2xlZnQgPSByYW5kTXVsdEJldHdlZW4odG90YWxDb2VmZiAqIG9wdGlvbnMubWluQW5nbGUsIG9wdGlvbnMuYW5nbGVTdW0gLSBvcHRpb25zLm1pbkFuZ2xlLCB0b3RhbENvZWZmKVxuICAgIGNvbnN0IGMgPSBvcHRpb25zLmFuZ2xlU3VtIC0gbmV3bGVmdFxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMCwgYykpXG4gIH1cblxuICAvLyBEb24ndCB1c2UgeCBoZXJlLCBidXQ6XG4gIC8vIHggPSBsZWZ0IC8gdG90YWxDb2VmZlxuXG4gIGlmIChvcHRpb25zLmVuc3VyZVgpIHtcbiAgICBhbmdsZXNsZWZ0LS1cbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKVxuICAgIGNvZWZmbGVmdCAtPSAxXG4gIH1cblxuICAvLyBtaWRkbGVcbiAgd2hpbGUgKGFuZ2xlc2xlZnQgPiAxKSB7XG4gICAgYW5nbGVzbGVmdC0tXG4gICAgY29uc3QgbWluYSA9IDFcbiAgICBjb25zdCBtYXhhID0gY29lZmZsZWZ0IC0gYW5nbGVzbGVmdCAvLyBsZWF2ZSBlbm91Z2ggZm9yIG90aGVycyBUT0RPOiBhZGQgbWF4X2NvZWZmXG4gICAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKG1pbmEsIG1heGEpXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihhLCAwKSlcbiAgICBjb2VmZmxlZnQgLT0gYVxuICB9XG5cbiAgLy8gbGFzdFxuICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKGNvZWZmbGVmdCwgMCkpXG4gIHJldHVybiBleHByZXNzaW9uc1xufVxuIiwiaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgTGFiZWwgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcgZXh0ZW5kcyBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyB7XG4gICAgTyA6IFBvaW50XG4gICAgQTogUG9pbnRcbiAgICBDOiBQb2ludFtdXG4gICAgbGFiZWxzOiBMYWJlbFtdXG4gICAgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudFxuICAgIERPTTogSFRNTEVsZW1lbnRcbiAgICByb3RhdGlvbjogbnVtYmVyXG4gICAgd2lkdGg6IG51bWJlclxuICAgIGhlaWdodDogbnVtYmVyXG4gICAgZGF0YTogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhXG5cbiAgICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLCBvcHRpb25zOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIHtcbiAgICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIHN1cGVyIGNvbnN0cnVjdG9yIGRvZXMgcmVhbCB3b3JrXG4gICAgICBjb25zdCBzb2x1dGlvbkxhYmVsOiBQYXJ0aWFsPExhYmVsPiA9IHtcbiAgICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIHRoaXMuaGVpZ2h0IC0gMTApLFxuICAgICAgICB0ZXh0cTogJycsXG4gICAgICAgIHRleHRhOiBgeCA9ICR7dGhpcy5kYXRhLnh9XlxcXFxjaXJjYCxcbiAgICAgICAgc3R5bGVxOiAnaGlkZGVuJyxcbiAgICAgICAgc3R5bGVhOiAnZXh0cmEtYW5zd2VyJ1xuICAgICAgfVxuICAgICAgc29sdXRpb25MYWJlbC5zdHlsZSA9IHNvbHV0aW9uTGFiZWwuc3R5bGVxXG4gICAgICBzb2x1dGlvbkxhYmVsLnRleHQgPSBzb2x1dGlvbkxhYmVsLnRleHRxXG5cbiAgICAgIHRoaXMubGFiZWxzLnB1c2goc29sdXRpb25MYWJlbCBhcyBMYWJlbClcbiAgICB9XG59XG4iLCIvKiogTWlzc2luZyBhbmdsZXMgYXJvdW5kIGEgcG9pbnQgb3Igb24gYSBzdHJhaWdodCBsaW5lLCB1c2luZyBhbGdlYnJhaWMgZXhwcmVzc2lvbnMgKi9cblxuaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCB7IEFsZ2VicmFPcHRpb25zIH0gZnJvbSAnLi9BbGdlYnJhT3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3J1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzVmlld09wdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YTogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhXG4gIHZpZXc6IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlld1xuXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEsIHZpZXc6IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlldykgeyAvLyBlZmZlY3RpdmVseSBwcml2YXRlXG4gICAgc3VwZXIoKSAvLyBidWJibGVzIHRvIFFcbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgdGhpcy52aWV3ID0gdmlld1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogQWxnZWJyYU9wdGlvbnMsIHZpZXdPcHRpb25zOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IEFsZ2VicmFPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAxMCxcbiAgICAgIG1pbk46IDIsXG4gICAgICBtYXhOOiA0LFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlXG4gICAgfVxuICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEucmFuZG9tKG9wdGlvbnMpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcoZGF0YSwgdmlld09wdGlvbnMpIC8vIFRPRE8gZWxpbWluYXRlIHB1YmxpYyBjb25zdHJ1Y3RvcnNcblxuICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBMYWJlbCB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVZpZXcgZXh0ZW5kcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IHtcbiAgZGF0YTogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEsIG9wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucylcblxuICAgIGNvbnN0IHNvbHV0aW9uTGFiZWw6IFBhcnRpYWw8TGFiZWw+ID0ge1xuICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIHRoaXMuaGVpZ2h0IC0gMTApLFxuICAgICAgdGV4dHE6ICcnLFxuICAgICAgdGV4dGE6IGB4ID0gJHt0aGlzLmRhdGEueH1eXFxcXGNpcmNgLFxuICAgICAgc3R5bGVxOiAnaGlkZGVuJyxcbiAgICAgIHN0eWxlYTogJ2V4dHJhLWFuc3dlcidcbiAgICB9XG4gICAgc29sdXRpb25MYWJlbC5zdHlsZSA9IHNvbHV0aW9uTGFiZWwuc3R5bGVxXG4gICAgc29sdXRpb25MYWJlbC50ZXh0ID0gc29sdXRpb25MYWJlbC50ZXh0cVxuXG4gICAgdGhpcy5sYWJlbHMucHVzaChzb2x1dGlvbkxhYmVsIGFzIExhYmVsKVxuICB9XG59XG4iLCJpbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tICcuL0FsZ2VicmFPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFWaWV3J1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3J1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YTogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhXG4gIHZpZXc6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXdcblxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLCB2aWV3OiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3KSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICB0aGlzLnZpZXcgPSB2aWV3XG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBBbGdlYnJhT3B0aW9ucywgdmlld09wdGlvbnM6IFZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFRIHtcbiAgICBjb25zdCBvcHRpb25zT3ZlcnJpZGUgOiBBbGdlYnJhT3B0aW9ucyA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5OOiAzLFxuICAgICAgbWF4TjogMyxcbiAgICAgIHJlcGVhdGVkOiBmYWxzZVxuICAgIH1cbiAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIG9wdGlvbnNPdmVycmlkZSlcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEucmFuZG9tKG9wdGlvbnMpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldyhkYXRhLCB2aWV3T3B0aW9ucylcblxuICAgIHJldHVybiBuZXcgdGhpcyhkYXRhLCB2aWV3KVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSA6IHN0cmluZyB7IHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZScgfVxufVxuIiwiaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgTGFiZWwgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldydcbmltcG9ydCBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3IGV4dGVuZHMgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSwgb3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKVxuICAgIHN1cGVyLnNjYWxlVG9GaXQodGhpcy53aWR0aCwgdGhpcy5oZWlnaHQsIDQwKVxuICAgIHN1cGVyLnRyYW5zbGF0ZSgwLCAtMzApXG5cbiAgICBjb25zdCBpbnN0cnVjdGlvbkxhYmVsOiBMYWJlbCA9IHtcbiAgICAgIHRleHRxOiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICB0ZXh0YTogdGhpcy5kYXRhLmluc3RydWN0aW9ucy5qb2luKCdcXFxcXFxcXCcpLFxuICAgICAgdGV4dDogdGhpcy5kYXRhLmluc3RydWN0aW9ucy5qb2luKCdcXFxcXFxcXCcpLFxuICAgICAgc3R5bGVxOiAnZXh0cmEtaW5mbycsXG4gICAgICBzdHlsZWE6ICdleHRyYS1pbmZvJyxcbiAgICAgIHN0eWxlOiAnZXh0cmEtaW5mbycsXG4gICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdGhpcy5oZWlnaHQgLSAxMClcbiAgICB9XG4gICAgdGhpcy5sYWJlbHMucHVzaChpbnN0cnVjdGlvbkxhYmVsKVxuICB9XG59XG4iLCJpbXBvcnQgTGluRXhwciBmcm9tICdMaW5FeHByJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4sIHJhbmRFbGVtLCByYW5kTXVsdEJldHdlZW4gfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhJ1xuaW1wb3J0IHsgc29sdmVBbmdsZXMgfSBmcm9tICcuL3NvbHZlQW5nbGVzJ1xuaW1wb3J0IHsgV29yZGVkT3B0aW9ucyB9IGZyb20gJy4vV29yZGVkT3B0aW9ucydcblxuZXhwb3J0IHR5cGUgV29yZGVkVHlwZSA9ICdhZGQnIHwgJ211bHRpcGx5JyB8ICdyYXRpbycgfCAncGVyY2VudCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgZXh0ZW5kcyBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEge1xuICBhbmdsZXM6IG51bWJlcltdIC8vIEluaGVyaXRlZFxuICBtaXNzaW5nOiBib29sZWFuW10gLy8gICAgfFxuICBhbmdsZVN1bTogbnVtYmVyIC8vICAgIHxcbiAgYW5nbGVMYWJlbHM6IHN0cmluZ1tdIC8vICAgIHZcbiAgaW5zdHJ1Y3Rpb25zOiBzdHJpbmdbXSAvLyBUaGUgJ2luc3RydWN0aW9ucycgZ2l2ZW5cbiAgeDogbnVtYmVyIC8vIHVudXNlZCBidXQgaW5oZXJpdGVkXG5cbiAgY29uc3RydWN0b3IgKGFuZ2xlczogbnVtYmVyW10sIG1pc3Npbmc6IGJvb2xlYW5bXSwgYW5nbGVTdW06IG51bWJlciwgYW5nbGVMYWJlbHM6IHN0cmluZ1tdLCBpbnN0cnVjdGlvbnM6IHN0cmluZ1tdKSB7XG4gICAgc3VwZXIoYW5nbGVzLCBtaXNzaW5nLCBhbmdsZVN1bSwgYW5nbGVMYWJlbHMsIG51bGwpXG4gICAgdGhpcy5pbnN0cnVjdGlvbnMgPSBpbnN0cnVjdGlvbnNcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnMgOiBXb3JkZWRPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IFdvcmRlZE9wdGlvbnMgPSB7XG4gICAgICBtaW5OOiAyLFxuICAgICAgbWF4TjogMixcbiAgICAgIG1pbkFuZ2xlOiAxMCxcbiAgICAgIG1pbkFkZGVuZDogLTkwLFxuICAgICAgbWF4QWRkZW5kOiA5MCxcbiAgICAgIG1pbk11bHRpcGxpZXI6IDEsXG4gICAgICBtYXhNdWx0aXBsaWVyOiA1LFxuICAgICAgdHlwZXM6IFsnYWRkJywgJ211bHRpcGx5JywgJ3BlcmNlbnQnLCAncmF0aW8nXVxuICAgIH1cbiAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICBjb25zdCBuID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5OLCBvcHRpb25zLm1heE4pXG4gICAgY29uc3QgYW5nbGVMYWJlbHM6IHN0cmluZ1tdID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgYW5nbGVMYWJlbHNbaV0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSkgLy8gNjUgPSAnQSdcbiAgICB9XG4gICAgbGV0IGV4cHJlc3Npb25zOiBMaW5FeHByW10gPSBbXVxuICAgIGxldCBpbnN0cnVjdGlvbnM6IHN0cmluZ1tdID0gW11cblxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgMCkpXG5cbiAgICAvLyBMb29wIHRpbCB3ZSBnZXQgb25lIHRoYXQgd29ya3NcbiAgICAvLyBQcm9iYWJseSByZWFsbHkgaW5lZmZpY2llbnQhIVxuXG4gICAgbGV0IHN1Y2Nlc3MgPSBmYWxzZVxuICAgIGxldCBhdHRlbXB0Y291bnQgPSAwXG4gICAgd2hpbGUgKCFzdWNjZXNzKSB7XG4gICAgICBpZiAoYXR0ZW1wdGNvdW50ID4gMjApIHtcbiAgICAgICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCAwKSlcbiAgICAgICAgY29uc29sZS5sb2coJ0dhdmUgdXAgYWZ0ZXIgJyArIGF0dGVtcHRjb3VudCArICcgYXR0ZW1wdHMnKVxuICAgICAgICBzdWNjZXNzID0gdHJ1ZVxuICAgICAgfVxuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgY29uc3QgdHlwZSA9IHJhbmRFbGVtKG9wdGlvbnMudHlwZXMpXG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgIGNhc2UgJ2FkZCc6IHtcbiAgICAgICAgICAgIGNvbnN0IGFkZGVuZCA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluQWRkZW5kLCBvcHRpb25zLm1heEFkZGVuZClcbiAgICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2goZXhwcmVzc2lvbnNbaSAtIDFdLmFkZChhZGRlbmQpKVxuICAgICAgICAgICAgaW5zdHJ1Y3Rpb25zLnB1c2goYFxcXFx0ZXh0e0FuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKX0kIGlzICR7Y29tcGFyYXRvcihhZGRlbmQsICcrJyl9IGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjQgKyBpKX0kfWApXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlICdtdWx0aXBseSc6IHtcbiAgICAgICAgICAgIGNvbnN0IG11bHRpcGxpZXIgPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbk11bHRpcGxpZXIsIG9wdGlvbnMubWF4TXVsdGlwbGllcilcbiAgICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2goZXhwcmVzc2lvbnNbaSAtIDFdLnRpbWVzKG11bHRpcGxpZXIpKVxuICAgICAgICAgICAgaW5zdHJ1Y3Rpb25zLnB1c2goYFxcXFx0ZXh0e0FuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKX0kIGlzICR7Y29tcGFyYXRvcihtdWx0aXBsaWVyLCAnKicpfSBhbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY0ICsgaSl9JH1gKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSAncGVyY2VudCc6IHtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnRhZ2UgPSByYW5kTXVsdEJldHdlZW4oNSwgMTAwLCA1KVxuICAgICAgICAgICAgY29uc3QgaW5jcmVhc2UgPSBNYXRoLnJhbmRvbSgpIDwgMC41XG4gICAgICAgICAgICBjb25zdCBtdWx0aXBsaWVyID0gaW5jcmVhc2UgPyAxICsgcGVyY2VudGFnZSAvIDEwMCA6IDEgLSBwZXJjZW50YWdlIC8gMTAwXG4gICAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb25zW2kgLSAxXS50aW1lcyhtdWx0aXBsaWVyKSlcbiAgICAgICAgICAgIGluc3RydWN0aW9ucy5wdXNoKFxuICAgICAgICAgICAgICBgXFxcXHRleHR7QW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpfSQgaXMgJCR7cGVyY2VudGFnZX1cXFxcJSQgJHtpbmNyZWFzZSA/ICdiaWdnZXInIDogJ3NtYWxsZXInfSB0aGFuIGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjQgKyBpKX0kfWApXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlICdyYXRpbyc6IHtcbiAgICAgICAgICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbigxLCAxMClcbiAgICAgICAgICAgIGNvbnN0IGIgPSByYW5kQmV0d2VlbigxLCAxMClcbiAgICAgICAgICAgIGNvbnN0IG11bHRpcGxpZXIgPSBiIC8gYVxuICAgICAgICAgICAgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uc1tpIC0gMV0udGltZXMobXVsdGlwbGllcikpXG4gICAgICAgICAgICBpbnN0cnVjdGlvbnMucHVzaChcbiAgICAgICAgICAgICAgYFxcXFx0ZXh0e1RoZSByYXRpbyBvZiBhbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY0ICsgaSl9JCB0byBhbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSl9JCBpcyAkJHthfToke2J9JH1gXG4gICAgICAgICAgICApXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBjaGVjayBpdCBtYWtlcyBzZW5zZVxuICAgICAgc3VjY2VzcyA9IHRydWVcbiAgICAgIGNvbnN0IGV4cHJlc3Npb25zdW0gPSBleHByZXNzaW9ucy5yZWR1Y2UoKGV4cDEsIGV4cDIpID0+IGV4cDEuYWRkKGV4cDIpKVxuICAgICAgY29uc3QgeCA9IExpbkV4cHIuc29sdmUoZXhwcmVzc2lvbnN1bSwgbmV3IExpbkV4cHIoMCwgb3B0aW9ucy5hbmdsZVN1bSkpXG5cbiAgICAgIGV4cHJlc3Npb25zLmZvckVhY2goZnVuY3Rpb24gKGV4cHIpIHtcbiAgICAgICAgaWYgKCFzdWNjZXNzIHx8IGV4cHIuZXZhbCh4KSA8IG9wdGlvbnMubWluQW5nbGUpIHtcbiAgICAgICAgICBzdWNjZXNzID0gZmFsc2VcbiAgICAgICAgICBpbnN0cnVjdGlvbnMgPSBbXVxuICAgICAgICAgIGV4cHJlc3Npb25zID0gW2V4cHJlc3Npb25zWzBdXVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICBhdHRlbXB0Y291bnQrK1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygnQXR0ZW1wdHM6ICcgKyBhdHRlbXB0Y291bnQpXG5cbiAgICBjb25zdCBhbmdsZXMgPSBzb2x2ZUFuZ2xlcyhleHByZXNzaW9ucywgb3B0aW9ucy5hbmdsZVN1bSkuYW5nbGVzXG4gICAgY29uc3QgbWlzc2luZyA9IGFuZ2xlcy5tYXAoKCkgPT4gdHJ1ZSlcblxuICAgIHJldHVybiBuZXcgdGhpcyhhbmdsZXMsIG1pc3NpbmcsIG9wdGlvbnMuYW5nbGVTdW0sIGFuZ2xlTGFiZWxzLCBpbnN0cnVjdGlvbnMpXG4gIH1cbn1cblxuLyoqXG4gKiBHZW5lcmF0ZXMgd29yZGVkIHZlcnNpb24gb2YgYW4gb3BlcmF0aW9cbiAqIEBwYXJhbSBudW1iZXIgVGhlIG11bHRpcGxpZXIgb3IgYWRkZW5kXG4gKiBAcGFyYW0gb3BlcmF0b3IgVGhlIG9wZXJhdG9yLCBlLmcgYWRkaW5nICdtb3JlIHRoYW4nLCBvciBtdWx0aXBseWluZyAndGltZXMgbGFyZ2VyIHRoYW4nXG4gKi9cbmZ1bmN0aW9uIGNvbXBhcmF0b3IgKG51bWJlcjogbnVtYmVyLCBvcGVyYXRvcjogJyonfCcrJykge1xuICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgY2FzZSAnKic6XG4gICAgICBzd2l0Y2ggKG51bWJlcikge1xuICAgICAgICBjYXNlIDE6IHJldHVybiAndGhlIHNhbWUgYXMnXG4gICAgICAgIGNhc2UgMjogcmV0dXJuICdkb3VibGUnXG4gICAgICAgIGRlZmF1bHQ6IHJldHVybiBgJCR7bnVtYmVyfSQgdGltZXMgbGFyZ2VyIHRoYW5gXG4gICAgICB9XG4gICAgY2FzZSAnKyc6XG4gICAgICBzd2l0Y2ggKG51bWJlcikge1xuICAgICAgICBjYXNlIDA6IHJldHVybiAndGhlIHNhbWUgYXMnXG4gICAgICAgIGRlZmF1bHQ6IHJldHVybiBgJCR7TWF0aC5hYnMobnVtYmVyKS50b1N0cmluZygpfV5cXFxcY2lyYyQgJHsobnVtYmVyIDwgMCkgPyAnbGVzcyB0aGFuJyA6ICdtb3JlIHRoYW4nfWBcbiAgICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tICcuLi9WaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkVmlldydcbmltcG9ydCBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhJ1xuaW1wb3J0IHsgV29yZGVkT3B0aW9ucyB9IGZyb20gJy4vV29yZGVkT3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGFcbiAgdmlldzogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkVmlld1xuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEsIHZpZXc6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFZpZXcpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIHRoaXMudmlldyA9IHZpZXdcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFdvcmRlZE9wdGlvbnMsIHZpZXdPcHRpb25zOiBWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRRIHtcbiAgICBjb25zdCBvcHRpb25zT3ZlcnJpZGUgOiBXb3JkZWRPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbk46IDMsXG4gICAgICBtYXhOOiAzLFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlXG4gICAgfVxuICAgIE9iamVjdC5hc3NpZ24ob3B0aW9ucywgb3B0aW9uc092ZXJyaWRlKVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkVmlldyhkYXRhLCB2aWV3T3B0aW9ucylcblxuICAgIHJldHVybiBuZXcgdGhpcyhkYXRhLCB2aWV3KVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSA6IHN0cmluZyB7IHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZScgfVxufVxuIiwiaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgTGFiZWwgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNBcm91bmRWaWV3J1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzV29yZGVkRGF0YSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcgZXh0ZW5kcyBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSwgb3B0aW9uczogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gZG9lcyBtb3N0IG9mIHRoZSBzZXQgdXBcbiAgICBzdXBlci50cmFuc2xhdGUoMCwgLTE1KVxuICAgIGNvbnN0IGluc3RydWN0aW9uTGFiZWwgOiBMYWJlbCA9IHtcbiAgICAgIHRleHRxOiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICB0ZXh0YTogdGhpcy5kYXRhLmluc3RydWN0aW9ucy5qb2luKCdcXFxcXFxcXCcpLFxuICAgICAgdGV4dDogdGhpcy5kYXRhLmluc3RydWN0aW9ucy5qb2luKCdcXFxcXFxcXCcpLFxuICAgICAgc3R5bGVxOiAnZXh0cmEtaW5mbycsXG4gICAgICBzdHlsZWE6ICdleHRyYS1pbmZvJyxcbiAgICAgIHN0eWxlOiAnZXh0cmEtaW5mbycsXG4gICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdGhpcy5oZWlnaHQgLSAxMClcbiAgICB9XG4gICAgdGhpcy5sYWJlbHMucHVzaChpbnN0cnVjdGlvbkxhYmVsKVxuICB9XG59XG4iLCJpbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3IGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcbmltcG9ydCBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNXb3JkZWREYXRhJ1xuaW1wb3J0IHsgV29yZGVkT3B0aW9ucyB9IGZyb20gJy4vV29yZGVkT3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1dvcmRlZFEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhXG4gIHZpZXc6IE1pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3XG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLCB2aWV3OiBNaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldykge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgdGhpcy52aWV3ID0gdmlld1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogV29yZGVkT3B0aW9ucywgdmlld09wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzV29yZGVkUSB7XG4gICAgY29uc3QgZGVmYXVsdHMgOiBXb3JkZWRPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAxMCxcbiAgICAgIG1pbk46IDIsXG4gICAgICBtYXhOOiAyLFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlXG4gICAgfVxuICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIHZpZXdPcHRpb25zID0gdmlld09wdGlvbnMgfHwge31cblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3KGRhdGEsIHZpZXdPcHRpb25zKVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGRhdGEsIHZpZXcpXG4gIH1cbn1cbiIsIi8qKiAgQ2xhc3MgdG8gd3JhcCB2YXJpb3VzIG1pc3NpbmcgYW5nbGVzIGNsYXNzZXNcbiAqIFJlYWRzIG9wdGlvbnMgYW5kIHRoZW4gd3JhcHMgdGhlIGFwcHJvcHJpYXRlIG9iamVjdCwgbWlycm9yaW5nIHRoZSBtYWluXG4gKiBwdWJsaWMgbWV0aG9kc1xuICpcbiAqIFRoaXMgY2xhc3MgZGVhbHMgd2l0aCB0cmFuc2xhdGluZyBkaWZmaWN1bHR5IGludG8gcXVlc3Rpb24gdHlwZXNcbiovXG5cbmltcG9ydCB7IE9wdGlvbnNTcGVjIH0gZnJvbSAnT3B0aW9uc1NwZWMnXG5pbXBvcnQgeyByYW5kRWxlbSB9IGZyb20gJ1V0aWxpdGllcydcblxuaW1wb3J0IFF1ZXN0aW9uIGZyb20gJ1F1ZXN0aW9uL1F1ZXN0aW9uJ1xuaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICcuLi9HcmFwaGljUSdcblxuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRRIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZFEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVPcHRpb25zIH0gZnJvbSAnLi9OdW1iZXJPcHRpb25zJ1xuXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRIGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFRIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEnXG5pbXBvcnQgeyBBbGdlYnJhT3B0aW9ucyB9IGZyb20gJy4vQWxnZWJyYU9wdGlvbnMnXG5cbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVXb3JkZWRRIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlV29yZGVkUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzV29yZGVkUSBmcm9tICcuL01pc3NpbmdBbmdsZXNXb3JkZWRRJ1xuaW1wb3J0IHsgV29yZGVkT3B0aW9ucyB9IGZyb20gJy4vV29yZGVkT3B0aW9ucydcblxuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzVmlld09wdGlvbnMnXG5cbnR5cGUgUXVlc3Rpb25UeXBlID0gJ2Fvc2wnIHwgJ2FhYXAnIHwgJ3RyaWFuZ2xlJ1xudHlwZSBRdWVzdGlvblN1YlR5cGUgPSAnc2ltcGxlJyB8ICdyZXBlYXRlZCcgfCAnYWxnZWJyYScgfCAnd29yZGVkJ1xuXG50eXBlIFF1ZXN0aW9uT3B0aW9ucyA9IE1pc3NpbmdBbmdsZU9wdGlvbnMgJiBBbGdlYnJhT3B0aW9ucyAmIFdvcmRlZE9wdGlvbnNcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1EgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIHF1ZXN0aW9uOiBHcmFwaGljUVxuXG4gIGNvbnN0cnVjdG9yIChxdWVzdGlvbjogR3JhcGhpY1EpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5xdWVzdGlvbiA9IHF1ZXN0aW9uXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChcbiAgICBvcHRpb25zOiB7XG4gICAgICB0eXBlczogUXVlc3Rpb25UeXBlW10sXG4gICAgICBkaWZmaWN1bHR5OiBudW1iZXIsXG4gICAgICBjdXN0b206IGJvb2xlYW4sXG4gICAgICBzdWJ0eXBlPzogUXVlc3Rpb25TdWJUeXBlXG4gICAgfSkgOiBNaXNzaW5nQW5nbGVzUSB7XG4gICAgaWYgKG9wdGlvbnMudHlwZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1R5cGVzIGxpc3QgbXVzdCBiZSBub24tZW1wdHknKVxuICAgIH1cblxuICAgIGNvbnN0IHR5cGUgPSByYW5kRWxlbShvcHRpb25zLnR5cGVzKVxuICAgIGxldCBzdWJ0eXBlIDogUXVlc3Rpb25TdWJUeXBlXG4gICAgY29uc3QgcXVlc3Rpb25PcHRpb25zIDogUXVlc3Rpb25PcHRpb25zID0ge31cblxuICAgIHN3aXRjaCAob3B0aW9ucy5kaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHN1YnR5cGUgPSAnc2ltcGxlJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDJcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSAyXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDI6XG4gICAgICAgIHN1YnR5cGUgPSAnc2ltcGxlJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDNcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSA0XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDM6XG4gICAgICAgIHN1YnR5cGUgPSAncmVwZWF0ZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gM1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDRcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNDpcbiAgICAgICAgc3VidHlwZSA9ICdhbGdlYnJhJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZXhwcmVzc2lvblR5cGVzID0gWydtdWx0aXBseSddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5pbmNsdWRlQ29uc3RhbnRzID0gZmFsc2VcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAyXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gNFxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA1OlxuICAgICAgICBzdWJ0eXBlID0gJ2FsZ2VicmEnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5leHByZXNzaW9uVHlwZXMgPSBbJ2FkZCcsICdtdWx0aXBseSddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5pbmNsdWRlQ29uc3RhbnRzID0gWydtdWx0aXBseSddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5lbnN1cmVYID0gdHJ1ZVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDJcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSAzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDY6XG4gICAgICAgIHN1YnR5cGUgPSAnYWxnZWJyYSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmV4cHJlc3Npb25UeXBlcyA9IFsnbWl4ZWQnXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDJcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSAzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDc6XG4gICAgICAgIHN1YnR5cGUgPSAnd29yZGVkJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMudHlwZXMgPSBbcmFuZEVsZW0oWydhZGQnLCAnbXVsdGlwbHknXSldXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gcXVlc3Rpb25PcHRpb25zLm1heE4gPSAyXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDg6XG4gICAgICAgIHN1YnR5cGUgPSAnd29yZGVkJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMudHlwZXMgPSBbJ2FkZCcsICdtdWx0aXBseSddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gcXVlc3Rpb25PcHRpb25zLm1heE4gPSAzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDk6XG4gICAgICAgIHN1YnR5cGUgPSAnd29yZGVkJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMudHlwZXMgPSBbJ211bHRpcGx5JywgJ3JhdGlvJ11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMTA6XG4gICAgICAgIHN1YnR5cGUgPSAnd29yZGVkJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMudHlwZXMgPSBbJ211bHRpcGx5JywgJ2FkZCcsICdyYXRpbycsICdwZXJjZW50J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ2FuJ3QgZ2VuZXJhdGUgZGlmZmljdWx0eSAke29wdGlvbnMuZGlmZmljdWx0eX1gKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJhbmRvbUZyb21UeXBlV2l0aE9wdGlvbnModHlwZSwgc3VidHlwZSwgcXVlc3Rpb25PcHRpb25zKVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbUZyb21UeXBlV2l0aE9wdGlvbnMgKHR5cGU6IFF1ZXN0aW9uVHlwZSwgc3VidHlwZT86IFF1ZXN0aW9uU3ViVHlwZSwgcXVlc3Rpb25PcHRpb25zPzogUXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucz86IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzUSB7XG4gICAgbGV0IHF1ZXN0aW9uOiBHcmFwaGljUVxuICAgIHF1ZXN0aW9uT3B0aW9ucyA9IHF1ZXN0aW9uT3B0aW9ucyB8fCB7fVxuICAgIHZpZXdPcHRpb25zID0gdmlld09wdGlvbnMgfHwge31cbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ2FhYXAnOlxuICAgICAgY2FzZSAnYW9zbCc6IHtcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmFuZ2xlU3VtID0gKHR5cGUgPT09ICdhYWFwJykgPyAzNjAgOiAxODBcbiAgICAgICAgc3dpdGNoIChzdWJ0eXBlKSB7XG4gICAgICAgICAgY2FzZSAnc2ltcGxlJzpcbiAgICAgICAgICBjYXNlICdyZXBlYXRlZCc6XG4gICAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMucmVwZWF0ZWQgPSBzdWJ0eXBlID09PSAncmVwZWF0ZWQnXG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNBcm91bmRRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdhbGdlYnJhJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICd3b3JkZWQnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzV29yZGVkUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgdW5leHBlY3RlZCBzdWJ0eXBlICR7c3VidHlwZX1gKVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICd0cmlhbmdsZSc6IHtcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnJlcGVhdGVkID0gKHN1YnR5cGUgPT09ICdyZXBlYXRlZCcpXG4gICAgICAgIHN3aXRjaCAoc3VidHlwZSkge1xuICAgICAgICAgIGNhc2UgJ3NpbXBsZSc6XG4gICAgICAgICAgY2FzZSAncmVwZWF0ZWQnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdhbGdlYnJhJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3dvcmRlZCc6XG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVdvcmRlZFEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHVuZXhwZWN0ZWQgc3VidHlwZSAke3N1YnR5cGV9YClcbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHR5cGUgJHt0eXBlfWApXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzUShxdWVzdGlvbilcbiAgfVxuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHsgcmV0dXJuIHRoaXMucXVlc3Rpb24uZ2V0RE9NKCkgfVxuICByZW5kZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5yZW5kZXIoKSB9XG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5zaG93QW5zd2VyKCkgfVxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24uaGlkZUFuc3dlcigpIH1cbiAgdG9nZ2xlQW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24udG9nZ2xlQW5zd2VyKCkgfVxuXG4gIHN0YXRpYyBnZXQgb3B0aW9uc1NwZWMgKCk6IE9wdGlvbnNTcGVjIHtcbiAgICByZXR1cm4gW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnaGVhZGluZycsXG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgfSxcblxuICAgICAge1xuICAgICAgICB0aXRsZTogJ1R5cGVzJyxcbiAgICAgICAgaWQ6ICd0eXBlcycsXG4gICAgICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICAgICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgICAgIHsgdGl0bGU6ICdPbiBhIHN0cmFpZ2h0IGxpbmUnLCBpZDogJ2Fvc2wnIH0sXG4gICAgICAgICAgeyB0aXRsZTogJ0Fyb3VuZCBhIHBvaW50JywgaWQ6ICdhYWFwJyB9LFxuICAgICAgICAgIHsgdGl0bGU6ICdUcmlhbmdsZScsIGlkOiAndHJpYW5nbGUnIH1cbiAgICAgICAgXSxcbiAgICAgICAgZGVmYXVsdDogWydhb3NsJywgJ2FhYXAnLCAndHJpYW5nbGUnXSxcbiAgICAgICAgdmVydGljYWw6IHRydWVcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjb2x1bW4tYnJlYWsnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnVXNlIGN1c3RvbSBzZXR0aW5ncyAoZGlzYWJsZXMgZGlmZmljdWx0eSknLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgaWQ6ICdjdXN0b20nLFxuICAgICAgICBzdHlsZTogJ2VtcGgnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIHRpdGxlOiAnU2ltcGxlJyxcbiAgICAgICAgaWQ6ICdzaW1wbGUnLFxuICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICBkaXNhYmxlZElmOiAnIWN1c3RvbSdcbiAgICAgIH1cbiAgICBdXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpOiBzdHJpbmcge1xuICAgIHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZSdcbiAgfVxufVxuIiwiaW1wb3J0IEFsZ2VicmFpY0ZyYWN0aW9uUSBmcm9tICdRdWVzdGlvbi9UZXh0US9BbGdlYnJhaWNGcmFjdGlvblEnXG5pbXBvcnQgSW50ZWdlckFkZFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvSW50ZWdlckFkZCdcbmltcG9ydCBBcml0aG1hZ29uUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9Bcml0aG1hZ29uUSdcbmltcG9ydCBUZXN0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXN0USdcbmltcG9ydCBBZGRBWmVybyBmcm9tICdRdWVzdGlvbi9UZXh0US9BZGRBWmVybydcbmltcG9ydCBFcXVhdGlvbk9mTGluZSBmcm9tICdRdWVzdGlvbi9UZXh0US9FcXVhdGlvbk9mTGluZSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNXcmFwcGVyJ1xuXG5pbXBvcnQgT3B0aW9uc1NldCBmcm9tICdPcHRpb25zU2V0J1xuXG5jb25zdCB0b3BpY0xpc3QgPSBbXG4gIHtcbiAgICBpZDogJ2FsZ2VicmFpYy1mcmFjdGlvbicsXG4gICAgdGl0bGU6ICdTaW1wbGlmeSBhbGdlYnJhaWMgZnJhY3Rpb25zJyxcbiAgICBjbGFzczogQWxnZWJyYWljRnJhY3Rpb25RXG4gIH0sXG4gIHtcbiAgICBpZDogJ2FkZC1hLXplcm8nLFxuICAgIHRpdGxlOiAnTXVsdGlwbHkgYnkgMTAgKGhvbmVzdCEpJyxcbiAgICBjbGFzczogQWRkQVplcm9cbiAgfSxcbiAge1xuICAgIGlkOiAnaW50ZWdlci1hZGQnLFxuICAgIHRpdGxlOiAnQWRkIGludGVnZXJzICh2IHNpbXBsZSknLFxuICAgIGNsYXNzOiBJbnRlZ2VyQWRkUVxuICB9LFxuICB7XG4gICAgaWQ6ICdtaXNzaW5nLWFuZ2xlcycsXG4gICAgdGl0bGU6ICdNaXNzaW5nIGFuZ2xlcycsXG4gICAgY2xhc3M6IE1pc3NpbmdBbmdsZXNRXG4gIH0sXG4gIHtcbiAgICBpZDogJ2VxdWF0aW9uLW9mLWxpbmUnLFxuICAgIHRpdGxlOiAnRXF1YXRpb24gb2YgYSBsaW5lIChmcm9tIHR3byBwb2ludHMpJyxcbiAgICBjbGFzczogRXF1YXRpb25PZkxpbmVcbiAgfSxcbiAge1xuICAgIGlkOiAnYXJpdGhtYWdvbi1hZGQnLFxuICAgIHRpdGxlOiAnQXJpdGhtYWdvbnMnLFxuICAgIGNsYXNzOiBBcml0aG1hZ29uUVxuICB9LFxuICB7XG4gICAgaWQ6ICd0ZXN0JyxcbiAgICB0aXRsZTogJ1Rlc3QgcXVlc3Rpb25zJyxcbiAgICBjbGFzczogVGVzdFFcbiAgfVxuXVxuXG5mdW5jdGlvbiBnZXRDbGFzcyAoaWQpIHtcbiAgLy8gUmV0dXJuIHRoZSBjbGFzcyBnaXZlbiBhbiBpZCBvZiBhIHF1ZXN0aW9uXG5cbiAgLy8gT2J2aW91c2x5IHRoaXMgaXMgYW4gaW5lZmZpY2llbnQgc2VhcmNoLCBidXQgd2UgZG9uJ3QgbmVlZCBtYXNzaXZlIHBlcmZvcm1hbmNlXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdG9waWNMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHRvcGljTGlzdFtpXS5pZCA9PT0gaWQpIHtcbiAgICAgIHJldHVybiB0b3BpY0xpc3RbaV0uY2xhc3NcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbFxufVxuXG5mdW5jdGlvbiBnZXRUaXRsZSAoaWQpIHtcbiAgLy8gUmV0dXJuIHRpdGxlIG9mIGEgZ2l2ZW4gaWRcbiAgLy9cbiAgcmV0dXJuIHRvcGljTGlzdC5maW5kKHQgPT4gKHQuaWQgPT09IGlkKSkudGl0bGVcbn1cblxuZnVuY3Rpb24gZ2V0Q29tbWFuZFdvcmQgKGlkKSB7XG4gIHJldHVybiBnZXRDbGFzcyhpZCkuY29tbWFuZFdvcmRcbn1cblxuZnVuY3Rpb24gZ2V0VG9waWNzICgpIHtcbiAgLy8gcmV0dXJucyB0b3BpY3Mgd2l0aCBjbGFzc2VzIHN0cmlwcGVkIG91dFxuICByZXR1cm4gdG9waWNMaXN0Lm1hcCh4ID0+ICh7IGlkOiB4LmlkLCB0aXRsZTogeC50aXRsZSB9KSlcbn1cblxuZnVuY3Rpb24gbmV3UXVlc3Rpb24gKGlkLCBvcHRpb25zKSB7XG4gIC8vIHRvIGF2b2lkIHdyaXRpbmcgYGxldCBxID0gbmV3IChUb3BpY0Nob29zZXIuZ2V0Q2xhc3MoaWQpKShvcHRpb25zKVxuICBjb25zdCBRdWVzdGlvbkNsYXNzID0gZ2V0Q2xhc3MoaWQpXG4gIGxldCBxdWVzdGlvblxuICBpZiAoUXVlc3Rpb25DbGFzcy5yYW5kb20pIHtcbiAgICBxdWVzdGlvbiA9IFF1ZXN0aW9uQ2xhc3MucmFuZG9tKG9wdGlvbnMpXG4gIH0gZWxzZSB7XG4gICAgcXVlc3Rpb24gPSBuZXcgUXVlc3Rpb25DbGFzcyhvcHRpb25zKVxuICB9XG4gIHJldHVybiBxdWVzdGlvblxufVxuXG5mdW5jdGlvbiBuZXdPcHRpb25zU2V0IChpZCkge1xuICBjb25zdCBvcHRpb25zU3BlYyA9IChnZXRDbGFzcyhpZCkpLm9wdGlvbnNTcGVjIHx8IFtdXG4gIHJldHVybiBuZXcgT3B0aW9uc1NldChvcHRpb25zU3BlYylcbn1cblxuZnVuY3Rpb24gaGFzT3B0aW9ucyAoaWQpIHtcbiAgcmV0dXJuICEhKGdldENsYXNzKGlkKS5vcHRpb25zU3BlYyAmJiBnZXRDbGFzcyhpZCkub3B0aW9uc1NwZWMubGVuZ3RoID4gMCkgLy8gd2VpcmQgYm9vbCB0eXBjYXN0aW5nIHdvbyFcbn1cblxuZXhwb3J0IHsgdG9waWNMaXN0LCBnZXRDbGFzcywgbmV3UXVlc3Rpb24sIGdldFRvcGljcywgZ2V0VGl0bGUsIG5ld09wdGlvbnNTZXQsIGdldENvbW1hbmRXb3JkLCBoYXNPcHRpb25zIH1cbiIsIi8qICFcbiogdGluZ2xlLmpzXG4qIEBhdXRob3IgIHJvYmluX3BhcmlzaVxuKiBAdmVyc2lvbiAwLjE1LjJcbiogQHVybFxuKi9cbi8vIE1vZGlmaWVkIHRvIGJlIEVTNiBtb2R1bGVcblxudmFyIGlzQnVzeSA9IGZhbHNlXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIE1vZGFsIChvcHRpb25zKSB7XG4gIHZhciBkZWZhdWx0cyA9IHtcbiAgICBvbkNsb3NlOiBudWxsLFxuICAgIG9uT3BlbjogbnVsbCxcbiAgICBiZWZvcmVPcGVuOiBudWxsLFxuICAgIGJlZm9yZUNsb3NlOiBudWxsLFxuICAgIHN0aWNreUZvb3RlcjogZmFsc2UsXG4gICAgZm9vdGVyOiBmYWxzZSxcbiAgICBjc3NDbGFzczogW10sXG4gICAgY2xvc2VMYWJlbDogJ0Nsb3NlJyxcbiAgICBjbG9zZU1ldGhvZHM6IFsnb3ZlcmxheScsICdidXR0b24nLCAnZXNjYXBlJ11cbiAgfVxuXG4gIC8vIGV4dGVuZHMgY29uZmlnXG4gIHRoaXMub3B0cyA9IGV4dGVuZCh7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgLy8gaW5pdCBtb2RhbFxuICB0aGlzLmluaXQoKVxufVxuXG5Nb2RhbC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMubW9kYWwpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIF9idWlsZC5jYWxsKHRoaXMpXG4gIF9iaW5kRXZlbnRzLmNhbGwodGhpcylcblxuICAvLyBpbnNlcnQgbW9kYWwgaW4gZG9tXG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbCwgZG9jdW1lbnQuYm9keS5maXJzdENoaWxkKVxuXG4gIGlmICh0aGlzLm9wdHMuZm9vdGVyKSB7XG4gICAgdGhpcy5hZGRGb290ZXIoKVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuTW9kYWwucHJvdG90eXBlLl9idXN5ID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gIGlzQnVzeSA9IHN0YXRlXG59XG5cbk1vZGFsLnByb3RvdHlwZS5faXNCdXN5ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gaXNCdXN5XG59XG5cbk1vZGFsLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5tb2RhbCA9PT0gbnVsbCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgLy8gcmVzdG9yZSBzY3JvbGxpbmdcbiAgaWYgKHRoaXMuaXNPcGVuKCkpIHtcbiAgICB0aGlzLmNsb3NlKHRydWUpXG4gIH1cblxuICAvLyB1bmJpbmQgYWxsIGV2ZW50c1xuICBfdW5iaW5kRXZlbnRzLmNhbGwodGhpcylcblxuICAvLyByZW1vdmUgbW9kYWwgZnJvbSBkb21cbiAgdGhpcy5tb2RhbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMubW9kYWwpXG5cbiAgdGhpcy5tb2RhbCA9IG51bGxcbn1cblxuTW9kYWwucHJvdG90eXBlLmlzT3BlbiA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICEhdGhpcy5tb2RhbC5jbGFzc0xpc3QuY29udGFpbnMoJ3RpbmdsZS1tb2RhbC0tdmlzaWJsZScpXG59XG5cbk1vZGFsLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5faXNCdXN5KCkpIHJldHVyblxuICB0aGlzLl9idXN5KHRydWUpXG5cbiAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgLy8gYmVmb3JlIG9wZW4gY2FsbGJhY2tcbiAgaWYgKHR5cGVvZiBzZWxmLm9wdHMuYmVmb3JlT3BlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHNlbGYub3B0cy5iZWZvcmVPcGVuKClcbiAgfVxuXG4gIGlmICh0aGlzLm1vZGFsLnN0eWxlLnJlbW92ZVByb3BlcnR5KSB7XG4gICAgdGhpcy5tb2RhbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgnZGlzcGxheScpXG4gIH0gZWxzZSB7XG4gICAgdGhpcy5tb2RhbC5zdHlsZS5yZW1vdmVBdHRyaWJ1dGUoJ2Rpc3BsYXknKVxuICB9XG5cbiAgLy8gcHJldmVudCBkb3VibGUgc2Nyb2xsXG4gIHRoaXMuX3Njcm9sbFBvc2l0aW9uID0gd2luZG93LnBhZ2VZT2Zmc2V0XG4gIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmFkZCgndGluZ2xlLWVuYWJsZWQnKVxuICBkb2N1bWVudC5ib2R5LnN0eWxlLnRvcCA9IC10aGlzLl9zY3JvbGxQb3NpdGlvbiArICdweCdcblxuICAvLyBzdGlja3kgZm9vdGVyXG4gIHRoaXMuc2V0U3RpY2t5Rm9vdGVyKHRoaXMub3B0cy5zdGlja3lGb290ZXIpXG5cbiAgLy8gc2hvdyBtb2RhbFxuICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC0tdmlzaWJsZScpXG5cbiAgLy8gb25PcGVuIGNhbGxiYWNrXG4gIGlmICh0eXBlb2Ygc2VsZi5vcHRzLm9uT3BlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHNlbGYub3B0cy5vbk9wZW4uY2FsbChzZWxmKVxuICB9XG5cbiAgc2VsZi5fYnVzeShmYWxzZSlcblxuICAvLyBjaGVjayBpZiBtb2RhbCBpcyBiaWdnZXIgdGhhbiBzY3JlZW4gaGVpZ2h0XG4gIHRoaXMuY2hlY2tPdmVyZmxvdygpXG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuTW9kYWwucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKGZvcmNlKSB7XG4gIGlmICh0aGlzLl9pc0J1c3koKSkgcmV0dXJuXG4gIHRoaXMuX2J1c3kodHJ1ZSlcbiAgZm9yY2UgPSBmb3JjZSB8fCBmYWxzZVxuXG4gIC8vICBiZWZvcmUgY2xvc2VcbiAgaWYgKHR5cGVvZiB0aGlzLm9wdHMuYmVmb3JlQ2xvc2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICB2YXIgY2xvc2UgPSB0aGlzLm9wdHMuYmVmb3JlQ2xvc2UuY2FsbCh0aGlzKVxuICAgIGlmICghY2xvc2UpIHtcbiAgICAgIHRoaXMuX2J1c3koZmFsc2UpXG4gICAgICByZXR1cm5cbiAgICB9XG4gIH1cblxuICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoJ3RpbmdsZS1lbmFibGVkJylcbiAgZG9jdW1lbnQuYm9keS5zdHlsZS50b3AgPSBudWxsXG4gIHdpbmRvdy5zY3JvbGxUbyh7XG4gICAgdG9wOiB0aGlzLl9zY3JvbGxQb3NpdGlvbixcbiAgICBiZWhhdmlvcjogJ2luc3RhbnQnXG4gIH0pXG5cbiAgdGhpcy5tb2RhbC5jbGFzc0xpc3QucmVtb3ZlKCd0aW5nbGUtbW9kYWwtLXZpc2libGUnKVxuXG4gIC8vIHVzaW5nIHNpbWlsYXIgc2V0dXAgYXMgb25PcGVuXG4gIHZhciBzZWxmID0gdGhpc1xuXG4gIHNlbGYubW9kYWwuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuXG4gIC8vIG9uQ2xvc2UgY2FsbGJhY2tcbiAgaWYgKHR5cGVvZiBzZWxmLm9wdHMub25DbG9zZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHNlbGYub3B0cy5vbkNsb3NlLmNhbGwodGhpcylcbiAgfVxuXG4gIC8vIHJlbGVhc2UgbW9kYWxcbiAgc2VsZi5fYnVzeShmYWxzZSlcbn1cblxuTW9kYWwucHJvdG90eXBlLnNldENvbnRlbnQgPSBmdW5jdGlvbiAoY29udGVudCkge1xuICAvLyBjaGVjayB0eXBlIG9mIGNvbnRlbnQgOiBTdHJpbmcgb3IgTm9kZVxuICBpZiAodHlwZW9mIGNvbnRlbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgdGhpcy5tb2RhbEJveENvbnRlbnQuaW5uZXJIVE1MID0gY29udGVudFxuICB9IGVsc2Uge1xuICAgIHRoaXMubW9kYWxCb3hDb250ZW50LmlubmVySFRNTCA9ICcnXG4gICAgdGhpcy5tb2RhbEJveENvbnRlbnQuYXBwZW5kQ2hpbGQoY29udGVudClcbiAgfVxuXG4gIGlmICh0aGlzLmlzT3BlbigpKSB7XG4gICAgLy8gY2hlY2sgaWYgbW9kYWwgaXMgYmlnZ2VyIHRoYW4gc2NyZWVuIGhlaWdodFxuICAgIHRoaXMuY2hlY2tPdmVyZmxvdygpXG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuZ2V0Q29udGVudCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMubW9kYWxCb3hDb250ZW50XG59XG5cbk1vZGFsLnByb3RvdHlwZS5hZGRGb290ZXIgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIGFkZCBmb290ZXIgdG8gbW9kYWxcbiAgX2J1aWxkRm9vdGVyLmNhbGwodGhpcylcblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuc2V0Rm9vdGVyQ29udGVudCA9IGZ1bmN0aW9uIChjb250ZW50KSB7XG4gIC8vIHNldCBmb290ZXIgY29udGVudFxuICB0aGlzLm1vZGFsQm94Rm9vdGVyLmlubmVySFRNTCA9IGNvbnRlbnRcblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuZ2V0Rm9vdGVyQ29udGVudCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMubW9kYWxCb3hGb290ZXJcbn1cblxuTW9kYWwucHJvdG90eXBlLnNldFN0aWNreUZvb3RlciA9IGZ1bmN0aW9uIChpc1N0aWNreSkge1xuICAvLyBpZiB0aGUgbW9kYWwgaXMgc21hbGxlciB0aGFuIHRoZSB2aWV3cG9ydCBoZWlnaHQsIHdlIGRvbid0IG5lZWQgc3RpY2t5XG4gIGlmICghdGhpcy5pc092ZXJmbG93KCkpIHtcbiAgICBpc1N0aWNreSA9IGZhbHNlXG4gIH1cblxuICBpZiAoaXNTdGlja3kpIHtcbiAgICBpZiAodGhpcy5tb2RhbEJveC5jb250YWlucyh0aGlzLm1vZGFsQm94Rm9vdGVyKSkge1xuICAgICAgdGhpcy5tb2RhbEJveC5yZW1vdmVDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKVxuICAgICAgdGhpcy5tb2RhbC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKVxuICAgICAgdGhpcy5tb2RhbEJveEZvb3Rlci5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtYm94X19mb290ZXItLXN0aWNreScpXG4gICAgICBfcmVjYWxjdWxhdGVGb290ZXJQb3NpdGlvbi5jYWxsKHRoaXMpXG4gICAgICB0aGlzLm1vZGFsQm94Q29udGVudC5zdHlsZVsncGFkZGluZy1ib3R0b20nXSA9IHRoaXMubW9kYWxCb3hGb290ZXIuY2xpZW50SGVpZ2h0ICsgMjAgKyAncHgnXG4gICAgfVxuICB9IGVsc2UgaWYgKHRoaXMubW9kYWxCb3hGb290ZXIpIHtcbiAgICBpZiAoIXRoaXMubW9kYWxCb3guY29udGFpbnModGhpcy5tb2RhbEJveEZvb3RlcikpIHtcbiAgICAgIHRoaXMubW9kYWwucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlcilcbiAgICAgIHRoaXMubW9kYWxCb3guYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlcilcbiAgICAgIHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUud2lkdGggPSAnYXV0bydcbiAgICAgIHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUubGVmdCA9ICcnXG4gICAgICB0aGlzLm1vZGFsQm94Q29udGVudC5zdHlsZVsncGFkZGluZy1ib3R0b20nXSA9ICcnXG4gICAgICB0aGlzLm1vZGFsQm94Rm9vdGVyLmNsYXNzTGlzdC5yZW1vdmUoJ3RpbmdsZS1tb2RhbC1ib3hfX2Zvb3Rlci0tc3RpY2t5JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuYWRkRm9vdGVyQnRuID0gZnVuY3Rpb24gKGxhYmVsLCBjc3NDbGFzcywgY2FsbGJhY2spIHtcbiAgdmFyIGJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpXG5cbiAgLy8gc2V0IGxhYmVsXG4gIGJ0bi5pbm5lckhUTUwgPSBsYWJlbFxuXG4gIC8vIGJpbmQgY2FsbGJhY2tcbiAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2FsbGJhY2spXG5cbiAgaWYgKHR5cGVvZiBjc3NDbGFzcyA9PT0gJ3N0cmluZycgJiYgY3NzQ2xhc3MubGVuZ3RoKSB7XG4gICAgLy8gYWRkIGNsYXNzZXMgdG8gYnRuXG4gICAgY3NzQ2xhc3Muc3BsaXQoJyAnKS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICBidG4uY2xhc3NMaXN0LmFkZChpdGVtKVxuICAgIH0pXG4gIH1cblxuICB0aGlzLm1vZGFsQm94Rm9vdGVyLmFwcGVuZENoaWxkKGJ0bilcblxuICByZXR1cm4gYnRuXG59XG5cbk1vZGFsLnByb3RvdHlwZS5yZXNpemUgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGNvbnNvbGUud2FybignUmVzaXplIGlzIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiB2ZXJzaW9uIDEuMCcpXG59XG5cbk1vZGFsLnByb3RvdHlwZS5pc092ZXJmbG93ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgdmlld3BvcnRIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHRcbiAgdmFyIG1vZGFsSGVpZ2h0ID0gdGhpcy5tb2RhbEJveC5jbGllbnRIZWlnaHRcblxuICByZXR1cm4gbW9kYWxIZWlnaHQgPj0gdmlld3BvcnRIZWlnaHRcbn1cblxuTW9kYWwucHJvdG90eXBlLmNoZWNrT3ZlcmZsb3cgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIG9ubHkgaWYgdGhlIG1vZGFsIGlzIGN1cnJlbnRseSBzaG93blxuICBpZiAodGhpcy5tb2RhbC5jbGFzc0xpc3QuY29udGFpbnMoJ3RpbmdsZS1tb2RhbC0tdmlzaWJsZScpKSB7XG4gICAgaWYgKHRoaXMuaXNPdmVyZmxvdygpKSB7XG4gICAgICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC0tb3ZlcmZsb3cnKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3RpbmdsZS1tb2RhbC0tb3ZlcmZsb3cnKVxuICAgIH1cblxuICAgIC8vIHRPRE86IHJlbW92ZSBvZmZzZXRcbiAgICAvLyBfb2Zmc2V0LmNhbGwodGhpcyk7XG4gICAgaWYgKCF0aGlzLmlzT3ZlcmZsb3coKSAmJiB0aGlzLm9wdHMuc3RpY2t5Rm9vdGVyKSB7XG4gICAgICB0aGlzLnNldFN0aWNreUZvb3RlcihmYWxzZSlcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNPdmVyZmxvdygpICYmIHRoaXMub3B0cy5zdGlja3lGb290ZXIpIHtcbiAgICAgIF9yZWNhbGN1bGF0ZUZvb3RlclBvc2l0aW9uLmNhbGwodGhpcylcbiAgICAgIHRoaXMuc2V0U3RpY2t5Rm9vdGVyKHRydWUpXG4gICAgfVxuICB9XG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiA9PSBwcml2YXRlIG1ldGhvZHMgKi9cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cbmZ1bmN0aW9uIGNsb3NlSWNvbiAoKSB7XG4gIHJldHVybiAnPHN2ZyB2aWV3Qm94PVwiMCAwIDEwIDEwXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPjxwYXRoIGQ9XCJNLjMgOS43Yy4yLjIuNC4zLjcuMy4zIDAgLjUtLjEuNy0uM0w1IDYuNGwzLjMgMy4zYy4yLjIuNS4zLjcuMy4yIDAgLjUtLjEuNy0uMy40LS40LjQtMSAwLTEuNEw2LjQgNWwzLjMtMy4zYy40LS40LjQtMSAwLTEuNC0uNC0uNC0xLS40LTEuNCAwTDUgMy42IDEuNy4zQzEuMy0uMS43LS4xLjMuM2MtLjQuNC0uNCAxIDAgMS40TDMuNiA1IC4zIDguM2MtLjQuNC0uNCAxIDAgMS40elwiIGZpbGw9XCIjMDAwXCIgZmlsbC1ydWxlPVwibm9uemVyb1wiLz48L3N2Zz4nXG59XG5cbmZ1bmN0aW9uIF9yZWNhbGN1bGF0ZUZvb3RlclBvc2l0aW9uICgpIHtcbiAgaWYgKCF0aGlzLm1vZGFsQm94Rm9vdGVyKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS53aWR0aCA9IHRoaXMubW9kYWxCb3guY2xpZW50V2lkdGggKyAncHgnXG4gIHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUubGVmdCA9IHRoaXMubW9kYWxCb3gub2Zmc2V0TGVmdCArICdweCdcbn1cblxuZnVuY3Rpb24gX2J1aWxkICgpIHtcbiAgLy8gd3JhcHBlclxuICB0aGlzLm1vZGFsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgdGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwnKVxuXG4gIC8vIHJlbW92ZSBjdXNvciBpZiBubyBvdmVybGF5IGNsb3NlIG1ldGhvZFxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5sZW5ndGggPT09IDAgfHwgdGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdvdmVybGF5JykgPT09IC0xKSB7XG4gICAgdGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtLW5vT3ZlcmxheUNsb3NlJylcbiAgfVxuXG4gIHRoaXMubW9kYWwuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuXG4gIC8vIGN1c3RvbSBjbGFzc1xuICB0aGlzLm9wdHMuY3NzQ2xhc3MuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZChpdGVtKVxuICAgIH1cbiAgfSwgdGhpcylcblxuICAvLyBjbG9zZSBidG5cbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignYnV0dG9uJykgIT09IC0xKSB7XG4gICAgdGhpcy5tb2RhbENsb3NlQnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJylcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4udHlwZSA9ICdidXR0b24nXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbF9fY2xvc2UnKVxuXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuSWNvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKVxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bkljb24uY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsX19jbG9zZUljb24nKVxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bkljb24uaW5uZXJIVE1MID0gY2xvc2VJY29uKClcblxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bkxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuTGFiZWwuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsX19jbG9zZUxhYmVsJylcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbC5pbm5lckhUTUwgPSB0aGlzLm9wdHMuY2xvc2VMYWJlbFxuXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuLmFwcGVuZENoaWxkKHRoaXMubW9kYWxDbG9zZUJ0bkljb24pXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuLmFwcGVuZENoaWxkKHRoaXMubW9kYWxDbG9zZUJ0bkxhYmVsKVxuICB9XG5cbiAgLy8gbW9kYWxcbiAgdGhpcy5tb2RhbEJveCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIHRoaXMubW9kYWxCb3guY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsLWJveCcpXG5cbiAgLy8gbW9kYWwgYm94IGNvbnRlbnRcbiAgdGhpcy5tb2RhbEJveENvbnRlbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICB0aGlzLm1vZGFsQm94Q29udGVudC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtYm94X19jb250ZW50JylcblxuICB0aGlzLm1vZGFsQm94LmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3hDb250ZW50KVxuXG4gIGlmICh0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoJ2J1dHRvbicpICE9PSAtMSkge1xuICAgIHRoaXMubW9kYWwuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbENsb3NlQnRuKVxuICB9XG5cbiAgdGhpcy5tb2RhbC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94KVxufVxuXG5mdW5jdGlvbiBfYnVpbGRGb290ZXIgKCkge1xuICB0aGlzLm1vZGFsQm94Rm9vdGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgdGhpcy5tb2RhbEJveEZvb3Rlci5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtYm94X19mb290ZXInKVxuICB0aGlzLm1vZGFsQm94LmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpXG59XG5cbmZ1bmN0aW9uIF9iaW5kRXZlbnRzICgpIHtcbiAgdGhpcy5fZXZlbnRzID0ge1xuICAgIGNsaWNrQ2xvc2VCdG46IHRoaXMuY2xvc2UuYmluZCh0aGlzKSxcbiAgICBjbGlja092ZXJsYXk6IF9oYW5kbGVDbGlja091dHNpZGUuYmluZCh0aGlzKSxcbiAgICByZXNpemU6IHRoaXMuY2hlY2tPdmVyZmxvdy5iaW5kKHRoaXMpLFxuICAgIGtleWJvYXJkTmF2OiBfaGFuZGxlS2V5Ym9hcmROYXYuYmluZCh0aGlzKVxuICB9XG5cbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignYnV0dG9uJykgIT09IC0xKSB7XG4gICAgdGhpcy5tb2RhbENsb3NlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5fZXZlbnRzLmNsaWNrQ2xvc2VCdG4pXG4gIH1cblxuICB0aGlzLm1vZGFsLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMuX2V2ZW50cy5jbGlja092ZXJsYXkpXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLl9ldmVudHMucmVzaXplKVxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgdGhpcy5fZXZlbnRzLmtleWJvYXJkTmF2KVxufVxuXG5mdW5jdGlvbiBfaGFuZGxlS2V5Ym9hcmROYXYgKGV2ZW50KSB7XG4gIC8vIGVzY2FwZSBrZXlcbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignZXNjYXBlJykgIT09IC0xICYmIGV2ZW50LndoaWNoID09PSAyNyAmJiB0aGlzLmlzT3BlbigpKSB7XG4gICAgdGhpcy5jbG9zZSgpXG4gIH1cbn1cblxuZnVuY3Rpb24gX2hhbmRsZUNsaWNrT3V0c2lkZSAoZXZlbnQpIHtcbiAgLy8gb24gbWFjT1MsIGNsaWNrIG9uIHNjcm9sbGJhciAoaGlkZGVuIG1vZGUpIHdpbGwgdHJpZ2dlciBjbG9zZSBldmVudCBzbyB3ZSBuZWVkIHRvIGJ5cGFzcyB0aGlzIGJlaGF2aW9yIGJ5IGRldGVjdGluZyBzY3JvbGxiYXIgbW9kZVxuICB2YXIgc2Nyb2xsYmFyV2lkdGggPSB0aGlzLm1vZGFsLm9mZnNldFdpZHRoIC0gdGhpcy5tb2RhbC5jbGllbnRXaWR0aFxuICB2YXIgY2xpY2tlZE9uU2Nyb2xsYmFyID0gZXZlbnQuY2xpZW50WCA+PSB0aGlzLm1vZGFsLm9mZnNldFdpZHRoIC0gMTUgLy8gMTVweCBpcyBtYWNPUyBzY3JvbGxiYXIgZGVmYXVsdCB3aWR0aFxuICB2YXIgaXNTY3JvbGxhYmxlID0gdGhpcy5tb2RhbC5zY3JvbGxIZWlnaHQgIT09IHRoaXMubW9kYWwub2Zmc2V0SGVpZ2h0XG4gIGlmIChuYXZpZ2F0b3IucGxhdGZvcm0gPT09ICdNYWNJbnRlbCcgJiYgc2Nyb2xsYmFyV2lkdGggPT09IDAgJiYgY2xpY2tlZE9uU2Nyb2xsYmFyICYmIGlzU2Nyb2xsYWJsZSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgLy8gaWYgY2xpY2sgaXMgb3V0c2lkZSB0aGUgbW9kYWxcbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignb3ZlcmxheScpICE9PSAtMSAmJiAhX2ZpbmRBbmNlc3RvcihldmVudC50YXJnZXQsICd0aW5nbGUtbW9kYWwnKSAmJlxuICAgIGV2ZW50LmNsaWVudFggPCB0aGlzLm1vZGFsLmNsaWVudFdpZHRoKSB7XG4gICAgdGhpcy5jbG9zZSgpXG4gIH1cbn1cblxuZnVuY3Rpb24gX2ZpbmRBbmNlc3RvciAoZWwsIGNscykge1xuICB3aGlsZSAoKGVsID0gZWwucGFyZW50RWxlbWVudCkgJiYgIWVsLmNsYXNzTGlzdC5jb250YWlucyhjbHMpKTtcbiAgcmV0dXJuIGVsXG59XG5cbmZ1bmN0aW9uIF91bmJpbmRFdmVudHMgKCkge1xuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdidXR0b24nKSAhPT0gLTEpIHtcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLl9ldmVudHMuY2xpY2tDbG9zZUJ0bilcbiAgfVxuICB0aGlzLm1vZGFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMuX2V2ZW50cy5jbGlja092ZXJsYXkpXG4gIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLl9ldmVudHMucmVzaXplKVxuICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywgdGhpcy5fZXZlbnRzLmtleWJvYXJkTmF2KVxufVxuXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuLyogPT0gaGVscGVycyAqL1xuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuZnVuY3Rpb24gZXh0ZW5kICgpIHtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gYXJndW1lbnRzW2ldKSB7XG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGFyZ3VtZW50c1tpXSwga2V5KSkge1xuICAgICAgICBhcmd1bWVudHNbMF1ba2V5XSA9IGFyZ3VtZW50c1tpXVtrZXldXG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBhcmd1bWVudHNbMF1cbn1cbiIsImltcG9ydCBSU2xpZGVyIGZyb20gJ3ZlbmRvci9yc2xpZGVyJ1xuaW1wb3J0IE9wdGlvbnNTZXQgZnJvbSAnT3B0aW9uc1NldCdcbmltcG9ydCAqIGFzIFRvcGljQ2hvb3NlciBmcm9tICdUb3BpY0Nob29zZXInXG5pbXBvcnQgTW9kYWwgZnJvbSAndmVuZG9yL1RpbmdsZSdcbmltcG9ydCB7IHJhbmRFbGVtLCBjcmVhdGVFbGVtLCBoYXNBbmNlc3RvckNsYXNzLCBib29sT2JqZWN0VG9BcnJheSB9IGZyb20gJ1V0aWxpdGllcydcblxud2luZG93LlNIT1dfRElGRklDVUxUWSA9IGZhbHNlIC8vIGZvciBkZWJ1Z2dpbmcgcXVlc3Rpb25zXG5cbi8qIFRPRE8gbGlzdDpcbiAqIEFkZGl0aW9uYWwgcXVlc3Rpb24gYmxvY2sgLSBwcm9iYWJseSBpbiBtYWluLmpzXG4gKiBab29tL3NjYWxlIGJ1dHRvbnNcbiAqICAgIE5lZWQgdG8gY2hhbmdlIGNzcyBncmlkIHNwYWNpbmcgd2l0aCBKUyBvbiBnZW5lcmF0aW9uXG4gKiBEaXNwbGF5IG9wdGlvbnNcbiAqL1xuXG4vLyBNYWtlIGFuIG92ZXJsYXkgdG8gY2FwdHVyZSBhbnkgY2xpY2tzIG91dHNpZGUgYm94ZXMsIGlmIG5lY2Vzc2FyeVxuY3JlYXRlRWxlbSgnZGl2JywgJ292ZXJsYXkgaGlkZGVuJywgZG9jdW1lbnQuYm9keSkuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBoaWRlQWxsQWN0aW9ucylcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUXVlc3Rpb25TZXQge1xuICBjb25zdHJ1Y3RvciAocU51bWJlcikge1xuICAgIHRoaXMucXVlc3Rpb25zID0gW10gLy8gbGlzdCBvZiBxdWVzdGlvbnMgYW5kIHRoZSBET00gZWxlbWVudCB0aGV5J3JlIHJlbmRlcmVkIGluXG4gICAgdGhpcy50b3BpY3MgPSBbXSAvLyBsaXN0IG9mIHRvcGljcyB3aGljaCBoYXZlIGJlZW4gc2VsZWN0ZWQgZm9yIHRoaXMgc2V0XG4gICAgdGhpcy5vcHRpb25zU2V0cyA9IFtdIC8vIGxpc3Qgb2YgT3B0aW9uc1NldCBvYmplY3RzIGNhcnJ5aW5nIG9wdGlvbnMgZm9yIHRvcGljcyB3aXRoIG9wdGlvbnNcbiAgICB0aGlzLnFOdW1iZXIgPSBxTnVtYmVyIHx8IDEgLy8gUXVlc3Rpb24gbnVtYmVyIChwYXNzZWQgaW4gYnkgY2FsbGVyLCB3aGljaCB3aWxsIGtlZXAgY291bnQpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlIC8vIFdoZXRoZXIgYW5zd2VyZWQgb3Igbm90XG4gICAgdGhpcy5jb21tYW5kV29yZCA9ICcnIC8vIFNvbWV0aGluZyBsaWtlICdzaW1wbGlmeSdcbiAgICB0aGlzLnVzZUNvbW1hbmRXb3JkID0gdHJ1ZSAvLyBVc2UgdGhlIGNvbW1hbmQgd29yZCBpbiB0aGUgbWFpbiBxdWVzdGlvbiwgZmFsc2UgZ2l2ZSBjb21tYW5kIHdvcmQgd2l0aCBlYWNoIHN1YnF1ZXN0aW9uXG4gICAgdGhpcy5uID0gOCAvLyBOdW1iZXIgb2YgcXVlc3Rpb25zXG5cbiAgICB0aGlzLl9idWlsZCgpXG4gIH1cblxuICBfYnVpbGQgKCkge1xuICAgIHRoaXMub3V0ZXJCb3ggPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tb3V0ZXJib3gnKVxuICAgIHRoaXMuaGVhZGVyQm94ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWhlYWRlcmJveCcsIHRoaXMub3V0ZXJCb3gpXG4gICAgdGhpcy5kaXNwbGF5Qm94ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWRpc3BsYXlib3gnLCB0aGlzLm91dGVyQm94KVxuXG4gICAgdGhpcy5fYnVpbGRPcHRpb25zQm94KClcblxuICAgIHRoaXMuX2J1aWxkVG9waWNDaG9vc2VyKClcbiAgfVxuXG4gIF9idWlsZE9wdGlvbnNCb3ggKCkge1xuICAgIGNvbnN0IHRvcGljU3BhbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCBudWxsLCB0aGlzLmhlYWRlckJveClcbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCAndG9waWMtY2hvb3NlciBidXR0b24nLCB0b3BpY1NwYW4pXG4gICAgdGhpcy50b3BpY0Nob29zZXJCdXR0b24uaW5uZXJIVE1MID0gJ0Nob29zZSB0b3BpYydcbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuY2hvb3NlVG9waWNzKCkpXG5cbiAgICBjb25zdCBkaWZmaWN1bHR5U3BhbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCBudWxsLCB0aGlzLmhlYWRlckJveClcbiAgICBkaWZmaWN1bHR5U3Bhbi5hcHBlbmQoJ0RpZmZpY3VsdHk6ICcpXG4gICAgY29uc3QgZGlmZmljdWx0eVNsaWRlck91dGVyID0gY3JlYXRlRWxlbSgnc3BhbicsICdzbGlkZXItb3V0ZXInLCBkaWZmaWN1bHR5U3BhbilcbiAgICB0aGlzLmRpZmZpY3VsdHlTbGlkZXJFbGVtZW50ID0gY3JlYXRlRWxlbSgnaW5wdXQnLCBudWxsLCBkaWZmaWN1bHR5U2xpZGVyT3V0ZXIpXG5cbiAgICBjb25zdCBuU3BhbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCBudWxsLCB0aGlzLmhlYWRlckJveClcbiAgICBuU3Bhbi5hcHBlbmQoJ051bWJlciBvZiBxdWVzdGlvbnM6ICcpXG4gICAgY29uc3QgblF1ZXN0aW9uc0lucHV0ID0gY3JlYXRlRWxlbSgnaW5wdXQnLCAnbi1xdWVzdGlvbnMnLCBuU3BhbilcbiAgICBuUXVlc3Rpb25zSW5wdXQudHlwZSA9ICdudW1iZXInXG4gICAgblF1ZXN0aW9uc0lucHV0Lm1pbiA9ICcxJ1xuICAgIG5RdWVzdGlvbnNJbnB1dC52YWx1ZSA9ICc4J1xuICAgIG5RdWVzdGlvbnNJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICB0aGlzLm4gPSBwYXJzZUludChuUXVlc3Rpb25zSW5wdXQudmFsdWUpXG4gICAgfSlcblxuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24gPSBjcmVhdGVFbGVtKCdidXR0b24nLCAnZ2VuZXJhdGUtYnV0dG9uIGJ1dHRvbicsIHRoaXMuaGVhZGVyQm94KVxuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uZGlzYWJsZWQgPSB0cnVlXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5pbm5lckhUTUwgPSAnR2VuZXJhdGUhJ1xuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLmdlbmVyYXRlQWxsKCkpXG4gIH1cblxuICBfaW5pdFNsaWRlciAoKSB7XG4gICAgdGhpcy5kaWZmaWN1bHR5U2xpZGVyID0gbmV3IFJTbGlkZXIoe1xuICAgICAgdGFyZ2V0OiB0aGlzLmRpZmZpY3VsdHlTbGlkZXJFbGVtZW50LFxuICAgICAgdmFsdWVzOiB7IG1pbjogMSwgbWF4OiAxMCB9LFxuICAgICAgcmFuZ2U6IHRydWUsXG4gICAgICBzZXQ6IFsyLCA2XSxcbiAgICAgIHN0ZXA6IDEsXG4gICAgICB0b29sdGlwOiBmYWxzZSxcbiAgICAgIHNjYWxlOiB0cnVlLFxuICAgICAgbGFiZWxzOiB0cnVlXG4gICAgfSlcbiAgfVxuXG4gIF9idWlsZFRvcGljQ2hvb3NlciAoKSB7XG4gICAgLy8gYnVpbGQgYW4gT3B0aW9uc1NldCBvYmplY3QgZm9yIHRoZSB0b3BpY3NcbiAgICBjb25zdCB0b3BpY3MgPSBUb3BpY0Nob29zZXIuZ2V0VG9waWNzKClcbiAgICBjb25zdCBvcHRpb25zU3BlYyA9IFtdXG4gICAgdG9waWNzLmZvckVhY2godG9waWMgPT4ge1xuICAgICAgb3B0aW9uc1NwZWMucHVzaCh7XG4gICAgICAgIHRpdGxlOiB0b3BpYy50aXRsZSxcbiAgICAgICAgaWQ6IHRvcGljLmlkLFxuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICBzd2FwTGFiZWw6IHRydWVcbiAgICAgIH0pXG4gICAgfSlcbiAgICB0aGlzLnRvcGljc09wdGlvbnMgPSBuZXcgT3B0aW9uc1NldChvcHRpb25zU3BlYylcblxuICAgIC8vIEJ1aWxkIGEgbW9kYWwgZGlhbG9nIHRvIHB1dCB0aGVtIGluXG4gICAgdGhpcy50b3BpY3NNb2RhbCA9IG5ldyBNb2RhbCh7XG4gICAgICBmb290ZXI6IHRydWUsXG4gICAgICBzdGlja3lGb290ZXI6IGZhbHNlLFxuICAgICAgY2xvc2VNZXRob2RzOiBbJ292ZXJsYXknLCAnZXNjYXBlJ10sXG4gICAgICBjbG9zZUxhYmVsOiAnQ2xvc2UnLFxuICAgICAgb25DbG9zZTogKCkgPT4ge1xuICAgICAgICB0aGlzLnVwZGF0ZVRvcGljcygpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoaXMudG9waWNzTW9kYWwuYWRkRm9vdGVyQnRuKFxuICAgICAgJ09LJyxcbiAgICAgICdidXR0b24gbW9kYWwtYnV0dG9uJyxcbiAgICAgICgpID0+IHtcbiAgICAgICAgdGhpcy50b3BpY3NNb2RhbC5jbG9zZSgpXG4gICAgICB9KVxuXG4gICAgLy8gcmVuZGVyIG9wdGlvbnMgaW50byBtb2RhbFxuICAgIHRoaXMudG9waWNzT3B0aW9ucy5yZW5kZXJJbih0aGlzLnRvcGljc01vZGFsLm1vZGFsQm94Q29udGVudClcblxuICAgIC8vIEFkZCBmdXJ0aGVyIG9wdGlvbnMgYnV0dG9uc1xuICAgIC8vIFRoaXMgZmVlbHMgYSBiaXQgaWZmeSAtIGRlcGVuZHMgdG9vIG11Y2ggb24gaW1wbGVtZW50YXRpb24gb2YgT3B0aW9uc1NldFxuICAgIGNvbnN0IGxpcyA9IEFycmF5LmZyb20odGhpcy50b3BpY3NNb2RhbC5tb2RhbEJveENvbnRlbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2xpJykpXG4gICAgbGlzLmZvckVhY2gobGkgPT4ge1xuICAgICAgY29uc3QgdG9waWNJZCA9IGxpLmRhdGFzZXQub3B0aW9uSWRcbiAgICAgIGlmIChUb3BpY0Nob29zZXIuaGFzT3B0aW9ucyh0b3BpY0lkKSkge1xuICAgICAgICBjb25zdCBvcHRpb25zQnV0dG9uID0gY3JlYXRlRWxlbSgnZGl2JywgJ2ljb24tYnV0dG9uIGV4dHJhLW9wdGlvbnMtYnV0dG9uJywgbGkpXG4gICAgICAgIHRoaXMuX2J1aWxkVG9waWNPcHRpb25zKGxpLmRhdGFzZXQub3B0aW9uSWQsIG9wdGlvbnNCdXR0b24pXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIF9idWlsZFRvcGljT3B0aW9ucyAodG9waWNJZCwgb3B0aW9uc0J1dHRvbikge1xuICAgIC8vIEJ1aWxkIHRoZSBVSSBhbmQgT3B0aW9uc1NldCBvYmplY3QgbGlua2VkIHRvIHRvcGljSWQuIFBhc3MgaW4gYSBidXR0b24gd2hpY2ggc2hvdWxkIGxhdW5jaCBpdFxuXG4gICAgLy8gTWFrZSB0aGUgT3B0aW9uc1NldCBvYmplY3QgYW5kIHN0b3JlIGEgcmVmZXJlbmNlIHRvIGl0XG4gICAgLy8gT25seSBzdG9yZSBpZiBvYmplY3QgaXMgY3JlYXRlZD9cbiAgICBjb25zdCBvcHRpb25zU2V0ID0gVG9waWNDaG9vc2VyLm5ld09wdGlvbnNTZXQodG9waWNJZClcbiAgICB0aGlzLm9wdGlvbnNTZXRzW3RvcGljSWRdID0gb3B0aW9uc1NldFxuXG4gICAgLy8gTWFrZSBhIG1vZGFsIGRpYWxvZyBmb3IgaXRcbiAgICBjb25zdCBtb2RhbCA9IG5ldyBNb2RhbCh7XG4gICAgICBmb290ZXI6IHRydWUsXG4gICAgICBzdGlja3lGb290ZXI6IGZhbHNlLFxuICAgICAgY2xvc2VNZXRob2RzOiBbJ292ZXJsYXknLCAnZXNjYXBlJ10sXG4gICAgICBjbG9zZUxhYmVsOiAnQ2xvc2UnXG4gICAgfSlcblxuICAgIG1vZGFsLmFkZEZvb3RlckJ0bihcbiAgICAgICdPSycsXG4gICAgICAnYnV0dG9uIG1vZGFsLWJ1dHRvbicsXG4gICAgICAoKSA9PiB7XG4gICAgICAgIG1vZGFsLmNsb3NlKClcbiAgICAgIH0pXG5cbiAgICBvcHRpb25zU2V0LnJlbmRlckluKG1vZGFsLm1vZGFsQm94Q29udGVudClcblxuICAgIC8vIGxpbmsgdGhlIG1vZGFsIHRvIHRoZSBidXR0b25cbiAgICBvcHRpb25zQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgbW9kYWwub3BlbigpXG4gICAgfSlcbiAgfVxuXG4gIGNob29zZVRvcGljcyAoKSB7XG4gICAgdGhpcy50b3BpY3NNb2RhbC5vcGVuKClcbiAgfVxuXG4gIHVwZGF0ZVRvcGljcyAoKSB7XG4gICAgLy8gdG9waWMgY2hvaWNlcyBhcmUgc3RvcmVkIGluIHRoaXMudG9waWNzT3B0aW9ucyBhdXRvbWF0aWNhbGx5XG4gICAgLy8gcHVsbCB0aGlzIGludG8gdGhpcy50b3BpY3MgYW5kIHVwZGF0ZSBidXR0b24gZGlzcGxheXNcblxuICAgIC8vIGhhdmUgb2JqZWN0IHdpdGggYm9vbGVhbiBwcm9wZXJ0aWVzLiBKdXN0IHdhbnQgdGhlIHRydWUgdmFsdWVzXG4gICAgY29uc3QgdG9waWNzID0gYm9vbE9iamVjdFRvQXJyYXkodGhpcy50b3BpY3NPcHRpb25zLm9wdGlvbnMpXG4gICAgdGhpcy50b3BpY3MgPSB0b3BpY3NcblxuICAgIGxldCB0ZXh0XG5cbiAgICBpZiAodG9waWNzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGV4dCA9ICdDaG9vc2UgdG9waWMnIC8vIG5vdGhpbmcgc2VsZWN0ZWRcbiAgICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uZGlzYWJsZWQgPSB0cnVlXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGlkID0gdG9waWNzWzBdIC8vIGZpcnN0IGl0ZW0gc2VsZWN0ZWRcbiAgICAgIHRleHQgPSBUb3BpY0Nob29zZXIuZ2V0VGl0bGUoaWQpXG4gICAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmRpc2FibGVkID0gZmFsc2VcbiAgICB9XG5cbiAgICBpZiAodG9waWNzLmxlbmd0aCA+IDEpIHsgLy8gYW55IGFkZGl0aW9uYWwgc2hvdyBhcyBlLmcuICcgKyAxXG4gICAgICB0ZXh0ICs9ICcgKycgKyAodG9waWNzLmxlbmd0aCAtIDEpXG4gICAgfVxuXG4gICAgdGhpcy50b3BpY0Nob29zZXJCdXR0b24uaW5uZXJIVE1MID0gdGV4dFxuICB9XG5cbiAgc2V0Q29tbWFuZFdvcmQgKCkge1xuICAgIC8vIGZpcnN0IHNldCB0byBmaXJzdCB0b3BpYyBjb21tYW5kIHdvcmRcbiAgICBsZXQgY29tbWFuZFdvcmQgPSBUb3BpY0Nob29zZXIuZ2V0Q2xhc3ModGhpcy50b3BpY3NbMF0pLmNvbW1hbmRXb3JkXG4gICAgbGV0IHVzZUNvbW1hbmRXb3JkID0gdHJ1ZSAvLyB0cnVlIGlmIHNoYXJlZCBjb21tYW5kIHdvcmRcblxuICAgIC8vIGN5Y2xlIHRocm91Z2ggcmVzdCBvZiB0b3BpY3MsIHJlc2V0IGNvbW1hbmQgd29yZCBpZiB0aGV5IGRvbid0IG1hdGNoXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCB0aGlzLnRvcGljcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKFRvcGljQ2hvb3Nlci5nZXRDbGFzcyh0aGlzLnRvcGljc1tpXSkuY29tbWFuZFdvcmQgIT09IGNvbW1hbmRXb3JkKSB7XG4gICAgICAgIGNvbW1hbmRXb3JkID0gJydcbiAgICAgICAgdXNlQ29tbWFuZFdvcmQgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY29tbWFuZFdvcmQgPSBjb21tYW5kV29yZFxuICAgIHRoaXMudXNlQ29tbWFuZFdvcmQgPSB1c2VDb21tYW5kV29yZFxuICB9XG5cbiAgZ2VuZXJhdGVBbGwgKCkge1xuICAgIC8vIENsZWFyIGRpc3BsYXktYm94IGFuZCBxdWVzdGlvbiBsaXN0XG4gICAgdGhpcy5kaXNwbGF5Qm94LmlubmVySFRNTCA9ICcnXG4gICAgdGhpcy5xdWVzdGlvbnMgPSBbXVxuICAgIHRoaXMuc2V0Q29tbWFuZFdvcmQoKVxuXG4gICAgLy8gU2V0IG51bWJlciBhbmQgbWFpbiBjb21tYW5kIHdvcmRcbiAgICBjb25zdCBtYWlucSA9IGNyZWF0ZUVsZW0oJ3AnLCAna2F0ZXggbWFpbnEnLCB0aGlzLmRpc3BsYXlCb3gpXG4gICAgbWFpbnEuaW5uZXJIVE1MID0gYCR7dGhpcy5xTnVtYmVyfS4gJHt0aGlzLmNvbW1hbmRXb3JkfWAgLy8gVE9ETzogZ2V0IGNvbW1hbmQgd29yZCBmcm9tIHF1ZXN0aW9uc1xuXG4gICAgLy8gTWFrZSBzaG93IGFuc3dlcnMgYnV0dG9uXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24gPSBjcmVhdGVFbGVtKCdwJywgJ2J1dHRvbiBzaG93LWFuc3dlcnMnLCB0aGlzLmRpc3BsYXlCb3gpXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLnRvZ2dsZUFuc3dlcnMoKVxuICAgIH0pXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24uaW5uZXJIVE1MID0gJ1Nob3cgYW5zd2VycydcblxuICAgIC8vIEdldCBkaWZmaWN1bHR5IGZyb20gc2xpZGVyXG4gICAgY29uc3QgbWluZGlmZiA9IHRoaXMuZGlmZmljdWx0eVNsaWRlci5nZXRWYWx1ZUwoKVxuICAgIGNvbnN0IG1heGRpZmYgPSB0aGlzLmRpZmZpY3VsdHlTbGlkZXIuZ2V0VmFsdWVSKClcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIC8vIE1ha2UgcXVlc3Rpb24gY29udGFpbmVyIERPTSBlbGVtZW50XG4gICAgICBjb25zdCBjb250YWluZXIgPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tY29udGFpbmVyJywgdGhpcy5kaXNwbGF5Qm94KVxuICAgICAgY29udGFpbmVyLmRhdGFzZXQucXVlc3Rpb25faW5kZXggPSBpIC8vIG5vdCBzdXJlIHRoaXMgaXMgYWN0dWFsbHkgbmVlZGVkXG5cbiAgICAgIC8vIEFkZCBjb250YWluZXIgbGluayB0byBvYmplY3QgaW4gcXVlc3Rpb25zIGxpc3RcbiAgICAgIGlmICghdGhpcy5xdWVzdGlvbnNbaV0pIHRoaXMucXVlc3Rpb25zW2ldID0ge31cbiAgICAgIHRoaXMucXVlc3Rpb25zW2ldLmNvbnRhaW5lciA9IGNvbnRhaW5lclxuXG4gICAgICAvLyBjaG9vc2UgYSBkaWZmaWN1bHR5IGFuZCBnZW5lcmF0ZVxuICAgICAgY29uc3QgZGlmZmljdWx0eSA9IG1pbmRpZmYgKyBNYXRoLmZsb29yKGkgKiAobWF4ZGlmZiAtIG1pbmRpZmYgKyAxKSAvIHRoaXMubilcblxuICAgICAgLy8gY2hvb3NlIGEgdG9waWMgaWRcbiAgICAgIHRoaXMuZ2VuZXJhdGUoaSwgZGlmZmljdWx0eSlcbiAgICB9XG4gIH1cblxuICBnZW5lcmF0ZSAoaSwgZGlmZmljdWx0eSwgdG9waWNJZCkge1xuICAgIC8vIFRPRE8gZ2V0IG9wdGlvbnMgcHJvcGVybHlcbiAgICB0b3BpY0lkID0gdG9waWNJZCB8fCByYW5kRWxlbSh0aGlzLnRvcGljcylcblxuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICBsYWJlbDogJycsXG4gICAgICBkaWZmaWN1bHR5OiBkaWZmaWN1bHR5LFxuICAgICAgdXNlQ29tbWFuZFdvcmQ6IGZhbHNlXG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9uc1NldHNbdG9waWNJZF0pIHtcbiAgICAgIE9iamVjdC5hc3NpZ24ob3B0aW9ucywgdGhpcy5vcHRpb25zU2V0c1t0b3BpY0lkXS5vcHRpb25zKVxuICAgIH1cblxuICAgIC8vIGNob29zZSBhIHF1ZXN0aW9uXG4gICAgY29uc3QgcXVlc3Rpb24gPSBUb3BpY0Nob29zZXIubmV3UXVlc3Rpb24odG9waWNJZCwgb3B0aW9ucylcblxuICAgIC8vIHNldCBzb21lIG1vcmUgZGF0YSBpbiB0aGUgcXVlc3Rpb25zW10gbGlzdFxuICAgIGlmICghdGhpcy5xdWVzdGlvbnNbaV0pIHRocm93IG5ldyBFcnJvcigncXVlc3Rpb24gbm90IG1hZGUnKVxuICAgIHRoaXMucXVlc3Rpb25zW2ldLnF1ZXN0aW9uID0gcXVlc3Rpb25cbiAgICB0aGlzLnF1ZXN0aW9uc1tpXS50b3BpY0lkID0gdG9waWNJZFxuXG4gICAgLy8gUmVuZGVyIGludG8gdGhlIGNvbnRhaW5lclxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMucXVlc3Rpb25zW2ldLmNvbnRhaW5lclxuICAgIGNvbnRhaW5lci5pbm5lckhUTUwgPSAnJyAvLyBjbGVhciBpbiBjYXNlIG9mIHJlZnJlc2hcblxuICAgIC8vIG1ha2UgYW5kIHJlbmRlciBxdWVzdGlvbiBudW1iZXIgYW5kIGNvbW1hbmQgd29yZCAoaWYgbmVlZGVkKVxuICAgIGxldCBxTnVtYmVyVGV4dCA9IHF1ZXN0aW9uTGV0dGVyKGkpICsgJyknXG4gICAgaWYgKHdpbmRvdy5TSE9XX0RJRkZJQ1VMVFkpIHsgcU51bWJlclRleHQgKz0gb3B0aW9ucy5kaWZmaWN1bHR5IH1cbiAgICBpZiAoIXRoaXMudXNlQ29tbWFuZFdvcmQpIHtcbiAgICAgIHFOdW1iZXJUZXh0ICs9ICcgJyArIFRvcGljQ2hvb3Nlci5nZXRDb21tYW5kV29yZCh0b3BpY0lkKVxuICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ2luZGl2aWR1YWwtY29tbWFuZC13b3JkJylcbiAgICB9IGVsc2Uge1xuICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ2luZGl2aWR1YWwtY29tbWFuZC13b3JkJylcbiAgICB9XG5cbiAgICBjb25zdCBxdWVzdGlvbk51bWJlckRpdiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1udW1iZXIga2F0ZXgnLCBjb250YWluZXIpXG4gICAgcXVlc3Rpb25OdW1iZXJEaXYuaW5uZXJIVE1MID0gcU51bWJlclRleHRcblxuICAgIC8vIHJlbmRlciB0aGUgcXVlc3Rpb25cbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQocXVlc3Rpb24uZ2V0RE9NKCkpIC8vIHRoaXMgaXMgYSAucXVlc3Rpb24tZGl2IGVsZW1lbnRcbiAgICBxdWVzdGlvbi5yZW5kZXIoKSAvLyBzb21lIHF1ZXN0aW9ucyBuZWVkIHJlbmRlcmluZyBhZnRlciBhdHRhY2hpbmcgdG8gRE9NXG5cbiAgICAvLyBtYWtlIGhpZGRlbiBhY3Rpb25zIG1lbnVcbiAgICBjb25zdCBhY3Rpb25zID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWFjdGlvbnMgaGlkZGVuJywgY29udGFpbmVyKVxuICAgIGNvbnN0IHJlZnJlc2hJY29uID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLXJlZnJlc2ggaWNvbi1idXR0b24nLCBhY3Rpb25zKVxuICAgIGNvbnN0IGFuc3dlckljb24gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tYW5zd2VyIGljb24tYnV0dG9uJywgYWN0aW9ucylcblxuICAgIGFuc3dlckljb24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICBxdWVzdGlvbi50b2dnbGVBbnN3ZXIoKVxuICAgICAgaGlkZUFsbEFjdGlvbnMoKVxuICAgIH0pXG5cbiAgICByZWZyZXNoSWNvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHRoaXMuZ2VuZXJhdGUoaSwgZGlmZmljdWx0eSlcbiAgICAgIGhpZGVBbGxBY3Rpb25zKClcbiAgICB9KVxuXG4gICAgLy8gUTogaXMgdGhpcyBiZXN0IHdheSAtIG9yIGFuIGV2ZW50IGxpc3RlbmVyIG9uIHRoZSB3aG9sZSBkaXNwbGF5Qm94P1xuICAgIGNvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGUgPT4ge1xuICAgICAgaWYgKCFoYXNBbmNlc3RvckNsYXNzKGUudGFyZ2V0LCAncXVlc3Rpb24tYWN0aW9ucycpKSB7XG4gICAgICAgIC8vIG9ubHkgZG8gdGhpcyBpZiBpdCBkaWRuJ3Qgb3JpZ2luYXRlIGluIGFjdGlvbiBidXR0b25cbiAgICAgICAgdGhpcy5zaG93UXVlc3Rpb25BY3Rpb25zKGUsIGkpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIHRvZ2dsZUFuc3dlcnMgKCkge1xuICAgIGlmICh0aGlzLmFuc3dlcmVkKSB7XG4gICAgICB0aGlzLnF1ZXN0aW9ucy5mb3JFYWNoKHEgPT4ge1xuICAgICAgICBxLnF1ZXN0aW9uLmhpZGVBbnN3ZXIoKVxuICAgICAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgICAgICAgdGhpcy5hbnN3ZXJCdXR0b24uaW5uZXJIVE1MID0gJ1Nob3cgYW5zd2VycydcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucXVlc3Rpb25zLmZvckVhY2gocSA9PiB7XG4gICAgICAgIHEucXVlc3Rpb24uc2hvd0Fuc3dlcigpXG4gICAgICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gICAgICAgIHRoaXMuYW5zd2VyQnV0dG9uLmlubmVySFRNTCA9ICdIaWRlIGFuc3dlcnMnXG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIHNob3dRdWVzdGlvbkFjdGlvbnMgKGV2ZW50LCBxdWVzdGlvbkluZGV4KSB7XG4gICAgLy8gZmlyc3QgaGlkZSBhbnkgb3RoZXIgYWN0aW9uc1xuICAgIGhpZGVBbGxBY3Rpb25zKClcblxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMucXVlc3Rpb25zW3F1ZXN0aW9uSW5kZXhdLmNvbnRhaW5lclxuICAgIGNvbnN0IGFjdGlvbnMgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcignLnF1ZXN0aW9uLWFjdGlvbnMnKVxuXG4gICAgLy8gVW5oaWRlIHRoZSBvdmVybGF5XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm92ZXJsYXknKS5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgIGFjdGlvbnMuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJylcbiAgICBhY3Rpb25zLnN0eWxlLmxlZnQgPSAoY29udGFpbmVyLm9mZnNldFdpZHRoIC8gMiAtIGFjdGlvbnMub2Zmc2V0V2lkdGggLyAyKSArICdweCdcbiAgICBhY3Rpb25zLnN0eWxlLnRvcCA9IChjb250YWluZXIub2Zmc2V0SGVpZ2h0IC8gMiAtIGFjdGlvbnMub2Zmc2V0SGVpZ2h0IC8gMikgKyAncHgnXG4gIH1cblxuICBhcHBlbmRUbyAoZWxlbSkge1xuICAgIGVsZW0uYXBwZW5kQ2hpbGQodGhpcy5vdXRlckJveClcbiAgICB0aGlzLl9pbml0U2xpZGVyKCkgLy8gaGFzIHRvIGJlIGluIGRvY3VtZW50J3MgRE9NIHRvIHdvcmsgcHJvcGVybHlcbiAgfVxuXG4gIGFwcGVuZEJlZm9yZSAocGFyZW50LCBlbGVtKSB7XG4gICAgcGFyZW50Lmluc2VydEJlZm9yZSh0aGlzLm91dGVyQm94LCBlbGVtKVxuICAgIHRoaXMuX2luaXRTbGlkZXIoKSAvLyBoYXMgdG8gYmUgaW4gZG9jdW1lbnQncyBET00gdG8gd29yayBwcm9wZXJseVxuICB9XG59XG5cbmZ1bmN0aW9uIHF1ZXN0aW9uTGV0dGVyIChpKSB7XG4gIC8vIHJldHVybiBhIHF1ZXN0aW9uIG51bWJlci4gZS5nLiBxTnVtYmVyKDApPVwiYVwiLlxuICAvLyBBZnRlciBsZXR0ZXJzLCB3ZSBnZXQgb24gdG8gZ3JlZWtcbiAgdmFyIGxldHRlciA9XG4gICAgICAgIGkgPCAyNiA/IFN0cmluZy5mcm9tQ2hhckNvZGUoMHg2MSArIGkpXG4gICAgICAgICAgOiBpIDwgNTIgPyBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4NDEgKyBpIC0gMjYpXG4gICAgICAgICAgICA6IFN0cmluZy5mcm9tQ2hhckNvZGUoMHgzQjEgKyBpIC0gNTIpXG4gIHJldHVybiBsZXR0ZXJcbn1cblxuZnVuY3Rpb24gaGlkZUFsbEFjdGlvbnMgKGUpIHtcbiAgLy8gaGlkZSBhbGwgcXVlc3Rpb24gYWN0aW9uc1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucXVlc3Rpb24tYWN0aW9ucycpLmZvckVhY2goZWwgPT4ge1xuICAgIGVsLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpXG4gIH0pXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5vdmVybGF5JykuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcbn1cbiIsImltcG9ydCBRdWVzdGlvblNldCBmcm9tICdRdWVzdGlvblNldCdcblxuLy8gVE9ETzpcbi8vICAtIFF1ZXN0aW9uU2V0IC0gcmVmYWN0b3IgaW50byBtb3JlIGNsYXNzZXM/IEUuZy4gb3B0aW9ucyB3aW5kb3dcbi8vICAtIEltcG9ydCBleGlzdGluZyBxdWVzdGlvbiB0eXBlcyAoRyAtIGdyYXBoaWMsIFQgLSB0ZXh0XG4vLyAgICAtIEcgYW5nbGVzXG4vLyAgICAtIEcgYXJlYVxuLy8gICAgLSBUIGVxdWF0aW9uIG9mIGEgbGluZVxuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKCkgPT4ge1xuICBjb25zdCBxcyA9IG5ldyBRdWVzdGlvblNldCgpXG4gIHFzLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpXG4gIHFzLmNob29zZVRvcGljcygpXG59KVxuIl0sIm5hbWVzIjpbImNvbW1vbmpzSGVscGVycy5jcmVhdGVDb21tb25qc01vZHVsZSIsImNvbW1vbmpzSGVscGVycy5nZXREZWZhdWx0RXhwb3J0RnJvbUNqcyIsIlJTbGlkZXIiLCJUb3BpY0Nob29zZXIuZ2V0VG9waWNzIiwiVG9waWNDaG9vc2VyLmhhc09wdGlvbnMiLCJUb3BpY0Nob29zZXIubmV3T3B0aW9uc1NldCIsIlRvcGljQ2hvb3Nlci5nZXRUaXRsZSIsIlRvcGljQ2hvb3Nlci5nZXRDbGFzcyIsIlRvcGljQ2hvb3Nlci5uZXdRdWVzdGlvbiIsIlRvcGljQ2hvb3Nlci5nZXRDb21tYW5kV29yZCJdLCJtYXBwaW5ncyI6Ijs7O0VBQUE7RUFDQTtFQUNBO0FBQ0E7RUFDQSxJQUFJLEVBQUUsR0FBRyxVQUFVLElBQUksRUFBRTtFQUN6QixFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSTtFQUNuQixFQUFFLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSTtFQUMxQixFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSTtFQUNwQixFQUFFLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBQztFQUN0QixFQUFFLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBQztF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RUFDQSxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxVQUFVLEtBQUssRUFBRSxHQUFHLEVBQUU7RUFDL0MsRUFBRSxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLEdBQUcsTUFBSztBQUN2RDtFQUNBLEVBQUUsSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFDLEVBQUU7QUFDckg7RUFDQSxFQUFFLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUMsRUFBRTtBQUNwRztFQUNBLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBRyxFQUFFO0FBQ3JHO0VBQ0EsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFJO0FBQ3RHO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO0VBQ3ZCLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtFQUMzQixNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFDO0VBQy9ELE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDN0QsS0FBSztFQUNMLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDcEcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSTtFQUM3RixHQUFHLE1BQU07RUFDVCxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQyxFQUFFO0VBQ3RGLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDeEQsR0FBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUM7RUFDbEcsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxFQUFDO0FBQ2xEO0VBQ0EsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUk7RUFDdEYsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFJO0FBQ2pFO0VBQ0EsRUFBRSxPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDeEIsRUFBQztBQUNEO0VBQ0EsRUFBRSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDLEVBQUU7RUFDekMsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU07QUFDaEM7RUFDQSxFQUFFLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLElBQUksRUFBQztBQUNqRTtFQUNBLEVBQUUsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUM7RUFDMUUsRUFBRSxJQUFJLEdB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RUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO0VBQzlDO0VBQ0EsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBQztFQUM5QixFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFDO0FBQy9CO0VBQ0EsRUFBRSxPQUFPLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDO0VBQzFDLENBQUM7QUFDRDtFQUNPLFNBQVMsUUFBUSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7RUFDdkMsRUFBRSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDO0VBQzdELEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU07RUFDL0IsRUFBRSxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxLQUFJO0VBQ3RDLEVBQUUsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBQztFQUN2QyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUN0QixDQUFDO0FBTUQ7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDTyxTQUFTLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQy9CLEVBQUUsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztFQUMxRCxDQUFDO0FBS0Q7RUFDTyxTQUFTLE1BQU0sRUFB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QztFQUNiLE1BQU07RUFDTixRQUFRLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsRUFBQztFQUNoRSxRQUFRLEtBQUs7RUFDYixLQUFLO0FBQ0w7RUFDQTtFQUNBLElBQUk7RUFDSixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQzdDLE1BQU0sV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUM3QixNQUFNO0VBQ04sTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsS0FBSztBQUNMO0VBQ0E7RUFDQSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQzFCLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBQztFQUNaLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBQztFQUNaLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBQztFQUNaLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBQztFQUNaLEtBQUs7QUFDTDtFQUNBLElBQUksQ0FBQyxHQUFHLENBQUMsR0FB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QUFLLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDO0VBQ3hDLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUM1QjtFQUNBLElBQUksTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ2xDLElBQUksTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ2xDLElBQUksTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0FBQ2xDO0VBQ0EsSUFBSSxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDL0IsSUFBSSxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDNUMsSUFBSSxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7QUFDNUM7RUFDQSxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxHQUFHLFNBQVMsRUFBRSxJQUFJLEdBQUcsU0FBUyxDQUFDO0VBQ3hELEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUU7RUFDdEIsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFDO0VBQ3BFLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBQztFQUNwRSxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQztFQUNoQyxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFO0VBQ3RCLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDO0VBQ3JFLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDO0VBQ3JFLElBQUksT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO0VBQ2hDLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUU7RUFDekIsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFDO0VBQ3BFLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBQztFQUNwRSxJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQztFQUNyRSxJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQztFQUNyRSxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDO0VBQzFELEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxVQUFVLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQzdCO0VBQ0E7RUFDQSxJQUFJLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUM7RUFDNUIsSUFBSSxNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFDO0VBQzVCLElBQUksTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFDO0VBQ3pDLElBQUksT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLEdBQUcsTUFBTSxFQUFFO0VBQ2pELEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQzNCLElBQUksT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDL0MsR0FBRztBQUNIO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLEVBQUUsT0FBTyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQzVCLElBQUksTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFDO0VBQ3RELElBQUksT0FBTyxLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxLQUFLO0VBQ25ELEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUU7RUFDM0M7RUFDQTtFQUNBLElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFDO0VBQ2xELElBQUksSUFBSSxDQUFDLElBQUksT0FBTyxFQUFFLE9BQU8sS0FBSztBQUNsQztFQUNBLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFJLEVBQUM7RUFDaEMsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBQztFQUN6QixJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFDO0VBQ3pCLElBQUksT0FBTyxJQUFJO0VBQ2YsR0FBRztFQUNIOztRQzNHc0IsWUFBWTtNQVFoQyxZQUFhLElBQW1CLEVBQUUsV0FBeUI7VUFDekQsTUFBTSxRQUFRLEdBQWlCO2NBQzdCLEtBQUssRUFBRSxHQUFHO2NBQ1YsTUFBTSxFQUFFLEdBQUc7V0FDWixDQUFBO1VBRUQsV0FBVyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQTtVQUV0RCxJQUFJLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUE7VUFDOUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFBO1VBQ2hDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBOztVQUdoQixJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQTs7VUFHaEIsSUFBSSxDQUFDLEdBQUcsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1VBQzVDLElBQUksQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFzQixDQUFBO1VBQ3BGLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUE7VUFDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtPQUNqQztNQUVELE1BQU07VUFDSixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUE7T0FDaEI7TUFJRCxZQUFZLENBQUUsS0FBZ0I7VUFDNUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQTs7VUFHMUIsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxDQUFBO1VBQzNELE9BQU8sU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Y0FDM0IsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFBO1dBQ3RCO1VBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztjQUNuQixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO2NBQzNDLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7Y0FDaEQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7Y0FDNUIsS0FBSyxDQUFDLFNBQVMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQTtjQUNoQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUE7Y0FDakMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFBO2NBRWhDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQTtjQUNoQyxLQUFLLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFBO2NBQzdCLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7O2NBRzVCLElBQUksVUFBVSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUMsWUFBWSxHQUFHLENBQUMsRUFBRTtrQkFDeEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7a0JBQ3pDLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2tCQUM1RSxLQUFLLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQTtlQUN2Qzs7O2NBS0QsSUFBSSxLQUFLLEVBQUU7a0JBQ1QsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQTtrQkFDaEMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFO3NCQUN2RixLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxNQUFNLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQTtzQkFDOUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO21CQUNsQztrQkFDRCxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUU7c0JBQ3ZGLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUE7c0JBQ3JELE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTttQkFDbEM7ZUFDRjtXQUNGLENBQUMsQ0FBQTtPQUNIO01BRUQsVUFBVTtVQUNSLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7Y0FDbkIsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFBO2NBQ2hCLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtXQUNuQixDQUFDLENBQUE7VUFDRixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFBO09BQ3pCO01BRUQsVUFBVTtVQUNSLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7Y0FDbkIsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFBO2NBQ2hCLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtXQUNuQixDQUFDLENBQUE7VUFDRixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFBO09BQ3pCOztNQUlELElBQUksU0FBUztVQUNYLE9BQU8sRUFBRSxDQUFBO09BQ1Y7TUFFRCxLQUFLLENBQUUsRUFBVztVQUNoQixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7Y0FDaEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQTtXQUNaLENBQUMsQ0FBQTtPQUNIO01BRUQsTUFBTSxDQUFFLEtBQWM7VUFDcEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO2NBQ2hDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7V0FDaEIsQ0FBQyxDQUFBO1VBQ0YsT0FBTyxLQUFLLENBQUE7T0FDYjtNQUVELFNBQVMsQ0FBRSxDQUFVLEVBQUUsQ0FBVTtVQUMvQixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7Y0FDaEMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7V0FDbEIsQ0FBQyxDQUFBO09BQ0g7TUFFRCxZQUFZO1VBQ1YsTUFBTSxLQUFLLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO1VBQ3pDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7VUFDbEIsT0FBTyxLQUFLLENBQUE7T0FDYjs7Ozs7Ozs7TUFTRCxVQUFVLENBQUUsS0FBYyxFQUFFLE1BQWMsRUFBRSxNQUFlO1VBQ3pELElBQUksT0FBTyxHQUFXLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1VBQy9DLElBQUksV0FBVyxHQUFXLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1VBQ25ELE1BQU0sVUFBVSxHQUFZLFdBQVcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQTtVQUNyRCxNQUFNLFdBQVcsR0FBWSxXQUFXLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUE7VUFDdEQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxNQUFNLElBQUksVUFBVSxFQUFFLENBQUMsTUFBTSxHQUFHLE1BQU0sSUFBSSxXQUFXLENBQUMsQ0FBQTtVQUNuRixJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFBOztVQUdkLE9BQU8sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtVQUNuQyxXQUFXLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7VUFDdkMsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUE7VUFDL0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFFM0QsT0FBTyxFQUFFLENBQUE7T0FDVjtHQUNGO1FBRXFCLFFBQVMsU0FBUSxRQUFRO01BSTdDO1VBQ0UsS0FBSyxFQUFFLENBQUE7VUFDUCxRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTs7Ozs7OztPQVFsQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7TUFzQkQsTUFBTSxLQUFvQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUEsRUFBRTtNQUVyRCxNQUFNLEtBQWEsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQSxFQUFFO01BRXZDLFVBQVU7VUFDUixLQUFLLENBQUMsVUFBVSxFQUFFLENBQUE7VUFDbEIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtPQUN2QjtNQUVELFVBQVU7VUFDUixLQUFLLENBQUMsVUFBVSxFQUFFLENBQUE7VUFDbEIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtPQUN2Qjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VDdk9ILElBQUksUUFBUSxHQUFHQSxvQkFBb0MsQ0FBQyxVQUFVLE1BQU0sRUFBRSxPQUFPLEVBQUU7RUFDL0U7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7QUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7QUFDQTtFQUNBLEVBQUUsQ0FBQyxVQUFVLElBQUksRUFBRTtBQUVuQjtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksSUFBSSxhQUFhLEdBQUcsS0FBSTtBQUM1QjtFQUNBO0VBQ0EsSUFBSSxJQUFJLENBQUMsR0FBRztFQUNaLE1BQU0sQ0FBQyxFQUFFLENBQUM7RUFDVixNQUFNLENBQUMsRUFBRSxDQUFDO0VBQ1YsTUFBTSxDQUFDLEVBQUUsQ0FBQztFQUNWLE1BQUs7QUFDTDtFQUNBLElBQUksU0FBUyxXQUFXLEVBQUUsSUFBSSxFQUFFO0VBQ2hDLE1BQU0sU0FBUyxnQkFBZ0IsSUFBSTtFQUNuQyxRQUFRLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBQztFQUMvQyxRQUFRLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFJO0VBQ3BDLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBSztFQUMvQixRQUFRLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQU87RUFDbkMsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sU0FBUyxxQkFBcUIsSUFBSSxFQUFFO0VBQzFDLE1BQU0scUJBQXFCLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxVQUFTO0VBQ3ZELE1BQU0sZ0JBQWdCLENBQUMsU0FBUyxHQUFHLElBQUkscUJBQXFCLEdBQUU7QUFDOUQ7RUFDQSxNQUFNLE9BQU8sZ0JBQWdCO0VBQzdCLEtBQUs7QUFDTDtFQUNBLElBQUksSUFBSSxjQUFjLEdBQUcsUUFBUSxDQUFDLGNBQWMsR0FBRyxXQUFXLENBQUMsZ0JBQWdCLEVBQUM7RUFDaEYsSUFBSSxJQUFJLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsR0FBRyxXQUFXLENBQUMsa0JBQWtCLEVBQUM7QUFDdEY7RUFDQSxJQUFJLFNBQVMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFO0VBQ3RDLFFBQVEsaUJBQWlCLEdBQUU7RUFDM0IsT0FBTztFQUNQLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztFQUNsQixLQUFLO0FBQ0w7RUFDQSxJQUFJLFNBQVMsaUJBQWlCLElBQUk7RUFDbEMsTUFBTSxNQUFNLElBQUksZ0JBQWdCLEVBQUU7RUFDbEMsS0FBSztBQUNMO0VBQ0EsSUFBSSxJQUFJLEtBQUssR0FBRyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUU7RUFDbEMsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFDO0VBQ3JDLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBQztBQUMzRDtFQUNBLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBQztFQUMxQixNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUM7QUFDMUI7RUFDQSxNQUFNLElBQUksQ0FBQyxHQUFHLFNBQVE7RUFDdEIsTUFBTSxJQUFJLEVBQUM7QUFDWDtFQUNBLE1BQU0sSUFBSSxFQUFFLEtBQUssU0FBUyxJQUFJLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FFcEMsTUFBTSxJQUFJLEVBQUUsS0FBSyxTQUFTLEVBQUU7RUFDbkMsUUFBUSxDQUFDLEdBQUcsR0FBRTtFQUNkLFFBQVEsQ0FBQyxHQUFHLEdBQUU7RUFDZCxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztFQUNqQixPQUFPLE1BQU07RUFDYixRQUFRLFFBQVEsT0FBTyxFQUFFO0VBQ3pCLFVBQVUsS0FBSyxRQUFRO0VBQ3ZCLFVBQVU7RUFDVixZQUFZLElBQUksR0FBRyxJQUFJLEVBQUUsSUFBSSxHQUFHLElBQUksRUFBRSxFQUFFO0VBQ3hDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFDO0VBQ3RCLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFDO0VBQ3RCLGNBQWMsSUFBSSxHQUFHLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFDLEVBQUU7RUFDMUMsYUFBYSxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRTtFQUNoQyxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFDO0VBQ3ZCLGNBQWMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUMsRUFBRTtFQUN4QyxhQUFhLE1BQU07RUFDbkIsY0FBYyxpQkFBaUIsR0FBRTtFQUNqQyxhQUFhO0VBQ2IsWUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDckIsWUFBWSxLQUFLO0VBQ2pCLFdBQVc7RUFDWCxVQUFVLEtBQUssUUFBUTtFQUN2QixVQUFVO0VBQ1YsWUFBWSxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUU7RUFDeEIsY0FBYyxDQUFDLEdBQUcsR0FBRTtFQUNwQixjQUFjLEVBQUUsR0FBRyxDQUFDLEdBQUU7RUFDdEIsYUFBYTtBQUNiO0VBQ0EsWUFBWSxJQUFJLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO0VBQzlCLGNBQWMsQ0FBQyxHQUFHLEdBQUU7RUFDcEIsYUFBYSxNQUFNLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRTtFQUMvQixjQUFjLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRTtFQUMzQixnQkFBZ0IsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDO0VBQzFFLGdCQUFnQixFQUFFLElBQUksRUFBQztFQUN2QixlQUFlO0FBQ2Y7RUFDQTtFQUNBO0FBQ0E7RUFDQSxjQUFjLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQ3ZDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUM7QUFDckM7RUFDQSxnQkFBZ0IsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFO0VBQzlCLGtCQUFrQixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQ2xDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDN0Isb0JBQW9CLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztFQUM3QixtQkFBbUIsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7RUFDcEMsb0JBQW9CLENBQUMsR0FBRyxFQUFDO0VBQ3pCLG9CQUFvQixDQUFDLEdBQUcsRUFBQztFQUN6QixtQkFBbUIsTUFBTTtFQUN6QixvQkFBb0IsQ0FBQyxHQUFHLEVBQUM7RUFDekIsb0JBQW9CLENBQUMsR0FBRyxFQUFDO0VBQ3pCLG1CQUFtQjtFQUNuQixrQkFBa0IsS0FBSztFQUN2QixpQkFBaUIsTUFBTTtFQUN2QixrQkFBa0IsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFO0VBQzlCLG9CQUFvQixDQUFDLElBQUksRUFBQztFQUMxQixvQkFBb0IsQ0FBQyxJQUFJLEVBQUM7RUFDMUIsbUJBQW1CLE1BQU07RUFDekIsb0JBQW9CLENBQUMsSUFBSSxFQUFDO0VBQzFCLG9CQUFvQixDQUFDLElBQUksRUFBQztFQUMxQixtQkFBbUI7QUFDbkI7RUFDQSxrQkFBa0IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0VBQzdCLG9CQUFvQixDQUFDLEdBQUcsRUFBQztFQUN6QixvQkFBb0IsQ0FBQyxHQUFHLEVBQUM7RUFDekIsbUJBQW1CLE1BQU07RUFDekIsb0JBQW9CLENBQUMsR0FBRyxFQUFDO0VBQ3pCLG9CQUFvQixDQUFDLEdBQUcsRUFBQztFQUN6QixtQkFBbUI7RUFDbkIsaUJBQWlCO0VBQ2pCLGVBQWU7RUFDZixjQUFjLENBQUMsSUFBSSxFQUFDO0VBQ3BCLGFBQWEsTUFBTSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDL0MsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUc7RUFDekIsYUFBYTtFQUNiLFlBQVksS0FBSztFQUNqQixXQUFXO0VBQ1gsVUFBVSxLQUFLLFFBQVE7RUFDdkIsVUFBVTtFQUNWLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFDO0FBQ2xDO0VBQ0EsWUFBWSxJQUFJLENBQUMsS0FBSyxJQUFJLEVBQUUsRUFBRSxpQkFBaUIsR0FBRSxFQUFFO0FBQ25EO0VBQ0EsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7RUFDOUIsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ3BCLGNBQWMsQ0FBQyxHQUFFO0VBQ2pCLGFBQWEsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7RUFDckMsY0FBYyxDQUFDLEdBQUU7RUFDakIsYUFBYTtBQUNiO0VBQ0EsWUFBWSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRTtFQUNwQyxjQUFjLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ25DLGFBQWEsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7RUFDekQsY0FBYyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7RUFDaEMsZ0JBQWdCLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3JDLGVBQWU7RUFDZixjQUFjLENBQUMsR0FBRTtBQUNqQjtFQUNBO0VBQ0EsY0FBYyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtFQUN0SCxnQkFBZ0IsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ25DLGdCQUFnQixDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQztFQUM3QyxnQkFBZ0IsQ0FBQyxHQUFFO0VBQ25CLGVBQWU7QUFDZjtFQUNBO0VBQ0EsY0FBYyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtFQUN4RixnQkFBZ0IsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUN2QyxnQkFBZ0IsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQztFQUNyRCxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUM7RUFDdEIsZUFBZTtFQUNmLGFBQWEsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0VBQzdELGNBQWMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ2pDLGNBQWMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNyQyxjQUFjLENBQUMsSUFBSSxFQUFDO0VBQ3BCLGFBQWEsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0VBQzdELGNBQWMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ2pDLGNBQWMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNyQyxjQUFjLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDckMsY0FBYyxDQUFDLElBQUksRUFBQztFQUNwQixhQUFhO0FBQ2I7RUFDQSxZQUFZLElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7RUFDL0IsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDdkIsY0FBYyxDQUFDO0VBQ2Ysb0JBQW9CLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztFQUN6QyxjQUFjLEtBQUs7RUFDbkIsYUFBYTtBQUNiO0VBQ0E7RUFDQSxXQUFXO0VBQ1gsVUFBVTtFQUNWLFlBQVksaUJBQWlCLEdBQUU7RUFDL0IsU0FBUztFQUNULE9BQU87QUFDUDtFQUNBLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO0VBQ25CLFFBQVEsTUFBTSxJQUFJLGNBQWMsRUFBRTtFQUNsQyxPQUFPO0FBQ1A7RUFDQSxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFDO0VBQzFCLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQztFQUN2QixNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDdkIsTUFBSztBQUNMO0VBQ0EsSUFBSSxTQUFTLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUM5QixNQUFNLElBQUksQ0FBQyxHQUFHLEVBQUM7RUFDZixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFO0VBQzlDLFFBQVEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0VBQ25CLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFDO0VBQ3pCLFNBQVM7RUFDVCxPQUFPO0VBQ1AsTUFBTSxPQUFPLENBQUM7RUFDZCxLQUFLO0FBQ0w7RUFDQSxJQUFJLFNBQVMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDN0IsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztFQUN4QixRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDaEIsT0FBTztBQUNQO0VBQ0EsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztFQUN4QixRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDaEIsT0FBTztBQUNQO0VBQ0EsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDO0VBQ2pCLE1BQU0sRUFBRSxPQUFPLENBQUMsRUFBRTtBQUNsQjtFQUNBO0VBQ0E7RUFDQTtFQUNBO0FBQ0E7RUFDQSxNQUFNLElBQUksR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFDO0VBQ3RCLE1BQU0sSUFBSSxDQUFDLEdBQUcsRUFBQztBQUNmO0VBQ0EsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDN0IsUUFBUSxHQUFHLEdBQUcsR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFDO0FBQzFCO0VBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxhQUFhLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRTtFQUMzQyxPQUFPO0VBQ1AsTUFBTSxPQUFPLENBQUM7RUFDZCxLQUFLO0FBQ0w7RUFDQSxJQUFJLFNBQVMsVUFBVSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFO0VBQ3BDLE1BQU0sSUFBSSxJQUFJLEdBQUcsRUFBQztFQUNsQixNQUFNLElBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQztBQUNuQztFQUNBLE1BQU0sS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUNwQztBQUNBO0VBQ0EsUUFBUSxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRTtBQUN2QztFQUNBLFFBQVEsSUFBSSxHQUFHLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBQztFQUM1QixRQUFRLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBRSxHQUFHLEVBQUM7RUFDNUIsT0FBTztFQUNQLE1BQU0sT0FBTyxDQUFDO0VBQ2QsS0FBSztBQUNMO0VBQ0EsSUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQ3hCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFO0VBQzFCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFO0FBQzFCO0VBQ0EsTUFBTSxPQUFPLENBQUMsRUFBRTtFQUNoQixRQUFRLENBQUMsSUFBSSxFQUFDO0VBQ2QsUUFBUSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUU7RUFDNUIsUUFBUSxDQUFDLElBQUksRUFBQztFQUNkLFFBQVEsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFO0VBQzVCLE9BQU87RUFDUCxLQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxJQUFJLFNBQVMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDN0IsTUFBTSxJQUFJLEVBQUUsSUFBSSxZQUFZLFFBQVEsQ0FBQyxFQUFFO0VBQ3ZDLFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQ2pDLE9BQU87QUFDUDtFQUNBLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7QUFDakI7RUFDQSxNQUFNLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRTtFQUMzQixRQUFRLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQ3pCLE9BQU8sTUFBTTtFQUNiLFFBQVEsQ0FBQyxHQUFHLEVBQUM7RUFDYixPQUFPO0FBQ1A7RUFDQSxNQUFNLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDbEIsTUFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBQztFQUN0QixNQUFNLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFDO0VBQ3RCLEtBQUs7QUFDTDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLEVBQUM7QUFDdkI7RUFDQSxJQUFJLFFBQVEsQ0FBQyxTQUFTLEdBQUc7QUFDekI7RUFDQSxNQUFNLENBQUMsRUFBRSxDQUFDO0VBQ1YsTUFBTSxDQUFDLEVBQUUsQ0FBQztFQUNWLE1BQU0sQ0FBQyxFQUFFLENBQUM7QUFDVjtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEdBQUcsRUFBRSxZQUFZO0VBQ3ZCLFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDM0MsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sR0FBRyxFQUFFLFlBQVk7RUFDdkIsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDckQsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUMzQixRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ25CLFFBQVEsT0FBTyxJQUFJLFFBQVE7RUFDM0IsVUFBVSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDcEQsVUFBVSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ3RCLFNBQVM7RUFDVCxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxHQUFHLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzNCLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbkIsUUFBUSxPQUFPLElBQUksUUFBUTtFQUMzQixVQUFVLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUNwRCxVQUFVLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDdEIsU0FBUztFQUNULE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDM0IsUUFBUSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNuQixRQUFRLE9BQU8sSUFBSSxRQUFRO0VBQzNCLFVBQVUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDckMsVUFBVSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ3RCLFNBQVM7RUFDVCxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxHQUFHLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzNCLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbkIsUUFBUSxPQUFPLElBQUksUUFBUTtFQUMzQixVQUFVLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ3JDLFVBQVUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUN0QixTQUFTO0VBQ1QsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sS0FBSyxFQUFFLFlBQVk7RUFDekIsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQztFQUNqQyxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxHQUFHLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzNCLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDNUMsVUFBVSxPQUFPLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQztFQUNsQyxTQUFTO0FBQ1Q7RUFDQSxRQUFRLElBQUksQ0FBQyxLQUFLLFNBQVMsRUFBRTtFQUM3QixVQUFVLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQzFELFNBQVM7QUFDVDtFQUNBLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbkIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFO0VBQ3ZDLFVBQVUsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDeEIsU0FBUztBQUNUO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtBQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLFFBQVEsT0FBTyxJQUFJLFFBQVE7RUFDM0IsVUFBVSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUNsRCxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7RUFDdEIsU0FBUztFQUNULE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDM0IsUUFBUSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztBQUNuQjtFQUNBO0FBQ0E7RUFDQSxRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDOUUsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUMzQixRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0FBQ25CO0VBQ0E7QUFDQTtFQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRTtFQUN2QyxVQUFVLE9BQU8sSUFBSSxRQUFRLEVBQUU7RUFDL0IsU0FBUztFQUNULFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FB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QUFDLFFBQVEsQ0FBQyxFQUFDO0VBQ3ZFLE9BQU8sTUFBTTtFQUNiLFFBQVEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUM7RUFDL0MsT0FBTztFQUNQLEtBQUssRUFBQztBQUNOO0VBQ0EsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEtBQUs7RUFDekMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtFQUM3QixRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFDO0VBQy9DLE9BQU87RUFDUCxLQUFLLEVBQUM7RUFDTixJQUFJLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUM7RUFDMUMsSUFBSSxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7RUFDOUIsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLENBQUMsR0FBRztFQUNiLElBQUksSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRTtFQUNwRCxJQUFJLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUU7RUFDL0IsUUFBUSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEdBQUc7RUFDM0IsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUMzQixJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsS0FBSztFQUN6QyxNQUFNLElBQUksS0FBSyxLQUFL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LEdBQUU7RUFDcEMsSUFBSSxJQUFJLFFBQVEsR0FBRyxHQUFFO0VBQ3JCLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDM0MsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVE7RUFDN0IsTUFBTSxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUMsQ0FBQyxFQUFDO0VBQzVCLE1BQU0sS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ2pELFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRO0VBQy9CLFFBQVEsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQ3JDLFVBQVUsT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQ3pDLFVBQVUsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUk7RUFDekIsU0FBUztFQUNULE9BQU87RUFDUCxNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDO0VBQzVCLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUk7RUFDckIsS0FBSztFQUNMLElBQUksUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFDO0VBQzlDLElBQUksT0FBTyxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUM7RUFDbkMsR0FBRztBQUNIO0VBQ0EsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFO0VBQ3ZCLElBQUksSUFBSSxFQUFFLElBQUksWUFBWSxVQUFVLENBQUMsRUFBRTtFQUN2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RSxHQUFHLEVBQUM7RUFDL0MsUUFBUSxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBQztFQUNsRCxRQUFRLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBQztFQUN0RCxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3pDLFVBQVUsTUFBTSxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDbEQsVUFBVSxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDeEQsVUFBVSxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDeEQsVUFBVSxJQUFJLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBRztFQUM3QyxVQUFVLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDM0IsWUFBWSxNQUFNLEVBQUUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQ3BELFlBQVksTUFBTSxHQUFHLEdBQUcsR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQzFELFlBQVksTUFBTSxHQUFHLEdBQUcsR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQzFELFlBQVksSUFBSSxJQUFJLEdBQUcsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBRztFQUNsRCxXQUFXO0VBQ1gsVUFBVSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHO0VBQzdCLFlBQVksR0FBRyxFQUFFLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQztFQUNyQyxZQUFZLE1BQU0sRUFBRSxLQUFLO0VBQ3pCLFlBQVc7RUFDWCxTQUFTO0VBQ1QsUUFBUSxLQUFLO0VBQ2IsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsQ0FBQztFQUNiLE1BQU0sU0FBUztFQUNmLFFBQVEsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFDO0VBQ2xFLFFBQVEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDekMsVUFBVSxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQ3hELFVBQVUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRztFQUM3QixZQUFZLEdBQUcsRUFBRSxJQUFJLFVBQVUsQ0FBQyxRQUFRLEdBQUcsR0FBRyxHQUFHLFFBQVEsQ0FBQztFQUMxRCxZQUFZLE1BQU0sRUFBRSxLQUFLO0VBQ3pCLFlBQVc7RUFDWCxTQUFTO0VBQ1QsT0FBTztFQUNQLEtBQUs7RUFDTCxHQUFHO0FBQ0g7RUFDQTtFQUNBLEVBQUUsY0FBYyxDQUFDLEdBQUc7RUFDcEI7RUFDQSxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3JDLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRztFQUN0QixRQUFRLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7RUFDL0UsUUFBUSxNQUFNLEVBQUUsS0FBSztFQUNyQixRQUFPO0VBQ1AsS0FBSztFQUNMLEdBQUc7QUFDSDtFQUNBO0FBQ0E7RUFDQSxFQUFFLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixFQUFFO0VBQ2hDO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsSUFBSSxRQUFRLGdCQUFnQjtFQUM1QixNQUFNLEtBQUssQ0FBQztFQUNaLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sR0FBRyxLQUFJLEVBQUUsRUFBQztFQUNwRCxRQUFRLEtBQUs7RUFDYixNQUFNLEtBQUssQ0FBQyxFQUFFO0VBQ2QsUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLEtBQUksRUFBRSxFQUFDO0VBQ3BELFFBQVEsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFDO0VBQ2hFLFFBQVEsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEdBQUc7RUFDNUMsWUFBWSxRQUFRO0VBQ3BCLFlBQVksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFDO0FBQ25DO0VBQ0EsUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sR0FBRyxNQUFLO0VBQzNDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLEdBQUcsS0FBSTtFQUM3QyxRQUFRLEtBQUs7RUFDYixPQUFPO0VBQ1AsTUFBTSxLQUFLLENBQUM7RUFDWixRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUcsS0FBSSxFQUFFLEVBQUM7RUFDdkQsUUFBUSxLQUFLO0VBQ2IsTUFBTTtFQUNOLFFBQVEsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUM7RUFDeEMsS0FBSztFQUNMLEdBQUc7RUFDSCxDQUFDO0FBQ0Q7RUFDQSxNQUFNLGVBQWUsU0FBUyxZQUFZLENBQUM7RUFDM0MsRUFBRSxXQUFXLENBQUMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFO0VBQzlCLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUM7QUFDeEI7RUFDQSxJQUFJLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFLO0VBQzVCLElBQUksTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU07RUFDOUIsSUFBSSxNQUFNLENBQUMsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFDO0VBQzVDLElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDO0FBQ3pCO0VBQ0E7RUFDQTtFQUNBLElBQUksSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0FBQ3pDO0VBQ0E7RUFDQSxJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsR0FBRTtFQUMxQixJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDaEMsTUFBTSxNQUFNLEtBQUssR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBQztFQUNyRCxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFDO0VBQ3RELEtBQUs7QUFDTDtFQUNBO0VBQ0EsSUFBSSxJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUU7RUFDeEIsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ2hDLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUM7RUFDM0YsS0FBSztBQUNMO0VBQ0EsSUFBSSxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUM7QUFDNUY7RUFDQSxJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUU7QUFDbkI7RUFDQSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFDO0FBQ3pCO0VBQ0E7RUFDQSxHQUFHO0FBQ0g7RUFDQSxFQUFFLFFBQVEsQ0FBQyxHQUFHO0VBQ2Q7RUFDQSxJQUFJLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQztFQUM3QyxJQUFJLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQztFQUNqRCxJQUFJLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBQztBQUNuRDtFQUNBO0VBQ0EsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUk7RUFDaEMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBQztFQUN4RSxLQUFLLEVBQUM7RUFDTixHQUFHO0FBQ0g7RUFDQSxFQUFFLFVBQVUsQ0FBQyxHQUFHO0VBQ2hCO0VBQ0EsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLO0VBQ3pDLE1BQU0sTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPO0VBQ2pDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0VBQzdCLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEdBQUU7RUFDMUIsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztFQUN2QixRQUFRLEdBQUcsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztFQUNqQyxRQUFRLEtBQUssRUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLEVBQUUsR0FBRyxLQUFLO0VBQ3BDLFFBQVEsS0FBSyxFQUFFLEtBQUs7RUFDcEIsUUFBUSxNQUFNLEVBQUUsZUFBZTtFQUMvQixRQUFRLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLGVBQWUsR0FBRyxlQUFlO0VBQzVELE9BQU8sRUFBQztFQUNSLEtBQUssRUFBQztBQUNOO0VBQ0E7RUFDQSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUs7RUFDdEMsTUFBTSxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU87RUFDakMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7RUFDN0IsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRTtFQUMxQixNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO0VBQ3ZCLFFBQVEsR0FBRyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0VBQy9CLFFBQVEsS0FBSyxFQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUcsRUFBRSxHQUFHLEtBQUs7RUFDcEMsUUFBUSxLQUFLLEVBQUUsS0FBSztFQUNwQixRQUFRLE1BQU0sRUFBRSxhQUFhO0VBQzdCLFFBQVEsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUcsYUFBYSxHQUFHLGFBQWE7RUFDeEQsT0FBTyxFQUFDO0VBQ1IsS0FBSyxFQUFDO0FBQ047RUFDQTtFQUNBLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7RUFDckIsTUFBTSxHQUFHLEVBQUUsSUFBSSxDQUFDLGNBQWM7RUFDOUIsTUFBTSxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNO0VBQzdCLE1BQU0sS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTTtFQUM3QixNQUFNLE1BQU0sRUFBRSxRQUFRO0VBQ3RCLE1BQU0sTUFBTSxFQUFFLFFBQVE7RUFDdEIsS0FBSyxFQUFDO0FBQ047RUFDQTtFQUNBLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJO0VBQzdCLE1BQU0sQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsTUFBSztFQUN0QixNQUFNLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLE9BQU07RUFDeEIsS0FBSyxFQUFDO0VBQ04sR0FBRztBQUNIO0VBQ0EsRUFBRSxNQUFNLENBQUMsR0FBRztFQUNaLElBQUksTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFDO0VBQzVDLElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDO0FBQ3pCO0VBQ0EsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUM7QUFDOUQ7RUFDQSxJQUFJLEdBQUcsQ0FBQyxTQUFTLEdBQUU7RUFDbkIsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ2hDLE1BQU0sTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUM7RUFDcEMsTUFBTSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUM7RUFDakQsTUFBTSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQztFQUMxQixNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFDO0VBQ2hDLEtBQUs7RUFDTCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUU7RUFDaEIsSUFBSSxHQUFHLENBQUMsU0FBUyxHQUFFO0FBQ25CO0VBQ0E7RUFDQSxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFDO0VBQzNCLEdBQUc7QUFDSDtFQUNBLEVBQUUsVUFBVSxDQUFDLEdBQUc7RUFDaEIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUk7RUFDN0IsTUFBTSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxNQUFLO0VBQ3RCLE1BQU0sQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsT0FBTTtFQUN4QixLQUFLLEVBQUM7RUFDTixJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFDO0VBQzNCLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFJO0VBQ3hCLEdBQUc7QUFDSDtFQUNBLEVBQUUsVUFBVSxDQUFDLEdBQUc7RUFDaEIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUk7RUFDN0IsTUFBTSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxNQUFLO0VBQ3RCLE1BQU0sQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsT0FBTTtFQUN4QixLQUFLLEVBQUM7RUFDTixJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFDO0VBQzNCLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxNQUFLO0VBQ3pCLEdBQUc7RUFDSDs7RUNoakJlLE1BQU0sS0FBSyxTQUFTLEtBQUssQ0FBQztFQUN6QyxFQUFFLFdBQVcsQ0FBQyxDQUFDLE9BQU8sRUFBRTtFQUN4QixJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUM7QUFDbEI7RUFDQSxJQUFJLE1BQU0sUUFBUSxHQUFHO0VBQ3JCLE1BQU0sVUFBVSxFQUFFLENBQUM7RUFDbkIsTUFBTSxLQUFLLEVBQUUsR0FBRztFQUNoQixNQUFNLEtBQUssRUFBRSxDQUFDLEtBQUssQ0FBQztFQUNwQixNQUFNLEtBQUssRUFBRSxJQUFJO0VBQ2pCLE1BQUs7RUFDTCxJQUFJLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUM7QUFDekQ7RUFDQSxJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLE1BQUs7QUFDL0I7RUFDQTtFQUNBLElBQUksSUFBSSxNQUFLO0VBQ2IsSUFBSSxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtFQUNyQyxNQUFNLEtBQUssR0FBRyxPQUFNO0VBQ3BCLEtBQUssTUFBTTtFQUNYLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFDO0VBQ3RDLEtBQUs7QUFDTDtFQUNBLElBQUksSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLEdBQUcsUUFBUSxDQUFDLFVBQVUsR0FBRyxjQUFjLEdBQUcsTUFBSztFQUM3RSxJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsU0FBUyxHQUFHLFFBQVEsQ0FBQyxNQUFLO0FBQ2pEO0VBQ0EsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFFO0VBQ2pCLEdBQUc7QUFDSDtFQUNBLEVBQUUsV0FBVyxXQUFXLENBQUMsR0FBRyxFQUFFLE9BQU8sbUJBQW1CLEVBQUU7RUFDMUQsQ0FBQztBQUNEO0VBQ0EsS0FBSyxDQUFDLFdBQVcsR0FBRztFQUNwQixFQUFFO0VBQ0YsSUFBSSxLQUFLLEVBQUUsZUFBZTtFQUMxQixJQUFJLEVBQUUsRUFBRSxPQUFPO0VBQ2YsSUFBSSxJQUFJLEVBQUUsa0JBQWtCO0VBQzVCLElBQUksYUFBYSxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUM7RUFDekMsSUFBSSxPQUFPLEVBQUUsRUFBRTtFQUNmLEdBQUc7RUFDSCxFQUFFO0VBQ0YsSUFBSSxLQUFLLEVBQUUsZUFBZTtFQUMxQixJQUFJLEVBQUUsRUFBRSxPQUFPO0VBQ2YsSUFBSSxJQUFJLEVBQUUsTUFBTTtFQUNoQixJQUFJLE9BQU8sRUFBRSxJQUFJO0VBQ2pCLEdBQUc7RUFDSDs7RUM3Q2UsTUFBTSxRQUFRLFNBQVMsS0FBSyxDQUFDO0VBQzVDLEVBQUUsV0FBVyxDQUFDLENBQUMsT0FBTyxFQUFFO0VBQ3hCLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBQztBQUNsQjtFQUNBLElBQUksTUFBTSxRQUFRLEdBQUc7RUFDckIsTUFBTSxVQUFVLEVBQUUsQ0FBQztFQUNuQixNQUFNLEtBQUssRUFBRSxHQUFHO0VBQ2hCLE1BQUs7RUFDTCxJQUFJLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUM7QUFDekQ7RUFDQSxJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLE1BQUs7QUFDL0I7RUFDQTtFQUNBLElBQUksTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBQztFQUNyRyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFHO0FBQ3JCO0VBQ0EsSUFBSSxJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsR0FBRyxhQUFZO0VBQ3pDLElBQUksSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBQztBQUMvQjtFQUNBLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRTtFQUNqQixHQUFHO0FBQ0g7RUFDQSxFQUFFLFdBQVcsV0FBVyxDQUFDLEdBQUc7RUFDNUIsSUFBSSxPQUFPLFVBQVU7RUFDckIsR0FBRztFQUNILENBQUM7QUFDRDtFQUNBLFFBQVEsQ0FBQyxXQUFXLEdBQUc7RUFDdkI7O0VDM0JBO0VBQ2UsTUFBTSxjQUFjLFNBQVMsS0FBSyxDQUFDO0VBQ2xEO0VBQ0EsRUFBRSxXQUFXLENBQUMsQ0FBQyxPQUFPLEVBQUU7RUFDeEI7RUFDQSxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUM7QUFDbEI7RUFDQSxJQUFJLE1BQU0sUUFBUSxHQUFHO0VBQ3JCLE1BQU0sVUFBVSxFQUFFLENBQUM7RUFDbkIsTUFBSztBQUNMO0VBQ0EsSUFBSSxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFDO0VBQ3pELElBQUksTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBQztBQUN6RDtFQUNBO0VBQ0EsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRTtFQUM1QixJQUFJLElBQUksSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSTtBQUM5QjtFQUNBLElBQUksUUFBUSxVQUFVO0VBQ3RCLE1BQU0sS0FBSyxDQUFDLENBQUM7RUFDYixNQUFNLEtBQUssQ0FBQyxDQUFDO0VBQ2IsTUFBTSxLQUFLLENBQUM7RUFDWixRQUFRLElBQUksR0FBRyxVQUFVLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUM7RUFDdEMsUUFBUSxJQUFJLEdBQUcsRUFBQztFQUNoQixRQUFRLElBQUksR0FBRyxVQUFVLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUU7RUFDdkMsUUFBUSxJQUFJLEdBQUcsR0FBRTtFQUNqQixRQUFRLENBQUMsR0FBRyxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksRUFBQztFQUNuQyxRQUFRLENBQUMsR0FBRyxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksRUFBQztFQUNuQyxRQUFRLEVBQUUsR0FBRyxVQUFVLEdBQUcsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBQztFQUN2RSxRQUFRLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUM7QUFDdkI7RUFDQSxRQUFRLElBQUksVUFBVSxHQUFHLENBQUMsRUFBRTtFQUM1QixVQUFVLEVBQUUsR0FBRyxXQUFXLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUM7RUFDdEMsU0FBUyxNQUFNO0VBQ2YsVUFBVSxFQUFFLEdBQUcsR0FBRTtFQUNqQixVQUFVLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFDLEVBQ3ZELFNBQVM7RUFDVCxRQUFRLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUM7RUFDdkIsUUFBUSxLQUFLO0VBQ2IsTUFBTSxLQUFLLENBQUMsQ0FBQztFQUNiLE1BQU0sU0FBUztFQUNmLFFBQVEsTUFBTSxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDcEMsUUFBUSxNQUFNLEVBQUUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3JDLFFBQVEsQ0FBQyxHQUFHLElBQUksUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUM7RUFDaEMsUUFBUSxFQUFFLEdBQUcsSUFBSSxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFDO0VBQy9DLFFBQVEsRUFBRSxHQUFHLElBQUksUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBQztFQUMvQyxRQUFRLENBQUMsR0FBRyxJQUFJLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUMzQyxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQztFQUM1QyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDN0IsUUFBUSxLQUFLO0VBQ2IsT0FBTztFQUNQLEtBQUs7QUFDTDtFQUNBLElBQUksTUFBTSxJQUFJO0VBQ2QsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTtFQUNqRCxVQUFVLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHO0VBQ3RELFlBQVksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJO0VBQzNELGNBQWMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FB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Q0E7RUFDQSxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxNQUFNLElBQUksTUFBSyxFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxNQUFLLEVBQUU7QUFDaEg7RUFDQTtFQUNBLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUMsRUFBQyxFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUMsRUFBQyxFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsRUFBRTtBQUN0SjtFQUNBLElBQUksT0FBTyxNQUFNO0VBQ2pCLEdBQUc7QUFDSDtFQUNBLEVBQUUsU0FBUyxDQUFDLEdBQUc7RUFDZjtFQUNBLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDNUQsU0FBUyxPQUFPLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsR0FBRztFQUMzQyxHQUFHO0FBQ0g7RUFDQSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUNYLElBQUksT0FBTyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztFQUM5QixHQUFHO0FBQ0g7RUFDQSxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRTtFQUNiO0VBQ0EsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssU0FBUyxFQUFFLE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUNsRixTQUFTLE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztFQUNsRCxHQUFHO0FBQ0g7RUFDQSxFQUFFLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRTtFQUNmLElBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztFQUNwRCxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRTtFQUM5QjtFQUNBLElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7RUFDcEQsR0FBRztFQUNIOztFQ2hEQTtXQUVnQixXQUFXLENBQUUsV0FBc0IsRUFBRSxRQUFnQjtNQUNuRSxNQUFNLGFBQWEsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7TUFDeEUsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsSUFBSSxPQUFPLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUE7TUFFaEUsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFBO01BQ2pCLFdBQVcsQ0FBQyxPQUFPLENBQUMsVUFBVSxJQUFJO1VBQ2hDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDMUIsSUFBSSxLQUFLLElBQUksQ0FBQyxFQUFFO2NBQ2QsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1dBQ2xDO2VBQU07Y0FDTCxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtXQUMxQjtPQUNGLENBQUMsQ0FBQTtNQUVGLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBQztFQUNuQzs7UUNWcUIsd0JBQXdCO01BT3pDLFlBQWEsTUFBZ0IsRUFBRSxPQUFrQixFQUFFLFFBQWdCLEVBQUUsV0FBcUIsRUFBRSxDQUFTO1VBQ25HLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO1VBQ3BCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFBO1VBQ3hCLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFBO1VBQzlCLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1VBQ1YsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUE7T0FDdkI7TUFFRCxPQUFPLE1BQU0sQ0FBRSxPQUFnQjtVQUM3QixNQUFNLFFBQVEsR0FBc0I7Y0FDbEMsZUFBZSxFQUFFLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUM7Y0FDN0MsT0FBTyxFQUFFLElBQUk7Y0FDYixnQkFBZ0IsRUFBRSxJQUFJO2NBQ3RCLGNBQWMsRUFBRSxDQUFDO2NBQ2pCLGNBQWMsRUFBRSxDQUFDO2NBQ2pCLFFBQVEsRUFBRSxHQUFHO2NBQ2IsUUFBUSxFQUFFLEVBQUU7Y0FDWixJQUFJLEVBQUUsQ0FBQztjQUNQLElBQUksRUFBRSxDQUFDO2NBQ1AsU0FBUyxFQUFFLEVBQUU7V0FDZCxDQUFBO1VBQ0QsT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTs7VUFHOUMsT0FBTyxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsV0FBVyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFBO1VBQ2pFLE9BQU8sQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsSUFBSSxPQUFPLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQTs7VUFHN0QsTUFBTSxDQUFDLEdBQVksV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1VBRTFELE1BQU0sSUFBSSxHQUFvQixRQUFRLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFBOztVQUcvRCxJQUFJLFdBQXVCLENBQUE7VUFDM0IsUUFBUSxJQUFJO2NBQ1YsS0FBSyxPQUFPO2tCQUNWLFdBQVcsR0FBRyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7a0JBQzlDLE1BQUs7Y0FDUCxLQUFLLFVBQVU7a0JBQ2IsV0FBVyxHQUFHLDZCQUE2QixDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtrQkFDdkQsTUFBSztjQUNQLEtBQUssS0FBSyxDQUFDO2NBQ1g7a0JBQ0UsV0FBVyxHQUFHLGtCQUFrQixDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtrQkFDNUMsTUFBSztXQUNSO1VBQ0QsV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQTs7VUFHbEMsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsR0FBa0MsV0FBVyxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7O1VBRy9GLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTs7VUFHOUQsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtVQUVyRCxPQUFPLElBQUksd0JBQXdCLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtPQUNsRjs7TUFHRCxVQUFVLE1BQWE7R0FDMUI7RUFFRCxTQUFTLG9CQUFvQixDQUFFLENBQVMsRUFBRSxPQUFnQjtNQUN4RCxNQUFNLFdBQVcsR0FBYyxFQUFFLENBQUE7TUFDakMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO01BQzNELElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUE7TUFDM0IsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFBO01BQ3RCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1VBQzlCLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1VBQ2hELElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1VBQ2IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLFFBQVEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQTtVQUNqRixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7VUFDckMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtVQUNqQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7Y0FBRSxXQUFXLEdBQUcsS0FBSyxDQUFBO1dBQUU7VUFDcEMsSUFBSSxJQUFJLENBQUMsQ0FBQTtVQUNULFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FDcEM7TUFDRCxNQUFNLGFBQWEsR0FBRyxXQUFXLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUE7TUFDOUQsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUE7TUFDNUQsTUFBTSxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7TUFDdEIsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtNQUVuQyxPQUFPLFdBQVcsQ0FBQTtFQUNwQixDQUFDO0VBRUQsU0FBUyxrQkFBa0IsQ0FBRSxDQUFTLEVBQUUsT0FBZ0I7TUFDdEQsTUFBTSxXQUFXLEdBQWMsRUFBRSxDQUFBO01BRWpDLE1BQU0sU0FBUyxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsS0FBSyxJQUFJLElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO01BQ3RHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxJQUFJLFNBQVM7VUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFBO01BRWxELE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtNQUMzRCxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFBO01BQzNCLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQTs7TUFHbEIsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFO1VBQ25CLFVBQVUsRUFBRSxDQUFBO1VBQ1osV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtVQUVuQyxJQUFJLElBQUksQ0FBQyxDQUFBO09BQ1Y7TUFFRCxJQUFJLFNBQVMsRUFBRTtVQUNiLFVBQVUsRUFBRSxDQUFBO1VBQ1osTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUNuQixPQUFPLENBQUMsUUFBUSxFQUNoQixJQUFJLEdBQUcsT0FBTyxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQ3JDLENBQUE7VUFDRCxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1VBRW5DLElBQUksSUFBSSxDQUFDLENBQUE7T0FDVjs7TUFHRCxPQUFPLFVBQVUsR0FBRyxDQUFDLEVBQUU7O1VBRXJCLFVBQVUsRUFBRSxDQUFBO1VBQ1osSUFBSSxJQUFJLENBQUMsQ0FBQTtVQUNULE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQ25CLElBQUksR0FBRyxPQUFPLENBQUMsUUFBUSxHQUFHLFVBQVUsRUFDcEMsT0FBTyxDQUFDLFdBQVcsQ0FDcEIsQ0FBQTtVQUNELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQ25CLE9BQU8sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxFQUNwQixDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQ3JCLENBQUE7VUFDRCxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1VBQ2pDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFFbkMsSUFBSSxJQUFJLENBQUMsQ0FBQTtPQUNWOztNQUdELFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxFQUFFLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO01BRzFDLE9BQU8sV0FBVyxDQUFBO0VBQ3BCLENBQUM7RUFFRCxTQUFTLDZCQUE2QixDQUFFLENBQVMsRUFBRSxPQUFnQjtNQUNqRSxNQUFNLFdBQVcsR0FBZSxFQUFFLENBQUE7TUFFbEMsTUFBTSxTQUFTLElBQWMsT0FBTyxDQUFDLGdCQUFnQixLQUFLLElBQUksSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7TUFDakgsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLElBQUksU0FBUztVQUFFLENBQUMsR0FBRyxDQUFDLENBQUE7OztNQUlsRCxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUE7TUFDbEIsTUFBTSxVQUFVLEdBQUcsU0FBUztZQUN4QixXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNyRixRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7TUFDckUsSUFBSSxTQUFTLEdBQUcsVUFBVSxDQUFBOztNQUcxQixJQUFJLFNBQVMsRUFBRTs7VUFFYixVQUFVLEVBQUUsQ0FBQTtVQUNaLE1BQU0sT0FBTyxHQUFHLGVBQWUsQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUE7VUFDL0csTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUE7VUFDcEMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUNwQzs7O01BS0QsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFO1VBQ25CLFVBQVUsRUFBRSxDQUFBO1VBQ1osV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtVQUNuQyxTQUFTLElBQUksQ0FBQyxDQUFBO09BQ2Y7O01BR0QsT0FBTyxVQUFVLEdBQUcsQ0FBQyxFQUFFO1VBQ3JCLFVBQVUsRUFBRSxDQUFBO1VBQ1osTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFBO1VBQ2QsTUFBTSxJQUFJLEdBQUcsU0FBUyxHQUFHLFVBQVUsQ0FBQTtVQUNuQyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1VBQ2pDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDbkMsU0FBUyxJQUFJLENBQUMsQ0FBQTtPQUNmOztNQUdELFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7TUFDM0MsT0FBTyxXQUFXLENBQUE7RUFDcEI7O1FDck1xQiw4QkFBK0IsU0FBUSx1QkFBdUI7TUFZL0UsWUFBYSxJQUE4QixFQUFFLE9BQWlDO1VBQzVFLEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7VUFDcEIsTUFBTSxhQUFhLEdBQW1CO2NBQ3BDLEdBQUcsRUFBRSxJQUFJLEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7Y0FDcEMsS0FBSyxFQUFFLEVBQUU7Y0FDVCxLQUFLLEVBQUUsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUztjQUNsQyxNQUFNLEVBQUUsUUFBUTtjQUNoQixNQUFNLEVBQUUsY0FBYztXQUN2QixDQUFBO1VBQ0QsYUFBYSxDQUFDLEtBQUssR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFBO1VBQzFDLGFBQWEsQ0FBQyxJQUFJLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQTtVQUV4QyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFzQixDQUFDLENBQUE7T0FDekM7OztFQy9CTDtRQVFxQiwyQkFBNEIsU0FBUSxRQUFRO01BSS9ELFlBQWEsSUFBOEIsRUFBRSxJQUFvQztVQUMvRSxLQUFLLEVBQUUsQ0FBQTtVQUNQLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO1VBQ2hCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO09BQ2pCO01BRUQsT0FBTyxNQUFNLENBQUUsT0FBdUIsRUFBRSxXQUFxQztVQUMzRSxNQUFNLFFBQVEsR0FBb0I7Y0FDaEMsUUFBUSxFQUFFLEdBQUc7Y0FDYixRQUFRLEVBQUUsRUFBRTtjQUNaLElBQUksRUFBRSxDQUFDO2NBQ1AsSUFBSSxFQUFFLENBQUM7Y0FDUCxRQUFRLEVBQUUsS0FBSztXQUNoQixDQUFBO1VBQ0QsT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtVQUU5QyxNQUFNLElBQUksR0FBRyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7VUFDckQsTUFBTSxJQUFJLEdBQUcsSUFBSSw4QkFBOEIsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUE7VUFFbEUsT0FBTyxJQUFJLDJCQUEyQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtPQUNuRDtNQUVELFdBQVcsV0FBVyxLQUFlLE9BQU8sd0JBQXdCLENBQUEsRUFBRTs7O1FDNUJuRCxnQ0FBaUMsU0FBUSx5QkFBeUI7TUFFckYsWUFBYSxJQUE4QixFQUFFLE9BQW9CO1VBQy9ELEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7VUFFcEIsTUFBTSxhQUFhLEdBQW1CO2NBQ3BDLEdBQUcsRUFBRSxJQUFJLEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7Y0FDcEMsS0FBSyxFQUFFLEVBQUU7Y0FDVCxLQUFLLEVBQUUsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUztjQUNsQyxNQUFNLEVBQUUsUUFBUTtjQUNoQixNQUFNLEVBQUUsY0FBYztXQUN2QixDQUFBO1VBQ0QsYUFBYSxDQUFDLEtBQUssR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFBO1VBQzFDLGFBQWEsQ0FBQyxJQUFJLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQTtVQUV4QyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFzQixDQUFDLENBQUE7T0FDekM7OztRQ2ZrQiw2QkFBOEIsU0FBUSxRQUFRO01BSWpFLFlBQWEsSUFBOEIsRUFBRSxJQUErQjtVQUMxRSxLQUFLLEVBQUUsQ0FBQTtVQUNQLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO1VBQ2hCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO09BQ2pCO01BRUQsT0FBTyxNQUFNLENBQUUsT0FBdUIsRUFBRSxXQUF3QjtVQUM5RCxNQUFNLGVBQWUsR0FBb0I7Y0FDdkMsUUFBUSxFQUFFLEdBQUc7Y0FDYixJQUFJLEVBQUUsQ0FBQztjQUNQLElBQUksRUFBRSxDQUFDO2NBQ1AsUUFBUSxFQUFFLEtBQUs7V0FDaEIsQ0FBQTtVQUNELE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1VBRXZDLE1BQU0sSUFBSSxHQUFHLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQTtVQUNyRCxNQUFNLElBQUksR0FBRyxJQUFJLGdDQUFnQyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtVQUVwRSxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtPQUM1QjtNQUVELFdBQVcsV0FBVyxLQUFlLE9BQU8sd0JBQXdCLENBQUEsRUFBRTs7O1FDMUJuRCwrQkFBZ0MsU0FBUSx5QkFBeUI7TUFFcEYsWUFBYSxJQUE2QixFQUFFLE9BQW9CO1VBQzlELEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7VUFDcEIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUE7VUFDN0MsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtVQUV2QixNQUFNLGdCQUFnQixHQUFVO2NBQzlCLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO2NBQzFDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO2NBQzFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO2NBQ3pDLE1BQU0sRUFBRSxZQUFZO2NBQ3BCLE1BQU0sRUFBRSxZQUFZO2NBQ3BCLEtBQUssRUFBRSxZQUFZO2NBQ25CLEdBQUcsRUFBRSxJQUFJLEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7V0FDckMsQ0FBQTtVQUNELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUE7T0FDbkM7OztRQ2ZrQix1QkFBd0IsU0FBUSx3QkFBd0I7TUFRM0UsWUFBYSxNQUFnQixFQUFFLE9BQWtCLEVBQUUsUUFBZ0IsRUFBRSxXQUFxQixFQUFFLFlBQXNCO1VBQ2hILEtBQUssQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUE7VUFDbkQsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUE7T0FDakM7TUFFRCxPQUFPLE1BQU0sQ0FBRSxPQUF1QjtVQUNwQyxNQUFNLFFBQVEsR0FBbUI7Y0FDL0IsSUFBSSxFQUFFLENBQUM7Y0FDUCxJQUFJLEVBQUUsQ0FBQztjQUNQLFFBQVEsRUFBRSxFQUFFO2NBQ1osU0FBUyxFQUFFLENBQUMsRUFBRTtjQUNkLFNBQVMsRUFBRSxFQUFFO2NBQ2IsYUFBYSxFQUFFLENBQUM7Y0FDaEIsYUFBYSxFQUFFLENBQUM7Y0FDaEIsS0FBSyxFQUFFLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDO1dBQy9DLENBQUE7VUFDRCxPQUFPLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1VBRTlDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtVQUNqRCxNQUFNLFdBQVcsR0FBYSxFQUFFLENBQUE7VUFDaEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtjQUMxQixXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7V0FDN0M7VUFDRCxJQUFJLFdBQVcsR0FBYyxFQUFFLENBQUE7VUFDL0IsSUFBSSxZQUFZLEdBQWEsRUFBRSxDQUFBO1VBRS9CLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7OztVQUtuQyxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUE7VUFDbkIsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFBO1VBQ3BCLE9BQU8sQ0FBQyxPQUFPLEVBQUU7Y0FDZixJQUFJLFlBQVksR0FBRyxFQUFFLEVBQUU7a0JBQ3JCLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7a0JBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEdBQUcsWUFBWSxHQUFHLFdBQVcsQ0FBQyxDQUFBO2tCQUMxRCxPQUFPLEdBQUcsSUFBSSxDQUFBO2VBQ2Y7Y0FDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2tCQUMxQixNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO2tCQUNwQyxRQUFRLElBQUk7c0JBQ1YsS0FBSyxLQUFLLEVBQUU7MEJBQ1YsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBOzBCQUNoRSxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7MEJBQ2hELFlBQVksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxRQUFRLFVBQVUsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLFdBQVcsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBOzBCQUN4SSxNQUFLO3VCQUNOO3NCQUNELEtBQUssVUFBVSxFQUFFOzBCQUNmLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQTswQkFDNUUsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBOzBCQUN0RCxZQUFZLENBQUMsSUFBSSxDQUFDLGlCQUFpQixNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsUUFBUSxVQUFVLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxXQUFXLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTswQkFDNUksTUFBSzt1QkFDTjtzQkFDRCxLQUFLLFNBQVMsRUFBRTswQkFDZCxNQUFNLFVBQVUsR0FBRyxlQUFlLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTswQkFDN0MsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQTswQkFDcEMsTUFBTSxVQUFVLEdBQUcsUUFBUSxHQUFHLENBQUMsR0FBRyxVQUFVLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFBOzBCQUN6RSxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7MEJBQ3RELFlBQVksQ0FBQyxJQUFJLENBQ2YsaUJBQWlCLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxTQUFTLFVBQVUsUUFBUSxRQUFRLEdBQUcsUUFBUSxHQUFHLFNBQVMsZ0JBQWdCLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTswQkFDeEosTUFBSzt1QkFDTjtzQkFDRCxLQUFLLE9BQU8sRUFBRTswQkFDWixNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBOzBCQUM1QixNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBOzBCQUM1QixNQUFNLFVBQVUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBOzBCQUN4QixXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7MEJBQ3RELFlBQVksQ0FBQyxJQUFJLENBQ2YsOEJBQThCLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxlQUFlLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FDdkgsQ0FBQTt1QkFDRjttQkFDRjtlQUNGOztjQUVELE9BQU8sR0FBRyxJQUFJLENBQUE7Y0FDZCxNQUFNLGFBQWEsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7Y0FDeEUsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsSUFBSSxPQUFPLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO2NBRXhFLFdBQVcsQ0FBQyxPQUFPLENBQUMsVUFBVSxJQUFJO2tCQUNoQyxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRTtzQkFDL0MsT0FBTyxHQUFHLEtBQUssQ0FBQTtzQkFDZixZQUFZLEdBQUcsRUFBRSxDQUFBO3NCQUNqQixXQUFXLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTttQkFDL0I7ZUFDRixDQUFDLENBQUE7Y0FFRixZQUFZLEVBQUUsQ0FBQTtXQUNmO1VBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDLENBQUE7VUFFeEMsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFBO1VBQ2hFLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQTtVQUV0QyxPQUFPLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUE7T0FDOUU7R0FDRjtFQUVEOzs7OztFQUtBLFNBQVMsVUFBVSxDQUFFLE1BQWMsRUFBRSxRQUFpQjtNQUNwRCxRQUFRLFFBQVE7VUFDZCxLQUFLLEdBQUc7Y0FDTixRQUFRLE1BQU07a0JBQ1osS0FBSyxDQUFDLEVBQUUsT0FBTyxhQUFhLENBQUE7a0JBQzVCLEtBQUssQ0FBQyxFQUFFLE9BQU8sUUFBUSxDQUFBO2tCQUN2QixTQUFTLE9BQU8sSUFBSSxNQUFNLHFCQUFxQixDQUFBO2VBQ2hEO1VBQ0gsS0FBSyxHQUFHO2NBQ04sUUFBUSxNQUFNO2tCQUNaLEtBQUssQ0FBQyxFQUFFLE9BQU8sYUFBYSxDQUFBO2tCQUM1QixTQUFTLE9BQU8sSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxXQUFXLEdBQUcsV0FBVyxFQUFFLENBQUE7ZUFDdEc7T0FDSjtFQUNIOztRQy9IcUIsNEJBQTZCLFNBQVEsUUFBUTtNQUdoRSxZQUFhLElBQTZCLEVBQUUsSUFBcUM7VUFDL0UsS0FBSyxFQUFFLENBQUE7VUFDUCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtVQUNoQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtPQUNqQjtNQUVELE9BQU8sTUFBTSxDQUFFLE9BQXNCLEVBQUUsV0FBd0I7VUFDN0QsTUFBTSxlQUFlLEdBQW1CO2NBQ3RDLFFBQVEsRUFBRSxHQUFHO2NBQ2IsSUFBSSxFQUFFLENBQUM7Y0FDUCxJQUFJLEVBQUUsQ0FBQztjQUNQLFFBQVEsRUFBRSxLQUFLO1dBQ2hCLENBQUE7VUFDRCxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQTtVQUV2QyxNQUFNLElBQUksR0FBRyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7VUFDcEQsTUFBTSxJQUFJLEdBQUcsSUFBSSwrQkFBK0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUE7VUFFbkUsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7T0FDNUI7TUFFRCxXQUFXLFdBQVcsS0FBZSxPQUFPLHdCQUF3QixDQUFBLEVBQUU7OztRQ3hCbkQsNkJBQThCLFNBQVEsdUJBQXVCO01BRWhGLFlBQWEsSUFBNkIsRUFBRSxPQUFpQztVQUMzRSxLQUFLLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1VBQ3BCLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7VUFDdkIsTUFBTSxnQkFBZ0IsR0FBVztjQUMvQixLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztjQUMxQyxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztjQUMxQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztjQUN6QyxNQUFNLEVBQUUsWUFBWTtjQUNwQixNQUFNLEVBQUUsWUFBWTtjQUNwQixLQUFLLEVBQUUsWUFBWTtjQUNuQixHQUFHLEVBQUUsSUFBSSxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO1dBQ3JDLENBQUE7VUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO09BQ25DOzs7UUNma0Isb0JBQXFCLFNBQVEsUUFBUTtNQUl4RCxZQUFhLElBQTZCLEVBQUUsSUFBbUM7VUFDN0UsS0FBSyxFQUFFLENBQUE7VUFDUCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtVQUNoQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtPQUNqQjtNQUVELE9BQU8sTUFBTSxDQUFFLE9BQXNCLEVBQUUsV0FBcUM7VUFDMUUsTUFBTSxRQUFRLEdBQW1CO2NBQy9CLFFBQVEsRUFBRSxHQUFHO2NBQ2IsUUFBUSxFQUFFLEVBQUU7Y0FDWixJQUFJLEVBQUUsQ0FBQztjQUNQLElBQUksRUFBRSxDQUFDO2NBQ1AsUUFBUSxFQUFFLEtBQUs7V0FDaEIsQ0FBQTtVQUNELE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUE7VUFFOUMsV0FBVyxHQUFHLFdBQVcsSUFBSSxFQUFFLENBQUE7VUFFL0IsTUFBTSxJQUFJLEdBQUcsdUJBQXVCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1VBQ3BELE1BQU0sSUFBSSxHQUFHLElBQUksNkJBQTZCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1VBRWpFLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO09BQzVCOzs7RUNoQ0g7Ozs7OztRQWdDcUIsY0FBZSxTQUFRLFFBQVE7TUFHbEQsWUFBYSxRQUFrQjtVQUM3QixLQUFLLEVBQUUsQ0FBQTtVQUNQLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFBO09BQ3pCO01BRUQsT0FBTyxNQUFNLENBQ1gsT0FLQztVQUNELElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2NBQzlCLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQTtXQUNoRDtVQUVELE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7VUFDcEMsSUFBSSxPQUF5QixDQUFBO1VBQzdCLE1BQU0sZUFBZSxHQUFxQixFQUFFLENBQUE7VUFFNUMsUUFBUSxPQUFPLENBQUMsVUFBVTtjQUN4QixLQUFLLENBQUM7a0JBQ0osT0FBTyxHQUFHLFFBQVEsQ0FBQTtrQkFDbEIsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7a0JBQ3hCLGVBQWUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO2tCQUN4QixNQUFLO2NBQ1AsS0FBSyxDQUFDO2tCQUNKLE9BQU8sR0FBRyxRQUFRLENBQUE7a0JBQ2xCLGVBQWUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO2tCQUN4QixlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtrQkFDeEIsTUFBSztjQUNQLEtBQUssQ0FBQztrQkFDSixPQUFPLEdBQUcsVUFBVSxDQUFBO2tCQUNwQixlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtrQkFDeEIsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7a0JBQ3hCLE1BQUs7Y0FDUCxLQUFLLENBQUM7a0JBQ0osT0FBTyxHQUFHLFNBQVMsQ0FBQTtrQkFDbkIsZUFBZSxDQUFDLGVBQWUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO2tCQUM5QyxlQUFlLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFBO2tCQUN4QyxlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtrQkFDeEIsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7a0JBQ3hCLE1BQUs7Y0FDUCxLQUFLLENBQUM7a0JBQ0osT0FBTyxHQUFHLFNBQVMsQ0FBQTtrQkFDbkIsZUFBZSxDQUFDLGVBQWUsR0FBRyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQTtrQkFDckQsZUFBZSxDQUFDLGdCQUFnQixHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7a0JBQy9DLGVBQWUsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFBO2tCQUM5QixlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtrQkFDeEIsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7a0JBQ3hCLE1BQUs7Y0FDUCxLQUFLLENBQUM7a0JBQ0osT0FBTyxHQUFHLFNBQVMsQ0FBQTtrQkFDbkIsZUFBZSxDQUFDLGVBQWUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO2tCQUMzQyxlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtrQkFDeEIsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7a0JBQ3hCLE1BQUs7Y0FDUCxLQUFLLENBQUM7a0JBQ0osT0FBTyxHQUFHLFFBQVEsQ0FBQTtrQkFDbEIsZUFBZSxDQUFDLEtBQUssR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7a0JBQ3ZELGVBQWUsQ0FBQyxJQUFJLEdBQUcsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7a0JBQy9DLE1BQUs7Y0FDUCxLQUFLLENBQUM7a0JBQ0osT0FBTyxHQUFHLFFBQVEsQ0FBQTtrQkFDbEIsZUFBZSxDQUFDLEtBQUssR0FBRyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQTtrQkFDM0MsZUFBZSxDQUFDLElBQUksR0FBRyxlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtrQkFDL0MsTUFBSztjQUNQLEtBQUssQ0FBQztrQkFDSixPQUFPLEdBQUcsUUFBUSxDQUFBO2tCQUNsQixlQUFlLENBQUMsS0FBSyxHQUFHLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFBO2tCQUM3QyxlQUFlLENBQUMsSUFBSSxHQUFHLGVBQWUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO2tCQUMvQyxNQUFLO2NBQ1AsS0FBSyxFQUFFO2tCQUNMLE9BQU8sR0FBRyxRQUFRLENBQUE7a0JBQ2xCLGVBQWUsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQTtrQkFDL0QsZUFBZSxDQUFDLElBQUksR0FBRyxlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtrQkFDL0MsTUFBSztjQUNQO2tCQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO1dBQ3JFO1VBRUQsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQTtPQUN0RTtNQUVELE9BQU8seUJBQXlCLENBQUUsSUFBa0IsRUFBRSxPQUF5QixFQUFFLGVBQWlDLEVBQUUsV0FBc0M7VUFDeEosSUFBSSxRQUFrQixDQUFBO1VBQ3RCLGVBQWUsR0FBRyxlQUFlLElBQUksRUFBRSxDQUFBO1VBQ3ZDLFdBQVcsR0FBRyxXQUFXLElBQUksRUFBRSxDQUFBO1VBQy9CLFFBQVEsSUFBSTtjQUNWLEtBQUssTUFBTSxDQUFDO2NBQ1osS0FBSyxNQUFNLEVBQUU7a0JBQ1gsZUFBZSxDQUFDLFFBQVEsR0FBRyxDQUFDLElBQUksS0FBSyxNQUFNLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQTtrQkFDeEQsUUFBUSxPQUFPO3NCQUNiLEtBQUssUUFBUSxDQUFDO3NCQUNkLEtBQUssVUFBVTswQkFDYixlQUFlLENBQUMsUUFBUSxHQUFHLE9BQU8sS0FBSyxVQUFVLENBQUE7MEJBQ2pELFFBQVEsR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLFdBQVcsQ0FBQyxDQUFBOzBCQUNwRSxNQUFLO3NCQUNQLEtBQUssU0FBUzswQkFDWixRQUFRLEdBQUcsMkJBQTJCLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxXQUFXLENBQUMsQ0FBQTswQkFDM0UsTUFBSztzQkFDUCxLQUFLLFFBQVE7MEJBQ1gsUUFBUSxHQUFHLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUE7MEJBQ3BFLE1BQUs7c0JBQ1A7MEJBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsT0FBTyxFQUFFLENBQUMsQ0FBQTttQkFDbkQ7a0JBQ0QsTUFBSztlQUNOO2NBQ0QsS0FBSyxVQUFVLEVBQUU7a0JBQ2YsZUFBZSxDQUFDLFFBQVEsSUFBSSxPQUFPLEtBQUssVUFBVSxDQUFDLENBQUE7a0JBQ25ELFFBQVEsT0FBTztzQkFDYixLQUFLLFFBQVEsQ0FBQztzQkFDZCxLQUFLLFVBQVU7MEJBQ2IsUUFBUSxHQUFHLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUE7MEJBQ3RFLE1BQUs7c0JBQ1AsS0FBSyxTQUFTOzBCQUNaLFFBQVEsR0FBRyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLFdBQVcsQ0FBQyxDQUFBOzBCQUM3RSxNQUFLO3NCQUNQLEtBQUssUUFBUTswQkFDWCxRQUFRLEdBQUcsNEJBQTRCLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxXQUFXLENBQUMsQ0FBQTswQkFDNUUsTUFBSztzQkFDUDswQkFDRSxNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixPQUFPLEVBQUUsQ0FBQyxDQUFBO21CQUNuRDtrQkFDRCxNQUFLO2VBQ047Y0FDRDtrQkFDRSxNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixJQUFJLEVBQUUsQ0FBQyxDQUFBO1dBQzFDO1VBRUQsT0FBTyxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtPQUNwQztNQUVELE1BQU0sS0FBb0IsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFBLEVBQUU7TUFDekQsTUFBTSxLQUFhLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUEsRUFBRTtNQUMzQyxVQUFVLEtBQWEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQSxFQUFFO01BQ25ELFVBQVUsS0FBYSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFBLEVBQUU7TUFDbkQsWUFBWSxLQUFhLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLENBQUEsRUFBRTtNQUV2RCxXQUFXLFdBQVc7VUFDcEIsT0FBTztjQUNMO2tCQUNFLElBQUksRUFBRSxTQUFTO2tCQUNmLEtBQUssRUFBRSxFQUFFO2VBQ1Y7Y0FFRDtrQkFDRSxLQUFLLEVBQUUsT0FBTztrQkFDZCxFQUFFLEVBQUUsT0FBTztrQkFDWCxJQUFJLEVBQUUsa0JBQWtCO2tCQUN4QixhQUFhLEVBQUU7c0JBQ2IsRUFBRSxLQUFLLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRTtzQkFDM0MsRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRTtzQkFDdkMsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUU7bUJBQ3RDO2tCQUNELE9BQU8sRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDO2tCQUNyQyxRQUFRLEVBQUUsSUFBSTtlQUNmO2NBQ0Q7a0JBQ0UsSUFBSSxFQUFFLGNBQWM7ZUFDckI7Y0FDRDtrQkFDRSxJQUFJLEVBQUUsTUFBTTtrQkFDWixLQUFLLEVBQUUsMkNBQTJDO2tCQUNsRCxPQUFPLEVBQUUsS0FBSztrQkFDZCxFQUFFLEVBQUUsUUFBUTtrQkFDWixLQUFLLEVBQUUsTUFBTTtlQUNkO2NBQ0Q7a0JBQ0UsSUFBSSxFQUFFLE1BQU07a0JBQ1osS0FBSyxFQUFFLFFBQVE7a0JBQ2YsRUFBRSxFQUFFLFFBQVE7a0JBQ1osT0FBTyxFQUFFLElBQUk7a0JBQ2IsVUFBVSxFQUFFLFNBQVM7ZUFDdEI7V0FDRixDQUFBO09BQ0Y7TUFFRCxXQUFXLFdBQVc7VUFDcEIsT0FBTyx3QkFBd0IsQ0FBQTtPQUNoQzs7O0VDOU1ILE1BQU0sU0FBUyxHQUFHO0VBQ2xCLEVBQUU7RUFDRixJQUFJLEVBQUUsRUFBRSxvQkFBb0I7RUFDNUIsSUFBSSxLQUFLLEVBQUUsOEJBQThCO0VBQ3pDLElBQUksS0FBSyxFQUFFLGtCQUFrQjtFQUM3QixHQUFHO0VBQ0gsRUFBRTtFQUNGLElBQUksRUFBRSxFQUFFLFlBQVk7RUFDcEIsSUFBSSxLQUFLLEVBQUUsMEJBQTBCO0VBQ3JDLElBQUksS0FBSyxFQUFFLFFBQVE7RUFDbkIsR0FBRztFQUNILEVBQUU7RUFDRixJQUFJLEVBQUUsRUFBRSxhQUFhO0VBQ3JCLElBQUksS0FBSyxFQUFFLHlCQUF5QjtFQUNwQyxJQUFJLEtBQUssRUFBRSxXQUFXO0VBQ3RCLEdBQUc7RUFDSCxFQUFFO0VBQ0YsSUFBSSxFQUFFLEVBQUUsZ0JBQWdCO0VBQ3hCLElBQUksS0FBSyxFQUFFLGdCQUFnQjtFQUMzQixJQUFJLEtBQUssRUFBRSxjQUFjO0VBQ3pCLEdBQUc7RUFDSCxFQUFFO0VBQ0YsSUFBSSxFQUFFLEVBQUUsa0JBQWtCO0VBQzFCLElBQUksS0FBSyxFQUFFLHNDQUFzQztFQUNqRCxJQUFJLEtBQUssRUFBRSxjQUFjO0VBQ3pCLEdBQUc7RUFDSCxFQUFFO0VBQ0YsSUFBSSxFQUFFLEVBQUUsZ0JBQWdCO0VBQ3hCLElBQUksS0FBSyxFQUFFLGFBQWE7RUFDeEIsSUFBSSxLQUFLLEVBQUUsV0FBVztFQUN0QixHQUFHO0VBQ0gsRUFBRTtFQUNGLElBQUksRUFBRSxFQUFFLE1BQU07RUFDZCxJQUFJLEtBQUssRUFBRSxnQkFBZ0I7RUFDM0IsSUFBSSxLQUFLLEVBQUUsS0FBSztFQUNoQixHQUFHO0VBQ0gsRUFBQztBQUNEO0VBQ0EsU0FBUyxRQUFRLEVBQUUsRUFBRSxFQUFFO0VBQ3ZCO0FBQ0E7RUFDQTtFQUNBLEVBQUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDN0MsSUFBSSxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFO0VBQ2hDLE1BQU0sT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztFQUMvQixLQUFLO0VBQ0wsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLElBQUk7RUFDYixDQUFDO0FBQ0Q7RUFDQSxTQUFTLFFBQVEsRUFBRSxFQUFFLEVBQUU7RUFDdkI7RUFDQTtFQUNBLEVBQUUsT0FBTyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSztFQUNqRCxDQUFDO0FBQ0Q7RUFDQSxTQUFTLGNBQWMsRUFBRSxFQUFFLEVBQUU7RUFDN0IsRUFBRSxPQUFPLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXO0VBQ2pDLENBQUM7QUFDRDtFQUNBLFNBQVMsU0FBUyxJQUFJO0VBQ3RCO0VBQ0EsRUFBRSxPQUFPLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0VBQzNELENBQUM7QUFDRDtFQUNBLFNBQVMsV0FBVyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUU7RUFDbkM7RUFDQSxFQUFFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxFQUFFLEVBQUM7RUFDcEMsRUFBRSxJQUFJLFNBQVE7RUFDZCxFQUFFLElBQUksYUFBYSxDQUFDLE1BQU0sRUFBRTtFQUM1QixJQUFJLFFBQVEsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBQztFQUM1QyxHQUFHLE1BQU07RUFDVCxJQUFJLFFBQVEsR0FBRyxJQUFJLGFBQWEsQ0FBQyxPQUFPLEVBQUM7RUFDekMsR0FBRztFQUNILEVBQUUsT0FBTyxRQUFRO0VBQ2pCLENBQUM7QUFDRDtFQUNBLFNBQVMsYUFBYSxFQUFFLEVBQUUsRUFBRTtFQUM1QixFQUFFLE1BQU0sV0FBVyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLFdBQVcsSUFBSSxHQUFFO0VBQ3RELEVBQUUsT0FBTyxJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUM7RUFDcEMsQ0FBQztBQUNEO0VBQ0EsU0FBUyxVQUFVLEVBQUUsRUFBRSxFQUFFO0VBQ3pCLEVBQUUsT0FBTyxDQUFDLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsSUFBSSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7RUFDNUU7O0VDL0ZBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0FBQ0E7RUFDQSxJQUFJLE1BQU0sR0FBRyxNQUFLO0FBQ2xCO0VBQ2UsU0FBUyxLQUFLLEVBQUUsT0FBTyxFQUFFO0VBQ3hDLEVBQUUsSUFBSSxRQUFRLEdBQUc7RUFDakIsSUFBSSxPQUFPLEVBQUUsSUFBSTtFQUNqQixJQUFJLE1BQU0sRUFBRSxJQUFJO0VBQ2hCLElBQUksVUFBVSxFQUFFLElBQUk7RUFDcEIsSUFBSSxXQUFXLEVBQUUsSUFBSTtFQUNyQixJQUFJLFlBQVksRUFBRSxLQUFLO0VBQ3ZCLElBQUksTUFBTSxFQUFFLEtBQUs7RUFDakIsSUFBSSxRQUFRLEVBQUUsRUFBRTtFQUNoQixJQUFJLFVBQVUsRUFBRSxPQUFPO0VBQ3ZCLElBQUksWUFBWSxFQUFFLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUM7RUFDakQsSUFBRztBQUNIO0VBQ0E7RUFDQSxFQUFFLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFDO0FBQzNDO0VBQ0E7RUFDQSxFQUFFLElBQUksQ0FBQyxJQUFJLEdBQUU7RUFDYixDQUFDO0FBQ0Q7RUFDQSxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxZQUFZO0VBQ25DLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO0VBQ2xCLElBQUksTUFBTTtFQUNWLEdBQUc7QUFDSDtFQUNBLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUM7RUFDbkIsRUFBRSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQztBQUN4QjtFQUNBO0VBQ0EsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFDO0FBQ2pFO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO0VBQ3hCLElBQUksSUFBSSxDQUFDLFNBQVMsR0FBRTtFQUNwQixHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sSUFBSTtFQUNiLEVBQUM7QUFDRDtFQUNBLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLFVBQVUsS0FBSyxFQUFFO0VBQ3pDLEVBQUUsTUFBTSxHQUFHLE1BQUs7RUFDaEIsRUFBQztBQUNEO0VBQ0EsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsWUFBWTtFQUN0QyxFQUFFLE9BQU8sTUFBTTtFQUNmLEVBQUM7QUFDRDtFQUNBLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLFlBQVk7RUFDdEMsRUFBRSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxFQUFFO0VBQzNCLElBQUksTUFBTTtFQUNWLEdBQUc7QUFDSDtFQUNBO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRTtFQUNyQixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDO0VBQ3BCLEdBQUc7QUFDSDtFQUNBO0VBQ0EsRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQztBQUMxQjtFQUNBO0VBQ0EsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBQztBQUMvQztFQUNBLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFJO0VBQ25CLEVBQUM7QUFDRDtFQUNBLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLFlBQVk7RUFDckMsRUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLENBQUM7RUFDakUsRUFBQztBQUNEO0VBQ0EsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUcsWUFBWTtFQUNuQyxFQUFFLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLE1BQU07RUFDNUIsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQztBQUNsQjtFQUNBLEVBQUUsSUFBSSxJQUFJLEdBQUcsS0FBSTtBQUNqQjtFQUNBO0VBQ0EsRUFBRSxJQUFJLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEtBQUssVUFBVSxFQUFFO0VBQ2xELElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUU7RUFDMUIsR0FBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRTtFQUN2QyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUM7RUFDOUMsR0FBRyxNQUFNO0VBQ1QsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFDO0VBQy9DLEdBQUc7QUFDSDtFQUNBO0VBQ0EsRUFBRSxJQUFJLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQyxZQUFXO0VBQzNDLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFDO0VBQy9DLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxLQUFJO0FBQ3hEO0VBQ0E7RUFDQSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUM7QUFDOUM7RUFDQTtFQUNBLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFDO0FBQ25EO0VBQ0E7RUFDQSxFQUFFLElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxVQUFVLEVBQUU7RUFDOUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDO0VBQy9CLEdBQUc7QUFDSDtFQUNBLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUM7QUFDbkI7RUFDQTtFQUNBLEVBQUUsSUFBSSxDQUFDLGFBQWEsR0FBRTtBQUN0QjtFQUNBLEVBQUUsT0FBTyxJQUFJO0VBQ2IsRUFBQztBQUNEO0VBQ0EsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsVUFBVSxLQUFLLEVBQUU7RUFDekMsRUFBRSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxNQUFNO0VBQzVCLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUM7QUFFbEI7RUFDQTtFQUNBLEVBQUUsSUFBSSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxLQUFLLFVBQVUsRUFBRTtFQUNuRCxJQUFJLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUM7RUFDaEQsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO0VBQ2hCLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUM7RUFDdkIsTUFBTSxNQUFNO0VBQ1osS0FBSztFQUNMLEdBQUc7QUFDSDtFQUNBLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFDO0VBQ2xELEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUk7RUFDaEMsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDO0VBQ2xCLElBQUksR0FBRyxFQUFFLElBQUksQ0FBQyxlQUFlO0VBQzdCLElBQUksUUFBUSxFQUFFLFNBQVM7RUFDdkIsR0FBRyxFQUFDO0FBQ0o7RUFDQSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsRUFBQztBQUN0RDtFQUNBO0VBQ0EsRUFBRSxJQUFJLElBQUksR0FBRyxLQUFJO0FBQ2pCO0VBQ0EsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsT0FBTTtBQUNuQztFQUNBO0VBQ0EsRUFBRSxJQUFJLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEtBQUssVUFBVSxFQUFFO0VBQy9DLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQztFQUNoQyxHQUFHO0FBQ0g7RUFDQTtFQUNBLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUM7RUFDbkIsRUFBQztBQUNEO0VBQ0EsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUcsVUFBVSxPQUFPLEVBQUU7RUFDaEQ7RUFDQSxFQUFFLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFO0VBQ25DLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLEdBQUcsUUFBTztFQUM1QyxHQUFHLE1BQU07RUFDVCxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxHQUFHLEdBQUU7RUFDdkMsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUM7RUFDN0MsR0FBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRTtFQUNyQjtFQUNBLElBQUksSUFBSSxDQUFDLGFBQWEsR0FBRTtFQUN4QixHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sSUFBSTtFQUNiLEVBQUM7QUFDRDtFQUNBLEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFHLFlBQVk7RUFDekMsRUFBRSxPQUFPLElBQUksQ0FBQyxlQUFlO0VBQzdCLEVBQUM7QUFDRDtFQUNBLEtBQUssQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFHLFlBQVk7RUFDeEM7RUFDQSxFQUFFLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDO0FBQ3pCO0VBQ0EsRUFBRSxPQUFPLElBQUk7RUFDYixFQUFDO0FBQ0Q7RUFDQSxLQUFLLENBQUMsU0FBUyxDQUFDLGdCQUFnQixHQUFHLFVBQVUsT0FBTyxFQUFFO0VBQ3REO0VBQ0EsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsR0FBRyxRQUFPO0FBQ3pDO0VBQ0EsRUFBRSxPQUFPLElBQUk7RUFDYixFQUFDO0FBQ0Q7RUFDQSxLQUFLLENBQUMsU0FBUyxDQUFDLGdCQUFnQixHQUFHLFlBQVk7RUFDL0MsRUFBRSxPQUFPLElBQUksQ0FBQyxjQUFjO0VBQzVCLEVBQUM7QUFDRDtFQUNBLEtBQUssQ0FBQyxTQUFTLENBQUMsZUFBZSxHQUFHLFVBQVUsUUFBUSxFQUFFO0VBQ3REO0VBQ0EsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFO0VBQzFCLElBQUksUUFBUSxHQUFHLE1BQUs7RUFDcEIsR0FBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLFFBQVEsRUFBRTtFQUNoQixJQUFJLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFO0VBQ3JELE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBQztFQUNwRCxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUM7RUFDakQsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsa0NBQWtDLEVBQUM7RUFDM0UsTUFBTSwwQkFBMEIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDO0VBQzNDLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksR0FBRyxFQUFFLEdBQUcsS0FBSTtFQUNqRyxLQUFLO0VBQ0wsR0FBRyxNQUFNLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtFQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUU7RUFDdEQsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFDO0VBQ2pELE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBQztFQUNwRCxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxPQUFNO0VBQzlDLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLEdBQUU7RUFDekMsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEdBQUU7RUFDdkQsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsa0NBQWtDLEVBQUM7RUFDOUUsS0FBSztFQUNMLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxJQUFJO0VBQ2IsRUFBQztBQUNEO0VBQ0EsS0FBSyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsVUFBVSxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRTtFQUNwRSxFQUFFLElBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFDO0FBQzVDO0VBQ0E7RUFDQSxFQUFFLEdBQUcsQ0FBQyxTQUFTLEdBQUcsTUFBSztBQUN2QjtFQUNBO0VBQ0EsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBQztBQUN6QztFQUNBLEVBQUUsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRTtFQUN2RDtFQUNBLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxJQUFJLEVBQUU7RUFDaEQsTUFBTSxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUM7RUFDN0IsS0FBSyxFQUFDO0VBQ04sR0FBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUM7QUFDdEM7RUFDQSxFQUFFLE9BQU8sR0FBRztFQUNaLEVBQUM7QUFDRDtFQUNBLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLFlBQVk7RUFDckM7RUFDQSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMseURBQXlELEVBQUM7RUFDekUsRUFBQztBQUNEO0VBQ0EsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUcsWUFBWTtFQUN6QyxFQUFFLElBQUksY0FBYyxHQUFHLE1BQU0sQ0FBQyxZQUFXO0VBQ3pDLEVBQUUsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFZO0FBQzlDO0VBQ0EsRUFBRSxPQUFPLFdBQVcsSUFBSSxjQUFjO0VBQ3RDLEVBQUM7QUFDRDtFQUNBLEtBQUssQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFHLFlBQVk7RUFDNUM7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLHVCQUF1QixDQUFDLEVBQUU7RUFDOUQsSUFBSSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRTtFQUMzQixNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBQztFQUN4RCxLQUFLLE1BQU07RUFDWCxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsRUFBQztFQUMzRCxLQUFLO0FBQ0w7RUFDQTtFQUNBO0VBQ0EsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFO0VBQ3RELE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUM7RUFDakMsS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFO0VBQzVELE1BQU0sMEJBQTBCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQztFQUMzQyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFDO0VBQ2hDLEtBQUs7RUFDTCxHQUFHO0VBQ0gsRUFBQztBQUNEO0VBQ0E7RUFDQTtFQUNBO0FBQ0E7RUFDQSxTQUFTLFNBQVMsSUFBSTtFQUN0QixFQUFFLE9BQU8sdVVBQXVVO0VBQ2hWLENBQUM7QUFDRDtFQUNBLFNBQVMsMEJBQTBCLElBQUk7RUFDdkMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRTtFQUM1QixJQUFJLE1BQU07RUFDVixHQUFHO0VBQ0gsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEdBQUcsS0FBSTtFQUNwRSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsR0FBRyxLQUFJO0VBQ2xFLENBQUM7QUFDRDtFQUNBLFNBQVMsTUFBTSxJQUFJO0VBQ25CO0VBQ0EsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFDO0VBQzVDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBQztBQUMxQztFQUNBO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO0VBQy9GLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDhCQUE4QixFQUFDO0VBQzVELEdBQUc7QUFDSDtFQUNBLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE9BQU07QUFDbkM7RUFDQTtFQUNBLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsSUFBSSxFQUFFO0VBQzdDLElBQUksSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7RUFDbEMsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFDO0VBQ3BDLEtBQUs7RUFDTCxHQUFHLEVBQUUsSUFBSSxFQUFDO0FBQ1Y7RUFDQTtFQUNBLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7RUFDdkQsSUFBSSxJQUFJLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFDO0VBQ3pELElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEdBQUcsU0FBUTtFQUN0QyxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBQztBQUMzRDtFQUNBLElBQUksSUFBSSxDQUFDLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFDO0VBQzNELElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUM7RUFDbkUsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxHQUFHLFNBQVMsR0FBRTtBQUNsRDtFQUNBLElBQUksSUFBSSxDQUFDLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFDO0VBQzVELElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUM7RUFDckUsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVTtBQUM1RDtFQUNBLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFDO0VBQzFELElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFDO0VBQzNELEdBQUc7QUFDSDtFQUNBO0VBQ0EsRUFBRSxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFDO0VBQy9DLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFDO0FBQ2pEO0VBQ0E7RUFDQSxFQUFFLElBQUksQ0FBQyxlQUFlLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUM7RUFDdEQsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLEVBQUM7QUFDakU7RUFDQSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUM7QUFDakQ7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO0VBQ3ZELElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBQztFQUM5QyxHQUFHO0FBQ0g7RUFDQSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUM7RUFDdkMsQ0FBQztBQUNEO0VBQ0EsU0FBUyxZQUFZLElBQUk7RUFDekIsRUFBRSxJQUFJLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFDO0VBQ3JELEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFDO0VBQy9ELEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBQztFQUNoRCxDQUFDO0FBQ0Q7RUFDQSxTQUFTLFdBQVcsSUFBSTtFQUN4QixFQUFFLElBQUksQ0FBQyxPQUFPLEdBQUc7RUFDakIsSUFBSSxhQUFhLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0VBQ3hDLElBQUksWUFBWSxFQUFFLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7RUFDaEQsSUFBSSxNQUFNLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0VBQ3pDLElBQUksV0FBVyxFQUFFLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7RUFDOUMsSUFBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTtFQUN2RCxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFDO0VBQzVFLEdBQUc7QUFDSDtFQUNBLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUM7RUFDckUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFDO0VBQ3hELEVBQUUsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBQztFQUNoRSxDQUFDO0FBQ0Q7RUFDQSxTQUFTLGtCQUFrQixFQUFFLEtBQUssRUFBRTtFQUNwQztFQUNBLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssS0FBSyxFQUFFLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFO0VBQzlGLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRTtFQUNoQixHQUFHO0VBQ0gsQ0FBQztBQUNEO0VBQ0EsU0FBUyxtQkFBbUIsRUFBRSxLQUFLLEVBQUU7RUFDckM7RUFDQSxFQUFFLElBQUksY0FBYyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBVztFQUN0RSxFQUFFLElBQUksa0JBQWtCLEdBQUcsS0FBSyxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxHQUFFO0VBQ3ZFLEVBQUUsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFZO0VBQ3hFLEVBQUUsSUFBSSxTQUFTLENBQUMsUUFBUSxLQUFLLFVBQVUsSUFBSSxjQUFjLEtBQUssQ0FBQyxJQUFJLGtCQUFrQixJQUFJLFlBQVksRUFBRTtFQUN2RyxJQUFJLE1BQU07RUFDVixHQUFHO0FBQ0g7RUFDQTtFQUNBLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUM7RUFDdEcsSUFBSSxLQUFLLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFO0VBQzVDLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRTtFQUNoQixHQUFHO0VBQ0gsQ0FBQztBQUNEO0VBQ0EsU0FBUyxhQUFhLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRTtFQUNqQyxFQUFFLE9BQU8sQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLGFBQWEsS0FBSyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDakUsRUFBRSxPQUFPLEVBQUU7RUFDWCxDQUFDO0FBQ0Q7RUFDQSxTQUFTLGFBQWEsSUFBSTtFQUMxQixFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO0VBQ3ZELElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUM7RUFDL0UsR0FBRztFQUNILEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUM7RUFDeEUsRUFBRSxNQUFNLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFDO0VBQzNELEVBQUUsUUFBUSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBQztFQUNuRSxDQUFDO0FBQ0Q7RUFDQTtFQUNBO0VBQ0E7QUFDQTtFQUNBLFNBQVMsTUFBTSxJQUFJO0VBQ25CLEVBQUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDN0MsSUFBSSxLQUFLLElBQUksR0FBRyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUNsQyxNQUFNLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRTtFQUNuRSxRQUFRLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFDO0VBQzdDLE9BQU87RUFDUCxLQUFLO0VBQ0wsR0FBRztFQUNILEVBQUUsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDO0VBQ3JCOztFQzlaQSxNQUFNLENBQUMsZUFBZSxHQUFHLE1BQUs7QUFDOUI7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7QUFDQTtFQUNBO0VBQ0EsVUFBVSxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLGNBQWMsRUFBQztBQUM1RjtFQUNlLE1BQU0sV0FBVyxDQUFDO0VBQ2pDLEVBQUUsV0FBVyxDQUFDLENBQUMsT0FBTyxFQUFFO0VBQ3hCLElBQUksSUFBSSxDQUFDLFNBQVMsR0FBRyxHQUFFO0VBQ3ZCLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFFO0VBQ3BCLElBQUksSUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFFO0VBQ3pCLElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLElBQUksRUFBQztFQUMvQixJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBSztFQUN6QixJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsR0FBRTtFQUN6QixJQUFJLElBQUksQ0FBQyxjQUFjLEdBQUcsS0FBSTtFQUM5QixJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBQztBQUNkO0VBQ0EsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFFO0VBQ2pCLEdBQUc7QUFDSDtFQUNBLEVBQUUsTUFBTSxDQUFDLEdBQUc7RUFDWixJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxtQkFBbUIsRUFBQztFQUMxRCxJQUFJLElBQUksQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxvQkFBb0IsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFDO0VBQzNFLElBQUksSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLHFCQUFxQixFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUM7QUFDN0U7RUFDQSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsR0FBRTtBQUMzQjtFQUNBLElBQUksSUFBSSxDQUFDLGtCQUFrQixHQUFFO0VBQzdCLEdBQUc7QUFDSDtFQUNBLEVBQUUsZ0JBQWdCLENBQUMsR0FBRztFQUN0QixJQUFJLE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUM7RUFDOUQsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxzQkFBc0IsRUFBRSxTQUFTLEVBQUM7RUFDbkYsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxHQUFHLGVBQWM7RUFDdEQsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE1BQU0sSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFDO0FBQ2hGO0VBQ0EsSUFBSSxNQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFDO0VBQ25FLElBQUksY0FBYyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUM7RUFDekMsSUFBSSxNQUFNLHFCQUFxQixHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBQztFQUNwRixJQUFJLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxxQkFBcUIsRUFBQztBQUNuRjtFQUNBLElBQUksTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBQztFQUMxRCxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsdUJBQXVCLEVBQUM7RUFDekMsSUFBSSxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUM7RUFDckUsSUFBSSxlQUFlLENBQUMsSUFBSSxHQUFHLFNBQVE7RUFDbkMsSUFBSSxlQUFlLENBQUMsR0FBRyxHQUFHLElBQUc7RUFDN0IsSUFBSSxlQUFlLENBQUMsS0FBSyxHQUFHLElBQUc7RUFDL0IsSUFBSSxlQUFlLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLE1BQU07RUFDckQsTUFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFDO0VBQzlDLEtBQUssRUFBQztBQUNOO0VBQ0EsSUFBSSxJQUFJLENBQUMsY0FBYyxHQUFHLFVBQVUsQ0FBQyxRQUFRLEVBQUUsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBQztFQUN4RixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxHQUFHLEtBQUk7RUFDdkMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsR0FBRyxZQUFXO0VBQy9DLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsTUFBTSxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUM7RUFDM0UsR0FBRztBQUNIO0VBQ0EsRUFBRSxXQUFXLENBQUMsR0FBRztFQUNqQixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJQyxFQUFPLENBQUM7RUFDeEMsTUFBTSxNQUFNLEVBQUUsSUFBSSxDQUFDLHVCQUF1QjtFQUMxQyxNQUFNLE1BQU0sRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtFQUNqQyxNQUFNLEtBQUssRUFBRSxJQUFJO0VBQ2pCLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUNqQixNQUFNLElBQUksRUFBRSxDQUFDO0VBQ2IsTUFBTSxPQUFPLEVBQUUsS0FBSztFQUNwQixNQUFNLEtBQUssRUFBRSxJQUFJO0VBQ2pCLE1BQU0sTUFBTSxFQUFFLElBQUk7RUFDbEIsS0FBSyxFQUFDO0VBQ04sR0FBRztBQUNIO0VBQ0EsRUFBRSxrQkFBa0IsQ0FBQyxHQUFHO0VBQ3hCO0VBQ0EsSUFBSSxNQUFNLE1BQU0sR0FBR0MsU0FBc0IsR0FBRTtFQUMzQyxJQUFJLE1BQU0sV0FBVyxHQUFHLEdBQUU7RUFDMUIsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSTtFQUM1QixNQUFNLFdBQVcsQ0FBQyxJQUFJLENBQUM7RUFDdkIsUUFBUSxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7RUFDMUIsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLEVBQUU7RUFDcEIsUUFBUSxJQUFJLEVBQUUsTUFBTTtFQUNwQixRQUFRLE9BQU8sRUFBRSxLQUFLO0VBQ3RCLFFBQVEsU0FBUyxFQUFFLElBQUk7RUFDdkIsT0FBTyxFQUFDO0VBQ1IsS0FBSyxFQUFDO0VBQ04sSUFBSSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksVUFBVSxDQUFDLFdBQVcsRUFBQztBQUNwRDtFQUNBO0VBQ0EsSUFBSSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksS0FBSyxDQUFDO0VBQ2pDLE1BQU0sTUFBTSxFQUFFLElBQUk7RUFDbEIsTUFBTSxZQUFZLEVBQUUsS0FBSztFQUN6QixNQUFNLFlBQVksRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUM7RUFDekMsTUFBTSxVQUFVLEVBQUUsT0FBTztFQUN6QixNQUFNLE9BQU8sRUFBRSxNQUFNO0VBQ3JCLFFBQVEsSUFBSSxDQUFDLFlBQVksR0FBRTtFQUMzQixPQUFPO0VBQ1AsS0FBSyxFQUFDO0FBQ047RUFDQSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWTtFQUNqQyxNQUFNLElBQUk7RUFDVixNQUFNLHFCQUFxQjtFQUMzQixNQUFNLE1BQU07RUFDWixRQUFRLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFFO0VBQ2hDLE9BQU8sRUFBQztBQUNSO0VBQ0E7RUFDQSxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxFQUFDO0FBQ2pFO0VBQ0E7RUFDQTtFQUNBLElBQUksTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBQztFQUN2RixJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJO0VBQ3RCLE1BQU0sTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFRO0VBQ3pDLE1BQU0sSUFBSUMsVUFBdUIsQ0FBQyxPQUFPLENBQUMsRUFBRTtFQUM1QyxRQUFRLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxLQUFLLEVBQUUsa0NBQWtDLEVBQUUsRUFBRSxFQUFDO0VBQ3ZGLFFBQVEsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLGFBQWEsRUFBQztFQUNuRSxPQUFPO0VBQ1AsS0FBSyxFQUFDO0VBQ04sR0FBRztBQUNIO0VBQ0EsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUU7RUFDOUM7QUFDQTtFQUNBO0VBQ0E7RUFDQSxJQUFJLE1BQU0sVUFBVSxHQUFHQyxhQUEwQixDQUFDLE9BQU8sRUFBQztFQUMxRCxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsV0FBVTtBQUMxQztFQUNBO0VBQ0EsSUFBSSxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQztFQUM1QixNQUFNLE1BQU0sRUFBRSxJQUFJO0VBQ2xCLE1BQU0sWUFBWSxFQUFFLEtBQUs7RUFDekIsTUFBTSxZQUFZLEVBQUUsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDO0VBQ3pDLE1BQU0sVUFBVSxFQUFFLE9BQU87RUFDekIsS0FBSyxFQUFDO0FBQ047RUFDQSxJQUFJLEtBQUssQ0FBQyxZQUFZO0VBQ3RCLE1BQU0sSUFBSTtFQUNWLE1BQU0scUJBQXFCO0VBQzNCLE1BQU0sTUFBTTtFQUNaLFFBQVEsS0FBSyxDQUFDLEtBQUssR0FBRTtFQUNyQixPQUFPLEVBQUM7QUFDUjtFQUNBLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFDO0FBQzlDO0VBQ0E7RUFDQSxJQUFJLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsTUFBTTtFQUNsRCxNQUFNLEtBQUssQ0FBQyxJQUFJLEdBQUU7RUFDbEIsS0FBSyxFQUFDO0VBQ04sR0FBRztBQUNIO0VBQ0EsRUFBRSxZQUFZLENBQUMsR0FBRztFQUNsQixJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxHQUFFO0VBQzNCLEdBQUc7QUFDSDtFQUNBLEVBQUUsWUFBWSxDQUFDLEdBQUc7RUFDbEI7RUFDQTtBQUNBO0VBQ0E7RUFDQSxJQUFJLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFDO0VBQ2hFLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFNO0FBQ3hCO0VBQ0EsSUFBSSxJQUFJLEtBQUk7QUFDWjtFQUNBLElBQUksSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtFQUM3QixNQUFNLElBQUksR0FBRyxlQUFjO0VBQzNCLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEdBQUcsS0FBSTtFQUN6QyxLQUFLLE1BQU07RUFDWCxNQUFNLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUM7RUFDMUIsTUFBTSxJQUFJLEdBQUdDLFFBQXFCLENBQUMsRUFBRSxFQUFDO0VBQ3RDLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEdBQUcsTUFBSztFQUMxQyxLQUFLO0FBQ0w7RUFDQSxJQUFJLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7RUFDM0IsTUFBTSxJQUFJLElBQUksSUFBSSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFDO0VBQ3hDLEtBQUs7QUFDTDtFQUNBLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsR0FBRyxLQUFJO0VBQzVDLEdBQUc7QUFDSDtFQUNBLEVBQUUsY0FBYyxDQUFDLEdBQUc7RUFDcEI7RUFDQSxJQUFJLElBQUksV0FBVyxHQUFHQyxRQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFXO0VBQ3ZFLElBQUksSUFBSSxjQUFjLEdBQUcsS0FBSTtBQUM3QjtFQUNBO0VBQ0EsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDakQsTUFBTSxJQUFJQSxRQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEtBQUssV0FBVyxFQUFFO0VBQzdFLFFBQVEsV0FBVyxHQUFHLEdBQUU7RUFDeEIsUUFBUSxjQUFjLEdBQUcsTUFBSztFQUM5QixRQUFRLEtBQUs7RUFDYixPQUFPO0VBQ1AsS0FBSztBQUNMO0VBQ0EsSUFBSSxJQUFJLENBQUMsV0FBVyxHQUFHLFlBQVc7RUFDbEMsSUFBSSxJQUFJLENBQUMsY0FBYyxHQUFHLGVBQWM7RUFDeEMsR0FBRztBQUNIO0VBQ0EsRUFBRSxXQUFXLENBQUMsR0FBRztFQUNqQjtFQUNBLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEdBQUcsR0FBRTtFQUNsQyxJQUFJLElBQUksQ0FBQyxTQUFTLEdBQUcsR0FBRTtFQUN2QixJQUFJLElBQUksQ0FBQyxjQUFjLEdBQUU7QUFDekI7RUFDQTtFQUNBLElBQUksTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBQztFQUNqRSxJQUFJLEtBQUssQ0FBQyxTQUFTLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBQztBQUM1RDtFQUNBO0VBQ0EsSUFBSSxJQUFJLENBQUMsWUFBWSxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUUscUJBQXFCLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBQztFQUMvRSxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE1BQU07RUFDdEQsTUFBTSxJQUFJLENBQUMsYUFBYSxHQUFFO0VBQzFCLEtBQUssRUFBQztFQUNOLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEdBQUcsZUFBYztBQUNoRDtFQUNBO0VBQ0EsSUFBSSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxHQUFFO0VBQ3JELElBQUksTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsR0FBRTtBQUNyRDtFQUNBLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDckM7RUFDQSxNQUFNLE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxLQUFLLEVBQUUsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBQztFQUNoRixNQUFNLFNBQVMsQ0FBQyxPQUFPLENBQUMsY0FBYyxHQUFHLEVBQUM7QUFDMUM7RUFDQTtFQUNBLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFFO0VBQ3BELE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsVUFBUztBQUM3QztFQUNBO0VBQ0EsTUFBTSxNQUFNLFVBQVUsR0FBRyxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksT0FBTyxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFDO0FBQ25GO0VBQ0E7RUFDQSxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBQztFQUNsQyxLQUFLO0VBQ0wsR0FBRztBQUNIO0VBQ0EsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRTtFQUNwQztFQUNBLElBQUksT0FBTyxHQUFHLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQztBQUM5QztFQUNBLElBQUksTUFBTSxPQUFPLEdBQUc7RUFDcEIsTUFBTSxLQUFLLEVBQUUsRUFBRTtFQUNmLE1BQU0sVUFBVSxFQUFFLFVBQVU7RUFDNUIsTUFBTSxjQUFjLEVBQUUsS0FBSztFQUMzQixNQUFLO0FBQ0w7RUFDQSxJQUFJLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRTtFQUNuQyxNQUFNLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFDO0VBQy9ELEtBQUs7QUFDTDtFQUNBO0VBQ0EsSUFBSSxNQUFNLFFBQVEsR0FBR0MsV0FBd0IsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFDO0FBQy9EO0VBQ0E7RUFDQSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLENBQUM7RUFDaEUsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxTQUFRO0VBQ3pDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsUUFBTztBQUN2QztFQUNBO0VBQ0EsSUFBSSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVM7RUFDakQsSUFBSSxTQUFTLENBQUMsU0FBUyxHQUFHLEdBQUU7QUFDNUI7RUFDQTtFQUNBLElBQUksSUFBSSxXQUFXLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUc7RUFDN0MsSUFBSSxJQUFJLE1BQU0sQ0FBQyxlQUFlLEVBQUUsRUFBRSxXQUFXLElBQUksT0FBTyxDQUFDLFdBQVUsRUFBRTtFQUNyRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFO0VBQzlCLE1BQU0sV0FBVyxJQUFJLEdBQUcsR0FBR0MsY0FBMkIsQ0FBQyxPQUFPLEVBQUM7RUFDL0QsTUFBTSxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBQztFQUN4RCxLQUFLLE1BQU07RUFDWCxNQUFNLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLHlCQUF5QixFQUFDO0VBQzNELEtBQUs7QUFDTDtFQUNBLElBQUksTUFBTSxpQkFBaUIsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLHVCQUF1QixFQUFFLFNBQVMsRUFBQztFQUNuRixJQUFJLGlCQUFpQixDQUFDLFNBQVMsR0FBRyxZQUFXO0FBQzdDO0VBQ0E7RUFDQSxJQUFJLFNBQVMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFDO0VBQzVDLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRTtBQUNyQjtFQUNBO0VBQ0EsSUFBSSxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLHlCQUF5QixFQUFFLFNBQVMsRUFBQztFQUMzRSxJQUFJLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxLQUFLLEVBQUUsOEJBQThCLEVBQUUsT0FBTyxFQUFDO0VBQ2xGLElBQUksTUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSw2QkFBNkIsRUFBRSxPQUFPLEVBQUM7QUFDaEY7RUFDQSxJQUFJLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsTUFBTTtFQUMvQyxNQUFNLFFBQVEsQ0FBQyxZQUFZLEdBQUU7RUFDN0IsTUFBTSxjQUFjLEdBQUU7RUFDdEIsS0FBSyxFQUFDO0FBQ047RUFDQSxJQUFJLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsTUFBTTtFQUNoRCxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBQztFQUNsQyxNQUFNLGNBQWMsR0FBRTtFQUN0QixLQUFLLEVBQUM7QUFDTjtFQUNBO0VBQ0EsSUFBSSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSTtFQUM3QyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLGtCQUFrQixDQUFDLEVBQUU7RUFDM0Q7RUFDQSxRQUFRLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3RDLE9BQU87RUFDUCxLQUFLLEVBQUM7RUFDTixHQUFHO0FBQ0g7RUFDQSxFQUFFLGFBQWEsQ0FBQyxHQUFHO0VBQ25CLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO0VBQ3ZCLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJO0VBQ2xDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEdBQUU7RUFDL0IsUUFBUSxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQUs7RUFDN0IsUUFBUSxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsR0FBRyxlQUFjO0VBQ3BELE9BQU8sRUFBQztFQUNSLEtBQUssTUFBTTtFQUNYLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJO0VBQ2xDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEdBQUU7RUFDL0IsUUFBUSxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUk7RUFDNUIsUUFBUSxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsR0FBRyxlQUFjO0VBQ3BELE9BQU8sRUFBQztFQUNSLEtBQUs7RUFDTCxHQUFHO0FBQ0g7RUFDQSxFQUFFLG1CQUFtQixDQUFDLENBQUMsS0FBSyxFQUFFLGFBQWEsRUFBRTtFQUM3QztFQUNBLElBQUksY0FBYyxHQUFFO0FBQ3BCO0VBQ0EsSUFBSSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFVBQVM7RUFDN0QsSUFBSSxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLG1CQUFtQixFQUFDO0FBQ2hFO0VBQ0E7RUFDQSxJQUFJLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUM7RUFDakUsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUM7RUFDdEMsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxXQUFXLEdBQUcsQ0FBQyxJQUFJLEtBQUk7RUFDckYsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxZQUFZLEdBQUcsQ0FBQyxJQUFJLEtBQUk7RUFDdEYsR0FBRztBQUNIO0VBQ0EsRUFBRSxRQUFRLENBQUMsQ0FBQyxJQUFJLEVBQUU7RUFDbEIsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUM7RUFDbkMsSUFBSSxJQUFJLENBQUMsV0FBVyxHQUFFO0VBQ3RCLEdBQUc7QUFDSDtFQUNBLEVBQUUsWUFBWSxDQUFDLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRTtFQUM5QixJQUFJLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUM7RUFDNUMsSUFBSSxJQUFJLENBQUMsV0FBVyxHQUFFO0VBQ3RCLEdBQUc7RUFDSCxDQUFDO0FBQ0Q7RUFDQSxTQUFTLGNBQWMsRUFBRSxDQUFDLEVBQUU7RUFDNUI7RUFDQTtFQUNBLEVBQUUsSUFBSSxNQUFNO0VBQ1osUUFBUSxDQUFDLEdBQUcsRUFBRSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztFQUM5QyxZQUFZLENBQUMsR0FBRyxFQUFFLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztFQUN2RCxjQUFjLE1BQU0sQ0FBQyxZQUFZLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUM7RUFDakQsRUFBRSxPQUFPLE1BQU07RUFDZixDQUFDO0FBQ0Q7RUFDQSxTQUFTLGNBQWMsRUFBRSxDQUFDLEVBQUU7RUFDNUI7RUFDQSxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUk7RUFDL0QsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUM7RUFDOUIsR0FBRyxFQUFDO0VBQ0osRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFDO0VBQzVEOztFQ2pYQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7QUFDQTtFQUNBLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsRUFBRSxNQUFNO0VBQ3BELEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxXQUFXLEdBQUU7RUFDOUIsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUM7RUFDNUIsRUFBRSxFQUFFLENBQUMsWUFBWSxHQUFFO0VBQ25CLENBQUM7Ozs7OzsifQ==
