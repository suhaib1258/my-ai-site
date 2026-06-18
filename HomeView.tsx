import React, { useState, useRef } from "react";
import { User } from "../types";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, Flame, CircleCheck, AlertTriangle } from "lucide-react";

interface Props {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export function HomeView({ user, setUser }: Props) {
  const [isBroken, setIsBroken] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [showOath, setShowOath] = useState(false);
  const [showRelapseConfirm, setShowRelapseConfirm] = useState(false);
  const [oathChecks, setOathChecks] = useState([false, false, false]);
  const [loading, setLoading] = useState(false);

  const canOath = (() => {
    if (!user.lastOathTime) return true;
    const lastOathDate = new Date(user.lastOathTime).setUTCHours(0, 0, 0, 0);
    const nowDate = new Date().setUTCHours(0, 0, 0, 0);
    return lastOathDate !== nowDate;
  })();

  const handleClick = () => {
    if (!canOath) return;
    const newCount = clickCount + 1;
    if (newCount >= 3) {
      setShowOath(true);
      setClickCount(0);
    } else {
      setClickCount(newCount);
    }
  };

  const submitOath = async () => {
    if (oathChecks.includes(false)) return;
    setLoading(true);
    try {
      const now = Date.now();
      const lastOathDate = new Date(user.lastOathTime || 0).setUTCHours(
        0,
        0,
        0,
        0,
      );
      const nowDate = new Date(now).setUTCHours(0, 0, 0, 0);

      if (lastOathDate === nowDate) {
        setLoading(false);
        return;
      }

      const userRef = doc(db, "users", user.id);

      const newStreak = (user.currentStreak || 0) + 1;
      const newTotal = (user.totalSuccessfulDays || 0) + 1;
      const pts = (user.points || 0) + 10;
      let level = user.level || "Beginner";
      if (pts >= 100) level = "Fighter";
      if (pts >= 300) level = "Warrior";
      if (pts >= 1000) level = "Legend";

      await updateDoc(userRef, {
        lastOathTime: now,
        currentStreak: newStreak,
        totalSuccessfulDays: newTotal,
        points: pts,
        level,
      });
      setUser((prev) =>
        prev
          ? {
              ...prev,
              lastOathTime: now,
              currentStreak: newStreak,
              totalSuccessfulDays: newTotal,
              points: pts,
              level,
            }
          : null,
      );

      if (user.clanId) {
        const clanRef = doc(db, "clans", user.clanId);
        const clanDoc = await getDoc(clanRef);
        if (clanDoc.exists()) {
          await updateDoc(clanRef, {
            powerIndex: (clanDoc.data().powerIndex || 0) + 2,
          });
        }
      }

      setShowOath(false);
      setOathChecks([false, false, false]);
    } catch (e: any) {
      alert("Error submitting oath: " + e.message);
    }
    setLoading(false);
  };

  const triggerRelapse = () => {
    setShowRelapseConfirm(true);
  };

  const confirmRelapse = async () => {
    setShowRelapseConfirm(false);
    setShowOath(false);
    setIsBroken(true);

    setTimeout(async () => {
      try {
        const now = Date.now();
        const userRef = doc(db, "users", user.id);
        const newRelapseCount = (user.relapseCount || 0) + 1;
        const highestStreak = Math.max(
          user.currentStreak || 0,
          user.highestStreak || 0,
        );
        await updateDoc(userRef, {
          currentStreak: 0,
          points: 0,
          lastOathTime: now,
          relapseCount: newRelapseCount,
          highestStreak,
        });
        setUser((prev) =>
          prev
            ? {
                ...prev,
                currentStreak: 0,
                points: 0,
                lastOathTime: now,
                relapseCount: newRelapseCount,
                highestStreak,
              }
            : null,
        );

        if (user.clanId) {
          const clanRef = doc(db, "clans", user.clanId);
          const clanDoc = await getDoc(clanRef);
          if (clanDoc.exists()) {
            const mockMessages = [
              `افاااا عليك 😅 ما قدرت تكمل يا ${user.username}؟ ارجع أقوى!`,
            ];
            const randomMsg =
              mockMessages[Math.floor(Math.random() * mockMessages.length)];
            const msg = {
              id: Date.now().toString(),
              text: randomMsg,
              senderId: "system",
              senderName: "نظام التحفيز",
              timestamp: Date.now(),
              isSystem: true,
            };
            const currentMessages = clanDoc.data().messages || [];
            await updateDoc(clanRef, {
              powerIndex: Math.max(0, (clanDoc.data().powerIndex || 0) - 10),
              messages: [...currentMessages, msg],
            });
          }
        }
      } catch (e: any) {
        alert("Error: " + e.message);
      }
      setTimeout(() => setIsBroken(false), 2000);
    }, 1200);
  };

