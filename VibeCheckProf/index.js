// Import the functions you need from the SDKs you need
const { session, ipcRenderer } = require('electron');
const { initializeApp } = require('firebase/app');
const { getAnalytics } = require('firebase/analytics');
const { getFirestore, collection, addDoc, getDocs, onSnapshot, doc, setDoc, getDoc, updateDoc, query, deleteField } = require("firebase/firestore");


let app, db, sessionPIN, sessionDocumentID,readQuerySnapshot, confusionQuerySnapshot, speedQuerySnapshot, studentQuerySnapshot, timer;
var totalNumStudentsJoined
let questions = []
let slowDowns = []
let speedUps = []
let confusions = []
let questionsTrash = []
var latestAcceptedTime = Date.now() - 30000

async function init() {
    initView()
    await setupFirebase()
    totalNumStudentsJoined = 0
    
}

function initView() {
    setPINScreenViewVisibility(false);
    setStartSessionViewVisibility(true);
}

function reportError(errorMSG) {
    document.getElementById("error-message").style.display = "block";
    document.getElementById('error-message').innerHTML = errorMSG
}

function setPINScreenViewVisibility(visible) {
    if (visible) {
        document.getElementById("session-pin-div").style.display = "block";
    } else {
        document.getElementById("session-pin-div").style.display = "none";
    }
}

function setStartSessionViewVisibility(visible) {
    document.getElementById("error-message").style.display = "none";
    if (visible) {
        document.getElementById("create-session-div").style.display = "block";
    } else {
        document.getElementById("create-session-div").style.display = "none";
    }
}

function configurePINScreenView() {
    document.getElementById("pin-num").innerHTML = "PIN: " + sessionPIN
    document.getElementById("num-member").innerHTML = "Number of Students: 0"
    beginListeningForStudentJoin()
    ipcRenderer.send('pin::success', true);
}

function beginListeningForStudentJoin() {
    speedQuerySnapshot = onSnapshot(collection(db, ("sessions/" + sessionDocumentID + "/students")), (docs) => {
        totalNumStudentsJoined = docs.size
        document.getElementById("num-member").innerHTML = "Number of Students: " + totalNumStudentsJoined
        ipcRenderer.send('pin::studentCount', totalNumStudentsJoined)
    });
}

// Start session
document.getElementById('create-session-btn').addEventListener('click', async function() {
    console.log("Creating session")
    var retVal = await createSession()
    sessionPIN = retVal[0]
    sessionDocumentID = retVal[1]
    if (sessionPIN == -1) {
        reportError("Error creating session. Please try again later.")
        return
    }

    // Session created successfully

    setPINScreenViewVisibility(true);
    configurePINScreenView()
    setStartSessionViewVisibility(false);

    console.log("Started a session with PIN of " + sessionPIN + " and document ID of " + sessionDocumentID)
    await beginReadingQuestion(sessionDocumentID)
    await beginReadingConfusion(sessionDocumentID)
    await beginReadingFast(sessionDocumentID)
    await beginReadingSlowDowns(sessionDocumentID)

    
    timer = setInterval(updateRelevantConfusionAndSpeedDemands, 3000)
})

function removeAnythingEarlierThan(timeMark, forThisArr) {
    const l = forThisArr.length
    while(forThisArr.length > 0) {
        let relevantItem = forThisArr[0]
        if (relevantItem.timestamp < timeMark) {
            forThisArr.shift()
        } else {
            break
        }
    }
    return forThisArr.length != l

}

ipcRenderer.on('popup:reset', async function(e, item) {
    
    confusions = []
    slowDowns = []
    speedUps = []
    questionsTrash.push.apply(questions)
    for (var i = 0; i < questions.length; i++) {
        let currQ = questions[i]
        const sessionRef = doc(db, "sessions", sessionDocumentID, "questions", currQ.id);

        // Set finished to true to allow reuse of PIN
        await updateDoc(sessionRef, {
            closed: true
        });
    }
    questions = []
    latestAcceptedTime = Date.now()
    ipcRenderer.send('pin::questionUpdate', questions)
    ipcRenderer.send('pin::confusionUpdate', confusions)
    ipcRenderer.send('pin::slowDownUpdate', slowDowns)
    ipcRenderer.send('pin::speedUpUpdate', speedUps)
    

})

function updateRelevantConfusionAndSpeedDemands() {
    var fiveSecs = Date.now() - 30000
    latestAcceptedTime = Math.max(fiveSecs, latestAcceptedTime)
    if (removeAnythingEarlierThan(latestAcceptedTime, confusions)) {
        ipcRenderer.send('pin::confusionUpdate', confusions)
    }
    if (removeAnythingEarlierThan(latestAcceptedTime, slowDowns)) {
        ipcRenderer.send('pin::slowDownUpdate', slowDowns)
    }
    if (removeAnythingEarlierThan(latestAcceptedTime, speedUps)) {
        ipcRenderer.send('pin::speedUpUpdate', speedUps)
    }
}

document.getElementById('stop-session-btn').addEventListener('click', async function() {
    await endSession(sessionPIN, sessionDocumentID)
    setPINScreenViewVisibility(true);
    setStartSessionViewVisibility(false);
    
    speedQuerySnapshot() // end query for students joining the queue
})

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

