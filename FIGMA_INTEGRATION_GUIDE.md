# 🎨 Figma to React Native Integration Guide

**Purpose:** Streamline importing Figma designs into the Snack Track mobile app  
**Target:** Wrapped journey slides, graphics, and UI components

---

## Quick Reference

### Export Settings (Figma)
- **Format:** PNG (2x or 3x for retina)
- **Size:** 1170x2532 (iPhone 14 Pro Max) or 1284x2778 (iPhone 15 Pro Max)
- **Background:** Transparent for components, solid for full screens
- **Naming:** Use kebab-case (e.g., `damage-slide@3x.png`)

### Import Locations (Project)
```
assets/
  ├── wrapped/           # Wrapped journey slides
  │   ├── slide-1-damage.png
  │   ├── slide-2-guilty.png
  │   └── ...
  ├── graphics/          # Shareable graphics
  │   ├── summary-card.png
  │   └── ...
  └── icons/            # Custom icons
      └── ...
```

---

## Component Types

### 1. Full-Screen Slides (Wrapped Journey)

**Figma Preparation:**
- Canvas size: 1170x2532 or 1284x2778
- Export as PNG @2x or @3x
- Include all text, graphics, and backgrounds
- Ensure colors match gradient scheme

**Integration:**
```typescript
// In WrappedShareJourney.tsx
import slide1Image from '../../assets/wrapped/slide-1-damage.png';

// Replace renderContent with image
{
  gradient: ['#ff6b6b', '#ee5a6f'],
  renderContent: (data) => (
    <View style={styles.slideContent}>
      <Image 
        source={slide1Image} 
        style={styles.fullScreenImage}
        resizeMode="cover"
      />
      {/* Overlay dynamic text on top */}
      <Text style={styles.overlayText}>{formatCurrency(data.totalSpent)}</Text>
    </View>
  ),
}
```

**Dynamic Data Overlays:**
- Use `position: 'absolute'` to overlay text on images
- Match Figma text positions with `top`, `left` coordinates
- Use same fonts and sizes from Figma

---

### 2. Shareable Graphics (Social Media)

**Figma Preparation:**
- Instagram Stories: 1080x1920
- Instagram Post: 1080x1080
- Twitter: 1200x675
- Generic: 1200x1200 (square)

**Integration:**
```typescript
// In ShareableGraphics.tsx
import summaryGraphic from '../../assets/graphics/summary-card.png';

export const SummaryGraphic = ({ analytics }: Props) => (
  <View style={styles.container}>
    <ImageBackground source={summaryGraphic} style={styles.background}>
      {/* Overlay dynamic data */}
      <Text style={styles.totalSpent}>{formatCurrency(analytics.totalSpent)}</Text>
      <Text style={styles.receiptCount}>{analytics.totalReceipts} receipts</Text>
    </ImageBackground>
  </View>
);
```

---

### 3. UI Components (Buttons, Cards, etc.)

**Figma Preparation:**
- Export individual components
- Include all states (default, pressed, disabled)
- Use consistent naming (e.g., `button-primary.png`, `button-primary-pressed.png`)

**Integration:**
```typescript
// Create reusable component
import buttonBg from '../../assets/ui/button-primary.png';

export const FigmaButton = ({ title, onPress }: Props) => (
  <TouchableOpacity onPress={onPress}>
    <ImageBackground source={buttonBg} style={styles.button}>
      <Text style={styles.buttonText}>{title}</Text>
    </ImageBackground>
  </TouchableOpacity>
);
```

---

## Workflow: Figma → Code

### Step 1: Design in Figma
1. Create designs at target resolution
2. Name layers clearly
3. Organize into frames
4. Document dynamic text positions

### Step 2: Export Assets
```
For each slide/graphic:
1. Select frame in Figma
2. Export Settings:
   - Format: PNG
   - Scale: 2x (retina) or 3x (super retina)
3. Name clearly (e.g., slide-1-damage@2x.png)
4. Download
```

### Step 3: Add to Project
```bash
# Move files to assets folder
mv ~/Downloads/slide-*.png assets/wrapped/

# If using @3x exports, React Native auto-detects
# slide-1-damage@3x.png will be used on high-res screens
```

### Step 4: Import in Component
```typescript
// Static import (bundled with app)
import slide1 from '../../assets/wrapped/slide-1-damage.png';

<Image source={slide1} style={styles.slide} />

// Or require (dynamic)
<Image source={require('../../assets/wrapped/slide-1-damage.png')} />
```

