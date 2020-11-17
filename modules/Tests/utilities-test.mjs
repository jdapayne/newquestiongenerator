import * as utilities from '../utilities.js'

// testing randMultBetwee
// multiples of 8 up to 96
/*
console.log('Multiples of 8 up to 96')
for (let i=0; i<20; i++) {
  console.log(utilities.randMultBetween(0,96,8))
}
*/

// multip/les of 10 up to 97
/*
const N = 100_000_000
console.log('Multiples of 10 up to 97. Expect equal numbers of each')
let counts = new Array(10)
counts.fill(0)
for (let i=0; i<N; i++) {
  const n = utilities.randMultBetween(0,97,10)
//  console.log(utilities.randMultBetween(0,97,10))
  counts[n/10]+=1
}
counts = counts.map(count => count/N)

console.log(counts)
*/

//Testing when maximum is less than factor

console.log(utilities.randMultBetween(0,20,50))