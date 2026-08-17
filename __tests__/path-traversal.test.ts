import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as handlers from 'typed-rest-client/Handlers.js'
import * as io from '@actions/io'
import * as thc from 'typed-rest-client/HttpClient.js'
import nock from 'nock'

import { IReleaseDownloadSettings } from '../src/download-settings.js'
import { ReleaseDownloader } from '../src/release-downloader.js'

// Regression test for the path-traversal fix in saveFile().
// A release asset name is attacker-controllable (a compromised release author,
// or a tampered API response). A name like "../foo" must not let the download
// escape the configured output directory (CWE-22).
describe('saveFile path traversal protection', () => {
  let downloader: ReleaseDownloader
  let httpClient: thc.HttpClient
  let workDir: string
  let outDir: string

  beforeEach(() => {
    const credentialHandler = new handlers.BearerCredentialHandler('', false)
    httpClient = new thc.HttpClient('gh-api-client', [credentialHandler])
    downloader = new ReleaseDownloader(httpClient, 'https://api.github.com')

    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rd-traversal-'))
    outDir = path.join(workDir, 'downloads')
    fs.mkdirSync(outDir, { recursive: true })
  })

  afterEach(async () => {
    nock.cleanAll()
    await io.rmRF(workDir)
  })

  test('keeps a traversal-named asset inside the output directory', async () => {
    const maliciousName = '../pwned.txt'

    nock('https://api.github.com')
      .get('/repos/robinraju/probable-potato/releases/latest')
      .reply(200, {
        id: 1,
        tag_name: '1.0.0',
        name: 'malicious release',
        prerelease: false,
        assets: [
          {
            name: maliciousName,
            url: 'https://api.github.com/repos/robinraju/probable-potato/releases/assets/1'
          }
        ],
        tarball_url: '',
        zipball_url: ''
      })

    nock('https://api.github.com', {
      reqheaders: { accept: 'application/octet-stream' }
    })
      .get('/repos/robinraju/probable-potato/releases/assets/1')
      .reply(200, 'pwned')

    const settings: IReleaseDownloadSettings = {
      sourceRepoPath: 'robinraju/probable-potato',
      isLatest: true,
      preRelease: false,
      tag: '',
      id: '',
      // Exact match so the crafted asset is resolved for download.
      fileName: maliciousName,
      tarBall: false,
      zipBall: false,
      extractAssets: false,
      outFilePath: outDir,
      extractPath: outDir
    }

    const result = await downloader.download(settings)

    // The file lands inside outDir, sanitized to its base name.
    expect(result).toHaveLength(1)
    expect(path.resolve(result[0])).toBe(path.join(outDir, 'pwned.txt'))
    expect(fs.existsSync(path.join(outDir, 'pwned.txt'))).toBe(true)

    // It must NOT escape one level up to the traversal target.
    expect(fs.existsSync(path.join(workDir, 'pwned.txt'))).toBe(false)
  }, 10000)
})
