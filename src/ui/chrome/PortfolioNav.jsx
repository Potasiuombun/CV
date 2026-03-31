import React from "react";

export default function PortfolioNav({ rooms, activeRoomId, onNavigate }) {
  return (
    <header className="portfolio-nav">
      <div className="portfolio-nav-title">Tudor Portfolio RPG</div>
      <nav aria-label="Portfolio sections" className="portfolio-nav-items">
        {rooms.map((room) => (
          <button
            key={room.id}
            type="button"
            className={room.id === activeRoomId ? "is-active" : ""}
            onClick={() => onNavigate(room.id)}
          >
            {room.title}
          </button>
        ))}
      </nav>
    </header>
  );
}
