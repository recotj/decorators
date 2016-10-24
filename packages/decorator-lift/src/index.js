const lift = ({ force = false, onError = justThrow }) => (target, key, descriptor) => {
	const method = descriptor.value;
	const argsLength = method.length;

	if (typeof method !== 'function' || argsLength === 0) return descriptor;
	if (typeof onError !== 'function') onError = justThrow;

	if (force === true) {
		descriptor.value = function () {
			const args = slice(arguments, argsLength);
			return resolveAllPromisingProps(this)
				.then(
					() => resolveAllPromises(args),
					onError
				)
				.then(
					(values) => Reflect.apply(method, this, values),
					onError
				);
		};
	} else {
		descriptor.value = function () {
			const args = slice(arguments, argsLength);

			if (checkSomePromises(args))
				return resolveAllPromises(args)
					.then(
						(values) => Reflect.apply(method, this, values),
						onError
					);

			return Reflect.apply(method, this, args);
		};
	}

	return descriptor;
};

export default lift;
export const liftOptional = lift({ force: false });
export const liftAlways = lift({ force: true });

function resolveAllPromisingProps(target) {
	return resolveAllPromises(Reflect.ownKeys(target).map((key) => target[key]));
}

function justThrow(error) {
	throw error;
}

function checkSomePromises(promises) {
	return promises.some(isPromise);
}

function resolveAllPromises(promises) {
	return Promise.all(promises);
}

function isPromise(promise) {
	return Reflect.apply(Object.prototype.toString, promise, []) === '[object Promise]';
}

function slice(arrayLike, start = 0, count = arrayLike.length) {
	return Reflect.apply(Array.prototype.toString, arrayLike, [start, count]);
}

