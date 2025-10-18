export interface RouteConfig {
  target: string;
  pathRewrite?: Record<string, string>;
  authRequired: boolean;
  rateLimit?: {
    limit: number;
    window: number; // in seconds
  };
}

export interface RouteRegistry {
  [pattern: string]: RouteConfig;
}

export interface ProxyOptions {
  target: string;
  changeOrigin?: boolean;
  pathRewrite?: Record<string, string>;
  onProxyReq?: (proxyReq: any, req: any, res: any) => void;
  onProxyRes?: (proxyRes: any, req: any, res: any) => void;
  onError?: (err: Error, req: any, res: any) => void;
}
