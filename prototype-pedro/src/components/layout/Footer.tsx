import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-8 text-center sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-semibold">
          Seattle Third Spaces
        </Link>
        <p className="text-sm text-muted-foreground">
          Discover community spaces and events in Seattle.
        </p>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Seattle Third Spaces. All rights
          reserved.
        </p>
      </div>
    </footer>
  )
}
