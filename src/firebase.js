import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBliAhDjrTTuq8QePHk1rJKLL0kscC1hmQ",
  authDomain: "plumb-quote-3.firebaseapp.com",
  projectId: "plumb-quote-3",
  storageBucket: "plumb-quote-3.firebasestorage.app",
  messagingSenderId: "217307599255",
  appId: "1:217307599255:web:3db108cd6c2936abc4f4d2"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);