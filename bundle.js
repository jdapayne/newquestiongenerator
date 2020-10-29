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
    // 'Abstract' class for questions
    // For now, this does nothing other than document the expected methods
    constructor (options) {
      this.DOM = document.createElement('div');
      this.DOM.className = 'question-div';
      this.answered = false;
    }

    getDOM () {
      return this.DOM
    }

    render () {
      // render into the DOM
    }

    showAnswer () {
      this.answered = true;
    }

    hideAnswer () {
      this.answered = false;
    }

    toggleAnswer () {
      if (this.answered) {
        this.hideAnswer();
      } else {
        this.showAnswer();
      }
    }

    static get commandWord () { return '' }
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

  /* global katex */

  class GraphicQ extends Question {
    constructor (options) {
      super(); // this.answered = false
      delete (this.DOM); // going to override getDOM using the view's DOM

      const defaults = {
        difficulty: 5,
        width: 250,
        height: 250
      };
      this.settings = Object.assign({}, defaults, options); // this could be overridden

      /* These are guaranteed to be overridden, so no point initializing here
       *
       *  this.data = new GraphicQData(options)
       *  this.view = new GraphicQView(this.data, options)
       *
       */
    }

    getDOM () { return this.view.getDOM() }

    render () { this.view.render(); }

    showAnswer () {
      super.showAnswer();
      this.view.showAnswer();
    }

    hideAnswer () {
      super.hideAnswer();
      this.view.hideAnswer();
    }
  }

  /* GraphicQData
   * Each subclass will probably have one of these. But they're completely custon
   * to the question type - so no need to subclass
   *
   *    export class GraphicQData {
   *      constructor (options) {
   *      }
   *      [other initialisation methods]
   *    }
   *
  */

  class GraphicQView {
    constructor (data, options) {
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

    getDOM () {
      return this.DOM
    }

    render () {
      this.renderLabels(); // will be overwritten
    }

    renderLabels (nudge) {
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
        label.classList += ' ' + l.style;
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

    showAnswer () {
      this.labels.forEach(l => {
        l.text = l.texta;
        l.style = l.stylea;
      });
      this.renderLabels();
      this.answered = true;
    }

    hideAnswer () {
      this.labels.forEach(l => {
        l.text = l.textq;
        l.style = l.styleq;
      });
      this.renderLabels();
      this.answered = false;
    }

    // Point tranformations of all points

    get allpoints () {
      return []
    }

    scale (sf) {
      this.allpoints.forEach(function (p) {
        p.scale(sf);
      });
    }

    rotate (angle) {
      this.allpoints.forEach(function (p) {
        p.rotate(angle);
      });
      return angle
    }

    translate (x, y) {
      this.allpoints.forEach(function (p) {
        p.translate(x, y);
      });
    }

    randomRotate () {
      var angle = 2 * Math.PI * Math.random();
      this.rotate(angle);
      return angle
    }

    scaleToFit (width, height, margin) {
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
      super(); // processes options into this.settings
      Object.assign(this.settings, options); // override settings with new options passed
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

  /* Generates and holds data for a missing angles question, where these is some given angle sum
   * Agnostic as to how these angles are arranged (e.g. in a polygon or around som point)
   */

  class MissingAnglesNumberData /* extends GraphicQData */ {
    // this.angles :: [Int] -- list of angles
    // this.missing :: [Bool] -- true if missing
    // this.angleSum :: what the angles add up to
    constructor (options) {
      const defaults = {
        /* angleSum: 180 */ // must be set by caller
        minAngle: 10,
        minN: 2,
        maxN: 4
      };
      this.settings = Object.assign({}, defaults, options);

      if (!this.settings.angleSum) { throw new Error('No angle sum given') }

      this.initRandom();
    }

    init (angleSum, angles, missing) {
      // initialises with angles given explicitly
      if (angles === []) { throw new Error('argument must not be empty') }
      if (Math.round(angles.reduce((x, y) => x + y)) !== angleSum) {
        throw new Error('Angle sum must be ' + angleSum)
      }

      this.angles = angles; // list of angles
      this.missing = missing; // which angles are missing - array of booleans
      this.angleSum = angleSum; // sum of angles
    }

    initRandom () {
      const angleSum = this.settings.angleSum;
      const n = this.settings.n
        ? this.settings.n
        : randBetween(this.settings.minN, this.settings.maxN);
      const minAngle = this.settings.minAngle;

      if (n < 2) throw new Error('Can\'t have missing fewer than 2 angles')

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

      this.init(angleSum, angles, missing);
    }
  }

  /* Question type comprising numerical missing angles around a point and
   * angles on a straight line (since these are very similar numerically as well
   * as graphically.
   *
   * Also covers cases where more than one angle is equal
   *
   */

  class AnglesFormingQ extends GraphicQ {
    constructor (options) {
      super(); // processes options into this.settings

      const defaults = {
        angleSum: 180,
        minAngle: 10,
        minN: 2,
        maxN: 4
      };

      // Order of importance
      // (1) options passed to this constructor
      // (2) defaults for this constructor
      // (3) any options set from parent constructor
      //
      Object.assign(this.settings, defaults, options);

      this.data = new MissingAnglesNumberData(this.settings);
      this.view = new MissingAnglesAroundView(this.data, this.settings);
    }

    static get commandWord () { return 'Find the missing value' }
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
      const centroid = Point.mean(this.A, this.B, this.C);

      for (let i = 0; i < 3; i++) {
        const p = [this.A, this.B, this.C][i];
        this.labels[i] = {
          pos: Point.mean(p, p, centroid), // weighted mean - position from centroid
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

  /* Missing angles in triangle - numerical */

  class AnglesFormingQ$1 extends GraphicQ {
    constructor (options) {
      super(); // processes options into this.settings

      const defaults = {
        angleSum: 180,
        minAngle: 10,
        minN: 3,
        maxN: 3
      };

      // Order of importance
      // (1) options passed to this constructor
      // (2) defaults for this constructor
      // (3) any options set from parent constructor
      //
      Object.assign(this.settings, defaults, options);

      this.data = new MissingAnglesNumberData(this.settings);
      this.view = new MissingAnglesTriangleView(this.data, this.settings);
    }

    static get commandWord () { return 'Find the missing value' }
  }

  /* Class to wrap various missing angles classes
   * Reads options and then wraps the appropriate object, mirroring the main
   * public methods
  */

  class MissingAnglesQ {
    constructor (options) {
      // options.types = ['aosl' | 'aaap' | 'triangle']
      // options.difficulty :: integer
      // options.custom :: Boolean
      // options.subtype :: 'simple' | 'repeated' | 'algebra' | 'worded'

      if (!options.types || !Array.isArray(options.types) || options.types.length === 0) {
        throw new Error(`Unsupported types list ${options.types}`)
      }
      const type = randElem(options.types);

      switch (type) {
        case 'aosl': {
          const options = { angleSum: 180 };
          this.question = new AnglesFormingQ(options);
          break
        }
        case 'aaap': {
          const options = { angleSum: 360 };
          this.question = new AnglesFormingQ(options);
          break
        }
        case 'triangle': {
          this.question = new AnglesFormingQ$1();
          break
        }
        default:
          throw new Error(`Unknown type ${type} chosen from ${options.types}`)
      }
    }

    getDOM () { return this.question.getDOM() }
    render () { return this.question.render() }
    showAnswer () { return this.question.showAnswer() }
    hideAnswer () { return this.question.hideAnswer() }
    toggleAnswer () { return this.question.toggleAnswer() }

    static get optionsSpec () {
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
      ]
    }

    static get commandWord () {
      return 'Find the missing value'
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
      id: 'aosl',
      title: 'Angles on a straight line',
      class: AnglesFormingQ
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
    return new (getClass(id))(options)
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
      this.topicChooserButton.addEventListener('click', e => this.chooseTopics());

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
      nQuestionsInput.addEventListener('change', e => {
        this.n = parseInt(nQuestionsInput.value);
      });

      this.generateButton = createElem('button', 'generate-button button', this.headerBox);
      this.generateButton.disabled = true;
      this.generateButton.innerHTML = 'Generate!';
      this.generateButton.addEventListener('click', e => this.generateAll());
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
        onClose: x => {
          this.updateTopics();
        }
      });

      this.topicsModal.addFooterBtn(
        'OK',
        'button modal-button',
        x => {
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
        x => {
          modal.close();
        });

      optionsSet.renderIn(modal.modalBoxContent);

      // link the modal to the button
      optionsButton.addEventListener('click', e => {
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
      this.answerButton.addEventListener('click', e => {
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

      answerIcon.addEventListener('click', e => {
        question.toggleAnswer();
        hideAllActions();
      });

      refreshIcon.addEventListener('click', e => {
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

  document.addEventListener('DOMContentLoaded', x => {
    const qs = new QuestionSet();
    qs.appendTo(document.body);
  });

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlcyI6WyJtb2R1bGVzL3ZlbmRvci9yc2xpZGVyLmpzIiwibW9kdWxlcy9VdGlsaXRpZXMubWpzIiwibW9kdWxlcy9PcHRpb25zU2V0Lm1qcyIsIm1vZHVsZXMvUXVlc3Rpb24vUXVlc3Rpb24ubWpzIiwibW9kdWxlcy9RdWVzdGlvbi9UZXh0US9UZXh0US5tanMiLCJtb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FsZ2VicmFpY0ZyYWN0aW9uUS5tanMiLCJtb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0ludGVnZXJBZGQubWpzIiwibW9kdWxlcy9Qb2ludC5tanMiLCJtb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRLm1qcyIsIm1vZHVsZXMvdmVuZG9yL2ZyYWN0aW9uLmpzIiwibW9kdWxlcy9Nb25vbWlhbC5qcyIsIm1vZHVsZXMvUG9seW5vbWlhbC5qcyIsIm1vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvQXJpdGhtYWdvblEubWpzIiwibW9kdWxlcy9RdWVzdGlvbi9UZXh0US9UZXN0US5tanMiLCJtb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FkZEFaZXJvLm1qcyIsIm1vZHVsZXMvUXVlc3Rpb24vVGV4dFEvRXF1YXRpb25PZkxpbmUubWpzIiwibW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRWaWV3Lm1qcyIsIm1vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YS5tanMiLCJtb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvQW5nbGVzRm9ybWluZ1EubWpzIiwibW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcubWpzIiwibW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVEubWpzIiwibW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNXcmFwcGVyLm1qcyIsIm1vZHVsZXMvVG9waWNDaG9vc2VyLm1qcyIsIm1vZHVsZXMvdmVuZG9yL1RpbmdsZS5qcyIsIm1vZHVsZXMvUXVlc3Rpb25TZXQubWpzIiwibWFpbi5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBSc2xpZGVyLiBEb3dubG9hZGVkIGZyb20gaHR0cHM6Ly9zbGF3b21pci16YXppYWJsby5naXRodWIuaW8vcmFuZ2Utc2xpZGVyL1xuICogTW9kaWZpZWQgdG8gbWFrZSBpbnRvIEVTNiBtb2R1bGUgYW5kIGZpeCBhIGZldyBidWdzXG4gKi9cblxudmFyIFJTID0gZnVuY3Rpb24gKGNvbmYpIHtcbiAgdGhpcy5pbnB1dCA9IG51bGxcbiAgdGhpcy5pbnB1dERpc3BsYXkgPSBudWxsXG4gIHRoaXMuc2xpZGVyID0gbnVsbFxuICB0aGlzLnNsaWRlcldpZHRoID0gMFxuICB0aGlzLnNsaWRlckxlZnQgPSAwXG4gIHRoaXMucG9pbnRlcldpZHRoID0gMFxuICB0aGlzLnBvaW50ZXJSID0gbnVsbFxuICB0aGlzLnBvaW50ZXJMID0gbnVsbFxuICB0aGlzLmFjdGl2ZVBvaW50ZXIgPSBudWxsXG4gIHRoaXMuc2VsZWN0ZWQgPSBudWxsXG4gIHRoaXMuc2NhbGUgPSBudWxsXG4gIHRoaXMuc3RlcCA9IDBcbiAgdGhpcy50aXBMID0gbnVsbFxuICB0aGlzLnRpcFIgPSBudWxsXG4gIHRoaXMudGltZW91dCA9IG51bGxcbiAgdGhpcy52YWxSYW5nZSA9IGZhbHNlXG5cbiAgdGhpcy52YWx1ZXMgPSB7XG4gICAgc3RhcnQ6IG51bGwsXG4gICAgZW5kOiBudWxsXG4gIH1cbiAgdGhpcy5jb25mID0ge1xuICAgIHRhcmdldDogbnVsbCxcbiAgICB2YWx1ZXM6IG51bGwsXG4gICAgc2V0OiBudWxsLFxuICAgIHJhbmdlOiBmYWxzZSxcbiAgICB3aWR0aDogbnVsbCxcbiAgICBzY2FsZTogdHJ1ZSxcbiAgICBsYWJlbHM6IHRydWUsXG4gICAgdG9vbHRpcDogdHJ1ZSxcbiAgICBzdGVwOiBudWxsLFxuICAgIGRpc2FibGVkOiBmYWxzZSxcbiAgICBvbkNoYW5nZTogbnVsbFxuICB9XG5cbiAgdGhpcy5jbHMgPSB7XG4gICAgY29udGFpbmVyOiAncnMtY29udGFpbmVyJyxcbiAgICBiYWNrZ3JvdW5kOiAncnMtYmcnLFxuICAgIHNlbGVjdGVkOiAncnMtc2VsZWN0ZWQnLFxuICAgIHBvaW50ZXI6ICdycy1wb2ludGVyJyxcbiAgICBzY2FsZTogJ3JzLXNjYWxlJyxcbiAgICBub3NjYWxlOiAncnMtbm9zY2FsZScsXG4gICAgdGlwOiAncnMtdG9vbHRpcCdcbiAgfVxuXG4gIGZvciAodmFyIGkgaW4gdGhpcy5jb25mKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY29uZiwgaSkpIHRoaXMuY29uZltpXSA9IGNvbmZbaV0gfVxuXG4gIHRoaXMuaW5pdCgpXG59XG5cblJTLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICBpZiAodHlwZW9mIHRoaXMuY29uZi50YXJnZXQgPT09ICdvYmplY3QnKSB0aGlzLmlucHV0ID0gdGhpcy5jb25mLnRhcmdldFxuICBlbHNlIHRoaXMuaW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLmNvbmYudGFyZ2V0LnJlcGxhY2UoJyMnLCAnJykpXG5cbiAgaWYgKCF0aGlzLmlucHV0KSByZXR1cm4gY29uc29sZS5sb2coJ0Nhbm5vdCBmaW5kIHRhcmdldCBlbGVtZW50Li4uJylcblxuICB0aGlzLmlucHV0RGlzcGxheSA9IGdldENvbXB1dGVkU3R5bGUodGhpcy5pbnB1dCwgbnVsbCkuZGlzcGxheVxuICB0aGlzLmlucHV0LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSdcbiAgdGhpcy52YWxSYW5nZSA9ICEodGhpcy5jb25mLnZhbHVlcyBpbnN0YW5jZW9mIEFycmF5KVxuXG4gIGlmICh0aGlzLnZhbFJhbmdlKSB7XG4gICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGhpcy5jb25mLnZhbHVlcywgJ21pbicpIHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGhpcy5jb25mLnZhbHVlcywgJ21heCcpKSB7IHJldHVybiBjb25zb2xlLmxvZygnTWlzc2luZyBtaW4gb3IgbWF4IHZhbHVlLi4uJykgfVxuICB9XG4gIHJldHVybiB0aGlzLmNyZWF0ZVNsaWRlcigpXG59XG5cblJTLnByb3RvdHlwZS5jcmVhdGVTbGlkZXIgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc2xpZGVyID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMuY29udGFpbmVyKVxuICB0aGlzLnNsaWRlci5pbm5lckhUTUwgPSAnPGRpdiBjbGFzcz1cInJzLWJnXCI+PC9kaXY+J1xuICB0aGlzLnNlbGVjdGVkID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMuc2VsZWN0ZWQpXG4gIHRoaXMucG9pbnRlckwgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy5wb2ludGVyLCBbJ2RpcicsICdsZWZ0J10pXG4gIHRoaXMuc2NhbGUgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy5zY2FsZSlcblxuICBpZiAodGhpcy5jb25mLnRvb2x0aXApIHtcbiAgICB0aGlzLnRpcEwgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy50aXApXG4gICAgdGhpcy50aXBSID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMudGlwKVxuICAgIHRoaXMucG9pbnRlckwuYXBwZW5kQ2hpbGQodGhpcy50aXBMKVxuICB9XG4gIHRoaXMuc2xpZGVyLmFwcGVuZENoaWxkKHRoaXMuc2VsZWN0ZWQpXG4gIHRoaXMuc2xpZGVyLmFwcGVuZENoaWxkKHRoaXMuc2NhbGUpXG4gIHRoaXMuc2xpZGVyLmFwcGVuZENoaWxkKHRoaXMucG9pbnRlckwpXG5cbiAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgIHRoaXMucG9pbnRlclIgPSBjcmVhdGVFbGVtZW50KCdkaXYnLCB0aGlzLmNscy5wb2ludGVyLCBbJ2RpcicsICdyaWdodCddKVxuICAgIGlmICh0aGlzLmNvbmYudG9vbHRpcCkgdGhpcy5wb2ludGVyUi5hcHBlbmRDaGlsZCh0aGlzLnRpcFIpXG4gICAgdGhpcy5zbGlkZXIuYXBwZW5kQ2hpbGQodGhpcy5wb2ludGVyUilcbiAgfVxuXG4gIHRoaXMuaW5wdXQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5zbGlkZXIsIHRoaXMuaW5wdXQubmV4dFNpYmxpbmcpXG5cbiAgaWYgKHRoaXMuY29uZi53aWR0aCkgdGhpcy5zbGlkZXIuc3R5bGUud2lkdGggPSBwYXJzZUludCh0aGlzLmNvbmYud2lkdGgpICsgJ3B4J1xuICB0aGlzLnNsaWRlckxlZnQgPSB0aGlzLnNsaWRlci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0XG4gIHRoaXMuc2xpZGVyV2lkdGggPSB0aGlzLnNsaWRlci5jbGllbnRXaWR0aFxuICB0aGlzLnBvaW50ZXJXaWR0aCA9IHRoaXMucG9pbnRlckwuY2xpZW50V2lkdGhcblxuICBpZiAoIXRoaXMuY29uZi5zY2FsZSkgdGhpcy5zbGlkZXIuY2xhc3NMaXN0LmFkZCh0aGlzLmNscy5ub3NjYWxlKVxuXG4gIHJldHVybiB0aGlzLnNldEluaXRpYWxWYWx1ZXMoKVxufVxuXG5SUy5wcm90b3R5cGUuc2V0SW5pdGlhbFZhbHVlcyA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5kaXNhYmxlZCh0aGlzLmNvbmYuZGlzYWJsZWQpXG5cbiAgaWYgKHRoaXMudmFsUmFuZ2UpIHRoaXMuY29uZi52YWx1ZXMgPSBwcmVwYXJlQXJyYXlWYWx1ZXModGhpcy5jb25mKVxuXG4gIHRoaXMudmFsdWVzLnN0YXJ0ID0gMFxuICB0aGlzLnZhbHVlcy5lbmQgPSB0aGlzLmNvbmYucmFuZ2UgPyB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEgOiAwXG5cbiAgaWYgKHRoaXMuY29uZi5zZXQgJiYgdGhpcy5jb25mLnNldC5sZW5ndGggJiYgY2hlY2tJbml0aWFsKHRoaXMuY29uZikpIHtcbiAgICB2YXIgdmFscyA9IHRoaXMuY29uZi5zZXRcblxuICAgIGlmICh0aGlzLmNvbmYucmFuZ2UpIHtcbiAgICAgIHRoaXMudmFsdWVzLnN0YXJ0ID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHZhbHNbMF0pXG4gICAgICB0aGlzLnZhbHVlcy5lbmQgPSB0aGlzLmNvbmYuc2V0WzFdID8gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHZhbHNbMV0pIDogbnVsbFxuICAgIH0gZWxzZSB0aGlzLnZhbHVlcy5lbmQgPSB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YodmFsc1swXSlcbiAgfVxuICByZXR1cm4gdGhpcy5jcmVhdGVTY2FsZSgpXG59XG5cblJTLnByb3RvdHlwZS5jcmVhdGVTY2FsZSA9IGZ1bmN0aW9uIChyZXNpemUpIHtcbiAgdGhpcy5zdGVwID0gdGhpcy5zbGlkZXJXaWR0aCAvICh0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpXG5cbiAgZm9yICh2YXIgaSA9IDAsIGlMZW4gPSB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aDsgaSA8IGlMZW47IGkrKykge1xuICAgIHZhciBzcGFuID0gY3JlYXRlRWxlbWVudCgnc3BhbicpXG4gICAgdmFyIGlucyA9IGNyZWF0ZUVsZW1lbnQoJ2lucycpXG5cbiAgICBzcGFuLmFwcGVuZENoaWxkKGlucylcbiAgICB0aGlzLnNjYWxlLmFwcGVuZENoaWxkKHNwYW4pXG5cbiAgICBzcGFuLnN0eWxlLndpZHRoID0gaSA9PT0gaUxlbiAtIDEgPyAwIDogdGhpcy5zdGVwICsgJ3B4J1xuXG4gICAgaWYgKCF0aGlzLmNvbmYubGFiZWxzKSB7XG4gICAgICBpZiAoaSA9PT0gMCB8fCBpID09PSBpTGVuIC0gMSkgaW5zLmlubmVySFRNTCA9IHRoaXMuY29uZi52YWx1ZXNbaV1cbiAgICB9IGVsc2UgaW5zLmlubmVySFRNTCA9IHRoaXMuY29uZi52YWx1ZXNbaV1cblxuICAgIGlucy5zdHlsZS5tYXJnaW5MZWZ0ID0gKGlucy5jbGllbnRXaWR0aCAvIDIpICogLTEgKyAncHgnXG4gIH1cbiAgcmV0dXJuIHRoaXMuYWRkRXZlbnRzKClcbn1cblxuUlMucHJvdG90eXBlLnVwZGF0ZVNjYWxlID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnN0ZXAgPSB0aGlzLnNsaWRlcldpZHRoIC8gKHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSlcblxuICB2YXIgcGllY2VzID0gdGhpcy5zbGlkZXIucXVlcnlTZWxlY3RvckFsbCgnc3BhbicpXG5cbiAgZm9yICh2YXIgaSA9IDAsIGlMZW4gPSBwaWVjZXMubGVuZ3RoOyBpIDwgaUxlbiAtIDE7IGkrKykgeyBwaWVjZXNbaV0uc3R5bGUud2lkdGggPSB0aGlzLnN0ZXAgKyAncHgnIH1cblxuICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxufVxuXG5SUy5wcm90b3R5cGUuYWRkRXZlbnRzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcG9pbnRlcnMgPSB0aGlzLnNsaWRlci5xdWVyeVNlbGVjdG9yQWxsKCcuJyArIHRoaXMuY2xzLnBvaW50ZXIpXG4gIHZhciBwaWVjZXMgPSB0aGlzLnNsaWRlci5xdWVyeVNlbGVjdG9yQWxsKCdzcGFuJylcblxuICBjcmVhdGVFdmVudHMoZG9jdW1lbnQsICdtb3VzZW1vdmUgdG91Y2htb3ZlJywgdGhpcy5tb3ZlLmJpbmQodGhpcykpXG4gIGNyZWF0ZUV2ZW50cyhkb2N1bWVudCwgJ21vdXNldXAgdG91Y2hlbmQgdG91Y2hjYW5jZWwnLCB0aGlzLmRyb3AuYmluZCh0aGlzKSlcblxuICBmb3IgKGxldCBpID0gMCwgaUxlbiA9IHBvaW50ZXJzLmxlbmd0aDsgaSA8IGlMZW47IGkrKykgeyBjcmVhdGVFdmVudHMocG9pbnRlcnNbaV0sICdtb3VzZWRvd24gdG91Y2hzdGFydCcsIHRoaXMuZHJhZy5iaW5kKHRoaXMpKSB9XG5cbiAgZm9yIChsZXQgaSA9IDAsIGlMZW4gPSBwaWVjZXMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7IGNyZWF0ZUV2ZW50cyhwaWVjZXNbaV0sICdjbGljaycsIHRoaXMub25DbGlja1BpZWNlLmJpbmQodGhpcykpIH1cblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5vblJlc2l6ZS5iaW5kKHRoaXMpKVxuXG4gIHJldHVybiB0aGlzLnNldFZhbHVlcygpXG59XG5cblJTLnByb3RvdHlwZS5kcmFnID0gZnVuY3Rpb24gKGUpIHtcbiAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgaWYgKHRoaXMuY29uZi5kaXNhYmxlZCkgcmV0dXJuXG5cbiAgdmFyIGRpciA9IGUudGFyZ2V0LmdldEF0dHJpYnV0ZSgnZGF0YS1kaXInKVxuICBpZiAoZGlyID09PSAnbGVmdCcpIHRoaXMuYWN0aXZlUG9pbnRlciA9IHRoaXMucG9pbnRlckxcbiAgaWYgKGRpciA9PT0gJ3JpZ2h0JykgdGhpcy5hY3RpdmVQb2ludGVyID0gdGhpcy5wb2ludGVyUlxuXG4gIHJldHVybiB0aGlzLnNsaWRlci5jbGFzc0xpc3QuYWRkKCdzbGlkaW5nJylcbn1cblxuUlMucHJvdG90eXBlLm1vdmUgPSBmdW5jdGlvbiAoZSkge1xuICBpZiAodGhpcy5hY3RpdmVQb2ludGVyICYmICF0aGlzLmNvbmYuZGlzYWJsZWQpIHtcbiAgICB2YXIgY29vcmRYID0gZS50eXBlID09PSAndG91Y2htb3ZlJyA/IGUudG91Y2hlc1swXS5jbGllbnRYIDogZS5wYWdlWFxuICAgIHZhciBpbmRleCA9IGNvb3JkWCAtIHRoaXMuc2xpZGVyTGVmdCAtICh0aGlzLnBvaW50ZXJXaWR0aCAvIDIpXG5cbiAgICBpbmRleCA9IE1hdGgucm91bmQoaW5kZXggLyB0aGlzLnN0ZXApXG5cbiAgICBpZiAoaW5kZXggPD0gMCkgaW5kZXggPSAwXG4gICAgaWYgKGluZGV4ID4gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKSBpbmRleCA9IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMVxuXG4gICAgaWYgKHRoaXMuY29uZi5yYW5nZSkge1xuICAgICAgaWYgKHRoaXMuYWN0aXZlUG9pbnRlciA9PT0gdGhpcy5wb2ludGVyTCkgdGhpcy52YWx1ZXMuc3RhcnQgPSBpbmRleFxuICAgICAgaWYgKHRoaXMuYWN0aXZlUG9pbnRlciA9PT0gdGhpcy5wb2ludGVyUikgdGhpcy52YWx1ZXMuZW5kID0gaW5kZXhcbiAgICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gaW5kZXhcblxuICAgIHJldHVybiB0aGlzLnNldFZhbHVlcygpXG4gIH1cbn1cblxuUlMucHJvdG90eXBlLmRyb3AgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuYWN0aXZlUG9pbnRlciA9IG51bGxcbn1cblxuUlMucHJvdG90eXBlLnNldFZhbHVlcyA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gIHZhciBhY3RpdmVQb2ludGVyID0gdGhpcy5jb25mLnJhbmdlID8gJ3N0YXJ0JyA6ICdlbmQnXG5cbiAgaWYgKHN0YXJ0ICYmIHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZihzdGFydCkgPiAtMSkgeyB0aGlzLnZhbHVlc1thY3RpdmVQb2ludGVyXSA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZihzdGFydCkgfVxuXG4gIGlmIChlbmQgJiYgdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKGVuZCkgPiAtMSkgeyB0aGlzLnZhbHVlcy5lbmQgPSB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2YoZW5kKSB9XG5cbiAgaWYgKHRoaXMuY29uZi5yYW5nZSAmJiB0aGlzLnZhbHVlcy5zdGFydCA+IHRoaXMudmFsdWVzLmVuZCkgeyB0aGlzLnZhbHVlcy5zdGFydCA9IHRoaXMudmFsdWVzLmVuZCB9XG5cbiAgdGhpcy5wb2ludGVyTC5zdHlsZS5sZWZ0ID0gKHRoaXMudmFsdWVzW2FjdGl2ZVBvaW50ZXJdICogdGhpcy5zdGVwIC0gKHRoaXMucG9pbnRlcldpZHRoIC8gMikpICsgJ3B4J1xuXG4gIGlmICh0aGlzLmNvbmYucmFuZ2UpIHtcbiAgICBpZiAodGhpcy5jb25mLnRvb2x0aXApIHtcbiAgICAgIHRoaXMudGlwTC5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLnN0YXJ0XVxuICAgICAgdGhpcy50aXBSLmlubmVySFRNTCA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxuICAgIH1cbiAgICB0aGlzLmlucHV0LnZhbHVlID0gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5zdGFydF0gKyAnLCcgKyB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1cbiAgICB0aGlzLnBvaW50ZXJSLnN0eWxlLmxlZnQgPSAodGhpcy52YWx1ZXMuZW5kICogdGhpcy5zdGVwIC0gKHRoaXMucG9pbnRlcldpZHRoIC8gMikpICsgJ3B4J1xuICB9IGVsc2Uge1xuICAgIGlmICh0aGlzLmNvbmYudG9vbHRpcCkgeyB0aGlzLnRpcEwuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdIH1cbiAgICB0aGlzLmlucHV0LnZhbHVlID0gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG4gIH1cblxuICBpZiAodGhpcy52YWx1ZXMuZW5kID4gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKSB0aGlzLnZhbHVlcy5lbmQgPSB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDFcbiAgaWYgKHRoaXMudmFsdWVzLnN0YXJ0IDwgMCkgdGhpcy52YWx1ZXMuc3RhcnQgPSAwXG5cbiAgdGhpcy5zZWxlY3RlZC5zdHlsZS53aWR0aCA9ICh0aGlzLnZhbHVlcy5lbmQgLSB0aGlzLnZhbHVlcy5zdGFydCkgKiB0aGlzLnN0ZXAgKyAncHgnXG4gIHRoaXMuc2VsZWN0ZWQuc3R5bGUubGVmdCA9IHRoaXMudmFsdWVzLnN0YXJ0ICogdGhpcy5zdGVwICsgJ3B4J1xuXG4gIHJldHVybiB0aGlzLm9uQ2hhbmdlKClcbn1cblxuUlMucHJvdG90eXBlLm9uQ2xpY2tQaWVjZSA9IGZ1bmN0aW9uIChlKSB7XG4gIGlmICh0aGlzLmNvbmYuZGlzYWJsZWQpIHJldHVyblxuXG4gIHZhciBpZHggPSBNYXRoLnJvdW5kKChlLmNsaWVudFggLSB0aGlzLnNsaWRlckxlZnQpIC8gdGhpcy5zdGVwKVxuXG4gIGlmIChpZHggPiB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpIGlkeCA9IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMVxuICBpZiAoaWR4IDwgMCkgaWR4ID0gMFxuXG4gIGlmICh0aGlzLmNvbmYucmFuZ2UpIHtcbiAgICBpZiAoaWR4IC0gdGhpcy52YWx1ZXMuc3RhcnQgPD0gdGhpcy52YWx1ZXMuZW5kIC0gaWR4KSB7XG4gICAgICB0aGlzLnZhbHVlcy5zdGFydCA9IGlkeFxuICAgIH0gZWxzZSB0aGlzLnZhbHVlcy5lbmQgPSBpZHhcbiAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IGlkeFxuXG4gIHRoaXMuc2xpZGVyLmNsYXNzTGlzdC5yZW1vdmUoJ3NsaWRpbmcnKVxuXG4gIHJldHVybiB0aGlzLnNldFZhbHVlcygpXG59XG5cblJTLnByb3RvdHlwZS5vbkNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIF90aGlzID0gdGhpc1xuXG4gIGlmICh0aGlzLnRpbWVvdXQpIGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXQpXG5cbiAgdGhpcy50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgaWYgKF90aGlzLmNvbmYub25DaGFuZ2UgJiYgdHlwZW9mIF90aGlzLmNvbmYub25DaGFuZ2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBfdGhpcy5jb25mLm9uQ2hhbmdlKF90aGlzLmlucHV0LnZhbHVlKVxuICAgIH1cbiAgfSwgNTAwKVxufVxuXG5SUy5wcm90b3R5cGUub25SZXNpemUgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc2xpZGVyTGVmdCA9IHRoaXMuc2xpZGVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmxlZnRcbiAgdGhpcy5zbGlkZXJXaWR0aCA9IHRoaXMuc2xpZGVyLmNsaWVudFdpZHRoXG4gIHJldHVybiB0aGlzLnVwZGF0ZVNjYWxlKClcbn1cblxuUlMucHJvdG90eXBlLmRpc2FibGVkID0gZnVuY3Rpb24gKGRpc2FibGVkKSB7XG4gIHRoaXMuY29uZi5kaXNhYmxlZCA9IGRpc2FibGVkXG4gIHRoaXMuc2xpZGVyLmNsYXNzTGlzdFtkaXNhYmxlZCA/ICdhZGQnIDogJ3JlbW92ZSddKCdkaXNhYmxlZCcpXG59XG5cblJTLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gUmV0dXJuIGxpc3Qgb2YgbnVtYmVycywgcmF0aGVyIHRoYW4gYSBzdHJpbmcsIHdoaWNoIHdvdWxkIGp1c3QgYmUgc2lsbHlcbiAgLy8gIHJldHVybiB0aGlzLmlucHV0LnZhbHVlXG4gIHJldHVybiBbdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5zdGFydF0sIHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXV1cbn1cblxuUlMucHJvdG90eXBlLmdldFZhbHVlTCA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gR2V0IGxlZnQgKGkuZS4gc21hbGxlc3QpIHZhbHVlXG4gIHJldHVybiB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLnN0YXJ0XVxufVxuXG5SUy5wcm90b3R5cGUuZ2V0VmFsdWVSID0gZnVuY3Rpb24gKCkge1xuICAvLyBHZXQgcmlnaHQgKGkuZS4gc21hbGxlc3QpIHZhbHVlXG4gIHJldHVybiB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1cbn1cblxuUlMucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuaW5wdXQuc3R5bGUuZGlzcGxheSA9IHRoaXMuaW5wdXREaXNwbGF5XG4gIHRoaXMuc2xpZGVyLnJlbW92ZSgpXG59XG5cbnZhciBjcmVhdGVFbGVtZW50ID0gZnVuY3Rpb24gKGVsLCBjbHMsIGRhdGFBdHRyKSB7XG4gIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChlbClcbiAgaWYgKGNscykgZWxlbWVudC5jbGFzc05hbWUgPSBjbHNcbiAgaWYgKGRhdGFBdHRyICYmIGRhdGFBdHRyLmxlbmd0aCA9PT0gMikgeyBlbGVtZW50LnNldEF0dHJpYnV0ZSgnZGF0YS0nICsgZGF0YUF0dHJbMF0sIGRhdGFBdHRyWzFdKSB9XG5cbiAgcmV0dXJuIGVsZW1lbnRcbn1cblxudmFyIGNyZWF0ZUV2ZW50cyA9IGZ1bmN0aW9uIChlbCwgZXYsIGNhbGxiYWNrKSB7XG4gIHZhciBldmVudHMgPSBldi5zcGxpdCgnICcpXG5cbiAgZm9yICh2YXIgaSA9IDAsIGlMZW4gPSBldmVudHMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7IGVsLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRzW2ldLCBjYWxsYmFjaykgfVxufVxuXG52YXIgcHJlcGFyZUFycmF5VmFsdWVzID0gZnVuY3Rpb24gKGNvbmYpIHtcbiAgdmFyIHZhbHVlcyA9IFtdXG4gIHZhciByYW5nZSA9IGNvbmYudmFsdWVzLm1heCAtIGNvbmYudmFsdWVzLm1pblxuXG4gIGlmICghY29uZi5zdGVwKSB7XG4gICAgY29uc29sZS5sb2coJ05vIHN0ZXAgZGVmaW5lZC4uLicpXG4gICAgcmV0dXJuIFtjb25mLnZhbHVlcy5taW4sIGNvbmYudmFsdWVzLm1heF1cbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gKHJhbmdlIC8gY29uZi5zdGVwKTsgaSA8IGlMZW47IGkrKykgeyB2YWx1ZXMucHVzaChjb25mLnZhbHVlcy5taW4gKyBpICogY29uZi5zdGVwKSB9XG5cbiAgaWYgKHZhbHVlcy5pbmRleE9mKGNvbmYudmFsdWVzLm1heCkgPCAwKSB2YWx1ZXMucHVzaChjb25mLnZhbHVlcy5tYXgpXG5cbiAgcmV0dXJuIHZhbHVlc1xufVxuXG52YXIgY2hlY2tJbml0aWFsID0gZnVuY3Rpb24gKGNvbmYpIHtcbiAgaWYgKCFjb25mLnNldCB8fCBjb25mLnNldC5sZW5ndGggPCAxKSByZXR1cm4gbnVsbFxuICBpZiAoY29uZi52YWx1ZXMuaW5kZXhPZihjb25mLnNldFswXSkgPCAwKSByZXR1cm4gbnVsbFxuXG4gIGlmIChjb25mLnJhbmdlKSB7XG4gICAgaWYgKGNvbmYuc2V0Lmxlbmd0aCA8IDIgfHwgY29uZi52YWx1ZXMuaW5kZXhPZihjb25mLnNldFsxXSkgPCAwKSByZXR1cm4gbnVsbFxuICB9XG4gIHJldHVybiB0cnVlXG59XG5cbmV4cG9ydCBkZWZhdWx0IFJTXG4iLCIvKiBSTkdzIC8gc2VsZWN0b3JzICovXG5leHBvcnQgZnVuY3Rpb24gZ2F1c3NpYW4gKG4pIHtcbiAgbGV0IHJudW0gPSAwXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgcm51bSArPSBNYXRoLnJhbmRvbSgpXG4gIH1cbiAgcmV0dXJuIHJudW0gLyBuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kQmV0d2VlbiAobiwgbSwgZGlzdCkge1xuICAvLyByZXR1cm4gYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIG4gYW5kIG0gaW5jbHVzaXZlXG4gIC8vIGRpc3QgKG9wdGlvbmFsKSBpcyBhIGZ1bmN0aW9uIHJldHVybmluZyBhIHZhbHVlIGluIFswLDEpXG4gIC8vIGRlZmF1bHQgaXMgc2xpZ2h0bHkgYmlhc2VkIHRvd2FyZHMgbWlkZGxlXG4gIGlmICghZGlzdCkgZGlzdCA9IE1hdGgucmFuZG9tXG4gIHJldHVybiBuICsgTWF0aC5mbG9vcihkaXN0KCkgKiAobSAtIG4gKyAxKSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJhbmRCZXR3ZWVuRmlsdGVyIChuLCBtLCBmaWx0ZXIpIHtcbiAgLyogcmV0dXJucyBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbiBhbmQgbSBpbmNsdXNpdmUgd2hpY2ggc2F0aXNmaWVzIHRoZSBmaWx0ZXJcbiAgLyAgbiwgbTogaW50ZWdlclxuICAvICBmaWx0ZXI6IEludC0+IEJvb2xcbiAgKi9cbiAgY29uc3QgYXJyID0gW11cbiAgZm9yIChsZXQgaSA9IG47IGkgPCBtICsgMTsgaSsrKSB7XG4gICAgaWYgKGZpbHRlcihpKSkgYXJyLnB1c2goaSlcbiAgfVxuICBpZiAoYXJyID09PSBbXSkgdGhyb3cgbmV3IEVycm9yKCdvdmVyZmlsdGVyZWQnKVxuICBjb25zdCBpID0gcmFuZEJldHdlZW4oMCwgYXJyLmxlbmd0aCAtIDEpXG4gIHJldHVybiBhcnJbaV1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJhbmRNdWx0QmV0d2VlbiAobWluLCBtYXgsIG4pIHtcbiAgLy8gcmV0dXJuIGEgcmFuZG9tIG11bHRpcGxlIG9mIG4gYmV0d2VlbiBuIGFuZCBtIChpbmNsdXNpdmUgaWYgcG9zc2libGUpXG4gIG1pbiA9IE1hdGguY2VpbChtaW4gLyBuKSAqIG5cbiAgbWF4ID0gTWF0aC5mbG9vcihtYXggLyBuKSAqIG4gLy8gY291bGQgY2hlY2sgZGl2aXNpYmlsaXR5IGZpcnN0IHRvIG1heGltaXNlIHBlcmZvcm1hY2UsIGJ1dCBJJ20gc3VyZSB0aGUgaGl0IGlzbid0IGJhZFxuXG4gIHJldHVybiByYW5kQmV0d2VlbihtaW4gLyBuLCBtYXggLyBuKSAqIG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJhbmRFbGVtIChhcnJheSwgZGlzdCkge1xuICBpZiAoWy4uLmFycmF5XS5sZW5ndGggPT09IDApIHRocm93IG5ldyBFcnJvcignZW1wdHkgYXJyYXknKVxuICBpZiAoIWRpc3QpIGRpc3QgPSBNYXRoLnJhbmRvbVxuICBjb25zdCBuID0gYXJyYXkubGVuZ3RoIHx8IGFycmF5LnNpemVcbiAgY29uc3QgaSA9IHJhbmRCZXR3ZWVuKDAsIG4gLSAxLCBkaXN0KVxuICByZXR1cm4gWy4uLmFycmF5XVtpXVxufVxuXG4vKiBNYXRocyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJvdW5kVG9UZW4gKG4pIHtcbiAgcmV0dXJuIE1hdGgucm91bmQobiAvIDEwKSAqIDEwXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByb3VuZERQICh4LCBuKSB7XG4gIHJldHVybiBNYXRoLnJvdW5kKHggKiBNYXRoLnBvdygxMCwgbikpIC8gTWF0aC5wb3coMTAsIG4pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWdUb1JhZCAoeCkge1xuICByZXR1cm4geCAqIE1hdGguUEkgLyAxODBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNpbkRlZyAoeCkge1xuICByZXR1cm4gTWF0aC5zaW4oeCAqIE1hdGguUEkgLyAxODApXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb3NEZWcgKHgpIHtcbiAgcmV0dXJuIE1hdGguY29zKHggKiBNYXRoLlBJIC8gMTgwKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2NhbGVkU3RyIChuLCBkcCkge1xuICAvLyByZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGluZyBuLzEwXmRwXG4gIC8vIGUuZy4gc2NhbGVkU3RyKDM0LDEpPVwiMy40XCJcbiAgLy8gc2NhbGVkU3RyKDMxNCwyKT1cIjMuMTRcIlxuICAvLyBzY2FsZWRTdHIoMzAsMSk9XCIzXCJcbiAgLy8gVHJ5aW5nIHRvIGF2b2lkIHByZWNpc2lvbiBlcnJvcnMhXG4gIGlmIChkcCA9PT0gMCkgcmV0dXJuIG5cbiAgY29uc3QgZmFjdG9yID0gTWF0aC5wb3coMTAsIGRwKVxuICBjb25zdCBpbnRwYXJ0ID0gTWF0aC5mbG9vcihuIC8gZmFjdG9yKVxuICBjb25zdCBkZWNwYXJ0ID0gbiAlIGZhY3RvclxuICBpZiAoZGVjcGFydCA9PT0gMCkge1xuICAgIHJldHVybiBpbnRwYXJ0XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGludHBhcnQgKyAnLicgKyBkZWNwYXJ0XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdjZCAoYSwgYikge1xuICAvLyB0YWtlbiBmcm9tIGZyYWN0aW9uLmpzXG4gIGlmICghYSkgeyByZXR1cm4gYiB9XG4gIGlmICghYikgeyByZXR1cm4gYSB9XG5cbiAgd2hpbGUgKDEpIHtcbiAgICBhICU9IGJcbiAgICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICAgIGIgJT0gYVxuICAgIGlmICghYikgeyByZXR1cm4gYSB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxjbSAoYSwgYikge1xuICByZXR1cm4gYSAqIGIgLyBnY2QoYSwgYilcbn1cblxuLyogQXJyYXlzIGFuZCBzaW1pbGFyICovXG5leHBvcnQgZnVuY3Rpb24gc29ydFRvZ2V0aGVyIChhcnIwLCBhcnIxLCBmKSB7XG4gIGlmIChhcnIwLmxlbmd0aCAhPT0gYXJyMS5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb3RoIGFyZ3VtZW50cyBtdXN0IGJlIGFycmF5cyBvZiB0aGUgc2FtZSBsZW5ndGgnKVxuICB9XG5cbiAgY29uc3QgbiA9IGFycjAubGVuZ3RoXG4gIGNvbnN0IGNvbWJpbmVkID0gW11cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICBjb21iaW5lZFtpXSA9IFthcnIwW2ldLCBhcnIxW2ldXVxuICB9XG5cbiAgY29tYmluZWQuc29ydCgoeCwgeSkgPT4gZih4WzBdLCB5WzBdKSlcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgIGFycjBbaV0gPSBjb21iaW5lZFtpXVswXVxuICAgIGFycjFbaV0gPSBjb21iaW5lZFtpXVsxXVxuICB9XG5cbiAgcmV0dXJuIFthcnIwLCBhcnIxXVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2h1ZmZsZSAoYXJyYXkpIHtcbiAgLy8gS251dGgtRmlzaGVyLVlhdGVzXG4gIC8vIGZyb20gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzI0NTA5NzYvMzczNzI5NVxuICAvLyBuYi4gc2h1ZmZsZXMgaW4gcGxhY2VcbiAgdmFyIGN1cnJlbnRJbmRleCA9IGFycmF5Lmxlbmd0aDsgdmFyIHRlbXBvcmFyeVZhbHVlOyB2YXIgcmFuZG9tSW5kZXhcblxuICAvLyBXaGlsZSB0aGVyZSByZW1haW4gZWxlbWVudHMgdG8gc2h1ZmZsZS4uLlxuICB3aGlsZSAoY3VycmVudEluZGV4ICE9PSAwKSB7XG4gICAgLy8gUGljayBhIHJlbWFpbmluZyBlbGVtZW50Li4uXG4gICAgcmFuZG9tSW5kZXggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjdXJyZW50SW5kZXgpXG4gICAgY3VycmVudEluZGV4IC09IDFcblxuICAgIC8vIEFuZCBzd2FwIGl0IHdpdGggdGhlIGN1cnJlbnQgZWxlbWVudC5cbiAgICB0ZW1wb3JhcnlWYWx1ZSA9IGFycmF5W2N1cnJlbnRJbmRleF1cbiAgICBhcnJheVtjdXJyZW50SW5kZXhdID0gYXJyYXlbcmFuZG9tSW5kZXhdXG4gICAgYXJyYXlbcmFuZG9tSW5kZXhdID0gdGVtcG9yYXJ5VmFsdWVcbiAgfVxuXG4gIHJldHVybiBhcnJheVxufVxuXG5leHBvcnQgZnVuY3Rpb24gd2Vha0luY2x1ZGVzIChhLCBlKSB7XG4gIHJldHVybiAoQXJyYXkuaXNBcnJheShhKSAmJiBhLmluY2x1ZGVzKGUpKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlyc3RVbmlxdWVJbmRleCAoYXJyYXkpIHtcbiAgLy8gcmV0dXJucyBpbmRleCBvZiBmaXJzdCB1bmlxdWUgZWxlbWVudFxuICAvLyBpZiBub25lLCByZXR1cm5zIGxlbmd0aCBvZiBhcnJheVxuICBsZXQgaSA9IDBcbiAgd2hpbGUgKGkgPCBhcnJheS5sZW5ndGgpIHtcbiAgICBpZiAoYXJyYXkuaW5kZXhPZihhcnJheVtpXSkgPT09IGFycmF5Lmxhc3RJbmRleE9mKGFycmF5W2ldKSkge1xuICAgICAgYnJlYWtcbiAgICB9XG4gICAgaSsrXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJvb2xPYmplY3RUb0FycmF5IChvYmopIHtcbiAgLy8gR2l2ZW4gYW4gb2JqZWN0IHdoZXJlIGFsbCB2YWx1ZXMgYXJlIGJvb2xlYW4sIHJldHVybiBrZXlzIHdoZXJlIHRoZSB2YWx1ZSBpcyB0cnVlXG4gIGNvbnN0IHJlc3VsdCA9IFtdXG4gIGZvciAoY29uc3Qga2V5IGluIG9iaikge1xuICAgIGlmIChvYmpba2V5XSkgcmVzdWx0LnB1c2goa2V5KVxuICB9XG4gIHJldHVybiByZXN1bHRcbn1cblxuLyogT2JqZWN0IHByb3BlcnR5IGFjY2VzcyBieSBzdHJpbmcgKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm9wQnlTdHJpbmcgKG8sIHMsIHgpIHtcbiAgLyogRS5nLiBieVN0cmluZyhteU9iaixcImZvby5iYXJcIikgLT4gbXlPYmouZm9vLmJhclxuICAgICAqIGJ5U3RyaW5nKG15T2JqLFwiZm9vLmJhclwiLFwiYmF6XCIpIC0+IG15T2JqLmZvby5iYXIgPSBcImJhelwiXG4gICAgICovXG4gIHMgPSBzLnJlcGxhY2UoL1xcWyhcXHcrKVxcXS9nLCAnLiQxJykgLy8gY29udmVydCBpbmRleGVzIHRvIHByb3BlcnRpZXNcbiAgcyA9IHMucmVwbGFjZSgvXlxcLi8sICcnKSAvLyBzdHJpcCBhIGxlYWRpbmcgZG90XG4gIHZhciBhID0gcy5zcGxpdCgnLicpXG4gIGZvciAodmFyIGkgPSAwLCBuID0gYS5sZW5ndGggLSAxOyBpIDwgbjsgKytpKSB7XG4gICAgdmFyIGsgPSBhW2ldXG4gICAgaWYgKGsgaW4gbykge1xuICAgICAgbyA9IG9ba11cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICB9XG4gIGlmICh4ID09PSB1bmRlZmluZWQpIHJldHVybiBvW2Fbbl1dXG4gIGVsc2Ugb1thW25dXSA9IHhcbn1cblxuLyogTG9naWMgKi9cbmV4cG9ydCBmdW5jdGlvbiBtSWYgKHAsIHEpIHsgLy8gbWF0ZXJpYWwgY29uZGl0aW9uYWxcbiAgcmV0dXJuICghcCB8fCBxKVxufVxuXG4vKiBET00gbWFuaXB1bGF0aW9uIGFuZCBxdWVyeWluZyAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVsZW0gKHRhZ05hbWUsIGNsYXNzTmFtZSwgcGFyZW50KSB7XG4gIC8vIGNyZWF0ZSwgc2V0IGNsYXNzIGFuZCBhcHBlbmQgaW4gb25lXG4gIGNvbnN0IGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpXG4gIGlmIChjbGFzc05hbWUpIGVsZW0uY2xhc3NOYW1lID0gY2xhc3NOYW1lXG4gIGlmIChwYXJlbnQpIHBhcmVudC5hcHBlbmRDaGlsZChlbGVtKVxuICByZXR1cm4gZWxlbVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFzQW5jZXN0b3JDbGFzcyAoZWxlbSwgY2xhc3NOYW1lKSB7XG4gIC8vIGNoZWNrIGlmIGFuIGVsZW1lbnQgZWxlbSBvciBhbnkgb2YgaXRzIGFuY2VzdG9ycyBoYXMgY2xzc1xuICBsZXQgcmVzdWx0ID0gZmFsc2VcbiAgZm9yICg7ZWxlbSAmJiBlbGVtICE9PSBkb2N1bWVudDsgZWxlbSA9IGVsZW0ucGFyZW50Tm9kZSkgeyAvLyB0cmF2ZXJzZSBET00gdXB3YXJkc1xuICAgIGlmIChlbGVtLmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpKSB7XG4gICAgICByZXN1bHQgPSB0cnVlXG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHRcbn1cblxuLyogQ2FudmFzIGRyYXdpbmcgKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXNoZWRMaW5lIChjdHgsIHgxLCB5MSwgeDIsIHkyKSB7XG4gIGNvbnN0IGxlbmd0aCA9IE1hdGguaHlwb3QoeDIgLSB4MSwgeTIgLSB5MSlcbiAgY29uc3QgZGFzaHggPSAoeTEgLSB5MikgLyBsZW5ndGggLy8gdW5pdCB2ZWN0b3IgcGVycGVuZGljdWxhciB0byBsaW5lXG4gIGNvbnN0IGRhc2h5ID0gKHgyIC0geDEpIC8gbGVuZ3RoXG4gIGNvbnN0IG1pZHggPSAoeDEgKyB4MikgLyAyXG4gIGNvbnN0IG1pZHkgPSAoeTEgKyB5MikgLyAyXG5cbiAgLy8gZHJhdyB0aGUgYmFzZSBsaW5lXG4gIGN0eC5tb3ZlVG8oeDEsIHkxKVxuICBjdHgubGluZVRvKHgyLCB5MilcblxuICAvLyBkcmF3IHRoZSBkYXNoXG4gIGN0eC5tb3ZlVG8obWlkeCArIDUgKiBkYXNoeCwgbWlkeSArIDUgKiBkYXNoeSlcbiAgY3R4LmxpbmVUbyhtaWR4IC0gNSAqIGRhc2h4LCBtaWR5IC0gNSAqIGRhc2h5KVxuXG4gIGN0eC5tb3ZlVG8oeDIsIHkyKVxufVxuIiwiaW1wb3J0IHsgY3JlYXRlRWxlbSB9IGZyb20gJ1V0aWxpdGllcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgT3B0aW9uc1NldCB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25TcGVjLCB0ZW1wbGF0ZSkge1xuICAgIHRoaXMub3B0aW9uU3BlYyA9IG9wdGlvblNwZWNcblxuICAgIHRoaXMub3B0aW9ucyA9IHt9XG4gICAgdGhpcy5vcHRpb25TcGVjLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgIGlmIChvcHRpb24udHlwZSAhPT0gJ2hlYWRpbmcnICYmIG9wdGlvbi50eXBlICE9PSAnY29sdW1uLWJyZWFrJykge1xuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IG9wdGlvbi5kZWZhdWx0XG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZSAvLyBodG1sIHRlbXBsYXRlIChvcHRpb25hbClcblxuICAgIC8vIHNldCBhbiBpZCBiYXNlZCBvbiBhIGNvdW50ZXIgLSB1c2VkIGZvciBuYW1lcyBvZiBmb3JtIGVsZW1lbnRzXG4gICAgdGhpcy5nbG9iYWxJZCA9IE9wdGlvbnNTZXQuZ2V0SWQoKVxuICB9XG5cbiAgdXBkYXRlU3RhdGVGcm9tVUkgKG9wdGlvbikge1xuICAgIC8vIGlucHV0IC0gZWl0aGVyIGFuIGVsZW1lbnQgb2YgdGhpcy5vcHRpb25zU3BlYyBvciBhbiBvcHRpb24gaWRcbiAgICBpZiAodHlwZW9mIChvcHRpb24pID09PSAnc3RyaW5nJykge1xuICAgICAgb3B0aW9uID0gdGhpcy5vcHRpb25zU3BlYy5maW5kKHggPT4geC5pZCA9PT0gb3B0aW9uKVxuICAgICAgaWYgKCFvcHRpb24pIHRocm93IG5ldyBFcnJvcihgbm8gb3B0aW9uIHdpdGggaWQgJyR7b3B0aW9ufSdgKVxuICAgIH1cbiAgICBpZiAoIW9wdGlvbi5lbGVtZW50KSB0aHJvdyBuZXcgRXJyb3IoYG9wdGlvbiAke29wdGlvbi5pZH0gZG9lc24ndCBoYXZlIGEgVUkgZWxlbWVudGApXG5cbiAgICBzd2l0Y2ggKG9wdGlvbi50eXBlKSB7XG4gICAgICBjYXNlICdpbnQnOiB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gb3B0aW9uLmVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lucHV0JylbMF1cbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBOdW1iZXIoaW5wdXQudmFsdWUpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdib29sJzoge1xuICAgICAgICBjb25zdCBpbnB1dCA9IG9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpWzBdXG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gaW5wdXQuY2hlY2tlZFxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAnc2VsZWN0LWV4Y2x1c2l2ZSc6IHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBvcHRpb24uZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdpbnB1dDpjaGVja2VkJykudmFsdWVcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NlbGVjdC1pbmNsdXNpdmUnOiB7XG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID1cbiAgICAgICAgICBBcnJheS5mcm9tKG9wdGlvbi5lbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0OmNoZWNrZWQnKSwgeCA9PiB4LnZhbHVlKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBvcHRpb24gd2l0aCBpZCAke29wdGlvbi5pZH0gaGFzIHVucmVjb2duaXNlZCBvcHRpb24gdHlwZSAke29wdGlvbi50eXBlfWApXG4gICAgfVxuICAgIC8vIGNvbnNvbGUubG9nKHRoaXMub3B0aW9ucylcbiAgfVxuXG4gIHJlbmRlckluIChlbGVtZW50KSB7XG4gICAgY29uc3QgbGlzdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3VsJylcbiAgICBsaXN0LmNsYXNzTGlzdC5hZGQoJ29wdGlvbnMtbGlzdCcpXG5cbiAgICB0aGlzLm9wdGlvblNwZWMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgLy8gTWFrZSBsaXN0IGl0ZW0gLSBjb21tb24gdG8gYWxsIHR5cGVzXG4gICAgICBjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJylcbiAgICAgIGxpLmRhdGFzZXQub3B0aW9uSWQgPSBvcHRpb24uaWRcbiAgICAgIGxpc3QuYXBwZW5kKGxpKVxuXG4gICAgICAvLyBtYWtlIGlucHV0IGVsZW1lbnRzIC0gZGVwZW5kcyBvbiBvcHRpb24gdHlwZVxuICAgICAgaWYgKG9wdGlvbi50eXBlID09PSAnY29sdW1uLWJyZWFrJykge1xuICAgICAgICBsaS5jbGFzc0xpc3QuYWRkKCdjb2x1bW4tYnJlYWsnKVxuICAgICAgfSBlbHNlIGlmIChvcHRpb24udHlwZSA9PT0gJ2hlYWRpbmcnKSB7XG4gICAgICAgIGxpLmFwcGVuZChvcHRpb24udGl0bGUpXG4gICAgICAgIGxpLmNsYXNzTGlzdC5hZGQoJ29wdGlvbnMtaGVhZGluZycpXG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbi50eXBlID09PSAnaW50JyB8fCBvcHRpb24udHlwZSA9PT0gJ2Jvb2wnKSB7XG4gICAgICAgIC8vIHNpbmdsZSBpbnB1dCBvcHRpb25zXG4gICAgICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGFiZWwnKVxuICAgICAgICBsaS5hcHBlbmQobGFiZWwpXG5cbiAgICAgICAgaWYgKCFvcHRpb24uc3dhcExhYmVsKSBsYWJlbC5hcHBlbmQob3B0aW9uLnRpdGxlICsgJzogJylcblxuICAgICAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0JylcbiAgICAgICAgc3dpdGNoIChvcHRpb24udHlwZSkge1xuICAgICAgICAgIGNhc2UgJ2ludCc6XG4gICAgICAgICAgICBpbnB1dC50eXBlID0gJ251bWJlcidcbiAgICAgICAgICAgIGlucHV0Lm1pbiA9IG9wdGlvbi5taW5cbiAgICAgICAgICAgIGlucHV0Lm1heCA9IG9wdGlvbi5tYXhcbiAgICAgICAgICAgIGlucHV0LnZhbHVlID0gb3B0aW9uLmRlZmF1bHRcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAnYm9vbCc6XG4gICAgICAgICAgICBpbnB1dC50eXBlID0gJ2NoZWNrYm94J1xuICAgICAgICAgICAgaW5wdXQuY2hlY2tlZCA9IG9wdGlvbi5kZWZhdWx0XG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHVua25vd24gb3B0aW9uIHR5cGUgJHtvcHRpb24udHlwZX1gKVxuICAgICAgICB9XG4gICAgICAgIGlucHV0LmNsYXNzTGlzdC5hZGQoJ29wdGlvbicpXG4gICAgICAgIGxhYmVsLmFwcGVuZChpbnB1dClcblxuICAgICAgICBpZiAob3B0aW9uLnN3YXBMYWJlbCkgbGFiZWwuYXBwZW5kKCcgJyArIG9wdGlvbi50aXRsZSlcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9uLnR5cGUgPT09ICdzZWxlY3QtaW5jbHVzaXZlJyB8fCBvcHRpb24udHlwZSA9PT0gJ3NlbGVjdC1leGNsdXNpdmUnKSB7XG4gICAgICAgIC8vIG11bHRpcGxlIGlucHV0IG9wdGlvbnNcbiAgICAgICAgLy8gVE9ETzogc3dhcCBsYWJlbCAoYSBiaXQgb2RkIGhlcmUgdGhvdWdoKVxuICAgICAgICBsaS5hcHBlbmQob3B0aW9uLnRpdGxlICsgJzogJylcblxuICAgICAgICBjb25zdCBzdWJsaXN0ID0gY3JlYXRlRWxlbSgndWwnLCAnb3B0aW9ucy1zdWJsaXN0JywgbGkpXG4gICAgICAgIGlmIChvcHRpb24udmVydGljYWwpIHN1Ymxpc3QuY2xhc3NMaXN0LmFkZCgnb3B0aW9ucy1zdWJsaXN0LXZlcnRpY2FsJylcblxuICAgICAgICBvcHRpb24uc2VsZWN0T3B0aW9ucy5mb3JFYWNoKHNlbGVjdE9wdGlvbiA9PiB7XG4gICAgICAgICAgY29uc3Qgc3VibGlzdExpID0gY3JlYXRlRWxlbSgnbGknLCBudWxsLCBzdWJsaXN0KVxuICAgICAgICAgIGNvbnN0IGxhYmVsID0gY3JlYXRlRWxlbSgnbGFiZWwnLCBudWxsLCBzdWJsaXN0TGkpXG5cbiAgICAgICAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0JylcbiAgICAgICAgICBpbnB1dC50eXBlID0gb3B0aW9uLnR5cGUgPT09ICdzZWxlY3QtZXhjbHVzaXZlJyA/ICdyYWRpbycgOiAnY2hlY2tib3gnXG4gICAgICAgICAgaW5wdXQubmFtZSA9IHRoaXMuZ2xvYmFsSWQgKyAnLScgKyBvcHRpb24uaWRcbiAgICAgICAgICBpbnB1dC52YWx1ZSA9IHNlbGVjdE9wdGlvbi5pZFxuXG4gICAgICAgICAgaWYgKG9wdGlvbi50eXBlID09PSAnc2VsZWN0LWluY2x1c2l2ZScpIHsgLy8gZGVmYXVsdHMgd29yayBkaWZmZXJlbnQgZm9yIGluY2x1c2l2ZS9leGNsdXNpdmVcbiAgICAgICAgICAgIGlucHV0LmNoZWNrZWQgPSBvcHRpb24uZGVmYXVsdC5pbmNsdWRlcyhzZWxlY3RPcHRpb24uaWQpXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlucHV0LmNoZWNrZWQgPSBvcHRpb24uZGVmYXVsdCA9PT0gc2VsZWN0T3B0aW9uLmlkXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGFiZWwuYXBwZW5kKGlucHV0KVxuXG4gICAgICAgICAgaW5wdXQuY2xhc3NMaXN0LmFkZCgnb3B0aW9uJylcblxuICAgICAgICAgIGxhYmVsLmFwcGVuZChzZWxlY3RPcHRpb24udGl0bGUpXG4gICAgICAgIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHVua25vd24gb3B0aW9uIHR5cGUgJyR7b3B0aW9uLnR5cGV9J2ApXG4gICAgICB9XG5cbiAgICAgIGxpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGUgPT4gdGhpcy51cGRhdGVTdGF0ZUZyb21VSShvcHRpb24pKVxuICAgICAgb3B0aW9uLmVsZW1lbnQgPSBsaVxuICAgIH0pXG5cbiAgICBlbGVtZW50LmFwcGVuZChsaXN0KVxuICB9XG5cbiAgLy8gVE9ETzogdXBkYXRlVUlGcm9tU3RhdGUob3B0aW9uKSB7fVxufVxuXG5PcHRpb25zU2V0LmlkQ291bnRlciA9IDAgLy8gaW5jcmVtZW50IGVhY2ggdGltZSB0byBjcmVhdGUgdW5pcXVlIGlkcyB0byB1c2UgaW4gaWRzL25hbWVzIG9mIGVsZW1lbnRzXG5cbk9wdGlvbnNTZXQuZ2V0SWQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmIChPcHRpb25zU2V0LmlkQ291bnRlciA+PSAyNiAqKiAyKSB0aHJvdyBuZXcgRXJyb3IoJ1RvbyBtYW55IG9wdGlvbnMgb2JqZWN0cyEnKVxuICBjb25zdCBpZCA9IFN0cmluZy5mcm9tQ2hhckNvZGUofn4oT3B0aW9uc1NldC5pZENvdW50ZXIgLyAyNikgKyA5NykgK1xuICAgICAgICAgICBTdHJpbmcuZnJvbUNoYXJDb2RlKE9wdGlvbnNTZXQuaWRDb3VudGVyICUgMjYgKyA5NylcblxuICBPcHRpb25zU2V0LmlkQ291bnRlciArPSAxXG5cbiAgcmV0dXJuIGlkXG59XG5cbk9wdGlvbnNTZXQuZGVtb1NwZWMgPSBbXG4gIHtcbiAgICB0aXRsZTogJ0RpZmZpY3VsdHknLFxuICAgIGlkOiAnZGlmZmljdWx0eScsXG4gICAgdHlwZTogJ2ludCcsXG4gICAgbWluOiAxLFxuICAgIG1heDogMTAsXG4gICAgZGVmYXVsdDogNVxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdUeXBlJyxcbiAgICBpZDogJ3R5cGUnLFxuICAgIHR5cGU6ICdzZWxlY3QtZXhjbHVzaXZlJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICB7IHRpdGxlOiAnUmVjdGFuZ2xlJywgaWQ6ICdyZWN0YW5nbGUnIH0sXG4gICAgICB7IHRpdGxlOiAnVHJpYW5nbGUnLCBpZDogJ3RyaWFuZ2xlJyB9LFxuICAgICAgeyB0aXRsZTogJ1NxdW92YWwnLCBpZDogJ3NxdW92YWwnIH1cbiAgICBdLFxuICAgIGRlZmF1bHQ6ICdyZWN0YW5nbGUnXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ0EgaGVhZGluZycsXG4gICAgdHlwZTogJ2hlYWRpbmcnXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1NoYXBlJyxcbiAgICBpZDogJ3NoYXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWluY2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ1JlY3RhbmdsZSBzaGFwZSB0aGluZycsIGlkOiAncmVjdGFuZ2xlJyB9LFxuICAgICAgeyB0aXRsZTogJ1RyaWFuZ2xlIHNoYXBlIHRoaW5nJywgaWQ6ICd0cmlhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdTcXVvdmFsIHNoYXBlIGxvbmcnLCBpZDogJ3NxdW92YWwnIH1cbiAgICBdLFxuICAgIGRlZmF1bHQ6IFsncmVjdGFuZ2xlJywgJ3NxdW92YWwnXSxcbiAgICB2ZXJ0aWNhbDogdHJ1ZSAvLyBsYXlvdXQgdmVydGljYWxseSwgcmF0aGVyIHRoYW4gaG9yaXpvbnRhbGx5XG4gIH0sXG4gIHtcbiAgICB0eXBlOiAnY29sdW1uLWJyZWFrJ1xuICB9LFxuICB7XG4gICAgdHlwZTogJ2hlYWRpbmcnLFxuICAgIHRpdGxlOiAnQSBuZXcgY29sdW1uJ1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdEbyBzb21ldGhpbmcnLFxuICAgIGlkOiAnc29tZXRoaW5nJyxcbiAgICB0eXBlOiAnYm9vbCcsXG4gICAgZGVmYXVsdDogdHJ1ZSxcbiAgICBzd2FwTGFiZWw6IHRydWUgLy8gcHV0IGNvbnRyb2wgYmVmb3JlIGxhYmVsXG4gIH1cbl1cbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIFF1ZXN0aW9uIHtcbiAgLy8gJ0Fic3RyYWN0JyBjbGFzcyBmb3IgcXVlc3Rpb25zXG4gIC8vIEZvciBub3csIHRoaXMgZG9lcyBub3RoaW5nIG90aGVyIHRoYW4gZG9jdW1lbnQgdGhlIGV4cGVjdGVkIG1ldGhvZHNcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICB0aGlzLkRPTSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgdGhpcy5ET00uY2xhc3NOYW1lID0gJ3F1ZXN0aW9uLWRpdidcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxuXG4gIGdldERPTSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuRE9NXG4gIH1cblxuICByZW5kZXIgKCkge1xuICAgIC8vIHJlbmRlciBpbnRvIHRoZSBET01cbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkge1xuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIHtcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxuXG4gIHRvZ2dsZUFuc3dlciAoKSB7XG4gICAgaWYgKHRoaXMuYW5zd2VyZWQpIHtcbiAgICAgIHRoaXMuaGlkZUFuc3dlcigpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2hvd0Fuc3dlcigpXG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7IHJldHVybiAnJyB9XG59XG4iLCIvKiBnbG9iYWwga2F0ZXggKi9cbmltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbidcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGV4dFEgZXh0ZW5kcyBRdWVzdGlvbiB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIoKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiA1LFxuICAgICAgbGFiZWw6ICdhJ1xuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgLy8gc3RvcmUgdGhlIGxhYmVsIGZvciBmdXR1cmUgcmVuZGVyaW5nXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyBEdW1teSBxdWVzdGlvbiBnZW5lcmF0aW5nIC0gc3ViY2xhc3NlcyBkbyBzb21ldGhpbmcgc3Vic3RhbnRpYWwgaGVyZVxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICcyKzInXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICc9NSdcblxuICAgIC8vIE1ha2UgdGhlIERPTSB0cmVlIGZvciB0aGUgZWxlbWVudFxuICAgIHRoaXMucXVlc3Rpb25wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpXG4gICAgdGhpcy5hbnN3ZXJwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpXG5cbiAgICB0aGlzLnF1ZXN0aW9ucC5jbGFzc05hbWUgPSAncXVlc3Rpb24nXG4gICAgdGhpcy5hbnN3ZXJwLmNsYXNzTmFtZSA9ICdhbnN3ZXInXG4gICAgdGhpcy5hbnN3ZXJwLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpXG5cbiAgICB0aGlzLkRPTS5hcHBlbmRDaGlsZCh0aGlzLnF1ZXN0aW9ucClcbiAgICB0aGlzLkRPTS5hcHBlbmRDaGlsZCh0aGlzLmFuc3dlcnApXG5cbiAgICAvLyBzdWJjbGFzc2VzIHNob3VsZCBnZW5lcmF0ZSBxdWVzdGlvbkxhVGVYIGFuZCBhbnN3ZXJMYVRlWCxcbiAgICAvLyAucmVuZGVyKCkgd2lsbCBiZSBjYWxsZWQgYnkgdXNlclxuICB9XG5cbiAgcmVuZGVyICgpIHtcbiAgICAvLyB1cGRhdGUgdGhlIERPTSBpdGVtIHdpdGggcXVlc3Rpb25MYVRlWCBhbmQgYW5zd2VyTGFUZVhcbiAgICB2YXIgcW51bSA9IHRoaXMubGFiZWxcbiAgICAgID8gJ1xcXFx0ZXh0eycgKyB0aGlzLmxhYmVsICsgJykgfSdcbiAgICAgIDogJydcbiAgICBrYXRleC5yZW5kZXIocW51bSArIHRoaXMucXVlc3Rpb25MYVRlWCwgdGhpcy5xdWVzdGlvbnAsIHsgZGlzcGxheU1vZGU6IHRydWUsIHN0cmljdDogJ2lnbm9yZScgfSlcbiAgICBrYXRleC5yZW5kZXIodGhpcy5hbnN3ZXJMYVRlWCwgdGhpcy5hbnN3ZXJwLCB7IGRpc3BsYXlNb2RlOiB0cnVlIH0pXG4gIH1cblxuICBnZXRET00gKCkge1xuICAgIHJldHVybiB0aGlzLkRPTVxuICB9XG5cbiAgc2hvd0Fuc3dlciAoKSB7XG4gICAgdGhpcy5hbnN3ZXJwLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IHRydWVcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkge1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICB9XG59XG4iLCJpbXBvcnQgeyByYW5kQmV0d2VlbiwgZ2NkIH0gZnJvbSAnVXRpbGl0aWVzJ1xuaW1wb3J0IFRleHRRIGZyb20gJ1RleHRRJ1xuXG4vKiBNYWluIHF1ZXN0aW9uIGNsYXNzLiBUaGlzIHdpbGwgYmUgc3B1biBvZmYgaW50byBkaWZmZXJlbnQgZmlsZSBhbmQgZ2VuZXJhbGlzZWQgKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFsZ2VicmFpY0ZyYWN0aW9uUSBleHRlbmRzIFRleHRRIHtcbiAgLy8gJ2V4dGVuZHMnIFF1ZXN0aW9uLCBidXQgbm90aGluZyB0byBhY3R1YWxseSBleHRlbmRcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiAyXG4gICAgfVxuXG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcbiAgICBjb25zdCBkaWZmaWN1bHR5ID0gc2V0dGluZ3MuZGlmZmljdWx0eVxuXG4gICAgLy8gbG9naWMgZm9yIGdlbmVyYXRpbmcgdGhlIHF1ZXN0aW9uIGFuZCBhbnN3ZXIgc3RhcnRzIGhlcmVcbiAgICB2YXIgYSwgYiwgYywgZCwgZSwgZiAvLyAoYXgrYikoZXgrZikvKGN4K2QpKGV4K2YpID0gKHB4XjIrcXgrcikvKHR4XjIrdXgrdilcbiAgICB2YXIgcCwgcSwgciwgdCwgdSwgdlxuICAgIHZhciBtaW5Db2VmZiwgbWF4Q29lZmYsIG1pbkNvbnN0LCBtYXhDb25zdFxuXG4gICAgc3dpdGNoIChkaWZmaWN1bHR5KSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIG1pbkNvZWZmID0gMTsgbWF4Q29lZmYgPSAxOyBtaW5Db25zdCA9IDE7IG1heENvbnN0ID0gNlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMTsgbWluQ29uc3QgPSAtNjsgbWF4Q29uc3QgPSA2XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDM6XG4gICAgICAgIG1pbkNvZWZmID0gMTsgbWF4Q29lZmYgPSAzOyBtaW5Db25zdCA9IC01OyBtYXhDb25zdCA9IDVcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNDpcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIG1pbkNvZWZmID0gLTM7IG1heENvZWZmID0gMzsgbWluQ29uc3QgPSAtNTsgbWF4Q29uc3QgPSA1XG4gICAgICAgIGJyZWFrXG4gICAgfVxuXG4gICAgLy8gUGljayBzb21lIGNvZWZmaWNpZW50c1xuICAgIHdoaWxlIChcbiAgICAgICgoIWEgJiYgIWIpIHx8ICghYyAmJiAhZCkgfHwgKCFlICYmICFmKSkgfHwgLy8gcmV0cnkgaWYgYW55IGV4cHJlc3Npb24gaXMgMFxuICAgICAgY2FuU2ltcGxpZnkoYSwgYiwgYywgZCkgLy8gcmV0cnkgaWYgdGhlcmUncyBhIGNvbW1vbiBudW1lcmljYWwgZmFjdG9yXG4gICAgKSB7XG4gICAgICBhID0gcmFuZEJldHdlZW4obWluQ29lZmYsIG1heENvZWZmKVxuICAgICAgYyA9IHJhbmRCZXR3ZWVuKG1pbkNvZWZmLCBtYXhDb2VmZilcbiAgICAgIGUgPSByYW5kQmV0d2VlbihtaW5Db2VmZiwgbWF4Q29lZmYpXG4gICAgICBiID0gcmFuZEJldHdlZW4obWluQ29uc3QsIG1heENvbnN0KVxuICAgICAgZCA9IHJhbmRCZXR3ZWVuKG1pbkNvbnN0LCBtYXhDb25zdClcbiAgICAgIGYgPSByYW5kQmV0d2VlbihtaW5Db25zdCwgbWF4Q29uc3QpXG4gICAgfVxuXG4gICAgLy8gaWYgdGhlIGRlbm9taW5hdG9yIGlzIG5lZ2F0aXZlIGZvciBlYWNoIHRlcm0sIHRoZW4gbWFrZSB0aGUgbnVtZXJhdG9yIG5lZ2F0aXZlIGluc3RlYWRcbiAgICBpZiAoYyA8PSAwICYmIGQgPD0gMCkge1xuICAgICAgYyA9IC1jXG4gICAgICBkID0gLWRcbiAgICAgIGEgPSAtYVxuICAgICAgYiA9IC1iXG4gICAgfVxuXG4gICAgcCA9IGEgKiBlOyBxID0gYSAqIGYgKyBiICogZTsgciA9IGIgKiBmXG4gICAgdCA9IGMgKiBlOyB1ID0gYyAqIGYgKyBkICogZTsgdiA9IGQgKiBmXG5cbiAgICAvLyBOb3cgcHV0IHRoZSBxdWVzdGlvbiBhbmQgYW5zd2VyIGluIGEgbmljZSBmb3JtYXQgaW50byBxdWVzdGlvbkxhVGVYIGFuZCBhbnN3ZXJMYVRlWFxuICAgIGNvbnN0IHF1ZXN0aW9uID0gYFxcXFxmcmFjeyR7cXVhZHJhdGljU3RyaW5nKHAsIHEsIHIpfX17JHtxdWFkcmF0aWNTdHJpbmcodCwgdSwgdil9fWBcbiAgICBpZiAoc2V0dGluZ3MudXNlQ29tbWFuZFdvcmQpIHtcbiAgICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICdcXFxcdGV4dHtTaW1wbGlmeX0gJyArIHF1ZXN0aW9uXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9IHF1ZXN0aW9uXG4gICAgfVxuICAgIHRoaXMuYW5zd2VyTGFUZVggPVxuICAgICAgKGMgPT09IDAgJiYgZCA9PT0gMSkgPyBxdWFkcmF0aWNTdHJpbmcoMCwgYSwgYilcbiAgICAgICAgOiBgXFxcXGZyYWN7JHtxdWFkcmF0aWNTdHJpbmcoMCwgYSwgYil9fXske3F1YWRyYXRpY1N0cmluZygwLCBjLCBkKX19YFxuXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICc9ICcgKyB0aGlzLmFuc3dlckxhVGVYXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ1NpbXBsaWZ5J1xuICB9XG59XG5cbi8qIFV0aWxpdHkgZnVuY3Rpb25zXG4gKiBBdCBzb21lIHBvaW50LCBJJ2xsIG1vdmUgc29tZSBvZiB0aGVzZSBpbnRvIGEgZ2VuZXJhbCB1dGlsaXRpZXMgbW9kdWxlXG4gKiBidXQgdGhpcyB3aWxsIGRvIGZvciBub3dcbiAqL1xuXG4vLyBUT0RPIEkgaGF2ZSBxdWFkcmF0aWNTdHJpbmcgaGVyZSBhbmQgYWxzbyBhIFBvbHlub21pYWwgY2xhc3MuIFdoYXQgaXMgYmVpbmcgcmVwbGljYXRlZD/Cp1xuZnVuY3Rpb24gcXVhZHJhdGljU3RyaW5nIChhLCBiLCBjKSB7XG4gIGlmIChhID09PSAwICYmIGIgPT09IDAgJiYgYyA9PT0gMCkgcmV0dXJuICcwJ1xuXG4gIHZhciB4MnN0cmluZyA9XG4gICAgYSA9PT0gMCA/ICcnXG4gICAgICA6IGEgPT09IDEgPyAneF4yJ1xuICAgICAgICA6IGEgPT09IC0xID8gJy14XjInXG4gICAgICAgICAgOiBhICsgJ3heMidcblxuICB2YXIgeHNpZ24gPVxuICAgIGIgPCAwID8gJy0nXG4gICAgICA6IChhID09PSAwIHx8IGIgPT09IDApID8gJydcbiAgICAgICAgOiAnKydcblxuICB2YXIgeHN0cmluZyA9XG4gICAgYiA9PT0gMCA/ICcnXG4gICAgICA6IChiID09PSAxIHx8IGIgPT09IC0xKSA/ICd4J1xuICAgICAgICA6IE1hdGguYWJzKGIpICsgJ3gnXG5cbiAgdmFyIGNvbnN0c2lnbiA9XG4gICAgYyA8IDAgPyAnLSdcbiAgICAgIDogKChhID09PSAwICYmIGIgPT09IDApIHx8IGMgPT09IDApID8gJydcbiAgICAgICAgOiAnKydcblxuICB2YXIgY29uc3RzdHJpbmcgPVxuICAgIGMgPT09IDAgPyAnJyA6IE1hdGguYWJzKGMpXG5cbiAgcmV0dXJuIHgyc3RyaW5nICsgeHNpZ24gKyB4c3RyaW5nICsgY29uc3RzaWduICsgY29uc3RzdHJpbmdcbn1cblxuZnVuY3Rpb24gY2FuU2ltcGxpZnkgKGExLCBiMSwgYTIsIGIyKSB7XG4gIC8vIGNhbiAoYTF4K2IxKS8oYTJ4K2IyKSBiZSBzaW1wbGlmaWVkP1xuICAvL1xuICAvLyBGaXJzdCwgdGFrZSBvdXQgZ2NkLCBhbmQgd3JpdGUgYXMgYzEoYTF4K2IxKSBldGNcblxuICB2YXIgYzEgPSBnY2QoYTEsIGIxKVxuICBhMSA9IGExIC8gYzFcbiAgYjEgPSBiMSAvIGMxXG5cbiAgdmFyIGMyID0gZ2NkKGEyLCBiMilcbiAgYTIgPSBhMiAvIGMyXG4gIGIyID0gYjIgLyBjMlxuXG4gIHZhciByZXN1bHQgPSBmYWxzZVxuXG4gIGlmIChnY2QoYzEsIGMyKSA+IDEgfHwgKGExID09PSBhMiAmJiBiMSA9PT0gYjIpKSB7XG4gICAgcmVzdWx0ID0gdHJ1ZVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdFxufVxuIiwiaW1wb3J0IFRleHRRIGZyb20gJ1RleHRRJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEludGVnZXJBZGRRIGV4dGVuZHMgVGV4dFEge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDUsXG4gICAgICBsYWJlbDogJ2EnXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICB0aGlzLmxhYmVsID0gc2V0dGluZ3MubGFiZWxcblxuICAgIC8vIFRoaXMgaXMganVzdCBhIGRlbW8gcXVlc3Rpb24gdHlwZSBmb3Igbm93LCBzbyBub3QgcHJvY2Vzc2luZyBkaWZmaWN1bHR5XG4gICAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKDEwLCAxMDAwKVxuICAgIGNvbnN0IGIgPSByYW5kQmV0d2VlbigxMCwgMTAwMClcbiAgICBjb25zdCBzdW0gPSBhICsgYlxuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gYSArICcgKyAnICsgYlxuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPSAnICsgc3VtXG5cbiAgICB0aGlzLnJlbmRlcigpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ0V2YWx1YXRlJ1xuICB9XG59XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBQb2ludCB7XG4gIGNvbnN0cnVjdG9yICh4LCB5KSB7XG4gICAgdGhpcy54ID0geFxuICAgIHRoaXMueSA9IHlcbiAgfVxuXG4gIHJvdGF0ZSAoYW5nbGUpIHtcbiAgICB2YXIgbmV3eCwgbmV3eVxuICAgIG5ld3ggPSBNYXRoLmNvcyhhbmdsZSkgKiB0aGlzLnggLSBNYXRoLnNpbihhbmdsZSkgKiB0aGlzLnlcbiAgICBuZXd5ID0gTWF0aC5zaW4oYW5nbGUpICogdGhpcy54ICsgTWF0aC5jb3MoYW5nbGUpICogdGhpcy55XG4gICAgdGhpcy54ID0gbmV3eFxuICAgIHRoaXMueSA9IG5ld3lcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc2NhbGUgKHNmKSB7XG4gICAgdGhpcy54ID0gdGhpcy54ICogc2ZcbiAgICB0aGlzLnkgPSB0aGlzLnkgKiBzZlxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICB0cmFuc2xhdGUgKHgsIHkpIHtcbiAgICB0aGlzLnggKz0geFxuICAgIHRoaXMueSArPSB5XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIGNsb25lICgpIHtcbiAgICByZXR1cm4gbmV3IFBvaW50KHRoaXMueCwgdGhpcy55KVxuICB9XG5cbiAgZXF1YWxzICh0aGF0KSB7XG4gICAgcmV0dXJuICh0aGlzLnggPT09IHRoYXQueCAmJiB0aGlzLnkgPT09IHRoYXQueSlcbiAgfVxuXG4gIG1vdmVUb3dhcmQgKHRoYXQsIGQpIHtcbiAgICAvLyBtb3ZlcyBbZF0gaW4gdGhlIGRpcmVjdGlvbiBvZiBbdGhhdDo6UG9pbnRdXG4gICAgY29uc3QgdXZlYyA9IFBvaW50LnVuaXRWZWN0b3IodGhpcywgdGhhdClcbiAgICB0aGlzLnRyYW5zbGF0ZSh1dmVjLnggKiBkLCB1dmVjLnkgKiBkKVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzdGF0aWMgZnJvbVBvbGFyIChyLCB0aGV0YSkge1xuICAgIHJldHVybiBuZXcgUG9pbnQoXG4gICAgICBNYXRoLmNvcyh0aGV0YSkgKiByLFxuICAgICAgTWF0aC5zaW4odGhldGEpICogclxuICAgIClcbiAgfVxuXG4gIHN0YXRpYyBmcm9tUG9sYXJEZWcgKHIsIHRoZXRhKSB7XG4gICAgdGhldGEgPSB0aGV0YSAqIE1hdGguUEkgLyAxODBcbiAgICByZXR1cm4gUG9pbnQuZnJvbVBvbGFyKHIsIHRoZXRhKVxuICB9XG5cbiAgc3RhdGljIG1lYW4gKC4uLnBvaW50cykge1xuICAgIGNvbnN0IHN1bXggPSBwb2ludHMubWFwKHAgPT4gcC54KS5yZWR1Y2UoKHgsIHkpID0+IHggKyB5KVxuICAgIGNvbnN0IHN1bXkgPSBwb2ludHMubWFwKHAgPT4gcC55KS5yZWR1Y2UoKHgsIHkpID0+IHggKyB5KVxuICAgIGNvbnN0IG4gPSBwb2ludHMubGVuZ3RoXG5cbiAgICByZXR1cm4gbmV3IFBvaW50KHN1bXggLyBuLCBzdW15IC8gbilcbiAgfVxuXG4gIHN0YXRpYyBtaW4gKHBvaW50cykge1xuICAgIGNvbnN0IG1pbnggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1pbih4LCBwLngpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtaW55ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5taW4oeSwgcC55KSwgSW5maW5pdHkpXG4gICAgcmV0dXJuIG5ldyBQb2ludChtaW54LCBtaW55KVxuICB9XG5cbiAgc3RhdGljIG1heCAocG9pbnRzKSB7XG4gICAgY29uc3QgbWF4eCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWF4KHgsIHAueCksIC1JbmZpbml0eSlcbiAgICBjb25zdCBtYXh5ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5tYXgoeSwgcC55KSwgLUluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQobWF4eCwgbWF4eSlcbiAgfVxuXG4gIHN0YXRpYyBjZW50ZXIgKHBvaW50cykge1xuICAgIGNvbnN0IG1pbnggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1pbih4LCBwLngpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtaW55ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5taW4oeSwgcC55KSwgSW5maW5pdHkpXG4gICAgY29uc3QgbWF4eCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWF4KHgsIHAueCksIC1JbmZpbml0eSlcbiAgICBjb25zdCBtYXh5ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5tYXgoeSwgcC55KSwgLUluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQoKG1heHggKyBtaW54KSAvIDIsIChtYXh5ICsgbWlueSkgLyAyKVxuICB9XG5cbiAgc3RhdGljIHVuaXRWZWN0b3IgKHAxLCBwMikge1xuICAgIC8vIHJldHVybnMgYSB1bml0IHZlY3RvciBpbiB0aGUgZGlyZWN0aW9uIG9mIHAxIHRvIHAyXG4gICAgLy8gaW4gdGhlIGZvcm0ge3g6Li4uLCB5Oi4uLn1cbiAgICBjb25zdCB2ZWN4ID0gcDIueCAtIHAxLnhcbiAgICBjb25zdCB2ZWN5ID0gcDIueSAtIHAxLnlcbiAgICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHZlY3gsIHZlY3kpXG4gICAgcmV0dXJuIHsgeDogdmVjeCAvIGxlbmd0aCwgeTogdmVjeSAvIGxlbmd0aCB9XG4gIH1cblxuICBzdGF0aWMgZGlzdGFuY2UgKHAxLCBwMikge1xuICAgIHJldHVybiBNYXRoLmh5cG90KHAxLnggLSBwMi54LCBwMS55IC0gcDIueSlcbiAgfVxuXG4gIHN0YXRpYyByZXBlbCAocDEsIHAyLCB0cmlnZ2VyLCBkaXN0YW5jZSkge1xuICAgIC8vIFdoZW4gcDEgYW5kIHAyIGFyZSBsZXNzIHRoYW4gW3RyaWdnZXJdIGFwYXJ0LCB0aGV5IGFyZVxuICAgIC8vIG1vdmVkIHNvIHRoYXQgdGhleSBhcmUgW2Rpc3RhbmNlXSBhcGFydFxuICAgIGNvbnN0IGQgPSBNYXRoLmh5cG90KHAxLnggLSBwMi54LCBwMS55IC0gcDIueSlcbiAgICBpZiAoZCA+PSB0cmlnZ2VyKSByZXR1cm4gZmFsc2VcblxuICAgIGNvbnN0IHIgPSAoZGlzdGFuY2UgLSBkKSAvIDIgLy8gZGlzdGFuY2UgdGhleSBuZWVkIG1vdmluZ1xuICAgIHAxLm1vdmVUb3dhcmQocDIsIC1yKVxuICAgIHAyLm1vdmVUb3dhcmQocDEsIC1yKVxuICAgIHJldHVybiB0cnVlXG4gIH1cbn1cbiIsIi8qIGdsb2JhbCBrYXRleCAqL1xuaW1wb3J0IFF1ZXN0aW9uIGZyb20gJ1F1ZXN0aW9uJ1xuaW1wb3J0IHsgY3JlYXRlRWxlbSB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcblxuZXhwb3J0IGNsYXNzIEdyYXBoaWNRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKCkgLy8gdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gICAgZGVsZXRlICh0aGlzLkRPTSkgLy8gZ29pbmcgdG8gb3ZlcnJpZGUgZ2V0RE9NIHVzaW5nIHRoZSB2aWV3J3MgRE9NXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDUsXG4gICAgICB3aWR0aDogMjUwLFxuICAgICAgaGVpZ2h0OiAyNTBcbiAgICB9XG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKSAvLyB0aGlzIGNvdWxkIGJlIG92ZXJyaWRkZW5cblxuICAgIC8qIFRoZXNlIGFyZSBndWFyYW50ZWVkIHRvIGJlIG92ZXJyaWRkZW4sIHNvIG5vIHBvaW50IGluaXRpYWxpemluZyBoZXJlXG4gICAgICpcbiAgICAgKiAgdGhpcy5kYXRhID0gbmV3IEdyYXBoaWNRRGF0YShvcHRpb25zKVxuICAgICAqICB0aGlzLnZpZXcgPSBuZXcgR3JhcGhpY1FWaWV3KHRoaXMuZGF0YSwgb3B0aW9ucylcbiAgICAgKlxuICAgICAqL1xuICB9XG5cbiAgZ2V0RE9NICgpIHsgcmV0dXJuIHRoaXMudmlldy5nZXRET00oKSB9XG5cbiAgcmVuZGVyICgpIHsgdGhpcy52aWV3LnJlbmRlcigpIH1cblxuICBzaG93QW5zd2VyICgpIHtcbiAgICBzdXBlci5zaG93QW5zd2VyKClcbiAgICB0aGlzLnZpZXcuc2hvd0Fuc3dlcigpXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIHtcbiAgICBzdXBlci5oaWRlQW5zd2VyKClcbiAgICB0aGlzLnZpZXcuaGlkZUFuc3dlcigpXG4gIH1cbn1cblxuLyogR3JhcGhpY1FEYXRhXG4gKiBFYWNoIHN1YmNsYXNzIHdpbGwgcHJvYmFibHkgaGF2ZSBvbmUgb2YgdGhlc2UuIEJ1dCB0aGV5J3JlIGNvbXBsZXRlbHkgY3VzdG9uXG4gKiB0byB0aGUgcXVlc3Rpb24gdHlwZSAtIHNvIG5vIG5lZWQgdG8gc3ViY2xhc3NcbiAqXG4gKiAgICBleHBvcnQgY2xhc3MgR3JhcGhpY1FEYXRhIHtcbiAqICAgICAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAqICAgICAgfVxuICogICAgICBbb3RoZXIgaW5pdGlhbGlzYXRpb24gbWV0aG9kc11cbiAqICAgIH1cbiAqXG4qL1xuXG5leHBvcnQgY2xhc3MgR3JhcGhpY1FWaWV3IHtcbiAgY29uc3RydWN0b3IgKGRhdGEsIG9wdGlvbnMpIHtcbiAgICB0aGlzLndpZHRoID0gb3B0aW9ucy53aWR0aFxuICAgIHRoaXMuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgLy8gb25seSB0aGluZ3MgSSBuZWVkIGZyb20gdGhlIG9wdGlvbnMsIGdlbmVyYWxseT9cbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgLy8gdGhpcy5yb3RhdGlvbj9cblxuICAgIHRoaXMubGFiZWxzID0gW10gLy8gbGFiZWxzIG9uIGRpYWdyYW1cblxuICAgIC8vIERPTSBlbGVtZW50c1xuICAgIHRoaXMuRE9NID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWRpdicpXG4gICAgdGhpcy5jYW52YXMgPSBjcmVhdGVFbGVtKCdjYW52YXMnLCAncXVlc3Rpb24tY2FudmFzJywgdGhpcy5ET00pXG4gICAgdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLndpZHRoXG4gICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHRcbiAgfVxuXG4gIGdldERPTSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuRE9NXG4gIH1cblxuICByZW5kZXIgKCkge1xuICAgIHRoaXMucmVuZGVyTGFiZWxzKCkgLy8gd2lsbCBiZSBvdmVyd3JpdHRlblxuICB9XG5cbiAgcmVuZGVyTGFiZWxzIChudWRnZSkge1xuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuRE9NXG5cbiAgICAvLyByZW1vdmUgYW55IGV4aXN0aW5nIGxhYmVsc1xuICAgIGNvbnN0IG9sZExhYmVscyA9IGNvbnRhaW5lci5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdsYWJlbCcpXG4gICAgd2hpbGUgKG9sZExhYmVscy5sZW5ndGggPiAwKSB7XG4gICAgICBvbGRMYWJlbHNbMF0ucmVtb3ZlKClcbiAgICB9XG5cbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgY29uc3QgbGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgICAgY29uc3QgaW5uZXJsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgICBsYWJlbC5jbGFzc0xpc3QuYWRkKCdsYWJlbCcpXG4gICAgICBsYWJlbC5jbGFzc0xpc3QgKz0gJyAnICsgbC5zdHlsZVxuICAgICAgbGFiZWwuc3R5bGUubGVmdCA9IGwucG9zLnggKyAncHgnXG4gICAgICBsYWJlbC5zdHlsZS50b3AgPSBsLnBvcy55ICsgJ3B4J1xuXG4gICAgICBrYXRleC5yZW5kZXIobC50ZXh0LCBpbm5lcmxhYmVsKVxuICAgICAgbGFiZWwuYXBwZW5kQ2hpbGQoaW5uZXJsYWJlbClcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChsYWJlbClcblxuICAgICAgLy8gcmVtb3ZlIHNwYWNlIGlmIHRoZSBpbm5lciBsYWJlbCBpcyB0b28gYmlnXG4gICAgICBpZiAoaW5uZXJsYWJlbC5vZmZzZXRXaWR0aCAvIGlubmVybGFiZWwub2Zmc2V0SGVpZ2h0ID4gMikge1xuICAgICAgICBjb25zb2xlLmxvZyhgcmVtb3ZlZCBzcGFjZSBpbiAke2wudGV4dH1gKVxuICAgICAgICBjb25zdCBuZXdsYWJlbHRleHQgPSBsLnRleHQucmVwbGFjZSgvXFwrLywgJ1xcXFwhK1xcXFwhJykucmVwbGFjZSgvLS8sICdcXFxcIS1cXFxcIScpXG4gICAgICAgIGthdGV4LnJlbmRlcihuZXdsYWJlbHRleHQsIGlubmVybGFiZWwpXG4gICAgICB9XG5cbiAgICAgIC8vIHBvc2l0aW9uIGNvcnJlY3RseSAtIHRoaXMgY291bGQgZGVmIGJlIG9wdGltaXNlZCAtIGxvdHMgb2YgYmFjay1hbmQtZm9ydGhcblxuICAgICAgLy8gYWRqdXN0IHRvICpjZW50ZXIqIGxhYmVsLCByYXRoZXIgdGhhbiBhbmNob3IgdG9wLXJpZ2h0XG4gICAgICBjb25zdCBsd2lkdGggPSBsYWJlbC5vZmZzZXRXaWR0aFxuICAgICAgY29uc3QgbGhlaWdodCA9IGxhYmVsLm9mZnNldEhlaWdodFxuICAgICAgbGFiZWwuc3R5bGUubGVmdCA9IChsLnBvcy54IC0gbHdpZHRoIC8gMikgKyAncHgnXG4gICAgICBsYWJlbC5zdHlsZS50b3AgPSAobC5wb3MueSAtIGxoZWlnaHQgLyAyKSArICdweCdcblxuICAgICAgLy8gSSBkb24ndCB1bmRlcnN0YW5kIHRoaXMgYWRqdXN0bWVudC4gSSB0aGluayBpdCBtaWdodCBiZSBuZWVkZWQgaW4gYXJpdGhtYWdvbnMsIGJ1dCBpdCBtYWtlc1xuICAgICAgLy8gb3RoZXJzIGdvIGZ1bm55LlxuXG4gICAgICBpZiAobnVkZ2UpIHtcbiAgICAgICAgaWYgKGwucG9zLnggPCB0aGlzLmNhbnZhcy53aWR0aCAvIDIgLSA1ICYmIGwucG9zLnggKyBsd2lkdGggLyAyID4gdGhpcy5jYW52YXMud2lkdGggLyAyKSB7XG4gICAgICAgICAgbGFiZWwuc3R5bGUubGVmdCA9ICh0aGlzLmNhbnZhcy53aWR0aCAvIDIgLSBsd2lkdGggLSAzKSArICdweCdcbiAgICAgICAgICBjb25zb2xlLmxvZyhgbnVkZ2VkICcke2wudGV4dH0nYClcbiAgICAgICAgfVxuICAgICAgICBpZiAobC5wb3MueCA+IHRoaXMuY2FudmFzLndpZHRoIC8gMiArIDUgJiYgbC5wb3MueCAtIGx3aWR0aCAvIDIgPCB0aGlzLmNhbnZhcy53aWR0aCAvIDIpIHtcbiAgICAgICAgICBsYWJlbC5zdHlsZS5sZWZ0ID0gKHRoaXMuY2FudmFzLndpZHRoIC8gMiArIDMpICsgJ3B4J1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBudWRnZWQgJyR7bC50ZXh0fSdgKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkge1xuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRhXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZWFcbiAgICB9KVxuICAgIHRoaXMucmVuZGVyTGFiZWxzKClcbiAgICB0aGlzLmFuc3dlcmVkID0gdHJ1ZVxuICB9XG5cbiAgaGlkZUFuc3dlciAoKSB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoKVxuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICB9XG5cbiAgLy8gUG9pbnQgdHJhbmZvcm1hdGlvbnMgb2YgYWxsIHBvaW50c1xuXG4gIGdldCBhbGxwb2ludHMgKCkge1xuICAgIHJldHVybiBbXVxuICB9XG5cbiAgc2NhbGUgKHNmKSB7XG4gICAgdGhpcy5hbGxwb2ludHMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgcC5zY2FsZShzZilcbiAgICB9KVxuICB9XG5cbiAgcm90YXRlIChhbmdsZSkge1xuICAgIHRoaXMuYWxscG9pbnRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHAucm90YXRlKGFuZ2xlKVxuICAgIH0pXG4gICAgcmV0dXJuIGFuZ2xlXG4gIH1cblxuICB0cmFuc2xhdGUgKHgsIHkpIHtcbiAgICB0aGlzLmFsbHBvaW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICBwLnRyYW5zbGF0ZSh4LCB5KVxuICAgIH0pXG4gIH1cblxuICByYW5kb21Sb3RhdGUgKCkge1xuICAgIHZhciBhbmdsZSA9IDIgKiBNYXRoLlBJICogTWF0aC5yYW5kb20oKVxuICAgIHRoaXMucm90YXRlKGFuZ2xlKVxuICAgIHJldHVybiBhbmdsZVxuICB9XG5cbiAgc2NhbGVUb0ZpdCAod2lkdGgsIGhlaWdodCwgbWFyZ2luKSB7XG4gICAgbGV0IHRvcExlZnQgPSBQb2ludC5taW4odGhpcy5hbGxwb2ludHMpXG4gICAgbGV0IGJvdHRvbVJpZ2h0ID0gUG9pbnQubWF4KHRoaXMuYWxscG9pbnRzKVxuICAgIGNvbnN0IHRvdGFsV2lkdGggPSBib3R0b21SaWdodC54IC0gdG9wTGVmdC54XG4gICAgY29uc3QgdG90YWxIZWlnaHQgPSBib3R0b21SaWdodC55IC0gdG9wTGVmdC55XG4gICAgdGhpcy5zY2FsZShNYXRoLm1pbigod2lkdGggLSBtYXJnaW4pIC8gdG90YWxXaWR0aCwgKGhlaWdodCAtIG1hcmdpbikgLyB0b3RhbEhlaWdodCkpXG5cbiAgICAvLyBjZW50cmVcbiAgICB0b3BMZWZ0ID0gUG9pbnQubWluKHRoaXMuYWxscG9pbnRzKVxuICAgIGJvdHRvbVJpZ2h0ID0gUG9pbnQubWF4KHRoaXMuYWxscG9pbnRzKVxuICAgIGNvbnN0IGNlbnRlciA9IFBvaW50Lm1lYW4oW3RvcExlZnQsIGJvdHRvbVJpZ2h0XSlcbiAgICB0aGlzLnRyYW5zbGF0ZSh3aWR0aCAvIDIgLSBjZW50ZXIueCwgaGVpZ2h0IC8gMiAtIGNlbnRlci55KSAvLyBjZW50cmVcbiAgfVxufVxuIiwiaW1wb3J0ICogYXMgY29tbW9uanNIZWxwZXJzIGZyb20gJ1x1MDAwMGNvbW1vbmpzSGVscGVycy5qcydcblxudmFyIGZyYWN0aW9uID0gY29tbW9uanNIZWxwZXJzLmNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZ1bmN0aW9uIChtb2R1bGUsIGV4cG9ydHMpIHtcbi8qKlxuICogQGxpY2Vuc2UgRnJhY3Rpb24uanMgdjQuMC45IDA5LzA5LzIwMTVcbiAqIGh0dHA6Ly93d3cueGFyZy5vcmcvMjAxNC8wMy9yYXRpb25hbC1udW1iZXJzLWluLWphdmFzY3JpcHQvXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1LCBSb2JlcnQgRWlzZWxlIChyb2JlcnRAeGFyZy5vcmcpXG4gKiBEdWFsIGxpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgb3IgR1BMIFZlcnNpb24gMiBsaWNlbnNlcy5cbiAqKi9cblxuICAvKipcbiAqXG4gKiBUaGlzIGNsYXNzIG9mZmVycyB0aGUgcG9zc2liaWxpdHkgdG8gY2FsY3VsYXRlIGZyYWN0aW9ucy5cbiAqIFlvdSBjYW4gcGFzcyBhIGZyYWN0aW9uIGluIGRpZmZlcmVudCBmb3JtYXRzLiBFaXRoZXIgYXMgYXJyYXksIGFzIGRvdWJsZSwgYXMgc3RyaW5nIG9yIGFzIGFuIGludGVnZXIuXG4gKlxuICogQXJyYXkvT2JqZWN0IGZvcm1cbiAqIFsgMCA9PiA8bm9taW5hdG9yPiwgMSA9PiA8ZGVub21pbmF0b3I+IF1cbiAqIFsgbiA9PiA8bm9taW5hdG9yPiwgZCA9PiA8ZGVub21pbmF0b3I+IF1cbiAqXG4gKiBJbnRlZ2VyIGZvcm1cbiAqIC0gU2luZ2xlIGludGVnZXIgdmFsdWVcbiAqXG4gKiBEb3VibGUgZm9ybVxuICogLSBTaW5nbGUgZG91YmxlIHZhbHVlXG4gKlxuICogU3RyaW5nIGZvcm1cbiAqIDEyMy40NTYgLSBhIHNpbXBsZSBkb3VibGVcbiAqIDEyMy80NTYgLSBhIHN0cmluZyBmcmFjdGlvblxuICogMTIzLic0NTYnIC0gYSBkb3VibGUgd2l0aCByZXBlYXRpbmcgZGVjaW1hbCBwbGFjZXNcbiAqIDEyMy4oNDU2KSAtIHN5bm9ueW1cbiAqIDEyMy40NSc2JyAtIGEgZG91YmxlIHdpdGggcmVwZWF0aW5nIGxhc3QgcGxhY2VcbiAqIDEyMy40NSg2KSAtIHN5bm9ueW1cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIHZhciBmID0gbmV3IEZyYWN0aW9uKFwiOS40JzMxJ1wiKTtcbiAqIGYubXVsKFstNCwgM10pLmRpdig0LjkpO1xuICpcbiAqL1xuXG4gIChmdW5jdGlvbiAocm9vdCkge1xuICAgICd1c2Ugc3RyaWN0J1xuXG4gICAgLy8gTWF4aW11bSBzZWFyY2ggZGVwdGggZm9yIGN5Y2xpYyByYXRpb25hbCBudW1iZXJzLiAyMDAwIHNob3VsZCBiZSBtb3JlIHRoYW4gZW5vdWdoLlxuICAgIC8vIEV4YW1wbGU6IDEvNyA9IDAuKDE0Mjg1NykgaGFzIDYgcmVwZWF0aW5nIGRlY2ltYWwgcGxhY2VzLlxuICAgIC8vIElmIE1BWF9DWUNMRV9MRU4gZ2V0cyByZWR1Y2VkLCBsb25nIGN5Y2xlcyB3aWxsIG5vdCBiZSBkZXRlY3RlZCBhbmQgdG9TdHJpbmcoKSBvbmx5IGdldHMgdGhlIGZpcnN0IDEwIGRpZ2l0c1xuICAgIHZhciBNQVhfQ1lDTEVfTEVOID0gMjAwMFxuXG4gICAgLy8gUGFyc2VkIGRhdGEgdG8gYXZvaWQgY2FsbGluZyBcIm5ld1wiIGFsbCB0aGUgdGltZVxuICAgIHZhciBQID0ge1xuICAgICAgczogMSxcbiAgICAgIG46IDAsXG4gICAgICBkOiAxXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlRXJyb3IgKG5hbWUpIHtcbiAgICAgIGZ1bmN0aW9uIGVycm9yQ29uc3RydWN0b3IgKCkge1xuICAgICAgICB2YXIgdGVtcCA9IEVycm9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICAgICAgdGVtcC5uYW1lID0gdGhpcy5uYW1lID0gbmFtZVxuICAgICAgICB0aGlzLnN0YWNrID0gdGVtcC5zdGFja1xuICAgICAgICB0aGlzLm1lc3NhZ2UgPSB0ZW1wLm1lc3NhZ2VcbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICogRXJyb3IgY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgICAgZnVuY3Rpb24gSW50ZXJtZWRpYXRlSW5oZXJpdG9yICgpIHt9XG4gICAgICBJbnRlcm1lZGlhdGVJbmhlcml0b3IucHJvdG90eXBlID0gRXJyb3IucHJvdG90eXBlXG4gICAgICBlcnJvckNvbnN0cnVjdG9yLnByb3RvdHlwZSA9IG5ldyBJbnRlcm1lZGlhdGVJbmhlcml0b3IoKVxuXG4gICAgICByZXR1cm4gZXJyb3JDb25zdHJ1Y3RvclxuICAgIH1cblxuICAgIHZhciBEaXZpc2lvbkJ5WmVybyA9IEZyYWN0aW9uLkRpdmlzaW9uQnlaZXJvID0gY3JlYXRlRXJyb3IoJ0RpdmlzaW9uQnlaZXJvJylcbiAgICB2YXIgSW52YWxpZFBhcmFtZXRlciA9IEZyYWN0aW9uLkludmFsaWRQYXJhbWV0ZXIgPSBjcmVhdGVFcnJvcignSW52YWxpZFBhcmFtZXRlcicpXG5cbiAgICBmdW5jdGlvbiBhc3NpZ24gKG4sIHMpIHtcbiAgICAgIGlmIChpc05hTihuID0gcGFyc2VJbnQobiwgMTApKSkge1xuICAgICAgICB0aHJvd0ludmFsaWRQYXJhbSgpXG4gICAgICB9XG4gICAgICByZXR1cm4gbiAqIHNcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0aHJvd0ludmFsaWRQYXJhbSAoKSB7XG4gICAgICB0aHJvdyBuZXcgSW52YWxpZFBhcmFtZXRlcigpXG4gICAgfVxuXG4gICAgdmFyIHBhcnNlID0gZnVuY3Rpb24gKHAxLCBwMikge1xuICAgICAgdmFyIG4gPSAwOyB2YXIgZCA9IDE7IHZhciBzID0gMVxuICAgICAgdmFyIHYgPSAwOyB2YXIgdyA9IDA7IHZhciB4ID0gMDsgdmFyIHkgPSAxOyB2YXIgeiA9IDFcblxuICAgICAgdmFyIEEgPSAwOyB2YXIgQiA9IDFcbiAgICAgIHZhciBDID0gMTsgdmFyIEQgPSAxXG5cbiAgICAgIHZhciBOID0gMTAwMDAwMDBcbiAgICAgIHZhciBNXG5cbiAgICAgIGlmIChwMSA9PT0gdW5kZWZpbmVkIHx8IHAxID09PSBudWxsKSB7XG4gICAgICAvKiB2b2lkICovXG4gICAgICB9IGVsc2UgaWYgKHAyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbiA9IHAxXG4gICAgICAgIGQgPSBwMlxuICAgICAgICBzID0gbiAqIGRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN3aXRjaCAodHlwZW9mIHAxKSB7XG4gICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZiAoJ2QnIGluIHAxICYmICduJyBpbiBwMSkge1xuICAgICAgICAgICAgICBuID0gcDEublxuICAgICAgICAgICAgICBkID0gcDEuZFxuICAgICAgICAgICAgICBpZiAoJ3MnIGluIHAxKSB7IG4gKj0gcDEucyB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKDAgaW4gcDEpIHtcbiAgICAgICAgICAgICAgbiA9IHAxWzBdXG4gICAgICAgICAgICAgIGlmICgxIGluIHAxKSB7IGQgPSBwMVsxXSB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvd0ludmFsaWRQYXJhbSgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzID0gbiAqIGRcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAge1xuICAgICAgICAgICAgaWYgKHAxIDwgMCkge1xuICAgICAgICAgICAgICBzID0gcDFcbiAgICAgICAgICAgICAgcDEgPSAtcDFcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHAxICUgMSA9PT0gMCkge1xuICAgICAgICAgICAgICBuID0gcDFcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocDEgPiAwKSB7IC8vIGNoZWNrIGZvciAhPSAwLCBzY2FsZSB3b3VsZCBiZWNvbWUgTmFOIChsb2coMCkpLCB3aGljaCBjb252ZXJnZXMgcmVhbGx5IHNsb3dcbiAgICAgICAgICAgICAgaWYgKHAxID49IDEpIHtcbiAgICAgICAgICAgICAgICB6ID0gTWF0aC5wb3coMTAsIE1hdGguZmxvb3IoMSArIE1hdGgubG9nKHAxKSAvIE1hdGguTE4xMCkpXG4gICAgICAgICAgICAgICAgcDEgLz0gelxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gVXNpbmcgRmFyZXkgU2VxdWVuY2VzXG4gICAgICAgICAgICAgIC8vIGh0dHA6Ly93d3cuam9obmRjb29rLmNvbS9ibG9nLzIwMTAvMTAvMjAvYmVzdC1yYXRpb25hbC1hcHByb3hpbWF0aW9uL1xuXG4gICAgICAgICAgICAgIHdoaWxlIChCIDw9IE4gJiYgRCA8PSBOKSB7XG4gICAgICAgICAgICAgICAgTSA9IChBICsgQykgLyAoQiArIEQpXG5cbiAgICAgICAgICAgICAgICBpZiAocDEgPT09IE0pIHtcbiAgICAgICAgICAgICAgICAgIGlmIChCICsgRCA8PSBOKSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBBICsgQ1xuICAgICAgICAgICAgICAgICAgICBkID0gQiArIERcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoRCA+IEIpIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IENcbiAgICAgICAgICAgICAgICAgICAgZCA9IERcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBBXG4gICAgICAgICAgICAgICAgICAgIGQgPSBCXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBpZiAocDEgPiBNKSB7XG4gICAgICAgICAgICAgICAgICAgIEEgKz0gQ1xuICAgICAgICAgICAgICAgICAgICBCICs9IERcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIEMgKz0gQVxuICAgICAgICAgICAgICAgICAgICBEICs9IEJcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKEIgPiBOKSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBDXG4gICAgICAgICAgICAgICAgICAgIGQgPSBEXG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBuID0gQVxuICAgICAgICAgICAgICAgICAgICBkID0gQlxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBuICo9IHpcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNOYU4ocDEpIHx8IGlzTmFOKHAyKSkge1xuICAgICAgICAgICAgICBkID0gbiA9IE5hTlxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICB7XG4gICAgICAgICAgICBCID0gcDEubWF0Y2goL1xcZCt8Li9nKVxuXG4gICAgICAgICAgICBpZiAoQiA9PT0gbnVsbCkgeyB0aHJvd0ludmFsaWRQYXJhbSgpIH1cblxuICAgICAgICAgICAgaWYgKEJbQV0gPT09ICctJykgeyAvLyBDaGVjayBmb3IgbWludXMgc2lnbiBhdCB0aGUgYmVnaW5uaW5nXG4gICAgICAgICAgICAgIHMgPSAtMVxuICAgICAgICAgICAgICBBKytcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQltBXSA9PT0gJysnKSB7IC8vIENoZWNrIGZvciBwbHVzIHNpZ24gYXQgdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgICBBKytcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKEIubGVuZ3RoID09PSBBICsgMSkgeyAvLyBDaGVjayBpZiBpdCdzIGp1c3QgYSBzaW1wbGUgbnVtYmVyIFwiMTIzNFwiXG4gICAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBKytdLCBzKVxuICAgICAgICAgICAgfSBlbHNlIGlmIChCW0EgKyAxXSA9PT0gJy4nIHx8IEJbQV0gPT09ICcuJykgeyAvLyBDaGVjayBpZiBpdCdzIGEgZGVjaW1hbCBudW1iZXJcbiAgICAgICAgICAgICAgaWYgKEJbQV0gIT09ICcuJykgeyAvLyBIYW5kbGUgMC41IGFuZCAuNVxuICAgICAgICAgICAgICAgIHYgPSBhc3NpZ24oQltBKytdLCBzKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIEErK1xuXG4gICAgICAgICAgICAgIC8vIENoZWNrIGZvciBkZWNpbWFsIHBsYWNlc1xuICAgICAgICAgICAgICBpZiAoQSArIDEgPT09IEIubGVuZ3RoIHx8IEJbQSArIDFdID09PSAnKCcgJiYgQltBICsgM10gPT09ICcpJyB8fCBCW0EgKyAxXSA9PT0gXCInXCIgJiYgQltBICsgM10gPT09IFwiJ1wiKSB7XG4gICAgICAgICAgICAgICAgdyA9IGFzc2lnbihCW0FdLCBzKVxuICAgICAgICAgICAgICAgIHkgPSBNYXRoLnBvdygxMCwgQltBXS5sZW5ndGgpXG4gICAgICAgICAgICAgICAgQSsrXG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAvLyBDaGVjayBmb3IgcmVwZWF0aW5nIHBsYWNlc1xuICAgICAgICAgICAgICBpZiAoQltBXSA9PT0gJygnICYmIEJbQSArIDJdID09PSAnKScgfHwgQltBXSA9PT0gXCInXCIgJiYgQltBICsgMl0gPT09IFwiJ1wiKSB7XG4gICAgICAgICAgICAgICAgeCA9IGFzc2lnbihCW0EgKyAxXSwgcylcbiAgICAgICAgICAgICAgICB6ID0gTWF0aC5wb3coMTAsIEJbQSArIDFdLmxlbmd0aCkgLSAxXG4gICAgICAgICAgICAgICAgQSArPSAzXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQltBICsgMV0gPT09ICcvJyB8fCBCW0EgKyAxXSA9PT0gJzonKSB7IC8vIENoZWNrIGZvciBhIHNpbXBsZSBmcmFjdGlvbiBcIjEyMy80NTZcIiBvciBcIjEyMzo0NTZcIlxuICAgICAgICAgICAgICB3ID0gYXNzaWduKEJbQV0sIHMpXG4gICAgICAgICAgICAgIHkgPSBhc3NpZ24oQltBICsgMl0sIDEpXG4gICAgICAgICAgICAgIEEgKz0gM1xuICAgICAgICAgICAgfSBlbHNlIGlmIChCW0EgKyAzXSA9PT0gJy8nICYmIEJbQSArIDFdID09PSAnICcpIHsgLy8gQ2hlY2sgZm9yIGEgY29tcGxleCBmcmFjdGlvbiBcIjEyMyAxLzJcIlxuICAgICAgICAgICAgICB2ID0gYXNzaWduKEJbQV0sIHMpXG4gICAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBICsgMl0sIHMpXG4gICAgICAgICAgICAgIHkgPSBhc3NpZ24oQltBICsgNF0sIDEpXG4gICAgICAgICAgICAgIEEgKz0gNVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoQi5sZW5ndGggPD0gQSkgeyAvLyBDaGVjayBmb3IgbW9yZSB0b2tlbnMgb24gdGhlIHN0YWNrXG4gICAgICAgICAgICAgIGQgPSB5ICogelxuICAgICAgICAgICAgICBzID0gLyogdm9pZCAqL1xuICAgICAgICAgICAgICAgICAgICBuID0geCArIGQgKiB2ICsgeiAqIHdcbiAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIC8qIEZhbGwgdGhyb3VnaCBvbiBlcnJvciAqL1xuICAgICAgICAgIH1cbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChkID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBEaXZpc2lvbkJ5WmVybygpXG4gICAgICB9XG5cbiAgICAgIFAucyA9IHMgPCAwID8gLTEgOiAxXG4gICAgICBQLm4gPSBNYXRoLmFicyhuKVxuICAgICAgUC5kID0gTWF0aC5hYnMoZClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb2Rwb3cgKGIsIGUsIG0pIHtcbiAgICAgIHZhciByID0gMVxuICAgICAgZm9yICg7IGUgPiAwOyBiID0gKGIgKiBiKSAlIG0sIGUgPj49IDEpIHtcbiAgICAgICAgaWYgKGUgJiAxKSB7XG4gICAgICAgICAgciA9IChyICogYikgJSBtXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3ljbGVMZW4gKG4sIGQpIHtcbiAgICAgIGZvciAoOyBkICUgMiA9PT0gMDtcbiAgICAgICAgZCAvPSAyKSB7XG4gICAgICB9XG5cbiAgICAgIGZvciAoOyBkICUgNSA9PT0gMDtcbiAgICAgICAgZCAvPSA1KSB7XG4gICAgICB9XG5cbiAgICAgIGlmIChkID09PSAxKSAvLyBDYXRjaCBub24tY3ljbGljIG51bWJlcnNcbiAgICAgIHsgcmV0dXJuIDAgfVxuXG4gICAgICAvLyBJZiB3ZSB3b3VsZCBsaWtlIHRvIGNvbXB1dGUgcmVhbGx5IGxhcmdlIG51bWJlcnMgcXVpY2tlciwgd2UgY291bGQgbWFrZSB1c2Ugb2YgRmVybWF0J3MgbGl0dGxlIHRoZW9yZW06XG4gICAgICAvLyAxMF4oZC0xKSAlIGQgPT0gMVxuICAgICAgLy8gSG93ZXZlciwgd2UgZG9uJ3QgbmVlZCBzdWNoIGxhcmdlIG51bWJlcnMgYW5kIE1BWF9DWUNMRV9MRU4gc2hvdWxkIGJlIHRoZSBjYXBzdG9uZSxcbiAgICAgIC8vIGFzIHdlIHdhbnQgdG8gdHJhbnNsYXRlIHRoZSBudW1iZXJzIHRvIHN0cmluZ3MuXG5cbiAgICAgIHZhciByZW0gPSAxMCAlIGRcbiAgICAgIHZhciB0ID0gMVxuXG4gICAgICBmb3IgKDsgcmVtICE9PSAxOyB0KyspIHtcbiAgICAgICAgcmVtID0gcmVtICogMTAgJSBkXG5cbiAgICAgICAgaWYgKHQgPiBNQVhfQ1lDTEVfTEVOKSB7IHJldHVybiAwIH0gLy8gUmV0dXJuaW5nIDAgaGVyZSBtZWFucyB0aGF0IHdlIGRvbid0IHByaW50IGl0IGFzIGEgY3ljbGljIG51bWJlci4gSXQncyBsaWtlbHkgdGhhdCB0aGUgYW5zd2VyIGlzIGBkLTFgXG4gICAgICB9XG4gICAgICByZXR1cm4gdFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGN5Y2xlU3RhcnQgKG4sIGQsIGxlbikge1xuICAgICAgdmFyIHJlbTEgPSAxXG4gICAgICB2YXIgcmVtMiA9IG1vZHBvdygxMCwgbGVuLCBkKVxuXG4gICAgICBmb3IgKHZhciB0ID0gMDsgdCA8IDMwMDsgdCsrKSB7IC8vIHMgPCB+bG9nMTAoTnVtYmVyLk1BWF9WQUxVRSlcbiAgICAgIC8vIFNvbHZlIDEwXnMgPT0gMTBeKHMrdCkgKG1vZCBkKVxuXG4gICAgICAgIGlmIChyZW0xID09PSByZW0yKSB7IHJldHVybiB0IH1cblxuICAgICAgICByZW0xID0gcmVtMSAqIDEwICUgZFxuICAgICAgICByZW0yID0gcmVtMiAqIDEwICUgZFxuICAgICAgfVxuICAgICAgcmV0dXJuIDBcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnY2QgKGEsIGIpIHtcbiAgICAgIGlmICghYSkgeyByZXR1cm4gYiB9XG4gICAgICBpZiAoIWIpIHsgcmV0dXJuIGEgfVxuXG4gICAgICB3aGlsZSAoMSkge1xuICAgICAgICBhICU9IGJcbiAgICAgICAgaWYgKCFhKSB7IHJldHVybiBiIH1cbiAgICAgICAgYiAlPSBhXG4gICAgICAgIGlmICghYikgeyByZXR1cm4gYSB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgKiBNb2R1bGUgY29uc3RydWN0b3JcbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7bnVtYmVyfEZyYWN0aW9uPX0gYVxuICAgKiBAcGFyYW0ge251bWJlcj19IGJcbiAgICovXG4gICAgZnVuY3Rpb24gRnJhY3Rpb24gKGEsIGIpIHtcbiAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGcmFjdGlvbikpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihhLCBiKVxuICAgICAgfVxuXG4gICAgICBwYXJzZShhLCBiKVxuXG4gICAgICBpZiAoRnJhY3Rpb24uUkVEVUNFKSB7XG4gICAgICAgIGEgPSBnY2QoUC5kLCBQLm4pIC8vIEFidXNlIGFcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGEgPSAxXG4gICAgICB9XG5cbiAgICAgIHRoaXMucyA9IFAuc1xuICAgICAgdGhpcy5uID0gUC5uIC8gYVxuICAgICAgdGhpcy5kID0gUC5kIC8gYVxuICAgIH1cblxuICAgIC8qKlxuICAgKiBCb29sZWFuIGdsb2JhbCB2YXJpYWJsZSB0byBiZSBhYmxlIHRvIGRpc2FibGUgYXV0b21hdGljIHJlZHVjdGlvbiBvZiB0aGUgZnJhY3Rpb25cbiAgICpcbiAgICovXG4gICAgRnJhY3Rpb24uUkVEVUNFID0gMVxuXG4gICAgRnJhY3Rpb24ucHJvdG90eXBlID0ge1xuXG4gICAgICBzOiAxLFxuICAgICAgbjogMCxcbiAgICAgIGQ6IDEsXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGFic29sdXRlIHZhbHVlXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKC00KS5hYnMoKSA9PiA0XG4gICAgICoqL1xuICAgICAgYWJzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24odGhpcy5uLCB0aGlzLmQpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBJbnZlcnRzIHRoZSBzaWduIG9mIHRoZSBjdXJyZW50IGZyYWN0aW9uXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKC00KS5uZWcoKSA9PiA0XG4gICAgICoqL1xuICAgICAgbmVnOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oLXRoaXMucyAqIHRoaXMubiwgdGhpcy5kKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQWRkcyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbih7bjogMiwgZDogM30pLmFkZChcIjE0LjlcIikgPT4gNDY3IC8gMzBcbiAgICAgKiovXG4gICAgICBhZGQ6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgdGhpcy5zICogdGhpcy5uICogUC5kICsgUC5zICogdGhpcy5kICogUC5uLFxuICAgICAgICAgIHRoaXMuZCAqIFAuZFxuICAgICAgICApXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBTdWJ0cmFjdHMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oe246IDIsIGQ6IDN9KS5hZGQoXCIxNC45XCIpID0+IC00MjcgLyAzMFxuICAgICAqKi9cbiAgICAgIHN1YjogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICB0aGlzLnMgKiB0aGlzLm4gKiBQLmQgLSBQLnMgKiB0aGlzLmQgKiBQLm4sXG4gICAgICAgICAgdGhpcy5kICogUC5kXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIE11bHRpcGxpZXMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCItMTcuKDM0NSlcIikubXVsKDMpID0+IDU3NzYgLyAxMTFcbiAgICAgKiovXG4gICAgICBtdWw6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgdGhpcy5zICogUC5zICogdGhpcy5uICogUC5uLFxuICAgICAgICAgIHRoaXMuZCAqIFAuZFxuICAgICAgICApXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBEaXZpZGVzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiLTE3LigzNDUpXCIpLmludmVyc2UoKS5kaXYoMylcbiAgICAgKiovXG4gICAgICBkaXY6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgdGhpcy5zICogUC5zICogdGhpcy5uICogUC5kLFxuICAgICAgICAgIHRoaXMuZCAqIFAublxuICAgICAgICApXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDbG9uZXMgdGhlIGFjdHVhbCBvYmplY3RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCItMTcuKDM0NSlcIikuY2xvbmUoKVxuICAgICAqKi9cbiAgICAgIGNsb25lOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24odGhpcylcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIG1vZHVsbyBvZiB0d28gcmF0aW9uYWwgbnVtYmVycyAtIGEgbW9yZSBwcmVjaXNlIGZtb2RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykubW9kKFs3LCA4XSkgPT4gKDEzLzMpICUgKDcvOCkgPSAoNS82KVxuICAgICAqKi9cbiAgICAgIG1vZDogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24odGhpcy5zICogdGhpcy5uICUgdGhpcy5kLCAxKVxuICAgICAgICB9XG5cbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgaWYgKFAubiA9PT0gMCAmJiB0aGlzLmQgPT09IDApIHtcbiAgICAgICAgICBGcmFjdGlvbigwLCAwKSAvLyBUaHJvdyBEaXZpc2lvbkJ5WmVyb1xuICAgICAgICB9XG5cbiAgICAgICAgLypcbiAgICAgICAqIEZpcnN0IHNpbGx5IGF0dGVtcHQsIGtpbmRhIHNsb3dcbiAgICAgICAqXG4gICAgICAgcmV0dXJuIHRoYXRbXCJzdWJcIl0oe1xuICAgICAgIFwiblwiOiBudW1bXCJuXCJdICogTWF0aC5mbG9vcigodGhpcy5uIC8gdGhpcy5kKSAvIChudW0ubiAvIG51bS5kKSksXG4gICAgICAgXCJkXCI6IG51bVtcImRcIl0sXG4gICAgICAgXCJzXCI6IHRoaXNbXCJzXCJdXG4gICAgICAgfSk7ICovXG5cbiAgICAgICAgLypcbiAgICAgICAqIE5ldyBhdHRlbXB0OiBhMSAvIGIxID0gYTIgLyBiMiAqIHEgKyByXG4gICAgICAgKiA9PiBiMiAqIGExID0gYTIgKiBiMSAqIHEgKyBiMSAqIGIyICogclxuICAgICAgICogPT4gKGIyICogYTEgJSBhMiAqIGIxKSAvIChiMSAqIGIyKVxuICAgICAgICovXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgdGhpcy5zICogKFAuZCAqIHRoaXMubikgJSAoUC5uICogdGhpcy5kKSxcbiAgICAgICAgICBQLmQgKiB0aGlzLmRcbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZnJhY3Rpb25hbCBnY2Qgb2YgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oNSw4KS5nY2QoMyw3KSA9PiAxLzU2XG4gICAgICovXG4gICAgICBnY2Q6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG5cbiAgICAgICAgLy8gZ2NkKGEgLyBiLCBjIC8gZCkgPSBnY2QoYSwgYykgLyBsY20oYiwgZClcblxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKGdjZChQLm4sIHRoaXMubikgKiBnY2QoUC5kLCB0aGlzLmQpLCBQLmQgKiB0aGlzLmQpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmcmFjdGlvbmFsIGxjbSBvZiB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbig1LDgpLmxjbSgzLDcpID0+IDE1XG4gICAgICovXG4gICAgICBsY206IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG5cbiAgICAgICAgLy8gbGNtKGEgLyBiLCBjIC8gZCkgPSBsY20oYSwgYykgLyBnY2QoYiwgZClcblxuICAgICAgICBpZiAoUC5uID09PSAwICYmIHRoaXMubiA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oUC5uICogdGhpcy5uLCBnY2QoUC5uLCB0aGlzLm4pICogZ2NkKFAuZCwgdGhpcy5kKSlcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGNlaWwgb2YgYSByYXRpb25hbCBudW1iZXJcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykuY2VpbCgpID0+ICg1IC8gMSlcbiAgICAgKiovXG4gICAgICBjZWlsOiBmdW5jdGlvbiAocGxhY2VzKSB7XG4gICAgICAgIHBsYWNlcyA9IE1hdGgucG93KDEwLCBwbGFjZXMgfHwgMClcblxuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLmNlaWwocGxhY2VzICogdGhpcy5zICogdGhpcy5uIC8gdGhpcy5kKSwgcGxhY2VzKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZmxvb3Igb2YgYSByYXRpb25hbCBudW1iZXJcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykuZmxvb3IoKSA9PiAoNCAvIDEpXG4gICAgICoqL1xuICAgICAgZmxvb3I6IGZ1bmN0aW9uIChwbGFjZXMpIHtcbiAgICAgICAgcGxhY2VzID0gTWF0aC5wb3coMTAsIHBsYWNlcyB8fCAwKVxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGguZmxvb3IocGxhY2VzICogdGhpcy5zICogdGhpcy5uIC8gdGhpcy5kKSwgcGxhY2VzKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogUm91bmRzIGEgcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5yb3VuZCgpID0+ICg0IC8gMSlcbiAgICAgKiovXG4gICAgICByb3VuZDogZnVuY3Rpb24gKHBsYWNlcykge1xuICAgICAgICBwbGFjZXMgPSBNYXRoLnBvdygxMCwgcGxhY2VzIHx8IDApXG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5yb3VuZChwbGFjZXMgKiB0aGlzLnMgKiB0aGlzLm4gLyB0aGlzLmQpLCBwbGFjZXMpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBpbnZlcnNlIG9mIHRoZSBmcmFjdGlvbiwgbWVhbnMgbnVtZXJhdG9yIGFuZCBkZW51bWVyYXRvciBhcmUgZXhjaGFuZ2VkXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFstMywgNF0pLmludmVyc2UoKSA9PiAtNCAvIDNcbiAgICAgKiovXG4gICAgICBpbnZlcnNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24odGhpcy5zICogdGhpcy5kLCB0aGlzLm4pXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmcmFjdGlvbiB0byBzb21lIGludGVnZXIgZXhwb25lbnRcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oLTEsMikucG93KC0zKSA9PiAtOFxuICAgICAqL1xuICAgICAgcG93OiBmdW5jdGlvbiAobSkge1xuICAgICAgICBpZiAobSA8IDApIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGgucG93KHRoaXMucyAqIHRoaXMuZCwgLW0pLCBNYXRoLnBvdyh0aGlzLm4sIC1tKSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGgucG93KHRoaXMucyAqIHRoaXMubiwgbSksIE1hdGgucG93KHRoaXMuZCwgbSkpXG4gICAgICAgIH1cbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHR3byByYXRpb25hbCBudW1iZXJzIGFyZSB0aGUgc2FtZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigxOS42KS5lcXVhbHMoWzk4LCA1XSk7XG4gICAgICoqL1xuICAgICAgZXF1YWxzOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gdGhpcy5zICogdGhpcy5uICogUC5kID09PSBQLnMgKiBQLm4gKiB0aGlzLmQgLy8gU2FtZSBhcyBjb21wYXJlKCkgPT09IDBcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHR3byByYXRpb25hbCBudW1iZXJzIGFyZSB0aGUgc2FtZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigxOS42KS5lcXVhbHMoWzk4LCA1XSk7XG4gICAgICoqL1xuICAgICAgY29tcGFyZTogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgdmFyIHQgPSAodGhpcy5zICogdGhpcy5uICogUC5kIC0gUC5zICogUC5uICogdGhpcy5kKVxuICAgICAgICByZXR1cm4gKHQgPiAwKSAtICh0IDwgMClcbiAgICAgIH0sXG5cbiAgICAgIHNpbXBsaWZ5OiBmdW5jdGlvbiAoZXBzKSB7XG4gICAgICAvLyBGaXJzdCBuYWl2ZSBpbXBsZW1lbnRhdGlvbiwgbmVlZHMgaW1wcm92ZW1lbnRcblxuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjb250ID0gdGhpcy5hYnMoKS50b0NvbnRpbnVlZCgpXG5cbiAgICAgICAgZXBzID0gZXBzIHx8IDAuMDAxXG5cbiAgICAgICAgZnVuY3Rpb24gcmVjIChhKSB7XG4gICAgICAgICAgaWYgKGEubGVuZ3RoID09PSAxKSB7IHJldHVybiBuZXcgRnJhY3Rpb24oYVswXSkgfVxuICAgICAgICAgIHJldHVybiByZWMoYS5zbGljZSgxKSkuaW52ZXJzZSgpLmFkZChhWzBdKVxuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb250Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdmFyIHRtcCA9IHJlYyhjb250LnNsaWNlKDAsIGkgKyAxKSlcbiAgICAgICAgICBpZiAodG1wLnN1Yih0aGlzLmFicygpKS5hYnMoKS52YWx1ZU9mKCkgPCBlcHMpIHtcbiAgICAgICAgICAgIHJldHVybiB0bXAubXVsKHRoaXMucylcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHR3byByYXRpb25hbCBudW1iZXJzIGFyZSBkaXZpc2libGVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oMTkuNikuZGl2aXNpYmxlKDEuNSk7XG4gICAgICovXG4gICAgICBkaXZpc2libGU6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiAhKCEoUC5uICogdGhpcy5kKSB8fCAoKHRoaXMubiAqIFAuZCkgJSAoUC5uICogdGhpcy5kKSkpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgZGVjaW1hbCByZXByZXNlbnRhdGlvbiBvZiB0aGUgZnJhY3Rpb25cbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxMDAuJzkxODIzJ1wiKS52YWx1ZU9mKCkgPT4gMTAwLjkxODIzOTE4MjM5MTgzXG4gICAgICoqL1xuICAgICAgdmFsdWVPZjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zICogdGhpcy5uIC8gdGhpcy5kXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgc3RyaW5nLWZyYWN0aW9uIHJlcHJlc2VudGF0aW9uIG9mIGEgRnJhY3Rpb24gb2JqZWN0XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiMS4nMydcIikudG9GcmFjdGlvbigpID0+IFwiNCAxLzNcIlxuICAgICAqKi9cbiAgICAgIHRvRnJhY3Rpb246IGZ1bmN0aW9uIChleGNsdWRlV2hvbGUpIHtcbiAgICAgICAgdmFyIHdob2xlOyB2YXIgc3RyID0gJydcbiAgICAgICAgdmFyIG4gPSB0aGlzLm5cbiAgICAgICAgdmFyIGQgPSB0aGlzLmRcbiAgICAgICAgaWYgKHRoaXMucyA8IDApIHtcbiAgICAgICAgICBzdHIgKz0gJy0nXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZCA9PT0gMSkge1xuICAgICAgICAgIHN0ciArPSBuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGV4Y2x1ZGVXaG9sZSAmJiAod2hvbGUgPSBNYXRoLmZsb29yKG4gLyBkKSkgPiAwKSB7XG4gICAgICAgICAgICBzdHIgKz0gd2hvbGVcbiAgICAgICAgICAgIHN0ciArPSAnICdcbiAgICAgICAgICAgIG4gJT0gZFxuICAgICAgICAgIH1cblxuICAgICAgICAgIHN0ciArPSBuXG4gICAgICAgICAgc3RyICs9ICcvJ1xuICAgICAgICAgIHN0ciArPSBkXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0clxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogUmV0dXJucyBhIGxhdGV4IHJlcHJlc2VudGF0aW9uIG9mIGEgRnJhY3Rpb24gb2JqZWN0XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiMS4nMydcIikudG9MYXRleCgpID0+IFwiXFxmcmFjezR9ezN9XCJcbiAgICAgKiovXG4gICAgICB0b0xhdGV4OiBmdW5jdGlvbiAoZXhjbHVkZVdob2xlKSB7XG4gICAgICAgIHZhciB3aG9sZTsgdmFyIHN0ciA9ICcnXG4gICAgICAgIHZhciBuID0gdGhpcy5uXG4gICAgICAgIHZhciBkID0gdGhpcy5kXG4gICAgICAgIGlmICh0aGlzLnMgPCAwKSB7XG4gICAgICAgICAgc3RyICs9ICctJ1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGQgPT09IDEpIHtcbiAgICAgICAgICBzdHIgKz0gblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChleGNsdWRlV2hvbGUgJiYgKHdob2xlID0gTWF0aC5mbG9vcihuIC8gZCkpID4gMCkge1xuICAgICAgICAgICAgc3RyICs9IHdob2xlXG4gICAgICAgICAgICBuICU9IGRcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzdHIgKz0gJ1xcXFxmcmFjeydcbiAgICAgICAgICBzdHIgKz0gblxuICAgICAgICAgIHN0ciArPSAnfXsnXG4gICAgICAgICAgc3RyICs9IGRcbiAgICAgICAgICBzdHIgKz0gJ30nXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0clxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogUmV0dXJucyBhbiBhcnJheSBvZiBjb250aW51ZWQgZnJhY3Rpb24gZWxlbWVudHNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCI3LzhcIikudG9Db250aW51ZWQoKSA9PiBbMCwxLDddXG4gICAgICovXG4gICAgICB0b0NvbnRpbnVlZDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdFxuICAgICAgICB2YXIgYSA9IHRoaXMublxuICAgICAgICB2YXIgYiA9IHRoaXMuZFxuICAgICAgICB2YXIgcmVzID0gW11cblxuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc1xuICAgICAgICB9XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgIHJlcy5wdXNoKE1hdGguZmxvb3IoYSAvIGIpKVxuICAgICAgICAgIHQgPSBhICUgYlxuICAgICAgICAgIGEgPSBiXG4gICAgICAgICAgYiA9IHRcbiAgICAgICAgfSB3aGlsZSAoYSAhPT0gMSlcblxuICAgICAgICByZXR1cm4gcmVzXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGEgZnJhY3Rpb24gd2l0aCBhbGwgZGlnaXRzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiMTAwLic5MTgyMydcIikudG9TdHJpbmcoKSA9PiBcIjEwMC4oOTE4MjMpXCJcbiAgICAgKiovXG4gICAgICB0b1N0cmluZzogZnVuY3Rpb24gKGRlYykge1xuICAgICAgICB2YXIgZ1xuICAgICAgICB2YXIgTiA9IHRoaXMublxuICAgICAgICB2YXIgRCA9IHRoaXMuZFxuXG4gICAgICAgIGlmIChpc05hTihOKSB8fCBpc05hTihEKSkge1xuICAgICAgICAgIHJldHVybiAnTmFOJ1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFGcmFjdGlvbi5SRURVQ0UpIHtcbiAgICAgICAgICBnID0gZ2NkKE4sIEQpXG4gICAgICAgICAgTiAvPSBnXG4gICAgICAgICAgRCAvPSBnXG4gICAgICAgIH1cblxuICAgICAgICBkZWMgPSBkZWMgfHwgMTUgLy8gMTUgPSBkZWNpbWFsIHBsYWNlcyB3aGVuIG5vIHJlcGl0YXRpb25cblxuICAgICAgICB2YXIgY3ljTGVuID0gY3ljbGVMZW4oTiwgRCkgLy8gQ3ljbGUgbGVuZ3RoXG4gICAgICAgIHZhciBjeWNPZmYgPSBjeWNsZVN0YXJ0KE4sIEQsIGN5Y0xlbikgLy8gQ3ljbGUgc3RhcnRcblxuICAgICAgICB2YXIgc3RyID0gdGhpcy5zID09PSAtMSA/ICctJyA6ICcnXG5cbiAgICAgICAgc3RyICs9IE4gLyBEIHwgMFxuXG4gICAgICAgIE4gJT0gRFxuICAgICAgICBOICo9IDEwXG5cbiAgICAgICAgaWYgKE4pIHsgc3RyICs9ICcuJyB9XG5cbiAgICAgICAgaWYgKGN5Y0xlbikge1xuICAgICAgICAgIGZvciAodmFyIGkgPSBjeWNPZmY7IGktLTspIHtcbiAgICAgICAgICAgIHN0ciArPSBOIC8gRCB8IDBcbiAgICAgICAgICAgIE4gJT0gRFxuICAgICAgICAgICAgTiAqPSAxMFxuICAgICAgICAgIH1cbiAgICAgICAgICBzdHIgKz0gJygnXG4gICAgICAgICAgZm9yICh2YXIgaSA9IGN5Y0xlbjsgaS0tOykge1xuICAgICAgICAgICAgc3RyICs9IE4gLyBEIHwgMFxuICAgICAgICAgICAgTiAlPSBEXG4gICAgICAgICAgICBOICo9IDEwXG4gICAgICAgICAgfVxuICAgICAgICAgIHN0ciArPSAnKSdcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gZGVjOyBOICYmIGktLTspIHtcbiAgICAgICAgICAgIHN0ciArPSBOIC8gRCB8IDBcbiAgICAgICAgICAgIE4gJT0gRFxuICAgICAgICAgICAgTiAqPSAxMFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RyXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB1bmRlZmluZWQgPT09ICdmdW5jdGlvbicgJiYgdW5kZWZpbmVkLmFtZCkge1xuICAgICAgdW5kZWZpbmVkKFtdLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBGcmFjdGlvblxuICAgICAgfSlcbiAgICB9IGVsc2UgaWYgKCdvYmplY3QnID09PSAnb2JqZWN0Jykge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KVxuICAgICAgRnJhY3Rpb24uZGVmYXVsdCA9IEZyYWN0aW9uXG4gICAgICBGcmFjdGlvbi5GcmFjdGlvbiA9IEZyYWN0aW9uXG4gICAgICBtb2R1bGUuZXhwb3J0cyA9IEZyYWN0aW9uXG4gICAgfSBlbHNlIHtcbiAgICAgIHJvb3QuRnJhY3Rpb24gPSBGcmFjdGlvblxuICAgIH1cbiAgfSkoY29tbW9uanNIZWxwZXJzLmNvbW1vbmpzR2xvYmFsKVxufSlcblxuZXhwb3J0IGRlZmF1bHQgLyogQF9fUFVSRV9fICovY29tbW9uanNIZWxwZXJzLmdldERlZmF1bHRFeHBvcnRGcm9tQ2pzKGZyYWN0aW9uKVxuZXhwb3J0IHsgZnJhY3Rpb24gYXMgX19tb2R1bGVFeHBvcnRzIH1cbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIE1vbm9taWFsIHtcbiAgY29uc3RydWN0b3IgKGMsIHZzKSB7XG4gICAgaWYgKCFpc05hTihjKSAmJiB2cyBpbnN0YW5jZW9mIE1hcCkge1xuICAgICAgdGhpcy5jID0gY1xuICAgICAgdGhpcy52cyA9IHZzXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgYyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuaW5pdFN0cihjKVxuICAgIH0gZWxzZSBpZiAoIWlzTmFOKGMpKSB7XG4gICAgICB0aGlzLmMgPSBjXG4gICAgICB0aGlzLnZzID0gbmV3IE1hcCgpXG4gICAgfSBlbHNlIHsgLy8gZGVmYXVsdCBhcyBhIHRlc3Q6IDR4XjJ5XG4gICAgICB0aGlzLmMgPSA0XG4gICAgICB0aGlzLnZzID0gbmV3IE1hcChbWyd4JywgMl0sIFsneScsIDFdXSlcbiAgICB9XG4gIH1cblxuICBjbG9uZSAoKSB7XG4gICAgY29uc3QgdnMgPSBuZXcgTWFwKHRoaXMudnMpXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbCh0aGlzLmMsIHZzKVxuICB9XG5cbiAgbXVsICh0aGF0KSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIE1vbm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBNb25vbWlhbCh0aGF0KVxuICAgIH1cbiAgICBjb25zdCBjID0gdGhpcy5jICogdGhhdC5jXG4gICAgbGV0IHZzID0gbmV3IE1hcCgpXG4gICAgdGhpcy52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICh0aGF0LnZzLmhhcyh2YXJpYWJsZSkpIHtcbiAgICAgICAgdnMuc2V0KHZhcmlhYmxlLCB0aGlzLnZzLmdldCh2YXJpYWJsZSkgKyB0aGF0LnZzLmdldCh2YXJpYWJsZSkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2cy5zZXQodmFyaWFibGUsIHRoaXMudnMuZ2V0KHZhcmlhYmxlKSlcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhhdC52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICghdnMuaGFzKHZhcmlhYmxlKSkge1xuICAgICAgICB2cy5zZXQodmFyaWFibGUsIHRoYXQudnMuZ2V0KHZhcmlhYmxlKSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHZzID0gbmV3IE1hcChbLi4udnMuZW50cmllcygpXS5zb3J0KCkpXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbChjLCB2cylcbiAgfVxuXG4gIHRvTGF0ZXggKCkge1xuICAgIGlmICh0aGlzLnZzLnNpemUgPT09IDApIHJldHVybiB0aGlzLmMudG9TdHJpbmcoKVxuICAgIGxldCBzdHIgPSB0aGlzLmMgPT09IDEgPyAnJ1xuICAgICAgOiB0aGlzLmMgPT09IC0xID8gJy0nXG4gICAgICAgIDogdGhpcy5jLnRvU3RyaW5nKClcbiAgICB0aGlzLnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKGluZGV4ID09PSAxKSB7XG4gICAgICAgIHN0ciArPSB2YXJpYWJsZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyICs9IHZhcmlhYmxlICsgJ14nICsgaW5kZXhcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBzdHJcbiAgfVxuXG4gIHNvcnQgKCkge1xuICAgIC8vIHNvcnRzIChtb2RpZmllcyBvYmplY3QpXG4gICAgdGhpcy52cyA9IG5ldyBNYXAoWy4uLnRoaXMudnMuZW50cmllcygpXS5zb3J0KCkpXG4gIH1cblxuICBjbGVhblplcm9zICgpIHtcbiAgICB0aGlzLnZzLmZvckVhY2goKGlkeCwgdikgPT4ge1xuICAgICAgaWYgKGlkeCA9PT0gMCkgdGhpcy52cy5kZWxldGUodilcbiAgICB9KVxuICB9XG5cbiAgbGlrZSAodGhhdCkge1xuICAgIC8vIHJldHVybiB0cnVlIGlmIGxpa2UgdGVybXMsIGZhbHNlIGlmIG90aGVyd2lzZVxuICAgIC8vIG5vdCB0aGUgbW9zdCBlZmZpY2llbnQgYXQgdGhlIG1vbWVudCwgYnV0IGdvb2QgZW5vdWdoLlxuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgTW9ub21pYWwodGhhdClcbiAgICB9XG5cbiAgICBsZXQgbGlrZSA9IHRydWVcbiAgICB0aGlzLnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKCF0aGF0LnZzLmhhcyh2YXJpYWJsZSkgfHwgdGhhdC52cy5nZXQodmFyaWFibGUpICE9PSBpbmRleCkge1xuICAgICAgICBsaWtlID0gZmFsc2VcbiAgICAgIH1cbiAgICB9KVxuICAgIHRoYXQudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAoIXRoaXMudnMuaGFzKHZhcmlhYmxlKSB8fCB0aGlzLnZzLmdldCh2YXJpYWJsZSkgIT09IGluZGV4KSB7XG4gICAgICAgIGxpa2UgPSBmYWxzZVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGxpa2VcbiAgfVxuXG4gIGFkZCAodGhhdCwgY2hlY2tMaWtlKSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIE1vbm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBNb25vbWlhbCh0aGF0KVxuICAgIH1cbiAgICAvLyBhZGRzIHR3byBjb21wYXRpYmxlIG1vbm9taWFsc1xuICAgIC8vIGNoZWNrTGlrZSAoZGVmYXVsdCB0cnVlKSB3aWxsIGNoZWNrIGZpcnN0IGlmIHRoZXkgYXJlIGxpa2UgYW5kIHRocm93IGFuIGV4Y2VwdGlvblxuICAgIC8vIHVuZGVmaW5lZCBiZWhhdmlvdXIgaWYgY2hlY2tMaWtlIGlzIGZhbHNlXG4gICAgaWYgKGNoZWNrTGlrZSA9PT0gdW5kZWZpbmVkKSBjaGVja0xpa2UgPSB0cnVlXG4gICAgaWYgKGNoZWNrTGlrZSAmJiAhdGhpcy5saWtlKHRoYXQpKSB0aHJvdyBuZXcgRXJyb3IoJ0FkZGluZyB1bmxpa2UgdGVybXMnKVxuICAgIGNvbnN0IGMgPSB0aGlzLmMgKyB0aGF0LmNcbiAgICBjb25zdCB2cyA9IHRoaXMudnNcbiAgICByZXR1cm4gbmV3IE1vbm9taWFsKGMsIHZzKVxuICB9XG5cbiAgaW5pdFN0ciAoc3RyKSB7XG4gICAgLy8gY3VycmVudGx5IG5vIGVycm9yIGNoZWNraW5nIGFuZCBmcmFnaWxlXG4gICAgLy8gVGhpbmdzIG5vdCB0byBwYXNzIGluOlxuICAgIC8vICB6ZXJvIGluZGljZXNcbiAgICAvLyAgbXVsdGktY2hhcmFjdGVyIHZhcmlhYmxlc1xuICAgIC8vICBuZWdhdGl2ZSBpbmRpY2VzXG4gICAgLy8gIG5vbi1pbnRlZ2VyIGNvZWZmaWNpZW50c1xuICAgIGNvbnN0IGxlYWQgPSBzdHIubWF0Y2goL14tP1xcZCovKVswXVxuICAgIGNvbnN0IGMgPSBsZWFkID09PSAnJyA/IDFcbiAgICAgIDogbGVhZCA9PT0gJy0nID8gLTFcbiAgICAgICAgOiBwYXJzZUludChsZWFkKVxuICAgIGxldCB2cyA9IHN0ci5tYXRjaCgvKFthLXpBLVpdKShcXF5cXGQrKT8vZylcbiAgICBpZiAoIXZzKSB2cyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgdiA9IHZzW2ldLnNwbGl0KCdeJylcbiAgICAgIHZbMV0gPSB2WzFdID8gcGFyc2VJbnQodlsxXSkgOiAxXG4gICAgICB2c1tpXSA9IHZcbiAgICB9XG4gICAgdnMgPSB2cy5maWx0ZXIodiA9PiB2WzFdICE9PSAwKVxuICAgIHRoaXMuYyA9IGNcbiAgICB0aGlzLnZzID0gbmV3IE1hcCh2cylcbiAgfVxuXG4gIHN0YXRpYyB2YXIgKHYpIHtcbiAgICAvLyBmYWN0b3J5IGZvciBhIHNpbmdsZSB2YXJpYWJsZSBtb25vbWlhbFxuICAgIGNvbnN0IGMgPSAxXG4gICAgY29uc3QgdnMgPSBuZXcgTWFwKFtbdiwgMV1dKVxuICAgIHJldHVybiBuZXcgTW9ub21pYWwoYywgdnMpXG4gIH1cbn1cbiIsImltcG9ydCBNb25vbWlhbCBmcm9tICdNb25vbWlhbCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUG9seW5vbWlhbCB7XG4gIGNvbnN0cnVjdG9yICh0ZXJtcykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHRlcm1zKSAmJiAodGVybXNbMF0gaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRlcm1zLm1hcCh0ID0+IHQuY2xvbmUoKSlcbiAgICAgIHRoaXMudGVybXMgPSB0ZXJtc1xuICAgIH0gZWxzZSBpZiAoIWlzTmFOKHRlcm1zKSkge1xuICAgICAgdGhpcy5pbml0TnVtKHRlcm1zKVxuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRlcm1zID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5pbml0U3RyKHRlcm1zKVxuICAgIH1cbiAgfVxuXG4gIGluaXRTdHIgKHN0cikge1xuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9cXCstL2csICctJykgLy8gYSBob3JyaWJsZSBib2RnZVxuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC8tL2csICcrLScpIC8vIG1ha2UgbmVnYXRpdmUgdGVybXMgZXhwbGljaXQuXG4gICAgc3RyID0gc3RyLnJlcGxhY2UoL1xccy9nLCAnJykgLy8gc3RyaXAgd2hpdGVzcGFjZVxuICAgIHRoaXMudGVybXMgPSBzdHIuc3BsaXQoJysnKVxuICAgICAgLm1hcChzID0+IG5ldyBNb25vbWlhbChzKSlcbiAgICAgIC5maWx0ZXIodCA9PiB0LmMgIT09IDApXG4gIH1cblxuICBpbml0TnVtIChuKSB7XG4gICAgdGhpcy50ZXJtcyA9IFtuZXcgTW9ub21pYWwobildXG4gIH1cblxuICB0b0xhdGV4ICgpIHtcbiAgICBsZXQgc3RyID0gJydcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGVybXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChpID4gMCAmJiB0aGlzLnRlcm1zW2ldLmMgPj0gMCkge1xuICAgICAgICBzdHIgKz0gJysnXG4gICAgICB9XG4gICAgICBzdHIgKz0gdGhpcy50ZXJtc1tpXS50b0xhdGV4KClcbiAgICB9XG4gICAgcmV0dXJuIHN0clxuICB9XG5cbiAgdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiB0aGlzLnRvTGFUZVgoKVxuICB9XG5cbiAgY2xvbmUgKCkge1xuICAgIGNvbnN0IHRlcm1zID0gdGhpcy50ZXJtcy5tYXAodCA9PiB0LmNsb25lKCkpXG4gICAgcmV0dXJuIG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuICB9XG5cbiAgc2ltcGxpZnkgKCkge1xuICAgIC8vIGNvbGxlY3RzIGxpa2UgdGVybXMgYW5kIHJlbW92ZXMgemVybyB0ZXJtc1xuICAgIC8vIGRvZXMgbm90IG1vZGlmeSBvcmlnaW5hbFxuICAgIC8vIFRoaXMgc2VlbXMgcHJvYmFibHkgaW5lZmZpY2llbnQsIGdpdmVuIHRoZSBkYXRhIHN0cnVjdHVyZVxuICAgIC8vIFdvdWxkIGJlIGJldHRlciB0byB1c2Ugc29tZXRoaW5nIGxpa2UgYSBsaW5rZWQgbGlzdCBtYXliZT9cbiAgICBjb25zdCB0ZXJtcyA9IHRoaXMudGVybXMuc2xpY2UoKVxuICAgIGxldCBuZXd0ZXJtcyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0ZXJtcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCF0ZXJtc1tpXSkgY29udGludWVcbiAgICAgIGxldCBuZXd0ZXJtID0gdGVybXNbaV1cbiAgICAgIGZvciAobGV0IGogPSBpICsgMTsgaiA8IHRlcm1zLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmICghdGVybXNbal0pIGNvbnRpbnVlXG4gICAgICAgIGlmICh0ZXJtc1tqXS5saWtlKHRlcm1zW2ldKSkge1xuICAgICAgICAgIG5ld3Rlcm0gPSBuZXd0ZXJtLmFkZCh0ZXJtc1tqXSlcbiAgICAgICAgICB0ZXJtc1tqXSA9IG51bGxcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbmV3dGVybXMucHVzaChuZXd0ZXJtKVxuICAgICAgdGVybXNbaV0gPSBudWxsXG4gICAgfVxuICAgIG5ld3Rlcm1zID0gbmV3dGVybXMuZmlsdGVyKHQgPT4gdC5jICE9PSAwKVxuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbChuZXd0ZXJtcylcbiAgfVxuXG4gIGFkZCAodGhhdCwgc2ltcGxpZnkpIHtcbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgUG9seW5vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgUG9seW5vbWlhbCh0aGF0KVxuICAgIH1cbiAgICBpZiAoc2ltcGxpZnkgPT09IHVuZGVmaW5lZCkgc2ltcGxpZnkgPSB0cnVlXG4gICAgY29uc3QgdGVybXMgPSB0aGlzLnRlcm1zLmNvbmNhdCh0aGF0LnRlcm1zKVxuICAgIGxldCByZXN1bHQgPSBuZXcgUG9seW5vbWlhbCh0ZXJtcylcblxuICAgIGlmIChzaW1wbGlmeSkgcmVzdWx0ID0gcmVzdWx0LnNpbXBsaWZ5KClcblxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIG11bCAodGhhdCwgc2ltcGxpZnkpIHtcbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgUG9seW5vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgUG9seW5vbWlhbCh0aGF0KVxuICAgIH1cbiAgICBjb25zdCB0ZXJtcyA9IFtdXG4gICAgaWYgKHNpbXBsaWZ5ID09PSB1bmRlZmluZWQpIHNpbXBsaWZ5ID0gdHJ1ZVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50ZXJtcy5sZW5ndGg7IGkrKykge1xuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB0aGF0LnRlcm1zLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHRlcm1zLnB1c2godGhpcy50ZXJtc1tpXS5tdWwodGhhdC50ZXJtc1tqXSkpXG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IHJlc3VsdCA9IG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuICAgIGlmIChzaW1wbGlmeSkgcmVzdWx0ID0gcmVzdWx0LnNpbXBsaWZ5KClcblxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIHBvdyAobiwgc2ltcGxpZnkpIHtcbiAgICBsZXQgcmVzdWx0ID0gdGhpc1xuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbjsgaSsrKSB7XG4gICAgICByZXN1bHQgPSByZXN1bHQubXVsKHRoaXMpXG4gICAgfVxuICAgIGlmIChzaW1wbGlmeSkgcmVzdWx0ID0gcmVzdWx0LnNpbXBsaWZ5KClcbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICBzdGF0aWMgdmFyICh2KSB7XG4gICAgLy8gZmFjdG9yeSBmb3IgYSBzaW5nbGUgdmFyaWFibGUgcG9seW5vbWlhbFxuICAgIGNvbnN0IHRlcm1zID0gW01vbm9taWFsLnZhcih2KV1cbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwodGVybXMpXG4gIH1cblxuICBzdGF0aWMgeCAoKSB7XG4gICAgcmV0dXJuIFBvbHlub21pYWwudmFyKCd4JylcbiAgfVxuXG4gIHN0YXRpYyBjb25zdCAobikge1xuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbChuKVxuICB9XG59XG4iLCJpbXBvcnQgeyBHcmFwaGljUSwgR3JhcGhpY1FWaWV3IH0gZnJvbSAnR3JhcGhpY1EnXG5pbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgRnJhY3Rpb24gZnJvbSAnZnJhY3Rpb24uanMnXG5pbXBvcnQgUG9seW5vbWlhbCBmcm9tICdQb2x5bm9taWFsJ1xuaW1wb3J0IHsgcmFuZEVsZW0sIHJhbmRCZXR3ZWVuLCByYW5kQmV0d2VlbkZpbHRlciwgZ2NkIH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBcml0aG1hZ29uUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcigpIC8vIHByb2Nlc3NlcyBvcHRpb25zIGludG8gdGhpcy5zZXR0aW5nc1xuICAgIE9iamVjdC5hc3NpZ24odGhpcy5zZXR0aW5ncywgb3B0aW9ucykgLy8gb3ZlcnJpZGUgc2V0dGluZ3Mgd2l0aCBuZXcgb3B0aW9ucyBwYXNzZWRcbiAgICB0aGlzLmRhdGEgPSBuZXcgQXJpdGhtYWdvblFEYXRhKHRoaXMuc2V0dGluZ3MpXG4gICAgdGhpcy52aWV3ID0gbmV3IEFyaXRobWFnb25RVmlldyh0aGlzLmRhdGEsIHRoaXMuc2V0dGluZ3MpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHsgcmV0dXJuICdDb21wbGV0ZSB0aGUgYXJpdGhtYWdvbjonIH1cbn1cblxuQXJpdGhtYWdvblEub3B0aW9uc1NwZWMgPSBbXG4gIHtcbiAgICB0aXRsZTogJ1ZlcnRpY2VzJyxcbiAgICBpZDogJ24nLFxuICAgIHR5cGU6ICdpbnQnLFxuICAgIG1pbjogMyxcbiAgICBtYXg6IDIwLFxuICAgIGRlZmF1bHQ6IDNcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVHlwZScsXG4gICAgaWQ6ICd0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ0ludGVnZXIgKCspJywgaWQ6ICdpbnRlZ2VyLWFkZCcgfSxcbiAgICAgIHsgdGl0bGU6ICdJbnRlZ2VyIChcXHUwMGQ3KScsIGlkOiAnaW50ZWdlci1tdWx0aXBseScgfSxcbiAgICAgIHsgdGl0bGU6ICdGcmFjdGlvbiAoKyknLCBpZDogJ2ZyYWN0aW9uLWFkZCcgfSxcbiAgICAgIHsgdGl0bGU6ICdGcmFjdGlvbiAoXFx1MDBkNyknLCBpZDogJ2ZyYWN0aW9uLW11bHRpcGx5JyB9LFxuICAgICAgeyB0aXRsZTogJ0FsZ2VicmEgKCspJywgaWQ6ICdhbGdlYnJhLWFkZCcgfSxcbiAgICAgIHsgdGl0bGU6ICdBbGdlYnJhIChcXHUwMGQ3KScsIGlkOiAnYWxnZWJyYS1tdWx0aXBseScgfVxuICAgIF0sXG4gICAgZGVmYXVsdDogJ2ludGVnZXItYWRkJyxcbiAgICB2ZXJ0aWNhbDogdHJ1ZVxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdQdXp6bGUgdHlwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1leGNsdXNpdmUnLFxuICAgIGlkOiAncHV6X2RpZmYnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdNaXNzaW5nIGVkZ2VzJywgaWQ6ICcxJyB9LFxuICAgICAgeyB0aXRsZTogJ01peGVkJywgaWQ6ICcyJyB9LFxuICAgICAgeyB0aXRsZTogJ01pc3NpbmcgdmVydGljZXMnLCBpZDogJzMnIH1cbiAgICBdLFxuICAgIGRlZmF1bHQ6ICcxJ1xuICB9XG5dXG5cbmNsYXNzIEFyaXRobWFnb25RRGF0YSAvKiBleHRlbmRzIEdyYXBoaWNRRGF0YSAqLyB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgLy8gMS4gU2V0IHByb3BlcnRpZXMgZnJvbSBvcHRpb25zXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBuOiAzLCAvLyBudW1iZXIgb2YgdmVydGljZXNcbiAgICAgIG1pbjogLTIwLFxuICAgICAgbWF4OiAyMCxcbiAgICAgIG51bV9kaWZmOiAxLCAvLyBjb21wbGV4aXR5IG9mIHdoYXQncyBpbiB2ZXJ0aWNlcy9lZGdlc1xuICAgICAgcHV6X2RpZmY6IDEsIC8vIDEgLSBWZXJ0aWNlcyBnaXZlbiwgMiAtIHZlcnRpY2VzL2VkZ2VzOyBnaXZlbiAzIC0gb25seSBlZGdlc1xuICAgICAgdHlwZTogJ2ludGVnZXItYWRkJyAvLyBbdHlwZV0tW29wZXJhdGlvbl0gd2hlcmUgW3R5cGVdID0gaW50ZWdlciwgLi4uXG4gICAgICAvLyBhbmQgW29wZXJhdGlvbl0gPSBhZGQvbXVsdGlwbHlcbiAgICB9XG5cbiAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIHRoaXMuc2V0dGluZ3MsIG9wdGlvbnMpXG4gICAgdGhpcy5zZXR0aW5ncy5udW1fZGlmZiA9IHRoaXMuc2V0dGluZ3MuZGlmZmljdWx0eVxuICAgIHRoaXMuc2V0dGluZ3MucHV6X2RpZmYgPSBwYXJzZUludCh0aGlzLnNldHRpbmdzLnB1el9kaWZmKSAvLyEgPyBUaGlzIHNob3VsZCBoYXZlIGJlZW4gZG9uZSB1cHN0cmVhbS4uLlxuXG4gICAgdGhpcy5uID0gdGhpcy5zZXR0aW5ncy5uXG4gICAgdGhpcy52ZXJ0aWNlcyA9IFtdXG4gICAgdGhpcy5zaWRlcyA9IFtdXG5cbiAgICBpZiAodGhpcy5zZXR0aW5ncy50eXBlLmVuZHNXaXRoKCdhZGQnKSkge1xuICAgICAgdGhpcy5vcG5hbWUgPSAnKydcbiAgICAgIHRoaXMub3AgPSAoeCwgeSkgPT4geC5hZGQoeSlcbiAgICB9IGVsc2UgaWYgKHRoaXMuc2V0dGluZ3MudHlwZS5lbmRzV2l0aCgnbXVsdGlwbHknKSkge1xuICAgICAgdGhpcy5vcG5hbWUgPSAnXFx1MDBkNydcbiAgICAgIHRoaXMub3AgPSAoeCwgeSkgPT4geC5tdWwoeSlcbiAgICB9XG5cbiAgICAvLyAyLiBJbml0aWFsaXNlIGJhc2VkIG9uIHR5cGVcbiAgICBzd2l0Y2ggKHRoaXMuc2V0dGluZ3MudHlwZSkge1xuICAgICAgY2FzZSAnaW50ZWdlci1hZGQnOlxuICAgICAgY2FzZSAnaW50ZWdlci1tdWx0aXBseSc6XG4gICAgICAgIHRoaXMuaW5pdEludGVnZXIodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2ZyYWN0aW9uLWFkZCc6XG4gICAgICAgIHRoaXMuaW5pdEZyYWN0aW9uQWRkKHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdmcmFjdGlvbi1tdWx0aXBseSc6XG4gICAgICAgIHRoaXMuaW5pdEZyYWN0aW9uTXVsdGlwbHkodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2FsZ2VicmEtYWRkJzpcbiAgICAgICAgdGhpcy5pbml0QWxnZWJyYUFkZCh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnYWxnZWJyYS1tdWx0aXBseSc6XG4gICAgICAgIHRoaXMuaW5pdEFsZ2VicmFNdWx0aXBseSh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdGVkIHN3aXRjaCBkZWZhdWx0JylcbiAgICB9XG5cbiAgICB0aGlzLmNhbGN1bGF0ZUVkZ2VzKCkgLy8gVXNlIG9wIGZ1bmN0aW9ucyB0byBmaWxsIGluIHRoZSBlZGdlc1xuICAgIHRoaXMuaGlkZUxhYmVscyh0aGlzLnNldHRpbmdzLnB1el9kaWZmKSAvLyBzZXQgc29tZSB2ZXJ0aWNlcy9lZGdlcyBhcyBoaWRkZW4gZGVwZW5kaW5nIG9uIGRpZmZpY3VsdHlcbiAgfVxuXG4gIC8qIE1ldGhvZHMgaW5pdGlhbGlzaW5nIHZlcnRpY2VzICovXG5cbiAgaW5pdEludGVnZXIgKHNldHRpbmdzKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24ocmFuZEJldHdlZW5GaWx0ZXIoXG4gICAgICAgICAgc2V0dGluZ3MubWluLFxuICAgICAgICAgIHNldHRpbmdzLm1heCxcbiAgICAgICAgICB4ID0+IChzZXR0aW5ncy50eXBlLmVuZHNXaXRoKCdhZGQnKSB8fCB4ICE9PSAwKVxuICAgICAgICApKSxcbiAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRGcmFjdGlvbkFkZCAoc2V0dGluZ3MpIHtcbiAgICAvKiBEaWZmaWN1bHR5IHNldHRpbmdzOlxuICAgICAqIDE6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBzYW1lIGRlbm9taW5hdG9yLCBubyBjYW5jZWxsaW5nIGFmdGVyIERPTkVcbiAgICAgKiAyOiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggc2FtZSBkZW5vbWluYXRvciwgbm8gY2FuY2VsbGxpbmcgYW5zd2VyIGltcHJvcGVyIGZyYWN0aW9uXG4gICAgICogMzogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIG9uZSBkZW5vbWluYXRvciBhIG11bHRpcGxlIG9mIGFub3RoZXIsIGdpdmVzIHByb3BlciBmcmFjdGlvblxuICAgICAqIDQ6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBvbmUgZGVub21pbmF0b3IgYSBtdWx0aXBsZSBvZiBhbm90aGVyLCBnaXZlcyBpbXByb3BlciBmcmFjdGlvblxuICAgICAqIDU6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBkaWZmZXJlbnQgZGVub21pbmF0b3JzIChub3QgY28tcHJpbWUpLCBnaXZlcyBpbXByb3BlciBmcmFjdGlvblxuICAgICAqIDY6IG1peGVkIG51bWJlcnNcbiAgICAgKiA3OiBtaXhlZCBudW1iZXJzLCBiaWdnZXIgbnVtZXJhdG9ycyBhbmQgZGVub21pbmF0b3JzXG4gICAgICogODogbWl4ZWQgbnVtYmVycywgYmlnIGludGVnZXIgcGFydHNcbiAgICAgKi9cblxuICAgIC8vIFRPRE8gLSBhbnl0aGluZyBvdGhlciB0aGFuIGRpZmZpY3VsdHkgMS5cbiAgICBjb25zdCBkaWZmID0gc2V0dGluZ3MubnVtX2RpZmZcbiAgICBpZiAoZGlmZiA8IDMpIHtcbiAgICAgIGNvbnN0IGRlbiA9IHJhbmRFbGVtKFs1LCA3LCA5LCAxMSwgMTMsIDE3XSlcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgY29uc3QgcHJldm51bSA9IHRoaXMudmVydGljZXNbaSAtIDFdXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzW2kgLSAxXS52YWwubiA6IHVuZGVmaW5lZFxuICAgICAgICBjb25zdCBuZXh0bnVtID0gdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXVxuICAgICAgICAgID8gdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXS52YWwubiA6IHVuZGVmaW5lZFxuXG4gICAgICAgIGNvbnN0IG1heG51bSA9XG4gICAgICAgICAgZGlmZiA9PT0gMiA/IGRlbiAtIDFcbiAgICAgICAgICAgIDogbmV4dG51bSA/IGRlbiAtIE1hdGgubWF4KG5leHRudW0sIHByZXZudW0pXG4gICAgICAgICAgICAgIDogcHJldm51bSA/IGRlbiAtIHByZXZudW1cbiAgICAgICAgICAgICAgICA6IGRlbiAtIDFcblxuICAgICAgICBjb25zdCBudW0gPSByYW5kQmV0d2VlbkZpbHRlcigxLCBtYXhudW0sIHggPT4gKFxuICAgICAgICAgIC8vIEVuc3VyZXMgbm8gc2ltcGxpZmluZyBhZnRlcndhcmRzIGlmIGRpZmZpY3VsdHkgaXMgMVxuICAgICAgICAgIGdjZCh4LCBkZW4pID09PSAxICYmXG4gICAgICAgICAgKCFwcmV2bnVtIHx8IGdjZCh4ICsgcHJldm51bSwgZGVuKSA9PT0gMSB8fCB4ICsgcHJldm51bSA9PT0gZGVuKSAmJlxuICAgICAgICAgICghbmV4dG51bSB8fCBnY2QoeCArIG5leHRudW0sIGRlbikgPT09IDEgfHwgeCArIG5leHRudW0gPT09IGRlbilcbiAgICAgICAgKSlcblxuICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgIHZhbDogbmV3IEZyYWN0aW9uKG51bSwgZGVuKSxcbiAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZGVuYmFzZSA9IHJhbmRFbGVtKFxuICAgICAgICBkaWZmIDwgNyA/IFsyLCAzLCA1XSA6IFsyLCAzLCA0LCA1LCA2LCA3LCA4LCA5LCAxMCwgMTFdXG4gICAgICApXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHByZXYgPSB0aGlzLnZlcnRpY2VzW2kgLSAxXVxuICAgICAgICAgID8gdGhpcy52ZXJ0aWNlc1tpIC0gMV0udmFsIDogdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dXG4gICAgICAgICAgPyB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dLnZhbCA6IHVuZGVmaW5lZFxuXG4gICAgICAgIGNvbnN0IG1heG11bHRpcGxpZXIgPSBkaWZmIDwgNyA/IDQgOiA4XG5cbiAgICAgICAgY29uc3QgbXVsdGlwbGllciA9XG4gICAgICAgICAgaSAlIDIgPT09IDEgfHwgZGlmZiA+IDQgPyByYW5kQmV0d2VlbkZpbHRlcigyLCBtYXhtdWx0aXBsaWVyLCB4ID0+XG4gICAgICAgICAgICAoIXByZXYgfHwgeCAhPT0gcHJldi5kIC8gZGVuYmFzZSkgJiZcbiAgICAgICAgICAgICghbmV4dCB8fCB4ICE9PSBuZXh0LmQgLyBkZW5iYXNlKVxuICAgICAgICAgICkgOiAxXG5cbiAgICAgICAgY29uc3QgZGVuID0gZGVuYmFzZSAqIG11bHRpcGxpZXJcblxuICAgICAgICBsZXQgbnVtXG4gICAgICAgIGlmIChkaWZmIDwgNikge1xuICAgICAgICAgIG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKDEsIGRlbiAtIDEsIHggPT4gKFxuICAgICAgICAgICAgZ2NkKHgsIGRlbikgPT09IDEgJiZcbiAgICAgICAgICAgIChkaWZmID49IDQgfHwgIXByZXYgfHwgcHJldi5hZGQoeCwgZGVuKSA8PSAxKSAmJlxuICAgICAgICAgICAgKGRpZmYgPj0gNCB8fCAhbmV4dCB8fCBuZXh0LmFkZCh4LCBkZW4pIDw9IDEpXG4gICAgICAgICAgKSlcbiAgICAgICAgfSBlbHNlIGlmIChkaWZmIDwgOCkge1xuICAgICAgICAgIG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKGRlbiArIDEsIGRlbiAqIDYsIHggPT4gZ2NkKHgsIGRlbikgPT09IDEpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoZGVuICogMTAsIGRlbiAqIDEwMCwgeCA9PiBnY2QoeCwgZGVuKSA9PT0gMSlcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgdmFsOiBuZXcgRnJhY3Rpb24obnVtLCBkZW4pLFxuICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRGcmFjdGlvbk11bHRpcGx5IChzZXR0aW5ncykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIGNvbnN0IGQgPSByYW5kQmV0d2VlbigyLCAxMClcbiAgICAgIGNvbnN0IG4gPSByYW5kQmV0d2VlbigxLCBkIC0gMSlcbiAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgIHZhbDogbmV3IEZyYWN0aW9uKG4sIGQpLFxuICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEFsZ2VicmFBZGQgKHNldHRpbmdzKSB7XG4gICAgY29uc3QgZGlmZiA9IHNldHRpbmdzLm51bV9kaWZmXG4gICAgc3dpdGNoIChkaWZmKSB7XG4gICAgICBjYXNlIDE6IHtcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmICsgdmFyaWFibGUpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOlxuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSA8IDAuNSkgeyAvLyB2YXJpYWJsZSArIGNvbnN0YW50XG4gICAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IGNvbnN0YW50ID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwoY29lZmYgKyB2YXJpYWJsZSArICcrJyArIGNvbnN0YW50KSxcbiAgICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZTEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICAgIGxldCB2YXJpYWJsZTIgPSB2YXJpYWJsZTFcbiAgICAgICAgICB3aGlsZSAodmFyaWFibGUyID09PSB2YXJpYWJsZTEpIHtcbiAgICAgICAgICAgIHZhcmlhYmxlMiA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgICAgY29uc3QgY29lZmYxID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IGNvZWZmMiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmMSArIHZhcmlhYmxlMSArICcrJyArIGNvZWZmMiArIHZhcmlhYmxlMiksXG4gICAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0QWxnZWJyYU11bHRpcGx5IChzZXR0aW5ncykge1xuICAgIC8qIERpZmZpY3VsdHk6XG4gICAgICogMTogQWx0ZXJuYXRlIDNhIHdpdGggNFxuICAgICAqIDI6IEFsbCB0ZXJtcyBvZiB0aGUgZm9ybSBudiAtIHVwIHRvIHR3byB2YXJpYWJsZXNcbiAgICAgKiAzOiBBbGwgdGVybXMgb2YgdGhlIGZvcm0gbnZebS4gT25lIHZhcmlhYmxlIG9ubHlcbiAgICAgKiA0OiBBTGwgdGVybXMgb2YgdGhlIGZvcm0gbnheayB5Xmwgel5wLiBrLGwscCAwLTNcbiAgICAgKiA1OiBFeHBhbmQgYnJhY2tldHMgMygyeCs1KVxuICAgICAqIDY6IEV4cGFuZCBicmFja2V0cyAzeCgyeCs1KVxuICAgICAqIDc6IEV4cGFuZCBicmFja2V0cyAzeF4yeSgyeHkrNXleMilcbiAgICAgKiA4OiBFeHBhbmQgYnJhY2tldHMgKHgrMykoeCsyKVxuICAgICAqIDk6IEV4cGFuZCBicmFja2V0cyAoMngtMykoM3grNClcbiAgICAgKiAxMDogRXhwYW5kIGJyYWNrZXRzICgyeF4yLTN4KzQpKDJ4LTUpXG4gICAgICovXG4gICAgY29uc3QgZGlmZiA9IHNldHRpbmdzLm51bV9kaWZmXG4gICAgc3dpdGNoIChkaWZmKSB7XG4gICAgICBjYXNlIDE6XG4gICAgICB7XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCB0ZXJtID0gaSAlIDIgPT09IDAgPyBjb2VmZiA6IGNvZWZmICsgdmFyaWFibGVcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh0ZXJtKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSAyOiB7XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlMSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGNvbnN0IHZhcmlhYmxlMiA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgdmFyaWFibGUgPSByYW5kRWxlbShbdmFyaWFibGUxLCB2YXJpYWJsZTJdKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmICsgdmFyaWFibGUpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDM6IHtcbiAgICAgICAgY29uc3QgdiA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgaWR4ID0gcmFuZEJldHdlZW4oMSwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmICsgdiArICdeJyArIGlkeCksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgNDoge1xuICAgICAgICBjb25zdCBzdGFydEFzY2lpID0gcmFuZEJldHdlZW4oOTcsIDEyMClcbiAgICAgICAgY29uc3QgdjEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkpXG4gICAgICAgIGNvbnN0IHYyID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpICsgMSlcbiAgICAgICAgY29uc3QgdjMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkgKyAyKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgYSA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjEgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjIgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjMgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgdGVybSA9IGEgKyB2MSArIG4xICsgdjIgKyBuMiArIHYzICsgbjNcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh0ZXJtKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSA1OlxuICAgICAgY2FzZSA2OiB7IC8vIGUuZy4gMyh4KSAqICgyeC01KVxuICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgY29uc3RhbnQgPSByYW5kQmV0d2VlbigtOSwgOSkudG9TdHJpbmcoKVxuICAgICAgICAgIGxldCB0ZXJtID0gY29lZmZcbiAgICAgICAgICBpZiAoZGlmZiA9PT0gNiB8fCBpICUgMiA9PT0gMSkgdGVybSArPSB2YXJpYWJsZVxuICAgICAgICAgIGlmIChpICUgMiA9PT0gMSkgdGVybSArPSAnKycgKyBjb25zdGFudFxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDc6IHsgLy8gZS5nLiAzeF4yeSg0eHleMis1eHkpXG4gICAgICAgIGNvbnN0IHN0YXJ0QXNjaWkgPSByYW5kQmV0d2Vlbig5NywgMTIwKVxuICAgICAgICBjb25zdCB2MSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSlcbiAgICAgICAgY29uc3QgdjIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkgKyAxKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgYTEgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4xMSA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMTIgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgbGV0IHRlcm0gPSBhMSArIHYxICsgbjExICsgdjIgKyBuMTJcbiAgICAgICAgICBpZiAoaSAlIDIgPT09IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGEyID0gcmFuZEJldHdlZW4oLTksIDkpLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IG4yMSA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICAgIGNvbnN0IG4yMiA9ICdeJyArIHJhbmRCZXR3ZWVuKDAsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICAgIHRlcm0gKz0gJysnICsgYTIgKyB2MSArIG4yMSArIHYyICsgbjIyXG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKHRlcm0pLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDg6IC8vIHsgZS5nLiAoeCs1KSAqICh4LTIpXG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvbnN0YW50ID0gcmFuZEJldHdlZW4oLTksIDkpLnRvU3RyaW5nKClcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh2YXJpYWJsZSArICcrJyArIGNvbnN0YW50KSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiBNZXRob2QgdG8gY2FsY3VsYXRlIGVkZ2VzIGZyb20gdmVydGljZXMgKi9cbiAgY2FsY3VsYXRlRWRnZXMgKCkge1xuICAgIC8vIENhbGN1bGF0ZSB0aGUgZWRnZXMgZ2l2ZW4gdGhlIHZlcnRpY2VzIHVzaW5nIHRoaXMub3BcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICB0aGlzLnNpZGVzW2ldID0ge1xuICAgICAgICB2YWw6IHRoaXMub3AodGhpcy52ZXJ0aWNlc1tpXS52YWwsIHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl0udmFsKSxcbiAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qIE1hcmsgaGlkZGVuZCBlZGdlcy92ZXJ0aWNlcyAqL1xuXG4gIGhpZGVMYWJlbHMgKHB1enpsZURpZmZpY3VsdHkpIHtcbiAgICAvLyBIaWRlIHNvbWUgbGFiZWxzIHRvIG1ha2UgYSBwdXp6bGVcbiAgICAvLyAxIC0gU2lkZXMgaGlkZGVuLCB2ZXJ0aWNlcyBzaG93blxuICAgIC8vIDIgLSBTb21lIHNpZGVzIGhpZGRlbiwgc29tZSB2ZXJ0aWNlcyBoaWRkZW5cbiAgICAvLyAzIC0gQWxsIHZlcnRpY2VzIGhpZGRlblxuICAgIHN3aXRjaCAocHV6emxlRGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICB0aGlzLnNpZGVzLmZvckVhY2goeCA9PiB7IHguaGlkZGVuID0gdHJ1ZSB9KVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAyOiB7XG4gICAgICAgIHRoaXMuc2lkZXMuZm9yRWFjaCh4ID0+IHsgeC5oaWRkZW4gPSB0cnVlIH0pXG4gICAgICAgIGNvbnN0IHNob3dzaWRlID0gcmFuZEJldHdlZW4oMCwgdGhpcy5uIC0gMSwgTWF0aC5yYW5kb20pXG4gICAgICAgIGNvbnN0IGhpZGV2ZXJ0ID0gTWF0aC5yYW5kb20oKSA8IDAuNVxuICAgICAgICAgID8gc2hvd3NpZGUgLy8gcHJldmlvdXMgdmVydGV4XG4gICAgICAgICAgOiAoc2hvd3NpZGUgKyAxKSAlIHRoaXMubiAvLyBuZXh0IHZlcnRleDtcblxuICAgICAgICB0aGlzLnNpZGVzW3Nob3dzaWRlXS5oaWRkZW4gPSBmYWxzZVxuICAgICAgICB0aGlzLnZlcnRpY2VzW2hpZGV2ZXJ0XS5oaWRkZW4gPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlIDM6XG4gICAgICAgIHRoaXMudmVydGljZXMuZm9yRWFjaCh4ID0+IHsgeC5oaWRkZW4gPSB0cnVlIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vX2RpZmZpY3VsdHknKVxuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBBcml0aG1hZ29uUVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICBjb25zdHJ1Y3RvciAoZGF0YSwgb3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIHNldHMgdGhpcy53aWR0aCB0aGlzLmhlaWdodCwgaW5pdGlhbGlzZXMgdGhpcy5sYWJlbHMsIGNyZWF0ZXMgZG9tIGVsZW1lbnRzXG5cbiAgICBjb25zdCB3aWR0aCA9IHRoaXMud2lkdGhcbiAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmhlaWdodFxuICAgIGNvbnN0IHIgPSAwLjM1ICogTWF0aC5taW4od2lkdGgsIGhlaWdodCkgLy8gcmFkaXVzXG4gICAgY29uc3QgbiA9IHRoaXMuZGF0YS5uXG5cbiAgICAvLyBBIHBvaW50IHRvIGxhYmVsIHdpdGggdGhlIG9wZXJhdGlvblxuICAgIC8vIEFsbCBwb2ludHMgZmlyc3Qgc2V0IHVwIHdpdGggKDAsMCkgYXQgY2VudGVyXG4gICAgdGhpcy5vcGVyYXRpb25Qb2ludCA9IG5ldyBQb2ludCgwLCAwKVxuXG4gICAgLy8gUG9zaXRpb24gb2YgdmVydGljZXNcbiAgICB0aGlzLnZlcnRleFBvaW50cyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIGNvbnN0IGFuZ2xlID0gaSAqIE1hdGguUEkgKiAyIC8gbiAtIE1hdGguUEkgLyAyXG4gICAgICB0aGlzLnZlcnRleFBvaW50c1tpXSA9IFBvaW50LmZyb21Qb2xhcihyLCBhbmdsZSlcbiAgICB9XG5cbiAgICAvLyBQb2lzaXRpb24gb2Ygc2lkZSBsYWJlbHNcbiAgICB0aGlzLnNpZGVQb2ludHMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICB0aGlzLnNpZGVQb2ludHNbaV0gPSBQb2ludC5tZWFuKHRoaXMudmVydGV4UG9pbnRzW2ldLCB0aGlzLnZlcnRleFBvaW50c1soaSArIDEpICUgbl0pXG4gICAgfVxuXG4gICAgdGhpcy5hbGxQb2ludHMgPSBbdGhpcy5vcGVyYXRpb25Qb2ludF0uY29uY2F0KHRoaXMudmVydGV4UG9pbnRzKS5jb25jYXQodGhpcy5zaWRlUG9pbnRzKVxuXG4gICAgdGhpcy5yZUNlbnRlcigpIC8vIFJlcG9zaXRpb24gZXZlcnl0aGluZyBwcm9wZXJseVxuXG4gICAgdGhpcy5tYWtlTGFiZWxzKHRydWUpXG5cbiAgICAvLyBEcmF3IGludG8gY2FudmFzXG4gIH1cblxuICByZUNlbnRlciAoKSB7XG4gICAgLy8gRmluZCB0aGUgY2VudGVyIG9mIHRoZSBib3VuZGluZyBib3hcbiAgICBjb25zdCB0b3BsZWZ0ID0gUG9pbnQubWluKHRoaXMuYWxsUG9pbnRzKVxuICAgIGNvbnN0IGJvdHRvbXJpZ2h0ID0gUG9pbnQubWF4KHRoaXMuYWxsUG9pbnRzKVxuICAgIGNvbnN0IGNlbnRlciA9IFBvaW50Lm1lYW4odG9wbGVmdCwgYm90dG9tcmlnaHQpXG5cbiAgICAvLyB0cmFuc2xhdGUgdG8gcHV0IGluIHRoZSBjZW50ZXJcbiAgICB0aGlzLmFsbFBvaW50cy5mb3JFYWNoKHAgPT4ge1xuICAgICAgcC50cmFuc2xhdGUodGhpcy53aWR0aCAvIDIgLSBjZW50ZXIueCwgdGhpcy5oZWlnaHQgLyAyIC0gY2VudGVyLnkpXG4gICAgfSlcbiAgfVxuXG4gIG1ha2VMYWJlbHMgKCkge1xuICAgIC8vIHZlcnRpY2VzXG4gICAgdGhpcy5kYXRhLnZlcnRpY2VzLmZvckVhY2goKHYsIGkpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gdi52YWwudG9MYXRleFxuICAgICAgICA/IHYudmFsLnRvTGF0ZXgodHJ1ZSlcbiAgICAgICAgOiB2LnZhbC50b1N0cmluZygpXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKHtcbiAgICAgICAgcG9zOiB0aGlzLnZlcnRleFBvaW50c1tpXSxcbiAgICAgICAgdGV4dHE6IHYuaGlkZGVuID8gJycgOiB2YWx1ZSxcbiAgICAgICAgdGV4dGE6IHZhbHVlLFxuICAgICAgICBzdHlsZXE6ICdub3JtYWwgdmVydGV4JyxcbiAgICAgICAgc3R5bGVhOiB2LmhpZGRlbiA/ICdhbnN3ZXIgdmVydGV4JyA6ICdub3JtYWwgdmVydGV4J1xuICAgICAgfSlcbiAgICB9KVxuXG4gICAgLy8gc2lkZXNcbiAgICB0aGlzLmRhdGEuc2lkZXMuZm9yRWFjaCgodiwgaSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSB2LnZhbC50b0xhdGV4XG4gICAgICAgID8gdi52YWwudG9MYXRleCh0cnVlKVxuICAgICAgICA6IHYudmFsLnRvU3RyaW5nKClcbiAgICAgIHRoaXMubGFiZWxzLnB1c2goe1xuICAgICAgICBwb3M6IHRoaXMuc2lkZVBvaW50c1tpXSxcbiAgICAgICAgdGV4dHE6IHYuaGlkZGVuID8gJycgOiB2YWx1ZSxcbiAgICAgICAgdGV4dGE6IHZhbHVlLFxuICAgICAgICBzdHlsZXE6ICdub3JtYWwgc2lkZScsXG4gICAgICAgIHN0eWxlYTogdi5oaWRkZW4gPyAnYW5zd2VyIHNpZGUnIDogJ25vcm1hbCBzaWRlJ1xuICAgICAgfSlcbiAgICB9KVxuXG4gICAgLy8gb3BlcmF0aW9uXG4gICAgdGhpcy5sYWJlbHMucHVzaCh7XG4gICAgICBwb3M6IHRoaXMub3BlcmF0aW9uUG9pbnQsXG4gICAgICB0ZXh0cTogdGhpcy5kYXRhLm9wbmFtZSxcbiAgICAgIHRleHRhOiB0aGlzLmRhdGEub3BuYW1lLFxuICAgICAgc3R5bGVxOiAnbm9ybWFsJyxcbiAgICAgIHN0eWxlYTogJ25vcm1hbCdcbiAgICB9KVxuXG4gICAgLy8gc3R5bGluZ1xuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRxXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZXFcbiAgICB9KVxuICB9XG5cbiAgcmVuZGVyICgpIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG4gICAgY29uc3QgbiA9IHRoaXMuZGF0YS5uXG5cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpIC8vIGNsZWFyXG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgY29uc3QgcCA9IHRoaXMudmVydGV4UG9pbnRzW2ldXG4gICAgICBjb25zdCBuZXh0ID0gdGhpcy52ZXJ0ZXhQb2ludHNbKGkgKyAxKSAlIG5dXG4gICAgICBjdHgubW92ZVRvKHAueCwgcC55KVxuICAgICAgY3R4LmxpbmVUbyhuZXh0LngsIG5leHQueSlcbiAgICB9XG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICAvLyBwbGFjZSBsYWJlbHNcbiAgICB0aGlzLnJlbmRlckxhYmVscyh0cnVlKVxuICB9XG5cbiAgc2hvd0Fuc3dlciAoKSB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dGFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlYVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHModHJ1ZSlcbiAgICB0aGlzLmFuc3dlcmVkID0gdHJ1ZVxuICB9XG5cbiAgaGlkZUFuc3dlciAoKSB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHModHJ1ZSlcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxufVxuIiwiaW1wb3J0IFRleHRRIGZyb20gJ1RleHRRJ1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRlc3RRIGV4dGVuZHMgVGV4dFEge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDUsXG4gICAgICBsYWJlbDogJ2EnLFxuICAgICAgdGVzdDE6IFsnZm9vJ10sXG4gICAgICB0ZXN0MjogdHJ1ZVxuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyBwaWNrIGEgcmFuZG9tIG9uZSBvZiB0aGUgc2VsZWN0ZWRcbiAgICBsZXQgdGVzdDFcbiAgICBpZiAoc2V0dGluZ3MudGVzdDEubGVuZ3RoID09PSAwKSB7XG4gICAgICB0ZXN0MSA9ICdub25lJ1xuICAgIH0gZWxzZSB7XG4gICAgICB0ZXN0MSA9IHJhbmRFbGVtKHNldHRpbmdzLnRlc3QxKVxuICAgIH1cblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9ICdkOiAnICsgc2V0dGluZ3MuZGlmZmljdWx0eSArICdcXFxcXFxcXCB0ZXN0MTogJyArIHRlc3QxXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICd0ZXN0MjogJyArIHNldHRpbmdzLnRlc3QyXG5cbiAgICB0aGlzLnJlbmRlcigpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHsgcmV0dXJuICdUZXN0IGNvbW1hbmQgd29yZCcgfVxufVxuXG5UZXN0US5vcHRpb25zU3BlYyA9IFtcbiAge1xuICAgIHRpdGxlOiAnVGVzdCBvcHRpb24gMScsXG4gICAgaWQ6ICd0ZXN0MScsXG4gICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFsnZm9vJywgJ2JhcicsICd3aXp6J10sXG4gICAgZGVmYXVsdDogW11cbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVGVzdCBvcHRpb24gMicsXG4gICAgaWQ6ICd0ZXN0MicsXG4gICAgdHlwZTogJ2Jvb2wnLFxuICAgIGRlZmF1bHQ6IHRydWVcbiAgfVxuXVxuIiwiaW1wb3J0IFRleHRRIGZyb20gJ1RleHRRJ1xuaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFkZEFaZXJvIGV4dGVuZHMgVGV4dFEge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDUsXG4gICAgICBsYWJlbDogJ2EnXG4gICAgfVxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICB0aGlzLmxhYmVsID0gc2V0dGluZ3MubGFiZWxcblxuICAgIC8vIHJhbmRvbSAyIGRpZ2l0ICdkZWNpbWFsJ1xuICAgIGNvbnN0IHEgPSBTdHJpbmcocmFuZEJldHdlZW4oMSwgOSkpICsgU3RyaW5nKHJhbmRCZXR3ZWVuKDAsIDkpKSArICcuJyArIFN0cmluZyhyYW5kQmV0d2VlbigwLCA5KSlcbiAgICBjb25zdCBhID0gcSArICcwJ1xuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gcSArICdcXFxcdGltZXMgMTAnXG4gICAgdGhpcy5hbnN3ZXJMYVRlWCA9ICc9ICcgKyBhXG5cbiAgICB0aGlzLnJlbmRlcigpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ0V2YWx1YXRlJ1xuICB9XG59XG5cbkFkZEFaZXJvLm9wdGlvbnNTcGVjID0gW1xuXVxuIiwiaW1wb3J0IHsgcmFuZEJldHdlZW4gfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgVGV4dFEgZnJvbSAnVGV4dFEnXG5pbXBvcnQgRnJhY3Rpb24gZnJvbSAndmVuZG9yL2ZyYWN0aW9uJ1xuXG4vKiBNYWluIHF1ZXN0aW9uIGNsYXNzLiBUaGlzIHdpbGwgYmUgc3B1biBvZmYgaW50byBkaWZmZXJlbnQgZmlsZSBhbmQgZ2VuZXJhbGlzZWQgKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEVxdWF0aW9uT2ZMaW5lIGV4dGVuZHMgVGV4dFEge1xuICAvLyAnZXh0ZW5kcycgUXVlc3Rpb24sIGJ1dCBub3RoaW5nIHRvIGFjdHVhbGx5IGV4dGVuZFxuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIC8vIGJvaWxlcnBsYXRlXG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogMlxuICAgIH1cblxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG4gICAgY29uc3QgZGlmZmljdWx0eSA9IE1hdGguY2VpbChzZXR0aW5ncy5kaWZmaWN1bHR5IC8gMikgLy8gaW5pdGlhbGx5IHdyaXR0ZW4gZm9yIGRpZmZpY3VsdHkgMS00LCBub3cgbmVlZCAxLTEwXG5cbiAgICAvLyBxdWVzdGlvbiBnZW5lcmF0aW9uIGJlZ2lucyBoZXJlXG4gICAgbGV0IG0sIGMsIHgxLCB5MSwgeDIsIHkyXG4gICAgbGV0IG1pbm0sIG1heG0sIG1pbmMsIG1heGNcblxuICAgIHN3aXRjaCAoZGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOiAvLyBtPjAsIGM+PTBcbiAgICAgIGNhc2UgMjpcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgbWlubSA9IGRpZmZpY3VsdHkgPCAzID8gMSA6IC01XG4gICAgICAgIG1heG0gPSA1XG4gICAgICAgIG1pbmMgPSBkaWZmaWN1bHR5IDwgMiA/IDAgOiAtMTBcbiAgICAgICAgbWF4YyA9IDEwXG4gICAgICAgIG0gPSByYW5kQmV0d2VlbihtaW5tLCBtYXhtKVxuICAgICAgICBjID0gcmFuZEJldHdlZW4obWluYywgbWF4YylcbiAgICAgICAgeDEgPSBkaWZmaWN1bHR5IDwgMyA/IHJhbmRCZXR3ZWVuKDAsIDEwKSA6IHJhbmRCZXR3ZWVuKC0xNSwgMTUpXG4gICAgICAgIHkxID0gbSAqIHgxICsgY1xuXG4gICAgICAgIGlmIChkaWZmaWN1bHR5IDwgMykge1xuICAgICAgICAgIHgyID0gcmFuZEJldHdlZW4oeDEgKyAxLCAxNSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB4MiA9IHgxXG4gICAgICAgICAgd2hpbGUgKHgyID09PSB4MSkgeyB4MiA9IHJhbmRCZXR3ZWVuKC0xNSwgMTUpIH07XG4gICAgICAgIH1cbiAgICAgICAgeTIgPSBtICogeDIgKyBjXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ6IC8vIG0gZnJhY3Rpb24sIHBvaW50cyBhcmUgaW50ZWdlcnNcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgY29uc3QgbWQgPSByYW5kQmV0d2VlbigxLCA1KVxuICAgICAgICBjb25zdCBtbiA9IHJhbmRCZXR3ZWVuKC01LCA1KVxuICAgICAgICBtID0gbmV3IEZyYWN0aW9uKG1uLCBtZClcbiAgICAgICAgeDEgPSBuZXcgRnJhY3Rpb24ocmFuZEJldHdlZW4oLTEwLCAxMCkpXG4gICAgICAgIHkxID0gbmV3IEZyYWN0aW9uKHJhbmRCZXR3ZWVuKC0xMCwgMTApKVxuICAgICAgICBjID0gbmV3IEZyYWN0aW9uKHkxKS5zdWIobS5tdWwoeDEpKVxuICAgICAgICB4MiA9IHgxLmFkZChyYW5kQmV0d2VlbigxLCA1KSAqIG0uZClcbiAgICAgICAgeTIgPSBtLm11bCh4MikuYWRkKGMpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgeHN0ciA9XG4gICAgICAobSA9PT0gMCB8fCAobS5lcXVhbHMgJiYgbS5lcXVhbHMoMCkpKSA/ICcnXG4gICAgICAgIDogKG0gPT09IDEgfHwgKG0uZXF1YWxzICYmIG0uZXF1YWxzKDEpKSkgPyAneCdcbiAgICAgICAgICA6IChtID09PSAtMSB8fCAobS5lcXVhbHMgJiYgbS5lcXVhbHMoLTEpKSkgPyAnLXgnXG4gICAgICAgICAgICA6IChtLnRvTGF0ZXgpID8gbS50b0xhdGV4KCkgKyAneCdcbiAgICAgICAgICAgICAgOiAobSArICd4JylcblxuICAgIGNvbnN0IGNvbnN0c3RyID0gLy8gVE9ETzogV2hlbiBtPWM9MFxuICAgICAgKGMgPT09IDAgfHwgKGMuZXF1YWxzICYmIGMuZXF1YWxzKDApKSkgPyAnJ1xuICAgICAgICA6IChjIDwgMCkgPyAoJyAtICcgKyAoYy5uZWcgPyBjLm5lZygpLnRvTGF0ZXgoKSA6IC1jKSlcbiAgICAgICAgICA6IChjLnRvTGF0ZXgpID8gKCcgKyAnICsgYy50b0xhdGV4KCkpXG4gICAgICAgICAgICA6ICgnICsgJyArIGMpXG5cbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnKCcgKyB4MSArICcsICcgKyB5MSArICcpXFxcXHRleHR7IGFuZCB9KCcgKyB4MiArICcsICcgKyB5MiArICcpJ1xuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAneSA9ICcgKyB4c3RyICsgY29uc3RzdHJcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkge1xuICAgIHJldHVybiAnRmluZCB0aGUgZXF1YXRpb24gb2YgdGhlIGxpbmUgdGhyb3VnaCdcbiAgfVxufVxuIiwiLyogUmVuZGVycyBtaXNzaW5nIGFuZ2xlcyBwcm9ibGVtIHdoZW4gdGhlIGFuZ2xlcyBhcmUgYXQgYSBwb2ludFxuICogSS5lLiBvbiBhIHN0cmFpZ2h0IGxpbmUgb3IgYXJvdW5kIGEgcG9pbnRcbiAqIENvdWxkIGFsc28gYmUgYWRhcHRlZCB0byBhbmdsZXMgZm9ybWluZyBhIHJpZ2h0IGFuZ2xlXG4gKlxuICogU2hvdWxkIGJlIGZsZXhpYmxlIGVub3VnaCBmb3IgbnVtZXJpY2FsIHByb2JsZW1zIG9yIGFsZ2VicmFpYyBvbmVzXG4gKlxuICovXG5cbmltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IEdyYXBoaWNRVmlldyB9IGZyb20gJ0dyYXBoaWNRJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyBleHRlbmRzIEdyYXBoaWNRVmlldyB7XG4gIC8vIHRoaXMuT1xuICAvLyB0aGlzLkFcbiAgLy8gdGhpcy5DID0gW11cbiAgLy8gdGhpcy5sYWJlbHMgPSBbXVxuICAvLyB0aGlzLmNhbnZhc1xuICAvLyB0aGlzLkRPTVxuICAvLyB0aGlzLnJvdGF0aW9uXG4gIGNvbnN0cnVjdG9yIChkYXRhLCBvcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc2V0cyB0aGlzLndpZHRoIHRoaXMuaGVpZ2h0LCBpbml0aWFsaXNlcyB0aGlzLmxhYmVscywgY3JlYXRlcyBkb20gZWxlbWVudHNcbiAgICBjb25zdCB3aWR0aCA9IHRoaXMud2lkdGhcbiAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmhlaWdodFxuICAgIGNvbnN0IHJhZGl1cyA9IHRoaXMucmFkaXVzID0gTWF0aC5taW4od2lkdGgsIGhlaWdodCkgLyAyLjVcblxuICAgIC8vIFNldCB1cCBtYWluIHBvaW50c1xuICAgIHRoaXMuTyA9IG5ldyBQb2ludCgwLCAwKSAvLyBjZW50ZXIgcG9pbnRcbiAgICB0aGlzLkEgPSBuZXcgUG9pbnQocmFkaXVzLCAwKSAvLyBmaXJzdCBwb2ludFxuICAgIHRoaXMuQyA9IFtdIC8vIFBvaW50cyBhcm91bmQgb3V0c2lkZVxuICAgIGxldCB0b3RhbGFuZ2xlID0gMCAvLyBuYiBpbiByYWRpYW5zXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmRhdGEuYW5nbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0b3RhbGFuZ2xlICs9IHRoaXMuZGF0YS5hbmdsZXNbaV0gKiBNYXRoLlBJIC8gMTgwXG4gICAgICB0aGlzLkNbaV0gPSBQb2ludC5mcm9tUG9sYXIocmFkaXVzLCB0b3RhbGFuZ2xlKVxuICAgIH1cblxuICAgIC8vIFNldCB1cCBsYWJlbHNcbiAgICB0b3RhbGFuZ2xlID0gMFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5kYXRhLmFuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgdGhldGEgPSB0aGlzLmRhdGEuYW5nbGVzW2ldXG4gICAgICB0aGlzLmxhYmVsc1tpXSA9IHtcbiAgICAgICAgcG9zOiBQb2ludC5mcm9tUG9sYXJEZWcocmFkaXVzICogKDAuNCArIDYgLyB0aGV0YSksIHRvdGFsYW5nbGUgKyB0aGV0YSAvIDIpLFxuICAgICAgICB0ZXh0cTogdGhpcy5kYXRhLm1pc3NpbmdbaV0gPyAneF5cXFxcY2lyYycgOiB0aGlzLmRhdGEuYW5nbGVzW2ldLnRvU3RyaW5nKCkgKyAnXlxcXFxjaXJjJyxcbiAgICAgICAgc3R5bGVxOiAnbm9ybWFsJ1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuZGF0YS5taXNzaW5nW2ldKSB7XG4gICAgICAgIHRoaXMubGFiZWxzW2ldLnRleHRhID0gdGhpcy5kYXRhLmFuZ2xlc1tpXS50b1N0cmluZygpICsgJ15cXFxcY2lyYydcbiAgICAgICAgdGhpcy5sYWJlbHNbaV0uc3R5bGVhID0gJ2Fuc3dlcidcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubGFiZWxzW2ldLnRleHRhID0gdGhpcy5sYWJlbHNbaV0udGV4dHFcbiAgICAgICAgdGhpcy5sYWJlbHNbaV0uc3R5bGVhID0gdGhpcy5sYWJlbHNbaV0uc3R5bGVxXG4gICAgICB9XG4gICAgICB0b3RhbGFuZ2xlICs9IHRoZXRhXG4gICAgfVxuXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG5cbiAgICAvLyBSYW5kb21seSByb3RhdGUgYW5kIGNlbnRlclxuICAgIHRoaXMucm90YXRpb24gPSAob3B0aW9ucy5yb3RhdGlvbiAhPT0gdW5kZWZpbmVkKSA/IHRoaXMucm90YXRlKG9wdGlvbnMucm90YXRpb24pIDogdGhpcy5yYW5kb21Sb3RhdGUoKVxuICAgIHRoaXMudHJhbnNsYXRlKHdpZHRoIC8gMiAtIHRoaXMuTy54LCBoZWlnaHQgLyAyIC0gdGhpcy5PLnkpIC8vIGNlbnRyZVxuICB9XG5cbiAgcmVuZGVyICgpIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG5cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpIC8vIGNsZWFyXG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBjdHgubW92ZVRvKHRoaXMuTy54LCB0aGlzLk8ueSkgLy8gZHJhdyBsaW5lc1xuICAgIGN0eC5saW5lVG8odGhpcy5BLngsIHRoaXMuQS55KVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5DLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjdHgubW92ZVRvKHRoaXMuTy54LCB0aGlzLk8ueSlcbiAgICAgIGN0eC5saW5lVG8odGhpcy5DW2ldLngsIHRoaXMuQ1tpXS55KVxuICAgIH1cbiAgICBjdHguc3Ryb2tlU3R5bGUgPSAnZ3JheSdcbiAgICBjdHguc3Ryb2tlKClcbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGxldCB0b3RhbGFuZ2xlID0gdGhpcy5yb3RhdGlvblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5kYXRhLmFuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgdGhldGEgPSB0aGlzLmRhdGEuYW5nbGVzW2ldICogTWF0aC5QSSAvIDE4MFxuICAgICAgY3R4LmFyYyh0aGlzLk8ueCwgdGhpcy5PLnksIHRoaXMucmFkaXVzICogKDAuMiArIDAuMDcgLyB0aGV0YSksIHRvdGFsYW5nbGUsIHRvdGFsYW5nbGUgKyB0aGV0YSlcbiAgICAgIGN0eC5zdHJva2UoKVxuICAgICAgdG90YWxhbmdsZSArPSB0aGV0YVxuICAgIH1cbiAgICBjdHguY2xvc2VQYXRoKClcblxuICAgIC8vIHRlc3RpbmcgbGFiZWwgcG9zaXRpb25pbmc6XG4gICAgLy8gdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAvLyBjdHguZmlsbFN0eWxlID0gJ3JlZCdcbiAgICAvLyBjdHguZmlsbFJlY3QobC5wb3MueCAtIDEsIGwucG9zLnkgLSAxLCAzLCAzKVxuICAgIC8vIH0pXG5cbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGdldCBhbGxwb2ludHMgKCkge1xuICAgIGxldCBhbGxwb2ludHMgPSBbdGhpcy5BLCB0aGlzLk9dXG4gICAgYWxscG9pbnRzID0gYWxscG9pbnRzLmNvbmNhdCh0aGlzLkMpXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChmdW5jdGlvbiAobCkge1xuICAgICAgYWxscG9pbnRzLnB1c2gobC5wb3MpXG4gICAgfSlcbiAgICByZXR1cm4gYWxscG9pbnRzXG4gIH1cbn1cbiIsIi8qIEdlbmVyYXRlcyBhbmQgaG9sZHMgZGF0YSBmb3IgYSBtaXNzaW5nIGFuZ2xlcyBxdWVzdGlvbiwgd2hlcmUgdGhlc2UgaXMgc29tZSBnaXZlbiBhbmdsZSBzdW1cbiAqIEFnbm9zdGljIGFzIHRvIGhvdyB0aGVzZSBhbmdsZXMgYXJlIGFycmFuZ2VkIChlLmcuIGluIGEgcG9seWdvbiBvciBhcm91bmQgc29tIHBvaW50KVxuICovXG5pbXBvcnQgeyByYW5kQmV0d2VlbiB9IGZyb20gJ1V0aWxpdGllcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgLyogZXh0ZW5kcyBHcmFwaGljUURhdGEgKi8ge1xuICAvLyB0aGlzLmFuZ2xlcyA6OiBbSW50XSAtLSBsaXN0IG9mIGFuZ2xlc1xuICAvLyB0aGlzLm1pc3NpbmcgOjogW0Jvb2xdIC0tIHRydWUgaWYgbWlzc2luZ1xuICAvLyB0aGlzLmFuZ2xlU3VtIDo6IHdoYXQgdGhlIGFuZ2xlcyBhZGQgdXAgdG9cbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIC8qIGFuZ2xlU3VtOiAxODAgKi8gLy8gbXVzdCBiZSBzZXQgYnkgY2FsbGVyXG4gICAgICBtaW5BbmdsZTogMTAsXG4gICAgICBtaW5OOiAyLFxuICAgICAgbWF4TjogNFxuICAgIH1cbiAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICBpZiAoIXRoaXMuc2V0dGluZ3MuYW5nbGVTdW0pIHsgdGhyb3cgbmV3IEVycm9yKCdObyBhbmdsZSBzdW0gZ2l2ZW4nKSB9XG5cbiAgICB0aGlzLmluaXRSYW5kb20oKVxuICB9XG5cbiAgaW5pdCAoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZykge1xuICAgIC8vIGluaXRpYWxpc2VzIHdpdGggYW5nbGVzIGdpdmVuIGV4cGxpY2l0bHlcbiAgICBpZiAoYW5nbGVzID09PSBbXSkgeyB0aHJvdyBuZXcgRXJyb3IoJ2FyZ3VtZW50IG11c3Qgbm90IGJlIGVtcHR5JykgfVxuICAgIGlmIChNYXRoLnJvdW5kKGFuZ2xlcy5yZWR1Y2UoKHgsIHkpID0+IHggKyB5KSkgIT09IGFuZ2xlU3VtKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FuZ2xlIHN1bSBtdXN0IGJlICcgKyBhbmdsZVN1bSlcbiAgICB9XG5cbiAgICB0aGlzLmFuZ2xlcyA9IGFuZ2xlcyAvLyBsaXN0IG9mIGFuZ2xlc1xuICAgIHRoaXMubWlzc2luZyA9IG1pc3NpbmcgLy8gd2hpY2ggYW5nbGVzIGFyZSBtaXNzaW5nIC0gYXJyYXkgb2YgYm9vbGVhbnNcbiAgICB0aGlzLmFuZ2xlU3VtID0gYW5nbGVTdW0gLy8gc3VtIG9mIGFuZ2xlc1xuICB9XG5cbiAgaW5pdFJhbmRvbSAoKSB7XG4gICAgY29uc3QgYW5nbGVTdW0gPSB0aGlzLnNldHRpbmdzLmFuZ2xlU3VtXG4gICAgY29uc3QgbiA9IHRoaXMuc2V0dGluZ3MublxuICAgICAgPyB0aGlzLnNldHRpbmdzLm5cbiAgICAgIDogcmFuZEJldHdlZW4odGhpcy5zZXR0aW5ncy5taW5OLCB0aGlzLnNldHRpbmdzLm1heE4pXG4gICAgY29uc3QgbWluQW5nbGUgPSB0aGlzLnNldHRpbmdzLm1pbkFuZ2xlXG5cbiAgICBpZiAobiA8IDIpIHRocm93IG5ldyBFcnJvcignQ2FuXFwndCBoYXZlIG1pc3NpbmcgZmV3ZXIgdGhhbiAyIGFuZ2xlcycpXG5cbiAgICAvLyBCdWlsZCB1cCBhbmdsZXNcbiAgICBjb25zdCBhbmdsZXMgPSBbXVxuICAgIGxldCBsZWZ0ID0gYW5nbGVTdW1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG4gLSAxOyBpKyspIHtcbiAgICAgIGNvbnN0IG1heEFuZ2xlID0gbGVmdCAtIG1pbkFuZ2xlICogKG4gLSBpIC0gMSlcbiAgICAgIGNvbnN0IG5leHRBbmdsZSA9IHJhbmRCZXR3ZWVuKG1pbkFuZ2xlLCBtYXhBbmdsZSlcbiAgICAgIGxlZnQgLT0gbmV4dEFuZ2xlXG4gICAgICBhbmdsZXMucHVzaChuZXh0QW5nbGUpXG4gICAgfVxuICAgIGFuZ2xlc1tuIC0gMV0gPSBsZWZ0XG5cbiAgICBjb25zdCBtaXNzaW5nID0gW11cbiAgICBtaXNzaW5nLmxlbmd0aCA9IG5cbiAgICBtaXNzaW5nLmZpbGwoZmFsc2UpXG4gICAgbWlzc2luZ1tyYW5kQmV0d2VlbigwLCBuIC0gMSldID0gdHJ1ZVxuXG4gICAgdGhpcy5pbml0KGFuZ2xlU3VtLCBhbmdsZXMsIG1pc3NpbmcpXG4gIH1cbn1cbiIsIi8qIFF1ZXN0aW9uIHR5cGUgY29tcHJpc2luZyBudW1lcmljYWwgbWlzc2luZyBhbmdsZXMgYXJvdW5kIGEgcG9pbnQgYW5kXG4gKiBhbmdsZXMgb24gYSBzdHJhaWdodCBsaW5lIChzaW5jZSB0aGVzZSBhcmUgdmVyeSBzaW1pbGFyIG51bWVyaWNhbGx5IGFzIHdlbGxcbiAqIGFzIGdyYXBoaWNhbGx5LlxuICpcbiAqIEFsc28gY292ZXJzIGNhc2VzIHdoZXJlIG1vcmUgdGhhbiBvbmUgYW5nbGUgaXMgZXF1YWxcbiAqXG4gKi9cblxuaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICdHcmFwaGljUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyBmcm9tICdNaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRWaWV3J1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhIGZyb20gJ01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc051bWJlckRhdGEnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFuZ2xlc0Zvcm1pbmdRIGV4dGVuZHMgR3JhcGhpY1Ege1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKCkgLy8gcHJvY2Vzc2VzIG9wdGlvbnMgaW50byB0aGlzLnNldHRpbmdzXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGFuZ2xlU3VtOiAxODAsXG4gICAgICBtaW5BbmdsZTogMTAsXG4gICAgICBtaW5OOiAyLFxuICAgICAgbWF4TjogNFxuICAgIH1cblxuICAgIC8vIE9yZGVyIG9mIGltcG9ydGFuY2VcbiAgICAvLyAoMSkgb3B0aW9ucyBwYXNzZWQgdG8gdGhpcyBjb25zdHJ1Y3RvclxuICAgIC8vICgyKSBkZWZhdWx0cyBmb3IgdGhpcyBjb25zdHJ1Y3RvclxuICAgIC8vICgzKSBhbnkgb3B0aW9ucyBzZXQgZnJvbSBwYXJlbnQgY29uc3RydWN0b3JcbiAgICAvL1xuICAgIE9iamVjdC5hc3NpZ24odGhpcy5zZXR0aW5ncywgZGVmYXVsdHMsIG9wdGlvbnMpXG5cbiAgICB0aGlzLmRhdGEgPSBuZXcgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEodGhpcy5zZXR0aW5ncylcbiAgICB0aGlzLnZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcodGhpcy5kYXRhLCB0aGlzLnNldHRpbmdzKVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7IHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZScgfVxufVxuIiwiaW1wb3J0IFBvaW50IGZyb20gJ1BvaW50J1xuaW1wb3J0IHsgR3JhcGhpY1FWaWV3IH0gZnJvbSAnR3JhcGhpY1EnXG5pbXBvcnQgeyBzaW5EZWcsIGRhc2hlZExpbmUgfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICAvLyB0aGlzLkEsIHRoaXMuQiwgdGhpcy5DIDo6IFBvaW50IC0tIHRoZSB2ZXJ0aWNlcyBvZiB0aGUgdHJpYW5nbGVcbiAgLy8gdGhpcy5sYWJlbHMgPSBbXVxuICAvLyB0aGlzLmNhbnZhc1xuICAvLyB0aGlzLkRPTVxuICAvLyB0aGlzLnJvdGF0aW9uXG4gIGNvbnN0cnVjdG9yIChkYXRhLCBvcHRpb25zKSB7XG4gICAgc3VwZXIoZGF0YSwgb3B0aW9ucykgLy8gc2V0cyB0aGlzLndpZHRoIHRoaXMuaGVpZ2h0LCB0aGlzLmRhdGEgaW5pdGlhbGlzZXMgdGhpcy5sYWJlbHMsIGNyZWF0ZXMgZG9tIGVsZW1lbnRzXG4gICAgY29uc3Qgd2lkdGggPSB0aGlzLndpZHRoXG4gICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5oZWlnaHRcblxuICAgIC8vIGdlbmVyYXRlIHBvaW50cyAod2l0aCBsb25nZXN0IHNpZGUgMVxuICAgIHRoaXMuQSA9IG5ldyBQb2ludCgwLCAwKVxuICAgIHRoaXMuQiA9IFBvaW50LmZyb21Qb2xhckRlZygxLCBkYXRhLmFuZ2xlc1swXSlcbiAgICB0aGlzLkMgPSBuZXcgUG9pbnQoXG4gICAgICBzaW5EZWcodGhpcy5kYXRhLmFuZ2xlc1sxXSkgLyBzaW5EZWcodGhpcy5kYXRhLmFuZ2xlc1syXSksIDBcbiAgICApXG5cbiAgICAvLyBDcmVhdGUgbGFiZWxzXG4gICAgY29uc3QgY2VudHJvaWQgPSBQb2ludC5tZWFuKHRoaXMuQSwgdGhpcy5CLCB0aGlzLkMpXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgY29uc3QgcCA9IFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXVtpXVxuICAgICAgdGhpcy5sYWJlbHNbaV0gPSB7XG4gICAgICAgIHBvczogUG9pbnQubWVhbihwLCBwLCBjZW50cm9pZCksIC8vIHdlaWdodGVkIG1lYW4gLSBwb3NpdGlvbiBmcm9tIGNlbnRyb2lkXG4gICAgICAgIHRleHRxOiB0aGlzLmRhdGEubWlzc2luZ1tpXSA/ICd4XlxcXFxjaXJjJyA6IHRoaXMuZGF0YS5hbmdsZXNbaV0udG9TdHJpbmcoKSArICdeXFxcXGNpcmMnLFxuICAgICAgICBzdHlsZXE6ICdub3JtYWwnXG4gICAgICB9XG4gICAgICBpZiAodGhpcy5kYXRhLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgdGhpcy5sYWJlbHNbaV0udGV4dGEgPSB0aGlzLmRhdGEuYW5nbGVzW2ldLnRvU3RyaW5nKCkgKyAnXlxcXFxjaXJjJ1xuICAgICAgICB0aGlzLmxhYmVsc1tpXS5zdHlsZWEgPSAnYW5zd2VyJ1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5sYWJlbHNbaV0udGV4dGEgPSB0aGlzLmxhYmVsc1tpXS50ZXh0cVxuICAgICAgICB0aGlzLmxhYmVsc1tpXS5zdHlsZWEgPSB0aGlzLmxhYmVsc1tpXS5zdHlsZXFcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcblxuICAgIC8vIHJvdGF0ZSByYW5kb21seVxuICAgIHRoaXMucm90YXRpb24gPSAob3B0aW9ucy5yb3RhdGlvbiAhPT0gdW5kZWZpbmVkKSA/IHRoaXMucm90YXRlKG9wdGlvbnMucm90YXRpb24pIDogdGhpcy5yYW5kb21Sb3RhdGUoKVxuXG4gICAgLy8gc2NhbGUgYW5kIGZpdFxuICAgIC8vIHNjYWxlIHRvIHNpemVcbiAgICBjb25zdCBtYXJnaW4gPSAwXG4gICAgbGV0IHRvcGxlZnQgPSBQb2ludC5taW4oW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGxldCBib3R0b21yaWdodCA9IFBvaW50Lm1heChbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgY29uc3QgdG90YWxXaWR0aCA9IGJvdHRvbXJpZ2h0LnggLSB0b3BsZWZ0LnhcbiAgICBjb25zdCB0b3RhbEhlaWdodCA9IGJvdHRvbXJpZ2h0LnkgLSB0b3BsZWZ0LnlcbiAgICB0aGlzLnNjYWxlKE1hdGgubWluKCh3aWR0aCAtIG1hcmdpbikgLyB0b3RhbFdpZHRoLCAoaGVpZ2h0IC0gbWFyZ2luKSAvIHRvdGFsSGVpZ2h0KSkgLy8gMTVweCBtYXJnaW5cblxuICAgIC8vIG1vdmUgdG8gY2VudHJlXG4gICAgdG9wbGVmdCA9IFBvaW50Lm1pbihbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgYm90dG9tcmlnaHQgPSBQb2ludC5tYXgoW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdKVxuICAgIGNvbnN0IGNlbnRlciA9IFBvaW50Lm1lYW4odG9wbGVmdCwgYm90dG9tcmlnaHQpXG4gICAgdGhpcy50cmFuc2xhdGUod2lkdGggLyAyIC0gY2VudGVyLngsIGhlaWdodCAvIDIgLSBjZW50ZXIueSkgLy8gY2VudHJlXG4gIH1cblxuICByZW5kZXIgKCkge1xuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICBjb25zdCB2ZXJ0aWNlcyA9IFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXVxuICAgIGNvbnN0IGFwZXggPSB0aGlzLmRhdGEuYXBleCAvLyBobW1tXG5cbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpIC8vIGNsZWFyXG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBjdHgubW92ZVRvKHRoaXMuQS54LCB0aGlzLkEueSlcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICBjb25zdCBwID0gdmVydGljZXNbaV1cbiAgICAgIGNvbnN0IG5leHQgPSB2ZXJ0aWNlc1soaSArIDEpICUgM11cbiAgICAgIGlmIChhcGV4ID09PSBpIHx8IGFwZXggPT09IChpICsgMSkgJSAzKSB7IC8vIHRvL2Zyb20gYXBleCAtIGRyYXcgZGFzaGVkIGxpbmVcbiAgICAgICAgZGFzaGVkTGluZShjdHgsIHAueCwgcC55LCBuZXh0LngsIG5leHQueSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGN0eC5saW5lVG8obmV4dC54LCBuZXh0LnkpXG4gICAgICB9XG4gICAgfVxuICAgIGN0eC5zdHJva2VTdHlsZSA9ICdncmF5J1xuICAgIGN0eC5zdHJva2UoKVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoZmFsc2UpXG4gIH1cblxuICBnZXQgYWxscG9pbnRzICgpIHtcbiAgICBjb25zdCBhbGxwb2ludHMgPSBbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ11cbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4geyBhbGxwb2ludHMucHVzaChsLnBvcykgfSlcbiAgICByZXR1cm4gYWxscG9pbnRzXG4gIH1cbn1cbiIsIi8qIE1pc3NpbmcgYW5nbGVzIGluIHRyaWFuZ2xlIC0gbnVtZXJpY2FsICovXG5cbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnR3JhcGhpY1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyBmcm9tICdNaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVZpZXcnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgZnJvbSAnTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQW5nbGVzRm9ybWluZ1EgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIoKSAvLyBwcm9jZXNzZXMgb3B0aW9ucyBpbnRvIHRoaXMuc2V0dGluZ3NcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAxMCxcbiAgICAgIG1pbk46IDMsXG4gICAgICBtYXhOOiAzXG4gICAgfVxuXG4gICAgLy8gT3JkZXIgb2YgaW1wb3J0YW5jZVxuICAgIC8vICgxKSBvcHRpb25zIHBhc3NlZCB0byB0aGlzIGNvbnN0cnVjdG9yXG4gICAgLy8gKDIpIGRlZmF1bHRzIGZvciB0aGlzIGNvbnN0cnVjdG9yXG4gICAgLy8gKDMpIGFueSBvcHRpb25zIHNldCBmcm9tIHBhcmVudCBjb25zdHJ1Y3RvclxuICAgIC8vXG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLnNldHRpbmdzLCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIHRoaXMuZGF0YSA9IG5ldyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSh0aGlzLnNldHRpbmdzKVxuICAgIHRoaXMudmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3KHRoaXMuZGF0YSwgdGhpcy5zZXR0aW5ncylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsIi8qIENsYXNzIHRvIHdyYXAgdmFyaW91cyBtaXNzaW5nIGFuZ2xlcyBjbGFzc2VzXG4gKiBSZWFkcyBvcHRpb25zIGFuZCB0aGVuIHdyYXBzIHRoZSBhcHByb3ByaWF0ZSBvYmplY3QsIG1pcnJvcmluZyB0aGUgbWFpblxuICogcHVibGljIG1ldGhvZHNcbiovXG5pbXBvcnQgQW5nbGVzRm9ybWluZ1EgZnJvbSAnQW5nbGVzRm9ybWluZ1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUSBmcm9tICdNaXNzaW5nQW5nbGVzVHJpYW5nbGVRJ1xuaW1wb3J0IHsgcmFuZEVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICAvLyBvcHRpb25zLnR5cGVzID0gWydhb3NsJyB8ICdhYWFwJyB8ICd0cmlhbmdsZSddXG4gICAgLy8gb3B0aW9ucy5kaWZmaWN1bHR5IDo6IGludGVnZXJcbiAgICAvLyBvcHRpb25zLmN1c3RvbSA6OiBCb29sZWFuXG4gICAgLy8gb3B0aW9ucy5zdWJ0eXBlIDo6ICdzaW1wbGUnIHwgJ3JlcGVhdGVkJyB8ICdhbGdlYnJhJyB8ICd3b3JkZWQnXG5cbiAgICBpZiAoIW9wdGlvbnMudHlwZXMgfHwgIUFycmF5LmlzQXJyYXkob3B0aW9ucy50eXBlcykgfHwgb3B0aW9ucy50eXBlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgdHlwZXMgbGlzdCAke29wdGlvbnMudHlwZXN9YClcbiAgICB9XG4gICAgY29uc3QgdHlwZSA9IHJhbmRFbGVtKG9wdGlvbnMudHlwZXMpXG5cbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ2Fvc2wnOiB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7IGFuZ2xlU3VtOiAxODAgfVxuICAgICAgICB0aGlzLnF1ZXN0aW9uID0gbmV3IEFuZ2xlc0Zvcm1pbmdRKG9wdGlvbnMpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdhYWFwJzoge1xuICAgICAgICBjb25zdCBvcHRpb25zID0geyBhbmdsZVN1bTogMzYwIH1cbiAgICAgICAgdGhpcy5xdWVzdGlvbiA9IG5ldyBBbmdsZXNGb3JtaW5nUShvcHRpb25zKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAndHJpYW5nbGUnOiB7XG4gICAgICAgIHRoaXMucXVlc3Rpb24gPSBuZXcgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUSgpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdHlwZSAke3R5cGV9IGNob3NlbiBmcm9tICR7b3B0aW9ucy50eXBlc31gKVxuICAgIH1cbiAgfVxuXG4gIGdldERPTSAoKSB7IHJldHVybiB0aGlzLnF1ZXN0aW9uLmdldERPTSgpIH1cbiAgcmVuZGVyICgpIHsgcmV0dXJuIHRoaXMucXVlc3Rpb24ucmVuZGVyKCkgfVxuICBzaG93QW5zd2VyICgpIHsgcmV0dXJuIHRoaXMucXVlc3Rpb24uc2hvd0Fuc3dlcigpIH1cbiAgaGlkZUFuc3dlciAoKSB7IHJldHVybiB0aGlzLnF1ZXN0aW9uLmhpZGVBbnN3ZXIoKSB9XG4gIHRvZ2dsZUFuc3dlciAoKSB7IHJldHVybiB0aGlzLnF1ZXN0aW9uLnRvZ2dsZUFuc3dlcigpIH1cblxuICBzdGF0aWMgZ2V0IG9wdGlvbnNTcGVjICgpIHtcbiAgICByZXR1cm4gW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJycsXG4gICAgICAgIGlkOiAndHlwZXMnLFxuICAgICAgICB0eXBlOiAnc2VsZWN0LWluY2x1c2l2ZScsXG4gICAgICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgICAgICB7IHRpdGxlOiAnT24gYSBzdHJhaWdodCBsaW5lJywgaWQ6ICdhb3NsJyB9LFxuICAgICAgICAgIHsgdGl0bGU6ICdBcm91bmQgYSBwb2ludCcsIGlkOiAnYWFhcCcgfSxcbiAgICAgICAgICB7IHRpdGxlOiAnVHJpYW5nbGUnLCBpZDogJ3RyaWFuZ2xlJyB9XG4gICAgICAgIF0sXG4gICAgICAgIGRlZmF1bHQ6IFsnYW9zbCcsICdhYWFwJywgJ3RyaWFuZ2xlJ10sXG4gICAgICAgIHZlcnRpY2FsOiB0cnVlXG4gICAgICB9XG4gICAgXVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJ1xuICB9XG59XG4iLCJpbXBvcnQgQWxnZWJyYWljRnJhY3Rpb25RIGZyb20gJ0FsZ2VicmFpY0ZyYWN0aW9uUSdcbmltcG9ydCBJbnRlZ2VyQWRkUSBmcm9tICdJbnRlZ2VyQWRkJ1xuaW1wb3J0IEFyaXRobWFnb25RIGZyb20gJ0FyaXRobWFnb25RJ1xuaW1wb3J0IFRlc3RRIGZyb20gJ1Rlc3RRJ1xuaW1wb3J0IEFkZEFaZXJvIGZyb20gJ0FkZEFaZXJvJ1xuaW1wb3J0IEVxdWF0aW9uT2ZMaW5lIGZyb20gJ0VxdWF0aW9uT2ZMaW5lJ1xuaW1wb3J0IEFuZ2xlc0Zvcm1pbmdRIGZyb20gJ01pc3NpbmdBbmdsZXMvQW5nbGVzRm9ybWluZ1EnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1EgZnJvbSAnTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzV3JhcHBlcidcblxuaW1wb3J0IE9wdGlvbnNTZXQgZnJvbSAnT3B0aW9uc1NldCdcblxuY29uc3QgdG9waWNMaXN0ID0gW1xuICB7XG4gICAgaWQ6ICdhbGdlYnJhaWMtZnJhY3Rpb24nLFxuICAgIHRpdGxlOiAnU2ltcGxpZnkgYWxnZWJyYWljIGZyYWN0aW9ucycsXG4gICAgY2xhc3M6IEFsZ2VicmFpY0ZyYWN0aW9uUVxuICB9LFxuICB7XG4gICAgaWQ6ICdhZGQtYS16ZXJvJyxcbiAgICB0aXRsZTogJ011bHRpcGx5IGJ5IDEwIChob25lc3QhKScsXG4gICAgY2xhc3M6IEFkZEFaZXJvXG4gIH0sXG4gIHtcbiAgICBpZDogJ2ludGVnZXItYWRkJyxcbiAgICB0aXRsZTogJ0FkZCBpbnRlZ2VycyAodiBzaW1wbGUpJyxcbiAgICBjbGFzczogSW50ZWdlckFkZFFcbiAgfSxcbiAge1xuICAgIGlkOiAnYW9zbCcsXG4gICAgdGl0bGU6ICdBbmdsZXMgb24gYSBzdHJhaWdodCBsaW5lJyxcbiAgICBjbGFzczogQW5nbGVzRm9ybWluZ1FcbiAgfSxcbiAge1xuICAgIGlkOiAnbWlzc2luZy1hbmdsZXMnLFxuICAgIHRpdGxlOiAnTWlzc2luZyBhbmdsZXMnLFxuICAgIGNsYXNzOiBNaXNzaW5nQW5nbGVzUVxuICB9LFxuICB7XG4gICAgaWQ6ICdlcXVhdGlvbi1vZi1saW5lJyxcbiAgICB0aXRsZTogJ0VxdWF0aW9uIG9mIGEgbGluZSAoZnJvbSB0d28gcG9pbnRzKScsXG4gICAgY2xhc3M6IEVxdWF0aW9uT2ZMaW5lXG4gIH0sXG4gIHtcbiAgICBpZDogJ2FyaXRobWFnb24tYWRkJyxcbiAgICB0aXRsZTogJ0FyaXRobWFnb25zJyxcbiAgICBjbGFzczogQXJpdGhtYWdvblFcbiAgfSxcbiAge1xuICAgIGlkOiAndGVzdCcsXG4gICAgdGl0bGU6ICdUZXN0IHF1ZXN0aW9ucycsXG4gICAgY2xhc3M6IFRlc3RRXG4gIH1cbl1cblxuZnVuY3Rpb24gZ2V0Q2xhc3MgKGlkKSB7XG4gIC8vIFJldHVybiB0aGUgY2xhc3MgZ2l2ZW4gYW4gaWQgb2YgYSBxdWVzdGlvblxuXG4gIC8vIE9idmlvdXNseSB0aGlzIGlzIGFuIGluZWZmaWNpZW50IHNlYXJjaCwgYnV0IHdlIGRvbid0IG5lZWQgbWFzc2l2ZSBwZXJmb3JtYW5jZVxuICBmb3IgKGxldCBpID0gMDsgaSA8IHRvcGljTGlzdC5sZW5ndGg7IGkrKykge1xuICAgIGlmICh0b3BpY0xpc3RbaV0uaWQgPT09IGlkKSB7XG4gICAgICByZXR1cm4gdG9waWNMaXN0W2ldLmNsYXNzXG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBudWxsXG59XG5cbmZ1bmN0aW9uIGdldFRpdGxlIChpZCkge1xuICAvLyBSZXR1cm4gdGl0bGUgb2YgYSBnaXZlbiBpZFxuICAvL1xuICByZXR1cm4gdG9waWNMaXN0LmZpbmQodCA9PiAodC5pZCA9PT0gaWQpKS50aXRsZVxufVxuXG5mdW5jdGlvbiBnZXRDb21tYW5kV29yZCAoaWQpIHtcbiAgcmV0dXJuIGdldENsYXNzKGlkKS5jb21tYW5kV29yZFxufVxuXG5mdW5jdGlvbiBnZXRUb3BpY3MgKCkge1xuICAvLyByZXR1cm5zIHRvcGljcyB3aXRoIGNsYXNzZXMgc3RyaXBwZWQgb3V0XG4gIHJldHVybiB0b3BpY0xpc3QubWFwKHggPT4gKHsgaWQ6IHguaWQsIHRpdGxlOiB4LnRpdGxlIH0pKVxufVxuXG5mdW5jdGlvbiBuZXdRdWVzdGlvbiAoaWQsIG9wdGlvbnMpIHtcbiAgLy8gdG8gYXZvaWQgd3JpdGluZyBgbGV0IHEgPSBuZXcgKFRvcGljQ2hvb3Nlci5nZXRDbGFzcyhpZCkpKG9wdGlvbnMpXG4gIHJldHVybiBuZXcgKGdldENsYXNzKGlkKSkob3B0aW9ucylcbn1cblxuZnVuY3Rpb24gbmV3T3B0aW9uc1NldCAoaWQpIHtcbiAgY29uc3Qgb3B0aW9uc1NwZWMgPSAoZ2V0Q2xhc3MoaWQpKS5vcHRpb25zU3BlYyB8fCBbXVxuICByZXR1cm4gbmV3IE9wdGlvbnNTZXQob3B0aW9uc1NwZWMpXG59XG5cbmZ1bmN0aW9uIGhhc09wdGlvbnMgKGlkKSB7XG4gIHJldHVybiAhIShnZXRDbGFzcyhpZCkub3B0aW9uc1NwZWMgJiYgZ2V0Q2xhc3MoaWQpLm9wdGlvbnNTcGVjLmxlbmd0aCA+IDApIC8vIHdlaXJkIGJvb2wgdHlwY2FzdGluZyB3b28hXG59XG5cbmV4cG9ydCB7IHRvcGljTGlzdCwgZ2V0Q2xhc3MsIG5ld1F1ZXN0aW9uLCBnZXRUb3BpY3MsIGdldFRpdGxlLCBuZXdPcHRpb25zU2V0LCBnZXRDb21tYW5kV29yZCwgaGFzT3B0aW9ucyB9XG4iLCIvKiAhXG4qIHRpbmdsZS5qc1xuKiBAYXV0aG9yICByb2Jpbl9wYXJpc2lcbiogQHZlcnNpb24gMC4xNS4yXG4qIEB1cmxcbiovXG4vLyBNb2RpZmllZCB0byBiZSBFUzYgbW9kdWxlXG5cbnZhciBpc0J1c3kgPSBmYWxzZVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBNb2RhbCAob3B0aW9ucykge1xuICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgb25DbG9zZTogbnVsbCxcbiAgICBvbk9wZW46IG51bGwsXG4gICAgYmVmb3JlT3BlbjogbnVsbCxcbiAgICBiZWZvcmVDbG9zZTogbnVsbCxcbiAgICBzdGlja3lGb290ZXI6IGZhbHNlLFxuICAgIGZvb3RlcjogZmFsc2UsXG4gICAgY3NzQ2xhc3M6IFtdLFxuICAgIGNsb3NlTGFiZWw6ICdDbG9zZScsXG4gICAgY2xvc2VNZXRob2RzOiBbJ292ZXJsYXknLCAnYnV0dG9uJywgJ2VzY2FwZSddXG4gIH1cblxuICAvLyBleHRlbmRzIGNvbmZpZ1xuICB0aGlzLm9wdHMgPSBleHRlbmQoe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gIC8vIGluaXQgbW9kYWxcbiAgdGhpcy5pbml0KClcbn1cblxuTW9kYWwucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLm1vZGFsKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICBfYnVpbGQuY2FsbCh0aGlzKVxuICBfYmluZEV2ZW50cy5jYWxsKHRoaXMpXG5cbiAgLy8gaW5zZXJ0IG1vZGFsIGluIGRvbVxuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMubW9kYWwsIGRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZClcblxuICBpZiAodGhpcy5vcHRzLmZvb3Rlcikge1xuICAgIHRoaXMuYWRkRm9vdGVyKClcbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5fYnVzeSA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICBpc0J1c3kgPSBzdGF0ZVxufVxuXG5Nb2RhbC5wcm90b3R5cGUuX2lzQnVzeSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGlzQnVzeVxufVxuXG5Nb2RhbC5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMubW9kYWwgPT09IG51bGwpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIC8vIHJlc3RvcmUgc2Nyb2xsaW5nXG4gIGlmICh0aGlzLmlzT3BlbigpKSB7XG4gICAgdGhpcy5jbG9zZSh0cnVlKVxuICB9XG5cbiAgLy8gdW5iaW5kIGFsbCBldmVudHNcbiAgX3VuYmluZEV2ZW50cy5jYWxsKHRoaXMpXG5cbiAgLy8gcmVtb3ZlIG1vZGFsIGZyb20gZG9tXG4gIHRoaXMubW9kYWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLm1vZGFsKVxuXG4gIHRoaXMubW9kYWwgPSBudWxsXG59XG5cbk1vZGFsLnByb3RvdHlwZS5pc09wZW4gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiAhIXRoaXMubW9kYWwuY2xhc3NMaXN0LmNvbnRhaW5zKCd0aW5nbGUtbW9kYWwtLXZpc2libGUnKVxufVxuXG5Nb2RhbC5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuX2lzQnVzeSgpKSByZXR1cm5cbiAgdGhpcy5fYnVzeSh0cnVlKVxuXG4gIHZhciBzZWxmID0gdGhpc1xuXG4gIC8vIGJlZm9yZSBvcGVuIGNhbGxiYWNrXG4gIGlmICh0eXBlb2Ygc2VsZi5vcHRzLmJlZm9yZU9wZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICBzZWxmLm9wdHMuYmVmb3JlT3BlbigpXG4gIH1cblxuICBpZiAodGhpcy5tb2RhbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSkge1xuICAgIHRoaXMubW9kYWwuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ2Rpc3BsYXknKVxuICB9IGVsc2Uge1xuICAgIHRoaXMubW9kYWwuc3R5bGUucmVtb3ZlQXR0cmlidXRlKCdkaXNwbGF5JylcbiAgfVxuXG4gIC8vIHByZXZlbnQgZG91YmxlIHNjcm9sbFxuICB0aGlzLl9zY3JvbGxQb3NpdGlvbiA9IHdpbmRvdy5wYWdlWU9mZnNldFxuICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1lbmFibGVkJylcbiAgZG9jdW1lbnQuYm9keS5zdHlsZS50b3AgPSAtdGhpcy5fc2Nyb2xsUG9zaXRpb24gKyAncHgnXG5cbiAgLy8gc3RpY2t5IGZvb3RlclxuICB0aGlzLnNldFN0aWNreUZvb3Rlcih0aGlzLm9wdHMuc3RpY2t5Rm9vdGVyKVxuXG4gIC8vIHNob3cgbW9kYWxcbiAgdGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtLXZpc2libGUnKVxuXG4gIC8vIG9uT3BlbiBjYWxsYmFja1xuICBpZiAodHlwZW9mIHNlbGYub3B0cy5vbk9wZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICBzZWxmLm9wdHMub25PcGVuLmNhbGwoc2VsZilcbiAgfVxuXG4gIHNlbGYuX2J1c3koZmFsc2UpXG5cbiAgLy8gY2hlY2sgaWYgbW9kYWwgaXMgYmlnZ2VyIHRoYW4gc2NyZWVuIGhlaWdodFxuICB0aGlzLmNoZWNrT3ZlcmZsb3coKVxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uIChmb3JjZSkge1xuICBpZiAodGhpcy5faXNCdXN5KCkpIHJldHVyblxuICB0aGlzLl9idXN5KHRydWUpXG4gIGZvcmNlID0gZm9yY2UgfHwgZmFsc2VcblxuICAvLyAgYmVmb3JlIGNsb3NlXG4gIGlmICh0eXBlb2YgdGhpcy5vcHRzLmJlZm9yZUNsb3NlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdmFyIGNsb3NlID0gdGhpcy5vcHRzLmJlZm9yZUNsb3NlLmNhbGwodGhpcylcbiAgICBpZiAoIWNsb3NlKSB7XG4gICAgICB0aGlzLl9idXN5KGZhbHNlKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICB9XG5cbiAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKCd0aW5nbGUtZW5hYmxlZCcpXG4gIGRvY3VtZW50LmJvZHkuc3R5bGUudG9wID0gbnVsbFxuICB3aW5kb3cuc2Nyb2xsVG8oe1xuICAgIHRvcDogdGhpcy5fc2Nyb2xsUG9zaXRpb24sXG4gICAgYmVoYXZpb3I6ICdpbnN0YW50J1xuICB9KVxuXG4gIHRoaXMubW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgndGluZ2xlLW1vZGFsLS12aXNpYmxlJylcblxuICAvLyB1c2luZyBzaW1pbGFyIHNldHVwIGFzIG9uT3BlblxuICB2YXIgc2VsZiA9IHRoaXNcblxuICBzZWxmLm1vZGFsLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSdcblxuICAvLyBvbkNsb3NlIGNhbGxiYWNrXG4gIGlmICh0eXBlb2Ygc2VsZi5vcHRzLm9uQ2xvc2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICBzZWxmLm9wdHMub25DbG9zZS5jYWxsKHRoaXMpXG4gIH1cblxuICAvLyByZWxlYXNlIG1vZGFsXG4gIHNlbGYuX2J1c3koZmFsc2UpXG59XG5cbk1vZGFsLnByb3RvdHlwZS5zZXRDb250ZW50ID0gZnVuY3Rpb24gKGNvbnRlbnQpIHtcbiAgLy8gY2hlY2sgdHlwZSBvZiBjb250ZW50IDogU3RyaW5nIG9yIE5vZGVcbiAgaWYgKHR5cGVvZiBjb250ZW50ID09PSAnc3RyaW5nJykge1xuICAgIHRoaXMubW9kYWxCb3hDb250ZW50LmlubmVySFRNTCA9IGNvbnRlbnRcbiAgfSBlbHNlIHtcbiAgICB0aGlzLm1vZGFsQm94Q29udGVudC5pbm5lckhUTUwgPSAnJ1xuICAgIHRoaXMubW9kYWxCb3hDb250ZW50LmFwcGVuZENoaWxkKGNvbnRlbnQpXG4gIH1cblxuICBpZiAodGhpcy5pc09wZW4oKSkge1xuICAgIC8vIGNoZWNrIGlmIG1vZGFsIGlzIGJpZ2dlciB0aGFuIHNjcmVlbiBoZWlnaHRcbiAgICB0aGlzLmNoZWNrT3ZlcmZsb3coKVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuTW9kYWwucHJvdG90eXBlLmdldENvbnRlbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLm1vZGFsQm94Q29udGVudFxufVxuXG5Nb2RhbC5wcm90b3R5cGUuYWRkRm9vdGVyID0gZnVuY3Rpb24gKCkge1xuICAvLyBhZGQgZm9vdGVyIHRvIG1vZGFsXG4gIF9idWlsZEZvb3Rlci5jYWxsKHRoaXMpXG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuTW9kYWwucHJvdG90eXBlLnNldEZvb3RlckNvbnRlbnQgPSBmdW5jdGlvbiAoY29udGVudCkge1xuICAvLyBzZXQgZm9vdGVyIGNvbnRlbnRcbiAgdGhpcy5tb2RhbEJveEZvb3Rlci5pbm5lckhUTUwgPSBjb250ZW50XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuTW9kYWwucHJvdG90eXBlLmdldEZvb3RlckNvbnRlbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLm1vZGFsQm94Rm9vdGVyXG59XG5cbk1vZGFsLnByb3RvdHlwZS5zZXRTdGlja3lGb290ZXIgPSBmdW5jdGlvbiAoaXNTdGlja3kpIHtcbiAgLy8gaWYgdGhlIG1vZGFsIGlzIHNtYWxsZXIgdGhhbiB0aGUgdmlld3BvcnQgaGVpZ2h0LCB3ZSBkb24ndCBuZWVkIHN0aWNreVxuICBpZiAoIXRoaXMuaXNPdmVyZmxvdygpKSB7XG4gICAgaXNTdGlja3kgPSBmYWxzZVxuICB9XG5cbiAgaWYgKGlzU3RpY2t5KSB7XG4gICAgaWYgKHRoaXMubW9kYWxCb3guY29udGFpbnModGhpcy5tb2RhbEJveEZvb3RlcikpIHtcbiAgICAgIHRoaXMubW9kYWxCb3gucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlcilcbiAgICAgIHRoaXMubW9kYWwuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlcilcbiAgICAgIHRoaXMubW9kYWxCb3hGb290ZXIuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsLWJveF9fZm9vdGVyLS1zdGlja3knKVxuICAgICAgX3JlY2FsY3VsYXRlRm9vdGVyUG9zaXRpb24uY2FsbCh0aGlzKVxuICAgICAgdGhpcy5tb2RhbEJveENvbnRlbnQuc3R5bGVbJ3BhZGRpbmctYm90dG9tJ10gPSB0aGlzLm1vZGFsQm94Rm9vdGVyLmNsaWVudEhlaWdodCArIDIwICsgJ3B4J1xuICAgIH1cbiAgfSBlbHNlIGlmICh0aGlzLm1vZGFsQm94Rm9vdGVyKSB7XG4gICAgaWYgKCF0aGlzLm1vZGFsQm94LmNvbnRhaW5zKHRoaXMubW9kYWxCb3hGb290ZXIpKSB7XG4gICAgICB0aGlzLm1vZGFsLnJlbW92ZUNoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpXG4gICAgICB0aGlzLm1vZGFsQm94LmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpXG4gICAgICB0aGlzLm1vZGFsQm94Rm9vdGVyLnN0eWxlLndpZHRoID0gJ2F1dG8nXG4gICAgICB0aGlzLm1vZGFsQm94Rm9vdGVyLnN0eWxlLmxlZnQgPSAnJ1xuICAgICAgdGhpcy5tb2RhbEJveENvbnRlbnQuc3R5bGVbJ3BhZGRpbmctYm90dG9tJ10gPSAnJ1xuICAgICAgdGhpcy5tb2RhbEJveEZvb3Rlci5jbGFzc0xpc3QucmVtb3ZlKCd0aW5nbGUtbW9kYWwtYm94X19mb290ZXItLXN0aWNreScpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuTW9kYWwucHJvdG90eXBlLmFkZEZvb3RlckJ0biA9IGZ1bmN0aW9uIChsYWJlbCwgY3NzQ2xhc3MsIGNhbGxiYWNrKSB7XG4gIHZhciBidG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKVxuXG4gIC8vIHNldCBsYWJlbFxuICBidG4uaW5uZXJIVE1MID0gbGFiZWxcblxuICAvLyBiaW5kIGNhbGxiYWNrXG4gIGJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGNhbGxiYWNrKVxuXG4gIGlmICh0eXBlb2YgY3NzQ2xhc3MgPT09ICdzdHJpbmcnICYmIGNzc0NsYXNzLmxlbmd0aCkge1xuICAgIC8vIGFkZCBjbGFzc2VzIHRvIGJ0blxuICAgIGNzc0NsYXNzLnNwbGl0KCcgJykuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgYnRuLmNsYXNzTGlzdC5hZGQoaXRlbSlcbiAgICB9KVxuICB9XG5cbiAgdGhpcy5tb2RhbEJveEZvb3Rlci5hcHBlbmRDaGlsZChidG4pXG5cbiAgcmV0dXJuIGJ0blxufVxuXG5Nb2RhbC5wcm90b3R5cGUucmVzaXplID0gZnVuY3Rpb24gKCkge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBjb25zb2xlLndhcm4oJ1Jlc2l6ZSBpcyBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gdmVyc2lvbiAxLjAnKVxufVxuXG5Nb2RhbC5wcm90b3R5cGUuaXNPdmVyZmxvdyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHZpZXdwb3J0SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0XG4gIHZhciBtb2RhbEhlaWdodCA9IHRoaXMubW9kYWxCb3guY2xpZW50SGVpZ2h0XG5cbiAgcmV0dXJuIG1vZGFsSGVpZ2h0ID49IHZpZXdwb3J0SGVpZ2h0XG59XG5cbk1vZGFsLnByb3RvdHlwZS5jaGVja092ZXJmbG93ID0gZnVuY3Rpb24gKCkge1xuICAvLyBvbmx5IGlmIHRoZSBtb2RhbCBpcyBjdXJyZW50bHkgc2hvd25cbiAgaWYgKHRoaXMubW9kYWwuY2xhc3NMaXN0LmNvbnRhaW5zKCd0aW5nbGUtbW9kYWwtLXZpc2libGUnKSkge1xuICAgIGlmICh0aGlzLmlzT3ZlcmZsb3coKSkge1xuICAgICAgdGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtLW92ZXJmbG93JylcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5tb2RhbC5jbGFzc0xpc3QucmVtb3ZlKCd0aW5nbGUtbW9kYWwtLW92ZXJmbG93JylcbiAgICB9XG5cbiAgICAvLyB0T0RPOiByZW1vdmUgb2Zmc2V0XG4gICAgLy8gX29mZnNldC5jYWxsKHRoaXMpO1xuICAgIGlmICghdGhpcy5pc092ZXJmbG93KCkgJiYgdGhpcy5vcHRzLnN0aWNreUZvb3Rlcikge1xuICAgICAgdGhpcy5zZXRTdGlja3lGb290ZXIoZmFsc2UpXG4gICAgfSBlbHNlIGlmICh0aGlzLmlzT3ZlcmZsb3coKSAmJiB0aGlzLm9wdHMuc3RpY2t5Rm9vdGVyKSB7XG4gICAgICBfcmVjYWxjdWxhdGVGb290ZXJQb3NpdGlvbi5jYWxsKHRoaXMpXG4gICAgICB0aGlzLnNldFN0aWNreUZvb3Rlcih0cnVlKVxuICAgIH1cbiAgfVxufVxuXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuLyogPT0gcHJpdmF0ZSBtZXRob2RzICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuXG5mdW5jdGlvbiBjbG9zZUljb24gKCkge1xuICByZXR1cm4gJzxzdmcgdmlld0JveD1cIjAgMCAxMCAxMFwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj48cGF0aCBkPVwiTS4zIDkuN2MuMi4yLjQuMy43LjMuMyAwIC41LS4xLjctLjNMNSA2LjRsMy4zIDMuM2MuMi4yLjUuMy43LjMuMiAwIC41LS4xLjctLjMuNC0uNC40LTEgMC0xLjRMNi40IDVsMy4zLTMuM2MuNC0uNC40LTEgMC0xLjQtLjQtLjQtMS0uNC0xLjQgMEw1IDMuNiAxLjcuM0MxLjMtLjEuNy0uMS4zLjNjLS40LjQtLjQgMSAwIDEuNEwzLjYgNSAuMyA4LjNjLS40LjQtLjQgMSAwIDEuNHpcIiBmaWxsPVwiIzAwMFwiIGZpbGwtcnVsZT1cIm5vbnplcm9cIi8+PC9zdmc+J1xufVxuXG5mdW5jdGlvbiBfcmVjYWxjdWxhdGVGb290ZXJQb3NpdGlvbiAoKSB7XG4gIGlmICghdGhpcy5tb2RhbEJveEZvb3Rlcikge1xuICAgIHJldHVyblxuICB9XG4gIHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUud2lkdGggPSB0aGlzLm1vZGFsQm94LmNsaWVudFdpZHRoICsgJ3B4J1xuICB0aGlzLm1vZGFsQm94Rm9vdGVyLnN0eWxlLmxlZnQgPSB0aGlzLm1vZGFsQm94Lm9mZnNldExlZnQgKyAncHgnXG59XG5cbmZ1bmN0aW9uIF9idWlsZCAoKSB7XG4gIC8vIHdyYXBwZXJcbiAgdGhpcy5tb2RhbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsJylcblxuICAvLyByZW1vdmUgY3Vzb3IgaWYgbm8gb3ZlcmxheSBjbG9zZSBtZXRob2RcbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMubGVuZ3RoID09PSAwIHx8IHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignb3ZlcmxheScpID09PSAtMSkge1xuICAgIHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsLS1ub092ZXJsYXlDbG9zZScpXG4gIH1cblxuICB0aGlzLm1vZGFsLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSdcblxuICAvLyBjdXN0b20gY2xhc3NcbiAgdGhpcy5vcHRzLmNzc0NsYXNzLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoaXRlbSlcbiAgICB9XG4gIH0sIHRoaXMpXG5cbiAgLy8gY2xvc2UgYnRuXG4gIGlmICh0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoJ2J1dHRvbicpICE9PSAtMSkge1xuICAgIHRoaXMubW9kYWxDbG9zZUJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuLnR5cGUgPSAnYnV0dG9uJ1xuICAgIHRoaXMubW9kYWxDbG9zZUJ0bi5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWxfX2Nsb3NlJylcblxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bkljb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJylcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG5JY29uLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbF9fY2xvc2VJY29uJylcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG5JY29uLmlubmVySFRNTCA9IGNsb3NlSWNvbigpXG5cbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKVxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bkxhYmVsLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbF9fY2xvc2VMYWJlbCcpXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuTGFiZWwuaW5uZXJIVE1MID0gdGhpcy5vcHRzLmNsb3NlTGFiZWxcblxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bi5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQ2xvc2VCdG5JY29uKVxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bi5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbClcbiAgfVxuXG4gIC8vIG1vZGFsXG4gIHRoaXMubW9kYWxCb3ggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICB0aGlzLm1vZGFsQm94LmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC1ib3gnKVxuXG4gIC8vIG1vZGFsIGJveCBjb250ZW50XG4gIHRoaXMubW9kYWxCb3hDb250ZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgdGhpcy5tb2RhbEJveENvbnRlbnQuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsLWJveF9fY29udGVudCcpXG5cbiAgdGhpcy5tb2RhbEJveC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Q29udGVudClcblxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdidXR0b24nKSAhPT0gLTEpIHtcbiAgICB0aGlzLm1vZGFsLmFwcGVuZENoaWxkKHRoaXMubW9kYWxDbG9zZUJ0bilcbiAgfVxuXG4gIHRoaXMubW9kYWwuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveClcbn1cblxuZnVuY3Rpb24gX2J1aWxkRm9vdGVyICgpIHtcbiAgdGhpcy5tb2RhbEJveEZvb3RlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIHRoaXMubW9kYWxCb3hGb290ZXIuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsLWJveF9fZm9vdGVyJylcbiAgdGhpcy5tb2RhbEJveC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKVxufVxuXG5mdW5jdGlvbiBfYmluZEV2ZW50cyAoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHtcbiAgICBjbGlja0Nsb3NlQnRuOiB0aGlzLmNsb3NlLmJpbmQodGhpcyksXG4gICAgY2xpY2tPdmVybGF5OiBfaGFuZGxlQ2xpY2tPdXRzaWRlLmJpbmQodGhpcyksXG4gICAgcmVzaXplOiB0aGlzLmNoZWNrT3ZlcmZsb3cuYmluZCh0aGlzKSxcbiAgICBrZXlib2FyZE5hdjogX2hhbmRsZUtleWJvYXJkTmF2LmJpbmQodGhpcylcbiAgfVxuXG4gIGlmICh0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoJ2J1dHRvbicpICE9PSAtMSkge1xuICAgIHRoaXMubW9kYWxDbG9zZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuX2V2ZW50cy5jbGlja0Nsb3NlQnRuKVxuICB9XG5cbiAgdGhpcy5tb2RhbC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCB0aGlzLl9ldmVudHMuY2xpY2tPdmVybGF5KVxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5fZXZlbnRzLnJlc2l6ZSlcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHRoaXMuX2V2ZW50cy5rZXlib2FyZE5hdilcbn1cblxuZnVuY3Rpb24gX2hhbmRsZUtleWJvYXJkTmF2IChldmVudCkge1xuICAvLyBlc2NhcGUga2V5XG4gIGlmICh0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoJ2VzY2FwZScpICE9PSAtMSAmJiBldmVudC53aGljaCA9PT0gMjcgJiYgdGhpcy5pc09wZW4oKSkge1xuICAgIHRoaXMuY2xvc2UoKVxuICB9XG59XG5cbmZ1bmN0aW9uIF9oYW5kbGVDbGlja091dHNpZGUgKGV2ZW50KSB7XG4gIC8vIG9uIG1hY09TLCBjbGljayBvbiBzY3JvbGxiYXIgKGhpZGRlbiBtb2RlKSB3aWxsIHRyaWdnZXIgY2xvc2UgZXZlbnQgc28gd2UgbmVlZCB0byBieXBhc3MgdGhpcyBiZWhhdmlvciBieSBkZXRlY3Rpbmcgc2Nyb2xsYmFyIG1vZGVcbiAgdmFyIHNjcm9sbGJhcldpZHRoID0gdGhpcy5tb2RhbC5vZmZzZXRXaWR0aCAtIHRoaXMubW9kYWwuY2xpZW50V2lkdGhcbiAgdmFyIGNsaWNrZWRPblNjcm9sbGJhciA9IGV2ZW50LmNsaWVudFggPj0gdGhpcy5tb2RhbC5vZmZzZXRXaWR0aCAtIDE1IC8vIDE1cHggaXMgbWFjT1Mgc2Nyb2xsYmFyIGRlZmF1bHQgd2lkdGhcbiAgdmFyIGlzU2Nyb2xsYWJsZSA9IHRoaXMubW9kYWwuc2Nyb2xsSGVpZ2h0ICE9PSB0aGlzLm1vZGFsLm9mZnNldEhlaWdodFxuICBpZiAobmF2aWdhdG9yLnBsYXRmb3JtID09PSAnTWFjSW50ZWwnICYmIHNjcm9sbGJhcldpZHRoID09PSAwICYmIGNsaWNrZWRPblNjcm9sbGJhciAmJiBpc1Njcm9sbGFibGUpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIC8vIGlmIGNsaWNrIGlzIG91dHNpZGUgdGhlIG1vZGFsXG4gIGlmICh0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoJ292ZXJsYXknKSAhPT0gLTEgJiYgIV9maW5kQW5jZXN0b3IoZXZlbnQudGFyZ2V0LCAndGluZ2xlLW1vZGFsJykgJiZcbiAgICBldmVudC5jbGllbnRYIDwgdGhpcy5tb2RhbC5jbGllbnRXaWR0aCkge1xuICAgIHRoaXMuY2xvc2UoKVxuICB9XG59XG5cbmZ1bmN0aW9uIF9maW5kQW5jZXN0b3IgKGVsLCBjbHMpIHtcbiAgd2hpbGUgKChlbCA9IGVsLnBhcmVudEVsZW1lbnQpICYmICFlbC5jbGFzc0xpc3QuY29udGFpbnMoY2xzKSk7XG4gIHJldHVybiBlbFxufVxuXG5mdW5jdGlvbiBfdW5iaW5kRXZlbnRzICgpIHtcbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignYnV0dG9uJykgIT09IC0xKSB7XG4gICAgdGhpcy5tb2RhbENsb3NlQnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5fZXZlbnRzLmNsaWNrQ2xvc2VCdG4pXG4gIH1cbiAgdGhpcy5tb2RhbC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCB0aGlzLl9ldmVudHMuY2xpY2tPdmVybGF5KVxuICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5fZXZlbnRzLnJlc2l6ZSlcbiAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHRoaXMuX2V2ZW50cy5rZXlib2FyZE5hdilcbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbi8qID09IGhlbHBlcnMgKi9cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cbmZ1bmN0aW9uIGV4dGVuZCAoKSB7XG4gIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgZm9yICh2YXIga2V5IGluIGFyZ3VtZW50c1tpXSkge1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhcmd1bWVudHNbaV0sIGtleSkpIHtcbiAgICAgICAgYXJndW1lbnRzWzBdW2tleV0gPSBhcmd1bWVudHNbaV1ba2V5XVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gYXJndW1lbnRzWzBdXG59XG4iLCJpbXBvcnQgUlNsaWRlciBmcm9tICdyc2xpZGVyJ1xuaW1wb3J0IE9wdGlvbnNTZXQgZnJvbSAnT3B0aW9uc1NldCdcbmltcG9ydCAqIGFzIFRvcGljQ2hvb3NlciBmcm9tICdUb3BpY0Nob29zZXInXG5pbXBvcnQgTW9kYWwgZnJvbSAnVGluZ2xlJ1xuaW1wb3J0IHsgcmFuZEVsZW0sIGNyZWF0ZUVsZW0sIGhhc0FuY2VzdG9yQ2xhc3MsIGJvb2xPYmplY3RUb0FycmF5IH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG4vKiBUT0RPIGxpc3Q6XG4gKiBBZGRpdGlvbmFsIHF1ZXN0aW9uIGJsb2NrIC0gcHJvYmFibHkgaW4gbWFpbi5qc1xuICogUmVtb3ZlIG9wdGlvbnMgYnV0dG9uIGZvciB0b3BpY3Mgd2l0aG91dCBvcHRpb25zXG4gKiBab29tL3NjYWxlIGJ1dHRvbnNcbiAqL1xuXG4vLyBNYWtlIGFuIG92ZXJsYXkgdG8gY2FwdHVyZSBhbnkgY2xpY2tzIG91dHNpZGUgYm94ZXMsIGlmIG5lY2Vzc2FyeVxuY3JlYXRlRWxlbSgnZGl2JywgJ292ZXJsYXkgaGlkZGVuJywgZG9jdW1lbnQuYm9keSkuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBoaWRlQWxsQWN0aW9ucylcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUXVlc3Rpb25TZXQge1xuICBjb25zdHJ1Y3RvciAocU51bWJlcikge1xuICAgIHRoaXMucXVlc3Rpb25zID0gW10gLy8gbGlzdCBvZiBxdWVzdGlvbnMgYW5kIHRoZSBET00gZWxlbWVudCB0aGV5J3JlIHJlbmRlcmVkIGluXG4gICAgdGhpcy50b3BpY3MgPSBbXSAvLyBsaXN0IG9mIHRvcGljcyB3aGljaCBoYXZlIGJlZW4gc2VsZWN0ZWQgZm9yIHRoaXMgc2V0XG4gICAgdGhpcy5vcHRpb25zU2V0cyA9IFtdIC8vIGxpc3Qgb2YgT3B0aW9uc1NldCBvYmplY3RzIGNhcnJ5aW5nIG9wdGlvbnMgZm9yIHRvcGljcyB3aXRoIG9wdGlvbnNcbiAgICB0aGlzLnFOdW1iZXIgPSBxTnVtYmVyIHx8IDEgLy8gUXVlc3Rpb24gbnVtYmVyIChwYXNzZWQgaW4gYnkgY2FsbGVyLCB3aGljaCB3aWxsIGtlZXAgY291bnQpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlIC8vIFdoZXRoZXIgYW5zd2VyZWQgb3Igbm90XG4gICAgdGhpcy5jb21tYW5kV29yZCA9ICcnIC8vIFNvbWV0aGluZyBsaWtlICdzaW1wbGlmeSdcbiAgICB0aGlzLnVzZUNvbW1hbmRXb3JkID0gdHJ1ZSAvLyBVc2UgdGhlIGNvbW1hbmQgd29yZCBpbiB0aGUgbWFpbiBxdWVzdGlvbiwgZmFsc2UgZ2l2ZSBjb21tYW5kIHdvcmQgd2l0aCBlYWNoIHN1YnF1ZXN0aW9uXG4gICAgdGhpcy5uID0gOCAvLyBOdW1iZXIgb2YgcXVlc3Rpb25zXG5cbiAgICB0aGlzLl9idWlsZCgpXG4gIH1cblxuICBfYnVpbGQgKCkge1xuICAgIHRoaXMub3V0ZXJCb3ggPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tb3V0ZXJib3gnKVxuICAgIHRoaXMuaGVhZGVyQm94ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWhlYWRlcmJveCcsIHRoaXMub3V0ZXJCb3gpXG4gICAgdGhpcy5kaXNwbGF5Qm94ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWRpc3BsYXlib3gnLCB0aGlzLm91dGVyQm94KVxuXG4gICAgdGhpcy5fYnVpbGRPcHRpb25zQm94KClcblxuICAgIHRoaXMuX2J1aWxkVG9waWNDaG9vc2VyKClcbiAgfVxuXG4gIF9idWlsZE9wdGlvbnNCb3ggKCkge1xuICAgIGNvbnN0IHRvcGljU3BhbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCBudWxsLCB0aGlzLmhlYWRlckJveClcbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbiA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCAndG9waWMtY2hvb3NlciBidXR0b24nLCB0b3BpY1NwYW4pXG4gICAgdGhpcy50b3BpY0Nob29zZXJCdXR0b24uaW5uZXJIVE1MID0gJ0Nob29zZSB0b3BpYydcbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGUgPT4gdGhpcy5jaG9vc2VUb3BpY3MoKSlcblxuICAgIGNvbnN0IGRpZmZpY3VsdHlTcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIG51bGwsIHRoaXMuaGVhZGVyQm94KVxuICAgIGRpZmZpY3VsdHlTcGFuLmFwcGVuZCgnRGlmZmljdWx0eTogJylcbiAgICBjb25zdCBkaWZmaWN1bHR5U2xpZGVyT3V0ZXIgPSBjcmVhdGVFbGVtKCdzcGFuJywgJ3NsaWRlci1vdXRlcicsIGRpZmZpY3VsdHlTcGFuKVxuICAgIHRoaXMuZGlmZmljdWx0eVNsaWRlckVsZW1lbnQgPSBjcmVhdGVFbGVtKCdpbnB1dCcsIG51bGwsIGRpZmZpY3VsdHlTbGlkZXJPdXRlcilcblxuICAgIGNvbnN0IG5TcGFuID0gY3JlYXRlRWxlbSgnc3BhbicsIG51bGwsIHRoaXMuaGVhZGVyQm94KVxuICAgIG5TcGFuLmFwcGVuZCgnTnVtYmVyIG9mIHF1ZXN0aW9uczogJylcbiAgICBjb25zdCBuUXVlc3Rpb25zSW5wdXQgPSBjcmVhdGVFbGVtKCdpbnB1dCcsICduLXF1ZXN0aW9ucycsIG5TcGFuKVxuICAgIG5RdWVzdGlvbnNJbnB1dC50eXBlID0gJ251bWJlcidcbiAgICBuUXVlc3Rpb25zSW5wdXQubWluID0gJzEnXG4gICAgblF1ZXN0aW9uc0lucHV0LnZhbHVlID0gJzgnXG4gICAgblF1ZXN0aW9uc0lucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGUgPT4ge1xuICAgICAgdGhpcy5uID0gcGFyc2VJbnQoblF1ZXN0aW9uc0lucHV0LnZhbHVlKVxuICAgIH0pXG5cbiAgICB0aGlzLmdlbmVyYXRlQnV0dG9uID0gY3JlYXRlRWxlbSgnYnV0dG9uJywgJ2dlbmVyYXRlLWJ1dHRvbiBidXR0b24nLCB0aGlzLmhlYWRlckJveClcbiAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmRpc2FibGVkID0gdHJ1ZVxuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uaW5uZXJIVE1MID0gJ0dlbmVyYXRlISdcbiAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZSA9PiB0aGlzLmdlbmVyYXRlQWxsKCkpXG4gIH1cblxuICBfaW5pdFNsaWRlciAoKSB7XG4gICAgdGhpcy5kaWZmaWN1bHR5U2xpZGVyID0gbmV3IFJTbGlkZXIoe1xuICAgICAgdGFyZ2V0OiB0aGlzLmRpZmZpY3VsdHlTbGlkZXJFbGVtZW50LFxuICAgICAgdmFsdWVzOiB7IG1pbjogMSwgbWF4OiAxMCB9LFxuICAgICAgcmFuZ2U6IHRydWUsXG4gICAgICBzZXQ6IFsyLCA2XSxcbiAgICAgIHN0ZXA6IDEsXG4gICAgICB0b29sdGlwOiBmYWxzZSxcbiAgICAgIHNjYWxlOiB0cnVlLFxuICAgICAgbGFiZWxzOiB0cnVlXG4gICAgfSlcbiAgfVxuXG4gIF9idWlsZFRvcGljQ2hvb3NlciAoKSB7XG4gICAgLy8gYnVpbGQgYW4gT3B0aW9uc1NldCBvYmplY3QgZm9yIHRoZSB0b3BpY3NcbiAgICBjb25zdCB0b3BpY3MgPSBUb3BpY0Nob29zZXIuZ2V0VG9waWNzKClcbiAgICBjb25zdCBvcHRpb25zU3BlYyA9IFtdXG4gICAgdG9waWNzLmZvckVhY2godG9waWMgPT4ge1xuICAgICAgb3B0aW9uc1NwZWMucHVzaCh7XG4gICAgICAgIHRpdGxlOiB0b3BpYy50aXRsZSxcbiAgICAgICAgaWQ6IHRvcGljLmlkLFxuICAgICAgICB0eXBlOiAnYm9vbCcsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICBzd2FwTGFiZWw6IHRydWVcbiAgICAgIH0pXG4gICAgfSlcbiAgICB0aGlzLnRvcGljc09wdGlvbnMgPSBuZXcgT3B0aW9uc1NldChvcHRpb25zU3BlYylcblxuICAgIC8vIEJ1aWxkIGEgbW9kYWwgZGlhbG9nIHRvIHB1dCB0aGVtIGluXG4gICAgdGhpcy50b3BpY3NNb2RhbCA9IG5ldyBNb2RhbCh7XG4gICAgICBmb290ZXI6IHRydWUsXG4gICAgICBzdGlja3lGb290ZXI6IGZhbHNlLFxuICAgICAgY2xvc2VNZXRob2RzOiBbJ292ZXJsYXknLCAnZXNjYXBlJ10sXG4gICAgICBjbG9zZUxhYmVsOiAnQ2xvc2UnLFxuICAgICAgb25DbG9zZTogeCA9PiB7XG4gICAgICAgIHRoaXMudXBkYXRlVG9waWNzKClcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhpcy50b3BpY3NNb2RhbC5hZGRGb290ZXJCdG4oXG4gICAgICAnT0snLFxuICAgICAgJ2J1dHRvbiBtb2RhbC1idXR0b24nLFxuICAgICAgeCA9PiB7XG4gICAgICAgIHRoaXMudG9waWNzTW9kYWwuY2xvc2UoKVxuICAgICAgfSlcblxuICAgIC8vIHJlbmRlciBvcHRpb25zIGludG8gbW9kYWxcbiAgICB0aGlzLnRvcGljc09wdGlvbnMucmVuZGVySW4odGhpcy50b3BpY3NNb2RhbC5tb2RhbEJveENvbnRlbnQpXG5cbiAgICAvLyBBZGQgZnVydGhlciBvcHRpb25zIGJ1dHRvbnNcbiAgICAvLyBUaGlzIGZlZWxzIGEgYml0IGlmZnkgLSBkZXBlbmRzIHRvbyBtdWNoIG9uIGltcGxlbWVudGF0aW9uIG9mIE9wdGlvbnNTZXRcbiAgICBjb25zdCBsaXMgPSBBcnJheS5mcm9tKHRoaXMudG9waWNzTW9kYWwubW9kYWxCb3hDb250ZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdsaScpKVxuICAgIGxpcy5mb3JFYWNoKGxpID0+IHtcbiAgICAgIGNvbnN0IHRvcGljSWQgPSBsaS5kYXRhc2V0Lm9wdGlvbklkXG4gICAgICBpZiAoVG9waWNDaG9vc2VyLmhhc09wdGlvbnModG9waWNJZCkpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9uc0J1dHRvbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdpY29uLWJ1dHRvbiBleHRyYS1vcHRpb25zLWJ1dHRvbicsIGxpKVxuICAgICAgICB0aGlzLl9idWlsZFRvcGljT3B0aW9ucyhsaS5kYXRhc2V0Lm9wdGlvbklkLCBvcHRpb25zQnV0dG9uKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBfYnVpbGRUb3BpY09wdGlvbnMgKHRvcGljSWQsIG9wdGlvbnNCdXR0b24pIHtcbiAgICAvLyBCdWlsZCB0aGUgVUkgYW5kIE9wdGlvbnNTZXQgb2JqZWN0IGxpbmtlZCB0byB0b3BpY0lkLiBQYXNzIGluIGEgYnV0dG9uIHdoaWNoIHNob3VsZCBsYXVuY2ggaXRcblxuICAgIC8vIE1ha2UgdGhlIE9wdGlvbnNTZXQgb2JqZWN0IGFuZCBzdG9yZSBhIHJlZmVyZW5jZSB0byBpdFxuICAgIC8vIE9ubHkgc3RvcmUgaWYgb2JqZWN0IGlzIGNyZWF0ZWQ/XG4gICAgY29uc3Qgb3B0aW9uc1NldCA9IFRvcGljQ2hvb3Nlci5uZXdPcHRpb25zU2V0KHRvcGljSWQpXG4gICAgdGhpcy5vcHRpb25zU2V0c1t0b3BpY0lkXSA9IG9wdGlvbnNTZXRcblxuICAgIC8vIE1ha2UgYSBtb2RhbCBkaWFsb2cgZm9yIGl0XG4gICAgY29uc3QgbW9kYWwgPSBuZXcgTW9kYWwoe1xuICAgICAgZm9vdGVyOiB0cnVlLFxuICAgICAgc3RpY2t5Rm9vdGVyOiBmYWxzZSxcbiAgICAgIGNsb3NlTWV0aG9kczogWydvdmVybGF5JywgJ2VzY2FwZSddLFxuICAgICAgY2xvc2VMYWJlbDogJ0Nsb3NlJ1xuICAgIH0pXG5cbiAgICBtb2RhbC5hZGRGb290ZXJCdG4oXG4gICAgICAnT0snLFxuICAgICAgJ2J1dHRvbiBtb2RhbC1idXR0b24nLFxuICAgICAgeCA9PiB7XG4gICAgICAgIG1vZGFsLmNsb3NlKClcbiAgICAgIH0pXG5cbiAgICBvcHRpb25zU2V0LnJlbmRlckluKG1vZGFsLm1vZGFsQm94Q29udGVudClcblxuICAgIC8vIGxpbmsgdGhlIG1vZGFsIHRvIHRoZSBidXR0b25cbiAgICBvcHRpb25zQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZSA9PiB7XG4gICAgICBtb2RhbC5vcGVuKClcbiAgICB9KVxuICB9XG5cbiAgY2hvb3NlVG9waWNzICgpIHtcbiAgICB0aGlzLnRvcGljc01vZGFsLm9wZW4oKVxuICB9XG5cbiAgdXBkYXRlVG9waWNzICgpIHtcbiAgICAvLyB0b3BpYyBjaG9pY2VzIGFyZSBzdG9yZWQgaW4gdGhpcy50b3BpY3NPcHRpb25zIGF1dG9tYXRpY2FsbHlcbiAgICAvLyBwdWxsIHRoaXMgaW50byB0aGlzLnRvcGljcyBhbmQgdXBkYXRlIGJ1dHRvbiBkaXNwbGF5c1xuXG4gICAgLy8gaGF2ZSBvYmplY3Qgd2l0aCBib29sZWFuIHByb3BlcnRpZXMuIEp1c3Qgd2FudCB0aGUgdHJ1ZSB2YWx1ZXNcbiAgICBjb25zdCB0b3BpY3MgPSBib29sT2JqZWN0VG9BcnJheSh0aGlzLnRvcGljc09wdGlvbnMub3B0aW9ucylcbiAgICB0aGlzLnRvcGljcyA9IHRvcGljc1xuXG4gICAgbGV0IHRleHRcblxuICAgIGlmICh0b3BpY3MubGVuZ3RoID09PSAwKSB7XG4gICAgICB0ZXh0ID0gJ0Nob29zZSB0b3BpYycgLy8gbm90aGluZyBzZWxlY3RlZFxuICAgICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5kaXNhYmxlZCA9IHRydWVcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgaWQgPSB0b3BpY3NbMF0gLy8gZmlyc3QgaXRlbSBzZWxlY3RlZFxuICAgICAgdGV4dCA9IFRvcGljQ2hvb3Nlci5nZXRUaXRsZShpZClcbiAgICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uZGlzYWJsZWQgPSBmYWxzZVxuICAgIH1cblxuICAgIGlmICh0b3BpY3MubGVuZ3RoID4gMSkgeyAvLyBhbnkgYWRkaXRpb25hbCBzaG93IGFzIGUuZy4gJyArIDFcbiAgICAgIHRleHQgKz0gJyArJyArICh0b3BpY3MubGVuZ3RoIC0gMSlcbiAgICB9XG5cbiAgICB0aGlzLnRvcGljQ2hvb3NlckJ1dHRvbi5pbm5lckhUTUwgPSB0ZXh0XG4gIH1cblxuICBzZXRDb21tYW5kV29yZCAoKSB7XG4gICAgLy8gZmlyc3Qgc2V0IHRvIGZpcnN0IHRvcGljIGNvbW1hbmQgd29yZFxuICAgIGxldCBjb21tYW5kV29yZCA9IFRvcGljQ2hvb3Nlci5nZXRDbGFzcyh0aGlzLnRvcGljc1swXSkuY29tbWFuZFdvcmRcbiAgICBsZXQgdXNlQ29tbWFuZFdvcmQgPSB0cnVlIC8vIHRydWUgaWYgc2hhcmVkIGNvbW1hbmQgd29yZFxuXG4gICAgLy8gY3ljbGUgdGhyb3VnaCByZXN0IG9mIHRvcGljcywgcmVzZXQgY29tbWFuZCB3b3JkIGlmIHRoZXkgZG9uJ3QgbWF0Y2hcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IHRoaXMudG9waWNzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoVG9waWNDaG9vc2VyLmdldENsYXNzKHRoaXMudG9waWNzW2ldKS5jb21tYW5kV29yZCAhPT0gY29tbWFuZFdvcmQpIHtcbiAgICAgICAgY29tbWFuZFdvcmQgPSAnJ1xuICAgICAgICB1c2VDb21tYW5kV29yZCA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jb21tYW5kV29yZCA9IGNvbW1hbmRXb3JkXG4gICAgdGhpcy51c2VDb21tYW5kV29yZCA9IHVzZUNvbW1hbmRXb3JkXG4gIH1cblxuICBnZW5lcmF0ZUFsbCAoKSB7XG4gICAgLy8gQ2xlYXIgZGlzcGxheS1ib3ggYW5kIHF1ZXN0aW9uIGxpc3RcbiAgICB0aGlzLmRpc3BsYXlCb3guaW5uZXJIVE1MID0gJydcbiAgICB0aGlzLnF1ZXN0aW9ucyA9IFtdXG4gICAgdGhpcy5zZXRDb21tYW5kV29yZCgpXG5cbiAgICAvLyBTZXQgbnVtYmVyIGFuZCBtYWluIGNvbW1hbmQgd29yZFxuICAgIGNvbnN0IG1haW5xID0gY3JlYXRlRWxlbSgncCcsICdrYXRleCBtYWlucScsIHRoaXMuZGlzcGxheUJveClcbiAgICBtYWlucS5pbm5lckhUTUwgPSBgJHt0aGlzLnFOdW1iZXJ9LiAke3RoaXMuY29tbWFuZFdvcmR9YCAvLyBUT0RPOiBnZXQgY29tbWFuZCB3b3JkIGZyb20gcXVlc3Rpb25zXG5cbiAgICAvLyBNYWtlIHNob3cgYW5zd2VycyBidXR0b25cbiAgICB0aGlzLmFuc3dlckJ1dHRvbiA9IGNyZWF0ZUVsZW0oJ3AnLCAnYnV0dG9uIHNob3ctYW5zd2VycycsIHRoaXMuZGlzcGxheUJveClcbiAgICB0aGlzLmFuc3dlckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGUgPT4ge1xuICAgICAgdGhpcy50b2dnbGVBbnN3ZXJzKClcbiAgICB9KVxuICAgIHRoaXMuYW5zd2VyQnV0dG9uLmlubmVySFRNTCA9ICdTaG93IGFuc3dlcnMnXG5cbiAgICAvLyBHZXQgZGlmZmljdWx0eSBmcm9tIHNsaWRlclxuICAgIGNvbnN0IG1pbmRpZmYgPSB0aGlzLmRpZmZpY3VsdHlTbGlkZXIuZ2V0VmFsdWVMKClcbiAgICBjb25zdCBtYXhkaWZmID0gdGhpcy5kaWZmaWN1bHR5U2xpZGVyLmdldFZhbHVlUigpXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAvLyBNYWtlIHF1ZXN0aW9uIGNvbnRhaW5lciBET00gZWxlbWVudFxuICAgICAgY29uc3QgY29udGFpbmVyID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWNvbnRhaW5lcicsIHRoaXMuZGlzcGxheUJveClcbiAgICAgIGNvbnRhaW5lci5kYXRhc2V0LnF1ZXN0aW9uX2luZGV4ID0gaSAvLyBub3Qgc3VyZSB0aGlzIGlzIGFjdHVhbGx5IG5lZWRlZFxuXG4gICAgICAvLyBBZGQgY29udGFpbmVyIGxpbmsgdG8gb2JqZWN0IGluIHF1ZXN0aW9ucyBsaXN0XG4gICAgICBpZiAoIXRoaXMucXVlc3Rpb25zW2ldKSB0aGlzLnF1ZXN0aW9uc1tpXSA9IHt9XG4gICAgICB0aGlzLnF1ZXN0aW9uc1tpXS5jb250YWluZXIgPSBjb250YWluZXJcblxuICAgICAgLy8gY2hvb3NlIGEgZGlmZmljdWx0eSBhbmQgZ2VuZXJhdGVcbiAgICAgIGNvbnN0IGRpZmZpY3VsdHkgPSBtaW5kaWZmICsgTWF0aC5mbG9vcihpICogKG1heGRpZmYgLSBtaW5kaWZmICsgMSkgLyB0aGlzLm4pXG5cbiAgICAgIC8vIGNob29zZSBhIHRvcGljIGlkXG4gICAgICB0aGlzLmdlbmVyYXRlKGksIGRpZmZpY3VsdHkpXG4gICAgfVxuICB9XG5cbiAgZ2VuZXJhdGUgKGksIGRpZmZpY3VsdHksIHRvcGljSWQpIHtcbiAgICAvLyBUT0RPIGdldCBvcHRpb25zIHByb3Blcmx5XG4gICAgdG9waWNJZCA9IHRvcGljSWQgfHwgcmFuZEVsZW0odGhpcy50b3BpY3MpXG5cbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgbGFiZWw6ICcnLFxuICAgICAgZGlmZmljdWx0eTogZGlmZmljdWx0eSxcbiAgICAgIHVzZUNvbW1hbmRXb3JkOiBmYWxzZVxuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnNTZXRzW3RvcGljSWRdKSB7XG4gICAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHRoaXMub3B0aW9uc1NldHNbdG9waWNJZF0ub3B0aW9ucylcbiAgICB9XG5cbiAgICAvLyBjaG9vc2UgYSBxdWVzdGlvblxuICAgIGNvbnN0IHF1ZXN0aW9uID0gVG9waWNDaG9vc2VyLm5ld1F1ZXN0aW9uKHRvcGljSWQsIG9wdGlvbnMpXG5cbiAgICAvLyBzZXQgc29tZSBtb3JlIGRhdGEgaW4gdGhlIHF1ZXN0aW9uc1tdIGxpc3RcbiAgICBpZiAoIXRoaXMucXVlc3Rpb25zW2ldKSB0aHJvdyBuZXcgRXJyb3IoJ3F1ZXN0aW9uIG5vdCBtYWRlJylcbiAgICB0aGlzLnF1ZXN0aW9uc1tpXS5xdWVzdGlvbiA9IHF1ZXN0aW9uXG4gICAgdGhpcy5xdWVzdGlvbnNbaV0udG9waWNJZCA9IHRvcGljSWRcblxuICAgIC8vIFJlbmRlciBpbnRvIHRoZSBjb250YWluZXJcbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLnF1ZXN0aW9uc1tpXS5jb250YWluZXJcbiAgICBjb250YWluZXIuaW5uZXJIVE1MID0gJycgLy8gY2xlYXIgaW4gY2FzZSBvZiByZWZyZXNoXG5cbiAgICAvLyBtYWtlIGFuZCByZW5kZXIgcXVlc3Rpb24gbnVtYmVyIGFuZCBjb21tYW5kIHdvcmQgKGlmIG5lZWRlZClcbiAgICBsZXQgcU51bWJlclRleHQgPSBxdWVzdGlvbkxldHRlcihpKSArICcpJ1xuICAgIGlmICghdGhpcy51c2VDb21tYW5kV29yZCkge1xuICAgICAgcU51bWJlclRleHQgKz0gJyAnICsgVG9waWNDaG9vc2VyLmdldENvbW1hbmRXb3JkKHRvcGljSWQpXG4gICAgICBjb250YWluZXIuY2xhc3NMaXN0LmFkZCgnaW5kaXZpZHVhbC1jb21tYW5kLXdvcmQnKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZSgnaW5kaXZpZHVhbC1jb21tYW5kLXdvcmQnKVxuICAgIH1cblxuICAgIGNvbnN0IHF1ZXN0aW9uTnVtYmVyRGl2ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLW51bWJlciBrYXRleCcsIGNvbnRhaW5lcilcbiAgICBxdWVzdGlvbk51bWJlckRpdi5pbm5lckhUTUwgPSBxTnVtYmVyVGV4dFxuXG4gICAgLy8gcmVuZGVyIHRoZSBxdWVzdGlvblxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChxdWVzdGlvbi5nZXRET00oKSkgLy8gdGhpcyBpcyBhIC5xdWVzdGlvbi1kaXYgZWxlbWVudFxuICAgIHF1ZXN0aW9uLnJlbmRlcigpIC8vIHNvbWUgcXVlc3Rpb25zIG5lZWQgcmVuZGVyaW5nIGFmdGVyIGF0dGFjaGluZyB0byBET01cblxuICAgIC8vIG1ha2UgaGlkZGVuIGFjdGlvbnMgbWVudVxuICAgIGNvbnN0IGFjdGlvbnMgPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tYWN0aW9ucyBoaWRkZW4nLCBjb250YWluZXIpXG4gICAgY29uc3QgcmVmcmVzaEljb24gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tcmVmcmVzaCBpY29uLWJ1dHRvbicsIGFjdGlvbnMpXG4gICAgY29uc3QgYW5zd2VySWNvbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1hbnN3ZXIgaWNvbi1idXR0b24nLCBhY3Rpb25zKVxuXG4gICAgYW5zd2VySWNvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGUgPT4ge1xuICAgICAgcXVlc3Rpb24udG9nZ2xlQW5zd2VyKClcbiAgICAgIGhpZGVBbGxBY3Rpb25zKClcbiAgICB9KVxuXG4gICAgcmVmcmVzaEljb24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBlID0+IHtcbiAgICAgIHRoaXMuZ2VuZXJhdGUoaSwgZGlmZmljdWx0eSlcbiAgICAgIGhpZGVBbGxBY3Rpb25zKClcbiAgICB9KVxuXG4gICAgLy8gUTogaXMgdGhpcyBiZXN0IHdheSAtIG9yIGFuIGV2ZW50IGxpc3RlbmVyIG9uIHRoZSB3aG9sZSBkaXNwbGF5Qm94P1xuICAgIGNvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGUgPT4ge1xuICAgICAgaWYgKCFoYXNBbmNlc3RvckNsYXNzKGUudGFyZ2V0LCAncXVlc3Rpb24tYWN0aW9ucycpKSB7XG4gICAgICAgIC8vIG9ubHkgZG8gdGhpcyBpZiBpdCBkaWRuJ3Qgb3JpZ2luYXRlIGluIGFjdGlvbiBidXR0b25cbiAgICAgICAgdGhpcy5zaG93UXVlc3Rpb25BY3Rpb25zKGUsIGkpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIHRvZ2dsZUFuc3dlcnMgKCkge1xuICAgIGlmICh0aGlzLmFuc3dlcmVkKSB7XG4gICAgICB0aGlzLnF1ZXN0aW9ucy5mb3JFYWNoKHEgPT4ge1xuICAgICAgICBxLnF1ZXN0aW9uLmhpZGVBbnN3ZXIoKVxuICAgICAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgICAgICAgdGhpcy5hbnN3ZXJCdXR0b24uaW5uZXJIVE1MID0gJ1Nob3cgYW5zd2VycydcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucXVlc3Rpb25zLmZvckVhY2gocSA9PiB7XG4gICAgICAgIHEucXVlc3Rpb24uc2hvd0Fuc3dlcigpXG4gICAgICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gICAgICAgIHRoaXMuYW5zd2VyQnV0dG9uLmlubmVySFRNTCA9ICdIaWRlIGFuc3dlcnMnXG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIHNob3dRdWVzdGlvbkFjdGlvbnMgKGV2ZW50LCBxdWVzdGlvbkluZGV4KSB7XG4gICAgLy8gZmlyc3QgaGlkZSBhbnkgb3RoZXIgYWN0aW9uc1xuICAgIGhpZGVBbGxBY3Rpb25zKClcblxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMucXVlc3Rpb25zW3F1ZXN0aW9uSW5kZXhdLmNvbnRhaW5lclxuICAgIGNvbnN0IGFjdGlvbnMgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcignLnF1ZXN0aW9uLWFjdGlvbnMnKVxuXG4gICAgLy8gVW5oaWRlIHRoZSBvdmVybGF5XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm92ZXJsYXknKS5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgIGFjdGlvbnMuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJylcbiAgICBhY3Rpb25zLnN0eWxlLmxlZnQgPSAoY29udGFpbmVyLm9mZnNldFdpZHRoIC8gMiAtIGFjdGlvbnMub2Zmc2V0V2lkdGggLyAyKSArICdweCdcbiAgICBhY3Rpb25zLnN0eWxlLnRvcCA9IChjb250YWluZXIub2Zmc2V0SGVpZ2h0IC8gMiAtIGFjdGlvbnMub2Zmc2V0SGVpZ2h0IC8gMikgKyAncHgnXG4gIH1cblxuICBhcHBlbmRUbyAoZWxlbSkge1xuICAgIGVsZW0uYXBwZW5kQ2hpbGQodGhpcy5vdXRlckJveClcbiAgICB0aGlzLl9pbml0U2xpZGVyKCkgLy8gaGFzIHRvIGJlIGluIGRvY3VtZW50J3MgRE9NIHRvIHdvcmsgcHJvcGVybHlcbiAgfVxuXG4gIGFwcGVuZEJlZm9yZSAocGFyZW50LCBlbGVtKSB7XG4gICAgcGFyZW50Lmluc2VydEJlZm9yZSh0aGlzLm91dGVyQm94LCBlbGVtKVxuICAgIHRoaXMuX2luaXRTbGlkZXIoKSAvLyBoYXMgdG8gYmUgaW4gZG9jdW1lbnQncyBET00gdG8gd29yayBwcm9wZXJseVxuICB9XG59XG5cbmZ1bmN0aW9uIHF1ZXN0aW9uTGV0dGVyIChpKSB7XG4gIC8vIHJldHVybiBhIHF1ZXN0aW9uIG51bWJlci4gZS5nLiBxTnVtYmVyKDApPVwiYVwiLlxuICAvLyBBZnRlciBsZXR0ZXJzLCB3ZSBnZXQgb24gdG8gZ3JlZWtcbiAgdmFyIGxldHRlciA9XG4gICAgICAgIGkgPCAyNiA/IFN0cmluZy5mcm9tQ2hhckNvZGUoMHg2MSArIGkpXG4gICAgICAgICAgOiBpIDwgNTIgPyBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4NDEgKyBpIC0gMjYpXG4gICAgICAgICAgICA6IFN0cmluZy5mcm9tQ2hhckNvZGUoMHgzQjEgKyBpIC0gNTIpXG4gIHJldHVybiBsZXR0ZXJcbn1cblxuZnVuY3Rpb24gaGlkZUFsbEFjdGlvbnMgKGUpIHtcbiAgLy8gaGlkZSBhbGwgcXVlc3Rpb24gYWN0aW9uc1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucXVlc3Rpb24tYWN0aW9ucycpLmZvckVhY2goZWwgPT4ge1xuICAgIGVsLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpXG4gIH0pXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5vdmVybGF5JykuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcbn1cbiIsImltcG9ydCBRdWVzdGlvblNldCBmcm9tICdRdWVzdGlvblNldCdcblxuLy8gVE9ETzpcbi8vICAtIFF1ZXN0aW9uU2V0IC0gcmVmYWN0b3IgaW50byBtb3JlIGNsYXNzZXM/IEUuZy4gb3B0aW9ucyB3aW5kb3dcbi8vICAtIEltcG9ydCBleGlzdGluZyBxdWVzdGlvbiB0eXBlcyAoRyAtIGdyYXBoaWMsIFQgLSB0ZXh0XG4vLyAgICAtIEcgYW5nbGVzXG4vLyAgICAtIEcgYXJlYVxuLy8gICAgLSBUIGVxdWF0aW9uIG9mIGEgbGluZVxuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgeCA9PiB7XG4gIGNvbnN0IHFzID0gbmV3IFF1ZXN0aW9uU2V0KClcbiAgcXMuYXBwZW5kVG8oZG9jdW1lbnQuYm9keSlcbn0pXG4iXSwibmFtZXMiOlsiY29tbW9uanNIZWxwZXJzLmNyZWF0ZUNvbW1vbmpzTW9kdWxlIiwiY29tbW9uanNIZWxwZXJzLmdldERlZmF1bHRFeHBvcnRGcm9tQ2pzIiwiQW5nbGVzRm9ybWluZ1EiLCJNaXNzaW5nQW5nbGVzVHJpYW5nbGVRIiwiUlNsaWRlciIsIlRvcGljQ2hvb3Nlci5nZXRUb3BpY3MiLCJUb3BpY0Nob29zZXIuaGFzT3B0aW9ucyIsIlRvcGljQ2hvb3Nlci5uZXdPcHRpb25zU2V0IiwiVG9waWNDaG9vc2VyLmdldFRpdGxlIiwiVG9waWNDaG9vc2VyLmdldENsYXNzIiwiVG9waWNDaG9vc2VyLm5ld1F1ZXN0aW9uIiwiVG9waWNDaG9vc2VyLmdldENvbW1hbmRXb3JkIl0sIm1hcHBpbmdzIjoiOzs7RUFBQTtFQUNBO0VBQ0E7QUFDQTtFQUNBLElBQUksRUFBRSxHQUFHLFVBQVUsSUFBSSxFQUFFO0VBQ3pCLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFJO0VBQ25CLEVBQUUsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFJ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SUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUk7QUFDdEc7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7RUFDdkIsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO0VBQzNCLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUM7RUFDL0QsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQztFQUM3RCxLQUFLO0VBQ0wsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQztFQUNwRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFJO0VBQzdGLEdBQUcsTUFBTTtFQUNULElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFDLEVBQUU7RUFDdEYsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENB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LEtBQUssQ0FBQyxLQUFLLENBQUM7RUFDbkQsS0FBSztFQUNMLEdBQUcsRUFBRSxHQUFHLEVBQUM7RUFDVCxFQUFDO0FBQ0Q7RUFDQSxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxZQUFZO0VBQ3BDLEVBQUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLHFCQUFxQixFQUFFLENBQUMsS0FBSTtFQUM1RCxFQUFFLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFXO0VBQzVDLEVBQUUsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFO0VBQzNCLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFHLFVBQVUsUUFBUSxFQUFFO0VBQzVDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUTtFQUMvQixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxLQUFLLEdBQUcsUUFBUSxDQUFDLENBQUMsVUFBVSxFQUFDO0VBQ2hFLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFHLFlBQVk7RUFDcEM7RUFDQTtFQUNBLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUNqRixFQUFDO0FBQ0Q7RUFDQSxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxZQUFZO0VBQ3JDO0VBQ0EsRUFBRSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO0VBQzVDLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFHLFlBQVk7RUFDckM7RUFDQSxFQUFF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QUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQzdDLE1BQU0sV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUM3QixNQUFNO0VBQ04sTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUM7RUFDekMsS0FBSztBQUNMO0VBQ0E7RUFDQSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQzFCLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBQztFQUNaLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBQztFQUNaLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBQztFQUNaLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBQztFQUNaLEtBQUs7QUFDTDtFQUNBLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFDO0VBQzNDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFDO0FBQzNDO0VBQ0E7RUFDQSxJ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LENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUM7RUFDckUsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUM7RUFDckUsSUFBSSxPQUFPLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQztFQUMxRCxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sVUFBVSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRTtFQUM3QjtFQUNBO0VBQ0EsSUFBSSxNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFDO0VBQzVCLElBQUksTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBQztFQUM1QixJQUFJLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksRUFBQztFQUN6QyxJQUFJLE9BQU8sRUFBRSxDQUFDLEVBQUUsSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxHQUFHLE1BQU0sRUFBRTtFQUNqRCxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRTtFQUMzQixJQUFJLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQy9DLEdBQUc7QUFDSDtFQUNB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QyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRTtFQUNqRyxVQUFVLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLE1BQU0sR0FBRyxDQUFDLElBQUksS0FBSTtFQUN4RSxVQUFVLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQztFQUMzQyxTQUFTO0VBQ1QsUUFBUSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUU7RUFDakcsVUFBVSxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSTtFQUMvRCxVQUFVLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQztFQUMzQyxTQUFTO0VBQ1QsT0FBTztFQUNQLEtBQUssRUFBQztFQUNOLEdBQUc7QUFDSDtFQUNBLEVBQUUsVUFBVSxDQUFDLEdBQUc7RUFDaEIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUk7RUFDN0IsTUFBTSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxNQUFLO0VBQ3RCLE1BQU0sQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsT0FBTTtFQUN4QixLQUFLLEVBQUM7RUFDTixJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUU7RUFDdkIsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUk7RUFDeEIsR0FBRztBQUNIO0VBQ0EsRUFBRSxVQUFVLENBQUMsR0FBRztFQUNoQixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSTtFQUM3QixNQUFNLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLE1BQUs7RUFDdEIsTUFBTSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxPQUFNO0VBQ3hCLEtBQUssRUFBQztFQUNOLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRTtFQUN2QixJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBSztFQUN6QixHQUFHO0FBQ0g7RUFDQTtBQUNBO0VBQ0EsRUFBRSxJQUFJLFNBQVMsQ0FBQyxHQUFHO0VBQ25CLElBQUksT0FBTyxFQUFFO0VBQ2IsR0FBRztBQUNIO0VBQ0EsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUU7RUFDYixJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0VBQ3hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUM7RUFDakIsS0FBSyxFQUFDO0VBQ04sR0FBRztBQUNIO0VBQ0EsRUFBRSxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUU7RUFDakIsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRTtFQUN4QyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFDO0VBQ3JCLEtBQUssRUFBQztFQUNOLElBQUksT0FBTyxLQUFLO0VBQ2hCLEdBQUc7QUFDSDtFQUNBLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUNuQixJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0VBQ3hDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3ZCLEtBQUssRUFBQztFQUNOLEdBQUc7QUFDSDtFQUNBLEVBQUUsWUFBWSxDQUFDLEdBQUc7RUFDbEIsSUFBSSxJQUFJLEtBQUssR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFFO0VBQzNDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUM7RUFDdEIsSUFBSSxPQUFPLEtBQUs7RUFDaEIsR0FBRztBQUNIO0VBQ0EsRUFBRSxVQUFVLENBQUMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRTtFQUNyQyxJQUFJLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQztFQUMzQyxJQUFJLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQztFQUMvQyxJQUFJLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLEVBQUM7RUFDaEQsSUFBSSxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFDO0VBQ2pELElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLE1BQU0sSUFBSSxVQUFVLEVBQUUsQ0FBQyxNQUFNLEdBQUcsTUFBTSxJQUFJLFdBQVcsQ0FBQyxFQUFDO0FBQ3hGO0VBQ0E7RUFDQSxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUM7RUFDdkMsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDO0VBQzNDLElBQUksTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsRUFBQztFQUNyRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLE1BQU0sR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBQztFQUMvRCxHQUFHO0VBQ0g7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VDNUxBLElBQUksUUFBUSxHQUFHQSxvQkFBb0MsQ0FBQyxVQUFVLE1BQU0sRUFBRSxPQUFPLEVBQUU7RUFDL0U7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7QUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7QUFDQTtFQUNBLEVBQUUsQ0FBQyxVQUFVLElBQUksRUFBRTtBQUVuQjtFQUNBO0VBQ0E7RUFDQTtFQUNBLElBQUksSUFBSSxhQUFhLEdBQUcsS0FBSTtBQUM1QjtFQUNBO0VBQ0EsSUFBSSxJQUFJLENBQUMsR0FBRztFQUNaLE1BQU0sQ0FBQyxFQUFFLENBQUM7RUFDVixNQUFNLENBQUMsRUFBRSxDQUFDO0VBQ1YsTUFBTSxDQUFDLEVBQUUsQ0FBQztFQUNWLE1BQUs7QUFDTDtFQUNBLElBQUksU0FBUyxXQUFXLEVBQUUsSUFBSSxFQUFFO0VBQ2hDLE1BQU0sU0FBUyxnQkFBZ0IsSUFBSTtFQUNuQyxRQUFRLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBQztFQUMvQyxRQUFRLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFJO0VBQ3BDLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBSztFQUMvQixRQUFRLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQU87RUFDbkMsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sU0FBUyxxQkFBcUIsSUFBSSxFQUFFO0VBQzFDLE1BQU0scUJBQXFCLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxVQUFTO0VBQ3ZELE1BQU0sZ0JBQWdCLENBQUMsU0FBUyxHQUFHLElBQUkscUJBQXFCLEdBQUU7QUFDOUQ7RUFDQSxNQUFNLE9BQU8sZ0JBQWdCO0VBQzdCLEtBQUs7QUFDTDtFQUNBLElBQUksSUFBSSxjQUFjLEdBQUcsUUFBUSxDQUFDLGNBQWMsR0FBRyxXQUFXLENBQUMsZ0JBQWdCLEVBQUM7RUFDaEYsSUFBSSxJQUFJLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsR0FBRyxXQUFXLENBQUMsa0JBQWtCLEVBQUM7QUFDdEY7RUFDQSxJQUFJLFNBQVMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFO0VBQ3RDLFFBQVEsaUJBQWlCLEdBQUU7RUFDM0IsT0FBTztFQUNQLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztFQUNsQixLQUFLO0FBQ0w7RUFDQSxJQUFJLFNBQVMsaUJBQWlCLElBQUk7RUFDbEMsTUFBTSxNQUFNLElBQUksZ0JBQWdCLEVBQUU7RUFDbEMsS0FBSztBQUNMO0VBQ0EsSUFBSSxJQUFJLEtBQUssR0FBRyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUU7RUFDbEMsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFDO0VBQ3JDLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBQztBQUMzRDtFQUNBLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBQztFQUMxQixNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUM7QUFDMUI7RUFDQSxNQUFNLElBQUksQ0FBQyxHQUFHLFNBQVE7RUFDdEIsTUFBTSxJQUFJLEVBQUM7QUFDWDtFQUNBLE1BQU0sSUFBSSxFQUFFLEtBQUssU0FBUyxJQUFJLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FFcEMsTUFBTSxJQUFJLEVBQUUsS0FBSyxTQUFTLEVBQUU7RUFDbkMsUUFBUSxDQUFDLEdBQUcsR0FBRTtFQUNkLFFBQVEsQ0FBQyxHQUFHLEdBQUU7RUFDZCxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztFQUNqQixPQUFPLE1BQU07RUFDYixRQUFRLFFBQVEsT0FBTyxFQUFFO0VBQ3pCLFVBQVUsS0FBSyxRQUFRO0VBQ3ZCLFVBQVU7RUFDVixZQUFZLElBQUksR0FBRyxJQUFJLEVBQUUsSUFBSSxHQUFHLElBQUksRUFBRSxFQUFFO0VBQ3hDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFDO0VBQ3RCLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFDO0VBQ3RCLGNBQWMsSUFBSSxHQUFHLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFDLEVBQUU7RUFDMUMsYUFBYSxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRTtFQUNoQyxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFDO0VBQ3ZCLGNBQWMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUMsRUFBRTtFQUN4QyxhQUFhLE1BQU07RUFDbkIsY0FBYyxpQkFBaUIsR0FBRTtFQUNqQyxhQUFhO0VBQ2IsWUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDckIsWUFBWSxLQUFLO0VBQ2pCLFdBQVc7RUFDWCxVQUFVLEtBQUssUUFBUTtFQUN2QixVQUFVO0VBQ1YsWUFBWSxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUU7RUFDeEIsY0FBYyxDQUFDLEdBQUcsR0FBRTtFQUNwQixjQUFjLEVBQUUsR0FBRyxDQUFDLEdBQUU7RUFDdEIsYUFBYTtBQUNiO0VBQ0EsWUFBWSxJQUFJLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO0VBQzlCLGNBQWMsQ0FBQyxHQUFHLEdBQUU7RUFDcEIsYUFBYSxNQUFNLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRTtFQUMvQixjQUFjLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRTtFQUMzQixnQkFBZ0IsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDO0VBQzFFLGdCQUFnQixFQUFFLElBQUksRUFBQztFQUN2QixlQUFlO0FBQ2Y7RUFDQTtFQUNBO0FBQ0E7RUFDQSxjQUFjLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQ3ZDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUM7QUFDckM7RUFDQSxnQkFBZ0IsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFO0VBQzlCLGtCQUFrQixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQ2xDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDN0Isb0JBQW9CLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztFQUM3QixtQkFBbUIsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7RUFDcEMsb0JBQW9CLENBQUMsR0FBRyxFQUFDO0VBQ3pCLG9CQUFvQixDQUFDLEdBQUcsRUFBQztFQUN6QixtQkFBbUIsTUFBTTtFQUN6QixvQkFBb0IsQ0FBQyxHQUFHLEVBQUM7RUFDekIsb0JBQW9CLENBQUMsR0FBRyxFQUFDO0VBQ3pCLG1CQUFtQjtFQUNuQixrQkFBa0IsS0FBSztFQUN2QixpQkFBaUIsTUFBTTtFQUN2QixrQkFBa0IsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFO0VBQzlCLG9CQUFvQixDQUFDLElBQUksRUFBQztFQUMxQixvQkFBb0IsQ0FBQyxJQUFJLEVBQUM7RUFDMUIsbUJBQW1CLE1BQU07RUFDekIsb0JBQW9CLENBQUMsSUFBSSxFQUFDO0VBQzFCLG9CQUFvQixDQUFDLElBQUksRUFBQztFQUMxQixtQkFBbUI7QUFDbkI7RUFDQSxrQkFBa0IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0VBQzdCLG9CQUFvQixDQUFDLEdBQUcsRUFBQztFQUN6QixvQkFBb0IsQ0FBQyxHQUFHLEVBQUM7RUFDekIsbUJBQW1CLE1BQU07RUFDekIsb0JBQW9CLENBQUMsR0FBRyxFQUFDO0VBQ3pCLG9CQUFvQixDQUFDLEdBQUcsRUFBQztFQUN6QixtQkFBbUI7RUFDbkIsaUJBQWlCO0VBQ2pCLGVBQWU7RUFDZixjQUFjLENBQUMsSUFBSSxFQUFDO0VBQ3BCLGFBQWEsTUFBTSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDL0MsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUc7RUFDekIsYUFBYTtFQUNiLFlBQVksS0FBSztFQUNqQixXQUFXO0VBQ1gsVUFBVSxLQUFLLFFBQVE7RUFDdkIsVUFBVTtFQUNWLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFDO0FBQ2xDO0VBQ0EsWUFBWSxJQUFJLENBQUMsS0FBSyxJQUFJLEVBQUUsRUFBRSxpQkFBaUIsR0FBRSxFQUFFO0FBQ25EO0VBQ0EsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7RUFDOUIsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ3BCLGNBQWMsQ0FBQyxHQUFFO0VBQ2pCLGFBQWEsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7RUFDckMsY0FBYyxDQUFDLEdBQUU7RUFDakIsYUFBYTtBQUNiO0VBQ0EsWUFBWSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRTtFQUNwQyxjQUFjLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ25DLGFBQWEsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7RUFDekQsY0FBYyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7RUFDaEMsZ0JBQWdCLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3JDLGVBQWU7RUFDZixjQUFjLENBQUMsR0FBRTtBQUNqQjtFQUNBO0VBQ0EsY0FBYyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtFQUN0SCxnQkFBZ0IsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ25DLGdCQUFnQixDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQztFQUM3QyxnQkFBZ0IsQ0FBQyxHQUFFO0VBQ25CLGVBQWU7QUFDZjtFQUNBO0VBQ0EsY0FBYyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtFQUN4RixnQkFBZ0IsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUN2QyxnQkFBZ0IsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQztFQUNyRCxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUM7RUFDdEIsZUFBZTtFQUNmLGFBQWEsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0VBQzdELGNBQWMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ2pDLGNBQWMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNyQyxjQUFjLENBQUMsSUFBSSxFQUFDO0VBQ3BCLGFBQWEsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0VBQzdELGNBQWMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ2pDLGNBQWMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNyQyxjQUFjLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDckMsY0FBYyxDQUFDLElBQUksRUFBQztFQUNwQixhQUFhO0FBQ2I7RUFDQSxZQUFZLElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7RUFDL0IsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDdkIsY0FBYyxDQUFDO0VBQ2Ysb0JBQW9CLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztFQUN6QyxjQUFjLEtBQUs7RUFDbkIsYUFBYTtBQUNiO0VBQ0E7RUFDQSxXQUFXO0VBQ1gsVUFBVTtFQUNWLFlBQVksaUJBQWlCLEdBQUU7RUFDL0IsU0FBUztFQUNULE9BQU87QUFDUDtFQUNBLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO0VBQ25CLFFBQVEsTUFBTSxJQUFJLGNBQWMsRUFBRTtFQUNsQyxPQUFPO0FBQ1A7RUFDQSxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFDO0VBQzFCLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQztFQUN2QixNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDdkIsTUFBSztBQUNMO0VBQ0EsSUFBSSxTQUFTLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUM5QixNQUFNLElBQUksQ0FBQyxHQUFHLEVBQUM7RUFDZixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFO0VBQzlDLFFBQVEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0VBQ25CLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFDO0VBQ3pCLFNBQVM7RUFDVCxPQUFPO0VBQ1AsTUFBTSxPQUFPLENBQUM7RUFDZCxLQUFLO0FBQ0w7RUFDQSxJQUFJLFNBQVMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDN0IsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztFQUN4QixRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDaEIsT0FBTztBQUNQO0VBQ0EsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztFQUN4QixRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDaEIsT0FBTztBQUNQO0VBQ0EsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDO0VBQ2pCLE1BQU0sRUFBRSxPQUFPLENBQUMsRUFBRTtBQUNsQjtFQUNBO0VBQ0E7RUFDQTtFQUNBO0FBQ0E7RUFDQSxNQUFNLElBQUksR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFDO0VBQ3RCLE1BQU0sSUFBSSxDQUFDLEdBQUcsRUFBQztBQUNmO0VBQ0EsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDN0IsUUFBUSxHQUFHLEdBQUcsR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFDO0FBQzFCO0VBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxhQUFhLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRTtFQUMzQyxPQUFPO0VBQ1AsTUFBTSxPQUFPLENBQUM7RUFDZCxLQUFLO0FBQ0w7RUFDQSxJQUFJLFNBQVMsVUFBVSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFO0VBQ3BDLE1BQU0sSUFBSSxJQUFJLEdBQUcsRUFBQztFQUNsQixNQUFNLElBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQztBQUNuQztFQUNBLE1BQU0sS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUNwQztBQUNBO0VBQ0EsUUFBUSxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRTtBQUN2QztFQUNBLFFBQVEsSUFBSSxHQUFHLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBQztFQUM1QixRQUFRLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBRSxHQUFHLEVBQUM7RUFDNUIsT0FBTztFQUNQLE1BQU0sT0FBTyxDQUFDO0VBQ2QsS0FBSztBQUNMO0VBQ0EsSUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQ3hCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFO0VBQzFCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFO0FBQzFCO0VBQ0EsTUFBTSxPQUFPLENBQUMsRUFBRTtFQUNoQixRQUFRLENBQUMsSUFBSSxFQUFDO0VBQ2QsUUFBUSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUU7RUFDNUIsUUFBUSxDQUFDLElBQUksRUFBQztFQUNkLFFBQVEsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFO0VBQzVCLE9BQU87RUFDUCxLQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxJQUFJLFNBQVMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDN0IsTUFBTSxJQUFJLEVBQUUsSUFBSSxZQUFZLFFBQVEsQ0FBQyxFQUFFO0VBQ3ZDLFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQ2pDLE9BQU87QUFDUDtFQUNBLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7QUFDakI7RUFDQSxNQUFNLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRTtFQUMzQixRQUFRLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQ3pCLE9BQU8sTUFBTTtFQUNiLFFBQVEsQ0FBQyxHQUFHLEVBQUM7RUFDYixPQUFPO0FBQ1A7RUFDQSxNQUFNLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDbEIsTUFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBQztFQUN0QixNQUFNLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFDO0VBQ3RCLEtBQUs7QUFDTDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLEVBQUM7QUFDdkI7RUFDQSxJQUFJLFFBQVEsQ0FBQyxTQUFTLEdBQUc7QUFDekI7RUFDQSxNQUFNLENBQUMsRUFBRSxDQUFDO0VBQ1YsTUFBTSxDQUFDLEVBQUUsQ0FBQztFQUNWLE1BQU0sQ0FBQyxFQUFFLENBQUM7QUFDVjtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEdBQUcsRUFBRSxZQUFZO0VBQ3ZCLFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDM0MsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sR0FBRyxFQUFFLFlBQVk7RUFDdkIsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDckQsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUMzQixRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ25CLFFBQVEsT0FBTyxJQUFJLFFBQVE7RUFDM0IsVUFBVSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDcEQsVUFBVSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ3RCLFNBQVM7RUFDVCxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxHQUFHLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzNCLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbkIsUUFBUSxPQUFPLElBQUksUUFBUTtFQUMzQixVQUFVLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUNwRCxVQUFVLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDdEIsU0FBUztFQUNULE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDM0IsUUFBUSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNuQixRQUFRLE9BQU8sSUFBSSxRQUFRO0VBQzNCLFVBQVUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDckMsVUFBVSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ3RCLFNBQVM7RUFDVCxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxHQUFHLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzNCLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbkIsUUFBUSxPQUFPLElBQUksUUFBUTtFQUMzQixVQUFVLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ3JDLFVBQVUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUN0QixTQUFTO0VBQ1QsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sS0FBSyxFQUFFLFlBQVk7RUFDekIsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQztFQUNqQyxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxHQUFHLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzNCLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDNUMsVUFBVSxPQUFPLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQztFQUNsQyxTQUFTO0FBQ1Q7RUFDQSxRQUFRLElBQUksQ0FBQyxLQUFLLFNBQVMsRUFBRTtFQUM3QixVQUFVLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQzFELFNBQVM7QUFDVDtFQUNBLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDbkIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFO0VBQ3ZDLFVBQVUsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDeEIsU0FBUztBQUNUO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtBQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLFFBQVEsT0FBTyxJQUFJLFFBQVE7RUFDM0IsVUFBVSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUNsRCxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7RUFDdEIsU0FBUztFQUNULE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDM0IsUUFBUSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztBQUNuQjtFQUNBO0FBQ0E7RUFDQSxRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDOUUsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUMzQixRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0FBQ25CO0VBQ0E7QUFDQTtFQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRTtFQUN2QyxVQUFVLE9BQU8sSUFBSSxRQUFRLEVBQUU7RUFDL0IsU0FBUztFQUNULFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENB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LEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUM7RUFDL0MsT0FBTztFQUNQLEtBQUssRUFBQztBQUNOO0VBQ0EsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEtBQUs7RUFDekMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtFQUM3QixRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFDO0VBQy9DLE9BQU87RUFDUCxLQUFLLEVBQUM7RUFDTixJQUFJLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUM7RUFDMUMsSUFBSSxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7RUFDOUIsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLENBQUMsR0FBRztFQUNiLElBQUksSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRTtFQUNwRCxJQUFJLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUU7RUFDL0IsUUFBUSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEdBQUc7RUFDM0IsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUMzQixJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsS0FBSztFQUN6QyxNQUFNLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRTtFQUN2QixRQUFRLEdBQUcsSUFBSSxTQUFRO0VBQ3ZCLE9BQU8sTUFBTTtFQUNiLFFBQVEsR0FBRyxJQUFJLFFBQVEsR0FBRyxH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QUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBQztFQUNsRCxRQUFRLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBQztFQUN0RCxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3pDLFVBQVUsTUFBTSxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDbEQsVUFBVSxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDeEQsVUFBVSxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDeEQsVUFBVSxJQUFJLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBRztFQUM3QyxVQUFVLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDM0IsWUFBWSxNQUFNLEVBQUUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQ3BELFlBQVksTUFBTSxHQUFHLEdBQUcsR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQzFELFlBQVksTUFBTSxHQUFHLEdBQUcsR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQzFELFlBQVksSUFBSSxJQUFJLEdBQUcsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBRztFQUNsRCxXQUFXO0VBQ1gsVUFBVSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFH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QU07RUFDOUIsSUFBSSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxHQUFHLElBQUc7QUFDOUQ7RUFDQTtFQUNBLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQzVCLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFDO0VBQ2pDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFFO0VBQ2YsSUFBSSxJQUFJLFVBQVUsR0FBRyxFQUFDO0VBQ3RCLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUN0RCxNQUFNLFVBQVUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUc7RUFDdkQsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBQztFQUNyRCxLQUFLO0FBQ0w7RUFDQTtFQUNBLElBQUksVUFBVSxHQUFHLEVBQUM7RUFDbEIsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3RELE1BQU0sTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDO0VBQ3ZDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRztFQUN2QixRQUFRLEdBQUcsRUFBRSxLQUFLLENBQUMsWUFBWSxDQUFDLE1BQU0s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SUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQztFQUNqRCxJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQztFQUNyRCxJQUFJLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBQztFQUNuRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLE1BQU0sR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBQztFQUMvRCxHQUFHO0FBQ0g7RUFDQSxFQUFFLE1BQU0sQ0FBQyxHQUFHO0VBQ1osSUFBSSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUM7RUFDNUMsSUFBSSxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFDO0VBQzdDLElBQUksTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFJO0FBQy9CO0VBQ0EsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUM7QUFDOUQ7RUFDQSxJQUFJLEdBQUcsQ0FBQyxTQUFTLEdBQUU7RUFDbkIsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQ2xDO0VBQ0EsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcs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
