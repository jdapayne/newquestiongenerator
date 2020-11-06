export interface MissingAnglesData {
  angleLabels: string[] // the labels for the angles when unknown
  angles: number[];     // numerical values of the angles
  missing: boolean[];   // which angles are missing
  angleSum: number;     // the sum of the angles
}