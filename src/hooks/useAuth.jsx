import { createContext, useContext, useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, updateDoc, collection,
  getDocs, query, orderBy, increment,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase.js";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

// ── Default credits for new users ──
const DEFAULT_CREDITS = 10;

// ── Cost table ──
export const COSTS = {
  generate_5s: 1,
  generate_10s: 2,
  generate_15s: 3,
  generate_30s: 5,
  generate_60s: 8,
  clip_per_clip: 2,
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen to auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          setProfile({ id: u.uid, ...snap.data() });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Sign up
  const signup = async (email, password, name) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const userData = {
      name,
      email,
      credits: DEFAULT_CREDITS,
      role: "user",
      createdAt: new Date().toISOString(),
      videosGenerated: 0,
      clipsGenerated: 0,
    };
    await setDoc(doc(db, "users", cred.user.uid), userData);
    setProfile({ id: cred.user.uid, ...userData });
    return cred.user;
  };

  // Login
  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, "users", cred.user.uid));
    if (snap.exists()) setProfile({ id: cred.user.uid, ...snap.data() });
    return cred.user;
  };

  // Logout
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  // Use credits
  const useCredits = async (amount) => {
    if (!profile || profile.credits < amount) return false;
    await updateDoc(doc(db, "users", profile.id), {
      credits: increment(-amount),
    });
    setProfile((p) => ({ ...p, credits: p.credits - amount }));
    return true;
  };

  // Increment stats
  const addStat = async (field, count = 1) => {
    if (!profile) return;
    await updateDoc(doc(db, "users", profile.id), {
      [field]: increment(count),
    });
    setProfile((p) => ({ ...p, [field]: (p[field] || 0) + count }));
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (!user) return;
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) setProfile({ id: user.uid, ...snap.data() });
  };

  // ── ADMIN functions ──
  const isAdmin = profile?.role === "admin";

  const getAllUsers = async () => {
    const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  };

  const setUserCredits = async (uid, amount) => {
    await updateDoc(doc(db, "users", uid), { credits: amount });
  };

  const addUserCredits = async (uid, amount) => {
    await updateDoc(doc(db, "users", uid), { credits: increment(amount) });
  };

  const setUserRole = async (uid, role) => {
    await updateDoc(doc(db, "users", uid), { role });
  };

  return (
    <Ctx.Provider
      value={{
        user, profile, loading,
        signup, login, logout,
        useCredits, addStat, refreshProfile,
        isAdmin, getAllUsers, setUserCredits, addUserCredits, setUserRole,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
