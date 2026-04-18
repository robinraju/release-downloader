import { jest } from '@jest/globals'
import * as fs from 'fs'
import * as http from 'http'
import * as os from 'os'
import * as path from 'path'
import { PassThrough } from 'stream'

import * as handlers from 'typed-rest-client/Handlers.js'
import * as io from '@actions/io'
import * as thc from 'typed-rest-client/HttpClient.js'
import nock from 'nock'

import { FileNotFoundError, HttpError } from '../src/errors.js'
import { IReleaseDownloadSettings } from '../src/download-settings.js'
import { GithubRelease } from '../src/gh-api.js'
import { ReleaseDownloader } from '../src/release-downloader.js'
import { IHttpClientResponse } from 'typed-rest-client/Interfaces.js'

const createSettings = (
  overrides: Partial<IReleaseDownloadSettings> = {}
): IReleaseDownloadSettings => ({
  sourceRepoPath: 'robinraju/probable-potato',
  isLatest: true,
  preRelease: false,
  tag: '',
  id: '',
  fileName: 'test-1.txt',
  tarBall: false,
  zipBall: false,
  extractAssets: false,
  extractPath: '',
  outFilePath: '',
  ...overrides
})

const createRelease = (
  overrides: Partial<GithubRelease> = {}
): GithubRelease => ({
  name: 'Release 1.0.0',
  id: 1,
  tag_name: '1.0.0',
  prerelease: false,
  assets: [
    {
      name: 'test-1.txt',
      url: 'https://api.github.com/repos/robinraju/probable-potato/releases/assets/1'
    }
  ],
  tarball_url:
    'https://api.github.com/repos/robinraju/probable-potato/tarball/1.0.0',
  zipball_url:
    'https://api.github.com/repos/robinraju/probable-potato/zipball/1.0.0',
  ...overrides
})

const getSaveFile = (
  downloader: ReleaseDownloader
): ((
  outputPath: string,
  fileName: string,
  response: IHttpClientResponse
) => Promise<string>) =>
  Reflect.get(downloader, 'saveFile') as (
    outputPath: string,
    fileName: string,
    response: IHttpClientResponse
  ) => Promise<string>

