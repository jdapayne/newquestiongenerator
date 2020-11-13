import Question from 'Question/Question'
import { createElem } from 'utilities'
import Point from 'Point'
import ViewOptions from './ViewOptions'
declare const katex : {render : (string: string, element: HTMLElement) => void}

/* GraphicQData can all be very different, so interface is empty
 * Here for code documentation rather than type safety (which isn't provided) */

/* eslint-disable */
export interface GraphicQData {
}
/* eslint-enable */

/* Not worth the hassly trying to get interfaces for static methods
 *
 * export interface GraphicQDataConstructor {
 *   new(...args : unknown[]): GraphicQData
 *   random(options: unknown) : GraphicQData
 * }
*/

export interface Label {
  pos: Point,
  textq: string,
  texta: string,
  styleq: string,
  stylea: string,
  text: string,
  style: string
}

export abstract class GraphicQView {
  DOM: HTMLElement
  canvas: HTMLCanvasElement
  width: number
  height: number
  data: GraphicQData
  labels: Label[]

  constructor (data : GraphicQData, viewOptions : ViewOptions) {
    const defaults : ViewOptions = {
      width: 300,
      height: 300
    }

    viewOptions = Object.assign({}, defaults, viewOptions)

    this.width = viewOptions.width
    this.height = viewOptions.height // only things I need from the options, generally?
    this.data = data
    // this.rotation?

    this.labels = [] // labels on diagram

    // DOM elements
    this.DOM = createElem('div', 'question-div')
    this.canvas = createElem('canvas', 'question-canvas', this.DOM) as HTMLCanvasElement
    this.canvas.width = this.width
    this.canvas.height = this.height
  }

  getDOM () : HTMLElement {
    return this.DOM
  }

  abstract render () : void

  renderLabels (nudge? : boolean) : void {
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
      label.className += ' ' + l.style // using className over classList since l.style is space-delimited list of classes
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

      // I don't understand this adjustment. I think it might be needed in arithmagons, but it makes
      // others go funny.

      if (nudge) {
        const lwidth = label.offsetWidth
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

  showAnswer () : void {
    this.labels.forEach(l => {
      l.text = l.texta
      l.style = l.stylea
    })
    this.renderLabels(false)
  }

  hideAnswer () : void {
    this.labels.forEach(l => {
      l.text = l.textq
      l.style = l.styleq
    })
    this.renderLabels(false)
  }

  // Point tranformations of all points

  get allpoints () : Point[] {
    return []
  }

  scale (sf : number) : void {
    this.allpoints.forEach(function (p) {
      p.scale(sf)
    })
  }

  rotate (angle : number) : number {
    this.allpoints.forEach(function (p) {
      p.rotate(angle)
    })
    return angle
  }

  translate (x : number, y : number) : void {
    this.allpoints.forEach(function (p) {
      p.translate(x, y)
    })
  }

  randomRotate () : number {
    const angle = 2 * Math.PI * Math.random()
    this.rotate(angle)
    return angle
  }

  /**
   * Scales all the points to within a given width and height, centering the result. Returns the scale factor
   * @param width The width of the bounding rectangle to scale to
   * @param height The height of the bounding rectangle to scale to
   * @param margin Margin to leave outside the rectangle
   * @returns
   */
  scaleToFit (width : number, height: number, margin : number) : number {
    let topLeft : Point = Point.min(this.allpoints)
    let bottomRight : Point = Point.max(this.allpoints)
    const totalWidth : number = bottomRight.x - topLeft.x
    const totalHeight : number = bottomRight.y - topLeft.y
    const sf = Math.min((width - margin) / totalWidth, (height - margin) / totalHeight)
    this.scale(sf)

    // centre
    topLeft = Point.min(this.allpoints)
    bottomRight = Point.max(this.allpoints)
    const center = Point.mean(topLeft, bottomRight)
    this.translate(width / 2 - center.x, height / 2 - center.y) // centre

    return sf
  }
}

export abstract class GraphicQ extends Question {
  data: GraphicQData
  view: GraphicQView

  constructor () { // eslint-disable-line @typescript-eslint/no-unused-vars
    super() // this.answered = false
    delete (this.DOM) // going to override getDOM using the view's DOM

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

  getDOM () : HTMLElement { return this.view.getDOM() }

  render () : void { this.view.render() }

  showAnswer () : void {
    super.showAnswer()
    this.view.showAnswer()
  }

  hideAnswer () : void {
    super.hideAnswer()
    this.view.hideAnswer()
  }
}
