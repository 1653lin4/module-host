// src/main.ts
import * as obsidianAPI from "obsidian";
import { Notice, Plugin } from "obsidian";
import { getStrings } from "./i18n";
import { PluginLoader } from "./PluginLoader";
import { Runtime } from "./Runtime";
import { SecretStore } from "./SecretStore";
import { ModuleHostSettingTab } from "./SettingTab";

export interface ModuleHostSettings {
  modulesDir: string;
  secrets: Record<string, string>;
}

interface WindowWithModuleHost extends Window {
  moduleHost?: Runtime;
}

const DEFAULT_SETTINGS: ModuleHostSettings = {
  modulesDir: "_Modules/plugins",
  secrets: { DEEPSEEK_API_KEY: "", GEMINI_API_KEY: "" }
};

export default class ModuleHostPlugin extends Plugin {
  runtime: Runtime;
  pluginLoader: PluginLoader;
  hostSettings: ModuleHostSettings; // 使用 hostSettings 规避新版基类 Plugin.settings 重名冲突
  secretStore: SecretStore;

  async onload(): Promise<void> {
    console.debug("🚀 [Module Host] 正在点火模块宿主引擎 (by 1653lin4)...");
    const s = getStrings();

    await this.loadSettings();
    this.runtime = new Runtime();
    this.secretStore = new SecretStore(this.app, () => this.hostSettings.secrets);

    this.registerCoreServices();
    (window as WindowWithModuleHost).moduleHost = this.runtime;

    this.addSettingTab(new ModuleHostSettingTab(this.app, this));

    this.pluginLoader = new PluginLoader(this.runtime, this.app);
    await this.pluginLoader.loadAllFromVault(this.hostSettings.modulesDir);

    this.addCommand({
      id: "reload-modules",
      name: s.reloadCommandName,
      callback: () => {
        void this.reloadModules();
      }
    });

    new Notice(s.readyNotice);
  }

  onunload(): void {
    // 1. 先同步移除全局句柄，避免快速重启插件时与新实例产生竞态
    const win = window as WindowWithModuleHost;
    if (win.moduleHost === this.runtime) {
      delete win.moduleHost;
    }

    // 2. 异步逆序销毁已挂载模块，并捕获可能发生的清理异常
    if (this.runtime) {
      void this.runtime.dispose().catch((err: unknown) => {
        console.error("❌ [Module Host] 宿主卸载清理异常:", err);
      });
    }
  }

  private registerCoreServices(): void {
    this.runtime.register("app", this.app);
    this.runtime.register("plugin", this);
    this.runtime.register("obsidian", obsidianAPI);
    this.runtime.register("secrets", this.secretStore);
  }

  private async reloadModules(): Promise<void> {
    const s = getStrings();
    new Notice(s.reloadingNotice(this.hostSettings.modulesDir));

    try {
      await this.runtime.dispose();
      this.registerCoreServices();
      await this.pluginLoader.loadAllFromVault(this.hostSettings.modulesDir);
      new Notice(s.reloadedNotice);
    } catch (err: unknown) {
      console.error("❌ [Module Host] 热重载失败:", err);
      new Notice(s.reloadFailedNotice);
    }
  }

  async loadSettings(): Promise<void> {
    const raw = (await this.loadData()) as Partial<ModuleHostSettings> | null;
    // 独立拷贝 secrets 对象防止污染 DEFAULT_SETTINGS；同时尊重用户主动删减的默认项，不再强行复活
    this.hostSettings = {
      modulesDir: raw?.modulesDir?.trim() || DEFAULT_SETTINGS.modulesDir,
      secrets: raw?.secrets ? { ...raw.secrets } : { ...DEFAULT_SETTINGS.secrets }
    };
  }

  async saveSettings(): Promise<void> {
    try {
      await this.saveData(this.hostSettings);
    } catch (err: unknown) {
      console.error("❌ [Module Host] 保存配置失败:", err);
      new Notice(getStrings().saveFailedNotice);
    }
  }
}