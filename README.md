[![npm version](https://badge.fury.io/js/%40tjenkinson%2Finterceptor.svg)](https://badge.fury.io/js/%40tjenkinson%2Finterceptor)

# Interceptor

A library that helps with testing asynchronous function calls.

## Installation

```sh
npm install --save @tjenkinson/interceptor
```

or available on JSDelivr at "https://cdn.jsdelivr.net/npm/@tjenkinson/interceptor@1".

## API

### intercept(fn)

This takes a function to intercept and returns an object with the following properties:

#### fn

A function which takes the same arguments as the input `fn`, and returns a promise. If the input `fn` returned a promise then this has the same signature and can be used in its place.

#### nextCall(): Promise<void>

When the returned `fn` is called it will be proxied to the input `fn` and the returned promise will resolve.

#### nextCall<T>(callback: ({ input, makeCall, sendResult }) => T): Promise<T>

This takes a callback which will be called synchronously when the input `fn` is called. If `fn` has already been called then it will be called immediately for the oldest call.

It receives an object with the following properties:

- `callArgs`: An array containing the arguments passed to the `fn` call.
- `makeCall`: A function which calls the input `fn` with the original arguments and passes through the return value.
- `sendResult`: A function which takes a value that the promise returned from the input `fn` call should resolve with.

The promise returned from this function resolves with the return value from the callback.

#### numCallsWaiting(): number

A function which returns the number of calls that have not been handled with `nextCall` yet.

## Example

This example uses jest. Other frameworks are availble ;)

### Waiting for a function call

```ts
import { intercept } from '@tjenkinson/interceptor';

function doSomethingAsync(callback) {
  setTimeout(() => callback('it works'), 200);
}

it('calls the callback with the correct value', async () => {
  const fn = jest.fn();
  const intercepted = intercept(fn);

  doSomethingAsync(intercepted.fn);

  await intercepted.nextCall();
  expect(fn).toHaveBeenCalledWith('it works');
});
```
