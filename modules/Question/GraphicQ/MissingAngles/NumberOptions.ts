import GraphicOptions from "../GraphicOptions";

export interface NumberOptions extends GraphicOptions {
  angleSum?: number
  minAngle?: number
  minN?: number
  maxN?: number
  repeated?: boolean
  nMissing?: number
}
