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
    where,
    orderBy,
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

let isSignup = false;
let currentUser = null;
let currentDisplayName = "";
let selectedUser = null;
let unsubscribeMessages = null;
let unsubscribeUsers = null;
let messageGeneration = 0;

function showStatus(message) {
    chatStatus.textContent = message;
}

function stopMessages() {
    messageGeneration++;

    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }
}

function getConversationId(uid1, uid2) {
    return [uid1, uid2].sort().join("_");
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

    $("password").autocomplete =
        isSignup ? "new-password" : "current-password";

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
            messages[error.code] || `${error.code}: ${error.message}`;
    } finally {
        authButton.disabled = false;
    }
});

async function loadProfile(user) {
    profileEmail.textContent = user.email || "";
    profileStatus.textContent = "";

    try {
        const profileSnap = await getDoc(doc(db, "users", user.uid));

        if (currentUser?.uid !== user.uid) return;

        currentDisplayName = profileSnap.exists()
            ? profileSnap.data().displayName || ""
            : "";

        displayNameInput.value = currentDisplayName;

        if (!currentDisplayName) {
            profileStatus.textContent = "Please choose your display name.";
        }
    } catch (error) {
        console.error("Profile error:", error);
        profileStatus.textContent =
            `Unable to load profile: ${error.code || error.message}`;
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
        await setDoc(doc(db, "users", currentUser.uid), {
            displayName: name,
            updatedAt: serverTimestamp()
        }, { merge: true });

        currentDisplayName = name;
        profileStatus.textContent = "Profile saved successfully!";
    } catch (error) {
        console.error("Save profile error:", error);
        profileStatus.textContent =
            `Profile save failed: ${error.code || error.message}`;
    } finally {
        saveProfileButton.disabled = false;
    }
});

function openChat(user) {
    if (!currentUser || user.uid === currentUser.uid) return;

    selectedUser = user;
    stopMessages();

    chatBox.replaceChildren();
    showStatus("");

    $("chatTitle").textContent = `CHATX Chat — ${user.displayName}`;
    $("chatSubtitle").textContent = `Private conversation with ${user.displayName}`;

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

            chatBox.replaceChildren();

            snapshot.forEach(messageDoc => {
                const message = messageDoc.data();

                const item = document.createElement("div");
                item.className = "message";

                const sender = document.createElement("small");
                sender.textContent =
                    message.uid === currentUser.uid
                        ? "You"
                        : message.displayName || user.displayName;

                const body = document.createElement("div");
                body.textContent = message.text || "";

                item.append(sender, body);
                chatBox.appendChild(item);
            });

            if (snapshot.empty) {
                chatBox.textContent = "No messages yet. Say hello!";
            }

            chatBox.scrollTop = chatBox.scrollHeight;
            showStatus("");
        },
        error => {
            console.error("Load messages error:", error);

            showStatus(
                `Unable to load messages: ${error.code || error.message}`
            );
        }
    );
}

chatForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentUser || !selectedUser) {
        showStatus("Select a person from the People list first.");
        return;
    }

    const text = messageInput.value.trim();

    if (!text) return;

    if (!currentDisplayName) {
        showStatus("Save your profile name first.");
        return;
    }

    if (text.length > 1000) {
        showStatus("Message must be 1000 characters or fewer.");
        return;
    }

    sendButton.disabled = true;

    try {
        const participants = [
            currentUser.uid,
            selectedUser.uid
        ].sort();

        const conversationId = participants.join("_");

        await addDoc(collection(db, "messages"), {
            text,
            uid: currentUser.uid,
            displayName: currentDisplayName,
            conversationId,
            participants,
            createdAt: serverTimestamp()
        });

        messageInput.value = "";
        showStatus("");
        messageInput.focus();
    } catch (error) {
        console.error("Send message error:", error);

        showStatus(
            `Message failed: ${error.code || error.message}`
        );
    } finally {
        sendButton.disabled = false;
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
                if (userDoc.id === currentUser?.uid) return;

                const userData = userDoc.data();

                if (!userData.displayName) return;

                count++;

                const item = document.createElement("button");
                item.type = "button";
                item.className = "message";
                item.style.width = "100%";
                item.style.textAlign = "left";
                item.style.cursor = "pointer";

                const name = document.createElement("strong");
                name.textContent = userData.displayName;

                item.appendChild(name);

                item.addEventListener("click", () => {
                    openChat({
                        uid: userDoc.id,
                        displayName: userData.displayName
                    });
                });

                usersList.appendChild(item);
            });

            if (count === 0) {
                usersList.textContent =
                    "No other users yet. Create a second account to test chat.";
            }
        },
        error => {
            console.error("Load users error:", error);

            usersList.textContent =
                `Unable to load users: ${error.code || error.message}`;
        }
    );
}

$("logoutButton").addEventListener("click", async () => {
    try {
        stopMessages();

        if (unsubscribeUsers) {
            unsubscribeUsers();
            unsubscribeUsers = null;
        }

        await signOut(auth);
    } catch (error) {
        console.error("Logout error:", error);
        showStatus("Unable to log out.");
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
        $("chatTitle").textContent = "CHATX Chat";
        $("chatSubtitle").textContent = "Select a user to start chatting.";

        chatBox.replaceChildren();
        showStatus("");

        await loadProfile(user);

        if (currentUser?.uid === user.uid) {
            showUsers();
        }
    } else {
        dashboard.classList.add("hidden");
        authSection.classList.remove("hidden");

        authForm.reset();
        chatForm.reset();
        chatBox.replaceChildren();
        usersList.replaceChildren();

        showStatus("");
        profileStatus.textContent = "";
        displayNameInput.value = "";
    }
});
