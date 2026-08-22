import { ImagePlus, RefreshCw, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Button from './Button'

const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp']

function ImageUploader({ onImageSelect, onRemove, initialPreview = '', maxSizeMB = 10, className = '' }) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(initialPreview)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!file) {
      setPreview(initialPreview)
      return undefined
    }
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file, initialPreview])

  function handleFile(nextFile) {
    setError('')
    if (!nextFile) return
    if (!acceptedTypes.includes(nextFile.type)) {
      setError('Please upload a JPG, PNG, or WEBP image.')
      return
    }
    if (nextFile.size > maxSizeMB * 1024 * 1024) {
      setError(`Image must be smaller than ${maxSizeMB} MB.`)
      return
    }
    const objectUrl = URL.createObjectURL(nextFile)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      setFile(nextFile)
      onImageSelect?.(nextFile)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      setError('This image could not be read. Please choose another file.')
    }
    image.src = objectUrl
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)
    handleFile(event.dataTransfer.files?.[0])
  }

  function removeImage() {
    setFile(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
    onRemove?.()
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} />
      {preview ? (
        <div className="relative overflow-hidden rounded-md border border-line bg-surface">
          <img src={preview} alt="Selected upload preview" className="aspect-[4/3] w-full object-cover" />
          <div className="absolute right-3 top-3 flex gap-2">
            <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => inputRef.current?.click()}>Replace</Button>
            <button type="button" onClick={removeImage} className="inline-flex size-9 items-center justify-center rounded-md bg-surface text-muted shadow-sm hover:text-danger" aria-label="Remove selected image"><X size={17} aria-hidden="true" /></button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} className={`flex min-h-64 w-full flex-col items-center justify-center rounded-md border border-dashed px-6 py-10 text-center transition-colors ${isDragging ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface hover:border-accent'}`}>
          <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent"><ImagePlus size={22} aria-hidden="true" /></span>
          <span className="font-semibold text-ink">Click to upload or drag and drop</span>
          <span className="mt-2 text-sm text-muted">JPG, PNG, or WEBP up to {maxSizeMB} MB</span>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent"><Upload size={16} aria-hidden="true" /> Choose image</span>
        </button>
      )}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  )
}

export default ImageUploader
