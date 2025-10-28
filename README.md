# FlashBrowser

A desktop browser for running Adobe Flash content using Electron.

## Prerequisites

- Node.js (recommended: Node 16.x LTS)
- pnpm (see https://pnpm.io/)

## Install

```bash
git clone https://github.com/Cothlory/FlashBrowser.git
cd FlashBrowser
pnpm install --shamefully-hoist
```

## Run

```bash
pnpm start
```

## Uninstall

Remove the project directory:

```bash
cd ..
rm -rf FlashBrowser
```

## Troubleshooting

**Error: "Electron failed to install correctly"**

Run this to manually trigger Electron's binary download:

```bash
npm_config_unsafe_perm=true pnpm install --shamefully-hoist
```

Or approve build scripts and reinstall:

```bash
pnpm approve-builds
pnpm install --shamefully-hoist
```

**Error: "Cannot find module 'node:path'"**

The postinstall script should create the necessary shims automatically. If you removed `node_modules`, re-run:

```bash
pnpm install --shamefully-hoist
```

Or manually run:

```bash
node ./scripts/create_shims.js
```

**Compatibility note:** This project uses Electron 10.x. For best compatibility, use Node 14.x or 16.x:

```bash
nvm install 16
nvm use 16
pnpm install --shamefully-hoist
pnpm start
```
