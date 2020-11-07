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
          return new MissingAnglesNumberData(angleSum, angles, missing);
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
          let j = 0; // keeps track of 'x' and 'y' as labels
          for (let i = 0; i < 3; i++) {
              const p = [this.A, this.B, this.C][i];
              const label = {};
              // question text
              let textq;
              if (this.data.missing[i]) {
                  textq = String.fromCharCode(120 + j); // 120 = 'x'
                  j++;
              }
              else {
                  textq = this.data.angles[i].toString();
              }
              textq += '^\\circ';
              label.pos = Point.mean(p, p, inCenter);
              label.textq = textq;
              label.styleq = 'normal';
              if (this.data.missing[i]) {
                  label.texta = this.data.angles[i].toString() + '^\\circ';
                  label.stylea = 'answer';
              }
              else {
                  label.texta = label.textq;
                  label.stylea = label.styleq;
              }
              label.text = label.textq;
              label.style = label.styleq;
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
      constructor(angleSum, angles, missing, apex) {
          super(angleSum, angles, missing);
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
          return question;
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
                  question = MissingAnglesTriangleQ.random(questionOptions, viewOptions);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vbW9kdWxlcy92ZW5kb3IvcnNsaWRlci5qcyIsIi4uL21vZHVsZXMvVXRpbGl0aWVzLmpzIiwiLi4vbW9kdWxlcy9PcHRpb25zU2V0LmpzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9RdWVzdGlvbi50cyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGV4dFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FsZ2VicmFpY0ZyYWN0aW9uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvSW50ZWdlckFkZC5qcyIsIi4uL21vZHVsZXMvUG9pbnQuanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRLnRzIiwiLi4vbW9kdWxlcy92ZW5kb3IvZnJhY3Rpb24uanMiLCIuLi9tb2R1bGVzL01vbm9taWFsLmpzIiwiLi4vbW9kdWxlcy9Qb2x5bm9taWFsLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9Bcml0aG1hZ29uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGVzdFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FkZEFaZXJvLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9UZXh0US9FcXVhdGlvbk9mTGluZS5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEudHMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUS5qcyIsIi4uL21vZHVsZXMvTGluRXhwci5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9zb2x2ZUFuZ2xlcy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldy50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzV29yZGVkRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzV29yZGVkUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzV3JhcHBlci50cyIsIi4uL21vZHVsZXMvVG9waWNDaG9vc2VyLmpzIiwiLi4vbW9kdWxlcy92ZW5kb3IvVGluZ2xlLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvblNldC5qcyIsIi4uL21haW4uanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogUnNsaWRlci4gRG93bmxvYWRlZCBmcm9tIGh0dHBzOi8vc2xhd29taXItemF6aWFibG8uZ2l0aHViLmlvL3JhbmdlLXNsaWRlci9cbiAqIE1vZGlmaWVkIHRvIG1ha2UgaW50byBFUzYgbW9kdWxlIGFuZCBmaXggYSBmZXcgYnVnc1xuICovXG5cbnZhciBSUyA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIHRoaXMuaW5wdXQgPSBudWxsXG4gIHRoaXMuaW5wdXREaXNwbGF5ID0gbnVsbFxuICB0aGlzLnNsaWRlciA9IG51bGxcbiAgdGhpcy5zbGlkZXJXaWR0aCA9IDBcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gMFxuICB0aGlzLnBvaW50ZXJXaWR0aCA9IDBcbiAgdGhpcy5wb2ludGVyUiA9IG51bGxcbiAgdGhpcy5wb2ludGVyTCA9IG51bGxcbiAgdGhpcy5hY3RpdmVQb2ludGVyID0gbnVsbFxuICB0aGlzLnNlbGVjdGVkID0gbnVsbFxuICB0aGlzLnNjYWxlID0gbnVsbFxuICB0aGlzLnN0ZXAgPSAwXG4gIHRoaXMudGlwTCA9IG51bGxcbiAgdGhpcy50aXBSID0gbnVsbFxuICB0aGlzLnRpbWVvdXQgPSBudWxsXG4gIHRoaXMudmFsUmFuZ2UgPSBmYWxzZVxuXG4gIHRoaXMudmFsdWVzID0ge1xuICAgIHN0YXJ0OiBudWxsLFxuICAgIGVuZDogbnVsbFxuICB9XG4gIHRoaXMuY29uZiA9IHtcbiAgICB0YXJnZXQ6IG51bGwsXG4gICAgdmFsdWVzOiBudWxsLFxuICAgIHNldDogbnVsbCxcbiAgICByYW5nZTogZmFsc2UsXG4gICAgd2lkdGg6IG51bGwsXG4gICAgc2NhbGU6IHRydWUsXG4gICAgbGFiZWxzOiB0cnVlLFxuICAgIHRvb2x0aXA6IHRydWUsXG4gICAgc3RlcDogbnVsbCxcbiAgICBkaXNhYmxlZDogZmFsc2UsXG4gICAgb25DaGFuZ2U6IG51bGxcbiAgfVxuXG4gIHRoaXMuY2xzID0ge1xuICAgIGNvbnRhaW5lcjogJ3JzLWNvbnRhaW5lcicsXG4gICAgYmFja2dyb3VuZDogJ3JzLWJnJyxcbiAgICBzZWxlY3RlZDogJ3JzLXNlbGVjdGVkJyxcbiAgICBwb2ludGVyOiAncnMtcG9pbnRlcicsXG4gICAgc2NhbGU6ICdycy1zY2FsZScsXG4gICAgbm9zY2FsZTogJ3JzLW5vc2NhbGUnLFxuICAgIHRpcDogJ3JzLXRvb2x0aXAnXG4gIH1cblxuICBmb3IgKHZhciBpIGluIHRoaXMuY29uZikgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbmYsIGkpKSB0aGlzLmNvbmZbaV0gPSBjb25mW2ldIH1cblxuICB0aGlzLmluaXQoKVxufVxuXG5SUy5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHR5cGVvZiB0aGlzLmNvbmYudGFyZ2V0ID09PSAnb2JqZWN0JykgdGhpcy5pbnB1dCA9IHRoaXMuY29uZi50YXJnZXRcbiAgZWxzZSB0aGlzLmlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5jb25mLnRhcmdldC5yZXBsYWNlKCcjJywgJycpKVxuXG4gIGlmICghdGhpcy5pbnB1dCkgcmV0dXJuIGNvbnNvbGUubG9nKCdDYW5ub3QgZmluZCB0YXJnZXQgZWxlbWVudC4uLicpXG5cbiAgdGhpcy5pbnB1dERpc3BsYXkgPSBnZXRDb21wdXRlZFN0eWxlKHRoaXMuaW5wdXQsIG51bGwpLmRpc3BsYXlcbiAgdGhpcy5pbnB1dC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG4gIHRoaXMudmFsUmFuZ2UgPSAhKHRoaXMuY29uZi52YWx1ZXMgaW5zdGFuY2VvZiBBcnJheSlcblxuICBpZiAodGhpcy52YWxSYW5nZSkge1xuICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuY29uZi52YWx1ZXMsICdtaW4nKSB8fCAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuY29uZi52YWx1ZXMsICdtYXgnKSkgeyByZXR1cm4gY29uc29sZS5sb2coJ01pc3NpbmcgbWluIG9yIG1heCB2YWx1ZS4uLicpIH1cbiAgfVxuICByZXR1cm4gdGhpcy5jcmVhdGVTbGlkZXIoKVxufVxuXG5SUy5wcm90b3R5cGUuY3JlYXRlU2xpZGVyID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNsaWRlciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLmNvbnRhaW5lcilcbiAgdGhpcy5zbGlkZXIuaW5uZXJIVE1MID0gJzxkaXYgY2xhc3M9XCJycy1iZ1wiPjwvZGl2PidcbiAgdGhpcy5zZWxlY3RlZCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnNlbGVjdGVkKVxuICB0aGlzLnBvaW50ZXJMID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMucG9pbnRlciwgWydkaXInLCAnbGVmdCddKVxuICB0aGlzLnNjYWxlID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMuc2NhbGUpXG5cbiAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7XG4gICAgdGhpcy50aXBMID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMudGlwKVxuICAgIHRoaXMudGlwUiA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnRpcClcbiAgICB0aGlzLnBvaW50ZXJMLmFwcGVuZENoaWxkKHRoaXMudGlwTClcbiAgfVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnNlbGVjdGVkKVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnNjYWxlKVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnBvaW50ZXJMKVxuXG4gIGlmICh0aGlzLmNvbmYucmFuZ2UpIHtcbiAgICB0aGlzLnBvaW50ZXJSID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMucG9pbnRlciwgWydkaXInLCAncmlnaHQnXSlcbiAgICBpZiAodGhpcy5jb25mLnRvb2x0aXApIHRoaXMucG9pbnRlclIuYXBwZW5kQ2hpbGQodGhpcy50aXBSKVxuICAgIHRoaXMuc2xpZGVyLmFwcGVuZENoaWxkKHRoaXMucG9pbnRlclIpXG4gIH1cblxuICB0aGlzLmlucHV0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuc2xpZGVyLCB0aGlzLmlucHV0Lm5leHRTaWJsaW5nKVxuXG4gIGlmICh0aGlzLmNvbmYud2lkdGgpIHRoaXMuc2xpZGVyLnN0eWxlLndpZHRoID0gcGFyc2VJbnQodGhpcy5jb25mLndpZHRoKSArICdweCdcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gdGhpcy5zbGlkZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdFxuICB0aGlzLnNsaWRlcldpZHRoID0gdGhpcy5zbGlkZXIuY2xpZW50V2lkdGhcbiAgdGhpcy5wb2ludGVyV2lkdGggPSB0aGlzLnBvaW50ZXJMLmNsaWVudFdpZHRoXG5cbiAgaWYgKCF0aGlzLmNvbmYuc2NhbGUpIHRoaXMuc2xpZGVyLmNsYXNzTGlzdC5hZGQodGhpcy5jbHMubm9zY2FsZSlcblxuICByZXR1cm4gdGhpcy5zZXRJbml0aWFsVmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLnNldEluaXRpYWxWYWx1ZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZGlzYWJsZWQodGhpcy5jb25mLmRpc2FibGVkKVxuXG4gIGlmICh0aGlzLnZhbFJhbmdlKSB0aGlzLmNvbmYudmFsdWVzID0gcHJlcGFyZUFycmF5VmFsdWVzKHRoaXMuY29uZilcblxuICB0aGlzLnZhbHVlcy5zdGFydCA9IDBcbiAgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnJhbmdlID8gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxIDogMFxuXG4gIGlmICh0aGlzLmNvbmYuc2V0ICYmIHRoaXMuY29uZi5zZXQubGVuZ3RoICYmIGNoZWNrSW5pdGlhbCh0aGlzLmNvbmYpKSB7XG4gICAgdmFyIHZhbHMgPSB0aGlzLmNvbmYuc2V0XG5cbiAgICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgICB0aGlzLnZhbHVlcy5zdGFydCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzBdKVxuICAgICAgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnNldFsxXSA/IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzFdKSA6IG51bGxcbiAgICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHZhbHNbMF0pXG4gIH1cbiAgcmV0dXJuIHRoaXMuY3JlYXRlU2NhbGUoKVxufVxuXG5SUy5wcm90b3R5cGUuY3JlYXRlU2NhbGUgPSBmdW5jdGlvbiAocmVzaXplKSB7XG4gIHRoaXMuc3RlcCA9IHRoaXMuc2xpZGVyV2lkdGggLyAodGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHtcbiAgICB2YXIgc3BhbiA9IGNyZWF0ZUVsZW1lbnQoJ3NwYW4nKVxuICAgIHZhciBpbnMgPSBjcmVhdGVFbGVtZW50KCdpbnMnKVxuXG4gICAgc3Bhbi5hcHBlbmRDaGlsZChpbnMpXG4gICAgdGhpcy5zY2FsZS5hcHBlbmRDaGlsZChzcGFuKVxuXG4gICAgc3Bhbi5zdHlsZS53aWR0aCA9IGkgPT09IGlMZW4gLSAxID8gMCA6IHRoaXMuc3RlcCArICdweCdcblxuICAgIGlmICghdGhpcy5jb25mLmxhYmVscykge1xuICAgICAgaWYgKGkgPT09IDAgfHwgaSA9PT0gaUxlbiAtIDEpIGlucy5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW2ldXG4gICAgfSBlbHNlIGlucy5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW2ldXG5cbiAgICBpbnMuc3R5bGUubWFyZ2luTGVmdCA9IChpbnMuY2xpZW50V2lkdGggLyAyKSAqIC0xICsgJ3B4J1xuICB9XG4gIHJldHVybiB0aGlzLmFkZEV2ZW50cygpXG59XG5cblJTLnByb3RvdHlwZS51cGRhdGVTY2FsZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zdGVwID0gdGhpcy5zbGlkZXJXaWR0aCAvICh0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpXG5cbiAgdmFyIHBpZWNlcyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NwYW4nKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gcGllY2VzLmxlbmd0aDsgaSA8IGlMZW4gLSAxOyBpKyspIHsgcGllY2VzW2ldLnN0eWxlLndpZHRoID0gdGhpcy5zdGVwICsgJ3B4JyB9XG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLmFkZEV2ZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHBvaW50ZXJzID0gdGhpcy5zbGlkZXIucXVlcnlTZWxlY3RvckFsbCgnLicgKyB0aGlzLmNscy5wb2ludGVyKVxuICB2YXIgcGllY2VzID0gdGhpcy5zbGlkZXIucXVlcnlTZWxlY3RvckFsbCgnc3BhbicpXG5cbiAgY3JlYXRlRXZlbnRzKGRvY3VtZW50LCAnbW91c2Vtb3ZlIHRvdWNobW92ZScsIHRoaXMubW92ZS5iaW5kKHRoaXMpKVxuICBjcmVhdGVFdmVudHMoZG9jdW1lbnQsICdtb3VzZXVwIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgdGhpcy5kcm9wLmJpbmQodGhpcykpXG5cbiAgZm9yIChsZXQgaSA9IDAsIGlMZW4gPSBwb2ludGVycy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgY3JlYXRlRXZlbnRzKHBvaW50ZXJzW2ldLCAnbW91c2Vkb3duIHRvdWNoc3RhcnQnLCB0aGlzLmRyYWcuYmluZCh0aGlzKSkgfVxuXG4gIGZvciAobGV0IGkgPSAwLCBpTGVuID0gcGllY2VzLmxlbmd0aDsgaSA8IGlMZW47IGkrKykgeyBjcmVhdGVFdmVudHMocGllY2VzW2ldLCAnY2xpY2snLCB0aGlzLm9uQ2xpY2tQaWVjZS5iaW5kKHRoaXMpKSB9XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMub25SZXNpemUuYmluZCh0aGlzKSlcblxuICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxufVxuXG5SUy5wcm90b3R5cGUuZHJhZyA9IGZ1bmN0aW9uIChlKSB7XG4gIGUucHJldmVudERlZmF1bHQoKVxuXG4gIGlmICh0aGlzLmNvbmYuZGlzYWJsZWQpIHJldHVyblxuXG4gIHZhciBkaXIgPSBlLnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtZGlyJylcbiAgaWYgKGRpciA9PT0gJ2xlZnQnKSB0aGlzLmFjdGl2ZVBvaW50ZXIgPSB0aGlzLnBvaW50ZXJMXG4gIGlmIChkaXIgPT09ICdyaWdodCcpIHRoaXMuYWN0aXZlUG9pbnRlciA9IHRoaXMucG9pbnRlclJcblxuICByZXR1cm4gdGhpcy5zbGlkZXIuY2xhc3NMaXN0LmFkZCgnc2xpZGluZycpXG59XG5cblJTLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24gKGUpIHtcbiAgaWYgKHRoaXMuYWN0aXZlUG9pbnRlciAmJiAhdGhpcy5jb25mLmRpc2FibGVkKSB7XG4gICAgdmFyIGNvb3JkWCA9IGUudHlwZSA9PT0gJ3RvdWNobW92ZScgPyBlLnRvdWNoZXNbMF0uY2xpZW50WCA6IGUucGFnZVhcbiAgICB2YXIgaW5kZXggPSBjb29yZFggLSB0aGlzLnNsaWRlckxlZnQgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKVxuXG4gICAgaW5kZXggPSBNYXRoLnJvdW5kKGluZGV4IC8gdGhpcy5zdGVwKVxuXG4gICAgaWYgKGluZGV4IDw9IDApIGluZGV4ID0gMFxuICAgIGlmIChpbmRleCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgaW5kZXggPSB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDFcblxuICAgIGlmICh0aGlzLmNvbmYucmFuZ2UpIHtcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgPT09IHRoaXMucG9pbnRlckwpIHRoaXMudmFsdWVzLnN0YXJ0ID0gaW5kZXhcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgPT09IHRoaXMucG9pbnRlclIpIHRoaXMudmFsdWVzLmVuZCA9IGluZGV4XG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IGluZGV4XG5cbiAgICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxuICB9XG59XG5cblJTLnByb3RvdHlwZS5kcm9wID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmFjdGl2ZVBvaW50ZXIgPSBudWxsXG59XG5cblJTLnByb3RvdHlwZS5zZXRWYWx1ZXMgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICB2YXIgYWN0aXZlUG9pbnRlciA9IHRoaXMuY29uZi5yYW5nZSA/ICdzdGFydCcgOiAnZW5kJ1xuXG4gIGlmIChzdGFydCAmJiB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2Yoc3RhcnQpID4gLTEpIHsgdGhpcy52YWx1ZXNbYWN0aXZlUG9pbnRlcl0gPSB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2Yoc3RhcnQpIH1cblxuICBpZiAoZW5kICYmIHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZihlbmQpID4gLTEpIHsgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKGVuZCkgfVxuXG4gIGlmICh0aGlzLmNvbmYucmFuZ2UgJiYgdGhpcy52YWx1ZXMuc3RhcnQgPiB0aGlzLnZhbHVlcy5lbmQpIHsgdGhpcy52YWx1ZXMuc3RhcnQgPSB0aGlzLnZhbHVlcy5lbmQgfVxuXG4gIHRoaXMucG9pbnRlckwuc3R5bGUubGVmdCA9ICh0aGlzLnZhbHVlc1thY3RpdmVQb2ludGVyXSAqIHRoaXMuc3RlcCAtICh0aGlzLnBvaW50ZXJXaWR0aCAvIDIpKSArICdweCdcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7XG4gICAgICB0aGlzLnRpcEwuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5zdGFydF1cbiAgICAgIHRoaXMudGlwUi5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1cbiAgICB9XG4gICAgdGhpcy5pbnB1dC52YWx1ZSA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdICsgJywnICsgdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG4gICAgdGhpcy5wb2ludGVyUi5zdHlsZS5sZWZ0ID0gKHRoaXMudmFsdWVzLmVuZCAqIHRoaXMuc3RlcCAtICh0aGlzLnBvaW50ZXJXaWR0aCAvIDIpKSArICdweCdcbiAgfSBlbHNlIHtcbiAgICBpZiAodGhpcy5jb25mLnRvb2x0aXApIHsgdGhpcy50aXBMLmlubmVySFRNTCA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXSB9XG4gICAgdGhpcy5pbnB1dC52YWx1ZSA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxuICB9XG5cbiAgaWYgKHRoaXMudmFsdWVzLmVuZCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG4gIGlmICh0aGlzLnZhbHVlcy5zdGFydCA8IDApIHRoaXMudmFsdWVzLnN0YXJ0ID0gMFxuXG4gIHRoaXMuc2VsZWN0ZWQuc3R5bGUud2lkdGggPSAodGhpcy52YWx1ZXMuZW5kIC0gdGhpcy52YWx1ZXMuc3RhcnQpICogdGhpcy5zdGVwICsgJ3B4J1xuICB0aGlzLnNlbGVjdGVkLnN0eWxlLmxlZnQgPSB0aGlzLnZhbHVlcy5zdGFydCAqIHRoaXMuc3RlcCArICdweCdcblxuICByZXR1cm4gdGhpcy5vbkNoYW5nZSgpXG59XG5cblJTLnByb3RvdHlwZS5vbkNsaWNrUGllY2UgPSBmdW5jdGlvbiAoZSkge1xuICBpZiAodGhpcy5jb25mLmRpc2FibGVkKSByZXR1cm5cblxuICB2YXIgaWR4ID0gTWF0aC5yb3VuZCgoZS5jbGllbnRYIC0gdGhpcy5zbGlkZXJMZWZ0KSAvIHRoaXMuc3RlcClcblxuICBpZiAoaWR4ID4gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKSBpZHggPSB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDFcbiAgaWYgKGlkeCA8IDApIGlkeCA9IDBcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgaWYgKGlkeCAtIHRoaXMudmFsdWVzLnN0YXJ0IDw9IHRoaXMudmFsdWVzLmVuZCAtIGlkeCkge1xuICAgICAgdGhpcy52YWx1ZXMuc3RhcnQgPSBpZHhcbiAgICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gaWR4XG4gIH0gZWxzZSB0aGlzLnZhbHVlcy5lbmQgPSBpZHhcblxuICB0aGlzLnNsaWRlci5jbGFzc0xpc3QucmVtb3ZlKCdzbGlkaW5nJylcblxuICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxufVxuXG5SUy5wcm90b3R5cGUub25DaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBfdGhpcyA9IHRoaXNcblxuICBpZiAodGhpcy50aW1lb3V0KSBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0KVxuXG4gIHRoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIGlmIChfdGhpcy5jb25mLm9uQ2hhbmdlICYmIHR5cGVvZiBfdGhpcy5jb25mLm9uQ2hhbmdlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gX3RoaXMuY29uZi5vbkNoYW5nZShfdGhpcy5pbnB1dC52YWx1ZSlcbiAgICB9XG4gIH0sIDUwMClcbn1cblxuUlMucHJvdG90eXBlLm9uUmVzaXplID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNsaWRlckxlZnQgPSB0aGlzLnNsaWRlci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0XG4gIHRoaXMuc2xpZGVyV2lkdGggPSB0aGlzLnNsaWRlci5jbGllbnRXaWR0aFxuICByZXR1cm4gdGhpcy51cGRhdGVTY2FsZSgpXG59XG5cblJTLnByb3RvdHlwZS5kaXNhYmxlZCA9IGZ1bmN0aW9uIChkaXNhYmxlZCkge1xuICB0aGlzLmNvbmYuZGlzYWJsZWQgPSBkaXNhYmxlZFxuICB0aGlzLnNsaWRlci5jbGFzc0xpc3RbZGlzYWJsZWQgPyAnYWRkJyA6ICdyZW1vdmUnXSgnZGlzYWJsZWQnKVxufVxuXG5SUy5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIFJldHVybiBsaXN0IG9mIG51bWJlcnMsIHJhdGhlciB0aGFuIGEgc3RyaW5nLCB3aGljaCB3b3VsZCBqdXN0IGJlIHNpbGx5XG4gIC8vICByZXR1cm4gdGhpcy5pbnB1dC52YWx1ZVxuICByZXR1cm4gW3RoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdLCB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1dXG59XG5cblJTLnByb3RvdHlwZS5nZXRWYWx1ZUwgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIEdldCBsZWZ0IChpLmUuIHNtYWxsZXN0KSB2YWx1ZVxuICByZXR1cm4gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5zdGFydF1cbn1cblxuUlMucHJvdG90eXBlLmdldFZhbHVlUiA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gR2V0IHJpZ2h0IChpLmUuIHNtYWxsZXN0KSB2YWx1ZVxuICByZXR1cm4gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG59XG5cblJTLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmlucHV0LnN0eWxlLmRpc3BsYXkgPSB0aGlzLmlucHV0RGlzcGxheVxuICB0aGlzLnNsaWRlci5yZW1vdmUoKVxufVxuXG52YXIgY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uIChlbCwgY2xzLCBkYXRhQXR0cikge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZWwpXG4gIGlmIChjbHMpIGVsZW1lbnQuY2xhc3NOYW1lID0gY2xzXG4gIGlmIChkYXRhQXR0ciAmJiBkYXRhQXR0ci5sZW5ndGggPT09IDIpIHsgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2RhdGEtJyArIGRhdGFBdHRyWzBdLCBkYXRhQXR0clsxXSkgfVxuXG4gIHJldHVybiBlbGVtZW50XG59XG5cbnZhciBjcmVhdGVFdmVudHMgPSBmdW5jdGlvbiAoZWwsIGV2LCBjYWxsYmFjaykge1xuICB2YXIgZXZlbnRzID0gZXYuc3BsaXQoJyAnKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gZXZlbnRzLmxlbmd0aDsgaSA8IGlMZW47IGkrKykgeyBlbC5hZGRFdmVudExpc3RlbmVyKGV2ZW50c1tpXSwgY2FsbGJhY2spIH1cbn1cblxudmFyIHByZXBhcmVBcnJheVZhbHVlcyA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIHZhciB2YWx1ZXMgPSBbXVxuICB2YXIgcmFuZ2UgPSBjb25mLnZhbHVlcy5tYXggLSBjb25mLnZhbHVlcy5taW5cblxuICBpZiAoIWNvbmYuc3RlcCkge1xuICAgIGNvbnNvbGUubG9nKCdObyBzdGVwIGRlZmluZWQuLi4nKVxuICAgIHJldHVybiBbY29uZi52YWx1ZXMubWluLCBjb25mLnZhbHVlcy5tYXhdXG4gIH1cblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IChyYW5nZSAvIGNvbmYuc3RlcCk7IGkgPCBpTGVuOyBpKyspIHsgdmFsdWVzLnB1c2goY29uZi52YWx1ZXMubWluICsgaSAqIGNvbmYuc3RlcCkgfVxuXG4gIGlmICh2YWx1ZXMuaW5kZXhPZihjb25mLnZhbHVlcy5tYXgpIDwgMCkgdmFsdWVzLnB1c2goY29uZi52YWx1ZXMubWF4KVxuXG4gIHJldHVybiB2YWx1ZXNcbn1cblxudmFyIGNoZWNrSW5pdGlhbCA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIGlmICghY29uZi5zZXQgfHwgY29uZi5zZXQubGVuZ3RoIDwgMSkgcmV0dXJuIG51bGxcbiAgaWYgKGNvbmYudmFsdWVzLmluZGV4T2YoY29uZi5zZXRbMF0pIDwgMCkgcmV0dXJuIG51bGxcblxuICBpZiAoY29uZi5yYW5nZSkge1xuICAgIGlmIChjb25mLnNldC5sZW5ndGggPCAyIHx8IGNvbmYudmFsdWVzLmluZGV4T2YoY29uZi5zZXRbMV0pIDwgMCkgcmV0dXJuIG51bGxcbiAgfVxuICByZXR1cm4gdHJ1ZVxufVxuXG5leHBvcnQgZGVmYXVsdCBSU1xuIiwiLyogUk5HcyAvIHNlbGVjdG9ycyAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdhdXNzaWFuIChuKSB7XG4gIGxldCBybnVtID0gMFxuICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgIHJudW0gKz0gTWF0aC5yYW5kb20oKVxuICB9XG4gIHJldHVybiBybnVtIC8gblxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZEJldHdlZW4gKG4sIG0sIGRpc3QpIHtcbiAgLy8gcmV0dXJuIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBuIGFuZCBtIGluY2x1c2l2ZVxuICAvLyBkaXN0IChvcHRpb25hbCkgaXMgYSBmdW5jdGlvbiByZXR1cm5pbmcgYSB2YWx1ZSBpbiBbMCwxKVxuICAvLyBkZWZhdWx0IGlzIHNsaWdodGx5IGJpYXNlZCB0b3dhcmRzIG1pZGRsZVxuICBpZiAoIWRpc3QpIGRpc3QgPSBNYXRoLnJhbmRvbVxuICByZXR1cm4gbiArIE1hdGguZmxvb3IoZGlzdCgpICogKG0gLSBuICsgMSkpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kQmV0d2VlbkZpbHRlciAobiwgbSwgZmlsdGVyKSB7XG4gIC8qIHJldHVybnMgYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIG4gYW5kIG0gaW5jbHVzaXZlIHdoaWNoIHNhdGlzZmllcyB0aGUgZmlsdGVyXG4gIC8gIG4sIG06IGludGVnZXJcbiAgLyAgZmlsdGVyOiBJbnQtPiBCb29sXG4gICovXG4gIGNvbnN0IGFyciA9IFtdXG4gIGZvciAobGV0IGkgPSBuOyBpIDwgbSArIDE7IGkrKykge1xuICAgIGlmIChmaWx0ZXIoaSkpIGFyci5wdXNoKGkpXG4gIH1cbiAgaWYgKGFyciA9PT0gW10pIHRocm93IG5ldyBFcnJvcignb3ZlcmZpbHRlcmVkJylcbiAgY29uc3QgaSA9IHJhbmRCZXR3ZWVuKDAsIGFyci5sZW5ndGggLSAxKVxuICByZXR1cm4gYXJyW2ldXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kTXVsdEJldHdlZW4gKG1pbiwgbWF4LCBuKSB7XG4gIC8vIHJldHVybiBhIHJhbmRvbSBtdWx0aXBsZSBvZiBuIGJldHdlZW4gbiBhbmQgbSAoaW5jbHVzaXZlIGlmIHBvc3NpYmxlKVxuICBtaW4gPSBNYXRoLmNlaWwobWluIC8gbikgKiBuXG4gIG1heCA9IE1hdGguZmxvb3IobWF4IC8gbikgKiBuIC8vIGNvdWxkIGNoZWNrIGRpdmlzaWJpbGl0eSBmaXJzdCB0byBtYXhpbWlzZSBwZXJmb3JtYWNlLCBidXQgSSdtIHN1cmUgdGhlIGhpdCBpc24ndCBiYWRcblxuICByZXR1cm4gcmFuZEJldHdlZW4obWluIC8gbiwgbWF4IC8gbikgKiBuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kRWxlbSAoYXJyYXksIGRpc3QpIHtcbiAgaWYgKFsuLi5hcnJheV0ubGVuZ3RoID09PSAwKSB0aHJvdyBuZXcgRXJyb3IoJ2VtcHR5IGFycmF5JylcbiAgaWYgKCFkaXN0KSBkaXN0ID0gTWF0aC5yYW5kb21cbiAgY29uc3QgbiA9IGFycmF5Lmxlbmd0aCB8fCBhcnJheS5zaXplXG4gIGNvbnN0IGkgPSByYW5kQmV0d2VlbigwLCBuIC0gMSwgZGlzdClcbiAgcmV0dXJuIFsuLi5hcnJheV1baV1cbn1cblxuLyogTWF0aHMgKi9cbmV4cG9ydCBmdW5jdGlvbiByb3VuZFRvVGVuIChuKSB7XG4gIHJldHVybiBNYXRoLnJvdW5kKG4gLyAxMCkgKiAxMFxufVxuXG4vKipcbiAqIFJvdW5kcyBhIG51bWJlciB0byBhIGdpdmVuIG51bWJlciBvZiBkZWNpbWFsIHBsYWNlc1xuICogQHBhcmFtIHtudW1iZXJ9IHggVGhlIG51bWJlciB0byByb3VuZFxuICogQHBhcmFtIHtudW1iZXJ9IG4gVGhlIG51bWJlciBvZiBkZWNpbWFsIHBsYWNlc1xuICogQHJldHVybnMge251bWJlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJvdW5kRFAgKHgsIG4pIHtcbiAgcmV0dXJuIE1hdGgucm91bmQoeCAqIE1hdGgucG93KDEwLCBuKSkgLyBNYXRoLnBvdygxMCwgbilcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlZ1RvUmFkICh4KSB7XG4gIHJldHVybiB4ICogTWF0aC5QSSAvIDE4MFxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2luRGVnICh4KSB7XG4gIHJldHVybiBNYXRoLnNpbih4ICogTWF0aC5QSSAvIDE4MClcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvc0RlZyAoeCkge1xuICByZXR1cm4gTWF0aC5jb3MoeCAqIE1hdGguUEkgLyAxODApXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzY2FsZWRTdHIgKG4sIGRwKSB7XG4gIC8vIHJldHVybnMgYSBzdHJpbmcgcmVwcmVzZW50aW5nIG4vMTBeZHBcbiAgLy8gZS5nLiBzY2FsZWRTdHIoMzQsMSk9XCIzLjRcIlxuICAvLyBzY2FsZWRTdHIoMzE0LDIpPVwiMy4xNFwiXG4gIC8vIHNjYWxlZFN0cigzMCwxKT1cIjNcIlxuICAvLyBUcnlpbmcgdG8gYXZvaWQgcHJlY2lzaW9uIGVycm9ycyFcbiAgaWYgKGRwID09PSAwKSByZXR1cm4gblxuICBjb25zdCBmYWN0b3IgPSBNYXRoLnBvdygxMCwgZHApXG4gIGNvbnN0IGludHBhcnQgPSBNYXRoLmZsb29yKG4gLyBmYWN0b3IpXG4gIGNvbnN0IGRlY3BhcnQgPSBuICUgZmFjdG9yXG4gIGlmIChkZWNwYXJ0ID09PSAwKSB7XG4gICAgcmV0dXJuIGludHBhcnRcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gaW50cGFydCArICcuJyArIGRlY3BhcnRcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2NkIChhLCBiKSB7XG4gIC8vIHRha2VuIGZyb20gZnJhY3Rpb24uanNcbiAgaWYgKCFhKSB7IHJldHVybiBiIH1cbiAgaWYgKCFiKSB7IHJldHVybiBhIH1cblxuICB3aGlsZSAoMSkge1xuICAgIGEgJT0gYlxuICAgIGlmICghYSkgeyByZXR1cm4gYiB9XG4gICAgYiAlPSBhXG4gICAgaWYgKCFiKSB7IHJldHVybiBhIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbGNtIChhLCBiKSB7XG4gIHJldHVybiBhICogYiAvIGdjZChhLCBiKVxufVxuXG4vKiBBcnJheXMgYW5kIHNpbWlsYXIgKi9cblxuLyoqXG4gKiBTb3J0cyB0d28gYXJyYXlzIHRvZ2V0aGVyIGJhc2VkIG9uIHNvcnRpbmcgYXJyMFxuICogQHBhcmFtIHsqW119IGFycjAgXG4gKiBAcGFyYW0geypbXX0gYXJyMSBcbiAqIEBwYXJhbSB7Kn0gZiBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNvcnRUb2dldGhlciAoYXJyMCwgYXJyMSwgZikge1xuICBpZiAoYXJyMC5sZW5ndGggIT09IGFycjEubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm90aCBhcmd1bWVudHMgbXVzdCBiZSBhcnJheXMgb2YgdGhlIHNhbWUgbGVuZ3RoJylcbiAgfVxuXG4gIGYgPSBmIHx8ICgoeCx5KT0+eC15KVxuXG4gIGNvbnN0IG4gPSBhcnIwLmxlbmd0aFxuICBjb25zdCBjb21iaW5lZCA9IFtdXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgY29tYmluZWRbaV0gPSBbYXJyMFtpXSwgYXJyMVtpXV1cbiAgfVxuXG4gIGNvbWJpbmVkLnNvcnQoKHgsIHkpID0+IGYoeFswXSwgeVswXSkpXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICBhcnIwW2ldID0gY29tYmluZWRbaV1bMF1cbiAgICBhcnIxW2ldID0gY29tYmluZWRbaV1bMV1cbiAgfVxuXG4gIHJldHVybiBbYXJyMCwgYXJyMV1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGUgKGFycmF5KSB7XG4gIC8vIEtudXRoLUZpc2hlci1ZYXRlc1xuICAvLyBmcm9tIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yNDUwOTc2LzM3MzcyOTVcbiAgLy8gbmIuIHNodWZmbGVzIGluIHBsYWNlXG4gIHZhciBjdXJyZW50SW5kZXggPSBhcnJheS5sZW5ndGg7IHZhciB0ZW1wb3JhcnlWYWx1ZTsgdmFyIHJhbmRvbUluZGV4XG5cbiAgLy8gV2hpbGUgdGhlcmUgcmVtYWluIGVsZW1lbnRzIHRvIHNodWZmbGUuLi5cbiAgd2hpbGUgKGN1cnJlbnRJbmRleCAhPT0gMCkge1xuICAgIC8vIFBpY2sgYSByZW1haW5pbmcgZWxlbWVudC4uLlxuICAgIHJhbmRvbUluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY3VycmVudEluZGV4KVxuICAgIGN1cnJlbnRJbmRleCAtPSAxXG5cbiAgICAvLyBBbmQgc3dhcCBpdCB3aXRoIHRoZSBjdXJyZW50IGVsZW1lbnQuXG4gICAgdGVtcG9yYXJ5VmFsdWUgPSBhcnJheVtjdXJyZW50SW5kZXhdXG4gICAgYXJyYXlbY3VycmVudEluZGV4XSA9IGFycmF5W3JhbmRvbUluZGV4XVxuICAgIGFycmF5W3JhbmRvbUluZGV4XSA9IHRlbXBvcmFyeVZhbHVlXG4gIH1cblxuICByZXR1cm4gYXJyYXlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdlYWtJbmNsdWRlcyAoYSwgZSkge1xuICByZXR1cm4gKEFycmF5LmlzQXJyYXkoYSkgJiYgYS5pbmNsdWRlcyhlKSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpcnN0VW5pcXVlSW5kZXggKGFycmF5KSB7XG4gIC8vIHJldHVybnMgaW5kZXggb2YgZmlyc3QgdW5pcXVlIGVsZW1lbnRcbiAgLy8gaWYgbm9uZSwgcmV0dXJucyBsZW5ndGggb2YgYXJyYXlcbiAgbGV0IGkgPSAwXG4gIHdoaWxlIChpIDwgYXJyYXkubGVuZ3RoKSB7XG4gICAgaWYgKGFycmF5LmluZGV4T2YoYXJyYXlbaV0pID09PSBhcnJheS5sYXN0SW5kZXhPZihhcnJheVtpXSkpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIGkrK1xuICB9XG4gIHJldHVybiBpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBib29sT2JqZWN0VG9BcnJheSAob2JqKSB7XG4gIC8vIEdpdmVuIGFuIG9iamVjdCB3aGVyZSBhbGwgdmFsdWVzIGFyZSBib29sZWFuLCByZXR1cm4ga2V5cyB3aGVyZSB0aGUgdmFsdWUgaXMgdHJ1ZVxuICBjb25zdCByZXN1bHQgPSBbXVxuICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHtcbiAgICBpZiAob2JqW2tleV0pIHJlc3VsdC5wdXNoKGtleSlcbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qIE9iamVjdCBwcm9wZXJ0eSBhY2Nlc3MgYnkgc3RyaW5nICovXG5leHBvcnQgZnVuY3Rpb24gcHJvcEJ5U3RyaW5nIChvLCBzLCB4KSB7XG4gIC8qIEUuZy4gYnlTdHJpbmcobXlPYmosXCJmb28uYmFyXCIpIC0+IG15T2JqLmZvby5iYXJcbiAgICAgKiBieVN0cmluZyhteU9iaixcImZvby5iYXJcIixcImJhelwiKSAtPiBteU9iai5mb28uYmFyID0gXCJiYXpcIlxuICAgICAqL1xuICBzID0gcy5yZXBsYWNlKC9cXFsoXFx3KylcXF0vZywgJy4kMScpIC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gIHMgPSBzLnJlcGxhY2UoL15cXC4vLCAnJykgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICB2YXIgYSA9IHMuc3BsaXQoJy4nKVxuICBmb3IgKHZhciBpID0gMCwgbiA9IGEubGVuZ3RoIC0gMTsgaSA8IG47ICsraSkge1xuICAgIHZhciBrID0gYVtpXVxuICAgIGlmIChrIGluIG8pIHtcbiAgICAgIG8gPSBvW2tdXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgfVxuICBpZiAoeCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gb1thW25dXVxuICBlbHNlIG9bYVtuXV0gPSB4XG59XG5cbi8qIExvZ2ljICovXG5leHBvcnQgZnVuY3Rpb24gbUlmIChwLCBxKSB7IC8vIG1hdGVyaWFsIGNvbmRpdGlvbmFsXG4gIHJldHVybiAoIXAgfHwgcSlcbn1cblxuLyogRE9NIG1hbmlwdWxhdGlvbiBhbmQgcXVlcnlpbmcgKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbGVtICh0YWdOYW1lLCBjbGFzc05hbWUsIHBhcmVudCkge1xuICAvLyBjcmVhdGUsIHNldCBjbGFzcyBhbmQgYXBwZW5kIGluIG9uZVxuICBjb25zdCBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKVxuICBpZiAoY2xhc3NOYW1lKSBlbGVtLmNsYXNzTmFtZSA9IGNsYXNzTmFtZVxuICBpZiAocGFyZW50KSBwYXJlbnQuYXBwZW5kQ2hpbGQoZWxlbSlcbiAgcmV0dXJuIGVsZW1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc0FuY2VzdG9yQ2xhc3MgKGVsZW0sIGNsYXNzTmFtZSkge1xuICAvLyBjaGVjayBpZiBhbiBlbGVtZW50IGVsZW0gb3IgYW55IG9mIGl0cyBhbmNlc3RvcnMgaGFzIGNsc3NcbiAgbGV0IHJlc3VsdCA9IGZhbHNlXG4gIGZvciAoO2VsZW0gJiYgZWxlbSAhPT0gZG9jdW1lbnQ7IGVsZW0gPSBlbGVtLnBhcmVudE5vZGUpIHsgLy8gdHJhdmVyc2UgRE9NIHVwd2FyZHNcbiAgICBpZiAoZWxlbS5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKSkge1xuICAgICAgcmVzdWx0ID0gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qIENhbnZhcyBkcmF3aW5nICovXG5leHBvcnQgZnVuY3Rpb24gZGFzaGVkTGluZSAoY3R4LCB4MSwgeTEsIHgyLCB5Mikge1xuICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHgyIC0geDEsIHkyIC0geTEpXG4gIGNvbnN0IGRhc2h4ID0gKHkxIC0geTIpIC8gbGVuZ3RoIC8vIHVuaXQgdmVjdG9yIHBlcnBlbmRpY3VsYXIgdG8gbGluZVxuICBjb25zdCBkYXNoeSA9ICh4MiAtIHgxKSAvIGxlbmd0aFxuICBjb25zdCBtaWR4ID0gKHgxICsgeDIpIC8gMlxuICBjb25zdCBtaWR5ID0gKHkxICsgeTIpIC8gMlxuXG4gIC8vIGRyYXcgdGhlIGJhc2UgbGluZVxuICBjdHgubW92ZVRvKHgxLCB5MSlcbiAgY3R4LmxpbmVUbyh4MiwgeTIpXG5cbiAgLy8gZHJhdyB0aGUgZGFzaFxuICBjdHgubW92ZVRvKG1pZHggKyA1ICogZGFzaHgsIG1pZHkgKyA1ICogZGFzaHkpXG4gIGN0eC5saW5lVG8obWlkeCAtIDUgKiBkYXNoeCwgbWlkeSAtIDUgKiBkYXNoeSlcblxuICBjdHgubW92ZVRvKHgyLCB5Milcbn1cbiIsImltcG9ydCB7IGNyZWF0ZUVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE9wdGlvbnNTZXQge1xuICBjb25zdHJ1Y3RvciAob3B0aW9uU3BlYywgdGVtcGxhdGUpIHtcbiAgICB0aGlzLm9wdGlvblNwZWMgPSBvcHRpb25TcGVjXG5cbiAgICB0aGlzLm9wdGlvbnMgPSB7fVxuICAgIHRoaXMub3B0aW9uU3BlYy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICBpZiAob3B0aW9uLnR5cGUgIT09ICdoZWFkaW5nJyAmJiBvcHRpb24udHlwZSAhPT0gJ2NvbHVtbi1icmVhaycpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBvcHRpb24uZGVmYXVsdFxuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGUgLy8gaHRtbCB0ZW1wbGF0ZSAob3B0aW9uYWwpXG5cbiAgICAvLyBzZXQgYW4gaWQgYmFzZWQgb24gYSBjb3VudGVyIC0gdXNlZCBmb3IgbmFtZXMgb2YgZm9ybSBlbGVtZW50c1xuICAgIHRoaXMuZ2xvYmFsSWQgPSBPcHRpb25zU2V0LmdldElkKClcbiAgfVxuXG4gIHVwZGF0ZVN0YXRlRnJvbVVJIChvcHRpb24pIHtcbiAgICAvLyBpbnB1dCAtIGVpdGhlciBhbiBlbGVtZW50IG9mIHRoaXMub3B0aW9uc1NwZWMgb3IgYW4gb3B0aW9uIGlkXG4gICAgaWYgKHR5cGVvZiAob3B0aW9uKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIG9wdGlvbiA9IHRoaXMub3B0aW9uc1NwZWMuZmluZCh4ID0+IHguaWQgPT09IG9wdGlvbilcbiAgICAgIGlmICghb3B0aW9uKSB0aHJvdyBuZXcgRXJyb3IoYG5vIG9wdGlvbiB3aXRoIGlkICcke29wdGlvbn0nYClcbiAgICB9XG4gICAgaWYgKCFvcHRpb24uZWxlbWVudCkgdGhyb3cgbmV3IEVycm9yKGBvcHRpb24gJHtvcHRpb24uaWR9IGRvZXNuJ3QgaGF2ZSBhIFVJIGVsZW1lbnRgKVxuXG4gICAgc3dpdGNoIChvcHRpb24udHlwZSkge1xuICAgICAgY2FzZSAnaW50Jzoge1xuICAgICAgICBjb25zdCBpbnB1dCA9IG9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpWzBdXG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gTnVtYmVyKGlucHV0LnZhbHVlKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAnYm9vbCc6IHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSBvcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKVswXVxuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IGlucHV0LmNoZWNrZWRcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NlbGVjdC1leGNsdXNpdmUnOiB7XG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gb3B0aW9uLmVsZW1lbnQucXVlcnlTZWxlY3RvcignaW5wdXQ6Y2hlY2tlZCcpLnZhbHVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdzZWxlY3QtaW5jbHVzaXZlJzoge1xuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9XG4gICAgICAgICAgQXJyYXkuZnJvbShvcHRpb24uZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dDpjaGVja2VkJyksIHggPT4geC52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgb3B0aW9uIHdpdGggaWQgJHtvcHRpb24uaWR9IGhhcyB1bnJlY29nbmlzZWQgb3B0aW9uIHR5cGUgJHtvcHRpb24udHlwZX1gKVxuICAgIH1cbiAgICAvLyBjb25zb2xlLmxvZyh0aGlzLm9wdGlvbnMpXG4gIH1cblxuICByZW5kZXJJbiAoZWxlbWVudCkge1xuICAgIGNvbnN0IGxpc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd1bCcpXG4gICAgbGlzdC5jbGFzc0xpc3QuYWRkKCdvcHRpb25zLWxpc3QnKVxuXG4gICAgdGhpcy5vcHRpb25TcGVjLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgIC8vIE1ha2UgbGlzdCBpdGVtIC0gY29tbW9uIHRvIGFsbCB0eXBlc1xuICAgICAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpXG4gICAgICBsaS5kYXRhc2V0Lm9wdGlvbklkID0gb3B0aW9uLmlkXG4gICAgICBsaXN0LmFwcGVuZChsaSlcblxuICAgICAgLy8gbWFrZSBpbnB1dCBlbGVtZW50cyAtIGRlcGVuZHMgb24gb3B0aW9uIHR5cGVcbiAgICAgIGlmIChvcHRpb24udHlwZSA9PT0gJ2NvbHVtbi1icmVhaycpIHtcbiAgICAgICAgbGkuY2xhc3NMaXN0LmFkZCgnY29sdW1uLWJyZWFrJylcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9uLnR5cGUgPT09ICdoZWFkaW5nJykge1xuICAgICAgICBsaS5hcHBlbmQob3B0aW9uLnRpdGxlKVxuICAgICAgICBsaS5jbGFzc0xpc3QuYWRkKCdvcHRpb25zLWhlYWRpbmcnKVxuICAgICAgfSBlbHNlIGlmIChvcHRpb24udHlwZSA9PT0gJ2ludCcgfHwgb3B0aW9uLnR5cGUgPT09ICdib29sJykge1xuICAgICAgICAvLyBzaW5nbGUgaW5wdXQgb3B0aW9uc1xuICAgICAgICBjb25zdCBsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJylcbiAgICAgICAgbGkuYXBwZW5kKGxhYmVsKVxuXG4gICAgICAgIGlmICghb3B0aW9uLnN3YXBMYWJlbCkgbGFiZWwuYXBwZW5kKG9wdGlvbi50aXRsZSArICc6ICcpXG5cbiAgICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpXG4gICAgICAgIHN3aXRjaCAob3B0aW9uLnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdpbnQnOlxuICAgICAgICAgICAgaW5wdXQudHlwZSA9ICdudW1iZXInXG4gICAgICAgICAgICBpbnB1dC5taW4gPSBvcHRpb24ubWluXG4gICAgICAgICAgICBpbnB1dC5tYXggPSBvcHRpb24ubWF4XG4gICAgICAgICAgICBpbnB1dC52YWx1ZSA9IG9wdGlvbi5kZWZhdWx0XG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ2Jvb2wnOlxuICAgICAgICAgICAgaW5wdXQudHlwZSA9ICdjaGVja2JveCdcbiAgICAgICAgICAgIGlucHV0LmNoZWNrZWQgPSBvcHRpb24uZGVmYXVsdFxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIG9wdGlvbiB0eXBlICR7b3B0aW9uLnR5cGV9YClcbiAgICAgICAgfVxuICAgICAgICBpbnB1dC5jbGFzc0xpc3QuYWRkKCdvcHRpb24nKVxuICAgICAgICBsYWJlbC5hcHBlbmQoaW5wdXQpXG5cbiAgICAgICAgaWYgKG9wdGlvbi5zd2FwTGFiZWwpIGxhYmVsLmFwcGVuZCgnICcgKyBvcHRpb24udGl0bGUpXG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbi50eXBlID09PSAnc2VsZWN0LWluY2x1c2l2ZScgfHwgb3B0aW9uLnR5cGUgPT09ICdzZWxlY3QtZXhjbHVzaXZlJykge1xuICAgICAgICAvLyBtdWx0aXBsZSBpbnB1dCBvcHRpb25zXG4gICAgICAgIC8vIFRPRE86IHN3YXAgbGFiZWwgKGEgYml0IG9kZCBoZXJlIHRob3VnaClcbiAgICAgICAgbGkuYXBwZW5kKG9wdGlvbi50aXRsZSArICc6ICcpXG5cbiAgICAgICAgY29uc3Qgc3VibGlzdCA9IGNyZWF0ZUVsZW0oJ3VsJywgJ29wdGlvbnMtc3VibGlzdCcsIGxpKVxuICAgICAgICBpZiAob3B0aW9uLnZlcnRpY2FsKSBzdWJsaXN0LmNsYXNzTGlzdC5hZGQoJ29wdGlvbnMtc3VibGlzdC12ZXJ0aWNhbCcpXG5cbiAgICAgICAgb3B0aW9uLnNlbGVjdE9wdGlvbnMuZm9yRWFjaChzZWxlY3RPcHRpb24gPT4ge1xuICAgICAgICAgIGNvbnN0IHN1Ymxpc3RMaSA9IGNyZWF0ZUVsZW0oJ2xpJywgbnVsbCwgc3VibGlzdClcbiAgICAgICAgICBjb25zdCBsYWJlbCA9IGNyZWF0ZUVsZW0oJ2xhYmVsJywgbnVsbCwgc3VibGlzdExpKVxuXG4gICAgICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpXG4gICAgICAgICAgaW5wdXQudHlwZSA9IG9wdGlvbi50eXBlID09PSAnc2VsZWN0LWV4Y2x1c2l2ZScgPyAncmFkaW8nIDogJ2NoZWNrYm94J1xuICAgICAgICAgIGlucHV0Lm5hbWUgPSB0aGlzLmdsb2JhbElkICsgJy0nICsgb3B0aW9uLmlkXG4gICAgICAgICAgaW5wdXQudmFsdWUgPSBzZWxlY3RPcHRpb24uaWRcblxuICAgICAgICAgIGlmIChvcHRpb24udHlwZSA9PT0gJ3NlbGVjdC1pbmNsdXNpdmUnKSB7IC8vIGRlZmF1bHRzIHdvcmsgZGlmZmVyZW50IGZvciBpbmNsdXNpdmUvZXhjbHVzaXZlXG4gICAgICAgICAgICBpbnB1dC5jaGVja2VkID0gb3B0aW9uLmRlZmF1bHQuaW5jbHVkZXMoc2VsZWN0T3B0aW9uLmlkKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbnB1dC5jaGVja2VkID0gb3B0aW9uLmRlZmF1bHQgPT09IHNlbGVjdE9wdGlvbi5pZFxuICAgICAgICAgIH1cblxuICAgICAgICAgIGxhYmVsLmFwcGVuZChpbnB1dClcblxuICAgICAgICAgIGlucHV0LmNsYXNzTGlzdC5hZGQoJ29wdGlvbicpXG5cbiAgICAgICAgICBsYWJlbC5hcHBlbmQoc2VsZWN0T3B0aW9uLnRpdGxlKVxuICAgICAgICB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIG9wdGlvbiB0eXBlICcke29wdGlvbi50eXBlfSdgKVxuICAgICAgfVxuXG4gICAgICBsaS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBlID0+IHRoaXMudXBkYXRlU3RhdGVGcm9tVUkob3B0aW9uKSlcbiAgICAgIG9wdGlvbi5lbGVtZW50ID0gbGlcbiAgICB9KVxuXG4gICAgZWxlbWVudC5hcHBlbmQobGlzdClcbiAgfVxuXG4gIC8vIFRPRE86IHVwZGF0ZVVJRnJvbVN0YXRlKG9wdGlvbikge31cbn1cblxuT3B0aW9uc1NldC5pZENvdW50ZXIgPSAwIC8vIGluY3JlbWVudCBlYWNoIHRpbWUgdG8gY3JlYXRlIHVuaXF1ZSBpZHMgdG8gdXNlIGluIGlkcy9uYW1lcyBvZiBlbGVtZW50c1xuXG5PcHRpb25zU2V0LmdldElkID0gZnVuY3Rpb24gKCkge1xuICBpZiAoT3B0aW9uc1NldC5pZENvdW50ZXIgPj0gMjYgKiogMikgdGhyb3cgbmV3IEVycm9yKCdUb28gbWFueSBvcHRpb25zIG9iamVjdHMhJylcbiAgY29uc3QgaWQgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKH5+KE9wdGlvbnNTZXQuaWRDb3VudGVyIC8gMjYpICsgOTcpICtcbiAgICAgICAgICAgU3RyaW5nLmZyb21DaGFyQ29kZShPcHRpb25zU2V0LmlkQ291bnRlciAlIDI2ICsgOTcpXG5cbiAgT3B0aW9uc1NldC5pZENvdW50ZXIgKz0gMVxuXG4gIHJldHVybiBpZFxufVxuXG5PcHRpb25zU2V0LmRlbW9TcGVjID0gW1xuICB7XG4gICAgdGl0bGU6ICdEaWZmaWN1bHR5JyxcbiAgICBpZDogJ2RpZmZpY3VsdHknLFxuICAgIHR5cGU6ICdpbnQnLFxuICAgIG1pbjogMSxcbiAgICBtYXg6IDEwLFxuICAgIGRlZmF1bHQ6IDVcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVHlwZScsXG4gICAgaWQ6ICd0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ1JlY3RhbmdsZScsIGlkOiAncmVjdGFuZ2xlJyB9LFxuICAgICAgeyB0aXRsZTogJ1RyaWFuZ2xlJywgaWQ6ICd0cmlhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdTcXVvdmFsJywgaWQ6ICdzcXVvdmFsJyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiAncmVjdGFuZ2xlJ1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdBIGhlYWRpbmcnLFxuICAgIHR5cGU6ICdoZWFkaW5nJ1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdTaGFwZScsXG4gICAgaWQ6ICdzaGFwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdSZWN0YW5nbGUgc2hhcGUgdGhpbmcnLCBpZDogJ3JlY3RhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdUcmlhbmdsZSBzaGFwZSB0aGluZycsIGlkOiAndHJpYW5nbGUnIH0sXG4gICAgICB7IHRpdGxlOiAnU3F1b3ZhbCBzaGFwZSBsb25nJywgaWQ6ICdzcXVvdmFsJyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiBbJ3JlY3RhbmdsZScsICdzcXVvdmFsJ10sXG4gICAgdmVydGljYWw6IHRydWUgLy8gbGF5b3V0IHZlcnRpY2FsbHksIHJhdGhlciB0aGFuIGhvcml6b250YWxseVxuICB9LFxuICB7XG4gICAgdHlwZTogJ2NvbHVtbi1icmVhaydcbiAgfSxcbiAge1xuICAgIHR5cGU6ICdoZWFkaW5nJyxcbiAgICB0aXRsZTogJ0EgbmV3IGNvbHVtbidcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnRG8gc29tZXRoaW5nJyxcbiAgICBpZDogJ3NvbWV0aGluZycsXG4gICAgdHlwZTogJ2Jvb2wnLFxuICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgc3dhcExhYmVsOiB0cnVlIC8vIHB1dCBjb250cm9sIGJlZm9yZSBsYWJlbFxuICB9XG5dXG4iLCJleHBvcnQgZGVmYXVsdCBhYnN0cmFjdCBjbGFzcyBRdWVzdGlvbiB7XG4gIERPTTogSFRNTEVsZW1lbnRcbiAgYW5zd2VyZWQ6IGJvb2xlYW5cblxuICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgdGhpcy5ET00gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgIHRoaXMuRE9NLmNsYXNzTmFtZSA9ICdxdWVzdGlvbi1kaXYnXG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gIH1cblxuICBnZXRET00gKCkgOiBIVE1MRWxlbWVudCB7XG4gICAgcmV0dXJuIHRoaXMuRE9NXG4gIH1cblxuICBhYnN0cmFjdCByZW5kZXIgKCkgOiB2b2lkXG5cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQge1xuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gIH1cblxuICB0b2dnbGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICBpZiAodGhpcy5hbnN3ZXJlZCkge1xuICAgICAgdGhpcy5oaWRlQW5zd2VyKClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaG93QW5zd2VyKClcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgLy8gU2hvdWxkIGJlIG92ZXJyaWRkZW5cbiAgICByZXR1cm4gJydcbiAgfVxufVxuIiwiLyogZ2xvYmFsIGthdGV4ICovXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRleHRRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKClcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYSdcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIC8vIHN0b3JlIHRoZSBsYWJlbCBmb3IgZnV0dXJlIHJlbmRlcmluZ1xuICAgIHRoaXMubGFiZWwgPSBzZXR0aW5ncy5sYWJlbFxuXG4gICAgLy8gRHVtbXkgcXVlc3Rpb24gZ2VuZXJhdGluZyAtIHN1YmNsYXNzZXMgZG8gc29tZXRoaW5nIHN1YnN0YW50aWFsIGhlcmVcbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnMisyJ1xuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPTUnXG5cbiAgICAvLyBNYWtlIHRoZSBET00gdHJlZSBmb3IgdGhlIGVsZW1lbnRcbiAgICB0aGlzLnF1ZXN0aW9ucCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKVxuICAgIHRoaXMuYW5zd2VycCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKVxuXG4gICAgdGhpcy5xdWVzdGlvbnAuY2xhc3NOYW1lID0gJ3F1ZXN0aW9uJ1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc05hbWUgPSAnYW5zd2VyJ1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuXG4gICAgdGhpcy5ET00uYXBwZW5kQ2hpbGQodGhpcy5xdWVzdGlvbnApXG4gICAgdGhpcy5ET00uYXBwZW5kQ2hpbGQodGhpcy5hbnN3ZXJwKVxuXG4gICAgLy8gc3ViY2xhc3NlcyBzaG91bGQgZ2VuZXJhdGUgcXVlc3Rpb25MYVRlWCBhbmQgYW5zd2VyTGFUZVgsXG4gICAgLy8gLnJlbmRlcigpIHdpbGwgYmUgY2FsbGVkIGJ5IHVzZXJcbiAgfVxuXG4gIHJlbmRlciAoKSB7XG4gICAgLy8gdXBkYXRlIHRoZSBET00gaXRlbSB3aXRoIHF1ZXN0aW9uTGFUZVggYW5kIGFuc3dlckxhVGVYXG4gICAgdmFyIHFudW0gPSB0aGlzLmxhYmVsXG4gICAgICA/ICdcXFxcdGV4dHsnICsgdGhpcy5sYWJlbCArICcpIH0nXG4gICAgICA6ICcnXG4gICAga2F0ZXgucmVuZGVyKHFudW0gKyB0aGlzLnF1ZXN0aW9uTGFUZVgsIHRoaXMucXVlc3Rpb25wLCB7IGRpc3BsYXlNb2RlOiB0cnVlLCBzdHJpY3Q6ICdpZ25vcmUnIH0pXG4gICAga2F0ZXgucmVuZGVyKHRoaXMuYW5zd2VyTGFUZVgsIHRoaXMuYW5zd2VycCwgeyBkaXNwbGF5TW9kZTogdHJ1ZSB9KVxuICB9XG5cbiAgZ2V0RE9NICgpIHtcbiAgICByZXR1cm4gdGhpcy5ET01cbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkge1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIHtcbiAgICB0aGlzLmFuc3dlcnAuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxufVxuIiwiaW1wb3J0IHsgcmFuZEJldHdlZW4sIGdjZCB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcblxuLyogTWFpbiBxdWVzdGlvbiBjbGFzcy4gVGhpcyB3aWxsIGJlIHNwdW4gb2ZmIGludG8gZGlmZmVyZW50IGZpbGUgYW5kIGdlbmVyYWxpc2VkICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBbGdlYnJhaWNGcmFjdGlvblEgZXh0ZW5kcyBUZXh0USB7XG4gIC8vICdleHRlbmRzJyBRdWVzdGlvbiwgYnV0IG5vdGhpbmcgdG8gYWN0dWFsbHkgZXh0ZW5kXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogMlxuICAgIH1cblxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG4gICAgY29uc3QgZGlmZmljdWx0eSA9IHNldHRpbmdzLmRpZmZpY3VsdHlcblxuICAgIC8vIGxvZ2ljIGZvciBnZW5lcmF0aW5nIHRoZSBxdWVzdGlvbiBhbmQgYW5zd2VyIHN0YXJ0cyBoZXJlXG4gICAgdmFyIGEsIGIsIGMsIGQsIGUsIGYgLy8gKGF4K2IpKGV4K2YpLyhjeCtkKShleCtmKSA9IChweF4yK3F4K3IpLyh0eF4yK3V4K3YpXG4gICAgdmFyIHAsIHEsIHIsIHQsIHUsIHZcbiAgICB2YXIgbWluQ29lZmYsIG1heENvZWZmLCBtaW5Db25zdCwgbWF4Q29uc3RcblxuICAgIHN3aXRjaCAoZGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMTsgbWluQ29uc3QgPSAxOyBtYXhDb25zdCA9IDZcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgbWluQ29lZmYgPSAxOyBtYXhDb2VmZiA9IDE7IG1pbkNvbnN0ID0gLTY7IG1heENvbnN0ID0gNlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAzOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMzsgbWluQ29uc3QgPSAtNTsgbWF4Q29uc3QgPSA1XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ6XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBtaW5Db2VmZiA9IC0zOyBtYXhDb2VmZiA9IDM7IG1pbkNvbnN0ID0gLTU7IG1heENvbnN0ID0gNVxuICAgICAgICBicmVha1xuICAgIH1cblxuICAgIC8vIFBpY2sgc29tZSBjb2VmZmljaWVudHNcbiAgICB3aGlsZSAoXG4gICAgICAoKCFhICYmICFiKSB8fCAoIWMgJiYgIWQpIHx8ICghZSAmJiAhZikpIHx8IC8vIHJldHJ5IGlmIGFueSBleHByZXNzaW9uIGlzIDBcbiAgICAgIGNhblNpbXBsaWZ5KGEsIGIsIGMsIGQpIC8vIHJldHJ5IGlmIHRoZXJlJ3MgYSBjb21tb24gbnVtZXJpY2FsIGZhY3RvclxuICAgICkge1xuICAgICAgYSA9IHJhbmRCZXR3ZWVuKG1pbkNvZWZmLCBtYXhDb2VmZilcbiAgICAgIGMgPSByYW5kQmV0d2VlbihtaW5Db2VmZiwgbWF4Q29lZmYpXG4gICAgICBlID0gcmFuZEJldHdlZW4obWluQ29lZmYsIG1heENvZWZmKVxuICAgICAgYiA9IHJhbmRCZXR3ZWVuKG1pbkNvbnN0LCBtYXhDb25zdClcbiAgICAgIGQgPSByYW5kQmV0d2VlbihtaW5Db25zdCwgbWF4Q29uc3QpXG4gICAgICBmID0gcmFuZEJldHdlZW4obWluQ29uc3QsIG1heENvbnN0KVxuICAgIH1cblxuICAgIC8vIGlmIHRoZSBkZW5vbWluYXRvciBpcyBuZWdhdGl2ZSBmb3IgZWFjaCB0ZXJtLCB0aGVuIG1ha2UgdGhlIG51bWVyYXRvciBuZWdhdGl2ZSBpbnN0ZWFkXG4gICAgaWYgKGMgPD0gMCAmJiBkIDw9IDApIHtcbiAgICAgIGMgPSAtY1xuICAgICAgZCA9IC1kXG4gICAgICBhID0gLWFcbiAgICAgIGIgPSAtYlxuICAgIH1cblxuICAgIHAgPSBhICogZTsgcSA9IGEgKiBmICsgYiAqIGU7IHIgPSBiICogZlxuICAgIHQgPSBjICogZTsgdSA9IGMgKiBmICsgZCAqIGU7IHYgPSBkICogZlxuXG4gICAgLy8gTm93IHB1dCB0aGUgcXVlc3Rpb24gYW5kIGFuc3dlciBpbiBhIG5pY2UgZm9ybWF0IGludG8gcXVlc3Rpb25MYVRlWCBhbmQgYW5zd2VyTGFUZVhcbiAgICBjb25zdCBxdWVzdGlvbiA9IGBcXFxcZnJhY3ske3F1YWRyYXRpY1N0cmluZyhwLCBxLCByKX19eyR7cXVhZHJhdGljU3RyaW5nKHQsIHUsIHYpfX1gXG4gICAgaWYgKHNldHRpbmdzLnVzZUNvbW1hbmRXb3JkKSB7XG4gICAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnXFxcXHRleHR7U2ltcGxpZnl9ICcgKyBxdWVzdGlvblxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSBxdWVzdGlvblxuICAgIH1cbiAgICB0aGlzLmFuc3dlckxhVGVYID1cbiAgICAgIChjID09PSAwICYmIGQgPT09IDEpID8gcXVhZHJhdGljU3RyaW5nKDAsIGEsIGIpXG4gICAgICAgIDogYFxcXFxmcmFjeyR7cXVhZHJhdGljU3RyaW5nKDAsIGEsIGIpfX17JHtxdWFkcmF0aWNTdHJpbmcoMCwgYywgZCl9fWBcblxuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPSAnICsgdGhpcy5hbnN3ZXJMYVRlWFxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdTaW1wbGlmeSdcbiAgfVxufVxuXG4vKiBVdGlsaXR5IGZ1bmN0aW9uc1xuICogQXQgc29tZSBwb2ludCwgSSdsbCBtb3ZlIHNvbWUgb2YgdGhlc2UgaW50byBhIGdlbmVyYWwgdXRpbGl0aWVzIG1vZHVsZVxuICogYnV0IHRoaXMgd2lsbCBkbyBmb3Igbm93XG4gKi9cblxuLy8gVE9ETyBJIGhhdmUgcXVhZHJhdGljU3RyaW5nIGhlcmUgYW5kIGFsc28gYSBQb2x5bm9taWFsIGNsYXNzLiBXaGF0IGlzIGJlaW5nIHJlcGxpY2F0ZWQ/wqdcbmZ1bmN0aW9uIHF1YWRyYXRpY1N0cmluZyAoYSwgYiwgYykge1xuICBpZiAoYSA9PT0gMCAmJiBiID09PSAwICYmIGMgPT09IDApIHJldHVybiAnMCdcblxuICB2YXIgeDJzdHJpbmcgPVxuICAgIGEgPT09IDAgPyAnJ1xuICAgICAgOiBhID09PSAxID8gJ3heMidcbiAgICAgICAgOiBhID09PSAtMSA/ICcteF4yJ1xuICAgICAgICAgIDogYSArICd4XjInXG5cbiAgdmFyIHhzaWduID1cbiAgICBiIDwgMCA/ICctJ1xuICAgICAgOiAoYSA9PT0gMCB8fCBiID09PSAwKSA/ICcnXG4gICAgICAgIDogJysnXG5cbiAgdmFyIHhzdHJpbmcgPVxuICAgIGIgPT09IDAgPyAnJ1xuICAgICAgOiAoYiA9PT0gMSB8fCBiID09PSAtMSkgPyAneCdcbiAgICAgICAgOiBNYXRoLmFicyhiKSArICd4J1xuXG4gIHZhciBjb25zdHNpZ24gPVxuICAgIGMgPCAwID8gJy0nXG4gICAgICA6ICgoYSA9PT0gMCAmJiBiID09PSAwKSB8fCBjID09PSAwKSA/ICcnXG4gICAgICAgIDogJysnXG5cbiAgdmFyIGNvbnN0c3RyaW5nID1cbiAgICBjID09PSAwID8gJycgOiBNYXRoLmFicyhjKVxuXG4gIHJldHVybiB4MnN0cmluZyArIHhzaWduICsgeHN0cmluZyArIGNvbnN0c2lnbiArIGNvbnN0c3RyaW5nXG59XG5cbmZ1bmN0aW9uIGNhblNpbXBsaWZ5IChhMSwgYjEsIGEyLCBiMikge1xuICAvLyBjYW4gKGExeCtiMSkvKGEyeCtiMikgYmUgc2ltcGxpZmllZD9cbiAgLy9cbiAgLy8gRmlyc3QsIHRha2Ugb3V0IGdjZCwgYW5kIHdyaXRlIGFzIGMxKGExeCtiMSkgZXRjXG5cbiAgdmFyIGMxID0gZ2NkKGExLCBiMSlcbiAgYTEgPSBhMSAvIGMxXG4gIGIxID0gYjEgLyBjMVxuXG4gIHZhciBjMiA9IGdjZChhMiwgYjIpXG4gIGEyID0gYTIgLyBjMlxuICBiMiA9IGIyIC8gYzJcblxuICB2YXIgcmVzdWx0ID0gZmFsc2VcblxuICBpZiAoZ2NkKGMxLCBjMikgPiAxIHx8IChhMSA9PT0gYTIgJiYgYjEgPT09IGIyKSkge1xuICAgIHJlc3VsdCA9IHRydWVcbiAgfVxuXG4gIHJldHVybiByZXN1bHRcbn1cbiIsImltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCB7IHJhbmRCZXR3ZWVuIH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJbnRlZ2VyQWRkUSBleHRlbmRzIFRleHRRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiA1LFxuICAgICAgbGFiZWw6ICdhJ1xuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyBUaGlzIGlzIGp1c3QgYSBkZW1vIHF1ZXN0aW9uIHR5cGUgZm9yIG5vdywgc28gbm90IHByb2Nlc3NpbmcgZGlmZmljdWx0eVxuICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbigxMCwgMTAwMClcbiAgICBjb25zdCBiID0gcmFuZEJldHdlZW4oMTAsIDEwMDApXG4gICAgY29uc3Qgc3VtID0gYSArIGJcblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9IGEgKyAnICsgJyArIGJcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJz0gJyArIHN1bVxuXG4gICAgdGhpcy5yZW5kZXIoKVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdFdmFsdWF0ZSdcbiAgfVxufVxuIiwiLyoqXG4gKiBDbGFzcyByZXByZXNlbnRpbmcgYSBwb2ludCwgYW5kIHN0YXRpYyB1dGl0bGl0eSBtZXRob2RzXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBvaW50IHtcbiAgY29uc3RydWN0b3IgKHgsIHkpIHtcbiAgICB0aGlzLnggPSB4XG4gICAgdGhpcy55ID0geVxuICB9XG5cbiAgcm90YXRlIChhbmdsZSkge1xuICAgIHZhciBuZXd4LCBuZXd5XG4gICAgbmV3eCA9IE1hdGguY29zKGFuZ2xlKSAqIHRoaXMueCAtIE1hdGguc2luKGFuZ2xlKSAqIHRoaXMueVxuICAgIG5ld3kgPSBNYXRoLnNpbihhbmdsZSkgKiB0aGlzLnggKyBNYXRoLmNvcyhhbmdsZSkgKiB0aGlzLnlcbiAgICB0aGlzLnggPSBuZXd4XG4gICAgdGhpcy55ID0gbmV3eVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzY2FsZSAoc2YpIHtcbiAgICB0aGlzLnggPSB0aGlzLnggKiBzZlxuICAgIHRoaXMueSA9IHRoaXMueSAqIHNmXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHRyYW5zbGF0ZSAoeCwgeSkge1xuICAgIHRoaXMueCArPSB4XG4gICAgdGhpcy55ICs9IHlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgY2xvbmUgKCkge1xuICAgIHJldHVybiBuZXcgUG9pbnQodGhpcy54LCB0aGlzLnkpXG4gIH1cblxuICBlcXVhbHMgKHRoYXQpIHtcbiAgICByZXR1cm4gKHRoaXMueCA9PT0gdGhhdC54ICYmIHRoaXMueSA9PT0gdGhhdC55KVxuICB9XG5cbiAgbW92ZVRvd2FyZCAodGhhdCwgZCkge1xuICAgIC8vIG1vdmVzIFtkXSBpbiB0aGUgZGlyZWN0aW9uIG9mIFt0aGF0OjpQb2ludF1cbiAgICBjb25zdCB1dmVjID0gUG9pbnQudW5pdFZlY3Rvcih0aGlzLCB0aGF0KVxuICAgIHRoaXMudHJhbnNsYXRlKHV2ZWMueCAqIGQsIHV2ZWMueSAqIGQpXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHN0YXRpYyBmcm9tUG9sYXIgKHIsIHRoZXRhKSB7XG4gICAgcmV0dXJuIG5ldyBQb2ludChcbiAgICAgIE1hdGguY29zKHRoZXRhKSAqIHIsXG4gICAgICBNYXRoLnNpbih0aGV0YSkgKiByXG4gICAgKVxuICB9XG5cbiAgc3RhdGljIGZyb21Qb2xhckRlZyAociwgdGhldGEpIHtcbiAgICB0aGV0YSA9IHRoZXRhICogTWF0aC5QSSAvIDE4MFxuICAgIHJldHVybiBQb2ludC5mcm9tUG9sYXIociwgdGhldGEpXG4gIH1cblxuICAvKipcbiAgICogRmluZCB0aGUgbWVhbiBvZiBcbiAgICogQHBhcmFtICB7Li4uUG9pbnR9IHBvaW50cyBUaGUgcG9pbnRzIHRvIGZpbmQgdGhlIG1lYW4gb2ZcbiAgICovXG4gIHN0YXRpYyBtZWFuICguLi5wb2ludHMpIHtcbiAgICBjb25zdCBzdW14ID0gcG9pbnRzLm1hcChwID0+IHAueCkucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSlcbiAgICBjb25zdCBzdW15ID0gcG9pbnRzLm1hcChwID0+IHAueSkucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSlcbiAgICBjb25zdCBuID0gcG9pbnRzLmxlbmd0aFxuXG4gICAgcmV0dXJuIG5ldyBQb2ludChzdW14IC8gbiwgc3VteSAvIG4pXG4gIH1cblxuICBzdGF0aWMgaW5DZW50ZXIgKEEsIEIsIEMpIHtcbiAgICAvLyBpbmNlbnRlciBvZiBhIHRyaWFuZ2xlIGdpdmVuIHZlcnRleCBwb2ludHMgQSwgQiBhbmQgQ1xuICAgIGNvbnN0IGEgPSBQb2ludC5kaXN0YW5jZShCLCBDKVxuICAgIGNvbnN0IGIgPSBQb2ludC5kaXN0YW5jZShBLCBDKVxuICAgIGNvbnN0IGMgPSBQb2ludC5kaXN0YW5jZShBLCBCKVxuXG4gICAgY29uc3QgcGVyaW1ldGVyID0gYSArIGIgKyBjXG4gICAgY29uc3Qgc3VteCA9IGEgKiBBLnggKyBiICogQi54ICsgYyAqIEMueFxuICAgIGNvbnN0IHN1bXkgPSBhICogQS55ICsgYiAqIEIueSArIGMgKiBDLnlcblxuICAgIHJldHVybiBuZXcgUG9pbnQoc3VteCAvIHBlcmltZXRlciwgc3VteSAvIHBlcmltZXRlcilcbiAgfVxuXG4gIHN0YXRpYyBtaW4gKHBvaW50cykge1xuICAgIGNvbnN0IG1pbnggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1pbih4LCBwLngpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtaW55ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5taW4oeSwgcC55KSwgSW5maW5pdHkpXG4gICAgcmV0dXJuIG5ldyBQb2ludChtaW54LCBtaW55KVxuICB9XG5cbiAgc3RhdGljIG1heCAocG9pbnRzKSB7XG4gICAgY29uc3QgbWF4eCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWF4KHgsIHAueCksIC1JbmZpbml0eSlcbiAgICBjb25zdCBtYXh5ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5tYXgoeSwgcC55KSwgLUluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQobWF4eCwgbWF4eSlcbiAgfVxuXG4gIHN0YXRpYyBjZW50ZXIgKHBvaW50cykge1xuICAgIGNvbnN0IG1pbnggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1pbih4LCBwLngpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtaW55ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5taW4oeSwgcC55KSwgSW5maW5pdHkpXG4gICAgY29uc3QgbWF4eCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWF4KHgsIHAueCksIC1JbmZpbml0eSlcbiAgICBjb25zdCBtYXh5ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5tYXgoeSwgcC55KSwgLUluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQoKG1heHggKyBtaW54KSAvIDIsIChtYXh5ICsgbWlueSkgLyAyKVxuICB9XG5cbiAgc3RhdGljIHVuaXRWZWN0b3IgKHAxLCBwMikge1xuICAgIC8vIHJldHVybnMgYSB1bml0IHZlY3RvciBpbiB0aGUgZGlyZWN0aW9uIG9mIHAxIHRvIHAyXG4gICAgLy8gaW4gdGhlIGZvcm0ge3g6Li4uLCB5Oi4uLn1cbiAgICBjb25zdCB2ZWN4ID0gcDIueCAtIHAxLnhcbiAgICBjb25zdCB2ZWN5ID0gcDIueSAtIHAxLnlcbiAgICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHZlY3gsIHZlY3kpXG4gICAgcmV0dXJuIHsgeDogdmVjeCAvIGxlbmd0aCwgeTogdmVjeSAvIGxlbmd0aCB9XG4gIH1cblxuICBzdGF0aWMgZGlzdGFuY2UgKHAxLCBwMikge1xuICAgIHJldHVybiBNYXRoLmh5cG90KHAxLnggLSBwMi54LCBwMS55IC0gcDIueSlcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGUgdGhlIGFuZ2xlIGluIHJhZGlhbnMgZnJvbSBob3Jpem9udGFsIHRvIHAyLCB3aXRoIGNlbnRyZSBwMS5cbiAgICogRS5nLiBhbmdsZUZyb20oICgwLDApLCAoMSwxKSApID0gcGkvMlxuICAgKiBBbmdsZSBpcyBmcm9tIDAgdG8gMnBpXG4gICAqIEBwYXJhbSB7UG9pbnR9IHAxIFRoZSBzdGFydCBwb2ludFxuICAgKiBAcGFyYW0ge1BvaW50fSBwMiBUaGUgZW5kIHBvaW50XG4gICAqIEByZXR1cm5zIHtudW1iZXJ9IFRoZSBhbmdsZSBpbiByYWRpYW5zIFxuICAgKi9cbiAgc3RhdGljIGFuZ2xlRnJvbShwMSxwMikge1xuICAgIGNvbnN0IGFuZ2xlID0gIE1hdGguYXRhbjIocDIueS1wMS55LHAyLngtcDEueClcbiAgICByZXR1cm4gYW5nbGUgPj0gMCA/IGFuZ2xlIDogMipNYXRoLlBJICsgYW5nbGVcbiAgfVxuXG4gIHN0YXRpYyByZXBlbCAocDEsIHAyLCB0cmlnZ2VyLCBkaXN0YW5jZSkge1xuICAgIC8vIFdoZW4gcDEgYW5kIHAyIGFyZSBsZXNzIHRoYW4gW3RyaWdnZXJdIGFwYXJ0LCB0aGV5IGFyZVxuICAgIC8vIG1vdmVkIHNvIHRoYXQgdGhleSBhcmUgW2Rpc3RhbmNlXSBhcGFydFxuICAgIGNvbnN0IGQgPSBNYXRoLmh5cG90KHAxLnggLSBwMi54LCBwMS55IC0gcDIueSlcbiAgICBpZiAoZCA+PSB0cmlnZ2VyKSByZXR1cm4gZmFsc2VcblxuICAgIGNvbnN0IHIgPSAoZGlzdGFuY2UgLSBkKSAvIDIgLy8gZGlzdGFuY2UgdGhleSBuZWVkIG1vdmluZ1xuICAgIHAxLm1vdmVUb3dhcmQocDIsIC1yKVxuICAgIHAyLm1vdmVUb3dhcmQocDEsIC1yKVxuICAgIHJldHVybiB0cnVlXG4gIH1cbn1cbiIsImltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbi9RdWVzdGlvbidcbmltcG9ydCB7IGNyZWF0ZUVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi9WaWV3T3B0aW9ucydcbmRlY2xhcmUgY29uc3Qga2F0ZXggOiB7cmVuZGVyIDogKHN0cmluZzogc3RyaW5nLCBlbGVtZW50OiBIVE1MRWxlbWVudCkgPT4gdm9pZH1cblxuLyogR3JhcGhpY1FEYXRhIGNhbiBhbGwgYmUgdmVyeSBkaWZmZXJlbnQsIHNvIGludGVyZmFjZSBpcyBlbXB0eVxuICogSGVyZSBmb3IgY29kZSBkb2N1bWVudGF0aW9uIHJhdGhlciB0aGFuIHR5cGUgc2FmZXR5ICh3aGljaCBpc24ndCBwcm92aWRlZClcblxuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LWludGVyZmFjZSAqL1xuZXhwb3J0IGludGVyZmFjZSBHcmFwaGljUURhdGEge1xufVxuLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktaW50ZXJmYWNlICovXG5cbi8qIE5vdCB3b3J0aCB0aGUgaGFzc2x5IHRyeWluZyB0byBnZXQgaW50ZXJmYWNlcyBmb3Igc3RhdGljIG1ldGhvZHNcbiAqXG4gKiBleHBvcnQgaW50ZXJmYWNlIEdyYXBoaWNRRGF0YUNvbnN0cnVjdG9yIHtcbiAqICAgbmV3KC4uLmFyZ3MgOiB1bmtub3duW10pOiBHcmFwaGljUURhdGFcbiAqICAgcmFuZG9tKG9wdGlvbnM6IHVua25vd24pIDogR3JhcGhpY1FEYXRhXG4gKiB9XG4qL1xuXG5leHBvcnQgaW50ZXJmYWNlIExhYmVsIHtcbiAgcG9zOiBQb2ludCxcbiAgdGV4dHE6IHN0cmluZyxcbiAgdGV4dGE6IHN0cmluZyxcbiAgc3R5bGVxOiBzdHJpbmcsXG4gIHN0eWxlYTogc3RyaW5nLFxuICB0ZXh0OiBzdHJpbmcsXG4gIHN0eWxlOiBzdHJpbmdcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEdyYXBoaWNRVmlldyB7XG4gIERPTTogSFRNTEVsZW1lbnRcbiAgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudFxuICB3aWR0aDogbnVtYmVyXG4gIGhlaWdodDogbnVtYmVyXG4gIGRhdGE6IEdyYXBoaWNRRGF0YVxuICBsYWJlbHM6IExhYmVsW11cblxuICBjb25zdHJ1Y3RvciAoIGRhdGEgOiBHcmFwaGljUURhdGEsIHZpZXdPcHRpb25zIDogVmlld09wdGlvbnMpIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IFZpZXdPcHRpb25zID0ge1xuICAgICAgd2lkdGg6IDI1MCxcbiAgICAgIGhlaWdodDogMjUwXG4gICAgfVxuXG4gICAgdmlld09wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgdmlld09wdGlvbnMpXG5cbiAgICB0aGlzLndpZHRoID0gdmlld09wdGlvbnMud2lkdGhcbiAgICB0aGlzLmhlaWdodCA9IHZpZXdPcHRpb25zLmhlaWdodCAvLyBvbmx5IHRoaW5ncyBJIG5lZWQgZnJvbSB0aGUgb3B0aW9ucywgZ2VuZXJhbGx5P1xuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICAvLyB0aGlzLnJvdGF0aW9uP1xuXG4gICAgdGhpcy5sYWJlbHMgPSBbXSAvLyBsYWJlbHMgb24gZGlhZ3JhbVxuXG4gICAgLy8gRE9NIGVsZW1lbnRzXG4gICAgdGhpcy5ET00gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tZGl2JylcbiAgICB0aGlzLmNhbnZhcyA9IGNyZWF0ZUVsZW0oJ2NhbnZhcycsICdxdWVzdGlvbi1jYW52YXMnLCB0aGlzLkRPTSlcbiAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMud2lkdGhcbiAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodFxuICB9XG5cbiAgZ2V0RE9NICgpIDogSFRNTEVsZW1lbnQge1xuICAgIHJldHVybiB0aGlzLkRPTVxuICB9XG5cbiAgYWJzdHJhY3QgcmVuZGVyICgpIDogdm9pZFxuXG4gIHJlbmRlckxhYmVscyAobnVkZ2U/IDogYm9vbGVhbikgOiB2b2lkIHtcbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLkRPTVxuXG4gICAgLy8gcmVtb3ZlIGFueSBleGlzdGluZyBsYWJlbHNcbiAgICBjb25zdCBvbGRMYWJlbHMgPSBjb250YWluZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnbGFiZWwnKVxuICAgIHdoaWxlIChvbGRMYWJlbHMubGVuZ3RoID4gMCkge1xuICAgICAgb2xkTGFiZWxzWzBdLnJlbW92ZSgpXG4gICAgfVxuXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICAgIGNvbnN0IGlubmVybGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgICAgbGFiZWwuY2xhc3NMaXN0LmFkZCgnbGFiZWwnKVxuICAgICAgbGFiZWwuY2xhc3NOYW1lICs9ICcgJyArIGwuc3R5bGUgLy8gdXNpbmcgY2xhc3NOYW1lIG92ZXIgY2xhc3NMaXN0IHNpbmNlIGwuc3R5bGUgaXMgc3BhY2UtZGVsaW1pdGVkIGxpc3Qgb2YgY2xhc3Nlc1xuICAgICAgbGFiZWwuc3R5bGUubGVmdCA9IGwucG9zLnggKyAncHgnXG4gICAgICBsYWJlbC5zdHlsZS50b3AgPSBsLnBvcy55ICsgJ3B4J1xuXG4gICAgICBrYXRleC5yZW5kZXIobC50ZXh0LCBpbm5lcmxhYmVsKVxuICAgICAgbGFiZWwuYXBwZW5kQ2hpbGQoaW5uZXJsYWJlbClcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChsYWJlbClcblxuICAgICAgLy8gcmVtb3ZlIHNwYWNlIGlmIHRoZSBpbm5lciBsYWJlbCBpcyB0b28gYmlnXG4gICAgICBpZiAoaW5uZXJsYWJlbC5vZmZzZXRXaWR0aCAvIGlubmVybGFiZWwub2Zmc2V0SGVpZ2h0ID4gMikge1xuICAgICAgICBjb25zb2xlLmxvZyhgcmVtb3ZlZCBzcGFjZSBpbiAke2wudGV4dH1gKVxuICAgICAgICBjb25zdCBuZXdsYWJlbHRleHQgPSBsLnRleHQucmVwbGFjZSgvXFwrLywgJ1xcXFwhK1xcXFwhJykucmVwbGFjZSgvLS8sICdcXFxcIS1cXFxcIScpXG4gICAgICAgIGthdGV4LnJlbmRlcihuZXdsYWJlbHRleHQsIGlubmVybGFiZWwpXG4gICAgICB9XG5cbiAgICAgIC8vIEkgZG9uJ3QgdW5kZXJzdGFuZCB0aGlzIGFkanVzdG1lbnQuIEkgdGhpbmsgaXQgbWlnaHQgYmUgbmVlZGVkIGluIGFyaXRobWFnb25zLCBidXQgaXQgbWFrZXNcbiAgICAgIC8vIG90aGVycyBnbyBmdW5ueS5cblxuICAgICAgaWYgKG51ZGdlKSB7XG4gICAgICAgIGNvbnN0IGx3aWR0aCA9IGxhYmVsLm9mZnNldFdpZHRoXG4gICAgICAgIGNvbnN0IGxoZWlnaHQgPSBsYWJlbC5vZmZzZXRIZWlnaHRcbiAgICAgICAgaWYgKGwucG9zLnggPCB0aGlzLmNhbnZhcy53aWR0aCAvIDIgLSA1ICYmIGwucG9zLnggKyBsd2lkdGggLyAyID4gdGhpcy5jYW52YXMud2lkdGggLyAyKSB7XG4gICAgICAgICAgbGFiZWwuc3R5bGUubGVmdCA9ICh0aGlzLmNhbnZhcy53aWR0aCAvIDIgLSBsd2lkdGggLSAzKSArICdweCdcbiAgICAgICAgICBjb25zb2xlLmxvZyhgbnVkZ2VkICcke2wudGV4dH0nYClcbiAgICAgICAgfVxuICAgICAgICBpZiAobC5wb3MueCA+IHRoaXMuY2FudmFzLndpZHRoIC8gMiArIDUgJiYgbC5wb3MueCAtIGx3aWR0aCAvIDIgPCB0aGlzLmNhbnZhcy53aWR0aCAvIDIpIHtcbiAgICAgICAgICBsYWJlbC5zdHlsZS5sZWZ0ID0gKHRoaXMuY2FudmFzLndpZHRoIC8gMiArIDMpICsgJ3B4J1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBudWRnZWQgJyR7bC50ZXh0fSdgKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0YVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVhXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIC8vIFBvaW50IHRyYW5mb3JtYXRpb25zIG9mIGFsbCBwb2ludHNcblxuICBnZXQgYWxscG9pbnRzICgpIDogUG9pbnRbXSB7XG4gICAgcmV0dXJuIFtdXG4gIH1cblxuICBzY2FsZSAoc2YgOiBudW1iZXIpIDogdm9pZCB7XG4gICAgdGhpcy5hbGxwb2ludHMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgcC5zY2FsZShzZilcbiAgICB9KVxuICB9XG5cbiAgcm90YXRlIChhbmdsZSA6IG51bWJlcikgOiBudW1iZXIge1xuICAgIHRoaXMuYWxscG9pbnRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHAucm90YXRlKGFuZ2xlKVxuICAgIH0pXG4gICAgcmV0dXJuIGFuZ2xlXG4gIH1cblxuICB0cmFuc2xhdGUgKHggOiBudW1iZXIsIHkgOiBudW1iZXIpIDogdm9pZCB7XG4gICAgdGhpcy5hbGxwb2ludHMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgcC50cmFuc2xhdGUoeCwgeSlcbiAgICB9KVxuICB9XG5cbiAgcmFuZG9tUm90YXRlICgpIDogbnVtYmVyIHtcbiAgICBjb25zdCBhbmdsZSA9IDIgKiBNYXRoLlBJICogTWF0aC5yYW5kb20oKVxuICAgIHRoaXMucm90YXRlKGFuZ2xlKVxuICAgIHJldHVybiBhbmdsZVxuICB9XG5cbiAgLyoqXG4gICAqIFNjYWxlcyBhbGwgdGhlIHBvaW50cyB0byB3aXRoaW4gYSBnaXZlbiB3aWR0aCBhbmQgaGVpZ2h0LCBjZW50ZXJpbmcgdGhlIHJlc3VsdC4gUmV0dXJucyB0aGUgc2NhbGUgZmFjdG9yXG4gICAqIEBwYXJhbSB3aWR0aCBUaGUgd2lkdGggb2YgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSB0byBzY2FsZSB0b1xuICAgKiBAcGFyYW0gaGVpZ2h0IFRoZSBoZWlnaHQgb2YgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSB0byBzY2FsZSB0b1xuICAgKiBAcGFyYW0gbWFyZ2luIE1hcmdpbiB0byBsZWF2ZSBvdXRzaWRlIHRoZSByZWN0YW5nbGVcbiAgICogQHJldHVybnMgXG4gICAqL1xuICBzY2FsZVRvRml0ICh3aWR0aCA6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIG1hcmdpbiA6IG51bWJlcikgOiBudW1iZXIge1xuICAgIGxldCB0b3BMZWZ0IDogUG9pbnQgPSBQb2ludC5taW4odGhpcy5hbGxwb2ludHMpXG4gICAgbGV0IGJvdHRvbVJpZ2h0IDogUG9pbnQgPSBQb2ludC5tYXgodGhpcy5hbGxwb2ludHMpXG4gICAgY29uc3QgdG90YWxXaWR0aCA6IG51bWJlciA9IGJvdHRvbVJpZ2h0LnggLSB0b3BMZWZ0LnhcbiAgICBjb25zdCB0b3RhbEhlaWdodCA6IG51bWJlciA9IGJvdHRvbVJpZ2h0LnkgLSB0b3BMZWZ0LnlcbiAgICBjb25zdCBzZiA9IE1hdGgubWluKCh3aWR0aCAtIG1hcmdpbikgLyB0b3RhbFdpZHRoLCAoaGVpZ2h0IC0gbWFyZ2luKSAvIHRvdGFsSGVpZ2h0KVxuICAgIHRoaXMuc2NhbGUoc2YpXG5cbiAgICAvLyBjZW50cmVcbiAgICB0b3BMZWZ0ID0gUG9pbnQubWluKHRoaXMuYWxscG9pbnRzKVxuICAgIGJvdHRvbVJpZ2h0ID0gUG9pbnQubWF4KHRoaXMuYWxscG9pbnRzKVxuICAgIGNvbnN0IGNlbnRlciA9IFBvaW50Lm1lYW4odG9wTGVmdCwgYm90dG9tUmlnaHQpXG4gICAgdGhpcy50cmFuc2xhdGUod2lkdGggLyAyIC0gY2VudGVyLngsIGhlaWdodCAvIDIgLSBjZW50ZXIueSkgLy8gY2VudHJlXG5cbiAgICByZXR1cm4gc2ZcbiAgfVxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgR3JhcGhpY1EgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIGRhdGE6IEdyYXBoaWNRRGF0YVxuICB2aWV3OiBHcmFwaGljUVZpZXdcblxuICBjb25zdHJ1Y3RvciAoKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgc3VwZXIoKSAvLyB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgICBkZWxldGUgKHRoaXMuRE9NKSAvLyBnb2luZyB0byBvdmVycmlkZSBnZXRET00gdXNpbmcgdGhlIHZpZXcncyBET01cblxuICAgIC8qIFRoZXNlIGFyZSBndWFyYW50ZWVkIHRvIGJlIG92ZXJyaWRkZW4sIHNvIG5vIHBvaW50IGluaXRpYWxpemluZyBoZXJlXG4gICAgICpcbiAgICAgKiAgdGhpcy5kYXRhID0gbmV3IEdyYXBoaWNRRGF0YShvcHRpb25zKVxuICAgICAqICB0aGlzLnZpZXcgPSBuZXcgR3JhcGhpY1FWaWV3KHRoaXMuZGF0YSwgb3B0aW9ucylcbiAgICAgKlxuICAgICAqL1xuICB9XG5cbiAgLyogTmVlZCB0byByZWZhY3RvciBzdWJjbGFzc2VzIHRvIGRvIHRoaXM6XG4gICAqIGNvbnN0cnVjdG9yIChkYXRhLCB2aWV3KSB7XG4gICAqICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICogICAgdGhpcy52aWV3ID0gdmlld1xuICAgKiB9XG4gICAqXG4gICAqIHN0YXRpYyByYW5kb20ob3B0aW9ucykge1xuICAgKiAgLy8gYW4gYXR0ZW1wdCBhdCBoYXZpbmcgYWJzdHJhY3Qgc3RhdGljIG1ldGhvZHMsIGFsYmVpdCBydW50aW1lIGVycm9yXG4gICAqICB0aHJvdyBuZXcgRXJyb3IoXCJgcmFuZG9tKClgIG11c3QgYmUgb3ZlcnJpZGRlbiBpbiBzdWJjbGFzcyBcIiArIHRoaXMubmFtZSlcbiAgICogfVxuICAgKlxuICAgKiB0eXBpY2FsIGltcGxlbWVudGF0aW9uOlxuICAgKiBzdGF0aWMgcmFuZG9tKG9wdGlvbnMpIHtcbiAgICogIGNvbnN0IGRhdGEgPSBuZXcgRGVyaXZlZFFEYXRhKG9wdGlvbnMpXG4gICAqICBjb25zdCB2aWV3ID0gbmV3IERlcml2ZWRRVmlldyhvcHRpb25zKVxuICAgKiAgcmV0dXJuIG5ldyBEZXJpdmVkUURhdGEoZGF0YSx2aWV3KVxuICAgKiB9XG4gICAqXG4gICAqL1xuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHsgcmV0dXJuIHRoaXMudmlldy5nZXRET00oKSB9XG5cbiAgcmVuZGVyICgpIDogdm9pZCB7IHRoaXMudmlldy5yZW5kZXIoKSB9XG5cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQge1xuICAgIHN1cGVyLnNob3dBbnN3ZXIoKVxuICAgIHRoaXMudmlldy5zaG93QW5zd2VyKClcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICBzdXBlci5oaWRlQW5zd2VyKClcbiAgICB0aGlzLnZpZXcuaGlkZUFuc3dlcigpXG4gIH1cbn1cbiIsImltcG9ydCAqIGFzIGNvbW1vbmpzSGVscGVycyBmcm9tICdcdTAwMDBjb21tb25qc0hlbHBlcnMuanMnXG5cbnZhciBmcmFjdGlvbiA9IGNvbW1vbmpzSGVscGVycy5jcmVhdGVDb21tb25qc01vZHVsZShmdW5jdGlvbiAobW9kdWxlLCBleHBvcnRzKSB7XG4vKipcbiAqIEBsaWNlbnNlIEZyYWN0aW9uLmpzIHY0LjAuOSAwOS8wOS8yMDE1XG4gKiBodHRwOi8vd3d3Lnhhcmcub3JnLzIwMTQvMDMvcmF0aW9uYWwtbnVtYmVycy1pbi1qYXZhc2NyaXB0L1xuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSwgUm9iZXJ0IEVpc2VsZSAocm9iZXJ0QHhhcmcub3JnKVxuICogRHVhbCBsaWNlbnNlZCB1bmRlciB0aGUgTUlUIG9yIEdQTCBWZXJzaW9uIDIgbGljZW5zZXMuXG4gKiovXG5cbiAgLyoqXG4gKlxuICogVGhpcyBjbGFzcyBvZmZlcnMgdGhlIHBvc3NpYmlsaXR5IHRvIGNhbGN1bGF0ZSBmcmFjdGlvbnMuXG4gKiBZb3UgY2FuIHBhc3MgYSBmcmFjdGlvbiBpbiBkaWZmZXJlbnQgZm9ybWF0cy4gRWl0aGVyIGFzIGFycmF5LCBhcyBkb3VibGUsIGFzIHN0cmluZyBvciBhcyBhbiBpbnRlZ2VyLlxuICpcbiAqIEFycmF5L09iamVjdCBmb3JtXG4gKiBbIDAgPT4gPG5vbWluYXRvcj4sIDEgPT4gPGRlbm9taW5hdG9yPiBdXG4gKiBbIG4gPT4gPG5vbWluYXRvcj4sIGQgPT4gPGRlbm9taW5hdG9yPiBdXG4gKlxuICogSW50ZWdlciBmb3JtXG4gKiAtIFNpbmdsZSBpbnRlZ2VyIHZhbHVlXG4gKlxuICogRG91YmxlIGZvcm1cbiAqIC0gU2luZ2xlIGRvdWJsZSB2YWx1ZVxuICpcbiAqIFN0cmluZyBmb3JtXG4gKiAxMjMuNDU2IC0gYSBzaW1wbGUgZG91YmxlXG4gKiAxMjMvNDU2IC0gYSBzdHJpbmcgZnJhY3Rpb25cbiAqIDEyMy4nNDU2JyAtIGEgZG91YmxlIHdpdGggcmVwZWF0aW5nIGRlY2ltYWwgcGxhY2VzXG4gKiAxMjMuKDQ1NikgLSBzeW5vbnltXG4gKiAxMjMuNDUnNicgLSBhIGRvdWJsZSB3aXRoIHJlcGVhdGluZyBsYXN0IHBsYWNlXG4gKiAxMjMuNDUoNikgLSBzeW5vbnltXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiB2YXIgZiA9IG5ldyBGcmFjdGlvbihcIjkuNCczMSdcIik7XG4gKiBmLm11bChbLTQsIDNdKS5kaXYoNC45KTtcbiAqXG4gKi9cblxuICAoZnVuY3Rpb24gKHJvb3QpIHtcbiAgICAndXNlIHN0cmljdCdcblxuICAgIC8vIE1heGltdW0gc2VhcmNoIGRlcHRoIGZvciBjeWNsaWMgcmF0aW9uYWwgbnVtYmVycy4gMjAwMCBzaG91bGQgYmUgbW9yZSB0aGFuIGVub3VnaC5cbiAgICAvLyBFeGFtcGxlOiAxLzcgPSAwLigxNDI4NTcpIGhhcyA2IHJlcGVhdGluZyBkZWNpbWFsIHBsYWNlcy5cbiAgICAvLyBJZiBNQVhfQ1lDTEVfTEVOIGdldHMgcmVkdWNlZCwgbG9uZyBjeWNsZXMgd2lsbCBub3QgYmUgZGV0ZWN0ZWQgYW5kIHRvU3RyaW5nKCkgb25seSBnZXRzIHRoZSBmaXJzdCAxMCBkaWdpdHNcbiAgICB2YXIgTUFYX0NZQ0xFX0xFTiA9IDIwMDBcblxuICAgIC8vIFBhcnNlZCBkYXRhIHRvIGF2b2lkIGNhbGxpbmcgXCJuZXdcIiBhbGwgdGhlIHRpbWVcbiAgICB2YXIgUCA9IHtcbiAgICAgIHM6IDEsXG4gICAgICBuOiAwLFxuICAgICAgZDogMVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUVycm9yIChuYW1lKSB7XG4gICAgICBmdW5jdGlvbiBlcnJvckNvbnN0cnVjdG9yICgpIHtcbiAgICAgICAgdmFyIHRlbXAgPSBFcnJvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgICAgIHRlbXAubmFtZSA9IHRoaXMubmFtZSA9IG5hbWVcbiAgICAgICAgdGhpcy5zdGFjayA9IHRlbXAuc3RhY2tcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gdGVtcC5tZXNzYWdlXG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAqIEVycm9yIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICAgIGZ1bmN0aW9uIEludGVybWVkaWF0ZUluaGVyaXRvciAoKSB7fVxuICAgICAgSW50ZXJtZWRpYXRlSW5oZXJpdG9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZVxuICAgICAgZXJyb3JDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBuZXcgSW50ZXJtZWRpYXRlSW5oZXJpdG9yKClcblxuICAgICAgcmV0dXJuIGVycm9yQ29uc3RydWN0b3JcbiAgICB9XG5cbiAgICB2YXIgRGl2aXNpb25CeVplcm8gPSBGcmFjdGlvbi5EaXZpc2lvbkJ5WmVybyA9IGNyZWF0ZUVycm9yKCdEaXZpc2lvbkJ5WmVybycpXG4gICAgdmFyIEludmFsaWRQYXJhbWV0ZXIgPSBGcmFjdGlvbi5JbnZhbGlkUGFyYW1ldGVyID0gY3JlYXRlRXJyb3IoJ0ludmFsaWRQYXJhbWV0ZXInKVxuXG4gICAgZnVuY3Rpb24gYXNzaWduIChuLCBzKSB7XG4gICAgICBpZiAoaXNOYU4obiA9IHBhcnNlSW50KG4sIDEwKSkpIHtcbiAgICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKVxuICAgICAgfVxuICAgICAgcmV0dXJuIG4gKiBzXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdGhyb3dJbnZhbGlkUGFyYW0gKCkge1xuICAgICAgdGhyb3cgbmV3IEludmFsaWRQYXJhbWV0ZXIoKVxuICAgIH1cblxuICAgIHZhciBwYXJzZSA9IGZ1bmN0aW9uIChwMSwgcDIpIHtcbiAgICAgIHZhciBuID0gMDsgdmFyIGQgPSAxOyB2YXIgcyA9IDFcbiAgICAgIHZhciB2ID0gMDsgdmFyIHcgPSAwOyB2YXIgeCA9IDA7IHZhciB5ID0gMTsgdmFyIHogPSAxXG5cbiAgICAgIHZhciBBID0gMDsgdmFyIEIgPSAxXG4gICAgICB2YXIgQyA9IDE7IHZhciBEID0gMVxuXG4gICAgICB2YXIgTiA9IDEwMDAwMDAwXG4gICAgICB2YXIgTVxuXG4gICAgICBpZiAocDEgPT09IHVuZGVmaW5lZCB8fCBwMSA9PT0gbnVsbCkge1xuICAgICAgLyogdm9pZCAqL1xuICAgICAgfSBlbHNlIGlmIChwMiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG4gPSBwMVxuICAgICAgICBkID0gcDJcbiAgICAgICAgcyA9IG4gKiBkXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzd2l0Y2ggKHR5cGVvZiBwMSkge1xuICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAge1xuICAgICAgICAgICAgaWYgKCdkJyBpbiBwMSAmJiAnbicgaW4gcDEpIHtcbiAgICAgICAgICAgICAgbiA9IHAxLm5cbiAgICAgICAgICAgICAgZCA9IHAxLmRcbiAgICAgICAgICAgICAgaWYgKCdzJyBpbiBwMSkgeyBuICo9IHAxLnMgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICgwIGluIHAxKSB7XG4gICAgICAgICAgICAgIG4gPSBwMVswXVxuICAgICAgICAgICAgICBpZiAoMSBpbiBwMSkgeyBkID0gcDFbMV0gfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcyA9IG4gKiBkXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlmIChwMSA8IDApIHtcbiAgICAgICAgICAgICAgcyA9IHAxXG4gICAgICAgICAgICAgIHAxID0gLXAxXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwMSAlIDEgPT09IDApIHtcbiAgICAgICAgICAgICAgbiA9IHAxXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHAxID4gMCkgeyAvLyBjaGVjayBmb3IgIT0gMCwgc2NhbGUgd291bGQgYmVjb21lIE5hTiAobG9nKDApKSwgd2hpY2ggY29udmVyZ2VzIHJlYWxseSBzbG93XG4gICAgICAgICAgICAgIGlmIChwMSA+PSAxKSB7XG4gICAgICAgICAgICAgICAgeiA9IE1hdGgucG93KDEwLCBNYXRoLmZsb29yKDEgKyBNYXRoLmxvZyhwMSkgLyBNYXRoLkxOMTApKVxuICAgICAgICAgICAgICAgIHAxIC89IHpcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIFVzaW5nIEZhcmV5IFNlcXVlbmNlc1xuICAgICAgICAgICAgICAvLyBodHRwOi8vd3d3LmpvaG5kY29vay5jb20vYmxvZy8yMDEwLzEwLzIwL2Jlc3QtcmF0aW9uYWwtYXBwcm94aW1hdGlvbi9cblxuICAgICAgICAgICAgICB3aGlsZSAoQiA8PSBOICYmIEQgPD0gTikge1xuICAgICAgICAgICAgICAgIE0gPSAoQSArIEMpIC8gKEIgKyBEKVxuXG4gICAgICAgICAgICAgICAgaWYgKHAxID09PSBNKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoQiArIEQgPD0gTikge1xuICAgICAgICAgICAgICAgICAgICBuID0gQSArIENcbiAgICAgICAgICAgICAgICAgICAgZCA9IEIgKyBEXG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKEQgPiBCKSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBDXG4gICAgICAgICAgICAgICAgICAgIGQgPSBEXG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBuID0gQVxuICAgICAgICAgICAgICAgICAgICBkID0gQlxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgaWYgKHAxID4gTSkge1xuICAgICAgICAgICAgICAgICAgICBBICs9IENcbiAgICAgICAgICAgICAgICAgICAgQiArPSBEXG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBDICs9IEFcbiAgICAgICAgICAgICAgICAgICAgRCArPSBCXG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGlmIChCID4gTikge1xuICAgICAgICAgICAgICAgICAgICBuID0gQ1xuICAgICAgICAgICAgICAgICAgICBkID0gRFxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IEFcbiAgICAgICAgICAgICAgICAgICAgZCA9IEJcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbiAqPSB6XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzTmFOKHAxKSB8fCBpc05hTihwMikpIHtcbiAgICAgICAgICAgICAgZCA9IG4gPSBOYU5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAge1xuICAgICAgICAgICAgQiA9IHAxLm1hdGNoKC9cXGQrfC4vZylcblxuICAgICAgICAgICAgaWYgKEIgPT09IG51bGwpIHsgdGhyb3dJbnZhbGlkUGFyYW0oKSB9XG5cbiAgICAgICAgICAgIGlmIChCW0FdID09PSAnLScpIHsgLy8gQ2hlY2sgZm9yIG1pbnVzIHNpZ24gYXQgdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgICBzID0gLTFcbiAgICAgICAgICAgICAgQSsrXG4gICAgICAgICAgICB9IGVsc2UgaWYgKEJbQV0gPT09ICcrJykgeyAvLyBDaGVjayBmb3IgcGx1cyBzaWduIGF0IHRoZSBiZWdpbm5pbmdcbiAgICAgICAgICAgICAgQSsrXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChCLmxlbmd0aCA9PT0gQSArIDEpIHsgLy8gQ2hlY2sgaWYgaXQncyBqdXN0IGEgc2ltcGxlIG51bWJlciBcIjEyMzRcIlxuICAgICAgICAgICAgICB3ID0gYXNzaWduKEJbQSsrXSwgcylcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQltBICsgMV0gPT09ICcuJyB8fCBCW0FdID09PSAnLicpIHsgLy8gQ2hlY2sgaWYgaXQncyBhIGRlY2ltYWwgbnVtYmVyXG4gICAgICAgICAgICAgIGlmIChCW0FdICE9PSAnLicpIHsgLy8gSGFuZGxlIDAuNSBhbmQgLjVcbiAgICAgICAgICAgICAgICB2ID0gYXNzaWduKEJbQSsrXSwgcylcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBBKytcblxuICAgICAgICAgICAgICAvLyBDaGVjayBmb3IgZGVjaW1hbCBwbGFjZXNcbiAgICAgICAgICAgICAgaWYgKEEgKyAxID09PSBCLmxlbmd0aCB8fCBCW0EgKyAxXSA9PT0gJygnICYmIEJbQSArIDNdID09PSAnKScgfHwgQltBICsgMV0gPT09IFwiJ1wiICYmIEJbQSArIDNdID09PSBcIidcIikge1xuICAgICAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBXSwgcylcbiAgICAgICAgICAgICAgICB5ID0gTWF0aC5wb3coMTAsIEJbQV0ubGVuZ3RoKVxuICAgICAgICAgICAgICAgIEErK1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHJlcGVhdGluZyBwbGFjZXNcbiAgICAgICAgICAgICAgaWYgKEJbQV0gPT09ICcoJyAmJiBCW0EgKyAyXSA9PT0gJyknIHx8IEJbQV0gPT09IFwiJ1wiICYmIEJbQSArIDJdID09PSBcIidcIikge1xuICAgICAgICAgICAgICAgIHggPSBhc3NpZ24oQltBICsgMV0sIHMpXG4gICAgICAgICAgICAgICAgeiA9IE1hdGgucG93KDEwLCBCW0EgKyAxXS5sZW5ndGgpIC0gMVxuICAgICAgICAgICAgICAgIEEgKz0gM1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKEJbQSArIDFdID09PSAnLycgfHwgQltBICsgMV0gPT09ICc6JykgeyAvLyBDaGVjayBmb3IgYSBzaW1wbGUgZnJhY3Rpb24gXCIxMjMvNDU2XCIgb3IgXCIxMjM6NDU2XCJcbiAgICAgICAgICAgICAgdyA9IGFzc2lnbihCW0FdLCBzKVxuICAgICAgICAgICAgICB5ID0gYXNzaWduKEJbQSArIDJdLCAxKVxuICAgICAgICAgICAgICBBICs9IDNcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQltBICsgM10gPT09ICcvJyAmJiBCW0EgKyAxXSA9PT0gJyAnKSB7IC8vIENoZWNrIGZvciBhIGNvbXBsZXggZnJhY3Rpb24gXCIxMjMgMS8yXCJcbiAgICAgICAgICAgICAgdiA9IGFzc2lnbihCW0FdLCBzKVxuICAgICAgICAgICAgICB3ID0gYXNzaWduKEJbQSArIDJdLCBzKVxuICAgICAgICAgICAgICB5ID0gYXNzaWduKEJbQSArIDRdLCAxKVxuICAgICAgICAgICAgICBBICs9IDVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKEIubGVuZ3RoIDw9IEEpIHsgLy8gQ2hlY2sgZm9yIG1vcmUgdG9rZW5zIG9uIHRoZSBzdGFja1xuICAgICAgICAgICAgICBkID0geSAqIHpcbiAgICAgICAgICAgICAgcyA9IC8qIHZvaWQgKi9cbiAgICAgICAgICAgICAgICAgICAgbiA9IHggKyBkICogdiArIHogKiB3XG4gICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAvKiBGYWxsIHRocm91Z2ggb24gZXJyb3IgKi9cbiAgICAgICAgICB9XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93SW52YWxpZFBhcmFtKClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRGl2aXNpb25CeVplcm8oKVxuICAgICAgfVxuXG4gICAgICBQLnMgPSBzIDwgMCA/IC0xIDogMVxuICAgICAgUC5uID0gTWF0aC5hYnMobilcbiAgICAgIFAuZCA9IE1hdGguYWJzKGQpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW9kcG93IChiLCBlLCBtKSB7XG4gICAgICB2YXIgciA9IDFcbiAgICAgIGZvciAoOyBlID4gMDsgYiA9IChiICogYikgJSBtLCBlID4+PSAxKSB7XG4gICAgICAgIGlmIChlICYgMSkge1xuICAgICAgICAgIHIgPSAociAqIGIpICUgbVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gclxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGN5Y2xlTGVuIChuLCBkKSB7XG4gICAgICBmb3IgKDsgZCAlIDIgPT09IDA7XG4gICAgICAgIGQgLz0gMikge1xuICAgICAgfVxuXG4gICAgICBmb3IgKDsgZCAlIDUgPT09IDA7XG4gICAgICAgIGQgLz0gNSkge1xuICAgICAgfVxuXG4gICAgICBpZiAoZCA9PT0gMSkgLy8gQ2F0Y2ggbm9uLWN5Y2xpYyBudW1iZXJzXG4gICAgICB7IHJldHVybiAwIH1cblxuICAgICAgLy8gSWYgd2Ugd291bGQgbGlrZSB0byBjb21wdXRlIHJlYWxseSBsYXJnZSBudW1iZXJzIHF1aWNrZXIsIHdlIGNvdWxkIG1ha2UgdXNlIG9mIEZlcm1hdCdzIGxpdHRsZSB0aGVvcmVtOlxuICAgICAgLy8gMTBeKGQtMSkgJSBkID09IDFcbiAgICAgIC8vIEhvd2V2ZXIsIHdlIGRvbid0IG5lZWQgc3VjaCBsYXJnZSBudW1iZXJzIGFuZCBNQVhfQ1lDTEVfTEVOIHNob3VsZCBiZSB0aGUgY2Fwc3RvbmUsXG4gICAgICAvLyBhcyB3ZSB3YW50IHRvIHRyYW5zbGF0ZSB0aGUgbnVtYmVycyB0byBzdHJpbmdzLlxuXG4gICAgICB2YXIgcmVtID0gMTAgJSBkXG4gICAgICB2YXIgdCA9IDFcblxuICAgICAgZm9yICg7IHJlbSAhPT0gMTsgdCsrKSB7XG4gICAgICAgIHJlbSA9IHJlbSAqIDEwICUgZFxuXG4gICAgICAgIGlmICh0ID4gTUFYX0NZQ0xFX0xFTikgeyByZXR1cm4gMCB9IC8vIFJldHVybmluZyAwIGhlcmUgbWVhbnMgdGhhdCB3ZSBkb24ndCBwcmludCBpdCBhcyBhIGN5Y2xpYyBudW1iZXIuIEl0J3MgbGlrZWx5IHRoYXQgdGhlIGFuc3dlciBpcyBgZC0xYFxuICAgICAgfVxuICAgICAgcmV0dXJuIHRcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjeWNsZVN0YXJ0IChuLCBkLCBsZW4pIHtcbiAgICAgIHZhciByZW0xID0gMVxuICAgICAgdmFyIHJlbTIgPSBtb2Rwb3coMTAsIGxlbiwgZClcblxuICAgICAgZm9yICh2YXIgdCA9IDA7IHQgPCAzMDA7IHQrKykgeyAvLyBzIDwgfmxvZzEwKE51bWJlci5NQVhfVkFMVUUpXG4gICAgICAvLyBTb2x2ZSAxMF5zID09IDEwXihzK3QpIChtb2QgZClcblxuICAgICAgICBpZiAocmVtMSA9PT0gcmVtMikgeyByZXR1cm4gdCB9XG5cbiAgICAgICAgcmVtMSA9IHJlbTEgKiAxMCAlIGRcbiAgICAgICAgcmVtMiA9IHJlbTIgKiAxMCAlIGRcbiAgICAgIH1cbiAgICAgIHJldHVybiAwXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2NkIChhLCBiKSB7XG4gICAgICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICAgICAgaWYgKCFiKSB7IHJldHVybiBhIH1cblxuICAgICAgd2hpbGUgKDEpIHtcbiAgICAgICAgYSAlPSBiXG4gICAgICAgIGlmICghYSkgeyByZXR1cm4gYiB9XG4gICAgICAgIGIgJT0gYVxuICAgICAgICBpZiAoIWIpIHsgcmV0dXJuIGEgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICogTW9kdWxlIGNvbnN0cnVjdG9yXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge251bWJlcnxGcmFjdGlvbj19IGFcbiAgICogQHBhcmFtIHtudW1iZXI9fSBiXG4gICAqL1xuICAgIGZ1bmN0aW9uIEZyYWN0aW9uIChhLCBiKSB7XG4gICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRnJhY3Rpb24pKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oYSwgYilcbiAgICAgIH1cblxuICAgICAgcGFyc2UoYSwgYilcblxuICAgICAgaWYgKEZyYWN0aW9uLlJFRFVDRSkge1xuICAgICAgICBhID0gZ2NkKFAuZCwgUC5uKSAvLyBBYnVzZSBhXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhID0gMVxuICAgICAgfVxuXG4gICAgICB0aGlzLnMgPSBQLnNcbiAgICAgIHRoaXMubiA9IFAubiAvIGFcbiAgICAgIHRoaXMuZCA9IFAuZCAvIGFcbiAgICB9XG5cbiAgICAvKipcbiAgICogQm9vbGVhbiBnbG9iYWwgdmFyaWFibGUgdG8gYmUgYWJsZSB0byBkaXNhYmxlIGF1dG9tYXRpYyByZWR1Y3Rpb24gb2YgdGhlIGZyYWN0aW9uXG4gICAqXG4gICAqL1xuICAgIEZyYWN0aW9uLlJFRFVDRSA9IDFcblxuICAgIEZyYWN0aW9uLnByb3RvdHlwZSA9IHtcblxuICAgICAgczogMSxcbiAgICAgIG46IDAsXG4gICAgICBkOiAxLFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBhYnNvbHV0ZSB2YWx1ZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigtNCkuYWJzKCkgPT4gNFxuICAgICAqKi9cbiAgICAgIGFiczogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMubiwgdGhpcy5kKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogSW52ZXJ0cyB0aGUgc2lnbiBvZiB0aGUgY3VycmVudCBmcmFjdGlvblxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigtNCkubmVnKCkgPT4gNFxuICAgICAqKi9cbiAgICAgIG5lZzogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKC10aGlzLnMgKiB0aGlzLm4sIHRoaXMuZClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIEFkZHMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oe246IDIsIGQ6IDN9KS5hZGQoXCIxNC45XCIpID0+IDQ2NyAvIDMwXG4gICAgICoqL1xuICAgICAgYWRkOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIHRoaXMubiAqIFAuZCArIFAucyAqIHRoaXMuZCAqIFAubixcbiAgICAgICAgICB0aGlzLmQgKiBQLmRcbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogU3VidHJhY3RzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKHtuOiAyLCBkOiAzfSkuYWRkKFwiMTQuOVwiKSA9PiAtNDI3IC8gMzBcbiAgICAgKiovXG4gICAgICBzdWI6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgdGhpcy5zICogdGhpcy5uICogUC5kIC0gUC5zICogdGhpcy5kICogUC5uLFxuICAgICAgICAgIHRoaXMuZCAqIFAuZFxuICAgICAgICApXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBNdWx0aXBsaWVzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiLTE3LigzNDUpXCIpLm11bCgzKSA9PiA1Nzc2IC8gMTExXG4gICAgICoqL1xuICAgICAgbXVsOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIFAucyAqIHRoaXMubiAqIFAubixcbiAgICAgICAgICB0aGlzLmQgKiBQLmRcbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogRGl2aWRlcyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIi0xNy4oMzQ1KVwiKS5pbnZlcnNlKCkuZGl2KDMpXG4gICAgICoqL1xuICAgICAgZGl2OiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIFAucyAqIHRoaXMubiAqIFAuZCxcbiAgICAgICAgICB0aGlzLmQgKiBQLm5cbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2xvbmVzIHRoZSBhY3R1YWwgb2JqZWN0XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiLTE3LigzNDUpXCIpLmNsb25lKClcbiAgICAgKiovXG4gICAgICBjbG9uZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBtb2R1bG8gb2YgdHdvIHJhdGlvbmFsIG51bWJlcnMgLSBhIG1vcmUgcHJlY2lzZSBmbW9kXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLm1vZChbNywgOF0pID0+ICgxMy8zKSAlICg3LzgpID0gKDUvNilcbiAgICAgKiovXG4gICAgICBtb2Q6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTilcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMucyAqIHRoaXMubiAlIHRoaXMuZCwgMSlcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIGlmIChQLm4gPT09IDAgJiYgdGhpcy5kID09PSAwKSB7XG4gICAgICAgICAgRnJhY3Rpb24oMCwgMCkgLy8gVGhyb3cgRGl2aXNpb25CeVplcm9cbiAgICAgICAgfVxuXG4gICAgICAgIC8qXG4gICAgICAgKiBGaXJzdCBzaWxseSBhdHRlbXB0LCBraW5kYSBzbG93XG4gICAgICAgKlxuICAgICAgIHJldHVybiB0aGF0W1wic3ViXCJdKHtcbiAgICAgICBcIm5cIjogbnVtW1wiblwiXSAqIE1hdGguZmxvb3IoKHRoaXMubiAvIHRoaXMuZCkgLyAobnVtLm4gLyBudW0uZCkpLFxuICAgICAgIFwiZFwiOiBudW1bXCJkXCJdLFxuICAgICAgIFwic1wiOiB0aGlzW1wic1wiXVxuICAgICAgIH0pOyAqL1xuXG4gICAgICAgIC8qXG4gICAgICAgKiBOZXcgYXR0ZW1wdDogYTEgLyBiMSA9IGEyIC8gYjIgKiBxICsgclxuICAgICAgICogPT4gYjIgKiBhMSA9IGEyICogYjEgKiBxICsgYjEgKiBiMiAqIHJcbiAgICAgICAqID0+IChiMiAqIGExICUgYTIgKiBiMSkgLyAoYjEgKiBiMilcbiAgICAgICAqL1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIChQLmQgKiB0aGlzLm4pICUgKFAubiAqIHRoaXMuZCksXG4gICAgICAgICAgUC5kICogdGhpcy5kXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZyYWN0aW9uYWwgZ2NkIG9mIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDUsOCkuZ2NkKDMsNykgPT4gMS81NlxuICAgICAqL1xuICAgICAgZ2NkOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuXG4gICAgICAgIC8vIGdjZChhIC8gYiwgYyAvIGQpID0gZ2NkKGEsIGMpIC8gbGNtKGIsIGQpXG5cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihnY2QoUC5uLCB0aGlzLm4pICogZ2NkKFAuZCwgdGhpcy5kKSwgUC5kICogdGhpcy5kKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZnJhY3Rpb25hbCBsY20gb2YgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oNSw4KS5sY20oMyw3KSA9PiAxNVxuICAgICAqL1xuICAgICAgbGNtOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuXG4gICAgICAgIC8vIGxjbShhIC8gYiwgYyAvIGQpID0gbGNtKGEsIGMpIC8gZ2NkKGIsIGQpXG5cbiAgICAgICAgaWYgKFAubiA9PT0gMCAmJiB0aGlzLm4gPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFAubiAqIHRoaXMubiwgZ2NkKFAubiwgdGhpcy5uKSAqIGdjZChQLmQsIHRoaXMuZCkpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBjZWlsIG9mIGEgcmF0aW9uYWwgbnVtYmVyXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLmNlaWwoKSA9PiAoNSAvIDEpXG4gICAgICoqL1xuICAgICAgY2VpbDogZnVuY3Rpb24gKHBsYWNlcykge1xuICAgICAgICBwbGFjZXMgPSBNYXRoLnBvdygxMCwgcGxhY2VzIHx8IDApXG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5jZWlsKHBsYWNlcyAqIHRoaXMucyAqIHRoaXMubiAvIHRoaXMuZCksIHBsYWNlcylcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZsb29yIG9mIGEgcmF0aW9uYWwgbnVtYmVyXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLmZsb29yKCkgPT4gKDQgLyAxKVxuICAgICAqKi9cbiAgICAgIGZsb29yOiBmdW5jdGlvbiAocGxhY2VzKSB7XG4gICAgICAgIHBsYWNlcyA9IE1hdGgucG93KDEwLCBwbGFjZXMgfHwgMClcblxuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLmZsb29yKHBsYWNlcyAqIHRoaXMucyAqIHRoaXMubiAvIHRoaXMuZCksIHBsYWNlcylcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJvdW5kcyBhIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykucm91bmQoKSA9PiAoNCAvIDEpXG4gICAgICoqL1xuICAgICAgcm91bmQ6IGZ1bmN0aW9uIChwbGFjZXMpIHtcbiAgICAgICAgcGxhY2VzID0gTWF0aC5wb3coMTAsIHBsYWNlcyB8fCAwKVxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGgucm91bmQocGxhY2VzICogdGhpcy5zICogdGhpcy5uIC8gdGhpcy5kKSwgcGxhY2VzKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogR2V0cyB0aGUgaW52ZXJzZSBvZiB0aGUgZnJhY3Rpb24sIG1lYW5zIG51bWVyYXRvciBhbmQgZGVudW1lcmF0b3IgYXJlIGV4Y2hhbmdlZFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihbLTMsIDRdKS5pbnZlcnNlKCkgPT4gLTQgLyAzXG4gICAgICoqL1xuICAgICAgaW52ZXJzZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKHRoaXMucyAqIHRoaXMuZCwgdGhpcy5uKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZnJhY3Rpb24gdG8gc29tZSBpbnRlZ2VyIGV4cG9uZW50XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKC0xLDIpLnBvdygtMykgPT4gLThcbiAgICAgKi9cbiAgICAgIHBvdzogZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgaWYgKG0gPCAwKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLnBvdyh0aGlzLnMgKiB0aGlzLmQsIC1tKSwgTWF0aC5wb3codGhpcy5uLCAtbSkpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLnBvdyh0aGlzLnMgKiB0aGlzLm4sIG0pLCBNYXRoLnBvdyh0aGlzLmQsIG0pKVxuICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0d28gcmF0aW9uYWwgbnVtYmVycyBhcmUgdGhlIHNhbWVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oMTkuNikuZXF1YWxzKFs5OCwgNV0pO1xuICAgICAqKi9cbiAgICAgIGVxdWFsczogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIHRoaXMucyAqIHRoaXMubiAqIFAuZCA9PT0gUC5zICogUC5uICogdGhpcy5kIC8vIFNhbWUgYXMgY29tcGFyZSgpID09PSAwXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0d28gcmF0aW9uYWwgbnVtYmVycyBhcmUgdGhlIHNhbWVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oMTkuNikuZXF1YWxzKFs5OCwgNV0pO1xuICAgICAqKi9cbiAgICAgIGNvbXBhcmU6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHZhciB0ID0gKHRoaXMucyAqIHRoaXMubiAqIFAuZCAtIFAucyAqIFAubiAqIHRoaXMuZClcbiAgICAgICAgcmV0dXJuICh0ID4gMCkgLSAodCA8IDApXG4gICAgICB9LFxuXG4gICAgICBzaW1wbGlmeTogZnVuY3Rpb24gKGVwcykge1xuICAgICAgLy8gRmlyc3QgbmFpdmUgaW1wbGVtZW50YXRpb24sIG5lZWRzIGltcHJvdmVtZW50XG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiB0aGlzXG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY29udCA9IHRoaXMuYWJzKCkudG9Db250aW51ZWQoKVxuXG4gICAgICAgIGVwcyA9IGVwcyB8fCAwLjAwMVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlYyAoYSkge1xuICAgICAgICAgIGlmIChhLmxlbmd0aCA9PT0gMSkgeyByZXR1cm4gbmV3IEZyYWN0aW9uKGFbMF0pIH1cbiAgICAgICAgICByZXR1cm4gcmVjKGEuc2xpY2UoMSkpLmludmVyc2UoKS5hZGQoYVswXSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29udC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHZhciB0bXAgPSByZWMoY29udC5zbGljZSgwLCBpICsgMSkpXG4gICAgICAgICAgaWYgKHRtcC5zdWIodGhpcy5hYnMoKSkuYWJzKCkudmFsdWVPZigpIDwgZXBzKSB7XG4gICAgICAgICAgICByZXR1cm4gdG1wLm11bCh0aGlzLnMpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0d28gcmF0aW9uYWwgbnVtYmVycyBhcmUgZGl2aXNpYmxlXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDE5LjYpLmRpdmlzaWJsZSgxLjUpO1xuICAgICAqL1xuICAgICAgZGl2aXNpYmxlOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gISghKFAubiAqIHRoaXMuZCkgfHwgKCh0aGlzLm4gKiBQLmQpICUgKFAubiAqIHRoaXMuZCkpKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogUmV0dXJucyBhIGRlY2ltYWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGZyYWN0aW9uXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiMTAwLic5MTgyMydcIikudmFsdWVPZigpID0+IDEwMC45MTgyMzkxODIzOTE4M1xuICAgICAqKi9cbiAgICAgIHZhbHVlT2Y6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucyAqIHRoaXMubiAvIHRoaXMuZFxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogUmV0dXJucyBhIHN0cmluZy1mcmFjdGlvbiByZXByZXNlbnRhdGlvbiBvZiBhIEZyYWN0aW9uIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEuJzMnXCIpLnRvRnJhY3Rpb24oKSA9PiBcIjQgMS8zXCJcbiAgICAgKiovXG4gICAgICB0b0ZyYWN0aW9uOiBmdW5jdGlvbiAoZXhjbHVkZVdob2xlKSB7XG4gICAgICAgIHZhciB3aG9sZTsgdmFyIHN0ciA9ICcnXG4gICAgICAgIHZhciBuID0gdGhpcy5uXG4gICAgICAgIHZhciBkID0gdGhpcy5kXG4gICAgICAgIGlmICh0aGlzLnMgPCAwKSB7XG4gICAgICAgICAgc3RyICs9ICctJ1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGQgPT09IDEpIHtcbiAgICAgICAgICBzdHIgKz0gblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChleGNsdWRlV2hvbGUgJiYgKHdob2xlID0gTWF0aC5mbG9vcihuIC8gZCkpID4gMCkge1xuICAgICAgICAgICAgc3RyICs9IHdob2xlXG4gICAgICAgICAgICBzdHIgKz0gJyAnXG4gICAgICAgICAgICBuICU9IGRcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzdHIgKz0gblxuICAgICAgICAgIHN0ciArPSAnLydcbiAgICAgICAgICBzdHIgKz0gZFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHJcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBsYXRleCByZXByZXNlbnRhdGlvbiBvZiBhIEZyYWN0aW9uIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEuJzMnXCIpLnRvTGF0ZXgoKSA9PiBcIlxcZnJhY3s0fXszfVwiXG4gICAgICoqL1xuICAgICAgdG9MYXRleDogZnVuY3Rpb24gKGV4Y2x1ZGVXaG9sZSkge1xuICAgICAgICB2YXIgd2hvbGU7IHZhciBzdHIgPSAnJ1xuICAgICAgICB2YXIgbiA9IHRoaXMublxuICAgICAgICB2YXIgZCA9IHRoaXMuZFxuICAgICAgICBpZiAodGhpcy5zIDwgMCkge1xuICAgICAgICAgIHN0ciArPSAnLSdcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkID09PSAxKSB7XG4gICAgICAgICAgc3RyICs9IG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZXhjbHVkZVdob2xlICYmICh3aG9sZSA9IE1hdGguZmxvb3IobiAvIGQpKSA+IDApIHtcbiAgICAgICAgICAgIHN0ciArPSB3aG9sZVxuICAgICAgICAgICAgbiAlPSBkXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc3RyICs9ICdcXFxcZnJhY3snXG4gICAgICAgICAgc3RyICs9IG5cbiAgICAgICAgICBzdHIgKz0gJ317J1xuICAgICAgICAgIHN0ciArPSBkXG4gICAgICAgICAgc3RyICs9ICd9J1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHJcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YgY29udGludWVkIGZyYWN0aW9uIGVsZW1lbnRzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiNy84XCIpLnRvQ29udGludWVkKCkgPT4gWzAsMSw3XVxuICAgICAqL1xuICAgICAgdG9Db250aW51ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRcbiAgICAgICAgdmFyIGEgPSB0aGlzLm5cbiAgICAgICAgdmFyIGIgPSB0aGlzLmRcbiAgICAgICAgdmFyIHJlcyA9IFtdXG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiByZXNcbiAgICAgICAgfVxuXG4gICAgICAgIGRvIHtcbiAgICAgICAgICByZXMucHVzaChNYXRoLmZsb29yKGEgLyBiKSlcbiAgICAgICAgICB0ID0gYSAlIGJcbiAgICAgICAgICBhID0gYlxuICAgICAgICAgIGIgPSB0XG4gICAgICAgIH0gd2hpbGUgKGEgIT09IDEpXG5cbiAgICAgICAgcmV0dXJuIHJlc1xuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhIGZyYWN0aW9uIHdpdGggYWxsIGRpZ2l0c1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEwMC4nOTE4MjMnXCIpLnRvU3RyaW5nKCkgPT4gXCIxMDAuKDkxODIzKVwiXG4gICAgICoqL1xuICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uIChkZWMpIHtcbiAgICAgICAgdmFyIGdcbiAgICAgICAgdmFyIE4gPSB0aGlzLm5cbiAgICAgICAgdmFyIEQgPSB0aGlzLmRcblxuICAgICAgICBpZiAoaXNOYU4oTikgfHwgaXNOYU4oRCkpIHtcbiAgICAgICAgICByZXR1cm4gJ05hTidcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghRnJhY3Rpb24uUkVEVUNFKSB7XG4gICAgICAgICAgZyA9IGdjZChOLCBEKVxuICAgICAgICAgIE4gLz0gZ1xuICAgICAgICAgIEQgLz0gZ1xuICAgICAgICB9XG5cbiAgICAgICAgZGVjID0gZGVjIHx8IDE1IC8vIDE1ID0gZGVjaW1hbCBwbGFjZXMgd2hlbiBubyByZXBpdGF0aW9uXG5cbiAgICAgICAgdmFyIGN5Y0xlbiA9IGN5Y2xlTGVuKE4sIEQpIC8vIEN5Y2xlIGxlbmd0aFxuICAgICAgICB2YXIgY3ljT2ZmID0gY3ljbGVTdGFydChOLCBELCBjeWNMZW4pIC8vIEN5Y2xlIHN0YXJ0XG5cbiAgICAgICAgdmFyIHN0ciA9IHRoaXMucyA9PT0gLTEgPyAnLScgOiAnJ1xuXG4gICAgICAgIHN0ciArPSBOIC8gRCB8IDBcblxuICAgICAgICBOICU9IERcbiAgICAgICAgTiAqPSAxMFxuXG4gICAgICAgIGlmIChOKSB7IHN0ciArPSAnLicgfVxuXG4gICAgICAgIGlmIChjeWNMZW4pIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gY3ljT2ZmOyBpLS07KSB7XG4gICAgICAgICAgICBzdHIgKz0gTiAvIEQgfCAwXG4gICAgICAgICAgICBOICU9IERcbiAgICAgICAgICAgIE4gKj0gMTBcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RyICs9ICcoJ1xuICAgICAgICAgIGZvciAodmFyIGkgPSBjeWNMZW47IGktLTspIHtcbiAgICAgICAgICAgIHN0ciArPSBOIC8gRCB8IDBcbiAgICAgICAgICAgIE4gJT0gRFxuICAgICAgICAgICAgTiAqPSAxMFxuICAgICAgICAgIH1cbiAgICAgICAgICBzdHIgKz0gJyknXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IGRlYzsgTiAmJiBpLS07KSB7XG4gICAgICAgICAgICBzdHIgKz0gTiAvIEQgfCAwXG4gICAgICAgICAgICBOICU9IERcbiAgICAgICAgICAgIE4gKj0gMTBcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0clxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdW5kZWZpbmVkID09PSAnZnVuY3Rpb24nICYmIHVuZGVmaW5lZC5hbWQpIHtcbiAgICAgIHVuZGVmaW5lZChbXSwgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gRnJhY3Rpb25cbiAgICAgIH0pXG4gICAgfSBlbHNlIGlmICgnb2JqZWN0JyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSlcbiAgICAgIEZyYWN0aW9uLmRlZmF1bHQgPSBGcmFjdGlvblxuICAgICAgRnJhY3Rpb24uRnJhY3Rpb24gPSBGcmFjdGlvblxuICAgICAgbW9kdWxlLmV4cG9ydHMgPSBGcmFjdGlvblxuICAgIH0gZWxzZSB7XG4gICAgICByb290LkZyYWN0aW9uID0gRnJhY3Rpb25cbiAgICB9XG4gIH0pKGNvbW1vbmpzSGVscGVycy5jb21tb25qc0dsb2JhbClcbn0pXG5cbmV4cG9ydCBkZWZhdWx0IC8qIEBfX1BVUkVfXyAqL2NvbW1vbmpzSGVscGVycy5nZXREZWZhdWx0RXhwb3J0RnJvbUNqcyhmcmFjdGlvbilcbmV4cG9ydCB7IGZyYWN0aW9uIGFzIF9fbW9kdWxlRXhwb3J0cyB9XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBNb25vbWlhbCB7XG4gIGNvbnN0cnVjdG9yIChjLCB2cykge1xuICAgIGlmICghaXNOYU4oYykgJiYgdnMgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgIHRoaXMuYyA9IGNcbiAgICAgIHRoaXMudnMgPSB2c1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGMgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmluaXRTdHIoYylcbiAgICB9IGVsc2UgaWYgKCFpc05hTihjKSkge1xuICAgICAgdGhpcy5jID0gY1xuICAgICAgdGhpcy52cyA9IG5ldyBNYXAoKVxuICAgIH0gZWxzZSB7IC8vIGRlZmF1bHQgYXMgYSB0ZXN0OiA0eF4yeVxuICAgICAgdGhpcy5jID0gNFxuICAgICAgdGhpcy52cyA9IG5ldyBNYXAoW1sneCcsIDJdLCBbJ3knLCAxXV0pXG4gICAgfVxuICB9XG5cbiAgY2xvbmUgKCkge1xuICAgIGNvbnN0IHZzID0gbmV3IE1hcCh0aGlzLnZzKVxuICAgIHJldHVybiBuZXcgTW9ub21pYWwodGhpcy5jLCB2cylcbiAgfVxuXG4gIG11bCAodGhhdCkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgTW9ub21pYWwodGhhdClcbiAgICB9XG4gICAgY29uc3QgYyA9IHRoaXMuYyAqIHRoYXQuY1xuICAgIGxldCB2cyA9IG5ldyBNYXAoKVxuICAgIHRoaXMudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAodGhhdC52cy5oYXModmFyaWFibGUpKSB7XG4gICAgICAgIHZzLnNldCh2YXJpYWJsZSwgdGhpcy52cy5nZXQodmFyaWFibGUpICsgdGhhdC52cy5nZXQodmFyaWFibGUpKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdnMuc2V0KHZhcmlhYmxlLCB0aGlzLnZzLmdldCh2YXJpYWJsZSkpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoYXQudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAoIXZzLmhhcyh2YXJpYWJsZSkpIHtcbiAgICAgICAgdnMuc2V0KHZhcmlhYmxlLCB0aGF0LnZzLmdldCh2YXJpYWJsZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICB2cyA9IG5ldyBNYXAoWy4uLnZzLmVudHJpZXMoKV0uc29ydCgpKVxuICAgIHJldHVybiBuZXcgTW9ub21pYWwoYywgdnMpXG4gIH1cblxuICB0b0xhdGV4ICgpIHtcbiAgICBpZiAodGhpcy52cy5zaXplID09PSAwKSByZXR1cm4gdGhpcy5jLnRvU3RyaW5nKClcbiAgICBsZXQgc3RyID0gdGhpcy5jID09PSAxID8gJydcbiAgICAgIDogdGhpcy5jID09PSAtMSA/ICctJ1xuICAgICAgICA6IHRoaXMuYy50b1N0cmluZygpXG4gICAgdGhpcy52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmIChpbmRleCA9PT0gMSkge1xuICAgICAgICBzdHIgKz0gdmFyaWFibGVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciArPSB2YXJpYWJsZSArICdeJyArIGluZGV4XG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gc3RyXG4gIH1cblxuICBzb3J0ICgpIHtcbiAgICAvLyBzb3J0cyAobW9kaWZpZXMgb2JqZWN0KVxuICAgIHRoaXMudnMgPSBuZXcgTWFwKFsuLi50aGlzLnZzLmVudHJpZXMoKV0uc29ydCgpKVxuICB9XG5cbiAgY2xlYW5aZXJvcyAoKSB7XG4gICAgdGhpcy52cy5mb3JFYWNoKChpZHgsIHYpID0+IHtcbiAgICAgIGlmIChpZHggPT09IDApIHRoaXMudnMuZGVsZXRlKHYpXG4gICAgfSlcbiAgfVxuXG4gIGxpa2UgKHRoYXQpIHtcbiAgICAvLyByZXR1cm4gdHJ1ZSBpZiBsaWtlIHRlcm1zLCBmYWxzZSBpZiBvdGhlcndpc2VcbiAgICAvLyBub3QgdGhlIG1vc3QgZWZmaWNpZW50IGF0IHRoZSBtb21lbnQsIGJ1dCBnb29kIGVub3VnaC5cbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IE1vbm9taWFsKHRoYXQpXG4gICAgfVxuXG4gICAgbGV0IGxpa2UgPSB0cnVlXG4gICAgdGhpcy52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICghdGhhdC52cy5oYXModmFyaWFibGUpIHx8IHRoYXQudnMuZ2V0KHZhcmlhYmxlKSAhPT0gaW5kZXgpIHtcbiAgICAgICAgbGlrZSA9IGZhbHNlXG4gICAgICB9XG4gICAgfSlcbiAgICB0aGF0LnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKCF0aGlzLnZzLmhhcyh2YXJpYWJsZSkgfHwgdGhpcy52cy5nZXQodmFyaWFibGUpICE9PSBpbmRleCkge1xuICAgICAgICBsaWtlID0gZmFsc2VcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBsaWtlXG4gIH1cblxuICBhZGQgKHRoYXQsIGNoZWNrTGlrZSkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgTW9ub21pYWwodGhhdClcbiAgICB9XG4gICAgLy8gYWRkcyB0d28gY29tcGF0aWJsZSBtb25vbWlhbHNcbiAgICAvLyBjaGVja0xpa2UgKGRlZmF1bHQgdHJ1ZSkgd2lsbCBjaGVjayBmaXJzdCBpZiB0aGV5IGFyZSBsaWtlIGFuZCB0aHJvdyBhbiBleGNlcHRpb25cbiAgICAvLyB1bmRlZmluZWQgYmVoYXZpb3VyIGlmIGNoZWNrTGlrZSBpcyBmYWxzZVxuICAgIGlmIChjaGVja0xpa2UgPT09IHVuZGVmaW5lZCkgY2hlY2tMaWtlID0gdHJ1ZVxuICAgIGlmIChjaGVja0xpa2UgJiYgIXRoaXMubGlrZSh0aGF0KSkgdGhyb3cgbmV3IEVycm9yKCdBZGRpbmcgdW5saWtlIHRlcm1zJylcbiAgICBjb25zdCBjID0gdGhpcy5jICsgdGhhdC5jXG4gICAgY29uc3QgdnMgPSB0aGlzLnZzXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbChjLCB2cylcbiAgfVxuXG4gIGluaXRTdHIgKHN0cikge1xuICAgIC8vIGN1cnJlbnRseSBubyBlcnJvciBjaGVja2luZyBhbmQgZnJhZ2lsZVxuICAgIC8vIFRoaW5ncyBub3QgdG8gcGFzcyBpbjpcbiAgICAvLyAgemVybyBpbmRpY2VzXG4gICAgLy8gIG11bHRpLWNoYXJhY3RlciB2YXJpYWJsZXNcbiAgICAvLyAgbmVnYXRpdmUgaW5kaWNlc1xuICAgIC8vICBub24taW50ZWdlciBjb2VmZmljaWVudHNcbiAgICBjb25zdCBsZWFkID0gc3RyLm1hdGNoKC9eLT9cXGQqLylbMF1cbiAgICBjb25zdCBjID0gbGVhZCA9PT0gJycgPyAxXG4gICAgICA6IGxlYWQgPT09ICctJyA/IC0xXG4gICAgICAgIDogcGFyc2VJbnQobGVhZClcbiAgICBsZXQgdnMgPSBzdHIubWF0Y2goLyhbYS16QS1aXSkoXFxeXFxkKyk/L2cpXG4gICAgaWYgKCF2cykgdnMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHYgPSB2c1tpXS5zcGxpdCgnXicpXG4gICAgICB2WzFdID0gdlsxXSA/IHBhcnNlSW50KHZbMV0pIDogMVxuICAgICAgdnNbaV0gPSB2XG4gICAgfVxuICAgIHZzID0gdnMuZmlsdGVyKHYgPT4gdlsxXSAhPT0gMClcbiAgICB0aGlzLmMgPSBjXG4gICAgdGhpcy52cyA9IG5ldyBNYXAodnMpXG4gIH1cblxuICBzdGF0aWMgdmFyICh2KSB7XG4gICAgLy8gZmFjdG9yeSBmb3IgYSBzaW5nbGUgdmFyaWFibGUgbW9ub21pYWxcbiAgICBjb25zdCBjID0gMVxuICAgIGNvbnN0IHZzID0gbmV3IE1hcChbW3YsIDFdXSlcbiAgICByZXR1cm4gbmV3IE1vbm9taWFsKGMsIHZzKVxuICB9XG59XG4iLCJpbXBvcnQgTW9ub21pYWwgZnJvbSAnTW9ub21pYWwnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBvbHlub21pYWwge1xuICBjb25zdHJ1Y3RvciAodGVybXMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0ZXJtcykgJiYgKHRlcm1zWzBdIGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0ZXJtcy5tYXAodCA9PiB0LmNsb25lKCkpXG4gICAgICB0aGlzLnRlcm1zID0gdGVybXNcbiAgICB9IGVsc2UgaWYgKCFpc05hTih0ZXJtcykpIHtcbiAgICAgIHRoaXMuaW5pdE51bSh0ZXJtcylcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0ZXJtcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuaW5pdFN0cih0ZXJtcylcbiAgICB9XG4gIH1cblxuICBpbml0U3RyIChzdHIpIHtcbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvXFwrLS9nLCAnLScpIC8vIGEgaG9ycmlibGUgYm9kZ2VcbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvLS9nLCAnKy0nKSAvLyBtYWtlIG5lZ2F0aXZlIHRlcm1zIGV4cGxpY2l0LlxuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9cXHMvZywgJycpIC8vIHN0cmlwIHdoaXRlc3BhY2VcbiAgICB0aGlzLnRlcm1zID0gc3RyLnNwbGl0KCcrJylcbiAgICAgIC5tYXAocyA9PiBuZXcgTW9ub21pYWwocykpXG4gICAgICAuZmlsdGVyKHQgPT4gdC5jICE9PSAwKVxuICB9XG5cbiAgaW5pdE51bSAobikge1xuICAgIHRoaXMudGVybXMgPSBbbmV3IE1vbm9taWFsKG4pXVxuICB9XG5cbiAgdG9MYXRleCAoKSB7XG4gICAgbGV0IHN0ciA9ICcnXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRlcm1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoaSA+IDAgJiYgdGhpcy50ZXJtc1tpXS5jID49IDApIHtcbiAgICAgICAgc3RyICs9ICcrJ1xuICAgICAgfVxuICAgICAgc3RyICs9IHRoaXMudGVybXNbaV0udG9MYXRleCgpXG4gICAgfVxuICAgIHJldHVybiBzdHJcbiAgfVxuXG4gIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gdGhpcy50b0xhVGVYKClcbiAgfVxuXG4gIGNsb25lICgpIHtcbiAgICBjb25zdCB0ZXJtcyA9IHRoaXMudGVybXMubWFwKHQgPT4gdC5jbG9uZSgpKVxuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbCh0ZXJtcylcbiAgfVxuXG4gIHNpbXBsaWZ5ICgpIHtcbiAgICAvLyBjb2xsZWN0cyBsaWtlIHRlcm1zIGFuZCByZW1vdmVzIHplcm8gdGVybXNcbiAgICAvLyBkb2VzIG5vdCBtb2RpZnkgb3JpZ2luYWxcbiAgICAvLyBUaGlzIHNlZW1zIHByb2JhYmx5IGluZWZmaWNpZW50LCBnaXZlbiB0aGUgZGF0YSBzdHJ1Y3R1cmVcbiAgICAvLyBXb3VsZCBiZSBiZXR0ZXIgdG8gdXNlIHNvbWV0aGluZyBsaWtlIGEgbGlua2VkIGxpc3QgbWF5YmU/XG4gICAgY29uc3QgdGVybXMgPSB0aGlzLnRlcm1zLnNsaWNlKClcbiAgICBsZXQgbmV3dGVybXMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGVybXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghdGVybXNbaV0pIGNvbnRpbnVlXG4gICAgICBsZXQgbmV3dGVybSA9IHRlcm1zW2ldXG4gICAgICBmb3IgKGxldCBqID0gaSArIDE7IGogPCB0ZXJtcy5sZW5ndGg7IGorKykge1xuICAgICAgICBpZiAoIXRlcm1zW2pdKSBjb250aW51ZVxuICAgICAgICBpZiAodGVybXNbal0ubGlrZSh0ZXJtc1tpXSkpIHtcbiAgICAgICAgICBuZXd0ZXJtID0gbmV3dGVybS5hZGQodGVybXNbal0pXG4gICAgICAgICAgdGVybXNbal0gPSBudWxsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG5ld3Rlcm1zLnB1c2gobmV3dGVybSlcbiAgICAgIHRlcm1zW2ldID0gbnVsbFxuICAgIH1cbiAgICBuZXd0ZXJtcyA9IG5ld3Rlcm1zLmZpbHRlcih0ID0+IHQuYyAhPT0gMClcbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwobmV3dGVybXMpXG4gIH1cblxuICBhZGQgKHRoYXQsIHNpbXBsaWZ5KSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIFBvbHlub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IFBvbHlub21pYWwodGhhdClcbiAgICB9XG4gICAgaWYgKHNpbXBsaWZ5ID09PSB1bmRlZmluZWQpIHNpbXBsaWZ5ID0gdHJ1ZVxuICAgIGNvbnN0IHRlcm1zID0gdGhpcy50ZXJtcy5jb25jYXQodGhhdC50ZXJtcylcbiAgICBsZXQgcmVzdWx0ID0gbmV3IFBvbHlub21pYWwodGVybXMpXG5cbiAgICBpZiAoc2ltcGxpZnkpIHJlc3VsdCA9IHJlc3VsdC5zaW1wbGlmeSgpXG5cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICBtdWwgKHRoYXQsIHNpbXBsaWZ5KSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIFBvbHlub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IFBvbHlub21pYWwodGhhdClcbiAgICB9XG4gICAgY29uc3QgdGVybXMgPSBbXVxuICAgIGlmIChzaW1wbGlmeSA9PT0gdW5kZWZpbmVkKSBzaW1wbGlmeSA9IHRydWVcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGVybXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhhdC50ZXJtcy5sZW5ndGg7IGorKykge1xuICAgICAgICB0ZXJtcy5wdXNoKHRoaXMudGVybXNbaV0ubXVsKHRoYXQudGVybXNbal0pKVxuICAgICAgfVxuICAgIH1cblxuICAgIGxldCByZXN1bHQgPSBuZXcgUG9seW5vbWlhbCh0ZXJtcylcbiAgICBpZiAoc2ltcGxpZnkpIHJlc3VsdCA9IHJlc3VsdC5zaW1wbGlmeSgpXG5cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICBwb3cgKG4sIHNpbXBsaWZ5KSB7XG4gICAgbGV0IHJlc3VsdCA9IHRoaXNcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IG47IGkrKykge1xuICAgICAgcmVzdWx0ID0gcmVzdWx0Lm11bCh0aGlzKVxuICAgIH1cbiAgICBpZiAoc2ltcGxpZnkpIHJlc3VsdCA9IHJlc3VsdC5zaW1wbGlmeSgpXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG5cbiAgc3RhdGljIHZhciAodikge1xuICAgIC8vIGZhY3RvcnkgZm9yIGEgc2luZ2xlIHZhcmlhYmxlIHBvbHlub21pYWxcbiAgICBjb25zdCB0ZXJtcyA9IFtNb25vbWlhbC52YXIodildXG4gICAgcmV0dXJuIG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuICB9XG5cbiAgc3RhdGljIHggKCkge1xuICAgIHJldHVybiBQb2x5bm9taWFsLnZhcigneCcpXG4gIH1cblxuICBzdGF0aWMgY29uc3QgKG4pIHtcbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwobilcbiAgfVxufVxuIiwiaW1wb3J0IHsgR3JhcGhpY1EsIEdyYXBoaWNRVmlldyB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IEZyYWN0aW9uIGZyb20gJ3ZlbmRvci9mcmFjdGlvbidcbmltcG9ydCBQb2x5bm9taWFsIGZyb20gJ1BvbHlub21pYWwnXG5pbXBvcnQgeyByYW5kRWxlbSwgcmFuZEJldHdlZW4sIHJhbmRCZXR3ZWVuRmlsdGVyLCBnY2QgfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFyaXRobWFnb25RIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpIC8vIHByb2Nlc3NlcyBvcHRpb25zIGludG8gdGhpcy5zZXR0aW5nc1xuICAgIHRoaXMuZGF0YSA9IG5ldyBBcml0aG1hZ29uUURhdGEodGhpcy5zZXR0aW5ncylcbiAgICB0aGlzLnZpZXcgPSBuZXcgQXJpdGhtYWdvblFWaWV3KHRoaXMuZGF0YSwgdGhpcy5zZXR0aW5ncylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgeyByZXR1cm4gJ0NvbXBsZXRlIHRoZSBhcml0aG1hZ29uOicgfVxufVxuXG5Bcml0aG1hZ29uUS5vcHRpb25zU3BlYyA9IFtcbiAge1xuICAgIHRpdGxlOiAnVmVydGljZXMnLFxuICAgIGlkOiAnbicsXG4gICAgdHlwZTogJ2ludCcsXG4gICAgbWluOiAzLFxuICAgIG1heDogMjAsXG4gICAgZGVmYXVsdDogM1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdUeXBlJyxcbiAgICBpZDogJ3R5cGUnLFxuICAgIHR5cGU6ICdzZWxlY3QtZXhjbHVzaXZlJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICB7IHRpdGxlOiAnSW50ZWdlciAoKyknLCBpZDogJ2ludGVnZXItYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0ludGVnZXIgKFxcdTAwZDcpJywgaWQ6ICdpbnRlZ2VyLW11bHRpcGx5JyB9LFxuICAgICAgeyB0aXRsZTogJ0ZyYWN0aW9uICgrKScsIGlkOiAnZnJhY3Rpb24tYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0ZyYWN0aW9uIChcXHUwMGQ3KScsIGlkOiAnZnJhY3Rpb24tbXVsdGlwbHknIH0sXG4gICAgICB7IHRpdGxlOiAnQWxnZWJyYSAoKyknLCBpZDogJ2FsZ2VicmEtYWRkJyB9LFxuICAgICAgeyB0aXRsZTogJ0FsZ2VicmEgKFxcdTAwZDcpJywgaWQ6ICdhbGdlYnJhLW11bHRpcGx5JyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiAnaW50ZWdlci1hZGQnLFxuICAgIHZlcnRpY2FsOiB0cnVlXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1B1enpsZSB0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgaWQ6ICdwdXpfZGlmZicsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ01pc3NpbmcgZWRnZXMnLCBpZDogJzEnIH0sXG4gICAgICB7IHRpdGxlOiAnTWl4ZWQnLCBpZDogJzInIH0sXG4gICAgICB7IHRpdGxlOiAnTWlzc2luZyB2ZXJ0aWNlcycsIGlkOiAnMycgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogJzEnXG4gIH1cbl1cblxuY2xhc3MgQXJpdGhtYWdvblFEYXRhIC8qIGV4dGVuZHMgR3JhcGhpY1FEYXRhICovIHtcbiAgLy8gVE9ETyBzaW1wbGlmeSBjb25zdHJ1Y3Rvci4gTW92ZSBsb2dpYyBpbnRvIHN0YXRpYyBmYWN0b3J5IG1ldGhvZHNcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICAvLyAxLiBTZXQgcHJvcGVydGllcyBmcm9tIG9wdGlvbnNcbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIG46IDMsIC8vIG51bWJlciBvZiB2ZXJ0aWNlc1xuICAgICAgbWluOiAtMjAsXG4gICAgICBtYXg6IDIwLFxuICAgICAgbnVtX2RpZmY6IDEsIC8vIGNvbXBsZXhpdHkgb2Ygd2hhdCdzIGluIHZlcnRpY2VzL2VkZ2VzXG4gICAgICBwdXpfZGlmZjogMSwgLy8gMSAtIFZlcnRpY2VzIGdpdmVuLCAyIC0gdmVydGljZXMvZWRnZXM7IGdpdmVuIDMgLSBvbmx5IGVkZ2VzXG4gICAgICB0eXBlOiAnaW50ZWdlci1hZGQnIC8vIFt0eXBlXS1bb3BlcmF0aW9uXSB3aGVyZSBbdHlwZV0gPSBpbnRlZ2VyLCAuLi5cbiAgICAgIC8vIGFuZCBbb3BlcmF0aW9uXSA9IGFkZC9tdWx0aXBseVxuICAgIH1cblxuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgdGhpcy5zZXR0aW5ncywgb3B0aW9ucylcbiAgICB0aGlzLnNldHRpbmdzLm51bV9kaWZmID0gdGhpcy5zZXR0aW5ncy5kaWZmaWN1bHR5XG4gICAgdGhpcy5zZXR0aW5ncy5wdXpfZGlmZiA9IHBhcnNlSW50KHRoaXMuc2V0dGluZ3MucHV6X2RpZmYpIC8vISA/IFRoaXMgc2hvdWxkIGhhdmUgYmVlbiBkb25lIHVwc3RyZWFtLi4uXG5cbiAgICB0aGlzLm4gPSB0aGlzLnNldHRpbmdzLm5cbiAgICB0aGlzLnZlcnRpY2VzID0gW11cbiAgICB0aGlzLnNpZGVzID0gW11cblxuICAgIGlmICh0aGlzLnNldHRpbmdzLnR5cGUuZW5kc1dpdGgoJ2FkZCcpKSB7XG4gICAgICB0aGlzLm9wbmFtZSA9ICcrJ1xuICAgICAgdGhpcy5vcCA9ICh4LCB5KSA9PiB4LmFkZCh5KVxuICAgIH0gZWxzZSBpZiAodGhpcy5zZXR0aW5ncy50eXBlLmVuZHNXaXRoKCdtdWx0aXBseScpKSB7XG4gICAgICB0aGlzLm9wbmFtZSA9ICdcXHUwMGQ3J1xuICAgICAgdGhpcy5vcCA9ICh4LCB5KSA9PiB4Lm11bCh5KVxuICAgIH1cblxuICAgIC8vIDIuIEluaXRpYWxpc2UgYmFzZWQgb24gdHlwZVxuICAgIHN3aXRjaCAodGhpcy5zZXR0aW5ncy50eXBlKSB7XG4gICAgICBjYXNlICdpbnRlZ2VyLWFkZCc6XG4gICAgICBjYXNlICdpbnRlZ2VyLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0SW50ZWdlcih0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnZnJhY3Rpb24tYWRkJzpcbiAgICAgICAgdGhpcy5pbml0RnJhY3Rpb25BZGQodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2ZyYWN0aW9uLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0RnJhY3Rpb25NdWx0aXBseSh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnYWxnZWJyYS1hZGQnOlxuICAgICAgICB0aGlzLmluaXRBbGdlYnJhQWRkKHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdhbGdlYnJhLW11bHRpcGx5JzpcbiAgICAgICAgdGhpcy5pbml0QWxnZWJyYU11bHRpcGx5KHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgc3dpdGNoIGRlZmF1bHQnKVxuICAgIH1cblxuICAgIHRoaXMuY2FsY3VsYXRlRWRnZXMoKSAvLyBVc2Ugb3AgZnVuY3Rpb25zIHRvIGZpbGwgaW4gdGhlIGVkZ2VzXG4gICAgdGhpcy5oaWRlTGFiZWxzKHRoaXMuc2V0dGluZ3MucHV6X2RpZmYpIC8vIHNldCBzb21lIHZlcnRpY2VzL2VkZ2VzIGFzIGhpZGRlbiBkZXBlbmRpbmcgb24gZGlmZmljdWx0eVxuICB9XG5cbiAgLyogTWV0aG9kcyBpbml0aWFsaXNpbmcgdmVydGljZXMgKi9cblxuICBpbml0SW50ZWdlciAoc2V0dGluZ3MpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihyYW5kQmV0d2VlbkZpbHRlcihcbiAgICAgICAgICBzZXR0aW5ncy5taW4sXG4gICAgICAgICAgc2V0dGluZ3MubWF4LFxuICAgICAgICAgIHggPT4gKHNldHRpbmdzLnR5cGUuZW5kc1dpdGgoJ2FkZCcpIHx8IHggIT09IDApXG4gICAgICAgICkpLFxuICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEZyYWN0aW9uQWRkIChzZXR0aW5ncykge1xuICAgIC8qIERpZmZpY3VsdHkgc2V0dGluZ3M6XG4gICAgICogMTogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIHNhbWUgZGVub21pbmF0b3IsIG5vIGNhbmNlbGxpbmcgYWZ0ZXIgRE9ORVxuICAgICAqIDI6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBzYW1lIGRlbm9taW5hdG9yLCBubyBjYW5jZWxsbGluZyBhbnN3ZXIgaW1wcm9wZXIgZnJhY3Rpb25cbiAgICAgKiAzOiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggb25lIGRlbm9taW5hdG9yIGEgbXVsdGlwbGUgb2YgYW5vdGhlciwgZ2l2ZXMgcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNDogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIG9uZSBkZW5vbWluYXRvciBhIG11bHRpcGxlIG9mIGFub3RoZXIsIGdpdmVzIGltcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNTogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIGRpZmZlcmVudCBkZW5vbWluYXRvcnMgKG5vdCBjby1wcmltZSksIGdpdmVzIGltcHJvcGVyIGZyYWN0aW9uXG4gICAgICogNjogbWl4ZWQgbnVtYmVyc1xuICAgICAqIDc6IG1peGVkIG51bWJlcnMsIGJpZ2dlciBudW1lcmF0b3JzIGFuZCBkZW5vbWluYXRvcnNcbiAgICAgKiA4OiBtaXhlZCBudW1iZXJzLCBiaWcgaW50ZWdlciBwYXJ0c1xuICAgICAqL1xuXG4gICAgLy8gVE9ETyAtIGFueXRoaW5nIG90aGVyIHRoYW4gZGlmZmljdWx0eSAxLlxuICAgIGNvbnN0IGRpZmYgPSBzZXR0aW5ncy5udW1fZGlmZlxuICAgIGlmIChkaWZmIDwgMykge1xuICAgICAgY29uc3QgZGVuID0gcmFuZEVsZW0oWzUsIDcsIDksIDExLCAxMywgMTddKVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICBjb25zdCBwcmV2bnVtID0gdGhpcy52ZXJ0aWNlc1tpIC0gMV1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbaSAtIDFdLnZhbC5uIDogdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IG5leHRudW0gPSB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dLnZhbC5uIDogdW5kZWZpbmVkXG5cbiAgICAgICAgY29uc3QgbWF4bnVtID1cbiAgICAgICAgICBkaWZmID09PSAyID8gZGVuIC0gMVxuICAgICAgICAgICAgOiBuZXh0bnVtID8gZGVuIC0gTWF0aC5tYXgobmV4dG51bSwgcHJldm51bSlcbiAgICAgICAgICAgICAgOiBwcmV2bnVtID8gZGVuIC0gcHJldm51bVxuICAgICAgICAgICAgICAgIDogZGVuIC0gMVxuXG4gICAgICAgIGNvbnN0IG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKDEsIG1heG51bSwgeCA9PiAoXG4gICAgICAgICAgLy8gRW5zdXJlcyBubyBzaW1wbGlmaW5nIGFmdGVyd2FyZHMgaWYgZGlmZmljdWx0eSBpcyAxXG4gICAgICAgICAgZ2NkKHgsIGRlbikgPT09IDEgJiZcbiAgICAgICAgICAoIXByZXZudW0gfHwgZ2NkKHggKyBwcmV2bnVtLCBkZW4pID09PSAxIHx8IHggKyBwcmV2bnVtID09PSBkZW4pICYmXG4gICAgICAgICAgKCFuZXh0bnVtIHx8IGdjZCh4ICsgbmV4dG51bSwgZGVuKSA9PT0gMSB8fCB4ICsgbmV4dG51bSA9PT0gZGVuKVxuICAgICAgICApKVxuXG4gICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24obnVtLCBkZW4pLFxuICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBkZW5iYXNlID0gcmFuZEVsZW0oXG4gICAgICAgIGRpZmYgPCA3ID8gWzIsIDMsIDVdIDogWzIsIDMsIDQsIDUsIDYsIDcsIDgsIDksIDEwLCAxMV1cbiAgICAgIClcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgY29uc3QgcHJldiA9IHRoaXMudmVydGljZXNbaSAtIDFdXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzW2kgLSAxXS52YWwgOiB1bmRlZmluZWRcbiAgICAgICAgY29uc3QgbmV4dCA9IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl0udmFsIDogdW5kZWZpbmVkXG5cbiAgICAgICAgY29uc3QgbWF4bXVsdGlwbGllciA9IGRpZmYgPCA3ID8gNCA6IDhcblxuICAgICAgICBjb25zdCBtdWx0aXBsaWVyID1cbiAgICAgICAgICBpICUgMiA9PT0gMSB8fCBkaWZmID4gNCA/IHJhbmRCZXR3ZWVuRmlsdGVyKDIsIG1heG11bHRpcGxpZXIsIHggPT5cbiAgICAgICAgICAgICghcHJldiB8fCB4ICE9PSBwcmV2LmQgLyBkZW5iYXNlKSAmJlxuICAgICAgICAgICAgKCFuZXh0IHx8IHggIT09IG5leHQuZCAvIGRlbmJhc2UpXG4gICAgICAgICAgKSA6IDFcblxuICAgICAgICBjb25zdCBkZW4gPSBkZW5iYXNlICogbXVsdGlwbGllclxuXG4gICAgICAgIGxldCBudW1cbiAgICAgICAgaWYgKGRpZmYgPCA2KSB7XG4gICAgICAgICAgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoMSwgZGVuIC0gMSwgeCA9PiAoXG4gICAgICAgICAgICBnY2QoeCwgZGVuKSA9PT0gMSAmJlxuICAgICAgICAgICAgKGRpZmYgPj0gNCB8fCAhcHJldiB8fCBwcmV2LmFkZCh4LCBkZW4pIDw9IDEpICYmXG4gICAgICAgICAgICAoZGlmZiA+PSA0IHx8ICFuZXh0IHx8IG5leHQuYWRkKHgsIGRlbikgPD0gMSlcbiAgICAgICAgICApKVxuICAgICAgICB9IGVsc2UgaWYgKGRpZmYgPCA4KSB7XG4gICAgICAgICAgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoZGVuICsgMSwgZGVuICogNiwgeCA9PiBnY2QoeCwgZGVuKSA9PT0gMSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBudW0gPSByYW5kQmV0d2VlbkZpbHRlcihkZW4gKiAxMCwgZGVuICogMTAwLCB4ID0+IGdjZCh4LCBkZW4pID09PSAxKVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihudW0sIGRlbiksXG4gICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEZyYWN0aW9uTXVsdGlwbHkgKHNldHRpbmdzKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgY29uc3QgZCA9IHJhbmRCZXR3ZWVuKDIsIDEwKVxuICAgICAgY29uc3QgbiA9IHJhbmRCZXR3ZWVuKDEsIGQgLSAxKVxuICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24obiwgZCksXG4gICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0QWxnZWJyYUFkZCAoc2V0dGluZ3MpIHtcbiAgICBjb25zdCBkaWZmID0gc2V0dGluZ3MubnVtX2RpZmZcbiAgICBzd2l0Y2ggKGRpZmYpIHtcbiAgICAgIGNhc2UgMToge1xuICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2YXJpYWJsZSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDI6XG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGlmIChNYXRoLnJhbmRvbSgpIDwgMC41KSB7IC8vIHZhcmlhYmxlICsgY29uc3RhbnRcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgY29uc3RhbnQgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbChjb2VmZiArIHZhcmlhYmxlICsgJysnICsgY29uc3RhbnQpLFxuICAgICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IHZhcmlhYmxlMSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgICAgbGV0IHZhcmlhYmxlMiA9IHZhcmlhYmxlMVxuICAgICAgICAgIHdoaWxlICh2YXJpYWJsZTIgPT09IHZhcmlhYmxlMSkge1xuICAgICAgICAgICAgdmFyaWFibGUyID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBjb2VmZjEgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgY29lZmYyID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYxICsgdmFyaWFibGUxICsgJysnICsgY29lZmYyICsgdmFyaWFibGUyKSxcbiAgICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRBbGdlYnJhTXVsdGlwbHkgKHNldHRpbmdzKSB7XG4gICAgLyogRGlmZmljdWx0eTpcbiAgICAgKiAxOiBBbHRlcm5hdGUgM2Egd2l0aCA0XG4gICAgICogMjogQWxsIHRlcm1zIG9mIHRoZSBmb3JtIG52IC0gdXAgdG8gdHdvIHZhcmlhYmxlc1xuICAgICAqIDM6IEFsbCB0ZXJtcyBvZiB0aGUgZm9ybSBudl5tLiBPbmUgdmFyaWFibGUgb25seVxuICAgICAqIDQ6IEFMbCB0ZXJtcyBvZiB0aGUgZm9ybSBueF5rIHlebCB6XnAuIGssbCxwIDAtM1xuICAgICAqIDU6IEV4cGFuZCBicmFja2V0cyAzKDJ4KzUpXG4gICAgICogNjogRXhwYW5kIGJyYWNrZXRzIDN4KDJ4KzUpXG4gICAgICogNzogRXhwYW5kIGJyYWNrZXRzIDN4XjJ5KDJ4eSs1eV4yKVxuICAgICAqIDg6IEV4cGFuZCBicmFja2V0cyAoeCszKSh4KzIpXG4gICAgICogOTogRXhwYW5kIGJyYWNrZXRzICgyeC0zKSgzeCs0KVxuICAgICAqIDEwOiBFeHBhbmQgYnJhY2tldHMgKDJ4XjItM3grNCkoMngtNSlcbiAgICAgKi9cbiAgICBjb25zdCBkaWZmID0gc2V0dGluZ3MubnVtX2RpZmZcbiAgICBzd2l0Y2ggKGRpZmYpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgIHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IHRlcm0gPSBpICUgMiA9PT0gMCA/IGNvZWZmIDogY29lZmYgKyB2YXJpYWJsZVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDI6IHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUxID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgY29uc3QgdmFyaWFibGUyID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZSA9IHJhbmRFbGVtKFt2YXJpYWJsZTEsIHZhcmlhYmxlMl0pXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2YXJpYWJsZSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgMzoge1xuICAgICAgICBjb25zdCB2ID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBpZHggPSByYW5kQmV0d2VlbigxLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2ICsgJ14nICsgaWR4KSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSA0OiB7XG4gICAgICAgIGNvbnN0IHN0YXJ0QXNjaWkgPSByYW5kQmV0d2Vlbig5NywgMTIwKVxuICAgICAgICBjb25zdCB2MSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSlcbiAgICAgICAgY29uc3QgdjIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkgKyAxKVxuICAgICAgICBjb25zdCB2MyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSArIDIpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBhID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMSA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMiA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMyA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCB0ZXJtID0gYSArIHYxICsgbjEgKyB2MiArIG4yICsgdjMgKyBuM1xuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDU6XG4gICAgICBjYXNlIDY6IHsgLy8gZS5nLiAzKHgpICogKDJ4LTUpXG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBjb25zdGFudCA9IHJhbmRCZXR3ZWVuKC05LCA5KS50b1N0cmluZygpXG4gICAgICAgICAgbGV0IHRlcm0gPSBjb2VmZlxuICAgICAgICAgIGlmIChkaWZmID09PSA2IHx8IGkgJSAyID09PSAxKSB0ZXJtICs9IHZhcmlhYmxlXG4gICAgICAgICAgaWYgKGkgJSAyID09PSAxKSB0ZXJtICs9ICcrJyArIGNvbnN0YW50XG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgNzogeyAvLyBlLmcuIDN4XjJ5KDR4eV4yKzV4eSlcbiAgICAgICAgY29uc3Qgc3RhcnRBc2NpaSA9IHJhbmRCZXR3ZWVuKDk3LCAxMjApXG4gICAgICAgIGNvbnN0IHYxID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpKVxuICAgICAgICBjb25zdCB2MiA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSArIDEpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBhMSA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjExID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4xMiA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBsZXQgdGVybSA9IGExICsgdjEgKyBuMTEgKyB2MiArIG4xMlxuICAgICAgICAgIGlmIChpICUgMiA9PT0gMSkge1xuICAgICAgICAgICAgY29uc3QgYTIgPSByYW5kQmV0d2VlbigtOSwgOSkudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgbjIxID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgICAgY29uc3QgbjIyID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgICAgdGVybSArPSAnKycgKyBhMiArIHYxICsgbjIxICsgdjIgKyBuMjJcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgODogLy8geyBlLmcuICh4KzUpICogKHgtMilcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29uc3RhbnQgPSByYW5kQmV0d2VlbigtOSwgOSkudG9TdHJpbmcoKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHZhcmlhYmxlICsgJysnICsgY29uc3RhbnQpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qIE1ldGhvZCB0byBjYWxjdWxhdGUgZWRnZXMgZnJvbSB2ZXJ0aWNlcyAqL1xuICBjYWxjdWxhdGVFZGdlcyAoKSB7XG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBlZGdlcyBnaXZlbiB0aGUgdmVydGljZXMgdXNpbmcgdGhpcy5vcFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIHRoaXMuc2lkZXNbaV0gPSB7XG4gICAgICAgIHZhbDogdGhpcy5vcCh0aGlzLnZlcnRpY2VzW2ldLnZhbCwgdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXS52YWwpLFxuICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyogTWFyayBoaWRkZW5kIGVkZ2VzL3ZlcnRpY2VzICovXG5cbiAgaGlkZUxhYmVscyAocHV6emxlRGlmZmljdWx0eSkge1xuICAgIC8vIEhpZGUgc29tZSBsYWJlbHMgdG8gbWFrZSBhIHB1enpsZVxuICAgIC8vIDEgLSBTaWRlcyBoaWRkZW4sIHZlcnRpY2VzIHNob3duXG4gICAgLy8gMiAtIFNvbWUgc2lkZXMgaGlkZGVuLCBzb21lIHZlcnRpY2VzIGhpZGRlblxuICAgIC8vIDMgLSBBbGwgdmVydGljZXMgaGlkZGVuXG4gICAgc3dpdGNoIChwdXp6bGVEaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHRoaXMuc2lkZXMuZm9yRWFjaCh4ID0+IHsgeC5oaWRkZW4gPSB0cnVlIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDI6IHtcbiAgICAgICAgdGhpcy5zaWRlcy5mb3JFYWNoKHggPT4geyB4LmhpZGRlbiA9IHRydWUgfSlcbiAgICAgICAgY29uc3Qgc2hvd3NpZGUgPSByYW5kQmV0d2VlbigwLCB0aGlzLm4gLSAxLCBNYXRoLnJhbmRvbSlcbiAgICAgICAgY29uc3QgaGlkZXZlcnQgPSBNYXRoLnJhbmRvbSgpIDwgMC41XG4gICAgICAgICAgPyBzaG93c2lkZSAvLyBwcmV2aW91cyB2ZXJ0ZXhcbiAgICAgICAgICA6IChzaG93c2lkZSArIDEpICUgdGhpcy5uIC8vIG5leHQgdmVydGV4O1xuXG4gICAgICAgIHRoaXMuc2lkZXNbc2hvd3NpZGVdLmhpZGRlbiA9IGZhbHNlXG4gICAgICAgIHRoaXMudmVydGljZXNbaGlkZXZlcnRdLmhpZGRlbiA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgMzpcbiAgICAgICAgdGhpcy52ZXJ0aWNlcy5mb3JFYWNoKHggPT4geyB4LmhpZGRlbiA9IHRydWUgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm9fZGlmZmljdWx0eScpXG4gICAgfVxuICB9XG59XG5cbmNsYXNzIEFyaXRobWFnb25RVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIGNvbnN0cnVjdG9yIChkYXRhLCBvcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc2V0cyB0aGlzLndpZHRoIHRoaXMuaGVpZ2h0LCBpbml0aWFsaXNlcyB0aGlzLmxhYmVscywgY3JlYXRlcyBkb20gZWxlbWVudHNcblxuICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aFxuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuaGVpZ2h0XG4gICAgY29uc3QgciA9IDAuMzUgKiBNYXRoLm1pbih3aWR0aCwgaGVpZ2h0KSAvLyByYWRpdXNcbiAgICBjb25zdCBuID0gdGhpcy5kYXRhLm5cblxuICAgIC8vIEEgcG9pbnQgdG8gbGFiZWwgd2l0aCB0aGUgb3BlcmF0aW9uXG4gICAgLy8gQWxsIHBvaW50cyBmaXJzdCBzZXQgdXAgd2l0aCAoMCwwKSBhdCBjZW50ZXJcbiAgICB0aGlzLm9wZXJhdGlvblBvaW50ID0gbmV3IFBvaW50KDAsIDApXG5cbiAgICAvLyBQb3NpdGlvbiBvZiB2ZXJ0aWNlc1xuICAgIHRoaXMudmVydGV4UG9pbnRzID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgY29uc3QgYW5nbGUgPSBpICogTWF0aC5QSSAqIDIgLyBuIC0gTWF0aC5QSSAvIDJcbiAgICAgIHRoaXMudmVydGV4UG9pbnRzW2ldID0gUG9pbnQuZnJvbVBvbGFyKHIsIGFuZ2xlKVxuICAgIH1cblxuICAgIC8vIFBvaXNpdGlvbiBvZiBzaWRlIGxhYmVsc1xuICAgIHRoaXMuc2lkZVBvaW50cyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIHRoaXMuc2lkZVBvaW50c1tpXSA9IFBvaW50Lm1lYW4odGhpcy52ZXJ0ZXhQb2ludHNbaV0sIHRoaXMudmVydGV4UG9pbnRzWyhpICsgMSkgJSBuXSlcbiAgICB9XG5cbiAgICB0aGlzLmFsbFBvaW50cyA9IFt0aGlzLm9wZXJhdGlvblBvaW50XS5jb25jYXQodGhpcy52ZXJ0ZXhQb2ludHMpLmNvbmNhdCh0aGlzLnNpZGVQb2ludHMpXG5cbiAgICB0aGlzLnJlQ2VudGVyKCkgLy8gUmVwb3NpdGlvbiBldmVyeXRoaW5nIHByb3Blcmx5XG5cbiAgICB0aGlzLm1ha2VMYWJlbHModHJ1ZSlcblxuICAgIC8vIERyYXcgaW50byBjYW52YXNcbiAgfVxuXG4gIHJlQ2VudGVyICgpIHtcbiAgICAvLyBGaW5kIHRoZSBjZW50ZXIgb2YgdGhlIGJvdW5kaW5nIGJveFxuICAgIGNvbnN0IHRvcGxlZnQgPSBQb2ludC5taW4odGhpcy5hbGxQb2ludHMpXG4gICAgY29uc3QgYm90dG9tcmlnaHQgPSBQb2ludC5tYXgodGhpcy5hbGxQb2ludHMpXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbih0b3BsZWZ0LCBib3R0b21yaWdodClcblxuICAgIC8vIHRyYW5zbGF0ZSB0byBwdXQgaW4gdGhlIGNlbnRlclxuICAgIHRoaXMuYWxsUG9pbnRzLmZvckVhY2gocCA9PiB7XG4gICAgICBwLnRyYW5zbGF0ZSh0aGlzLndpZHRoIC8gMiAtIGNlbnRlci54LCB0aGlzLmhlaWdodCAvIDIgLSBjZW50ZXIueSlcbiAgICB9KVxuICB9XG5cbiAgbWFrZUxhYmVscyAoKSB7XG4gICAgLy8gdmVydGljZXNcbiAgICB0aGlzLmRhdGEudmVydGljZXMuZm9yRWFjaCgodiwgaSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSB2LnZhbC50b0xhdGV4XG4gICAgICAgID8gdi52YWwudG9MYXRleCh0cnVlKVxuICAgICAgICA6IHYudmFsLnRvU3RyaW5nKClcbiAgICAgIHRoaXMubGFiZWxzLnB1c2goe1xuICAgICAgICBwb3M6IHRoaXMudmVydGV4UG9pbnRzW2ldLFxuICAgICAgICB0ZXh0cTogdi5oaWRkZW4gPyAnJyA6IHZhbHVlLFxuICAgICAgICB0ZXh0YTogdmFsdWUsXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCB2ZXJ0ZXgnLFxuICAgICAgICBzdHlsZWE6IHYuaGlkZGVuID8gJ2Fuc3dlciB2ZXJ0ZXgnIDogJ25vcm1hbCB2ZXJ0ZXgnXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBzaWRlc1xuICAgIHRoaXMuZGF0YS5zaWRlcy5mb3JFYWNoKCh2LCBpKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHYudmFsLnRvTGF0ZXhcbiAgICAgICAgPyB2LnZhbC50b0xhdGV4KHRydWUpXG4gICAgICAgIDogdi52YWwudG9TdHJpbmcoKVxuICAgICAgdGhpcy5sYWJlbHMucHVzaCh7XG4gICAgICAgIHBvczogdGhpcy5zaWRlUG9pbnRzW2ldLFxuICAgICAgICB0ZXh0cTogdi5oaWRkZW4gPyAnJyA6IHZhbHVlLFxuICAgICAgICB0ZXh0YTogdmFsdWUsXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCBzaWRlJyxcbiAgICAgICAgc3R5bGVhOiB2LmhpZGRlbiA/ICdhbnN3ZXIgc2lkZScgOiAnbm9ybWFsIHNpZGUnXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBvcGVyYXRpb25cbiAgICB0aGlzLmxhYmVscy5wdXNoKHtcbiAgICAgIHBvczogdGhpcy5vcGVyYXRpb25Qb2ludCxcbiAgICAgIHRleHRxOiB0aGlzLmRhdGEub3BuYW1lLFxuICAgICAgdGV4dGE6IHRoaXMuZGF0YS5vcG5hbWUsXG4gICAgICBzdHlsZXE6ICdub3JtYWwnLFxuICAgICAgc3R5bGVhOiAnbm9ybWFsJ1xuICAgIH0pXG5cbiAgICAvLyBzdHlsaW5nXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gIH1cblxuICByZW5kZXIgKCkge1xuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICBjb25zdCBuID0gdGhpcy5kYXRhLm5cblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBjb25zdCBwID0gdGhpcy52ZXJ0ZXhQb2ludHNbaV1cbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnZlcnRleFBvaW50c1soaSArIDEpICUgbl1cbiAgICAgIGN0eC5tb3ZlVG8ocC54LCBwLnkpXG4gICAgICBjdHgubGluZVRvKG5leHQueCwgbmV4dC55KVxuICAgIH1cbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIC8vIHBsYWNlIGxhYmVsc1xuICAgIHRoaXMucmVuZGVyTGFiZWxzKHRydWUpXG4gIH1cblxuICBzaG93QW5zd2VyICgpIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0YVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVhXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyh0cnVlKVxuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyh0cnVlKVxuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICB9XG59XG4iLCJpbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5pbXBvcnQgeyByYW5kRWxlbSB9IGZyb20gJ1V0aWxpdGllcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGVzdFEgZXh0ZW5kcyBUZXh0USB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYScsXG4gICAgICB0ZXN0MTogWydmb28nXSxcbiAgICAgIHRlc3QyOiB0cnVlXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICB0aGlzLmxhYmVsID0gc2V0dGluZ3MubGFiZWxcblxuICAgIC8vIHBpY2sgYSByYW5kb20gb25lIG9mIHRoZSBzZWxlY3RlZFxuICAgIGxldCB0ZXN0MVxuICAgIGlmIChzZXR0aW5ncy50ZXN0MS5sZW5ndGggPT09IDApIHtcbiAgICAgIHRlc3QxID0gJ25vbmUnXG4gICAgfSBlbHNlIHtcbiAgICAgIHRlc3QxID0gcmFuZEVsZW0oc2V0dGluZ3MudGVzdDEpXG4gICAgfVxuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gJ2Q6ICcgKyBzZXR0aW5ncy5kaWZmaWN1bHR5ICsgJ1xcXFxcXFxcIHRlc3QxOiAnICsgdGVzdDFcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJ3Rlc3QyOiAnICsgc2V0dGluZ3MudGVzdDJcblxuICAgIHRoaXMucmVuZGVyKClcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgeyByZXR1cm4gJ1Rlc3QgY29tbWFuZCB3b3JkJyB9XG59XG5cblRlc3RRLm9wdGlvbnNTcGVjID0gW1xuICB7XG4gICAgdGl0bGU6ICdUZXN0IG9wdGlvbiAxJyxcbiAgICBpZDogJ3Rlc3QxJyxcbiAgICB0eXBlOiAnc2VsZWN0LWluY2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogWydmb28nLCAnYmFyJywgJ3dpenonXSxcbiAgICBkZWZhdWx0OiBbXVxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdUZXN0IG9wdGlvbiAyJyxcbiAgICBpZDogJ3Rlc3QyJyxcbiAgICB0eXBlOiAnYm9vbCcsXG4gICAgZGVmYXVsdDogdHJ1ZVxuICB9XG5dXG4iLCJpbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5pbXBvcnQgeyByYW5kQmV0d2VlbiB9IGZyb20gJ1V0aWxpdGllcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQWRkQVplcm8gZXh0ZW5kcyBUZXh0USB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYSdcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIHRoaXMubGFiZWwgPSBzZXR0aW5ncy5sYWJlbFxuXG4gICAgLy8gcmFuZG9tIDIgZGlnaXQgJ2RlY2ltYWwnXG4gICAgY29uc3QgcSA9IFN0cmluZyhyYW5kQmV0d2VlbigxLCA5KSkgKyBTdHJpbmcocmFuZEJldHdlZW4oMCwgOSkpICsgJy4nICsgU3RyaW5nKHJhbmRCZXR3ZWVuKDAsIDkpKVxuICAgIGNvbnN0IGEgPSBxICsgJzAnXG5cbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSBxICsgJ1xcXFx0aW1lcyAxMCdcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJz0gJyArIGFcblxuICAgIHRoaXMucmVuZGVyKClcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRXZhbHVhdGUnXG4gIH1cbn1cblxuQWRkQVplcm8ub3B0aW9uc1NwZWMgPSBbXG5dXG4iLCJpbXBvcnQgeyByYW5kQmV0d2VlbiB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCBGcmFjdGlvbiBmcm9tICd2ZW5kb3IvZnJhY3Rpb24nXG5cbi8qIE1haW4gcXVlc3Rpb24gY2xhc3MuIFRoaXMgd2lsbCBiZSBzcHVuIG9mZiBpbnRvIGRpZmZlcmVudCBmaWxlIGFuZCBnZW5lcmFsaXNlZCAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRXF1YXRpb25PZkxpbmUgZXh0ZW5kcyBUZXh0USB7XG4gIC8vICdleHRlbmRzJyBRdWVzdGlvbiwgYnV0IG5vdGhpbmcgdG8gYWN0dWFsbHkgZXh0ZW5kXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgLy8gYm9pbGVycGxhdGVcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiAyXG4gICAgfVxuXG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcbiAgICBjb25zdCBkaWZmaWN1bHR5ID0gTWF0aC5jZWlsKHNldHRpbmdzLmRpZmZpY3VsdHkgLyAyKSAvLyBpbml0aWFsbHkgd3JpdHRlbiBmb3IgZGlmZmljdWx0eSAxLTQsIG5vdyBuZWVkIDEtMTBcblxuICAgIC8vIHF1ZXN0aW9uIGdlbmVyYXRpb24gYmVnaW5zIGhlcmVcbiAgICBsZXQgbSwgYywgeDEsIHkxLCB4MiwgeTJcbiAgICBsZXQgbWlubSwgbWF4bSwgbWluYywgbWF4Y1xuXG4gICAgc3dpdGNoIChkaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6IC8vIG0+MCwgYz49MFxuICAgICAgY2FzZSAyOlxuICAgICAgY2FzZSAzOlxuICAgICAgICBtaW5tID0gZGlmZmljdWx0eSA8IDMgPyAxIDogLTVcbiAgICAgICAgbWF4bSA9IDVcbiAgICAgICAgbWluYyA9IGRpZmZpY3VsdHkgPCAyID8gMCA6IC0xMFxuICAgICAgICBtYXhjID0gMTBcbiAgICAgICAgbSA9IHJhbmRCZXR3ZWVuKG1pbm0sIG1heG0pXG4gICAgICAgIGMgPSByYW5kQmV0d2VlbihtaW5jLCBtYXhjKVxuICAgICAgICB4MSA9IGRpZmZpY3VsdHkgPCAzID8gcmFuZEJldHdlZW4oMCwgMTApIDogcmFuZEJldHdlZW4oLTE1LCAxNSlcbiAgICAgICAgeTEgPSBtICogeDEgKyBjXG5cbiAgICAgICAgaWYgKGRpZmZpY3VsdHkgPCAzKSB7XG4gICAgICAgICAgeDIgPSByYW5kQmV0d2Vlbih4MSArIDEsIDE1KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHgyID0geDFcbiAgICAgICAgICB3aGlsZSAoeDIgPT09IHgxKSB7IHgyID0gcmFuZEJldHdlZW4oLTE1LCAxNSkgfTtcbiAgICAgICAgfVxuICAgICAgICB5MiA9IG0gKiB4MiArIGNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNDogLy8gbSBmcmFjdGlvbiwgcG9pbnRzIGFyZSBpbnRlZ2Vyc1xuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBjb25zdCBtZCA9IHJhbmRCZXR3ZWVuKDEsIDUpXG4gICAgICAgIGNvbnN0IG1uID0gcmFuZEJldHdlZW4oLTUsIDUpXG4gICAgICAgIG0gPSBuZXcgRnJhY3Rpb24obW4sIG1kKVxuICAgICAgICB4MSA9IG5ldyBGcmFjdGlvbihyYW5kQmV0d2VlbigtMTAsIDEwKSlcbiAgICAgICAgeTEgPSBuZXcgRnJhY3Rpb24ocmFuZEJldHdlZW4oLTEwLCAxMCkpXG4gICAgICAgIGMgPSBuZXcgRnJhY3Rpb24oeTEpLnN1YihtLm11bCh4MSkpXG4gICAgICAgIHgyID0geDEuYWRkKHJhbmRCZXR3ZWVuKDEsIDUpICogbS5kKVxuICAgICAgICB5MiA9IG0ubXVsKHgyKS5hZGQoYylcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB4c3RyID1cbiAgICAgIChtID09PSAwIHx8IChtLmVxdWFscyAmJiBtLmVxdWFscygwKSkpID8gJydcbiAgICAgICAgOiAobSA9PT0gMSB8fCAobS5lcXVhbHMgJiYgbS5lcXVhbHMoMSkpKSA/ICd4J1xuICAgICAgICAgIDogKG0gPT09IC0xIHx8IChtLmVxdWFscyAmJiBtLmVxdWFscygtMSkpKSA/ICcteCdcbiAgICAgICAgICAgIDogKG0udG9MYXRleCkgPyBtLnRvTGF0ZXgoKSArICd4J1xuICAgICAgICAgICAgICA6IChtICsgJ3gnKVxuXG4gICAgY29uc3QgY29uc3RzdHIgPSAvLyBUT0RPOiBXaGVuIG09Yz0wXG4gICAgICAoYyA9PT0gMCB8fCAoYy5lcXVhbHMgJiYgYy5lcXVhbHMoMCkpKSA/ICcnXG4gICAgICAgIDogKGMgPCAwKSA/ICgnIC0gJyArIChjLm5lZyA/IGMubmVnKCkudG9MYXRleCgpIDogLWMpKVxuICAgICAgICAgIDogKGMudG9MYXRleCkgPyAoJyArICcgKyBjLnRvTGF0ZXgoKSlcbiAgICAgICAgICAgIDogKCcgKyAnICsgYylcblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICcoJyArIHgxICsgJywgJyArIHkxICsgJylcXFxcdGV4dHsgYW5kIH0oJyArIHgyICsgJywgJyArIHkyICsgJyknXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICd5ID0gJyArIHhzdHIgKyBjb25zdHN0clxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdGaW5kIHRoZSBlcXVhdGlvbiBvZiB0aGUgbGluZSB0aHJvdWdoJ1xuICB9XG59XG4iLCIvKiBSZW5kZXJzIG1pc3NpbmcgYW5nbGVzIHByb2JsZW0gd2hlbiB0aGUgYW5nbGVzIGFyZSBhdCBhIHBvaW50XG4gKiBJLmUuIG9uIGEgc3RyYWlnaHQgbGluZSBvciBhcm91bmQgYSBwb2ludFxuICogQ291bGQgYWxzbyBiZSBhZGFwdGVkIHRvIGFuZ2xlcyBmb3JtaW5nIGEgcmlnaHQgYW5nbGVcbiAqXG4gKiBTaG91bGQgYmUgZmxleGlibGUgZW5vdWdoIGZvciBudW1lcmljYWwgcHJvYmxlbXMgb3IgYWxnZWJyYWljIG9uZXNcbiAqXG4gKi9cblxuaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgR3JhcGhpY1FWaWV3LCBMYWJlbCB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IHsgcm91bmREUCwgc2luRGVnLCBzb3J0VG9nZXRoZXIgfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgVmlld09wdGlvbnMgZnJvbSAnLi4vVmlld09wdGlvbnMnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc051bWJlckRhdGEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICByYWRpdXM6IG51bWJlclxuICBPOiBQb2ludFxuICBBOiBQb2ludFxuICBDOiBQb2ludFtdXG4gIHZpZXdBbmdsZXM6IG51bWJlcltdIC8vICdmdWRnZWQnIHZlcnNpb25zIG9mIGRhdGEuYW5nbGVzIGZvciBkaXNwbGF5XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhXG4gIHJvdGF0aW9uOiBudW1iZXJcbiAgXG4gIGNvbnN0cnVjdG9yIChkYXRhIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEsIG9wdGlvbnMgOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBzZXRzIHRoaXMud2lkdGggdGhpcy5oZWlnaHQsIGluaXRpYWxpc2VzIHRoaXMubGFiZWxzLCBjcmVhdGVzIGRvbSBlbGVtZW50c1xuICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aFxuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuaGVpZ2h0XG4gICAgY29uc3QgcmFkaXVzID0gdGhpcy5yYWRpdXMgPSBNYXRoLm1pbih3aWR0aCwgaGVpZ2h0KSAvIDIuNVxuICAgIGNvbnN0IG1pblZpZXdBbmdsZSA9IG9wdGlvbnMubWluVmlld0FuZ2xlIHx8IDI1XG5cbiAgICB0aGlzLnZpZXdBbmdsZXMgPSBmdWRnZUFuZ2xlcyh0aGlzLmRhdGEuYW5nbGVzLCAgbWluVmlld0FuZ2xlKVxuXG4gICAgLy8gU2V0IHVwIG1haW4gcG9pbnRzXG4gICAgdGhpcy5PID0gbmV3IFBvaW50KDAsIDApIC8vIGNlbnRlciBwb2ludFxuICAgIHRoaXMuQSA9IG5ldyBQb2ludChyYWRpdXMsIDApIC8vIGZpcnN0IHBvaW50XG4gICAgdGhpcy5DID0gW10gLy8gUG9pbnRzIGFyb3VuZCBvdXRzaWRlXG4gICAgbGV0IHRvdGFsYW5nbGUgPSAwIC8vIG5iIGluIHJhZGlhbnNcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZGF0YS5hbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRvdGFsYW5nbGUgKz0gdGhpcy52aWV3QW5nbGVzW2ldICogTWF0aC5QSSAvIDE4MFxuICAgICAgdGhpcy5DW2ldID0gUG9pbnQuZnJvbVBvbGFyKHJhZGl1cywgdG90YWxhbmdsZSlcbiAgICB9XG5cbiAgICAvLyBSYW5kb21seSByb3RhdGUgYW5kIGNlbnRlclxuICAgIHRoaXMucm90YXRpb24gPSAob3B0aW9ucy5yb3RhdGlvbiAhPT0gdW5kZWZpbmVkKSA/IHRoaXMucm90YXRlKG9wdGlvbnMucm90YXRpb24pIDogdGhpcy5yYW5kb21Sb3RhdGUoKVxuICAgIC8vIHRoaXMuc2NhbGVUb0ZpdCh3aWR0aCxoZWlnaHQsMTApXG4gICAgdGhpcy50cmFuc2xhdGUod2lkdGgvMiwgaGVpZ2h0LzIpXG5cbiAgICAvLyBTZXQgdXAgbGFiZWxzIChhZnRlciBzY2FsaW5nIGFuZCByb3RhdGluZylcbiAgICB0b3RhbGFuZ2xlID0gUG9pbnQuYW5nbGVGcm9tKHRoaXMuTyx0aGlzLkEpICogMTgwL01hdGguUEkgLy8gYW5nbGUgZnJvbSBPIHRoYXQgQSBpcyBcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudmlld0FuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gTGFiZWwgdGV4dFxuICAgICAgY29uc3QgbGFiZWwgOiBQYXJ0aWFsPExhYmVsPiA9IHt9XG4gICAgICBjb25zdCB0ZXh0cSA9IHRoaXMuZGF0YS5hbmdsZUxhYmVsc1tpXVxuICAgICAgY29uc3QgdGV4dGEgPSByb3VuZERQKHRoaXMuZGF0YS5hbmdsZXNbaV0sMikudG9TdHJpbmcoKSArICdeXFxcXGNpcmMnXG5cbiAgICAgIC8vIFBvc2l0aW9uaW5nXG4gICAgICBjb25zdCB0aGV0YSA9IHRoaXMudmlld0FuZ2xlc1tpXVxuICAgICAgY29uc3QgbWlkQW5nbGUgPSB0b3RhbGFuZ2xlICsgdGhldGEvMlxuICAgICAgY29uc3QgbWluRGlzdGFuY2UgPSAwLjMgLy8gYXMgYSBmcmFjdGlvbiBvZiByYWRpdXNcbiAgICAgIGNvbnN0IGxhYmVsTGVuZ3RoID0gTWF0aC5tYXgodGV4dHEubGVuZ3RoLCB0ZXh0YS5sZW5ndGgpIC0gJ15cXFxcY2lyYycubGVuZ3RoIC8vIMKwIHRha2VzIHVwIHZlcnkgbGl0dGxlIHNwYWNlXG5cbiAgICAgIC8qIEV4cGxhbmF0aW9uOiBGdXJ0aGVyIG91dCBpZjpcbiAgICAgICogICBNb3JlIHZlcnRpY2FsIChzaW4obWlkQW5nbGUpKVxuICAgICAgKiAgIExvbmdlciBsYWJlbFxuICAgICAgKiAgIHNtYWxsZXIgYW5nbGVcbiAgICAgICogICBFLmcuIHRvdGFsbHkgdmVydGljYWwsIDQ1wrAsIGxlbmd0aCA9IDNcbiAgICAgICogICBkID0gMC4zICsgMSozLzQ1ID0gMC4zICsgMC43ID0gMC4zNyBcbiAgICAgICovXG4gICAgICAvL2NvbnN0IGZhY3RvciA9IDEgICAgICAgIC8vIGNvbnN0YW50IG9mIHByb3BvcnRpb25hbGl0eS4gU2V0IGJ5IHRyaWFsIGFuZCBlcnJvclxuICAgICAgLy9sZXQgZGlzdGFuY2UgPSBtaW5EaXN0YW5jZSArIGZhY3RvciAqIE1hdGguYWJzKHNpbkRlZyhtaWRBbmdsZSkpICogbGFiZWxMZW5ndGggLyB0aGV0YVxuXG4gICAgICAvLyBKdXN0IHJldmVydCB0byBvbGQgbWV0aG9kXG5cbiAgICAgIGNvbnN0IGRpc3RhbmNlID0gMC40ICsgNi90aGV0YVxuXG4gICAgICBsYWJlbC5wb3MgPSBQb2ludC5mcm9tUG9sYXJEZWcocmFkaXVzICogZGlzdGFuY2UsIHRvdGFsYW5nbGUgKyB0aGV0YSAvIDIpLnRyYW5zbGF0ZSh0aGlzLk8ueCx0aGlzLk8ueSksXG4gICAgICBsYWJlbC50ZXh0cSA9IHRleHRxXG4gICAgICBsYWJlbC5zdHlsZXEgPSAnbm9ybWFsJ1xuXG4gICAgICBpZiAodGhpcy5kYXRhLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSB0ZXh0YVxuICAgICAgICBsYWJlbC5zdHlsZWEgPSAnYW5zd2VyJ1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGFiZWwudGV4dGEgPSBsYWJlbC50ZXh0cVxuICAgICAgICBsYWJlbC5zdHlsZWEgPSBsYWJlbC5zdHlsZXFcbiAgICAgIH1cblxuICAgICAgbGFiZWwudGV4dCA9IGxhYmVsLnRleHRxXG4gICAgICBsYWJlbC5zdHlsZSA9IGxhYmVsLnN0eWxlcVxuXG4gICAgICB0aGlzLmxhYmVsc1tpXSA9IGxhYmVsIGFzIExhYmVsXG5cbiAgICAgIHRvdGFsYW5nbGUgKz0gdGhldGFcbiAgICB9XG5cbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcblxuICB9XG5cbiAgcmVuZGVyICgpIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG5cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpIC8vIGNsZWFyXG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBjdHgubW92ZVRvKHRoaXMuTy54LCB0aGlzLk8ueSkgLy8gZHJhdyBsaW5lc1xuICAgIGN0eC5saW5lVG8odGhpcy5BLngsIHRoaXMuQS55KVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5DLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjdHgubW92ZVRvKHRoaXMuTy54LCB0aGlzLk8ueSlcbiAgICAgIGN0eC5saW5lVG8odGhpcy5DW2ldLngsIHRoaXMuQ1tpXS55KVxuICAgIH1cbiAgICBjdHguc3Ryb2tlU3R5bGUgPSAnZ3JheSdcbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGxldCB0b3RhbGFuZ2xlID0gdGhpcy5yb3RhdGlvblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy52aWV3QW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCB0aGV0YSA9IHRoaXMudmlld0FuZ2xlc1tpXSAqIE1hdGguUEkgLyAxODBcbiAgICAgIC8vIDAuMDcvdGhldGEgcmFkaWFucyB+PSA0L3RoZXRhXG4gICAgICBjdHguYXJjKHRoaXMuTy54LCB0aGlzLk8ueSwgdGhpcy5yYWRpdXMgKiAoMC4yICsgMC4wNyAvIHRoZXRhKSwgdG90YWxhbmdsZSwgdG90YWxhbmdsZSArIHRoZXRhKVxuICAgICAgY3R4LnN0cm9rZSgpXG4gICAgICB0b3RhbGFuZ2xlICs9IHRoZXRhXG4gICAgfVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgLy8gdGVzdGluZyBsYWJlbCBwb3NpdGlvbmluZzpcbiAgICAvLyB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgIC8vIGN0eC5maWxsU3R5bGUgPSAncmVkJ1xuICAgIC8vIGN0eC5maWxsUmVjdChsLnBvcy54IC0gMSwgbC5wb3MueSAtIDEsIDMsIDMpXG4gICAgLy8gfSlcblxuICAgIHRoaXMucmVuZGVyTGFiZWxzKGZhbHNlKVxuICB9XG5cbiAgZ2V0IGFsbHBvaW50cyAoKSB7XG4gICAgbGV0IGFsbHBvaW50cyA9IFt0aGlzLkEsIHRoaXMuT11cbiAgICBhbGxwb2ludHMgPSBhbGxwb2ludHMuY29uY2F0KHRoaXMuQylcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGZ1bmN0aW9uIChsKSB7XG4gICAgICBhbGxwb2ludHMucHVzaChsLnBvcylcbiAgICB9KVxuICAgIHJldHVybiBhbGxwb2ludHNcbiAgfVxufVxuXG4vKipcbiAqIEFkanVzdHMgYSBzZXQgb2YgYW5nbGVzIHNvIHRoYXQgYWxsIGFuZ2xlcyBhcmUgZ3JlYXRlciB0aGFuIHttaW5BbmdsZX0gYnkgcmVkdWNpbmcgb3RoZXIgYW5nbGVzIGluIHByb3BvcnRpb25cbiAqIEBwYXJhbSBhbmdsZXMgVGhlIHNldCBvZiBhbmdsZXMgdG8gYWRqdXN0XG4gKiBAcGFyYW0gbWluQW5nbGUgVGhlIHNtYWxsZXN0IGFuZ2xlIGluIHRoZSBvdXRwdXRcbiAqL1xuZnVuY3Rpb24gZnVkZ2VBbmdsZXMoYW5nbGVzOiBudW1iZXJbXSwgbWluQW5nbGU6IG51bWJlcikgOiBudW1iZXJbXSB7XG4gIGNvbnN0IG1hcHBlZEFuZ2xlcyA9IGFuZ2xlcy5tYXAoKHgsaSk9Plt4LGldKSAvLyByZW1lbWJlciBvcmlnaW5hbCBpbmRpY2VzXG4gIGNvbnN0IHNtYWxsQW5nbGVzID0gbWFwcGVkQW5nbGVzLmZpbHRlcih4PT4geFswXTxtaW5BbmdsZSlcbiAgY29uc3QgbGFyZ2VBbmdsZXMgPSBtYXBwZWRBbmdsZXMuZmlsdGVyKHg9PiB4WzBdPj1taW5BbmdsZSlcbiAgbGV0IGxhcmdlQW5nbGVTdW0gPSBsYXJnZUFuZ2xlcy5yZWR1Y2UoIChhY2N1bXVsYXRvcixjdXJyZW50VmFsdWUpID0+IGFjY3VtdWxhdG9yICsgY3VycmVudFZhbHVlWzBdICwgMClcblxuICBzbWFsbEFuZ2xlcy5mb3JFYWNoKCBzbWFsbCA9PiB7XG4gICAgY29uc3QgZGlmZmVyZW5jZSA9IG1pbkFuZ2xlIC0gc21hbGxbMF1cbiAgICBzbWFsbFswXSArPSBkaWZmZXJlbmNlXG4gICAgbGFyZ2VBbmdsZXMuZm9yRWFjaCggbGFyZ2UgPT4ge1xuICAgICAgY29uc3QgcmVkdWN0aW9uID0gZGlmZmVyZW5jZSAqIGxhcmdlWzBdL2xhcmdlQW5nbGVTdW1cbiAgICAgIGxhcmdlWzBdIC09IHJlZHVjdGlvblxuICAgIH0pXG4gIH0pXG5cbiAgcmV0dXJuICBzbWFsbEFuZ2xlcy5jb25jYXQobGFyZ2VBbmdsZXMpICAgICAgIC8vIGNvbWJpbmUgdG9nZXRoZXJcbiAgICAgICAgICAgICAgICAgICAgIC5zb3J0KCh4LHkpID0+IHhbMV0teVsxXSkgIC8vIHNvcnQgYnkgcHJldmlvdXMgaW5kZXhcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAoeD0+eFswXSkgICAgICAgICAgICAgIC8vIHN0cmlwIG91dCBpbmRleFxufSIsIi8qKiBHZW5lcmF0ZXMgYW5kIGhvbGRzIGRhdGEgZm9yIGEgbWlzc2luZyBhbmdsZXMgcXVlc3Rpb24sIHdoZXJlIHRoZXNlIGlzIHNvbWUgZ2l2ZW4gYW5nbGUgc3VtXG4gKiAgQWdub3N0aWMgYXMgdG8gaG93IHRoZXNlIGFuZ2xlcyBhcmUgYXJyYW5nZWQgKGUuZy4gaW4gYSBwb2x5Z29uIG9yIGFyb3VuZCBzb20gcG9pbnQpXG4gKlxuICogT3B0aW9ucyBwYXNzZWQgdG8gY29uc3RydWN0b3JzOlxuICogIGFuZ2xlU3VtOjpJbnQgdGhlIG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqICBtaW5BbmdsZTo6SW50IHRoZSBzbWFsbGVzdCBhbmdsZSB0byBnZW5lcmF0ZVxuICogIG1pbk46OkludCAgICAgdGhlIHNtYWxsZXN0IG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqICBtYXhOOjpJbnQgICAgIHRoZSBsYXJnZXN0IG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqXG4gKi9cblxuaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUURhdGF9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc0RhdGEgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNEYXRhJ1xuaW1wb3J0IHtNaXNzaW5nQW5nbGVPcHRpb25zIGFzIE9wdGlvbnN9IGZyb20gJy4vTnVtYmVyT3B0aW9ucycgXG5cbmV4cG9ydCBjbGFzcyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSBpbXBsZW1lbnRzIE1pc3NpbmdBbmdsZXNEYXRhIHtcbiAgYW5nbGVzIDogbnVtYmVyW10gLy8gbGlzdCBvZiBhbmdsZXNcbiAgbWlzc2luZyA6IGJvb2xlYW5bXSAvLyB0cnVlIGlmIG1pc3NpbmdcbiAgYW5nbGVTdW0gOiBudW1iZXIgLy8gd2hhdCB0aGUgYW5nbGVzIGFkZCB1cCB0b1xuICBhbmdsZUxhYmVsczogc3RyaW5nW11cblxuICBjb25zdHJ1Y3RvciAoYW5nbGVTdW0gOiBudW1iZXIsIGFuZ2xlczogbnVtYmVyW10sIG1pc3Npbmc6IGJvb2xlYW5bXSwgYW5nbGVMYWJlbHM/OiBzdHJpbmdbXSkge1xuICAgIC8vIGluaXRpYWxpc2VzIHdpdGggYW5nbGVzIGdpdmVuIGV4cGxpY2l0bHlcbiAgICBpZiAoYW5nbGVzID09PSBbXSkgeyB0aHJvdyBuZXcgRXJyb3IoJ011c3QgZ2l2ZSBhbmdsZXMnKSB9XG4gICAgaWYgKE1hdGgucm91bmQoYW5nbGVzLnJlZHVjZSgoeCwgeSkgPT4geCArIHkpKSAhPT0gYW5nbGVTdW0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQW5nbGUgc3VtIG11c3QgYmUgJHthbmdsZVN1bX1gKVxuICAgIH1cblxuICAgIHRoaXMuYW5nbGVzID0gYW5nbGVzIC8vIGxpc3Qgb2YgYW5nbGVzXG4gICAgdGhpcy5taXNzaW5nID0gbWlzc2luZyAvLyB3aGljaCBhbmdsZXMgYXJlIG1pc3NpbmcgLSBhcnJheSBvZiBib29sZWFuc1xuICAgIHRoaXMuYW5nbGVTdW0gPSBhbmdsZVN1bSAvLyBzdW0gb2YgYW5nbGVzXG4gICAgdGhpcy5hbmdsZUxhYmVscyA9IGFuZ2xlTGFiZWxzIHx8IFtdXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IFBhcnRpYWw8T3B0aW9ucz4gPSB7XG4gICAgICAvKiBhbmdsZVN1bTogMTgwICovIC8vIG11c3QgYmUgc2V0IGJ5IGNhbGxlclxuICAgICAgbWluQW5nbGU6IDE1LFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDRcbiAgICB9XG5cbiAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICBsZXQgcXVlc3Rpb24gOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YVxuICAgIGlmIChvcHRpb25zLnJlcGVhdGVkKSB7XG4gICAgICBxdWVzdGlvbiA9IHRoaXMucmFuZG9tUmVwZWF0ZWQob3B0aW9ucylcbiAgICB9IGVsc2Uge1xuICAgICAgcXVlc3Rpb24gPSB0aGlzLnJhbmRvbVNpbXBsZShvcHRpb25zKVxuICAgIH1cbiAgICBxdWVzdGlvbi5pbml0TGFiZWxzKClcbiAgICByZXR1cm4gcXVlc3Rpb25cbiAgfVxuXG4gIHN0YXRpYyByYW5kb21TaW1wbGUgKG9wdGlvbnM6IE9wdGlvbnMpOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB7XG5cbiAgICBpZiAoIW9wdGlvbnMuYW5nbGVTdW0pIHsgdGhyb3cgbmV3IEVycm9yKCdObyBhbmdsZSBzdW0gZ2l2ZW4nKSB9XG5cbiAgICBjb25zdCBhbmdsZVN1bSA9IG9wdGlvbnMuYW5nbGVTdW1cbiAgICBjb25zdCBuID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5OLCBvcHRpb25zLm1heE4pXG4gICAgY29uc3QgbWluQW5nbGUgPSBvcHRpb25zLm1pbkFuZ2xlXG5cbiAgICBpZiAobiA8IDIpIHRocm93IG5ldyBFcnJvcignQ2FuXFwndCBoYXZlIG1pc3NpbmcgZmV3ZXIgdGhhbiAyIGFuZ2xlcycpXG5cbiAgICAvLyBCdWlsZCB1cCBhbmdsZXNcbiAgICBjb25zdCBhbmdsZXMgPSBbXVxuICAgIGxldCBsZWZ0ID0gYW5nbGVTdW1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG4gLSAxOyBpKyspIHtcbiAgICAgIGNvbnN0IG1heEFuZ2xlID0gbGVmdCAtIG1pbkFuZ2xlICogKG4gLSBpIC0gMSlcbiAgICAgIGNvbnN0IG5leHRBbmdsZSA9IHJhbmRCZXR3ZWVuKG1pbkFuZ2xlLCBtYXhBbmdsZSlcbiAgICAgIGxlZnQgLT0gbmV4dEFuZ2xlXG4gICAgICBhbmdsZXMucHVzaChuZXh0QW5nbGUpXG4gICAgfVxuICAgIGFuZ2xlc1tuIC0gMV0gPSBsZWZ0XG5cbiAgICAvLyBwaWNrIG9uZSB0byBiZSBtaXNzaW5nXG4gICAgY29uc3QgbWlzc2luZyA9IFtdXG4gICAgbWlzc2luZy5sZW5ndGggPSBuXG4gICAgbWlzc2luZy5maWxsKGZhbHNlKVxuICAgIG1pc3NpbmdbcmFuZEJldHdlZW4oMCwgbiAtIDEpXSA9IHRydWVcblxuICAgIHJldHVybiBuZXcgdGhpcyhhbmdsZVN1bSwgYW5nbGVzLCBtaXNzaW5nKVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbVJlcGVhdGVkIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBjb25zdCBhbmdsZVN1bTogbnVtYmVyID0gb3B0aW9ucy5hbmdsZVN1bVxuICAgIGNvbnN0IG1pbkFuZ2xlOiBudW1iZXIgPSBvcHRpb25zLm1pbkFuZ2xlXG5cbiAgICBjb25zdCBuOiBudW1iZXIgPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbk4sIG9wdGlvbnMubWF4TilcblxuICAgIGNvbnN0IG06IG51bWJlciA9IG9wdGlvbnMubk1pc3NpbmcgfHwgKE1hdGgucmFuZG9tKCkgPCAwLjEgPyBuIDogcmFuZEJldHdlZW4oMiwgbiAtIDEpKVxuXG4gICAgaWYgKG4gPCAyIHx8IG0gPCAxIHx8IG0gPiBuKSB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgYXJndW1lbnRzOiBuPSR7bn0sIG09JHttfWApXG5cbiAgICAvLyBBbGwgbWlzc2luZyAtIGRvIGFzIGEgc2VwYXJhdGUgY2FzZVxuICAgIGlmIChuID09PSBtKSB7XG4gICAgICBjb25zdCBhbmdsZXMgPSBbXVxuICAgICAgYW5nbGVzLmxlbmd0aCA9IG5cbiAgICAgIGFuZ2xlcy5maWxsKGFuZ2xlU3VtIC8gbilcblxuICAgICAgY29uc3QgbWlzc2luZyA9IFtdXG4gICAgICBtaXNzaW5nLmxlbmd0aCA9IG5cbiAgICAgIG1pc3NpbmcuZmlsbCh0cnVlKVxuXG4gICAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZylcbiAgICB9XG5cbiAgICBjb25zdCBhbmdsZXM6IG51bWJlcltdID0gW11cbiAgICBjb25zdCBtaXNzaW5nOiBib29sZWFuW10gPSBbXVxuICAgIG1pc3NpbmcubGVuZ3RoID0gblxuICAgIG1pc3NpbmcuZmlsbChmYWxzZSlcblxuICAgIC8vIGNob29zZSBhIHZhbHVlIGZvciB0aGUgbWlzc2luZyBhbmdsZXNcbiAgICBjb25zdCBtYXhSZXBlYXRlZEFuZ2xlID0gKGFuZ2xlU3VtIC0gbWluQW5nbGUgKiAobiAtIG0pKSAvIG1cbiAgICBjb25zdCByZXBlYXRlZEFuZ2xlID0gcmFuZEJldHdlZW4obWluQW5nbGUsIG1heFJlcGVhdGVkQW5nbGUpXG5cbiAgICAvLyBjaG9vc2UgdmFsdWVzIGZvciB0aGUgb3RoZXIgYW5nbGVzXG4gICAgY29uc3Qgb3RoZXJBbmdsZXM6IG51bWJlcltdID0gW11cbiAgICBsZXQgbGVmdCA9IGFuZ2xlU3VtIC0gcmVwZWF0ZWRBbmdsZSAqIG1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG4gLSBtIC0gMTsgaSsrKSB7XG4gICAgICBjb25zdCBtYXhBbmdsZSA9IGxlZnQgLSBtaW5BbmdsZSAqIChuIC0gbSAtIGkgLSAxKVxuICAgICAgY29uc3QgbmV4dEFuZ2xlID0gcmFuZEJldHdlZW4obWluQW5nbGUsIG1heEFuZ2xlKVxuICAgICAgbGVmdCAtPSBuZXh0QW5nbGVcbiAgICAgIG90aGVyQW5nbGVzLnB1c2gobmV4dEFuZ2xlKVxuICAgIH1cbiAgICBvdGhlckFuZ2xlc1tuIC0gbSAtIDFdID0gbGVmdFxuXG4gICAgLy8gY2hvb3NlIHdoZXJlIHRoZSBtaXNzaW5nIGFuZ2xlcyBhcmVcbiAgICB7XG4gICAgICBsZXQgaSA9IDBcbiAgICAgIHdoaWxlIChpIDwgbSkge1xuICAgICAgICBjb25zdCBqID0gcmFuZEJldHdlZW4oMCwgbiAtIDEpXG4gICAgICAgIGlmIChtaXNzaW5nW2pdID09PSBmYWxzZSkge1xuICAgICAgICAgIG1pc3Npbmdbal0gPSB0cnVlXG4gICAgICAgICAgYW5nbGVzW2pdID0gcmVwZWF0ZWRBbmdsZVxuICAgICAgICAgIGkrK1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZmlsbCBpbiB0aGUgb3RoZXIgYW5nbGVzXG4gICAge1xuICAgICAgbGV0IGogPSAwXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICBpZiAobWlzc2luZ1tpXSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBhbmdsZXNbaV0gPSBvdGhlckFuZ2xlc1tqXVxuICAgICAgICAgIGorK1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZylcbiAgfVxuXG4gIGluaXRMYWJlbHMoKSA6IHZvaWQge1xuICAgIGNvbnN0IG4gPSB0aGlzLmFuZ2xlcy5sZW5ndGhcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgaWYgKCF0aGlzLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgdGhpcy5hbmdsZUxhYmVsc1tpXSA9IGAke3RoaXMuYW5nbGVzW2ldLnRvU3RyaW5nKCl9XlxcXFxjaXJjYFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5hbmdsZUxhYmVsc1tpXSA9ICd4XlxcXFxjaXJjJ1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwiLyogUXVlc3Rpb24gdHlwZSBjb21wcmlzaW5nIG51bWVyaWNhbCBtaXNzaW5nIGFuZ2xlcyBhcm91bmQgYSBwb2ludCBhbmRcbiAqIGFuZ2xlcyBvbiBhIHN0cmFpZ2h0IGxpbmUgKHNpbmNlIHRoZXNlIGFyZSB2ZXJ5IHNpbWlsYXIgbnVtZXJpY2FsbHkgYXMgd2VsbFxuICogYXMgZ3JhcGhpY2FsbHkuXG4gKlxuICogQWxzbyBjb3ZlcnMgY2FzZXMgd2hlcmUgbW9yZSB0aGFuIG9uZSBhbmdsZSBpcyBlcXVhbFxuICpcbiAqL1xuXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc051bWJlckRhdGEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tICcuL01pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YVxuICB2aWV3OiBNaXNzaW5nQW5nbGVzQXJvdW5kVmlld1xuXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSwgdmlldzogTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcpIHsgLy8gZWZmZWN0aXZlbHkgcHJpdmF0ZVxuICAgIHN1cGVyKCkgLy8gYnViYmxlcyB0byBRXG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIHRoaXMudmlldyA9IHZpZXdcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IE1pc3NpbmdBbmdsZU9wdGlvbnMsIHZpZXdPcHRpb25zOiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgKSA6IE1pc3NpbmdBbmdsZXNBcm91bmRRIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IE1pc3NpbmdBbmdsZU9wdGlvbnMgPSB7XG4gICAgICBhbmdsZVN1bTogMTgwLFxuICAgICAgbWluQW5nbGU6IDEwLFxuICAgICAgbWluTjogMixcbiAgICAgIG1heE46IDQsXG4gICAgICByZXBlYXRlZDogZmFsc2VcbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcoZGF0YSwgdmlld09wdGlvbnMpIC8vIFRPRE8gZWxpbWluYXRlIHB1YmxpYyBjb25zdHJ1Y3RvcnNcblxuICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZFEoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IEdyYXBoaWNRVmlldywgTGFiZWwgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCB7IHNpbkRlZywgZGFzaGVkTGluZSB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIEEgOiBQb2ludCAvLyB0aGUgdmVydGljZXMgb2YgdGhlIHRyaWFuZ2xlXG4gIEIgOiBQb2ludFxuICBDIDogUG9pbnRcbiAgcm90YXRpb246IG51bWJlclxuICAvLyBJbmhlcml0ZWQgbWVtYmVyczpcbiAgbGFiZWxzOiBMYWJlbFtdXG4gIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnRcbiAgRE9NOiBIVE1MRWxlbWVudFxuICB3aWR0aDogbnVtYmVyXG4gIGhlaWdodDogbnVtYmVyXG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGFcblxuICBjb25zdHJ1Y3RvciAoZGF0YSwgb3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIHNldHMgdGhpcy53aWR0aCB0aGlzLmhlaWdodCwgdGhpcy5kYXRhIGluaXRpYWxpc2VzIHRoaXMubGFiZWxzLCBjcmVhdGVzIGRvbSBlbGVtZW50c1xuICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aFxuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuaGVpZ2h0XG5cbiAgICBjb25zdCBkaXNwbGF5QW5nbGVzIDogbnVtYmVyW10gPSBbXVxuXG4gICAgLy8gZ2VuZXJhdGUgcG9pbnRzICh3aXRoIGxvbmdlc3Qgc2lkZSAxXG4gICAgdGhpcy5BID0gbmV3IFBvaW50KDAsIDApXG4gICAgdGhpcy5CID0gUG9pbnQuZnJvbVBvbGFyRGVnKDEsIGRhdGEuYW5nbGVzWzBdKVxuICAgIHRoaXMuQyA9IG5ldyBQb2ludChcbiAgICAgIHNpbkRlZyh0aGlzLmRhdGEuYW5nbGVzWzFdKSAvIHNpbkRlZyh0aGlzLmRhdGEuYW5nbGVzWzJdKSwgMFxuICAgIClcblxuICAgIC8vIENyZWF0ZSBsYWJlbHNcbiAgICBjb25zdCBpbkNlbnRlciA9IFBvaW50LmluQ2VudGVyKHRoaXMuQSwgdGhpcy5CLCB0aGlzLkMpXG5cbiAgICBsZXQgaiA9IDAgLy8ga2VlcHMgdHJhY2sgb2YgJ3gnIGFuZCAneScgYXMgbGFiZWxzXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGNvbnN0IHAgPSBbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ11baV1cblxuICAgICAgY29uc3QgbGFiZWwgOiBQYXJ0aWFsPExhYmVsPiA9IHt9XG5cbiAgICAgIC8vIHF1ZXN0aW9uIHRleHRcbiAgICAgIGxldCB0ZXh0cVxuICAgICAgaWYgKHRoaXMuZGF0YS5taXNzaW5nW2ldKSB7XG4gICAgICAgIHRleHRxID0gU3RyaW5nLmZyb21DaGFyQ29kZSgxMjAraikgLy8gMTIwID0gJ3gnXG4gICAgICAgIGorK1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGV4dHEgPSB0aGlzLmRhdGEuYW5nbGVzW2ldLnRvU3RyaW5nKClcbiAgICAgIH1cbiAgICAgIHRleHRxICs9ICdeXFxcXGNpcmMnXG5cbiAgICAgIGxhYmVsLnBvcyA9IFBvaW50Lm1lYW4ocCwgcCwgaW5DZW50ZXIpIFxuICAgICAgbGFiZWwudGV4dHEgPSB0ZXh0cVxuICAgICAgbGFiZWwuc3R5bGVxID0gJ25vcm1hbCdcblxuICAgICAgaWYgKHRoaXMuZGF0YS5taXNzaW5nW2ldKSB7XG4gICAgICAgIGxhYmVsLnRleHRhID0gdGhpcy5kYXRhLmFuZ2xlc1tpXS50b1N0cmluZygpICsgJ15cXFxcY2lyYydcbiAgICAgICAgbGFiZWwuc3R5bGVhID0gJ2Fuc3dlcidcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxhYmVsLnRleHRhID0gbGFiZWwudGV4dHFcbiAgICAgICAgbGFiZWwuc3R5bGVhID0gbGFiZWwuc3R5bGVxXG4gICAgICB9XG4gICAgICBsYWJlbC50ZXh0ID0gbGFiZWwudGV4dHFcbiAgICAgIGxhYmVsLnN0eWxlID0gbGFiZWwuc3R5bGVxXG5cbiAgICAgIHRoaXMubGFiZWxzW2ldID0gbGFiZWwgYXMgTGFiZWxcbiAgICB9XG5cbiAgICAvLyByb3RhdGUgcmFuZG9tbHlcbiAgICB0aGlzLnJvdGF0aW9uID0gKG9wdGlvbnMucm90YXRpb24gIT09IHVuZGVmaW5lZCkgPyB0aGlzLnJvdGF0ZShvcHRpb25zLnJvdGF0aW9uKSA6IHRoaXMucmFuZG9tUm90YXRlKClcblxuICAgIC8vIHNjYWxlIGFuZCBmaXRcbiAgICAvLyBzY2FsZSB0byBzaXplXG4gICAgY29uc3QgbWFyZ2luID0gMFxuICAgIGxldCB0b3BsZWZ0ID0gUG9pbnQubWluKFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBsZXQgYm90dG9tcmlnaHQgPSBQb2ludC5tYXgoW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGNvbnN0IHRvdGFsV2lkdGggPSBib3R0b21yaWdodC54IC0gdG9wbGVmdC54XG4gICAgY29uc3QgdG90YWxIZWlnaHQgPSBib3R0b21yaWdodC55IC0gdG9wbGVmdC55XG4gICAgdGhpcy5zY2FsZShNYXRoLm1pbigod2lkdGggLSBtYXJnaW4pIC8gdG90YWxXaWR0aCwgKGhlaWdodCAtIG1hcmdpbikgLyB0b3RhbEhlaWdodCkpIC8vIDE1cHggbWFyZ2luXG5cbiAgICAvLyBtb3ZlIHRvIGNlbnRyZVxuICAgIHRvcGxlZnQgPSBQb2ludC5taW4oW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGJvdHRvbXJpZ2h0ID0gUG9pbnQubWF4KFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBjb25zdCBjZW50ZXIgPSBQb2ludC5tZWFuKHRvcGxlZnQsIGJvdHRvbXJpZ2h0KVxuICAgIHRoaXMudHJhbnNsYXRlKHdpZHRoIC8gMiAtIGNlbnRlci54LCBoZWlnaHQgLyAyIC0gY2VudGVyLnkpIC8vIGNlbnRyZVxuICB9XG5cbiAgcmVuZGVyICgpIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG4gICAgY29uc3QgdmVydGljZXMgPSBbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ11cbiAgICBjb25zdCBhcGV4ID0gdGhpcy5kYXRhLmFwZXggLy8gaG1tbVxuXG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KSAvLyBjbGVhclxuXG4gICAgY3R4LmJlZ2luUGF0aCgpXG4gICAgY3R4Lm1vdmVUbyh0aGlzLkEueCwgdGhpcy5BLnkpXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgY29uc3QgcCA9IHZlcnRpY2VzW2ldXG4gICAgICBjb25zdCBuZXh0ID0gdmVydGljZXNbKGkgKyAxKSAlIDNdXG4gICAgICBpZiAoYXBleCA9PT0gaSB8fCBhcGV4ID09PSAoaSArIDEpICUgMykgeyAvLyB0by9mcm9tIGFwZXggLSBkcmF3IGRhc2hlZCBsaW5lXG4gICAgICAgIGRhc2hlZExpbmUoY3R4LCBwLngsIHAueSwgbmV4dC54LCBuZXh0LnkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjdHgubGluZVRvKG5leHQueCwgbmV4dC55KVxuICAgICAgfVxuICAgIH1cbiAgICBjdHguc3Ryb2tlU3R5bGUgPSAnZ3JheSdcbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIHRoaXMucmVuZGVyTGFiZWxzKGZhbHNlKVxuICB9XG5cbiAgZ2V0IGFsbHBvaW50cyAoKSB7XG4gICAgY29uc3QgYWxscG9pbnRzID0gW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHsgYWxscG9pbnRzLnB1c2gobC5wb3MpIH0pXG4gICAgcmV0dXJuIGFsbHBvaW50c1xuICB9XG59XG4iLCIvKiBFeHRlbmRzIE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIGluIG9yZGVyIHRvIGRvIGlzb3NjZWxlcyB0cmlhbmdsZXMsIHdoaWNoIGdlbmVyYXRlIGEgYml0IGRpZmZlcmVudGx5ICovXG5cbmltcG9ydCB7IGZpcnN0VW5pcXVlSW5kZXgsIHNvcnRUb2dldGhlciB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCB7IEdyYXBoaWNRRGF0YSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc051bWJlckRhdGF9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc051bWJlckRhdGEnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVPcHRpb25zIH0gZnJvbSAnLi9OdW1iZXJPcHRpb25zJ1xuXG50eXBlIE9wdGlvbnMgPSBNaXNzaW5nQW5nbGVPcHRpb25zICYge2dpdmVuQW5nbGU/OiAnYXBleCcgfCAnYmFzZSd9XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEgZXh0ZW5kcyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB7XG4gICAgYXBleDogMCB8IDEgfCAyIHwgdW5kZWZpbmVkIC8vIHdoaWNoIG9mIHRoZSB0aHJlZSBnaXZlbiBhbmdsZXMgaXMgdGhlIGFwZXggb2YgYW4gaXNvc2NlbGVzIHRyaWFuZ2xlXG4gICAgY29uc3RydWN0b3IoYW5nbGVTdW06IG51bWJlciwgYW5nbGVzOiBudW1iZXJbXSwgbWlzc2luZzogYm9vbGVhbltdLCBhcGV4PzogMHwxfDJ8dW5kZWZpbmVkKSB7XG4gICAgICAgIHN1cGVyKGFuZ2xlU3VtLGFuZ2xlcyxtaXNzaW5nKVxuICAgICAgICB0aGlzLmFwZXggPSBhcGV4XG4gICAgfVxuXG4gICAgc3RhdGljIHJhbmRvbVJlcGVhdGVkKG9wdGlvbnM6IE9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucy5uTWlzc2luZyA9IDJcbiAgICAgICAgb3B0aW9ucy5naXZlbkFuZ2xlID0gb3B0aW9ucy5naXZlbkFuZ2xlIHx8IE1hdGgucmFuZG9tKCkgPCAwLjU/ICdhcGV4JyA6ICdiYXNlJ1xuXG4gICAgICAgIC8vIGdlbmVyYXRlIHRoZSByYW5kb20gYW5nbGVzIHdpdGggcmVwZXRpdGlvbiBmaXJzdCBiZWZvcmUgbWFya2luZyBhcGV4IGZvciBkcmF3aW5nXG4gICAgICAgIGxldCBxdWVzdGlvbiA9IHN1cGVyLnJhbmRvbVJlcGVhdGVkKG9wdGlvbnMpIGFzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEgLy8gYWxsb3dlZCBzaW5jZSB1bmRlZmluZWQgXFxpbiBhcGV4XG5cbiAgICAgICAgLy8gT2xkIGltcGxlbWVudGF0aW9uIGhhZCBzb3J0aW5nIHRoZSBhcnJheSAtIG5vdCBzdXJlIHdoeVxuICAgICAgICAvLyBzb3J0VG9nZXRoZXIocXVlc3Rpb24uYW5nbGVzLHF1ZXN0aW9uLm1pc3NpbmcsKHgseSkgPT4geCAtIHkpXG5cbiAgICAgICAgcXVlc3Rpb24uYXBleCA9IGZpcnN0VW5pcXVlSW5kZXgocXVlc3Rpb24uYW5nbGVzKSBhcyAwIHwgMSB8IDJcbiAgICAgICAgcXVlc3Rpb24ubWlzc2luZyA9IFt0cnVlLHRydWUsdHJ1ZV1cbiAgICAgICAgXG4gICAgICAgIGlmIChvcHRpb25zLmdpdmVuQW5nbGUgPT09ICdhcGV4Jykge1xuICAgICAgICAgICAgcXVlc3Rpb24ubWlzc2luZ1txdWVzdGlvbi5hcGV4XSA9IGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcXVlc3Rpb24ubWlzc2luZ1socXVlc3Rpb24uYXBleCArIDEpJTNdID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgIHJldHVybiBxdWVzdGlvblxuICAgIH0gXG5cbn0iLCIvKiBNaXNzaW5nIGFuZ2xlcyBpbiB0cmlhbmdsZSAtIG51bWVyaWNhbCAqL1xuXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3J1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBjb25zdHJ1Y3RvciAoZGF0YSwgdmlldywgb3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpIC8vIHRoaXMgc2hvdWxkIGJlIGFsbCB0aGF0J3MgcmVxdWlyZWQgd2hlbiByZWZhY3RvcmVkXG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIHRoaXMudmlldyA9IHZpZXdcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnMsIHZpZXdPcHRpb25zKSB7XG4gICAgY29uc3Qgb3B0aW9uc092ZXJyaWRlID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAyNSxcbiAgICAgIG1pbk46IDMsXG4gICAgICBtYXhOOiAzLFxuICAgIH1cbiAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbihvcHRpb25zLG9wdGlvbnNPdmVycmlkZSlcbiAgICBvcHRpb25zLnJlcGVhdGVkICA9IG9wdGlvbnMucmVwZWF0ZWQgfHwgZmFsc2VcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyhkYXRhLCB2aWV3T3B0aW9ucylcblxuICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUShkYXRhLCB2aWV3LCBvcHRpb25zKVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7IHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZScgfVxufVxuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgTGluRXhwciB7XG4vL2NsYXNzIExpbkV4cHIge1xuICAgIGNvbnN0cnVjdG9yKGEsYikge1xuICAgICAgICB0aGlzLmEgPSBhO1xuICAgICAgICB0aGlzLmIgPSBiO1xuICAgIH1cblxuICAgIGlzQ29uc3RhbnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmEgPT09IDBcbiAgICB9XG5cbiAgICB0b1N0cmluZygpIHtcbiAgICAgICAgbGV0IHN0cmluZyA9IFwiXCI7XG5cbiAgICAgICAgLy8geCB0ZXJtXG4gICAgICAgIGlmICh0aGlzLmE9PT0xKSB7IHN0cmluZyArPSBcInhcIn1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5hPT09LTEpIHsgc3RyaW5nICs9IFwiLXhcIn1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5hIT09MCkgeyBzdHJpbmcgKz0gdGhpcy5hICsgXCJ4XCJ9XG4gICAgICAgIFxuICAgICAgICAvLyBzaWduXG4gICAgICAgIGlmICh0aGlzLmEhPT0wICYmIHRoaXMuYj4wKSB7c3RyaW5nICs9IFwiICsgXCJ9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMuYSE9PTAgJiYgdGhpcy5iPDApIHtzdHJpbmcgKz0gXCIgLSBcIn1cblxuICAgICAgICAvLyBjb25zdGFudFxuICAgICAgICBpZiAodGhpcy5iPjApIHtzdHJpbmcgKz0gdGhpcy5ifVxuICAgICAgICBlbHNlIGlmICh0aGlzLmI8MCAmJiB0aGlzLmE9PT0wKSB7c3RyaW5nICs9IHRoaXMuYn1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5iPDApIHtzdHJpbmcgKz0gTWF0aC5hYnModGhpcy5iKX1cblxuICAgICAgICByZXR1cm4gc3RyaW5nO1xuICAgIH1cblxuICAgIHRvU3RyaW5nUCgpIHtcbiAgICAgICAgLy8gcmV0dXJuIGV4cHJlc3Npb24gYXMgYSBzdHJpbmcsIHN1cnJvdW5kZWQgaW4gcGFyZW50aGVzZXMgaWYgYSBiaW5vbWlhbFxuICAgICAgICBpZiAodGhpcy5hID09PSAwIHx8IHRoaXMuYiA9PT0gMCkgcmV0dXJuIHRoaXMudG9TdHJpbmcoKTtcbiAgICAgICAgZWxzZSByZXR1cm4gXCIoXCIgKyB0aGlzLnRvU3RyaW5nKCkgKyBcIilcIjtcbiAgICB9XG5cbiAgICBldmFsKHgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYSp4ICsgdGhpcy5iXG4gICAgfVxuXG4gICAgYWRkKHRoYXQpIHtcbiAgICAgICAgLy8gYWRkIGVpdGhlciBhbiBleHByZXNzaW9uIG9yIGEgY29uc3RhbnRcbiAgICAgICAgaWYgKHRoYXQuYSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gbmV3IExpbkV4cHIodGhpcy5hK3RoYXQuYSx0aGlzLmIrdGhhdC5iKTtcbiAgICAgICAgZWxzZSByZXR1cm4gbmV3IExpbkV4cHIodGhpcy5hLHRoaXMuYiArIHRoYXQpO1xuICAgIH1cblxuICAgIHRpbWVzKHRoYXQpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBMaW5FeHByKHRoaXMuYSAqIHRoYXQsIHRoaXMuYiAqIHRoYXQpXG4gICAgfVxuXG4gICAgc3RhdGljIHNvbHZlKGV4cHIxLGV4cHIyKSB7XG4gICAgICAgIC8vIHNvbHZlcyB0aGUgdHdvIGV4cHJlc3Npb25zIHNldCBlcXVhbCB0byBlYWNoIG90aGVyXG4gICAgICAgIHJldHVybiAoZXhwcjIuYi1leHByMS5iKS8oZXhwcjEuYS1leHByMi5hKVxuICAgIH1cbn1cbiIsImltcG9ydCBMaW5FeHByIGZyb20gXCJMaW5FeHByXCI7XG5cbi8qKiBHaXZlbiBhIHNldCBvZiBleHByZXNzaW9ucywgc2V0IHRoZWlyIHN1bSAgKi9cblxuZXhwb3J0IGZ1bmN0aW9uIHNvbHZlQW5nbGVzKGV4cHJlc3Npb25zOiBMaW5FeHByW10sIGFuZ2xlU3VtOiBudW1iZXIpOiB7IHg6IG51bWJlcjsgYW5nbGVzOiBudW1iZXJbXTsgfSB7XG4gICAgY29uc3QgZXhwcmVzc2lvblN1bSA9IGV4cHJlc3Npb25zLnJlZHVjZSgoZXhwMSwgZXhwMikgPT4gZXhwMS5hZGQoZXhwMikpO1xuICAgIGNvbnN0IHggPSBMaW5FeHByLnNvbHZlKGV4cHJlc3Npb25TdW0sIG5ldyBMaW5FeHByKDAsIGFuZ2xlU3VtKSk7XG5cbiAgICBjb25zdCBhbmdsZXMgPSBbXTtcbiAgICBleHByZXNzaW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChleHByKSB7XG4gICAgICAgIGxldCBhbmdsZSA9IGV4cHIuZXZhbCh4KTtcbiAgICAgICAgaWYgKGFuZ2xlIDw9IDApIHtcbiAgICAgICAgICAgIHRocm93IFwibmVnYXRpdmUgYW5nbGVcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFuZ2xlcy5wdXNoKGV4cHIuZXZhbCh4KSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiAoeyB4OiB4LCBhbmdsZXM6IGFuZ2xlcyB9KTtcbn1cbiIsImltcG9ydCBMaW5FeHByIGZyb20gXCJMaW5FeHByXCI7XG5pbXBvcnQgeyByYW5kQmV0d2VlbiwgcmFuZEVsZW0sIHJhbmRNdWx0QmV0d2Vlbiwgc2h1ZmZsZSwgd2Vha0luY2x1ZGVzIH0gZnJvbSBcIlV0aWxpdGllc1wiO1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tIFwiLi9BbGdlYnJhT3B0aW9uc1wiO1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc0RhdGEgfSBmcm9tIFwiLi9NaXNzaW5nQW5nbGVzRGF0YVwiO1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlT3B0aW9ucyB9IGZyb20gXCIuL051bWJlck9wdGlvbnNcIjtcbmltcG9ydCB7IHNvbHZlQW5nbGVzIH0gZnJvbSBcIi4vc29sdmVBbmdsZXNcIjtcblxudHlwZSBPcHRpb25zID0gQWxnZWJyYU9wdGlvbnNcblxuZXhwb3J0IHR5cGUgRXhwcmVzc2lvblR5cGUgPSAnYWRkJyB8ICdtdWx0aXBseScgfCAnbWl4ZWQnXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEgaW1wbGVtZW50cyBNaXNzaW5nQW5nbGVzRGF0YSB7XG4gICAgYW5nbGVzOiBudW1iZXJbXVxuICAgIG1pc3Npbmc6IGJvb2xlYW5bXVxuICAgIGFuZ2xlU3VtOiBudW1iZXJcbiAgICBhbmdsZUxhYmVsczogc3RyaW5nW11cbiAgICB4OiBudW1iZXIgLy9cbiAgICBcbiAgICBjb25zdHJ1Y3RvcihhbmdsZXM6IG51bWJlcltdLCBtaXNzaW5nOiBib29sZWFuW10sIGFuZ2xlU3VtOiBudW1iZXIsIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSwgeDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuYW5nbGVzID0gYW5nbGVzXG4gICAgICAgIHRoaXMuYW5nbGVTdW0gPSBhbmdsZVN1bVxuICAgICAgICB0aGlzLmFuZ2xlTGFiZWxzID0gYW5nbGVMYWJlbHNcbiAgICAgICAgdGhpcy54ID0geFxuICAgICAgICB0aGlzLm1pc3NpbmcgPSBtaXNzaW5nXG4gICAgfVxuXG4gICAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEge1xuICAgICAgICBjb25zdCBkZWZhdWx0cyA6IFBhcnRpYWw8T3B0aW9ucz4gPSB7XG4gICAgICAgICAgICBleHByZXNzaW9uVHlwZXM6IFsnYWRkJywnbXVsdGlwbHknLCAnbWl4ZWQnXSxcbiAgICAgICAgICAgIGVuc3VyZVg6IHRydWUsXG4gICAgICAgICAgICBpbmNsdWRlQ29uc3RhbnRzOiB0cnVlLFxuICAgICAgICAgICAgbWluQ29lZmZpY2llbnQ6IDEsXG4gICAgICAgICAgICBtYXhDb2VmZmljaWVudDogNCxcbiAgICAgICAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICAgICAgICBtaW5BbmdsZTogMjAsXG4gICAgICAgICAgICBtaW5OOiAyLFxuICAgICAgICAgICAgbWF4TjogNCxcbiAgICAgICAgICAgIG1pblhWYWx1ZTogMTUsXG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICAgICAgLy9hc3NpZ24gY2FsY3VsYXRlZCBkZWZhdWx0czpcbiAgICAgICAgb3B0aW9ucy5tYXhDb25zdGFudCA9IG9wdGlvbnMubWF4Q29uc3RhbnQgfHwgb3B0aW9ucy5hbmdsZVN1bS8yXG4gICAgICAgIG9wdGlvbnMubWF4WFZhbHVlID0gb3B0aW9ucy5tYXhYVmFsdWUgfHwgb3B0aW9ucy5hbmdsZVN1bS80XG5cbiAgICAgICAgLy8gUmFuZG9taXNlL3NldCB1cCBtYWluIGZlYXR1cmVzXG4gICAgICAgIGxldCBuIDogbnVtYmVyID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5OLCBvcHRpb25zLm1heE4pXG5cbiAgICAgICAgY29uc3QgdHlwZSA6IEV4cHJlc3Npb25UeXBlID0gcmFuZEVsZW0ob3B0aW9ucy5leHByZXNzaW9uVHlwZXMpO1xuXG4gICAgICAgIC8vIEdlbmVyYXRlIGV4cHJlc3Npb25zL2FuZ2xlc1xuICAgICAgICBsZXQgZXhwcmVzc2lvbnMgOiBMaW5FeHByW11cbiAgICAgICAgc3dpdGNoKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ21peGVkJzpcbiAgICAgICAgICAgICAgICBleHByZXNzaW9ucyA9IG1ha2VNaXhlZEV4cHJlc3Npb25zKG4sb3B0aW9ucylcbiAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgY2FzZSAnbXVsdGlwbHknOiBcbiAgICAgICAgICAgICAgICBleHByZXNzaW9ucyA9IG1ha2VNdWx0aXBsaWNhdGlvbkV4cHJlc3Npb25zKG4sb3B0aW9ucylcbiAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgY2FzZSAnYWRkJzogXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGV4cHJlc3Npb25zID0gbWFrZUFkZEV4cHJlc3Npb25zKG4sb3B0aW9ucylcbiAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICAgIGV4cHJlc3Npb25zID0gc2h1ZmZsZShleHByZXNzaW9ucyk7XG5cbiAgICAgICAgLy8gU29sdmUgZm9yIHggYW5kIGFuZ2xlc1xuICAgICAgICBjb25zdCB7eCAsIGFuZ2xlcyB9IDoge3g6bnVtYmVyLCBhbmdsZXM6IG51bWJlcltdfSA9IHNvbHZlQW5nbGVzKGV4cHJlc3Npb25zLG9wdGlvbnMuYW5nbGVTdW0pXG5cbiAgICAgICAgLy8gbGFiZWxzIGFyZSBqdXN0IGV4cHJlc3Npb25zIGFzIHN0cmluZ3NcbiAgICAgICAgY29uc3QgbGFiZWxzID0gZXhwcmVzc2lvbnMubWFwKCBlID0+IGAke2UudG9TdHJpbmdQKCl9XlxcXFxjaXJjYCkgXG5cbiAgICAgICAgLy8gbWlzc2luZyB2YWx1ZXMgYXJlIHRoZSBvbmVzIHdoaWNoIGFyZW4ndCBjb25zdGFudFxuICAgICAgICBjb25zdCBtaXNzaW5nID0gZXhwcmVzc2lvbnMubWFwKCBlID0+ICFlLmlzQ29uc3RhbnQoKSlcblxuICAgICAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSAoYW5nbGVzLG1pc3Npbmcsb3B0aW9ucy5hbmdsZVN1bSxsYWJlbHMseClcbiAgICB9XG5cbiAgICBpbml0TGFiZWxzKCkgOiB2b2lkIHt9IC8vIG1ha2VzIHR5cGVzY3JpcHQgc2h1dCB1cFxufVxuXG5mdW5jdGlvbiBtYWtlTWl4ZWRFeHByZXNzaW9ucyhuOiBudW1iZXIsIG9wdGlvbnM6IE9wdGlvbnMpIDogTGluRXhwcltdIHtcbiAgICBsZXQgZXhwcmVzc2lvbnM6IExpbkV4cHJbXSA9IFtdXG4gICAgY29uc3QgeCA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluWFZhbHVlLCBvcHRpb25zLm1heFhWYWx1ZSk7XG4gICAgbGV0IGxlZnQgPSBvcHRpb25zLmFuZ2xlU3VtO1xuICAgIGxldCBhbGxjb25zdGFudCA9IHRydWU7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuIC0gMTsgaSsrKSB7XG4gICAgICAgIGxldCBhID0gcmFuZEJldHdlZW4oMSwgb3B0aW9ucy5tYXhDb2VmZmljaWVudCk7XG4gICAgICAgIGxlZnQgLT0gYSAqIHg7XG4gICAgICAgIGxldCBtYXhiID0gTWF0aC5taW4obGVmdCAtIG9wdGlvbnMubWluQW5nbGUgKiAobiAtIGkgLSAxKSwgb3B0aW9ucy5tYXhDb25zdGFudCk7XG4gICAgICAgIGxldCBtaW5iID0gb3B0aW9ucy5taW5BbmdsZSAtIGEgKiB4O1xuICAgICAgICBsZXQgYiA9IHJhbmRCZXR3ZWVuKG1pbmIsIG1heGIpO1xuICAgICAgICBpZiAoYSAhPT0gMCkgeyBhbGxjb25zdGFudCA9IGZhbHNlIH07XG4gICAgICAgIGxlZnQgLT0gYjtcbiAgICAgICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihhLCBiKSk7XG4gICAgfVxuICAgIGxldCBsYXN0X21pblhfY29lZmYgPSBhbGxjb25zdGFudCA/IDEgOiBvcHRpb25zLm1pbkNvZWZmaWNpZW50O1xuICAgIGxldCBhID0gcmFuZEJldHdlZW4obGFzdF9taW5YX2NvZWZmLCBvcHRpb25zLm1heENvZWZmaWNpZW50KTtcbiAgICBsZXQgYiA9IGxlZnQgLSBhICogeDtcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKGEsIGIpKTtcblxuICAgIHJldHVybiBleHByZXNzaW9uc1xufVxuXG5mdW5jdGlvbiBtYWtlQWRkRXhwcmVzc2lvbnMobjogbnVtYmVyLCBvcHRpb25zOiBPcHRpb25zKSA6IExpbkV4cHJbXSB7XG4gICAgbGV0IGV4cHJlc3Npb25zOiBMaW5FeHByW10gPSBbXVxuICAgIGxldCBhbmdsZXM6IG51bWJlcltdID0gW11cbiAgICBjb25zdCBjb25zdGFudHMgPSAob3B0aW9ucy5pbmNsdWRlQ29uc3RhbnRzID09PSB0cnVlIHx8IHdlYWtJbmNsdWRlcyhvcHRpb25zLmluY2x1ZGVDb25zdGFudHMsICdhZGQnKSk7XG4gICAgaWYgKG4gPT09IDIgJiYgb3B0aW9ucy5lbnN1cmVYICYmIGNvbnN0YW50cykgbiA9IDM7XG5cbiAgICBjb25zdCB4ID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5YVmFsdWUsIG9wdGlvbnMubWF4WFZhbHVlKTtcbiAgICBsZXQgbGVmdCA9IG9wdGlvbnMuYW5nbGVTdW07XG4gICAgbGV0IGFuZ2xlc0xlZnQgPSBuO1xuXG4gICAgLy8gZmlyc3QgZG8gdGhlIGV4cHJlc3Npb25zIGVuc3VyZWQgYnkgZW5zdXJlX3ggYW5kIGNvbnN0YW50c1xuICAgIGlmIChvcHRpb25zLmVuc3VyZVgpIHtcbiAgICAgICAgYW5nbGVzTGVmdC0tO1xuICAgICAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKTtcbiAgICAgICAgYW5nbGVzLnB1c2goeCk7XG4gICAgICAgIGxlZnQgLT0geDtcbiAgICB9XG5cbiAgICBpZiAoY29uc3RhbnRzKSB7XG4gICAgICAgIGFuZ2xlc0xlZnQtLTtcbiAgICAgICAgbGV0IGMgPSByYW5kQmV0d2VlbihcbiAgICAgICAgICAgIG9wdGlvbnMubWluQW5nbGUsXG4gICAgICAgICAgICBsZWZ0IC0gb3B0aW9ucy5taW5BbmdsZSAqIGFuZ2xlc0xlZnRcbiAgICAgICAgKTtcbiAgICAgICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigwLCBjKSk7XG4gICAgICAgIGFuZ2xlcy5wdXNoKGMpO1xuICAgICAgICBsZWZ0IC09IGM7XG4gICAgfVxuXG4gICAgLy8gbWlkZGxlIGFuZ2xlc1xuICAgIHdoaWxlIChhbmdsZXNMZWZ0ID4gMSkge1xuICAgICAgICAvLyBhZGQgJ3grYicgYXMgYW4gZXhwcmVzc2lvbi4gTWFrZSBzdXJlIGIgZ2l2ZXMgc3BhY2VcbiAgICAgICAgYW5nbGVzTGVmdC0tO1xuICAgICAgICBsZWZ0IC09IHg7XG4gICAgICAgIGxldCBtYXhiID0gTWF0aC5taW4oXG4gICAgICAgICAgICBsZWZ0IC0gb3B0aW9ucy5taW5BbmdsZSAqIGFuZ2xlc0xlZnQsXG4gICAgICAgICAgICBvcHRpb25zLm1heENvbnN0YW50XG4gICAgICAgICk7XG4gICAgICAgIGxldCBtaW5iID0gTWF0aC5tYXgoXG4gICAgICAgICAgICBvcHRpb25zLm1pbkFuZ2xlIC0geCxcbiAgICAgICAgICAgIC1vcHRpb25zLm1heENvbnN0YW50XG4gICAgICAgICk7XG4gICAgICAgIGxldCBiID0gcmFuZEJldHdlZW4obWluYiwgbWF4Yik7XG4gICAgICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgYikpO1xuICAgICAgICBhbmdsZXMucHVzaCh4ICsgYik7XG4gICAgICAgIGxlZnQgLT0gYjtcbiAgICB9XG5cbiAgICAvLyBsYXN0IGFuZ2xlXG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCBsZWZ0IC0geCkpO1xuICAgIGFuZ2xlcy5wdXNoKGxlZnQpO1xuXG4gICAgcmV0dXJuIGV4cHJlc3Npb25zXG59XG5cbmZ1bmN0aW9uIG1ha2VNdWx0aXBsaWNhdGlvbkV4cHJlc3Npb25zKG46IG51bWJlciwgb3B0aW9uczogT3B0aW9ucykgOiBMaW5FeHByW10ge1xuICAgIGxldCBleHByZXNzaW9ucyA6IExpbkV4cHJbXSA9IFtdXG5cbiAgICAvLyBjaG9vc2UgYSB0b3RhbCBvZiBjb2VmZmljaWVudHNcbiAgICAvLyBwaWNrIHggYmFzZWQgb24gdGhhdFxuICAgIGNvbnN0IGNvbnN0YW50cyA9IChvcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPT09IHRydWUgfHwgd2Vha0luY2x1ZGVzKG9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cywgJ211bHQnKSk7XG4gICAgaWYgKG4gPT09IDIgJiYgb3B0aW9ucy5lbnN1cmVYICYmIGNvbnN0YW50cykgbiA9IDM7XG5cbiAgICBsZXQgYW5nbGVzbGVmdCA9IG47XG4gICAgY29uc3QgdG90YWxDb2VmZiA9IGNvbnN0YW50cyA/XG4gICAgICAgIHJhbmRCZXR3ZWVuKG4sIChvcHRpb25zLmFuZ2xlU3VtIC0gb3B0aW9ucy5taW5BbmdsZSkgLyBvcHRpb25zLm1pbkFuZ2xlLCBNYXRoLnJhbmRvbSkgOiAvLyBpZiBpdCdzIHRvbyBiaWcsIGFuZ2xlcyBnZXQgdG9vIHNtYWxsXG4gICAgICAgIHJhbmRFbGVtKFszLCA0LCA1LCA2LCA4LCA5LCAxMF0uZmlsdGVyKHggPT4geCA+PSBuKSwgTWF0aC5yYW5kb20pO1xuICAgIGxldCBjb2VmZmxlZnQgPSB0b3RhbENvZWZmO1xuICAgIGxldCBsZWZ0ID0gb3B0aW9ucy5hbmdsZVN1bTtcblxuICAgIC8vIGZpcnN0IDAvMS8yXG4gICAgaWYgKGNvbnN0YW50cykge1xuICAgICAgICAvLyByZWR1Y2UgdG8gbWFrZSB3aGF0J3MgbGVmdCBhIG11bHRpcGxlIG9mIHRvdGFsX2NvZWZmXG4gICAgICAgIGFuZ2xlc2xlZnQtLTtcbiAgICAgICAgbGV0IG5ld2xlZnQgPSByYW5kTXVsdEJldHdlZW4odG90YWxDb2VmZiAqIG9wdGlvbnMubWluQW5nbGUsIG9wdGlvbnMuYW5nbGVTdW0gLSBvcHRpb25zLm1pbkFuZ2xlLCB0b3RhbENvZWZmKTtcbiAgICAgICAgbGV0IGMgPSBvcHRpb25zLmFuZ2xlU3VtIC0gbmV3bGVmdDtcbiAgICAgICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigwLCBjKSk7XG4gICAgICAgIGxlZnQgLT0gbmV3bGVmdDtcbiAgICB9XG5cbiAgICBsZXQgeCA9IGxlZnQgLyB0b3RhbENvZWZmO1xuXG4gICAgaWYgKG9wdGlvbnMuZW5zdXJlWCkge1xuICAgICAgICBhbmdsZXNsZWZ0LS07XG4gICAgICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgMCkpO1xuICAgICAgICBjb2VmZmxlZnQgLT0gMTtcbiAgICB9XG5cbiAgICAvL21pZGRsZVxuICAgIHdoaWxlIChhbmdsZXNsZWZ0ID4gMSkge1xuICAgICAgICBhbmdsZXNsZWZ0LS07XG4gICAgICAgIGxldCBtaW5hID0gMTtcbiAgICAgICAgbGV0IG1heGEgPSBjb2VmZmxlZnQgLSBhbmdsZXNsZWZ0OyAvLyBsZWF2ZSBlbm91Z2ggZm9yIG90aGVycyBUT0RPOiBhZGQgbWF4X2NvZWZmXG4gICAgICAgIGxldCBhID0gcmFuZEJldHdlZW4obWluYSwgbWF4YSk7XG4gICAgICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoYSwgMCkpO1xuICAgICAgICBjb2VmZmxlZnQgLT0gYTtcbiAgICB9XG5cbiAgICAvL2xhc3RcbiAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKGNvZWZmbGVmdCwgMCkpO1xuICAgIHJldHVybiBleHByZXNzaW9uc1xufSIsImltcG9ydCBQb2ludCBmcm9tIFwiUG9pbnRcIjtcbmltcG9ydCB7IExhYmVsIH0gZnJvbSBcIi4uL0dyYXBoaWNRXCI7XG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGZyb20gXCIuL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YVwiO1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGZyb20gXCIuL01pc3NpbmdBbmdsZXNBcm91bmRWaWV3XCI7XG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMgfSBmcm9tIFwiLi9NaXNzaW5nQW5nbGVzVmlld09wdGlvbnNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3IGV4dGVuZHMgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcge1xuICAgIE8gOiBQb2ludFxuICAgIEE6IFBvaW50XG4gICAgQzogUG9pbnRbXVxuICAgIGxhYmVsczogTGFiZWxbXVxuICAgIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnRcbiAgICBET006IEhUTUxFbGVtZW50XG4gICAgcm90YXRpb246IG51bWJlclxuICAgIHdpZHRoOiBudW1iZXJcbiAgICBoZWlnaHQ6IG51bWJlclxuICAgIGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YVxuXG4gICAgY29uc3RydWN0b3IoIGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSwgb3B0aW9uczogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIHN1cGVyIGNvbnN0cnVjdG9yIGRvZXMgcmVhbCB3b3JrXG4gICAgICAgIGNvbnN0IHNvbHV0aW9uTGFiZWw6IFBhcnRpYWw8TGFiZWw+ID0ge1xuICAgICAgICAgICAgcG9zOiBuZXcgUG9pbnQoMTAsIHRoaXMuaGVpZ2h0IC0gMTApLFxuICAgICAgICAgICAgdGV4dHE6ICcnLFxuICAgICAgICAgICAgdGV4dGE6IGB4ID0gJHt0aGlzLmRhdGEueH1eXFxcXGNpcmNgLFxuICAgICAgICAgICAgc3R5bGVxOiAnaGlkZGVuJyxcbiAgICAgICAgICAgIHN0eWxlYTogJ2V4dHJhLWFuc3dlcicsXG4gICAgICAgIH1cbiAgICAgICAgc29sdXRpb25MYWJlbC5zdHlsZSA9IHNvbHV0aW9uTGFiZWwuc3R5bGVxXG4gICAgICAgIHNvbHV0aW9uTGFiZWwudGV4dCA9IHNvbHV0aW9uTGFiZWwudGV4dHFcblxuICAgICAgICB0aGlzLmxhYmVscy5wdXNoKHNvbHV0aW9uTGFiZWwgYXMgTGFiZWwpXG4gICAgfVxuXG59IiwiLyoqIE1pc3NpbmcgYW5nbGVzIGFyb3VuZCBhIHBvaW50IG9yIG9uIGEgc3RyYWlnaHQgbGluZSwgdXNpbmcgYWxnZWJyYWljIGV4cHJlc3Npb25zICovXG5cbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgeyBBbGdlYnJhT3B0aW9ucyB9IGZyb20gJy4vQWxnZWJyYU9wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlldyBmcm9tICcuL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlldydcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YVxuICB2aWV3OiBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXdcblxuICBjb25zdHJ1Y3RvciAoZGF0YTogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLCB2aWV3OiBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcpIHsgLy8gZWZmZWN0aXZlbHkgcHJpdmF0ZVxuICAgIHN1cGVyKCkgLy8gYnViYmxlcyB0byBRXG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIHRoaXMudmlldyA9IHZpZXdcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IEFsZ2VicmFPcHRpb25zLCB2aWV3T3B0aW9uczogTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSB7XG4gICAgY29uc3QgZGVmYXVsdHMgOiBBbGdlYnJhT3B0aW9ucyA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5BbmdsZTogMTAsXG4gICAgICBtaW5OOiAyLFxuICAgICAgbWF4TjogNCxcbiAgICAgIHJlcGVhdGVkOiBmYWxzZSxcbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlldyhkYXRhLCB2aWV3T3B0aW9ucykgLy8gVE9ETyBlbGltaW5hdGUgcHVibGljIGNvbnN0cnVjdG9yc1xuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tIFwiUG9pbnRcIjtcbmltcG9ydCB7IExhYmVsIH0gZnJvbSBcIi4uL0dyYXBoaWNRXCI7XG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZnJvbSBcIi4vTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXdcIjtcbmltcG9ydCBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSBmcm9tIFwiLi9NaXNzaW5nQW5nbGVzV29yZGVkRGF0YVwiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlldyBleHRlbmRzIE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IHtcbiAgZGF0YTogTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGFcbiAgY29uc3RydWN0b3IgKGRhdGEsIG9wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBkb2VzIG1vc3Qgb2YgdGhlIHNldCB1cFxuICAgIHN1cGVyLnRyYW5zbGF0ZSgwLC0xNSlcbiAgICAgIGxldCBpbnN0cnVjdGlvbkxhYmVsIDogTGFiZWwgPSB7XG4gICAgICAgIHRleHRxOiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICAgIHRleHRhOiB0aGlzLmRhdGEuaW5zdHJ1Y3Rpb25zLmpvaW4oJ1xcXFxcXFxcJyksXG4gICAgICAgIHRleHQ6IHRoaXMuZGF0YS5pbnN0cnVjdGlvbnMuam9pbignXFxcXFxcXFwnKSxcbiAgICAgICAgc3R5bGVxOiAnZXh0cmEtaW5mbycsXG4gICAgICAgIHN0eWxlYTogJ2V4dHJhLWluZm8nLFxuICAgICAgICBzdHlsZTogJ2V4dHJhLWluZm8nLFxuICAgICAgICBwb3M6IG5ldyBQb2ludCgxMCwgdGhpcy5oZWlnaHQtMTApXG4gICAgfVxuICAgICAgdGhpcy5sYWJlbHMucHVzaChpbnN0cnVjdGlvbkxhYmVsKVxuICB9XG59IiwiaW1wb3J0IExpbkV4cHIgZnJvbSBcIkxpbkV4cHJcIjtcbmltcG9ydCB7IHJhbmRCZXR3ZWVuLCByYW5kRWxlbSwgcmFuZE11bHRCZXR3ZWVuIH0gZnJvbSBcIlV0aWxpdGllc1wiO1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tIFwiLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGFcIjtcbmltcG9ydCB7IHNvbHZlQW5nbGVzIH0gZnJvbSBcIi4vc29sdmVBbmdsZXNcIjtcbmltcG9ydCB7IFdvcmRlZE9wdGlvbnMgfSBmcm9tIFwiLi9Xb3JkZWRPcHRpb25zXCI7XG5cblxuZXhwb3J0IHR5cGUgV29yZGVkVHlwZSA9ICdhZGQnIHwgJ211bHRpcGx5JyB8ICdyYXRpbycgfCAncGVyY2VudCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgZXh0ZW5kcyBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEge1xuICBhbmdsZXM6IG51bWJlcltdICAgICAgICAvLyBJbmhlcml0ZWRcbiAgbWlzc2luZzogYm9vbGVhbltdICAgICAgLy8gICAgfFxuICBhbmdsZVN1bTogbnVtYmVyICAgICAgICAvLyAgICB8XG4gIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSAgIC8vICAgIHZcbiAgaW5zdHJ1Y3Rpb25zOiBzdHJpbmdbXSAgLy8gVGhlICdpbnN0cnVjdGlvbnMnIGdpdmVuXG4gIHg6IG51bWJlciAgICAgICAgICAgICAgIC8vIHVudXNlZCBidXQgaW5oZXJpdGVkXG5cbiAgY29uc3RydWN0b3IoYW5nbGVzOiBudW1iZXJbXSwgbWlzc2luZzogYm9vbGVhbltdLCBhbmdsZVN1bTogbnVtYmVyLCBhbmdsZUxhYmVsczogc3RyaW5nW10saW5zdHJ1Y3Rpb25zOiBzdHJpbmdbXSkge1xuICAgIHN1cGVyKGFuZ2xlcyxtaXNzaW5nLGFuZ2xlU3VtLGFuZ2xlTGFiZWxzLG51bGwpXG4gICAgdGhpcy5pbnN0cnVjdGlvbnMgPSBpbnN0cnVjdGlvbnNcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20ob3B0aW9ucyA6IFdvcmRlZE9wdGlvbnMpIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IFdvcmRlZE9wdGlvbnMgPSB7XG4gICAgICBtaW5OOiAyLFxuICAgICAgbWF4TjogMixcbiAgICAgIG1pbkFuZ2xlOiAxMCxcbiAgICAgIG1pbkFkZGVuZDogLTkwLFxuICAgICAgbWF4QWRkZW5kOiA5MCxcbiAgICAgIG1pbk11bHRpcGxpZXI6IDEsXG4gICAgICBtYXhNdWx0aXBsaWVyOiA1LFxuICAgICAgdHlwZXM6IFtcImFkZFwiLCBcIm11bHRpcGx5XCIsIFwicGVyY2VudFwiLCBcInJhdGlvXCJdXG4gICAgfVxuICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LGRlZmF1bHRzLG9wdGlvbnMpXG5cbiAgICBjb25zdCBuID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5OLCBvcHRpb25zLm1heE4pO1xuICAgIGNvbnN0IGFuZ2xlTGFiZWxzOiBzdHJpbmdbXSA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGk8bjsgaSsrKSB7XG4gICAgICBhbmdsZUxhYmVsc1tpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoNjUraSkgLy8gNjUgPSAnQSdcbiAgICB9XG4gICAgbGV0IGV4cHJlc3Npb25zOiBMaW5FeHByW10gPSBbXVxuICAgIGxldCBpbnN0cnVjdGlvbnM6IHN0cmluZ1tdID0gW11cbiAgICBsZXQgYW5nbGVzOiBudW1iZXJbXVxuICAgIGxldCB4OiBudW1iZXJcblxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgMCkpXG5cbiAgICAvLyBMb29wIHRpbCB3ZSBnZXQgb25lIHRoYXQgd29ya3NcbiAgICAvLyBQcm9iYWJseSByZWFsbHkgaW5lZmZpY2llbnQhIVxuXG4gICAgbGV0IHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICBsZXQgYXR0ZW1wdGNvdW50ID0gMDtcbiAgICB3aGlsZSAoIXN1Y2Nlc3MpIHtcbiAgICAgIGlmIChhdHRlbXB0Y291bnQgPiAyMCkge1xuICAgICAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJHYXZlIHVwIGFmdGVyIFwiICsgYXR0ZW1wdGNvdW50ICsgXCIgYXR0ZW1wdHNcIik7XG4gICAgICAgIHN1Y2Nlc3MgPSB0cnVlO1xuICAgICAgfVxuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgY29uc3QgdHlwZSA9IHJhbmRFbGVtKG9wdGlvbnMudHlwZXMpO1xuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICBjYXNlIFwiYWRkXCI6IHtcbiAgICAgICAgICAgIGNvbnN0IGFkZGVuZCA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluQWRkZW5kLCBvcHRpb25zLm1heEFkZGVuZCk7XG4gICAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb25zW2kgLSAxXS5hZGQoYWRkZW5kKSk7XG4gICAgICAgICAgICBpbnN0cnVjdGlvbnMucHVzaChgXFxcXHRleHR7QW5nbGUgJCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpfSQgaXMgJHtjb21wYXJhdG9yKGFkZGVuZCwgXCIrXCIpfSBhbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY0ICsgaSl9JH1gKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlIFwibXVsdGlwbHlcIjoge1xuICAgICAgICAgICAgY29uc3QgbXVsdGlwbGllciA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTXVsdGlwbGllciwgb3B0aW9ucy5tYXhNdWx0aXBsaWVyKTtcbiAgICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2goZXhwcmVzc2lvbnNbaSAtIDFdLnRpbWVzKG11bHRpcGxpZXIpKTtcbiAgICAgICAgICAgIGluc3RydWN0aW9ucy5wdXNoKGBcXFxcdGV4dHtBbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSl9JCBpcyAke2NvbXBhcmF0b3IobXVsdGlwbGllciwgXCIqXCIpfSBhbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY0ICsgaSl9JH1gKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlIFwicGVyY2VudFwiOiB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50YWdlID0gcmFuZE11bHRCZXR3ZWVuKDUsIDEwMCwgNSk7XG4gICAgICAgICAgICBjb25zdCBpbmNyZWFzZSA9IE1hdGgucmFuZG9tKCkgPCAwLjUgPyB0cnVlIDogZmFsc2U7XG4gICAgICAgICAgICBjb25zdCBtdWx0aXBsaWVyID0gaW5jcmVhc2UgPyAxICsgcGVyY2VudGFnZSAvIDEwMCA6IDEgLSBwZXJjZW50YWdlIC8gMTAwO1xuICAgICAgICAgICAgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uc1tpIC0gMV0udGltZXMobXVsdGlwbGllcikpO1xuICAgICAgICAgICAgaW5zdHJ1Y3Rpb25zLnB1c2goXG4gICAgICAgICAgICAgIGBcXFxcdGV4dHtBbmdsZSAkJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSl9JCBpcyAkJHtwZXJjZW50YWdlfVxcXFwlJCAke2luY3JlYXNlID8gXCJiaWdnZXJcIiA6IFwic21hbGxlclwifSB0aGFuIGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjQgKyBpKX0kfWApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgXCJyYXRpb1wiOiB7XG4gICAgICAgICAgICBjb25zdCBhID0gcmFuZEJldHdlZW4oMSwgMTApO1xuICAgICAgICAgICAgY29uc3QgYiA9IHJhbmRCZXR3ZWVuKDEsIDEwKTtcbiAgICAgICAgICAgIGNvbnN0IG11bHRpcGxpZXIgPSBiIC8gYTtcbiAgICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2goZXhwcmVzc2lvbnNbaSAtIDFdLnRpbWVzKG11bHRpcGxpZXIpKTtcbiAgICAgICAgICAgIGluc3RydWN0aW9ucy5wdXNoKFxuICAgICAgICAgICAgICBgXFxcXHRleHR7VGhlIHJhdGlvIG9mIGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjQgKyBpKX0kIHRvIGFuZ2xlICQke1N0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKX0kIGlzICQke2F9OiR7Yn0kfWBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBjaGVjayBpdCBtYWtlcyBzZW5zZVxuICAgICAgc3VjY2VzcyA9IHRydWU7XG4gICAgICBsZXQgZXhwcmVzc2lvbnN1bSA9IGV4cHJlc3Npb25zLnJlZHVjZSgoZXhwMSwgZXhwMikgPT4gZXhwMS5hZGQoZXhwMikpO1xuICAgICAgbGV0IHggPSBMaW5FeHByLnNvbHZlKGV4cHJlc3Npb25zdW0sIG5ldyBMaW5FeHByKDAsIG9wdGlvbnMuYW5nbGVTdW0pKTtcblxuICAgICAgZXhwcmVzc2lvbnMuZm9yRWFjaChmdW5jdGlvbiAoZXhwcikge1xuICAgICAgICBpZiAoIXN1Y2Nlc3MgfHwgZXhwci5ldmFsKHgpIDwgb3B0aW9ucy5taW5BbmdsZSkge1xuICAgICAgICAgIHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICAgICAgICBpbnN0cnVjdGlvbnMgPSBbXTtcbiAgICAgICAgICBleHByZXNzaW9ucyA9IFtleHByZXNzaW9uc1swXV07XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBhdHRlbXB0Y291bnQrKztcbiAgICB9XG4gICAgY29uc29sZS5sb2coXCJBdHRlbXB0czogXCIgKyBhdHRlbXB0Y291bnQpO1xuXG4gICAgKHt4LCBhbmdsZXN9ID0gc29sdmVBbmdsZXMoZXhwcmVzc2lvbnMsb3B0aW9ucy5hbmdsZVN1bSkpXG4gICAgY29uc3QgbWlzc2luZyA9IGFuZ2xlcy5tYXAoIHg9PnRydWUpXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVzLG1pc3Npbmcsb3B0aW9ucy5hbmdsZVN1bSxhbmdsZUxhYmVscyxpbnN0cnVjdGlvbnMpXG4gIH1cbn1cblxuLyoqXG4gKiBHZW5lcmF0ZXMgd29yZGVkIHZlcnNpb24gb2YgYW4gb3BlcmF0aW8gXG4gKiBAcGFyYW0gbnVtYmVyIFRoZSBtdWx0aXBsaWVyIG9yIGFkZGVuZFxuICogQHBhcmFtIG9wZXJhdG9yIFRoZSBvcGVyYXRvciwgZS5nIGFkZGluZyAnbW9yZSB0aGFuJywgb3IgbXVsdGlwbHlpbmcgJ3RpbWVzIGxhcmdlciB0aGFuJ1xuICovXG5mdW5jdGlvbiBjb21wYXJhdG9yKG51bWJlcjogbnVtYmVyLCBvcGVyYXRvcjogJyonfCcrJykge1xuICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgY2FzZSBcIipcIjpcbiAgICAgIHN3aXRjaCAobnVtYmVyKSB7XG4gICAgICAgIGNhc2UgMTogcmV0dXJuIFwidGhlIHNhbWUgYXNcIjtcbiAgICAgICAgY2FzZSAyOiByZXR1cm4gXCJkb3VibGVcIjtcbiAgICAgICAgZGVmYXVsdDogcmV0dXJuIGAkJHtudW1iZXJ9JCB0aW1lcyBsYXJnZXIgdGhhbmA7XG4gICAgICB9XG4gICAgY2FzZSBcIitcIjpcbiAgICAgIHN3aXRjaCAobnVtYmVyKSB7XG4gICAgICAgIGNhc2UgMDogcmV0dXJuIFwidGhlIHNhbWUgYXNcIjtcbiAgICAgICAgZGVmYXVsdDogcmV0dXJuIGAkJHtNYXRoLmFicyhudW1iZXIpLnRvU3RyaW5nKCl9XlxcXFxjaXJjJCAkeyhudW1iZXIgPCAwKSA/IFwibGVzcyB0aGFuXCIgOiBcIm1vcmUgdGhhblwifWA7XG4gICAgICB9XG4gIH1cbn0iLCJpbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gXCIuLi9HcmFwaGljUVwiO1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3IGZyb20gXCIuL01pc3NpbmdBbmdsZXNBcm91bmRXb3JkZWRWaWV3XCI7XG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEgZnJvbSBcIi4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGFcIjtcbmltcG9ydCB7IFdvcmRlZE9wdGlvbnMgfSBmcm9tIFwiLi9Xb3JkZWRPcHRpb25zXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNXb3JkZWRRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBkYXRhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YVxuICB2aWV3OiBNaXNzaW5nQW5nbGVzQXJvdW5kV29yZGVkVmlld1xuXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzV29yZGVkRGF0YSwgdmlldzogTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5kYXRhID0gZGF0YVxuICAgIHRoaXMudmlldyA9IHZpZXdcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IFdvcmRlZE9wdGlvbnMsIHZpZXdPcHRpb25zKSB7XG4gICAgY29uc3QgZGVmYXVsdHMgOiBXb3JkZWRPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAxMCxcbiAgICAgIG1pbk46IDIsXG4gICAgICBtYXhOOiAyLFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlLFxuICAgIH1cbiAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSxkZWZhdWx0cyxvcHRpb25zKVxuXG4gICAgdmlld09wdGlvbnMgPSB2aWV3T3B0aW9ucyB8fCB7fVxuXG4gICAgY29uc3QgZGF0YSA9IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZFdvcmRlZFZpZXcgKGRhdGEsIHZpZXdPcHRpb25zKVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGRhdGEsdmlldylcbiAgfVxufSIsIi8qKiAgQ2xhc3MgdG8gd3JhcCB2YXJpb3VzIG1pc3NpbmcgYW5nbGVzIGNsYXNzZXNcbiAqIFJlYWRzIG9wdGlvbnMgYW5kIHRoZW4gd3JhcHMgdGhlIGFwcHJvcHJpYXRlIG9iamVjdCwgbWlycm9yaW5nIHRoZSBtYWluXG4gKiBwdWJsaWMgbWV0aG9kc1xuICpcbiAqIFRoaXMgY2xhc3MgZGVhbHMgd2l0aCB0cmFuc2xhdGluZyBkaWZmaWN1bHR5IGludG8gcXVlc3Rpb24gdHlwZXNcbiovXG5cbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVRJ1xuaW1wb3J0IFF1ZXN0aW9uIGZyb20gJ1F1ZXN0aW9uL1F1ZXN0aW9uJ1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuaW1wb3J0IFZpZXdPcHRpb25zIGZyb20gJy4uL1ZpZXdPcHRpb25zJ1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tICcuL0FsZ2VicmFPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSBmcm9tICcuL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNWaWV3T3B0aW9ucyB9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc1ZpZXdPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNXb3JkZWREYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1dvcmRlZERhdGEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1dvcmRlZFEgZnJvbSAnLi9NaXNzaW5nQW5nbGVzV29yZGVkUSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZU9wdGlvbnMgfSBmcm9tICcuL051bWJlck9wdGlvbnMnXG5pbXBvcnQgeyBXb3JkZWRPcHRpb25zIH0gZnJvbSAnLi9Xb3JkZWRPcHRpb25zJ1xuXG50eXBlIFF1ZXN0aW9uVHlwZSA9ICdhb3NsJyB8ICdhYWFwJyB8ICd0cmlhbmdsZSdcbnR5cGUgUXVlc3Rpb25TdWJUeXBlID0gJ3NpbXBsZScgfCAncmVwZWF0ZWQnIHwgJ2FsZ2VicmEnIHwgJ3dvcmRlZCdcblxudHlwZSBRdWVzdGlvbk9wdGlvbnMgPSBNaXNzaW5nQW5nbGVPcHRpb25zICYgQWxnZWJyYU9wdGlvbnMgJiBXb3JkZWRPcHRpb25zXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBxdWVzdGlvbjogR3JhcGhpY1FcblxuICBjb25zdHJ1Y3RvciAocXVlc3Rpb246IEdyYXBoaWNRKSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMucXVlc3Rpb24gPSBxdWVzdGlvblxuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAoXG4gICAgb3B0aW9uczoge1xuICAgICAgdHlwZXM6IFF1ZXN0aW9uVHlwZVtdLFxuICAgICAgZGlmZmljdWx0eTogbnVtYmVyLFxuICAgICAgY3VzdG9tOiBib29sZWFuLFxuICAgICAgc3VidHlwZT86IFF1ZXN0aW9uU3ViVHlwZVxuICAgIH0pIDogTWlzc2luZ0FuZ2xlc1Ege1xuICAgIGlmIChvcHRpb25zLnR5cGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUeXBlcyBsaXN0IG11c3QgYmUgbm9uLWVtcHR5JylcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlID0gcmFuZEVsZW0ob3B0aW9ucy50eXBlcylcbiAgICBsZXQgc3VidHlwZSA6IFF1ZXN0aW9uU3ViVHlwZVxuICAgIGxldCBxdWVzdGlvbk9wdGlvbnMgOiBRdWVzdGlvbk9wdGlvbnMgPSB7fVxuXG4gICAgc3dpdGNoIChvcHRpb25zLmRpZmZpY3VsdHkpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgc3VidHlwZSA9ICdzaW1wbGUnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDJcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgc3VidHlwZSA9ICdzaW1wbGUnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gM1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDRcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgc3VidHlwZSA9ICdyZXBlYXRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAzXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gNFxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA0OlxuICAgICAgICBzdWJ0eXBlID0gJ2FsZ2VicmEnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5leHByZXNzaW9uVHlwZXMgPSBbJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPSBmYWxzZVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDJcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSA0XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDU6XG4gICAgICAgIHN1YnR5cGU9J2FsZ2VicmEnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5leHByZXNzaW9uVHlwZXMgPSBbJ2FkZCcsJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPSBbJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmVuc3VyZVggPSB0cnVlXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNjpcbiAgICAgICAgc3VidHlwZSA9ICdhbGdlYnJhJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuZXhwcmVzc2lvblR5cGVzID0gWydtaXhlZCddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNzpcbiAgICAgICAgc3VidHlwZSA9ICd3b3JkZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy50eXBlcz0gW3JhbmRFbGVtKFsnYWRkJywgJ211bHRpcGx5J10pXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gMlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA4OlxuICAgICAgICBzdWJ0eXBlID0gJ3dvcmRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnR5cGVzID0gWydhZGQnLCdtdWx0aXBseSddXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gcXVlc3Rpb25PcHRpb25zLm1heE4gPSAzXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDk6XG4gICAgICAgIHN1YnR5cGUgPSAnd29yZGVkJ1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMudHlwZXMgPSBbJ211bHRpcGx5JywncmF0aW8nXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSAxMDpcbiAgICAgICAgc3VidHlwZSA9ICd3b3JkZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy50eXBlcyA9IFsnbXVsdGlwbHknLCdhZGQnLCdyYXRpbycsJ3BlcmNlbnQnXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gM1xuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4ndCBnZW5lcmF0ZSBkaWZmaWN1bHR5ICR7b3B0aW9ucy5kaWZmaWN1bHR5fWApXG5cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5yYW5kb21Gcm9tVHlwZVdpdGhPcHRpb25zKHR5cGUsIHN1YnR5cGUsIHF1ZXN0aW9uT3B0aW9ucylcbiAgfVxuXG4gIHN0YXRpYyByYW5kb21Gcm9tVHlwZVdpdGhPcHRpb25zICh0eXBlOiBRdWVzdGlvblR5cGUsIHN1YnR5cGU/OiBRdWVzdGlvblN1YlR5cGUsIHF1ZXN0aW9uT3B0aW9ucz86IFF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnM/OiBNaXNzaW5nQW5nbGVzVmlld09wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1Ege1xuICAgIGxldCBxdWVzdGlvbjogR3JhcGhpY1FcbiAgICBxdWVzdGlvbk9wdGlvbnMgPSBxdWVzdGlvbk9wdGlvbnMgfHwge31cbiAgICB2aWV3T3B0aW9ucyA9IHZpZXdPcHRpb25zIHx8IHt9XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICBjYXNlICdhYWFwJzpcbiAgICAgIGNhc2UgJ2Fvc2wnOiB7XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5hbmdsZVN1bSA9ICh0eXBlID09PSAnYWFhcCcpID8gMzYwIDogMTgwXG4gICAgICAgIHN3aXRjaCAoc3VidHlwZSkge1xuICAgICAgICAgIGNhc2UgJ3NpbXBsZSc6XG4gICAgICAgICAgY2FzZSAncmVwZWF0ZWQnOlxuICAgICAgICAgICAgcXVlc3Rpb25PcHRpb25zLnJlcGVhdGVkID0gc3VidHlwZSA9PT0gJ3JlcGVhdGVkJ1xuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzQXJvdW5kUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAnYWxnZWJyYSc6XG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zLCB2aWV3T3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAnd29yZGVkJzpcbiAgICAgICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc1dvcmRlZFEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgKGB1bmV4cGVjdGVkIHN1YnR5cGUgJHtzdWJ0eXBlfWApXG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3RyaWFuZ2xlJzoge1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMucmVwZWF0ZWQgPSAoc3VidHlwZSA9PT0gXCJyZXBlYXRlZFwiKVxuICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucywgdmlld09wdGlvbnMpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdHlwZSAke3R5cGV9YClcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNRKHF1ZXN0aW9uKVxuICB9XG5cbiAgZ2V0RE9NICgpIDogSFRNTEVsZW1lbnQgeyByZXR1cm4gdGhpcy5xdWVzdGlvbi5nZXRET00oKSB9XG4gIHJlbmRlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLnJlbmRlcigpIH1cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLnNob3dBbnN3ZXIoKSB9XG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5oaWRlQW5zd2VyKCkgfVxuICB0b2dnbGVBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi50b2dnbGVBbnN3ZXIoKSB9XG5cbiAgc3RhdGljIGdldCBvcHRpb25zU3BlYyAoKSA6IHVua25vd25bXSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICBpZDogJ3R5cGVzJyxcbiAgICAgICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgICAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICAgICAgeyB0aXRsZTogJ09uIGEgc3RyYWlnaHQgbGluZScsIGlkOiAnYW9zbCcgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnQXJvdW5kIGEgcG9pbnQnLCBpZDogJ2FhYXAnIH0sXG4gICAgICAgICAgeyB0aXRsZTogJ1RyaWFuZ2xlJywgaWQ6ICd0cmlhbmdsZScgfVxuICAgICAgICBdLFxuICAgICAgICBkZWZhdWx0OiBbJ2Fvc2wnLCAnYWFhcCcsICd0cmlhbmdsZSddLFxuICAgICAgICB2ZXJ0aWNhbDogdHJ1ZVxuICAgICAgfVxuICAgIF1cbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcge1xuICAgIHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZSdcbiAgfVxufVxuIiwiaW1wb3J0IEFsZ2VicmFpY0ZyYWN0aW9uUSBmcm9tICdRdWVzdGlvbi9UZXh0US9BbGdlYnJhaWNGcmFjdGlvblEnXG5pbXBvcnQgSW50ZWdlckFkZFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvSW50ZWdlckFkZCdcbmltcG9ydCBBcml0aG1hZ29uUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9Bcml0aG1hZ29uUSdcbmltcG9ydCBUZXN0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXN0USdcbmltcG9ydCBBZGRBWmVybyBmcm9tICdRdWVzdGlvbi9UZXh0US9BZGRBWmVybydcbmltcG9ydCBFcXVhdGlvbk9mTGluZSBmcm9tICdRdWVzdGlvbi9UZXh0US9FcXVhdGlvbk9mTGluZSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNXcmFwcGVyJ1xuXG5pbXBvcnQgT3B0aW9uc1NldCBmcm9tICdPcHRpb25zU2V0J1xuXG5jb25zdCB0b3BpY0xpc3QgPSBbXG4gIHtcbiAgICBpZDogJ2FsZ2VicmFpYy1mcmFjdGlvbicsXG4gICAgdGl0bGU6ICdTaW1wbGlmeSBhbGdlYnJhaWMgZnJhY3Rpb25zJyxcbiAgICBjbGFzczogQWxnZWJyYWljRnJhY3Rpb25RXG4gIH0sXG4gIHtcbiAgICBpZDogJ2FkZC1hLXplcm8nLFxuICAgIHRpdGxlOiAnTXVsdGlwbHkgYnkgMTAgKGhvbmVzdCEpJyxcbiAgICBjbGFzczogQWRkQVplcm9cbiAgfSxcbiAge1xuICAgIGlkOiAnaW50ZWdlci1hZGQnLFxuICAgIHRpdGxlOiAnQWRkIGludGVnZXJzICh2IHNpbXBsZSknLFxuICAgIGNsYXNzOiBJbnRlZ2VyQWRkUVxuICB9LFxuICB7XG4gICAgaWQ6ICdtaXNzaW5nLWFuZ2xlcycsXG4gICAgdGl0bGU6ICdNaXNzaW5nIGFuZ2xlcycsXG4gICAgY2xhc3M6IE1pc3NpbmdBbmdsZXNRXG4gIH0sXG4gIHtcbiAgICBpZDogJ2VxdWF0aW9uLW9mLWxpbmUnLFxuICAgIHRpdGxlOiAnRXF1YXRpb24gb2YgYSBsaW5lIChmcm9tIHR3byBwb2ludHMpJyxcbiAgICBjbGFzczogRXF1YXRpb25PZkxpbmVcbiAgfSxcbiAge1xuICAgIGlkOiAnYXJpdGhtYWdvbi1hZGQnLFxuICAgIHRpdGxlOiAnQXJpdGhtYWdvbnMnLFxuICAgIGNsYXNzOiBBcml0aG1hZ29uUVxuICB9LFxuICB7XG4gICAgaWQ6ICd0ZXN0JyxcbiAgICB0aXRsZTogJ1Rlc3QgcXVlc3Rpb25zJyxcbiAgICBjbGFzczogVGVzdFFcbiAgfVxuXVxuXG5mdW5jdGlvbiBnZXRDbGFzcyAoaWQpIHtcbiAgLy8gUmV0dXJuIHRoZSBjbGFzcyBnaXZlbiBhbiBpZCBvZiBhIHF1ZXN0aW9uXG5cbiAgLy8gT2J2aW91c2x5IHRoaXMgaXMgYW4gaW5lZmZpY2llbnQgc2VhcmNoLCBidXQgd2UgZG9uJ3QgbmVlZCBtYXNzaXZlIHBlcmZvcm1hbmNlXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdG9waWNMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHRvcGljTGlzdFtpXS5pZCA9PT0gaWQpIHtcbiAgICAgIHJldHVybiB0b3BpY0xpc3RbaV0uY2xhc3NcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbFxufVxuXG5mdW5jdGlvbiBnZXRUaXRsZSAoaWQpIHtcbiAgLy8gUmV0dXJuIHRpdGxlIG9mIGEgZ2l2ZW4gaWRcbiAgLy9cbiAgcmV0dXJuIHRvcGljTGlzdC5maW5kKHQgPT4gKHQuaWQgPT09IGlkKSkudGl0bGVcbn1cblxuZnVuY3Rpb24gZ2V0Q29tbWFuZFdvcmQgKGlkKSB7XG4gIHJldHVybiBnZXRDbGFzcyhpZCkuY29tbWFuZFdvcmRcbn1cblxuZnVuY3Rpb24gZ2V0VG9waWNzICgpIHtcbiAgLy8gcmV0dXJucyB0b3BpY3Mgd2l0aCBjbGFzc2VzIHN0cmlwcGVkIG91dFxuICByZXR1cm4gdG9waWNMaXN0Lm1hcCh4ID0+ICh7IGlkOiB4LmlkLCB0aXRsZTogeC50aXRsZSB9KSlcbn1cblxuZnVuY3Rpb24gbmV3UXVlc3Rpb24gKGlkLCBvcHRpb25zKSB7XG4gIC8vIHRvIGF2b2lkIHdyaXRpbmcgYGxldCBxID0gbmV3IChUb3BpY0Nob29zZXIuZ2V0Q2xhc3MoaWQpKShvcHRpb25zKVxuICBjb25zdCBRdWVzdGlvbkNsYXNzID0gZ2V0Q2xhc3MoaWQpXG4gIGxldCBxdWVzdGlvblxuICBpZiAoUXVlc3Rpb25DbGFzcy5yYW5kb20pIHtcbiAgICBxdWVzdGlvbiA9IFF1ZXN0aW9uQ2xhc3MucmFuZG9tKG9wdGlvbnMpXG4gIH0gZWxzZSB7XG4gICAgcXVlc3Rpb24gPSBuZXcgUXVlc3Rpb25DbGFzcyhvcHRpb25zKVxuICB9XG4gIHJldHVybiBxdWVzdGlvblxufVxuXG5mdW5jdGlvbiBuZXdPcHRpb25zU2V0IChpZCkge1xuICBjb25zdCBvcHRpb25zU3BlYyA9IChnZXRDbGFzcyhpZCkpLm9wdGlvbnNTcGVjIHx8IFtdXG4gIHJldHVybiBuZXcgT3B0aW9uc1NldChvcHRpb25zU3BlYylcbn1cblxuZnVuY3Rpb24gaGFzT3B0aW9ucyAoaWQpIHtcbiAgcmV0dXJuICEhKGdldENsYXNzKGlkKS5vcHRpb25zU3BlYyAmJiBnZXRDbGFzcyhpZCkub3B0aW9uc1NwZWMubGVuZ3RoID4gMCkgLy8gd2VpcmQgYm9vbCB0eXBjYXN0aW5nIHdvbyFcbn1cblxuZXhwb3J0IHsgdG9waWNMaXN0LCBnZXRDbGFzcywgbmV3UXVlc3Rpb24sIGdldFRvcGljcywgZ2V0VGl0bGUsIG5ld09wdGlvbnNTZXQsIGdldENvbW1hbmRXb3JkLCBoYXNPcHRpb25zIH1cbiIsIi8qICFcbiogdGluZ2xlLmpzXG4qIEBhdXRob3IgIHJvYmluX3BhcmlzaVxuKiBAdmVyc2lvbiAwLjE1LjJcbiogQHVybFxuKi9cbi8vIE1vZGlmaWVkIHRvIGJlIEVTNiBtb2R1bGVcblxudmFyIGlzQnVzeSA9IGZhbHNlXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIE1vZGFsIChvcHRpb25zKSB7XG4gIHZhciBkZWZhdWx0cyA9IHtcbiAgICBvbkNsb3NlOiBudWxsLFxuICAgIG9uT3BlbjogbnVsbCxcbiAgICBiZWZvcmVPcGVuOiBudWxsLFxuICAgIGJlZm9yZUNsb3NlOiBudWxsLFxuICAgIHN0aWNreUZvb3RlcjogZmFsc2UsXG4gICAgZm9vdGVyOiBmYWxzZSxcbiAgICBjc3NDbGFzczogW10sXG4gICAgY2xvc2VMYWJlbDogJ0Nsb3NlJyxcbiAgICBjbG9zZU1ldGhvZHM6IFsnb3ZlcmxheScsICdidXR0b24nLCAnZXNjYXBlJ11cbiAgfVxuXG4gIC8vIGV4dGVuZHMgY29uZmlnXG4gIHRoaXMub3B0cyA9IGV4dGVuZCh7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgLy8gaW5pdCBtb2RhbFxuICB0aGlzLmluaXQoKVxufVxuXG5Nb2RhbC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMubW9kYWwpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIF9idWlsZC5jYWxsKHRoaXMpXG4gIF9iaW5kRXZlbnRzLmNhbGwodGhpcylcblxuICAvLyBpbnNlcnQgbW9kYWwgaW4gZG9tXG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbCwgZG9jdW1lbnQuYm9keS5maXJzdENoaWxkKVxuXG4gIGlmICh0aGlzLm9wdHMuZm9vdGVyKSB7XG4gICAgdGhpcy5hZGRGb290ZXIoKVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuTW9kYWwucHJvdG90eXBlLl9idXN5ID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gIGlzQnVzeSA9IHN0YXRlXG59XG5cbk1vZGFsLnByb3RvdHlwZS5faXNCdXN5ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gaXNCdXN5XG59XG5cbk1vZGFsLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5tb2RhbCA9PT0gbnVsbCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgLy8gcmVzdG9yZSBzY3JvbGxpbmdcbiAgaWYgKHRoaXMuaXNPcGVuKCkpIHtcbiAgICB0aGlzLmNsb3NlKHRydWUpXG4gIH1cblxuICAvLyB1bmJpbmQgYWxsIGV2ZW50c1xuICBfdW5iaW5kRXZlbnRzLmNhbGwodGhpcylcblxuICAvLyByZW1vdmUgbW9kYWwgZnJvbSBkb21cbiAgdGhpcy5tb2RhbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMubW9kYWwpXG5cbiAgdGhpcy5tb2RhbCA9IG51bGxcbn1cblxuTW9kYWwucHJvdG90eXBlLmlzT3BlbiA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICEhdGhpcy5tb2RhbC5jbGFzc0xpc3QuY29udGFpbnMoJ3RpbmdsZS1tb2RhbC0tdmlzaWJsZScpXG59XG5cbk1vZGFsLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5faXNCdXN5KCkpIHJldHVyblxuICB0aGlzLl9idXN5KHRydWUpXG5cbiAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgLy8gYmVmb3JlIG9wZW4gY2FsbGJhY2tcbiAgaWYgKHR5cGVvZiBzZWxmLm9wdHMuYmVmb3JlT3BlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHNlbGYub3B0cy5iZWZvcmVPcGVuKClcbiAgfVxuXG4gIGlmICh0aGlzLm1vZGFsLnN0eWxlLnJlbW92ZVByb3BlcnR5KSB7XG4gICAgdGhpcy5tb2RhbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgnZGlzcGxheScpXG4gIH0gZWxzZSB7XG4gICAgdGhpcy5tb2RhbC5zdHlsZS5yZW1vdmVBdHRyaWJ1dGUoJ2Rpc3BsYXknKVxuICB9XG5cbiAgLy8gcHJldmVudCBkb3VibGUgc2Nyb2xsXG4gIHRoaXMuX3Njcm9sbFBvc2l0aW9uID0gd2luZG93LnBhZ2VZT2Zmc2V0XG4gIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmFkZCgndGluZ2xlLWVuYWJsZWQnKVxuICBkb2N1bWVudC5ib2R5LnN0eWxlLnRvcCA9IC10aGlzLl9zY3JvbGxQb3NpdGlvbiArICdweCdcblxuICAvLyBzdGlja3kgZm9vdGVyXG4gIHRoaXMuc2V0U3RpY2t5Rm9vdGVyKHRoaXMub3B0cy5zdGlja3lGb290ZXIpXG5cbiAgLy8gc2hvdyBtb2RhbFxuICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC0tdmlzaWJsZScpXG5cbiAgLy8gb25PcGVuIGNhbGxiYWNrXG4gIGlmICh0eXBlb2Ygc2VsZi5vcHRzLm9uT3BlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHNlbGYub3B0cy5vbk9wZW4uY2FsbChzZWxmKVxuICB9XG5cbiAgc2VsZi5fYnVzeShmYWxzZSlcblxuICAvLyBjaGVjayBpZiBtb2RhbCBpcyBiaWdnZXIgdGhhbiBzY3JlZW4gaGVpZ2h0XG4gIHRoaXMuY2hlY2tPdmVyZmxvdygpXG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuTW9kYWwucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKGZvcmNlKSB7XG4gIGlmICh0aGlzLl9pc0J1c3koKSkgcmV0dXJuXG4gIHRoaXMuX2J1c3kodHJ1ZSlcbiAgZm9yY2UgPSBmb3JjZSB8fCBmYWxzZVxuXG4gIC8vICBiZWZvcmUgY2xvc2VcbiAgaWYgKHR5cGVvZiB0aGlzLm9wdHMuYmVmb3JlQ2xvc2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICB2YXIgY2xvc2UgPSB0aGlzLm9wdHMuYmVmb3JlQ2xvc2UuY2FsbCh0aGlzKVxuICAgIGlmICghY2xvc2UpIHtcbiAgICAgIHRoaXMuX2J1c3koZmFsc2UpXG4gICAgICByZXR1cm5cbiAgICB9XG4gIH1cblxuICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoJ3RpbmdsZS1lbmFibGVkJylcbiAgZG9jdW1lbnQuYm9keS5zdHlsZS50b3AgPSBudWxsXG4gIHdpbmRvdy5zY3JvbGxUbyh7XG4gICAgdG9wOiB0aGlzLl9zY3JvbGxQb3NpdGlvbixcbiAgICBiZWhhdmlvcjogJ2luc3RhbnQnXG4gIH0pXG5cbiAgdGhpcy5tb2RhbC5jbGFzc0xpc3QucmVtb3ZlKCd0aW5nbGUtbW9kYWwtLXZpc2libGUnKVxuXG4gIC8vIHVzaW5nIHNpbWlsYXIgc2V0dXAgYXMgb25PcGVuXG4gIHZhciBzZWxmID0gdGhpc1xuXG4gIHNlbGYubW9kYWwuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuXG4gIC8vIG9uQ2xvc2UgY2FsbGJhY2tcbiAgaWYgKHR5cGVvZiBzZWxmLm9wdHMub25DbG9zZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHNlbGYub3B0cy5vbkNsb3NlLmNhbGwodGhpcylcbiAgfVxuXG4gIC8vIHJlbGVhc2UgbW9kYWxcbiAgc2VsZi5fYnVzeShmYWxzZSlcbn1cblxuTW9kYWwucHJvdG90eXBlLnNldENvbnRlbnQgPSBmdW5jdGlvbiAoY29udGVudCkge1xuICAvLyBjaGVjayB0eXBlIG9mIGNvbnRlbnQgOiBTdHJpbmcgb3IgTm9kZVxuICBpZiAodHlwZW9mIGNvbnRlbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgdGhpcy5tb2RhbEJveENvbnRlbnQuaW5uZXJIVE1MID0gY29udGVudFxuICB9IGVsc2Uge1xuICAgIHRoaXMubW9kYWxCb3hDb250ZW50LmlubmVySFRNTCA9ICcnXG4gICAgdGhpcy5tb2RhbEJveENvbnRlbnQuYXBwZW5kQ2hpbGQoY29udGVudClcbiAgfVxuXG4gIGlmICh0aGlzLmlzT3BlbigpKSB7XG4gICAgLy8gY2hlY2sgaWYgbW9kYWwgaXMgYmlnZ2VyIHRoYW4gc2NyZWVuIGhlaWdodFxuICAgIHRoaXMuY2hlY2tPdmVyZmxvdygpXG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuZ2V0Q29udGVudCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMubW9kYWxCb3hDb250ZW50XG59XG5cbk1vZGFsLnByb3RvdHlwZS5hZGRGb290ZXIgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIGFkZCBmb290ZXIgdG8gbW9kYWxcbiAgX2J1aWxkRm9vdGVyLmNhbGwodGhpcylcblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuc2V0Rm9vdGVyQ29udGVudCA9IGZ1bmN0aW9uIChjb250ZW50KSB7XG4gIC8vIHNldCBmb290ZXIgY29udGVudFxuICB0aGlzLm1vZGFsQm94Rm9vdGVyLmlubmVySFRNTCA9IGNvbnRlbnRcblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuZ2V0Rm9vdGVyQ29udGVudCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMubW9kYWxCb3hGb290ZXJcbn1cblxuTW9kYWwucHJvdG90eXBlLnNldFN0aWNreUZvb3RlciA9IGZ1bmN0aW9uIChpc1N0aWNreSkge1xuICAvLyBpZiB0aGUgbW9kYWwgaXMgc21hbGxlciB0aGFuIHRoZSB2aWV3cG9ydCBoZWlnaHQsIHdlIGRvbid0IG5lZWQgc3RpY2t5XG4gIGlmICghdGhpcy5pc092ZXJmbG93KCkpIHtcbiAgICBpc1N0aWNreSA9IGZhbHNlXG4gIH1cblxuICBpZiAoaXNTdGlja3kpIHtcbiAgICBpZiAodGhpcy5tb2RhbEJveC5jb250YWlucyh0aGlzLm1vZGFsQm94Rm9vdGVyKSkge1xuICAgICAgdGhpcy5tb2RhbEJveC5yZW1vdmVDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKVxuICAgICAgdGhpcy5tb2RhbC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKVxuICAgICAgdGhpcy5tb2RhbEJveEZvb3Rlci5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtYm94X19mb290ZXItLXN0aWNreScpXG4gICAgICBfcmVjYWxjdWxhdGVGb290ZXJQb3NpdGlvbi5jYWxsKHRoaXMpXG4gICAgICB0aGlzLm1vZGFsQm94Q29udGVudC5zdHlsZVsncGFkZGluZy1ib3R0b20nXSA9IHRoaXMubW9kYWxCb3hGb290ZXIuY2xpZW50SGVpZ2h0ICsgMjAgKyAncHgnXG4gICAgfVxuICB9IGVsc2UgaWYgKHRoaXMubW9kYWxCb3hGb290ZXIpIHtcbiAgICBpZiAoIXRoaXMubW9kYWxCb3guY29udGFpbnModGhpcy5tb2RhbEJveEZvb3RlcikpIHtcbiAgICAgIHRoaXMubW9kYWwucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlcilcbiAgICAgIHRoaXMubW9kYWxCb3guYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlcilcbiAgICAgIHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUud2lkdGggPSAnYXV0bydcbiAgICAgIHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUubGVmdCA9ICcnXG4gICAgICB0aGlzLm1vZGFsQm94Q29udGVudC5zdHlsZVsncGFkZGluZy1ib3R0b20nXSA9ICcnXG4gICAgICB0aGlzLm1vZGFsQm94Rm9vdGVyLmNsYXNzTGlzdC5yZW1vdmUoJ3RpbmdsZS1tb2RhbC1ib3hfX2Zvb3Rlci0tc3RpY2t5JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuYWRkRm9vdGVyQnRuID0gZnVuY3Rpb24gKGxhYmVsLCBjc3NDbGFzcywgY2FsbGJhY2spIHtcbiAgdmFyIGJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpXG5cbiAgLy8gc2V0IGxhYmVsXG4gIGJ0bi5pbm5lckhUTUwgPSBsYWJlbFxuXG4gIC8vIGJpbmQgY2FsbGJhY2tcbiAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2FsbGJhY2spXG5cbiAgaWYgKHR5cGVvZiBjc3NDbGFzcyA9PT0gJ3N0cmluZycgJiYgY3NzQ2xhc3MubGVuZ3RoKSB7XG4gICAgLy8gYWRkIGNsYXNzZXMgdG8gYnRuXG4gICAgY3NzQ2xhc3Muc3BsaXQoJyAnKS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICBidG4uY2xhc3NMaXN0LmFkZChpdGVtKVxuICAgIH0pXG4gIH1cblxuICB0aGlzLm1vZGFsQm94Rm9vdGVyLmFwcGVuZENoaWxkKGJ0bilcblxuICByZXR1cm4gYnRuXG59XG5cbk1vZGFsLnByb3RvdHlwZS5yZXNpemUgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGNvbnNvbGUud2FybignUmVzaXplIGlzIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiB2ZXJzaW9uIDEuMCcpXG59XG5cbk1vZGFsLnByb3RvdHlwZS5pc092ZXJmbG93ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgdmlld3BvcnRIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHRcbiAgdmFyIG1vZGFsSGVpZ2h0ID0gdGhpcy5tb2RhbEJveC5jbGllbnRIZWlnaHRcblxuICByZXR1cm4gbW9kYWxIZWlnaHQgPj0gdmlld3BvcnRIZWlnaHRcbn1cblxuTW9kYWwucHJvdG90eXBlLmNoZWNrT3ZlcmZsb3cgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIG9ubHkgaWYgdGhlIG1vZGFsIGlzIGN1cnJlbnRseSBzaG93blxuICBpZiAodGhpcy5tb2RhbC5jbGFzc0xpc3QuY29udGFpbnMoJ3RpbmdsZS1tb2RhbC0tdmlzaWJsZScpKSB7XG4gICAgaWYgKHRoaXMuaXNPdmVyZmxvdygpKSB7XG4gICAgICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC0tb3ZlcmZsb3cnKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3RpbmdsZS1tb2RhbC0tb3ZlcmZsb3cnKVxuICAgIH1cblxuICAgIC8vIHRPRE86IHJlbW92ZSBvZmZzZXRcbiAgICAvLyBfb2Zmc2V0LmNhbGwodGhpcyk7XG4gICAgaWYgKCF0aGlzLmlzT3ZlcmZsb3coKSAmJiB0aGlzLm9wdHMuc3RpY2t5Rm9vdGVyKSB7XG4gICAgICB0aGlzLnNldFN0aWNreUZvb3RlcihmYWxzZSlcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNPdmVyZmxvdygpICYmIHRoaXMub3B0cy5zdGlja3lGb290ZXIpIHtcbiAgICAgIF9yZWNhbGN1bGF0ZUZvb3RlclBvc2l0aW9uLmNhbGwodGhpcylcbiAgICAgIHRoaXMuc2V0U3RpY2t5Rm9vdGVyKHRydWUpXG4gICAgfVxuICB9XG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiA9PSBwcml2YXRlIG1ldGhvZHMgKi9cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cbmZ1bmN0aW9uIGNsb3NlSWNvbiAoKSB7XG4gIHJldHVybiAnPHN2ZyB2aWV3Qm94PVwiMCAwIDEwIDEwXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPjxwYXRoIGQ9XCJNLjMgOS43Yy4yLjIuNC4zLjcuMy4zIDAgLjUtLjEuNy0uM0w1IDYuNGwzLjMgMy4zYy4yLjIuNS4zLjcuMy4yIDAgLjUtLjEuNy0uMy40LS40LjQtMSAwLTEuNEw2LjQgNWwzLjMtMy4zYy40LS40LjQtMSAwLTEuNC0uNC0uNC0xLS40LTEuNCAwTDUgMy42IDEuNy4zQzEuMy0uMS43LS4xLjMuM2MtLjQuNC0uNCAxIDAgMS40TDMuNiA1IC4zIDguM2MtLjQuNC0uNCAxIDAgMS40elwiIGZpbGw9XCIjMDAwXCIgZmlsbC1ydWxlPVwibm9uemVyb1wiLz48L3N2Zz4nXG59XG5cbmZ1bmN0aW9uIF9yZWNhbGN1bGF0ZUZvb3RlclBvc2l0aW9uICgpIHtcbiAgaWYgKCF0aGlzLm1vZGFsQm94Rm9vdGVyKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS53aWR0aCA9IHRoaXMubW9kYWxCb3guY2xpZW50V2lkdGggKyAncHgnXG4gIHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUubGVmdCA9IHRoaXMubW9kYWxCb3gub2Zmc2V0TGVmdCArICdweCdcbn1cblxuZnVuY3Rpb24gX2J1aWxkICgpIHtcbiAgLy8gd3JhcHBlclxuICB0aGlzLm1vZGFsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgdGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwnKVxuXG4gIC8vIHJlbW92ZSBjdXNvciBpZiBubyBvdmVybGF5IGNsb3NlIG1ldGhvZFxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5sZW5ndGggPT09IDAgfHwgdGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdvdmVybGF5JykgPT09IC0xKSB7XG4gICAgdGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtLW5vT3ZlcmxheUNsb3NlJylcbiAgfVxuXG4gIHRoaXMubW9kYWwuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuXG4gIC8vIGN1c3RvbSBjbGFzc1xuICB0aGlzLm9wdHMuY3NzQ2xhc3MuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZChpdGVtKVxuICAgIH1cbiAgfSwgdGhpcylcblxuICAvLyBjbG9zZSBidG5cbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignYnV0dG9uJykgIT09IC0xKSB7XG4gICAgdGhpcy5tb2RhbENsb3NlQnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJylcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4udHlwZSA9ICdidXR0b24nXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbF9fY2xvc2UnKVxuXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuSWNvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKVxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bkljb24uY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsX19jbG9zZUljb24nKVxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bkljb24uaW5uZXJIVE1MID0gY2xvc2VJY29uKClcblxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bkxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuTGFiZWwuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsX19jbG9zZUxhYmVsJylcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbC5pbm5lckhUTUwgPSB0aGlzLm9wdHMuY2xvc2VMYWJlbFxuXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuLmFwcGVuZENoaWxkKHRoaXMubW9kYWxDbG9zZUJ0bkljb24pXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuLmFwcGVuZENoaWxkKHRoaXMubW9kYWxDbG9zZUJ0bkxhYmVsKVxuICB9XG5cbiAgLy8gbW9kYWxcbiAgdGhpcy5tb2RhbEJveCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIHRoaXMubW9kYWxCb3guY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsLWJveCcpXG5cbiAgLy8gbW9kYWwgYm94IGNvbnRlbnRcbiAgdGhpcy5tb2RhbEJveENvbnRlbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICB0aGlzLm1vZGFsQm94Q29udGVudC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtYm94X19jb250ZW50JylcblxuICB0aGlzLm1vZGFsQm94LmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3hDb250ZW50KVxuXG4gIGlmICh0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoJ2J1dHRvbicpICE9PSAtMSkge1xuICAgIHRoaXMubW9kYWwuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbENsb3NlQnRuKVxuICB9XG5cbiAgdGhpcy5tb2RhbC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94KVxufVxuXG5mdW5jdGlvbiBfYnVpbGRGb290ZXIgKCkge1xuICB0aGlzLm1vZGFsQm94Rm9vdGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgdGhpcy5tb2RhbEJveEZvb3Rlci5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtYm94X19mb290ZXInKVxuICB0aGlzLm1vZGFsQm94LmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpXG59XG5cbmZ1bmN0aW9uIF9iaW5kRXZlbnRzICgpIHtcbiAgdGhpcy5fZXZlbnRzID0ge1xuICAgIGNsaWNrQ2xvc2VCdG46IHRoaXMuY2xvc2UuYmluZCh0aGlzKSxcbiAgICBjbGlja092ZXJsYXk6IF9oYW5kbGVDbGlja091dHNpZGUuYmluZCh0aGlzKSxcbiAgICByZXNpemU6IHRoaXMuY2hlY2tPdmVyZmxvdy5iaW5kKHRoaXMpLFxuICAgIGtleWJvYXJkTmF2OiBfaGFuZGxlS2V5Ym9hcmROYXYuYmluZCh0aGlzKVxuICB9XG5cbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignYnV0dG9uJykgIT09IC0xKSB7XG4gICAgdGhpcy5tb2RhbENsb3NlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5fZXZlbnRzLmNsaWNrQ2xvc2VCdG4pXG4gIH1cblxuICB0aGlzLm1vZGFsLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMuX2V2ZW50cy5jbGlja092ZXJsYXkpXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLl9ldmVudHMucmVzaXplKVxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgdGhpcy5fZXZlbnRzLmtleWJvYXJkTmF2KVxufVxuXG5mdW5jdGlvbiBfaGFuZGxlS2V5Ym9hcmROYXYgKGV2ZW50KSB7XG4gIC8vIGVzY2FwZSBrZXlcbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignZXNjYXBlJykgIT09IC0xICYmIGV2ZW50LndoaWNoID09PSAyNyAmJiB0aGlzLmlzT3BlbigpKSB7XG4gICAgdGhpcy5jbG9zZSgpXG4gIH1cbn1cblxuZnVuY3Rpb24gX2hhbmRsZUNsaWNrT3V0c2lkZSAoZXZlbnQpIHtcbiAgLy8gb24gbWFjT1MsIGNsaWNrIG9uIHNjcm9sbGJhciAoaGlkZGVuIG1vZGUpIHdpbGwgdHJpZ2dlciBjbG9zZSBldmVudCBzbyB3ZSBuZWVkIHRvIGJ5cGFzcyB0aGlzIGJlaGF2aW9yIGJ5IGRldGVjdGluZyBzY3JvbGxiYXIgbW9kZVxuICB2YXIgc2Nyb2xsYmFyV2lkdGggPSB0aGlzLm1vZGFsLm9mZnNldFdpZHRoIC0gdGhpcy5tb2RhbC5jbGllbnRXaWR0aFxuICB2YXIgY2xpY2tlZE9uU2Nyb2xsYmFyID0gZXZlbnQuY2xpZW50WCA+PSB0aGlzLm1vZGFsLm9mZnNldFdpZHRoIC0gMTUgLy8gMTVweCBpcyBtYWNPUyBzY3JvbGxiYXIgZGVmYXVsdCB3aWR0aFxuICB2YXIgaXNTY3JvbGxhYmxlID0gdGhpcy5tb2RhbC5zY3JvbGxIZWlnaHQgIT09IHRoaXMubW9kYWwub2Zmc2V0SGVpZ2h0XG4gIGlmIChuYXZpZ2F0b3IucGxhdGZvcm0gPT09ICdNYWNJbnRlbCcgJiYgc2Nyb2xsYmFyV2lkdGggPT09IDAgJiYgY2xpY2tlZE9uU2Nyb2xsYmFyICYmIGlzU2Nyb2xsYWJsZSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgLy8gaWYgY2xpY2sgaXMgb3V0c2lkZSB0aGUgbW9kYWxcbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignb3ZlcmxheScpICE9PSAtMSAmJiAhX2ZpbmRBbmNlc3RvcihldmVudC50YXJnZXQsICd0aW5nbGUtbW9kYWwnKSAmJlxuICAgIGV2ZW50LmNsaWVudFggPCB0aGlzLm1vZGFsLmNsaWVudFdpZHRoKSB7XG4gICAgdGhpcy5jbG9zZSgpXG4gIH1cbn1cblxuZnVuY3Rpb24gX2ZpbmRBbmNlc3RvciAoZWwsIGNscykge1xuICB3aGlsZSAoKGVsID0gZWwucGFyZW50RWxlbWVudCkgJiYgIWVsLmNsYXNzTGlzdC5jb250YWlucyhjbHMpKTtcbiAgcmV0dXJuIGVsXG59XG5cbmZ1bmN0aW9uIF91bmJpbmRFdmVudHMgKCkge1xuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdidXR0b24nKSAhPT0gLTEpIHtcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLl9ldmVudHMuY2xpY2tDbG9zZUJ0bilcbiAgfVxuICB0aGlzLm1vZGFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMuX2V2ZW50cy5jbGlja092ZXJsYXkpXG4gIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLl9ldmVudHMucmVzaXplKVxuICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywgdGhpcy5fZXZlbnRzLmtleWJvYXJkTmF2KVxufVxuXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuLyogPT0gaGVscGVycyAqL1xuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuZnVuY3Rpb24gZXh0ZW5kICgpIHtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gYXJndW1lbnRzW2ldKSB7XG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGFyZ3VtZW50c1tpXSwga2V5KSkge1xuICAgICAgICBhcmd1bWVudHNbMF1ba2V5XSA9IGFyZ3VtZW50c1tpXVtrZXldXG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBhcmd1bWVudHNbMF1cbn1cbiIsImltcG9ydCBSU2xpZGVyIGZyb20gJ3ZlbmRvci9yc2xpZGVyJ1xuaW1wb3J0IE9wdGlvbnNTZXQgZnJvbSAnT3B0aW9uc1NldCdcbmltcG9ydCAqIGFzIFRvcGljQ2hvb3NlciBmcm9tICdUb3BpY0Nob29zZXInXG5pbXBvcnQgTW9kYWwgZnJvbSAndmVuZG9yL1RpbmdsZSdcbmltcG9ydCB7IHJhbmRFbGVtLCBjcmVhdGVFbGVtLCBoYXNBbmNlc3RvckNsYXNzLCBib29sT2JqZWN0VG9BcnJheSB9IGZyb20gJ1V0aWxpdGllcydcblxud2luZG93LlNIT1dfRElGRklDVUxUWSA9IGZhbHNlIC8vIGZvciBkZWJ1Z2dpbmcgcXVlc3Rpb25zXG5cbi8qIFRPRE8gbGlzdDpcbiAqIEFkZGl0aW9uYWwgcXVlc3Rpb24gYmxvY2sgLSBwcm9iYWJseSBpbiBtYWluLmpzXG4gKiBab29tL3NjYWxlIGJ1dHRvbnNcbiAqICAgIE5lZWQgdG8gY2hhbmdlIGNzcyBncmlkIHNwYWNpbmcgd2l0aCBKUyBvbiBnZW5lcmF0aW9uXG4gKiBEaXNwbGF5IG9wdGlvbnNcbiAqL1xuXG4vLyBNYWtlIGFuIG92ZXJsYXkgdG8gY2FwdHVyZSBhbnkgY2xpY2tzIG91dHNpZGUgYm94ZXMsIGlmIG5lY2Vzc2FyeVxuY3JlYXRlRWxlbSgnZGl2JywgJ292ZXJsYXkgaGlkZGVuJywgZG9jdW1lbnQuYm9keSkuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBoaWRlQWxsQWN0aW9ucylcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUXVlc3Rpb25TZXQge1xuICBjb25zdHJ1Y3RvciAocU51bWJlcikge1xuICAgIHRoaXMucXVlc3Rpb25zID0gW10gLy8gbGlzdCBvZiBxdWVzdGlvbnMgYW5kIHRoZSBET00gZWxlbWVudCB0aGV5J3JlIHJlbmRlcmVkIGluXG4gICAgdGhpcy50b3BpY3MgPSBbXSAvLyBsaXN0IG9mIHRvcGljcyB3aGljaCBoYXZlIGJlZW4gc2VsZWN0ZWQgZm9yIHRoaXMgc2V0XG4gICAgdGhpcy5vcHRpb25zU2V0cyA9IFtdIC8vIGxpc3Qgb2YgT3B0aW9uc1NldCBvYmplY3RzIGNhcnJ5aW5nIG9wdGlvbnMgZm9yIHRvcGljcyB3aXRoIG9wdGlvbnNcbiAgICB0aGlzLnFOdW1iZXIgPSBxTnVtYmVyIHx8IDEgLy8gUXVlc3Rpb24gbnVtYmVyIChwYXNzZWQgaW4gYnkgY2FsbGVyLCB3aGljaCB3aWxsIGtlZXAgY291bnQpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlIC8vIFdoZXRoZXIgYW5zd2VyZWQgb3Igbm90XG4gICAgdGhpcy5jb21tYW5kV29yZCA9ICcnIC8vIFNvbWV0aGluZyBsaWtlICdzaW1wbGlmeSdcbiAgICB0aGlzLnVzZUNvbW1hbmRXb3JkID0gdHJ1ZSAvLyBVc2UgdGhlIGNvbW1hbmQgd29yZCBpbiB0aGUgbWFpbiBxdWVzdGlvbiwgZmFsc2UgZ2l2ZSBjb21tYW5kIHdvcmQgd2l0aCBlYWNoIHN1YnF1ZXN0aW9uXG4gICAgdGhpcy5uID0gOCAvLyBOdW1iZXIgb2YgcXVlc3Rpb25zXG5cbiAgICB0aGlzLl9idWlsZCgpXG4gIH1cblxuICBfYnVpbGQgKCkge1xuICAgIHRoaXMub3V0ZXJCb3ggPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tb3V0ZXJib3gnKVxuICAgIHRoaXMuaGVhZGVyQm94ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWhlYWRlcmJveCcsIHRoaXMub3V0ZXJCb3gpXG4gICAgdGhpcy5kaXNwbGF5Qm94ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWRpc3BsYXlib3gnLCB0aGlzLm91dGVyQm94KVxuXG4gICAgdGhpcy5fYnVpbGRPcHRpb25zQm94KClcblxuICAgIHRoaXMuX2J1aWxkVG9waWNDaG9vc2VyKClcbiAgfVxuXG4gIF9idWlsZE9wdGlvbnNCb3ggKCkge1xuICAgIGNvbnN0IHRvcGljU3BhbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCBudWxsLCB0aGlzLmhlYWRlckJveClcbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCAndG9waWMtY2hvb3NlciBidXR0b24nLCB0b3BpY1NwYW4pXG4gICAgdGhpcy50b3BpY0Nob29zZXJCdXR0b24uaW5uZXJIVE1MID0gJ0Nob29zZSB0b3BpYydcbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuY2hvb3NlVG9waWNzKCkpXG5cbiAgICBjb25zdCBkaWZmaWN1bHR5U3BhbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCBudWxsLCB0aGlzLmhlYWRlckJveClcbiAgICBkaWZmaWN1bHR5U3Bhbi5hcHBlbmQoJ0RpZmZpY3VsdHk6ICcpXG4gICAgY29uc3QgZGlmZmljdWx0eVNsaWRlck91dGVyID0gY3JlYXRlRWxlbSgnc3BhbicsICdzbGlkZXItb3V0ZXInLCBkaWZmaWN1bHR5U3BhbilcbiAgICB0aGlzLmRpZmZpY3VsdHlTbGlkZXJFbGVtZW50ID0gY3JlYXRlRWxlbSgnaW5wdXQnLCBudWxsLCBkaWZmaWN1bHR5U2xpZGVyT3V0ZXIpXG5cbiAgICBjb25zdCBuU3BhbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCBudWxsLCB0aGlzLmhlYWRlckJveClcbiAgICBuU3Bhbi5hcHBlbmQoJ051bWJlciBvZiBxdWVzdGlvbnM6ICcpXG4gICAgY29uc3QgblF1ZXN0aW9uc0lucHV0ID0gY3JlYXRlRWxlbSgnaW5wdXQnLCAnbi1xdWVzdGlvbnMnLCBuU3BhbilcbiAgICBuUXVlc3Rpb25zSW5wdXQudHlwZSA9ICdudW1iZXInXG4gICAgblF1ZXN0aW9uc0lucHV0Lm1pbiA9ICcxJ1xuICAgIG5RdWVzdGlvbnNJbnB1dC52YWx1ZSA9ICc4J1xuICAgIG5RdWVzdGlvbnNJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICB0aGlzLm4gPSBwYXJzZUludChuUXVlc3Rpb25zSW5wdXQudmFsdWUpXG4gICAgfSlcblxuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24gPSBjcmVhdGVFbGVtKCdidXR0b24nLCAnZ2VuZXJhdGUtYnV0dG9uIGJ1dHRvbicsIHRoaXMuaGVhZGVyQm94KVxuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uZGlzYWJsZWQgPSB0cnVlXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5pbm5lckhUTUwgPSAnR2VuZXJhdGUhJ1xuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLmdlbmVyYXRlQWxsKCkpXG4gIH1cblxuICBfaW5pdFNsaWRlciAoKSB7XG4gICAgdGhpcy5kaWZmaWN1bHR5U2xpZGVyID0gbmV3IFJTbGlkZXIoe1xuICAgICAgdGFyZ2V0OiB0aGlzLmRpZmZpY3VsdHlTbGlkZXJFbGVtZW50LFxuICAgICAgdmFsdWVzOiB7IG1pbjogMSwgbWF4OiAxMCB9LFxuICAgICAgcmFuZ2U6IHRydWUsXG4gICAgICBzZXQ6IFsyLCA2XSxcbiAgICAgIHN0ZXA6IDEsXG4gICAgICB0b29sdGlwOiBmYWxzZSxcbiAgICAgIHNjYWxlOiB0cnVlLFxuICAgICAgbGFiZWxzOiB0cnVlXG4gICAgfSlcbiAgfVxuXG4gIF9idWlsZFRvcGljQ2hvb3NlciAoKSB7XG4gICAgLy8gYnVpbGQgYW4gT3B0aW9uc1NldCBvYmplY3QgZm9yIHRoZSB0b3BpY3NcbiAgICBjb25zdCB0b3BpY3MgPSBUb3BpY0Nob29zZXIuZ2V0VG9waWNzKClcbiAgICBjb25zdCBvcHRpb25zU3BlYyA9IFtdXG4gICAgdG9waWNzLmZvckVhY2godG9waWMgPT4ge1xuICAgICAgb3B0aW9uc1NwZWMucHVzaCh7XG4gICAgICAgIHRpdGxlOiB0b3BpYy50aXRsZSxcbiAgICAgICAgaWQ6IHRvcGljLmlkLFxuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICBzd2FwTGFiZWw6IHRydWVcbiAgICAgIH0pXG4gICAgfSlcbiAgICB0aGlzLnRvcGljc09wdGlvbnMgPSBuZXcgT3B0aW9uc1NldChvcHRpb25zU3BlYylcblxuICAgIC8vIEJ1aWxkIGEgbW9kYWwgZGlhbG9nIHRvIHB1dCB0aGVtIGluXG4gICAgdGhpcy50b3BpY3NNb2RhbCA9IG5ldyBNb2RhbCh7XG4gICAgICBmb290ZXI6IHRydWUsXG4gICAgICBzdGlja3lGb290ZXI6IGZhbHNlLFxuICAgICAgY2xvc2VNZXRob2RzOiBbJ292ZXJsYXknLCAnZXNjYXBlJ10sXG4gICAgICBjbG9zZUxhYmVsOiAnQ2xvc2UnLFxuICAgICAgb25DbG9zZTogKCkgPT4ge1xuICAgICAgICB0aGlzLnVwZGF0ZVRvcGljcygpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoaXMudG9waWNzTW9kYWwuYWRkRm9vdGVyQnRuKFxuICAgICAgJ09LJyxcbiAgICAgICdidXR0b24gbW9kYWwtYnV0dG9uJyxcbiAgICAgICgpID0+IHtcbiAgICAgICAgdGhpcy50b3BpY3NNb2RhbC5jbG9zZSgpXG4gICAgICB9KVxuXG4gICAgLy8gcmVuZGVyIG9wdGlvbnMgaW50byBtb2RhbFxuICAgIHRoaXMudG9waWNzT3B0aW9ucy5yZW5kZXJJbih0aGlzLnRvcGljc01vZGFsLm1vZGFsQm94Q29udGVudClcblxuICAgIC8vIEFkZCBmdXJ0aGVyIG9wdGlvbnMgYnV0dG9uc1xuICAgIC8vIFRoaXMgZmVlbHMgYSBiaXQgaWZmeSAtIGRlcGVuZHMgdG9vIG11Y2ggb24gaW1wbGVtZW50YXRpb24gb2YgT3B0aW9uc1NldFxuICAgIGNvbnN0IGxpcyA9IEFycmF5LmZyb20odGhpcy50b3BpY3NNb2RhbC5tb2RhbEJveENvbnRlbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2xpJykpXG4gICAgbGlzLmZvckVhY2gobGkgPT4ge1xuICAgICAgY29uc3QgdG9waWNJZCA9IGxpLmRhdGFzZXQub3B0aW9uSWRcbiAgICAgIGlmIChUb3BpY0Nob29zZXIuaGFzT3B0aW9ucyh0b3BpY0lkKSkge1xuICAgICAgICBjb25zdCBvcHRpb25zQnV0dG9uID0gY3JlYXRlRWxlbSgnZGl2JywgJ2ljb24tYnV0dG9uIGV4dHJhLW9wdGlvbnMtYnV0dG9uJywgbGkpXG4gICAgICAgIHRoaXMuX2J1aWxkVG9waWNPcHRpb25zKGxpLmRhdGFzZXQub3B0aW9uSWQsIG9wdGlvbnNCdXR0b24pXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIF9idWlsZFRvcGljT3B0aW9ucyAodG9waWNJZCwgb3B0aW9uc0J1dHRvbikge1xuICAgIC8vIEJ1aWxkIHRoZSBVSSBhbmQgT3B0aW9uc1NldCBvYmplY3QgbGlua2VkIHRvIHRvcGljSWQuIFBhc3MgaW4gYSBidXR0b24gd2hpY2ggc2hvdWxkIGxhdW5jaCBpdFxuXG4gICAgLy8gTWFrZSB0aGUgT3B0aW9uc1NldCBvYmplY3QgYW5kIHN0b3JlIGEgcmVmZXJlbmNlIHRvIGl0XG4gICAgLy8gT25seSBzdG9yZSBpZiBvYmplY3QgaXMgY3JlYXRlZD9cbiAgICBjb25zdCBvcHRpb25zU2V0ID0gVG9waWNDaG9vc2VyLm5ld09wdGlvbnNTZXQodG9waWNJZClcbiAgICB0aGlzLm9wdGlvbnNTZXRzW3RvcGljSWRdID0gb3B0aW9uc1NldFxuXG4gICAgLy8gTWFrZSBhIG1vZGFsIGRpYWxvZyBmb3IgaXRcbiAgICBjb25zdCBtb2RhbCA9IG5ldyBNb2RhbCh7XG4gICAgICBmb290ZXI6IHRydWUsXG4gICAgICBzdGlja3lGb290ZXI6IGZhbHNlLFxuICAgICAgY2xvc2VNZXRob2RzOiBbJ292ZXJsYXknLCAnZXNjYXBlJ10sXG4gICAgICBjbG9zZUxhYmVsOiAnQ2xvc2UnXG4gICAgfSlcblxuICAgIG1vZGFsLmFkZEZvb3RlckJ0bihcbiAgICAgICdPSycsXG4gICAgICAnYnV0dG9uIG1vZGFsLWJ1dHRvbicsXG4gICAgICAoKSA9PiB7XG4gICAgICAgIG1vZGFsLmNsb3NlKClcbiAgICAgIH0pXG5cbiAgICBvcHRpb25zU2V0LnJlbmRlckluKG1vZGFsLm1vZGFsQm94Q29udGVudClcblxuICAgIC8vIGxpbmsgdGhlIG1vZGFsIHRvIHRoZSBidXR0b25cbiAgICBvcHRpb25zQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgbW9kYWwub3BlbigpXG4gICAgfSlcbiAgfVxuXG4gIGNob29zZVRvcGljcyAoKSB7XG4gICAgdGhpcy50b3BpY3NNb2RhbC5vcGVuKClcbiAgfVxuXG4gIHVwZGF0ZVRvcGljcyAoKSB7XG4gICAgLy8gdG9waWMgY2hvaWNlcyBhcmUgc3RvcmVkIGluIHRoaXMudG9waWNzT3B0aW9ucyBhdXRvbWF0aWNhbGx5XG4gICAgLy8gcHVsbCB0aGlzIGludG8gdGhpcy50b3BpY3MgYW5kIHVwZGF0ZSBidXR0b24gZGlzcGxheXNcblxuICAgIC8vIGhhdmUgb2JqZWN0IHdpdGggYm9vbGVhbiBwcm9wZXJ0aWVzLiBKdXN0IHdhbnQgdGhlIHRydWUgdmFsdWVzXG4gICAgY29uc3QgdG9waWNzID0gYm9vbE9iamVjdFRvQXJyYXkodGhpcy50b3BpY3NPcHRpb25zLm9wdGlvbnMpXG4gICAgdGhpcy50b3BpY3MgPSB0b3BpY3NcblxuICAgIGxldCB0ZXh0XG5cbiAgICBpZiAodG9waWNzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGV4dCA9ICdDaG9vc2UgdG9waWMnIC8vIG5vdGhpbmcgc2VsZWN0ZWRcbiAgICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uZGlzYWJsZWQgPSB0cnVlXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGlkID0gdG9waWNzWzBdIC8vIGZpcnN0IGl0ZW0gc2VsZWN0ZWRcbiAgICAgIHRleHQgPSBUb3BpY0Nob29zZXIuZ2V0VGl0bGUoaWQpXG4gICAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmRpc2FibGVkID0gZmFsc2VcbiAgICB9XG5cbiAgICBpZiAodG9waWNzLmxlbmd0aCA+IDEpIHsgLy8gYW55IGFkZGl0aW9uYWwgc2hvdyBhcyBlLmcuICcgKyAxXG4gICAgICB0ZXh0ICs9ICcgKycgKyAodG9waWNzLmxlbmd0aCAtIDEpXG4gICAgfVxuXG4gICAgdGhpcy50b3BpY0Nob29zZXJCdXR0b24uaW5uZXJIVE1MID0gdGV4dFxuICB9XG5cbiAgc2V0Q29tbWFuZFdvcmQgKCkge1xuICAgIC8vIGZpcnN0IHNldCB0byBmaXJzdCB0b3BpYyBjb21tYW5kIHdvcmRcbiAgICBsZXQgY29tbWFuZFdvcmQgPSBUb3BpY0Nob29zZXIuZ2V0Q2xhc3ModGhpcy50b3BpY3NbMF0pLmNvbW1hbmRXb3JkXG4gICAgbGV0IHVzZUNvbW1hbmRXb3JkID0gdHJ1ZSAvLyB0cnVlIGlmIHNoYXJlZCBjb21tYW5kIHdvcmRcblxuICAgIC8vIGN5Y2xlIHRocm91Z2ggcmVzdCBvZiB0b3BpY3MsIHJlc2V0IGNvbW1hbmQgd29yZCBpZiB0aGV5IGRvbid0IG1hdGNoXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCB0aGlzLnRvcGljcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKFRvcGljQ2hvb3Nlci5nZXRDbGFzcyh0aGlzLnRvcGljc1tpXSkuY29tbWFuZFdvcmQgIT09IGNvbW1hbmRXb3JkKSB7XG4gICAgICAgIGNvbW1hbmRXb3JkID0gJydcbiAgICAgICAgdXNlQ29tbWFuZFdvcmQgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY29tbWFuZFdvcmQgPSBjb21tYW5kV29yZFxuICAgIHRoaXMudXNlQ29tbWFuZFdvcmQgPSB1c2VDb21tYW5kV29yZFxuICB9XG5cbiAgZ2VuZXJhdGVBbGwgKCkge1xuICAgIC8vIENsZWFyIGRpc3BsYXktYm94IGFuZCBxdWVzdGlvbiBsaXN0XG4gICAgdGhpcy5kaXNwbGF5Qm94LmlubmVySFRNTCA9ICcnXG4gICAgdGhpcy5xdWVzdGlvbnMgPSBbXVxuICAgIHRoaXMuc2V0Q29tbWFuZFdvcmQoKVxuXG4gICAgLy8gU2V0IG51bWJlciBhbmQgbWFpbiBjb21tYW5kIHdvcmRcbiAgICBjb25zdCBtYWlucSA9IGNyZWF0ZUVsZW0oJ3AnLCAna2F0ZXggbWFpbnEnLCB0aGlzLmRpc3BsYXlCb3gpXG4gICAgbWFpbnEuaW5uZXJIVE1MID0gYCR7dGhpcy5xTnVtYmVyfS4gJHt0aGlzLmNvbW1hbmRXb3JkfWAgLy8gVE9ETzogZ2V0IGNvbW1hbmQgd29yZCBmcm9tIHF1ZXN0aW9uc1xuXG4gICAgLy8gTWFrZSBzaG93IGFuc3dlcnMgYnV0dG9uXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24gPSBjcmVhdGVFbGVtKCdwJywgJ2J1dHRvbiBzaG93LWFuc3dlcnMnLCB0aGlzLmRpc3BsYXlCb3gpXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLnRvZ2dsZUFuc3dlcnMoKVxuICAgIH0pXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24uaW5uZXJIVE1MID0gJ1Nob3cgYW5zd2VycydcblxuICAgIC8vIEdldCBkaWZmaWN1bHR5IGZyb20gc2xpZGVyXG4gICAgY29uc3QgbWluZGlmZiA9IHRoaXMuZGlmZmljdWx0eVNsaWRlci5nZXRWYWx1ZUwoKVxuICAgIGNvbnN0IG1heGRpZmYgPSB0aGlzLmRpZmZpY3VsdHlTbGlkZXIuZ2V0VmFsdWVSKClcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIC8vIE1ha2UgcXVlc3Rpb24gY29udGFpbmVyIERPTSBlbGVtZW50XG4gICAgICBjb25zdCBjb250YWluZXIgPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tY29udGFpbmVyJywgdGhpcy5kaXNwbGF5Qm94KVxuICAgICAgY29udGFpbmVyLmRhdGFzZXQucXVlc3Rpb25faW5kZXggPSBpIC8vIG5vdCBzdXJlIHRoaXMgaXMgYWN0dWFsbHkgbmVlZGVkXG5cbiAgICAgIC8vIEFkZCBjb250YWluZXIgbGluayB0byBvYmplY3QgaW4gcXVlc3Rpb25zIGxpc3RcbiAgICAgIGlmICghdGhpcy5xdWVzdGlvbnNbaV0pIHRoaXMucXVlc3Rpb25zW2ldID0ge31cbiAgICAgIHRoaXMucXVlc3Rpb25zW2ldLmNvbnRhaW5lciA9IGNvbnRhaW5lclxuXG4gICAgICAvLyBjaG9vc2UgYSBkaWZmaWN1bHR5IGFuZCBnZW5lcmF0ZVxuICAgICAgY29uc3QgZGlmZmljdWx0eSA9IG1pbmRpZmYgKyBNYXRoLmZsb29yKGkgKiAobWF4ZGlmZiAtIG1pbmRpZmYgKyAxKSAvIHRoaXMubilcblxuICAgICAgLy8gY2hvb3NlIGEgdG9waWMgaWRcbiAgICAgIHRoaXMuZ2VuZXJhdGUoaSwgZGlmZmljdWx0eSlcbiAgICB9XG4gIH1cblxuICBnZW5lcmF0ZSAoaSwgZGlmZmljdWx0eSwgdG9waWNJZCkge1xuICAgIC8vIFRPRE8gZ2V0IG9wdGlvbnMgcHJvcGVybHlcbiAgICB0b3BpY0lkID0gdG9waWNJZCB8fCByYW5kRWxlbSh0aGlzLnRvcGljcylcblxuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICBsYWJlbDogJycsXG4gICAgICBkaWZmaWN1bHR5OiBkaWZmaWN1bHR5LFxuICAgICAgdXNlQ29tbWFuZFdvcmQ6IGZhbHNlXG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9uc1NldHNbdG9waWNJZF0pIHtcbiAgICAgIE9iamVjdC5hc3NpZ24ob3B0aW9ucywgdGhpcy5vcHRpb25zU2V0c1t0b3BpY0lkXS5vcHRpb25zKVxuICAgIH1cblxuICAgIC8vIGNob29zZSBhIHF1ZXN0aW9uXG4gICAgY29uc3QgcXVlc3Rpb24gPSBUb3BpY0Nob29zZXIubmV3UXVlc3Rpb24odG9waWNJZCwgb3B0aW9ucylcblxuICAgIC8vIHNldCBzb21lIG1vcmUgZGF0YSBpbiB0aGUgcXVlc3Rpb25zW10gbGlzdFxuICAgIGlmICghdGhpcy5xdWVzdGlvbnNbaV0pIHRocm93IG5ldyBFcnJvcigncXVlc3Rpb24gbm90IG1hZGUnKVxuICAgIHRoaXMucXVlc3Rpb25zW2ldLnF1ZXN0aW9uID0gcXVlc3Rpb25cbiAgICB0aGlzLnF1ZXN0aW9uc1tpXS50b3BpY0lkID0gdG9waWNJZFxuXG4gICAgLy8gUmVuZGVyIGludG8gdGhlIGNvbnRhaW5lclxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMucXVlc3Rpb25zW2ldLmNvbnRhaW5lclxuICAgIGNvbnRhaW5lci5pbm5lckhUTUwgPSAnJyAvLyBjbGVhciBpbiBjYXNlIG9mIHJlZnJlc2hcblxuICAgIC8vIG1ha2UgYW5kIHJlbmRlciBxdWVzdGlvbiBudW1iZXIgYW5kIGNvbW1hbmQgd29yZCAoaWYgbmVlZGVkKVxuICAgIGxldCBxTnVtYmVyVGV4dCA9IHF1ZXN0aW9uTGV0dGVyKGkpICsgJyknXG4gICAgaWYgKHdpbmRvdy5TSE9XX0RJRkZJQ1VMVFkpIHtxTnVtYmVyVGV4dCArPSBvcHRpb25zLmRpZmZpY3VsdHl9XG4gICAgaWYgKCF0aGlzLnVzZUNvbW1hbmRXb3JkKSB7XG4gICAgICBxTnVtYmVyVGV4dCArPSAnICcgKyBUb3BpY0Nob29zZXIuZ2V0Q29tbWFuZFdvcmQodG9waWNJZClcbiAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdpbmRpdmlkdWFsLWNvbW1hbmQtd29yZCcpXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QucmVtb3ZlKCdpbmRpdmlkdWFsLWNvbW1hbmQtd29yZCcpXG4gICAgfVxuXG4gICAgY29uc3QgcXVlc3Rpb25OdW1iZXJEaXYgPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tbnVtYmVyIGthdGV4JywgY29udGFpbmVyKVxuICAgIHF1ZXN0aW9uTnVtYmVyRGl2LmlubmVySFRNTCA9IHFOdW1iZXJUZXh0XG5cbiAgICAvLyByZW5kZXIgdGhlIHF1ZXN0aW9uXG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHF1ZXN0aW9uLmdldERPTSgpKSAvLyB0aGlzIGlzIGEgLnF1ZXN0aW9uLWRpdiBlbGVtZW50XG4gICAgcXVlc3Rpb24ucmVuZGVyKCkgLy8gc29tZSBxdWVzdGlvbnMgbmVlZCByZW5kZXJpbmcgYWZ0ZXIgYXR0YWNoaW5nIHRvIERPTVxuXG4gICAgLy8gbWFrZSBoaWRkZW4gYWN0aW9ucyBtZW51XG4gICAgY29uc3QgYWN0aW9ucyA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1hY3Rpb25zIGhpZGRlbicsIGNvbnRhaW5lcilcbiAgICBjb25zdCByZWZyZXNoSWNvbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1yZWZyZXNoIGljb24tYnV0dG9uJywgYWN0aW9ucylcbiAgICBjb25zdCBhbnN3ZXJJY29uID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWFuc3dlciBpY29uLWJ1dHRvbicsIGFjdGlvbnMpXG5cbiAgICBhbnN3ZXJJY29uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgcXVlc3Rpb24udG9nZ2xlQW5zd2VyKClcbiAgICAgIGhpZGVBbGxBY3Rpb25zKClcbiAgICB9KVxuXG4gICAgcmVmcmVzaEljb24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLmdlbmVyYXRlKGksIGRpZmZpY3VsdHkpXG4gICAgICBoaWRlQWxsQWN0aW9ucygpXG4gICAgfSlcblxuICAgIC8vIFE6IGlzIHRoaXMgYmVzdCB3YXkgLSBvciBhbiBldmVudCBsaXN0ZW5lciBvbiB0aGUgd2hvbGUgZGlzcGxheUJveD9cbiAgICBjb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBlID0+IHtcbiAgICAgIGlmICghaGFzQW5jZXN0b3JDbGFzcyhlLnRhcmdldCwgJ3F1ZXN0aW9uLWFjdGlvbnMnKSkge1xuICAgICAgICAvLyBvbmx5IGRvIHRoaXMgaWYgaXQgZGlkbid0IG9yaWdpbmF0ZSBpbiBhY3Rpb24gYnV0dG9uXG4gICAgICAgIHRoaXMuc2hvd1F1ZXN0aW9uQWN0aW9ucyhlLCBpKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICB0b2dnbGVBbnN3ZXJzICgpIHtcbiAgICBpZiAodGhpcy5hbnN3ZXJlZCkge1xuICAgICAgdGhpcy5xdWVzdGlvbnMuZm9yRWFjaChxID0+IHtcbiAgICAgICAgcS5xdWVzdGlvbi5oaWRlQW5zd2VyKClcbiAgICAgICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gICAgICAgIHRoaXMuYW5zd2VyQnV0dG9uLmlubmVySFRNTCA9ICdTaG93IGFuc3dlcnMnXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnF1ZXN0aW9ucy5mb3JFYWNoKHEgPT4ge1xuICAgICAgICBxLnF1ZXN0aW9uLnNob3dBbnN3ZXIoKVxuICAgICAgICB0aGlzLmFuc3dlcmVkID0gdHJ1ZVxuICAgICAgICB0aGlzLmFuc3dlckJ1dHRvbi5pbm5lckhUTUwgPSAnSGlkZSBhbnN3ZXJzJ1xuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICBzaG93UXVlc3Rpb25BY3Rpb25zIChldmVudCwgcXVlc3Rpb25JbmRleCkge1xuICAgIC8vIGZpcnN0IGhpZGUgYW55IG90aGVyIGFjdGlvbnNcbiAgICBoaWRlQWxsQWN0aW9ucygpXG5cbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLnF1ZXN0aW9uc1txdWVzdGlvbkluZGV4XS5jb250YWluZXJcbiAgICBjb25zdCBhY3Rpb25zID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy5xdWVzdGlvbi1hY3Rpb25zJylcblxuICAgIC8vIFVuaGlkZSB0aGUgb3ZlcmxheVxuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5vdmVybGF5JykuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJylcbiAgICBhY3Rpb25zLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpXG4gICAgYWN0aW9ucy5zdHlsZS5sZWZ0ID0gKGNvbnRhaW5lci5vZmZzZXRXaWR0aCAvIDIgLSBhY3Rpb25zLm9mZnNldFdpZHRoIC8gMikgKyAncHgnXG4gICAgYWN0aW9ucy5zdHlsZS50b3AgPSAoY29udGFpbmVyLm9mZnNldEhlaWdodCAvIDIgLSBhY3Rpb25zLm9mZnNldEhlaWdodCAvIDIpICsgJ3B4J1xuICB9XG5cbiAgYXBwZW5kVG8gKGVsZW0pIHtcbiAgICBlbGVtLmFwcGVuZENoaWxkKHRoaXMub3V0ZXJCb3gpXG4gICAgdGhpcy5faW5pdFNsaWRlcigpIC8vIGhhcyB0byBiZSBpbiBkb2N1bWVudCdzIERPTSB0byB3b3JrIHByb3Blcmx5XG4gIH1cblxuICBhcHBlbmRCZWZvcmUgKHBhcmVudCwgZWxlbSkge1xuICAgIHBhcmVudC5pbnNlcnRCZWZvcmUodGhpcy5vdXRlckJveCwgZWxlbSlcbiAgICB0aGlzLl9pbml0U2xpZGVyKCkgLy8gaGFzIHRvIGJlIGluIGRvY3VtZW50J3MgRE9NIHRvIHdvcmsgcHJvcGVybHlcbiAgfVxufVxuXG5mdW5jdGlvbiBxdWVzdGlvbkxldHRlciAoaSkge1xuICAvLyByZXR1cm4gYSBxdWVzdGlvbiBudW1iZXIuIGUuZy4gcU51bWJlcigwKT1cImFcIi5cbiAgLy8gQWZ0ZXIgbGV0dGVycywgd2UgZ2V0IG9uIHRvIGdyZWVrXG4gIHZhciBsZXR0ZXIgPVxuICAgICAgICBpIDwgMjYgPyBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4NjEgKyBpKVxuICAgICAgICAgIDogaSA8IDUyID8gU3RyaW5nLmZyb21DaGFyQ29kZSgweDQxICsgaSAtIDI2KVxuICAgICAgICAgICAgOiBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4M0IxICsgaSAtIDUyKVxuICByZXR1cm4gbGV0dGVyXG59XG5cbmZ1bmN0aW9uIGhpZGVBbGxBY3Rpb25zIChlKSB7XG4gIC8vIGhpZGUgYWxsIHF1ZXN0aW9uIGFjdGlvbnNcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnF1ZXN0aW9uLWFjdGlvbnMnKS5mb3JFYWNoKGVsID0+IHtcbiAgICBlbC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuICB9KVxuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcub3ZlcmxheScpLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpXG59XG4iLCJpbXBvcnQgUXVlc3Rpb25TZXQgZnJvbSAnUXVlc3Rpb25TZXQnXG5cbi8vIFRPRE86XG4vLyAgLSBRdWVzdGlvblNldCAtIHJlZmFjdG9yIGludG8gbW9yZSBjbGFzc2VzPyBFLmcuIG9wdGlvbnMgd2luZG93XG4vLyAgLSBJbXBvcnQgZXhpc3RpbmcgcXVlc3Rpb24gdHlwZXMgKEcgLSBncmFwaGljLCBUIC0gdGV4dFxuLy8gICAgLSBHIGFuZ2xlc1xuLy8gICAgLSBHIGFyZWFcbi8vICAgIC0gVCBlcXVhdGlvbiBvZiBhIGxpbmVcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsICgpID0+IHtcbiAgY29uc3QgcXMgPSBuZXcgUXVlc3Rpb25TZXQoKVxuICBxcy5hcHBlbmRUbyhkb2N1bWVudC5ib2R5KVxuICBxcy5jaG9vc2VUb3BpY3MoKVxufSlcbiJdLCJuYW1lcyI6WyJjb21tb25qc0hlbHBlcnMuY3JlYXRlQ29tbW9uanNNb2R1bGUiLCJjb21tb25qc0hlbHBlcnMuZ2V0RGVmYXVsdEV4cG9ydEZyb21DanMiLCJSU2xpZGVyIiwiVG9waWNDaG9vc2VyLmdldFRvcGljcyIsIlRvcGljQ2hvb3Nlci5oYXNPcHRpb25zIiwiVG9waWNDaG9vc2VyLm5ld09wdGlvbnNTZXQiLCJUb3BpY0Nob29zZXIuZ2V0VGl0bGUiLCJUb3BpY0Nob29zZXIuZ2V0Q2xhc3MiLCJUb3BpY0Nob29zZXIubmV3UXVlc3Rpb24iLCJUb3BpY0Nob29zZXIuZ2V0Q29tbWFuZFdvcmQiXSwibWFwcGluZ3MiOiI7OztFQUFBO0VBQ0E7RUFDQTtBQUNBO0VBQ0EsSUFBSSxFQUFFLEdBQUcsVUFBVSxJQUFJLEVBQUU7RUFDekIsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUk7RUFDbkIsRUFBRSxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUk7RUFDMUIsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUk7RUFDcEIsRUFBRSxJQUFJLENBQUMsV0FBVyxHQUFHLEVBQUM7RUFDdEIsRUFBRSxJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUM7RUFDckIsRUFBRSxJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUM7RUFDdkIsRUFBRSxJQUFJLENBQUMsUUFBUSxH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QUFDO0VBQ2xELElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxhQUFhLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFDO0VBQ2xELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQztFQUN4QyxHQUFHO0VBQ0gsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFDO0VBQ3hDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBQztFQUNyQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUM7QUFDeEM7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7RUFDdkIsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEVBQUM7RUFDNUUsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUM7RUFDL0QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFDO0VBQzFDLEdBQUc7QUFDSDtFQUNBLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUM7QUFDekU7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUss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Qy9DLEVBQUUsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxHQUFHLE1BQUs7QUFDdkQ7RUFDQSxFQUFFLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBQyxFQUFFO0FBQ3JIO0VBQ0EsRUFBRSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFDLEVBQUU7QUFDcEc7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUcsRUFBRTtBQUNyRztFQUNBLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSTtBQUN0RztFQUNBLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRTtFQUN2QixJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7RUFDM0IsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBQztFQUMvRCxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFDO0VBQzdELEtBQUs7RUFDTCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFDO0VBQ3BHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUk7RUFDN0YsR0FBRyxNQUFNO0VBQ1QsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUMsRUFBRTtFQUN0RixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFDO0VBQ3hELEdBQUc7QUFDSDtFQUNBLEVBQUUsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxFQUFDO0VBQ2xHLEVBQUUsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsRUFBQztBQUNsRDtFQUNBLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxLQUFJO0VBQ3RGLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSTtBQUNqRTtFQUNBLEVBQUUsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFO0VBQ3hCLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLFVBQVUsQ0FBQyxFQUFFO0VBQ3pDLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNO0FBQ2hDO0VBQ0EsRUFBRSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUM7QUFDakU7RUFDQSxFQUFFLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxFQUFDO0VBQzFFLEVBQUUsSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxFQUFDO0FBQ3RCO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FB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QUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxFQUFDO0VBQ2hFLFFBQVEsS0FBSztFQUNiLEtBQUs7QUFDTDtFQUNBO0VBQ0EsSUFBSTtFQUNKLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDN0MsTUFBTSxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQzdCLE1BQU07RUFDTixNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxLQUFLO0FBQ0w7RUFDQTtFQUNBLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDMUIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osS0FBSztBQUNMO0VBQ0EsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxH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QyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzVCO0VBQ0EsSUFBSSxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbEMsSUFBSSxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbEMsSUFBSSxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7QUFDbEM7RUFDQSxJQUFJLE1BQU0sU0FBUyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztFQUMvQixJQUFJLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQztFQUM1QyxJQUFJLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQztBQUM1QztFQUNBLElBQUksT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLEdBQUcsU0FBUyxFQUFFLElBQUksR0FBRyxTQUFTLENBQUM7RUFDeEQsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRTtFQUN0QixJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUM7RUFDcEUsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFDO0VBQ3BFLElBQUksT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO0VBQ2hDLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUU7RUFDdEIsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUM7RUFDckUsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUM7RUFDckUsSUFBSSxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7RUFDaEMsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLE1BQU0sQ0FBQyxDQUFDLE1BQU0sRUFBRTtFQUN6QixJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUM7RUFDcEUsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFDO0VBQ3BFLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDO0VBQ3JFLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDO0VBQ3JFLElBQUksT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUM7RUFDMUQsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLFVBQVUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUU7RUFDN0I7RUFDQTtFQUNBLElBQUksTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBQztFQUM1QixJQUFJLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUM7RUFDNUIsSUFBSSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUM7RUFDekMsSUFBSSxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksR0FBRyxNQUFNLEVBQUUsQ0FBQyxFQUFFLElBQUksR0FBRyxNQUFNLEVBQUU7RUFDakQsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUU7RUFDM0IsSUFBSSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUMvQyxHQUFHO0FBQ0g7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsRUFBRSxPQUFPLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQzFCLElBQUksTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDO0VBQ2xELElBQUksT0FBTyxLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxLQUFLO0VBQ2pELEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUU7RUFDM0M7RUFDQTtFQUNBLElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFDO0VBQ2xELElBQUksSUFBSSxDQUFDLElBQUksT0FBTyxFQUFFLE9BQU8sS0FBSztBQUNsQztFQUNBLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFJLEVBQUM7RUFDaEMsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBQztFQUN6QixJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFDO0VBQ3pCLElBQUksT0FBTyxJQUFJO0VBQ2YsR0FBRztFQUNIOztRQzNHc0IsWUFBWTtNQVFoQyxZQUFjLElBQW1CLEVBQUUsV0FBeUI7VUFDMUQsTUFBTSxRQUFRLEdBQWlCO2NBQzdCLEtBQUssRUFBRSxHQUFHO2NBQ1YsTUFBTSxFQUFFLEdBQUc7V0FDWixDQUFBO1VBRUQsV0FBVyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQTtVQUV0RCxJQUFJLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUE7VUFDOUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFBO1VBQ2hDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBOztVQUdoQixJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQTs7VUFHaEIsSUFBSSxDQUFDLEdBQUcsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1VBQzVDLElBQUksQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7VUFDL0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQTtVQUM5QixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO09BQ2pDO01BRUQsTUFBTTtVQUNKLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQTtPQUNoQjtNQUlELFlBQVksQ0FBRSxLQUFnQjtVQUM1QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFBOztVQUcxQixNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUFDLENBQUE7VUFDM0QsT0FBTyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtjQUMzQixTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUE7V0FDdEI7VUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2NBQ25CLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7Y0FDM0MsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtjQUNoRCxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtjQUM1QixLQUFLLENBQUMsU0FBUyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFBO2NBQ2hDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQTtjQUNqQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUE7Y0FFaEMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFBO2NBQ2hDLEtBQUssQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUE7Y0FDN0IsU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTs7Y0FHNUIsSUFBSSxVQUFVLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxFQUFFO2tCQUN4RCxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtrQkFDekMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUE7a0JBQzVFLEtBQUssQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFBO2VBQ3ZDOzs7Y0FLRCxJQUFJLEtBQUssRUFBRTtrQkFDVCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFBO2tCQUNoQyxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFBO2tCQUNsQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUU7c0JBQ3ZGLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLE1BQU0sR0FBRyxDQUFDLElBQUksSUFBSSxDQUFBO3NCQUM5RCxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7bUJBQ2xDO2tCQUNELElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxNQUFNLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRTtzQkFDdkYsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQTtzQkFDckQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO21CQUNsQztlQUNGO1dBQ0YsQ0FBQyxDQUFBO09BQ0g7TUFFRCxVQUFVO1VBQ1IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztjQUNuQixDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUE7Y0FDaEIsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFBO1dBQ25CLENBQUMsQ0FBQTtVQUNGLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUE7T0FDekI7TUFFRCxVQUFVO1VBQ1IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztjQUNuQixDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUE7Y0FDaEIsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFBO1dBQ25CLENBQUMsQ0FBQTtVQUNGLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUE7T0FDekI7O01BSUQsSUFBSSxTQUFTO1VBQ1gsT0FBTyxFQUFFLENBQUE7T0FDVjtNQUVELEtBQUssQ0FBRSxFQUFXO1VBQ2hCLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztjQUNoQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1dBQ1osQ0FBQyxDQUFBO09BQ0g7TUFFRCxNQUFNLENBQUUsS0FBYztVQUNwQixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7Y0FDaEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtXQUNoQixDQUFDLENBQUE7VUFDRixPQUFPLEtBQUssQ0FBQTtPQUNiO01BRUQsU0FBUyxDQUFFLENBQVUsRUFBRSxDQUFVO1VBQy9CLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztjQUNoQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtXQUNsQixDQUFDLENBQUE7T0FDSDtNQUVELFlBQVk7VUFDVixNQUFNLEtBQUssR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7VUFDekMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtVQUNsQixPQUFPLEtBQUssQ0FBQTtPQUNiOzs7Ozs7OztNQVNELFVBQVUsQ0FBRSxLQUFjLEVBQUUsTUFBYyxFQUFFLE1BQWU7VUFDekQsSUFBSSxPQUFPLEdBQVcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7VUFDL0MsSUFBSSxXQUFXLEdBQVcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7VUFDbkQsTUFBTSxVQUFVLEdBQVksV0FBVyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFBO1VBQ3JELE1BQU0sV0FBVyxHQUFZLFdBQVcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQTtVQUN0RCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLE1BQU0sSUFBSSxVQUFVLEVBQUUsQ0FBQyxNQUFNLEdBQUcsTUFBTSxJQUFJLFdBQVcsQ0FBQyxDQUFBO1VBQ25GLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUE7O1VBR2QsT0FBTyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1VBQ25DLFdBQVcsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtVQUN2QyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQTtVQUMvQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtVQUUzRCxPQUFPLEVBQUUsQ0FBQTtPQUNWO0dBQ0Y7UUFFcUIsUUFBUyxTQUFRLFFBQVE7TUFJN0M7VUFDRSxLQUFLLEVBQUUsQ0FBQTtVQUNQLFFBQVEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBOzs7Ozs7O09BUWxCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztNQXNCRCxNQUFNLEtBQW9CLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQSxFQUFFO01BRXJELE1BQU0sS0FBYSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBLEVBQUU7TUFFdkMsVUFBVTtVQUNSLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQTtVQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO09BQ3ZCO01BRUQsVUFBVTtVQUNSLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQTtVQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO09BQ3ZCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUN4T0gsSUFBSSxRQUFRLEdBQUdBLG9CQUFvQyxDQUFDLFVBQVUsTUFBTSxFQUFFLE9BQU8sRUFBRTtFQUMvRTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtBQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtBQUNBO0VBQ0EsRUFBRSxDQUFDLFVBQVUsSUFBSSxFQUFFO0FBRW5CO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsSUFBSSxJQUFJLGFBQWEsR0FBRyxLQUFJO0FBQzVCO0VBQ0E7RUFDQSxJQUFJLElBQUksQ0FBQyxHQUFHO0VBQ1osTUFBTSxDQUFDLEVBQUUsQ0FBQztFQUNWLE1BQU0sQ0FBQyxFQUFFLENBQUM7RUFDVixNQUFNLENBQUMsRUFBRSxDQUFDO0VBQ1YsTUFBSztBQUNMO0VBQ0EsSUFBSSxTQUFTLFdBQVcsRUFBRSxJQUFJLEVBQUU7RUFDaEMsTUFBTSxTQUFTLGdCQUFnQixJQUFJO0VBQ25DLFFBQVEsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFDO0VBQy9DLFFBQVEsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUk7RUFDcEMsUUFBUSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFLO0VBQy9CLFFBQVEsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBTztFQUNuQyxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxTQUFTLHFCQUFxQixJQUFJLEVBQUU7RUFDMUMsTUFBTSxxQkFBcUIsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLFVBQVM7RUFDdkQsTUFBTSxnQkFBZ0IsQ0FBQyxTQUFTLEdBQUcsSUFBSSxxQkFBcUIsR0FBRTtBQUM5RDtFQUNBLE1BQU0sT0FBTyxnQkFBZ0I7RUFDN0IsS0FBSztBQUNMO0VBQ0EsSUFBSSxJQUFJLGNBQWMsR0FBRyxRQUFRLENBQUMsY0FBYyxHQUFHLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBQztFQUNoRixJQUFJLElBQUksZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixHQUFHLFdBQVcsQ0FBQyxrQkFBa0IsRUFBQztBQUN0RjtFQUNBLElBQUksU0FBUyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUU7RUFDdEMsUUFBUSxpQkFBaUIsR0FBRTtFQUMzQixPQUFPO0VBQ1AsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO0VBQ2xCLEtBQUs7QUFDTDtFQUNBLElBQUksU0FBUyxpQkFBaUIsSUFBSTtFQUNsQyxNQUFNLE1BQU0sSUFBSSxnQkFBZ0IsRUFBRTtFQUNsQyxLQUFLO0FBQ0w7RUFDQSxJQUFJLElBQUksS0FBSyxHQUFHLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRTtFQUNsQyxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUM7RUFDckMsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFDO0FBQzNEO0VBQ0EsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFDO0VBQzFCLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBQztBQUMxQjtFQUNBLE1BQU0sSUFBSSxDQUFDLEdBQUcsU0FBUTtFQUN0QixNQUFNLElBQUksRUFBQztBQUNYO0VBQ0EsTUFBTSxJQUFJLEVBQUUsS0FBSyxTQUFTLElBQUksRUFBRSxLQUFLLElBQUksRUFBRSxDQUVwQyxNQUFNLElBQUksRUFBRSxLQUFLLFNBQVMsRUFBRTtFQUNuQyxRQUFRLENBQUMsR0FBRyxHQUFFO0VBQ2QsUUFBUSxDQUFDLEdBQUcsR0FBRTtFQUNkLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFDO0VBQ2pCLE9BQU8sTUFBTTtFQUNiLFFBQVEsUUFBUSxPQUFPLEVBQUU7RUFDekIsVUFBVSxLQUFLLFFBQVE7RUFDdkIsVUFBVTtFQUNWLFlBQVksSUFBSSxHQUFHLElBQUksRUFBRSxJQUFJLEdBQUcsSUFBSSxFQUFFLEVBQUU7RUFDeEMsY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUM7RUFDdEIsY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUM7RUFDdEIsY0FBYyxJQUFJLEdBQUcsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUMsRUFBRTtFQUMxQyxhQUFhLE1BQU0sSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFO0VBQ2hDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUM7RUFDdkIsY0FBYyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFFO0VBQ3hDLGFBQWEsTUFBTTtFQUNuQixjQUFjLGlCQUFpQixHQUFFO0VBQ2pDLGFBQWE7RUFDYixZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztFQUNyQixZQUFZLEtBQUs7RUFDakIsV0FBVztFQUNYLFVBQVUsS0FBSyxRQUFRO0VBQ3ZCLFVBQVU7RUFDVixZQUFZLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRTtFQUN4QixjQUFjLENBQUMsR0FBRyxHQUFFO0VBQ3BCLGNBQWMsRUFBRSxHQUFHLENBQUMsR0FBRTtFQUN0QixhQUFhO0FBQ2I7RUFDQSxZQUFZLElBQUksRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDOUIsY0FBYyxDQUFDLEdBQUcsR0FBRTtFQUNwQixhQUFhLE1BQU0sSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFO0VBQy9CLGNBQWMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFO0VBQzNCLGdCQUFnQixDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUM7RUFDMUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFDO0VBQ3ZCLGVBQWU7QUFDZjtFQUNBO0VBQ0E7QUFDQTtFQUNBLGNBQWMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDdkMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBQztBQUNyQztFQUNBLGdCQUFnQixJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUU7RUFDOUIsa0JBQWtCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDbEMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztFQUM3QixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFDO0VBQzdCLG1CQUFtQixNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtFQUNwQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUM7RUFDekIsb0JBQW9CLENBQUMsR0FBRyxFQUFDO0VBQ3pCLG1CQUFtQixNQUFNO0VBQ3pCLG9CQUFvQixDQUFDLEdBQUcsRUFBQztFQUN6QixvQkFBb0IsQ0FBQyxHQUFHLEVBQUM7RUFDekIsbUJBQW1CO0VBQ25CLGtCQUFrQixLQUFLO0VBQ3ZCLGlCQUFpQixNQUFNO0VBQ3ZCLGtCQUFrQixJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUU7RUFDOUIsb0JBQW9CLENBQUMsSUFBSSxFQUFDO0VBQzFCLG9CQUFvQixDQUFDLElBQUksRUFBQztFQUMxQixtQkFBbUIsTUFBTTtFQUN6QixvQkFBb0IsQ0FBQyxJQUFJLEVBQUM7RUFDMUIsb0JBQW9CLENBQUMsSUFBSSxFQUFDO0VBQzFCLG1CQUFtQjtBQUNuQjtFQUNBLGtCQUFrQixJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7RUFDN0Isb0JBQW9CLENBQUMsR0FBRyxFQUFDO0VBQ3pCLG9CQUFvQixDQUFDLEdBQUcsRUFBQztFQUN6QixtQkFBbUIsTUFBTTtFQUN6QixvQkFBb0IsQ0FBQyxHQUFHLEVBQUM7RUFDekIsb0JBQW9CLENBQUMsR0FBRyxFQUFDO0VBQ3pCLG1CQUFtQjtFQUNuQixpQkFBaUI7RUFDakIsZUFBZTtFQUNmLGNBQWMsQ0FBQyxJQUFJLEVBQUM7RUFDcEIsYUFBYSxNQUFNLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUMvQyxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBRztFQUN6QixhQUFhO0VBQ2IsWUFBWSxLQUFLO0VBQ2pCLFdBQVc7RUFDWCxVQUFVLEtBQUssUUFBUTtFQUN2QixVQUFVO0VBQ1YsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUM7QUFDbEM7RUFDQSxZQUFZLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxFQUFFLGlCQUFpQixHQUFFLEVBQUU7QUFDbkQ7RUFDQSxZQUFZLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtFQUM5QixjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUM7RUFDcEIsY0FBYyxDQUFDLEdBQUU7RUFDakIsYUFBYSxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtFQUNyQyxjQUFjLENBQUMsR0FBRTtFQUNqQixhQUFhO0FBQ2I7RUFDQSxZQUFZLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0VBQ3BDLGNBQWMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbkMsYUFBYSxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtFQUN6RCxjQUFjLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtFQUNoQyxnQkFBZ0IsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDckMsZUFBZTtFQUNmLGNBQWMsQ0FBQyxHQUFFO0FBQ2pCO0VBQ0E7RUFDQSxjQUFjLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0VBQ3RILGdCQUFnQixDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbkMsZ0JBQWdCLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDO0VBQzdDLGdCQUFnQixDQUFDLEdBQUU7RUFDbkIsZUFBZTtBQUNmO0VBQ0E7RUFDQSxjQUFjLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0VBQ3hGLGdCQUFnQixDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3ZDLGdCQUFnQixDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFDO0VBQ3JELGdCQUFnQixDQUFDLElBQUksRUFBQztFQUN0QixlQUFlO0VBQ2YsYUFBYSxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7RUFDN0QsY0FBYyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDakMsY0FBYyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3JDLGNBQWMsQ0FBQyxJQUFJLEVBQUM7RUFDcEIsYUFBYSxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7RUFDN0QsY0FBYyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDakMsY0FBYyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3JDLGNBQWMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNyQyxjQUFjLENBQUMsSUFBSSxFQUFDO0VBQ3BCLGFBQWE7QUFDYjtFQUNBLFlBQVksSUFBSSxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtFQUMvQixjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztFQUN2QixjQUFjLENBQUM7RUFDZixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFDO0VBQ3pDLGNBQWMsS0FBSztFQUNuQixhQUFhO0FBQ2I7RUFDQTtFQUNBLFdBQVc7RUFDWCxVQUFVO0VBQ1YsWUFBWSxpQkFBaUIsR0FBRTtFQUMvQixTQUFTO0VBQ1QsT0FBTztBQUNQO0VBQ0EsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDbkIsUUFBUSxNQUFNLElBQUksY0FBYyxFQUFFO0VBQ2xDLE9BQU87QUFDUDtFQUNBLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUM7RUFDMUIsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDO0VBQ3ZCLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQztFQUN2QixNQUFLO0FBQ0w7RUFDQSxJQUFJLFNBQVMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzlCLE1BQU0sSUFBSSxDQUFDLEdBQUcsRUFBQztFQUNmLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDOUMsUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7RUFDbkIsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUM7RUFDekIsU0FBUztFQUNULE9BQU87RUFDUCxNQUFNLE9BQU8sQ0FBQztFQUNkLEtBQUs7QUFDTDtFQUNBLElBQUksU0FBUyxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUM3QixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0VBQ3hCLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtFQUNoQixPQUFPO0FBQ1A7RUFDQSxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0VBQ3hCLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtFQUNoQixPQUFPO0FBQ1A7RUFDQSxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUM7RUFDakIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxFQUFFO0FBQ2xCO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7QUFDQTtFQUNBLE1BQU0sSUFBSSxHQUFHLEdBQUcsRUFBRSxHQUFHLEVBQUM7RUFDdEIsTUFBTSxJQUFJLENBQUMsR0FBRyxFQUFDO0FBQ2Y7RUFDQSxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUM3QixRQUFRLEdBQUcsR0FBRyxHQUFHLEdBQUcsRUFBRSxHQUFHLEVBQUM7QUFDMUI7RUFDQSxRQUFRLElBQUksQ0FBQyxHQUFHLGFBQWEsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFO0VBQzNDLE9BQU87RUFDUCxNQUFNLE9BQU8sQ0FBQztFQUNkLEtBQUs7QUFDTDtFQUNBLElBQUksU0FBUyxVQUFVLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7RUFDcEMsTUFBTSxJQUFJLElBQUksR0FBRyxFQUFDO0VBQ2xCLE1BQU0sSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDO0FBQ25DO0VBQ0EsTUFBTSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3BDO0FBQ0E7RUFDQSxRQUFRLElBQUksSUFBSSxLQUFLLElBQUksRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFO0FBQ3ZDO0VBQ0EsUUFBUSxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQUUsR0FBRyxFQUFDO0VBQzVCLFFBQVEsSUFBSSxHQUFHLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBQztFQUM1QixPQUFPO0VBQ1AsTUFBTSxPQUFPLENBQUM7RUFDZCxLQUFLO0FBQ0w7RUFDQSxJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDeEIsTUFBTSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUU7RUFDMUIsTUFBTSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUU7QUFDMUI7RUFDQSxNQUFNLE9BQU8sQ0FBQyxFQUFFO0VBQ2hCLFFBQVEsQ0FBQyxJQUFJLEVBQUM7RUFDZCxRQUFRLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRTtFQUM1QixRQUFRLENBQUMsSUFBSSxFQUFDO0VBQ2QsUUFBUSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUU7RUFDNUIsT0FBTztFQUNQLEtBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksU0FBUyxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUM3QixNQUFNLElBQUksRUFBRSxJQUFJLFlBQVksUUFBUSxDQUFDLEVBQUU7RUFDdkMsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDakMsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztBQUNqQjtFQUNBLE1BQU0sSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFO0VBQzNCLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDekIsT0FBTyxNQUFNO0VBQ2IsUUFBUSxDQUFDLEdBQUcsRUFBQztFQUNiLE9BQU87QUFDUDtFQUNBLE1BQU0sSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQztFQUNsQixNQUFNLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFDO0VBQ3RCLE1BQU0sSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUM7RUFDdEIsS0FBSztBQUNMO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsRUFBQztBQUN2QjtFQUNBLElBQUksUUFBUSxDQUFDLFNBQVMsR0FBRztBQUN6QjtFQUNBLE1BQU0sQ0FBQyxFQUFFLENBQUM7RUFDVixNQUFNLENBQUMsRUFBRSxDQUFDO0VBQ1YsTUFBTSxDQUFDLEVBQUUsQ0FBQztBQUNWO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sR0FBRyxFQUFFLFlBQVk7RUFDdkIsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUMzQyxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxHQUFHLEVBQUUsWUFBWTtFQUN2QixRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUNyRCxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxHQUFHLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzNCLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbkIsUUFBUSxPQUFPLElBQUksUUFBUTtFQUMzQixVQUFVLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUNwRCxVQUFVLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDdEIsU0FBUztFQUNULE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDM0IsUUFBUSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNuQixRQUFRLE9BQU8sSUFBSSxRQUFRO0VBQzNCLFVBQVUsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ3BELFVBQVUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUN0QixTQUFTO0VBQ1QsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUMzQixRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ25CLFFBQVEsT0FBTyxJQUFJLFFBQVE7RUFDM0IsVUFBVSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUNyQyxVQUFVLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDdEIsU0FBUztFQUNULE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDM0IsUUFBUSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNuQixRQUFRLE9BQU8sSUFBSSxRQUFRO0VBQzNCLFVBQVUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDckMsVUFBVSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ3RCLFNBQVM7RUFDVCxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxLQUFLLEVBQUUsWUFBWTtFQUN6QixRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDO0VBQ2pDLE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDM0IsUUFBUSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUM1QyxVQUFVLE9BQU8sSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDO0VBQ2xDLFNBQVM7QUFDVDtFQUNBLFFBQVEsSUFBSSxDQUFDLEtBQUssU0FBUyxFQUFFO0VBQzdCLFVBQVUsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDMUQsU0FBUztBQUNUO0VBQ0EsUUFBUSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNuQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDdkMsVUFBVSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUN4QixTQUFTO0FBQ1Q7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0FBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsUUFBUSxPQUFPLElBQUksUUFBUTtFQUMzQixVQUFVLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ2xELFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztFQUN0QixTQUFTO0VBQ1QsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUMzQixRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0FBQ25CO0VBQ0E7QUFDQTtFQUNBLFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUM5RSxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxHQUFHLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzNCLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7QUFDbkI7RUFDQTtBQUNBO0VBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFO0VBQ3ZDLFVBQVUsT0FBTyxJQUFJLFFBQVEsRUFBRTtFQUMvQixTQUFTO0VBQ1QsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzlFLE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLElBQUksRUFBRSxVQUFVLE1BQU0sRUFBRTtFQUM5QixRQUFRLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxNQUFNLElBQUksQ0FBQyxFQUFDO0FBQzFDO0VBQ0EsUUFBUSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUM1QyxVQUFVLE9BQU8sSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDO0VBQ2xDLFNBQVM7RUFDVCxRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDakYsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sS0FBSyxFQUFFLFVBQVUsTUFBTSxFQUFFO0VBQy9CLFFBQVEsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxDQUFDLEVBQUM7QUFDMUM7RUFDQSxRQUFRLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzVDLFVBQVUsT0FBTyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUM7RUFDbEMsU0FBUztFQUNULFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUks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WCxTQUFTO0VBQ1QsUUFBUSxLQUFLO0VBQ2IsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsRUFBRTtFQUNkLFFBQVEsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUM7RUFDL0MsUUFBUSxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBQztFQUNsRCxRQUFRLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBQztFQUN0RCxRQUFRLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBQztFQUN0RCxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3pDLFVBQVUsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDakQsVUFBVSxNQUFNLEVBQUUsR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDdkQsVUFBVSxNQUFNLEVBQUUsR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDdkQsVUFBVSxNQUFNLEVBQUUsR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDdkQsVUFBVSxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxHQUFFO0VBQ3RELFVBQVUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRztFQUM3QixZQUFZLEdBQUcsRUFBRSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUM7RUFDckMsWUFBWSxNQUFNLEVBQUUsS0FBSztFQUN6QixZQUFXO0VBQ1gsU0FBUztFQUNULFFBQVEsS0FBSztFQUNiLE9BQU87QUFDUDtFQUNBLE1BQU0sS0FBSyxDQUFDLENBQUM7RUFDYixNQUFNLEtBQUssQ0FBQyxFQUFFO0VBQ2QsUUFBUSxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUM7RUFDbEUsUUFBUSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUN6QyxVQUFVLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQ3JELFVBQVUsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUN4RCxVQUFVLElBQUksSUFBSSxHQUFHLE1BQUs7RUFDMUIsVUFBVSxJQUFJLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxJQUFJLFNBQVE7RUFDekQsVUFBVSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksSUFBSSxHQUFHLEdBQUcsU0FBUTtFQUNqRCxVQUFVLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUc7RUFDN0IsWUFBWSxHQUFHLEVBQUUsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDO0VBQ3JDLFlBQVksTUFBTSxFQUFFLEtBQUs7RUFDekIsWUFBVztFQUNYLFNBQVM7RUFDVCxRQUFRLEtBQUs7RUFDYixPQUFPO0FBQ1A7RUFDQSxNQUFNLEtBQUssQ0FBQyxFQUFFO0VBQ2QsUUFBUSxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBQztFQUMvQyxRQUFRLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFDO0VBQ2xELFFBQVEsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFDO0VBQ3RELFFBQVEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDekMsVUFBVSxNQUFNLEVBQUUsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUNsRCxVQUFVLE1BQU0sR0FBRyxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUN4RCxVQUFVLE1BQU0sR0FBRyxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUN4RCxVQUFVLElBQUksSUFBSSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFHO0VBQzdDLFVBQVUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtFQUMzQixZQUFZLE1BQU0sRUFBRSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDcEQsWUFBWSxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDMUQsWUFBWSxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDMUQsWUFBWSxJQUFJLElBQUksR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFHO0VBQ2xELFdBQVc7RUFDWCxVQUFVLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUc7RUFDN0IsWUFBWSxH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SSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUM7RUFDNUQsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBQztFQUNyRSxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFVO0FBQzVEO0VBQ0EsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUM7RUFDMUQsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUM7RUFDM0QsR0FBRztBQUNIO0VBQ0E7RUFDQSxFQUFFLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUM7RUFDL0MsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUM7QUFDakQ7RUFDQTtFQUNBLEVBQUUsSUFBSSxDQUFDLGVBQWUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBQztFQUN0RCxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsRUFBQztBQUNqRTtFQUNBLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBQztBQUNqRDtFQUNBLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7RUFDdkQsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFDO0VBQzlDLEdBQUc7QUFDSDtFQUNBLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBQztFQUN2QyxDQUFD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
