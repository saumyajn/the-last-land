import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { app } from "./firebase"; // make sure this path is correct
const auth = getAuth(app);
auth.useDeviceLanguage(); 
// Opens the Google sign-in popup

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
}

// Signs the user out
export const logout = () => signOut(auth);

// Sets a listener for auth state changes (user logged in/out)
export const onUserChange = (callback) => onAuthStateChanged(auth, callback);
/**
 * Gets current user with promise (useful during app init)
 */
export const getCurrentUser = () =>
    new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
