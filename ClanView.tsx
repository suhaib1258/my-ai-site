import React, { useEffect, useState, useRef } from "react";
import { User, Clan, ChatMessage } from "../types";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  setDoc,
  arrayUnion,
  onSnapshot,
} from "firebase/firestore";
import {
  Send,
  Plus,
  Search,
  MessageCircle,
  Users,
  Trophy,
  Target,
  Medal,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { motion } from "motion/react";
import clsx from "clsx";

interface Props {
  user: User;
}

export function ClanView({ user }: Props) {
  const [clan, setClan] = useState<Clan | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [createName, setCreateName] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [activeTab, setActiveTab] = useState<
    "chat" | "community" | "challenges"
  >("chat");
  const [clanMembers, setClanMembers] = useState<User[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsub = () => {};
    async function loadClan() {
      if (user.clanId) {
        const clanRef = doc(db, "clans", user.clanId);
        unsub = onSnapshot(clanRef, async (c) => {
          if (c.exists()) {
            const clanData = { id: c.id, ...c.data() } as Clan;
            setClan(clanData);
            setMessages(
              (clanData.messages || []).sort(
                (a: any, b: any) => a.timestamp - b.timestamp,
              ),
            );
            setTimeout(
              () => endRef.current?.scrollIntoView({ behavior: "smooth" }),
              100,
            );

            // Load members data
            if (clanData.members && clanData.members.length > 0) {
              try {
                const membersReq = clanData.members.map((mId) =>
                  getDoc(doc(db, "users", mId)),
                );
                const membersSnaps = await Promise.all(membersReq);
                const members = membersSnaps.map(
                  (snap) => ({ id: snap.id, ...snap.data() }) as User,
                );
                setClanMembers(members.sort((a, b) => b.points - a.points));
              } catch (e) {
                console.error("Error loading members", e);
              }
            }
          }
        });
      }
      setLoading(false);
    }
    loadClan();
    return () => unsub();
  }, [user.clanId]);

  const joinClan = async () => {
    if (!joinCode) return;
    const q = query(
      collection(db, "clans"),
      where("inviteCode", "==", joinCode),
    );
    const snaps = await getDocs(q);
    if (snaps.empty) return alert("Code invalid");

    const targetClan = snaps.docs[0];
    await updateDoc(doc(db, "users", user.id), { clanId: targetClan.id });
    await updateDoc(targetClan.ref, { members: arrayUnion(user.id) });
    window.location.reload();
  };

  const createClan = async () => {
    if (!createName) return;
    const newClanRef = doc(collection(db, "clans"));
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newClan: Omit<Clan, "id"> = {
      name: createName,
      ownerId: user.id,
      inviteCode,
      members: [user.id],
      powerIndex: 100,
      messages: [],
    } as unknown as Omit<Clan, "id">;
    await setDoc(newClanRef, newClan);
    await updateDoc(doc(db, "users", user.id), { clanId: newClanRef.id });
    window.location.reload();
  };

  const sendMessage = async () => {
    if (!text.trim() || !clan) return;

    const msg: ChatMessage = {
      id: Date.now().toString(),
      text,
      senderId: user.id,
      senderName: user.username,
      timestamp: Date.now(),
      isSystem: false,
    };

    setText("");
    const clanRef = doc(db, "clans", clan.id);
    await updateDoc(clanRef, { messages: arrayUnion(msg) });
  };

  if (loading)
    return <div className="p-4 text-center text-white/50">جاري التحميل...</div>;

  if (!clan) {
    return (
      <div className="flex flex-col gap-8 pt-12 items-center justify-center">
        <div className="glass-card p-6 w-full max-w-sm rounded-3xl flex flex-col gap-4">
          <h3 className="text-xl font-bold">إنشاء عشيرة</h3>
          <input
            type="text"
            placeholder="اسم العشيرة (الديوان)"
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />
          <button
            onClick={createClan}
            className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> إنشاء
          </button>
        </div>

        <div className="glass-card p-6 w-full max-w-sm rounded-3xl flex flex-col gap-4 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#050510] px-3 text-white/50 text-sm">
            أو
          </div>
          <h3 className="text-xl font-bold">الانضمام لعشيرة</h3>
          <input
            type="text"
            placeholder="كود الدعوة"
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <button
            onClick={joinClan}
            className="w-full bg-white/10 hover:bg-white/20 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <Search className="w-5 h-5" /> انضمام
          </button>
        </div>
      </div>
    );
  }

  // Prosperous vs Ruined State Logic could depend on members. For simplicity we use fake "good" state.
  const isProsperous = clan.powerIndex >= 50;

  const renderRankList = () => {
    return (
      <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-3 p-4">
        {clanMembers.map((member, i) => (
          <div
            key={member.id}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow-inner relative"
                style={{
                  backgroundColor:
                    i === 0
                      ? "rgba(234, 179, 8, 0.2)"
                      : i === 1
                        ? "rgba(168, 162, 158, 0.2)"
                        : i === 2
                          ? "rgba(180, 83, 9, 0.2)"
                          : "rgba(255,255,255,0.05)",
                }}
              >
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">
                  {member.username}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-white/50 mt-1">
                  <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                    {member.level || "مبتدئ"}
                  </span>
                  <span>ستريك: {member.currentStreak} </span>
                </div>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <div className="text-xs font-mono font-bold text-yellow-500">
                {member.points} <span className="text-[10px]">نقطة</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[9px] text-red-400 bg-red-400/10 px-1.5 rounded">
                  انتكاسات: {member.relapseCount || 0}
                </span>
                <span className="text-[9px] text-green-400 bg-green-400/10 px-1.5 rounded">
                  أعلى ستريك:{" "}
                  {member.highestStreak || member.currentStreak || 0}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderChallenges = () => {
    return (
      <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-4 p-4">
        <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/20 rounded-3xl p-5 mb-2 relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 blur-xl w-32 h-32 bg-purple-500 rounded-full"></div>
          <h3 className="font-bold text-lg text-white mb-1 relative z-10 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" /> هدف العشيرة هذا
            الأسبوع
          </h3>
          <p className="text-xs text-white/60 mb-3 relative z-10">
            الوصول لـ 500 قوة تجمع للحصول على شارة "الصمود الذهبي"
          </p>
          <div className="w-full bg-black/40 rounded-full h-3 mb-2 relative z-10">
            <div
              className="bg-yellow-500 h-3 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-all"
              style={{
                width: `${Math.min(100, (clan.powerIndex / 500) * 100)}%`,
              }}
            ></div>
          </div>
          <p className="text-[10px] text-left text-white/40">
            {clan.powerIndex} / 500
          </p>
        </div>

        <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-widest pl-1 mb-1 mt-2">
          تحديات يومية
        </h4>
        {[
          {
            title: "صمود تام",
            desc: "أكمل اليوم بدون أي انتكاسة لعضو من العشيرة",
            pts: 50,
            icon: <ShieldAlert className="w-4 h-4 text-green-400" />,
          },
          {
            title: "تفاعل العشيرة",
            desc: "أرسل 3 رسائل تحفيزية",
            pts: 10,
            icon: <MessageCircle className="w-4 h-4 text-purple-400" />,
          },
        ].map((c, i) => (
          <div
            key={i}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black/40 rounded-xl flex items-center justify-center">
                {c.icon}
              </div>
              <div>
                <h5 className="text-sm font-bold text-white/90">{c.title}</h5>
                <p className="text-[10px] text-white/50">{c.desc}</p>
              </div>
            </div>
            <div className="text-xs font-bold text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full">
              +{c.pts}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[75vh] w-full pt-4 relative">
      <div className="flex justify-between items-center mb-4 mt-4 px-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{clan.name}</h2>
          <p className="text-sm text-white/50">
            {clan.members.length} أعضاء | قوة التجمع: {clan.powerIndex}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-white/40 mb-1 uppercase tracking-widest font-bold">
            كود الدعوة
          </div>
          <div className="bg-white/5 px-3 py-1 rounded-lg font-mono text-purple-400 border border-white/10 select-all shadow-inner">
            {clan.inviteCode}
          </div>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-black/30 rounded-2xl mb-4 p-1 backdrop-blur-sm self-center max-w-sm w-full mx-auto">
        <button
          onClick={() => setActiveTab("chat")}
          className={clsx(
            "flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === "chat"
              ? "bg-white/10 text-white shadow-sm"
              : "text-white/50 hover:text-white/80",
          )}
        >
          <MessageCircle className="w-4 h-4" /> الدردشة
        </button>
        <button
          onClick={() => setActiveTab("community")}
          className={clsx(
            "flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === "community"
              ? "bg-white/10 text-white shadow-sm"
              : "text-white/50 hover:text-white/80",
          )}
        >
          <Users className="w-4 h-4" /> الأعضاء
        </button>
        <button
          onClick={() => setActiveTab("challenges")}
          className={clsx(
            "flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === "challenges"
              ? "bg-white/10 text-white shadow-sm"
              : "text-white/50 hover:text-white/80",
          )}
        >
          <Target className="w-4 h-4" /> التحديات
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] flex flex-col flex-1 overflow-hidden shadow-2xl relative z-10 mb-2">
        {activeTab === "chat" && (
          <>
            <div className="p-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                الدردشة الحية
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-4 p-4">
              {messages.map((msg, i) => (
                <motion.div
                  initial={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  key={i}
                  className={clsx(
                    "flex max-w-[85%] relative",
                    msg.senderId === user.id
                      ? "self-end flex-row-reverse"
                      : "self-start",
                    msg.isSystem &&
                      "self-center flex-row max-w-full w-full justify-center",
                  )}
                >
                  {!msg.isSystem && (
                    <div
                      className={clsx(
                        "w-8 h-8 rounded-full flex-shrink-0 mt-2",
                        msg.senderId === user.id
                          ? "ml-3 bg-purple-500/20 border border-purple-500/30"
                          : "mr-3 bg-indigo-500/20 border border-indigo-500/30",
                      )}
                    ></div>
                  )}

                  {msg.isSystem ? (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-2xl text-[11px] leading-relaxed text-center w-full shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                      <p className="font-bold text-red-500/80 mb-1">
                        رسالة النظام
                      </p>
                      <span className="text-white/80">{msg.text}</span>
                    </div>
                  ) : (
                    <div
                      className={clsx(
                        "p-3 rounded-2xl text-[12px] leading-relaxed relative",
                        msg.senderId === user.id
                          ? "bg-gradient-to-br from-purple-600 to-indigo-600 shadow-[0_0_15px_rgba(147,51,234,0.3)] rounded-tl-none"
                          : "bg-white/5 border border-white/10 rounded-tr-none",
                      )}
                    >
                      {msg.senderId !== user.id && (
                        <p className="font-bold text-indigo-300 mb-1 text-[10px] uppercase tracking-wider">
                          {msg.senderName}
                        </p>
                      )}
                      {msg.text}
                    </div>
                  )}
                </motion.div>
              ))}
              <div ref={endRef} />
            </div>

            <div className="p-4 bg-black/20 border-t border-white/5">
              <div className="bg-black/40 rounded-full px-2 py-2 flex items-center border border-white/10 focus-within:border-purple-500/50 transition-colors">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="شجع أصدقاءك..."
                  className="bg-transparent text-[13px] flex-1 outline-none px-4"
                />
                <button
                  onClick={sendMessage}
                  className="text-white bg-purple-600 p-2.5 rounded-full hover:bg-purple-500 transition-colors shadow-md"
                >
                  <Send className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === "community" && renderRankList()}
        {activeTab === "challenges" && renderChallenges()}
      </div>
    </div>
  );
}
