import cv from "./services/cv.js";

/**
 * Loads the instance of openCV
 */
const loadCV = (() => {
	let loadPromise = null
	return async () => {
		if (loadPromise === null) {
		  	console.log("loading cv...");
			loadPromise = cv.load()
			await loadPromise
			console.log("done loading cv");
		} 
		return loadPromise
	}
})()

/**
 * 
 * @param {*} sourceCanvas 
 * @param {*} targetCanvas 
 * @param {*} useCV 
 */
export async function mirrorImage(sourceCanvas, targetCanvas, useCV) {
	if (useCV) {
		await loadCV()

		const image = sourceCanvas.getImageData(0, 0, sourceCanvas.canvas.width, sourceCanvas.canvas.height);

		const processedImage = await cv.imageProcessing(image);
		targetCanvas.putImageData(processedImage.data.payload, 0, 0);
	} else {
		// move to x + img's width
		targetCanvas.translate(sourceCanvas.canvas.width, 0);

		// scaleX by -1; this "trick" flips horizontally
		targetCanvas.scale(-1, 1);

		// draw the img
		// no need for x,y since we've already translated
		targetCanvas.drawImage(sourceCanvas.canvas, 0, 0);

		// always clean up -- reset transformations to default
		targetCanvas.setTransform(1, 0, 0, 1, 0, 0);
	}
}