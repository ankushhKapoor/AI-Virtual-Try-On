import { ImageIcon } from 'lucide-react'

function PhotoPreview({ src, alt = 'Your selected photo', className = '' }) {
  return <div className={`overflow-hidden rounded-md border border-line bg-canvas ${className}`}>{src ? <img src={src} alt={alt} className="h-full w-full object-contain" /> : <div className="flex aspect-[4/3] items-center justify-center text-muted"><ImageIcon size={28} aria-hidden="true" /></div>}</div>
}

export default PhotoPreview
