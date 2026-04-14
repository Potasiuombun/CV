import React from "react";

export default function SectionScroller({ rooms, contentByRoom, onInspectFromList }) {
  return (
    <main className="portfolio-sections" aria-label="Portfolio sections">
      {rooms.map((room) => (
        <section key={room.id} id={room.sectionId} className="portfolio-section" data-room-id={room.id}>
          <h2>{room.title}</h2>
          <p>{room.subtitle}</p>
          {(contentByRoom[room.id] || []).map((item) => (
            <article key={item.id} className="section-card">
              <h3>{item.title || item.label}</h3>
              {item.summary ? <p>{item.summary}</p> : null}
              <button type="button" onClick={() => onInspectFromList(room.id, item.id)}>
                Inspect in room
              </button>
            </article>
          ))}
        </section>
      ))}
    </main>
  );
}
