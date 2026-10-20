import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    addDoc,
    query,
    where,
    orderBy,
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

const $ = id => document.getElementById(id);

let currentUser = null;
let currentDisplayName = "";
let selectedUser = null;
let isSignup = false;

let unsubscribeMessages = null;
let unsubscribeUsers = null;

let allUsers = [];
let messageGeneration = 0;

function setStatus(id, message, isError = false) {
    const element = $(id);

    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? "#ff7777" : "#55d6a5";
}

function showError(error, location = "errorMessage") {
    console.error(error);

    const messages = {
        "auth/email-already-in-use": "This email already has an account.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/invalid-credential": "Email or password is incorrect.",
        "auth/user-not-found": "No account found. Please sign up.",
        "auth/wrong-password": "Incorrect password.",
        "auth/weak-password": "Use a stronger password with at least 6 characters.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "permission-denied": "Permission denied. Check your Firestore security rules.",
        "unavailable": "Network issue. Please check your internet connection."
    };

    const message =
        messages[error.code] ||
        error.message ||
        "Something went wrong.";

    setStatus(location, message, true);
}

function setAvatar(element, name) {
    element.textContent = (name || "C").trim().charAt(0).toUpperCase() || "C";
}

function getConversationId(uid1, uid2) {
    return [uid1, uid2].sort().join("_");
}

function formatTime(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== "function") {
        return "";
    }

    return timestamp.toDate().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

/* LOGIN / SIGNUP */

$("switchMode").addEventListener("click", () => {
    isSignup = !isSignup;

    $("authTitle").textContent = isSignup ? "Create Account" : "Login";
    $("authButton").textContent = isSignup ? "Sign Up" : "Login";
    $("switchLabel").textContent = isSignup
        ? "Already have an account?"
        : "Don't have an account?";

    $("switchMode").textContent = isSignup ? "Login" : "Sign up";
    $("password").autocomplete = isSignup
        ? "new-password"
        : "current-password";

    setStatus("errorMessage", "");
    setStatus("authMessage", "");
});

$("authForm").addEventListener("submit", async event => {
    event.preventDefault();

    const email = $("email").value.trim();
    const password = $("password").value;

    $("authButton").disabled = true;
    $("authButton").textContent = "Please wait...";

    setStatus("errorMessage", "");
    setStatus("authMessage", "");

    try {
        if (isSignup) {
            await createUserWithEmailAndPassword(auth, email, password);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        showError(error);
    } finally {
        $("authButton").disabled = false;
        $("authButton").textContent = isSignup ? "Sign Up" : "Login";
    }
});

/* AUTH STATE */

onAuthStateChanged(auth, async user => {
    stopListeners();

    if (!user) {
        currentUser = null;
        currentDisplayName = "";
        selectedUser = null;
        allUsers = [];

        $("dashboard").classList.add("hidden");
        $("dashboard").classList.remove("chat-open");
        $("authSection").classList.remove("hidden");

        $("chatBox").replaceChildren();
        $("usersList").replaceChildren();

        return;
    }

    currentUser = user;

    $("authSection").classList.add("hidden");
    $("dashboard").classList.remove("hidden");
    $("dashboard").classList.remove("chat-open");

    $("userEmail").textContent = user.email || "";

    await loadProfile(user);

    $("myDisplayName").textContent =
        currentDisplayName || "Your Profile";

    setAvatar($("myAvatar"), currentDisplayName);

    $("chatWelcome").classList.remove("hidden");
    $("activeChat").classList.add("hidden");

    selectedUser = null;

    startUsersListener();
});

/* PROFILE */

async function loadProfile(user) {
    const userRef = doc(db, "users", user.uid);

    try {
        const snapshot = await getDoc(userRef);

        if (snapshot.exists()) {
            const data = snapshot.data();

            currentDisplayName =
                data.displayName ||
                user.email?.split("@")[0] ||
                "User";
        } else {
            currentDisplayName = user.email?.split("@")[0] || "User";

            await setDoc(userRef, {
                displayName: currentDisplayName,
                uid: user.uid,
                createdAt: serverTimestamp()
            });
        }

        $("displayName").value = currentDisplayName;
        $("myDisplayName").textContent = currentDisplayName;

        setAvatar($("myAvatar"), currentDisplayName);
    } catch (error) {
        showError(error, "profileStatus");

        currentDisplayName = user.email?.split("@")[0] || "User";
        $("displayName").value = currentDisplayName;
        $("myDisplayName").textContent = currentDisplayName;

        setAvatar($("myAvatar"), currentDisplayName);
    }
}

$("profileForm").addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentUser) return;

    const name = $("displayName").value.trim();

    if (!name || name.length > 40) {
        setStatus("profileStatus", "Name must contain 1–40 characters.", true);
        return;
    }

    $("saveProfileButton").disabled = true;
    setStatus("profileStatus", "Saving...");

    try {
        await setDoc(
            doc(db, "users", currentUser.uid),
            {
                displayName: name,
                uid: currentUser.uid,
                email: currentUser.email || ""
            },
            { merge: true }
        );

        currentDisplayName = name;

        $("myDisplayName").textContent = name;
        setAvatar($("myAvatar"), name);

        setStatus("profileStatus", "Profile saved successfully.");

        startUsersListener();
    } catch (error) {
        showError(error, "profileStatus");
    } finally {
        $("saveProfileButton").disabled = false;
    }
});

/* CONTACT LIST */

