import React from "react";

const overlayStyle = {
  position: "absolute",
  inset: 0,
  zIndex: 40,
  background: "rgba(2, 6, 10, 0.75)",
  display: "grid",
  placeItems: "center",
  padding: 16,
};

const panelStyle = {
  width: "min(880px, 96vw)",
  maxHeight: "88vh",
  overflow: "auto",
  border: "4px solid #2a5132",
  background: "linear-gradient(180deg, rgba(18,40,26,0.98), rgba(8,19,13,0.98))",
  color: "#e7f5d0",
  boxShadow: "0 0 0 3px #99c886, 0 14px 28px rgba(0,0,0,0.55)",
  padding: 18,
  imageRendering: "pixelated",
};

const closeBtnStyle = {
  border: "2px solid #87b66f",
  background: "#2f6238",
  color: "#f3fbe8",
  padding: "7px 14px",
  fontFamily: '"Courier New", monospace',
  fontWeight: 700,
  cursor: "pointer",
};

const renderContentByType = (content) => {
  if (!content) return null;

  if (content.type === "imageGallery") {
    return (
      <div className="overlay-gallery">
        {(content.images || []).map((img) => (
          <figure key={img.src}>
            <img src={img.src} alt={img.alt || "gallery image"} />
            {img.alt ? <figcaption>{img.alt}</figcaption> : null}
          </figure>
        ))}
      </div>
    );
  }

  if (content.type === "pdfPreview") {
    return (
      <div className="overlay-pdf">
        <iframe title={content.title} src={content.pdfUrl} />
        <p>{content.fallbackText}</p>
      </div>
    );
  }

  return (
    <div className="overlay-text">
      {(content.body || []).map((line) => (
        <p key={line}>{line}</p>
      ))}
      {(content.links || []).length ? (
        <div className="overlay-links">
          {content.links.map((link) => (
            <a key={link.href + link.label} href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default function OverlayManager({ content, onClose }) {
  if (!content) return null;

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label={content.title}>
      <div style={panelStyle}>
        <div className="overlay-header">
          <div>
            <h2>{content.title}</h2>
            {content.subtitle ? <p>{content.subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} style={closeBtnStyle}>
            Close
          </button>
        </div>

        {renderContentByType(content)}
      </div>
    </div>
  );
}
