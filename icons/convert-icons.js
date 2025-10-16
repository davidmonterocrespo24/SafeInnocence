/**
 * SVG to PNG Icon Converter
 * Converts the icon.svg to PNG files in required sizes
 *
 * Requirements: Install sharp library first:
 * npm install sharp
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'icon.svg');
const sizes = [16, 48, 128];

async function convertSvgToPng() {
  try {
    // Read the SVG file
    const svgBuffer = fs.readFileSync(svgPath);

    // Convert to each required size
    for (const size of sizes) {
      const outputPath = path.join(__dirname, `icon${size}.png`);

      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✓ Created icon${size}.png`);
    }

    console.log('\n✓ All icons created successfully!');
  } catch (error) {
    console.error('Error converting icons:', error);
  }
}

convertSvgToPng();
