# audio-tag-analyzer-vite

[![Build and test](https://github.com/Borewit/audio-tag-analyzer-vite/actions/workflows/ci.yml/badge.svg)](https://github.com/Borewit/audio-tag-analyzer-vite/actions/workflows/ci.yml)

A responsive, browser-only [Audio Tag Analyzer](https://github.com/Borewit/audio-tag-analyzer-vite), built with React, TypeScript, Vite, and [music-metadata](https://github.com/Borewit/music-metadata).

## Development

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

`npm run build` checks TypeScript and builds the static site into `dist`. `npm run preview` serves that build locally. `npm test` runs the metadata formatting tests.

## Features

- Select or drop multiple files, switch between individual results, and remove files.
- Parsing runs in dedicated Web Workers, terminated when files are removed.
- Common tags, every audio format property, original native tags, embedded artwork, and parser warnings.
- Search tag names and values, inspect nested values and binary data, and download complete metadata as JSON.
- Native browser audio controls. Playback support depends on the browser and codec; metadata analysis works independently.
- All processing stays on the device. There is no upload endpoint, account, analytics, remote font, or server-side processing. Results are held in memory until removed or the page is closed.

## Netlify

The checked-in `netlify.toml` configures Node 22, `npm run build`, and the `dist` publish directory. Import this repository into Netlify to deploy. No server functions or environment secrets are needed. An actual deployment requires a connected Netlify site/account.

## Continuous integration

GitHub Actions runs on pushes, pull requests, and manual dispatches. Using Node 22, it installs the locked dependencies with `npm ci`, runs unit tests, and checks TypeScript while building the production site. Successful runs retain the `dist` directory as the `audio-tag-analyzer-vite-dist` artifact for seven days. Superseded runs are canceled automatically.

Browser verification remains a separate local check using the music-metadata sample files described below. Deployment is handled by Netlify.

## License

MIT. See LICENSE for the original project's attribution.

## Browser verification

With a local server running and the music-metadata repository checked out alongside this project:

```sh
npx playwright install chromium
node scripts/browser-check.mjs
```

Set `SAMPLE_DIR` for another location of music-metadata's `test/samples`, `CHROMIUM_PATH` for an existing browser, or `APP_URL` to test a production preview. The check covers MP3, FLAC, M4A, WAV, file switching, search, export, mobile overflow, error handling, and generated PCM audio playback. Screenshots are written to `/tmp`.
