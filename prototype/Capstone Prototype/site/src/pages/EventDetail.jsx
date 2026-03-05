import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Bookmark,
  CalendarPlus,
  Share2,
} from "lucide-react";
import { events as staticEvents } from "../data/events";
import EventCard from "../components/EventCard";
import EventGallery from "../components/EventGallery";
import AccessibilityTags from "../components/AccessibilityTags";
import { useUser } from "../context/UserContext";

const CATEGORY_LABELS = {
  social: "Social",
  arts: "Arts & Culture",
  outdoors: "Outdoors",
  food: "Food & Drink",
  sports: "Sports & Fitness",
  educational: "Educational",
};

const COST_LABEL = {
  free: "Free",
  suggested_donation: "Suggested Donation",
  paid: "Paid",
};

function getCrowdLabel(level) {
  if (level <= 20) return "Quiet";
  if (level <= 40) return "Light";
  if (level <= 60) return "Moderately busy";
  if (level <= 80) return "Busy";
  return "Very busy";
}

function formatDate(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, createdEvents, deletedEventIds, editedEvents, bookmarkedEvents, toggleBookmark } = useUser();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // Merged, filtered, and overridden event list
  const allEvents = useMemo(() => {
    const merged = [...createdEvents, ...staticEvents];
    const filtered = merged.filter((e) => !deletedEventIds.has(e.id));
    return filtered.map((e) =>
      editedEvents[e.id] ? { ...e, ...editedEvents[e.id] } : e
    );
  }, [createdEvents, deletedEventIds, editedEvents]);

  const event = allEvents.find((e) => e.id === id);

  const [likedEvents, setLikedEvents] = useState(() => {
    const saved = localStorage.getItem("likedEvents");
    return saved ? JSON.parse(saved) : {};
  });

  function toggleLike(eventId) {
    const updated = { ...likedEvents, [eventId]: !likedEvents[eventId] };
    setLikedEvents(updated);
    localStorage.setItem("likedEvents", JSON.stringify(updated));
  }

  function getLikeCount(e) {
    const base = e.likes || 0;
    return likedEvents[e.id] ? base + 1 : base;
  }

  if (!event) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Event not found</h1>
        <p className="text-gray-500 mb-6">That event doesn't exist or may have been removed.</p>
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-green-700 font-semibold hover:underline"
        >
          <ArrowLeft size={16} /> Back to Events
        </Link>
      </main>
    );
  }

  const related = allEvents
    .filter((e) => e.neighborhood === event.neighborhood && e.id !== event.id)
    .slice(0, 3);

  const costLabel = event.cost_amount
    ? `${COST_LABEL[event.cost]} · $${event.cost_amount}`
    : COST_LABEL[event.cost];

  return (
    <main className="bg-gray-50 min-h-screen pb-16">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-700 transition-colors mb-6"
          aria-label="Go back"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* LEFT — main content card */}
          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Title + tags */}
            <div className="p-6 pb-4">
              <div className="flex items-start gap-3 mb-3">
                <h1 className="flex-1 text-3xl font-bold text-gray-900 leading-tight">
                  {event.title}
                </h1>
                <button
                  onClick={() => toggleLike(event.id)}
                  className={`shrink-0 flex items-center gap-1.5 font-semibold transition-colors mt-1 ${
                    likedEvents[event.id] ? "text-red-500" : "text-gray-400 hover:text-red-400"
                  }`}
                  aria-label={likedEvents[event.id] ? "Unlike event" : "Like event"}
                >
                  ❤️ <span className="text-base">{getLikeCount(event)}</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium px-3 py-1 rounded-full border border-green-300 text-green-700">
                  {costLabel}
                </span>
                <span className="text-sm font-medium px-3 py-1 rounded-full border border-green-300 text-green-700">
                  {CATEGORY_LABELS[event.category] ?? event.category}
                </span>
                {event.tags?.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="text-sm font-medium px-3 py-1 rounded-full border border-green-300 text-green-700 capitalize"
                  >
                    {tag.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>

            {/* Gallery / hero image */}
            <EventGallery
              images={
                event.gallery_images?.length
                  ? event.gallery_images
                  : [{ url: event.image_url, alt: event.title }]
              }
              title={event.title}
            />

            {/* Date / time / location */}
            <div className="px-6 pt-5 pb-2 flex flex-col gap-3">
              <div className="flex items-center gap-3 text-gray-700">
                <Calendar size={18} className="text-green-600 shrink-0" aria-hidden="true" />
                <span className="font-medium">
                  {formatDate(event.date)}&nbsp;&nbsp;{event.time}
                </span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <MapPin size={18} className="text-green-600 shrink-0" aria-hidden="true" />
                <span className="font-medium">{event.space_name}, Seattle</span>
              </div>
            </div>

            {/* Description */}
            <div className="px-6 py-5">
              <p className="text-gray-700 leading-relaxed">{event.description}</p>
            </div>
          </div>

          {/* RIGHT — sticky column */}
          <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4 lg:sticky lg:top-24">

            {/* What to Expect card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">

              {/* Green "What to expect" header */}
              <div className="bg-green-50 px-6 py-5 border-b border-green-100">
                <h2 className="text-xl font-bold text-gray-900">What to expect</h2>
              </div>

              {/* Key-value rows */}
              <div className="px-6 py-5 flex flex-col gap-3 flex-1">
                {event.noise_level && (
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Noise level: </span>
                    {event.noise_level}
                  </p>
                )}
                {event.accessibility?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1.5">Accessibility:</p>
                    <AccessibilityTags tags={event.accessibility} />
                  </div>
                )}
                {event.space_format && (
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Space format: </span>
                    {event.space_format}
                  </p>
                )}

                {/* Crowd level */}
                {event.crowd_level != null && (
                  <div className="mt-3">
                    <h3 className="font-bold text-gray-900 mb-3">
                      Crowd Level (estimated):
                    </h3>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${event.crowd_level}%` }}
                      />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mt-2">
                      {getCrowdLabel(event.crowd_level)}
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-2">
                <button
                  onClick={() => toggleBookmark(event.id)}
                  className={`flex items-center justify-center gap-1.5 flex-1 border font-semibold py-2.5 rounded-xl text-sm transition-colors ${
                    bookmarkedEvents.has(event.id)
                      ? "border-green-400 bg-green-50 text-green-700"
                      : "border-gray-200 hover:border-green-400 hover:text-green-700 text-gray-700"
                  }`}
                  aria-label={bookmarkedEvents.has(event.id) ? "Remove bookmark" : "Save this event"}
                >
                  <Bookmark size={15} />
                  {bookmarkedEvents.has(event.id) ? "Saved" : "Save"}
                </button>
                <button
                  className="flex items-center justify-center gap-1.5 flex-1 border border-gray-200 hover:border-green-400 hover:text-green-700 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                  aria-label="Add to calendar"
                >
                  <CalendarPlus size={15} />
                  Calendar
                </button>
                <button
                  className="border border-gray-200 hover:border-green-400 hover:text-green-700 text-gray-700 p-2.5 rounded-xl transition-colors"
                  aria-label="Share this event"
                >
                  <Share2 size={15} />
                </button>
              </div>
            </div>

            {/* Attending card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-blue-50 px-6 py-5 border-b border-blue-100">
                <h2 className="text-xl font-bold text-gray-900">Want to attend?</h2>
              </div>
              <div className="px-6 py-5 flex flex-col gap-4">
                {event.attending_limit ? (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-700 font-semibold">{event.attending_count || 0} attending</span>
                      <span className="text-gray-400">{event.attending_limit} spots total</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((event.attending_count || 0) / event.attending_limit) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {Math.max(0, event.attending_limit - (event.attending_count || 0))} spots remaining
                    </p>
                  </div>
                ) : null}
                {user ? (
                  <button className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
                    Mark as Attending
                  </button>
                ) : (
                  <Link
                    to="/signin"
                    className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-sm transition-colors"
                  >
                    Sign in to attend
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related events */}
        {related.length > 0 && (
          <section className="mt-14" aria-labelledby="related-heading">
            <h2
              id="related-heading"
              className="text-xl font-bold text-gray-900 mb-5"
            >
              More events in {event.neighborhood}
            </h2>
            <div className="flex flex-col gap-4">
              {related.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  bookmarked={bookmarkedEvents.has(e.id)}
                  onToggleBookmark={toggleBookmark}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
