const fs = require("fs");

const { initializeApp } = require("firebase/app");
const {
  getAuth,
  signInWithEmailAndPassword,
} = require("firebase/auth");

const firebaseConfig = {
  apiKey: "AIzaSyCcsT18YvOdHYzwuZsG6sm-3x1XcmFxmpI",
  authDomain: "expense-tracker-970b1.firebaseapp.com",
  projectId: "expense-tracker-970b1",
  storageBucket: "expense-tracker-970b1.firebasestorage.app",
  messagingSenderId: "786237174052",
  appId: "1:786237174052:web:1c76edee7dd2da8a1803b1",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function login() {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      "test@gmail.com",
      "123456"
    );

    const token = await userCredential.user.getIdToken();

    fs.writeFileSync("token.txt", token);

    console.log("Token saved to token.txt");
  } catch (error) {
    console.error(error.message);
  }
}

login();