const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────
// Language Configuration
// Add new languages here — no other changes needed
// Full list of Piston runtimes: https://emkc.org/api/v2/piston/runtimes
// ─────────────────────────────────────────────
const LANGUAGES = {
  javascript: { judge0Id: 63, monacoId: "javascript" },
  python: { judge0Id: 71, monacoId: "python" },
  c: { judge0Id: 50, monacoId: "c" },
  cpp: { judge0Id: 54, monacoId: "cpp" },
  java: { judge0Id: 62, monacoId: "java" },
  go: { judge0Id: 60, monacoId: "go" },
  rust: { judge0Id: 73, monacoId: "rust" },
  php: { judge0Id: 68, monacoId: "php" },
  ruby: { judge0Id: 72, monacoId: "ruby" },
  kotlin: { judge0Id: 78, monacoId: "kotlin" },
  bash: { judge0Id: 46, monacoId: "shell" },

  html: { clientRendered: true, monacoId: "html" },
  css: { clientRendered: true, monacoId: "css" },
};

const JUDGE0_URL = "https://ce.judge0.com";
const EXECUTION_TIMEOUT_MS = 10000;

// ─────────────────────────────────────────────
// Database setup
// ─────────────────────────────────────────────
const db = new sqlite3.Database(path.join(__dirname, "collab_editor.db"));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      room_id TEXT PRIMARY KEY,
      current_code TEXT,
      current_language TEXT DEFAULT 'javascript',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT,
      username TEXT,
      message TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(room_id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS code_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT,
      code TEXT,
      username TEXT,
      version INTEGER,
      saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(room_id)
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_code_versions_room ON code_versions(room_id, version)`);
  console.log("Database initialized");
});

// ─────────────────────────────────────────────
// DB helpers
// ─────────────────────────────────────────────
function saveRoomCode(roomId, code, username) {
  db.run(`
    INSERT INTO rooms (room_id, current_code, updated_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(room_id) DO UPDATE SET 
      current_code = excluded.current_code,
      updated_at = CURRENT_TIMESTAMP
  `, [roomId, code]);

  db.get(`SELECT MAX(version) as max_version FROM code_versions WHERE room_id = ?`, [roomId], (err, row) => {
    const newVersion = (row?.max_version || 0) + 1;
    db.run(`INSERT INTO code_versions (room_id, code, username, version) VALUES (?, ?, ?, ?)`,
      [roomId, code, username, newVersion], () => {
        db.run(`
          DELETE FROM code_versions 
          WHERE room_id = ? AND version <= (SELECT MAX(version) - 50 FROM code_versions WHERE room_id = ?)
        `, [roomId, roomId]);
      });
  });
}

function saveMessage(roomId, username, message) {
  return new Promise((resolve, reject) => {
    db.run(`INSERT INTO messages (room_id, username, message, timestamp) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [roomId, username, message], function (err) {
        if (err) reject(err);
        resolve(this.lastID);
      });
  });
}

function getRoomData(roomId) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM rooms WHERE room_id = ?`, [roomId], (err, room) => {
      if (err) reject(err);
      resolve(room);
    });
  });
}

function getRoomMessages(roomId, limit = 100) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT username, message, timestamp FROM messages 
      WHERE room_id = ? ORDER BY timestamp ASC LIMIT ?
    `, [roomId, limit], (err, messages) => {
      if (err) reject(err);
      resolve(messages);
    });
  });
}

