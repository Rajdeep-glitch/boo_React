# 👨‍💻 Break-A-Boo Developer Guide

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Visit http://localhost:3000
```

---

## Project Structure

```
d:\boo\
│
├── app/
│   ├── page.tsx              # Main app entry point (state management)
│   ├── layout.tsx            # Root layout (metadata, styles)
│   └── globals.css           # Global styles & animations
│
├── components/
│   ├── camera-view.tsx       # Face detection + mask rendering
│   ├── filter-carousel.tsx   # Swipeable mask selector
│   ├── capture-controls.tsx  # Download/Share/Retake buttons
│   └── ui/                   # Reusable Radix UI components
│
├── public/
│   ├── masks/                # Local mask assets (backup)
│   │   ├── batman.png
│   │   ├── eye.png
│   │   ├── red_skull.png
│   │   ├── joker.png
│   │   └── malificent.png
│   ├── background.png
│   └── -p                    # Other assets
│
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── next.config.mjs           # Next.js config
└── tailwind.config.js        # Tailwind CSS config
```

---

## Core Components

### 1. **page.tsx** - State Management Hub

```typescript
// State variables
const [selectedFilter, setSelectedFilter] = useState(filters[0].id)
const [capturedImage, setCapturedImage] = useState<string | null>(null)
const [showCapture, setShowCapture] = useState(false)

// Props down
<CameraView selectedFilter={selectedFilter} onCapture={handleCapture} />
<FilterCarousel
  filters={filters}
  selectedFilter={selectedFilter}
  onSelectFilter={setSelectedFilter}
/>
<CaptureControls imageData={capturedImage} onRetake={handleRetake} />
```

**Key Points:**

- Center of data flow
- Manages visibility of camera vs preview
- Passes filter selection to camera
- Handles capture callback

---

### 2. **camera-view.tsx** - Face Detection Engine

#### Main Hooks

```typescript
const videoRef = useRef<HTMLVideoElement>(null);
const canvasRef = useRef<HTMLCanvasElement>(null); // Output
const overlayCanvasRef = useRef<HTMLCanvasElement>(null); // Mask layer
const filterImageRef = useRef<HTMLImageElement | null>(null);
const faceMeshRef = useRef<any>(null); // MediaPipe
const cameraRef = useRef<any>(null); // Camera handler
```

#### Key Functions

**`loadFaceMesh()`** - Loads MediaPipe from CDN

```typescript
// Dynamically loads 3 scripts:
// 1. camera_utils.js - Camera handling
// 2. drawing_utils.js - Utilities
// 3. face_mesh.js - Face detection

// Falls back if CDN fails
```

**`calculateFaceMetrics(landmarks[])`** - Computes mask position/scale

```typescript
// Input: 468 facial landmarks from MediaPipe
// Output: FaceMetrics {
//   centerX, centerY  - Face center (normalized)
//   faceWidth, faceHeight - Face dimensions
//   scale - Size multiplier
//   rotation - Head tilt angle
//   yaw, pitch - 3D head pose
// }
```

**`drawMaskOnCanvas(landmarks[])`** - Renders mask

```typescript
// 1. Calculate face metrics
// 2. Apply smoothing to prevent jitter
// 3. Transform canvas (translate, rotate)
// 4. Draw mask image at correct position/scale
```

**`drawFrame()`** - Draws video to canvas

```typescript
// Mirrors video horizontally (flips left-right)
// Ensures selfie view looks natural
```

**`composeLayers()`** - Combines video + mask

```typescript
// Draws overlayCanvas on top of canvasRef
// Result: Video with mask overlay
```

#### Performance Notes

- Smoothing factor: `alpha = 0.55` (prevents jitter)
- Max faces: 1 (single face detection)
- Detection confidence: 0.5 (50% threshold)
- Runs at 30-60 FPS

---

### 3. **filter-carousel.tsx** - Mask Selector

#### Swipe Handling

```typescript
// Mouse events
const handleMouseDown = (e) => {
  setIsDragging(true)
  setStartX(e.clientX)
  setScrollStart(scrollContainerRef.current?.scrollLeft)
}

const handleMouseMove = (e) => {
  if (!isDragging) return
  const walk = (e.clientX - startX) * 1.5  // Drag multiplier
  scrollContainerRef.current.scrollLeft = scrollStart - walk
}

