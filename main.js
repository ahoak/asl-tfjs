import { TrainingDataSource } from "./src/datasources/trainingImages.js";
import { TrainingVideoDataSource } from "./src/datasources/trainingVideos.js";
import { WebcamDataSource } from "./src/datasources/webcam.js";
import { mirrorImage } from "./src/imageUtils.js";
import {  HandPoseModel } from "./src/models/handPose.js";
import { config } from "./config"
import { classes } from "./constants.js";
import { insertRow, resetTable, removeTable} from "./src/predictionTable"

import './style.css'

const CV_CANVAS = document.createElement("canvas");
const cvCtx = CV_CANVAS.getContext("2d");

const START_STOP_BUTTON = document.getElementById("startStopBtn");
const predictions = document.querySelector(".predictions");
const canvas = document.getElementById("c_img");
const ctx = canvas.getContext("2d");

const tfCanvas = document.createElement("canvas");
const tfCanvasCtx = tfCanvas.getContext("2d");

const videoInputDisplay = document.getElementById('videoInputDisplay')
const inputCtx = videoInputDisplay.getContext('2d')
const useCVCheckbox = document.getElementById('useCV')
useCVCheckbox.addEventListener('change', onUseCVChanged)

let useCV = !!config.useCV
useCVCheckbox.checked = useCV

const logOutput = !!config.logOutput
removeTable(logOutput)

const sourceSelection = document.getElementById('sourceSelection')
sourceSelection.addEventListener('change', onSourceChanged)

START_STOP_BUTTON.addEventListener("click", toggleVideo);

/**
 * @type {WebcamDataSource | TrainingDataSource | null}
 */
let imageSource = null

const model = new HandPoseModel()
const loadedPromise = model.load();

imageSource = createImageSourceByType(sourceSelection.value)

const loadStartTime = Date.now()
// const trainingData = TrainingDataSource.loadTrainingData('asl_alphabet_train', classes).then((data) => {
//   console.log(`Loading took: ${Date.now() - loadStartTime}`)
//   console.log(data)
// })




// console.log(trainingData)

async function onSourceChanged(event) {
  // stop the previous one first
  await stop()
  imageSource = createImageSourceByType(event.target.value)
}

function onUseCVChanged(event) {
  useCV = !!event.target.checked
}

async function processImage(img, width = 200, height = 200) {
  console.log("processing image")
  if (width > 0 && height > 0) {

    // Scale our canvis to match the incoming image dimensions
    cvCtx.canvas.width = width
    cvCtx.canvas.height = height
    tfCanvasCtx.canvas.width = width
    tfCanvasCtx.canvas.height = height

    cvCtx.clearRect(0, 0, width, height);
    cvCtx.drawImage(img, 0, 0);

    await mirrorImage(cvCtx, tfCanvasCtx, useCV)
  }
}

function handleOutputTableReset(){
  if(logOutput){
    resetTable()
  }
}

async function toggleVideo() {
  console.log("toggleVideo")
  // Little jank
  const isStarted = START_STOP_BUTTON.innerText == "Stop";
  if (isStarted) {
    await stop();
  } else {
    handleOutputTableReset()
    await start();
  }
}

async function stop() {
  await stopVideo();
}

async function start() {
  await loadedPromise
  await stopVideo();
  await startVideo();
}

// /**
//  * Enable the webcam with video constraints applied.
//  **/
async function startVideo() {
  console.log("starting data source");
 
  START_STOP_BUTTON.innerText = "Stop";
  if (imageSource) {
    await imageSource.start()
  }
}

async function stopVideo() {
  console.log("stopping data source");
  if (imageSource) {
    await imageSource.stop()
  }
  START_STOP_BUTTON.innerText = "Start";
}

/**
 * Creates an image source by type
 * @param {"webcam" | "trainingImages" | "trainingVideos"} type 
 */
function createImageSourceByType(type) {
  console.log(`creating ${type} datasource`)
  let source = null
  const letterClasses = config.classes ?? classes
  const dataset = `${config.dataset}`
  if (type === 'trainingImages') {
    const path = config.images.testPath ?? `assets/data/${dataset}`
    
    source = new TrainingDataSource(60, path, letterClasses, config.images.folder, config.images.file)
  } else if (type === 'trainingVideos') {
    const path = config.videos.testPath ?? `assets/data/${dataset}`
    
    source = new TrainingVideoDataSource(60, path, letterClasses)
  } else {
    // Default to webcam
    source = new WebcamDataSource(30)
  }
  source.on('frameReady', async function onFrameReady(imageData, width, height, sign, index) {
    await imageSource.pause()
    inputCtx.canvas.width = width
    inputCtx.canvas.height = height
    inputCtx.drawImage(imageData, 0, 0)
    // await processImage(imageData, width, height)
    const result = await model.predict(videoInputDisplay, ctx)
    const prediction = result ? `${result}` : "No predictions"
    insertRow(sign, prediction, index)
    predictions.innerHTML = result ? `${result}` : "No predictions"
    await imageSource.resume()
  })
  return source
}