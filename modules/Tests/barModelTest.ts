import {createBarModel, BarModelSpec} from '../Question/GraphicQ/BarModels.js'

const spec: BarModelSpec = {
  total: { length: 100 },
  parts: [
    { length: 70 },
    { length: 30, label: "?" }
  ]
}

document.body.append(createBarModel(spec))

spec.parts.push({ length: 25, label: "5<sup>2</sup>" })
spec.total.label = "125"

document.body.append(createBarModel(spec))
