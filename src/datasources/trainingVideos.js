import { VideoDataSourceBase } from './videoBase'

const maxNumLoadFails = 5
export class TrainingVideoDataSource extends VideoDataSourceBase {
	#datasetPath = null // : string | null

	#signIdx = 0



	/**
	 * The index within the given sign that we're training on
	 */
	#signTrainIdx = 0

	/**
	 * @type string[]
	 */
	#classes = []

	/**
	 * @type TypeFnGetSource | null
	 */
	 #getFile = null
	 #getFolder = null
 

	constructor(fps, datasetPath, classes, getFolder, getFile) {
		super(fps)
		this.#datasetPath = datasetPath
		this.#classes = classes
		this.#getFile = getFile
		this.#getFolder = getFolder
	}

	getVideoPath(sign){
		let path = `${this.#datasetPath}`
		if(this.#getFolder || this.#getFile) {
			const folder = this.#getFolder(sign, this.#signIdx)
			path = `${path}/${folder}`
			const fileName = this.#getFile(sign, this.#signIdx)
			path = `${path}/${fileName}`
		} else {
			// default path
			path = `${this.#datasetPath}/${sign}/${this.#signTrainIdx + 1}.mkv` 
		}
		return path
	}

	async fetchVideoSourceInternal() {
		let sign = this.#classes[this.#signIdx]
		let path = getVideoPath(sign)
		
		let numFails = 0
		while (!await checkFileExists(path)) {
			// Clamp to the number of signs
			this.#signIdx = this.#signIdx + 1

			// No more classes
			if (this.#signIdx >= this.#classes.length) {
				return null
			} else {
				this.#signTrainIdx = 0
				sign = this.#classes[this.#signIdx]
				path = getVideoPath(sign)
				numFails++
				if (numFails >= maxNumLoadFails) {
					throw new Error("Could not find any available training images!")
				}
			}
		}
		return [path, sign, this.#signIdx]
	}

	async start() {
		this.#signIdx = 0
		this.#signTrainIdx = 0
		super.start()
	}

	async onVideoComplete() {
		this.#signTrainIdx++

		// Tell the base class to reload
		this.reloadVideoSource()
	}
}

async function checkFileExists(path) {
	return new Promise((resolve) => {
		fetch(path, { method: "HEAD" }).then((res) => resolve(res.ok))
	})
}