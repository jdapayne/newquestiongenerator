import Point from './Point.js'

/**
 * Approximates a guassian distribution by finding the mean of n uniform distributions
 * @param {number} n Number of times to roll the 'dice' - higher is closer to gaussian
 * @returns {number} A number between 0 and 1
 */
export function gaussian (n: number): number {
  let rnum = 0
  for (let i = 0; i < n; i++) {
    rnum += Math.random()
  }
  return rnum / n
}

/**
 * Approximates a gaussian distribution by finding the mean of n uniform distributions
 * Returns a functio 
 * @param {number} n Number of uniform distributions to average
 * @returns {()=>number} A function which returns a random number
 */
export function gaussianCurry (n: number): () => number {
  return () => gaussian(n)
}

/**
 * return a random integer between n and m inclusive
 * dist (optional) is a function returning a value in [0,1)
 * @param {number} n The minimum value
 * @param {number} m The maximum value
 * @param {()=>number} [dist] A distribution returning a number from 0 to 1
 */
export function randBetween (n: number, m: number, dist?: ()=>number) {
  if (!dist) dist = Math.random
  return n + Math.floor(dist() * (m - n + 1))
}

export function randBetweenFilter (n: number, m: number, filter: (n:number)=>boolean) {
  /* returns a random integer between n and m inclusive which satisfies the filter
  /  n, m: integer
  /  filter: Int-> Bool
  */
  const arr = []
  for (let i = n; i < m + 1; i++) {
    if (filter(i)) arr.push(i)
  }
  if (arr === []) throw new Error('overfiltered')
  const i = randBetween(0, arr.length - 1)
  return arr[i]
}

/**
 * Returns a multiple of n between min and max
 * @param {number} min Minimum value
 * @param {number} max Maximum value
 * @param {number} n Choose a multiple of this value
 * @returns {number} A multipleof n between min and max
 */
export function randMultBetween (min: number, max: number, n: number): number {
  // return a random multiple of n between n and m (inclusive if possible)
  min = Math.ceil(min / n) * n
  max = Math.floor(max / n) * n // could check divisibility first to maximise performace, but I'm sure the hit isn't bad

  return randBetween(min / n, max / n) * n
}

/**
 * Returns a random element of an array
 * @template T
 * @param {T[]} array An array of objects
 * @param {()=>number} [dist] A distribution function for weighting, returning a number between 0 and 1. Default is Math.random
 * @returns {T}
 */
export function randElem<T> (array: Array<T>, dist?: ()=> number) : T {
  if ([...array].length === 0) throw new Error('empty array')
  if (!dist) dist = Math.random
  const n = array.length
  const i = randBetween(0, n - 1, dist)
  return [...array][i]
}

/**
 * Randomly partitions a total into n amounts
 * @param total The total amount to partition
 * @param n How many parts to partition into
 * @param minProportion The smallest proportion of a whole for a partion
 * @param minValue The smallest value for a partition. Overrides minProportion
 * @returns An array of n numbers which sum to total
 */
export function randPartition({ total, n, minProportion, minValue, integer = true }: { total: number; n: number; minProportion?: number; minValue?: number; integer?: boolean }): number[] {
  minValue = minValue ?? (minProportion !== undefined? total*minProportion : 0)  // why does typescript require ! here? 
  
  const partitions: number[] = []
  let left = total
  for (let i = 0; i < n - 1; i++) {
    const maxValue = left - minValue * (n - i - 1)
    const nextValue = integer? randBetween(minValue, maxValue) : minValue + Math.random()*(maxValue-minValue)
    left -= nextValue
    partitions.push(nextValue)
  }
  partitions[n - 1] = left

  return partitions
}

/**
 * Selects an element
 * @template T
 * @param {T[]} array An array of elements
 * @param {number[]} probabilities An array of probbilities
 * @returns {T}
 */
