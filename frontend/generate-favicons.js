const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputImage = path.join(__dirname, 'public', 'therapist.jpg');
const outputDir = path.join(__dirname, 'public');

async function generateFavicons() {
  try {
    // Generate favicon.ico (32x32)
    await sharp(inputImage)
      .resize(32, 32)
      .toFile(path.join(outputDir, 'favicon-32x32.png'));

    // Generate favicon-96x96.png
    await sharp(inputImage)
      .resize(96, 96)
      .toFile(path.join(outputDir, 'favicon-96x96.png'));

    // Generate apple-touch-icon.png (180x180)
    await sharp(inputImage)
      .resize(180, 180)
      .toFile(path.join(outputDir, 'apple-touch-icon.png'));

    // Generate favicon-16x16.png
    await sharp(inputImage)
      .resize(16, 16)
      .toFile(path.join(outputDir, 'favicon-16x16.png'));

    console.log('✅ All favicon files generated successfully!');
    console.log('Generated files:');
    console.log('  - favicon-16x16.png');
    console.log('  - favicon-32x32.png');
    console.log('  - favicon-96x96.png');
    console.log('  - apple-touch-icon.png');
  } catch (error) {
    console.error('Error generating favicons:', error);
  }
}

generateFavicons();
