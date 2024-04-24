import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import * as tar from 'tar'
import * as StreamZip from 'node-stream-zip'

export const extract = async (
  filePath: string,
  destDir: string
): Promise<void> => {
  const isTarGz = filePath.endsWith('.tar.gz') || filePath.endsWith('.tar')
  const isZip = filePath.endsWith('.zip')
  const filename = path.basename(filePath)

  if (!isTarGz && !isZip) {
    core.warning(
      `The file ${filename} is not a supported archive. It will be skipped`
    )
    return
  }

  // Create the destination directory if it doesn't already exist
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }

  // Extract the file to the destination directory
  if (isTarGz) {
    await tar.x({
      file: filePath,
      cwd: destDir
    })
  }
  if (isZip) {
    const zip = new StreamZip.async({ file: filePath })
    await zip.extract(null, destDir)
    await zip.close()
  }
  core.info(`Extracted ${filename} to ${destDir}`)
}
