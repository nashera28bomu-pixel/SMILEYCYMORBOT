// =============================================
// CYMOR AI - FIREBASE CORE CONNECTION
// =============================================

// Using CDN imports for browser compatibility
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// =============================================
// FIREBASE CONFIG (UPDATED STORAGE BUCKET)
// =============================================
const firebaseConfig = {
  apiKey: "AIzaSyC48m4Mmksa8Fpx6OGDU8tAUIlCCqOE8Js",
  authDomain: "cymorai.firebaseapp.com",
  projectId: "cymorai",
  storageBucket: "cymorai.firebasestorage.app", // Fixed matching the new details
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
