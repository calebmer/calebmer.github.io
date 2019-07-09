---
layout: post
title: 'My Adventures Writing a Cross-Platform Virtualized List'
date: 2019-07-09 11:00:00 -0800
redirect_from: /drafts/my-adventures-writing-a-virtualized-list
---

I wrote a virtualized list! It was quite the adventure.

I was working on a cross-platform React Native app that also rus on the web with
[React Native Web](https://github.com/necolas/react-native-web). None of the
existing virtualized lists were suitable for the product I wanted to build. Not
[`FlatList`](http://facebook.github.io/react-native/docs/0.59/flatlist), not
[`react-window`](https://react-window.now.sh).

So, as one does, I wrote my own virtualized list. Forking React Native in the
process. You can see the final code in a
[public gist](https://gist.github.com/calebmer/2a3bf40baa929115e7f985f876effb6f).

I’m going to describe my entire adventure in this post. Through my experience I
hope to inspire you to take control of your code. If writing a virtualized list,
or anything else, would make your user’s life better, you should do it! You need
not be bound to existing libraries. You have the power to fork and modify
dependencies as you see fit. Fear not the unfamiliar, if someone out there wrote
a virtualized list then there’s no reason you can’t!

<img class="img-center" src="https://media.giphy.com/media/12vJgj7zMN3jPy/giphy.gif" alt="You can do it GIF">

This is a story divided into four parts.

- [Part 1: The Product](#part-1-the-product)
- [Part 2: When I realized existing virtualized lists wouldn’t work…](#part-2-when-i-realized-existing-virtualized-lists-wouldnt-work)
- [Part 3: How it works](#part-3-how-it-works)
- [Part 4: Forking React Native](#part-4-forking-react-native)

## Part 1: The Product

I was building a React Native Web/iOS/Android app which was, basically, a forum.
A forum has posts and then people could leave comments on that post.

If you were reading the post for the first time, you’d want to read the first
comments and scroll _down_. If you were catching up on the discussion after
replying, you’d want to read the latest comments and scroll _up_.

So I needed a virtualized list that would support scrolling from either
direction. I came up with, what I believe, is a new UI pattern: the Skim List! A
sister of the Infinite List.

In a Skim List we pre-allocate space for all the items in the list. When the
user scrolls to a position in the list, we load the items at that position. So
if I scroll 50% through the list, I’ll load items halfway through the list. If I
scroll to the end of the list, I’ll load items at the end of the list.

Here’s the Skim List in action on web. It works the same way on mobile.

These GIFs are slowed down and I added network throttling when recording so you
can really see the progressive loading behavior. It’s really fast and slick when
you get your hands on it.

**Scrolling from the top to the bottom**

<img class="img-center-shrink" src="/assets/images/my-adventures-writing-a-virtualized-list/scroll-down.gif" alt="The Skim List scrolling from the top to the bottom">

**Scrolling from the bottom to the top**

<img class="img-center-shrink" src="/assets/images/my-adventures-writing-a-virtualized-list/scroll-up.gif" alt="The Skim List scrolling from the bottom to the top">

As you might be able to imagine, this list also lets you scroll to a random
place in the list and move around.

## Part 2: When I realized existing virtualized lists wouldn’t work…

I first tried using React Native’s
[`FlatList`](http://facebook.github.io/react-native/docs/0.59/flatlist).

That was working fine, I was able to implement a list where you were able to
scroll down and the comments below you loaded. That’s what `FlatList` is
optimized for. However, I also needed the ability to jump to the end and load
comments while scrolling _up_! `FlatList` just wasn’t built for this.

Next I explored [`react-window`](http://react-window.now.sh). At first glance,
the library obviously wouldn’t work. You need to know the heights of all your
items ahead of time for `react-window`. Since I was working with comments on a
post, I had know way of knowing the item heights!

There’s a PR open to
[add a dynamically sized virtualized list for `react-window`](https://github.com/bvaughn/react-window/issues/6),
but it hadn’t been merged yet. Even if that PR were merged into `react-window` I
_still_ wouldn’t have been able to use it.

1. I needed to incrementally load items in the list when they scrolled into
   view. While the items were loading I needed shimmer placeholders.
2. I needed a solution that would also work on React Native iOS and Android.
   `react-window` is web only.

Well, that meant I needed to write my own virtualized list.

## Part 3: How it works

The way my virtualized list works is it takes the total number of items (in this
case comments) on a post and it takes an array of all the comments. I represent
the array as a _sparse array_. That means any positions in the array without a
loaded comment will be `undefined`.

```ts
type Props = {
  commentCount: number;
  comments: ReadonlyArray<CommentID | undefined>;
};
```

For all the comments which are not loaded I render a placeholder component
called `<CommentShimmer>`. A comment shimmer renders grey boxes which are meant
to look like a conversation. Different comment shimmers have different heights.
I measure the total height of the scroll view with code that roughly looks like
`commentShimmerHeight * commentCount`.

I use a pretty standard virtualized list technique. The same one `react-window`
uses: absolute positioning. I add a
[scroll event listener](https://gist.github.com/calebmer/2a3bf40baa929115e7f985f876effb6f#file-postvirtualizedcomments-tsx-L239)
which calculates the onscreen comments. Then I use
[absolute positioning](https://gist.github.com/calebmer/2a3bf40baa929115e7f985f876effb6f#file-postvirtualizedcomments-tsx-L772-L773)
to make sure the comments are rendered at the right position in the virtualized
list.

So whenever a user scrolls I:

- Figure out which comments to render.
- Render _only_ those comments, unmounting any offscreen comments.
- Position the rendered comments in the list with absolute positioning.

This only works if I know the size of all comments in the list. I know the
height of unloaded comments since they are just `<CommentShimmer>`s. However,
when a comment loads it might have a completely different height!

When a comment loads I need to measure it. Since I’m using React Native, I must
measure asynchronously. So when the comment is loaded but not measured I render
the `<CommentShimmer>` and the `<Comment>` next to each other. Hiding the
`<Comment>` with `opacity: 0`. Once we’ve measured the `<Comment>` we can get
rid of the `<CommentShimmer>` and update the height of the list.

So there are three states any comment could be in:

```tsx
// State 1: Unloaded Comment
<>
  <CommentShimmer />
  {null}
</>

// State 2: Loaded but Unmeasured Comment
<>
  <CommentShimmer />
  <View style={styles.hidden} onLayout={handleCommentLayout}>
    <Comment />
  </View>
</>

// State 3: Loaded and Measured Comment
<>
  {null}
  <View style={null}>
    <Comment />
  </View>
</>
```

You can see this
[in the `renderItem()` function](https://gist.github.com/calebmer/2a3bf40baa929115e7f985f876effb6f#file-postvirtualizedcomments-tsx-L767-L800).

## Part 4: Forking React Native

Ok, at this point the list was working and it was working pretty well. However,
there were a couple bugs I just couldn’t fix. I didn’t just want a _good_
experience, I wanted a _flawless_ experience. This led me to fork React Native
so I could add a feature to `<ScrollView>`.

First, let me describe the bug.

When the content of a scroll view resizes, the platform (Web or iOS in this
case) needs to determine where the new scroll position should be. Usually, the
scroll position is measured as the number of pixels that have been scrolled from
the top of the scroll view. So when content resizes, that number is usually kept
constant. See the below image for an example.

![Behavior of a resized scroll view when we pin the scrolled window to top](/assets/images/my-adventures-writing-a-virtualized-list/pin-window-to-top.png)

We change the size of the scroll content, but the scroll window (the red box)
stays the same distance from the top of the scroll view.

This works well in most cases, but it doesn’t work well when the user is
scrolling from bottom to top. That’s because when we load a chunk of comments,
the virtualized list size changes. We add content “above” what the user was
reading which either pushes or pulls the content the user was reading out of the
viewport.

Instead what we want is to pin the scroll window to the _bottom_ of the scroll
view. So when we add new content the distance of the scroll window to the bottom
of the scroll view stays constant. See the below image for an illustration of
the difference.

![Behavior of a resized scroll view when we pin the scrolled window to bottom](/assets/images/my-adventures-writing-a-virtualized-list/pin-window-to-bottom.png)

So I forked React Native and added the `pinWindowTo` prop. When set to
`pinWindowTo="top"` we use the default behavior. When set to
`pinWindowTo="bottom"` it uses the behavior depicted in the previous image.

This is the important part
[of the commit](https://github.com/calebmer/react-native/commit/8874509405acda979d61504c53cfad4545cae458)
in the Objective-C code for the `ScrollView` component on iOS.

````diff
       // offset falls outside of bounds, scroll back to end of list
       newOffset.y = MAX(0, newContentSize.height - viewportSize.height);
     }
   }

+  if (![self.pinWindowTo isEqualToString:@"bottom"]) {
+    CGFloat oldOffsetBottom = oldContentSize.height - (oldOffset.y + viewportSize.height);
+    newOffset.y = newContentSize.height - viewportSize.height - oldOffsetBottom;
+  }

   BOOL fitsinViewportX = oldContentSize.width <= viewportSize.width && newContentSize.width <= viewportSize.width;
   if (newContentSize.width < oldContentSize.width && !fitsinViewportX) {
     CGFloat offsetHeight = oldOffset.x + viewportSize.width;```
````

I don’t currently have an Android implementation which is why I haven’t
contributed this back to React Native. In the meantime, this works great for me!

I also implemented this feature on my
[React Native Web fork](https://github.com/calebmer/react-native-web/commits/master).

```js
_pinWindowToBottom() {
  const element = this.getScrollableNode();

  const lastScrollTop = this._lastScrollTop;

  const lastScrollHeight = this._lastScrollHeight;
  this._lastScrollHeight = element.scrollHeight;

  const lastClientHeight = this._lastClientHeight;
  this._lastClientHeight = element.clientHeight;

  const lastScrollBottom = lastScrollHeight - (lastScrollTop + lastClientHeight);
  const nextScrollTop = element.scrollHeight - element.clientHeight - lastScrollBottom;

  element.scrollTop = nextScrollTop;
  this._lastScrollTop = nextScrollTop;
}
```

Other changes I’ve made in my
[React Native fork](https://github.com/calebmer/react-native/commits/0.59-stable):

- Fixed [React bug](https://github.com/facebook/react/issues/15732) until React
  and React Native publish a new version.
- Send
  [iOS `adjustedContentInset`](https://developer.apple.com/documentation/uikit/uiscrollview/2902259-adjustedcontentinset?language=objc)
  in scroll events since it’s important for accurate measurements involving
  “unsafe areas” on iPhone X.

Other changes I‘ve made in my
[React Native Web](https://github.com/calebmer/react-native-web/commits/master)
fork:

- Fire `onLayout` in a microtask instead of `setTimeout()` so it fires before
  the next browser paint. This is very important for my virtualized list double
  rendering strategy!
- Remove unsafe life-cycle methods like `componentWillReceiveProps` so that I
  can enable React Concurrent mode in my app.

### In defense of forking

Forking your dependencies is frequently maligned, and for good reason. Without
adequate upkeep your forks will fall behind the latest version of your
dependencies. You’ll miss out on critical bug fixes and security patches!

When I fork I’m very careful to make sure there’s a clear upgrade path in the
future.

- I only make small changes. The change should only touch a few files and should
  be very well documented.
- I only make changes which I’d reasonably expect to get merged upstream some
  day. That way there’s a path to getting off the fork.
- I’ll only make changes I wouldn’t expect to get merged on projects that aren’t
  actively maintained.

Once I’m comfortable that the change won’t make upgrading too hard in the
future, I fork. Then I have criteria for proposing my forked changes upstream.

- Is the change tested?
- Is the change documented?
- Can I show the change working in a production app?
- Can I justify the change to contributors?

This is a lot of work and slows down shipping. To me, it‘s more valuable to live
on a fork for a few months and fix bugs for users _immediately_ than to make
users wait a few months for a proper open source release with the change.

The best part of open source is that it’s, well, open. You have the power to
modify your dependencies. It’s a dangerous power, but if you use it wisely you
can ship brilliant user experiences no one else is capable of.

## Conclusion

As developers, we have so many tools to ship brilliant user experiences. Don’t
be afraid to think out of the box when you encounter a particularly sticky
problem. For me, writing my own virtualized list was the best way to build the
experience I wanted.

Also don’t be afraid of forking your dependencies. Yes it’s dangerous, yes it
will make your life harder if you’re not careful, but it’s also an incredibly
powerful tool. Recognize the risks and use it where appropriate.

I put the code for my
[virtualized list in a gist](https://gist.github.com/calebmer/2a3bf40baa929115e7f985f876effb6f).
I don’t currently plan to turn it into a reusable open source component. That
wasn’t my goal. Shipping a unique experience for my users was my goal.
