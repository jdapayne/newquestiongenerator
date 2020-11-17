import { randElem, randMultBetween } from "./utilities.js"

const pathRoot = "/dist/"

type indexVals = "100" | "200" | "300" | "400" | "500"

export interface Triangle{
  b: number,
  s1: number,
  s2: number,
  h: number
}

const dataSources= {
  "100": {
    length: 361,
    path: '/data/triangles0-100.json',
    loaded: false,
    data: []
  },
  "200": {
    length: 715,
    path: '/data/triangles100-200.json',
    loaded: false,
    data: []
  },
  "300": {
    length: 927,
    path: '/data/triangles200-300.json',
    loaded: false,
    data: []
  },
  "400": {
    length: 1043,
    path: '/data/triangles300-400.json',
    loaded: false,
    data: []
  },
  "500": {
    length: 1151,
    path: '/data/triangles400-500.json',
    loaded: false,
    data: []
  },
}

function getTriangle(maxLength: number, callback: (t?: Triangle) => void) {
  let triangle: Triangle

  // Choose multiple of 50 to select from - smooths out distribution.
  // (Otherwise it's biased towards higher lengths)
  if (maxLength > 500) maxLength = 500
  const bin50 = randMultBetween(0, maxLength-1,50) + 50                        // e.g. if bin50 = 150, choose with a maxlength between 100 and 150
  const bin100 = (Math.ceil(bin50 / 100) * 100).toString() as indexVals    // e.g. if bin50 = 150, bin100 = Math.ceil(1.5)*100 = 200 

  const dataSource = dataSources[bin100]

  if (dataSource.loaded) {
    console.log("Using cached data")
    triangle = randElem(dataSource.data.filter(t => maxSide(t) < maxLength))
    callback(triangle)
    return
  } else {
    console.log("Loading data with XHR")
    const req = new XMLHttpRequest
    req.onreadystatechange = () => {
      if (req.readyState === XMLHttpRequest.DONE) {
        if (req.status !== 200) {
          throw new Error(`HTTP response ${req.status}`)
        } else {
          const data = JSON.parse(req.responseText)
          if (!dataSource.loaded) { // cache if something hasn't beaten us to it
            dataSource.loaded = true
            dataSource.data = data
          }
          try {
            triangle = randElem(data.filter((t: Triangle) => maxSide(t) < maxLength))
          } catch (e) {
            if (e instanceof Error) {
              console.error(`Got error ${e.name} with XHR
              bin50 was ${bin50}
              bin100 was ${bin100}`)
            }
            else throw e
          }
          callback(triangle)
        }
      }
    }
    req.open("GET", `${pathRoot}${dataSource.path}`)
    req.send()
  }
}

function maxSide(triangle: Triangle) {
  return Math.max(triangle.b,triangle.s1,triangle.s2)
}

export {getTriangle, dataSources}