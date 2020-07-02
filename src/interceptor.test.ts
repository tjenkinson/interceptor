import { intercept } from './interceptor';

describe('Interceptor', () => {
  it('holds back a call until next is called', async () => {
    const fn = jest.fn();
    const interceptor = intercept(fn);
    expect(interceptor.numCallsWaiting()).toBe(0);
    interceptor.fn();
    expect(interceptor.numCallsWaiting()).toBe(1);
    expect(fn).toHaveBeenCalledTimes(0);
    await interceptor.nextCall();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(interceptor.numCallsWaiting()).toBe(0);
  });

  it('calls the nextCall callback with the correct args', async () => {
    const fn = jest.fn();
    const interceptor = intercept(fn);
    interceptor.fn();
    await interceptor.nextCall((input) => {
      expect(input.callArgs).toEqual([]);
      expect(typeof input.makeCall).toBe('function');
      expect(typeof input.sendResult).toBe('function');
    });
    interceptor.fn(1, 2, 3);
    await interceptor.nextCall((input) => {
      expect(input.callArgs).toEqual([1, 2, 3]);
    });
  });

  it('rejects the nextCall promise if callback throws', (done) => {
    const fn = jest.fn();
    const interceptor = intercept(fn);
    interceptor.fn();
    const mockError = new Error('mockError');
    interceptor
      .nextCall(() => {
        throw mockError;
      })
      .then(() => done.fail())
      .catch((e) => {
        expect(e).toBe(mockError);
        done();
      })
      .catch(done.fail);
  });

  it('resolves the nextCall promise with return value from callback', async () => {
    const fn = jest.fn();
    const interceptor = intercept(fn);
    interceptor.fn();
    const mockReturnVal = Symbol();
    expect(await interceptor.nextCall(() => mockReturnVal)).toBe(mockReturnVal);
  });

  it('resolves the promise from the intercepted function with value to sendResult()', async () => {
    const fn = jest.fn();
    const interceptor = intercept(fn);
    const mockReturnVal = Symbol();
    const promise = interceptor.fn();
    await interceptor.nextCall(({ sendResult }) => {
      sendResult(mockReturnVal);
    });
    expect(await promise).toBe(mockReturnVal);
  });

  it('throws if sendResult() called multiple times', async () => {
    const fn = jest.fn();
    const interceptor = intercept(fn);
    interceptor.fn();
    await interceptor.nextCall(({ sendResult }) => {
      sendResult(Promise.resolve());
      expect(() => {
        sendResult(Promise.resolve());
      }).toThrow('Result already sent.');
    });
  });

  it('calls the intercepted function when makeCall() is called with correct arguments', async () => {
    const fn = jest.fn();
    const interceptor = intercept(fn);
    interceptor.fn(1, 2, 3);
    await interceptor.nextCall(({ makeCall }) => {
      expect(fn).toHaveBeenCalledTimes(0);
      makeCall();
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(1, 2, 3);
      makeCall();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  it('throws if makeCall() is called with arguments', async () => {
    const fn = jest.fn();
    const interceptor = intercept(fn);
    interceptor.fn(1, 2, 3);
    await interceptor.nextCall(({ makeCall }) => {
      expect(() => {
        // @ts-expect-error
        makeCall(1);
      }).toThrow(
        'makeCall() does not take any arguments. The arguments to the original call are passed through to the functon.'
      );
    });
  });

  describe('when no callback is provided', () => {
    it('calls the intercepted function and returns the result on a nextCall() call', async () => {
      const interceptor = intercept((a: number, b: number, c: number) =>
        Promise.resolve(a + b + c)
      );
      const promise = interceptor.fn(1, 2, 3);
      await interceptor.nextCall();
      expect(await promise).toBe(6);
    });
  });

  it('works as expected', async () => {
    const interceptor = intercept((in1: string, in2: number) => {
      return Promise.resolve(`${in1} ${in2}`);
    });

    expect(interceptor.numCallsWaiting()).toBe(0);

    const firstCallPromise = interceptor.fn('abc', 1);
    expect(interceptor.numCallsWaiting()).toBe(1);
    const secondCallPromise = interceptor.fn('abcd', 2);
    expect(interceptor.numCallsWaiting()).toBe(2);

    const nextCallRes = await interceptor.nextCall(
      async ({ callArgs, makeCall, sendResult }) => {
        expect(callArgs).toEqual(['abc', 1]);
        const res = await makeCall();
        expect(res).toBe('abc 1');
        sendResult(Promise.resolve(res));
        return 'returnVal';
      }
    );

    expect(nextCallRes).toBe('returnVal');
    expect(interceptor.numCallsWaiting()).toBe(1);

    expect(await firstCallPromise).toBe('abc 1');

    await interceptor.nextCall();
    expect(interceptor.numCallsWaiting()).toBe(0);
    expect(await secondCallPromise).toBe('abcd 2');
  });
});
