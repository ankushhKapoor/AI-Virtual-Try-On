import { loadOriginalPhoto, saveImageBlob } from './savedLookImages'

const TRANSFER_TYPE = 'trayo-saved-looks'
const TRANSFER_VERSION = 1

function toDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('Could not read an image.'))
    reader.readAsDataURL(blob)
  })
}

async function toBlob(dataUrl) {
  const response = await fetch(dataUrl)
  if (!response.ok) throw new Error('An image in this backup could not be read.')
  return response.blob()
}

function metadataOnly(look) {
  const photo = { ...(look.userPhoto || {}) }
  delete photo.file
  delete photo.previewUrl
  return {
    ...look,
    userPhoto: look.userPhoto ? photo : null,
    resultImage: null,
  }
}

export async function downloadSavedLooksBackup(looks) {
  const records = await Promise.all(looks.map(async (look) => {
    const before = await loadOriginalPhoto(look.userPhoto?.savedImageKey)
    const after = await loadOriginalPhoto(look.resultImageKey)
    return {
      look: metadataOnly(look),
      beforeImage: before ? await toDataUrl(before) : null,
      afterImage: after ? await toDataUrl(after) : null,
    }
  }))
  const backup = {
    type: TRANSFER_TYPE,
    version: TRANSFER_VERSION,
    exportedAt: new Date().toISOString(),
    records,
  }
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `trayo-saved-looks-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return records.length
}

export async function restoreSavedLooksBackup(file, existingIds) {
  const backup = JSON.parse(await file.text())
  if (backup?.type !== TRANSFER_TYPE || backup.version !== TRANSFER_VERSION || !Array.isArray(backup.records)) {
    throw new Error('Choose a valid Trayo Saved Looks backup file.')
  }

  const occupiedIds = new Set(existingIds)
  const restoredLooks = []
  for (const record of backup.records) {
    if (!record?.look?.id) continue
    let id = String(record.look.id)
    while (occupiedIds.has(id)) id = `${record.look.id}-imported-${Date.now()}-${restoredLooks.length}`
    occupiedIds.add(id)

    const beforeKey = record.beforeImage ? `before:${id}` : null
    const afterKey = record.afterImage ? `after:${id}` : null
    if (beforeKey) await saveImageBlob(beforeKey, await toBlob(record.beforeImage))
    if (afterKey) await saveImageBlob(afterKey, await toBlob(record.afterImage))

    restoredLooks.push({
      ...metadataOnly(record.look),
      id,
      userPhoto: record.look.userPhoto ? { ...record.look.userPhoto, savedImageKey: beforeKey } : null,
      resultImageKey: afterKey,
    })
  }
  return restoredLooks
}
