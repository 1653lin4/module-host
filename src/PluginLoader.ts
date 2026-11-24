// src/PluginLoader.ts
import type { App } from "obsidian";
import type { IPlugin, Runtime } from "./Runtime";

/** 类型守卫：严格校验导入对象是否符合 IPlugin 标准契约 */
function isValidPlugin(value: unknown): value is IPlugin {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.name === "string" &&
    record.name.trim() !== "" &&
    typeof record.setup === "function" &&
    (record.dispose === undefined || typeof record.dispose === "function")
  );
}

export class PluginLoader {
  private runtime: Runtime;
  private app: App;

  constructor(runtime: Runtime, app: App) {
    this.runtime = runtime;
    this.app = app;
  }

  /**
   * 扫描指定笔记库单层目录（如 "_Modules/plugins"）并动态 import 载入
   */
  static async discoverPlugins(app: App, vaultPluginDir: string): Promise<IPlugin[]> {
    const plugins: IPlugin[] = [];

    try {
      const adapter = app.vault.adapter;
      const exists = await adapter.exists(vaultPluginDir);
      if (!exists) {
        console.warn(`⚠️ [PluginLoader] 抽屉目录不存在: ${vaultPluginDir}`);
        return plugins;
      }

      const list = await adapter.list(vaultPluginDir);

      for (const filePath of list.files) {
        if (!/plugin\.(m?js)$/i.test(filePath)) continue;

        const resourceUrl = adapter.getResourcePath(filePath);
        const separator = resourceUrl.includes("?") ? "&" : "?";
        const finalUrl = `${resourceUrl}${separator}t=${Date.now()}`;

        try {
          // eslint-disable-next-line no-unsanitized/method -- Dynamic import of user-managed local modules is the core purpose of Module Host
          const imported: unknown = await import(finalUrl);

          const candidate =
            imported && typeof imported === "object"
              ? (imported as { default?: unknown }).default
              : undefined;

          if (isValidPlugin(candidate)) {
            plugins.push(candidate);
            console.debug(`✅ [PluginLoader] 成功识别抽屉插件: ${candidate.name}`);
          } else {
            console.warn(
              `⚠️ [PluginLoader] 跳过非规范插件（请确保使用 export default 默认导出，且包含有效 name、setup 与合法的可选 dispose）: ${filePath}`
            );
          }
        } catch (importErr: unknown) {
          console.error(`❌ [PluginLoader] 动态载入 ${filePath} 失败:`, importErr);
        }
      }
    } catch (err: unknown) {
      console.error("❌ [PluginLoader] 扫描目录异常:", err);
    }

    return plugins;
  }

  /** 一键挂载目录下的所有抽屉插件（单插件故障彻底隔离） */
  async loadAllFromVault(vaultPluginDir: string = "_Modules/plugins"): Promise<void> {
    const discovered = await PluginLoader.discoverPlugins(this.app, vaultPluginDir);

    for (const plugin of discovered) {
      try {
        await this.runtime.use(plugin);
      } catch (err: unknown) {
        console.error(
          `❌ [PluginLoader] 插件 '${plugin.name}' 加载失败，已安全跳过，不影响后续抽屉挂载！`,
          err
        );
      }
    }
  }
}