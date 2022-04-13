import templateContent from "./predictions.html";
import { TrainingDataSource } from "./../../datasources/trainingImages.js";
import { TrainingVideoDataSource } from "./../../datasources/trainingVideos.js";
import { WebcamDataSource } from "./../../datasources/webcam.js";
import { mirrorImage } from "./../../imageUtils.js";
import { HandPoseModel } from "./../../models/handPose.js";
import { config } from "../../../config";
import { classes } from "../../../constants.js";

export class Predictions extends HTMLElement {
  #root = null;
  #startStopButton = null;
  #logOutput = false;
  #useCV = false;
  #tbodyRef = null;
  #tableDiv = null;
  #predictions = null;

  #tfootTdOutputRef = null;

  #tfootTdPercentRef = null;
  #tfootTdNoPredictsRef = null;
  #model = null;

  #CV_CANVAS = null;
  #cvCtx = null;

  #canvas = null;
  #ctx = null;

  #tfCanvas = null;
  #tfCanvasCtx = null;

  #videoInputDisplay = null;
  #inputCtx = null;
  #useCVCheckbox = null;
  #sourceSelection = null;

  /**
   * @type {WebcamDataSource | TrainingDataSource | null}
   */
  #imageSource = null;

  #loadedPromise = null;

  constructor() {
    super();

    this.#initElement();
  }

