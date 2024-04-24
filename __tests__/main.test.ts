import * as fs from 'fs'
import * as path from 'path'
import * as handlers from 'typed-rest-client/Handlers'
import * as io from '@actions/io'
import * as thc from 'typed-rest-client/HttpClient'

import { IReleaseDownloadSettings } from '../src/download-settings'
import { ReleaseDownloader } from '../src/release-downloader'
import nock from 'nock'
import { extract } from '../src/unarchive'

let downloader: ReleaseDownloader
let httpClent: thc.HttpClient
const outputFilePath = './test-output'

beforeEach(() => {
  const githubtoken = process.env.REPO_TOKEN || ''
  const githubApiUrl = 'https://api.github.com'

  const credentialHandler = new handlers.BearerCredentialHandler(
    githubtoken,
    false
  )
  httpClent = new thc.HttpClient('gh-api-client', [credentialHandler])
  downloader = new ReleaseDownloader(httpClent, githubApiUrl)

  nock('https://api.github.com')
    .get('/repos/robinraju/probable-potato/releases/latest')
    .reply(200, readFromFile('1-release-latest.json'))

  nock('https://api.github.com')
    .get('/repos/robinraju/probable-potato/releases/68092191')
    .reply(200, readFromFile('1-release-latest.json'))

  nock('https://api.github.com')
    .get('/repos/robinraju/foo-app/releases/tags/1.0.0')
    .reply(200, readFromFile('3-empty-assets.json'))

  nock('https://api.github.com', {
    reqheaders: { accept: 'application/octet-stream' }
  })
    .get('/repos/robinraju/probable-potato/releases/assets/66946546')
    .replyWithFile(200, `${__dirname}/resource/assets/test-1.txt`)

  nock('https://api.github.com', {
    reqheaders: { accept: 'application/octet-stream' }
  })
    .get('/repos/robinraju/probable-potato/releases/assets/66946547')
    .replyWithFile(200, `${__dirname}/resource/assets/test-2.txt`)

  nock('https://api.github.com', {
    reqheaders: { accept: 'application/octet-stream' }
  })
    .get('/repos/robinraju/probable-potato/releases/assets/66946548')
    .replyWithFile(200, `${__dirname}/resource/assets/3-test.txt`)

  nock('https://api.github.com', {
    reqheaders: { accept: 'application/octet-stream' }
  })
    .get('/repos/robinraju/probable-potato/releases/assets/66946549')
    .replyWithFile(200, `${__dirname}/resource/assets/downloader-test.pdf`)

  nock('https://api.github.com', {
    reqheaders: { accept: 'application/octet-stream' }
  })
    .get('/repos/robinraju/probable-potato/releases/assets/66946550')
    .replyWithFile(200, `${__dirname}/resource/assets/lorem-ipsum.pdf`)

  nock('https://api.github.com', {
    reqheaders: { accept: 'application/octet-stream' }
  })
    .get('/repos/robinraju/probable-potato/releases/assets/66946552')
    .replyWithFile(200, `${__dirname}/resource/assets/archive-example.zip`)

  nock('https://api.github.com', {
    reqheaders: { accept: 'application/octet-stream' }
  })
    .get('/repos/robinraju/probable-potato/releases/assets/66946551')
    .replyWithFile(200, `${__dirname}/resource/assets/file_example.csv`)

  nock('https://my-gh-host.com/api/v3')
    .get('/repos/my-enterprise/test-repo/releases/latest')
    .reply(200, readFromFile('2-gh-enterprise.json'))

  nock('https://my-gh-host.com/api/v3', {
    reqheaders: { accept: 'application/octet-stream' }
  })
    .get('/repos/my-enterprise/test-repo/releases/assets/66946546')
    .replyWithFile(200, `${__dirname}/resource/assets/test-1.txt`)

  nock('https://api.github.com/')
    .get('/repos/robinraju/slick-pg/releases')
    .reply(200, readFromFile('4-with-prerelease.json'))

  nock('https://api.github.com', {
    reqheaders: { accept: 'application/octet-stream' }
  })
    .get('/repos/robinraju/slick-pg/releases/assets/66946546')
    .replyWithFile(200, `${__dirname}/resource/assets/pre-release.txt`)

  nock('https://api.github.com/')
    .get('/repos/foo/slick-pg/releases')
    .reply(200, readFromFile('5-without-prerelease.json'))

  nock('https://api.github.com')
    .get('/repos/robinraju/tar-zip-ball-only-repo/releases/latest')
    .reply(200, readFromFile('6-tar-zip-ball-only-repo.json'))

  nock('https://api.github.com', {
    reqheaders: { accept: '*/*' }
  })
    .get('/repos/robinraju/tar-zip-ball-only-repo/tarball/1.0.0')
    .replyWithFile(
      200,
      `${__dirname}/resource/assets/tar-zip-ball-only-repo.tar.gz`
    )

  nock('https://api.github.com', {
    reqheaders: { accept: '*/*' }
  })
    .get('/repos/robinraju/tar-zip-ball-only-repo/zipball/1.0.0')
    .replyWithFile(
      200,
      `${__dirname}/resource/assets/tar-zip-ball-only-repo.zip`
    )
})

