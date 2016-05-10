const { Component } = require('react');
const ReactDOM = require('react-dom');
const inherits = require('utils/lib/inherits');

const ReactOwnerUtil = require('react-tree-utils/lib/ReactOwnerUtil');

const ReactOwnerRecord = module.exports = (Klass) => {
	if (!Component.prototype.isPrototypeOf(Klass.prototype)) return;

	const SuperClass = Reflect.getPrototypeOf(Klass.prototype).constructor;

	class MiddleClass extends SuperClass {
		componentDidMount() {
			ReactOwnerUtil.recordOwner(this, this);
			if (typeof super.componentDidMount === 'function') super.componentDidMount();
		}

		// TODO: is it necessary to manually remove the reference to the react component from the dom element
		// 'cause the dom element would be removed from the dom tree later and all the references it keeps
		// would be garbage-collected automatically.
		componentWillUnmount() {
			ReactOwnerUtil.unrecordOwner(this, this);
			if (typeof super.componentWillUnmount === 'function') super.componentWillUnmount();
		}
	}

	inherits(Klass, MiddleClass);
};

ReactOwnerRecord.getOwner = ReactOwnerUtil.getOwner;
