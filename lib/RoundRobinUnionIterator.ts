import {ArrayIterator, AsyncIterator, BufferedIterator, BufferedIteratorOptions} from "asynciterator";

/**
 * An iterator that takes elements from a given array or iterator of iterators in a round-robin manner.
 *
 * Based on LDF client's UnionIterator:
 * https://github.com/LinkedDataFragments/Client.js/blob/master/lib/sparql/UnionIterator.js
 */
export class RoundRobinUnionIterator<T> extends BufferedIterator<T> {

  protected readonly sourceIterator: AsyncIterator<AsyncIterator<T>>;
  protected readonly sources: AsyncIterator<T>[];
  protected sourcedEnded: boolean = false;
  protected currentSource: number = 0;
  protected listenersAttached: boolean = false;

  constructor(sources: AsyncIterator<AsyncIterator<T>> | AsyncIterator<T>[], options?: BufferedIteratorOptions) {
    super(options || { autoStart: false });
    this.sources = [];
    this.sourceIterator = Array.isArray(sources) ? new ArrayIterator(sources) : sources;

    this.sourceIterator.on('error', (error) => this.emit('error', error));
    this.sourceIterator.on('end', () => {
      this.sourcedEnded = true;
      this._checkClose();
    });
  }

  public _read(count: number, done: () => void): void {
    if (!this.sourcedEnded) {
      // Fill the buffer once the source iterator becomes readable
      if (!this.listenersAttached) {
        this.listenersAttached = true;
        this.sourceIterator.on('readable', () => this._fillBuffer());
      }

      // Poll for new sources
      let source: AsyncIterator<T>;
      while (source = this.sourceIterator.read()) {
        source.on('error', (error) => this.emit('error', error));
        source.on('readable', () => this._fillBuffer());
        source.on('end', () => this._fillBuffer());
        this.sources.push(source);
      }
    }

    let item: T = null;
    let attempts: number = this.sources.length;

    // Iterate over all sources once
    while (this.sources.length && item === null && attempts--) {
      const source = this.sources[this.currentSource];

      // Read from the current source
      item = source.read();

      // Remove the source if it has ended, otherwise, increment our stored position
      if (source.ended) {
        this.sources.splice(this.currentSource, 1);
      } else {
        this.currentSource++;
      }

      this.currentSource = this.sources.length ? this.currentSource % this.sources.length : 0;
    }

    // Push to the buffer if we have an item
    if (item !== null) {
      this._push(item);
    }
    // Otherwise close
    this._checkClose();

    done();
  }

  private _checkClose() {
    if (!this.sources.length && this.sourcedEnded) {
      this.close();
    }
  }

}
