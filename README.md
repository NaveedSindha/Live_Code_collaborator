# ⌘ CodeSync

> **Real-time collaborative code editor for engineering teams.**  
> Write, run, and review code together — no setup, no friction.

![CodeSync Banner](https://img.shields.io/badge/version-1.0.0-6366f1?style=for-the-badge&labelColor=0c0f18)
![Node](https://img.shields.io/badge/node-18+-22c55e?style=for-the-badge&labelColor=0c0f18)
![React](https://img.shields.io/badge/react-18-61dafb?style=for-the-badge&labelColor=0c0f18)
![License](https://img.shields.io/badge/license-MIT-f59e0b?style=for-the-badge&labelColor=0c0f18)

---

## ✦ What is CodeSync?

CodeSync is a full-stack collaborative IDE that lets multiple developers write and execute code in the same room simultaneously. Think Google Docs, but for code — with syntax highlighting, multi-file support, folder trees, live chat, version history, and real-time code execution across 13 languages.

Built entirely from scratch with React, Node.js, Socket.IO, and Monaco Editor (the same editor that powers VS Code).

---

## ✦ Feature Overview

### 🤝 Real-Time Collaboration
- **Live multi-user editing** — see changes from collaborators instantly as they type
- **Remote cursor tracking** — see exactly where each collaborator's cursor is, labeled with their username
- **Presence indicators** — know who's in the room at all times

### 📁 Full File System
- **Multi-file support** — create, rename, delete, and switch between files with a tab system
- **Folder tree** — nested folder structure with collapse/expand
- **File upload** — drag & drop files or upload entire folders, preserving directory structure
- **Export as ZIP** — download your entire workspace as a structured `.zip` file
- **Right-click context menu** — rename, delete, download individual files

### ▶ Code Execution
- **13 languages supported** — JavaScript, TypeScript, Python, C, C++, Java, Go, Rust, PHP, Ruby, Kotlin, Bash
- **HTML/CSS live preview** — renders directly in the built-in browser preview panel
- **Resizable console** — output panel with syntax-colored results, copy, and clear

### 💾 Persistence & History
- **Autosave** — code saves automatically after 5 seconds of inactivity
- **Version history** — up to 50 versions per room, with labels, timestamps, and code previews
- **Manual save with labels** — tag important checkpoints (e.g. "working auth flow")
- **One-click restore** — restore any previous version instantly

### 🔒 Room Management
- **Public & private rooms** — owner can toggle room visibility at any time
- **Join request system** — private rooms require owner approval to enter
- **Kick & transfer** — owners can remove users or hand off ownership
- **Automatic owner transfer** — if the owner leaves, ownership passes to the next earliest joiner
- **Persistent ownership** — owner state survives server restarts

### 💬 Built-in Chat
- **Per-room chat** — message history persists across sessions
- **System messages** — ownership transfers and privacy changes announced in chat

### ⌨ Keyboard Shortcuts
| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + S` | Manual save |
| `Ctrl/Cmd + W` | Close active tab |
| `Ctrl/Cmd + Enter` | Run code |
| `Ctrl/Cmd + B` | Toggle sidebar |
| `Ctrl/Cmd + \`` | Toggle console |

---

## ✦ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Monaco Editor, Socket.IO Client |
| **Backend** | Node.js, Express, Socket.IO |
| **Database** | SQLite3 (via `better-sqlite3`) |
| **Code Execution** | Judge0 CE (public API) |
| **Routing** | React Router v6 |
| **File Compression** | JSZip |
| **Rate Limiting** | express-rate-limit |

---

## ✦ Prerequisites

Before running CodeSync, make sure you have the following installed:

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org)
- **npm** v9 or higher (comes with Node)
- **Git** — [git-scm.com](https://git-scm.com)

To verify your versions:
```bash
node --version   # should be v18+
npm --version    # should be v9+
```

---

## ✦ Project Structure

```
live-code-collab/
├── public/                     # Static assets
├── src/                        # React frontend source
│   ├── assets/                 # Images, icons, etc.
│   ├── components/             # Reusable UI components
│   │   ├── EditorPane.jsx      # Monaco editor + console
│   │   ├── RightPanel.jsx      # Chat + version history
│   │   ├── Sidebar.jsx         # File explorer + users + search
│   │   ├── StatusBar.jsx       # Bottom status bar
│   │   └── Toolbar.jsx         # Top toolbar
│   ├── hooks/                  # Custom React hooks
│   │   └── useFiles.js         # File system state & operations
│   ├── pages/                  # Page-level components
│   │   └── EditorPage.jsx      # Main IDE page
│   ├── styles/                 # Styling files
│   │   └── editorStyles.js     # Global CSS-in-JS styles
│   ├── App.jsx                 # Root component
│   ├── HomePage.jsx            # Landing / room join page
│   └── main.jsx                # Entry point
│
├── server/                     # Node.js backend
│   ├── index.js                # Express + Socket.IO server
│   ├── collab_editor.db        # SQLite database (auto-generated)
│   └── package.json            # Server dependencies
│
├── index.html                  # Vite HTML template
├── package.json                # Frontend dependencies
├── vite.config.js              # Vite configuration
├── .gitignore
└── README.md
```

---

## ✦ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/codesync.git
cd codesync
```

### 2. Install server dependencies

```bash
cd server
npm install
```

The server requires the following packages (all installed automatically):

```
express
socket.io
cors
sqlite3
express-rate-limit
```

### 3. Install client dependencies

```bash
# from the root folder
npm install
```

The client requires the following packages (all installed automatically):

```
react
react-dom
react-router-dom
@monaco-editor/react
monaco-editor
socket.io-client
jszip
```

---

## ✦ Running the App

You need two terminal windows — one for the server, one for the client.

### Terminal 1 — Start the server

```bash
cd server
node server.js
```

You should see:
```
Database initialized
Server running on http://localhost:3001
```

### Terminal 2 — Start the client

```bash
# from the root folder
npm run dev
```

You should see:
```
VITE v5.x.x  ready in Xms
➜  Local:   http://localhost:5173/
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ✦ How to Use

### Creating a room
1. Go to the homepage
2. Enter a username
3. Click **Create Room**
4. Share the generated Room ID or invite link with collaborators

### Joining a room
1. Go to the homepage
2. Enter your username and the 8-character Room ID
3. Click **Join Session**

### Inviting collaborators
- Click the **room ID badge** in the top toolbar to copy a direct invite link
- Share the link — collaborators just need to open it and enter a username

### Private rooms
- As the room owner, click **🌐 Public** in the toolbar to switch to **🔒 Private**
- New joiners will see a waiting screen and must be approved by the owner
- Open the 👥 **Users panel** to see and approve/deny pending requests

---

## ✦ Supported Languages

| Language | Extension | Execution |
|---|---|---|
| JavaScript | `.js`, `.jsx` | ✅ Server-side |
| TypeScript | `.ts`, `.tsx` | ✅ Server-side |
| Python | `.py` | ✅ Server-side |
| C | `.c`, `.h` | ✅ Server-side |
| C++ | `.cpp`, `.cc` | ✅ Server-side |
| Java | `.java` | ✅ Server-side |
| Go | `.go` | ✅ Server-side |
| Rust | `.rs` | ✅ Server-side |
| PHP | `.php` | ✅ Server-side |
| Ruby | `.rb` | ✅ Server-side |
| Kotlin | `.kt` | ✅ Server-side |
| Bash | `.sh` | ✅ Server-side |
| HTML | `.html` | 🌐 Browser preview |
| CSS | `.css` | 🌐 Browser preview |

> Code execution is powered by the [Judge0 CE](https://judge0.com) public API. For production use, consider self-hosting a Judge0 instance to avoid rate limits.

---

## ✦ Environment Configuration

By default the app connects to `http://localhost:3001`. To change this for production, update the following locations in the client:

- `src/pages/EditorPage.jsx` — Socket.IO connection URL and all `fetch` calls
- `src/pages/HomePage.jsx` — Room existence check fetch call

For the server, update the Socket.IO CORS origin:
```js
// server.js
const io = new Server(server, {
  cors: { origin: "http://localhost:5173" } // change to your frontend URL
});
```

---

## ✦ Database

CodeSync uses SQLite — no database setup required. The database file (`collab_editor.db`) is created automatically in the server directory on first run.

**Tables:**
- `rooms` — room metadata, title, owner, privacy setting
- `messages` — chat history per room
- `code_versions` — up to 50 versions per room
- `room_files` — all files and folders with parent-child relationships

The database persists between server restarts. To reset everything, delete `collab_editor.db`.

---

## ✦ Known Limitations

- **Judge0 rate limits** — the public Judge0 API has rate limits. Under heavy use, code execution may fail. Self-host Judge0 for production.
- **No authentication** — rooms are identified by ID only. Anyone with the ID can join public rooms.
- **SQLite** — suitable for personal/team use. For large scale, migrate to PostgreSQL.
- **In-memory room state** — active user lists and file caches live in memory. A server crash clears active sessions (files and messages persist in the DB).

---

## ✦ Roadmap

- [ ] AI code assistant (explain, fix, generate)
- [ ] Diff view in version history
- [ ] Room password protection
- [ ] Deployable Docker image
- [ ] Mobile-responsive layout

---

## ✦ License

MIT — free to use, modify, and distribute.

---

<div align="center">

Built with ♥ using React, Node.js, and Monaco Editor

</div>
