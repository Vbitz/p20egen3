import 'jest';

import {Datastore} from './Datastore';

const TEST_NS = 'test';

it('should return the same value it sets', () => {
  const ds = new Datastore();
  ds.put(TEST_NS, 'Hello', 'World');
  expect(ds.get<string>(TEST_NS, 'Hello', '')).toEqual('World');
});

it('should not return an error if delete is called on a invalid key', () => {
  const ds = new Datastore();
  ds.put(TEST_NS, 'hello', 1);
  ds.delete(TEST_NS, 'world');
  ds.delete(TEST_NS, 'hello');
});

it('should delete keys', () => {
  const ds = new Datastore();
  ds.put(TEST_NS, 'hello', true);
  expect(ds.has(TEST_NS, 'hello')).toBeTruthy();
  ds.delete(TEST_NS, 'hello');
  expect(ds.has(TEST_NS, 'hello')).toBeFalsy();
});

it('should return default values for non-existent keys', () => {
  const ds = new Datastore();
  expect(ds.get<string>(TEST_NS, 'world', '')).toEqual('');
});