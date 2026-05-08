// ======================================
// CYMOR AI AUTH SYSTEM
// FIREBASE AUTH + FIRESTORE
// ======================================

import {
    auth,
    db,
    provider
} from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ======================================
// SIGN UP
// ======================================
export async function signUp(
    email,
    password,
    name
) {

    try {

        // CREATE USER
        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

        const user =
            userCredential.user;

        // UPDATE DISPLAY NAME
        await updateProfile(user, {
            displayName: name
        });

        // SAVE USER DATA
        await setDoc(
            doc(db, "users", user.uid),
            {
                uid: user.uid,
                name: name || "User",
                email: user.email,
                createdAt: new Date(),
                role: "user"
            }
        );

        console.log(
            "✅ Signup successful:",
            user.email
        );

        return user;

    } catch (error) {

        console.error(
            "🔥 Signup Error:",
            error
        );

        throw error;
    }
}

// ======================================
// LOGIN USER
// ======================================
export async function loginUser(
    email,
    password
) {

    try {

        const userCredential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

        console.log(
            "✅ Login successful:",
            userCredential.user.email
        );

        return userCredential.user;

    } catch (error) {

        console.error(
            "🔥 Login Error:",
            error
        );

        throw error;
    }
}

// ======================================
// GOOGLE LOGIN
// ======================================
export async function googleLogin() {

    try {

        const result =
            await signInWithPopup(
                auth,
                provider
            );

        const user =
            result.user;

        // SAVE USER TO FIRESTORE
        await setDoc(
            doc(db, "users", user.uid),
            {
                uid: user.uid,
                name: user.displayName || "Google User",
                email: user.email,
                photo: user.photoURL || "",
                createdAt: new Date(),
                role: "user"
            },
            {
                merge: true
            }
        );

        console.log(
            "✅ Google login successful:",
            user.email
        );

        return user;

    } catch (error) {

        console.error(
            "🔥 Google Login Error:",
            error
        );

        throw error;
    }
}
