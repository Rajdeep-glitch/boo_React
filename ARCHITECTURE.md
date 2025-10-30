# 🏗️ Break-A-Boo Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    BREAK-A-BOO APP FLOW                          │
└─────────────────────────────────────────────────────────────────┘

┌───────────────┐
│  App Load     │
└───────┬───────┘
        │
        ▼
┌──────────────────────────────┐
│  Layout.tsx                  │
│  - Metadata & Viewport       │
│  - Global Styles             │
│  - Background Setup          │
└──────────────┬───────────────┘
               │
               ▼
        ┌─────────────┐
        │  page.tsx   │◄────────┐
        │  - State    │         │
        │  - Layout   │         │
        └──┬──┬──┬────┘         │
           │  │  │             │
    ┌──────┘  │  └──────┐      │
    │         │         │      │
    ▼         ▼         ▼      │
┌────────┐ ┌──────────┐ ┌──────────┐
│Camera  │ │ Carousel │ │ Capture  │
│View    │ │  (Bottom)│ │ Controls │
│(Center)│ │          │ │ (Preview)│
└───┬────┘ └────┬─────┘ └──────────┘
    │           │
    │◄──────────┤  onSelectFilter
    │           │
    └─────┬─────┘
          │
          └─────► onCapture
                  │
                  ▼
            (Preview Screen)
                  │
          ┌───────┴───────┐
          │               │
          ▼               ▼
      Download        Share/Retake
```

---

## Component Communication Flow

```
┌──────────────────────────────────────────────────────────────┐
│                      page.tsx                                 │
│                   (State Manager)                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ State:                                                  │ │
│  │ - selectedFilter: "batman" | "eye" | ...              │ │
│  │ - capturedImage: dataURL | null                        │ │
│  │ - showCapture: boolean                                 │ │
│  └─────────────────────────────────────────────────────────┘ │
│          │                    │                    │          │
│          │                    │                    │          │
│  Props ◄─┘         Props ◄────┘          Props ◄──┘          │
│  │                 │                      │                    │
│  │                 │                      │                    │
│  ▼                 ▼                      ▼                    │
│┌──────────────┐┌──────────────┐┌─────────────────────┐       │
││ CameraView   ││ FilterCarousel││ CaptureControls     │       │
││              ││               ││ (Preview Mode)      │       │
││ Props:       ││ Props:        ││ Props:              │       │
││ - selectedF. ││ - filters[]   ││ - imageData         │       │
││ - onCapture  ││ - onSelectF.  ││ - onRetake          │       │
└┴──────────────┘└──────────────┘└─────────────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

---

## Camera View Component - Internal Flow

```
┌─────────────────────────────────────────────────────────┐
│           camera-view.tsx                               │
│        (Face Detection & Mask Rendering)                │
└─────────────────────────────────────────────────────────┘
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ videoRef     │  │ canvasRef    │  │ overlayCanvasRef
│ (HTMLVideo)  │  │ (Output)     │  │ (Mask Layer)
└──────────────┘  └──────────────┘  └──────────────┘
    │
    ├─────────────────────────┬──────────────────────┐
    │                         │                      │
    ▼                         ▼                      ▼
┌─────────────┐         ┌──────────────┐      ┌──────────────┐
│ MediaPipe   │         │ Landmarks    │      │ Face Metrics │
│ FaceMesh    │────────►│ Detection    │─────►│ Calculation  │
│ (CDN)       │         │ (468 points) │      │ - center     │
└─────────────┘         └──────────────┘      │ - scale      │
                                              │ - rotation   │
                                              └──────┬───────┘
                                                     │
                                                     ▼
                                           ┌─────────────────┐
                                           │ Mask Rendering  │
                                           │ on Canvas       │
                                           │ - Smooth        │
                                           │ - Interpolated  │
                                           │ - Mirrored      │
                                           └─────────────────┘
```

---

## Real-Time Processing Pipeline

