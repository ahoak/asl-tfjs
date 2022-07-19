import { Predictions } from "./src/components/predictions"
import './style.css'

const mainEle = document.getElementById('main')
mainEle.innerHTML = ''
mainEle.appendChild(new Predictions())
