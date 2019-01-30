---
layout: page
title: 'Opaque Types in TypeScript'
---

My favorite feature in Flow is the [“opaque type”][flow-opaque-types]. Opaque
types may only be _created_ in the file where the opaque type was defined. Which
means you can export one function, `createUserName()`, that makes sure your user
name is in the correct format and returns an opaque `UserName` type.

[flow-opaque-types]: https://flow.org/en/docs/types/opaque-types

TypeScript doesn’t have opaque types, so I simulate them with unique symbols.

```ts
type UserName = string & typeof opaqueUserName;

let opaqueUserName = Symbol();

// Error! `string` is not assignable to `UserName`.
let notUserName: UserName = 'Hello, world!';

// OK
let userName: UserName = createUserName('calebmer');

function createUserName(name: string): UserName {
  if (/^[a-zA-Z0-9_-]+$/.test(name)) {
    return name as UserName;
  } else {
    throw new Error('Not a user name!');
  }
}
```

[(TypeScript Playground)](<http://www.typescriptlang.org/play/index.html#src=type%20UserName%20%3D%20string%20%26%20typeof%20opaqueUserName%3B%0D%0A%0D%0Alet%20opaqueUserName%20%3D%20Symbol()%3B%0D%0A%0D%0A%2F%2F%20Error!%20%60string%60%20is%20not%20assignable%20to%20%60UserName%60.%0D%0Alet%20notUserName%3A%20UserName%20%3D%20'Hello%2C%20world!'%3B%0D%0A%0D%0A%2F%2F%20OK%0D%0Alet%20userName%3A%20UserName%20%3D%20createUserName('calebmer')%3B%0D%0A%0D%0Afunction%20createUserName(name%3A%20string)%3A%20UserName%20%7B%0D%0A%20%20if%20(%2F%5E%5Ba-zA-Z0-9_-%5D%2B%24%2F.test(name))%20%7B%0D%0A%20%20%20%20return%20name%20as%20UserName%3B%0D%0A%20%20%7D%20else%20%7B%0D%0A%20%20%20%20throw%20new%20Error('Not%20a%20user%20name!')%3B%0D%0A%20%20%7D%0D%0A%7D%0D%0A>)
