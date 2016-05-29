'use strict';

function isDefined (obj) {
	return typeof obj !== 'undefined';
}
const toString = Object.prototype.toString;
function isGeneratorObject (obj) {
	return toString.call(obj) === '[object Generator]';
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

class ServiceDefinition {
	static parse (service) {
		if (!(service instanceof ServiceDefinition)) {
			if (Array.isArray(service)) {
				service = new ServiceDefinition(service.pop(), service);
			}
			else {
				service = new ServiceDefinition(service);
			}
		}
		return service;
	}

	constructor (callback, dependencies, ancestor) {
		if (!isFunction(callback)) {
			throw new TypeError(`Invalid service definition`);
		}
		this.dependencies = dependencies;
		this.callback = callback;
		this.ancestor = ancestor;
	}

	get root () {
		let root = this;
		while (root.ancestor instanceof ServiceDefinition) {
			root = root.ancestor;
		}

		return root;
	}

	initialize (lazybox) {
		const dependencies = Array.isArray(this.dependencies) ? this.dependencies : [lazybox];

		// Resolve dependencies
		const args = [];
		for (let d of dependencies) {
			let arg = lazybox.get(d);
			if (!isDefined(arg)) {
				throw new Error(`Missing dependency '${d.toString()}'`);
			}
			args.push(arg);
		}
		return this.callback.apply(null, args);
	}
}

class Lazybox extends Map {
	constructor () {
		super();
		this.set(this, this);
	}

	// Wrap a plain function in a generator loop
	factory (fn) {
		return function *() {
			while(true) {
				yield fn.apply(null, arguments);
			}
		}
	}

	// Define a service
	define (key, service) {
		try {
			service = ServiceDefinition.parse(service);
		}
		catch (err) {
			err.key = key;
			throw err;
		}
		return this.set(key, service);
	}

	// Get a service or parameter
	get (key) {
		let value = super.get(key);
		if (value instanceof ServiceDefinition) {
			value = value.initialize(this);
			super.set(key, value);
		}
		return isGeneratorObject(value) ? value.next().value : value;
	}

	// The raw value of a key
	raw (key) {
		return super.get(key);
	}

	// Rebase a service
	rebase (key, service) {
		service = ServiceDefinition.parse(service);
		const old = super.get(key);
		if (old instanceof ServiceDefinition) {
			const root = old.root;
			root.callback = service.callback;
			root.dependencies = service.dependencies;
		}
		else {
			this.define(key, service);
		}
		return this;
	}

	// Extend a defined service
	extend (key, service) {
		let old = super.get(key);
		if (isDefined(old)) {
			const old_key = {key};
			service = ServiceDefinition.parse(service);
			if (!(old instanceof ServiceDefinition)) {
				old = ServiceDefinition.parse([() => old]);
			}
			this.define(old_key, old);
			service.ancestor = old;
			// add previous service as first dependency
			service.dependencies = [old_key].concat(service.dependencies || [this]);
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
			throw new TypeError(`Invalid provider`);
		}

		for (let key in config) {
			this.set(key, config[key]);
		}

		return this;
	}

	// Python-like setdefault
	setdefault (key, value) {
		return this.has(key) ?  this.get(key) : this.set(key, value).get(key);
	}

	// Clear without affecting `this` dependency key
	clear () {
		const value = super.get(this);
		const result = super.clear();
		this.set(this, value);
		return result;
	}

}


Object.assign(Lazybox, {isPlainFunction, isFunction, isGenerator, ServiceDefinition, isGeneratorObject});

module.exports = Lazybox;
