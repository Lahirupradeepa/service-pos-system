// Replace these configuration details with your actual Firebase project settings.
// These details can be found in your Firebase Console -> Project Settings -> General
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBMftIPuBDLVuyLodNts28fXUtdK2ADM5k",
  authDomain: "mypos-db-d3984.firebaseapp.com",
  databaseURL: "https://mypos-db-d3984-default-rtdb.firebaseio.com",
  projectId: "mypos-db-d3984",
  storageBucket: "mypos-db-d3984.firebasestorage.app",
  messagingSenderId: "92954985114",
  appId: "1:92954985114:web:e8c07bed8ea746e67f9523",
  measurementId: "G-QHBGC87VTN"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
