import cv from "./src/services/cv.js";

const VIDEO = document.getElementById("webcam");
const CV_CANVAS = document.getElementById("cv_img");
const cvCtx = CV_CANVAS.getContext("2d");

const ENABLE_CAM_BUTTON = document.getElementById("enableCam");
const predictions = document.querySelector(".predictions");
const canvas = document.getElementById("c_img");
const tfCanvas = document.getElementById("ts_processed_img");
const ctx = canvas.getContext("2d");
const output = document.getElementById("output");
let model = undefined;
let hands = undefined;
// ADD MODEL URL HERE
const MODEL_JSON_URL = "assets/model.json";
let stream = null;
let stopPredictionLoop = null;
const INPUT_HEIGHT = 64;
const INPUT_WIDTH = 64;
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
        const tensor = tf.tensor1d(flattened).expandDims(0);
        const prediction = model.predict(tensor);
        const index = prediction.dataSync()[0];
        // console.log("prediction",   value)
        // ---CHECK RESULTS----
        const rounded_result = Math.floor(index);

        if (rounded_result > 0 && rounded_result < classes.length) {
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

loadModel();

async function startPredictionLoop() {
  let done = false;
  async function predict() {
    if (!done) {
      await captureHands();
      setTimeout(predict, 100);
    }
  }
  setTimeout(predict, 100);
  return () => {
    done = true;
  };
}

async function processImage(img) {
  const imageWidth = img.width || 200;
  const imageHeight = img.height || 200;
  console.log("imageWidth,imageHeight ", imageWidth, imageHeight);

  cvCtx.save();
  cvCtx.clearRect(0, 0, 200, 200);
  cvCtx.drawImage(img, 0, 0, 200, 200);
  const image = cvCtx.getImageData(0, 0, 200, 200);

  const processedImage = await cv.imageProcessing(image);
  const ct = tfCanvas.getContext("2d");
  ct.putImageData(processedImage.data.payload, 0, 0);
}

async function captureHands() {
  processImage(VIDEO);
  await hands.send({ image: tfCanvas });
}

function stopVideo() {
  if (stopPredictionLoop) {
    stopPredictionLoop();
    stopPredictionLoop = null;
  }
  if (stream) {
    for (const track of stream.getTracks()) {
      track.stop();
    }
    stream = null;
    ENABLE_CAM_BUTTON.innerText = "Start";
  }
}

async function stop() {
  stopVideo();
}

ENABLE_CAM_BUTTON.addEventListener("click", async () => {
  // Little jank
  const isStarted = ENABLE_CAM_BUTTON.innerText == "Stop";
  if (isStarted) {
    stop();
  } else {
    start();
  }
});

async function start() {
  stopVideo();
  await startVideo();
  stopPredictionLoop = await startPredictionLoop();
}
/**
 * Check if getUserMedia is supported for webcam access.
 **/
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// /**
//  * Enable the webcam with video constraints applied.
//  **/
async function startVideo() {
  console.log("enabling webcam");
  if (hasGetUserMedia()) {
    // getUsermedia parameters.
    const constraints = {
      video: true,
      width: 200,
      height: 200,
    };
    ENABLE_CAM_BUTTON.innerText = "Stop";
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    VIDEO.srcObject = stream;
    VIDEO.play();
  } else {
    console.warn("getUserMedia() is not supported by your browser");
  }
}
