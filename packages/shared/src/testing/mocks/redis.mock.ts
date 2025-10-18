/**
 * Mock Redis client for testing cache operations
 */
export class MockRedis {
  private store: Map<string, { value: string; ttl?: number; expires?: number }> = new Map();

  // String operations
  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expires && entry.expires < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK' | null> {
    let expires: number | undefined;

    if (mode === 'EX' && duration) {
      expires = Date.now() + duration * 1000;
    } else if (mode === 'PX' && duration) {
      expires = Date.now() + duration;
    }

    this.store.set(key, { value, ttl: duration, expires });
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    return this.set(key, value, 'EX', seconds) as Promise<'OK'>;
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.store.delete(key)) deleted++;
    }
    return deleted;
  }

  async exists(...keys: string[]): Promise<number> {
    return keys.filter(key => this.store.has(key)).length;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;

    entry.expires = Date.now() + seconds * 1000;
    entry.ttl = seconds;
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -2;
    if (!entry.expires) return -1;

    const remaining = Math.ceil((entry.expires - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  // Hash operations
  async hget(key: string, field: string): Promise<string | null> {
    const hash = this.store.get(key);
    if (!hash) return null;

    try {
      const parsed = JSON.parse(hash.value);
      return parsed[field] || null;
    } catch {
      return null;
    }
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    const existing = this.store.get(key);
    let hash: Record<string, string> = {};

    if (existing) {
      try {
        hash = JSON.parse(existing.value);
      } catch {
        hash = {};
      }
    }

    const isNew = !hash[field];
    hash[field] = value;
    this.store.set(key, { value: JSON.stringify(hash) });
    return isNew ? 1 : 0;
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    const hash = this.store.get(key);
    if (!hash) return null;

    try {
      return JSON.parse(hash.value);
    } catch {
      return null;
    }
  }

  // List operations
  async lpush(key: string, ...values: string[]): Promise<number> {
    const existing = this.store.get(key);
    let list: string[] = [];

    if (existing) {
      try {
        list = JSON.parse(existing.value);
      } catch {
        list = [];
      }
    }

    list.unshift(...values);
    this.store.set(key, { value: JSON.stringify(list) });
    return list.length;
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    const existing = this.store.get(key);
    let list: string[] = [];

    if (existing) {
      try {
        list = JSON.parse(existing.value);
      } catch {
        list = [];
      }
    }

    list.push(...values);
    this.store.set(key, { value: JSON.stringify(list) });
    return list.length;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const entry = this.store.get(key);
    if (!entry) return [];

    try {
      const list = JSON.parse(entry.value);
      return list.slice(start, stop === -1 ? undefined : stop + 1);
    } catch {
      return [];
    }
  }

  // Utility methods
  async flushall(): Promise<'OK'> {
    this.store.clear();
    return 'OK';
  }

  async flushdb(): Promise<'OK'> {
    return this.flushall();
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.store.keys()).filter(key => regex.test(key));
  }

  disconnect(): void {
    this.store.clear();
  }

  quit(): void {
    this.disconnect();
  }
}
