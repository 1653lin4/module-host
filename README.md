# Module Host

[中文文档](./README_zh.md)

A minimal, zero-dependency microkernel host for Obsidian (`1.11.5+`, desktop only) that loads and hot-reloads standalone local JavaScript drawer modules (`*plugin.js` / `*plugin.mjs`) directly from your vault—no build step required for local modules.

## Security Notice

- **Local-first host**: The Module Host core makes **zero network requests**, includes **zero telemetry**, and never downloads external code.
- **Automatic local execution**: Modules inside your configured vault folder (`_Modules/plugins` by default) are dynamically imported via native ES `import()` and automatically execute when the host loads or reloads.
- **Full plugin privileges (no sandbox)**: Modules are not sandboxed. They execute with the same privileges as a regular Obsidian plugin and can access Obsidian APIs and host-provided services, including `SecretStore`.
- **Network & data access by modules**: Although the host itself does not connect to the network, individual modules you load may make network requests, read or modify vault data, or use configured secrets depending on their code.
- **Trusted code only**: Only place modules that you wrote yourself or carefully audited into your modules folder.

## Features

- **Pure microkernel runtime (`Runtime`)**: Service registry (`register`, `get`, `has`) with duplicate protection, single-module failure rollback, and LIFO (`dispose`) cleanup on hot reload or unload.
- **Single-layer hot reload (`PluginLoader`)**: Scans the configured vault folder (default: `_Modules/plugins`) for `*plugin.js` / `*plugin.mjs` files, strictly loads `export default`, and busts ESM cache using timestamp queries.
- **Secret isolation (`SecretStore`)**: Integrates exclusively with Obsidian's built-in `SecretStorage` (`1.11.5+`) and `SecretComponent`. Plaintext keys are never written to `data.json`, and missing secrets fail fast by returning `null`.
- **Automatic bilingual UI**: Automatically adapts settings, commands, and notices between English and Chinese via Obsidian's `getLanguage()` API.

## Core Services Registered by Default

Every module receives the `runtime` instance in `setup(runtime)` and `dispose(runtime)`, and `window.moduleHost` also exposes the active runtime for console debugging or standalone scripts:

| Service key | Value |
| :--- | :--- |
| `"app"` | Obsidian `App` instance |
| `"plugin"` | `ModuleHostPlugin` instance |
| `"obsidian"` | Full `"obsidian"` API namespace (`Notice`, `Component`, `Modal`, etc.) |
| `"secrets"` | `SecretStore` wrapper (`get(aliasOrId)`, `list()`) |

## Quick Start: Minimal Drawer Module

1. Create a folder in your vault (default: `_Modules/plugins`).
2. Add a file whose name ends with `plugin.js` or `plugin.mjs`, such as `_Modules/plugins/helloPlugin.js`:

```javascript
let scope = null;

export default {
  name: "hello-drawer",

  async setup(runtime) {
    const app = runtime.get("app");
    const hostPlugin = runtime.get("plugin");
    const obsidian = runtime.get("obsidian");

    // Manage listeners, timers, and UI cleanup via a standalone Component
    scope = new obsidian.Component();
    scope.load();

    const statusEl = hostPlugin.addStatusBarItem();
    statusEl.setText("Hello Drawer");
    scope.register(() => statusEl.remove());

    scope.registerEvent(
      app.workspace.on("file-open", (file) => {
        if (file) {
          statusEl.setText(`Active: ${file.basename}`);
        }
      })
    );

    new obsidian.Notice("Hello drawer loaded.");
  },

  async dispose() {
    // One-line cleanup for all listeners, timers, and registered callbacks
    scope?.unload();
    scope = null;
  }
};
```

3. Run the command **Reload local modules** (`热重载所有本地抽屉模块`) from the Command Palette whenever you edit a module.

> **Note on commands and custom views**: `obsidian.Component` automatically detaches workspace events, DOM events, and intervals. If your drawer manually registers commands (`hostPlugin.addCommand`) or custom `ItemView` types (`hostPlugin.registerView`), make sure to remove/unregister them inside `dispose(runtime)`.

## Using Secrets Safely

1. Create your actual secret inside **Obsidian Settings → Keychain / Secret Storage**.
2. In **Settings → Module Host → Secret vault**, add an uppercase alias (for example, `DEEPSEEK_API_KEY`) and bind it to your secret storage entry—or call `secrets.get("my-secret-id")` directly with the exact storage ID:

```javascript
const secrets = runtime.get("secrets");
const apiKey = secrets.get("DEEPSEEK_API_KEY"); // returns string | null
if (!apiKey) {
  throw new Error("Missing DEEPSEEK_API_KEY in Obsidian secret storage.");
}
```

## Optional 4-Layer Folder Convention

While Module Host itself only scans your configured plugins folder (`_Modules/plugins`) and enforces no directory layout outside it, organizing your `_Modules` folder into four optional layers keeps AI-assisted local development clean:

- `_Modules/capabilities/` — Reusable single-domain helper molecules (e.g., vault, text, JSON, canvas wrappers)
- `_Modules/presets/` — Higher-level engines or JSON configs shared across modules
- `_Modules/plugins/` — Resident drawer modules (`*plugin.js` / `*plugin.mjs`) scanned by Module Host
- `_Modules/scripts/` — One-off scripts triggered on demand via a launcher module

## Installation

### Manual Installation
1. Download `main.js` and `manifest.json` from the latest GitHub Release.
2. Copy both files into `<YourVault>/.obsidian/plugins/module-host/`.
3. Enable **Module Host** in Obsidian **Settings → Community plugins**.

### Build from Source

```bash
npm install
npm run build
```

Copy the generated `main.js` and `manifest.json` into `<YourVault>/.obsidian/plugins/module-host/`.

## License

[MIT](./LICENSE)