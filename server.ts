import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import path from "path";
import config from "./firebase-applet-config.json" with { type: "json" };
import cors from "cors";

// Initialize Firebase Admin
const app = initializeApp({
  credential: applicationDefault(),
  projectId: config.projectId,
});

const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

try {
  db.settings({ databaseId: config.firestoreDatabaseId });
} catch (e) {
  // Ignore
}

async function startServer() {
  const expressApp = express();
  const PORT = 3000;
  const httpServer = createServer(expressApp);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  expressApp.use(cors());
  expressApp.use(express.json());

  io.on("connection", (socket) => {
    socket.on("join-clan", (clanId) => {
      socket.join(clanId);
    });

    socket.on("chat-message", async (data) => {
      const { clanId, text, userToken } = data;
      try {
        const decodedToken = await auth.verifyIdToken(userToken);
        const uid = decodedToken.uid;
        const userDoc = await db.collection("users").doc(uid).get();
        if (userDoc.exists && userDoc.data()?.clanId === clanId) {
          const msg = {
            id: Date.now().toString(),
            text,
            senderId: uid,
            senderName: userDoc.data()?.username,
            timestamp: Date.now(),
            isSystem: false
          };
          io.to(clanId).emit("receive-message", msg);
        }
      } catch (err) {
        console.error("Chat error:", err);
      }
    });
  });

  expressApp.post("/api/verify-oath", async (req, res) => {
    try {
      const { userToken } = req.body;
      if (!userToken) return res.status(401).json({ error: "Missing token" });

      const decodedToken = await auth.verifyIdToken(userToken);
      const uid = decodedToken.uid;
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

      const data = userDoc.data()!;
      const lastOath = data.lastOathTime || 0;
      const now = Date.now();
      
      const lastOathDate = new Date(lastOath).setUTCHours(0,0,0,0);
      const nowDate = new Date(now).setUTCHours(0,0,0,0);

      if (lastOathDate === nowDate) {
        return res.status(400).json({ error: "Already completed oath for today (UTC)." });
      }

      await db.runTransaction(async (tx) => {
        const doc = await tx.get(userRef);
        const d = doc.data()!;
        const newStreak = (d.currentStreak || 0) + 1;
        const newTotal = (d.totalSuccessfulDays || 0) + 1;
        const pts = (d.points || 0) + 10;
        
        let level = d.level || "Beginner";
        if (pts >= 100) level = "Fighter";
        if (pts >= 300) level = "Warrior";
        if (pts >= 1000) level = "Legend";

        tx.update(userRef, {
          lastOathTime: now,
          currentStreak: newStreak,
          totalSuccessfulDays: newTotal,
          points: pts,
          level
        });
      });

      if (data.clanId) {
        io.to(data.clanId).emit("receive-message", {
          id: Date.now().toString(),
          text: `الشيخ ${data.username} حلف اليوم وستريكه صار ${(data.currentStreak || 0) + 1} يوم! 🔥`,
          senderId: "system",
          senderName: "System",
          timestamp: Date.now(),
          isSystem: true
        });
      }

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  expressApp.post("/api/relapse", async (req, res) => {
    try {
      const { userToken } = req.body;
      const decodedToken = await auth.verifyIdToken(userToken);
      const uid = decodedToken.uid;
      
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

      const data = userDoc.data()!;

      await userRef.update({
        currentStreak: 0,
        points: Math.max(0, (data.points || 0) - 20)
      });

      if (data.clanId) {
        let aiMessage = `أفاااا، ${data.username} صار فاهي العشيرة وينتظر فزعتكم 📉`;
        try {
          const { GoogleGenAI } = await import("@google/genai");
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const response = await ai.models.generateContent({
            model: "gemini-3.1-pro-preview",
            contents: `Generate a short, funny, tough Iraqi-style message (1 sentence MAX) calling out a user named "${data.username}" for surrendering and losing their streak in a habit-breaking app. It should be motivating but mock them playfully. Use Iraqi dialect. Example: "ليش سويتها يا ضعيف النفس 😂"`,
            config: {
               thinkingConfig: { thinkingBudget: 1024 },
               temperature: 0.9
            }
          });
          if (response.text) aiMessage = response.text.trim();
        } catch (genError) {
          console.error("Gemini Error:", genError);
        }

        io.to(data.clanId).emit("receive-message", {
          id: Date.now().toString(),
          text: aiMessage,
          senderId: "system",
          senderName: "System",
          timestamp: Date.now(),
          isSystem: true
        });
        
        const clanRef = db.collection("clans").doc(data.clanId);
        const clanDoc = await clanRef.get();
        if (clanDoc.exists) {
          const cData = clanDoc.data()!;
          await clanRef.update({ powerIndex: Math.max(0, (cData.powerIndex || 0) - 10) });
        }
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Error" });
    }
  });

  expressApp.post("/api/panic", async (req, res) => {
    try {
      const { userToken } = req.body;
      const decodedToken = await auth.verifyIdToken(userToken);
      const uid = decodedToken.uid;
      const userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists && userDoc.data()?.clanId) {
         io.to(userDoc.data()!.clanId).emit("receive-message", {
            id: Date.now().toString(),
            text: `الحقوا بصاحبكم! ${userDoc.data()!.username} على حافة الاستسلام! 🚨`,
            senderId: "system",
            senderName: "System",
            timestamp: Date.now(),
            isSystem: true
         });
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "error" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    expressApp.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    expressApp.use(express.static(distPath));
    expressApp.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
