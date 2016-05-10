'use strict';
const Lazybox = require('.');
const assert = require('assert');
const mapget = Map.prototype.get;
function getDependencies(c, key) {
	return c.dependencies instanceof Map && c.dependencies.get(key);
}
function noop () {};

describe('Lazybox', () => {
	describe('Lazybox.parseService()', () => {
		it ('Should parse single function', () => {
			let fn = function () {};
			assert.deepEqual(Lazybox.parseService(fn), [fn, null]);
		});
		it ('Should parse an array function definition without deps', () => {
			let fn = function () {};
			assert.deepEqual(Lazybox.parseService([fn]), [fn, []]);
		});
		it ('Should parse an array function definition with deps', () => {
			let fn = function () {};
			assert.deepEqual(Lazybox.parseService(['foo', fn]), [fn, ['foo']]);
		});
	});
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
			assert.strictEqual(mapget.call(c, 'answer'), undefined);
			assert.deepEqual(getDependencies(c, 'answer'), [c]);
			assert.strictEqual(c.services.get('answer'), getAnswer);
		});
		it('Should define a service with dependencies', () => {
			let c = new Lazybox();
			function getAnswer (value) {
				return value;
			}
			c.define('answer', ['answer.value', getAnswer]);
			assert.strictEqual(mapget.call(c, 'answer'), Lazybox.NOT_INITIALIZED);
			assert.deepEqual(getDependencies(c, 'answer'), ['answer.value']);
			assert.strictEqual(c.services.get('answer'), getAnswer);
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
			assert.strictEqual(getDependencies(c, 'answer'), undefined);
			assert.strictEqual(c.services.get('answer'), undefined);
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
				assert.strictEqual(value, Symbol.for('42'), 'Passes last service result as last dep');
				return Symbol.for('44');
			});
			c.set('answer.value', Symbol.for('42'));
			assert.strictEqual(c.get('answer'), Symbol.for('44'), 'Returns extended result');
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
	describe('Lazybox#has()', () => {
		// TODO: [test] as()
	});
	describe('Lazybox#match()', () => {
		it ('Handles symbol keys', () => {
			let c = new Lazybox();
			c.set(Symbol('foo'), {});
			assert.doesNotThrow(() => {
					c.match('foo', () => {});
			});
		});
		it ('Matches params', () => {
			let c = new Lazybox();
			c.set('foo.bar.baz', 'foo');
			c.set('foo.bar', 'bar');
			c.set('baz.bar', 'foo');
			const actual = [];
			c.match('foo.:bar.:baz?', (key, params) => actual.push({key, params}) );
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
		});
		it ('Does not instanciate services', () => {
			let c = new Lazybox();
			let started = false;
			let service = {};
			c.set('foo', () => {
				started = true;
				return  service;
			});
			let matched = 0;
			c.match('foo', (key, params) => {
				matched++;
				assert.equal(started, false, 'Does not initialize service');
				assert.equal(key, 'foo');
				assert.deepEqual(params, {});
			});
			assert.equal(matched, 1);
		});
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
			assert.strictEqual(c.raw('foo'), foo);
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
	describe('Lazybox#root()', () => {
		it ('returns the key itself for non existing service', () => {
			let c = new Lazybox();
			assert.strictEqual(c.root('foo'), 'foo');
		});
		it ('returns the key itself for non extended service', () => {
			let c = new Lazybox();
			function getAnswer () {
				return Symbol.for('42');
			}
			c.define('answer', getAnswer);
			assert.strictEqual(c.root('foo'), 'foo');
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
			assert.strictEqual(c.services.get((c.root('answer'))), getAnswer)
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
});

