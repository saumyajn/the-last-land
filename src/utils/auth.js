import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { shouldUseFirebaseEmulators } from "./firebaseEnv";

auth.useDeviceLanguage();

// Google Sign-in
export const signInWithGoogle = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  return signInWithPopup(auth, provider);
};

// Sign-out
export const logout = async () => {
  await signOut(auth);
  if (!shouldUseFirebaseEmulators) window.location.replace("/");
};

// Do not export onAuthStateChanged or getCurrentUser here.