// Touch events (same logic)
const handleTouchStart = (e) => { ... }
const handleTouchMove = (e) => { ... }
```

#### Mask URLs (Updated)

```typescript
const filterImagePaths = {
  batman:
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Batman-z9tq7wLNH79TSDUj0e1fGYqUfKAz2a.png",
  eye: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EYE-e6MQKhRpR1dMRoR1C58gYsxIejR4Ei.png",
  redskull:
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/RED%20SKULL-VpNCTFZwF21rbTee9fV1HQdjsPZ7Bv.png",
  joker:
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/JOCKER-GVyqIY3bWZKrtqAUPWShPTTLqUWeNr.png",
  maleficent:
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MALIFICENT-KKQUMwsI8TC4TzdsovLN6DbxMybAwk.png",
};
```

#### Click to Select

```typescript
onClick={() => {
  onSelectFilter(filter.id)
  // Auto-center selected item
  el?.scrollIntoView({ behavior: "smooth", inline: "center" })
}}
```

---

### 4. **capture-controls.tsx** - Download/Share

#### Download

```typescript
const handleDownload = () => {
  const link = document.createElement("a");
  link.href = imageData; // Base64 PNG
  link.download = `BreakABoo_${getFormattedTimestamp()}.png`;
  // Format: BreakABoo_YYYY-MM-DD-HH-MM-SS.png
  link.click();
};
```

#### Share (Mobile)

```typescript
const handleShare = async () => {
  const blob = await fetch(imageData).then((r) => r.blob());
  const file = new File([blob], "break-a-boo.png", { type: "image/png" });

  if (navigator.share) {
    await navigator.share({
      files: [file],
      title: "Break-A-Boo",
      text: "👻 Check out my spooky Halloween filter!",
    });
  } else {
    handleDownload(); // Fallback
  }
};
```

---

## Common Tasks

### Add a New Mask

1. **Upload to CDN** (Vercel Blob Storage)

   - Get the HTTPS URL

2. **Update URLs in both files:**

   ```typescript
   // components/filter-carousel.tsx
   const filterImagePaths = {
     mynewmask: "https://...",
   };

   // components/camera-view.tsx
   const filterImages = {
     mynewmask: "https://...",
   };
   ```

3. **Add to filter array in app/page.tsx:**

   ```typescript
   const filters = [
     { id: "mynewmask", name: "My New Mask", image: "/masks/mynewmask.png" },
   ];
   ```

4. **Test:**
   ```bash
   npm run dev
   # Check carousel for new mask
   ```

---

### Adjust Mask Smoothing

Edit in `camera-view.tsx`:

```typescript
const alpha = 0.55; // Current: 55% smoothing

// Lower value = jerkier but more responsive
// Higher value = smoother but less reactive
// Range: 0.1 (very jerky) to 0.95 (very smooth)
```

---

### Change Face Detection Confidence

Edit in `camera-view.tsx`:

```typescript
faceMeshRef.current.setOptions({
  minDetectionConfidence: 0.5, // 50% currently
  minTrackingConfidence: 0.5, // 50% currently
});

