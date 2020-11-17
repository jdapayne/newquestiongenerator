import * as TriangleData from '../triangleData.js'

/*
for (let i=0; i<300; i++) {
  TriangleData.getTriangle(100,(t) => {
    //console.log(`Under 20: ${i}: b:${t.b}, s1:${t.s1}, s2:${t.s2}`)
  }) 
}
*/

let i = 0
function loop() {
  TriangleData.getTriangle(500, t => {
    //console.log(`${i}: b:${t.b}, s1:${t.s1}, s2:${t.s2}`)
    if (i<20) {
      i++
      loop()
    }
  })
}

loop()
