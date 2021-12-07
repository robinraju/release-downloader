## Github Release Downloader

[![Open in Visual Studio Code](https://open.vscode.dev/badges/open-in-vscode.svg)](https://open.vscode.dev/robinraju/release-downloader)
![CI](https://github.com/robinraju/release-downloader/workflows/CI/badge.svg)

A Github Action to download assets from github release. It can download specified files from both private and public repositories.

## Usage

```yaml

- uses: robinraju/release-downloader@v1.3
  with: 
    # The source repository path.
    # Expected format {owner}/{repo}
    repository: ""
    
    # A flag to set the download target as latest release
    # The default value is 'false'
    latest: true
    
    # The github tag. e.g: v1.0.1
    # Download assets from a specific tag/version
    tag: ""
    
    # The name of the file to download.
    # Use this field only to specify filenames other than tarball or zipball, if any.
    # Use '*' to download all assets
    fileName: ""
    
    # Download the attached tarball (*.tar.gz)
    tarBall: true
    
    # Download the attached zipball (*.zip)
    zipBall: true
    
    # Relative path under $GITHUB_WORKSPACE to place the downloaded file(s)
    # It will create the target directory automatically if not present
    # eg: out-file-path: "my-downloads" => It will create directory $GITHUB_WORKSPACE/my-downloads
    out-file-path: ""
    
    # Github access token to download files from private repositories
    # https://docs.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets
    # eg: token: ${{ secrets.MY_TOKEN }}
    token: ""
```

## Scenarios

### Download asset from the latest release

```yaml

- uses: robinraju/release-downloader@v1.3
  with:
    repository: "user/repo"
    latest: true
    fileName: "foo.zip"
```

### Download asset from a specific release version.

```yaml

- uses: robinraju/release-downloader@v1.3
  with:
    repository: "user/repo"
    tag: "v1.0.0"
    fileName: "foo.zip"
```

### Download tarball and zipball

```yaml

- uses: robinraju/release-downloader@v1.3
  with:
    repository: "user/repo"
    latest: true
    tarBall: true
    zipBall: true
```
> Remove the `latest` flag and specify `tag` if you want to download from a different release.

### Download multiple assets

```yaml
- uses: robinraju/release-downloader@v1.3
  with:
    repository: "user/repo"
    latest: true
    fileName: "foo.zip"
    tarBall: true
    zipBall: true
```

### Download all assets if more than one files are available

```yaml
- uses: robinraju/release-downloader@v1.3
  with:
    repository: "user/repo"
    latest: true
    fileName: "*"
```
