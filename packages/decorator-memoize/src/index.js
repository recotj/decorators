const UNSET = Symbol('unset');

const memoize = ({ resolver, capacity, expose, constant }) => (target, key, descriptor) => {
	const field = descriptor.get ? 'get' : 'value';
	const method = descriptor[field];

	if (typeof method !== 'function') {
		return descriptor;
	}

	if (typeof resolver !== 'function') {
		resolver = identity;
	}

	if (!isPositiveInteger(capacity)) {
		capacity = Number.POSITIVE_INFINITY;
	}

	descriptor[field] = createMemoized(method, key, { resolver, capacity, expose, constant });

	return descriptor;
};

export default memoize;

export const constant = memoize({ constant: true });
export const one = (resolver) => memoize({ capacity: 1, resolver });

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

function createSingleMemoized(method, key, { resolver }) {
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

function createCommonMemoized(method, key, { resolver, capacity, expose }) {
	let cache = UNSET;

	const memoized = function () {
		if (cache === UNSET) {
			cache = new Map();

			if (expose === true) {
				this[key].cache = cache;
			}
		}

		const cacheKey = Reflect.apply(resolver, this, arguments);

		if (cache.has(cacheKey)) {
			return cache.get(cacheKey);
		}

		const result = Reflect.apply(method, this, arguments);

		if (cache.size < capacity) {
			cache.set(cacheKey, result);
		}

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

function identity(v) {
	return v;
}
