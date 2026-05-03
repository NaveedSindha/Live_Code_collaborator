import React from "react";

export function RightPanel({
  panelOpen, panelTab, setPanelTab,
  messages, chatInput, setChatInput, sendMessage, chatEndRef,
  username,
  versions, versionsLoading, restoringVersion, restoreVersion,
  saveLabelInput, setSaveLabelInput, triggerManualSave,
}) {
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

  return (
    <div className={`ide-panel ${panelOpen ? "" : "collapsed"}`}>
      <div className="ide-panel-tabs">
        <button className={`ide-panel-tab ${panelTab === "chat" ? "active" : ""}`} onClick={() => setPanelTab("chat")}>Chat</button>
        <button className={`ide-panel-tab ${panelTab === "versions" ? "active" : ""}`} onClick={() => setPanelTab("versions")}>History</button>
      </div>

      {panelTab === "chat" && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div className="ide-chat-messages">
            {messages.length === 0 && (
              <div className="ide-chat-empty">No messages yet.<br />Start the conversation.</div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`ide-msg-row ${msg.isOwnMessage ? "own" : "other"}`}>
                {!msg.isOwnMessage && <span className="ide-msg-sender">{msg.username}</span>}
                <div className={`ide-msg-bubble ${msg.isOwnMessage ? "own" : "other"}`}>{msg.message}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="ide-chat-input-area">
            <input
              className="ide-chat-input"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={`Message as ${username}…`}
            />
            <button className="ide-btn-send" onClick={sendMessage}>↑</button>
          </div>
        </div>
      )}

      {panelTab === "versions" && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div className="ide-versions-list">
            {versionsLoading && <div className="ide-versions-empty">Loading…</div>}
            {!versionsLoading && versions.length === 0 && (
              <div className="ide-versions-empty">No saved versions yet.<br /><br />Code autosaves every 5s of inactivity. Save manually below.</div>
            )}
            {versions.map(v => (
              <div key={v.version} className="ide-version-item" onClick={() => restoreVersion(v)} title="Click to restore">
                <div className="ide-version-header">
                  <span className="ide-version-num">v{v.version}</span>
                  <span className="ide-version-time">{formatRelativeTime(v.saved_at)}</span>
                </div>
                <div className="ide-version-label">
                  {v.label || "Autosave"}
                  {restoringVersion === v.version && " ↩ Restoring…"}
                </div>
                <div className="ide-version-meta">by {v.username} · {(v.code_length / 1000).toFixed(1)}KB</div>
                {v.code_preview && <div className="ide-version-preview">{v.code_preview}</div>}
              </div>
            ))}
          </div>
          <div className="ide-save-label-row">
            <input
              className="ide-save-label-input"
              value={saveLabelInput}
              onChange={e => setSaveLabelInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && triggerManualSave()}
              placeholder="Add a label…"
            />
            <button className="ide-btn-save-manual" onClick={triggerManualSave}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}