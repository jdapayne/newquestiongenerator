/* global katex */
import Question from 'Question'
import { createElem } from 'Utilities'
import Point from 'Point'

export class GraphicQ extends Question {
  constructor (options) {
    super() // this.answered = false
    delete (this.DOM) // going to override getDOM using the view's DOM

    const defaults = {
      difficulty: 5
    }
    this.settings = Object.assign({}, defaults, options) // this could be overridden

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

  getDOM () { return this.view.getDOM() }

  render () { this.view.render() }

  showAnswer () {
    super.showAnswer()
    this.view.showAnswer()
  }

  hideAnswer () {
    super.hideAnswer()
    this.view.hideAnswer()
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

export class GraphicQView {
  constructor (data, options) {
    const defaults = {
      width: 250,
      height: 250
    }

    options = Object.assign({}, defaults, options)

    this.width = options.width
    this.height = options.height // only things I need from the options, generally?
    this.data = data
    // this.rotation?

    this.labels = [] // labels on diagram

    // DOM elements
    this.DOM = createElem('div', 'question-div')
    this.canvas = createElem('canvas', 'question-canvas', this.DOM)
    this.canvas.width = this.width
    this.canvas.height = this.height
  }

  getDOM () {
    return this.DOM
  }

  render () {
    this.renderLabels() // will be overwritten
  }

  renderLabels (nudge) {
    const container = this.DOM

    // remove any existing labels
    const oldLabels = container.getElementsByClassName('label')
    while (oldLabels.length > 0) {
      oldLabels[0].remove()
    }

    this.labels.forEach(l => {
      const label = document.createElement('div')
      const innerlabel = document.createElement('div')
      label.classList.add('label')
      label.classList += ' ' + l.style
      label.style.left = l.pos.x + 'px'
      label.style.top = l.pos.y + 'px'

      katex.render(l.text, innerlabel)
      label.appendChild(innerlabel)
      container.appendChild(label)

      // remove space if the inner label is too big
      if (innerlabel.offsetWidth / innerlabel.offsetHeight > 2) {
        console.log(`removed space in ${l.text}`)
        const newlabeltext = l.text.replace(/\+/, '\\!+\\!').replace(/-/, '\\!-\\!')
        katex.render(newlabeltext, innerlabel)
      }

      // position correctly - this could def be optimised - lots of back-and-forth

      // adjust to *center* label, rather than anchor top-right
      const lwidth = label.offsetWidth
      const lheight = label.offsetHeight
      label.style.left = (l.pos.x - lwidth / 2) + 'px'
      label.style.top = (l.pos.y - lheight / 2) + 'px'

      // I don't understand this adjustment. I think it might be needed in arithmagons, but it makes
      // others go funny.

      if (nudge) {
        if (l.pos.x < this.canvas.width / 2 - 5 && l.pos.x + lwidth / 2 > this.canvas.width / 2) {
          label.style.left = (this.canvas.width / 2 - lwidth - 3) + 'px'
          console.log(`nudged '${l.text}'`)
        }
        if (l.pos.x > this.canvas.width / 2 + 5 && l.pos.x - lwidth / 2 < this.canvas.width / 2) {
          label.style.left = (this.canvas.width / 2 + 3) + 'px'
          console.log(`nudged '${l.text}'`)
        }
      }
    })
  }

  showAnswer () {
    this.labels.forEach(l => {
      l.text = l.texta
      l.style = l.stylea
    })
    this.renderLabels()
    this.answered = true
  }

  hideAnswer () {
    this.labels.forEach(l => {
      l.text = l.textq
      l.style = l.styleq
    })
    this.renderLabels()
    this.answered = false
  }

  // Point tranformations of all points

  get allpoints () {
    return []
  }

  scale (sf) {
    this.allpoints.forEach(function (p) {
      p.scale(sf)
    })
  }

  rotate (angle) {
    this.allpoints.forEach(function (p) {
      p.rotate(angle)
    })
    return angle
  }

  translate (x, y) {
    this.allpoints.forEach(function (p) {
      p.translate(x, y)
    })
  }

  randomRotate () {
    var angle = 2 * Math.PI * Math.random()
    this.rotate(angle)
    return angle
  }

  scaleToFit (width, height, margin) {
    let topLeft = Point.min(this.allpoints)
    let bottomRight = Point.max(this.allpoints)
    const totalWidth = bottomRight.x - topLeft.x
    const totalHeight = bottomRight.y - topLeft.y
    this.scale(Math.min((width - margin) / totalWidth, (height - margin) / totalHeight))

    // centre
    topLeft = Point.min(this.allpoints)
    bottomRight = Point.max(this.allpoints)
    const center = Point.mean([topLeft, bottomRight])
    this.translate(width / 2 - center.x, height / 2 - center.y) // centre
  }
}
