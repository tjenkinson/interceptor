export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (res: T | PromiseLike<T>) => void;
  reject: (error: any) => void;
};

export function buildDeferred<T>(): Deferred<T> {
  let resolve!: (res: T | PromiseLike<T>) => void;
  let reject!: (error: any) => void;
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return { promise, resolve, reject };
}
