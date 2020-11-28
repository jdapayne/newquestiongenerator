import AlgebraicFractionQ from 'Question/TextQ/AlgebraicFractionQ'
import IntegerAddQ from 'Question/TextQ/IntegerAdd'
import ArithmagonQ from 'Question/GraphicQ/ArithmagonQ'
import TestQ from 'Question/TextQ/TestQ'
import AddAZero from 'Question/TextQ/AddAZero'
import EquationOfLine from 'Question/TextQ/EquationOfLine'
import MissingAnglesQ from 'Question/GraphicQ/MissingAngles/MissingAnglesWrapper'
import AreaPerimeterQ from 'Question/GraphicQ/AreaPerimeter/AreaWrapper'

import OptionsSet from 'OptionsSet'
import PartitionQ from 'Question/GraphicQ/BarModels'
import Question from 'Question/Question'
import Options from 'Options'
import { OptionsSpec } from 'OptionsSpec'
import FractionAddQ from 'Question/TextQ/FractionAdd'

interface QuestionFactory {
  random(options: Options): Question,
  commandWord: string,
  optionsSpec?: OptionsSpec
} 
interface QuestionClass {
  new(options: Options): Question
  commandWord: string,
  optionsSpec?: OptionsSpec
}

interface SectionTitle {section: string}
interface Topic {
  id: string,
  title: string,
  class: QuestionFactory | QuestionClass
}

type TopicList = (SectionTitle | Topic)[]

export function isTopic(t: SectionTitle | Topic): t is Topic {
  return ((t as Topic).id !== undefined)
}

const topicList: TopicList = [
  {section: 'Number'},
  {
    id: 'integer-add',
    title: 'Integer addition',
    class: IntegerAddQ
  },
  {
    id: 'fraction-add',
    title: 'Fractions - addition',
    class: FractionAddQ
  },
  {
    id: 'barmodel',
    title: 'Partition problems (bar models)',
    class: PartitionQ
  },
  {section: 'Algebra'},
  {
    id: 'algebraic-fraction',
    title: 'Simplify algebraic fractions',
    class: AlgebraicFractionQ
  },
  {
    id: 'equation-of-line',
    title: 'Equation of a line (from two points)',
    class: EquationOfLine
  },
  {section: 'Geometry'},
  {
    id: 'missing-angles',
    title: 'Missing angles',
    class: MissingAnglesQ
  },
  {
    id: 'area-perimter',
    title: 'Area and perimeter of shapes',
    class: AreaPerimeterQ
  },
  {section: 'Other'},
  {
    id: 'arithmagon-add',
    title: 'Arithmagons',
    class: (ArithmagonQ as QuestionClass)
  }
]

function getClass (id: string) {
  // Return the class given an id of a question

  // Obviously this is an inefficient search, but we don't need massive performance
  for (let i = 0; i < topicList.length; i++) {
    const topic = topicList[i]
    if (isTopic(topic) && topic.id === id) {
      return topic.class
    }
  }
  return null
}

function getTitle (id: string) : string|undefined{
  // Return title of a given id
  const topic = topicList.find(t => (isTopic(t) && t.id === id))
  if (topic !== undefined && isTopic(topic)) {
    return topic.title
  } else {
    return undefined
  }
}

/**
 * Gets command word from a topic id
 * @param {string} id The topic id
 * @returns {string} Command word. Returns "" if no topic with id
 */
function getCommandWord (id: string) {
  const topicClass = getClass(id)
  if (topicClass === null) {
    return ''
  } else {
    return topicClass.commandWord
  }
}

function getTopics () : (Omit<Topic,'class'> | SectionTitle)[] {
  // returns topics with classes stripped out
  return topicList.map(x => {
    if (isTopic(x)) {
      return {title: x.title, id: x.id}
    } else {
      return x
    }
  })
}

function newQuestion (id: string, options: Options) : Question | undefined {
  // to avoid writing `let q = new (TopicChooser.getClass(id))(options)
  const QuestionClass = getClass(id)
  let question
  if (QuestionClass && 'random' in QuestionClass) {
    question = QuestionClass.random(options)
  } else if (QuestionClass){
    question = new QuestionClass(options)
  }
  return question
}

function newOptionsSet (id: string) {
  const optionsSpec = (getClass(id))?.optionsSpec || []
  return new OptionsSet(optionsSpec)
}

function hasOptions (id: string) {
  const cl = getClass(id)
  if (cl===null) return false
  return !!(cl.optionsSpec && cl.optionsSpec.length > 0)
}

export { topicList, getClass, newQuestion, getTopics, getTitle, newOptionsSet, getCommandWord, hasOptions }
