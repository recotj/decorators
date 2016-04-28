const OrderedMap = require('OrderedMap');

const UNSET = Symbol('unset');

const memoize = module.exports = ({resolver, capacity, expose, constant}) => (target, key, descriptor) => {
	const field = descriptor.get ? 'get' : 'value';
	const method = descriptor[field];

	if (typeof method !== 'function') return descriptor;

	if (typeof resolver !== 'function') resolver = _.identity;
	if (!isPositiveInteger(capacity)) capacity = Number.POSITIVE_INFINITY;

	descriptor[field] = createMemoized(method, key, {resolver, capacity, expose, constant});

	return descriptor;
};

memoize.constant = memoize({constant: true});
memoize.one = (resolver) => memoize({capacity: 1, resolver});

function createMemoized(method, key, options) {
	if (options.constant === true) {
		// constant case
		return createConstantMemoized(method, key, options);
	} else if (options.capacity === 1) {
		// light case
		return createSingleMemoized(method, key, options);
	}

	return createCommonMemoized(method, key, options);
}

function createConstantMemoized(method) {
	let result = UNSET;

	return function () {
		if (result === UNSET) {
			result = Reflect.apply(method, this, arguments);
		}
		return result;
	};
}

function createSingleMemoized(method, key, {resolver}) {
	let result = UNSET;
	let cacheKey = UNSET;

	const memoized = function () {
		const newCacheKey = Reflect.apply(resolver, this, arguments);

		if (cacheKey !== newCacheKey) {
			result = Reflect.apply(method, this, arguments);
			cacheKey = newCacheKey;
		}

		return result;
	};

	memoized.reset = () => {
		cacheKey = UNSET;
	};

	return memoized;
}

function createCommonMemoized(method, key, {resolver, capacity, expose}) {
	let cache = UNSET;

	const memoized = function () {
		if (cache === UNSET) {
			cache = new OrderedMap();

			if (expose === true) {
				this[key].cache = cache;
			}
		}

		const cacheKey = Reflect.apply(resolver, this, arguments);

		if (cache.has(cacheKey))
			return cache.get(cacheKey);

		const result = Reflect.apply(method, this, arguments);
		cache.set(cacheKey, result);

		if (cache.size > capacity)
			cache.shift();

		return result;
	};

	memoized.reset = () => {
		cache = UNSET;
	};

	return memoized;
}

function isPositiveInteger(num) {
	return num === (num | 0) && num > 0;
}
