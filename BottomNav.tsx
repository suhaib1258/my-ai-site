import React from "react";
import { motion } from "motion/react";
import { Home, Users, UserRound } from "lucide-react";

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function BottomNav({ activeTab, setActiveTab }: Props) {
  const tabs = [
    { id: "home", icon: Home },
    { id: "clan", icon: Users },
    { id: "profile", icon: UserRound },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] h-[70px] bg-white/10 backdrop-blur-3xl border border-white/10 rounded-[2rem] flex items-center justify-between px-2 z-50 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="relative flex-1 h-14 flex items-center justify-center rounded-3xl"
          >
            {isActive && (
              <motion.div
                layoutId="nav-blob"
                className="absolute inset-0 bg-white/10 border border-white/5 shadow-inner rounded-3xl"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Icon
              className={`w-6 h-6 z-10 transition-colors duration-300 ${
                isActive
                  ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  : "text-white/40 hover:text-white/60"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
