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

    renderIn (element) {
      const list = document.createElement('ul');
      list.classList.add('options-list');

      this.optionSpec.forEach(option => {
        // Make list item - common to all types
        const li = document.createElement('li');
        li.dataset.optionId = option.id;
        list.append(li);

        // make input elements - depends on option type
        if (option.type === 'column-break') {
          li.classList.add('column-break');
        } else if (option.type === 'heading') {
          li.append(option.title);
          li.classList.add('options-heading');
        } else if (option.type === 'int' || option.type === 'bool') {
          // single input options
          const label = document.createElement('label');
          li.append(label);

          if (!option.swapLabel) label.append(option.title + ': ');

          const input = document.createElement('input');
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
          input.classList.add('option');
          label.append(input);

          if (option.swapLabel) label.append(' ' + option.title);
        } else if (option.type === 'select-inclusive' || option.type === 'select-exclusive') {
          // multiple input options
          // TODO: swap label (a bit odd here though)
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
        } else {
          throw new Error(`unknown option type '${option.type}'`)
        }

        li.addEventListener('change', e => this.updateStateFromUI(option));
        option.element = li;
      });

      element.append(list);
    }

    // TODO: updateUIFromState(option) {}
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
    static angleFrom(p1,p2) {
      const angle =  Math.atan2(p2.y-p1.y,p2.x-p1.x);
      return angle >= 0 ? angle : 2*Math.PI + angle
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
                  const lheight = label.offsetHeight;
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
              const labelLength = Math.max(textq.length, texta.length) - '^\\circ'.length; // ° takes up very little space
              /* Explanation: Further out if:
              *   More vertical (sin(midAngle))
              *   Longer label
              *   smaller angle
              *   E.g. totally vertical, 45°, length = 3
              *   d = 0.3 + 1*3/45 = 0.3 + 0.7 = 0.37
              */
              //const factor = 1        // constant of proportionality. Set by trial and error
              //let distance = minDistance + factor * Math.abs(sinDeg(midAngle)) * labelLength / theta
              // Just revert to old method
              const distance = 0.4 + 6 / theta;
              label.pos = Point.fromPolarDeg(radius * distance, totalangle + theta / 2).translate(this.O.x, this.O.y),
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
      let largeAngleSum = largeAngles.reduce((accumulator, currentValue) => accumulator + currentValue[0], 0);
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
          let question = super.randomRepeated(options); // allowed since undefined \in apex
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
        maxN: 3,
      };
      options = Object.assign(options,optionsOverride);
      options.repeated  = options.repeated || false;

      const data = MissingAnglesTriangleData.random(options);
      const view = new MissingAnglesTriangleView(data, viewOptions);

      return new MissingAnglesTriangleQ(data, view, options)
    }

    static get commandWord () { return 'Find the missing value' }
  }

  class LinExpr {
  //class LinExpr {
      constructor(a,b) {
          this.a = a;
          this.b = b;
      }

      isConstant() {
          return this.a === 0
      }

      toString() {
          let string = "";

          // x term
          if (this.a===1) { string += "x";}
          else if (this.a===-1) { string += "-x";}
          else if (this.a!==0) { string += this.a + "x";}
          
          // sign
          if (this.a!==0 && this.b>0) {string += " + ";}
          else if (this.a!==0 && this.b<0) {string += " - ";}

          // constant
          if (this.b>0) {string += this.b;}
          else if (this.b<0 && this.a===0) {string += this.b;}
          else if (this.b<0) {string += Math.abs(this.b);}

          return string;
      }

      toStringP() {
          // return expression as a string, surrounded in parentheses if a binomial
          if (this.a === 0 || this.b === 0) return this.toString();
          else return "(" + this.toString() + ")";
      }

      eval(x) {
          return this.a*x + this.b
      }

      add(that) {
          // add either an expression or a constant
          if (that.a !== undefined) return new LinExpr(this.a+that.a,this.b+that.b);
          else return new LinExpr(this.a,this.b + that);
      }

      times(that) {
          return new LinExpr(this.a * that, this.b * that)
      }

      static solve(expr1,expr2) {
          // solves the two expressions set equal to each other
          return (expr2.b-expr1.b)/(expr1.a-expr2.a)
      }
  }

  /** Given a set of expressions, set their sum  */
  function solveAngles(expressions, angleSum) {
      const expressionSum = expressions.reduce((exp1, exp2) => exp1.add(exp2));
      const x = LinExpr.solve(expressionSum, new LinExpr(0, angleSum));
      const angles = [];
      expressions.forEach(function (expr) {
          let angle = expr.eval(x);
          if (angle <= 0) {
              throw "negative angle";
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
              minXValue: 15,
          };
          options = Object.assign({}, defaults, options);
          //assign calculated defaults:
          options.maxConstant = options.maxConstant || options.angleSum / 2;
          options.maxXValue = options.maxXValue || options.angleSum / 4;
          // Randomise/set up main features
          let n = randBetween(options.minN, options.maxN);
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
      initLabels() { } // makes typescript shut up
  }
  function makeMixedExpressions(n, options) {
      let expressions = [];
      const x = randBetween(options.minXValue, options.maxXValue);
      let left = options.angleSum;
      let allconstant = true;
      for (let i = 0; i < n - 1; i++) {
          let a = randBetween(1, options.maxCoefficient);
          left -= a * x;
          let maxb = Math.min(left - options.minAngle * (n - i - 1), options.maxConstant);
          let minb = options.minAngle - a * x;
          let b = randBetween(minb, maxb);
          if (a !== 0) {
              allconstant = false;
          }
          left -= b;
          expressions.push(new LinExpr(a, b));
      }
      let last_minX_coeff = allconstant ? 1 : options.minCoefficient;
      let a = randBetween(last_minX_coeff, options.maxCoefficient);
      let b = left - a * x;
      expressions.push(new LinExpr(a, b));
      return expressions;
  }
  function makeAddExpressions(n, options) {
      let expressions = [];
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
          let c = randBetween(options.minAngle, left - options.minAngle * anglesLeft);
          expressions.push(new LinExpr(0, c));
          left -= c;
      }
      // middle angles
      while (anglesLeft > 1) {
          // add 'x+b' as an expression. Make sure b gives space
          anglesLeft--;
          left -= x;
          let maxb = Math.min(left - options.minAngle * anglesLeft, options.maxConstant);
          let minb = Math.max(options.minAngle - x, -options.maxConstant);
          let b = randBetween(minb, maxb);
          expressions.push(new LinExpr(1, b));
          left -= b;
      }
      // last angle
      expressions.push(new LinExpr(1, left - x));
      return expressions;
  }
  function makeMultiplicationExpressions(n, options) {
      let expressions = [];
      // choose a total of coefficients
      // pick x based on that
      const constants = (options.includeConstants === true || weakIncludes(options.includeConstants, 'mult'));
      if (n === 2 && options.ensureX && constants)
          n = 3;
      let anglesleft = n;
      const totalCoeff = constants ?
          randBetween(n, (options.angleSum - options.minAngle) / options.minAngle, Math.random) : // if it's too big, angles get too small
          randElem([3, 4, 5, 6, 8, 9, 10].filter(x => x >= n), Math.random);
      let coeffleft = totalCoeff;
      let left = options.angleSum;
      // first 0/1/2
      if (constants) {
          // reduce to make what's left a multiple of total_coeff
          anglesleft--;
          let newleft = randMultBetween(totalCoeff * options.minAngle, options.angleSum - options.minAngle, totalCoeff);
          let c = options.angleSum - newleft;
          expressions.push(new LinExpr(0, c));
          left -= newleft;
      }
      if (options.ensureX) {
          anglesleft--;
          expressions.push(new LinExpr(1, 0));
          coeffleft -= 1;
      }
      //middle
      while (anglesleft > 1) {
          anglesleft--;
          let mina = 1;
          let maxa = coeffleft - anglesleft; // leave enough for others TODO: add max_coeff
          let a = randBetween(mina, maxa);
          expressions.push(new LinExpr(a, 0));
          coeffleft -= a;
      }
      //last
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
              stylea: 'extra-answer',
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
              repeated: false,
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
              stylea: 'extra-answer',
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
              repeated: false,
          };
          Object.assign(options, optionsOverride);
          const data = MissingAnglesAlgebraData.random(options);
          const view = new MissingAnglesTriangleAlgebraView(data, viewOptions);
          return new this(data, view);
      }
      static get commandWord() { return 'Find the missing value'; }
  }

  class MissingAnglesAroundWordedView extends MissingAnglesAroundView {
      constructor(data, options) {
          super(data, options); // does most of the set up
          super.translate(0, -15);
          let instructionLabel = {
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
              types: ["add", "multiply", "percent", "ratio"]
          };
          options = Object.assign({}, defaults, options);
          const n = randBetween(options.minN, options.maxN);
          const angleLabels = [];
          for (let i = 0; i < n; i++) {
              angleLabels[i] = String.fromCharCode(65 + i); // 65 = 'A'
          }
          let expressions = [];
          let instructions = [];
          let angles;
          let x;
          expressions.push(new LinExpr(1, 0));
          // Loop til we get one that works
          // Probably really inefficient!!
          let success = false;
          let attemptcount = 0;
          while (!success) {
              if (attemptcount > 20) {
                  expressions.push(new LinExpr(1, 0));
                  console.log("Gave up after " + attemptcount + " attempts");
                  success = true;
              }
              for (let i = 1; i < n; i++) {
                  const type = randElem(options.types);
                  switch (type) {
                      case "add": {
                          const addend = randBetween(options.minAddend, options.maxAddend);
                          expressions.push(expressions[i - 1].add(addend));
                          instructions.push(`\\text{Angle $${String.fromCharCode(65 + i)}$ is ${comparator(addend, "+")} angle $${String.fromCharCode(64 + i)}$}`);
                          break;
                      }
                      case "multiply": {
                          const multiplier = randBetween(options.minMultiplier, options.maxMultiplier);
                          expressions.push(expressions[i - 1].times(multiplier));
                          instructions.push(`\\text{Angle $${String.fromCharCode(65 + i)}$ is ${comparator(multiplier, "*")} angle $${String.fromCharCode(64 + i)}$}`);
                          break;
                      }
                      case "percent": {
                          const percentage = randMultBetween(5, 100, 5);
                          const increase = Math.random() < 0.5 ? true : false;
                          const multiplier = increase ? 1 + percentage / 100 : 1 - percentage / 100;
                          expressions.push(expressions[i - 1].times(multiplier));
                          instructions.push(`\\text{Angle $${String.fromCharCode(65 + i)}$ is $${percentage}\\%$ ${increase ? "bigger" : "smaller"} than angle $${String.fromCharCode(64 + i)}$}`);
                          break;
                      }
                      case "ratio": {
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
              let expressionsum = expressions.reduce((exp1, exp2) => exp1.add(exp2));
              let x = LinExpr.solve(expressionsum, new LinExpr(0, options.angleSum));
              expressions.forEach(function (expr) {
                  if (!success || expr.eval(x) < options.minAngle) {
                      success = false;
                      instructions = [];
                      expressions = [expressions[0]];
                  }
              });
              attemptcount++;
          }
          console.log("Attempts: " + attemptcount);
          ({ x, angles } = solveAngles(expressions, options.angleSum));
          const missing = angles.map(x => true);
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
          case "*":
              switch (number) {
                  case 1: return "the same as";
                  case 2: return "double";
                  default: return `$${number}$ times larger than`;
              }
          case "+":
              switch (number) {
                  case 0: return "the same as";
                  default: return `$${Math.abs(number).toString()}^\\circ$ ${(number < 0) ? "less than" : "more than"}`;
              }
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
              repeated: false,
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
          let questionOptions = {};
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
                  questionOptions.repeated = (subtype === "repeated");
                  switch (subtype) {
                      case 'simple':
                      case 'repeated':
                          question = MissingAnglesTriangleQ.random(questionOptions, viewOptions);
                          break;
                      case 'algebra':
                      default:
                          question = MissingAnglesTriangleAlgebraQ.random(questionOptions, viewOptions);
                          break;
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
                  title: '',
                  id: 'types',
                  type: 'select-inclusive',
                  selectOptions: [
                      { title: 'On a straight line', id: 'aosl' },
                      { title: 'Around a point', id: 'aaap' },
                      { title: 'Triangle', id: 'triangle' }
                  ],
                  default: ['aosl', 'aaap', 'triangle'],
                  vertical: true
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
      if (window.SHOW_DIFFICULTY) {qNumberText += options.difficulty;}
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vbW9kdWxlcy92ZW5kb3IvcnNsaWRlci5qcyIsIi4uL21vZHVsZXMvVXRpbGl0aWVzLmpzIiwiLi4vbW9kdWxlcy9PcHRpb25zU2V0LmpzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9RdWVzdGlvbi50cyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGV4dFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FsZ2VicmFpY0ZyYWN0aW9uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvSW50ZWdlckFkZC5qcyIsIi4uL21vZHVsZXMvUG9pbnQuanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRLnRzIiwiLi4vbW9kdWxlcy92ZW5kb3IvZnJhY3Rpb24uanMiLCIuLi9tb2R1bGVzL01vbm9taWFsLmpzIiwiLi4vbW9kdWxlcy9Qb2x5bm9taWFsLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9Bcml0aG1hZ29uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGVzdFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FkZEFaZXJvLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9UZXh0US9FcXVhdGlvbk9mTGluZS5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEudHMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUS5qcyIsIi4uL21vZHVsZXMvTGluRXhwci5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9zb2x2ZUFuZ2xlcy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzV29yZGVkRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzV29yZGVkUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzV3JhcHBlci50cyIsIi4uL21vZHVsZXMvVG9waWNDaG9vc2VyLmpzIiwiLi4vbW9kdWxlcy92ZW5kb3IvVGluZ2xlLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvblNldC5qcyIsIi4uL21haW4uanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogUnNsaWRlci4gRG93bmxvYWRlZCBmcm9tIGh0dHBzOi8vc2xhd29taXItemF6aWFibG8uZ2l0aHViLmlvL3JhbmdlLXNsaWRlci9cbiAqIE1vZGlmaWVkIHRvIG1ha2UgaW50byBFUzYgbW9kdWxlIGFuZCBmaXggYSBmZXcgYnVnc1xuICovXG5cbnZhciBSUyA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIHRoaXMuaW5wdXQgPSBudWxsXG4gIHRoaXMuaW5wdXREaXNwbGF5ID0gbnVsbFxuICB0aGlzLnNsaWRlciA9IG51bGxcbiAgdGhpcy5zbGlkZXJXaWR0aCA9IDBcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gMFxuICB0aGlzLnBvaW50ZXJXaWR0aCA9IDBcbiAgdGhpcy5wb2ludGVyUiA9IG51bGxcbiAgdGhpcy5wb2ludGVyTCA9IG51bGxcbiAgdGhpcy5hY3RpdmVQb2ludGVyID0gbnVsbFxuICB0aGlzLnNlbGVjdGVkID0gbnVsbFxuICB0aGlzLnNjYWxlID0gbnVsbFxuICB0aGlzLnN0ZXAgPSAwXG4gIHRoaXMudGlwTCA9IG51bGxcbiAgdGhpcy50aXBSID0gbnVsbFxuICB0aGlzLnRpbWVvdXQgPSBudWxsXG4gIHRoaXMudmFsUmFuZ2UgPSBmYWxzZVxuXG4gIHRoaXMudmFsdWVzID0ge1xuICAgIHN0YXJ0OiBudWxsLFxuICAgIGVuZDogbnVsbFxuICB9XG4gIHRoaXMuY29uZiA9IHtcbiAgICB0YXJnZXQ6IG51bGwsXG4gICAgdmFsdWVzOiBudWxsLFxuICAgIHNldDogbnVsbCxcbiAgICByYW5nZTogZmFsc2UsXG4gICAgd2lkdGg6IG51bGwsXG4gICAgc2NhbGU6IHRydWUsXG4gICAgbGFiZWxzOiB0cnVlLFxuICAgIHRvb2x0aXA6IHRydWUsXG4gICAgc3RlcDogbnVsbCxcbiAgICBkaXNhYmxlZDogZmFsc2UsXG4gICAgb25DaGFuZ2U6IG51bGxcbiAgfVxuXG4gIHRoaXMuY2xzID0ge1xuICAgIGNvbnRhaW5lcjogJ3JzLWNvbnRhaW5lcicsXG4gICAgYmFja2dyb3VuZDogJ3JzLWJnJyxcbiAgICBzZWxlY3RlZDogJ3JzLXNlbGVjdGVkJyxcbiAgICBwb2ludGVyOiAncnMtcG9pbnRlcicsXG4gICAgc2NhbGU6ICdycy1zY2FsZScsXG4gICAgbm9zY2FsZTogJ3JzLW5vc2NhbGUnLFxuICAgIHRpcDogJ3JzLXRvb2x0aXAnXG4gIH1cblxuICBmb3IgKHZhciBpIGluIHRoaXMuY29uZikgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbmYsIGkpKSB0aGlzLmNvbmZbaV0gPSBjb25mW2ldIH1cblxuICB0aGlzLmluaXQoKVxufVxuXG5SUy5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHR5cGVvZiB0aGlzLmNvbmYudGFyZ2V0ID09PSAnb2JqZWN0JykgdGhpcy5pbnB1dCA9IHRoaXMuY29uZi50YXJnZXRcbiAgZWxzZSB0aGlzLmlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5jb25mLnRhcmdldC5yZXBsYWNlKCcjJywgJycpKVxuXG4gIGlmICghdGhpcy5pbnB1dCkgcmV0dXJuIGNvbnNvbGUubG9nKCdDYW5ub3QgZmluZCB0YXJnZXQgZWxlbWVudC4uLicpXG5cbiAgdGhpcy5pbnB1dERpc3BsYXkgPSBnZXRDb21wdXRlZFN0eWxlKHRoaXMuaW5wdXQsIG51bGwpLmRpc3BsYXlcbiAgdGhpcy5pbnB1dC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG4gIHRoaXMudmFsUmFuZ2UgPSAhKHRoaXMuY29uZi52YWx1ZXMgaW5zdGFuY2VvZiBBcnJheSlcblxuICBpZiAodGhpcy52YWxSYW5nZSkge1xuICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuY29uZi52YWx1ZXMsICdtaW4nKSB8fCAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuY29uZi52YWx1ZXMsICdtYXgnKSkgeyByZXR1cm4gY29uc29sZS5sb2coJ01pc3NpbmcgbWluIG9yIG1heCB2YWx1ZS4uLicpIH1cbiAgfVxuICByZXR1cm4gdGhpcy5jcmVhdGVTbGlkZXIoKVxufVxuXG5SUy5wcm90b3R5cGUuY3JlYXRlU2xpZGVyID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNsaWRlciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLmNvbnRhaW5lcilcbiAgdGhpcy5zbGlkZXIuaW5uZXJIVE1MID0gJzxkaXYgY2xhc3M9XCJycy1iZ1wiPjwvZGl2PidcbiAgdGhpcy5zZWxlY3RlZCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnNlbGVjdGVkKVxuICB0aGlzLnBvaW50ZXJMID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMucG9pbnRlciwgWydkaXInLCAnbGVmdCddKVxuICB0aGlzLnNjYWxlID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMuc2NhbGUpXG5cbiAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7XG4gICAgdGhpcy50aXBMID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMudGlwKVxuICAgIHRoaXMudGlwUiA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnRpcClcbiAgICB0aGlzLnBvaW50ZXJMLmFwcGVuZENoaWxkKHRoaXMudGlwTClcbiAgfVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnNlbGVjdGVkKVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnNjYWxlKVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnBvaW50ZXJMKVxuXG4gIGlmICh0aGlzLmNvbmYucmFuZ2UpIHtcbiAgICB0aGlzLnBvaW50ZXJSID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMucG9pbnRlciwgWydkaXInLCAncmlnaHQnXSlcbiAgICBpZiAodGhpcy5jb25mLnRvb2x0aXApIHRoaXMucG9pbnRlclIuYXBwZW5kQ2hpbGQodGhpcy50aXBSKVxuICAgIHRoaXMuc2xpZGVyLmFwcGVuZENoaWxkKHRoaXMucG9pbnRlclIpXG4gIH1cblxuICB0aGlzLmlucHV0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuc2xpZGVyLCB0aGlzLmlucHV0Lm5leHRTaWJsaW5nKVxuXG4gIGlmICh0aGlzLmNvbmYud2lkdGgpIHRoaXMuc2xpZGVyLnN0eWxlLndpZHRoID0gcGFyc2VJbnQodGhpcy5jb25mLndpZHRoKSArICdweCdcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gdGhpcy5zbGlkZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdFxuICB0aGlzLnNsaWRlcldpZHRoID0gdGhpcy5zbGlkZXIuY2xpZW50V2lkdGhcbiAgdGhpcy5wb2ludGVyV2lkdGggPSB0aGlzLnBvaW50ZXJMLmNsaWVudFdpZHRoXG5cbiAgaWYgKCF0aGlzLmNvbmYuc2NhbGUpIHRoaXMuc2xpZGVyLmNsYXNzTGlzdC5hZGQodGhpcy5jbHMubm9zY2FsZSlcblxuICByZXR1cm4gdGhpcy5zZXRJbml0aWFsVmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLnNldEluaXRpYWxWYWx1ZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZGlzYWJsZWQodGhpcy5jb25mLmRpc2FibGVkKVxuXG4gIGlmICh0aGlzLnZhbFJhbmdlKSB0aGlzLmNvbmYudmFsdWVzID0gcHJlcGFyZUFycmF5VmFsdWVzKHRoaXMuY29uZilcblxuICB0aGlzLnZhbHVlcy5zdGFydCA9IDBcbiAgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnJhbmdlID8gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxIDogMFxuXG4gIGlmICh0aGlzLmNvbmYuc2V0ICYmIHRoaXMuY29uZi5zZXQubGVuZ3RoICYmIGNoZWNrSW5pdGlhbCh0aGlzLmNvbmYpKSB7XG4gICAgdmFyIHZhbHMgPSB0aGlzLmNvbmYuc2V0XG5cbiAgICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgICB0aGlzLnZhbHVlcy5zdGFydCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzBdKVxuICAgICAgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnNldFsxXSA/IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzFdKSA6IG51bGxcbiAgICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHZhbHNbMF0pXG4gIH1cbiAgcmV0dXJuIHRoaXMuY3JlYXRlU2NhbGUoKVxufVxuXG5SUy5wcm90b3R5cGUuY3JlYXRlU2NhbGUgPSBmdW5jdGlvbiAocmVzaXplKSB7XG4gIHRoaXMuc3RlcCA9IHRoaXMuc2xpZGVyV2lkdGggLyAodGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHtcbiAgICB2YXIgc3BhbiA9IGNyZWF0ZUVsZW1lbnQoJ3NwYW4nKVxuICAgIHZhciBpbnMgPSBjcmVhdGVFbGVtZW50KCdpbnMnKVxuXG4gICAgc3Bhbi5hcHBlbmRDaGlsZChpbnMpXG4gICAgdGhpcy5zY2FsZS5hcHBlbmRDaGlsZChzcGFuKVxuXG4gICAgc3Bhbi5zdHlsZS53aWR0aCA9IGkgPT09IGlMZW4gLSAxID8gMCA6IHRoaXMuc3RlcCArICdweCdcblxuICAgIGlmICghdGhpcy5jb25mLmxhYmVscykge1xuICAgICAgaWYgKGkgPT09IDAgfHwgaSA9PT0gaUxlbiAtIDEpIGlucy5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW2ldXG4gICAgfSBlbHNlIGlucy5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW2ldXG5cbiAgICBpbnMuc3R5bGUubWFyZ2luTGVmdCA9IChpbnMuY2xpZW50V2lkdGggLyAyKSAqIC0xICsgJ3B4J1xuICB9XG4gIHJldHVybiB0aGlzLmFkZEV2ZW50cygpXG59XG5cblJTLnByb3RvdHlwZS51cGRhdGVTY2FsZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zdGVwID0gdGhpcy5zbGlkZXJXaWR0aCAvICh0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpXG5cbiAgdmFyIHBpZWNlcyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NwYW4nKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gcGllY2VzLmxlbmd0aDsgaSA8IGlMZW4gLSAxOyBpKyspIHsgcGllY2VzW2ldLnN0eWxlLndpZHRoID0gdGhpcy5zdGVwICsgJ3B4JyB9XG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLmFkZEV2ZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHBvaW50ZXJzID0gdGhpcy5zbGlkZXIucXVlcnlTZWxlY3RvckFsbCgnLicgKyB0aGlzLmNscy5wb2ludGVyKVxuICB2YXIgcGllY2VzID0gdGhpcy5zbGlkZXIucXVlcnlTZWxlY3RvckFsbCgnc3BhbicpXG5cbiAgY3JlYXRlRXZlbnRzKGRvY3VtZW50LCAnbW91c2Vtb3ZlIHRvdWNobW92ZScsIHRoaXMubW92ZS5iaW5kKHRoaXMpKVxuICBjcmVhdGVFdmVudHMoZG9jdW1lbnQsICdtb3VzZXVwIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgdGhpcy5kcm9wLmJpbmQodGhpcykpXG5cbiAgZm9yIChsZXQgaSA9IDAsIGlMZW4gPSBwb2ludGVycy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgY3JlYXRlRXZlbnRzKHBvaW50ZXJzW2ldLCAnbW91c2Vkb3duIHRvdWNoc3RhcnQnLCB0aGlzLmRyYWcuYmluZCh0aGlzKSkgfVxuXG4gIGZvciAobGV0IGkgPSAwLCBpTGVuID0gcGllY2VzLmxlbmd0aDsgaSA8IGlMZW47IGkrKykgeyBjcmVhdGVFdmVudHMocGllY2VzW2ldLCAnY2xpY2snLCB0aGlzLm9uQ2xpY2tQaWVjZS5iaW5kKHRoaXMpKSB9XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMub25SZXNpemUuYmluZCh0aGlzKSlcblxuICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxufVxuXG5SUy5wcm90b3R5cGUuZHJhZyA9IGZ1bmN0aW9uIChlKSB7XG4gIGUucHJldmVudERlZmF1bHQoKVxuXG4gIGlmICh0aGlzLmNvbmYuZGlzYWJsZWQpIHJldHVyblxuXG4gIHZhciBkaXIgPSBlLnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtZGlyJylcbiAgaWYgKGRpciA9PT0gJ2xlZnQnKSB0aGlzLmFjdGl2ZVBvaW50ZXIgPSB0aGlzLnBvaW50ZXJMXG4gIGlmIChkaXIgPT09ICdyaWdodCcpIHRoaXMuYWN0aXZlUG9pbnRlciA9IHRoaXMucG9pbnRlclJcblxuICByZXR1cm4gdGhpcy5zbGlkZXIuY2xhc3NMaXN0LmFkZCgnc2xpZGluZycpXG59XG5cblJTLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24gKGUpIHtcbiAgaWYgKHRoaXMuYWN0aXZlUG9pbnRlciAmJiAhdGhpcy5jb25mLmRpc2FibGVkKSB7XG4gICAgdmFyIGNvb3JkWCA9IGUudHlwZSA9PT0gJ3RvdWNobW92ZScgPyBlLnRvdWNoZXNbMF0uY2xpZW50WCA6IGUucGFnZVhcbiAgICB2YXIgaW5kZXggPSBjb29yZFggLSB0aGlzLnNsaWRlckxlZnQgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKVxuXG4gICAgaW5kZXggPSBNYXRoLnJvdW5kKGluZGV4IC8gdGhpcy5zdGVwKVxuXG4gICAgaWYgKGluZGV4IDw9IDApIGluZGV4ID0gMFxuICAgIGlmIChpbmRleCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgaW5kZXggPSB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDFcblxuICAgIGlmICh0aGlzLmNvbmYucmFuZ2UpIHtcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgPT09IHRoaXMucG9pbnRlckwpIHRoaXMudmFsdWVzLnN0YXJ0ID0gaW5kZXhcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgPT09IHRoaXMucG9pbnRlclIpIHRoaXMudmFsdWVzLmVuZCA9IGluZGV4XG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IGluZGV4XG5cbiAgICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxuICB9XG59XG5cblJTLnByb3RvdHlwZS5kcm9wID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmFjdGl2ZVBvaW50ZXIgPSBudWxsXG59XG5cblJTLnByb3RvdHlwZS5zZXRWYWx1ZXMgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICB2YXIgYWN0aXZlUG9pbnRlciA9IHRoaXMuY29uZi5yYW5nZSA/ICdzdGFydCcgOiAnZW5kJ1xuXG4gIGlmIChzdGFydCAmJiB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2Yoc3RhcnQpID4gLTEpIHsgdGhpcy52YWx1ZXNbYWN0aXZlUG9pbnRlcl0gPSB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2Yoc3RhcnQpIH1cblxuICBpZiAoZW5kICYmIHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZihlbmQpID4gLTEpIHsgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKGVuZCkgfVxuXG4gIGlmICh0aGlzLmNvbmYucmFuZ2UgJiYgdGhpcy52YWx1ZXMuc3RhcnQgPiB0aGlzLnZhbHVlcy5lbmQpIHsgdGhpcy52YWx1ZXMuc3RhcnQgPSB0aGlzLnZhbHVlcy5lbmQgfVxuXG4gIHRoaXMucG9pbnRlckwuc3R5bGUubGVmdCA9ICh0aGlzLnZhbHVlc1thY3RpdmVQb2ludGVyXSAqIHRoaXMuc3RlcCAtICh0aGlzLnBvaW50ZXJXaWR0aCAvIDIpKSArICdweCdcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7XG4gICAgICB0aGlzLnRpcEwuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5zdGFydF1cbiAgICAgIHRoaXMudGlwUi5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1cbiAgICB9XG4gICAgdGhpcy5pbnB1dC52YWx1ZSA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdICsgJywnICsgdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG4gICAgdGhpcy5wb2ludGVyUi5zdHlsZS5sZWZ0ID0gKHRoaXMudmFsdWVzLmVuZCAqIHRoaXMuc3RlcCAtICh0aGlzLnBvaW50ZXJXaWR0aCAvIDIpKSArICdweCdcbiAgfSBlbHNlIHtcbiAgICBpZiAodGhpcy5jb25mLnRvb2x0aXApIHsgdGhpcy50aXBMLmlubmVySFRNTCA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXSB9XG4gICAgdGhpcy5pbnB1dC52YWx1ZSA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxuICB9XG5cbiAgaWYgKHRoaXMudmFsdWVzLmVuZCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG4gIGlmICh0aGlzLnZhbHVlcy5zdGFydCA8IDApIHRoaXMudmFsdWVzLnN0YXJ0ID0gMFxuXG4gIHRoaXMuc2VsZWN0ZWQuc3R5bGUud2lkdGggPSAodGhpcy52YWx1ZXMuZW5kIC0gdGhpcy52YWx1ZXMuc3RhcnQpICogdGhpcy5zdGVwICsgJ3B4J1xuICB0aGlzLnNlbGVjdGVkLnN0eWxlLmxlZnQgPSB0aGlzLnZhbHVlcy5zdGFydCAqIHRoaXMuc3RlcCArICdweCdcblxuICByZXR1cm4gdGhpcy5vbkNoYW5nZSgpXG59XG5cblJTLnByb3RvdHlwZS5vbkNsaWNrUGllY2UgPSBmdW5jdGlvbiAoZSkge1xuICBpZiAodGhpcy5jb25mLmRpc2FibGVkKSByZXR1cm5cblxuICB2YXIgaWR4ID0gTWF0aC5yb3VuZCgoZS5jbGllbnRYIC0gdGhpcy5zbGlkZXJMZWZ0KSAvIHRoaXMuc3RlcClcblxuICBpZiAoaWR4ID4gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKSBpZHggPSB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDFcbiAgaWYgKGlkeCA8IDApIGlkeCA9IDBcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgaWYgKGlkeCAtIHRoaXMudmFsdWVzLnN0YXJ0IDw9IHRoaXMudmFsdWVzLmVuZCAtIGlkeCkge1xuICAgICAgdGhpcy52YWx1ZXMuc3RhcnQgPSBpZHhcbiAgICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gaWR4XG4gIH0gZWxzZSB0aGlzLnZhbHVlcy5lbmQgPSBpZHhcblxuICB0aGlzLnNsaWRlci5jbGFzc0xpc3QucmVtb3ZlKCdzbGlkaW5nJylcblxuICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxufVxuXG5SUy5wcm90b3R5cGUub25DaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBfdGhpcyA9IHRoaXNcblxuICBpZiAodGhpcy50aW1lb3V0KSBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0KVxuXG4gIHRoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIGlmIChfdGhpcy5jb25mLm9uQ2hhbmdlICYmIHR5cGVvZiBfdGhpcy5jb25mLm9uQ2hhbmdlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gX3RoaXMuY29uZi5vbkNoYW5nZShfdGhpcy5pbnB1dC52YWx1ZSlcbiAgICB9XG4gIH0sIDUwMClcbn1cblxuUlMucHJvdG90eXBlLm9uUmVzaXplID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNsaWRlckxlZnQgPSB0aGlzLnNsaWRlci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0XG4gIHRoaXMuc2xpZGVyV2lkdGggPSB0aGlzLnNsaWRlci5jbGllbnRXaWR0aFxuICByZXR1cm4gdGhpcy51cGRhdGVTY2FsZSgpXG59XG5cblJTLnByb3RvdHlwZS5kaXNhYmxlZCA9IGZ1bmN0aW9uIChkaXNhYmxlZCkge1xuICB0aGlzLmNvbmYuZGlzYWJsZWQgPSBkaXNhYmxlZFxuICB0aGlzLnNsaWRlci5jbGFzc0xpc3RbZGlzYWJsZWQgPyAnYWRkJyA6ICdyZW1vdmUnXSgnZGlzYWJsZWQnKVxufVxuXG5SUy5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIFJldHVybiBsaXN0IG9mIG51bWJlcnMsIHJhdGhlciB0aGFuIGEgc3RyaW5nLCB3aGljaCB3b3VsZCBqdXN0IGJlIHNpbGx5XG4gIC8vICByZXR1cm4gdGhpcy5pbnB1dC52YWx1ZVxuICByZXR1cm4gW3RoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdLCB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1dXG59XG5cblJTLnByb3RvdHlwZS5nZXRWYWx1ZUwgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIEdldCBsZWZ0IChpLmUuIHNtYWxsZXN0KSB2YWx1ZVxuICByZXR1cm4gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5zdGFydF1cbn1cblxuUlMucHJvdG90eXBlLmdldFZhbHVlUiA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gR2V0IHJpZ2h0IChpLmUuIHNtYWxsZXN0KSB2YWx1ZVxuICByZXR1cm4gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG59XG5cblJTLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmlucHV0LnN0eWxlLmRpc3BsYXkgPSB0aGlzLmlucHV0RGlzcGxheVxuICB0aGlzLnNsaWRlci5yZW1vdmUoKVxufVxuXG52YXIgY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uIChlbCwgY2xzLCBkYXRhQXR0cikge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZWwpXG4gIGlmIChjbHMpIGVsZW1lbnQuY2xhc3NOYW1lID0gY2xzXG4gIGlmIChkYXRhQXR0ciAmJiBkYXRhQXR0ci5sZW5ndGggPT09IDIpIHsgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2RhdGEtJyArIGRhdGFBdHRyWzBdLCBkYXRhQXR0clsxXSkgfVxuXG4gIHJldHVybiBlbGVtZW50XG59XG5cbnZhciBjcmVhdGVFdmVudHMgPSBmdW5jdGlvbiAoZWwsIGV2LCBjYWxsYmFjaykge1xuICB2YXIgZXZlbnRzID0gZXYuc3BsaXQoJyAnKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gZXZlbnRzLmxlbmd0aDsgaSA8IGlMZW47IGkrKykgeyBlbC5hZGRFdmVudExpc3RlbmVyKGV2ZW50c1tpXSwgY2FsbGJhY2spIH1cbn1cblxudmFyIHByZXBhcmVBcnJheVZhbHVlcyA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIHZhciB2YWx1ZXMgPSBbXVxuICB2YXIgcmFuZ2UgPSBjb25mLnZhbHVlcy5tYXggLSBjb25mLnZhbHVlcy5taW5cblxuICBpZiAoIWNvbmYuc3RlcCkge1xuICAgIGNvbnNvbGUubG9nKCdObyBzdGVwIGRlZmluZWQuLi4nKVxuICAgIHJldHVybiBbY29uZi52YWx1ZXMubWluLCBjb25mLnZhbHVlcy5tYXhdXG4gIH1cblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IChyYW5nZSAvIGNvbmYuc3RlcCk7IGkgPCBpTGVuOyBpKyspIHsgdmFsdWVzLnB1c2goY29uZi52YWx1ZXMubWluICsgaSAqIGNvbmYuc3RlcCkgfVxuXG4gIGlmICh2YWx1ZXMuaW5kZXhPZihjb25mLnZhbHVlcy5tYXgpIDwgMCkgdmFsdWVzLnB1c2goY29uZi52YWx1ZXMubWF4KVxuXG4gIHJldHVybiB2YWx1ZXNcbn1cblxudmFyIGNoZWNrSW5pdGlhbCA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIGlmICghY29uZi5zZXQgfHwgY29uZi5zZXQubGVuZ3RoIDwgMSkgcmV0dXJuIG51bGxcbiAgaWYgKGNvbmYudmFsdWVzLmluZGV4T2YoY29uZi5zZXRbMF0pIDwgMCkgcmV0dXJuIG51bGxcblxuICBpZiAoY29uZi5yYW5nZSkge1xuICAgIGlmIChjb25mLnNldC5sZW5ndGggPCAyIHx8IGNvbmYudmFsdWVzLmluZGV4T2YoY29uZi5zZXRbMV0pIDwgMCkgcmV0dXJuIG51bGxcbiAgfVxuICByZXR1cm4gdHJ1ZVxufVxuXG5leHBvcnQgZGVmYXVsdCBSU1xuIiwiLyogUk5HcyAvIHNlbGVjdG9ycyAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdhdXNzaWFuIChuKSB7XG4gIGxldCBybnVtID0gMFxuICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgIHJudW0gKz0gTWF0aC5yYW5kb20oKVxuICB9XG4gIHJldHVybiBybnVtIC8gblxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZEJldHdlZW4gKG4sIG0sIGRpc3QpIHtcbiAgLy8gcmV0dXJuIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBuIGFuZCBtIGluY2x1c2l2ZVxuICAvLyBkaXN0IChvcHRpb25hbCkgaXMgYSBmdW5jdGlvbiByZXR1cm5pbmcgYSB2YWx1ZSBpbiBbMCwxKVxuICAvLyBkZWZhdWx0IGlzIHNsaWdodGx5IGJpYXNlZCB0b3dhcmRzIG1pZGRsZVxuICBpZiAoIWRpc3QpIGRpc3QgPSBNYXRoLnJhbmRvbVxuICByZXR1cm4gbiArIE1hdGguZmxvb3IoZGlzdCgpICogKG0gLSBuICsgMSkpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kQmV0d2VlbkZpbHRlciAobiwgbSwgZmlsdGVyKSB7XG4gIC8qIHJldHVybnMgYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIG4gYW5kIG0gaW5jbHVzaXZlIHdoaWNoIHNhdGlzZmllcyB0aGUgZmlsdGVyXG4gIC8gIG4sIG06IGludGVnZXJcbiAgLyAgZmlsdGVyOiBJbnQtPiBCb29sXG4gICovXG4gIGNvbnN0IGFyciA9IFtdXG4gIGZvciAobGV0IGkgPSBuOyBpIDwgbSArIDE7IGkrKykge1xuICAgIGlmIChmaWx0ZXIoaSkpIGFyci5wdXNoKGkpXG4gIH1cbiAgaWYgKGFyciA9PT0gW10pIHRocm93IG5ldyBFcnJvcignb3ZlcmZpbHRlcmVkJylcbiAgY29uc3QgaSA9IHJhbmRCZXR3ZWVuKDAsIGFyci5sZW5ndGggLSAxKVxuICByZXR1cm4gYXJyW2ldXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kTXVsdEJldHdlZW4gKG1pbiwgbWF4LCBuKSB7XG4gIC8vIHJldHVybiBhIHJhbmRvbSBtdWx0aXBsZSBvZiBuIGJldHdlZW4gbiBhbmQgbSAoaW5jbHVzaXZlIGlmIHBvc3NpYmxlKVxuICBtaW4gPSBNYXRoLmNlaWwobWluIC8gbikgKiBuXG4gIG1heCA9IE1hdGguZmxvb3IobWF4IC8gbikgKiBuIC8vIGNvdWxkIGNoZWNrIGRpdmlzaWJpbGl0eSBmaXJzdCB0byBtYXhpbWlzZSBwZXJmb3JtYWNlLCBidXQgSSdtIHN1cmUgdGhlIGhpdCBpc24ndCBiYWRcblxuICByZXR1cm4gcmFuZEJldHdlZW4obWluIC8gbiwgbWF4IC8gbikgKiBuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kRWxlbSAoYXJyYXksIGRpc3QpIHtcbiAgaWYgKFsuLi5hcnJheV0ubGVuZ3RoID09PSAwKSB0aHJvdyBuZXcgRXJyb3IoJ2VtcHR5IGFycmF5JylcbiAgaWYgKCFkaXN0KSBkaXN0ID0gTWF0aC5yYW5kb21cbiAgY29uc3QgbiA9IGFycmF5Lmxlbmd0aCB8fCBhcnJheS5zaXplXG4gIGNvbnN0IGkgPSByYW5kQmV0d2VlbigwLCBuIC0gMSwgZGlzdClcbiAgcmV0dXJuIFsuLi5hcnJheV1baV1cbn1cblxuLyogTWF0aHMgKi9cbmV4cG9ydCBmdW5jdGlvbiByb3VuZFRvVGVuIChuKSB7XG4gIHJldHVybiBNYXRoLnJvdW5kKG4gLyAxMCkgKiAxMFxufVxuXG4vKipcbiAqIFJvdW5kcyBhIG51bWJlciB0byBhIGdpdmVuIG51bWJlciBvZiBkZWNpbWFsIHBsYWNlc1xuICogQHBhcmFtIHtudW1iZXJ9IHggVGhlIG51bWJlciB0byByb3VuZFxuICogQHBhcmFtIHtudW1iZXJ9IG4gVGhlIG51bWJlciBvZiBkZWNpbWFsIHBsYWNlc1xuICogQHJldHVybnMge251bWJlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJvdW5kRFAgKHgsIG4pIHtcbiAgcmV0dXJuIE1hdGgucm91bmQoeCAqIE1hdGgucG93KDEwLCBuKSkgLyBNYXRoLnBvdygxMCwgbilcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlZ1RvUmFkICh4KSB7XG4gIHJldHVybiB4ICogTWF0aC5QSSAvIDE4MFxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2luRGVnICh4KSB7XG4gIHJldHVybiBNYXRoLnNpbih4ICogTWF0aC5QSSAvIDE4MClcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvc0RlZyAoeCkge1xuICByZXR1cm4gTWF0aC5jb3MoeCAqIE1hdGguUEkgLyAxODApXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzY2FsZWRTdHIgKG4sIGRwKSB7XG4gIC8vIHJldHVybnMgYSBzdHJpbmcgcmVwcmVzZW50aW5nIG4vMTBeZHBcbiAgLy8gZS5nLiBzY2FsZWRTdHIoMzQsMSk9XCIzLjRcIlxuICAvLyBzY2FsZWRTdHIoMzE0LDIpPVwiMy4xNFwiXG4gIC8vIHNjYWxlZFN0cigzMCwxKT1cIjNcIlxuICAvLyBUcnlpbmcgdG8gYXZvaWQgcHJlY2lzaW9uIGVycm9ycyFcbiAgaWYgKGRwID09PSAwKSByZXR1cm4gblxuICBjb25zdCBmYWN0b3IgPSBNYXRoLnBvdygxMCwgZHApXG4gIGNvbnN0IGludHBhcnQgPSBNYXRoLmZsb29yKG4gLyBmYWN0b3IpXG4gIGNvbnN0IGRlY3BhcnQgPSBuICUgZmFjdG9yXG4gIGlmIChkZWNwYXJ0ID09PSAwKSB7XG4gICAgcmV0dXJuIGludHBhcnRcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gaW50cGFydCArICcuJyArIGRlY3BhcnRcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2NkIChhLCBiKSB7XG4gIC8vIHRha2VuIGZyb20gZnJhY3Rpb24uanNcbiAgaWYgKCFhKSB7IHJldHVybiBiIH1cbiAgaWYgKCFiKSB7IHJldHVybiBhIH1cblxuICB3aGlsZSAoMSkge1xuICAgIGEgJT0gYlxuICAgIGlmICghYSkgeyByZXR1cm4gYiB9XG4gICAgYiAlPSBhXG4gICAgaWYgKCFiKSB7IHJldHVybiBhIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbGNtIChhLCBiKSB7XG4gIHJldHVybiBhICogYiAvIGdjZChhLCBiKVxufVxuXG4vKiBBcnJheXMgYW5kIHNpbWlsYXIgKi9cblxuLyoqXG4gKiBTb3J0cyB0d28gYXJyYXlzIHRvZ2V0aGVyIGJhc2VkIG9uIHNvcnRpbmcgYXJyMFxuICogQHBhcmFtIHsqW119IGFycjAgXG4gKiBAcGFyYW0geypbXX0gYXJyMSBcbiAqIEBwYXJhbSB7Kn0gZiBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNvcnRUb2dldGhlciAoYXJyMCwgYXJyMSwgZikge1xuICBpZiAoYXJyMC5sZW5ndGggIT09IGFycjEubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm90aCBhcmd1bWVudHMgbXVzdCBiZSBhcnJheXMgb2YgdGhlIHNhbWUgbGVuZ3RoJylcbiAgfVxuXG4gIGYgPSBmIHx8ICgoeCx5KT0+eC15KVxuXG4gIGNvbnN0IG4gPSBhcnIwLmxlbmd0aFxuICBjb25zdCBjb21iaW5lZCA9IFtdXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgY29tYmluZWRbaV0gPSBbYXJyMFtpXSwgYXJyMVtpXV1cbiAgfVxuXG4gIGNvbWJpbmVkLnNvcnQoKHgsIHkpID0+IGYoeFswXSwgeVswXSkpXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICBhcnIwW2ldID0gY29tYmluZWRbaV1bMF1cbiAgICBhcnIxW2ldID0gY29tYmluZWRbaV1bMV1cbiAgfVxuXG4gIHJldHVybiBbYXJyMCwgYXJyMV1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGUgKGFycmF5KSB7XG4gIC8vIEtudXRoLUZpc2hlci1ZYXRlc1xuICAvLyBmcm9tIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yNDUwOTc2LzM3MzcyOTVcbiAgLy8gbmIuIHNodWZmbGVzIGluIHBsYWNlXG4gIHZhciBjdXJyZW50SW5kZXggPSBhcnJheS5sZW5ndGg7IHZhciB0ZW1wb3JhcnlWYWx1ZTsgdmFyIHJhbmRvbUluZGV4XG5cbiAgLy8gV2hpbGUgdGhlcmUgcmVtYWluIGVsZW1lbnRzIHRvIHNodWZmbGUuLi5cbiAgd2hpbGUgKGN1cnJlbnRJbmRleCAhPT0gMCkge1xuICAgIC8vIFBpY2sgYSByZW1haW5pbmcgZWxlbWVudC4uLlxuICAgIHJhbmRvbUluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY3VycmVudEluZGV4KVxuICAgIGN1cnJlbnRJbmRleCAtPSAxXG5cbiAgICAvLyBBbmQgc3dhcCBpdCB3aXRoIHRoZSBjdXJyZW50IGVsZW1lbnQuXG4gICAgdGVtcG9yYXJ5VmFsdWUgPSBhcnJheVtjdXJyZW50SW5kZXhdXG4gICAgYXJyYXlbY3VycmVudEluZGV4XSA9IGFycmF5W3JhbmRvbUluZGV4XVxuICAgIGFycmF5W3JhbmRvbUluZGV4XSA9IHRlbXBvcmFyeVZhbHVlXG4gIH1cblxuICByZXR1cm4gYXJyYXlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdlYWtJbmNsdWRlcyAoYSwgZSkge1xuICByZXR1cm4gKEFycmF5LmlzQXJyYXkoYSkgJiYgYS5pbmNsdWRlcyhlKSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpcnN0VW5pcXVlSW5kZXggKGFycmF5KSB7XG4gIC8vIHJldHVybnMgaW5kZXggb2YgZmlyc3QgdW5pcXVlIGVsZW1lbnRcbiAgLy8gaWYgbm9uZSwgcmV0dXJucyBsZW5ndGggb2YgYXJyYXlcbiAgbGV0IGkgPSAwXG4gIHdoaWxlIChpIDwgYXJyYXkubGVuZ3RoKSB7XG4gICAgaWYgKGFycmF5LmluZGV4T2YoYXJyYXlbaV0pID09PSBhcnJheS5sYXN0SW5kZXhPZihhcnJheVtpXSkpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIGkrK1xuICB9XG4gIHJldHVybiBpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBib29sT2JqZWN0VG9BcnJheSAob2JqKSB7XG4gIC8vIEdpdmVuIGFuIG9iamVjdCB3aGVyZSBhbGwgdmFsdWVzIGFyZSBib29sZWFuLCByZXR1cm4ga2V5cyB3aGVyZSB0aGUgdmFsdWUgaXMgdHJ1ZVxuICBjb25zdCByZXN1bHQgPSBbXVxuICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHtcbiAgICBpZiAob2JqW2tleV0pIHJlc3VsdC5wdXNoKGtleSlcbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qIE9iamVjdCBwcm9wZXJ0eSBhY2Nlc3MgYnkgc3RyaW5nICovXG5leHBvcnQgZnVuY3Rpb24gcHJvcEJ5U3RyaW5nIChvLCBzLCB4KSB7XG4gIC8qIEUuZy4gYnlTdHJpbmcobXlPYmosXCJmb28uYmFyXCIpIC0+IG15T2JqLmZvby5iYXJcbiAgICAgKiBieVN0cmluZyhteU9iaixcImZvby5iYXJcIixcImJhelwiKSAtPiBteU9iai5mb28uYmFyID0gXCJiYXpcIlxuICAgICAqL1xuICBzID0gcy5yZXBsYWNlKC9cXFsoXFx3KylcXF0vZywgJy4kMScpIC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gIHMgPSBzLnJlcGxhY2UoL15cXC4vLCAnJykgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICB2YXIgYSA9IHMuc3BsaXQoJy4nKVxuICBmb3IgKHZhciBpID0gMCwgbiA9IGEubGVuZ3RoIC0gMTsgaSA8IG47ICsraSkge1xuICAgIHZhciBrID0gYVtpXVxuICAgIGlmIChrIGluIG8pIHtcbiAgICAgIG8gPSBvW2tdXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgfVxuICBpZiAoeCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gb1thW25dXVxuICBlbHNlIG9bYVtuXV0gPSB4XG59XG5cbi8qIExvZ2ljICovXG5leHBvcnQgZnVuY3Rpb24gbUlmIChwLCBxKSB7IC8vIG1hdGVyaWFsIGNvbmRpdGlvbmFsXG4gIHJldHVybiAoIXAgfHwgcSlcbn1cblxuLyogRE9NIG1hbmlwdWxhdGlvbiBhbmQgcXVlcnlpbmcgKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbGVtICh0YWdOYW1lLCBjbGFzc05hbWUsIHBhcmVudCkge1xuICAvLyBjcmVhdGUsIHNldCBjbGFzcyBhbmQgYXBwZW5kIGluIG9uZVxuICBjb25zdCBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKVxuICBpZiAoY2xhc3NOYW1lKSBlbGVtLmNsYXNzTmFtZSA9IGNsYXNzTmFtZVxuICBpZiAocGFyZW50KSBwYXJlbnQuYXBwZW5kQ2hpbGQoZWxlbSlcbiAgcmV0dXJuIGVsZW1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc0FuY2VzdG9yQ2xhc3MgKGVsZW0sIGNsYXNzTmFtZSkge1xuICAvLyBjaGVjayBpZiBhbiBlbGVtZW50IGVsZW0gb3IgYW55IG9mIGl0cyBhbmNlc3RvcnMgaGFzIGNsc3NcbiAgbGV0IHJlc3VsdCA9IGZhbHNlXG4gIGZvciAoO2VsZW0gJiYgZWxlbSAhPT0gZG9jdW1lbnQ7IGVsZW0gPSBlbGVtLnBhcmVudE5vZGUpIHsgLy8gdHJhdmVyc2UgRE9NIHVwd2FyZHNcbiAgICBpZiAoZWxlbS5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKSkge1xuICAgICAgcmVzdWx0ID0gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qIENhbnZhcyBkcmF3aW5nICovXG5leHBvcnQgZnVuY3Rpb24gZGFzaGVkTGluZSAoY3R4LCB4MSwgeTEsIHgyLCB5Mikge1xuICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHgyIC0geDEsIHkyIC0geTEpXG4gIGNvbnN0IGRhc2h4ID0gKHkxIC0geTIpIC8gbGVuZ3RoIC8vIHVuaXQgdmVjdG9yIHBlcnBlbmRpY3VsYXIgdG8gbGluZVxuICBjb25zdCBkYXNoeSA9ICh4MiAtIHgxKSAvIGxlbmd0aFxuICBjb25zdCBtaWR4ID0gKHgxICsgeDIpIC8gMlxuICBjb25zdCBtaWR5ID0gKHkxICsgeTIpIC8gMlxuXG4gIC8vIGRyYXcgdGhlIGJhc2UgbGluZVxuICBjdHgubW92ZVRvKHgxLCB5MSlcbiAgY3R4LmxpbmVUbyh4MiwgeTIpXG5cbiAgLy8gZHJhdyB0aGUgZGFzaFxuICBjdHgubW92ZVRvKG1pZHggKyA1ICogZGFzaHgsIG1pZHkgKyA1ICogZGFzaHkpXG4gIGN0eC5saW5lVG8obWlkeCAtIDUgKiBkYXNoeCwgbWlkeSAtIDUgKiBkYXNoeSlcblxuICBjdHgubW92ZVRvKHgyLCB5Milcbn1cbiIsImltcG9ydCB7IGNyZWF0ZUVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE9wdGlvbnNTZXQge1xuICBjb25zdHJ1Y3RvciAob3B0aW9uU3BlYywgdGVtcGxhdGUpIHtcbiAgICB0aGlzLm9wdGlvblNwZWMgPSBvcHRpb25TcGVjXG5cbiAgICB0aGlzLm9wdGlvbnMgPSB7fVxuICAgIHRoaXMub3B0aW9uU3BlYy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICBpZiAob3B0aW9uLnR5cGUgIT09ICdoZWFkaW5nJyAmJiBvcHRpb24udHlwZSAhPT0gJ2NvbHVtbi1icmVhaycpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBvcHRpb24uZGVmYXVsdFxuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGUgLy8gaHRtbCB0ZW1wbGF0ZSAob3B0aW9uYWwpXG5cbiAgICAvLyBzZXQgYW4gaWQgYmFzZWQgb24gYSBjb3VudGVyIC0gdXNlZCBmb3IgbmFtZXMgb2YgZm9ybSBlbGVtZW50c1xuICAgIHRoaXMuZ2xvYmFsSWQgPSBPcHRpb25zU2V0LmdldElkKClcbiAgfVxuXG4gIHVwZGF0ZVN0YXRlRnJvbVVJIChvcHRpb24pIHtcbiAgICAvLyBpbnB1dCAtIGVpdGhlciBhbiBlbGVtZW50IG9mIHRoaXMub3B0aW9uc1NwZWMgb3IgYW4gb3B0aW9uIGlkXG4gICAgaWYgKHR5cGVvZiAob3B0aW9uKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIG9wdGlvbiA9IHRoaXMub3B0aW9uc1NwZWMuZmluZCh4ID0+IHguaWQgPT09IG9wdGlvbilcbiAgICAgIGlmICghb3B0aW9uKSB0aHJvdyBuZXcgRXJyb3IoYG5vIG9wdGlvbiB3aXRoIGlkICcke29wdGlvbn0nYClcbiAgICB9XG4gICAgaWYgKCFvcHRpb24uZWxlbWVudCkgdGhyb3cgbmV3IEVycm9yKGBvcHRpb24gJHtvcHRpb24uaWR9IGRvZXNuJ3QgaGF2ZSBhIFVJIGVsZW1lbnRgKVxuXG4gICAgc3dpdGNoIChvcHRpb24udHlwZSkge1xuICAgICAgY2FzZSAnaW50Jzoge1xuICAgICAgICBjb25zdCBpbnB1dCA9IG9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpWzBdXG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gTnVtYmVyKGlucHV0LnZhbHVlKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAnYm9vbCc6IHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSBvcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKVswXVxuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IGlucHV0LmNoZWNrZWRcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NlbGVjdC1leGNsdXNpdmUnOiB7XG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gb3B0aW9uLmVsZW1lbnQucXVlcnlTZWxlY3RvcignaW5wdXQ6Y2hlY2tlZCcpLnZhbHVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdzZWxlY3QtaW5jbHVzaXZlJzoge1xuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9XG4gICAgICAgICAgQXJyYXkuZnJvbShvcHRpb24uZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dDpjaGVja2VkJyksIHggPT4geC52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgb3B0aW9uIHdpdGggaWQgJHtvcHRpb24uaWR9IGhhcyB1bnJlY29nbmlzZWQgb3B0aW9uIHR5cGUgJHtvcHRpb24udHlwZX1gKVxuICAgIH1cbiAgICAvLyBjb25zb2xlLmxvZyh0aGlzLm9wdGlvbnMpXG4gIH1cblxuICByZW5kZXJJbiAoZWxlbWVudCkge1xuICAgIGNvbnN0IGxpc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd1bCcpXG4gICAgbGlzdC5jbGFzc0xpc3QuYWRkKCdvcHRpb25zLWxpc3QnKVxuXG4gICAgdGhpcy5vcHRpb25TcGVjLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgIC8vIE1ha2UgbGlzdCBpdGVtIC0gY29tbW9uIHRvIGFsbCB0eXBlc1xuICAgICAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpXG4gICAgICBsaS5kYXRhc2V0Lm9wdGlvbklkID0gb3B0aW9uLmlkXG4gICAgICBsaXN0LmFwcGVuZChsaSlcblxuICAgICAgLy8gbWFrZSBpbnB1dCBlbGVtZW50cyAtIGRlcGVuZHMgb24gb3B0aW9uIHR5cGVcbiAgICAgIGlmIChvcHRpb24udHlwZSA9PT0gJ2NvbHVtbi1icmVhaycpIHtcbiAgICAgICAgbGkuY2xhc3NMaXN0LmFkZCgnY29sdW1uLWJyZWFrJylcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9uLnR5cGUgPT09ICdoZWFkaW5nJykge1xuICAgICAgICBsaS5hcHBlbmQob3B0aW9uLnRpdGxlKVxuICAgICAgICBsaS5jbGFzc0xpc3QuYWRkKCdvcHRpb25zLWhlYWRpbmcnKVxuICAgICAgfSBlbHNlIGlmIChvcHRpb24udHlwZSA9PT0gJ2ludCcgfHwgb3B0aW9uLnR5cGUgPT09ICdib29sJykge1xuICAgICAgICAvLyBzaW5nbGUgaW5wdXQgb3B0aW9uc1xuICAgICAgICBjb25zdCBsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJylcbiAgICAgICAgbGkuYXBwZW5kKGxhYmVsKVxuXG4gICAgICAgIGlmICghb3B0aW9uLnN3YXBMYWJlbCkgbGFiZWwuYXBwZW5kKG9wdGlvbi50aXRsZSArICc6ICcpXG5cbiAgICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpXG4gICAgICAgIHN3aXRjaCAob3B0aW9uLnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdpbnQnOlxuICAgICAgICAgICAgaW5wdXQudHlwZSA9ICdudW1iZXInXG4gICAgICAgICAgICBpbnB1dC5taW4gPSBvcHRpb24ubWluXG4gICAgICAgICAgICBpbnB1dC5tYXggPSBvcHRpb24ubWF4XG4gICAgICAgICAgICBpbnB1dC52YWx1ZSA9IG9wdGlvbi5kZWZhdWx0XG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ2Jvb2wnOlxuICAgICAgICAgICAgaW5wdXQudHlwZSA9ICdjaGVja2JveCdcbiAgICAgICAgICAgIGlucHV0LmNoZWNrZWQgPSBvcHRpb24uZGVmYXVsdFxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIG9wdGlvbiB0eXBlICR7b3B0aW9uLnR5cGV9YClcbiAgICAgICAgfVxuICAgICAgICBpbnB1dC5jbGFzc0xpc3QuYWRkKCdvcHRpb24nKVxuICAgICAgICBsYWJlbC5hcHBlbmQoaW5wdXQpXG5cbiAgICAgICAgaWYgKG9wdGlvbi5zd2FwTGFiZWwpIGxhYmVsLmFwcGVuZCgnICcgKyBvcHRpb24udGl0bGUpXG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbi50eXBlID09PSAnc2VsZWN0LWluY2x1c2l2ZScgfHwgb3B0aW9uLnR5cGUgPT09ICdzZWxlY3QtZXhjbHVzaXZlJykge1xuICAgICAgICAvLyBtdWx0aXBsZSBpbnB1dCBvcHRpb25zXG4gICAgICAgIC8vIFRPRE86IHN3YXAgbGFiZWwgKGEgYml0IG9kZCBoZXJlIHRob3VnaClcbiAgICAgICAgbGkuYXBwZW5kKG9wdGlvbi50aXRsZSArICc6ICcpXG5cbiAgICAgICAgY29uc3Qgc3VibGlzdCA9IGNyZWF0ZUVsZW0oJ3VsJywgJ29wdGlvbnMtc3VibGlzdCcsIGxpKVxuICAgICAgICBpZiAob3B0aW9uLnZlcnRpY2FsKSBzdWJsaXN0LmNsYXNzTGlzdC5hZGQoJ29wdGlvbnMtc3VibGlzdC12ZXJ0aWNhbCcpXG5cbiAgICAgICAgb3B0aW9uLnNlbGVjdE9wdGlvbnMuZm9yRWFjaChzZWxlY3RPcHRpb24gPT4ge1xuICAgICAgICAgIGNvbnN0IHN1Ymxpc3RMaSA9IGNyZWF0ZUVsZW0oJ2xpJywgbnVsbCwgc3VibGlzdClcbiAgICAgICAgICBjb25zdCBsYWJlbCA9IGNyZWF0ZUVsZW0oJ2xhYmVsJywgbnVsbCwgc3VibGlzdExpKVxuXG4gICAgICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpXG4gICAgICAgICAgaW5wdXQudHlwZSA9IG9wdGlvbi50eXBlID09PSAnc2VsZWN0LWV4Y2x1c2l2ZScgPyAncmFkaW8nIDogJ2NoZWNrYm94J1xuICAgICAgICAgIGlucHV0Lm5hbWUgPSB0aGlzLmdsb2JhbElkICsgJy0nICsgb3B0aW9uLmlkXG4gICAgICAgICAgaW5wdXQudmFsdWUgPSBzZWxlY3RPcHRpb24uaWRcblxuICAgICAgICAgIGlmIChvcHRpb24udHlwZSA9PT0gJ3NlbGVjdC1pbmNsdXNpdmUnKSB7IC8vIGRlZmF1bHRzIHdvcmsgZGlmZmVyZW50IGZvciBpbmNsdXNpdmUvZXhjbHVzaXZlXG4gICAgICAgICAgICBpbnB1dC5jaGVja2VkID0gb3B0aW9uLmRlZmF1bHQuaW5jbHVkZXMoc2VsZWN0T3B0aW9uLmlkKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbnB1dC5jaGVja2VkID0gb3B0aW9uLmRlZmF1bHQgPT09IHNlbGVjdE9wdGlvbi5pZFxuICAgICAgICAgIH1cblxuICAgICAgICAgIGxhYmVsLmFwcGVuZChpbnB1dClcblxuICAgICAgICAgIGlucHV0LmNsYXNzTGlzdC5hZGQoJ29wdGlvbicpXG5cbiAgICAgICAgICBsYWJlbC5hcHBlbmQoc2VsZWN0T3B0aW9uLnRpdGxlKVxuICAgICAgICB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIG9wdGlvbiB0eXBlICcke29wdGlvbi50eXBlfSdgKVxuICAgICAgfVxuXG4gICAgICBsaS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBlID0+IHRoaXMudXBkYXRlU3RhdGVGcm9tVUkob3B0aW9uKSlcbiAgICAgIG9wdGlvbi5lbGVtZW50ID0gbGlcbiAgICB9KVxuXG4gICAgZWxlbWVudC5hcHBlbmQobGlzdClcbiAgfVxuXG4gIC8vIFRPRE86IHVwZGF0ZVVJRnJvbVN0YXRlKG9wdGlvbikge31cbn1cblxuT3B0aW9uc1NldC5pZENvdW50ZXIgPSAwIC8vIGluY3JlbWVudCBlYWNoIHRpbWUgdG8gY3JlYXRlIHVuaXF1ZSBpZHMgdG8gdXNlIGluIGlkcy9uYW1lcyBvZiBlbGVtZW50c1xuXG5PcHRpb25zU2V0LmdldElkID0gZnVuY3Rpb24gKCkge1xuICBpZiAoT3B0aW9uc1NldC5pZENvdW50ZXIgPj0gMjYgKiogMikgdGhyb3cgbmV3IEVycm9yKCdUb28gbWFueSBvcHRpb25zIG9iamVjdHMhJylcbiAgY29uc3QgaWQgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKH5+KE9wdGlvbnNTZXQuaWRDb3VudGVyIC8gMjYpICsgOTcpICtcbiAgICAgICAgICAgU3RyaW5nLmZyb21DaGFyQ29kZShPcHRpb25zU2V0LmlkQ291bnRlciAlIDI2ICsgOTcpXG5cbiAgT3B0aW9uc1NldC5pZENvdW50ZXIgKz0gMVxuXG4gIHJldHVybiBpZFxufVxuXG5PcHRpb25zU2V0LmRlbW9TcGVjID0gW1xuICB7XG4gICAgdGl0bGU6ICdEaWZmaWN1bHR5JyxcbiAgICBpZDogJ2RpZmZpY3VsdHknLFxuICAgIHR5cGU6ICdpbnQnLFxuICAgIG1pbjogMSxcbiAgICBtYXg6IDEwLFxuICAgIGRlZmF1bHQ6IDVcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVHlwZScsXG4gICAgaWQ6ICd0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ1JlY3RhbmdsZScsIGlkOiAncmVjdGFuZ2xlJyB9LFxuICAgICAgeyB0aXRsZTogJ1RyaWFuZ2xlJywgaWQ6ICd0cmlhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdTcXVvdmFsJywgaWQ6ICdzcXVvdmFsJyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiAncmVjdGFuZ2xlJ1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdBIGhlYWRpbmcnLFxuICAgIHR5cGU6ICdoZWFkaW5nJ1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdTaGFwZScsXG4gICAgaWQ6ICdzaGFwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdSZWN0YW5nbGUgc2hhcGUgdGhpbmcnLCBpZDogJ3JlY3RhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdUcmlhbmdsZSBzaGFwZSB0aGluZycsIGlkOiAndHJpYW5nbGUnIH0sXG4gICAgICB7IHRpdGxlOiAnU3F1b3ZhbCBzaGFwZSBsb25nJywgaWQ6ICdzcXVvdmFsJyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiBbJ3JlY3RhbmdsZScsICdzcXVvdmFsJ10sXG4gICAgdmVydGljYWw6IHRydWUgLy8gbGF5b3V0IHZlcnRpY2FsbHksIHJhdGhlciB0aGFuIGhvcml6b250YWxseVxuICB9LFxuICB7XG4gICAgdHlwZTogJ2NvbHVtbi1icmVhaydcbiAgfSxcbiAge1xuICAgIHR5cGU6ICdoZWFkaW5nJyxcbiAgICB0aXRsZTogJ0EgbmV3IGNvbHVtbidcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnRG8gc29tZXRoaW5nJyxcbiAgICBpZDogJ3NvbWV0aGluZycsXG4gICAgdHlwZTogJ2Jvb2wnLFxuICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgc3dhcExhYmVsOiB0cnVlIC8vIHB1dCBjb250cm9sIGJlZm9yZSBsYWJlbFxuICB9XG5dXG4iLCJleHBvcnQgZGVmYXVsdCBhYnN0cmFjdCBjbGFzcyBRdWVzdGlvbiB7XG4gIERPTTogSFRNTEVsZW1lbnRcbiAgYW5zd2VyZWQ6IGJvb2xlYW5cblxuICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgdGhpcy5ET00gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgIHRoaXMuRE9NLmNsYXNzTmFtZSA9ICdxdWVzdGlvbi1kaXYnXG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gIH1cblxuICBnZXRET00gKCkgOiBIVE1MRWxlbWVudCB7XG4gICAgcmV0dXJuIHRoaXMuRE9NXG4gIH1cblxuICBhYnN0cmFjdCByZW5kZXIgKCkgOiB2b2lkXG5cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQge1xuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gIH1cblxuICB0b2dnbGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICBpZiAodGhpcy5hbnN3ZXJlZCkge1xuICAgICAgdGhpcy5oaWRlQW5zd2VyKClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaG93QW5zd2VyKClcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgLy8gU2hvdWxkIGJlIG92ZXJyaWRkZW5cbiAgICByZXR1cm4gJydcbiAgfVxufVxuIiwiLyogZ2xvYmFsIGthdGV4ICovXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRleHRRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKClcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYSdcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIC8vIHN0b3JlIHRoZSBsYWJlbCBmb3IgZnV0dXJlIHJlbmRlcmluZ1xuICAgIHRoaXMubGFiZWwgPSBzZXR0aW5ncy5sYWJlbFxuXG4gICAgLy8gRHVtbXkgcXVlc3Rpb24gZ2VuZXJhdGluZyAtIHN1YmNsYXNzZXMgZG8gc29tZXRoaW5nIHN1YnN0YW50aWFsIGhlcmVcbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnMisyJ1xuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPTUnXG5cbiAgICAvLyBNYWtlIHRoZSBET00gdHJlZSBmb3IgdGhlIGVsZW1lbnRcbiAgICB0aGlzLnF1ZXN0aW9ucCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKVxuICAgIHRoaXMuYW5zd2VycCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKVxuXG4gICAgdGhpcy5xdWVzdGlvbnAuY2xhc3NOYW1lID0gJ3F1ZXN0aW9uJ1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc05hbWUgPSAnYW5zd2VyJ1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuXG4gICAgdGhpcy5ET00uYXBwZW5kQ2hpbGQodGhpcy5xdWVzdGlvbnApXG4gICAgdGhpcy5ET00uYXBwZW5kQ2hpbGQodGhpcy5hbnN3ZXJwKVxuXG4gICAgLy8gc3ViY2xhc3NlcyBzaG91bGQgZ2VuZXJhdGUgcXVlc3Rpb25MYVRlWCBhbmQgYW5zd2VyTGFUZVgsXG4gICAgLy8gLnJlbmRlcigpIHdpbGwgYmUgY2FsbGVkIGJ5IHVzZXJcbiAgfVxuXG4gIHJlbmRlciAoKSB7XG4gICAgLy8gdXBkYXRlIHRoZSBET00gaXRlbSB3aXRoIHF1ZXN0aW9uTGFUZVggYW5kIGFuc3dlckxhVGVYXG4gICAgdmFyIHFudW0gPSB0aGlzLmxhYmVsXG4gICAgICA/ICdcXFxcdGV4dHsnICsgdGhpcy5sYWJlbCArICcpIH0nXG4gICAgICA6ICcnXG4gICAga2F0ZXgucmVuZGVyKHFudW0gKyB0aGlzLnF1ZXN0aW9uTGFUZVgsIHRoaXMucXVlc3Rpb25wLCB7IGRpc3BsYXlNb2RlOiB0cnVlLCBzdHJpY3Q6ICdpZ25vcmUnIH0pXG4gICAga2F0ZXgucmVuZGVyKHRoaXMuYW5zd2VyTGFUZVgsIHRoaXMuYW5zd2VycCwgeyBkaXNwbGF5TW9kZTogdHJ1ZSB9KVxuICB9XG5cbiAgZ2V0RE9NICgpIHtcbiAgICByZXR1cm4gdGhpcy5ET01cbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkge1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIHtcbiAgICB0aGlzLmFuc3dlcnAuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxufVxuIiwiaW1wb3J0IHsgcmFuZEJldHdlZW4sIGdjZCB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcblxuLyogTWFpbiBxdWVzdGlvbiBjbGFzcy4gVGhpcyB3aWxsIGJlIHNwdW4gb2ZmIGludG8gZGlmZmVyZW50IGZpbGUgYW5kIGdlbmVyYWxpc2VkICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBbGdlYnJhaWNGcmFjdGlvblEgZXh0ZW5kcyBUZXh0USB7XG4gIC8vICdleHRlbmRzJyBRdWVzdGlvbiwgYnV0IG5vdGhpbmcgdG8gYWN0dWFsbHkgZXh0ZW5kXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogMlxuICAgIH1cblxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG4gICAgY29uc3QgZGlmZmljdWx0eSA9IHNldHRpbmdzLmRpZmZpY3VsdHlcblxuICAgIC8vIGxvZ2ljIGZvciBnZW5lcmF0aW5nIHRoZSBxdWVzdGlvbiBhbmQgYW5zd2VyIHN0YXJ0cyBoZXJlXG4gICAgdmFyIGEsIGIsIGMsIGQsIGUsIGYgLy8gKGF4K2IpKGV4K2YpLyhjeCtkKShleCtmKSA9IChweF4yK3F4K3IpLyh0eF4yK3V4K3YpXG4gICAgdmFyIHAsIHEsIHIsIHQsIHUsIHZcbiAgICB2YXIgbWluQ29lZmYsIG1heENvZWZmLCBtaW5Db25zdCwgbWF4Q29uc3RcblxuICAgIHN3aXRjaCAoZGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMTsgbWluQ29uc3QgPSAxOyBtYXhDb25zdCA9IDZcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgbWluQ29lZmYgPSAxOyBtYXhDb2VmZiA9IDE7IG1pbkNvbnN0ID0gLTY7IG1heENvbnN0ID0gNlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAzOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMzsgbWluQ29uc3QgPSAtNTsgbWF4Q29uc3QgPSA1XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ6XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBtaW5Db2VmZiA9IC0zOyBtYXhDb2VmZiA9IDM7IG1pbkNvbnN0ID0gLTU7IG1heENvbnN0ID0gNVxuICAgICAgICBicmVha1xuICAgIH1cblxuICAgIC8vIFBpY2sgc29tZSBjb2VmZmljaWVudHNcbiAgICB3aGlsZSAoXG4gICAgICAoKCFhICYmICFiKSB8fCAoIWMgJiYgIWQpIHx8ICghZSAmJiAhZikpIHx8IC8vIHJldHJ5IGlmIGFueSBleHByZXNzaW9uIGlzIDBcbiAgICAgIGNhblNpbXBsaWZ5KGEsIGIsIGMsIGQpIC8vIHJldHJ5IGlmIHRoZXJlJ3MgYSBjb21tb24gbnVtZXJpY2FsIGZhY3RvclxuICAgICkge1xuICAgICAgYSA9IHJhbmRCZXR3ZWVuKG1pbkNvZWZmLCBtYXhDb2VmZilcbiAgICAgIGMgPSByYW5kQmV0d2VlbihtaW5Db2VmZiwgbWF4Q29lZmYpXG4gICAgICBlID0gcmFuZEJldHdlZW4obWluQ29lZmYsIG1heENvZWZmKVxuICAgICAgYiA9IHJhbmRCZXR3ZWVuKG1pbkNvbnN0LCBtYXhDb25zdClcbiAgICAgIGQgPSByYW5kQmV0d2VlbihtaW5Db25zdCwgbWF4Q29uc3QpXG4gICAgICBmID0gcmFuZEJldHdlZW4obWluQ29uc3QsIG1heENvbnN0KVxuICAgIH1cblxuICAgIC8vIGlmIHRoZSBkZW5vbWluYXRvciBpcyBuZWdhdGl2ZSBmb3IgZWFjaCB0ZXJtLCB0aGVuIG1ha2UgdGhlIG51bWVyYXRvciBuZWdhdGl2ZSBpbnN0ZWFkXG4gICAgaWYgKGMgPD0gMCAmJiBkIDw9IDApIHtcbiAgICAgIGMgPSAtY1xuICAgICAgZCA9IC1kXG4gICAgICBhID0gLWFcbiAgICAgIGIgPSAtYlxuICAgIH1cblxuICAgIHAgPSBhICogZTsgcSA9IGEgKiBmICsgYiAqIGU7IHIgPSBiICogZlxuICAgIHQgPSBjICogZTsgdSA9IGMgKiBmICsgZCAqIGU7IHYgPSBkICogZlxuXG4gICAgLy8gTm93IHB1dCB0aGUgcXVlc3Rpb24gYW5kIGFuc3dlciBpbiBhIG5pY2UgZm9ybWF0IGludG8gcXVlc3Rpb25MYVRlWCBhbmQgYW5zd2VyTGFUZVhcbiAgICBjb25zdCBxdWVzdGlvbiA9IGBcXFxcZnJhY3ske3F1YWRyYXRpY1N0cmluZyhwLCBxLCByKX19eyR7cXVhZHJhdGljU3RyaW5nKHQsIHUsIHYpfX1gXG4gICAgaWYgKHNldHRpbmdzLnVzZUNvbW1hbmRXb3JkKSB7XG4gICAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnXFxcXHRleHR7U2ltcGxpZnl9ICcgKyBxdWVzdGlvblxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSBxdWVzdGlvblxuICAgIH1cbiAgICB0aGlzLmFuc3dlckxhVGVYID1cbiAgICAgIChjID09PSAwICYmIGQgPT09IDEpID8gcXVhZHJhdGljU3RyaW5nKDAsIGEsIGIpXG4gICAgICAgIDogYFxcXFxmcmFjeyR7cXVhZHJhdGljU3RyaW5nKDAsIGEsIGIpfX17JHtxdWFkcmF0aWNTdHJpbmcoMCwgYywgZCl9fWBcblxuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPSAnICsgdGhpcy5hbnN3ZXJMYVRlWFxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdTaW1wbGlmeSdcbiAgfVxufVxuXG4vKiBVdGlsaXR5IGZ1bmN0aW9uc1xuICogQXQgc29tZSBwb2ludCwgSSdsbCBtb3ZlIHNvbWUgb2YgdGhlc2UgaW50byBhIGdlbmVyYWwgdXRpbGl0aWVzIG1vZHVsZVxuICogYnV0IHRoaXMgd2lsbCBkbyBmb3Igbm93XG4gKi9cblxuLy8gVE9ETyBJIGhhdmUgcXVhZHJhdGljU3RyaW5nIGhlcmUgYW5kIGFsc28gYSBQb2x5bm9taWFsIGNsYXNzLiBXaGF0IGlzIGJlaW5nIHJlcGxpY2F0ZWQ/wqdcbmZ1bmN0aW9uIHF1YWRyYXRpY1N0cmluZyAoYSwgYiwgYykge1xuICBpZiAoYSA9PT0gMCAmJiBiID09PSAwICYmIGMgPT09IDApIHJldHVybiAnMCdcblxuICB2YXIgeDJzdHJpbmcgPVxuICAgIGEgPT09IDAgPyAnJ1xuICAgICAgOiBhID09PSAxID8gJ3heMidcbiAgICAgICAgOiBhID09PSAtMSA/ICcteF4yJ1xuICAgICAgICAgIDogYSArICd4XjInXG5cbiAgdmFyIHhzaWduID1cbiAgICBiIDwgMCA/ICctJ1xuICAgICAgOiAoYSA9PT0gMCB8fCBiID09PSAwKSA/ICcnXG4gICAgICAgIDogJysnXG5cbiAgdmFyIHhzdHJpbmcgPVxuICAgIGIgPT09IDAgPyAnJ1xuICAgICAgOiAoYiA9PT0gMSB8fCBiID09PSAtMSkgPyAneCdcbiAgICAgICAgOiBNYXRoLmFicyhiKSArICd4J1xuXG4gIHZhciBjb25zdHNpZ24gPVxuICAgIGMgPCAwID8gJy0nXG4gICAgICA6ICgoYSA9PT0gMCAmJiBiID09PSAwKSB8fCBjID09PSAwKSA/ICcnXG4gICAgICAgIDogJysnXG5cbiAgdmFyIGNvbnN0c3RyaW5nID1cbiAgICBjID09PSAwID8gJycgOiBNYXRoLmFicyhjKVxuXG4gIHJldHVybiB4MnN0cmluZyArIHhzaWduICsgeHN0cmluZyArIGNvbnN0c2lnbiArIGNvbnN0c3RyaW5nXG59XG5cbmZ1bmN0aW9uIGNhblNpbXBsaWZ5IChhMSwgYjEsIGEyLCBiMikge1xuICAvLyBjYW4gKGExeCtiMSkvKGEyeCtiMikgYmUgc2ltcGxpZmllZD9cbiAgLy9cbiAgLy8gRmlyc3QsIHRha2Ugb3V0IGdjZCwgYW5kIHdyaXRlIGFzIGMxKGExeCtiMSkgZXRjXG5cbiAgdmFyIGMxID0gZ2NkKGExLCBiMSlcbiAgYTEgPSBhMSAvIGMxXG4gIGIxID0gYjEgLyBjMVxuXG4gIHZhciBjMiA9IGdjZChhMiwgYjIpXG4gIGEyID0gYTIgLyBjMlxuICBiMiA9IGIyIC8gYzJcblxuICB2YXIgcmVzdWx0ID0gZmFsc2VcblxuICBpZiAoZ2NkKGMxLCBjMikgPiAxIHx8IChhMSA9PT0gYTIgJiYgYjEgPT09IGIyKSkge1xuICAgIHJlc3VsdCA9IHRydWVcbiAgfVxuXG4gIHJldHVybiByZXN1bHRcbn1cbiIsImltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCB7IHJhbmRCZXR3ZWVuIH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJbnRlZ2VyQWRkUSBleHRlbmRzIFRleHRRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiA1LFxuICAgICAgbGFiZWw6ICdhJ1xuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyBUaGlzIGlzIGp1c3QgYSBkZW1vIHF1ZXN0aW9uIHR5cGUgZm9yIG5vdywgc28gbm90IHByb2Nlc3NpbmcgZGlmZmljdWx0eVxuICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbigxMCwgMTAwMClcbiAgICBjb25zdCBiID0gcmFuZEJldHdlZW4oMTAsIDEwMDApXG4gICAgY29uc3Qgc3VtID0gYSArIGJcblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9IGEgKyAnICsgJyArIGJcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJz0gJyArIHN1bVxuXG4gICAgdGhpcy5yZW5kZXIoKVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdFdmFsdWF0ZSdcbiAgfVxufVxuIiwiLyoqXG4gKiBDbGFzcyByZXByZXNlbnRpbmcgYSBwb2ludCwgYW5kIHN0YXRpYyB1dGl0bGl0eSBtZXRob2RzXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBvaW50IHtcbiAgY29uc3RydWN0b3IgKHgsIHkpIHtcbiAgICB0aGlzLnggPSB4XG4gICAgdGhpcy55ID0geVxuICB9XG5cbiAgcm90YXRlIChhbmdsZSkge1xuICAgIHZhciBuZXd4LCBuZXd5XG4gICAgbmV3eCA9IE1hdGguY29zKGFuZ2xlKSAqIHRoaXMueCAtIE1hdGguc2luKGFuZ2xlKSAqIHRoaXMueVxuICAgIG5ld3kgPSBNYXRoLnNpbihhbmdsZSkgKiB0aGlzLnggKyBNYXRoLmNvcyhhbmdsZSkgKiB0aGlzLnlcbiAgICB0aGlzLnggPSBuZXd4XG4gICAgdGhpcy55ID0gbmV3eVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzY2FsZSAoc2YpIHtcbiAgICB0aGlzLnggPSB0aGlzLnggKiBzZlxuICAgIHRoaXMueSA9IHRoaXMueSAqIHNmXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHRyYW5zbGF0ZSAoeCwgeSkge1xuICAgIHRoaXMueCArPSB4XG4gICAgdGhpcy55ICs9IHlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgY2xvbmUgKCkge1xuICAgIHJldHVybiBuZXcgUG9pbnQodGhpcy54LCB0aGlzLnkpXG4gIH1cblxuICBlcXVhbHMgKHRoYXQpIHtcbiAgICByZXR1cm4gKHRoaXMueCA9PT0gdGhhdC54ICYmIHRoaXMueSA9PT0gdGhhdC55KVxuICB9XG5cbiAgbW92ZVRvd2FyZCAodGhhdCwgZCkge1xuICAgIC8vIG1vdmVzIFtkXSBpbiB0aGUgZGlyZWN0aW9uIG9mIFt0aGF0OjpQb2ludF1cbiAgICBjb25zdCB1dmVjID0gUG9pbnQudW5pdFZlY3Rvcih0aGlzLCB0aGF0KVxuICAgIHRoaXMudHJhbnNsYXRlKHV2ZWMueCAqIGQsIHV2ZWMueSAqIGQpXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHN0YXRpYyBmcm9tUG9sYXIgKHIsIHRoZXRhKSB7XG4gICAgcmV0dXJuIG5ldyBQb2ludChcbiAgICAgIE1hdGguY29zKHRoZXRhKSAqIHIsXG4gICAgICBNYXRoLnNpbih0aGV0YSkgKiByXG4gICAgKVxuICB9XG5cbiAgc3RhdGljIGZyb21Qb2xhckRlZyAociwgdGhldGEpIHtcbiAgICB0aGV0YSA9IHRoZXRhICogTWF0aC5QSSAvIDE4MFxuICAgIHJldHVybiBQb2ludC5mcm9tUG9sYXIociwgdGhldGEpXG4gIH1cblxuICAvKipcbiAgICogRmluZCB0aGUgbWVhbiBvZiBcbiAgICogQHBhcmFtICB7Li4uUG9pbnR9IHBvaW50cyBUaGUgcG9pbnRzIHRvIGZpbmQgdGhlIG1lYW4gb2ZcbiAgICovXG4gIHN0YXRpYyBtZWFuICguLi5wb2ludHMpIHtcbiAgICBjb25zdCBzdW14ID0gcG9pbnRzLm1hcChwID0+IHAueCkucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSlcbiAgICBjb25zdCBzdW15ID0gcG9pbnRzLm1hcChwID0+IHAueSkucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSlcbiAgICBjb25zdCBuID0gcG9pbnRzLmxlbmd0aFxuXG4gICAgcmV0dXJuIG5ldyBQb2ludChzdW14IC8gbiwgc3VteSAvIG4pXG4gIH1cblxuICBzdGF0aWMgaW5DZW50ZXIgKEEsIEIsIEMpIHtcbiAgICAvLyBpbmNlbnRlciBvZiBhIHRyaWFuZ2xlIGdpdmVuIHZlcnRleCBwb2ludHMgQSwgQiBhbmQgQ1xuICAgIGNvbnN0IGEgPSBQb2ludC5kaXN0YW5jZShCLCBDKVxuICAgIGNvbnN0IGIgPSBQb2ludC5kaXN0YW5jZShBLCBDKVxuICAgIGNvbnN0IGMgPSBQb2ludC5kaXN0YW5jZShBLCBCKVxuXG4gICAgY29uc3QgcGVyaW1ldGVyID0gYSArIGIgKyBjXG4gICAgY29uc3Qgc3VteCA9IGEgKiBBLnggKyBiICogQi54ICsgYyAqIEMueFxuICAgIGNvbnN0IHN1bXkgPSBhICogQS55ICsgYiAqIEIueSArIGMgKiBDLnlcblxuICAgIHJldHVybiBuZXcgUG9pbnQoc3VteCAvIHBlcmltZXRlciwgc3VteSAvIHBlcmltZXRlcilcbiAgfVxuXG4gIHN0YXRpYyBtaW4gKHBvaW50cykge1xuICAgIGNvbnN0IG1pbnggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1pbih4LCBwLngpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtaW55ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5taW4oeSwgcC55KSwgSW5maW5pdHkpXG4gICAgcmV0dXJuIG5ldyBQb2ludChtaW54LCBtaW55KVxuICB9XG5cbiAgc3RhdGljIG1heCAocG9pbnRzKSB7XG4gICAgY29uc3QgbWF4eCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWF4KHgsIHAueCksIC1JbmZpbml0eSlcbiAgICBjb25zdCBtYXh5ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5tYXgoeSwgcC55KSwgLUluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQobWF4eCwgbWF4eSlcbiAgfVxuXG4gIHN0YXRpYyBjZW50ZXIgKHBvaW50cykge1xuICAgIGNvbnN0IG1pbnggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1pbih4LCBwLngpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtaW55ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5taW4oeSwgcC55KSwgSW5maW5pdHkpXG4gICAgY29uc3QgbWF4eCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWF4KHgsIHAueCksIC1JbmZpbml0eSlcbiAgICBjb25zdCBtYXh5ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5tYXgoeSwgcC55KSwgLUluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQoKG1heHggKyBtaW54KSAvIDIsIChtYXh5ICsgbWlueSkgLyAyKVxuICB9XG5cbiAgc3RhdGljIHVuaXRWZWN0b3IgKHAxLCBwMikge1xuICAgIC8vIHJldHVybnMgYSB1bml0IHZlY3RvciBpbiB0aGUgZGlyZWN0aW9uIG9mIHAxIHRvIHAyXG4gICAgLy8gaW4gdGhlIGZvcm0ge3g6Li4uLCB5Oi4uLn1cbiAgICBjb25zdCB2ZWN4ID0gcDIueCAtIHAxLnhcbiAgICBjb25zdCB2ZWN5ID0gcDIueSAtIHAxLnlcbiAgICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHZlY3gsIHZlY3kpXG4gICAgcmV0dXJuIHsgeDogdmVjeCAvIGxlbmd0aCwgeTogdmVjeSAvIGxlbmd0aCB9XG4gIH1cblxuICBzdGF0aWMgZGlzdGFuY2UgKHAxLCBwMikge1xuICAgIHJldHVybiBNYXRoLmh5cG90KHAxLnggLSBwMi54LCBwMS55IC0gcDIueSlcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGUgdGhlIGFuZ2xlIGluIHJhZGlhbnMgZnJvbSBob3Jpem9udGFsIHRvIHAyLCB3aXRoIGNlbnRyZSBwMS5cbiAgICogRS5nLiBhbmdsZUZyb20oICgwLDApLCAoMSwxKSApID0gcGkvMlxuICAgKiBBbmdsZSBpcyBmcm9tIDAgdG8gMnBpXG4gICAqIEBwYXJhbSB7UG9pbnR9IHAxIFRoZSBzdGFydCBwb2ludFxuICAgKiBAcGFyYW0ge1BvaW50fSBwMiBUaGUgZW5kIHBvaW50XG4gICAqIEByZXR1cm5zIHtudW1iZXJ9IFRoZSBhbmdsZSBpbiByYWRpYW5zIFxuICAgKi9cbiAgc3RhdGljIGFuZ2xlRnJvbShwMSxwMikge1xuICAgIGNvbnN0IGFuZ2xlID0gIE1hdGguYXRhbjIocDIueS1wMS55LHAyLngtcDEueClcbiAgICByZXR1cm4gYW5nbGUgPj0gMCA/IGFuZ2xlIDogMipNYXRoLlBJICsgYW5nbGVcbiAgfVxuXG4gIHN0YXRpYyByZXBlbCAocDEsIHAyLCB0cmlnZ2VyLCBkaXN0YW5jZSkge1xuICAgIC8vIFdoZW4gcDEgYW5kIHAyIGFyZSBsZXNzIHRoYW4gW3RyaWdnZXJdIGFwYXJ0LCB0aGV5IGFyZVxuICAgIC8vIG1vdmVkIHNvIHRoYXQgdGhleSBhcmUgW2Rpc3RhbmNlXSBhcGFydFxuICAgIGNvbnN0IGQgPSBNYXRoLmh5cG90KHAxLnggLSBwMi54LCBwMS55IC0gcDIueSlcbiAgICBpZiAoZCA+PSB0cmlnZ2VyKSByZXR1cm4gZmFsc2VcblxuICAgIGNvbnN0IHIgPSAoZGlzdGFuY2UgLSBkKSAvIDIgLy8gZGlzdGFuY2UgdGhleSBuZWVkIG1vdmluZ1xuICAgIHAxLm1vdmVUb3dhcmQocDIsIC1yKVxuICAgIHAyLm1vdmVUb3dhcmQocDEsIC1yKVxuICAgIHJldHVybiB0cnVlXG4gIH1cbn1cbiIsImltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbi9RdWVzdGlvbidcbmltcG9ydCB7IGNyZWF0ZUVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi9WaWV3T3B0aW9ucydcbmRlY2xhcmUgY29uc3Qga2F0ZXggOiB7cmVuZGVyIDogKHN0cmluZzogc3RyaW5nLCBlbGVtZW50OiBIVE1MRWxlbWVudCkgPT4gdm9pZH1cblxuLyogR3JhcGhpY1FEYXRhIGNhbiBhbGwgYmUgdmVyeSBkaWZmZXJlbnQsIHNvIGludGVyZmFjZSBpcyBlbXB0eVxuICogSGVyZSBmb3IgY29kZSBkb2N1bWVudGF0aW9uIHJhdGhlciB0aGFuIHR5cGUgc2FmZXR5ICh3aGljaCBpc24ndCBwcm92aWRlZClcblxuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LWludGVyZmFjZSAqL1xuZXhwb3J0IGludGVyZmFjZSBHcmFwaGljUURhdGEge1xufVxuLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktaW50ZXJmYWNlICovXG5cbi8qIE5vdCB3b3J0aCB0aGUgaGFzc2x5IHRyeWluZyB0byBnZXQgaW50ZXJmYWNlcyBmb3Igc3RhdGljIG1ldGhvZHNcbiAqXG4gKiBleHBvcnQgaW50ZXJmYWNlIEdyYXBoaWNRRGF0YUNvbnN0cnVjdG9yIHtcbiAqICAgbmV3KC4uLmFyZ3MgOiB1bmtub3duW10pOiBHcmFwaGljUURhdGFcbiAqICAgcmFuZG9tKG9wdGlvbnM6IHVua25vd24pIDogR3JhcGhpY1FEYXRhXG4gKiB9XG4qL1xuXG5leHBvcnQgaW50ZXJmYWNlIExhYmVsIHtcbiAgcG9zOiBQb2ludCxcbiAgdGV4dHE6IHN0cmluZyxcbiAgdGV4dGE6IHN0cmluZyxcbiAgc3R5bGVxOiBzdHJpbmcsXG4gIHN0eWxlYTogc3RyaW5nLFxuICB0ZXh0OiBzdHJpbmcsXG4gIHN0eWxlOiBzdHJpbmdcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEdyYXBoaWNRVmlldyB7XG4gIERPTTogSFRNTEVsZW1lbnRcbiAgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudFxuICB3aWR0aDogbnVtYmVyXG4gIGhlaWdodDogbnVtYmVyXG4gIGRhdGE6IEdyYXBoaWNRRGF0YVxuICBsYWJlbHM6IExhYmVsW11cblxuICBjb25zdHJ1Y3RvciAoIGRhdGEgOiBHcmFwaGljUURhdGEsIHZpZXdPcHRpb25zIDogVmlld09wdGlvbnMpIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IFZpZXdPcHRpb25zID0ge1xuICAgICAgd2lkdGg6IDI1MCxcbiAgICAgIGhlaWdodDogMjUwXG4gICAgfVxuXG4gICAgdmlld09wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgdmlld09wdGlvbnMpXG5cbiAgICB0aGlzLndpZHRoID0gdmlld09wdGlvbnMud2lkdGhcbiAgICB0aGlzLmhlaWdodCA9IHZpZXdPcHRpb25zLmhlaWdodCAvLyBvbmx5IHRoaW5ncyBJIG5lZWQgZnJvbSB0aGUgb3B0aW9ucywgZ2VuZXJhbGx5P1xuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICAvLyB0aGlzLnJvdGF0aW9uP1xuXG4gICAgdGhpcy5sYWJlbHMgPSBbXSAvLyBsYWJlbHMgb24gZGlhZ3JhbVxuXG4gICAgLy8gRE9NIGVsZW1lbnRzXG4gICAgdGhpcy5ET00gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tZGl2JylcbiAgICB0aGlzLmNhbnZhcyA9IGNyZWF0ZUVsZW0oJ2NhbnZhcycsICdxdWVzdGlvbi1jYW52YXMnLCB0aGlzLkRPTSlcbiAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMud2lkdGhcbiAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodFxuICB9XG5cbiAgZ2V0RE9NICgpIDogSFRNTEVsZW1lbnQge1xuICAgIHJldHVybiB0aGlzLkRPTVxuICB9XG5cbiAgYWJzdHJhY3QgcmVuZGVyICgpIDogdm9pZFxuXG4gIHJlbmRlckxhYmVscyAobnVkZ2U/IDogYm9vbGVhbikgOiB2b2lkIHtcbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLkRPTVxuXG4gICAgLy8gcmVtb3ZlIGFueSBleGlzdGluZyBsYWJlbHNcbiAgICBjb25zdCBvbGRMYWJlbHMgPSBjb250YWluZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnbGFiZWwnKVxuICAgIHdoaWxlIChvbGRMYWJlbHMubGVuZ3RoID4gMCkge1xuICAgICAgb2xkTGFiZWxzWzBdLnJlbW92ZSgpXG4gICAgfVxuXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICAgIGNvbnN0IGlubmVybGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgICAgbGFiZWwuY2xhc3NMaXN0LmFkZCgnbGFiZWwnKVxuICAgICAgbGFiZWwuY2xhc3NOYW1lICs9ICcgJyArIGwuc3R5bGUgLy8gdXNpbmcgY2xhc3NOYW1lIG92ZXIgY2xhc3NMaXN0IHNpbmNlIGwuc3R5bGUgaXMgc3BhY2UtZGVsaW1pdGVkIGxpc3Qgb2YgY2xhc3Nlc1xuICAgICAgbGFiZWwuc3R5bGUubGVmdCA9IGwucG9zLnggKyAncHgnXG4gICAgICBsYWJlbC5zdHlsZS50b3AgPSBsLnBvcy55ICsgJ3B4J1xuXG4gICAgICBrYXRleC5yZW5kZXIobC50ZXh0LCBpbm5lcmxhYmVsKVxuICAgICAgbGFiZWwuYXBwZW5kQ2hpbGQoaW5uZXJsYWJlbClcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChsYWJlbClcblxuICAgICAgLy8gcmVtb3ZlIHNwYWNlIGlmIHRoZSBpbm5lciBsYWJlbCBpcyB0b28gYmlnXG4gICAgICBpZiAoaW5uZXJsYWJlbC5vZmZzZXRXaWR0aCAvIGlubmVybGFiZWwub2Zmc2V0SGVpZ2h0ID4gMikge1xuICAgICAgICBjb25zb2xlLmxvZyhgcmVtb3ZlZCBzcGFjZSBpbiAke2wudGV4dH1gKVxuICAgICAgICBjb25zdCBuZXdsYWJlbHRleHQgPSBsLnRleHQucmVwbGFjZSgvXFwrLywgJ1xcXFwhK1xcXFwhJykucmVwbGFjZSgvLS8sICdcXFxcIS1cXFxcIScpXG4gICAgICAgIGthdGV4LnJlbmRlcihuZXdsYWJlbHRleHQsIGlubmVybGFiZWwpXG4gICAgICB9XG5cbiAgICAgIC8vIEkgZG9uJ3QgdW5kZXJzdGFuZCB0aGlzIGFkanVzdG1lbnQuIEkgdGhpbmsgaXQgbWlnaHQgYmUgbmVlZGVkIGluIGFyaXRobWFnb25zLCBidXQgaXQgbWFrZXNcbiAgICAgIC8vIG90aGVycyBnbyBmdW5ueS5cblxuICAgICAgaWYgKG51ZGdlKSB7XG4gICAgICAgIGNvbnN0IGx3aWR0aCA9IGxhYmVsLm9mZnNldFdpZHRoXG4gICAgICAgIGNvbnN0IGxoZWlnaHQgPSBsYWJlbC5vZmZzZXRIZWlnaHRcbiAgICAgICAgaWYgKGwucG9zLnggPCB0aGlzLmNhbnZhcy53aWR0aCAvIDIgLSA1ICYmIGwucG9zLnggKyBsd2lkdGggLyAyID4gdGhpcy5jYW52YXMud2lkdGggLyAyKSB7XG4gICAgICAgICAgbGFiZWwuc3R5bGUubGVmdCA9ICh0aGlzLmNhbnZhcy53aWR0aCAvIDIgLSBsd2lkdGggLSAzKSArICdweCdcbiAgICAgICAgICBjb25zb2xlLmxvZyhgbnVkZ2VkICcke2wudGV4dH0nYClcbiAgICAgICAgfVxuICAgICAgICBpZiAobC5wb3MueCA+IHRoaXMuY2FudmFzLndpZHRoIC8gMiArIDUgJiYgbC5wb3MueCAtIGx3aWR0aCAvIDIgPCB0aGlzLmNhbnZhcy53aWR0aCAvIDIpIHtcbiAgICAgICAgICBsYWJlbC5zdHlsZS5sZWZ0ID0gKHRoaXMuY2FudmFzLndpZHRoIC8gMiArIDMpICsgJ3B4J1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBudWRnZWQgJyR7bC50ZXh0fSdgKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0YVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVhXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIC8vIFBvaW50IHRyYW5mb3JtYXRpb25zIG9mIGFsbCBwb2ludHNcblxuICBnZXQgYWxscG9pbnRzICgpIDogUG9pbnRbXSB7XG4gICAgcmV0dXJuIFtdXG4gIH1cblxuICBzY2FsZSAoc2YgOiBudW1iZXIpIDogdm9pZCB7XG4gICAgdGhpcy5hbGxwb2ludHMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgcC5zY2FsZShzZilcbiAgICB9KVxuICB9XG5cbiAgcm90YXRlIChhbmdsZSA6IG51bWJlcikgOiBudW1iZXIge1xuICAgIHRoaXMuYWxscG9pbnRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHAucm90YXRlKGFuZ2xlKVxuICAgIH0pXG4gICAgcmV0dXJuIGFuZ2xlXG4gIH1cblxuICB0cmFuc2xhdGUgKHggOiBudW1iZXIsIHkgOiBudW1iZXIpIDogdm9pZCB7XG4gICAgdGhpcy5hbGxwb2ludHMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgcC50cmFuc2xhdGUoeCwgeSlcbiAgICB9KVxuICB9XG5cbiAgcmFuZG9tUm90YXRlICgpIDogbnVtYmVyIHtcbiAgICBjb25zdCBhbmdsZSA9IDIgKiBNYXRoLlBJICogTWF0aC5yYW5kb20oKVxuICAgIHRoaXMucm90YXRlKGFuZ2xlKVxuICAgIHJldHVybiBhbmdsZVxuICB9XG5cbiAgLyoqXG4gICAqIFNjYWxlcyBhbGwgdGhlIHBvaW50cyB0byB3aXRoaW4gYSBnaXZlbiB3aWR0aCBhbmQgaGVpZ2h0LCBjZW50ZXJpbmcgdGhlIHJlc3VsdC4gUmV0dXJucyB0aGUgc2NhbGUgZmFjdG9yXG4gICAqIEBwYXJhbSB3aWR0aCBUaGUgd2lkdGggb2YgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSB0byBzY2FsZSB0b1xuICAgKiBAcGFyYW0gaGVpZ2h0IFRoZSBoZWlnaHQgb2YgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSB0byBzY2FsZSB0b1xuICAgKiBAcGFyYW0gbWFyZ2luIE1hcmdpbiB0byBsZWF2ZSBvdXRzaWRlIHRoZSByZWN0YW5nbGVcbiAgICogQHJldHVybnMgXG4gICAqL1xuICBzY2FsZVRvRml0ICh3aWR0aCA6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIG1hcmdpbiA6IG51bWJlcikgOiBudW1iZXIge1xuICAgIGxldCB0b3BMZWZ0IDogUG9pbnQgPSBQb2ludC5taW4odGhpcy5hbGxwb2ludHMpXG4gICAgbGV0IGJvdHRvbVJpZ2h0IDogUG9pbnQgPSBQb2ludC5tYXgodGhpcy5hbGxwb2ludHMpXG4gICAgY29uc3QgdG90YWxXaWR0aCA6IG51bWJlciA9IGJvdHRvbVJpZ2h0LnggLSB0b3BMZWZ0LnhcbiAgICBjb25zdCB0b3RhbEhlaWdodCA6IG51bWJlciA9IGJvdHRvbVJpZ2h0LnkgLSB0b3BMZWZ0LnlcbiAgICBjb25zdCBzZiA9IE1hdGgubWluKCh3aWR0aCAtIG1hcmdpbikgLyB0b3RhbFdpZHRoLCAoaGVpZ2h0IC0gbWFyZ2luKSAvIHRvdGFsSGVpZ2h0KVxuICAgIHRoaXMuc2NhbGUoc2YpXG5cbiAgICAvLyBjZW50cmVcbiAgICB0b3BMZWZ0ID0gUG9pbnQubWluKHRoaXMuYWxscG9pbnRzKVxuICAgIGJvdHRvbVJpZ2h0ID0gUG9pbnQubWF4KHRoaXMuYWxscG9pbnRzKVxuICAgIGNvbnN0IGNlbnRlciA9IFBvaW50Lm1lYW4odG9wTGVmdCwgYm90dG9tUmlnaHQpXG4gICAgdGhpcy50cmFuc2xhdGUod2lkdGggLyAyIC0gY2VudGVyLngsIGhlaWdodCAvIDIgLSBjZW50ZXIueSkgLy8gY2VudHJlXG5cbiAgICByZXR1cm4gc2ZcbiAgfVxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgR3JhcGhpY1EgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIGRhdGE6IEdyYXBoaWNRRGF0YVxuICB2aWV3OiBHcmFwaGljUVZpZXdcblxuICBjb25zdHJ1Y3RvciAoKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgc3VwZXIoKSAvLyB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgICBkZWxldGUgKHRoaXMuRE9NKSAvLyBnb2luZyB0byBvdmVycmlkZSBnZXRET00gdXNpbmcgdGhlIHZpZXcncyBET01cblxuICAgIC8qIFRoZXNlIGFyZSBndWFyYW50ZWVkIHRvIGJlIG92ZXJyaWRkZW4sIHNvIG5vIHBvaW50IGluaXRpYWxpemluZyBoZXJlXG4gICAgICpcbiAgICAgKiAgdGhpcy5kYXRhID0gbmV3IEdyYXBoaWNRRGF0YShvcHRpb25zKVxuICAgICAqICB0aGlzLnZpZXcgPSBuZXcgR3JhcGhpY1FWaWV3KHRoaXMuZGF0YSwgb3B0aW9ucylcbiAgICAgKlxuICAgICAqL1xuICB9XG5cbiAgLyogTmVlZCB0byByZWZhY3RvciBzdWJjbGFzc2VzIHRvIGRvIHRoaXM6XG4gICAqIGNvbnN0cnVjdG9yIChkYXRhLCB2aWV3KSB7XG4gICAqICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICogICAgdGhpcy52aWV3ID0gdmlld1xuICAgKiB9XG4gICAqXG4gICAqIHN0YXRpYyByYW5kb20ob3B0aW9ucykge1xuICAgKiAgLy8gYW4gYXR0ZW1wdCBhdCBoYXZpbmcgYWJzdHJhY3Qgc3RhdGljIG1ldGhvZHMsIGFsYmVpdCBydW50aW1lIGVycm9yXG4gICAqICB0aHJvdyBuZXcgRXJyb3IoXCJgcmFuZG9tKClgIG11c3QgYmUgb3ZlcnJpZGRlbiBpbiBzdWJjbGFzcyBcIiArIHRoaXMubmFtZSlcbiAgICogfVxuICAgKlxuICAgKiB0eXBpY2FsIGltcGxlbWVudGF0aW9uOlxuICAgKiBzdGF0aWMgcmFuZG9tKG9wdGlvbnMpIHtcbiAgICogIGNvbnN0IGRhdGEgPSBuZXcgRGVyaXZlZFFEYXRhKG9wdGlvbnMpXG4gICAqICBjb25zdCB2aWV3ID0gbmV3IERlcml2ZWRRVmlldyhvcHRpb25zKVxuICAgKiAgcmV0dXJuIG5ldyBEZXJpdmVkUURhdGEoZGF0YSx2aWV3KVxuICAgKiB9XG4gICAqXG4gICAqL1xuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHsgcmV0dXJuIHRoaXMudmlldy5nZXRET00oKSB9XG5cbiAgcmVuZGVyICgpIDogdm9pZCB7IHRoaXMudmlldy5yZW5kZXIoKSB9XG5cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQge1xuICAgIHN1cGVyLnNob3dBbnN3ZXIoKVxuICAgIHRoaXMudmlldy5zaG93QW5zd2VyKClcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICBzdXBlci5oaWRlQW5zd2VyKClcbiAgICB0aGlzLnZpZXcuaGlkZUFuc3dlcigpXG4gIH1cbn1cbiIsImltcG9ydCAqIGFzIGNvbW1vbmpzSGVscGVycyBmcm9tICdcdTAwMDBjb21tb25qc0hlbHBlcnMuanMnXG5cbnZhciBmcmFjdGlvbiA9IGNvbW1vbmpzSGVscGVycy5jcmVhdGVDb21tb25qc01vZHVsZShmdW5jdGlvbiAobW9kdWxlLCBleHBvcnRzKSB7XG4vKipcbiAqIEBsaWNlbnNlIEZyYWN0aW9uLmpzIHY0LjAuOSAwOS8wOS8yMDE1XG4gKiBodHRwOi8vd3d3Lnhhcmcub3JnLzIwMTQvMDMvcmF0aW9uYWwtbnVtYmVycy1pbi1qYXZhc2NyaXB0L1xuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSwgUm9iZXJ0IEVpc2VsZSAocm9iZXJ0QHhhcmcub3JnKVxuICogRHVhbCBsaWNlbnNlZCB1bmRlciB0aGUgTUlUIG9yIEdQTCBWZXJzaW9uIDIgbGljZW5zZXMuXG4gKiovXG5cbiAgLyoqXG4gKlxuICogVGhpcyBjbGFzcyBvZmZlcnMgdGhlIHBvc3NpYmlsaXR5IHRvIGNhbGN1bGF0ZSBmcmFjdGlvbnMuXG4gKiBZb3UgY2FuIHBhc3MgYSBmcmFjdGlvbiBpbiBkaWZmZXJlbnQgZm9ybWF0cy4gRWl0aGVyIGFzIGFycmF5LCBhcyBkb3VibGUsIGFzIHN0cmluZyBvciBhcyBhbiBpbnRlZ2VyLlxuICpcbiAqIEFycmF5L09iamVjdCBmb3JtXG4gKiBbIDAgPT4gPG5vbWluYXRvcj4sIDEgPT4gPGRlbm9taW5hdG9yPiBdXG4gKiBbIG4gPT4gPG5vbWluYXRvcj4sIGQgPT4gPGRlbm9taW5hdG9yPiBdXG4gKlxuICogSW50ZWdlciBmb3JtXG4gKiAtIFNpbmdsZSBpbnRlZ2VyIHZhbHVlXG4gKlxuICogRG91YmxlIGZvcm1cbiAqIC0gU2luZ2xlIGRvdWJsZSB2YWx1ZVxuICpcbiAqIFN0cmluZyBmb3JtXG4gKiAxMjMuNDU2IC0gYSBzaW1wbGUgZG91YmxlXG4gKiAxMjMvNDU2IC0gYSBzdHJpbmcgZnJhY3Rpb25cbiAqIDEyMy4nNDU2JyAtIGEgZG91YmxlIHdpdGggcmVwZWF0aW5nIGRlY2ltYWwgcGxhY2VzXG4gKiAxMjMuKDQ1NikgLSBzeW5vbnltXG4gKiAxMjMuNDUnNicgLSBhIGRvdWJsZSB3aXRoIHJlcGVhdGluZyBsYXN0IHBsYWNlXG4gKiAxMjMuNDUoNikgLSBzeW5vbnltXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiB2YXIgZiA9IG5ldyBGcmFjdGlvbihcIjkuNCczMSdcIik7XG4gKiBmLm11bChbLTQsIDNdKS5kaXYoNC45KTtcbiAqXG4gKi9cblxuICAoZnVuY3Rpb24gKHJvb3QpIHtcbiAgICAndXNlIHN0cmljdCdcblxuICAgIC8vIE1heGltdW0gc2VhcmNoIGRlcHRoIGZvciBjeWNsaWMgcmF0aW9uYWwgbnVtYmVycy4gMjAwMCBzaG91bGQgYmUgbW9yZSB0aGFuIGVub3VnaC5cbiAgICAvLyBFeGFtcGxlOiAxLzcgPSAwLigxNDI4NTcpIGhhcyA2IHJlcGVhdGluZyBkZWNpbWFsIHBsYWNlcy5cbiAgICAvLyBJZiBNQVhfQ1lDTEVfTEVOIGdldHMgcmVkdWNlZCwgbG9uZyBjeWNsZXMgd2lsbCBub3QgYmUgZGV0ZWN0ZWQgYW5kIHRvU3RyaW5nKCkgb25seSBnZXRzIHRoZSBmaXJzdCAxMCBkaWdpdHNcbiAgICB2YXIgTUFYX0NZQ0xFX0xFTiA9IDIwMDBcblxuICAgIC8vIFBhcnNlZCBkYXRhIHRvIGF2b2lkIGNhbGxpbmcgXCJuZXdcIiBhbGwgdGhlIHRpbWVcbiAgICB2YXIgUCA9IHtcbiAgICAgIHM6IDEsXG4gICAgICBuOiAwLFxuICAgICAgZDogMVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUVycm9yIChuYW1lKSB7XG4gICAgICBmdW5jdGlvbiBlcnJvckNvbnN0cnVjdG9yICgpIHtcbiAgICAgICAgdmFyIHRlbXAgPSBFcnJvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgICAgIHRlbXAubmFtZSA9IHRoaXMubmFtZSA9IG5hbWVcbiAgICAgICAgdGhpcy5zdGFjayA9IHRlbXAuc3RhY2tcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gdGVtcC5tZXNzYWdlXG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAqIEVycm9yIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICAgIGZ1bmN0aW9uIEludGVybWVkaWF0ZUluaGVyaXRvciAoKSB7fVxuICAgICAgSW50ZXJtZWRpYXRlSW5oZXJpdG9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZVxuICAgICAgZXJyb3JDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBuZXcgSW50ZXJtZWRpYXRlSW5oZXJpdG9yKClcblxuICAgICAgcmV0dXJuIGVycm9yQ29uc3RydWN0b3JcbiAgICB9XG5cbiAgICB2YXIgRGl2aXNpb25CeVplcm8gPSBGcmFjdGlvbi5EaXZpc2lvbkJ5WmVybyA9IGNyZWF0ZUVycm9yKCdEaXZpc2lvbkJ5WmVybycpXG4gICAgdmFyIEludmFsaWRQYXJhbWV0ZXIgPSBGcmFjdGlvbi5JbnZhbGlkUGFyYW1ldGVyID0gY3JlYXRlRXJyb3IoJ0ludmFsaWRQYXJhbWV0ZXInKVxuXG4gICAgZnVuY3Rpb24gYXNzaWduIChuLCBzKSB7XG4gICAgICBpZiAoaXNOYU4obiA9IHBhcnNlSW50KG4sIDEwKSkpIHtcbiAgICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKVxuICAgICAgfVxuICAgICAgcmV0dXJuIG4gKiBzXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdGhyb3dJbnZhbGlkUGFyYW0gKCkge1xuICAgICAgdGhyb3cgbmV3IEludmFsaWRQYXJhbWV0ZXIoKVxuICAgIH1cblxuICAgIHZhciBwYXJzZSA9IGZ1bmN0aW9uIChwMSwgcDIpIHtcbiAgICAgIHZhciBuID0gMDsgdmFyIGQgPSAxOyB2YXIgcyA9IDFcbiAgICAgIHZhciB2ID0gMDsgdmFyIHcgPSAwOyB2YXIgeCA9IDA7IHZhciB5ID0gMTsgdmFyIHogPSAxXG5cbiAgICAgIHZhciBBID0gMDsgdmFyIEIgPSAxXG4gICAgICB2YXIgQyA9IDE7IHZhciBEID0gMVxuXG4gICAgICB2YXIgTiA9IDEwMDAwMDAwXG4gICAgICB2YXIgTVxuXG4gICAgICBpZiAocDEgPT09IHVuZGVmaW5lZCB8fCBwMSA9PT0gbnVsbCkge1xuICAgICAgLyogdm9pZCAqL1xuICAgICAgfSBlbHNlIGlmIChwMiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG4gPSBwMVxuICAgICAgICBkID0gcDJcbiAgICAgICAgcyA9IG4gKiBkXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzd2l0Y2ggKHR5cGVvZiBwMSkge1xuICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAge1xuICAgICAgICAgICAgaWYgKCdkJyBpbiBwMSAmJiAnbicgaW4gcDEpIHtcbiAgICAgICAgICAgICAgbiA9IHAxLm5cbiAgICAgICAgICAgICAgZCA9IHAxLmRcbiAgICAgICAgICAgICAgaWYgKCdzJyBpbiBwMSkgeyBuICo9IHAxLnMgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICgwIGluIHAxKSB7XG4gICAgICAgICAgICAgIG4gPSBwMVswXVxuICAgICAgICAgICAgICBpZiAoMSBpbiBwMSkgeyBkID0gcDFbMV0gfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcyA9IG4gKiBkXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlmIChwMSA8IDApIHtcbiAgICAgICAgICAgICAgcyA9IHAxXG4gICAgICAgICAgICAgIHAxID0gLXAxXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwMSAlIDEgPT09IDApIHtcbiAgICAgICAgICAgICAgbiA9IHAxXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHAxID4gMCkgeyAvLyBjaGVjayBmb3IgIT0gMCwgc2NhbGUgd291bGQgYmVjb21lIE5hTiAobG9nKDApKSwgd2hpY2ggY29udmVyZ2VzIHJlYWxseSBzbG93XG4gICAgICAgICAgICAgIGlmIChwMSA+PSAxKSB7XG4gICAgICAgICAgICAgICAgeiA9IE1hdGgucG93KDEwLCBNYXRoLmZsb29yKDEgKyBNYXRoLmxvZyhwMSkgLyBNYXRoLkxOMTApKVxuICAgICAgICAgICAgICAgIHAxIC89IHpcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIFVzaW5nIEZhcmV5IFNlcXVlbmNlc1xuICAgICAgICAgICAgICAvLyBodHRwOi8vd3d3LmpvaG5kY29vay5jb20vYmxvZy8yMDEwLzEwLzIwL2Jlc3QtcmF0aW9uYWwtYXBwcm94aW1hdGlvbi9cblxuICAgICAgICAgICAgICB3aGlsZSAoQiA8PSBOICYmIEQgPD0gTikge1xuICAgICAgICAgICAgICAgIE0gPSAoQSArIEMpIC8gKEIgKyBEKVxuXG4gICAgICAgICAgICAgICAgaWYgKHAxID09PSBNKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoQiArIEQgPD0gTikge1xuICAgICAgICAgICAgICAgICAgICBuID0gQSArIENcbiAgICAgICAgICAgICAgICAgICAgZCA9IEIgKyBEXG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKEQgPiBCKSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBDXG4gICAgICAgICAgICAgICAgICAgIGQgPSBEXG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBuID0gQVxuICAgICAgICAgICAgICAgICAgICBkID0gQlxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgaWYgKHAxID4gTSkge1xuICAgICAgICAgICAgICAgICAgICBBICs9IENcbiAgICAgICAgICAgICAgICAgICAgQiArPSBEXG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBDICs9IEFcbiAgICAgICAgICAgICAgICAgICAgRCArPSBCXG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGlmIChCID4gTikge1xuICAgICAgICAgICAgICAgICAgICBuID0gQ1xuICAgICAgICAgICAgICAgICAgICBkID0gRFxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IEFcbiAgICAgICAgICAgICAgICAgICAgZCA9IEJcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbiAqPSB6XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzTmFOKHAxKSB8fCBpc05hTihwMikpIHtcbiAgICAgICAgICAgICAgZCA9IG4gPSBOYU5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAge1xuICAgICAgICAgICAgQiA9IHAxLm1hdGNoKC9cXGQrfC4vZylcblxuICAgICAgICAgICAgaWYgKEIgPT09IG51bGwpIHsgdGhyb3dJbnZhbGlkUGFyYW0oKSB9XG5cbiAgICAgICAgICAgIGlmIChCW0FdID09PSAnLScpIHsgLy8gQ2hlY2sgZm9yIG1pbnVzIHNpZ24gYXQgdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgICBzID0gLTFcbiAgICAgICAgICAgICAgQSsrXG4gICAgICAgICAgICB9IGVsc2UgaWYgKEJbQV0gPT09ICcrJykgeyAvLyBDaGVjayBmb3IgcGx1cyBzaWduIGF0IHRoZSBiZWdpbm5pbmdcbiAgICAgICAgICAgICAgQSsrXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChCLmxlbmd0aCA9PT0gQSArIDEpIHsgLy8gQ2hlY2sgaWYgaXQncyBqdXN0IGEgc2ltcGxlIG51bWJlciBcIjEyMzRcIlxuICAgICAgICAgICAgICB3ID0gYXNzaWduKEJbQSsrXSwgcylcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQltBICsgMV0gPT09ICcuJyB8fCBCW0FdID09PSAnLicpIHsgLy8gQ2hlY2sgaWYgaXQncyBhIGRlY2ltYWwgbnVtYmVyXG4gICAgICAgICAgICAgIGlmIChCW0FdICE9PSAnLicpIHsgLy8gSGFuZGxlIDAuNSBhbmQgLjVcbiAgICAgICAgICAgICAgICB2ID0gYXNzaWduKEJbQSsrXSwgcylcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBBKytcblxuICAgICAgICAgICAgICAvLyBDaGVjayBmb3IgZGVjaW1hbCBwbGFjZXNcbiAgICAgICAgICAgICAgaWYgKEEgKyAxID09PSBCLmxlbmd0aCB8fCBCW0EgKyAxXSA9PT0gJygnICYmIEJbQSArIDNdID09PSAnKScgfHwgQltBICsgMV0gPT09IFwiJ1wiICYmIEJbQSArIDNdID09PSBcIidcIikge1xuICAgICAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBXSwgcylcbiAgICAgICAgICAgICAgICB5ID0gTWF0aC5wb3coMTAsIEJbQV0ubGVuZ3RoKVxuICAgICAgICAgICAgICAgIEErK1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHJlcGVhdGluZyBwbGFjZXNcbiAgICAgICAgICAgICAgaWYgKEJbQV0gPT09ICcoJyAmJiBCW0EgKyAyXSA9PT0gJyknIHx8IEJbQV0gPT09IFwiJ1wiICYmIEJbQSArIDJdID09PSBcIidcIikge1xuICAgICAgICAgICAgICAgIHggPSBhc3NpZ24oQltBICsgMV0sIHMpXG4gICAgICAgICAgICAgICAgeiA9IE1hdGgucG93KDEwLCBCW0EgKyAxXS5sZW5ndGgpIC0gMVxuICAgICAgICAgICAgICAgIEEgKz0gM1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKEJbQSArIDFdID09PSAnLycgfHwgQltBICsgMV0gPT09ICc6JykgeyAvLyBDaGVjayBmb3IgYSBzaW1wbGUgZnJhY3Rpb24gXCIxMjMvNDU2XCIgb3IgXCIxMjM6NDU2XCJcbiAgICAgICAgICAgICAgdyA9IGFzc2lnbihCW0FdLCBzKVxuICAgICAgICAgICAgICB5ID0gYXNzaWduKEJbQSArIDJdLCAxKVxuICAgICAgICAgICAgICBBICs9IDNcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQltBICsgM10gPT09ICcvJyAmJiBCW0EgKyAxXSA9PT0gJyAnKSB7IC8vIENoZWNrIGZvciBhIGNvbXBsZXggZnJhY3Rpb24gXCIxMjMgMS8yXCJcbiAgICAgICAgICAgICAgdiA9IGFzc2lnbihCW0FdLCBzKVxuICAgICAgICAgICAgICB3ID0gYXNzaWduKEJbQSArIDJdLCBzKVxuICAgICAgICAgICAgICB5ID0gYXNzaWduKEJbQSArIDRdLCAxKVxuICAgICAgICAgICAgICBBICs9IDVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKEIubGVuZ3RoIDw9IEEpIHsgLy8gQ2hlY2sgZm9yIG1vcmUgdG9rZW5zIG9uIHRoZSBzdGFja1xuICAgICAgICAgICAgICBkID0geSAqIHpcbiAgICAgICAgICAgICAgcyA9IC8qIHZvaWQgKi9cbiAgICAgICAgICAgICAgICAgICAgbiA9IHggKyBkICogdiArIHogKiB3XG4gICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAvKiBGYWxsIHRocm91Z2ggb24gZXJyb3IgKi9cbiAgICAgICAgICB9XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93SW52YWxpZFBhcmFtKClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRGl2aXNpb25CeVplcm8oKVxuICAgICAgfVxuXG4gICAgICBQLnMgPSBzIDwgMCA/IC0xIDogMVxuICAgICAgUC5uID0gTWF0aC5hYnMobilcbiAgICAgIFAuZCA9IE1hdGguYWJzKGQpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW9kcG93IChiLCBlLCBtKSB7XG4gICAgICB2YXIgciA9IDFcbiAgICAgIGZvciAoOyBlID4gMDsgYiA9IChiICogYikgJSBtLCBlID4+PSAxKSB7XG4gICAgICAgIGlmIChlICYgMSkge1xuICAgICAgICAgIHIgPSAociAqIGIpICUgbVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gclxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGN5Y2xlTGVuIChuLCBkKSB7XG4gICAgICBmb3IgKDsgZCAlIDIgPT09IDA7XG4gICAgICAgIGQgLz0gMikge1xuICAgICAgfVxuXG4gICAgICBmb3IgKDsgZCAlIDUgPT09IDA7XG4gICAgICAgIGQgLz0gNSkge1xuICAgICAgfVxuXG4gICAgICBpZiAoZCA9PT0gMSkgLy8gQ2F0Y2ggbm9uLWN5Y2xpYyBudW1iZXJzXG4gICAgICB7IHJldHVybiAwIH1cblxuICAgICAgLy8gSWYgd2Ugd291bGQgbGlrZSB0byBjb21wdXRlIHJlYWxseSBsYXJnZSBudW1iZXJzIHF1aWNrZXIsIHdlIGNvdWxkIG1ha2UgdXNlIG9mIEZlcm1hdCdzIGxpdHRsZSB0aGVvcmVtOlxuICAgICAgLy8gMTBeKGQtMSkgJSBkID09IDFcbiAgICAgIC8vIEhvd2V2ZXIsIHdlIGRvbid0IG5lZWQgc3VjaCBsYXJnZSBudW1iZXJzIGFuZCBNQVhfQ1lDTEVfTEVOIHNob3VsZCBiZSB0aGUgY2Fwc3RvbmUsXG4gICAgICAvLyBhcyB3ZSB3YW50IHRvIHRyYW5zbGF0ZSB0aGUgbnVtYmVycyB0byBzdHJpbmdzLlxuXG4gICAgICB2YXIgcmVtID0gMTAgJSBkXG4gICAgICB2YXIgdCA9IDFcblxuICAgICAgZm9yICg7IHJlbSAhPT0gMTsgdCsrKSB7XG4gICAgICAgIHJlbSA9IHJlbSAqIDEwICUgZFxuXG4gICAgICAgIGlmICh0ID4gTUFYX0NZQ0xFX0xFTikgeyByZXR1cm4gMCB9IC8vIFJldHVybmluZyAwIGhlcmUgbWVhbnMgdGhhdCB3ZSBkb24ndCBwcmludCBpdCBhcyBhIGN5Y2xpYyBudW1iZXIuIEl0J3MgbGlrZWx5IHRoYXQgdGhlIGFuc3dlciBpcyBgZC0xYFxuICAgICAgfVxuICAgICAgcmV0dXJuIHRcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjeWNsZVN0YXJ0IChuLCBkLCBsZW4pIHtcbiAgICAgIHZhciByZW0xID0gMVxuICAgICAgdmFyIHJlbTIgPSBtb2Rwb3coMTAsIGxlbiwgZClcblxuICAgICAgZm9yICh2YXIgdCA9IDA7IHQgPCAzMDA7IHQrKykgeyAvLyBzIDwgfmxvZzEwKE51bWJlci5NQVhfVkFMVUUpXG4gICAgICAvLyBTb2x2ZSAxMF5zID09IDEwXihzK3QpIChtb2QgZClcblxuICAgICAgICBpZiAocmVtMSA9PT0gcmVtMikgeyByZXR1cm4gdCB9XG5cbiAgICAgICAgcmVtMSA9IHJlbTEgKiAxMCAlIGRcbiAgICAgICAgcmVtMiA9IHJlbTIgKiAxMCAlIGRcbiAgICAgIH1cbiAgICAgIHJldHVybiAwXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2NkIChhLCBiKSB7XG4gICAgICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICAgICAgaWYgKCFiKSB7IHJldHVybiBhIH1cblxuICAgICAgd2hpbGUgKDEpIHtcbiAgICAgICAgYSAlPSBiXG4gICAgICAgIGlmICghYSkgeyByZXR1cm4gYiB9XG4gICAgICAgIGIgJT0gYVxuICAgICAgICBpZiAoIWIpIHsgcmV0dXJuIGEgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICogTW9kdWxlIGNvbnN0cnVjdG9yXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge251bWJlcnxGcmFjdGlvbj19IGFcbiAgICogQHBhcmFtIHtudW1iZXI9fSBiXG4gICAqL1xuICAgIGZ1bmN0aW9uIEZyYWN0aW9uIChhLCBiKSB7XG4gICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRnJhY3Rpb24pKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oYSwgYilcbiAgICAgIH1cblxuICAgICAgcGFyc2UoYSwgYilcblxuICAgICAgaWYgKEZyYWN0aW9uLlJFRFVDRSkge1xuICAgICAgICBhID0gZ2NkKFAuZCwgUC5uKSAvLyBBYnVzZSBhXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhID0gMVxuICAgICAgfVxuXG4gICAgICB0aGlzLnMgPSBQLnNcbiAgICAgIHRoaXMubiA9IFAubiAvIGFcbiAgICAgIHRoaXMuZCA9IFAuZCAvIGFcbiAgICB9XG5cbiAgICAvKipcbiAgICogQm9vbGVhbiBnbG9iYWwgdmFyaWFibGUgdG8gYmUgYWJsZSB0byBkaXNhYmxlIGF1dG9tYXRpYyByZWR1Y3Rpb24gb2YgdGhlIGZyYWN0aW9uXG4gICAqXG4gICAqL1xuICAgIEZyYWN0aW9uLlJFRFVDRSA9IDFcblxuICAgIEZyYWN0aW9uLnByb3RvdHlwZSA9IHtcblxuICAgICAgczogMSxcbiAgICAgIG46IDAsXG4gICAgICBkOiAxLFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBhYnNvbHV0ZSB2YWx1ZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigtNCkuYWJzKCkgPT4gNFxuICAgICAqKi9cbiAgICAgIGFiczogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMubiwgdGhpcy5kKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogSW52ZXJ0cyB0aGUgc2lnbiBvZiB0aGUgY3VycmVudCBmcmFjdGlvblxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigtNCkubmVnKCkgPT4gNFxuICAgICAqKi9cbiAgICAgIG5lZzogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKC10aGlzLnMgKiB0aGlzLm4sIHRoaXMuZClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIEFkZHMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oe246IDIsIGQ6IDN9KS5hZGQoXCIxNC45XCIpID0+IDQ2NyAvIDMwXG4gICAgICoqL1xuICAgICAgYWRkOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIHRoaXMubiAqIFAuZCArIFAucyAqIHRoaXMuZCAqIFAubixcbiAgICAgICAgICB0aGlzLmQgKiBQLmRcbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogU3VidHJhY3RzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKHtuOiAyLCBkOiAzfSkuYWRkKFwiMTQuOVwiKSA9PiAtNDI3IC8gMzBcbiAgICAgKiovXG4gICAgICBzdWI6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgdGhpcy5zICogdGhpcy5uICogUC5kIC0gUC5zICogdGhpcy5kICogUC5uLFxuICAgICAgICAgIHRoaXMuZCAqIFAuZFxuICAgICAgICApXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBNdWx0aXBsaWVzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiLTE3LigzNDUpXCIpLm11bCgzKSA9PiA1Nzc2IC8gMTExXG4gICAgICoqL1xuICAgICAgbXVsOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIFAucyAqIHRoaXMubiAqIFAubixcbiAgICAgICAgICB0aGlzLmQgKiBQLmRcbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogRGl2aWRlcyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIi0xNy4oMzQ1KVwiKS5pbnZlcnNlKCkuZGl2KDMpXG4gICAgICoqL1xuICAgICAgZGl2OiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIFAucyAqIHRoaXMubiAqIFAuZCxcbiAgICAgICAgICB0aGlzLmQgKiBQLm5cbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2xvbmVzIHRoZSBhY3R1YWwgb2JqZWN0XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiLTE3LigzNDUpXCIpLmNsb25lKClcbiAgICAgKiovXG4gICAgICBjbG9uZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBtb2R1bG8gb2YgdHdvIHJhdGlvbmFsIG51bWJlcnMgLSBhIG1vcmUgcHJlY2lzZSBmbW9kXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLm1vZChbNywgOF0pID0+ICgxMy8zKSAlICg3LzgpID0gKDUvNilcbiAgICAgKiovXG4gICAgICBtb2Q6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTilcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMucyAqIHRoaXMubiAlIHRoaXMuZCwgMSlcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIGlmIChQLm4gPT09IDAgJiYgdGhpcy5kID09PSAwKSB7XG4gICAgICAgICAgRnJhY3Rpb24oMCwgMCkgLy8gVGhyb3cgRGl2aXNpb25CeVplcm9cbiAgICAgICAgfVxuXG4gICAgICAgIC8qXG4gICAgICAgKiBGaXJzdCBzaWxseSBhdHRlbXB0LCBraW5kYSBzbG93XG4gICAgICAgKlxuICAgICAgIHJldHVybiB0aGF0W1wic3ViXCJdKHtcbiAgICAgICBcIm5cIjogbnVtW1wiblwiXSAqIE1hdGguZmxvb3IoKHRoaXMubiAvIHRoaXMuZCkgLyAobnVtLm4gLyBudW0uZCkpLFxuICAgICAgIFwiZFwiOiBudW1bXCJkXCJdLFxuICAgICAgIFwic1wiOiB0aGlzW1wic1wiXVxuICAgICAgIH0pOyAqL1xuXG4gICAgICAgIC8qXG4gICAgICAgKiBOZXcgYXR0ZW1wdDogYTEgLyBiMSA9IGEyIC8gYjIgKiBxICsgclxuICAgICAgICogPT4gYjIgKiBhMSA9IGEyICogYjEgKiBxICsgYjEgKiBiMiAqIHJcbiAgICAgICAqID0+IChiMiAqIGExICUgYTIgKiBiMSkgLyAoYjEgKiBiMilcbiAgICAgICAqL1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIChQLmQgKiB0aGlzLm4pICUgKFAubiAqIHRoaXMuZCksXG4gICAgICAgICAgUC5kICogdGhpcy5kXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZyYWN0aW9uYWwgZ2NkIG9mIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDUsOCkuZ2NkKDMsNykgPT4gMS81NlxuICAgICAqL1xuICAgICAgZ2NkOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuXG4gICAgICAgIC8vIGdjZChhIC8gYiwgYyAvIGQpID0gZ2NkKGEsIGMpIC8gbGNtKGIsIGQpXG5cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihnY2QoUC5uLCB0aGlzLm4pICogZ2NkKFAuZCwgdGhpcy5kKSwgUC5kICogdGhpcy5kKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZnJhY3Rpb25hbCBsY20gb2YgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oNSw4KS5sY20oMyw3KSA9PiAxNVxuICAgICAqL1xuICAgICAgbGNtOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuXG4gICAgICAgIC8vIGxjbShhIC8gYiwgYyAvIGQpID0gbGNtKGEsIGMpIC8gZ2NkKGIsIGQpXG5cbiAgICAgICAgaWYgKFAubiA9PT0gMCAmJiB0aGlzLm4gPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFAubiAqIHRoaXMubiwgZ2NkKFAubiwgdGhpcy5uKSAqIGdjZChQLmQsIHRoaXMuZCkpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBjZWlsIG9mIGEgcmF0aW9uYWwgbnVtYmVyXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLmNlaWwoKSA9PiAoNSAvIDEpXG4gICAgICoqL1xuICAgICAgY2VpbDogZnVuY3Rpb24gKHBsYWNlcykge1xuICAgICAgICBwbGFjZXMgPSBNYXRoLnBvdygxMCwgcGxhY2VzIHx8IDApXG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5jZWlsKHBsYWNlcyAqIHRoaXMucyAqIHRoaXMubiAvIHRoaXMuZCksIHBsYWNlcylcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZsb29yIG9mIGEgcmF0aW9uYWwgbnVtYmVyXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLmZsb29yKCkgPT4gKDQgLyAxKVxuICAgICAqKi9cbiAgICAgIGZsb29yOiBmdW5jdGlvbiAocGxhY2VzKSB7XG4gICAgICAgIHBsYWNlcyA9IE1hdGgucG93KDEwLCBwbGFjZXMgfHwgMClcblxuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLmZsb29yKHBsYWNlcyAqIHRoaXMucyAqIHRoaXMubiAvIHRoaXMuZCksIHBsYWNlcylcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJvdW5kcyBhIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykucm91bmQoKSA9PiAoNCAvIDEpXG4gICAgICoqL1xuICAgICAgcm91bmQ6IGZ1bmN0aW9uIChwbGFjZXMpIHtcbiAgICAgICAgcGxhY2VzID0gTWF0aC5wb3coMTAsIHBsYWNlcyB8fCAwKVxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGgucm91bmQocGxhY2VzICogdGhpcy5zICogdGhpcy5uIC8gdGhpcy5kKSwgcGxhY2VzKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogR2V0cyB0aGUgaW52ZXJzZSBvZiB0aGUgZnJhY3Rpb24sIG1lYW5zIG51bWVyYXRvciBhbmQgZGVudW1lcmF0b3IgYXJlIGV4Y2hhbmdlZFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihbLTMsIDRdKS5pbnZlcnNlKCkgPT4gLTQgLyAzXG4gICAgICoqL1xuICAgICAgaW52ZXJzZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMucyAqIHRoaXMuZCwgdGhpcy5uKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZnJhY3Rpb24gdG8gc29tZSBpbnRlZ2VyIGV4cG9uZW50XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKC0xLDIpLnBvdygtMykgPT4gLThcbiAgICAgKi9cbiAgICAgIHBvdzogZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgaWYgKG0gPCAwKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLnBvdyh0aGlzLnMgKiB0aGlzLmQsIC1tKSwgTWF0aC5wb3codGhpcy5uLCAtbSkpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLnBvdyh0aGlzLnMgKiB0aGlzLm4sIG0pLCBNYXRoLnBvdyh0aGlzLmQsIG0pKVxuICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0d28gcmF0aW9uYWwgbnVtYmVycyBhcmUgdGhlIHNhbWVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oMTkuNikuZXF1YWxzKFs5OCwgNV0pO1xuICAgICAqKi9cbiAgICAgIGVxdWFsczogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIHRoaXMucyAqIHRoaXMubiAqIFAuZCA9PT0gUC5zICogUC5uICogdGhpcy5kIC8vIFNhbWUgYXMgY29tcGFyZSgpID09PSAwXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0d28gcmF0aW9uYWwgbnVtYmVycyBhcmUgdGhlIHNhbWVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oMTkuNikuZXF1YWxzKFs5OCwgNV0pO1xuICAgICAqKi9cbiAgICAgIGNvbXBhcmU6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHZhciB0ID0gKHRoaXMucyAqIHRoaXMubiAqIFAuZCAtIFAucyAqIFAubiAqIHRoaXMuZClcbiAgICAgICAgcmV0dXJuICh0ID4gMCkgLSAodCA8IDApXG4gICAgICB9LFxuXG4gICAgICBzaW1wbGlmeTogZnVuY3Rpb24gKGVwcykge1xuICAgICAgLy8gRmlyc3QgbmFpdmUgaW1wbGVtZW50YXRpb24sIG5lZWRzIGltcHJvdmVtZW50XG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiB0aGlzXG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY29udCA9IHRoaXMuYWJzKCkudG9Db250aW51ZWQoKVxuXG4gICAgICAgIGVwcyA9IGVwcyB8fCAwLjAwMVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlYyAoYSkge1xuICAgICAgICAgIGlmIChhLmxlbmd0aCA9PT0gMSkgeyByZXR1cm4gbmV3IEZyYWN0aW9uKGFbMF0pIH1cbiAgICAgICAgICByZXR1cm4gcmVjKGEuc2xpY2UoMSkpLmludmVyc2UoKS5hZGQoYVswXSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29udC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHZhciB0bXAgPSByZWMoY29udC5zbGljZSgwLCBpICsgMSkpXG4gICAgICAgICAgaWYgKHRtcC5zdWIodGhpcy5hYnMoKSkuYWJzKCkudmFsdWVPZigpIDwgZXBzKSB7XG4gICAgICAgICAgICByZXR1cm4gdG1wLm11bCh0aGlzLnMpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0d28gcmF0aW9uYWwgbnVtYmVycyBhcmUgZGl2aXNpYmxlXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDE5LjYpLmRpdmlzaWJsZSgxLjUpO1xuICAgICAqL1xuICAgICAgZGl2aXNpYmxlOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gISghKFAubiAqIHRoaXMuZCkgfHwgKCh0aGlzLm4gKiBQLmQpICUgKFAubiAqIHRoaXMuZCkpKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogUmV0dXJucyBhIGRlY2ltYWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGZyYWN0aW9uXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiMTAwLic5MTgyMydcIikudmFsdWVPZigpID0+IDEwMC45MTgyMzkxODIzOTE4M1xuICAgICAqKi9cbiAgICAgIHZhbHVlT2Y6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucyAqIHRoaXMubiAvIHRoaXMuZFxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogUmV0dXJucyBhIHN0cmluZy1mcmFjdGlvbiByZXByZXNlbnRhdGlvbiBvZiBhIEZyYWN0aW9uIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEuJzMnXCIpLnRvRnJhY3Rpb24oKSA9PiBcIjQgMS8zXCJcbiAgICAgKiovXG4gICAgICB0b0ZyYWN0aW9uOiBmdW5jdGlvbiAoZXhjbHVkZVdob2xlKSB7XG4gICAgICAgIHZhciB3aG9sZTsgdmFyIHN0ciA9ICcnXG4gICAgICAgIHZhciBuID0gdGhpcy5uXG4gICAgICAgIHZhciBkID0gdGhpcy5kXG4gICAgICAgIGlmICh0aGlzLnMgPCAwKSB7XG4gICAgICAgICAgc3RyICs9ICctJ1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGQgPT09IDEpIHtcbiAgICAgICAgICBzdHIgKz0gblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChleGNsdWRlV2hvbGUgJiYgKHdob2xlID0gTWF0aC5mbG9vcihuIC8gZCkpID4gMCkge1xuICAgICAgICAgICAgc3RyICs9IHdob2xlXG4gICAgICAgICAgICBzdHIgKz0gJyAnXG4gICAgICAgICAgICBuICU9IGRcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzdHIgKz0gblxuICAgICAgICAgIHN0ciArPSAnLydcbiAgICAgICAgICBzdHIgKz0gZFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHJcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBsYXRleCByZXByZXNlbnRhdGlvbiBvZiBhIEZyYWN0aW9uIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEuJzMnXCIpLnRvTGF0ZXgoKSA9PiBcIlxcZnJhY3s0fXszfVwiXG4gICAgICoqL1xuICAgICAgdG9MYXRleDogZnVuY3Rpb24gKGV4Y2x1ZGVXaG9sZSkge1xuICAgICAgICB2YXIgd2hvbGU7IHZhciBzdHIgPSAnJ1xuICAgICAgICB2YXIgbiA9IHRoaXMublxuICAgICAgICB2YXIgZCA9IHRoaXMuZFxuICAgICAgICBpZiAodGhpcy5zIDwgMCkge1xuICAgICAgICAgIHN0ciArPSAnLSdcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkID09PSAxKSB7XG4gICAgICAgICAgc3RyICs9IG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZXhjbHVkZVdob2xlICYmICh3aG9sZSA9IE1hdGguZmxvb3IobiAvIGQpKSA+IDApIHtcbiAgICAgICAgICAgIHN0ciArPSB3aG9sZVxuICAgICAgICAgICAgbiAlPSBkXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc3RyICs9ICdcXFxcZnJhY3snXG4gICAgICAgICAgc3RyICs9IG5cbiAgICAgICAgICBzdHIgKz0gJ317J1xuICAgICAgICAgIHN0ciArPSBkXG4gICAgICAgICAgc3RyICs9ICd9J1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHJcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YgY29udGludWVkIGZyYWN0aW9uIGVsZW1lbnRzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiNy84XCIpLnRvQ29udGludWVkKCkgPT4gWzAsMSw3XVxuICAgICAqL1xuICAgICAgdG9Db250aW51ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRcbiAgICAgICAgdmFyIGEgPSB0aGlzLm5cbiAgICAgICAgdmFyIGIgPSB0aGlzLmRcbiAgICAgICAgdmFyIHJlcyA9IFtdXG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiByZXNcbiAgICAgICAgfVxuXG4gICAgICAgIGRvIHtcbiAgICAgICAgICByZXMucHVzaChNYXRoLmZsb29yKGEgLyBiKSlcbiAgICAgICAgICB0ID0gYSAlIGJcbiAgICAgICAgICBhID0gYlxuICAgICAgICAgIGIgPSB0XG4gICAgICAgIH0gd2hpbGUgKGEgIT09IDEpXG5cbiAgICAgICAgcmV0dXJuIHJlc1xuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhIGZyYWN0aW9uIHdpdGggYWxsIGRpZ2l0c1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEwMC4nOTE4MjMnXCIpLnRvU3RyaW5nKCkgPT4gXCIxMDAuKDkxODIzKVwiXG4gICAgICoqL1xuICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uIChkZWMpIHtcbiAgICAgICAgdmFyIGdcbiAgICAgICAgdmFyIE4gPSB0aGlzLm5cbiAgICAgICAgdmFyIEQgPSB0aGlzLmRcblxuICAgICAgICBpZiAoaXNOYU4oTikgfHwgaXNOYU4oRCkpIHtcbiAgICAgICAgICByZXR1cm4gJ05hTidcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghRnJhY3Rpb24uUkVEVUNFKSB7XG4gICAgICAgICAgZyA9IGdjZChOLCBEKVxuICAgICAgICAgIE4gLz0gZ1xuICAgICAgICAgIEQgLz0gZ1xuICAgICAgICB9XG5cbiAgICAgICAgZGVjID0gZGVjIHx8IDE1IC8vIDE1ID0gZGVjaW1hbCBwbGFjZXMgd2hlbiBubyByZXBpdGF0aW9uXG5cbiAgICAgICAgdmFyIGN5Y0xlbiA9IGN5Y2xlTGVuKE4sIEQpIC8vIEN5Y2xlIGxlbmd0aFxuICAgICAgICB2YXIgY3ljT2ZmID0gY3ljbGVTdGFydChOLCBELCBjeWNMZW4pIC8vIEN5Y2xlIHN0YXJ0XG5cbiAgICAgICAgdmFyIHN0ciA9IHRoaXMucyA9PT0gLTEgPyAnLScgOiAnJ1xuXG4gICAgICAgIHN0ciArPSBOIC8gRCB8IDBcblxuICAgICAgICBOICU9IERcbiAgICAgICAgTiAqPSAxMFxuXG4gICAgICAgIGlmIChOKSB7IHN0ciArPSAnLicgfVxuXG4gICAgICAgIGlmIChjeWNMZW4pIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gY3ljT2ZmOyBpLS07KSB7XG4gICAgICAgICAgICBzdHIgKz0gTiAvIEQgfCAwXG4gICAgICAgICAgICBOICU9IERcbiAgICAgICAgICAgIE4gKj0gMTBcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RyICs9ICcoJ1xuICAgICAgICAgIGZvciAodmFyIGkgPSBjeWNMZW47IGktLTspIHtcbiAgICAgICAgICAgIHN0ciArPSBOIC8gRCB8IDBcbiAgICAgICAgICAgIE4gJT0gRFxuICAgICAgICAgICAgTiAqPSAxMFxuICAgICAgICAgIH1cbiAgICAgICAgICBzdHIgKz0gJyknXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IGRlYzsgTiAmJiBpLS07KSB7XG4gICAgICAgICAgICBzdHIgKz0gTiAvIEQgfCAwXG4gICAgICAgICAgICBOICU9IERcbiAgICAgICAgICAgIE4gKj0gMTBcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0clxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdW5kZWZpbmVkID09PSAnZnVuY3Rpb24nICYmIHVuZGVmaW5lZC5hbWQpIHtcbiAgICAgIHVuZGVmaW5lZChbXSwgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gRnJhY3Rpb25cbiAgICAgIH0pXG4gICAgfSBlbHNlIGlmICgnb2JqZWN0JyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSlcbiAgICAgIEZyYWN0aW9uLmRlZmF1bHQgPSBGcmFjdGlvblxuICAgICAgRnJhY3Rpb24uRnJhY3Rpb24gPSBGcmFjdGlvblxuICAgICAgbW9kdWxlLmV4cG9ydHMgPSBGcmFjdGlvblxuICAgIH0gZWxzZSB7XG4gICAgICByb290LkZyYWN0aW9uID0gRnJhY3Rpb25cbiAgICB9XG4gIH0pKGNvbW1vbmpzSGVscGVycy5jb21tb25qc0dsb2JhbClcbn0pXG5cbmV4cG9ydCBkZWZhdWx0IC8qIEBfX1BVUkVfXyAqL2NvbW1vbmpzSGVscGVycy5nZXREZWZhdWx0RXhwb3J0RnJvbUNqcyhmcmFjdGlvbilcbmV4cG9ydCB7IGZyYWN0aW9uIGFzIF9fbW9kdWxlRXhwb3J0cyB9XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBNb25vbWlhbCB7XG4gIGNvbnN0cnVjdG9yIChjLCB2cykge1xuICAgIGlmICghaXNOYU4oYykgJiYgdnMgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgIHRoaXMuYyA9IGNcbiAgICAgIHRoaXMudnMgPSB2c1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGMgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmluaXRTdHIoYylcbiAgICB9IGVsc2UgaWYgKCFpc05hTihjKSkge1xuICAgICAgdGhpcy5jID0gY1xuICAgICAgdGhpcy52cyA9IG5ldyBNYXAoKVxuICAgIH0gZWxzZSB7IC8vIGRlZmF1bHQgYXMgYSB0ZXN0OiA0eF4yeVxuICAgICAgdGhpcy5jID0gNFxuICAgICAgdGhpcy52cyA9IG5ldyBNYXAoW1sneCcsIDJdLCBbJ3knLCAxXV0pXG4gICAgfVxuICB9XG5cbiAgY2xvbmUgKCkge1xuICAgIGNvbnN0IHZzID0gbmV3IE1hcCh0aGlzLnZzKVxuICAgIHJldHVybiBuZXcgTW9ub21pYWwodGhpcy5jLCB2cylcbiAgfVxuXG4gIG11bCAodGhhdCkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgTW9ub21pYWwodGhhdClcbiAgICB9XG4gICAgY29uc3QgYyA9IHRoaXMuYyAqIHRoYXQuY1xuICAgIGxldCB2cyA9IG5ldyBNYXAoKVxuICAgIHRoaXMudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAodGhhdC52cy5oYXModmFyaWFibGUpKSB7XG4gICAgICAgIHZzLnNldCh2YXJpYWJsZSwgdGhpcy52cy5nZXQodmFyaWFibGUpICsgdGhhdC52cy5nZXQodmFyaWFibGUpKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdnMuc2V0KHZhcmlhYmxlLCB0aGlzLnZzLmdldCh2YXJpYWJsZSkpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoYXQudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAoIXZzLmhhcyh2YXJpYWJsZSkpIHtcbiAgICAgICAgdnMuc2V0KHZhcmlhYmxlLCB0aGF0LnZzLmdldCh2YXJpYWJsZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICB2cyA9IG5ldyBNYXAoWy4uLnZzLmVudHJpZXMoKV0uc29ydCgpKVxuICAgIHJldHVybiBuZXcgTW9ub21pYWwoYywgdnMpXG4gIH1cblxuICB0b0xhdGV4ICgpIHtcbiAgICBpZiAodGhpcy52cy5zaXplID09PSAwKSByZXR1cm4gdGhpcy5jLnRvU3RyaW5nKClcbiAgICBsZXQgc3RyID0gdGhpcy5jID09PSAxID8gJydcbiAgICAgIDogdGhpcy5jID09PSAtMSA/ICctJ1xuICAgICAgICA6IHRoaXMuYy50b1N0cmluZygpXG4gICAgdGhpcy52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmIChpbmRleCA9PT0gMSkge1xuICAgICAgICBzdHIgKz0gdmFyaWFibGVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciArPSB2YXJpYWJsZSArICdeJyArIGluZGV4XG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gc3RyXG4gIH1cblxuICBzb3J0ICgpIHtcbiAgICAvLyBzb3J0cyAobW9kaWZpZXMgb2JqZWN0KVxuICAgIHRoaXMudnMgPSBuZXcgTWFwKFsuLi50aGlzLnZzLmVudHJpZXMoKV0uc29ydCgpKVxuICB9XG5cbiAgY2xlYW5aZXJvcyAoKSB7XG4gICAgdGhpcy52cy5mb3JFYWNoKChpZHgsIHYpID0+IHtcbiAgICAgIGlmIChpZHggPT09IDApIHRoaXMudnMuZGVsZXRlKHYpXG4gICAgfSlcbiAgfVxuXG4gIGxpa2UgKHRoYXQpIHtcbiAgICAvLyByZXR1cm4gdHJ1ZSBpZiBsaWtlIHRlcm1zLCBmYWxzZSBpZiBvdGhlcndpc2VcbiAgICAvLyBub3QgdGhlIG1vc3QgZWZmaWNpZW50IGF0IHRoZSBtb21lbnQsIGJ1dCBnb29kIGVub3VnaC5cbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IE1vbm9taWFsKHRoYXQpXG4gICAgfVxuXG4gICAgbGV0IGxpa2UgPSB0cnVlXG4gICAgdGhpcy52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICghdGhhdC52cy5oYXModmFyaWFibGUpIHx8IHRoYXQudnMuZ2V0KHZhcmlhYmxlKSAhPT0gaW5kZXgpIHtcbiAgICAgICAgbGlrZSA9IGZhbHNlXG4gICAgICB9XG4gICAgfSlcbiAgICB0aGF0LnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKCF0aGlzLnZzLmhhcyh2YXJpYWJsZSkgfHwgdGhpcy52cy5nZXQodmFyaWFibGUpICE9PSBpbmRleCkge1xuICAgICAgICBsaWtlID0gZmFsc2VcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBsaWtlXG4gIH1cblxuICBhZGQgKHRoYXQsIGNoZWNrTGlrZSkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgTW9ub21pYWwodGhhdClcbiAgICB9XG4gICAgLy8gYWRkcyB0d28gY29tcGF0aWJsZSBtb25vbWlhbHNcbiAgICAvLyBjaGVja0xpa2UgKGRlZmF1bHQgdHJ1ZSkgd2lsbCBjaGVjayBmaXJzdCBpZiB0aGV5IGFyZSBsaWtlIGFuZCB0aHJvdyBhbiBleGNlcHRpb25cbiAgICAvLyB1bmRlZmluZWQgYmVoYXZpb3VyIGlmIGNoZWNrTGlrZSBpcyBmYWxzZVxuICAgIGlmIChjaGVja0xpa2UgPT09IHVuZGVmaW5lZCkgY2hlY2tMaWtlID0gdHJ1ZVxuICAgIGlmIChjaGVja0xpa2UgJiYgIXRoaXMubGlrZSh0aGF0KSkgdGhyb3cgbmV3IEVycm9yKCdBZGRpbmcgdW5saWtlIHRlcm1zJylcbiAgICBjb25zdCBjID0gdGhpcy5jICsgdGhhdC5jXG4gICAgY29uc3QgdnMgPSB0aGlzLnZzXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbChjLCB2cylcbiAgfVxuXG4gIGluaXRTdHIgKHN0cikge1xuICAgIC8vIGN1cnJlbnRseSBubyBlcnJvciBjaGVja2luZyBhbmQgZnJhZ2lsZVxuICAgIC8vIFRoaW5ncyBub3QgdG8gcGFzcyBpbjpcbiAgICAvLyAgemVybyBpbmRpY2VzXG4gICAgLy8gIG11bHRpLWNoYXJhY3RlciB2YXJpYWJsZXNcbiAgICAvLyAgbmVnYXRpdmUgaW5kaWNlc1xuICAgIC8vICBub24taW50ZWdlciBjb2VmZmljaWVudHNcbiAgICBjb25zdCBsZWFkID0gc3RyLm1hdGNoKC9eLT9cXGQqLylbMF1cbiAgICBjb25zdCBjID0gbGVhZCA9PT0gJycgPyAxXG4gICAgICA6IGxlYWQgPT09ICctJyA/IC0xXG4gICAgICAgIDogcGFyc2VJbnQobGVhZClcbiAgICBsZXQgdnMgPSBzdHIubWF0Y2goLyhbYS16QS1aXSkoXFxeXFxkKyk/L2cpXG4gICAgaWYgKCF2cykgdnMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHYgPSB2c1tpXS5zcGxpdCgnXicpXG4gICAgICB2WzFdID0gdlsxXSA/IHBhcnNlSW50KHZbMV0pIDogMVxuICAgICAgdnNbaV0gPSB2XG4gICAgfVxuICAgIHZzID0gdnMuZmlsdGVyKHYgPT4gdlsxXSAhPT0gMClcbiAgICB0aGlzLmMgPSBjXG4gICAgdGhpcy52cyA9IG5ldyBNYXAodnMpXG4gIH1cblxuICBzdGF0aWMgdmFyICh2KSB7XG4gICAgLy8gZmFjdG9yeSBmb3IgYSBzaW5nbGUgdmFyaWFibGUgbW9ub21pYWxcbiAgICBjb25zdCBjID0gMVxuICAgIGNvbnN0IHZzID0gbmV3IE1hcChbW3YsIDFdXSlcbiAgICByZXR1cm4gbmV3IE1vbm9taWFsKGMsIHZzKVxuICB9XG59XG4iLCJpbXBvcnQgTW9ub21pYWwgZnJvbSAnTW9ub21pYWwnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBvbHlub21pYWwge1xuICBjb25zdHJ1Y3RvciAodGVybXMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0ZXJtcykgJiYgKHRlcm1zWzBdIGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0ZXJtcy5tYXAodCA9PiB0LmNsb25lKCkpXG4gICAgICB0aGlzLnRlcm1zID0gdGVybXNcbiAgICB9IGVsc2UgaWYgKCFpc05hTih0ZXJtcykpIHtcbiAgICAgIHRoaXMuaW5pdE51bSh0ZXJtcylcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0ZXJtcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuaW5pdFN0cih0ZXJtcylcbiAgICB9XG4gIH1cblxuICBpbml0U3RyIChzdHIpIHtcbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvXFwrLS9nLCAnLScpIC8vIGEgaG9ycmlibGUgYm9kZ2VcbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvLS9nLCAnKy0nKSAvLyBtYWtlIG5lZ2F0aXZlIHRlcm1zIGV4cGxpY2l0LlxuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9cXHMvZywgJycpIC8vIHN0cmlwIHdoaXRlc3BhY2VcbiAgICB0aGlzLnRlcm1zID0gc3RyLnNwbGl0KCcrJylcbiAgICAgIC5tYXAocyA9PiBuZXcgTW9ub21pYWwocykpXG4gICAgICAuZmlsdGVyKHQgPT4gdC5jICE9PSAwKVxuICB9XG5cbiAgaW5pdE51bSAobikge1xuICAgIHRoaXMudGVybXMgPSBbbmV3IE1vbm9taWFsKG4pXVxuICB9XG5cbiAgdG9MYXRleCAoKSB7XG4gICAgbGV0IHN0ciA9ICcnXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRlcm1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoaSA+IDAgJiYgdGhpcy50ZXJtc1tpXS5jID49IDApIHtcbiAgICAgICAgc3RyICs9ICcrJ1xuICAgICAgfVxuICAgICAgc3RyICs9IHRoaXMudGVybXNbaV0udG9MYXRleCgpXG4gICAgfVxuICAgIHJldHVybiBzdHJcbiAgfVxuXG4gIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gdGhpcy50b0xhVGVYKClcbiAgfVxuXG4gIGNsb25lICgpIHtcbiAgICBjb25zdCB0ZXJtcyA9IHRoaXMudGVybXMubWFwKHQgPT4gdC5jbG9uZSgpKVxuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbCh0ZXJtcylcbiAgfVxuXG4gIHNpbXBsaWZ5ICgpIHtcbiAgICAvLyBjb2xsZWN0cyBsaWtlIHRlcm1zIGFuZCByZW1vdmVzIHplcm8gdGVybXNcbiAgICAvLyBkb2VzIG5vdCBtb2RpZnkgb3JpZ2luYWxcbiAgICAvLyBUaGlzIHNlZW1zIHByb2JhYmx5IGluZWZmaWNpZW50LCBnaXZlbiB0aGUgZGF0YSBzdHJ1Y3R1cmVcbiAgICAvLyBXb3VsZCBiZSBiZXR0ZXIgdG8gdXNlIHNvbWV0aGluZyBsaWtlIGEgbGlua2VkIGxpc3QgbWF5YmU/XG4gICAgY29uc3QgdGVybXMgPSB0aGlzLnRlcm1zLnNsaWNlKClcbiAgICBsZXQgbmV3dGVybXMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGVybXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghdGVybXNbaV0pIGNvbnRpbnVlXG4gICAgICBsZXQgbmV3dGVybSA9IHRlcm1zW2ldXG4gICAgICBmb3IgKGxldCBqID0gaSArIDE7IGogPCB0ZXJtcy5sZW5ndGg7IGorKykge1xuICAgICAgICBpZiAoIXRlcm1zW2pdKSBjb250aW51ZVxuICAgICAgICBpZiAodGVybXNbal0ubGlrZSh0ZXJtc1tpXSkpIHtcbiAgICAgICAgICBuZXd0ZXJtID0gbmV3dGVybS5hZGQodGVybXNbal0pXG4gICAgICAgICAgdGVybXNbal0gPSBudWxsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG5ld3Rlcm1zLnB1c2gobmV3dGVybSlcbiAgICAgIHRlcm1zW2ldID0gbnVsbFxuICAgIH1cbiAgICBuZXd0ZXJtcyA9IG5ld3Rlcm1zLmZpbHRlcih0ID0+IHQuYyAhPT0gMClcbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwobmV3dGVybXMpXG4gIH1cblxuICBhZGQgKHRoYXQsIHNpbXBsaWZ5KSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIFBvbHlub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IFBvbHlub21pYWwodGhhdClcbiAgICB9XG4gICAgaWYgKHNpbXBsaWZ5ID09PSB1bmRlZmluZWQpIHNpbXBsaWZ5ID0gdHJ1ZVxuICAgIGNvbnN0IHRlcm1zID0gdGhpcy50ZXJtcy5jb25jYXQodGhhdC50ZXJtcylcbiAgICBsZXQgcmVzdWx0ID0gbmV3IFBvbHlub21pYWwodGVybXMpXG5cbiAgICBpZiAoc2ltcGxpZnkpIHJlc3VsdCA9IHJlc3VsdC5zaW1wbGlmeSgpXG5cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICBtdWwgKHRoYXQsIHNpbXBsaWZ5KSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIFBvbHlub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IFBvbHlub21pYWwodGhhdClcbiAgICB9XG4gICAgY29uc3QgdGVybXMgPSBbXVxuICAgIGlmIChzaW1wbGlmeSA9PT0gdW5kZWZpbmVkKSBzaW1wbGlmeSA9IHRydWVcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGVybXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhhdC50ZXJtcy5sZW5ndGg7IGorKykge1xuICAgICAgICB0ZXJtcy5wdXNoKHRoaXMudGVybXNbaV0ubXVsKHRoYXQudGVybXNbal0pKVxuICAgICAgfVxuICAgIH1cblxuICAgIGxldCByZXN1bHQgPSBuZXcgUG9seW5vbWlhbCh0ZXJtcylcbiAgICBpZiAoc2ltcGxpZnkpIHJlc3VsdCA9IHJlc3VsdC5zaW1wbGlmeSgpXG5cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICBwb3cgKG4sIHNpbXBsaWZ5KSB7XG4gICAgbGV0IHJlc3VsdCA9IHRoaXNcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IG47IGkrKykge1xuICAgICAgcmVzdWx0ID0gcmVzdWx0Lm11bCh0aGlzKVxuICAgIH1cbiAgICBpZiAoc2ltcGxpZnkpIHJlc3VsdCA9IHJlc3VsdC5zaW1wbGlmeSgpXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG5cbiAgc3RhdGljIHZhciAodikge1xuICAgIC8vIGZhY3RvcnkgZm9yIGEgc2luZ2xlIHZhcmlhYmxlIHBvbHlub21pYWxcbiAgICBjb25zdCB0ZXJtcyA9IFtNb25vbWlhbC52YXIodildXG4gICAgcmV0dXJuIG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuICB9XG5cbiAgc3RhdGljIHggKCkge1xuICAgIHJldHVybiBQb2x5bm9taWFsLnZhcigneCcpXG4gIH1cblxuICBzdGF0aWMgY29uc3QgKG4pIHtcbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwobilcbiAgfVxufVxuIiwiaW1wb3J0IHsgR3JhcGhpY1EsIEdyYXBoaWNRVmlldyB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IEZyYWN0aW9uIGZyb20gJ3ZlbmRvci9mcmFjdGlvbidcbmltcG9ydCBQb2x5bm9taWFsIGZyb20gJ1BvbHlub21pYWwnXG5pbXBvcnQgeyByYW5kRWxlbSwgcmFuZEJldHdlZW4sIHJhbmRCZXR3ZWVuRmlsdGVyLCBnY2QgfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFyaXRobWFnb25RIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpIC8vIHByb2Nlc3NlcyBvcHRpb25zIGludG8gdGhpcy5zZXR0aW5nc1xuICAgIHRoaXMuZGF0YSA9IG5ldyBBcml0aG1hZ29uUURhdGEodGhpcy5zZXR0aW5ncylcbiAgICB0aGlzLnZpZXcgPSBuZXcgQXJpdGhtYWdvblFWaWV3KHRoaXMuZGF0YSwgdGhpcy5zZXR0aW5ncylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgeyByZXR1cm4gJ0NvbXBsZXRlIHRoZSBhcml0aG1hZ29uOicgfVxufVxuXG5Bcml0aG1hZ29uUS5vcHRpb25zU3BlYyA9IFtcbiAge1xuICAgIHRpdGxlOiAnVmVydGljZXMnLFxuICAgIGlkOiAnbicsXG4gICAgdHlwZTogJ2ludCcsXG4gICAgbWluOiAzLFxuICAgIG1heDogMjAsXG4gICAgZGVmYXVsdDogM1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdUeXBlJyxcbiAgICBpZDogJ3R5cGUnLFxuICAgIHR5cGU6ICdzZWxlY3QtZXhjbHVzaXZlJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICB7IHRpdGxlOiAnSW50ZWdlciAoKyknLCBpZDogJ2ludGVnZXItYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0ludGVnZXIgKFxcdTAwZDcpJywgaWQ6ICdpbnRlZ2VyLW11bHRpcGx5JyB9LFxuICAgICAgeyB0aXRsZTogJ0ZyYWN0aW9uICgrKScsIGlkOiAnZnJhY3Rpb24tYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0ZyYWN0aW9uIChcXHUwMGQ3KScsIGlkOiAnZnJhY3Rpb24tbXVsdGlwbHknIH0sXG4gICAgICB7IHRpdGxlOiAnQWxnZWJyYSAoKyknLCBpZDogJ2FsZ2VicmEtYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0FsZ2VicmEgKFxcdTAwZDcpJywgaWQ6ICdhbGdlYnJhLW11bHRpcGx5JyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiAnaW50ZWdlci1hZGQnLFxuICAgIHZlcnRpY2FsOiB0cnVlXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1B1enpsZSB0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgaWQ6ICdwdXpfZGlmZicsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ01pc3NpbmcgZWRnZXMnLCBpZDogJzEnIH0sXG4gICAgICB7IHRpdGxlOiAnTWl4ZWQnLCBpZDogJzInIH0sXG4gICAgICB7IHRpdGxlOiAnTWlzc2luZyB2ZXJ0aWNlcycsIGlkOiAnMycgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogJzEnXG4gIH1cbl1cblxuY2xhc3MgQXJpdGhtYWdvblFEYXRhIC8qIGV4dGVuZHMgR3JhcGhpY1FEYXRhICovIHtcbiAgLy8gVE9ETyBzaW1wbGlmeSBjb25zdHJ1Y3Rvci4gTW92ZSBsb2dpYyBpbnRvIHN0YXRpYyBmYWN0b3J5IG1ldGhvZHNcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICAvLyAxLiBTZXQgcHJvcGVydGllcyBmcm9tIG9wdGlvbnNcbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIG46IDMsIC8vIG51bWJlciBvZiB2ZXJ0aWNlc1xuICAgICAgbWluOiAtMjAsXG4gICAgICBtYXg6IDIwLFxuICAgICAgbnVtX2RpZmY6IDEsIC8vIGNvbXBsZXhpdHkgb2Ygd2hhdCdzIGluIHZlcnRpY2VzL2VkZ2VzXG4gICAgICBwdXpfZGlmZjogMSwgLy8gMSAtIFZlcnRpY2VzIGdpdmVuLCAyIC0gdmVydGljZXMvZWRnZXM7IGdpdmVuIDMgLSBvbmx5IGVkZ2VzXG4gICAgICB0eXBlOiAnaW50ZWdlci1hZGQnIC8vIFt0eXBlXS1bb3BlcmF0aW9uXSB3aGVyZSBbdHlwZV0gPSBpbnRlZ2VyLCAuLi5cbiAgICAgIC8vIGFuZCBbb3BlcmF0aW9uXSA9IGFkZC9tdWx0aXBseVxuICAgIH1cblxuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgdGhpcy5zZXR0aW5ncywgb3B0aW9ucylcbiAgICB0aGlzLnNldHRpbmdzLm51bV9kaWZmID0gdGhpcy5zZXR0aW5ncy5kaWZmaWN1bHR5XG4gICAgdGhpcy5zZXR0aW5ncy5wdXpfZGlmZiA9IHBhcnNlSW50KHRoaXMuc2V0dGluZ3MucHV6X2RpZmYpIC8vISA/IFRoaXMgc2hvdWxkIGhhdmUgYmVlbiBkb25lIHVwc3RyZWFtLi4uXG5cbiAgICB0aGlzLm4gPSB0aGlzLnNldHRpbmdzLm5cbiAgICB0aGlzLnZlcnRpY2VzID0gW11cbiAgICB0aGlzLnNpZGVzID0gW11cblxuICAgIGlmICh0aGlzLnNldHRpbmdzLnR5cGUuZW5kc1dpdGgoJ2FkZCcpKSB7XG4gICAgICB0aGlzLm9wbmFtZSA9ICcrJ1xuICAgICAgdGhpcy5vcCA9ICh4LCB5KSA9PiB4LmFkZCh5KVxuICAgIH0gZWxzZSBpZiAodGhpcy5zZXR0aW5ncy50eXBlLmVuZHNXaXRoKCdtdWx0aXBseScpKSB7XG4gICAgICB0aGlzLm9wbmFtZSA9ICdcXHUwMGQ3J1xuICAgICAgdGhpcy5vcCA9ICh4LCB5KSA9PiB4Lm11bCh5KVxuICAgIH1cblxuICAgIC8vIDIuIEluaXRpYWxpc2UgYmFzZWQgb24gdHlwZVxuICAgIHN3aXRjaCAodGhpcy5zZXR0aW5ncy50eXBlKSB7XG4gICAgICBjYXNlICdpbnRlZ2VyLWFkZCc6XG4gICAgICBjYXNlICdpbnRlZ2VyLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0SW50ZWdlcih0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnZnJhY3Rpb24tYWRkJzpcbiAgICAgICAgdGhpcy5pbml0RnJhY3Rpb25BZGQodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2ZyYWN0aW9uLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0RnJhY3Rpb25NdWx0aXBseSh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnYWxnZWJyYS1hZGQnOlxuICAgICAgICB0aGlzLmluaXRBbGdlYnJhQWRkKHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdhbGdlYnJhLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0QWxnZWJyYU11bHRpcGx5KHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgc3dpdGNoIGRlZmF1bHQnKVxuICAgIH1cblxuICAgIHRoaXMuY2FsY3VsYXRlRWRnZXMoKSAvLyBVc2Ugb3AgZnVuY3Rpb25zIHRvIGZpbGwgaW4gdGhlIGVkZ2VzXG4gICAgdGhpcy5oaWRlTGFiZWxzKHRoaXMuc2V0dGluZ3MucHV6X2RpZmYpIC8vIHNldCBzb21lIHZlcnRpY2VzL2VkZ2VzIGFzIGhpZGRlbiBkZXBlbmRpbmcgb24gZGlmZmljdWx0eVxuICB9XG5cbiAgLyogTWV0aG9kcyBpbml0aWFsaXNpbmcgdmVydGljZXMgKi9cblxuICBpbml0SW50ZWdlciAoc2V0dGluZ3MpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihyYW5kQmV0d2VlbkZpbHRlcihcbiAgICAgICAgICBzZXR0aW5ncy5taW4sXG4gICAgICAgICAgc2V0dGluZ3MubWF4LFxuICAgICAgICAgIHggPT4gKHNldHRpbmdzLnR5cGUuZW5kc1dpdGgoJ2FkZCcpIHx8IHggIT09IDApXG4gICAgICAgICkpLFxuICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEZyYWN0aW9uQWRkIChzZXR0aW5ncykge1xuICAgIC8qIERpZmZpY3VsdHkgc2V0dGluZ3M6XG4gICAgICogMTogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIHNhbWUgZGVub21pbmF0b3IsIG5vIGNhbmNlbGxpbmcgYWZ0ZXIgRE9ORVxuICAgICAqIDI6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBzYW1lIGRlbm9taW5hdG9yLCBubyBjYW5jZWxsbGluZyBhbnN3ZXIgaW1wcm9wZXIgZnJhY3Rpb25cbiAgICAgKiAzOiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggb25lIGRlbm9taW5hdG9yIGEgbXVsdGlwbGUgb2YgYW5vdGhlciwgZ2l2ZXMgcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNDogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIG9uZSBkZW5vbWluYXRvciBhIG11bHRpcGxlIG9mIGFub3RoZXIsIGdpdmVzIGltcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNTogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIGRpZmZlcmVudCBkZW5vbWluYXRvcnMgKG5vdCBjby1wcmltZSksIGdpdmVzIGltcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNjogbWl4ZWQgbnVtYmVyc1xuICAgICAqIDc6IG1peGVkIG51bWJlcnMsIGJpZ2dlciBudW1lcmF0b3JzIGFuZCBkZW5vbWluYXRvcnNcbiAgICAgKiA4OiBtaXhlZCBudW1iZXJzLCBiaWcgaW50ZWdlciBwYXJ0c1xuICAgICAqL1xuXG4gICAgLy8gVE9ETyAtIGFueXRoaW5nIG90aGVyIHRoYW4gZGlmZmljdWx0eSAxLlxuICAgIGNvbnN0IGRpZmYgPSBzZXR0aW5ncy5udW1fZGlmZlxuICAgIGlmIChkaWZmIDwgMykge1xuICAgICAgY29uc3QgZGVuID0gcmFuZEVsZW0oWzUsIDcsIDksIDExLCAxMywgMTddKVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICBjb25zdCBwcmV2bnVtID0gdGhpcy52ZXJ0aWNlc1tpIC0gMV1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbaSAtIDFdLnZhbC5uIDogdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IG5leHRudW0gPSB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dLnZhbC5uIDogdW5kZWZpbmVkXG5cbiAgICAgICAgY29uc3QgbWF4bnVtID1cbiAgICAgICAgICBkaWZmID09PSAyID8gZGVuIC0gMVxuICAgICAgICAgICAgOiBuZXh0bnVtID8gZGVuIC0gTWF0aC5tYXgobmV4dG51bSwgcHJldm51bSlcbiAgICAgICAgICAgICAgOiBwcmV2bnVtID8gZGVuIC0gcHJldm51bVxuICAgICAgICAgICAgICAgIDogZGVuIC0gMVxuXG4gICAgICAgIGNvbnN0IG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKDEsIG1heG51bSwgeCA9PiAoXG4gICAgICAgICAgLy8gRW5zdXJlcyBubyBzaW1wbGlmaW5nIGFmdGVyd2FyZHMgaWYgZGlmZmljdWx0eSBpcyAxXG4gICAgICAgICAgZ2NkKHgsIGRlbikgPT09IDEgJiZcbiAgICAgICAgICAoIXByZXZudW0gfHwgZ2NkKHggKyBwcmV2bnVtLCBkZW4pID09PSAxIHx8IHggKyBwcmV2bnVtID09PSBkZW4pICYmXG4gICAgICAgICAgKCFuZXh0bnVtIHx8IGdjZCh4ICsgbmV4dG51bSwgZGVuKSA9PT0gMSB8fCB4ICsgbmV4dG51bSA9PT0gZGVuKVxuICAgICAgICApKVxuXG4gICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24obnVtLCBkZW4pLFxuICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBkZW5iYXNlID0gcmFuZEVsZW0oXG4gICAgICAgIGRpZmYgPCA3ID8gWzIsIDMsIDVdIDogWzIsIDMsIDQsIDUsIDYsIDcsIDgsIDksIDEwLCAxMV1cbiAgICAgIClcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgY29uc3QgcHJldiA9IHRoaXMudmVydGljZXNbaSAtIDFdXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzW2kgLSAxXS52YWwgOiB1bmRlZmluZWRcbiAgICAgICAgY29uc3QgbmV4dCA9IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl0udmFsIDogdW5kZWZpbmVkXG5cbiAgICAgICAgY29uc3QgbWF4bXVsdGlwbGllciA9IGRpZmYgPCA3ID8gNCA6IDhcblxuICAgICAgICBjb25zdCBtdWx0aXBsaWVyID1cbiAgICAgICAgICBpICUgMiA9PT0gMSB8fCBkaWZmID4gNCA/IHJhbmRCZXR3ZWVuRmlsdGVyKDIsIG1heG11bHRpcGxpZXIsIHggPT5cbiAgICAgICAgICAgICghcHJldiB8fCB4ICE9PSBwcmV2LmQgLyBkZW5iYXNlKSAmJlxuICAgICAgICAgICAgKCFuZXh0IHx8IHggIT09IG5leHQuZCAvIGRlbmJhc2UpXG4gICAgICAgICAgKSA6IDFcblxuICAgICAgICBjb25zdCBkZW4gPSBkZW5iYXNlICogbXVsdGlwbGllclxuXG4gICAgICAgIGxldCBudW1cbiAgICAgICAgaWYgKGRpZmYgPCA2KSB7XG4gICAgICAgICAgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoMSwgZGVuIC0gMSwgeCA9PiAoXG4gICAgICAgICAgICBnY2QoeCwgZGVuKSA9PT0gMSAmJlxuICAgICAgICAgICAgKGRpZmYgPj0gNCB8fCAhcHJldiB8fCBwcmV2LmFkZCh4LCBkZW4pIDw9IDEpICYmXG4gICAgICAgICAgICAoZGlmZiA+PSA0IHx8ICFuZXh0IHx8IG5leHQuYWRkKHgsIGRlbikgPD0gMSlcbiAgICAgICAgICApKVxuICAgICAgICB9IGVsc2UgaWYgKGRpZmYgPCA4KSB7XG4gICAgICAgICAgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoZGVuICsgMSwgZGVuICogNiwgeCA9PiBnY2QoeCwgZGVuKSA9PT0gMSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBudW0gPSByYW5kQmV0d2VlbkZpbHRlcihkZW4gKiAxMCwgZGVuICogMTAwLCB4ID0+IGdjZCh4LCBkZW4pID09PSAxKVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihudW0sIGRlbiksXG4gICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEZyYWN0aW9uTXVsdGlwbHkgKHNldHRpbmdzKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgY29uc3QgZCA9IHJhbmRCZXR3ZWVuKDIsIDEwKVxuICAgICAgY29uc3QgbiA9IHJhbmRCZXR3ZWVuKDEsIGQgLSAxKVxuICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24obiwgZCksXG4gICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0QWxnZWJyYUFkZCAoc2V0dGluZ3MpIHtcbiAgICBjb25zdCBkaWZmID0gc2V0dGluZ3MubnVtX2RpZmZcbiAgICBzd2l0Y2ggKGRpZmYpIHtcbiAgICAgIGNhc2UgMToge1xuICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2YXJpYWJsZSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDI6XG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGlmIChNYXRoLnJhbmRvbSgpIDwgMC41KSB7IC8vIHZhcmlhYmxlICsgY29uc3RhbnRcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgY29uc3RhbnQgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbChjb2VmZiArIHZhcmlhYmxlICsgJysnICsgY29uc3RhbnQpLFxuICAgICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IHZhcmlhYmxlMSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgICAgbGV0IHZhcmlhYmxlMiA9IHZhcmlhYmxlMVxuICAgICAgICAgIHdoaWxlICh2YXJpYWJsZTIgPT09IHZhcmlhYmxlMSkge1xuICAgICAgICAgICAgdmFyaWFibGUyID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBjb2VmZjEgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgY29lZmYyID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYxICsgdmFyaWFibGUxICsgJysnICsgY29lZmYyICsgdmFyaWFibGUyKSxcbiAgICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRBbGdlYnJhTXVsdGlwbHkgKHNldHRpbmdzKSB7XG4gICAgLyogRGlmZmljdWx0eTpcbiAgICAgKiAxOiBBbHRlcm5hdGUgM2Egd2l0aCA0XG4gICAgICogMjogQWxsIHRlcm1zIG9mIHRoZSBmb3JtIG52IC0gdXAgdG8gdHdvIHZhcmlhYmxlc1xuICAgICAqIDM6IEFsbCB0ZXJtcyBvZiB0aGUgZm9ybSBudl5tLiBPbmUgdmFyaWFibGUgb25seVxuICAgICAqIDQ6IEFMbCB0ZXJtcyBvZiB0aGUgZm9ybSBueF5rIHlebCB6XnAuIGssbCxwIDAtM1xuICAgICAqIDU6IEV4cGFuZCBicmFja2V0cyAzKDJ4KzUpXG4gICAgICogNjogRXhwYW5kIGJyYWNrZXRzIDN4KDJ4KzUpXG4gICAgICogNzogRXhwYW5kIGJyYWNrZXRzIDN4XjJ5KDJ4eSs1eV4yKVxuICAgICAqIDg6IEV4cGFuZCBicmFja2V0cyAoeCszKSh4KzIpXG4gICAgICogOTogRXhwYW5kIGJyYWNrZXRzICgyeC0zKSgzeCs0KVxuICAgICAqIDEwOiBFeHBhbmQgYnJhY2tldHMgKDJ4XjItM3grNCkoMngtNSlcbiAgICAgKi9cbiAgICBjb25zdCBkaWZmID0gc2V0dGluZ3MubnVtX2RpZmZcbiAgICBzd2l0Y2ggKGRpZmYpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgIHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IHRlcm0gPSBpICUgMiA9PT0gMCA/IGNvZWZmIDogY29lZmYgKyB2YXJpYWJsZVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDI6IHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUxID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgY29uc3QgdmFyaWFibGUyID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZSA9IHJhbmRFbGVtKFt2YXJpYWJsZTEsIHZhcmlhYmxlMl0pXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2YXJpYWJsZSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgMzoge1xuICAgICAgICBjb25zdCB2ID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBpZHggPSByYW5kQmV0d2VlbigxLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2ICsgJ14nICsgaWR4KSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSA0OiB7XG4gICAgICAgIGNvbnN0IHN0YXJ0QXNjaWkgPSByYW5kQmV0d2Vlbig5NywgMTIwKVxuICAgICAgICBjb25zdCB2MSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSlcbiAgICAgICAgY29uc3QgdjIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkgKyAxKVxuICAgICAgICBjb25zdCB2MyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSArIDIpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBhID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMSA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMiA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMyA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCB0ZXJtID0gYSArIHYxICsgbjEgKyB2MiArIG4yICsgdjMgKyBuM1xuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDU6XG4gICAgICBjYXNlIDY6IHsgLy8gZS5nLiAzKHgpICogKDJ4LTUpXG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBjb25zdGFudCA9IHJhbmRCZXR3ZWVuKC05LCA5KS50b1N0cmluZygpXG4gICAgICAgICAgbGV0IHRlcm0gPSBjb2VmZlxuICAgICAgICAgIGlmIChkaWZmID09PSA2IHx8IGkgJSAyID09PSAxKSB0ZXJtICs9IHZhcmlhYmxlXG4gICAgICAgICAgaWYgKGkgJSAyID09PSAxKSB0ZXJtICs9ICcrJyArIGNvbnN0YW50XG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgNzogeyAvLyBlLmcuIDN4XjJ5KDR4eV4yKzV4eSlcbiAgICAgICAgY29uc3Qgc3RhcnRBc2NpaSA9IHJhbmRCZXR3ZWVuKDk3LCAxMjApXG4gICAgICAgIGNvbnN0IHYxID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpKVxuICAgICAgICBjb25zdCB2MiA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSArIDEpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBhMSA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjExID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4xMiA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBsZXQgdGVybSA9IGExICsgdjEgKyBuMTEgKyB2MiArIG4xMlxuICAgICAgICAgIGlmIChpICUgMiA9PT0gMSkge1xuICAgICAgICAgICAgY29uc3QgYTIgPSByYW5kQmV0d2VlbigtOSwgOSkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgbjIxID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgbjIyID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgICAgdGVybSArPSAnKycgKyBhMiArIHYxICsgbjIxICsgdjIgKyBuMjJcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgODogLy8geyBlLmcuICh4KzUpICogKHgtMilcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29uc3RhbnQgPSByYW5kQmV0d2VlbigtOSwgOSkudG9TdHJpbmcoKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHZhcmlhYmxlICsgJysnICsgY29uc3RhbnQpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qIE1ldGhvZCB0byBjYWxjdWxhdGUgZWRnZXMgZnJvbSB2ZXJ0aWNlcyAqL1xuICBjYWxjdWxhdGVFZGdlcyAoKSB7XG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBlZGdlcyBnaXZlbiB0aGUgdmVydGljZXMgdXNpbmcgdGhpcy5vcFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIHRoaXMuc2lkZXNbaV0gPSB7XG4gICAgICAgIHZhbDogdGhpcy5vcCh0aGlzLnZlcnRpY2VzW2ldLnZhbCwgdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXS52YWwpLFxuICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyogTWFyayBoaWRkZW5kIGVkZ2VzL3ZlcnRpY2VzICovXG5cbiAgaGlkZUxhYmVscyAocHV6emxlRGlmZmljdWx0eSkge1xuICAgIC8vIEhpZGUgc29tZSBsYWJlbHMgdG8gbWFrZSBhIHB1enpsZVxuICAgIC8vIDEgLSBTaWRlcyBoaWRkZW4sIHZlcnRpY2VzIHNob3duXG4gICAgLy8gMiAtIFNvbWUgc2lkZXMgaGlkZGVuLCBzb21lIHZlcnRpY2VzIGhpZGRlblxuICAgIC8vIDMgLSBBbGwgdmVydGljZXMgaGlkZGVuXG4gICAgc3dpdGNoIChwdXp6bGVEaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHRoaXMuc2lkZXMuZm9yRWFjaCh4ID0+IHsgeC5oaWRkZW4gPSB0cnVlIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDI6IHtcbiAgICAgICAgdGhpcy5zaWRlcy5mb3JFYWNoKHggPT4geyB4LmhpZGRlbiA9IHRydWUgfSlcbiAgICAgICAgY29uc3Qgc2hvd3NpZGUgPSByYW5kQmV0d2VlbigwLCB0aGlzLm4gLSAxLCBNYXRoLnJhbmRvbSlcbiAgICAgICAgY29uc3QgaGlkZXZlcnQgPSBNYXRoLnJhbmRvbSgpIDwgMC41XG4gICAgICAgICAgPyBzaG93c2lkZSAvLyBwcmV2aW91cyB2ZXJ0ZXhcbiAgICAgICAgICA6IChzaG93c2lkZSArIDEpICUgdGhpcy5uIC8vIG5leHQgdmVydGV4O1xuXG4gICAgICAgIHRoaXMuc2lkZXNbc2hvd3NpZGVdLmhpZGRlbiA9IGZhbHNlXG4gICAgICAgIHRoaXMudmVydGljZXNbaGlkZXZlcnRdLmhpZGRlbiA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgMzpcbiAgICAgICAgdGhpcy52ZXJ0aWNlcy5mb3JFYWNoKHggPT4geyB4LmhpZGRlbiA9IHRydWUgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm9fZGlmZmljdWx0eScpXG4gICAgfVxuICB9XG59XG5cbmNsYXNzIEFyaXRobWFnb25RVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIGNvbnN0cnVjdG9yIChkYXRhLCBvcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc2V0cyB0aGlzLndpZHRoIHRoaXMuaGVpZ2h0LCBpbml0aWFsaXNlcyB0aGlzLmxhYmVscywgY3JlYXRlcyBkb20gZWxlbWVudHNcblxuICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aFxuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuaGVpZ2h0XG4gICAgY29uc3QgciA9IDAuMzUgKiBNYXRoLm1pbih3aWR0aCwgaGVpZ2h0KSAvLyByYWRpdXNcbiAgICBjb25zdCBuID0gdGhpcy5kYXRhLm5cblxuICAgIC8vIEEgcG9pbnQgdG8gbGFiZWwgd2l0aCB0aGUgb3BlcmF0aW9uXG4gICAgLy8gQWxsIHBvaW50cyBmaXJzdCBzZXQgdXAgd2l0aCAoMCwwKSBhdCBjZW50ZXJcbiAgICB0aGlzLm9wZXJhdGlvblBvaW50ID0gbmV3IFBvaW50KDAsIDApXG5cbiAgICAvLyBQb3NpdGlvbiBvZiB2ZXJ0aWNlc1xuICAgIHRoaXMudmVydGV4UG9pbnRzID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgY29uc3QgYW5nbGUgPSBpICogTWF0aC5QSSAqIDIgLyBuIC0gTWF0aC5QSSAvIDJcbiAgICAgIHRoaXMudmVydGV4UG9pbnRzW2ldID0gUG9pbnQuZnJvbVBvbGFyKHIsIGFuZ2xlKVxuICAgIH1cblxuICAgIC8vIFBvaXNpdGlvbiBvZiBzaWRlIGxhYmVsc1xuICAgIHRoaXMuc2lkZVBvaW50cyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIHRoaXMuc2lkZVBvaW50c1tpXSA9IFBvaW50Lm1lYW4odGhpcy52ZXJ0ZXhQb2ludHNbaV0sIHRoaXMudmVydGV4UG9pbnRzWyhpICsgMSkgJSBuXSlcbiAgICB9XG5cbiAgICB0aGlzLmFsbFBvaW50cyA9IFt0aGlzLm9wZXJhdGlvblBvaW50XS5jb25jYXQodGhpcy52ZXJ0ZXhQb2ludHMpLmNvbmNhdCh0aGlzLnNpZGVQb2ludHMpXG5cbiAgICB0aGlzLnJlQ2VudGVyKCkgLy8gUmVwb3NpdGlvbiBldmVyeXRoaW5nIHByb3Blcmx5XG5cbiAgICB0aGlzLm1ha2VMYWJlbHModHJ1ZSlcblxuICAgIC8vIERyYXcgaW50byBjYW52YXNcbiAgfVxuXG4gIHJlQ2VudGVyICgpIHtcbiAgICAvLyBGaW5kIHRoZSBjZW50ZXIgb2YgdGhlIGJvdW5kaW5nIGJveFxuICAgIGNvbnN0IHRvcGxlZnQgPSBQb2ludC5taW4odGhpcy5hbGxQb2ludHMpXG4gICAgY29uc3QgYm90dG9tcmlnaHQgPSBQb2ludC5tYXgodGhpcy5hbGxQb2ludHMpXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbih0b3BsZWZ0LCBib3R0b21yaWdodClcblxuICAgIC8vIHRyYW5zbGF0ZSB0byBwdXQgaW4gdGhlIGNlbnRlclxuICAgIHRoaXMuYWxsUG9pbnRzLmZvckVhY2gocCA9PiB7XG4gICAgICBwLnRyYW5zbGF0ZSh0aGlzLndpZHRoIC8gMiAtIGNlbnRlci54LCB0aGlzLmhlaWdodCAvIDIgLSBjZW50ZXIueSlcbiAgICB9KVxuICB9XG5cbiAgbWFrZUxhYmVscyAoKSB7XG4gICAgLy8gdmVydGljZXNcbiAgICB0aGlzLmRhdGEudmVydGljZXMuZm9yRWFjaCgodiwgaSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSB2LnZhbC50b0xhdGV4XG4gICAgICAgID8gdi52YWwudG9MYXRleCh0cnVlKVxuICAgICAgICA6IHYudmFsLnRvU3RyaW5nKClcbiAgICAgIHRoaXMubGFiZWxzLnB1c2goe1xuICAgICAgICBwb3M6IHRoaXMudmVydGV4UG9pbnRzW2ldLFxuICAgICAgICB0ZXh0cTogdi5oaWRkZW4gPyAnJyA6IHZhbHVlLFxuICAgICAgICB0ZXh0YTogdmFsdWUsXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCB2ZXJ0ZXgnLFxuICAgICAgICBzdHlsZWE6IHYuaGlkZGVuID8gJ2Fuc3dlciB2ZXJ0ZXgnIDogJ25vcm1hbCB2ZXJ0ZXgnXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBzaWRlc1xuICAgIHRoaXMuZGF0YS5zaWRlcy5mb3JFYWNoKCh2LCBpKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHYudmFsLnRvTGF0ZXhcbiAgICAgICAgPyB2LnZhbC50b0xhdGV4KHRydWUpXG4gICAgICAgIDogdi52YWwudG9TdHJpbmcoKVxuICAgICAgdGhpcy5sYWJlbHMucHVzaCh7XG4gICAgICAgIHBvczogdGhpcy5zaWRlUG9pbnRzW2ldLFxuICAgICAgICB0ZXh0cTogdi5oaWRkZW4gPyAnJyA6IHZhbHVlLFxuICAgICAgICB0ZXh0YTogdmFsdWUsXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCBzaWRlJyxcbiAgICAgICAgc3R5bGVhOiB2LmhpZGRlbiA/ICdhbnN3ZXIgc2lkZScgOiAnbm9ybWFsIHNpZGUnXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBvcGVyYXRpb25cbiAgICB0aGlzLmxhYmVscy5wdXNoKHtcbiAgICAgIHBvczogdGhpcy5vcGVyYXRpb25Qb2ludCxcbiAgICAgIHRleHRxOiB0aGlzLmRhdGEub3BuYW1lLFxuICAgICAgdGV4dGE6IHRoaXMuZGF0YS5vcG5hbWUsXG4gICAgICBzdHlsZXE6ICdub3JtYWwnLFxuICAgICAgc3R5bGVhOiAnbm9ybWFsJ1xuICAgIH0pXG5cbiAgICAvLyBzdHlsaW5nXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gIH1cblxuICByZW5kZXIgKCkge1xuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICBjb25zdCBuID0gdGhpcy5kYXRhLm5cblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBjb25zdCBwID0gdGhpcy52ZXJ0ZXhQb2ludHNbaV1cbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnZlcnRleFBvaW50c1soaSArIDEpICUgbl1cbiAgICAgIGN0eC5tb3ZlVG8ocC54LCBwLnkpXG4gICAgICBjdHgubGluZVRvKG5leHQueCwgbmV4dC55KVxuICAgIH1cbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIC8vIHBsYWNlIGxhYmVsc1xuICAgIHRoaXMucmVuZGVyTGFiZWxzKHRydWUpXG4gIH1cblxuICBzaG93QW5zd2VyICgpIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0YVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVhXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyh0cnVlKVxuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyh0cnVlKVxuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICB9XG59XG4iLCJpbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5pbXBvcnQgeyByYW5kRWxlbSB9IGZyb20gJ1V0aWxpdGllcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGVzdFEgZXh0ZW5kcyBUZXh0USB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYScsXG4gICAgICB0ZXN0MTogWydmb28nXSxcbiAgICAgIHRlc3QyOiB0cnVlXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICB0aGlzLmxhYmVsID0gc2V0dGluZ3MubGFiZWxcblxuICAgIC8vIHBpY2sgYSByYW5kb20gb25lIG9mIHRoZSBzZWxlY3RlZFxuICAgIGxldCB0ZXN0MVxuICAgIGlmIChzZXR0aW5ncy50ZXN0MS5sZW5ndGggPT09IDApIHtcbiAgICAgIHRlc3QxID0gJ25vbmUnXG4gICAgfSBlbHNlIHtcbiAgICAgIHRlc3QxID0gcmFuZEVsZW0oc2V0dGluZ3MudGVzdDEpXG4gICAgfVxuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gJ2Q6ICcgKyBzZXR0aW5ncy5kaWZmaWN1bHR5ICsgJ1xcXFxcXFxcIHRlc3QxOiAnICsgdGVzdDFcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJ3Rlc3QyOiAnICsgc2V0dGluZ3MudGVzdDJcblxuICAgIHRoaXMucmVuZGVyKClcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgeyByZXR1cm4gJ1Rlc3QgY29tbWFuZCB3b3JkJyB9XG59XG5cblRlc3RRLm9wdGlvbnNTcGVjID0gW1xuICB7XG4gICAgdGl0bGU6ICdUZXN0IG9wdGlvbiAxJyxcbiAgICBpZDogJ3Rlc3QxJyxcbiAgICB0eXBlOiAnc2VsZWN0LWluY2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogWydmb28nLCAnYmFyJywgJ3dpenonXSxcbiAgICBkZWZhdWx0OiBbXVxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdUZXN0IG9wdGlvbiAyJyxcbiAgICBpZDogJ3Rlc3QyJyxcbiAgICB0eXBlOiAnYm9vbCcsXG4gICAgZGVmYXVsdDogdHJ1ZVxuICB9XG5dXG4iLCJpbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5pbXBvcnQgeyByYW5kQmV0d2VlbiB9IGZyb20gJ1V0aWxpdGllcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQWRkQVplcm8gZXh0ZW5kcyBUZXh0USB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYSdcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIHRoaXMubGFiZWwgPSBzZXR0aW5ncy5sYWJlbFxuXG4gICAgLy8gcmFuZG9tIDIgZGlnaXQgJ2RlY2ltYWwnXG4gICAgY29uc3QgcSA9IFN0cmluZyhyYW5kQmV0d2VlbigxLCA5KSkgKyBTdHJpbmcocmFuZEJldHdlZW4oMCwgOSkpICsgJy4nICsgU3RyaW5nKHJhbmRCZXR3ZWVuKDAsIDkpKVxuICAgIGNvbnN0IGEgPSBxICsgJzAnXG5cbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSBxICsgJ1xcXFx0aW1lcyAxMCdcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJz0gJyArIGFcblxuICAgIHRoaXMucmVuZGVyKClcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRXZhbHVhdGUnXG4gIH1cbn1cblxuQWRkQVplcm8ub3B0aW9uc1NwZWMgPSBbXG5dXG4iLCJpbXBvcnQgeyByYW5kQmV0d2VlbiB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCBGcmFjdGlvbiBmcm9tICd2ZW5kb3IvZnJhY3Rpb24nXG5cbi8qIE1haW4gcXVlc3Rpb24gY2xhc3MuIFRoaXMgd2lsbCBiZSBzcHVuIG9mZiBpbnRvIGRpZmZlcmVudCBmaWxlIGFuZCBnZW5lcmFsaXNlZCAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRXF1YXRpb25PZkxpbmUgZXh0ZW5kcyBUZXh0USB7XG4gIC8vICdleHRlbmRzJyBRdWVzdGlvbiwgYnV0IG5vdGhpbmcgdG8gYWN0dWFsbHkgZXh0ZW5kXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgLy8gYm9pbGVycGxhdGVcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiAyXG4gICAgfVxuXG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcbiAgICBjb25zdCBkaWZmaWN1bHR5ID0gTWF0aC5jZWlsKHNldHRpbmdzLmRpZmZpY3VsdHkgLyAyKSAvLyBpbml0aWFsbHkgd3JpdHRlbiBmb3IgZGlmZmljdWx0eSAxLTQsIG5vdyBuZWVkIDEtMTBcblxuICAgIC8vIHF1ZXN0aW9uIGdlbmVyYXRpb24gYmVnaW5zIGhlcmVcbiAgICBsZXQgbSwgYywgeDEsIHkxLCB4MiwgeTJcbiAgICBsZXQgbWlubSwgbWF4bSwgbWluYywgbWF4Y1xuXG4gICAgc3dpdGNoIChkaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6IC8vIG0+MCwgYz49MFxuICAgICAgY2FzZSAyOlxuICAgICAgY2FzZSAzOlxuICAgICAgICBtaW5tID0gZGlmZmljdWx0eSA8IDMgPyAxIDogLTVcbiAgICAgICAgbWF4bSA9IDVcbiAgICAgICAgbWluYyA9IGRpZmZpY3VsdHkgPCAyID8gMCA6IC0xMFxuICAgICAgICBtYXhjID0gMTBcbiAgICAgICAgbSA9IHJhbmRCZXR3ZWVuKG1pbm0sIG1heG0pXG4gICAgICAgIGMgPSByYW5kQmV0d2VlbihtaW5jLCBtYXhjKVxuICAgICAgICB4MSA9IGRpZmZpY3VsdHkgPCAzID8gcmFuZEJldHdlZW4oMCwgMTApIDogcmFuZEJldHdlZW4oLTE1LCAxNSlcbiAgICAgICAgeTEgPSBtICogeDEgKyBjXG5cbiAgICAgICAgaWYgKGRpZmZpY3VsdHkgPCAzKSB7XG4gICAgICAgICAgeDIgPSByYW5kQmV0d2Vlbih4MSArIDEsIDE1KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHgyID0geDFcbiAgICAgICAgICB3aGlsZSAoeDIgPT09IHgxKSB7IHgyID0gcmFuZEJldHdlZW4oLTE1LCAxNSkgfTtcbiAgICAgICAgfVxuICAgICAgICB5MiA9IG0gKiB4MiArIGNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNDogLy8gbSBmcmFjdGlvbiwgcG9pbnRzIGFyZSBpbnRlZ2Vyc1xuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBjb25zdCBtZCA9IHJhbmRCZXR3ZWVuKDEsIDUpXG4gICAgICAgIGNvbnN0IG1uID0gcmFuZEJldHdlZW4oLTUsIDUpXG4gICAgICAgIG0gPSBuZXcgRnJhY3Rpb24obW4sIG1kKVxuICAgICAgICB4MSA9IG5ldyBGcmFjdGlvbihyYW5kQmV0d2VlbigtMTAsIDEwKSlcbiAgICAgICAgeTEgPSBuZXcgRnJhY3Rpb24ocmFuZEJldHdlZW4oLTEwLCAxMCkpXG4gICAgICAgIGMgPSBuZXcgRnJhY3Rpb24oeTEpLnN1YihtLm11bCh4MSkpXG4gICAgICAgIHgyID0geDEuYWRkKHJhbmRCZXR3ZWVuKDEsIDUpICogbS5kKVxuICAgICAgICB5MiA9IG0ubXVsKHgyKS5hZGQoYylcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB4c3RyID1cbiAgICAgIChtID09PSAwIHx8IChtLmVxdWFscyAmJiBtLmVxdWFscygwKSkpID8gJydcbiAgICAgICAgOiAobSA9PT0gMSB8fCAobS5lcXVhbHMgJiYgbS5lcXVhbHMoMSkpKSA/ICd4J1xuICAgICAgICAgIDogKG0gPT09IC0xIHx8IChtLmVxdWFscyAmJiBtLmVxdWFscygtMSkpKSA/ICcteCdcbiAgICAgICAgICAgIDogKG0udG9MYXRleCkgPyBtLnRvTGF0ZXgoKSArICd4J1xuICAgICAgICAgICAgICA6IChtICsgJ3gnKVxuXG4gICAgY29uc3QgY29uc3RzdHIgPSAvLyBUT0RPOiBXaGVuIG09Yz0wXG4gICAgICAoYyA9PT0gMCB8fCAoYy5lcXVhbHMgJiYgYy5lcXVhbHMoMCkpKSA/ICcnXG4gICAgICAgIDogKGMgPCAwKSA/ICgnIC0gJyArIChjLm5lZyA/IGMubmVnKCkudG9MYXRleCgpIDogLWMpKVxuICAgICAgICAgIDogKGMudG9MYXRleCkgPyAoJyArICcgKyBjLnRvTGF0ZXgoKSlcbiAgICAgICAgICAgIDogKCcgKyAnICsgYylcblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICcoJyArIHgxICsgJywgJyArIHkxICsgJylcXFxcdGV4dHsgYW5kIH0oJyArIHgyICsgJywgJyArIHkyICsgJyknXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICd5ID0gJyArIHhzdHIgKyBjb25zdHN0clxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdGaW5kIHRoZSBlcXVhdGlvbiBvZiB0aGUgbGluZSB0aHJvdWdoJ1xuICB9XG59XG4iLCIvKiBSZW5kZXJzIG1pc3NpbmcgYW5nbGVzIHByb2JsZW0gd2hlbiB0aGUgYW5nbGVzIGFyZSBhdCBhIHBvaW50XG4gKiBJLmUuIG9uIGEgc3RyYWlnaHQgbGluZSBvciBhcm91bmQgYSBwb2ludFxuICogQ291bGQgYWxzbyBiZSBhZGFwdGVkIHRvIGFuZ2xlcyBmb3JtaW5nIGEgcmlnaHQgYW5nbGVcbiAqXG4gKiBTaG91bGQgYmUgZmxleGlibGUgZW5vdWdoIGZvciBudW1lcmljYWwgcHJvYmxlbXMgb3IgYWxnZWJyYWljIG9uZXNcbiAqXG4gKi9cblxuaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgR3JhcGhpY1FWaWV3LCBMYWJlbCB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IHsgcm91bmREUCwgc2luRGVnLCBzb3J0VG9nZXRoZXIgfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc051bWJlckRhdGEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICByYWRpdXM6IG51bWJlclxuICBPOiBQb2ludFxuICBBOiBQb2ludFxuICBDOiBQb2ludFtdXG4gIHZpZXdBbmdsZXM6IG51bWJlcltdIC8vICdmdWRnZWQnIHZlcnNpb25zIG9mIGRhdGEuYW5nbGVzIGZvciBkaXNwbGF5XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhXG4gIHJvdGF0aW9uOiBudW1iZXJcbiAgXG4gIGNvbnN0cnVjdG9yIChkYXRhIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEsIG9wdGlvbnMgOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBzZXRzIHRoaXMud2lkdGggdGhpcy5oZWlnaHQsIGluaXRpYWxpc2VzIHRoaXMubGFiZWxzLCBjcmVhdGVzIGRvbSBlbGVtZW50c1xuICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aFxuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuaGVpZ2h0XG4gICAgY29uc3QgcmFkaXVzID0gdGhpcy5yYWRpdXMgPSBNYXRoLm1pbih3aWR0aCwgaGVpZ2h0KSAvIDIuNVxuICAgIGNvbnN0IG1pblZpZXdBbmdsZSA9IG9wdGlvbnMubWluVmlld0FuZ2xlIHx8IDI1XG5cbiAgICB0aGlzLnZpZXdBbmdsZXMgPSBmdWRnZUFuZ2xlcyh0aGlzLmRhdGEuYW5nbGVzLCAgbWluVmlld0FuZ2xlKVxuXG4gICAgLy8gU2V0IHVwIG1haW4gcG9pbnRzXG4gICAgdGhpcy5PID0gbmV3IFBvaW50KDAsIDApIC8vIGNlbnRlciBwb2ludFxuICAgIHRoaXMuQSA9IG5ldyBQb2ludChyYWRpdXMsIDApIC8vIGZpcnN0IHBvaW50XG4gICAgdGhpcy5DID0gW10gLy8gUG9pbnRzIGFyb3VuZCBvdXRzaWRlXG4gICAgbGV0IHRvdGFsYW5nbGUgPSAwIC8vIG5iIGluIHJhZGlhbnNcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZGF0YS5hbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRvdGFsYW5nbGUgKz0gdGhpcy52aWV3QW5nbGVzW2ldICogTWF0aC5QSSAvIDE4MFxuICAgICAgdGhpcy5DW2ldID0gUG9pbnQuZnJvbVBvbGFyKHJhZGl1cywgdG90YWxhbmdsZSlcbiAgICB9XG5cbiAgICAvLyBSYW5kb21seSByb3RhdGUgYW5kIGNlbnRlclxuICAgIHRoaXMucm90YXRpb24gPSAob3B0aW9ucy5yb3RhdGlvbiAhPT0gdW5kZWZpbmVkKSA/IHRoaXMucm90YXRlKG9wdGlvbnMucm90YXRpb24pIDogdGhpcy5yYW5kb21Sb3RhdGUoKVxuICAgIC8vIHRoaXMuc2NhbGVUb0ZpdCh3aWR0aCxoZWlnaHQsMTApXG4gICAgdGhpcy50cmFuc2xhdGUod2lkdGgvMiwgaGVpZ2h0LzIpXG5cbiAgICAvLyBTZXQgdXAgbGFiZWxzIChhZnRlciBzY2FsaW5nIGFuZCByb3RhdGluZylcbiAgICB0b3RhbGFuZ2xlID0gUG9pbnQuYW5nbGVGcm9tKHRoaXMuTyx0aGlzLkEpICogMTgwL01hdGguUEkgLy8gYW5nbGUgZnJvbSBPIHRoYXQgQSBpcyBcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudmlld0FuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gTGFiZWwgdGV4dFxuICAgICAgY29uc3QgbGFiZWwgOiBQYXJ0aWFsPExhYmVsPiA9IHt9XG4gICAgICBjb25zdCB0ZXh0cSA9IHRoaXMuZGF0YS5hbmdsZUxhYmVsc1tpXVxuICAgICAgY29uc3QgdGV4dGEgPSByb3VuZERQKHRoaXMuZGF0YS5hbmdsZXNbaV0sMikudG9TdHJpbmcoKSArICdeXFxcXGNpcmMnXG5cbiAgICAgIC8vIFBvc2l0aW9uaW5nXG4gICAgICBjb25zdCB0aGV0YSA9IHRoaXMudmlld0FuZ2xlc1tpXVxuICAgICAgY29uc3QgbWlkQW5nbGUgPSB0b3RhbGFuZ2xlICsgdGhldGEvMlxuICAgICAgY29uc3QgbWluRGlzdGFuY2UgPSAwLjMgLy8gYXMgYSBmcmFjdGlvbiBvZiByYWRpdXNcbiAgICAgIGNvbnN0IGxhYmVsTGVuZ3RoID0gTWF0aC5tYXgodGV4dHEubGVuZ3RoLCB0ZXh0YS5sZW5ndGgpIC0gJ15cXFxcY2lyYycubGVuZ3RoIC8vIMKwIHRha2VzIHVwIHZlcnkgbGl0dGxlIHNwYWNlXG5cbiAgICAgIC8qIEV4cGxhbmF0aW9uOiBGdXJ0aGVyIG91dCBpZjpcbiAgICAgICogICBNb3JlIHZlcnRpY2FsIChzaW4obWlkQW5nbGUpKVxuICAgICAgKiAgIExvbmdlciBsYWJlbFxuICAgICAgKiAgIHNtYWxsZXIgYW5nbGVcbiAgICAgICogICBFLmcuIHRvdGFsbHkgdmVydGljYWwsIDQ1wrAsIGxlbmd0aCA9IDNcbiAgICAgICogICBkID0gMC4zICsgMSozLzQ1ID0gMC4zICsgMC43ID0gMC4zNyBcbiAgICAgICovXG4gICAgICAvL2NvbnN0IGZhY3RvciA9IDEgICAgICAgIC8vIGNvbnN0YW50IG9mIHByb3BvcnRpb25hbGl0eS4gU2V0IGJ5IHRyaWFsIGFuZCBlcnJvclxuICAgICAgLy9sZXQgZGlzdGFuY2UgPSBtaW5EaXN0YW5jZSArIGZhY3RvciAqIE1hdGguYWJzKHNpbkRlZyhtaWRBbmdsZSkpICogbGFiZWxMZW5ndGggLyB0aGV0YVxuXG4gICAgICAvLyBKdXN0IHJldmVydCB0byBvbGQgbWV0aG9kXG5cbiAgICAgIGNvbnN0IGRpc3RhbmNlID0gMC40ICsgNi90aGV0YVxuXG4gICAgICBsYWJlbC5wb3MgPSBQb2ludC5mcm9tUG9sYXJEZWcocmFkaXVzICogZGlzdGFuY2UsIHRvdGFsYW5nbGUgKyB0aGV0YSAvIDIpLnRyYW5zbGF0ZSh0aGlzLk8ueCx0aGlzLk8ueSksXG4gICAgICBsYWJlbC50ZXh0cSA9IHRleHRxXG4gICAgICBsYWJlbC5zdHlsZXEgPSAnbm9ybWFsJ1xuXG4gICAgICBpZiAodGhpcy5kYXRhLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSB0ZXh0YVxuICAgICAgICBsYWJlbC5zdHlsZWEgPSAnYW5zd2VyJ1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSBsYWJlbC50ZXh0cVxuICAgICAgICBsYWJlbC5zdHlsZWEgPSBsYWJlbC5zdHlsZXFcbiAgICAgIH1cblxuICAgICAgbGFiZWwudGV4dCA9IGxhYmVsLnRleHRxXG4gICAgICBsYWJlbC5zdHlsZSA9IGxhYmVsLnN0eWxlcVxuXG4gICAgICB0aGlzLmxhYmVsc1tpXSA9IGxhYmVsIGFzIExhYmVsXG5cbiAgICAgIHRvdGFsYW5nbGUgKz0gdGhldGFcbiAgICB9XG5cbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcblxuICB9XG5cbiAgcmVuZGVyICgpIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG5cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpIC8vIGNsZWFyXG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBjdHgubW92ZVRvKHRoaXMuTy54LCB0aGlzLk8ueSkgLy8gZHJhdyBsaW5lc1xuICAgIGN0eC5saW5lVG8odGhpcy5BLngsIHRoaXMuQS55KVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5DLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjdHgubW92ZVRvKHRoaXMuTy54LCB0aGlzLk8ueSlcbiAgICAgIGN0eC5saW5lVG8odGhpcy5DW2ldLngsIHRoaXMuQ1tpXS55KVxuICAgIH1cbiAgICBjdHguc3Ryb2tlU3R5bGUgPSAnZ3JheSdcbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGxldCB0b3RhbGFuZ2xlID0gdGhpcy5yb3RhdGlvblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy52aWV3QW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCB0aGV0YSA9IHRoaXMudmlld0FuZ2xlc1tpXSAqIE1hdGguUEkgLyAxODBcbiAgICAgIC8vIDAuMDcvdGhldGEgcmFkaWFucyB+PSA0L3RoZXRhXG4gICAgICBjdHguYXJjKHRoaXMuTy54LCB0aGlzLk8ueSwgdGhpcy5yYWRpdXMgKiAoMC4yICsgMC4wNyAvIHRoZXRhKSwgdG90YWxhbmdsZSwgdG90YWxhbmdsZSArIHRoZXRhKVxuICAgICAgY3R4LnN0cm9rZSgpXG4gICAgICB0b3RhbGFuZ2xlICs9IHRoZXRhXG4gICAgfVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgLy8gdGVzdGluZyBsYWJlbCBwb3NpdGlvbmluZzpcbiAgICAvLyB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgIC8vIGN0eC5maWxsU3R5bGUgPSAncmVkJ1xuICAgIC8vIGN0eC5maWxsUmVjdChsLnBvcy54IC0gMSwgbC5wb3MueSAtIDEsIDMsIDMpXG4gICAgLy8gfSlcblxuICAgIHRoaXMucmVuZGVyTGFiZWxzKGZhbHNlKVxuICB9XG5cbiAgZ2V0IGFsbHBvaW50cyAoKSB7XG4gICAgbGV0IGFsbHBvaW50cyA9IFt0aGlzLkEsIHRoaXMuT11cbiAgICBhbGxwb2ludHMgPSBhbGxwb2ludHMuY29uY2F0KHRoaXMuQylcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGZ1bmN0aW9uIChsKSB7XG4gICAgICBhbGxwb2ludHMucHVzaChsLnBvcylcbiAgICB9KVxuICAgIHJldHVybiBhbGxwb2ludHNcbiAgfVxufVxuXG4vKipcbiAqIEFkanVzdHMgYSBzZXQgb2YgYW5nbGVzIHNvIHRoYXQgYWxsIGFuZ2xlcyBhcmUgZ3JlYXRlciB0aGFuIHttaW5BbmdsZX0gYnkgcmVkdWNpbmcgb3RoZXIgYW5nbGVzIGluIHByb3BvcnRpb25cbiAqIEBwYXJhbSBhbmdsZXMgVGhlIHNldCBvZiBhbmdsZXMgdG8gYWRqdXN0XG4gKiBAcGFyYW0gbWluQW5nbGUgVGhlIHNtYWxsZXN0IGFuZ2xlIGluIHRoZSBvdXRwdXRcbiAqL1xuZnVuY3Rpb24gZnVkZ2VBbmdsZXMoYW5nbGVzOiBudW1iZXJbXSwgbWluQW5nbGU6IG51bWJlcikgOiBudW1iZXJbXSB7XG4gIGNvbnN0IG1hcHBlZEFuZ2xlcyA9IGFuZ2xlcy5tYXAoKHgsaSk9Plt4LGldKSAvLyByZW1lbWJlciBvcmlnaW5hbCBpbmRpY2VzXG4gIGNvbnN0IHNtYWxsQW5nbGVzID0gbWFwcGVkQW5nbGVzLmZpbHRlcih4PT4geFswXTxtaW5BbmdsZSlcbiAgY29uc3QgbGFyZ2VBbmdsZXMgPSBtYXBwZWRBbmdsZXMuZmlsdGVyKHg9PiB4WzBdPj1taW5BbmdsZSlcbiAgbGV0IGxhcmdlQW5nbGVTdW0gPSBsYXJnZUFuZ2xlcy5yZWR1Y2UoIChhY2N1bXVsYXRvcixjdXJyZW50VmFsdWUpID0+IGFjY3VtdWxhdG9yICsgY3VycmVudFZhbHVlWzBdICwgMClcblxuICBzbWFsbEFuZ2xlcy5mb3JFYWNoKCBzbWFsbCA9PiB7XG4gICAgY29uc3QgZGlmZmVyZW5jZSA9IG1pbkFuZ2xlIC0gc21hbGxbMF1cbiAgICBzbWFsbFswXSArPSBkaWZmZXJlbmNlXG4gICAgbGFyZ2VBbmdsZXMuZm9yRWFjaCggbGFyZ2UgPT4ge1xuICAgICAgY29uc3QgcmVkdWN0aW9uID0gZGlmZmVyZW5jZSAqIGxhcmdlWzBdL2xhcmdlQW5nbGVTdW1cbiAgICAgIGxhcmdlWzBdIC09IHJlZHVjdGlvblxuICAgIH0pXG4gIH0pXG5cbiAgcmV0dXJuICBzbWFsbEFuZ2xlcy5jb25jYXQobGFyZ2VBbmdsZXMpICAgICAgIC8vIGNvbWJpbmUgdG9nZXRoZXJcbiAgICAgICAgICAgICAgICAgICAgIC5zb3J0KCh4LHkpID0+IHhbMV0teVsxXSkgIC8vIHNvcnQgYnkgcHJldmlvdXMgaW5kZXhcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAoeD0+eFswXSkgICAgICAgICAgICAgIC8vIHN0cmlwIG91dCBpbmRleFxufSIsIi8qKiBHZW5lcmF0ZXMgYW5kIGhvbGRzIGRhdGEgZm9yIGEgbWlzc2luZyBhbmdsZXMgcXVlc3Rpb24sIHdoZXJlIHRoZXNlIGlzIHNvbWUgZ2l2ZW4gYW5nbGUgc3VtXG4gKiAgQWdub3N0aWMgYXMgdG8gaG93IHRoZXNlIGFuZ2xlcyBhcmUgYXJyYW5nZWQgKGUuZy4gaW4gYSBwb2x5Z29uIG9yIGFyb3VuZCBzb20gcG9pbnQpXG4gKlxuICogT3B0aW9ucyBwYXNzZWQgdG8gY29uc3RydWN0b3JzOlxuICogIGFuZ2xlU3VtOjpJbnQgdGhlIG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqICBtaW5BbmdsZTo6SW50IHRoZSBzbWFsbGVzdCBhbmdsZSB0byBnZW5lcmF0ZVxuICogIG1pbk46OkludCAgICAgdGhlIHNtYWxsZXN0IG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqICBtYXhOOjpJbnQgICAgIHRoZSBsYXJnZXN0IG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqXG4gKi9cblxuaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUURhdGF9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc0RhdGEgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNEYXRhJ1xuaW1wb3J0IHtNaXNzaW5nQW5nbGVPcHRpb25zIGFzIE9wdGlvbnN9IGZyb20gJy4vTnVtYmVyT3B0aW9ucycgXG5cbmV4cG9ydCBjbGFzcyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSBpbXBsZW1lbnRzIE1pc3NpbmdBbmdsZXNEYXRhIHtcbiAgYW5nbGVzIDogbnVtYmVyW10gLy8gbGlzdCBvZiBhbmdsZXNcbiAgbWlzc2luZyA6IGJvb2xlYW5bXSAvLyB0cnVlIGlmIG1pc3NpbmdcbiAgYW5nbGVTdW0gOiBudW1iZXIgLy8gd2hhdCB0aGUgYW5nbGVzIGFkZCB1cCB0b1xuICBhbmdsZUxhYmVsczogc3RyaW5nW11cblxuICBjb25zdHJ1Y3RvciAoYW5nbGVTdW0gOiBudW1iZXIsIGFuZ2xlczogbnVtYmVyW10sIG1pc3Npbmc6IGJvb2xlYW5bXSwgYW5nbGVMYWJlbHM/OiBzdHJpbmdbXSkge1xuICAgIC8vIGluaXRpYWxpc2VzIHdpdGggYW5nbGVzIGdpdmVuIGV4cGxpY2l0bHlcbiAgICBpZiAoYW5nbGVzID09PSBbXSkgeyB0aHJvdyBuZXcgRXJyb3IoJ011c3QgZ2l2ZSBhbmdsZXMnKSB9XG4gICAgaWYgKE1hdGgucm91bmQoYW5nbGVzLnJlZHVjZSgoeCwgeSkgPT4geCArIHkpKSAhPT0gYW5nbGVTdW0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQW5nbGUgc3VtIG11c3QgYmUgJHthbmdsZVN1bX1gKVxuICAgIH1cblxuICAgIHRoaXMuYW5nbGVzID0gYW5nbGVzIC8vIGxpc3Qgb2YgYW5nbGVzXG4gICAgdGhpcy5taXNzaW5nID0gbWlzc2luZyAvLyB3aGljaCBhbmdsZXMgYXJlIG1pc3NpbmcgLSBhcnJheSBvZiBib29sZWFuc1xuICAgIHRoaXMuYW5nbGVTdW0gPSBhbmdsZVN1bSAvLyBzdW0gb2YgYW5nbGVzXG4gICAgdGhpcy5hbmdsZUxhYmVscyA9IGFuZ2xlTGFiZWxzIHx8IFtdXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IFBhcnRpYWw8T3B0aW9ucz4gPSB7XG4gICAgICAvKiBhbmdsZVN1bTogMTgwICovIC8vIG11c3QgYmUgc2V0IGJ5IGNhbGxlclxuICAgICAgbWluQW5nbGU6IDE1LFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDRcbiAgICB9XG5cbiAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICBsZXQgcXVlc3Rpb24gOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YVxuICAgIGlmIChvcHRpb25zLnJlcGVhdGVkKSB7XG4gICAgICBxdWVzdGlvbiA9IHRoaXMucmFuZG9tUmVwZWF0ZWQob3B0aW9ucylcbiAgICB9IGVsc2Uge1xuICAgICAgcXVlc3Rpb24gPSB0aGlzLnJhbmRvbVNpbXBsZShvcHRpb25zKVxuICAgIH1cbiAgICBxdWVzdGlvbi5pbml0TGFiZWxzKClcbiAgICByZXR1cm4gcXVlc3Rpb25cbiAgfVxuXG4gIHN0YXRpYyByYW5kb21TaW1wbGUgKG9wdGlvbnM6IE9wdGlvbnMpOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB7XG5cbiAgICBpZiAoIW9wdGlvbnMuYW5nbGVTdW0pIHsgdGhyb3cgbmV3IEVycm9yKCdObyBhbmdsZSBzdW0gZ2l2ZW4nKSB9XG5cbiAgICBjb25zdCBhbmdsZVN1bSA9IG9wdGlvbnMuYW5nbGVTdW1cbiAgICBjb25zdCBuID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5OLCBvcHRpb25zLm1heE4pXG4gICAgY29uc3QgbWluQW5nbGUgPSBvcHRpb25zLm1pbkFuZ2xlXG5cbiAgICBpZiAobiA8IDIpIHRocm93IG5ldyBFcnJvcignQ2FuXFwndCBoYXZlIG1pc3NpbmcgZmV3ZXIgdGhhbiAyIGFuZ2xlcycpXG5cbiAgICAvLyBCdWlsZCB1cCBhbmdsZXNcbiAgICBjb25zdCBhbmdsZXMgPSBbXVxuICAgIGxldCBsZWZ0ID0gYW5nbGVTdW1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG4gLSAxOyBpKyspIHtcbiAgICAgIGNvbnN0IG1heEFuZ2xlID0gbGVmdCAtIG1pbkFuZ2xlICogKG4gLSBpIC0gMSlcbiAgICAgIGNvbnN0IG5leHRBbmdsZSA9IHJhbmRCZXR3ZWVuKG1pbkFuZ2xlLCBtYXhBbmdsZSlcbiAgICAgIGxlZnQgLT0gbmV4dEFuZ2xlXG4gICAgICBhbmdsZXMucHVzaChuZXh0QW5nbGUpXG4gICAgfVxuICAgIGFuZ2xlc1tuIC0gMV0gPSBsZWZ0XG5cbiAgICAvLyBwaWNrIG9uZSB0byBiZSBtaXNzaW5nXG4gICAgY29uc3QgbWlzc2luZyA9IFtdXG4gICAgbWlzc2luZy5sZW5ndGggPSBuXG4gICAgbWlzc2luZy5maWxsKGZhbHNlKVxuICAgIG1pc3NpbmdbcmFuZEJldHdlZW4oMCwgbiAtIDEpXSA9IHRydWVcblxuICAgIHJldHVybiBuZXcgdGhpcyhhbmdsZVN1bSwgYW5nbGVzLCBtaXNzaW5nKVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbVJlcGVhdGVkIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBjb25zdCBhbmdsZVN1bTogbnVtYmVyID0gb3B0aW9ucy5hbmdsZVN1bVxuICAgIGNvbnN0IG1pbkFuZ2xlOiBudW1iZXIgPSBvcHRpb25zLm1pbkFuZ2xlXG5cbiAgICBjb25zdCBuOiBudW1iZXIgPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbk4sIG9wdGlvbnMubWF4TilcblxuICAgIGNvbnN0IG06IG51bWJlciA9IG9wdGlvbnMubk1pc3NpbmcgfHwgKE1hdGgucmFuZG9tKCkgPCAwLjEgPyBuIDogcmFuZEJldHdlZW4oMiwgbiAtIDEpKVxuXG4gICAgaWYgKG4gPCAyIHx8IG0gPCAxIHx8IG0gPiBuKSB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgYXJndW1lbnRzOiBuPSR7bn0sIG09JHttfWApXG5cbiAgICAvLyBBbGwgbWlzc2luZyAtIGRvIGFzIGEgc2VwYXJhdGUgY2FzZVxuICAgIGlmIChuID09PSBtKSB7XG4gICAgICBjb25zdCBhbmdsZXMgPSBbXVxuICAgICAgYW5nbGVzLmxlbmd0aCA9IG5cbiAgICAgIGFuZ2xlcy5maWxsKGFuZ2xlU3VtIC8gbilcblxuICAgICAgY29uc3QgbWlzc2luZyA9IFtdXG4gICAgICBtaXNzaW5nLmxlbmd0aCA9IG5cbiAgICAgIG1pc3NpbmcuZmlsbCh0cnVlKVxuXG4gICAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZylcbiAgICB9XG5cbiAgICBjb25zdCBhbmdsZXM6IG51bWJlcltdID0gW11cbiAgICBjb25zdCBtaXNzaW5nOiBib29sZWFuW10gPSBbXVxuICAgIG1pc3NpbmcubGVuZ3RoID0gblxuICAgIG1pc3NpbmcuZmlsbChmYWxzZSlcblxuICAgIC8vIGNob29zZSBhIHZhbHVlIGZvciB0aGUgbWlzc2luZyBhbmdsZXNcbiAgICBjb25zdCBtYXhSZXBlYXRlZEFuZ2xlID0gKGFuZ2xlU3VtIC0gbWluQW5nbGUgKiAobiAtIG0pKSAvIG1cbiAgICBjb25zdCByZXBlYXRlZEFuZ2xlID0gcmFuZEJldHdlZW4obWluQW5nbGUsIG1heFJlcGVhdGVkQW5nbGUpXG5cbiAgICAvLyBjaG9vc2UgdmFsdWVzIGZvciB0aGUgb3RoZXIgYW5nbGVzXG4gICAgY29uc3Qgb3RoZXJBbmdsZXM6IG51bWJlcltdID0gW11cbiAgICBsZXQgbGVmdCA9IGFuZ2xlU3VtIC0gcmVwZWF0ZWRBbmdsZSAqIG1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG4gLSBtIC0gMTsgaSsrKSB7XG4gICAgICBjb25zdCBtYXhBbmdsZSA9IGxlZnQgLSBtaW5BbmdsZSAqIChuIC0gbSAtIGkgLSAxKVxuICAgICAgY29uc3QgbmV4dEFuZ2xlID0gcmFuZEJldHdlZW4obWluQW5nbGUsIG1heEFuZ2xlKVxuICAgICAgbGVmdCAtPSBuZXh0QW5nbGVcbiAgICAgIG90aGVyQW5nbGVzLnB1c2gobmV4dEFuZ2xlKVxuICAgIH1cbiAgICBvdGhlckFuZ2xlc1tuIC0gbSAtIDFdID0gbGVmdFxuXG4gICAgLy8gY2hvb3NlIHdoZXJlIHRoZSBtaXNzaW5nIGFuZ2xlcyBhcmVcbiAgICB7XG4gICAgICBsZXQgaSA9IDBcbiAgICAgIHdoaWxlIChpIDwgbSkge1xuICAgICAgICBjb25zdCBqID0gcmFuZEJldHdlZW4oMCwgbiAtIDEpXG4gICAgICAgIGlmIChtaXNzaW5nW2pdID09PSBmYWxzZSkge1xuICAgICAgICAgIG1pc3Npbmdbal0gPSB0cnVlXG4gICAgICAgICAgYW5nbGVzW2pdID0gcmVwZWF0ZWRBbmdsZVxuICAgICAgICAgIGkrK1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZmlsbCBpbiB0aGUgb3RoZXIgYW5nbGVzXG4gICAge1xuICAgICAgbGV0IGogPSAwXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICBpZiAobWlzc2luZ1tpXSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBhbmdsZXNbaV0gPSBvdGhlckFuZ2xlc1tqXVxuICAgICAgICAgIGorK1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgdGhpcyhhbmdsZVN1bSwgYW5nbGVzLCBtaXNzaW5nKVxuICB9XG5cbiAgaW5pdExhYmVscygpIDogdm9pZCB7XG4gICAgY29uc3QgbiA9IHRoaXMuYW5nbGVzLmxlbmd0aFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBpZiAoIXRoaXMubWlzc2luZ1tpXSkge1xuICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzW2ldID0gYCR7dGhpcy5hbmdsZXNbaV0udG9TdHJpbmcoKX1eXFxcXGNpcmNgXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzW2ldID0gJ3heXFxcXGNpcmMnXG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iLCIvKiBRdWVzdGlvbiB0eXBlIGNvbXByaXNpbmcgbnVtZXJpY2FsIG1pc3NpbmcgYW5nbGVzIGFyb3VuZCBhIHBvaW50IGFuZFxuICogYW5nbGVzIG9uIGEgc3RyYWlnaHQgbGluZSAoc2luY2UgdGhlc2UgYXJlIHZlcnkgc2ltaWxhciBudW1lcmljYWxseSBhcyB3ZWxsXG4gKiBhcyBncmFwaGljYWxseS5cbiAqXG4gKiBBbHNvIGNvdmVycyBjYXNlcyB3aGVyZSBtb3JlIHRoYW4gb25lIGFuZ2xlIGlzIGVxdWFsXG4gKlxuICovXG5cbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZFEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhXG4gIHZpZXc6IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3XG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhLCB2aWV3OiBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldykgeyAvLyBlZmZlY3RpdmVseSBwcml2YXRlXG4gICAgc3VwZXIoKSAvLyBidWJibGVzIHRvIFFcbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgdGhpcy52aWV3ID0gdmlld1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogTWlzc2luZ0FuZ2xlT3B0aW9ucywgdmlld09wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyApIDogTWlzc2luZ0FuZ2xlc0Fyb3VuZFEge1xuICAgIGNvbnN0IGRlZmF1bHRzIDogTWlzc2luZ0FuZ2xlT3B0aW9ucyA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5BbmdsZTogMTAsXG4gICAgICBtaW5OOiAyLFxuICAgICAgbWF4TjogNCxcbiAgICAgIHJlcGVhdGVkOiBmYWxzZVxuICAgIH1cbiAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc051bWJlckRhdGEucmFuZG9tKG9wdGlvbnMpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyhkYXRhLCB2aWV3T3B0aW9ucykgLy8gVE9ETyBlbGltaW5hdGUgcHVibGljIGNvbnN0cnVjdG9yc1xuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kUShkYXRhLCB2aWV3KVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSA6IHN0cmluZyB7IHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZScgfVxufVxuIiwiaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgR3JhcGhpY1FEYXRhLCBHcmFwaGljUVZpZXcsIExhYmVsIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgeyBzaW5EZWcsIGRhc2hlZExpbmUsIHJvdW5kRFAgfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICBBIDogUG9pbnQgLy8gdGhlIHZlcnRpY2VzIG9mIHRoZSB0cmlhbmdsZVxuICBCIDogUG9pbnRcbiAgQyA6IFBvaW50XG4gIHJvdGF0aW9uOiBudW1iZXJcbiAgLy8gSW5oZXJpdGVkIG1lbWJlcnM6XG4gIGxhYmVsczogTGFiZWxbXVxuICBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50XG4gIERPTTogSFRNTEVsZW1lbnRcbiAgd2lkdGg6IG51bWJlclxuICBoZWlnaHQ6IG51bWJlclxuICBkYXRhOiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhXG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEsIG9wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc2V0cyB0aGlzLndpZHRoIHRoaXMuaGVpZ2h0LCB0aGlzLmRhdGEgaW5pdGlhbGlzZXMgdGhpcy5sYWJlbHMsIGNyZWF0ZXMgZG9tIGVsZW1lbnRzXG4gICAgY29uc3Qgd2lkdGggPSB0aGlzLndpZHRoXG4gICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5oZWlnaHRcblxuICAgIGNvbnN0IGRpc3BsYXlBbmdsZXMgOiBudW1iZXJbXSA9IFtdXG5cbiAgICAvLyBnZW5lcmF0ZSBwb2ludHMgKHdpdGggbG9uZ2VzdCBzaWRlIDFcbiAgICB0aGlzLkEgPSBuZXcgUG9pbnQoMCwgMClcbiAgICB0aGlzLkIgPSBQb2ludC5mcm9tUG9sYXJEZWcoMSwgZGF0YS5hbmdsZXNbMF0pXG4gICAgdGhpcy5DID0gbmV3IFBvaW50KFxuICAgICAgc2luRGVnKHRoaXMuZGF0YS5hbmdsZXNbMV0pIC8gc2luRGVnKHRoaXMuZGF0YS5hbmdsZXNbMl0pLCAwXG4gICAgKVxuXG4gICAgLy8gQ3JlYXRlIGxhYmVsc1xuICAgIGNvbnN0IGluQ2VudGVyID0gUG9pbnQuaW5DZW50ZXIodGhpcy5BLCB0aGlzLkIsIHRoaXMuQylcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICBjb25zdCBwID0gW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdW2ldXG5cbiAgICAgIGNvbnN0IGxhYmVsIDogUGFydGlhbDxMYWJlbD4gPSB7XG4gICAgICAgIHRleHRxOiB0aGlzLmRhdGEuYW5nbGVMYWJlbHNbaV0sXG4gICAgICAgIHRleHQ6IHRoaXMuZGF0YS5hbmdsZUxhYmVsc1tpXSxcbiAgICAgICAgc3R5bGVxOiAnbm9ybWFsJyxcbiAgICAgICAgc3R5bGU6ICdub3JtYWwnLFxuICAgICAgICBwb3M6IFBvaW50Lm1lYW4ocCwgcCwgaW5DZW50ZXIpIFxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5kYXRhLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSByb3VuZERQKHRoaXMuZGF0YS5hbmdsZXNbaV0sMikudG9TdHJpbmcoKSArICdeXFxcXGNpcmMnXG4gICAgICAgIGxhYmVsLnN0eWxlYSA9ICdhbnN3ZXInXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsYWJlbC50ZXh0YSA9IGxhYmVsLnRleHRxXG4gICAgICAgIGxhYmVsLnN0eWxlYSA9IGxhYmVsLnN0eWxlcVxuICAgICAgfVxuXG4gICAgICB0aGlzLmxhYmVsc1tpXSA9IGxhYmVsIGFzIExhYmVsXG4gICAgfVxuXG4gICAgLy8gcm90YXRlIHJhbmRvbWx5XG4gICAgdGhpcy5yb3RhdGlvbiA9IChvcHRpb25zLnJvdGF0aW9uICE9PSB1bmRlZmluZWQpID8gdGhpcy5yb3RhdGUob3B0aW9ucy5yb3RhdGlvbikgOiB0aGlzLnJhbmRvbVJvdGF0ZSgpXG5cbiAgICAvLyBzY2FsZSBhbmQgZml0XG4gICAgLy8gc2NhbGUgdG8gc2l6ZVxuICAgIGNvbnN0IG1hcmdpbiA9IDBcbiAgICBsZXQgdG9wbGVmdCA9IFBvaW50Lm1pbihbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgbGV0IGJvdHRvbXJpZ2h0ID0gUG9pbnQubWF4KFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBjb25zdCB0b3RhbFdpZHRoID0gYm90dG9tcmlnaHQueCAtIHRvcGxlZnQueFxuICAgIGNvbnN0IHRvdGFsSGVpZ2h0ID0gYm90dG9tcmlnaHQueSAtIHRvcGxlZnQueVxuICAgIHRoaXMuc2NhbGUoTWF0aC5taW4oKHdpZHRoIC0gbWFyZ2luKSAvIHRvdGFsV2lkdGgsIChoZWlnaHQgLSBtYXJnaW4pIC8gdG90YWxIZWlnaHQpKSAvLyAxNXB4IG1hcmdpblxuXG4gICAgLy8gbW92ZSB0byBjZW50cmVcbiAgICB0b3BsZWZ0ID0gUG9pbnQubWluKFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBib3R0b21yaWdodCA9IFBvaW50Lm1heChbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbih0b3BsZWZ0LCBib3R0b21yaWdodClcbiAgICB0aGlzLnRyYW5zbGF0ZSh3aWR0aCAvIDIgLSBjZW50ZXIueCwgaGVpZ2h0IC8gMiAtIGNlbnRlci55KSAvLyBjZW50cmVcbiAgfVxuXG4gIHJlbmRlciAoKSB7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICAgIGNvbnN0IHZlcnRpY2VzID0gW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdXG4gICAgY29uc3QgYXBleCA9IHRoaXMuZGF0YS5hcGV4IC8vIGhtbW1cblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGN0eC5tb3ZlVG8odGhpcy5BLngsIHRoaXMuQS55KVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGNvbnN0IHAgPSB2ZXJ0aWNlc1tpXVxuICAgICAgY29uc3QgbmV4dCA9IHZlcnRpY2VzWyhpICsgMSkgJSAzXVxuICAgICAgaWYgKGFwZXggPT09IGkgfHwgYXBleCA9PT0gKGkgKyAxKSAlIDMpIHsgLy8gdG8vZnJvbSBhcGV4IC0gZHJhdyBkYXNoZWQgbGluZVxuICAgICAgICBkYXNoZWRMaW5lKGN0eCwgcC54LCBwLnksIG5leHQueCwgbmV4dC55KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3R4LmxpbmVUbyhuZXh0LngsIG5leHQueSlcbiAgICAgIH1cbiAgICB9XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gJ2dyYXknXG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGdldCBhbGxwb2ludHMgKCkge1xuICAgIGNvbnN0IGFsbHBvaW50cyA9IFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXVxuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7IGFsbHBvaW50cy5wdXNoKGwucG9zKSB9KVxuICAgIHJldHVybiBhbGxwb2ludHNcbiAgfVxufVxuIiwiLyogRXh0ZW5kcyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSBpbiBvcmRlciB0byBkbyBpc29zY2VsZXMgdHJpYW5nbGVzLCB3aGljaCBnZW5lcmF0ZSBhIGJpdCBkaWZmZXJlbnRseSAqL1xuXG5pbXBvcnQgeyBmaXJzdFVuaXF1ZUluZGV4LCBzb3J0VG9nZXRoZXIgfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUURhdGEgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhfSBmcm9tICcuL01pc3NpbmdBbmdsZXNOdW1iZXJEYXRhJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxudHlwZSBPcHRpb25zID0gTWlzc2luZ0FuZ2xlT3B0aW9ucyAmIHtnaXZlbkFuZ2xlPzogJ2FwZXgnIHwgJ2Jhc2UnfVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhIGV4dGVuZHMgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEge1xuICAgIGFwZXg/OiAwIHwgMSB8IDIgfCB1bmRlZmluZWQgLy8gd2hpY2ggb2YgdGhlIHRocmVlIGdpdmVuIGFuZ2xlcyBpcyB0aGUgYXBleCBvZiBhbiBpc29zY2VsZXMgdHJpYW5nbGVcbiAgICBjb25zdHJ1Y3RvcihhbmdsZVN1bTogbnVtYmVyLCBhbmdsZXM6IG51bWJlcltdLCBtaXNzaW5nOiBib29sZWFuW10sIGFuZ2xlTGFiZWxzPzogc3RyaW5nW10sIGFwZXg/OiAwfDF8Mnx1bmRlZmluZWQpIHtcbiAgICAgICAgc3VwZXIoYW5nbGVTdW0sYW5nbGVzLG1pc3NpbmcsYW5nbGVMYWJlbHMpXG4gICAgICAgIHRoaXMuYXBleCA9IGFwZXhcbiAgICB9XG5cbiAgICBzdGF0aWMgcmFuZG9tUmVwZWF0ZWQob3B0aW9uczogT3B0aW9ucykge1xuICAgICAgICBvcHRpb25zLm5NaXNzaW5nID0gMlxuICAgICAgICBvcHRpb25zLmdpdmVuQW5nbGUgPSBvcHRpb25zLmdpdmVuQW5nbGUgfHwgTWF0aC5yYW5kb20oKSA8IDAuNT8gJ2FwZXgnIDogJ2Jhc2UnXG5cbiAgICAgICAgLy8gZ2VuZXJhdGUgdGhlIHJhbmRvbSBhbmdsZXMgd2l0aCByZXBldGl0aW9uIGZpcnN0IGJlZm9yZSBtYXJraW5nIGFwZXggZm9yIGRyYXdpbmdcbiAgICAgICAgbGV0IHF1ZXN0aW9uID0gc3VwZXIucmFuZG9tUmVwZWF0ZWQob3B0aW9ucykgYXMgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSAvLyBhbGxvd2VkIHNpbmNlIHVuZGVmaW5lZCBcXGluIGFwZXhcblxuICAgICAgICAvLyBPbGQgaW1wbGVtZW50YXRpb24gaGFkIHNvcnRpbmcgdGhlIGFycmF5IC0gbm90IHN1cmUgd2h5XG4gICAgICAgIC8vIHNvcnRUb2dldGhlcihxdWVzdGlvbi5hbmdsZXMscXVlc3Rpb24ubWlzc2luZywoeCx5KSA9PiB4IC0geSlcblxuICAgICAgICBxdWVzdGlvbi5hcGV4ID0gZmlyc3RVbmlxdWVJbmRleChxdWVzdGlvbi5hbmdsZXMpIGFzIDAgfCAxIHwgMlxuICAgICAgICBxdWVzdGlvbi5taXNzaW5nID0gW3RydWUsdHJ1ZSx0cnVlXVxuICAgICAgICBcbiAgICAgICAgaWYgKG9wdGlvbnMuZ2l2ZW5BbmdsZSA9PT0gJ2FwZXgnKSB7XG4gICAgICAgICAgICBxdWVzdGlvbi5taXNzaW5nW3F1ZXN0aW9uLmFwZXhdID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBxdWVzdGlvbi5taXNzaW5nWyhxdWVzdGlvbi5hcGV4ICsgMSklM10gPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHF1ZXN0aW9uLmluaXRMYWJlbHMoKVxuXG4gICAgICAgcmV0dXJuIHF1ZXN0aW9uXG4gICAgfSBcblxuICAgIGluaXRMYWJlbHMoKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IG4gPSB0aGlzLmFuZ2xlcy5sZW5ndGhcbiAgICAgICAgbGV0IGogPSAwIC8vIGtlZXAgdHJhY2sgb2YgdW5rbm93bnNcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5taXNzaW5nW2ldKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hbmdsZUxhYmVsc1tpXSA9IGAke3RoaXMuYW5nbGVzW2ldLnRvU3RyaW5nKCl9XlxcXFxjaXJjYFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzW2ldID0gYCR7U3RyaW5nLmZyb21DaGFyQ29kZSgxMjAgKyBqKX1eXFxcXGNpcmNgIC8vIDEyMCA9ICd4J1xuICAgICAgICAgICAgICAgIGorK1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG59IiwiLyogTWlzc2luZyBhbmdsZXMgaW4gdHJpYW5nbGUgLSBudW1lcmljYWwgKi9cblxuaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldydcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgY29uc3RydWN0b3IgKGRhdGEsIHZpZXcsIG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKSAvLyB0aGlzIHNob3VsZCBiZSBhbGwgdGhhdCdzIHJlcXVpcmVkIHdoZW4gcmVmYWN0b3JlZFxuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICB0aGlzLnZpZXcgPSB2aWV3XG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zLCB2aWV3T3B0aW9ucykge1xuICAgIGNvbnN0IG9wdGlvbnNPdmVycmlkZSA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5BbmdsZTogMjUsXG4gICAgICBtaW5OOiAzLFxuICAgICAgbWF4TjogMyxcbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24ob3B0aW9ucyxvcHRpb25zT3ZlcnJpZGUpXG4gICAgb3B0aW9ucy5yZXBlYXRlZCAgPSBvcHRpb25zLnJlcGVhdGVkIHx8IGZhbHNlXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcoZGF0YSwgdmlld09wdGlvbnMpXG5cbiAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEoZGF0YSwgdmlldywgb3B0aW9ucylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIExpbkV4cHIge1xuLy9jbGFzcyBMaW5FeHByIHtcbiAgICBjb25zdHJ1Y3RvcihhLGIpIHtcbiAgICAgICAgdGhpcy5hID0gYTtcbiAgICAgICAgdGhpcy5iID0gYjtcbiAgICB9XG5cbiAgICBpc0NvbnN0YW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hID09PSAwXG4gICAgfVxuXG4gICAgdG9TdHJpbmcoKSB7XG4gICAgICAgIGxldCBzdHJpbmcgPSBcIlwiO1xuXG4gICAgICAgIC8vIHggdGVybVxuICAgICAgICBpZiAodGhpcy5hPT09MSkgeyBzdHJpbmcgKz0gXCJ4XCJ9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMuYT09PS0xKSB7IHN0cmluZyArPSBcIi14XCJ9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMuYSE9PTApIHsgc3RyaW5nICs9IHRoaXMuYSArIFwieFwifVxuICAgICAgICBcbiAgICAgICAgLy8gc2lnblxuICAgICAgICBpZiAodGhpcy5hIT09MCAmJiB0aGlzLmI+MCkge3N0cmluZyArPSBcIiArIFwifVxuICAgICAgICBlbHNlIGlmICh0aGlzLmEhPT0wICYmIHRoaXMuYjwwKSB7c3RyaW5nICs9IFwiIC0gXCJ9XG5cbiAgICAgICAgLy8gY29uc3RhbnRcbiAgICAgICAgaWYgKHRoaXMuYj4wKSB7c3RyaW5nICs9IHRoaXMuYn1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5iPDAgJiYgdGhpcy5hPT09MCkge3N0cmluZyArPSB0aGlzLmJ9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMuYjwwKSB7c3RyaW5nICs9IE1hdGguYWJzKHRoaXMuYil9XG5cbiAgICAgICAgcmV0dXJuIHN0cmluZztcbiAgICB9XG5cbiAgICB0b1N0cmluZ1AoKSB7XG4gICAgICAgIC8vIHJldHVybiBleHByZXNzaW9uIGFzIGEgc3RyaW5nLCBzdXJyb3VuZGVkIGluIHBhcmVudGhlc2VzIGlmIGEgYmlub21pYWxcbiAgICAgICAgaWYgKHRoaXMuYSA9PT0gMCB8fCB0aGlzLmIgPT09IDApIHJldHVybiB0aGlzLnRvU3RyaW5nKCk7XG4gICAgICAgIGVsc2UgcmV0dXJuIFwiKFwiICsgdGhpcy50b1N0cmluZygpICsgXCIpXCI7XG4gICAgfVxuXG4gICAgZXZhbCh4KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmEqeCArIHRoaXMuYlxuICAgIH1cblxuICAgIGFkZCh0aGF0KSB7XG4gICAgICAgIC8vIGFkZCBlaXRoZXIgYW4gZXhwcmVzc2lvbiBvciBhIGNvbnN0YW50XG4gICAgICAgIGlmICh0aGF0LmEgIT09IHVuZGVmaW5lZCkgcmV0dXJuIG5ldyBMaW5FeHByKHRoaXMuYSt0aGF0LmEsdGhpcy5iK3RoYXQuYik7XG4gICAgICAgIGVsc2UgcmV0dXJuIG5ldyBMaW5FeHByKHRoaXMuYSx0aGlzLmIgKyB0aGF0KTtcbiAgICB9XG5cbiAgICB0aW1lcyh0aGF0KSB7XG4gICAgICAgIHJldHVybiBuZXcgTGluRXhwcih0aGlzLmEgKiB0aGF0LCB0aGlzLmIgKiB0aGF0KVxuICAgIH1cblxuICAgIHN0YXRpYyBzb2x2ZShleHByMSxleHByMikge1xuICAgICAgICAvLyBzb2x2ZXMgdGhlIHR3byBleHByZXNzaW9ucyBzZXQgZXF1YWwgdG8gZWFjaCBvdGhlclxuICAgICAgICByZXR1cm4gKGV4cHIyLmItZXhwcjEuYikvKGV4cHIxLmEtZXhwcjIuYSlcbiAgICB9XG59XG4iLCJpbXBvcnQgTGluRXhwciBmcm9tIFwiTGluRXhwclwiO1xuXG4vKiogR2l2ZW4gYSBzZXQgb2YgZXhwcmVzc2lvbnMsIHNldCB0aGVpciBzdW0gICovXG5cbmV4cG9ydCBmdW5jdGlvbiBzb2x2ZUFuZ2xlcyhleHByZXNzaW9uczogTGluRXhwcltdLCBhbmdsZVN1bTogbnVtYmVyKTogeyB4OiBudW1iZXI7IGFuZ2xlczogbnVtYmVyW107IH0ge1xuICAgIGNvbnN0IGV4cHJlc3Npb25TdW0gPSBleHByZXNzaW9ucy5yZWR1Y2UoKGV4cDEsIGV4cDIpID0+IGV4cDEuYWRkKGV4cDIpKTtcbiAgICBjb25zdCB4ID0gTGluRXhwci5zb2x2ZShleHByZXNzaW9uU3VtLCBuZXcgTGluRXhwcigwLCBhbmdsZVN1bSkpO1xuXG4gICAgY29uc3QgYW5nbGVzID0gW107XG4gICAgZXhwcmVzc2lvbnMuZm9yRWFjaChmdW5jdGlvbiAoZXhwcikge1xuICAgICAgICBsZXQgYW5nbGUgPSBleHByLmV2YWwoeCk7XG4gICAgICAgIGlmIChhbmdsZSA8PSAwKSB7XG4gICAgICAgICAgICB0aHJvdyBcIm5lZ2F0aXZlIGFuZ2xlXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhbmdsZXMucHVzaChleHByLmV2YWwoeCkpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gKHsgeDogeCwgYW5nbGVzOiBhbmdsZXMgfSk7XG59XG4iLCJpbXBvcnQgTGluRXhwciBmcm9tIFwiTGluRXhwclwiO1xuaW1wb3J0IHsgcmFuZEJldHdlZW4sIHJhbmRFbGVtLCByYW5kTXVsdEJldHdlZW4sIHNodWZmbGUsIHdlYWtJbmNsdWRlcyB9IGZyb20gXCJVdGlsaXRpZXNcIjtcbmltcG9ydCB7IEFsZ2VicmFPcHRpb25zIH0gZnJvbSBcIi4vQWxnZWJyYU9wdGlvbnNcIjtcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNEYXRhIH0gZnJvbSBcIi4vTWlzc2luZ0FuZ2xlc0RhdGFcIjtcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgfSBmcm9tIFwiLi9OdW1iZXJPcHRpb25zXCI7XG5pbXBvcnQgeyBzb2x2ZUFuZ2xlcyB9IGZyb20gXCIuL3NvbHZlQW5nbGVzXCI7XG5cbnR5cGUgT3B0aW9ucyA9IEFsZ2VicmFPcHRpb25zXG5cbmV4cG9ydCB0eXBlIEV4cHJlc3Npb25UeXBlID0gJ2FkZCcgfCAnbXVsdGlwbHknIHwgJ21peGVkJ1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGltcGxlbWVudHMgTWlzc2luZ0FuZ2xlc0RhdGEge1xuICAgIGFuZ2xlczogbnVtYmVyW11cbiAgICBtaXNzaW5nOiBib29sZWFuW11cbiAgICBhbmdsZVN1bTogbnVtYmVyXG4gICAgYW5nbGVMYWJlbHM6IHN0cmluZ1tdXG4gICAgeDogbnVtYmVyIC8vXG4gICAgXG4gICAgY29uc3RydWN0b3IoYW5nbGVzOiBudW1iZXJbXSwgbWlzc2luZzogYm9vbGVhbltdLCBhbmdsZVN1bTogbnVtYmVyLCBhbmdsZUxhYmVsczogc3RyaW5nW10sIHg6IG51bWJlcikge1xuICAgICAgICB0aGlzLmFuZ2xlcyA9IGFuZ2xlc1xuICAgICAgICB0aGlzLmFuZ2xlU3VtID0gYW5nbGVTdW1cbiAgICAgICAgdGhpcy5hbmdsZUxhYmVscyA9IGFuZ2xlTGFiZWxzXG4gICAgICAgIHRoaXMueCA9IHhcbiAgICAgICAgdGhpcy5taXNzaW5nID0gbWlzc2luZ1xuICAgIH1cblxuICAgIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IE9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIHtcbiAgICAgICAgY29uc3QgZGVmYXVsdHMgOiBQYXJ0aWFsPE9wdGlvbnM+ID0ge1xuICAgICAgICAgICAgZXhwcmVzc2lvblR5cGVzOiBbJ2FkZCcsJ211bHRpcGx5JywgJ21peGVkJ10sXG4gICAgICAgICAgICBlbnN1cmVYOiB0cnVlLFxuICAgICAgICAgICAgaW5jbHVkZUNvbnN0YW50czogdHJ1ZSxcbiAgICAgICAgICAgIG1pbkNvZWZmaWNpZW50OiAxLFxuICAgICAgICAgICAgbWF4Q29lZmZpY2llbnQ6IDQsXG4gICAgICAgICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgICAgICAgbWluQW5nbGU6IDIwLFxuICAgICAgICAgICAgbWluTjogMixcbiAgICAgICAgICAgIG1heE46IDQsXG4gICAgICAgICAgICBtaW5YVmFsdWU6IDE1LFxuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgICAgIC8vYXNzaWduIGNhbGN1bGF0ZWQgZGVmYXVsdHM6XG4gICAgICAgIG9wdGlvbnMubWF4Q29uc3RhbnQgPSBvcHRpb25zLm1heENvbnN0YW50IHx8IG9wdGlvbnMuYW5nbGVTdW0vMlxuICAgICAgICBvcHRpb25zLm1heFhWYWx1ZSA9IG9wdGlvbnMubWF4WFZhbHVlIHx8IG9wdGlvbnMuYW5nbGVTdW0vNFxuXG4gICAgICAgIC8vIFJhbmRvbWlzZS9zZXQgdXAgbWFpbiBmZWF0dXJlc1xuICAgICAgICBsZXQgbiA6IG51bWJlciA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTiwgb3B0aW9ucy5tYXhOKVxuXG4gICAgICAgIGNvbnN0IHR5cGUgOiBFeHByZXNzaW9uVHlwZSA9IHJhbmRFbGVtKG9wdGlvbnMuZXhwcmVzc2lvblR5cGVzKTtcblxuICAgICAgICAvLyBHZW5lcmF0ZSBleHByZXNzaW9ucy9hbmdsZXNcbiAgICAgICAgbGV0IGV4cHJlc3Npb25zIDogTGluRXhwcltdXG4gICAgICAgIHN3aXRjaCh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdtaXhlZCc6XG4gICAgICAgICAgICAgICAgZXhwcmVzc2lvbnMgPSBtYWtlTWl4ZWRFeHByZXNzaW9ucyhuLG9wdGlvbnMpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIGNhc2UgJ211bHRpcGx5JzogXG4gICAgICAgICAgICAgICAgZXhwcmVzc2lvbnMgPSBtYWtlTXVsdGlwbGljYXRpb25FeHByZXNzaW9ucyhuLG9wdGlvbnMpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIGNhc2UgJ2FkZCc6IFxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBleHByZXNzaW9ucyA9IG1ha2VBZGRFeHByZXNzaW9ucyhuLG9wdGlvbnMpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgICBleHByZXNzaW9ucyA9IHNodWZmbGUoZXhwcmVzc2lvbnMpO1xuXG4gICAgICAgIC8vIFNvbHZlIGZvciB4IGFuZCBhbmdsZXNcbiAgICAgICAgY29uc3Qge3ggLCBhbmdsZXMgfSA6IHt4Om51bWJlciwgYW5nbGVzOiBudW1iZXJbXX0gPSBzb2x2ZUFuZ2xlcyhleHByZXNzaW9ucyxvcHRpb25zLmFuZ2xlU3VtKVxuXG4gICAgICAgIC8vIGxhYmVscyBhcmUganVzdCBleHByZXNzaW9ucyBhcyBzdHJpbmdzXG4gICAgICAgIGNvbnN0IGxhYmVscyA9IGV4cHJlc3Npb25zLm1hcCggZSA9PiBgJHtlLnRvU3RyaW5nUCgpfV5cXFxcY2lyY2ApIFxuXG4gICAgICAgIC8vIG1pc3NpbmcgdmFsdWVzIGFyZSB0aGUgb25lcyB3aGljaCBhcmVuJ3QgY29uc3RhbnRcbiAgICAgICAgY29uc3QgbWlzc2luZyA9IGV4cHJlc3Npb25zLm1hcCggZSA9PiAhZS5pc0NvbnN0YW50KCkpXG5cbiAgICAgICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgKGFuZ2xlcyxtaXNzaW5nLG9wdGlvbnMuYW5nbGVTdW0sbGFiZWxzLHgpXG4gICAgfVxuXG4gICAgaW5pdExhYmVscygpIDogdm9pZCB7fSAvLyBtYWtlcyB0eXBlc2NyaXB0IHNodXQgdXBcbn1cblxuZnVuY3Rpb24gbWFrZU1peGVkRXhwcmVzc2lvbnMobjogbnVtYmVyLCBvcHRpb25zOiBPcHRpb25zKSA6IExpbkV4cHJbXSB7XG4gICAgbGV0IGV4cHJlc3Npb25zOiBMaW5FeHByW10gPSBbXVxuICAgIGNvbnN0IHggPSByYW5kQmV0d2VlbihvcHRpb25zLm1pblhWYWx1ZSwgb3B0aW9ucy5tYXhYVmFsdWUpO1xuICAgIGxldCBsZWZ0ID0gb3B0aW9ucy5hbmdsZVN1bTtcbiAgICBsZXQgYWxsY29uc3RhbnQgPSB0cnVlO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbiAtIDE7IGkrKykge1xuICAgICAgICBsZXQgYSA9IHJhbmRCZXR3ZWVuKDEsIG9wdGlvbnMubWF4Q29lZmZpY2llbnQpO1xuICAgICAgICBsZWZ0IC09IGEgKiB4O1xuICAgICAgICBsZXQgbWF4YiA9IE1hdGgubWluKGxlZnQgLSBvcHRpb25zLm1pbkFuZ2xlICogKG4gLSBpIC0gMSksIG9wdGlvbnMubWF4Q29uc3RhbnQpO1xuICAgICAgICBsZXQgbWluYiA9IG9wdGlvbnMubWluQW5nbGUgLSBhICogeDtcbiAgICAgICAgbGV0IGIgPSByYW5kQmV0d2VlbihtaW5iLCBtYXhiKTtcbiAgICAgICAgaWYgKGEgIT09IDApIHsgYWxsY29uc3RhbnQgPSBmYWxzZSB9O1xuICAgICAgICBsZWZ0IC09IGI7XG4gICAgICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoYSwgYikpO1xuICAgIH1cbiAgICBsZXQgbGFzdF9taW5YX2NvZWZmID0gYWxsY29uc3RhbnQgPyAxIDogb3B0aW9ucy5taW5Db2VmZmljaWVudDtcbiAgICBsZXQgYSA9IHJhbmRCZXR3ZWVuKGxhc3RfbWluWF9jb2VmZiwgb3B0aW9ucy5tYXhDb2VmZmljaWVudCk7XG4gICAgbGV0IGIgPSBsZWZ0IC0gYSAqIHg7XG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihhLCBiKSk7XG5cbiAgICByZXR1cm4gZXhwcmVzc2lvbnNcbn1cblxuZnVuY3Rpb24gbWFrZUFkZEV4cHJlc3Npb25zKG46IG51bWJlciwgb3B0aW9uczogT3B0aW9ucykgOiBMaW5FeHByW10ge1xuICAgIGxldCBleHByZXNzaW9uczogTGluRXhwcltdID0gW11cbiAgICBsZXQgYW5nbGVzOiBudW1iZXJbXSA9IFtdXG4gICAgY29uc3QgY29uc3RhbnRzID0gKG9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cyA9PT0gdHJ1ZSB8fCB3ZWFrSW5jbHVkZXMob3B0aW9ucy5pbmNsdWRlQ29uc3RhbnRzLCAnYWRkJykpO1xuICAgIGlmIChuID09PSAyICYmIG9wdGlvbnMuZW5zdXJlWCAmJiBjb25zdGFudHMpIG4gPSAzO1xuXG4gICAgY29uc3QgeCA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluWFZhbHVlLCBvcHRpb25zLm1heFhWYWx1ZSk7XG4gICAgbGV0IGxlZnQgPSBvcHRpb25zLmFuZ2xlU3VtO1xuICAgIGxldCBhbmdsZXNMZWZ0ID0gbjtcblxuICAgIC8vIGZpcnN0IGRvIHRoZSBleHByZXNzaW9ucyBlbnN1cmVkIGJ5IGVuc3VyZV94IGFuZCBjb25zdGFudHNcbiAgICBpZiAob3B0aW9ucy5lbnN1cmVYKSB7XG4gICAgICAgIGFuZ2xlc0xlZnQtLTtcbiAgICAgICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCAwKSk7XG4gICAgICAgIGFuZ2xlcy5wdXNoKHgpO1xuICAgICAgICBsZWZ0IC09IHg7XG4gICAgfVxuXG4gICAgaWYgKGNvbnN0YW50cykge1xuICAgICAgICBhbmdsZXNMZWZ0LS07XG4gICAgICAgIGxldCBjID0gcmFuZEJldHdlZW4oXG4gICAgICAgICAgICBvcHRpb25zLm1pbkFuZ2xlLFxuICAgICAgICAgICAgbGVmdCAtIG9wdGlvbnMubWluQW5nbGUgKiBhbmdsZXNMZWZ0XG4gICAgICAgICk7XG4gICAgICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMCwgYykpO1xuICAgICAgICBhbmdsZXMucHVzaChjKTtcbiAgICAgICAgbGVmdCAtPSBjO1xuICAgIH1cblxuICAgIC8vIG1pZGRsZSBhbmdsZXNcbiAgICB3aGlsZSAoYW5nbGVzTGVmdCA+IDEpIHtcbiAgICAgICAgLy8gYWRkICd4K2InIGFzIGFuIGV4cHJlc3Npb24uIE1ha2Ugc3VyZSBiIGdpdmVzIHNwYWNlXG4gICAgICAgIGFuZ2xlc0xlZnQtLTtcbiAgICAgICAgbGVmdCAtPSB4O1xuICAgICAgICBsZXQgbWF4YiA9IE1hdGgubWluKFxuICAgICAgICAgICAgbGVmdCAtIG9wdGlvbnMubWluQW5nbGUgKiBhbmdsZXNMZWZ0LFxuICAgICAgICAgICAgb3B0aW9ucy5tYXhDb25zdGFudFxuICAgICAgICApO1xuICAgICAgICBsZXQgbWluYiA9IE1hdGgubWF4KFxuICAgICAgICAgICAgb3B0aW9ucy5taW5BbmdsZSAtIHgsXG4gICAgICAgICAgICAtb3B0aW9ucy5tYXhDb25zdGFudFxuICAgICAgICApO1xuICAgICAgICBsZXQgYiA9IHJhbmRCZXR3ZWVuKG1pbmIsIG1heGIpO1xuICAgICAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIGIpKTtcbiAgICAgICAgYW5nbGVzLnB1c2goeCArIGIpO1xuICAgICAgICBsZWZ0IC09IGI7XG4gICAgfVxuXG4gICAgLy8gbGFzdCBhbmdsZVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgbGVmdCAtIHgpKTtcbiAgICBhbmdsZXMucHVzaChsZWZ0KTtcblxuICAgIHJldHVybiBleHByZXNzaW9uc1xufVxuXG5mdW5jdGlvbiBtYWtlTXVsdGlwbGljYXRpb25FeHByZXNzaW9ucyhuOiBudW1iZXIsIG9wdGlvbnM6IE9wdGlvbnMpIDogTGluRXhwcltdIHtcbiAgICBsZXQgZXhwcmVzc2lvbnMgOiBMaW5FeHByW10gPSBbXVxuXG4gICAgLy8gY2hvb3NlIGEgdG90YWwgb2YgY29lZmZpY2llbnRzXG4gICAgLy8gcGljayB4IGJhc2VkIG9uIHRoYXRcbiAgICBjb25zdCBjb25zdGFudHMgPSAob3B0aW9ucy5pbmNsdWRlQ29uc3RhbnRzID09PSB0cnVlIHx8IHdlYWtJbmNsdWRlcyhvcHRpb25zLmluY2x1ZGVDb25zdGFudHMsICdtdWx0JykpO1xuICAgIGlmIChuID09PSAyICYmIG9wdGlvbnMuZW5zdXJlWCAmJiBjb25zdGFudHMpIG4gPSAzO1xuXG4gICAgbGV0IGFuZ2xlc2xlZnQgPSBuO1xuICAgIGNvbnN0IHRvdGFsQ29lZmYgPSBjb25zdGFudHMgP1xuICAgICAgICByYW5kQmV0d2VlbihuLCAob3B0aW9ucy5hbmdsZVN1bSAtIG9wdGlvbnMubWluQW5nbGUpIC8gb3B0aW9ucy5taW5BbmdsZSwgTWF0aC5yYW5kb20pIDogLy8gaWYgaXQncyB0b28gYmlnLCBhbmdsZXMgZ2V0IHRvbyBzbWFsbFxuICAgICAgICByYW5kRWxlbShbMywgNCwgNSwgNiwgOCwgOSwgMTBdLmZpbHRlcih4ID0+IHggPj0gbiksIE1hdGgucmFuZG9tKTtcbiAgICBsZXQgY29lZmZsZWZ0ID0gdG90YWxDb2VmZjtcbiAgICBsZXQgbGVmdCA9IG9wdGlvbnMuYW5nbGVTdW07XG5cbiAgICAvLyBmaXJzdCAwLzEvMlxuICAgIGlmIChjb25zdGFudHMpIHtcbiAgICAgICAgLy8gcmVkdWNlIHRvIG1ha2Ugd2hhdCdzIGxlZnQgYSBtdWx0aXBsZSBvZiB0b3RhbF9jb2VmZlxuICAgICAgICBhbmdsZXNsZWZ0LS07XG4gICAgICAgIGxldCBuZXdsZWZ0ID0gcmFuZE11bHRCZXR3ZWVuKHRvdGFsQ29lZmYgKiBvcHRpb25zLm1pbkFuZ2xlLCBvcHRpb25zLmFuZ2xlU3VtIC0gb3B0aW9ucy5taW5BbmdsZSwgdG90YWxDb2VmZik7XG4gICAgICAgIGxldCBjID0gb3B0aW9ucy5hbmdsZVN1bSAtIG5ld2xlZnQ7XG4gICAgICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMCwgYykpO1xuICAgICAgICBsZWZ0IC09IG5ld2xlZnQ7XG4gICAgfVxuXG4gICAgbGV0IHggPSBsZWZ0IC8gdG90YWxDb2VmZjtcblxuICAgIGlmIChvcHRpb25zLmVuc3VyZVgpIHtcbiAgICAgICAgYW5nbGVzbGVmdC0tO1xuICAgICAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKTtcbiAgICAgICAgY29lZmZsZWZ0IC09IDE7XG4gICAgfVxuXG4gICAgLy9taWRkbGVcbiAgICB3aGlsZSAoYW5nbGVzbGVmdCA+IDEpIHtcbiAgICAgICAgYW5nbGVzbGVmdC0tO1xuICAgICAgICBsZXQgbWluYSA9IDE7XG4gICAgICAgIGxldCBtYXhhID0gY29lZmZsZWZ0IC0gYW5nbGVzbGVmdDsgLy8gbGVhdmUgZW5vdWdoIGZvciBvdGhlcnMgVE9ETzogYWRkIG1heF9jb2VmZlxuICAgICAgICBsZXQgYSA9IHJhbmRCZXR3ZWVuKG1pbmEsIG1heGEpO1xuICAgICAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKGEsIDApKTtcbiAgICAgICAgY29lZmZsZWZ0IC09IGE7XG4gICAgfVxuXG4gICAgLy9sYXN0XG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihjb2VmZmxlZnQsIDApKTtcbiAgICByZXR1cm4gZXhwcmVzc2lvbnNcbn0iLCJpbXBvcnQgUG9pbnQgZnJvbSBcIlBvaW50XCI7XG5pbXBvcnQgeyBMYWJlbCB9IGZyb20gXCIuLi9HcmFwaGljUVwiO1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tIFwiLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGFcIjtcbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyBmcm9tIFwiLi9NaXNzaW5nQW5nbGVzQXJvdW5kVmlld1wiO1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zIH0gZnJvbSBcIi4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlldyBleHRlbmRzIE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IHtcbiAgICBPIDogUG9pbnRcbiAgICBBOiBQb2ludFxuICAgIEM6IFBvaW50W11cbiAgICBsYWJlbHM6IExhYmVsW11cbiAgICBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50XG4gICAgRE9NOiBIVE1MRWxlbWVudFxuICAgIHJvdGF0aW9uOiBudW1iZXJcbiAgICB3aWR0aDogbnVtYmVyXG4gICAgaGVpZ2h0OiBudW1iZXJcbiAgICBkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGFcblxuICAgIGNvbnN0cnVjdG9yKCBkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEsIG9wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykge1xuICAgICAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBzdXBlciBjb25zdHJ1Y3RvciBkb2VzIHJlYWwgd29ya1xuICAgICAgICBjb25zdCBzb2x1dGlvbkxhYmVsOiBQYXJ0aWFsPExhYmVsPiA9IHtcbiAgICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwKSxcbiAgICAgICAgICAgIHRleHRxOiAnJyxcbiAgICAgICAgICAgIHRleHRhOiBgeCA9ICR7dGhpcy5kYXRhLnh9XlxcXFxjaXJjYCxcbiAgICAgICAgICAgIHN0eWxlcTogJ2hpZGRlbicsXG4gICAgICAgICAgICBzdHlsZWE6ICdleHRyYS1hbnN3ZXInLFxuICAgICAgICB9XG4gICAgICAgIHNvbHV0aW9uTGFiZWwuc3R5bGUgPSBzb2x1dGlvbkxhYmVsLnN0eWxlcVxuICAgICAgICBzb2x1dGlvbkxhYmVsLnRleHQgPSBzb2x1dGlvbkxhYmVsLnRleHRxXG5cbiAgICAgICAgdGhpcy5sYWJlbHMucHVzaChzb2x1dGlvbkxhYmVsIGFzIExhYmVsKVxuICAgIH1cblxufSIsIi8qKiBNaXNzaW5nIGFuZ2xlcyBhcm91bmQgYSBwb2ludCBvciBvbiBhIHN0cmFpZ2h0IGxpbmUsIHVzaW5nIGFsZ2VicmFpYyBleHByZXNzaW9ucyAqL1xuXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tICcuL0FsZ2VicmFPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGFcbiAgdmlldzogTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3XG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSwgdmlldzogTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3KSB7IC8vIGVmZmVjdGl2ZWx5IHByaXZhdGVcbiAgICBzdXBlcigpIC8vIGJ1YmJsZXMgdG8gUVxuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICB0aGlzLnZpZXcgPSB2aWV3XG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBBbGdlYnJhT3B0aW9ucywgdmlld09wdGlvbnM6IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEge1xuICAgIGNvbnN0IGRlZmF1bHRzIDogQWxnZWJyYU9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDEwLFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDQsXG4gICAgICByZXBlYXRlZDogZmFsc2UsXG4gICAgfVxuICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEucmFuZG9tKG9wdGlvbnMpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcoZGF0YSwgdmlld09wdGlvbnMpIC8vIFRPRE8gZWxpbWluYXRlIHB1YmxpYyBjb25zdHJ1Y3RvcnNcblxuICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRKGRhdGEsIHZpZXcpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJpbXBvcnQgUG9pbnQgZnJvbSBcIlBvaW50XCI7XG5pbXBvcnQgeyBMYWJlbCB9IGZyb20gXCIuLi9HcmFwaGljUVwiO1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gXCIuLi9WaWV3T3B0aW9uc1wiO1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tIFwiLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGFcIjtcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IGZyb20gXCIuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXdcIjtcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldyBleHRlbmRzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcge1xuICBkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGFcbiAgY29uc3RydWN0b3IoZGF0YTogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLG9wdGlvbnM6IFZpZXdPcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSxvcHRpb25zKVxuXG4gICAgY29uc3Qgc29sdXRpb25MYWJlbDogUGFydGlhbDxMYWJlbD4gPSB7XG4gICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdGhpcy5oZWlnaHQgLSAxMCksXG4gICAgICB0ZXh0cTogJycsXG4gICAgICB0ZXh0YTogYHggPSAke3RoaXMuZGF0YS54fV5cXFxcY2lyY2AsXG4gICAgICBzdHlsZXE6ICdoaWRkZW4nLFxuICAgICAgc3R5bGVhOiAnZXh0cmEtYW5zd2VyJyxcbiAgICB9XG4gICAgc29sdXRpb25MYWJlbC5zdHlsZSA9IHNvbHV0aW9uTGFiZWwuc3R5bGVxXG4gICAgc29sdXRpb25MYWJlbC50ZXh0ID0gc29sdXRpb25MYWJlbC50ZXh0cVxuXG4gICAgdGhpcy5sYWJlbHMucHVzaChzb2x1dGlvbkxhYmVsIGFzIExhYmVsKVxuICB9XG59IiwiaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tIFwiLi4vR3JhcGhpY1FcIjtcbmltcG9ydCBWaWV3T3B0aW9ucyBmcm9tIFwiLi4vVmlld09wdGlvbnNcIjtcbmltcG9ydCB7IEFsZ2VicmFPcHRpb25zIH0gZnJvbSBcIi4vQWxnZWJyYU9wdGlvbnNcIjtcbmltcG9ydCBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgZnJvbSBcIi4vTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhXCI7XG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVZpZXcgZnJvbSBcIi4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVZpZXdcIjtcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IGZyb20gXCIuL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXdcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YVxuICB2aWV3OiBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3XG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSwgdmlldzogTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldykge1xuICAgIHN1cGVyICgpXG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIHRoaXMudmlldyA9IHZpZXdcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IEFsZ2VicmFPcHRpb25zLCB2aWV3T3B0aW9uczogVmlld09wdGlvbnMpIHtcbiAgICBjb25zdCBvcHRpb25zT3ZlcnJpZGUgOiBBbGdlYnJhT3B0aW9ucyA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5OOiAzLFxuICAgICAgbWF4TjogMyxcbiAgICAgIHJlcGVhdGVkOiBmYWxzZSxcbiAgICB9XG4gICAgT2JqZWN0LmFzc2lnbihvcHRpb25zLG9wdGlvbnNPdmVycmlkZSlcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEucmFuZG9tKG9wdGlvbnMpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhVmlldyhkYXRhLCB2aWV3T3B0aW9ucylcbiAgICBcbiAgICByZXR1cm4gbmV3IHRoaXMoZGF0YSx2aWV3KVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCgpIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJ31cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tIFwiUG9pbnRcIjtcbmltcG9ydCB7IExhYmVsIH0gZnJvbSBcIi4uL0dyYXBoaWNRXCI7XG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZnJvbSBcIi4vTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXdcIjtcbmltcG9ydCBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSBmcm9tIFwiLi9NaXNzaW5nQW5nbGVzV29yZGVkRGF0YVwiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldyBleHRlbmRzIE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IHtcbiAgZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGFcbiAgY29uc3RydWN0b3IgKGRhdGEsIG9wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBkb2VzIG1vc3Qgb2YgdGhlIHNldCB1cFxuICAgIHN1cGVyLnRyYW5zbGF0ZSgwLC0xNSlcbiAgICAgIGxldCBpbnN0cnVjdGlvbkxhYmVsIDogTGFiZWwgPSB7XG4gICAgICAgIHRleHRxOiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICAgIHRleHRhOiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICAgIHRleHQ6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgICAgc3R5bGVxOiAnZXh0cmEtaW5mbycsXG4gICAgICAgIHN0eWxlYTogJ2V4dHJhLWluZm8nLFxuICAgICAgICBzdHlsZTogJ2V4dHJhLWluZm8nLFxuICAgICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdGhpcy5oZWlnaHQtMTApXG4gICAgfVxuICAgICAgdGhpcy5sYWJlbHMucHVzaChpbnN0cnVjdGlvbkxhYmVsKVxuICB9XG59IiwiaW1wb3J0IExpbkV4cHIgZnJvbSBcIkxpbkV4cHJcIjtcbmltcG9ydCB7IHJhbmRCZXR3ZWVuLCByYW5kRWxlbSwgcmFuZE11bHRCZXR3ZWVuIH0gZnJvbSBcIlV0aWxpdGllc1wiO1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tIFwiLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGFcIjtcbmltcG9ydCB7IHNvbHZlQW5nbGVzIH0gZnJvbSBcIi4vc29sdmVBbmdsZXNcIjtcbmltcG9ydCB7IFdvcmRlZE9wdGlvbnMgfSBmcm9tIFwiLi9Xb3JkZWRPcHRpb25zXCI7XG5cblxuZXhwb3J0IHR5cGUgV29yZGVkVHlwZSA9ICdhZGQnIHwgJ211bHRpcGx5JyB8ICdyYXRpbycgfCAncGVyY2VudCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgZXh0ZW5kcyBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEge1xuICBhbmdsZXM6IG51bWJlcltdICAgICAgICAvLyBJbmhlcml0ZWRcbiAgbWlzc2luZzogYm9vbGVhbltdICAgICAgLy8gICAgfFxuICBhbmdsZVN1bTogbnVtYmVyICAgICAgICAvLyAgICB8XG4gIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSAgIC8vICAgIHZcbiAgaW5zdHJ1Y3Rpb25zOiBzdHJpbmdbXSAgLy8gVGhlICdpbnN0cnVjdGlvbnMnIGdpdmVuXG4gIHg6IG51bWJlciAgICAgICAgICAgICAgIC8vIHVudXNlZCBidXQgaW5oZXJpdGVkXG5cbiAgY29uc3RydWN0b3IoYW5nbGVzOiBudW1iZXJbXSwgbWlzc2luZzogYm9vbGVhbltdLCBhbmdsZVN1bTogbnVtYmVyLCBhbmdsZUxhYmVsczogc3RyaW5nW10saW5zdHJ1Y3Rpb25zOiBzdHJpbmdbXSkge1xuICAgIHN1cGVyKGFuZ2xlcyxtaXNzaW5nLGFuZ2xlU3VtLGFuZ2xlTGFiZWxzLG51bGwpXG4gICAgdGhpcy5pbnN0cnVjdGlvbnMgPSBpbnN0cnVjdGlvbnNcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20ob3B0aW9ucyA6IFdvcmRlZE9wdGlvbnMpIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IFdvcmRlZE9wdGlvbnMgPSB7XG4gICAgICBtaW5OOiAyLFxuICAgICAgbWF4TjogMixcbiAgICAgIG1pbkFuZ2xlOiAxMCxcbiAgICAgIG1pbkFkZGVuZDogLTkwLFxuICAgICAgbWF4QWRkZW5kOiA5MCxcbiAgICAgIG1pbk11bHRpcGxpZXI6IDEsXG4gICAgICBtYXhNdWx0aXBsaWVyOiA1LFxuICAgICAgdHlwZXM6IFtcImFkZFwiLCBcIm11bHRpcGx5XCIsIFwicGVyY2VudFwiLCBcInJhdGlvXCJdXG4gICAgfVxuICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LGRlZmF1bHRzLG9wdGlvbnMpXG5cbiAgICBjb25zdCBuID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5OLCBvcHRpb25zLm1heE4pO1xuICAgIGNvbnN0IGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGk8bjsgaSsrKSB7XG4gICAgICBhbmdsZUxhYmVsc1tpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoNjUraSkgLy8gNjUgPSAnQSdcbiAgICB9XG4gICAgbGV0IGV4cHJlc3Npb25zOiBMaW5FeHByW10gPSBbXVxuICAgIGxldCBpbnN0cnVjdGlvbnM6IHN0cmluZ1tdID0gW11cbiAgICBsZXQgYW5nbGVzOiBudW1iZXJbXVxuICAgIGxldCB4OiBudW1iZXJcblxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgMCkpXG5cbiAgICAvLyBMb29wIHRpbCB3ZSBnZXQgb25lIHRoYXQgd29ya3NcbiAgICAvLyBQcm9iYWJseSByZWFsbHkgaW5lZmZpY2llbnQhIVxuXG4gICAgbGV0IHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICBsZXQgYXR0ZW1wdGNvdW50ID0gMDtcbiAgICB3aGlsZSAoIXN1Y2Nlc3MpIHtcbiAgICAgIGlmIChhdHRlbXB0Y291bnQgPiAyMCkge1xuICAgICAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJHYXZlIHVwIGFmdGVyIFwiICsgYXR0ZW1wdGNvdW50ICsgXCIgYXR0ZW1wdHNcIik7XG4gICAgICAgIHN1Y2Nlc3MgPSB0cnVlO1xuICAgICAgfVxuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgY29uc3QgdHlwZSA9IHJhbmRFbGVtKG9wdGlvbnMudHlwZXMpO1xuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICBjYXNlIFwiYWRkXCI6IHtcbiAgICAgICAgICAgIGNvbnN0IGFkZGVuZCA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluQWRkZW5kLCBvcHRpb25zLm1heEFkZGVuZCk7XG4gICAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb25zW2kgLSAxXS5hZGQoYWRkZW5kKSk7XG4gICAgICAgICAgICBpbnN0cnVjdGlvbnMucHVzaChgXFxcXHRleHR7QW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpfSQgaXMgJHtjb21wYXJhdG9yKGFkZGVuZCwgXCIrXCIpfSBhbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY0ICsgaSl9JH1gKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlIFwibXVsdGlwbHlcIjoge1xuICAgICAgICAgICAgY29uc3QgbXVsdGlwbGllciA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTXVsdGlwbGllciwgb3B0aW9ucy5tYXhNdWx0aXBsaWVyKTtcbiAgICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2goZXhwcmVzc2lvbnNbaSAtIDFdLnRpbWVzKG11bHRpcGxpZXIpKTtcbiAgICAgICAgICAgIGluc3RydWN0aW9ucy5wdXNoKGBcXFxcdGV4dHtBbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSl9JCBpcyAke2NvbXBhcmF0b3IobXVsdGlwbGllciwgXCIqXCIpfSBhbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY0ICsgaSl9JH1gKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlIFwicGVyY2VudFwiOiB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50YWdlID0gcmFuZE11bHRCZXR3ZWVuKDUsIDEwMCwgNSk7XG4gICAgICAgICAgICBjb25zdCBpbmNyZWFzZSA9IE1hdGgucmFuZG9tKCkgPCAwLjUgPyB0cnVlIDogZmFsc2U7XG4gICAgICAgICAgICBjb25zdCBtdWx0aXBsaWVyID0gaW5jcmVhc2UgPyAxICsgcGVyY2VudGFnZSAvIDEwMCA6IDEgLSBwZXJjZW50YWdlIC8gMTAwO1xuICAgICAgICAgICAgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uc1tpIC0gMV0udGltZXMobXVsdGlwbGllcikpO1xuICAgICAgICAgICAgaW5zdHJ1Y3Rpb25zLnB1c2goXG4gICAgICAgICAgICAgIGBcXFxcdGV4dHtBbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSl9JCBpcyAkJHtwZXJjZW50YWdlfVxcXFwlJCAke2luY3JlYXNlID8gXCJiaWdnZXJcIiA6IFwic21hbGxlclwifSB0aGFuIGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjQgKyBpKX0kfWApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgXCJyYXRpb1wiOiB7XG4gICAgICAgICAgICBjb25zdCBhID0gcmFuZEJldHdlZW4oMSwgMTApO1xuICAgICAgICAgICAgY29uc3QgYiA9IHJhbmRCZXR3ZWVuKDEsIDEwKTtcbiAgICAgICAgICAgIGNvbnN0IG11bHRpcGxpZXIgPSBiIC8gYTtcbiAgICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2goZXhwcmVzc2lvbnNbaSAtIDFdLnRpbWVzKG11bHRpcGxpZXIpKTtcbiAgICAgICAgICAgIGluc3RydWN0aW9ucy5wdXNoKFxuICAgICAgICAgICAgICBgXFxcXHRleHR7VGhlIHJhdGlvIG9mIGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjQgKyBpKX0kIHRvIGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKX0kIGlzICQke2F9OiR7Yn0kfWBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBjaGVjayBpdCBtYWtlcyBzZW5zZVxuICAgICAgc3VjY2VzcyA9IHRydWU7XG4gICAgICBsZXQgZXhwcmVzc2lvbnN1bSA9IGV4cHJlc3Npb25zLnJlZHVjZSgoZXhwMSwgZXhwMikgPT4gZXhwMS5hZGQoZXhwMikpO1xuICAgICAgbGV0IHggPSBMaW5FeHByLnNvbHZlKGV4cHJlc3Npb25zdW0sIG5ldyBMaW5FeHByKDAsIG9wdGlvbnMuYW5nbGVTdW0pKTtcblxuICAgICAgZXhwcmVzc2lvbnMuZm9yRWFjaChmdW5jdGlvbiAoZXhwcikge1xuICAgICAgICBpZiAoIXN1Y2Nlc3MgfHwgZXhwci5ldmFsKHgpIDwgb3B0aW9ucy5taW5BbmdsZSkge1xuICAgICAgICAgIHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICAgICAgICBpbnN0cnVjdGlvbnMgPSBbXTtcbiAgICAgICAgICBleHByZXNzaW9ucyA9IFtleHByZXNzaW9uc1swXV07XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBhdHRlbXB0Y291bnQrKztcbiAgICB9XG4gICAgY29uc29sZS5sb2coXCJBdHRlbXB0czogXCIgKyBhdHRlbXB0Y291bnQpO1xuXG4gICAgKHt4LCBhbmdsZXN9ID0gc29sdmVBbmdsZXMoZXhwcmVzc2lvbnMsb3B0aW9ucy5hbmdsZVN1bSkpXG4gICAgY29uc3QgbWlzc2luZyA9IGFuZ2xlcy5tYXAoIHg9PnRydWUpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVzLG1pc3Npbmcsb3B0aW9ucy5hbmdsZVN1bSxhbmdsZUxhYmVscyxpbnN0cnVjdGlvbnMpXG4gIH1cbn1cblxuLyoqXG4gKiBHZW5lcmF0ZXMgd29yZGVkIHZlcnNpb24gb2YgYW4gb3BlcmF0aW8gXG4gKiBAcGFyYW0gbnVtYmVyIFRoZSBtdWx0aXBsaWVyIG9yIGFkZGVuZFxuICogQHBhcmFtIG9wZXJhdG9yIFRoZSBvcGVyYXRvciwgZS5nIGFkZGluZyAnbW9yZSB0aGFuJywgb3IgbXVsdGlwbHlpbmcgJ3RpbWVzIGxhcmdlciB0aGFuJ1xuICovXG5mdW5jdGlvbiBjb21wYXJhdG9yKG51bWJlcjogbnVtYmVyLCBvcGVyYXRvcjogJyonfCcrJykge1xuICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgY2FzZSBcIipcIjpcbiAgICAgIHN3aXRjaCAobnVtYmVyKSB7XG4gICAgICAgIGNhc2UgMTogcmV0dXJuIFwidGhlIHNhbWUgYXNcIjtcbiAgICAgICAgY2FzZSAyOiByZXR1cm4gXCJkb3VibGVcIjtcbiAgICAgICAgZGVmYXVsdDogcmV0dXJuIGAkJHtudW1iZXJ9JCB0aW1lcyBsYXJnZXIgdGhhbmA7XG4gICAgICB9XG4gICAgY2FzZSBcIitcIjpcbiAgICAgIHN3aXRjaCAobnVtYmVyKSB7XG4gICAgICAgIGNhc2UgMDogcmV0dXJuIFwidGhlIHNhbWUgYXNcIjtcbiAgICAgICAgZGVmYXVsdDogcmV0dXJuIGAkJHtNYXRoLmFicyhudW1iZXIpLnRvU3RyaW5nKCl9XlxcXFxjaXJjJCAkeyhudW1iZXIgPCAwKSA/IFwibGVzcyB0aGFuXCIgOiBcIm1vcmUgdGhhblwifWA7XG4gICAgICB9XG4gIH1cbn0iLCJpbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gXCIuLi9HcmFwaGljUVwiO1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3IGZyb20gXCIuL01pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3XCI7XG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgZnJvbSBcIi4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGFcIjtcbmltcG9ydCB7IFdvcmRlZE9wdGlvbnMgfSBmcm9tIFwiLi9Xb3JkZWRPcHRpb25zXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNXb3JkZWRRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YVxuICB2aWV3OiBNaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlld1xuXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSwgdmlldzogTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIHRoaXMudmlldyA9IHZpZXdcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFdvcmRlZE9wdGlvbnMsIHZpZXdPcHRpb25zKSB7XG4gICAgY29uc3QgZGVmYXVsdHMgOiBXb3JkZWRPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAxMCxcbiAgICAgIG1pbk46IDIsXG4gICAgICBtYXhOOiAyLFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlLFxuICAgIH1cbiAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSxkZWZhdWx0cyxvcHRpb25zKVxuXG4gICAgdmlld09wdGlvbnMgPSB2aWV3T3B0aW9ucyB8fCB7fVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcgKGRhdGEsIHZpZXdPcHRpb25zKVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGRhdGEsdmlldylcbiAgfVxufSIsIi8qKiAgQ2xhc3MgdG8gd3JhcCB2YXJpb3VzIG1pc3NpbmcgYW5nbGVzIGNsYXNzZXNcbiAqIFJlYWRzIG9wdGlvbnMgYW5kIHRoZW4gd3JhcHMgdGhlIGFwcHJvcHJpYXRlIG9iamVjdCwgbWlycm9yaW5nIHRoZSBtYWluXG4gKiBwdWJsaWMgbWV0aG9kc1xuICpcbiAqIFRoaXMgY2xhc3MgZGVhbHMgd2l0aCB0cmFuc2xhdGluZyBkaWZmaWN1bHR5IGludG8gcXVlc3Rpb24gdHlwZXNcbiovXG5cbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVRJ1xuaW1wb3J0IFF1ZXN0aW9uIGZyb20gJ1F1ZXN0aW9uL1F1ZXN0aW9uJ1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tICcuL0FsZ2VicmFPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSBmcm9tICcuL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVBbGdlYnJhUSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZUFsZ2VicmFRJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzVmlld09wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzV29yZGVkRGF0YSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzV29yZGVkUSBmcm9tICcuL01pc3NpbmdBbmdsZXNXb3JkZWRRJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcbmltcG9ydCB7IFdvcmRlZE9wdGlvbnMgfSBmcm9tICcuL1dvcmRlZE9wdGlvbnMnXG5cbnR5cGUgUXVlc3Rpb25UeXBlID0gJ2Fvc2wnIHwgJ2FhYXAnIHwgJ3RyaWFuZ2xlJ1xudHlwZSBRdWVzdGlvblN1YlR5cGUgPSAnc2ltcGxlJyB8ICdyZXBlYXRlZCcgfCAnYWxnZWJyYScgfCAnd29yZGVkJ1xuXG50eXBlIFF1ZXN0aW9uT3B0aW9ucyA9IE1pc3NpbmdBbmdsZU9wdGlvbnMgJiBBbGdlYnJhT3B0aW9ucyAmIFdvcmRlZE9wdGlvbnNcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1EgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIHF1ZXN0aW9uOiBHcmFwaGljUVxuXG4gIGNvbnN0cnVjdG9yIChxdWVzdGlvbjogR3JhcGhpY1EpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5xdWVzdGlvbiA9IHF1ZXN0aW9uXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChcbiAgICBvcHRpb25zOiB7XG4gICAgICB0eXBlczogUXVlc3Rpb25UeXBlW10sXG4gICAgICBkaWZmaWN1bHR5OiBudW1iZXIsXG4gICAgICBjdXN0b206IGJvb2xlYW4sXG4gICAgICBzdWJ0eXBlPzogUXVlc3Rpb25TdWJUeXBlXG4gICAgfSkgOiBNaXNzaW5nQW5nbGVzUSB7XG4gICAgaWYgKG9wdGlvbnMudHlwZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1R5cGVzIGxpc3QgbXVzdCBiZSBub24tZW1wdHknKVxuICAgIH1cblxuICAgIGNvbnN0IHR5cGUgPSByYW5kRWxlbShvcHRpb25zLnR5cGVzKVxuICAgIGxldCBzdWJ0eXBlIDogUXVlc3Rpb25TdWJUeXBlXG4gICAgbGV0IHF1ZXN0aW9uT3B0aW9ucyA6IFF1ZXN0aW9uT3B0aW9ucyA9IHt9XG5cbiAgICBzd2l0Y2ggKG9wdGlvbnMuZGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICBzdWJ0eXBlID0gJ3NpbXBsZSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAyXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gMlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOlxuICAgICAgICBzdWJ0eXBlID0gJ3NpbXBsZSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAzXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gNFxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAzOlxuICAgICAgICBzdWJ0eXBlID0gJ3JlcGVhdGVkJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDNcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSA0XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ6XG4gICAgICAgIHN1YnR5cGUgPSAnYWxnZWJyYSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmV4cHJlc3Npb25UeXBlcyA9IFsnbXVsdGlwbHknXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cyA9IGZhbHNlXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDRcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNTpcbiAgICAgICAgc3VidHlwZT0nYWxnZWJyYSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmV4cHJlc3Npb25UeXBlcyA9IFsnYWRkJywnbXVsdGlwbHknXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cyA9IFsnbXVsdGlwbHknXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZW5zdXJlWCA9IHRydWVcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAyXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA2OlxuICAgICAgICBzdWJ0eXBlID0gJ2FsZ2VicmEnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5leHByZXNzaW9uVHlwZXMgPSBbJ21peGVkJ11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAyXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA3OlxuICAgICAgICBzdWJ0eXBlID0gJ3dvcmRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnR5cGVzPSBbcmFuZEVsZW0oWydhZGQnLCAnbXVsdGlwbHknXSldXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gcXVlc3Rpb25PcHRpb25zLm1heE4gPSAyXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDg6XG4gICAgICAgIHN1YnR5cGUgPSAnd29yZGVkJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMudHlwZXMgPSBbJ2FkZCcsJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgOTpcbiAgICAgICAgc3VidHlwZSA9ICd3b3JkZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy50eXBlcyA9IFsnbXVsdGlwbHknLCdyYXRpbyddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gcXVlc3Rpb25PcHRpb25zLm1heE4gPSAzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDEwOlxuICAgICAgICBzdWJ0eXBlID0gJ3dvcmRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnR5cGVzID0gWydtdWx0aXBseScsJ2FkZCcsJ3JhdGlvJywncGVyY2VudCddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gcXVlc3Rpb25PcHRpb25zLm1heE4gPSAzXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbid0IGdlbmVyYXRlIGRpZmZpY3VsdHkgJHtvcHRpb25zLmRpZmZpY3VsdHl9YClcblxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJhbmRvbUZyb21UeXBlV2l0aE9wdGlvbnModHlwZSwgc3VidHlwZSwgcXVlc3Rpb25PcHRpb25zKVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbUZyb21UeXBlV2l0aE9wdGlvbnMgKHR5cGU6IFF1ZXN0aW9uVHlwZSwgc3VidHlwZT86IFF1ZXN0aW9uU3ViVHlwZSwgcXVlc3Rpb25PcHRpb25zPzogUXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucz86IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzUSB7XG4gICAgbGV0IHF1ZXN0aW9uOiBHcmFwaGljUVxuICAgIHF1ZXN0aW9uT3B0aW9ucyA9IHF1ZXN0aW9uT3B0aW9ucyB8fCB7fVxuICAgIHZpZXdPcHRpb25zID0gdmlld09wdGlvbnMgfHwge31cbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ2FhYXAnOlxuICAgICAgY2FzZSAnYW9zbCc6IHtcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmFuZ2xlU3VtID0gKHR5cGUgPT09ICdhYWFwJykgPyAzNjAgOiAxODBcbiAgICAgICAgc3dpdGNoIChzdWJ0eXBlKSB7XG4gICAgICAgICAgY2FzZSAnc2ltcGxlJzpcbiAgICAgICAgICBjYXNlICdyZXBlYXRlZCc6XG4gICAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMucmVwZWF0ZWQgPSBzdWJ0eXBlID09PSAncmVwZWF0ZWQnXG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNBcm91bmRRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICdhbGdlYnJhJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlICd3b3JkZWQnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzV29yZGVkUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciAoYHVuZXhwZWN0ZWQgc3VidHlwZSAke3N1YnR5cGV9YClcbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAndHJpYW5nbGUnOiB7XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5yZXBlYXRlZCA9IChzdWJ0eXBlID09PSBcInJlcGVhdGVkXCIpXG4gICAgICAgIHN3aXRjaCAoc3VidHlwZSkge1xuICAgICAgICAgIGNhc2UgJ3NpbXBsZSc6XG4gICAgICAgICAgY2FzZSAncmVwZWF0ZWQnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMsIHZpZXdPcHRpb25zKVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnYWxnZWJyYSc6XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlQWxnZWJyYVEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucyx2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0eXBlICR7dHlwZX1gKVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc1EocXVlc3Rpb24pXG4gIH1cblxuICBnZXRET00gKCkgOiBIVE1MRWxlbWVudCB7IHJldHVybiB0aGlzLnF1ZXN0aW9uLmdldERPTSgpIH1cbiAgcmVuZGVyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24ucmVuZGVyKCkgfVxuICBzaG93QW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24uc2hvd0Fuc3dlcigpIH1cbiAgaGlkZUFuc3dlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLmhpZGVBbnN3ZXIoKSB9XG4gIHRvZ2dsZUFuc3dlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLnRvZ2dsZUFuc3dlcigpIH1cblxuICBzdGF0aWMgZ2V0IG9wdGlvbnNTcGVjICgpIDogdW5rbm93bltdIHtcbiAgICByZXR1cm4gW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJycsXG4gICAgICAgIGlkOiAndHlwZXMnLFxuICAgICAgICB0eXBlOiAnc2VsZWN0LWluY2x1c2l2ZScsXG4gICAgICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgICAgICB7IHRpdGxlOiAnT24gYSBzdHJhaWdodCBsaW5lJywgaWQ6ICdhb3NsJyB9LFxuICAgICAgICAgIHsgdGl0bGU6ICdBcm91bmQgYSBwb2ludCcsIGlkOiAnYWFhcCcgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnVHJpYW5nbGUnLCBpZDogJ3RyaWFuZ2xlJyB9XG4gICAgICAgIF0sXG4gICAgICAgIGRlZmF1bHQ6IFsnYW9zbCcsICdhYWFwJywgJ3RyaWFuZ2xlJ10sXG4gICAgICAgIHZlcnRpY2FsOiB0cnVlXG4gICAgICB9XG4gICAgXVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSA6IHN0cmluZyB7XG4gICAgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJ1xuICB9XG59XG4iLCJpbXBvcnQgQWxnZWJyYWljRnJhY3Rpb25RIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0FsZ2VicmFpY0ZyYWN0aW9uUSdcbmltcG9ydCBJbnRlZ2VyQWRkUSBmcm9tICdRdWVzdGlvbi9UZXh0US9JbnRlZ2VyQWRkJ1xuaW1wb3J0IEFyaXRobWFnb25RIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0FyaXRobWFnb25RJ1xuaW1wb3J0IFRlc3RRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1Rlc3RRJ1xuaW1wb3J0IEFkZEFaZXJvIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0FkZEFaZXJvJ1xuaW1wb3J0IEVxdWF0aW9uT2ZMaW5lIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0VxdWF0aW9uT2ZMaW5lJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNRIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1dyYXBwZXInXG5cbmltcG9ydCBPcHRpb25zU2V0IGZyb20gJ09wdGlvbnNTZXQnXG5cbmNvbnN0IHRvcGljTGlzdCA9IFtcbiAge1xuICAgIGlkOiAnYWxnZWJyYWljLWZyYWN0aW9uJyxcbiAgICB0aXRsZTogJ1NpbXBsaWZ5IGFsZ2VicmFpYyBmcmFjdGlvbnMnLFxuICAgIGNsYXNzOiBBbGdlYnJhaWNGcmFjdGlvblFcbiAgfSxcbiAge1xuICAgIGlkOiAnYWRkLWEtemVybycsXG4gICAgdGl0bGU6ICdNdWx0aXBseSBieSAxMCAoaG9uZXN0ISknLFxuICAgIGNsYXNzOiBBZGRBWmVyb1xuICB9LFxuICB7XG4gICAgaWQ6ICdpbnRlZ2VyLWFkZCcsXG4gICAgdGl0bGU6ICdBZGQgaW50ZWdlcnMgKHYgc2ltcGxlKScsXG4gICAgY2xhc3M6IEludGVnZXJBZGRRXG4gIH0sXG4gIHtcbiAgICBpZDogJ21pc3NpbmctYW5nbGVzJyxcbiAgICB0aXRsZTogJ01pc3NpbmcgYW5nbGVzJyxcbiAgICBjbGFzczogTWlzc2luZ0FuZ2xlc1FcbiAgfSxcbiAge1xuICAgIGlkOiAnZXF1YXRpb24tb2YtbGluZScsXG4gICAgdGl0bGU6ICdFcXVhdGlvbiBvZiBhIGxpbmUgKGZyb20gdHdvIHBvaW50cyknLFxuICAgIGNsYXNzOiBFcXVhdGlvbk9mTGluZVxuICB9LFxuICB7XG4gICAgaWQ6ICdhcml0aG1hZ29uLWFkZCcsXG4gICAgdGl0bGU6ICdBcml0aG1hZ29ucycsXG4gICAgY2xhc3M6IEFyaXRobWFnb25RXG4gIH0sXG4gIHtcbiAgICBpZDogJ3Rlc3QnLFxuICAgIHRpdGxlOiAnVGVzdCBxdWVzdGlvbnMnLFxuICAgIGNsYXNzOiBUZXN0UVxuICB9XG5dXG5cbmZ1bmN0aW9uIGdldENsYXNzIChpZCkge1xuICAvLyBSZXR1cm4gdGhlIGNsYXNzIGdpdmVuIGFuIGlkIG9mIGEgcXVlc3Rpb25cblxuICAvLyBPYnZpb3VzbHkgdGhpcyBpcyBhbiBpbmVmZmljaWVudCBzZWFyY2gsIGJ1dCB3ZSBkb24ndCBuZWVkIG1hc3NpdmUgcGVyZm9ybWFuY2VcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b3BpY0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodG9waWNMaXN0W2ldLmlkID09PSBpZCkge1xuICAgICAgcmV0dXJuIHRvcGljTGlzdFtpXS5jbGFzc1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsXG59XG5cbmZ1bmN0aW9uIGdldFRpdGxlIChpZCkge1xuICAvLyBSZXR1cm4gdGl0bGUgb2YgYSBnaXZlbiBpZFxuICAvL1xuICByZXR1cm4gdG9waWNMaXN0LmZpbmQodCA9PiAodC5pZCA9PT0gaWQpKS50aXRsZVxufVxuXG5mdW5jdGlvbiBnZXRDb21tYW5kV29yZCAoaWQpIHtcbiAgcmV0dXJuIGdldENsYXNzKGlkKS5jb21tYW5kV29yZFxufVxuXG5mdW5jdGlvbiBnZXRUb3BpY3MgKCkge1xuICAvLyByZXR1cm5zIHRvcGljcyB3aXRoIGNsYXNzZXMgc3RyaXBwZWQgb3V0XG4gIHJldHVybiB0b3BpY0xpc3QubWFwKHggPT4gKHsgaWQ6IHguaWQsIHRpdGxlOiB4LnRpdGxlIH0pKVxufVxuXG5mdW5jdGlvbiBuZXdRdWVzdGlvbiAoaWQsIG9wdGlvbnMpIHtcbiAgLy8gdG8gYXZvaWQgd3JpdGluZyBgbGV0IHEgPSBuZXcgKFRvcGljQ2hvb3Nlci5nZXRDbGFzcyhpZCkpKG9wdGlvbnMpXG4gIGNvbnN0IFF1ZXN0aW9uQ2xhc3MgPSBnZXRDbGFzcyhpZClcbiAgbGV0IHF1ZXN0aW9uXG4gIGlmIChRdWVzdGlvbkNsYXNzLnJhbmRvbSkge1xuICAgIHF1ZXN0aW9uID0gUXVlc3Rpb25DbGFzcy5yYW5kb20ob3B0aW9ucylcbiAgfSBlbHNlIHtcbiAgICBxdWVzdGlvbiA9IG5ldyBRdWVzdGlvbkNsYXNzKG9wdGlvbnMpXG4gIH1cbiAgcmV0dXJuIHF1ZXN0aW9uXG59XG5cbmZ1bmN0aW9uIG5ld09wdGlvbnNTZXQgKGlkKSB7XG4gIGNvbnN0IG9wdGlvbnNTcGVjID0gKGdldENsYXNzKGlkKSkub3B0aW9uc1NwZWMgfHwgW11cbiAgcmV0dXJuIG5ldyBPcHRpb25zU2V0KG9wdGlvbnNTcGVjKVxufVxuXG5mdW5jdGlvbiBoYXNPcHRpb25zIChpZCkge1xuICByZXR1cm4gISEoZ2V0Q2xhc3MoaWQpLm9wdGlvbnNTcGVjICYmIGdldENsYXNzKGlkKS5vcHRpb25zU3BlYy5sZW5ndGggPiAwKSAvLyB3ZWlyZCBib29sIHR5cGNhc3Rpbmcgd29vIVxufVxuXG5leHBvcnQgeyB0b3BpY0xpc3QsIGdldENsYXNzLCBuZXdRdWVzdGlvbiwgZ2V0VG9waWNzLCBnZXRUaXRsZSwgbmV3T3B0aW9uc1NldCwgZ2V0Q29tbWFuZFdvcmQsIGhhc09wdGlvbnMgfVxuIiwiLyogIVxuKiB0aW5nbGUuanNcbiogQGF1dGhvciAgcm9iaW5fcGFyaXNpXG4qIEB2ZXJzaW9uIDAuMTUuMlxuKiBAdXJsXG4qL1xuLy8gTW9kaWZpZWQgdG8gYmUgRVM2IG1vZHVsZVxuXG52YXIgaXNCdXN5ID0gZmFsc2VcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gTW9kYWwgKG9wdGlvbnMpIHtcbiAgdmFyIGRlZmF1bHRzID0ge1xuICAgIG9uQ2xvc2U6IG51bGwsXG4gICAgb25PcGVuOiBudWxsLFxuICAgIGJlZm9yZU9wZW46IG51bGwsXG4gICAgYmVmb3JlQ2xvc2U6IG51bGwsXG4gICAgc3RpY2t5Rm9vdGVyOiBmYWxzZSxcbiAgICBmb290ZXI6IGZhbHNlLFxuICAgIGNzc0NsYXNzOiBbXSxcbiAgICBjbG9zZUxhYmVsOiAnQ2xvc2UnLFxuICAgIGNsb3NlTWV0aG9kczogWydvdmVybGF5JywgJ2J1dHRvbicsICdlc2NhcGUnXVxuICB9XG5cbiAgLy8gZXh0ZW5kcyBjb25maWdcbiAgdGhpcy5vcHRzID0gZXh0ZW5kKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAvLyBpbml0IG1vZGFsXG4gIHRoaXMuaW5pdCgpXG59XG5cbk1vZGFsLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5tb2RhbCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgX2J1aWxkLmNhbGwodGhpcylcbiAgX2JpbmRFdmVudHMuY2FsbCh0aGlzKVxuXG4gIC8vIGluc2VydCBtb2RhbCBpbiBkb21cbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsLCBkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpXG5cbiAgaWYgKHRoaXMub3B0cy5mb290ZXIpIHtcbiAgICB0aGlzLmFkZEZvb3RlcigpXG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuX2J1c3kgPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgaXNCdXN5ID0gc3RhdGVcbn1cblxuTW9kYWwucHJvdG90eXBlLl9pc0J1c3kgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBpc0J1c3lcbn1cblxuTW9kYWwucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLm1vZGFsID09PSBudWxsKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICAvLyByZXN0b3JlIHNjcm9sbGluZ1xuICBpZiAodGhpcy5pc09wZW4oKSkge1xuICAgIHRoaXMuY2xvc2UodHJ1ZSlcbiAgfVxuXG4gIC8vIHVuYmluZCBhbGwgZXZlbnRzXG4gIF91bmJpbmRFdmVudHMuY2FsbCh0aGlzKVxuXG4gIC8vIHJlbW92ZSBtb2RhbCBmcm9tIGRvbVxuICB0aGlzLm1vZGFsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbClcblxuICB0aGlzLm1vZGFsID0gbnVsbFxufVxuXG5Nb2RhbC5wcm90b3R5cGUuaXNPcGVuID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gISF0aGlzLm1vZGFsLmNsYXNzTGlzdC5jb250YWlucygndGluZ2xlLW1vZGFsLS12aXNpYmxlJylcbn1cblxuTW9kYWwucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLl9pc0J1c3koKSkgcmV0dXJuXG4gIHRoaXMuX2J1c3kodHJ1ZSlcblxuICB2YXIgc2VsZiA9IHRoaXNcblxuICAvLyBiZWZvcmUgb3BlbiBjYWxsYmFja1xuICBpZiAodHlwZW9mIHNlbGYub3B0cy5iZWZvcmVPcGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgc2VsZi5vcHRzLmJlZm9yZU9wZW4oKVxuICB9XG5cbiAgaWYgKHRoaXMubW9kYWwuc3R5bGUucmVtb3ZlUHJvcGVydHkpIHtcbiAgICB0aGlzLm1vZGFsLnN0eWxlLnJlbW92ZVByb3BlcnR5KCdkaXNwbGF5JylcbiAgfSBlbHNlIHtcbiAgICB0aGlzLm1vZGFsLnN0eWxlLnJlbW92ZUF0dHJpYnV0ZSgnZGlzcGxheScpXG4gIH1cblxuICAvLyBwcmV2ZW50IGRvdWJsZSBzY3JvbGxcbiAgdGhpcy5fc2Nyb2xsUG9zaXRpb24gPSB3aW5kb3cucGFnZVlPZmZzZXRcbiAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtZW5hYmxlZCcpXG4gIGRvY3VtZW50LmJvZHkuc3R5bGUudG9wID0gLXRoaXMuX3Njcm9sbFBvc2l0aW9uICsgJ3B4J1xuXG4gIC8vIHN0aWNreSBmb290ZXJcbiAgdGhpcy5zZXRTdGlja3lGb290ZXIodGhpcy5vcHRzLnN0aWNreUZvb3RlcilcblxuICAvLyBzaG93IG1vZGFsXG4gIHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsLS12aXNpYmxlJylcblxuICAvLyBvbk9wZW4gY2FsbGJhY2tcbiAgaWYgKHR5cGVvZiBzZWxmLm9wdHMub25PcGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgc2VsZi5vcHRzLm9uT3Blbi5jYWxsKHNlbGYpXG4gIH1cblxuICBzZWxmLl9idXN5KGZhbHNlKVxuXG4gIC8vIGNoZWNrIGlmIG1vZGFsIGlzIGJpZ2dlciB0aGFuIHNjcmVlbiBoZWlnaHRcbiAgdGhpcy5jaGVja092ZXJmbG93KClcblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoZm9yY2UpIHtcbiAgaWYgKHRoaXMuX2lzQnVzeSgpKSByZXR1cm5cbiAgdGhpcy5fYnVzeSh0cnVlKVxuICBmb3JjZSA9IGZvcmNlIHx8IGZhbHNlXG5cbiAgLy8gIGJlZm9yZSBjbG9zZVxuICBpZiAodHlwZW9mIHRoaXMub3B0cy5iZWZvcmVDbG9zZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHZhciBjbG9zZSA9IHRoaXMub3B0cy5iZWZvcmVDbG9zZS5jYWxsKHRoaXMpXG4gICAgaWYgKCFjbG9zZSkge1xuICAgICAgdGhpcy5fYnVzeShmYWxzZSlcbiAgICAgIHJldHVyblxuICAgIH1cbiAgfVxuXG4gIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZSgndGluZ2xlLWVuYWJsZWQnKVxuICBkb2N1bWVudC5ib2R5LnN0eWxlLnRvcCA9IG51bGxcbiAgd2luZG93LnNjcm9sbFRvKHtcbiAgICB0b3A6IHRoaXMuX3Njcm9sbFBvc2l0aW9uLFxuICAgIGJlaGF2aW9yOiAnaW5zdGFudCdcbiAgfSlcblxuICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3RpbmdsZS1tb2RhbC0tdmlzaWJsZScpXG5cbiAgLy8gdXNpbmcgc2ltaWxhciBzZXR1cCBhcyBvbk9wZW5cbiAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgc2VsZi5tb2RhbC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG5cbiAgLy8gb25DbG9zZSBjYWxsYmFja1xuICBpZiAodHlwZW9mIHNlbGYub3B0cy5vbkNsb3NlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgc2VsZi5vcHRzLm9uQ2xvc2UuY2FsbCh0aGlzKVxuICB9XG5cbiAgLy8gcmVsZWFzZSBtb2RhbFxuICBzZWxmLl9idXN5KGZhbHNlKVxufVxuXG5Nb2RhbC5wcm90b3R5cGUuc2V0Q29udGVudCA9IGZ1bmN0aW9uIChjb250ZW50KSB7XG4gIC8vIGNoZWNrIHR5cGUgb2YgY29udGVudCA6IFN0cmluZyBvciBOb2RlXG4gIGlmICh0eXBlb2YgY29udGVudCA9PT0gJ3N0cmluZycpIHtcbiAgICB0aGlzLm1vZGFsQm94Q29udGVudC5pbm5lckhUTUwgPSBjb250ZW50XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5tb2RhbEJveENvbnRlbnQuaW5uZXJIVE1MID0gJydcbiAgICB0aGlzLm1vZGFsQm94Q29udGVudC5hcHBlbmRDaGlsZChjb250ZW50KVxuICB9XG5cbiAgaWYgKHRoaXMuaXNPcGVuKCkpIHtcbiAgICAvLyBjaGVjayBpZiBtb2RhbCBpcyBiaWdnZXIgdGhhbiBzY3JlZW4gaGVpZ2h0XG4gICAgdGhpcy5jaGVja092ZXJmbG93KClcbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5nZXRDb250ZW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5tb2RhbEJveENvbnRlbnRcbn1cblxuTW9kYWwucHJvdG90eXBlLmFkZEZvb3RlciA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gYWRkIGZvb3RlciB0byBtb2RhbFxuICBfYnVpbGRGb290ZXIuY2FsbCh0aGlzKVxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5zZXRGb290ZXJDb250ZW50ID0gZnVuY3Rpb24gKGNvbnRlbnQpIHtcbiAgLy8gc2V0IGZvb3RlciBjb250ZW50XG4gIHRoaXMubW9kYWxCb3hGb290ZXIuaW5uZXJIVE1MID0gY29udGVudFxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5nZXRGb290ZXJDb250ZW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5tb2RhbEJveEZvb3RlclxufVxuXG5Nb2RhbC5wcm90b3R5cGUuc2V0U3RpY2t5Rm9vdGVyID0gZnVuY3Rpb24gKGlzU3RpY2t5KSB7XG4gIC8vIGlmIHRoZSBtb2RhbCBpcyBzbWFsbGVyIHRoYW4gdGhlIHZpZXdwb3J0IGhlaWdodCwgd2UgZG9uJ3QgbmVlZCBzdGlja3lcbiAgaWYgKCF0aGlzLmlzT3ZlcmZsb3coKSkge1xuICAgIGlzU3RpY2t5ID0gZmFsc2VcbiAgfVxuXG4gIGlmIChpc1N0aWNreSkge1xuICAgIGlmICh0aGlzLm1vZGFsQm94LmNvbnRhaW5zKHRoaXMubW9kYWxCb3hGb290ZXIpKSB7XG4gICAgICB0aGlzLm1vZGFsQm94LnJlbW92ZUNoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpXG4gICAgICB0aGlzLm1vZGFsLmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpXG4gICAgICB0aGlzLm1vZGFsQm94Rm9vdGVyLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC1ib3hfX2Zvb3Rlci0tc3RpY2t5JylcbiAgICAgIF9yZWNhbGN1bGF0ZUZvb3RlclBvc2l0aW9uLmNhbGwodGhpcylcbiAgICAgIHRoaXMubW9kYWxCb3hDb250ZW50LnN0eWxlWydwYWRkaW5nLWJvdHRvbSddID0gdGhpcy5tb2RhbEJveEZvb3Rlci5jbGllbnRIZWlnaHQgKyAyMCArICdweCdcbiAgICB9XG4gIH0gZWxzZSBpZiAodGhpcy5tb2RhbEJveEZvb3Rlcikge1xuICAgIGlmICghdGhpcy5tb2RhbEJveC5jb250YWlucyh0aGlzLm1vZGFsQm94Rm9vdGVyKSkge1xuICAgICAgdGhpcy5tb2RhbC5yZW1vdmVDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKVxuICAgICAgdGhpcy5tb2RhbEJveC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKVxuICAgICAgdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS53aWR0aCA9ICdhdXRvJ1xuICAgICAgdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS5sZWZ0ID0gJydcbiAgICAgIHRoaXMubW9kYWxCb3hDb250ZW50LnN0eWxlWydwYWRkaW5nLWJvdHRvbSddID0gJydcbiAgICAgIHRoaXMubW9kYWxCb3hGb290ZXIuY2xhc3NMaXN0LnJlbW92ZSgndGluZ2xlLW1vZGFsLWJveF9fZm9vdGVyLS1zdGlja3knKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5hZGRGb290ZXJCdG4gPSBmdW5jdGlvbiAobGFiZWwsIGNzc0NsYXNzLCBjYWxsYmFjaykge1xuICB2YXIgYnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJylcblxuICAvLyBzZXQgbGFiZWxcbiAgYnRuLmlubmVySFRNTCA9IGxhYmVsXG5cbiAgLy8gYmluZCBjYWxsYmFja1xuICBidG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjYWxsYmFjaylcblxuICBpZiAodHlwZW9mIGNzc0NsYXNzID09PSAnc3RyaW5nJyAmJiBjc3NDbGFzcy5sZW5ndGgpIHtcbiAgICAvLyBhZGQgY2xhc3NlcyB0byBidG5cbiAgICBjc3NDbGFzcy5zcGxpdCgnICcpLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIGJ0bi5jbGFzc0xpc3QuYWRkKGl0ZW0pXG4gICAgfSlcbiAgfVxuXG4gIHRoaXMubW9kYWxCb3hGb290ZXIuYXBwZW5kQ2hpbGQoYnRuKVxuXG4gIHJldHVybiBidG5cbn1cblxuTW9kYWwucHJvdG90eXBlLnJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS53YXJuKCdSZXNpemUgaXMgZGVwcmVjYXRlZCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIHZlcnNpb24gMS4wJylcbn1cblxuTW9kYWwucHJvdG90eXBlLmlzT3ZlcmZsb3cgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciB2aWV3cG9ydEhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodFxuICB2YXIgbW9kYWxIZWlnaHQgPSB0aGlzLm1vZGFsQm94LmNsaWVudEhlaWdodFxuXG4gIHJldHVybiBtb2RhbEhlaWdodCA+PSB2aWV3cG9ydEhlaWdodFxufVxuXG5Nb2RhbC5wcm90b3R5cGUuY2hlY2tPdmVyZmxvdyA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gb25seSBpZiB0aGUgbW9kYWwgaXMgY3VycmVudGx5IHNob3duXG4gIGlmICh0aGlzLm1vZGFsLmNsYXNzTGlzdC5jb250YWlucygndGluZ2xlLW1vZGFsLS12aXNpYmxlJykpIHtcbiAgICBpZiAodGhpcy5pc092ZXJmbG93KCkpIHtcbiAgICAgIHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsLS1vdmVyZmxvdycpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgndGluZ2xlLW1vZGFsLS1vdmVyZmxvdycpXG4gICAgfVxuXG4gICAgLy8gdE9ETzogcmVtb3ZlIG9mZnNldFxuICAgIC8vIF9vZmZzZXQuY2FsbCh0aGlzKTtcbiAgICBpZiAoIXRoaXMuaXNPdmVyZmxvdygpICYmIHRoaXMub3B0cy5zdGlja3lGb290ZXIpIHtcbiAgICAgIHRoaXMuc2V0U3RpY2t5Rm9vdGVyKGZhbHNlKVxuICAgIH0gZWxzZSBpZiAodGhpcy5pc092ZXJmbG93KCkgJiYgdGhpcy5vcHRzLnN0aWNreUZvb3Rlcikge1xuICAgICAgX3JlY2FsY3VsYXRlRm9vdGVyUG9zaXRpb24uY2FsbCh0aGlzKVxuICAgICAgdGhpcy5zZXRTdGlja3lGb290ZXIodHJ1ZSlcbiAgICB9XG4gIH1cbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbi8qID09IHByaXZhdGUgbWV0aG9kcyAqL1xuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuZnVuY3Rpb24gY2xvc2VJY29uICgpIHtcbiAgcmV0dXJuICc8c3ZnIHZpZXdCb3g9XCIwIDAgMTAgMTBcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+PHBhdGggZD1cIk0uMyA5LjdjLjIuMi40LjMuNy4zLjMgMCAuNS0uMS43LS4zTDUgNi40bDMuMyAzLjNjLjIuMi41LjMuNy4zLjIgMCAuNS0uMS43LS4zLjQtLjQuNC0xIDAtMS40TDYuNCA1bDMuMy0zLjNjLjQtLjQuNC0xIDAtMS40LS40LS40LTEtLjQtMS40IDBMNSAzLjYgMS43LjNDMS4zLS4xLjctLjEuMy4zYy0uNC40LS40IDEgMCAxLjRMMy42IDUgLjMgOC4zYy0uNC40LS40IDEgMCAxLjR6XCIgZmlsbD1cIiMwMDBcIiBmaWxsLXJ1bGU9XCJub256ZXJvXCIvPjwvc3ZnPidcbn1cblxuZnVuY3Rpb24gX3JlY2FsY3VsYXRlRm9vdGVyUG9zaXRpb24gKCkge1xuICBpZiAoIXRoaXMubW9kYWxCb3hGb290ZXIpIHtcbiAgICByZXR1cm5cbiAgfVxuICB0aGlzLm1vZGFsQm94Rm9vdGVyLnN0eWxlLndpZHRoID0gdGhpcy5tb2RhbEJveC5jbGllbnRXaWR0aCArICdweCdcbiAgdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS5sZWZ0ID0gdGhpcy5tb2RhbEJveC5vZmZzZXRMZWZ0ICsgJ3B4J1xufVxuXG5mdW5jdGlvbiBfYnVpbGQgKCkge1xuICAvLyB3cmFwcGVyXG4gIHRoaXMubW9kYWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbCcpXG5cbiAgLy8gcmVtb3ZlIGN1c29yIGlmIG5vIG92ZXJsYXkgY2xvc2UgbWV0aG9kXG4gIGlmICh0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmxlbmd0aCA9PT0gMCB8fCB0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoJ292ZXJsYXknKSA9PT0gLTEpIHtcbiAgICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC0tbm9PdmVybGF5Q2xvc2UnKVxuICB9XG5cbiAgdGhpcy5tb2RhbC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG5cbiAgLy8gY3VzdG9tIGNsYXNzXG4gIHRoaXMub3B0cy5jc3NDbGFzcy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKGl0ZW0pXG4gICAgfVxuICB9LCB0aGlzKVxuXG4gIC8vIGNsb3NlIGJ0blxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdidXR0b24nKSAhPT0gLTEpIHtcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKVxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bi50eXBlID0gJ2J1dHRvbidcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4uY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsX19jbG9zZScpXG5cbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG5JY29uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuSWNvbi5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWxfX2Nsb3NlSWNvbicpXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuSWNvbi5pbm5lckhUTUwgPSBjbG9zZUljb24oKVxuXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuTGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJylcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWxfX2Nsb3NlTGFiZWwnKVxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bkxhYmVsLmlubmVySFRNTCA9IHRoaXMub3B0cy5jbG9zZUxhYmVsXG5cbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4uYXBwZW5kQ2hpbGQodGhpcy5tb2RhbENsb3NlQnRuSWNvbilcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4uYXBwZW5kQ2hpbGQodGhpcy5tb2RhbENsb3NlQnRuTGFiZWwpXG4gIH1cblxuICAvLyBtb2RhbFxuICB0aGlzLm1vZGFsQm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgdGhpcy5tb2RhbEJveC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtYm94JylcblxuICAvLyBtb2RhbCBib3ggY29udGVudFxuICB0aGlzLm1vZGFsQm94Q29udGVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIHRoaXMubW9kYWxCb3hDb250ZW50LmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC1ib3hfX2NvbnRlbnQnKVxuXG4gIHRoaXMubW9kYWxCb3guYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveENvbnRlbnQpXG5cbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignYnV0dG9uJykgIT09IC0xKSB7XG4gICAgdGhpcy5tb2RhbC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQ2xvc2VCdG4pXG4gIH1cblxuICB0aGlzLm1vZGFsLmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3gpXG59XG5cbmZ1bmN0aW9uIF9idWlsZEZvb3RlciAoKSB7XG4gIHRoaXMubW9kYWxCb3hGb290ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICB0aGlzLm1vZGFsQm94Rm9vdGVyLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC1ib3hfX2Zvb3RlcicpXG4gIHRoaXMubW9kYWxCb3guYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveEZvb3Rlcilcbn1cblxuZnVuY3Rpb24gX2JpbmRFdmVudHMgKCkge1xuICB0aGlzLl9ldmVudHMgPSB7XG4gICAgY2xpY2tDbG9zZUJ0bjogdGhpcy5jbG9zZS5iaW5kKHRoaXMpLFxuICAgIGNsaWNrT3ZlcmxheTogX2hhbmRsZUNsaWNrT3V0c2lkZS5iaW5kKHRoaXMpLFxuICAgIHJlc2l6ZTogdGhpcy5jaGVja092ZXJmbG93LmJpbmQodGhpcyksXG4gICAga2V5Ym9hcmROYXY6IF9oYW5kbGVLZXlib2FyZE5hdi5iaW5kKHRoaXMpXG4gIH1cblxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdidXR0b24nKSAhPT0gLTEpIHtcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLl9ldmVudHMuY2xpY2tDbG9zZUJ0bilcbiAgfVxuXG4gIHRoaXMubW9kYWwuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGhpcy5fZXZlbnRzLmNsaWNrT3ZlcmxheSlcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMuX2V2ZW50cy5yZXNpemUpXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLl9ldmVudHMua2V5Ym9hcmROYXYpXG59XG5cbmZ1bmN0aW9uIF9oYW5kbGVLZXlib2FyZE5hdiAoZXZlbnQpIHtcbiAgLy8gZXNjYXBlIGtleVxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdlc2NhcGUnKSAhPT0gLTEgJiYgZXZlbnQud2hpY2ggPT09IDI3ICYmIHRoaXMuaXNPcGVuKCkpIHtcbiAgICB0aGlzLmNsb3NlKClcbiAgfVxufVxuXG5mdW5jdGlvbiBfaGFuZGxlQ2xpY2tPdXRzaWRlIChldmVudCkge1xuICAvLyBvbiBtYWNPUywgY2xpY2sgb24gc2Nyb2xsYmFyIChoaWRkZW4gbW9kZSkgd2lsbCB0cmlnZ2VyIGNsb3NlIGV2ZW50IHNvIHdlIG5lZWQgdG8gYnlwYXNzIHRoaXMgYmVoYXZpb3IgYnkgZGV0ZWN0aW5nIHNjcm9sbGJhciBtb2RlXG4gIHZhciBzY3JvbGxiYXJXaWR0aCA9IHRoaXMubW9kYWwub2Zmc2V0V2lkdGggLSB0aGlzLm1vZGFsLmNsaWVudFdpZHRoXG4gIHZhciBjbGlja2VkT25TY3JvbGxiYXIgPSBldmVudC5jbGllbnRYID49IHRoaXMubW9kYWwub2Zmc2V0V2lkdGggLSAxNSAvLyAxNXB4IGlzIG1hY09TIHNjcm9sbGJhciBkZWZhdWx0IHdpZHRoXG4gIHZhciBpc1Njcm9sbGFibGUgPSB0aGlzLm1vZGFsLnNjcm9sbEhlaWdodCAhPT0gdGhpcy5tb2RhbC5vZmZzZXRIZWlnaHRcbiAgaWYgKG5hdmlnYXRvci5wbGF0Zm9ybSA9PT0gJ01hY0ludGVsJyAmJiBzY3JvbGxiYXJXaWR0aCA9PT0gMCAmJiBjbGlja2VkT25TY3JvbGxiYXIgJiYgaXNTY3JvbGxhYmxlKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICAvLyBpZiBjbGljayBpcyBvdXRzaWRlIHRoZSBtb2RhbFxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdvdmVybGF5JykgIT09IC0xICYmICFfZmluZEFuY2VzdG9yKGV2ZW50LnRhcmdldCwgJ3RpbmdsZS1tb2RhbCcpICYmXG4gICAgZXZlbnQuY2xpZW50WCA8IHRoaXMubW9kYWwuY2xpZW50V2lkdGgpIHtcbiAgICB0aGlzLmNsb3NlKClcbiAgfVxufVxuXG5mdW5jdGlvbiBfZmluZEFuY2VzdG9yIChlbCwgY2xzKSB7XG4gIHdoaWxlICgoZWwgPSBlbC5wYXJlbnRFbGVtZW50KSAmJiAhZWwuY2xhc3NMaXN0LmNvbnRhaW5zKGNscykpO1xuICByZXR1cm4gZWxcbn1cblxuZnVuY3Rpb24gX3VuYmluZEV2ZW50cyAoKSB7XG4gIGlmICh0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoJ2J1dHRvbicpICE9PSAtMSkge1xuICAgIHRoaXMubW9kYWxDbG9zZUJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuX2V2ZW50cy5jbGlja0Nsb3NlQnRuKVxuICB9XG4gIHRoaXMubW9kYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGhpcy5fZXZlbnRzLmNsaWNrT3ZlcmxheSlcbiAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMuX2V2ZW50cy5yZXNpemUpXG4gIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLl9ldmVudHMua2V5Ym9hcmROYXYpXG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiA9PSBoZWxwZXJzICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuXG5mdW5jdGlvbiBleHRlbmQgKCkge1xuICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGZvciAodmFyIGtleSBpbiBhcmd1bWVudHNbaV0pIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYXJndW1lbnRzW2ldLCBrZXkpKSB7XG4gICAgICAgIGFyZ3VtZW50c1swXVtrZXldID0gYXJndW1lbnRzW2ldW2tleV1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGFyZ3VtZW50c1swXVxufVxuIiwiaW1wb3J0IFJTbGlkZXIgZnJvbSAndmVuZG9yL3JzbGlkZXInXG5pbXBvcnQgT3B0aW9uc1NldCBmcm9tICdPcHRpb25zU2V0J1xuaW1wb3J0ICogYXMgVG9waWNDaG9vc2VyIGZyb20gJ1RvcGljQ2hvb3NlcidcbmltcG9ydCBNb2RhbCBmcm9tICd2ZW5kb3IvVGluZ2xlJ1xuaW1wb3J0IHsgcmFuZEVsZW0sIGNyZWF0ZUVsZW0sIGhhc0FuY2VzdG9yQ2xhc3MsIGJvb2xPYmplY3RUb0FycmF5IH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG53aW5kb3cuU0hPV19ESUZGSUNVTFRZID0gZmFsc2UgLy8gZm9yIGRlYnVnZ2luZyBxdWVzdGlvbnNcblxuLyogVE9ETyBsaXN0OlxuICogQWRkaXRpb25hbCBxdWVzdGlvbiBibG9jayAtIHByb2JhYmx5IGluIG1haW4uanNcbiAqIFpvb20vc2NhbGUgYnV0dG9uc1xuICogICAgTmVlZCB0byBjaGFuZ2UgY3NzIGdyaWQgc3BhY2luZyB3aXRoIEpTIG9uIGdlbmVyYXRpb25cbiAqIERpc3BsYXkgb3B0aW9uc1xuICovXG5cbi8vIE1ha2UgYW4gb3ZlcmxheSB0byBjYXB0dXJlIGFueSBjbGlja3Mgb3V0c2lkZSBib3hlcywgaWYgbmVjZXNzYXJ5XG5jcmVhdGVFbGVtKCdkaXYnLCAnb3ZlcmxheSBoaWRkZW4nLCBkb2N1bWVudC5ib2R5KS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGhpZGVBbGxBY3Rpb25zKVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBRdWVzdGlvblNldCB7XG4gIGNvbnN0cnVjdG9yIChxTnVtYmVyKSB7XG4gICAgdGhpcy5xdWVzdGlvbnMgPSBbXSAvLyBsaXN0IG9mIHF1ZXN0aW9ucyBhbmQgdGhlIERPTSBlbGVtZW50IHRoZXkncmUgcmVuZGVyZWQgaW5cbiAgICB0aGlzLnRvcGljcyA9IFtdIC8vIGxpc3Qgb2YgdG9waWNzIHdoaWNoIGhhdmUgYmVlbiBzZWxlY3RlZCBmb3IgdGhpcyBzZXRcbiAgICB0aGlzLm9wdGlvbnNTZXRzID0gW10gLy8gbGlzdCBvZiBPcHRpb25zU2V0IG9iamVjdHMgY2Fycnlpbmcgb3B0aW9ucyBmb3IgdG9waWNzIHdpdGggb3B0aW9uc1xuICAgIHRoaXMucU51bWJlciA9IHFOdW1iZXIgfHwgMSAvLyBRdWVzdGlvbiBudW1iZXIgKHBhc3NlZCBpbiBieSBjYWxsZXIsIHdoaWNoIHdpbGwga2VlcCBjb3VudClcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2UgLy8gV2hldGhlciBhbnN3ZXJlZCBvciBub3RcbiAgICB0aGlzLmNvbW1hbmRXb3JkID0gJycgLy8gU29tZXRoaW5nIGxpa2UgJ3NpbXBsaWZ5J1xuICAgIHRoaXMudXNlQ29tbWFuZFdvcmQgPSB0cnVlIC8vIFVzZSB0aGUgY29tbWFuZCB3b3JkIGluIHRoZSBtYWluIHF1ZXN0aW9uLCBmYWxzZSBnaXZlIGNvbW1hbmQgd29yZCB3aXRoIGVhY2ggc3VicXVlc3Rpb25cbiAgICB0aGlzLm4gPSA4IC8vIE51bWJlciBvZiBxdWVzdGlvbnNcblxuICAgIHRoaXMuX2J1aWxkKClcbiAgfVxuXG4gIF9idWlsZCAoKSB7XG4gICAgdGhpcy5vdXRlckJveCA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1vdXRlcmJveCcpXG4gICAgdGhpcy5oZWFkZXJCb3ggPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24taGVhZGVyYm94JywgdGhpcy5vdXRlckJveClcbiAgICB0aGlzLmRpc3BsYXlCb3ggPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tZGlzcGxheWJveCcsIHRoaXMub3V0ZXJCb3gpXG5cbiAgICB0aGlzLl9idWlsZE9wdGlvbnNCb3goKVxuXG4gICAgdGhpcy5fYnVpbGRUb3BpY0Nob29zZXIoKVxuICB9XG5cbiAgX2J1aWxkT3B0aW9uc0JveCAoKSB7XG4gICAgY29uc3QgdG9waWNTcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIG51bGwsIHRoaXMuaGVhZGVyQm94KVxuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uID0gY3JlYXRlRWxlbSgnc3BhbicsICd0b3BpYy1jaG9vc2VyIGJ1dHRvbicsIHRvcGljU3BhbilcbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbi5pbm5lckhUTUwgPSAnQ2hvb3NlIHRvcGljJ1xuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5jaG9vc2VUb3BpY3MoKSlcblxuICAgIGNvbnN0IGRpZmZpY3VsdHlTcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIG51bGwsIHRoaXMuaGVhZGVyQm94KVxuICAgIGRpZmZpY3VsdHlTcGFuLmFwcGVuZCgnRGlmZmljdWx0eTogJylcbiAgICBjb25zdCBkaWZmaWN1bHR5U2xpZGVyT3V0ZXIgPSBjcmVhdGVFbGVtKCdzcGFuJywgJ3NsaWRlci1vdXRlcicsIGRpZmZpY3VsdHlTcGFuKVxuICAgIHRoaXMuZGlmZmljdWx0eVNsaWRlckVsZW1lbnQgPSBjcmVhdGVFbGVtKCdpbnB1dCcsIG51bGwsIGRpZmZpY3VsdHlTbGlkZXJPdXRlcilcblxuICAgIGNvbnN0IG5TcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIG51bGwsIHRoaXMuaGVhZGVyQm94KVxuICAgIG5TcGFuLmFwcGVuZCgnTnVtYmVyIG9mIHF1ZXN0aW9uczogJylcbiAgICBjb25zdCBuUXVlc3Rpb25zSW5wdXQgPSBjcmVhdGVFbGVtKCdpbnB1dCcsICduLXF1ZXN0aW9ucycsIG5TcGFuKVxuICAgIG5RdWVzdGlvbnNJbnB1dC50eXBlID0gJ251bWJlcidcbiAgICBuUXVlc3Rpb25zSW5wdXQubWluID0gJzEnXG4gICAgblF1ZXN0aW9uc0lucHV0LnZhbHVlID0gJzgnXG4gICAgblF1ZXN0aW9uc0lucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHtcbiAgICAgIHRoaXMubiA9IHBhcnNlSW50KG5RdWVzdGlvbnNJbnB1dC52YWx1ZSlcbiAgICB9KVxuXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbiA9IGNyZWF0ZUVsZW0oJ2J1dHRvbicsICdnZW5lcmF0ZS1idXR0b24gYnV0dG9uJywgdGhpcy5oZWFkZXJCb3gpXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5kaXNhYmxlZCA9IHRydWVcbiAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmlubmVySFRNTCA9ICdHZW5lcmF0ZSEnXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuZ2VuZXJhdGVBbGwoKSlcbiAgfVxuXG4gIF9pbml0U2xpZGVyICgpIHtcbiAgICB0aGlzLmRpZmZpY3VsdHlTbGlkZXIgPSBuZXcgUlNsaWRlcih7XG4gICAgICB0YXJnZXQ6IHRoaXMuZGlmZmljdWx0eVNsaWRlckVsZW1lbnQsXG4gICAgICB2YWx1ZXM6IHsgbWluOiAxLCBtYXg6IDEwIH0sXG4gICAgICByYW5nZTogdHJ1ZSxcbiAgICAgIHNldDogWzIsIDZdLFxuICAgICAgc3RlcDogMSxcbiAgICAgIHRvb2x0aXA6IGZhbHNlLFxuICAgICAgc2NhbGU6IHRydWUsXG4gICAgICBsYWJlbHM6IHRydWVcbiAgICB9KVxuICB9XG5cbiAgX2J1aWxkVG9waWNDaG9vc2VyICgpIHtcbiAgICAvLyBidWlsZCBhbiBPcHRpb25zU2V0IG9iamVjdCBmb3IgdGhlIHRvcGljc1xuICAgIGNvbnN0IHRvcGljcyA9IFRvcGljQ2hvb3Nlci5nZXRUb3BpY3MoKVxuICAgIGNvbnN0IG9wdGlvbnNTcGVjID0gW11cbiAgICB0b3BpY3MuZm9yRWFjaCh0b3BpYyA9PiB7XG4gICAgICBvcHRpb25zU3BlYy5wdXNoKHtcbiAgICAgICAgdGl0bGU6IHRvcGljLnRpdGxlLFxuICAgICAgICBpZDogdG9waWMuaWQsXG4gICAgICAgIHR5cGU6ICdib29sJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICAgIHN3YXBMYWJlbDogdHJ1ZVxuICAgICAgfSlcbiAgICB9KVxuICAgIHRoaXMudG9waWNzT3B0aW9ucyA9IG5ldyBPcHRpb25zU2V0KG9wdGlvbnNTcGVjKVxuXG4gICAgLy8gQnVpbGQgYSBtb2RhbCBkaWFsb2cgdG8gcHV0IHRoZW0gaW5cbiAgICB0aGlzLnRvcGljc01vZGFsID0gbmV3IE1vZGFsKHtcbiAgICAgIGZvb3RlcjogdHJ1ZSxcbiAgICAgIHN0aWNreUZvb3RlcjogZmFsc2UsXG4gICAgICBjbG9zZU1ldGhvZHM6IFsnb3ZlcmxheScsICdlc2NhcGUnXSxcbiAgICAgIGNsb3NlTGFiZWw6ICdDbG9zZScsXG4gICAgICBvbkNsb3NlOiAoKSA9PiB7XG4gICAgICAgIHRoaXMudXBkYXRlVG9waWNzKClcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhpcy50b3BpY3NNb2RhbC5hZGRGb290ZXJCdG4oXG4gICAgICAnT0snLFxuICAgICAgJ2J1dHRvbiBtb2RhbC1idXR0b24nLFxuICAgICAgKCkgPT4ge1xuICAgICAgICB0aGlzLnRvcGljc01vZGFsLmNsb3NlKClcbiAgICAgIH0pXG5cbiAgICAvLyByZW5kZXIgb3B0aW9ucyBpbnRvIG1vZGFsXG4gICAgdGhpcy50b3BpY3NPcHRpb25zLnJlbmRlckluKHRoaXMudG9waWNzTW9kYWwubW9kYWxCb3hDb250ZW50KVxuXG4gICAgLy8gQWRkIGZ1cnRoZXIgb3B0aW9ucyBidXR0b25zXG4gICAgLy8gVGhpcyBmZWVscyBhIGJpdCBpZmZ5IC0gZGVwZW5kcyB0b28gbXVjaCBvbiBpbXBsZW1lbnRhdGlvbiBvZiBPcHRpb25zU2V0XG4gICAgY29uc3QgbGlzID0gQXJyYXkuZnJvbSh0aGlzLnRvcGljc01vZGFsLm1vZGFsQm94Q29udGVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnbGknKSlcbiAgICBsaXMuZm9yRWFjaChsaSA9PiB7XG4gICAgICBjb25zdCB0b3BpY0lkID0gbGkuZGF0YXNldC5vcHRpb25JZFxuICAgICAgaWYgKFRvcGljQ2hvb3Nlci5oYXNPcHRpb25zKHRvcGljSWQpKSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnNCdXR0b24gPSBjcmVhdGVFbGVtKCdkaXYnLCAnaWNvbi1idXR0b24gZXh0cmEtb3B0aW9ucy1idXR0b24nLCBsaSlcbiAgICAgICAgdGhpcy5fYnVpbGRUb3BpY09wdGlvbnMobGkuZGF0YXNldC5vcHRpb25JZCwgb3B0aW9uc0J1dHRvbilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgX2J1aWxkVG9waWNPcHRpb25zICh0b3BpY0lkLCBvcHRpb25zQnV0dG9uKSB7XG4gICAgLy8gQnVpbGQgdGhlIFVJIGFuZCBPcHRpb25zU2V0IG9iamVjdCBsaW5rZWQgdG8gdG9waWNJZC4gUGFzcyBpbiBhIGJ1dHRvbiB3aGljaCBzaG91bGQgbGF1bmNoIGl0XG5cbiAgICAvLyBNYWtlIHRoZSBPcHRpb25zU2V0IG9iamVjdCBhbmQgc3RvcmUgYSByZWZlcmVuY2UgdG8gaXRcbiAgICAvLyBPbmx5IHN0b3JlIGlmIG9iamVjdCBpcyBjcmVhdGVkP1xuICAgIGNvbnN0IG9wdGlvbnNTZXQgPSBUb3BpY0Nob29zZXIubmV3T3B0aW9uc1NldCh0b3BpY0lkKVxuICAgIHRoaXMub3B0aW9uc1NldHNbdG9waWNJZF0gPSBvcHRpb25zU2V0XG5cbiAgICAvLyBNYWtlIGEgbW9kYWwgZGlhbG9nIGZvciBpdFxuICAgIGNvbnN0IG1vZGFsID0gbmV3IE1vZGFsKHtcbiAgICAgIGZvb3RlcjogdHJ1ZSxcbiAgICAgIHN0aWNreUZvb3RlcjogZmFsc2UsXG4gICAgICBjbG9zZU1ldGhvZHM6IFsnb3ZlcmxheScsICdlc2NhcGUnXSxcbiAgICAgIGNsb3NlTGFiZWw6ICdDbG9zZSdcbiAgICB9KVxuXG4gICAgbW9kYWwuYWRkRm9vdGVyQnRuKFxuICAgICAgJ09LJyxcbiAgICAgICdidXR0b24gbW9kYWwtYnV0dG9uJyxcbiAgICAgICgpID0+IHtcbiAgICAgICAgbW9kYWwuY2xvc2UoKVxuICAgICAgfSlcblxuICAgIG9wdGlvbnNTZXQucmVuZGVySW4obW9kYWwubW9kYWxCb3hDb250ZW50KVxuXG4gICAgLy8gbGluayB0aGUgbW9kYWwgdG8gdGhlIGJ1dHRvblxuICAgIG9wdGlvbnNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICBtb2RhbC5vcGVuKClcbiAgICB9KVxuICB9XG5cbiAgY2hvb3NlVG9waWNzICgpIHtcbiAgICB0aGlzLnRvcGljc01vZGFsLm9wZW4oKVxuICB9XG5cbiAgdXBkYXRlVG9waWNzICgpIHtcbiAgICAvLyB0b3BpYyBjaG9pY2VzIGFyZSBzdG9yZWQgaW4gdGhpcy50b3BpY3NPcHRpb25zIGF1dG9tYXRpY2FsbHlcbiAgICAvLyBwdWxsIHRoaXMgaW50byB0aGlzLnRvcGljcyBhbmQgdXBkYXRlIGJ1dHRvbiBkaXNwbGF5c1xuXG4gICAgLy8gaGF2ZSBvYmplY3Qgd2l0aCBib29sZWFuIHByb3BlcnRpZXMuIEp1c3Qgd2FudCB0aGUgdHJ1ZSB2YWx1ZXNcbiAgICBjb25zdCB0b3BpY3MgPSBib29sT2JqZWN0VG9BcnJheSh0aGlzLnRvcGljc09wdGlvbnMub3B0aW9ucylcbiAgICB0aGlzLnRvcGljcyA9IHRvcGljc1xuXG4gICAgbGV0IHRleHRcblxuICAgIGlmICh0b3BpY3MubGVuZ3RoID09PSAwKSB7XG4gICAgICB0ZXh0ID0gJ0Nob29zZSB0b3BpYycgLy8gbm90aGluZyBzZWxlY3RlZFxuICAgICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5kaXNhYmxlZCA9IHRydWVcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgaWQgPSB0b3BpY3NbMF0gLy8gZmlyc3QgaXRlbSBzZWxlY3RlZFxuICAgICAgdGV4dCA9IFRvcGljQ2hvb3Nlci5nZXRUaXRsZShpZClcbiAgICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uZGlzYWJsZWQgPSBmYWxzZVxuICAgIH1cblxuICAgIGlmICh0b3BpY3MubGVuZ3RoID4gMSkgeyAvLyBhbnkgYWRkaXRpb25hbCBzaG93IGFzIGUuZy4gJyArIDFcbiAgICAgIHRleHQgKz0gJyArJyArICh0b3BpY3MubGVuZ3RoIC0gMSlcbiAgICB9XG5cbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbi5pbm5lckhUTUwgPSB0ZXh0XG4gIH1cblxuICBzZXRDb21tYW5kV29yZCAoKSB7XG4gICAgLy8gZmlyc3Qgc2V0IHRvIGZpcnN0IHRvcGljIGNvbW1hbmQgd29yZFxuICAgIGxldCBjb21tYW5kV29yZCA9IFRvcGljQ2hvb3Nlci5nZXRDbGFzcyh0aGlzLnRvcGljc1swXSkuY29tbWFuZFdvcmRcbiAgICBsZXQgdXNlQ29tbWFuZFdvcmQgPSB0cnVlIC8vIHRydWUgaWYgc2hhcmVkIGNvbW1hbmQgd29yZFxuXG4gICAgLy8gY3ljbGUgdGhyb3VnaCByZXN0IG9mIHRvcGljcywgcmVzZXQgY29tbWFuZCB3b3JkIGlmIHRoZXkgZG9uJ3QgbWF0Y2hcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IHRoaXMudG9waWNzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoVG9waWNDaG9vc2VyLmdldENsYXNzKHRoaXMudG9waWNzW2ldKS5jb21tYW5kV29yZCAhPT0gY29tbWFuZFdvcmQpIHtcbiAgICAgICAgY29tbWFuZFdvcmQgPSAnJ1xuICAgICAgICB1c2VDb21tYW5kV29yZCA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jb21tYW5kV29yZCA9IGNvbW1hbmRXb3JkXG4gICAgdGhpcy51c2VDb21tYW5kV29yZCA9IHVzZUNvbW1hbmRXb3JkXG4gIH1cblxuICBnZW5lcmF0ZUFsbCAoKSB7XG4gICAgLy8gQ2xlYXIgZGlzcGxheS1ib3ggYW5kIHF1ZXN0aW9uIGxpc3RcbiAgICB0aGlzLmRpc3BsYXlCb3guaW5uZXJIVE1MID0gJydcbiAgICB0aGlzLnF1ZXN0aW9ucyA9IFtdXG4gICAgdGhpcy5zZXRDb21tYW5kV29yZCgpXG5cbiAgICAvLyBTZXQgbnVtYmVyIGFuZCBtYWluIGNvbW1hbmQgd29yZFxuICAgIGNvbnN0IG1haW5xID0gY3JlYXRlRWxlbSgncCcsICdrYXRleCBtYWlucScsIHRoaXMuZGlzcGxheUJveClcbiAgICBtYWlucS5pbm5lckhUTUwgPSBgJHt0aGlzLnFOdW1iZXJ9LiAke3RoaXMuY29tbWFuZFdvcmR9YCAvLyBUT0RPOiBnZXQgY29tbWFuZCB3b3JkIGZyb20gcXVlc3Rpb25zXG5cbiAgICAvLyBNYWtlIHNob3cgYW5zd2VycyBidXR0b25cbiAgICB0aGlzLmFuc3dlckJ1dHRvbiA9IGNyZWF0ZUVsZW0oJ3AnLCAnYnV0dG9uIHNob3ctYW5zd2VycycsIHRoaXMuZGlzcGxheUJveClcbiAgICB0aGlzLmFuc3dlckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHRoaXMudG9nZ2xlQW5zd2VycygpXG4gICAgfSlcbiAgICB0aGlzLmFuc3dlckJ1dHRvbi5pbm5lckhUTUwgPSAnU2hvdyBhbnN3ZXJzJ1xuXG4gICAgLy8gR2V0IGRpZmZpY3VsdHkgZnJvbSBzbGlkZXJcbiAgICBjb25zdCBtaW5kaWZmID0gdGhpcy5kaWZmaWN1bHR5U2xpZGVyLmdldFZhbHVlTCgpXG4gICAgY29uc3QgbWF4ZGlmZiA9IHRoaXMuZGlmZmljdWx0eVNsaWRlci5nZXRWYWx1ZVIoKVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgLy8gTWFrZSBxdWVzdGlvbiBjb250YWluZXIgRE9NIGVsZW1lbnRcbiAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1jb250YWluZXInLCB0aGlzLmRpc3BsYXlCb3gpXG4gICAgICBjb250YWluZXIuZGF0YXNldC5xdWVzdGlvbl9pbmRleCA9IGkgLy8gbm90IHN1cmUgdGhpcyBpcyBhY3R1YWxseSBuZWVkZWRcblxuICAgICAgLy8gQWRkIGNvbnRhaW5lciBsaW5rIHRvIG9iamVjdCBpbiBxdWVzdGlvbnMgbGlzdFxuICAgICAgaWYgKCF0aGlzLnF1ZXN0aW9uc1tpXSkgdGhpcy5xdWVzdGlvbnNbaV0gPSB7fVxuICAgICAgdGhpcy5xdWVzdGlvbnNbaV0uY29udGFpbmVyID0gY29udGFpbmVyXG5cbiAgICAgIC8vIGNob29zZSBhIGRpZmZpY3VsdHkgYW5kIGdlbmVyYXRlXG4gICAgICBjb25zdCBkaWZmaWN1bHR5ID0gbWluZGlmZiArIE1hdGguZmxvb3IoaSAqIChtYXhkaWZmIC0gbWluZGlmZiArIDEpIC8gdGhpcy5uKVxuXG4gICAgICAvLyBjaG9vc2UgYSB0b3BpYyBpZFxuICAgICAgdGhpcy5nZW5lcmF0ZShpLCBkaWZmaWN1bHR5KVxuICAgIH1cbiAgfVxuXG4gIGdlbmVyYXRlIChpLCBkaWZmaWN1bHR5LCB0b3BpY0lkKSB7XG4gICAgLy8gVE9ETyBnZXQgb3B0aW9ucyBwcm9wZXJseVxuICAgIHRvcGljSWQgPSB0b3BpY0lkIHx8IHJhbmRFbGVtKHRoaXMudG9waWNzKVxuXG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgIGxhYmVsOiAnJyxcbiAgICAgIGRpZmZpY3VsdHk6IGRpZmZpY3VsdHksXG4gICAgICB1c2VDb21tYW5kV29yZDogZmFsc2VcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zU2V0c1t0b3BpY0lkXSkge1xuICAgICAgT2JqZWN0LmFzc2lnbihvcHRpb25zLCB0aGlzLm9wdGlvbnNTZXRzW3RvcGljSWRdLm9wdGlvbnMpXG4gICAgfVxuXG4gICAgLy8gY2hvb3NlIGEgcXVlc3Rpb25cbiAgICBjb25zdCBxdWVzdGlvbiA9IFRvcGljQ2hvb3Nlci5uZXdRdWVzdGlvbih0b3BpY0lkLCBvcHRpb25zKVxuXG4gICAgLy8gc2V0IHNvbWUgbW9yZSBkYXRhIGluIHRoZSBxdWVzdGlvbnNbXSBsaXN0XG4gICAgaWYgKCF0aGlzLnF1ZXN0aW9uc1tpXSkgdGhyb3cgbmV3IEVycm9yKCdxdWVzdGlvbiBub3QgbWFkZScpXG4gICAgdGhpcy5xdWVzdGlvbnNbaV0ucXVlc3Rpb24gPSBxdWVzdGlvblxuICAgIHRoaXMucXVlc3Rpb25zW2ldLnRvcGljSWQgPSB0b3BpY0lkXG5cbiAgICAvLyBSZW5kZXIgaW50byB0aGUgY29udGFpbmVyXG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5xdWVzdGlvbnNbaV0uY29udGFpbmVyXG4gICAgY29udGFpbmVyLmlubmVySFRNTCA9ICcnIC8vIGNsZWFyIGluIGNhc2Ugb2YgcmVmcmVzaFxuXG4gICAgLy8gbWFrZSBhbmQgcmVuZGVyIHF1ZXN0aW9uIG51bWJlciBhbmQgY29tbWFuZCB3b3JkIChpZiBuZWVkZWQpXG4gICAgbGV0IHFOdW1iZXJUZXh0ID0gcXVlc3Rpb25MZXR0ZXIoaSkgKyAnKSdcbiAgICBpZiAod2luZG93LlNIT1dfRElGRklDVUxUWSkge3FOdW1iZXJUZXh0ICs9IG9wdGlvbnMuZGlmZmljdWx0eX1cbiAgICBpZiAoIXRoaXMudXNlQ29tbWFuZFdvcmQpIHtcbiAgICAgIHFOdW1iZXJUZXh0ICs9ICcgJyArIFRvcGljQ2hvb3Nlci5nZXRDb21tYW5kV29yZCh0b3BpY0lkKVxuICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ2luZGl2aWR1YWwtY29tbWFuZC13b3JkJylcbiAgICB9IGVsc2Uge1xuICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ2luZGl2aWR1YWwtY29tbWFuZC13b3JkJylcbiAgICB9XG5cbiAgICBjb25zdCBxdWVzdGlvbk51bWJlckRpdiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1udW1iZXIga2F0ZXgnLCBjb250YWluZXIpXG4gICAgcXVlc3Rpb25OdW1iZXJEaXYuaW5uZXJIVE1MID0gcU51bWJlclRleHRcblxuICAgIC8vIHJlbmRlciB0aGUgcXVlc3Rpb25cbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQocXVlc3Rpb24uZ2V0RE9NKCkpIC8vIHRoaXMgaXMgYSAucXVlc3Rpb24tZGl2IGVsZW1lbnRcbiAgICBxdWVzdGlvbi5yZW5kZXIoKSAvLyBzb21lIHF1ZXN0aW9ucyBuZWVkIHJlbmRlcmluZyBhZnRlciBhdHRhY2hpbmcgdG8gRE9NXG5cbiAgICAvLyBtYWtlIGhpZGRlbiBhY3Rpb25zIG1lbnVcbiAgICBjb25zdCBhY3Rpb25zID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWFjdGlvbnMgaGlkZGVuJywgY29udGFpbmVyKVxuICAgIGNvbnN0IHJlZnJlc2hJY29uID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLXJlZnJlc2ggaWNvbi1idXR0b24nLCBhY3Rpb25zKVxuICAgIGNvbnN0IGFuc3dlckljb24gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tYW5zd2VyIGljb24tYnV0dG9uJywgYWN0aW9ucylcblxuICAgIGFuc3dlckljb24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICBxdWVzdGlvbi50b2dnbGVBbnN3ZXIoKVxuICAgICAgaGlkZUFsbEFjdGlvbnMoKVxuICAgIH0pXG5cbiAgICByZWZyZXNoSWNvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHRoaXMuZ2VuZXJhdGUoaSwgZGlmZmljdWx0eSlcbiAgICAgIGhpZGVBbGxBY3Rpb25zKClcbiAgICB9KVxuXG4gICAgLy8gUTogaXMgdGhpcyBiZXN0IHdheSAtIG9yIGFuIGV2ZW50IGxpc3RlbmVyIG9uIHRoZSB3aG9sZSBkaXNwbGF5Qm94P1xuICAgIGNvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGUgPT4ge1xuICAgICAgaWYgKCFoYXNBbmNlc3RvckNsYXNzKGUudGFyZ2V0LCAncXVlc3Rpb24tYWN0aW9ucycpKSB7XG4gICAgICAgIC8vIG9ubHkgZG8gdGhpcyBpZiBpdCBkaWRuJ3Qgb3JpZ2luYXRlIGluIGFjdGlvbiBidXR0b25cbiAgICAgICAgdGhpcy5zaG93UXVlc3Rpb25BY3Rpb25zKGUsIGkpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIHRvZ2dsZUFuc3dlcnMgKCkge1xuICAgIGlmICh0aGlzLmFuc3dlcmVkKSB7XG4gICAgICB0aGlzLnF1ZXN0aW9ucy5mb3JFYWNoKHEgPT4ge1xuICAgICAgICBxLnF1ZXN0aW9uLmhpZGVBbnN3ZXIoKVxuICAgICAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgICAgICAgdGhpcy5hbnN3ZXJCdXR0b24uaW5uZXJIVE1MID0gJ1Nob3cgYW5zd2VycydcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucXVlc3Rpb25zLmZvckVhY2gocSA9PiB7XG4gICAgICAgIHEucXVlc3Rpb24uc2hvd0Fuc3dlcigpXG4gICAgICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gICAgICAgIHRoaXMuYW5zd2VyQnV0dG9uLmlubmVySFRNTCA9ICdIaWRlIGFuc3dlcnMnXG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIHNob3dRdWVzdGlvbkFjdGlvbnMgKGV2ZW50LCBxdWVzdGlvbkluZGV4KSB7XG4gICAgLy8gZmlyc3QgaGlkZSBhbnkgb3RoZXIgYWN0aW9uc1xuICAgIGhpZGVBbGxBY3Rpb25zKClcblxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMucXVlc3Rpb25zW3F1ZXN0aW9uSW5kZXhdLmNvbnRhaW5lclxuICAgIGNvbnN0IGFjdGlvbnMgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcignLnF1ZXN0aW9uLWFjdGlvbnMnKVxuXG4gICAgLy8gVW5oaWRlIHRoZSBvdmVybGF5XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm92ZXJsYXknKS5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgIGFjdGlvbnMuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJylcbiAgICBhY3Rpb25zLnN0eWxlLmxlZnQgPSAoY29udGFpbmVyLm9mZnNldFdpZHRoIC8gMiAtIGFjdGlvbnMub2Zmc2V0V2lkdGggLyAyKSArICdweCdcbiAgICBhY3Rpb25zLnN0eWxlLnRvcCA9IChjb250YWluZXIub2Zmc2V0SGVpZ2h0IC8gMiAtIGFjdGlvbnMub2Zmc2V0SGVpZ2h0IC8gMikgKyAncHgnXG4gIH1cblxuICBhcHBlbmRUbyAoZWxlbSkge1xuICAgIGVsZW0uYXBwZW5kQ2hpbGQodGhpcy5vdXRlckJveClcbiAgICB0aGlzLl9pbml0U2xpZGVyKCkgLy8gaGFzIHRvIGJlIGluIGRvY3VtZW50J3MgRE9NIHRvIHdvcmsgcHJvcGVybHlcbiAgfVxuXG4gIGFwcGVuZEJlZm9yZSAocGFyZW50LCBlbGVtKSB7XG4gICAgcGFyZW50Lmluc2VydEJlZm9yZSh0aGlzLm91dGVyQm94LCBlbGVtKVxuICAgIHRoaXMuX2luaXRTbGlkZXIoKSAvLyBoYXMgdG8gYmUgaW4gZG9jdW1lbnQncyBET00gdG8gd29yayBwcm9wZXJseVxuICB9XG59XG5cbmZ1bmN0aW9uIHF1ZXN0aW9uTGV0dGVyIChpKSB7XG4gIC8vIHJldHVybiBhIHF1ZXN0aW9uIG51bWJlci4gZS5nLiBxTnVtYmVyKDApPVwiYVwiLlxuICAvLyBBZnRlciBsZXR0ZXJzLCB3ZSBnZXQgb24gdG8gZ3JlZWtcbiAgdmFyIGxldHRlciA9XG4gICAgICAgIGkgPCAyNiA/IFN0cmluZy5mcm9tQ2hhckNvZGUoMHg2MSArIGkpXG4gICAgICAgICAgOiBpIDwgNTIgPyBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4NDEgKyBpIC0gMjYpXG4gICAgICAgICAgICA6IFN0cmluZy5mcm9tQ2hhckNvZGUoMHgzQjEgKyBpIC0gNTIpXG4gIHJldHVybiBsZXR0ZXJcbn1cblxuZnVuY3Rpb24gaGlkZUFsbEFjdGlvbnMgKGUpIHtcbiAgLy8gaGlkZSBhbGwgcXVlc3Rpb24gYWN0aW9uc1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucXVlc3Rpb24tYWN0aW9ucycpLmZvckVhY2goZWwgPT4ge1xuICAgIGVsLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpXG4gIH0pXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5vdmVybGF5JykuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcbn1cbiIsImltcG9ydCBRdWVzdGlvblNldCBmcm9tICdRdWVzdGlvblNldCdcblxuLy8gVE9ETzpcbi8vICAtIFF1ZXN0aW9uU2V0IC0gcmVmYWN0b3IgaW50byBtb3JlIGNsYXNzZXM/IEUuZy4gb3B0aW9ucyB3aW5kb3dcbi8vICAtIEltcG9ydCBleGlzdGluZyBxdWVzdGlvbiB0eXBlcyAoRyAtIGdyYXBoaWMsIFQgLSB0ZXh0XG4vLyAgICAtIEcgYW5nbGVzXG4vLyAgICAtIEcgYXJlYVxuLy8gICAgLSBUIGVxdWF0aW9uIG9mIGEgbGluZVxuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKCkgPT4ge1xuICBjb25zdCBxcyA9IG5ldyBRdWVzdGlvblNldCgpXG4gIHFzLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpXG4gIHFzLmNob29zZVRvcGljcygpXG59KVxuIl0sIm5hbWVzIjpbImNvbW1vbmpzSGVscGVycy5jcmVhdGVDb21tb25qc01vZHVsZSIsImNvbW1vbmpzSGVscGVycy5nZXREZWZhdWx0RXhwb3J0RnJvbUNqcyIsIlJTbGlkZXIiLCJUb3BpY0Nob29zZXIuZ2V0VG9waWNzIiwiVG9waWNDaG9vc2VyLmhhc09wdGlvbnMiLCJUb3BpY0Nob29zZXIubmV3T3B0aW9uc1NldCIsIlRvcGljQ2hvb3Nlci5nZXRUaXRsZSIsIlRvcGljQ2hvb3Nlci5nZXRDbGFzcyIsIlRvcGljQ2hvb3Nlci5uZXdRdWVzdGlvbiIsIlRvcGljQ2hvb3Nlci5nZXRDb21tYW5kV29yZCJdLCJtYXBwaW5ncyI6Ijs7O0VBQUE7RUFDQTtFQUNBO0FBQ0E7RUFDQSxJQUFJLEVBQUUsR0FBRyxVQUFVLElBQUksRUFBRTtFQUN6QixFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSTtFQUNuQixFQUFFLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSTtFQUMxQixFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FB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R0FBRyxDQUFDLENBQUMsSUFBSSxLQUFJO0FBQ3RHO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO0VBQ3ZCLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtFQUMzQixNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFDO0VBQy9ELE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDN0QsS0FBSztFQUNMLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDcEcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSTtFQUM3RixHQUFHLE1BQU07RUFDVCxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQyxFQUFFO0VBQ3RGLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDeEQsR0FBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUM7RUFDbEcsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxFQUFDO0FBQ2xEO0VBQ0EsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUk7RUFDdEYsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFJO0FBQ2pFO0VBQ0EsRUFBRSxPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDeEIsRUFBQztBQUNEO0VBQ0EsRUFBRSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDLEVBQUU7RUFDekMsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU07QUFDaEM7RUFDQSxFQUFFLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLElBQUksRUFBQztBQUNqRTtFQUNBLEVBQUUsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFB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R0FBRyxFQUFDO0VBQy9ELFFBQVEsS0FBSztFQUNiLE1BQU0sS0FBSyxDQUFDLENBQUM7RUFDYixNQUFNO0VBQ04sUUFBUSxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLEVBQUM7RUFDaEUsUUFBUSxLQUFLO0VBQ2IsS0FBSztBQUNMO0VBQ0E7RUFDQSxJQUFJO0VBQ0osTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUM3QyxNQUFNLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDN0IsTUFBTTtFQUNOLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFDO0VBQ3pDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFDO0VBQ3pDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFDO0VBQ3pDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFDO0VBQ3pDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFDO0VBQ3pDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFDO0VBQ3pDLEtBQUs7QUFDTDtFQUNBO0VBQ0EsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtFQUMxQixNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUM7RUFDWixNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUM7RUFDWixNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUM7RUFDWixNQUFNLENBQUMsR0FBRyxDQUFD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QyxHQUFHLE1BQU0sQ0FBQyxPQUFNO0FBQzNCO0VBQ0EsSUFBSSxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQztFQUN4QyxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDNUI7RUFDQSxJQUFJLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNsQyxJQUFJLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNsQyxJQUFJLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztBQUNsQztFQUNBLElBQUksTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFDO0VBQy9CLElBQUksTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDO0VBQzVDLElBQUksTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDO0FBQzVDO0VBQ0EsSUFBSSxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksR0FBRyxTQUFTLEVBQUUsSUFBSSxHQUFHLFNBQVMsQ0FBQztFQUN4RCxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFO0VBQ3RCLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBQztFQUNwRSxJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUM7RUFDcEUsSUFBSSxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7RUFDaEMsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRTtFQUN0QixJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQztFQUNyRSxJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQztFQUNyRSxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQztFQUNoQyxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sTUFBTSxDQUFDLENBQUMsTUFBTSxFQUFFO0VBQ3pCLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBQztFQUNwRSxJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUM7RUFDcEUsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUM7RUFDckUsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUM7RUFDckUsSUFBSSxPQUFPLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQztFQUMxRCxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sVUFBVSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRTtFQUM3QjtFQUNBO0VBQ0EsSUFBSSxNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFDO0VBQzVCLElBQUksTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBQztFQUM1QixJQUFJLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksRUFBQztFQUN6QyxJQUFJLE9BQU8sRUFBRSxDQUFDLEVBQUUsSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxHQUFHLE1BQU0sRUFBRTtFQUNqRCxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRTtFQUMzQixJQUFJLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFB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S0FBSyxDQUFDLEVBQUU7RUFDdkMsVUFBVSxPQUFPLElBQUksUUFBUSxFQUFFO0VBQy9CLFNBQVM7RUFDVCxRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDOUUsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sSUFBSSxFQUFFLFVBQVUsTUFBTSxFQUFFO0VBQzlCLFFBQVEsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxDQUFDLEVBQUM7QUFDMUM7RUFDQSxRQUFRLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzVDLFVBQVUsT0FBTyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUM7RUFDbEMsU0FBUztFQUNULFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztFQUNqRixPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxLQUFLLEVBQUUsVUFBVSxNQUFNLEVBQUU7RUFDL0IsUUFBUSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxJQUFJLENBQUMsRUFBQztBQUMxQztFQUNBLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7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Q0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDaEMsT0FBTztBQUNQO0VBQ0EsTUFBTSxRQUFRLEVBQUUsVUFBVSxHQUFHLEVBQUU7RUFDL0I7QUFDQTtFQUNBLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDNUMsVUFBVSxPQUFPLElBQUk7RUFDckIsU0FBUztBQUNUO0VBQ0EsUUFBUSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsV0FBVyxHQUFFO0FBQzNDO0VBQ0EsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLE1BQUs7QUFDMUI7RUFDQSxRQUFRLFNBQVMsR0FBRyxFQUFFLENBQUMsRUFBRTtFQUN6QixVQUFVLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsRUFBRSxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzNELFVBQVUsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDcEQsU0FBUztBQUNUO0VBQ0EsUUFBUSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUM5QyxVQUFVLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDN0MsVUFBVSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsR0FBRyxFQUFFO0VBQ3pELFlBQVksT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDbEMsV0FBVztFQUNYLFNBQVM7RUFDVCxRQUFRLE9BQU8sSUFBSTtFQUNuQixPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxTQUFTLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQ2pDLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbkIsUUFBUSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3RFLE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLE9BQU8sRUFBRSxZQUFZO0VBQzNCLFFBQVEsT0FBTyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7RUFDdkMsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sVUFBVSxFQUFFLFVBQVUsWUFBWSxFQUFFO0VBQzFDLFFBQVEsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFFO0VBQy9CLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUM7RUFDdEIsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBQztFQUN0QixRQUFRLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUU7RUFDeEIsVUFBVSxHQUFHLElBQUksSUFBRztFQUNwQixTQUFTO0FBQ1Q7RUFDQSxRQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtFQUNyQixVQUFVLEdBQUcsSUFBSSxFQUFDO0VBQ2xCLFNBQVMsTUFBTTtFQUNmLFVBQVUsSUFBSSxZQUFZLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQy9ELFlBQVksR0FBRyxJQUFJLE1BQUs7RUFDeEIsWUFBWSxHQUFHLElBQUksSUFBRztFQUN0QixZQUFZLENBQUMsSUFBSSxFQUFDO0VBQ2xCLFdBQVc7QUFDWDtFQUNBLFVBQVUsR0FBRyxJQUFJLEVBQUM7RUFDbEIsVUFBVSxHQUFHLElBQUksSUFBRztFQUNwQixVQUFVLEdBQUcsSUFBSSxFQUFDO0VBQ2xCLFNBQVM7RUFDVCxRQUFRLE9BQU8sR0FBRztFQUNsQixPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxPQUFPLEVBQUUsVUFBVSxZQUFZLEVBQUU7RUFDdkMsUUFBUSxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUU7RUFDL0IsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBQztFQUN0QixRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFDO0VBQ3RCLFFBQVEsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRTtFQUN4QixVQUFVLEdBQUcsSUFBSSxJQUFHO0VBQ3BCLFNBQVM7QUFDVDtFQUNBLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO0VBQ3JCLFVBQVUsR0FBRyxJQUFJLEVBQUM7RUFDbEIsU0FBUyxNQUFNO0VBQ2YsVUFBVSxJQUFJLFlBQVksSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDL0QsWUFBWSxHQUFHLElBQUksTUFBSztFQUN4QixZQUFZLENBQUMsSUFBSSxFQUFDO0VBQ2xCLFdBQVc7QUFDWDtFQUNBLFVBQVUsR0FBRyxJQUFJLFVBQVM7RUFDMUIsVUFBVSxHQUFHLElBQUksRUFBQztFQUNsQixVQUFVLEdBQUcsSUFBSSxLQUFJO0VBQ3JCLFVBQVUsR0FBRyxJQUFJLEVBQUM7RUFDbEIsVUFBVSxHQUFHLElBQUksSUFBRztFQUNwQixTQUFTO0VBQ1QsUUFBUSxPQUFPLEdBQUc7RUFDbEIsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sV0FBVyxFQUFFLFlBQVk7RUFDL0IsUUFBUSxJQUFJLEVBQUM7RUFDYixRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFDO0VBQ3RCLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUM7RUFDdEIsUUFBUSxJQUFJLEdBQUcsR0FBRyxHQUFFO0FBQ3BCO0VBQ0EsUUFBUSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUM1QyxVQUFVLE9BQU8sR0FBRztFQUNwQixTQUFTO0FBQ1Q7RUFDQSxRQUFRLEdBQUc7RUFDWCxVQUFVLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDckMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDbkIsVUFBVSxDQUFDLEdBQUcsRUFBQztFQUNmLFVBQVUsQ0FBQyxHQUFHLEVBQUM7RUFDZixTQUFTLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN6QjtFQUNBLFFBQVEsT0FBTyxHQUFHO0VBQ2xCLE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLFFBQVEsRUFBRSxVQUFVLEdBQUcsRUFBRTtFQUMvQixRQUFRLElBQUksRUFBQztFQUNiLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUM7RUFDdEIsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBQztBQUN0QjtFQUNBLFFBQVEsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQ2xDLFVBQVUsT0FBTyxLQUFLO0VBQ3RCLFNBQVM7QUFDVDtFQUNBLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7RUFDOUIsVUFBVSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDdkIsVUFBVSxDQUFDLElBQUksRUFBQztFQUNoQixVQUFVLENBQUMsSUFBSSxFQUFDO0VBQ2hCLFNBQVM7QUFDVDtFQUNBLFFBQVEsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFFO0FBQ3ZCO0VBQ0EsUUFBUSxJQUFJLE1BQU0sR0FBRyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNuQyxRQUFRLElBQUksTUFBTSxHQUFHLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBQztBQUM3QztFQUNBLFFBQVEsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRTtBQUMxQztFQUNBLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztBQUN4QjtFQUNBLFFBQVEsQ0FBQyxJQUFJLEVBQUM7RUFDZCxRQUFRLENBQUMsSUFBSSxHQUFFO0FBQ2Y7RUFDQSxRQUFRLElBQUksQ0FBQyxFQUFFLEVBQUUsR0FBRyxJQUFJLElBQUcsRUFBRTtBQUM3QjtFQUNBLFFBQVEsSUFBSSxNQUFNLEVBQUU7RUFDcEIsVUFBVSxLQUFLLElBQUksQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsR0FBRztFQUNyQyxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDNUIsWUFBWSxDQUFDLElBQUksRUFBQztFQUNsQixZQUFZLENBQUMsSUFBSSxHQUFFO0VBQ25CLFdBQVc7RUFDWCxVQUFVLEdBQUcsSUFBSSxJQUFHO0VBQ3BCLFVBQVUsS0FBSyxJQUFJLENBQUMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEdBQUc7RUFDckMsWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFDO0VBQzVCLFlBQVksQ0FBQyxJQUFJLEVBQUM7RUFDbEIsWUFBWSxDQUFDLElBQUksR0FBRTtFQUNuQixXQUFXO0VBQ1gsVUFBVSxHQUFHLElBQUksSUFBRztFQUNwQixTQUFTLE1BQU07RUFDZixVQUFVLEtBQUssSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRztFQUN2QyxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDNUIsWUFBWSxDQUFDLElBQUksRUFBQztFQUNsQixZQUFZLENBQUMsSUFBSSxHQUFFO0VBQ25CLFdBQVc7RUFDWCxTQUFTO0VBQ1QsUUFBUSxPQUFPLEdBQUc7RUFDbEIsT0FBTztFQUNQLE1BQUs7QUFDTDtFQUNBLElBSXNDO0VBQ3RDLE1BQU0sTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFDO0VBQ25FLE1BQU0sUUFBUSxDQUFDLE9BQU8sR0FBRyxTQUFRO0VBQ2pDLE1BQU0sUUFBUSxDQUFDLFFBQVEsR0FBRyxTQUFRO0VBQ2xDLE1BQU0sTUFBTSxDQUFDLE9BQU8sR0FBRyxTQUFRO0VBQy9CLEtBRUs7RUFDTCxHQUFHLEVBQWdDLEVBQUM7RUFDcEMsQ0FBQyxFQUFDO0FBQ0Y7QUFDQSxpQkFBZSxlQUFlQyx1QkFBdUMsQ0FBQyxRQUFROztFQy93Qi9ELE1BQU0sUUFBUSxDQUFDO0VBQzlCLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtFQUN0QixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxZQUFZLEdBQUcsRUFBRTtFQUN4QyxNQUFNLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBQztFQUNoQixNQUFNLElBQUksQ0FBQyxFQUFFLEdBQUcsR0FBRTtFQUNsQixLQUFLLE1BQU0sSUFBSSxPQUFPLENBQUMsS0FBSyxRQUFRLEVBQUU7RUFDdEMsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBQztFQUNyQixLQUFLLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUMxQixNQUFNLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBQztFQUNoQixNQUFNLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxHQUFHLEdBQUU7RUFDekIsS0FBSyxNQUFNO0VBQ1gsTUFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUM7RUFDaEIsTUFBTSxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQztFQUM3QyxLQUFLO0VBQ0wsR0FBRztBQUNIO0VBQ0EsRUFBRSxLQUFLLENBQUMsR0FBRztFQUNYLElBQUksTUFBTSxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBQztFQUMvQixJQUFJLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7RUFDbkMsR0FBRztBQUNIO0VBQ0EsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUU7RUFDYixJQUFJLElBQUksRUFBRSxJQUFJLFlBQVksUUFBUSxDQUFDLEVBQUU7RUFDckMsTUFBTSxJQUFJLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFDO0VBQy9CLEtBQUs7RUFDTCxJQUFJLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUM7RUFDN0IsSUFBSSxJQUFJLEVBQUUsR0FBRyxJQUFJLEdBQUcsR0FBRTtFQUN0QixJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsS0FBSztFQUN6QyxNQUFNLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7RUFDakMsUUFBUSxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBQztFQUN2RSxPQUFPLE1BQU07RUFDYixRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFDO0VBQy9DLE9BQU87RUFDUCxLQUFLLEVBQUM7QUFDTjtFQUNBLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxLQUFLO0VBQ3pDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7RUFDN0IsUUFBUSxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBQztFQUMvQyxPQUFPO0VBQ1AsS0FBSyxFQUFDO0VBQ04sSUFBSSxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFDO0VBQzFDLElBQUksT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO0VBQzlCLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxDQUFDLEdBQUc7RUFDYixJQUFJLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUU7RUFDcEQsSUFBSSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFO0VBQy9CLFFBQVEsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHO0VBQzNCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDM0IsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEtBQUs7RUFDekMsTUFBTSxJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUU7RUFDdkIsUUFBUSxHQUFHLElBQUksU0FBUTtFQUN2QixPQUFPLE1BQU07RUFDYixRQUFRLEdBQUcsSUFBSSxRQUFRLEdBQUcsR0FBRyxHQUFHLE1BQUs7RUFDckMsT0FBTztFQUNQLEtBQUssRUFBQztFQUNOLElBQUksT0FBTyxHQUFHO0VBQ2QsR0FBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLENBQUMsR0FBRztFQUNWO0VBQ0EsSUFBSSxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUM7RUFDcEQsR0FBRztBQUNIO0VBQ0EsRUFBRSxVQUFVLENBQUMsR0FBRztFQUNoQixJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSztFQUNoQyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUM7RUFDdEMsS0FBSyxFQUFDO0VBQ04sR0FBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUU7RUFDZDtFQUNBO0VBQ0EsSUFBSSxJQUFJLEVBQUUsSUFBSSxZQUFZLFFBQVEsQ0FBQyxFQUFFO0VBQ3JDLE1BQU0sSUFBSSxHQUFHLElBQUksUUFBUSxDQUFDLElBQUksRUFBQztFQUMvQixLQUFLO0FBQ0w7RUFDQSxJQUFJLElBQUksSUFBSSxHQUFHLEtBQUk7RUFDbkIsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEtBQUs7RUFDekMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssS0FBSyxFQUFFO0VBQ3JFLFFBQVEsSUFBSSxHQUFHLE1BQUs7RUFDcEIsT0FBTztFQUNQLEtBQUssRUFBQztFQUNOLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxLQUFLO0VBQ3pDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEtBQUssRUFBRTtFQUNyRSxRQUFRLElBQUksR0FBRyxNQUFLO0VBQ3BCLE9BQU87RUFDUCxLQUFLLEVBQUM7RUFDTixJQUFJLE9BQU8sSUFBSTtFQUNmLEdBQUc7QUFDSDtFQUNBLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRTtFQUN4QixJQUFJLElBQUksRUFBRSxJQUFJLFlBQVksUUFBUSxDQUFDLEVBQUU7RUFDckMsTUFBTSxJQUFJLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFDO0VBQy9CLEtBQUs7RUFDTDtFQUNBO0VBQ0E7RUFDQSxJQUFJLElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRSxTQUFTLEdBQUcsS0FBSTtFQUNqRCxJQUFJLElBQUksU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDO0VBQzdFLElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBQztFQUM3QixJQUFJLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFFO0VBQ3RCLElBQUksT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO0VBQzlCLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxDQUFDLENBQUMsR0FB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Q0FBQyxDQUFBO1VBQ2pELElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDckQsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFBO1VBQzVDLE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQTtVQUM3QyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxJQUFJLFVBQVUsRUFBRSxDQUFDLE1BQU0sR0FBRyxNQUFNLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQTs7VUFHcEYsT0FBTyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDN0MsV0FBVyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7VUFDakQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUE7VUFDL0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FDNUQ7TUFFRCxNQUFNO1VBQ0osTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7VUFDeEMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFF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TUFBTSxJQUFJLElBQUcsQ0FBQztFQUN4QyxhQUFhLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxLQUFJLENBQUM7RUFDL0MsYUFBYSxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBRyxDQUFDO0VBQ3REO0VBQ0E7RUFDQSxRQUFRLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLElBQUksTUFBSyxDQUFDO0VBQ3JELGFBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sSUFBSSxNQUFLLENBQUM7QUFDMUQ7RUFDQTtFQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsRUFBQyxDQUFDO0VBQ3hDLGFBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsRUFBQyxDQUFDO0VBQzNELGFBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQztBQUN2RDtFQUNBLFFBQVEsT0FBTyxNQUFNLENBQUM7RUFDdEIsS0FBSztBQUNMO0VBQ0EsSUFBSSxTQUFTLEdBQUc7RUFDaEI7RUFDQSxRQUFRLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7RUFDakUsYUFBYSxPQUFP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
