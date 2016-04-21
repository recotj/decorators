const _ = require('lodash');
const {Component} = require('react');
//const inherits = require('../utils/inherits');
//const {inherits} = require('util');
const inherits = () => {};

const lifecycle = module.exports;

lifecycle.forClass = ({firstDidInstantiate, lastWillUninstantiate}) => (Klass) => {
	if (!_.isFunction(firstDidInstantiate)) return Klass;
	if (!_.isFunction(lastWillUninstantiate)) return Klass;

	let instanceCount = 0;

	const SuperClass = Reflect.getPrototypeOf(Klass.prototype).constructor;

	if (Component.prototype.isPrototypeOf(Klass.prototype)) {
		class MiddleClass extends SuperClass {
			componentDidMount() {
				if (_.isFunction(super.componentDidMount)) super.componentDidMount();
				if (instanceCount === 0) firstDidInstantiate(this);
				instanceCount += 1;
			}
			componentWillUnmount() {
				instanceCount -= 1;
				if (instanceCount === 0) lastWillUninstantiate(this);
				if (_.isFunction(super.componentWillUnmount)) super.componentWillUnmount();
			}
		}

		inherits(Klass, MiddleClass);
	} else {
		class MiddleClass extends SuperClass {
			constructor(a, b, c, d, e) {
				super(a, b, c, d, e);
				if (instanceCount === 0) firstDidInstantiate(this);
				instanceCount += 1;
			}
			destructor() {
				instanceCount -= 1;
				if (instanceCount === 0) lastWillUninstantiate(this);
				if (_.isFunction(super.destructor)) super.destructor();
			}
		}

		inherits(Klass, MiddleClass);
	}
};
