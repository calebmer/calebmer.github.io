---
layout: post
title: 'Taking Control of Compilation'
date: 2019-06-17 19:00:00 -0800
---

The more work we can do at compile time, the better! That’s less work our code
has to do at runtime, but it’s not easy to move work to compile time. In this
post I propose a new way of executing code, focused on JavaScript applications,
that makes _moving work to compile time as simple as moving a variable to global
scope_.

Let’s first think about our code’s compilation and execution in two phases,
**buildtime** and **runtime** respectively.

Buildtime code executes on the developer’s machine before they deploy their
application. Runtime code executes on a user’s machine when they run the
application.

Buildtime tasks include Webpack bundling many JavaScript files into one big file
or Babel compiling ES6 features down to ES5. [Svelte](https://svelte.dev/) does
a lot of work at buildtime to create a fast application at runtime.

When we developers write JavaScript, or other product languages like Swift and
Kotlin, we expect that all our code will be executed at runtime. If we want to
execute something at buildtime we write a script or a compiler plugin.

There are a lot of tasks in product development which would make sense to run at
buildtime, but we often run these tasks at runtime instead since it’s
convenient. For example:

- Parsing [Apollo GraphQL](https://github.com/apollographql/graphql-tag)
  queries.
- Parsing [Styled Components](https://www.styled-components.com/) CSS.
- Choosing a translation based on the locale.

There are also a lot of tasks which we do run at buildtime but require lots of
configuration _outside_ of our source code.

- Bundle splitting.
- Optimizing image formats like SVG.
- Extracting CSS to a static file.
- Generating HTML files.

We have many opportunities to optimize our applications at buildtime. However,
we miss a lot of those opportunities because configuring Webpack or Babel or
_insert buildtime tool here_ is hard.

We also have very few ways to innovate when it to buildtime work. There’s
[Svelte](https://svelte.dev) which had to build its own compiler to innovate at
buildtime. There’s
[`babel-plugin-macros`](https://github.com/kentcdodds/babel-plugin-macros) which
requires macro authors to write a Babel AST transform where it’s easy to miss
corner cases.

Today, I will propose a vision for a new way to execute programs that makes
writing buildtime code _free_. No Webpack plugins. No Babel transforms. No
custom compilers.

By making buildtime code dead simple to write, we can empower every developer to
make the next big compiler optimization for our products.

## Vision: Modules execute at Buildtime, not Runtime

Today a JavaScript module that looks like this:

```js
import fibonacci from './utils/fibonacci';

console.log(fibonacci(12)); // 144
```

Will print “144” to the console of every end user of the application. This
module executes at _runtime_.

Instead, let’s execute it at buildtime and add a hook for executing code at
runtime.

```js
import fibonacci from './utils/fibonacci';

const x = fibonacci(12);

Build.createBundle('my-bundle.js', () => {
  console.log(x);
});
```

We now execute this module at buildtime. We compute `fibonacci(12)` once on the
developer’s machine instead of thousands of times on the machines of their
users.

Then, we call `Build.createBundle()` which creates a new JS bundle named
`my-bundle.js`. Just like adding a new entry to your Webpack config. After
running this code at buildtime you’ll get a bundle that looks like this.

```
var x = 144;
console.log(x);
```

We don’t have to include our `fibonacci()` function in the bundle and we can
directly inline the constant result of calling `fibonacci(12)`.

Let’s consider a more advanced example, translations.

```jsx
import App from './App';
import TranslationContext from './TranslationContext';

const localeNames = Build.importDirectory('./translations/locales');

for (const localeName of localeNames) {
  const locale = JSON.parse(
    Build.importFile(`./translations/locales/${localeName}.json`)
  );

  Build.createBundle(`app.${localeName}.js`, () => {
    React.render(
      <TranslationContext.Provider value={locale}>
        <App />
      </TranslationContext.Provider>
    );
  });
}
```

Let’s say you have a directory `./translations/locales` with three files that
include translations for your app: `en-US.json`, `es-MX.json`, and `zh-CN.json`.

In this example, we declare that our app depends on all the files in our
translations directory using `Build.importDirectory()` and `Build.importFile()`.
A good buildtime framework can also then watch these JSON files and rebuild the
bundles when they change.

We then create a new bundle for every locale where we render a React app! Since
the arrow function captures the `locale` JSON data, that data will be included
in the final bundle. Along with any other constant data we capture.

If you have a page that doesn’t require any data from the user, you may also
compile it statically at buildtime. Like [Gatsby](https://www.gatsbyjs.org/)!

It‘s not just our top level application files that run at buildtime. _Every one
of our files would run at buildtime._

```jsx
export function TodoItem() {
  const data = useQuery(query);

  return <div className={styles.item}>{/* ... */}</div>;
}

const query = graphql`
  fragment todo on TodoItem {
    id
    name
    completed
    # ...
  }
`;

const styles = css`
  .item {
    border: solid 2px red;
  }
  /* ... */
`;
```

In this example, we have two variables in our module scope: `query` and
`styles`. Both of these variables would be computed at buildtime! We’d parse the
corresponding GraphQL and CSS, run any transformations, and output JSON objects
to the resulting bundle.

The only difference is we’d do it at buildtime instead of runtime.

To use a React component defined like this:

```jsx
import TodoItem from './TodoItem';

// Nope! We don’t render in the module scope.
//
// ❌ React.render(todos.map(todo => <TodoItem todo={todo} />));

// Instead we render in a bundle we create at buildtime.
Build.createBundle('app.js', () => {
  React.render(todos.map(todo => <TodoItem todo={todo} />));
});
```

## Interested?

Does this model of execution interest you?

There’s a lot to figure out to make this work in JavaScript. I imagine we could
create an AST transform that adds an environment record of the variables
captured a function. So the following code:

```js
const x = fibonacci(10);
const y = fibonacci(11);

Build.createBundle('my-bundle.js', () => {
  console.log(x + y);
});
```

Would be transformed by wrapping all functions in some `addCapturedVariables()`
function:

```js
const x = fibonacci(10);
const y = fibonacci(11);

Build.createBundle(
  'my-bundle.js',
  addCapturedVariables({x: x, y: y}, () => {
    console.log(x + y);
  })
);
```

That way buildtime code could serialize captured variables out to a runtime
bundle.

Making this process fast is another question entirely. There are likely ways to
intelligently determine if buildtime or runtime code was changed. If only
runtime code changed, then you don’t need to re-run your buildtime logic.

## Further Reading

- [Prepack](https://github.com/facebook/prepack) kinda does something like this.
  The big difference is that Prepack tries to optimize code you already have
  with a custom JavaScript engine. This proposal would reuse existing JavaScript
  engines and add functions for exploiting the power of buildtime evaluation
  like `Build.createBundle()`.
- The idea of compile-time function execution already exists in Lisp macros, in
  C++ as [`constexpr`](https://en.cppreference.com/w/cpp/language/constexpr),
  and in Rust as
  [`const fn`](https://doc.rust-lang.org/unstable-book/language-features/const-fn.html).
  These systems allow you to execute pure functions with static inputs, but
  nothing I’ve seen has the ability to customize your build like
  `Build.createBundle()` would.
- [AnyDSL](https://anydsl.github.io/) is a cool project that does deep partial
  evaluation like Prepack. It comes with a new programming language and an
  interesting graph-based CPS intermediate representation called
  [Thorin](https://anydsl.github.io/Thorin.html).
