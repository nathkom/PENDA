import { ReviewCard, type ReviewWithProfile } from "./ReviewCard"

interface ReviewListProps {
  reviews: ReviewWithProfile[]
  averageRating: number | null
}

export function ReviewList({ reviews, averageRating }: ReviewListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {averageRating != null ? (
          <p className="text-sm font-medium">
            {averageRating.toFixed(1)}{" "}
            <span className="text-yellow-500">&#9733;</span>
            {" · "}
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No reviews yet</p>
        )}
      </div>

      {reviews.length > 0 && (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </ul>
      )}
    </div>
  )
}
