import { Check, Download, ExternalLink, Share2, Sparkles } from 'lucide-react'
import Button from '../Button'

function ResultActions({
  result,
  isSaved,
  onSave,
  onDownload,
  onTryAnother,
  onViewProduct,
  onShare,
}) {
  const hasImage = Boolean(result?.resultImage)

  function handleDownloadClick() {
    if (onDownload) {
      onDownload(result)
    } else if (result?.resultImage) {
      const link = document.createElement('a')
      link.href = result.resultImage
      link.download = `vesta-tryon-${result.id || 'look'}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Button size="lg" onClick={onTryAnother} icon={Sparkles}>
          Try Another Clothing
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={onSave}
          icon={isSaved ? Check : undefined}
        >
          {isSaved ? 'Saved Look' : 'Save Look'}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Button size="sm" variant="ghost" onClick={onViewProduct} icon={ExternalLink}>
          View Product
        </Button>
        <Button size="sm" variant="ghost" onClick={onShare} icon={Share2}>
          Share
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!hasImage}
          onClick={handleDownloadClick}
          icon={Download}
          title={
            hasImage
              ? 'Download result locally'
              : 'Download becomes available when a generated result exists'
          }
        >
          Download
        </Button>
      </div>
    </div>
  )
}

export default ResultActions
