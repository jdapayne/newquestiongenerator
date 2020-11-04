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

  function randElem (array, dist) {
    if ([...array].length === 0) throw new Error('empty array')
    if (!dist) dist = Math.random;
    const n = array.length || array.size;
    const i = randBetween(0, n - 1, dist);
    return [...array][i]
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
      constructor(data, options) {
          const defaults = {
              width: 250,
              height: 250
          };
          options = Object.assign({}, defaults, options);
          this.width = options.width;
          this.height = options.height; // only things I need from the options, generally?
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
              // position correctly - this could def be optimised - lots of back-and-forth
              // adjust to *center* label, rather than anchor top-right
              const lwidth = label.offsetWidth;
              const lheight = label.offsetHeight;
              label.style.left = (l.pos.x - lwidth / 2) + 'px';
              label.style.top = (l.pos.y - lheight / 2) + 'px';
              // I don't understand this adjustment. I think it might be needed in arithmagons, but it makes
              // others go funny.
              if (nudge) {
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
      scaleToFit(width, height, margin) {
          let topLeft = Point.min(this.allpoints);
          let bottomRight = Point.max(this.allpoints);
          const totalWidth = bottomRight.x - topLeft.x;
          const totalHeight = bottomRight.y - topLeft.y;
          this.scale(Math.min((width - margin) / totalWidth, (height - margin) / totalHeight));
          // centre
          topLeft = Point.min(this.allpoints);
          bottomRight = Point.max(this.allpoints);
          const center = Point.mean([topLeft, bottomRight]);
          this.translate(width / 2 - center.x, height / 2 - center.y); // centre
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
    // this.O
    // this.A
    // this.C = []
    // this.labels = []
    // this.canvas
    // this.DOM
    // this.rotation
    constructor (data, options) {
      super(data, options); // sets this.width this.height, initialises this.labels, creates dom elements
      const width = this.width;
      const height = this.height;
      const radius = this.radius = Math.min(width, height) / 2.5;

      // Set up main points
      this.O = new Point(0, 0); // center point
      this.A = new Point(radius, 0); // first point
      this.C = []; // Points around outside
      let totalangle = 0; // nb in radians
      for (let i = 0; i < this.data.angles.length; i++) {
        totalangle += this.data.angles[i] * Math.PI / 180;
        this.C[i] = Point.fromPolar(radius, totalangle);
      }

      // Set up labels
      totalangle = 0;
      for (let i = 0; i < this.data.angles.length; i++) {
        const theta = this.data.angles[i];
        this.labels[i] = {
          pos: Point.fromPolarDeg(radius * (0.4 + 6 / theta), totalangle + theta / 2),
          textq: this.data.missing[i] ? 'x^\\circ' : this.data.angles[i].toString() + '^\\circ',
          styleq: 'normal'
        };
        if (this.data.missing[i]) {
          this.labels[i].texta = this.data.angles[i].toString() + '^\\circ';
          this.labels[i].stylea = 'answer';
        } else {
          this.labels[i].texta = this.labels[i].textq;
          this.labels[i].stylea = this.labels[i].styleq;
        }
        totalangle += theta;
      }

      this.labels.forEach(l => {
        l.text = l.textq;
        l.style = l.styleq;
      });

      // Randomly rotate and center
      this.rotation = (options.rotation !== undefined) ? this.rotate(options.rotation) : this.randomRotate();
      this.translate(width / 2 - this.O.x, height / 2 - this.O.y); // centre
    }

    render () {
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
      for (let i = 0; i < this.data.angles.length; i++) {
        const theta = this.data.angles[i] * Math.PI / 180;
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

    get allpoints () {
      let allpoints = [this.A, this.O];
      allpoints = allpoints.concat(this.C);
      this.labels.forEach(function (l) {
        allpoints.push(l.pos);
      });
      return allpoints
    }
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
      constructor(angleSum, angles, missing) {
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
      }
      static random(options) {
          // choose constructor method based on options
          if (options.repeated) {
              return this.randomRepeated(options);
          }
          else {
              return this.randomSimple(options);
          }
      }
      static randomSimple(options) {
          const defaults = {
              /* angleSum: 180 */ // must be set by caller
              minAngle: 10,
              minN: 2,
              maxN: 4
          };
          options = Object.assign({}, defaults, options);
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
      static random(options) {
          const defaults = {
              angleSum: 180,
              minAngle: 10,
              minN: 2,
              maxN: 4,
              repeated: false
          };
          options = Object.assign({}, defaults, options);
          const data = MissingAnglesNumberData.random(options);
          const view = new MissingAnglesAroundView(data, options); // TODO eliminate public constructors
          return new MissingAnglesAroundQ(data, view);
      }
      static get commandWord() { return 'Find the missing value'; }
  }

  class MissingAnglesTriangleView extends GraphicQView {
    // this.A, this.B, this.C :: Point -- the vertices of the triangle
    // this.labels = []
    // this.canvas
    // this.DOM
    // this.rotation
    constructor (data, options) {
      super(data, options); // sets this.width this.height, this.data initialises this.labels, creates dom elements
      const width = this.width;
      const height = this.height;

      // generate points (with longest side 1
      this.A = new Point(0, 0);
      this.B = Point.fromPolarDeg(1, data.angles[0]);
      this.C = new Point(
        sinDeg(this.data.angles[1]) / sinDeg(this.data.angles[2]), 0
      );

      // Create labels
      const inCenter = Point.inCenter(this.A, this.B, this.C);

      let j = 0; // keeps track of 'x' and 'y' as labels
      for (let i = 0; i < 3; i++) {
        const p = [this.A, this.B, this.C][i];

        // nudging label toward center
        // const nudgeDistance = this.data.angles[i]
        // const position = p.clone().moveToward(inCenter,
        let textq;
        if (this.data.missing[i]) {
          textq = String.fromCharCode(120+j); // 120 = 'x'
          j++;
        } else {
          textq = this.data.angles[i].toString();
        }
        textq += '^\\circ';
        this.labels[i] = {
          pos: Point.mean(p, p, inCenter), // weighted mean - position from inCenter
          textq: textq,
          styleq: 'normal'
        };
        if (this.data.missing[i]) {
          this.labels[i].texta = this.data.angles[i].toString() + '^\\circ';
          this.labels[i].stylea = 'answer';
        } else {
          this.labels[i].texta = this.labels[i].textq;
          this.labels[i].stylea = this.labels[i].styleq;
        }
      }

      this.labels.forEach(l => {
        l.text = l.textq;
        l.style = l.styleq;
      });

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

    render () {
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
        } else {
          ctx.lineTo(next.x, next.y);
        }
      }
      ctx.strokeStyle = 'gray';
      ctx.stroke();
      ctx.closePath();

      this.renderLabels(false);
    }

    get allpoints () {
      const allpoints = [this.A, this.B, this.C];
      this.labels.forEach(l => { allpoints.push(l.pos); });
      return allpoints
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

    static random (options) {
      const optionsOverride = {
        angleSum: 180,
        minAngle: 25,
        minN: 3,
        maxN: 3,
      };
      options = Object.assign(options,optionsOverride);
      options.repeated  = options.repeated || false;

      const data = MissingAnglesTriangleData.random(options);
      const view = new MissingAnglesTriangleView(data, options);

      return new MissingAnglesTriangleQ(data, view, options)
    }

    static get commandWord () { return 'Find the missing value' }
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
              default:
                  subtype = 'repeated';
                  questionOptions.minN = 3;
                  questionOptions.maxN = 4;
                  break;
          }
          return this.randomFromTypeWithOptions(type, subtype, questionOptions);
      }
      static randomFromTypeWithOptions(type, subtype, questionOptions) {
          let question;
          questionOptions = questionOptions || {};
          switch (type) {
              case 'aaap':
              case 'aosl': {
                  questionOptions.angleSum = (type === 'aaap') ? 360 : 180;
                  if (subtype === 'repeated') {
                      questionOptions.repeated = true;
                  }
                  question = MissingAnglesAroundQ.random(questionOptions);
                  break;
              }
              case 'triangle': {
                  questionOptions.repeated = (subtype === "repeated");
                  question = MissingAnglesTriangleQ.random(questionOptions);
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

  /* TODO list:
   * Additional question block - probably in main.js
   * Remove options button for topics without options
   * Zoom/scale buttons
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
      {qNumberText += options.difficulty;}
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
  });

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vbW9kdWxlcy92ZW5kb3IvcnNsaWRlci5qcyIsIi4uL21vZHVsZXMvVXRpbGl0aWVzLmpzIiwiLi4vbW9kdWxlcy9PcHRpb25zU2V0LmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9RdWVzdGlvbi50cyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGV4dFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FsZ2VicmFpY0ZyYWN0aW9uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvSW50ZWdlckFkZC5qcyIsIi4uL21vZHVsZXMvUG9pbnQuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRLnRzIiwiLi4vbW9kdWxlcy92ZW5kb3IvZnJhY3Rpb24uanMiLCIuLi9tb2R1bGVzL01vbm9taWFsLmpzIiwiLi4vbW9kdWxlcy9Qb2x5bm9taWFsLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9Bcml0aG1hZ29uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGVzdFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FkZEFaZXJvLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9UZXh0US9FcXVhdGlvbk9mTGluZS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldy5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YS50cyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kUS50cyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3LmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEudHMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzV3JhcHBlci50cyIsIi4uL21vZHVsZXMvVG9waWNDaG9vc2VyLmpzIiwiLi4vbW9kdWxlcy92ZW5kb3IvVGluZ2xlLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvblNldC5qcyIsIi4uL21haW4uanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogUnNsaWRlci4gRG93bmxvYWRlZCBmcm9tIGh0dHBzOi8vc2xhd29taXItemF6aWFibG8uZ2l0aHViLmlvL3JhbmdlLXNsaWRlci9cbiAqIE1vZGlmaWVkIHRvIG1ha2UgaW50byBFUzYgbW9kdWxlIGFuZCBmaXggYSBmZXcgYnVnc1xuICovXG5cbnZhciBSUyA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIHRoaXMuaW5wdXQgPSBudWxsXG4gIHRoaXMuaW5wdXREaXNwbGF5ID0gbnVsbFxuICB0aGlzLnNsaWRlciA9IG51bGxcbiAgdGhpcy5zbGlkZXJXaWR0aCA9IDBcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gMFxuICB0aGlzLnBvaW50ZXJXaWR0aCA9IDBcbiAgdGhpcy5wb2ludGVyUiA9IG51bGxcbiAgdGhpcy5wb2ludGVyTCA9IG51bGxcbiAgdGhpcy5hY3RpdmVQb2ludGVyID0gbnVsbFxuICB0aGlzLnNlbGVjdGVkID0gbnVsbFxuICB0aGlzLnNjYWxlID0gbnVsbFxuICB0aGlzLnN0ZXAgPSAwXG4gIHRoaXMudGlwTCA9IG51bGxcbiAgdGhpcy50aXBSID0gbnVsbFxuICB0aGlzLnRpbWVvdXQgPSBudWxsXG4gIHRoaXMudmFsUmFuZ2UgPSBmYWxzZVxuXG4gIHRoaXMudmFsdWVzID0ge1xuICAgIHN0YXJ0OiBudWxsLFxuICAgIGVuZDogbnVsbFxuICB9XG4gIHRoaXMuY29uZiA9IHtcbiAgICB0YXJnZXQ6IG51bGwsXG4gICAgdmFsdWVzOiBudWxsLFxuICAgIHNldDogbnVsbCxcbiAgICByYW5nZTogZmFsc2UsXG4gICAgd2lkdGg6IG51bGwsXG4gICAgc2NhbGU6IHRydWUsXG4gICAgbGFiZWxzOiB0cnVlLFxuICAgIHRvb2x0aXA6IHRydWUsXG4gICAgc3RlcDogbnVsbCxcbiAgICBkaXNhYmxlZDogZmFsc2UsXG4gICAgb25DaGFuZ2U6IG51bGxcbiAgfVxuXG4gIHRoaXMuY2xzID0ge1xuICAgIGNvbnRhaW5lcjogJ3JzLWNvbnRhaW5lcicsXG4gICAgYmFja2dyb3VuZDogJ3JzLWJnJyxcbiAgICBzZWxlY3RlZDogJ3JzLXNlbGVjdGVkJyxcbiAgICBwb2ludGVyOiAncnMtcG9pbnRlcicsXG4gICAgc2NhbGU6ICdycy1zY2FsZScsXG4gICAgbm9zY2FsZTogJ3JzLW5vc2NhbGUnLFxuICAgIHRpcDogJ3JzLXRvb2x0aXAnXG4gIH1cblxuICBmb3IgKHZhciBpIGluIHRoaXMuY29uZikgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbmYsIGkpKSB0aGlzLmNvbmZbaV0gPSBjb25mW2ldIH1cblxuICB0aGlzLmluaXQoKVxufVxuXG5SUy5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHR5cGVvZiB0aGlzLmNvbmYudGFyZ2V0ID09PSAnb2JqZWN0JykgdGhpcy5pbnB1dCA9IHRoaXMuY29uZi50YXJnZXRcbiAgZWxzZSB0aGlzLmlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5jb25mLnRhcmdldC5yZXBsYWNlKCcjJywgJycpKVxuXG4gIGlmICghdGhpcy5pbnB1dCkgcmV0dXJuIGNvbnNvbGUubG9nKCdDYW5ub3QgZmluZCB0YXJnZXQgZWxlbWVudC4uLicpXG5cbiAgdGhpcy5pbnB1dERpc3BsYXkgPSBnZXRDb21wdXRlZFN0eWxlKHRoaXMuaW5wdXQsIG51bGwpLmRpc3BsYXlcbiAgdGhpcy5pbnB1dC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG4gIHRoaXMudmFsUmFuZ2UgPSAhKHRoaXMuY29uZi52YWx1ZXMgaW5zdGFuY2VvZiBBcnJheSlcblxuICBpZiAodGhpcy52YWxSYW5nZSkge1xuICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuY29uZi52YWx1ZXMsICdtaW4nKSB8fCAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuY29uZi52YWx1ZXMsICdtYXgnKSkgeyByZXR1cm4gY29uc29sZS5sb2coJ01pc3NpbmcgbWluIG9yIG1heCB2YWx1ZS4uLicpIH1cbiAgfVxuICByZXR1cm4gdGhpcy5jcmVhdGVTbGlkZXIoKVxufVxuXG5SUy5wcm90b3R5cGUuY3JlYXRlU2xpZGVyID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNsaWRlciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLmNvbnRhaW5lcilcbiAgdGhpcy5zbGlkZXIuaW5uZXJIVE1MID0gJzxkaXYgY2xhc3M9XCJycy1iZ1wiPjwvZGl2PidcbiAgdGhpcy5zZWxlY3RlZCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnNlbGVjdGVkKVxuICB0aGlzLnBvaW50ZXJMID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMucG9pbnRlciwgWydkaXInLCAnbGVmdCddKVxuICB0aGlzLnNjYWxlID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMuc2NhbGUpXG5cbiAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7XG4gICAgdGhpcy50aXBMID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMudGlwKVxuICAgIHRoaXMudGlwUiA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnRpcClcbiAgICB0aGlzLnBvaW50ZXJMLmFwcGVuZENoaWxkKHRoaXMudGlwTClcbiAgfVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnNlbGVjdGVkKVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnNjYWxlKVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnBvaW50ZXJMKVxuXG4gIGlmICh0aGlzLmNvbmYucmFuZ2UpIHtcbiAgICB0aGlzLnBvaW50ZXJSID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMucG9pbnRlciwgWydkaXInLCAncmlnaHQnXSlcbiAgICBpZiAodGhpcy5jb25mLnRvb2x0aXApIHRoaXMucG9pbnRlclIuYXBwZW5kQ2hpbGQodGhpcy50aXBSKVxuICAgIHRoaXMuc2xpZGVyLmFwcGVuZENoaWxkKHRoaXMucG9pbnRlclIpXG4gIH1cblxuICB0aGlzLmlucHV0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuc2xpZGVyLCB0aGlzLmlucHV0Lm5leHRTaWJsaW5nKVxuXG4gIGlmICh0aGlzLmNvbmYud2lkdGgpIHRoaXMuc2xpZGVyLnN0eWxlLndpZHRoID0gcGFyc2VJbnQodGhpcy5jb25mLndpZHRoKSArICdweCdcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gdGhpcy5zbGlkZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdFxuICB0aGlzLnNsaWRlcldpZHRoID0gdGhpcy5zbGlkZXIuY2xpZW50V2lkdGhcbiAgdGhpcy5wb2ludGVyV2lkdGggPSB0aGlzLnBvaW50ZXJMLmNsaWVudFdpZHRoXG5cbiAgaWYgKCF0aGlzLmNvbmYuc2NhbGUpIHRoaXMuc2xpZGVyLmNsYXNzTGlzdC5hZGQodGhpcy5jbHMubm9zY2FsZSlcblxuICByZXR1cm4gdGhpcy5zZXRJbml0aWFsVmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLnNldEluaXRpYWxWYWx1ZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZGlzYWJsZWQodGhpcy5jb25mLmRpc2FibGVkKVxuXG4gIGlmICh0aGlzLnZhbFJhbmdlKSB0aGlzLmNvbmYudmFsdWVzID0gcHJlcGFyZUFycmF5VmFsdWVzKHRoaXMuY29uZilcblxuICB0aGlzLnZhbHVlcy5zdGFydCA9IDBcbiAgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnJhbmdlID8gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxIDogMFxuXG4gIGlmICh0aGlzLmNvbmYuc2V0ICYmIHRoaXMuY29uZi5zZXQubGVuZ3RoICYmIGNoZWNrSW5pdGlhbCh0aGlzLmNvbmYpKSB7XG4gICAgdmFyIHZhbHMgPSB0aGlzLmNvbmYuc2V0XG5cbiAgICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgICB0aGlzLnZhbHVlcy5zdGFydCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzBdKVxuICAgICAgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnNldFsxXSA/IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzFdKSA6IG51bGxcbiAgICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHZhbHNbMF0pXG4gIH1cbiAgcmV0dXJuIHRoaXMuY3JlYXRlU2NhbGUoKVxufVxuXG5SUy5wcm90b3R5cGUuY3JlYXRlU2NhbGUgPSBmdW5jdGlvbiAocmVzaXplKSB7XG4gIHRoaXMuc3RlcCA9IHRoaXMuc2xpZGVyV2lkdGggLyAodGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHtcbiAgICB2YXIgc3BhbiA9IGNyZWF0ZUVsZW1lbnQoJ3NwYW4nKVxuICAgIHZhciBpbnMgPSBjcmVhdGVFbGVtZW50KCdpbnMnKVxuXG4gICAgc3Bhbi5hcHBlbmRDaGlsZChpbnMpXG4gICAgdGhpcy5zY2FsZS5hcHBlbmRDaGlsZChzcGFuKVxuXG4gICAgc3Bhbi5zdHlsZS53aWR0aCA9IGkgPT09IGlMZW4gLSAxID8gMCA6IHRoaXMuc3RlcCArICdweCdcblxuICAgIGlmICghdGhpcy5jb25mLmxhYmVscykge1xuICAgICAgaWYgKGkgPT09IDAgfHwgaSA9PT0gaUxlbiAtIDEpIGlucy5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW2ldXG4gICAgfSBlbHNlIGlucy5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW2ldXG5cbiAgICBpbnMuc3R5bGUubWFyZ2luTGVmdCA9IChpbnMuY2xpZW50V2lkdGggLyAyKSAqIC0xICsgJ3B4J1xuICB9XG4gIHJldHVybiB0aGlzLmFkZEV2ZW50cygpXG59XG5cblJTLnByb3RvdHlwZS51cGRhdGVTY2FsZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zdGVwID0gdGhpcy5zbGlkZXJXaWR0aCAvICh0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpXG5cbiAgdmFyIHBpZWNlcyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NwYW4nKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gcGllY2VzLmxlbmd0aDsgaSA8IGlMZW4gLSAxOyBpKyspIHsgcGllY2VzW2ldLnN0eWxlLndpZHRoID0gdGhpcy5zdGVwICsgJ3B4JyB9XG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLmFkZEV2ZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHBvaW50ZXJzID0gdGhpcy5zbGlkZXIucXVlcnlTZWxlY3RvckFsbCgnLicgKyB0aGlzLmNscy5wb2ludGVyKVxuICB2YXIgcGllY2VzID0gdGhpcy5zbGlkZXIucXVlcnlTZWxlY3RvckFsbCgnc3BhbicpXG5cbiAgY3JlYXRlRXZlbnRzKGRvY3VtZW50LCAnbW91c2Vtb3ZlIHRvdWNobW92ZScsIHRoaXMubW92ZS5iaW5kKHRoaXMpKVxuICBjcmVhdGVFdmVudHMoZG9jdW1lbnQsICdtb3VzZXVwIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgdGhpcy5kcm9wLmJpbmQodGhpcykpXG5cbiAgZm9yIChsZXQgaSA9IDAsIGlMZW4gPSBwb2ludGVycy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgY3JlYXRlRXZlbnRzKHBvaW50ZXJzW2ldLCAnbW91c2Vkb3duIHRvdWNoc3RhcnQnLCB0aGlzLmRyYWcuYmluZCh0aGlzKSkgfVxuXG4gIGZvciAobGV0IGkgPSAwLCBpTGVuID0gcGllY2VzLmxlbmd0aDsgaSA8IGlMZW47IGkrKykgeyBjcmVhdGVFdmVudHMocGllY2VzW2ldLCAnY2xpY2snLCB0aGlzLm9uQ2xpY2tQaWVjZS5iaW5kKHRoaXMpKSB9XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMub25SZXNpemUuYmluZCh0aGlzKSlcblxuICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxufVxuXG5SUy5wcm90b3R5cGUuZHJhZyA9IGZ1bmN0aW9uIChlKSB7XG4gIGUucHJldmVudERlZmF1bHQoKVxuXG4gIGlmICh0aGlzLmNvbmYuZGlzYWJsZWQpIHJldHVyblxuXG4gIHZhciBkaXIgPSBlLnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtZGlyJylcbiAgaWYgKGRpciA9PT0gJ2xlZnQnKSB0aGlzLmFjdGl2ZVBvaW50ZXIgPSB0aGlzLnBvaW50ZXJMXG4gIGlmIChkaXIgPT09ICdyaWdodCcpIHRoaXMuYWN0aXZlUG9pbnRlciA9IHRoaXMucG9pbnRlclJcblxuICByZXR1cm4gdGhpcy5zbGlkZXIuY2xhc3NMaXN0LmFkZCgnc2xpZGluZycpXG59XG5cblJTLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24gKGUpIHtcbiAgaWYgKHRoaXMuYWN0aXZlUG9pbnRlciAmJiAhdGhpcy5jb25mLmRpc2FibGVkKSB7XG4gICAgdmFyIGNvb3JkWCA9IGUudHlwZSA9PT0gJ3RvdWNobW92ZScgPyBlLnRvdWNoZXNbMF0uY2xpZW50WCA6IGUucGFnZVhcbiAgICB2YXIgaW5kZXggPSBjb29yZFggLSB0aGlzLnNsaWRlckxlZnQgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKVxuXG4gICAgaW5kZXggPSBNYXRoLnJvdW5kKGluZGV4IC8gdGhpcy5zdGVwKVxuXG4gICAgaWYgKGluZGV4IDw9IDApIGluZGV4ID0gMFxuICAgIGlmIChpbmRleCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgaW5kZXggPSB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDFcblxuICAgIGlmICh0aGlzLmNvbmYucmFuZ2UpIHtcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgPT09IHRoaXMucG9pbnRlckwpIHRoaXMudmFsdWVzLnN0YXJ0ID0gaW5kZXhcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgPT09IHRoaXMucG9pbnRlclIpIHRoaXMudmFsdWVzLmVuZCA9IGluZGV4XG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IGluZGV4XG5cbiAgICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxuICB9XG59XG5cblJTLnByb3RvdHlwZS5kcm9wID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmFjdGl2ZVBvaW50ZXIgPSBudWxsXG59XG5cblJTLnByb3RvdHlwZS5zZXRWYWx1ZXMgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICB2YXIgYWN0aXZlUG9pbnRlciA9IHRoaXMuY29uZi5yYW5nZSA/ICdzdGFydCcgOiAnZW5kJ1xuXG4gIGlmIChzdGFydCAmJiB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2Yoc3RhcnQpID4gLTEpIHsgdGhpcy52YWx1ZXNbYWN0aXZlUG9pbnRlcl0gPSB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2Yoc3RhcnQpIH1cblxuICBpZiAoZW5kICYmIHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZihlbmQpID4gLTEpIHsgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKGVuZCkgfVxuXG4gIGlmICh0aGlzLmNvbmYucmFuZ2UgJiYgdGhpcy52YWx1ZXMuc3RhcnQgPiB0aGlzLnZhbHVlcy5lbmQpIHsgdGhpcy52YWx1ZXMuc3RhcnQgPSB0aGlzLnZhbHVlcy5lbmQgfVxuXG4gIHRoaXMucG9pbnRlckwuc3R5bGUubGVmdCA9ICh0aGlzLnZhbHVlc1thY3RpdmVQb2ludGVyXSAqIHRoaXMuc3RlcCAtICh0aGlzLnBvaW50ZXJXaWR0aCAvIDIpKSArICdweCdcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7XG4gICAgICB0aGlzLnRpcEwuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5zdGFydF1cbiAgICAgIHRoaXMudGlwUi5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1cbiAgICB9XG4gICAgdGhpcy5pbnB1dC52YWx1ZSA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdICsgJywnICsgdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG4gICAgdGhpcy5wb2ludGVyUi5zdHlsZS5sZWZ0ID0gKHRoaXMudmFsdWVzLmVuZCAqIHRoaXMuc3RlcCAtICh0aGlzLnBvaW50ZXJXaWR0aCAvIDIpKSArICdweCdcbiAgfSBlbHNlIHtcbiAgICBpZiAodGhpcy5jb25mLnRvb2x0aXApIHsgdGhpcy50aXBMLmlubmVySFRNTCA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXSB9XG4gICAgdGhpcy5pbnB1dC52YWx1ZSA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxuICB9XG5cbiAgaWYgKHRoaXMudmFsdWVzLmVuZCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG4gIGlmICh0aGlzLnZhbHVlcy5zdGFydCA8IDApIHRoaXMudmFsdWVzLnN0YXJ0ID0gMFxuXG4gIHRoaXMuc2VsZWN0ZWQuc3R5bGUud2lkdGggPSAodGhpcy52YWx1ZXMuZW5kIC0gdGhpcy52YWx1ZXMuc3RhcnQpICogdGhpcy5zdGVwICsgJ3B4J1xuICB0aGlzLnNlbGVjdGVkLnN0eWxlLmxlZnQgPSB0aGlzLnZhbHVlcy5zdGFydCAqIHRoaXMuc3RlcCArICdweCdcblxuICByZXR1cm4gdGhpcy5vbkNoYW5nZSgpXG59XG5cblJTLnByb3RvdHlwZS5vbkNsaWNrUGllY2UgPSBmdW5jdGlvbiAoZSkge1xuICBpZiAodGhpcy5jb25mLmRpc2FibGVkKSByZXR1cm5cblxuICB2YXIgaWR4ID0gTWF0aC5yb3VuZCgoZS5jbGllbnRYIC0gdGhpcy5zbGlkZXJMZWZ0KSAvIHRoaXMuc3RlcClcblxuICBpZiAoaWR4ID4gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKSBpZHggPSB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDFcbiAgaWYgKGlkeCA8IDApIGlkeCA9IDBcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgaWYgKGlkeCAtIHRoaXMudmFsdWVzLnN0YXJ0IDw9IHRoaXMudmFsdWVzLmVuZCAtIGlkeCkge1xuICAgICAgdGhpcy52YWx1ZXMuc3RhcnQgPSBpZHhcbiAgICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gaWR4XG4gIH0gZWxzZSB0aGlzLnZhbHVlcy5lbmQgPSBpZHhcblxuICB0aGlzLnNsaWRlci5jbGFzc0xpc3QucmVtb3ZlKCdzbGlkaW5nJylcblxuICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxufVxuXG5SUy5wcm90b3R5cGUub25DaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBfdGhpcyA9IHRoaXNcblxuICBpZiAodGhpcy50aW1lb3V0KSBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0KVxuXG4gIHRoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIGlmIChfdGhpcy5jb25mLm9uQ2hhbmdlICYmIHR5cGVvZiBfdGhpcy5jb25mLm9uQ2hhbmdlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gX3RoaXMuY29uZi5vbkNoYW5nZShfdGhpcy5pbnB1dC52YWx1ZSlcbiAgICB9XG4gIH0sIDUwMClcbn1cblxuUlMucHJvdG90eXBlLm9uUmVzaXplID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNsaWRlckxlZnQgPSB0aGlzLnNsaWRlci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0XG4gIHRoaXMuc2xpZGVyV2lkdGggPSB0aGlzLnNsaWRlci5jbGllbnRXaWR0aFxuICByZXR1cm4gdGhpcy51cGRhdGVTY2FsZSgpXG59XG5cblJTLnByb3RvdHlwZS5kaXNhYmxlZCA9IGZ1bmN0aW9uIChkaXNhYmxlZCkge1xuICB0aGlzLmNvbmYuZGlzYWJsZWQgPSBkaXNhYmxlZFxuICB0aGlzLnNsaWRlci5jbGFzc0xpc3RbZGlzYWJsZWQgPyAnYWRkJyA6ICdyZW1vdmUnXSgnZGlzYWJsZWQnKVxufVxuXG5SUy5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIFJldHVybiBsaXN0IG9mIG51bWJlcnMsIHJhdGhlciB0aGFuIGEgc3RyaW5nLCB3aGljaCB3b3VsZCBqdXN0IGJlIHNpbGx5XG4gIC8vICByZXR1cm4gdGhpcy5pbnB1dC52YWx1ZVxuICByZXR1cm4gW3RoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdLCB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1dXG59XG5cblJTLnByb3RvdHlwZS5nZXRWYWx1ZUwgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIEdldCBsZWZ0IChpLmUuIHNtYWxsZXN0KSB2YWx1ZVxuICByZXR1cm4gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5zdGFydF1cbn1cblxuUlMucHJvdG90eXBlLmdldFZhbHVlUiA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gR2V0IHJpZ2h0IChpLmUuIHNtYWxsZXN0KSB2YWx1ZVxuICByZXR1cm4gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG59XG5cblJTLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmlucHV0LnN0eWxlLmRpc3BsYXkgPSB0aGlzLmlucHV0RGlzcGxheVxuICB0aGlzLnNsaWRlci5yZW1vdmUoKVxufVxuXG52YXIgY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uIChlbCwgY2xzLCBkYXRhQXR0cikge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZWwpXG4gIGlmIChjbHMpIGVsZW1lbnQuY2xhc3NOYW1lID0gY2xzXG4gIGlmIChkYXRhQXR0ciAmJiBkYXRhQXR0ci5sZW5ndGggPT09IDIpIHsgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2RhdGEtJyArIGRhdGFBdHRyWzBdLCBkYXRhQXR0clsxXSkgfVxuXG4gIHJldHVybiBlbGVtZW50XG59XG5cbnZhciBjcmVhdGVFdmVudHMgPSBmdW5jdGlvbiAoZWwsIGV2LCBjYWxsYmFjaykge1xuICB2YXIgZXZlbnRzID0gZXYuc3BsaXQoJyAnKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gZXZlbnRzLmxlbmd0aDsgaSA8IGlMZW47IGkrKykgeyBlbC5hZGRFdmVudExpc3RlbmVyKGV2ZW50c1tpXSwgY2FsbGJhY2spIH1cbn1cblxudmFyIHByZXBhcmVBcnJheVZhbHVlcyA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIHZhciB2YWx1ZXMgPSBbXVxuICB2YXIgcmFuZ2UgPSBjb25mLnZhbHVlcy5tYXggLSBjb25mLnZhbHVlcy5taW5cblxuICBpZiAoIWNvbmYuc3RlcCkge1xuICAgIGNvbnNvbGUubG9nKCdObyBzdGVwIGRlZmluZWQuLi4nKVxuICAgIHJldHVybiBbY29uZi52YWx1ZXMubWluLCBjb25mLnZhbHVlcy5tYXhdXG4gIH1cblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IChyYW5nZSAvIGNvbmYuc3RlcCk7IGkgPCBpTGVuOyBpKyspIHsgdmFsdWVzLnB1c2goY29uZi52YWx1ZXMubWluICsgaSAqIGNvbmYuc3RlcCkgfVxuXG4gIGlmICh2YWx1ZXMuaW5kZXhPZihjb25mLnZhbHVlcy5tYXgpIDwgMCkgdmFsdWVzLnB1c2goY29uZi52YWx1ZXMubWF4KVxuXG4gIHJldHVybiB2YWx1ZXNcbn1cblxudmFyIGNoZWNrSW5pdGlhbCA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIGlmICghY29uZi5zZXQgfHwgY29uZi5zZXQubGVuZ3RoIDwgMSkgcmV0dXJuIG51bGxcbiAgaWYgKGNvbmYudmFsdWVzLmluZGV4T2YoY29uZi5zZXRbMF0pIDwgMCkgcmV0dXJuIG51bGxcblxuICBpZiAoY29uZi5yYW5nZSkge1xuICAgIGlmIChjb25mLnNldC5sZW5ndGggPCAyIHx8IGNvbmYudmFsdWVzLmluZGV4T2YoY29uZi5zZXRbMV0pIDwgMCkgcmV0dXJuIG51bGxcbiAgfVxuICByZXR1cm4gdHJ1ZVxufVxuXG5leHBvcnQgZGVmYXVsdCBSU1xuIiwiLyogUk5HcyAvIHNlbGVjdG9ycyAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdhdXNzaWFuIChuKSB7XG4gIGxldCBybnVtID0gMFxuICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgIHJudW0gKz0gTWF0aC5yYW5kb20oKVxuICB9XG4gIHJldHVybiBybnVtIC8gblxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZEJldHdlZW4gKG4sIG0sIGRpc3QpIHtcbiAgLy8gcmV0dXJuIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBuIGFuZCBtIGluY2x1c2l2ZVxuICAvLyBkaXN0IChvcHRpb25hbCkgaXMgYSBmdW5jdGlvbiByZXR1cm5pbmcgYSB2YWx1ZSBpbiBbMCwxKVxuICAvLyBkZWZhdWx0IGlzIHNsaWdodGx5IGJpYXNlZCB0b3dhcmRzIG1pZGRsZVxuICBpZiAoIWRpc3QpIGRpc3QgPSBNYXRoLnJhbmRvbVxuICByZXR1cm4gbiArIE1hdGguZmxvb3IoZGlzdCgpICogKG0gLSBuICsgMSkpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kQmV0d2VlbkZpbHRlciAobiwgbSwgZmlsdGVyKSB7XG4gIC8qIHJldHVybnMgYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIG4gYW5kIG0gaW5jbHVzaXZlIHdoaWNoIHNhdGlzZmllcyB0aGUgZmlsdGVyXG4gIC8gIG4sIG06IGludGVnZXJcbiAgLyAgZmlsdGVyOiBJbnQtPiBCb29sXG4gICovXG4gIGNvbnN0IGFyciA9IFtdXG4gIGZvciAobGV0IGkgPSBuOyBpIDwgbSArIDE7IGkrKykge1xuICAgIGlmIChmaWx0ZXIoaSkpIGFyci5wdXNoKGkpXG4gIH1cbiAgaWYgKGFyciA9PT0gW10pIHRocm93IG5ldyBFcnJvcignb3ZlcmZpbHRlcmVkJylcbiAgY29uc3QgaSA9IHJhbmRCZXR3ZWVuKDAsIGFyci5sZW5ndGggLSAxKVxuICByZXR1cm4gYXJyW2ldXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kTXVsdEJldHdlZW4gKG1pbiwgbWF4LCBuKSB7XG4gIC8vIHJldHVybiBhIHJhbmRvbSBtdWx0aXBsZSBvZiBuIGJldHdlZW4gbiBhbmQgbSAoaW5jbHVzaXZlIGlmIHBvc3NpYmxlKVxuICBtaW4gPSBNYXRoLmNlaWwobWluIC8gbikgKiBuXG4gIG1heCA9IE1hdGguZmxvb3IobWF4IC8gbikgKiBuIC8vIGNvdWxkIGNoZWNrIGRpdmlzaWJpbGl0eSBmaXJzdCB0byBtYXhpbWlzZSBwZXJmb3JtYWNlLCBidXQgSSdtIHN1cmUgdGhlIGhpdCBpc24ndCBiYWRcblxuICByZXR1cm4gcmFuZEJldHdlZW4obWluIC8gbiwgbWF4IC8gbikgKiBuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kRWxlbSAoYXJyYXksIGRpc3QpIHtcbiAgaWYgKFsuLi5hcnJheV0ubGVuZ3RoID09PSAwKSB0aHJvdyBuZXcgRXJyb3IoJ2VtcHR5IGFycmF5JylcbiAgaWYgKCFkaXN0KSBkaXN0ID0gTWF0aC5yYW5kb21cbiAgY29uc3QgbiA9IGFycmF5Lmxlbmd0aCB8fCBhcnJheS5zaXplXG4gIGNvbnN0IGkgPSByYW5kQmV0d2VlbigwLCBuIC0gMSwgZGlzdClcbiAgcmV0dXJuIFsuLi5hcnJheV1baV1cbn1cblxuLyogTWF0aHMgKi9cbmV4cG9ydCBmdW5jdGlvbiByb3VuZFRvVGVuIChuKSB7XG4gIHJldHVybiBNYXRoLnJvdW5kKG4gLyAxMCkgKiAxMFxufVxuXG5leHBvcnQgZnVuY3Rpb24gcm91bmREUCAoeCwgbikge1xuICByZXR1cm4gTWF0aC5yb3VuZCh4ICogTWF0aC5wb3coMTAsIG4pKSAvIE1hdGgucG93KDEwLCBuKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVnVG9SYWQgKHgpIHtcbiAgcmV0dXJuIHggKiBNYXRoLlBJIC8gMTgwXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaW5EZWcgKHgpIHtcbiAgcmV0dXJuIE1hdGguc2luKHggKiBNYXRoLlBJIC8gMTgwKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY29zRGVnICh4KSB7XG4gIHJldHVybiBNYXRoLmNvcyh4ICogTWF0aC5QSSAvIDE4MClcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNjYWxlZFN0ciAobiwgZHApIHtcbiAgLy8gcmV0dXJucyBhIHN0cmluZyByZXByZXNlbnRpbmcgbi8xMF5kcFxuICAvLyBlLmcuIHNjYWxlZFN0cigzNCwxKT1cIjMuNFwiXG4gIC8vIHNjYWxlZFN0cigzMTQsMik9XCIzLjE0XCJcbiAgLy8gc2NhbGVkU3RyKDMwLDEpPVwiM1wiXG4gIC8vIFRyeWluZyB0byBhdm9pZCBwcmVjaXNpb24gZXJyb3JzIVxuICBpZiAoZHAgPT09IDApIHJldHVybiBuXG4gIGNvbnN0IGZhY3RvciA9IE1hdGgucG93KDEwLCBkcClcbiAgY29uc3QgaW50cGFydCA9IE1hdGguZmxvb3IobiAvIGZhY3RvcilcbiAgY29uc3QgZGVjcGFydCA9IG4gJSBmYWN0b3JcbiAgaWYgKGRlY3BhcnQgPT09IDApIHtcbiAgICByZXR1cm4gaW50cGFydFxuICB9IGVsc2Uge1xuICAgIHJldHVybiBpbnRwYXJ0ICsgJy4nICsgZGVjcGFydFxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnY2QgKGEsIGIpIHtcbiAgLy8gdGFrZW4gZnJvbSBmcmFjdGlvbi5qc1xuICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICBpZiAoIWIpIHsgcmV0dXJuIGEgfVxuXG4gIHdoaWxlICgxKSB7XG4gICAgYSAlPSBiXG4gICAgaWYgKCFhKSB7IHJldHVybiBiIH1cbiAgICBiICU9IGFcbiAgICBpZiAoIWIpIHsgcmV0dXJuIGEgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsY20gKGEsIGIpIHtcbiAgcmV0dXJuIGEgKiBiIC8gZ2NkKGEsIGIpXG59XG5cbi8qIEFycmF5cyBhbmQgc2ltaWxhciAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNvcnRUb2dldGhlciAoYXJyMCwgYXJyMSwgZikge1xuICBpZiAoYXJyMC5sZW5ndGggIT09IGFycjEubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm90aCBhcmd1bWVudHMgbXVzdCBiZSBhcnJheXMgb2YgdGhlIHNhbWUgbGVuZ3RoJylcbiAgfVxuXG4gIGNvbnN0IG4gPSBhcnIwLmxlbmd0aFxuICBjb25zdCBjb21iaW5lZCA9IFtdXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgY29tYmluZWRbaV0gPSBbYXJyMFtpXSwgYXJyMVtpXV1cbiAgfVxuXG4gIGNvbWJpbmVkLnNvcnQoKHgsIHkpID0+IGYoeFswXSwgeVswXSkpXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICBhcnIwW2ldID0gY29tYmluZWRbaV1bMF1cbiAgICBhcnIxW2ldID0gY29tYmluZWRbaV1bMV1cbiAgfVxuXG4gIHJldHVybiBbYXJyMCwgYXJyMV1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGUgKGFycmF5KSB7XG4gIC8vIEtudXRoLUZpc2hlci1ZYXRlc1xuICAvLyBmcm9tIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yNDUwOTc2LzM3MzcyOTVcbiAgLy8gbmIuIHNodWZmbGVzIGluIHBsYWNlXG4gIHZhciBjdXJyZW50SW5kZXggPSBhcnJheS5sZW5ndGg7IHZhciB0ZW1wb3JhcnlWYWx1ZTsgdmFyIHJhbmRvbUluZGV4XG5cbiAgLy8gV2hpbGUgdGhlcmUgcmVtYWluIGVsZW1lbnRzIHRvIHNodWZmbGUuLi5cbiAgd2hpbGUgKGN1cnJlbnRJbmRleCAhPT0gMCkge1xuICAgIC8vIFBpY2sgYSByZW1haW5pbmcgZWxlbWVudC4uLlxuICAgIHJhbmRvbUluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY3VycmVudEluZGV4KVxuICAgIGN1cnJlbnRJbmRleCAtPSAxXG5cbiAgICAvLyBBbmQgc3dhcCBpdCB3aXRoIHRoZSBjdXJyZW50IGVsZW1lbnQuXG4gICAgdGVtcG9yYXJ5VmFsdWUgPSBhcnJheVtjdXJyZW50SW5kZXhdXG4gICAgYXJyYXlbY3VycmVudEluZGV4XSA9IGFycmF5W3JhbmRvbUluZGV4XVxuICAgIGFycmF5W3JhbmRvbUluZGV4XSA9IHRlbXBvcmFyeVZhbHVlXG4gIH1cblxuICByZXR1cm4gYXJyYXlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdlYWtJbmNsdWRlcyAoYSwgZSkge1xuICByZXR1cm4gKEFycmF5LmlzQXJyYXkoYSkgJiYgYS5pbmNsdWRlcyhlKSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpcnN0VW5pcXVlSW5kZXggKGFycmF5KSB7XG4gIC8vIHJldHVybnMgaW5kZXggb2YgZmlyc3QgdW5pcXVlIGVsZW1lbnRcbiAgLy8gaWYgbm9uZSwgcmV0dXJucyBsZW5ndGggb2YgYXJyYXlcbiAgbGV0IGkgPSAwXG4gIHdoaWxlIChpIDwgYXJyYXkubGVuZ3RoKSB7XG4gICAgaWYgKGFycmF5LmluZGV4T2YoYXJyYXlbaV0pID09PSBhcnJheS5sYXN0SW5kZXhPZihhcnJheVtpXSkpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIGkrK1xuICB9XG4gIHJldHVybiBpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBib29sT2JqZWN0VG9BcnJheSAob2JqKSB7XG4gIC8vIEdpdmVuIGFuIG9iamVjdCB3aGVyZSBhbGwgdmFsdWVzIGFyZSBib29sZWFuLCByZXR1cm4ga2V5cyB3aGVyZSB0aGUgdmFsdWUgaXMgdHJ1ZVxuICBjb25zdCByZXN1bHQgPSBbXVxuICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHtcbiAgICBpZiAob2JqW2tleV0pIHJlc3VsdC5wdXNoKGtleSlcbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qIE9iamVjdCBwcm9wZXJ0eSBhY2Nlc3MgYnkgc3RyaW5nICovXG5leHBvcnQgZnVuY3Rpb24gcHJvcEJ5U3RyaW5nIChvLCBzLCB4KSB7XG4gIC8qIEUuZy4gYnlTdHJpbmcobXlPYmosXCJmb28uYmFyXCIpIC0+IG15T2JqLmZvby5iYXJcbiAgICAgKiBieVN0cmluZyhteU9iaixcImZvby5iYXJcIixcImJhelwiKSAtPiBteU9iai5mb28uYmFyID0gXCJiYXpcIlxuICAgICAqL1xuICBzID0gcy5yZXBsYWNlKC9cXFsoXFx3KylcXF0vZywgJy4kMScpIC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gIHMgPSBzLnJlcGxhY2UoL15cXC4vLCAnJykgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICB2YXIgYSA9IHMuc3BsaXQoJy4nKVxuICBmb3IgKHZhciBpID0gMCwgbiA9IGEubGVuZ3RoIC0gMTsgaSA8IG47ICsraSkge1xuICAgIHZhciBrID0gYVtpXVxuICAgIGlmIChrIGluIG8pIHtcbiAgICAgIG8gPSBvW2tdXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgfVxuICBpZiAoeCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gb1thW25dXVxuICBlbHNlIG9bYVtuXV0gPSB4XG59XG5cbi8qIExvZ2ljICovXG5leHBvcnQgZnVuY3Rpb24gbUlmIChwLCBxKSB7IC8vIG1hdGVyaWFsIGNvbmRpdGlvbmFsXG4gIHJldHVybiAoIXAgfHwgcSlcbn1cblxuLyogRE9NIG1hbmlwdWxhdGlvbiBhbmQgcXVlcnlpbmcgKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbGVtICh0YWdOYW1lLCBjbGFzc05hbWUsIHBhcmVudCkge1xuICAvLyBjcmVhdGUsIHNldCBjbGFzcyBhbmQgYXBwZW5kIGluIG9uZVxuICBjb25zdCBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKVxuICBpZiAoY2xhc3NOYW1lKSBlbGVtLmNsYXNzTmFtZSA9IGNsYXNzTmFtZVxuICBpZiAocGFyZW50KSBwYXJlbnQuYXBwZW5kQ2hpbGQoZWxlbSlcbiAgcmV0dXJuIGVsZW1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc0FuY2VzdG9yQ2xhc3MgKGVsZW0sIGNsYXNzTmFtZSkge1xuICAvLyBjaGVjayBpZiBhbiBlbGVtZW50IGVsZW0gb3IgYW55IG9mIGl0cyBhbmNlc3RvcnMgaGFzIGNsc3NcbiAgbGV0IHJlc3VsdCA9IGZhbHNlXG4gIGZvciAoO2VsZW0gJiYgZWxlbSAhPT0gZG9jdW1lbnQ7IGVsZW0gPSBlbGVtLnBhcmVudE5vZGUpIHsgLy8gdHJhdmVyc2UgRE9NIHVwd2FyZHNcbiAgICBpZiAoZWxlbS5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKSkge1xuICAgICAgcmVzdWx0ID0gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qIENhbnZhcyBkcmF3aW5nICovXG5leHBvcnQgZnVuY3Rpb24gZGFzaGVkTGluZSAoY3R4LCB4MSwgeTEsIHgyLCB5Mikge1xuICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHgyIC0geDEsIHkyIC0geTEpXG4gIGNvbnN0IGRhc2h4ID0gKHkxIC0geTIpIC8gbGVuZ3RoIC8vIHVuaXQgdmVjdG9yIHBlcnBlbmRpY3VsYXIgdG8gbGluZVxuICBjb25zdCBkYXNoeSA9ICh4MiAtIHgxKSAvIGxlbmd0aFxuICBjb25zdCBtaWR4ID0gKHgxICsgeDIpIC8gMlxuICBjb25zdCBtaWR5ID0gKHkxICsgeTIpIC8gMlxuXG4gIC8vIGRyYXcgdGhlIGJhc2UgbGluZVxuICBjdHgubW92ZVRvKHgxLCB5MSlcbiAgY3R4LmxpbmVUbyh4MiwgeTIpXG5cbiAgLy8gZHJhdyB0aGUgZGFzaFxuICBjdHgubW92ZVRvKG1pZHggKyA1ICogZGFzaHgsIG1pZHkgKyA1ICogZGFzaHkpXG4gIGN0eC5saW5lVG8obWlkeCAtIDUgKiBkYXNoeCwgbWlkeSAtIDUgKiBkYXNoeSlcblxuICBjdHgubW92ZVRvKHgyLCB5Milcbn1cbiIsImltcG9ydCB7IGNyZWF0ZUVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE9wdGlvbnNTZXQge1xuICBjb25zdHJ1Y3RvciAob3B0aW9uU3BlYywgdGVtcGxhdGUpIHtcbiAgICB0aGlzLm9wdGlvblNwZWMgPSBvcHRpb25TcGVjXG5cbiAgICB0aGlzLm9wdGlvbnMgPSB7fVxuICAgIHRoaXMub3B0aW9uU3BlYy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICBpZiAob3B0aW9uLnR5cGUgIT09ICdoZWFkaW5nJyAmJiBvcHRpb24udHlwZSAhPT0gJ2NvbHVtbi1icmVhaycpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBvcHRpb24uZGVmYXVsdFxuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGUgLy8gaHRtbCB0ZW1wbGF0ZSAob3B0aW9uYWwpXG5cbiAgICAvLyBzZXQgYW4gaWQgYmFzZWQgb24gYSBjb3VudGVyIC0gdXNlZCBmb3IgbmFtZXMgb2YgZm9ybSBlbGVtZW50c1xuICAgIHRoaXMuZ2xvYmFsSWQgPSBPcHRpb25zU2V0LmdldElkKClcbiAgfVxuXG4gIHVwZGF0ZVN0YXRlRnJvbVVJIChvcHRpb24pIHtcbiAgICAvLyBpbnB1dCAtIGVpdGhlciBhbiBlbGVtZW50IG9mIHRoaXMub3B0aW9uc1NwZWMgb3IgYW4gb3B0aW9uIGlkXG4gICAgaWYgKHR5cGVvZiAob3B0aW9uKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIG9wdGlvbiA9IHRoaXMub3B0aW9uc1NwZWMuZmluZCh4ID0+IHguaWQgPT09IG9wdGlvbilcbiAgICAgIGlmICghb3B0aW9uKSB0aHJvdyBuZXcgRXJyb3IoYG5vIG9wdGlvbiB3aXRoIGlkICcke29wdGlvbn0nYClcbiAgICB9XG4gICAgaWYgKCFvcHRpb24uZWxlbWVudCkgdGhyb3cgbmV3IEVycm9yKGBvcHRpb24gJHtvcHRpb24uaWR9IGRvZXNuJ3QgaGF2ZSBhIFVJIGVsZW1lbnRgKVxuXG4gICAgc3dpdGNoIChvcHRpb24udHlwZSkge1xuICAgICAgY2FzZSAnaW50Jzoge1xuICAgICAgICBjb25zdCBpbnB1dCA9IG9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpWzBdXG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gTnVtYmVyKGlucHV0LnZhbHVlKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAnYm9vbCc6IHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSBvcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKVswXVxuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IGlucHV0LmNoZWNrZWRcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NlbGVjdC1leGNsdXNpdmUnOiB7XG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gb3B0aW9uLmVsZW1lbnQucXVlcnlTZWxlY3RvcignaW5wdXQ6Y2hlY2tlZCcpLnZhbHVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdzZWxlY3QtaW5jbHVzaXZlJzoge1xuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9XG4gICAgICAgICAgQXJyYXkuZnJvbShvcHRpb24uZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dDpjaGVja2VkJyksIHggPT4geC52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgb3B0aW9uIHdpdGggaWQgJHtvcHRpb24uaWR9IGhhcyB1bnJlY29nbmlzZWQgb3B0aW9uIHR5cGUgJHtvcHRpb24udHlwZX1gKVxuICAgIH1cbiAgICAvLyBjb25zb2xlLmxvZyh0aGlzLm9wdGlvbnMpXG4gIH1cblxuICByZW5kZXJJbiAoZWxlbWVudCkge1xuICAgIGNvbnN0IGxpc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd1bCcpXG4gICAgbGlzdC5jbGFzc0xpc3QuYWRkKCdvcHRpb25zLWxpc3QnKVxuXG4gICAgdGhpcy5vcHRpb25TcGVjLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgIC8vIE1ha2UgbGlzdCBpdGVtIC0gY29tbW9uIHRvIGFsbCB0eXBlc1xuICAgICAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpXG4gICAgICBsaS5kYXRhc2V0Lm9wdGlvbklkID0gb3B0aW9uLmlkXG4gICAgICBsaXN0LmFwcGVuZChsaSlcblxuICAgICAgLy8gbWFrZSBpbnB1dCBlbGVtZW50cyAtIGRlcGVuZHMgb24gb3B0aW9uIHR5cGVcbiAgICAgIGlmIChvcHRpb24udHlwZSA9PT0gJ2NvbHVtbi1icmVhaycpIHtcbiAgICAgICAgbGkuY2xhc3NMaXN0LmFkZCgnY29sdW1uLWJyZWFrJylcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9uLnR5cGUgPT09ICdoZWFkaW5nJykge1xuICAgICAgICBsaS5hcHBlbmQob3B0aW9uLnRpdGxlKVxuICAgICAgICBsaS5jbGFzc0xpc3QuYWRkKCdvcHRpb25zLWhlYWRpbmcnKVxuICAgICAgfSBlbHNlIGlmIChvcHRpb24udHlwZSA9PT0gJ2ludCcgfHwgb3B0aW9uLnR5cGUgPT09ICdib29sJykge1xuICAgICAgICAvLyBzaW5nbGUgaW5wdXQgb3B0aW9uc1xuICAgICAgICBjb25zdCBsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJylcbiAgICAgICAgbGkuYXBwZW5kKGxhYmVsKVxuXG4gICAgICAgIGlmICghb3B0aW9uLnN3YXBMYWJlbCkgbGFiZWwuYXBwZW5kKG9wdGlvbi50aXRsZSArICc6ICcpXG5cbiAgICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpXG4gICAgICAgIHN3aXRjaCAob3B0aW9uLnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdpbnQnOlxuICAgICAgICAgICAgaW5wdXQudHlwZSA9ICdudW1iZXInXG4gICAgICAgICAgICBpbnB1dC5taW4gPSBvcHRpb24ubWluXG4gICAgICAgICAgICBpbnB1dC5tYXggPSBvcHRpb24ubWF4XG4gICAgICAgICAgICBpbnB1dC52YWx1ZSA9IG9wdGlvbi5kZWZhdWx0XG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ2Jvb2wnOlxuICAgICAgICAgICAgaW5wdXQudHlwZSA9ICdjaGVja2JveCdcbiAgICAgICAgICAgIGlucHV0LmNoZWNrZWQgPSBvcHRpb24uZGVmYXVsdFxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIG9wdGlvbiB0eXBlICR7b3B0aW9uLnR5cGV9YClcbiAgICAgICAgfVxuICAgICAgICBpbnB1dC5jbGFzc0xpc3QuYWRkKCdvcHRpb24nKVxuICAgICAgICBsYWJlbC5hcHBlbmQoaW5wdXQpXG5cbiAgICAgICAgaWYgKG9wdGlvbi5zd2FwTGFiZWwpIGxhYmVsLmFwcGVuZCgnICcgKyBvcHRpb24udGl0bGUpXG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbi50eXBlID09PSAnc2VsZWN0LWluY2x1c2l2ZScgfHwgb3B0aW9uLnR5cGUgPT09ICdzZWxlY3QtZXhjbHVzaXZlJykge1xuICAgICAgICAvLyBtdWx0aXBsZSBpbnB1dCBvcHRpb25zXG4gICAgICAgIC8vIFRPRE86IHN3YXAgbGFiZWwgKGEgYml0IG9kZCBoZXJlIHRob3VnaClcbiAgICAgICAgbGkuYXBwZW5kKG9wdGlvbi50aXRsZSArICc6ICcpXG5cbiAgICAgICAgY29uc3Qgc3VibGlzdCA9IGNyZWF0ZUVsZW0oJ3VsJywgJ29wdGlvbnMtc3VibGlzdCcsIGxpKVxuICAgICAgICBpZiAob3B0aW9uLnZlcnRpY2FsKSBzdWJsaXN0LmNsYXNzTGlzdC5hZGQoJ29wdGlvbnMtc3VibGlzdC12ZXJ0aWNhbCcpXG5cbiAgICAgICAgb3B0aW9uLnNlbGVjdE9wdGlvbnMuZm9yRWFjaChzZWxlY3RPcHRpb24gPT4ge1xuICAgICAgICAgIGNvbnN0IHN1Ymxpc3RMaSA9IGNyZWF0ZUVsZW0oJ2xpJywgbnVsbCwgc3VibGlzdClcbiAgICAgICAgICBjb25zdCBsYWJlbCA9IGNyZWF0ZUVsZW0oJ2xhYmVsJywgbnVsbCwgc3VibGlzdExpKVxuXG4gICAgICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpXG4gICAgICAgICAgaW5wdXQudHlwZSA9IG9wdGlvbi50eXBlID09PSAnc2VsZWN0LWV4Y2x1c2l2ZScgPyAncmFkaW8nIDogJ2NoZWNrYm94J1xuICAgICAgICAgIGlucHV0Lm5hbWUgPSB0aGlzLmdsb2JhbElkICsgJy0nICsgb3B0aW9uLmlkXG4gICAgICAgICAgaW5wdXQudmFsdWUgPSBzZWxlY3RPcHRpb24uaWRcblxuICAgICAgICAgIGlmIChvcHRpb24udHlwZSA9PT0gJ3NlbGVjdC1pbmNsdXNpdmUnKSB7IC8vIGRlZmF1bHRzIHdvcmsgZGlmZmVyZW50IGZvciBpbmNsdXNpdmUvZXhjbHVzaXZlXG4gICAgICAgICAgICBpbnB1dC5jaGVja2VkID0gb3B0aW9uLmRlZmF1bHQuaW5jbHVkZXMoc2VsZWN0T3B0aW9uLmlkKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbnB1dC5jaGVja2VkID0gb3B0aW9uLmRlZmF1bHQgPT09IHNlbGVjdE9wdGlvbi5pZFxuICAgICAgICAgIH1cblxuICAgICAgICAgIGxhYmVsLmFwcGVuZChpbnB1dClcblxuICAgICAgICAgIGlucHV0LmNsYXNzTGlzdC5hZGQoJ29wdGlvbicpXG5cbiAgICAgICAgICBsYWJlbC5hcHBlbmQoc2VsZWN0T3B0aW9uLnRpdGxlKVxuICAgICAgICB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIG9wdGlvbiB0eXBlICcke29wdGlvbi50eXBlfSdgKVxuICAgICAgfVxuXG4gICAgICBsaS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBlID0+IHRoaXMudXBkYXRlU3RhdGVGcm9tVUkob3B0aW9uKSlcbiAgICAgIG9wdGlvbi5lbGVtZW50ID0gbGlcbiAgICB9KVxuXG4gICAgZWxlbWVudC5hcHBlbmQobGlzdClcbiAgfVxuXG4gIC8vIFRPRE86IHVwZGF0ZVVJRnJvbVN0YXRlKG9wdGlvbikge31cbn1cblxuT3B0aW9uc1NldC5pZENvdW50ZXIgPSAwIC8vIGluY3JlbWVudCBlYWNoIHRpbWUgdG8gY3JlYXRlIHVuaXF1ZSBpZHMgdG8gdXNlIGluIGlkcy9uYW1lcyBvZiBlbGVtZW50c1xuXG5PcHRpb25zU2V0LmdldElkID0gZnVuY3Rpb24gKCkge1xuICBpZiAoT3B0aW9uc1NldC5pZENvdW50ZXIgPj0gMjYgKiogMikgdGhyb3cgbmV3IEVycm9yKCdUb28gbWFueSBvcHRpb25zIG9iamVjdHMhJylcbiAgY29uc3QgaWQgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKH5+KE9wdGlvbnNTZXQuaWRDb3VudGVyIC8gMjYpICsgOTcpICtcbiAgICAgICAgICAgU3RyaW5nLmZyb21DaGFyQ29kZShPcHRpb25zU2V0LmlkQ291bnRlciAlIDI2ICsgOTcpXG5cbiAgT3B0aW9uc1NldC5pZENvdW50ZXIgKz0gMVxuXG4gIHJldHVybiBpZFxufVxuXG5PcHRpb25zU2V0LmRlbW9TcGVjID0gW1xuICB7XG4gICAgdGl0bGU6ICdEaWZmaWN1bHR5JyxcbiAgICBpZDogJ2RpZmZpY3VsdHknLFxuICAgIHR5cGU6ICdpbnQnLFxuICAgIG1pbjogMSxcbiAgICBtYXg6IDEwLFxuICAgIGRlZmF1bHQ6IDVcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVHlwZScsXG4gICAgaWQ6ICd0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ1JlY3RhbmdsZScsIGlkOiAncmVjdGFuZ2xlJyB9LFxuICAgICAgeyB0aXRsZTogJ1RyaWFuZ2xlJywgaWQ6ICd0cmlhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdTcXVvdmFsJywgaWQ6ICdzcXVvdmFsJyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiAncmVjdGFuZ2xlJ1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdBIGhlYWRpbmcnLFxuICAgIHR5cGU6ICdoZWFkaW5nJ1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdTaGFwZScsXG4gICAgaWQ6ICdzaGFwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdSZWN0YW5nbGUgc2hhcGUgdGhpbmcnLCBpZDogJ3JlY3RhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdUcmlhbmdsZSBzaGFwZSB0aGluZycsIGlkOiAndHJpYW5nbGUnIH0sXG4gICAgICB7IHRpdGxlOiAnU3F1b3ZhbCBzaGFwZSBsb25nJywgaWQ6ICdzcXVvdmFsJyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiBbJ3JlY3RhbmdsZScsICdzcXVvdmFsJ10sXG4gICAgdmVydGljYWw6IHRydWUgLy8gbGF5b3V0IHZlcnRpY2FsbHksIHJhdGhlciB0aGFuIGhvcml6b250YWxseVxuICB9LFxuICB7XG4gICAgdHlwZTogJ2NvbHVtbi1icmVhaydcbiAgfSxcbiAge1xuICAgIHR5cGU6ICdoZWFkaW5nJyxcbiAgICB0aXRsZTogJ0EgbmV3IGNvbHVtbidcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnRG8gc29tZXRoaW5nJyxcbiAgICBpZDogJ3NvbWV0aGluZycsXG4gICAgdHlwZTogJ2Jvb2wnLFxuICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgc3dhcExhYmVsOiB0cnVlIC8vIHB1dCBjb250cm9sIGJlZm9yZSBsYWJlbFxuICB9XG5dXG4iLCJleHBvcnQgZGVmYXVsdCBhYnN0cmFjdCBjbGFzcyBRdWVzdGlvbiB7XG4gIERPTTogSFRNTEVsZW1lbnRcbiAgYW5zd2VyZWQ6IGJvb2xlYW5cblxuICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgdGhpcy5ET00gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgIHRoaXMuRE9NLmNsYXNzTmFtZSA9ICdxdWVzdGlvbi1kaXYnXG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gIH1cblxuICBnZXRET00gKCkgOiBIVE1MRWxlbWVudCB7XG4gICAgcmV0dXJuIHRoaXMuRE9NXG4gIH1cblxuICBhYnN0cmFjdCByZW5kZXIgKCkgOiB2b2lkXG5cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQge1xuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gIH1cblxuICB0b2dnbGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICBpZiAodGhpcy5hbnN3ZXJlZCkge1xuICAgICAgdGhpcy5oaWRlQW5zd2VyKClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaG93QW5zd2VyKClcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgLy8gU2hvdWxkIGJlIG92ZXJyaWRkZW5cbiAgICByZXR1cm4gJydcbiAgfVxufVxuIiwiLyogZ2xvYmFsIGthdGV4ICovXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRleHRRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKClcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYSdcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIC8vIHN0b3JlIHRoZSBsYWJlbCBmb3IgZnV0dXJlIHJlbmRlcmluZ1xuICAgIHRoaXMubGFiZWwgPSBzZXR0aW5ncy5sYWJlbFxuXG4gICAgLy8gRHVtbXkgcXVlc3Rpb24gZ2VuZXJhdGluZyAtIHN1YmNsYXNzZXMgZG8gc29tZXRoaW5nIHN1YnN0YW50aWFsIGhlcmVcbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnMisyJ1xuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPTUnXG5cbiAgICAvLyBNYWtlIHRoZSBET00gdHJlZSBmb3IgdGhlIGVsZW1lbnRcbiAgICB0aGlzLnF1ZXN0aW9ucCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKVxuICAgIHRoaXMuYW5zd2VycCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKVxuXG4gICAgdGhpcy5xdWVzdGlvbnAuY2xhc3NOYW1lID0gJ3F1ZXN0aW9uJ1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc05hbWUgPSAnYW5zd2VyJ1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuXG4gICAgdGhpcy5ET00uYXBwZW5kQ2hpbGQodGhpcy5xdWVzdGlvbnApXG4gICAgdGhpcy5ET00uYXBwZW5kQ2hpbGQodGhpcy5hbnN3ZXJwKVxuXG4gICAgLy8gc3ViY2xhc3NlcyBzaG91bGQgZ2VuZXJhdGUgcXVlc3Rpb25MYVRlWCBhbmQgYW5zd2VyTGFUZVgsXG4gICAgLy8gLnJlbmRlcigpIHdpbGwgYmUgY2FsbGVkIGJ5IHVzZXJcbiAgfVxuXG4gIHJlbmRlciAoKSB7XG4gICAgLy8gdXBkYXRlIHRoZSBET00gaXRlbSB3aXRoIHF1ZXN0aW9uTGFUZVggYW5kIGFuc3dlckxhVGVYXG4gICAgdmFyIHFudW0gPSB0aGlzLmxhYmVsXG4gICAgICA/ICdcXFxcdGV4dHsnICsgdGhpcy5sYWJlbCArICcpIH0nXG4gICAgICA6ICcnXG4gICAga2F0ZXgucmVuZGVyKHFudW0gKyB0aGlzLnF1ZXN0aW9uTGFUZVgsIHRoaXMucXVlc3Rpb25wLCB7IGRpc3BsYXlNb2RlOiB0cnVlLCBzdHJpY3Q6ICdpZ25vcmUnIH0pXG4gICAga2F0ZXgucmVuZGVyKHRoaXMuYW5zd2VyTGFUZVgsIHRoaXMuYW5zd2VycCwgeyBkaXNwbGF5TW9kZTogdHJ1ZSB9KVxuICB9XG5cbiAgZ2V0RE9NICgpIHtcbiAgICByZXR1cm4gdGhpcy5ET01cbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkge1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIHtcbiAgICB0aGlzLmFuc3dlcnAuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxufVxuIiwiaW1wb3J0IHsgcmFuZEJldHdlZW4sIGdjZCB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcblxuLyogTWFpbiBxdWVzdGlvbiBjbGFzcy4gVGhpcyB3aWxsIGJlIHNwdW4gb2ZmIGludG8gZGlmZmVyZW50IGZpbGUgYW5kIGdlbmVyYWxpc2VkICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBbGdlYnJhaWNGcmFjdGlvblEgZXh0ZW5kcyBUZXh0USB7XG4gIC8vICdleHRlbmRzJyBRdWVzdGlvbiwgYnV0IG5vdGhpbmcgdG8gYWN0dWFsbHkgZXh0ZW5kXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogMlxuICAgIH1cblxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG4gICAgY29uc3QgZGlmZmljdWx0eSA9IHNldHRpbmdzLmRpZmZpY3VsdHlcblxuICAgIC8vIGxvZ2ljIGZvciBnZW5lcmF0aW5nIHRoZSBxdWVzdGlvbiBhbmQgYW5zd2VyIHN0YXJ0cyBoZXJlXG4gICAgdmFyIGEsIGIsIGMsIGQsIGUsIGYgLy8gKGF4K2IpKGV4K2YpLyhjeCtkKShleCtmKSA9IChweF4yK3F4K3IpLyh0eF4yK3V4K3YpXG4gICAgdmFyIHAsIHEsIHIsIHQsIHUsIHZcbiAgICB2YXIgbWluQ29lZmYsIG1heENvZWZmLCBtaW5Db25zdCwgbWF4Q29uc3RcblxuICAgIHN3aXRjaCAoZGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMTsgbWluQ29uc3QgPSAxOyBtYXhDb25zdCA9IDZcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgbWluQ29lZmYgPSAxOyBtYXhDb2VmZiA9IDE7IG1pbkNvbnN0ID0gLTY7IG1heENvbnN0ID0gNlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAzOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMzsgbWluQ29uc3QgPSAtNTsgbWF4Q29uc3QgPSA1XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ6XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBtaW5Db2VmZiA9IC0zOyBtYXhDb2VmZiA9IDM7IG1pbkNvbnN0ID0gLTU7IG1heENvbnN0ID0gNVxuICAgICAgICBicmVha1xuICAgIH1cblxuICAgIC8vIFBpY2sgc29tZSBjb2VmZmljaWVudHNcbiAgICB3aGlsZSAoXG4gICAgICAoKCFhICYmICFiKSB8fCAoIWMgJiYgIWQpIHx8ICghZSAmJiAhZikpIHx8IC8vIHJldHJ5IGlmIGFueSBleHByZXNzaW9uIGlzIDBcbiAgICAgIGNhblNpbXBsaWZ5KGEsIGIsIGMsIGQpIC8vIHJldHJ5IGlmIHRoZXJlJ3MgYSBjb21tb24gbnVtZXJpY2FsIGZhY3RvclxuICAgICkge1xuICAgICAgYSA9IHJhbmRCZXR3ZWVuKG1pbkNvZWZmLCBtYXhDb2VmZilcbiAgICAgIGMgPSByYW5kQmV0d2VlbihtaW5Db2VmZiwgbWF4Q29lZmYpXG4gICAgICBlID0gcmFuZEJldHdlZW4obWluQ29lZmYsIG1heENvZWZmKVxuICAgICAgYiA9IHJhbmRCZXR3ZWVuKG1pbkNvbnN0LCBtYXhDb25zdClcbiAgICAgIGQgPSByYW5kQmV0d2VlbihtaW5Db25zdCwgbWF4Q29uc3QpXG4gICAgICBmID0gcmFuZEJldHdlZW4obWluQ29uc3QsIG1heENvbnN0KVxuICAgIH1cblxuICAgIC8vIGlmIHRoZSBkZW5vbWluYXRvciBpcyBuZWdhdGl2ZSBmb3IgZWFjaCB0ZXJtLCB0aGVuIG1ha2UgdGhlIG51bWVyYXRvciBuZWdhdGl2ZSBpbnN0ZWFkXG4gICAgaWYgKGMgPD0gMCAmJiBkIDw9IDApIHtcbiAgICAgIGMgPSAtY1xuICAgICAgZCA9IC1kXG4gICAgICBhID0gLWFcbiAgICAgIGIgPSAtYlxuICAgIH1cblxuICAgIHAgPSBhICogZTsgcSA9IGEgKiBmICsgYiAqIGU7IHIgPSBiICogZlxuICAgIHQgPSBjICogZTsgdSA9IGMgKiBmICsgZCAqIGU7IHYgPSBkICogZlxuXG4gICAgLy8gTm93IHB1dCB0aGUgcXVlc3Rpb24gYW5kIGFuc3dlciBpbiBhIG5pY2UgZm9ybWF0IGludG8gcXVlc3Rpb25MYVRlWCBhbmQgYW5zd2VyTGFUZVhcbiAgICBjb25zdCBxdWVzdGlvbiA9IGBcXFxcZnJhY3ske3F1YWRyYXRpY1N0cmluZyhwLCBxLCByKX19eyR7cXVhZHJhdGljU3RyaW5nKHQsIHUsIHYpfX1gXG4gICAgaWYgKHNldHRpbmdzLnVzZUNvbW1hbmRXb3JkKSB7XG4gICAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnXFxcXHRleHR7U2ltcGxpZnl9ICcgKyBxdWVzdGlvblxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSBxdWVzdGlvblxuICAgIH1cbiAgICB0aGlzLmFuc3dlckxhVGVYID1cbiAgICAgIChjID09PSAwICYmIGQgPT09IDEpID8gcXVhZHJhdGljU3RyaW5nKDAsIGEsIGIpXG4gICAgICAgIDogYFxcXFxmcmFjeyR7cXVhZHJhdGljU3RyaW5nKDAsIGEsIGIpfX17JHtxdWFkcmF0aWNTdHJpbmcoMCwgYywgZCl9fWBcblxuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPSAnICsgdGhpcy5hbnN3ZXJMYVRlWFxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdTaW1wbGlmeSdcbiAgfVxufVxuXG4vKiBVdGlsaXR5IGZ1bmN0aW9uc1xuICogQXQgc29tZSBwb2ludCwgSSdsbCBtb3ZlIHNvbWUgb2YgdGhlc2UgaW50byBhIGdlbmVyYWwgdXRpbGl0aWVzIG1vZHVsZVxuICogYnV0IHRoaXMgd2lsbCBkbyBmb3Igbm93XG4gKi9cblxuLy8gVE9ETyBJIGhhdmUgcXVhZHJhdGljU3RyaW5nIGhlcmUgYW5kIGFsc28gYSBQb2x5bm9taWFsIGNsYXNzLiBXaGF0IGlzIGJlaW5nIHJlcGxpY2F0ZWQ/wqdcbmZ1bmN0aW9uIHF1YWRyYXRpY1N0cmluZyAoYSwgYiwgYykge1xuICBpZiAoYSA9PT0gMCAmJiBiID09PSAwICYmIGMgPT09IDApIHJldHVybiAnMCdcblxuICB2YXIgeDJzdHJpbmcgPVxuICAgIGEgPT09IDAgPyAnJ1xuICAgICAgOiBhID09PSAxID8gJ3heMidcbiAgICAgICAgOiBhID09PSAtMSA/ICcteF4yJ1xuICAgICAgICAgIDogYSArICd4XjInXG5cbiAgdmFyIHhzaWduID1cbiAgICBiIDwgMCA/ICctJ1xuICAgICAgOiAoYSA9PT0gMCB8fCBiID09PSAwKSA/ICcnXG4gICAgICAgIDogJysnXG5cbiAgdmFyIHhzdHJpbmcgPVxuICAgIGIgPT09IDAgPyAnJ1xuICAgICAgOiAoYiA9PT0gMSB8fCBiID09PSAtMSkgPyAneCdcbiAgICAgICAgOiBNYXRoLmFicyhiKSArICd4J1xuXG4gIHZhciBjb25zdHNpZ24gPVxuICAgIGMgPCAwID8gJy0nXG4gICAgICA6ICgoYSA9PT0gMCAmJiBiID09PSAwKSB8fCBjID09PSAwKSA/ICcnXG4gICAgICAgIDogJysnXG5cbiAgdmFyIGNvbnN0c3RyaW5nID1cbiAgICBjID09PSAwID8gJycgOiBNYXRoLmFicyhjKVxuXG4gIHJldHVybiB4MnN0cmluZyArIHhzaWduICsgeHN0cmluZyArIGNvbnN0c2lnbiArIGNvbnN0c3RyaW5nXG59XG5cbmZ1bmN0aW9uIGNhblNpbXBsaWZ5IChhMSwgYjEsIGEyLCBiMikge1xuICAvLyBjYW4gKGExeCtiMSkvKGEyeCtiMikgYmUgc2ltcGxpZmllZD9cbiAgLy9cbiAgLy8gRmlyc3QsIHRha2Ugb3V0IGdjZCwgYW5kIHdyaXRlIGFzIGMxKGExeCtiMSkgZXRjXG5cbiAgdmFyIGMxID0gZ2NkKGExLCBiMSlcbiAgYTEgPSBhMSAvIGMxXG4gIGIxID0gYjEgLyBjMVxuXG4gIHZhciBjMiA9IGdjZChhMiwgYjIpXG4gIGEyID0gYTIgLyBjMlxuICBiMiA9IGIyIC8gYzJcblxuICB2YXIgcmVzdWx0ID0gZmFsc2VcblxuICBpZiAoZ2NkKGMxLCBjMikgPiAxIHx8IChhMSA9PT0gYTIgJiYgYjEgPT09IGIyKSkge1xuICAgIHJlc3VsdCA9IHRydWVcbiAgfVxuXG4gIHJldHVybiByZXN1bHRcbn1cbiIsImltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCB7IHJhbmRCZXR3ZWVuIH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJbnRlZ2VyQWRkUSBleHRlbmRzIFRleHRRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiA1LFxuICAgICAgbGFiZWw6ICdhJ1xuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyBUaGlzIGlzIGp1c3QgYSBkZW1vIHF1ZXN0aW9uIHR5cGUgZm9yIG5vdywgc28gbm90IHByb2Nlc3NpbmcgZGlmZmljdWx0eVxuICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbigxMCwgMTAwMClcbiAgICBjb25zdCBiID0gcmFuZEJldHdlZW4oMTAsIDEwMDApXG4gICAgY29uc3Qgc3VtID0gYSArIGJcblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9IGEgKyAnICsgJyArIGJcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJz0gJyArIHN1bVxuXG4gICAgdGhpcy5yZW5kZXIoKVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdFdmFsdWF0ZSdcbiAgfVxufVxuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgUG9pbnQge1xuICBjb25zdHJ1Y3RvciAoeCwgeSkge1xuICAgIHRoaXMueCA9IHhcbiAgICB0aGlzLnkgPSB5XG4gIH1cblxuICByb3RhdGUgKGFuZ2xlKSB7XG4gICAgdmFyIG5ld3gsIG5ld3lcbiAgICBuZXd4ID0gTWF0aC5jb3MoYW5nbGUpICogdGhpcy54IC0gTWF0aC5zaW4oYW5nbGUpICogdGhpcy55XG4gICAgbmV3eSA9IE1hdGguc2luKGFuZ2xlKSAqIHRoaXMueCArIE1hdGguY29zKGFuZ2xlKSAqIHRoaXMueVxuICAgIHRoaXMueCA9IG5ld3hcbiAgICB0aGlzLnkgPSBuZXd5XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHNjYWxlIChzZikge1xuICAgIHRoaXMueCA9IHRoaXMueCAqIHNmXG4gICAgdGhpcy55ID0gdGhpcy55ICogc2ZcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgdHJhbnNsYXRlICh4LCB5KSB7XG4gICAgdGhpcy54ICs9IHhcbiAgICB0aGlzLnkgKz0geVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBjbG9uZSAoKSB7XG4gICAgcmV0dXJuIG5ldyBQb2ludCh0aGlzLngsIHRoaXMueSlcbiAgfVxuXG4gIGVxdWFscyAodGhhdCkge1xuICAgIHJldHVybiAodGhpcy54ID09PSB0aGF0LnggJiYgdGhpcy55ID09PSB0aGF0LnkpXG4gIH1cblxuICBtb3ZlVG93YXJkICh0aGF0LCBkKSB7XG4gICAgLy8gbW92ZXMgW2RdIGluIHRoZSBkaXJlY3Rpb24gb2YgW3RoYXQ6OlBvaW50XVxuICAgIGNvbnN0IHV2ZWMgPSBQb2ludC51bml0VmVjdG9yKHRoaXMsIHRoYXQpXG4gICAgdGhpcy50cmFuc2xhdGUodXZlYy54ICogZCwgdXZlYy55ICogZClcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3RhdGljIGZyb21Qb2xhciAociwgdGhldGEpIHtcbiAgICByZXR1cm4gbmV3IFBvaW50KFxuICAgICAgTWF0aC5jb3ModGhldGEpICogcixcbiAgICAgIE1hdGguc2luKHRoZXRhKSAqIHJcbiAgICApXG4gIH1cblxuICBzdGF0aWMgZnJvbVBvbGFyRGVnIChyLCB0aGV0YSkge1xuICAgIHRoZXRhID0gdGhldGEgKiBNYXRoLlBJIC8gMTgwXG4gICAgcmV0dXJuIFBvaW50LmZyb21Qb2xhcihyLCB0aGV0YSlcbiAgfVxuXG4gIHN0YXRpYyBtZWFuICguLi5wb2ludHMpIHtcbiAgICBjb25zdCBzdW14ID0gcG9pbnRzLm1hcChwID0+IHAueCkucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSlcbiAgICBjb25zdCBzdW15ID0gcG9pbnRzLm1hcChwID0+IHAueSkucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSlcbiAgICBjb25zdCBuID0gcG9pbnRzLmxlbmd0aFxuXG4gICAgcmV0dXJuIG5ldyBQb2ludChzdW14IC8gbiwgc3VteSAvIG4pXG4gIH1cblxuICBzdGF0aWMgaW5DZW50ZXIgKEEsIEIsIEMpIHtcbiAgICAvLyBpbmNlbnRlciBvZiBhIHRyaWFuZ2xlIGdpdmVuIHZlcnRleCBwb2ludHMgQSwgQiBhbmQgQ1xuICAgIGNvbnN0IGEgPSBQb2ludC5kaXN0YW5jZShCLCBDKVxuICAgIGNvbnN0IGIgPSBQb2ludC5kaXN0YW5jZShBLCBDKVxuICAgIGNvbnN0IGMgPSBQb2ludC5kaXN0YW5jZShBLCBCKVxuXG4gICAgY29uc3QgcGVyaW1ldGVyID0gYSArIGIgKyBjXG4gICAgY29uc3Qgc3VteCA9IGEgKiBBLnggKyBiICogQi54ICsgYyAqIEMueFxuICAgIGNvbnN0IHN1bXkgPSBhICogQS55ICsgYiAqIEIueSArIGMgKiBDLnlcblxuICAgIHJldHVybiBuZXcgUG9pbnQoc3VteCAvIHBlcmltZXRlciwgc3VteSAvIHBlcmltZXRlcilcbiAgfVxuXG4gIHN0YXRpYyBtaW4gKHBvaW50cykge1xuICAgIGNvbnN0IG1pbnggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1pbih4LCBwLngpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtaW55ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5taW4oeSwgcC55KSwgSW5maW5pdHkpXG4gICAgcmV0dXJuIG5ldyBQb2ludChtaW54LCBtaW55KVxuICB9XG5cbiAgc3RhdGljIG1heCAocG9pbnRzKSB7XG4gICAgY29uc3QgbWF4eCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWF4KHgsIHAueCksIC1JbmZpbml0eSlcbiAgICBjb25zdCBtYXh5ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5tYXgoeSwgcC55KSwgLUluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQobWF4eCwgbWF4eSlcbiAgfVxuXG4gIHN0YXRpYyBjZW50ZXIgKHBvaW50cykge1xuICAgIGNvbnN0IG1pbnggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1pbih4LCBwLngpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtaW55ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5taW4oeSwgcC55KSwgSW5maW5pdHkpXG4gICAgY29uc3QgbWF4eCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWF4KHgsIHAueCksIC1JbmZpbml0eSlcbiAgICBjb25zdCBtYXh5ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5tYXgoeSwgcC55KSwgLUluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQoKG1heHggKyBtaW54KSAvIDIsIChtYXh5ICsgbWlueSkgLyAyKVxuICB9XG5cbiAgc3RhdGljIHVuaXRWZWN0b3IgKHAxLCBwMikge1xuICAgIC8vIHJldHVybnMgYSB1bml0IHZlY3RvciBpbiB0aGUgZGlyZWN0aW9uIG9mIHAxIHRvIHAyXG4gICAgLy8gaW4gdGhlIGZvcm0ge3g6Li4uLCB5Oi4uLn1cbiAgICBjb25zdCB2ZWN4ID0gcDIueCAtIHAxLnhcbiAgICBjb25zdCB2ZWN5ID0gcDIueSAtIHAxLnlcbiAgICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHZlY3gsIHZlY3kpXG4gICAgcmV0dXJuIHsgeDogdmVjeCAvIGxlbmd0aCwgeTogdmVjeSAvIGxlbmd0aCB9XG4gIH1cblxuICBzdGF0aWMgZGlzdGFuY2UgKHAxLCBwMikge1xuICAgIHJldHVybiBNYXRoLmh5cG90KHAxLnggLSBwMi54LCBwMS55IC0gcDIueSlcbiAgfVxuXG4gIHN0YXRpYyByZXBlbCAocDEsIHAyLCB0cmlnZ2VyLCBkaXN0YW5jZSkge1xuICAgIC8vIFdoZW4gcDEgYW5kIHAyIGFyZSBsZXNzIHRoYW4gW3RyaWdnZXJdIGFwYXJ0LCB0aGV5IGFyZVxuICAgIC8vIG1vdmVkIHNvIHRoYXQgdGhleSBhcmUgW2Rpc3RhbmNlXSBhcGFydFxuICAgIGNvbnN0IGQgPSBNYXRoLmh5cG90KHAxLnggLSBwMi54LCBwMS55IC0gcDIueSlcbiAgICBpZiAoZCA+PSB0cmlnZ2VyKSByZXR1cm4gZmFsc2VcblxuICAgIGNvbnN0IHIgPSAoZGlzdGFuY2UgLSBkKSAvIDIgLy8gZGlzdGFuY2UgdGhleSBuZWVkIG1vdmluZ1xuICAgIHAxLm1vdmVUb3dhcmQocDIsIC1yKVxuICAgIHAyLm1vdmVUb3dhcmQocDEsIC1yKVxuICAgIHJldHVybiB0cnVlXG4gIH1cbn1cbiIsImltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbi9RdWVzdGlvbidcbmltcG9ydCB7IGNyZWF0ZUVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5kZWNsYXJlIGNvbnN0IGthdGV4IDoge3JlbmRlciA6IChzdHJpbmc6IHN0cmluZywgZWxlbWVudDogSFRNTEVsZW1lbnQpID0+IHZvaWR9XG5cbi8qIEdyYXBoaWNRRGF0YSBjYW4gYWxsIGJlIHZlcnkgZGlmZmVyZW50LCBzbyBpbnRlcmZhY2UgaXMgZW1wdHlcbiAqIEhlcmUgZm9yIGNvZGUgZG9jdW1lbnRhdGlvbiByYXRoZXIgdGhhbiB0eXBlIHNhZmV0eSAod2hpY2ggaXNuJ3QgcHJvdmlkZWQpXG5cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1pbnRlcmZhY2UgKi9cbmV4cG9ydCBpbnRlcmZhY2UgR3JhcGhpY1FEYXRhIHtcbn1cbi8qIGVzbGludC1lbmFibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LWludGVyZmFjZSAqL1xuXG4vKiBOb3Qgd29ydGggdGhlIGhhc3NseSB0cnlpbmcgdG8gZ2V0IGludGVyZmFjZXMgZm9yIHN0YXRpYyBtZXRob2RzXG4gKlxuICogZXhwb3J0IGludGVyZmFjZSBHcmFwaGljUURhdGFDb25zdHJ1Y3RvciB7XG4gKiAgIG5ldyguLi5hcmdzIDogdW5rbm93bltdKTogR3JhcGhpY1FEYXRhXG4gKiAgIHJhbmRvbShvcHRpb25zOiB1bmtub3duKSA6IEdyYXBoaWNRRGF0YVxuICogfVxuKi9cblxuZXhwb3J0IGludGVyZmFjZSBMYWJlbCB7XG4gIHBvczogUG9pbnQsXG4gIHRleHRxOiBzdHJpbmcsXG4gIHRleHRhOiBzdHJpbmcsXG4gIHN0eWxlcTogc3RyaW5nLFxuICBzdHlsZWE6IHN0cmluZyxcbiAgdGV4dDogc3RyaW5nLFxuICBzdHlsZTogc3RyaW5nXG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBHcmFwaGljUVZpZXcge1xuICBET006IEhUTUxFbGVtZW50XG4gIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnRcbiAgd2lkdGg6IG51bWJlclxuICBoZWlnaHQ6IG51bWJlclxuICBkYXRhOiBHcmFwaGljUURhdGFcbiAgbGFiZWxzOiBMYWJlbFtdXG5cbiAgY29uc3RydWN0b3IgKFxuICAgIGRhdGEgOiBHcmFwaGljUURhdGEsXG4gICAgb3B0aW9ucyA6IHtcbiAgICAgIHdpZHRoOiBudW1iZXIsXG4gICAgICBoZWlnaHQ6IG51bWJlclxuICAgIH0pIHtcbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIHdpZHRoOiAyNTAsXG4gICAgICBoZWlnaHQ6IDI1MFxuICAgIH1cblxuICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIHRoaXMud2lkdGggPSBvcHRpb25zLndpZHRoXG4gICAgdGhpcy5oZWlnaHQgPSBvcHRpb25zLmhlaWdodCAvLyBvbmx5IHRoaW5ncyBJIG5lZWQgZnJvbSB0aGUgb3B0aW9ucywgZ2VuZXJhbGx5P1xuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICAvLyB0aGlzLnJvdGF0aW9uP1xuXG4gICAgdGhpcy5sYWJlbHMgPSBbXSAvLyBsYWJlbHMgb24gZGlhZ3JhbVxuXG4gICAgLy8gRE9NIGVsZW1lbnRzXG4gICAgdGhpcy5ET00gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tZGl2JylcbiAgICB0aGlzLmNhbnZhcyA9IGNyZWF0ZUVsZW0oJ2NhbnZhcycsICdxdWVzdGlvbi1jYW52YXMnLCB0aGlzLkRPTSlcbiAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMud2lkdGhcbiAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodFxuICB9XG5cbiAgZ2V0RE9NICgpIDogSFRNTEVsZW1lbnQge1xuICAgIHJldHVybiB0aGlzLkRPTVxuICB9XG5cbiAgYWJzdHJhY3QgcmVuZGVyICgpIDogdm9pZFxuXG4gIHJlbmRlckxhYmVscyAobnVkZ2U/IDogYm9vbGVhbikgOiB2b2lkIHtcbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLkRPTVxuXG4gICAgLy8gcmVtb3ZlIGFueSBleGlzdGluZyBsYWJlbHNcbiAgICBjb25zdCBvbGRMYWJlbHMgPSBjb250YWluZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnbGFiZWwnKVxuICAgIHdoaWxlIChvbGRMYWJlbHMubGVuZ3RoID4gMCkge1xuICAgICAgb2xkTGFiZWxzWzBdLnJlbW92ZSgpXG4gICAgfVxuXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICAgIGNvbnN0IGlubmVybGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgICAgbGFiZWwuY2xhc3NMaXN0LmFkZCgnbGFiZWwnKVxuICAgICAgbGFiZWwuY2xhc3NOYW1lICs9ICcgJyArIGwuc3R5bGUgLy8gdXNpbmcgY2xhc3NOYW1lIG92ZXIgY2xhc3NMaXN0IHNpbmNlIGwuc3R5bGUgaXMgc3BhY2UtZGVsaW1pdGVkIGxpc3Qgb2YgY2xhc3Nlc1xuICAgICAgbGFiZWwuc3R5bGUubGVmdCA9IGwucG9zLnggKyAncHgnXG4gICAgICBsYWJlbC5zdHlsZS50b3AgPSBsLnBvcy55ICsgJ3B4J1xuXG4gICAgICBrYXRleC5yZW5kZXIobC50ZXh0LCBpbm5lcmxhYmVsKVxuICAgICAgbGFiZWwuYXBwZW5kQ2hpbGQoaW5uZXJsYWJlbClcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChsYWJlbClcblxuICAgICAgLy8gcmVtb3ZlIHNwYWNlIGlmIHRoZSBpbm5lciBsYWJlbCBpcyB0b28gYmlnXG4gICAgICBpZiAoaW5uZXJsYWJlbC5vZmZzZXRXaWR0aCAvIGlubmVybGFiZWwub2Zmc2V0SGVpZ2h0ID4gMikge1xuICAgICAgICBjb25zb2xlLmxvZyhgcmVtb3ZlZCBzcGFjZSBpbiAke2wudGV4dH1gKVxuICAgICAgICBjb25zdCBuZXdsYWJlbHRleHQgPSBsLnRleHQucmVwbGFjZSgvXFwrLywgJ1xcXFwhK1xcXFwhJykucmVwbGFjZSgvLS8sICdcXFxcIS1cXFxcIScpXG4gICAgICAgIGthdGV4LnJlbmRlcihuZXdsYWJlbHRleHQsIGlubmVybGFiZWwpXG4gICAgICB9XG5cbiAgICAgIC8vIHBvc2l0aW9uIGNvcnJlY3RseSAtIHRoaXMgY291bGQgZGVmIGJlIG9wdGltaXNlZCAtIGxvdHMgb2YgYmFjay1hbmQtZm9ydGhcblxuICAgICAgLy8gYWRqdXN0IHRvICpjZW50ZXIqIGxhYmVsLCByYXRoZXIgdGhhbiBhbmNob3IgdG9wLXJpZ2h0XG4gICAgICBjb25zdCBsd2lkdGggPSBsYWJlbC5vZmZzZXRXaWR0aFxuICAgICAgY29uc3QgbGhlaWdodCA9IGxhYmVsLm9mZnNldEhlaWdodFxuICAgICAgbGFiZWwuc3R5bGUubGVmdCA9IChsLnBvcy54IC0gbHdpZHRoIC8gMikgKyAncHgnXG4gICAgICBsYWJlbC5zdHlsZS50b3AgPSAobC5wb3MueSAtIGxoZWlnaHQgLyAyKSArICdweCdcblxuICAgICAgLy8gSSBkb24ndCB1bmRlcnN0YW5kIHRoaXMgYWRqdXN0bWVudC4gSSB0aGluayBpdCBtaWdodCBiZSBuZWVkZWQgaW4gYXJpdGhtYWdvbnMsIGJ1dCBpdCBtYWtlc1xuICAgICAgLy8gb3RoZXJzIGdvIGZ1bm55LlxuXG4gICAgICBpZiAobnVkZ2UpIHtcbiAgICAgICAgaWYgKGwucG9zLnggPCB0aGlzLmNhbnZhcy53aWR0aCAvIDIgLSA1ICYmIGwucG9zLnggKyBsd2lkdGggLyAyID4gdGhpcy5jYW52YXMud2lkdGggLyAyKSB7XG4gICAgICAgICAgbGFiZWwuc3R5bGUubGVmdCA9ICh0aGlzLmNhbnZhcy53aWR0aCAvIDIgLSBsd2lkdGggLSAzKSArICdweCdcbiAgICAgICAgICBjb25zb2xlLmxvZyhgbnVkZ2VkICcke2wudGV4dH0nYClcbiAgICAgICAgfVxuICAgICAgICBpZiAobC5wb3MueCA+IHRoaXMuY2FudmFzLndpZHRoIC8gMiArIDUgJiYgbC5wb3MueCAtIGx3aWR0aCAvIDIgPCB0aGlzLmNhbnZhcy53aWR0aCAvIDIpIHtcbiAgICAgICAgICBsYWJlbC5zdHlsZS5sZWZ0ID0gKHRoaXMuY2FudmFzLndpZHRoIC8gMiArIDMpICsgJ3B4J1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBudWRnZWQgJyR7bC50ZXh0fSdgKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0YVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVhXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIC8vIFBvaW50IHRyYW5mb3JtYXRpb25zIG9mIGFsbCBwb2ludHNcblxuICBnZXQgYWxscG9pbnRzICgpIDogUG9pbnRbXSB7XG4gICAgcmV0dXJuIFtdXG4gIH1cblxuICBzY2FsZSAoc2YgOiBudW1iZXIpIDogdm9pZCB7XG4gICAgdGhpcy5hbGxwb2ludHMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgcC5zY2FsZShzZilcbiAgICB9KVxuICB9XG5cbiAgcm90YXRlIChhbmdsZSA6IG51bWJlcikgOiBudW1iZXIge1xuICAgIHRoaXMuYWxscG9pbnRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHAucm90YXRlKGFuZ2xlKVxuICAgIH0pXG4gICAgcmV0dXJuIGFuZ2xlXG4gIH1cblxuICB0cmFuc2xhdGUgKHggOiBudW1iZXIsIHkgOiBudW1iZXIpIDogdm9pZCB7XG4gICAgdGhpcy5hbGxwb2ludHMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgcC50cmFuc2xhdGUoeCwgeSlcbiAgICB9KVxuICB9XG5cbiAgcmFuZG9tUm90YXRlICgpIDogbnVtYmVyIHtcbiAgICBjb25zdCBhbmdsZSA9IDIgKiBNYXRoLlBJICogTWF0aC5yYW5kb20oKVxuICAgIHRoaXMucm90YXRlKGFuZ2xlKVxuICAgIHJldHVybiBhbmdsZVxuICB9XG5cbiAgc2NhbGVUb0ZpdCAod2lkdGggOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBtYXJnaW4gOiBudW1iZXIpIDogdm9pZCB7XG4gICAgbGV0IHRvcExlZnQgOiBQb2ludCA9IFBvaW50Lm1pbih0aGlzLmFsbHBvaW50cylcbiAgICBsZXQgYm90dG9tUmlnaHQgOiBQb2ludCA9IFBvaW50Lm1heCh0aGlzLmFsbHBvaW50cylcbiAgICBjb25zdCB0b3RhbFdpZHRoIDogbnVtYmVyID0gYm90dG9tUmlnaHQueCAtIHRvcExlZnQueFxuICAgIGNvbnN0IHRvdGFsSGVpZ2h0IDogbnVtYmVyID0gYm90dG9tUmlnaHQueSAtIHRvcExlZnQueVxuICAgIHRoaXMuc2NhbGUoTWF0aC5taW4oKHdpZHRoIC0gbWFyZ2luKSAvIHRvdGFsV2lkdGgsIChoZWlnaHQgLSBtYXJnaW4pIC8gdG90YWxIZWlnaHQpKVxuXG4gICAgLy8gY2VudHJlXG4gICAgdG9wTGVmdCA9IFBvaW50Lm1pbih0aGlzLmFsbHBvaW50cylcbiAgICBib3R0b21SaWdodCA9IFBvaW50Lm1heCh0aGlzLmFsbHBvaW50cylcbiAgICBjb25zdCBjZW50ZXIgPSBQb2ludC5tZWFuKFt0b3BMZWZ0LCBib3R0b21SaWdodF0pXG4gICAgdGhpcy50cmFuc2xhdGUod2lkdGggLyAyIC0gY2VudGVyLngsIGhlaWdodCAvIDIgLSBjZW50ZXIueSkgLy8gY2VudHJlXG4gIH1cbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEdyYXBoaWNRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBkYXRhOiBHcmFwaGljUURhdGFcbiAgdmlldzogR3JhcGhpY1FWaWV3XG5cbiAgY29uc3RydWN0b3IgKCkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgIHN1cGVyKCkgLy8gdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gICAgZGVsZXRlICh0aGlzLkRPTSkgLy8gZ29pbmcgdG8gb3ZlcnJpZGUgZ2V0RE9NIHVzaW5nIHRoZSB2aWV3J3MgRE9NXG5cbiAgICAvKiBUaGVzZSBhcmUgZ3VhcmFudGVlZCB0byBiZSBvdmVycmlkZGVuLCBzbyBubyBwb2ludCBpbml0aWFsaXppbmcgaGVyZVxuICAgICAqXG4gICAgICogIHRoaXMuZGF0YSA9IG5ldyBHcmFwaGljUURhdGEob3B0aW9ucylcbiAgICAgKiAgdGhpcy52aWV3ID0gbmV3IEdyYXBoaWNRVmlldyh0aGlzLmRhdGEsIG9wdGlvbnMpXG4gICAgICpcbiAgICAgKi9cbiAgfVxuXG4gIC8qIE5lZWQgdG8gcmVmYWN0b3Igc3ViY2xhc3NlcyB0byBkbyB0aGlzOlxuICAgKiBjb25zdHJ1Y3RvciAoZGF0YSwgdmlldykge1xuICAgKiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAqICAgIHRoaXMudmlldyA9IHZpZXdcbiAgICogfVxuICAgKlxuICAgKiBzdGF0aWMgcmFuZG9tKG9wdGlvbnMpIHtcbiAgICogIC8vIGFuIGF0dGVtcHQgYXQgaGF2aW5nIGFic3RyYWN0IHN0YXRpYyBtZXRob2RzLCBhbGJlaXQgcnVudGltZSBlcnJvclxuICAgKiAgdGhyb3cgbmV3IEVycm9yKFwiYHJhbmRvbSgpYCBtdXN0IGJlIG92ZXJyaWRkZW4gaW4gc3ViY2xhc3MgXCIgKyB0aGlzLm5hbWUpXG4gICAqIH1cbiAgICpcbiAgICogdHlwaWNhbCBpbXBsZW1lbnRhdGlvbjpcbiAgICogc3RhdGljIHJhbmRvbShvcHRpb25zKSB7XG4gICAqICBjb25zdCBkYXRhID0gbmV3IERlcml2ZWRRRGF0YShvcHRpb25zKVxuICAgKiAgY29uc3QgdmlldyA9IG5ldyBEZXJpdmVkUVZpZXcob3B0aW9ucylcbiAgICogIHJldHVybiBuZXcgRGVyaXZlZFFEYXRhKGRhdGEsdmlldylcbiAgICogfVxuICAgKlxuICAgKi9cblxuICBnZXRET00gKCkgOiBIVE1MRWxlbWVudCB7IHJldHVybiB0aGlzLnZpZXcuZ2V0RE9NKCkgfVxuXG4gIHJlbmRlciAoKSA6IHZvaWQgeyB0aGlzLnZpZXcucmVuZGVyKCkgfVxuXG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICBzdXBlci5zaG93QW5zd2VyKClcbiAgICB0aGlzLnZpZXcuc2hvd0Fuc3dlcigpXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7XG4gICAgc3VwZXIuaGlkZUFuc3dlcigpXG4gICAgdGhpcy52aWV3LmhpZGVBbnN3ZXIoKVxuICB9XG59XG4iLCJpbXBvcnQgKiBhcyBjb21tb25qc0hlbHBlcnMgZnJvbSAnXHUwMDAwY29tbW9uanNIZWxwZXJzLmpzJ1xuXG52YXIgZnJhY3Rpb24gPSBjb21tb25qc0hlbHBlcnMuY3JlYXRlQ29tbW9uanNNb2R1bGUoZnVuY3Rpb24gKG1vZHVsZSwgZXhwb3J0cykge1xuLyoqXG4gKiBAbGljZW5zZSBGcmFjdGlvbi5qcyB2NC4wLjkgMDkvMDkvMjAxNVxuICogaHR0cDovL3d3dy54YXJnLm9yZy8yMDE0LzAzL3JhdGlvbmFsLW51bWJlcnMtaW4tamF2YXNjcmlwdC9cbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUsIFJvYmVydCBFaXNlbGUgKHJvYmVydEB4YXJnLm9yZylcbiAqIER1YWwgbGljZW5zZWQgdW5kZXIgdGhlIE1JVCBvciBHUEwgVmVyc2lvbiAyIGxpY2Vuc2VzLlxuICoqL1xuXG4gIC8qKlxuICpcbiAqIFRoaXMgY2xhc3Mgb2ZmZXJzIHRoZSBwb3NzaWJpbGl0eSB0byBjYWxjdWxhdGUgZnJhY3Rpb25zLlxuICogWW91IGNhbiBwYXNzIGEgZnJhY3Rpb24gaW4gZGlmZmVyZW50IGZvcm1hdHMuIEVpdGhlciBhcyBhcnJheSwgYXMgZG91YmxlLCBhcyBzdHJpbmcgb3IgYXMgYW4gaW50ZWdlci5cbiAqXG4gKiBBcnJheS9PYmplY3QgZm9ybVxuICogWyAwID0+IDxub21pbmF0b3I+LCAxID0+IDxkZW5vbWluYXRvcj4gXVxuICogWyBuID0+IDxub21pbmF0b3I+LCBkID0+IDxkZW5vbWluYXRvcj4gXVxuICpcbiAqIEludGVnZXIgZm9ybVxuICogLSBTaW5nbGUgaW50ZWdlciB2YWx1ZVxuICpcbiAqIERvdWJsZSBmb3JtXG4gKiAtIFNpbmdsZSBkb3VibGUgdmFsdWVcbiAqXG4gKiBTdHJpbmcgZm9ybVxuICogMTIzLjQ1NiAtIGEgc2ltcGxlIGRvdWJsZVxuICogMTIzLzQ1NiAtIGEgc3RyaW5nIGZyYWN0aW9uXG4gKiAxMjMuJzQ1NicgLSBhIGRvdWJsZSB3aXRoIHJlcGVhdGluZyBkZWNpbWFsIHBsYWNlc1xuICogMTIzLig0NTYpIC0gc3lub255bVxuICogMTIzLjQ1JzYnIC0gYSBkb3VibGUgd2l0aCByZXBlYXRpbmcgbGFzdCBwbGFjZVxuICogMTIzLjQ1KDYpIC0gc3lub255bVxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogdmFyIGYgPSBuZXcgRnJhY3Rpb24oXCI5LjQnMzEnXCIpO1xuICogZi5tdWwoWy00LCAzXSkuZGl2KDQuOSk7XG4gKlxuICovXG5cbiAgKGZ1bmN0aW9uIChyb290KSB7XG4gICAgJ3VzZSBzdHJpY3QnXG5cbiAgICAvLyBNYXhpbXVtIHNlYXJjaCBkZXB0aCBmb3IgY3ljbGljIHJhdGlvbmFsIG51bWJlcnMuIDIwMDAgc2hvdWxkIGJlIG1vcmUgdGhhbiBlbm91Z2guXG4gICAgLy8gRXhhbXBsZTogMS83ID0gMC4oMTQyODU3KSBoYXMgNiByZXBlYXRpbmcgZGVjaW1hbCBwbGFjZXMuXG4gICAgLy8gSWYgTUFYX0NZQ0xFX0xFTiBnZXRzIHJlZHVjZWQsIGxvbmcgY3ljbGVzIHdpbGwgbm90IGJlIGRldGVjdGVkIGFuZCB0b1N0cmluZygpIG9ubHkgZ2V0cyB0aGUgZmlyc3QgMTAgZGlnaXRzXG4gICAgdmFyIE1BWF9DWUNMRV9MRU4gPSAyMDAwXG5cbiAgICAvLyBQYXJzZWQgZGF0YSB0byBhdm9pZCBjYWxsaW5nIFwibmV3XCIgYWxsIHRoZSB0aW1lXG4gICAgdmFyIFAgPSB7XG4gICAgICBzOiAxLFxuICAgICAgbjogMCxcbiAgICAgIGQ6IDFcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVFcnJvciAobmFtZSkge1xuICAgICAgZnVuY3Rpb24gZXJyb3JDb25zdHJ1Y3RvciAoKSB7XG4gICAgICAgIHZhciB0ZW1wID0gRXJyb3IuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgICAgICB0ZW1wLm5hbWUgPSB0aGlzLm5hbWUgPSBuYW1lXG4gICAgICAgIHRoaXMuc3RhY2sgPSB0ZW1wLnN0YWNrXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IHRlbXAubWVzc2FnZVxuICAgICAgfVxuXG4gICAgICAvKipcbiAgICAgKiBFcnJvciBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgICBmdW5jdGlvbiBJbnRlcm1lZGlhdGVJbmhlcml0b3IgKCkge31cbiAgICAgIEludGVybWVkaWF0ZUluaGVyaXRvci5wcm90b3R5cGUgPSBFcnJvci5wcm90b3R5cGVcbiAgICAgIGVycm9yQ29uc3RydWN0b3IucHJvdG90eXBlID0gbmV3IEludGVybWVkaWF0ZUluaGVyaXRvcigpXG5cbiAgICAgIHJldHVybiBlcnJvckNvbnN0cnVjdG9yXG4gICAgfVxuXG4gICAgdmFyIERpdmlzaW9uQnlaZXJvID0gRnJhY3Rpb24uRGl2aXNpb25CeVplcm8gPSBjcmVhdGVFcnJvcignRGl2aXNpb25CeVplcm8nKVxuICAgIHZhciBJbnZhbGlkUGFyYW1ldGVyID0gRnJhY3Rpb24uSW52YWxpZFBhcmFtZXRlciA9IGNyZWF0ZUVycm9yKCdJbnZhbGlkUGFyYW1ldGVyJylcblxuICAgIGZ1bmN0aW9uIGFzc2lnbiAobiwgcykge1xuICAgICAgaWYgKGlzTmFOKG4gPSBwYXJzZUludChuLCAxMCkpKSB7XG4gICAgICAgIHRocm93SW52YWxpZFBhcmFtKClcbiAgICAgIH1cbiAgICAgIHJldHVybiBuICogc1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRocm93SW52YWxpZFBhcmFtICgpIHtcbiAgICAgIHRocm93IG5ldyBJbnZhbGlkUGFyYW1ldGVyKClcbiAgICB9XG5cbiAgICB2YXIgcGFyc2UgPSBmdW5jdGlvbiAocDEsIHAyKSB7XG4gICAgICB2YXIgbiA9IDA7IHZhciBkID0gMTsgdmFyIHMgPSAxXG4gICAgICB2YXIgdiA9IDA7IHZhciB3ID0gMDsgdmFyIHggPSAwOyB2YXIgeSA9IDE7IHZhciB6ID0gMVxuXG4gICAgICB2YXIgQSA9IDA7IHZhciBCID0gMVxuICAgICAgdmFyIEMgPSAxOyB2YXIgRCA9IDFcblxuICAgICAgdmFyIE4gPSAxMDAwMDAwMFxuICAgICAgdmFyIE1cblxuICAgICAgaWYgKHAxID09PSB1bmRlZmluZWQgfHwgcDEgPT09IG51bGwpIHtcbiAgICAgIC8qIHZvaWQgKi9cbiAgICAgIH0gZWxzZSBpZiAocDIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBuID0gcDFcbiAgICAgICAgZCA9IHAyXG4gICAgICAgIHMgPSBuICogZFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3dpdGNoICh0eXBlb2YgcDEpIHtcbiAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlmICgnZCcgaW4gcDEgJiYgJ24nIGluIHAxKSB7XG4gICAgICAgICAgICAgIG4gPSBwMS5uXG4gICAgICAgICAgICAgIGQgPSBwMS5kXG4gICAgICAgICAgICAgIGlmICgncycgaW4gcDEpIHsgbiAqPSBwMS5zIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoMCBpbiBwMSkge1xuICAgICAgICAgICAgICBuID0gcDFbMF1cbiAgICAgICAgICAgICAgaWYgKDEgaW4gcDEpIHsgZCA9IHAxWzFdIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93SW52YWxpZFBhcmFtKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHMgPSBuICogZFxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZiAocDEgPCAwKSB7XG4gICAgICAgICAgICAgIHMgPSBwMVxuICAgICAgICAgICAgICBwMSA9IC1wMVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocDEgJSAxID09PSAwKSB7XG4gICAgICAgICAgICAgIG4gPSBwMVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwMSA+IDApIHsgLy8gY2hlY2sgZm9yICE9IDAsIHNjYWxlIHdvdWxkIGJlY29tZSBOYU4gKGxvZygwKSksIHdoaWNoIGNvbnZlcmdlcyByZWFsbHkgc2xvd1xuICAgICAgICAgICAgICBpZiAocDEgPj0gMSkge1xuICAgICAgICAgICAgICAgIHogPSBNYXRoLnBvdygxMCwgTWF0aC5mbG9vcigxICsgTWF0aC5sb2cocDEpIC8gTWF0aC5MTjEwKSlcbiAgICAgICAgICAgICAgICBwMSAvPSB6XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAvLyBVc2luZyBGYXJleSBTZXF1ZW5jZXNcbiAgICAgICAgICAgICAgLy8gaHR0cDovL3d3dy5qb2huZGNvb2suY29tL2Jsb2cvMjAxMC8xMC8yMC9iZXN0LXJhdGlvbmFsLWFwcHJveGltYXRpb24vXG5cbiAgICAgICAgICAgICAgd2hpbGUgKEIgPD0gTiAmJiBEIDw9IE4pIHtcbiAgICAgICAgICAgICAgICBNID0gKEEgKyBDKSAvIChCICsgRClcblxuICAgICAgICAgICAgICAgIGlmIChwMSA9PT0gTSkge1xuICAgICAgICAgICAgICAgICAgaWYgKEIgKyBEIDw9IE4pIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IEEgKyBDXG4gICAgICAgICAgICAgICAgICAgIGQgPSBCICsgRFxuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChEID4gQikge1xuICAgICAgICAgICAgICAgICAgICBuID0gQ1xuICAgICAgICAgICAgICAgICAgICBkID0gRFxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IEFcbiAgICAgICAgICAgICAgICAgICAgZCA9IEJcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGlmIChwMSA+IE0pIHtcbiAgICAgICAgICAgICAgICAgICAgQSArPSBDXG4gICAgICAgICAgICAgICAgICAgIEIgKz0gRFxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgQyArPSBBXG4gICAgICAgICAgICAgICAgICAgIEQgKz0gQlxuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAoQiA+IE4pIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IENcbiAgICAgICAgICAgICAgICAgICAgZCA9IERcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBBXG4gICAgICAgICAgICAgICAgICAgIGQgPSBCXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG4gKj0gelxuICAgICAgICAgICAgfSBlbHNlIGlmIChpc05hTihwMSkgfHwgaXNOYU4ocDIpKSB7XG4gICAgICAgICAgICAgIGQgPSBuID0gTmFOXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIEIgPSBwMS5tYXRjaCgvXFxkK3wuL2cpXG5cbiAgICAgICAgICAgIGlmIChCID09PSBudWxsKSB7IHRocm93SW52YWxpZFBhcmFtKCkgfVxuXG4gICAgICAgICAgICBpZiAoQltBXSA9PT0gJy0nKSB7IC8vIENoZWNrIGZvciBtaW51cyBzaWduIGF0IHRoZSBiZWdpbm5pbmdcbiAgICAgICAgICAgICAgcyA9IC0xXG4gICAgICAgICAgICAgIEErK1xuICAgICAgICAgICAgfSBlbHNlIGlmIChCW0FdID09PSAnKycpIHsgLy8gQ2hlY2sgZm9yIHBsdXMgc2lnbiBhdCB0aGUgYmVnaW5uaW5nXG4gICAgICAgICAgICAgIEErK1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoQi5sZW5ndGggPT09IEEgKyAxKSB7IC8vIENoZWNrIGlmIGl0J3MganVzdCBhIHNpbXBsZSBudW1iZXIgXCIxMjM0XCJcbiAgICAgICAgICAgICAgdyA9IGFzc2lnbihCW0ErK10sIHMpXG4gICAgICAgICAgICB9IGVsc2UgaWYgKEJbQSArIDFdID09PSAnLicgfHwgQltBXSA9PT0gJy4nKSB7IC8vIENoZWNrIGlmIGl0J3MgYSBkZWNpbWFsIG51bWJlclxuICAgICAgICAgICAgICBpZiAoQltBXSAhPT0gJy4nKSB7IC8vIEhhbmRsZSAwLjUgYW5kIC41XG4gICAgICAgICAgICAgICAgdiA9IGFzc2lnbihCW0ErK10sIHMpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgQSsrXG5cbiAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGRlY2ltYWwgcGxhY2VzXG4gICAgICAgICAgICAgIGlmIChBICsgMSA9PT0gQi5sZW5ndGggfHwgQltBICsgMV0gPT09ICcoJyAmJiBCW0EgKyAzXSA9PT0gJyknIHx8IEJbQSArIDFdID09PSBcIidcIiAmJiBCW0EgKyAzXSA9PT0gXCInXCIpIHtcbiAgICAgICAgICAgICAgICB3ID0gYXNzaWduKEJbQV0sIHMpXG4gICAgICAgICAgICAgICAgeSA9IE1hdGgucG93KDEwLCBCW0FdLmxlbmd0aClcbiAgICAgICAgICAgICAgICBBKytcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIENoZWNrIGZvciByZXBlYXRpbmcgcGxhY2VzXG4gICAgICAgICAgICAgIGlmIChCW0FdID09PSAnKCcgJiYgQltBICsgMl0gPT09ICcpJyB8fCBCW0FdID09PSBcIidcIiAmJiBCW0EgKyAyXSA9PT0gXCInXCIpIHtcbiAgICAgICAgICAgICAgICB4ID0gYXNzaWduKEJbQSArIDFdLCBzKVxuICAgICAgICAgICAgICAgIHogPSBNYXRoLnBvdygxMCwgQltBICsgMV0ubGVuZ3RoKSAtIDFcbiAgICAgICAgICAgICAgICBBICs9IDNcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChCW0EgKyAxXSA9PT0gJy8nIHx8IEJbQSArIDFdID09PSAnOicpIHsgLy8gQ2hlY2sgZm9yIGEgc2ltcGxlIGZyYWN0aW9uIFwiMTIzLzQ1NlwiIG9yIFwiMTIzOjQ1NlwiXG4gICAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBXSwgcylcbiAgICAgICAgICAgICAgeSA9IGFzc2lnbihCW0EgKyAyXSwgMSlcbiAgICAgICAgICAgICAgQSArPSAzXG4gICAgICAgICAgICB9IGVsc2UgaWYgKEJbQSArIDNdID09PSAnLycgJiYgQltBICsgMV0gPT09ICcgJykgeyAvLyBDaGVjayBmb3IgYSBjb21wbGV4IGZyYWN0aW9uIFwiMTIzIDEvMlwiXG4gICAgICAgICAgICAgIHYgPSBhc3NpZ24oQltBXSwgcylcbiAgICAgICAgICAgICAgdyA9IGFzc2lnbihCW0EgKyAyXSwgcylcbiAgICAgICAgICAgICAgeSA9IGFzc2lnbihCW0EgKyA0XSwgMSlcbiAgICAgICAgICAgICAgQSArPSA1XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChCLmxlbmd0aCA8PSBBKSB7IC8vIENoZWNrIGZvciBtb3JlIHRva2VucyBvbiB0aGUgc3RhY2tcbiAgICAgICAgICAgICAgZCA9IHkgKiB6XG4gICAgICAgICAgICAgIHMgPSAvKiB2b2lkICovXG4gICAgICAgICAgICAgICAgICAgIG4gPSB4ICsgZCAqIHYgKyB6ICogd1xuICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgLyogRmFsbCB0aHJvdWdoIG9uIGVycm9yICovXG4gICAgICAgICAgfVxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvd0ludmFsaWRQYXJhbSgpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGQgPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IERpdmlzaW9uQnlaZXJvKClcbiAgICAgIH1cblxuICAgICAgUC5zID0gcyA8IDAgPyAtMSA6IDFcbiAgICAgIFAubiA9IE1hdGguYWJzKG4pXG4gICAgICBQLmQgPSBNYXRoLmFicyhkKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vZHBvdyAoYiwgZSwgbSkge1xuICAgICAgdmFyIHIgPSAxXG4gICAgICBmb3IgKDsgZSA+IDA7IGIgPSAoYiAqIGIpICUgbSwgZSA+Pj0gMSkge1xuICAgICAgICBpZiAoZSAmIDEpIHtcbiAgICAgICAgICByID0gKHIgKiBiKSAlIG1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjeWNsZUxlbiAobiwgZCkge1xuICAgICAgZm9yICg7IGQgJSAyID09PSAwO1xuICAgICAgICBkIC89IDIpIHtcbiAgICAgIH1cblxuICAgICAgZm9yICg7IGQgJSA1ID09PSAwO1xuICAgICAgICBkIC89IDUpIHtcbiAgICAgIH1cblxuICAgICAgaWYgKGQgPT09IDEpIC8vIENhdGNoIG5vbi1jeWNsaWMgbnVtYmVyc1xuICAgICAgeyByZXR1cm4gMCB9XG5cbiAgICAgIC8vIElmIHdlIHdvdWxkIGxpa2UgdG8gY29tcHV0ZSByZWFsbHkgbGFyZ2UgbnVtYmVycyBxdWlja2VyLCB3ZSBjb3VsZCBtYWtlIHVzZSBvZiBGZXJtYXQncyBsaXR0bGUgdGhlb3JlbTpcbiAgICAgIC8vIDEwXihkLTEpICUgZCA9PSAxXG4gICAgICAvLyBIb3dldmVyLCB3ZSBkb24ndCBuZWVkIHN1Y2ggbGFyZ2UgbnVtYmVycyBhbmQgTUFYX0NZQ0xFX0xFTiBzaG91bGQgYmUgdGhlIGNhcHN0b25lLFxuICAgICAgLy8gYXMgd2Ugd2FudCB0byB0cmFuc2xhdGUgdGhlIG51bWJlcnMgdG8gc3RyaW5ncy5cblxuICAgICAgdmFyIHJlbSA9IDEwICUgZFxuICAgICAgdmFyIHQgPSAxXG5cbiAgICAgIGZvciAoOyByZW0gIT09IDE7IHQrKykge1xuICAgICAgICByZW0gPSByZW0gKiAxMCAlIGRcblxuICAgICAgICBpZiAodCA+IE1BWF9DWUNMRV9MRU4pIHsgcmV0dXJuIDAgfSAvLyBSZXR1cm5pbmcgMCBoZXJlIG1lYW5zIHRoYXQgd2UgZG9uJ3QgcHJpbnQgaXQgYXMgYSBjeWNsaWMgbnVtYmVyLiBJdCdzIGxpa2VseSB0aGF0IHRoZSBhbnN3ZXIgaXMgYGQtMWBcbiAgICAgIH1cbiAgICAgIHJldHVybiB0XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3ljbGVTdGFydCAobiwgZCwgbGVuKSB7XG4gICAgICB2YXIgcmVtMSA9IDFcbiAgICAgIHZhciByZW0yID0gbW9kcG93KDEwLCBsZW4sIGQpXG5cbiAgICAgIGZvciAodmFyIHQgPSAwOyB0IDwgMzAwOyB0KyspIHsgLy8gcyA8IH5sb2cxMChOdW1iZXIuTUFYX1ZBTFVFKVxuICAgICAgLy8gU29sdmUgMTBecyA9PSAxMF4ocyt0KSAobW9kIGQpXG5cbiAgICAgICAgaWYgKHJlbTEgPT09IHJlbTIpIHsgcmV0dXJuIHQgfVxuXG4gICAgICAgIHJlbTEgPSByZW0xICogMTAgJSBkXG4gICAgICAgIHJlbTIgPSByZW0yICogMTAgJSBkXG4gICAgICB9XG4gICAgICByZXR1cm4gMFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdjZCAoYSwgYikge1xuICAgICAgaWYgKCFhKSB7IHJldHVybiBiIH1cbiAgICAgIGlmICghYikgeyByZXR1cm4gYSB9XG5cbiAgICAgIHdoaWxlICgxKSB7XG4gICAgICAgIGEgJT0gYlxuICAgICAgICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICAgICAgICBiICU9IGFcbiAgICAgICAgaWYgKCFiKSB7IHJldHVybiBhIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAqIE1vZHVsZSBjb25zdHJ1Y3RvclxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtudW1iZXJ8RnJhY3Rpb249fSBhXG4gICAqIEBwYXJhbSB7bnVtYmVyPX0gYlxuICAgKi9cbiAgICBmdW5jdGlvbiBGcmFjdGlvbiAoYSwgYikge1xuICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZyYWN0aW9uKSkge1xuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKGEsIGIpXG4gICAgICB9XG5cbiAgICAgIHBhcnNlKGEsIGIpXG5cbiAgICAgIGlmIChGcmFjdGlvbi5SRURVQ0UpIHtcbiAgICAgICAgYSA9IGdjZChQLmQsIFAubikgLy8gQWJ1c2UgYVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYSA9IDFcbiAgICAgIH1cblxuICAgICAgdGhpcy5zID0gUC5zXG4gICAgICB0aGlzLm4gPSBQLm4gLyBhXG4gICAgICB0aGlzLmQgPSBQLmQgLyBhXG4gICAgfVxuXG4gICAgLyoqXG4gICAqIEJvb2xlYW4gZ2xvYmFsIHZhcmlhYmxlIHRvIGJlIGFibGUgdG8gZGlzYWJsZSBhdXRvbWF0aWMgcmVkdWN0aW9uIG9mIHRoZSBmcmFjdGlvblxuICAgKlxuICAgKi9cbiAgICBGcmFjdGlvbi5SRURVQ0UgPSAxXG5cbiAgICBGcmFjdGlvbi5wcm90b3R5cGUgPSB7XG5cbiAgICAgIHM6IDEsXG4gICAgICBuOiAwLFxuICAgICAgZDogMSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgYWJzb2x1dGUgdmFsdWVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oLTQpLmFicygpID0+IDRcbiAgICAgKiovXG4gICAgICBhYnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzLm4sIHRoaXMuZClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIEludmVydHMgdGhlIHNpZ24gb2YgdGhlIGN1cnJlbnQgZnJhY3Rpb25cbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oLTQpLm5lZygpID0+IDRcbiAgICAgKiovXG4gICAgICBuZWc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbigtdGhpcy5zICogdGhpcy5uLCB0aGlzLmQpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBBZGRzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKHtuOiAyLCBkOiAzfSkuYWRkKFwiMTQuOVwiKSA9PiA0NjcgLyAzMFxuICAgICAqKi9cbiAgICAgIGFkZDogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICB0aGlzLnMgKiB0aGlzLm4gKiBQLmQgKyBQLnMgKiB0aGlzLmQgKiBQLm4sXG4gICAgICAgICAgdGhpcy5kICogUC5kXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFN1YnRyYWN0cyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbih7bjogMiwgZDogM30pLmFkZChcIjE0LjlcIikgPT4gLTQyNyAvIDMwXG4gICAgICoqL1xuICAgICAgc3ViOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKFxuICAgICAgICAgIHRoaXMucyAqIHRoaXMubiAqIFAuZCAtIFAucyAqIHRoaXMuZCAqIFAubixcbiAgICAgICAgICB0aGlzLmQgKiBQLmRcbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogTXVsdGlwbGllcyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIi0xNy4oMzQ1KVwiKS5tdWwoMykgPT4gNTc3NiAvIDExMVxuICAgICAqKi9cbiAgICAgIG11bDogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICB0aGlzLnMgKiBQLnMgKiB0aGlzLm4gKiBQLm4sXG4gICAgICAgICAgdGhpcy5kICogUC5kXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIERpdmlkZXMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCItMTcuKDM0NSlcIikuaW52ZXJzZSgpLmRpdigzKVxuICAgICAqKi9cbiAgICAgIGRpdjogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICB0aGlzLnMgKiBQLnMgKiB0aGlzLm4gKiBQLmQsXG4gICAgICAgICAgdGhpcy5kICogUC5uXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENsb25lcyB0aGUgYWN0dWFsIG9iamVjdFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIi0xNy4oMzQ1KVwiKS5jbG9uZSgpXG4gICAgICoqL1xuICAgICAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgbW9kdWxvIG9mIHR3byByYXRpb25hbCBudW1iZXJzIC0gYSBtb3JlIHByZWNpc2UgZm1vZFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5tb2QoWzcsIDhdKSA9PiAoMTMvMykgJSAoNy84KSA9ICg1LzYpXG4gICAgICoqL1xuICAgICAgbW9kOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzLnMgKiB0aGlzLm4gJSB0aGlzLmQsIDEpXG4gICAgICAgIH1cblxuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICBpZiAoUC5uID09PSAwICYmIHRoaXMuZCA9PT0gMCkge1xuICAgICAgICAgIEZyYWN0aW9uKDAsIDApIC8vIFRocm93IERpdmlzaW9uQnlaZXJvXG4gICAgICAgIH1cblxuICAgICAgICAvKlxuICAgICAgICogRmlyc3Qgc2lsbHkgYXR0ZW1wdCwga2luZGEgc2xvd1xuICAgICAgICpcbiAgICAgICByZXR1cm4gdGhhdFtcInN1YlwiXSh7XG4gICAgICAgXCJuXCI6IG51bVtcIm5cIl0gKiBNYXRoLmZsb29yKCh0aGlzLm4gLyB0aGlzLmQpIC8gKG51bS5uIC8gbnVtLmQpKSxcbiAgICAgICBcImRcIjogbnVtW1wiZFwiXSxcbiAgICAgICBcInNcIjogdGhpc1tcInNcIl1cbiAgICAgICB9KTsgKi9cblxuICAgICAgICAvKlxuICAgICAgICogTmV3IGF0dGVtcHQ6IGExIC8gYjEgPSBhMiAvIGIyICogcSArIHJcbiAgICAgICAqID0+IGIyICogYTEgPSBhMiAqIGIxICogcSArIGIxICogYjIgKiByXG4gICAgICAgKiA9PiAoYjIgKiBhMSAlIGEyICogYjEpIC8gKGIxICogYjIpXG4gICAgICAgKi9cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICB0aGlzLnMgKiAoUC5kICogdGhpcy5uKSAlIChQLm4gKiB0aGlzLmQpLFxuICAgICAgICAgIFAuZCAqIHRoaXMuZFxuICAgICAgICApXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmcmFjdGlvbmFsIGdjZCBvZiB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbig1LDgpLmdjZCgzLDcpID0+IDEvNTZcbiAgICAgKi9cbiAgICAgIGdjZDogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcblxuICAgICAgICAvLyBnY2QoYSAvIGIsIGMgLyBkKSA9IGdjZChhLCBjKSAvIGxjbShiLCBkKVxuXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oZ2NkKFAubiwgdGhpcy5uKSAqIGdjZChQLmQsIHRoaXMuZCksIFAuZCAqIHRoaXMuZClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZyYWN0aW9uYWwgbGNtIG9mIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDUsOCkubGNtKDMsNykgPT4gMTVcbiAgICAgKi9cbiAgICAgIGxjbTogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcblxuICAgICAgICAvLyBsY20oYSAvIGIsIGMgLyBkKSA9IGxjbShhLCBjKSAvIGdjZChiLCBkKVxuXG4gICAgICAgIGlmIChQLm4gPT09IDAgJiYgdGhpcy5uID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbigpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihQLm4gKiB0aGlzLm4sIGdjZChQLm4sIHRoaXMubikgKiBnY2QoUC5kLCB0aGlzLmQpKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgY2VpbCBvZiBhIHJhdGlvbmFsIG51bWJlclxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5jZWlsKCkgPT4gKDUgLyAxKVxuICAgICAqKi9cbiAgICAgIGNlaWw6IGZ1bmN0aW9uIChwbGFjZXMpIHtcbiAgICAgICAgcGxhY2VzID0gTWF0aC5wb3coMTAsIHBsYWNlcyB8fCAwKVxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGguY2VpbChwbGFjZXMgKiB0aGlzLnMgKiB0aGlzLm4gLyB0aGlzLmQpLCBwbGFjZXMpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmbG9vciBvZiBhIHJhdGlvbmFsIG51bWJlclxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5mbG9vcigpID0+ICg0IC8gMSlcbiAgICAgKiovXG4gICAgICBmbG9vcjogZnVuY3Rpb24gKHBsYWNlcykge1xuICAgICAgICBwbGFjZXMgPSBNYXRoLnBvdygxMCwgcGxhY2VzIHx8IDApXG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5mbG9vcihwbGFjZXMgKiB0aGlzLnMgKiB0aGlzLm4gLyB0aGlzLmQpLCBwbGFjZXMpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBSb3VuZHMgYSByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKCc0LigzKScpLnJvdW5kKCkgPT4gKDQgLyAxKVxuICAgICAqKi9cbiAgICAgIHJvdW5kOiBmdW5jdGlvbiAocGxhY2VzKSB7XG4gICAgICAgIHBsYWNlcyA9IE1hdGgucG93KDEwLCBwbGFjZXMgfHwgMClcblxuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLnJvdW5kKHBsYWNlcyAqIHRoaXMucyAqIHRoaXMubiAvIHRoaXMuZCksIHBsYWNlcylcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGludmVyc2Ugb2YgdGhlIGZyYWN0aW9uLCBtZWFucyBudW1lcmF0b3IgYW5kIGRlbnVtZXJhdG9yIGFyZSBleGNoYW5nZWRcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oWy0zLCA0XSkuaW52ZXJzZSgpID0+IC00IC8gM1xuICAgICAqKi9cbiAgICAgIGludmVyc2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbih0aGlzLnMgKiB0aGlzLmQsIHRoaXMubilcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGZyYWN0aW9uIHRvIHNvbWUgaW50ZWdlciBleHBvbmVudFxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigtMSwyKS5wb3coLTMpID0+IC04XG4gICAgICovXG4gICAgICBwb3c6IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIGlmIChtIDwgMCkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5wb3codGhpcy5zICogdGhpcy5kLCAtbSksIE1hdGgucG93KHRoaXMubiwgLW0pKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5wb3codGhpcy5zICogdGhpcy5uLCBtKSwgTWF0aC5wb3codGhpcy5kLCBtKSlcbiAgICAgICAgfVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdHdvIHJhdGlvbmFsIG51bWJlcnMgYXJlIHRoZSBzYW1lXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDE5LjYpLmVxdWFscyhbOTgsIDVdKTtcbiAgICAgKiovXG4gICAgICBlcXVhbHM6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiB0aGlzLnMgKiB0aGlzLm4gKiBQLmQgPT09IFAucyAqIFAubiAqIHRoaXMuZCAvLyBTYW1lIGFzIGNvbXBhcmUoKSA9PT0gMFxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdHdvIHJhdGlvbmFsIG51bWJlcnMgYXJlIHRoZSBzYW1lXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKDE5LjYpLmVxdWFscyhbOTgsIDVdKTtcbiAgICAgKiovXG4gICAgICBjb21wYXJlOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICB2YXIgdCA9ICh0aGlzLnMgKiB0aGlzLm4gKiBQLmQgLSBQLnMgKiBQLm4gKiB0aGlzLmQpXG4gICAgICAgIHJldHVybiAodCA+IDApIC0gKHQgPCAwKVxuICAgICAgfSxcblxuICAgICAgc2ltcGxpZnk6IGZ1bmN0aW9uIChlcHMpIHtcbiAgICAgIC8vIEZpcnN0IG5haXZlIGltcGxlbWVudGF0aW9uLCBuZWVkcyBpbXByb3ZlbWVudFxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNvbnQgPSB0aGlzLmFicygpLnRvQ29udGludWVkKClcblxuICAgICAgICBlcHMgPSBlcHMgfHwgMC4wMDFcblxuICAgICAgICBmdW5jdGlvbiByZWMgKGEpIHtcbiAgICAgICAgICBpZiAoYS5sZW5ndGggPT09IDEpIHsgcmV0dXJuIG5ldyBGcmFjdGlvbihhWzBdKSB9XG4gICAgICAgICAgcmV0dXJuIHJlYyhhLnNsaWNlKDEpKS5pbnZlcnNlKCkuYWRkKGFbMF0pXG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbnQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB2YXIgdG1wID0gcmVjKGNvbnQuc2xpY2UoMCwgaSArIDEpKVxuICAgICAgICAgIGlmICh0bXAuc3ViKHRoaXMuYWJzKCkpLmFicygpLnZhbHVlT2YoKSA8IGVwcykge1xuICAgICAgICAgICAgcmV0dXJuIHRtcC5tdWwodGhpcy5zKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdHdvIHJhdGlvbmFsIG51bWJlcnMgYXJlIGRpdmlzaWJsZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigxOS42KS5kaXZpc2libGUoMS41KTtcbiAgICAgKi9cbiAgICAgIGRpdmlzaWJsZTogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuICEoIShQLm4gKiB0aGlzLmQpIHx8ICgodGhpcy5uICogUC5kKSAlIChQLm4gKiB0aGlzLmQpKSlcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBkZWNpbWFsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBmcmFjdGlvblxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjEwMC4nOTE4MjMnXCIpLnZhbHVlT2YoKSA9PiAxMDAuOTE4MjM5MTgyMzkxODNcbiAgICAgKiovXG4gICAgICB2YWx1ZU9mOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnMgKiB0aGlzLm4gLyB0aGlzLmRcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBzdHJpbmctZnJhY3Rpb24gcmVwcmVzZW50YXRpb24gb2YgYSBGcmFjdGlvbiBvYmplY3RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxLiczJ1wiKS50b0ZyYWN0aW9uKCkgPT4gXCI0IDEvM1wiXG4gICAgICoqL1xuICAgICAgdG9GcmFjdGlvbjogZnVuY3Rpb24gKGV4Y2x1ZGVXaG9sZSkge1xuICAgICAgICB2YXIgd2hvbGU7IHZhciBzdHIgPSAnJ1xuICAgICAgICB2YXIgbiA9IHRoaXMublxuICAgICAgICB2YXIgZCA9IHRoaXMuZFxuICAgICAgICBpZiAodGhpcy5zIDwgMCkge1xuICAgICAgICAgIHN0ciArPSAnLSdcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkID09PSAxKSB7XG4gICAgICAgICAgc3RyICs9IG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZXhjbHVkZVdob2xlICYmICh3aG9sZSA9IE1hdGguZmxvb3IobiAvIGQpKSA+IDApIHtcbiAgICAgICAgICAgIHN0ciArPSB3aG9sZVxuICAgICAgICAgICAgc3RyICs9ICcgJ1xuICAgICAgICAgICAgbiAlPSBkXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc3RyICs9IG5cbiAgICAgICAgICBzdHIgKz0gJy8nXG4gICAgICAgICAgc3RyICs9IGRcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RyXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgbGF0ZXggcmVwcmVzZW50YXRpb24gb2YgYSBGcmFjdGlvbiBvYmplY3RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxLiczJ1wiKS50b0xhdGV4KCkgPT4gXCJcXGZyYWN7NH17M31cIlxuICAgICAqKi9cbiAgICAgIHRvTGF0ZXg6IGZ1bmN0aW9uIChleGNsdWRlV2hvbGUpIHtcbiAgICAgICAgdmFyIHdob2xlOyB2YXIgc3RyID0gJydcbiAgICAgICAgdmFyIG4gPSB0aGlzLm5cbiAgICAgICAgdmFyIGQgPSB0aGlzLmRcbiAgICAgICAgaWYgKHRoaXMucyA8IDApIHtcbiAgICAgICAgICBzdHIgKz0gJy0nXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZCA9PT0gMSkge1xuICAgICAgICAgIHN0ciArPSBuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGV4Y2x1ZGVXaG9sZSAmJiAod2hvbGUgPSBNYXRoLmZsb29yKG4gLyBkKSkgPiAwKSB7XG4gICAgICAgICAgICBzdHIgKz0gd2hvbGVcbiAgICAgICAgICAgIG4gJT0gZFxuICAgICAgICAgIH1cblxuICAgICAgICAgIHN0ciArPSAnXFxcXGZyYWN7J1xuICAgICAgICAgIHN0ciArPSBuXG4gICAgICAgICAgc3RyICs9ICd9eydcbiAgICAgICAgICBzdHIgKz0gZFxuICAgICAgICAgIHN0ciArPSAnfSdcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RyXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIGNvbnRpbnVlZCBmcmFjdGlvbiBlbGVtZW50c1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbihcIjcvOFwiKS50b0NvbnRpbnVlZCgpID0+IFswLDEsN11cbiAgICAgKi9cbiAgICAgIHRvQ29udGludWVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0XG4gICAgICAgIHZhciBhID0gdGhpcy5uXG4gICAgICAgIHZhciBiID0gdGhpcy5kXG4gICAgICAgIHZhciByZXMgPSBbXVxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gcmVzXG4gICAgICAgIH1cblxuICAgICAgICBkbyB7XG4gICAgICAgICAgcmVzLnB1c2goTWF0aC5mbG9vcihhIC8gYikpXG4gICAgICAgICAgdCA9IGEgJSBiXG4gICAgICAgICAgYSA9IGJcbiAgICAgICAgICBiID0gdFxuICAgICAgICB9IHdoaWxlIChhICE9PSAxKVxuXG4gICAgICAgIHJldHVybiByZXNcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYSBmcmFjdGlvbiB3aXRoIGFsbCBkaWdpdHNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxMDAuJzkxODIzJ1wiKS50b1N0cmluZygpID0+IFwiMTAwLig5MTgyMylcIlxuICAgICAqKi9cbiAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoZGVjKSB7XG4gICAgICAgIHZhciBnXG4gICAgICAgIHZhciBOID0gdGhpcy5uXG4gICAgICAgIHZhciBEID0gdGhpcy5kXG5cbiAgICAgICAgaWYgKGlzTmFOKE4pIHx8IGlzTmFOKEQpKSB7XG4gICAgICAgICAgcmV0dXJuICdOYU4nXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIUZyYWN0aW9uLlJFRFVDRSkge1xuICAgICAgICAgIGcgPSBnY2QoTiwgRClcbiAgICAgICAgICBOIC89IGdcbiAgICAgICAgICBEIC89IGdcbiAgICAgICAgfVxuXG4gICAgICAgIGRlYyA9IGRlYyB8fCAxNSAvLyAxNSA9IGRlY2ltYWwgcGxhY2VzIHdoZW4gbm8gcmVwaXRhdGlvblxuXG4gICAgICAgIHZhciBjeWNMZW4gPSBjeWNsZUxlbihOLCBEKSAvLyBDeWNsZSBsZW5ndGhcbiAgICAgICAgdmFyIGN5Y09mZiA9IGN5Y2xlU3RhcnQoTiwgRCwgY3ljTGVuKSAvLyBDeWNsZSBzdGFydFxuXG4gICAgICAgIHZhciBzdHIgPSB0aGlzLnMgPT09IC0xID8gJy0nIDogJydcblxuICAgICAgICBzdHIgKz0gTiAvIEQgfCAwXG5cbiAgICAgICAgTiAlPSBEXG4gICAgICAgIE4gKj0gMTBcblxuICAgICAgICBpZiAoTikgeyBzdHIgKz0gJy4nIH1cblxuICAgICAgICBpZiAoY3ljTGVuKSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IGN5Y09mZjsgaS0tOykge1xuICAgICAgICAgICAgc3RyICs9IE4gLyBEIHwgMFxuICAgICAgICAgICAgTiAlPSBEXG4gICAgICAgICAgICBOICo9IDEwXG4gICAgICAgICAgfVxuICAgICAgICAgIHN0ciArPSAnKCdcbiAgICAgICAgICBmb3IgKHZhciBpID0gY3ljTGVuOyBpLS07KSB7XG4gICAgICAgICAgICBzdHIgKz0gTiAvIEQgfCAwXG4gICAgICAgICAgICBOICU9IERcbiAgICAgICAgICAgIE4gKj0gMTBcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RyICs9ICcpJ1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZvciAodmFyIGkgPSBkZWM7IE4gJiYgaS0tOykge1xuICAgICAgICAgICAgc3RyICs9IE4gLyBEIHwgMFxuICAgICAgICAgICAgTiAlPSBEXG4gICAgICAgICAgICBOICo9IDEwXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHJcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHVuZGVmaW5lZCA9PT0gJ2Z1bmN0aW9uJyAmJiB1bmRlZmluZWQuYW1kKSB7XG4gICAgICB1bmRlZmluZWQoW10sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIEZyYWN0aW9uXG4gICAgICB9KVxuICAgIH0gZWxzZSBpZiAoJ29iamVjdCcgPT09ICdvYmplY3QnKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pXG4gICAgICBGcmFjdGlvbi5kZWZhdWx0ID0gRnJhY3Rpb25cbiAgICAgIEZyYWN0aW9uLkZyYWN0aW9uID0gRnJhY3Rpb25cbiAgICAgIG1vZHVsZS5leHBvcnRzID0gRnJhY3Rpb25cbiAgICB9IGVsc2Uge1xuICAgICAgcm9vdC5GcmFjdGlvbiA9IEZyYWN0aW9uXG4gICAgfVxuICB9KShjb21tb25qc0hlbHBlcnMuY29tbW9uanNHbG9iYWwpXG59KVxuXG5leHBvcnQgZGVmYXVsdCAvKiBAX19QVVJFX18gKi9jb21tb25qc0hlbHBlcnMuZ2V0RGVmYXVsdEV4cG9ydEZyb21DanMoZnJhY3Rpb24pXG5leHBvcnQgeyBmcmFjdGlvbiBhcyBfX21vZHVsZUV4cG9ydHMgfVxuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgTW9ub21pYWwge1xuICBjb25zdHJ1Y3RvciAoYywgdnMpIHtcbiAgICBpZiAoIWlzTmFOKGMpICYmIHZzIGluc3RhbmNlb2YgTWFwKSB7XG4gICAgICB0aGlzLmMgPSBjXG4gICAgICB0aGlzLnZzID0gdnNcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBjID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5pbml0U3RyKGMpXG4gICAgfSBlbHNlIGlmICghaXNOYU4oYykpIHtcbiAgICAgIHRoaXMuYyA9IGNcbiAgICAgIHRoaXMudnMgPSBuZXcgTWFwKClcbiAgICB9IGVsc2UgeyAvLyBkZWZhdWx0IGFzIGEgdGVzdDogNHheMnlcbiAgICAgIHRoaXMuYyA9IDRcbiAgICAgIHRoaXMudnMgPSBuZXcgTWFwKFtbJ3gnLCAyXSwgWyd5JywgMV1dKVxuICAgIH1cbiAgfVxuXG4gIGNsb25lICgpIHtcbiAgICBjb25zdCB2cyA9IG5ldyBNYXAodGhpcy52cylcbiAgICByZXR1cm4gbmV3IE1vbm9taWFsKHRoaXMuYywgdnMpXG4gIH1cblxuICBtdWwgKHRoYXQpIHtcbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IE1vbm9taWFsKHRoYXQpXG4gICAgfVxuICAgIGNvbnN0IGMgPSB0aGlzLmMgKiB0aGF0LmNcbiAgICBsZXQgdnMgPSBuZXcgTWFwKClcbiAgICB0aGlzLnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKHRoYXQudnMuaGFzKHZhcmlhYmxlKSkge1xuICAgICAgICB2cy5zZXQodmFyaWFibGUsIHRoaXMudnMuZ2V0KHZhcmlhYmxlKSArIHRoYXQudnMuZ2V0KHZhcmlhYmxlKSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZzLnNldCh2YXJpYWJsZSwgdGhpcy52cy5nZXQodmFyaWFibGUpKVxuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGF0LnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKCF2cy5oYXModmFyaWFibGUpKSB7XG4gICAgICAgIHZzLnNldCh2YXJpYWJsZSwgdGhhdC52cy5nZXQodmFyaWFibGUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgdnMgPSBuZXcgTWFwKFsuLi52cy5lbnRyaWVzKCldLnNvcnQoKSlcbiAgICByZXR1cm4gbmV3IE1vbm9taWFsKGMsIHZzKVxuICB9XG5cbiAgdG9MYXRleCAoKSB7XG4gICAgaWYgKHRoaXMudnMuc2l6ZSA9PT0gMCkgcmV0dXJuIHRoaXMuYy50b1N0cmluZygpXG4gICAgbGV0IHN0ciA9IHRoaXMuYyA9PT0gMSA/ICcnXG4gICAgICA6IHRoaXMuYyA9PT0gLTEgPyAnLSdcbiAgICAgICAgOiB0aGlzLmMudG9TdHJpbmcoKVxuICAgIHRoaXMudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAoaW5kZXggPT09IDEpIHtcbiAgICAgICAgc3RyICs9IHZhcmlhYmxlXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgKz0gdmFyaWFibGUgKyAnXicgKyBpbmRleFxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIHN0clxuICB9XG5cbiAgc29ydCAoKSB7XG4gICAgLy8gc29ydHMgKG1vZGlmaWVzIG9iamVjdClcbiAgICB0aGlzLnZzID0gbmV3IE1hcChbLi4udGhpcy52cy5lbnRyaWVzKCldLnNvcnQoKSlcbiAgfVxuXG4gIGNsZWFuWmVyb3MgKCkge1xuICAgIHRoaXMudnMuZm9yRWFjaCgoaWR4LCB2KSA9PiB7XG4gICAgICBpZiAoaWR4ID09PSAwKSB0aGlzLnZzLmRlbGV0ZSh2KVxuICAgIH0pXG4gIH1cblxuICBsaWtlICh0aGF0KSB7XG4gICAgLy8gcmV0dXJuIHRydWUgaWYgbGlrZSB0ZXJtcywgZmFsc2UgaWYgb3RoZXJ3aXNlXG4gICAgLy8gbm90IHRoZSBtb3N0IGVmZmljaWVudCBhdCB0aGUgbW9tZW50LCBidXQgZ29vZCBlbm91Z2guXG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIE1vbm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBNb25vbWlhbCh0aGF0KVxuICAgIH1cblxuICAgIGxldCBsaWtlID0gdHJ1ZVxuICAgIHRoaXMudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAoIXRoYXQudnMuaGFzKHZhcmlhYmxlKSB8fCB0aGF0LnZzLmdldCh2YXJpYWJsZSkgIT09IGluZGV4KSB7XG4gICAgICAgIGxpa2UgPSBmYWxzZVxuICAgICAgfVxuICAgIH0pXG4gICAgdGhhdC52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICghdGhpcy52cy5oYXModmFyaWFibGUpIHx8IHRoaXMudnMuZ2V0KHZhcmlhYmxlKSAhPT0gaW5kZXgpIHtcbiAgICAgICAgbGlrZSA9IGZhbHNlXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gbGlrZVxuICB9XG5cbiAgYWRkICh0aGF0LCBjaGVja0xpa2UpIHtcbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgTW9ub21pYWwpKSB7XG4gICAgICB0aGF0ID0gbmV3IE1vbm9taWFsKHRoYXQpXG4gICAgfVxuICAgIC8vIGFkZHMgdHdvIGNvbXBhdGlibGUgbW9ub21pYWxzXG4gICAgLy8gY2hlY2tMaWtlIChkZWZhdWx0IHRydWUpIHdpbGwgY2hlY2sgZmlyc3QgaWYgdGhleSBhcmUgbGlrZSBhbmQgdGhyb3cgYW4gZXhjZXB0aW9uXG4gICAgLy8gdW5kZWZpbmVkIGJlaGF2aW91ciBpZiBjaGVja0xpa2UgaXMgZmFsc2VcbiAgICBpZiAoY2hlY2tMaWtlID09PSB1bmRlZmluZWQpIGNoZWNrTGlrZSA9IHRydWVcbiAgICBpZiAoY2hlY2tMaWtlICYmICF0aGlzLmxpa2UodGhhdCkpIHRocm93IG5ldyBFcnJvcignQWRkaW5nIHVubGlrZSB0ZXJtcycpXG4gICAgY29uc3QgYyA9IHRoaXMuYyArIHRoYXQuY1xuICAgIGNvbnN0IHZzID0gdGhpcy52c1xuICAgIHJldHVybiBuZXcgTW9ub21pYWwoYywgdnMpXG4gIH1cblxuICBpbml0U3RyIChzdHIpIHtcbiAgICAvLyBjdXJyZW50bHkgbm8gZXJyb3IgY2hlY2tpbmcgYW5kIGZyYWdpbGVcbiAgICAvLyBUaGluZ3Mgbm90IHRvIHBhc3MgaW46XG4gICAgLy8gIHplcm8gaW5kaWNlc1xuICAgIC8vICBtdWx0aS1jaGFyYWN0ZXIgdmFyaWFibGVzXG4gICAgLy8gIG5lZ2F0aXZlIGluZGljZXNcbiAgICAvLyAgbm9uLWludGVnZXIgY29lZmZpY2llbnRzXG4gICAgY29uc3QgbGVhZCA9IHN0ci5tYXRjaCgvXi0/XFxkKi8pWzBdXG4gICAgY29uc3QgYyA9IGxlYWQgPT09ICcnID8gMVxuICAgICAgOiBsZWFkID09PSAnLScgPyAtMVxuICAgICAgICA6IHBhcnNlSW50KGxlYWQpXG4gICAgbGV0IHZzID0gc3RyLm1hdGNoKC8oW2EtekEtWl0pKFxcXlxcZCspPy9nKVxuICAgIGlmICghdnMpIHZzID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCB2ID0gdnNbaV0uc3BsaXQoJ14nKVxuICAgICAgdlsxXSA9IHZbMV0gPyBwYXJzZUludCh2WzFdKSA6IDFcbiAgICAgIHZzW2ldID0gdlxuICAgIH1cbiAgICB2cyA9IHZzLmZpbHRlcih2ID0+IHZbMV0gIT09IDApXG4gICAgdGhpcy5jID0gY1xuICAgIHRoaXMudnMgPSBuZXcgTWFwKHZzKVxuICB9XG5cbiAgc3RhdGljIHZhciAodikge1xuICAgIC8vIGZhY3RvcnkgZm9yIGEgc2luZ2xlIHZhcmlhYmxlIG1vbm9taWFsXG4gICAgY29uc3QgYyA9IDFcbiAgICBjb25zdCB2cyA9IG5ldyBNYXAoW1t2LCAxXV0pXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbChjLCB2cylcbiAgfVxufVxuIiwiaW1wb3J0IE1vbm9taWFsIGZyb20gJ01vbm9taWFsJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQb2x5bm9taWFsIHtcbiAgY29uc3RydWN0b3IgKHRlcm1zKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGVybXMpICYmICh0ZXJtc1swXSBpbnN0YW5jZW9mIE1vbm9taWFsKSkge1xuICAgICAgdGVybXMubWFwKHQgPT4gdC5jbG9uZSgpKVxuICAgICAgdGhpcy50ZXJtcyA9IHRlcm1zXG4gICAgfSBlbHNlIGlmICghaXNOYU4odGVybXMpKSB7XG4gICAgICB0aGlzLmluaXROdW0odGVybXMpXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGVybXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmluaXRTdHIodGVybXMpXG4gICAgfVxuICB9XG5cbiAgaW5pdFN0ciAoc3RyKSB7XG4gICAgc3RyID0gc3RyLnJlcGxhY2UoL1xcKy0vZywgJy0nKSAvLyBhIGhvcnJpYmxlIGJvZGdlXG4gICAgc3RyID0gc3RyLnJlcGxhY2UoLy0vZywgJystJykgLy8gbWFrZSBuZWdhdGl2ZSB0ZXJtcyBleHBsaWNpdC5cbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvXFxzL2csICcnKSAvLyBzdHJpcCB3aGl0ZXNwYWNlXG4gICAgdGhpcy50ZXJtcyA9IHN0ci5zcGxpdCgnKycpXG4gICAgICAubWFwKHMgPT4gbmV3IE1vbm9taWFsKHMpKVxuICAgICAgLmZpbHRlcih0ID0+IHQuYyAhPT0gMClcbiAgfVxuXG4gIGluaXROdW0gKG4pIHtcbiAgICB0aGlzLnRlcm1zID0gW25ldyBNb25vbWlhbChuKV1cbiAgfVxuXG4gIHRvTGF0ZXggKCkge1xuICAgIGxldCBzdHIgPSAnJ1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50ZXJtcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGkgPiAwICYmIHRoaXMudGVybXNbaV0uYyA+PSAwKSB7XG4gICAgICAgIHN0ciArPSAnKydcbiAgICAgIH1cbiAgICAgIHN0ciArPSB0aGlzLnRlcm1zW2ldLnRvTGF0ZXgoKVxuICAgIH1cbiAgICByZXR1cm4gc3RyXG4gIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuIHRoaXMudG9MYVRlWCgpXG4gIH1cblxuICBjbG9uZSAoKSB7XG4gICAgY29uc3QgdGVybXMgPSB0aGlzLnRlcm1zLm1hcCh0ID0+IHQuY2xvbmUoKSlcbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwodGVybXMpXG4gIH1cblxuICBzaW1wbGlmeSAoKSB7XG4gICAgLy8gY29sbGVjdHMgbGlrZSB0ZXJtcyBhbmQgcmVtb3ZlcyB6ZXJvIHRlcm1zXG4gICAgLy8gZG9lcyBub3QgbW9kaWZ5IG9yaWdpbmFsXG4gICAgLy8gVGhpcyBzZWVtcyBwcm9iYWJseSBpbmVmZmljaWVudCwgZ2l2ZW4gdGhlIGRhdGEgc3RydWN0dXJlXG4gICAgLy8gV291bGQgYmUgYmV0dGVyIHRvIHVzZSBzb21ldGhpbmcgbGlrZSBhIGxpbmtlZCBsaXN0IG1heWJlP1xuICAgIGNvbnN0IHRlcm1zID0gdGhpcy50ZXJtcy5zbGljZSgpXG4gICAgbGV0IG5ld3Rlcm1zID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRlcm1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIXRlcm1zW2ldKSBjb250aW51ZVxuICAgICAgbGV0IG5ld3Rlcm0gPSB0ZXJtc1tpXVxuICAgICAgZm9yIChsZXQgaiA9IGkgKyAxOyBqIDwgdGVybXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKCF0ZXJtc1tqXSkgY29udGludWVcbiAgICAgICAgaWYgKHRlcm1zW2pdLmxpa2UodGVybXNbaV0pKSB7XG4gICAgICAgICAgbmV3dGVybSA9IG5ld3Rlcm0uYWRkKHRlcm1zW2pdKVxuICAgICAgICAgIHRlcm1zW2pdID0gbnVsbFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBuZXd0ZXJtcy5wdXNoKG5ld3Rlcm0pXG4gICAgICB0ZXJtc1tpXSA9IG51bGxcbiAgICB9XG4gICAgbmV3dGVybXMgPSBuZXd0ZXJtcy5maWx0ZXIodCA9PiB0LmMgIT09IDApXG4gICAgcmV0dXJuIG5ldyBQb2x5bm9taWFsKG5ld3Rlcm1zKVxuICB9XG5cbiAgYWRkICh0aGF0LCBzaW1wbGlmeSkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBQb2x5bm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBQb2x5bm9taWFsKHRoYXQpXG4gICAgfVxuICAgIGlmIChzaW1wbGlmeSA9PT0gdW5kZWZpbmVkKSBzaW1wbGlmeSA9IHRydWVcbiAgICBjb25zdCB0ZXJtcyA9IHRoaXMudGVybXMuY29uY2F0KHRoYXQudGVybXMpXG4gICAgbGV0IHJlc3VsdCA9IG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuXG4gICAgaWYgKHNpbXBsaWZ5KSByZXN1bHQgPSByZXN1bHQuc2ltcGxpZnkoKVxuXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG5cbiAgbXVsICh0aGF0LCBzaW1wbGlmeSkge1xuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBQb2x5bm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBQb2x5bm9taWFsKHRoYXQpXG4gICAgfVxuICAgIGNvbnN0IHRlcm1zID0gW11cbiAgICBpZiAoc2ltcGxpZnkgPT09IHVuZGVmaW5lZCkgc2ltcGxpZnkgPSB0cnVlXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRlcm1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHRoYXQudGVybXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdGVybXMucHVzaCh0aGlzLnRlcm1zW2ldLm11bCh0aGF0LnRlcm1zW2pdKSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgcmVzdWx0ID0gbmV3IFBvbHlub21pYWwodGVybXMpXG4gICAgaWYgKHNpbXBsaWZ5KSByZXN1bHQgPSByZXN1bHQuc2ltcGxpZnkoKVxuXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG5cbiAgcG93IChuLCBzaW1wbGlmeSkge1xuICAgIGxldCByZXN1bHQgPSB0aGlzXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBuOyBpKyspIHtcbiAgICAgIHJlc3VsdCA9IHJlc3VsdC5tdWwodGhpcylcbiAgICB9XG4gICAgaWYgKHNpbXBsaWZ5KSByZXN1bHQgPSByZXN1bHQuc2ltcGxpZnkoKVxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIHN0YXRpYyB2YXIgKHYpIHtcbiAgICAvLyBmYWN0b3J5IGZvciBhIHNpbmdsZSB2YXJpYWJsZSBwb2x5bm9taWFsXG4gICAgY29uc3QgdGVybXMgPSBbTW9ub21pYWwudmFyKHYpXVxuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbCh0ZXJtcylcbiAgfVxuXG4gIHN0YXRpYyB4ICgpIHtcbiAgICByZXR1cm4gUG9seW5vbWlhbC52YXIoJ3gnKVxuICB9XG5cbiAgc3RhdGljIGNvbnN0IChuKSB7XG4gICAgcmV0dXJuIG5ldyBQb2x5bm9taWFsKG4pXG4gIH1cbn1cbiIsImltcG9ydCB7IEdyYXBoaWNRLCBHcmFwaGljUVZpZXcgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCBGcmFjdGlvbiBmcm9tICd2ZW5kb3IvZnJhY3Rpb24nXG5pbXBvcnQgUG9seW5vbWlhbCBmcm9tICdQb2x5bm9taWFsJ1xuaW1wb3J0IHsgcmFuZEVsZW0sIHJhbmRCZXR3ZWVuLCByYW5kQmV0d2VlbkZpbHRlciwgZ2NkIH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBcml0aG1hZ29uUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKSAvLyBwcm9jZXNzZXMgb3B0aW9ucyBpbnRvIHRoaXMuc2V0dGluZ3NcbiAgICB0aGlzLmRhdGEgPSBuZXcgQXJpdGhtYWdvblFEYXRhKHRoaXMuc2V0dGluZ3MpXG4gICAgdGhpcy52aWV3ID0gbmV3IEFyaXRobWFnb25RVmlldyh0aGlzLmRhdGEsIHRoaXMuc2V0dGluZ3MpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHsgcmV0dXJuICdDb21wbGV0ZSB0aGUgYXJpdGhtYWdvbjonIH1cbn1cblxuQXJpdGhtYWdvblEub3B0aW9uc1NwZWMgPSBbXG4gIHtcbiAgICB0aXRsZTogJ1ZlcnRpY2VzJyxcbiAgICBpZDogJ24nLFxuICAgIHR5cGU6ICdpbnQnLFxuICAgIG1pbjogMyxcbiAgICBtYXg6IDIwLFxuICAgIGRlZmF1bHQ6IDNcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVHlwZScsXG4gICAgaWQ6ICd0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ0ludGVnZXIgKCspJywgaWQ6ICdpbnRlZ2VyLWFkZCcgfSxcbiAgICAgIHsgdGl0bGU6ICdJbnRlZ2VyIChcXHUwMGQ3KScsIGlkOiAnaW50ZWdlci1tdWx0aXBseScgfSxcbiAgICAgIHsgdGl0bGU6ICdGcmFjdGlvbiAoKyknLCBpZDogJ2ZyYWN0aW9uLWFkZCcgfSxcbiAgICAgIHsgdGl0bGU6ICdGcmFjdGlvbiAoXFx1MDBkNyknLCBpZDogJ2ZyYWN0aW9uLW11bHRpcGx5JyB9LFxuICAgICAgeyB0aXRsZTogJ0FsZ2VicmEgKCspJywgaWQ6ICdhbGdlYnJhLWFkZCcgfSxcbiAgICAgIHsgdGl0bGU6ICdBbGdlYnJhIChcXHUwMGQ3KScsIGlkOiAnYWxnZWJyYS1tdWx0aXBseScgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogJ2ludGVnZXItYWRkJyxcbiAgICB2ZXJ0aWNhbDogdHJ1ZVxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdQdXp6bGUgdHlwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1leGNsdXNpdmUnLFxuICAgIGlkOiAncHV6X2RpZmYnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdNaXNzaW5nIGVkZ2VzJywgaWQ6ICcxJyB9LFxuICAgICAgeyB0aXRsZTogJ01peGVkJywgaWQ6ICcyJyB9LFxuICAgICAgeyB0aXRsZTogJ01pc3NpbmcgdmVydGljZXMnLCBpZDogJzMnIH1cbiAgICBdLFxuICAgIGRlZmF1bHQ6ICcxJ1xuICB9XG5dXG5cbmNsYXNzIEFyaXRobWFnb25RRGF0YSAvKiBleHRlbmRzIEdyYXBoaWNRRGF0YSAqLyB7XG4gIC8vIFRPRE8gc2ltcGxpZnkgY29uc3RydWN0b3IuIE1vdmUgbG9naWMgaW50byBzdGF0aWMgZmFjdG9yeSBtZXRob2RzXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgLy8gMS4gU2V0IHByb3BlcnRpZXMgZnJvbSBvcHRpb25zXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBuOiAzLCAvLyBudW1iZXIgb2YgdmVydGljZXNcbiAgICAgIG1pbjogLTIwLFxuICAgICAgbWF4OiAyMCxcbiAgICAgIG51bV9kaWZmOiAxLCAvLyBjb21wbGV4aXR5IG9mIHdoYXQncyBpbiB2ZXJ0aWNlcy9lZGdlc1xuICAgICAgcHV6X2RpZmY6IDEsIC8vIDEgLSBWZXJ0aWNlcyBnaXZlbiwgMiAtIHZlcnRpY2VzL2VkZ2VzOyBnaXZlbiAzIC0gb25seSBlZGdlc1xuICAgICAgdHlwZTogJ2ludGVnZXItYWRkJyAvLyBbdHlwZV0tW29wZXJhdGlvbl0gd2hlcmUgW3R5cGVdID0gaW50ZWdlciwgLi4uXG4gICAgICAvLyBhbmQgW29wZXJhdGlvbl0gPSBhZGQvbXVsdGlwbHlcbiAgICB9XG5cbiAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIHRoaXMuc2V0dGluZ3MsIG9wdGlvbnMpXG4gICAgdGhpcy5zZXR0aW5ncy5udW1fZGlmZiA9IHRoaXMuc2V0dGluZ3MuZGlmZmljdWx0eVxuICAgIHRoaXMuc2V0dGluZ3MucHV6X2RpZmYgPSBwYXJzZUludCh0aGlzLnNldHRpbmdzLnB1el9kaWZmKSAvLyEgPyBUaGlzIHNob3VsZCBoYXZlIGJlZW4gZG9uZSB1cHN0cmVhbS4uLlxuXG4gICAgdGhpcy5uID0gdGhpcy5zZXR0aW5ncy5uXG4gICAgdGhpcy52ZXJ0aWNlcyA9IFtdXG4gICAgdGhpcy5zaWRlcyA9IFtdXG5cbiAgICBpZiAodGhpcy5zZXR0aW5ncy50eXBlLmVuZHNXaXRoKCdhZGQnKSkge1xuICAgICAgdGhpcy5vcG5hbWUgPSAnKydcbiAgICAgIHRoaXMub3AgPSAoeCwgeSkgPT4geC5hZGQoeSlcbiAgICB9IGVsc2UgaWYgKHRoaXMuc2V0dGluZ3MudHlwZS5lbmRzV2l0aCgnbXVsdGlwbHknKSkge1xuICAgICAgdGhpcy5vcG5hbWUgPSAnXFx1MDBkNydcbiAgICAgIHRoaXMub3AgPSAoeCwgeSkgPT4geC5tdWwoeSlcbiAgICB9XG5cbiAgICAvLyAyLiBJbml0aWFsaXNlIGJhc2VkIG9uIHR5cGVcbiAgICBzd2l0Y2ggKHRoaXMuc2V0dGluZ3MudHlwZSkge1xuICAgICAgY2FzZSAnaW50ZWdlci1hZGQnOlxuICAgICAgY2FzZSAnaW50ZWdlci1tdWx0aXBseSc6XG4gICAgICAgIHRoaXMuaW5pdEludGVnZXIodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2ZyYWN0aW9uLWFkZCc6XG4gICAgICAgIHRoaXMuaW5pdEZyYWN0aW9uQWRkKHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdmcmFjdGlvbi1tdWx0aXBseSc6XG4gICAgICAgIHRoaXMuaW5pdEZyYWN0aW9uTXVsdGlwbHkodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2FsZ2VicmEtYWRkJzpcbiAgICAgICAgdGhpcy5pbml0QWxnZWJyYUFkZCh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnYWxnZWJyYS1tdWx0aXBseSc6XG4gICAgICAgIHRoaXMuaW5pdEFsZ2VicmFNdWx0aXBseSh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdGVkIHN3aXRjaCBkZWZhdWx0JylcbiAgICB9XG5cbiAgICB0aGlzLmNhbGN1bGF0ZUVkZ2VzKCkgLy8gVXNlIG9wIGZ1bmN0aW9ucyB0byBmaWxsIGluIHRoZSBlZGdlc1xuICAgIHRoaXMuaGlkZUxhYmVscyh0aGlzLnNldHRpbmdzLnB1el9kaWZmKSAvLyBzZXQgc29tZSB2ZXJ0aWNlcy9lZGdlcyBhcyBoaWRkZW4gZGVwZW5kaW5nIG9uIGRpZmZpY3VsdHlcbiAgfVxuXG4gIC8qIE1ldGhvZHMgaW5pdGlhbGlzaW5nIHZlcnRpY2VzICovXG5cbiAgaW5pdEludGVnZXIgKHNldHRpbmdzKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24ocmFuZEJldHdlZW5GaWx0ZXIoXG4gICAgICAgICAgc2V0dGluZ3MubWluLFxuICAgICAgICAgIHNldHRpbmdzLm1heCxcbiAgICAgICAgICB4ID0+IChzZXR0aW5ncy50eXBlLmVuZHNXaXRoKCdhZGQnKSB8fCB4ICE9PSAwKVxuICAgICAgICApKSxcbiAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRGcmFjdGlvbkFkZCAoc2V0dGluZ3MpIHtcbiAgICAvKiBEaWZmaWN1bHR5IHNldHRpbmdzOlxuICAgICAqIDE6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBzYW1lIGRlbm9taW5hdG9yLCBubyBjYW5jZWxsaW5nIGFmdGVyIERPTkVcbiAgICAgKiAyOiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggc2FtZSBkZW5vbWluYXRvciwgbm8gY2FuY2VsbGxpbmcgYW5zd2VyIGltcHJvcGVyIGZyYWN0aW9uXG4gICAgICogMzogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIG9uZSBkZW5vbWluYXRvciBhIG11bHRpcGxlIG9mIGFub3RoZXIsIGdpdmVzIHByb3BlciBmcmFjdGlvblxuICAgICAqIDQ6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBvbmUgZGVub21pbmF0b3IgYSBtdWx0aXBsZSBvZiBhbm90aGVyLCBnaXZlcyBpbXByb3BlciBmcmFjdGlvblxuICAgICAqIDU6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBkaWZmZXJlbnQgZGVub21pbmF0b3JzIChub3QgY28tcHJpbWUpLCBnaXZlcyBpbXByb3BlciBmcmFjdGlvblxuICAgICAqIDY6IG1peGVkIG51bWJlcnNcbiAgICAgKiA3OiBtaXhlZCBudW1iZXJzLCBiaWdnZXIgbnVtZXJhdG9ycyBhbmQgZGVub21pbmF0b3JzXG4gICAgICogODogbWl4ZWQgbnVtYmVycywgYmlnIGludGVnZXIgcGFydHNcbiAgICAgKi9cblxuICAgIC8vIFRPRE8gLSBhbnl0aGluZyBvdGhlciB0aGFuIGRpZmZpY3VsdHkgMS5cbiAgICBjb25zdCBkaWZmID0gc2V0dGluZ3MubnVtX2RpZmZcbiAgICBpZiAoZGlmZiA8IDMpIHtcbiAgICAgIGNvbnN0IGRlbiA9IHJhbmRFbGVtKFs1LCA3LCA5LCAxMSwgMTMsIDE3XSlcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgY29uc3QgcHJldm51bSA9IHRoaXMudmVydGljZXNbaSAtIDFdXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzW2kgLSAxXS52YWwubiA6IHVuZGVmaW5lZFxuICAgICAgICBjb25zdCBuZXh0bnVtID0gdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXVxuICAgICAgICAgID8gdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXS52YWwubiA6IHVuZGVmaW5lZFxuXG4gICAgICAgIGNvbnN0IG1heG51bSA9XG4gICAgICAgICAgZGlmZiA9PT0gMiA/IGRlbiAtIDFcbiAgICAgICAgICAgIDogbmV4dG51bSA/IGRlbiAtIE1hdGgubWF4KG5leHRudW0sIHByZXZudW0pXG4gICAgICAgICAgICAgIDogcHJldm51bSA/IGRlbiAtIHByZXZudW1cbiAgICAgICAgICAgICAgICA6IGRlbiAtIDFcblxuICAgICAgICBjb25zdCBudW0gPSByYW5kQmV0d2VlbkZpbHRlcigxLCBtYXhudW0sIHggPT4gKFxuICAgICAgICAgIC8vIEVuc3VyZXMgbm8gc2ltcGxpZmluZyBhZnRlcndhcmRzIGlmIGRpZmZpY3VsdHkgaXMgMVxuICAgICAgICAgIGdjZCh4LCBkZW4pID09PSAxICYmXG4gICAgICAgICAgKCFwcmV2bnVtIHx8IGdjZCh4ICsgcHJldm51bSwgZGVuKSA9PT0gMSB8fCB4ICsgcHJldm51bSA9PT0gZGVuKSAmJlxuICAgICAgICAgICghbmV4dG51bSB8fCBnY2QoeCArIG5leHRudW0sIGRlbikgPT09IDEgfHwgeCArIG5leHRudW0gPT09IGRlbilcbiAgICAgICAgKSlcblxuICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgIHZhbDogbmV3IEZyYWN0aW9uKG51bSwgZGVuKSxcbiAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZGVuYmFzZSA9IHJhbmRFbGVtKFxuICAgICAgICBkaWZmIDwgNyA/IFsyLCAzLCA1XSA6IFsyLCAzLCA0LCA1LCA2LCA3LCA4LCA5LCAxMCwgMTFdXG4gICAgICApXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHByZXYgPSB0aGlzLnZlcnRpY2VzW2kgLSAxXVxuICAgICAgICAgID8gdGhpcy52ZXJ0aWNlc1tpIC0gMV0udmFsIDogdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dLnZhbCA6IHVuZGVmaW5lZFxuXG4gICAgICAgIGNvbnN0IG1heG11bHRpcGxpZXIgPSBkaWZmIDwgNyA/IDQgOiA4XG5cbiAgICAgICAgY29uc3QgbXVsdGlwbGllciA9XG4gICAgICAgICAgaSAlIDIgPT09IDEgfHwgZGlmZiA+IDQgPyByYW5kQmV0d2VlbkZpbHRlcigyLCBtYXhtdWx0aXBsaWVyLCB4ID0+XG4gICAgICAgICAgICAoIXByZXYgfHwgeCAhPT0gcHJldi5kIC8gZGVuYmFzZSkgJiZcbiAgICAgICAgICAgICghbmV4dCB8fCB4ICE9PSBuZXh0LmQgLyBkZW5iYXNlKVxuICAgICAgICAgICkgOiAxXG5cbiAgICAgICAgY29uc3QgZGVuID0gZGVuYmFzZSAqIG11bHRpcGxpZXJcblxuICAgICAgICBsZXQgbnVtXG4gICAgICAgIGlmIChkaWZmIDwgNikge1xuICAgICAgICAgIG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKDEsIGRlbiAtIDEsIHggPT4gKFxuICAgICAgICAgICAgZ2NkKHgsIGRlbikgPT09IDEgJiZcbiAgICAgICAgICAgIChkaWZmID49IDQgfHwgIXByZXYgfHwgcHJldi5hZGQoeCwgZGVuKSA8PSAxKSAmJlxuICAgICAgICAgICAgKGRpZmYgPj0gNCB8fCAhbmV4dCB8fCBuZXh0LmFkZCh4LCBkZW4pIDw9IDEpXG4gICAgICAgICAgKSlcbiAgICAgICAgfSBlbHNlIGlmIChkaWZmIDwgOCkge1xuICAgICAgICAgIG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKGRlbiArIDEsIGRlbiAqIDYsIHggPT4gZ2NkKHgsIGRlbikgPT09IDEpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoZGVuICogMTAsIGRlbiAqIDEwMCwgeCA9PiBnY2QoeCwgZGVuKSA9PT0gMSlcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24obnVtLCBkZW4pLFxuICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRGcmFjdGlvbk11bHRpcGx5IChzZXR0aW5ncykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIGNvbnN0IGQgPSByYW5kQmV0d2VlbigyLCAxMClcbiAgICAgIGNvbnN0IG4gPSByYW5kQmV0d2VlbigxLCBkIC0gMSlcbiAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgIHZhbDogbmV3IEZyYWN0aW9uKG4sIGQpLFxuICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEFsZ2VicmFBZGQgKHNldHRpbmdzKSB7XG4gICAgY29uc3QgZGlmZiA9IHNldHRpbmdzLm51bV9kaWZmXG4gICAgc3dpdGNoIChkaWZmKSB7XG4gICAgICBjYXNlIDE6IHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmICsgdmFyaWFibGUpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOlxuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSA8IDAuNSkgeyAvLyB2YXJpYWJsZSArIGNvbnN0YW50XG4gICAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IGNvbnN0YW50ID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2YXJpYWJsZSArICcrJyArIGNvbnN0YW50KSxcbiAgICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZTEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICAgIGxldCB2YXJpYWJsZTIgPSB2YXJpYWJsZTFcbiAgICAgICAgICB3aGlsZSAodmFyaWFibGUyID09PSB2YXJpYWJsZTEpIHtcbiAgICAgICAgICAgIHZhcmlhYmxlMiA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgICAgY29uc3QgY29lZmYxID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IGNvZWZmMiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmMSArIHZhcmlhYmxlMSArICcrJyArIGNvZWZmMiArIHZhcmlhYmxlMiksXG4gICAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0QWxnZWJyYU11bHRpcGx5IChzZXR0aW5ncykge1xuICAgIC8qIERpZmZpY3VsdHk6XG4gICAgICogMTogQWx0ZXJuYXRlIDNhIHdpdGggNFxuICAgICAqIDI6IEFsbCB0ZXJtcyBvZiB0aGUgZm9ybSBudiAtIHVwIHRvIHR3byB2YXJpYWJsZXNcbiAgICAgKiAzOiBBbGwgdGVybXMgb2YgdGhlIGZvcm0gbnZebS4gT25lIHZhcmlhYmxlIG9ubHlcbiAgICAgKiA0OiBBTGwgdGVybXMgb2YgdGhlIGZvcm0gbnheayB5Xmwgel5wLiBrLGwscCAwLTNcbiAgICAgKiA1OiBFeHBhbmQgYnJhY2tldHMgMygyeCs1KVxuICAgICAqIDY6IEV4cGFuZCBicmFja2V0cyAzeCgyeCs1KVxuICAgICAqIDc6IEV4cGFuZCBicmFja2V0cyAzeF4yeSgyeHkrNXleMilcbiAgICAgKiA4OiBFeHBhbmQgYnJhY2tldHMgKHgrMykoeCsyKVxuICAgICAqIDk6IEV4cGFuZCBicmFja2V0cyAoMngtMykoM3grNClcbiAgICAgKiAxMDogRXhwYW5kIGJyYWNrZXRzICgyeF4yLTN4KzQpKDJ4LTUpXG4gICAgICovXG4gICAgY29uc3QgZGlmZiA9IHNldHRpbmdzLm51bV9kaWZmXG4gICAgc3dpdGNoIChkaWZmKSB7XG4gICAgICBjYXNlIDE6XG4gICAgICB7XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCB0ZXJtID0gaSAlIDIgPT09IDAgPyBjb2VmZiA6IGNvZWZmICsgdmFyaWFibGVcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh0ZXJtKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSAyOiB7XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlMSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGNvbnN0IHZhcmlhYmxlMiA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgdmFyaWFibGUgPSByYW5kRWxlbShbdmFyaWFibGUxLCB2YXJpYWJsZTJdKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmICsgdmFyaWFibGUpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDM6IHtcbiAgICAgICAgY29uc3QgdiA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgaWR4ID0gcmFuZEJldHdlZW4oMSwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmICsgdiArICdeJyArIGlkeCksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgNDoge1xuICAgICAgICBjb25zdCBzdGFydEFzY2lpID0gcmFuZEJldHdlZW4oOTcsIDEyMClcbiAgICAgICAgY29uc3QgdjEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkpXG4gICAgICAgIGNvbnN0IHYyID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpICsgMSlcbiAgICAgICAgY29uc3QgdjMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkgKyAyKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjEgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjIgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjMgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgdGVybSA9IGEgKyB2MSArIG4xICsgdjIgKyBuMiArIHYzICsgbjNcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh0ZXJtKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSA1OlxuICAgICAgY2FzZSA2OiB7IC8vIGUuZy4gMyh4KSAqICgyeC01KVxuICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgY29uc3RhbnQgPSByYW5kQmV0d2VlbigtOSwgOSkudG9TdHJpbmcoKVxuICAgICAgICAgIGxldCB0ZXJtID0gY29lZmZcbiAgICAgICAgICBpZiAoZGlmZiA9PT0gNiB8fCBpICUgMiA9PT0gMSkgdGVybSArPSB2YXJpYWJsZVxuICAgICAgICAgIGlmIChpICUgMiA9PT0gMSkgdGVybSArPSAnKycgKyBjb25zdGFudFxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDc6IHsgLy8gZS5nLiAzeF4yeSg0eHleMis1eHkpXG4gICAgICAgIGNvbnN0IHN0YXJ0QXNjaWkgPSByYW5kQmV0d2Vlbig5NywgMTIwKVxuICAgICAgICBjb25zdCB2MSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSlcbiAgICAgICAgY29uc3QgdjIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkgKyAxKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgYTEgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4xMSA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMTIgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgbGV0IHRlcm0gPSBhMSArIHYxICsgbjExICsgdjIgKyBuMTJcbiAgICAgICAgICBpZiAoaSAlIDIgPT09IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGEyID0gcmFuZEJldHdlZW4oLTksIDkpLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IG4yMSA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IG4yMiA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICAgIHRlcm0gKz0gJysnICsgYTIgKyB2MSArIG4yMSArIHYyICsgbjIyXG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDg6IC8vIHsgZS5nLiAoeCs1KSAqICh4LTIpXG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvbnN0YW50ID0gcmFuZEJldHdlZW4oLTksIDkpLnRvU3RyaW5nKClcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh2YXJpYWJsZSArICcrJyArIGNvbnN0YW50KSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiBNZXRob2QgdG8gY2FsY3VsYXRlIGVkZ2VzIGZyb20gdmVydGljZXMgKi9cbiAgY2FsY3VsYXRlRWRnZXMgKCkge1xuICAgIC8vIENhbGN1bGF0ZSB0aGUgZWRnZXMgZ2l2ZW4gdGhlIHZlcnRpY2VzIHVzaW5nIHRoaXMub3BcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICB0aGlzLnNpZGVzW2ldID0ge1xuICAgICAgICB2YWw6IHRoaXMub3AodGhpcy52ZXJ0aWNlc1tpXS52YWwsIHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl0udmFsKSxcbiAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qIE1hcmsgaGlkZGVuZCBlZGdlcy92ZXJ0aWNlcyAqL1xuXG4gIGhpZGVMYWJlbHMgKHB1enpsZURpZmZpY3VsdHkpIHtcbiAgICAvLyBIaWRlIHNvbWUgbGFiZWxzIHRvIG1ha2UgYSBwdXp6bGVcbiAgICAvLyAxIC0gU2lkZXMgaGlkZGVuLCB2ZXJ0aWNlcyBzaG93blxuICAgIC8vIDIgLSBTb21lIHNpZGVzIGhpZGRlbiwgc29tZSB2ZXJ0aWNlcyBoaWRkZW5cbiAgICAvLyAzIC0gQWxsIHZlcnRpY2VzIGhpZGRlblxuICAgIHN3aXRjaCAocHV6emxlRGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICB0aGlzLnNpZGVzLmZvckVhY2goeCA9PiB7IHguaGlkZGVuID0gdHJ1ZSB9KVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOiB7XG4gICAgICAgIHRoaXMuc2lkZXMuZm9yRWFjaCh4ID0+IHsgeC5oaWRkZW4gPSB0cnVlIH0pXG4gICAgICAgIGNvbnN0IHNob3dzaWRlID0gcmFuZEJldHdlZW4oMCwgdGhpcy5uIC0gMSwgTWF0aC5yYW5kb20pXG4gICAgICAgIGNvbnN0IGhpZGV2ZXJ0ID0gTWF0aC5yYW5kb20oKSA8IDAuNVxuICAgICAgICAgID8gc2hvd3NpZGUgLy8gcHJldmlvdXMgdmVydGV4XG4gICAgICAgICAgOiAoc2hvd3NpZGUgKyAxKSAlIHRoaXMubiAvLyBuZXh0IHZlcnRleDtcblxuICAgICAgICB0aGlzLnNpZGVzW3Nob3dzaWRlXS5oaWRkZW4gPSBmYWxzZVxuICAgICAgICB0aGlzLnZlcnRpY2VzW2hpZGV2ZXJ0XS5oaWRkZW4gPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlIDM6XG4gICAgICAgIHRoaXMudmVydGljZXMuZm9yRWFjaCh4ID0+IHsgeC5oaWRkZW4gPSB0cnVlIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vX2RpZmZpY3VsdHknKVxuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBBcml0aG1hZ29uUVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICBjb25zdHJ1Y3RvciAoZGF0YSwgb3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIHNldHMgdGhpcy53aWR0aCB0aGlzLmhlaWdodCwgaW5pdGlhbGlzZXMgdGhpcy5sYWJlbHMsIGNyZWF0ZXMgZG9tIGVsZW1lbnRzXG5cbiAgICBjb25zdCB3aWR0aCA9IHRoaXMud2lkdGhcbiAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmhlaWdodFxuICAgIGNvbnN0IHIgPSAwLjM1ICogTWF0aC5taW4od2lkdGgsIGhlaWdodCkgLy8gcmFkaXVzXG4gICAgY29uc3QgbiA9IHRoaXMuZGF0YS5uXG5cbiAgICAvLyBBIHBvaW50IHRvIGxhYmVsIHdpdGggdGhlIG9wZXJhdGlvblxuICAgIC8vIEFsbCBwb2ludHMgZmlyc3Qgc2V0IHVwIHdpdGggKDAsMCkgYXQgY2VudGVyXG4gICAgdGhpcy5vcGVyYXRpb25Qb2ludCA9IG5ldyBQb2ludCgwLCAwKVxuXG4gICAgLy8gUG9zaXRpb24gb2YgdmVydGljZXNcbiAgICB0aGlzLnZlcnRleFBvaW50cyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIGNvbnN0IGFuZ2xlID0gaSAqIE1hdGguUEkgKiAyIC8gbiAtIE1hdGguUEkgLyAyXG4gICAgICB0aGlzLnZlcnRleFBvaW50c1tpXSA9IFBvaW50LmZyb21Qb2xhcihyLCBhbmdsZSlcbiAgICB9XG5cbiAgICAvLyBQb2lzaXRpb24gb2Ygc2lkZSBsYWJlbHNcbiAgICB0aGlzLnNpZGVQb2ludHMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICB0aGlzLnNpZGVQb2ludHNbaV0gPSBQb2ludC5tZWFuKHRoaXMudmVydGV4UG9pbnRzW2ldLCB0aGlzLnZlcnRleFBvaW50c1soaSArIDEpICUgbl0pXG4gICAgfVxuXG4gICAgdGhpcy5hbGxQb2ludHMgPSBbdGhpcy5vcGVyYXRpb25Qb2ludF0uY29uY2F0KHRoaXMudmVydGV4UG9pbnRzKS5jb25jYXQodGhpcy5zaWRlUG9pbnRzKVxuXG4gICAgdGhpcy5yZUNlbnRlcigpIC8vIFJlcG9zaXRpb24gZXZlcnl0aGluZyBwcm9wZXJseVxuXG4gICAgdGhpcy5tYWtlTGFiZWxzKHRydWUpXG5cbiAgICAvLyBEcmF3IGludG8gY2FudmFzXG4gIH1cblxuICByZUNlbnRlciAoKSB7XG4gICAgLy8gRmluZCB0aGUgY2VudGVyIG9mIHRoZSBib3VuZGluZyBib3hcbiAgICBjb25zdCB0b3BsZWZ0ID0gUG9pbnQubWluKHRoaXMuYWxsUG9pbnRzKVxuICAgIGNvbnN0IGJvdHRvbXJpZ2h0ID0gUG9pbnQubWF4KHRoaXMuYWxsUG9pbnRzKVxuICAgIGNvbnN0IGNlbnRlciA9IFBvaW50Lm1lYW4odG9wbGVmdCwgYm90dG9tcmlnaHQpXG5cbiAgICAvLyB0cmFuc2xhdGUgdG8gcHV0IGluIHRoZSBjZW50ZXJcbiAgICB0aGlzLmFsbFBvaW50cy5mb3JFYWNoKHAgPT4ge1xuICAgICAgcC50cmFuc2xhdGUodGhpcy53aWR0aCAvIDIgLSBjZW50ZXIueCwgdGhpcy5oZWlnaHQgLyAyIC0gY2VudGVyLnkpXG4gICAgfSlcbiAgfVxuXG4gIG1ha2VMYWJlbHMgKCkge1xuICAgIC8vIHZlcnRpY2VzXG4gICAgdGhpcy5kYXRhLnZlcnRpY2VzLmZvckVhY2goKHYsIGkpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gdi52YWwudG9MYXRleFxuICAgICAgICA/IHYudmFsLnRvTGF0ZXgodHJ1ZSlcbiAgICAgICAgOiB2LnZhbC50b1N0cmluZygpXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKHtcbiAgICAgICAgcG9zOiB0aGlzLnZlcnRleFBvaW50c1tpXSxcbiAgICAgICAgdGV4dHE6IHYuaGlkZGVuID8gJycgOiB2YWx1ZSxcbiAgICAgICAgdGV4dGE6IHZhbHVlLFxuICAgICAgICBzdHlsZXE6ICdub3JtYWwgdmVydGV4JyxcbiAgICAgICAgc3R5bGVhOiB2LmhpZGRlbiA/ICdhbnN3ZXIgdmVydGV4JyA6ICdub3JtYWwgdmVydGV4J1xuICAgICAgfSlcbiAgICB9KVxuXG4gICAgLy8gc2lkZXNcbiAgICB0aGlzLmRhdGEuc2lkZXMuZm9yRWFjaCgodiwgaSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSB2LnZhbC50b0xhdGV4XG4gICAgICAgID8gdi52YWwudG9MYXRleCh0cnVlKVxuICAgICAgICA6IHYudmFsLnRvU3RyaW5nKClcbiAgICAgIHRoaXMubGFiZWxzLnB1c2goe1xuICAgICAgICBwb3M6IHRoaXMuc2lkZVBvaW50c1tpXSxcbiAgICAgICAgdGV4dHE6IHYuaGlkZGVuID8gJycgOiB2YWx1ZSxcbiAgICAgICAgdGV4dGE6IHZhbHVlLFxuICAgICAgICBzdHlsZXE6ICdub3JtYWwgc2lkZScsXG4gICAgICAgIHN0eWxlYTogdi5oaWRkZW4gPyAnYW5zd2VyIHNpZGUnIDogJ25vcm1hbCBzaWRlJ1xuICAgICAgfSlcbiAgICB9KVxuXG4gICAgLy8gb3BlcmF0aW9uXG4gICAgdGhpcy5sYWJlbHMucHVzaCh7XG4gICAgICBwb3M6IHRoaXMub3BlcmF0aW9uUG9pbnQsXG4gICAgICB0ZXh0cTogdGhpcy5kYXRhLm9wbmFtZSxcbiAgICAgIHRleHRhOiB0aGlzLmRhdGEub3BuYW1lLFxuICAgICAgc3R5bGVxOiAnbm9ybWFsJyxcbiAgICAgIHN0eWxlYTogJ25vcm1hbCdcbiAgICB9KVxuXG4gICAgLy8gc3R5bGluZ1xuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRxXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZXFcbiAgICB9KVxuICB9XG5cbiAgcmVuZGVyICgpIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG4gICAgY29uc3QgbiA9IHRoaXMuZGF0YS5uXG5cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpIC8vIGNsZWFyXG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgY29uc3QgcCA9IHRoaXMudmVydGV4UG9pbnRzW2ldXG4gICAgICBjb25zdCBuZXh0ID0gdGhpcy52ZXJ0ZXhQb2ludHNbKGkgKyAxKSAlIG5dXG4gICAgICBjdHgubW92ZVRvKHAueCwgcC55KVxuICAgICAgY3R4LmxpbmVUbyhuZXh0LngsIG5leHQueSlcbiAgICB9XG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICAvLyBwbGFjZSBsYWJlbHNcbiAgICB0aGlzLnJlbmRlckxhYmVscyh0cnVlKVxuICB9XG5cbiAgc2hvd0Fuc3dlciAoKSB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dGFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlYVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHModHJ1ZSlcbiAgICB0aGlzLmFuc3dlcmVkID0gdHJ1ZVxuICB9XG5cbiAgaGlkZUFuc3dlciAoKSB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHModHJ1ZSlcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxufVxuIiwiaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRlc3RRIGV4dGVuZHMgVGV4dFEge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDUsXG4gICAgICBsYWJlbDogJ2EnLFxuICAgICAgdGVzdDE6IFsnZm9vJ10sXG4gICAgICB0ZXN0MjogdHJ1ZVxuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyBwaWNrIGEgcmFuZG9tIG9uZSBvZiB0aGUgc2VsZWN0ZWRcbiAgICBsZXQgdGVzdDFcbiAgICBpZiAoc2V0dGluZ3MudGVzdDEubGVuZ3RoID09PSAwKSB7XG4gICAgICB0ZXN0MSA9ICdub25lJ1xuICAgIH0gZWxzZSB7XG4gICAgICB0ZXN0MSA9IHJhbmRFbGVtKHNldHRpbmdzLnRlc3QxKVxuICAgIH1cblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICdkOiAnICsgc2V0dGluZ3MuZGlmZmljdWx0eSArICdcXFxcXFxcXCB0ZXN0MTogJyArIHRlc3QxXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICd0ZXN0MjogJyArIHNldHRpbmdzLnRlc3QyXG5cbiAgICB0aGlzLnJlbmRlcigpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHsgcmV0dXJuICdUZXN0IGNvbW1hbmQgd29yZCcgfVxufVxuXG5UZXN0US5vcHRpb25zU3BlYyA9IFtcbiAge1xuICAgIHRpdGxlOiAnVGVzdCBvcHRpb24gMScsXG4gICAgaWQ6ICd0ZXN0MScsXG4gICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFsnZm9vJywgJ2JhcicsICd3aXp6J10sXG4gICAgZGVmYXVsdDogW11cbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVGVzdCBvcHRpb24gMicsXG4gICAgaWQ6ICd0ZXN0MicsXG4gICAgdHlwZTogJ2Jvb2wnLFxuICAgIGRlZmF1bHQ6IHRydWVcbiAgfVxuXVxuIiwiaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFkZEFaZXJvIGV4dGVuZHMgVGV4dFEge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDUsXG4gICAgICBsYWJlbDogJ2EnXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICB0aGlzLmxhYmVsID0gc2V0dGluZ3MubGFiZWxcblxuICAgIC8vIHJhbmRvbSAyIGRpZ2l0ICdkZWNpbWFsJ1xuICAgIGNvbnN0IHEgPSBTdHJpbmcocmFuZEJldHdlZW4oMSwgOSkpICsgU3RyaW5nKHJhbmRCZXR3ZWVuKDAsIDkpKSArICcuJyArIFN0cmluZyhyYW5kQmV0d2VlbigwLCA5KSlcbiAgICBjb25zdCBhID0gcSArICcwJ1xuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gcSArICdcXFxcdGltZXMgMTAnXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICc9ICcgKyBhXG5cbiAgICB0aGlzLnJlbmRlcigpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ0V2YWx1YXRlJ1xuICB9XG59XG5cbkFkZEFaZXJvLm9wdGlvbnNTcGVjID0gW1xuXVxuIiwiaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgVGV4dFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGV4dFEnXG5pbXBvcnQgRnJhY3Rpb24gZnJvbSAndmVuZG9yL2ZyYWN0aW9uJ1xuXG4vKiBNYWluIHF1ZXN0aW9uIGNsYXNzLiBUaGlzIHdpbGwgYmUgc3B1biBvZmYgaW50byBkaWZmZXJlbnQgZmlsZSBhbmQgZ2VuZXJhbGlzZWQgKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEVxdWF0aW9uT2ZMaW5lIGV4dGVuZHMgVGV4dFEge1xuICAvLyAnZXh0ZW5kcycgUXVlc3Rpb24sIGJ1dCBub3RoaW5nIHRvIGFjdHVhbGx5IGV4dGVuZFxuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIC8vIGJvaWxlcnBsYXRlXG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogMlxuICAgIH1cblxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG4gICAgY29uc3QgZGlmZmljdWx0eSA9IE1hdGguY2VpbChzZXR0aW5ncy5kaWZmaWN1bHR5IC8gMikgLy8gaW5pdGlhbGx5IHdyaXR0ZW4gZm9yIGRpZmZpY3VsdHkgMS00LCBub3cgbmVlZCAxLTEwXG5cbiAgICAvLyBxdWVzdGlvbiBnZW5lcmF0aW9uIGJlZ2lucyBoZXJlXG4gICAgbGV0IG0sIGMsIHgxLCB5MSwgeDIsIHkyXG4gICAgbGV0IG1pbm0sIG1heG0sIG1pbmMsIG1heGNcblxuICAgIHN3aXRjaCAoZGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOiAvLyBtPjAsIGM+PTBcbiAgICAgIGNhc2UgMjpcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgbWlubSA9IGRpZmZpY3VsdHkgPCAzID8gMSA6IC01XG4gICAgICAgIG1heG0gPSA1XG4gICAgICAgIG1pbmMgPSBkaWZmaWN1bHR5IDwgMiA/IDAgOiAtMTBcbiAgICAgICAgbWF4YyA9IDEwXG4gICAgICAgIG0gPSByYW5kQmV0d2VlbihtaW5tLCBtYXhtKVxuICAgICAgICBjID0gcmFuZEJldHdlZW4obWluYywgbWF4YylcbiAgICAgICAgeDEgPSBkaWZmaWN1bHR5IDwgMyA/IHJhbmRCZXR3ZWVuKDAsIDEwKSA6IHJhbmRCZXR3ZWVuKC0xNSwgMTUpXG4gICAgICAgIHkxID0gbSAqIHgxICsgY1xuXG4gICAgICAgIGlmIChkaWZmaWN1bHR5IDwgMykge1xuICAgICAgICAgIHgyID0gcmFuZEJldHdlZW4oeDEgKyAxLCAxNSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB4MiA9IHgxXG4gICAgICAgICAgd2hpbGUgKHgyID09PSB4MSkgeyB4MiA9IHJhbmRCZXR3ZWVuKC0xNSwgMTUpIH07XG4gICAgICAgIH1cbiAgICAgICAgeTIgPSBtICogeDIgKyBjXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ6IC8vIG0gZnJhY3Rpb24sIHBvaW50cyBhcmUgaW50ZWdlcnNcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgY29uc3QgbWQgPSByYW5kQmV0d2VlbigxLCA1KVxuICAgICAgICBjb25zdCBtbiA9IHJhbmRCZXR3ZWVuKC01LCA1KVxuICAgICAgICBtID0gbmV3IEZyYWN0aW9uKG1uLCBtZClcbiAgICAgICAgeDEgPSBuZXcgRnJhY3Rpb24ocmFuZEJldHdlZW4oLTEwLCAxMCkpXG4gICAgICAgIHkxID0gbmV3IEZyYWN0aW9uKHJhbmRCZXR3ZWVuKC0xMCwgMTApKVxuICAgICAgICBjID0gbmV3IEZyYWN0aW9uKHkxKS5zdWIobS5tdWwoeDEpKVxuICAgICAgICB4MiA9IHgxLmFkZChyYW5kQmV0d2VlbigxLCA1KSAqIG0uZClcbiAgICAgICAgeTIgPSBtLm11bCh4MikuYWRkKGMpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgeHN0ciA9XG4gICAgICAobSA9PT0gMCB8fCAobS5lcXVhbHMgJiYgbS5lcXVhbHMoMCkpKSA/ICcnXG4gICAgICAgIDogKG0gPT09IDEgfHwgKG0uZXF1YWxzICYmIG0uZXF1YWxzKDEpKSkgPyAneCdcbiAgICAgICAgICA6IChtID09PSAtMSB8fCAobS5lcXVhbHMgJiYgbS5lcXVhbHMoLTEpKSkgPyAnLXgnXG4gICAgICAgICAgICA6IChtLnRvTGF0ZXgpID8gbS50b0xhdGV4KCkgKyAneCdcbiAgICAgICAgICAgICAgOiAobSArICd4JylcblxuICAgIGNvbnN0IGNvbnN0c3RyID0gLy8gVE9ETzogV2hlbiBtPWM9MFxuICAgICAgKGMgPT09IDAgfHwgKGMuZXF1YWxzICYmIGMuZXF1YWxzKDApKSkgPyAnJ1xuICAgICAgICA6IChjIDwgMCkgPyAoJyAtICcgKyAoYy5uZWcgPyBjLm5lZygpLnRvTGF0ZXgoKSA6IC1jKSlcbiAgICAgICAgICA6IChjLnRvTGF0ZXgpID8gKCcgKyAnICsgYy50b0xhdGV4KCkpXG4gICAgICAgICAgICA6ICgnICsgJyArIGMpXG5cbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnKCcgKyB4MSArICcsICcgKyB5MSArICcpXFxcXHRleHR7IGFuZCB9KCcgKyB4MiArICcsICcgKyB5MiArICcpJ1xuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAneSA9ICcgKyB4c3RyICsgY29uc3RzdHJcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRmluZCB0aGUgZXF1YXRpb24gb2YgdGhlIGxpbmUgdGhyb3VnaCdcbiAgfVxufVxuIiwiLyogUmVuZGVycyBtaXNzaW5nIGFuZ2xlcyBwcm9ibGVtIHdoZW4gdGhlIGFuZ2xlcyBhcmUgYXQgYSBwb2ludFxuICogSS5lLiBvbiBhIHN0cmFpZ2h0IGxpbmUgb3IgYXJvdW5kIGEgcG9pbnRcbiAqIENvdWxkIGFsc28gYmUgYWRhcHRlZCB0byBhbmdsZXMgZm9ybWluZyBhIHJpZ2h0IGFuZ2xlXG4gKlxuICogU2hvdWxkIGJlIGZsZXhpYmxlIGVub3VnaCBmb3IgbnVtZXJpY2FsIHByb2JsZW1zIG9yIGFsZ2VicmFpYyBvbmVzXG4gKlxuICovXG5cbmltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IEdyYXBoaWNRVmlldyB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIC8vIHRoaXMuT1xuICAvLyB0aGlzLkFcbiAgLy8gdGhpcy5DID0gW11cbiAgLy8gdGhpcy5sYWJlbHMgPSBbXVxuICAvLyB0aGlzLmNhbnZhc1xuICAvLyB0aGlzLkRPTVxuICAvLyB0aGlzLnJvdGF0aW9uXG4gIGNvbnN0cnVjdG9yIChkYXRhLCBvcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc2V0cyB0aGlzLndpZHRoIHRoaXMuaGVpZ2h0LCBpbml0aWFsaXNlcyB0aGlzLmxhYmVscywgY3JlYXRlcyBkb20gZWxlbWVudHNcbiAgICBjb25zdCB3aWR0aCA9IHRoaXMud2lkdGhcbiAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmhlaWdodFxuICAgIGNvbnN0IHJhZGl1cyA9IHRoaXMucmFkaXVzID0gTWF0aC5taW4od2lkdGgsIGhlaWdodCkgLyAyLjVcblxuICAgIC8vIFNldCB1cCBtYWluIHBvaW50c1xuICAgIHRoaXMuTyA9IG5ldyBQb2ludCgwLCAwKSAvLyBjZW50ZXIgcG9pbnRcbiAgICB0aGlzLkEgPSBuZXcgUG9pbnQocmFkaXVzLCAwKSAvLyBmaXJzdCBwb2ludFxuICAgIHRoaXMuQyA9IFtdIC8vIFBvaW50cyBhcm91bmQgb3V0c2lkZVxuICAgIGxldCB0b3RhbGFuZ2xlID0gMCAvLyBuYiBpbiByYWRpYW5zXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmRhdGEuYW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0b3RhbGFuZ2xlICs9IHRoaXMuZGF0YS5hbmdsZXNbaV0gKiBNYXRoLlBJIC8gMTgwXG4gICAgICB0aGlzLkNbaV0gPSBQb2ludC5mcm9tUG9sYXIocmFkaXVzLCB0b3RhbGFuZ2xlKVxuICAgIH1cblxuICAgIC8vIFNldCB1cCBsYWJlbHNcbiAgICB0b3RhbGFuZ2xlID0gMFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5kYXRhLmFuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgdGhldGEgPSB0aGlzLmRhdGEuYW5nbGVzW2ldXG4gICAgICB0aGlzLmxhYmVsc1tpXSA9IHtcbiAgICAgICAgcG9zOiBQb2ludC5mcm9tUG9sYXJEZWcocmFkaXVzICogKDAuNCArIDYgLyB0aGV0YSksIHRvdGFsYW5nbGUgKyB0aGV0YSAvIDIpLFxuICAgICAgICB0ZXh0cTogdGhpcy5kYXRhLm1pc3NpbmdbaV0gPyAneF5cXFxcY2lyYycgOiB0aGlzLmRhdGEuYW5nbGVzW2ldLnRvU3RyaW5nKCkgKyAnXlxcXFxjaXJjJyxcbiAgICAgICAgc3R5bGVxOiAnbm9ybWFsJ1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuZGF0YS5taXNzaW5nW2ldKSB7XG4gICAgICAgIHRoaXMubGFiZWxzW2ldLnRleHRhID0gdGhpcy5kYXRhLmFuZ2xlc1tpXS50b1N0cmluZygpICsgJ15cXFxcY2lyYydcbiAgICAgICAgdGhpcy5sYWJlbHNbaV0uc3R5bGVhID0gJ2Fuc3dlcidcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubGFiZWxzW2ldLnRleHRhID0gdGhpcy5sYWJlbHNbaV0udGV4dHFcbiAgICAgICAgdGhpcy5sYWJlbHNbaV0uc3R5bGVhID0gdGhpcy5sYWJlbHNbaV0uc3R5bGVxXG4gICAgICB9XG4gICAgICB0b3RhbGFuZ2xlICs9IHRoZXRhXG4gICAgfVxuXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG5cbiAgICAvLyBSYW5kb21seSByb3RhdGUgYW5kIGNlbnRlclxuICAgIHRoaXMucm90YXRpb24gPSAob3B0aW9ucy5yb3RhdGlvbiAhPT0gdW5kZWZpbmVkKSA/IHRoaXMucm90YXRlKG9wdGlvbnMucm90YXRpb24pIDogdGhpcy5yYW5kb21Sb3RhdGUoKVxuICAgIHRoaXMudHJhbnNsYXRlKHdpZHRoIC8gMiAtIHRoaXMuTy54LCBoZWlnaHQgLyAyIC0gdGhpcy5PLnkpIC8vIGNlbnRyZVxuICB9XG5cbiAgcmVuZGVyICgpIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG5cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpIC8vIGNsZWFyXG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBjdHgubW92ZVRvKHRoaXMuTy54LCB0aGlzLk8ueSkgLy8gZHJhdyBsaW5lc1xuICAgIGN0eC5saW5lVG8odGhpcy5BLngsIHRoaXMuQS55KVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5DLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjdHgubW92ZVRvKHRoaXMuTy54LCB0aGlzLk8ueSlcbiAgICAgIGN0eC5saW5lVG8odGhpcy5DW2ldLngsIHRoaXMuQ1tpXS55KVxuICAgIH1cbiAgICBjdHguc3Ryb2tlU3R5bGUgPSAnZ3JheSdcbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGxldCB0b3RhbGFuZ2xlID0gdGhpcy5yb3RhdGlvblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5kYXRhLmFuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgdGhldGEgPSB0aGlzLmRhdGEuYW5nbGVzW2ldICogTWF0aC5QSSAvIDE4MFxuICAgICAgY3R4LmFyYyh0aGlzLk8ueCwgdGhpcy5PLnksIHRoaXMucmFkaXVzICogKDAuMiArIDAuMDcgLyB0aGV0YSksIHRvdGFsYW5nbGUsIHRvdGFsYW5nbGUgKyB0aGV0YSlcbiAgICAgIGN0eC5zdHJva2UoKVxuICAgICAgdG90YWxhbmdsZSArPSB0aGV0YVxuICAgIH1cbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIC8vIHRlc3RpbmcgbGFiZWwgcG9zaXRpb25pbmc6XG4gICAgLy8gdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAvLyBjdHguZmlsbFN0eWxlID0gJ3JlZCdcbiAgICAvLyBjdHguZmlsbFJlY3QobC5wb3MueCAtIDEsIGwucG9zLnkgLSAxLCAzLCAzKVxuICAgIC8vIH0pXG5cbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGdldCBhbGxwb2ludHMgKCkge1xuICAgIGxldCBhbGxwb2ludHMgPSBbdGhpcy5BLCB0aGlzLk9dXG4gICAgYWxscG9pbnRzID0gYWxscG9pbnRzLmNvbmNhdCh0aGlzLkMpXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChmdW5jdGlvbiAobCkge1xuICAgICAgYWxscG9pbnRzLnB1c2gobC5wb3MpXG4gICAgfSlcbiAgICByZXR1cm4gYWxscG9pbnRzXG4gIH1cbn1cbiIsIi8qKiBHZW5lcmF0ZXMgYW5kIGhvbGRzIGRhdGEgZm9yIGEgbWlzc2luZyBhbmdsZXMgcXVlc3Rpb24sIHdoZXJlIHRoZXNlIGlzIHNvbWUgZ2l2ZW4gYW5nbGUgc3VtXG4gKiAgQWdub3N0aWMgYXMgdG8gaG93IHRoZXNlIGFuZ2xlcyBhcmUgYXJyYW5nZWQgKGUuZy4gaW4gYSBwb2x5Z29uIG9yIGFyb3VuZCBzb20gcG9pbnQpXG4gKlxuICogT3B0aW9ucyBwYXNzZWQgdG8gY29uc3RydWN0b3JzOlxuICogIGFuZ2xlU3VtOjpJbnQgdGhlIG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqICBtaW5BbmdsZTo6SW50IHRoZSBzbWFsbGVzdCBhbmdsZSB0byBnZW5lcmF0ZVxuICogIG1pbk46OkludCAgICAgdGhlIHNtYWxsZXN0IG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqICBtYXhOOjpJbnQgICAgIHRoZSBsYXJnZXN0IG51bWJlciBvZiBhbmdsZXMgdG8gZ2VuZXJhdGVcbiAqXG4gKi9cblxuaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUURhdGF9IGZyb20gJy4uL0dyYXBoaWNRJ1xuXG5leHBvcnQgaW50ZXJmYWNlIE9wdGlvbnMge1xuICBhbmdsZVN1bT86IG51bWJlcixcbiAgbWluQW5nbGU/OiBudW1iZXIsXG4gIG1pbk4/OiBudW1iZXIsXG4gIG1heE4/OiBudW1iZXIsXG4gIHJlcGVhdGVkPzogYm9vbGVhbixcbiAgbk1pc3Npbmc/OiBudW1iZXJcbn1cblxuZXhwb3J0IGNsYXNzIE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgYW5nbGVzIDogbnVtYmVyW10gLy8gbGlzdCBvZiBhbmdsZXNcbiAgbWlzc2luZyA6IGJvb2xlYW5bXSAvLyB0cnVlIGlmIG1pc3NpbmdcbiAgYW5nbGVTdW0gOiBudW1iZXIgLy8gd2hhdCB0aGUgYW5nbGVzIGFkZCB1cCB0b1xuXG4gIGNvbnN0cnVjdG9yIChhbmdsZVN1bSA6IG51bWJlciwgYW5nbGVzOiBudW1iZXJbXSwgbWlzc2luZzogYm9vbGVhbltdKSB7XG4gICAgLy8gaW5pdGlhbGlzZXMgd2l0aCBhbmdsZXMgZ2l2ZW4gZXhwbGljaXRseVxuICAgIGlmIChhbmdsZXMgPT09IFtdKSB7IHRocm93IG5ldyBFcnJvcignTXVzdCBnaXZlIGFuZ2xlcycpIH1cbiAgICBpZiAoTWF0aC5yb3VuZChhbmdsZXMucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSkpICE9PSBhbmdsZVN1bSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBbmdsZSBzdW0gbXVzdCBiZSAke2FuZ2xlU3VtfWApXG4gICAgfVxuXG4gICAgdGhpcy5hbmdsZXMgPSBhbmdsZXMgLy8gbGlzdCBvZiBhbmdsZXNcbiAgICB0aGlzLm1pc3NpbmcgPSBtaXNzaW5nIC8vIHdoaWNoIGFuZ2xlcyBhcmUgbWlzc2luZyAtIGFycmF5IG9mIGJvb2xlYW5zXG4gICAgdGhpcy5hbmdsZVN1bSA9IGFuZ2xlU3VtIC8vIHN1bSBvZiBhbmdsZXNcbiAgfVxuXG4gIHN0YXRpYyByYW5kb20gKG9wdGlvbnM6IE9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEge1xuICAgIC8vIGNob29zZSBjb25zdHJ1Y3RvciBtZXRob2QgYmFzZWQgb24gb3B0aW9uc1xuICAgIGlmIChvcHRpb25zLnJlcGVhdGVkKSB7XG4gICAgICByZXR1cm4gdGhpcy5yYW5kb21SZXBlYXRlZChvcHRpb25zKVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5yYW5kb21TaW1wbGUob3B0aW9ucylcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgcmFuZG9tU2ltcGxlIChvcHRpb25zOiBPcHRpb25zKTogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEge1xuICAgIGNvbnN0IGRlZmF1bHRzIDogT3B0aW9ucyA9IHtcbiAgICAgIC8qIGFuZ2xlU3VtOiAxODAgKi8gLy8gbXVzdCBiZSBzZXQgYnkgY2FsbGVyXG4gICAgICBtaW5BbmdsZTogMTAsXG4gICAgICBtaW5OOiAyLFxuICAgICAgbWF4TjogNFxuICAgIH1cbiAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICBpZiAoIW9wdGlvbnMuYW5nbGVTdW0pIHsgdGhyb3cgbmV3IEVycm9yKCdObyBhbmdsZSBzdW0gZ2l2ZW4nKSB9XG5cbiAgICBjb25zdCBhbmdsZVN1bSA9IG9wdGlvbnMuYW5nbGVTdW1cbiAgICBjb25zdCBuID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5OLCBvcHRpb25zLm1heE4pXG4gICAgY29uc3QgbWluQW5nbGUgPSBvcHRpb25zLm1pbkFuZ2xlXG5cbiAgICBpZiAobiA8IDIpIHRocm93IG5ldyBFcnJvcignQ2FuXFwndCBoYXZlIG1pc3NpbmcgZmV3ZXIgdGhhbiAyIGFuZ2xlcycpXG5cbiAgICAvLyBCdWlsZCB1cCBhbmdsZXNcbiAgICBjb25zdCBhbmdsZXMgPSBbXVxuICAgIGxldCBsZWZ0ID0gYW5nbGVTdW1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG4gLSAxOyBpKyspIHtcbiAgICAgIGNvbnN0IG1heEFuZ2xlID0gbGVmdCAtIG1pbkFuZ2xlICogKG4gLSBpIC0gMSlcbiAgICAgIGNvbnN0IG5leHRBbmdsZSA9IHJhbmRCZXR3ZWVuKG1pbkFuZ2xlLCBtYXhBbmdsZSlcbiAgICAgIGxlZnQgLT0gbmV4dEFuZ2xlXG4gICAgICBhbmdsZXMucHVzaChuZXh0QW5nbGUpXG4gICAgfVxuICAgIGFuZ2xlc1tuIC0gMV0gPSBsZWZ0XG5cbiAgICBjb25zdCBtaXNzaW5nID0gW11cbiAgICBtaXNzaW5nLmxlbmd0aCA9IG5cbiAgICBtaXNzaW5nLmZpbGwoZmFsc2UpXG4gICAgbWlzc2luZ1tyYW5kQmV0d2VlbigwLCBuIC0gMSldID0gdHJ1ZVxuXG4gICAgcmV0dXJuIG5ldyB0aGlzKGFuZ2xlU3VtLCBhbmdsZXMsIG1pc3NpbmcpXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tUmVwZWF0ZWQgKG9wdGlvbnM6IE9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEge1xuICAgIGNvbnN0IGFuZ2xlU3VtOiBudW1iZXIgPSBvcHRpb25zLmFuZ2xlU3VtXG4gICAgY29uc3QgbWluQW5nbGU6IG51bWJlciA9IG9wdGlvbnMubWluQW5nbGVcblxuICAgIGNvbnN0IG46IG51bWJlciA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTiwgb3B0aW9ucy5tYXhOKVxuXG4gICAgY29uc3QgbTogbnVtYmVyID0gb3B0aW9ucy5uTWlzc2luZyB8fCAoTWF0aC5yYW5kb20oKSA8IDAuMSA/IG4gOiByYW5kQmV0d2VlbigyLCBuIC0gMSkpXG5cbiAgICBpZiAobiA8IDIgfHwgbSA8IDEgfHwgbSA+IG4pIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBhcmd1bWVudHM6IG49JHtufSwgbT0ke219YClcblxuICAgIC8vIEFsbCBtaXNzaW5nIC0gZG8gYXMgYSBzZXBhcmF0ZSBjYXNlXG4gICAgaWYgKG4gPT09IG0pIHtcbiAgICAgIGNvbnN0IGFuZ2xlcyA9IFtdXG4gICAgICBhbmdsZXMubGVuZ3RoID0gblxuICAgICAgYW5nbGVzLmZpbGwoYW5nbGVTdW0gLyBuKVxuICAgICAgY29uc3QgbWlzc2luZyA9IFtdXG4gICAgICBtaXNzaW5nLmxlbmd0aCA9IG5cbiAgICAgIG1pc3NpbmcuZmlsbCh0cnVlKVxuXG4gICAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZylcbiAgICB9XG5cbiAgICBjb25zdCBhbmdsZXM6IG51bWJlcltdID0gW11cbiAgICBjb25zdCBtaXNzaW5nOiBib29sZWFuW10gPSBbXVxuICAgIG1pc3NpbmcubGVuZ3RoID0gblxuICAgIG1pc3NpbmcuZmlsbChmYWxzZSlcblxuICAgIC8vIGNob29zZSBhIHZhbHVlIGZvciB0aGUgbWlzc2luZyBhbmdsZXNcbiAgICBjb25zdCBtYXhSZXBlYXRlZEFuZ2xlID0gKGFuZ2xlU3VtIC0gbWluQW5nbGUgKiAobiAtIG0pKSAvIG1cbiAgICBjb25zdCByZXBlYXRlZEFuZ2xlID0gcmFuZEJldHdlZW4obWluQW5nbGUsIG1heFJlcGVhdGVkQW5nbGUpXG5cbiAgICAvLyBjaG9vc2UgdmFsdWVzIGZvciB0aGUgb3RoZXIgYW5nbGVzXG4gICAgY29uc3Qgb3RoZXJBbmdsZXM6IG51bWJlcltdID0gW11cbiAgICBsZXQgbGVmdCA9IGFuZ2xlU3VtIC0gcmVwZWF0ZWRBbmdsZSAqIG1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG4gLSBtIC0gMTsgaSsrKSB7XG4gICAgICBjb25zdCBtYXhBbmdsZSA9IGxlZnQgLSBtaW5BbmdsZSAqIChuIC0gbSAtIGkgLSAxKVxuICAgICAgY29uc3QgbmV4dEFuZ2xlID0gcmFuZEJldHdlZW4obWluQW5nbGUsIG1heEFuZ2xlKVxuICAgICAgbGVmdCAtPSBuZXh0QW5nbGVcbiAgICAgIG90aGVyQW5nbGVzLnB1c2gobmV4dEFuZ2xlKVxuICAgIH1cbiAgICBvdGhlckFuZ2xlc1tuIC0gbSAtIDFdID0gbGVmdFxuXG4gICAgLy8gY2hvb3NlIHdoZXJlIHRoZSBtaXNzaW5nIGFuZ2xlcyBhcmVcbiAgICB7XG4gICAgICBsZXQgaSA9IDBcbiAgICAgIHdoaWxlIChpIDwgbSkge1xuICAgICAgICBjb25zdCBqID0gcmFuZEJldHdlZW4oMCwgbiAtIDEpXG4gICAgICAgIGlmIChtaXNzaW5nW2pdID09PSBmYWxzZSkge1xuICAgICAgICAgIG1pc3Npbmdbal0gPSB0cnVlXG4gICAgICAgICAgYW5nbGVzW2pdID0gcmVwZWF0ZWRBbmdsZVxuICAgICAgICAgIGkrK1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZmlsbCBpbiB0aGUgb3RoZXIgYW5nbGVzXG4gICAge1xuICAgICAgbGV0IGogPSAwXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICBpZiAobWlzc2luZ1tpXSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBhbmdsZXNbaV0gPSBvdGhlckFuZ2xlc1tqXVxuICAgICAgICAgIGorK1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZylcbiAgfVxufVxuIiwiLyogUXVlc3Rpb24gdHlwZSBjb21wcmlzaW5nIG51bWVyaWNhbCBtaXNzaW5nIGFuZ2xlcyBhcm91bmQgYSBwb2ludCBhbmRcbiAqIGFuZ2xlcyBvbiBhIHN0cmFpZ2h0IGxpbmUgKHNpbmNlIHRoZXNlIGFyZSB2ZXJ5IHNpbWlsYXIgbnVtZXJpY2FsbHkgYXMgd2VsbFxuICogYXMgZ3JhcGhpY2FsbHkuXG4gKlxuICogQWxzbyBjb3ZlcnMgY2FzZXMgd2hlcmUgbW9yZSB0aGFuIG9uZSBhbmdsZSBpcyBlcXVhbFxuICpcbiAqL1xuXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcnXG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc051bWJlckRhdGEnXG5cbmV4cG9ydCBpbnRlcmZhY2UgT3B0aW9ucyB7XG4gIGFuZ2xlU3VtPzogbnVtYmVyXG4gIG1pbkFuZ2xlPzogbnVtYmVyXG4gIG1pbk4/OiBudW1iZXJcbiAgbWF4Tj86IG51bWJlclxuICByZXBlYXRlZD86IGJvb2xlYW5cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZFEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhXG4gIHZpZXc6IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3XG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhLCB2aWV3OiBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldykgeyAvLyBlZmZlY3RpdmVseSBwcml2YXRlXG4gICAgc3VwZXIoKSAvLyBidWJibGVzIHRvIFFcbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgdGhpcy52aWV3ID0gdmlld1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzQXJvdW5kUSB7XG4gICAgY29uc3QgZGVmYXVsdHMgOiBPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAxMCxcbiAgICAgIG1pbk46IDIsXG4gICAgICBtYXhOOiA0LFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlXG4gICAgfVxuICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3KGRhdGEsIG9wdGlvbnMpIC8vIFRPRE8gZWxpbWluYXRlIHB1YmxpYyBjb25zdHJ1Y3RvcnNcblxuICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZFEoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IEdyYXBoaWNRVmlldyB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IHsgc2luRGVnLCBkYXNoZWRMaW5lIH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IGV4dGVuZHMgR3JhcGhpY1FWaWV3IHtcbiAgLy8gdGhpcy5BLCB0aGlzLkIsIHRoaXMuQyA6OiBQb2ludCAtLSB0aGUgdmVydGljZXMgb2YgdGhlIHRyaWFuZ2xlXG4gIC8vIHRoaXMubGFiZWxzID0gW11cbiAgLy8gdGhpcy5jYW52YXNcbiAgLy8gdGhpcy5ET01cbiAgLy8gdGhpcy5yb3RhdGlvblxuICBjb25zdHJ1Y3RvciAoZGF0YSwgb3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIHNldHMgdGhpcy53aWR0aCB0aGlzLmhlaWdodCwgdGhpcy5kYXRhIGluaXRpYWxpc2VzIHRoaXMubGFiZWxzLCBjcmVhdGVzIGRvbSBlbGVtZW50c1xuICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aFxuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuaGVpZ2h0XG5cbiAgICAvLyBnZW5lcmF0ZSBwb2ludHMgKHdpdGggbG9uZ2VzdCBzaWRlIDFcbiAgICB0aGlzLkEgPSBuZXcgUG9pbnQoMCwgMClcbiAgICB0aGlzLkIgPSBQb2ludC5mcm9tUG9sYXJEZWcoMSwgZGF0YS5hbmdsZXNbMF0pXG4gICAgdGhpcy5DID0gbmV3IFBvaW50KFxuICAgICAgc2luRGVnKHRoaXMuZGF0YS5hbmdsZXNbMV0pIC8gc2luRGVnKHRoaXMuZGF0YS5hbmdsZXNbMl0pLCAwXG4gICAgKVxuXG4gICAgLy8gQ3JlYXRlIGxhYmVsc1xuICAgIGNvbnN0IGluQ2VudGVyID0gUG9pbnQuaW5DZW50ZXIodGhpcy5BLCB0aGlzLkIsIHRoaXMuQylcblxuICAgIGxldCBqID0gMCAvLyBrZWVwcyB0cmFjayBvZiAneCcgYW5kICd5JyBhcyBsYWJlbHNcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgY29uc3QgcCA9IFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXVtpXVxuXG4gICAgICAvLyBudWRnaW5nIGxhYmVsIHRvd2FyZCBjZW50ZXJcbiAgICAgIC8vIGNvbnN0IG51ZGdlRGlzdGFuY2UgPSB0aGlzLmRhdGEuYW5nbGVzW2ldXG4gICAgICAvLyBjb25zdCBwb3NpdGlvbiA9IHAuY2xvbmUoKS5tb3ZlVG93YXJkKGluQ2VudGVyLFxuICAgICAgbGV0IHRleHRxXG4gICAgICBpZiAodGhpcy5kYXRhLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgdGV4dHEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKDEyMCtqKSAvLyAxMjAgPSAneCdcbiAgICAgICAgaisrXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0ZXh0cSA9IHRoaXMuZGF0YS5hbmdsZXNbaV0udG9TdHJpbmcoKVxuICAgICAgfVxuICAgICAgdGV4dHEgKz0gJ15cXFxcY2lyYydcbiAgICAgIHRoaXMubGFiZWxzW2ldID0ge1xuICAgICAgICBwb3M6IFBvaW50Lm1lYW4ocCwgcCwgaW5DZW50ZXIpLCAvLyB3ZWlnaHRlZCBtZWFuIC0gcG9zaXRpb24gZnJvbSBpbkNlbnRlclxuICAgICAgICB0ZXh0cTogdGV4dHEsXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCdcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmRhdGEubWlzc2luZ1tpXSkge1xuICAgICAgICB0aGlzLmxhYmVsc1tpXS50ZXh0YSA9IHRoaXMuZGF0YS5hbmdsZXNbaV0udG9TdHJpbmcoKSArICdeXFxcXGNpcmMnXG4gICAgICAgIHRoaXMubGFiZWxzW2ldLnN0eWxlYSA9ICdhbnN3ZXInXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmxhYmVsc1tpXS50ZXh0YSA9IHRoaXMubGFiZWxzW2ldLnRleHRxXG4gICAgICAgIHRoaXMubGFiZWxzW2ldLnN0eWxlYSA9IHRoaXMubGFiZWxzW2ldLnN0eWxlcVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRxXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZXFcbiAgICB9KVxuXG4gICAgLy8gcm90YXRlIHJhbmRvbWx5XG4gICAgdGhpcy5yb3RhdGlvbiA9IChvcHRpb25zLnJvdGF0aW9uICE9PSB1bmRlZmluZWQpID8gdGhpcy5yb3RhdGUob3B0aW9ucy5yb3RhdGlvbikgOiB0aGlzLnJhbmRvbVJvdGF0ZSgpXG5cbiAgICAvLyBzY2FsZSBhbmQgZml0XG4gICAgLy8gc2NhbGUgdG8gc2l6ZVxuICAgIGNvbnN0IG1hcmdpbiA9IDBcbiAgICBsZXQgdG9wbGVmdCA9IFBvaW50Lm1pbihbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgbGV0IGJvdHRvbXJpZ2h0ID0gUG9pbnQubWF4KFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBjb25zdCB0b3RhbFdpZHRoID0gYm90dG9tcmlnaHQueCAtIHRvcGxlZnQueFxuICAgIGNvbnN0IHRvdGFsSGVpZ2h0ID0gYm90dG9tcmlnaHQueSAtIHRvcGxlZnQueVxuICAgIHRoaXMuc2NhbGUoTWF0aC5taW4oKHdpZHRoIC0gbWFyZ2luKSAvIHRvdGFsV2lkdGgsIChoZWlnaHQgLSBtYXJnaW4pIC8gdG90YWxIZWlnaHQpKSAvLyAxNXB4IG1hcmdpblxuXG4gICAgLy8gbW92ZSB0byBjZW50cmVcbiAgICB0b3BsZWZ0ID0gUG9pbnQubWluKFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBib3R0b21yaWdodCA9IFBvaW50Lm1heChbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbih0b3BsZWZ0LCBib3R0b21yaWdodClcbiAgICB0aGlzLnRyYW5zbGF0ZSh3aWR0aCAvIDIgLSBjZW50ZXIueCwgaGVpZ2h0IC8gMiAtIGNlbnRlci55KSAvLyBjZW50cmVcbiAgfVxuXG4gIHJlbmRlciAoKSB7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICAgIGNvbnN0IHZlcnRpY2VzID0gW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdXG4gICAgY29uc3QgYXBleCA9IHRoaXMuZGF0YS5hcGV4IC8vIGhtbW1cblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGN0eC5tb3ZlVG8odGhpcy5BLngsIHRoaXMuQS55KVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGNvbnN0IHAgPSB2ZXJ0aWNlc1tpXVxuICAgICAgY29uc3QgbmV4dCA9IHZlcnRpY2VzWyhpICsgMSkgJSAzXVxuICAgICAgaWYgKGFwZXggPT09IGkgfHwgYXBleCA9PT0gKGkgKyAxKSAlIDMpIHsgLy8gdG8vZnJvbSBhcGV4IC0gZHJhdyBkYXNoZWQgbGluZVxuICAgICAgICBkYXNoZWRMaW5lKGN0eCwgcC54LCBwLnksIG5leHQueCwgbmV4dC55KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3R4LmxpbmVUbyhuZXh0LngsIG5leHQueSlcbiAgICAgIH1cbiAgICB9XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gJ2dyYXknXG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGdldCBhbGxwb2ludHMgKCkge1xuICAgIGNvbnN0IGFsbHBvaW50cyA9IFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXVxuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7IGFsbHBvaW50cy5wdXNoKGwucG9zKSB9KVxuICAgIHJldHVybiBhbGxwb2ludHNcbiAgfVxufVxuIiwiLyogRXh0ZW5kcyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSBpbiBvcmRlciB0byBkbyBpc29zY2VsZXMgdHJpYW5nbGVzLCB3aGljaCBnZW5lcmF0ZSBhIGJpdCBkaWZmZXJlbnRseSAqL1xuXG5pbXBvcnQgeyBmaXJzdFVuaXF1ZUluZGV4LCBzb3J0VG9nZXRoZXIgfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUURhdGEgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhLCBPcHRpb25zIGFzIFBhcmVudE9wdGlvbnN9IGZyb20gJy4vTWlzc2luZ0FuZ2xlc051bWJlckRhdGEnXG5cbnR5cGUgT3B0aW9ucyA9IFBhcmVudE9wdGlvbnMgJiB7Z2l2ZW5BbmdsZT86ICdhcGV4JyB8ICdiYXNlJ31cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBleHRlbmRzIE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIHtcbiAgICBhcGV4OiAwIHwgMSB8IDIgfCB1bmRlZmluZWQgLy8gd2hpY2ggb2YgdGhlIHRocmVlIGdpdmVuIGFuZ2xlcyBpcyB0aGUgYXBleCBvZiBhbiBpc29zY2VsZXMgdHJpYW5nbGVcbiAgICBjb25zdHJ1Y3RvcihhbmdsZVN1bTogbnVtYmVyLCBhbmdsZXM6IG51bWJlcltdLCBtaXNzaW5nOiBib29sZWFuW10sIGFwZXg/OiAwfDF8Mnx1bmRlZmluZWQpIHtcbiAgICAgICAgc3VwZXIoYW5nbGVTdW0sYW5nbGVzLG1pc3NpbmcpXG4gICAgICAgIHRoaXMuYXBleCA9IGFwZXhcbiAgICB9XG5cbiAgICBzdGF0aWMgcmFuZG9tUmVwZWF0ZWQob3B0aW9uczogT3B0aW9ucykge1xuICAgICAgICBvcHRpb25zLm5NaXNzaW5nID0gMlxuICAgICAgICBvcHRpb25zLmdpdmVuQW5nbGUgPSBvcHRpb25zLmdpdmVuQW5nbGUgfHwgTWF0aC5yYW5kb20oKSA8IDAuNT8gJ2FwZXgnIDogJ2Jhc2UnXG5cbiAgICAgICAgLy8gZ2VuZXJhdGUgdGhlIHJhbmRvbSBhbmdsZXMgd2l0aCByZXBldGl0aW9uIGZpcnN0IGJlZm9yZSBtYXJraW5nIGFwZXggZm9yIGRyYXdpbmdcbiAgICAgICAgbGV0IHF1ZXN0aW9uID0gc3VwZXIucmFuZG9tUmVwZWF0ZWQob3B0aW9ucykgYXMgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSAvLyBhbGxvd2VkIHNpbmNlIHVuZGVmaW5lZCBcXGluIGFwZXhcblxuICAgICAgICAvLyBPbGQgaW1wbGVtZW50YXRpb24gaGFkIHNvcnRpbmcgdGhlIGFycmF5IC0gbm90IHN1cmUgd2h5XG4gICAgICAgIC8vIHNvcnRUb2dldGhlcihxdWVzdGlvbi5hbmdsZXMscXVlc3Rpb24ubWlzc2luZywoeCx5KSA9PiB4IC0geSlcblxuICAgICAgICBxdWVzdGlvbi5hcGV4ID0gZmlyc3RVbmlxdWVJbmRleChxdWVzdGlvbi5hbmdsZXMpIGFzIDAgfCAxIHwgMlxuICAgICAgICBxdWVzdGlvbi5taXNzaW5nID0gW3RydWUsdHJ1ZSx0cnVlXVxuICAgICAgICBcbiAgICAgICAgaWYgKG9wdGlvbnMuZ2l2ZW5BbmdsZSA9PT0gJ2FwZXgnKSB7XG4gICAgICAgICAgICBxdWVzdGlvbi5taXNzaW5nW3F1ZXN0aW9uLmFwZXhdID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBxdWVzdGlvbi5taXNzaW5nWyhxdWVzdGlvbi5hcGV4ICsgMSklM10gPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgcmV0dXJuIHF1ZXN0aW9uXG4gICAgfSBcblxufSIsIi8qIE1pc3NpbmcgYW5nbGVzIGluIHRyaWFuZ2xlIC0gbnVtZXJpY2FsICovXG5cbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGNvbnN0cnVjdG9yIChkYXRhLCB2aWV3LCBvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucykgLy8gdGhpcyBzaG91bGQgYmUgYWxsIHRoYXQncyByZXF1aXJlZCB3aGVuIHJlZmFjdG9yZWRcbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgdGhpcy52aWV3ID0gdmlld1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9ucykge1xuICAgIGNvbnN0IG9wdGlvbnNPdmVycmlkZSA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5BbmdsZTogMjUsXG4gICAgICBtaW5OOiAzLFxuICAgICAgbWF4TjogMyxcbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24ob3B0aW9ucyxvcHRpb25zT3ZlcnJpZGUpXG4gICAgb3B0aW9ucy5yZXBlYXRlZCAgPSBvcHRpb25zLnJlcGVhdGVkIHx8IGZhbHNlXG5cbiAgICBjb25zdCBkYXRhID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcoZGF0YSwgb3B0aW9ucylcblxuICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUShkYXRhLCB2aWV3LCBvcHRpb25zKVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7IHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZScgfVxufVxuIiwiLyoqICBDbGFzcyB0byB3cmFwIHZhcmlvdXMgbWlzc2luZyBhbmdsZXMgY2xhc3Nlc1xuICogUmVhZHMgb3B0aW9ucyBhbmQgdGhlbiB3cmFwcyB0aGUgYXBwcm9wcmlhdGUgb2JqZWN0LCBtaXJyb3JpbmcgdGhlIG1haW5cbiAqIHB1YmxpYyBtZXRob2RzXG4gKlxuICogVGhpcyBjbGFzcyBkZWFscyB3aXRoIHRyYW5zbGF0aW5nIGRpZmZpY3VsdHkgaW50byBxdWVzdGlvbiB0eXBlc1xuKi9cblxuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRRLCAqIGFzIEFuZ2xlc0Fyb3VuZCBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRRJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNUcmlhbmdsZVEgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVRJ1xuaW1wb3J0IFF1ZXN0aW9uIGZyb20gJ1F1ZXN0aW9uL1F1ZXN0aW9uJ1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJy4uL0dyYXBoaWNRJ1xuXG50eXBlIFF1ZXN0aW9uVHlwZSA9ICdhb3NsJyB8ICdhYWFwJyB8ICd0cmlhbmdsZSdcbnR5cGUgUXVlc3Rpb25TdWJUeXBlID0gJ3NpbXBsZScgfCAncmVwZWF0ZWQnIHwgJ2FsZ2VicmEnIHwgJ3dvcmRlZCdcblxudHlwZSBRdWVzdGlvbk9wdGlvbnMgPSBBbmdsZXNBcm91bmQuT3B0aW9ucyAvLyB0byBiZSAmZWQgd2l0aCBvdGhlciBvcHRpb25zIHR5cGVzXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBxdWVzdGlvbjogR3JhcGhpY1FcblxuICBjb25zdHJ1Y3RvciAocXVlc3Rpb246IEdyYXBoaWNRKSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMucXVlc3Rpb24gPSBxdWVzdGlvblxuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAoXG4gICAgb3B0aW9uczoge1xuICAgICAgdHlwZXM6IFF1ZXN0aW9uVHlwZVtdLFxuICAgICAgZGlmZmljdWx0eTogbnVtYmVyLFxuICAgICAgY3VzdG9tOiBib29sZWFuLFxuICAgICAgc3VidHlwZT86IFF1ZXN0aW9uU3ViVHlwZVxuICAgIH0pIDogTWlzc2luZ0FuZ2xlc1Ege1xuICAgIGlmIChvcHRpb25zLnR5cGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUeXBlcyBsaXN0IG11c3QgYmUgbm9uLWVtcHR5JylcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlID0gcmFuZEVsZW0ob3B0aW9ucy50eXBlcylcbiAgICBsZXQgc3VidHlwZSA6IFF1ZXN0aW9uU3ViVHlwZVxuICAgIGxldCBxdWVzdGlvbk9wdGlvbnMgOiBRdWVzdGlvbk9wdGlvbnMgPSB7fVxuXG4gICAgc3dpdGNoIChvcHRpb25zLmRpZmZpY3VsdHkpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgc3VidHlwZSA9ICdzaW1wbGUnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDJcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgc3VidHlwZSA9ICdzaW1wbGUnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gM1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDRcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMzpcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHN1YnR5cGUgPSAncmVwZWF0ZWQnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gM1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDRcbiAgICAgICAgYnJlYWtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5yYW5kb21Gcm9tVHlwZVdpdGhPcHRpb25zKHR5cGUsIHN1YnR5cGUsIHF1ZXN0aW9uT3B0aW9ucylcbiAgfVxuXG4gIHN0YXRpYyByYW5kb21Gcm9tVHlwZVdpdGhPcHRpb25zICh0eXBlOiBRdWVzdGlvblR5cGUsIHN1YnR5cGU/OiBRdWVzdGlvblN1YlR5cGUsIHF1ZXN0aW9uT3B0aW9ucz86IFF1ZXN0aW9uT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzUSB7XG4gICAgbGV0IHF1ZXN0aW9uOiBHcmFwaGljUVxuICAgIHF1ZXN0aW9uT3B0aW9ucyA9IHF1ZXN0aW9uT3B0aW9ucyB8fCB7fVxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSAnYWFhcCc6XG4gICAgICBjYXNlICdhb3NsJzoge1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMuYW5nbGVTdW0gPSAodHlwZSA9PT0gJ2FhYXAnKSA/IDM2MCA6IDE4MFxuICAgICAgICBpZiAoc3VidHlwZSA9PT0gJ3JlcGVhdGVkJykge1xuICAgICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5yZXBlYXRlZCA9IHRydWVcbiAgICAgICAgfVxuICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNBcm91bmRRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICd0cmlhbmdsZSc6IHtcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLnJlcGVhdGVkID0gKHN1YnR5cGUgPT09IFwicmVwZWF0ZWRcIilcbiAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdHlwZSAke3R5cGV9YClcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNRKHF1ZXN0aW9uKVxuICB9XG5cbiAgZ2V0RE9NICgpIDogSFRNTEVsZW1lbnQgeyByZXR1cm4gdGhpcy5xdWVzdGlvbi5nZXRET00oKSB9XG4gIHJlbmRlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLnJlbmRlcigpIH1cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQgeyB0aGlzLnF1ZXN0aW9uLnNob3dBbnN3ZXIoKSB9XG4gIGhpZGVBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5oaWRlQW5zd2VyKCkgfVxuICB0b2dnbGVBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi50b2dnbGVBbnN3ZXIoKSB9XG5cbiAgc3RhdGljIGdldCBvcHRpb25zU3BlYyAoKSA6IHVua25vd25bXSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICBpZDogJ3R5cGVzJyxcbiAgICAgICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgICAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICAgICAgeyB0aXRsZTogJ09uIGEgc3RyYWlnaHQgbGluZScsIGlkOiAnYW9zbCcgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnQXJvdW5kIGEgcG9pbnQnLCBpZDogJ2FhYXAnIH0sXG4gICAgICAgICAgeyB0aXRsZTogJ1RyaWFuZ2xlJywgaWQ6ICd0cmlhbmdsZScgfVxuICAgICAgICBdLFxuICAgICAgICBkZWZhdWx0OiBbJ2Fvc2wnLCAnYWFhcCcsICd0cmlhbmdsZSddLFxuICAgICAgICB2ZXJ0aWNhbDogdHJ1ZVxuICAgICAgfVxuICAgIF1cbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcge1xuICAgIHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZSdcbiAgfVxufVxuIiwiaW1wb3J0IEFsZ2VicmFpY0ZyYWN0aW9uUSBmcm9tICdRdWVzdGlvbi9UZXh0US9BbGdlYnJhaWNGcmFjdGlvblEnXG5pbXBvcnQgSW50ZWdlckFkZFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvSW50ZWdlckFkZCdcbmltcG9ydCBBcml0aG1hZ29uUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9Bcml0aG1hZ29uUSdcbmltcG9ydCBUZXN0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXN0USdcbmltcG9ydCBBZGRBWmVybyBmcm9tICdRdWVzdGlvbi9UZXh0US9BZGRBWmVybydcbmltcG9ydCBFcXVhdGlvbk9mTGluZSBmcm9tICdRdWVzdGlvbi9UZXh0US9FcXVhdGlvbk9mTGluZSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNXcmFwcGVyJ1xuXG5pbXBvcnQgT3B0aW9uc1NldCBmcm9tICdPcHRpb25zU2V0J1xuXG5jb25zdCB0b3BpY0xpc3QgPSBbXG4gIHtcbiAgICBpZDogJ2FsZ2VicmFpYy1mcmFjdGlvbicsXG4gICAgdGl0bGU6ICdTaW1wbGlmeSBhbGdlYnJhaWMgZnJhY3Rpb25zJyxcbiAgICBjbGFzczogQWxnZWJyYWljRnJhY3Rpb25RXG4gIH0sXG4gIHtcbiAgICBpZDogJ2FkZC1hLXplcm8nLFxuICAgIHRpdGxlOiAnTXVsdGlwbHkgYnkgMTAgKGhvbmVzdCEpJyxcbiAgICBjbGFzczogQWRkQVplcm9cbiAgfSxcbiAge1xuICAgIGlkOiAnaW50ZWdlci1hZGQnLFxuICAgIHRpdGxlOiAnQWRkIGludGVnZXJzICh2IHNpbXBsZSknLFxuICAgIGNsYXNzOiBJbnRlZ2VyQWRkUVxuICB9LFxuICB7XG4gICAgaWQ6ICdtaXNzaW5nLWFuZ2xlcycsXG4gICAgdGl0bGU6ICdNaXNzaW5nIGFuZ2xlcycsXG4gICAgY2xhc3M6IE1pc3NpbmdBbmdsZXNRXG4gIH0sXG4gIHtcbiAgICBpZDogJ2VxdWF0aW9uLW9mLWxpbmUnLFxuICAgIHRpdGxlOiAnRXF1YXRpb24gb2YgYSBsaW5lIChmcm9tIHR3byBwb2ludHMpJyxcbiAgICBjbGFzczogRXF1YXRpb25PZkxpbmVcbiAgfSxcbiAge1xuICAgIGlkOiAnYXJpdGhtYWdvbi1hZGQnLFxuICAgIHRpdGxlOiAnQXJpdGhtYWdvbnMnLFxuICAgIGNsYXNzOiBBcml0aG1hZ29uUVxuICB9LFxuICB7XG4gICAgaWQ6ICd0ZXN0JyxcbiAgICB0aXRsZTogJ1Rlc3QgcXVlc3Rpb25zJyxcbiAgICBjbGFzczogVGVzdFFcbiAgfVxuXVxuXG5mdW5jdGlvbiBnZXRDbGFzcyAoaWQpIHtcbiAgLy8gUmV0dXJuIHRoZSBjbGFzcyBnaXZlbiBhbiBpZCBvZiBhIHF1ZXN0aW9uXG5cbiAgLy8gT2J2aW91c2x5IHRoaXMgaXMgYW4gaW5lZmZpY2llbnQgc2VhcmNoLCBidXQgd2UgZG9uJ3QgbmVlZCBtYXNzaXZlIHBlcmZvcm1hbmNlXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdG9waWNMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHRvcGljTGlzdFtpXS5pZCA9PT0gaWQpIHtcbiAgICAgIHJldHVybiB0b3BpY0xpc3RbaV0uY2xhc3NcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbFxufVxuXG5mdW5jdGlvbiBnZXRUaXRsZSAoaWQpIHtcbiAgLy8gUmV0dXJuIHRpdGxlIG9mIGEgZ2l2ZW4gaWRcbiAgLy9cbiAgcmV0dXJuIHRvcGljTGlzdC5maW5kKHQgPT4gKHQuaWQgPT09IGlkKSkudGl0bGVcbn1cblxuZnVuY3Rpb24gZ2V0Q29tbWFuZFdvcmQgKGlkKSB7XG4gIHJldHVybiBnZXRDbGFzcyhpZCkuY29tbWFuZFdvcmRcbn1cblxuZnVuY3Rpb24gZ2V0VG9waWNzICgpIHtcbiAgLy8gcmV0dXJucyB0b3BpY3Mgd2l0aCBjbGFzc2VzIHN0cmlwcGVkIG91dFxuICByZXR1cm4gdG9waWNMaXN0Lm1hcCh4ID0+ICh7IGlkOiB4LmlkLCB0aXRsZTogeC50aXRsZSB9KSlcbn1cblxuZnVuY3Rpb24gbmV3UXVlc3Rpb24gKGlkLCBvcHRpb25zKSB7XG4gIC8vIHRvIGF2b2lkIHdyaXRpbmcgYGxldCBxID0gbmV3IChUb3BpY0Nob29zZXIuZ2V0Q2xhc3MoaWQpKShvcHRpb25zKVxuICBjb25zdCBRdWVzdGlvbkNsYXNzID0gZ2V0Q2xhc3MoaWQpXG4gIGxldCBxdWVzdGlvblxuICBpZiAoUXVlc3Rpb25DbGFzcy5yYW5kb20pIHtcbiAgICBxdWVzdGlvbiA9IFF1ZXN0aW9uQ2xhc3MucmFuZG9tKG9wdGlvbnMpXG4gIH0gZWxzZSB7XG4gICAgcXVlc3Rpb24gPSBuZXcgUXVlc3Rpb25DbGFzcyhvcHRpb25zKVxuICB9XG4gIHJldHVybiBxdWVzdGlvblxufVxuXG5mdW5jdGlvbiBuZXdPcHRpb25zU2V0IChpZCkge1xuICBjb25zdCBvcHRpb25zU3BlYyA9IChnZXRDbGFzcyhpZCkpLm9wdGlvbnNTcGVjIHx8IFtdXG4gIHJldHVybiBuZXcgT3B0aW9uc1NldChvcHRpb25zU3BlYylcbn1cblxuZnVuY3Rpb24gaGFzT3B0aW9ucyAoaWQpIHtcbiAgcmV0dXJuICEhKGdldENsYXNzKGlkKS5vcHRpb25zU3BlYyAmJiBnZXRDbGFzcyhpZCkub3B0aW9uc1NwZWMubGVuZ3RoID4gMCkgLy8gd2VpcmQgYm9vbCB0eXBjYXN0aW5nIHdvbyFcbn1cblxuZXhwb3J0IHsgdG9waWNMaXN0LCBnZXRDbGFzcywgbmV3UXVlc3Rpb24sIGdldFRvcGljcywgZ2V0VGl0bGUsIG5ld09wdGlvbnNTZXQsIGdldENvbW1hbmRXb3JkLCBoYXNPcHRpb25zIH1cbiIsIi8qICFcbiogdGluZ2xlLmpzXG4qIEBhdXRob3IgIHJvYmluX3BhcmlzaVxuKiBAdmVyc2lvbiAwLjE1LjJcbiogQHVybFxuKi9cbi8vIE1vZGlmaWVkIHRvIGJlIEVTNiBtb2R1bGVcblxudmFyIGlzQnVzeSA9IGZhbHNlXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIE1vZGFsIChvcHRpb25zKSB7XG4gIHZhciBkZWZhdWx0cyA9IHtcbiAgICBvbkNsb3NlOiBudWxsLFxuICAgIG9uT3BlbjogbnVsbCxcbiAgICBiZWZvcmVPcGVuOiBudWxsLFxuICAgIGJlZm9yZUNsb3NlOiBudWxsLFxuICAgIHN0aWNreUZvb3RlcjogZmFsc2UsXG4gICAgZm9vdGVyOiBmYWxzZSxcbiAgICBjc3NDbGFzczogW10sXG4gICAgY2xvc2VMYWJlbDogJ0Nsb3NlJyxcbiAgICBjbG9zZU1ldGhvZHM6IFsnb3ZlcmxheScsICdidXR0b24nLCAnZXNjYXBlJ11cbiAgfVxuXG4gIC8vIGV4dGVuZHMgY29uZmlnXG4gIHRoaXMub3B0cyA9IGV4dGVuZCh7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgLy8gaW5pdCBtb2RhbFxuICB0aGlzLmluaXQoKVxufVxuXG5Nb2RhbC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMubW9kYWwpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIF9idWlsZC5jYWxsKHRoaXMpXG4gIF9iaW5kRXZlbnRzLmNhbGwodGhpcylcblxuICAvLyBpbnNlcnQgbW9kYWwgaW4gZG9tXG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbCwgZG9jdW1lbnQuYm9keS5maXJzdENoaWxkKVxuXG4gIGlmICh0aGlzLm9wdHMuZm9vdGVyKSB7XG4gICAgdGhpcy5hZGRGb290ZXIoKVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuTW9kYWwucHJvdG90eXBlLl9idXN5ID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gIGlzQnVzeSA9IHN0YXRlXG59XG5cbk1vZGFsLnByb3RvdHlwZS5faXNCdXN5ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gaXNCdXN5XG59XG5cbk1vZGFsLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5tb2RhbCA9PT0gbnVsbCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgLy8gcmVzdG9yZSBzY3JvbGxpbmdcbiAgaWYgKHRoaXMuaXNPcGVuKCkpIHtcbiAgICB0aGlzLmNsb3NlKHRydWUpXG4gIH1cblxuICAvLyB1bmJpbmQgYWxsIGV2ZW50c1xuICBfdW5iaW5kRXZlbnRzLmNhbGwodGhpcylcblxuICAvLyByZW1vdmUgbW9kYWwgZnJvbSBkb21cbiAgdGhpcy5tb2RhbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMubW9kYWwpXG5cbiAgdGhpcy5tb2RhbCA9IG51bGxcbn1cblxuTW9kYWwucHJvdG90eXBlLmlzT3BlbiA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICEhdGhpcy5tb2RhbC5jbGFzc0xpc3QuY29udGFpbnMoJ3RpbmdsZS1tb2RhbC0tdmlzaWJsZScpXG59XG5cbk1vZGFsLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5faXNCdXN5KCkpIHJldHVyblxuICB0aGlzLl9idXN5KHRydWUpXG5cbiAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgLy8gYmVmb3JlIG9wZW4gY2FsbGJhY2tcbiAgaWYgKHR5cGVvZiBzZWxmLm9wdHMuYmVmb3JlT3BlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHNlbGYub3B0cy5iZWZvcmVPcGVuKClcbiAgfVxuXG4gIGlmICh0aGlzLm1vZGFsLnN0eWxlLnJlbW92ZVByb3BlcnR5KSB7XG4gICAgdGhpcy5tb2RhbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgnZGlzcGxheScpXG4gIH0gZWxzZSB7XG4gICAgdGhpcy5tb2RhbC5zdHlsZS5yZW1vdmVBdHRyaWJ1dGUoJ2Rpc3BsYXknKVxuICB9XG5cbiAgLy8gcHJldmVudCBkb3VibGUgc2Nyb2xsXG4gIHRoaXMuX3Njcm9sbFBvc2l0aW9uID0gd2luZG93LnBhZ2VZT2Zmc2V0XG4gIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmFkZCgndGluZ2xlLWVuYWJsZWQnKVxuICBkb2N1bWVudC5ib2R5LnN0eWxlLnRvcCA9IC10aGlzLl9zY3JvbGxQb3NpdGlvbiArICdweCdcblxuICAvLyBzdGlja3kgZm9vdGVyXG4gIHRoaXMuc2V0U3RpY2t5Rm9vdGVyKHRoaXMub3B0cy5zdGlja3lGb290ZXIpXG5cbiAgLy8gc2hvdyBtb2RhbFxuICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC0tdmlzaWJsZScpXG5cbiAgLy8gb25PcGVuIGNhbGxiYWNrXG4gIGlmICh0eXBlb2Ygc2VsZi5vcHRzLm9uT3BlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHNlbGYub3B0cy5vbk9wZW4uY2FsbChzZWxmKVxuICB9XG5cbiAgc2VsZi5fYnVzeShmYWxzZSlcblxuICAvLyBjaGVjayBpZiBtb2RhbCBpcyBiaWdnZXIgdGhhbiBzY3JlZW4gaGVpZ2h0XG4gIHRoaXMuY2hlY2tPdmVyZmxvdygpXG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuTW9kYWwucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKGZvcmNlKSB7XG4gIGlmICh0aGlzLl9pc0J1c3koKSkgcmV0dXJuXG4gIHRoaXMuX2J1c3kodHJ1ZSlcbiAgZm9yY2UgPSBmb3JjZSB8fCBmYWxzZVxuXG4gIC8vICBiZWZvcmUgY2xvc2VcbiAgaWYgKHR5cGVvZiB0aGlzLm9wdHMuYmVmb3JlQ2xvc2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICB2YXIgY2xvc2UgPSB0aGlzLm9wdHMuYmVmb3JlQ2xvc2UuY2FsbCh0aGlzKVxuICAgIGlmICghY2xvc2UpIHtcbiAgICAgIHRoaXMuX2J1c3koZmFsc2UpXG4gICAgICByZXR1cm5cbiAgICB9XG4gIH1cblxuICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoJ3RpbmdsZS1lbmFibGVkJylcbiAgZG9jdW1lbnQuYm9keS5zdHlsZS50b3AgPSBudWxsXG4gIHdpbmRvdy5zY3JvbGxUbyh7XG4gICAgdG9wOiB0aGlzLl9zY3JvbGxQb3NpdGlvbixcbiAgICBiZWhhdmlvcjogJ2luc3RhbnQnXG4gIH0pXG5cbiAgdGhpcy5tb2RhbC5jbGFzc0xpc3QucmVtb3ZlKCd0aW5nbGUtbW9kYWwtLXZpc2libGUnKVxuXG4gIC8vIHVzaW5nIHNpbWlsYXIgc2V0dXAgYXMgb25PcGVuXG4gIHZhciBzZWxmID0gdGhpc1xuXG4gIHNlbGYubW9kYWwuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuXG4gIC8vIG9uQ2xvc2UgY2FsbGJhY2tcbiAgaWYgKHR5cGVvZiBzZWxmLm9wdHMub25DbG9zZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHNlbGYub3B0cy5vbkNsb3NlLmNhbGwodGhpcylcbiAgfVxuXG4gIC8vIHJlbGVhc2UgbW9kYWxcbiAgc2VsZi5fYnVzeShmYWxzZSlcbn1cblxuTW9kYWwucHJvdG90eXBlLnNldENvbnRlbnQgPSBmdW5jdGlvbiAoY29udGVudCkge1xuICAvLyBjaGVjayB0eXBlIG9mIGNvbnRlbnQgOiBTdHJpbmcgb3IgTm9kZVxuICBpZiAodHlwZW9mIGNvbnRlbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgdGhpcy5tb2RhbEJveENvbnRlbnQuaW5uZXJIVE1MID0gY29udGVudFxuICB9IGVsc2Uge1xuICAgIHRoaXMubW9kYWxCb3hDb250ZW50LmlubmVySFRNTCA9ICcnXG4gICAgdGhpcy5tb2RhbEJveENvbnRlbnQuYXBwZW5kQ2hpbGQoY29udGVudClcbiAgfVxuXG4gIGlmICh0aGlzLmlzT3BlbigpKSB7XG4gICAgLy8gY2hlY2sgaWYgbW9kYWwgaXMgYmlnZ2VyIHRoYW4gc2NyZWVuIGhlaWdodFxuICAgIHRoaXMuY2hlY2tPdmVyZmxvdygpXG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuZ2V0Q29udGVudCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMubW9kYWxCb3hDb250ZW50XG59XG5cbk1vZGFsLnByb3RvdHlwZS5hZGRGb290ZXIgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIGFkZCBmb290ZXIgdG8gbW9kYWxcbiAgX2J1aWxkRm9vdGVyLmNhbGwodGhpcylcblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuc2V0Rm9vdGVyQ29udGVudCA9IGZ1bmN0aW9uIChjb250ZW50KSB7XG4gIC8vIHNldCBmb290ZXIgY29udGVudFxuICB0aGlzLm1vZGFsQm94Rm9vdGVyLmlubmVySFRNTCA9IGNvbnRlbnRcblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuZ2V0Rm9vdGVyQ29udGVudCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMubW9kYWxCb3hGb290ZXJcbn1cblxuTW9kYWwucHJvdG90eXBlLnNldFN0aWNreUZvb3RlciA9IGZ1bmN0aW9uIChpc1N0aWNreSkge1xuICAvLyBpZiB0aGUgbW9kYWwgaXMgc21hbGxlciB0aGFuIHRoZSB2aWV3cG9ydCBoZWlnaHQsIHdlIGRvbid0IG5lZWQgc3RpY2t5XG4gIGlmICghdGhpcy5pc092ZXJmbG93KCkpIHtcbiAgICBpc1N0aWNreSA9IGZhbHNlXG4gIH1cblxuICBpZiAoaXNTdGlja3kpIHtcbiAgICBpZiAodGhpcy5tb2RhbEJveC5jb250YWlucyh0aGlzLm1vZGFsQm94Rm9vdGVyKSkge1xuICAgICAgdGhpcy5tb2RhbEJveC5yZW1vdmVDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKVxuICAgICAgdGhpcy5tb2RhbC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKVxuICAgICAgdGhpcy5tb2RhbEJveEZvb3Rlci5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtYm94X19mb290ZXItLXN0aWNreScpXG4gICAgICBfcmVjYWxjdWxhdGVGb290ZXJQb3NpdGlvbi5jYWxsKHRoaXMpXG4gICAgICB0aGlzLm1vZGFsQm94Q29udGVudC5zdHlsZVsncGFkZGluZy1ib3R0b20nXSA9IHRoaXMubW9kYWxCb3hGb290ZXIuY2xpZW50SGVpZ2h0ICsgMjAgKyAncHgnXG4gICAgfVxuICB9IGVsc2UgaWYgKHRoaXMubW9kYWxCb3hGb290ZXIpIHtcbiAgICBpZiAoIXRoaXMubW9kYWxCb3guY29udGFpbnModGhpcy5tb2RhbEJveEZvb3RlcikpIHtcbiAgICAgIHRoaXMubW9kYWwucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlcilcbiAgICAgIHRoaXMubW9kYWxCb3guYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlcilcbiAgICAgIHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUud2lkdGggPSAnYXV0bydcbiAgICAgIHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUubGVmdCA9ICcnXG4gICAgICB0aGlzLm1vZGFsQm94Q29udGVudC5zdHlsZVsncGFkZGluZy1ib3R0b20nXSA9ICcnXG4gICAgICB0aGlzLm1vZGFsQm94Rm9vdGVyLmNsYXNzTGlzdC5yZW1vdmUoJ3RpbmdsZS1tb2RhbC1ib3hfX2Zvb3Rlci0tc3RpY2t5JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG5Nb2RhbC5wcm90b3R5cGUuYWRkRm9vdGVyQnRuID0gZnVuY3Rpb24gKGxhYmVsLCBjc3NDbGFzcywgY2FsbGJhY2spIHtcbiAgdmFyIGJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpXG5cbiAgLy8gc2V0IGxhYmVsXG4gIGJ0bi5pbm5lckhUTUwgPSBsYWJlbFxuXG4gIC8vIGJpbmQgY2FsbGJhY2tcbiAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2FsbGJhY2spXG5cbiAgaWYgKHR5cGVvZiBjc3NDbGFzcyA9PT0gJ3N0cmluZycgJiYgY3NzQ2xhc3MubGVuZ3RoKSB7XG4gICAgLy8gYWRkIGNsYXNzZXMgdG8gYnRuXG4gICAgY3NzQ2xhc3Muc3BsaXQoJyAnKS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICBidG4uY2xhc3NMaXN0LmFkZChpdGVtKVxuICAgIH0pXG4gIH1cblxuICB0aGlzLm1vZGFsQm94Rm9vdGVyLmFwcGVuZENoaWxkKGJ0bilcblxuICByZXR1cm4gYnRuXG59XG5cbk1vZGFsLnByb3RvdHlwZS5yZXNpemUgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGNvbnNvbGUud2FybignUmVzaXplIGlzIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiB2ZXJzaW9uIDEuMCcpXG59XG5cbk1vZGFsLnByb3RvdHlwZS5pc092ZXJmbG93ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgdmlld3BvcnRIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHRcbiAgdmFyIG1vZGFsSGVpZ2h0ID0gdGhpcy5tb2RhbEJveC5jbGllbnRIZWlnaHRcblxuICByZXR1cm4gbW9kYWxIZWlnaHQgPj0gdmlld3BvcnRIZWlnaHRcbn1cblxuTW9kYWwucHJvdG90eXBlLmNoZWNrT3ZlcmZsb3cgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIG9ubHkgaWYgdGhlIG1vZGFsIGlzIGN1cnJlbnRseSBzaG93blxuICBpZiAodGhpcy5tb2RhbC5jbGFzc0xpc3QuY29udGFpbnMoJ3RpbmdsZS1tb2RhbC0tdmlzaWJsZScpKSB7XG4gICAgaWYgKHRoaXMuaXNPdmVyZmxvdygpKSB7XG4gICAgICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC0tb3ZlcmZsb3cnKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3RpbmdsZS1tb2RhbC0tb3ZlcmZsb3cnKVxuICAgIH1cblxuICAgIC8vIHRPRE86IHJlbW92ZSBvZmZzZXRcbiAgICAvLyBfb2Zmc2V0LmNhbGwodGhpcyk7XG4gICAgaWYgKCF0aGlzLmlzT3ZlcmZsb3coKSAmJiB0aGlzLm9wdHMuc3RpY2t5Rm9vdGVyKSB7XG4gICAgICB0aGlzLnNldFN0aWNreUZvb3RlcihmYWxzZSlcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNPdmVyZmxvdygpICYmIHRoaXMub3B0cy5zdGlja3lGb290ZXIpIHtcbiAgICAgIF9yZWNhbGN1bGF0ZUZvb3RlclBvc2l0aW9uLmNhbGwodGhpcylcbiAgICAgIHRoaXMuc2V0U3RpY2t5Rm9vdGVyKHRydWUpXG4gICAgfVxuICB9XG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiA9PSBwcml2YXRlIG1ldGhvZHMgKi9cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cbmZ1bmN0aW9uIGNsb3NlSWNvbiAoKSB7XG4gIHJldHVybiAnPHN2ZyB2aWV3Qm94PVwiMCAwIDEwIDEwXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPjxwYXRoIGQ9XCJNLjMgOS43Yy4yLjIuNC4zLjcuMy4zIDAgLjUtLjEuNy0uM0w1IDYuNGwzLjMgMy4zYy4yLjIuNS4zLjcuMy4yIDAgLjUtLjEuNy0uMy40LS40LjQtMSAwLTEuNEw2LjQgNWwzLjMtMy4zYy40LS40LjQtMSAwLTEuNC0uNC0uNC0xLS40LTEuNCAwTDUgMy42IDEuNy4zQzEuMy0uMS43LS4xLjMuM2MtLjQuNC0uNCAxIDAgMS40TDMuNiA1IC4zIDguM2MtLjQuNC0uNCAxIDAgMS40elwiIGZpbGw9XCIjMDAwXCIgZmlsbC1ydWxlPVwibm9uemVyb1wiLz48L3N2Zz4nXG59XG5cbmZ1bmN0aW9uIF9yZWNhbGN1bGF0ZUZvb3RlclBvc2l0aW9uICgpIHtcbiAgaWYgKCF0aGlzLm1vZGFsQm94Rm9vdGVyKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgdGhpcy5tb2RhbEJveEZvb3Rlci5zdHlsZS53aWR0aCA9IHRoaXMubW9kYWxCb3guY2xpZW50V2lkdGggKyAncHgnXG4gIHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUubGVmdCA9IHRoaXMubW9kYWxCb3gub2Zmc2V0TGVmdCArICdweCdcbn1cblxuZnVuY3Rpb24gX2J1aWxkICgpIHtcbiAgLy8gd3JhcHBlclxuICB0aGlzLm1vZGFsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgdGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwnKVxuXG4gIC8vIHJlbW92ZSBjdXNvciBpZiBubyBvdmVybGF5IGNsb3NlIG1ldGhvZFxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5sZW5ndGggPT09IDAgfHwgdGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdvdmVybGF5JykgPT09IC0xKSB7XG4gICAgdGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtLW5vT3ZlcmxheUNsb3NlJylcbiAgfVxuXG4gIHRoaXMubW9kYWwuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuXG4gIC8vIGN1c3RvbSBjbGFzc1xuICB0aGlzLm9wdHMuY3NzQ2xhc3MuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZChpdGVtKVxuICAgIH1cbiAgfSwgdGhpcylcblxuICAvLyBjbG9zZSBidG5cbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignYnV0dG9uJykgIT09IC0xKSB7XG4gICAgdGhpcy5tb2RhbENsb3NlQnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJylcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4udHlwZSA9ICdidXR0b24nXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbF9fY2xvc2UnKVxuXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuSWNvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKVxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bkljb24uY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsX19jbG9zZUljb24nKVxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bkljb24uaW5uZXJIVE1MID0gY2xvc2VJY29uKClcblxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bkxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuTGFiZWwuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsX19jbG9zZUxhYmVsJylcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbC5pbm5lckhUTUwgPSB0aGlzLm9wdHMuY2xvc2VMYWJlbFxuXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuLmFwcGVuZENoaWxkKHRoaXMubW9kYWxDbG9zZUJ0bkljb24pXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuLmFwcGVuZENoaWxkKHRoaXMubW9kYWxDbG9zZUJ0bkxhYmVsKVxuICB9XG5cbiAgLy8gbW9kYWxcbiAgdGhpcy5tb2RhbEJveCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIHRoaXMubW9kYWxCb3guY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsLWJveCcpXG5cbiAgLy8gbW9kYWwgYm94IGNvbnRlbnRcbiAgdGhpcy5tb2RhbEJveENvbnRlbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICB0aGlzLm1vZGFsQm94Q29udGVudC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtYm94X19jb250ZW50JylcblxuICB0aGlzLm1vZGFsQm94LmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3hDb250ZW50KVxuXG4gIGlmICh0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoJ2J1dHRvbicpICE9PSAtMSkge1xuICAgIHRoaXMubW9kYWwuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbENsb3NlQnRuKVxuICB9XG5cbiAgdGhpcy5tb2RhbC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94KVxufVxuXG5mdW5jdGlvbiBfYnVpbGRGb290ZXIgKCkge1xuICB0aGlzLm1vZGFsQm94Rm9vdGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgdGhpcy5tb2RhbEJveEZvb3Rlci5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtYm94X19mb290ZXInKVxuICB0aGlzLm1vZGFsQm94LmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpXG59XG5cbmZ1bmN0aW9uIF9iaW5kRXZlbnRzICgpIHtcbiAgdGhpcy5fZXZlbnRzID0ge1xuICAgIGNsaWNrQ2xvc2VCdG46IHRoaXMuY2xvc2UuYmluZCh0aGlzKSxcbiAgICBjbGlja092ZXJsYXk6IF9oYW5kbGVDbGlja091dHNpZGUuYmluZCh0aGlzKSxcbiAgICByZXNpemU6IHRoaXMuY2hlY2tPdmVyZmxvdy5iaW5kKHRoaXMpLFxuICAgIGtleWJvYXJkTmF2OiBfaGFuZGxlS2V5Ym9hcmROYXYuYmluZCh0aGlzKVxuICB9XG5cbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignYnV0dG9uJykgIT09IC0xKSB7XG4gICAgdGhpcy5tb2RhbENsb3NlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5fZXZlbnRzLmNsaWNrQ2xvc2VCdG4pXG4gIH1cblxuICB0aGlzLm1vZGFsLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMuX2V2ZW50cy5jbGlja092ZXJsYXkpXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLl9ldmVudHMucmVzaXplKVxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgdGhpcy5fZXZlbnRzLmtleWJvYXJkTmF2KVxufVxuXG5mdW5jdGlvbiBfaGFuZGxlS2V5Ym9hcmROYXYgKGV2ZW50KSB7XG4gIC8vIGVzY2FwZSBrZXlcbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignZXNjYXBlJykgIT09IC0xICYmIGV2ZW50LndoaWNoID09PSAyNyAmJiB0aGlzLmlzT3BlbigpKSB7XG4gICAgdGhpcy5jbG9zZSgpXG4gIH1cbn1cblxuZnVuY3Rpb24gX2hhbmRsZUNsaWNrT3V0c2lkZSAoZXZlbnQpIHtcbiAgLy8gb24gbWFjT1MsIGNsaWNrIG9uIHNjcm9sbGJhciAoaGlkZGVuIG1vZGUpIHdpbGwgdHJpZ2dlciBjbG9zZSBldmVudCBzbyB3ZSBuZWVkIHRvIGJ5cGFzcyB0aGlzIGJlaGF2aW9yIGJ5IGRldGVjdGluZyBzY3JvbGxiYXIgbW9kZVxuICB2YXIgc2Nyb2xsYmFyV2lkdGggPSB0aGlzLm1vZGFsLm9mZnNldFdpZHRoIC0gdGhpcy5tb2RhbC5jbGllbnRXaWR0aFxuICB2YXIgY2xpY2tlZE9uU2Nyb2xsYmFyID0gZXZlbnQuY2xpZW50WCA+PSB0aGlzLm1vZGFsLm9mZnNldFdpZHRoIC0gMTUgLy8gMTVweCBpcyBtYWNPUyBzY3JvbGxiYXIgZGVmYXVsdCB3aWR0aFxuICB2YXIgaXNTY3JvbGxhYmxlID0gdGhpcy5tb2RhbC5zY3JvbGxIZWlnaHQgIT09IHRoaXMubW9kYWwub2Zmc2V0SGVpZ2h0XG4gIGlmIChuYXZpZ2F0b3IucGxhdGZvcm0gPT09ICdNYWNJbnRlbCcgJiYgc2Nyb2xsYmFyV2lkdGggPT09IDAgJiYgY2xpY2tlZE9uU2Nyb2xsYmFyICYmIGlzU2Nyb2xsYWJsZSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgLy8gaWYgY2xpY2sgaXMgb3V0c2lkZSB0aGUgbW9kYWxcbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignb3ZlcmxheScpICE9PSAtMSAmJiAhX2ZpbmRBbmNlc3RvcihldmVudC50YXJnZXQsICd0aW5nbGUtbW9kYWwnKSAmJlxuICAgIGV2ZW50LmNsaWVudFggPCB0aGlzLm1vZGFsLmNsaWVudFdpZHRoKSB7XG4gICAgdGhpcy5jbG9zZSgpXG4gIH1cbn1cblxuZnVuY3Rpb24gX2ZpbmRBbmNlc3RvciAoZWwsIGNscykge1xuICB3aGlsZSAoKGVsID0gZWwucGFyZW50RWxlbWVudCkgJiYgIWVsLmNsYXNzTGlzdC5jb250YWlucyhjbHMpKTtcbiAgcmV0dXJuIGVsXG59XG5cbmZ1bmN0aW9uIF91bmJpbmRFdmVudHMgKCkge1xuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdidXR0b24nKSAhPT0gLTEpIHtcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLl9ldmVudHMuY2xpY2tDbG9zZUJ0bilcbiAgfVxuICB0aGlzLm1vZGFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMuX2V2ZW50cy5jbGlja092ZXJsYXkpXG4gIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLl9ldmVudHMucmVzaXplKVxuICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywgdGhpcy5fZXZlbnRzLmtleWJvYXJkTmF2KVxufVxuXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuLyogPT0gaGVscGVycyAqL1xuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuZnVuY3Rpb24gZXh0ZW5kICgpIHtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gYXJndW1lbnRzW2ldKSB7XG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGFyZ3VtZW50c1tpXSwga2V5KSkge1xuICAgICAgICBhcmd1bWVudHNbMF1ba2V5XSA9IGFyZ3VtZW50c1tpXVtrZXldXG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBhcmd1bWVudHNbMF1cbn1cbiIsImltcG9ydCBSU2xpZGVyIGZyb20gJ3ZlbmRvci9yc2xpZGVyJ1xuaW1wb3J0IE9wdGlvbnNTZXQgZnJvbSAnT3B0aW9uc1NldCdcbmltcG9ydCAqIGFzIFRvcGljQ2hvb3NlciBmcm9tICdUb3BpY0Nob29zZXInXG5pbXBvcnQgTW9kYWwgZnJvbSAndmVuZG9yL1RpbmdsZSdcbmltcG9ydCB7IHJhbmRFbGVtLCBjcmVhdGVFbGVtLCBoYXNBbmNlc3RvckNsYXNzLCBib29sT2JqZWN0VG9BcnJheSB9IGZyb20gJ1V0aWxpdGllcydcblxuY29uc3QgU0hPV19ESUZGSUNVTFRZID0gdHJ1ZVxuXG4vKiBUT0RPIGxpc3Q6XG4gKiBBZGRpdGlvbmFsIHF1ZXN0aW9uIGJsb2NrIC0gcHJvYmFibHkgaW4gbWFpbi5qc1xuICogUmVtb3ZlIG9wdGlvbnMgYnV0dG9uIGZvciB0b3BpY3Mgd2l0aG91dCBvcHRpb25zXG4gKiBab29tL3NjYWxlIGJ1dHRvbnNcbiAqL1xuXG4vLyBNYWtlIGFuIG92ZXJsYXkgdG8gY2FwdHVyZSBhbnkgY2xpY2tzIG91dHNpZGUgYm94ZXMsIGlmIG5lY2Vzc2FyeVxuY3JlYXRlRWxlbSgnZGl2JywgJ292ZXJsYXkgaGlkZGVuJywgZG9jdW1lbnQuYm9keSkuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBoaWRlQWxsQWN0aW9ucylcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUXVlc3Rpb25TZXQge1xuICBjb25zdHJ1Y3RvciAocU51bWJlcikge1xuICAgIHRoaXMucXVlc3Rpb25zID0gW10gLy8gbGlzdCBvZiBxdWVzdGlvbnMgYW5kIHRoZSBET00gZWxlbWVudCB0aGV5J3JlIHJlbmRlcmVkIGluXG4gICAgdGhpcy50b3BpY3MgPSBbXSAvLyBsaXN0IG9mIHRvcGljcyB3aGljaCBoYXZlIGJlZW4gc2VsZWN0ZWQgZm9yIHRoaXMgc2V0XG4gICAgdGhpcy5vcHRpb25zU2V0cyA9IFtdIC8vIGxpc3Qgb2YgT3B0aW9uc1NldCBvYmplY3RzIGNhcnJ5aW5nIG9wdGlvbnMgZm9yIHRvcGljcyB3aXRoIG9wdGlvbnNcbiAgICB0aGlzLnFOdW1iZXIgPSBxTnVtYmVyIHx8IDEgLy8gUXVlc3Rpb24gbnVtYmVyIChwYXNzZWQgaW4gYnkgY2FsbGVyLCB3aGljaCB3aWxsIGtlZXAgY291bnQpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlIC8vIFdoZXRoZXIgYW5zd2VyZWQgb3Igbm90XG4gICAgdGhpcy5jb21tYW5kV29yZCA9ICcnIC8vIFNvbWV0aGluZyBsaWtlICdzaW1wbGlmeSdcbiAgICB0aGlzLnVzZUNvbW1hbmRXb3JkID0gdHJ1ZSAvLyBVc2UgdGhlIGNvbW1hbmQgd29yZCBpbiB0aGUgbWFpbiBxdWVzdGlvbiwgZmFsc2UgZ2l2ZSBjb21tYW5kIHdvcmQgd2l0aCBlYWNoIHN1YnF1ZXN0aW9uXG4gICAgdGhpcy5uID0gOCAvLyBOdW1iZXIgb2YgcXVlc3Rpb25zXG5cbiAgICB0aGlzLl9idWlsZCgpXG4gIH1cblxuICBfYnVpbGQgKCkge1xuICAgIHRoaXMub3V0ZXJCb3ggPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tb3V0ZXJib3gnKVxuICAgIHRoaXMuaGVhZGVyQm94ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWhlYWRlcmJveCcsIHRoaXMub3V0ZXJCb3gpXG4gICAgdGhpcy5kaXNwbGF5Qm94ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWRpc3BsYXlib3gnLCB0aGlzLm91dGVyQm94KVxuXG4gICAgdGhpcy5fYnVpbGRPcHRpb25zQm94KClcblxuICAgIHRoaXMuX2J1aWxkVG9waWNDaG9vc2VyKClcbiAgfVxuXG4gIF9idWlsZE9wdGlvbnNCb3ggKCkge1xuICAgIGNvbnN0IHRvcGljU3BhbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCBudWxsLCB0aGlzLmhlYWRlckJveClcbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCAndG9waWMtY2hvb3NlciBidXR0b24nLCB0b3BpY1NwYW4pXG4gICAgdGhpcy50b3BpY0Nob29zZXJCdXR0b24uaW5uZXJIVE1MID0gJ0Nob29zZSB0b3BpYydcbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuY2hvb3NlVG9waWNzKCkpXG5cbiAgICBjb25zdCBkaWZmaWN1bHR5U3BhbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCBudWxsLCB0aGlzLmhlYWRlckJveClcbiAgICBkaWZmaWN1bHR5U3Bhbi5hcHBlbmQoJ0RpZmZpY3VsdHk6ICcpXG4gICAgY29uc3QgZGlmZmljdWx0eVNsaWRlck91dGVyID0gY3JlYXRlRWxlbSgnc3BhbicsICdzbGlkZXItb3V0ZXInLCBkaWZmaWN1bHR5U3BhbilcbiAgICB0aGlzLmRpZmZpY3VsdHlTbGlkZXJFbGVtZW50ID0gY3JlYXRlRWxlbSgnaW5wdXQnLCBudWxsLCBkaWZmaWN1bHR5U2xpZGVyT3V0ZXIpXG5cbiAgICBjb25zdCBuU3BhbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCBudWxsLCB0aGlzLmhlYWRlckJveClcbiAgICBuU3Bhbi5hcHBlbmQoJ051bWJlciBvZiBxdWVzdGlvbnM6ICcpXG4gICAgY29uc3QgblF1ZXN0aW9uc0lucHV0ID0gY3JlYXRlRWxlbSgnaW5wdXQnLCAnbi1xdWVzdGlvbnMnLCBuU3BhbilcbiAgICBuUXVlc3Rpb25zSW5wdXQudHlwZSA9ICdudW1iZXInXG4gICAgblF1ZXN0aW9uc0lucHV0Lm1pbiA9ICcxJ1xuICAgIG5RdWVzdGlvbnNJbnB1dC52YWx1ZSA9ICc4J1xuICAgIG5RdWVzdGlvbnNJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICB0aGlzLm4gPSBwYXJzZUludChuUXVlc3Rpb25zSW5wdXQudmFsdWUpXG4gICAgfSlcblxuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24gPSBjcmVhdGVFbGVtKCdidXR0b24nLCAnZ2VuZXJhdGUtYnV0dG9uIGJ1dHRvbicsIHRoaXMuaGVhZGVyQm94KVxuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uZGlzYWJsZWQgPSB0cnVlXG4gICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5pbm5lckhUTUwgPSAnR2VuZXJhdGUhJ1xuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLmdlbmVyYXRlQWxsKCkpXG4gIH1cblxuICBfaW5pdFNsaWRlciAoKSB7XG4gICAgdGhpcy5kaWZmaWN1bHR5U2xpZGVyID0gbmV3IFJTbGlkZXIoe1xuICAgICAgdGFyZ2V0OiB0aGlzLmRpZmZpY3VsdHlTbGlkZXJFbGVtZW50LFxuICAgICAgdmFsdWVzOiB7IG1pbjogMSwgbWF4OiAxMCB9LFxuICAgICAgcmFuZ2U6IHRydWUsXG4gICAgICBzZXQ6IFsyLCA2XSxcbiAgICAgIHN0ZXA6IDEsXG4gICAgICB0b29sdGlwOiBmYWxzZSxcbiAgICAgIHNjYWxlOiB0cnVlLFxuICAgICAgbGFiZWxzOiB0cnVlXG4gICAgfSlcbiAgfVxuXG4gIF9idWlsZFRvcGljQ2hvb3NlciAoKSB7XG4gICAgLy8gYnVpbGQgYW4gT3B0aW9uc1NldCBvYmplY3QgZm9yIHRoZSB0b3BpY3NcbiAgICBjb25zdCB0b3BpY3MgPSBUb3BpY0Nob29zZXIuZ2V0VG9waWNzKClcbiAgICBjb25zdCBvcHRpb25zU3BlYyA9IFtdXG4gICAgdG9waWNzLmZvckVhY2godG9waWMgPT4ge1xuICAgICAgb3B0aW9uc1NwZWMucHVzaCh7XG4gICAgICAgIHRpdGxlOiB0b3BpYy50aXRsZSxcbiAgICAgICAgaWQ6IHRvcGljLmlkLFxuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICBzd2FwTGFiZWw6IHRydWVcbiAgICAgIH0pXG4gICAgfSlcbiAgICB0aGlzLnRvcGljc09wdGlvbnMgPSBuZXcgT3B0aW9uc1NldChvcHRpb25zU3BlYylcblxuICAgIC8vIEJ1aWxkIGEgbW9kYWwgZGlhbG9nIHRvIHB1dCB0aGVtIGluXG4gICAgdGhpcy50b3BpY3NNb2RhbCA9IG5ldyBNb2RhbCh7XG4gICAgICBmb290ZXI6IHRydWUsXG4gICAgICBzdGlja3lGb290ZXI6IGZhbHNlLFxuICAgICAgY2xvc2VNZXRob2RzOiBbJ292ZXJsYXknLCAnZXNjYXBlJ10sXG4gICAgICBjbG9zZUxhYmVsOiAnQ2xvc2UnLFxuICAgICAgb25DbG9zZTogKCkgPT4ge1xuICAgICAgICB0aGlzLnVwZGF0ZVRvcGljcygpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoaXMudG9waWNzTW9kYWwuYWRkRm9vdGVyQnRuKFxuICAgICAgJ09LJyxcbiAgICAgICdidXR0b24gbW9kYWwtYnV0dG9uJyxcbiAgICAgICgpID0+IHtcbiAgICAgICAgdGhpcy50b3BpY3NNb2RhbC5jbG9zZSgpXG4gICAgICB9KVxuXG4gICAgLy8gcmVuZGVyIG9wdGlvbnMgaW50byBtb2RhbFxuICAgIHRoaXMudG9waWNzT3B0aW9ucy5yZW5kZXJJbih0aGlzLnRvcGljc01vZGFsLm1vZGFsQm94Q29udGVudClcblxuICAgIC8vIEFkZCBmdXJ0aGVyIG9wdGlvbnMgYnV0dG9uc1xuICAgIC8vIFRoaXMgZmVlbHMgYSBiaXQgaWZmeSAtIGRlcGVuZHMgdG9vIG11Y2ggb24gaW1wbGVtZW50YXRpb24gb2YgT3B0aW9uc1NldFxuICAgIGNvbnN0IGxpcyA9IEFycmF5LmZyb20odGhpcy50b3BpY3NNb2RhbC5tb2RhbEJveENvbnRlbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2xpJykpXG4gICAgbGlzLmZvckVhY2gobGkgPT4ge1xuICAgICAgY29uc3QgdG9waWNJZCA9IGxpLmRhdGFzZXQub3B0aW9uSWRcbiAgICAgIGlmIChUb3BpY0Nob29zZXIuaGFzT3B0aW9ucyh0b3BpY0lkKSkge1xuICAgICAgICBjb25zdCBvcHRpb25zQnV0dG9uID0gY3JlYXRlRWxlbSgnZGl2JywgJ2ljb24tYnV0dG9uIGV4dHJhLW9wdGlvbnMtYnV0dG9uJywgbGkpXG4gICAgICAgIHRoaXMuX2J1aWxkVG9waWNPcHRpb25zKGxpLmRhdGFzZXQub3B0aW9uSWQsIG9wdGlvbnNCdXR0b24pXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIF9idWlsZFRvcGljT3B0aW9ucyAodG9waWNJZCwgb3B0aW9uc0J1dHRvbikge1xuICAgIC8vIEJ1aWxkIHRoZSBVSSBhbmQgT3B0aW9uc1NldCBvYmplY3QgbGlua2VkIHRvIHRvcGljSWQuIFBhc3MgaW4gYSBidXR0b24gd2hpY2ggc2hvdWxkIGxhdW5jaCBpdFxuXG4gICAgLy8gTWFrZSB0aGUgT3B0aW9uc1NldCBvYmplY3QgYW5kIHN0b3JlIGEgcmVmZXJlbmNlIHRvIGl0XG4gICAgLy8gT25seSBzdG9yZSBpZiBvYmplY3QgaXMgY3JlYXRlZD9cbiAgICBjb25zdCBvcHRpb25zU2V0ID0gVG9waWNDaG9vc2VyLm5ld09wdGlvbnNTZXQodG9waWNJZClcbiAgICB0aGlzLm9wdGlvbnNTZXRzW3RvcGljSWRdID0gb3B0aW9uc1NldFxuXG4gICAgLy8gTWFrZSBhIG1vZGFsIGRpYWxvZyBmb3IgaXRcbiAgICBjb25zdCBtb2RhbCA9IG5ldyBNb2RhbCh7XG4gICAgICBmb290ZXI6IHRydWUsXG4gICAgICBzdGlja3lGb290ZXI6IGZhbHNlLFxuICAgICAgY2xvc2VNZXRob2RzOiBbJ292ZXJsYXknLCAnZXNjYXBlJ10sXG4gICAgICBjbG9zZUxhYmVsOiAnQ2xvc2UnXG4gICAgfSlcblxuICAgIG1vZGFsLmFkZEZvb3RlckJ0bihcbiAgICAgICdPSycsXG4gICAgICAnYnV0dG9uIG1vZGFsLWJ1dHRvbicsXG4gICAgICAoKSA9PiB7XG4gICAgICAgIG1vZGFsLmNsb3NlKClcbiAgICAgIH0pXG5cbiAgICBvcHRpb25zU2V0LnJlbmRlckluKG1vZGFsLm1vZGFsQm94Q29udGVudClcblxuICAgIC8vIGxpbmsgdGhlIG1vZGFsIHRvIHRoZSBidXR0b25cbiAgICBvcHRpb25zQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgbW9kYWwub3BlbigpXG4gICAgfSlcbiAgfVxuXG4gIGNob29zZVRvcGljcyAoKSB7XG4gICAgdGhpcy50b3BpY3NNb2RhbC5vcGVuKClcbiAgfVxuXG4gIHVwZGF0ZVRvcGljcyAoKSB7XG4gICAgLy8gdG9waWMgY2hvaWNlcyBhcmUgc3RvcmVkIGluIHRoaXMudG9waWNzT3B0aW9ucyBhdXRvbWF0aWNhbGx5XG4gICAgLy8gcHVsbCB0aGlzIGludG8gdGhpcy50b3BpY3MgYW5kIHVwZGF0ZSBidXR0b24gZGlzcGxheXNcblxuICAgIC8vIGhhdmUgb2JqZWN0IHdpdGggYm9vbGVhbiBwcm9wZXJ0aWVzLiBKdXN0IHdhbnQgdGhlIHRydWUgdmFsdWVzXG4gICAgY29uc3QgdG9waWNzID0gYm9vbE9iamVjdFRvQXJyYXkodGhpcy50b3BpY3NPcHRpb25zLm9wdGlvbnMpXG4gICAgdGhpcy50b3BpY3MgPSB0b3BpY3NcblxuICAgIGxldCB0ZXh0XG5cbiAgICBpZiAodG9waWNzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGV4dCA9ICdDaG9vc2UgdG9waWMnIC8vIG5vdGhpbmcgc2VsZWN0ZWRcbiAgICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uZGlzYWJsZWQgPSB0cnVlXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGlkID0gdG9waWNzWzBdIC8vIGZpcnN0IGl0ZW0gc2VsZWN0ZWRcbiAgICAgIHRleHQgPSBUb3BpY0Nob29zZXIuZ2V0VGl0bGUoaWQpXG4gICAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmRpc2FibGVkID0gZmFsc2VcbiAgICB9XG5cbiAgICBpZiAodG9waWNzLmxlbmd0aCA+IDEpIHsgLy8gYW55IGFkZGl0aW9uYWwgc2hvdyBhcyBlLmcuICcgKyAxXG4gICAgICB0ZXh0ICs9ICcgKycgKyAodG9waWNzLmxlbmd0aCAtIDEpXG4gICAgfVxuXG4gICAgdGhpcy50b3BpY0Nob29zZXJCdXR0b24uaW5uZXJIVE1MID0gdGV4dFxuICB9XG5cbiAgc2V0Q29tbWFuZFdvcmQgKCkge1xuICAgIC8vIGZpcnN0IHNldCB0byBmaXJzdCB0b3BpYyBjb21tYW5kIHdvcmRcbiAgICBsZXQgY29tbWFuZFdvcmQgPSBUb3BpY0Nob29zZXIuZ2V0Q2xhc3ModGhpcy50b3BpY3NbMF0pLmNvbW1hbmRXb3JkXG4gICAgbGV0IHVzZUNvbW1hbmRXb3JkID0gdHJ1ZSAvLyB0cnVlIGlmIHNoYXJlZCBjb21tYW5kIHdvcmRcblxuICAgIC8vIGN5Y2xlIHRocm91Z2ggcmVzdCBvZiB0b3BpY3MsIHJlc2V0IGNvbW1hbmQgd29yZCBpZiB0aGV5IGRvbid0IG1hdGNoXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCB0aGlzLnRvcGljcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKFRvcGljQ2hvb3Nlci5nZXRDbGFzcyh0aGlzLnRvcGljc1tpXSkuY29tbWFuZFdvcmQgIT09IGNvbW1hbmRXb3JkKSB7XG4gICAgICAgIGNvbW1hbmRXb3JkID0gJydcbiAgICAgICAgdXNlQ29tbWFuZFdvcmQgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY29tbWFuZFdvcmQgPSBjb21tYW5kV29yZFxuICAgIHRoaXMudXNlQ29tbWFuZFdvcmQgPSB1c2VDb21tYW5kV29yZFxuICB9XG5cbiAgZ2VuZXJhdGVBbGwgKCkge1xuICAgIC8vIENsZWFyIGRpc3BsYXktYm94IGFuZCBxdWVzdGlvbiBsaXN0XG4gICAgdGhpcy5kaXNwbGF5Qm94LmlubmVySFRNTCA9ICcnXG4gICAgdGhpcy5xdWVzdGlvbnMgPSBbXVxuICAgIHRoaXMuc2V0Q29tbWFuZFdvcmQoKVxuXG4gICAgLy8gU2V0IG51bWJlciBhbmQgbWFpbiBjb21tYW5kIHdvcmRcbiAgICBjb25zdCBtYWlucSA9IGNyZWF0ZUVsZW0oJ3AnLCAna2F0ZXggbWFpbnEnLCB0aGlzLmRpc3BsYXlCb3gpXG4gICAgbWFpbnEuaW5uZXJIVE1MID0gYCR7dGhpcy5xTnVtYmVyfS4gJHt0aGlzLmNvbW1hbmRXb3JkfWAgLy8gVE9ETzogZ2V0IGNvbW1hbmQgd29yZCBmcm9tIHF1ZXN0aW9uc1xuXG4gICAgLy8gTWFrZSBzaG93IGFuc3dlcnMgYnV0dG9uXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24gPSBjcmVhdGVFbGVtKCdwJywgJ2J1dHRvbiBzaG93LWFuc3dlcnMnLCB0aGlzLmRpc3BsYXlCb3gpXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLnRvZ2dsZUFuc3dlcnMoKVxuICAgIH0pXG4gICAgdGhpcy5hbnN3ZXJCdXR0b24uaW5uZXJIVE1MID0gJ1Nob3cgYW5zd2VycydcblxuICAgIC8vIEdldCBkaWZmaWN1bHR5IGZyb20gc2xpZGVyXG4gICAgY29uc3QgbWluZGlmZiA9IHRoaXMuZGlmZmljdWx0eVNsaWRlci5nZXRWYWx1ZUwoKVxuICAgIGNvbnN0IG1heGRpZmYgPSB0aGlzLmRpZmZpY3VsdHlTbGlkZXIuZ2V0VmFsdWVSKClcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIC8vIE1ha2UgcXVlc3Rpb24gY29udGFpbmVyIERPTSBlbGVtZW50XG4gICAgICBjb25zdCBjb250YWluZXIgPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tY29udGFpbmVyJywgdGhpcy5kaXNwbGF5Qm94KVxuICAgICAgY29udGFpbmVyLmRhdGFzZXQucXVlc3Rpb25faW5kZXggPSBpIC8vIG5vdCBzdXJlIHRoaXMgaXMgYWN0dWFsbHkgbmVlZGVkXG5cbiAgICAgIC8vIEFkZCBjb250YWluZXIgbGluayB0byBvYmplY3QgaW4gcXVlc3Rpb25zIGxpc3RcbiAgICAgIGlmICghdGhpcy5xdWVzdGlvbnNbaV0pIHRoaXMucXVlc3Rpb25zW2ldID0ge31cbiAgICAgIHRoaXMucXVlc3Rpb25zW2ldLmNvbnRhaW5lciA9IGNvbnRhaW5lclxuXG4gICAgICAvLyBjaG9vc2UgYSBkaWZmaWN1bHR5IGFuZCBnZW5lcmF0ZVxuICAgICAgY29uc3QgZGlmZmljdWx0eSA9IG1pbmRpZmYgKyBNYXRoLmZsb29yKGkgKiAobWF4ZGlmZiAtIG1pbmRpZmYgKyAxKSAvIHRoaXMubilcblxuICAgICAgLy8gY2hvb3NlIGEgdG9waWMgaWRcbiAgICAgIHRoaXMuZ2VuZXJhdGUoaSwgZGlmZmljdWx0eSlcbiAgICB9XG4gIH1cblxuICBnZW5lcmF0ZSAoaSwgZGlmZmljdWx0eSwgdG9waWNJZCkge1xuICAgIC8vIFRPRE8gZ2V0IG9wdGlvbnMgcHJvcGVybHlcbiAgICB0b3BpY0lkID0gdG9waWNJZCB8fCByYW5kRWxlbSh0aGlzLnRvcGljcylcblxuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICBsYWJlbDogJycsXG4gICAgICBkaWZmaWN1bHR5OiBkaWZmaWN1bHR5LFxuICAgICAgdXNlQ29tbWFuZFdvcmQ6IGZhbHNlXG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9uc1NldHNbdG9waWNJZF0pIHtcbiAgICAgIE9iamVjdC5hc3NpZ24ob3B0aW9ucywgdGhpcy5vcHRpb25zU2V0c1t0b3BpY0lkXS5vcHRpb25zKVxuICAgIH1cblxuICAgIC8vIGNob29zZSBhIHF1ZXN0aW9uXG4gICAgY29uc3QgcXVlc3Rpb24gPSBUb3BpY0Nob29zZXIubmV3UXVlc3Rpb24odG9waWNJZCwgb3B0aW9ucylcblxuICAgIC8vIHNldCBzb21lIG1vcmUgZGF0YSBpbiB0aGUgcXVlc3Rpb25zW10gbGlzdFxuICAgIGlmICghdGhpcy5xdWVzdGlvbnNbaV0pIHRocm93IG5ldyBFcnJvcigncXVlc3Rpb24gbm90IG1hZGUnKVxuICAgIHRoaXMucXVlc3Rpb25zW2ldLnF1ZXN0aW9uID0gcXVlc3Rpb25cbiAgICB0aGlzLnF1ZXN0aW9uc1tpXS50b3BpY0lkID0gdG9waWNJZFxuXG4gICAgLy8gUmVuZGVyIGludG8gdGhlIGNvbnRhaW5lclxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMucXVlc3Rpb25zW2ldLmNvbnRhaW5lclxuICAgIGNvbnRhaW5lci5pbm5lckhUTUwgPSAnJyAvLyBjbGVhciBpbiBjYXNlIG9mIHJlZnJlc2hcblxuICAgIC8vIG1ha2UgYW5kIHJlbmRlciBxdWVzdGlvbiBudW1iZXIgYW5kIGNvbW1hbmQgd29yZCAoaWYgbmVlZGVkKVxuICAgIGxldCBxTnVtYmVyVGV4dCA9IHF1ZXN0aW9uTGV0dGVyKGkpICsgJyknXG4gICAgaWYgKFNIT1dfRElGRklDVUxUWSkge3FOdW1iZXJUZXh0ICs9IG9wdGlvbnMuZGlmZmljdWx0eX1cbiAgICBpZiAoIXRoaXMudXNlQ29tbWFuZFdvcmQpIHtcbiAgICAgIHFOdW1iZXJUZXh0ICs9ICcgJyArIFRvcGljQ2hvb3Nlci5nZXRDb21tYW5kV29yZCh0b3BpY0lkKVxuICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ2luZGl2aWR1YWwtY29tbWFuZC13b3JkJylcbiAgICB9IGVsc2Uge1xuICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ2luZGl2aWR1YWwtY29tbWFuZC13b3JkJylcbiAgICB9XG5cbiAgICBjb25zdCBxdWVzdGlvbk51bWJlckRpdiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1udW1iZXIga2F0ZXgnLCBjb250YWluZXIpXG4gICAgcXVlc3Rpb25OdW1iZXJEaXYuaW5uZXJIVE1MID0gcU51bWJlclRleHRcblxuICAgIC8vIHJlbmRlciB0aGUgcXVlc3Rpb25cbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQocXVlc3Rpb24uZ2V0RE9NKCkpIC8vIHRoaXMgaXMgYSAucXVlc3Rpb24tZGl2IGVsZW1lbnRcbiAgICBxdWVzdGlvbi5yZW5kZXIoKSAvLyBzb21lIHF1ZXN0aW9ucyBuZWVkIHJlbmRlcmluZyBhZnRlciBhdHRhY2hpbmcgdG8gRE9NXG5cbiAgICAvLyBtYWtlIGhpZGRlbiBhY3Rpb25zIG1lbnVcbiAgICBjb25zdCBhY3Rpb25zID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWFjdGlvbnMgaGlkZGVuJywgY29udGFpbmVyKVxuICAgIGNvbnN0IHJlZnJlc2hJY29uID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLXJlZnJlc2ggaWNvbi1idXR0b24nLCBhY3Rpb25zKVxuICAgIGNvbnN0IGFuc3dlckljb24gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tYW5zd2VyIGljb24tYnV0dG9uJywgYWN0aW9ucylcblxuICAgIGFuc3dlckljb24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICBxdWVzdGlvbi50b2dnbGVBbnN3ZXIoKVxuICAgICAgaGlkZUFsbEFjdGlvbnMoKVxuICAgIH0pXG5cbiAgICByZWZyZXNoSWNvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHRoaXMuZ2VuZXJhdGUoaSwgZGlmZmljdWx0eSlcbiAgICAgIGhpZGVBbGxBY3Rpb25zKClcbiAgICB9KVxuXG4gICAgLy8gUTogaXMgdGhpcyBiZXN0IHdheSAtIG9yIGFuIGV2ZW50IGxpc3RlbmVyIG9uIHRoZSB3aG9sZSBkaXNwbGF5Qm94P1xuICAgIGNvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGUgPT4ge1xuICAgICAgaWYgKCFoYXNBbmNlc3RvckNsYXNzKGUudGFyZ2V0LCAncXVlc3Rpb24tYWN0aW9ucycpKSB7XG4gICAgICAgIC8vIG9ubHkgZG8gdGhpcyBpZiBpdCBkaWRuJ3Qgb3JpZ2luYXRlIGluIGFjdGlvbiBidXR0b25cbiAgICAgICAgdGhpcy5zaG93UXVlc3Rpb25BY3Rpb25zKGUsIGkpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIHRvZ2dsZUFuc3dlcnMgKCkge1xuICAgIGlmICh0aGlzLmFuc3dlcmVkKSB7XG4gICAgICB0aGlzLnF1ZXN0aW9ucy5mb3JFYWNoKHEgPT4ge1xuICAgICAgICBxLnF1ZXN0aW9uLmhpZGVBbnN3ZXIoKVxuICAgICAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgICAgICAgdGhpcy5hbnN3ZXJCdXR0b24uaW5uZXJIVE1MID0gJ1Nob3cgYW5zd2VycydcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucXVlc3Rpb25zLmZvckVhY2gocSA9PiB7XG4gICAgICAgIHEucXVlc3Rpb24uc2hvd0Fuc3dlcigpXG4gICAgICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gICAgICAgIHRoaXMuYW5zd2VyQnV0dG9uLmlubmVySFRNTCA9ICdIaWRlIGFuc3dlcnMnXG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIHNob3dRdWVzdGlvbkFjdGlvbnMgKGV2ZW50LCBxdWVzdGlvbkluZGV4KSB7XG4gICAgLy8gZmlyc3QgaGlkZSBhbnkgb3RoZXIgYWN0aW9uc1xuICAgIGhpZGVBbGxBY3Rpb25zKClcblxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMucXVlc3Rpb25zW3F1ZXN0aW9uSW5kZXhdLmNvbnRhaW5lclxuICAgIGNvbnN0IGFjdGlvbnMgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcignLnF1ZXN0aW9uLWFjdGlvbnMnKVxuXG4gICAgLy8gVW5oaWRlIHRoZSBvdmVybGF5XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm92ZXJsYXknKS5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgIGFjdGlvbnMuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJylcbiAgICBhY3Rpb25zLnN0eWxlLmxlZnQgPSAoY29udGFpbmVyLm9mZnNldFdpZHRoIC8gMiAtIGFjdGlvbnMub2Zmc2V0V2lkdGggLyAyKSArICdweCdcbiAgICBhY3Rpb25zLnN0eWxlLnRvcCA9IChjb250YWluZXIub2Zmc2V0SGVpZ2h0IC8gMiAtIGFjdGlvbnMub2Zmc2V0SGVpZ2h0IC8gMikgKyAncHgnXG4gIH1cblxuICBhcHBlbmRUbyAoZWxlbSkge1xuICAgIGVsZW0uYXBwZW5kQ2hpbGQodGhpcy5vdXRlckJveClcbiAgICB0aGlzLl9pbml0U2xpZGVyKCkgLy8gaGFzIHRvIGJlIGluIGRvY3VtZW50J3MgRE9NIHRvIHdvcmsgcHJvcGVybHlcbiAgfVxuXG4gIGFwcGVuZEJlZm9yZSAocGFyZW50LCBlbGVtKSB7XG4gICAgcGFyZW50Lmluc2VydEJlZm9yZSh0aGlzLm91dGVyQm94LCBlbGVtKVxuICAgIHRoaXMuX2luaXRTbGlkZXIoKSAvLyBoYXMgdG8gYmUgaW4gZG9jdW1lbnQncyBET00gdG8gd29yayBwcm9wZXJseVxuICB9XG59XG5cbmZ1bmN0aW9uIHF1ZXN0aW9uTGV0dGVyIChpKSB7XG4gIC8vIHJldHVybiBhIHF1ZXN0aW9uIG51bWJlci4gZS5nLiBxTnVtYmVyKDApPVwiYVwiLlxuICAvLyBBZnRlciBsZXR0ZXJzLCB3ZSBnZXQgb24gdG8gZ3JlZWtcbiAgdmFyIGxldHRlciA9XG4gICAgICAgIGkgPCAyNiA/IFN0cmluZy5mcm9tQ2hhckNvZGUoMHg2MSArIGkpXG4gICAgICAgICAgOiBpIDwgNTIgPyBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4NDEgKyBpIC0gMjYpXG4gICAgICAgICAgICA6IFN0cmluZy5mcm9tQ2hhckNvZGUoMHgzQjEgKyBpIC0gNTIpXG4gIHJldHVybiBsZXR0ZXJcbn1cblxuZnVuY3Rpb24gaGlkZUFsbEFjdGlvbnMgKGUpIHtcbiAgLy8gaGlkZSBhbGwgcXVlc3Rpb24gYWN0aW9uc1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucXVlc3Rpb24tYWN0aW9ucycpLmZvckVhY2goZWwgPT4ge1xuICAgIGVsLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpXG4gIH0pXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5vdmVybGF5JykuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcbn1cbiIsImltcG9ydCBRdWVzdGlvblNldCBmcm9tICdRdWVzdGlvblNldCdcblxuLy8gVE9ETzpcbi8vICAtIFF1ZXN0aW9uU2V0IC0gcmVmYWN0b3IgaW50byBtb3JlIGNsYXNzZXM/IEUuZy4gb3B0aW9ucyB3aW5kb3dcbi8vICAtIEltcG9ydCBleGlzdGluZyBxdWVzdGlvbiB0eXBlcyAoRyAtIGdyYXBoaWMsIFQgLSB0ZXh0XG4vLyAgICAtIEcgYW5nbGVzXG4vLyAgICAtIEcgYXJlYVxuLy8gICAgLSBUIGVxdWF0aW9uIG9mIGEgbGluZVxuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKCkgPT4ge1xuICBjb25zdCBxcyA9IG5ldyBRdWVzdGlvblNldCgpXG4gIHFzLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpXG59KVxuIl0sIm5hbWVzIjpbImNvbW1vbmpzSGVscGVycy5jcmVhdGVDb21tb25qc01vZHVsZSIsImNvbW1vbmpzSGVscGVycy5nZXREZWZhdWx0RXhwb3J0RnJvbUNqcyIsIlJTbGlkZXIiLCJUb3BpY0Nob29zZXIuZ2V0VG9waWNzIiwiVG9waWNDaG9vc2VyLmhhc09wdGlvbnMiLCJUb3BpY0Nob29zZXIubmV3T3B0aW9uc1NldCIsIlRvcGljQ2hvb3Nlci5nZXRUaXRsZSIsIlRvcGljQ2hvb3Nlci5nZXRDbGFzcyIsIlRvcGljQ2hvb3Nlci5uZXdRdWVzdGlvbiIsIlRvcGljQ2hvb3Nlci5nZXRDb21tYW5kV29yZCJdLCJtYXBwaW5ncyI6Ijs7O0VBQUE7RUFDQTtFQUNBO0FBQ0E7RUFDQSxJQUFJLEVBQUUsR0FBRyxVQUFVLElBQUksRUFBRTtFQUN6QixFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSTtFQUNuQixFQUFFLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSTtFQUMxQixFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSTtFQUNwQixFQUFFLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBQztFQUN0QixFQUFFLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBQztFQUNyQixFQUFFLElBQUksQ0FBQyxZQUFZLEdBQUcsRUFBQztFQUN2QixFQUFFLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSTtF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Q0FBQyxRQUFRLEVBQUU7RUFDckIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLEVBQUU7RUFDL0wsR0FBRztFQUNILEVBQUUsT0FBTyxJQUFJLENBQUMsWUFBWSxFQUFFO0VBQzVCLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLFlBQVk7RUFDeEMsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUM7RUFDeEQsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyw0QkFBMkI7RUFDckQsRUFBRSxJQUFJLENBQUMsUUFBUSxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUM7RUFDekQsRUFBRSxJQUFJLENBQUMsUUFBUSxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEVBQUM7RUFDekUsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUM7QUFDbkQ7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7RUFDekIsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDbEQs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LENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFDO0VBQy9ELE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDN0QsS0FBSztFQUNMLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDcEcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSTtFQUM3RixHQUFHLE1BQU07RUFDVCxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQyxFQUFFO0VBQ3RGLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDeEQsR0FBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUM7RUFDbEcsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxFQUFDO0FBQ2xEO0VBQ0EsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUk7RUFDdEYsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFJO0FBQ2pFO0VBQ0EsRUFBRSxPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDeEIsRUFBQztBQUNEO0VBQ0EsRUFBRSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDLEVBQUU7RUFDekMsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU07QUFDaEM7RUFDQSxFQUFFLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLElBQUksRUFBQztBQUNqRTtFQUNBLEVBQUUsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUM7RUFDMUUsRUFBRSxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLEVBQUM7QUFDdEI7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FB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Q0FBQyxDQUFDO0VBQzdCLE1BQU07RUFDTixNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxLQUFLO0FBQ0w7RUFDQTtFQUNBLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDMUIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osS0FBSztBQUNMO0VBQ0EsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDM0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7QUFDM0M7RUFDQTtFQUNBLElBQUksTUFBTSxRQUFRLEdBQUcsQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLGVBQWUs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QUMsRUFBRSxLQUFLLEVBQUU7RUFDakMsSUFBSSxLQUFLLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBRztFQUNqQyxJQUFJLE9BQU8sS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDO0VBQ3BDLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxJQUFJLENBQUMsQ0FBQyxHQUFHLE1BQU0sRUFBRTtFQUMxQixJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUM7RUFDN0QsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQzdELElBQUksTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLE9BQU07QUFDM0I7RUFDQSxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDO0VBQ3hDLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUM1QjtFQUNBLElBQUksTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ2xDLElBQUksTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ2xDLElBQUksTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0FBQ2xDO0VBQ0EsSUFBSSxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDL0IsSUFBSSxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDNUMsSUFBSSxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7QUFDNUM7RUFDQSxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxHQUFHLFNBQVMsRUFBRSxJQUFJLEdBQUcsU0FBUyxDQUFDO0VBQ3hELEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUU7RUFDdEIsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFDO0VBQ3BFLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBQztFQUNwRSxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQztFQUNoQyxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFO0VBQ3RCLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDO0VBQ3JFLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDO0VBQ3JFLElBQUksT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO0VBQ2hDLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUU7RUFDekIsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFDO0VBQ3BFLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBQztFQUNwRSxJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQztFQUNyRSxJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQztFQUNyRSxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDO0VBQzFELEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxVQUFVLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQzdCO0VBQ0E7RUFDQSxJQUFJLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUM7RUFDNUIsSUFBSSxNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFDO0VBQzVCLElBQUksTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFDO0VBQ3pDLElBQUksT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLEdBQUcsTUFBTSxFQUFFO0VBQ2pELEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQzNCLElBQUksT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDL0MsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRTtFQUMzQztFQUNBO0VBQ0EsSUFBSSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUM7RUFDbEQsSUFBSSxJQUFJLENBQUMsSUFBSSxPQUFPLEVBQUUsT0FBTyxLQUFLO0FBQ2xDO0VBQ0EsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxDQUFDLElBQUksRUFBQztFQUNoQyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxF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QUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDOUUsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUMzQixRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0FBQ25CO0VBQ0E7QUFDQTtFQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRTtFQUN2QyxVQUFVLE9BQU8sSUFBSSxRQUFRLEVBQUU7RUFDL0IsU0FBUztFQUNULFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUM5RSxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxJQUFJLEVBQUUsVUFBVSxNQUFNLEVBQUU7RUFDOUIsUUFBUSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxJQUFJLENBQUMsRUFBQztBQUMxQztFQUNBLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDNUMsVUFBVSxPQUFPLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQztFQUNsQyxTQUFTO0VBQ1QsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0VBQ2pGLE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEtBQUssRUFBRSxVQUFVLE1BQU0sRUFBRTtFQUMvQixRQUFRLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxNQUFNLElBQUksQ0FBQyxFQUFDO0FBQzFDO0VBQ0EsUUFBUSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUM1QyxVQUFVLE9BQU8sSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDO0VBQ2xDLFNBQVM7RUFDVCxRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDbEYsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sS0FBSyxFQUFFLFVBQVUsTUFBTSxFQUFFO0VBQy9CLFFBQVEsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxDQUFDLEVBQUM7QUFDMUM7RUFDQSxRQUFRLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzVDLFVBQVUsT0FBTyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUM7RUFDbEMsU0FBUztFQUNULFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdB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QUFRLENBQUMsRUFBRTtFQUNyQyxNQUFNLElBQUksR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUM7RUFDL0IsS0FBSztFQUNMLElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBQztFQUM3QixJQUFJLElBQUksRUFBRSxHQUFHLElBQUksR0FBRyxHQUFFO0VBQ3RCLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxLQUFLO0VBQ3pDLE1BQU0sSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtFQUNqQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFDO0VBQ3ZFLE9BQU8sTUFBTTtFQUNiLFFBQVEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUM7RUFDL0MsT0FBTztFQUNQLEtBQUssRUFBQztBQUNOO0VBQ0EsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEtBQUs7RUFDekMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtFQUM3QixRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFDO0VBQy9DLE9BQU87RUFDUCxLQUFLLEVBQUM7RUFDTixJQUFJLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUM7RUFDMUMsSUFBSSxPQUFP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RUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDckQsVUFBVSxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxLQUFLLEdBQUcsS0FBSyxHQUFHLFNBQVE7RUFDN0QsVUFBVSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHO0VBQzdCLFlBQVksR0FBRyxFQUFFLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQztFQUNyQyxZQUFZLE1BQU0sRUFBRSxLQUFLO0VBQ3pCLFlBQVc7RUFDWCxTQUFTO0VBQ1QsUUFBUSxLQUFLO0VBQ2IsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsRUFBRTtFQUNkLFFBQVEsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFDO0VBQ25FLFFBQVEsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFDO0VBQ25FLFFBQVEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDekMsVUFBVSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUNyRCxVQUFVLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFBQztFQUMzRCxVQUFVLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUc7RUFDN0IsWUFBWSxHQUFHLEVBQUUsSUFBSSxVQUFVLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQztFQUNqRCxZQUFZLE1BQU0sRUFBRSxLQUFLO0VBQ3pCLFlBQVc7RUFDWCxTQUFTO0VBQ1QsUUFBUSxLQUFLO0VBQ2IsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsRUFBRTtFQUNkLFFB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VSxJQUFJLElBQUksR0FBRyxNQUFLO0VBQzFCLFVBQVUsSUFBSSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksSUFBSSxTQUFRO0VBQ3pELFVBQVUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLElBQUksR0FBRyxHQUFHLFNBQVE7RUFDakQsVUFBVSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHO0VBQzdCLFlBQVksR0FBRyxFQUFFLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQztFQUNyQyxZQUFZLE1BQU0sRUFBRSxLQUFLO0VBQ3pCLFlBQVc7RUFDWCxTQUFTO0VBQ1QsUUFBUSxLQUFLO0VBQ2IsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsRUFBRTtFQUNkLFFBQVEsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUM7RUFDL0MsUUFBUSxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBQztFQUNsRCxRQUFRLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBQztFQUN0RCxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3pDLFVBQVUsTUFBTSxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDbEQsVUFBVSxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDeEQsVUFBVSxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDeEQsVUFBVSxJQUFJLElBQUksR0FBRyxFQUFFLEdBQUcs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TUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBQztBQUM5RDtFQUNBLElBQUksR0FBRyxDQUFDLFNBQVMsR0FBRTtFQUNuQixJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDbEMsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQ2xDLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQzVDLE1BQU0sR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQztFQUNwQyxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDMUMsS0FBSztFQUNMLElBQUksR0FBRyxDQUFDLFdBQVcsR0FBRyxPQUFNO0VBQzVCLElBQUksR0FBRyxDQUFDLE1BQU0sR0FBRTtFQUNoQixJQUFJLEdBQUcsQ0FBQyxTQUFTLEdBQUU7QUFDbkI7RUFDQSxJQUFJLEdBQUcsQ0FBQyxTQUFTLEdBQUU7RUFDbkIsSUFBSSxJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUTtFQUNsQyxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDdEQsTUFBTSxNQUFNLEtBQUssR0FBRyxJQUFJLENB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TSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQUs7RUFDNUIsSUFBSSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTTtBQUM5QjtFQUNBO0VBQ0EsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDNUIsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDbEQsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksS0FBSztFQUN0QixNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7RUFDbEUsTUFBSztBQUNMO0VBQ0E7RUFDQSxJQUFJLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUM7QUFDM0Q7RUFDQSxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUM7RUFDYixJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDaEMsTUFBTSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQzNDO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxJQUFJLE1BQUs7RUFDZixNQUFNLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDaEMsUUFBUSxLQUFLLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FB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R0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQztFQUNyRCxJQUFJLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBQztFQUNuRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLE1BQU0sR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBQztFQUMvRCxHQUFHO0FBQ0g7RUFDQSxFQUFFLE1BQU0sQ0FBQyxHQUFHO0VBQ1osSUFBSSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUM7RUFDNUMsSUFBSSxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFDO0VBQzdDLElBQUksTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFJO0FBQy9CO0VBQ0EsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUM7QUFDOUQ7RUFDQSxJQUFJLEdBQUcsQ0FBQyxTQUFTLEdBQUU7RUFDbkIsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQ2xDO0VBQ0EsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ2hDLE1BQU0sTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBQztFQUMzQixNQUFNLE1BQU0sSUFBSSxHQUFH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