afterEach(async () => {
  await io.rmRF(outputFilePath)
})

function readFromFile(fileName: string): string {
  const fileContents = fs.readFileSync(`${__dirname}/resource/${fileName}`, {
    encoding: 'utf-8'
  })
  return normalizeLineEndings(fileContents)
}

function normalizeLineEndings(str: string): string {
  // Normalize all line endings to LF (\n)
  return str.replace(/\r\n/g, '\n')
}

test('Download all files from public repo', async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: 'robinraju/probable-potato',
    isLatest: true,
    preRelease: false,
    tag: '',
    id: '',
    fileName: '*',
    tarBall: false,
    zipBall: false,
    extractAssets: false,
    outFilePath: outputFilePath
  }
  const result = await downloader.download(downloadSettings)
  expect(result.length).toBe(7)
}, 10000)

test('Download single file from public repo', async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: 'robinraju/probable-potato',
    isLatest: true,
    preRelease: false,
    tag: '',
    id: '',
    fileName: 'test-1.txt',
    tarBall: false,
    zipBall: false,
    extractAssets: false,
    outFilePath: outputFilePath
  }
  const result = await downloader.download(downloadSettings)
  expect(result.length).toBe(1)
}, 10000)

test('Fail loudly if given filename is not found in a release', async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: 'robinraju/probable-potato',
    isLatest: true,
    preRelease: false,
    tag: '',
    id: '',
    fileName: 'missing-file.txt',
    tarBall: false,
    zipBall: false,
    extractAssets: false,
    outFilePath: outputFilePath
  }
  const result = downloader.download(downloadSettings)
  await expect(result).rejects.toThrow(
    'Asset with name missing-file.txt not found!'
  )
}, 10000)

test('Fail loudly if release is not identified', async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: 'robinraju/probable-potato',
    isLatest: false,
    preRelease: false,
    tag: '',
    id: '',
    fileName: 'missing-file.txt',
    tarBall: false,
    zipBall: false,
    extractAssets: false,
    outFilePath: outputFilePath
  }
  const result = downloader.download(downloadSettings)
  await expect(result).rejects.toThrow(
    'Config error: Please input a valid tag or release ID, or specify `latest`'
  )
}, 10000)

test('Download files with wildcard from public repo', async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: 'robinraju/probable-potato',
    isLatest: true,
    preRelease: false,
    tag: '',
    id: '',
    fileName: 'test-*.txt',
    tarBall: false,
    zipBall: false,
    extractAssets: false,
    outFilePath: outputFilePath
  }
  const result = await downloader.download(downloadSettings)
  expect(result.length).toBe(2)
}, 10000)

test('Download single file with wildcard from public repo', async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: 'robinraju/probable-potato',
    isLatest: true,
    preRelease: false,
    tag: '',
    id: '',
    fileName: '3-*.txt',
    tarBall: false,
    zipBall: false,
    extractAssets: false,
    outFilePath: outputFilePath
  }
  const result = await downloader.download(downloadSettings)
  expect(result.length).toBe(1)
}, 10000)

test('Download multiple pdf files with wildcard filename', async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: 'robinraju/probable-potato',
    isLatest: true,
    preRelease: false,
    tag: '',
    id: '',
    fileName: '*.pdf',
    tarBall: false,
    zipBall: false,
    extractAssets: false,
    outFilePath: outputFilePath
  }
  const result = await downloader.download(downloadSettings)
  expect(result.length).toBe(2)
}, 10000)

