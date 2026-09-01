import { useEffect, useState } from 'react'
import { getImageObjectUrl } from '../storage/imageBlobStorage'

export function useImageUrl(imageRef?: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() => {
    if (!imageRef) return undefined
    // If it's a standard URL, path, or data URI, return as-is immediately
    if (
      imageRef.startsWith('http://') ||
      imageRef.startsWith('https://') ||
      imageRef.startsWith('data:') ||
      imageRef.startsWith('/') ||
      imageRef.includes('/')
    ) {
      return imageRef
    }
    return undefined
  })

  useEffect(() => {
    if (!imageRef) {
      setUrl(undefined)
      return
    }

    // Direct path or URL
    if (
      imageRef.startsWith('http://') ||
      imageRef.startsWith('https://') ||
      imageRef.startsWith('data:') ||
      imageRef.startsWith('/') ||
      imageRef.includes('/')
    ) {
      setUrl(imageRef)
      return
    }

    // Otherwise, treat imageRef as IndexedDB Blob ID (e.g. img_...)
    let isSubscribed = true
    getImageObjectUrl(imageRef).then((objectUrl) => {
      if (isSubscribed) {
        setUrl(objectUrl ?? undefined)
      }
    })

    return () => {
      isSubscribed = false
    }
  }, [imageRef])

  return url
}
