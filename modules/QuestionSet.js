import RSlider from 'vendor/rslider'
import OptionsSet from 'OptionsSet'
import * as TopicChooser from 'TopicChooser'
import Modal from 'vendor/Tingle'
import { randElem, createElem, hasAncestorClass, boolObjectToArray } from 'Utilities'

window.SHOW_DIFFICULTY = false // for debugging questions

/* TODO list:
 * Additional question block - probably in main.js
 * Zoom/scale buttons
 *    Need to change css grid spacing with JS on generation
 * Display options
 */

// Make an overlay to capture any clicks outside boxes, if necessary
createElem('div', 'overlay hidden', document.body).addEventListener('click', hideAllActions)

export default class QuestionSet {
  constructor (qNumber) {
    this.questions = [] // list of questions and the DOM element they're rendered in
    this.topics = [] // list of topics which have been selected for this set
    this.optionsSets = [] // list of OptionsSet objects carrying options for topics with options
    this.qNumber = qNumber || 1 // Question number (passed in by caller, which will keep count)
    this.answered = false // Whether answered or not
    this.commandWord = '' // Something like 'simplify'
    this.useCommandWord = true // Use the command word in the main question, false give command word with each subquestion
    this.n = 8 // Number of questions

    this._build()
  }

  _build () {
    this.outerBox = createElem('div', 'question-outerbox')
    this.headerBox = createElem('div', 'question-headerbox', this.outerBox)
    this.displayBox = createElem('div', 'question-displaybox', this.outerBox)

    this._buildOptionsBox()

    this._buildTopicChooser()
  }

  _buildOptionsBox () {
    const topicSpan = createElem('span', null, this.headerBox)
    this.topicChooserButton = createElem('span', 'topic-chooser button', topicSpan)
    this.topicChooserButton.innerHTML = 'Choose topic'
    this.topicChooserButton.addEventListener('click', () => this.chooseTopics())

    const difficultySpan = createElem('span', null, this.headerBox)
    difficultySpan.append('Difficulty: ')
    const difficultySliderOuter = createElem('span', 'slider-outer', difficultySpan)
    this.difficultySliderElement = createElem('input', null, difficultySliderOuter)

    const nSpan = createElem('span', null, this.headerBox)
    nSpan.append('Number of questions: ')
    const nQuestionsInput = createElem('input', 'n-questions', nSpan)
    nQuestionsInput.type = 'number'
    nQuestionsInput.min = '1'
    nQuestionsInput.value = '8'
    nQuestionsInput.addEventListener('change', () => {
      this.n = parseInt(nQuestionsInput.value)
    })

    this.generateButton = createElem('button', 'generate-button button', this.headerBox)
    this.generateButton.disabled = true
    this.generateButton.innerHTML = 'Generate!'
    this.generateButton.addEventListener('click', () => this.generateAll())
  }

  _initSlider () {
    this.difficultySlider = new RSlider({
      target: this.difficultySliderElement,
      values: { min: 1, max: 10 },
      range: true,
      set: [2, 6],
      step: 1,
      tooltip: false,
      scale: true,
      labels: true
    })
  }

  _buildTopicChooser () {
    // build an OptionsSet object for the topics
    const topics = TopicChooser.getTopics()
    const optionsSpec = []
    topics.forEach(topic => {
      optionsSpec.push({
        title: topic.title,
        id: topic.id,
        type: 'bool',
        default: false,
        swapLabel: true
      })
    })
    this.topicsOptions = new OptionsSet(optionsSpec)

    // Build a modal dialog to put them in
    this.topicsModal = new Modal({
      footer: true,
      stickyFooter: false,
      closeMethods: ['overlay', 'escape'],
      closeLabel: 'Close',
      onClose: () => {
        this.updateTopics()
      }
    })

    this.topicsModal.addFooterBtn(
      'OK',
      'button modal-button',
      () => {
        this.topicsModal.close()
      })

    // render options into modal
    this.topicsOptions.renderIn(this.topicsModal.modalBoxContent)

    // Add further options buttons
    // This feels a bit iffy - depends too much on implementation of OptionsSet
    const lis = Array.from(this.topicsModal.modalBoxContent.getElementsByTagName('li'))
    lis.forEach(li => {
      const topicId = li.dataset.optionId
      if (TopicChooser.hasOptions(topicId)) {
        const optionsButton = createElem('div', 'icon-button extra-options-button', li)
        this._buildTopicOptions(li.dataset.optionId, optionsButton)
      }
    })
  }

