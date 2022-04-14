import { applyTemplate } from "../../elementUtils";
import templateContent from "./training.html";
import './training.css'

export class Training extends HTMLElement {
	/**
	 * @type {HTMLElement}
	 */
	#root = null

	/**
	 * @type {HTMLButtonElement}
	 */
	#trainButton = null

	/**
	 * @type {HTMLElement}
	 */
	#stageStatusText = null

	/**
	 * @type {HTMLElement}
	 */
	#stageProgress = null

	constructor() {
		super()

		this.#root = applyTemplate(this, templateContent, false)

		this.#trainButton = this.#root.querySelector('.trainButton')
		this.#stageStatusText = this.#root.querySelector('.stageStatusText')
		this.#stageProgress = this.#root.querySelector('.stageProgressBar')

		this.#trainButton.addEventListener('click', this.#onTrainButtonClick.bind(this))
	}

	/**
	 * Event listener for when the train button is clicked
	 */
	#onTrainButtonClick() {
		this.#updateStageProgress('Starting...', 50)
	}

	/**
	 * Updates the progress bar for the stage
	 * @param {number} progress The progress 0 - 100 of the stage
	 * @param {string} text The text for the progress
	 */
	#updateStageProgress(text, progress) {
		this.#stageProgress.style.width = `${progress}%`
		this.#stageProgress.innerText = `${progress}%`
		this.#stageProgress.setAttribute('aria-valuenow', progress)
		this.#stageProgress.setAttribute('aria-valuetext', text)
		this.#stageStatusText.innerText = text
	}
}
customElements.define("training-display", Training);