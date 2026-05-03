import React from "react";
import { getLangFromFile, getLangColor, getIconLabel } from "../hooks/useFiles";

export function Sidebar({
  activityTab, setActivityTab,
  sidebarOpen, setSidebarOpen,
  files, activeFileId, openFile,
  renamingFileId, setRenamingFileId,
  renameValue, setRenameValue, renameFile,
  creatingFile, setCreatingFile,
  newFileName, setNewFileName, createNewFile,
  creatingFolder, setCreatingFolder,
  newFolderName, setNewFolderName, createNewFolder,
  creatingFileInFolder, setCreatingFileInFolder,
  newFileInFolderName, setNewFileInFolderName, createNewFileInFolder,
  collapsedFolders, toggleFolder,
  deleteFile, deleteFolder,
  handleFileRightClick,
  searchQuery, setSearchQuery, searchResults,
  users, username, roomOwner,
  isOwner, kickUser, transferOwner,
  joinRequests = [], approveJoin, denyJoin,
  roomId,
}) {
  const getInitials = (name) => name ? name.slice(0, 2).toUpperCase() : "?";

  return (
    <>
      {/* Activity Bar */}
      <div className="ide-activity">
        <button
          className={`ide-act-btn ${activityTab === "files" ? "active" : ""}`}
          onClick={() => { setActivityTab("files"); setSidebarOpen(v => activityTab === "files" ? !v : true); }}
          title="Explorer"
        >📁</button>
        <button
          className={`ide-act-btn ${activityTab === "search" ? "active" : ""}`}
          onClick={() => { setActivityTab("search"); setSidebarOpen(v => activityTab === "search" ? !v : true); }}
          title="Search"
        >🔍</button>
        <div className="ide-act-separator" />
        <button
          className={`ide-act-btn ${activityTab === "users" ? "active" : ""}`}
          onClick={() => { setActivityTab("users"); setSidebarOpen(v => activityTab === "users" ? !v : true); }}
          title="Collaborators"
          style={{ position: "relative" }}
        >
          👥
          {joinRequests.length > 0 && (
            <span style={{
              position: "absolute", top: 4, right: 4,
              width: 8, height: 8, borderRadius: "50%",
              background: "var(--red)", boxShadow: "0 0 6px rgba(239,68,68,.7)"
            }} />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`ide-sidebar ${sidebarOpen ? "" : "collapsed"}`}>

        {activityTab === "files" && (
          <>
            <div className="ide-sidebar-header">
              <span className="ide-sidebar-title">Explorer</span>
              <div style={{ display: "flex", gap: 3 }}>
                <button className="ide-sidebar-action" title="New File" onClick={() => setCreatingFile(true)}>+</button>
                <button className="ide-sidebar-action" title="New Folder" onClick={() => setCreatingFolder(true)}>📁</button>
                <button className="ide-sidebar-action" title="Collapse" onClick={() => setSidebarOpen(false)} style={{ fontSize: 11 }}>✕</button>
              </div>
            </div>

            <div className="ide-file-tree">
              <div className="ide-folder">
                <div className="ide-folder-row">
                  <span className="ide-folder-arrow open">▶</span>
                  <span className="ide-folder-icon">📂</span>
                  <span style={{ fontSize: 12, color: "var(--text1)", fontFamily: "'DM Mono', monospace" }}>
                    {roomId.toLowerCase()}
                  </span>
                </div>

                {(function renderTree(parentId, depth) {
                  const children = files.filter(f => f.parentId === parentId);
                  const folders = children.filter(f => f.type === "folder").sort((a, b) => a.name.localeCompare(b.name));
                  const fileNodes = children.filter(f => f.type !== "folder").sort((a, b) => a.name.localeCompare(b.name));
                  const indent = depth * 12;

                  return [...folders, ...fileNodes].map(item => {
                    if (item.type === "folder") {
                      const isOpen = !collapsedFolders[item.id];
                      return (
                        <div key={item.id}>
                          {renamingFileId === item.id ? (
                            <div className="ide-new-file-row" style={{ paddingLeft: 28 + indent }}>
                              <input
                                className="ide-rename-input"
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") { renameFile(item.id, renameValue); setRenamingFileId(null); }
                                  if (e.key === "Escape") setRenamingFileId(null);
                                }}
                                onBlur={() => { if (renameValue.trim()) renameFile(item.id, renameValue); setRenamingFileId(null); }}
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div
                              className="ide-folder-row"
                              style={{ paddingLeft: 8 + indent }}
                              onClick={() => toggleFolder(item.id)}
                              onContextMenu={e => handleFileRightClick(e, item.id)}
                            >
                              <span className={`ide-folder-arrow ${isOpen ? "open" : ""}`}>▶</span>
                              <span className="ide-folder-icon">{isOpen ? "📂" : "📁"}</span>
                              <span style={{ flex: 1, fontSize: 12.5, color: "var(--text1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.name}
                              </span>
                              <div className="ide-file-actions">
                                <button className="ide-file-action-btn" title="New file in folder"
                                  onClick={e => { e.stopPropagation(); setCreatingFileInFolder(item.id); setNewFileInFolderName(""); }}>+</button>
                                <button className="ide-file-action-btn" title="Rename"
                                  onClick={e => { e.stopPropagation(); setRenameValue(item.name); setRenamingFileId(item.id); }}>✎</button>
                                <button className="ide-file-action-btn" title="Delete folder" style={{ color: "var(--red)" }}
                                  onClick={e => { e.stopPropagation(); deleteFolder(item.id); }}>✕</button>
                              </div>
                            </div>
                          )}

                          {creatingFileInFolder === item.id && (
                            <div className="ide-new-file-row" style={{ paddingLeft: 28 + indent + 12 }}>
                              <span style={{ fontSize: 11, marginRight: 4 }}>📄</span>
                              <input
                                className="ide-new-file-input"
                                value={newFileInFolderName}
                                onChange={e => setNewFileInFolderName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") { createNewFileInFolder(newFileInFolderName, item.id); setCreatingFileInFolder(null); setNewFileInFolderName(""); }
                                  if (e.key === "Escape") { setCreatingFileInFolder(null); setNewFileInFolderName(""); }
                                }}
                                onBlur={() => { if (newFileInFolderName.trim()) createNewFileInFolder(newFileInFolderName, item.id); setCreatingFileInFolder(null); setNewFileInFolderName(""); }}
                                placeholder="filename.js"
                                autoFocus
                              />
                            </div>
                          )}

                          {isOpen && renderTree(item.id, depth + 1)}
                        </div>
                      );
                    }

                    const lang = getLangFromFile(item.name);
                    const color = getLangColor(lang);
                    const icon = getIconLabel(item.name);
                    const isActive = item.id === activeFileId;
                    return (
                      <div key={item.id}>
                        {renamingFileId === item.id ? (
                          <div className="ide-new-file-row" style={{ paddingLeft: 28 + indent }}>
                            <input
                              className="ide-rename-input"
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") { renameFile(item.id, renameValue); setRenamingFileId(null); }
                                if (e.key === "Escape") setRenamingFileId(null);
                              }}
                              onBlur={() => { if (renameValue.trim()) renameFile(item.id, renameValue); setRenamingFileId(null); }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div
                            className={`ide-file-row ${isActive ? "active" : ""} ${item.unsaved ? "unsaved" : ""}`}
                            style={{ paddingLeft: 28 + indent }}
                            onClick={() => openFile(item.id)}
                            onContextMenu={e => handleFileRightClick(e, item.id)}
                          >
                            <div className="ide-file-badge" style={{ background: color + "22", color }}>{icon}</div>
                            <span className="ide-file-name">{item.name}</span>
                            <div className="ide-file-actions">
                              <button className="ide-file-action-btn" title="Rename"
                                onClick={e => { e.stopPropagation(); setRenameValue(item.name); setRenamingFileId(item.id); }}>✎</button>
                              {files.filter(f => f.type === "file").length > 1 && (
                                <button className="ide-file-action-btn" title="Delete" style={{ color: "var(--red)" }}
                                  onClick={e => { e.stopPropagation(); deleteFile(item.id); }}>✕</button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })(null, 0)}

                {creatingFile && (
                  <div className="ide-new-file-row">
                    <span style={{ fontSize: 11, marginRight: 4 }}>📄</span>
                    <input
                      className="ide-new-file-input"
                      value={newFileName}
                      onChange={e => setNewFileName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") { createNewFile(newFileName); setNewFileName(""); setCreatingFile(false); }
                        if (e.key === "Escape") { setNewFileName(""); setCreatingFile(false); }
                      }}
                      onBlur={() => { if (newFileName.trim()) createNewFile(newFileName); setNewFileName(""); setCreatingFile(false); }}
                      placeholder="filename.js"
                      autoFocus
                    />
                  </div>
                )}

                {creatingFolder && (
                  <div className="ide-new-file-row">
                    <span style={{ fontSize: 11, marginRight: 4 }}>📁</span>
                    <input
                      className="ide-new-file-input"
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") { createNewFolder(newFolderName); setNewFolderName(""); setCreatingFolder(false); }
                        if (e.key === "Escape") { setNewFolderName(""); setCreatingFolder(false); }
                      }}
                      onBlur={() => { if (newFolderName.trim()) createNewFolder(newFolderName); setNewFolderName(""); setCreatingFolder(false); }}
                      placeholder="folder-name"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activityTab === "search" && (
          <>
            <div className="ide-sidebar-header">
              <span className="ide-sidebar-title">Search</span>
            </div>
            <div className="ide-search-panel">
              <input
                className="ide-search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search in files…"
                autoFocus
              />
              {searchResults.length === 0 && searchQuery && (
                <div className="ide-versions-empty">No results found</div>
              )}
              {searchResults.map((r, i) => (
                <div key={i} className="ide-search-result" onClick={() => openFile(r.fileId)}>
                  <div className="ide-search-file">{r.fileName} :{r.lineNum}</div>
                  <div
                    className="ide-search-match"
                    dangerouslySetInnerHTML={{
                      __html: r.line.replace(
                        new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
                        m => `<mark>${m}</mark>`
                      )
                    }}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {activityTab === "users" && (
          <>
            <div className="ide-sidebar-header">
              <span className="ide-sidebar-title">Collaborators ({users.length})</span>
            </div>
            {isOwner && joinRequests.length > 0 && (
              <div style={{ padding: "8px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 6 }}>
                  Join Requests
                </div>
                {joinRequests.map(req => (
                  <div key={req.username} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, padding: "6px 8px", background: "rgba(99,102,241,.06)", borderRadius: 7, border: "1px solid rgba(99,102,241,.15)" }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg,#0ea5e9,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                      {req.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ flex: 1, fontSize: 12, color: "var(--text1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{req.username}</span>
                    <button onClick={() => approveJoin(req.username)}
                      style={{ padding: "2px 8px", background: "rgba(34,197,94,.12)", border: "1px solid rgba(34,197,94,.3)", borderRadius: 5, color: "rgba(34,197,94,.9)", fontSize: 10, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                      ✓
                    </button>
                    <button onClick={() => denyJoin(req.username)}
                      style={{ padding: "2px 8px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 5, color: "rgba(239,68,68,.7)", fontSize: 10, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="ide-sidebar-users" style={{ flex: 1, overflowY: "auto" }}>
              {users.map((user, idx) => {
                const isThisUserOwner = user.username === roomOwner;
                const isYou = user.username === username;
                return (
                  <div key={user.id || idx} className={`ide-user-chip ${isYou ? "self" : ""}`}
                    style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className={`ide-avatar ${!isYou ? "ide-avatar-other" : ""}`}
                        style={isThisUserOwner ? { boxShadow: "0 0 0 2px #f59e0b" } : {}}>
                        {getInitials(user.username)}
                      </div>
                      <span className="ide-uname">{user.username}</span>
                      {isThisUserOwner && (
                        <span style={{ marginLeft: "auto", fontSize: 9, padding: "1px 6px", background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.3)", borderRadius: 3, color: "#f59e0b", fontFamily: "'DM Mono', monospace" }}>
                          👑 owner
                        </span>
                      )}
                      {!isThisUserOwner && isYou && <span className="ide-you-badge">you</span>}
                    </div>
                    {isOwner && !isYou && (
                      <div style={{ display: "flex", gap: 4, paddingLeft: 32 }}>
                        <button onClick={() => kickUser(user.username)}
                          style={{ flex: 1, padding: "3px 0", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 5, color: "rgba(239,68,68,.7)", fontSize: 10, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                          Kick
                        </button>
                        <button onClick={() => transferOwner(user.username)}
                          style={{ flex: 1, padding: "3px 0", background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", borderRadius: 5, color: "rgba(245,158,11,.7)", fontSize: 10, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                          Make Owner
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}