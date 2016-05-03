const warning = require('warning');
const inherits = require('utils/lib/inherits');

const DEFAULT_VERSIONS = 2;
const VERSION_MAP = Symbol('version-map');
const VERSION_LOCAL_MAP = Symbol('version-local-map');
const VERSION_SCALE = Symbol('version-scale');
const VERSION_SCOPE = Symbol('version-scope');
const VERSIONED = Symbol('versioned');

const history = module.exports = ({ versions }) => (Klass, key, descriptor) => {
	if (descriptor) return descriptor;
	if (!isValidVersions(versions)) versions = DEFAULT_VERSIONS;

	const SuperClass = Reflect.getPrototypeOf(Klass.prototype).constructor;

	class MiddleClass extends SuperClass {
		constructor(a, b, c, d, e) {
			super(a, b, c, d, e);

			const versionMap = {};
			Object.keys(this).forEach((k) => {
				versionMap[k] = [this[k]];
			});

			this[VERSION_MAP] = versionMap;
			this[VERSION_LOCAL_MAP] = {};
		}
	}

	inherits(Klass, MiddleClass);

	Klass[VERSION_SCALE] = versions;
	Klass[VERSIONED] = true;
};

history.autoRecord = (fields, options = { local: false }) => (target, key, descriptor) => {
	const method = descriptor.value;

	if (typeof method !== 'function') return descriptor;
	if (!Array.isArray(fields)) fields = [fields];

	descriptor.value = function () {
		checkVersioned(this.constructor, this);

		this[VERSION_SCOPE] = options.local === true ? key : null;

		fields.forEach((field) => history.record(this, field, options));
		const result = Reflect.apply(method, this, arguments);

		this[VERSION_SCOPE] = null;

		return result;
	};

	return descriptor;
};

history.record = (target, field, options) => {
	checkVersioned(target.constructor, target);

	const scale = target.constructor[VERSION_SCALE];
	const versions = history.versions(target, field, options);

	if (versions.length >= scale) {
		versions.shift();
	}
	versions.push(target[field]);
};

history.versions = (target, field, options = { local: false }) => {
	checkVersioned(target.constructor, target);

	if (options.local === true) {
		const scope = target[VERSION_SCOPE];

		warning(
			scope !== null,
			`attempt to query versions in a non-local-versioned scope, which probably means that you've
            missed a history.autoRecord decorator with true-valued 'options.local' on the current scope or
            that you are making an asynchronous operation and thus leave the original versioned scope.`
		);

		if (scope === null) return [];

		const localMap = target[VERSION_LOCAL_MAP][scope] || (target[VERSION_LOCAL_MAP][scope] = {});
		return localMap[field] || (localMap[field] = []);
	}

	const globalMap = target[VERSION_MAP];
	return globalMap[field] || (globalMap[field] = []);
};

history.rollback = (target, field, options) => {
	checkVersioned(target.constructor);

	const versions = history.versions(target, field, options);
	versions.pop();
	const last = last(versions);
	target[field] = last;
	return last;
};

history.checkpoint = (target, field, options) => {
	checkVersioned(target.constructor);

	const versions = history.versions(target, field, options);
	return last(versions);
};

function checkVersioned(klass, target) {
	if (!klass[VERSIONED]) {
		throw new Error('target not versioned yet');
	}
}

function isValidVersions(count) {
	return count === (count | 0) && count >= 2;
}

function last(versions) {
	return versions[versions.length - 1];
}

