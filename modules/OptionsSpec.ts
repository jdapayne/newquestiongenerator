interface Option {
  title: string,
  id: string,
  type: string,
  disabledIf?: string, // 'id' or '!id' where [id] is of a boolean option
  style?: 'emph' | 'normal'
}

interface SelectOption extends Option{
  type: 'select-exclusive' | 'select-inclusive',
  vertical?: boolean,
  selectOptions: {
    title: string,
    id: string
  }[],
}

interface SelectInclusiveOption extends SelectOption {
  type: 'select-inclusive',
  default: string[]
}

interface SelectExclusiveOption extends SelectOption {
  type: 'select-exclusive',
  default: string
}

interface IntegerOption extends Option{
  type: 'int',
  min?: number,
  max?: number,
  default: number,
}

interface BooleanOption extends Option{
  title: string,
  id: string,
  type: 'bool',
  default: boolean,
  swapLabel?: boolean,
}

type ColumnBreak = {
  type: 'column-break'
}

interface OptionHeading {
  type: 'heading',
  title: string
}

export type OptionsSpec = (
  SelectInclusiveOption |
  SelectExclusiveOption |
  IntegerOption |
  BooleanOption |
  ColumnBreak |
  OptionHeading
)[]
