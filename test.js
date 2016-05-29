'use strict';
const Lazybox = require('.');
const ServiceDefinition = Lazybox.ServiceDefinition;
const assert = require('assert');
const mapget = Map.prototype.get;
function noop () {};

describe('ServiceDefinition', () => {
	describe('ServiceDefinition.parse()', () => {
		it ('Should parse single function', () => {
			let fn = function () {};
			let s = ServiceDefinition.parse(fn);
			assert.strictEqual(fn, s.callback);
			assert.strictEqual(undefined, s.dependencies);
			assert.strictEqual(undefined, s.ancestor);
		});
		it ('Should parse an array function definition without deps', () => {
			let fn = function () {};
			let s = ServiceDefinition.parse([fn]);
			assert.strictEqual(fn, s.callback);
			assert.deepEqual([], s.dependencies);
			assert.strictEqual(undefined, s.ancestor);
		});
		it ('Should parse an array function definition with deps', () => {
			let fn = function () {};
			let s = ServiceDefinition.parse(['foo', fn]);
			assert.strictEqual(fn, s.callback);
			assert.deepEqual(['foo'], s.dependencies);
			assert.strictEqual(undefined, s.ancestor);
		});
		it ('Should pass through services', () => {
			let s = new ServiceDefinition(noop);
			let ss = ServiceDefinition.parse(s);
			assert.strictEqual(ss, s);
		});
	});
	describe('ServiceDefinition#root()', () => {
		it ('returns the key itself for non existing service', () => {
			let s = new ServiceDefinition(noop);
			assert.strictEqual(s.root, s);
		});
		it ('returns the key itself for non extended service', () => {
			function getAnswer () {
				return Symbol.for('42');
			}
			let s = new ServiceDefinition(getAnswer);
			console.log(s.toString());
			assert.strictEqual(s.root, s);
		});
		it ('finds root key for an extended service', () => {
			let c = new Lazybox();
			function getAnswer () {
				return Symbol.for('42');
			}
			function getAnswer2 () {
				return Symbol.for('44');
			}
			c.define('answer', getAnswer);
			c.extend('answer', getAnswer2);
			const s = mapget.call(c, 'answer');
			assert.strictEqual(s.callback, getAnswer2, 'correct last service');
			assert.strictEqual(s.root.callback, getAnswer, 'correct root service');
		});
	});
});
describe('Lazybox', () => {
	describe('Lazybox.isFunction()', () => {
		// TODO: [test] isFunction
	});
	describe('Lazybox.isPlainFunction()', () => {
		// TODO: [test] isPlainFunction
	});
	describe('Lazybox.isGeneratorObject()', () => {
		// TODO: [test] isGeneratorObject
	});
	describe('Lazybox.isGenerator()', () => {
		// TODO: [test] isGenerator
	});
	describe('Lazybox.isDefined()', () => {
		// TODO: [test] isDefined
	});

	describe('Lazybox#define(key, value)', () => {

		it('Should define a service without dependencies', () => {
			let c = new Lazybox();
			function getAnswer () {
				return 42;
			}
			c.define('answer', getAnswer);
			// Sets an uninitialized service for the key
			const s = mapget.call(c, 'answer');
			assert.equal(s.dependencies, null);
			assert.ok(s instanceof ServiceDefinition);
		});
		it('Should define a service with dependencies', () => {
			let c = new Lazybox();
			function getAnswer (value) {
				return value;
			}
			c.define('answer', ['answer.value', getAnswer]);
			let s = mapget.call(c, 'answer');
			assert.deepEqual(s.dependencies, ['answer.value']);
			assert.ok(s instanceof ServiceDefinition);
		});
	});
	describe('Lazybox#get(key)', () => {
		it('Should return undefined for undefined keys', () => {
			let c = new Lazybox();
			assert.strictEqual(c.get('foo'), undefined);
		});
		it('Should return a value for parameters', () => {
			let c = new Lazybox();
			let obj = {};
			c.set('foo', obj);
			assert.strictEqual(c.get('foo'), obj);
		});
		it('Should initialize a defined service (no deps)', () => {
			let c = new Lazybox();
			const obj = {};
			function getAnswer () {
				return obj;
			}
			c.define('answer', getAnswer);
			assert.strictEqual(c.get('answer'), obj);
		});
		it('Should initialize a defined service', () => {
			let c = new Lazybox();
			const obj = Symbol('42');
			function getAnswer (value) {
				return value;
			}
			c.define('answer', ['answer.value', getAnswer]);
			c.set('answer.value', obj);
			assert.strictEqual(c.get('answer'), obj);
		});
		it('Should fail to initialize defined service missing deps', () => {
			let c = new Lazybox();
			function getAnswer (value) {
				return value;
			}
			c.define('answer', ['answer.value', getAnswer]);
			assert.throws(() => {
				c.get('answer');
			}, /'answer\.value'/);
		});
		it('Should clean up after initializing a service', () => {
			let c = new Lazybox();
			const obj = Symbol('42');
			function getAnswer (value) {
				return value;
			}
			c.define('answer', ['answer.value', getAnswer]);
			c.set('answer.value', obj);
			assert.strictEqual(c.get('answer'), obj);
		});
	});
	describe('Lazybox#extend(key)', () => {
		it('Should not fail for parameter key', () => {
			let c = new Lazybox();
			c.set('foo', 'bar');
			assert.doesNotThrow(() => {
				c.extend('foo', noop);
			});
		});
		it('Should not fail for non service key', () => {
			let c = new Lazybox();
			c.set('foo', 'bar');
			assert.doesNotThrow(() => {
				c.extend('foo', noop);
			});
		});
		it('Should extend a service', () => {
			let c = new Lazybox();
			function getAnswer (value) {
				return value;
			}
			c.define('answer', ['answer.value', getAnswer]);
			c.extend('answer', function (value, cc) {
				assert.strictEqual(cc, c, 'Container as 2nd param');
				assert.strictEqual(value, Symbol.for('42'), 'Passes last service result as first dep');
				return Symbol.for('44');
			});
			c.set('answer.value', Symbol.for('42'));
			assert.strictEqual(c.get('answer'), Symbol.for('44'), 'Returns extended result');
		});
		it('Should extend a service multiple times', () => {
			let c = new Lazybox();
			function getAnswer (value) {
				return value;
			}
			c.define('answer', ['answer.value', getAnswer]);
			for (let i=0; i < 10; i++) {
				c.extend('answer', function (value, cc) {
					assert.strictEqual(cc, c, 'Container as 2nd param');
					assert.strictEqual(value, Symbol.for(`${42 + i}`), 'Passes last service result as first dep');
					return Symbol.for(`${42 + i + 1}`);
				});
			}
			c.set('answer.value', Symbol.for('42'));
			assert.strictEqual(c.get('answer'), Symbol.for('52'), 'Returns extended result');
		});
		it('Should not fail for initialized service', () => {
			let c = new Lazybox();
			c.define('foo', function () {
				return 'bar';
			});
			let foo = c.get('foo');
			assert.doesNotThrow(() => {
				c.extend('foo', noop);
			});
		});
	});
	describe('Lazybox#setdefault()', () => {
		it ('Gets an already set value', () => {
			let c = new Lazybox()
			c.set('foo', 'bar');
			assert.equal(c.setdefault('foo', 'baz'), 'bar');
		});
		it ('Sets a new value and returns it', () => {
			let c = new Lazybox()
			assert.equal(c.setdefault('foo', 'baz'), 'baz');
			assert.equal(c.get('foo'), 'baz');
		});
		it ('Does not override a service', () => {
			let c = new Lazybox();
			let foo = {foo: bar => bar};
			c.define('foo', () => foo);
			assert.strictEqual(c.setdefault('foo', 'baz'), foo);
		});
	});
	describe('Lazybox#delete()', () => {
		// TODO: [test] delete()
	});
	describe('Lazybox#factory()', () => {
		// TODO: [test] factory()
	});
	describe('Lazybox#resolve()', () => {
		// TODO: [test] resolve()
	});
	describe('Lazybox#require()', () => {
		// TODO: [test] require()
	});
	describe('Lazybox#service()', () => {
		// TODO: [test] service()
	});
	describe('Lazybox#raw()', () => {
		it ("Should return undefined for not set keys", () => {
			let c = new Lazybox();
			assert.strictEqual(c.raw('foo'), undefined);
		});
		it ("Should return value for set keys", () => {
			let c = new Lazybox();
			let bar = {};
			c.set('foo', bar);
			assert.strictEqual(c.raw('foo'), bar);
		});
		it ("Should return service for service keys", () => {
			let c = new Lazybox();
			let bar = {};
			let foo = () => bar;
			c.define('foo', foo);
			const s = c.raw('foo');
			assert.ok(s instanceof ServiceDefinition);
		});
	});
	describe('Lazybox#register()', () => {
		// TODO: [test] register()
		it ("Accepts provider callbacks", () => {
			let c = new Lazybox();
			assert.doesNotThrow(() => {
				c.register(function (c) {});
			});
			c.register(function (c) {
				c.set('bar', 'baz');
			});
			assert.equal(c.get('bar'), 'baz');
		});
		it ("Accepts provider objects", () => {
			let c = new Lazybox();
			assert.doesNotThrow(() => {
				c.register({register: function (c) {}});
			});
			c.register({
				register: function (c) {
				c.set('bar', 'baz');
			}});
			assert.equal(c.get('bar'), 'baz');
		});
		it ("Fails on invalid providers", () => {
			let c = new Lazybox();
			assert.throws(() => {
				c.register(null);
			});
		});
		it ("Sets defaults", () => {
			let c = new Lazybox();
			c.register(function (c) {
				c.set('baz', 'bar');
			}, { baz: 'foo' });
			assert.equal(c.get('baz'), 'foo');
		});
	});
	describe('Lazybox#rebase()', () => {
		it('Should rebase not defined services', () => {
			let c = new Lazybox();
			let bar = {};
			c.rebase('foo', [() => bar]);
			assert.strictEqual(c.get('foo'), bar);
		});
		it('Should rebase loaded services', () => {
			let c = new Lazybox();
			let bar = {};
			let baz = {};
			c.set('foo', bar);
			c.rebase('foo', [() => baz]);
			assert.strictEqual(c.get('foo'), baz);
		});
		it('Should rebase services', () => {
			let c = new Lazybox();
			let bar = {bar: 'bar'};
			let baz = {baz: 'baz'};
			c.define('foo', [() => bar]);
			c.extend('foo', [(foo) => {
				foo.bar = 'baz';
				return foo
			}]);
			c.rebase('foo', [() => baz]);
			assert.deepEqual(c.get('foo'), {
				bar: 'baz',
				baz: 'baz'
			});
		});
	});
	describe('Lazybox#size', () => {
		it ('Should report size 1 on start', () => {
			let c = new Lazybox();
			assert.equal(c.size, 1, 'Has size 1 on initialization');
		});
		it ('Should report size of extended services', () => {
			let c = new Lazybox();
			let bar = {bar: 'bar'};
			let baz = {baz: 'baz'};
			c.define('foo', [() => bar]);
			assert.equal(c.size, 2);
			c.extend('foo', [(foo) => {
				foo.bar = 'baz';
				return foo
			}]);
			assert.equal(c.size, 3);
		});
	});
});

