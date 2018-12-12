'use strict';

var AST = (() => {
  let U = this.U;
  if (typeof module !== 'undefined') U = require('./Utilities.js');


  class Term extends U.Eq {}

  class TypeLevel extends Term {
    constructor (level) {
      super();
      if (U.testInteger(level)) Object.assign(this, {level});
      else throw new Error('Cannot form term')
    }
    show () { return `Type${this.level ? this.level : ''}` }
    equal (value) {
      if (value.constructor === TypeLevel && this.level >= value.level) return true
      return false
    }
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
  class Lit extends Term {
    constructor (string) {
      super();
      if (U.testCtor(string, String)) Object.assign(this, {string});
      else throw new Error('Cannot form literal')
    }
    show () { return `Lit '${this.string}'` }
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

  class VTypeLevel extends Value {
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
    constructor (name, type) {
      super(Type);
      return this.setValue(name, type)
    }
  }

  class Definition extends Declaration {
    constructor (name, value) {
      super(Value);
      return this.setValue(name, value)
    }
  }

  class Constructor extends Declaration {
    constructor () {
      super(null)
    }
  }


  class Entry extends U.ValidatedPair {
    constructor (rhs) {
      super(String, rhs)
    }
  }

  class TypeSig extends Entry {
    constructor (string, term) {
      super(Term);
      return this.setValue(string, term)
    }
    show () { return `TypeSig: ${this.first()}, ${this.second().show()}` }
  }

  class TermDef extends Entry {
    constructor (string, term) {
      super(Term);
      return this.setValue(string, term)
    }
    show () { return `TermDef: ${this.first()}, ${this.second().show()}` }
  }

  class DataCon extends Entry {
    constructor (string, term) {
      super(Term);
      return this.setValue(string, term)
    }
    show () { return `DataCon: ${this.first()}, ${this.second().show()}` }
  }


  return {
    Term, TypeLevel, Ann, Pi, Lam, App, BoundVar, FreeVar,
    Name, Global, Local, Quote,

    Value, VLambda, VTypeLevel, VPi, VNeutral,

    Neutral, NFree, NApply,

    Type,

    Declaration, Signature, Definition, Constructor,
    Entry, TypeSig, TermDef, DataCon
  }
})();


if (typeof module !== 'undefined') module.exports = AST
