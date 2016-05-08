# Lazybox

Dependency injection container based on Map()


## Usage

```js

var Lazybox = require('lazybox');

var c = new Lazybox();

// Set parameter
c.set('foo.bar', 'baz');

// Define a service
c.define('foo', () => {
	return new Service();
});

// Define a service with dependencies
c.define('answer', ['answer.value', (value) => {
	console.log('Lazily initialized');
	return {
		life: () => value,
		universe: () => value,
		everything: () => value
	};
}]);
c.set('answer.value', 42);

c.get('answer').life(); // Logs 'Lazily initialized'

// Define a generator service

c.define('nextid', function *nextId() {
	const id = 0;
	while (true) {
		yield id++;
	}
});
let id = c.get('nextid')
id(); // 0
id(); // 1
id(); // 2 ...


```

## Dependency Injection

## Providers

```js
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

```

## API

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
