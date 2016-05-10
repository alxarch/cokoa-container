'use strict';

const assert = require('assert');
const pathToRx = require('path-to-regexp');

function isDefined (obj) {
	return typeof obj !== 'undefined';
}
function isGeneratorObject (obj) {
	return Object.prototype.toString.call(obj) === '[object Generator]';
}

function isFunction (fn) {
	return 'function' === typeof fn;
}
function isGenerator (fn) {
	return 'function' === typeof fn && fn.constructor.name == 'GeneratorFunction';
}
function isPlainFunction (fn) {
	return 'function' === typeof fn && fn.constructor.name == 'Function';
}
function parseService (service) {
	return Array.isArray(service) ? [service.pop(), service] : [service, null];
}

class Lazybox extends Map {
	constructor () {
		super();
		this.services = new Map();
		this.dependencies = new Map();
		this.factories = new Set();
		this.set(this, this);
	}
	factory (fn) {
		return function *() {
			while(true) {
				yield fn.apply(null, arguments);
			}
		}
	}
	set (key, value) {
		// cleanup any previous definitions
		this.delete(key);
		return super.set(key, value);
	}
	// Define a service
	define (key, service) {
		// cleanup any previous definitions
		this.delete(key);
		service = parseService(service);
		assert(isFunction(service[0]), 'Invalid service definition');
		this.services.set(key, service[0]);
		this.dependencies.set(key, service[1] || [this]);
		return this;
	}
	// Resolve dependencies
	resolve (key) {
		const result = [];
		if (this.dependencies.has(key)) {
			let deps = this.dependencies.get(key);
			for (let d of deps) {
				result.push(this.require(d));
			}
		}
		return result;
	}
	// Require a key
	require (key) {
		let result = this.get(key);
		assert(isDefined(result), `Missing dependency '${key.toString()}'`);
		return result;
	}
	// Instanciate a service
	service (key) {
		const fn = this.services.get(key);
		assert(isFunction(fn), 'Invalid service key');
		const deps = this.resolve(key);
		const service = fn.apply(null, deps);
		if (isGeneratorObject(service)) {
			this.factories.add(service);
		}
		// Cleanup
		this.services.delete(key);
		this.dependencies.delete(key);
		return service;
	}
	has (key) {
		return super.has(key) || this.services.has(key);
	}
	// Get a service or parameter
	get (key) {
		let value = super.has(key) ?
			super.get(key) :
			this.services.has(key) ?
			super.set(key, this.service(key)).get(key) :
			void 0;
		return this.factories.has(value) ? value.next().value : value;
	}

	// The raw value of a key
	raw (key) {
		return super.has(key) ? super.get(key) : this.services.get(key);
	}
	// Extend a defined service
	extend (key, service) {
		if (this.has(key)) {
			const old_key = Symbol();
			if (this.services.has(key)) {
				const old = this.services.get(key);
				const old_deps = this.dependencies.get(key);
				this.define(old_key, old_deps.concat(old));
			}
			else {
				let value = super.get(key);
				this.define(old_key, [() => value]);
			}
			service = parseService(service);
			// add previous service as last dependency
			service = [old_key].concat(service[1] || [this], service[0]);
			this.define(key, service);
		}
		else {
			this.define(key, service);
		}
		return this;
	}

	// Register a provider
	register (provider, config) {
		if (isPlainFunction(provider)) {
			provider(this);
		}
		else if (isPlainFunction(provider.register)) {
			provider.register(this);
		}
		else {
			throw new Error('Invalid provider');
		}

		for (let key in config) {
			this.set(key, config[key]);
		}

		return this;
	}

	// Iterate over keys matching a key pattern
	match (pattern, fn) {
		const keys = [];
		const rx = pathToRx(pattern, keys);
		const results = [];
		this.forEach((value, key) => {
			try {
				key = `${key}`;
			}
			catch (err) {
				return;
			}
			const m = key.match(rx);
			if (m) {
				const params = {};
				for (let i=0; i < keys.length; i++) {
					params[keys[i].name] = m[i + 1];
				}
				fn(key, params, this);
			}
		});
	}

	// Python-like setdefault
	setdefault (key, value) {
		if (this.has(key)) {
			return this.get(key);
		}
		else {
			assert(!this.services.has(key), 'Cannot use setdefault on a service');
			this.set(key, value);
			return this.get(key);
		}
	}

	// Purge a key (may break dependencies)
	delete (key) {
		let value = super.get(key);
		this.services.delete(key);
		this.dependencies.delete(key);
		this.factories.delete(value);
		return super.delete(key);
	}

}

Object.assign(Lazybox, {isPlainFunction, isFunction, isGenerator, parseService, isGeneratorObject});

module.exports = Lazybox;
