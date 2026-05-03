const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({
  origin: CLIENT_URL,
  methods: ["GET", "POST", "PATCH"],
  credentials: true
}));
app.use(express.json());

// ─────────────────────────────────────────────
// Language Configuration
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

// ─────────────────────────────────────────────
// Database
// ─────────────────────────────────────────────
const db = new sqlite3.Database(path.join(__dirname, "collab_editor.db"));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      room_id TEXT PRIMARY KEY,
      title TEXT DEFAULT 'Untitled',
      current_code TEXT,
      current_language TEXT DEFAULT 'javascript',
      owner_username TEXT DEFAULT NULL,
      is_private INTEGER DEFAULT 0,
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
      label TEXT,
      version INTEGER,
      saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(room_id)
    )
  `);
  // Multi-file table
  db.run(`
    CREATE TABLE IF NOT EXISTS room_files (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'file',
      parent_id TEXT DEFAULT NULL,
      content TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(room_id)
    )
  `);

  // Migrations (silent failures if columns already exist)
  db.run(`ALTER TABLE rooms ADD COLUMN title TEXT DEFAULT 'Untitled'`, () => { });
  db.run(`ALTER TABLE code_versions ADD COLUMN label TEXT`, () => { });
  db.run(`ALTER TABLE room_files ADD COLUMN type TEXT DEFAULT 'file'`, () => { });
  db.run(`ALTER TABLE room_files ADD COLUMN parent_id TEXT DEFAULT NULL`, () => { });
  db.run(`ALTER TABLE rooms ADD COLUMN owner_username TEXT DEFAULT NULL`, () => { });
  db.run(`ALTER TABLE rooms ADD COLUMN is_private INTEGER DEFAULT 0`, () => { });

  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_code_versions_room ON code_versions(room_id, version)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_room_files_room ON room_files(room_id)`);
  console.log("Database initialized");
});

// ─────────────────────────────────────────────
// DB Helpers
// ─────────────────────────────────────────────
function saveRoomCode(roomId, code, username, label = null, fileName = null) {
  db.run(`
    INSERT INTO rooms (room_id, current_code, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(room_id) DO UPDATE SET
      current_code = excluded.current_code,
      updated_at = CURRENT_TIMESTAMP
  `, [roomId, code]);

  db.get(`SELECT MAX(version) as max_version FROM code_versions WHERE room_id = ?`, [roomId], (err, row) => {
    const newVersion = (row?.max_version || 0) + 1;
    const fullLabel = fileName ? `${label || "Autosave"} (${fileName})` : (label || "Autosave");
    db.run(
      `INSERT INTO code_versions (room_id, code, username, label, version) VALUES (?, ?, ?, ?, ?)`,
      [roomId, code, username, fullLabel, newVersion],
      () => {
        db.run(`
          DELETE FROM code_versions
          WHERE room_id = ? AND version <= (SELECT MAX(version) - 50 FROM code_versions WHERE room_id = ?)
        `, [roomId, roomId]);
      }
    );
  });
}

function saveMessage(roomId, username, message) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO messages (room_id, username, message, timestamp) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [roomId, username, message],
      function (err) { if (err) reject(err); else resolve(this.lastID); }
    );
  });
}

function getRoomData(roomId) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM rooms WHERE room_id = ?`, [roomId], (err, row) => {
      if (err) reject(err); else resolve(row);
    });
  });
}

function getRoomMessages(roomId, limit = 100) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT username, message, timestamp FROM messages
      WHERE room_id = ? ORDER BY timestamp ASC LIMIT ?
    `, [roomId, limit], (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });
}

