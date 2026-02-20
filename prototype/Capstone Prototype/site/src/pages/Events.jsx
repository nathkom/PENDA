import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { events } from "../data/events";
import {
  filterEvents,
  NEIGHBORHOODS,
  CATEGORIES,
  ACCESSIBILITY_OPTIONS,
} from "../utils/filters";
import EventCard from "../components/EventCard";
import EmptyState from "../components/EmptyState";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => {
    // Pre-apply neighborhood from query param (e.g. from Neighborhoods page)
    const nbParam = searchParams.get("neighborhood");
    return {
      ...DEFAULT_FILTERS,
      neighborhoods: nbParam ? [nbParam] : [],
    };
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Sync URL param → filter when param changes externally
  useEffect(() => {
    const nbParam = searchParams.get("neighborhood");
    if (nbParam) {
      setFilters((f) => ({ ...f, neighborhoods: [nbParam] }));
    }
  }, []);

  const filteredEvents = useMemo(
    () => filterEvents(events, filters),
    [filters],
  );

  const activeCount = [
    filters.neighborhoods.length > 0,
    filters.categories.length > 0,
    filters.dateFrom,
    filters.dateTo,
    filters.cost !== "all",
    filters.accessibility.length > 0,
    filters.keyword.trim() !== "",
  ].filter(Boolean).length;

  function handleClear() {
    setFilters(DEFAULT_FILTERS);
    setSearchParams({});
  }

  function toggleArray(key, value) {
    setFilters((f) => {
      const current = f[key];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...f, [key]: next };
    });
  }

  return (
    <main className="bg-gray-50 min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Browse Events</h1>
          <p className="text-gray-500 mt-1">
            {filteredEvents.length} event
            {filteredEvents.length !== 1 ? "s" : ""} in the Greater Seattle Area
            {activeCount > 0 && (
              <button
                onClick={handleClear}
                className="ml-3 inline-flex items-center gap-1 text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
                aria-label="Clear all filters"
              >
                <X size={13} />
                Clear {activeCount} filter{activeCount !== 1 ? "s" : ""}
              </button>
            )}
          </p>
        </div>

        {/* ── Filter bar ── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-end">
          {/* Keyword search */}
          <div className="flex-1 min-w-48">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
              Search
            </label>
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Events, venues, tags…"
                value={filters.keyword}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, keyword: e.target.value }))
                }
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label="Search events"
              />
            </div>
          </div>

          {/* Neighborhood */}
          <div className="min-w-44">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
              Neighborhood
            </label>
            <select
              value={filters.neighborhoods[0] ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  neighborhoods: e.target.value ? [e.target.value] : [],
                }))
              }
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label="Filter by neighborhood"
            >
              <option value="">All Neighborhoods</option>
              {NEIGHBORHOODS.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cost */}
          <div className="min-w-36">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
              Price
            </label>
            <select
              value={filters.cost}
              onChange={(e) =>
                setFilters((f) => ({ ...f, cost: e.target.value }))
              }
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label="Filter by price"
            >
              <option value="all">Any price</option>
              <option value="free">Free only</option>
              <option value="paid">Paid only</option>
            </select>
          </div>

          {/* Date from */}
          <div className="min-w-36">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
              From
            </label>
            <input
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, dateFrom: e.target.value || null }))
              }
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label="Start date"
            />
          </div>

          {/* Date to */}
          <div className="min-w-36">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
              To
            </label>
            <input
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, dateTo: e.target.value || null }))
              }
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label="End date"
            />
          </div>

          {/* More filters toggle */}
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
              drawerOpen ||
              filters.categories.length > 0 ||
              filters.accessibility.length > 0
                ? "border-green-500 text-green-700 bg-green-50"
                : "border-gray-200 text-gray-600 hover:border-green-400"
            }`}
            aria-expanded={drawerOpen}
            aria-label="Toggle more filters"
          >
            <SlidersHorizontal size={15} />
            More filters
            {filters.categories.length + filters.accessibility.length > 0 && (
              <span className="bg-green-700 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {filters.categories.length + filters.accessibility.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Expanded filter drawer (category + accessibility) ── */}
        {drawerOpen && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 flex flex-col md:flex-row gap-6">
            {/* Category chips */}
            <fieldset className="flex-1">
              <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Category
              </legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const active = filters.categories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleArray("categories", cat.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        active
                          ? "bg-green-700 text-white border-green-700"
                          : "bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-700"
                      }`}
                      aria-pressed={active}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Accessibility */}
            <fieldset className="flex-1">
              <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Accessibility
              </legend>
              <div className="flex flex-wrap gap-2">
                {ACCESSIBILITY_OPTIONS.map((opt) => {
                  const active = filters.accessibility.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleArray("accessibility", opt.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        active
                          ? "bg-green-700 text-white border-green-700"
                          : "bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-700"
                      }`}
                      aria-pressed={active}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        )}

        {/* ── Event grid ── */}
        {filteredEvents.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} variant="grid" />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
