"use client"

interface MapPinProps {
  color?: string
  size?: number
  onClick?: () => void
}

export function MapPin({ color = "#2563eb", size = 28, onClick }: MapPinProps) {
  return (
    <div
      onClick={onClick}
      style={{ width: size, height: size, cursor: onClick ? "pointer" : "default" }}
      className="flex items-center justify-center"
    >
      <svg
        viewBox="0 0 24 32"
        width={size}
        height={Math.round(size * (32 / 24))}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 0C7.589 0 4 3.589 4 8c0 7 8 16 8 16s8-9 8-16c0-4.411-3.589-8-8-8z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
        />
        <circle cx="12" cy="8" r="3" fill="white" />
      </svg>
    </div>
  )
}