function getRoomLanguage(roomId) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT current_language FROM rooms WHERE room_id = ?`, [roomId], (err, row) => {
      if (err) reject(err); else resolve(row?.current_language || "javascript");
    });
  });
}

function updateRoomLanguage(roomId, language) {
  db.run(`
    INSERT INTO rooms (room_id, current_language, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(room_id) DO UPDATE SET current_language = excluded.current_language, updated_at = CURRENT_TIMESTAMP
  `, [roomId, language]);
}

function setRoomOwnerInDB(roomId, ownerUsername) {
  db.run(`
    INSERT INTO rooms (room_id, owner_username, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(room_id) DO UPDATE SET owner_username = excluded.owner_username, updated_at = CURRENT_TIMESTAMP
  `, [roomId, ownerUsername]);
}

function setRoomPrivacyInDB(roomId, isPrivate) {
  db.run(`
    INSERT INTO rooms (room_id, is_private, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(room_id) DO UPDATE SET is_private = excluded.is_private, updated_at = CURRENT_TIMESTAMP
  `, [roomId, isPrivate ? 1 : 0]);
}

function getRoomMeta(roomId) {
  return new Promise((resolve) => {
    db.get(`SELECT owner_username, is_private FROM rooms WHERE room_id = ?`, [roomId], (err, row) => {
      // Always resolve — a missing room is not an error, it just has no meta yet
      resolve(row || { owner_username: null, is_private: 0 });
    });
  });
}

function updateRoomTitle(roomId, title) {
  db.run(`
    INSERT INTO rooms (room_id, title, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(room_id) DO UPDATE SET title = excluded.title, updated_at = CURRENT_TIMESTAMP
  `, [roomId, title]);
}

// ── Multi-file helpers ──
function getRoomFiles(roomId) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM room_files WHERE room_id = ? ORDER BY created_at ASC`, [roomId], (err, rows) => {
      if (err) reject(err); else resolve(rows || []);
    });
  });
}

function upsertRoomFile(fileId, roomId, name, content, type = 'file', parentId = null) {
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO room_files (id, room_id, name, type, parent_id, content, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        parent_id = excluded.parent_id,
        content = excluded.content,
        updated_at = CURRENT_TIMESTAMP
    `, [fileId, roomId, name, type, parentId, content], function (err) {
      if (err) reject(err); else resolve();
    });
  });
}

function deleteRoomFile(fileId) {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM room_files WHERE id = ?`, [fileId], function (err) {
      if (err) reject(err); else resolve();
    });
  });
}

// ─────────────────────────────────────────────
// Code execution
// ─────────────────────────────────────────────
async function executeWithJudge0(code, languageId) {
  const lang = LANGUAGES[languageId];
  if (!lang) return { success: false, error: `Unknown language: ${languageId}` };
  if (lang.clientRendered) return { success: false, error: `${languageId.toUpperCase()} runs in browser` };

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
    const success = !!stdout && !stderr && result.status?.id === 3;
    return { success, output, error: stderr || compileOut || null };
  } catch (err) {
    return { success: false, output: null, error: err.message };
  }
}

// ─────────────────────────────────────────────
// Express Routes
// ─────────────────────────────────────────────
const executeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many execution requests, please slow down" },
});

app.post("/api/execute", executeLimiter, async (req, res) => {
  const { code, language } = req.body;
  if (!code?.trim()) return res.status(400).json({ success: false, error: "No code provided" });
  const result = await executeWithJudge0(code, language || "javascript");
  res.json(result);
});

app.get("/api/languages", (req, res) => {
  const list = Object.entries(LANGUAGES).map(([id, cfg]) => ({
    id, monacoId: cfg.monacoId, clientRendered: cfg.clientRendered || false,
  }));
  res.json({ success: true, languages: list });
});

