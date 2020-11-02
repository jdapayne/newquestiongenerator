/* RNGs / selectors */
export function gaussian (n) {
  let rnum = 0
  for (let i = 0; i < n; i++) {
    rnum += Math.random()
  }
  return rnum / n
}

export function randBetween (n, m, dist) {
  // return a random integer between n and m inclusive
  // dist (optional) is a function returning a value in [0,1)
  // default is slightly biased towards middle
  if (!dist) dist = Math.random
  return n + Math.floor(dist() * (m - n + 1))
}

export function randBetweenFilter (n, m, filter) {
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

export function randMultBetween (min, max, n) {
  // return a random multiple of n between n and m (inclusive if possible)
  min = Math.ceil(min / n) * n
  max = Math.floor(max / n) * n // could check divisibility first to maximise performace, but I'm sure the hit isn't bad

  return randBetween(min / n, max / n) * n
}

export function randElem (array, dist) {
  if ([...array].length === 0) throw new Error('empty array')
  if (!dist) dist = Math.random
  const n = array.length || array.size
  const i = randBetween(0, n - 1, dist)
  return [...array][i]
}

/* Maths */
export function roundToTen (n) {
  return Math.round(n / 10) * 10
}

export function roundDP (x, n) {
  return Math.round(x * Math.pow(10, n)) / Math.pow(10, n)
}

export function degToRad (x) {
  return x * Math.PI / 180
}

export function sinDeg (x) {
  return Math.sin(x * Math.PI / 180)
}

export function cosDeg (x) {
  return Math.cos(x * Math.PI / 180)
}

export function scaledStr (n, dp) {
  // returns a string representing n/10^dp
  // e.g. scaledStr(34,1)="3.4"
  // scaledStr(314,2)="3.14"
  // scaledStr(30,1)="3"
  // Trying to avoid precision errors!
  if (dp === 0) return n
  const factor = Math.pow(10, dp)
  const intpart = Math.floor(n / factor)
  const decpart = n % factor
  if (decpart === 0) {
    return intpart
  } else {
    return intpart + '.' + decpart
  }
}

export function gcd (a, b) {
  // taken from fraction.js
  if (!a) { return b }
  if (!b) { return a }

  while (1) {
    a %= b
    if (!a) { return b }
    b %= a
    if (!b) { return a }
  }
}

export function lcm (a, b) {
  return a * b / gcd(a, b)
}

/* Arrays and similar */
export function sortTogether (arr0, arr1, f) {
  if (arr0.length !== arr1.length) {
    throw new TypeError('Both arguments must be arrays of the same length')
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

export function shuffle (array) {
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

export function weakIncludes (a, e) {
  return (Array.isArray(a) && a.includes(e))
}

export function firstUniqueIndex (array) {
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

export function boolObjectToArray (obj) {
  // Given an object where all values are boolean, return keys where the value is true
  const result = []
  for (const key in obj) {
    if (obj[key]) result.push(key)
  }
  return result
}

/* Object property access by string */
export function propByString (o, s, x) {
  /* E.g. byString(myObj,"foo.bar") -> myObj.foo.bar
     * byString(myObj,"foo.bar","baz") -> myObj.foo.bar = "baz"
     */
  s = s.replace(/\[(\w+)\]/g, '.$1') // convert indexes to properties
  s = s.replace(/^\./, '') // strip a leading dot
  var a = s.split('.')
  for (var i = 0, n = a.length - 1; i < n; ++i) {
    var k = a[i]
    if (k in o) {
      o = o[k]
    } else {
      return
    }
  }
  if (x === undefined) return o[a[n]]
  else o[a[n]] = x
}

/* Logic */
export function mIf (p, q) { // material conditional
  return (!p || q)
}

/* DOM manipulation and querying */
export function createElem (tagName, className, parent) {
  // create, set class and append in one
  const elem = document.createElement(tagName)
  if (className) elem.className = className
  if (parent) parent.appendChild(elem)
  return elem
}

export function hasAncestorClass (elem, className) {
  // check if an element elem or any of its ancestors has clss
  let result = false
  for (;elem && elem !== document; elem = elem.parentNode) { // traverse DOM upwards
    if (elem.classList.contains(className)) {
      result = true
    }
  }
  return result
}

/* Canvas drawing */
export function dashedLine (ctx, x1, y1, x2, y2) {
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