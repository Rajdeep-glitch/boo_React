"use client"

import { Button } from "@/components/ui/button"
import { Download, Share2, RotateCcw } from "lucide-react"

interface CaptureControlsProps {
  imageData: string
  onRetake: () => void
}

export default function CaptureControls({ imageData, onRetake }: CaptureControlsProps) {
  const getFormattedTimestamp = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`
  }

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = imageData
    link.download = `BreakABoo_${getFormattedTimestamp()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShare = async () => {
    try {
      const blob = await fetch(imageData).then((r) => r.blob())
      const file = new File([blob], "break-a-boo.png", { type: "image/png" })

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: "Break-A-Boo",
          text: "👻 Check out my spooky Halloween filter! #BreakABoo",
        })
      } else {
        handleDownload()
      }
    } catch (err) {
      console.error("Share failed:", err)
      handleDownload()
    }
  }

  return (
    <div className="flex gap-2 sm:gap-4 justify-center flex-wrap w-full">
      <Button
        onClick={handleDownload}
        className="bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-full shadow-lg flex items-center gap-2 text-sm sm:text-base"
      >
        <Download className="w-4 sm:w-5 h-4 sm:h-5" />
        <span className="hidden sm:inline">Download</span>
        <span className="inline sm:hidden">DL</span>
      </Button>

      <Button
        onClick={handleShare}
        className="bg-linear-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-full shadow-lg flex items-center gap-2 text-sm sm:text-base"
      >
        <Share2 className="w-4 sm:w-5 h-4 sm:h-5" />
        <span className="hidden sm:inline">Share</span>
        <span className="inline sm:hidden">📤</span>
      </Button>

      <Button
        onClick={onRetake}
        className="bg-linear-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-full shadow-lg flex items-center gap-2 text-sm sm:text-base"
      >
        <RotateCcw className="w-4 sm:w-5 h-4 sm:h-5" />
        <span className="hidden sm:inline">Retake</span>
        <span className="inline sm:hidden">♻️</span>
      </Button>
    </div>
  )
}
