---
date: 2015-06-10
title: "Javascript prototypes: Guys, I just got it"
category: Technobabble
subtitle: "The struggle to understand Javascript’s most challenging feature"
summary: "A true understanding of Javascript’s most powerful feature has thus far eluding me. Up until yesterday. Prototypes can be confusing to developers, so I break down the process it took me to deconstruct this feature while. At the same time I also show off a rather interesting Javascript pattern."
---

`__proto__`, my new best buddy. Although we do have a strict no touch policy. `__proto__` is a property on all Javascript objects in [most execution environments][1]. `__proto__` is a representation of what is, perhaps, Javascript’s most interesting feature. Prototypes.

There have been many people to try and explain the prototypal chain. Many [articles][2], [documentation][3], and [books][4]. Each trying to relate how inheritance in Javascript works, and not doing a stellar job. For all the diagrams and flow charts in the world, I still had only a barebones understanding of prototypes. Until yesterday.

## Laying out the Breadcrumbs
The implementation of the following odd pattern is what led me to understand the secrets of the universe. Um, secrets of the prototypes. I wanted to write some code that operated like this:

{% highlight javascript %}
var Thing = new OtherThing();
var something = new Thing();
{% endhighlight %}

Traditional object oriented developers will cry. Whether this is a good pattern is not the scope of this article to discuss. Implementing this pattern brings rise to many interesting prototype related problems. Thus using this pattern as an example gives us the platform to answer these questions.

Here is the secret ingredient which made the pattern possible:

{% highlight javascript %}
function OtherThing() {
  var self = function () {};
  return self;
}

(OtherThing())();         // works ✓
(new OtherThing())();     // also works ✓
new (new OtherThing())(); // while disgusting, also works ✓
{% endhighlight %}

That’s one Javascript feature you don’t see everyday. When using `new`, the function implicitly returns the `this` value. Yet, developers have the power to override `this`. Simply by explicitly returning a value, which is what I am doing here.

Here is where things start to get tricky:

{% highlight javascript %}
function NormalThing() {}

NormalThing.prototype.hello = function () {
  console.log('world');
};

(NormalThing()).hello;     // undefined, expected behavior ✓
(new NormalThing()).hello; // works ✓

function OtherThing() {
  var self = function () {};
  return self;
}

OtherThing.prototype.hello = function () {
  console.log('world');
};

(OtherThing()).hello;     // undefined ✗
(new OtherThing()).hello; // undefined ✗
{% endhighlight %}

When we explicitly define a return value, we lose the prototype methods.

If you have spent any time working with Javascript, you should know that objects inherit their constructing function's prototype. You should also know that these prototype functions have access to a `this` variable.

That is the easy part as it resembles classical inheritance. To be a good Javascript developer that base knowledge is all you need. But we do not want to be good Javascript developers, we want to be great ones. If we dive a bit deeper and understand the prototype chain we can apply it to other code problems.

When you use `new`, the functions taken from the prototype are not there when you log the object to a console. Yet when you reference them in your code, there they are. I call these the *invisible* properties.

## What are you Doing in my Swamp?
Your object is like an ogre, it has many layers. Layer one is normal properties, the ones that show up when you log that object to your console. Layer two are those *invisible* prototype properties&mdash;they do not show up when logging.

`__proto__` represents that layer of invisible properties. When you go and log  `object.__proto__`, you will see the properties.

Yet no good code is worth troubling over without inception&mdash;sorry recursion.

Every object can have a prototype, and `__proto__` is an object. Can you see where this goes? So that means this could be a thing: `object.__proto__.__proto__`. Or this: `object.__proto__.__proto__.__proto__.__proto__.__proto__.__proto__`. That would be the prototype chain, our onion.

## On the Code Again
So let’s get this working now:

{% highlight javascript %}
function OtherThing() {
  var self = function () {};

  self.__proto__ = OtherThing.prototype;  

  return self;
}

OtherThing.prototype.hello = function () {
  console.log('world');
};

(OtherThing()).hello;     // works ✓
(new OtherThing()).hello; // works ✓
{% endhighlight %}

See what we did there? We set the `__proto__` value by force instead of letting the *new* keyword assign at.

