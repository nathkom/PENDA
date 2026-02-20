"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useDebounce } from "@/hooks/useDebounce"

export function SearchBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialQ = searchParams.get("q") ?? ""

  const [value, setValue] = useState(initialQ)
  const debouncedValue = useDebounce(value, 300)

  useEffect(() => {
    const currentQ = searchParams.get("q") ?? ""
    if (debouncedValue === currentQ) return

    const params = new URLSearchParams(searchParams.toString())
    if (debouncedValue) {
      params.set("q", debouncedValue)
    } else {
      params.delete("q")
    }

    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }, [debouncedValue, router, pathname, searchParams])

  function handleClear() {
    setValue("")
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search places and events..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9 pr-9"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear search</span>
        </button>
      )}
    </div>
  )
}
