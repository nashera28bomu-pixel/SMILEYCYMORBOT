// =============================================
// CYMOR AI - FIREBASE CORE CONNECTION
// =============================================

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// =============================================
// FIREBASE CONFIG
// =============================================
const firebaseConfig = {
  apiKey: "AIzaSyC48m4Mmksa8Fpx6OGDU8tAUIlCCqOE8Js",
  authDomain: "cymorai.firebaseapp.com",
  projectId: "cymorai",
  storageBucket: "cymorai.appspot.com",
  messagingSenderId: "718791176464",
  appId: "1:718791176464:web:159e5233fe709c518c3595"
};

// =============================================
// INITIALIZE FIREBASE APP
// =============================================
const app = initializeApp(firebaseConfig);

// =============================================
// SERVICES EXPORTS
// =============================================
export const auth = getAuth(app);
export const db = getFirestore(app);

// =============================================
// CYMOR STATUS LOG
// =============================================
console.log(`
╔══════════════════════════════╗
║      CYMOR FIREBASE READY     ║
║   Auth + Firestore ONLINE     ║
╚══════════════════════════════╝
`);