But there is one problem with this method:

{% highlight javascript %}
var Thing = new OtherThing();
Thing();     // works ✓
new Thing(); // works ✓

Thing.call(); // call is undefined ✗
{% endhighlight %}

Whoops. Normally, when you create a function, assigned to it is a prototype (`Function.prototype`). This allows one to use handy methods like `call`, `apply`, and `bind`. But we overrode that prototype when we used `self.__proto__ = OtherThing.prototype`.

The question then arises, well how does one get both prototypes? Prototypal inheritance.

## A Creation Story
{% highlight javascript %}
var thing1 = new Person();
var thing2 = Object.create(Person.prototype);

thing1.__proto__ === thing2.__proto__
{% endhighlight %}

`Object.create` allows us to create an object with an invisible layer.

Now consider the following interactions with prototypes:

{% highlight javascript %}
var layer1 = { a: 1 };

var layer2 = Object.create(layer1);
layer2.b = 2;

var layer3 = Object.create(layer2);
layer3.c = 3;

console.log(layer1.a); // # => 1
console.log(layer1.b); // # => undefined
console.log(layer1.c); // # => undefined

console.log(layer2.a); // # => 1
console.log(layer2.b); // # => 2
console.log(layer2.c); // # => undefined

console.log(layer3.a); // # => 1
console.log(layer3.b); // # => 2
console.log(layer3.c); // # => 3

layer3.__proto__ === layer2
layer2.__proto__ === layer1
layer3.__proto__.__proto__ === layer1
layer3.__proto__.__proto__ === layer2.__proto__

console.log(layer1); // # => { a: 1 }
console.log(layer2); // # => { b: 2, __proto__: layer1 }
console.log(layer3); // # => { c: 3, __proto__: layer2 }
{% endhighlight %}

Yesterday, I **would not have understood** the above code. It was the piece of the puzzle I was missing.

## The Final Implementation
{% highlight javascript %}
function OtherThing() {
  var self = function () {};

  self.__proto__ = OtherThing.prototype;

  return self;
}

OtherThing.prototype = Object.create(Function.prototype);

OtherThing.prototype.hello = function () {
  console.log('world');
};

var Thing = new OtherThing();
Thing.call();                // works ✓

var something = new Thing(); // works ✓
something.hello();           // # => world (works ✓)

OtherThing.prototype.__proto__ === Function.prototype
Thing.__proto__ === OtherThing.prototype
Thing.__proto__.__proto__ === Function.prototype
{% endhighlight %}

## No Touch Policy
While using `__proto__` can be useful (as in this scenario), `__proto__` itself is not a standard. That means it is *never* guaranteed to work. Yet `__proto__` is still excellent for visualizing the prototype chain. And it is definitely fun to play around with.

But do not fear, you can still alter prototypes in production. Javascript gives us properties to alter the prototypes so in the end we don’t even need `__proto__`. `Object.getPrototypeOf` and `Object.setPrototypeOf` specifically.

To have our code be standards compliant we should make the following change:

{% highlight javascript %}
self.__proto__ = OtherThing.prototype;
// to...
Object.setPrototypeOf(self, OtherThing.prototype);
{% endhighlight %}

And that's my interpretation of prototypes. I leave you with one last thought. We should rename `Object` to `Onion`¡

## More Cool Javascript Stuff
A couple of things on my radar I’m experimenting with to push Javascript to the limit.

- [Object.freeze][5]
- [Object.defineProperty][6]
- [Object.watch][7]
- And of course, all the [ES6][8] stuff

[1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/proto "MDN __proto__"
[2]: http://davidwalsh.name/javascript-objects "Kyle Simpson on Javascript Inheritance"
[3]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain "MDN Prototype Chain"
[4]: http://www.amazon.com/JavaScript-Patterns-Stoyan-Stefanov/dp/0596806752 "Javascript Patterns by Stoyan Stefanov on Amazon"
[5]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze "MDN Object.freeze"
[6]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty "MDN Object.defineProperty"
[7]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/watch "MDN Object.watch"
[8]: https://babeljs.io/docs/learn-es2015/ "BabelJS learn ES6"
