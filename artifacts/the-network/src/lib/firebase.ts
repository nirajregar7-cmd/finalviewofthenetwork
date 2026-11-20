import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDaKPOPdj97Z93CesIH_YoW8Zc4iFmdZrI",
  authDomain: "the-network-a1188.firebaseapp.com",
  projectId: "the-network-a1188",
  storageBucket: "the-network-a1188.firebasestorage.app",
  messagingSenderId: "264462596476",
  appId: "1:264462596476:web:daf3f478ee694bad538cf9",
  measurementId: "G-7QHTQSG3QL",
};

export const firebaseApp = initializeApp(firebaseConfig);

// Analytics only works in browser contexts (not SSR/Node)
export const analyticsPromise = isSupported().then((supported) =>
  supported ? getAnalytics(firebaseApp) : null
);
