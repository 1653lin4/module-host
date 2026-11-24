// src/SettingTab.ts
import * as obsidian from "obsidian";
import { type App, type BaseComponent, Notice, PluginSettingTab, Setting } from "obsidian";
import { getStrings } from "./i18n";
import type ModuleHostPlugin from "./main";
import type { AppWithSecretStorage } from "./SecretStore";

interface SecretComponentInstance extends BaseComponent {
  setValue(value: string): this;
  onChange(cb: (value: string | null) => unknown): this;
}

type SecretComponentCtor = new (app: App, containerEl: HTMLElement) => SecretComponentInstance;

export class ModuleHostSettingTab extends PluginSettingTab {
  plugin: ModuleHostPlugin;

  constructor(app: App, plugin: ModuleHostPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const s = getStrings();
    containerEl.empty();

    // 1. 抽屉目录配置
    new Setting(containerEl)
      .setName(s.modulesDirName)
      .setDesc(s.modulesDirDesc)
      .addText((text) =>
        text
          .setPlaceholder("_Modules/plugins")
          .setValue(this.plugin.hostSettings.modulesDir)
          .onChange((value) => {
            this.plugin.hostSettings.modulesDir = value.trim() || "_Modules/plugins";
            void this.plugin.saveSettings();
          })
      );

    // 2. 动态密钥安全池（使用官方 setHeading() 代替手写 HTML 标题）
    new Setting(containerEl)
      .setName(s.secretVaultHeading)
      .setDesc(s.secretVaultDesc)
      .setHeading();

    const SecretComp = (obsidian as unknown as { SecretComponent?: SecretComponentCtor }).SecretComponent;
    const hasSecretStorage =
      Boolean((this.app as unknown as AppWithSecretStorage).secretStorage) && typeof SecretComp === "function";

    if (!hasSecretStorage || !SecretComp) {
      new Setting(containerEl)
        .setName(s.secretUnsupportedName)
        .setDesc(s.secretUnsupportedDesc);
      return;
    }

    const secretsObj = this.plugin.hostSettings.secrets;
    for (const keyAlias of Object.keys(secretsObj)) {
      const setting = new Setting(containerEl)
        .setName(keyAlias)
        .setDesc(s.secretAliasDesc(keyAlias));

      setting.addComponent((el) =>
        new SecretComp(this.app, el)
          .setValue(secretsObj[keyAlias] || "")
          .onChange((val) => {
            secretsObj[keyAlias] = val ?? "";
            void this.plugin.saveSettings();
          })
      );

      setting.addButton((btn) =>
        btn
          .setIcon("trash")
          .setTooltip(s.deleteSecretTooltip)
          .onClick(() => {
            delete secretsObj[keyAlias];
            void (async () => {
              await this.plugin.saveSettings();
              this.display();
            })();
          })
      );
    }

    // 3. 一键添加新密钥别名映射
    let newKeyName = "";
    new Setting(containerEl)
      .setName(s.addSecretName)
      .setDesc(s.addSecretDesc)
      .addText((text) =>
        text.setPlaceholder(s.addSecretPlaceholder).onChange((val) => {
          newKeyName = val.trim().toUpperCase();
        })
      )
      .addButton((btn) =>
        btn
          .setButtonText(s.addButtonText)
          .setCta()
          .onClick(() => {
            if (!newKeyName) return;
            if (secretsObj[newKeyName] !== undefined) {
              new Notice(s.aliasExistsNotice);
              return;
            }
            secretsObj[newKeyName] = "";
            void (async () => {
              await this.plugin.saveSettings();
              this.display();
            })();
          })
      );
  }
}