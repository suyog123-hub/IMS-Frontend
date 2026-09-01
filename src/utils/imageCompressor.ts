/**
 * Compresses an image File down below maxSizeBytes (default 2 MB) using HTML5 Canvas.
 */
export async function compressImage(
  file: File,
  maxSizeBytes: number = 2 * 1024 * 1024,
): Promise<Blob> {
  // If already smaller than maxSizeBytes, return as-is
  if (file.size <= maxSizeBytes) {
    return file
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = (event) => {
      const img = new Image()
      img.src = String(event.target?.result ?? '')

      img.onload = async () => {
        let width = img.width
        let height = img.height
        const maxDimension = 1920

        // Scale down dimensions if image is huge
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context unavailable'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Try compressing with decreasing quality until size <= maxSizeBytes
        let quality = 0.85
        let blob: Blob | null = null

        while (quality >= 0.2) {
          blob = await new Promise<Blob | null>((res) => {
            canvas.toBlob((b) => res(b), 'image/jpeg', quality)
          })

          if (blob && blob.size <= maxSizeBytes) {
            resolve(blob)
            return
          }

          quality -= 0.15
        }

        // If quality drop wasn't enough, scale down dimensions by half and try again
        canvas.width = Math.round(width / 2)
        canvas.height = Math.round(height / 2)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        blob = await new Promise<Blob | null>((res) => {
          canvas.toBlob((b) => res(b), 'image/jpeg', 0.75)
        })

        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Image compression failed'))
        }
      }

      img.onerror = (err) => reject(err)
    }

    reader.onerror = (err) => reject(err)
  })
}