### Step 5: Add Dynamic Text Overlays
```typescript
<View style={styles.slideContainer}>
  <Image source={slideBackground} style={styles.background} />
  
  {/* Position text exactly where Figma shows it */}
  <Text style={[styles.totalSpent, {
    position: 'absolute',
    top: 320,      // Measure from Figma
    left: 60,      // Measure from Figma
  }]}>
    {formatCurrency(analytics.totalSpent)}
  </Text>
</View>
```

---

## Advanced: Image-Based Slides with ViewShot

### Current Approach (Code-Based)
```typescript
// Slides are built with React Native components
<LinearGradient>
  <Text>{data.totalSpent}</Text>
  <View>{/* Chart */}</View>
</LinearGradient>

// Captured with ViewShot for sharing
```

### Figma Approach (Image-Based)
```typescript
// Slides are Figma images with dynamic overlays
<ImageBackground source={figmaSlide}>
  <Text style={absolutePosition}>{data.totalSpent}</Text>
</ImageBackground>

// Captured with ViewShot for sharing
```

**Benefits:**
- Pixel-perfect designs
- Complex graphics without code
- Designer controls visual quality

**Trade-offs:**
- Larger app bundle size
- Text positioning requires manual coordinates
- Less flexible for dynamic layouts

**Recommendation:** Use Figma for hero slides (Slide 1, 5), code for data-heavy slides (charts)

---

## Performance Optimization

### Image Optimization
```bash
# Before adding to project, optimize PNGs
pngquant --quality=80-95 slide-*.png

# Or use online tool: https://tinypng.com/
```

### Lazy Loading
```typescript
// For non-critical images
import { Image } from 'react-native';

<Image 
  source={slideImage}
  fadeDuration={200}  // Smooth fade-in
  progressiveRenderingEnabled={true}  // Show progressively
/>
```

### Bundle Size
- Keep individual images < 500KB
- Total assets < 5MB for all wrapped slides
- Use WebP format if supported (smaller than PNG)

---

## Typography from Figma

### Extract Font Information
```
In Figma:
1. Select text layer
2. Note: Font family, weight, size, line height, letter spacing
3. Translate to React Native:

Figma: 
  - Font: Inter Bold
  - Size: 32px
  - Line Height: 38px (118%)
  - Letter Spacing: -0.5px

React Native:
  fontFamily: 'Inter-Bold'  // Must install font
  fontSize: 32
  lineHeight: 38
  letterSpacing: -0.5
```

### Custom Fonts
```bash
# Add fonts to project
1. Download font files (.ttf or .otf)
2. Create assets/fonts/ directory
3. Add fonts:
   assets/fonts/Inter-Bold.ttf
   assets/fonts/Inter-Regular.ttf

4. Update app.json:
{
  "expo": {
    "fonts": [
      "./assets/fonts/Inter-Bold.ttf",
      "./assets/fonts/Inter-Regular.ttf"
    ]
  }
}

5. Load in app:
import { useFonts } from 'expo-font';

const [fontsLoaded] = useFonts({
  'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
});
```

---

## Color Schemes from Figma

### Extract and Define Colors
```typescript
// Create constants/colors.ts
export const Colors = {
  // From Figma design system
  primary: '#007AFF',
  secondary: '#5856D6',
  
  // Gradients (match Figma exactly)
  gradient1: ['#ff6b6b', '#ee5a6f'],
  gradient2: ['#f093fb', '#f5576c'],
  gradient3: ['#4facfe', '#00f2fe'],
  gradient4: ['#667eea', '#764ba2'],
  gradient5: ['#43e97b', '#38f9d7'],
  
  // Semantic colors
  background: '#f8f9fa',
  text: '#1a1a1a',
  textSecondary: '#666',
  error: '#ff3b30',
  success: '#34C759',
};

// Use in components
<LinearGradient colors={Colors.gradient1}>
```

---

## Positioning Guide

### Method 1: Manual Coordinates (Precise)
```typescript
// Measure positions in Figma (Inspector panel)
<View style={styles.container}>
  <Image source={background} />
  <Text style={{
    position: 'absolute',
    top: 280,     // From Figma
    left: 60,     // From Figma
    width: 300,   // From Figma
  }}>
    Dynamic text here
  </Text>
</View>
```

### Method 2: Percentage-Based (Responsive)
```typescript
// Better for multiple screen sizes
const { width, height } = Dimensions.get('window');

<Text style={{
  position: 'absolute',
  top: height * 0.35,    // 35% from top
  left: width * 0.1,     // 10% from left
}}>
```