// Get full room data
app.get("/api/room/:roomId", async (req, res) => {
  const { roomId } = req.params;
  try {
    const room = await getRoomData(roomId);
    const messages = await getRoomMessages(roomId);
    const language = await getRoomLanguage(roomId);
    const files = await getRoomFiles(roomId);
    res.json({
      success: true,
      data: {
        code: room?.current_code || null,
        language,
        title: room?.title || "Untitled",
        messages,
        files,
        exists: !!room,
        updatedAt: room?.updated_at || null,
        createdAt: room?.created_at || null,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get room files
app.get("/api/room/:roomId/files", async (req, res) => {
  const { roomId } = req.params;
  try {
    const files = await getRoomFiles(roomId);
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Manual save
app.post("/api/room/:roomId/save", (req, res) => {
  const { roomId } = req.params;
  const { code, username, label, fileName } = req.body;
  if (!code) return res.status(400).json({ success: false, error: "No code provided" });
  saveRoomCode(roomId, code, username || "anonymous", label || null, fileName || null);
  res.json({ success: true, savedAt: new Date().toISOString() });
});

// Update room title
app.patch("/api/room/:roomId/title", (req, res) => {
  const { roomId } = req.params;
  const { title } = req.body;
  if (!title?.trim()) return res.status(400).json({ success: false, error: "Title required" });
  updateRoomTitle(roomId, title.trim());
  res.json({ success: true });
});

// Get version history
app.get("/api/room/:roomId/versions", (req, res) => {
  const { roomId } = req.params;
  const { limit = 20 } = req.query;
  db.all(`
    SELECT version, username, label, saved_at, LENGTH(code) as code_length,
           SUBSTR(code, 1, 120) as code_preview
    FROM code_versions WHERE room_id = ? ORDER BY version DESC LIMIT ?
  `, [roomId, parseInt(limit)], (err, versions) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, versions });
  });
});

// Get specific version
app.get("/api/room/:roomId/version/:version", (req, res) => {
  const { roomId, version } = req.params;
  db.get(
    `SELECT code, username, label, saved_at FROM code_versions WHERE room_id = ? AND version = ?`,
    [roomId, version],
    (err, versionData) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      if (!versionData) return res.status(404).json({ success: false, error: "Version not found" });
      res.json({ success: true, version: versionData });
    }
  );
});

// ─────────────────────────────────────────────
// Socket.IO
// ─────────────────────────────────────────────
const server = http.createServer(app);
const roomUsers = new Map();
const roomFilesCache = new Map(); // roomId -> Map<fileId, {id, name, content}>
const roomMessagesCache = new Map();
const roomOwners = new Map();
const roomJoinOrder = new Map();
const roomPendingJoins = new Map();

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST", "PATCH"],
    credentials: true
  },
});

function getRoomFilesMap(roomId) {
  if (!roomFilesCache.has(roomId)) roomFilesCache.set(roomId, new Map());
  return roomFilesCache.get(roomId);
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("cursor-change", ({ roomId, username, position, fileId }) => {
    socket.to(roomId).emit("cursor-change", { username, position, fileId });
  });

  socket.on("join-room", async ({ roomId, username, approved }) => {
    // Username uniqueness check
    if (roomUsers.has(roomId)) {
      const taken = Array.from(roomUsers.get(roomId).values()).some(u => u.username === username);
      if (taken) { socket.emit("username-taken"); return; }
    }
    // Privacy check — use DB as source of truth, not memory
    const roomMeta = await getRoomMeta(roomId);
    if (roomMeta.is_private && !approved) {
      const dbOwner = roomMeta.owner_username;
      if (dbOwner && dbOwner !== username) {
        // Don't block — put them in a pending queue and notify the owner
        if (!roomPendingJoins.has(roomId)) roomPendingJoins.set(roomId, new Map());
        roomPendingJoins.get(roomId).set(username, socket.id);
        socket.emit("join-pending"); // tell the joiner to wait
        // Notify the owner if they're online
        const usersInRoom = roomUsers.get(roomId);
        if (usersInRoom) {
          let ownerFound = false;
          for (const [sid, user] of usersInRoom.entries()) {
            if (user.username === dbOwner) {
              ownerFound = true;
              const ownerSocket = io.sockets.sockets.get(sid);
              if (ownerSocket) {
                ownerSocket.emit("join-request", { username, socketId: socket.id });
                console.log(`Join request from ${username} sent to owner ${dbOwner}`);
              } else {
                console.log(`Owner ${dbOwner} socket not found for sid ${sid}`);
              }
            }
          }
          if (!ownerFound) {
            console.log(`Owner ${dbOwner} is not currently in the room — nobody to notify`);
            // Owner is offline, fall back to blocking
            socket.emit("room-private");
          }
        } else {
          console.log(`No users in room ${roomId} — owner is offline`);
          socket.emit("room-private");
        }
        return;
      }
    }

    if (socket.roomId) { socket.leave(socket.roomId); removeUserFromRoom(socket.id, socket.roomId); }

    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;

    if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Map());
    roomUsers.get(roomId).set(socket.id, { id: socket.id, username, joinedAt: Date.now() });

    // Track join order
    if (!roomJoinOrder.has(roomId)) roomJoinOrder.set(roomId, []);
    if (!roomJoinOrder.get(roomId).includes(username)) {
      roomJoinOrder.get(roomId).push(username);
    }

    // Set owner if room has none yet
    // Set owner if room has none in memory yet (e.g. after server restart)
    if (!roomOwners.has(roomId)) {
      const dbOwner = roomMeta.owner_username;
      if (dbOwner) {
        // Restore from DB — don't hand ownership to whoever joins first
        roomOwners.set(roomId, dbOwner);
      } else {
        // Brand new room — first joiner is the owner
        roomOwners.set(roomId, username);
        setRoomOwnerInDB(roomId, username);
      }
    }

    const owner = roomOwners.get(roomId);
    io.to(roomId).emit("room-users", Array.from(roomUsers.get(roomId).values()));
    io.to(roomId).emit("owner-change", { owner });
    // Notify others only if it's not the owner quietly restoring their session
    const wasServerRestart = roomMeta.owner_username && roomUsers.get(roomId).size === 1;
    if (!wasServerRestart) {
      socket.to(roomId).emit("user-joined", { username });
    }

    // Load room data
    const [roomData, savedMessages, savedLanguage] = await Promise.all([
      getRoomData(roomId),
      getRoomMessages(roomId),
      getRoomLanguage(roomId),
    ]);

    // Send room metadata
    socket.emit("room-meta", {
      title: roomData?.title || "Untitled",
      updatedAt: roomData?.updated_at || null,
      createdAt: roomData?.created_at || null,
      owner,
      isPrivate: !!roomMeta.is_private,
    });

    // Create room record if it doesn't exist
    db.run(
      `INSERT OR IGNORE INTO rooms (room_id, current_language, owner_username, created_at, updated_at) VALUES (?, 'javascript', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [roomId, username]
    );

    // ── Multi-file sync ──
    const filesMap = getRoomFilesMap(roomId);
    let filesToSend = Array.from(filesMap.values());

    if (filesToSend.length === 0) {
      // Try to load from DB
      const dbFiles = await getRoomFiles(roomId);
      if (dbFiles.length > 0) {
        dbFiles.forEach(f => filesMap.set(f.id, { id: f.id, name: f.name, content: f.content, unsaved: false }));
        filesToSend = dbFiles.map(f => ({ id: f.id, name: f.name, content: f.content, unsaved: false }));
      } else {
        // Brand new room — create default file
        const defaultFile = {
          id: "f1",
          name: "index.js",
          content: "// Start coding...\nconsole.log('Hello, World!');\n",
          unsaved: false,
        };
        filesMap.set("f1", defaultFile);
        filesToSend = [defaultFile];
        await upsertRoomFile("f1", roomId, "index.js", defaultFile.content);
      }
    }

    socket.emit("file-sync", { files: filesToSend });

    // Chat history
    if (savedMessages?.length) {
      socket.emit("chat-history", savedMessages.map(msg => ({
        ...msg, isOwnMessage: msg.username === username
      })));
    }

    console.log(`${username} joined room ${roomId} (${roomUsers.get(roomId).size} users)`);
  });

  // ── Code change (per file) ──
  socket.on("code-change", ({ roomId, fileId, code, username }) => {
    if (code === undefined || code === null || !fileId) return;

    // Update cache
    const filesMap = getRoomFilesMap(roomId);
    const existing = filesMap.get(fileId);
    if (existing) filesMap.set(fileId, { ...existing, content: code });

    // Debounced autosave
    if (socket.codeSaveTimeout) clearTimeout(socket.codeSaveTimeout);
    socket.codeSaveTimeout = setTimeout(async () => {
      const file = filesMap.get(fileId);
      if (file) {
        await upsertRoomFile(fileId, roomId, file.name, code);
        saveRoomCode(roomId, code, username, null, file.name);
      }
      io.to(roomId).emit("autosaved", { savedAt: new Date().toISOString(), username });
    }, 5000);

    socket.to(roomId).emit("code-change", { fileId, code, username });
  });

  // ── File created ──
  socket.on("file-created", async ({ roomId, file, username }) => {
    const filesMap = getRoomFilesMap(roomId);
    filesMap.set(file.id, file);
    await upsertRoomFile(file.id, roomId, file.name, file.content || "", file.type || 'file', file.parentId || null);
    socket.to(roomId).emit("file-created", { file, username });
  });

  // ── File deleted ──
  socket.on("file-deleted", async ({ roomId, fileId, username }) => {
    const filesMap = getRoomFilesMap(roomId);
    filesMap.delete(fileId);
    await deleteRoomFile(fileId);
    socket.to(roomId).emit("file-deleted", { fileId, username });
  });

  // ── File renamed ──
  socket.on("file-renamed", async ({ roomId, fileId, name, parentId, username }) => {
    const filesMap = getRoomFilesMap(roomId);
    const existing = filesMap.get(fileId);
    if (existing) filesMap.set(fileId, { ...existing, name, parentId: parentId ?? existing.parentId });
    db.run(
      `UPDATE room_files SET name = ?, parent_id = COALESCE(?, parent_id), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, parentId ?? null, fileId]
    );
    socket.to(roomId).emit("file-renamed", { fileId, name, parentId, username });
  });

  // ── Language change (backward compat) ──
  socket.on("language-change", ({ roomId, language, username }) => {
    if (!language) return;
    updateRoomLanguage(roomId, language);
    io.to(roomId).emit("language-change", { language, username });
  });

  // ── Chat ──
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

  // ── Manual save ──
  socket.on("manual-save", ({ roomId, code, username, label, fileName }) => {
    if (!code || !roomId) return;
    saveRoomCode(roomId, code, username, label || "Manual save", fileName || null);
    io.to(roomId).emit("autosaved", { savedAt: new Date().toISOString(), username, label: label || "Manual save" });
  });

  // ── Approve join request ──
  socket.on("approve-join", ({ roomId, targetUsername, requesterUsername }) => {
    const owner = roomOwners.get(roomId);
    if (owner !== requesterUsername) return;

    const pending = roomPendingJoins.get(roomId);
    if (!pending || !pending.has(targetUsername)) return;

    const targetSocketId = pending.get(targetUsername);
    pending.delete(targetUsername);

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      targetSocket.emit("join-approved");
    }
  });

  // ── Deny join request ──
  socket.on("deny-join", ({ roomId, targetUsername, requesterUsername }) => {
    const owner = roomOwners.get(roomId);
    if (owner !== requesterUsername) return;

    const pending = roomPendingJoins.get(roomId);
    if (!pending || !pending.has(targetUsername)) return;

    const targetSocketId = pending.get(targetUsername);
    pending.delete(targetUsername);

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      targetSocket.emit("join-denied");
    }
  });

  // ── Kick user ──
  socket.on("kick-user", ({ roomId, targetUsername, requesterUsername }) => {
    const owner = roomOwners.get(roomId);
    if (owner !== requesterUsername) return; // only owner can kick
    if (targetUsername === requesterUsername) return; // can't kick yourself

    // Find the target's socket and disconnect them from the room
    const usersInRoom = roomUsers.get(roomId);
    if (!usersInRoom) return;
    for (const [sid, user] of usersInRoom.entries()) {
      if (user.username === targetUsername) {
        const targetSocket = io.sockets.sockets.get(sid);
        if (targetSocket) {
          targetSocket.emit("you-were-kicked");
          targetSocket.leave(roomId);
          targetSocket.roomId = null;
        }
        usersInRoom.delete(sid);
        break;
      }
    }
    // Remove from join order
    const joinOrder = roomJoinOrder.get(roomId) || [];
    roomJoinOrder.set(roomId, joinOrder.filter(u => u !== targetUsername));

    io.to(roomId).emit("room-users", Array.from(usersInRoom.values()));
    io.to(roomId).emit("owner-change", { owner: roomOwners.get(roomId) });
    io.to(roomId).emit("user-kicked", { username: targetUsername });
  });

  // ── Transfer ownership ──
  socket.on("transfer-owner", ({ roomId, targetUsername, requesterUsername }) => {
    const owner = roomOwners.get(roomId);
    if (owner !== requesterUsername) return;
    const usersInRoom = roomUsers.get(roomId);
    if (!usersInRoom) return;
    const targetExists = Array.from(usersInRoom.values()).some(u => u.username === targetUsername);
    if (!targetExists) return;

    roomOwners.set(roomId, targetUsername);
    setRoomOwnerInDB(roomId, targetUsername);
    io.to(roomId).emit("owner-change", { owner: targetUsername });
    io.to(roomId).emit("chat-message", {
      message: `👑 ${requesterUsername} transferred ownership to ${targetUsername}`,
      username: "System",
      timestamp: Date.now(),
    });
  });

  // ── Set privacy ──
  socket.on("set-privacy", ({ roomId, isPrivate, requesterUsername }) => {
    const owner = roomOwners.get(roomId);
    if (owner !== requesterUsername) return;
    setRoomPrivacyInDB(roomId, isPrivate);
    io.to(roomId).emit("privacy-change", { isPrivate });
    io.to(roomId).emit("chat-message", {
      message: `🔒 ${requesterUsername} made the room ${isPrivate ? "private" : "public"}`,
      username: "System",
      timestamp: Date.now(),
    });
  });

  // ── Room rename ──
  socket.on("rename-room", ({ roomId, title, username }) => {
    if (!title?.trim()) return;
    updateRoomTitle(roomId, title.trim());
    io.to(roomId).emit("room-renamed", { title: title.trim(), username });
  });

  socket.on("disconnect", () => {
    if (socket.codeSaveTimeout) {
      clearTimeout(socket.codeSaveTimeout);
      if (socket.roomId) {
        const filesMap = getRoomFilesMap(socket.roomId);
        filesMap.forEach(async (file) => {
          await upsertRoomFile(file.id, socket.roomId, file.name, file.content);
          saveRoomCode(socket.roomId, file.content, socket.username || "anonymous", null, file.name);
        });
      }
    }
    if (socket.roomId && socket.username) {
      socket.to(socket.roomId).emit("user-left", { username: socket.username });

      // If the disconnecting user was the owner, transfer to next in join order
      if (roomOwners.get(socket.roomId) === socket.username) {
        const joinOrder = roomJoinOrder.get(socket.roomId) || [];
        const remaining = joinOrder.filter(u => {
          if (u === socket.username) return false;
          const usersInRoom = roomUsers.get(socket.roomId);
          if (!usersInRoom) return false;
          return Array.from(usersInRoom.values()).some(usr => usr.username === u);
        });
        if (remaining.length > 0) {
          const newOwner = remaining[0];
          roomOwners.set(socket.roomId, newOwner);
          setRoomOwnerInDB(socket.roomId, newOwner);
          io.to(socket.roomId).emit("owner-change", { owner: newOwner });
          io.to(socket.roomId).emit("chat-message", {
            message: `👑 ${socket.username} left — ${newOwner} is now the room owner`,
            username: "System",
            timestamp: Date.now(),
          });
        } else {
          roomOwners.delete(socket.roomId);
          roomJoinOrder.delete(socket.roomId);
        }
      }

      // Remove from join order
      const joinOrder = roomJoinOrder.get(socket.roomId) || [];
      roomJoinOrder.set(socket.roomId, joinOrder.filter(u => u !== socket.username));

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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));