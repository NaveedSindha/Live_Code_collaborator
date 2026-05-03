import React from "react";
import Editor from "@monaco-editor/react";
import { getLangFromFile, getLangColor, getIconLabel } from "../hooks/useFiles";

export function EditorPane({
  openTabs, files, activeFileId, openFile, closeTab,
  activeFile, roomId,
  handleEditorMount, handleEditorChange,
  showConsole, consoletab, setConsoletab,
  output, setOutput, htmlPreview,
  isExecuting,
  consoleHeight, startResizingConsole,
  copyOutLabel, setCopyOutLabel,
  setCreatingFile,
}) {
  const classifyLine = (line) => {
    if (line.includes("Error") || line.includes("error") || line.startsWith("Failed")) return "out-error";
    if (line.includes("Return value:")) return "out-success";
    if (line.startsWith("Running") || line.includes("⚠")) return "out-info";
    return "out-default";
  };

  const openTabFiles = openTabs.map(id => files.find(f => f.id === id)).filter(Boolean);

  return (
    <div className="ide-editor-area">
      <div className="ide-tabs">
        {openTabFiles.map(file => {
          const lang = getLangFromFile(file.name);
          const color = getLangColor(lang);
          const icon = getIconLabel(file.name);
          const isActive = file.id === activeFileId;
          return (
            <div
              key={file.id}
              className={`ide-tab ${isActive ? "active" : ""} ${file.unsaved ? "unsaved" : ""}`}
              onClick={() => openFile(file.id)}
            >
              <div className="ide-tab-icon" style={{ background: color + "22", color }}>{icon}</div>
              <span className="ide-tab-name">{file.name}</span>
              <span className="ide-tab-close" onClick={e => closeTab(file.id, e)} title="Close">
                {file.unsaved ? "●" : "✕"}
              </span>
            </div>
          );
        })}
        <div className="ide-tabs-add" onClick={() => setCreatingFile(true)} title="New file">+</div>
      </div>

      {activeFile && (
        <div className="ide-breadcrumb">
          <span className="ide-breadcrumb-part">{roomId.toLowerCase()}</span>
          <span className="ide-breadcrumb-sep">›</span>
          <span className="ide-breadcrumb-part active">{activeFile.name}</span>
          <div style={{ flex: 1 }} />
          <span style={{ color: "var(--text3)", fontSize: 10 }}>{getLangFromFile(activeFile.name)}</span>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: getLangColor(getLangFromFile(activeFile.name)), display: "inline-block", marginLeft: 6 }} />
        </div>
      )}

      {activeFile ? (
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {openTabFiles.map(file => (
            file.id === activeFileId ? (
              <div key={file.id} style={{ position: "absolute", inset: 0 }}>
                <Editor
                  height="100%"
                  language={getLangFromFile(file.name)}
                  value={file.content}
                  theme="vs-dark"
                  onMount={editor => handleEditorMount(editor, file.id)}
                  onChange={value => handleEditorChange(value, file.id)}
                  options={{
                    automaticLayout: true, tabSize: 2, fontSize: 13.5,
                    fontFamily: "'DM Mono', 'Cascadia Code', 'Fira Code', monospace",
                    minimap: { enabled: true, renderCharacters: false, scale: 1 },
                    scrollBeyondLastLine: false, lineNumbers: "on",
                    renderLineHighlight: "gutter", padding: { top: 14, bottom: 14 },
                    cursorBlinking: "smooth", smoothScrolling: true, fontLigatures: true,
                    bracketPairColorization: { enabled: true }, guides: { indentation: true },
                    renderWhitespace: "selection", suggest: { showIcons: true },
                  }}
                />
              </div>
            ) : null
          ))}
        </div>
      ) : (
        <div className="ide-welcome">
          <div className="ide-welcome-logo">⌘</div>
          <div className="ide-welcome-title">No file open</div>
          <div className="ide-welcome-sub">Create a new file, upload files, or select one from the explorer to start coding.</div>
          <div className="ide-welcome-shortcuts">
            <div className="ide-shortcut-row"><span className="ide-kbd">+</span><span>New file</span></div>
            <div className="ide-shortcut-row"><span className="ide-kbd">📁 Upload</span><span>Upload files/folders</span></div>
            <div className="ide-shortcut-row"><span className="ide-kbd">Drag & Drop</span><span>Drop files anywhere</span></div>
          </div>
        </div>
      )}

      {showConsole && (
        <div className="ide-resize-handle" onMouseDown={startResizingConsole} />
      )}

      {showConsole && (
        <div className="ide-console" style={{ height: consoleHeight }}>
          <div className="ide-console-header">
            <div className="ide-console-tabs">
              <button className={`ide-console-tab ${consoletab === "output" ? "active" : ""}`} onClick={() => setConsoletab("output")}>Output</button>
              <button className={`ide-console-tab ${consoletab === "preview" ? "active" : ""}`} onClick={() => setConsoletab("preview")}>Preview</button>
            </div>
            {consoletab === "output" && (
              <>
                <button className="ide-console-action" onClick={() => {
                  if (output) { navigator.clipboard.writeText(output); setCopyOutLabel("Copied!"); setTimeout(() => setCopyOutLabel("Copy"), 2000); }
                }} disabled={!output}>{copyOutLabel}</button>
                <button className="ide-console-action" onClick={() => setOutput("")} style={{ marginLeft: 4 }}>Clear</button>
              </>
            )}
          </div>
          <div className="ide-console-body" style={{ padding: consoletab === "preview" ? 0 : undefined }}>
            {consoletab === "preview" ? (
              <iframe srcDoc={htmlPreview} style={{ width: "100%", height: "100%", border: "none", background: "#fff", display: "block" }} sandbox="allow-scripts" title="Preview" />
            ) : output ? (
              output.split("\n").map((line, i) => (
                <div key={i} className={`out-line ${classifyLine(line)}`}>{line || " "}</div>
              ))
            ) : (
              <div className="out-empty">▷ Run your code to see output here</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}