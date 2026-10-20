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
const switchMode = $("switchMode");
const switchLabel = $("switchLabel");
const errorMessage = $("errorMessage");

const chatBox = $("chatBox");
const chatForm = $("chatForm");
const messageInput = $("messageInput");
const sendButton = $("sendButton");
const chatStatus = $("chatStatus");

const profileForm = $("profileForm");
const displayNameInput = $("displayName");
const profileEmail = $("profileEmail");
const profileStatus = $("profileStatus");
const saveProfileButton = $("saveProfileButton");

const usersList = $("usersList");
const chatTitle = $("chatTitle");
const chatSubtitle = $("chatSubtitle");

let isSignup = false;
let currentUser = null;
let currentDisplayName = "";
let selectedUser = null;
let unsubscribeMessages = null;
let unsubscribeUsers = null;
let chatRequest = 0;

switchMode.addEventListener("click", () => {
    isSignup = !isSignup;

    authTitle.textContent = isSignup ? "Create Account" : "Welcome Back";
    authMessage.textContent = isSignup
        ? "Create your CHATX account"
        : "Login to continue to CHATX";

    authButton.textContent = isSignup ? "Sign Up" : "Login";
    switchLabel.textContent = isSignup
        ? "Already have an account?"
        : "Don't have an account?";

    switchMode.textContent = isSignup ? "Login" : "Sign Up";
    $("password").autocomplete = isSignup
        ? "new-password"
        : "current-password";

    errorMessage.textContent = "";
});

authForm.addEventListener("submit", async event => {
    event.preventDefault();

    const email = $("email").value.trim();
    const password = $("password").value;

    errorMessage.textContent = "";
    authButton.disabled = true;

    try {
        if (isSignup) {
            await createUserWithEmailAndPassword(auth, email, password);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        const messages = {
            "auth/email-already-in-use": "Email already registered.",
            "auth/invalid-email": "Enter a valid email.",
            "auth/invalid-credential": "Incorrect email or password.",
            "auth/weak-password": "Choose a stronger password.",
            "auth/network-request-failed": "Check your internet connection.",
            "auth/too-many-requests": "Too many attempts. Try again later."
        };

        errorMessage.textContent =
            messages[error.code] || "Login or signup failed.";
    } finally {
        authButton.disabled = false;
    }
});

async function loadProfile(user) {
    profileEmail.textContent = user.email || "";
    profileStatus.textContent = "";

    try {
        const profileRef = doc(db, "users", user.uid);
        const profileSnap = await getDoc(profileRef);

        if (currentUser?.uid !== user.uid) return;

        currentDisplayName = profile
