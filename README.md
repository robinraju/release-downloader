## Github Release Downloader

![CI](https://github.com/robinraju/release-downloader/workflows/CI/badge.svg)

A Github Action to download assets from github release. It can download specified files from both private and public repositories.

## Usage

```yaml

- uses: robinraju/release-downloader@v1
  with: 
    # The source repository path.
    # Expected format {owner}/{repo}
    repository: ""
    
    # A flag to choose between latest release and previous releases
    # The default value is 'true'
    latest: true
    
    # The github tag. e.g: v1.0.1
    # Download assets from a specific tag/version
    tag: ""
    
    # The name of the file to download.
    # Use this field only to specify filenames other than tarball or zipball, if any.
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
