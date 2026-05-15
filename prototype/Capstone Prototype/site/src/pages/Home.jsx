import { useState, useMemo, useEffect } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useUser } from "../context/UserContext";
import { useEvents } from "../hooks/useEvents";
import { trackAnalytic } from "../lib/events";
import { filterEvents } from "../utils/filters";
import BulletinBoard from "../components/BulletinBoard";
import FilterCard from "../components/FilterCard";
import EventCard from "../components/EventCard";
import EmptyState from "../components/EmptyState";
import NeighborhoodCarousel from "../components/NeighborhoodCarousel";
import headerBg from "../../wireframes/headerbackground1.png";

const ITEMS_PER_PAGE = 15;

const DEFAULT_FILTERS = {
  neighborhoods: [],
  categories: [],
  dateFrom: null,
  dateTo: null,
  cost: "all",
  accessibility: [],
  keyword: "",
};

export default function Home() {
  // ===== Like + Ranking State =====
  const [sortType, setSortType] = useState("default");

  const [likedEvents, setLikedEvents] = useState(() => {
    const saved = localStorage.getItem("likedEvents");
    return saved ? JSON.parse(saved) : {};
  });

  const toggleLike = (eventId) => {
    const newLiked = !likedEvents[eventId];
    const updated = {
      ...likedEvents,
      [eventId]: newLiked,
    };

    setLikedEvents(updated);
    localStorage.setItem("likedEvents", JSON.stringify(updated));

    if (newLiked) {
      trackAnalytic(eventId, "like", user?.id ?? null);
    }
  };

  const getLikeCount = (event) => {
    const base = event.likes || 0;
    return likedEvents[event.id] ? base + 1 : base;
  };
  const { user, bookmarkedEvents, toggleBookmark } = useUser();
  const { events: allEvents, loading } = useEvents();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const filteredEvents = useMemo(
    () => filterEvents(allEvents, filters),
    [allEvents, filters],
  );

  const sortedEvents = useMemo(() => {
    const sorted = [...filteredEvents];
    if (sortType === "mostLiked") {
      sorted.sort((a, b) => getLikeCount(b) - getLikeCount(a));
    }
    return sorted;
  }, [filteredEvents, sortType, likedEvents]);

  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);

  // Reset to first page whenever filters or sort order change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [filters, sortType]);

  const displayedEvents = sortedEvents.slice(0, displayCount);
  const hasMore = displayCount < sortedEvents.length;
  const remaining = sortedEvents.length - displayCount;

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
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-8">
        {/* Feed header — mobile only */}
        <div className="flex items-center justify-between mb-4 md:hidden">
          <h2 className="text-2xl font-bold text-gray-900">Your Feed</h2>
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
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-green-500 transition-colors"
              onClick={() => setMobileFilterOpen(true)}
              aria-label="Open filters"
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>
          </div>
        </div>

        <div className="flex gap-6 items-start">
          {/* Sidebar filter — desktop */}
          <aside className="hidden md:block w-72 shrink-0 sticky top-20 self-start">
            <FilterCard
              filters={filters}
              onChange={setFilters}
              onClear={handleClear}
              heading="Your Feed"
            />
          </aside>

          {/* Event list */}
          <section className="flex-1 min-w-0" aria-label="Event feed">
            {/* Desktop: banner + sort */}
            <div className="hidden md:flex items-center justify-between mb-4">
              <div
                className="w-1/2 flex items-center px-8 py-4 rounded-xl overflow-hidden"
                style={{
                  backgroundImage: `url(${headerBg})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <h2 className="text-3xl font-bold text-black">
                  Find your third space
                </h2>
              </div>
              <select
                value={sortType}
                onChange={(e) => setSortType(e.target.value)}
                className="shrink-0 border border-gray-300 rounded-lg px-3 py-1 text-sm"
              >
                <option value="default">Sort: Recommended</option>
                <option value="mostLiked">Most Liked</option>
              </select>
            </div>

            {loading ? (
              <div className="flex flex-col gap-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-36 bg-gray-200 animate-pulse rounded-2xl"
                  />
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
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

                {/* Pagination footer */}
                {hasMore ? (
                  <div className="flex justify-center pt-4 pb-2">
                    <button
                      onClick={() => setDisplayCount((c) => c + ITEMS_PER_PAGE)}
                      className="px-8 py-3 bg-[#F5F0E8] text-gray-700 font-semibold rounded-xl border border-gray-400 hover:border-gray-500 hover:bg-[#ede8de] active:scale-95 transition-all shadow-sm"
                    >
                      Show more
                    </button>
                  </div>
                ) : sortedEvents.length > ITEMS_PER_PAGE ? (
                  <p className="text-center text-sm text-gray-400 pt-4 pb-2">
                    You've seen all {sortedEvents.length} events
                  </p>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Section C — Neighborhood carousel */}
      <NeighborhoodCarousel />

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
