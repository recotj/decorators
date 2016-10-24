import PooledClass from './PooledClass';

const poolers = [
	undefined,
	PooledClass.oneArgumentPooler,
	PooledClass.twoArgumentPooler,
	PooledClass.fourArgumentPooler,
	PooledClass.fiveArgumentPooler
];

const pool = ({ capacity, pooler, guard }) => (Klass, key, descriptor) => {
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

	const destructor = Klass.prototype.destructor;
	if (typeof destructor === 'function') {
		Klass.prototype.destructor = function () {
			Reflect.apply(destructor, this, arguments);
			Reflect.apply(standardDestructor, this, []);
		};
	} else {
		Klass.prototype.destructor = standardDestructor;
	}

	return Klass;
};

Object.assign(pool, PooledClass);

export default pool;

function standardDestructor() {
	Object.keys(this).forEach((k) => {
		this[k] = null;
	});
}

function isPositiveInteger(num) {
	return num === (num | 0) && num > 0;
}