  const triggerPanic = async () => {
    if (!user.clanId) {
      alert("انضم لعشيرة أولاً لإرسال نداء طوارئ!");
      return;
    }
    try {
      const msg = {
        id: Date.now().toString(),
        text: `🚨 نداء طوارئ من ${user.username}! ادعموه الآن!`,
        senderId: "system",
        senderName: "نظام الطوارئ",
        timestamp: Date.now(),
        isSystem: true,
      };
      const clanRef = doc(db, "clans", user.clanId);
      const clanDoc = await getDoc(clanRef);
      if (clanDoc.exists()) {
        const currentMessages = clanDoc.data().messages || [];
        await updateDoc(clanRef, { messages: [...currentMessages, msg] });
      }
      alert("تم إرسال نداء الطوارئ لعشيرتك!");
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div className="flex flex-col gap-6 relative">
      <header className="relative z-10 flex flex-row items-center justify-between mb-2 mt-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            أهلاً {user.username}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] uppercase tracking-widest text-purple-400 font-bold">
              رتبة {user.level}
            </span>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          </div>
        </div>
        <button
          onClick={triggerPanic}
          className="w-12 h-12 rounded-full bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.6)] border-4 border-red-400/20 active:scale-95 transition-transform flex items-center justify-center"
        >
          <ShieldAlert className="w-5 h-5 text-white" />
        </button>
      </header>

      <motion.div
        className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] flex flex-col items-center justify-center overflow-hidden py-12 origin-bottom"
        initial={{ y: 20, opacity: 0 }}
        animate={
          isBroken
            ? {
                rotate: [0, -10, 15, -15, 20],
                y: [0, 5, 20, 100, 300],
                opacity: [1, 1, 0.8, 0],
                scale: [1, 1.1, 0.9, 0.8],
              }
            : { y: 0, opacity: 1, rotate: 0, scale: 1 }
        }
        transition={
          isBroken ? { duration: 1.2, ease: "easeInOut" } : { duration: 0.5 }
        }
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(#ffffff 0.5px, transparent 0.5px)",
            backgroundSize: "24px 24px",
          }}
        ></div>
        <div className="relative z-10 flex flex-col items-center w-full">
          <div className="relative flex items-center justify-center">
            <svg className="w-64 h-64 -rotate-90 absolute">
              <circle
                cx="128"
                cy="128"
                r="110"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="12"
              />
              <circle
                cx="128"
                cy="128"
                r="110"
                fill="none"
                stroke="url(#streakGrad)"
                strokeWidth="12"
                strokeDasharray={`${2 * Math.PI * 110}`}
                strokeDashoffset={`${2 * Math.PI * 110 * (1 - Math.min(user.currentStreak / 90, 1))}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient
                  id="streakGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#A855F7" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="flex flex-col items-center justify-center z-10 w-full h-full p-6 text-center mt-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-2">
                يوم مستمر
              </span>
              <span className="text-8xl font-black tracking-tighter text-white drop-shadow-[0_0_30px_rgba(168,85,247,0.3)] leading-none">
                {user.currentStreak}
              </span>
              <div className="flex items-center justify-center gap-1 mt-4 text-purple-400">
                <Flame className="w-4 h-4" />
                <span className="text-[10px] font-bold">نار المستمر</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {!canOath &&
        !showOath &&
        (user.currentStreak > 0 ? (
          <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-6 text-center border border-white/10 mt-4">
            <CircleCheck className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="font-bold text-green-300">لقد حلفت اليوم!</h3>
            <p className="text-sm text-green-400/60 mt-1">
              عد غداً لمواصلة الستريك.
            </p>
          </div>
        ) : (
          <div className="bg-red-950/20 backdrop-blur-xl rounded-[2rem] p-6 text-center border border-red-500/20 mt-4">
            <AlertTriangle className="w-12 h-12 text-red-500/80 mx-auto mb-3" />
            <h3 className="font-bold text-red-300 mb-2">
              أعاهد الله ثم نفسي أنني لن أستسلم
            </h3>
            <p className="text-xs text-red-400/80 leading-relaxed font-medium">
              سقطت اليوم، لكني سأنهض غداً أقوى، ولن أعود لهذه المعصية أبداً.
              عهدي مع الله يبدأ من جديد غداً.
            </p>
          </div>
        ))}

      {canOath && !showOath && (
        <div className="relative mt-4 flex flex-col items-center w-full">
          <p className="text-xs text-white/60 mb-4 font-bold tracking-widest uppercase">
            الحلفان اليومي لم يكتمل
          </p>
          <div className="relative w-full text-center flex flex-col items-center">
            <button
              onClick={handleClick}
              className="px-6 py-5 w-full max-w-[320px] relative bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full font-bold text-[15px] shadow-[0_0_40px_rgba(147,51,234,0.4)] border border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden flex justify-center items-center"
            >
              <div
                className="absolute left-0 bottom-0 top-0 bg-white/20 transition-all ease-linear"
                style={{ width: `${(clickCount / 3) * 100}%` }}
              />
              <span className="relative z-10 text-white drop-shadow-md whitespace-nowrap">
                {clickCount > 0
                  ? `تأكيد ${clickCount}/3...`
                  : "أقسم بالله العظيم أنني ملتزم 🔥"}
              </span>
            </button>
            <p className="text-[10px] text-white/30 mt-4 italic">
              اضغط 3 مرات متتالية للتأكيد
            </p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showOath && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 w-full max-w-sm p-6 rounded-[2rem]">
              <h3 className="text-xl font-bold text-white mb-6 text-center">
                العهد اليومي
              </h3>
              <div className="space-y-4 mb-8">
                {[0, 1, 2].map((i) => (
                  <label
                    key={i}
                    className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-xl rounded-[1rem]"
                  >
                    <input
                      type="checkbox"
                      className="w-6 h-6 rounded border-purple-500/50 bg-black/50 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                      checked={oathChecks[i]}
                      onChange={(e) => {
                        const newC = [...oathChecks];
                        newC[i] = e.target.checked;
                        setOathChecks(newC);
                      }}
                    />
                    <span className="text-sm font-medium">
                      أقسم بالله العلي العظيم أنني لم أقم بهذه العادة اليوم
                    </span>
                  </label>
                ))}
              </div>
              <button
                onClick={submitOath}
                disabled={loading || oathChecks.includes(false)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 disabled:from-gray-700 disabled:to-gray-800 disabled:opacity-50 font-bold transition-all shadow-[0_0_20px_rgba(147,51,234,0.4)]"
              >
                {loading ? "جاري التسجيل..." : "تأكيد الحلفان"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-4 w-full">
        <button
          onClick={triggerPanic}
          className="mt-6 flex-1 flex flex-col items-center justify-center gap-3 h-32 bg-red-950/40 border border-red-500/20 rounded-[2rem] px-4 group active:scale-95 transition-all text-center"
        >
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
            <ShieldAlert className="w-6 h-6 text-red-500/70 group-hover:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white/80">زر الطوارئ</p>
            <p className="text-[10px] text-white/50 uppercase leading-tight mt-1">
              احتاج دعم حالاً
            </p>
          </div>
        </button>

        <button
          onClick={triggerRelapse}
          className="mt-6 flex-1 flex flex-col items-center justify-center gap-3 h-32 bg-black/60 border border-white/5 rounded-[2rem] px-4 group active:scale-95 transition-all text-center"
        >
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
            <AlertTriangle className="w-6 h-6 text-white/40 group-hover:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white/60">انتكاسة</p>
            <p className="text-[10px] text-white/30 uppercase leading-tight mt-1">
              تصفير الستريك
            </p>
          </div>
        </button>
      </div>

      <AnimatePresence>
        {showRelapseConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowRelapseConfirm(false)}
            ></div>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-[#1a1a24] border border-red-500/20 rounded-3xl p-6 w-full max-w-[320px] text-center"
            >
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4 opacity-80" />
              <h3 className="text-xl font-bold text-white mb-2">
                هل أنت متأكد؟
              </h3>
              <p className="text-sm text-white/60 mb-8">
                الانتكاسة ستصفر الستريك وتقلل نقاط العشيرة وسيتم فضحك برسالة
                ساخرة في العشيرة!
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRelapseConfirm(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors"
                >
                  تراجع
                </button>
                <button
                  onClick={confirmRelapse}
                  className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-xl font-bold transition-colors"
                >
                  نعم، انتكست
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
