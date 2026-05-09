// ======================================
// CYMOR AI AUTH SYSTEM
// ======================================

import {
    auth,
    db,
    provider
}
from "./firebase.js";

import {

    createUserWithEmailAndPassword,

    signInWithEmailAndPassword,

    signInWithPopup,

    updateProfile,

    signOut

}
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {

    doc,

    setDoc,

    serverTimestamp

}
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ======================================
// SIGN UP
// ======================================

export async function signUp(
    name,
    email,
    password
) {

    try {

        const userCredential =

            await createUserWithEmailAndPassword(

                auth,
                email,
                password
            );

        const user =
            userCredential.user;

        // UPDATE PROFILE

        await updateProfile(
            user,
            {
                displayName: name
            }
        );

        // SAVE USER

        await setDoc(
            doc(db, "users", user.uid),
            {

                uid:
                    user.uid,

                name:
                    name || "User",

                email:
                    user.email,

                createdAt:
                    serverTimestamp(),

                role:
                    "user"
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

        handleFirebaseError(error);
    }
}

// ======================================
// LOGIN USER
// ======================================

export async function loginEmail(
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

        handleFirebaseError(error);
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

        await setDoc(
            doc(db, "users", user.uid),

            {

                uid:
                    user.uid,

                name:
                    user.displayName || "Google User",

                email:
                    user.email,

                photo:
                    user.photoURL || "",

                createdAt:
                    serverTimestamp(),

                role:
                    "user"
            },

            {
                merge: true
            }
        );

        console.log(
            "✅ Google Login successful:",
            user.email
        );

        return user;

    } catch (error) {

        console.error(
            "🔥 Google Login Error:",
            error
        );

        handleFirebaseError(error);
    }
}

// ======================================
// LOGOUT
// ======================================

export async function logoutUser() {

    try {

        await signOut(auth);

        console.log("✅ Logged out");

    } catch (error) {

        console.error(
            "🔥 Logout Error:",
            error
        );
    }
}

// ======================================
// FRIENDLY FIREBASE ERRORS
// ======================================

function handleFirebaseError(error) {

    switch (error.code) {

        case "auth/email-already-in-use":
            throw new Error(
                "Email already exists"
            );

        case "auth/invalid-email":
            throw new Error(
                "Invalid email address"
            );

        case "auth/weak-password":
            throw new Error(
                "Password should be at least 6 characters"
            );

        case "auth/user-not-found":
            throw new Error(
                "Account not found"
            );

        case "auth/wrong-password":
            throw new Error(
                "Incorrect password"
            );

        case "auth/invalid-credential":
            throw new Error(
                "Invalid login credentials"
            );

        case "auth/popup-closed-by-user":
            throw new Error(
                "Google popup closed"
            );

        case "auth/network-request-failed":
            throw new Error(
                "Network connection failed"
            );

        default:
            throw new Error(
                error.message
            );
    }
}
