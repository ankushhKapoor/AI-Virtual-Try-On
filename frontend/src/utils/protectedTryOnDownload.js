const MAX_DOWNLOAD_EDGE = 1280
const DOWNLOAD_SCALE = 0.72

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The try-on image could not be prepared for download.'))
    image.src = source
  })
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The protected download could not be created.'))
    }, 'image/jpeg', 0.8)
  })
}

/**
 * The displayed try-on remains the original output. Downloads are intentionally
 * rendered as a separate, lower-resolution JPEG with a visible watermark.
 */
export async function downloadProtectedTryOn(source, lookId = 'look') {
  if (!source) throw new Error('No try-on image is available to download.')

  const image = await loadImage(source)
  const sourceWidth = image.naturalWidth || image.width
  const sourceHeight = image.naturalHeight || image.height
  if (!sourceWidth || !sourceHeight) throw new Error('The try-on image has no usable dimensions.')

  const scale = Math.min(DOWNLOAD_SCALE, MAX_DOWNLOAD_EDGE / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Your browser cannot create the protected download.')

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  const fontSize = Math.max(20, Math.round(Math.min(width, height) * 0.06))
  context.save()
  context.translate(width / 2, height / 2)
  context.rotate(-Math.PI / 12)
  context.font = `700 ${fontSize}px system-ui, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineWidth = Math.max(2, Math.round(fontSize / 12))
  context.strokeStyle = 'rgba(0, 0, 0, 0.42)'
  context.fillStyle = 'rgba(255, 255, 255, 0.72)'
  context.strokeText('TRAYO • VIRTUAL TRY-ON', 0, 0)
  context.fillText('TRAYO • VIRTUAL TRY-ON', 0, 0)
  context.restore()

  const blob = await canvasToBlob(canvas)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `trayo-tryon-${lookId}-watermarked.jpg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
