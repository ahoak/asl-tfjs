// import { insertRow, resetTable, removeTable} from "./src/predictionTable"
// Custom element
import Navigo from 'navigo' // When using ES modules.
import { Predictions } from "./src/components/predictions"
import { Training } from "./src/components/training"
import './style.css'

const mainEle = document.getElementById('main')
const router = new Navigo('/');
router.on('/', () => {
  router.navigate('/predictions')
})
router.on('/predictions', () => {
  mainEle.innerHTML = ''
  mainEle.appendChild(new Predictions())
})

router.on('/training', () => {
  mainEle.innerHTML = ''
  mainEle.appendChild(new Training())
})

router.resolve()