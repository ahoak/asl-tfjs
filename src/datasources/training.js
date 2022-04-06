import { createNanoEvents } from 'nanoevents'

export class TrainingDataSource {
	#fps = 15
	#started = false
	#lastRun = Date.now()

	/**
	 * @type Image | null
	 */
	#imageEle = null 
	/**
	 * @type HTMLCanvasElement | null
	 */
	#processedCanvas = null

	/**
	 * @type CanvasRenderingContext2D | null
	 */
	#processedCtx = null
	#loopTimeout = null
	#emitter = null
	#paused = false
	#dataset = null // : string | null

	/**
	 * The index of this sign that we're training
	 */
	#signIdx = 0

	/**
	 * The index within the given sign that we're training on
	 */
	#signTrainIdx = 0

	/**
	 * @type string[]
	 */
	#classes = []

	constructor(fps, dataset, classes) {
		this.#emitter = createNanoEvents()
		this.#fps = fps
		this.#imageEle = new Image()
		this.#dataset = dataset
		this.#processedCanvas = document.createElement('canvas')
		this.#processedCtx = this.#processedCanvas.getContext('2d')
		this.#classes = classes
	}

	async pause() {
		this.#paused = true
	}

	async resume() {
		this.#paused = false
	}

	async start() {
		if (!this.#started) {
			this.#started = true
			this.#paused = false
			this.#signIdx = 0
			this.#signTrainIdx = 0
			this.#imageLoop()
			this.#emitter.emit('start')
		}
	}

	stop() {
		if (this.#loopTimeout) {
			clearTimeout(this.#loopTimeout)
			this.#loopTimeout = null
		}
		this.#started = false
		this.#paused = false
		this.#emitter.emit('stop')
	}

	on(event, callback) {
		return this.#emitter.on(event, callback)
	}

	#imageLoop = async () => {
		if (this.#started) {
			if (!this.#paused) {
				const sign = this.#classes[this.#signIdx]

				// The training datasets start at 1
				const path = `assets/data/training/${this.#dataset}/${sign}/${sign}${this.#signTrainIdx + 1}.jpg`
				if (await this.#loadImage(path)) {
					this.#emitter.emit('frameReady', this.#processedCanvas, this.#processedCanvas.width, this.#processedCanvas.height)
					this.#signTrainIdx++
				} else {
					// Done
					this.#signIdx++
					this.#signTrainIdx = 0
				}
			} 
				
			// Try to target the given FPS
			const diff = this.#lastRun - Date.now;
			this.#loopTimeout = setTimeout(this.#imageLoop, Math.max((this.#fps / 1000) - diff, 0))
		}
	}

	#loadImage = (path /*: string */) => {
		return new Promise((resolve) => {
			this.#imageEle.onload = async () => {
				this.#processedCanvas.width = this.#imageEle.width;
				this.#processedCanvas.height = this.#imageEle.height
				// ctx.drawImage(this.#imageEle, 0, 0, canvas.width, canvas.height)
				// move to x + img's width
				this.#processedCtx.translate(this.#imageEle.width, 0);

				// scaleX by -1; this "trick" flips horizontally
				this.#processedCtx.scale(-1, 1);

				// draw the img
				// no need for x,y since we've already translated
				this.#processedCtx.drawImage(this.#imageEle, 0, 0);

				// always clean up -- reset transformations to default
				this.#processedCtx.setTransform(1, 0, 0, 1, 0, 0);
				resolve(true)
			}
			this.#imageEle.onerror = () => {
				resolve(false)
			}
			this.#imageEle.src = path
		})
	}
}