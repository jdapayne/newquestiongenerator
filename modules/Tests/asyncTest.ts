function pretendGet(n: number, callback: (s: string) => void) {
  let response: string
  if (n === 0) {
    response = "foo"
  } else if (n === 1) {
    response = "bar" 
  } else {
    response = "Hello world"
  }
  setTimeout(()=>{callback(response)},3000)
  console.log("Loading...")
}

function pretendFetch(n: number) : Promise<string> {
  let response: string
  if (n === 0) {
    response = "foo"
  } else if (n === 1) {
    response = "bar" 
  } else {
    response = "Hello world"
  }
  return new Promise((resolve,reject) => {
    setTimeout(()=>resolve(response), 3000)
  })
}

function delay(ms: number) : Promise<void> {
  return new Promise((resolve,reject) => {
    setTimeout(()=>resolve(), ms)
  })
}

function pretendFetch2(n: number) : Promise<string> {
  let response: string
  if (n === 0) {
    response = "foo"
  } else if (n === 1) {
    response = "bar" 
  } else {
    response = "Hello world"
  }
  return delay(3000).then(()=>response)
}

function delayedResolve<T>(val: T, ms: number) : Promise<T> {
  return new Promise((resolve,reject) => {
      setTimeout(()=>{resolve(val)},ms)
  })
}

let foo: number | Promise<number> = delayedResolve(42, 1000)

async function doSomething() : Promise<void> {
  foo = await foo
  console.log(foo)
}