

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
     
    // console.log("img", img)
    let result = new cv.Mat()
    cv.flip(img, result, 1)
    // let result2 = new cv.Mat()
    // // This converts the image to a greyscale.
    // // cv.cvtColor(img, result, cv.COLOR_BGR2GRAY)
    // cv.cvtColor(img, result, cv.COLOR_BGR2RGB)

    const bwImage = imageDataFromMat(result) 
    postMessage({ msg, payload: bwImage })
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
      default:
        break
    }
  }