  _buildTopicOptions (topicId, optionsButton) {
    // Build the UI and OptionsSet object linked to topicId. Pass in a button which should launch it

    // Make the OptionsSet object and store a reference to it
    // Only store if object is created?
    const optionsSet = TopicChooser.newOptionsSet(topicId)
    this.optionsSets[topicId] = optionsSet

    // Make a modal dialog for it
    const modal = new Modal({
      footer: true,
      stickyFooter: false,
      closeMethods: ['overlay', 'escape'],
      closeLabel: 'Close'
    })

    modal.addFooterBtn(
      'OK',
      'button modal-button',
      () => {
        modal.close()
      })

    optionsSet.renderIn(modal.modalBoxContent)

    // link the modal to the button
    optionsButton.addEventListener('click', () => {
      modal.open()
    })
  }

  chooseTopics () {
    this.topicsModal.open()
  }

  updateTopics () {
    // topic choices are stored in this.topicsOptions automatically
    // pull this into this.topics and update button displays

    // have object with boolean properties. Just want the true values
    const topics = boolObjectToArray(this.topicsOptions.options)
    this.topics = topics

    let text

    if (topics.length === 0) {
      text = 'Choose topic' // nothing selected
      this.generateButton.disabled = true
    } else {
      const id = topics[0] // first item selected
      text = TopicChooser.getTitle(id)
      this.generateButton.disabled = false
    }

    if (topics.length > 1) { // any additional show as e.g. ' + 1
      text += ' +' + (topics.length - 1)
    }

    this.topicChooserButton.innerHTML = text
  }

  setCommandWord () {
    // first set to first topic command word
    let commandWord = TopicChooser.getClass(this.topics[0]).commandWord
    let useCommandWord = true // true if shared command word

    // cycle through rest of topics, reset command word if they don't match
    for (let i = 1; i < this.topics.length; i++) {
      if (TopicChooser.getClass(this.topics[i]).commandWord !== commandWord) {
        commandWord = ''
        useCommandWord = false
        break
      }
    }

    this.commandWord = commandWord
    this.useCommandWord = useCommandWord
  }

  generateAll () {
    // Clear display-box and question list
    this.displayBox.innerHTML = ''
    this.questions = []
    this.setCommandWord()

    // Set number and main command word
    const mainq = createElem('p', 'katex mainq', this.displayBox)
    mainq.innerHTML = `${this.qNumber}. ${this.commandWord}` // TODO: get command word from questions

    // Make show answers button
    this.answerButton = createElem('p', 'button show-answers', this.displayBox)
    this.answerButton.addEventListener('click', () => {
      this.toggleAnswers()
    })
    this.answerButton.innerHTML = 'Show answers'

    // Get difficulty from slider
    const mindiff = this.difficultySlider.getValueL()
    const maxdiff = this.difficultySlider.getValueR()

    for (let i = 0; i < this.n; i++) {
      // Make question container DOM element
      const container = createElem('div', 'question-container', this.displayBox)
      container.dataset.question_index = i // not sure this is actually needed

      // Add container link to object in questions list
      if (!this.questions[i]) this.questions[i] = {}
      this.questions[i].container = container

      // choose a difficulty and generate
      const difficulty = mindiff + Math.floor(i * (maxdiff - mindiff + 1) / this.n)

      // choose a topic id
      this.generate(i, difficulty)
    }
  }

