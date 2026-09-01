import type { ImgHTMLAttributes } from 'react'
import { useImageUrl } from '../../hooks/useImageUrl'

interface AppImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string
}

export function AppImage({ src, alt, ...props }: AppImageProps) {
  const resolvedSrc = useImageUrl(src)

  if (!resolvedSrc) {
    return null
  }

  return <img src={resolvedSrc} alt={alt || ''} {...props} />
}
