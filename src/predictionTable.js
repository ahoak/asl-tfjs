const tbodyRef  = document.getElementById("prediction-table").getElementsByTagName('tbody')[0];
const tableDiv = document.getElementById("table-div")

const tfootTdOutputRef  = document.getElementById("prediction-output")

const tfootTdPercentRef  = document.getElementById("prediction-percent")
const tfootTdNoPredictsRef = document.getElementById("prediction-no-predicts")

export function insertRow(actual, prediction, index, result){
    const row = tbodyRef.insertRow();
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    cell1.innerHTML = actual
    cell2.innerHTML  = prediction
    const isMatch = prediction === actual
    updateFooter(isMatch, index,result)
}

export function updateFooter(isMatch, index, result){
    const current = +tfootTdOutputRef.innerHTML
    if(isMatch){
        tfootTdOutputRef.innerHTML = current +1 
        if(index !== undefined && current < index+ 1) {
            const percent = Math.round(current  / (index + 1) * 1000) / 1000
            tfootTdPercentRef.innerHTML = `${percent * 100}%`
        }
    }
    if(!result){
        const currentNoPredictCount = tfootTdNoPredictsRef.innerHTML ? +tfootTdNoPredictsRef.innerHTML : 0
        tfootTdNoPredictsRef.innerHTML = currentNoPredictCount +1 
    }
}

export function removeRows(){
    tbodyRef.innerHTML = ''
}

export function resetFooter(){
    tfootTdOutputRef.innerHTML = 0
  
    tfootTdPercentRef.innerHTML = ''
    
}

export function resetTable(){
    removeRows()
    resetFooter()
}

export function removeTable(logOutput){
    if(!logOutput) {
        while(tableDiv.firstChild) {
            tableDiv.removeChild(tableDiv.firstChild);
        }
    } 
}