export const contentRegistry = {
  "intro-card": {
    id: "intro-card",
    type: "panel",
    title: "Tudor-Razvan Tatar",
    subtitle: "AI Engineer | Backend Engineer | Data & ML Engineer",
    body: [
      "Building production-ready systems from data ingestion to deployment.",
      "Walk to the project desks in the Projects room and press E to read more.",
      "Email: tudor_ph@yahoo.com",
    ],
    links: [
      { href: "mailto:tudor_ph@yahoo.com", label: "Send email" },
    ],
  },
  "link-github": {
    id: "link-github",
    type: "panel",
    title: "GitHub",
    subtitle: "Code & Open Source",
    body: ["Browse my repositories, experiments and side projects."],
    links: [
      { href: "https://github.com/tudorpricop", label: "github.com/tudorpricop" },
    ],
  },
  "link-linkedin": {
    id: "link-linkedin",
    type: "panel",
    title: "LinkedIn",
    subtitle: "Professional Profile",
    body: ["Connect with me or view my full work history."],
    links: [
      { href: "https://linkedin.com/in/tudor-razvan-tatar", label: "linkedin.com/in/tudor-razvan-tatar" },
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
    title: "Master's Thesis",
    subtitle: "AI Systems Engineering — MSc Thesis",
    body: [
      "End-to-end thesis from methodology through practical system evaluation.",
      "Focused on reproducibility, measurable performance, and deployment realism.",
      "Covered data pipeline design, model training, and inference benchmarking.",
    ],
  },
  "project-bo-audio": {
    id: "project-bo-audio",
    type: "projectOverlay",
    title: "B&O Audio Project",
    subtitle: "Signal Processing & Audio Intelligence — Bang & Olufsen",
    body: [
      "Explored feature extraction, modeling, and evaluation loops for audio tasks.",
      "Built reusable tooling for iterative experiments and audio debugging.",
      "Worked with production-scale audio datasets and latency constraints.",
    ],
  },
  "project-dsb-signal": {
    id: "project-dsb-signal",
    type: "projectOverlay",
    title: "DSB Railway Signal Detection",
    subtitle: "Computer Vision Pipeline — DSB Railways",
    body: [
      "Built an end-to-end CV pipeline for detecting railway signals from video.",
      "Focused on data quality, real-world robustness, and practical edge cases.",
      "Developed training and deployment-ready inference paths for production use.",
    ],
  },
  "project-redirected-walking": {
    id: "project-redirected-walking",
    type: "projectOverlay",
    title: "Redirected Walking",
    subtitle: "Spatial Interaction & VR Locomotion Research",
    body: [
      "Investigated locomotion illusions and route redirection in virtual spaces.",
      "Prototyped and tuned simulation constraints for stable spatial interaction.",
      "Analysed perceptual thresholds and user study results.",
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
