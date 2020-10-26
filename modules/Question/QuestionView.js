import Point from "Utilities/Point";

export default class QuestionView {
  constructor(question,width,height,rotation) {
    this.question = question;
    this.width = width;
    this.height = height;
    this.answered = false;
    this.rotation = rotation;
    this.success = true;
    this.labels = [];
  }

  /* * * Abstract methods   * * */
  /**/                        /**/
  /**/  get allpoints () {    /**/
  /**/      return [];        /**/
  /**/  }                     /**/
  /**/                        /**/
  /*    drawIn(canvas) {}       */
  /**/                        /**/
  /* * * * * * * * * * * * * *  */
  showAnswer() {
    if (this.answered) return; //nothing to do
    this.labels.forEach( l => {
      l.text = l.texta;
      l.style = l.stylea;
    });
    return this.answered = true;
  }

  hideAnswer() {
    if (!this.answered) return; //nothing to do
    this.labels.forEach( l => {
      l.text = l.textq;
      l.style = l.styleq;
    });
    return this.answered = false;
  }

  toggleAnswer() {
    if (this.answered) return this.hideAnswer();
    else return this.showAnswer();
  }

  scale(sf) {
    this.allpoints.forEach(function(p){
      p.scale(sf);
    });
  }

  rotate(angle) {
    this.allpoints.forEach(function(p){
      p.rotate(angle);
    });
    return angle;
  }

  translate(x,y) {
    this.allpoints.forEach(function(p){
      p.translate(x,y);
    });
  }

  randomRotate() {
    var angle=2*Math.PI*Math.random();
    this.rotate(angle);
    return angle;
  }

  scaleToFit(width,height,margin) {
    let topleft = Point.min(this.allpoints);
    let bottomright = Point.max(this.allpoints);
    let t_width = bottomright.x - topleft.x;
    let t_height = bottomright.y - topleft.y;
    this.scale(Math.min((width-margin)/t_width,(height-margin)/t_height));

    // centre
    topleft = Point.min(this.allpoints);
    bottomright = Point.max(this.allpoints);
    const center = Point.mean([topleft,bottomright]);
    this.translate(width/2-center.x,height/2-center.y); //centre
  }

  drawLabelsCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    this.labels.forEach(function(l){
      ctx.font = QuestionView.styles.get(l.style).font;
      ctx.fillStyle = QuestionView.styles.get(l.style).colour;
      ctx.textAlign = QuestionView.styles.get(l.style).align;
      ctx.textBaseline = QuestionView.styles.get(l.style).baseline;
      ctx.fillText(l.text,l.pos.x,l.pos.y);
    });
  }

  drawLabelsHtml(canvas) {
    const container = canvas.parentNode;
    this.labels.forEach(function(l){
      const label = document.createElement("div");
      const innerlabel = document.createElement("div");
      label.classList.add("label");
      label.classList += " " + l.style;
      label.style.left = l.pos.x + "px";
      label.style.top = l.pos.y + "px";

      katex.render(l.text, innerlabel);
      label.appendChild(innerlabel);
      container.appendChild(label);

      //remove space if the inner label is too big
      if (innerlabel.offsetWidth/innerlabel.offsetHeight > 2) {
        const newlabeltext = l.text.replace(/\+/,"\\!+\\!").replace(/-/,"\\!-\\!");
        katex.render(newlabeltext,innerlabel);
      }

      //position correctly - this could def be optimised - lots of back-and-forth
      const lwidth = label.offsetWidth;
      const lheight = label.offsetHeight;
      label.style.left = (l.pos.x - lwidth/2) + "px";
      label.style.top = (l.pos.y - lheight/2) + "px";

      if (l.pos.x < canvas.width/2-5 && l.pos.x+lwidth/2 > canvas.width/2) {
        label.style.left = (canvas.width/2 - lwidth - 3) + "px";
      }
      if (l.pos.x > canvas.width/2+5 && l.pos.x-lwidth/2 < canvas.width/2) {
        label.style.left = (canvas.width/2 + 3) + "px";
      }

      //nudge away from center
      //if (l.pos.x < canvas.width/2 && // starts on left, ends on right
      //label.offsetLeft+label.offsetWidth > canvas.width/2
      //) {
      //label.style.left = (canvas.width/2 - label.offsetWidth - 5) + "px";
      //label.style.transform="translateX(0) translateY(-50%)";
      //}
    });
  }
}

QuestionView.styles = new Map([
  ["normal" , {font: "16px Arial", colour: "Black", align: "center", baseline: "middle"}],
  ["answer" , {font: "16px Arial", colour: "Red", align: "center", baseline: "middle"}],
  ["extra-answer", {font: "16px Arial", colour: "Red", align: "left", baseline: "bottom"}],
  ["extra-info", {font: "16px Arial", colour: "Black", align: "left", baseline: "bottom"}]
]);
