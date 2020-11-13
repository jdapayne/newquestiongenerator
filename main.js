import QuestionSet from 'QuestionSet'

// TODO:
//  - Import existing question types (G - graphic, T - text
//    - G area

document.addEventListener('DOMContentLoaded', () => {
  const qs = new QuestionSet()
  qs.appendTo(document.body)
  qs.chooseTopics()
})
