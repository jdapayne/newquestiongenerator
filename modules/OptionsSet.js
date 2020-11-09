import { createElem } from 'Utilities'

export default class OptionsSet {
  constructor(optionSpec, template) {
    this.optionSpec = optionSpec

    this.options = {}
    this.optionSpec.forEach(option => {
      if (option.type !== 'heading' && option.type !== 'column-break') {
        this.options[option.id] = option.default
      }
    })

    this.template = template // html template (optional)

    // set an id based on a counter - used for names of form elements
    this.globalId = OptionsSet.getId()
  }

  /**
   * Given an option, find its UI element and update the state from that
   * @param {*} option An element of this.optionSpec or an id
   */
  updateStateFromUI(option) {
    // input - either an element of this.optionsSpec or an option id
    if (typeof (option) === 'string') {
      option = this.optionsSpec.find(x => x.id === option)
      if (!option) throw new Error(`no option with id '${option}'`)
    }
    if (!option.element) throw new Error(`option ${option.id} doesn't have a UI element`)

    switch (option.type) {
      case 'int': {
        const input = option.element.getElementsByTagName('input')[0]
        this.options[option.id] = Number(input.value)
        break
      }
      case 'bool': {
        const input = option.element.getElementsByTagName('input')[0]
        this.options[option.id] = input.checked
        break
      }
      case 'select-exclusive': {
        this.options[option.id] = option.element.querySelector('input:checked').value
        break
      }
      case 'select-inclusive': {
        this.options[option.id] =
          Array.from(option.element.querySelectorAll('input:checked'), x => x.value)
        break
      }
      default:
        throw new Error(`option with id ${option.id} has unrecognised option type ${option.type}`)
    }
    // console.log(this.options)
  }

  updateStateFromUIAll() {
    this.optionSpec.forEach( options => this.updateStateFromUI(option))
  }

  disableOrEnableAll() {
    this.optionSpec.forEach( option => this.disableOrEnable(option))
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
      option = this.optionsSpec.find(x => x.id === option)
      if (!option) throw new Error(`no option with id '${option}'`)
    }

    if (!option.disabledIf) return

    //Inverse everything if begining with !
    let disablerId = option.disabledIf
    let enable = false // disable iff disabler is true
    if (disablerId.startsWith('!')) {
      enable = true // endable iff disabler is true
      disablerId = disablerId.slice(1)
    }

    //Endable or disable
    if (this.options[disablerId] === enable) { //enable
      option.element.classList.remove('disabled')
      ;[...option.element.getElementsByTagName('input')].forEach( e=> e.disabled=false)
    } else { //disable
      option.element.classList.add('disabled')
      ;[...option.element.getElementsByTagName('input')].forEach( e=> e.disabled=true)
    }
  }

  renderIn(element) {
    const list = createElem('ul', 'options-list')
    let column = createElem('div', 'options-column', list)

    this.optionSpec.forEach(option => {
      if (option.type === 'column-break') { // start new column
        column = createElem('div', 'options-column', list)
      } else { // make list item
        const li = createElem('li', undefined, column)
        li.dataset.optionId = option.id

        switch (option.type) {
          case 'heading':
            renderHeading(option.title, li)
            break
          case 'int':
          case 'bool':
            renderSingleOption(option, li)
            break
          case 'select-inclusive':
          case 'select-exclusive':
            this.renderListOption(option, li)
        }
        li.addEventListener('change', e => {this.updateStateFromUI(option); this.disableOrEnableAll()})
        option.element = li

        if (option.style === 'emph') {li.classList.add('emphasise')}
      }
    })
    element.append(list)

    this.disableOrEnableAll()
  }

  renderListOption(option, li) {
    li.append(option.title + ': ')

    const sublist = createElem('ul', 'options-sublist', li)
    if (option.vertical) sublist.classList.add('options-sublist-vertical')

    option.selectOptions.forEach(selectOption => {
      const sublistLi = createElem('li', null, sublist)
      const label = createElem('label', null, sublistLi)

      const input = document.createElement('input')
      input.type = option.type === 'select-exclusive' ? 'radio' : 'checkbox'
      input.name = this.globalId + '-' + option.id
      input.value = selectOption.id

      if (option.type === 'select-inclusive') { // defaults work different for inclusive/exclusive
        input.checked = option.default.includes(selectOption.id)
      } else {
        input.checked = option.default === selectOption.id
      }

      label.append(input)

      input.classList.add('option')

      label.append(selectOption.title)
    })
  }
}

/**
 * Renders a heading option
 * @param {string} title The title of the heading
 * @param {HTMLElement} li The element to render into
 */
function renderHeading(title, li) {
  li.append(title)
  li.classList.add('options-heading')
}

/**
 * Renders single parameter
 * @param {*} option 
 * @param {*} li 
 */
function renderSingleOption(option, li) {
  const label = createElem('label', undefined, li)

  if (!option.swapLabel && option.title !== '') label.append(option.title + ': ')

  const input = createElem('input', 'option', label)
  switch (option.type) {
    case 'int':
      input.type = 'number'
      input.min = option.min
      input.max = option.max
      input.value = option.default
      break
    case 'bool':
      input.type = 'checkbox'
      input.checked = option.default
      break
    default:
      throw new Error(`unknown option type ${option.type}`)
  }

  if (option.swapLabel && option.title !== '') label.append(' ' + option.title)
}


OptionsSet.idCounter = 0 // increment each time to create unique ids to use in ids/names of elements

OptionsSet.getId = function () {
  if (OptionsSet.idCounter >= 26 ** 2) throw new Error('Too many options objects!')
  const id = String.fromCharCode(~~(OptionsSet.idCounter / 26) + 97) +
    String.fromCharCode(OptionsSet.idCounter % 26 + 97)

  OptionsSet.idCounter += 1

  return id
}

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
]
