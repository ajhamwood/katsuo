'use strict';

var AST = (() => {
  let U = this.U;
  if (typeof module !== 'undefined') U = require('./Utilities.js');


  class InferrableTerm extends U.Eq {}

  class Annotated extends InferrableTerm {
    constructor (checkableTerm1, checkableTerm2) {
      super();
      if (U.testExtendedCtor(checkableTerm1, CheckableTerm) && U.testExtendedCtor(checkableTerm2, CheckableTerm)) {
        Object.assign(this, { checkableTerm1, checkableTerm2 })
      } else throw new Error('?')
    }
  }

  class Star extends InferrableTerm {}

  class Pi extends InferrableTerm {
    constructor (checkableTerm1, checkableTerm2) {
      super()
      if (U.testExtendedCtor(checkableTerm1, CheckableTerm) && U.testExtendedCtor(checkableTerm2, CheckableTerm)) {
        Object.assign(this, { checkableTerm1, checkableTerm2 })
      } else throw new Error('?')
    }
  }

  class Bound extends InferrableTerm {
    constructor (int) {
      super();
      if (U.testInteger(int)) {
        Object.assign(this, { int })
      } else throw new Error('?')
    }
  }

  class Free extends InferrableTerm {
    constructor (name) {
      super();
      if (U.testExtendedCtor(name, Name)) {
        Object.assign(this, { name })
      } else throw new Error('?')
    }
  }

  class Apply extends InferrableTerm {
    constructor (inferrableTerm, checkableTerm) {
      super();
      if (U.testExtendedCtor(inferrableTerm, InferrableTerm) && U.testExtendedCtor(checkableTerm, CheckableTerm)) {
        Object.assign(this, { inferrableTerm, checkableTerm })
      } else throw new Error('?')
    }
  }


  class CheckableTerm extends U.Eq {
    constructor () {
      super()
    }
  }

  class Inferred extends CheckableTerm {
    constructor (inferrableTerm) {
      super();
      if (U.testExtendedCtor(inferrableTerm, InferrableTerm)) {
        Object.assign(this, { inferrableTerm })
      } else throw new Error('?')
    }
  }

  class Lambda extends CheckableTerm {
    constructor (checkableTerm) {
      super();
      if (U.testExtendedCtor(checkableTerm, CheckableTerm)) {
        Object.assign(this, { checkableTerm })
      } else throw new Error('?')
    }
  }


  class Name extends U.Eq {
    constructor () {
      super()
    }
  }

  class Global extends Name {
    constructor (string) {
      super();
      if (U.testCtor(string, String)) {
        Object.assign(this, { string })
      } else throw new Error('?')
    }
  }

  class Local extends Name {
    constructor (int) {
      super();
      if (U.testInteger(int)) {
        Object.assign(this, { int })
      } else throw new Error('?')
    }
  }

  class Quote extends Name {
    constructor (int) {
      super();
      if (U.testInteger(int)) {
        Object.assign(this, { int })
      } else throw new Error('?')
    }
  }


  class Value {}

  class VLambda extends Value {
    constructor (func) { // Not natural to validate for function ADT in javascript
      super();
      if (U.testCtor(func, Function)) {
        Object.assign(this, { func })
      } else throw new Error('?')
    }
  }

  class VStar extends Value {}

  class VPi extends Value {
    constructor (value, func) { //
      super();
      if (U.testExtendedCtor(value, Value) && U.testCtor(func, Function)) {
        Object.assign(this, { value, func })
      } else throw new Error('?')
    }
  }

  class VNeutral extends Value {
    constructor (neutral) {
      super();
      if (U.testExtendedCtor(neutral, Neutral)) {
        Object.assign(this, { neutral })
      } else throw new Error('?')
    }
  }


  class Neutral {}

  class NFree extends Neutral {
    constructor (name) {
      super();
      if (U.testExtendedCtor(name, Name)) {
        Object.assign(this, { name })
      } else throw new Error('?')
    }
  }

  class NApply extends Neutral {
    constructor (neutral, value) {
      super();
      if (U.testExtendedCtor(neutral, Neutral) && U.testExtendedCtor(value, Value)) {
        Object.assign(this, { neutral, value })
      } else throw new Error('?')
    }
  }


  class Environment extends U.ValidatedArray {
    constructor () {
      super(Value);
    }
  }

  class Type {
    constructor (value) {
      if (U.testExtendedCtor(value, Value)) {
        Object.assign(this, { value })
      } else throw new Error('?')
    }
  }

  class NameTypePair extends U.ValidatedPair {
    constructor () {
      super(Name, Type)
    }
  }

  class Context extends U.ValidatedArray {
    constructor () {
      super(NameTypePair)
    }
  }

  class NameValuePair extends U.ValidatedPair {
    constructor () {
      super(Name, Value)
    }
  }

  class NameEnvironment extends U.ValidatedArray {
    constructor () {
      super(NameValuePair)
    }
  }

  return {
    InferrableTerm, Annotated, Star, Pi, Bound, Free, Apply,
    CheckableTerm, Inferred, Lambda,
    Name, Global, Local, Quote,

    Value, VLambda, VStar, VPi, VNeutral,

    Neutral, NFree, NApply,

    Environment,

    Type,
    NameTypePair, Context,
    NameValuePair, NameEnvironment
  }
})();


if (typeof module !== 'undefined') module.exports = AST
