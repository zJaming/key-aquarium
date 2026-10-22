# <img src="src-tauri/icons/128x128.png" width="36" alt=""> Key Aquarium

**A small underwater world, grown one keystroke at a time.**

English · [简体中文](README.zh-CN.md)

Key Aquarium is a pixel aquarium for your desktop. Keep it beside your work and let everyday typing bring new creatures into the tank. Discover species, earn achievements, or take a moment to make some bubbles.

![Key Aquarium with a sample collection of pixel fish](assets/screenshots/aquarium-en.jpg)

*Sample collection shown in the English interface.*

Built with Vue 3, TypeScript, PixiJS, and Tauri 2. The desktop app currently targets **macOS**, with English and Simplified Chinese interfaces.

## Download

**[Download for macOS · Apple Silicon & Intel](https://github.com/zJaming/key-aquarium/releases/latest/download/Key-Aquarium-macOS-universal.dmg)**

Open the `.dmg`, drag **Key Aquarium.app** to **Applications**, then launch it.

> **First launch:** This build is not notarized by Apple. If macOS blocks it and you trust the download, go to **System Settings → Privacy & Security**, choose **Open Anyway**, and confirm **Open**.

Grant the [Accessibility permission](#permissions--privacy) to count keystrokes while using other apps.

See [all releases](https://github.com/zJaming/key-aquarium/releases) for version notes and SHA-256 checksums. Starting with v0.1.2, Settings lets you check for updates, download and install them, then restart when ready. If you use v0.1.0 or v0.1.1, install a newer `.dmg` once to get this feature.

Windows and Linux global keyboard monitoring are not implemented yet.

## How it works

1. Type as usual. Each key press advances the current aquarium cycle.
2. When the cycle completes, a creature joins your collection automatically.
3. A new cycle begins, ready for your next discovery.

A cycle can yield a species you already own.

The **+** button on the tank also advances progress. These clicks are tracked separately from keyboard activity.

### Meet the residents

Meet a growing collection of aquatic creatures, each with its own pixel-art silhouette. Open the gallery to revisit the residents you have found. Leave the rest for your next discovery.

### Make it your own

- Unlock bubble, lighting, and shake controls as your collection grows.
- Earn achievements through typing, collecting species, and interacting with the tank.
- Check today's key count, lifetime activity, and your most-used keys in the status panel.
- Drag or resize the transparent window, keep it on top, or hide and restore it from the system tray.
- Use Settings to adjust visual feedback and switch to a less crowded tank.

Move the pointer over the app to reveal its toolbar. The achievement entry appears after your first achievement unlocks.

### Keep your progress

The desktop app saves progress locally. Settings provides JSON import and export for backups or transfers. You can also clear progress from Settings: this resets the collection, key statistics, and achievements while keeping your settings and window preferences.

## Permissions & privacy

On macOS, global key detection requires **Accessibility** permission. Grant access in **System Settings → Privacy & Security → Accessibility**. The in-app permission notice can open this settings page for you.

Key Aquarium records key identifiers, counts, and activity timestamps to drive progress and statistics. It does not save the text you type. No account is required.

## Development

### Requirements

- Node.js 22.13+ in the 22.x line, or Node.js 24+.
- pnpm 9, matching the repository's pinned package manager.
- Rust 1.88+.
- macOS with Xcode Command Line Tools for desktop development.

### Run the desktop app

```sh
git clone https://github.com/zJaming/key-aquarium.git
cd key-aquarium
pnpm install --frozen-lockfile
pnpm tauri dev
```

Grant the macOS permission described above to count keys while working in other apps.

### Preview in a browser

```sh
pnpm dev
```

Open the local URL printed in the terminal. The browser preview responds only to keys pressed within the page. It has no system tray or native save storage, so progress resets on reload; export JSON before reloading if you want to keep it.

Development mode includes buttons for previewing species and achievements. They are hidden in production builds.

### Check and build

| Command | Purpose |
| --- | --- |
| `pnpm typecheck` | Check TypeScript and Vue types |
| `pnpm test` | Run unit tests |
| `pnpm build` | Check types and build the frontend |
| `pnpm tauri build` | Build the macOS desktop bundles |

Frontend files are written to `dist/`; desktop bundles are written to `src-tauri/target/release/bundle/`.

### Signing update bundles

Update packages require a signing key. For your own distribution, generate a key with `pnpm tauri signer generate -w /path/outside/repo/updater.key`, and replace `plugins.updater.pubkey` in `src-tauri/tauri.conf.json` with the generated public key. Keep the private key outside the repository and back it up.

```sh
TAURI_SIGNING_PRIVATE_KEY=/path/outside/repo/updater.key \
TAURI_SIGNING_PRIVATE_KEY_PASSWORD='' pnpm tauri build
```

For a universal build, install both Rust targets (`aarch64-apple-darwin` and `x86_64-apple-darwin`) and add `--target universal-apple-darwin` to the build command.

To publish updates, rename the universal archive to `Key-Aquarium-macOS-universal.app.tar.gz` and its signature to the same name plus `.sig`. Run `pnpm release:manifest /path/to/release-assets`, then upload the archive, signature, and generated `latest.json` to the matching GitHub Release. Both macOS architectures use the same universal archive. Forks must also change the updater endpoint and the repository URL in `scripts/create-update-manifest.mjs`.

## License

[MIT](LICENSE) © 2026 Jaming.
