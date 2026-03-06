import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { neighborhoods } from "../data/neighborhoods";
import { events as staticEvents } from "../data/events";
import { useUser } from "../context/UserContext";
import EventCard from "../components/EventCard";
import EmptyState from "../components/EmptyState";

// ─── Neighborhood grid card ───────────────────────────────────────────────────
function NeighborhoodTile({ neighborhood, onClick }) {
  return (
    <button
      onClick={() => onClick(neighborhood.id)}
      className="group flex flex-col items-center w-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded-[28px]"
      aria-label={`Explore ${neighborhood.name}`}
    >
      {/* Image with large rounded corners and wavy cookie-cutout bottom edge */}
      <div className="relative w-full rounded-[28px] overflow-hidden aspect-square">
        <img
          src={neighborhood.image_url}
          alt={neighborhood.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        {/* Wavy SVG overlay cuts into the bottom of the image */}
        <svg
          className="absolute bottom-0 left-0 w-full h-10"
          viewBox="0 0 400 40"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,20 Q100,0 200,20 Q300,40 400,20 L400,40 L0,40 Z"
            fill="#f9fafb"
          />
        </svg>
      </div>

      {/* Name below the card */}
      <h2 className="mt-3 text-base font-semibold text-gray-900 group-hover:text-[#9FB366] transition-colors text-center">
        {neighborhood.name}
      </h2>
    </button>
  );
}

// ─── Neighborhood detail view ─────────────────────────────────────────────────
function NeighborhoodDetail({
  neighborhood,
  onBack,
  allEvents,
  bookmarkedEvents,
  toggleBookmark,
}) {
  const neighborhoodEvents = allEvents.filter(
    (e) => e.neighborhood === neighborhood.name,
  );

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#9FB366] transition-colors mb-6"
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
          {neighborhoodEvents.length} event
          {neighborhoodEvents.length !== 1 ? "s" : ""} happening here
        </div>
      </div>

      {/* Event list */}
      {neighborhoodEvents.length === 0 ? (
        <EmptyState message="No events in this neighborhood right now. Check back soon!" />
      ) : (
        <div className="flex flex-col gap-4">
          {neighborhoodEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              bookmarked={bookmarkedEvents?.has(event.id)}
              onToggleBookmark={toggleBookmark}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Neighborhoods() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    createdEvents,
    deletedEventIds,
    editedEvents,
    bookmarkedEvents,
    toggleBookmark,
    attendingEvents,
  } = useUser();
  const selectedId = searchParams.get("id");

  const allEvents = useMemo(() => {
    const merged = [...createdEvents, ...staticEvents];
    const filtered = merged.filter((e) => !deletedEventIds.has(e.id));
    return filtered
      .map((e) => (editedEvents[e.id] ? { ...e, ...editedEvents[e.id] } : e))
      .filter(
        (e) =>
          !e.attending_limit ||
          (e.attending_count || 0) + (attendingEvents.has(e.id) ? 1 : 0) < e.attending_limit,
      );
  }, [createdEvents, deletedEventIds, editedEvents, attendingEvents]);

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
        <NeighborhoodDetail
          neighborhood={selected}
          onBack={handleBack}
          allEvents={allEvents}
          bookmarkedEvents={bookmarkedEvents}
          toggleBookmark={toggleBookmark}
        />
      </main>
    );
  }

  // ── Grid catalog ──
  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Explore Neighborhoods
          </h1>
          <p className="text-gray-500 mt-1.5 text-base">
            Discover community events in your corner of Greater Seattle Area.
          </p>
        </div>

        {/* Neighborhood grid — 3 per row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {neighborhoods.map((n) => (
            <NeighborhoodTile
              key={n.id}
              neighborhood={n}
              onClick={handleSelect}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
