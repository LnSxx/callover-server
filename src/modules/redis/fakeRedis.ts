/* eslint-disable @typescript-eslint/require-await */
export class FakeRedis {
  private strings = new Map<string, string>();
  private sets = new Map<string, Set<string>>();

  async exists(key: string): Promise<number> {
    return this.strings.has(key) || this.sets.has(key) ? 1 : 0;
  }

  async get(key: string): Promise<string | null> {
    return this.strings.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.strings.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.strings.delete(key);
    this.sets.delete(key);
  }

  async sAdd(key: string, value: string): Promise<void> {
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

  multi() {
    const commands: Array<() => Promise<void>> = [];

    return {
      sAdd: (key: string, value: string) => {
        commands.push(() => this.sAdd(key, value));
        return this.multiResult(commands);
      },
      set: (key: string, value: string) => {
        commands.push(() => this.set(key, value));
        return this.multiResult(commands);
      },
      del: (key: string) => {
        commands.push(() => this.del(key));
        return this.multiResult(commands);
      },
      sRem: (key: string, value: string) => {
        commands.push(() => this.sRem(key, value));
        return this.multiResult(commands);
      },
      exec: async () => {
        for (const command of commands) {
          await command();
        }
      },
    };
  }

  private multiResult(commands: Array<() => Promise<void>>) {
    return {
      sAdd: (key: string, value: string) => {
        commands.push(() => this.sAdd(key, value));
        return this.multiResult(commands);
      },
      set: (key: string, value: string) => {
        commands.push(() => this.set(key, value));
        return this.multiResult(commands);
      },
      del: (key: string) => {
        commands.push(() => this.del(key));
        return this.multiResult(commands);
      },
      sRem: (key: string, value: string) => {
        commands.push(() => this.sRem(key, value));
        return this.multiResult(commands);
      },
      exec: async () => {
        for (const command of commands) {
          await command();
        }
      },
    };
  }
}
