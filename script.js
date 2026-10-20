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

function showError(element, prefix, error) {
    console.error(prefix, error);

    element.textContent =
        `${prefix}: ${error.code || "unknown"} - ${error.message || "Unknown error"}`;
}

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
    authButton.textContent = isSignup ? "Creating..." : "Logging in...";

    try {
        if (isSignup) {
            await createUserWithEmailAndPassword(auth, email, password);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        showError(errorMessage, "Login/Signup failed", error);
    } finally {
        authButton.disabled = false;
        authButton.textContent = isSignup ? "Sign Up" : "Login";
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
            profileStatus.textContent = "Choose and save your display name.";
        }
    } catch (error) {
        showError(profileStatus, "Profile load failed", error);
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
        showError(profileStatus, "Profile save failed", error);
    } finally {
        saveProfileButton.disabled = false;
    }
});

function stopMessages() {
    chatRequest++;

    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }
}

function showMessages() {
    stopMessages();

    chatBox.replaceChildren();
    chatStatus.textContent = "";

    if (!currentUser || !selectedUser) {
        chatTitle.textContent = "CHATX Chat";
        chatSubtitle.textContent = "Select a user to start chatting.";
        chatBox.textContent = "Choose someone from the People list.";
        sendButton.disabled = true;
        return;
    }

    const requestId = chatRequest;
    const otherUser = selectedUser;
    const pair = [currentUser.uid, otherUser.uid].sort();
    const conversationId = `${pair[0]}_${pair[1]}`;

    chatTitle.textContent = otherUser.displayName;
    chatSubtitle.textContent = "Private conversation";
    sendButton.disabled = false;

    const messagesQuery = query(
        collection(db, "messages"),
        where("conversationId", "==", conversationId),
        orderBy("createdAt", "asc"),
        limit(100)
    );

    unsubscribeMessages = onSnapshot(
        messagesQuery,
        snapshot => {
            if (requestId !== chatRequest) return;

            chatBox.replaceChildren();

            if (snapshot.empty) {
                chatBox.textContent = "No messages yet. Say hello!";
            }

            snapshot.forEach(messageDoc => {
                const message = messageDoc.data();
                const item = document.createElement("div");
                item.className = "message";

                const sender = document.createElement("small");
                sender.textContent =
                    message.uid === currentUser.uid
                        ? "You"
                        : otherUser.displayName;

                const text = document.createElement("div");
                text.textContent = message.text || "";

                item.append(sender, text);
                chatBox.appendChild(item);
            });

            chatBox.scrollTop = chatBox.scrollHeight;
            chatStatus.textContent = "";
        },
        error => {
            showError(chatStatus, "Messages load failed", error);
        }
    );
}

chatForm.addEventListener("submit", async event => {
    event.preventDefault();

    const text = messageInput.value.trim();

    if (!text || !currentUser || !selectedUser) {
        chatStatus.textContent = "Choose a user before sending a message.";
        return;
    }

    if (!currentDisplayName) {
        chatStatus.textContent = "Save your profile name first.";
        return;
    }

    const recipient = selectedUser;
    const pair = [currentUser.uid, recipient.uid].sort();
    const conversationId = `${pair[0]}_${pair[1]}`;

    sendButton.disabled = true;

    try {
        await addDoc(collection(db, "messages"), {
            conversationId,
            participants: pair,
            uid: currentUser.uid,
            displayName: currentDisplayName,
            text,
            createdAt: serverTimestamp()
        });

        messageInput.value = "";
        messageInput.focus();
        chatStatus.textContent = "";
    } catch (error) {
        showError(chatStatus, "Message send failed", error);
    } finally {
        sendButton.disabled = !selectedUser;
    }
});

function showUsers() {
    if (unsubscribeUsers) {
        unsubscribeUsers();
        unsubscribeUsers = null;
    }

    usersList.replaceChildren();

    unsubscribeUsers = onSnapshot(
        collection(db, "users"),
        snapshot => {
            usersList.replaceChildren();

            let count = 0;

            snapshot.forEach(userDoc => {
                const user = userDoc.data();

                if (!user.displayName || userDoc.id === currentUser?.uid) {
                    return;
                }

                count++;

                const button = document.createElement("button");
                button.type = "button";
                button.className = "message";
                button.style.width = "100%";
                button.style.textAlign = "left";
                button.textContent = user.displayName;

                if (selectedUser?.uid === userDoc.id) {
                    button.style.border = "1px solid #38bdf8";
                }

                button.addEventListener("click", () => {
                    selectedUser = {
                        uid: userDoc.id,
                        displayName: user.displayName
                    };

                    showUsers();
                    showMessages();
                });

                usersList.appendChild(button);
            });

            if (count === 0) {
                usersList.textContent = "No other profiles found yet.";
            }
        },
        error => {
            showError(usersList, "Users load failed", error);
        }
    );
}

$("logoutButton").addEventListener("click", async () => {
    try {
        await signOut(auth);
    } catch (error) {
        showError(chatStatus, "Logout failed", error);
    }
});

onAuthStateChanged(auth, async user => {
    currentUser = user;
    currentDisplayName = "";
    selectedUser = null;

    stopMessages();

    if (unsubscribeUsers) {
        unsubscribeUsers();
        unsubscribeUsers = null;
    }

    if (user) {
        authSection.classList.add("hidden");
        dashboard.classList.remove("hidden");
        $("userEmail").textContent = user.email || "";

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
        sendButton.disabled = true;
    }
});
