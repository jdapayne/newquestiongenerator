/* global katex */
import Question from 'Question'
import Point from 'Point'

export default class GraphicQ extends Question {
  constructor (options) {
    super() // sets this.DOM and this.answered

    const defaults = {
      difficulty: 5,
      label: 'a',
      width: 250,
      height: 250
    }
    this.settings = Object.assign({}, defaults, options)

    // TODO Do I need rotation stored?
    this.label = this.settings.label // Question number
    this.labels = [] // labels on diagram

    // make canvas and append to div
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.settings.width
    this.canvas.height = this.settings.height
    this.canvas.className = 'question-canvas'

    this.DOM.append(this.canvas)
  }

  renderLabels () {
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
        const newlabeltext = l.text.replace(/\+/, '\\!+\\!').replace(/-/, '\\!-\\!')
        katex.render(newlabeltext, innerlabel)
      }

      // position correctly - this could def be optimised - lots of back-and-forth

      // adjust to *center* label, rather than anchor top-right
      const lwidth = label.offsetWidth
      const lheight = label.offsetHeight
      label.style.left = (l.pos.x - lwidth / 2) + 'px'
      label.style.top = (l.pos.y - lheight / 2) + 'px'

      // further adjustment - if it runs into the margins?
      if (l.pos.x < this.canvas.width / 2 - 5 && l.pos.x + lwidth / 2 > this.canvas.width / 2) {
        label.style.left = (this.canvas.width / 2 - lwidth - 3) + 'px'
      }
      if (l.pos.x > this.canvas.width / 2 + 5 && l.pos.x - lwidth / 2 < this.canvas.width / 2) {
        label.style.left = (this.canvas.width / 2 + 3) + 'px'
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

  // To be overridden
  get allpoints () {
    return []
  }

  // Point transformation functions
  // Depend on this.allpoints
  //
  // TODO:
  // Put these into points library instead?
  // Or better, have the following?
  //
  //  GraphicQ
  //   |
  //   --GraphicQData
  //   | (constructs data for the question)
  //   |
  //   --GraphicQView
  //   | (has link to the data, does the drawing in a canvas

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
