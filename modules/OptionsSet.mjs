// import {createElem} from 'Utilities'
import { createElem } from './Utilities.js'

export default class OptionsSet {
  constructor (optionSpec, template) {
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

  updateStateFromUI (option) {
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

  renderIn (element) {
    const list = document.createElement('ul')
    list.classList.add('options-list')

    this.optionSpec.forEach(option => {
      // Make list item - common to all types
      const li = document.createElement('li')
      li.dataset.optionId = option.id
      list.append(li)

      // make input elements - depends on option type
      if (option.type === 'column-break') {
        li.classList.add('column-break')
      } else if (option.type === 'heading') {
        li.append(option.title)
        li.classList.add('options-heading')
      } else if (option.type === 'int' || option.type === 'bool') {
        // single input options
        const label = document.createElement('label')
        li.append(label)

        if (!option.swapLabel) label.append(option.title + ': ')

        const input = document.createElement('input')
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
        input.classList.add('option')
        label.append(input)

        if (option.swapLabel) label.append(' ' + option.title)
      } else if (option.type === 'select-inclusive' || option.type === 'select-exclusive') {
        // multiple input options
        // TODO: swap label (a bit odd here though)
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
      } else {
        throw new Error(`unknown option type '${option.type}'`)
      }

      li.addEventListener('change', e => this.updateStateFromUI(option))
      option.element = li
    })

    element.append(list)
  }

  // TODO: updateUIFromState(option) {}
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
