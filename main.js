import { TrainingDataSource } from "./src/datasources/trainingImages.js";
import { TrainingVideoDataSource } from "./src/datasources/trainingVideos.js";
import { WebcamDataSource } from "./src/datasources/webcam.js";
import { mirrorImage } from "./src/imageUtils.js";
import { classes, HandPoseModel } from "./src/models/handPose.js";

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

const sourceSelection = document.getElementById('sourceSelection')
sourceSelection.addEventListener('change', onSourceChanged)

START_STOP_BUTTON.addEventListener("click", toggleVideo);

let useCV = true

/**
 * @type {WebcamDataSource | TrainingDataSource | null}
 */
let imageSource = null

const model = new HandPoseModel()
const loadedPromise = model.load();

imageSource = createImageSourceByType(sourceSelection.value)

async function onSourceChanged(event) {
  // stop the previous one first
  await stop()
  imageSource = createImageSourceByType(event.target.value)
}

function onUseCVChanged(event) {
  useCV = !!event.target.checked
}

async function processImage(img, width = 200, height = 200) {
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

async function toggleVideo() {
  // Little jank
  const isStarted = START_STOP_BUTTON.innerText == "Stop";
  if (isStarted) {
    await stop();
  } else {
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
  if (type === 'trainingImages') {
    source = new TrainingDataSource(60, 'asl_alphabet_train', classes)
  } else if (type === 'trainingVideos') {
    source = new TrainingVideoDataSource(60, 'asl_low_quality_videos', classes)
  } else {
    // Default to webcam
    source = new WebcamDataSource(30)
  }
  source.on('frameReady', async function onFrameReady(imageData, width, height) {
    await imageSource.pause()
    inputCtx.canvas.width = width
    inputCtx.canvas.height = height
    inputCtx.drawImage(imageData, 0, 0)
    await processImage(imageData, width, height)
    const result = await model.predict(tfCanvas, ctx)
    predictions.innerHTML = result ? result : "No predictions"
    await imageSource.resume()
  })
  return source
}