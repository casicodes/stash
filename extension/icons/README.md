# Extension Icons

Chrome extensions require PNG icons. Generate them from the SVG source:

## Using ImageMagick (recommended)

```bash
# Install ImageMagick if needed
# macOS: brew install imagemagick
# Ubuntu: sudo apt install imagemagick

# Generate all sizes
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png
```

## Using an online tool

1. Open [CloudConvert](https://cloudconvert.com/svg-to-png) or similar
2. Upload `icon.svg`
3. Download at sizes: 16x16, 48x48, 128x128
4. Rename files to `icon16.png`, `icon48.png`, `icon128.png`

## Quick placeholder (for testing)

You can temporarily use any 16x16, 48x48, and 128x128 PNG images renamed to the correct filenames. The extension will still load and function.
