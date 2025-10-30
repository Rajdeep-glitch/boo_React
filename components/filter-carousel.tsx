"use client"

import { useEffect } from "react"
import useEmblaCarousel from "embla-carousel-react"

interface Filter {
  id: string
  name: string
  image: string
}

interface FilterCarouselProps {
  filters: Filter[]
  selectedFilter: string
  onSelectFilterAction: (filterId: string) => void
}

const FILTER_IMAGE_PATHS: Record<string, string> = {
  0: "/masks/0.png",
  1: "/masks/1.png",
  2: "/masks/2.png",
  3: "/masks/3.png",
  4: "/masks/4.png",
  5: "/masks/5.png",
  6: "/masks/6.png",
  7: "/masks/7.png",
  8: "/masks/8.png",
  9: "/masks/9.png",
  10: "/masks/10.png",
  11: "/masks/11.png",
  12: "/masks/12.png",
  13: "/masks/13.png",
  14: "/masks/14.png",
}

export default function FilterCarousel({ filters, selectedFilter, onSelectFilterAction }: FilterCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "center", containScroll: "trimSnaps", dragFree: true })

  useEffect(() => {
    if (!emblaApi) return
    const index = filters.findIndex((filter) => filter.id === selectedFilter)
    if (index >= 0) {
      emblaApi.scrollTo(index, true)
    }
  }, [filters, selectedFilter, emblaApi])

  return (
    <div className="w-full px-2 sm:px-4">
      <div ref={emblaRef} className="overflow-hidden cursor-grab active:cursor-grabbing select-none" style={{ touchAction: "pan-y" }}>
        <div className="flex gap-2 sm:gap-3">
          {filters.map((filter, index) => {
            const imageSrc = filter.image || FILTER_IMAGE_PATHS[filter.id] || "/placeholder.svg"
            const isSelected = selectedFilter === filter.id
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => {
                  onSelectFilterAction(filter.id)
                  emblaApi?.scrollTo(index, true)
                }}
                className={`shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg border-2 transition-all duration-300 overflow-hidden cursor-pointer active:scale-95 ${
                  isSelected ? "border-orange-500 shadow-lg shadow-orange-500/50 scale-110 glow-animation" : "border-orange-300/30 hover:border-orange-400/60"
                }`}
                style={{ flex: "0 0 auto", scrollSnapAlign: "center" }}
              >
                <img src={imageSrc} alt={filter.name} className="w-full h-full object-cover object-top" draggable={false} />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
