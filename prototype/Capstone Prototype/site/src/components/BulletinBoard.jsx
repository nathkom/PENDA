import { Link } from "react-router-dom";

// Image map coords were generated for a 2120 x 1196 display.
// Each clickable zone is expressed as percentages of those dimensions.
const MAP_W = 2120;
const MAP_H = 1196;

function pct(x, y, x2, y2) {
  return {
    left:   `${(x  / MAP_W) * 100}%`,
    top:    `${(y  / MAP_H) * 100}%`,
    width:  `${((x2 - x) / MAP_W) * 100}%`,
    height: `${((y2 - y) / MAP_H) * 100}%`,
  };
}

const ZONES = [
  // Most liked space → dessert workshop event
  { coords: pct(83, 638, 665, 1136),   to: "/events/evt-051",                   label: "Most Liked Space: Cafe Matcha Place" },
  // Top polaroid → Capitol Hill events
  { coords: pct(1797, 201, 2039, 501),  to: "/events?neighborhood=capitol-hill", label: "Capitol Hill events" },
  // Middle polaroid → free events
  { coords: pct(1797, 536, 2039, 813),  to: "/events?cost=free",                 label: "Free events" },
  // Bottom polaroid → paid events
  { coords: pct(1797, 830, 2039, 1138), to: "/events?cost=paid",                 label: "Paid events" },
];

export default function BulletinBoard() {
  return (
    <section className="py-8" aria-label="Bulletin Board of the Month">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-5">
          📌 Bulletin Board of the Month
        </h2>
        <div className="flex justify-center">
          <div className="relative w-full">
            <img
              src={`${import.meta.env.BASE_URL}images/image 27.png`}
              alt="Bulletin Board of the Month"
              className="w-full rounded-2xl shadow-lg block"
            />
            {ZONES.map((zone) => (
              <Link
                key={zone.to}
                to={zone.to}
                aria-label={zone.label}
                className="absolute rounded hover:ring-2 hover:ring-[#5F77A5] hover:bg-[#5F77A5]/10 transition-all duration-150 cursor-pointer"
                style={{ ...zone.coords }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
