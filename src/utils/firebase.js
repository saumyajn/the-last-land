// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {

    apiKey: "AIzaSyBbgIniFQ7WEySILgrl1tBb9EIBIrtp8Ho",
    authDomain: "image-to-data-9a90b.firebaseapp.com",
    projectId: "image-to-data-9a90b",
    storageBucket: "image-to-data-9a90b.firebasestorage.app",
    messagingSenderId: "1008359466151",
    appId: "1:1008359466151:web:71a89e4679cf4b2852e782",
    measurementId: "G-9R1GWTW2NG"

};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
