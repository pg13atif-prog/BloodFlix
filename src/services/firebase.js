// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQtvZluQkqv1yZGHqZwIRgp_NYzqN3JEw",
  authDomain: "hackathon-backend-2b6c6.firebaseapp.com",
  databaseURL: "https://hackathon-backend-2b6c6-default-rtdb.firebaseio.com",
  projectId: "hackathon-backend-2b6c6",
  storageBucket: "hackathon-backend-2b6c6.firebasestorage.app",
  messagingSenderId: "338599348529",
  appId: "1:338599348529:web:355e67bf45a06904c74810",
  measurementId: "G-7XQPFYC248"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

export default app;