describe('ReleaseDownloader error handling', () => {
  let downloader: ReleaseDownloader
  let outputFilePath: string

  beforeEach(() => {
    const credentialHandler = new handlers.BearerCredentialHandler('', false)
    const httpClient = new thc.HttpClient('gh-api-client', [credentialHandler])

    outputFilePath = fs.mkdtempSync(
      path.join(os.tmpdir(), 'release-downloader-')
    )
    downloader = new ReleaseDownloader(httpClient, 'https://api.github.com')
  })

  afterEach(async () => {
    nock.cleanAll()
    jest.restoreAllMocks()
    await io.rmRF(outputFilePath)
  })

  test('throws HttpError when the latest release request fails', async () => {
    nock('https://api.github.com')
      .get('/repos/robinraju/probable-potato/releases/latest')
      .reply(404)

    await expect(
      downloader.download(createSettings({ outFilePath: outputFilePath }))
    ).rejects.toThrow(HttpError)
  })

  test('throws HttpError when the release-by-tag request fails', async () => {
    nock('https://api.github.com')
      .get('/repos/robinraju/probable-potato/releases/tags/v9.9.9')
      .reply(404)

    await expect(
      downloader.download(
        createSettings({
          isLatest: false,
          tag: 'v9.9.9',
          outFilePath: outputFilePath
        })
      )
    ).rejects.toThrow(HttpError)
  })

  test('throws HttpError when the release-by-id request fails', async () => {
    nock('https://api.github.com')
      .get('/repos/robinraju/probable-potato/releases/999')
      .reply(404)

    await expect(
      downloader.download(
        createSettings({
          isLatest: false,
          id: '999',
          outFilePath: outputFilePath
        })
      )
    ).rejects.toThrow(HttpError)
  })

  test('throws HttpError when an asset download fails', async () => {
    nock('https://api.github.com')
      .get('/repos/robinraju/probable-potato/releases/latest')
      .reply(200, createRelease())

    nock('https://api.github.com', {
      reqheaders: { accept: 'application/octet-stream' }
    })
      .get('/repos/robinraju/probable-potato/releases/assets/1')
      .reply(404)

    await expect(
      downloader.download(createSettings({ outFilePath: outputFilePath }))
    ).rejects.toThrow(HttpError)
  })

  test('supports valid zero-byte assets', async () => {
    nock('https://api.github.com')
      .get('/repos/robinraju/empty-assets/releases/latest')
      .reply(
        200,
        createRelease({
          assets: [
            {
              name: 'empty.txt',
              url: 'https://api.github.com/repos/robinraju/empty-assets/releases/assets/1'
            }
          ]
        })
      )

    nock('https://api.github.com', {
      reqheaders: { accept: 'application/octet-stream' }
    })
      .get('/repos/robinraju/empty-assets/releases/assets/1')
      .reply(200, '')

    const result = await downloader.download(
      createSettings({
        sourceRepoPath: 'robinraju/empty-assets',
        fileName: 'empty.txt',
        outFilePath: outputFilePath
      })
    )

    expect(result).toHaveLength(1)
    expect(fs.statSync(result[0]).size).toBe(0)
  })

  test('surfaces file write failures as ReleaseDownloaderError', async () => {
    const blockingPath = path.join(outputFilePath, 'blocking-file')

    fs.writeFileSync(blockingPath, 'blocked')

    nock('https://api.github.com')
      .get('/repos/robinraju/probable-potato/releases/latest')
      .reply(200, createRelease())

    nock('https://api.github.com', {
      reqheaders: { accept: 'application/octet-stream' }
    })
      .get('/repos/robinraju/probable-potato/releases/assets/1')
      .reply(200, 'downloaded data')

    await expect(
      downloader.download(createSettings({ outFilePath: blockingPath }))
    ).rejects.toMatchObject({
      name: 'ReleaseDownloaderError',
      message: expect.stringContaining("Failed to write 'test-1.txt'")
    })
  })

  test('surfaces response stream failures while saving a file', async () => {
    const saveFile = getSaveFile(downloader)
    const message = new PassThrough()
    const response: IHttpClientResponse = {
      message: message as unknown as http.IncomingMessage,
      readBody: async (): Promise<string> => ''
    }

    message.pipe = ((
      destination: NodeJS.WritableStream
    ): NodeJS.WritableStream => {
      const fileStream = destination as fs.WriteStream

      process.nextTick(() => {
        fileStream.close()
        message.emit('error', new Error('socket hang up'))
        message.destroy()
      })

      return fileStream
    }) as typeof message.pipe

    const result = saveFile(outputFilePath, 'broken.txt', response)

    await expect(result).rejects.toMatchObject({
      name: 'ReleaseDownloaderError',
      message: "Download stream failed for 'broken.txt': socket hang up"
    })
  })

  test('throws FileNotFoundError when the downloaded file is missing after close', async () => {
    const saveFile = getSaveFile(downloader)
    const missingFilePath = path.resolve(
      outputFilePath,
      'missing-after-close.txt'
    )
    const message = new PassThrough()
    const response: IHttpClientResponse = {
      message: message as unknown as http.IncomingMessage,
      readBody: async (): Promise<string> => ''
    }

    message.pipe = ((
      destination: NodeJS.WritableStream
    ): NodeJS.WritableStream => {
      const fileStream = destination as fs.WriteStream

      fileStream.once('close', () => {
        if (fs.existsSync(missingFilePath)) {
          fs.unlinkSync(missingFilePath)
        }
      })

      fileStream.once('open', () => {
        fileStream.close()
      })

      return fileStream
    }) as typeof message.pipe

    const result = saveFile(outputFilePath, 'missing-after-close.txt', response)

    await expect(result).rejects.toThrow(FileNotFoundError)
  })
})
