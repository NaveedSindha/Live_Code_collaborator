import React from "react";

export function Toolbar({
  roomTitle, setRoomTitle, handleTitleBlur,
  saveStatus, saveStatusLabel,
  isExecuting, executeCode, activeFile,
  uploadingFiles, fileInputRef, handleFileUpload, handleFolderUpload,
  showConsole, setShowConsole,
  downloadAllAsZip, files,
  isConnected, roomId, showToast,
  isOwner, isPrivate, togglePrivacy,
  panelOpen, setPanelOpen,
  leaveRoom,
}) {
  return (
    <div className="ide-toolbar">
      <div className="ide-logo">⌘</div>

      <input
        className="ide-title-input"
        value={roomTitle}
        onChange={e => setRoomTitle(e.target.value)}
        onBlur={handleTitleBlur}
        onKeyDown={e => e.key === "Enter" && e.target.blur()}
        title="Click to rename"
      />

      <div className={`ide-save-status ${saveStatus}`}>
        <span className="ide-save-dot" />
        {saveStatusLabel()}
      </div>

      <div className="ide-divider" />

      <button
        className={`ide-btn-run ${isExecuting ? "running" : ""}`}
        onClick={executeCode}
        disabled={isExecuting || !activeFile}
      >
        <span className="run-dot" />
        {isExecuting ? "Running…" : "Run"}
      </button>

      <div className="ide-upload-group">
        <button
          className="ide-toolbar-pill"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingFiles}
          title="Upload files"
        >📁 Upload</button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={handleFileUpload}
          accept=".js,.jsx,.ts,.tsx,.py,.c,.cpp,.java,.go,.rs,.rb,.php,.kt,.sh,.html,.css,.json,.md,.yaml,.yml,.xml,.sql,.txt"
        />
        <button
          className="ide-toolbar-pill"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.webkitdirectory = true;
            input.multiple = true;
            input.onchange = handleFolderUpload;
            input.click();
          }}
          title="Upload folder"
        >📂 Folder</button>
      </div>

      <button
        className="ide-toolbar-pill"
        onClick={downloadAllAsZip}
        title="Download all files as ZIP"
        disabled={files.filter(f => f.type !== "folder").length === 0}
      >📦 Export ZIP</button>

      <button
        className={`ide-toolbar-pill ${showConsole ? "active" : ""}`}
        onClick={() => setShowConsole(v => !v)}
      >Terminal</button>

      <div className="ide-spacer" />

      <div
        className="ide-room-badge"
        style={{ cursor: "pointer" }}
        onClick={() => {
          navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
          showToast("🔗 Invite link copied!");
        }}
        title="Click to copy invite link"
      >
        <span className={`ide-conn-dot ${isConnected ? "" : "offline"}`} />
        <span className="ide-room-id">{roomId}</span>
        <span style={{ fontSize: 10, color: "var(--text3)", marginLeft: 2 }}>⎘</span>
      </div>

      {isOwner && (
        <button
          className={`ide-toolbar-pill ${isPrivate ? "active" : ""}`}
          onClick={togglePrivacy}
          title={isPrivate ? "Room is private — click to make public" : "Room is public — click to make private"}
        >{isPrivate ? "🔒 Private" : "🌐 Public"}</button>
      )}
      {!isOwner && isPrivate && (
        <span className="ide-toolbar-pill" style={{ cursor: "default" }}>🔒 Private</span>
      )}

      <button
        className={`ide-toolbar-pill ${panelOpen ? "active" : ""}`}
        onClick={() => setPanelOpen(v => !v)}
      >Panel</button>

      <button className="ide-btn-leave" onClick={leaveRoom}>Leave</button>
    </div>
  );
}