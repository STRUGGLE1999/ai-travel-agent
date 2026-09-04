/**
 * 高德地图 Web 服务 REST API 底层通信客户端。
 * 安全规范：禁止在任何日志、错误消息或前端输出中泄露真实 API Key。
 */

export type AmapFetchFn = (
  url: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface AmapClientOptions {
  apiKey?: string;
  timeoutMs?: number;
  fetchFn?: AmapFetchFn;
}

export interface AmapBaseResponse {
  status: string; // "1" 成功，"0" 失败
  info: string;
  infocode: string; // "10000" 成功
}

export class AmapClient {
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;
  private readonly fetchFn: AmapFetchFn;

  constructor(options: AmapClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.AMAP_WEB_SERVICE_KEY;
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
  }

  public hasKey(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public async get<T extends AmapBaseResponse>(
    endpoint: string,
    params: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    if (!this.hasKey()) {
      throw new Error("AMAP_WEB_SERVICE_KEY is missing or empty");
    }

    const searchParams = new URLSearchParams();
    searchParams.set("key", this.apiKey!);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        searchParams.set(k, String(v));
      }
    }

    const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
    const url = `https://restapi.amap.com/v3/${cleanEndpoint}?${searchParams.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`AMap HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as T;
      if (data.status !== "1" || (data.infocode && data.infocode !== "10000")) {
        throw new Error(`AMap API Error: ${data.info || "Unknown"} (code: ${data.infocode})`);
      }

      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
