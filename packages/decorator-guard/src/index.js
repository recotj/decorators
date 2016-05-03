module.exports = ({ precondition }) => (target, key, descriptor) => {
	const method = descriptor.value;

	if (typeof method !== 'function') return descriptor;
	if (typeof precondition !== 'function') return descriptor;

	descriptor.value = function () {
		if (Reflect.apply(precondition, this, arguments)) {
			Reflect.apply(method, this, arguments);
		}
	};

	return descriptor;
};
