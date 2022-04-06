import { createNanoEvents } from 'nanoevents'

export class WebcamDataSource {
	#fps = 15
	#started = false
	#lastRun = Date.now()
	#stream = null
	#videoEle = null
	#loopTimeout = null
	#emitter = null
	#paused = false

	constructor(fps) {
		this.#emitter = createNanoEvents()
		this.#fps = fps
		this.#videoEle = document.createElement('video')
	}

	get width() {
		return this.#videoEle.videoWidth
	}
	
	get height() {
		return this.#videoEle.videoHeight
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
			// getUsermedia parameters.
			const constraints = {
				video: true,
				width: 200,
				height: 200,
			};
			this.#stream = await navigator.mediaDevices.getUserMedia(constraints);
			this.#videoEle.srcObject = this.#stream
			this.#videoEle.play()
			this.#imageLoop()
			this.#emitter.emit('start')
		}
	}

	stop() {
		if (this.#loopTimeout) {
			clearTimeout(this.#loopTimeout)
			this.#loopTimeout = null
		}
		if (this.#stream) {
			this.#stream.getTracks().forEach(t => t.stop())
			this.#stream = null
		}
		this.#started = false
		this.#videoEle.pause()
		this.#videoEle.srcObject = null
	
		this.#emitter.emit('stop')
	}

	on(event, callback) {
		return this.#emitter.on(event, callback)
	}

	#imageLoop = async () => {
		this.#loopTimeout = null
		if (this.#stream && this.#started) {
			if (!this.#paused) {
				this.#emitter.emit('frameReady', this.#videoEle, this.width, this.height)
			}

			// Try to target the given FPS
			const diff = this.#lastRun - Date.now;
			this.#loopTimeout = setTimeout(this.#imageLoop, Math.max((this.#fps / 1000) - diff, 0))
		}
	}
}