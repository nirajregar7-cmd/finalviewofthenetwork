import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAz60-u1yWkbBDvBlk5ahAldyvvrEncF7w",
  authDomain: "the-netwowrk.firebaseapp.com",
  projectId: "the-netwowrk",
  storageBucket: "the-netwowrk.firebasestorage.app",
  messagingSenderId: "769267753662",
  appId: "1:769267753662:web:113b204468f44149f9b4ef",
  measurementId: "G-MLY2V2RXS0",
};

export const firebaseApp = initializeApp(firebaseConfig);

// Analytics only works in browser contexts (not SSR/Node)
export const analyticsPromise = isSupported().then((supported) =>
  supported ? getAnalytics(firebaseApp) : null
);
