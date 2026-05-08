import { auth, db } from "./firebase.js";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// SIGN UP LOGIC
export const signUp = async (email, password, name) => {
    try {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        const user = res.user;

        // Add display name to Firebase Auth
        await updateProfile(user, { displayName: name });

        // Create user document in Firestore
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: name,
            email: email,
            role: "user",
            createdAt: serverTimestamp()
        });

        return user;
    } catch (error) {
        throw error;
    }
};

// LOGIN LOGIC
export const loginEmail = async (email, password) => {
    try {
        const res = await signInWithEmailAndPassword(auth, email, password);
        return res.user;
    } catch (error) {
        throw error;
    }
};

// GOOGLE LOGIN LOGIC
export const googleLogin = async () => {
    try {
        const provider = new GoogleAuthProvider();
        const res = await signInWithPopup(auth, provider);
        const user = res.user;

        // Create or Update user in Firestore
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: user.displayName,
            email: user.email,
            lastLogin: serverTimestamp()
        }, { merge: true });

        return user;
    } catch (error) {
        throw error;
    }
};
