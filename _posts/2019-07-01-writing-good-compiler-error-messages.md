---
layout: post
title: 'Writing Good Compiler Error Messages'
date: 2019-07-01 11:00:00 -0800
---

It’s never fun when you see an error message while trying to ship some code. It
means you’re one step further from working software! It doesn’t help that a lot
of error messages are completely inscrutable.

![A scary TypeScript error](/assets/images/writing-good-compiler-error-messages/typescript-error.png)

After spending a lot of time
[redesigning Flow’s error messages](https://medium.com/flow-type/better-flow-error-messages-for-the-javascript-ecosystem-73b6da948ae2)
I’ve developed a personal style guide for writing helpful compiler error
messages. Before jumping into the style guide, I’ll share my philosophy around
error messages.

## Philosophy

Roughly, you can sort a developer’s reaction to an error message into two
categories:

- **80%** of the time, the developer will immediately know what the fix is. The
  error will be related to code they’re actively working on. The developer may
  even know how to fix it _just_ by seeing where the red squiggly in their IDE
  is. No need to read the error message.
- **20%** of the time, the developer won’t immediately know why the compiler
  says their code is incorrect. The compiler might have a complex rule that’s
  non-intuitive but important to the safety of the program. In this case, an
  error message should provide enough information to enable the developer to
  take a deep dive into their program.

In the **80%** case a developer is either quickly iterating through their code
and a long error message would be a _disservice_ to their productivity. They
only need a glance at the message to know what to fix.

In the **20%** case it will be really difficult to pack enough context into a
single error message to explain the problem. The error message’s fix might be
somewhere far away from the reported location since the compiler can’t determine
a human’s intent. The error might be caused by a really nuanced rule that can’t
easily be explained in an error message format.

A great example of a rough error messages in the 20% case is anything reported
by the Rust borrow checker or the Elm infinite type error message:

```
I am inferring a weird self-referential type for x:

11| f x = x x
      ^
Here is my best effort at writing down the type. You will see ∞ for parts of
the type that repeat something already printed out infinitely.

    ∞ -> a

Staring at this type is usually not so helpful, so I recommend reading the
hints at <https://elm-lang.org/0.19.0/infinite-type> to get unstuck!
```

Elm even acknowledges that “staring at this…is usually not helpful”.

## Context

It’s also important to understand the context of _where_ the developer will see
an error message. For a programming language, ideally you have good editor
integration so the user is going to see your error message in an editor like
VSCode.

The IDE context favors short error messages that are one to two sentences long.
When you hover over an error the popup doesn’t give you much space!

![VSCode Error Popup](/assets/images/writing-good-compiler-error-messages/error-popup.png)

Many IDEs, like VSCode, also have some kind of panel where they show you all the
error messages at once. The design of this space is also best suited to short
one to two sentence long error messages.

![VSCode Problems Pane](/assets/images/writing-good-compiler-error-messages/problems-pane.png)

Thinking about the context where an error message is displayed influences my
style guide _a lot_. Usually, most compiler developers are designing their error
messages in the command line (CLI). Which is why you get colored multiline
messages that print out code.

I design error messages _IDE first_, not _CLI first_. Like the way you’d design
a website to be mobile first. The IDE is much more constrained than the CLI. If
you design a good IDE message you can easily adapt it to the CLI. It’s much
harder to adapt a message designed for the CLI to an IDE since you didn’t think
of an IDE’s constraints when designing your message.

## Style Guide

Now that you know my philosophy and the context I design for, let’s get into my
error message style guide!

- Keep error messages short. Preferably a single, clear, sentence. This format
  works best in an IDE context.

- The error location is so important since that’s where the red squiggly goes in
  an IDE. Pick the smallest possible location at the operation which triggered
  the error. If the user is writing a new operation the error will point to
  where they are working. If the user is refactoring the error will point to all
  the operations which need to change.

- Don’t print out information a developer could easily find in their code.
  Instead print a reference to that information which is linked in an IDE.
  TypeScript likes to print out huge types in error messages, this makes it hard
  to read the message.

- Use correct English grammar. This is probably obvious, but it can be hard to
  make a program which produces correct English grammar. It’s easy to stitch
  together arbitrary sentence fragments. Put some rules on the grammatical
  structure of your sentence fragments. It’s also worth going the extra mile to
  add grammatical decoration like articles: “a `String` is not an `Int`” vs
  “`String` is not `Int`”. Just be careful when using developer-defined names.

- Write messages in first person plural. That is, use “we”. For example “we see
  an error”. This personifies the compiler as a _team_ of people looking for
  bugs in the developer’s code. By personifying our type checker error messages
  feel like a dialogue. Elm’s error messages are famous for using first person:
  “I see an error”. First person feels a bit uncomfortable to me. A compiler is
  certainly not a single person, nor is it built by a single person. I prefer
  “we” as a compromise.

- Use present tense instead of past tense. Instead of “we found” say “we see”.
  When an error is displayed to a user, the code is currently in a bad state.
  From the compiler author’s perspective, the compiler runs at discrete points
  in time and “finds” errors at those points. From the developer’s perspective
  an error in their IDE reflects the current state of the program, not a
  discrete compiler run. Prefer the developer’s IDE context, use present tense.

- Reduce the grade reading level as much as possible. I use the
  [Hemingway Editor](http://www.hemingwayapp.com/) for this. I’ll paste in an
  error message and the editor tells me the grade reading level (for example,
  6th grade). I then try to reduce the grade level as much as possible without
  sacrificing clarity.

- Use language the developer will understand, not compiler-speak. Words like
  “identifier”, “token”, and “expression” are compiler-speak. Prefer the names a
  developer would use in conversation with their peers. Also consider the
  context of your error message. If you expect a variable name, say that instead
  of saying “expected identifier”.

- Use Markdown for formatting error messages. If you want to include a code
  snippet put it between backticks (\`) which are used in Markdown to indicate
  inline code. The code editor should format your message appropriately.

- If you use quotes, make sure they are the proper curly quote characters. For
  example: “phrase” instead of \"phrase\". See the difference? It’s subtle. I’ve
  gotten into the habit of typing these characters after taking a typography
  course. [U+201C (“)](https://graphemica.com/%E2%80%9C),
  [U+201D (”)](https://graphemica.com/%E2%80%9D),
  [U+2018 (‘)](https://graphemica.com/%E2%80%98), and
  [U+2019 (’)](https://graphemica.com/%E2%80%99).

Following this guide will produce error messages with a consistent tone, voice,
and style.

## Conclusion

Short, simple, and clear error messages are _much_ better than long and detailed
error messages. They fit the developer’s IDE context better and they don’t
distract the developer when they are trying to debug a particularly unintuitive
error.

Good error messages will make developers more efficient. They’ll spend less time
staring at error message text and more time building products their users will
love.

## IDE Wishlist

There are two features I want from the IDEs rendering my error messages written
with my style guide. Specifically, I want these features in the
[Language Server Protocol (LSP) Specification](https://microsoft.github.io/language-server-protocol/specification)
which is supported by VSCode, Atom, and other code editors.

1. I want my error messages to be rendered with markdown. Currently, at least in
   VSCode, error messages are rendered with a monospace font. My messages are
   designed to be proper English sentences with inline code snippets, not code.
2. I want to link to code in error messages. Often, I’ll have an error that
   reads “`Foo` is not `Bar`”. I want “`Foo`” to be a hyperlink to where the
   compiler found the `Foo` type! Same for `Bar`. I can hack around this with
   the
   [LSP’s `relatedInformation` field](https://microsoft.github.io/language-server-protocol/specification#diagnostic)
   but it’s not the same as being able to write a hyperlink inline.

## Further Reading

- My announcement for
  [Flow’s error message redesign](https://medium.com/flow-type/better-flow-error-messages-for-the-javascript-ecosystem-73b6da948ae2).
- Elm’s
  [compiler errors for humans](https://elm-lang.org/blog/compiler-errors-for-humans)
  post.
- Reason has also given a
  [lot of thought](https://reasonml.github.io/blog/2017/08/25/way-nicer-error-messages.html)
  towards their error messages.
