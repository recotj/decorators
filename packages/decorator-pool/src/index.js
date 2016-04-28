const PooledClass = require('./PooledClass');

const poolers = [
	undefined,
	PooledClass.oneArgumentPooler,
	PooledClass.twoArgumentPooler,
	PooledClass.fourArgumentPooler,
	PooledClass.fiveArgumentPooler
];

const pool = module.exports = ({capacity, pooler, guard}) => (Klass, key, descriptor) => {
	if (descriptor) return descriptor;

	if (!isPositiveInteger(capacity)) capacity = undefined;
	if (typeof pooler !== 'function') pooler = poolers[Klass.length];

	Klass.poolSize = capacity;
	PooledClass.addPoolingTo(Klass, pooler);

	if (typeof guard === 'function') {
		const release = Klass.release;
		Klass.release = function (instance) {
			if (Reflect.apply(guard, Klass, [instance, Klass]))
				Reflect.apply(release, Klass, [instance]);
		};
	}

	if (typeof Klass.prototype.destructor !== 'function') {
		// TODO: should interrupt the decoration here, or at least give out a warning ?
		Klass.prototype.destructor = standardDestructor;
	}

	return Klass;
};

Object.assign(pool, PooledClass);

function standardDestructor() {
	Object.keys(this).forEach((k) => {
		this[k] = null;
	});
}

function isPositiveInteger(num) {
	return num === (num | 0) && num > 0;
}
