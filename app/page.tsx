"use client"

import { useState } from "react"
import CameraView from "@/components/camera-view"
import FilterCarousel from "@/components/filter-carousel"
import CaptureControls from "@/components/capture-controls"

const filters = [
  { id: "0", name: "Mask 0", image: "/masks/0.png" },
  { id: "1", name: "Mask 1", image: "/masks/1.png" },
  { id: "2", name: "Mask 2", image: "/masks/2.png" },
  { id: "3", name: "Mask 3", image: "/masks/3.png" },
  { id: "4", name: "Mask 4", image: "/masks/4.png" },
  { id: "5", name: "Mask 5", image: "/masks/5.png" },
  { id: "6", name: "Mask 6", image: "/masks/6.png" },
  { id: "7", name: "Mask 7", image: "/masks/7.png" },
  { id: "8", name: "Mask 8", image: "/masks/8.png" },
  { id: "9", name: "Mask 9", image: "/masks/9.png" },
  { id: "10", name: "Mask 10", image: "/masks/10.png" },
  { id: "11", name: "Mask 11", image: "/masks/11.png" },
  { id: "12", name: "Mask 12", image: "/masks/12.png" },
  { id: "13", name: "Mask 13", image: "/masks/13.png" },
  { id: "14", name: "Mask 14", image: "/masks/14.png" },
]

export default function Home() {
  const [selectedFilter, setSelectedFilter] = useState(filters[0].id)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [showCapture, setShowCapture] = useState(false)

  const handleCapture = (imageData: string) => {
    setCapturedImage(imageData)
    setShowCapture(true)
  }

  const handleRetake = () => {
    setCapturedImage(null)
    setShowCapture(false)
  }

  const baseMainClasses = "w-screen h-screen fixed inset-0 overflow-hidden"
  const activeSeasonClass = "halloween-effects"

  return (
    <main className={`${baseMainClasses} seasonal-layout ${activeSeasonClass}`}>
      <div className="fixed inset-0 pointer-events-none base-overlay" aria-hidden></div>
      <div className="fixed inset-0 pointer-events-none halloween-vignette" aria-hidden></div>

      {showCapture && capturedImage ? (
        <div className="fixed inset-0 z-60 flex flex-col items-center justify-center gap-3 sm:gap-4 w-full h-full px-2 sm:px-4 py-4 sm:py-6 overflow-y-auto bg-black/40 backdrop-blur-sm seasonal-capture-wrap">
          <div className="animate-fade-in relative w-full max-w-md aspect-square rounded-lg overflow-hidden border-4 border-orange-500 shadow-2xl shrink-0 seasonal-capture-frame">
            <img
              src={capturedImage}
              alt="Captured Break-A-Boo"
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error("Image load error:", e)
              }}
            />
            <div className="pointer-events-none absolute inset-0 halloween-frame"></div>
            <div className="pointer-events-none absolute top-4 left-4 seasonal-watermark seasonal-watermark--capture">
              <img src="/white_logo.png" alt="Break-A-Boo logo" className="h-12 w-auto" />
              <span>Break-A-Boo</span>
            </div>
          </div>
          <div className="shrink-0 w-full">
            <CaptureControls imageData={capturedImage} onRetake={handleRetake} />
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 z-60 w-full h-full flex flex-col items-center px-2 sm:px-4 py-4 sm:py-6">
          <div className="flex-1 flex items-end justify-center w-full min-h-0">
            <CameraView selectedFilter={selectedFilter} onCaptureAction={handleCapture} />
          </div>
          <div className="w-full shrink-0 mt-4">
            <FilterCarousel filters={filters} selectedFilter={selectedFilter} onSelectFilterAction={setSelectedFilter} />
          </div>
        </div>
      )}

      <div className="floating-bats fixed inset-0" aria-hidden></div>
      <div className="glitter-overlay fixed inset-0" aria-hidden></div>
      <div className="fog-layer fog-layer--near fixed inset-0" aria-hidden></div>
      <div className="fog-layer fog-layer--far fixed inset-0" aria-hidden></div>
    </main>
  )
}
