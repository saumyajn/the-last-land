import { createContext, useState, useEffect } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { ADMIN_EMAILS } from "./config";
import { shouldUseFirebaseEmulators } from "./firebaseEnv";
import emulatorAdmin from "./emulatorAdmin.json";

// Create the context
export const AuthContext = createContext();

// Context provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const updateAuth = (firebaseUser) => {
      if (!mounted) return;
      setUser(firebaseUser);
      setIsAdmin(Boolean(firebaseUser && firebaseUser.emailVerified && ADMIN_EMAILS.includes(firebaseUser.email)));
    };
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      updateAuth(firebaseUser);
      if (!shouldUseFirebaseEmulators) setAuthReady(true);
    });

    if (shouldUseFirebaseEmulators) {
      signInWithEmailAndPassword(auth, emulatorAdmin.email, emulatorAdmin.password)
        .then(({ user: firebaseUser }) => updateAuth(firebaseUser))
        .catch((error) => console.error("Emulator admin sign-in failed. Seed the emulators first:", error))
        .finally(() => {
          if (mounted) setAuthReady(true);
        });
    }

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAdmin, authReady, isEmulatorMode: shouldUseFirebaseEmulators }}
    >
      {children}
    </AuthContext.Provider>
  );
};
