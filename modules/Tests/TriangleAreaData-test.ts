import TriangleAreaData from "../Question/GraphicQ/AreaPerimeter/TriangleAreaData.js";
import * as AreaTypes from 'Question/GraphicQ/AreaPerimeter/types'

const options: AreaTypes.QuestionOptions = {
  questionType: 'area',
  maxLength: 100,
  noDistractors: false,
}

const types : AreaTypes.QuestionType[] = [
//  'area',
//  'perimeter',
  'pythagorasArea',
  'pythagorasIsoscelesArea',
  'pythagorasPerimeter',
  'reverseArea',
  'reversePerimeter',
]

const button = document.getElementById("button")
button?.addEventListener("click",printNewTriangle)

let i = 0

async function printNewTriangle() {
  options.questionType = types[i]
  console.log(`${i}. Type: ${types[i]}`)
  const triangleData : TriangleAreaData = await TriangleAreaData.random(options)
  console.log(triangleData)
  i = (i+1)%7
}