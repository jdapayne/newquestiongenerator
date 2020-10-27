import AlgebraicFractionQ from 'AlgebraicFractionQ'
import IntegerAddQ from 'IntegerAdd'
import ArithmagonQ from 'ArithmagonQ'
import TestQ from 'TestQ'
import AddAZero from 'AddAZero'
import EquationOfLine from 'EquationOfLine'
import AnglesFormingQ from 'AnglesFormingQ'

import OptionsSet from 'OptionsSet'

const topicList = [
  {
    id: 'algebraic-fraction',
    title: 'Simplify algebraic fractions',
    class: AlgebraicFractionQ
  },
  {
    id: 'add-a-zero',
    title: 'Multiply by 10 (honest!)',
    class: AddAZero
  },
  {
    id: 'integer-add',
    title: 'Add integers (v simple)',
    class: IntegerAddQ
  },
  {
    id: 'aosl',
    title: 'Angles on a straight line',
    class: AnglesFormingQ
  },
  {
    id: 'equation-of-line',
    title: 'Equation of a line (from two points)',
    class: EquationOfLine
  },
  {
    id: 'arithmagon-add',
    title: 'Arithmagons',
    class: ArithmagonQ
  },
  {
    id: 'test',
    title: 'Test questions',
    class: TestQ
  }
]

function getClass (id) {
  // Return the class given an id of a question

  // Obviously this is an inefficient search, but we don't need massive performance
  for (let i = 0; i < topicList.length; i++) {
    if (topicList[i].id === id) {
      return topicList[i].class
    }
  };

  return null
}

function getTitle (id) {
  // Return title of a given id
  //
  return topicList.find(t => (t.id === id)).title
}

function getCommandWord (id) {
  return getClass(id).commandWord
}

function getTopics () {
  // returns topics with classes stripped out
  return topicList.map(x => ({ id: x.id, title: x.title }))
}

function newQuestion (id, options) {
  // to avoid writing `let q = new (TopicChooser.getClass(id))(options)
  return new (getClass(id))(options)
}

function newOptionsSet (id) {
  const optionsSpec = (getClass(id)).optionsSpec || []
  return new OptionsSet(optionsSpec)
}

function hasOptions (id) {
  return !!(getClass(id).optionsSpec && getClass(id).optionsSpec.length > 0) // weird bool typcasting woo!
}

export { topicList, getClass, newQuestion, getTopics, getTitle, newOptionsSet, getCommandWord, hasOptions }