function startUsersListener() {
    if (!currentUser) return;

    if (unsubscribeUsers) {
        unsubscribeUsers();
    }

    const usersQuery = query(collection(db, "users"));

    unsubscribeUsers = onSnapshot(
        usersQuery,
        snapshot => {
            allUsers = [];

            snapshot.forEach(userDoc => {
                if (userDoc.id === currentUser.uid) return;

                const data = userDoc.data();

                allUsers.push({
                    uid: userDoc.id,
                    displayName: data.displayName || "User",
                    email: data.email || ""
                });
            });

            renderUsers();
        },
        error => {
            showError(error, "profileStatus");

            $("usersList").textContent =
                "Unable to load people. Check Firestore rules.";
        }
    );
}

function renderUsers() {
    const container = $("usersList");
    const search = $("userSearch").value.trim().toLowerCase();

    container.replaceChildren();

    const filteredUsers = allUsers.filter(user => {
        return (
            user.displayName.toLowerCase().includes(search) ||
            user.email.toLowerCase().includes(search)
        );
    });

    $("contactCount").textContent = filteredUsers.length;

    if (filteredUsers.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-text";
        empty.textContent = search
            ? "No matching people found."
            : "No other users yet. Ask a friend to create an account.";

        container.appendChild(empty);
        return;
    }

    filteredUsers.forEach(user => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "contact-button";

        if (selectedUser?.uid === user.uid) {
            button.classList.add("selected");
        }

        const avatar = document.createElement("div");
        avatar.className = "contact-avatar";
        setAvatar(avatar, user.displayName);

        const details = document.createElement("div");
        details.className = "contact-details";

        const name = document.createElement("strong");
        name.textContent = user.displayName;

        const email = document.createElement("small");
        email.textContent = user.email || "CHATX member";

        details.append(name, email);
        button.append(avatar, details);

        button.addEventListener("click", () => openChat(user));

        container.appendChild(button);
    });
}

$("userSearch").addEventListener("input", renderUsers);

/* OPEN CHAT */

function stopMessageListener() {
    messageGeneration++;

    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }
}

function stopListeners() {
    stopMessageListener();

    if (unsubscribeUsers) {
        unsubscribeUsers();
        unsubscribeUsers = null;
    }
}

function openChat(user) {
    if (!currentUser || user.uid === currentUser.uid) return;

    stopMessageListener();

    selectedUser = user;
    renderUsers();

    $("chatWelcome").classList.add("hidden");
    $("activeChat").classList.remove("hidden");
    $("dashboard").classList.add("chat-open");

    $("chatTitle").textContent = user.displayName;
    $("chatSubtitle").textContent = user.email || "CHATX member";

    setAvatar($("chatAvatar"), user.displayName);

    $("chatBox").replaceChildren();

    const loading = document.createElement("p");
    loading.className = "empty-text";
    loading.textContent = "Loading messages...";
    $("chatBox").appendChild(loading);

    const generation = messageGeneration;
    const conversationId = getConversationId(currentUser.uid, user.uid);

    const messagesQuery = query(
        collection(db, "messages"),
        where("conversationId", "==", conversationId),
        orderBy("createdAt", "asc")
    );

    unsubscribeMessages = onSnapshot(
        messagesQuery,
        snapshot => {
            if (generation !== messageGeneration) return;

            const chatBox = $("chatBox");
            chatBox.replaceChildren();

            if (snapshot.empty) {
                const empty = document.createElement("p");
                empty.className = "empty-text";
                empty.textContent = "No messages yet. Say hello!";
                chatBox.appendChild(empty);
                return;
            }

            snapshot.forEach(messageDoc => {
                const message = messageDoc.data();
                const bubble = document.createElement("div");

                bubble.className =
                    "message-bubble " +
                    (message.uid === currentUser.uid ? "sent" : "received");

                if (message.uid !== currentUser.uid) {
                    const sender = document.createElement("span");
                    sender.className = "message-sender";
                    sender.textContent = message.displayName || "User";
                    bubble.appendChild(sender);
                }

                const text = document.createElement("div");
                text.textContent = message.text || "";

                const time = document.createElement("span");
                time.className = "message-time";
                time.textContent = formatTime(message.createdAt);

                bubble.append(text, time);
                chatBox.appendChild(bubble);
            });

            chatBox.scrollTop = chatBox.scrollHeight;
        },
        error => {
            if (generation !== messageGeneration) return;

            showError(error, "chatStatus");
            $("chatBox").replaceChildren();

            const errorText = document.createElement("p");
            errorText.className = "empty-text";
            errorText.textContent =
                "Unable to load messages. Check Firestore rules and indexes.";

            $("chatBox").appendChild(errorText);
        }
    );
}

/* SEND MESSAGE */

$("chatForm").addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentUser || !selectedUser) {
        setStatus("chatStatus", "Please select a person first.", true);
        return;
    }

    const text = $("messageInput").value.trim();

    if (!text) return;

    if (text.length > 1000) {
        setStatus("chatStatus", "Message is too long.", true);
        return;
    }

    const conversationId = getConversationId(
        currentUser.uid,
        selectedUser.uid
    );

    const participants = [
        currentUser.uid,
        selectedUser.uid
    ].sort();

    $("sendButton").disabled = true;
    setStatus("chatStatus", "Sending...");

    try {
        await addDoc(collection(db, "messages"), {
            text,
            uid: currentUser.uid,
            displayName: currentDisplayName || "User",
            conversationId,
            participants,
            createdAt: serverTimestamp()
        });

        $("messageInput").value = "";
        setStatus("chatStatus", "");
        $("messageInput").focus();
    } catch (error) {
        showError(error, "chatStatus");
    } finally {
        $("sendButton").disabled = false;
    }
});

/* LOGOUT */

$("logoutButton").addEventListener("click", async () => {
    try {
        await signOut(auth);
    } catch (error) {
        showError(error, "profileStatus");
    }
});
