import * as crypto from 'crypto';

export type Bag<T> = {
  [s: string]: T
};

/**
 * Create a random UUID.
 */
export function makeUUID() {
  const randomId = crypto.randomBytes(8).toString('hex');
  return randomId;
}