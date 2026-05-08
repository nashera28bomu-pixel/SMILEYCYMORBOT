import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "firebase/auth";

import { doc, setDoc, getDoc } from "firebase/firestore";

// =============================================
// GOOGLE PROVIDER
// =============================================
const provider = new GoogleAuthProvider();

// =============================================
// SIGN UP (EMAIL + PASSWORD)
// =============================================
export async function signUp(email, password, name) {
    try {
        const userCredential =
            await createUserWithEmailAndPassword(auth, email, password);

        const user = userCredential.user;

        // Save user profile in Firestore
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: name,
            email: email,
            createdAt: new Date().toISOString(),
            role: "user"
        });

        console.log("🔥 User registered:", user.email);

        return user;

    } catch (error) {
        console.error("❌ Signup error:", error.message);
        throw error;
    }
}

// =============================================
// LOGIN (EMAIL + PASSWORD)
// =============================================
export async function login(email, password) {
    try {
        const userCredential =
            await signInWithEmailAndPassword(auth, email, password);

        const user = userCredential.user;

        console.log("✅ Logged in:", user.email);

        return user;

    } catch (error) {
        console.error("❌ Login error:", error.message);
        throw error;
    }
}

// =============================================
// GOOGLE LOGIN
// =============================================
export async function googleLogin() {
    try {
        const result =
            await signInWithPopup(auth, provider);

        const user = result.user;

        // Save or update Firestore profile
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            createdAt: new Date().toISOString(),
            role: "user"
        }, { merge: true });

        console.log("🌐 Google login success:", user.email);

        return user;

    } catch (error) {
        console.error("❌ Google login error:", error.message);
        throw error;
    }
}

// =============================================
// LOGOUT
// =============================================
export async function logout() {
    await signOut(auth);
    console.log("👋 User logged out");
}

// =============================================
// GET CURRENT USER DATA (FIRESTORE)
// =============================================
export async function getUserData(uid) {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
        return snap.data();
    } else {
        return null;
    }
}

// =============================================
// AUTH STATE LISTENER (IMPORTANT FOR YOUR APP)
// =============================================
export function onUserStateChanged(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userData = await getUserData(user.uid);

            callback({
                uid: user.uid,
                email: user.email,
                ...userData
            });
        } else {
            callback(null);
        }
    });
}
