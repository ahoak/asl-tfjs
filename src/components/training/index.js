import templateContent from "./training.html";

export class Training extends HTMLElement {
	#root = null

	constructor() {
		super()

		this.#initEle()
	}

	#initEle(shadow = false) {
		if (shadow) {
			this.attachShadow({ mode: "open" }); // sets and returns 'this.shadowRoot'
			this.#root = this.shadowRoot;
		} else {
			this.#root = this;
		}
		this.#root.innerHTML = templateContent;
	}
}
customElements.define("training-display", Training);