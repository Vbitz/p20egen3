// tslint:disable:no-any

import {Bag} from './common';

export class Datastore {
  private data: Map<string, any> = new Map();

  set<T>(key: string, value: T) {
    this.data.set(key, value);
  }

  get<T>(key: string, defaultValue: T): T {
    if (this.data.has(key)) {
      return this.data.get(key);
    } else {
      return defaultValue;
    }
  }
}