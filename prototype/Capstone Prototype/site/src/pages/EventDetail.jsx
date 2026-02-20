import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Bookmark,
  CalendarPlus,
  Share2,
} from "lucide-react";
import { events } from "../data/events";
import EventCard from "../components/EventCard";
import EventGallery from "../components/EventGallery";

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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const event = events.find((e) => e.id === id);

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

  const related = events
    .filter((e) => e.neighborhood === event.neighborhood && e.id !== event.id)
    .slice(0, 3);

  const costLabel = event.cost_amount
    ? `${COST_LABEL[event.cost]} · ${event.cost_amount}`
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
              <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-3">
                {event.title}
              </h1>
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

          {/* RIGHT — what to expect + actions */}
          <div className="w-full lg:w-80 shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col lg:sticky lg:top-24">

            {/* Green "What to expect" header */}
            <div className="bg-green-50 px-6 py-5 border-b border-green-100">
              <h2 className="text-xl font-bold text-gray-900">What to expect</h2>
            </div>

            {/* Key-value rows */}
            <div className="px-6 py-5 flex flex-col gap-3 flex-1">
              {event.crowd_vibe && (
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Crowd vibe: </span>
                  {event.crowd_vibe}
                </p>
              )}
              {event.social_pressure && (
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Social pressure: </span>
                  {event.social_pressure}
                </p>
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
                className="flex items-center justify-center gap-1.5 flex-1 border border-gray-200 hover:border-green-400 hover:text-green-700 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                aria-label="Save this event"
              >
                <Bookmark size={15} />
                Save
              </button>
              <button
                className="flex items-center justify-center gap-1.5 flex-1 border border-gray-200 hover:border-green-400 hover:text-green-700 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                aria-label="Add to calendar"
              >
                <CalendarPlus size={15} />
                Add to calendar
              </button>
              <button
                className="border border-gray-200 hover:border-green-400 hover:text-green-700 text-gray-700 p-2.5 rounded-xl transition-colors"
                aria-label="Share this event"
              >
                <Share2 size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Related events — unchanged */}
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
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
