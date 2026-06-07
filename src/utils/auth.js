import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "./firebase";

auth.useDeviceLanguage();

// Google Sign-in
export const signInWithGoogle = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  signInWithPopup(auth, provider)
    .then((result) => {
      if (process.env.NODE_ENV === "development") {
        console.log("Popup login success:", result.user);
      }
    })
    .catch((error) => {
      console.error("Popup login failed:", error.message, error);
    });
};

// Sign-out
export const logout = () => signOut(auth);

// Do not export onAuthStateChanged or getCurrentUser here.
