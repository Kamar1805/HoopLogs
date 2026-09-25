// src/utils/imageCompressor.js
/**
 * Compresses an image file client-side using an HTML5 Canvas.
 * Keeps file size under ~50-80 KB without quality degradation on mobile screens.
 * 
 * @param {File} file - The uploaded image File from <input type="file">
 * @param {number} maxWidth - Maximum width in pixels (default 400px)
 * @param {number} maxHeight - Maximum height in pixels (default 400px)
 * @param {number} quality - JPEG compression ratio 0.0 - 1.0 (default 0.72)
 * @returns {Promise<string>} Base64 data URL string representing the compressed JPEG
 */
export function compressImage(file, maxWidth = 400, maxHeight = 400, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Please select a valid image file.'));
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional scale
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas context could not be created.'));
        }

        // Draw image resized
        ctx.drawImage(img, 0, 0, width, height);

        // Export as compressed JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };

      img.onerror = () => reject(new Error('Failed to load image for compression.'));
      img.src = readerEvent.target.result;
    };

    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}
