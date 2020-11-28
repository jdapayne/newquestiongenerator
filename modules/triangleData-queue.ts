import { randElem, randMultBetween } from './utilities.js'

const pathRoot = '.'

type indexVals = '100' | '200' | '300' | '400' | '500'

export interface Triangle{
  b: number,
  s1: number,
  s2: number,
  h: number
}

interface dataSource {
  readonly length: number,
  readonly path: string,
  status: 'uncached' | 'cached' | 'pending',
  data: Triangle[],
  queue: {
    callback: (t: Triangle) => void,
    maxLength: number,
    filter?: (t: Triangle) => boolean
  }[]
}


const dataSources : Record<indexVals, dataSource> = {
  100: {
    length: 361,
    path: '/data/triangles0-100.json',
    status: 'uncached',
    data: [],
    queue: []
  },
  200: {
    length: 715,
    path: '/data/triangles100-200.json',
    status: 'uncached',
    data: [],
    queue: []
  },
  300: {
    length: 927,
    path: '/data/triangles200-300.json',
    status: 'uncached',
    data: [],
    queue: []
  },
  400: {
    length: 1043,
    path: '/data/triangles300-400.json',
    status: 'uncached',
    data: [],
    queue: []
  },
  500: {
    length: 1151,
    path: '/data/triangles400-500.json',
    status: 'uncached',
    data: [],
    queue: []
  }
}

/**
 * Return a promise to a randomly chosen triangle (see triangleData.Triangle interface for format)
 * @param maxLength Maxumum length of side
 * @param filterPredicate Restrict to triangles with this property
 */
function getTriangle (maxLength: number, filterPredicate?: (t: Triangle) => boolean) : Promise<Triangle> {
  let triangle: Triangle
  filterPredicate = filterPredicate ?? (t => true) // default value for predicate is tautology

  // Choose multiple of 50 to select from - smooths out distribution.
  // (Otherwise it's biased towards higher lengths)
  if (maxLength > 500) maxLength = 500
  const bin50 = randMultBetween(0, maxLength - 1, 50) + 50 // e.g. if bin50 = 150, choose with a maxlength between 100 and 150
  const bin100 = (Math.ceil(bin50 / 100) * 100).toString() as indexVals // e.g. if bin50 = 150, bin100 = Math.ceil(1.5)*100 = 200
  const dataSource = dataSources[bin100]

  if (dataSource.status === 'cached') { // Cached - just load data
    console.log('Using cached data')
    triangle = randElem(dataSource.data.filter(t => maxSide(t) < maxLength && filterPredicate!(t)))
    return Promise.resolve(triangle)
  }

  else if (dataSource.status === 'pending') { // pending - put callback into queue
    console.log('Pending: adding request to queue')
    return new Promise((resolve,reject) => {
      dataSource.queue.push({callback: resolve, maxLength: maxLength, filter: filterPredicate})
    })
  }
  
  else { // nobody has loaded yet
    console.log('Loading data with XHR')
    dataSource.status = 'pending'
    return fetch(`${pathRoot}${dataSource.path}`).then(response => {
      if (!response.ok) {
        return Promise.reject(response.statusText)
      } else {
        return response.json() as Promise<Triangle[]>
      }
    }).then(data => {
      dataSource.data = data
      dataSource.status = 'cached'
      dataSource.queue.forEach( ({callback,maxLength, filter}) => {
        filter = filter ?? (t=>true)
        const triangle = randElem(data.filter((t: Triangle) => maxSide(t) < maxLength && filter!(t)))
        console.log('loading from queue')
        callback(triangle)
      })
      triangle = randElem(data.filter((t: Triangle) => maxSide(t) < maxLength && filterPredicate!(t)))
      return triangle
    })
  } 
}

function maxSide (triangle: Triangle) {
  return Math.max(triangle.b, triangle.s1, triangle.s2)
}

export { getTriangle, dataSources }
