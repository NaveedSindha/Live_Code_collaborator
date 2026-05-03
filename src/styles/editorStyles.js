export const globalStyles = `
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
  .ide-toolbar{height:var(--toolbar-height);background:var(--bg1);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 12px;gap:10px;flex-shrink:0;z-index:10;}
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
  .ide-main{display:flex;flex:1;overflow:hidden}
  .ide-activity{width:var(--activity-width);background:var(--bg1);border-right:1px solid var(--border);display:flex;flex-direction:column;align-items:center;padding:6px 0;gap:2px;flex-shrink:0;z-index:5}
  .ide-act-btn{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:8px;cursor:pointer;border:none;background:transparent;color:var(--text3);font-size:16px;transition:all .15s;position:relative}
  .ide-act-btn:hover{color:var(--text1);background:rgba(255,255,255,.05)}
  .ide-act-btn.active{color:var(--text0);background:rgba(99,102,241,.15)}
  .ide-act-btn.active::before{content:'';position:absolute;left:-6px;top:50%;transform:translateY(-50%);width:3px;height:20px;background:var(--accent);border-radius:0 2px 2px 0}
  .ide-act-separator{width:28px;height:1px;background:var(--border);margin:4px 0}
  .ide-sidebar{width:var(--sidebar-width);background:var(--bg1);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden}
  .ide-sidebar.collapsed{width:0;border-right:none}
  .ide-sidebar-header{height:36px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;flex-shrink:0;border-bottom:1px solid var(--border)}
  .ide-sidebar-title{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--text2)}
  .ide-sidebar-action{width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:5px;cursor:pointer;color:var(--text3);font-size:14px;border:none;background:transparent;transition:all .15s}
  .ide-sidebar-action:hover{color:var(--text1);background:rgba(255,255,255,.06)}
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
  .ide-file-actions{display:none;gap:2px;flex-shrink:0;margin-left:auto}
  .ide-file-row:hover .ide-file-actions{display:flex}
  .ide-folder-row:hover .ide-file-actions{display:flex}
  .ide-file-action-btn{width:16px;height:16px;display:flex;align-items:center;justify-content:center;border-radius:3px;cursor:pointer;background:transparent;border:none;color:var(--text3);font-size:11px;transition:all .1s}
  .ide-file-action-btn:hover{background:rgba(255,255,255,.1);color:var(--text1)}
  .ide-new-file-row{display:flex;align-items:center;gap:6px;padding:3px 8px 3px 28px;height:26px;margin:0 4px}
  .ide-new-file-input{flex:1;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.35);border-radius:4px;color:var(--text0);font-family:'DM Mono',monospace;font-size:12px;padding:2px 6px;outline:none}
  .ide-sidebar-users{padding:8px;border-top:1px solid var(--border);flex-shrink:0}
  .ide-user-chip{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:7px;margin-bottom:3px;transition:background .15s}
  .ide-user-chip.self{background:rgba(99,102,241,.08)}
  .ide-avatar{width:24px;height:24px;border-radius:6px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0}
  .ide-avatar-other{background:linear-gradient(135deg,#0ea5e9,#6366f1)}
  .ide-uname{font-size:12px;font-weight:500;color:var(--text1)}
  .ide-you-badge{margin-left:auto;font-size:9px;padding:1px 6px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.25);border-radius:3px;color:var(--accent2);font-family:'DM Mono',monospace}
  .ide-editor-area{display:flex;flex-direction:column;flex:1;min-width:0;overflow:hidden}
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
  .ide-breadcrumb{height:26px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 12px;gap:5px;font-size:11px;color:var(--text3);flex-shrink:0}
  .ide-breadcrumb-sep{color:var(--text3);opacity:.5}
  .ide-breadcrumb-part{color:var(--text2)}
  .ide-breadcrumb-part.active{color:var(--text1)}
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
  .ide-panel{width:var(--panel-width);background:var(--bg1);border-left:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden}
  .ide-panel.collapsed{width:0;border-left:none}
  .ide-panel-tabs{display:flex;border-bottom:1px solid var(--border);flex-shrink:0}
  .ide-panel-tab{flex:1;padding:9px 8px;background:transparent;border:none;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);cursor:pointer;border-bottom:2px solid transparent;transition:all .15s}
  .ide-panel-tab.active{color:var(--accent2);border-bottom-color:var(--accent)}
  .ide-panel-tab:hover:not(.active){color:var(--text1)}
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
  .ide-status{height:var(--status-height);background:#0a0b12;border-top:1px solid var(--border);display:flex;align-items:center;padding:0 10px;gap:12px;flex-shrink:0;font-family:'DM Mono',monospace;font-size:10px;color:var(--text3)}
  .ide-status-item{display:flex;align-items:center;gap:5px;cursor:default;padding:0 6px;height:100%;transition:background .15s;border-radius:3px}
  .ide-status-item:hover{background:rgba(255,255,255,.05);color:var(--text2)}
  .ide-status-item .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
  .ide-status-sep{color:var(--border)}
  .ide-status-spacer{flex:1}
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
  .ide-ctx-menu{position:fixed;background:var(--bg3);border:1px solid var(--border);border-radius:9px;padding:4px;z-index:200;min-width:160px;box-shadow:0 8px 32px rgba(0,0,0,.5)}
  .ide-ctx-item{padding:6px 12px;font-size:12.5px;color:var(--text1);cursor:pointer;border-radius:5px;transition:background .1s;display:flex;align-items:center;gap:9px}
  .ide-ctx-item:hover{background:rgba(99,102,241,.15)}
  .ide-ctx-item.danger{color:#ff6b6b}
  .ide-ctx-item.danger:hover{background:rgba(239,68,68,.12)}
  .ide-ctx-sep{height:1px;background:var(--border);margin:3px 4px}
  .ide-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#1a1d2e;border:1px solid rgba(99,102,241,.25);border-radius:9px;padding:9px 16px;font-size:12.5px;color:var(--text1);z-index:999;white-space:nowrap;box-shadow:0 8px 32px rgba(0,0,0,.4);animation:toast-in .2s ease;pointer-events:none}
  @keyframes toast-in{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
  .ide-resize-handle{height:4px;background:transparent;cursor:row-resize;flex-shrink:0;transition:background .15s}
  .ide-resize-handle:hover{background:rgba(99,102,241,.3)}
  .ide-welcome{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;color:var(--text3)}
  .ide-welcome-logo{width:56px;height:56px;background:linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.2));border:1px solid rgba(99,102,241,.2);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:24px}
  .ide-welcome-title{font-family:'Syne',sans-serif;font-size:18px;font-weight:600;color:var(--text2)}
  .ide-welcome-sub{font-size:13px;color:var(--text3);text-align:center;max-width:280px;line-height:1.6}
  .ide-welcome-shortcuts{display:flex;flex-direction:column;gap:6px;font-family:'DM Mono',monospace;font-size:11px}
  .ide-shortcut-row{display:flex;align-items:center;gap:10px;color:var(--text3)}
  .ide-kbd{padding:2px 7px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text2)}
  .ide-rename-input{flex:1;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.4);border-radius:4px;color:var(--text0);font-family:'DM Mono',monospace;font-size:12px;padding:1px 5px;outline:none;min-width:0}
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
  .ide-upload-group{display:flex;gap:4px;}
  .ide-file-upload-progress{position:fixed;bottom:20px;right:20px;background:var(--bg2);border:1px solid var(--accent);border-radius:8px;padding:12px 20px;z-index:1000;font-size:12px;min-width:200px;}
  .ide-file-upload-progress .progress-bar{height:2px;background:var(--accent);margin-top:8px;transition:width 0.3s;}
  .drag-overlay{position:fixed;inset:0;background:rgba(99,102,241,0.15);backdrop-filter:blur(8px);z-index:1000;display:flex;align-items:center;justify-content:center;border:2px dashed var(--accent);pointer-events:none;}
  .drag-overlay-content{background:var(--bg2);padding:32px;border-radius:16px;text-align:center;border:1px solid var(--accent);}
`;