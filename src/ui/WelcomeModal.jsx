import React from "react";

export default function WelcomeModal({ onStart }) {
  return (
    <div className="welcome-overlay">
      <div className="welcome-card" role="dialog" aria-modal="true" aria-label="Welcome">
        <h2>Welcome to my portofolio</h2>
        <p>Move around the room and explore interactive spots. Navigation also works like a normal portfolio.</p>

        <div style={{ display: "flex", gap: 18, alignItems: "flex-end", flexWrap: "wrap", marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 42px)", gridTemplateRows: "repeat(2, 42px)", gap: 6 }}>
            <span />
            <kbd className="welcome-kbd">W</kbd>
            <span />
            <kbd className="welcome-kbd">A</kbd>
            <kbd className="welcome-kbd">S</kbd>
            <kbd className="welcome-kbd">D</kbd>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <div><kbd className="welcome-kbd">E</kbd> Interact</div>
            <div><kbd className="welcome-kbd">Shift</kbd> Sprint</div>
            <div><kbd className="welcome-kbd">F1</kbd> Debug</div>
          </div>
        </div>

        <div className="welcome-actions">
          <button type="button" onClick={onStart}>Start</button>
        </div>
      </div>
    </div>
  );
}
