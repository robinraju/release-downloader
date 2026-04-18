import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import * as tar from 'tar'
import StreamZip from 'node-stream-zip'

import { FileNotFoundError, ReleaseDownloaderError } from './errors.js'

export const extract = async (
  filePath: string,
  destDir: string
): Promise<void> => {
  const filename = path.basename(filePath)

  // Check file exists BEFORE attempting extraction
  if (!fs.existsSync(filePath)) {
    throw new FileNotFoundError(
      filePath,
      'Extract archive',
      'The download may have failed silently, or the file path is incorrect. ' +
        'Check the download logs above for any errors.'
    )
  }

  const isTarGz = filePath.endsWith('.tar.gz') || filePath.endsWith('.tar')
  const isZip = filePath.endsWith('.zip')

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

  try {
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
  } catch (err) {
    // Provide context for extraction failures
    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes('ENOENT')) {
      throw new FileNotFoundError(
        filePath,
        'Extract archive',
        'File disappeared during extraction. Check for disk space or permission issues.'
      )
    }
    throw new ReleaseDownloaderError(
      `Failed to extract '${filename}': ${errMsg}`,
      { filePath, destDir }
    )
  }
}
