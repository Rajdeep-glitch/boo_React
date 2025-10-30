"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

interface CameraViewProps {
  selectedFilter: string
  onCaptureAction: (imageData: string) => void
}

interface Landmark {
  x: number
  y: number
  z?: number
}

const MASK_VERTICAL_OFFSET = 0.22
const FULL_FRAME_FILTERS = new Set(["background2", "skull"]) 

const computeFrameWidthScale = (canvas: HTMLCanvasElement) => {
  if (!canvas.width || !canvas.height) return 1
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return 1
  const canvasAspect = canvas.width / canvas.height
  if (!canvasAspect) return 1
  const frameAspect = rect.width / rect.height
  if (frameAspect >= canvasAspect) return 1
  const ratio = frameAspect / canvasAspect
  const scale = Math.sqrt(ratio)
  return Math.max(0.75, Math.min(1, scale))
}

export default function CameraView({ selectedFilter, onCaptureAction }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const filterImageRef = useRef<HTMLImageElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [maskSizeMultiplier, setMaskSizeMultiplier] = useState(1.0)
  const maskSizeRef = useRef(1.0)
  const animationRef = useRef<number | null>(null)
  const faceMeshRef = useRef<any>(null)
  const cameraRef = useRef<any>(null)
  const fpsRef = useRef({ frames: 0, lastTime: Date.now() })
  const smoothStateRef = useRef<any>(null)
  const maskVisibilityRef = useRef(false)

  const filterImages: Record<string, string> = {
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

  // Sync mask size multiplier to ref for use in callbacks
  useEffect(() => {
    maskSizeRef.current = maskSizeMultiplier
    // Reset smooth state to allow immediate mask size change
    smoothStateRef.current = null
  }, [maskSizeMultiplier])

  useEffect(() => {
    if (overlayCanvasRef.current) {
      overlayCanvasRef.current.style.opacity = "0"
      overlayCanvasRef.current.style.transition = "opacity 160ms ease-out"
    }
  }, [])

  // Load filter image when selectedFilter changes
  useEffect(() => {
    const img = new Image()
    img.src = filterImages[selectedFilter] || filterImages[selectedFilter.replace("-", "")]
    img.onload = () => {
      filterImageRef.current = img
      smoothStateRef.current = null
      if (overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext("2d")
        if (ctx) {
          ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height)
        }
      }
      setMaskVisibility(false)
    }
    img.onerror = () => {
      console.error(`Failed to load filter image: ${selectedFilter}`)
    }
  }, [selectedFilter])

  // Initialize camera and MediaPipe
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            if (canvasRef.current && videoRef.current && overlayCanvasRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth
              canvasRef.current.height = videoRef.current.videoHeight
              overlayCanvasRef.current.width = videoRef.current.videoWidth
              overlayCanvasRef.current.height = videoRef.current.videoHeight
            }
            videoRef.current?.play()
            loadFaceMesh()
          }
        }
      } catch (err) {
        console.error("Camera error:", err)
        setError("Please allow camera access to use the face filters 👻")
        setIsLoading(false)
      }
    }

    initCamera()

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
      }
      if (cameraRef.current) {
        cameraRef.current.stop?.()
        cameraRef.current = null
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (faceMeshRef.current) {
        faceMeshRef.current.close?.()
        faceMeshRef.current = null
      }
    }
  }, [])

  const loadFaceMesh = async () => {
    try {
      // Load MediaPipe scripts
      const cameraScript = document.createElement("script")
      cameraScript.src = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.4.1633559619/camera_utils.js"
      cameraScript.crossOrigin = "anonymous"

      const drawingScript = document.createElement("script")
      drawingScript.src = "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1633559619/drawing_utils.js"
      drawingScript.crossOrigin = "anonymous"

      const faceMeshScript = document.createElement("script")
      faceMeshScript.src = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js"
      faceMeshScript.crossOrigin = "anonymous"

      let scriptsLoaded = 0
      const onScriptLoad = () => {
        scriptsLoaded++
        if (scriptsLoaded === 3) {
          startFaceMesh()
        }
      }

      cameraScript.onload = onScriptLoad
      drawingScript.onload = onScriptLoad
      faceMeshScript.onload = onScriptLoad

      cameraScript.onerror = drawingScript.onerror = faceMeshScript.onerror = () => {
        console.error("Failed to load MediaPipe scripts")
        startFaceMeshFallback()
      }

      document.head.appendChild(cameraScript)
      document.head.appendChild(drawingScript)
      document.head.appendChild(faceMeshScript)
    } catch (err) {
      console.error("Failed to load face mesh:", err)
      startFaceMeshFallback()
    }
  }

  const drawFrame = () => {
    if (!videoRef.current || !canvasRef.current) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    ctx.save()
    // Mirror the camera for natural front-facing view (selfie mirror effect)
    ctx.scale(-1, 1)
    ctx.translate(-canvasRef.current.width, 0)
    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)
    ctx.restore()
  }

  const setMaskVisibility = (visible: boolean) => {
    if (!overlayCanvasRef.current) return
    if (maskVisibilityRef.current === visible) return
    maskVisibilityRef.current = visible
    overlayCanvasRef.current.style.opacity = visible ? "1" : "0"
  }

  const calculateFaceMetrics = (landmarks: Landmark[]) => {
    if (!overlayCanvasRef.current || !landmarks || landmarks.length === 0) return null

    const canvasWidth = overlayCanvasRef.current.width
    const canvasHeight = overlayCanvasRef.current.height
    const required = [33, 263, 1, 152, 10, 234, 454]
    for (const index of required) {
      if (!landmarks[index]) return null
    }

    const toPoint = (index: number) => {
      const point = landmarks[index]
      return {
        x: (1 - point.x) * canvasWidth,
        y: point.y * canvasHeight,
      }
    }

    const leftEyeOuter = toPoint(33)
    const rightEyeOuter = toPoint(263)
    const noseTip = toPoint(1)
    const chin = toPoint(152)
    const forehead = toPoint(10)
    const leftCheek = toPoint(234)
    const rightCheek = toPoint(454)
    const eyeMid = {
      x: (leftEyeOuter.x + rightEyeOuter.x) / 2,
      y: (leftEyeOuter.y + rightEyeOuter.y) / 2,
    }

    const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

    const rotation = Math.atan2(rightEyeOuter.y - leftEyeOuter.y, rightEyeOuter.x - leftEyeOuter.x)
    const faceWidth = distance(leftCheek, rightCheek)
    const eyeDistance = distance(leftEyeOuter, rightEyeOuter)
    const faceHeight = distance(forehead, chin)

    const centerX = noseTip.x * 0.55 + eyeMid.x * 0.25 + chin.x * 0.2
    const centerY = noseTip.y * 0.4 + eyeMid.y * 0.2 + chin.y * 0.4

    const offsetY = faceHeight * MASK_VERTICAL_OFFSET

    return {
      centerX,
      centerY,
      width: faceWidth,
      height: faceHeight,
      rotation,
      eyeDistance,
      offsetY,
    }
  }

  const drawMaskOnCanvas = (landmarks: Landmark[], sizeMultiplier: number = 1.0) => {
    if (!filterImageRef.current || !overlayCanvasRef.current) return

    const overlayCanvas = overlayCanvasRef.current
    const ctx = overlayCanvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)

    if (FULL_FRAME_FILTERS.has(selectedFilter)) {
      const canvasWidth = overlayCanvas.width
      const canvasHeight = overlayCanvas.height
      const image = filterImageRef.current
      const imageAspect = image.width / image.height
      const canvasAspect = canvasWidth / canvasHeight

      let renderWidth = canvasWidth
      let renderHeight = canvasHeight
      let offsetX = 0
      let offsetY = 0

      if (imageAspect > canvasAspect) {
        renderHeight = canvasHeight
        renderWidth = canvasHeight * imageAspect
        offsetX = (canvasWidth - renderWidth) / 2
      } else {
        renderWidth = canvasWidth
        renderHeight = canvasWidth / imageAspect
        offsetY = (canvasHeight - renderHeight) / 2
      }

      ctx.drawImage(image, offsetX, offsetY, renderWidth, renderHeight)
      smoothStateRef.current = null
      setMaskVisibility(true)
      fpsRef.current.frames++
      return
    }

    const metrics = calculateFaceMetrics(landmarks)
    if (!metrics) {
      smoothStateRef.current = null
      setMaskVisibility(false)
      return
    }

    const canvasWidth = overlayCanvas.width
    const canvasHeight = overlayCanvas.height
    const aspectRatio = filterImageRef.current.height / filterImageRef.current.width
    const frameScale = computeFrameWidthScale(overlayCanvas)
    const baseWidth = Math.max(metrics.width * 0.95, metrics.eyeDistance * 1.85)
    const baseHeight = Math.max(metrics.height * 1.08, baseWidth * aspectRatio)
    let maskWidth = baseWidth * sizeMultiplier * frameScale
    let maskHeight = baseHeight * sizeMultiplier * frameScale
    const maxWidth = canvasWidth * 0.78
    if (maskWidth > maxWidth) {
      const scale = maxWidth / maskWidth
      maskWidth = maxWidth
      maskHeight *= scale
    }
    const targetX = Math.max(maskWidth / 2, Math.min(canvasWidth - maskWidth / 2, metrics.centerX))
    const targetY = Math.max(maskHeight / 2, Math.min(canvasHeight - maskHeight / 2, metrics.centerY - metrics.offsetY))

    const smoothFactor = 0.35
    const nextState = {
      x: targetX,
      y: targetY,
      width: maskWidth,
      height: maskHeight,
      rotation: metrics.rotation,
    }

    const previous = smoothStateRef.current
    const interpolated = previous
      ? {
          x: previous.x + (nextState.x - previous.x) * smoothFactor,
          y: previous.y + (nextState.y - previous.y) * smoothFactor,
          width: previous.width + (nextState.width - previous.width) * smoothFactor,
          height: previous.height + (nextState.height - previous.height) * smoothFactor,
          rotation: previous.rotation + (nextState.rotation - previous.rotation) * smoothFactor,
        }
      : nextState

    smoothStateRef.current = interpolated

    ctx.save()
    ctx.translate(interpolated.x, interpolated.y)
    ctx.rotate(interpolated.rotation)
    ctx.drawImage(
      filterImageRef.current,
      -interpolated.width / 2,
      -interpolated.height / 2,
      interpolated.width,
      interpolated.height
    )
    ctx.restore()

    setMaskVisibility(true)
    fpsRef.current.frames++
  }

  const composeLayers = () => {
    if (!canvasRef.current || !overlayCanvasRef.current) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    // Draw overlay on top of video
    ctx.drawImage(overlayCanvasRef.current, 0, 0)
  }

  const startFaceMeshFallback = () => {
    const detect = () => {
      drawFrame()

      if (filterImageRef.current && overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext("2d")
        if (ctx) {
          ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height)

          if (selectedFilter === "background2") {
            const canvasWidth = overlayCanvasRef.current.width
            const canvasHeight = overlayCanvasRef.current.height
            const image = filterImageRef.current
            const imageAspect = image.width / image.height
            const canvasAspect = canvasWidth / canvasHeight

            let renderWidth = canvasWidth
            let renderHeight = canvasHeight
            let offsetX = 0
            let offsetY = 0

            if (imageAspect > canvasAspect) {
              renderHeight = canvasHeight
              renderWidth = canvasHeight * imageAspect
              offsetX = (canvasWidth - renderWidth) / 2
            } else {
              renderWidth = canvasWidth
              renderHeight = canvasWidth / imageAspect
              offsetY = (canvasHeight - renderHeight) / 2
            }

            ctx.drawImage(image, offsetX, offsetY, renderWidth, renderHeight)
          } else {
            const canvas = overlayCanvasRef.current
            const centerX = canvas.width / 2
            const centerY = canvas.height / 2
            const frameScale = computeFrameWidthScale(canvas)
            const scale = canvas.width * 0.4 * maskSizeRef.current * frameScale

            ctx.save()
            ctx.translate(centerX, centerY)
            ctx.drawImage(filterImageRef.current, -scale / 2, -scale / 2, scale, scale)
            ctx.restore()
          }
          setMaskVisibility(true)

          composeLayers()
        }
      }

      animationRef.current = requestAnimationFrame(detect)
    }
    detect()
    setIsLoading(false)
  }

  const startFaceMesh = async () => {
    const FaceMesh = (window as any).FaceMesh
    const Camera = (window as any).Camera

    if (!FaceMesh || !Camera) {
      startFaceMeshFallback()
      return
    }

    try {
      faceMeshRef.current = new FaceMesh.FaceMesh({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
      })

      faceMeshRef.current.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })

      faceMeshRef.current.onResults((results: any) => {
        drawFrame()

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          drawMaskOnCanvas(results.multiFaceLandmarks[0], maskSizeRef.current)
        } else {
          drawMaskOnCanvas([], maskSizeRef.current)
        }

        composeLayers()
      })

      if (videoRef.current && overlayCanvasRef.current) {
        cameraRef.current = new Camera.Camera(videoRef.current, {
          onFrame: async () => {
            await faceMeshRef.current.send({ image: videoRef.current })
          },
          width: overlayCanvasRef.current.width,
          height: overlayCanvasRef.current.height,
        })
        cameraRef.current.start()
      }

      setIsLoading(false)
    } catch (err) {
      console.error("Failed to initialize FaceMesh:", err)
      startFaceMeshFallback()
    }
  }

  const handleCapture = () => {
    if (!canvasRef.current) return
    try {
      // Ensure final frame is drawn
      drawFrame()
      composeLayers()
      const imageData = canvasRef.current.toDataURL("image/png")
      onCaptureAction(imageData)
    } catch (err) {
      console.error("Capture failed:", err)
    }
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/80 rounded-lg border-4 border-orange-500">
        <p className="text-white text-center px-4 text-lg font-semibold">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative w-full max-w-xs rounded-lg overflow-hidden border-4 border-orange-500 shadow-2xl bg-black aspect-4/5 seasonal-frame halloween-frame-wrap">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover hidden" playsInline muted />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover object-center" />
      <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full object-cover object-center" />
      <div className="mask-embers"></div>

      <div className="absolute top-3 left-3 z-20 seasonal-watermark seasonal-watermark--live">
        <img src="/white_logo.png" alt="Break-A-Boo" className="h-10 w-auto" />
        <span>Break-A-Boo</span>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-orange-300 text-sm sm:text-base">Loading Face Detection...</p>
          </div>
        </div>
      )}

      {/* Mask Size Slider - Horizontal at Bottom */}
      <div className="group absolute bottom-16 sm:bottom-20 left-1/2 transform -translate-x-1/2 w-32 xs:w-40 sm:w-48 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 z-10 border border-orange-500/40 shadow-lg flex flex-col items-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity duration-300">
        {/* Label and Percentage */}
        <div className="text-center">
          <span className="text-orange-400 text-xs sm:text-sm font-bold block">
            {Math.round(maskSizeMultiplier * 100)}%
          </span>
          <span className="text-orange-300 text-[8px] xs:text-[9px] font-semibold">
            SIZE
          </span>
        </div>

        {/* Horizontal Range Slider */}
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.05"
          value={maskSizeMultiplier}
          onChange={(e) => setMaskSizeMultiplier(parseFloat(e.target.value))}
          onInput={(e) => setMaskSizeMultiplier(parseFloat(e.currentTarget.value))}
          disabled={isLoading}
          className="w-full h-1 xs:h-1.5 appearance-none bg-gradient-to-r from-orange-500 to-orange-500/30 rounded-full cursor-pointer accent-orange-500"
          style={{
            accentColor: '#ea580c',
          } as any}
        />

        {/* Min/Max Labels */}
        <div className="flex justify-between w-full text-[7px] xs:text-[8px] text-orange-400/70 font-semibold">
          <span>0.5x</span>
          <span>2x</span>
        </div>
      </div>

      <Button
        onClick={handleCapture}
        disabled={isLoading}
        className="absolute bottom-3 sm:bottom-4 left-1/2 transform -translate-x-1/2 bg-linear-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-2 sm:py-3 px-6 sm:px-8 rounded-full shadow-lg z-10 text-sm sm:text-base pointer-events-auto active:scale-95"
      >
        📸 Capture
      </Button>
    </div>
  )
}