```
Frame Processing (every ~16-33ms at 30-60 FPS):

1. VIDEO CAPTURE
   └─► videoRef.current (HTMLVideoElement)

2. FACE DETECTION
   └─► MediaPipe processes frame
       └─► Returns 468 facial landmarks
           └─► Each: {x, y, z} (normalized 0-1)

3. METRICS CALCULATION
   └─► Extract key landmarks (eyes, nose, chin)
   └─► Calculate bounding box (min/max x,y)
   └─► Calculate face center: (minX+maxX)/2, (minY+maxY)/2
   └─► Calculate dimensions: width = maxX-minX, height = maxY-minY
   └─► Calculate rotation angle from eye-to-eye line
   └─► Calculate head pose (yaw & pitch)

4. SMOOTHING
   └─► Interpolate with previous metrics (alpha = 0.55)
   └─► Prevents jitter from detection noise

5. MASK RENDERING
   ├─► Create copy of video frame (mirrored)
   ├─► Load mask image (preloaded)
   ├─► Transform canvas context (translate, rotate)
   └─► Draw mask at calculated position/scale

6. COMPOSITION
   ├─► Draw video frame to canvasRef
   └─► Draw overlay (mask) on top
       └─► Result visible in canvas element

7. OUTPUT
   └─► Rendered canvas displayed in browser
```

---

## Mask Fitting Algorithm

```
STEP 1: Face Detection
────────────────────────
    Let landmarks = [468 facial points from MediaPipe]

    MIN_X = min(all landmarks.x)
    MAX_X = max(all landmarks.x)
    MIN_Y = min(all landmarks.y)
    MAX_Y = max(all landmarks.y)

STEP 2: Face Metrics
────────────────────────
    Center X = (MIN_X + MAX_X) / 2
    Center Y = (MIN_Y + MAX_Y) / 2

    Face Width  = MAX_X - MIN_X  (normalized)
    Face Height = MAX_Y - MIN_Y  (normalized)

    Scale = max(Face Width, Face Height)

    Rotation = atan2(right_eye.y - left_eye.y,
                     right_eye.x - left_eye.x)

STEP 3: Canvas Transformation
────────────────────────────────
    pixelX = (1 - Center X) * canvas_width   // Mirror X
    pixelY = Center Y * canvas_height

    target_width  = Face Width * canvas_width
    target_height = Face Height * canvas_height

    draw_width  = max(target_width, target_height) * 1.25
    draw_height = draw_width * (mask_height / mask_width)

STEP 4: Smoothing
──────────────────
    alpha = 0.55  // 55% smoothing factor

    smooth_x   = prev.x   + (x   - prev.x)   * alpha
    smooth_y   = prev.y   + (y   - prev.y)   * alpha
    smooth_w   = prev.w   + (w   - prev.w)   * alpha
    smooth_h   = prev.h   + (h   - prev.h)   * alpha
    smooth_rot = prev.rot + (rot - prev.rot) * alpha

STEP 5: Canvas Drawing
──────────────────────
    ctx.save()
    ctx.translate(smooth_x, smooth_y)      // Move to face center
    ctx.rotate(smooth_rot)                 // Rotate with head
    ctx.drawImage(mask,
                  -smooth_w/2,              // Centered X
                  -smooth_h/2,              // Centered Y
                  smooth_w,                 // Width
                  smooth_h)                 // Height
    ctx.restore()
```

---

## Data Flow: Capture Process

```
USER CLICKS CAPTURE BUTTON
        │
        ▼
handleCapture() in camera-view.tsx
        │
        ├─► drawFrame()
        │   └─► Mirror video + draw to canvasRef
        │
        ├─► composeLayers()
        │   └─► Draw overlay (mask) on top
        │
        ├─► canvasRef.toDataURL("image/png")
        │   └─► Returns base64 image string
        │
        └─► onCapture(imageData)
            └─► Passed to page.tsx as prop
                    │
                    ▼
            setCapturedImage(imageData)
            setShowCapture(true)
                    │
                    ▼
            Render CaptureControls (preview mode)
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
    Download    Share      Retake
        │           │           │
        ▼           ▼           ▼
   File Save  Share API   Reset State
   (Browser)  (Mobile)    Return to Camera
```

---

## State Management

```
Main App State (page.tsx):
──────────────────────────
┌─────────────────────┐
│ selectedFilter      │ ◄─── Updated by FilterCarousel
│ Default: batman     │      Props: onSelectFilter
└─────────────────────┘

┌─────────────────────┐
│ capturedImage       │ ◄─── Updated by CameraView
│ Type: string | null │      Props: onCapture
│                     │      Or CaptureControls: onRetake
└─────────────────────┘

┌─────────────────────┐
│ showCapture         │ ◄─── Controls which UI to display
│ Type: boolean       │      - False: Camera view + carousel
└─────────────────────┘      - True: Preview + controls
```

