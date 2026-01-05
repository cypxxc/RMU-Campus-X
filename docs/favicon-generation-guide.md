# Favicon Generation Guide

## Current Setup

The project now uses SVG favicons which are supported by all modern browsers:

- `favicon.svg` - Main favicon (copied to favicon.ico for compatibility)
- `icon.svg` - Default icon
- `icon-light.svg` - Light mode icon
- `icon-dark.svg` - Dark mode icon
- `apple-icon.svg` - Apple touch icon

## To Generate True .ico File (Optional)

If you need a true multi-resolution .ico file for older browsers:

### Option 1: Online Tool
1. Go to https://realfavicongenerator.net/
2. Upload `public/favicon.svg`
3. Download the generated favicon.ico
4. Replace `public/favicon.ico`

### Option 2: Using ImageMagick (Command Line)
```bash
# Install ImageMagick first
# Windows: choco install imagemagick
# Mac: brew install imagemagick

# Convert SVG to ICO with multiple sizes
magick convert public/favicon.svg -define icon:auto-resize=16,32,48 public/favicon.ico
```

### Option 3: Using Node.js Package
```bash
npm install -g svg2ico

# Convert
svg2ico public/favicon.svg public/favicon.ico
```

## Current Browser Support

✅ **Modern Browsers** (Chrome, Firefox, Safari, Edge)
- Fully support SVG favicons
- Current setup works perfectly

⚠️ **Older Browsers** (IE11, old Safari)
- May need true .ico file
- Current .ico (copied from SVG) may not display

## Recommendation

For most use cases, the current SVG-based setup is sufficient. Only generate a true .ico file if you need to support very old browsers.
