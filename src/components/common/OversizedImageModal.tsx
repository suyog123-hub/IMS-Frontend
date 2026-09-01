import { useState } from 'react'
import { Modal } from './Modal'
import { compressImage } from '../../utils/imageCompressor'
import { toastError, toastSuccess } from '../../utils/toast'

interface OversizedImageModalProps {
  open: boolean
  file: File | null
  fileSizeMB: string | null
  onClose: () => void
  onCompressed: (compressedBlob: Blob) => void | Promise<void>
}

export function OversizedImageModal({
  open,
  file,
  fileSizeMB,
  onClose,
  onCompressed,
}: OversizedImageModalProps) {
  const [isCompressing, setIsCompressing] = useState(false)

  if (!open || !fileSizeMB || !file) return null

  const handleCompress = async () => {
    setIsCompressing(true)
    try {
      const compressedBlob = await compressImage(file, 2 * 1024 * 1024)
      await onCompressed(compressedBlob)
      const compressedMB = (compressedBlob.size / (1024 * 1024)).toFixed(2)
      toastSuccess(`Image compressed successfully from ${fileSizeMB} MB to ${compressedMB} MB!`)
      onClose()
    } catch {
      toastError('Failed to compress image. Please choose a smaller image.')
    } finally {
      setIsCompressing(false)
    }
  }

  return (
    <Modal open={open} onClose={isCompressing ? undefined : onClose} title="Image Size Exceeded" width="sm">
      <div style={{ textAlign: 'center', padding: '8px 4px 16px 4px' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
          File Size Exceeds 2 MB Limit
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>
          The image you selected is <strong>{fileSizeMB} MB</strong>, which exceeds the maximum limit of <strong>2.00 MB</strong>.
          <br />
          <br />
          Would you like the system to automatically compress and upload it for you?
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCompress}
            disabled={isCompressing}
            style={{ minWidth: '150px' }}
          >
            {isCompressing ? 'Compressing...' : '⚡ Compress & Upload'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={isCompressing}
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}
