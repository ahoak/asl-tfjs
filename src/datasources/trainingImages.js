import { createNanoEvents } from "nanoevents";
// import * as JSZip from 'jszip'

export class TrainingDataSource {
  #fps = 15;
  #started = false;
  #lastRun = Date.now();

  /**
   * @type Image | null
   */
  #imageEle = null;
  /**
   * @type HTMLCanvasElement | null
   */
  #processedCanvas = null;

  /**
   * @type CanvasRenderingContext2D | null
   */
  #processedCtx = null;
  #loopTimeout = null;
  #emitter = null;
  #paused = false;
  #datasetPath = null; // : string | null

  /**
   * @typedef {Function} TypeFnGetSource
   * @param {string} letterclass
   * @param {number} index
   * @returns {string}
   */
  /**
   * @type TypeFnGetSource | null
   */
  #getFile = null;
  #getFolder = null;

  /**
   * The index of this sign that we're training
   */
  #signIdx = 0;

  /**
   * The index within the given sign that we're training on
   */
  #signTrainIdx = 0;

  /**
   * @type string[]
   */
  #classes = [];

  constructor(fps, datasetPath, classes, getFolder, getFile) {
    this.#emitter = createNanoEvents();
    this.#fps = fps;
    this.#imageEle = new Image();
    this.#datasetPath = datasetPath;
    this.#processedCanvas = document.createElement("canvas");
    this.#processedCtx = this.#processedCanvas.getContext("2d");
    this.#classes = classes;
    this.#getFile = getFile;
    this.#getFolder = getFolder;
  }

  async pause() {
    this.#paused = true;
  }

  async resume() {
    this.#paused = false;
  }

  async start() {
    if (!this.#started) {
      this.#started = true;
      this.#paused = false;
      this.#signIdx = 0;
      this.#signTrainIdx = 0;
      this.#imageLoop();
      this.#emitter.emit("start");
    }
  }

  stop() {
    if (this.#loopTimeout) {
      clearTimeout(this.#loopTimeout);
      this.#loopTimeout = null;
    }
    this.#started = false;
    this.#paused = false;
    this.#emitter.emit("stop");
  }

  on(event, callback) {
    return this.#emitter.on(event, callback);
  }

  #imageLoop = async () => {
    if (this.#started) {
      if (!this.#paused) {
        const sign = this.#classes[this.#signIdx];
        let path = `${this.#datasetPath}`;
        let pathArray = [];
        if (this.#getFolder || this.#getFile) {
          const folder =
            this.#getFolder && this.#getFolder(sign, this.#signIdx);
          path = folder ? `${path}/${folder}` : path;
          const fileNameOrNames =
            this.#getFile && this.#getFile(sign, this.#signIdx);
          if (Array.isArray(fileNameOrNames)) {
            pathArray = fileNameOrNames.map((name) => `${path}/${name}`);
          } else {
            path = fileNameOrNames ? `${path}/${fileNameOrNames}` : path;
            pathArray = [path];
          }
        } else {
          // default path
          path = `${this.datasetPath}/${sign}/${this.#signTrainIdx + 1}.jpg`;
          pathArray = [path];
        }
        const pathPromises = await pathArray.map(async (path) => {
          const result = await this.#loadImage(path);
          if (result) {
            this.#emitter.emit(
              "frameReady",
              this.#processedCanvas,
              this.#processedCanvas.width,
              this.#processedCanvas.height,
              sign,
              this.#signIdx
            );
          }
        });
        await Promise.all(pathPromises);

        this.#signTrainIdx++;
        this.#signIdx++;

        if (this.#signIdx >= this.#classes.length) {
          this.#emitter.emit("complete");
          this.stop();
        }
      }

      // Try to target the given FPS
      const diff = this.#lastRun - Date.now;
      this.#loopTimeout = setTimeout(
        this.#imageLoop,
        Math.max(this.#fps / 1000 - diff, 0)
      );
    }
  };

  #loadImage = (path /*: string */, sign /*: string */) => {
    return new Promise((resolve) => {
      this.#imageEle.onload = async () => {
        this.#processedCanvas.width = this.#imageEle.width;
        this.#processedCanvas.height = this.#imageEle.height;
        // // ctx.drawImage(this.#imageEle, 0, 0, canvas.width, canvas.height)
        // // move to x + img's width
        // this.#processedCtx.translate(this.#imageEle.width, 0);

        // // scaleX by -1; this "trick" flips horizontally
        // this.#processedCtx.scale(-1, 1);

        // draw the img
        // no need for x,y since we've already translated
        this.#processedCtx.drawImage(this.#imageEle, 0, 0);

        // // always clean up -- reset transformations to default
        // this.#processedCtx.setTransform(1, 0, 0, 1, 0, 0);
        resolve(true);
      };
      this.#imageEle.onerror = () => {
        resolve(false);
      };
      this.#imageEle.src = path;
      this.#imageEle.id = sign;
    });
  };

  /**
   * @returns [string[], Uint8Array[]]
   */
  static async loadTrainingData(datasetPath, classes) {
    // const signData = []
    // const imageData = []

    // const zip = new JSZip()
    // const zipData = (await fetch(`assets/data/training/${datasetPath}.zip`)).blob()
    // const loadedZip = await zip.loadAsync(zipData)
    // const fileNames = Object.keys(loadedZip.files)
    // for (const fileName of fileNames) {
    // 	if (fileName.endsWith('.jpg')) {
    // 		const [datasetPath, sign, actualImageFileName] = fileName.split('/')
    // 		const blob = await loadedZip.file(fileName).async('blob')
    // 		const image = await loadImage(URL.createObjectURL(blob))
    // 		signData.push(sign)
    // 		imageData.push(image.getImageData(0, 0, image.canvas.width, image.canvas.height))
    // 	}
    // }

    // let signIdx = 0
    // let signTrainIdx = 0
    // while (true) {
    // 	const sign = classes[signIdx]
    // 	// The training datasetPaths start at 1
    // 	const path = `assets/data/training/${datasetPath}/${sign}/${sign}${signTrainIdx + 1}.jpg`
    // 	try {
    // 		const image = await loadImage(path)
    // 		signData.push(sign)
    // 		imageData.push(image.getImageData(0, 0, image.canvas.width, image.canvas.height))
    // 		signTrainIdx++
    // 	} catch (e) {
    // 		// Assume missing, so we're done
    // 		signIdx++
    // 		signTrainIdx = 0
    // 	}
    // 	if (signIdx >= classes.length) {
    // 		break
    // 	}
    // }

    return [signData, imageData];
  }
}

const imageEle = new Image();
const imageCanvas = document.createElement("canvas");
const imageCtx = imageCanvas.getContext("2d");
/**
 *
 * @param {string} path
 * @returns {Promise<CanvasRenderingContext2D>}
 */
function loadImage(path) {
  return new Promise((resolve, reject) => {
    imageEle.onload = async () => {
      imageCtx.canvas.width = imageEle.width;
      imageCtx.canvas.height = imageEle.height;
      imageCtx.drawImage(imageEle, 0, 0);
      resolve(imageCtx);
    };
    imageEle.onerror = (event) => {
      reject(event);
    };
    imageEle.src = path;
  });
}
