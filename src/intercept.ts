import { InfiniteQueue } from 'infinite-queue';
import { Deferred, buildDeferred } from './build-deferred';

export type SourceFunction = (...args: any[]) => unknown;

export type NextCallCallbackInput<TFunction extends SourceFunction> = {
  /**
   * A function which calls the input `fn` with the original arguments and passes through the return value.
   */
  makeCall: () => ReturnType<TFunction>;
  /**
   * A function which takes a value that the promise returned from the input `fn` call should resolve with.
   */
  sendResult: (res: ReturnType<TFunction>) => void;
  /**
   * An array containing the arguments passed to the `fn` call.
   */
  callArgs: Parameters<TFunction>;
};

export type NextCallCallback<TFunction extends SourceFunction, TReturn> = (
  input: NextCallCallbackInput<TFunction>
) => TReturn;

export type InterceptReturn<TFunction extends SourceFunction> = {
  /**
   * A function which returns the number of calls that have not been handled with `nextCall` yet.
   */
  numCallsWaiting(): number;
  /**
   * When the returned `fn` is called it will be proxied to the input `fn` and the returned promise will resolve.
   */
  nextCall(): Promise<void>;
  /**
   * This takes a callback which will be called synchronously when the input `fn` is called. If `fn` has already been called then it will be called immediately for the oldest call.
   *
   * The promise returned from this function resolves with the return value from the callback.
   */
  nextCall<TReturn>(
    callback: NextCallCallback<TFunction, TReturn>
  ): Promise<TReturn>;
  /**
   * A function which takes the same arguments as the input `fn`, and returns a promise. If the input `fn` returned a promise then this has the same signature and can be used in its place.
   */
  fn: TFunction;
};

type PendingCall<TFunction extends SourceFunction> = {
  callArgs: Parameters<TFunction>;
  deferred: Deferred<ReturnType<TFunction>>;
};

/**
 * This takes a function to intercept.
 */
export function intercept<TFunction extends SourceFunction>(
  fn: TFunction
): InterceptReturn<TFunction> {
  const queue = InfiniteQueue<PendingCall<TFunction>>();

  const proxyFunction: TFunction = ((...callArgs: Parameters<TFunction>) => {
    const deferred = buildDeferred<ReturnType<TFunction>>();
    queue.push({ deferred, callArgs });
    return deferred.promise;
  }) as TFunction;

  const numCallsWaiting = () => queue.numItems();

  function nextCall(): Promise<void>;
  function nextCall<TReturn>(
    callback: NextCallCallback<TFunction, TReturn>
  ): Promise<TReturn>;
  function nextCall<TReturn>(
    callback?: NextCallCallback<TFunction, TReturn>
  ): Promise<TReturn | void> {
    return queue.next<TReturn | void>((call) => {
      const makeCall = (...args: unknown[]) => {
        if (args.length) {
          throw new Error(
            'makeCall() does not take any arguments. The arguments to the original call are passed through to the functon.'
          );
        }
        return fn(...call.callArgs) as ReturnType<TFunction>;
      };

      if (callback) {
        let resultSent = false;
        const sendResult = (res: ReturnType<TFunction>) => {
          if (resultSent) {
            throw new Error('Result already sent.');
          }
          resultSent = true;
          call.deferred.resolve(res);
        };
        return callback({
          callArgs: call.callArgs,
          makeCall,
          sendResult,
        });
      }

      try {
        call.deferred.resolve(makeCall());
      } catch (e) {
        call.deferred.reject(e);
      }
    });
  }

  return {
    numCallsWaiting,
    nextCall,
    fn: proxyFunction,
  };
}
