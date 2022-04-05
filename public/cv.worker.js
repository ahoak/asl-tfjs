

/**
 *  Here we will check from time to time if we can access the OpenCV
 *  functions. We will return in a callback if it's been resolved
 *  well (true) or if there has been a timeout (false).
 */
 function waitForOpencv(callbackFn, waitTimeMs = 30000, stepTimeMs = 100) {
  if (cv.Mat) callbackFn(true)

  let timeSpentMs = 0
  const interval = setInterval(() => {
    const limitReached = timeSpentMs > waitTimeMs
    if (cv.Mat || limitReached) {
      clearInterval(interval)
      return callbackFn(!limitReached)
    } else {
      timeSpentMs += stepTimeMs
    }
  }, stepTimeMs)
}

/**
* With OpenCV we have to work with the images as cv.Mat (matrices),
* so you'll have to transform the ImageData to it.
*/
function imageProcessing({ msg, payload }) {
  const img = cv.matFromImageData(payload)
       let result = new cv.Mat()
  cv.cvtColor(img, result, cv.COLOR_BGR2RGB)

  const bwImage = imageDataFromMat(result) 
  postMessage({ msg, payload: bwImage })
}

function imagePostProcessing({ msg, payload }) {
  const img = cv.matFromImageData(payload)
   
  // console.log("img", img)
  let result = new cv.Mat()
  cv.flip(img, result, 1)
  // let result2 = new cv.Mat()
  // // This converts the image to a greyscale.
  // // cv.cvtColor(img, result, cv.COLOR_BGR2GRAY)
  cv.cvtColor(result, result, cv.COLOR_BGR2RGB)

  const bwImage = imageDataFromMat(result) 
  postMessage({ msg, payload: bwImage })
}

function drawRegion({ msg, payload }){
  const center = payload.center
  const dimensions = payload.dimensions
  const destDimensions = payload.destDimensions
  // TODO: Calculate max/min extents instead    

  const image = payload.image
  const startX = (center[0]) - 130
  const startY = (center[1]) - 200
  const endX = (center[0]) + 130
  const endY = (center[1]) + 200
  const thickness = 2
  const img = cv.matFromImageData(image)
  const x1 = (startX/ dimensions.width) * destDimensions.width
  const y1 = (startY / dimensions.height) * destDimensions.height
  const x2 = (endX / dimensions.width) * destDimensions.width
  const y2 = (endY / dimensions.height)  * destDimensions.height
  const pt1 = new cv.Point(x1, y1)
  const pt2 =  new cv.Point(x2, y2)
  let color = new cv.Scalar(255, 255, 255, 255);

  cv.rectangle(img,pt1,pt2,  color, thickness)
  const res = edgeDetection(img)

  const reformatedImg = imageDataFromMat(res) 

  postMessage({ msg, payload: {image: reformatedImg, coords:[x1, y1, x2, y2] } })
  
    
}

function edgeDetection(mat){
  const minValue = 70
  let dst3 = new cv.Mat();
  cv.cvtColor(mat,dst3, cv.COLOR_BGR2GRAY)
  let dst = new cv.Mat();
  let dst2 = new cv.Mat();
  let dst4 = new cv.Mat();

  let ksize = new cv.Size(5, 5);
  cv.GaussianBlur(dst3,dst, ksize,2)
  cv.adaptiveThreshold(dst,dst2,255,cv.ADAPTIVE_THRESH_GAUSSIAN_C,cv.THRESH_BINARY_INV,11,2)
  cv.threshold(dst2,dst4, minValue, 255,cv.THRESH_BINARY | cv.THRESH_OTSU)
  return dst4
}


// /**
//  * This function converts again from cv.Mat to ImageData
//  */

function imageDataFromMat(mat) {

  if(!(mat instanceof cv.Mat)) {
    throw new Error('not a valid opencv Mat instance');
  }

  if(mat.rows == 0 || mat.cols == 0) {
    return null;
  }

  // convert the mat type to cv.CV_8U
  const img = new cv.Mat();
  const depth = mat.type() % 8;
  const scale = depth <= cv.CV_8S? 1.0 : (depth <= cv.CV_32S? 1.0/256.0 : 255.0);
  const shift =  0.0;
  mat.convertTo(img, cv.CV_8U, scale, shift);

  // convert the img type to cv.CV_8UC4
  switch (img.type()) {
      case cv.CV_8UC1:
          cv.cvtColor(img, img, cv.COLOR_GRAY2RGBA);
          break;
      case cv.CV_8UC3:
          cv.cvtColor(img, img, cv.COLOR_RGB2RGBA);
          break;
      case cv.CV_8UC4:
          break;
      default:
          throw new Error('Bad number of channels (Source image must have 1, 3 or 4 channels)');
          // return;
  }
  const clampedArray = new ImageData(new Uint8ClampedArray(img.data), img.cols, img.rows);
  img.delete();
  return clampedArray;
}



/**
 * This exists to capture all the events that are thrown out of the worker
 * into the worker. Without this, there would be no communication possible
 * with the project.
 */
onmessage = function (e) {
  switch (e.data.msg) {
    case 'load': {
      // Import Webassembly script
      self.importScripts('./opencv.js ')
      waitForOpencv(function (success) {
        if (success) postMessage({ msg: e.data?.msg ?? '' })
        else throw new Error('Error on loading OpenCV')
      })
      break
    }
    case 'imageProcessing':
      return imageProcessing(e.data)
      case 'drawRegion':
          return drawRegion(e.data)
    default:
      break
  }
}