// Lower = detects more faces (might miss)
// Higher = only clear faces (might not detect)
```

---

### Modify Background Image

Option 1: **Replace in globals.css:**

```css
.app-background {
  background-image: url("https://new-image-url.png");
}
```

Option 2: **In page.tsx:**

```typescript
<main
  style={{
    backgroundImage: `url('https://new-image-url.png')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
>
```

---

### Change Color Scheme

Edit `app/globals.css`:

```css
:root {
  --primary: oklch(0.6 0.2 30); /* Orange */
  --accent: oklch(0.6 0.2 30); /* Orange */
  --chart-1: oklch(0.6 0.2 30); /* Orange */
}
```

- Hue range: 0-360
- Lightness: 0-1
- Chroma: 0-0.4

---

## Testing Checklist

```
Before Deployment:
├─── [ ] Camera opens on load
├─── [ ] All 5 masks display in carousel
├─── [ ] Masks fit properly on face
├─── [ ] Carousel swipe works smoothly
├─── [ ] Carousel click selects mask
├─── [ ] Capture button saves image
├─── [ ] Download works
├─── [ ] Share API works (mobile)
├─── [ ] Retake button returns to camera
├─── [ ] No console errors
├─── [ ] Responsive on mobile (all sizes)
├─── [ ] Responsive on desktop
├─── [ ] Landscape orientation works
├─── [ ] Portrait orientation works
├─── [ ] Performance is smooth (60 FPS)
├─── [ ] Face detection works in low light
├─── [ ] Camera permission error shows
├─── [ ] Build succeeds: npm run build
└─── [ ] Start production: npm start
```

---

## Debugging

### Enable FPS Counter

Add to `camera-view.tsx`:

```typescript
// In drawMaskOnCanvas or animation loop
fpsRef.current.frames++;
if (Date.now() - fpsRef.current.lastTime > 1000) {
  console.log(`FPS: ${fpsRef.current.frames}`);
  fpsRef.current.frames = 0;
  fpsRef.current.lastTime = Date.now();
}
```

### Check Face Metrics

Add to camera-view.tsx after `calculateFaceMetrics()`:

```typescript
console.log("Face Metrics:", {
  center: { x: metrics.centerX, y: metrics.centerY },
  size: { w: metrics.faceWidth, h: metrics.faceHeight },
  rotation: (metrics.rotation * 180) / Math.PI + "deg",
  scale: metrics.scale,
  yaw: metrics.yaw,
  pitch: metrics.pitch,
});
```

### Verify Image Loading

```typescript
// In useEffect for selectedFilter
img.onload = () => {
  console.log(`✅ Loaded: ${filterImages[selectedFilter]}`);
};
img.onerror = () => {
  console.error(`❌ Failed: ${filterImages[selectedFilter]}`);
};
```

### Monitor Network

Chrome DevTools → Network tab:

- Check CDN requests for masks
- Verify image sizes
- Monitor download speeds

### Performance Profiling

Chrome DevTools → Performance tab:

1. Start recording
2. Interact with app
3. Stop recording
4. Analyze frame rendering times
5. Look for jank or dropped frames

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts
# App will be live at vercel-app.vercel.app
```

### Self-Hosted

```bash
# Build
npm run build

# Start production server
npm start

# Serve at http://localhost:3000
# Use reverse proxy (nginx) for HTTPS
```

### Environment Variables

Create `.env.local`:

```
# Currently no env vars needed
# Camera access is client-side only
# All processing happens in browser
```

---

## Troubleshooting

### Camera Not Opening

```
❌ Issue: getUserMedia fails
✅ Solution:
  1. Check HTTPS (production)
  2. Allow camera permission in browser
  3. Try different browser
  4. Check if camera already in use
```

### Face Not Detected

```
❌ Issue: Mask stays centered
✅ Solution:
  1. Improve lighting
  2. Face should be 6-24 inches from camera
  3. Face should fill 30-70% of frame
  4. Try adjusting minDetectionConfidence
  5. Check console for MediaPipe errors
```

### Mask Looks Misaligned

```
❌ Issue: Mask position incorrect
✅ Solution:
  1. Check face detection is working
  2. Try different distances from camera
  3. Turn head slightly side-to-side
  4. Verify mask image loads correctly
  5. Check canvas dimensions match video
```

### Low Performance

```
❌ Issue: Jank/stuttering
✅ Solution:
  1. Close other browser tabs
  2. Check Device → Performance Monitor
  3. Lower video resolution if possible
  4. Disable other extensions
  5. Try Chrome instead of Safari
  6. Reduce smoothing factor (alpha)
```

### Share Not Working

```
❌ Issue: Share API unavailable
✅ Solution:
  1. Only works on HTTPS or localhost
  2. Falls back to download automatically
  3. Desktop browsers don't have Share API
  4. Try mobile browser
  5. Update browser to latest version
```

---

## API Reference

### CameraView Component

```typescript
interface CameraViewProps {
  selectedFilter: string; // Currently selected mask ID
  onCapture: (imageData: string) => void; // Called with base64 PNG
}
```

### FilterCarousel Component

```typescript
interface FilterCarouselProps {
  filters: Filter[];
  selectedFilter: string;
  onSelectFilter: (filterId: string) => void;
}

interface Filter {
  id: string;
  name: string;
  image: string;
}
```

### CaptureControls Component

```typescript
interface CaptureControlsProps {
  imageData: string; // Base64 PNG data
  onRetake: () => void;
}
```

---

## Performance Tips

1. **Canvas Sizing**: Keep canvas resolution reasonable
2. **Image Optimization**: Use compressed PNG/WebP where possible
3. **Smoothing**: Balance between jitter and responsiveness
4. **Memory**: Clear canvases each frame
5. **Rendering**: Use requestAnimationFrame for smooth animations

---

## Browser Support

- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅
- Mobile browsers ✅

---

## Resources

- [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [MDN MediaDevices](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices)
- [MediaPipe Docs](https://mediapipe.dev/)
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev/)

---

## Need Help?

1. Check browser console (F12)
2. Review error messages carefully
3. Check networking (CDN images loading?)
4. Try different browser
5. Clear cache and reload
6. Review this guide and architecture docs

---

**Happy coding! 👻🎃**
