// tslint:disable:no-any

import {Bag} from './common';

export class Datastore {
  private data: Map<string, any> = new Map();

  put<T>(ns: string, id: string, value: T) {
    const key = this.makeKey(ns, id);
    this.data.set(key, value);
  }

  get<T>(ns: string, id: string, defaultValue: T): T {
    const key = this.makeKey(ns, id);
    if (this.data.has(key)) {
      return this.data.get(key);
    } else {
      return defaultValue;
    }
  }

  has(ns: string, id: string) {
    const key = this.makeKey(ns, id);
    return this.data.has(key);
  }

  delete(ns: string, id: string) {
    const key = this.makeKey(ns, id);
    if (this.data.has(key)) {
      this.data.delete(key);
    }
  }

  private makeKey(ns: string, id: string) {
    return `${ns}:${id}`;
  }
}