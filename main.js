import QuestionSet from 'QuestionSet'

/* TODO:
 * . Question number in controls
 */

document.addEventListener('DOMContentLoaded', () => {
  const qs = new QuestionSet()
  qs.appendTo(document.body)
  qs.chooseTopics()

  document.getElementById('fullscreen').addEventListener('click', (e) => {
    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => {
        e.target.innerText = 'Full screen'
      })
    } else {
      document.documentElement.requestFullscreen().then(() => {
        e.target.innerText = "Exit full screen"
      })
    }
  })

  let controlsHidden = false
  document.getElementById('hide-controls').addEventListener('click', (e) => {
    if (!controlsHidden) {
      [...document.getElementsByClassName('question-headerbox')].forEach( elem => {
        elem.classList.add('hidden')
      })
      e.target.innerText = 'Show controls'
      controlsHidden = true
    } else {
      [...document.getElementsByClassName('question-headerbox')].forEach( elem => {
        elem.classList.remove('hidden')
      })
      e.target.innerText = 'Hide controls'
      controlsHidden = false
    }
  }) 

})
