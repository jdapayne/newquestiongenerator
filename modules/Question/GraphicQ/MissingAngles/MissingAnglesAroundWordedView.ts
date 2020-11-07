import Point from "Point";
import { Label } from "../GraphicQ";
import MissingAnglesAroundView from "./MissingAnglesAroundView";
import MissingAnglesWordedData from "./MissingAnglesWordedData";

export default class MissingAnglesAroundWordedView extends MissingAnglesAroundView {
  data: MissingAnglesWordedData
  constructor (data, options) {
    super(data, options) // does most of the set up
    super.translate(0,-15)
      let instructionLabel : Label = {
        textq: this.data.instructions.join('\\\\'),
        texta: this.data.instructions.join('\\\\'),
        text: this.data.instructions.join('\\\\'),
        styleq: 'extra-info',
        stylea: 'extra-info',
        style: 'extra-info',
        pos: new Point(10, this.height-10)
    }
      this.labels.push(instructionLabel)
  }
}