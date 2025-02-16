// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // Add only if using authentication
import { getFirestore } from "firebase/firestore"; // Add if using Firestore

const firebaseConfig = {
    apiKey: "AIzaSyAtrkbSaWrU4w4rTTSunaj25opQO8sDD_c",
    authDomain: "rn-api-35b38.firebaseapp.com",
    databaseURL: "https://rn-api-35b38-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "rn-api-35b38",
    storageBucket: "rn-api-35b38.firebasestorage.app",
    messagingSenderId: "639298619246",
    appId: "1:639298619246:web:bebe42342d569785c7237f",
    measurementId: "G-P7DWR065WK"
};


let app, firestore, storage;

// Initialize Firebase
try {
    app = initializeApp(firebaseConfig);
    firestore = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
} catch (error) {
    console.error("Error initializing Firebase services:", error);
}
  
export { app, firestore, storage };

// // Export Firebase services
// export const auth = getAuth(app);
// export const db = getFirestore(app);
// export default app;