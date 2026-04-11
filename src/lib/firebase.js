// ─── Firebase Config ───
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCzDgbSKwF3VnBC1CXRJ_YYk06Jl-TW4oM",
  authDomain: "neoframe-ai.firebaseapp.com",
  projectId: "neoframe-ai",
  storageBucket: "neoframe-ai.firebasestorage.app",
  messagingSenderId: "465982454298",
  appId: "1:465982454298:web:1255059058b91ec509afa3",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
