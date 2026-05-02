import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { io } from "socket.io-client";
import * as monaco from "monaco-editor";

// ─────────────────────────────────────────────
// Language → Monaco mapping
// ─────────────────────────────────────────────
const EXT_TO_LANG = {
  js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  py: "python", c: "c", cpp: "cpp", cc: "cpp", h: "c", hpp: "cpp",
  java: "java", go: "go", rs: "rust", rb: "ruby", php: "php",
  kt: "kotlin", sh: "bash", bash: "bash", html: "html", css: "css",
  json: "json", md: "markdown", yaml: "yaml", yml: "yaml",
  xml: "xml", sql: "sql", txt: "plaintext",
};

const LANG_ICONS = {
  javascript: "#f7df1e", typescript: "#3178c6", python: "#3572A5", c: "#555555",
  cpp: "#f34b7d", java: "#b07219", go: "#00ADD8", rust: "#dea584",
  ruby: "#701516", php: "#4F5D95", kotlin: "#A97BFF", bash: "#89e051",
  html: "#e34c26", css: "#563d7c", json: "#292929", markdown: "#083fa1",
  yaml: "#cb171e", xml: "#0060ac", sql: "#e38c00", plaintext: "#aaaaaa",
};

const FILE_ICONS = {
  js: "JS", jsx: "JSX", ts: "TS", tsx: "TSX", py: "PY", c: "C",
  cpp: "C+", java: "☕", go: "GO", rs: "RS", rb: "RB", php: "PHP",
  kt: "KT", sh: "SH", html: "HT", css: "CS", json: "{}",
  md: "MD", yaml: "YL", yml: "YL", xml: "XML", sql: "SQL", txt: "TX",
};

function getExtension(filename) {
  return filename.split(".").pop().toLowerCase();
}

function getLangFromFile(filename) {
  return EXT_TO_LANG[getExtension(filename)] || "plaintext";
}

function getIconLabel(filename) {
  return FILE_ICONS[getExtension(filename)] || "  ";
}

function getLangColor(lang) {
  return LANG_ICONS[lang] || "#888";
}

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

