import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

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

const authSection = document.getElementById("authSection");
const dashboard = document.getElementById("dashboard");
const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authMessage = document.getElementById("authMessage");
const authButton = document.getElementById("authButton");
const switchMode = document.getElementById("switchMode");
const switchLabel = document.getElementById("switchLabel");
const errorMessage = document.getElementById("errorMessage");

let isSignup = false;

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
    document.getElementById("password").autocomplete =
        isSignup ? "new-password" : "current-password";

    errorMessage.textContent = "";
});

authForm.addEventListener("submit", async event => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

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
            "auth/email-already-in-use": "This email is already registered.",
            "auth/invalid-email": "Please enter a valid email.",
            "auth/invalid-credential": "Email or password is incorrect.",
            "auth/weak-password": "Choose a stronger password.",
            "auth/network-request-failed": "Check your internet connection.",
            "auth/too-many-requests": "Too many attempts. Try again later."
        };

        errorMessage.textContent =
            messages[error.code] || "Authentication failed. Please try again.";
    } finally {
        authButton.disabled = false;
    }
});

document.getElementById("logoutButton").addEventListener("click", async () => {
    try {
        await signOut(auth);
    } catch {
        errorMessage.textContent = "Unable to log out. Please try again.";
    }
});

onAuthStateChanged(auth, user => {
    if (user) {
        authSection.classList.add("hidden");
        dashboard.classList.remove("hidden");
        document.getElementById("userEmail").textContent = user.email;
    } else {
        dashboard.classList.add("hidden");
        authSection.classList.remove("hidden");
        authForm.reset();
    }
});
