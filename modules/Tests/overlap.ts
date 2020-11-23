import { repelElements } from "../utilities.js"

document.getElementById("button")?.addEventListener("click", () => {
  const elem1 = document.getElementsByClassName("inner")[0] as HTMLElement
  const elem2 = document.getElementsByClassName("inner")[1] as HTMLElement
  repelElements(elem1,elem2)
})