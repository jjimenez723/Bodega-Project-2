"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase/client";
import type { AppUser } from "@/types/firestore";

type AuthContextValue = {
  user: User | null;
  profile: AppUser | null;
  loading: boolean;
  profileError: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    if (!auth || !db) return;
    const firebaseAuth = auth;
    const firestore = db;

    let stopProfile: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(firebaseAuth, (nextUser) => {
      stopProfile?.();
      setUser(nextUser);
      setProfile(null);
      setProfileError("");

      if (!nextUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      stopProfile = onSnapshot(
        doc(firestore, "users", nextUser.uid),
        (snapshot) => {
          if (snapshot.exists()) {
            setProfile({ id: snapshot.id, ...snapshot.data() } as AppUser);
          } else {
            setProfile(null);
            setProfileError(
              "Your account is authenticated but does not have a dashboard role.",
            );
          }
          setLoading(false);
        },
        () => {
          setProfileError("Your role profile could not be loaded.");
          setLoading(false);
        },
      );
    });

    return () => {
      stopProfile?.();
      stopAuth();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      profileError,
      signIn: async (email, password) => {
        if (!auth) throw new Error("Firebase is not configured.");
        await signInWithEmailAndPassword(auth, email, password);
      },
      signOut: async () => {
        if (!auth) return;
        await firebaseSignOut(auth);
      },
    }),
    [loading, profile, profileError, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
