import { classes, MODEL_JSON_URL } from "../../constants";

export class HandPoseModel {
  #hands = null;
  #model = null;

  /**
   * @type {Function<string | null>}
   */
  #predictionCallback = null;

  /**
   * Canvas used to draw debugging info
   * @type {CanvasRenderingContext2D | null}
   */
  #debugContext = null;



  async load(empty = false) {
    // Load the model.json and binary files you hosted. Note this is
    // an asynchronous operation so you use the await keyword
    if (!this.#model) {
      console.log("getting model");
      this.#model = await tf.loadLayersModel(MODEL_JSON_URL);
      console.log("loaded model");
    }
    if (!this.#hands) {
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
    this.#debugContext = debugContext;
    return new Promise((resolve) => {
      this.#predictionCallback = resolve;
      this.#hands.send({ image: imageSource });
    });
  }

  // callback for after hands model gets landmarks
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
          const normalized = normalize(flattened);
          const tensor = tf.tensor1d(normalized).expandDims(0);
          const prediction = this.#model.predict(tensor);
          const index = prediction.dataSync()[0];
          // ---CHECK RESULTS----
          // May need to modify
          const rounded_result = Math.round(index);
		  console.log("prediction index", index);


          if (rounded_result >= 0 && rounded_result < classes.length) {
            this.#predictionCallback(classes[rounded_result]);
          } else {
            this.#predictionCallback(null);
          }

          tensor.dispose();

          if (this.#debugContext) {
            this.#debugContext.clearRect(
              0,
              0,
              this.#debugContext.canvas.width,
              this.#debugContext.canvas.height
            );

            drawConnectors(this.#debugContext, landmarks, HAND_CONNECTIONS, {
              color: "#FFF",
              lineWidth: 3,
            });
            drawLandmarks(this.#debugContext, landmarks, {
              color: "#7f5a83",
              lineWidth: 2,
            });
          }

          // just one for now
          break;
        } else {
          this.#predictionCallback(null);
        }
      }
    } else {
      this.#predictionCallback(null);
    }
  };
}

function normalize(arr /*: any[]*/) {
  const max = arr.reduce(
    (maxSoFar, item) => Math.max(maxSoFar, Math.abs(item)),
    arr[0]
  );
  return arr.map((n) => n / max);
}
