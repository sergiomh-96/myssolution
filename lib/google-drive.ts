/**
 * Downloads a PUBLIC Google Drive file using its URL.
 * No authentication required if the file is "Anyone with the link can view".
 */
export async function downloadPublicDriveFile(url: string): Promise<Buffer | null> {
  try {
    let downloadUrl = url

    // If it's a Google Drive link, transform it to a direct download link
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/(.+?)\//) || url.match(/id=(.+?)(&|$)/)
      const fileId = match ? match[1] : null
      if (fileId) {
        downloadUrl = `https://docs.google.com/uc?export=download&id=${fileId}`
      }
    }

    const response = await fetch(downloadUrl)
    if (!response.ok) return null

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error('Error downloading public file:', error)
    return null
  }
}
