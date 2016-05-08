'use strict';

const assert = require('assert');
const pathToRx = require('path-to-regexp');
const NOT_INITIALIZED = Symbol('not_initialized');
const FACTORY = Symbol('factory'); 

function isDefined (obj) {
	return typeof obj !== 'undefined';
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
	return Array.isArray(service) ? [service.pop(), service] : [service, []];
}

class Container extends Map {
	constructor () {
		super();
		this.services = new Map();
		this.dependencies = new Map();
	}
	factory (fn) {
		return function *() {
			while(true) {
				yield fn.apply(null, arguments);
			}
		}
	}
	// Define a service
	define (key, value) {
		value = parseService(value);
		assert(isFunction(value[0]), 'Invalid service definition');
		super.set(key, NOT_INITIALIZED);
		this.services.set(key, value[0]);
		this.dependencies.set(value[0], value[1]);
		return this;
	}
	// Resolve dependencies
	resolve (key) {
		return (this.dependencies.get(key) || []).map( d => this.require(d) );
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
		if (!fn) return null;
		const deps = this.resolve(fn);
		const service = fn.apply(null, deps);
		if (isFunction(service)) {
			service[FACTORY] = isGenerator(fn);
		}
		// Cleanup
		this.services.delete(key);
		this.dependencies.delete(fn);
		return service;
	}
	// Get a service or parameter
	get (key) {
		let value = super.get(key);
		if (value === NOT_INITIALIZED) {
			value = this.service(key);
			super.set(key, value);
		}
		return value && value[FACTORY] ? value.next().value : value;
	}
	// The raw value of a key
	raw (key) {
		return super.get(key);
	}
	// Extend a defined service
	extend (key, service) {
		const old = this.services.get(key);
		assert(old, 'Cannot extend non service');
		service = parseService(service);
		assert(isFunction(service[0]), 'Invalid service definition');
		const oldkey = Symbol();
		const olddeps = this.dependencies.get(old);
		this.define(oldkey, olddeps.concat(old));
		// add previous service as last dependency
		this.define(key, service[1].concat([oldkey, service[0]]));
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
			const m = rx.exec(key);
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
			this.set(key, value);
			return this.get(key);
		}
	}

	// Purge a key (may break dependencies)
	delete (key) {
		let value = super.get(key);
		if (value === NOT_INITIALIZED) {
			value = this.services.get(key);
			this.dependencies.delete(value);
			this.services.delete(key);
		}
		if (isFunction(value)) delete value[FACTORY];
		return super.delete(key);
	}

}

Object.assign(Container, {NOT_INITIALIZED, FACTORY, isPlainFunction, isFunction, isGenerator, parseService});

module.exports = Container;
