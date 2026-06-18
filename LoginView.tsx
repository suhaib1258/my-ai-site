import React, { useState } from "react";
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { motion } from "motion/react";

export function LoginView() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        if (username.trim() === "") {
          throw new Error("يرجى إدخال اسم المستخدم.");
        }
        localStorage.setItem("pendingUsername", username);
        const userCred = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(userCred.user, { displayName: username });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.message === "يرجى إدخال اسم المستخدم.") {
        setError(err.message);
      } else if (err.code === "auth/email-already-in-use") {
        setError("هذا البريد الإلكتروني مستخدم بالفعل.");
      } else if (err.code === "auth/invalid-credential") {
        setError("بيانات الدخول غير صحيحة.");
      } else if (err.code === "auth/weak-password") {
        setError("كلمة المرور ضعيفة جداً.");
      } else {
        setError("حدث خطأ أثناء الاتصال. يرجى المحاولة مرة أخرى.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050208] text-white flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-900/20 blur-[150px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="z-10 flex flex-col items-center w-full max-w-sm px-6"
      >
        <div className="w-24 h-24 mb-6 rounded-3xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-[0_0_40px_rgba(147,51,234,0.4)]">
          <span className="text-4xl font-bold text-white shadow-sm font-sans drop-shadow-lg">
            ش
          </span>
        </div>

        <h1 className="text-5xl font-extrabold mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-200 drop-shadow-md">
          شريك
        </h1>
        <p className="text-purple-300/60 font-medium mb-12 text-lg">
          أقوى معاً.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl text-center">
              {error}
            </div>
          )}

          {isRegistering && (
            <input
              type="text"
              placeholder="اسم المستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required={isRegistering}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50 transition-colors w-full"
            />
          )}

          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50 transition-colors w-full"
          />

          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50 transition-colors w-full"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full relative group overflow-hidden rounded-xl mt-2 disabled:opacity-70"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-90 transition-opacity duration-300"></span>
            <div className="relative px-8 py-3.5 flex items-center justify-center transition-transform duration-300 active:scale-[0.98]">
              <span className="font-bold text-[15px] text-white drop-shadow-sm">
                {loading
                  ? "جاري التحميل..."
                  : isRegistering
                    ? "انشاء حساب جديد"
                    : "تسجيل الدخول"}
              </span>
            </div>
          </button>
        </form>

        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="mt-6 text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          {isRegistering
            ? "لديك حساب بالفعل؟ سجل دخولك"
            : "ليس لديك حساب؟ سجل الآن"}
        </button>
      </motion.div>
    </div>
  );
}
