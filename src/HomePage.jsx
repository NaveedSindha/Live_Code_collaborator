import { useState } from "react";
import { useNavigate } from "react-router-dom";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .hp-root {
    min-height: 100vh;
    background: #080b10;
    font-family: 'DM Sans', sans-serif;
    color: #e8eaf0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    position: relative;
    overflow: hidden;
  }

  .hp-bg-grid {
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
  }

  .hp-bg-glow {
    position: fixed;
    width: 600px;
    height: 600px;
    border-radius: 50%;
    filter: blur(120px);
    pointer-events: none;
    opacity: 0.35;
  }

  .hp-glow-1 {
    background: radial-gradient(circle, #6366f1 0%, transparent 70%);
    top: -200px;
    left: -100px;
  }

  .hp-glow-2 {
    background: radial-gradient(circle, #8b5cf6 0%, transparent 70%);
    bottom: -200px;
    right: -100px;
    opacity: 0.2;
  }

  .hp-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    max-width: 1100px;
    width: 100%;
    min-height: 620px;
    border-radius: 24px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.07);
    box-shadow: 0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1);
    position: relative;
    z-index: 1;
  }

  .hp-hero {
    background: linear-gradient(145deg, #0f1320 0%, #0d1628 50%, #0a1022 100%);
    padding: 56px 48px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
    border-right: 1px solid rgba(255,255,255,0.05);
  }

  .hp-hero-pattern {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.12) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.08) 0%, transparent 50%);
    pointer-events: none;
  }

  .hp-logo-mark {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    margin-bottom: 40px;
    box-shadow: 0 8px 32px rgba(99,102,241,0.4);
    position: relative;
    z-index: 1;
  }

  .hp-hero-content {
    position: relative;
    z-index: 1;
  }

  .hp-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #6366f1;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .hp-eyebrow::before {
    content: '';
    width: 20px;
    height: 1px;
    background: #6366f1;
    display: block;
  }

  .hp-headline {
    font-family: 'Syne', sans-serif;
    font-size: 42px;
    font-weight: 800;
    line-height: 1.08;
    color: #ffffff;
    margin-bottom: 20px;
    letter-spacing: -0.02em;
  }

  .hp-headline-accent {
    background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hp-desc {
    font-size: 15px;
    font-weight: 300;
    line-height: 1.7;
    color: rgba(255,255,255,0.45);
    margin-bottom: 48px;
    max-width: 320px;
  }

  .hp-feature-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .hp-feature {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    color: rgba(255,255,255,0.55);
    font-weight: 400;
  }

  .hp-feature-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    flex-shrink: 0;
  }

  .hp-form-panel {
    background: #0c0f16;
    padding: 48px 44px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .hp-tab-row {
    display: flex;
    gap: 4px;
    background: rgba(255,255,255,0.04);
    border-radius: 12px;
    padding: 4px;
    margin-bottom: 36px;
    border: 1px solid rgba(255,255,255,0.06);
  }

  .hp-tab {
    flex: 1;
    padding: 10px 16px;
    border: none;
    border-radius: 9px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
    background: transparent;
    color: rgba(255,255,255,0.4);
  }

  .hp-tab.active {
    background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
    color: white;
    box-shadow: 0 4px 16px rgba(99,102,241,0.35);
  }

  .hp-tab:not(.active):hover {
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.7);
  }

  .hp-field {
    margin-bottom: 20px;
  }

  .hp-label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.35);
    margin-bottom: 8px;
  }

  .hp-input {
    width: 100%;
    padding: 13px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    color: #e8eaf0;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 400;
    outline: none;
    transition: all 0.2s ease;
    -webkit-appearance: none;
  }

  .hp-input::placeholder { color: rgba(255,255,255,0.2); }

  .hp-input:focus {
    border-color: rgba(99,102,241,0.6);
    background: rgba(99,102,241,0.06);
    box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
  }

  .hp-input-mono {
    font-family: 'DM Mono', monospace;
    font-size: 18px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .hp-select {
    width: 100%;
    padding: 13px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    color: #e8eaf0;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    outline: none;
    cursor: pointer;
    transition: all 0.2s ease;
    -webkit-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,0.3)' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 38px;
  }

  .hp-select option { background: #1a1d28; }

  .hp-error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.2);
    border-radius: 8px;
    color: #fca5a5;
    font-size: 13px;
    margin-bottom: 20px;
  }

  .hp-btn-primary {
    width: 100%;
    padding: 14px 24px;
    background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: 0.01em;
    box-shadow: 0 4px 20px rgba(99,102,241,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .hp-btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(99,102,241,0.45);
    background: linear-gradient(135deg, #7274f3 0%, #8b5cf6 100%);
  }

  .hp-btn-primary:active { transform: translateY(0); }

  .hp-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .hp-divider {
    height: 1px;
    background: rgba(255,255,255,0.06);
    margin: 28px 0;
  }

  .hp-footer-hint {
    font-size: 12px;
    color: rgba(255,255,255,0.2);
    text-align: center;
    line-height: 1.6;
  }

  /* Modal Styles */
  .hp-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 24px;
  }

  .hp-modal {
    background: #0f1219;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 24px;
    padding: 44px;
    width: 480px;
    max-width: 100%;
    box-shadow: 0 40px 120px rgba(0,0,0,0.7);
    position: relative;
  }

  .hp-modal-success-badge {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%);
    border: 1px solid rgba(99,102,241,0.25);
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    margin: 0 auto 24px;
  }

  .hp-modal-title {
    font-family: 'Syne', sans-serif;
    font-size: 26px;
    font-weight: 700;
    color: white;
    text-align: center;
    margin-bottom: 8px;
  }

  .hp-modal-subtitle {
    font-size: 14px;
    color: rgba(255,255,255,0.4);
    text-align: center;
    margin-bottom: 32px;
  }

  .hp-room-id-display {
    background: rgba(99,102,241,0.08);
    border: 1px solid rgba(99,102,241,0.2);
    border-radius: 14px;
    padding: 24px;
    margin-bottom: 16px;
    text-align: center;
  }

  .hp-room-id-label {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(99,102,241,0.7);
    margin-bottom: 10px;
  }

  .hp-room-id-value {
    font-family: 'DM Mono', monospace;
    font-size: 32px;
    font-weight: 500;
    color: white;
    letter-spacing: 0.18em;
  }

  .hp-link-box {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .hp-link-text {
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    color: rgba(255,255,255,0.4);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hp-btn-copy {
    padding: 6px 14px;
    background: rgba(99,102,241,0.15);
    border: 1px solid rgba(99,102,241,0.3);
    border-radius: 7px;
    color: #818cf8;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
    font-family: 'DM Sans', sans-serif;
  }

  .hp-btn-copy:hover { background: rgba(99,102,241,0.25); }

  .hp-meta-row {
    display: flex;
    gap: 10px;
    margin-bottom: 24px;
  }

  .hp-meta-chip {
    flex: 1;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 9px;
    padding: 10px 12px;
    font-size: 12px;
  }

  .hp-meta-chip-label {
    color: rgba(255,255,255,0.3);
    margin-bottom: 4px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .hp-meta-chip-value {
    color: rgba(255,255,255,0.8);
    font-weight: 500;
  }

  .hp-btn-ghost {
    width: 100%;
    padding: 12px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    color: rgba(255,255,255,0.35);
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 10px;
  }

  .hp-btn-ghost:hover {
    border-color: rgba(255,255,255,0.15);
    color: rgba(255,255,255,0.6);
    background: rgba(255,255,255,0.03);
  }

  @media (max-width: 768px) {
    .hp-layout { grid-template-columns: 1fr; }
    .hp-hero { padding: 40px 32px; display: none; }
    .hp-form-panel { padding: 40px 28px; }
  }
`;

function HomePage() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(true);
  const [isCheckingRoom, setIsCheckingRoom] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState("");
  const [createdUsername, setCreatedUsername] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy");

  const availableLanguages = [
    { id: "javascript", name: "JavaScript" },
    { id: "typescript", name: "TypeScript" },
    { id: "python", name: "Python" },
    { id: "c", name: "C" },
    { id: "cpp", name: "C++" },
    { id: "java", name: "Java" },
    { id: "rust", name: "Rust" },
    { id: "go", name: "Go" },
    { id: "ruby", name: "Ruby" },
    { id: "php", name: "PHP" },
    { id: "swift", name: "Swift" },
    { id: "kotlin", name: "Kotlin" },
    { id: "bash", name: "Bash" },
    { id: "html", name: "HTML" },
    { id: "css", name: "CSS" },
  ];

  const generateRoomId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const checkRoomExists = async (id) => {
    try {
      const res = await fetch(`http://localhost:3001/api/room/${id}`);
      const data = await res.json();
      return data.success && data.data.exists;
    } catch { return false; }
  };

  const validateUsername = () => {
    if (!username.trim()) { setError("Username is required"); return false; }
    if (username.length < 3) { setError("Username must be at least 3 characters"); return false; }
    if (username.length > 20) { setError("Username must be 20 characters or less"); return false; }
    return true;
  };

  const handleCreateRoom = () => {
    setError("");
    if (!validateUsername()) return;
    const newRoomId = generateRoomId();
    setCreatedRoomId(newRoomId);
    setCreatedUsername(username);
    setShowRoomModal(true);
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/room/${createdRoomId}`;
    navigator.clipboard.writeText(link);
    setCopyLabel("Copied!");
    setTimeout(() => setCopyLabel("Copy"), 2000);
  };

  const startCollaborating = () => {
    navigate(`/room/${createdRoomId}`, { state: { username: createdUsername, language: "javascript" } });
  };

  const handleJoinRoom = async () => {
    setError("");
    if (!validateUsername()) return;
    if (!roomId.trim()) { setError("Room ID is required"); return; }
    if (roomId.length !== 8) { setError("Room ID must be exactly 8 characters"); return; }

    setIsCheckingRoom(true);
    const exists = await checkRoomExists(roomId);
    setIsCheckingRoom(false);
    if (!exists) { setError("Room not found. Please verify the Room ID."); return; }

    try {
      const res = await fetch(`http://localhost:3001/api/room/${roomId}`);
      const data = await res.json();
      const roomLanguage = data.data?.language || "javascript";
      navigate(`/room/${roomId}`, { state: { username, language: roomLanguage } });
    } catch {
      navigate(`/room/${roomId}`, { state: { username, language: "javascript" } });
    }
  };

  if (showRoomModal) {
    return (
      <>
        <style>{styles}</style>
        <div className="hp-modal-overlay">
          <div className="hp-modal">
            <div className="hp-modal-success-badge">✦</div>
            <div className="hp-modal-title">Room Ready</div>
            <div className="hp-modal-subtitle">Share the details below to invite collaborators</div>

            <div className="hp-room-id-display">
              <div className="hp-room-id-label">Room ID</div>
              <div className="hp-room-id-value">{createdRoomId}</div>
            </div>

            <div className="hp-link-box">
              <span className="hp-link-text">{window.location.origin}/room/{createdRoomId}</span>
              <button className="hp-btn-copy" onClick={copyRoomLink}>{copyLabel}</button>
            </div>

            <div className="hp-meta-row">
              <div className="hp-meta-chip">
                <div className="hp-meta-chip-label">Host</div>
                <div className="hp-meta-chip-value">{createdUsername}</div>
              </div>
            </div>

            <button className="hp-btn-primary" onClick={startCollaborating}>
              Launch Editor →
            </button>
            <button
              className="hp-btn-ghost"
              onClick={() => { setShowRoomModal(false); setUsername(""); setLanguage("javascript"); }}
            >
              Create another room
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="hp-root">
        <div className="hp-bg-grid" />
        <div className="hp-bg-glow hp-glow-1" />
        <div className="hp-bg-glow hp-glow-2" />

        <div className="hp-layout">
          {/* Left Hero Panel */}
          <div className="hp-hero">
            <div className="hp-hero-pattern" />
            <div className="hp-logo-mark">⌘</div>

            <div className="hp-hero-content">
              <div className="hp-eyebrow">Live Collaboration</div>
              <h1 className="hp-headline">
                Code together,<br />
                <span className="hp-headline-accent">in real time.</span>
              </h1>
              <p className="hp-desc">
                A shared editor for engineering teams. Write, review, and execute code with your team—no setup required.
              </p>

              <div className="hp-feature-list">
                <div className="hp-feature"><span className="hp-feature-dot" />Real-time collaborative editing</div>
                <div className="hp-feature"><span className="hp-feature-dot" />JavaScript, Python, TypeScript & more</div>
                <div className="hp-feature"><span className="hp-feature-dot" />Instant code execution with live output</div>
                <div className="hp-feature"><span className="hp-feature-dot" />Built-in team chat per session</div>
              </div>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="hp-form-panel">
            <div className="hp-tab-row">
              <button
                className={`hp-tab ${showJoinForm ? "active" : ""}`}
                onClick={() => { setShowJoinForm(true); setError(""); setRoomId(""); }}
              >
                Join Room
              </button>
              <button
                className={`hp-tab ${!showJoinForm ? "active" : ""}`}
                onClick={() => { setShowJoinForm(false); setError(""); }}
              >
                Create Room
              </button>
            </div>

            <div className="hp-field">
              <label className="hp-label">Username</label>
              <input
                className="hp-input"
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                placeholder="e.g. alex_dev"
                autoComplete="off"
              />
            </div>

            {showJoinForm ? (
              <>
                <div className="hp-field">
                  <label className="hp-label">Room ID</label>
                  <input
                    className="hp-input hp-input-mono"
                    type="text"
                    value={roomId}
                    onChange={(e) => { setRoomId(e.target.value.toUpperCase()); setError(""); }}
                    placeholder="A1B2C3D4"
                    maxLength={8}
                    autoComplete="off"
                  />
                </div>

                {error && <div className="hp-error">⚠ {error}</div>}

                <button
                  className="hp-btn-primary"
                  onClick={handleJoinRoom}
                  disabled={isCheckingRoom}
                >
                  {isCheckingRoom ? "Verifying…" : "Join Session →"}
                </button>
              </>
            ) : (
              <>

                {error && <div className="hp-error">⚠ {error}</div>}

                <button className="hp-btn-primary" onClick={handleCreateRoom}>
                  Create Room →
                </button>
              </>
            )}

            <div className="hp-divider" />
            <div className="hp-footer-hint">
              Rooms are ephemeral — sessions end when all users disconnect
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default HomePage;