---

## Key Performance Optimizations

```
1. CANVAS RENDERING
   ├─► GPU-accelerated via 2D Canvas API
   ├─► Efficient drawImage() calls
   └─► Minimal context switches

2. FACE DETECTION
   ├─► MediaPipe optimized algorithms
   ├─► 468 landmarks (efficient detection)
   ├─► Single-face mode (no multi-face overhead)
   └─► Configurable confidence thresholds

3. SMOOTHING
   ├─► Prevents expensive re-renders
   ├─► 55% interpolation (balance responsiveness)
   └─► Cached previous values

4. IMAGE LOADING
   ├─► Preloaded on mount (useEffect)
   ├─► Stored in refs (no re-renders)
   └─► CDN delivery (fast loading)

5. MEMORY MANAGEMENT
   ├─► Canvas cleared each frame
   ├─► Proper ref cleanup on unmount
   ├─► No memory leaks
   └─► Efficient garbage collection

6. MOBILE OPTIMIZATION
   ├─► Responsive canvas sizing
   ├─► Touch-optimized controls
   ├─► Minimal dependencies
   └─► PWA-ready metadata
```

---

## Browser Compatibility

```
✅ Supported:
├─► Chrome 90+
├─► Edge 90+
├─► Firefox 88+
├─► Safari 14+ (iOS & macOS)
├─► Samsung Internet 14+
└─► Any modern browser with:
    ├─► getUserMedia API
    ├─► Canvas 2D Context
    ├─► WebGL (for performance)
    └─► ES2020+ JavaScript support

⚠️  Notes:
├─► HTTPS required for production camera access
├─► Localhost HTTP allowed for development
├─► Mobile Share API limited to HTTPS
└─► Some older devices may have performance issues
```

---

## Error Handling Strategy

```
Error: Camera Permission Denied
├─► Catch in getUserMedia()
├─► Display error message UI
├─► User can retry via browser settings
└─► No app crash

Error: MediaPipe Load Failure
├─► Catch script loading errors
├─► Fallback to startFaceMeshFallback()
├─► Display centered mask (no detection)
└─► App remains functional

Error: Image Load Failure
├─► Catch in img.onerror()
├─► Console error logged
├─► Still display centered mask
└─► User can retry by reselecting

Error: Canvas Operations
├─► Try-catch in handleCapture()
├─► Console error logged
├─► User notified if critical
└─► Can retry capture
```

---

## Deployment Checklist

```
✅ Code Quality
  ├─► TypeScript strict mode enabled
  ├─► No console errors
  ├─► Build succeeds without warnings
  └─► All components render correctly

✅ Performance
  ├─► 30-60 FPS maintained
  ├─► <3 second load time
  ├─► <100MB memory usage
  └─► Responsive on mobile

✅ Functionality
  ├─► Camera opens and detects faces
  ├─► All 5 masks render correctly
  ├─► Carousel swipe works smoothly
  ├─► Capture saves with correct filename
  ├─► Download works
  ├─► Share API works (mobile)
  └─► Error handling works

✅ Mobile Optimization
  ├─► Responsive layouts (all sizes)
  ├─► Touch-friendly buttons
  ├─► Landscape/portrait support
  ├─► No overflow or scrolling
  └─► Status bar visible (safe area)

✅ Security
  ├─► Client-side only (no server upload)
  ├─► No tracking of images
  ├─► HTTPS ready
  ├─► Content Security Policy compliant
  └─► No sensitive data exposed
```

---

## Future Enhancement Ideas

```
💡 Possible Additions:
├─► Video recording with masks
├─► Multiple face detection
├─► Face filters (AR glasses, etc.)
├─► Real-time effects (sparkles, animations)
├─► Photo filters (saturation, brightness, etc.)
├─► Cloud storage integration
├─► Social media sharing (Twitter, TikTok)
├─► Snapchat-style stickers
├─► Custom mask upload
├─► Face shape detection (round, square, etc.)
├─► Emoji reactions overlay
└─► Leaderboard / contest mode
```

---

This architecture ensures:

- ✅ Smooth real-time performance
- ✅ Reliable face detection
- ✅ Optimal mask fitting
- ✅ Mobile-first experience
- ✅ Error resilience
- ✅ Easy maintenance & scalability
