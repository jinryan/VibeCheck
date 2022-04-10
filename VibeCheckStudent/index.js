// Import the functions you need from the SDKs you need
    
const { session } = require('electron');
const { initializeApp } = require('firebase/app');
const { getAnalytics } = require('firebase/analytics');
const { getFirestore, collection, addDoc, getDocs, onSnapshot, doc, setDoc, getDoc, updateDoc, query, deleteField } = require("firebase/firestore");


let app, db, sessionPIN, sessionDocumentID, studentID, sessionSnapshot;
var questions = []

async function setupFirebase() {
    const firebaseConfig = {
        apiKey: "XXX",
        authDomain: "XXX.firebaseapp.com",
        projectId: "XXX",
        storageBucket: "XXX.appspot.com",
        messagingSenderId: "XXX",
        appId: "1:XXX",
        measurementId: "G-XXX"
    };
    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
    db = getFirestore(app);
    
    
}

async function init() {
    initView()
    await setupFirebase()
}

function displayError(errMsg) {
    document.getElementById('error-message').style.display = 'block'
    document.getElementById('error-message').innerHTML = errMsg
}

document.getElementById('question-form').addEventListener('input', function() {
    let v = document.getElementById('question-form').value
    let remain = Math.max(50 - v.length, 0)
    document.getElementById('num-letters-remaining').innerHTML = remain + " characters remaining"
})

document.getElementById('submit-pin').addEventListener('click', async function() {
    // Check for session PIN
    sessionPIN = document.getElementById('pin-form').value
    if (sessionPIN == '') {
        displayError("The PIN field is empty")
        return
    }
    console.log("PIN is " + sessionPIN)

    await joinSessionFromPIN(sessionPIN)
    console.log("Started a session with PIN of " + sessionPIN + " and document ID of " + sessionDocumentID)
    listenForEndOfSession(sessionPIN)
    beginReadingQuestion(sessionDocumentID)
    showPINView(false)
})

function showPINView(state) {
    if (state) {
        document.getElementsByClassName('container-2')[0].style.display = 'none'
        document.getElementsByClassName('container-1')[0].style.display = 'block'
    } else {
        document.getElementsByClassName('container-1')[0].style.display = 'none'
        document.getElementsByClassName('container-2')[0].style.display = 'block'
    }
    
}

function initView() {
    showPINView(true)
    document.getElementById('error-message').style.display = 'none'
}

window.onload = init

async function joinSessionFromPIN(sessionPIN) {
    sessionDocumentID = await getSessionDocumentIDFromSessionPIN(sessionPIN)
    const docRef = await addDoc(collection(db, ("sessions/" + sessionDocumentID + "/students")), {
        email: "handsome.dan@yale.edu"
    });
    studentID = docRef.id;
}

async function listenForEndOfSession(sessionPIN) {
    sessionSnapshot = onSnapshot(doc(db, "meta", "pin-to-session", "pin-to-session-collection", sessionPIN.toString()), (doc) => {
        console.log("Doc data is " + doc.data())
        if (!doc.data().hasOwnProperty("sessionID")) {
            // Session has ended
            console.log("Session ended")
        }
        
    })
}

async function getSessionDocumentIDFromSessionPIN(sessionPIN) {
    const pinToSessionDoc = doc(db, "meta", "pin-to-session", "pin-to-session-collection", sessionPIN.toString())
    const docSnap = await getDoc(pinToSessionDoc);
    let sessionDocumentID

    if (docSnap.exists()) {
        sessionDocumentID = docSnap.data()["sessionID"]
        return sessionDocumentID
    } else {
        // doc.data() will be undefined in this case
        console.log("Wrong PIN!");
        return -1
    }   
}


// === Submitting a question
document.getElementById('submit-question').addEventListener('click', async function() {
    const question = document.getElementById('question-form').value
    if (question == '') {
        return
    } else {
        // Submit question
        const docRef = await addDoc(collection(db, ("sessions/" + sessionDocumentID + "/questions")), {
            closed: false,
            content: question,
            timestamp: Date.now(),
            from: studentID,
            upvotes: 0
        });
        console.log("Document written with ID: ", docRef.id);
    }
})


// ======================== Process Question =================
async function updateUIForQuestions() {
    // Clear question list
    
    const el = document.getElementsByClassName('question-list')[0]
    while (el.firstChild) el.removeChild(el.firstChild);
    const l = questions.length
    var appendText = ""
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
        upvoteImg.setAttribute('id', 'upvote' + question.id)
        upvoteImg.addEventListener('click', async function() {
            const questionRef = doc(db, "sessions", sessionDocumentID, "questions", question.id)
            await updateDoc(questionRef, {
                upvotes: question.upvotes + 1
            });
        })

        var upvoteP = document.createElement('p')
        upvoteP.setAttribute('class', 'question-upvotes')
        upvoteP.textContent = question.upvotes

        newLi.appendChild(questionTextDiv)
        newLi.appendChild(upvoteImg)
        newLi.appendChild(upvoteP)
        

        el.appendChild(newLi)
    }

}


async function beginReadingQuestion(sessionDocumentID) {

    readQuerySnapshot = onSnapshot(collection(db, ("sessions/" + sessionDocumentID + "/questions")), (docs) => {
        console.log("Gettingsnapshot")
        questions = []
        
        docs.forEach((doc) => {
            let data = doc.data()
            let content = data.content.toString()
            let upvotes = parseInt(data.upvotes)
            let dict = {upvotes: upvotes, content: content, id: doc.id}
            console.log("Dict is " + dict.id)
            if (data.closed == false) {
                questions.push(dict)    
            }
            
        })
        questions.sort(function (first, second) {
            if (first.upvotes > second.upvotes) {
               return -1;
            }
            if (first.upvotes < second.upvotes) {
               return 1;
            }
            return 0;
         });

        updateUIForQuestions();
        
        
    });
    
}

document.getElementById('slow-btn').addEventListener('click', async function() {
    await addQuickUpdate(sessionDocumentID, "slow")
})

document.getElementById('confuse-btn').addEventListener('click', async function() {
    await addQuickUpdate(sessionDocumentID, "confusions")
})


document.getElementById('fast-btn').addEventListener('click', async function() {
    await addQuickUpdate(sessionDocumentID, "fast")
})

async function addQuickUpdate(sessionDocumentID, forCondition) {
    const docRef = await addDoc(collection(db, ("sessions/" + sessionDocumentID + "/" + forCondition)), {
        timestamp: Date.now(),
        from: studentID,
    });
}



async function readSession() {
    const querySnapshot = await getDocs(collection(db, "sessions"));
    querySnapshot.forEach((doc) => {
        console.log(`${doc.id} => ${doc.data()}`);
    });
}