import { auth, db, provider } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function signUp(email, password, name) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await updateProfile(user, { displayName: name });

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name: name,
    email: user.email,
    createdAt: new Date(),
    role: "user"
  });

  return user;
}

export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function googleLogin() {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name: user.displayName || "Google User",
    email: user.email,
    photo: user.photoURL || "",
    createdAt: new Date(),
    role: "user"
  }, { merge: true });

  return user;
}