test('Download a csv file with wildcard filename', async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: 'robinraju/probable-potato',
    isLatest: true,
    preRelease: false,
    tag: '',
    id: '',
    fileName: '*.csv',
    tarBall: false,
    zipBall: false,
    extractAssets: false,
    outFilePath: outputFilePath
  }
  const result = await downloader.download(downloadSettings)
  expect(result.length).toBe(1)
}, 10000)

test('Download file from Github Enterprise server', async () => {
  downloader = new ReleaseDownloader(httpClent, 'https://my-gh-host.com/api/v3')

  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: 'my-enterprise/test-repo',
    isLatest: true,
    preRelease: false,
    tag: '',
    id: '',
    fileName: 'test-1.txt',
    tarBall: false,
    zipBall: false,
    extractAssets: false,
    outFilePath: outputFilePath
  }
  const result = await downloader.download(downloadSettings)
  expect(result.length).toBe(1)
}, 10000)

test('Download file from release identified by ID', async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: 'robinraju/probable-potato',
    isLatest: false,
    preRelease: false,
    tag: '',
    id: '68092191',
    fileName: 'test-2.txt',
    tarBall: false,
    zipBall: false,
    extractAssets: false,
    outFilePath: outputFilePath
  }
  const result = await downloader.download(downloadSettings)
  expect(result.length).toBe(1)
}, 10000)

test('Download all archive files from public repo', async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: 'robinraju/probable-potato',
    isLatest: true,
    preRelease: false,
    tag: '',
    id: '',
    fileName: '*.zip',
    tarBall: false,
    zipBall: false,
    extractAssets: true,
    outFilePath: outputFilePath
  }
  const result = await downloader.download(downloadSettings)
  if (downloadSettings.extractAssets) {
    for (const asset of result) {
      await extract(asset, downloadSettings.outFilePath)
    }
  }

  expect(result.length).toBe(1)
  expect(
    fs.existsSync(path.join(downloadSettings.outFilePath, 'test-3.txt'))
  ).toBe(true)

  const extractedFilePath = path.join(
    downloadSettings.outFilePath,
    'test-4.txt'
  )
  expect(fs.existsSync(extractedFilePath)).toBe(true)

  const actualContent = fs.readFileSync(extractedFilePath, {
    encoding: 'utf-8'
  })
  const expectedContent = readFromFile('assets/archive-example-test-4.txt')

  expect(normalizeLineEndings(actualContent)).toBe(expectedContent)
}, 10000)

test('Fail when a release with no assets are obtained', async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: 'robinraju/foo-app',
    isLatest: false,
    preRelease: false,
    tag: '1.0.0',
    id: '',
    fileName: 'installer.zip',
    tarBall: false,
    zipBall: false,
    extractAssets: false,
    outFilePath: outputFilePath
  }
  const result = downloader.download(downloadSettings)
  await expect(result).rejects.toThrow(
    'No assets found in release Foo app - v1.0.0'
  )
}, 10000)

test('Download from latest prerelease', async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: 'robinraju/slick-pg',
    isLatest: true,
    preRelease: true,
    tag: '',
    id: '',
    fileName: 'pre-release.txt',
    tarBall: false,
    zipBall: false,
    extractAssets: false,
    outFilePath: outputFilePath
  }
  const result = await downloader.download(downloadSettings)
  expect(result.length).toBe(1)
}, 10000)

test('Fail when a release with no prerelease is obtained', async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: 'foo/slick-pg',
    isLatest: true,
    preRelease: true,
    tag: '',
    id: '',
    fileName: 'installer.zip',
    tarBall: false,
    zipBall: false,
    extractAssets: false,
    outFilePath: outputFilePath
  }
  const result = downloader.download(downloadSettings)
  await expect(result).rejects.toThrow('No prereleases found!')
}, 10000)

test('Download from a release containing only tarBall & zipBall', async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: 'robinraju/tar-zip-ball-only-repo',
    isLatest: true,
    preRelease: false,
    tag: '',
    id: '',
    fileName: '',
    tarBall: true,
    zipBall: true,
    extractAssets: false,
    outFilePath: outputFilePath
  }

  const result = await downloader.download(downloadSettings)
  expect(result.length).toBe(2)
})