// ─────────────────────────────────────────────
// Global Styles
// ─────────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');

  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#080b10}

  :root {
    --bg0:#060810;
    --bg1:#0c0f18;
    --bg2:#111520;
    --bg3:#181c2a;
    --bg4:#1e2334;
    --border:rgba(255,255,255,0.07);
    --border-active:rgba(99,102,241,0.45);
    --accent:#6366f1;
    --accent2:#818cf8;
    --text0:#f0f2ff;
    --text1:rgba(240,242,255,0.75);
    --text2:rgba(240,242,255,0.4);
    --text3:rgba(240,242,255,0.22);
    --green:#22c55e;
    --red:#ef4444;
    --yellow:#f59e0b;
    --sidebar-width:240px;
    --activity-width:44px;
    --panel-width:280px;
    --tabs-height:38px;
    --toolbar-height:50px;
    --status-height:24px;
  }

  .ide-root{display:flex;height:100vh;flex-direction:column;background:var(--bg0);font-family:'DM Sans',sans-serif;color:var(--text0);overflow:hidden}

  /* ── Toolbar ── */
  .ide-toolbar{
    height:var(--toolbar-height);background:var(--bg1);
    border-bottom:1px solid var(--border);
    display:flex;align-items:center;padding:0 12px;gap:10px;flex-shrink:0;z-index:10;
  }
  .ide-logo{width:28px;height:28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;box-shadow:0 4px 12px rgba(99,102,241,.3)}
  .ide-title-input{background:transparent;border:none;border-bottom:1px solid transparent;color:var(--text1);font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;outline:none;padding:2px 4px;min-width:60px;max-width:180px;transition:border-color .15s}
  .ide-title-input:hover{border-bottom-color:var(--border)}
  .ide-title-input:focus{border-bottom-color:var(--border-active);color:var(--text0)}
  .ide-divider{width:1px;height:18px;background:var(--border);flex-shrink:0}
  .ide-save-status{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text3);white-space:nowrap;transition:color .3s}
  .ide-save-status.saving{color:rgba(245,158,11,.7)}
  .ide-save-status.saved{color:rgba(34,197,94,.7)}
  .ide-save-dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0}
  .ide-save-status.saving .ide-save-dot{animation:pulse .8s ease-in-out infinite}
  .ide-spacer{flex:1}
  .ide-btn-run{display:flex;align-items:center;gap:6px;padding:6px 14px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;box-shadow:0 3px 10px rgba(34,197,94,.25)}
  .ide-btn-run:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(34,197,94,.35)}
  .ide-btn-run:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
  .ide-btn-run.running .run-dot{animation:pulse .8s ease-in-out infinite}
  .run-dot{width:6px;height:6px;border-radius:50%;background:#fff}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
  .ide-room-badge{display:flex;align-items:center;gap:8px;padding:4px 12px;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.18);border-radius:20px;font-size:11px}
  .ide-room-id{font-family:'DM Mono',monospace;font-size:10px;font-weight:500;color:var(--accent2);letter-spacing:.06em}
  .ide-conn-dot{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 6px rgba(34,197,94,.7)}
  .ide-conn-dot.offline{background:var(--red);box-shadow:0 0 6px rgba(239,68,68,.7)}
  .ide-toolbar-pill{padding:5px 11px;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:7px;font-size:11px;color:var(--text2);cursor:pointer;transition:all .15s;white-space:nowrap;font-family:'DM Sans',sans-serif}
  .ide-toolbar-pill:hover{border-color:rgba(255,255,255,.15);color:var(--text1)}
  .ide-toolbar-pill.active{background:rgba(99,102,241,.12);border-color:rgba(99,102,241,.3);color:var(--accent2)}
  .ide-btn-leave{padding:5px 12px;background:transparent;border:1px solid rgba(239,68,68,.25);border-radius:7px;color:rgba(239,68,68,.6);font-size:12px;cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif}
  .ide-btn-leave:hover{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.5);color:var(--red)}

  /* ── Main layout ── */
  .ide-main{display:flex;flex:1;overflow:hidden}

  /* ── Activity Bar ── */
  .ide-activity{width:var(--activity-width);background:var(--bg1);border-right:1px solid var(--border);display:flex;flex-direction:column;align-items:center;padding:6px 0;gap:2px;flex-shrink:0;z-index:5}
  .ide-act-btn{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:8px;cursor:pointer;border:none;background:transparent;color:var(--text3);font-size:16px;transition:all .15s;position:relative}
  .ide-act-btn:hover{color:var(--text1);background:rgba(255,255,255,.05)}
  .ide-act-btn.active{color:var(--text0);background:rgba(99,102,241,.15)}
  .ide-act-btn.active::before{content:'';position:absolute;left:-6px;top:50%;transform:translateY(-50%);width:3px;height:20px;background:var(--accent);border-radius:0 2px 2px 0}
  .ide-act-separator{width:28px;height:1px;background:var(--border);margin:4px 0}

  /* ── Sidebar (File Explorer / Search / etc) ── */
  .ide-sidebar{width:var(--sidebar-width);background:var(--bg1);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden}
  .ide-sidebar.collapsed{width:0;border-right:none}
  .ide-sidebar-header{height:36px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;flex-shrink:0;border-bottom:1px solid var(--border)}
  .ide-sidebar-title{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--text2)}
  .ide-sidebar-action{width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:5px;cursor:pointer;color:var(--text3);font-size:14px;border:none;background:transparent;transition:all .15s}
  .ide-sidebar-action:hover{color:var(--text1);background:rgba(255,255,255,.06)}

  /* ── File Tree ── */
  .ide-file-tree{flex:1;overflow-y:auto;padding:4px 0}
  .ide-file-tree::-webkit-scrollbar{width:4px}
  .ide-file-tree::-webkit-scrollbar-track{background:transparent}
  .ide-file-tree::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}

  .ide-folder{cursor:pointer;user-select:none}
  .ide-folder-row{display:flex;align-items:center;gap:6px;padding:3px 8px;height:24px;font-size:12.5px;color:var(--text1);cursor:pointer;transition:background .1s;border-radius:5px;margin:0 4px}
  .ide-folder-row:hover{background:rgba(255,255,255,.05)}
  .ide-folder-arrow{font-size:10px;color:var(--text3);width:10px;flex-shrink:0;transition:transform .15s}
  .ide-folder-arrow.open{transform:rotate(90deg)}
  .ide-folder-icon{font-size:13px}

  .ide-file-row{display:flex;align-items:center;gap:6px;padding:3px 8px 3px 28px;height:24px;font-size:12.5px;color:var(--text2);cursor:pointer;transition:all .1s;border-radius:5px;margin:0 4px;position:relative}
  .ide-file-row:hover{background:rgba(255,255,255,.05);color:var(--text1)}
  .ide-file-row.active{background:rgba(99,102,241,.14);color:var(--text0)}
  .ide-file-row.active::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--accent);border-radius:1px}
  .ide-file-row.unsaved::after{content:'●';position:absolute;right:8px;font-size:8px;color:var(--text3)}
  .ide-file-badge{width:16px;height:16px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:7px;font-weight:700;flex-shrink:0;letter-spacing:-.5px}
  .ide-file-name{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  ide-file-actions{display:none;gap:2px;flex-shrink:0;margin-left:auto}
  .ide-file-row:hover .ide-file-actions{display:flex}
  .ide-folder-row:hover .ide-file-actions{display:flex}
  .ide-file-action-btn{width:16px;height:16px;display:flex;align-items:center;justify-content:center;border-radius:3px;cursor:pointer;background:transparent;border:none;color:var(--text3);font-size:11px;transition:all .1s}
  .ide-file-action-btn:hover{background:rgba(255,255,255,.1);color:var(--text1)}

  /* ── New file input ── */
  .ide-new-file-row{display:flex;align-items:center;gap:6px;padding:3px 8px 3px 28px;height:26px;margin:0 4px}
  .ide-new-file-input{flex:1;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.35);border-radius:4px;color:var(--text0);font-family:'DM Mono',monospace;font-size:12px;padding:2px 6px;outline:none}

  /* ── Sidebar bottom: users / search ── */
  .ide-sidebar-users{padding:8px;border-top:1px solid var(--border);flex-shrink:0}
  .ide-user-chip{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:7px;margin-bottom:3px;transition:background .15s}
  .ide-user-chip.self{background:rgba(99,102,241,.08)}
  .ide-avatar{width:24px;height:24px;border-radius:6px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0}
  .ide-avatar-other{background:linear-gradient(135deg,#0ea5e9,#6366f1)}
  .ide-uname{font-size:12px;font-weight:500;color:var(--text1)}
  .ide-you-badge{margin-left:auto;font-size:9px;padding:1px 6px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.25);border-radius:3px;color:var(--accent2);font-family:'DM Mono',monospace}

  /* ── Editor area ── */
  .ide-editor-area{display:flex;flex-direction:column;flex:1;min-width:0;overflow:hidden}

  /* ── Tabs bar ── */
  .ide-tabs{height:var(--tabs-height);background:var(--bg1);border-bottom:1px solid var(--border);display:flex;align-items:stretch;overflow-x:auto;flex-shrink:0;scrollbar-width:none}
  .ide-tabs::-webkit-scrollbar{display:none}
  .ide-tab{display:flex;align-items:center;gap:7px;padding:0 14px;border-right:1px solid var(--border);font-size:12.5px;color:var(--text3);cursor:pointer;white-space:nowrap;min-width:100px;max-width:160px;flex-shrink:0;transition:all .15s;position:relative;background:transparent;user-select:none}
  .ide-tab:hover{color:var(--text1);background:rgba(255,255,255,.03)}
  .ide-tab.active{color:var(--text0);background:var(--bg2)}
  .ide-tab.active::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:var(--accent)}
  .ide-tab-icon{width:14px;height:14px;border-radius:2px;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:6px;font-weight:700;flex-shrink:0}
  .ide-tab-name{flex:1;overflow:hidden;text-overflow:ellipsis}
  .ide-tab-close{width:16px;height:16px;display:flex;align-items:center;justify-content:center;border-radius:3px;font-size:11px;flex-shrink:0;opacity:0;transition:opacity .15s,background .15s;margin-right:-4px}
  .ide-tab:hover .ide-tab-close,.ide-tab.active .ide-tab-close{opacity:1}
  .ide-tab-close:hover{background:rgba(255,255,255,.12)}
  .ide-tab.unsaved .ide-tab-close{opacity:1;font-size:8px;color:var(--text3)}
  .ide-tab.unsaved:hover .ide-tab-close,.ide-tab.unsaved.active .ide-tab-close{font-size:11px}
  .ide-tabs-add{width:30px;height:100%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text3);font-size:18px;flex-shrink:0;transition:color .15s}
  .ide-tabs-add:hover{color:var(--text1)}

  /* ── Editor breadcrumb ── */
  .ide-breadcrumb{height:26px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 12px;gap:5px;font-size:11px;color:var(--text3);flex-shrink:0}
  .ide-breadcrumb-sep{color:var(--text3);opacity:.5}
  .ide-breadcrumb-part{color:var(--text2)}
  .ide-breadcrumb-part.active{color:var(--text1)}

  /* ── Console ── */
  .ide-console{background:#08090f;border-top:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;resize:vertical}
  .ide-console-header{height:34px;background:#0a0b14;border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 12px;gap:10px;flex-shrink:0}
  .ide-console-tabs{display:flex;gap:2px;flex:1}
  .ide-console-tab{padding:4px 12px;font-size:11px;color:var(--text3);cursor:pointer;border-radius:5px;font-family:'DM Mono',monospace;letter-spacing:.06em;text-transform:uppercase;transition:all .15s}
  .ide-console-tab:hover{color:var(--text2)}
  .ide-console-tab.active{background:rgba(99,102,241,.12);color:var(--accent2)}
  .ide-console-action{padding:3px 9px;background:transparent;border:1px solid var(--border);border-radius:5px;color:var(--text3);font-size:11px;cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif}
  .ide-console-action:hover{border-color:rgba(255,255,255,.18);color:var(--text1)}
  .ide-console-body{flex:1;padding:10px 14px;overflow-y:auto;font-family:'DM Mono',monospace;font-size:12.5px;line-height:1.7}
  .ide-console-body::-webkit-scrollbar{width:4px}
  .ide-console-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}
  .out-line{margin-bottom:1px}
  .out-error{color:#ff6b6b}
  .out-success{color:#64ffda}
  .out-default{color:#c9d1d9}
  .out-info{color:#79c0ff}
  .out-empty{color:var(--text3);font-style:italic;display:flex;align-items:center;gap:8px;margin-top:4px}

  /* ── Right panel (Chat / History) ── */
  .ide-panel{width:var(--panel-width);background:var(--bg1);border-left:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden}
  .ide-panel.collapsed{width:0;border-left:none}
  .ide-panel-tabs{display:flex;border-bottom:1px solid var(--border);flex-shrink:0}
  .ide-panel-tab{flex:1;padding:9px 8px;background:transparent;border:none;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);cursor:pointer;border-bottom:2px solid transparent;transition:all .15s}
  .ide-panel-tab.active{color:var(--accent2);border-bottom-color:var(--accent)}
  .ide-panel-tab:hover:not(.active){color:var(--text1)}

  /* ── Chat ── */
  .ide-chat-messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:9px}
  .ide-chat-messages::-webkit-scrollbar{width:4px}
  .ide-chat-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}
  .ide-chat-empty{text-align:center;color:var(--text3);font-size:12px;margin-top:20px;line-height:1.6}
  .ide-msg-row{display:flex;flex-direction:column;gap:3px}
  .ide-msg-row.own{align-items:flex-end}
  .ide-msg-row.other{align-items:flex-start}
  .ide-msg-sender{font-size:10px;color:var(--text3);padding:0 4px}
  .ide-msg-bubble{max-width:88%;padding:7px 11px;border-radius:11px;font-size:12.5px;line-height:1.45;word-wrap:break-word}
  .ide-msg-bubble.own{background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;border-bottom-right-radius:3px}
  .ide-msg-bubble.other{background:rgba(255,255,255,.06);border:1px solid var(--border);color:var(--text1);border-bottom-left-radius:3px}
  .ide-chat-input-area{padding:10px;border-top:1px solid var(--border);display:flex;gap:7px;flex-shrink:0}
  .ide-chat-input{flex:1;padding:8px 11px;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:8px;color:var(--text0);font-family:'DM Sans',sans-serif;font-size:12.5px;outline:none;transition:all .15s}
  .ide-chat-input::placeholder{color:var(--text3)}
  .ide-chat-input:focus{border-color:rgba(99,102,241,.45);background:rgba(99,102,241,.05)}
  .ide-btn-send{width:34px;height:34px;background:linear-gradient(135deg,#6366f1,#7c3aed);border:none;border-radius:8px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;transition:all .15s}
  .ide-btn-send:hover{transform:translateY(-1px)}

  /* ── Versions ── */
  .ide-versions-list{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:7px}
  .ide-versions-list::-webkit-scrollbar{width:4px}
  .ide-versions-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}
  .ide-version-item{padding:9px 11px;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:9px;cursor:pointer;transition:all .15s}
  .ide-version-item:hover{border-color:rgba(99,102,241,.3);background:rgba(99,102,241,.05)}
  .ide-version-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
  .ide-version-num{font-family:'DM Mono',monospace;font-size:10px;color:rgba(99,102,241,.7);font-weight:500}
  .ide-version-time{font-size:10px;color:var(--text3)}
  .ide-version-label{font-size:12px;color:var(--text1);font-weight:500;margin-bottom:2px}
  .ide-version-meta{font-size:11px;color:var(--text3)}
  .ide-version-preview{margin-top:5px;padding:5px 7px;background:rgba(0,0,0,.3);border-radius:4px;font-family:'DM Mono',monospace;font-size:10px;color:var(--text3);white-space:pre-wrap;word-break:break-all;max-height:36px;overflow:hidden}
  .ide-versions-empty{text-align:center;color:var(--text3);font-size:12px;margin-top:32px;line-height:1.7;padding:0 12px}
  .ide-save-label-row{display:flex;gap:6px;padding:10px;border-top:1px solid var(--border);flex-shrink:0}
  .ide-save-label-input{flex:1;padding:6px 9px;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:6px;color:var(--text0);font-family:'DM Sans',sans-serif;font-size:12px;outline:none;transition:all .15s}
  .ide-save-label-input::placeholder{color:var(--text3)}
  .ide-save-label-input:focus{border-color:rgba(99,102,241,.4)}
  .ide-btn-save-manual{padding:6px 11px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);border-radius:6px;color:var(--accent2);font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:'DM Sans',sans-serif;transition:all .15s}
  .ide-btn-save-manual:hover{background:rgba(99,102,241,.25)}

  /* ── Status bar ── */
  .ide-status{height:var(--status-height);background:#0a0b12;border-top:1px solid var(--border);display:flex;align-items:center;padding:0 10px;gap:12px;flex-shrink:0;font-family:'DM Mono',monospace;font-size:10px;color:var(--text3)}
  .ide-status-item{display:flex;align-items:center;gap:5px;cursor:default;padding:0 6px;height:100%;transition:background .15s;border-radius:3px}
  .ide-status-item:hover{background:rgba(255,255,255,.05);color:var(--text2)}
  .ide-status-item .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
  .ide-status-sep{color:var(--border)}
  .ide-status-spacer{flex:1}

  /* ── Modal ── */
  .ide-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;z-index:100}
  .ide-modal{background:#0f1219;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:40px;width:380px;text-align:center;box-shadow:0 40px 100px rgba(0,0,0,.7)}
  .ide-modal-icon{font-size:30px;margin-bottom:18px}
  .ide-modal-title{font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:#fff;margin-bottom:8px}
  .ide-modal-sub{font-size:13px;color:var(--text2);margin-bottom:26px}
  .ide-modal-label{display:block;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--text3);margin-bottom:8px;text-align:left}
  .ide-modal-input{width:100%;padding:12px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;color:var(--text0);font-family:'DM Sans',sans-serif;font-size:15px;outline:none;margin-bottom:8px;transition:all .15s;text-align:center}
  .ide-modal-input:focus{border-color:rgba(99,102,241,.55);background:rgba(99,102,241,.06);box-shadow:0 0 0 3px rgba(99,102,241,.12)}
  .ide-modal-input::placeholder{color:var(--text3)}
  .ide-modal-error{font-size:12px;color:#fca5a5;margin-bottom:14px;text-align:left}
  .ide-modal-btn{width:100%;padding:12px;background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;border:none;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s;box-shadow:0 4px 16px rgba(99,102,241,.35)}
  .ide-modal-btn:hover{transform:translateY(-1px)}
  .ide-modal-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
  .ide-modal-room-id{font-family:'DM Mono',monospace;font-size:11px;color:var(--text3);margin-top:16px;letter-spacing:.1em}

  /* ── Context Menu ── */
  .ide-ctx-menu{position:fixed;background:var(--bg3);border:1px solid var(--border);border-radius:9px;padding:4px;z-index:200;min-width:160px;box-shadow:0 8px 32px rgba(0,0,0,.5)}
  .ide-ctx-item{padding:6px 12px;font-size:12.5px;color:var(--text1);cursor:pointer;border-radius:5px;transition:background .1s;display:flex;align-items:center;gap:9px}
  .ide-ctx-item:hover{background:rgba(99,102,241,.15)}
  .ide-ctx-item.danger{color:#ff6b6b}
  .ide-ctx-item.danger:hover{background:rgba(239,68,68,.12)}
  .ide-ctx-sep{height:1px;background:var(--border);margin:3px 4px}

  /* ── Toast ── */
  .ide-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#1a1d2e;border:1px solid rgba(99,102,241,.25);border-radius:9px;padding:9px 16px;font-size:12.5px;color:var(--text1);z-index:999;white-space:nowrap;box-shadow:0 8px 32px rgba(0,0,0,.4);animation:toast-in .2s ease;pointer-events:none}
  @keyframes toast-in{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

  /* ── Resize handle ── */
  .ide-resize-handle{height:4px;background:transparent;cursor:row-resize;flex-shrink:0;transition:background .15s}
  .ide-resize-handle:hover{background:rgba(99,102,241,.3)}

  /* ── Welcome / Empty state ── */
  .ide-welcome{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;color:var(--text3)}
  .ide-welcome-logo{width:56px;height:56px;background:linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.2));border:1px solid rgba(99,102,241,.2);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:24px}
  .ide-welcome-title{font-family:'Syne',sans-serif;font-size:18px;font-weight:600;color:var(--text2)}
  .ide-welcome-sub{font-size:13px;color:var(--text3);text-align:center;max-width:280px;line-height:1.6}
  .ide-welcome-shortcuts{display:flex;flex-direction:column;gap:6px;font-family:'DM Mono',monospace;font-size:11px}
  .ide-shortcut-row{display:flex;align-items:center;gap:10px;color:var(--text3)}
  .ide-kbd{padding:2px 7px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text2)}

  /* ── Rename input overlay on file row ── */
  .ide-rename-input{flex:1;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.4);border-radius:4px;color:var(--text0);font-family:'DM Mono',monospace;font-size:12px;padding:1px 5px;outline:none;min-width:0}

  /* ── Search panel ── */
  .ide-search-panel{flex:1;overflow-y:auto;padding:8px}
  .ide-search-input{width:100%;padding:7px 10px;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:7px;color:var(--text0);font-family:'DM Mono',monospace;font-size:12px;outline:none;transition:all .15s;margin-bottom:10px}
  .ide-search-input:focus{border-color:rgba(99,102,241,.4)}
  .ide-search-result{padding:5px 8px;border-radius:5px;cursor:pointer;transition:background .1s;margin-bottom:2px}
  .ide-search-result:hover{background:rgba(255,255,255,.05)}
  .ide-search-file{font-size:11px;font-family:'DM Mono',monospace;color:var(--accent2);margin-bottom:2px}
  .ide-search-match{font-size:11.5px;color:var(--text2);font-family:'DM Mono',monospace;white-space:pre;overflow:hidden;text-overflow:ellipsis}
  .ide-search-match mark{background:rgba(251,191,36,.25);color:var(--yellow);border-radius:2px}

  .remote-cursor{border-left:2px solid #ff4d4f;height:1.2em;margin-left:-1px}
  .remote-cursor-label{background:#ff4d4f;color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;margin-left:4px}

  /* Upload styles */
  .ide-upload-group {
    display: flex;
    gap: 4px;
  }
  .ide-file-upload-progress {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: var(--bg2);
    border: 1px solid var(--accent);
    border-radius: 8px;
    padding: 12px 20px;
    z-index: 1000;
    font-size: 12px;
    min-width: 200px;
  }
  .ide-file-upload-progress .progress-bar {
    height: 2px;
    background: var(--accent);
    margin-top: 8px;
    transition: width 0.3s;
  }
  .drag-overlay {
    position: fixed;
    inset: 0;
    background: rgba(99, 102, 241, 0.15);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px dashed var(--accent);
    pointer-events: none;
  }
  .drag-overlay-content {
    background: var(--bg2);
    padding: 32px;
    border-radius: 16px;
    text-align: center;
    border: 1px solid var(--accent);
  }
`;

// ─────────────────────────────────────────────
// Default file templates
// ─────────────────────────────────────────────
const DEFAULT_CONTENT = {
  javascript: "// Start coding...\nconsole.log('Hello, World!');\n",
  typescript: "// TypeScript\nconst greet = (name: string): string => `Hello, ${name}!`;\nconsole.log(greet('World'));\n",
  python: "# Start coding...\nprint('Hello, World!')\n",
  html: "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <title>Document</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>\n",
  css: "/* Styles */\nbody {\n  font-family: sans-serif;\n  margin: 0;\n  padding: 20px;\n}\n",
  json: '{\n  "name": "project",\n  "version": "1.0.0"\n}\n',
  markdown: "# Title\n\nStart writing...\n",
};

function getDefaultContent(filename) {
  const lang = getLangFromFile(filename);
  return DEFAULT_CONTENT[lang] || `// ${filename}\n`;
}

// ─────────────────────────────────────────────
// EditorPage
// ─────────────────────────────────────────────
function EditorPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const socketRef = useRef(null);
  const editorsRef = useRef({}); // fileId -> editor instance
  const isRemoteChange = useRef(false);
  const chatEndRef = useRef(null);
  const remoteCursorsRef = useRef({});
  const toastTimerRef = useRef(null);
  const saveDebounceRef = useRef(null);
  const ctxMenuRef = useRef(null);
  const consoleRef = useRef(null);
  const resizingRef = useRef(false);
  const fileInputRef = useRef(null);


  // ── State ──
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

  // Files
  const [files, setFiles] = useState([
    { id: "f1", name: "index.js", type: "file", parentId: null, content: DEFAULT_CONTENT.javascript, unsaved: false },
  ]);
  const [activeFileId, setActiveFileId] = useState("f1");
  const [openTabs, setOpenTabs] = useState(["f1"]);
  const [renamingFileId, setRenamingFileId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [creatingFile, setCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFileInFolder, setCreatingFileInFolder] = useState(null); // folderId
  const [newFileInFolderName, setNewFileInFolderName] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState({});
  const [ctxMenu, setCtxMenu] = useState(null); // {x, y, fileId}

  // Upload states
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  // Activity bar + panels
  const [activityTab, setActivityTab] = useState("files"); // files | search | users
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [panelTab, setPanelTab] = useState("chat");
  const [panelOpen, setPanelOpen] = useState(true);

  // Console
  const [output, setOutput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConsole, setShowConsole] = useState(true);
  const [consoletab, setConsoletab] = useState("output"); // output | preview
  const [htmlPreview, setHtmlPreview] = useState("");
  const [consoleHeight, setConsoleHeight] = useState(200);
  const [copyOutLabel, setCopyOutLabel] = useState("Copy");

  // Persistence
  const [saveStatus, setSaveStatus] = useState("saved");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [roomTitle, setRoomTitle] = useState("Untitled");
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [saveLabelInput, setSaveLabelInput] = useState("");
  const [restoringVersion, setRestoringVersion] = useState(null);

  // Chat
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // ── Derived ──
  const activeFile = files.find(f => f.id === activeFileId);
  const activeLanguage = activeFile ? getLangFromFile(activeFile.name) : "javascript";

  // ── Helpers ──
  function showToast(msg) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }

  function genId() {
    return "f" + Math.random().toString(36).slice(2, 8);
  }

  // ── File operations ──
  function openFile(fileId) {
    setActiveFileId(fileId);
    if (!openTabs.includes(fileId)) {
      setOpenTabs(prev => [...prev, fileId]);
    }
  }

  function closeTab(fileId, e) {
    e?.stopPropagation();
    const idx = openTabs.indexOf(fileId);
    const newTabs = openTabs.filter(id => id !== fileId);
    setOpenTabs(newTabs);
    if (activeFileId === fileId) {
      if (newTabs.length > 0) {
        setActiveFileId(newTabs[Math.max(0, idx - 1)] || newTabs[0]);
      } else {
        setActiveFileId(null);
      }
    }
  }

  function createNewFile(name, parentId = null) {
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    const hasExt = trimmed.includes(".");
    const finalName = hasExt ? trimmed : trimmed + ".js";
    if (files.some(f => f.name === finalName && f.parentId === parentId)) {
      showToast("File already exists");
      return;
    }
    const id = genId();
    const content = getDefaultContent(finalName);
    const newFile = { id, name: finalName, type: "file", parentId, content, unsaved: false };
    setFiles(prev => [...prev, newFile]);
    openFile(id);
    socketRef.current?.emit("file-created", { roomId, file: newFile, username });
    showToast(`Created ${finalName}`);
  }

  function createNewFolder(name, parentId = null) {
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (files.some(f => f.name === trimmed && f.type === "folder" && f.parentId === parentId)) {
      showToast("Folder already exists");
      return;
    }
    const id = genId();
    const newFolder = { id, name: trimmed, type: "folder", parentId, content: "", unsaved: false };
    setFiles(prev => [...prev, newFolder]);
    socketRef.current?.emit("file-created", { roomId, file: newFolder, username });
    showToast(`Created folder: ${trimmed}`);
  }

  function createNewFileInFolder(name, parentId) {
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    const hasExt = trimmed.includes(".");
    const finalName = hasExt ? trimmed : trimmed + ".js";
    if (files.some(f => f.name === finalName && f.parentId === parentId)) {
      showToast("File already exists in this folder");
      return;
    }
    const id = genId();
    const content = getDefaultContent(finalName);
    const newFile = { id, name: finalName, type: "file", parentId, content, unsaved: false };
    setFiles(prev => [...prev, newFile]);
    openFile(id);
    socketRef.current?.emit("file-created", { roomId, file: newFile, username });
    showToast(`Created ${finalName}`);
  }

  function toggleFolder(folderId) {
    setCollapsedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  }

  function deleteFolder(folderId) {
    // Recursively collect all descendant IDs
    function collectDescendants(parentId) {
      const children = files.filter(f => f.parentId === parentId);
      let ids = [parentId];
      children.forEach(child => {
        if (child.type === "folder") ids = ids.concat(collectDescendants(child.id));
        else ids.push(child.id);
      });
      return ids;
    }
    const toDelete = collectDescendants(folderId);
    toDelete.forEach(id => {
      socketRef.current?.emit("file-deleted", { roomId, fileId: id, username });
      closeTab(id);
    });
    setFiles(prev => prev.filter(f => !toDelete.includes(f.id)));
    showToast("Folder deleted");
  }

  function deleteFile(fileId) {
    const file = files.find(f => f.id === fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));
    closeTab(fileId);
    socketRef.current?.emit("file-deleted", { roomId, fileId, username });
    showToast(`Deleted ${file?.name}`);
  }

  function renameFile(fileId, newName) {
    if (!newName?.trim()) return;
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, name: newName.trim() } : f));
    socketRef.current?.emit("file-renamed", { roomId, fileId, name: newName.trim(), username });
  }

  function updateFileContent(fileId, content) {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, content, unsaved: true } : f));
  }

  // ── Download file ──
  function downloadFile(file) {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${file.name}`);
  }

  // ── File upload functions ──
  function readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);

      const ext = getExtension(file.name);
      const textExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'c', 'cpp', 'cc', 'h', 'hpp', 'java', 'go', 'rs', 'rb', 'php', 'kt', 'sh', 'bash', 'html', 'css', 'json', 'md', 'yaml', 'yml', 'xml', 'sql', 'txt', 'csv', 'toml', 'ini', 'env', 'gitignore', 'lock'];

      // Extensionless files that are always text
      const textFilenames = ['makefile', 'dockerfile', 'vagrantfile', 'gemfile', 'rakefile', 'procfile', 'license', 'readme', 'changelog', 'authors', 'contributors', '.gitignore', '.env', '.editorconfig'];

      const isTextByName = textFilenames.includes(file.name.toLowerCase());
      const isTextByExt = textExtensions.includes(ext);
      // If the "extension" equals the full name, the file has no extension
      const hasNoExt = ext === file.name.toLowerCase();

      if (isTextByName || isTextByExt || hasNoExt) {
        reader.readAsText(file);
      } else {
        if (file.size > 1024 * 1024) {
          reject(new Error('Binary files larger than 1MB are not supported'));
        } else {
          reader.readAsDataURL(file);
          showToast(`Note: ${file.name} is a binary file. It will be read as base64.`);
        }
      }
    });
  }

  async function processUploadedFiles(filesArray) {
    if (!filesArray.length) return;
    setUploadingFiles(true);
    setUploadProgress({ current: 0, total: filesArray.length });

    const currentFiles = [...files];
    // folderPathToId: maps a slash-joined path like "src/utils" -> folderId
    const folderPathToId = {};

    // Ensure a chain of folder nodes exists for a given path array, return leaf folderId
    function ensureFolderPath(parts) {
      let parentId = null;
      let builtPath = "";
      for (const part of parts) {
        builtPath = builtPath ? `${builtPath}/${part}` : part;
        if (!folderPathToId[builtPath]) {
          // Check if this folder already exists in currentFiles
          const existing = currentFiles.find(
            f => f.type === "folder" && f.name === part && f.parentId === parentId
          );
          if (existing) {
            folderPathToId[builtPath] = existing.id;
          } else {
            const folderId = genId();
            folderPathToId[builtPath] = folderId;
            const folderNode = { id: folderId, name: part, type: "folder", parentId, content: "", unsaved: false };
            currentFiles.push(folderNode);
            setFiles(prev => [...prev, folderNode]);
            socketRef.current?.emit("file-created", { roomId, file: folderNode, username });
          }
        }
        parentId = folderPathToId[builtPath];
      }
      return parentId;
    }

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      try {
        const content = await readFileContent(file);

        // Determine parentId from webkitRelativePath if available
        let parentId = null;
        const relativePath = file.webkitRelativePath || "";
        if (relativePath && relativePath.includes("/")) {
          const parts = relativePath.split("/");
          // parts = ["folderName", ..., "filename"] — strip last element (the file)
          const folderParts = parts.slice(0, -1);
          parentId = ensureFolderPath(folderParts);
        }

        const existingFile = currentFiles.find(f => f.name === file.name && f.parentId === parentId && f.type === "file");
        if (existingFile) {
          const shouldOverwrite = window.confirm(`${file.name} already exists. Overwrite?`);
          if (shouldOverwrite) {
            updateFileContent(existingFile.id, content);
            socketRef.current?.emit("code-change", { roomId, fileId: existingFile.id, code: content, username });
            showToast(`Overwrote ${file.name}`);
          }
        } else {
          const id = genId();
          const newFile = { id, name: file.name, type: "file", parentId, content, unsaved: false };
          currentFiles.push(newFile);
          setFiles(prev => [...prev, newFile]);
          socketRef.current?.emit("file-created", { roomId, file: newFile, username });
          showToast(`Uploaded ${file.name}`);
        }
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        showToast(`Failed to upload ${file.name}`);
      }
      setUploadProgress({ current: i + 1, total: filesArray.length });
    }

    setUploadingFiles(false);
    setUploadProgress({ current: 0, total: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFileUpload(e) {
    const filesArray = Array.from(e.target.files);
    processUploadedFiles(filesArray);
  }

  function handleFolderUpload(e) {
    const filesArray = Array.from(e.target.files);
    const validFiles = filesArray.filter(file => {
      const ext = getExtension(file.name);
      return ext && !['exe', 'dll', 'so', 'dylib', 'bin'].includes(ext);
    });
    processUploadedFiles(validFiles);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const filesArray = Array.from(e.dataTransfer.files);
    processUploadedFiles(filesArray);
  }

  // ── Search across files ──
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    const results = [];
    files.forEach(file => {
      file.content.split("\n").forEach((line, idx) => {
        if (line.toLowerCase().includes(q)) {
          results.push({ fileId: file.id, fileName: file.name, lineNum: idx + 1, line });
        }
      });
    });
    setSearchResults(results.slice(0, 50));
  }, [searchQuery, files]);

  // ── Editor mount ──
  function handleEditorMount(editor, fileId) {
    editorsRef.current[fileId] = editor;

    editor.onDidChangeCursorPosition((e) => {
      socketRef.current?.emit("cursor-change", { roomId, username, position: e.position, fileId });
    });
  }

  // ── Editor change ──
  function handleEditorChange(value, fileId) {
    if (isRemoteChange.current) return;
    if (value === undefined || value === null) return;

    updateFileContent(fileId, value);
    setSaveStatus("unsaved");

    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => setSaveStatus("saving"), 3000);

    socketRef.current?.emit("code-change", {
      roomId, fileId, code: value, username,
    });
  }

  // ── Execute ──
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
      const res = await fetch("http://localhost:3001/api/execute", {
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

  // ── Manual save ──
  function triggerManualSave() {
    if (!activeFile || !socketRef.current) return;
    const label = saveLabelInput.trim() || "Manual save";
    socketRef.current.emit("manual-save", {
      roomId, code: activeFile.content, username, label,
      fileName: activeFile.name,
    });
    setSaveStatus("saving");
    setSaveLabelInput("");
    showToast(`Saved: ${label}`);
  }

  // ── Load versions ──
  const loadVersions = useCallback(async () => {
    setVersionsLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/room/${roomId}/versions?limit=30`);
      const data = await res.json();
      if (data.success) setVersions(data.versions);
    } catch { }
    setVersionsLoading(false);
  }, [roomId]);

  useEffect(() => {
    if (panelTab === "versions") loadVersions();
  }, [panelTab]);

  // ── Restore version ──
  async function restoreVersion(version) {
    setRestoringVersion(version.version);
    try {
      const res = await fetch(`http://localhost:3001/api/room/${roomId}/version/${version.version}`);
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

  const isOwner = roomOwner === username;

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

  // ── Title rename ──
  function handleTitleBlur(e) {
    const newTitle = e.target.value.trim() || "Untitled";
    setRoomTitle(newTitle);
    socketRef.current?.emit("rename-room", { roomId, title: newTitle, username });
    saveRecentRoom(roomId, newTitle, activeLanguage);
  }

  // ── Chat ──
  function sendMessage() {
    if (!chatInput.trim() || !socketRef.current) return;
    socketRef.current.emit("chat-message", { roomId, message: chatInput, username });
    setChatInput("");
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Context Menu ──
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

  // ── Console resize ──
  function startResizingConsole(e) {
    resizingRef.current = true;
    const startY = e.clientY;
    const startH = consoleHeight;
    function onMove(ev) {
      if (!resizingRef.current) return;
      const delta = startY - ev.clientY;
      setConsoleHeight(Math.max(80, Math.min(500, startH + delta)));
    }
    function onUp() {
      resizingRef.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ── Save status label ──
  const saveStatusLabel = () => {
    if (saveStatus === "saving") return "Saving…";
    if (saveStatus === "saved") return lastSavedAt ? `Saved ${formatRelativeTime(lastSavedAt)}` : "Saved";
    return "Unsaved changes";
  };

  // ── Socket ──
  function initializeSocket(usernameToUse) {
    const socket = io("http://localhost:3001", {
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

    socket.on("privacy-change", ({ isPrivate: priv }) => {
      setIsPrivate(priv);
    });

    socket.on("you-were-kicked", () => {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
      navigate("/", { state: { kicked: true } });
    });

    socket.on("user-kicked", ({ username: kicked }) => {
      showToast(`${kicked} was removed from the room`);
    });

    socket.on("room-private", () => {
      setUsernameError("This room is private.");
      setShowUsernameModal(true);
      setIsConnected(false);
      setIsJoining(false);
      socket.disconnect();
      socketRef.current = null;
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
      setFiles(prev => {
        if (prev.some(f => f.id === file.id)) return prev;
        return [...prev, file];
      });
      showToast(`${file.name} added by collaborator`);
    });

    socket.on("file-deleted", ({ fileId, username: who }) => {
      setFiles(prev => prev.filter(f => f.id !== fileId));
      closeTab(fileId);
    });

    socket.on("file-renamed", ({ fileId, name }) => {
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, name } : f));
    });

    socket.on("language-change", ({ language }) => {
      // For compatibility with single-language mode
    });

    socket.on("autosaved", ({ savedAt, label }) => {
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
        options: {
          className: "remote-cursor",
          after: { content: sender, inlineClassName: "remote-cursor-label" },
        },
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
      socketRef.current.emit("manual-save", {
        roomId, code: activeFile.content, username, label: "Auto-save on leave",
        fileName: activeFile.name,
      });
    }
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    navigate("/");
  }

  useEffect(() => {
    if (username && !socketRef.current && !showUsernameModal) initializeSocket(username);
    return () => {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    };
  }, [username, showUsernameModal]);

  const getInitials = (name) => name ? name.slice(0, 2).toUpperCase() : "?";

  const classifyLine = (line) => {
    if (line.includes("Error") || line.includes("error") || line.startsWith("Failed")) return "out-error";
    if (line.includes("Return value:")) return "out-success";
    if (line.startsWith("Running") || line.includes("⚠")) return "out-info";
    return "out-default";
  };

  // ─────────────────────────────────────────────
  // USERNAME MODAL
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // MAIN IDE
  // ─────────────────────────────────────────────
  const openTabFiles = openTabs.map(id => files.find(f => f.id === id)).filter(Boolean);

  return (
    <>
      <style>{globalStyles}</style>
      <div
        className="ide-root"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag and drop overlay */}
        {dragActive && (
          <div className="drag-overlay">
            <div className="drag-overlay-content">
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
              <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                Drop files here
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text3)' }}>
                Supports JavaScript, Python, HTML, CSS, and more
              </div>
            </div>
          </div>
        )}

        {/* Upload progress indicator */}
        {uploadingFiles && (
          <div className="ide-file-upload-progress">
            <div>Uploading files... ({uploadProgress.current}/{uploadProgress.total})</div>
            <div className="progress-bar" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} />
          </div>
        )}

        {/* ── Toolbar ── */}
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

          {/* File upload buttons */}
          <div className="ide-upload-group">
            <button
              className="ide-toolbar-pill"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFiles}
              title="Upload files"
            >
              📁 Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              accept=".js,.jsx,.ts,.tsx,.py,.c,.cpp,.java,.go,.rs,.rb,.php,.kt,.sh,.html,.css,.json,.md,.yaml,.yml,.xml,.sql,.txt"
            />
            <button
              className="ide-toolbar-pill"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.webkitdirectory = true;
                input.multiple = true;
                input.onchange = handleFolderUpload;
                input.click();
              }}
              title="Upload folder"
            >
              📂 Folder
            </button>
          </div>

          <button
            className={`ide-toolbar-pill ${showConsole ? "active" : ""}`}
            onClick={() => setShowConsole(v => !v)}
          >
            Terminal
          </button>

          <div className="ide-spacer" />

          <div className="ide-room-badge">
            <span className={`ide-conn-dot ${isConnected ? "" : "offline"}`} />
            <span className="ide-room-id">{roomId}</span>
          </div>
          {isOwner && (
            <button
              className={`ide-toolbar-pill ${isPrivate ? "active" : ""}`}
              onClick={togglePrivacy}
              title={isPrivate ? "Room is private — click to make public" : "Room is public — click to make private"}
            >
              {isPrivate ? "🔒 Private" : "🌐 Public"}
            </button>
          )}
          {!isOwner && isPrivate && (
            <span className="ide-toolbar-pill" style={{ cursor: "default" }}>🔒 Private</span>
          )}
          <button
            className={`ide-toolbar-pill ${panelOpen ? "active" : ""}`}
            onClick={() => setPanelOpen(v => !v)}
          >
            Panel
          </button>

          <button className="ide-btn-leave" onClick={leaveRoom}>Leave</button>
        </div>

        {/* ── Main ── */}
        <div className="ide-main">

          {/* ── Activity Bar ── */}
          <div className="ide-activity">
            <button
              className={`ide-act-btn ${activityTab === "files" ? "active" : ""}`}
              onClick={() => { setActivityTab("files"); setSidebarOpen(v => activityTab === "files" ? !v : true); }}
              title="Explorer"
            >
              📁
            </button>
            <button
              className={`ide-act-btn ${activityTab === "search" ? "active" : ""}`}
              onClick={() => { setActivityTab("search"); setSidebarOpen(v => activityTab === "search" ? !v : true); }}
              title="Search"
            >
              🔍
            </button>
            <div className="ide-act-separator" />
            <button
              className={`ide-act-btn ${activityTab === "users" ? "active" : ""}`}
              onClick={() => { setActivityTab("users"); setSidebarOpen(v => activityTab === "users" ? !v : true); }}
              title="Collaborators"
            >
              👥
            </button>
          </div>

          {/* ── Sidebar ── */}
          <div className={`ide-sidebar ${sidebarOpen ? "" : "collapsed"}`}>

            {/* Files panel */}
            {activityTab === "files" && (
              <>
                <div className="ide-sidebar-header">
                  <span className="ide-sidebar-title">Explorer</span>
                  <div style={{ display: "flex", gap: 3 }}>
                    <button
                      className="ide-sidebar-action"
                      title="New File"
                      onClick={() => setCreatingFile(true)}
                    >+</button>
                    <button
                      className="ide-sidebar-action"
                      title="New Folder"
                      onClick={() => setCreatingFolder(true)}
                    >📁</button>
                    <button
                      className="ide-sidebar-action"
                      title="Collapse"
                      onClick={() => setSidebarOpen(false)}
                      style={{ fontSize: 11 }}
                    >✕</button>
                  </div>
                </div>

                <div className="ide-file-tree">
                  {/* Root folder row */}
                  <div className="ide-folder">
                    <div className="ide-folder-row">
                      <span className="ide-folder-arrow open">▶</span>
                      <span className="ide-folder-icon">📂</span>
                      <span style={{ fontSize: 12, color: "var(--text1)", fontFamily: "'DM Mono', monospace" }}>
                        {roomId.toLowerCase()}
                      </span>
                    </div>

                    {/* Recursive tree renderer */}
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

                              {/* New file input inside this folder */}
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

                              {/* Recurse into children if open */}
                              {isOpen && renderTree(item.id, depth + 1)}
                            </div>
                          );
                        }

                        // File node
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

                    {/* New root-level file input */}
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

                    {/* New root-level folder input */}
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

            {/* Search panel */}
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
                    <div
                      key={i}
                      className="ide-search-result"
                      onClick={() => {
                        openFile(r.fileId);
                        setActivityTab("files");
                      }}
                    >
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

            {/* Users panel */}
            {activityTab === "users" && (
              <>
                <div className="ide-sidebar-header">
                  <span className="ide-sidebar-title">Collaborators ({users.length})</span>
                </div>
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
                          {!isThisUserOwner && isYou && (
                            <span className="ide-you-badge">you</span>
                          )}
                        </div>
                        {isOwner && !isYou && (
                          <div style={{ display: "flex", gap: 4, paddingLeft: 32 }}>
                            <button
                              onClick={() => kickUser(user.username)}
                              style={{ flex: 1, padding: "3px 0", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 5, color: "rgba(239,68,68,.7)", fontSize: 10, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                            >
                              Kick
                            </button>
                            <button
                              onClick={() => transferOwner(user.username)}
                              style={{ flex: 1, padding: "3px 0", background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", borderRadius: 5, color: "rgba(245,158,11,.7)", fontSize: 10, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                            >
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

          {/* ── Editor Area ── */}
          <div className="ide-editor-area">

            {/* Tabs */}
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
                    <div
                      className="ide-tab-icon"
                      style={{ background: color + "22", color }}
                    >{icon}</div>
                    <span className="ide-tab-name">{file.name}</span>
                    <span
                      className="ide-tab-close"
                      onClick={e => closeTab(file.id, e)}
                      title="Close"
                    >
                      {file.unsaved ? "●" : "✕"}
                    </span>
                  </div>
                );
              })}

              <div
                className="ide-tabs-add"
                onClick={() => setCreatingFile(true)}
                title="New file"
              >+</div>
            </div>

            {/* Breadcrumb */}
            {activeFile && (
              <div className="ide-breadcrumb">
                <span className="ide-breadcrumb-part">{roomId.toLowerCase()}</span>
                <span className="ide-breadcrumb-sep">›</span>
                <span className="ide-breadcrumb-part active">{activeFile.name}</span>
                <div style={{ flex: 1 }} />
                <span style={{ color: "var(--text3)", fontSize: 10 }}>
                  {getLangFromFile(activeFile.name)}
                </span>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: getLangColor(getLangFromFile(activeFile.name)),
                  display: "inline-block", marginLeft: 6,
                }} />
              </div>
            )}

            {/* Editor or Welcome */}
            {activeFile ? (
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                {/* Render all open editors, show only active */}
                {openTabFiles.map(file => (
                  <div
                    key={file.id}
                    style={{
                      position: "absolute", inset: 0,
                      display: file.id === activeFileId ? "block" : "none",
                    }}
                  >
                    <Editor
                      height="100%"
                      language={getLangFromFile(file.name)}
                      value={file.content}
                      theme="vs-dark"
                      onMount={editor => handleEditorMount(editor, file.id)}
                      onChange={value => handleEditorChange(value, file.id)}
                      options={{
                        automaticLayout: true,
                        tabSize: 2,
                        fontSize: 13.5,
                        fontFamily: "'DM Mono', 'Cascadia Code', 'Fira Code', monospace",
                        minimap: { enabled: true, renderCharacters: false, scale: 1 },
                        scrollBeyondLastLine: false,
                        lineNumbers: "on",
                        renderLineHighlight: "gutter",
                        padding: { top: 14, bottom: 14 },
                        cursorBlinking: "smooth",
                        smoothScrolling: true,
                        fontLigatures: true,
                        bracketPairColorization: { enabled: true },
                        guides: { indentation: true },
                        renderWhitespace: "selection",
                        suggest: { showIcons: true },
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="ide-welcome">
                <div className="ide-welcome-logo">⌘</div>
                <div className="ide-welcome-title">No file open</div>
                <div className="ide-welcome-sub">
                  Create a new file, upload files, or select one from the explorer to start coding.
                </div>
                <div className="ide-welcome-shortcuts">
                  <div className="ide-shortcut-row">
                    <span className="ide-kbd">+</span>
                    <span>New file</span>
                  </div>
                  <div className="ide-shortcut-row">
                    <span className="ide-kbd">📁 Upload</span>
                    <span>Upload files/folders</span>
                  </div>
                  <div className="ide-shortcut-row">
                    <span className="ide-kbd">Drag & Drop</span>
                    <span>Drop files anywhere</span>
                  </div>
                </div>
              </div>
            )}

            {/* Console resize handle */}
            {showConsole && (
              <div
                className="ide-resize-handle"
                onMouseDown={startResizingConsole}
              />
            )}

            {/* Console */}
            {showConsole && (
              <div className="ide-console" style={{ height: consoleHeight }}>
                <div className="ide-console-header">
                  <div className="ide-console-tabs">
                    <button
                      className={`ide-console-tab ${consoletab === "output" ? "active" : ""}`}
                      onClick={() => setConsoletab("output")}
                    >Output</button>
                    <button
                      className={`ide-console-tab ${consoletab === "preview" ? "active" : ""}`}
                      onClick={() => setConsoletab("preview")}
                    >Preview</button>
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
                    <iframe
                      srcDoc={htmlPreview}
                      style={{ width: "100%", height: "100%", border: "none", background: "#fff", display: "block" }}
                      sandbox="allow-scripts"
                      title="Preview"
                    />
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

          {/* ── Right Panel ── */}
          <div className={`ide-panel ${panelOpen ? "" : "collapsed"}`}>
            <div className="ide-panel-tabs">
              <button className={`ide-panel-tab ${panelTab === "chat" ? "active" : ""}`} onClick={() => setPanelTab("chat")}>Chat</button>
              <button className={`ide-panel-tab ${panelTab === "versions" ? "active" : ""}`} onClick={() => setPanelTab("versions")}>History</button>
            </div>

            {/* Chat */}
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

            {/* Version History */}
            {panelTab === "versions" && (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                <div className="ide-versions-list">
                  {versionsLoading && <div className="ide-versions-empty">Loading…</div>}
                  {!versionsLoading && versions.length === 0 && (
                    <div className="ide-versions-empty">
                      No saved versions yet.<br /><br />
                      Code autosaves every 5s of inactivity. Save manually below.
                    </div>
                  )}
                  {versions.map(v => (
                    <div
                      key={v.version}
                      className="ide-version-item"
                      onClick={() => restoreVersion(v)}
                      title="Click to restore"
                    >
                      <div className="ide-version-header">
                        <span className="ide-version-num">v{v.version}</span>
                        <span className="ide-version-time">{formatRelativeTime(v.saved_at)}</span>
                      </div>
                      <div className="ide-version-label">
                        {v.label || "Autosave"}
                        {restoringVersion === v.version && " ↩ Restoring…"}
                      </div>
                      <div className="ide-version-meta">
                        by {v.username} · {(v.code_length / 1000).toFixed(1)}KB
                      </div>
                      {v.code_preview && (
                        <div className="ide-version-preview">{v.code_preview}</div>
                      )}
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
        </div>

        {/* ── Status Bar ── */}
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
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: getLangColor(getLangFromFile(activeFile.name)),
                  display: "inline-block",
                }} />
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

        {/* ── Context Menu ── */}
        {ctxMenu && (() => {
          const ctxItem = files.find(f => f.id === ctxMenu.fileId);
          const isFolder = ctxItem?.type === "folder";
          return (
            <div
              className="ide-ctx-menu"
              ref={ctxMenuRef}
              style={{ top: ctxMenu.y, left: ctxMenu.x }}
            >
              <div className="ide-ctx-item" onClick={() => {
                if (ctxItem) { setRenameValue(ctxItem.name); setRenamingFileId(ctxItem.id); }
                setCtxMenu(null);
              }}>
                <span>✎</span> Rename
              </div>
              {isFolder ? (
                <>
                  <div className="ide-ctx-item" onClick={() => {
                    setCreatingFileInFolder(ctxMenu.fileId);
                    setNewFileInFolderName("");
                    setCtxMenu(null);
                  }}>
                    <span>+</span> New file inside
                  </div>
                  <div className="ide-ctx-sep" />
                  <div className="ide-ctx-item danger" onClick={() => {
                    deleteFolder(ctxMenu.fileId);
                    setCtxMenu(null);
                  }}>
                    <span>🗑</span> Delete folder
                  </div>
                </>
              ) : (
                <>
                  <div className="ide-ctx-item" onClick={() => {
                    openFile(ctxMenu.fileId);
                    setCtxMenu(null);
                  }}>
                    <span>↗</span> Open
                  </div>
                  <div className="ide-ctx-item" onClick={() => {
                    if (ctxItem) downloadFile(ctxItem);
                    setCtxMenu(null);
                  }}>
                    <span>💾</span> Download
                  </div>
                  <div className="ide-ctx-sep" />
                  <div className="ide-ctx-item danger" onClick={() => {
                    deleteFile(ctxMenu.fileId);
                    setCtxMenu(null);
                  }}>
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