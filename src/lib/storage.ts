class Storage {
  private isClient: boolean;

  constructor() {
    this.isClient = typeof window !== "undefined";
  }

  getItem(key: string): string | null {
    if (!this.isClient) return null;
    return localStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (!this.isClient) return;
    localStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    if (!this.isClient) return;
    localStorage.removeItem(key);
  }

  clear(): void {
    if (!this.isClient) return;
    localStorage.clear();
  }
}

const storage = new Storage();
export default storage;
