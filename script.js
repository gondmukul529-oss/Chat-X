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
    setDoc
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

const profileForm = document.getElementById("profileForm");
const displayNameInput = document.getElementById("displayName");
const profileEmail = document.getElementById("profileEmail");
const profileStatus = document.getElementById("profileStatus");
const saveProfileButton = document.getElementById("saveProfileButton");

const usersList = document.getElementById("usersList");

let isSignup = false;
let currentUser = null;
let currentDisplayName = "";
let unsubscribeMessages = null;
let unsubscribeUsers = null;

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
            "auth/email-already-in-use": "Email already registered.",
            "auth/invalid-email": "Enter a valid email.",
            "auth/invalid-credential": "Incorrect email or password.",
            "auth/weak-password": "Choose a stronger password.",
            "auth/network-request-failed": "Check your internet connection.",
            "auth/too-many-requests": "Too many attempts. Try again later."
        };

        errorMessage.textContent =
            messages[error.code] || "Authentication failed.";
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

        currentDisplayName = profileSnap.exists()
            ? profileSnap.data().displayName || ""
            : "";

        displayNameInput.value = currentDisplayName;

        if (!currentDisplayName) {
            profileStatus.textContent = "Please choose your display name.";
        }
    } catch (error) {
        console.error(error);
        profileStatus.textContent =
            "Unable to load profile. Check Firestore rules.";
    }
}

profileForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentUser) return;

    const name = displayNameInput.value.trim();

    if (!name || name.length > 40) {
        profileStatus.textContent = "Name must be 1–40 characters.";
        return;
    }

    saveProfileButton.disabled = true;
    profileStatus.textContent = "";

    try {
        await setDoc(
            doc(db, "users", currentUser.uid),
            {
                displayName: name,
                updatedAt: serverTimestamp()
            },
            { merge: true }
        );

        currentDisplayName = name;
        profileStatus.textContent = "Profile saved successfully!";
    } catch (error) {
        console.error(error);
        profileStatus.textContent =
            "Profile save failed. Check Firestore rules.";
    } finally {
        saveProfileButton.disabled = false;
    }
});

function showMessages() {
    if (unsubscribeMessages) unsubscribeMessages();

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
                sender.textContent =
                    message.displayName || "CHATX User";

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
                "Unable to load messages. Check Firestore rules.";
        }
    );
}

chatForm.addEventListener("submit", async event => {
    event.preventDefault();

    const text = messageInput.value.trim();

    if (!text || !currentUser) return;

    if (!currentDisplayName) {
        chatStatus.textContent = "Save your profile name first.";
        return;
    }

    sendButton.disabled = true;
    chatStatus.textContent = "";

    try {
        await addDoc(collection(db, "messages"), {
            text,
            uid: currentUser.uid,
            displayName: currentDisplayName,
            createdAt: serverTimestamp()
        });

        messageInput.value = "";
        messageInput.focus();
    } catch (error) {
        console.error(error);
        chatStatus.textContent =
            "Message failed to send. Check Firestore rules.";
    } finally {
        sendButton.disabled = false;
    }
});

function showUsers() {
    if (unsubscribeUsers) unsubscribeUsers();

    usersList.replaceChildren();

    unsubscribeUsers = onSnapshot(
        collection(db, "users"),
        snapshot => {
            usersList.replaceChildren();

            let count = 0;

            snapshot.forEach(userDoc => {
                const user = userDoc.data();

                if (!user.displayName) return;

                count++;

                const item = document.createElement("div");
                item.className = "message";

                const name = document.createElement("strong");
                name.textContent = user.displayName;

                item.appendChild(name);
                usersList.appendChild(item);
            });

            if (count === 0) {
                usersList.textContent = "No profiles found yet.";
            }
        },
        error => {
            console.error(error);
            usersList.textContent =
                "Unable to load users. Check Firestore rules.";
        }
    );
}

document.getElementById("logoutButton").addEventListener("click", async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error(error);
        chatStatus.textContent = "Unable to log out.";
    }
});

onAuthStateChanged(auth, async user => {
    currentUser = user;
    currentDisplayName = "";

    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }

    if (unsubscribeUsers) {
        unsubscribeUsers();
        unsubscribeUsers = null;
    }

    if (user) {
        authSection.classList.add("hidden");
        dashboard.classList.remove("hidden");

        document.getElementById("userEmail").textContent = user.email || "";

        await loadProfile(user);

        if (currentUser?.uid === user.uid) {
            showMessages();
            showUsers();
        }
    } else {
        dashboard.classList.add("hidden");
        authSection.classList.remove("hidden");

        authForm.reset();
        chatForm.reset();
        chatBox.replaceChildren();
        usersList.replaceChildren();

        chatStatus.textContent = "";
        profileStatus.textContent = "";
        displayNameInput.value = "";
    }
});
