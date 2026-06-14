import { createContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { ADMIN_EMAILS } from "../utils/config"; // Put your admin emails here
import { shouldUseFirebaseEmulators } from "./firebaseEnv";

// Create the context
export const AuthContext = createContext();

const emulatorAdminUser = {
  uid: "local-emulator-admin",
  email: "local-emulator-admin@example.test",
  displayName: "Local Emulator Admin",
};

// Context provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    shouldUseFirebaseEmulators ? emulatorAdminUser : null,
  );
  const [isAdmin, setIsAdmin] = useState(shouldUseFirebaseEmulators);

  useEffect(() => {
    if (shouldUseFirebaseEmulators) {
      setUser(emulatorAdminUser);
      setIsAdmin(true);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAdmin(firebaseUser && ADMIN_EMAILS.includes(firebaseUser.email));

    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAdmin, isEmulatorMode: shouldUseFirebaseEmulators }}
    >
      {children}
    </AuthContext.Provider>
  );
};
