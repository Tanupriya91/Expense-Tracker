require("dotenv").config();
const fs = require("fs");

const { initializeApp } = require("firebase/app");
const {
  getAuth,
  signInWithEmailAndPassword,
} = require("firebase/auth");

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function login() {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      process.env.EMAIL,
      process.env.PASSWORD
    );

    const token = await userCredential.user.getIdToken();

    fs.writeFileSync("token.txt", token);

    console.log("Token saved to token.txt");
  } catch (error) {
    console.error(error.message);
  }
}

login();