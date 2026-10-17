"use client";

import { isRole, type Role } from "@swarajya/shared";
import { onIdTokenChanged, signOut, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getFirebase } from "./firebase";

export interface AuthState {
  status: "loading" | "signed-out" | "signed-in" | "error";
  user: User | null;
  /** Role from the verified ID token's custom claims, never from Firestore. */
  role: Role | null;
  error?: string;
}

const AuthContext = createContext<AuthState>({ status: "loading", user: null, role: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null, role: null });

  useEffect(() => {
    let auth;
    try {
      auth = getFirebase().auth;
    } catch (err) {
      setState({ status: "error", user: null, role: null, error: (err as Error).message });
      return;
    }
    return onIdTokenChanged(auth, async (user) => {
      if (!user) {
        setState({ status: "signed-out", user: null, role: null });
        return;
      }
      try {
        const token = await user.getIdTokenResult();
        const role = token.claims.role;
        setState({ status: "signed-in", user, role: isRole(role) ? role : null });
      } catch (err) {
        setState({ status: "error", user: null, role: null, error: (err as Error).message });
      }
    });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export async function logout(): Promise<void> {
  await signOut(getFirebase().auth);
}
