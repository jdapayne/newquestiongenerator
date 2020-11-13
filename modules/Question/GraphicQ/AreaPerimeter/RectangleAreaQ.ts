import { GraphicQ } from "../GraphicQ";
import ViewOptions from "../ViewOptions";
import RectangleAreaData from "./RectangleAreaData";
import RectangleAreaView from "./RectangleAreaView";
import { QuestionOptions } from "./types";

// Rectangle needs no further options
// Triangle needs no further options -- needs passing in 

export default class RectangleAreaQ extends GraphicQ {
  data: RectangleAreaData
  view: RectangleAreaView

  constructor(data: RectangleAreaData,view: RectangleAreaView) {
    super();
    this.data = data
    this.view = view
  }

  static random(options: QuestionOptions, viewOptions: ViewOptions) {
    const data = RectangleAreaData.random(options)
    const view = RectangleAreaView.fromData(data,viewOptions)
    return new this(data,view)
  }

  static get commandWord() {
    return 'Find the missing values'
  }

}