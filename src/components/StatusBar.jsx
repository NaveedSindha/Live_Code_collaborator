import React from "react";
import { getLangFromFile, getLangColor } from "../hooks/useFiles";

export function StatusBar({ isConnected, users, files, activeFile, uploadingFiles, username }) {
  return (
    <div className="ide-status">
      <div className="ide-status-item">
        <span className="dot" style={{ background: isConnected ? "var(--green)" : "var(--red)" }} />
        {isConnected ? "Connected" : "Disconnected"}
      </div>
      <span className="ide-status-sep">·</span>
      <div className="ide-status-item">{users.length} user{users.length !== 1 ? "s" : ""}</div>
      <span className="ide-status-sep">·</span>
      <div className="ide-status-item">{files.length} file{files.length !== 1 ? "s" : ""}</div>
      {activeFile && (
        <>
          <span className="ide-status-sep">·</span>
          <div className="ide-status-item">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: getLangColor(getLangFromFile(activeFile.name)), display: "inline-block" }} />
            {getLangFromFile(activeFile.name)}
          </div>
          <span className="ide-status-sep">·</span>
          <div className="ide-status-item">{activeFile.name}</div>
        </>
      )}
      {uploadingFiles && (
        <>
          <span className="ide-status-sep">·</span>
          <div className="ide-status-item" style={{ color: "var(--yellow)" }}>
            <span className="dot" style={{ background: "var(--yellow)", animation: "pulse 1s infinite" }} />
            Uploading...
          </div>
        </>
      )}
      <div className="ide-status-spacer" />
      <div className="ide-status-item">{username}</div>
    </div>
  );
}