import { OptionsSpec , Option as OptionI, SelectOption, SelectExclusiveOption, SelectInclusiveOption, RealOption, RangeOption} from 'OptionsSpec'
import { createElem } from 'Utilities'

type Options = (OptionsSpec[0] & {element?: HTMLElement})[] // like OptionsSpec but with optional element for each option

export default class OptionsSet {
  optionsSpec : Options
  options : Record<string, string | number | boolean | string[] | OptionsSet>
  template? : string
  globalId: string
  static idCounter: number = 0 // increment each time to create unique ids to use in ids/names of elements

  static getId(): string {
    if (OptionsSet.idCounter >= 26 ** 2) throw new Error('Too many options objects!')
    const id = String.fromCharCode(~~(OptionsSet.idCounter / 26) + 97) +
      String.fromCharCode(OptionsSet.idCounter % 26 + 97)

    OptionsSet.idCounter += 1

    return id
  }

  /**
   * Create a new options spec
   * @param optionsSpec Specification of options
   * @param template A template for displaying options, using {{mustache}} syntax
   */
  constructor (optionsSpec : OptionsSpec, template? : string) {
    this.optionsSpec = optionsSpec as Options

    this.options = {}
    this.optionsSpec.forEach(option => {
      if (isRealOption(option)) {
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
  updateStateFromUI (option : Options[0] | string) {
    // input - either an element of this.optionsSpec or an option id
    if (typeof (option) === 'string') {
      option = this.optionsSpec.find(x => ((x as OptionI).id === option))
      if (!option) throw new Error(`no option with id '${option}'`)
    }
    if (!option.element) throw new Error(`option ${(option as OptionI).id} doesn't have a UI element`)

    switch (option.type) {
      case 'int': {
        const input : HTMLInputElement = option.element.getElementsByTagName('input')[0]
        this.options[option.id] = Number(input.value)
        break
      }
      case 'bool': {
        const input : HTMLInputElement = option.element.getElementsByTagName('input')[0]
        this.options[option.id] = input.checked
        break
      }
      case 'select-exclusive': {
        this.options[option.id] = (option.element.querySelector('input:checked') as HTMLInputElement).value
        break
      }
      case 'select-inclusive': {
        this.options[option.id] =
          Array.from(option.element.querySelectorAll('input:checked'), (x : HTMLInputElement) => x.value)
        break
      }
      case 'range': {
        const inputLB : HTMLInputElement = option.element.getElementsByTagName('input')[0]
        const inputUB : HTMLInputElement = option.element.getElementsByTagName('input')[1]
        this.options[option.idLB] = inputLB.value
        this.options[option.idUB] = inputUB.value
        break
      }

      default:
        throw new Error(`option with id ${(option as OptionI).id} has unrecognised option type ${option.type}`)
    }
    console.log(this.options)
  }

  /**
   * Given a string, return the element of this.options with that id
   * @param id The id
   */

  updateStateFromUIAll () {
    this.optionsSpec.forEach(option => {
      if (isRealOption(option)) { 
        this.updateStateFromUI(option)
      }
    })
  }

  disableOrEnableAll () {
    this.optionsSpec.forEach(option => this.disableOrEnable(option))
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
      option = this.optionsSpec.find(x => (isRealOption(x) && x.id === option))
      if (!option) throw new Error(`no option with id '${option}'`)
    }

    if (!option.disabledIf) return

    // Inverse everything if begining with !
    let disablerId = option.disabledIf
    let enable = false // disable iff disabler is true
    if (disablerId.startsWith('!')) {
      enable = true // endable iff disabler is true
      disablerId = disablerId.slice(1)
    }

    // Endable or disable
    if (this.options[disablerId] === enable) { // enable
      option.element.classList.remove('disabled')
      ;[...option.element.getElementsByTagName('input')].forEach(e => { e.disabled = false })
    } else { // disable
      option.element.classList.add('disabled')
      ;[...option.element.getElementsByTagName('input')].forEach(e => { e.disabled = true })
    }
  }

  renderIn (element, ulExtraClass? : string) {
    const list = createElem('ul', 'options-list')
    if (ulExtraClass) list.classList.add(ulExtraClass)
    let column = createElem('div', 'options-column', list)

    this.optionsSpec.forEach(option => {
      if (option.type === 'column-break') { // start new column
        column = createElem('div', 'options-column', list)
      } else if (option.type === 'suboptions') {
        this.options[option.id] = new OptionsSet(option.optionsSpec)
        ;(this.options[option.id] as OptionsSet).renderIn(column,"suboptions")
      }
      else { // make list item
        const li = createElem('li', undefined, column)
        if (isRealOption(option)) {
          li.dataset.optionId = option.id
        }

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
            break
          case 'range':
            renderRangeOption(option, li)
            break
        }
        li.addEventListener('change', e => { this.updateStateFromUI(option); this.disableOrEnableAll() })
        option.element = li

      }
    })
    element.append(list)

    this.updateStateFromUIAll()
    this.disableOrEnableAll()
  }

  renderWithTemplate(element : HTMLElement) {
    // create appropriate object for mustache
    let options: Record<string,OptionI>
    this.optionsSpec.forEach( option => {
      if (isRealOption(option)) {
        options[option.id] = option
      }
    })

    let htmlString = this.template
  }

  renderListOption (option: SelectExclusiveOption | SelectInclusiveOption , li : HTMLElement) {
    li.insertAdjacentHTML('beforeend',option.title + ': ')

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

      label.insertAdjacentHTML('beforeend',selectOption.title)
    })
  }
}

