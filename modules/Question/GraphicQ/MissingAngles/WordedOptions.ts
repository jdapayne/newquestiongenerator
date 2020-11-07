import { MissingAngleOptions } from "./NumberOptions";
import { WordedType } from "./MissingAnglesWordedData";

export interface WordedOptions extends MissingAngleOptions {
  minAddend?: number;
  maxAddend?: number;
  minMultiplier?: number;
  maxMultiplier?: number;
  types?: WordedType[];
}