export function randElemWithProbabilities<T> (array: Array<T>, probabilities: Array<number>): T {
  // validate
  if (array.length !== probabilities.length) throw new Error('Array lengths do not match')

  const r = Math.random()
  let cumulativeProb = 0
  for (let i = 0; i < array.length; i++) {
    cumulativeProb += probabilities[i]
    if (r < cumulativeProb) return array[i]
  }

  // shouldn't get here if probabilities sum to 1, but could be a rounding error
  console.warn(`Probabilities don't sum to 1? Total was ${cumulativeProb}`)
  return (array[array.length - 1])
}

/**
 * Finds a random pythaogrean triple with maximum hypotenuse lengt 
 * @param {number} max The maximum length of the hypotenuse
 * @returns {{a: number, b: number, c: number}} Three values such that a^2+b^2=c^2
 */
export function randPythagTriple(max: number): { a: number; b: number; c: number } {
  const n = randBetween(2, Math.ceil(Math.sqrt(max))-1);
  const m = randBetween(1, Math.min(n-1,Math.floor(Math.sqrt(max-n*n))));
  return {a: n*n-m*m, b: 2*n*m, c:n*n+m*m};
}

/**
 * Random pythagorean triple with a given leg
 * @param {number} a The length of the first leg
 * @param {number} max The maximum length of the hypotenuse
 * @returns {{a: number, b: number, c:number}} Three values such that a^2+b^2 = c^2 and a is the first input parameter
 */
export function randPythagTripleWithLeg(a: number,max?: number): { a: number; b: number; c: number } {
  /* Random pythagorean triple with a given leg
   * That leg is the first one */

  if (max===undefined) max = 500;

  if (a%2===1) { //odd: a = n^2-m^2
    return randPythagnn_mm(a,max);
  } else { //even: try a = 2mn, but if that fails, try a=n^2-m^2
    let triple;
    let f1, f2;
    if (Math.random()<0.5) {
      f1 = randPythag2mn, f2=randPythagnn_mm;
    } else {
      f2 = randPythag2mn, f1=randPythagnn_mm;
    }
    try {
      triple = f1(a,max);
    } catch(err) {
      triple = f2(a,max);
    } 
    return triple;
  }
}

function randPythag2mn(a: number,max: number) {
  // assumes a is 2mn, finds appropriate parameters
  // let m,n be a factor pair of a/2
  let factors = []; //factors of n
  const maxm = Math.sqrt(a/2);                              
  for (let m=1; m<maxm; m++) {
    if ( (a/2)%m===0 && m*m+(a*a)/(4*m*m)<=max ) {
      factors.push(m);
    }
  }
  if (factors.length===0) throw "2mn no options";

  let m = randElem(factors);
  let n = a/(2*m);
  return {a: 2*n*m, b: Math.abs(n*n-m*m), c:n*n+m*m};
}

function randPythagnn_mm(a: number,max: number) {
  // assumes a = n^2-m^2
  // m=sqrt(a+n^2)
  // cycle through 1≤m≤sqrt((max-a)/2)
  let possibles = [];
  const maxm = Math.sqrt((max-a)/2);
  for (let m=1; m<=maxm; m++) {
    let n = Math.sqrt(a+m*m);
    if (n===Math.floor(n)) possibles.push([n,m]);
  }
  if (possibles.length===0) throw "n^2-m^2 no options";

  let [n,m] = randElem(possibles);

  return {a: n*n-m*m, b: 2*n*m, c: n*n+m*m};
}

/* Maths */
export function roundToTen (n: number) {
  return Math.round(n / 10) * 10
}

/**
 * Rounds a number to a given number of decimal places
 * @param {number} x The number to round
 * @param {number} n The number of decimal places
 * @returns {number}
 */
export function roundDP (x: number, n: number): number {
  return Math.round(x * Math.pow(10, n)) / Math.pow(10, n)
}

export function degToRad (x: number) {
  return x * Math.PI / 180
}

export function sinDeg (x: number) {
  return Math.sin(x * Math.PI / 180)
}

