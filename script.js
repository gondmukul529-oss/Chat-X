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
    serverTimestamp
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

const authSection = document.getElementById("authSection");
const dashboard = document.getElementById("dashboard");
const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authMessage = document.getElementById("authMessage");
const authButton = document.getElementById("authButton");
const switchMode = document.getElementById("switchMode");
const switchLabel = document.getElementById("switchLabel");
const errorMessage = document.getElementById("errorMessage");

const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const chatStatus = document.getElementById("chatStatus");

let isSignup = false;
let unsubscribeMessages = null;
let currentUser = null;

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

function showMessages() {
    if (unsubscribeMessages) {
        unsubscribeMessages();
    }

    chatBox.replaceChildren();

    const messagesQuery = query(
        collection(db, "messages"),
        orderBy("createdAt", "asc"),
        limit(100)
    );

    unsubscribeMessages = onSnapshot(
        messagesQuery,
        snapshot => {
            chatBox.replaceChildren();

            snapshot.forEach(messageDoc => {
                const message = messageDoc.data();

                const item = document.createElement("div");
                item.className = "message";

                const sender = document.createElement("small");
                sender.textContent = message.email || "CHATX User";

                const text = document.createElement("div");
                text.textContent = message.text || "";

                item.append(sender, text);
                chatBox.appendChild(item);
            });

            chatBox.scrollTop = chatBox.scrollHeight;
            chatStatus.textContent = "";
        },
        error => {
            console.error(error);
            chatStatus.textContent =
                "Unable to load messages. Check Firestore rules and connection.";
        }
    );
}

chatForm.addEventListener("submit", async event => {
    event.preventDefault();

    const text = messageInput.value.trim();

    if (!text || !currentUser) return;

    sendButton.disabled = true;
    chatStatus.textContent = "";

    try {
        await addDoc(collection(db, "messages"), {
            text: text,
            uid: currentUser.uid,
            email: currentUser.email || "CHATX User",
            createdAt: serverTimestamp()
        });

        messageInput.value = "";
        messageInput.focus();
    } catch (error) {
        console.error(error);
        chatStatus.textContent =
            "Message send nahi hua. Firestore rules check karo.";
    } finally {
        sendButton.disabled = false;
    }
});

document.getElementById("logoutButton").addEventListener("click", async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error(error);
        chatStatus.textContent = "Unable to log out. Please try again.";
    }
});

onAuthStateChanged(auth, user => {
    currentUser = user;

    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }

    if (user) {
        authSection.classList.add("hidden");
        dashboard.classList.remove("hidden");

        document.getElementById("userEmail").textContent = user.email || "";
        showMessages();
    } else {
        dashboard.classList.add("hidden");
        authSection.classList.remove("hidden");
        authForm.reset();
        chatForm.reset();
        chatBox.replaceChildren();
        chatStatus.textContent = "";
    }
});
