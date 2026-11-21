import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDAPn9UfUuBE585UpBNXAcSlYWhq1UhsO0",
  authDomain: "the-network-72bba.firebaseapp.com",
  projectId: "the-network-72bba",
  storageBucket: "the-network-72bba.firebasestorage.app",
  messagingSenderId: "949316335276",
  appId: "1:949316335276:web:b3869be4258b308503d109",
  measurementId: "G-9WCWS8SNLG",
};

export const firebaseApp = initializeApp(firebaseConfig);

// Analytics only works in browser contexts (not SSR/Node)
export const analyticsPromise = isSupported().then((supported) =>
  supported ? getAnalytics(firebaseApp) : null
);
