import * as TriangleDataQ from '../triangleData-queue.js'
import * as TriangleData from '../triangleData.js'

/*
for (let i=0; i<300; i++) {
  TriangleData.getTriangle(100,(t) => {
    //console.log(`Under 20: ${i}: b:${t.b}, s1:${t.s1}, s2:${t.s2}`)
  })
}
*/
const button = document.getElementById('button')
button?.addEventListener('click', () => {
  for (let i = 0; i < 10; i++) {
    printNewTriangleQ()
  }
})


async function printNewTriangle () {
  const elem = document.createElement('div')
  document.body.append(elem)
  elem.style.background = "lightblue"
  const loader = document.createElement('div')
  loader.classList.add('loader')
  elem.append(loader)
  const triangle = await TriangleData.getTriangle(100)
  const area = triangle.b * triangle.h / 2
  const perimeter = triangle.s1 + triangle.s2 + triangle.b
  elem.innerHTML = `Sides: ${triangle?.s1}, ${triangle?.s2}, ${triangle?.b}, height: ${triangle?.h}. Area = ${area}. Perimeter = ${perimeter}`
}

async function printNewTriangleQ () {
  const elem = document.createElement('div')
  document.body.append(elem)
  elem.style.background = "lightgreen"
  const loader = document.createElement('div')
  loader.classList.add('loader')
  elem.append(loader)
  const triangle = await TriangleDataQ.getTriangle(100)
  const area = triangle.b * triangle.h / 2
  const perimeter = triangle.s1 + triangle.s2 + triangle.b
  elem.innerHTML = `Sides: ${triangle?.s1}, ${triangle?.s2}, ${triangle?.b}, height: ${triangle?.h}. Area = ${area}. Perimeter = ${perimeter}`
}

/* Using the callback verstion
button?.addEventListener("click", () => {
  TriangleData.getTriangle(500, t => {
    document.body.insertAdjacentHTML("beforeend",`<p>Sides: ${t?.s1}, ${t?.s2}, ${t?.b}, height: ${t?.h}</p>`)
  })
})
*/
