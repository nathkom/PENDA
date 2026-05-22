import { useState, useRef, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { bulletins } from "../data/bulletin";

// ─── Clickable Overlay Zones ─────────────────────────────────────────────────
//
// All source images must be 2120 × 1196 px. pct() converts pixel coordinates
// measured on that canvas to %-based CSS so zones scale with the card.
//
// HOW TO MEASURE COORDINATES
//   1. Open the bulletin image in any editor (Figma, Preview, Paint).
//   2. Hover over the TOP-LEFT corner of the area you want clickable → note x1, y1.
//   3. Hover over the BOTTOM-RIGHT corner → note x2, y2.
//   4. Pass those four values to pct(x1, y1, x2, y2).
//
// HOW TO ADD A ZONE
//   1. Find (or add) the bulletin's id key in ZONES_BY_BULLETIN below.
//   2. Push a new object into that array:
//        { coords: pct(x1, y1, x2, y2), to: "/route-or-url", label: "Description" }
//      `to`    – any React Router path or query string (e.g. "/events?cost=free")
//      `label` – plain-English description used for accessibility / hover title
//
// HOW TO ADJUST A ZONE
//   Change the four numbers inside pct() for that entry. Increasing x2/y2 makes
//   the zone larger; shifting x1/y1 moves its top-left anchor.
//
// ─────────────────────────────────────────────────────────────────────────────

const MAP_W = 2120;
const MAP_H = 1196;

function pct(x1, y1, x2, y2) {
  return {
    left:   `${(x1         / MAP_W) * 100}%`,
    top:    `${(y1         / MAP_H) * 100}%`,
    width:  `${((x2 - x1) / MAP_W) * 100}%`,
    height: `${((y2 - y1) / MAP_H) * 100}%`,
  };
}

// Each key matches a bulletin `id` from data/bulletin.js.
// Bulletins with no entry here will simply have no clickable zones.
const ZONES_BY_BULLETIN = {

  // ── February 2026 ──────────────────────────────────────────────────────────
  "feb-2026": [
    { coords: pct(83, 650, 665,  1136), to: "", label: "Most Liked Space" },
    { coords:pct(143, 363, 619,  590), skew: "skewX(1deg)", to: "", label: "Explore spaces"  },
    { coords:pct(680, 540, 869,  670), rotate: "5deg",to: "", label: "Editor 1"  },
    { coords:pct(938, 560, 1125,  690), to: "", label: "Editor 2"  },
    { coords:pct(1190, 542, 1380,  670), rotate: "-6deg", to: "", label: "Editor 3"  },
    { coords: pct(1810, 215, 2049, 513),  rotate:"2deg", to: "", label: "Niche" },
    { coords: pct(1263, 770, 1795,  1156), to: "", label: "Sweet and Savory" },
    { coords: pct(1810, 526, 2052, 833), rotate:"-1deg",  to: "/events?cost=free", label: "Free" },
    { coords: pct(1810, 842, 2049, 1147), rotate:"1deg", to: "", label: "Community" },
  ],

  "mar-2026": [
    { coords: pct(83, 650, 665,  1136), to: "/spaces/4bb131b6-5131-4c67-a3c2-51d19a6cad10", label: "Most Liked Space" },
    { coords:pct(143, 363, 619,  590), skew: "skewX(1deg)", to: "", label: "Explore spaces"  },
    { coords:pct(680, 540, 869,  670), rotate: "5deg",to: "", label: "Editor 1"  },
    { coords:pct(938, 560, 1125,  690), to: "", label: "Editor 2"  },
    { coords:pct(1190, 542, 1380,  670), rotate: "-6deg", to: "", label: "Editor 3"  },
    { coords: pct(1810, 215, 2049, 513),  rotate:"2deg", to: "", label: "Niche" },
    { coords: pct(1263, 770, 1795,  1156), to: "", label: "Sweet and Savory" },
    { coords: pct(1810, 526, 2052, 833), rotate:"-1deg",  to: "/events?cost=free", label: "Free" },
    { coords: pct(1810, 842, 2049, 1147), rotate:"1deg", to: "", label: "Community" },
  ],
  "apr-2026": [
    { coords: pct(83, 650, 665,  1136), to: "", label: "Most Liked Space" },
    { coords:pct(143, 363, 619,  590), skew: "skewX(1deg)", to: "", label: "Explore spaces"  },
    { coords:pct(680, 540, 869,  670), rotate: "5deg",to: "", label: "Editor 1"  },
    { coords:pct(938, 560, 1125,  690), to: "", label: "Editor 2"  },
    { coords:pct(1190, 542, 1380,  670), rotate: "-6deg", to: "", label: "Editor 3"  },
    { coords: pct(1810, 215, 2049, 513),  rotate:"2deg", to: "", label: "Niche" },
    { coords: pct(1263, 770, 1795,  1156), to: "", label: "Sweet and Savory" },
    { coords: pct(1810, 526, 2052, 833), rotate:"-1deg",  to: "/events?cost=free", label: "Free" },
    { coords: pct(1810, 842, 2049, 1147), rotate:"1deg", to: "", label: "Community" },
  ],
  "may-2026": [
    { coords: pct(83, 650, 665,  1136), to: "", label: "Most Liked Space" },
    { coords:pct(143, 363, 619,  590), skew: "skewX(1deg)", to: "", label: "Explore spaces"  },
    { coords:pct(680, 540, 869,  670), rotate: "5deg",to: "", label: "Editor 1"  },
    { coords:pct(938, 560, 1125,  690), to: "", label: "Editor 2"  },
    { coords:pct(1190, 542, 1380,  670), rotate: "-6deg", to: "", label: "Editor 3"  },
    { coords: pct(1810, 215, 2049, 513),  rotate:"2deg", to: "", label: "Niche" },
    { coords: pct(1263, 770, 1795,  1156), to: "", label: "Sweet and Savory" },
    { coords: pct(1810, 526, 2052, 833), rotate:"-1deg",  to: "/events?cost=free", label: "Free" },
    { coords: pct(1810, 842, 2049, 1147), rotate:"1deg", to: "", label: "Community" },
  ],
  "jun-2026": [
    { coords: pct(83, 650, 665,  1136), to: "", label: "Most Liked Space" },
    { coords:pct(143, 363, 619,  590), skew: "skewX(1deg)", to: "", label: "Explore spaces"  },
    { coords:pct(680, 540, 869,  670), rotate: "5deg",to: "", label: "Editor 1"  },
    { coords:pct(938, 560, 1125,  690), to: "", label: "Editor 2"  },
    { coords:pct(1190, 542, 1380,  670), rotate: "-6deg", to: "", label: "Editor 3"  },
    { coords: pct(1810, 215, 2049, 513),  rotate:"2deg", to: "", label: "Niche" },
    { coords: pct(1263, 770, 1795,  1156), to: "", label: "Sweet and Savory" },
    { coords: pct(1810, 526, 2052, 833), rotate:"-1deg",  to: "/events?cost=free", label: "Free" },
    { coords: pct(1810, 842, 2049, 1147), rotate:"1deg", to: "", label: "Community" },
  ],
  "jul-2026": [
    { coords: pct(83, 650, 665,  1136), to: "", label: "Most Liked Space" },
    { coords:pct(143, 363, 619,  590), skew: "skewX(1deg)", to: "", label: "Explore spaces"  },
    { coords:pct(680, 540, 869,  670), rotate: "5deg",to: "", label: "Editor 1"  },
    { coords:pct(938, 560, 1125,  690), to: "", label: "Editor 2"  },
    { coords:pct(1190, 542, 1380,  670), rotate: "-6deg", to: "", label: "Editor 3"  },
    { coords: pct(1810, 215, 2049, 513),  rotate:"2deg", to: "", label: "Niche" },
    { coords: pct(1263, 770, 1795,  1156), to: "", label: "Sweet and Savory" },
    { coords: pct(1810, 526, 2052, 833), rotate:"-1deg",  to: "/events?cost=free", label: "Free" },
    { coords: pct(1810, 842, 2049, 1147), rotate:"1deg", to: "", label: "Community" },
  ],
};

// Card matches the navbar content column: max-w-7xl (1280px) minus px-4 (16px) each side
const NAVBAR_MAX_W = 1280;
const NAVBAR_PX    = 16;
const CARD_MAX_W   = NAVBAR_MAX_W - NAVBAR_PX * 2; // 1248px
const GAP = 24; // px between cards

const DEFAULT_INDEX = bulletins.findIndex(b => b.id === "feb-2026");

export default function BulletinBoard() {
  const [activeIndex, setActiveIndex] = useState(DEFAULT_INDEX >= 0 ? DEFAULT_INDEX : 0);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef(null);

  // useLayoutEffect fires before paint — avoids a flash of zero-width cards
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.offsetWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const cardWidth  = Math.min(containerWidth - NAVBAR_PX * 2, CARD_MAX_W);
  const cardHeight = cardWidth * (MAP_H / MAP_W);
  const peekOffset = (containerWidth - cardWidth) / 2; // centers card 0
  const translateX = peekOffset - activeIndex * (cardWidth + GAP);

  const goTo   = (i) => setActiveIndex(Math.max(0, Math.min(bulletins.length - 1, i)));
  const canPrev = activeIndex > 0;
  const canNext = activeIndex < bulletins.length - 1;

  return (
    <section className="pt-8 pb-4" aria-label="Bulletin Board of the Month">
      {/* Heading stays in the normal content column */}
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-5">
          📌 Bulletin Board of the Month
        </h2>
      </div>

      {/* Carousel viewport — full page width, no max-width */}
      <div ref={containerRef} className="overflow-hidden">
        <div
          className="flex items-start transition-transform duration-[420ms] ease-in-out"
          style={{ transform: `translateX(${translateX}px)`, gap: `${GAP}px` }}
        >
          {bulletins.map((b, i) => (
            <div
              key={b.id}
              style={{ width: `${cardWidth}px`, height: `${cardHeight}px`, flexShrink: 0 }}
              className={`transition-opacity duration-[420ms] ${
                i === activeIndex ? "opacity-100" : "opacity-50"
              }`}
            >
              <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg">
                <img
                  src={`${import.meta.env.BASE_URL}${b.image}`}
                  alt={`Bulletin Board — ${b.month}`}
                  className="w-full h-full object-cover block"
                  draggable={false}
                />

                {/* Clickable zones — only rendered on the active card */}
                {i === activeIndex && (ZONES_BY_BULLETIN[b.id] ?? []).map((zone) => (
                  <Link
                    key={zone.to}
                    to={zone.to}
                    aria-label={zone.label}
                    title={zone.label}
                    className="absolute rounded hover:ring-2 hover:ring-[#5F77A5] hover:bg-[#5F77A5]/10 transition-all duration-150"
                    style={{ ...zone.coords , transform: zone.skew ?? "none" , rotate: zone.rotate ?? "0deg"}}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      <div className="flex items-center justify-center gap-4 mt-5">
        <button
          onClick={() => goTo(activeIndex - 1)}
          disabled={!canPrev}
          aria-label="Previous bulletin"
          className="p-2 rounded-full border border-gray-300 text-gray-600 hover:border-[#5F77A5] hover:text-[#5F77A5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          onClick={() => goTo(activeIndex + 1)}
          disabled={!canNext}
          aria-label="Next bulletin"
          className="p-2 rounded-full border border-gray-300 text-gray-600 hover:border-[#5F77A5] hover:text-[#5F77A5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
}
