import { Link } from "react-router-dom";
import { MapPin, Calendar, Clock, Bookmark, CalendarPlus, Share2 } from "lucide-react";

const COST_BADGE = {
  free: "bg-green-100 text-green-700",
  suggested_donation: "bg-yellow-100 text-yellow-700",
  paid: "bg-gray-100 text-gray-600",
};

const COST_LABEL = {
  free: "Free",
  suggested_donation: "Fundraiser",
  paid: "Paid",
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Feed card (horizontal, h-220) — used on Home ─────────────────────────────
function FeedCard({ event, costClass, costLabel, liked, likeCount, onToggleLike, bookmarked, onToggleBookmark }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group h-[220px]"
      aria-label={`View details for ${event.title}`}
    >
      <div className="flex h-full">
        {/* Image */}
        <div className="w-52 shrink-0 overflow-hidden">
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col min-w-0 overflow-hidden gap-1.5">

          {/* Title + like button */}
          <div className="flex items-start gap-2">
            <h3 className="flex-1 text-lg font-bold text-gray-900 leading-tight line-clamp-1 group-hover:text-[#9FB366] transition-colors">
              {event.title}
            </h3>
            <button
              className={`shrink-0 flex items-center gap-1 transition-colors ${
                liked ? "text-red-500" : "text-gray-300 hover:text-red-400"
              }`}
              onClick={(e) => { e.preventDefault(); onToggleLike?.(event.id); }}
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

          {/* Description */}
          {event.description && (
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
              {event.description}
            </p>
          )}

          {/* Tags + action buttons — pushed to bottom */}
          <div className="flex items-center justify-between mt-auto gap-2">
            <div className="flex flex-wrap gap-1 min-w-0 overflow-hidden">
              <span className={`text-sm px-3 py-1 rounded-full font-semibold ${costClass}`}>
                {costLabel}
              </span>
              {event.tags?.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-sm px-3 py-1 rounded-full border border-green-300 text-green-700 capitalize whitespace-nowrap"
                >
                  {tag.replace(/_/g, " ")}
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
                aria-label={bookmarked ? "Remove bookmark" : "Bookmark event"}
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

// ── Grid card (vertical) — used on Events page ────────────────────────────────
function GridCard({ event, costClass, costLabel, liked, likeCount, onToggleLike, bookmarked, onToggleBookmark }) {
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
          <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-[#9FB366] transition-colors line-clamp-2 flex-1">
            {event.title}
          </h3>
          <button
            className={`shrink-0 flex items-center gap-1 transition-colors ${
              liked ? "text-red-500" : "text-gray-300 hover:text-red-400"
            }`}
            onClick={(e) => { e.preventDefault(); onToggleLike?.(event.id); }}
            aria-label={liked ? "Unlike event" : "Like event"}
          >
            ❤️ <span className="text-xs text-gray-500">{likeCount ?? 0}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar size={12} className="text-[#97BFFF]" aria-hidden="true" />
          <span>{formatDate(event.date)}</span>
          <span className="mx-0.5">·</span>
          <Clock size={12} className="text-[#FFA86C]" aria-hidden="true" />
          <span>{event.time}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin size={12} className="text-[#FD858A]" aria-hidden="true" />
          <span className="truncate">
            {event.space_name} · {event.neighborhood}
          </span>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mt-0.5">
          {event.description}
        </p>

        <div className="flex items-center justify-between mt-auto pt-2 gap-2">
          <div className="flex flex-wrap gap-1 min-w-0 overflow-hidden">
            {event.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full capitalize font-medium whitespace-nowrap"
              >
                {tag.replace(/_/g, " ")}
              </span>
            ))}
          </div>
          <div className="flex gap-1 shrink-0" onClick={(e) => e.preventDefault()}>
            <button
              onClick={() => onToggleBookmark?.(event.id)}
              className={`p-2.5 rounded-lg border transition-colors ${
                bookmarked
                  ? "border-[#9FB366] text-[#9FB366] bg-green-50"
                  : "border-gray-200 hover:border-[#9FB366] hover:text-[#9FB366] text-gray-500"
              }`}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark event"}
            >
              <Bookmark size={16} />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Exported component ────────────────────────────────────────────────────────
export default function EventCard({
  event,
  variant = "feed",
  liked,
  likeCount,
  onToggleLike,
  bookmarked,
  onToggleBookmark,
}) {
  const costClass = COST_BADGE[event.cost] ?? COST_BADGE.paid;
  const costLabel = event.cost === "suggested_donation"
    ? "Fundraiser"
    : event.cost_amount
      ? `${COST_LABEL[event.cost]} · $${event.cost_amount}`
      : COST_LABEL[event.cost];

  if (variant === "grid") {
    return (
      <GridCard
        event={event}
        costClass={costClass}
        costLabel={costLabel}
        liked={liked}
        likeCount={likeCount}
        onToggleLike={onToggleLike}
        bookmarked={bookmarked}
        onToggleBookmark={onToggleBookmark}
      />
    );
  }

  return (
    <FeedCard
      event={event}
      costClass={costClass}
      costLabel={costLabel}
      liked={liked}
      likeCount={likeCount}
      onToggleLike={onToggleLike}
      bookmarked={bookmarked}
      onToggleBookmark={onToggleBookmark}
    />
  );
}
