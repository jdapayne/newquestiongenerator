import { MissingAngleOptions } from './NumberOptions'
import { WordedType } from './MissingAnglesWordedData'

export interface WordedOptions extends Omit<MissingAngleOptions, "nMissing"> {
  minAddend: number;
  maxAddend: number;
  minMultiplier: number;
  maxMultiplier: number;
  types: WordedType[];
}
