class WindowUtility {
  private isClient: boolean;

  location: {
    origin: string;
    pathname: string;
    reload: () => void;
    href?: string;
  };

  constructor() {
    this.isClient = typeof window !== "undefined";
    this.location = {
      origin: this.isClient ? window.location.origin : "",
      pathname: this.isClient ? window.location.pathname : "",
      reload: () => {
        if (this.isClient) {
          window.location.reload();
        }
      },
      href: this.isClient ? window.location.href : undefined,
    };
  }

  // Location utilities
  getOrigin(): string {
    return this.isClient ? window.location.origin : "";
  }

  getPathname(): string {
    return this.isClient ? window.location.pathname : "";
  }

  // Dimension utilities
  getInnerWidth(): number {
    return this.isClient ? window.innerWidth : 0;
  }

  getInnerHeight(): number {
    return this.isClient ? window.innerHeight : 0;
  }

  // Scroll utilities
  getScrollY(): number {
    return this.isClient ? window.scrollY : 0;
  }

  scrollTo(x: number, y: number): void {
    if (this.isClient) {
      window.scrollTo(x, y);
    }
  }

  // Event listener utilities
  addEventListener(
    event: string,
    handler: EventListenerOrEventListenerObject,
  ): void {
    if (this.isClient) {
      window.addEventListener(event, handler);
    }
  }

  removeEventListener(
    event: string,
    handler: EventListenerOrEventListenerObject,
  ): void {
    if (this.isClient) {
      window.removeEventListener(event, handler);
    }
  }

  // Image utility
  createImage(): HTMLImageElement {
    return this.isClient ? new window.Image() : ({} as HTMLImageElement);
  }

  // Mobile detection
  isMobileView(): boolean {
    return this.isClient && window.innerWidth < 768;
  }

  Image(): HTMLImageElement {
    return this.isClient ? new window.Image() : ({} as HTMLImageElement);
  }

  scrollY(): number {
    return this.isClient ? window.scrollY : 0;
  }

  scrollX(): number {
    return this.isClient ? window.scrollX : 0;
  }
}

const windowUtility = new WindowUtility();
export default windowUtility;
