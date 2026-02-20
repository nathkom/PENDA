"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface HomepageTabsProps {
  activeTab: string
  children: React.ReactNode
}

export function HomepageTabs({ activeTab, children }: HomepageTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "events") {
      params.delete("tab")
    } else {
      params.set("tab", value)
    }
    const qs = params.toString()
    router.push(qs ? `/?${qs}` : "/")
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="events">Upcoming Events</TabsTrigger>
        <TabsTrigger value="places">Places</TabsTrigger>
      </TabsList>
      <div className="mt-6">{children}</div>
    </Tabs>
  )
}
