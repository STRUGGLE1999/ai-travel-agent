/**
 * Provider 数据缓存，用于存储高德路线规划和天气查询结果，
 * 默认保留 24 小时（86,400,000 ms），避免重复请求高德消耗配额。
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class ProviderCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs: number = 24 * 60 * 60 * 1000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  public get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  public set<T>(key: string, value: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key, { value, expiresAt });
  }

  public delete(key: string): boolean {
    return this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
  }

  public size(): number {
    return this.store.size;
  }
}

export const globalProviderCache = new ProviderCache();