  generate (i, difficulty, topicId) {
    // TODO get options properly
    topicId = topicId || randElem(this.topics)

    const options = {
      label: '',
      difficulty: difficulty,
      useCommandWord: false
    }

    if (this.optionsSets[topicId]) {
      Object.assign(options, this.optionsSets[topicId].options)
    }

    // choose a question
    const question = TopicChooser.newQuestion(topicId, options)

    // set some more data in the questions[] list
    if (!this.questions[i]) throw new Error('question not made')
    this.questions[i].question = question
    this.questions[i].topicId = topicId

    // Render into the container
    const container = this.questions[i].container
    container.innerHTML = '' // clear in case of refresh

    // make and render question number and command word (if needed)
    let qNumberText = questionLetter(i) + ')'
    if (window.SHOW_DIFFICULTY) {qNumberText += options.difficulty}
    if (!this.useCommandWord) {
      qNumberText += ' ' + TopicChooser.getCommandWord(topicId)
      container.classList.add('individual-command-word')
    } else {
      container.classList.remove('individual-command-word')
    }

    const questionNumberDiv = createElem('div', 'question-number katex', container)
    questionNumberDiv.innerHTML = qNumberText

    // render the question
    container.appendChild(question.getDOM()) // this is a .question-div element
    question.render() // some questions need rendering after attaching to DOM

    // make hidden actions menu
    const actions = createElem('div', 'question-actions hidden', container)
    const refreshIcon = createElem('div', 'question-refresh icon-button', actions)
    const answerIcon = createElem('div', 'question-answer icon-button', actions)

    answerIcon.addEventListener('click', () => {
      question.toggleAnswer()
      hideAllActions()
    })

    refreshIcon.addEventListener('click', () => {
      this.generate(i, difficulty)
      hideAllActions()
    })

    // Q: is this best way - or an event listener on the whole displayBox?
    container.addEventListener('click', e => {
      if (!hasAncestorClass(e.target, 'question-actions')) {
        // only do this if it didn't originate in action button
        this.showQuestionActions(e, i)
      }
    })
  }

  toggleAnswers () {
    if (this.answered) {
      this.questions.forEach(q => {
        q.question.hideAnswer()
        this.answered = false
        this.answerButton.innerHTML = 'Show answers'
      })
    } else {
      this.questions.forEach(q => {
        q.question.showAnswer()
        this.answered = true
        this.answerButton.innerHTML = 'Hide answers'
      })
    }
  }

  showQuestionActions (event, questionIndex) {
    // first hide any other actions
    hideAllActions()

    const container = this.questions[questionIndex].container
    const actions = container.querySelector('.question-actions')

    // Unhide the overlay
    document.querySelector('.overlay').classList.remove('hidden')
    actions.classList.remove('hidden')
    actions.style.left = (container.offsetWidth / 2 - actions.offsetWidth / 2) + 'px'
    actions.style.top = (container.offsetHeight / 2 - actions.offsetHeight / 2) + 'px'
  }

  appendTo (elem) {
    elem.appendChild(this.outerBox)
    this._initSlider() // has to be in document's DOM to work properly
  }

  appendBefore (parent, elem) {
    parent.insertBefore(this.outerBox, elem)
    this._initSlider() // has to be in document's DOM to work properly
  }
}

function questionLetter (i) {
  // return a question number. e.g. qNumber(0)="a".
  // After letters, we get on to greek
  var letter =
        i < 26 ? String.fromCharCode(0x61 + i)
          : i < 52 ? String.fromCharCode(0x41 + i - 26)
            : String.fromCharCode(0x3B1 + i - 52)
  return letter
}

function hideAllActions (e) {
  // hide all question actions
  document.querySelectorAll('.question-actions').forEach(el => {
    el.classList.add('hidden')
  })
  document.querySelector('.overlay').classList.add('hidden')
}
