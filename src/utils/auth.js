import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { app } from "./firebase";

const auth = getAuth(app);
auth.useDeviceLanguage();

// Google Sign-in
export const signInWithGoogle = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  signInWithPopup(auth, provider)
    .then((result) => {
      console.log("✅ Popup login success:", result.user);
    })
    .catch((error) => {
      console.error("❌ Popup login failed:", error.message, error);
    });
};

// Sign-out
export const logout = () => signOut(auth);

// ✅ DO NOT export onAuthStateChanged or getCurrentUser here
