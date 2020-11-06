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
              /* using css transform instead
              label.style.left = (l.pos.x - lwidth / 2) + 'px'
              label.style.top = (l.pos.y - lheight / 2) + 'px'
              */
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
        /* calculate distance out from center of label */
        let d = 0.4;
        const labelLength = this.data.angleLabels[i].length - '^\\circ'.length;
        d += 3*labelLength/theta; // inversely proportional to angle, proportional to lenght of label
        d = Math.min(d,1);
        this.labels[i] = {
          pos: Point.fromPolarDeg(radius * d, totalangle + theta / 2),
          textq: this.data.angleLabels[i],
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
      static random(options) {
          const defaults = {
              angleSum: 180,
              minAngle: 10,
              minN: 2,
              maxN: 4,
              repeated: false,
              width: 250,
              height: 250
          };
          options = Object.assign({}, defaults, options);
          const data = MissingAnglesAlgebraData.random(options);
          const view = new MissingAnglesAroundAlgebraView(data, options); // TODO eliminate public constructors
          return new MissingAnglesAroundAlgebraQ(data, view);
      }
      static get commandWord() { return 'Find the missing value'; }
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
              default:
                  subtype = 'algebra';
                  questionOptions.expressionTypes = ['mixed'];
                  questionOptions.minN = 2;
                  questionOptions.maxN = 3;
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
                  switch (subtype) {
                      case 'simple':
                      case 'repeated':
                          questionOptions.repeated = subtype === 'repeated';
                          question = MissingAnglesAroundQ.random(questionOptions);
                          break;
                      case 'algebra':
                          question = MissingAnglesAroundAlgebraQ.random(questionOptions);
                          break;
                      default:
                          throw new Error(`unexpected subtype ${subtype}`);
                  }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vbW9kdWxlcy92ZW5kb3IvcnNsaWRlci5qcyIsIi4uL21vZHVsZXMvVXRpbGl0aWVzLmpzIiwiLi4vbW9kdWxlcy9PcHRpb25zU2V0LmpzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9RdWVzdGlvbi50cyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGV4dFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FsZ2VicmFpY0ZyYWN0aW9uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvSW50ZWdlckFkZC5qcyIsIi4uL21vZHVsZXMvUG9pbnQuanMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRLnRzIiwiLi4vbW9kdWxlcy92ZW5kb3IvZnJhY3Rpb24uanMiLCIuLi9tb2R1bGVzL01vbm9taWFsLmpzIiwiLi4vbW9kdWxlcy9Qb2x5bm9taWFsLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9Bcml0aG1hZ29uUS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vVGV4dFEvVGVzdFEuanMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL1RleHRRL0FkZEFaZXJvLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvbi9UZXh0US9FcXVhdGlvbk9mTGluZS5qcyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kVmlldy5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzTnVtYmVyRGF0YS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQXJvdW5kUS50cyIsIi4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3LmpzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZURhdGEudHMiLCIuLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUS5qcyIsIi4uL21vZHVsZXMvTGluRXhwci5qcyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEudHMiLCIuLi8uLi9tb2R1bGVzL1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFWaWV3LnRzIiwiLi4vLi4vbW9kdWxlcy9RdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUS50cyIsIi4uLy4uL21vZHVsZXMvUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzV3JhcHBlci50cyIsIi4uL21vZHVsZXMvVG9waWNDaG9vc2VyLmpzIiwiLi4vbW9kdWxlcy92ZW5kb3IvVGluZ2xlLmpzIiwiLi4vbW9kdWxlcy9RdWVzdGlvblNldC5qcyIsIi4uL21haW4uanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogUnNsaWRlci4gRG93bmxvYWRlZCBmcm9tIGh0dHBzOi8vc2xhd29taXItemF6aWFibG8uZ2l0aHViLmlvL3JhbmdlLXNsaWRlci9cbiAqIE1vZGlmaWVkIHRvIG1ha2UgaW50byBFUzYgbW9kdWxlIGFuZCBmaXggYSBmZXcgYnVnc1xuICovXG5cbnZhciBSUyA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIHRoaXMuaW5wdXQgPSBudWxsXG4gIHRoaXMuaW5wdXREaXNwbGF5ID0gbnVsbFxuICB0aGlzLnNsaWRlciA9IG51bGxcbiAgdGhpcy5zbGlkZXJXaWR0aCA9IDBcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gMFxuICB0aGlzLnBvaW50ZXJXaWR0aCA9IDBcbiAgdGhpcy5wb2ludGVyUiA9IG51bGxcbiAgdGhpcy5wb2ludGVyTCA9IG51bGxcbiAgdGhpcy5hY3RpdmVQb2ludGVyID0gbnVsbFxuICB0aGlzLnNlbGVjdGVkID0gbnVsbFxuICB0aGlzLnNjYWxlID0gbnVsbFxuICB0aGlzLnN0ZXAgPSAwXG4gIHRoaXMudGlwTCA9IG51bGxcbiAgdGhpcy50aXBSID0gbnVsbFxuICB0aGlzLnRpbWVvdXQgPSBudWxsXG4gIHRoaXMudmFsUmFuZ2UgPSBmYWxzZVxuXG4gIHRoaXMudmFsdWVzID0ge1xuICAgIHN0YXJ0OiBudWxsLFxuICAgIGVuZDogbnVsbFxuICB9XG4gIHRoaXMuY29uZiA9IHtcbiAgICB0YXJnZXQ6IG51bGwsXG4gICAgdmFsdWVzOiBudWxsLFxuICAgIHNldDogbnVsbCxcbiAgICByYW5nZTogZmFsc2UsXG4gICAgd2lkdGg6IG51bGwsXG4gICAgc2NhbGU6IHRydWUsXG4gICAgbGFiZWxzOiB0cnVlLFxuICAgIHRvb2x0aXA6IHRydWUsXG4gICAgc3RlcDogbnVsbCxcbiAgICBkaXNhYmxlZDogZmFsc2UsXG4gICAgb25DaGFuZ2U6IG51bGxcbiAgfVxuXG4gIHRoaXMuY2xzID0ge1xuICAgIGNvbnRhaW5lcjogJ3JzLWNvbnRhaW5lcicsXG4gICAgYmFja2dyb3VuZDogJ3JzLWJnJyxcbiAgICBzZWxlY3RlZDogJ3JzLXNlbGVjdGVkJyxcbiAgICBwb2ludGVyOiAncnMtcG9pbnRlcicsXG4gICAgc2NhbGU6ICdycy1zY2FsZScsXG4gICAgbm9zY2FsZTogJ3JzLW5vc2NhbGUnLFxuICAgIHRpcDogJ3JzLXRvb2x0aXAnXG4gIH1cblxuICBmb3IgKHZhciBpIGluIHRoaXMuY29uZikgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbmYsIGkpKSB0aGlzLmNvbmZbaV0gPSBjb25mW2ldIH1cblxuICB0aGlzLmluaXQoKVxufVxuXG5SUy5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHR5cGVvZiB0aGlzLmNvbmYudGFyZ2V0ID09PSAnb2JqZWN0JykgdGhpcy5pbnB1dCA9IHRoaXMuY29uZi50YXJnZXRcbiAgZWxzZSB0aGlzLmlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5jb25mLnRhcmdldC5yZXBsYWNlKCcjJywgJycpKVxuXG4gIGlmICghdGhpcy5pbnB1dCkgcmV0dXJuIGNvbnNvbGUubG9nKCdDYW5ub3QgZmluZCB0YXJnZXQgZWxlbWVudC4uLicpXG5cbiAgdGhpcy5pbnB1dERpc3BsYXkgPSBnZXRDb21wdXRlZFN0eWxlKHRoaXMuaW5wdXQsIG51bGwpLmRpc3BsYXlcbiAgdGhpcy5pbnB1dC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG4gIHRoaXMudmFsUmFuZ2UgPSAhKHRoaXMuY29uZi52YWx1ZXMgaW5zdGFuY2VvZiBBcnJheSlcblxuICBpZiAodGhpcy52YWxSYW5nZSkge1xuICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuY29uZi52YWx1ZXMsICdtaW4nKSB8fCAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuY29uZi52YWx1ZXMsICdtYXgnKSkgeyByZXR1cm4gY29uc29sZS5sb2coJ01pc3NpbmcgbWluIG9yIG1heCB2YWx1ZS4uLicpIH1cbiAgfVxuICByZXR1cm4gdGhpcy5jcmVhdGVTbGlkZXIoKVxufVxuXG5SUy5wcm90b3R5cGUuY3JlYXRlU2xpZGVyID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNsaWRlciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLmNvbnRhaW5lcilcbiAgdGhpcy5zbGlkZXIuaW5uZXJIVE1MID0gJzxkaXYgY2xhc3M9XCJycy1iZ1wiPjwvZGl2PidcbiAgdGhpcy5zZWxlY3RlZCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnNlbGVjdGVkKVxuICB0aGlzLnBvaW50ZXJMID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMucG9pbnRlciwgWydkaXInLCAnbGVmdCddKVxuICB0aGlzLnNjYWxlID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMuc2NhbGUpXG5cbiAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7XG4gICAgdGhpcy50aXBMID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMudGlwKVxuICAgIHRoaXMudGlwUiA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHRoaXMuY2xzLnRpcClcbiAgICB0aGlzLnBvaW50ZXJMLmFwcGVuZENoaWxkKHRoaXMudGlwTClcbiAgfVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnNlbGVjdGVkKVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnNjYWxlKVxuICB0aGlzLnNsaWRlci5hcHBlbmRDaGlsZCh0aGlzLnBvaW50ZXJMKVxuXG4gIGlmICh0aGlzLmNvbmYucmFuZ2UpIHtcbiAgICB0aGlzLnBvaW50ZXJSID0gY3JlYXRlRWxlbWVudCgnZGl2JywgdGhpcy5jbHMucG9pbnRlciwgWydkaXInLCAncmlnaHQnXSlcbiAgICBpZiAodGhpcy5jb25mLnRvb2x0aXApIHRoaXMucG9pbnRlclIuYXBwZW5kQ2hpbGQodGhpcy50aXBSKVxuICAgIHRoaXMuc2xpZGVyLmFwcGVuZENoaWxkKHRoaXMucG9pbnRlclIpXG4gIH1cblxuICB0aGlzLmlucHV0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuc2xpZGVyLCB0aGlzLmlucHV0Lm5leHRTaWJsaW5nKVxuXG4gIGlmICh0aGlzLmNvbmYud2lkdGgpIHRoaXMuc2xpZGVyLnN0eWxlLndpZHRoID0gcGFyc2VJbnQodGhpcy5jb25mLndpZHRoKSArICdweCdcbiAgdGhpcy5zbGlkZXJMZWZ0ID0gdGhpcy5zbGlkZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdFxuICB0aGlzLnNsaWRlcldpZHRoID0gdGhpcy5zbGlkZXIuY2xpZW50V2lkdGhcbiAgdGhpcy5wb2ludGVyV2lkdGggPSB0aGlzLnBvaW50ZXJMLmNsaWVudFdpZHRoXG5cbiAgaWYgKCF0aGlzLmNvbmYuc2NhbGUpIHRoaXMuc2xpZGVyLmNsYXNzTGlzdC5hZGQodGhpcy5jbHMubm9zY2FsZSlcblxuICByZXR1cm4gdGhpcy5zZXRJbml0aWFsVmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLnNldEluaXRpYWxWYWx1ZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZGlzYWJsZWQodGhpcy5jb25mLmRpc2FibGVkKVxuXG4gIGlmICh0aGlzLnZhbFJhbmdlKSB0aGlzLmNvbmYudmFsdWVzID0gcHJlcGFyZUFycmF5VmFsdWVzKHRoaXMuY29uZilcblxuICB0aGlzLnZhbHVlcy5zdGFydCA9IDBcbiAgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnJhbmdlID8gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxIDogMFxuXG4gIGlmICh0aGlzLmNvbmYuc2V0ICYmIHRoaXMuY29uZi5zZXQubGVuZ3RoICYmIGNoZWNrSW5pdGlhbCh0aGlzLmNvbmYpKSB7XG4gICAgdmFyIHZhbHMgPSB0aGlzLmNvbmYuc2V0XG5cbiAgICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgICB0aGlzLnZhbHVlcy5zdGFydCA9IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzBdKVxuICAgICAgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnNldFsxXSA/IHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZih2YWxzWzFdKSA6IG51bGxcbiAgICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKHZhbHNbMF0pXG4gIH1cbiAgcmV0dXJuIHRoaXMuY3JlYXRlU2NhbGUoKVxufVxuXG5SUy5wcm90b3R5cGUuY3JlYXRlU2NhbGUgPSBmdW5jdGlvbiAocmVzaXplKSB7XG4gIHRoaXMuc3RlcCA9IHRoaXMuc2xpZGVyV2lkdGggLyAodGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHtcbiAgICB2YXIgc3BhbiA9IGNyZWF0ZUVsZW1lbnQoJ3NwYW4nKVxuICAgIHZhciBpbnMgPSBjcmVhdGVFbGVtZW50KCdpbnMnKVxuXG4gICAgc3Bhbi5hcHBlbmRDaGlsZChpbnMpXG4gICAgdGhpcy5zY2FsZS5hcHBlbmRDaGlsZChzcGFuKVxuXG4gICAgc3Bhbi5zdHlsZS53aWR0aCA9IGkgPT09IGlMZW4gLSAxID8gMCA6IHRoaXMuc3RlcCArICdweCdcblxuICAgIGlmICghdGhpcy5jb25mLmxhYmVscykge1xuICAgICAgaWYgKGkgPT09IDAgfHwgaSA9PT0gaUxlbiAtIDEpIGlucy5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW2ldXG4gICAgfSBlbHNlIGlucy5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW2ldXG5cbiAgICBpbnMuc3R5bGUubWFyZ2luTGVmdCA9IChpbnMuY2xpZW50V2lkdGggLyAyKSAqIC0xICsgJ3B4J1xuICB9XG4gIHJldHVybiB0aGlzLmFkZEV2ZW50cygpXG59XG5cblJTLnByb3RvdHlwZS51cGRhdGVTY2FsZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zdGVwID0gdGhpcy5zbGlkZXJXaWR0aCAvICh0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDEpXG5cbiAgdmFyIHBpZWNlcyA9IHRoaXMuc2xpZGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NwYW4nKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gcGllY2VzLmxlbmd0aDsgaSA8IGlMZW4gLSAxOyBpKyspIHsgcGllY2VzW2ldLnN0eWxlLndpZHRoID0gdGhpcy5zdGVwICsgJ3B4JyB9XG5cbiAgcmV0dXJuIHRoaXMuc2V0VmFsdWVzKClcbn1cblxuUlMucHJvdG90eXBlLmFkZEV2ZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHBvaW50ZXJzID0gdGhpcy5zbGlkZXIucXVlcnlTZWxlY3RvckFsbCgnLicgKyB0aGlzLmNscy5wb2ludGVyKVxuICB2YXIgcGllY2VzID0gdGhpcy5zbGlkZXIucXVlcnlTZWxlY3RvckFsbCgnc3BhbicpXG5cbiAgY3JlYXRlRXZlbnRzKGRvY3VtZW50LCAnbW91c2Vtb3ZlIHRvdWNobW92ZScsIHRoaXMubW92ZS5iaW5kKHRoaXMpKVxuICBjcmVhdGVFdmVudHMoZG9jdW1lbnQsICdtb3VzZXVwIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgdGhpcy5kcm9wLmJpbmQodGhpcykpXG5cbiAgZm9yIChsZXQgaSA9IDAsIGlMZW4gPSBwb2ludGVycy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHsgY3JlYXRlRXZlbnRzKHBvaW50ZXJzW2ldLCAnbW91c2Vkb3duIHRvdWNoc3RhcnQnLCB0aGlzLmRyYWcuYmluZCh0aGlzKSkgfVxuXG4gIGZvciAobGV0IGkgPSAwLCBpTGVuID0gcGllY2VzLmxlbmd0aDsgaSA8IGlMZW47IGkrKykgeyBjcmVhdGVFdmVudHMocGllY2VzW2ldLCAnY2xpY2snLCB0aGlzLm9uQ2xpY2tQaWVjZS5iaW5kKHRoaXMpKSB9XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMub25SZXNpemUuYmluZCh0aGlzKSlcblxuICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxufVxuXG5SUy5wcm90b3R5cGUuZHJhZyA9IGZ1bmN0aW9uIChlKSB7XG4gIGUucHJldmVudERlZmF1bHQoKVxuXG4gIGlmICh0aGlzLmNvbmYuZGlzYWJsZWQpIHJldHVyblxuXG4gIHZhciBkaXIgPSBlLnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtZGlyJylcbiAgaWYgKGRpciA9PT0gJ2xlZnQnKSB0aGlzLmFjdGl2ZVBvaW50ZXIgPSB0aGlzLnBvaW50ZXJMXG4gIGlmIChkaXIgPT09ICdyaWdodCcpIHRoaXMuYWN0aXZlUG9pbnRlciA9IHRoaXMucG9pbnRlclJcblxuICByZXR1cm4gdGhpcy5zbGlkZXIuY2xhc3NMaXN0LmFkZCgnc2xpZGluZycpXG59XG5cblJTLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24gKGUpIHtcbiAgaWYgKHRoaXMuYWN0aXZlUG9pbnRlciAmJiAhdGhpcy5jb25mLmRpc2FibGVkKSB7XG4gICAgdmFyIGNvb3JkWCA9IGUudHlwZSA9PT0gJ3RvdWNobW92ZScgPyBlLnRvdWNoZXNbMF0uY2xpZW50WCA6IGUucGFnZVhcbiAgICB2YXIgaW5kZXggPSBjb29yZFggLSB0aGlzLnNsaWRlckxlZnQgLSAodGhpcy5wb2ludGVyV2lkdGggLyAyKVxuXG4gICAgaW5kZXggPSBNYXRoLnJvdW5kKGluZGV4IC8gdGhpcy5zdGVwKVxuXG4gICAgaWYgKGluZGV4IDw9IDApIGluZGV4ID0gMFxuICAgIGlmIChpbmRleCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgaW5kZXggPSB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDFcblxuICAgIGlmICh0aGlzLmNvbmYucmFuZ2UpIHtcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgPT09IHRoaXMucG9pbnRlckwpIHRoaXMudmFsdWVzLnN0YXJ0ID0gaW5kZXhcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXIgPT09IHRoaXMucG9pbnRlclIpIHRoaXMudmFsdWVzLmVuZCA9IGluZGV4XG4gICAgfSBlbHNlIHRoaXMudmFsdWVzLmVuZCA9IGluZGV4XG5cbiAgICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxuICB9XG59XG5cblJTLnByb3RvdHlwZS5kcm9wID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmFjdGl2ZVBvaW50ZXIgPSBudWxsXG59XG5cblJTLnByb3RvdHlwZS5zZXRWYWx1ZXMgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICB2YXIgYWN0aXZlUG9pbnRlciA9IHRoaXMuY29uZi5yYW5nZSA/ICdzdGFydCcgOiAnZW5kJ1xuXG4gIGlmIChzdGFydCAmJiB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2Yoc3RhcnQpID4gLTEpIHsgdGhpcy52YWx1ZXNbYWN0aXZlUG9pbnRlcl0gPSB0aGlzLmNvbmYudmFsdWVzLmluZGV4T2Yoc3RhcnQpIH1cblxuICBpZiAoZW5kICYmIHRoaXMuY29uZi52YWx1ZXMuaW5kZXhPZihlbmQpID4gLTEpIHsgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5pbmRleE9mKGVuZCkgfVxuXG4gIGlmICh0aGlzLmNvbmYucmFuZ2UgJiYgdGhpcy52YWx1ZXMuc3RhcnQgPiB0aGlzLnZhbHVlcy5lbmQpIHsgdGhpcy52YWx1ZXMuc3RhcnQgPSB0aGlzLnZhbHVlcy5lbmQgfVxuXG4gIHRoaXMucG9pbnRlckwuc3R5bGUubGVmdCA9ICh0aGlzLnZhbHVlc1thY3RpdmVQb2ludGVyXSAqIHRoaXMuc3RlcCAtICh0aGlzLnBvaW50ZXJXaWR0aCAvIDIpKSArICdweCdcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgaWYgKHRoaXMuY29uZi50b29sdGlwKSB7XG4gICAgICB0aGlzLnRpcEwuaW5uZXJIVE1MID0gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5zdGFydF1cbiAgICAgIHRoaXMudGlwUi5pbm5lckhUTUwgPSB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1cbiAgICB9XG4gICAgdGhpcy5pbnB1dC52YWx1ZSA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdICsgJywnICsgdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG4gICAgdGhpcy5wb2ludGVyUi5zdHlsZS5sZWZ0ID0gKHRoaXMudmFsdWVzLmVuZCAqIHRoaXMuc3RlcCAtICh0aGlzLnBvaW50ZXJXaWR0aCAvIDIpKSArICdweCdcbiAgfSBlbHNlIHtcbiAgICBpZiAodGhpcy5jb25mLnRvb2x0aXApIHsgdGhpcy50aXBMLmlubmVySFRNTCA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXSB9XG4gICAgdGhpcy5pbnB1dC52YWx1ZSA9IHRoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuZW5kXVxuICB9XG5cbiAgaWYgKHRoaXMudmFsdWVzLmVuZCA+IHRoaXMuY29uZi52YWx1ZXMubGVuZ3RoIC0gMSkgdGhpcy52YWx1ZXMuZW5kID0gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxXG4gIGlmICh0aGlzLnZhbHVlcy5zdGFydCA8IDApIHRoaXMudmFsdWVzLnN0YXJ0ID0gMFxuXG4gIHRoaXMuc2VsZWN0ZWQuc3R5bGUud2lkdGggPSAodGhpcy52YWx1ZXMuZW5kIC0gdGhpcy52YWx1ZXMuc3RhcnQpICogdGhpcy5zdGVwICsgJ3B4J1xuICB0aGlzLnNlbGVjdGVkLnN0eWxlLmxlZnQgPSB0aGlzLnZhbHVlcy5zdGFydCAqIHRoaXMuc3RlcCArICdweCdcblxuICByZXR1cm4gdGhpcy5vbkNoYW5nZSgpXG59XG5cblJTLnByb3RvdHlwZS5vbkNsaWNrUGllY2UgPSBmdW5jdGlvbiAoZSkge1xuICBpZiAodGhpcy5jb25mLmRpc2FibGVkKSByZXR1cm5cblxuICB2YXIgaWR4ID0gTWF0aC5yb3VuZCgoZS5jbGllbnRYIC0gdGhpcy5zbGlkZXJMZWZ0KSAvIHRoaXMuc3RlcClcblxuICBpZiAoaWR4ID4gdGhpcy5jb25mLnZhbHVlcy5sZW5ndGggLSAxKSBpZHggPSB0aGlzLmNvbmYudmFsdWVzLmxlbmd0aCAtIDFcbiAgaWYgKGlkeCA8IDApIGlkeCA9IDBcblxuICBpZiAodGhpcy5jb25mLnJhbmdlKSB7XG4gICAgaWYgKGlkeCAtIHRoaXMudmFsdWVzLnN0YXJ0IDw9IHRoaXMudmFsdWVzLmVuZCAtIGlkeCkge1xuICAgICAgdGhpcy52YWx1ZXMuc3RhcnQgPSBpZHhcbiAgICB9IGVsc2UgdGhpcy52YWx1ZXMuZW5kID0gaWR4XG4gIH0gZWxzZSB0aGlzLnZhbHVlcy5lbmQgPSBpZHhcblxuICB0aGlzLnNsaWRlci5jbGFzc0xpc3QucmVtb3ZlKCdzbGlkaW5nJylcblxuICByZXR1cm4gdGhpcy5zZXRWYWx1ZXMoKVxufVxuXG5SUy5wcm90b3R5cGUub25DaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBfdGhpcyA9IHRoaXNcblxuICBpZiAodGhpcy50aW1lb3V0KSBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0KVxuXG4gIHRoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIGlmIChfdGhpcy5jb25mLm9uQ2hhbmdlICYmIHR5cGVvZiBfdGhpcy5jb25mLm9uQ2hhbmdlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gX3RoaXMuY29uZi5vbkNoYW5nZShfdGhpcy5pbnB1dC52YWx1ZSlcbiAgICB9XG4gIH0sIDUwMClcbn1cblxuUlMucHJvdG90eXBlLm9uUmVzaXplID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNsaWRlckxlZnQgPSB0aGlzLnNsaWRlci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0XG4gIHRoaXMuc2xpZGVyV2lkdGggPSB0aGlzLnNsaWRlci5jbGllbnRXaWR0aFxuICByZXR1cm4gdGhpcy51cGRhdGVTY2FsZSgpXG59XG5cblJTLnByb3RvdHlwZS5kaXNhYmxlZCA9IGZ1bmN0aW9uIChkaXNhYmxlZCkge1xuICB0aGlzLmNvbmYuZGlzYWJsZWQgPSBkaXNhYmxlZFxuICB0aGlzLnNsaWRlci5jbGFzc0xpc3RbZGlzYWJsZWQgPyAnYWRkJyA6ICdyZW1vdmUnXSgnZGlzYWJsZWQnKVxufVxuXG5SUy5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIFJldHVybiBsaXN0IG9mIG51bWJlcnMsIHJhdGhlciB0aGFuIGEgc3RyaW5nLCB3aGljaCB3b3VsZCBqdXN0IGJlIHNpbGx5XG4gIC8vICByZXR1cm4gdGhpcy5pbnB1dC52YWx1ZVxuICByZXR1cm4gW3RoaXMuY29uZi52YWx1ZXNbdGhpcy52YWx1ZXMuc3RhcnRdLCB0aGlzLmNvbmYudmFsdWVzW3RoaXMudmFsdWVzLmVuZF1dXG59XG5cblJTLnByb3RvdHlwZS5nZXRWYWx1ZUwgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIEdldCBsZWZ0IChpLmUuIHNtYWxsZXN0KSB2YWx1ZVxuICByZXR1cm4gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5zdGFydF1cbn1cblxuUlMucHJvdG90eXBlLmdldFZhbHVlUiA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gR2V0IHJpZ2h0IChpLmUuIHNtYWxsZXN0KSB2YWx1ZVxuICByZXR1cm4gdGhpcy5jb25mLnZhbHVlc1t0aGlzLnZhbHVlcy5lbmRdXG59XG5cblJTLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmlucHV0LnN0eWxlLmRpc3BsYXkgPSB0aGlzLmlucHV0RGlzcGxheVxuICB0aGlzLnNsaWRlci5yZW1vdmUoKVxufVxuXG52YXIgY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uIChlbCwgY2xzLCBkYXRhQXR0cikge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZWwpXG4gIGlmIChjbHMpIGVsZW1lbnQuY2xhc3NOYW1lID0gY2xzXG4gIGlmIChkYXRhQXR0ciAmJiBkYXRhQXR0ci5sZW5ndGggPT09IDIpIHsgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2RhdGEtJyArIGRhdGFBdHRyWzBdLCBkYXRhQXR0clsxXSkgfVxuXG4gIHJldHVybiBlbGVtZW50XG59XG5cbnZhciBjcmVhdGVFdmVudHMgPSBmdW5jdGlvbiAoZWwsIGV2LCBjYWxsYmFjaykge1xuICB2YXIgZXZlbnRzID0gZXYuc3BsaXQoJyAnKVxuXG4gIGZvciAodmFyIGkgPSAwLCBpTGVuID0gZXZlbnRzLmxlbmd0aDsgaSA8IGlMZW47IGkrKykgeyBlbC5hZGRFdmVudExpc3RlbmVyKGV2ZW50c1tpXSwgY2FsbGJhY2spIH1cbn1cblxudmFyIHByZXBhcmVBcnJheVZhbHVlcyA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIHZhciB2YWx1ZXMgPSBbXVxuICB2YXIgcmFuZ2UgPSBjb25mLnZhbHVlcy5tYXggLSBjb25mLnZhbHVlcy5taW5cblxuICBpZiAoIWNvbmYuc3RlcCkge1xuICAgIGNvbnNvbGUubG9nKCdObyBzdGVwIGRlZmluZWQuLi4nKVxuICAgIHJldHVybiBbY29uZi52YWx1ZXMubWluLCBjb25mLnZhbHVlcy5tYXhdXG4gIH1cblxuICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IChyYW5nZSAvIGNvbmYuc3RlcCk7IGkgPCBpTGVuOyBpKyspIHsgdmFsdWVzLnB1c2goY29uZi52YWx1ZXMubWluICsgaSAqIGNvbmYuc3RlcCkgfVxuXG4gIGlmICh2YWx1ZXMuaW5kZXhPZihjb25mLnZhbHVlcy5tYXgpIDwgMCkgdmFsdWVzLnB1c2goY29uZi52YWx1ZXMubWF4KVxuXG4gIHJldHVybiB2YWx1ZXNcbn1cblxudmFyIGNoZWNrSW5pdGlhbCA9IGZ1bmN0aW9uIChjb25mKSB7XG4gIGlmICghY29uZi5zZXQgfHwgY29uZi5zZXQubGVuZ3RoIDwgMSkgcmV0dXJuIG51bGxcbiAgaWYgKGNvbmYudmFsdWVzLmluZGV4T2YoY29uZi5zZXRbMF0pIDwgMCkgcmV0dXJuIG51bGxcblxuICBpZiAoY29uZi5yYW5nZSkge1xuICAgIGlmIChjb25mLnNldC5sZW5ndGggPCAyIHx8IGNvbmYudmFsdWVzLmluZGV4T2YoY29uZi5zZXRbMV0pIDwgMCkgcmV0dXJuIG51bGxcbiAgfVxuICByZXR1cm4gdHJ1ZVxufVxuXG5leHBvcnQgZGVmYXVsdCBSU1xuIiwiLyogUk5HcyAvIHNlbGVjdG9ycyAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdhdXNzaWFuIChuKSB7XG4gIGxldCBybnVtID0gMFxuICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgIHJudW0gKz0gTWF0aC5yYW5kb20oKVxuICB9XG4gIHJldHVybiBybnVtIC8gblxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZEJldHdlZW4gKG4sIG0sIGRpc3QpIHtcbiAgLy8gcmV0dXJuIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBuIGFuZCBtIGluY2x1c2l2ZVxuICAvLyBkaXN0IChvcHRpb25hbCkgaXMgYSBmdW5jdGlvbiByZXR1cm5pbmcgYSB2YWx1ZSBpbiBbMCwxKVxuICAvLyBkZWZhdWx0IGlzIHNsaWdodGx5IGJpYXNlZCB0b3dhcmRzIG1pZGRsZVxuICBpZiAoIWRpc3QpIGRpc3QgPSBNYXRoLnJhbmRvbVxuICByZXR1cm4gbiArIE1hdGguZmxvb3IoZGlzdCgpICogKG0gLSBuICsgMSkpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kQmV0d2VlbkZpbHRlciAobiwgbSwgZmlsdGVyKSB7XG4gIC8qIHJldHVybnMgYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIG4gYW5kIG0gaW5jbHVzaXZlIHdoaWNoIHNhdGlzZmllcyB0aGUgZmlsdGVyXG4gIC8gIG4sIG06IGludGVnZXJcbiAgLyAgZmlsdGVyOiBJbnQtPiBCb29sXG4gICovXG4gIGNvbnN0IGFyciA9IFtdXG4gIGZvciAobGV0IGkgPSBuOyBpIDwgbSArIDE7IGkrKykge1xuICAgIGlmIChmaWx0ZXIoaSkpIGFyci5wdXNoKGkpXG4gIH1cbiAgaWYgKGFyciA9PT0gW10pIHRocm93IG5ldyBFcnJvcignb3ZlcmZpbHRlcmVkJylcbiAgY29uc3QgaSA9IHJhbmRCZXR3ZWVuKDAsIGFyci5sZW5ndGggLSAxKVxuICByZXR1cm4gYXJyW2ldXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kTXVsdEJldHdlZW4gKG1pbiwgbWF4LCBuKSB7XG4gIC8vIHJldHVybiBhIHJhbmRvbSBtdWx0aXBsZSBvZiBuIGJldHdlZW4gbiBhbmQgbSAoaW5jbHVzaXZlIGlmIHBvc3NpYmxlKVxuICBtaW4gPSBNYXRoLmNlaWwobWluIC8gbikgKiBuXG4gIG1heCA9IE1hdGguZmxvb3IobWF4IC8gbikgKiBuIC8vIGNvdWxkIGNoZWNrIGRpdmlzaWJpbGl0eSBmaXJzdCB0byBtYXhpbWlzZSBwZXJmb3JtYWNlLCBidXQgSSdtIHN1cmUgdGhlIGhpdCBpc24ndCBiYWRcblxuICByZXR1cm4gcmFuZEJldHdlZW4obWluIC8gbiwgbWF4IC8gbikgKiBuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kRWxlbSAoYXJyYXksIGRpc3QpIHtcbiAgaWYgKFsuLi5hcnJheV0ubGVuZ3RoID09PSAwKSB0aHJvdyBuZXcgRXJyb3IoJ2VtcHR5IGFycmF5JylcbiAgaWYgKCFkaXN0KSBkaXN0ID0gTWF0aC5yYW5kb21cbiAgY29uc3QgbiA9IGFycmF5Lmxlbmd0aCB8fCBhcnJheS5zaXplXG4gIGNvbnN0IGkgPSByYW5kQmV0d2VlbigwLCBuIC0gMSwgZGlzdClcbiAgcmV0dXJuIFsuLi5hcnJheV1baV1cbn1cblxuLyogTWF0aHMgKi9cbmV4cG9ydCBmdW5jdGlvbiByb3VuZFRvVGVuIChuKSB7XG4gIHJldHVybiBNYXRoLnJvdW5kKG4gLyAxMCkgKiAxMFxufVxuXG5leHBvcnQgZnVuY3Rpb24gcm91bmREUCAoeCwgbikge1xuICByZXR1cm4gTWF0aC5yb3VuZCh4ICogTWF0aC5wb3coMTAsIG4pKSAvIE1hdGgucG93KDEwLCBuKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVnVG9SYWQgKHgpIHtcbiAgcmV0dXJuIHggKiBNYXRoLlBJIC8gMTgwXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaW5EZWcgKHgpIHtcbiAgcmV0dXJuIE1hdGguc2luKHggKiBNYXRoLlBJIC8gMTgwKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY29zRGVnICh4KSB7XG4gIHJldHVybiBNYXRoLmNvcyh4ICogTWF0aC5QSSAvIDE4MClcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNjYWxlZFN0ciAobiwgZHApIHtcbiAgLy8gcmV0dXJucyBhIHN0cmluZyByZXByZXNlbnRpbmcgbi8xMF5kcFxuICAvLyBlLmcuIHNjYWxlZFN0cigzNCwxKT1cIjMuNFwiXG4gIC8vIHNjYWxlZFN0cigzMTQsMik9XCIzLjE0XCJcbiAgLy8gc2NhbGVkU3RyKDMwLDEpPVwiM1wiXG4gIC8vIFRyeWluZyB0byBhdm9pZCBwcmVjaXNpb24gZXJyb3JzIVxuICBpZiAoZHAgPT09IDApIHJldHVybiBuXG4gIGNvbnN0IGZhY3RvciA9IE1hdGgucG93KDEwLCBkcClcbiAgY29uc3QgaW50cGFydCA9IE1hdGguZmxvb3IobiAvIGZhY3RvcilcbiAgY29uc3QgZGVjcGFydCA9IG4gJSBmYWN0b3JcbiAgaWYgKGRlY3BhcnQgPT09IDApIHtcbiAgICByZXR1cm4gaW50cGFydFxuICB9IGVsc2Uge1xuICAgIHJldHVybiBpbnRwYXJ0ICsgJy4nICsgZGVjcGFydFxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnY2QgKGEsIGIpIHtcbiAgLy8gdGFrZW4gZnJvbSBmcmFjdGlvbi5qc1xuICBpZiAoIWEpIHsgcmV0dXJuIGIgfVxuICBpZiAoIWIpIHsgcmV0dXJuIGEgfVxuXG4gIHdoaWxlICgxKSB7XG4gICAgYSAlPSBiXG4gICAgaWYgKCFhKSB7IHJldHVybiBiIH1cbiAgICBiICU9IGFcbiAgICBpZiAoIWIpIHsgcmV0dXJuIGEgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsY20gKGEsIGIpIHtcbiAgcmV0dXJuIGEgKiBiIC8gZ2NkKGEsIGIpXG59XG5cbi8qIEFycmF5cyBhbmQgc2ltaWxhciAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNvcnRUb2dldGhlciAoYXJyMCwgYXJyMSwgZikge1xuICBpZiAoYXJyMC5sZW5ndGggIT09IGFycjEubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm90aCBhcmd1bWVudHMgbXVzdCBiZSBhcnJheXMgb2YgdGhlIHNhbWUgbGVuZ3RoJylcbiAgfVxuXG4gIGNvbnN0IG4gPSBhcnIwLmxlbmd0aFxuICBjb25zdCBjb21iaW5lZCA9IFtdXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgY29tYmluZWRbaV0gPSBbYXJyMFtpXSwgYXJyMVtpXV1cbiAgfVxuXG4gIGNvbWJpbmVkLnNvcnQoKHgsIHkpID0+IGYoeFswXSwgeVswXSkpXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICBhcnIwW2ldID0gY29tYmluZWRbaV1bMF1cbiAgICBhcnIxW2ldID0gY29tYmluZWRbaV1bMV1cbiAgfVxuXG4gIHJldHVybiBbYXJyMCwgYXJyMV1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGUgKGFycmF5KSB7XG4gIC8vIEtudXRoLUZpc2hlci1ZYXRlc1xuICAvLyBmcm9tIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yNDUwOTc2LzM3MzcyOTVcbiAgLy8gbmIuIHNodWZmbGVzIGluIHBsYWNlXG4gIHZhciBjdXJyZW50SW5kZXggPSBhcnJheS5sZW5ndGg7IHZhciB0ZW1wb3JhcnlWYWx1ZTsgdmFyIHJhbmRvbUluZGV4XG5cbiAgLy8gV2hpbGUgdGhlcmUgcmVtYWluIGVsZW1lbnRzIHRvIHNodWZmbGUuLi5cbiAgd2hpbGUgKGN1cnJlbnRJbmRleCAhPT0gMCkge1xuICAgIC8vIFBpY2sgYSByZW1haW5pbmcgZWxlbWVudC4uLlxuICAgIHJhbmRvbUluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY3VycmVudEluZGV4KVxuICAgIGN1cnJlbnRJbmRleCAtPSAxXG5cbiAgICAvLyBBbmQgc3dhcCBpdCB3aXRoIHRoZSBjdXJyZW50IGVsZW1lbnQuXG4gICAgdGVtcG9yYXJ5VmFsdWUgPSBhcnJheVtjdXJyZW50SW5kZXhdXG4gICAgYXJyYXlbY3VycmVudEluZGV4XSA9IGFycmF5W3JhbmRvbUluZGV4XVxuICAgIGFycmF5W3JhbmRvbUluZGV4XSA9IHRlbXBvcmFyeVZhbHVlXG4gIH1cblxuICByZXR1cm4gYXJyYXlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdlYWtJbmNsdWRlcyAoYSwgZSkge1xuICByZXR1cm4gKEFycmF5LmlzQXJyYXkoYSkgJiYgYS5pbmNsdWRlcyhlKSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpcnN0VW5pcXVlSW5kZXggKGFycmF5KSB7XG4gIC8vIHJldHVybnMgaW5kZXggb2YgZmlyc3QgdW5pcXVlIGVsZW1lbnRcbiAgLy8gaWYgbm9uZSwgcmV0dXJucyBsZW5ndGggb2YgYXJyYXlcbiAgbGV0IGkgPSAwXG4gIHdoaWxlIChpIDwgYXJyYXkubGVuZ3RoKSB7XG4gICAgaWYgKGFycmF5LmluZGV4T2YoYXJyYXlbaV0pID09PSBhcnJheS5sYXN0SW5kZXhPZihhcnJheVtpXSkpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIGkrK1xuICB9XG4gIHJldHVybiBpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBib29sT2JqZWN0VG9BcnJheSAob2JqKSB7XG4gIC8vIEdpdmVuIGFuIG9iamVjdCB3aGVyZSBhbGwgdmFsdWVzIGFyZSBib29sZWFuLCByZXR1cm4ga2V5cyB3aGVyZSB0aGUgdmFsdWUgaXMgdHJ1ZVxuICBjb25zdCByZXN1bHQgPSBbXVxuICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHtcbiAgICBpZiAob2JqW2tleV0pIHJlc3VsdC5wdXNoKGtleSlcbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qIE9iamVjdCBwcm9wZXJ0eSBhY2Nlc3MgYnkgc3RyaW5nICovXG5leHBvcnQgZnVuY3Rpb24gcHJvcEJ5U3RyaW5nIChvLCBzLCB4KSB7XG4gIC8qIEUuZy4gYnlTdHJpbmcobXlPYmosXCJmb28uYmFyXCIpIC0+IG15T2JqLmZvby5iYXJcbiAgICAgKiBieVN0cmluZyhteU9iaixcImZvby5iYXJcIixcImJhelwiKSAtPiBteU9iai5mb28uYmFyID0gXCJiYXpcIlxuICAgICAqL1xuICBzID0gcy5yZXBsYWNlKC9cXFsoXFx3KylcXF0vZywgJy4kMScpIC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gIHMgPSBzLnJlcGxhY2UoL15cXC4vLCAnJykgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICB2YXIgYSA9IHMuc3BsaXQoJy4nKVxuICBmb3IgKHZhciBpID0gMCwgbiA9IGEubGVuZ3RoIC0gMTsgaSA8IG47ICsraSkge1xuICAgIHZhciBrID0gYVtpXVxuICAgIGlmIChrIGluIG8pIHtcbiAgICAgIG8gPSBvW2tdXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgfVxuICBpZiAoeCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gb1thW25dXVxuICBlbHNlIG9bYVtuXV0gPSB4XG59XG5cbi8qIExvZ2ljICovXG5leHBvcnQgZnVuY3Rpb24gbUlmIChwLCBxKSB7IC8vIG1hdGVyaWFsIGNvbmRpdGlvbmFsXG4gIHJldHVybiAoIXAgfHwgcSlcbn1cblxuLyogRE9NIG1hbmlwdWxhdGlvbiBhbmQgcXVlcnlpbmcgKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbGVtICh0YWdOYW1lLCBjbGFzc05hbWUsIHBhcmVudCkge1xuICAvLyBjcmVhdGUsIHNldCBjbGFzcyBhbmQgYXBwZW5kIGluIG9uZVxuICBjb25zdCBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKVxuICBpZiAoY2xhc3NOYW1lKSBlbGVtLmNsYXNzTmFtZSA9IGNsYXNzTmFtZVxuICBpZiAocGFyZW50KSBwYXJlbnQuYXBwZW5kQ2hpbGQoZWxlbSlcbiAgcmV0dXJuIGVsZW1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc0FuY2VzdG9yQ2xhc3MgKGVsZW0sIGNsYXNzTmFtZSkge1xuICAvLyBjaGVjayBpZiBhbiBlbGVtZW50IGVsZW0gb3IgYW55IG9mIGl0cyBhbmNlc3RvcnMgaGFzIGNsc3NcbiAgbGV0IHJlc3VsdCA9IGZhbHNlXG4gIGZvciAoO2VsZW0gJiYgZWxlbSAhPT0gZG9jdW1lbnQ7IGVsZW0gPSBlbGVtLnBhcmVudE5vZGUpIHsgLy8gdHJhdmVyc2UgRE9NIHVwd2FyZHNcbiAgICBpZiAoZWxlbS5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKSkge1xuICAgICAgcmVzdWx0ID0gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qIENhbnZhcyBkcmF3aW5nICovXG5leHBvcnQgZnVuY3Rpb24gZGFzaGVkTGluZSAoY3R4LCB4MSwgeTEsIHgyLCB5Mikge1xuICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHgyIC0geDEsIHkyIC0geTEpXG4gIGNvbnN0IGRhc2h4ID0gKHkxIC0geTIpIC8gbGVuZ3RoIC8vIHVuaXQgdmVjdG9yIHBlcnBlbmRpY3VsYXIgdG8gbGluZVxuICBjb25zdCBkYXNoeSA9ICh4MiAtIHgxKSAvIGxlbmd0aFxuICBjb25zdCBtaWR4ID0gKHgxICsgeDIpIC8gMlxuICBjb25zdCBtaWR5ID0gKHkxICsgeTIpIC8gMlxuXG4gIC8vIGRyYXcgdGhlIGJhc2UgbGluZVxuICBjdHgubW92ZVRvKHgxLCB5MSlcbiAgY3R4LmxpbmVUbyh4MiwgeTIpXG5cbiAgLy8gZHJhdyB0aGUgZGFzaFxuICBjdHgubW92ZVRvKG1pZHggKyA1ICogZGFzaHgsIG1pZHkgKyA1ICogZGFzaHkpXG4gIGN0eC5saW5lVG8obWlkeCAtIDUgKiBkYXNoeCwgbWlkeSAtIDUgKiBkYXNoeSlcblxuICBjdHgubW92ZVRvKHgyLCB5Milcbn1cbiIsImltcG9ydCB7IGNyZWF0ZUVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE9wdGlvbnNTZXQge1xuICBjb25zdHJ1Y3RvciAob3B0aW9uU3BlYywgdGVtcGxhdGUpIHtcbiAgICB0aGlzLm9wdGlvblNwZWMgPSBvcHRpb25TcGVjXG5cbiAgICB0aGlzLm9wdGlvbnMgPSB7fVxuICAgIHRoaXMub3B0aW9uU3BlYy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICBpZiAob3B0aW9uLnR5cGUgIT09ICdoZWFkaW5nJyAmJiBvcHRpb24udHlwZSAhPT0gJ2NvbHVtbi1icmVhaycpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbi5pZF0gPSBvcHRpb24uZGVmYXVsdFxuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGUgLy8gaHRtbCB0ZW1wbGF0ZSAob3B0aW9uYWwpXG5cbiAgICAvLyBzZXQgYW4gaWQgYmFzZWQgb24gYSBjb3VudGVyIC0gdXNlZCBmb3IgbmFtZXMgb2YgZm9ybSBlbGVtZW50c1xuICAgIHRoaXMuZ2xvYmFsSWQgPSBPcHRpb25zU2V0LmdldElkKClcbiAgfVxuXG4gIHVwZGF0ZVN0YXRlRnJvbVVJIChvcHRpb24pIHtcbiAgICAvLyBpbnB1dCAtIGVpdGhlciBhbiBlbGVtZW50IG9mIHRoaXMub3B0aW9uc1NwZWMgb3IgYW4gb3B0aW9uIGlkXG4gICAgaWYgKHR5cGVvZiAob3B0aW9uKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIG9wdGlvbiA9IHRoaXMub3B0aW9uc1NwZWMuZmluZCh4ID0+IHguaWQgPT09IG9wdGlvbilcbiAgICAgIGlmICghb3B0aW9uKSB0aHJvdyBuZXcgRXJyb3IoYG5vIG9wdGlvbiB3aXRoIGlkICcke29wdGlvbn0nYClcbiAgICB9XG4gICAgaWYgKCFvcHRpb24uZWxlbWVudCkgdGhyb3cgbmV3IEVycm9yKGBvcHRpb24gJHtvcHRpb24uaWR9IGRvZXNuJ3QgaGF2ZSBhIFVJIGVsZW1lbnRgKVxuXG4gICAgc3dpdGNoIChvcHRpb24udHlwZSkge1xuICAgICAgY2FzZSAnaW50Jzoge1xuICAgICAgICBjb25zdCBpbnB1dCA9IG9wdGlvbi5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpWzBdXG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gTnVtYmVyKGlucHV0LnZhbHVlKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAnYm9vbCc6IHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSBvcHRpb24uZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKVswXVxuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9IGlucHV0LmNoZWNrZWRcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NlbGVjdC1leGNsdXNpdmUnOiB7XG4gICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb24uaWRdID0gb3B0aW9uLmVsZW1lbnQucXVlcnlTZWxlY3RvcignaW5wdXQ6Y2hlY2tlZCcpLnZhbHVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlICdzZWxlY3QtaW5jbHVzaXZlJzoge1xuICAgICAgICB0aGlzLm9wdGlvbnNbb3B0aW9uLmlkXSA9XG4gICAgICAgICAgQXJyYXkuZnJvbShvcHRpb24uZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dDpjaGVja2VkJyksIHggPT4geC52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgb3B0aW9uIHdpdGggaWQgJHtvcHRpb24uaWR9IGhhcyB1bnJlY29nbmlzZWQgb3B0aW9uIHR5cGUgJHtvcHRpb24udHlwZX1gKVxuICAgIH1cbiAgICAvLyBjb25zb2xlLmxvZyh0aGlzLm9wdGlvbnMpXG4gIH1cblxuICByZW5kZXJJbiAoZWxlbWVudCkge1xuICAgIGNvbnN0IGxpc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd1bCcpXG4gICAgbGlzdC5jbGFzc0xpc3QuYWRkKCdvcHRpb25zLWxpc3QnKVxuXG4gICAgdGhpcy5vcHRpb25TcGVjLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgIC8vIE1ha2UgbGlzdCBpdGVtIC0gY29tbW9uIHRvIGFsbCB0eXBlc1xuICAgICAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpXG4gICAgICBsaS5kYXRhc2V0Lm9wdGlvbklkID0gb3B0aW9uLmlkXG4gICAgICBsaXN0LmFwcGVuZChsaSlcblxuICAgICAgLy8gbWFrZSBpbnB1dCBlbGVtZW50cyAtIGRlcGVuZHMgb24gb3B0aW9uIHR5cGVcbiAgICAgIGlmIChvcHRpb24udHlwZSA9PT0gJ2NvbHVtbi1icmVhaycpIHtcbiAgICAgICAgbGkuY2xhc3NMaXN0LmFkZCgnY29sdW1uLWJyZWFrJylcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9uLnR5cGUgPT09ICdoZWFkaW5nJykge1xuICAgICAgICBsaS5hcHBlbmQob3B0aW9uLnRpdGxlKVxuICAgICAgICBsaS5jbGFzc0xpc3QuYWRkKCdvcHRpb25zLWhlYWRpbmcnKVxuICAgICAgfSBlbHNlIGlmIChvcHRpb24udHlwZSA9PT0gJ2ludCcgfHwgb3B0aW9uLnR5cGUgPT09ICdib29sJykge1xuICAgICAgICAvLyBzaW5nbGUgaW5wdXQgb3B0aW9uc1xuICAgICAgICBjb25zdCBsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJylcbiAgICAgICAgbGkuYXBwZW5kKGxhYmVsKVxuXG4gICAgICAgIGlmICghb3B0aW9uLnN3YXBMYWJlbCkgbGFiZWwuYXBwZW5kKG9wdGlvbi50aXRsZSArICc6ICcpXG5cbiAgICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpXG4gICAgICAgIHN3aXRjaCAob3B0aW9uLnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdpbnQnOlxuICAgICAgICAgICAgaW5wdXQudHlwZSA9ICdudW1iZXInXG4gICAgICAgICAgICBpbnB1dC5taW4gPSBvcHRpb24ubWluXG4gICAgICAgICAgICBpbnB1dC5tYXggPSBvcHRpb24ubWF4XG4gICAgICAgICAgICBpbnB1dC52YWx1ZSA9IG9wdGlvbi5kZWZhdWx0XG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ2Jvb2wnOlxuICAgICAgICAgICAgaW5wdXQudHlwZSA9ICdjaGVja2JveCdcbiAgICAgICAgICAgIGlucHV0LmNoZWNrZWQgPSBvcHRpb24uZGVmYXVsdFxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIG9wdGlvbiB0eXBlICR7b3B0aW9uLnR5cGV9YClcbiAgICAgICAgfVxuICAgICAgICBpbnB1dC5jbGFzc0xpc3QuYWRkKCdvcHRpb24nKVxuICAgICAgICBsYWJlbC5hcHBlbmQoaW5wdXQpXG5cbiAgICAgICAgaWYgKG9wdGlvbi5zd2FwTGFiZWwpIGxhYmVsLmFwcGVuZCgnICcgKyBvcHRpb24udGl0bGUpXG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbi50eXBlID09PSAnc2VsZWN0LWluY2x1c2l2ZScgfHwgb3B0aW9uLnR5cGUgPT09ICdzZWxlY3QtZXhjbHVzaXZlJykge1xuICAgICAgICAvLyBtdWx0aXBsZSBpbnB1dCBvcHRpb25zXG4gICAgICAgIC8vIFRPRE86IHN3YXAgbGFiZWwgKGEgYml0IG9kZCBoZXJlIHRob3VnaClcbiAgICAgICAgbGkuYXBwZW5kKG9wdGlvbi50aXRsZSArICc6ICcpXG5cbiAgICAgICAgY29uc3Qgc3VibGlzdCA9IGNyZWF0ZUVsZW0oJ3VsJywgJ29wdGlvbnMtc3VibGlzdCcsIGxpKVxuICAgICAgICBpZiAob3B0aW9uLnZlcnRpY2FsKSBzdWJsaXN0LmNsYXNzTGlzdC5hZGQoJ29wdGlvbnMtc3VibGlzdC12ZXJ0aWNhbCcpXG5cbiAgICAgICAgb3B0aW9uLnNlbGVjdE9wdGlvbnMuZm9yRWFjaChzZWxlY3RPcHRpb24gPT4ge1xuICAgICAgICAgIGNvbnN0IHN1Ymxpc3RMaSA9IGNyZWF0ZUVsZW0oJ2xpJywgbnVsbCwgc3VibGlzdClcbiAgICAgICAgICBjb25zdCBsYWJlbCA9IGNyZWF0ZUVsZW0oJ2xhYmVsJywgbnVsbCwgc3VibGlzdExpKVxuXG4gICAgICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpXG4gICAgICAgICAgaW5wdXQudHlwZSA9IG9wdGlvbi50eXBlID09PSAnc2VsZWN0LWV4Y2x1c2l2ZScgPyAncmFkaW8nIDogJ2NoZWNrYm94J1xuICAgICAgICAgIGlucHV0Lm5hbWUgPSB0aGlzLmdsb2JhbElkICsgJy0nICsgb3B0aW9uLmlkXG4gICAgICAgICAgaW5wdXQudmFsdWUgPSBzZWxlY3RPcHRpb24uaWRcblxuICAgICAgICAgIGlmIChvcHRpb24udHlwZSA9PT0gJ3NlbGVjdC1pbmNsdXNpdmUnKSB7IC8vIGRlZmF1bHRzIHdvcmsgZGlmZmVyZW50IGZvciBpbmNsdXNpdmUvZXhjbHVzaXZlXG4gICAgICAgICAgICBpbnB1dC5jaGVja2VkID0gb3B0aW9uLmRlZmF1bHQuaW5jbHVkZXMoc2VsZWN0T3B0aW9uLmlkKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbnB1dC5jaGVja2VkID0gb3B0aW9uLmRlZmF1bHQgPT09IHNlbGVjdE9wdGlvbi5pZFxuICAgICAgICAgIH1cblxuICAgICAgICAgIGxhYmVsLmFwcGVuZChpbnB1dClcblxuICAgICAgICAgIGlucHV0LmNsYXNzTGlzdC5hZGQoJ29wdGlvbicpXG5cbiAgICAgICAgICBsYWJlbC5hcHBlbmQoc2VsZWN0T3B0aW9uLnRpdGxlKVxuICAgICAgICB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIG9wdGlvbiB0eXBlICcke29wdGlvbi50eXBlfSdgKVxuICAgICAgfVxuXG4gICAgICBsaS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBlID0+IHRoaXMudXBkYXRlU3RhdGVGcm9tVUkob3B0aW9uKSlcbiAgICAgIG9wdGlvbi5lbGVtZW50ID0gbGlcbiAgICB9KVxuXG4gICAgZWxlbWVudC5hcHBlbmQobGlzdClcbiAgfVxuXG4gIC8vIFRPRE86IHVwZGF0ZVVJRnJvbVN0YXRlKG9wdGlvbikge31cbn1cblxuT3B0aW9uc1NldC5pZENvdW50ZXIgPSAwIC8vIGluY3JlbWVudCBlYWNoIHRpbWUgdG8gY3JlYXRlIHVuaXF1ZSBpZHMgdG8gdXNlIGluIGlkcy9uYW1lcyBvZiBlbGVtZW50c1xuXG5PcHRpb25zU2V0LmdldElkID0gZnVuY3Rpb24gKCkge1xuICBpZiAoT3B0aW9uc1NldC5pZENvdW50ZXIgPj0gMjYgKiogMikgdGhyb3cgbmV3IEVycm9yKCdUb28gbWFueSBvcHRpb25zIG9iamVjdHMhJylcbiAgY29uc3QgaWQgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKH5+KE9wdGlvbnNTZXQuaWRDb3VudGVyIC8gMjYpICsgOTcpICtcbiAgICAgICAgICAgU3RyaW5nLmZyb21DaGFyQ29kZShPcHRpb25zU2V0LmlkQ291bnRlciAlIDI2ICsgOTcpXG5cbiAgT3B0aW9uc1NldC5pZENvdW50ZXIgKz0gMVxuXG4gIHJldHVybiBpZFxufVxuXG5PcHRpb25zU2V0LmRlbW9TcGVjID0gW1xuICB7XG4gICAgdGl0bGU6ICdEaWZmaWN1bHR5JyxcbiAgICBpZDogJ2RpZmZpY3VsdHknLFxuICAgIHR5cGU6ICdpbnQnLFxuICAgIG1pbjogMSxcbiAgICBtYXg6IDEwLFxuICAgIGRlZmF1bHQ6IDVcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVHlwZScsXG4gICAgaWQ6ICd0eXBlJyxcbiAgICB0eXBlOiAnc2VsZWN0LWV4Y2x1c2l2ZScsXG4gICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgeyB0aXRsZTogJ1JlY3RhbmdsZScsIGlkOiAncmVjdGFuZ2xlJyB9LFxuICAgICAgeyB0aXRsZTogJ1RyaWFuZ2xlJywgaWQ6ICd0cmlhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdTcXVvdmFsJywgaWQ6ICdzcXVvdmFsJyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiAncmVjdGFuZ2xlJ1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdBIGhlYWRpbmcnLFxuICAgIHR5cGU6ICdoZWFkaW5nJ1xuICB9LFxuICB7XG4gICAgdGl0bGU6ICdTaGFwZScsXG4gICAgaWQ6ICdzaGFwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1pbmNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdSZWN0YW5nbGUgc2hhcGUgdGhpbmcnLCBpZDogJ3JlY3RhbmdsZScgfSxcbiAgICAgIHsgdGl0bGU6ICdUcmlhbmdsZSBzaGFwZSB0aGluZycsIGlkOiAndHJpYW5nbGUnIH0sXG4gICAgICB7IHRpdGxlOiAnU3F1b3ZhbCBzaGFwZSBsb25nJywgaWQ6ICdzcXVvdmFsJyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiBbJ3JlY3RhbmdsZScsICdzcXVvdmFsJ10sXG4gICAgdmVydGljYWw6IHRydWUgLy8gbGF5b3V0IHZlcnRpY2FsbHksIHJhdGhlciB0aGFuIGhvcml6b250YWxseVxuICB9LFxuICB7XG4gICAgdHlwZTogJ2NvbHVtbi1icmVhaydcbiAgfSxcbiAge1xuICAgIHR5cGU6ICdoZWFkaW5nJyxcbiAgICB0aXRsZTogJ0EgbmV3IGNvbHVtbidcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnRG8gc29tZXRoaW5nJyxcbiAgICBpZDogJ3NvbWV0aGluZycsXG4gICAgdHlwZTogJ2Jvb2wnLFxuICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgc3dhcExhYmVsOiB0cnVlIC8vIHB1dCBjb250cm9sIGJlZm9yZSBsYWJlbFxuICB9XG5dXG4iLCJleHBvcnQgZGVmYXVsdCBhYnN0cmFjdCBjbGFzcyBRdWVzdGlvbiB7XG4gIERPTTogSFRNTEVsZW1lbnRcbiAgYW5zd2VyZWQ6IGJvb2xlYW5cblxuICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgdGhpcy5ET00gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgIHRoaXMuRE9NLmNsYXNzTmFtZSA9ICdxdWVzdGlvbi1kaXYnXG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gIH1cblxuICBnZXRET00gKCkgOiBIVE1MRWxlbWVudCB7XG4gICAgcmV0dXJuIHRoaXMuRE9NXG4gIH1cblxuICBhYnN0cmFjdCByZW5kZXIgKCkgOiB2b2lkXG5cbiAgc2hvd0Fuc3dlciAoKSA6IHZvaWQge1xuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gIH1cblxuICB0b2dnbGVBbnN3ZXIgKCkgOiB2b2lkIHtcbiAgICBpZiAodGhpcy5hbnN3ZXJlZCkge1xuICAgICAgdGhpcy5oaWRlQW5zd2VyKClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaG93QW5zd2VyKClcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHsgLy8gU2hvdWxkIGJlIG92ZXJyaWRkZW5cbiAgICByZXR1cm4gJydcbiAgfVxufVxuIiwiLyogZ2xvYmFsIGthdGV4ICovXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRleHRRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIHN1cGVyKClcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogNSxcbiAgICAgIGxhYmVsOiAnYSdcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIC8vIHN0b3JlIHRoZSBsYWJlbCBmb3IgZnV0dXJlIHJlbmRlcmluZ1xuICAgIHRoaXMubGFiZWwgPSBzZXR0aW5ncy5sYWJlbFxuXG4gICAgLy8gRHVtbXkgcXVlc3Rpb24gZ2VuZXJhdGluZyAtIHN1YmNsYXNzZXMgZG8gc29tZXRoaW5nIHN1YnN0YW50aWFsIGhlcmVcbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnMisyJ1xuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPTUnXG5cbiAgICAvLyBNYWtlIHRoZSBET00gdHJlZSBmb3IgdGhlIGVsZW1lbnRcbiAgICB0aGlzLnF1ZXN0aW9ucCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKVxuICAgIHRoaXMuYW5zd2VycCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKVxuXG4gICAgdGhpcy5xdWVzdGlvbnAuY2xhc3NOYW1lID0gJ3F1ZXN0aW9uJ1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc05hbWUgPSAnYW5zd2VyJ1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuXG4gICAgdGhpcy5ET00uYXBwZW5kQ2hpbGQodGhpcy5xdWVzdGlvbnApXG4gICAgdGhpcy5ET00uYXBwZW5kQ2hpbGQodGhpcy5hbnN3ZXJwKVxuXG4gICAgLy8gc3ViY2xhc3NlcyBzaG91bGQgZ2VuZXJhdGUgcXVlc3Rpb25MYVRlWCBhbmQgYW5zd2VyTGFUZVgsXG4gICAgLy8gLnJlbmRlcigpIHdpbGwgYmUgY2FsbGVkIGJ5IHVzZXJcbiAgfVxuXG4gIHJlbmRlciAoKSB7XG4gICAgLy8gdXBkYXRlIHRoZSBET00gaXRlbSB3aXRoIHF1ZXN0aW9uTGFUZVggYW5kIGFuc3dlckxhVGVYXG4gICAgdmFyIHFudW0gPSB0aGlzLmxhYmVsXG4gICAgICA/ICdcXFxcdGV4dHsnICsgdGhpcy5sYWJlbCArICcpIH0nXG4gICAgICA6ICcnXG4gICAga2F0ZXgucmVuZGVyKHFudW0gKyB0aGlzLnF1ZXN0aW9uTGFUZVgsIHRoaXMucXVlc3Rpb25wLCB7IGRpc3BsYXlNb2RlOiB0cnVlLCBzdHJpY3Q6ICdpZ25vcmUnIH0pXG4gICAga2F0ZXgucmVuZGVyKHRoaXMuYW5zd2VyTGFUZVgsIHRoaXMuYW5zd2VycCwgeyBkaXNwbGF5TW9kZTogdHJ1ZSB9KVxuICB9XG5cbiAgZ2V0RE9NICgpIHtcbiAgICByZXR1cm4gdGhpcy5ET01cbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkge1xuICAgIHRoaXMuYW5zd2VycC5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKVxuICAgIHRoaXMuYW5zd2VyZWQgPSB0cnVlXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIHtcbiAgICB0aGlzLmFuc3dlcnAuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2VcbiAgfVxufVxuIiwiaW1wb3J0IHsgcmFuZEJldHdlZW4sIGdjZCB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcblxuLyogTWFpbiBxdWVzdGlvbiBjbGFzcy4gVGhpcyB3aWxsIGJlIHNwdW4gb2ZmIGludG8gZGlmZmVyZW50IGZpbGUgYW5kIGdlbmVyYWxpc2VkICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBbGdlYnJhaWNGcmFjdGlvblEgZXh0ZW5kcyBUZXh0USB7XG4gIC8vICdleHRlbmRzJyBRdWVzdGlvbiwgYnV0IG5vdGhpbmcgdG8gYWN0dWFsbHkgZXh0ZW5kXG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgZGlmZmljdWx0eTogMlxuICAgIH1cblxuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpXG4gICAgY29uc3QgZGlmZmljdWx0eSA9IHNldHRpbmdzLmRpZmZpY3VsdHlcblxuICAgIC8vIGxvZ2ljIGZvciBnZW5lcmF0aW5nIHRoZSBxdWVzdGlvbiBhbmQgYW5zd2VyIHN0YXJ0cyBoZXJlXG4gICAgdmFyIGEsIGIsIGMsIGQsIGUsIGYgLy8gKGF4K2IpKGV4K2YpLyhjeCtkKShleCtmKSA9IChweF4yK3F4K3IpLyh0eF4yK3V4K3YpXG4gICAgdmFyIHAsIHEsIHIsIHQsIHUsIHZcbiAgICB2YXIgbWluQ29lZmYsIG1heENvZWZmLCBtaW5Db25zdCwgbWF4Q29uc3RcblxuICAgIHN3aXRjaCAoZGlmZmljdWx0eSkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMTsgbWluQ29uc3QgPSAxOyBtYXhDb25zdCA9IDZcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgbWluQ29lZmYgPSAxOyBtYXhDb2VmZiA9IDE7IG1pbkNvbnN0ID0gLTY7IG1heENvbnN0ID0gNlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAzOlxuICAgICAgICBtaW5Db2VmZiA9IDE7IG1heENvZWZmID0gMzsgbWluQ29uc3QgPSAtNTsgbWF4Q29uc3QgPSA1XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDQ6XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBtaW5Db2VmZiA9IC0zOyBtYXhDb2VmZiA9IDM7IG1pbkNvbnN0ID0gLTU7IG1heENvbnN0ID0gNVxuICAgICAgICBicmVha1xuICAgIH1cblxuICAgIC8vIFBpY2sgc29tZSBjb2VmZmljaWVudHNcbiAgICB3aGlsZSAoXG4gICAgICAoKCFhICYmICFiKSB8fCAoIWMgJiYgIWQpIHx8ICghZSAmJiAhZikpIHx8IC8vIHJldHJ5IGlmIGFueSBleHByZXNzaW9uIGlzIDBcbiAgICAgIGNhblNpbXBsaWZ5KGEsIGIsIGMsIGQpIC8vIHJldHJ5IGlmIHRoZXJlJ3MgYSBjb21tb24gbnVtZXJpY2FsIGZhY3RvclxuICAgICkge1xuICAgICAgYSA9IHJhbmRCZXR3ZWVuKG1pbkNvZWZmLCBtYXhDb2VmZilcbiAgICAgIGMgPSByYW5kQmV0d2VlbihtaW5Db2VmZiwgbWF4Q29lZmYpXG4gICAgICBlID0gcmFuZEJldHdlZW4obWluQ29lZmYsIG1heENvZWZmKVxuICAgICAgYiA9IHJhbmRCZXR3ZWVuKG1pbkNvbnN0LCBtYXhDb25zdClcbiAgICAgIGQgPSByYW5kQmV0d2VlbihtaW5Db25zdCwgbWF4Q29uc3QpXG4gICAgICBmID0gcmFuZEJldHdlZW4obWluQ29uc3QsIG1heENvbnN0KVxuICAgIH1cblxuICAgIC8vIGlmIHRoZSBkZW5vbWluYXRvciBpcyBuZWdhdGl2ZSBmb3IgZWFjaCB0ZXJtLCB0aGVuIG1ha2UgdGhlIG51bWVyYXRvciBuZWdhdGl2ZSBpbnN0ZWFkXG4gICAgaWYgKGMgPD0gMCAmJiBkIDw9IDApIHtcbiAgICAgIGMgPSAtY1xuICAgICAgZCA9IC1kXG4gICAgICBhID0gLWFcbiAgICAgIGIgPSAtYlxuICAgIH1cblxuICAgIHAgPSBhICogZTsgcSA9IGEgKiBmICsgYiAqIGU7IHIgPSBiICogZlxuICAgIHQgPSBjICogZTsgdSA9IGMgKiBmICsgZCAqIGU7IHYgPSBkICogZlxuXG4gICAgLy8gTm93IHB1dCB0aGUgcXVlc3Rpb24gYW5kIGFuc3dlciBpbiBhIG5pY2UgZm9ybWF0IGludG8gcXVlc3Rpb25MYVRlWCBhbmQgYW5zd2VyTGFUZVhcbiAgICBjb25zdCBxdWVzdGlvbiA9IGBcXFxcZnJhY3ske3F1YWRyYXRpY1N0cmluZyhwLCBxLCByKX19eyR7cXVhZHJhdGljU3RyaW5nKHQsIHUsIHYpfX1gXG4gICAgaWYgKHNldHRpbmdzLnVzZUNvbW1hbmRXb3JkKSB7XG4gICAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnXFxcXHRleHR7U2ltcGxpZnl9ICcgKyBxdWVzdGlvblxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSBxdWVzdGlvblxuICAgIH1cbiAgICB0aGlzLmFuc3dlckxhVGVYID1cbiAgICAgIChjID09PSAwICYmIGQgPT09IDEpID8gcXVhZHJhdGljU3RyaW5nKDAsIGEsIGIpXG4gICAgICAgIDogYFxcXFxmcmFjeyR7cXVhZHJhdGljU3RyaW5nKDAsIGEsIGIpfX17JHtxdWFkcmF0aWNTdHJpbmcoMCwgYywgZCl9fWBcblxuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPSAnICsgdGhpcy5hbnN3ZXJMYVRlWFxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdTaW1wbGlmeSdcbiAgfVxufVxuXG4vKiBVdGlsaXR5IGZ1bmN0aW9uc1xuICogQXQgc29tZSBwb2ludCwgSSdsbCBtb3ZlIHNvbWUgb2YgdGhlc2UgaW50byBhIGdlbmVyYWwgdXRpbGl0aWVzIG1vZHVsZVxuICogYnV0IHRoaXMgd2lsbCBkbyBmb3Igbm93XG4gKi9cblxuLy8gVE9ETyBJIGhhdmUgcXVhZHJhdGljU3RyaW5nIGhlcmUgYW5kIGFsc28gYSBQb2x5bm9taWFsIGNsYXNzLiBXaGF0IGlzIGJlaW5nIHJlcGxpY2F0ZWQ/wqdcbmZ1bmN0aW9uIHF1YWRyYXRpY1N0cmluZyAoYSwgYiwgYykge1xuICBpZiAoYSA9PT0gMCAmJiBiID09PSAwICYmIGMgPT09IDApIHJldHVybiAnMCdcblxuICB2YXIgeDJzdHJpbmcgPVxuICAgIGEgPT09IDAgPyAnJ1xuICAgICAgOiBhID09PSAxID8gJ3heMidcbiAgICAgICAgOiBhID09PSAtMSA/ICcteF4yJ1xuICAgICAgICAgIDogYSArICd4XjInXG5cbiAgdmFyIHhzaWduID1cbiAgICBiIDwgMCA/ICctJ1xuICAgICAgOiAoYSA9PT0gMCB8fCBiID09PSAwKSA/ICcnXG4gICAgICAgIDogJysnXG5cbiAgdmFyIHhzdHJpbmcgPVxuICAgIGIgPT09IDAgPyAnJ1xuICAgICAgOiAoYiA9PT0gMSB8fCBiID09PSAtMSkgPyAneCdcbiAgICAgICAgOiBNYXRoLmFicyhiKSArICd4J1xuXG4gIHZhciBjb25zdHNpZ24gPVxuICAgIGMgPCAwID8gJy0nXG4gICAgICA6ICgoYSA9PT0gMCAmJiBiID09PSAwKSB8fCBjID09PSAwKSA/ICcnXG4gICAgICAgIDogJysnXG5cbiAgdmFyIGNvbnN0c3RyaW5nID1cbiAgICBjID09PSAwID8gJycgOiBNYXRoLmFicyhjKVxuXG4gIHJldHVybiB4MnN0cmluZyArIHhzaWduICsgeHN0cmluZyArIGNvbnN0c2lnbiArIGNvbnN0c3RyaW5nXG59XG5cbmZ1bmN0aW9uIGNhblNpbXBsaWZ5IChhMSwgYjEsIGEyLCBiMikge1xuICAvLyBjYW4gKGExeCtiMSkvKGEyeCtiMikgYmUgc2ltcGxpZmllZD9cbiAgLy9cbiAgLy8gRmlyc3QsIHRha2Ugb3V0IGdjZCwgYW5kIHdyaXRlIGFzIGMxKGExeCtiMSkgZXRjXG5cbiAgdmFyIGMxID0gZ2NkKGExLCBiMSlcbiAgYTEgPSBhMSAvIGMxXG4gIGIxID0gYjEgLyBjMVxuXG4gIHZhciBjMiA9IGdjZChhMiwgYjIpXG4gIGEyID0gYTIgLyBjMlxuICBiMiA9IGIyIC8gYzJcblxuICB2YXIgcmVzdWx0ID0gZmFsc2VcblxuICBpZiAoZ2NkKGMxLCBjMikgPiAxIHx8IChhMSA9PT0gYTIgJiYgYjEgPT09IGIyKSkge1xuICAgIHJlc3VsdCA9IHRydWVcbiAgfVxuXG4gIHJldHVybiByZXN1bHRcbn1cbiIsImltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCB7IHJhbmRCZXR3ZWVuIH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJbnRlZ2VyQWRkUSBleHRlbmRzIFRleHRRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiA1LFxuICAgICAgbGFiZWw6ICdhJ1xuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyBUaGlzIGlzIGp1c3QgYSBkZW1vIHF1ZXN0aW9uIHR5cGUgZm9yIG5vdywgc28gbm90IHByb2Nlc3NpbmcgZGlmZmljdWx0eVxuICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbigxMCwgMTAwMClcbiAgICBjb25zdCBiID0gcmFuZEJldHdlZW4oMTAsIDEwMDApXG4gICAgY29uc3Qgc3VtID0gYSArIGJcblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9IGEgKyAnICsgJyArIGJcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJz0gJyArIHN1bVxuXG4gICAgdGhpcy5yZW5kZXIoKVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdFdmFsdWF0ZSdcbiAgfVxufVxuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgUG9pbnQge1xuICBjb25zdHJ1Y3RvciAoeCwgeSkge1xuICAgIHRoaXMueCA9IHhcbiAgICB0aGlzLnkgPSB5XG4gIH1cblxuICByb3RhdGUgKGFuZ2xlKSB7XG4gICAgdmFyIG5ld3gsIG5ld3lcbiAgICBuZXd4ID0gTWF0aC5jb3MoYW5nbGUpICogdGhpcy54IC0gTWF0aC5zaW4oYW5nbGUpICogdGhpcy55XG4gICAgbmV3eSA9IE1hdGguc2luKGFuZ2xlKSAqIHRoaXMueCArIE1hdGguY29zKGFuZ2xlKSAqIHRoaXMueVxuICAgIHRoaXMueCA9IG5ld3hcbiAgICB0aGlzLnkgPSBuZXd5XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHNjYWxlIChzZikge1xuICAgIHRoaXMueCA9IHRoaXMueCAqIHNmXG4gICAgdGhpcy55ID0gdGhpcy55ICogc2ZcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgdHJhbnNsYXRlICh4LCB5KSB7XG4gICAgdGhpcy54ICs9IHhcbiAgICB0aGlzLnkgKz0geVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBjbG9uZSAoKSB7XG4gICAgcmV0dXJuIG5ldyBQb2ludCh0aGlzLngsIHRoaXMueSlcbiAgfVxuXG4gIGVxdWFscyAodGhhdCkge1xuICAgIHJldHVybiAodGhpcy54ID09PSB0aGF0LnggJiYgdGhpcy55ID09PSB0aGF0LnkpXG4gIH1cblxuICBtb3ZlVG93YXJkICh0aGF0LCBkKSB7XG4gICAgLy8gbW92ZXMgW2RdIGluIHRoZSBkaXJlY3Rpb24gb2YgW3RoYXQ6OlBvaW50XVxuICAgIGNvbnN0IHV2ZWMgPSBQb2ludC51bml0VmVjdG9yKHRoaXMsIHRoYXQpXG4gICAgdGhpcy50cmFuc2xhdGUodXZlYy54ICogZCwgdXZlYy55ICogZClcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3RhdGljIGZyb21Qb2xhciAociwgdGhldGEpIHtcbiAgICByZXR1cm4gbmV3IFBvaW50KFxuICAgICAgTWF0aC5jb3ModGhldGEpICogcixcbiAgICAgIE1hdGguc2luKHRoZXRhKSAqIHJcbiAgICApXG4gIH1cblxuICBzdGF0aWMgZnJvbVBvbGFyRGVnIChyLCB0aGV0YSkge1xuICAgIHRoZXRhID0gdGhldGEgKiBNYXRoLlBJIC8gMTgwXG4gICAgcmV0dXJuIFBvaW50LmZyb21Qb2xhcihyLCB0aGV0YSlcbiAgfVxuXG4gIHN0YXRpYyBtZWFuICguLi5wb2ludHMpIHtcbiAgICBjb25zdCBzdW14ID0gcG9pbnRzLm1hcChwID0+IHAueCkucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSlcbiAgICBjb25zdCBzdW15ID0gcG9pbnRzLm1hcChwID0+IHAueSkucmVkdWNlKCh4LCB5KSA9PiB4ICsgeSlcbiAgICBjb25zdCBuID0gcG9pbnRzLmxlbmd0aFxuXG4gICAgcmV0dXJuIG5ldyBQb2ludChzdW14IC8gbiwgc3VteSAvIG4pXG4gIH1cblxuICBzdGF0aWMgaW5DZW50ZXIgKEEsIEIsIEMpIHtcbiAgICAvLyBpbmNlbnRlciBvZiBhIHRyaWFuZ2xlIGdpdmVuIHZlcnRleCBwb2ludHMgQSwgQiBhbmQgQ1xuICAgIGNvbnN0IGEgPSBQb2ludC5kaXN0YW5jZShCLCBDKVxuICAgIGNvbnN0IGIgPSBQb2ludC5kaXN0YW5jZShBLCBDKVxuICAgIGNvbnN0IGMgPSBQb2ludC5kaXN0YW5jZShBLCBCKVxuXG4gICAgY29uc3QgcGVyaW1ldGVyID0gYSArIGIgKyBjXG4gICAgY29uc3Qgc3VteCA9IGEgKiBBLnggKyBiICogQi54ICsgYyAqIEMueFxuICAgIGNvbnN0IHN1bXkgPSBhICogQS55ICsgYiAqIEIueSArIGMgKiBDLnlcblxuICAgIHJldHVybiBuZXcgUG9pbnQoc3VteCAvIHBlcmltZXRlciwgc3VteSAvIHBlcmltZXRlcilcbiAgfVxuXG4gIHN0YXRpYyBtaW4gKHBvaW50cykge1xuICAgIGNvbnN0IG1pbnggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1pbih4LCBwLngpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtaW55ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5taW4oeSwgcC55KSwgSW5maW5pdHkpXG4gICAgcmV0dXJuIG5ldyBQb2ludChtaW54LCBtaW55KVxuICB9XG5cbiAgc3RhdGljIG1heCAocG9pbnRzKSB7XG4gICAgY29uc3QgbWF4eCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWF4KHgsIHAueCksIC1JbmZpbml0eSlcbiAgICBjb25zdCBtYXh5ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5tYXgoeSwgcC55KSwgLUluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQobWF4eCwgbWF4eSlcbiAgfVxuXG4gIHN0YXRpYyBjZW50ZXIgKHBvaW50cykge1xuICAgIGNvbnN0IG1pbnggPSBwb2ludHMucmVkdWNlKCh4LCBwKSA9PiBNYXRoLm1pbih4LCBwLngpLCBJbmZpbml0eSlcbiAgICBjb25zdCBtaW55ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5taW4oeSwgcC55KSwgSW5maW5pdHkpXG4gICAgY29uc3QgbWF4eCA9IHBvaW50cy5yZWR1Y2UoKHgsIHApID0+IE1hdGgubWF4KHgsIHAueCksIC1JbmZpbml0eSlcbiAgICBjb25zdCBtYXh5ID0gcG9pbnRzLnJlZHVjZSgoeSwgcCkgPT4gTWF0aC5tYXgoeSwgcC55KSwgLUluZmluaXR5KVxuICAgIHJldHVybiBuZXcgUG9pbnQoKG1heHggKyBtaW54KSAvIDIsIChtYXh5ICsgbWlueSkgLyAyKVxuICB9XG5cbiAgc3RhdGljIHVuaXRWZWN0b3IgKHAxLCBwMikge1xuICAgIC8vIHJldHVybnMgYSB1bml0IHZlY3RvciBpbiB0aGUgZGlyZWN0aW9uIG9mIHAxIHRvIHAyXG4gICAgLy8gaW4gdGhlIGZvcm0ge3g6Li4uLCB5Oi4uLn1cbiAgICBjb25zdCB2ZWN4ID0gcDIueCAtIHAxLnhcbiAgICBjb25zdCB2ZWN5ID0gcDIueSAtIHAxLnlcbiAgICBjb25zdCBsZW5ndGggPSBNYXRoLmh5cG90KHZlY3gsIHZlY3kpXG4gICAgcmV0dXJuIHsgeDogdmVjeCAvIGxlbmd0aCwgeTogdmVjeSAvIGxlbmd0aCB9XG4gIH1cblxuICBzdGF0aWMgZGlzdGFuY2UgKHAxLCBwMikge1xuICAgIHJldHVybiBNYXRoLmh5cG90KHAxLnggLSBwMi54LCBwMS55IC0gcDIueSlcbiAgfVxuXG4gIHN0YXRpYyByZXBlbCAocDEsIHAyLCB0cmlnZ2VyLCBkaXN0YW5jZSkge1xuICAgIC8vIFdoZW4gcDEgYW5kIHAyIGFyZSBsZXNzIHRoYW4gW3RyaWdnZXJdIGFwYXJ0LCB0aGV5IGFyZVxuICAgIC8vIG1vdmVkIHNvIHRoYXQgdGhleSBhcmUgW2Rpc3RhbmNlXSBhcGFydFxuICAgIGNvbnN0IGQgPSBNYXRoLmh5cG90KHAxLnggLSBwMi54LCBwMS55IC0gcDIueSlcbiAgICBpZiAoZCA+PSB0cmlnZ2VyKSByZXR1cm4gZmFsc2VcblxuICAgIGNvbnN0IHIgPSAoZGlzdGFuY2UgLSBkKSAvIDIgLy8gZGlzdGFuY2UgdGhleSBuZWVkIG1vdmluZ1xuICAgIHAxLm1vdmVUb3dhcmQocDIsIC1yKVxuICAgIHAyLm1vdmVUb3dhcmQocDEsIC1yKVxuICAgIHJldHVybiB0cnVlXG4gIH1cbn1cbiIsImltcG9ydCBRdWVzdGlvbiBmcm9tICdRdWVzdGlvbi9RdWVzdGlvbidcbmltcG9ydCB7IGNyZWF0ZUVsZW0gfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5kZWNsYXJlIGNvbnN0IGthdGV4IDoge3JlbmRlciA6IChzdHJpbmc6IHN0cmluZywgZWxlbWVudDogSFRNTEVsZW1lbnQpID0+IHZvaWR9XG5cbi8qIEdyYXBoaWNRRGF0YSBjYW4gYWxsIGJlIHZlcnkgZGlmZmVyZW50LCBzbyBpbnRlcmZhY2UgaXMgZW1wdHlcbiAqIEhlcmUgZm9yIGNvZGUgZG9jdW1lbnRhdGlvbiByYXRoZXIgdGhhbiB0eXBlIHNhZmV0eSAod2hpY2ggaXNuJ3QgcHJvdmlkZWQpXG5cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1pbnRlcmZhY2UgKi9cbmV4cG9ydCBpbnRlcmZhY2UgR3JhcGhpY1FEYXRhIHtcbn1cbi8qIGVzbGludC1lbmFibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LWludGVyZmFjZSAqL1xuXG4vKiBOb3Qgd29ydGggdGhlIGhhc3NseSB0cnlpbmcgdG8gZ2V0IGludGVyZmFjZXMgZm9yIHN0YXRpYyBtZXRob2RzXG4gKlxuICogZXhwb3J0IGludGVyZmFjZSBHcmFwaGljUURhdGFDb25zdHJ1Y3RvciB7XG4gKiAgIG5ldyguLi5hcmdzIDogdW5rbm93bltdKTogR3JhcGhpY1FEYXRhXG4gKiAgIHJhbmRvbShvcHRpb25zOiB1bmtub3duKSA6IEdyYXBoaWNRRGF0YVxuICogfVxuKi9cblxuZXhwb3J0IGludGVyZmFjZSBMYWJlbCB7XG4gIHBvczogUG9pbnQsXG4gIHRleHRxOiBzdHJpbmcsXG4gIHRleHRhOiBzdHJpbmcsXG4gIHN0eWxlcTogc3RyaW5nLFxuICBzdHlsZWE6IHN0cmluZyxcbiAgdGV4dDogc3RyaW5nLFxuICBzdHlsZTogc3RyaW5nXG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBHcmFwaGljUVZpZXcge1xuICBET006IEhUTUxFbGVtZW50XG4gIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnRcbiAgd2lkdGg6IG51bWJlclxuICBoZWlnaHQ6IG51bWJlclxuICBkYXRhOiBHcmFwaGljUURhdGFcbiAgbGFiZWxzOiBMYWJlbFtdXG5cbiAgY29uc3RydWN0b3IgKFxuICAgIGRhdGEgOiBHcmFwaGljUURhdGEsXG4gICAgb3B0aW9ucyA6IHtcbiAgICAgIHdpZHRoOiBudW1iZXIsXG4gICAgICBoZWlnaHQ6IG51bWJlclxuICAgIH0pIHtcbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIHdpZHRoOiAyNTAsXG4gICAgICBoZWlnaHQ6IDI1MFxuICAgIH1cblxuICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIHRoaXMud2lkdGggPSBvcHRpb25zLndpZHRoXG4gICAgdGhpcy5oZWlnaHQgPSBvcHRpb25zLmhlaWdodCAvLyBvbmx5IHRoaW5ncyBJIG5lZWQgZnJvbSB0aGUgb3B0aW9ucywgZ2VuZXJhbGx5P1xuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICAvLyB0aGlzLnJvdGF0aW9uP1xuXG4gICAgdGhpcy5sYWJlbHMgPSBbXSAvLyBsYWJlbHMgb24gZGlhZ3JhbVxuXG4gICAgLy8gRE9NIGVsZW1lbnRzXG4gICAgdGhpcy5ET00gPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tZGl2JylcbiAgICB0aGlzLmNhbnZhcyA9IGNyZWF0ZUVsZW0oJ2NhbnZhcycsICdxdWVzdGlvbi1jYW52YXMnLCB0aGlzLkRPTSlcbiAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMud2lkdGhcbiAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodFxuICB9XG5cbiAgZ2V0RE9NICgpIDogSFRNTEVsZW1lbnQge1xuICAgIHJldHVybiB0aGlzLkRPTVxuICB9XG5cbiAgYWJzdHJhY3QgcmVuZGVyICgpIDogdm9pZFxuXG4gIHJlbmRlckxhYmVscyAobnVkZ2U/IDogYm9vbGVhbikgOiB2b2lkIHtcbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLkRPTVxuXG4gICAgLy8gcmVtb3ZlIGFueSBleGlzdGluZyBsYWJlbHNcbiAgICBjb25zdCBvbGRMYWJlbHMgPSBjb250YWluZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnbGFiZWwnKVxuICAgIHdoaWxlIChvbGRMYWJlbHMubGVuZ3RoID4gMCkge1xuICAgICAgb2xkTGFiZWxzWzBdLnJlbW92ZSgpXG4gICAgfVxuXG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICAgIGNvbnN0IGlubmVybGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgICAgbGFiZWwuY2xhc3NMaXN0LmFkZCgnbGFiZWwnKVxuICAgICAgbGFiZWwuY2xhc3NOYW1lICs9ICcgJyArIGwuc3R5bGUgLy8gdXNpbmcgY2xhc3NOYW1lIG92ZXIgY2xhc3NMaXN0IHNpbmNlIGwuc3R5bGUgaXMgc3BhY2UtZGVsaW1pdGVkIGxpc3Qgb2YgY2xhc3Nlc1xuICAgICAgbGFiZWwuc3R5bGUubGVmdCA9IGwucG9zLnggKyAncHgnXG4gICAgICBsYWJlbC5zdHlsZS50b3AgPSBsLnBvcy55ICsgJ3B4J1xuXG4gICAgICBrYXRleC5yZW5kZXIobC50ZXh0LCBpbm5lcmxhYmVsKVxuICAgICAgbGFiZWwuYXBwZW5kQ2hpbGQoaW5uZXJsYWJlbClcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChsYWJlbClcblxuICAgICAgLy8gcmVtb3ZlIHNwYWNlIGlmIHRoZSBpbm5lciBsYWJlbCBpcyB0b28gYmlnXG4gICAgICBpZiAoaW5uZXJsYWJlbC5vZmZzZXRXaWR0aCAvIGlubmVybGFiZWwub2Zmc2V0SGVpZ2h0ID4gMikge1xuICAgICAgICBjb25zb2xlLmxvZyhgcmVtb3ZlZCBzcGFjZSBpbiAke2wudGV4dH1gKVxuICAgICAgICBjb25zdCBuZXdsYWJlbHRleHQgPSBsLnRleHQucmVwbGFjZSgvXFwrLywgJ1xcXFwhK1xcXFwhJykucmVwbGFjZSgvLS8sICdcXFxcIS1cXFxcIScpXG4gICAgICAgIGthdGV4LnJlbmRlcihuZXdsYWJlbHRleHQsIGlubmVybGFiZWwpXG4gICAgICB9XG5cbiAgICAgIC8vIHBvc2l0aW9uIGNvcnJlY3RseSAtIHRoaXMgY291bGQgZGVmIGJlIG9wdGltaXNlZCAtIGxvdHMgb2YgYmFjay1hbmQtZm9ydGhcblxuICAgICAgLy8gYWRqdXN0IHRvICpjZW50ZXIqIGxhYmVsLCByYXRoZXIgdGhhbiBhbmNob3IgdG9wLXJpZ2h0XG4gICAgICAvKiB1c2luZyBjc3MgdHJhbnNmb3JtIGluc3RlYWRcbiAgICAgIGxhYmVsLnN0eWxlLmxlZnQgPSAobC5wb3MueCAtIGx3aWR0aCAvIDIpICsgJ3B4J1xuICAgICAgbGFiZWwuc3R5bGUudG9wID0gKGwucG9zLnkgLSBsaGVpZ2h0IC8gMikgKyAncHgnXG4gICAgICAqL1xuXG4gICAgICAvLyBJIGRvbid0IHVuZGVyc3RhbmQgdGhpcyBhZGp1c3RtZW50LiBJIHRoaW5rIGl0IG1pZ2h0IGJlIG5lZWRlZCBpbiBhcml0aG1hZ29ucywgYnV0IGl0IG1ha2VzXG4gICAgICAvLyBvdGhlcnMgZ28gZnVubnkuXG5cbiAgICAgIGlmIChudWRnZSkge1xuICAgICAgICBjb25zdCBsd2lkdGggPSBsYWJlbC5vZmZzZXRXaWR0aFxuICAgICAgICBjb25zdCBsaGVpZ2h0ID0gbGFiZWwub2Zmc2V0SGVpZ2h0XG4gICAgICAgIGlmIChsLnBvcy54IDwgdGhpcy5jYW52YXMud2lkdGggLyAyIC0gNSAmJiBsLnBvcy54ICsgbHdpZHRoIC8gMiA+IHRoaXMuY2FudmFzLndpZHRoIC8gMikge1xuICAgICAgICAgIGxhYmVsLnN0eWxlLmxlZnQgPSAodGhpcy5jYW52YXMud2lkdGggLyAyIC0gbHdpZHRoIC0gMykgKyAncHgnXG4gICAgICAgICAgY29uc29sZS5sb2coYG51ZGdlZCAnJHtsLnRleHR9J2ApXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGwucG9zLnggPiB0aGlzLmNhbnZhcy53aWR0aCAvIDIgKyA1ICYmIGwucG9zLnggLSBsd2lkdGggLyAyIDwgdGhpcy5jYW52YXMud2lkdGggLyAyKSB7XG4gICAgICAgICAgbGFiZWwuc3R5bGUubGVmdCA9ICh0aGlzLmNhbnZhcy53aWR0aCAvIDIgKyAzKSArICdweCdcbiAgICAgICAgICBjb25zb2xlLmxvZyhgbnVkZ2VkICcke2wudGV4dH0nYClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBzaG93QW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dGFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlYVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoZmFsc2UpXG4gIH1cblxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7XG4gICAgdGhpcy5sYWJlbHMuZm9yRWFjaChsID0+IHtcbiAgICAgIGwudGV4dCA9IGwudGV4dHFcbiAgICAgIGwuc3R5bGUgPSBsLnN0eWxlcVxuICAgIH0pXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoZmFsc2UpXG4gIH1cblxuICAvLyBQb2ludCB0cmFuZm9ybWF0aW9ucyBvZiBhbGwgcG9pbnRzXG5cbiAgZ2V0IGFsbHBvaW50cyAoKSA6IFBvaW50W10ge1xuICAgIHJldHVybiBbXVxuICB9XG5cbiAgc2NhbGUgKHNmIDogbnVtYmVyKSA6IHZvaWQge1xuICAgIHRoaXMuYWxscG9pbnRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHAuc2NhbGUoc2YpXG4gICAgfSlcbiAgfVxuXG4gIHJvdGF0ZSAoYW5nbGUgOiBudW1iZXIpIDogbnVtYmVyIHtcbiAgICB0aGlzLmFsbHBvaW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICBwLnJvdGF0ZShhbmdsZSlcbiAgICB9KVxuICAgIHJldHVybiBhbmdsZVxuICB9XG5cbiAgdHJhbnNsYXRlICh4IDogbnVtYmVyLCB5IDogbnVtYmVyKSA6IHZvaWQge1xuICAgIHRoaXMuYWxscG9pbnRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHAudHJhbnNsYXRlKHgsIHkpXG4gICAgfSlcbiAgfVxuXG4gIHJhbmRvbVJvdGF0ZSAoKSA6IG51bWJlciB7XG4gICAgY29uc3QgYW5nbGUgPSAyICogTWF0aC5QSSAqIE1hdGgucmFuZG9tKClcbiAgICB0aGlzLnJvdGF0ZShhbmdsZSlcbiAgICByZXR1cm4gYW5nbGVcbiAgfVxuXG4gIHNjYWxlVG9GaXQgKHdpZHRoIDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgbWFyZ2luIDogbnVtYmVyKSA6IHZvaWQge1xuICAgIGxldCB0b3BMZWZ0IDogUG9pbnQgPSBQb2ludC5taW4odGhpcy5hbGxwb2ludHMpXG4gICAgbGV0IGJvdHRvbVJpZ2h0IDogUG9pbnQgPSBQb2ludC5tYXgodGhpcy5hbGxwb2ludHMpXG4gICAgY29uc3QgdG90YWxXaWR0aCA6IG51bWJlciA9IGJvdHRvbVJpZ2h0LnggLSB0b3BMZWZ0LnhcbiAgICBjb25zdCB0b3RhbEhlaWdodCA6IG51bWJlciA9IGJvdHRvbVJpZ2h0LnkgLSB0b3BMZWZ0LnlcbiAgICB0aGlzLnNjYWxlKE1hdGgubWluKCh3aWR0aCAtIG1hcmdpbikgLyB0b3RhbFdpZHRoLCAoaGVpZ2h0IC0gbWFyZ2luKSAvIHRvdGFsSGVpZ2h0KSlcblxuICAgIC8vIGNlbnRyZVxuICAgIHRvcExlZnQgPSBQb2ludC5taW4odGhpcy5hbGxwb2ludHMpXG4gICAgYm90dG9tUmlnaHQgPSBQb2ludC5tYXgodGhpcy5hbGxwb2ludHMpXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbihbdG9wTGVmdCwgYm90dG9tUmlnaHRdKVxuICAgIHRoaXMudHJhbnNsYXRlKHdpZHRoIC8gMiAtIGNlbnRlci54LCBoZWlnaHQgLyAyIC0gY2VudGVyLnkpIC8vIGNlbnRyZVxuICB9XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBHcmFwaGljUSBleHRlbmRzIFF1ZXN0aW9uIHtcbiAgZGF0YTogR3JhcGhpY1FEYXRhXG4gIHZpZXc6IEdyYXBoaWNRVmlld1xuXG4gIGNvbnN0cnVjdG9yICgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICBzdXBlcigpIC8vIHRoaXMuYW5zd2VyZWQgPSBmYWxzZVxuICAgIGRlbGV0ZSAodGhpcy5ET00pIC8vIGdvaW5nIHRvIG92ZXJyaWRlIGdldERPTSB1c2luZyB0aGUgdmlldydzIERPTVxuXG4gICAgLyogVGhlc2UgYXJlIGd1YXJhbnRlZWQgdG8gYmUgb3ZlcnJpZGRlbiwgc28gbm8gcG9pbnQgaW5pdGlhbGl6aW5nIGhlcmVcbiAgICAgKlxuICAgICAqICB0aGlzLmRhdGEgPSBuZXcgR3JhcGhpY1FEYXRhKG9wdGlvbnMpXG4gICAgICogIHRoaXMudmlldyA9IG5ldyBHcmFwaGljUVZpZXcodGhpcy5kYXRhLCBvcHRpb25zKVxuICAgICAqXG4gICAgICovXG4gIH1cblxuICAvKiBOZWVkIHRvIHJlZmFjdG9yIHN1YmNsYXNzZXMgdG8gZG8gdGhpczpcbiAgICogY29uc3RydWN0b3IgKGRhdGEsIHZpZXcpIHtcbiAgICogICAgdGhpcy5kYXRhID0gZGF0YVxuICAgKiAgICB0aGlzLnZpZXcgPSB2aWV3XG4gICAqIH1cbiAgICpcbiAgICogc3RhdGljIHJhbmRvbShvcHRpb25zKSB7XG4gICAqICAvLyBhbiBhdHRlbXB0IGF0IGhhdmluZyBhYnN0cmFjdCBzdGF0aWMgbWV0aG9kcywgYWxiZWl0IHJ1bnRpbWUgZXJyb3JcbiAgICogIHRocm93IG5ldyBFcnJvcihcImByYW5kb20oKWAgbXVzdCBiZSBvdmVycmlkZGVuIGluIHN1YmNsYXNzIFwiICsgdGhpcy5uYW1lKVxuICAgKiB9XG4gICAqXG4gICAqIHR5cGljYWwgaW1wbGVtZW50YXRpb246XG4gICAqIHN0YXRpYyByYW5kb20ob3B0aW9ucykge1xuICAgKiAgY29uc3QgZGF0YSA9IG5ldyBEZXJpdmVkUURhdGEob3B0aW9ucylcbiAgICogIGNvbnN0IHZpZXcgPSBuZXcgRGVyaXZlZFFWaWV3KG9wdGlvbnMpXG4gICAqICByZXR1cm4gbmV3IERlcml2ZWRRRGF0YShkYXRhLHZpZXcpXG4gICAqIH1cbiAgICpcbiAgICovXG5cbiAgZ2V0RE9NICgpIDogSFRNTEVsZW1lbnQgeyByZXR1cm4gdGhpcy52aWV3LmdldERPTSgpIH1cblxuICByZW5kZXIgKCkgOiB2b2lkIHsgdGhpcy52aWV3LnJlbmRlcigpIH1cblxuICBzaG93QW5zd2VyICgpIDogdm9pZCB7XG4gICAgc3VwZXIuc2hvd0Fuc3dlcigpXG4gICAgdGhpcy52aWV3LnNob3dBbnN3ZXIoKVxuICB9XG5cbiAgaGlkZUFuc3dlciAoKSA6IHZvaWQge1xuICAgIHN1cGVyLmhpZGVBbnN3ZXIoKVxuICAgIHRoaXMudmlldy5oaWRlQW5zd2VyKClcbiAgfVxufVxuIiwiaW1wb3J0ICogYXMgY29tbW9uanNIZWxwZXJzIGZyb20gJ1x1MDAwMGNvbW1vbmpzSGVscGVycy5qcydcblxudmFyIGZyYWN0aW9uID0gY29tbW9uanNIZWxwZXJzLmNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZ1bmN0aW9uIChtb2R1bGUsIGV4cG9ydHMpIHtcbi8qKlxuICogQGxpY2Vuc2UgRnJhY3Rpb24uanMgdjQuMC45IDA5LzA5LzIwMTVcbiAqIGh0dHA6Ly93d3cueGFyZy5vcmcvMjAxNC8wMy9yYXRpb25hbC1udW1iZXJzLWluLWphdmFzY3JpcHQvXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1LCBSb2JlcnQgRWlzZWxlIChyb2JlcnRAeGFyZy5vcmcpXG4gKiBEdWFsIGxpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgb3IgR1BMIFZlcnNpb24gMiBsaWNlbnNlcy5cbiAqKi9cblxuICAvKipcbiAqXG4gKiBUaGlzIGNsYXNzIG9mZmVycyB0aGUgcG9zc2liaWxpdHkgdG8gY2FsY3VsYXRlIGZyYWN0aW9ucy5cbiAqIFlvdSBjYW4gcGFzcyBhIGZyYWN0aW9uIGluIGRpZmZlcmVudCBmb3JtYXRzLiBFaXRoZXIgYXMgYXJyYXksIGFzIGRvdWJsZSwgYXMgc3RyaW5nIG9yIGFzIGFuIGludGVnZXIuXG4gKlxuICogQXJyYXkvT2JqZWN0IGZvcm1cbiAqIFsgMCA9PiA8bm9taW5hdG9yPiwgMSA9PiA8ZGVub21pbmF0b3I+IF1cbiAqIFsgbiA9PiA8bm9taW5hdG9yPiwgZCA9PiA8ZGVub21pbmF0b3I+IF1cbiAqXG4gKiBJbnRlZ2VyIGZvcm1cbiAqIC0gU2luZ2xlIGludGVnZXIgdmFsdWVcbiAqXG4gKiBEb3VibGUgZm9ybVxuICogLSBTaW5nbGUgZG91YmxlIHZhbHVlXG4gKlxuICogU3RyaW5nIGZvcm1cbiAqIDEyMy40NTYgLSBhIHNpbXBsZSBkb3VibGVcbiAqIDEyMy80NTYgLSBhIHN0cmluZyBmcmFjdGlvblxuICogMTIzLic0NTYnIC0gYSBkb3VibGUgd2l0aCByZXBlYXRpbmcgZGVjaW1hbCBwbGFjZXNcbiAqIDEyMy4oNDU2KSAtIHN5bm9ueW1cbiAqIDEyMy40NSc2JyAtIGEgZG91YmxlIHdpdGggcmVwZWF0aW5nIGxhc3QgcGxhY2VcbiAqIDEyMy40NSg2KSAtIHN5bm9ueW1cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIHZhciBmID0gbmV3IEZyYWN0aW9uKFwiOS40JzMxJ1wiKTtcbiAqIGYubXVsKFstNCwgM10pLmRpdig0LjkpO1xuICpcbiAqL1xuXG4gIChmdW5jdGlvbiAocm9vdCkge1xuICAgICd1c2Ugc3RyaWN0J1xuXG4gICAgLy8gTWF4aW11bSBzZWFyY2ggZGVwdGggZm9yIGN5Y2xpYyByYXRpb25hbCBudW1iZXJzLiAyMDAwIHNob3VsZCBiZSBtb3JlIHRoYW4gZW5vdWdoLlxuICAgIC8vIEV4YW1wbGU6IDEvNyA9IDAuKDE0Mjg1NykgaGFzIDYgcmVwZWF0aW5nIGRlY2ltYWwgcGxhY2VzLlxuICAgIC8vIElmIE1BWF9DWUNMRV9MRU4gZ2V0cyByZWR1Y2VkLCBsb25nIGN5Y2xlcyB3aWxsIG5vdCBiZSBkZXRlY3RlZCBhbmQgdG9TdHJpbmcoKSBvbmx5IGdldHMgdGhlIGZpcnN0IDEwIGRpZ2l0c1xuICAgIHZhciBNQVhfQ1lDTEVfTEVOID0gMjAwMFxuXG4gICAgLy8gUGFyc2VkIGRhdGEgdG8gYXZvaWQgY2FsbGluZyBcIm5ld1wiIGFsbCB0aGUgdGltZVxuICAgIHZhciBQID0ge1xuICAgICAgczogMSxcbiAgICAgIG46IDAsXG4gICAgICBkOiAxXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlRXJyb3IgKG5hbWUpIHtcbiAgICAgIGZ1bmN0aW9uIGVycm9yQ29uc3RydWN0b3IgKCkge1xuICAgICAgICB2YXIgdGVtcCA9IEVycm9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICAgICAgdGVtcC5uYW1lID0gdGhpcy5uYW1lID0gbmFtZVxuICAgICAgICB0aGlzLnN0YWNrID0gdGVtcC5zdGFja1xuICAgICAgICB0aGlzLm1lc3NhZ2UgPSB0ZW1wLm1lc3NhZ2VcbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICogRXJyb3IgY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgICAgZnVuY3Rpb24gSW50ZXJtZWRpYXRlSW5oZXJpdG9yICgpIHt9XG4gICAgICBJbnRlcm1lZGlhdGVJbmhlcml0b3IucHJvdG90eXBlID0gRXJyb3IucHJvdG90eXBlXG4gICAgICBlcnJvckNvbnN0cnVjdG9yLnByb3RvdHlwZSA9IG5ldyBJbnRlcm1lZGlhdGVJbmhlcml0b3IoKVxuXG4gICAgICByZXR1cm4gZXJyb3JDb25zdHJ1Y3RvclxuICAgIH1cblxuICAgIHZhciBEaXZpc2lvbkJ5WmVybyA9IEZyYWN0aW9uLkRpdmlzaW9uQnlaZXJvID0gY3JlYXRlRXJyb3IoJ0RpdmlzaW9uQnlaZXJvJylcbiAgICB2YXIgSW52YWxpZFBhcmFtZXRlciA9IEZyYWN0aW9uLkludmFsaWRQYXJhbWV0ZXIgPSBjcmVhdGVFcnJvcignSW52YWxpZFBhcmFtZXRlcicpXG5cbiAgICBmdW5jdGlvbiBhc3NpZ24gKG4sIHMpIHtcbiAgICAgIGlmIChpc05hTihuID0gcGFyc2VJbnQobiwgMTApKSkge1xuICAgICAgICB0aHJvd0ludmFsaWRQYXJhbSgpXG4gICAgICB9XG4gICAgICByZXR1cm4gbiAqIHNcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0aHJvd0ludmFsaWRQYXJhbSAoKSB7XG4gICAgICB0aHJvdyBuZXcgSW52YWxpZFBhcmFtZXRlcigpXG4gICAgfVxuXG4gICAgdmFyIHBhcnNlID0gZnVuY3Rpb24gKHAxLCBwMikge1xuICAgICAgdmFyIG4gPSAwOyB2YXIgZCA9IDE7IHZhciBzID0gMVxuICAgICAgdmFyIHYgPSAwOyB2YXIgdyA9IDA7IHZhciB4ID0gMDsgdmFyIHkgPSAxOyB2YXIgeiA9IDFcblxuICAgICAgdmFyIEEgPSAwOyB2YXIgQiA9IDFcbiAgICAgIHZhciBDID0gMTsgdmFyIEQgPSAxXG5cbiAgICAgIHZhciBOID0gMTAwMDAwMDBcbiAgICAgIHZhciBNXG5cbiAgICAgIGlmIChwMSA9PT0gdW5kZWZpbmVkIHx8IHAxID09PSBudWxsKSB7XG4gICAgICAvKiB2b2lkICovXG4gICAgICB9IGVsc2UgaWYgKHAyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbiA9IHAxXG4gICAgICAgIGQgPSBwMlxuICAgICAgICBzID0gbiAqIGRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN3aXRjaCAodHlwZW9mIHAxKSB7XG4gICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZiAoJ2QnIGluIHAxICYmICduJyBpbiBwMSkge1xuICAgICAgICAgICAgICBuID0gcDEublxuICAgICAgICAgICAgICBkID0gcDEuZFxuICAgICAgICAgICAgICBpZiAoJ3MnIGluIHAxKSB7IG4gKj0gcDEucyB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKDAgaW4gcDEpIHtcbiAgICAgICAgICAgICAgbiA9IHAxWzBdXG4gICAgICAgICAgICAgIGlmICgxIGluIHAxKSB7IGQgPSBwMVsxXSB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvd0ludmFsaWRQYXJhbSgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzID0gbiAqIGRcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAge1xuICAgICAgICAgICAgaWYgKHAxIDwgMCkge1xuICAgICAgICAgICAgICBzID0gcDFcbiAgICAgICAgICAgICAgcDEgPSAtcDFcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHAxICUgMSA9PT0gMCkge1xuICAgICAgICAgICAgICBuID0gcDFcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocDEgPiAwKSB7IC8vIGNoZWNrIGZvciAhPSAwLCBzY2FsZSB3b3VsZCBiZWNvbWUgTmFOIChsb2coMCkpLCB3aGljaCBjb252ZXJnZXMgcmVhbGx5IHNsb3dcbiAgICAgICAgICAgICAgaWYgKHAxID49IDEpIHtcbiAgICAgICAgICAgICAgICB6ID0gTWF0aC5wb3coMTAsIE1hdGguZmxvb3IoMSArIE1hdGgubG9nKHAxKSAvIE1hdGguTE4xMCkpXG4gICAgICAgICAgICAgICAgcDEgLz0gelxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gVXNpbmcgRmFyZXkgU2VxdWVuY2VzXG4gICAgICAgICAgICAgIC8vIGh0dHA6Ly93d3cuam9obmRjb29rLmNvbS9ibG9nLzIwMTAvMTAvMjAvYmVzdC1yYXRpb25hbC1hcHByb3hpbWF0aW9uL1xuXG4gICAgICAgICAgICAgIHdoaWxlIChCIDw9IE4gJiYgRCA8PSBOKSB7XG4gICAgICAgICAgICAgICAgTSA9IChBICsgQykgLyAoQiArIEQpXG5cbiAgICAgICAgICAgICAgICBpZiAocDEgPT09IE0pIHtcbiAgICAgICAgICAgICAgICAgIGlmIChCICsgRCA8PSBOKSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBBICsgQ1xuICAgICAgICAgICAgICAgICAgICBkID0gQiArIERcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoRCA+IEIpIHtcbiAgICAgICAgICAgICAgICAgICAgbiA9IENcbiAgICAgICAgICAgICAgICAgICAgZCA9IERcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBBXG4gICAgICAgICAgICAgICAgICAgIGQgPSBCXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBpZiAocDEgPiBNKSB7XG4gICAgICAgICAgICAgICAgICAgIEEgKz0gQ1xuICAgICAgICAgICAgICAgICAgICBCICs9IERcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIEMgKz0gQVxuICAgICAgICAgICAgICAgICAgICBEICs9IEJcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKEIgPiBOKSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBDXG4gICAgICAgICAgICAgICAgICAgIGQgPSBEXG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBuID0gQVxuICAgICAgICAgICAgICAgICAgICBkID0gQlxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBuICo9IHpcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNOYU4ocDEpIHx8IGlzTmFOKHAyKSkge1xuICAgICAgICAgICAgICBkID0gbiA9IE5hTlxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICB7XG4gICAgICAgICAgICBCID0gcDEubWF0Y2goL1xcZCt8Li9nKVxuXG4gICAgICAgICAgICBpZiAoQiA9PT0gbnVsbCkgeyB0aHJvd0ludmFsaWRQYXJhbSgpIH1cblxuICAgICAgICAgICAgaWYgKEJbQV0gPT09ICctJykgeyAvLyBDaGVjayBmb3IgbWludXMgc2lnbiBhdCB0aGUgYmVnaW5uaW5nXG4gICAgICAgICAgICAgIHMgPSAtMVxuICAgICAgICAgICAgICBBKytcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQltBXSA9PT0gJysnKSB7IC8vIENoZWNrIGZvciBwbHVzIHNpZ24gYXQgdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgICBBKytcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKEIubGVuZ3RoID09PSBBICsgMSkgeyAvLyBDaGVjayBpZiBpdCdzIGp1c3QgYSBzaW1wbGUgbnVtYmVyIFwiMTIzNFwiXG4gICAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBKytdLCBzKVxuICAgICAgICAgICAgfSBlbHNlIGlmIChCW0EgKyAxXSA9PT0gJy4nIHx8IEJbQV0gPT09ICcuJykgeyAvLyBDaGVjayBpZiBpdCdzIGEgZGVjaW1hbCBudW1iZXJcbiAgICAgICAgICAgICAgaWYgKEJbQV0gIT09ICcuJykgeyAvLyBIYW5kbGUgMC41IGFuZCAuNVxuICAgICAgICAgICAgICAgIHYgPSBhc3NpZ24oQltBKytdLCBzKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIEErK1xuXG4gICAgICAgICAgICAgIC8vIENoZWNrIGZvciBkZWNpbWFsIHBsYWNlc1xuICAgICAgICAgICAgICBpZiAoQSArIDEgPT09IEIubGVuZ3RoIHx8IEJbQSArIDFdID09PSAnKCcgJiYgQltBICsgM10gPT09ICcpJyB8fCBCW0EgKyAxXSA9PT0gXCInXCIgJiYgQltBICsgM10gPT09IFwiJ1wiKSB7XG4gICAgICAgICAgICAgICAgdyA9IGFzc2lnbihCW0FdLCBzKVxuICAgICAgICAgICAgICAgIHkgPSBNYXRoLnBvdygxMCwgQltBXS5sZW5ndGgpXG4gICAgICAgICAgICAgICAgQSsrXG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAvLyBDaGVjayBmb3IgcmVwZWF0aW5nIHBsYWNlc1xuICAgICAgICAgICAgICBpZiAoQltBXSA9PT0gJygnICYmIEJbQSArIDJdID09PSAnKScgfHwgQltBXSA9PT0gXCInXCIgJiYgQltBICsgMl0gPT09IFwiJ1wiKSB7XG4gICAgICAgICAgICAgICAgeCA9IGFzc2lnbihCW0EgKyAxXSwgcylcbiAgICAgICAgICAgICAgICB6ID0gTWF0aC5wb3coMTAsIEJbQSArIDFdLmxlbmd0aCkgLSAxXG4gICAgICAgICAgICAgICAgQSArPSAzXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQltBICsgMV0gPT09ICcvJyB8fCBCW0EgKyAxXSA9PT0gJzonKSB7IC8vIENoZWNrIGZvciBhIHNpbXBsZSBmcmFjdGlvbiBcIjEyMy80NTZcIiBvciBcIjEyMzo0NTZcIlxuICAgICAgICAgICAgICB3ID0gYXNzaWduKEJbQV0sIHMpXG4gICAgICAgICAgICAgIHkgPSBhc3NpZ24oQltBICsgMl0sIDEpXG4gICAgICAgICAgICAgIEEgKz0gM1xuICAgICAgICAgICAgfSBlbHNlIGlmIChCW0EgKyAzXSA9PT0gJy8nICYmIEJbQSArIDFdID09PSAnICcpIHsgLy8gQ2hlY2sgZm9yIGEgY29tcGxleCBmcmFjdGlvbiBcIjEyMyAxLzJcIlxuICAgICAgICAgICAgICB2ID0gYXNzaWduKEJbQV0sIHMpXG4gICAgICAgICAgICAgIHcgPSBhc3NpZ24oQltBICsgMl0sIHMpXG4gICAgICAgICAgICAgIHkgPSBhc3NpZ24oQltBICsgNF0sIDEpXG4gICAgICAgICAgICAgIEEgKz0gNVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoQi5sZW5ndGggPD0gQSkgeyAvLyBDaGVjayBmb3IgbW9yZSB0b2tlbnMgb24gdGhlIHN0YWNrXG4gICAgICAgICAgICAgIGQgPSB5ICogelxuICAgICAgICAgICAgICBzID0gLyogdm9pZCAqL1xuICAgICAgICAgICAgICAgICAgICBuID0geCArIGQgKiB2ICsgeiAqIHdcbiAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIC8qIEZhbGwgdGhyb3VnaCBvbiBlcnJvciAqL1xuICAgICAgICAgIH1cbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3dJbnZhbGlkUGFyYW0oKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChkID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBEaXZpc2lvbkJ5WmVybygpXG4gICAgICB9XG5cbiAgICAgIFAucyA9IHMgPCAwID8gLTEgOiAxXG4gICAgICBQLm4gPSBNYXRoLmFicyhuKVxuICAgICAgUC5kID0gTWF0aC5hYnMoZClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb2Rwb3cgKGIsIGUsIG0pIHtcbiAgICAgIHZhciByID0gMVxuICAgICAgZm9yICg7IGUgPiAwOyBiID0gKGIgKiBiKSAlIG0sIGUgPj49IDEpIHtcbiAgICAgICAgaWYgKGUgJiAxKSB7XG4gICAgICAgICAgciA9IChyICogYikgJSBtXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3ljbGVMZW4gKG4sIGQpIHtcbiAgICAgIGZvciAoOyBkICUgMiA9PT0gMDtcbiAgICAgICAgZCAvPSAyKSB7XG4gICAgICB9XG5cbiAgICAgIGZvciAoOyBkICUgNSA9PT0gMDtcbiAgICAgICAgZCAvPSA1KSB7XG4gICAgICB9XG5cbiAgICAgIGlmIChkID09PSAxKSAvLyBDYXRjaCBub24tY3ljbGljIG51bWJlcnNcbiAgICAgIHsgcmV0dXJuIDAgfVxuXG4gICAgICAvLyBJZiB3ZSB3b3VsZCBsaWtlIHRvIGNvbXB1dGUgcmVhbGx5IGxhcmdlIG51bWJlcnMgcXVpY2tlciwgd2UgY291bGQgbWFrZSB1c2Ugb2YgRmVybWF0J3MgbGl0dGxlIHRoZW9yZW06XG4gICAgICAvLyAxMF4oZC0xKSAlIGQgPT0gMVxuICAgICAgLy8gSG93ZXZlciwgd2UgZG9uJ3QgbmVlZCBzdWNoIGxhcmdlIG51bWJlcnMgYW5kIE1BWF9DWUNMRV9MRU4gc2hvdWxkIGJlIHRoZSBjYXBzdG9uZSxcbiAgICAgIC8vIGFzIHdlIHdhbnQgdG8gdHJhbnNsYXRlIHRoZSBudW1iZXJzIHRvIHN0cmluZ3MuXG5cbiAgICAgIHZhciByZW0gPSAxMCAlIGRcbiAgICAgIHZhciB0ID0gMVxuXG4gICAgICBmb3IgKDsgcmVtICE9PSAxOyB0KyspIHtcbiAgICAgICAgcmVtID0gcmVtICogMTAgJSBkXG5cbiAgICAgICAgaWYgKHQgPiBNQVhfQ1lDTEVfTEVOKSB7IHJldHVybiAwIH0gLy8gUmV0dXJuaW5nIDAgaGVyZSBtZWFucyB0aGF0IHdlIGRvbid0IHByaW50IGl0IGFzIGEgY3ljbGljIG51bWJlci4gSXQncyBsaWtlbHkgdGhhdCB0aGUgYW5zd2VyIGlzIGBkLTFgXG4gICAgICB9XG4gICAgICByZXR1cm4gdFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGN5Y2xlU3RhcnQgKG4sIGQsIGxlbikge1xuICAgICAgdmFyIHJlbTEgPSAxXG4gICAgICB2YXIgcmVtMiA9IG1vZHBvdygxMCwgbGVuLCBkKVxuXG4gICAgICBmb3IgKHZhciB0ID0gMDsgdCA8IDMwMDsgdCsrKSB7IC8vIHMgPCB+bG9nMTAoTnVtYmVyLk1BWF9WQUxVRSlcbiAgICAgIC8vIFNvbHZlIDEwXnMgPT0gMTBeKHMrdCkgKG1vZCBkKVxuXG4gICAgICAgIGlmIChyZW0xID09PSByZW0yKSB7IHJldHVybiB0IH1cblxuICAgICAgICByZW0xID0gcmVtMSAqIDEwICUgZFxuICAgICAgICByZW0yID0gcmVtMiAqIDEwICUgZFxuICAgICAgfVxuICAgICAgcmV0dXJuIDBcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnY2QgKGEsIGIpIHtcbiAgICAgIGlmICghYSkgeyByZXR1cm4gYiB9XG4gICAgICBpZiAoIWIpIHsgcmV0dXJuIGEgfVxuXG4gICAgICB3aGlsZSAoMSkge1xuICAgICAgICBhICU9IGJcbiAgICAgICAgaWYgKCFhKSB7IHJldHVybiBiIH1cbiAgICAgICAgYiAlPSBhXG4gICAgICAgIGlmICghYikgeyByZXR1cm4gYSB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgKiBNb2R1bGUgY29uc3RydWN0b3JcbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7bnVtYmVyfEZyYWN0aW9uPX0gYVxuICAgKiBAcGFyYW0ge251bWJlcj19IGJcbiAgICovXG4gICAgZnVuY3Rpb24gRnJhY3Rpb24gKGEsIGIpIHtcbiAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGcmFjdGlvbikpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihhLCBiKVxuICAgICAgfVxuXG4gICAgICBwYXJzZShhLCBiKVxuXG4gICAgICBpZiAoRnJhY3Rpb24uUkVEVUNFKSB7XG4gICAgICAgIGEgPSBnY2QoUC5kLCBQLm4pIC8vIEFidXNlIGFcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGEgPSAxXG4gICAgICB9XG5cbiAgICAgIHRoaXMucyA9IFAuc1xuICAgICAgdGhpcy5uID0gUC5uIC8gYVxuICAgICAgdGhpcy5kID0gUC5kIC8gYVxuICAgIH1cblxuICAgIC8qKlxuICAgKiBCb29sZWFuIGdsb2JhbCB2YXJpYWJsZSB0byBiZSBhYmxlIHRvIGRpc2FibGUgYXV0b21hdGljIHJlZHVjdGlvbiBvZiB0aGUgZnJhY3Rpb25cbiAgICpcbiAgICovXG4gICAgRnJhY3Rpb24uUkVEVUNFID0gMVxuXG4gICAgRnJhY3Rpb24ucHJvdG90eXBlID0ge1xuXG4gICAgICBzOiAxLFxuICAgICAgbjogMCxcbiAgICAgIGQ6IDEsXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGFic29sdXRlIHZhbHVlXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKC00KS5hYnMoKSA9PiA0XG4gICAgICoqL1xuICAgICAgYWJzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24odGhpcy5uLCB0aGlzLmQpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBJbnZlcnRzIHRoZSBzaWduIG9mIHRoZSBjdXJyZW50IGZyYWN0aW9uXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKC00KS5uZWcoKSA9PiA0XG4gICAgICoqL1xuICAgICAgbmVnOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oLXRoaXMucyAqIHRoaXMubiwgdGhpcy5kKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQWRkcyB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbih7bjogMiwgZDogM30pLmFkZChcIjE0LjlcIikgPT4gNDY3IC8gMzBcbiAgICAgKiovXG4gICAgICBhZGQ6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgdGhpcy5zICogdGhpcy5uICogUC5kICsgUC5zICogdGhpcy5kICogUC5uLFxuICAgICAgICAgIHRoaXMuZCAqIFAuZFxuICAgICAgICApXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBTdWJ0cmFjdHMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oe246IDIsIGQ6IDN9KS5hZGQoXCIxNC45XCIpID0+IC00MjcgLyAzMFxuICAgICAqKi9cbiAgICAgIHN1YjogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihcbiAgICAgICAgICB0aGlzLnMgKiB0aGlzLm4gKiBQLmQgLSBQLnMgKiB0aGlzLmQgKiBQLm4sXG4gICAgICAgICAgdGhpcy5kICogUC5kXG4gICAgICAgIClcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIE11bHRpcGxpZXMgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCItMTcuKDM0NSlcIikubXVsKDMpID0+IDU3NzYgLyAxMTFcbiAgICAgKiovXG4gICAgICBtdWw6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgdGhpcy5zICogUC5zICogdGhpcy5uICogUC5uLFxuICAgICAgICAgIHRoaXMuZCAqIFAuZFxuICAgICAgICApXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBEaXZpZGVzIHR3byByYXRpb25hbCBudW1iZXJzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiLTE3LigzNDUpXCIpLmludmVyc2UoKS5kaXYoMylcbiAgICAgKiovXG4gICAgICBkaXY6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgdGhpcy5zICogUC5zICogdGhpcy5uICogUC5kLFxuICAgICAgICAgIHRoaXMuZCAqIFAublxuICAgICAgICApXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDbG9uZXMgdGhlIGFjdHVhbCBvYmplY3RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCItMTcuKDM0NSlcIikuY2xvbmUoKVxuICAgICAqKi9cbiAgICAgIGNsb25lOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24odGhpcylcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIG1vZHVsbyBvZiB0d28gcmF0aW9uYWwgbnVtYmVycyAtIGEgbW9yZSBwcmVjaXNlIGZtb2RcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykubW9kKFs3LCA4XSkgPT4gKDEzLzMpICUgKDcvOCkgPSAoNS82KVxuICAgICAqKi9cbiAgICAgIG1vZDogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24odGhpcy5zICogdGhpcy5uICUgdGhpcy5kLCAxKVxuICAgICAgICB9XG5cbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgaWYgKFAubiA9PT0gMCAmJiB0aGlzLmQgPT09IDApIHtcbiAgICAgICAgICBGcmFjdGlvbigwLCAwKSAvLyBUaHJvdyBEaXZpc2lvbkJ5WmVyb1xuICAgICAgICB9XG5cbiAgICAgICAgLypcbiAgICAgICAqIEZpcnN0IHNpbGx5IGF0dGVtcHQsIGtpbmRhIHNsb3dcbiAgICAgICAqXG4gICAgICAgcmV0dXJuIHRoYXRbXCJzdWJcIl0oe1xuICAgICAgIFwiblwiOiBudW1bXCJuXCJdICogTWF0aC5mbG9vcigodGhpcy5uIC8gdGhpcy5kKSAvIChudW0ubiAvIG51bS5kKSksXG4gICAgICAgXCJkXCI6IG51bVtcImRcIl0sXG4gICAgICAgXCJzXCI6IHRoaXNbXCJzXCJdXG4gICAgICAgfSk7ICovXG5cbiAgICAgICAgLypcbiAgICAgICAqIE5ldyBhdHRlbXB0OiBhMSAvIGIxID0gYTIgLyBiMiAqIHEgKyByXG4gICAgICAgKiA9PiBiMiAqIGExID0gYTIgKiBiMSAqIHEgKyBiMSAqIGIyICogclxuICAgICAgICogPT4gKGIyICogYTEgJSBhMiAqIGIxKSAvIChiMSAqIGIyKVxuICAgICAgICovXG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oXG4gICAgICAgICAgdGhpcy5zICogKFAuZCAqIHRoaXMubikgJSAoUC5uICogdGhpcy5kKSxcbiAgICAgICAgICBQLmQgKiB0aGlzLmRcbiAgICAgICAgKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZnJhY3Rpb25hbCBnY2Qgb2YgdHdvIHJhdGlvbmFsIG51bWJlcnNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oNSw4KS5nY2QoMyw3KSA9PiAxLzU2XG4gICAgICovXG4gICAgICBnY2Q6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG5cbiAgICAgICAgLy8gZ2NkKGEgLyBiLCBjIC8gZCkgPSBnY2QoYSwgYykgLyBsY20oYiwgZClcblxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKGdjZChQLm4sIHRoaXMubikgKiBnY2QoUC5kLCB0aGlzLmQpLCBQLmQgKiB0aGlzLmQpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmcmFjdGlvbmFsIGxjbSBvZiB0d28gcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbig1LDgpLmxjbSgzLDcpID0+IDE1XG4gICAgICovXG4gICAgICBsY206IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG5cbiAgICAgICAgLy8gbGNtKGEgLyBiLCBjIC8gZCkgPSBsY20oYSwgYykgLyBnY2QoYiwgZClcblxuICAgICAgICBpZiAoUC5uID09PSAwICYmIHRoaXMubiA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oUC5uICogdGhpcy5uLCBnY2QoUC5uLCB0aGlzLm4pICogZ2NkKFAuZCwgdGhpcy5kKSlcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIGNlaWwgb2YgYSByYXRpb25hbCBudW1iZXJcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykuY2VpbCgpID0+ICg1IC8gMSlcbiAgICAgKiovXG4gICAgICBjZWlsOiBmdW5jdGlvbiAocGxhY2VzKSB7XG4gICAgICAgIHBsYWNlcyA9IE1hdGgucG93KDEwLCBwbGFjZXMgfHwgMClcblxuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihOYU4pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBGcmFjdGlvbihNYXRoLmNlaWwocGxhY2VzICogdGhpcy5zICogdGhpcy5uIC8gdGhpcy5kKSwgcGxhY2VzKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgZmxvb3Igb2YgYSByYXRpb25hbCBudW1iZXJcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oJzQuKDMpJykuZmxvb3IoKSA9PiAoNCAvIDEpXG4gICAgICoqL1xuICAgICAgZmxvb3I6IGZ1bmN0aW9uIChwbGFjZXMpIHtcbiAgICAgICAgcGxhY2VzID0gTWF0aC5wb3coMTAsIHBsYWNlcyB8fCAwKVxuXG4gICAgICAgIGlmIChpc05hTih0aGlzLm4pIHx8IGlzTmFOKHRoaXMuZCkpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE5hTilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGguZmxvb3IocGxhY2VzICogdGhpcy5zICogdGhpcy5uIC8gdGhpcy5kKSwgcGxhY2VzKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogUm91bmRzIGEgcmF0aW9uYWwgbnVtYmVyc1xuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbignNC4oMyknKS5yb3VuZCgpID0+ICg0IC8gMSlcbiAgICAgKiovXG4gICAgICByb3VuZDogZnVuY3Rpb24gKHBsYWNlcykge1xuICAgICAgICBwbGFjZXMgPSBNYXRoLnBvdygxMCwgcGxhY2VzIHx8IDApXG5cbiAgICAgICAgaWYgKGlzTmFOKHRoaXMubikgfHwgaXNOYU4odGhpcy5kKSkge1xuICAgICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTmFOKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24oTWF0aC5yb3VuZChwbGFjZXMgKiB0aGlzLnMgKiB0aGlzLm4gLyB0aGlzLmQpLCBwbGFjZXMpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBpbnZlcnNlIG9mIHRoZSBmcmFjdGlvbiwgbWVhbnMgbnVtZXJhdG9yIGFuZCBkZW51bWVyYXRvciBhcmUgZXhjaGFuZ2VkXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFstMywgNF0pLmludmVyc2UoKSA9PiAtNCAvIDNcbiAgICAgKiovXG4gICAgICBpbnZlcnNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnJhY3Rpb24odGhpcy5zICogdGhpcy5kLCB0aGlzLm4pXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBmcmFjdGlvbiB0byBzb21lIGludGVnZXIgZXhwb25lbnRcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oLTEsMikucG93KC0zKSA9PiAtOFxuICAgICAqL1xuICAgICAgcG93OiBmdW5jdGlvbiAobSkge1xuICAgICAgICBpZiAobSA8IDApIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGgucG93KHRoaXMucyAqIHRoaXMuZCwgLW0pLCBNYXRoLnBvdyh0aGlzLm4sIC1tKSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEZyYWN0aW9uKE1hdGgucG93KHRoaXMucyAqIHRoaXMubiwgbSksIE1hdGgucG93KHRoaXMuZCwgbSkpXG4gICAgICAgIH1cbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHR3byByYXRpb25hbCBudW1iZXJzIGFyZSB0aGUgc2FtZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigxOS42KS5lcXVhbHMoWzk4LCA1XSk7XG4gICAgICoqL1xuICAgICAgZXF1YWxzOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBwYXJzZShhLCBiKVxuICAgICAgICByZXR1cm4gdGhpcy5zICogdGhpcy5uICogUC5kID09PSBQLnMgKiBQLm4gKiB0aGlzLmQgLy8gU2FtZSBhcyBjb21wYXJlKCkgPT09IDBcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHR3byByYXRpb25hbCBudW1iZXJzIGFyZSB0aGUgc2FtZVxuICAgICAqXG4gICAgICogRXg6IG5ldyBGcmFjdGlvbigxOS42KS5lcXVhbHMoWzk4LCA1XSk7XG4gICAgICoqL1xuICAgICAgY29tcGFyZTogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcGFyc2UoYSwgYilcbiAgICAgICAgdmFyIHQgPSAodGhpcy5zICogdGhpcy5uICogUC5kIC0gUC5zICogUC5uICogdGhpcy5kKVxuICAgICAgICByZXR1cm4gKHQgPiAwKSAtICh0IDwgMClcbiAgICAgIH0sXG5cbiAgICAgIHNpbXBsaWZ5OiBmdW5jdGlvbiAoZXBzKSB7XG4gICAgICAvLyBGaXJzdCBuYWl2ZSBpbXBsZW1lbnRhdGlvbiwgbmVlZHMgaW1wcm92ZW1lbnRcblxuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjb250ID0gdGhpcy5hYnMoKS50b0NvbnRpbnVlZCgpXG5cbiAgICAgICAgZXBzID0gZXBzIHx8IDAuMDAxXG5cbiAgICAgICAgZnVuY3Rpb24gcmVjIChhKSB7XG4gICAgICAgICAgaWYgKGEubGVuZ3RoID09PSAxKSB7IHJldHVybiBuZXcgRnJhY3Rpb24oYVswXSkgfVxuICAgICAgICAgIHJldHVybiByZWMoYS5zbGljZSgxKSkuaW52ZXJzZSgpLmFkZChhWzBdKVxuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb250Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdmFyIHRtcCA9IHJlYyhjb250LnNsaWNlKDAsIGkgKyAxKSlcbiAgICAgICAgICBpZiAodG1wLnN1Yih0aGlzLmFicygpKS5hYnMoKS52YWx1ZU9mKCkgPCBlcHMpIHtcbiAgICAgICAgICAgIHJldHVybiB0bXAubXVsKHRoaXMucylcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHR3byByYXRpb25hbCBudW1iZXJzIGFyZSBkaXZpc2libGVcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oMTkuNikuZGl2aXNpYmxlKDEuNSk7XG4gICAgICovXG4gICAgICBkaXZpc2libGU6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHBhcnNlKGEsIGIpXG4gICAgICAgIHJldHVybiAhKCEoUC5uICogdGhpcy5kKSB8fCAoKHRoaXMubiAqIFAuZCkgJSAoUC5uICogdGhpcy5kKSkpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgZGVjaW1hbCByZXByZXNlbnRhdGlvbiBvZiB0aGUgZnJhY3Rpb25cbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCIxMDAuJzkxODIzJ1wiKS52YWx1ZU9mKCkgPT4gMTAwLjkxODIzOTE4MjM5MTgzXG4gICAgICoqL1xuICAgICAgdmFsdWVPZjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zICogdGhpcy5uIC8gdGhpcy5kXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgc3RyaW5nLWZyYWN0aW9uIHJlcHJlc2VudGF0aW9uIG9mIGEgRnJhY3Rpb24gb2JqZWN0XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiMS4nMydcIikudG9GcmFjdGlvbigpID0+IFwiNCAxLzNcIlxuICAgICAqKi9cbiAgICAgIHRvRnJhY3Rpb246IGZ1bmN0aW9uIChleGNsdWRlV2hvbGUpIHtcbiAgICAgICAgdmFyIHdob2xlOyB2YXIgc3RyID0gJydcbiAgICAgICAgdmFyIG4gPSB0aGlzLm5cbiAgICAgICAgdmFyIGQgPSB0aGlzLmRcbiAgICAgICAgaWYgKHRoaXMucyA8IDApIHtcbiAgICAgICAgICBzdHIgKz0gJy0nXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZCA9PT0gMSkge1xuICAgICAgICAgIHN0ciArPSBuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGV4Y2x1ZGVXaG9sZSAmJiAod2hvbGUgPSBNYXRoLmZsb29yKG4gLyBkKSkgPiAwKSB7XG4gICAgICAgICAgICBzdHIgKz0gd2hvbGVcbiAgICAgICAgICAgIHN0ciArPSAnICdcbiAgICAgICAgICAgIG4gJT0gZFxuICAgICAgICAgIH1cblxuICAgICAgICAgIHN0ciArPSBuXG4gICAgICAgICAgc3RyICs9ICcvJ1xuICAgICAgICAgIHN0ciArPSBkXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0clxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogUmV0dXJucyBhIGxhdGV4IHJlcHJlc2VudGF0aW9uIG9mIGEgRnJhY3Rpb24gb2JqZWN0XG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiMS4nMydcIikudG9MYXRleCgpID0+IFwiXFxmcmFjezR9ezN9XCJcbiAgICAgKiovXG4gICAgICB0b0xhdGV4OiBmdW5jdGlvbiAoZXhjbHVkZVdob2xlKSB7XG4gICAgICAgIHZhciB3aG9sZTsgdmFyIHN0ciA9ICcnXG4gICAgICAgIHZhciBuID0gdGhpcy5uXG4gICAgICAgIHZhciBkID0gdGhpcy5kXG4gICAgICAgIGlmICh0aGlzLnMgPCAwKSB7XG4gICAgICAgICAgc3RyICs9ICctJ1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGQgPT09IDEpIHtcbiAgICAgICAgICBzdHIgKz0gblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChleGNsdWRlV2hvbGUgJiYgKHdob2xlID0gTWF0aC5mbG9vcihuIC8gZCkpID4gMCkge1xuICAgICAgICAgICAgc3RyICs9IHdob2xlXG4gICAgICAgICAgICBuICU9IGRcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzdHIgKz0gJ1xcXFxmcmFjeydcbiAgICAgICAgICBzdHIgKz0gblxuICAgICAgICAgIHN0ciArPSAnfXsnXG4gICAgICAgICAgc3RyICs9IGRcbiAgICAgICAgICBzdHIgKz0gJ30nXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0clxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICogUmV0dXJucyBhbiBhcnJheSBvZiBjb250aW51ZWQgZnJhY3Rpb24gZWxlbWVudHNcbiAgICAgKlxuICAgICAqIEV4OiBuZXcgRnJhY3Rpb24oXCI3LzhcIikudG9Db250aW51ZWQoKSA9PiBbMCwxLDddXG4gICAgICovXG4gICAgICB0b0NvbnRpbnVlZDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdFxuICAgICAgICB2YXIgYSA9IHRoaXMublxuICAgICAgICB2YXIgYiA9IHRoaXMuZFxuICAgICAgICB2YXIgcmVzID0gW11cblxuICAgICAgICBpZiAoaXNOYU4odGhpcy5uKSB8fCBpc05hTih0aGlzLmQpKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc1xuICAgICAgICB9XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgIHJlcy5wdXNoKE1hdGguZmxvb3IoYSAvIGIpKVxuICAgICAgICAgIHQgPSBhICUgYlxuICAgICAgICAgIGEgPSBiXG4gICAgICAgICAgYiA9IHRcbiAgICAgICAgfSB3aGlsZSAoYSAhPT0gMSlcblxuICAgICAgICByZXR1cm4gcmVzXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGEgZnJhY3Rpb24gd2l0aCBhbGwgZGlnaXRzXG4gICAgICpcbiAgICAgKiBFeDogbmV3IEZyYWN0aW9uKFwiMTAwLic5MTgyMydcIikudG9TdHJpbmcoKSA9PiBcIjEwMC4oOTE4MjMpXCJcbiAgICAgKiovXG4gICAgICB0b1N0cmluZzogZnVuY3Rpb24gKGRlYykge1xuICAgICAgICB2YXIgZ1xuICAgICAgICB2YXIgTiA9IHRoaXMublxuICAgICAgICB2YXIgRCA9IHRoaXMuZFxuXG4gICAgICAgIGlmIChpc05hTihOKSB8fCBpc05hTihEKSkge1xuICAgICAgICAgIHJldHVybiAnTmFOJ1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFGcmFjdGlvbi5SRURVQ0UpIHtcbiAgICAgICAgICBnID0gZ2NkKE4sIEQpXG4gICAgICAgICAgTiAvPSBnXG4gICAgICAgICAgRCAvPSBnXG4gICAgICAgIH1cblxuICAgICAgICBkZWMgPSBkZWMgfHwgMTUgLy8gMTUgPSBkZWNpbWFsIHBsYWNlcyB3aGVuIG5vIHJlcGl0YXRpb25cblxuICAgICAgICB2YXIgY3ljTGVuID0gY3ljbGVMZW4oTiwgRCkgLy8gQ3ljbGUgbGVuZ3RoXG4gICAgICAgIHZhciBjeWNPZmYgPSBjeWNsZVN0YXJ0KE4sIEQsIGN5Y0xlbikgLy8gQ3ljbGUgc3RhcnRcblxuICAgICAgICB2YXIgc3RyID0gdGhpcy5zID09PSAtMSA/ICctJyA6ICcnXG5cbiAgICAgICAgc3RyICs9IE4gLyBEIHwgMFxuXG4gICAgICAgIE4gJT0gRFxuICAgICAgICBOICo9IDEwXG5cbiAgICAgICAgaWYgKE4pIHsgc3RyICs9ICcuJyB9XG5cbiAgICAgICAgaWYgKGN5Y0xlbikge1xuICAgICAgICAgIGZvciAodmFyIGkgPSBjeWNPZmY7IGktLTspIHtcbiAgICAgICAgICAgIHN0ciArPSBOIC8gRCB8IDBcbiAgICAgICAgICAgIE4gJT0gRFxuICAgICAgICAgICAgTiAqPSAxMFxuICAgICAgICAgIH1cbiAgICAgICAgICBzdHIgKz0gJygnXG4gICAgICAgICAgZm9yICh2YXIgaSA9IGN5Y0xlbjsgaS0tOykge1xuICAgICAgICAgICAgc3RyICs9IE4gLyBEIHwgMFxuICAgICAgICAgICAgTiAlPSBEXG4gICAgICAgICAgICBOICo9IDEwXG4gICAgICAgICAgfVxuICAgICAgICAgIHN0ciArPSAnKSdcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gZGVjOyBOICYmIGktLTspIHtcbiAgICAgICAgICAgIHN0ciArPSBOIC8gRCB8IDBcbiAgICAgICAgICAgIE4gJT0gRFxuICAgICAgICAgICAgTiAqPSAxMFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RyXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB1bmRlZmluZWQgPT09ICdmdW5jdGlvbicgJiYgdW5kZWZpbmVkLmFtZCkge1xuICAgICAgdW5kZWZpbmVkKFtdLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBGcmFjdGlvblxuICAgICAgfSlcbiAgICB9IGVsc2UgaWYgKCdvYmplY3QnID09PSAnb2JqZWN0Jykge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KVxuICAgICAgRnJhY3Rpb24uZGVmYXVsdCA9IEZyYWN0aW9uXG4gICAgICBGcmFjdGlvbi5GcmFjdGlvbiA9IEZyYWN0aW9uXG4gICAgICBtb2R1bGUuZXhwb3J0cyA9IEZyYWN0aW9uXG4gICAgfSBlbHNlIHtcbiAgICAgIHJvb3QuRnJhY3Rpb24gPSBGcmFjdGlvblxuICAgIH1cbiAgfSkoY29tbW9uanNIZWxwZXJzLmNvbW1vbmpzR2xvYmFsKVxufSlcblxuZXhwb3J0IGRlZmF1bHQgLyogQF9fUFVSRV9fICovY29tbW9uanNIZWxwZXJzLmdldERlZmF1bHRFeHBvcnRGcm9tQ2pzKGZyYWN0aW9uKVxuZXhwb3J0IHsgZnJhY3Rpb24gYXMgX19tb2R1bGVFeHBvcnRzIH1cbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIE1vbm9taWFsIHtcbiAgY29uc3RydWN0b3IgKGMsIHZzKSB7XG4gICAgaWYgKCFpc05hTihjKSAmJiB2cyBpbnN0YW5jZW9mIE1hcCkge1xuICAgICAgdGhpcy5jID0gY1xuICAgICAgdGhpcy52cyA9IHZzXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgYyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuaW5pdFN0cihjKVxuICAgIH0gZWxzZSBpZiAoIWlzTmFOKGMpKSB7XG4gICAgICB0aGlzLmMgPSBjXG4gICAgICB0aGlzLnZzID0gbmV3IE1hcCgpXG4gICAgfSBlbHNlIHsgLy8gZGVmYXVsdCBhcyBhIHRlc3Q6IDR4XjJ5XG4gICAgICB0aGlzLmMgPSA0XG4gICAgICB0aGlzLnZzID0gbmV3IE1hcChbWyd4JywgMl0sIFsneScsIDFdXSlcbiAgICB9XG4gIH1cblxuICBjbG9uZSAoKSB7XG4gICAgY29uc3QgdnMgPSBuZXcgTWFwKHRoaXMudnMpXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbCh0aGlzLmMsIHZzKVxuICB9XG5cbiAgbXVsICh0aGF0KSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIE1vbm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBNb25vbWlhbCh0aGF0KVxuICAgIH1cbiAgICBjb25zdCBjID0gdGhpcy5jICogdGhhdC5jXG4gICAgbGV0IHZzID0gbmV3IE1hcCgpXG4gICAgdGhpcy52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICh0aGF0LnZzLmhhcyh2YXJpYWJsZSkpIHtcbiAgICAgICAgdnMuc2V0KHZhcmlhYmxlLCB0aGlzLnZzLmdldCh2YXJpYWJsZSkgKyB0aGF0LnZzLmdldCh2YXJpYWJsZSkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2cy5zZXQodmFyaWFibGUsIHRoaXMudnMuZ2V0KHZhcmlhYmxlKSlcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhhdC52cy5mb3JFYWNoKChpbmRleCwgdmFyaWFibGUpID0+IHtcbiAgICAgIGlmICghdnMuaGFzKHZhcmlhYmxlKSkge1xuICAgICAgICB2cy5zZXQodmFyaWFibGUsIHRoYXQudnMuZ2V0KHZhcmlhYmxlKSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHZzID0gbmV3IE1hcChbLi4udnMuZW50cmllcygpXS5zb3J0KCkpXG4gICAgcmV0dXJuIG5ldyBNb25vbWlhbChjLCB2cylcbiAgfVxuXG4gIHRvTGF0ZXggKCkge1xuICAgIGlmICh0aGlzLnZzLnNpemUgPT09IDApIHJldHVybiB0aGlzLmMudG9TdHJpbmcoKVxuICAgIGxldCBzdHIgPSB0aGlzLmMgPT09IDEgPyAnJ1xuICAgICAgOiB0aGlzLmMgPT09IC0xID8gJy0nXG4gICAgICAgIDogdGhpcy5jLnRvU3RyaW5nKClcbiAgICB0aGlzLnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKGluZGV4ID09PSAxKSB7XG4gICAgICAgIHN0ciArPSB2YXJpYWJsZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyICs9IHZhcmlhYmxlICsgJ14nICsgaW5kZXhcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBzdHJcbiAgfVxuXG4gIHNvcnQgKCkge1xuICAgIC8vIHNvcnRzIChtb2RpZmllcyBvYmplY3QpXG4gICAgdGhpcy52cyA9IG5ldyBNYXAoWy4uLnRoaXMudnMuZW50cmllcygpXS5zb3J0KCkpXG4gIH1cblxuICBjbGVhblplcm9zICgpIHtcbiAgICB0aGlzLnZzLmZvckVhY2goKGlkeCwgdikgPT4ge1xuICAgICAgaWYgKGlkeCA9PT0gMCkgdGhpcy52cy5kZWxldGUodilcbiAgICB9KVxuICB9XG5cbiAgbGlrZSAodGhhdCkge1xuICAgIC8vIHJldHVybiB0cnVlIGlmIGxpa2UgdGVybXMsIGZhbHNlIGlmIG90aGVyd2lzZVxuICAgIC8vIG5vdCB0aGUgbW9zdCBlZmZpY2llbnQgYXQgdGhlIG1vbWVudCwgYnV0IGdvb2QgZW5vdWdoLlxuICAgIGlmICghKHRoYXQgaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgTW9ub21pYWwodGhhdClcbiAgICB9XG5cbiAgICBsZXQgbGlrZSA9IHRydWVcbiAgICB0aGlzLnZzLmZvckVhY2goKGluZGV4LCB2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKCF0aGF0LnZzLmhhcyh2YXJpYWJsZSkgfHwgdGhhdC52cy5nZXQodmFyaWFibGUpICE9PSBpbmRleCkge1xuICAgICAgICBsaWtlID0gZmFsc2VcbiAgICAgIH1cbiAgICB9KVxuICAgIHRoYXQudnMuZm9yRWFjaCgoaW5kZXgsIHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAoIXRoaXMudnMuaGFzKHZhcmlhYmxlKSB8fCB0aGlzLnZzLmdldCh2YXJpYWJsZSkgIT09IGluZGV4KSB7XG4gICAgICAgIGxpa2UgPSBmYWxzZVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGxpa2VcbiAgfVxuXG4gIGFkZCAodGhhdCwgY2hlY2tMaWtlKSB7XG4gICAgaWYgKCEodGhhdCBpbnN0YW5jZW9mIE1vbm9taWFsKSkge1xuICAgICAgdGhhdCA9IG5ldyBNb25vbWlhbCh0aGF0KVxuICAgIH1cbiAgICAvLyBhZGRzIHR3byBjb21wYXRpYmxlIG1vbm9taWFsc1xuICAgIC8vIGNoZWNrTGlrZSAoZGVmYXVsdCB0cnVlKSB3aWxsIGNoZWNrIGZpcnN0IGlmIHRoZXkgYXJlIGxpa2UgYW5kIHRocm93IGFuIGV4Y2VwdGlvblxuICAgIC8vIHVuZGVmaW5lZCBiZWhhdmlvdXIgaWYgY2hlY2tMaWtlIGlzIGZhbHNlXG4gICAgaWYgKGNoZWNrTGlrZSA9PT0gdW5kZWZpbmVkKSBjaGVja0xpa2UgPSB0cnVlXG4gICAgaWYgKGNoZWNrTGlrZSAmJiAhdGhpcy5saWtlKHRoYXQpKSB0aHJvdyBuZXcgRXJyb3IoJ0FkZGluZyB1bmxpa2UgdGVybXMnKVxuICAgIGNvbnN0IGMgPSB0aGlzLmMgKyB0aGF0LmNcbiAgICBjb25zdCB2cyA9IHRoaXMudnNcbiAgICByZXR1cm4gbmV3IE1vbm9taWFsKGMsIHZzKVxuICB9XG5cbiAgaW5pdFN0ciAoc3RyKSB7XG4gICAgLy8gY3VycmVudGx5IG5vIGVycm9yIGNoZWNraW5nIGFuZCBmcmFnaWxlXG4gICAgLy8gVGhpbmdzIG5vdCB0byBwYXNzIGluOlxuICAgIC8vICB6ZXJvIGluZGljZXNcbiAgICAvLyAgbXVsdGktY2hhcmFjdGVyIHZhcmlhYmxlc1xuICAgIC8vICBuZWdhdGl2ZSBpbmRpY2VzXG4gICAgLy8gIG5vbi1pbnRlZ2VyIGNvZWZmaWNpZW50c1xuICAgIGNvbnN0IGxlYWQgPSBzdHIubWF0Y2goL14tP1xcZCovKVswXVxuICAgIGNvbnN0IGMgPSBsZWFkID09PSAnJyA/IDFcbiAgICAgIDogbGVhZCA9PT0gJy0nID8gLTFcbiAgICAgICAgOiBwYXJzZUludChsZWFkKVxuICAgIGxldCB2cyA9IHN0ci5tYXRjaCgvKFthLXpBLVpdKShcXF5cXGQrKT8vZylcbiAgICBpZiAoIXZzKSB2cyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgdiA9IHZzW2ldLnNwbGl0KCdeJylcbiAgICAgIHZbMV0gPSB2WzFdID8gcGFyc2VJbnQodlsxXSkgOiAxXG4gICAgICB2c1tpXSA9IHZcbiAgICB9XG4gICAgdnMgPSB2cy5maWx0ZXIodiA9PiB2WzFdICE9PSAwKVxuICAgIHRoaXMuYyA9IGNcbiAgICB0aGlzLnZzID0gbmV3IE1hcCh2cylcbiAgfVxuXG4gIHN0YXRpYyB2YXIgKHYpIHtcbiAgICAvLyBmYWN0b3J5IGZvciBhIHNpbmdsZSB2YXJpYWJsZSBtb25vbWlhbFxuICAgIGNvbnN0IGMgPSAxXG4gICAgY29uc3QgdnMgPSBuZXcgTWFwKFtbdiwgMV1dKVxuICAgIHJldHVybiBuZXcgTW9ub21pYWwoYywgdnMpXG4gIH1cbn1cbiIsImltcG9ydCBNb25vbWlhbCBmcm9tICdNb25vbWlhbCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUG9seW5vbWlhbCB7XG4gIGNvbnN0cnVjdG9yICh0ZXJtcykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHRlcm1zKSAmJiAodGVybXNbMF0gaW5zdGFuY2VvZiBNb25vbWlhbCkpIHtcbiAgICAgIHRlcm1zLm1hcCh0ID0+IHQuY2xvbmUoKSlcbiAgICAgIHRoaXMudGVybXMgPSB0ZXJtc1xuICAgIH0gZWxzZSBpZiAoIWlzTmFOKHRlcm1zKSkge1xuICAgICAgdGhpcy5pbml0TnVtKHRlcm1zKVxuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRlcm1zID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5pbml0U3RyKHRlcm1zKVxuICAgIH1cbiAgfVxuXG4gIGluaXRTdHIgKHN0cikge1xuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9cXCstL2csICctJykgLy8gYSBob3JyaWJsZSBib2RnZVxuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC8tL2csICcrLScpIC8vIG1ha2UgbmVnYXRpdmUgdGVybXMgZXhwbGljaXQuXG4gICAgc3RyID0gc3RyLnJlcGxhY2UoL1xccy9nLCAnJykgLy8gc3RyaXAgd2hpdGVzcGFjZVxuICAgIHRoaXMudGVybXMgPSBzdHIuc3BsaXQoJysnKVxuICAgICAgLm1hcChzID0+IG5ldyBNb25vbWlhbChzKSlcbiAgICAgIC5maWx0ZXIodCA9PiB0LmMgIT09IDApXG4gIH1cblxuICBpbml0TnVtIChuKSB7XG4gICAgdGhpcy50ZXJtcyA9IFtuZXcgTW9ub21pYWwobildXG4gIH1cblxuICB0b0xhdGV4ICgpIHtcbiAgICBsZXQgc3RyID0gJydcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGVybXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChpID4gMCAmJiB0aGlzLnRlcm1zW2ldLmMgPj0gMCkge1xuICAgICAgICBzdHIgKz0gJysnXG4gICAgICB9XG4gICAgICBzdHIgKz0gdGhpcy50ZXJtc1tpXS50b0xhdGV4KClcbiAgICB9XG4gICAgcmV0dXJuIHN0clxuICB9XG5cbiAgdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiB0aGlzLnRvTGFUZVgoKVxuICB9XG5cbiAgY2xvbmUgKCkge1xuICAgIGNvbnN0IHRlcm1zID0gdGhpcy50ZXJtcy5tYXAodCA9PiB0LmNsb25lKCkpXG4gICAgcmV0dXJuIG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuICB9XG5cbiAgc2ltcGxpZnkgKCkge1xuICAgIC8vIGNvbGxlY3RzIGxpa2UgdGVybXMgYW5kIHJlbW92ZXMgemVybyB0ZXJtc1xuICAgIC8vIGRvZXMgbm90IG1vZGlmeSBvcmlnaW5hbFxuICAgIC8vIFRoaXMgc2VlbXMgcHJvYmFibHkgaW5lZmZpY2llbnQsIGdpdmVuIHRoZSBkYXRhIHN0cnVjdHVyZVxuICAgIC8vIFdvdWxkIGJlIGJldHRlciB0byB1c2Ugc29tZXRoaW5nIGxpa2UgYSBsaW5rZWQgbGlzdCBtYXliZT9cbiAgICBjb25zdCB0ZXJtcyA9IHRoaXMudGVybXMuc2xpY2UoKVxuICAgIGxldCBuZXd0ZXJtcyA9IFtdXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0ZXJtcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCF0ZXJtc1tpXSkgY29udGludWVcbiAgICAgIGxldCBuZXd0ZXJtID0gdGVybXNbaV1cbiAgICAgIGZvciAobGV0IGogPSBpICsgMTsgaiA8IHRlcm1zLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmICghdGVybXNbal0pIGNvbnRpbnVlXG4gICAgICAgIGlmICh0ZXJtc1tqXS5saWtlKHRlcm1zW2ldKSkge1xuICAgICAgICAgIG5ld3Rlcm0gPSBuZXd0ZXJtLmFkZCh0ZXJtc1tqXSlcbiAgICAgICAgICB0ZXJtc1tqXSA9IG51bGxcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbmV3dGVybXMucHVzaChuZXd0ZXJtKVxuICAgICAgdGVybXNbaV0gPSBudWxsXG4gICAgfVxuICAgIG5ld3Rlcm1zID0gbmV3dGVybXMuZmlsdGVyKHQgPT4gdC5jICE9PSAwKVxuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbChuZXd0ZXJtcylcbiAgfVxuXG4gIGFkZCAodGhhdCwgc2ltcGxpZnkpIHtcbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgUG9seW5vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgUG9seW5vbWlhbCh0aGF0KVxuICAgIH1cbiAgICBpZiAoc2ltcGxpZnkgPT09IHVuZGVmaW5lZCkgc2ltcGxpZnkgPSB0cnVlXG4gICAgY29uc3QgdGVybXMgPSB0aGlzLnRlcm1zLmNvbmNhdCh0aGF0LnRlcm1zKVxuICAgIGxldCByZXN1bHQgPSBuZXcgUG9seW5vbWlhbCh0ZXJtcylcblxuICAgIGlmIChzaW1wbGlmeSkgcmVzdWx0ID0gcmVzdWx0LnNpbXBsaWZ5KClcblxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIG11bCAodGhhdCwgc2ltcGxpZnkpIHtcbiAgICBpZiAoISh0aGF0IGluc3RhbmNlb2YgUG9seW5vbWlhbCkpIHtcbiAgICAgIHRoYXQgPSBuZXcgUG9seW5vbWlhbCh0aGF0KVxuICAgIH1cbiAgICBjb25zdCB0ZXJtcyA9IFtdXG4gICAgaWYgKHNpbXBsaWZ5ID09PSB1bmRlZmluZWQpIHNpbXBsaWZ5ID0gdHJ1ZVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50ZXJtcy5sZW5ndGg7IGkrKykge1xuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB0aGF0LnRlcm1zLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHRlcm1zLnB1c2godGhpcy50ZXJtc1tpXS5tdWwodGhhdC50ZXJtc1tqXSkpXG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IHJlc3VsdCA9IG5ldyBQb2x5bm9taWFsKHRlcm1zKVxuICAgIGlmIChzaW1wbGlmeSkgcmVzdWx0ID0gcmVzdWx0LnNpbXBsaWZ5KClcblxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIHBvdyAobiwgc2ltcGxpZnkpIHtcbiAgICBsZXQgcmVzdWx0ID0gdGhpc1xuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbjsgaSsrKSB7XG4gICAgICByZXN1bHQgPSByZXN1bHQubXVsKHRoaXMpXG4gICAgfVxuICAgIGlmIChzaW1wbGlmeSkgcmVzdWx0ID0gcmVzdWx0LnNpbXBsaWZ5KClcbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICBzdGF0aWMgdmFyICh2KSB7XG4gICAgLy8gZmFjdG9yeSBmb3IgYSBzaW5nbGUgdmFyaWFibGUgcG9seW5vbWlhbFxuICAgIGNvbnN0IHRlcm1zID0gW01vbm9taWFsLnZhcih2KV1cbiAgICByZXR1cm4gbmV3IFBvbHlub21pYWwodGVybXMpXG4gIH1cblxuICBzdGF0aWMgeCAoKSB7XG4gICAgcmV0dXJuIFBvbHlub21pYWwudmFyKCd4JylcbiAgfVxuXG4gIHN0YXRpYyBjb25zdCAobikge1xuICAgIHJldHVybiBuZXcgUG9seW5vbWlhbChuKVxuICB9XG59XG4iLCJpbXBvcnQgeyBHcmFwaGljUSwgR3JhcGhpY1FWaWV3IH0gZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvR3JhcGhpY1EnXG5pbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgRnJhY3Rpb24gZnJvbSAndmVuZG9yL2ZyYWN0aW9uJ1xuaW1wb3J0IFBvbHlub21pYWwgZnJvbSAnUG9seW5vbWlhbCdcbmltcG9ydCB7IHJhbmRFbGVtLCByYW5kQmV0d2VlbiwgcmFuZEJldHdlZW5GaWx0ZXIsIGdjZCB9IGZyb20gJ1V0aWxpdGllcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXJpdGhtYWdvblEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGNvbnN0cnVjdG9yIChvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucykgLy8gcHJvY2Vzc2VzIG9wdGlvbnMgaW50byB0aGlzLnNldHRpbmdzXG4gICAgdGhpcy5kYXRhID0gbmV3IEFyaXRobWFnb25RRGF0YSh0aGlzLnNldHRpbmdzKVxuICAgIHRoaXMudmlldyA9IG5ldyBBcml0aG1hZ29uUVZpZXcodGhpcy5kYXRhLCB0aGlzLnNldHRpbmdzKVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7IHJldHVybiAnQ29tcGxldGUgdGhlIGFyaXRobWFnb246JyB9XG59XG5cbkFyaXRobWFnb25RLm9wdGlvbnNTcGVjID0gW1xuICB7XG4gICAgdGl0bGU6ICdWZXJ0aWNlcycsXG4gICAgaWQ6ICduJyxcbiAgICB0eXBlOiAnaW50JyxcbiAgICBtaW46IDMsXG4gICAgbWF4OiAyMCxcbiAgICBkZWZhdWx0OiAzXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1R5cGUnLFxuICAgIGlkOiAndHlwZScsXG4gICAgdHlwZTogJ3NlbGVjdC1leGNsdXNpdmUnLFxuICAgIHNlbGVjdE9wdGlvbnM6IFtcbiAgICAgIHsgdGl0bGU6ICdJbnRlZ2VyICgrKScsIGlkOiAnaW50ZWdlci1hZGQnIH0sXG4gICAgICB7IHRpdGxlOiAnSW50ZWdlciAoXFx1MDBkNyknLCBpZDogJ2ludGVnZXItbXVsdGlwbHknIH0sXG4gICAgICB7IHRpdGxlOiAnRnJhY3Rpb24gKCspJywgaWQ6ICdmcmFjdGlvbi1hZGQnIH0sXG4gICAgICB7IHRpdGxlOiAnRnJhY3Rpb24gKFxcdTAwZDcpJywgaWQ6ICdmcmFjdGlvbi1tdWx0aXBseScgfSxcbiAgICAgIHsgdGl0bGU6ICdBbGdlYnJhICgrKScsIGlkOiAnYWxnZWJyYS1hZGQnIH0sXG4gICAgICB7IHRpdGxlOiAnQWxnZWJyYSAoXFx1MDBkNyknLCBpZDogJ2FsZ2VicmEtbXVsdGlwbHknIH1cbiAgICBdLFxuICAgIGRlZmF1bHQ6ICdpbnRlZ2VyLWFkZCcsXG4gICAgdmVydGljYWw6IHRydWVcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnUHV6emxlIHR5cGUnLFxuICAgIHR5cGU6ICdzZWxlY3QtZXhjbHVzaXZlJyxcbiAgICBpZDogJ3B1el9kaWZmJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbXG4gICAgICB7IHRpdGxlOiAnTWlzc2luZyBlZGdlcycsIGlkOiAnMScgfSxcbiAgICAgIHsgdGl0bGU6ICdNaXhlZCcsIGlkOiAnMicgfSxcbiAgICAgIHsgdGl0bGU6ICdNaXNzaW5nIHZlcnRpY2VzJywgaWQ6ICczJyB9XG4gICAgXSxcbiAgICBkZWZhdWx0OiAnMSdcbiAgfVxuXVxuXG5jbGFzcyBBcml0aG1hZ29uUURhdGEgLyogZXh0ZW5kcyBHcmFwaGljUURhdGEgKi8ge1xuICAvLyBUT0RPIHNpbXBsaWZ5IGNvbnN0cnVjdG9yLiBNb3ZlIGxvZ2ljIGludG8gc3RhdGljIGZhY3RvcnkgbWV0aG9kc1xuICBjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuICAgIC8vIDEuIFNldCBwcm9wZXJ0aWVzIGZyb20gb3B0aW9uc1xuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgbjogMywgLy8gbnVtYmVyIG9mIHZlcnRpY2VzXG4gICAgICBtaW46IC0yMCxcbiAgICAgIG1heDogMjAsXG4gICAgICBudW1fZGlmZjogMSwgLy8gY29tcGxleGl0eSBvZiB3aGF0J3MgaW4gdmVydGljZXMvZWRnZXNcbiAgICAgIHB1el9kaWZmOiAxLCAvLyAxIC0gVmVydGljZXMgZ2l2ZW4sIDIgLSB2ZXJ0aWNlcy9lZGdlczsgZ2l2ZW4gMyAtIG9ubHkgZWRnZXNcbiAgICAgIHR5cGU6ICdpbnRlZ2VyLWFkZCcgLy8gW3R5cGVdLVtvcGVyYXRpb25dIHdoZXJlIFt0eXBlXSA9IGludGVnZXIsIC4uLlxuICAgICAgLy8gYW5kIFtvcGVyYXRpb25dID0gYWRkL211bHRpcGx5XG4gICAgfVxuXG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCB0aGlzLnNldHRpbmdzLCBvcHRpb25zKVxuICAgIHRoaXMuc2V0dGluZ3MubnVtX2RpZmYgPSB0aGlzLnNldHRpbmdzLmRpZmZpY3VsdHlcbiAgICB0aGlzLnNldHRpbmdzLnB1el9kaWZmID0gcGFyc2VJbnQodGhpcy5zZXR0aW5ncy5wdXpfZGlmZikgLy8hID8gVGhpcyBzaG91bGQgaGF2ZSBiZWVuIGRvbmUgdXBzdHJlYW0uLi5cblxuICAgIHRoaXMubiA9IHRoaXMuc2V0dGluZ3MublxuICAgIHRoaXMudmVydGljZXMgPSBbXVxuICAgIHRoaXMuc2lkZXMgPSBbXVxuXG4gICAgaWYgKHRoaXMuc2V0dGluZ3MudHlwZS5lbmRzV2l0aCgnYWRkJykpIHtcbiAgICAgIHRoaXMub3BuYW1lID0gJysnXG4gICAgICB0aGlzLm9wID0gKHgsIHkpID0+IHguYWRkKHkpXG4gICAgfSBlbHNlIGlmICh0aGlzLnNldHRpbmdzLnR5cGUuZW5kc1dpdGgoJ211bHRpcGx5JykpIHtcbiAgICAgIHRoaXMub3BuYW1lID0gJ1xcdTAwZDcnXG4gICAgICB0aGlzLm9wID0gKHgsIHkpID0+IHgubXVsKHkpXG4gICAgfVxuXG4gICAgLy8gMi4gSW5pdGlhbGlzZSBiYXNlZCBvbiB0eXBlXG4gICAgc3dpdGNoICh0aGlzLnNldHRpbmdzLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2ludGVnZXItYWRkJzpcbiAgICAgIGNhc2UgJ2ludGVnZXItbXVsdGlwbHknOlxuICAgICAgICB0aGlzLmluaXRJbnRlZ2VyKHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdmcmFjdGlvbi1hZGQnOlxuICAgICAgICB0aGlzLmluaXRGcmFjdGlvbkFkZCh0aGlzLnNldHRpbmdzKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnZnJhY3Rpb24tbXVsdGlwbHknOlxuICAgICAgICB0aGlzLmluaXRGcmFjdGlvbk11bHRpcGx5KHRoaXMuc2V0dGluZ3MpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdhbGdlYnJhLWFkZCc6XG4gICAgICAgIHRoaXMuaW5pdEFsZ2VicmFBZGQodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2FsZ2VicmEtbXVsdGlwbHknOlxuICAgICAgICB0aGlzLmluaXRBbGdlYnJhTXVsdGlwbHkodGhpcy5zZXR0aW5ncylcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5leHBlY3RlZCBzd2l0Y2ggZGVmYXVsdCcpXG4gICAgfVxuXG4gICAgdGhpcy5jYWxjdWxhdGVFZGdlcygpIC8vIFVzZSBvcCBmdW5jdGlvbnMgdG8gZmlsbCBpbiB0aGUgZWRnZXNcbiAgICB0aGlzLmhpZGVMYWJlbHModGhpcy5zZXR0aW5ncy5wdXpfZGlmZikgLy8gc2V0IHNvbWUgdmVydGljZXMvZWRnZXMgYXMgaGlkZGVuIGRlcGVuZGluZyBvbiBkaWZmaWN1bHR5XG4gIH1cblxuICAvKiBNZXRob2RzIGluaXRpYWxpc2luZyB2ZXJ0aWNlcyAqL1xuXG4gIGluaXRJbnRlZ2VyIChzZXR0aW5ncykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgIHRoaXMudmVydGljZXNbaV0gPSB7XG4gICAgICAgIHZhbDogbmV3IEZyYWN0aW9uKHJhbmRCZXR3ZWVuRmlsdGVyKFxuICAgICAgICAgIHNldHRpbmdzLm1pbixcbiAgICAgICAgICBzZXR0aW5ncy5tYXgsXG4gICAgICAgICAgeCA9PiAoc2V0dGluZ3MudHlwZS5lbmRzV2l0aCgnYWRkJykgfHwgeCAhPT0gMClcbiAgICAgICAgKSksXG4gICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0RnJhY3Rpb25BZGQgKHNldHRpbmdzKSB7XG4gICAgLyogRGlmZmljdWx0eSBzZXR0aW5nczpcbiAgICAgKiAxOiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggc2FtZSBkZW5vbWluYXRvciwgbm8gY2FuY2VsbGluZyBhZnRlciBET05FXG4gICAgICogMjogcHJvcGVyIGZyYWN0aW9ucyB3aXRoIHNhbWUgZGVub21pbmF0b3IsIG5vIGNhbmNlbGxsaW5nIGFuc3dlciBpbXByb3BlciBmcmFjdGlvblxuICAgICAqIDM6IHByb3BlciBmcmFjdGlvbnMgd2l0aCBvbmUgZGVub21pbmF0b3IgYSBtdWx0aXBsZSBvZiBhbm90aGVyLCBnaXZlcyBwcm9wZXIgZnJhY3Rpb25cbiAgICAgKiA0OiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggb25lIGRlbm9taW5hdG9yIGEgbXVsdGlwbGUgb2YgYW5vdGhlciwgZ2l2ZXMgaW1wcm9wZXIgZnJhY3Rpb25cbiAgICAgKiA1OiBwcm9wZXIgZnJhY3Rpb25zIHdpdGggZGlmZmVyZW50IGRlbm9taW5hdG9ycyAobm90IGNvLXByaW1lKSwgZ2l2ZXMgaW1wcm9wZXIgZnJhY3Rpb25cbiAgICAgKiA2OiBtaXhlZCBudW1iZXJzXG4gICAgICogNzogbWl4ZWQgbnVtYmVycywgYmlnZ2VyIG51bWVyYXRvcnMgYW5kIGRlbm9taW5hdG9yc1xuICAgICAqIDg6IG1peGVkIG51bWJlcnMsIGJpZyBpbnRlZ2VyIHBhcnRzXG4gICAgICovXG5cbiAgICAvLyBUT0RPIC0gYW55dGhpbmcgb3RoZXIgdGhhbiBkaWZmaWN1bHR5IDEuXG4gICAgY29uc3QgZGlmZiA9IHNldHRpbmdzLm51bV9kaWZmXG4gICAgaWYgKGRpZmYgPCAzKSB7XG4gICAgICBjb25zdCBkZW4gPSByYW5kRWxlbShbNSwgNywgOSwgMTEsIDEzLCAxN10pXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHByZXZudW0gPSB0aGlzLnZlcnRpY2VzW2kgLSAxXVxuICAgICAgICAgID8gdGhpcy52ZXJ0aWNlc1tpIC0gMV0udmFsLm4gOiB1bmRlZmluZWRcbiAgICAgICAgY29uc3QgbmV4dG51bSA9IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbKGkgKyAxKSAlIHRoaXMubl0udmFsLm4gOiB1bmRlZmluZWRcblxuICAgICAgICBjb25zdCBtYXhudW0gPVxuICAgICAgICAgIGRpZmYgPT09IDIgPyBkZW4gLSAxXG4gICAgICAgICAgICA6IG5leHRudW0gPyBkZW4gLSBNYXRoLm1heChuZXh0bnVtLCBwcmV2bnVtKVxuICAgICAgICAgICAgICA6IHByZXZudW0gPyBkZW4gLSBwcmV2bnVtXG4gICAgICAgICAgICAgICAgOiBkZW4gLSAxXG5cbiAgICAgICAgY29uc3QgbnVtID0gcmFuZEJldHdlZW5GaWx0ZXIoMSwgbWF4bnVtLCB4ID0+IChcbiAgICAgICAgICAvLyBFbnN1cmVzIG5vIHNpbXBsaWZpbmcgYWZ0ZXJ3YXJkcyBpZiBkaWZmaWN1bHR5IGlzIDFcbiAgICAgICAgICBnY2QoeCwgZGVuKSA9PT0gMSAmJlxuICAgICAgICAgICghcHJldm51bSB8fCBnY2QoeCArIHByZXZudW0sIGRlbikgPT09IDEgfHwgeCArIHByZXZudW0gPT09IGRlbikgJiZcbiAgICAgICAgICAoIW5leHRudW0gfHwgZ2NkKHggKyBuZXh0bnVtLCBkZW4pID09PSAxIHx8IHggKyBuZXh0bnVtID09PSBkZW4pXG4gICAgICAgICkpXG5cbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihudW0sIGRlbiksXG4gICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGRlbmJhc2UgPSByYW5kRWxlbShcbiAgICAgICAgZGlmZiA8IDcgPyBbMiwgMywgNV0gOiBbMiwgMywgNCwgNSwgNiwgNywgOCwgOSwgMTAsIDExXVxuICAgICAgKVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICBjb25zdCBwcmV2ID0gdGhpcy52ZXJ0aWNlc1tpIC0gMV1cbiAgICAgICAgICA/IHRoaXMudmVydGljZXNbaSAtIDFdLnZhbCA6IHVuZGVmaW5lZFxuICAgICAgICBjb25zdCBuZXh0ID0gdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXVxuICAgICAgICAgID8gdGhpcy52ZXJ0aWNlc1soaSArIDEpICUgdGhpcy5uXS52YWwgOiB1bmRlZmluZWRcblxuICAgICAgICBjb25zdCBtYXhtdWx0aXBsaWVyID0gZGlmZiA8IDcgPyA0IDogOFxuXG4gICAgICAgIGNvbnN0IG11bHRpcGxpZXIgPVxuICAgICAgICAgIGkgJSAyID09PSAxIHx8IGRpZmYgPiA0ID8gcmFuZEJldHdlZW5GaWx0ZXIoMiwgbWF4bXVsdGlwbGllciwgeCA9PlxuICAgICAgICAgICAgKCFwcmV2IHx8IHggIT09IHByZXYuZCAvIGRlbmJhc2UpICYmXG4gICAgICAgICAgICAoIW5leHQgfHwgeCAhPT0gbmV4dC5kIC8gZGVuYmFzZSlcbiAgICAgICAgICApIDogMVxuXG4gICAgICAgIGNvbnN0IGRlbiA9IGRlbmJhc2UgKiBtdWx0aXBsaWVyXG5cbiAgICAgICAgbGV0IG51bVxuICAgICAgICBpZiAoZGlmZiA8IDYpIHtcbiAgICAgICAgICBudW0gPSByYW5kQmV0d2VlbkZpbHRlcigxLCBkZW4gLSAxLCB4ID0+IChcbiAgICAgICAgICAgIGdjZCh4LCBkZW4pID09PSAxICYmXG4gICAgICAgICAgICAoZGlmZiA+PSA0IHx8ICFwcmV2IHx8IHByZXYuYWRkKHgsIGRlbikgPD0gMSkgJiZcbiAgICAgICAgICAgIChkaWZmID49IDQgfHwgIW5leHQgfHwgbmV4dC5hZGQoeCwgZGVuKSA8PSAxKVxuICAgICAgICAgICkpXG4gICAgICAgIH0gZWxzZSBpZiAoZGlmZiA8IDgpIHtcbiAgICAgICAgICBudW0gPSByYW5kQmV0d2VlbkZpbHRlcihkZW4gKyAxLCBkZW4gKiA2LCB4ID0+IGdjZCh4LCBkZW4pID09PSAxKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG51bSA9IHJhbmRCZXR3ZWVuRmlsdGVyKGRlbiAqIDEwLCBkZW4gKiAxMDAsIHggPT4gZ2NkKHgsIGRlbikgPT09IDEpXG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgIHZhbDogbmV3IEZyYWN0aW9uKG51bSwgZGVuKSxcbiAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0RnJhY3Rpb25NdWx0aXBseSAoc2V0dGluZ3MpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICBjb25zdCBkID0gcmFuZEJldHdlZW4oMiwgMTApXG4gICAgICBjb25zdCBuID0gcmFuZEJldHdlZW4oMSwgZCAtIDEpXG4gICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICB2YWw6IG5ldyBGcmFjdGlvbihuLCBkKSxcbiAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRBbGdlYnJhQWRkIChzZXR0aW5ncykge1xuICAgIGNvbnN0IGRpZmYgPSBzZXR0aW5ncy5udW1fZGlmZlxuICAgIHN3aXRjaCAoZGlmZikge1xuICAgICAgY2FzZSAxOiB7XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvZWZmID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbChjb2VmZiArIHZhcmlhYmxlKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjpcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgaWYgKE1hdGgucmFuZG9tKCkgPCAwLjUpIHsgLy8gdmFyaWFibGUgKyBjb25zdGFudFxuICAgICAgICAgIGNvbnN0IHZhcmlhYmxlID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgICBjb25zdCBjb25zdGFudCA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgICB2YWw6IG5ldyBQb2x5bm9taWFsKGNvZWZmICsgdmFyaWFibGUgKyAnKycgKyBjb25zdGFudCksXG4gICAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgdmFyaWFibGUxID0gU3RyaW5nLmZyb21DaGFyQ29kZShyYW5kQmV0d2Vlbig5NywgMTIyKSlcbiAgICAgICAgICBsZXQgdmFyaWFibGUyID0gdmFyaWFibGUxXG4gICAgICAgICAgd2hpbGUgKHZhcmlhYmxlMiA9PT0gdmFyaWFibGUxKSB7XG4gICAgICAgICAgICB2YXJpYWJsZTIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGNvZWZmMSA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgICBjb25zdCBjb2VmZjIgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbChjb2VmZjEgKyB2YXJpYWJsZTEgKyAnKycgKyBjb2VmZjIgKyB2YXJpYWJsZTIpLFxuICAgICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEFsZ2VicmFNdWx0aXBseSAoc2V0dGluZ3MpIHtcbiAgICAvKiBEaWZmaWN1bHR5OlxuICAgICAqIDE6IEFsdGVybmF0ZSAzYSB3aXRoIDRcbiAgICAgKiAyOiBBbGwgdGVybXMgb2YgdGhlIGZvcm0gbnYgLSB1cCB0byB0d28gdmFyaWFibGVzXG4gICAgICogMzogQWxsIHRlcm1zIG9mIHRoZSBmb3JtIG52Xm0uIE9uZSB2YXJpYWJsZSBvbmx5XG4gICAgICogNDogQUxsIHRlcm1zIG9mIHRoZSBmb3JtIG54XmsgeV5sIHpecC4gayxsLHAgMC0zXG4gICAgICogNTogRXhwYW5kIGJyYWNrZXRzIDMoMngrNSlcbiAgICAgKiA2OiBFeHBhbmQgYnJhY2tldHMgM3goMngrNSlcbiAgICAgKiA3OiBFeHBhbmQgYnJhY2tldHMgM3heMnkoMnh5KzV5XjIpXG4gICAgICogODogRXhwYW5kIGJyYWNrZXRzICh4KzMpKHgrMilcbiAgICAgKiA5OiBFeHBhbmQgYnJhY2tldHMgKDJ4LTMpKDN4KzQpXG4gICAgICogMTA6IEV4cGFuZCBicmFja2V0cyAoMnheMi0zeCs0KSgyeC01KVxuICAgICAqL1xuICAgIGNvbnN0IGRpZmYgPSBzZXR0aW5ncy5udW1fZGlmZlxuICAgIHN3aXRjaCAoZGlmZikge1xuICAgICAgY2FzZSAxOlxuICAgICAge1xuICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb2VmZiA9IHJhbmRCZXR3ZWVuKDEsIDEwKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgdGVybSA9IGkgJSAyID09PSAwID8gY29lZmYgOiBjb2VmZiArIHZhcmlhYmxlXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgMjoge1xuICAgICAgICBjb25zdCB2YXJpYWJsZTEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBjb25zdCB2YXJpYWJsZTIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IHZhcmlhYmxlID0gcmFuZEVsZW0oW3ZhcmlhYmxlMSwgdmFyaWFibGUyXSlcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbChjb2VmZiArIHZhcmlhYmxlKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSAzOiB7XG4gICAgICAgIGNvbnN0IHYgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IGlkeCA9IHJhbmRCZXR3ZWVuKDEsIDMpLnRvU3RyaW5nKClcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbChjb2VmZiArIHYgKyAnXicgKyBpZHgpLFxuICAgICAgICAgICAgaGlkZGVuOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICBjYXNlIDQ6IHtcbiAgICAgICAgY29uc3Qgc3RhcnRBc2NpaSA9IHJhbmRCZXR3ZWVuKDk3LCAxMjApXG4gICAgICAgIGNvbnN0IHYxID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpKVxuICAgICAgICBjb25zdCB2MiA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RhcnRBc2NpaSArIDEpXG4gICAgICAgIGNvbnN0IHYzID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpICsgMilcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGEgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4xID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4yID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IG4zID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IHRlcm0gPSBhICsgdjEgKyBuMSArIHYyICsgbjIgKyB2MyArIG4zXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodGVybSksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIGNhc2UgNTpcbiAgICAgIGNhc2UgNjogeyAvLyBlLmcuIDMoeCkgKiAoMngtNSlcbiAgICAgICAgY29uc3QgdmFyaWFibGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJhbmRCZXR3ZWVuKDk3LCAxMjIpKVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29lZmYgPSByYW5kQmV0d2VlbigxLCAxMCkudG9TdHJpbmcoKVxuICAgICAgICAgIGNvbnN0IGNvbnN0YW50ID0gcmFuZEJldHdlZW4oLTksIDkpLnRvU3RyaW5nKClcbiAgICAgICAgICBsZXQgdGVybSA9IGNvZWZmXG4gICAgICAgICAgaWYgKGRpZmYgPT09IDYgfHwgaSAlIDIgPT09IDEpIHRlcm0gKz0gdmFyaWFibGVcbiAgICAgICAgICBpZiAoaSAlIDIgPT09IDEpIHRlcm0gKz0gJysnICsgY29uc3RhbnRcbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh0ZXJtKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSA3OiB7IC8vIGUuZy4gM3heMnkoNHh5XjIrNXh5KVxuICAgICAgICBjb25zdCBzdGFydEFzY2lpID0gcmFuZEJldHdlZW4oOTcsIDEyMClcbiAgICAgICAgY29uc3QgdjEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0YXJ0QXNjaWkpXG4gICAgICAgIGNvbnN0IHYyID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGFydEFzY2lpICsgMSlcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgICAgIGNvbnN0IGExID0gcmFuZEJldHdlZW4oMSwgMTApLnRvU3RyaW5nKClcbiAgICAgICAgICBjb25zdCBuMTEgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgY29uc3QgbjEyID0gJ14nICsgcmFuZEJldHdlZW4oMCwgMykudG9TdHJpbmcoKVxuICAgICAgICAgIGxldCB0ZXJtID0gYTEgKyB2MSArIG4xMSArIHYyICsgbjEyXG4gICAgICAgICAgaWYgKGkgJSAyID09PSAxKSB7XG4gICAgICAgICAgICBjb25zdCBhMiA9IHJhbmRCZXR3ZWVuKC05LCA5KS50b1N0cmluZygpXG4gICAgICAgICAgICBjb25zdCBuMjEgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgICBjb25zdCBuMjIgPSAnXicgKyByYW5kQmV0d2VlbigwLCAzKS50b1N0cmluZygpXG4gICAgICAgICAgICB0ZXJtICs9ICcrJyArIGEyICsgdjEgKyBuMjEgKyB2MiArIG4yMlxuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0ge1xuICAgICAgICAgICAgdmFsOiBuZXcgUG9seW5vbWlhbCh0ZXJtKSxcbiAgICAgICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY2FzZSA4OiAvLyB7IGUuZy4gKHgrNSkgKiAoeC0yKVxuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBjb25zdCB2YXJpYWJsZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmFuZEJldHdlZW4oOTcsIDEyMikpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5uOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBjb25zdGFudCA9IHJhbmRCZXR3ZWVuKC05LCA5KS50b1N0cmluZygpXG4gICAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IHtcbiAgICAgICAgICAgIHZhbDogbmV3IFBvbHlub21pYWwodmFyaWFibGUgKyAnKycgKyBjb25zdGFudCksXG4gICAgICAgICAgICBoaWRkZW46IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyogTWV0aG9kIHRvIGNhbGN1bGF0ZSBlZGdlcyBmcm9tIHZlcnRpY2VzICovXG4gIGNhbGN1bGF0ZUVkZ2VzICgpIHtcbiAgICAvLyBDYWxjdWxhdGUgdGhlIGVkZ2VzIGdpdmVuIHRoZSB2ZXJ0aWNlcyB1c2luZyB0aGlzLm9wXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuICAgICAgdGhpcy5zaWRlc1tpXSA9IHtcbiAgICAgICAgdmFsOiB0aGlzLm9wKHRoaXMudmVydGljZXNbaV0udmFsLCB0aGlzLnZlcnRpY2VzWyhpICsgMSkgJSB0aGlzLm5dLnZhbCksXG4gICAgICAgIGhpZGRlbjogZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiBNYXJrIGhpZGRlbmQgZWRnZXMvdmVydGljZXMgKi9cblxuICBoaWRlTGFiZWxzIChwdXp6bGVEaWZmaWN1bHR5KSB7XG4gICAgLy8gSGlkZSBzb21lIGxhYmVscyB0byBtYWtlIGEgcHV6emxlXG4gICAgLy8gMSAtIFNpZGVzIGhpZGRlbiwgdmVydGljZXMgc2hvd25cbiAgICAvLyAyIC0gU29tZSBzaWRlcyBoaWRkZW4sIHNvbWUgdmVydGljZXMgaGlkZGVuXG4gICAgLy8gMyAtIEFsbCB2ZXJ0aWNlcyBoaWRkZW5cbiAgICBzd2l0Y2ggKHB1enpsZURpZmZpY3VsdHkpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgdGhpcy5zaWRlcy5mb3JFYWNoKHggPT4geyB4LmhpZGRlbiA9IHRydWUgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjoge1xuICAgICAgICB0aGlzLnNpZGVzLmZvckVhY2goeCA9PiB7IHguaGlkZGVuID0gdHJ1ZSB9KVxuICAgICAgICBjb25zdCBzaG93c2lkZSA9IHJhbmRCZXR3ZWVuKDAsIHRoaXMubiAtIDEsIE1hdGgucmFuZG9tKVxuICAgICAgICBjb25zdCBoaWRldmVydCA9IE1hdGgucmFuZG9tKCkgPCAwLjVcbiAgICAgICAgICA/IHNob3dzaWRlIC8vIHByZXZpb3VzIHZlcnRleFxuICAgICAgICAgIDogKHNob3dzaWRlICsgMSkgJSB0aGlzLm4gLy8gbmV4dCB2ZXJ0ZXg7XG5cbiAgICAgICAgdGhpcy5zaWRlc1tzaG93c2lkZV0uaGlkZGVuID0gZmFsc2VcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1toaWRldmVydF0uaGlkZGVuID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAzOlxuICAgICAgICB0aGlzLnZlcnRpY2VzLmZvckVhY2goeCA9PiB7IHguaGlkZGVuID0gdHJ1ZSB9KVxuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdub19kaWZmaWN1bHR5JylcbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgQXJpdGhtYWdvblFWaWV3IGV4dGVuZHMgR3JhcGhpY1FWaWV3IHtcbiAgY29uc3RydWN0b3IgKGRhdGEsIG9wdGlvbnMpIHtcbiAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBzZXRzIHRoaXMud2lkdGggdGhpcy5oZWlnaHQsIGluaXRpYWxpc2VzIHRoaXMubGFiZWxzLCBjcmVhdGVzIGRvbSBlbGVtZW50c1xuXG4gICAgY29uc3Qgd2lkdGggPSB0aGlzLndpZHRoXG4gICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5oZWlnaHRcbiAgICBjb25zdCByID0gMC4zNSAqIE1hdGgubWluKHdpZHRoLCBoZWlnaHQpIC8vIHJhZGl1c1xuICAgIGNvbnN0IG4gPSB0aGlzLmRhdGEublxuXG4gICAgLy8gQSBwb2ludCB0byBsYWJlbCB3aXRoIHRoZSBvcGVyYXRpb25cbiAgICAvLyBBbGwgcG9pbnRzIGZpcnN0IHNldCB1cCB3aXRoICgwLDApIGF0IGNlbnRlclxuICAgIHRoaXMub3BlcmF0aW9uUG9pbnQgPSBuZXcgUG9pbnQoMCwgMClcblxuICAgIC8vIFBvc2l0aW9uIG9mIHZlcnRpY2VzXG4gICAgdGhpcy52ZXJ0ZXhQb2ludHMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBjb25zdCBhbmdsZSA9IGkgKiBNYXRoLlBJICogMiAvIG4gLSBNYXRoLlBJIC8gMlxuICAgICAgdGhpcy52ZXJ0ZXhQb2ludHNbaV0gPSBQb2ludC5mcm9tUG9sYXIociwgYW5nbGUpXG4gICAgfVxuXG4gICAgLy8gUG9pc2l0aW9uIG9mIHNpZGUgbGFiZWxzXG4gICAgdGhpcy5zaWRlUG9pbnRzID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgdGhpcy5zaWRlUG9pbnRzW2ldID0gUG9pbnQubWVhbih0aGlzLnZlcnRleFBvaW50c1tpXSwgdGhpcy52ZXJ0ZXhQb2ludHNbKGkgKyAxKSAlIG5dKVxuICAgIH1cblxuICAgIHRoaXMuYWxsUG9pbnRzID0gW3RoaXMub3BlcmF0aW9uUG9pbnRdLmNvbmNhdCh0aGlzLnZlcnRleFBvaW50cykuY29uY2F0KHRoaXMuc2lkZVBvaW50cylcblxuICAgIHRoaXMucmVDZW50ZXIoKSAvLyBSZXBvc2l0aW9uIGV2ZXJ5dGhpbmcgcHJvcGVybHlcblxuICAgIHRoaXMubWFrZUxhYmVscyh0cnVlKVxuXG4gICAgLy8gRHJhdyBpbnRvIGNhbnZhc1xuICB9XG5cbiAgcmVDZW50ZXIgKCkge1xuICAgIC8vIEZpbmQgdGhlIGNlbnRlciBvZiB0aGUgYm91bmRpbmcgYm94XG4gICAgY29uc3QgdG9wbGVmdCA9IFBvaW50Lm1pbih0aGlzLmFsbFBvaW50cylcbiAgICBjb25zdCBib3R0b21yaWdodCA9IFBvaW50Lm1heCh0aGlzLmFsbFBvaW50cylcbiAgICBjb25zdCBjZW50ZXIgPSBQb2ludC5tZWFuKHRvcGxlZnQsIGJvdHRvbXJpZ2h0KVxuXG4gICAgLy8gdHJhbnNsYXRlIHRvIHB1dCBpbiB0aGUgY2VudGVyXG4gICAgdGhpcy5hbGxQb2ludHMuZm9yRWFjaChwID0+IHtcbiAgICAgIHAudHJhbnNsYXRlKHRoaXMud2lkdGggLyAyIC0gY2VudGVyLngsIHRoaXMuaGVpZ2h0IC8gMiAtIGNlbnRlci55KVxuICAgIH0pXG4gIH1cblxuICBtYWtlTGFiZWxzICgpIHtcbiAgICAvLyB2ZXJ0aWNlc1xuICAgIHRoaXMuZGF0YS52ZXJ0aWNlcy5mb3JFYWNoKCh2LCBpKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHYudmFsLnRvTGF0ZXhcbiAgICAgICAgPyB2LnZhbC50b0xhdGV4KHRydWUpXG4gICAgICAgIDogdi52YWwudG9TdHJpbmcoKVxuICAgICAgdGhpcy5sYWJlbHMucHVzaCh7XG4gICAgICAgIHBvczogdGhpcy52ZXJ0ZXhQb2ludHNbaV0sXG4gICAgICAgIHRleHRxOiB2LmhpZGRlbiA/ICcnIDogdmFsdWUsXG4gICAgICAgIHRleHRhOiB2YWx1ZSxcbiAgICAgICAgc3R5bGVxOiAnbm9ybWFsIHZlcnRleCcsXG4gICAgICAgIHN0eWxlYTogdi5oaWRkZW4gPyAnYW5zd2VyIHZlcnRleCcgOiAnbm9ybWFsIHZlcnRleCdcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIC8vIHNpZGVzXG4gICAgdGhpcy5kYXRhLnNpZGVzLmZvckVhY2goKHYsIGkpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gdi52YWwudG9MYXRleFxuICAgICAgICA/IHYudmFsLnRvTGF0ZXgodHJ1ZSlcbiAgICAgICAgOiB2LnZhbC50b1N0cmluZygpXG4gICAgICB0aGlzLmxhYmVscy5wdXNoKHtcbiAgICAgICAgcG9zOiB0aGlzLnNpZGVQb2ludHNbaV0sXG4gICAgICAgIHRleHRxOiB2LmhpZGRlbiA/ICcnIDogdmFsdWUsXG4gICAgICAgIHRleHRhOiB2YWx1ZSxcbiAgICAgICAgc3R5bGVxOiAnbm9ybWFsIHNpZGUnLFxuICAgICAgICBzdHlsZWE6IHYuaGlkZGVuID8gJ2Fuc3dlciBzaWRlJyA6ICdub3JtYWwgc2lkZSdcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIC8vIG9wZXJhdGlvblxuICAgIHRoaXMubGFiZWxzLnB1c2goe1xuICAgICAgcG9zOiB0aGlzLm9wZXJhdGlvblBvaW50LFxuICAgICAgdGV4dHE6IHRoaXMuZGF0YS5vcG5hbWUsXG4gICAgICB0ZXh0YTogdGhpcy5kYXRhLm9wbmFtZSxcbiAgICAgIHN0eWxlcTogJ25vcm1hbCcsXG4gICAgICBzdHlsZWE6ICdub3JtYWwnXG4gICAgfSlcblxuICAgIC8vIHN0eWxpbmdcbiAgICB0aGlzLmxhYmVscy5mb3JFYWNoKGwgPT4ge1xuICAgICAgbC50ZXh0ID0gbC50ZXh0cVxuICAgICAgbC5zdHlsZSA9IGwuc3R5bGVxXG4gICAgfSlcbiAgfVxuXG4gIHJlbmRlciAoKSB7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICAgIGNvbnN0IG4gPSB0aGlzLmRhdGEublxuXG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KSAvLyBjbGVhclxuXG4gICAgY3R4LmJlZ2luUGF0aCgpXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIGNvbnN0IHAgPSB0aGlzLnZlcnRleFBvaW50c1tpXVxuICAgICAgY29uc3QgbmV4dCA9IHRoaXMudmVydGV4UG9pbnRzWyhpICsgMSkgJSBuXVxuICAgICAgY3R4Lm1vdmVUbyhwLngsIHAueSlcbiAgICAgIGN0eC5saW5lVG8obmV4dC54LCBuZXh0LnkpXG4gICAgfVxuICAgIGN0eC5zdHJva2UoKVxuICAgIGN0eC5jbG9zZVBhdGgoKVxuXG4gICAgLy8gcGxhY2UgbGFiZWxzXG4gICAgdGhpcy5yZW5kZXJMYWJlbHModHJ1ZSlcbiAgfVxuXG4gIHNob3dBbnN3ZXIgKCkge1xuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRhXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZWFcbiAgICB9KVxuICAgIHRoaXMucmVuZGVyTGFiZWxzKHRydWUpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IHRydWVcbiAgfVxuXG4gIGhpZGVBbnN3ZXIgKCkge1xuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRxXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZXFcbiAgICB9KVxuICAgIHRoaXMucmVuZGVyTGFiZWxzKHRydWUpXG4gICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gIH1cbn1cbiIsImltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCB7IHJhbmRFbGVtIH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUZXN0USBleHRlbmRzIFRleHRRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiA1LFxuICAgICAgbGFiZWw6ICdhJyxcbiAgICAgIHRlc3QxOiBbJ2ZvbyddLFxuICAgICAgdGVzdDI6IHRydWVcbiAgICB9XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIHRoaXMubGFiZWwgPSBzZXR0aW5ncy5sYWJlbFxuXG4gICAgLy8gcGljayBhIHJhbmRvbSBvbmUgb2YgdGhlIHNlbGVjdGVkXG4gICAgbGV0IHRlc3QxXG4gICAgaWYgKHNldHRpbmdzLnRlc3QxLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGVzdDEgPSAnbm9uZSdcbiAgICB9IGVsc2Uge1xuICAgICAgdGVzdDEgPSByYW5kRWxlbShzZXR0aW5ncy50ZXN0MSlcbiAgICB9XG5cbiAgICB0aGlzLnF1ZXN0aW9uTGFUZVggPSAnZDogJyArIHNldHRpbmdzLmRpZmZpY3VsdHkgKyAnXFxcXFxcXFwgdGVzdDE6ICcgKyB0ZXN0MVxuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAndGVzdDI6ICcgKyBzZXR0aW5ncy50ZXN0MlxuXG4gICAgdGhpcy5yZW5kZXIoKVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7IHJldHVybiAnVGVzdCBjb21tYW5kIHdvcmQnIH1cbn1cblxuVGVzdFEub3B0aW9uc1NwZWMgPSBbXG4gIHtcbiAgICB0aXRsZTogJ1Rlc3Qgb3B0aW9uIDEnLFxuICAgIGlkOiAndGVzdDEnLFxuICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICBzZWxlY3RPcHRpb25zOiBbJ2ZvbycsICdiYXInLCAnd2l6eiddLFxuICAgIGRlZmF1bHQ6IFtdXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1Rlc3Qgb3B0aW9uIDInLFxuICAgIGlkOiAndGVzdDInLFxuICAgIHR5cGU6ICdib29sJyxcbiAgICBkZWZhdWx0OiB0cnVlXG4gIH1cbl1cbiIsImltcG9ydCBUZXh0USBmcm9tICdRdWVzdGlvbi9UZXh0US9UZXh0USdcbmltcG9ydCB7IHJhbmRCZXR3ZWVuIH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBZGRBWmVybyBleHRlbmRzIFRleHRRIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkaWZmaWN1bHR5OiA1LFxuICAgICAgbGFiZWw6ICdhJ1xuICAgIH1cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgdGhpcy5sYWJlbCA9IHNldHRpbmdzLmxhYmVsXG5cbiAgICAvLyByYW5kb20gMiBkaWdpdCAnZGVjaW1hbCdcbiAgICBjb25zdCBxID0gU3RyaW5nKHJhbmRCZXR3ZWVuKDEsIDkpKSArIFN0cmluZyhyYW5kQmV0d2VlbigwLCA5KSkgKyAnLicgKyBTdHJpbmcocmFuZEJldHdlZW4oMCwgOSkpXG4gICAgY29uc3QgYSA9IHEgKyAnMCdcblxuICAgIHRoaXMucXVlc3Rpb25MYVRlWCA9IHEgKyAnXFxcXHRpbWVzIDEwJ1xuICAgIHRoaXMuYW5zd2VyTGFUZVggPSAnPSAnICsgYVxuXG4gICAgdGhpcy5yZW5kZXIoKVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSB7XG4gICAgcmV0dXJuICdFdmFsdWF0ZSdcbiAgfVxufVxuXG5BZGRBWmVyby5vcHRpb25zU3BlYyA9IFtcbl1cbiIsImltcG9ydCB7IHJhbmRCZXR3ZWVuIH0gZnJvbSAnVXRpbGl0aWVzJ1xuaW1wb3J0IFRleHRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL1RleHRRJ1xuaW1wb3J0IEZyYWN0aW9uIGZyb20gJ3ZlbmRvci9mcmFjdGlvbidcblxuLyogTWFpbiBxdWVzdGlvbiBjbGFzcy4gVGhpcyB3aWxsIGJlIHNwdW4gb2ZmIGludG8gZGlmZmVyZW50IGZpbGUgYW5kIGdlbmVyYWxpc2VkICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFcXVhdGlvbk9mTGluZSBleHRlbmRzIFRleHRRIHtcbiAgLy8gJ2V4dGVuZHMnIFF1ZXN0aW9uLCBidXQgbm90aGluZyB0byBhY3R1YWxseSBleHRlbmRcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICAvLyBib2lsZXJwbGF0ZVxuICAgIHN1cGVyKG9wdGlvbnMpXG5cbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRpZmZpY3VsdHk6IDJcbiAgICB9XG5cbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuICAgIGNvbnN0IGRpZmZpY3VsdHkgPSBNYXRoLmNlaWwoc2V0dGluZ3MuZGlmZmljdWx0eSAvIDIpIC8vIGluaXRpYWxseSB3cml0dGVuIGZvciBkaWZmaWN1bHR5IDEtNCwgbm93IG5lZWQgMS0xMFxuXG4gICAgLy8gcXVlc3Rpb24gZ2VuZXJhdGlvbiBiZWdpbnMgaGVyZVxuICAgIGxldCBtLCBjLCB4MSwgeTEsIHgyLCB5MlxuICAgIGxldCBtaW5tLCBtYXhtLCBtaW5jLCBtYXhjXG5cbiAgICBzd2l0Y2ggKGRpZmZpY3VsdHkpIHtcbiAgICAgIGNhc2UgMTogLy8gbT4wLCBjPj0wXG4gICAgICBjYXNlIDI6XG4gICAgICBjYXNlIDM6XG4gICAgICAgIG1pbm0gPSBkaWZmaWN1bHR5IDwgMyA/IDEgOiAtNVxuICAgICAgICBtYXhtID0gNVxuICAgICAgICBtaW5jID0gZGlmZmljdWx0eSA8IDIgPyAwIDogLTEwXG4gICAgICAgIG1heGMgPSAxMFxuICAgICAgICBtID0gcmFuZEJldHdlZW4obWlubSwgbWF4bSlcbiAgICAgICAgYyA9IHJhbmRCZXR3ZWVuKG1pbmMsIG1heGMpXG4gICAgICAgIHgxID0gZGlmZmljdWx0eSA8IDMgPyByYW5kQmV0d2VlbigwLCAxMCkgOiByYW5kQmV0d2VlbigtMTUsIDE1KVxuICAgICAgICB5MSA9IG0gKiB4MSArIGNcblxuICAgICAgICBpZiAoZGlmZmljdWx0eSA8IDMpIHtcbiAgICAgICAgICB4MiA9IHJhbmRCZXR3ZWVuKHgxICsgMSwgMTUpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgeDIgPSB4MVxuICAgICAgICAgIHdoaWxlICh4MiA9PT0geDEpIHsgeDIgPSByYW5kQmV0d2VlbigtMTUsIDE1KSB9O1xuICAgICAgICB9XG4gICAgICAgIHkyID0gbSAqIHgyICsgY1xuICAgICAgICBicmVha1xuICAgICAgY2FzZSA0OiAvLyBtIGZyYWN0aW9uLCBwb2ludHMgYXJlIGludGVnZXJzXG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGNvbnN0IG1kID0gcmFuZEJldHdlZW4oMSwgNSlcbiAgICAgICAgY29uc3QgbW4gPSByYW5kQmV0d2VlbigtNSwgNSlcbiAgICAgICAgbSA9IG5ldyBGcmFjdGlvbihtbiwgbWQpXG4gICAgICAgIHgxID0gbmV3IEZyYWN0aW9uKHJhbmRCZXR3ZWVuKC0xMCwgMTApKVxuICAgICAgICB5MSA9IG5ldyBGcmFjdGlvbihyYW5kQmV0d2VlbigtMTAsIDEwKSlcbiAgICAgICAgYyA9IG5ldyBGcmFjdGlvbih5MSkuc3ViKG0ubXVsKHgxKSlcbiAgICAgICAgeDIgPSB4MS5hZGQocmFuZEJldHdlZW4oMSwgNSkgKiBtLmQpXG4gICAgICAgIHkyID0gbS5tdWwoeDIpLmFkZChjKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHhzdHIgPVxuICAgICAgKG0gPT09IDAgfHwgKG0uZXF1YWxzICYmIG0uZXF1YWxzKDApKSkgPyAnJ1xuICAgICAgICA6IChtID09PSAxIHx8IChtLmVxdWFscyAmJiBtLmVxdWFscygxKSkpID8gJ3gnXG4gICAgICAgICAgOiAobSA9PT0gLTEgfHwgKG0uZXF1YWxzICYmIG0uZXF1YWxzKC0xKSkpID8gJy14J1xuICAgICAgICAgICAgOiAobS50b0xhdGV4KSA/IG0udG9MYXRleCgpICsgJ3gnXG4gICAgICAgICAgICAgIDogKG0gKyAneCcpXG5cbiAgICBjb25zdCBjb25zdHN0ciA9IC8vIFRPRE86IFdoZW4gbT1jPTBcbiAgICAgIChjID09PSAwIHx8IChjLmVxdWFscyAmJiBjLmVxdWFscygwKSkpID8gJydcbiAgICAgICAgOiAoYyA8IDApID8gKCcgLSAnICsgKGMubmVnID8gYy5uZWcoKS50b0xhdGV4KCkgOiAtYykpXG4gICAgICAgICAgOiAoYy50b0xhdGV4KSA/ICgnICsgJyArIGMudG9MYXRleCgpKVxuICAgICAgICAgICAgOiAoJyArICcgKyBjKVxuXG4gICAgdGhpcy5xdWVzdGlvbkxhVGVYID0gJygnICsgeDEgKyAnLCAnICsgeTEgKyAnKVxcXFx0ZXh0eyBhbmQgfSgnICsgeDIgKyAnLCAnICsgeTIgKyAnKSdcbiAgICB0aGlzLmFuc3dlckxhVGVYID0gJ3kgPSAnICsgeHN0ciArIGNvbnN0c3RyXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHtcbiAgICByZXR1cm4gJ0ZpbmQgdGhlIGVxdWF0aW9uIG9mIHRoZSBsaW5lIHRocm91Z2gnXG4gIH1cbn1cbiIsIi8qIFJlbmRlcnMgbWlzc2luZyBhbmdsZXMgcHJvYmxlbSB3aGVuIHRoZSBhbmdsZXMgYXJlIGF0IGEgcG9pbnRcbiAqIEkuZS4gb24gYSBzdHJhaWdodCBsaW5lIG9yIGFyb3VuZCBhIHBvaW50XG4gKiBDb3VsZCBhbHNvIGJlIGFkYXB0ZWQgdG8gYW5nbGVzIGZvcm1pbmcgYSByaWdodCBhbmdsZVxuICpcbiAqIFNob3VsZCBiZSBmbGV4aWJsZSBlbm91Z2ggZm9yIG51bWVyaWNhbCBwcm9ibGVtcyBvciBhbGdlYnJhaWMgb25lc1xuICpcbiAqL1xuXG5pbXBvcnQgUG9pbnQgZnJvbSAnUG9pbnQnXG5pbXBvcnQgeyBHcmFwaGljUVZpZXcgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZFZpZXcgZXh0ZW5kcyBHcmFwaGljUVZpZXcge1xuICAvLyB0aGlzLk9cbiAgLy8gdGhpcy5BXG4gIC8vIHRoaXMuQyA9IFtdXG4gIC8vIHRoaXMubGFiZWxzID0gW11cbiAgLy8gdGhpcy5jYW52YXNcbiAgLy8gdGhpcy5ET01cbiAgLy8gdGhpcy5yb3RhdGlvblxuICBjb25zdHJ1Y3RvciAoZGF0YSwgb3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIHNldHMgdGhpcy53aWR0aCB0aGlzLmhlaWdodCwgaW5pdGlhbGlzZXMgdGhpcy5sYWJlbHMsIGNyZWF0ZXMgZG9tIGVsZW1lbnRzXG4gICAgY29uc3Qgd2lkdGggPSB0aGlzLndpZHRoXG4gICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5oZWlnaHRcbiAgICBjb25zdCByYWRpdXMgPSB0aGlzLnJhZGl1cyA9IE1hdGgubWluKHdpZHRoLCBoZWlnaHQpIC8gMi41XG5cbiAgICAvLyBTZXQgdXAgbWFpbiBwb2ludHNcbiAgICB0aGlzLk8gPSBuZXcgUG9pbnQoMCwgMCkgLy8gY2VudGVyIHBvaW50XG4gICAgdGhpcy5BID0gbmV3IFBvaW50KHJhZGl1cywgMCkgLy8gZmlyc3QgcG9pbnRcbiAgICB0aGlzLkMgPSBbXSAvLyBQb2ludHMgYXJvdW5kIG91dHNpZGVcbiAgICBsZXQgdG90YWxhbmdsZSA9IDAgLy8gbmIgaW4gcmFkaWFuc1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5kYXRhLmFuZ2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdG90YWxhbmdsZSArPSB0aGlzLmRhdGEuYW5nbGVzW2ldICogTWF0aC5QSSAvIDE4MFxuICAgICAgdGhpcy5DW2ldID0gUG9pbnQuZnJvbVBvbGFyKHJhZGl1cywgdG90YWxhbmdsZSlcbiAgICB9XG5cbiAgICAvLyBTZXQgdXAgbGFiZWxzXG4gICAgdG90YWxhbmdsZSA9IDBcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZGF0YS5hbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHRoZXRhID0gdGhpcy5kYXRhLmFuZ2xlc1tpXVxuICAgICAgLyogY2FsY3VsYXRlIGRpc3RhbmNlIG91dCBmcm9tIGNlbnRlciBvZiBsYWJlbCAqL1xuICAgICAgbGV0IGQgPSAwLjRcbiAgICAgIGNvbnN0IGxhYmVsTGVuZ3RoID0gdGhpcy5kYXRhLmFuZ2xlTGFiZWxzW2ldLmxlbmd0aCAtICdeXFxcXGNpcmMnLmxlbmd0aFxuICAgICAgZCArPSAzKmxhYmVsTGVuZ3RoL3RoZXRhIC8vIGludmVyc2VseSBwcm9wb3J0aW9uYWwgdG8gYW5nbGUsIHByb3BvcnRpb25hbCB0byBsZW5naHQgb2YgbGFiZWxcbiAgICAgIGQgPSBNYXRoLm1pbihkLDEpXG4gICAgICB0aGlzLmxhYmVsc1tpXSA9IHtcbiAgICAgICAgcG9zOiBQb2ludC5mcm9tUG9sYXJEZWcocmFkaXVzICogZCwgdG90YWxhbmdsZSArIHRoZXRhIC8gMiksXG4gICAgICAgIHRleHRxOiB0aGlzLmRhdGEuYW5nbGVMYWJlbHNbaV0sXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCdcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmRhdGEubWlzc2luZ1tpXSkge1xuICAgICAgICB0aGlzLmxhYmVsc1tpXS50ZXh0YSA9IHRoaXMuZGF0YS5hbmdsZXNbaV0udG9TdHJpbmcoKSArICdeXFxcXGNpcmMnXG4gICAgICAgIHRoaXMubGFiZWxzW2ldLnN0eWxlYSA9ICdhbnN3ZXInXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmxhYmVsc1tpXS50ZXh0YSA9IHRoaXMubGFiZWxzW2ldLnRleHRxXG4gICAgICAgIHRoaXMubGFiZWxzW2ldLnN0eWxlYSA9IHRoaXMubGFiZWxzW2ldLnN0eWxlcVxuICAgICAgfVxuICAgICAgdG90YWxhbmdsZSArPSB0aGV0YVxuICAgIH1cblxuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRxXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZXFcbiAgICB9KVxuXG4gICAgLy8gUmFuZG9tbHkgcm90YXRlIGFuZCBjZW50ZXJcbiAgICB0aGlzLnJvdGF0aW9uID0gKG9wdGlvbnMucm90YXRpb24gIT09IHVuZGVmaW5lZCkgPyB0aGlzLnJvdGF0ZShvcHRpb25zLnJvdGF0aW9uKSA6IHRoaXMucmFuZG9tUm90YXRlKClcbiAgICB0aGlzLnRyYW5zbGF0ZSh3aWR0aCAvIDIgLSB0aGlzLk8ueCwgaGVpZ2h0IC8gMiAtIHRoaXMuTy55KSAvLyBjZW50cmVcbiAgfVxuXG4gIHJlbmRlciAoKSB7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuXG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KSAvLyBjbGVhclxuXG4gICAgY3R4LmJlZ2luUGF0aCgpXG4gICAgY3R4Lm1vdmVUbyh0aGlzLk8ueCwgdGhpcy5PLnkpIC8vIGRyYXcgbGluZXNcbiAgICBjdHgubGluZVRvKHRoaXMuQS54LCB0aGlzLkEueSlcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuQy5sZW5ndGg7IGkrKykge1xuICAgICAgY3R4Lm1vdmVUbyh0aGlzLk8ueCwgdGhpcy5PLnkpXG4gICAgICBjdHgubGluZVRvKHRoaXMuQ1tpXS54LCB0aGlzLkNbaV0ueSlcbiAgICB9XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gJ2dyYXknXG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBsZXQgdG90YWxhbmdsZSA9IHRoaXMucm90YXRpb25cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZGF0YS5hbmdsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHRoZXRhID0gdGhpcy5kYXRhLmFuZ2xlc1tpXSAqIE1hdGguUEkgLyAxODBcbiAgICAgIGN0eC5hcmModGhpcy5PLngsIHRoaXMuTy55LCB0aGlzLnJhZGl1cyAqICgwLjIgKyAwLjA3IC8gdGhldGEpLCB0b3RhbGFuZ2xlLCB0b3RhbGFuZ2xlICsgdGhldGEpXG4gICAgICBjdHguc3Ryb2tlKClcbiAgICAgIHRvdGFsYW5nbGUgKz0gdGhldGFcbiAgICB9XG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICAvLyB0ZXN0aW5nIGxhYmVsIHBvc2l0aW9uaW5nOlxuICAgIC8vIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgLy8gY3R4LmZpbGxTdHlsZSA9ICdyZWQnXG4gICAgLy8gY3R4LmZpbGxSZWN0KGwucG9zLnggLSAxLCBsLnBvcy55IC0gMSwgMywgMylcbiAgICAvLyB9KVxuXG4gICAgdGhpcy5yZW5kZXJMYWJlbHMoZmFsc2UpXG4gIH1cblxuICBnZXQgYWxscG9pbnRzICgpIHtcbiAgICBsZXQgYWxscG9pbnRzID0gW3RoaXMuQSwgdGhpcy5PXVxuICAgIGFsbHBvaW50cyA9IGFsbHBvaW50cy5jb25jYXQodGhpcy5DKVxuICAgIHRoaXMubGFiZWxzLmZvckVhY2goZnVuY3Rpb24gKGwpIHtcbiAgICAgIGFsbHBvaW50cy5wdXNoKGwucG9zKVxuICAgIH0pXG4gICAgcmV0dXJuIGFsbHBvaW50c1xuICB9XG59XG4iLCIvKiogR2VuZXJhdGVzIGFuZCBob2xkcyBkYXRhIGZvciBhIG1pc3NpbmcgYW5nbGVzIHF1ZXN0aW9uLCB3aGVyZSB0aGVzZSBpcyBzb21lIGdpdmVuIGFuZ2xlIHN1bVxuICogIEFnbm9zdGljIGFzIHRvIGhvdyB0aGVzZSBhbmdsZXMgYXJlIGFycmFuZ2VkIChlLmcuIGluIGEgcG9seWdvbiBvciBhcm91bmQgc29tIHBvaW50KVxuICpcbiAqIE9wdGlvbnMgcGFzc2VkIHRvIGNvbnN0cnVjdG9yczpcbiAqICBhbmdsZVN1bTo6SW50IHRoZSBudW1iZXIgb2YgYW5nbGVzIHRvIGdlbmVyYXRlXG4gKiAgbWluQW5nbGU6OkludCB0aGUgc21hbGxlc3QgYW5nbGUgdG8gZ2VuZXJhdGVcbiAqICBtaW5OOjpJbnQgICAgIHRoZSBzbWFsbGVzdCBudW1iZXIgb2YgYW5nbGVzIHRvIGdlbmVyYXRlXG4gKiAgbWF4Tjo6SW50ICAgICB0aGUgbGFyZ2VzdCBudW1iZXIgb2YgYW5nbGVzIHRvIGdlbmVyYXRlXG4gKlxuICovXG5cbmltcG9ydCB7IHJhbmRCZXR3ZWVuIH0gZnJvbSAnVXRpbGl0aWVzJ1xuaW1wb3J0IHsgR3JhcGhpY1FEYXRhfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNEYXRhIH0gZnJvbSAnLi9NaXNzaW5nQW5nbGVzRGF0YSdcbmltcG9ydCB7TnVtYmVyT3B0aW9ucyBhcyBPcHRpb25zfSBmcm9tICcuL051bWJlck9wdGlvbnMnIFxuXG5leHBvcnQgY2xhc3MgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgaW1wbGVtZW50cyBNaXNzaW5nQW5nbGVzRGF0YSB7XG4gIGFuZ2xlcyA6IG51bWJlcltdIC8vIGxpc3Qgb2YgYW5nbGVzXG4gIG1pc3NpbmcgOiBib29sZWFuW10gLy8gdHJ1ZSBpZiBtaXNzaW5nXG4gIGFuZ2xlU3VtIDogbnVtYmVyIC8vIHdoYXQgdGhlIGFuZ2xlcyBhZGQgdXAgdG9cbiAgYW5nbGVMYWJlbHM6IHN0cmluZ1tdXG5cbiAgY29uc3RydWN0b3IgKGFuZ2xlU3VtIDogbnVtYmVyLCBhbmdsZXM6IG51bWJlcltdLCBtaXNzaW5nOiBib29sZWFuW10sIGFuZ2xlTGFiZWxzPzogc3RyaW5nW10pIHtcbiAgICAvLyBpbml0aWFsaXNlcyB3aXRoIGFuZ2xlcyBnaXZlbiBleHBsaWNpdGx5XG4gICAgaWYgKGFuZ2xlcyA9PT0gW10pIHsgdGhyb3cgbmV3IEVycm9yKCdNdXN0IGdpdmUgYW5nbGVzJykgfVxuICAgIGlmIChNYXRoLnJvdW5kKGFuZ2xlcy5yZWR1Y2UoKHgsIHkpID0+IHggKyB5KSkgIT09IGFuZ2xlU3VtKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFuZ2xlIHN1bSBtdXN0IGJlICR7YW5nbGVTdW19YClcbiAgICB9XG5cbiAgICB0aGlzLmFuZ2xlcyA9IGFuZ2xlcyAvLyBsaXN0IG9mIGFuZ2xlc1xuICAgIHRoaXMubWlzc2luZyA9IG1pc3NpbmcgLy8gd2hpY2ggYW5nbGVzIGFyZSBtaXNzaW5nIC0gYXJyYXkgb2YgYm9vbGVhbnNcbiAgICB0aGlzLmFuZ2xlU3VtID0gYW5nbGVTdW0gLy8gc3VtIG9mIGFuZ2xlc1xuICAgIHRoaXMuYW5nbGVMYWJlbHMgPSBhbmdsZUxhYmVscyB8fCBbXVxuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB7XG4gICAgY29uc3QgZGVmYXVsdHMgOiBPcHRpb25zID0ge1xuICAgICAgLyogYW5nbGVTdW06IDE4MCAqLyAvLyBtdXN0IGJlIHNldCBieSBjYWxsZXJcbiAgICAgIG1pbkFuZ2xlOiAxNSxcbiAgICAgIG1pbk46IDIsXG4gICAgICBtYXhOOiA0XG4gICAgfVxuXG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gICAgbGV0IHF1ZXN0aW9uIDogTWlzc2luZ0FuZ2xlc051bWJlckRhdGFcbiAgICBpZiAob3B0aW9ucy5yZXBlYXRlZCkge1xuICAgICAgcXVlc3Rpb24gPSB0aGlzLnJhbmRvbVJlcGVhdGVkKG9wdGlvbnMpXG4gICAgfSBlbHNlIHtcbiAgICAgIHF1ZXN0aW9uID0gdGhpcy5yYW5kb21TaW1wbGUob3B0aW9ucylcbiAgICB9XG4gICAgcXVlc3Rpb24uaW5pdExhYmVscygpXG4gICAgcmV0dXJuIHF1ZXN0aW9uXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tU2ltcGxlIChvcHRpb25zOiBPcHRpb25zKTogTWlzc2luZ0FuZ2xlc051bWJlckRhdGEge1xuXG4gICAgaWYgKCFvcHRpb25zLmFuZ2xlU3VtKSB7IHRocm93IG5ldyBFcnJvcignTm8gYW5nbGUgc3VtIGdpdmVuJykgfVxuXG4gICAgY29uc3QgYW5nbGVTdW0gPSBvcHRpb25zLmFuZ2xlU3VtXG4gICAgY29uc3QgbiA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluTiwgb3B0aW9ucy5tYXhOKVxuICAgIGNvbnN0IG1pbkFuZ2xlID0gb3B0aW9ucy5taW5BbmdsZVxuXG4gICAgaWYgKG4gPCAyKSB0aHJvdyBuZXcgRXJyb3IoJ0NhblxcJ3QgaGF2ZSBtaXNzaW5nIGZld2VyIHRoYW4gMiBhbmdsZXMnKVxuXG4gICAgLy8gQnVpbGQgdXAgYW5nbGVzXG4gICAgY29uc3QgYW5nbGVzID0gW11cbiAgICBsZXQgbGVmdCA9IGFuZ2xlU3VtXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuIC0gMTsgaSsrKSB7XG4gICAgICBjb25zdCBtYXhBbmdsZSA9IGxlZnQgLSBtaW5BbmdsZSAqIChuIC0gaSAtIDEpXG4gICAgICBjb25zdCBuZXh0QW5nbGUgPSByYW5kQmV0d2VlbihtaW5BbmdsZSwgbWF4QW5nbGUpXG4gICAgICBsZWZ0IC09IG5leHRBbmdsZVxuICAgICAgYW5nbGVzLnB1c2gobmV4dEFuZ2xlKVxuICAgIH1cbiAgICBhbmdsZXNbbiAtIDFdID0gbGVmdFxuXG4gICAgLy8gcGljayBvbmUgdG8gYmUgbWlzc2luZ1xuICAgIGNvbnN0IG1pc3NpbmcgPSBbXVxuICAgIG1pc3NpbmcubGVuZ3RoID0gblxuICAgIG1pc3NpbmcuZmlsbChmYWxzZSlcbiAgICBtaXNzaW5nW3JhbmRCZXR3ZWVuKDAsIG4gLSAxKV0gPSB0cnVlXG5cbiAgICByZXR1cm4gbmV3IHRoaXMoYW5nbGVTdW0sIGFuZ2xlcywgbWlzc2luZylcbiAgfVxuXG4gIHN0YXRpYyByYW5kb21SZXBlYXRlZCAob3B0aW9uczogT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSB7XG4gICAgY29uc3QgYW5nbGVTdW06IG51bWJlciA9IG9wdGlvbnMuYW5nbGVTdW1cbiAgICBjb25zdCBtaW5BbmdsZTogbnVtYmVyID0gb3B0aW9ucy5taW5BbmdsZVxuXG4gICAgY29uc3QgbjogbnVtYmVyID0gcmFuZEJldHdlZW4ob3B0aW9ucy5taW5OLCBvcHRpb25zLm1heE4pXG5cbiAgICBjb25zdCBtOiBudW1iZXIgPSBvcHRpb25zLm5NaXNzaW5nIHx8IChNYXRoLnJhbmRvbSgpIDwgMC4xID8gbiA6IHJhbmRCZXR3ZWVuKDIsIG4gLSAxKSlcblxuICAgIGlmIChuIDwgMiB8fCBtIDwgMSB8fCBtID4gbikgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGFyZ3VtZW50czogbj0ke259LCBtPSR7bX1gKVxuXG4gICAgLy8gQWxsIG1pc3NpbmcgLSBkbyBhcyBhIHNlcGFyYXRlIGNhc2VcbiAgICBpZiAobiA9PT0gbSkge1xuICAgICAgY29uc3QgYW5nbGVzID0gW11cbiAgICAgIGFuZ2xlcy5sZW5ndGggPSBuXG4gICAgICBhbmdsZXMuZmlsbChhbmdsZVN1bSAvIG4pXG5cbiAgICAgIGNvbnN0IG1pc3NpbmcgPSBbXVxuICAgICAgbWlzc2luZy5sZW5ndGggPSBuXG4gICAgICBtaXNzaW5nLmZpbGwodHJ1ZSlcblxuICAgICAgcmV0dXJuIG5ldyB0aGlzKGFuZ2xlU3VtLCBhbmdsZXMsIG1pc3NpbmcpXG4gICAgfVxuXG4gICAgY29uc3QgYW5nbGVzOiBudW1iZXJbXSA9IFtdXG4gICAgY29uc3QgbWlzc2luZzogYm9vbGVhbltdID0gW11cbiAgICBtaXNzaW5nLmxlbmd0aCA9IG5cbiAgICBtaXNzaW5nLmZpbGwoZmFsc2UpXG5cbiAgICAvLyBjaG9vc2UgYSB2YWx1ZSBmb3IgdGhlIG1pc3NpbmcgYW5nbGVzXG4gICAgY29uc3QgbWF4UmVwZWF0ZWRBbmdsZSA9IChhbmdsZVN1bSAtIG1pbkFuZ2xlICogKG4gLSBtKSkgLyBtXG4gICAgY29uc3QgcmVwZWF0ZWRBbmdsZSA9IHJhbmRCZXR3ZWVuKG1pbkFuZ2xlLCBtYXhSZXBlYXRlZEFuZ2xlKVxuXG4gICAgLy8gY2hvb3NlIHZhbHVlcyBmb3IgdGhlIG90aGVyIGFuZ2xlc1xuICAgIGNvbnN0IG90aGVyQW5nbGVzOiBudW1iZXJbXSA9IFtdXG4gICAgbGV0IGxlZnQgPSBhbmdsZVN1bSAtIHJlcGVhdGVkQW5nbGUgKiBtXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuIC0gbSAtIDE7IGkrKykge1xuICAgICAgY29uc3QgbWF4QW5nbGUgPSBsZWZ0IC0gbWluQW5nbGUgKiAobiAtIG0gLSBpIC0gMSlcbiAgICAgIGNvbnN0IG5leHRBbmdsZSA9IHJhbmRCZXR3ZWVuKG1pbkFuZ2xlLCBtYXhBbmdsZSlcbiAgICAgIGxlZnQgLT0gbmV4dEFuZ2xlXG4gICAgICBvdGhlckFuZ2xlcy5wdXNoKG5leHRBbmdsZSlcbiAgICB9XG4gICAgb3RoZXJBbmdsZXNbbiAtIG0gLSAxXSA9IGxlZnRcblxuICAgIC8vIGNob29zZSB3aGVyZSB0aGUgbWlzc2luZyBhbmdsZXMgYXJlXG4gICAge1xuICAgICAgbGV0IGkgPSAwXG4gICAgICB3aGlsZSAoaSA8IG0pIHtcbiAgICAgICAgY29uc3QgaiA9IHJhbmRCZXR3ZWVuKDAsIG4gLSAxKVxuICAgICAgICBpZiAobWlzc2luZ1tqXSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBtaXNzaW5nW2pdID0gdHJ1ZVxuICAgICAgICAgIGFuZ2xlc1tqXSA9IHJlcGVhdGVkQW5nbGVcbiAgICAgICAgICBpKytcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGZpbGwgaW4gdGhlIG90aGVyIGFuZ2xlc1xuICAgIHtcbiAgICAgIGxldCBqID0gMFxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgaWYgKG1pc3NpbmdbaV0gPT09IGZhbHNlKSB7XG4gICAgICAgICAgYW5nbGVzW2ldID0gb3RoZXJBbmdsZXNbal1cbiAgICAgICAgICBqKytcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhKGFuZ2xlU3VtLCBhbmdsZXMsIG1pc3NpbmcpXG4gIH1cblxuICBpbml0TGFiZWxzKCkgOiB2b2lkIHtcbiAgICBjb25zdCBuID0gdGhpcy5hbmdsZXMubGVuZ3RoXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgIGlmICghdGhpcy5taXNzaW5nW2ldKSB7XG4gICAgICAgIHRoaXMuYW5nbGVMYWJlbHNbaV0gPSBgJHt0aGlzLmFuZ2xlc1tpXS50b1N0cmluZygpfV5cXFxcY2lyY2BcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYW5nbGVMYWJlbHNbaV0gPSAneF5cXFxcY2lyYydcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiIsIi8qIFF1ZXN0aW9uIHR5cGUgY29tcHJpc2luZyBudW1lcmljYWwgbWlzc2luZyBhbmdsZXMgYXJvdW5kIGEgcG9pbnQgYW5kXG4gKiBhbmdsZXMgb24gYSBzdHJhaWdodCBsaW5lIChzaW5jZSB0aGVzZSBhcmUgdmVyeSBzaW1pbGFyIG51bWVyaWNhbGx5IGFzIHdlbGxcbiAqIGFzIGdyYXBoaWNhbGx5LlxuICpcbiAqIEFsc28gY292ZXJzIGNhc2VzIHdoZXJlIG1vcmUgdGhhbiBvbmUgYW5nbGUgaXMgZXF1YWxcbiAqXG4gKi9cblxuaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNBcm91bmRWaWV3J1xuaW1wb3J0IHsgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNOdW1iZXJEYXRhJ1xuaW1wb3J0IHsgTnVtYmVyT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc0Fyb3VuZFEgZXh0ZW5kcyBHcmFwaGljUSB7XG4gIGRhdGE6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhXG4gIHZpZXc6IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3XG5cbiAgY29uc3RydWN0b3IgKGRhdGE6IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhLCB2aWV3OiBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldykgeyAvLyBlZmZlY3RpdmVseSBwcml2YXRlXG4gICAgc3VwZXIoKSAvLyBidWJibGVzIHRvIFFcbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgdGhpcy52aWV3ID0gdmlld1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogTnVtYmVyT3B0aW9ucykgOiBNaXNzaW5nQW5nbGVzQXJvdW5kUSB7XG4gICAgY29uc3QgZGVmYXVsdHMgOiBOdW1iZXJPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAxMCxcbiAgICAgIG1pbk46IDIsXG4gICAgICBtYXhOOiA0LFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlXG4gICAgfVxuICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YS5yYW5kb20ob3B0aW9ucylcbiAgICBjb25zdCB2aWV3ID0gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRWaWV3KGRhdGEsIG9wdGlvbnMpIC8vIFRPRE8gZWxpbWluYXRlIHB1YmxpYyBjb25zdHJ1Y3RvcnNcblxuICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc0Fyb3VuZFEoZGF0YSwgdmlldylcbiAgfVxuXG4gIHN0YXRpYyBnZXQgY29tbWFuZFdvcmQgKCkgOiBzdHJpbmcgeyByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnIH1cbn1cbiIsImltcG9ydCBQb2ludCBmcm9tICdQb2ludCdcbmltcG9ydCB7IEdyYXBoaWNRVmlldyB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IHsgc2luRGVnLCBkYXNoZWRMaW5lIH0gZnJvbSAnVXRpbGl0aWVzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IGV4dGVuZHMgR3JhcGhpY1FWaWV3IHtcbiAgLy8gdGhpcy5BLCB0aGlzLkIsIHRoaXMuQyA6OiBQb2ludCAtLSB0aGUgdmVydGljZXMgb2YgdGhlIHRyaWFuZ2xlXG4gIC8vIHRoaXMubGFiZWxzID0gW11cbiAgLy8gdGhpcy5jYW52YXNcbiAgLy8gdGhpcy5ET01cbiAgLy8gdGhpcy5yb3RhdGlvblxuICBjb25zdHJ1Y3RvciAoZGF0YSwgb3B0aW9ucykge1xuICAgIHN1cGVyKGRhdGEsIG9wdGlvbnMpIC8vIHNldHMgdGhpcy53aWR0aCB0aGlzLmhlaWdodCwgdGhpcy5kYXRhIGluaXRpYWxpc2VzIHRoaXMubGFiZWxzLCBjcmVhdGVzIGRvbSBlbGVtZW50c1xuICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aFxuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuaGVpZ2h0XG5cbiAgICAvLyBnZW5lcmF0ZSBwb2ludHMgKHdpdGggbG9uZ2VzdCBzaWRlIDFcbiAgICB0aGlzLkEgPSBuZXcgUG9pbnQoMCwgMClcbiAgICB0aGlzLkIgPSBQb2ludC5mcm9tUG9sYXJEZWcoMSwgZGF0YS5hbmdsZXNbMF0pXG4gICAgdGhpcy5DID0gbmV3IFBvaW50KFxuICAgICAgc2luRGVnKHRoaXMuZGF0YS5hbmdsZXNbMV0pIC8gc2luRGVnKHRoaXMuZGF0YS5hbmdsZXNbMl0pLCAwXG4gICAgKVxuXG4gICAgLy8gQ3JlYXRlIGxhYmVsc1xuICAgIGNvbnN0IGluQ2VudGVyID0gUG9pbnQuaW5DZW50ZXIodGhpcy5BLCB0aGlzLkIsIHRoaXMuQylcblxuICAgIGxldCBqID0gMCAvLyBrZWVwcyB0cmFjayBvZiAneCcgYW5kICd5JyBhcyBsYWJlbHNcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgY29uc3QgcCA9IFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXVtpXVxuXG4gICAgICAvLyBudWRnaW5nIGxhYmVsIHRvd2FyZCBjZW50ZXJcbiAgICAgIC8vIGNvbnN0IG51ZGdlRGlzdGFuY2UgPSB0aGlzLmRhdGEuYW5nbGVzW2ldXG4gICAgICAvLyBjb25zdCBwb3NpdGlvbiA9IHAuY2xvbmUoKS5tb3ZlVG93YXJkKGluQ2VudGVyLFxuICAgICAgbGV0IHRleHRxXG4gICAgICBpZiAodGhpcy5kYXRhLm1pc3NpbmdbaV0pIHtcbiAgICAgICAgdGV4dHEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKDEyMCtqKSAvLyAxMjAgPSAneCdcbiAgICAgICAgaisrXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0ZXh0cSA9IHRoaXMuZGF0YS5hbmdsZXNbaV0udG9TdHJpbmcoKVxuICAgICAgfVxuICAgICAgdGV4dHEgKz0gJ15cXFxcY2lyYydcbiAgICAgIHRoaXMubGFiZWxzW2ldID0ge1xuICAgICAgICBwb3M6IFBvaW50Lm1lYW4ocCwgcCwgaW5DZW50ZXIpLCAvLyB3ZWlnaHRlZCBtZWFuIC0gcG9zaXRpb24gZnJvbSBpbkNlbnRlclxuICAgICAgICB0ZXh0cTogdGV4dHEsXG4gICAgICAgIHN0eWxlcTogJ25vcm1hbCdcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmRhdGEubWlzc2luZ1tpXSkge1xuICAgICAgICB0aGlzLmxhYmVsc1tpXS50ZXh0YSA9IHRoaXMuZGF0YS5hbmdsZXNbaV0udG9TdHJpbmcoKSArICdeXFxcXGNpcmMnXG4gICAgICAgIHRoaXMubGFiZWxzW2ldLnN0eWxlYSA9ICdhbnN3ZXInXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmxhYmVsc1tpXS50ZXh0YSA9IHRoaXMubGFiZWxzW2ldLnRleHRxXG4gICAgICAgIHRoaXMubGFiZWxzW2ldLnN0eWxlYSA9IHRoaXMubGFiZWxzW2ldLnN0eWxlcVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7XG4gICAgICBsLnRleHQgPSBsLnRleHRxXG4gICAgICBsLnN0eWxlID0gbC5zdHlsZXFcbiAgICB9KVxuXG4gICAgLy8gcm90YXRlIHJhbmRvbWx5XG4gICAgdGhpcy5yb3RhdGlvbiA9IChvcHRpb25zLnJvdGF0aW9uICE9PSB1bmRlZmluZWQpID8gdGhpcy5yb3RhdGUob3B0aW9ucy5yb3RhdGlvbikgOiB0aGlzLnJhbmRvbVJvdGF0ZSgpXG5cbiAgICAvLyBzY2FsZSBhbmQgZml0XG4gICAgLy8gc2NhbGUgdG8gc2l6ZVxuICAgIGNvbnN0IG1hcmdpbiA9IDBcbiAgICBsZXQgdG9wbGVmdCA9IFBvaW50Lm1pbihbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgbGV0IGJvdHRvbXJpZ2h0ID0gUG9pbnQubWF4KFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBjb25zdCB0b3RhbFdpZHRoID0gYm90dG9tcmlnaHQueCAtIHRvcGxlZnQueFxuICAgIGNvbnN0IHRvdGFsSGVpZ2h0ID0gYm90dG9tcmlnaHQueSAtIHRvcGxlZnQueVxuICAgIHRoaXMuc2NhbGUoTWF0aC5taW4oKHdpZHRoIC0gbWFyZ2luKSAvIHRvdGFsV2lkdGgsIChoZWlnaHQgLSBtYXJnaW4pIC8gdG90YWxIZWlnaHQpKSAvLyAxNXB4IG1hcmdpblxuXG4gICAgLy8gbW92ZSB0byBjZW50cmVcbiAgICB0b3BsZWZ0ID0gUG9pbnQubWluKFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXSlcbiAgICBib3R0b21yaWdodCA9IFBvaW50Lm1heChbdGhpcy5BLCB0aGlzLkIsIHRoaXMuQ10pXG4gICAgY29uc3QgY2VudGVyID0gUG9pbnQubWVhbih0b3BsZWZ0LCBib3R0b21yaWdodClcbiAgICB0aGlzLnRyYW5zbGF0ZSh3aWR0aCAvIDIgLSBjZW50ZXIueCwgaGVpZ2h0IC8gMiAtIGNlbnRlci55KSAvLyBjZW50cmVcbiAgfVxuXG4gIHJlbmRlciAoKSB7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICAgIGNvbnN0IHZlcnRpY2VzID0gW3RoaXMuQSwgdGhpcy5CLCB0aGlzLkNdXG4gICAgY29uc3QgYXBleCA9IHRoaXMuZGF0YS5hcGV4IC8vIGhtbW1cblxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCkgLy8gY2xlYXJcblxuICAgIGN0eC5iZWdpblBhdGgoKVxuICAgIGN0eC5tb3ZlVG8odGhpcy5BLngsIHRoaXMuQS55KVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGNvbnN0IHAgPSB2ZXJ0aWNlc1tpXVxuICAgICAgY29uc3QgbmV4dCA9IHZlcnRpY2VzWyhpICsgMSkgJSAzXVxuICAgICAgaWYgKGFwZXggPT09IGkgfHwgYXBleCA9PT0gKGkgKyAxKSAlIDMpIHsgLy8gdG8vZnJvbSBhcGV4IC0gZHJhdyBkYXNoZWQgbGluZVxuICAgICAgICBkYXNoZWRMaW5lKGN0eCwgcC54LCBwLnksIG5leHQueCwgbmV4dC55KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3R4LmxpbmVUbyhuZXh0LngsIG5leHQueSlcbiAgICAgIH1cbiAgICB9XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gJ2dyYXknXG4gICAgY3R4LnN0cm9rZSgpXG4gICAgY3R4LmNsb3NlUGF0aCgpXG5cbiAgICB0aGlzLnJlbmRlckxhYmVscyhmYWxzZSlcbiAgfVxuXG4gIGdldCBhbGxwb2ludHMgKCkge1xuICAgIGNvbnN0IGFsbHBvaW50cyA9IFt0aGlzLkEsIHRoaXMuQiwgdGhpcy5DXVxuICAgIHRoaXMubGFiZWxzLmZvckVhY2gobCA9PiB7IGFsbHBvaW50cy5wdXNoKGwucG9zKSB9KVxuICAgIHJldHVybiBhbGxwb2ludHNcbiAgfVxufVxuIiwiLyogRXh0ZW5kcyBNaXNzaW5nQW5nbGVzTnVtYmVyRGF0YSBpbiBvcmRlciB0byBkbyBpc29zY2VsZXMgdHJpYW5nbGVzLCB3aGljaCBnZW5lcmF0ZSBhIGJpdCBkaWZmZXJlbnRseSAqL1xuXG5pbXBvcnQgeyBmaXJzdFVuaXF1ZUluZGV4LCBzb3J0VG9nZXRoZXIgfSBmcm9tICdVdGlsaXRpZXMnXG5pbXBvcnQgeyBHcmFwaGljUURhdGEgfSBmcm9tICcuLi9HcmFwaGljUSdcbmltcG9ydCB7IE1pc3NpbmdBbmdsZXNOdW1iZXJEYXRhfSBmcm9tICcuL01pc3NpbmdBbmdsZXNOdW1iZXJEYXRhJ1xuaW1wb3J0IHsgTnVtYmVyT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxudHlwZSBPcHRpb25zID0gTnVtYmVyT3B0aW9ucyAmIHtnaXZlbkFuZ2xlPzogJ2FwZXgnIHwgJ2Jhc2UnfVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhIGV4dGVuZHMgTWlzc2luZ0FuZ2xlc051bWJlckRhdGEge1xuICAgIGFwZXg6IDAgfCAxIHwgMiB8IHVuZGVmaW5lZCAvLyB3aGljaCBvZiB0aGUgdGhyZWUgZ2l2ZW4gYW5nbGVzIGlzIHRoZSBhcGV4IG9mIGFuIGlzb3NjZWxlcyB0cmlhbmdsZVxuICAgIGNvbnN0cnVjdG9yKGFuZ2xlU3VtOiBudW1iZXIsIGFuZ2xlczogbnVtYmVyW10sIG1pc3Npbmc6IGJvb2xlYW5bXSwgYXBleD86IDB8MXwyfHVuZGVmaW5lZCkge1xuICAgICAgICBzdXBlcihhbmdsZVN1bSxhbmdsZXMsbWlzc2luZylcbiAgICAgICAgdGhpcy5hcGV4ID0gYXBleFxuICAgIH1cblxuICAgIHN0YXRpYyByYW5kb21SZXBlYXRlZChvcHRpb25zOiBPcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMubk1pc3NpbmcgPSAyXG4gICAgICAgIG9wdGlvbnMuZ2l2ZW5BbmdsZSA9IG9wdGlvbnMuZ2l2ZW5BbmdsZSB8fCBNYXRoLnJhbmRvbSgpIDwgMC41PyAnYXBleCcgOiAnYmFzZSdcblxuICAgICAgICAvLyBnZW5lcmF0ZSB0aGUgcmFuZG9tIGFuZ2xlcyB3aXRoIHJlcGV0aXRpb24gZmlyc3QgYmVmb3JlIG1hcmtpbmcgYXBleCBmb3IgZHJhd2luZ1xuICAgICAgICBsZXQgcXVlc3Rpb24gPSBzdXBlci5yYW5kb21SZXBlYXRlZChvcHRpb25zKSBhcyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhIC8vIGFsbG93ZWQgc2luY2UgdW5kZWZpbmVkIFxcaW4gYXBleFxuXG4gICAgICAgIC8vIE9sZCBpbXBsZW1lbnRhdGlvbiBoYWQgc29ydGluZyB0aGUgYXJyYXkgLSBub3Qgc3VyZSB3aHlcbiAgICAgICAgLy8gc29ydFRvZ2V0aGVyKHF1ZXN0aW9uLmFuZ2xlcyxxdWVzdGlvbi5taXNzaW5nLCh4LHkpID0+IHggLSB5KVxuXG4gICAgICAgIHF1ZXN0aW9uLmFwZXggPSBmaXJzdFVuaXF1ZUluZGV4KHF1ZXN0aW9uLmFuZ2xlcykgYXMgMCB8IDEgfCAyXG4gICAgICAgIHF1ZXN0aW9uLm1pc3NpbmcgPSBbdHJ1ZSx0cnVlLHRydWVdXG4gICAgICAgIFxuICAgICAgICBpZiAob3B0aW9ucy5naXZlbkFuZ2xlID09PSAnYXBleCcpIHtcbiAgICAgICAgICAgIHF1ZXN0aW9uLm1pc3NpbmdbcXVlc3Rpb24uYXBleF0gPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHF1ZXN0aW9uLm1pc3NpbmdbKHF1ZXN0aW9uLmFwZXggKyAxKSUzXSA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICByZXR1cm4gcXVlc3Rpb25cbiAgICB9IFxuXG59IiwiLyogTWlzc2luZyBhbmdsZXMgaW4gdHJpYW5nbGUgLSBudW1lcmljYWwgKi9cblxuaW1wb3J0IHsgR3JhcGhpY1EgfSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9HcmFwaGljUSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVWaWV3IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldydcbmltcG9ydCBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhIGZyb20gJy4vTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlRGF0YSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgY29uc3RydWN0b3IgKGRhdGEsIHZpZXcsIG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKSAvLyB0aGlzIHNob3VsZCBiZSBhbGwgdGhhdCdzIHJlcXVpcmVkIHdoZW4gcmVmYWN0b3JlZFxuICAgIHRoaXMuZGF0YSA9IGRhdGFcbiAgICB0aGlzLnZpZXcgPSB2aWV3XG4gIH1cblxuICBzdGF0aWMgcmFuZG9tIChvcHRpb25zKSB7XG4gICAgY29uc3Qgb3B0aW9uc092ZXJyaWRlID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAyNSxcbiAgICAgIG1pbk46IDMsXG4gICAgICBtYXhOOiAzLFxuICAgIH1cbiAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbihvcHRpb25zLG9wdGlvbnNPdmVycmlkZSlcbiAgICBvcHRpb25zLnJlcGVhdGVkICA9IG9wdGlvbnMucmVwZWF0ZWQgfHwgZmFsc2VcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzVHJpYW5nbGVEYXRhLnJhbmRvbShvcHRpb25zKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlVmlldyhkYXRhLCBvcHRpb25zKVxuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzVHJpYW5nbGVRKGRhdGEsIHZpZXcsIG9wdGlvbnMpXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIHsgcmV0dXJuICdGaW5kIHRoZSBtaXNzaW5nIHZhbHVlJyB9XG59XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBMaW5FeHByIHtcbi8vY2xhc3MgTGluRXhwciB7XG4gICAgY29uc3RydWN0b3IoYSxiKSB7XG4gICAgICAgIHRoaXMuYSA9IGE7XG4gICAgICAgIHRoaXMuYiA9IGI7XG4gICAgfVxuXG4gICAgaXNDb25zdGFudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYSA9PT0gMFxuICAgIH1cblxuICAgIHRvU3RyaW5nKCkge1xuICAgICAgICBsZXQgc3RyaW5nID0gXCJcIjtcblxuICAgICAgICAvLyB4IHRlcm1cbiAgICAgICAgaWYgKHRoaXMuYT09PTEpIHsgc3RyaW5nICs9IFwieFwifVxuICAgICAgICBlbHNlIGlmICh0aGlzLmE9PT0tMSkgeyBzdHJpbmcgKz0gXCIteFwifVxuICAgICAgICBlbHNlIGlmICh0aGlzLmEhPT0wKSB7IHN0cmluZyArPSB0aGlzLmEgKyBcInhcIn1cbiAgICAgICAgXG4gICAgICAgIC8vIHNpZ25cbiAgICAgICAgaWYgKHRoaXMuYSE9PTAgJiYgdGhpcy5iPjApIHtzdHJpbmcgKz0gXCIgKyBcIn1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5hIT09MCAmJiB0aGlzLmI8MCkge3N0cmluZyArPSBcIiAtIFwifVxuXG4gICAgICAgIC8vIGNvbnN0YW50XG4gICAgICAgIGlmICh0aGlzLmI+MCkge3N0cmluZyArPSB0aGlzLmJ9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMuYjwwICYmIHRoaXMuYT09PTApIHtzdHJpbmcgKz0gdGhpcy5ifVxuICAgICAgICBlbHNlIGlmICh0aGlzLmI8MCkge3N0cmluZyArPSBNYXRoLmFicyh0aGlzLmIpfVxuXG4gICAgICAgIHJldHVybiBzdHJpbmc7XG4gICAgfVxuXG4gICAgdG9TdHJpbmdQKCkge1xuICAgICAgICAvLyByZXR1cm4gZXhwcmVzc2lvbiBhcyBhIHN0cmluZywgc3Vycm91bmRlZCBpbiBwYXJlbnRoZXNlcyBpZiBhIGJpbm9taWFsXG4gICAgICAgIGlmICh0aGlzLmEgPT09IDAgfHwgdGhpcy5iID09PSAwKSByZXR1cm4gdGhpcy50b1N0cmluZygpO1xuICAgICAgICBlbHNlIHJldHVybiBcIihcIiArIHRoaXMudG9TdHJpbmcoKSArIFwiKVwiO1xuICAgIH1cblxuICAgIGV2YWwoeCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hKnggKyB0aGlzLmJcbiAgICB9XG5cbiAgICBhZGQodGhhdCkge1xuICAgICAgICAvLyBhZGQgZWl0aGVyIGFuIGV4cHJlc3Npb24gb3IgYSBjb25zdGFudFxuICAgICAgICBpZiAodGhhdC5hICE9PSB1bmRlZmluZWQpIHJldHVybiBuZXcgTGluRXhwcih0aGlzLmErdGhhdC5hLHRoaXMuYit0aGF0LmIpO1xuICAgICAgICBlbHNlIHJldHVybiBuZXcgTGluRXhwcih0aGlzLmEsdGhpcy5iICsgdGhhdCk7XG4gICAgfVxuXG4gICAgdGltZXModGhhdCkge1xuICAgICAgICByZXR1cm4gbmV3IExpbkV4cHIodGhpcy5hICogdGhhdCwgdGhpcy5iICogdGhhdClcbiAgICB9XG5cbiAgICBzdGF0aWMgc29sdmUoZXhwcjEsZXhwcjIpIHtcbiAgICAgICAgLy8gc29sdmVzIHRoZSB0d28gZXhwcmVzc2lvbnMgc2V0IGVxdWFsIHRvIGVhY2ggb3RoZXJcbiAgICAgICAgcmV0dXJuIChleHByMi5iLWV4cHIxLmIpLyhleHByMS5hLWV4cHIyLmEpXG4gICAgfVxufVxuIiwiaW1wb3J0IExpbkV4cHIgZnJvbSBcIkxpbkV4cHJcIjtcbmltcG9ydCB7IHJhbmRCZXR3ZWVuLCByYW5kRWxlbSwgcmFuZE11bHRCZXR3ZWVuLCBzaHVmZmxlLCB3ZWFrSW5jbHVkZXMgfSBmcm9tIFwiVXRpbGl0aWVzXCI7XG5pbXBvcnQgeyBBbGdlYnJhT3B0aW9ucyB9IGZyb20gXCIuL0FsZ2VicmFPcHRpb25zXCI7XG5pbXBvcnQgeyBNaXNzaW5nQW5nbGVzRGF0YSB9IGZyb20gXCIuL01pc3NpbmdBbmdsZXNEYXRhXCI7XG5pbXBvcnQgeyBOdW1iZXJPcHRpb25zIH0gZnJvbSBcIi4vTnVtYmVyT3B0aW9uc1wiO1xuXG50eXBlIE9wdGlvbnMgPSBBbGdlYnJhT3B0aW9uc1xuXG5leHBvcnQgdHlwZSBFeHByZXNzaW9uVHlwZSA9ICdhZGQnIHwgJ211bHRpcGx5JyB8ICdtaXhlZCdcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBpbXBsZW1lbnRzIE1pc3NpbmdBbmdsZXNEYXRhIHtcbiAgICBhbmdsZXM6IG51bWJlcltdXG4gICAgbWlzc2luZzogYm9vbGVhbltdXG4gICAgYW5nbGVTdW06IG51bWJlclxuICAgIGFuZ2xlTGFiZWxzOiBzdHJpbmdbXVxuICAgIHg6IG51bWJlciAvL1xuICAgIFxuICAgIGNvbnN0cnVjdG9yKGFuZ2xlczogbnVtYmVyW10sIG1pc3Npbmc6IGJvb2xlYW5bXSwgYW5nbGVTdW06IG51bWJlciwgYW5nbGVMYWJlbHM6IHN0cmluZ1tdLCB4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5hbmdsZXMgPSBhbmdsZXNcbiAgICAgICAgdGhpcy5hbmdsZVN1bSA9IGFuZ2xlU3VtXG4gICAgICAgIHRoaXMuYW5nbGVMYWJlbHMgPSBhbmdsZUxhYmVsc1xuICAgICAgICB0aGlzLnggPSB4XG4gICAgICAgIHRoaXMubWlzc2luZyA9IG1pc3NpbmdcbiAgICB9XG5cbiAgICBzdGF0aWMgcmFuZG9tIChvcHRpb25zOiBPcHRpb25zKSA6IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSB7XG4gICAgICAgIGNvbnN0IGRlZmF1bHRzIDogT3B0aW9ucyA9IHtcbiAgICAgICAgICAgIGV4cHJlc3Npb25UeXBlczogWydhZGQnLCdtdWx0aXBseScsICdtaXhlZCddLFxuICAgICAgICAgICAgZW5zdXJlWDogdHJ1ZSxcbiAgICAgICAgICAgIGluY2x1ZGVDb25zdGFudHM6IHRydWUsXG4gICAgICAgICAgICBtaW5Db2VmZmljaWVudDogMSxcbiAgICAgICAgICAgIG1heENvZWZmaWNpZW50OiA0LFxuICAgICAgICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgICAgICAgIG1pbkFuZ2xlOiAyMCxcbiAgICAgICAgICAgIG1pbk46IDIsXG4gICAgICAgICAgICBtYXhOOiA0LFxuICAgICAgICAgICAgbWluWFZhbHVlOiAxNSxcbiAgICAgICAgfVxuICAgICAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSxkZWZhdWx0cywgb3B0aW9ucylcblxuICAgICAgICAvL2Fzc2lnbiBjYWxjdWxhdGVkIGRlZmF1bHRzOlxuICAgICAgICBvcHRpb25zLm1heENvbnN0YW50ID0gb3B0aW9ucy5tYXhDb25zdGFudCB8fCBvcHRpb25zLmFuZ2xlU3VtLzJcbiAgICAgICAgb3B0aW9ucy5tYXhYVmFsdWUgPSBvcHRpb25zLm1heFhWYWx1ZSB8fCBvcHRpb25zLmFuZ2xlU3VtLzRcblxuICAgICAgICAvLyBSYW5kb21pc2Uvc2V0IHVwIG1haW4gZmVhdHVyZXNcbiAgICAgICAgbGV0IG4gOiBudW1iZXIgPSByYW5kQmV0d2VlbihvcHRpb25zLm1pbk4sIG9wdGlvbnMubWF4TilcblxuICAgICAgICBjb25zdCB0eXBlIDogRXhwcmVzc2lvblR5cGUgPSByYW5kRWxlbShvcHRpb25zLmV4cHJlc3Npb25UeXBlcyk7XG5cbiAgICAgICAgLy8gR2VuZXJhdGUgZXhwcmVzc2lvbnMvYW5nbGVzXG4gICAgICAgIGxldCBleHByZXNzaW9ucyA6IExpbkV4cHJbXVxuICAgICAgICBzd2l0Y2godHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnbWl4ZWQnOlxuICAgICAgICAgICAgICAgIGV4cHJlc3Npb25zID0gbWFrZU1peGVkRXhwcmVzc2lvbnMobixvcHRpb25zKVxuICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICBjYXNlICdtdWx0aXBseSc6IFxuICAgICAgICAgICAgICAgIGV4cHJlc3Npb25zID0gbWFrZU11bHRpcGxpY2F0aW9uRXhwcmVzc2lvbnMobixvcHRpb25zKVxuICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICBjYXNlICdhZGQnOiBcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgZXhwcmVzc2lvbnMgPSBtYWtlQWRkRXhwcmVzc2lvbnMobixvcHRpb25zKVxuICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgICAgZXhwcmVzc2lvbnMgPSBzaHVmZmxlKGV4cHJlc3Npb25zKTtcblxuICAgICAgICAvLyBTb2x2ZSBmb3IgeCBhbmQgYW5nbGVzXG4gICAgICAgIGNvbnN0IHt4ICwgYW5nbGVzIH0gOiB7eDpudW1iZXIsIGFuZ2xlczogbnVtYmVyW119ID0gc29sdmVBbmdsZXMoZXhwcmVzc2lvbnMsb3B0aW9ucy5hbmdsZVN1bSlcblxuICAgICAgICAvLyBsYWJlbHMgYXJlIGp1c3QgZXhwcmVzc2lvbnMgYXMgc3RyaW5nc1xuICAgICAgICBjb25zdCBsYWJlbHMgPSBleHByZXNzaW9ucy5tYXAoIGUgPT4gYCR7ZS50b1N0cmluZ1AoKX1eXFxcXGNpcmNgKSBcblxuICAgICAgICAvLyBtaXNzaW5nIHZhbHVlcyBhcmUgdGhlIG9uZXMgd2hpY2ggYXJlbid0IGNvbnN0YW50XG4gICAgICAgIGNvbnN0IG1pc3NpbmcgPSBleHByZXNzaW9ucy5tYXAoIGUgPT4gIWUuaXNDb25zdGFudCgpKVxuXG4gICAgICAgIHJldHVybiBuZXcgTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhIChhbmdsZXMsbWlzc2luZyxvcHRpb25zLmFuZ2xlU3VtLGxhYmVscyx4KVxuICAgIH1cbn1cblxuLyoqIEdpdmVuIGEgc2V0IG9mIGV4cHJlc3Npb25zLCBzZXQgdGhlaXIgc3VtICAqL1xuZnVuY3Rpb24gc29sdmVBbmdsZXMoZXhwcmVzc2lvbnM6IExpbkV4cHJbXSwgYW5nbGVTdW06IG51bWJlcikgOiB7eDogbnVtYmVyLCBhbmdsZXM6IG51bWJlcltdfSB7XG4gICAgY29uc3QgZXhwcmVzc2lvblN1bSA9IGV4cHJlc3Npb25zLnJlZHVjZSggKGV4cDEsZXhwMikgPT4gZXhwMS5hZGQoZXhwMikgKTtcbiAgICBjb25zdCB4ID0gTGluRXhwci5zb2x2ZShleHByZXNzaW9uU3VtLG5ldyBMaW5FeHByKDAsYW5nbGVTdW0pKTtcblxuICAgIGNvbnN0IGFuZ2xlcyA9IFtdO1xuICAgIGV4cHJlc3Npb25zLmZvckVhY2goZnVuY3Rpb24oZXhwcikge1xuICAgICAgICBsZXQgYW5nbGUgPSBleHByLmV2YWwoeCk7XG4gICAgICAgIGlmIChhbmdsZSA8PSAwKSB7XG4gICAgICAgICAgICB0aHJvdyBcIm5lZ2F0aXZlIGFuZ2xlXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhbmdsZXMucHVzaChleHByLmV2YWwoeCkpXG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybigge3g6IHgsIGFuZ2xlczogYW5nbGVzfSlcbn1cblxuZnVuY3Rpb24gbWFrZU1peGVkRXhwcmVzc2lvbnMobjogbnVtYmVyLCBvcHRpb25zOiBPcHRpb25zKSA6IExpbkV4cHJbXSB7XG4gICAgbGV0IGV4cHJlc3Npb25zOiBMaW5FeHByW10gPSBbXVxuICAgIGNvbnN0IHggPSByYW5kQmV0d2VlbihvcHRpb25zLm1pblhWYWx1ZSwgb3B0aW9ucy5tYXhYVmFsdWUpO1xuICAgIGxldCBsZWZ0ID0gb3B0aW9ucy5hbmdsZVN1bTtcbiAgICBsZXQgYWxsY29uc3RhbnQgPSB0cnVlO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbiAtIDE7IGkrKykge1xuICAgICAgICBsZXQgYSA9IHJhbmRCZXR3ZWVuKDEsIG9wdGlvbnMubWF4Q29lZmZpY2llbnQpO1xuICAgICAgICBsZWZ0IC09IGEgKiB4O1xuICAgICAgICBsZXQgbWF4YiA9IE1hdGgubWluKGxlZnQgLSBvcHRpb25zLm1pbkFuZ2xlICogKG4gLSBpIC0gMSksIG9wdGlvbnMubWF4Q29uc3RhbnQpO1xuICAgICAgICBsZXQgbWluYiA9IG9wdGlvbnMubWluQW5nbGUgLSBhICogeDtcbiAgICAgICAgbGV0IGIgPSByYW5kQmV0d2VlbihtaW5iLCBtYXhiKTtcbiAgICAgICAgaWYgKGEgIT09IDApIHsgYWxsY29uc3RhbnQgPSBmYWxzZSB9O1xuICAgICAgICBsZWZ0IC09IGI7XG4gICAgICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoYSwgYikpO1xuICAgIH1cbiAgICBsZXQgbGFzdF9taW5YX2NvZWZmID0gYWxsY29uc3RhbnQgPyAxIDogb3B0aW9ucy5taW5Db2VmZmljaWVudDtcbiAgICBsZXQgYSA9IHJhbmRCZXR3ZWVuKGxhc3RfbWluWF9jb2VmZiwgb3B0aW9ucy5tYXhDb2VmZmljaWVudCk7XG4gICAgbGV0IGIgPSBsZWZ0IC0gYSAqIHg7XG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihhLCBiKSk7XG5cbiAgICByZXR1cm4gZXhwcmVzc2lvbnNcbn1cblxuZnVuY3Rpb24gbWFrZUFkZEV4cHJlc3Npb25zKG46IG51bWJlciwgb3B0aW9uczogT3B0aW9ucykgOiBMaW5FeHByW10ge1xuICAgIGxldCBleHByZXNzaW9uczogTGluRXhwcltdID0gW11cbiAgICBsZXQgYW5nbGVzOiBudW1iZXJbXSA9IFtdXG4gICAgY29uc3QgY29uc3RhbnRzID0gKG9wdGlvbnMuaW5jbHVkZUNvbnN0YW50cyA9PT0gdHJ1ZSB8fCB3ZWFrSW5jbHVkZXMob3B0aW9ucy5pbmNsdWRlQ29uc3RhbnRzLCAnYWRkJykpO1xuICAgIGlmIChuID09PSAyICYmIG9wdGlvbnMuZW5zdXJlWCAmJiBjb25zdGFudHMpIG4gPSAzO1xuXG4gICAgY29uc3QgeCA9IHJhbmRCZXR3ZWVuKG9wdGlvbnMubWluWFZhbHVlLCBvcHRpb25zLm1heFhWYWx1ZSk7XG4gICAgbGV0IGxlZnQgPSBvcHRpb25zLmFuZ2xlU3VtO1xuICAgIGxldCBhbmdsZXNMZWZ0ID0gbjtcblxuICAgIC8vIGZpcnN0IGRvIHRoZSBleHByZXNzaW9ucyBlbnN1cmVkIGJ5IGVuc3VyZV94IGFuZCBjb25zdGFudHNcbiAgICBpZiAob3B0aW9ucy5lbnN1cmVYKSB7XG4gICAgICAgIGFuZ2xlc0xlZnQtLTtcbiAgICAgICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcigxLCAwKSk7XG4gICAgICAgIGFuZ2xlcy5wdXNoKHgpO1xuICAgICAgICBsZWZ0IC09IHg7XG4gICAgfVxuXG4gICAgaWYgKGNvbnN0YW50cykge1xuICAgICAgICBhbmdsZXNMZWZ0LS07XG4gICAgICAgIGxldCBjID0gcmFuZEJldHdlZW4oXG4gICAgICAgICAgICBvcHRpb25zLm1pbkFuZ2xlLFxuICAgICAgICAgICAgbGVmdCAtIG9wdGlvbnMubWluQW5nbGUgKiBhbmdsZXNMZWZ0XG4gICAgICAgICk7XG4gICAgICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMCwgYykpO1xuICAgICAgICBhbmdsZXMucHVzaChjKTtcbiAgICAgICAgbGVmdCAtPSBjO1xuICAgIH1cblxuICAgIC8vIG1pZGRsZSBhbmdsZXNcbiAgICB3aGlsZSAoYW5nbGVzTGVmdCA+IDEpIHtcbiAgICAgICAgLy8gYWRkICd4K2InIGFzIGFuIGV4cHJlc3Npb24uIE1ha2Ugc3VyZSBiIGdpdmVzIHNwYWNlXG4gICAgICAgIGFuZ2xlc0xlZnQtLTtcbiAgICAgICAgbGVmdCAtPSB4O1xuICAgICAgICBsZXQgbWF4YiA9IE1hdGgubWluKFxuICAgICAgICAgICAgbGVmdCAtIG9wdGlvbnMubWluQW5nbGUgKiBhbmdsZXNMZWZ0LFxuICAgICAgICAgICAgb3B0aW9ucy5tYXhDb25zdGFudFxuICAgICAgICApO1xuICAgICAgICBsZXQgbWluYiA9IE1hdGgubWF4KFxuICAgICAgICAgICAgb3B0aW9ucy5taW5BbmdsZSAtIHgsXG4gICAgICAgICAgICAtb3B0aW9ucy5tYXhDb25zdGFudFxuICAgICAgICApO1xuICAgICAgICBsZXQgYiA9IHJhbmRCZXR3ZWVuKG1pbmIsIG1heGIpO1xuICAgICAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIGIpKTtcbiAgICAgICAgYW5nbGVzLnB1c2goeCArIGIpO1xuICAgICAgICBsZWZ0IC09IGI7XG4gICAgfVxuXG4gICAgLy8gbGFzdCBhbmdsZVxuICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMSwgbGVmdCAtIHgpKTtcbiAgICBhbmdsZXMucHVzaChsZWZ0KTtcblxuICAgIHJldHVybiBleHByZXNzaW9uc1xufVxuXG5mdW5jdGlvbiBtYWtlTXVsdGlwbGljYXRpb25FeHByZXNzaW9ucyhuOiBudW1iZXIsIG9wdGlvbnM6IE9wdGlvbnMpIDogTGluRXhwcltdIHtcbiAgICBsZXQgZXhwcmVzc2lvbnMgOiBMaW5FeHByW10gPSBbXVxuXG4gICAgLy8gY2hvb3NlIGEgdG90YWwgb2YgY29lZmZpY2llbnRzXG4gICAgLy8gcGljayB4IGJhc2VkIG9uIHRoYXRcbiAgICBjb25zdCBjb25zdGFudHMgPSAob3B0aW9ucy5pbmNsdWRlQ29uc3RhbnRzID09PSB0cnVlIHx8IHdlYWtJbmNsdWRlcyhvcHRpb25zLmluY2x1ZGVDb25zdGFudHMsICdtdWx0JykpO1xuICAgIGlmIChuID09PSAyICYmIG9wdGlvbnMuZW5zdXJlWCAmJiBjb25zdGFudHMpIG4gPSAzO1xuXG4gICAgbGV0IGFuZ2xlc2xlZnQgPSBuO1xuICAgIGNvbnN0IHRvdGFsQ29lZmYgPSBjb25zdGFudHMgP1xuICAgICAgICByYW5kQmV0d2VlbihuLCAob3B0aW9ucy5hbmdsZVN1bSAtIG9wdGlvbnMubWluQW5nbGUpIC8gb3B0aW9ucy5taW5BbmdsZSwgTWF0aC5yYW5kb20pIDogLy8gaWYgaXQncyB0b28gYmlnLCBhbmdsZXMgZ2V0IHRvbyBzbWFsbFxuICAgICAgICByYW5kRWxlbShbMywgNCwgNSwgNiwgOCwgOSwgMTBdLmZpbHRlcih4ID0+IHggPj0gbiksIE1hdGgucmFuZG9tKTtcbiAgICBsZXQgY29lZmZsZWZ0ID0gdG90YWxDb2VmZjtcbiAgICBsZXQgbGVmdCA9IG9wdGlvbnMuYW5nbGVTdW07XG5cbiAgICAvLyBmaXJzdCAwLzEvMlxuICAgIGlmIChjb25zdGFudHMpIHtcbiAgICAgICAgLy8gcmVkdWNlIHRvIG1ha2Ugd2hhdCdzIGxlZnQgYSBtdWx0aXBsZSBvZiB0b3RhbF9jb2VmZlxuICAgICAgICBhbmdsZXNsZWZ0LS07XG4gICAgICAgIGxldCBuZXdsZWZ0ID0gcmFuZE11bHRCZXR3ZWVuKHRvdGFsQ29lZmYgKiBvcHRpb25zLm1pbkFuZ2xlLCBvcHRpb25zLmFuZ2xlU3VtIC0gb3B0aW9ucy5taW5BbmdsZSwgdG90YWxDb2VmZik7XG4gICAgICAgIGxldCBjID0gb3B0aW9ucy5hbmdsZVN1bSAtIG5ld2xlZnQ7XG4gICAgICAgIGV4cHJlc3Npb25zLnB1c2gobmV3IExpbkV4cHIoMCwgYykpO1xuICAgICAgICBsZWZ0IC09IG5ld2xlZnQ7XG4gICAgfVxuXG4gICAgbGV0IHggPSBsZWZ0IC8gdG90YWxDb2VmZjtcblxuICAgIGlmIChvcHRpb25zLmVuc3VyZVgpIHtcbiAgICAgICAgYW5nbGVzbGVmdC0tO1xuICAgICAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKDEsIDApKTtcbiAgICAgICAgY29lZmZsZWZ0IC09IDE7XG4gICAgfVxuXG4gICAgLy9taWRkbGVcbiAgICB3aGlsZSAoYW5nbGVzbGVmdCA+IDEpIHtcbiAgICAgICAgYW5nbGVzbGVmdC0tO1xuICAgICAgICBsZXQgbWluYSA9IDE7XG4gICAgICAgIGxldCBtYXhhID0gY29lZmZsZWZ0IC0gYW5nbGVzbGVmdDsgLy8gbGVhdmUgZW5vdWdoIGZvciBvdGhlcnMgVE9ETzogYWRkIG1heF9jb2VmZlxuICAgICAgICBsZXQgYSA9IHJhbmRCZXR3ZWVuKG1pbmEsIG1heGEpO1xuICAgICAgICBleHByZXNzaW9ucy5wdXNoKG5ldyBMaW5FeHByKGEsIDApKTtcbiAgICAgICAgY29lZmZsZWZ0IC09IGE7XG4gICAgfVxuXG4gICAgLy9sYXN0XG4gICAgZXhwcmVzc2lvbnMucHVzaChuZXcgTGluRXhwcihjb2VmZmxlZnQsIDApKTtcbiAgICByZXR1cm4gZXhwcmVzc2lvbnNcbn0iLCJpbXBvcnQgUG9pbnQgZnJvbSBcIlBvaW50XCI7XG5pbXBvcnQgeyBMYWJlbCB9IGZyb20gXCIuLi9HcmFwaGljUVwiO1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tIFwiLi9NaXNzaW5nQW5nbGVzQWxnZWJyYURhdGFcIjtcbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyBmcm9tIFwiLi9NaXNzaW5nQW5nbGVzQXJvdW5kVmlld1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcgZXh0ZW5kcyBNaXNzaW5nQW5nbGVzQXJvdW5kVmlldyB7XG4gICAgTyA6IFBvaW50XG4gICAgQTogUG9pbnRcbiAgICBDOiBQb2ludFtdXG4gICAgbGFiZWxzOiBMYWJlbFtdXG4gICAgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudFxuICAgIERPTTogSFRNTEVsZW1lbnRcbiAgICByb3RhdGlvbjogbnVtYmVyXG4gICAgd2lkdGg6IG51bWJlclxuICAgIGhlaWdodDogbnVtYmVyXG4gICAgZGF0YTogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhXG5cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgZGF0YTogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICB3aWR0aDogbnVtYmVyLFxuICAgICAgICAgICAgaGVpZ2h0OiBudW1iZXJcbiAgICAgICAgfVxuICAgICkge1xuICAgICAgICBzdXBlcihkYXRhLCBvcHRpb25zKSAvLyBzdXBlciBjb25zdHJ1Y3RvciBkb2VzIHJlYWwgd29ya1xuICAgICAgICBjb25zdCBzb2x1dGlvbkxhYmVsOiBQYXJ0aWFsPExhYmVsPiA9IHtcbiAgICAgICAgICAgIHBvczogbmV3IFBvaW50KDEwLCB0aGlzLmhlaWdodCAtIDEwKSxcbiAgICAgICAgICAgIHRleHRxOiAnJyxcbiAgICAgICAgICAgIHRleHRhOiBgeCA9ICR7dGhpcy5kYXRhLnh9XlxcXFxjaXJjYCxcbiAgICAgICAgICAgIHN0eWxlcTogJ2hpZGRlbicsXG4gICAgICAgICAgICBzdHlsZWE6ICdleHRyYS1hbnN3ZXInLFxuICAgICAgICB9XG4gICAgICAgIHNvbHV0aW9uTGFiZWwuc3R5bGUgPSBzb2x1dGlvbkxhYmVsLnN0eWxlcVxuICAgICAgICBzb2x1dGlvbkxhYmVsLnRleHQgPSBzb2x1dGlvbkxhYmVsLnRleHRxXG5cbiAgICAgICAgdGhpcy5sYWJlbHMucHVzaChzb2x1dGlvbkxhYmVsIGFzIExhYmVsKVxuICAgIH1cblxufSIsIi8qKiBNaXNzaW5nIGFuZ2xlcyBhcm91bmQgYSBwb2ludCBvciBvbiBhIHN0cmFpZ2h0IGxpbmUsIHVzaW5nIGFsZ2VicmFpYyBleHByZXNzaW9ucyAqL1xuXG5pbXBvcnQgeyBHcmFwaGljUSB9IGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL0dyYXBoaWNRJ1xuaW1wb3J0IHsgQWxnZWJyYU9wdGlvbnMgfSBmcm9tICcuL0FsZ2VicmFPcHRpb25zJ1xuaW1wb3J0IE1pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSBmcm9tICcuL01pc3NpbmdBbmdsZXNBbGdlYnJhRGF0YSdcbmltcG9ydCBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcgZnJvbSAnLi9NaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUSBleHRlbmRzIEdyYXBoaWNRIHtcbiAgZGF0YTogTWlzc2luZ0FuZ2xlc0FsZ2VicmFEYXRhXG4gIHZpZXc6IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlld1xuXG4gIGNvbnN0cnVjdG9yIChkYXRhOiBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEsIHZpZXc6IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhVmlldykgeyAvLyBlZmZlY3RpdmVseSBwcml2YXRlXG4gICAgc3VwZXIoKSAvLyBidWJibGVzIHRvIFFcbiAgICB0aGlzLmRhdGEgPSBkYXRhXG4gICAgdGhpcy52aWV3ID0gdmlld1xuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAob3B0aW9uczogQWxnZWJyYU9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRIHtcbiAgICBjb25zdCBkZWZhdWx0cyA6IEFsZ2VicmFPcHRpb25zID0ge1xuICAgICAgYW5nbGVTdW06IDE4MCxcbiAgICAgIG1pbkFuZ2xlOiAxMCxcbiAgICAgIG1pbk46IDIsXG4gICAgICBtYXhOOiA0LFxuICAgICAgcmVwZWF0ZWQ6IGZhbHNlLFxuICAgICAgd2lkdGg6IDI1MCxcbiAgICAgIGhlaWdodDogMjUwXG4gICAgfVxuICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucylcblxuICAgIGNvbnN0IGRhdGEgPSBNaXNzaW5nQW5nbGVzQWxnZWJyYURhdGEucmFuZG9tKG9wdGlvbnMpXG4gICAgY29uc3QgdmlldyA9IG5ldyBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVZpZXcoZGF0YSwgb3B0aW9ucyBhcyB7d2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXJ9KSAvLyBUT0RPIGVsaW1pbmF0ZSBwdWJsaWMgY29uc3RydWN0b3JzXG5cbiAgICByZXR1cm4gbmV3IE1pc3NpbmdBbmdsZXNBcm91bmRBbGdlYnJhUShkYXRhLCB2aWV3KVxuICB9XG5cbiAgc3RhdGljIGdldCBjb21tYW5kV29yZCAoKSA6IHN0cmluZyB7IHJldHVybiAnRmluZCB0aGUgbWlzc2luZyB2YWx1ZScgfVxufVxuIiwiLyoqICBDbGFzcyB0byB3cmFwIHZhcmlvdXMgbWlzc2luZyBhbmdsZXMgY2xhc3Nlc1xuICogUmVhZHMgb3B0aW9ucyBhbmQgdGhlbiB3cmFwcyB0aGUgYXBwcm9wcmlhdGUgb2JqZWN0LCBtaXJyb3JpbmcgdGhlIG1haW5cbiAqIHB1YmxpYyBtZXRob2RzXG4gKlxuICogVGhpcyBjbGFzcyBkZWFscyB3aXRoIHRyYW5zbGF0aW5nIGRpZmZpY3VsdHkgaW50byBxdWVzdGlvbiB0eXBlc1xuKi9cblxuaW1wb3J0IE1pc3NpbmdBbmdsZXNBcm91bmRRIGZyb20gJ1F1ZXN0aW9uL0dyYXBoaWNRL01pc3NpbmdBbmdsZXMvTWlzc2luZ0FuZ2xlc0Fyb3VuZFEnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUSBmcm9tICdRdWVzdGlvbi9HcmFwaGljUS9NaXNzaW5nQW5nbGVzL01pc3NpbmdBbmdsZXNUcmlhbmdsZVEnXG5pbXBvcnQgUXVlc3Rpb24gZnJvbSAnUXVlc3Rpb24vUXVlc3Rpb24nXG5pbXBvcnQgeyByYW5kRWxlbSB9IGZyb20gJ1V0aWxpdGllcydcbmltcG9ydCB7IEdyYXBoaWNRIH0gZnJvbSAnLi4vR3JhcGhpY1EnXG5pbXBvcnQgeyBBbGdlYnJhT3B0aW9ucyB9IGZyb20gJy4vQWxnZWJyYU9wdGlvbnMnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRIGZyb20gJy4vTWlzc2luZ0FuZ2xlc0Fyb3VuZEFsZ2VicmFRJ1xuaW1wb3J0IHsgTnVtYmVyT3B0aW9ucyB9IGZyb20gJy4vTnVtYmVyT3B0aW9ucydcblxudHlwZSBRdWVzdGlvblR5cGUgPSAnYW9zbCcgfCAnYWFhcCcgfCAndHJpYW5nbGUnXG50eXBlIFF1ZXN0aW9uU3ViVHlwZSA9ICdzaW1wbGUnIHwgJ3JlcGVhdGVkJyB8ICdhbGdlYnJhJyB8ICd3b3JkZWQnXG5cbnR5cGUgUXVlc3Rpb25PcHRpb25zID0gTnVtYmVyT3B0aW9ucyAmIEFsZ2VicmFPcHRpb25zXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pc3NpbmdBbmdsZXNRIGV4dGVuZHMgUXVlc3Rpb24ge1xuICBxdWVzdGlvbjogR3JhcGhpY1FcblxuICBjb25zdHJ1Y3RvciAocXVlc3Rpb246IEdyYXBoaWNRKSB7XG4gICAgc3VwZXIoKVxuICAgIHRoaXMucXVlc3Rpb24gPSBxdWVzdGlvblxuICB9XG5cbiAgc3RhdGljIHJhbmRvbSAoXG4gICAgb3B0aW9uczoge1xuICAgICAgdHlwZXM6IFF1ZXN0aW9uVHlwZVtdLFxuICAgICAgZGlmZmljdWx0eTogbnVtYmVyLFxuICAgICAgY3VzdG9tOiBib29sZWFuLFxuICAgICAgc3VidHlwZT86IFF1ZXN0aW9uU3ViVHlwZVxuICAgIH0pIDogTWlzc2luZ0FuZ2xlc1Ege1xuICAgIGlmIChvcHRpb25zLnR5cGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUeXBlcyBsaXN0IG11c3QgYmUgbm9uLWVtcHR5JylcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlID0gcmFuZEVsZW0ob3B0aW9ucy50eXBlcylcbiAgICBsZXQgc3VidHlwZSA6IFF1ZXN0aW9uU3ViVHlwZVxuICAgIGxldCBxdWVzdGlvbk9wdGlvbnMgOiBRdWVzdGlvbk9wdGlvbnMgPSB7fVxuXG4gICAgc3dpdGNoIChvcHRpb25zLmRpZmZpY3VsdHkpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgc3VidHlwZSA9ICdzaW1wbGUnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDJcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgc3VidHlwZSA9ICdzaW1wbGUnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gM1xuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDRcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgc3VidHlwZSA9ICdyZXBlYXRlZCdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1pbk4gPSAzXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5tYXhOID0gNFxuICAgICAgICBicmVha1xuICAgICAgY2FzZSA0OlxuICAgICAgICBzdWJ0eXBlID0gJ2FsZ2VicmEnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5leHByZXNzaW9uVHlwZXMgPSBbJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPSBmYWxzZVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDJcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSA0XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIDU6XG4gICAgICAgIHN1YnR5cGU9J2FsZ2VicmEnXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5leHByZXNzaW9uVHlwZXMgPSBbJ2FkZCcsJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmluY2x1ZGVDb25zdGFudHMgPSBbJ211bHRpcGx5J11cbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmVuc3VyZVggPSB0cnVlXG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5taW5OID0gMlxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWF4TiA9IDNcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNjpcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHN1YnR5cGUgPSAnYWxnZWJyYSdcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmV4cHJlc3Npb25UeXBlcyA9IFsnbWl4ZWQnXVxuICAgICAgICBxdWVzdGlvbk9wdGlvbnMubWluTiA9IDJcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLm1heE4gPSAzXG4gICAgICAgIGJyZWFrXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmFuZG9tRnJvbVR5cGVXaXRoT3B0aW9ucyh0eXBlLCBzdWJ0eXBlLCBxdWVzdGlvbk9wdGlvbnMpXG4gIH1cblxuICBzdGF0aWMgcmFuZG9tRnJvbVR5cGVXaXRoT3B0aW9ucyAodHlwZTogUXVlc3Rpb25UeXBlLCBzdWJ0eXBlPzogUXVlc3Rpb25TdWJUeXBlLCBxdWVzdGlvbk9wdGlvbnM/OiBRdWVzdGlvbk9wdGlvbnMpIDogTWlzc2luZ0FuZ2xlc1Ege1xuICAgIGxldCBxdWVzdGlvbjogR3JhcGhpY1FcbiAgICBxdWVzdGlvbk9wdGlvbnMgPSBxdWVzdGlvbk9wdGlvbnMgfHwge31cbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ2FhYXAnOlxuICAgICAgY2FzZSAnYW9zbCc6IHtcbiAgICAgICAgcXVlc3Rpb25PcHRpb25zLmFuZ2xlU3VtID0gKHR5cGUgPT09ICdhYWFwJykgPyAzNjAgOiAxODBcbiAgICAgICAgc3dpdGNoIChzdWJ0eXBlKSB7XG4gICAgICAgICAgY2FzZSAnc2ltcGxlJzpcbiAgICAgICAgICBjYXNlICdyZXBlYXRlZCc6XG4gICAgICAgICAgICBxdWVzdGlvbk9wdGlvbnMucmVwZWF0ZWQgPSBzdWJ0eXBlID09PSAncmVwZWF0ZWQnXG4gICAgICAgICAgICBxdWVzdGlvbiA9IE1pc3NpbmdBbmdsZXNBcm91bmRRLnJhbmRvbShxdWVzdGlvbk9wdGlvbnMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ2FsZ2VicmEnOlxuICAgICAgICAgICAgcXVlc3Rpb24gPSBNaXNzaW5nQW5nbGVzQXJvdW5kQWxnZWJyYVEucmFuZG9tKHF1ZXN0aW9uT3B0aW9ucylcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciAoYHVuZXhwZWN0ZWQgc3VidHlwZSAke3N1YnR5cGV9YClcbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSAndHJpYW5nbGUnOiB7XG4gICAgICAgIHF1ZXN0aW9uT3B0aW9ucy5yZXBlYXRlZCA9IChzdWJ0eXBlID09PSBcInJlcGVhdGVkXCIpXG4gICAgICAgIHF1ZXN0aW9uID0gTWlzc2luZ0FuZ2xlc1RyaWFuZ2xlUS5yYW5kb20ocXVlc3Rpb25PcHRpb25zKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHR5cGUgJHt0eXBlfWApXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBNaXNzaW5nQW5nbGVzUShxdWVzdGlvbilcbiAgfVxuXG4gIGdldERPTSAoKSA6IEhUTUxFbGVtZW50IHsgcmV0dXJuIHRoaXMucXVlc3Rpb24uZ2V0RE9NKCkgfVxuICByZW5kZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5yZW5kZXIoKSB9XG4gIHNob3dBbnN3ZXIgKCkgOiB2b2lkIHsgdGhpcy5xdWVzdGlvbi5zaG93QW5zd2VyKCkgfVxuICBoaWRlQW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24uaGlkZUFuc3dlcigpIH1cbiAgdG9nZ2xlQW5zd2VyICgpIDogdm9pZCB7IHRoaXMucXVlc3Rpb24udG9nZ2xlQW5zd2VyKCkgfVxuXG4gIHN0YXRpYyBnZXQgb3B0aW9uc1NwZWMgKCkgOiB1bmtub3duW10ge1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgaWQ6ICd0eXBlcycsXG4gICAgICAgIHR5cGU6ICdzZWxlY3QtaW5jbHVzaXZlJyxcbiAgICAgICAgc2VsZWN0T3B0aW9uczogW1xuICAgICAgICAgIHsgdGl0bGU6ICdPbiBhIHN0cmFpZ2h0IGxpbmUnLCBpZDogJ2Fvc2wnIH0sXG4gICAgICAgICAgeyB0aXRsZTogJ0Fyb3VuZCBhIHBvaW50JywgaWQ6ICdhYWFwJyB9LFxuICAgICAgICAgIHsgdGl0bGU6ICdUcmlhbmdsZScsIGlkOiAndHJpYW5nbGUnIH1cbiAgICAgICAgXSxcbiAgICAgICAgZGVmYXVsdDogWydhb3NsJywgJ2FhYXAnLCAndHJpYW5nbGUnXSxcbiAgICAgICAgdmVydGljYWw6IHRydWVcbiAgICAgIH1cbiAgICBdXG4gIH1cblxuICBzdGF0aWMgZ2V0IGNvbW1hbmRXb3JkICgpIDogc3RyaW5nIHtcbiAgICByZXR1cm4gJ0ZpbmQgdGhlIG1pc3NpbmcgdmFsdWUnXG4gIH1cbn1cbiIsImltcG9ydCBBbGdlYnJhaWNGcmFjdGlvblEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvQWxnZWJyYWljRnJhY3Rpb25RJ1xuaW1wb3J0IEludGVnZXJBZGRRIGZyb20gJ1F1ZXN0aW9uL1RleHRRL0ludGVnZXJBZGQnXG5pbXBvcnQgQXJpdGhtYWdvblEgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvQXJpdGhtYWdvblEnXG5pbXBvcnQgVGVzdFEgZnJvbSAnUXVlc3Rpb24vVGV4dFEvVGVzdFEnXG5pbXBvcnQgQWRkQVplcm8gZnJvbSAnUXVlc3Rpb24vVGV4dFEvQWRkQVplcm8nXG5pbXBvcnQgRXF1YXRpb25PZkxpbmUgZnJvbSAnUXVlc3Rpb24vVGV4dFEvRXF1YXRpb25PZkxpbmUnXG5pbXBvcnQgTWlzc2luZ0FuZ2xlc1EgZnJvbSAnUXVlc3Rpb24vR3JhcGhpY1EvTWlzc2luZ0FuZ2xlcy9NaXNzaW5nQW5nbGVzV3JhcHBlcidcblxuaW1wb3J0IE9wdGlvbnNTZXQgZnJvbSAnT3B0aW9uc1NldCdcblxuY29uc3QgdG9waWNMaXN0ID0gW1xuICB7XG4gICAgaWQ6ICdhbGdlYnJhaWMtZnJhY3Rpb24nLFxuICAgIHRpdGxlOiAnU2ltcGxpZnkgYWxnZWJyYWljIGZyYWN0aW9ucycsXG4gICAgY2xhc3M6IEFsZ2VicmFpY0ZyYWN0aW9uUVxuICB9LFxuICB7XG4gICAgaWQ6ICdhZGQtYS16ZXJvJyxcbiAgICB0aXRsZTogJ011bHRpcGx5IGJ5IDEwIChob25lc3QhKScsXG4gICAgY2xhc3M6IEFkZEFaZXJvXG4gIH0sXG4gIHtcbiAgICBpZDogJ2ludGVnZXItYWRkJyxcbiAgICB0aXRsZTogJ0FkZCBpbnRlZ2VycyAodiBzaW1wbGUpJyxcbiAgICBjbGFzczogSW50ZWdlckFkZFFcbiAgfSxcbiAge1xuICAgIGlkOiAnbWlzc2luZy1hbmdsZXMnLFxuICAgIHRpdGxlOiAnTWlzc2luZyBhbmdsZXMnLFxuICAgIGNsYXNzOiBNaXNzaW5nQW5nbGVzUVxuICB9LFxuICB7XG4gICAgaWQ6ICdlcXVhdGlvbi1vZi1saW5lJyxcbiAgICB0aXRsZTogJ0VxdWF0aW9uIG9mIGEgbGluZSAoZnJvbSB0d28gcG9pbnRzKScsXG4gICAgY2xhc3M6IEVxdWF0aW9uT2ZMaW5lXG4gIH0sXG4gIHtcbiAgICBpZDogJ2FyaXRobWFnb24tYWRkJyxcbiAgICB0aXRsZTogJ0FyaXRobWFnb25zJyxcbiAgICBjbGFzczogQXJpdGhtYWdvblFcbiAgfSxcbiAge1xuICAgIGlkOiAndGVzdCcsXG4gICAgdGl0bGU6ICdUZXN0IHF1ZXN0aW9ucycsXG4gICAgY2xhc3M6IFRlc3RRXG4gIH1cbl1cblxuZnVuY3Rpb24gZ2V0Q2xhc3MgKGlkKSB7XG4gIC8vIFJldHVybiB0aGUgY2xhc3MgZ2l2ZW4gYW4gaWQgb2YgYSBxdWVzdGlvblxuXG4gIC8vIE9idmlvdXNseSB0aGlzIGlzIGFuIGluZWZmaWNpZW50IHNlYXJjaCwgYnV0IHdlIGRvbid0IG5lZWQgbWFzc2l2ZSBwZXJmb3JtYW5jZVxuICBmb3IgKGxldCBpID0gMDsgaSA8IHRvcGljTGlzdC5sZW5ndGg7IGkrKykge1xuICAgIGlmICh0b3BpY0xpc3RbaV0uaWQgPT09IGlkKSB7XG4gICAgICByZXR1cm4gdG9waWNMaXN0W2ldLmNsYXNzXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGxcbn1cblxuZnVuY3Rpb24gZ2V0VGl0bGUgKGlkKSB7XG4gIC8vIFJldHVybiB0aXRsZSBvZiBhIGdpdmVuIGlkXG4gIC8vXG4gIHJldHVybiB0b3BpY0xpc3QuZmluZCh0ID0+ICh0LmlkID09PSBpZCkpLnRpdGxlXG59XG5cbmZ1bmN0aW9uIGdldENvbW1hbmRXb3JkIChpZCkge1xuICByZXR1cm4gZ2V0Q2xhc3MoaWQpLmNvbW1hbmRXb3JkXG59XG5cbmZ1bmN0aW9uIGdldFRvcGljcyAoKSB7XG4gIC8vIHJldHVybnMgdG9waWNzIHdpdGggY2xhc3NlcyBzdHJpcHBlZCBvdXRcbiAgcmV0dXJuIHRvcGljTGlzdC5tYXAoeCA9PiAoeyBpZDogeC5pZCwgdGl0bGU6IHgudGl0bGUgfSkpXG59XG5cbmZ1bmN0aW9uIG5ld1F1ZXN0aW9uIChpZCwgb3B0aW9ucykge1xuICAvLyB0byBhdm9pZCB3cml0aW5nIGBsZXQgcSA9IG5ldyAoVG9waWNDaG9vc2VyLmdldENsYXNzKGlkKSkob3B0aW9ucylcbiAgY29uc3QgUXVlc3Rpb25DbGFzcyA9IGdldENsYXNzKGlkKVxuICBsZXQgcXVlc3Rpb25cbiAgaWYgKFF1ZXN0aW9uQ2xhc3MucmFuZG9tKSB7XG4gICAgcXVlc3Rpb24gPSBRdWVzdGlvbkNsYXNzLnJhbmRvbShvcHRpb25zKVxuICB9IGVsc2Uge1xuICAgIHF1ZXN0aW9uID0gbmV3IFF1ZXN0aW9uQ2xhc3Mob3B0aW9ucylcbiAgfVxuICByZXR1cm4gcXVlc3Rpb25cbn1cblxuZnVuY3Rpb24gbmV3T3B0aW9uc1NldCAoaWQpIHtcbiAgY29uc3Qgb3B0aW9uc1NwZWMgPSAoZ2V0Q2xhc3MoaWQpKS5vcHRpb25zU3BlYyB8fCBbXVxuICByZXR1cm4gbmV3IE9wdGlvbnNTZXQob3B0aW9uc1NwZWMpXG59XG5cbmZ1bmN0aW9uIGhhc09wdGlvbnMgKGlkKSB7XG4gIHJldHVybiAhIShnZXRDbGFzcyhpZCkub3B0aW9uc1NwZWMgJiYgZ2V0Q2xhc3MoaWQpLm9wdGlvbnNTcGVjLmxlbmd0aCA+IDApIC8vIHdlaXJkIGJvb2wgdHlwY2FzdGluZyB3b28hXG59XG5cbmV4cG9ydCB7IHRvcGljTGlzdCwgZ2V0Q2xhc3MsIG5ld1F1ZXN0aW9uLCBnZXRUb3BpY3MsIGdldFRpdGxlLCBuZXdPcHRpb25zU2V0LCBnZXRDb21tYW5kV29yZCwgaGFzT3B0aW9ucyB9XG4iLCIvKiAhXG4qIHRpbmdsZS5qc1xuKiBAYXV0aG9yICByb2Jpbl9wYXJpc2lcbiogQHZlcnNpb24gMC4xNS4yXG4qIEB1cmxcbiovXG4vLyBNb2RpZmllZCB0byBiZSBFUzYgbW9kdWxlXG5cbnZhciBpc0J1c3kgPSBmYWxzZVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBNb2RhbCAob3B0aW9ucykge1xuICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgb25DbG9zZTogbnVsbCxcbiAgICBvbk9wZW46IG51bGwsXG4gICAgYmVmb3JlT3BlbjogbnVsbCxcbiAgICBiZWZvcmVDbG9zZTogbnVsbCxcbiAgICBzdGlja3lGb290ZXI6IGZhbHNlLFxuICAgIGZvb3RlcjogZmFsc2UsXG4gICAgY3NzQ2xhc3M6IFtdLFxuICAgIGNsb3NlTGFiZWw6ICdDbG9zZScsXG4gICAgY2xvc2VNZXRob2RzOiBbJ292ZXJsYXknLCAnYnV0dG9uJywgJ2VzY2FwZSddXG4gIH1cblxuICAvLyBleHRlbmRzIGNvbmZpZ1xuICB0aGlzLm9wdHMgPSBleHRlbmQoe30sIGRlZmF1bHRzLCBvcHRpb25zKVxuXG4gIC8vIGluaXQgbW9kYWxcbiAgdGhpcy5pbml0KClcbn1cblxuTW9kYWwucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLm1vZGFsKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICBfYnVpbGQuY2FsbCh0aGlzKVxuICBfYmluZEV2ZW50cy5jYWxsKHRoaXMpXG5cbiAgLy8gaW5zZXJ0IG1vZGFsIGluIGRvbVxuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMubW9kYWwsIGRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZClcblxuICBpZiAodGhpcy5vcHRzLmZvb3Rlcikge1xuICAgIHRoaXMuYWRkRm9vdGVyKClcbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5fYnVzeSA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICBpc0J1c3kgPSBzdGF0ZVxufVxuXG5Nb2RhbC5wcm90b3R5cGUuX2lzQnVzeSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGlzQnVzeVxufVxuXG5Nb2RhbC5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMubW9kYWwgPT09IG51bGwpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIC8vIHJlc3RvcmUgc2Nyb2xsaW5nXG4gIGlmICh0aGlzLmlzT3BlbigpKSB7XG4gICAgdGhpcy5jbG9zZSh0cnVlKVxuICB9XG5cbiAgLy8gdW5iaW5kIGFsbCBldmVudHNcbiAgX3VuYmluZEV2ZW50cy5jYWxsKHRoaXMpXG5cbiAgLy8gcmVtb3ZlIG1vZGFsIGZyb20gZG9tXG4gIHRoaXMubW9kYWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLm1vZGFsKVxuXG4gIHRoaXMubW9kYWwgPSBudWxsXG59XG5cbk1vZGFsLnByb3RvdHlwZS5pc09wZW4gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiAhIXRoaXMubW9kYWwuY2xhc3NMaXN0LmNvbnRhaW5zKCd0aW5nbGUtbW9kYWwtLXZpc2libGUnKVxufVxuXG5Nb2RhbC5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuX2lzQnVzeSgpKSByZXR1cm5cbiAgdGhpcy5fYnVzeSh0cnVlKVxuXG4gIHZhciBzZWxmID0gdGhpc1xuXG4gIC8vIGJlZm9yZSBvcGVuIGNhbGxiYWNrXG4gIGlmICh0eXBlb2Ygc2VsZi5vcHRzLmJlZm9yZU9wZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICBzZWxmLm9wdHMuYmVmb3JlT3BlbigpXG4gIH1cblxuICBpZiAodGhpcy5tb2RhbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSkge1xuICAgIHRoaXMubW9kYWwuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ2Rpc3BsYXknKVxuICB9IGVsc2Uge1xuICAgIHRoaXMubW9kYWwuc3R5bGUucmVtb3ZlQXR0cmlidXRlKCdkaXNwbGF5JylcbiAgfVxuXG4gIC8vIHByZXZlbnQgZG91YmxlIHNjcm9sbFxuICB0aGlzLl9zY3JvbGxQb3NpdGlvbiA9IHdpbmRvdy5wYWdlWU9mZnNldFxuICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1lbmFibGVkJylcbiAgZG9jdW1lbnQuYm9keS5zdHlsZS50b3AgPSAtdGhpcy5fc2Nyb2xsUG9zaXRpb24gKyAncHgnXG5cbiAgLy8gc3RpY2t5IGZvb3RlclxuICB0aGlzLnNldFN0aWNreUZvb3Rlcih0aGlzLm9wdHMuc3RpY2t5Rm9vdGVyKVxuXG4gIC8vIHNob3cgbW9kYWxcbiAgdGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtLXZpc2libGUnKVxuXG4gIC8vIG9uT3BlbiBjYWxsYmFja1xuICBpZiAodHlwZW9mIHNlbGYub3B0cy5vbk9wZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICBzZWxmLm9wdHMub25PcGVuLmNhbGwoc2VsZilcbiAgfVxuXG4gIHNlbGYuX2J1c3koZmFsc2UpXG5cbiAgLy8gY2hlY2sgaWYgbW9kYWwgaXMgYmlnZ2VyIHRoYW4gc2NyZWVuIGhlaWdodFxuICB0aGlzLmNoZWNrT3ZlcmZsb3coKVxuXG4gIHJldHVybiB0aGlzXG59XG5cbk1vZGFsLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uIChmb3JjZSkge1xuICBpZiAodGhpcy5faXNCdXN5KCkpIHJldHVyblxuICB0aGlzLl9idXN5KHRydWUpXG4gIGZvcmNlID0gZm9yY2UgfHwgZmFsc2VcblxuICAvLyAgYmVmb3JlIGNsb3NlXG4gIGlmICh0eXBlb2YgdGhpcy5vcHRzLmJlZm9yZUNsb3NlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdmFyIGNsb3NlID0gdGhpcy5vcHRzLmJlZm9yZUNsb3NlLmNhbGwodGhpcylcbiAgICBpZiAoIWNsb3NlKSB7XG4gICAgICB0aGlzLl9idXN5KGZhbHNlKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICB9XG5cbiAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKCd0aW5nbGUtZW5hYmxlZCcpXG4gIGRvY3VtZW50LmJvZHkuc3R5bGUudG9wID0gbnVsbFxuICB3aW5kb3cuc2Nyb2xsVG8oe1xuICAgIHRvcDogdGhpcy5fc2Nyb2xsUG9zaXRpb24sXG4gICAgYmVoYXZpb3I6ICdpbnN0YW50J1xuICB9KVxuXG4gIHRoaXMubW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgndGluZ2xlLW1vZGFsLS12aXNpYmxlJylcblxuICAvLyB1c2luZyBzaW1pbGFyIHNldHVwIGFzIG9uT3BlblxuICB2YXIgc2VsZiA9IHRoaXNcblxuICBzZWxmLm1vZGFsLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSdcblxuICAvLyBvbkNsb3NlIGNhbGxiYWNrXG4gIGlmICh0eXBlb2Ygc2VsZi5vcHRzLm9uQ2xvc2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICBzZWxmLm9wdHMub25DbG9zZS5jYWxsKHRoaXMpXG4gIH1cblxuICAvLyByZWxlYXNlIG1vZGFsXG4gIHNlbGYuX2J1c3koZmFsc2UpXG59XG5cbk1vZGFsLnByb3RvdHlwZS5zZXRDb250ZW50ID0gZnVuY3Rpb24gKGNvbnRlbnQpIHtcbiAgLy8gY2hlY2sgdHlwZSBvZiBjb250ZW50IDogU3RyaW5nIG9yIE5vZGVcbiAgaWYgKHR5cGVvZiBjb250ZW50ID09PSAnc3RyaW5nJykge1xuICAgIHRoaXMubW9kYWxCb3hDb250ZW50LmlubmVySFRNTCA9IGNvbnRlbnRcbiAgfSBlbHNlIHtcbiAgICB0aGlzLm1vZGFsQm94Q29udGVudC5pbm5lckhUTUwgPSAnJ1xuICAgIHRoaXMubW9kYWxCb3hDb250ZW50LmFwcGVuZENoaWxkKGNvbnRlbnQpXG4gIH1cblxuICBpZiAodGhpcy5pc09wZW4oKSkge1xuICAgIC8vIGNoZWNrIGlmIG1vZGFsIGlzIGJpZ2dlciB0aGFuIHNjcmVlbiBoZWlnaHRcbiAgICB0aGlzLmNoZWNrT3ZlcmZsb3coKVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuTW9kYWwucHJvdG90eXBlLmdldENvbnRlbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLm1vZGFsQm94Q29udGVudFxufVxuXG5Nb2RhbC5wcm90b3R5cGUuYWRkRm9vdGVyID0gZnVuY3Rpb24gKCkge1xuICAvLyBhZGQgZm9vdGVyIHRvIG1vZGFsXG4gIF9idWlsZEZvb3Rlci5jYWxsKHRoaXMpXG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuTW9kYWwucHJvdG90eXBlLnNldEZvb3RlckNvbnRlbnQgPSBmdW5jdGlvbiAoY29udGVudCkge1xuICAvLyBzZXQgZm9vdGVyIGNvbnRlbnRcbiAgdGhpcy5tb2RhbEJveEZvb3Rlci5pbm5lckhUTUwgPSBjb250ZW50XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuTW9kYWwucHJvdG90eXBlLmdldEZvb3RlckNvbnRlbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLm1vZGFsQm94Rm9vdGVyXG59XG5cbk1vZGFsLnByb3RvdHlwZS5zZXRTdGlja3lGb290ZXIgPSBmdW5jdGlvbiAoaXNTdGlja3kpIHtcbiAgLy8gaWYgdGhlIG1vZGFsIGlzIHNtYWxsZXIgdGhhbiB0aGUgdmlld3BvcnQgaGVpZ2h0LCB3ZSBkb24ndCBuZWVkIHN0aWNreVxuICBpZiAoIXRoaXMuaXNPdmVyZmxvdygpKSB7XG4gICAgaXNTdGlja3kgPSBmYWxzZVxuICB9XG5cbiAgaWYgKGlzU3RpY2t5KSB7XG4gICAgaWYgKHRoaXMubW9kYWxCb3guY29udGFpbnModGhpcy5tb2RhbEJveEZvb3RlcikpIHtcbiAgICAgIHRoaXMubW9kYWxCb3gucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlcilcbiAgICAgIHRoaXMubW9kYWwuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveEZvb3RlcilcbiAgICAgIHRoaXMubW9kYWxCb3hGb290ZXIuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsLWJveF9fZm9vdGVyLS1zdGlja3knKVxuICAgICAgX3JlY2FsY3VsYXRlRm9vdGVyUG9zaXRpb24uY2FsbCh0aGlzKVxuICAgICAgdGhpcy5tb2RhbEJveENvbnRlbnQuc3R5bGVbJ3BhZGRpbmctYm90dG9tJ10gPSB0aGlzLm1vZGFsQm94Rm9vdGVyLmNsaWVudEhlaWdodCArIDIwICsgJ3B4J1xuICAgIH1cbiAgfSBlbHNlIGlmICh0aGlzLm1vZGFsQm94Rm9vdGVyKSB7XG4gICAgaWYgKCF0aGlzLm1vZGFsQm94LmNvbnRhaW5zKHRoaXMubW9kYWxCb3hGb290ZXIpKSB7XG4gICAgICB0aGlzLm1vZGFsLnJlbW92ZUNoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpXG4gICAgICB0aGlzLm1vZGFsQm94LmFwcGVuZENoaWxkKHRoaXMubW9kYWxCb3hGb290ZXIpXG4gICAgICB0aGlzLm1vZGFsQm94Rm9vdGVyLnN0eWxlLndpZHRoID0gJ2F1dG8nXG4gICAgICB0aGlzLm1vZGFsQm94Rm9vdGVyLnN0eWxlLmxlZnQgPSAnJ1xuICAgICAgdGhpcy5tb2RhbEJveENvbnRlbnQuc3R5bGVbJ3BhZGRpbmctYm90dG9tJ10gPSAnJ1xuICAgICAgdGhpcy5tb2RhbEJveEZvb3Rlci5jbGFzc0xpc3QucmVtb3ZlKCd0aW5nbGUtbW9kYWwtYm94X19mb290ZXItLXN0aWNreScpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuTW9kYWwucHJvdG90eXBlLmFkZEZvb3RlckJ0biA9IGZ1bmN0aW9uIChsYWJlbCwgY3NzQ2xhc3MsIGNhbGxiYWNrKSB7XG4gIHZhciBidG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKVxuXG4gIC8vIHNldCBsYWJlbFxuICBidG4uaW5uZXJIVE1MID0gbGFiZWxcblxuICAvLyBiaW5kIGNhbGxiYWNrXG4gIGJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGNhbGxiYWNrKVxuXG4gIGlmICh0eXBlb2YgY3NzQ2xhc3MgPT09ICdzdHJpbmcnICYmIGNzc0NsYXNzLmxlbmd0aCkge1xuICAgIC8vIGFkZCBjbGFzc2VzIHRvIGJ0blxuICAgIGNzc0NsYXNzLnNwbGl0KCcgJykuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgYnRuLmNsYXNzTGlzdC5hZGQoaXRlbSlcbiAgICB9KVxuICB9XG5cbiAgdGhpcy5tb2RhbEJveEZvb3Rlci5hcHBlbmRDaGlsZChidG4pXG5cbiAgcmV0dXJuIGJ0blxufVxuXG5Nb2RhbC5wcm90b3R5cGUucmVzaXplID0gZnVuY3Rpb24gKCkge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBjb25zb2xlLndhcm4oJ1Jlc2l6ZSBpcyBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gdmVyc2lvbiAxLjAnKVxufVxuXG5Nb2RhbC5wcm90b3R5cGUuaXNPdmVyZmxvdyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHZpZXdwb3J0SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0XG4gIHZhciBtb2RhbEhlaWdodCA9IHRoaXMubW9kYWxCb3guY2xpZW50SGVpZ2h0XG5cbiAgcmV0dXJuIG1vZGFsSGVpZ2h0ID49IHZpZXdwb3J0SGVpZ2h0XG59XG5cbk1vZGFsLnByb3RvdHlwZS5jaGVja092ZXJmbG93ID0gZnVuY3Rpb24gKCkge1xuICAvLyBvbmx5IGlmIHRoZSBtb2RhbCBpcyBjdXJyZW50bHkgc2hvd25cbiAgaWYgKHRoaXMubW9kYWwuY2xhc3NMaXN0LmNvbnRhaW5zKCd0aW5nbGUtbW9kYWwtLXZpc2libGUnKSkge1xuICAgIGlmICh0aGlzLmlzT3ZlcmZsb3coKSkge1xuICAgICAgdGhpcy5tb2RhbC5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWwtLW92ZXJmbG93JylcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5tb2RhbC5jbGFzc0xpc3QucmVtb3ZlKCd0aW5nbGUtbW9kYWwtLW92ZXJmbG93JylcbiAgICB9XG5cbiAgICAvLyB0T0RPOiByZW1vdmUgb2Zmc2V0XG4gICAgLy8gX29mZnNldC5jYWxsKHRoaXMpO1xuICAgIGlmICghdGhpcy5pc092ZXJmbG93KCkgJiYgdGhpcy5vcHRzLnN0aWNreUZvb3Rlcikge1xuICAgICAgdGhpcy5zZXRTdGlja3lGb290ZXIoZmFsc2UpXG4gICAgfSBlbHNlIGlmICh0aGlzLmlzT3ZlcmZsb3coKSAmJiB0aGlzLm9wdHMuc3RpY2t5Rm9vdGVyKSB7XG4gICAgICBfcmVjYWxjdWxhdGVGb290ZXJQb3NpdGlvbi5jYWxsKHRoaXMpXG4gICAgICB0aGlzLnNldFN0aWNreUZvb3Rlcih0cnVlKVxuICAgIH1cbiAgfVxufVxuXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuLyogPT0gcHJpdmF0ZSBtZXRob2RzICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuXG5mdW5jdGlvbiBjbG9zZUljb24gKCkge1xuICByZXR1cm4gJzxzdmcgdmlld0JveD1cIjAgMCAxMCAxMFwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj48cGF0aCBkPVwiTS4zIDkuN2MuMi4yLjQuMy43LjMuMyAwIC41LS4xLjctLjNMNSA2LjRsMy4zIDMuM2MuMi4yLjUuMy43LjMuMiAwIC41LS4xLjctLjMuNC0uNC40LTEgMC0xLjRMNi40IDVsMy4zLTMuM2MuNC0uNC40LTEgMC0xLjQtLjQtLjQtMS0uNC0xLjQgMEw1IDMuNiAxLjcuM0MxLjMtLjEuNy0uMS4zLjNjLS40LjQtLjQgMSAwIDEuNEwzLjYgNSAuMyA4LjNjLS40LjQtLjQgMSAwIDEuNHpcIiBmaWxsPVwiIzAwMFwiIGZpbGwtcnVsZT1cIm5vbnplcm9cIi8+PC9zdmc+J1xufVxuXG5mdW5jdGlvbiBfcmVjYWxjdWxhdGVGb290ZXJQb3NpdGlvbiAoKSB7XG4gIGlmICghdGhpcy5tb2RhbEJveEZvb3Rlcikge1xuICAgIHJldHVyblxuICB9XG4gIHRoaXMubW9kYWxCb3hGb290ZXIuc3R5bGUud2lkdGggPSB0aGlzLm1vZGFsQm94LmNsaWVudFdpZHRoICsgJ3B4J1xuICB0aGlzLm1vZGFsQm94Rm9vdGVyLnN0eWxlLmxlZnQgPSB0aGlzLm1vZGFsQm94Lm9mZnNldExlZnQgKyAncHgnXG59XG5cbmZ1bmN0aW9uIF9idWlsZCAoKSB7XG4gIC8vIHdyYXBwZXJcbiAgdGhpcy5tb2RhbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsJylcblxuICAvLyByZW1vdmUgY3Vzb3IgaWYgbm8gb3ZlcmxheSBjbG9zZSBtZXRob2RcbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMubGVuZ3RoID09PSAwIHx8IHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignb3ZlcmxheScpID09PSAtMSkge1xuICAgIHRoaXMubW9kYWwuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsLS1ub092ZXJsYXlDbG9zZScpXG4gIH1cblxuICB0aGlzLm1vZGFsLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSdcblxuICAvLyBjdXN0b20gY2xhc3NcbiAgdGhpcy5vcHRzLmNzc0NsYXNzLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLm1vZGFsLmNsYXNzTGlzdC5hZGQoaXRlbSlcbiAgICB9XG4gIH0sIHRoaXMpXG5cbiAgLy8gY2xvc2UgYnRuXG4gIGlmICh0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoJ2J1dHRvbicpICE9PSAtMSkge1xuICAgIHRoaXMubW9kYWxDbG9zZUJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuLnR5cGUgPSAnYnV0dG9uJ1xuICAgIHRoaXMubW9kYWxDbG9zZUJ0bi5jbGFzc0xpc3QuYWRkKCd0aW5nbGUtbW9kYWxfX2Nsb3NlJylcblxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bkljb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJylcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG5JY29uLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbF9fY2xvc2VJY29uJylcbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG5JY29uLmlubmVySFRNTCA9IGNsb3NlSWNvbigpXG5cbiAgICB0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKVxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bkxhYmVsLmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbF9fY2xvc2VMYWJlbCcpXG4gICAgdGhpcy5tb2RhbENsb3NlQnRuTGFiZWwuaW5uZXJIVE1MID0gdGhpcy5vcHRzLmNsb3NlTGFiZWxcblxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bi5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQ2xvc2VCdG5JY29uKVxuICAgIHRoaXMubW9kYWxDbG9zZUJ0bi5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQ2xvc2VCdG5MYWJlbClcbiAgfVxuXG4gIC8vIG1vZGFsXG4gIHRoaXMubW9kYWxCb3ggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICB0aGlzLm1vZGFsQm94LmNsYXNzTGlzdC5hZGQoJ3RpbmdsZS1tb2RhbC1ib3gnKVxuXG4gIC8vIG1vZGFsIGJveCBjb250ZW50XG4gIHRoaXMubW9kYWxCb3hDb250ZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgdGhpcy5tb2RhbEJveENvbnRlbnQuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsLWJveF9fY29udGVudCcpXG5cbiAgdGhpcy5tb2RhbEJveC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Q29udGVudClcblxuICBpZiAodGhpcy5vcHRzLmNsb3NlTWV0aG9kcy5pbmRleE9mKCdidXR0b24nKSAhPT0gLTEpIHtcbiAgICB0aGlzLm1vZGFsLmFwcGVuZENoaWxkKHRoaXMubW9kYWxDbG9zZUJ0bilcbiAgfVxuXG4gIHRoaXMubW9kYWwuYXBwZW5kQ2hpbGQodGhpcy5tb2RhbEJveClcbn1cblxuZnVuY3Rpb24gX2J1aWxkRm9vdGVyICgpIHtcbiAgdGhpcy5tb2RhbEJveEZvb3RlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIHRoaXMubW9kYWxCb3hGb290ZXIuY2xhc3NMaXN0LmFkZCgndGluZ2xlLW1vZGFsLWJveF9fZm9vdGVyJylcbiAgdGhpcy5tb2RhbEJveC5hcHBlbmRDaGlsZCh0aGlzLm1vZGFsQm94Rm9vdGVyKVxufVxuXG5mdW5jdGlvbiBfYmluZEV2ZW50cyAoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHtcbiAgICBjbGlja0Nsb3NlQnRuOiB0aGlzLmNsb3NlLmJpbmQodGhpcyksXG4gICAgY2xpY2tPdmVybGF5OiBfaGFuZGxlQ2xpY2tPdXRzaWRlLmJpbmQodGhpcyksXG4gICAgcmVzaXplOiB0aGlzLmNoZWNrT3ZlcmZsb3cuYmluZCh0aGlzKSxcbiAgICBrZXlib2FyZE5hdjogX2hhbmRsZUtleWJvYXJkTmF2LmJpbmQodGhpcylcbiAgfVxuXG4gIGlmICh0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoJ2J1dHRvbicpICE9PSAtMSkge1xuICAgIHRoaXMubW9kYWxDbG9zZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuX2V2ZW50cy5jbGlja0Nsb3NlQnRuKVxuICB9XG5cbiAgdGhpcy5tb2RhbC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCB0aGlzLl9ldmVudHMuY2xpY2tPdmVybGF5KVxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5fZXZlbnRzLnJlc2l6ZSlcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHRoaXMuX2V2ZW50cy5rZXlib2FyZE5hdilcbn1cblxuZnVuY3Rpb24gX2hhbmRsZUtleWJvYXJkTmF2IChldmVudCkge1xuICAvLyBlc2NhcGUga2V5XG4gIGlmICh0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoJ2VzY2FwZScpICE9PSAtMSAmJiBldmVudC53aGljaCA9PT0gMjcgJiYgdGhpcy5pc09wZW4oKSkge1xuICAgIHRoaXMuY2xvc2UoKVxuICB9XG59XG5cbmZ1bmN0aW9uIF9oYW5kbGVDbGlja091dHNpZGUgKGV2ZW50KSB7XG4gIC8vIG9uIG1hY09TLCBjbGljayBvbiBzY3JvbGxiYXIgKGhpZGRlbiBtb2RlKSB3aWxsIHRyaWdnZXIgY2xvc2UgZXZlbnQgc28gd2UgbmVlZCB0byBieXBhc3MgdGhpcyBiZWhhdmlvciBieSBkZXRlY3Rpbmcgc2Nyb2xsYmFyIG1vZGVcbiAgdmFyIHNjcm9sbGJhcldpZHRoID0gdGhpcy5tb2RhbC5vZmZzZXRXaWR0aCAtIHRoaXMubW9kYWwuY2xpZW50V2lkdGhcbiAgdmFyIGNsaWNrZWRPblNjcm9sbGJhciA9IGV2ZW50LmNsaWVudFggPj0gdGhpcy5tb2RhbC5vZmZzZXRXaWR0aCAtIDE1IC8vIDE1cHggaXMgbWFjT1Mgc2Nyb2xsYmFyIGRlZmF1bHQgd2lkdGhcbiAgdmFyIGlzU2Nyb2xsYWJsZSA9IHRoaXMubW9kYWwuc2Nyb2xsSGVpZ2h0ICE9PSB0aGlzLm1vZGFsLm9mZnNldEhlaWdodFxuICBpZiAobmF2aWdhdG9yLnBsYXRmb3JtID09PSAnTWFjSW50ZWwnICYmIHNjcm9sbGJhcldpZHRoID09PSAwICYmIGNsaWNrZWRPblNjcm9sbGJhciAmJiBpc1Njcm9sbGFibGUpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIC8vIGlmIGNsaWNrIGlzIG91dHNpZGUgdGhlIG1vZGFsXG4gIGlmICh0aGlzLm9wdHMuY2xvc2VNZXRob2RzLmluZGV4T2YoJ292ZXJsYXknKSAhPT0gLTEgJiYgIV9maW5kQW5jZXN0b3IoZXZlbnQudGFyZ2V0LCAndGluZ2xlLW1vZGFsJykgJiZcbiAgICBldmVudC5jbGllbnRYIDwgdGhpcy5tb2RhbC5jbGllbnRXaWR0aCkge1xuICAgIHRoaXMuY2xvc2UoKVxuICB9XG59XG5cbmZ1bmN0aW9uIF9maW5kQW5jZXN0b3IgKGVsLCBjbHMpIHtcbiAgd2hpbGUgKChlbCA9IGVsLnBhcmVudEVsZW1lbnQpICYmICFlbC5jbGFzc0xpc3QuY29udGFpbnMoY2xzKSk7XG4gIHJldHVybiBlbFxufVxuXG5mdW5jdGlvbiBfdW5iaW5kRXZlbnRzICgpIHtcbiAgaWYgKHRoaXMub3B0cy5jbG9zZU1ldGhvZHMuaW5kZXhPZignYnV0dG9uJykgIT09IC0xKSB7XG4gICAgdGhpcy5tb2RhbENsb3NlQnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5fZXZlbnRzLmNsaWNrQ2xvc2VCdG4pXG4gIH1cbiAgdGhpcy5tb2RhbC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCB0aGlzLl9ldmVudHMuY2xpY2tPdmVybGF5KVxuICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5fZXZlbnRzLnJlc2l6ZSlcbiAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHRoaXMuX2V2ZW50cy5rZXlib2FyZE5hdilcbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbi8qID09IGhlbHBlcnMgKi9cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cbmZ1bmN0aW9uIGV4dGVuZCAoKSB7XG4gIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgZm9yICh2YXIga2V5IGluIGFyZ3VtZW50c1tpXSkge1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhcmd1bWVudHNbaV0sIGtleSkpIHtcbiAgICAgICAgYXJndW1lbnRzWzBdW2tleV0gPSBhcmd1bWVudHNbaV1ba2V5XVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gYXJndW1lbnRzWzBdXG59XG4iLCJpbXBvcnQgUlNsaWRlciBmcm9tICd2ZW5kb3IvcnNsaWRlcidcbmltcG9ydCBPcHRpb25zU2V0IGZyb20gJ09wdGlvbnNTZXQnXG5pbXBvcnQgKiBhcyBUb3BpY0Nob29zZXIgZnJvbSAnVG9waWNDaG9vc2VyJ1xuaW1wb3J0IE1vZGFsIGZyb20gJ3ZlbmRvci9UaW5nbGUnXG5pbXBvcnQgeyByYW5kRWxlbSwgY3JlYXRlRWxlbSwgaGFzQW5jZXN0b3JDbGFzcywgYm9vbE9iamVjdFRvQXJyYXkgfSBmcm9tICdVdGlsaXRpZXMnXG5cbmNvbnN0IFNIT1dfRElGRklDVUxUWSA9IHRydWVcblxuLyogVE9ETyBsaXN0OlxuICogQWRkaXRpb25hbCBxdWVzdGlvbiBibG9jayAtIHByb2JhYmx5IGluIG1haW4uanNcbiAqIFJlbW92ZSBvcHRpb25zIGJ1dHRvbiBmb3IgdG9waWNzIHdpdGhvdXQgb3B0aW9uc1xuICogWm9vbS9zY2FsZSBidXR0b25zXG4gKi9cblxuLy8gTWFrZSBhbiBvdmVybGF5IHRvIGNhcHR1cmUgYW55IGNsaWNrcyBvdXRzaWRlIGJveGVzLCBpZiBuZWNlc3NhcnlcbmNyZWF0ZUVsZW0oJ2RpdicsICdvdmVybGF5IGhpZGRlbicsIGRvY3VtZW50LmJvZHkpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgaGlkZUFsbEFjdGlvbnMpXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFF1ZXN0aW9uU2V0IHtcbiAgY29uc3RydWN0b3IgKHFOdW1iZXIpIHtcbiAgICB0aGlzLnF1ZXN0aW9ucyA9IFtdIC8vIGxpc3Qgb2YgcXVlc3Rpb25zIGFuZCB0aGUgRE9NIGVsZW1lbnQgdGhleSdyZSByZW5kZXJlZCBpblxuICAgIHRoaXMudG9waWNzID0gW10gLy8gbGlzdCBvZiB0b3BpY3Mgd2hpY2ggaGF2ZSBiZWVuIHNlbGVjdGVkIGZvciB0aGlzIHNldFxuICAgIHRoaXMub3B0aW9uc1NldHMgPSBbXSAvLyBsaXN0IG9mIE9wdGlvbnNTZXQgb2JqZWN0cyBjYXJyeWluZyBvcHRpb25zIGZvciB0b3BpY3Mgd2l0aCBvcHRpb25zXG4gICAgdGhpcy5xTnVtYmVyID0gcU51bWJlciB8fCAxIC8vIFF1ZXN0aW9uIG51bWJlciAocGFzc2VkIGluIGJ5IGNhbGxlciwgd2hpY2ggd2lsbCBrZWVwIGNvdW50KVxuICAgIHRoaXMuYW5zd2VyZWQgPSBmYWxzZSAvLyBXaGV0aGVyIGFuc3dlcmVkIG9yIG5vdFxuICAgIHRoaXMuY29tbWFuZFdvcmQgPSAnJyAvLyBTb21ldGhpbmcgbGlrZSAnc2ltcGxpZnknXG4gICAgdGhpcy51c2VDb21tYW5kV29yZCA9IHRydWUgLy8gVXNlIHRoZSBjb21tYW5kIHdvcmQgaW4gdGhlIG1haW4gcXVlc3Rpb24sIGZhbHNlIGdpdmUgY29tbWFuZCB3b3JkIHdpdGggZWFjaCBzdWJxdWVzdGlvblxuICAgIHRoaXMubiA9IDggLy8gTnVtYmVyIG9mIHF1ZXN0aW9uc1xuXG4gICAgdGhpcy5fYnVpbGQoKVxuICB9XG5cbiAgX2J1aWxkICgpIHtcbiAgICB0aGlzLm91dGVyQm94ID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLW91dGVyYm94JylcbiAgICB0aGlzLmhlYWRlckJveCA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1oZWFkZXJib3gnLCB0aGlzLm91dGVyQm94KVxuICAgIHRoaXMuZGlzcGxheUJveCA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1kaXNwbGF5Ym94JywgdGhpcy5vdXRlckJveClcblxuICAgIHRoaXMuX2J1aWxkT3B0aW9uc0JveCgpXG5cbiAgICB0aGlzLl9idWlsZFRvcGljQ2hvb3NlcigpXG4gIH1cblxuICBfYnVpbGRPcHRpb25zQm94ICgpIHtcbiAgICBjb25zdCB0b3BpY1NwYW4gPSBjcmVhdGVFbGVtKCdzcGFuJywgbnVsbCwgdGhpcy5oZWFkZXJCb3gpXG4gICAgdGhpcy50b3BpY0Nob29zZXJCdXR0b24gPSBjcmVhdGVFbGVtKCdzcGFuJywgJ3RvcGljLWNob29zZXIgYnV0dG9uJywgdG9waWNTcGFuKVxuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uLmlubmVySFRNTCA9ICdDaG9vc2UgdG9waWMnXG4gICAgdGhpcy50b3BpY0Nob29zZXJCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLmNob29zZVRvcGljcygpKVxuXG4gICAgY29uc3QgZGlmZmljdWx0eVNwYW4gPSBjcmVhdGVFbGVtKCdzcGFuJywgbnVsbCwgdGhpcy5oZWFkZXJCb3gpXG4gICAgZGlmZmljdWx0eVNwYW4uYXBwZW5kKCdEaWZmaWN1bHR5OiAnKVxuICAgIGNvbnN0IGRpZmZpY3VsdHlTbGlkZXJPdXRlciA9IGNyZWF0ZUVsZW0oJ3NwYW4nLCAnc2xpZGVyLW91dGVyJywgZGlmZmljdWx0eVNwYW4pXG4gICAgdGhpcy5kaWZmaWN1bHR5U2xpZGVyRWxlbWVudCA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgbnVsbCwgZGlmZmljdWx0eVNsaWRlck91dGVyKVxuXG4gICAgY29uc3QgblNwYW4gPSBjcmVhdGVFbGVtKCdzcGFuJywgbnVsbCwgdGhpcy5oZWFkZXJCb3gpXG4gICAgblNwYW4uYXBwZW5kKCdOdW1iZXIgb2YgcXVlc3Rpb25zOiAnKVxuICAgIGNvbnN0IG5RdWVzdGlvbnNJbnB1dCA9IGNyZWF0ZUVsZW0oJ2lucHV0JywgJ24tcXVlc3Rpb25zJywgblNwYW4pXG4gICAgblF1ZXN0aW9uc0lucHV0LnR5cGUgPSAnbnVtYmVyJ1xuICAgIG5RdWVzdGlvbnNJbnB1dC5taW4gPSAnMSdcbiAgICBuUXVlc3Rpb25zSW5wdXQudmFsdWUgPSAnOCdcbiAgICBuUXVlc3Rpb25zSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgdGhpcy5uID0gcGFyc2VJbnQoblF1ZXN0aW9uc0lucHV0LnZhbHVlKVxuICAgIH0pXG5cbiAgICB0aGlzLmdlbmVyYXRlQnV0dG9uID0gY3JlYXRlRWxlbSgnYnV0dG9uJywgJ2dlbmVyYXRlLWJ1dHRvbiBidXR0b24nLCB0aGlzLmhlYWRlckJveClcbiAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmRpc2FibGVkID0gdHJ1ZVxuICAgIHRoaXMuZ2VuZXJhdGVCdXR0b24uaW5uZXJIVE1MID0gJ0dlbmVyYXRlISdcbiAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5nZW5lcmF0ZUFsbCgpKVxuICB9XG5cbiAgX2luaXRTbGlkZXIgKCkge1xuICAgIHRoaXMuZGlmZmljdWx0eVNsaWRlciA9IG5ldyBSU2xpZGVyKHtcbiAgICAgIHRhcmdldDogdGhpcy5kaWZmaWN1bHR5U2xpZGVyRWxlbWVudCxcbiAgICAgIHZhbHVlczogeyBtaW46IDEsIG1heDogMTAgfSxcbiAgICAgIHJhbmdlOiB0cnVlLFxuICAgICAgc2V0OiBbMiwgNl0sXG4gICAgICBzdGVwOiAxLFxuICAgICAgdG9vbHRpcDogZmFsc2UsXG4gICAgICBzY2FsZTogdHJ1ZSxcbiAgICAgIGxhYmVsczogdHJ1ZVxuICAgIH0pXG4gIH1cblxuICBfYnVpbGRUb3BpY0Nob29zZXIgKCkge1xuICAgIC8vIGJ1aWxkIGFuIE9wdGlvbnNTZXQgb2JqZWN0IGZvciB0aGUgdG9waWNzXG4gICAgY29uc3QgdG9waWNzID0gVG9waWNDaG9vc2VyLmdldFRvcGljcygpXG4gICAgY29uc3Qgb3B0aW9uc1NwZWMgPSBbXVxuICAgIHRvcGljcy5mb3JFYWNoKHRvcGljID0+IHtcbiAgICAgIG9wdGlvbnNTcGVjLnB1c2goe1xuICAgICAgICB0aXRsZTogdG9waWMudGl0bGUsXG4gICAgICAgIGlkOiB0b3BpYy5pZCxcbiAgICAgICAgdHlwZTogJ2Jvb2wnLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgc3dhcExhYmVsOiB0cnVlXG4gICAgICB9KVxuICAgIH0pXG4gICAgdGhpcy50b3BpY3NPcHRpb25zID0gbmV3IE9wdGlvbnNTZXQob3B0aW9uc1NwZWMpXG5cbiAgICAvLyBCdWlsZCBhIG1vZGFsIGRpYWxvZyB0byBwdXQgdGhlbSBpblxuICAgIHRoaXMudG9waWNzTW9kYWwgPSBuZXcgTW9kYWwoe1xuICAgICAgZm9vdGVyOiB0cnVlLFxuICAgICAgc3RpY2t5Rm9vdGVyOiBmYWxzZSxcbiAgICAgIGNsb3NlTWV0aG9kczogWydvdmVybGF5JywgJ2VzY2FwZSddLFxuICAgICAgY2xvc2VMYWJlbDogJ0Nsb3NlJyxcbiAgICAgIG9uQ2xvc2U6ICgpID0+IHtcbiAgICAgICAgdGhpcy51cGRhdGVUb3BpY3MoKVxuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGlzLnRvcGljc01vZGFsLmFkZEZvb3RlckJ0bihcbiAgICAgICdPSycsXG4gICAgICAnYnV0dG9uIG1vZGFsLWJ1dHRvbicsXG4gICAgICAoKSA9PiB7XG4gICAgICAgIHRoaXMudG9waWNzTW9kYWwuY2xvc2UoKVxuICAgICAgfSlcblxuICAgIC8vIHJlbmRlciBvcHRpb25zIGludG8gbW9kYWxcbiAgICB0aGlzLnRvcGljc09wdGlvbnMucmVuZGVySW4odGhpcy50b3BpY3NNb2RhbC5tb2RhbEJveENvbnRlbnQpXG5cbiAgICAvLyBBZGQgZnVydGhlciBvcHRpb25zIGJ1dHRvbnNcbiAgICAvLyBUaGlzIGZlZWxzIGEgYml0IGlmZnkgLSBkZXBlbmRzIHRvbyBtdWNoIG9uIGltcGxlbWVudGF0aW9uIG9mIE9wdGlvbnNTZXRcbiAgICBjb25zdCBsaXMgPSBBcnJheS5mcm9tKHRoaXMudG9waWNzTW9kYWwubW9kYWxCb3hDb250ZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdsaScpKVxuICAgIGxpcy5mb3JFYWNoKGxpID0+IHtcbiAgICAgIGNvbnN0IHRvcGljSWQgPSBsaS5kYXRhc2V0Lm9wdGlvbklkXG4gICAgICBpZiAoVG9waWNDaG9vc2VyLmhhc09wdGlvbnModG9waWNJZCkpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9uc0J1dHRvbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdpY29uLWJ1dHRvbiBleHRyYS1vcHRpb25zLWJ1dHRvbicsIGxpKVxuICAgICAgICB0aGlzLl9idWlsZFRvcGljT3B0aW9ucyhsaS5kYXRhc2V0Lm9wdGlvbklkLCBvcHRpb25zQnV0dG9uKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBfYnVpbGRUb3BpY09wdGlvbnMgKHRvcGljSWQsIG9wdGlvbnNCdXR0b24pIHtcbiAgICAvLyBCdWlsZCB0aGUgVUkgYW5kIE9wdGlvbnNTZXQgb2JqZWN0IGxpbmtlZCB0byB0b3BpY0lkLiBQYXNzIGluIGEgYnV0dG9uIHdoaWNoIHNob3VsZCBsYXVuY2ggaXRcblxuICAgIC8vIE1ha2UgdGhlIE9wdGlvbnNTZXQgb2JqZWN0IGFuZCBzdG9yZSBhIHJlZmVyZW5jZSB0byBpdFxuICAgIC8vIE9ubHkgc3RvcmUgaWYgb2JqZWN0IGlzIGNyZWF0ZWQ/XG4gICAgY29uc3Qgb3B0aW9uc1NldCA9IFRvcGljQ2hvb3Nlci5uZXdPcHRpb25zU2V0KHRvcGljSWQpXG4gICAgdGhpcy5vcHRpb25zU2V0c1t0b3BpY0lkXSA9IG9wdGlvbnNTZXRcblxuICAgIC8vIE1ha2UgYSBtb2RhbCBkaWFsb2cgZm9yIGl0XG4gICAgY29uc3QgbW9kYWwgPSBuZXcgTW9kYWwoe1xuICAgICAgZm9vdGVyOiB0cnVlLFxuICAgICAgc3RpY2t5Rm9vdGVyOiBmYWxzZSxcbiAgICAgIGNsb3NlTWV0aG9kczogWydvdmVybGF5JywgJ2VzY2FwZSddLFxuICAgICAgY2xvc2VMYWJlbDogJ0Nsb3NlJ1xuICAgIH0pXG5cbiAgICBtb2RhbC5hZGRGb290ZXJCdG4oXG4gICAgICAnT0snLFxuICAgICAgJ2J1dHRvbiBtb2RhbC1idXR0b24nLFxuICAgICAgKCkgPT4ge1xuICAgICAgICBtb2RhbC5jbG9zZSgpXG4gICAgICB9KVxuXG4gICAgb3B0aW9uc1NldC5yZW5kZXJJbihtb2RhbC5tb2RhbEJveENvbnRlbnQpXG5cbiAgICAvLyBsaW5rIHRoZSBtb2RhbCB0byB0aGUgYnV0dG9uXG4gICAgb3B0aW9uc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIG1vZGFsLm9wZW4oKVxuICAgIH0pXG4gIH1cblxuICBjaG9vc2VUb3BpY3MgKCkge1xuICAgIHRoaXMudG9waWNzTW9kYWwub3BlbigpXG4gIH1cblxuICB1cGRhdGVUb3BpY3MgKCkge1xuICAgIC8vIHRvcGljIGNob2ljZXMgYXJlIHN0b3JlZCBpbiB0aGlzLnRvcGljc09wdGlvbnMgYXV0b21hdGljYWxseVxuICAgIC8vIHB1bGwgdGhpcyBpbnRvIHRoaXMudG9waWNzIGFuZCB1cGRhdGUgYnV0dG9uIGRpc3BsYXlzXG5cbiAgICAvLyBoYXZlIG9iamVjdCB3aXRoIGJvb2xlYW4gcHJvcGVydGllcy4gSnVzdCB3YW50IHRoZSB0cnVlIHZhbHVlc1xuICAgIGNvbnN0IHRvcGljcyA9IGJvb2xPYmplY3RUb0FycmF5KHRoaXMudG9waWNzT3B0aW9ucy5vcHRpb25zKVxuICAgIHRoaXMudG9waWNzID0gdG9waWNzXG5cbiAgICBsZXQgdGV4dFxuXG4gICAgaWYgKHRvcGljcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRleHQgPSAnQ2hvb3NlIHRvcGljJyAvLyBub3RoaW5nIHNlbGVjdGVkXG4gICAgICB0aGlzLmdlbmVyYXRlQnV0dG9uLmRpc2FibGVkID0gdHJ1ZVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBpZCA9IHRvcGljc1swXSAvLyBmaXJzdCBpdGVtIHNlbGVjdGVkXG4gICAgICB0ZXh0ID0gVG9waWNDaG9vc2VyLmdldFRpdGxlKGlkKVxuICAgICAgdGhpcy5nZW5lcmF0ZUJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlXG4gICAgfVxuXG4gICAgaWYgKHRvcGljcy5sZW5ndGggPiAxKSB7IC8vIGFueSBhZGRpdGlvbmFsIHNob3cgYXMgZS5nLiAnICsgMVxuICAgICAgdGV4dCArPSAnICsnICsgKHRvcGljcy5sZW5ndGggLSAxKVxuICAgIH1cblxuICAgIHRoaXMudG9waWNDaG9vc2VyQnV0dG9uLmlubmVySFRNTCA9IHRleHRcbiAgfVxuXG4gIHNldENvbW1hbmRXb3JkICgpIHtcbiAgICAvLyBmaXJzdCBzZXQgdG8gZmlyc3QgdG9waWMgY29tbWFuZCB3b3JkXG4gICAgbGV0IGNvbW1hbmRXb3JkID0gVG9waWNDaG9vc2VyLmdldENsYXNzKHRoaXMudG9waWNzWzBdKS5jb21tYW5kV29yZFxuICAgIGxldCB1c2VDb21tYW5kV29yZCA9IHRydWUgLy8gdHJ1ZSBpZiBzaGFyZWQgY29tbWFuZCB3b3JkXG5cbiAgICAvLyBjeWNsZSB0aHJvdWdoIHJlc3Qgb2YgdG9waWNzLCByZXNldCBjb21tYW5kIHdvcmQgaWYgdGhleSBkb24ndCBtYXRjaFxuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgdGhpcy50b3BpY3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChUb3BpY0Nob29zZXIuZ2V0Q2xhc3ModGhpcy50b3BpY3NbaV0pLmNvbW1hbmRXb3JkICE9PSBjb21tYW5kV29yZCkge1xuICAgICAgICBjb21tYW5kV29yZCA9ICcnXG4gICAgICAgIHVzZUNvbW1hbmRXb3JkID0gZmFsc2VcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNvbW1hbmRXb3JkID0gY29tbWFuZFdvcmRcbiAgICB0aGlzLnVzZUNvbW1hbmRXb3JkID0gdXNlQ29tbWFuZFdvcmRcbiAgfVxuXG4gIGdlbmVyYXRlQWxsICgpIHtcbiAgICAvLyBDbGVhciBkaXNwbGF5LWJveCBhbmQgcXVlc3Rpb24gbGlzdFxuICAgIHRoaXMuZGlzcGxheUJveC5pbm5lckhUTUwgPSAnJ1xuICAgIHRoaXMucXVlc3Rpb25zID0gW11cbiAgICB0aGlzLnNldENvbW1hbmRXb3JkKClcblxuICAgIC8vIFNldCBudW1iZXIgYW5kIG1haW4gY29tbWFuZCB3b3JkXG4gICAgY29uc3QgbWFpbnEgPSBjcmVhdGVFbGVtKCdwJywgJ2thdGV4IG1haW5xJywgdGhpcy5kaXNwbGF5Qm94KVxuICAgIG1haW5xLmlubmVySFRNTCA9IGAke3RoaXMucU51bWJlcn0uICR7dGhpcy5jb21tYW5kV29yZH1gIC8vIFRPRE86IGdldCBjb21tYW5kIHdvcmQgZnJvbSBxdWVzdGlvbnNcblxuICAgIC8vIE1ha2Ugc2hvdyBhbnN3ZXJzIGJ1dHRvblxuICAgIHRoaXMuYW5zd2VyQnV0dG9uID0gY3JlYXRlRWxlbSgncCcsICdidXR0b24gc2hvdy1hbnN3ZXJzJywgdGhpcy5kaXNwbGF5Qm94KVxuICAgIHRoaXMuYW5zd2VyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgdGhpcy50b2dnbGVBbnN3ZXJzKClcbiAgICB9KVxuICAgIHRoaXMuYW5zd2VyQnV0dG9uLmlubmVySFRNTCA9ICdTaG93IGFuc3dlcnMnXG5cbiAgICAvLyBHZXQgZGlmZmljdWx0eSBmcm9tIHNsaWRlclxuICAgIGNvbnN0IG1pbmRpZmYgPSB0aGlzLmRpZmZpY3VsdHlTbGlkZXIuZ2V0VmFsdWVMKClcbiAgICBjb25zdCBtYXhkaWZmID0gdGhpcy5kaWZmaWN1bHR5U2xpZGVyLmdldFZhbHVlUigpXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG4gICAgICAvLyBNYWtlIHF1ZXN0aW9uIGNvbnRhaW5lciBET00gZWxlbWVudFxuICAgICAgY29uc3QgY29udGFpbmVyID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWNvbnRhaW5lcicsIHRoaXMuZGlzcGxheUJveClcbiAgICAgIGNvbnRhaW5lci5kYXRhc2V0LnF1ZXN0aW9uX2luZGV4ID0gaSAvLyBub3Qgc3VyZSB0aGlzIGlzIGFjdHVhbGx5IG5lZWRlZFxuXG4gICAgICAvLyBBZGQgY29udGFpbmVyIGxpbmsgdG8gb2JqZWN0IGluIHF1ZXN0aW9ucyBsaXN0XG4gICAgICBpZiAoIXRoaXMucXVlc3Rpb25zW2ldKSB0aGlzLnF1ZXN0aW9uc1tpXSA9IHt9XG4gICAgICB0aGlzLnF1ZXN0aW9uc1tpXS5jb250YWluZXIgPSBjb250YWluZXJcblxuICAgICAgLy8gY2hvb3NlIGEgZGlmZmljdWx0eSBhbmQgZ2VuZXJhdGVcbiAgICAgIGNvbnN0IGRpZmZpY3VsdHkgPSBtaW5kaWZmICsgTWF0aC5mbG9vcihpICogKG1heGRpZmYgLSBtaW5kaWZmICsgMSkgLyB0aGlzLm4pXG5cbiAgICAgIC8vIGNob29zZSBhIHRvcGljIGlkXG4gICAgICB0aGlzLmdlbmVyYXRlKGksIGRpZmZpY3VsdHkpXG4gICAgfVxuICB9XG5cbiAgZ2VuZXJhdGUgKGksIGRpZmZpY3VsdHksIHRvcGljSWQpIHtcbiAgICAvLyBUT0RPIGdldCBvcHRpb25zIHByb3Blcmx5XG4gICAgdG9waWNJZCA9IHRvcGljSWQgfHwgcmFuZEVsZW0odGhpcy50b3BpY3MpXG5cbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgbGFiZWw6ICcnLFxuICAgICAgZGlmZmljdWx0eTogZGlmZmljdWx0eSxcbiAgICAgIHVzZUNvbW1hbmRXb3JkOiBmYWxzZVxuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnNTZXRzW3RvcGljSWRdKSB7XG4gICAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHRoaXMub3B0aW9uc1NldHNbdG9waWNJZF0ub3B0aW9ucylcbiAgICB9XG5cbiAgICAvLyBjaG9vc2UgYSBxdWVzdGlvblxuICAgIGNvbnN0IHF1ZXN0aW9uID0gVG9waWNDaG9vc2VyLm5ld1F1ZXN0aW9uKHRvcGljSWQsIG9wdGlvbnMpXG5cbiAgICAvLyBzZXQgc29tZSBtb3JlIGRhdGEgaW4gdGhlIHF1ZXN0aW9uc1tdIGxpc3RcbiAgICBpZiAoIXRoaXMucXVlc3Rpb25zW2ldKSB0aHJvdyBuZXcgRXJyb3IoJ3F1ZXN0aW9uIG5vdCBtYWRlJylcbiAgICB0aGlzLnF1ZXN0aW9uc1tpXS5xdWVzdGlvbiA9IHF1ZXN0aW9uXG4gICAgdGhpcy5xdWVzdGlvbnNbaV0udG9waWNJZCA9IHRvcGljSWRcblxuICAgIC8vIFJlbmRlciBpbnRvIHRoZSBjb250YWluZXJcbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLnF1ZXN0aW9uc1tpXS5jb250YWluZXJcbiAgICBjb250YWluZXIuaW5uZXJIVE1MID0gJycgLy8gY2xlYXIgaW4gY2FzZSBvZiByZWZyZXNoXG5cbiAgICAvLyBtYWtlIGFuZCByZW5kZXIgcXVlc3Rpb24gbnVtYmVyIGFuZCBjb21tYW5kIHdvcmQgKGlmIG5lZWRlZClcbiAgICBsZXQgcU51bWJlclRleHQgPSBxdWVzdGlvbkxldHRlcihpKSArICcpJ1xuICAgIGlmIChTSE9XX0RJRkZJQ1VMVFkpIHtxTnVtYmVyVGV4dCArPSBvcHRpb25zLmRpZmZpY3VsdHl9XG4gICAgaWYgKCF0aGlzLnVzZUNvbW1hbmRXb3JkKSB7XG4gICAgICBxTnVtYmVyVGV4dCArPSAnICcgKyBUb3BpY0Nob29zZXIuZ2V0Q29tbWFuZFdvcmQodG9waWNJZClcbiAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdpbmRpdmlkdWFsLWNvbW1hbmQtd29yZCcpXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QucmVtb3ZlKCdpbmRpdmlkdWFsLWNvbW1hbmQtd29yZCcpXG4gICAgfVxuXG4gICAgY29uc3QgcXVlc3Rpb25OdW1iZXJEaXYgPSBjcmVhdGVFbGVtKCdkaXYnLCAncXVlc3Rpb24tbnVtYmVyIGthdGV4JywgY29udGFpbmVyKVxuICAgIHF1ZXN0aW9uTnVtYmVyRGl2LmlubmVySFRNTCA9IHFOdW1iZXJUZXh0XG5cbiAgICAvLyByZW5kZXIgdGhlIHF1ZXN0aW9uXG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHF1ZXN0aW9uLmdldERPTSgpKSAvLyB0aGlzIGlzIGEgLnF1ZXN0aW9uLWRpdiBlbGVtZW50XG4gICAgcXVlc3Rpb24ucmVuZGVyKCkgLy8gc29tZSBxdWVzdGlvbnMgbmVlZCByZW5kZXJpbmcgYWZ0ZXIgYXR0YWNoaW5nIHRvIERPTVxuXG4gICAgLy8gbWFrZSBoaWRkZW4gYWN0aW9ucyBtZW51XG4gICAgY29uc3QgYWN0aW9ucyA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1hY3Rpb25zIGhpZGRlbicsIGNvbnRhaW5lcilcbiAgICBjb25zdCByZWZyZXNoSWNvbiA9IGNyZWF0ZUVsZW0oJ2RpdicsICdxdWVzdGlvbi1yZWZyZXNoIGljb24tYnV0dG9uJywgYWN0aW9ucylcbiAgICBjb25zdCBhbnN3ZXJJY29uID0gY3JlYXRlRWxlbSgnZGl2JywgJ3F1ZXN0aW9uLWFuc3dlciBpY29uLWJ1dHRvbicsIGFjdGlvbnMpXG5cbiAgICBhbnN3ZXJJY29uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgcXVlc3Rpb24udG9nZ2xlQW5zd2VyKClcbiAgICAgIGhpZGVBbGxBY3Rpb25zKClcbiAgICB9KVxuXG4gICAgcmVmcmVzaEljb24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLmdlbmVyYXRlKGksIGRpZmZpY3VsdHkpXG4gICAgICBoaWRlQWxsQWN0aW9ucygpXG4gICAgfSlcblxuICAgIC8vIFE6IGlzIHRoaXMgYmVzdCB3YXkgLSBvciBhbiBldmVudCBsaXN0ZW5lciBvbiB0aGUgd2hvbGUgZGlzcGxheUJveD9cbiAgICBjb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBlID0+IHtcbiAgICAgIGlmICghaGFzQW5jZXN0b3JDbGFzcyhlLnRhcmdldCwgJ3F1ZXN0aW9uLWFjdGlvbnMnKSkge1xuICAgICAgICAvLyBvbmx5IGRvIHRoaXMgaWYgaXQgZGlkbid0IG9yaWdpbmF0ZSBpbiBhY3Rpb24gYnV0dG9uXG4gICAgICAgIHRoaXMuc2hvd1F1ZXN0aW9uQWN0aW9ucyhlLCBpKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICB0b2dnbGVBbnN3ZXJzICgpIHtcbiAgICBpZiAodGhpcy5hbnN3ZXJlZCkge1xuICAgICAgdGhpcy5xdWVzdGlvbnMuZm9yRWFjaChxID0+IHtcbiAgICAgICAgcS5xdWVzdGlvbi5oaWRlQW5zd2VyKClcbiAgICAgICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlXG4gICAgICAgIHRoaXMuYW5zd2VyQnV0dG9uLmlubmVySFRNTCA9ICdTaG93IGFuc3dlcnMnXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnF1ZXN0aW9ucy5mb3JFYWNoKHEgPT4ge1xuICAgICAgICBxLnF1ZXN0aW9uLnNob3dBbnN3ZXIoKVxuICAgICAgICB0aGlzLmFuc3dlcmVkID0gdHJ1ZVxuICAgICAgICB0aGlzLmFuc3dlckJ1dHRvbi5pbm5lckhUTUwgPSAnSGlkZSBhbnN3ZXJzJ1xuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICBzaG93UXVlc3Rpb25BY3Rpb25zIChldmVudCwgcXVlc3Rpb25JbmRleCkge1xuICAgIC8vIGZpcnN0IGhpZGUgYW55IG90aGVyIGFjdGlvbnNcbiAgICBoaWRlQWxsQWN0aW9ucygpXG5cbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLnF1ZXN0aW9uc1txdWVzdGlvbkluZGV4XS5jb250YWluZXJcbiAgICBjb25zdCBhY3Rpb25zID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy5xdWVzdGlvbi1hY3Rpb25zJylcblxuICAgIC8vIFVuaGlkZSB0aGUgb3ZlcmxheVxuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5vdmVybGF5JykuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJylcbiAgICBhY3Rpb25zLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpXG4gICAgYWN0aW9ucy5zdHlsZS5sZWZ0ID0gKGNvbnRhaW5lci5vZmZzZXRXaWR0aCAvIDIgLSBhY3Rpb25zLm9mZnNldFdpZHRoIC8gMikgKyAncHgnXG4gICAgYWN0aW9ucy5zdHlsZS50b3AgPSAoY29udGFpbmVyLm9mZnNldEhlaWdodCAvIDIgLSBhY3Rpb25zLm9mZnNldEhlaWdodCAvIDIpICsgJ3B4J1xuICB9XG5cbiAgYXBwZW5kVG8gKGVsZW0pIHtcbiAgICBlbGVtLmFwcGVuZENoaWxkKHRoaXMub3V0ZXJCb3gpXG4gICAgdGhpcy5faW5pdFNsaWRlcigpIC8vIGhhcyB0byBiZSBpbiBkb2N1bWVudCdzIERPTSB0byB3b3JrIHByb3Blcmx5XG4gIH1cblxuICBhcHBlbmRCZWZvcmUgKHBhcmVudCwgZWxlbSkge1xuICAgIHBhcmVudC5pbnNlcnRCZWZvcmUodGhpcy5vdXRlckJveCwgZWxlbSlcbiAgICB0aGlzLl9pbml0U2xpZGVyKCkgLy8gaGFzIHRvIGJlIGluIGRvY3VtZW50J3MgRE9NIHRvIHdvcmsgcHJvcGVybHlcbiAgfVxufVxuXG5mdW5jdGlvbiBxdWVzdGlvbkxldHRlciAoaSkge1xuICAvLyByZXR1cm4gYSBxdWVzdGlvbiBudW1iZXIuIGUuZy4gcU51bWJlcigwKT1cImFcIi5cbiAgLy8gQWZ0ZXIgbGV0dGVycywgd2UgZ2V0IG9uIHRvIGdyZWVrXG4gIHZhciBsZXR0ZXIgPVxuICAgICAgICBpIDwgMjYgPyBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4NjEgKyBpKVxuICAgICAgICAgIDogaSA8IDUyID8gU3RyaW5nLmZyb21DaGFyQ29kZSgweDQxICsgaSAtIDI2KVxuICAgICAgICAgICAgOiBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4M0IxICsgaSAtIDUyKVxuICByZXR1cm4gbGV0dGVyXG59XG5cbmZ1bmN0aW9uIGhpZGVBbGxBY3Rpb25zIChlKSB7XG4gIC8vIGhpZGUgYWxsIHF1ZXN0aW9uIGFjdGlvbnNcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnF1ZXN0aW9uLWFjdGlvbnMnKS5mb3JFYWNoKGVsID0+IHtcbiAgICBlbC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuICB9KVxuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcub3ZlcmxheScpLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpXG59XG4iLCJpbXBvcnQgUXVlc3Rpb25TZXQgZnJvbSAnUXVlc3Rpb25TZXQnXG5cbi8vIFRPRE86XG4vLyAgLSBRdWVzdGlvblNldCAtIHJlZmFjdG9yIGludG8gbW9yZSBjbGFzc2VzPyBFLmcuIG9wdGlvbnMgd2luZG93XG4vLyAgLSBJbXBvcnQgZXhpc3RpbmcgcXVlc3Rpb24gdHlwZXMgKEcgLSBncmFwaGljLCBUIC0gdGV4dFxuLy8gICAgLSBHIGFuZ2xlc1xuLy8gICAgLSBHIGFyZWFcbi8vICAgIC0gVCBlcXVhdGlvbiBvZiBhIGxpbmVcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsICgpID0+IHtcbiAgY29uc3QgcXMgPSBuZXcgUXVlc3Rpb25TZXQoKVxuICBxcy5hcHBlbmRUbyhkb2N1bWVudC5ib2R5KVxufSlcbiJdLCJuYW1lcyI6WyJjb21tb25qc0hlbHBlcnMuY3JlYXRlQ29tbW9uanNNb2R1bGUiLCJjb21tb25qc0hlbHBlcnMuZ2V0RGVmYXVsdEV4cG9ydEZyb21DanMiLCJSU2xpZGVyIiwiVG9waWNDaG9vc2VyLmdldFRvcGljcyIsIlRvcGljQ2hvb3Nlci5oYXNPcHRpb25zIiwiVG9waWNDaG9vc2VyLm5ld09wdGlvbnNTZXQiLCJUb3BpY0Nob29zZXIuZ2V0VGl0bGUiLCJUb3BpY0Nob29zZXIuZ2V0Q2xhc3MiLCJUb3BpY0Nob29zZXIubmV3UXVlc3Rpb24iLCJUb3BpY0Nob29zZXIuZ2V0Q29tbWFuZFdvcmQiXSwibWFwcGluZ3MiOiI7OztFQUFBO0VBQ0E7RUFDQTtBQUNBO0VBQ0EsSUFBSSxFQUFFLEdBQUcsVUFBVSxJQUFJLEVBQUU7RUFDekIsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUk7RUFDbkIsRUFBRSxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUk7RUFDMUIsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUk7RUFDcEIsRUFBRSxJQUFJLENBQUMsV0FBVyxHQUFHLEVBQUM7RUFDdEIsRUFBRSxJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUM7RUFDckIsRUFBRSxJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUM7RUFDdkIsRUFBRSxJQUFJLENB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QUMsR0FBRyxFQUFDO0VBQ2xELElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxhQUFhLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFDO0VBQ2xELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQztFQUN4QyxHQUFHO0VBQ0gsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFDO0VBQ3hDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBQztFQUNyQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUM7QUFDeEM7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7RUFDdkIsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEVBQUM7RUFDNUUsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUM7RUFDL0QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFDO0VBQzFDLEdBQUc7QUFDSDtFQUNBLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUM7QUFDekU7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxD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RyxFQUFFO0VBQy9DLEVBQUUsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxHQUFHLE1BQUs7QUFDdkQ7RUFDQSxFQUFFLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBQyxFQUFFO0FBQ3JIO0VBQ0EsRUFBRSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFDLEVBQUU7QUFDcEc7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUcsRUFBRTtBQUNyRztFQUNBLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSTtBQUN0RztFQUNBLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRTtFQUN2QixJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7RUFDM0IsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBQztFQUMvRCxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFDO0VBQzdELEtBQUs7RUFDTCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFDO0VBQ3BHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUk7RUFDN0YsR0FBRyxNQUFNO0VBQ1QsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUMsRUFBRTtFQUN0RixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFDO0VBQ3hELEdBQUc7QUFDSDtFQUNBLEVBQUUsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxFQUFDO0VBQ2xHLEVBQUUsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsRUFBQztBQUNsRDtFQUNBLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxLQUFJO0VBQ3RGLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSTtBQUNqRTtFQUNBLEVBQUUsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFO0VBQ3hCLEVBQUM7QUFDRDtFQUNBLEVBQUUsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLFVBQVUsQ0FBQyxFQUFFO0VBQ3pDLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNO0FBQ2hDO0VBQ0EsRUFBRSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUM7QUFDakU7RUFDQSxFQUFFLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxFQUFDO0VBQzFFLEVBQUUsSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxFQUFDO0FBQ3RCO0VBQ0EsRUFBRSxJQUFJ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QUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQzdCLE1BQU07RUFDTixNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQztFQUN6QyxLQUFLO0FBQ0w7RUFDQTtFQUNBLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDMUIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ1osS0FBSztBQUNMO0VBQ0EsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDM0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7QUFDM0M7RUFDQTtFQUNBLElBQUksTUFBTSxRQUFRLEdBQUcsQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVB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O0VBQ0EsRUFBRSxPQUFPLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUU7RUFDakMsSUFBSSxLQUFLLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBRztFQUNqQyxJQUFJLE9BQU8sS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDO0VBQ3BDLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxJQUFJLENBQUMsQ0FBQyxHQUFHLE1BQU0sRUFBRTtFQUMxQixJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUM7RUFDN0QsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQzdELElBQUksTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLE9BQU07QUFDM0I7RUFDQSxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDO0VBQ3hDLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUM1QjtFQUNBLElBQUksTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ2xDLElBQUksTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ2xDLElBQUksTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0FBQ2xDO0VBQ0EsSUFBSSxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDL0IsSUFBSSxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDNUMsSUFBSSxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7QUFDNUM7RUFDQSxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxHQUFHLFNBQVMsRUFBRSxJQUFJLEdBQUcsU0FBUyxDQUFDO0VBQ3hELEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUU7RUFDdEIsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFDO0VBQ3BFLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBQztFQUNwRSxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQztFQUNoQyxHQUFHO0FBQ0g7RUFDQSxFQUFFLE9BQU8sR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFO0VBQ3RCLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDO0VBQ3JFLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDO0VBQ3JFLElBQUksT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO0VBQ2hDLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUU7RUFDekIsSUFBSSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFDO0VBQ3BFLElBQUksTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBQztFQUNwRSxJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQztFQUNyRSxJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQztFQUNyRSxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDO0VBQzFELEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxVQUFVLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQzdCO0VBQ0E7RUFDQSxJQUFJLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUM7RUFDNUIsSUFBSSxNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFDO0VBQzVCLElBQUksTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFDO0VBQ3pDLElBQUksT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLEdBQUcsTUFBTSxFQUFFO0VBQ2pELEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQzNCLElBQUksT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDL0MsR0FBRztBQUNIO0VBQ0EsRUFBRSxPQUFPLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRTtFQUMzQztFQUNBO0VBQ0EsSUFBSSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUM7RUFDbEQsSUFBSSxJQUFJLENBQUMsSUFBSSxPQUFPLEVBQUUsT0FBTyxLQUFLO0FBQ2xDO0VBQ0EsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxDQUFDLElBQUksRUFBQztFQUNoQyxJQUFJLEVBQUUsQ0FB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LFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDMUQsU0FBUztBQUNUO0VBQ0EsUUFBUSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUNuQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDdkMsVUFBVSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQztFQUN4QixTQUFTO0FBQ1Q7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0FBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsUUFBUSxPQUFPLElBQUksUUFBUTtFQUMzQixVQUFVLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ2xELFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztFQUN0QixTQUFTO0VBQ1QsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUMzQixRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0FBQ25CO0VBQ0E7QUFDQTtFQUNBLFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUM5RSxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxHQUFHLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzNCLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUM7QUFDbkI7RUFDQTtBQUNBO0VBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFO0VBQ3ZDLFVBQVUsT0FBTyxJQUFJLFFBQVEsRUFBRTtFQUMvQixTQUFTO0VBQ1QsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzlFLE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLElBQUksRUFBRSxVQUFVLE1BQU0sRUFBRTtFQUM5QixRQUFRLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxNQUFNLElBQUksQ0FBQyxFQUFDO0FBQzFDO0VBQ0EsUUFBUSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUM1QyxVQUFVLE9BQU8sSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDO0VBQ2xDLFNBQVM7RUFDVCxRQUFRLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDakYsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sS0FBSyxFQUFFLFVBQVUsTUFBTSxFQUFFO0VBQy9CLFFBQVEsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sSUFBSSxDQUFDLEVBQUM7QUFDMUM7RUFDQSxRQUFRLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzVDLFVBQVUsT0FBTyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUM7RUFDbEMsU0FBUztFQUNULFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztFQUNsRixPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxLQUFLLEVBQUUsVUFBVSxNQUFNLEVBQUU7RUFDL0IsUUFBUSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxJQUFJLENBQUMsRUFBQztBQUMxQztFQUNBLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDNUMsVUFBVSxPQUFPLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQztFQUNsQyxTQUFTO0VBQ1QsUUFBUSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0VBQ2xGLE9BQU87QUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLE9BQU8sRUFBRSxZQUFZO0VBQzNCLFFBQVEsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUNwRCxPQUFPO0FBQ1A7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxHQUFHLEVBQUUsVUFBVSxDQUFDLEVBQUU7RUFDeEIsUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7RUFDbkIsVUFBVSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDbEYsU0FBUyxNQUFNO0VBQ2YsVUFBVSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNoRixTQUFTO0VBQ1QsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sTUFBTSxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUM5QixRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ25CLFFBQVEsT0FBTyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7RUFDM0QsT0FBTztBQUNQO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE1BQU0sT0FBTyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUMvQixRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ25CLFFBQVEsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUM7RUFDNUQsUUFBUSxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQ2hDLE9BQU87QUFDUDtFQUNBLE1BQU0sUUFBUSxFQUFFLFVBQVUsR0FBRyxFQUFFO0VBQy9CO0FBQ0E7RUFDQSxRQUFRLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzVDLFVBQVUsT0FBTyxJQUFJO0VBQ3JCLFNBQVM7QUFDVDtFQUNBLFFBQVEsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLFdBQVcsR0FBRTtBQUMzQztFQUNBLFFBQVEsR0FBRyxHQUFHLEdBQUcsSUFBSSxNQUFLO0FBQzFCO0VBQ0EsUUFBUSxTQUFTLEdBQUcsRUFBRSxDQUFDLEVBQUU7RUFDekIsVUFBVSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLEVBQUUsT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUMzRCxVQUFVLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3BELFNBQVM7QUFDVDtFQUNBLFFBQVEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDOUMsVUFBVSxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVB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QyxHQUFHO0VBQ1gsSUFBSSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFDO0VBQ2hELElBQUksT0FBTyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUM7RUFDaEMsR0FBRztBQUNIO0VBQ0EsRUFBRSxRQUFRLENBQUMsR0FBRztFQUNkO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsSUFBSSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRTtFQUNwQyxJQUFJLElBQUksUUFBUSxHQUFHLEdBQUU7RUFDckIsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUMzQyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUTtFQUM3QixNQUFNLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUM7RUFDNUIsTUFBTSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDakQsUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVE7RUFDL0IsUUFBUSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDckMsVUFBVSxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDekMsVUFBVSxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSTtFQUN6QixTQUFTO0VBQ1QsT0FBTztFQUNQLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUM7RUFDNUIsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcs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RUFBRSxhQUFhO0VBQ3pCO0VBQ0EsTUFBSztBQUNMO0VBQ0EsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBQztFQUN2RSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVTtFQUNyRCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBQztBQUM3RDtFQUNBLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUM7RUFDNUIsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUU7RUFDdEIsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUU7QUFDbkI7RUFDQSxJQUFJLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO0VBQzVDLE1BQU0sSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFHO0VBQ3ZCLE1BQU0sSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDbEMsS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFO0VBQ3hELE1BQU0sSUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFRO0VBQzVCLE1BQU0sSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDbEMsS0FBSztBQUNMO0VBQ0E7RUFDQSxJQUFJLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJO0VBQzlCLE1BQU0sS0FBSyxhQUFhLENBQUM7RUFDekIsTUFBTSxLQUFLLGtCQUFrQjtFQUM3QixRQUFRLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBQztFQUN2QyxRQUFRLEtBQUs7RUFDYixNQUFNLEtBQUssY0FBYztFQUN6QixRQUFRLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBQztFQUMzQyxRQUFRLEtBQUs7RUFDYixNQUFNLEtBQUssbUJBQW1CO0VBQzlCLFFBQVEsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUM7RUFDaEQsUUFBUSxLQUFLO0VBQ2IsTUFBTSxLQUFLLGFBQWE7RUFDeEIsUUFBUSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUM7RUFDMUMsUUFBUSxLQUFLO0VBQ2IsTUFBTSxLQUFLLGtCQUFrQjtFQUM3QixRQUFRLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFDO0VBQy9DLFFBQVEsS0FBSztFQUNiLE1BQU07RUFDTixRQUFRLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLENBQUM7RUFDcEQsS0FBSztBQUNMO0VBQ0EsSUFBSSxJQUFJLENBQUMsY0FBYyxHQUFFO0VBQ3pCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBQztFQUMzQyxHQUFHO0FBQ0g7RUFDQTtBQUNBO0VBQ0EsRUFBRSxXQUFXLENBQUMsQ0FBQyxRQUFRLEVBQUU7RUFDekIsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUNyQyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUc7RUFDekIsUUFBUSxHQUFHLEVBQUUsSUFBSSxRQUFRLENBQUMsaUJBQWlCO0VBQzNDLFVBQVUsUUFBUSxDQUFDLEdBQUc7RUFDdEIsVUFBVSxRQUFRLENBQUMsR0FBRztFQUN0QixVQUFVLENBQUMsS0FBSyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0VBQ3pELFNBQVMsQ0FBQztFQUNWLFFBQVEsTUFBTSxFQUFFLEtBQUs7RUFDckIsUUFBTztFQUNQLEtBQUs7RUFDTCxHQUFHO0FBQ0g7RUFDQSxFQUFFLGVBQWUsQ0FBQyxDQUFDLFFBQVEsRUFBRTtFQUM3QjtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtBQUNBO0VBQ0E7RUFDQSxJQUFJLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxTQUFRO0VBQ2xDLElBQUksSUFBSSxJQUFJLEdBQUcsQ0FBQyxFQUFFO0VBQ2xCLE1BQU0sTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBQztFQUNqRCxNQUFNLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3ZDLFFBQVEsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQzVDLFlBQVksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxVQUFTO0VBQ2xELFFBQVEsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztFQUN2RCxZQUFZLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLFVBQVM7QUFDN0Q7RUFDQSxRQUFRLE1BQU0sTUFBTTtFQUNwQixVQUFVLElBQUksS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7RUFDOUIsY0FBYyxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQztFQUN4RCxnQkFBZ0IsT0FBTyxHQUFHLEdBQUcsR0FBRyxPQUFPO0VBQ3ZDLGtCQUFrQixHQUFHLEdBQUcsRUFBQztBQUN6QjtFQUNBLFFBQVEsTUFBTSxHQUFHLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDO0VBQ2xEO0VBQ0EsVUFBVSxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUM7RUFDM0IsV0FBVyxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLE9BQU8sRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLE9BQU8sS0FBSyxHQUFHLENBQUM7RUFDMUUsV0FBVyxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLE9BQU8sRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLE9BQU8sS0FBSyxHQUFHLENBQUM7RUFDMUUsU0FBUyxFQUFDO0FBQ1Y7RUFDQSxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUc7RUFDM0IsVUFBVSxHQUFHLEVBQUUsSUFBSSxRQUFRLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztFQUNyQyxVQUFVLE1BQU0sRUFBRSxLQUFLO0VBQ3ZCLFVBQVM7RUFDVCxPQUFPO0VBQ1AsS0FBSyxNQUFNO0VBQ1gsTUFBTSxNQUFNLE9BQU8sR0FBRyxRQUFRO0VBQzlCLFFBQVEsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7RUFDL0QsUUFBTztFQUNQLE1BQU0sS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDdkMsUUFBUSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDekMsWUFBWSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsVUFBUztFQUNoRCxRQUFRLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDcEQsWUFBWSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLFVBQVM7QUFDM0Q7RUFDQSxRQUFRLE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7QUFDOUM7RUFDQSxRQUFRLE1BQU0sVUFBVTtFQUN4QixVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLGFBQWEsRUFBRSxDQUFDO0VBQ3pFLFlBQVksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsR0FBRyxPQUFPO0VBQzVDLGFBQWEsQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDO0VBQzdDLFdBQVcsR0FBRyxFQUFDO0FBQ2Y7RUFDQSxRQUFRLE1BQU0sR0FBRyxHQUFHLE9BQU8sR0FBRyxXQUFVO0FBQ3hDO0VBQ0EsUUFBUSxJQUFJLElBQUc7RUFDZixRQUFRLElBQUksSUFBSSxHQUFHLENBQUMsRUFBRTtFQUN0QixVQUFVLEdBQUcsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDO0VBQy9DLFlBQVksR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDO0VBQzdCLGFBQWEsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDekQsYUFBYSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUN6RCxXQUFXLEVBQUM7RUFDWixTQUFTLE1BQU0sSUFBSSxJQUFJLEdBQUcsQ0FBQyxFQUFFO0VBQzdCLFVBQVUsR0FBRyxHQUFHLGlCQUFpQixDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUM7RUFDM0UsU0FBUyxNQUFNO0VBQ2YsVUFBVSxHQUFHLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxHQUFHLEVBQUUsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBQztFQUM5RSxTQUFTO0FBQ1Q7RUFDQSxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUc7RUFDM0IsVUFBVSxHQUFHLEVBQUUsSUFBSSxRQUFRLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztFQUNyQyxVQUFVLE1BQU0sRUFBRSxLQUFLO0VBQ3ZCLFVBQVM7RUFDVCxPQUFPO0VBQ1AsS0FBSztFQUNMLEdBQUc7QUFDSDtFQUNBLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxRQUFRLEVBQUU7RUFDbEMsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUNyQyxNQUFNLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFDO0VBQ2xDLE1BQU0sTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ3JDLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRztFQUN6QixRQUFRLEdBQUcsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQy9CLFFBQVEsTUFBTSxFQUFFLEtBQUs7RUFDckIsUUFBTztFQUNQLEtBQUs7RUFDTCxHQUFHO0FBQ0g7RUFDQSxFQUFFLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRTtFQUM1QixJQUFJLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxTQUFRO0VBQ2xDLElBQUksUUFBUSxJQUFJO0VBQ2hCLE1BQU0sS0FBSyxDQUFDLEVBQUU7RUFDZCxRQUFRLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBQztFQUNsRSxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3pDLFVBQVUsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDckQsVUFBVSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHO0VBQzdCLFlBQVksR0FBRyxFQUFFLElBQUksVUFBVSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUM7RUFDakQsWUFBWSxNQUFNLEVBQUUsS0FBSztFQUN6QixZQUFXO0VBQ1gsU0FBUztFQUNULE9BQU87RUFDUCxRQUFRLEtBQUs7RUFDYixNQUFNLEtBQUssQ0FBQyxDQUFDO0VBQ2IsTUFBTSxTQUFTO0VBQ2YsUUFBUSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxHQUFHLEVBQUU7RUFDakMsVUFBVSxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUM7RUFDcEUsVUFBVSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUMzQyxZQUFZLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQ3ZELFlBQVksTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDMUQsWUFBWSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHO0VBQy9CLGNBQWMsR0FBRyxFQUFFLElBQUksVUFBVSxDQUFDLEtBQUssR0FBRyxRQUFRLEdBQUcsR0FBRyxHQUFHLFFBQVEsQ0FBQztFQUNwRSxjQUFjLE1BQU0sRUFBRSxLQUFLO0VBQzNCLGNBQWE7RUFDYixXQUFXO0VBQ1gsU0FBUyxNQUFNO0VBQ2YsVUFBVSxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUM7RUFDckUsVUFBVSxJQUFJLFNBQVMsR0FBRyxVQUFTO0VBQ25DLFVBQVUsT0FBTyxTQUFTLEtBQUssU0FBUyxFQUFFO0VBQzFDLFlBQVksU0FBUyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBQztFQUNqRSxXQUFXO0FBQ1g7RUFDQSxVQUFVLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQzNDLFlBQVksTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDeEQsWUFBWSxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUN4RCxZQUFZLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUc7RUFDL0IsY0FBYyxHQUFHLEVBQUUsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLFNBQVMsR0FBRyxHQUFHLEdBQUcsTUFBTSxHQUFHLFNBQVMsQ0FBQztFQUNoRixjQUFjLE1BQU0sRUFBRSxLQUFLO0VBQzNCLGNBQWE7RUFDYixXQUFXO0VBQ1gsU0FBUztFQUNULFFBQVEsS0FBSztFQUNiLE9BQU87RUFDUCxLQUFLO0VBQ0wsR0FBRztBQUNIO0VBQ0EsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLFFBQVEsRUFBRTtFQUNqQztFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxJQUFJLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxTQUFRO0VBQ2xDLElBQUksUUFBUSxJQUFJO0VBQ2hCLE1BQU0sS0FBSyxDQUFDO0VBQ1osTUFBTTtFQUNOLFFBQVEsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFDO0VBQ2xFLFFBQVEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDekMsVUFBVSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRTtFQUNyRCxVQUFVLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssR0FBRyxLQUFLLEdBQUcsU0FBUTtFQUM3RCxVQUFVLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUc7RUFDN0IsWUFBWSxHQUFHLEVBQUUsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDO0VBQ3JDLFlBQVksTUFBTSxFQUFFLEtBQUs7RUFDekIsWUFBVztFQUNYLFNBQVM7RUFDVCxRQUFRLEtBQUs7RUFDYixPQUFPO0FBQ1A7RUFDQSxNQUFNLEtBQUssQ0FBQyxFQUFFO0VBQ2QsUUFBUSxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUM7RUFDbkUsUUFBUSxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUM7RUFDbkUsUUFBUSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUN6QyxVQUFVLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQ3JELFVBQVUsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUFDO0VBQzNELFVBQVUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRztFQUM3QixZQUFZLEdBQUcsRUFBRSxJQUFJLFVBQVUsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDO0VBQ2pELFlBQVksTUFBTSxFQUFFLEtBQUs7RUFDekIsWUFBVztFQUNYLFNBQVM7RUFDVCxRQUFRLEtBQUs7RUFDYixPQUFPO0FBQ1A7RUFDQSxNQUFNLEtBQUssQ0FBQyxFQUFFO0VBQ2QsUUFBUSxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUM7RUFDM0QsUUFBUSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUN6QyxVQUFVLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxHQUFFO0VBQ3JELFVBQVUsTUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDbEQsVUFBVSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHO0VBQzdCLFlBQVksR0FBRyxFQUFFLElBQUksVUFBVSxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQztFQUN0RCxZQUFZLE1BQU0sRUFBRSxLQUFLO0VBQ3pCLFlBQVc7RUFDWCxTQUFTO0VBQ1QsUUFBUSxLQUFLO0VBQ2IsT0FBTztBQUNQO0VBQ0EsTUFBTSxLQUFLLENBQUMsRUFBRTtFQUNkLFFBQVEsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUM7RUFDL0MsUUFBUSxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBQztFQUNsRCxRQUFRLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBQztFQUN0RCxRQUFRLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBQztFQUN0RCxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3pDLFVBQVUsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDakQsVUFBVSxNQUFNLEVBQUUsR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUU7RUFDdkQsVUFBVSxNQUFNLEVBQUUsR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxD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LE1BQU0sQ0FBQyxNQUFNLEVBQUM7QUFDOUQ7RUFDQSxJQUFJLEdBQUcsQ0FBQyxTQUFTLEdBQUU7RUFDbkIsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQ2xDLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQztFQUNsQyxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUM1QyxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDcEMsTUFBTSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQzFDLEtBQUs7RUFDTCxJQUFJLEdBQUcsQ0FBQyxXQUFXLEdBQUcsT0FBTTtFQUM1QixJQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUU7RUFDaEIsSUFBSSxHQUFHLENBQUMsU0FBUyxHQUFFO0FBQ25CO0VBQ0EsSUFBSSxHQUFHLENBQUMsU0FBUyxHQUFFO0VBQ25CLElBQUksSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVE7RUFDbEMsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3RELE1BQU0sTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxD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
