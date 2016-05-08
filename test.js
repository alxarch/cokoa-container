'use strict';
const Container = require('.');
const assert = require('assert');
function noop () {};

describe('Cokoa Container', () => {
	describe('Container.parseService()', () => {
		it ('Should parse single function', () => {
			let fn = function () {};
			assert.deepEqual(Container.parseService(fn), [fn, []]);
		});
		it ('Should parse an array function definition without deps', () => {
			let fn = function () {};
			assert.deepEqual(Container.parseService([fn]), [fn, []]);
		});
		it ('Should parse an array function definition with deps', () => {
			let fn = function () {};
			assert.deepEqual(Container.parseService(['foo', fn]), [fn, ['foo']]);
		});
	});

	describe('Container#define(key, value)', () => {

		it('Should define a service without dependencies', () => {
			let c = new Container();
			function getAnswer () {
				return 42;
			}
			c.define('answer', getAnswer);
			// Sets an uninitialized service for the key
			assert.strictEqual(c.raw('answer'), Container.NOT_INITIALIZED);
			assert.deepEqual(c.dependencies.get(getAnswer), []);
			assert.strictEqual(c.services.get('answer'), getAnswer);
		});
		it('Should define a service with dependencies', () => {
			let c = new Container();
			function getAnswer (value) {
				return value;
			}
			c.define('answer', ['answer.value', getAnswer]);
			assert.strictEqual(c.raw('answer'), Container.NOT_INITIALIZED);
			assert.deepEqual(c.dependencies.get(getAnswer), ['answer.value']);
			assert.strictEqual(c.services.get('answer'), getAnswer);
		});
	});
	describe('Container#get(key)', () => {
		it('Should return undefined for undefined keys', () => {
			let c = new Container();
			assert.strictEqual(c.get('foo'), undefined);
		});
		it('Should return a value for parameters', () => {
			let c = new Container();
			let obj = {};
			c.set('foo', obj);
			assert.strictEqual(c.get('foo'), obj);
		});
		it('Should initialize a defined service (no deps)', () => {
			let c = new Container();
			const obj = {};
			function getAnswer () {
				return obj;
			}
			c.define('answer', getAnswer);
			assert.strictEqual(c.get('answer'), obj);
		});
		it('Should initialize a defined service', () => {
			let c = new Container();
			const obj = Symbol('42');
			function getAnswer (value) {
				return value;
			}
			c.define('answer', ['answer.value', getAnswer]);
			c.set('answer.value', obj);
			assert.strictEqual(c.get('answer'), obj);
		});
		it('Should fail to initialize defined service missing deps', () => {
			let c = new Container();
			function getAnswer (value) {
				return value;
			}
			c.define('answer', ['answer.value', getAnswer]);
			assert.throws(() => {
				c.get('answer');
			}, /'answer\.value'/);
		});
		it('Should clean up after initializing a service', () => {
			let c = new Container();
			const obj = Symbol('42');
			function getAnswer (value) {
				return value;
			}
			c.define('answer', ['answer.value', getAnswer]);
			c.set('answer.value', obj);
			assert.strictEqual(c.get('answer'), obj);
			assert.strictEqual(c.dependencies.get(getAnswer), undefined);
			assert.strictEqual(c.services.get('answer'), undefined);
		});
	});
	describe('Container#extend(key)', () => {
		it('Should fail for missing key', () => {
			let c = new Container();
			assert.throws(() => {
				c.extend('foo', noop);
			});
		});
		it('Should fail for non service key', () => {
			let c = new Container();
			c.set('foo', 'bar');
			assert.throws(() => {
				c.extend('foo', noop);
			});
		});
		it('Should extend a service', () => {
			let c = new Container();
			function getAnswer (value) {
				return value;
			}
			c.define('answer', ['answer.value', getAnswer]);
			c.extend('answer', function (value) {
				assert.strictEqual(value, Symbol.for('42'), 'Passes last service result as last dep');
				return Symbol.for('44');
			});
			c.set('answer.value', Symbol.for('42'));
			assert.strictEqual(c.get('answer'), Symbol.for('44'), 'Returns extended result');
		});
		it('Should fail for initialized service', () => {
			let c = new Container();
			c.define('foo', function () {
				return 'bar';
			});
			let foo = c.get('foo');
			assert.throws(() => {
				c.extend('foo', noop);
			});
		});
	});
});

// const Container = require('.');
// 
// let cnt = new Container();
// 
// // Simple get/set/delete
// cnt.set('foo', 'bar');
// assert.equal(cnt.get('foo'), 'bar');
// cnt.delete('foo');
// assert.strictEqual(cnt.get('foo'), undefined);
// 
// // Service get/set
// cnt.set('foo', 'bar');
// cnt.set('baz', ['foo', (bar => bar)]);
// assert.equal(cnt.get('baz'), 'bar');
// // Service get/set/delete
// cnt.set('foo', 'bar');
// cnt.set('baz', ['foo', (bar => bar)]);
// assert.equal(cnt.get('baz'), 'bar');
// 
// // Dependency resolve throws
// cnt.set('bar', ['baz', 'foo', 'bing', (bar => bar)]);
// assert.throws(() => cnt.get('bar'), /'bing'/);
// 
// // Container#setdefault()
// assert.equal(cnt.setdefault('foo', 'baz'), 'bar');
// assert.equal(cnt.setdefault('foo.bar', 'baz'), 'baz');
// assert.equal(cnt.get('foo.bar'), 'baz');
// 
// // Container#match()
// 
// cnt = new Container();
// cnt.set('foo.bar.baz', 'foo');
// cnt.set('foo.bar', 'bar');
// cnt.set('baz.bar', 'foo');
// 
// const actual = [];
// cnt.match('foo.:bar.:baz?', (key, params) => actual.push({key, params}) );
// assert.deepEqual(actual, [
// 	{
// 		key: 'foo.bar.baz',
// 		params: {
// 			bar: 'bar',
// 			baz: 'baz'
// 		}
// 	},
// 	{
// 		key: 'foo.bar',
// 		params: {
// 			bar: 'bar',
// 			baz: undefined
// 		}
// 	}
// 	
// ]);
// 
// // Cokoa#register()
// 
// assert.doesNotThrow(() => {
// 	cnt.register(function (c) {});
// });
// 
// cnt.register(function (c) {
// 	c.set('bar', 'baz');
// });
// 
// assert.equal(cnt.get('bar'), 'baz');
// 
// cnt.register(function (c) {
// 	c.set('baz', 'bar');
// }, { baz: 'foo' });
// 
// assert.equal(cnt.get('baz'), 'foo');
