"use client";

import { FirebaseError } from "firebase/app";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import { getFirebase } from "./firebase";

function messageFor(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
      case "auth/invalid-email":
        return "Incorrect email or password.";
      case "auth/user-disabled":
        return "This account has been suspended.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait and try again.";
      case "auth/network-request-failed":
        return "Network error. Check your connection.";
    }
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}

export function LoginForm({ title, redirectTo = "/dashboard" }: { title: string; redirectTo?: string }) {
  const { status, error: configError } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (status === "signed-in") router.replace(redirectTo);
  }, [status, router, redirectTo]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await signInWithEmailAndPassword(getFirebase().auth, email.trim(), password);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  async function onResetPassword() {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    try {
      await sendPasswordResetEmail(getFirebase().auth, email.trim());
    } catch (err) {
      // Do not reveal whether the account exists; only surface transport errors.
      if (err instanceof FirebaseError && err.code === "auth/network-request-failed") {
        setError(messageFor(err));
        return;
      }
    }
    setNotice("If an account exists for this email, a password reset link has been sent.");
  }

  return (
    <form className="panel-card panel-login" onSubmit={onSubmit} noValidate>
      <img src="/logo.svg" alt="Swarajya News" width={120} height={68} />
      <h1>{title}</h1>
      {status === "error" && <p className="panel-alert" role="alert">{configError}</p>}
      <label>
        Email
        <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Password
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error && <p className="panel-alert" role="alert">{error}</p>}
      {notice && <p className="panel-notice" role="status">{notice}</p>}
      <button type="submit" disabled={busy || status === "error"}>{busy ? "Signing in…" : "Sign in"}</button>
      <button type="button" className="panel-link" onClick={onResetPassword} disabled={status === "error"}>
        Forgot password?
      </button>
    </form>
  );
}
