import { Link } from "react-router-dom";
import { MapPin, Calendar, Clock } from "lucide-react";
import AccessibilityTags from "./AccessibilityTags";

const COST_BADGE = {
  free: "bg-green-100 text-green-700",
  suggested_donation: "bg-yellow-100 text-yellow-700",
  paid: "bg-gray-100 text-gray-600",
};

const COST_LABEL = {
  free: "Free",
  suggested_donation: "Donation",
  paid: "Paid",
};

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Grid card (vertical) — used on Events page ────────────────────────────────
function GridCard({ event, costClass, costLabel }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex flex-col bg-white rounded-2xl border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all overflow-hidden"
      aria-label={`View details for ${event.title}`}
    >
      {/* Image */}
      <div className="w-full h-44 overflow-hidden bg-green-50 shrink-0">
        <img
          src={event.image_url}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-green-700 transition-colors line-clamp-2 flex-1">
            {event.title}
          </h3>
          <span
            className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${costClass}`}
          >
            {costLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar size={12} className="text-blue-500" aria-hidden="true" />
          <span>{formatDate(event.date)}</span>
          <span className="mx-0.5">·</span>
          <Clock size={12} className="text-orange-500" aria-hidden="true" />
          <span>{event.time}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin size={12} className="text-red-500" aria-hidden="true" />
          <span className="truncate">
            {event.space_name} · {event.neighborhood}
          </span>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mt-0.5">
          {event.description}
        </p>

        {event.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-2">
            {event.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full capitalize font-medium"
              >
                {tag.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Feed card (horizontal) — used on Home & detail pages ─────────────────────
function FeedCard({ event, costClass, costLabel }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex bg-white rounded-2xl border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all overflow-hidden"
      aria-label={`View details for ${event.title}`}
    >
      {/* Event image — flush left, fills full card height */}
      <div className="shrink-0 w-44 sm:w-52">
        <img
          src={event.image_url}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>

      {/* Event info */}
      <div className="flex flex-col gap-2 min-w-0 flex-1 p-4 sm:p-5">
        <h3 className="font-bold text-gray-900 text-lg leading-snug group-hover:text-green-700 transition-colors line-clamp-2">
          {event.title}
        </h3>

        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Calendar
            size={14}
            className="text-blue-500 shrink-0"
            aria-hidden="true"
          />
          <span>{formatDate(event.date)}</span>
          <span className="mx-1">·</span>
          <Clock
            size={14}
            className="text-orange-500 shrink-0"
            aria-hidden="true"
          />
          <span>{event.time}</span>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <MapPin
            size={14}
            className="text-red-500 shrink-0"
            aria-hidden="true"
          />
          <span className="truncate">
            {event.space_name} · {event.neighborhood}
          </span>
        </div>

        <p className="text-sm text-gray-600 flex-1 min-h-0 line-clamp-6 mt-0.5 leading-relaxed">
          {event.description}
        </p>

        <div className="flex flex-wrap gap-1.5 pt-1">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${costClass}`}
          >
            {costLabel}
          </span>
          {event.tags?.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full capitalize font-medium"
            >
              {tag.replace(/_/g, " ")}
            </span>
          ))}
        </div>

        {event.accessibility?.length > 0 && (
          <div className="mt-0.5">
            <AccessibilityTags tags={event.accessibility} />
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Exported component ────────────────────────────────────────────────────────
export default function EventCard({ event, variant = "feed" }) {
  const costClass = COST_BADGE[event.cost] ?? COST_BADGE.paid;
  const costLabel = event.cost_amount
    ? `${COST_LABEL[event.cost]} · ${event.cost_amount}`
    : COST_LABEL[event.cost];

  if (variant === "grid") {
    return (
      <GridCard event={event} costClass={costClass} costLabel={costLabel} />
    );
  }
  return <FeedCard event={event} costClass={costClass} costLabel={costLabel} />;
}
