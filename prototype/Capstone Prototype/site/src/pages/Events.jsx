import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { LayoutGrid, Map } from "lucide-react";
import { filterEvents } from "../utils/filters";
import EmptyState from "../components/EmptyState";
import NeighborhoodsMap from "../components/NeighborhoodsMap";
import FilterCard from "../components/FilterCard";
import EventCard from "../components/EventCard";
import { useUser } from "../context/UserContext";
import { useEvents } from "../hooks/useEvents";
import { trackAnalytic } from "../lib/events";

const DEFAULT_FILTERS = {
  neighborhoods: [],
  categories: [],
  dateFrom: null,
  dateTo: null,
  cost: "all",
  accessibility: [],
  keyword: "",
};

export default function Events() {
  const { user, bookmarkedEvents, toggleBookmark } = useUser();
  const { events, loading } = useEvents();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlKeyword = searchParams.get("q") || "";

  const [filters, setFilters] = useState(() => {
    const nbParam = searchParams.get("neighborhood");
    const costParam = searchParams.get("cost");
    return {
      ...DEFAULT_FILTERS,
      neighborhoods: nbParam ? [nbParam] : [],
      cost: costParam && ["free", "paid"].includes(costParam) ? costParam : "all",
    };
  });

  const [viewMode, setViewMode] = useState("card");
  const [mapSelectedNeighborhood, setMapSelectedNeighborhood] = useState("");

  const [likedEvents, setLikedEvents] = useState(() => {
    const saved = localStorage.getItem("likedEvents");
    return saved ? JSON.parse(saved) : {};
  });

  function toggleLike(eventId) {
    const newLiked = !likedEvents[eventId];
    const updated = { ...likedEvents, [eventId]: newLiked };
    setLikedEvents(updated);
    localStorage.setItem("likedEvents", JSON.stringify(updated));
    if (newLiked) {
      trackAnalytic(eventId, "like", user?.id ?? null);
    }
  }

  function getLikeCount(event) {
    const base = event.likes || 0;
    return likedEvents[event.id] ? base + 1 : base;
  }

  useEffect(() => {
    const nbParam = searchParams.get("neighborhood");
    const costParam = searchParams.get("cost");
    if (nbParam) {
      setFilters((f) => ({ ...f, neighborhoods: [nbParam] }));
    }
    if (costParam && ["free", "paid"].includes(costParam)) {
      setFilters((f) => ({ ...f, cost: costParam }));
    }
  }, []);

  const effectiveFilters = useMemo(
    () => ({ ...filters, keyword: urlKeyword }),
    [filters, urlKeyword],
  );

  const filteredEvents = useMemo(
    () => filterEvents(events, effectiveFilters),
    [events, effectiveFilters],
  );

  const activeCount = [
    filters.neighborhoods.length > 0,
    filters.categories.length > 0,
    filters.dateFrom,
    filters.dateTo,
    filters.cost !== "all",
    filters.accessibility.length > 0,
    urlKeyword.trim() !== "",
  ].filter(Boolean).length;

  function handleClear() {
    setFilters(DEFAULT_FILTERS);
    setSearchParams({});
  }

  const viewToggle = (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-2 flex gap-1.5">
      <button
        onClick={() => setViewMode("card")}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
          viewMode === "card"
            ? "bg-gray-900 text-white"
            : "text-gray-500 hover:bg-gray-50"
        }`}
      >
        <LayoutGrid size={14} />
        Card View
      </button>
      <button
        onClick={() => setViewMode("map")}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
          viewMode === "map"
            ? "bg-gray-900 text-white"
            : "text-gray-500 hover:bg-gray-50"
        }`}
      >
        <Map size={14} />
        Map View
      </button>
    </div>
  );

  return (
    <main className="bg-gray-50 min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {viewMode === "map" ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-6">
              <div className="w-72 shrink-0">{viewToggle}</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Browse Events</h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  {filteredEvents.length} event
                  {filteredEvents.length !== 1 ? "s" : ""} in the Greater Seattle Area
                  {activeCount > 0 && (
                    <button
                      onClick={handleClear}
                      className="ml-3 inline-flex items-center gap-1 text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
                      aria-label="Clear all filters"
                    >
                      × Clear {activeCount} filter{activeCount !== 1 ? "s" : ""}
                    </button>
                  )}
                </p>
              </div>
            </div>
            <NeighborhoodsMap
              events={filteredEvents}
              selectedNeighborhood={mapSelectedNeighborhood}
              onNeighborhoodClick={(name) =>
                setMapSelectedNeighborhood((prev) => (prev === name ? "" : name))
              }
              height={Math.round(window.innerHeight * 0.75 - 80)}
            />
          </div>
        ) : (
          <div className="flex gap-6 items-start">
            <aside className="w-72 shrink-0 sticky top-20 self-start flex flex-col gap-3">
              {viewToggle}
              <FilterCard
                filters={filters}
                onChange={setFilters}
                onClear={handleClear}
                heading="Browse Events"
              />
            </aside>

            <div className="flex-1 min-w-0">
              <div className="mb-5">
                <p className="text-gray-500 text-sm mt-0.5">
                  {filteredEvents.length} event
                  {filteredEvents.length !== 1 ? "s" : ""} in the Greater Seattle Area
                  {activeCount > 0 && (
                    <button
                      onClick={handleClear}
                      className="ml-3 inline-flex items-center gap-1 text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
                      aria-label="Clear all filters"
                    >
                      × Clear {activeCount} filter{activeCount !== 1 ? "s" : ""}
                    </button>
                  )}
                </p>
              </div>

              {loading ? (
                <div className="flex flex-col gap-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-[220px] bg-gray-200 animate-pulse rounded-2xl" />
                  ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="flex flex-col gap-4">
                  {filteredEvents.map((event) => (
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
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
