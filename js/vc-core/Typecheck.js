'use strict';

var TC = (() => {
  let U = this.U, AST = this.AST;
  if (typeof module !== 'undefined') {
    U = require('./Utilities.js');
    AST = require('./AbstractSyntaxTree.js')
  }


  function typecheckTerm (ctx, term, index = 0, type) { // returns AST.Type
    if (U.testCtor(ctx, Context) && U.testExtendedCtor(term, AST.Term) && U.testInteger(index)) return Promise.resolve().then(() => {
      switch (term.constructor) {
        case AST.TypeLevel:
        return new AST.Type(new AST.VType(term.level + 1))

        case AST.Ann:
        return typecheckTerm(ctx, term.term2, index, new AST.VType(0))
          .then(() => {
            let type = evalTerm(ctx, term.term2);
            return typecheckTerm(ctx, term.term1, index, type)
              .then(() => new AST.Type(type))
          })

        case AST.Pi:
        return typecheckTerm(ctx, term.term1, index, new AST.VType(0))
          .then(() => {
            let type = evalTerm(ctx, term.term1);
            return typecheckTerm(ctx.cons(new AST.Signature().setValue(new AST.Local(index), new AST.Type(type)), true),
              substTerm(new AST.FreeVar(new AST.Local(index)), term.term2, 0), index + 1, new AST.VType(0))
              .then(() => new AST.Type(new AST.VType(0)))
          })

        case AST.Lam:
        if (U.testExtendedCtor(type, AST.Value)) {
          if (U.testCtor(type, AST.VPi)) return typecheckTerm(ctx.cons(new AST.Signature().setValue(new AST.Local(index), new AST.Type(type.value)), true),
            substTerm(new AST.FreeVar(new AST.Local(index)), term.term, 0), index + 1, type.func(vfree(new AST.Local(index))));
          else throw new Error('Type mismatch')
        } else throw new Error('Lambda must be annotated')


        case AST.App:
        return typecheckTerm(ctx, term.term1, index)
          .then(res => {
            if (U.testCtor(res.value, AST.VPi)) {
              let {value, func} = res.value;
              return typecheckTerm(ctx, term.term2, index, value)
                .then(() => new AST.Type(func(evalTerm(ctx, term.term2))))
            } else throw new Error('Illegal application')
          })

        case AST.FreeVar:
        let maybeType = ctx.lookupWith(term.name, AST.Signature);
        switch (maybeType.constructor) {
          case maybeType.Just: return maybeType.value;
          case maybeType.Nothing: throw new Error('Unknown identifier');
          default: throw new Error('Broken Maybe')
        }

        default: throw new Error('Bad term argument (infer)')
      }
    }).then(res => {
      if (U.testCtor(res, AST.Type)) return res;
      else throw new Error('Bad result (infer)')
    });
    else return Promise.reject(new Error('Bad arguments (infer)'))
  }

  function evalTerm (ctx, term) { // returns AST.Value
    if (U.testCtor(ctx, Context) && U.testExtendedCtor(term, AST.Term)) {
      let value;
      switch (term.constructor) {
        case AST.TypeLevel:
        value = new AST.VType(term.level);
        break;

        case AST.Ann:
        value = evalTerm(ctx, term.term1);
        break;

        case AST.Pi:
        value = new AST.VPi(evalTerm(ctx, term.term1), x => evalTerm(ctx.cons(boundenv(x), false), term.term2));
        break;

        case AST.Lam:
        value = new AST.VLambda(x => evalTerm(ctx.cons(boundenv(x), false), term.term));
        break;

        case AST.App:
        value = vapply(evalTerm(ctx, term.term1), evalTerm(ctx, term.term2));
        break;

        case AST.BoundVar:
        value = ctx.getValue(ctx.globals + term.distance).second().value;
        break;

        case AST.FreeVar:
        let maybeValue = ctx.lookupWith(term.name, AST.Definition);
        switch (maybeValue.constructor) {
          case maybeValue.Just:
          value = maybeValue.value;
          break;

          case maybeValue.Nothing:
          value = vfree(term.name);
          break;

          default: throw new Error('Broken Maybe')
        }
        break;

        default: throw new Error('Bad term argument (eval)')
      }
      if (U.testExtendedCtor(value, AST.Value)) return value;
      else throw new Error('Bad result (eval)')
    } else throw new Error('Bad arguments (eval)')
  }

  function substTerm (term1, term2, index) { // returns AST.Term
    if (U.testExtendedCtor(term1, AST.Term) && U.testExtendedCtor(term2, AST.Term) && U.testInteger(index)) {
      let term;
      switch (term2.constructor) {
        case AST.TypeLevel:
        term = term2;
        break;

        case AST.Ann:
        term = new AST.Ann(substTerm(term1, term2.term1, index), substTerm(term1, term2.term2, index));
        break;

        case AST.Pi:
        term = new AST.Pi(substTerm(term1, term2.term1, index), substTerm(term1, term2.term2, index + 1));
        break;

        case AST.Lam:
        term = new AST.Lam(substTerm(term1, term2.term, index + 1));
        break;

        case AST.App:
        term = new AST.Apply(substTerm(term1, term2.term1, index), substTerm(term1, term2.term2, index));
        break;

        case AST.BoundVar:
        term = index === term2.distance ? term1 : term2;
        break;

        case AST.FreeVar:
        term = term2;
        break;

        default: throw new Error('Bad term argument (subst)')
      }
      if (U.testExtendedCtor(term, AST.Term)) return term;
      else throw new Error('Bad result (subst)')
    } else throw new Error('Bad arguments (subst)')
  }

  function vfree (name) { // returns AST.Value
    if (U.testExtendedCtor(name, AST.Name)) {
      return new AST.VNeutral(new AST.NFree(name));
    } else throw new Error('Bad argument (vfree)')
  }

  function boundenv (value) { // returns AST.Declaration
    if (U.testExtendedCtor(value, AST.Value)) {
      return new AST.Signature().setValue(new AST.Global(''), new AST.Type(value))
    } else throw new Error('Bad argument (boundenv)')
  }

  function vapply (value1, value2) { // returns AST.Value
    if (U.testExtendedCtor(value1, AST.Value) && U.testExtendedCtor(value2, AST.Value)) {
      let value;
      switch (value1.constructor) {
        case AST.VLambda:
        value = value1.func(value2);
        break;

        case AST.VNeutral:
        value = new AST.VNeutral(new AST.NApply(value1.neutral, value2));
        break;

        default: throw new Error('Bad apply value argument (vapply)')
      }
      if (U.testExtendedCtor(value, AST.Value)) return value;
      else throw new Error('Bad result (vapply)')
    } else throw new Error('Bad arguments (vapply)')
  }


  function quote (value, index = 0) { // returns AST.Term
    if (U.testInteger(index) && U.testExtendedCtor(value, AST.Value)) {
      let term;
      switch (value.constructor) {
        case AST.VType:
        term = new AST.TypeLevel(0);
        break;

        case AST.VPi:
        term = new AST.Pi(quote(value.value, index), quote(value.func(vfree(new AST.Quote(index))), index + 1));
        break;

        case AST.VLambda:
        term = new AST.Lambda(quote(value.func(vfree(new AST.Quote(index))), index + 1));
        break;

        case AST.VNeutral:
        term = neutralQuote(value.neutral, index);
        break;

        default: throw new Error('Bad value argument (quote)')
      }
      if (U.testExtendedCtor(term, AST.Term)) return term;
      else throw new Error('Bad result (quote)')
    } else throw new Error('Bad arguments (quote)')
  }

  function neutralQuote (neutral, index) { // returns AST.Term
    if (U.testExtendedCtor(neutral, AST.Neutral) && U.testInteger(index)) {
      let term;
      switch (neutral.constructor) {
        case AST.NFree:
        term = boundfree(neutral.name, index);
        break;

        case AST.NApply:
        term = new AST.Apply(neutralQuote(neutral.neutral, index), quote(neutral.value, index));
        break;

        default: throw new Error('Bad neutral argument (neutralQuote)')
      }
      if (U.testExtendedCtor(term, AST.Term)) return term;
      else throw new Error('Bad result (neutralQuote)')
    } else throw new Error('Bad arguments (neutralQuote)')
  }

  function boundfree (name, index) { // returns AST.Term
    if (U.testExtendedCtor(name, AST.Name) && U.testInteger(index)) {
      let term;
      switch (name.constructor) {
        case AST.Quote:
        term = new AST.BoundVar(index - name.index - 1);
        break;

        default:
        term = new AST.FreeVar(name)
      }
      if (U.testExtendedCtor(term, AST.Term)) return term;
      else throw new Error('?')
    } else throw new Error('?')
  }


  class Context extends U.ValidatedArray {
    constructor () {
      super(AST.Declaration);
      this.globals = 0;
      let { cons } = this;
      this.cons = (value, isGlobal) => {
        let res = cons.bind(this)(value);
        res.globals = this.globals + isGlobal;
        return res
      }
    }
  }

  return { typecheckTerm, evalTerm, quote, Context }
})();


if (typeof module !== 'undefined') module.exports = TC