  #insertRow(actual, prediction, index, result) {
    const row = this.#tbodyRef.insertRow();
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    cell1.innerHTML = actual;
    cell2.innerHTML = prediction;
    const isMatch = prediction === actual;
    this.#updateFooter(isMatch, index, result);
  }

  #updateFooter(isMatch, index, result) {
    const current = +this.#tfootTdOutputRef.innerHTML;
    if (isMatch) {
      this.#tfootTdOutputRef.innerHTML = current + 1;
      if (index !== undefined && current < index + 1) {
        const percent = Math.round((current / (index + 1)) * 1000) / 1000;
        this.#tfootTdPercentRef.innerHTML = `${percent * 100}%`;
      }
    }
    if (!result) {
      const currentNoPredictCount = this.#tfootTdNoPredictsRef.innerHTML
        ? +this.#tfootTdNoPredictsRef.innerHTML
        : 0;
      this.#tfootTdNoPredictsRef.innerHTML = currentNoPredictCount + 1;
    }
  }

  #removeRows() {
    this.#tbodyRef.innerHTML = "";
  }
  #resetTable() {
    this.#removeRows();
    this.#resetFooter();
  }
  #resetFooter() {
    this.#tfootTdOutputRef.innerHTML = "";
    this.#tfootTdPercentRef.innerHTML = "";
  }

  #removeTable(logOutput = false) {
    if (!logOutput) {
      while (this.#tableDiv.firstChild) {
        this.#tableDiv.removeChild(this.#tableDiv.firstChild);
      }
    }
  }
  #updateOutput(output) {
    this.#predictions.innerHTML = output;
  }

  /**
   * Initializes this element
   */
  #initElement(shadow = false) {
    if (shadow) {
      this.attachShadow({ mode: "open" }); // sets and returns 'this.shadowRoot'
      this.#root = this.shadowRoot;
    } else {
      this.#root = this;
    }

	this.#root.innerHTML = templateContent;

    this.#predictions = this.#root.querySelector(".predictions");
    this.#tbodyRef = this.#root
      .querySelector("#prediction-table")
      .getElementsByTagName("tbody")[0];
    this.#tableDiv = this.#root.querySelector("#table-div");

    this.#tfootTdOutputRef = this.#root.querySelector("#prediction-output");

    this.#tfootTdPercentRef = this.#root.querySelector("#prediction-percent");
    this.#tfootTdNoPredictsRef = this.#root.querySelector(
      "#prediction-no-predicts"
    );
    this.#startStopButton = this.#root.querySelector("#startStopBtn");

    this.#CV_CANVAS = document.createElement("canvas");
    this.#cvCtx = this.#CV_CANVAS.getContext("2d");

    this.#canvas = this.#root.querySelector("#c_img");
    this.#ctx = this.#canvas.getContext("2d");

    this.#tfCanvas = document.createElement("canvas");
    this.#tfCanvasCtx = this.#tfCanvas.getContext("2d");

    this.#videoInputDisplay = this.#root.querySelector("#videoInputDisplay");
    this.#inputCtx = this.#videoInputDisplay.getContext("2d");
    this.#useCVCheckbox = this.#root.querySelector("#useCV");
    this.#sourceSelection = this.#root.querySelector("#sourceSelection");

    this.#useCVCheckbox.addEventListener("change", this.#onUseCVChanged);

    this.#useCV = !!config.useCV;
    this.#useCVCheckbox.checked = this.#useCV;

    this.#logOutput = !!config.logOutput;
    this.#removeTable(this.#logOutput);

    this.#sourceSelection.addEventListener("change", this.#onSourceChanged);

    this.#startStopButton.addEventListener("click", this.#toggleVideo);
    this.#imageSource = this.#createImageSourceByType(
      this.#sourceSelection.value
    );

    this.#model = new HandPoseModel();
    this.#loadedPromise = this.#model.load();
  }

  // const trainingData = TrainingDataSource.loadTrainingData('asl_alphabet_train', classes).then((data) => {
  //   console.log(`Loading took: ${Date.now() - loadStartTime}`)
  //   console.log(data)
  // })

  // console.log(trainingData)

  #onSourceChanged = async (event) => {
    // stop the previous one first
    await this.#stop();
    this.#imageSource = this.#createImageSourceByType(event.target.value);
  };

  #onUseCVChanged = (event) => {
    this.#useCV = !!event.target.checked;
  };

  async #processImage(img, width = 200, height = 200) {
    if (width > 0 && height > 0) {
      // Scale our canvis to match the incoming image dimensions
      this.#cvCtx.canvas.width = width;
      this.#cvCtx.canvas.height = height;
      this.#tfCanvasCtx.canvas.width = width;
      this.#tfCanvasCtx.canvas.height = height;

      this.#cvCtx.clearRect(0, 0, width, height);
      this.#cvCtx.drawImage(img, 0, 0);

      await mirrorImage(this.#cvCtx, this.#tfCanvasCtx, this.#useCV);
    }
  }

  async #stop() {
    await this.#stopVideo();
  }

  async #start() {
    await this.#loadedPromise;
    await this.#stopVideo();
    await this.#startVideo();
  }

  // /**
  //  * Enable the webcam with video constraints applied.
  //  **/
  async #startVideo() {
    console.log("starting data source");

    this.#startStopButton.innerText = "Stop";
    if (this.#imageSource) {
      await this.#imageSource.start();
    }
  }

  async #stopVideo() {
    console.log("stopping data source");
    if (this.#imageSource) {
      await this.#imageSource.stop();
    }
    this.#startStopButton.innerText = "Start";
  }

  /**
   * Creates an image source by type
   * @param {"webcam" | "trainingImages" | "trainingVideos"} type
   */
  #createImageSourceByType(type) {
    console.log(`creating ${type} datasource`);
    let source = null;
    const letterClasses = config.classes ?? classes;
    const dataset = `${config.dataset}`;
    if (type === "trainingImages") {
      const path = config.images.testPath ?? `assets/data/${dataset}`;

      source = new TrainingDataSource(
        60,
        path,
        letterClasses,
        config.images.folder,
        config.images.file
      );
    } else if (type === "trainingVideos") {
      const path = config.videos.testPath ?? `assets/data/${dataset}`;

      source = new TrainingVideoDataSource(
        60,
        path,
        letterClasses,
        config.videos.folder,
        config.videos.file
      );
    } else {
      // Default to webcam
      source = new WebcamDataSource(30);
    }
    source.on("frameReady", async (imageData, width, height, sign, index) => {
      await this.#imageSource.pause();
      this.#inputCtx.canvas.width = width;
      this.#inputCtx.canvas.height = height;
      this.#inputCtx.drawImage(imageData, 0, 0);
      await this.#processImage(imageData, width, height);
      const result = await this.#model.predict(this.#tfCanvas, this.#ctx);
      const prediction = result ? `${result}` : "No predictions";
      this.#insertRow(sign, prediction, index, result);
      this.#updateOutput(result ? `${result}` : "No predictions");
      await this.#imageSource.resume();
    });
    return source;
  }

  #handleOutputTableReset(logOutput = false) {
    if (logOutput) {
      this.#resetTable();
    }
  }

  #toggleVideo = async () => {
    // Little jank
    const isStarted = this.#startStopButton.innerText == "Stop";
    if (isStarted) {
      await this.#stop();
    } else {
      this.#handleOutputTableReset(this.#logOutput);
      await this.#start();
    }
  };
}
customElements.define("predictions-display", Predictions);