/**
 * Renders a heading option
 * @param {string} title The title of the heading
 * @param {HTMLElement} li The element to render into
 */
function renderHeading (title, li) {
  li.innerHTML = title
  li.classList.add('options-heading')
}

/**
 * Renders single parameter
 * @param {*} option
 * @param {*} li
 */
function renderSingleOption (option, li) {
  const label = createElem('label', undefined, li)

  if (!option.swapLabel && option.title !== '') label.insertAdjacentHTML('beforeend',`${option.title}: `)

  const input : HTMLInputElement = createElem('input', 'option', label) as HTMLInputElement
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

  if (option.swapLabel && option.title !== '') label.insertAdjacentHTML('beforeend',` ${option.title}`)
}

function renderRangeOption(option: RangeOption, li) {
  const label = createElem('label',undefined, li)
  const inputLB = createElem('input', 'option', label) as HTMLInputElement
  inputLB.type = 'number'
  inputLB.min = option.min.toString()
  inputLB.max = option.max.toString()
  inputLB.value = option.defaultLB.toString()

  label.insertAdjacentHTML('beforeend',` &leq; ${option.title} &leq; `)

  const inputUB = createElem('input', 'option', label) as HTMLInputElement
  inputUB.type = 'number'
  inputUB.min = option.min.toString()
  inputUB.max = option.max.toString()
  inputUB.value = option.defaultUB.toString()
}

/** Determines if an option in OptionsSpec is a real option as opposed to
 * a heading or column break
 */
function isRealOption(option : OptionsSpec[0]) : option is RealOption{
  return (option as OptionI).id !== undefined
}

const demoSpec : OptionsSpec = [
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
  },
  {
    title: 'Options for rectangles',
    id: 'rectangle-options',
    type: 'suboptions',
    optionsSpec: [
      {
        title: 'Minimum x',
        id: 'minX',
        type: 'int',
        min: 0,
        max: 10,
        default: 2
      },
      {
        title: 'Maximum x',
        id: 'maxX',
        type: 'int',
        min: 0,
        max: 10,
        default: 4
      }
    ]
  }
]

const demoTemplate : string =
"<li>{{difficulty.rendered}}</li>\n" +      // Inserts full 'diffiulty' option as before
"<li><b>{{type.title}}</b> \n" +            // just the title
"<li>{{type.input}} \n" +                   // the input element
"{{type.selectOptionsRenderedAll}}</li>" +  // The options, redered usually
"<li><ul>{{# type.selectOptions}}" +       // Individual select options, rendered
  "<li> {{rendered}} </li>" +               // The usual rendered option
"{{/ type.selectOptions}}</ul>"

const exampleTemplate : string =  // Another example, with fewer comments
`<div class = "options-column">
  <ul class="options-list">
    <li> <b>Some options </b> </li>
    <li> {{difficulty.rendered}} </li>
    <li style="display:block"> {{simple.title}} {{simple.input}}
      {{#simpleMinX}}
` 