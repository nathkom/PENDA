import { useState, useMemo } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { events as staticEvents } from "../data/events";
import { useUser } from "../context/UserContext";
import { filterEvents } from "../utils/filters";
import BulletinBoard from "../components/BulletinBoard";
import FilterCard from "../components/FilterCard";
import EventCard from "../components/EventCard";
import EmptyState from "../components/EmptyState";

const DEFAULT_FILTERS = {
  neighborhoods: [],
  categories: [],
  dateFrom: null,
  dateTo: null,
  cost: "all",
  accessibility: [],
  keyword: ""
};

export default function Home() {
  // ===== Like + Ranking State =====
const [sortType, setSortType] = useState("default");

const [likedEvents, setLikedEvents] = useState(() => {
  const saved = localStorage.getItem("likedEvents");
  return saved ? JSON.parse(saved) : {};
});

const toggleLike = (eventId) => {
  const updated = {
    ...likedEvents,
    [eventId]: !likedEvents[eventId],
  };

  setLikedEvents(updated);
  localStorage.setItem("likedEvents", JSON.stringify(updated));
};

const getLikeCount = (event) => {
  const base = event.likes || 0;
  return likedEvents[event.id] ? base + 1 : base;
};
  const { user, createdEvents, deletedEventIds, editedEvents, bookmarkedEvents, toggleBookmark, attendingEvents } = useUser();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const allEvents = useMemo(() => {
    const merged = [...createdEvents, ...staticEvents];
    const filtered = merged.filter((e) => !deletedEventIds.has(e.id));
    return filtered
      .map((e) => editedEvents[e.id] ? { ...e, ...editedEvents[e.id] } : e)
      .filter((e) => !e.attending_limit || (e.attending_count || 0) + (attendingEvents.has(e.id) ? 1 : 0) < e.attending_limit);
  }, [createdEvents, deletedEventIds, editedEvents]);

  const filteredEvents = useMemo(
    () => filterEvents(allEvents, filters),
    [allEvents, filters]
  );
  let displayedEvents = [...filteredEvents];

if (sortType === "mostLiked") {
  displayedEvents.sort(
    (a, b) => getLikeCount(b) - getLikeCount(a)
  );
}

  function handleClear() {
    setFilters(DEFAULT_FILTERS);
  }

  return (
    <main>
      {/* Section A — Bulletin Board */}
      <BulletinBoard />

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Section B — Event Feed */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Feed header */}
<div className="flex items-center justify-between mb-6">
  <h2 className="text-2xl font-bold text-gray-900">
    {user ? "Your Feed" : "Upcoming Events"}
  </h2>

  <div className="flex items-center gap-3">
    <select
      value={sortType}
      onChange={(e) => setSortType(e.target.value)}
      className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
    >
      <option value="default">Default</option>
      <option value="mostLiked">Most Liked</option>
    </select>

    <button
      className="md:hidden flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-green-500 transition-colors"
      onClick={() => setMobileFilterOpen(true)}
      aria-label="Open filters"
    >
      <SlidersHorizontal size={16} />
      Filters
    </button>
  </div>
</div>
        


        

        <div className="flex gap-6 items-start">
          {/* Sticky sidebar filter — desktop */}
          <aside className="hidden md:block w-64 shrink-0 sticky top-20 self-start">
            <FilterCard
              filters={filters}
              onChange={setFilters}
              onClear={handleClear}
            />
          </aside>

          {/* Event list */}
          <section className="flex-1 min-w-0" aria-label="Event feed">
            {filteredEvents.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex flex-col gap-4">
               {displayedEvents.map((event) => (
  <EventCard
    key={event.id}
    event={event}
    liked={likedEvents[event.id]}
    likeCount={getLikeCount(event)}
    onToggleLike={toggleLike}
    bookmarked={bookmarkedEvents.has(event.id)}
    onToggleBookmark={toggleBookmark}
  />
))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFilterOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          role="dialog"
          aria-modal="true"
          aria-label="Filter events"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileFilterOpen(false)}
          />
          {/* Drawer */}
          <div className="relative w-full bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filters</h3>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100"
                aria-label="Close filters"
              >
                <X size={20} />
              </button>
            </div>
            <FilterCard
              filters={filters}
              onChange={setFilters}
              onClear={handleClear}
            />
            <button
              onClick={() => setMobileFilterOpen(false)}
              className="mt-4 w-full bg-[#9FB366] text-white py-3 rounded-xl font-semibold hover:bg-[#8a9c57] transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
