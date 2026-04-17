export const bulletins = [
  { id: "feb-2026", month: "February 2026", image: "images/feb-bulletin.png" },
  { id: "mar-2026", month: "March 2026",    image: "images/march-bulletin.png" },
  { id: "apr-2026", month: "April 2026",    image: "images/april-bulletin.png" },
  { id: "may-2026", month: "May 2026",      image: "images/may-bulletin.png" },
];

// Backward-compat alias
export const bulletin = bulletins.find(b => b.id === "mar-2026");
