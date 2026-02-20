import { useSearchParams } from "react-router-dom";
import { ArrowLeft, MapPin, ArrowRight } from "lucide-react";
import { neighborhoods } from "../data/neighborhoods";
import { events } from "../data/events";
import EventCard from "../components/EventCard";
import EmptyState from "../components/EmptyState";

// ─── Neighborhood grid card ───────────────────────────────────────────────────
function NeighborhoodTile({ neighborhood, onClick }) {
  return (
    <button
      onClick={() => onClick(neighborhood.id)}
      className="group relative rounded-2xl overflow-hidden aspect-[4/3] w-full focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-offset-2"
      aria-label={`Explore ${neighborhood.name}`}
    >
      {/* Photo */}
      <img
        src={neighborhood.image_url}
        alt={neighborhood.name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Text overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h2 className="text-white text-xl font-bold leading-tight drop-shadow">
          {neighborhood.name}
        </h2>
        <p className="text-white/75 text-xs mt-0.5 font-medium">
          {neighborhood.descriptor}
        </p>
      </div>

      {/* Hover arrow */}
      <div className="absolute top-3 right-3 bg-white/0 group-hover:bg-white/20 rounded-full p-2 transition-all duration-300 opacity-0 group-hover:opacity-100">
        <ArrowRight size={16} className="text-white" aria-hidden="true" />
      </div>
    </button>
  );
}

// ─── Neighborhood detail view ─────────────────────────────────────────────────
function NeighborhoodDetail({ neighborhood, onBack }) {
  const neighborhoodEvents = events.filter(
    (e) => e.neighborhood === neighborhood.name
  );

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-700 transition-colors mb-6"
        aria-label="Back to all neighborhoods"
      >
        <ArrowLeft size={16} />
        All Neighborhoods
      </button>

      {/* Hero banner */}
      <div className="relative rounded-2xl overflow-hidden h-56 md:h-72 mb-8">
        <img
          src={neighborhood.image_url}
          alt={neighborhood.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full mb-2 border border-white/30">
            {neighborhood.descriptor}
          </span>
          <h1 className="text-white text-3xl md:text-4xl font-bold drop-shadow">
            {neighborhood.name}
          </h1>
        </div>
      </div>

      {/* Description + meta row */}
      <div className="flex flex-col md:flex-row md:items-start gap-6 mb-10">
        <p className="text-gray-600 leading-relaxed flex-1 text-base">
          {neighborhood.description}
        </p>
        <div className="shrink-0 flex items-center gap-2 text-sm text-green-700 font-semibold bg-green-50 border border-green-200 px-4 py-2 rounded-xl">
          <MapPin size={15} aria-hidden="true" />
          {neighborhoodEvents.length} event{neighborhoodEvents.length !== 1 ? "s" : ""} happening here
        </div>
      </div>

      {/* Event list */}
      {neighborhoodEvents.length === 0 ? (
        <EmptyState message="No events in this neighborhood right now. Check back soon!" />
      ) : (
        <div className="flex flex-col gap-4">
          {neighborhoodEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Neighborhoods() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("id");

  const selected = selectedId
    ? neighborhoods.find((n) => n.id === selectedId)
    : null;

  function handleSelect(id) {
    setSearchParams({ id });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Detail view ──
  if (selected) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <NeighborhoodDetail neighborhood={selected} onBack={handleBack} />
      </main>
    );
  }

  // ── Grid catalog ──
  return (
    <main className="max-w-7xl mx-auto px-4 py-10">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Explore Neighborhoods</h1>
        <p className="text-gray-500 mt-1.5 text-base">
          Discover community events in your corner of greater Seattle.
        </p>
      </div>

      {/* Neighborhood grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {neighborhoods.map((n) => (
          <NeighborhoodTile key={n.id} neighborhood={n} onClick={handleSelect} />
        ))}
      </div>

      {/* Footer hint */}
      <p className="text-center text-sm text-gray-400 mt-10">
        Click any neighborhood to browse its events
      </p>
    </main>
  );
}
