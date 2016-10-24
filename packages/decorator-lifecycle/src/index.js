import { Component } from 'react';
import inherits from 'utils/lib/inherits';

export default {};
export const forClass = ({ firstDidInstantiate, lastWillUninstantiate }) => (Klass) => {
	if (typeof firstDidInstantiate !== 'function') return Klass;
	if (typeof lastWillUninstantiate !== 'function') return Klass;

	let instanceCount = 0;

	const SuperClass = Reflect.getPrototypeOf(Klass.prototype).constructor;

	if (Component.prototype.isPrototypeOf(Klass.prototype)) {
		class MiddleClass extends SuperClass {
			componentDidMount() {
				if (typeof super.componentDidMount === 'function') super.componentDidMount();
				if (instanceCount === 0) firstDidInstantiate(this);
				instanceCount += 1;
			}

			componentWillUnmount() {
				instanceCount -= 1;
				if (instanceCount === 0) lastWillUninstantiate(this);
				if (typeof super.componentWillUnmount === 'function') super.componentWillUnmount();
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
				if (typeof super.destructor === 'function') super.destructor();
			}
		}

		inherits(Klass, MiddleClass);
	}
};
