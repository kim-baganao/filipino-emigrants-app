import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBryYpinFM_t3lgTt62Qvp-fl04dQfB5kk",
  authDomain: "baganaofilipinoemigrantsdb.firebaseapp.com",
  projectId: "baganaofilipinoemigrantsdb",
  storageBucket: "baganaofilipinoemigrantsdb.firebasestorage.app",
  messagingSenderId: "409908800048",
  appId: "1:409908800048:web:5356c0dd3253b9834e5bf5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
