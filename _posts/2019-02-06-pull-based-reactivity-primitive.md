---
layout: post
title: 'Pull-Based Reactivity Primitive'
date: 2019-02-06 08:00:00 -0800
---

Observables, like those provided by [Reactive Extensions][rx], are a _push_
based reactivity primitive. [React][react], on the other hand, uses a _pull_
based reactivity model. I’ll be using JavaScript and [RxJS][rxjs] for my
examples.

[rx]: http://reactivex.io
[react]: https://reactjs.org
[rxjs]: https://rxjs.dev

An Observable _pushes_ events over time. A bit like an event emitter.

```js
let button = document.querySelector('button');

fromEvent(button, 'click')
  .pipe(scan(count => count + 1, 0))
  .subscribe(count => console.log(`Clicked ${count} times`));
```

In this example, every time a `<button>` is clicked we _push_ a new event. Every
event is guaranteed to be seen by our subscriber. It’s as if we implemented the
above code with:

```js
let button = document.querySelector('button');

let count = 0;

button.addEventListener('click', () => {
  count = count + 1;
  console.log(`Clicked ${count} times`);
});
```

React uses a pull-based reactivity model which is subtly different. I’ll be
using [React Hooks][react-hooks] in my examples.

[react-hooks]: https://reactjs.org/docs/hooks-intro.html

```js
function MyButton() {
  let [count, setCount] = useState(0);

  function handleClick() {
    setCount(prevCount => prevCount + 1);
  }

  return <button onClick={handleClick}>{count}<button/>;
}
```

The `setCount()` function does not _push_ a new state to the React component.
Instead, it invalidates the current state and lets React update the component
whenever it wants. (The same is true for `setState()` in a class component.)

It’s like we wrote:

```js
let button = document.querySelector('button');

let count = 0;

button.addEventListener('click', () => {
  count = count + 1;
  invalidate();
});

let isInvalid = false;
function invalidate() {
  if (isInvalid === false) {
    isInvalid = true;
    scheduler.withUserInteractionPriority(() => {
      button.innerText = count.toString();
      isInvalid = false;
    });
  }
}
```

If you’ve written React for a while, you’ve probably run into this:

```js
function handleClick() {
  console.log(count); // Prints 0
  setCount(prevCount => prevCount + 1);
  console.log(count); // Prints 0
}
```

Even though you called `setCount()`, the value for `count` does not change! The
value for `count` will change _eventually_ but not immediately. This is because
when you call `setCount()`, React in Concurrent Mode doesn’t immediately update
your component. Instead, it _schedules_ an update to happen at some later time.

If the action is user-generated, like a click, React will schedule an update
with a higher priority. If the action is not user-generated, like you just got a
big JSON blob from your backend, React will schedule an update with a lower
priority.

This means if a user clicks at the same time you get a big JSON blob from your
backend the user’s click will always be prioritized and rendered _first_.

This just isn’t possible in a push-based reactivity system. In a push-based
reactivity system the producer has control over when an action is processed. If
I push you something, you _must_ process it. In a pull-based reactivity system
the consumer has control over when an action is processed. If I push you
something, I don’t get to tell you when it is processed.

Concurrent React takes full advantage of this control by using a
[scheduler][react-scheduler] to prioritize user actions over every other action.

<!-- prettier-ignore-start -->
[react-scheduler]: https://github.com/facebook/react/blob/c21c41ecfad46de0a718d059374e48d13cf08ced/packages/scheduler/src/Scheduler.js
<!-- prettier-ignore-end -->

## Rust Futures

[Rust futures][rust-futures] are another example of pull-based reactivity.
Futures in Rust are like promises in JavaScript. However, while a JavaScript
promise is push-based a Rust future is pull-based. Like most things in Rust,
futures aim to be a zero-cost abstraction for async IO.

[rust-futures]: https://docs.rs/futures/0.1.25/futures

For a data type in Rust to be a future it must implement this trait:

```rs
trait Future {
  type Item;
  type Error;
  fn poll(&mut self) -> Poll<Self::Item, Self::Error>;
}
```

The type [`Poll<Item, Error>`][rust-poll] type may have one of three states:

[rust-poll]: https://docs.rs/futures/0.1.25/futures/type.Poll.html

- `Ok(Async::Ready(item))` means that a future has successfully resolved.
- `Ok(Async::NotReady)` means that a future is not ready to complete yet.
- `Err(error)` means that a future has completed with the given failure.

These are similar to the three states of a JavaScript promise: resolved,
pending, and rejected. Except you create a JavaScript promise with:

```js
new Promise((resolve, reject) => {
  // ...
});
```

Calling `resolve()` _pushes_ the resolved value to anyone listening to the
promise. In Rust, however, the consumer must continue to call `poll()` while it
returns `Ok(Async::NotReady)`. To resolve a Rust future and block the current
thread one might write:

```rs
loop {
  match future.poll() {
    Ok(Async::NotReady) => {} // Try again...
    Ok(Async::Ready(item)) => return Ok(item),
    Err(error) => return Err(error),
  }
}
```

This code will loop until the future is either resolved or rejected.

Rust futures also come with a way to register a task. If you call
`future.poll()` and get `Async::NotReady` the `poll()` function will notify your
task when the value is ready. If futures were written in JavaScript we’d write a
future for fetching some data like this:

```js
let fetchStarted = false;
let currentTask;

let result;

function poll() {
  if (result !== undefined) {
    return result;
  } else {
    if (fetchStarted === false) {
      fetchStarted = true;
      fetch('https://api.example.org/user/42')
        .then(response => response.json())
        .then(responseData => {
          result = responseData;
          // If `poll()` was called in the context of a task, notify that task
          // so it calls `poll()` again.
          if (currentTask !== undefined) {
            currentTask.notify();
          }
        });
    }
    // Record the current task and tell the caller of `poll()` that we
    // aren’t ready.
    currentTask = Task.current();
    return Async.NotReady;
  }
}
```

When `poll()` is called the first time we start our `fetch()` request and we
return `Async.NotReady`. If `poll()` is called again before `fetch()` finishes
then we return `Async.NotReady` again. Finally, when we get our response back,
we will call `currentTask.notify()` which tells our task that we are done.

Now that `currentTask` was notified, it can call `poll()` again _whenever_ it
wants. The task can use a scheduler to wait to call `poll()` until after all
user actions are finished, for instance. This is what makes Rust futures poll
based.

Remember that Rust futures, like promises, are one-shot. They resolve to a
single value instead of multiple values that change over time.

## Primitive

The common feature between React’s implementation of pull-based reactivity and
Rust future’s implementation of pull-based reactivity is _invalidation_. Instead
of pushing new values to listeners, these implementations will tell listeners
when there is a new value.

There are two fundamental operations to the pull-based reactivity primitive:

- `get()` which retrieves the value and possibly does some computation.
- `invalidate()` which tells listeners that the value has changed.

You can imagine your data source using this primitive. `get()` fetches a user
profile and when the user edits their profile you’d call `invalidate()` on that
data source. Now everyone who was using the user profile may call `get()` to
re-fetch the new user profile.

In React land, `get()` is when React calls your component’s render function. It
is _getting_ the latest UI. You `invalidate()` your component by calling a
`setState()` function.

In Rust future land, `get()` is the `poll()` function and `invalidate()` is
`task.notify()` which tells the task it’s time to call `poll()` again.

## Implementation: Deep End

If we go to implement our pull-based reactivity in JavaScript we may end up with
something that looks like this.

```ts
let invalid = Symbol('invalid');

class State<T> {
  private readonly _getter: () => T;

  private _value: T | typeof invalid = invalid;

  constructor(getter: () => T) {
    this._getter = getter;
  }

  get() {
    if (this._value === invalid) {
      this._value = this._getter();
    }
    return this._value;
  }

  invalidate() {
    this._value = invalid;

    // TODO: We need some way to notify listeners here...
  }
}
```

This is, of course, a naive skeleton of an implementation. Here are some things
to consider when implementing a full pull-based reactivity primitive:

- In `invalidate()` we need some way to notify our listeners that the value has
  changed. In React and Rust futures there is only ever one listener. React is
  the listener for a React component and the calling task of `poll()` is the
  sole listener for Rust futures. We could allow our primitive to have many
  listeners like an observable. Is there any efficiency advantage to limiting
  the primitive to only one listener?
- We need to be able to implement combinators on top of this primitive like
  those in RxJS. Such as `map()` or `then()`. It’s fairly easy to imagine how
  these would be implemented on top of this primitive.
- What would an asynchronous version of this primitive look like? Should calling
  `invalidate()` cancel the asynchronous work? Should there be another
  cancellation mechanism?
- There’s also the need for some kind of transaction system to avoid [reactive
  glitches][reactive-glitches]. React, at a minimum, always defers state updates
  to the next turn of the event loop. Should invalidations in our primitive work
  this way as well?

[reactive-glitches]: https://en.wikipedia.org/wiki/Reactive_programming#Glitches

## Further Reading

- [Derivable.js](https://github.com/ds300/derivablejs) is one great
  implementation of pull-based reactivity with a priority placed on performance.
  However, the reactor system pushes new values to its callback which defeats
  the purpose of pull-based reactivity. You aren’t able to schedule with low
  priority the computation of the derivable value since the computation is
  forced before your reactor callback is executed.
- [Skip](https://github.com/skiplang/skip) is an experimental programming
  language which is entirely reactive except for its external data sources which
  use this pull-based reactivity model. When a Skip data source invalidates,
  then Skip will invalidate all reactive cache entries that depend on that data
  source.
