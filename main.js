import QuestionSet from 'QuestionSet'

// TODO:
//  - QuestionSet - refactor into more classes? E.g. options window
//  - Import existing question types (G - graphic, T - text
//    - G angles
//    - G area
//    - T equation of a line

document.addEventListener('DOMContentLoaded', () => {
  const qs = new QuestionSet()
  qs.appendTo(document.body)
  qs.chooseTopics()
})
