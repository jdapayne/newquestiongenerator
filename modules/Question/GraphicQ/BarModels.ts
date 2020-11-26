declare const katex : {render : (string: string, element: HTMLElement) => void}
import Question from "Question/Question.js";
import { createElem, randBetween, randElem, randPartition } from "../../utilities.js";
import './barModel.css'

interface BarModelPart {
  length: number,
  label?: string,
  latex?: boolean,
  style?: string // a class
}

export interface BarModelSpec {
  parts: BarModelPart[]
  total: BarModelPart
}

interface PartitionOptions {
  difficulty: number,
}

export function createBarModel(spec: BarModelSpec) : HTMLElement {
  const outer = createElem('div','barModel-outer')
  const total = createElem('div','barModel-total',outer)
  const bracket = createElem('div','barModel-bracket',outer)
  const bar = createElem('div','barModel-bar',outer)

  spec.parts.forEach( p => {
    const part = createElem('div','barModel-part',bar)
    if (p.style) {part.classList.add(p.style)}
    part.style.flexGrow = p.length.toString()
    if (p.latex) {
      katex.render(p.label?? p.length.toString(),part)
    } else {
      part.innerHTML = p.label ?? p.length.toString()
    }
  })

  if (spec.total.latex) {
    katex.render(spec.total.label ?? spec.total.length.toString(), total)
  } else {
    total.innerHTML = spec.total.label ?? spec.total.length.toString()
  }

  return outer
}

export default class PartitionQ extends Question {
  private readonly questionSpec: BarModelSpec
  private readonly answerSpec: BarModelSpec
  private _questionDiv?: HTMLElement // constructed lazily
  private _answerDiv?: HTMLElement
  constructor(questionSpec: BarModelSpec, answerSpec: BarModelSpec) {
    super()
    this.questionSpec = questionSpec
    this.answerSpec = answerSpec
  }

  static random(options: PartitionOptions) {
    let minTotal: number
    let maxTotal: number
    let n : number

    switch(options.difficulty) {
      case 1:
        minTotal =  10
        maxTotal = 10
        n = 2
        break
      case 2:
        minTotal = 7
        maxTotal = 30
        n = 2
        break
      case 3:
        minTotal = 20
        maxTotal = 100
        n = 2
      case 4:
        minTotal = 20
        maxTotal = 200
        n = 3
        break
      case 5:
        minTotal = 20
        maxTotal = 200
        n = randBetween(2,4)
        break
      case 6:
      case 7:
      case 8:
      case 9:
      case 10:
      default:
        minTotal = 100
        maxTotal = 1000
        n = randBetween(3,4)
        break
    }

    const total = randBetween(minTotal,maxTotal)
    const minProportion = 0.1
    const partition = randPartition({total, n, minProportion})
    const spec : BarModelSpec = {
      total: {length: total},
      parts: partition.map(x => ({length: x}))
    }
    const answerSpec : BarModelSpec = {
      total: {length: total},
      parts: partition.map(x => ({length: x}))
    }

    if (Math.random()<0.5) { // hide total
      spec.total.label = "?"
      answerSpec.total.style = "answer"
    } else {
      const i = randBetween(0,n-1)
      answerSpec.parts[i].style = 'answer'
      spec.parts[i].label = "?"
    }

    return new this(spec,answerSpec)
  }

  public render() {
    this.DOM.innerHTML = ''
    if (!this.answered) {
      const barModel = this._questionDiv ?? (this._questionDiv = createBarModel(this.questionSpec))
      this.DOM.append(barModel)
    } else {
      const barModel = this._answerDiv ?? (this._answerDiv = createBarModel(this.answerSpec))
      this.DOM.append(barModel)
    }
  }

  public showAnswer() {
    super.showAnswer()
    this.render()
  }

  public hideAnswer() {
    super.hideAnswer()
    this.render()
  }

}