### Method 3: Flexbox (Most Flexible)
```typescript
// Recreate Figma layout with flexbox
<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
  <Text>Centered like in Figma</Text>
</View>
```

---

## Testing Figma Imports

### Checklist
- [ ] Image loads without errors
- [ ] Image is crisp on device (not blurry)
- [ ] Dynamic text positions correctly
- [ ] Text is readable on all screen sizes
- [ ] Colors match Figma exactly
- [ ] Gradients render smoothly
- [ ] ViewShot capture works (for sharing)
- [ ] Performance is smooth (no lag)

### Common Issues

**Blurry Images:**
- Solution: Export @3x from Figma
- Or use higher resolution source

**Wrong Colors:**
- Solution: Use hex codes from Figma directly
- Check if gradient direction matches

**Text Doesn't Fit:**
- Solution: Add `adjustsFontSizeToFit` and `numberOfLines={1}`
- Or use smaller font size

**Large Bundle Size:**
- Solution: Compress images with pngquant or TinyPNG
- Consider WebP format

---

## Current Slide Structure

### Wrapped Journey Slides (5 total)

**Slide 1: The Damage**
- Current: Code-based (LinearGradient + Text)
- Figma Ready: Can replace with image + text overlays
- Dynamic Data: totalSpent, comparison text

**Slide 2: Guilty Pleasure**
- Current: Code-based
- Figma Ready: Can replace with image + text overlays
- Dynamic Data: mostExpensiveOrder, topRestaurant.name

**Slide 3: Repeat Offender**
- Current: Code-based
- Figma Ready: Can replace with image + text overlays
- Dynamic Data: topRestaurant.name, count, totalSpent

**Slide 4: Yearly/Monthly Bloodbath**
- Current: Code-based chart
- Figma: Should stay code-based (dynamic data visualization)
- Alternative: Export chart as template, overlay dynamic bars

**Slide 5: Share CTA**
- Current: Code-based
- Figma Ready: Can be pure image (no dynamic data)

---

## Recommended Approach

### Phase 1: Start Simple
1. Design Slide 1 (The Damage) in Figma
2. Export and integrate as proof of concept
3. Verify ViewShot capture works
4. Test sharing to Instagram

### Phase 2: Scale Up
5. Design remaining slides
6. Create variations (different copy options)
7. A/B test different designs

### Phase 3: Optimize
8. Compress all images
9. Implement lazy loading
10. Add loading states

---

## File Naming Convention

### Slide Images
```
slide-{number}-{name}@{scale}.png

Examples:
- slide-1-damage@3x.png
- slide-2-guilty@3x.png
- slide-3-repeat@3x.png
- slide-5-cta@3x.png
```

### Graphic Variations
```
{type}-{variant}@{scale}.png

Examples:
- summary-default@3x.png
- summary-dark@3x.png
- summary-instagram@3x.png
```

### UI Components
```
{component}-{state}@{scale}.png

Examples:
- button-primary@3x.png
- button-primary-pressed@3x.png
- card-background@3x.png
```

---

## Dynamic Text Positioning Template

```typescript
// Document Figma positions for each dynamic text element
const positions = {
  slide1: {
    totalSpent: { top: 320, left: 60, width: 300 },
    comparison: { top: 450, left: 80, width: 260 },
    roastText: { top: 600, left: 40, width: 340 },
  },
  slide2: {
    expenseAmount: { top: 280, left: 100, width: 200 },
    restaurantName: { top: 380, left: 60, width: 300 },
  },
  // ... etc
};

// Use in component
<View style={styles.slideContainer}>
  <Image source={figmaBackground} style={styles.fullScreen} />
  <Text style={[styles.dynamicText, positions.slide1.totalSpent]}>
    {formatCurrency(analytics.totalSpent)}
  </Text>
</View>
```

---

## Next Steps

1. **Create Figma file** with slide templates
2. **Export first slide** to test integration
3. **Update WrappedShareJourney.tsx** to use images
4. **Test and iterate** on positioning
5. **Complete all slides** once process is smooth
6. **Optimize and compress** before final commit

---

## Resources

- [React Native Image Docs](https://reactnative.dev/docs/image)
- [Expo ImageBackground](https://docs.expo.dev/versions/latest/react-native/imagebackground/)
- [Figma Export Guide](https://help.figma.com/hc/en-us/articles/360040028114-Export-from-Figma)
- [TinyPNG Compression](https://tinypng.com/)

