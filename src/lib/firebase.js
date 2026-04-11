// ─── Firebase Config ───
// INSTRUCCIONES: Reemplaza estos valores con los de tu proyecto Firebase
// 1. Ve a https://console.firebase.google.com
// 2. Crea un proyecto nuevo llamado "neoframe-ai"
// 3. En la config del proyecto, copia tus credenciales aquí
// 4. Activa Authentication > Email/Password
// 5. Activa Firestore Database

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
