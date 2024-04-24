# Github release downloader

## Prerequisites

- Node > v12.x
- npm

Install dependencies

```bash
npm install
```

Build typescript and package it for distribution

```bash
npm run build && npm run pack
```

Run tests :heavy_check_mark:

```bash
npm test

 PASS  __tests__/main.test.ts
  ✓ run download (1207ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        3.141s
Ran all test suites.

...
```

## Change action.yml

The action.yml contains defines the inputs and output for your action.

Update the action.yml with your name, description, inputs and outputs for your
action.

See the
[documentation](https://help.github.com/en/articles/metadata-syntax-for-github-actions)

## Change the Code

Most toolkit and CI/CD operations involve async operations so the action is run
in an async function.

```javascript
import * as core from '@actions/core';
...

async function run() {
  try {
      ...
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
```

See the
[toolkit documentation](https://github.com/actions/toolkit/blob/master/README.md#packages)
for the various packages.

## Publish to a distribution branch

Actions are run from GitHub repos so we will checkin the packed dist folder.

Then run [ncc](https://github.com/zeit/ncc) and push the results:

```bash
$ npm run package
$ git add dist
$ git commit -a -m "prod dependencies"
$ git push origin releases/v1
```

Your action is now published! :rocket:

See the
[versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)

## Validate

You can now validate the action by referencing `./` in a workflow in your repo
(see [test.yml](.github/workflows/test.yml))

```yaml
uses: ./
with:
  repository: 'user/repo'
  tag: '1.0.0'
  fileName: 'foo.zip'
  out-file-path: '.'
```

See the [actions tab](https://github.com/actions/javascript-action/actions) for
runs of this action! :rocket:
