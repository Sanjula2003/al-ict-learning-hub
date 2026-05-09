// Firebase App
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// Firestore
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase Authentication
import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBMr5vbmSaGjHyqPwgwkLMVgxt9GhPo9aI",
  authDomain: "al-ict-learning-hub.firebaseapp.com",
  projectId: "al-ict-learning-hub",
  storageBucket: "al-ict-learning-hub.firebasestorage.app",
  messagingSenderId: "998616444495",
  appId: "1:998616444495:web:c61723c9dc127cb98e443a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);

// Export
export { db, auth };