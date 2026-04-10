type Listener = () => void;

class Store<T> {
  private data: T;
  private listeners: Listener[] = [];

  constructor(initialValue: T) {
    this.data = initialValue;
  }

  get() {
    return this.data;
  }

  set(data: T) {
    this.data = data;
    this.listeners.forEach((l) => l());
  }

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

export const createStore = <T>(initialValue: T) => new Store<T>(initialValue);
