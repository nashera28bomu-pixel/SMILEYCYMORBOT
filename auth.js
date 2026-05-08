import { auth, db } from "./firebase.js";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// =============================================
// SIGN UP LOGIC (EMAIL/PASSWORD)
// =============================================
export const signUp = async (email, password, name) => {
    try {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        const user = res.user;

        // 1. Update the Firebase Auth Profile (used by displayNames)
        await updateProfile(user, { 
            displayName: name || "Explorer" 
        });

        // 2. Create user entry in Firestore
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: name || "Explorer",
            email: email,
            role: "user",
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
        });

        return user;
    } catch (error) {
        console.error("Signup Error:", error.code);
        throw error;
    }
};

// =============================================
// LOGIN LOGIC (EMAIL/PASSWORD)
// =============================================
export const loginEmail = async (email, password) => {
    try {
        const res = await signInWithEmailAndPassword(auth, email, password);
        
        // Update last login timestamp in Firestore
        await setDoc(doc(db, "users", res.user.uid), {
            lastLogin: serverTimestamp()
        }, { merge: true });

        return res.user;
    } catch (error) {
        console.error("Login Error:", error.code);
        throw error;
    }
};

// =============================================
// GOOGLE LOGIN LOGIC
// =============================================
export const googleLogin = async () => {
    try {
        const provider = new GoogleAuthProvider();
        // Force account selection to prevent auto-logging into the wrong account
        provider.setCustomParameters({ prompt: 'select_account' });

        const res = await signInWithPopup(auth, provider);
        const user = res.user;

        // Create or Update user in Firestore (Merge keeps existing data)
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL, // Store their profile pic too
            lastLogin: serverTimestamp()
        }, { merge: true });

        return user;
    } catch (error) {
        console.error("Google Auth Error:", error.code);
        throw error;
    }
};
