import { useEffect, useRef, useState, useCallback } from "react";
import JSZip from "jszip";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import * as monaco from "monaco-editor";
import { API_URL } from "../config";

import { globalStyles } from "../styles/editorStyles";
import { useFiles, getLangFromFile } from "../hooks/useFiles";
import { Toolbar } from "../components/Toolbar";
import { Sidebar } from "../components/Sidebar";
import { EditorPane } from "../components/EditorPane";
import { RightPanel } from "../components/RightPanel";
import { StatusBar } from "../components/StatusBar";

function formatRelativeTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function saveRecentRoom(roomId, title, language) {
  try {
    const recents = JSON.parse(localStorage.getItem("ep_recent_rooms") || "[]");
    const filtered = recents.filter(r => r.roomId !== roomId);
    filtered.unshift({ roomId, title: title || "Untitled", language: language || "javascript", visitedAt: Date.now() });
    localStorage.setItem("ep_recent_rooms", JSON.stringify(filtered.slice(0, 10)));
  } catch { }
}

function EditorPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const socketRef = useRef(null);
  const editorsRef = useRef({});
  const isRemoteChange = useRef(false);
  const chatEndRef = useRef(null);
  const remoteCursorsRef = useRef({});
  const toastTimerRef = useRef(null);
  const saveDebounceRef = useRef(null);
  const ctxMenuRef = useRef(null);
  const resizingRef = useRef(false);
  const fileInputRef = useRef(null);

  const [toast, setToast] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState(location.state?.username || "");
  const [showUsernameModal, setShowUsernameModal] = useState(!location.state?.username);
  const [tempUsername, setTempUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [users, setUsers] = useState([]);
  const [roomOwner, setRoomOwner] = useState(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]); // [{username, socketId}]
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [activityTab, setActivityTab] = useState("files");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [panelTab, setPanelTab] = useState("chat");
  const [panelOpen, setPanelOpen] = useState(true);
  const [output, setOutput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConsole, setShowConsole] = useState(true);
  const [consoletab, setConsoletab] = useState("output");
  const [htmlPreview, setHtmlPreview] = useState("");
  const [consoleHeight, setConsoleHeight] = useState(200);
  const [copyOutLabel, setCopyOutLabel] = useState("Copy");
  const [saveStatus, setSaveStatus] = useState("saved");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [roomTitle, setRoomTitle] = useState("Untitled");
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [saveLabelInput, setSaveLabelInput] = useState("");
  const [restoringVersion, setRestoringVersion] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [ctxMenu, setCtxMenu] = useState(null);

  function showToast(msg) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }

  const fileState = useFiles({ roomId, username, socketRef, showToast, fileInputRef });
  const {
    files, setFiles, activeFileId, setActiveFileId, openTabs, setOpenTabs,
    renamingFileId, setRenamingFileId, renameValue, setRenameValue,
    creatingFile, setCreatingFile, newFileName, setNewFileName,
    creatingFolder, setCreatingFolder, newFolderName, setNewFolderName,
    creatingFileInFolder, setCreatingFileInFolder,
    newFileInFolderName, setNewFileInFolderName,
    collapsedFolders, uploadingFiles, dragActive, uploadProgress,
    searchQuery, setSearchQuery, searchResults,
    openFile, closeTab, updateFileContent,
    createNewFile, createNewFolder, createNewFileInFolder,
    deleteFile, deleteFolder, renameFile, toggleFolder,
    downloadFile, handleFileUpload, handleFolderUpload,
    handleDragOver, handleDragLeave, handleDrop,
  } = fileState;

  const activeFile = files.find(f => f.id === activeFileId);
  const activeLanguage = activeFile ? getLangFromFile(activeFile.name) : "javascript";
  const isOwner = roomOwner === username;

  function handleEditorMount(editor, fileId) {
    editorsRef.current[fileId] = editor;
    editor.onDidChangeCursorPosition((e) => {
      socketRef.current?.emit("cursor-change", { roomId, username, position: e.position, fileId });
    });
  }

  function handleEditorChange(value, fileId) {
    if (isRemoteChange.current) return;
    if (value === undefined || value === null) return;
    updateFileContent(fileId, value);
    setSaveStatus("unsaved");
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => setSaveStatus("saving"), 3000);
    socketRef.current?.emit("code-change", { roomId, fileId, code: value, username });
  }

  async function executeCode() {
    if (!activeFile) return;
    const code = activeFile.content;
    if (!code.trim()) { setOutput("⚠ No code to execute"); return; }
    const lang = getLangFromFile(activeFile.name);
    if (lang === "html" || lang === "css") {
      const html = lang === "css"
        ? `<!DOCTYPE html><html><head><style>${code}</style></head><body><h1>CSS Preview</h1></body></html>`
        : code;
      setHtmlPreview(html);
      setConsoletab("preview");
      setShowConsole(true);
      return;
    }
    setConsoletab("output");
    setIsExecuting(true);
    setOutput("Running…");
    try {
      const res = await fetch(`${API_URL}/api/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language: lang }),
      });
      const result = await res.json();
      setOutput(result.output || result.error || "No output returned");
    } catch (err) {
      setOutput(`Failed to execute: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  }

  function triggerManualSave() {
    if (!activeFile || !socketRef.current) return;
    const label = saveLabelInput.trim() || "Manual save";
    socketRef.current.emit("manual-save", { roomId, code: activeFile.content, username, label, fileName: activeFile.name });
    setSaveStatus("saving");
    setSaveLabelInput("");
    showToast(`Saved: ${label}`);
  }

  const loadVersions = useCallback(async () => {
    setVersionsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/room/${roomId}/versions?limit=30`);
      const data = await res.json();
      if (data.success) setVersions(data.versions);
    } catch { }
    setVersionsLoading(false);
  }, [roomId]);

  useEffect(() => {
    if (panelTab === "versions") loadVersions();
  }, [panelTab]);

  async function restoreVersion(version) {
    setRestoringVersion(version.version);
    try {
      const res = await fetch(`${API_URL}/api/room/${roomId}/version/${version.version}`);
      const data = await res.json();
      if (data.success && activeFile) {
        const code = data.version.code;
        isRemoteChange.current = true;
        updateFileContent(activeFile.id, code);
        const editor = editorsRef.current[activeFile.id];
        if (editor) editor.setValue(code);
        isRemoteChange.current = false;
        socketRef.current?.emit("code-change", { roomId, fileId: activeFile.id, code, username });
        showToast(`Restored v${version.version}`);
        setPanelTab("chat");
      }
    } catch { }
    setRestoringVersion(null);
  }

  function approveJoin(targetUsername) {
    socketRef.current?.emit("approve-join", { roomId, targetUsername, requesterUsername: username });
    setJoinRequests(prev => prev.filter(r => r.username !== targetUsername));
    showToast(`✅ ${targetUsername} approved`);
  }

  function denyJoin(targetUsername) {
    socketRef.current?.emit("deny-join", { roomId, targetUsername, requesterUsername: username });
    setJoinRequests(prev => prev.filter(r => r.username !== targetUsername));
    showToast(`❌ ${targetUsername} denied`);
  }

  function kickUser(targetUsername) {
    if (!isOwner || targetUsername === username) return;
    socketRef.current?.emit("kick-user", { roomId, targetUsername, requesterUsername: username });
  }

  function transferOwner(targetUsername) {
    if (!isOwner || targetUsername === username) return;
    socketRef.current?.emit("transfer-owner", { roomId, targetUsername, requesterUsername: username });
  }

  function togglePrivacy() {
    if (!isOwner) return;
    socketRef.current?.emit("set-privacy", { roomId, isPrivate: !isPrivate, requesterUsername: username });
  }

  async function downloadAllAsZip() {
    const zip = new JSZip();
    function getFullPath(file) {
      const parts = [];
      let current = file;
      while (current.parentId) {
        const parent = files.find(f => f.id === current.parentId);
        if (!parent) break;
        parts.unshift(parent.name);
        current = parent;
      }
      parts.push(file.name);
      return parts.join("/");
    }
    files.filter(f => f.type !== "folder").forEach(f => zip.file(getFullPath(f), f.content || ""));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${roomTitle || roomId}.zip`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast("📦 Downloaded as ZIP");
  }

  useEffect(() => {
    function handleKeyDown(e) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      switch (e.key) {
        case "s": e.preventDefault(); triggerManualSave(); break;
        case "w": e.preventDefault(); if (activeFileId) closeTab(activeFileId); break;
        case "`": e.preventDefault(); setShowConsole(v => !v); break;
        case "b": e.preventDefault(); setSidebarOpen(v => !v); break;
        case "Enter": e.preventDefault(); executeCode(); break;
        default: break;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFileId, activeFile, socketRef, username, roomId, isExecuting]);

  function handleTitleBlur(e) {
    const newTitle = e.target.value.trim() || "Untitled";
    setRoomTitle(newTitle);
    socketRef.current?.emit("rename-room", { roomId, title: newTitle, username });
    saveRecentRoom(roomId, newTitle, activeLanguage);
  }

  function sendMessage() {
    if (!chatInput.trim() || !socketRef.current) return;
    socketRef.current.emit("chat-message", { roomId, message: chatInput, username });
    setChatInput("");
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleFileRightClick(e, fileId) {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, fileId });
  }

  useEffect(() => {
    function close(e) {
      if (ctxMenuRef.current && ctxMenuRef.current.contains(e.target)) return;
      setCtxMenu(null);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function startResizingConsole(e) {
    resizingRef.current = true;
    const startY = e.clientY;
    const startH = consoleHeight;
    function onMove(ev) {
      if (!resizingRef.current) return;
      setConsoleHeight(Math.max(80, Math.min(500, startH + (startY - ev.clientY))));
    }
    function onUp() {
      resizingRef.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const saveStatusLabel = () => {
    if (saveStatus === "saving") return "Saving…";
    if (saveStatus === "saved") return lastSavedAt ? `Saved ${formatRelativeTime(lastSavedAt)}` : "Saved";
    return "Unsaved changes";
  };

  function initializeSocket(usernameToUse) {
    const socket = io(API_URL, {
      reconnection: true, reconnectionAttempts: 5, reconnectionDelay: 1000,
    });
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

    socket.on("room-meta", ({ title, updatedAt, owner, isPrivate: priv }) => {
      if (title) setRoomTitle(title);
      if (updatedAt) { setLastSavedAt(updatedAt); setSaveStatus("saved"); }
      if (owner) setRoomOwner(owner);
      if (priv !== undefined) setIsPrivate(priv);
      saveRecentRoom(roomId, title, activeLanguage);
    });

    socket.on("owner-change", ({ owner }) => {
      setRoomOwner(owner);
      if (owner === usernameToUse) showToast("👑 You are now the room owner");
    });

    socket.on("privacy-change", ({ isPrivate: priv }) => setIsPrivate(priv));

    socket.on("you-were-kicked", () => {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
      navigate("/", { state: { kicked: true } });
    });

    socket.on("user-kicked", ({ username: kicked }) => showToast(`${kicked} was removed from the room`));

    socket.on("room-private", () => {
      setUsernameError("This room is private.");
      setShowUsernameModal(true);
      setIsConnected(false);
      setIsJoining(false);
      socket.disconnect();
      socketRef.current = null;
    });

    socket.on("join-pending", () => {
      setWaitingForApproval(true);
      setIsJoining(false);
    });

    socket.on("join-approved", () => {
      setWaitingForApproval(false);
      socket.emit("join-room", { roomId, username: usernameToUse, approved: true });
    });

    socket.on("join-denied", () => {
      setWaitingForApproval(false);
      setUsernameError("The room owner denied your request.");
      setShowUsernameModal(true);
      setIsConnected(false);
      socket.disconnect();
      socketRef.current = null;
    });

    socket.on("join-request", ({ username: requester, socketId }) => {
      setJoinRequests(prev => {
        if (prev.some(r => r.username === requester)) return prev;
        return [...prev, { username: requester, socketId }];
      });
      setActivityTab("users");
      setSidebarOpen(true);
      showToast(`👋 ${requester} wants to join — check the Users panel`);
    });

    socket.on("initial-code", (code) => {
      if (!code || !activeFile) return;
      isRemoteChange.current = true;
      setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: code } : f));
      const editor = editorsRef.current[activeFileId];
      if (editor && editor.getValue() !== code) editor.setValue(code);
      isRemoteChange.current = false;
    });

    socket.on("file-sync", ({ files: remoteFiles }) => {
      if (remoteFiles?.length) {
        isRemoteChange.current = true;
        setFiles(remoteFiles);
        setOpenTabs([remoteFiles[0].id]);
        setActiveFileId(remoteFiles[0].id);
        isRemoteChange.current = false;
      }
    });

    socket.on("code-change", ({ fileId, code }) => {
      isRemoteChange.current = true;
      setFiles(prev => prev.map(f => {
        if (f.id !== fileId) return f;
        const editor = editorsRef.current[fileId];
        if (editor && editor.getValue() !== code) editor.setValue(code);
        return { ...f, content: code };
      }));
      isRemoteChange.current = false;
    });

    socket.on("file-created", ({ file }) => {
      setFiles(prev => prev.some(f => f.id === file.id) ? prev : [...prev, file]);
      showToast(`${file.name} added by collaborator`);
    });

    socket.on("file-deleted", ({ fileId }) => {
      setFiles(prev => prev.filter(f => f.id !== fileId));
      closeTab(fileId);
    });

    socket.on("file-renamed", ({ fileId, name }) => {
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, name } : f));
    });

    socket.on("language-change", () => { });

    socket.on("autosaved", ({ savedAt }) => {
      setLastSavedAt(savedAt);
      setSaveStatus("saved");
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      setFiles(prev => prev.map(f => ({ ...f, unsaved: false })));
      if (panelTab === "versions") loadVersions();
    });

    socket.on("room-renamed", ({ title, username: renamer }) => {
      setRoomTitle(title);
      if (renamer !== usernameToUse) showToast(`${renamer} renamed to "${title}"`);
      saveRecentRoom(roomId, title, activeLanguage);
    });

    socket.on("chat-message", ({ message, username: senderUsername, timestamp }) => {
      setMessages(prev => [...prev, {
        message, username: senderUsername,
        isOwnMessage: senderUsername === usernameToUse,
        timestamp: timestamp || Date.now(),
      }]);
    });

    socket.on("chat-history", (msgs) => {
      if (msgs?.length) setMessages(msgs.map(m => ({ ...m, isOwnMessage: m.username === usernameToUse })));
    });

    socket.on("room-users", setUsers);

    socket.on("username-taken", () => {
      setUsernameError("Username already taken in this room.");
      setShowUsernameModal(true);
      setIsConnected(false);
      setIsJoining(false);
      socket.disconnect();
      socketRef.current = null;
    });

    socket.on("cursor-change", ({ username: sender, position, fileId: cursorFileId }) => {
      if (sender === usernameToUse) return;
      const editor = editorsRef.current[cursorFileId];
      if (!editor) return;
      const old = remoteCursorsRef.current[sender] || [];
      const newDec = editor.deltaDecorations(old, [{
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        options: { className: "remote-cursor", after: { content: sender, inlineClassName: "remote-cursor-label" } },
      }]);
      remoteCursorsRef.current[sender] = newDec;
    });

    socket.on("user-joined", ({ username: who }) => showToast(`${who} joined`));
    socket.on("user-left", ({ username: who }) => showToast(`${who} left`));
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

  function leaveRoom() {
    if (socketRef.current && isConnected && activeFile) {
      socketRef.current.emit("manual-save", { roomId, code: activeFile.content, username, label: "Auto-save on leave", fileName: activeFile.name });
    }
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    navigate("/");
  }

  useEffect(() => {
    if (username && !socketRef.current && !showUsernameModal) initializeSocket(username);
    return () => { if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; } };
  }, [username, showUsernameModal]);

  if (waitingForApproval) {
    return (
      <>
        <style>{globalStyles}</style>
        <div className="ide-modal-overlay">
          <div className="ide-modal">
            <div className="ide-modal-icon" style={{ animation: "pulse 1.5s ease-in-out infinite" }}>⏳</div>
            <div className="ide-modal-title">Waiting for approval</div>
            <div className="ide-modal-sub">
              The room owner has been notified.<br />
              Please wait while they approve your request to join.
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "'DM Mono', monospace", marginTop: 8 }}>
              Room: {roomId}
            </div>
            <button
              className="ide-modal-btn"
              style={{ marginTop: 24, background: "transparent", border: "1px solid rgba(239,68,68,.3)", color: "rgba(239,68,68,.6)", boxShadow: "none" }}
              onClick={() => {
                setWaitingForApproval(false);
                setShowUsernameModal(true);
                if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </>
    );
  }

  if (showUsernameModal) {
    return (
      <>
        <style>{globalStyles}</style>
        <div className="ide-modal-overlay">
          <div className="ide-modal">
            <div className="ide-modal-icon">⌘</div>
            <div className="ide-modal-title">Join Session</div>
            <div className="ide-modal-sub">Enter a username to enter room {roomId}</div>
            <label className="ide-modal-label">Username</label>
            <input
              className="ide-modal-input"
              type="text"
              value={tempUsername}
              onChange={e => { setTempUsername(e.target.value); setUsernameError(""); }}
              onKeyDown={e => e.key === "Enter" && handleJoinRoom()}
              placeholder="your_name"
              autoFocus
            />
            {usernameError && <div className="ide-modal-error">⚠ {usernameError}</div>}
            <button className="ide-modal-btn" onClick={handleJoinRoom} disabled={isJoining}>
              {isJoining ? "Joining…" : "Enter Room →"}
            </button>
            <div className="ide-modal-room-id">Room ID: {roomId}</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{globalStyles}</style>
      <div className="ide-root" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>

        {dragActive && (
          <div className="drag-overlay">
            <div className="drag-overlay-content">
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📁</div>
              <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>Drop files here</div>
              <div style={{ fontSize: "13px", color: "var(--text3)" }}>Supports JavaScript, Python, HTML, CSS, and more</div>
            </div>
          </div>
        )}

        {uploadingFiles && (
          <div className="ide-file-upload-progress">
            <div>Uploading files... ({uploadProgress.current}/{uploadProgress.total})</div>
            <div className="progress-bar" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} />
          </div>
        )}

        <Toolbar
          roomTitle={roomTitle} setRoomTitle={setRoomTitle} handleTitleBlur={handleTitleBlur}
          saveStatus={saveStatus} saveStatusLabel={saveStatusLabel}
          isExecuting={isExecuting} executeCode={executeCode} activeFile={activeFile}
          uploadingFiles={uploadingFiles} fileInputRef={fileInputRef}
          handleFileUpload={handleFileUpload} handleFolderUpload={handleFolderUpload}
          showConsole={showConsole} setShowConsole={setShowConsole}
          downloadAllAsZip={downloadAllAsZip} files={files}
          isConnected={isConnected} roomId={roomId} showToast={showToast}
          isOwner={isOwner} isPrivate={isPrivate} togglePrivacy={togglePrivacy}
          panelOpen={panelOpen} setPanelOpen={setPanelOpen}
          leaveRoom={leaveRoom}
        />

        <div className="ide-main">
          <Sidebar
            activityTab={activityTab} setActivityTab={setActivityTab}
            sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
            files={files} activeFileId={activeFileId} openFile={openFile}
            renamingFileId={renamingFileId} setRenamingFileId={setRenamingFileId}
            renameValue={renameValue} setRenameValue={setRenameValue} renameFile={renameFile}
            creatingFile={creatingFile} setCreatingFile={setCreatingFile}
            newFileName={newFileName} setNewFileName={setNewFileName} createNewFile={createNewFile}
            creatingFolder={creatingFolder} setCreatingFolder={setCreatingFolder}
            newFolderName={newFolderName} setNewFolderName={setNewFolderName} createNewFolder={createNewFolder}
            creatingFileInFolder={creatingFileInFolder} setCreatingFileInFolder={setCreatingFileInFolder}
            newFileInFolderName={newFileInFolderName} setNewFileInFolderName={setNewFileInFolderName}
            createNewFileInFolder={createNewFileInFolder}
            collapsedFolders={collapsedFolders} toggleFolder={toggleFolder}
            deleteFile={deleteFile} deleteFolder={deleteFolder}
            handleFileRightClick={handleFileRightClick}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery} searchResults={searchResults}
            users={users} username={username} roomOwner={roomOwner}
            isOwner={isOwner} kickUser={kickUser} transferOwner={transferOwner}
            joinRequests={joinRequests} approveJoin={approveJoin} denyJoin={denyJoin}
            roomId={roomId}
          />

          <EditorPane
            openTabs={openTabs} files={files} activeFileId={activeFileId}
            openFile={openFile} closeTab={closeTab}
            activeFile={activeFile} roomId={roomId}
            handleEditorMount={handleEditorMount} handleEditorChange={handleEditorChange}
            showConsole={showConsole} consoletab={consoletab} setConsoletab={setConsoletab}
            output={output} setOutput={setOutput} htmlPreview={htmlPreview}
            isExecuting={isExecuting}
            consoleHeight={consoleHeight} startResizingConsole={startResizingConsole}
            copyOutLabel={copyOutLabel} setCopyOutLabel={setCopyOutLabel}
            setCreatingFile={setCreatingFile}
          />

          <RightPanel
            panelOpen={panelOpen} panelTab={panelTab} setPanelTab={setPanelTab}
            messages={messages} chatInput={chatInput} setChatInput={setChatInput}
            sendMessage={sendMessage} chatEndRef={chatEndRef}
            username={username}
            versions={versions} versionsLoading={versionsLoading}
            restoringVersion={restoringVersion} restoreVersion={restoreVersion}
            saveLabelInput={saveLabelInput} setSaveLabelInput={setSaveLabelInput}
            triggerManualSave={triggerManualSave}
          />
        </div>

        <StatusBar
          isConnected={isConnected} users={users} files={files}
          activeFile={activeFile} uploadingFiles={uploadingFiles} username={username}
        />

        {ctxMenu && (() => {
          const ctxItem = files.find(f => f.id === ctxMenu.fileId);
          const isFolder = ctxItem?.type === "folder";
          return (
            <div className="ide-ctx-menu" ref={ctxMenuRef} style={{ top: ctxMenu.y, left: ctxMenu.x }}>
              <div className="ide-ctx-item" onClick={() => {
                if (ctxItem) { setRenameValue(ctxItem.name); setRenamingFileId(ctxItem.id); }
                setCtxMenu(null);
              }}><span>✎</span> Rename</div>
              {isFolder ? (
                <>
                  <div className="ide-ctx-item" onClick={() => {
                    setCreatingFileInFolder(ctxMenu.fileId); setNewFileInFolderName(""); setCtxMenu(null);
                  }}><span>+</span> New file inside</div>
                  <div className="ide-ctx-sep" />
                  <div className="ide-ctx-item danger" onClick={() => { deleteFolder(ctxMenu.fileId); setCtxMenu(null); }}>
                    <span>🗑</span> Delete folder
                  </div>
                </>
              ) : (
                <>
                  <div className="ide-ctx-item" onClick={() => { openFile(ctxMenu.fileId); setCtxMenu(null); }}>
                    <span>↗</span> Open
                  </div>
                  <div className="ide-ctx-item" onClick={() => { if (ctxItem) downloadFile(ctxItem); setCtxMenu(null); }}>
                    <span>💾</span> Download
                  </div>
                  <div className="ide-ctx-sep" />
                  <div className="ide-ctx-item danger" onClick={() => { deleteFile(ctxMenu.fileId); setCtxMenu(null); }}>
                    <span>🗑</span> Delete
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {toast && <div className="ide-toast">{toast}</div>}
      </div>
    </>
  );
}

export default EditorPage;