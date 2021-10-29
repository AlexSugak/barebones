# What
The bare bones react app that does not use: webpack, babel, dev servers, 3rd party state management libs etc.

# Why
One of the initial selling points of React was that `you can build your app the way you want it, with React only providing the View part of it`.

Today though, we have `create-react-app` and other templates that throw tons of bloat on you and have all the "batteries included", making it de-facto a framework, similar to the likes of Angular. With all the "benefits" of todays npm ecosystem.

I wanted to throw this all away and see how far I can go with the bare minimum of tools and libraries, so that I could control every aspect of the developer experience.

# How
The constraints for this repo are:
- no webpack
- no babel
- use Makefile and hand-written scripts to automate things
- no npm/yarn for dependencies (at least for now, let's see how far I can go without it)
- use static local/CDN scripts
- use TS for type-safety
- use React for rendering the View of the app
- no redux/mobx/etc.
- implement my own state management using Rx.js for async stuff
- for cross-cutting concerns like routing, logging, testing etc. try and see how far I can go with doing my own implementation from scratch. Only bring in 3rd party dependency if doing my own thing has proven to be too big of an effort. 

## Getting started

Clone the repo and run `make help` from its root, it should list the commands for automating build and other tasks. Try running `make all`.

### Limitations
This repo is only tested and works on mac.
