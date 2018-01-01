import 'jest';

import {Datastore} from './Datastore';

it('should return the same value it sets', () => {
  const ds = new Datastore();
  ds.put('Hello', 'World');
  expect(ds.get<string>('Hello', '')).toEqual('World');
});

it('should not return an error if delete is called on a invalid key', () => {
  const ds = new Datastore();
  ds.put('hello', 1);
  ds.delete('world');
  ds.delete('hello');
});

it('should delete keys', () => {
  const ds = new Datastore();
  ds.put('hello', true);
  expect(ds.has('hello')).toBeTruthy();
  ds.delete('hello');
  expect(ds.has('hello')).toBeFalsy();
});

it('should return default values for non-existent keys', () => {
  const ds = new Datastore();
  expect(ds.get<string>('world', '')).toEqual('');
});