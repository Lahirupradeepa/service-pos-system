// Firebase Configuration - Moto POS System
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

// Initialize Firebase using the compat SDK (loaded via CDN script tags in index.html)
try {
    firebase.initializeApp(firebaseConfig);
    window.db = firebase.database();
    console.log("✅ Firebase connected successfully!");
} catch (error) {
    console.error("❌ Firebase initialization error:", error);
    window.db = null;
}
