import OptionsSet from '../OptionsSet.mjs'

let options = new OptionsSet(OptionsSet.demoSpec)
let optionsDiv = document.getElementById('testdiv')
options.renderIn(optionsDiv)

console.log(options.options)
