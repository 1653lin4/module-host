// src/SecretStore.ts
import type { App } from "obsidian";

export interface SecretStorageApi {
  getSecret(id: string): string | null;
  listSecrets(): string[];
}

// 独立结构接口（不继承 App，彻底避免与 1.11.4+ 必需属性产生 TS2430 冲突）
export interface AppWithSecretStorage {
  secretStorage?: SecretStorageApi;
}

export class SecretStore {
  private app: App;
  private getSettingsSecrets: () => Record<string, string>;

  constructor(app: App, getSettingsSecrets: () => Record<string, string>) {
    this.app = app;
    this.getSettingsSecrets = getSettingsSecrets;
  }

  /**
   * 🔓 极简提取接口：仅从 Obsidian 官方 SecretStorage 提取真实密钥（快速失败，不做明文兜底）
   */
  get(keyAlias: string): string | null {
    if (!keyAlias) return null;

    const storage = (this.app as unknown as AppWithSecretStorage).secretStorage;
    if (!storage || typeof storage.getSecret !== "function") {
      return null;
    }

    const secretsMap = this.getSettingsSecrets() || {};

    // 1. 优先尝试：通过设置面板中的大写别名映射获取存储 ID，再读取真实密钥
    const boundSecretId = secretsMap[keyAlias] || secretsMap[keyAlias.toUpperCase()];
    if (boundSecretId) {
      const secretVal = storage.getSecret(boundSecretId);
      if (secretVal) return secretVal;
    }

    // 2. 次优尝试：直接拿入参名称（如小写密钥 ID）去 SecretStorage 提取
    const directVal = storage.getSecret(keyAlias);
    if (directVal) return directVal;

    // 3. 快速失败：找不到直接返回空值
    return null;
  }

  /**
   * 📋 辅助方法：列出当前 SecretStorage 中已有的全部密钥标识符
   */
  list(): string[] {
    const storage = (this.app as unknown as AppWithSecretStorage).secretStorage;
    if (storage && typeof storage.listSecrets === "function") {
      return storage.listSecrets();
    }
    return [];
  }
}