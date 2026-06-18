import React, { useRef, useState, useEffect } from "react";
import { User } from "../types";
import { logout, db } from "../firebase";
import {
  LogOut,
  Flame,
  Star,
  Shield,
  ImagePlus,
  Edit2,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { AnimatePresence, motion } from "motion/react";

interface Props {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export function ProfileView({ user, setUser }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.username);
  const [editAge, setEditAge] = useState(user.age?.toString() || "");
  const [editGender, setEditGender] = useState(user.gender || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const canEdit =
    !user.lastProfileUpdate ||
    Date.now() - user.lastProfileUpdate > SEVEN_DAYS_MS;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const size = Math.min(img.width, img.height);
        canvas.width = 300;
        canvas.height = 300;
        ctx?.drawImage(
          img,
          (img.width - size) / 2,
          (img.height - size) / 2,
          size,
          size,
          0,
          0,
          300,
          300,
        );
        const base64 = canvas.toDataURL("image/jpeg", 0.7);

        try {
          await updateDoc(doc(db, "users", user.id), { avatar: base64 });
          setUser((prev) => (prev ? { ...prev, avatar: base64 } : null));
        } catch (err) {
          alert("Error uploading avatar");
        }
        setUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setErrorMsg("الاسم مطلوب");
      return;
    }

    setSavingProfile(true);
    setErrorMsg("");

    try {
      const updates = {
        username: editName.trim(),
        age: editAge ? parseInt(editAge) : null,
        gender: editGender,
        lastProfileUpdate: Date.now(),
      };

      await updateDoc(doc(db, "users", user.id), updates);
      setUser((prev) => (prev ? { ...prev, ...updates } : null));
      setIsEditing(false);
    } catch (err) {
      setErrorMsg("حدث خطأ أثناء حفظ البيانات");
    }
    setSavingProfile(false);
  };

  const glowColor =
    user.level === "Legend"
      ? "shadow-[0_0_30px_5px_rgba(0,229,255,0.5)] border-cyan-400"
      : user.level === "Warrior"
        ? "shadow-[0_0_20px_5px_rgba(176,92,255,0.5)] border-purple-400"
        : "shadow-[0_0_15px_2px_rgba(255,255,255,0.1)] border-white/20";

  return (
    <div className="flex flex-col gap-8 pt-8 pb-32 items-center text-center">
      <div className="relative group mt-6">
        <div
          className={`w-36 h-36 rounded-full overflow-hidden border-[6px] transition-all duration-500 bg-white/5 relative shadow-inner ${glowColor}`}
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl font-bold bg-gradient-to-br from-purple-500/20 to-indigo-500/20 text-purple-200 uppercase">
              {user.username.charAt(0)}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-1 right-1 bg-gradient-to-r from-purple-600 to-indigo-600 p-3 rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(147,51,234,0.5)] border border-white/20"
        >
          <ImagePlus className="w-5 h-5 text-white" />
        </button>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      <div className="relative w-full flex flex-col items-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <h2 className="text-3xl font-black tracking-tight">
            {user.username}
          </h2>
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 border border-white/10 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-purple-300 text-xs tracking-widest uppercase font-bold shadow-sm">
            <Shield className="w-3.5 h-3.5" />
            {user.level}
          </div>
          {(user.age || user.gender) && (
            <div className="flex items-center gap-3 text-xs text-white/50 font-medium bg-black/20 px-3 py-1 rounded-full">
              {user.age && <span>{user.age} سنة</span>}
              {user.age && user.gender && (
                <span className="w-1 h-1 rounded-full bg-white/20"></span>
              )}
              {user.gender === "male" && <span>ذكر</span>}
              {user.gender === "female" && <span>أنثى</span>}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full mt-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex flex-col items-center shadow-lg relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-purple-500/10 blur-[20px] rounded-full pointer-events-none"></div>
          <Flame className="w-8 h-8 text-purple-400 mb-3 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
          <div className="text-3xl font-black font-mono tracking-tighter">
            {user.currentStreak}
          </div>
          <div className="text-[10px] text-white/40 mt-1 uppercase tracking-widest font-bold">
            ستريك حالي
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex flex-col items-center shadow-lg relative overflow-hidden">
          <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-yellow-500/10 blur-[20px] rounded-full pointer-events-none"></div>
          <Star className="w-8 h-8 text-yellow-400 mb-3 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
          <div className="text-3xl font-black font-mono tracking-tighter">
            {user.points}
          </div>
          <div className="text-[10px] text-white/40 mt-1 uppercase tracking-widest font-bold">
            نقاط المجد
          </div>
        </div>
      </div>

      <div className="w-full mt-auto mb-8">
        <button
          onClick={logout}
          className="w-full h-16 rounded-[2rem] flex items-center justify-center gap-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors bg-white/5 border border-white/10 shadow-sm active:scale-95"
        >
          <LogOut className="w-5 h-5 rtl:rotate-180" />
          <span className="font-bold text-sm tracking-wide">تسجيل الخروج</span>
        </button>
      </div>

      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsEditing(false)}
            ></div>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-[#1a1a24] border border-white/10 rounded-[2rem] p-6 w-full max-w-[340px] text-right"
            >
              <button
                onClick={() => setIsEditing(false)}
                className="absolute top-4 left-4 p-2 text-white/50 hover:text-white bg-white/5 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-lg font-bold text-white mb-6 flex items-center justify-start gap-2 flex-row-reverse">
                <Edit2 className="w-5 h-5 text-purple-400" /> تعديل الملف الشخصي
              </h3>

              {!canEdit ? (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="text-right flex-1">
                    <h4 className="font-bold text-sm text-red-400">
                      تعديل مقفل
                    </h4>
                    <p className="text-xs text-red-300/80 mt-1">
                      لقد قمت بتحديث بياناتك مؤخراً. يجب الانتظار لمدة 7 أيام
                      قبل التعديل مرة أخرى لحماية الحساب.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 text-right">
                  <div>
                    <label className="block text-xs font-bold text-white/60 mb-2">
                      الاسم
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none text-white focus:border-purple-500 transition-colors text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/60 mb-2">
                      العمر
                    </label>
                    <input
                      type="number"
                      value={editAge}
                      onChange={(e) => setEditAge(e.target.value)}
                      placeholder="اختياري"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none text-white focus:border-purple-500 transition-colors text-right pl-4"
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/60 mb-2">
                      الجنس
                    </label>
                    <select
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none text-white focus:border-purple-500 transition-colors text-right"
                      dir="rtl"
                    >
                      <option value="">اختياري</option>
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-red-400 font-bold mb-2 text-right">
                      {errorMsg}
                    </p>
                  )}

                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="w-full mt-2 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {savingProfile ? (
                      "جاري الحفظ..."
                    ) : (
                      <>
                        <Check className="w-5 h-5" /> حفظ التغييرات
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
