'use strict';

var TC = (() => {
  let U = this.U, AST = this.AST;
  if (typeof module !== 'undefined') {
    U = require('./Utilities.js');
    AST = require('./AbstractSyntaxTree.js')
  }


  function vfree (name) {
    if (U.testExtendedCtor(name, AST.Name)) {
      return new AST.VNeutral(new AST.NFree(name));
    } else throw new Error('?')
  }

  function boundenv (value) {
    if (U.testExtendedCtor(value, AST.Value)) {
      return new AST.Signature().setValue(new AST.Global(''), new AST.Type(value))
    } else throw new Error('?')
  }

  function inferEvaluate (inferrableTerm, environment, context) {
    if (U.testExtendedCtor(inferrableTerm, AST.InferrableTerm) && U.testCtor(environment, Environment) && U.testCtor(context, Context)) {
      let value;
      switch (inferrableTerm.constructor) {
        case AST.Annotated:
        value = checkEvaluate(inferrableTerm.checkableTerm1, environment, context)
        break;

        case AST.Star:
        value = new AST.VStar()
        break;

        case AST.Pi:
        value = new AST.VPi(
          checkEvaluate(inferrableTerm.checkableTerm1, environment, context),
          x => checkEvaluate(inferrableTerm.checkableTerm2, environment.cons(boundenv(x)), context))
        break;

        case AST.Bound:
        console.log('int', inferrableTerm.int)
        value = environment.getValue(inferrableTerm.int).second().value
        break;

        case AST.Free:
        let maybeValue = context.lookupWith(inferrableTerm.name, AST.Definition);
        switch (maybeValue.constructor) {
          case maybeValue.Nothing:
          value = vfree(inferrableTerm.name);
          break;

          case maybeValue.Just:
          value = maybeValue.value
        }
        break;

        case AST.Apply:
        value = vapply(
          inferEvaluate(inferrableTerm.inferrableTerm, environment, context),
          checkEvaluate(inferrableTerm.checkableTerm, environment, context))
        break;

        default: throw new Error('?')
      }
      if (U.testExtendedCtor(value, AST.Value)) return value;
      else throw new Error('?')
    } else throw new Error('?')
  }

  function vapply (value1, value2) {
    if (U.testExtendedCtor(value1, AST.Value) && U.testExtendedCtor(value2, AST.Value)) {
      let value;
      switch (value1.constructor) {
        case AST.VLambda:
        value = value1.func(value2);
        break;

        case AST.VNeutral:
        value = new AST.VNeutral(new AST.NApply(value1.neutral, value2));
        break;

        default: throw new Error('?')
      }
      if (U.testExtendedCtor(value, AST.Value)) return value;
      else throw new Error('?')
    } else throw new Error('?')
  }

  function checkEvaluate (checkableTerm, environment, context) {
    if (U.testExtendedCtor(checkableTerm, AST.CheckableTerm) && U.testCtor(environment, Environment) && U.testCtor(context, Context)) {
      let value;
      switch (checkableTerm.constructor) {
        case AST.Inferred:
        value = inferEvaluate(checkableTerm.inferrableTerm, environment, context)
        break;

        case AST.Lambda:
        value = new AST.VLambda(x => checkEvaluate(checkableTerm.checkableTerm, environment.cons(boundenv(x)), context))
        break;

        default: throw new Error('?')
      }
      if (U.testExtendedCtor(value, AST.Value)) return value;
      else throw new Error('?')
    } else throw new Error('?')
  }


  function initialInferType (context, inferrableTerm) {
    return inferType(0, context, inferrableTerm)
  }

  function inferType (int, context, inferrableTerm) {
    if (U.testInteger(int) && U.testCtor(context, Context) && U.testExtendedCtor(inferrableTerm, AST.InferrableTerm)) return Promise.resolve().then(() => {
      switch (inferrableTerm.constructor) {
        case AST.Annotated:
        return checkType(int, context, inferrableTerm.checkableTerm2, new AST.VStar())
          .then(() => {
            let type = checkEvaluate(inferrableTerm.checkableTerm2, new Environment(), context);
            return checkType(int, context, inferrableTerm.checkableTerm1, type)
              .then(() => new AST.Type(type))
          });

        case AST.Star:
        return new AST.Type(new AST.VStar());

        case AST.Pi:
        return checkType(int, context, inferrableTerm.checkableTerm1, new AST.VStar())
          .then(() => {
            let type = checkEvaluate(inferrableTerm.checkableTerm1, new Environment(), context);
            return checkType(int + 1, context.cons(new AST.Signature().setValue(new AST.Local(int), new AST.Type(type))),
              checkSubstitution(0, new AST.Free(new AST.Local(int)), inferrableTerm.checkableTerm2), new AST.VStar())
              .then(() => new AST.Type(new AST.VStar()));
          })

        case AST.Free:
        let maybeType = context.lookupWith(inferrableTerm.name, AST.Signature);
        switch (maybeType.constructor) {
          case maybeType.Just:
          return maybeType.value;

          case maybeType.Nothing:
          throw new Error('Unknown identifier');

          default: throw new Error('?')
        }

        case AST.Apply:
        return inferType(int, context, inferrableTerm.inferrableTerm)
          .then(res => {
            switch (res.value.constructor) {
              case AST.VPi:
              let {value, func} = res.value;
              return checkType(int, context, inferrableTerm.checkableTerm, value)
                .then(() => new AST.Type(func(checkEvaluate(inferrableTerm.checkableTerm, new Environment(), context))));

              default:
              throw new Error('Illegal application')
            }
          })

        default: throw new Error('?')
      }
    }).then(res => {
      if (U.testCtor(res, AST.Type)) return res;
      else throw new Error('?')
    });
    else return Promise.reject('?')
  }

  function checkType(int, context, checkableTerm, type) {
    if (U.testInteger(int) && U.testCtor(context, Context) && U.testExtendedCtor(checkableTerm, AST.CheckableTerm) && U.testExtendedCtor(type, AST.Value)) {
      switch (checkableTerm.constructor) {
        case AST.Inferred:
        return inferType(int, context, checkableTerm.inferrableTerm).then(res => {
          if (!initialQuote(res.value).equal(initialQuote(type))) throw new Error('Type mismatch')
        });

        case AST.Lambda:
        if (U.testCtor(type, AST.VPi)) return checkType(int + 1, context.cons(new AST.Signature().setValue(new AST.Local(int), new AST.Type(type.value))),
          checkSubstitution(0, new AST.Free(new AST.Local(int)), checkableTerm.checkableTerm), type.func(vfree(new AST.Local(int))));
        else throw new Error('Type mismatch')

        default: throw new Error('Type mismatch')
      }
    } else throw new Error('?')
  }


  function inferSubstitution (int, inferrableTerm1, inferrableTerm2) {
    if (U.testInteger(int) && U.testExtendedCtor(inferrableTerm1, AST.InferrableTerm) && U.testExtendedCtor(inferrableTerm2, AST.InferrableTerm)) {
      let inferrableTerm;
      switch (inferrableTerm2.constructor) {
        case AST.Annotated:
        inferrableTerm = new AST.Annotated(
          checkSubstitution(int, inferrableTerm1, inferrableTerm2.checkableTerm1),
          checkSubstitution(int, inferrableTerm1, inferrableTerm2.checkableTerm2));
        break;

        case AST.Star:
        inferrableTerm = inferrableTerm2
        break;

        case AST.Pi:
        inferrableTerm = new AST.Pi(
          checkSubstitution(int, inferrableTerm1, inferrableTerm2.checkableTerm1),
          checkSubstitution(int + 1, inferrableTerm1, inferrableTerm2.checkableTerm2))
        break;

        case AST.Bound:
        inferrableTerm = int == inferrableTerm2.int ? inferrableTerm1 : inferrableTerm2;
        break;

        case AST.Free:
        inferrableTerm = inferrableTerm2;
        break;

        case AST.Apply:
        inferrableTerm = new AST.Apply(
          inferSubstitution(int, inferrableTerm1, inferrableTerm2.inferrableTerm),
          checkSubstitution(int, inferrableTerm1, inferrableTerm2.checkableTerm))
        break;

        default: throw new Error('?')
      }
      if (U.testExtendedCtor(inferrableTerm, AST.InferrableTerm)) return inferrableTerm;
      else throw new Error('?')
    } else throw new Error('?')
  }

  function checkSubstitution (int, inferrableTerm, checkableTerm) {
    if (U.testInteger(int) && U.testExtendedCtor(inferrableTerm, AST.InferrableTerm) && U.testExtendedCtor(checkableTerm, AST.CheckableTerm)) {
      let checkTerm;
      switch (checkableTerm.constructor) {
        case AST.Inferred:
        checkTerm = new AST.Inferred(inferSubstitution(int, inferrableTerm, checkableTerm.inferrableTerm));
        break;

        case AST.Lambda:
        checkTerm = new AST.Lambda(checkSubstitution(int + 1, inferrableTerm, checkableTerm.checkableTerm));
        break;

        default: throw new Error('?')
      }
      if (U.testExtendedCtor(checkTerm, AST.CheckableTerm)) return checkTerm;
      else throw new Error('?')
    } else throw new Error('?')
  }


  function initialQuote (value) {
    return quote(0, value)
  }

  function quote (int, value) {
    if (U.testInteger(int) && U.testExtendedCtor(value, AST.Value)) {
      let checkableTerm;
      switch (value.constructor) {
        case AST.VLambda:
        checkableTerm = new AST.Lambda(quote(int + 1, value.func(vfree(new AST.Quote(int)))));
        break;

        case AST.VStar:
        checkableTerm = new AST.Inferred(new AST.Star());
        break;

        case AST.VPi:
        checkableTerm = new AST.Inferred(new AST.Pi(quote(int, value.value), quote(int + 1, value.func(vfree(new AST.Quote(int))))));
        break;

        case AST.VNeutral:
        checkableTerm = new AST.Inferred(neutralQuote(int, value.neutral));
        break;

        default: throw new Error('?')
      }
      if (U.testExtendedCtor(checkableTerm, AST.CheckableTerm)) return checkableTerm;
      else throw new Error('?')
    } else throw new Error('?')
  }

  function neutralQuote (int, neutral) {
    if (U.testInteger(int) && U.testExtendedCtor(neutral, AST.Neutral)) {
      let inferrableTerm;
      switch (neutral.constructor) {
        case AST.NFree:
        inferrableTerm = boundfree(int, neutral.name);
        break;

        case AST.NApply:
        inferrableTerm = new AST.Apply(neutralQuote(int, neutral.neutral), quote(int, neutral.value));
        break;

        default: throw new Error('?')
      }
      if (U.testExtendedCtor(inferrableTerm, AST.InferrableTerm)) return inferrableTerm;
      else throw new Error('?')
    } else throw new Error('?')
  }


  function boundfree (int, name) {
    if (U.testInteger(int) && U.testExtendedCtor(name, AST.Name)) {
      let inferrableTerm;
      switch (name.constructor) {
        case AST.Quote:
        inferrableTerm = new AST.Bound(int - name.int - 1);
        break;

        default:
        inferrableTerm = new AST.Free(name)
      }
      if (U.testExtendedCtor(inferrableTerm, AST.InferrableTerm)) return inferrableTerm;
      else throw new Error('?')
    } else throw new Error('?')
  }


  class Context extends U.ValidatedArray { // TODO: globals Int
    constructor () {
      super(AST.Declaration);
      this.globals = 0;
      let sv = this.setValue;
      this.setValue = (value, i) => {
        let rhs = value.second(), str = (U.testCtor(rhs, AST.Type) ? TC.initialQuote(rhs.value) : TC.initialQuote(rhs)).show();
        console.log('@Context.setValue', `'${str}'`, i);
        console.log('...length', this.length);
        return sv.bind(this)(value, i)
      }
    }
  }


  class Environment extends U.ValidatedArray {
    constructor () {
      super(AST.Declaration);
      let sv = this.setValue;
      this.setValue = (value, i) => {
        let rhs = value.second(), str = (U.testCtor(rhs, AST.Type) ? TC.initialQuote(rhs.value) : TC.initialQuote(rhs)).show();
        console.log('@Environment.setValue', `'${str}'`, i);
        console.log('...length', this.length);
        return sv.bind(this)(value, i)
      }
    }
  }


  return { inferEvaluate, initialInferType, initialQuote, Context, Environment }
})();


if (typeof module !== 'undefined') module.exports = TC