window.onload = init


async function createSession() {

    // Create PIN
    var randomNum = parseInt(Math.random()*(10**6))

    // Check if PIN already exists
    var existingIDs = []
    const querySnapshot = await getDocs(collection(db, "sessions"));
    querySnapshot.forEach((doc) => {
        if (doc.data().finished == false) {
            existingIDs.push(doc.data().ID)
        }
    });
    while (existingIDs.includes(randomNum)) {
        randomNum = parseInt(Math.random()*(10**7))
    }

    // Create session

    try {
        const docRef = await addDoc(collection(db, "sessions"), {
            ID: randomNum,
            finished: false
        });

        // Update pin-to-session
        const pinToSessionRef = await setDoc(doc(db, "meta", "pin-to-session", "pin-to-session-collection", randomNum.toString()), {
            sessionID: docRef.id
        });
        return [randomNum, docRef.id]
    } catch (e) {
        console.error("Error adding document: ", e);
        return [-1, -1]
    }
}

async function endSession(sessionPIN, sessionDocumentID) {
    const sessionRef = doc(db, "sessions", sessionDocumentID);

    // Set finished to true to allow reuse of PIN
    await updateDoc(sessionRef, {
        finished: true
    });

    const sessionPinToIDRef = doc(db, "meta", "pin-to-session", "pin-to-session-collection", sessionPIN.toString())

    // Remove sessionPINToID matching
    await updateDoc(sessionPinToIDRef, {
        sessionID: deleteField()
    });

    // Stop query snapshots
    if (readQuerySnapshot) {
        readQuerySnapshot()
    }

    if (confusionQuerySnapshot) {
        confusionQuerySnapshot()
    }

    if (speedQuerySnapshot) {
        speedQuerySnapshot()
    }
}


// ======================== Process Question =================



function processQuestion(question) {
    if (question.data().closed) {return}
    const questionObj = {content: question.data().content, upvotes: question.data().upvotes, id: question.id}

    hasQ = false
    var l = questions.length
    for (var i = 0; i < l; i += 1) {
        let question = questions[i]
        if (question.id == questionObj.id) {
            console.log("Updating")
            questions[i].upvotes = questionObj.upvotes
            hasQ = true
            break
        }
    }
    if (!hasQ) {
        l = questionsTrash.length
        for (var i = 0; i < l; i += 1) {
            let question = questionsTrash[i]
            if (question.id == questionObj.id) {
                console.log("Updating")
                questionsTrash[i].upvotes = questionObj.upvotes
                return
            }
        }
        console.log("Pushing")
        questions.push(questionObj)
    }
    console.log("Here are all of our questions")
    for (var i = 0; i < questions.length; i += 1) {
        let question = questions[i]
        console.log(question.content)
    }
    
}

async function beginReadingQuestion(sessionDocumentID) {
    readQuerySnapshot = onSnapshot(collection(db, ("sessions/" + sessionDocumentID + "/questions")), (docs) => {
        docs.forEach((doc) => {
            processQuestion(doc)
        })
        ipcRenderer.send('pin::questionUpdate', questions)    
    });
    
}

// ======================== Process Confusion =================
function processConfusion(confusion) {
    console.log("Latest confusion's content is " + confusion.data())
    let obj = {timestamp: confusion.data().timestamp}
    confusions.push(obj)
    console.log("Confusions are " + confusions)
    
}

async function beginReadingConfusion(sessionDocumentID) {
    confusionQuerySnapshot = onSnapshot(collection(db, ("sessions/" + sessionDocumentID + "/confusions")), (docs) => {
        docs.forEach((doc) => {
            processConfusion(doc)
        })
        updateRelevantConfusionAndSpeedDemands()
        ipcRenderer.send('pin::confusionUpdate', confusions)
    });
}

// ======================== Process Slowdown =================
function processSlowDowns(slowDown) {
    console.log("Latest slown's content is " + slowDown.data())
    let obj = {timestamp: slowDown.data().timestamp}
    slowDowns.push(obj)
    
}

async function beginReadingSlowDowns(sessionDocumentID) {
    slowDownQuerySnapshot = onSnapshot(collection(db, ("sessions/" + sessionDocumentID + "/slow")), (docs) => {
        docs.forEach((doc) => {
            processSlowDowns(doc)
        })
        updateRelevantConfusionAndSpeedDemands()
        ipcRenderer.send('pin::slowDownUpdate', slowDowns)
        // if (docs.size > 0) {
        //     let latestSlownDownDoc = docs.docs[docs.size - 1]
        //     processSlowDowns(latestSlownDownDoc)
        // }
    });
}

// ======================== Process Fast =================
function processFast(fast) {
    console.log("Latest fast's content is " + fast.data())
    let obj = {timestamp: fast.data().timestamp}
    speedUps.push(obj)
    
}

async function beginReadingFast(sessionDocumentID) {
    slowDownQuerySnapshot = onSnapshot(collection(db, ("sessions/" + sessionDocumentID + "/fast")), (docs) => {
        docs.forEach((doc) => {
            processFast(doc)
        })
        updateRelevantConfusionAndSpeedDemands()
        ipcRenderer.send('pin::speedUpUpdate', speedUps)
    });
}