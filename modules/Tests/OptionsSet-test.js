import OptionsSet from '../OptionsSet.mjs'

const options = new OptionsSet(OptionsSet.demoSpec)
const optionsDiv = document.getElementById('testdiv')
options.renderIn(optionsDiv)

console.log(options.options)
