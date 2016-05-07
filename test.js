'use strict';

const assert = require('assert');
const Container = require('.');

let cnt = new Container();

// Simple get/set
cnt.set('foo', 'bar');
assert.equal(cnt.get('foo'), 'bar');

// Container#setdefault()
assert.equal(cnt.setdefault('foo', 'baz'), 'bar');
assert.equal(cnt.setdefault('foo.bar', 'baz'), 'baz');
assert.equal(cnt.get('foo.bar'), 'baz');

// Container#match()

cnt = new Container();
cnt.set('foo.bar.baz', 'foo');
cnt.set('foo.bar', 'bar');
cnt.set('baz.bar', 'foo');

const actual = [];
cnt.match('foo.:bar.:baz?', (key, params) => actual.push({key, params}) );
assert.deepEqual(actual, [
	{
		key: 'foo.bar.baz',
		params: {
			bar: 'bar',
			baz: 'baz'
		}
	},
	{
		key: 'foo.bar',
		params: {
			bar: 'bar',
			baz: undefined
		}
	}
	
]);

// Cokoa#register()

assert.doesNotThrow(() => {
	cnt.register(function (c) {});
});

cnt.register(function (c) {
	c.set('bar', 'baz');
});

assert.equal(cnt.get('bar'), 'baz');

cnt.register(function (c) {
	c.set('baz', 'bar');
}, { baz: 'foo' });

assert.equal(cnt.get('baz'), 'foo');
