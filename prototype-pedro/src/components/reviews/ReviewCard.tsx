import { formatRelativeTime } from "@/lib/utils"
import type { Review } from "@/types"

export type ReviewWithProfile = Pick<
  Review,
  "id" | "rating" | "body" | "created_at" | "status"
> & {
  profiles: { display_name: string } | null
}

interface ReviewCardProps {
  review: ReviewWithProfile
}

export function ReviewCard({ review }: ReviewCardProps) {
  if (review.status === "hidden") return null

  return (
    <li className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className={i < review.rating ? "text-yellow-500" : "text-muted-foreground/30"}
              aria-hidden
            >
              &#9733;
            </span>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(review.created_at)}
        </span>
      </div>

      <p className="text-sm font-medium">
        {review.profiles?.display_name ?? "Anonymous"}
      </p>

      {review.body && (
        <p className="text-sm text-muted-foreground whitespace-pre-line">
          {review.body}
        </p>
      )}
    </li>
  )
}
