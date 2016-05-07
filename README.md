# cokoa-container

Service container based on Map()


## Usage

```js

var Container = require('koa-container');

var c = new Container();

// Set parameter
c.set('foo.bar', 'baz');

// Set shared service
c.set('foo', c => {
	return new Service();
});

// Set callable parameter
c.set('foo', c.protect(foo => `Hello ${foo}`));

// Register a provider function
c.register((c) => {
	c.set('foo', 'bar');
});

// Register a provider object
c.register({
	register: (c) => {
		c.set('foo', 'bar');
	}
});

// Find keys matching pattern
c.match('foo.:name')


```

### container.match(pattern, callback)

Use [path-to-regexp](https://www.npmjs.com/package/path-to-regexp) to match keys.

This does *not* initialize any service by calling `get()`

Arguments

  - _pattern_: A key pattern
  - _callback_: A function `(key, params, container)` to call for each result.

```js
cnt.matchKeys('foo.:bar.:baz?', (key, params, container) => { ... });
```

### container.setdefault(key, value)

Similar to Python's `dict.setdefault(key, value)` method.
It gets the value of a key or sets it to value if not defined.
