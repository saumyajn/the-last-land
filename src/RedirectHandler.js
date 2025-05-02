// src/RedirectHandler.js
import React, { useEffect } from 'react';
import { getAuth, getRedirectResult } from 'firebase/auth';

export default function RedirectHandler({ onComplete }) {
  useEffect(() => {
    const auth = getAuth();
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("✅ Redirect success:", result.user);
          onComplete(result.user);
        } else {
          console.log("ℹ️ No user from redirect");
        }
      })
      .catch((err) => {
        console.error("❌ Redirect error:", err);
      });
  }, [onComplete]);

  return <p>Finalizing login...</p>;
}