export function cosDeg (x: number) {
  return Math.cos(x * Math.PI / 180)
}

/**
 * Returns a string representing n/10^dp
 * E.g. scaledStr(314,2) = "3.14"
 * @param {number} n An integer representing the digits of a fixed point number
 * @param {number} dp An integer for number of decimal places
 * @returns {string}
 */
export function scaledStr (n: number, dp: number): string {
  if (dp === 0) return n.toString()
  const factor = Math.pow(10, dp)
  const intpart = Math.floor(n / factor)
  const decpart = n % factor
  if (decpart === 0) {
    return intpart.toString()
  } else {
    return intpart + '.' + decpart
  }
}

export function gcd (a: number, b: number) : number {
  // taken from fraction.js
  if (!a) { return b }
  if (!b) { return a }

  while (1) {
    a %= b
    if (!a) { return b }
    b %= a
    if (!b) { return a }
  }
  return 0 // unreachable, and mathematically guaranteed not to happen, but makes typescript queit
}

export function lcm (a: number, b: number) {
  return a * b / gcd(a, b)
}

/* Arrays and similar */

function isArrayOfNumbers(arr: unknown[]) : arr is number[] {
  return (typeof arr[0] === 'number')
}

/**
 * Sorts two arrays together based on sorting arr0
 * @param {*[]} arr0
 * @param {*[]} arr1
 * @param {*} f
 */
export function sortTogether (arr0 : unknown[], arr1: unknown[], f: (x: unknown, y:unknown)=>number) : [unknown[],unknown[]] {
  if (arr0.length !== arr1.length) {
    throw new TypeError('Both arguments must be arrays of the same length')
  }

  if (!f) {
    f = f || ((x, y) => (x as number) - (y as number))
  }

  const n = arr0.length
  const combined = []
  for (let i = 0; i < n; i++) {
    combined[i] = [arr0[i], arr1[i]]
  }

  combined.sort((x, y) => f(x[0], y[0]))

  for (let i = 0; i < n; i++) {
    arr0[i] = combined[i][0]
    arr1[i] = combined[i][1]
  }

  return [arr0, arr1]
}

export function shuffle<T> (array: T[]) {
  // Knuth-Fisher-Yates
  // from https://stackoverflow.com/a/2450976/3737295
  // nb. shuffles in place
  var currentIndex = array.length; var temporaryValue; var randomIndex

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex -= 1

    // And swap it with the current element.
    temporaryValue = array[currentIndex]
    array[currentIndex] = array[randomIndex]
    array[randomIndex] = temporaryValue
  }

  return array
}

/**
 * Returns true if a is an array containing e, false otherwise (including if a is not an array)
 * @param {*} a  An array
 * @param {*} e An element to check if is in the array
 * @returns {boolean}
 */
export function weakIncludes (a: unknown, e:unknown) : boolean {
  return (Array.isArray(a) && a.includes(e))
}

export function firstUniqueIndex<T> (array:T[]): number {
  // returns index of first unique element
  // if none, returns length of array
  let i = 0
  while (i < array.length) {
    if (array.indexOf(array[i]) === array.lastIndexOf(array[i])) {
      break
    }
    i++
  }
  return i
}

export function boolObjectToArray<T extends string> (obj: Record<T,unknown>) : T[] {
  // Given an object where all values are boolean, return keys where the value is true
  const result = []
  for (const key in obj) {
    if (obj[key]) result.push(key)
  }
  return result
}

/* Object property access by string */
export function propByString (o: Record<string,unknown>, s: string, x: unknown) {
  /* E.g. byString(myObj,"foo.bar") -> myObj.foo.bar
     * byString(myObj,"foo.bar","baz") -> myObj.foo.bar = "baz"
     */
  s = s.replace(/\[(\w+)\]/g, '.$1') // convert indexes to properties
  s = s.replace(/^\./, '') // strip a leading dot
  var a = s.split('.')
  for (var i = 0, n = a.length - 1; i < n; ++i) {
    var k = a[i]
    if (k in o) {
      o = o[k] as Record<string,unknown>
    } else {
      return
    }
  }
  if (x === undefined) return o[a[n]]
  else o[a[n]] = x
}

