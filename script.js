import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    doc,
    getDoc,
    setDoc,
    where
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAqN8kyQ31EFGtWRcy04u_AjhHXEw5moag",
    authDomain: "chat-x-bd50d.firebaseapp.com",
    projectId: "chat-x-bd50d",
    storageBucket: "chat-x-bd50d.firebasestorage.app",
    messagingSenderId: "761770904334",
    appId: "1:761770904334:web:9b5c848fc0267d32a7255f",
    measurementId: "G-3C2WPHNQGY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);

const authSection = $("authSection");
const dashboard = $("dashboard");
const authForm = $("authForm");
const authTitle = $("authTitle");
const authMessage = $("authMessage");
const authButton = $("authButton");
const switchMode = $("switch
