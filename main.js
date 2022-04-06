import { TrainingDataSource } from "./src/datasources/training.js";
import { WebcamDataSource } from "./src/datasources/webcam.js";
import cv from "./src/services/cv.js";

const CV_CANVAS = document.createElement("canvas");
const cvCtx = CV_CANVAS.getContext("2d");

const START_STOP_BUTTON = document.getElementById("startStopBtn");
const predictions = document.querySelector(".predictions");
const canvas = document.getElementById("c_img");
const ctx = canvas.getContext("2d");

const tfCanvas = document.createElement("canvas");
const tfCanvasCtx = tfCanvas.getContext("2d");

const output = document.getElementById("output");
const videoInputDisplay = document.getElementById('videoInputDisplay')
const inputCtx = videoInputDisplay.getContext('2d')

const sourceSelection = document.getElementById('sourceSelection')
sourceSelection.addEventListener('change', onSourceChanged)

START_STOP_BUTTON.addEventListener("click", toggleVideo);

/**
 * @type {WebcamDataSource | TrainingDataSource | null}
 */
let imageSource = null

let model = undefined;
let hands = undefined;
// ADD MODEL URL HERE
const MODEL_JSON_URL = "assets/model.json";
let stream = null;
let cvLoaded = false;
const classes = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "del",
  "nothing",
  "space",
];

async function loadModel() {
  // Load the model.json and binary files you hosted. Note this is
  // an asynchronous operation so you use the await keyword
  if (model === undefined) {
    console.log("getting model");
    model = await tf.loadLayersModel(MODEL_JSON_URL);
    console.log("loaded model");
  }
  if (!hands) {
    console.log("loading hand model...");

    hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    hands.onResults(onResults);
    console.log("hand model loaded");
  }
  console.log("loading cv...");
  // Load the cv model
  await cv.load();
  cvLoaded = true;
  console.log("done");
}

async function onResults(results) {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (results.multiHandLandmarks) {
    for (const landmarks of results.multiHandLandmarks) {
      const totalLandmarks = landmarks.length;
      if (totalLandmarks > 0) {
        const flattened = landmarks.reduce((acc, res) => {
          const ptArray = [res.x, res.y, res.z];
          acc = [...acc, ...ptArray];
          return acc;
        }, []);
        const normalized = normalize(flattened)
        const tensor = tf.tensor1d(normalized).expandDims(0);
        const prediction = model.predict(tensor);
        const index = prediction.dataSync()[0];
        // console.log("prediction",   value)
        // ---CHECK RESULTS----
        const rounded_result = Math.round(index);

        if (rounded_result >= 0 && rounded_result < classes.length) {
          console.log("rounded_result", classes[rounded_result]);
          predictions.innerText = `${classes[rounded_result]}`;
        }

        tensor.dispose();
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 5,
        });
        drawLandmarks(ctx, landmarks, { color: "#FF0000", lineWidth: 2 });
      }
    }
  }
  ctx.restore();
}

function normalize(arr/*: any[]*/) {
  const max = arr.reduce((maxSoFar, item) => Math.max(maxSoFar, Math.abs(item)), arr[0])
  return arr.map(n => n / max)
}

const loadedPromise = loadModel();
imageSource = createImageSourceByType(sourceSelection.value)

async function onSourceChanged(event) {
  // stop the previous one first
  await stop()
  imageSource = createImageSourceByType(event.target.value)
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
    
    const image = cvCtx.getImageData(0, 0, width, height);

    const processedImage = await cv.imageProcessing(image);
    tfCanvasCtx.putImageData(processedImage.data.payload, 0, 0);

    // tfCanvasCtx.putImageData(image, 0, 0)
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
 * @param {"webcam" | "training"} type 
 */
function createImageSourceByType(type) {
  console.log(`creating ${type} datasource`)
  const webcam = type === 'webcam'
  const source = webcam ? new WebcamDataSource(15) : new TrainingDataSource(60, 'asl_alphabet_train', classes)
  source.on('frameReady', async function onFrameReady(imageData, width, height) {
    await imageSource.pause()
    inputCtx.canvas.width = width
    inputCtx.canvas.height = height
    inputCtx.drawImage(imageData, 0, 0)
    await processImage(imageData, width, height)
    await hands.send({ image: tfCanvas });
    await imageSource.resume()
  })
  return source
}