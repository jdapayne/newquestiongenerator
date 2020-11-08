interface SelectOption {
  title: string
  id: string,
  type: 'select-exclusive' | 'select-inclusive',
  vertical?: boolean,
  selectOptions: {
    title: string,
    id: string
  }[]
}

interface SelectInclusiveOption extends SelectOption {
  type: 'select-inclusive',
  default: string[]
}

interface SelectExclusiveOption extends SelectOption {
  type: 'select-exclusive',
  default: string
}

interface IntegerOption {
  title: string,
  id: string,
  type: 'int', 
  min?: number,
  max?: number,
  default: number
}

interface BooleanOption {
  title: string,
  id: string,
  type: 'bool',
  default: boolean,
  swapLabel?: boolean
}

type ColumnBreak = {
  type: 'column-break'
}

interface OptionHeading {
  type: 'heading',
  title: string
}

type OptionsSpec = (
  SelectInclusiveOption |
  SelectExclusiveOption |
  IntegerOption |
  BooleanOption |
  ColumnBreak |
  OptionHeading 
)[]