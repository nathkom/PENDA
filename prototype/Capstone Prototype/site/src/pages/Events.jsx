import { useState, useMemo, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Bookmark,
  CalendarPlus,
  Share2,
  Calendar,
  Clock,
  MapPin,
  LayoutGrid,
  Map,
} from "lucide-react";
import { events as staticEvents } from "../data/events";
import {
  filterEvents,
  NEIGHBORHOODS,
  CATEGORIES,
  ACCESSIBILITY_OPTIONS,
} from "../utils/filters";
import EmptyState from "../components/EmptyState";
import NeighborhoodsMap from "../components/NeighborhoodsMap";
import { useUser } from "../context/UserContext";

const COST_LABEL = {
  free: "Free",
  suggested_donation: "Fundraiser",
  paid: "Paid",
};

const CATEGORY_LABELS = {
  social: "Social",
  arts: "Arts & Culture",
  outdoors: "Outdoors",
  food: "Food & Drink",
  sports: "Sports & Fitness",
  educational: "Educational",
};

const DEFAULT_FILTERS = {
  neighborhoods: [],
  categories: [],
  dateFrom: null,
  dateTo: null,
  cost: "all",
  accessibility: [],
  keyword: "",
};

function formatDate(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Horizontal event card ────────────────────────────────────────────────────

function EventsListCard({
  event,
  liked,
  likeCount,
  onToggleLike,
  bookmarked,
  onToggleBookmark,
}) {
  const costLabel = event.cost === "suggested_donation"
    ? "Fundraiser"
    : event.cost_amount
      ? `${COST_LABEL[event.cost] || event.cost} · $${event.cost_amount}`
      : COST_LABEL[event.cost] || event.cost || "";

  const tags = [
    costLabel,
    CATEGORY_LABELS[event.category] || event.category,
    ...(event.tags?.slice(0, 2).map((t) => t.replace(/_/g, " ")) || []),
    ...(event.accessibility?.slice(0, 1).map((a) => a.replace(/_/g, " ")) ||
      []),
  ].filter(Boolean);

  return (
    <Link
      to={`/events/${event.id}`}
      className="block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group h-[220px]"
    >
      <div className="flex h-full">
        {/* Image — fixed width, fills full card height */}
        <div className="w-52 shrink-0 overflow-hidden">
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col min-w-0 overflow-hidden gap-1.5">
          {/* Title + like button */}
          <div className="flex items-start gap-2">
            <h2 className="flex-1 text-lg font-bold text-gray-900 leading-tight line-clamp-1">
              {event.title}
            </h2>
            <button
              className={`shrink-0 flex items-center gap-1 transition-colors ${
                liked ? "text-red-500" : "text-gray-300 hover:text-red-400"
              }`}
              onClick={(e) => {
                e.preventDefault();
                onToggleLike?.(event.id);
              }}
              aria-label={liked ? "Unlike event" : "Like event"}
            >
              ❤️ <span className="text-xs text-gray-500">{likeCount ?? 0}</span>
            </button>
          </div>

          {/* Meta — single row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
            {event.date && (
              <span className="flex items-center gap-1">
                <Calendar size={11} className="text-[#97BFFF] shrink-0" />
                {formatDate(event.date)}
              </span>
            )}
            {event.time && (
              <span className="flex items-center gap-1">
                <Clock size={11} className="text-[#FFA86C] shrink-0" />
                {event.time}
              </span>
            )}
            {event.space_name && (
              <span className="flex items-center gap-1 truncate">
                <MapPin size={11} className="text-[#FD858A] shrink-0" />
                <span className="truncate">{event.space_name}, Seattle</span>
              </span>
            )}
          </div>

          {/* Description — max 3 lines */}
          {event.description && (
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
              {event.description}
            </p>
          )}

          {/* Tags + action buttons — pushed to bottom */}
          <div className="flex items-center justify-between mt-auto gap-2">
            <div className="flex flex-wrap gap-1 min-w-0 overflow-hidden">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-sm px-3 py-1 rounded-full border border-green-300 text-green-700 capitalize whitespace-nowrap"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Action buttons */}
            <div
              className="flex gap-1 shrink-0"
              onClick={(e) => e.preventDefault()}
            >
              <button
                onClick={() => onToggleBookmark?.(event.id)}
                className={`p-2.5 rounded-lg border transition-colors ${
                  bookmarked
                    ? "border-[#9FB366] text-[#9FB366] bg-green-50"
                    : "border-gray-200 hover:border-[#9FB366] hover:text-[#9FB366] text-gray-500"
                }`}
                aria-label={bookmarked ? "Remove bookmark" : "Save event"}
              >
                <Bookmark size={16} />
              </button>
              <button
                className="p-2.5 rounded-lg border border-gray-200 hover:border-[#9FB366] hover:text-[#9FB366] text-gray-500 transition-colors"
                aria-label="Add to calendar"
              >
                <CalendarPlus size={16} />
              </button>
              <button
                className="p-2.5 rounded-lg border border-gray-200 hover:border-[#9FB366] hover:text-[#9FB366] text-gray-500 transition-colors"
                aria-label="Share event"
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Filter sidebar ───────────────────────────────────────────────────────────

function FilterSidebar({ filters, onChange }) {
  function toggleArray(key, value) {
    onChange((f) => {
      const current = f[key];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...f, [key]: next };
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-5">
        Filters
      </h2>

      {/* Event Type */}
      <fieldset className="mb-5">
        <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Event Type
        </legend>
        <div className="flex flex-col gap-2">
          {CATEGORIES.map((cat) => (
            <label
              key={cat.id}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filters.categories.includes(cat.id)}
                onChange={() => toggleArray("categories", cat.id)}
                className="w-4 h-4 rounded accent-green-700"
              />
              <span className="text-sm text-gray-700">{cat.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="h-px bg-gray-100 mb-5" />

      {/* Neighborhood */}
      <div className="mb-5">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-3">
          Neighborhood
        </label>
        <select
          value={filters.neighborhoods[0] ?? ""}
          onChange={(e) =>
            onChange((f) => ({
              ...f,
              neighborhoods: e.target.value ? [e.target.value] : [],
            }))
          }
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Neighborhoods</option>
          {NEIGHBORHOODS.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </div>

      <div className="h-px bg-gray-100 mb-5" />

      {/* Date Range */}
      <div className="mb-5">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-3">
          Date Range
        </label>
        <div className="flex flex-col gap-2">
          <input
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(e) =>
              onChange((f) => ({ ...f, dateFrom: e.target.value || null }))
            }
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(e) =>
              onChange((f) => ({ ...f, dateTo: e.target.value || null }))
            }
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div className="h-px bg-gray-100 mb-5" />

      {/* Price */}
      <div className="mb-5">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-3">
          Price
        </label>
        <div className="flex flex-col gap-2">
          {[
            ["all", "All"],
            ["free", "Free only"],
            ["paid", "Paid only"],
          ].map(([val, label]) => (
            <label
              key={val}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <input
                type="radio"
                name="cost-filter"
                value={val}
                checked={filters.cost === val}
                onChange={() => onChange((f) => ({ ...f, cost: val }))}
                className="w-4 h-4 accent-green-700"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="h-px bg-gray-100 mb-5" />

      {/* Accessibility */}
      <fieldset>
        <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Accessibility
        </legend>
        <div className="flex flex-col gap-2">
          {ACCESSIBILITY_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filters.accessibility.includes(opt.id)}
                onChange={() => toggleArray("accessibility", opt.id)}
                className="w-4 h-4 rounded accent-green-700"
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Events() {
  const {
    createdEvents,
    deletedEventIds,
    editedEvents,
    bookmarkedEvents,
    toggleBookmark,
    attendingEvents,
  } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();

  // Keyword comes from NavBar via URL param ?q=
  const urlKeyword = searchParams.get("q") || "";

  const events = useMemo(() => {
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

  const [filters, setFilters] = useState(() => {
    const nbParam = searchParams.get("neighborhood");
    return {
      ...DEFAULT_FILTERS,
      neighborhoods: nbParam ? [nbParam] : [],
    };
  });

  const [viewMode, setViewMode] = useState("card"); // "card" | "map"
  const [mapSelectedNeighborhood, setMapSelectedNeighborhood] = useState("");

  const [likedEvents, setLikedEvents] = useState(() => {
    const saved = localStorage.getItem("likedEvents");
    return saved ? JSON.parse(saved) : {};
  });

  function toggleLike(eventId) {
    const updated = { ...likedEvents, [eventId]: !likedEvents[eventId] };
    setLikedEvents(updated);
    localStorage.setItem("likedEvents", JSON.stringify(updated));
  }

  function getLikeCount(event) {
    const base = event.likes || 0;
    return likedEvents[event.id] ? base + 1 : base;
  }

  // Sync neighborhood from URL on external navigation (e.g. from Neighborhoods page)
  useEffect(() => {
    const nbParam = searchParams.get("neighborhood");
    if (nbParam) {
      setFilters((f) => ({ ...f, neighborhoods: [nbParam] }));
    }
  }, []);

  // Effective filters merges local state + URL keyword
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

  return (
    <main className="bg-gray-50 min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-6 items-start">
          {/* ── Left sidebar ── */}
          <aside className="w-64 shrink-0 sticky top-20 self-start flex flex-col gap-3">
            {/* Card / Map view toggle */}
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

            {/* Filters */}
            <FilterSidebar filters={filters} onChange={setFilters} />
          </aside>

          {/* ── Event list ── */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="mb-5">
              <h1 className="text-2xl font-bold text-gray-900">
                Browse Events
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {filteredEvents.length} event
                {filteredEvents.length !== 1 ? "s" : ""} in the Greater Seattle
                Area
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

            {viewMode === "map" ? (
              <NeighborhoodsMap
                events={filteredEvents}
                selectedNeighborhood={mapSelectedNeighborhood}
                onNeighborhoodClick={(name) =>
                  setMapSelectedNeighborhood((prev) => (prev === name ? "" : name))
                }
                height={Math.round(window.innerHeight * 0.7 - 126)}
              />
            ) : filteredEvents.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex flex-col gap-4">
                {filteredEvents.map((event) => (
                  <EventsListCard
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
      </div>
    </main>
  );
}
