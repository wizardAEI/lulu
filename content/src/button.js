
import { save as recordSave, recorderStart, recorderStop } from "./record";

const button = document.createElement("button");
button.classList.add("lulu-floating-button");
// use the svg from chrome extension
const recordSvg = chrome.runtime.getURL("assets/record_fill.svg");
const pauseSvg = chrome.runtime.getURL("assets/pause.svg");
button.style.backgroundImage = `url(${recordSvg})`;
button.showCloseButton = false
document.body.appendChild(button);


let isDragging = false;
let isMoving = false;
let isRecording = false;
let dragStartX;
let dragStartY;

button.addEventListener("mousedown", function (event) {
  isDragging = true;
  dragStartX = event.clientX - button.getBoundingClientRect().right;
  dragStartY = event.clientY - button.getBoundingClientRect().top;
  button.classList.add("dragging");
});

document.addEventListener("mousemove", function (event) {
  if (isDragging) {
    isMoving = true;
    const right = document.body.getBoundingClientRect().right - (event.clientX - dragStartX);
    const top = event.clientY - dragStartY;
    button.style.right = right + "px";
    button.style.top = top + "px";
  }
});

document.addEventListener("mouseup", function () {
  isDragging = false;
  button.classList.remove("dragging");
  setTimeout(() => isMoving = false, 600)
});

// 点击按钮而非拖拽的逻辑
button.addEventListener("click", function () {

  if (button.showCloseButton) {
    const projector = document.querySelector('.lulu-projector')
    projector.classList.remove('active')
    button.showCloseButton = false
    isRecording ? button.style.backgroundImage = `url(${pauseSvg})` : button.style.backgroundImage = `url(${recordSvg})`;
    return
  }

  // 判断是否在拖拽
  if (isMoving) {
    return;
  }
  isRecording = !isRecording;
  if (isRecording) {
    recorderStart()
    button.style.backgroundImage = `url(${pauseSvg})`;
  } else {
    recorderStop()
    recordSave()
    button.style.backgroundImage = `url(${recordSvg})`;
  }
})


export default button