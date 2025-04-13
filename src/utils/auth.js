import { getAuth, GoogleAuthProvider, signInWithRedirect, signOut, onAuthStateChanged } from "firebase/auth";
import { app } from "./firebase"; // make sure this path is correct

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Opens the Google sign-in popup

export const signInWithGoogle = () => signInWithRedirect(auth, provider);

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
