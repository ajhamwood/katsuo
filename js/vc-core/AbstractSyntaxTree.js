'use strict';

var AST = (() => {
  let U = this.U;
  if (typeof module !== 'undefined') U = require('./Utilities.js');


  class Term extends U.Eq {}

  class TypeLevel extends Term {
    constructor (level) {
      super();
      if (U.testInteger(level)) Object.assign(this, {level});
      else throw new Error('Cannot form universe') // heh
    }
    show () { return `Type${this.level ? this.level : ''}` }
  }

  class Ann extends Term {
    constructor (term1, term2) {
      super();
      if (U.testExtendedCtor(term1, Term) && U.testExtendedCtor(term2, Term)) Object.assign(this, {term1, term2});
      else throw new Error('Cannot form term')
    }
    show () { return `Ann(${this.term1.show()}, ${this.term2.show()})` }
  }

  class Pi extends Term {
    constructor (term1, term2) {
      super(term1, term2);
      if (U.testExtendedCtor(term1, Term) && U.testExtendedCtor(term2, Term)) Object.assign(this, {term1, term2});
      else throw new Error('Cannot form term')
    }
    show () { return `Pi(${this.term1.show()}, ${this.term2.show()})` }
  }

  class Lam extends Term {
    constructor (term) {
      super();
      if (U.testExtendedCtor(term, Term)) Object.assign(this, {term});
      else throw new Error('Cannot form term')
    }
    show () { return `Lam ${this.term.show()}` }
  }

  class App extends Term {
    constructor (term1, term2) {
      super();
      if (U.testExtendedCtor(term1, Term) && U.testExtendedCtor(term2, Term)) Object.assign(this, {term1, term2});
      else throw new Error('Cannot form term')
    }
    show () { return `${this.term1.show()} :@: ${this.term2.show()}` }
  }

  class BoundVar extends Term {
    constructor (distance) {
      super();
      if (U.testInteger(distance)) Object.assign(this, {distance});
      else throw new Error('Cannot form term')
    }
    show () { return `Bound ${this.distance}` }
  }

  class FreeVar extends Term {
    constructor (name) {
      super();
      if (U.testExtendedCtor(name, Name)) Object.assign(this, {name});
      else throw new Error('Cannot form term')
    }
    show () { return `Free ${this.name.show()}` }
  }

/*

  class InferrableTerm extends U.Eq {}

  class Annotated extends InferrableTerm {
    constructor (checkableTerm1, checkableTerm2) {
      super();
      if (U.testExtendedCtor(checkableTerm1, CheckableTerm) && U.testExtendedCtor(checkableTerm2, CheckableTerm))
        Object.assign(this, { checkableTerm1, checkableTerm2 });
      else throw new Error('?')
    }
    show () { return `Ann(${this.checkableTerm1.show()}, ${this.checkableTerm2.show()})` }
  }

  class Star extends InferrableTerm {
    show () { return 'Star' }
  }

  class Pi extends InferrableTerm {
    constructor (checkableTerm1, checkableTerm2) {
      super()
      if (U.testExtendedCtor(checkableTerm1, CheckableTerm) && U.testExtendedCtor(checkableTerm2, CheckableTerm))
        Object.assign(this, { checkableTerm1, checkableTerm2 });
      else throw new Error('?')
    }
    show () { return `Pi(${this.checkableTerm1.show()}, ${this.checkableTerm2.show()})` }
  }

  class Bound extends InferrableTerm {
    constructor (int) {
      super();
      if (U.testInteger(int)) Object.assign(this, { int });
      else throw new Error('?')
    }
    show () { return `Bound ${this.int}` }
  }

  class Free extends InferrableTerm {
    constructor (name) {
      super();
      if (U.testExtendedCtor(name, Name)) Object.assign(this, { name })
      else throw new Error('?')
    }
    show () { return `Free ${this.name.show()}` }
  }

  class Apply extends InferrableTerm {
    constructor (inferrableTerm, checkableTerm) {
      super();
      if (U.testExtendedCtor(inferrableTerm, InferrableTerm) && U.testExtendedCtor(checkableTerm, CheckableTerm))
        Object.assign(this, { inferrableTerm, checkableTerm });
      else throw new Error('?')
    }
    show () { return `${this.inferrableTerm.show()} :@: ${this.checkableTerm.show()}` }
  }


  class CheckableTerm extends U.Eq {
    constructor () {
      super()
    }
  }

  class Inferred extends CheckableTerm {
    constructor (inferrableTerm) {
      super();
      if (U.testExtendedCtor(inferrableTerm, InferrableTerm)) Object.assign(this, { inferrableTerm })
      else throw new Error('?')
    }
    show () { return `Inf ${this.inferrableTerm.show()}` }
  }

  class Lambda extends CheckableTerm {
    constructor (checkableTerm) {
      super();
      if (U.testExtendedCtor(checkableTerm, CheckableTerm)) Object.assign(this, { checkableTerm })
      else throw new Error('?')
    }
    show () { return `Lam ${this.checkableTerm.show()}` }
  }

*/

  class Name extends U.Eq {
    constructor () {
      super()
    }
  }

  class Global extends Name {
    constructor (string) {
      super();
      if (U.testCtor(string, String)) Object.assign(this, { string });
      else throw new Error('Cannot form name')
    }
    show () { return `Global '${this.string}'` }
  }

  class Local extends Name {
    constructor (index) {
      super();
      if (U.testInteger(index)) Object.assign(this, { index })
      else throw new Error('Cannot form name')
    }
    show () { return `Local ${this.index}` }
  }

  class Quote extends Name {
    constructor (index) {
      super();
      if (U.testInteger(index)) Object.assign(this, { index });
      else throw new Error('Cannot form name')
    }
    show () { return `Quote ${this.index}` }
  }


  class Value {}

  class VLambda extends Value {
    constructor (func) { // Not natural to validate for function ADT in javascript
      super();
      if (U.testCtor(func, Function)) Object.assign(this, { func });
      else throw new Error('Cannot form value')
    }
  }

  class VType extends Value {
    constructor (level) {
      super()
      if (U.testInteger(level)) Object.assign(this, {level});
      else throw new Error('Cannot form value')
    }
  }

  class VPi extends Value {
    constructor (value, func) { //
      super();
      if (U.testExtendedCtor(value, Value) && U.testCtor(func, Function)) Object.assign(this, { value, func });
      else throw new Error('Cannot form value')
    }
  }

  class VNeutral extends Value {
    constructor (neutral) {
      super();
      if (U.testExtendedCtor(neutral, Neutral)) Object.assign(this, { neutral });
      else throw new Error('Cannot form value')
    }
  }


  class Neutral {}

  class NFree extends Neutral {
    constructor (name) {
      super();
      if (U.testExtendedCtor(name, Name)) Object.assign(this, { name });
      else throw new Error('Cannot form neutral term')
    }
  }

  class NApply extends Neutral {
    constructor (neutral, value) {
      super();
      if (U.testExtendedCtor(neutral, Neutral) && U.testExtendedCtor(value, Value)) Object.assign(this, { neutral, value });
      else throw new Error('Cannot form neutral term')
    }
  }


  class Type {
    constructor (value) {
      if (U.testExtendedCtor(value, Value)) Object.assign(this, { value });
      else throw new Error('Cannot form type')
    }
  }


  class Declaration extends U.ValidatedPair {
    constructor (rhs) {
      super(Name, rhs)
    }
  }

  class Signature extends Declaration {
    constructor () {
      super(Type);
    }
  }

  class Definition extends Declaration {
    constructor () {
      super(Value)
    }
  }

/*
  class Constructor extends Declaration {
    constructor () {
      super(null)
    }
  }
  */


  return {
    Term, TypeLevel, Ann, Pi, Lam, App, BoundVar, FreeVar,
    /*InferrableTerm, Annotated, Star, Pi, Bound, Free, Apply,
    CheckableTerm, Inferred, Lambda,*/
    Name, Global, Local, Quote,

    Value, VLambda, /*VStar,*/ VType, VPi, VNeutral,

    Neutral, NFree, NApply,

    Type,

    Declaration, Signature, Definition /*, Constructor*/
  }
})();


if (typeof module !== 'undefined') module.exports = AST
