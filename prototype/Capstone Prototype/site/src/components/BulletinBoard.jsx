import { useState, useRef, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { bulletins } from "../data/bulletin";

// Clickable zone coords generated for a 2120 × 1196 image
const MAP_W = 2120;
const MAP_H = 1196;

function pct(x, y, x2, y2) {
  return {
    left:   `${(x        / MAP_W) * 100}%`,
    top:    `${(y        / MAP_H) * 100}%`,
    width:  `${((x2 - x) / MAP_W) * 100}%`,
    height: `${((y2 - y) / MAP_H) * 100}%`,
  };
}

const ZONES = [
  { coords: pct(83,   638, 665,  1136), to: "/events/evt-051",                   label: "Most Liked Space: Cafe Matcha Place" },
  { coords: pct(1797, 201, 2039, 501),  to: "/events?neighborhood=capitol-hill", label: "Capitol Hill events" },
  { coords: pct(1797, 536, 2039, 813),  to: "/events?cost=free",                 label: "Free events" },
  { coords: pct(1797, 830, 2039, 1138), to: "/events?cost=paid",                 label: "Paid events" },
];

// Active card is 55% of the full-width viewport; ~22% of each adjacent card is visible
const CARD_RATIO = 0.55;
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

  const cardWidth  = containerWidth * CARD_RATIO;
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

                {/* Clickable zones — only active on the current card */}
                {i === activeIndex && ZONES.map((zone) => (
                  <Link
                    key={zone.to}
                    to={zone.to}
                    aria-label={zone.label}
                    className="absolute rounded hover:ring-2 hover:ring-[#5F77A5] hover:bg-[#5F77A5]/10 transition-all duration-150"
                    style={{ ...zone.coords }}
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
