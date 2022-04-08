

import cv from './src/services/cv.js'
  const sample_img = document.getElementById("sample_img")
 const VIDEO = document.getElementById('webcam');
 const CV_CANVAS = document.getElementById('cv_img')
 const cvCtx = CV_CANVAS.getContext('2d');
 const CROPPED_CANVAS = document.getElementById('cropped_img')
 const croppedCtx = CROPPED_CANVAS.getContext('2d');
 const ENABLE_CAM_BUTTON = document.getElementById('enableCam');
 const predictions = document.querySelector('.predictions');
 const canvas = document.getElementById('c_img');
 const tfCanvas = document.getElementById('ts_processed_img')
 const ctx = canvas.getContext('2d');
 const output = document.getElementById('output')
 let model = undefined
 let hands = undefined
 const MODEL_JSON_URL = 'assets/model.json'
 let stream = null;
 let stopPredictionLoop = null;
 const INPUT_HEIGHT = 64
 const INPUT_WIDTH = 64
 let cvLoaded = false
const classes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V',
'W', 'X', 'Y', 'Z', 'del', 'nothing', 'space']

 async function loadModel() {
    // Load the model.json and binary files you hosted. Note this is 
    // an asynchronous operation so you use the await keyword
    if (model === undefined) {
      console.log("getting model")
      model = await tf.loadLayersModel(MODEL_JSON_URL);
      console.log("loaded model")
    }
    if(!hands) {
      console.log("loading hand model...")
 
       hands = new Hands({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }});
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      hands.onResults(onResults);
      console.log("hand model loaded")
    }
    console.log("loading cv...")
     // Load the cv model
     await cv.load()
     cvLoaded = true
     console.log("done")
     await hands.send({image: sample_img});


  }

  // function draw_region(image, center){
  //   const startX = center[0] - 130
  //   const startY = center[1] - 130
  //   const endX = center[0] + 130
  //   const endY = center[1] + 130
  //   const color = (0, 0, 255)
  //   const thickness = 2
  //   cropped_image = cv2.rectangle(image, (startX, startY),
  //       (endX, endY), color, thickness)
  //   return cropped_image[startY:endY, startX:endX]

  // }
 

  async function processImage(img){
    const imageWidth = img.width || 500
    const imageHeight = img.height || 400

    cvCtx.save();
    cvCtx.clearRect(0, 0, imageWidth, imageHeight);
    cvCtx.drawImage(img, 0, 0,  imageWidth, imageHeight)
    const image = cvCtx.getImageData(0, 0,  imageWidth, imageHeight)

    const processedImage = await cv.imageProcessing(image)
    const ct = tfCanvas.getContext('2d')
    ct.putImageData(processedImage.data.payload, ( canvas.width - imageWidth), 0)
  }

  async function drawBoundingBox(img, center, dimensions){
    const imageWidth = img.width || 200
    const imageHeight = img.height || 200

    cvCtx.save();
    cvCtx.clearRect(0, 0, imageWidth, imageHeight);
    cvCtx.drawImage(img, 0, 0,   imageWidth, imageHeight, 0 ,0, 200, 200)

    const image = cvCtx.getImageData(0, 0,  200, 200)

    const cImage = await cv.drawRegion({image, center, dimensions, destDimensions: {width: 200, height: 200}})
    // ctx.putImageData(image, 0, 0)
    
    croppedCtx.putImageData(cImage.data.payload.image, 0,0 )
    // croppedCtx.clearRect(0, 0, CROPPED_CANVAS.width, CROPPED_CANVAS.height);
    predict(image, cImage.data.payload.coords)
  

  }
  async function predict(img, coords){
    const [x1, y1, x2, y2] = coords
    const answer =  tf.tidy(function() {
     
      // Grab pixels from current VIDEO frame.
      let imageTensor = tf.browser.fromPixels(img).expandDims(0)
      const offset = tf.scalar(255.0);
      const normalized = imageTensor.div(offset)
      normalized.print()
      // let resizedTensorFrame = tf.image.cropAndResize(normalized, tf.tensor2d([y1/ img.height, x1/ img.width, y2/ img.height, x2/ img.width], [1,4]), [0], [img.height, img.width,])
      // let blurredImg = tf.squeeze(resizedTensorFrame)
      let rs = tf.image.resizeBilinear(
        normalized, 
        [64, 64],
        true
    )
    let blurredImg = tf.squeeze(rs)
  

     

      // // // the scalars needed for conversion of each channel
      // // // per the formula: gray = 0.2989 * R + 0.5870 * G + 0.1140 * B
      const rFactor = tf.scalar(0.2989);
      const gFactor = tf.scalar(0.5870);
      const bFactor = tf.scalar(0.1140);
      // STACKOVERFLOW:: https://stackoverflow.com/questions/50334200/how-to-transform-a-webcam-image-to-grayscale-using-tensorflowjs#:~:text=The%20preferred%20way%20to%20get%20grayscale%20from%20an,%2B%200.5870%20%2A%20G%20%2B%200.1140%20%2A%20B
      // separate out each channel. x.shape[0] and x.shape[1] will give you
      // the correct dimensions regardless of image size
      const r = blurredImg.slice([0,0,0], [blurredImg.shape[0], blurredImg.shape[1], 1]);
      const g = blurredImg.slice([0,0,1], [blurredImg.shape[0], blurredImg.shape[1], 1]);
      const b = blurredImg.slice([0,0,2], [blurredImg.shape[0], blurredImg.shape[1], 1]);
      // add all the tensors together, as they should all be the same dimensions.
      const gray = r.mul(rFactor).add(g.mul(gFactor)).add(b.mul(bFactor));
    
      tf.browser.toPixels(gray, CROPPED_CANVAS);
      const prediction = model.predict(gray.expandDims(0));
      return prediction.squeeze().argMax();
  
    });

    return answer.array().then(function(index){
      console.log(index)
       
      predictions.innerText = index
      output.innerText = classes[index]
      answer.dispose();
    })
  }

   function onResults(results) {
    // console.log("results.multiHandLandmarks", results.image)
    const imageWidth = results.image.width
    const imageHeight = results.image.height
    // ctx.save();
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    // processImage(results.image)
    // ctx.drawImage(
    //     results.image, 0, 0, canvas.width, canvas.height);
    if (results.multiHandLandmarks) {
      let center = []
    
      for (const landmarks of results.multiHandLandmarks) {
        const totalLandmarks = landmarks.length
        if(totalLandmarks > 0) {
          const [x, y]= landmarks.reduce((acc, d)=>{
            acc[0] += d.x
            acc[1] += d.y
      
            return acc
          },[0,0])
          const xMean = x/totalLandmarks
          const yMean = y/totalLandmarks
          // console.log("xMean", xMean, yMean )
          center = [xMean* imageWidth, yMean * imageHeight]
          // console.log("center", center)
          // drawRegion(results.image, center, {height: imageHeight, width: imageWidth})
          
         
          // drawConnectors(ctx, landmarks, HAND_CONNECTIONS,
          //                {color: '#00FF00', lineWidth: 5});
          // drawLandmarks(ctx, landmarks, {color: '#FF0000', lineWidth: 2});
        }
        
      }
      const dimensions = {height: imageHeight, width: imageWidth}
      drawBoundingBox(results.image, center, dimensions)
    }
    ctx.restore();
  }
  loadModel()

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
    }
  }

  async function captureHands(){
     await hands.send({image: VIDEO});
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
   console.log("enabling webcam")
   if (hasGetUserMedia()) {
     ENABLE_CAM_BUTTON.innerText = "Stop";
     stream = await navigator.mediaDevices.getUserMedia({ video: true });
     VIDEO.srcObject = stream;
     VIDEO.play();
 
   } else {
     console.warn('getUserMedia() is not supported by your browser');
   }
 }
 
 
