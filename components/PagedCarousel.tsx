"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener?.("change", onChange)
    return () => mql.removeEventListener?.("change", onChange)
  }, [query])

  return matches
}

type PagedCarouselProps = {
  title?: string
  description?: string
  items: React.ReactNode[]
  className?: string
}

export function PagedCarousel({ title, description, items, className }: PagedCarouselProps) {
  const isLg = useMediaQuery("(min-width: 1024px)")
  const isMd = useMediaQuery("(min-width: 768px) and (max-width: 1023px)")
  const perPage = isLg ? 3 : isMd ? 2 : 1

  const railRef = useRef<HTMLDivElement | null>(null)
  const [page, setPage] = useState(0)

  const pages = useMemo(() => chunk(items, perPage), [items, perPage])
  const totalPages = pages.length

  // Si cambia el número de páginas (por resize o datos), ajusta page.
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(totalPages - 1, 0)))
    // y vuelve al inicio para evitar offsets raros tras resize
    const el = railRef.current
    if (el) el.scrollTo({ left: 0, behavior: "auto" })
  }, [totalPages, perPage])

  const scrollToPage = (next: number) => {
    const el = railRef.current
    if (!el) return
    const clamped = Math.max(0, Math.min(next, totalPages - 1))
    setPage(clamped)
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" })
  }

  const onPrev = () => scrollToPage(page - 1)
  const onNext = () => scrollToPage(page + 1)

  const onScroll = () => {
    const el = railRef.current
    if (!el) return
    const w = el.clientWidth || 1
    const next = Math.round(el.scrollLeft / w)
    if (next !== page) setPage(next)
  }

  // ✅ En desktop: si solo hay 1 página, mostramos solo “grid” sin controles.
  const showControls = totalPages > 1

  return (
    <div className={className}>
      {(title || description) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            {title ? <h3 className="text-base sm:text-lg font-semibold leading-tight">{title}</h3> : null}
            {description ? <p className="text-xs sm:text-sm text-muted-foreground">{description}</p> : null}
          </div>

          {showControls ? (
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" onClick={onPrev} disabled={page <= 0} aria-label="Anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onNext}
                disabled={page >= totalPages - 1}
                aria-label="Siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {/* rail */}
      <div
        ref={railRef}
        onScroll={onScroll}
        className={`
          w-full overflow-x-auto scroll-smooth
          snap-x snap-mandatory
          [scrollbar-width:none] [-ms-overflow-style:none]
          [&::-webkit-scrollbar]:hidden
        `}
      >
        <div className="flex">
          {pages.map((group, idx) => (
            <div key={idx} className="w-full shrink-0 snap-start">
              {/* ✅ grid interna: 1 / 2 / 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.map((node, i) => (
                  <div key={i} className="min-w-0">
                    {node}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* dots */}
      {showControls ? (
        <div className="flex items-center justify-center gap-2 mt-3">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToPage(i)}
              className={`h-2 w-2 rounded-full transition ${
                i === page ? "bg-foreground" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Ir a página ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
