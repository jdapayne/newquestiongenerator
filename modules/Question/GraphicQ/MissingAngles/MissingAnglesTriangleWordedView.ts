import Point from "Point";
import { Label } from "../GraphicQ";
import ViewOptions from "../ViewOptions";
import MissingAnglesTriangleData from "./MissingAnglesTriangleData";
import MissingAnglesTriangleView from "./MissingAnglesTriangleView";
import MissingAnglesWordedData from "./MissingAnglesWordedData";

export default class MissingAnglesTriangleWordedView extends MissingAnglesTriangleView {
  data: MissingAnglesWordedData
  constructor(data: MissingAnglesWordedData, options: ViewOptions) {
    super(data,options)
    super.scaleToFit(this.width,this.height,40)
    super.translate(0,-30)

    let instructionLabel: Label = {
      textq: this.data.instructions.join('\\\\'),
      texta: this.data.instructions.join('\\\\'),
      text: this.data.instructions.join('\\\\'),
      styleq: 'extra-info',
      stylea: 'extra-info',
      style: 'extra-info',
      pos: new Point(10, this.height - 10)
    }
    this.labels.push(instructionLabel)
  }
}
