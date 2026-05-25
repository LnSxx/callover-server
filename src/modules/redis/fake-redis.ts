/* eslint-disable @typescript-eslint/require-await */

type ZSetMember = {
  score: number;
  value: string;
};

type RedisCommand = () => Promise<void>;

class FakeRedisMulti {
  constructor(
    private readonly redis: FakeRedis,
    private readonly commands: RedisCommand[] = [],
  ) {}

  zAdd(
    key: string,
    member: {
      score: number;
      value: string;
    },
  ): FakeRedisMulti {
    this.commands.push(() => this.redis.zAdd(key, member));
    return this;
  }

  zRem(key: string, value: string): FakeRedisMulti {
    this.commands.push(() => this.redis.zRem(key, value));
    return this;
  }

  set(key: string, value: string, options?: { EX?: number }): FakeRedisMulti {
    this.commands.push(() => this.redis.set(key, value, options));
    return this;
  }

  expire(key: string, seconds: number): FakeRedisMulti {
    this.commands.push(() => this.redis.expire(key, seconds));
    return this;
  }

  del(key: string): FakeRedisMulti {
    this.commands.push(() => this.redis.del(key));
    return this;
  }

  sAdd(key: string, value: string): FakeRedisMulti {
    this.commands.push(() => this.redis.sAdd(key, value));
    return this;
  }

  sRem(key: string, value: string): FakeRedisMulti {
    this.commands.push(() => this.redis.sRem(key, value));
    return this;
  }

  async exec(): Promise<void> {
    for (const command of this.commands) {
      await command();
    }
  }
}

export class FakeRedis {
  private readonly strings = new Map<string, string>();
  private readonly sets = new Map<string, Set<string>>();
  private readonly zsets = new Map<string, Map<string, number>>();
  private readonly expirations = new Map<string, number>();

  private nowMs(): number {
    return Date.now();
  }

  private isExpired(key: string): boolean {
    const expiresAt = this.expirations.get(key);

    if (!expiresAt) {
      return false;
    }

    if (expiresAt > this.nowMs()) {
      return false;
    }

    this.strings.delete(key);
    this.sets.delete(key);
    this.zsets.delete(key);
    this.expirations.delete(key);

    return true;
  }

  async exists(key: string): Promise<number> {
    this.isExpired(key);

    return this.hasKey(key) ? 1 : 0;
  }

  async get(key: string): Promise<string | null> {
    this.isExpired(key);

    return this.strings.get(key) ?? null;
  }

  async set(
    key: string,
    value: string,
    options?: { EX?: number },
  ): Promise<void> {
    this.strings.set(key, value);

    if (options?.EX) {
      this.expirations.set(key, this.nowMs() + options.EX * 1000);
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.hasKey(key)) {
      return;
    }

    this.expirations.set(key, this.nowMs() + seconds * 1000);
  }

  async del(key: string): Promise<void> {
    this.strings.delete(key);
    this.sets.delete(key);
    this.zsets.delete(key);
    this.expirations.delete(key);
  }

  async sAdd(key: string, value: string): Promise<void> {
    this.ensureNotWrongType(key, 'set');

    const set = this.sets.get(key) ?? new Set<string>();

    set.add(value);

    this.sets.set(key, set);
  }

  async sRem(key: string, value: string): Promise<void> {
    const set = this.sets.get(key);

    if (!set) {
      return;
    }

    set.delete(value);

    if (set.size === 0) {
      this.sets.delete(key);
    }
  }

  async sCard(key: string): Promise<number> {
    return this.sets.get(key)?.size ?? 0;
  }

  async sMembers(key: string): Promise<string[]> {
    return [...(this.sets.get(key) ?? [])];
  }

  async zAdd(key: string, member: ZSetMember): Promise<void> {
    this.ensureNotWrongType(key, 'zset');

    const zset = this.zsets.get(key) ?? new Map<string, number>();

    zset.set(member.value, member.score);

    this.zsets.set(key, zset);
  }

  async zRem(key: string, value: string): Promise<void> {
    const zset = this.zsets.get(key);

    if (!zset) {
      return;
    }

    zset.delete(value);

    if (zset.size === 0) {
      this.zsets.delete(key);
    }
  }

  async zCard(key: string): Promise<number> {
    return this.zsets.get(key)?.size ?? 0;
  }

  async zRange(key: string, start: number, end: number): Promise<string[]> {
    const zset = this.zsets.get(key);

    if (!zset) {
      return [];
    }

    const values = [...zset.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([value]) => value);

    return values.slice(start, end === -1 ? undefined : end + 1);
  }

  async zRangeByScore(
    key: string,
    min: number,
    max: number,
  ): Promise<string[]> {
    const zset = this.zsets.get(key);

    if (!zset) {
      return [];
    }

    return [...zset.entries()]
      .filter(([, score]) => score >= min && score <= max)
      .sort((a, b) => a[1] - b[1])
      .map(([value]) => value);
  }

  multi(): FakeRedisMulti {
    return new FakeRedisMulti(this);
  }

  private hasKey(key: string): boolean {
    return this.strings.has(key) || this.sets.has(key) || this.zsets.has(key);
  }

  private ensureNotWrongType(key: string, type: 'set' | 'zset'): void {
    const isSet = this.sets.has(key);
    const isZSet = this.zsets.has(key);

    if (type === 'set' && isZSet) {
      throw new Error('WRONGTYPE');
    }

    if (type === 'zset' && isSet) {
      throw new Error('WRONGTYPE');
    }
  }
}