function getRoomLanguage(roomId) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT current_language FROM rooms WHERE room_id = ?`, [roomId], (err, row) => {
      if (err) reject(err);
      resolve(row?.current_language || "javascript");
    });
  });
}

function updateRoomLanguage(roomId, language) {
  db.run(`
    INSERT INTO rooms (room_id, current_language, updated_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(room_id) DO UPDATE SET 
      current_language = excluded.current_language,
      updated_at = CURRENT_TIMESTAMP
  `, [roomId, language]);
}

// ─────────────────────────────────────────────
// Piston execution
// ─────────────────────────────────────────────
async function executeWithJudge0(code, languageId) {
  const lang = LANGUAGES[languageId];

  if (!lang) return { success: false, output: null, error: `Unknown language: ${languageId}` };
  if (lang.clientRendered) return { success: false, output: null, error: `${languageId.toUpperCase()} runs in browser` };

  try {
    const res = await fetch(`${JUDGE0_URL}/submissions?wait=true&base64_encoded=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: Buffer.from(code).toString("base64"),
        language_id: lang.judge0Id,
        base64_encoded: true,
      }),
    });

    const result = await res.json();

    const decode = (str) => str ? Buffer.from(str, "base64").toString("utf-8") : null;

    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);
    const compileOut = decode(result.compile_output);
    const statusDesc = result.status?.description || "";

    const output = stdout || stderr || compileOut || `Status: ${statusDesc}` || "No output";
    const success = !!stdout && !stderr && result.status?.id === 3; // 3 = Accepted

    return { success, output, error: stderr || compileOut || null };

  } catch (err) {
    return { success: false, output: null, error: err.message };
  }
}

// ─────────────────────────────────────────────
// Express routes
// ─────────────────────────────────────────────
const executeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many execution requests, please slow down" },
});

// Execute code
app.post("/api/execute", executeLimiter, async (req, res) => {
  const { code, language } = req.body;

  if (!code || !code.trim()) {
    return res.status(400).json({ success: false, error: "No code provided" });
  }

  const langId = language || "javascript";
  console.log(`Executing ${langId} code (${code.length} chars)`);

  const result = await executeWithJudge0(code, langId);
  res.json(result);
});

// List supported languages (useful for the frontend dropdown)
app.get("/api/languages", (req, res) => {
  const list = Object.entries(LANGUAGES).map(([id, cfg]) => ({
    id,
    monacoId: cfg.monacoId,
    clientRendered: cfg.clientRendered || false,
    supported: cfg.clientRendered || !!cfg.pistonName,
  }));
  res.json({ success: true, languages: list });
});

