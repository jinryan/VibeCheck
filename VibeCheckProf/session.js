var { app, ipcRenderer } = require('electron')
var studentCount = 100
function init() {
    document.getElementsByClassName('container-2')[0].style.display = 'none';
    document.getElementsByClassName('container-1')[0].style.display = 'block';
    document.getElementsByClassName('notifications')[0].style.display = 'none'
}

document.getElementsByClassName('container-1')[0].addEventListener('mouseover', function() {
    document.getElementsByClassName('container-2')[0].style.display = 'block';
    document.getElementsByClassName('container-1')[0].style.display = 'none';
    ipcRenderer.send('popup::expand', true);
})

document.getElementsByClassName('container-2')[0].addEventListener('mouseleave', function() {
    document.getElementsByClassName('container-2')[0].style.display = 'none';
    document.getElementsByClassName('container-1')[0].style.display = 'block';
    ipcRenderer.send('popup::collapse', true);
})

var numQ = 0
var numSlow = 0
var numFast = 0

ipcRenderer.on('pin:questionUpdate', function(e, item) {
    console.log("Here are my questions")
    console.log(item)
    let questions = item
    questions.sort(function (first, second) {
        if (first.upvotes > second.upvotes) {
            return -1;
        }
        if (first.upvotes < second.upvotes) {
            return 1;
        }
        return 0;
    });
    numQ = questions.length
    document.getElementById('notifications-num').innerText = numQ + numSlow + numFast
    if (numQ + numSlow + numFast > 0) {
        document.getElementsByClassName('notifications')[0].style.display = 'flex'
    } else {
        document.getElementsByClassName('notifications')[0].style.display = 'none'
    }
    const el = document.getElementsByClassName('question-list')[0]
    while (el.firstChild) el.removeChild(el.firstChild);
    for (var i = 0; i < questions.length; i += 1) {
        
        const l = questions.length
        for (var i = 0; i < l; i += 1) {
            const question = questions[i]
            var newLi = document.createElement('li');
            newLi.setAttribute('class', 'question')

            var questionTextDiv = document.createElement('div')
            questionTextDiv.setAttribute('class', 'question-text')

            var newP = document.createElement('p')
            newP.textContent = question.content
            questionTextDiv.appendChild(newP)

            var upvoteImg = document.createElement('img')
            upvoteImg.setAttribute('src', 'assets/Upvote.png')
            upvoteImg.setAttribute('alt', 'upvote')
            upvoteImg.setAttribute('class', 'upvote')


            var upvoteP = document.createElement('p')
            upvoteP.setAttribute('class', 'question-upvotes')
            upvoteP.textContent = question.upvotes

            newLi.appendChild(questionTextDiv)
            newLi.appendChild(upvoteImg)
            newLi.appendChild(upvoteP)
            

            el.appendChild(newLi)
        }
    }
})


ipcRenderer.on('pin:confusionUpdate', function(e, item) {
    console.log("Here are my confusions")
    console.log(item)
    var num = item.length

    // studentCount = 100
    
    var pct = Math.ceil(num / studentCount * 100)
    console.log("Pct is " + pct)
    document.getElementById('confusion-pct').innerHTML = pct + "%"
    document.getElementById('confuse-progress').style.width = pct + "%"
    
    var green = Math.max(0, 255 - 500 * pct / 100)
    var red = Math.min(500 * pct / 100, 255)
    document.getElementsByClassName('confusion-signal')[0].style.backgroundColor = `rgb(${red}, ${green}, 100)`

})

ipcRenderer.on('pin:studentCount', function(e, item) {
    console.log("Here are my student counts")
    console.log(item)
    studentCount = parseInt(item)
    
})


ipcRenderer.on('pin:slowDownUpdate', function(e, item) {
    console.log("Here are my slowdowns")
    console.log(item)
    var num = item.length
    if (num > 0) {
        numSlow = 1
    } else {
        numSlow = 0
    }
    document.getElementById('notifications-num').innerText = numQ + numSlow + numFast
    if (numQ + numSlow + numFast > 0) {
        document.getElementsByClassName('notifications')[0].style.display = 'flex'
    } else {
        document.getElementsByClassName('notifications')[0].style.display = 'none'
    }
    var pct = Math.ceil(num / studentCount * 100)
    document.getElementById('slow-pct').innerHTML = pct + "%"
    document.getElementById('slow-progress').style.width = pct + "%"
})


ipcRenderer.on('pin:speedUpUpdate', function(e, item) {
    console.log("Here are my speed ups")
    console.log(item)
    var num = item.length
    if (num > 0) {
        numFast = 1
    } else {
        numFast = 0
    }
    document.getElementById('notifications-num').innerText = numQ + numSlow + numFast
    if (numQ + numSlow + numFast > 0) {
        document.getElementsByClassName('notifications')[0].style.display = 'flex'
    } else {
        document.getElementsByClassName('notifications')[0].style.display = 'none'
    }
    var pct = Math.ceil(num / studentCount * 100)
    document.getElementById('fast-pct').innerHTML = pct + "%"
    document.getElementById('fast-progress').style.width = pct + "%"
})

document.getElementsByClassName('reset')[0].addEventListener('click', function() {
    ipcRenderer.send('popup::reset', true)
})

window.onload = init