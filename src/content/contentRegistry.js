export const contentRegistry = {
  "intro-card": {
    id: "intro-card",
    type: "panel",
    title: "Tudor-Razvan Tatar",
    subtitle: "AI Engineer | Backend Engineer | Data & ML Engineer",
    body: [
      "Building production-ready systems from data ingestion to deployment.",
      "Use nav for direct sections, or walk and interact with in-room objects.",
      "Email: tudor_ph@yahoo.com",
    ],
  },
  "cv-preview": {
    id: "cv-preview",
    type: "pdfPreview",
    title: "CV Preview",
    pdfUrl: "/Tudor_CV.pdf",
    fallbackText: "If preview is unavailable, contact via email.",
  },
  "project-masters-thesis": {
    id: "project-masters-thesis",
    type: "projectOverlay",
    routeProjectId: "masters-thesis",
    title: "Master's Thesis",
    subtitle: "Research and implementation across AI systems engineering.",
    body: [
      "End-to-end thesis build from methodology through practical system evaluation.",
      "Focused on reproducibility, measurable performance, and deployment realism.",
    ],
  },
  "project-bo-audio": {
    id: "project-bo-audio",
    type: "projectOverlay",
    routeProjectId: "bo-audio-project",
    title: "B&O Audio Project",
    subtitle: "Signal processing and audio intelligence for product scenarios.",
    body: [
      "Explored extraction, modeling, and evaluation loops for audio features.",
      "Built tooling for iterative experiments and debugging.",
    ],
  },
  "project-dsb-signal": {
    id: "project-dsb-signal",
    type: "projectOverlay",
    routeProjectId: "dsb-railway-signal-detection",
    title: "DSB Railway Signal Detection",
    subtitle: "Computer vision pipeline for railway signal detection tasks.",
    body: [
      "Developed model training and deployment-ready inference paths.",
      "Focused on data quality, robustness, and practical edge cases.",
    ],
  },
  "project-acoustic-cnn": {
    id: "project-acoustic-cnn",
    type: "projectOverlay",
    routeProjectId: "acoustic-cnn-project",
    title: "Acoustic CNN project",
    subtitle: "Convolutional architecture for acoustic classification.",
    body: [
      "Designed feature transforms and CNN training loops for acoustic tasks.",
      "Benchmarked baseline and optimized variants for practical use.",
    ],
  },
  "project-redirected-walking": {
    id: "project-redirected-walking",
    type: "projectOverlay",
    routeProjectId: "redirected-walking",
    title: "Redirected Walking",
    subtitle: "Spatial interaction and locomotion mechanics experiments.",
    body: [
      "Investigated locomotion illusions and route redirection behavior.",
      "Prototyped and tuned simulation constraints for stable interaction.",
    ],
  },
  "project-gallery": {
    id: "project-gallery",
    type: "imageGallery",
    title: "Project Gallery",
    images: [
      { src: "/Generic_Home_1_Layer_1.png?v=16x16", alt: "Room layout concept" },
      { src: "/Generic_Home_1_Layer_2_.png?v=16x16", alt: "Foreground collision layer" },
      { src: "/Tudor_CV.png", alt: "Character sprite sheet" },
    ],
  },
  "project-pdf-preview": {
    id: "project-pdf-preview",
    type: "pdfPreview",
    title: "Project PDF Preview",
    pdfUrl: "/Tudor_CV.pdf",
    fallbackText: "If preview is unavailable, use project links in overlays.",
  },
  "experience-ledger": {
    id: "experience-ledger",
    type: "panel",
    title: "Experience Ledger",
    body: [
      "Experience across AI engineering, backend systems, and data workflows.",
      "Focus areas: reliable APIs, model serving, and production operations.",
    ],
  },
  "education-panel": {
    id: "education-panel",
    type: "panel",
    title: "Education Timeline",
    body: [
      "MSc in Computer Engineering with focus on AI, vision, and sound.",
      "Coursework and projects concentrated on practical, deployable systems.",
    ],
  },
  "about-notes": {
    id: "about-notes",
    type: "panel",
    title: "Tinkerer Notes",
    body: [
      "I enjoy building playful, interactive interfaces that still communicate clearly.",
      "This portfolio uses game mechanics as a navigation and storytelling layer.",
    ],
  },
  "contact-panel": {
    id: "contact-panel",
    type: "panel",
    title: "Contact",
    body: [
      "Email: tudor_ph@yahoo.com",
      "Use the doors in this room for LinkedIn and GitHub.",
    ],
  },
};

export const projectRouteToContentId = {
  "masters-thesis": "project-masters-thesis",
  "bo-audio-project": "project-bo-audio",
  "dsb-railway-signal-detection": "project-dsb-signal",
  "redirected-walking": "project-redirected-walking",
};
