const {Component} = require('react');
const ReactDOM = require('react-dom');
const {inherits} = require('utils');

const INTERNAL_KEY = Symbol('internal-key');
const OWNERS = Symbol('owners');
const generateInternalKey = () => Symbol(`internal-key$${Math.random().toString(36).slice(2)}`);

const ReactOwnerRecord = module.exports = (Klass) => {
	if (!Component.prototype.isPrototypeOf(Klass.prototype)) return;

	Klass[INTERNAL_KEY] = generateInternalKey();

	const SuperClass = Reflect.getPrototypeOf(Klass.prototype).constructor;

	class MiddleClass extends SuperClass {
		componentDidMount() {
			const element = ReactDOM.findDOMNode(this);
			const owners = element[OWNERS] || (element[OWNERS] = {});
			owners[Klass[INTERNAL_KEY]] = this;
			if (typeof super.componentDidMount === 'function') super.componentDidMount();
		}

		// TODO: is it necessary to manually remove the reference to the react component from the dom element
		// 'cause the dom element would be removed from the dom tree later and all the references it keeps
		// would be garbage-collected automatically.
		componentWillUnmount() {
			const element = ReactDOM.findDOMNode(this);
			Reflect.deleteProperty(element[OWNERS], Klass[INTERNAL_KEY]);
			if (typeof super.componentWillUnmount === 'function') super.componentWillUnmount();
		}
	}

	inherits(Klass, MiddleClass);
};

ReactOwnerRecord.getOwner = (element, ownerType) => {
	if (!(element instanceof HTMLElement)) return null;
	if (typeof ownerType !== 'function') return null;

	const owners = element[OWNERS];
	if (!owners || Object.keys(owners).length === 0) return null;

	const internalKey = ownerType[INTERNAL_KEY];
	if (!internalKey) return null;

	return owners[internalKey];
};