// Get room data
app.get("/api/room/:roomId", async (req, res) => {
  const { roomId } = req.params;
  try {
    const room = await getRoomData(roomId);
    const messages = await getRoomMessages(roomId);
    const language = await getRoomLanguage(roomId);
    res.json({ success: true, data: { code: room?.current_code || null, language, messages, exists: !!room } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Version history
app.get("/api/room/:roomId/versions", (req, res) => {
  const { roomId } = req.params;
  const { limit = 20 } = req.query;
  db.all(`
    SELECT version, username, saved_at, SUBSTR(code, 1, 200) as code_preview 
    FROM code_versions WHERE room_id = ? ORDER BY version DESC LIMIT ?
  `, [roomId, limit], (err, versions) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, versions });
  });
});

app.get("/api/room/:roomId/version/:version", (req, res) => {
  const { roomId, version } = req.params;
  db.get(`SELECT code, username, saved_at FROM code_versions WHERE room_id = ? AND version = ?`,
    [roomId, version], (err, versionData) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      if (!versionData) return res.status(404).json({ success: false, error: "Version not found" });
      res.json({ success: true, version: versionData });
    });
});

// ─────────────────────────────────────────────
// Socket.IO
// ─────────────────────────────────────────────
const server = http.createServer(app);
const roomUsers = new Map();
const roomCodeCache = new Map();
const roomMessagesCache = new Map();

const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"], credentials: true },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("cursor-change", ({ roomId, username, position }) => {
    socket.to(roomId).emit("cursor-change", {
      username,
      position,
    });
  });

  socket.on("join-room", async ({ roomId, username }) => {
    if (roomUsers.has(roomId)) {
      const taken = Array.from(roomUsers.get(roomId).values()).some(u => u.username === username);
      if (taken) { socket.emit("username-taken"); return; }
    }

    if (socket.roomId) { socket.leave(socket.roomId); removeUserFromRoom(socket.id, socket.roomId); }

    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;

    if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Map());
    roomUsers.get(roomId).set(socket.id, { id: socket.id, username, joinedAt: Date.now() });

    io.to(roomId).emit("room-users", Array.from(roomUsers.get(roomId).values()));
    socket.to(roomId).emit("user-joined", { username });

    const roomData = await getRoomData(roomId);
    const savedMessages = await getRoomMessages(roomId);
    const savedLanguage = await getRoomLanguage(roomId);

    if (roomData?.current_code) {
      roomCodeCache.set(roomId, roomData.current_code);
      socket.emit("initial-code", roomData.current_code);
    } else if (roomCodeCache.has(roomId)) {
      socket.emit("initial-code", roomCodeCache.get(roomId));
    }

    socket.emit("language-change", { language: savedLanguage || "javascript", username: "System" });
    db.run(`INSERT OR IGNORE INTO rooms (room_id, current_language, created_at, updated_at) VALUES (?, 'javascript', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [roomId]);

    if (savedMessages?.length) {
      socket.emit("chat-history", savedMessages.map(msg => ({ ...msg, isOwnMessage: msg.username === username })));
      roomMessagesCache.set(roomId, savedMessages);
    }

    console.log(`${username} joined room ${roomId} (${roomUsers.get(roomId).size} users)`);
  });

  socket.on("code-change", ({ roomId, code, username }) => {
    if (code === undefined || code === null) return;
    roomCodeCache.set(roomId, code);
    if (socket.codeSaveTimeout) clearTimeout(socket.codeSaveTimeout);
    socket.codeSaveTimeout = setTimeout(() => saveRoomCode(roomId, code, username), 5000);
    socket.to(roomId).emit("code-change", { code, username });
  });

  socket.on("language-change", ({ roomId, language, username }) => {
    if (!language) return;
    updateRoomLanguage(roomId, language);
    io.to(roomId).emit("language-change", { language, username });
    console.log(`${username} changed language to ${language} in room ${roomId}`);
  });

  socket.on("chat-message", async ({ roomId, message, username }) => {
    if (!message?.trim()) return;
    const msg = { message: message.trim(), username, timestamp: Date.now() };
    await saveMessage(roomId, username, msg.message);
    if (!roomMessagesCache.has(roomId)) roomMessagesCache.set(roomId, []);
    const msgs = roomMessagesCache.get(roomId);
    msgs.push(msg);
    if (msgs.length > 200) roomMessagesCache.set(roomId, msgs.slice(-200));
    io.to(roomId).emit("chat-message", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (socket.codeSaveTimeout) clearTimeout(socket.codeSaveTimeout);
    if (socket.roomId && socket.username) {
      socket.to(socket.roomId).emit("user-left", { username: socket.username });
      removeUserFromRoom(socket.id, socket.roomId);
    }
  });
});

function removeUserFromRoom(socketId, roomId) {
  if (!roomUsers.has(roomId)) return;
  const user = roomUsers.get(roomId).get(socketId);
  roomUsers.get(roomId).delete(socketId);
  const usersList = Array.from(roomUsers.get(roomId).values());
  io.to(roomId).emit("room-users", usersList);
  console.log(`${user?.username} removed from room ${roomId} (${usersList.length} remaining)`);
}

// Health check
app.get("/health", (req, res) => {
  const totalUsers = Array.from(roomUsers.values()).reduce((sum, m) => sum + m.size, 0);
  db.get(`SELECT COUNT(*) as count FROM rooms`, (err, row) => {
    res.json({
      status: "ok",
      activeRooms: roomUsers.size,
      totalUsers,
      totalRoomsInDB: row?.count || 0,
      supportedLanguages: Object.keys(LANGUAGES).length,
    });
  });
});

const PORT = 3001;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));