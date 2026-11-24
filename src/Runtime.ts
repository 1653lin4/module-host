// src/Runtime.ts

export interface IPlugin {
  name: string;
  setup(runtime: Runtime): Promise<void> | void;
  dispose?(runtime: Runtime): Promise<void> | void;
}

export class Runtime {
  public services = new Map<string, unknown>();
  public plugins: IPlugin[] = [];

  /** 1. 注册核心服务（带防重名锁） */
  register(name: string, value: unknown): void {
    if (!name || typeof name !== "string") {
      throw new Error("[Runtime 错误] 注册名称不能为空");
    }
    if (this.services.has(name)) {
      throw new Error(`[Runtime 冲突] 服务已存在，禁止覆盖注册: ${name}`);
    }
    this.services.set(name, value);
  }

  /** 2. 提取服务（带强校验） */
  get<T = unknown>(name: string): T {
    if (!this.services.has(name)) {
      throw new Error(`[Runtime 报错] 找不到目标服务: '${name}'，请检查抽屉插件是否已挂载`);
    }
    return this.services.get(name) as T;
  }

  /** 3. 安全检查服务是否存在 */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /** 4. 安全挂载插件（防重名检测 + 失败时移出队列并触发插件自身 dispose 清理） */
  async use(plugin: IPlugin): Promise<this> {
    if (!plugin || typeof plugin.setup !== "function") {
      throw new TypeError("[Runtime 错误] 无效插件：必须提供 setup 钩子");
    }

    if (this.plugins.some((p) => p.name === plugin.name)) {
      throw new Error(`[Runtime 冲突] 插件已在运行队列中，禁止重复加载: ${plugin.name}`);
    }

    this.plugins.push(plugin);

    try {
      await plugin.setup(this);
      console.debug(`🔌 [Runtime 微内核] 成功挂载抽屉插件: ${plugin.name}`);
      return this;
    } catch (err: unknown) {
      console.warn(`⚠️ [Runtime 熔断] 插件 '${plugin.name || "未知"}' 初始化失败，正在执行单体回滚...`, err);

      const idx = this.plugins.indexOf(plugin);
      if (idx !== -1) {
        this.plugins.splice(idx, 1);
      }

      try {
        await plugin.dispose?.(this);
      } catch (disposeErr: unknown) {
        console.error(`❌ [Runtime 单体回滚异常] 插件 '${plugin.name}' 资源清理失败:`, disposeErr);
      }

      throw err;
    }
  }

  /** 5. LIFO 逆序优雅销毁清场（后进先出） */
  async dispose(): Promise<void> {
    const reversePlugins = [...this.plugins].reverse();

    for (const plugin of reversePlugins) {
      if (typeof plugin.dispose === "function") {
        try {
          await plugin.dispose(this);
        } catch (e: unknown) {
          console.error(`❌ [Dispose 异常] 插件 '${plugin.name}' 释放失败:`, e);
        }
      }
    }

    this.plugins = [];
    this.services.clear();
  }
}