const _ = require('lodash');
const PooledClass = require('react/lib/PooledClass');

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
	if (!_.isFunction(pooler)) pooler = poolers[Klass.length];

	Klass.poolSize = capacity;
	PooledClass.addPoolingTo(Klass, pooler);

	if (_.isFunction(guard)) {
		const release = Klass.release;
		Klass.release = function (instance) {
			if (Reflect.apply(guard, Klass, [instance, Klass]))
				Reflect.apply(release, Klass, [instance]);
		};
	}

	if (!_.isFunction(Klass.prototype.destructor)) {
		// TODO: should interrupt the decoration here, or at least give out a warning ?
		Klass.prototype.destructor = standardDestructor;
	}

	return Klass;
};

_.assign(pool, PooledClass);

function standardDestructor() {
	_.forOwn(this, (v, k) => {
		this[k] = null;
	});
}

function isPositiveInteger(num) {
	return num === (num | 0) && num > 0;
}