/* Logic */
export function mIf (p: boolean, q: boolean) { // material conditional
  return (!p || q)
}

/* DOM manipulation and querying */

/**
 * Creates a new HTML element, sets classes and appends
 * @param {string} tagName Tag name of element
 * @param {string|undefined} [className] A class or classes to assign to the element
 * @param {HTMLElement} [parent] A parent element to append the element to
 * @returns {HTMLElement}
 */
export function createElem (tagName: string, className: string | undefined, parent?: HTMLElement): HTMLElement {
  // create, set class and append in one
  const elem = document.createElement(tagName)
  if (className) elem.className = className
  if (parent) parent.appendChild(elem)
  return elem
}

export function hasAncestorClass (elem: HTMLElement|null, className: string) {
  // check if an element elem or any of its ancestors has clss
  let result = false
  for (;elem && elem.parentNode; elem = elem.parentElement) { // traverse DOM upwards
    if (elem.classList.contains(className)) {
      result = true
    }
  }
  return result
}

/**
 * Determines if two elements overlap
 * @param {HTMLElement} elem1 An HTML element
 * @param {HTMLElement} elem2 An HTML element
 */
function overlap( elem1: HTMLElement, elem2: HTMLElement) {
  const rect1 = elem1.getBoundingClientRect()
  const rect2 = elem2.getBoundingClientRect()
  return !(rect1.right < rect2.left || 
           rect1.left > rect2.right || 
           rect1.bottom < rect2.top || 
           rect1.top > rect2.bottom)
}

/**
 * If elem1 and elem2 overlap, move them apart until they don't.
 * Only works for those with position:absolute
 * This strips transformations, which may be a problem
 * Elements with class 'repel-locked' will not be moved
 * @param {HTMLElement} elem1 An HTML element
 * @param {HTMLElement} elem2 An HTML element
 */
export function repelElements(elem1: HTMLElement, elem2: HTMLElement)  {
  if (!overlap(elem1,elem2)) return
  if (getComputedStyle(elem1).position !== "absolute" || getComputedStyle(elem2).position !== 'absolute') throw new Error ('Only call on position:absolute')
  let tl1 = Point.fromElement(elem1)
  let tl2 = Point.fromElement(elem2)
  
  const c1 = Point.fromElement(elem1, "center")
  const c2 = Point.fromElement(elem2, "center")
  const vec = Point.unitVector(c1,c2)

  const locked1 = elem1.classList.contains('repel-locked')
  const locked2 = elem2.classList.contains('repel-locked')

  let i = 0
  while(overlap(elem1,elem2) && i<500) {
    if (!locked1) tl1.translate(-vec.x,-vec.y)
    if (!locked2) tl2.translate(vec.x,vec.y)
    elem1.style.left = tl1.x + "px"
    elem1.style.top = tl1.y + "px"
    elem1.style.transform = "none"
    elem2.style.left = tl2.x + "px"
    elem2.style.top = tl2.y + "px"
    elem2.style.transform = "none"
    i++
  }
  if (i===500) throw new Error('Too much moving')
  console.log(`Repelled with ${i} iterations`)
}

/* Canvas drawing */
export function dashedLine (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  const length = Math.hypot(x2 - x1, y2 - y1)
  const dashx = (y1 - y2) / length // unit vector perpendicular to line
  const dashy = (x2 - x1) / length
  const midx = (x1 + x2) / 2
  const midy = (y1 + y2) / 2

  // draw the base line
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)

  // draw the dash
  ctx.moveTo(midx + 5 * dashx, midy + 5 * dashy)
  ctx.lineTo(midx - 5 * dashx, midy - 5 * dashy)

  ctx.moveTo(x2, y2)
}
