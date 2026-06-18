import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { User } from "./types";
import { LoginView } from "./views/LoginView";
import { HomeView } from "./views/HomeView";
import { ClanView } from "./views/ClanView";
import { ProfileView } from "./views/ProfileView";
import { BottomNav } from "./components/BottomNav";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        let userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          // Provision new user
          const pendingUsername = localStorage.getItem("pendingUsername");
          if (pendingUsername) localStorage.removeItem("pendingUsername");

          const newUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || "",
            username:
              firebaseUser.displayName || pendingUsername || "شريك جديد",
            avatar: firebaseUser.photoURL || "",
            points: 0,
            level: "Beginner",
            currentStreak: 0,
            totalSuccessfulDays: 0,
          };
          await setDoc(userRef, newUser);
          setUser(newUser);
        } else {
          setUser(userDoc.data() as User);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050510] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin glow-purple"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-[#050208] text-white flex flex-col font-sans overflow-hidden relative selection:bg-purple-500/30">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-900/20 blur-[150px] rounded-full pointer-events-none" />

      <main className="flex-1 w-full max-w-md mx-auto relative z-10 p-4 sm:p-6 pb-32 overflow-y-auto hide-scrollbar flex flex-col">
        {activeTab === "home" && <HomeView user={user} setUser={setUser} />}
        {activeTab === "clan" && <ClanView user={user} />}
        {activeTab === "profile" && (
          <ProfileView user={user} setUser={setUser} />
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
