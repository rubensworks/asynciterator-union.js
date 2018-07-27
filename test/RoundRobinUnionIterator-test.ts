import {ArrayIterator, AsyncIterator, BufferedIterator, EmptyIterator} from "asynciterator";
import {RoundRobinUnionIterator} from "../lib/RoundRobinUnionIterator";
const arrayifyStream = require('arrayify-stream');

describe('RoundRobinUnionIterator', () => {
  let sources: AsyncIterator<number>[];
  let it1: AsyncIterator<number>;
  let it2: AsyncIterator<number>;
  let rrit: RoundRobinUnionIterator<number>;

  beforeEach(() => {
    sources = [
      it1 = AsyncIterator.range(0, 2),
      it2 = AsyncIterator.range(3, 6),
    ];
    rrit = new RoundRobinUnionIterator(sources);
  });

  it('should be constructable with 0 sources in an array', () => {
    return expect(new RoundRobinUnionIterator([])).toBeInstanceOf(AsyncIterator);
  });

  it('should be constructable with 1 source in an array', () => {
    return expect(new RoundRobinUnionIterator([AsyncIterator.range(0, 2)])).toBeInstanceOf(AsyncIterator);
  });

  it('should be constructable with 2 sources in an array', () => {
    return expect(new RoundRobinUnionIterator(
      [AsyncIterator.range(0, 2), AsyncIterator.range(3, 6)])).toBeInstanceOf(AsyncIterator);
  });

  it('should be constructable with 0 sources in an iterator', () => {
    return expect(new RoundRobinUnionIterator(new ArrayIterator([]))).toBeInstanceOf(AsyncIterator);
  });

  it('should be constructable with 1 source in an iterator', () => {
    return expect(new RoundRobinUnionIterator(new ArrayIterator(
      [AsyncIterator.range(0, 2)]))).toBeInstanceOf(AsyncIterator);
  });

  it('should be constructable with 1 empty source in an iterator', () => {
    return expect(new RoundRobinUnionIterator(new ArrayIterator(
      [new EmptyIterator()]))).toBeInstanceOf(AsyncIterator);
  });

  it('should be constructable with 2 sources in an iterator', () => {
    return expect(new RoundRobinUnionIterator(new ArrayIterator([AsyncIterator.range(0, 2),
      AsyncIterator.range(3, 6)]))).toBeInstanceOf(AsyncIterator);
  });

  it('should be an AsyncIterator', () => {
    return expect(rrit).toBeInstanceOf(AsyncIterator);
  });

  it('should emit an error when the first iterator emits an error', () => {
    const error = new Error('error');
    const p = arrayifyStream(rrit);
    rrit._read(1, () => it1.emit('error', error));
    return p.catch((e) => {
      expect(e).toBe(error);
    });
  });

  it('should emit an error when the second iterator emits an error', () => {
    const error = new Error('error');
    const p = arrayifyStream(rrit);
    rrit._read(1, () => it1.emit('error', error));
    return p.catch((e) => {
      expect(e).toBe(error);
    });
  });

  it('should not emit an error no iterators emit an error', () => {
    const p = arrayifyStream(rrit);
    return p.then((data) => {
      expect(data).toBeTruthy();
    });
  });

  it('should emit an error when the source iterator emits an error', () => {
    const sourceStream = new BufferedIterator<AsyncIterator<number>>();
    const rritStream = new RoundRobinUnionIterator<number>(sourceStream);
    const error = new Error('error');
    const p = arrayifyStream(rritStream);
    rritStream._read(1, () => sourceStream.emit('error', error));
    return p.catch((e) => {
      expect(e).toBe(error);
    });
  });

  it('should allow the _read method to be called multiple times', () => {
    rrit._read(1, () => { return; });
    rrit._read(1, () => { return; });
  });

  it('should make a round-robin union of the data elements', async () => {
    return expect((await arrayifyStream(rrit)).sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('should make a round-robin union of the data elements for 3 sources', async () => {
    rrit = new RoundRobinUnionIterator([
      it1 = AsyncIterator.range(0, 2),
      it2 = AsyncIterator.range(3, 4),
      it2 = AsyncIterator.range(5, 6),
    ]);
    return expect((await arrayifyStream(rrit)).sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  describe('with sources that are added dynamically', () => {
    const sourceStream = new BufferedIterator<AsyncIterator<number>>();
    const rritStream = new RoundRobinUnionIterator<number>(sourceStream);

    const arrayIt1 = AsyncIterator.range(0, 2);
    const arrayIt2 = AsyncIterator.range(0, 2);
    const arrayIt3 = AsyncIterator.range(3, 5);

    it('should not read anything without sources', () => {
      expect(rritStream.read()).toBeFalsy();

      expect(rritStream.ended).toBeFalsy();
    });

    it('should read a whole stream once one has been added', () => {
      sourceStream._push(arrayIt1);

      expect(rritStream.read()).toBeFalsy();

      rritStream._read(1, () => { return; });
      expect(rritStream.read()).toBe(0);
      expect(rritStream.read()).toBeFalsy();

      rritStream._read(1, () => { return; });
      expect(rritStream.read()).toBe(1);
      expect(rritStream.read()).toBeFalsy();

      rritStream._read(1, () => { return; });
      expect(rritStream.read()).toBe(2);
      expect(rritStream.read()).toBeFalsy();

      rritStream._read(1, () => { return; });
      expect(rritStream.read()).toBeFalsy();

      expect(rritStream.ended).toBeFalsy();
    });

    it('should read 2 streams in round-robin order once they have been added', () => {
      sourceStream._push(arrayIt2);
      sourceStream._push(arrayIt3);

      expect(rritStream.read()).toBeFalsy();

      rritStream._read(1, () => { return; });
      expect(rritStream.read()).toBe(0);
      expect(rritStream.read()).toBeFalsy();

      rritStream._read(1, () => { return; });
      expect(rritStream.read()).toBe(3);
      expect(rritStream.read()).toBeFalsy();

      rritStream._read(1, () => { return; });
      expect(rritStream.read()).toBe(1);
      expect(rritStream.read()).toBeFalsy();

      rritStream._read(1, () => { return; });
      expect(rritStream.read()).toBe(4);
      expect(rritStream.read()).toBeFalsy();

      rritStream._read(1, () => { return; });
      expect(rritStream.read()).toBe(2);
      expect(rritStream.read()).toBeFalsy();

      rritStream._read(1, () => { return; });
      expect(rritStream.read()).toBe(5);
      expect(rritStream.read()).toBeFalsy();

      rritStream._read(1, () => { return; });
      expect(rritStream.read()).toBeFalsy();

      expect(rritStream.ended).toBeFalsy();
    });

    it('should read end when the source stream is ended', async () => {
      // Block until all array iterators have been properly closed
      await Promise.all([
        new Promise((resolve) => arrayIt1.on('end', resolve)),
        new Promise((resolve) => arrayIt2.on('end', resolve)),
        new Promise((resolve) => arrayIt3.on('end', resolve)),
      ]);

      sourceStream._end();

      rritStream._read(1, () => { return; });
      expect(rritStream.read()).toBeFalsy();

      await new Promise((resolve) => rritStream.on('end', resolve));

      rritStream._read(1, () => { return; });
      expect(rritStream.read()).toBeFalsy();

      expect(rritStream.ended).toBeTruthy();
    });
  });
});
