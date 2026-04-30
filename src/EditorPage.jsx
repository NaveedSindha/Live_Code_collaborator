import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { io } from "socket.io-client";
import * as monaco from "monaco-editor";

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080b10; }

  .ep-root {
    display: flex;
    height: 100vh;
    flex-direction: column;
    background: #080b10;
    font-family: 'DM Sans', sans-serif;
    color: #e8eaf0;
    overflow: hidden;
  }
   .remote-cursor {
  border-left: 2px solid #ff4d4f;
  height: 1.2em;
  margin-left: -1px;
}

.remote-cursor-label {
  background: #ff4d4f;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 4px;
}

  /* ── Toolbar ── */
  .ep-toolbar {
    height: 52px;
    background: #0d1117;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 12px;
    flex-shrink: 0;
    z-index: 10;
  }

  .ep-logo {
    width: 30px;
    height: 30px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(99,102,241,0.35);
  }

  .ep-toolbar-divider {
    width: 1px;
    height: 20px;
    background: rgba(255,255,255,0.08);
    flex-shrink: 0;
  }

  .ep-lang-select {
    padding: 6px 28px 6px 10px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    color: #e8eaf0;
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 500;
    outline: none;
    cursor: pointer;
    transition: all 0.15s;
    -webkit-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='rgba(255,255,255,0.3)' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    min-width: 130px;
  }

  .ep-lang-select option { background: #1a1d28; }
  .ep-lang-select:hover { border-color: rgba(99,102,241,0.4); background-color: rgba(99,102,241,0.06); }

  .ep-btn-run {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    letter-spacing: 0.02em;
    box-shadow: 0 3px 10px rgba(34,197,94,0.3);
  }

  .ep-btn-run:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(34,197,94,0.4); }
  .ep-btn-run:active { transform: translateY(0); }
  .ep-btn-run:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

  .ep-run-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: white;
  }

  .ep-btn-run.running .ep-run-dot {
    animation: ep-pulse 0.8s ease-in-out infinite;
  }

  @keyframes ep-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.7); }
  }

  .ep-toolbar-pill {
    padding: 6px 12px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 8px;
    font-size: 12px;
    color: rgba(255,255,255,0.35);
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .ep-toolbar-pill:hover { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.65); }

  .ep-toolbar-spacer { flex: 1; }

  .ep-room-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px;
    background: rgba(99,102,241,0.08);
    border: 1px solid rgba(99,102,241,0.18);
    border-radius: 20px;
    font-size: 12px;
  }

  .ep-room-id {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    color: #818cf8;
    letter-spacing: 0.06em;
  }

  .ep-conn-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 6px rgba(34,197,94,0.7);
  }

  .ep-conn-dot.offline { background: #ef4444; box-shadow: 0 0 6px rgba(239,68,68,0.7); }

  /* ── Body ── */
  .ep-body {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  /* ── Editor Panel ── */
  .ep-editor-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    border-right: 1px solid rgba(255,255,255,0.05);
  }

  /* ── Output Console ── */
  .ep-console {
    height: 220px;
    background: #0a0d14;
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .ep-console-header {
    height: 38px;
    background: #0c1018;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    display: flex;
    align-items: center;
    padding: 0 14px;
    gap: 10px;
    flex-shrink: 0;
  }

  .ep-console-title {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(99,102,241,0.7);
    flex: 1;
  }

  .ep-console-action {
    padding: 3px 10px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 5px;
    color: rgba(255,255,255,0.35);
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'DM Sans', sans-serif;
  }

  .ep-console-action:hover { border-color: rgba(255,255,255,0.18); color: rgba(255,255,255,0.6); }

  .ep-console-body {
    flex: 1;
    padding: 12px 16px;
    overflow-y: auto;
    font-family: 'DM Mono', monospace;
    font-size: 12.5px;
    line-height: 1.7;
  }

  .ep-console-empty {
    color: rgba(255,255,255,0.15);
    font-style: italic;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }

  .ep-output-line { margin-bottom: 2px; }
  .ep-output-error { color: #ff6b6b; }
  .ep-output-success { color: #64ffda; }
  .ep-output-default { color: #c9d1d9; }
  .ep-output-info { color: #79c0ff; }

  /* ── Sidebar ── */
  .ep-sidebar {
    width: 280px;
    background: #0d1117;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .ep-sidebar-section {
    padding: 16px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }

  .ep-section-label {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.25);
    margin-bottom: 12px;
  }

  .ep-user-chip {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    border-radius: 8px;
    background: transparent;
    transition: background 0.15s;
    margin-bottom: 4px;
  }

  .ep-user-chip:last-child { margin-bottom: 0; }
  .ep-user-chip.self { background: rgba(99,102,241,0.08); }

  .ep-avatar {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    color: white;
    flex-shrink: 0;
  }

  .ep-avatar-other {
    background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
  }

  .ep-username {
    font-size: 13px;
    font-weight: 500;
    color: rgba(255,255,255,0.8);
  }

  .ep-you-badge {
    margin-left: auto;
    font-size: 10px;
    padding: 2px 7px;
    background: rgba(99,102,241,0.15);
    border: 1px solid rgba(99,102,241,0.25);
    border-radius: 4px;
    color: #818cf8;
    font-family: 'DM Mono', monospace;
    letter-spacing: 0.04em;
  }

  /* ── Chat ── */
  .ep-chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ep-chat-empty {
    text-align: center;
    color: rgba(255,255,255,0.18);
    font-size: 12px;
    margin-top: 20px;
    line-height: 1.6;
  }

  .ep-msg-row {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .ep-msg-row.own { align-items: flex-end; }
  .ep-msg-row.other { align-items: flex-start; }

  .ep-msg-sender {
    font-size: 10px;
    color: rgba(255,255,255,0.3);
    padding: 0 4px;
  }

  .ep-msg-bubble {
    max-width: 85%;
    padding: 8px 12px;
    border-radius: 12px;
    font-size: 13px;
    line-height: 1.45;
    word-wrap: break-word;
  }

  .ep-msg-bubble.own {
    background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
    color: white;
    border-bottom-right-radius: 3px;
  }

  .ep-msg-bubble.other {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.07);
    color: rgba(255,255,255,0.8);
    border-bottom-left-radius: 3px;
  }

  /* ── Chat Input ── */
  .ep-chat-input-area {
    padding: 12px;
    border-top: 1px solid rgba(255,255,255,0.05);
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .ep-chat-input {
    flex: 1;
    padding: 9px 12px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 9px;
    color: #e8eaf0;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    outline: none;
    transition: all 0.15s;
  }

  .ep-chat-input::placeholder { color: rgba(255,255,255,0.2); }
  .ep-chat-input:focus { border-color: rgba(99,102,241,0.45); background: rgba(99,102,241,0.05); }

  .ep-btn-send {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
    border: none;
    border-radius: 9px;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
    transition: all 0.15s;
    box-shadow: 0 3px 10px rgba(99,102,241,0.3);
  }

  .ep-btn-send:hover { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(99,102,241,0.4); }

  /* ── Leave btn ── */
  .ep-btn-leave {
    padding: 6px 14px;
    background: transparent;
    border: 1px solid rgba(239,68,68,0.25);
    border-radius: 8px;
    color: rgba(239,68,68,0.6);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'DM Sans', sans-serif;
  }

  .ep-btn-leave:hover {
    background: rgba(239,68,68,0.08);
    border-color: rgba(239,68,68,0.5);
    color: #ef4444;
  }

  /* ── Username Modal ── */
  .ep-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.8);
    backdrop-filter: blur(16px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .ep-modal {
    background: #0f1219;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 40px;
    width: 380px;
    text-align: center;
    box-shadow: 0 40px 100px rgba(0,0,0,0.7);
  }

  .ep-modal-icon {
    font-size: 32px;
    margin-bottom: 20px;
  }

  .ep-modal-title {
    font-family: 'Syne', sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: white;
    margin-bottom: 8px;
  }

  .ep-modal-sub {
    font-size: 13px;
    color: rgba(255,255,255,0.35);
    margin-bottom: 28px;
  }

  .ep-modal-label {
    display: block;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.3);
    margin-bottom: 8px;
    text-align: left;
  }

  .ep-modal-input {
    width: 100%;
    padding: 13px 16px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: #e8eaf0;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    outline: none;
    margin-bottom: 8px;
    transition: all 0.15s;
    text-align: center;
  }

  .ep-modal-input:focus { border-color: rgba(99,102,241,0.55); background: rgba(99,102,241,0.06); box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
  .ep-modal-input::placeholder { color: rgba(255,255,255,0.2); }

  .ep-modal-error {
    font-size: 12px;
    color: #fca5a5;
    margin-bottom: 16px;
    text-align: left;
  }

  .ep-modal-btn {
    width: 100%;
    padding: 13px;
    background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    box-shadow: 0 4px 16px rgba(99,102,241,0.35);
  }
    .ep-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #1a1d2e;
  border: 1px solid rgba(99,102,241,0.25);
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 13px;
  color: rgba(255,255,255,0.75);
  z-index: 999;
  white-space: nowrap;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  animation: ep-toast-in 0.2s ease;
  pointer-events: none;
}

.ep-toast span { color: #818cf8; font-weight: 500; }

@keyframes ep-toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

  .ep-modal-btn:hover { box-shadow: 0 6px 20px rgba(99,102,241,0.45); transform: translateY(-1px); }
  .ep-modal-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

  .ep-modal-room-id {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: rgba(255,255,255,0.2);
    margin-top: 16px;
    letter-spacing: 0.1em;
  }

  .ep-chat-messages::-webkit-scrollbar { width: 4px; }
  .ep-chat-messages::-webkit-scrollbar-track { background: transparent; }
  .ep-chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

  .ep-console-body::-webkit-scrollbar { width: 4px; }
  .ep-console-body::-webkit-scrollbar-track { background: transparent; }
  .ep-console-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
`;

function EditorPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const isRemoteChange = useRef(false);
  const pendingCodeRef = useRef(null);
  const chatEndRef = useRef(null);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  function showToast(msg) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [users, setUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState(location.state?.username || "");
  const [showUsernameModal, setShowUsernameModal] = useState(!location.state?.username);
  const [tempUsername, setTempUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [output, setOutput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  const [copyOutLabel, setCopyOutLabel] = useState("Copy");
  const [htmlPreview, setHtmlPreview] = useState("");
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(() => location.state?.language || "javascript");
  const currentLanguageRef = useRef(currentLanguage);
  const remoteCursorsRef = useRef({});
  const [editorReady, setEditorReady] = useState(false);

  const availableLanguages = [
    { id: "javascript", name: "JavaScript", defaultCode: "// Start coding...\n" },
    { id: "typescript", name: "TypeScript", defaultCode: "// Start coding...\n" },
    { id: "python", name: "Python", defaultCode: "# Start coding...\n" },
    { id: "c", name: "C", defaultCode: "// Start coding...\n\nint main() {\n  return 0;\n}" },
    { id: "cpp", name: "C++", defaultCode: "// Start coding...\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n  return 0;\n}" },
    { id: "java", name: "Java", defaultCode: "// Start coding...\n\npublic class Main {\n  public static void main(String[] args) {\n    \n  }\n}" },
    { id: "go", name: "Go", defaultCode: "// Start coding...\n\npackage main\n\nfunc main() {\n\n}" },
    { id: "rust", name: "Rust", defaultCode: "// Start coding...\n\nfn main() {\n\n}" },
    { id: "ruby", name: "Ruby", defaultCode: "# Start coding...\n" },
    { id: "php", name: "PHP", defaultCode: "<?php\n// Start coding...\n" },
    { id: "kotlin", name: "Kotlin", defaultCode: "// Start coding...\n\nfun main() {\n\n}" },
    { id: "bash", name: "Bash", defaultCode: "#!/bin/bash\n# Start coding...\n" },
    { id: "html", name: "HTML", defaultCode: "<!DOCTYPE html>\n<html>\n<head>\n  <title>Preview</title>\n</head>\n<body>\n  \n</body>\n</html>" },
    { id: "css", name: "CSS", defaultCode: "/* Start coding... */\n" },
  ];

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!editorRef.current || !isConnected || !socketRef.current) return;

    const disposable = editorRef.current.onDidChangeCursorPosition((e) => {
      socketRef.current.emit("cursor-change", {
        roomId,
        username,
        position: e.position,
      });
    });

    return () => disposable.dispose();
  }, [isConnected, currentLanguage, editorReady]);

  function handleEditorDidMount(editor) {
    editorRef.current = editor;
    if (pendingCodeRef.current !== null) {
      editor.setValue(pendingCodeRef.current);
      pendingCodeRef.current = null;
    }
    setEditorReady(true);

  }

  function handleEditorChange(value) {
    if (isRemoteChange.current || !socketRef.current || !isConnected || !editorRef.current) return;
    if (value === undefined || value === null) return;
    socketRef.current.emit("code-change", { roomId, code: value, username });
  }

  async function executeCode() {
    if (!editorRef.current) return;
    const code = editorRef.current.getValue();
    if (!code.trim()) { setOutput("⚠ No code to execute"); return; }

    // HTML/CSS — render in iframe instead of sending to server
    if (currentLanguage === "html" || currentLanguage === "css") {
      const htmlContent = currentLanguage === "css"
        ? `<!DOCTYPE html><html><head><style>${code}</style></head><body><h1>CSS Preview</h1><p>Your styles are applied to this page.</p></body></html>`
        : code;
      setHtmlPreview(htmlContent);
      setShowHtmlPreview(true);
      setShowOutput(true);
      return;
    }

    setShowHtmlPreview(false);
    setIsExecuting(true);
    setOutput("Running…");

    try {
      const res = await fetch("http://localhost:3001/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language: currentLanguage || "javascript", roomId }),
      });
      const result = await res.json();
      setOutput(result.output || result.error || "No output returned");
    } catch (err) {
      setOutput(`Failed to execute: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  }

  function handleLanguageChange(newLanguage) {
    if (newLanguage === currentLanguage) return;

    setCurrentLanguage(newLanguage);
    currentLanguageRef.current = newLanguage;

    if (editorRef.current) {
      const model = editorRef.current.getModel();
      monaco.editor.setModelLanguage(model, newLanguage);

      const currentCode = editorRef.current.getValue();
      const isDefaultCode = availableLanguages.some(
        l => l.defaultCode.trim() === currentCode.trim()
      );

      if (!currentCode.trim() || isDefaultCode) {
        const newTemplate =
          availableLanguages.find(l => l.id === newLanguage)?.defaultCode || "";
        editorRef.current.setValue(newTemplate);
      }
    }

    if (socketRef.current && isConnected) {
      socketRef.current.emit("language-change", {
        roomId,
        language: newLanguage,
        username,
      });
    }
  }

  function sendMessage() {
    if (!chatInput.trim() || !socketRef.current) return;
    socketRef.current.emit("chat-message", { roomId, message: chatInput, username });
    setChatInput("");
  }

  function handleJoinRoom() {
    if (isJoining) return;
    if (!tempUsername.trim()) { setUsernameError("Username is required"); return; }
    if (tempUsername.length > 20) { setUsernameError("Max 20 characters"); return; }
    setIsJoining(true);
    setUsernameError("");
    setUsername(tempUsername);
    setShowUsernameModal(false);
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    initializeSocket(tempUsername);
  }

  function initializeSocket(usernameToUse) {
    const socket = io("http://localhost:3001", { reconnection: true, reconnectionAttempts: 5, reconnectionDelay: 1000 });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join-room", { roomId, username: usernameToUse });
    });

    socket.on("connect_error", () => {
      setUsernameError("Failed to connect to server");
      setShowUsernameModal(true);
      setIsJoining(false);
    });

    socket.on("code-change", ({ code }) => {
      if (!editorRef.current) { pendingCodeRef.current = code; return; }
      isRemoteChange.current = true;
      if (editorRef.current.getValue() !== code) editorRef.current.setValue(code);
      isRemoteChange.current = false;
    });

    socket.on("language-change", ({ language, username: changer }) => {
      if (!language || language === currentLanguageRef.current) return;
      setCurrentLanguage(language);
      currentLanguageRef.current = language;
      if (editorRef.current) monaco.editor.setModelLanguage(editorRef.current.getModel(), language);
      if (changer && changer !== usernameToUse && changer !== "System") {
        const langName = availableLanguages.find(l => l.id === language)?.name || language;
        showToast(`${changer} switched to ${langName}`);
      }
    });

    socket.on("chat-message", ({ message, username: senderUsername, timestamp }) => {
      setMessages(prev => [...prev, { message, username: senderUsername, isOwnMessage: senderUsername === usernameToUse, timestamp: timestamp || Date.now() }]);
    });

    socket.on("chat-history", (msgs) => {
      if (msgs?.length) setMessages(msgs.map(m => ({ ...m, isOwnMessage: m.username === usernameToUse })));
    });

    socket.on("room-users", setUsers);

    socket.on("initial-code", (code) => {
      if (!code) return;
      if (editorRef.current) { isRemoteChange.current = true; editorRef.current.setValue(code); isRemoteChange.current = false; }
      else pendingCodeRef.current = code;
    });

    socket.on("username-taken", () => {
      setUsernameError("Username already taken in this room.");
      setShowUsernameModal(true);
      setIsConnected(false);
      setIsJoining(false);
      socket.disconnect();
      socketRef.current = null;
    });

    socket.on("cursor-change", ({ username: sender, position }) => {
      if (!editorRef.current || sender === usernameToUse) return;

      const editor = editorRef.current;

      const oldDecorations = remoteCursorsRef.current[sender] || [];

      const newDecorations = editor.deltaDecorations(oldDecorations, [
        {
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          options: {
            className: "remote-cursor",
            after: {
              content: sender,   // ✅ THIS is what shows the name
              inlineClassName: "remote-cursor-label",
            },
          },
        },
      ]);

      remoteCursorsRef.current[sender] = newDecorations;
    });
  }

  function leaveRoom() {
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    navigate("/");
  }

  useEffect(() => {
    if (username && !socketRef.current && !showUsernameModal) initializeSocket(username);
    return () => { if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; } };
  }, [username, showUsernameModal]);

  const getInitials = (name) => name ? name.slice(0, 2).toUpperCase() : "?";

  const classifyOutputLine = (line) => {
    if (line.includes("Error") || line.includes("error") || line.startsWith("Failed")) return "ep-output-error";
    if (line.includes("Return value:")) return "ep-output-success";
    if (line.startsWith("Running") || line.includes("⚠")) return "ep-output-info";
    return "ep-output-default";
  };

  if (showUsernameModal) {
    return (
      <>
        <style>{globalStyles}</style>
        <div className="ep-modal-overlay">
          <div className="ep-modal">
            <div className="ep-modal-icon">⌘</div>
            <div className="ep-modal-title">Join Session</div>
            <div className="ep-modal-sub">Enter a username to enter room {roomId}</div>
            <label className="ep-modal-label">Username</label>
            <input
              className="ep-modal-input"
              type="text"
              value={tempUsername}
              onChange={(e) => { setTempUsername(e.target.value); setUsernameError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
              placeholder="your_name"
              autoFocus
            />
            {usernameError && <div className="ep-modal-error">⚠ {usernameError}</div>}
            <button className="ep-modal-btn" onClick={handleJoinRoom} disabled={isJoining}>
              {isJoining ? "Joining…" : "Enter Room →"}
            </button>
            <div className="ep-modal-room-id">Room ID: {roomId}</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{globalStyles}</style>
      <div className="ep-root">

        {/* Toolbar */}
        <div className="ep-toolbar">
          <div className="ep-logo">⌘</div>
          <div className="ep-toolbar-divider" />

          <select
            className="ep-lang-select"
            value={currentLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            {availableLanguages.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>

          <button
            className={`ep-btn-run ${isExecuting ? "running" : ""}`}
            onClick={executeCode}
            disabled={isExecuting}
          >
            <span className="ep-run-dot" />
            {isExecuting ? "Running…" : "Run Code"}
          </button>

          <button className="ep-toolbar-pill" onClick={() => setShowOutput(!showOutput)}>
            {showOutput ? "Hide Console" : "Show Console"}
          </button>

          <div className="ep-toolbar-spacer" />

          <div className="ep-room-badge">
            <span className={`ep-conn-dot ${isConnected ? "" : "offline"}`} />
            <span className="ep-room-id">{roomId}</span>
          </div>

          <button className="ep-btn-leave" onClick={leaveRoom}>Leave</button>
        </div>

        {/* Body */}
        <div className="ep-body">

          {/* Editor + Console column */}
          <div className="ep-editor-panel">
            <Editor
              key={currentLanguage}
              height={showOutput ? "calc(100% - 220px)" : "100%"}
              language={currentLanguage}
              defaultValue={availableLanguages.find(l => l.id === currentLanguage)?.defaultCode || "// Start coding..."}
              theme="vs-dark"
              onMount={handleEditorDidMount}
              onChange={handleEditorChange}
              options={{
                automaticLayout: true,
                tabSize: 2,
                fontSize: 13.5,
                fontFamily: "'DM Mono', 'Cascadia Code', 'Fira Code', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                renderLineHighlight: "gutter",
                padding: { top: 16, bottom: 16 },
                cursorBlinking: "smooth",
                smoothScrolling: true,
                fontLigatures: true,
              }}
            />

            {showOutput && (
              <div className="ep-console">
                <div className="ep-console-header">
                  <span className="ep-console-title">{showHtmlPreview ? "Preview" : "Output"}</span>
                  <button
                    className="ep-console-action"
                    onClick={() => {
                      if (output) {
                        navigator.clipboard.writeText(output);
                        setCopyOutLabel("Copied!");
                        setTimeout(() => setCopyOutLabel("Copy"), 2000);
                      }
                    }}
                    disabled={!output}
                  >
                    {copyOutLabel}
                  </button>
                  <button className="ep-console-action" onClick={() => setOutput("")} style={{ marginLeft: 4 }}>Clear</button>
                </div>
                <div className="ep-console-body" style={{ padding: showHtmlPreview ? 0 : undefined }}>
                  {showHtmlPreview ? (
                    <iframe
                      srcDoc={htmlPreview}
                      style={{ width: "100%", height: "100%", border: "none", background: "white", display: "block" }}
                      sandbox="allow-scripts"
                      title="HTML/CSS Preview"
                    />
                  ) : output ? (
                    output.split("\n").map((line, i) => (
                      <div key={i} className={`ep-output-line ${classifyOutputLine(line)}`}>{line || " "}</div>
                    ))
                  ) : (
                    <div className="ep-console-empty">
                      ▷ Run your code to see output here
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="ep-sidebar">
            {/* Users */}
            <div className="ep-sidebar-section">
              <div className="ep-section-label">Online — {users.length}</div>
              {users.map((user, idx) => (
                <div key={user.id || idx} className={`ep-user-chip ${user.username === username ? "self" : ""}`}>
                  <div className={`ep-avatar ${user.username !== username ? "ep-avatar-other" : ""}`}>
                    {getInitials(user.username)}
                  </div>
                  <span className="ep-username">{user.username}</span>
                  {user.username === username && <span className="ep-you-badge">you</span>}
                </div>
              ))}
            </div>

            {/* Chat messages */}
            <div className="ep-chat-messages">
              {messages.length === 0 && (
                <div className="ep-chat-empty">No messages yet.<br />Start the conversation.</div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`ep-msg-row ${msg.isOwnMessage ? "own" : "other"}`}>
                  {!msg.isOwnMessage && <span className="ep-msg-sender">{msg.username}</span>}
                  <div className={`ep-msg-bubble ${msg.isOwnMessage ? "own" : "other"}`}>
                    {msg.message}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <div className="ep-chat-input-area">
              <input
                className="ep-chat-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={`Message as ${username}…`}
              />
              <button className="ep-btn-send" onClick={sendMessage} title="Send">↑</button>
            </div>
          </div>

        </div>
        {toast && (
          <div className="ep-toast">
            <span>{toast.split(" switched")[0]}</span>
            {" switched" + toast.split(" switched")[1]}
          </div>
        )}
      </div>
    </>
  );
}

export default EditorPage;
