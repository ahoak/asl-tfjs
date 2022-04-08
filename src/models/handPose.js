
// ADD MODEL URL HERE
const MODEL_JSON_URL = "assets/model.json";
export const classes = [
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

export class HandPoseModel {
	#hands = null
	#model = null

	/**
	 * @type {Function<string | null>}
	 */
	#predictionCallback = null

	/**
	 * Canvas used to draw debugging info
	 * @type {CanvasRenderingContext2D | null}
	 */
	#debugContext = null
 
	/**
	 * 
	 * @param {[string[], Uint8Array[]]} labeledData 
	 */
	async train(labeledData) {
		const trainingData = await loadTrainingData()
		this.#model.fit({
			batchSize: 32,
			epochs: 100,
			verbose: 0,
			validationSplit: 0.8,
			callbacks: {
				onEpochBegin: async (epoch) => {
					let newLr = 0.001
					if (epoch > 20 && epoch < 50) {
						newLr = newLr * tf.math.exp(-0.1)
					} else if (epoch > 50) {
						newLr = newLr * tf.math.exp(-0.01)
					}
					
					this.#model.optimizer.setLearningRate(newLr)
				}
			}
		})
		

		// model.fit(
		// 	train_inputs,
		// 	train_outputs,
		// 	epochs = 100,
		// 	batch_size = 32,
		// 	verbose = 0,
		// 	validation_data = (test_inputs, test_outputs),
		// 	callbacks = callbacks
		// )


	}

	async load(empty = false) {
		// Load the model.json and binary files you hosted. Note this is
		// an asynchronous operation so you use the await keyword
		if (!this.#model) {
			if (empty) {
				this.#model = tf.sequential();
				this.#model.add(tf.layers.inputLayer({ inputShape: [63] }))
				this.#model.add(tf.layers.dense({ units: 512, activation: 'relu' }))
				this.#model.add(tf.layers.dense({ units: 256, activation: 'relu' }))
				this.#model.add(tf.layers.dense({ units: 128, activation: 'relu' }))
				this.#model.add(tf.layers.dense({ units: 1 }))

				const optimizer = tf.train.adam(0.001)
				this.#model.compile({ optimizer: optimizer, loss: 'meanSquaredError' }); 
			} else {
				console.log("getting model");
				this.#model = await tf.loadLayersModel(MODEL_JSON_URL);
				console.log("loaded model");
			}
	}
	if(!this.#hands) {
		console.log("loading hand model...");

		this.#hands = new Hands({
			locateFile: (file) => {
				return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
			},
		});
		this.#hands.setOptions({
			maxNumHands: 2,
			modelComplexity: 1,
			minDetectionConfidence: 0.5,
			minTrackingConfidence: 0.5,
		});
		this.#hands.onResults(this.#onResults);
		console.log("hand model loaded");
	}
}

	async predict(imageSource, debugContext) {
	this.#debugContext = debugContext
	return new Promise((resolve) => {
		this.#predictionCallback = resolve
		this.#hands.send({ image: imageSource })
	})
}

#onResults = async (results) => {
	if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
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
				const prediction = this.#model.predict(tensor);
				const index = prediction.dataSync()[0];
				// console.log("prediction",   value)
				// ---CHECK RESULTS----
				const rounded_result = Math.round(index);

				if (rounded_result >= 0 && rounded_result < classes.length) {
					console.log("rounded_result", classes[rounded_result]);
					this.#predictionCallback(classes[rounded_result])
				} else {
					this.#predictionCallback(null)
				}

				tensor.dispose();

				if (this.#debugContext) {
					this.#debugContext.clearRect(0, 0, this.#debugContext.canvas.width, this.#debugContext.canvas.height);

					drawConnectors(this.#debugContext, landmarks, HAND_CONNECTIONS, {
						color: "#00FF00",
						lineWidth: 5,
					});
					drawLandmarks(this.#debugContext, landmarks, { color: "#FF0000", lineWidth: 2 });
				}

				// just one for now
				break
			} else {
				this.#predictionCallback(null)
			}
		}
	} else {
		this.#predictionCallback(null)
	}
}
}

function normalize(arr/*: any[]*/) {
	const max = arr.reduce((maxSoFar, item) => Math.max(maxSoFar, Math.abs(item)), arr[0])
	return arr.map(n => n / max)
}
