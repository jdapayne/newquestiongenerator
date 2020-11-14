export interface Option {
  title: string,
  id: string,
  type: string,
  enabledIf?: string, // 'id' or '!id' where [id] is of a boolean option
}

export interface SelectOption extends Option{
  type: 'select-exclusive' | 'select-inclusive',
  vertical?: boolean,
  selectOptions: {
    title: string,
    id: string
  }[],
}

export interface SelectInclusiveOption extends SelectOption {
  type: 'select-inclusive',
  default: string[]
}

export interface SelectExclusiveOption extends SelectOption {
  type: 'select-exclusive',
  default: string
}

export interface RangeOption extends Option{
  type: 'range',
  idLB: string,
  idUB: string,
  defaultLB: number,
  defaultUB: number,
  min: number,
  max: number
}

export interface IntegerOption extends Option{
  type: 'int',
  min: number,
  max: number,
  default: number,
  swapLabel?: boolean
}

export interface BooleanOption extends Option{
  type: 'bool',
  default: boolean,
  swapLabel?: boolean,
}

interface SubOptions extends Option{
  type: 'suboptions',
  optionsSpec: OptionsSpec
}

type ColumnBreak = {
  type: 'column-break'
}

interface OptionHeading {
  type: 'heading',
  title: string
}

export type RealOption = SelectExclusiveOption | SelectInclusiveOption | IntegerOption | BooleanOption | SubOptions | RangeOption

export type OptionsSpec = (
  SelectInclusiveOption |
  SelectExclusiveOption |
  IntegerOption |
  BooleanOption |
  ColumnBreak |
  OptionHeading |
  SubOptions |
  RangeOption
)[]
