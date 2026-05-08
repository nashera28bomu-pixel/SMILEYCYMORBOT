import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyC48m4Mmksa8Fpx6OGDU8tAUIlCCqOE8Js",
    authDomain: "cymorai.firebaseapp.com",
    projectId: "cymorai",
    storageBucket: "cymorai.appspot.com",
    messagingSenderId: "718791176464",
    appId: "1:718791176464:web:159e5233fe709c518c3595"
};

// INIT
const app = initializeApp(firebaseConfig);

// SERVICES
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export {
    auth,
    db,
    provider
};
