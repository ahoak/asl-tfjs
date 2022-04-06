import { VideoDataSourceBase } from './videoBase'

const maxNumLoadFails = 5
export class TrainingVideoDataSource extends VideoDataSourceBase {
	#dataset = null // : string | null

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
		super(fps)
		this.#dataset = dataset
		this.#classes = classes
	}

	async fetchVideoSourceInternal() {
		let sign = this.#classes[this.#signIdx]
		let trainFile = `assets/data/training/${this.#dataset}/${sign}/${sign}${this.#signTrainIdx + 1}.mkv` 
		
		let numFails = 0
		while (!await checkFileExists(trainFile)) {
			// Clamp to the number of signs
			this.#signIdx = (this.#signIdx + 1) % this.#classes.length
			this.#signTrainIdx = 0
			sign = this.#classes[this.#signIdx ]
			trainFile = `assets/data/training/${this.#dataset}/${sign}/${sign}${this.#signTrainIdx + 1}.mkv`
			numFails++
			if (numFails >= maxNumLoadFails) {
				throw new Error("Could not find any available training images!")
			}
		}
		return trainFile
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