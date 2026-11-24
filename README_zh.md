# Module Host（模块宿主）

[English](./README.md)

一个极简、零外部运行时依赖的 Obsidian（`1.11.5+`，桌面端）微内核宿主插件。用于在笔记库指定目录中直接加载并热重载本地独立脚本抽屉模块（`*plugin.js` / `*plugin.mjs`），本地脚本无需编译打包即可即写即用。

## 安全说明

- **纯本地极简宿主**：Module Host 本体**不发起任何网络请求**、**不包含任何遥测统计**，也不会从远程下载代码。
- **启动与重载自动执行**：放入所配置抽屉目录（默认 `_Modules/plugins`）的合法模块，会在宿主加载或执行热重载时通过原生 `import()` 自动执行。
- **完整插件权限（无沙箱隔离）**：本地模块不处于隔离沙箱中，它们拥有与常规 Obsidian 插件同等的完整权限，可以调用 Obsidian 接口及宿主注入的服务（包括 `SecretStore` 密钥读取服务）。
- **模块自身网络与数据行为**：虽然宿主本身不联网，但你放入的个别抽屉模块可能会根据自身代码发起网络请求、读写笔记库文件或调用已配置的密钥。
- **只放可信脚本**：请仅将你自己编写或仔细审查过的模块放入抽屉目录。

## 核心特性

- **纯净微内核运行时（`Runtime`）**：内置防覆写服务注册表（`register`、`get`、`has`）、单模块初始化失败回滚，以及热重载或卸载时的后进先出（`dispose`）逆序清场。
- **单层扫描与热重载（`PluginLoader`）**：单层扫描目标目录（默认 `_Modules/plugins`）中以 `plugin.js` 或 `plugin.mjs` 结尾的文件，严格只认 `export default` 默认导出，并通过追加时间戳穿透模块缓存。
- **安全密钥代理（`SecretStore`）**：全面对接 Obsidian 官方内置的 `SecretStorage`（`1.11.5+`）与 `SecretComponent` 选择组件。绝不在 `data.json` 存储明文密钥，未配置或找不到密钥时快速失败并返回 `null`。
- **中英文界面自动切换**：通过官方 `getLanguage()` 接口自动适配中英文设置面板、命令名称与提示弹窗。

## 宿主预置核心服务

每个抽屉插件在 `setup(runtime)` 与 `dispose(runtime)` 中都会收到 `runtime` 实例；同时全局 `window.moduleHost` 也暴露了当前运行时句柄，方便控制台调试或一次性脚本调用：

| 服务标识 | 内容说明 |
| :--- | :--- |
| `"app"` | Obsidian `App` 应用实例 |
| `"plugin"` | `ModuleHostPlugin` 宿主插件实例 |
| `"obsidian"` | 完整的 `"obsidian"` 官方接口集合（`Notice`、`Component`、`Modal` 等） |
| `"secrets"` | `SecretStore` 密钥代理实例（提供 `get(aliasOrId)`、`list()`） |

## 快速上手：编写一个极简抽屉模块

1. 在笔记库中新建目录（默认为 `_Modules/plugins`）。
2. 在目录内新建以 `plugin.js` 或 `plugin.mjs` 结尾的文件，例如 `_Modules/plugins/helloPlugin.js`：

```javascript
let scope = null;

export default {
  name: "hello-drawer",

  async setup(runtime) {
    const app = runtime.get("app");
    const hostPlugin = runtime.get("plugin");
    const obsidian = runtime.get("obsidian");

    // 推荐在抽屉内部创建独立的 Component 实例来托管副作用
    scope = new obsidian.Component();
    scope.load();

    const statusEl = hostPlugin.addStatusBarItem();
    statusEl.setText("Hello Drawer");
    scope.register(() => statusEl.remove());

    scope.registerEvent(
      app.workspace.on("file-open", (file) => {
        if (file) {
          statusEl.setText(`当前打开: ${file.basename}`);
        }
      })
    );

    new obsidian.Notice("演示抽屉模块已挂载");
  },

  async dispose() {
    // 一行代码即可自动解绑上述监听、定时器与清理回调
    scope?.unload();
    scope = null;
  }
};
```

3. 每次修改本地抽屉脚本后，在命令面板执行 **热重载所有本地抽屉模块**（`Reload local modules`）即可即时生效。

> **关于命令与自定义视图的清理提示**：`obsidian.Component` 会自动回收工作区事件、网页节点事件与定时器；如果你的抽屉通过宿主注册了命令（`hostPlugin.addCommand`）或侧边栏视图（`hostPlugin.registerView`），请务必在 `dispose(runtime)` 中显式移除或注销。

## 安全使用密钥

1. 在 **Obsidian 设置 → 钥匙串 / 安全存储** 中先录入真实的密钥。
2. 打开 **设置 → Module Host → 动态密钥安全池**，添加一个大写别名（如 `DEEPSEEK_API_KEY`）并下拉绑定对应条目；也可以在代码里直接传入安全存储中的小写标识符进行直读：

```javascript
const secrets = runtime.get("secrets");
const apiKey = secrets.get("DEEPSEEK_API_KEY"); // 返回 string | null
if (!apiKey) {
  throw new Error("未在 Obsidian 安全存储中找到 DEEPSEEK_API_KEY");
}
```

## 可选的四层目录推荐约定

主插件本身只扫描配置的抽屉目录（默认 `_Modules/plugins`），对库内其余目录没有任何强制约束。如果你希望在笔记库中长期维护一批本地工具，可以参考以下四层物理划分习惯：

- `_Modules/capabilities/` — 单一领域的可复用基础能力分子（如文件读写、文本、画布封装）
- `_Modules/presets/` — 基于基础能力组合而成的预设引擎与配置文件
- `_Modules/plugins/` — 由主插件自动加载的常驻抽屉模块（`*plugin.js` / `*plugin.mjs`）
- `_Modules/scripts/` — 按需手动触发的一次性运行脚本

## 安装与构建

### 手动安装
1. 从发行页面下载 `main.js` 和 `manifest.json`。
2. 将这两个文件放入 `<你的笔记库>/.obsidian/plugins/module-host/`。
3. 在 Obsidian **设置 → 第三方插件** 中启用 **Module Host**。

### 本地源码构建

```bash
npm install
npm run build
```

将根目录生成的 `main.js` 和 `manifest.json` 复制到 `<你的笔记库>/.obsidian/plugins/module-host/` 即可使用。

## 开源协议

[MIT](./LICENSE)