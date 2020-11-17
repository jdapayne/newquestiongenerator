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

console.log("Main script before pretend get")
const a = pretendGet(1, s => {
  console.log(s.toUpperCase())
})
console.log("Main script after pretend get")