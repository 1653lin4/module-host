// src/i18n.ts
import { getLanguage } from "obsidian";

const EN = {
  modulesDirName: "Modules folder",
  modulesDirDesc: "Vault folder path containing *plugin.js or *plugin.mjs files (default: _Modules/plugins).",
  secretVaultHeading: "Secret vault",
  secretVaultDesc: "Map uppercase aliases to Obsidian built-in secret storage.",
  secretUnsupportedName: "Secret storage unavailable",
  secretUnsupportedDesc: "Update Obsidian to version 1.11.4 or later to configure secrets.",
  secretAliasDesc: (alias: string) => `Internal alias: '${alias}'`,
  deleteSecretTooltip: "Delete secret alias",
  addSecretName: "Add secret alias",
  addSecretDesc: "Enter a new uppercase alias (for example, CLAUDE_KEY or GITHUB_TOKEN).",
  addSecretPlaceholder: "New alias (uppercase)",
  addButtonText: "Add",
  aliasExistsNotice: "Secret alias already exists.",
  reloadCommandName: "Reload local modules",
  reloadingNotice: (dir: string) => `Reloading modules from ${dir}...`,
  reloadedNotice: "Local modules reloaded.",
  reloadFailedNotice: "Failed to reload modules. Check console for details.",
  saveFailedNotice: "Failed to save settings. Check console for details.",
  readyNotice: "Module host is ready."
};

export type LocaleStrings = typeof EN;

const ZH: LocaleStrings = {
  modulesDirName: "模块抽屉目录",
  modulesDirDesc: "存放 *plugin.js 或 *plugin.mjs 的笔记库单层目录路径（默认 _Modules/plugins）",
  secretVaultHeading: "🔐 动态密钥安全池",
  secretVaultDesc: "基于 Obsidian 官方安全密钥存储，可自由添加大写别名与存储条目绑定（不支持明文配置）。",
  secretUnsupportedName: "⚠️ 安全密钥存储不可用",
  secretUnsupportedDesc: "当前 Obsidian 版本不支持官方安全密钥存储，请更新至 1.11.4 或更高版本。",
  secretAliasDesc: (alias: string) => `系统内部引用标识符: '${alias}'`,
  deleteSecretTooltip: "删除此密钥映射",
  addSecretName: "➕ 增加新密钥映射",
  addSecretDesc: "输入新的大写别名（例如: CLAUDE_KEY, GITHUB_TOKEN）",
  addSecretPlaceholder: "新密钥别名（自动转大写）",
  addButtonText: "添加",
  aliasExistsNotice: "⚠️ 密钥别名已存在！",
  reloadCommandName: "热重载所有本地抽屉模块",
  reloadingNotice: (dir: string) => `🔄 正在热重载 ${dir} ...`,
  reloadedNotice: "✅ 本地模块热重载完成！",
  reloadFailedNotice: "❌ 热重载失败，请打开控制台查看报错详情。",
  saveFailedNotice: "❌ 配置保存失败，请打开控制台查看报错详情。",
  readyNotice: "✅ [Module Host] 纯净宿主已就绪！"
};

/**
 * 根据当前 Obsidian 界面语言自动选择中文或英文词典
 */
export function getStrings(): LocaleStrings {
  const lang = getLanguage().toLowerCase();
  return lang.startsWith("zh") ? ZH : EN;
}