// Image and clickable zones defined once — reused across all month cards
export const BULLETIN_IMAGE = "images/image 27.png";

export const bulletins = [
  { id: "nov-2025", month: "November 2025" },
  { id: "dec-2025", month: "December 2025" },
  { id: "jan-2026", month: "January 2026" },
  { id: "feb-2026", month: "February 2026" },
  { id: "mar-2026", month: "March 2026" },
  { id: "apr-2026", month: "April 2026" },
];

// Backward-compat alias
export const bulletin = bulletins.find(b => b.id === "mar-2026");
