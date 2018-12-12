'use strict';

var TC = (() => {
  let U = this.U, AST = this.AST, PP = this.PP;
  if (typeof module !== 'undefined') {
    U = require('./Utilities.js');
    AST = require('./AbstractSyntaxTree.js');
    PP = require('./Printer.js')
  }

  function typecheckEntries (ctx, entries) {
    return entries.reduce((acc, entry) => acc
      .then(arr => typecheckEntry(ctx, entry)
        .then(res => arr.concat(res))), Promise.resolve([]))
  }

  function typecheckEntry (ctx, entry) {
    if (U.testExtendedCtor(entry, AST.Entry)) return Promise.resolve().then(() => {
      let name, maybeType;
      switch(entry.constructor) {
        case AST.TypeSig:
        name = new AST.Global(entry.first());
        maybeType = ctx.lookupWith(name, AST.Signature);
        switch (maybeType.constructor) {
          case maybeType.Just: throw new Error(`'${entry.first()}' already typed (${PP.print(quote(maybeType.value.value))})`);

          case maybeType.Nothing: return checkType(ctx, entry.second(), new AST.VTypeLevel(0)).then(type => { // Cumulative U not correct
            let value = evalTerm(ctx, entry.second());
            console.log('In context: ' + entry.first() + ' : ' + PP.print(quote(value)));
            ctx.push(new AST.Signature(name, new AST.Type(value)), true);
            return []
          });

          default: throw new Error('Broken lookup')
        }

        case AST.TermDef:
        name = new AST.Global(entry.first());
        let maybeValue = ctx.lookupWith(name, AST.Definition);
        switch (maybeValue.constructor) {
          case maybeValue.Just:
          if (entry.first() !== 'it') throw new Error(`'${entry.first()}' already defined (${PP.print(quote(maybeValue.value))})`)

          case maybeValue.Nothing:
          maybeType = ctx.lookupWith(name, AST.Signature);
          switch (maybeType.constructor) {
            case maybeType.Just:
            if (entry.first() !== 'it') return checkType(ctx, entry.second(), maybeType.value.value).then(type => {
              // TODO: occurs check, recursive definitions
              let value = evalTerm(ctx, entry.second())
              ctx.push(new AST.Definition(name, value), true);
              let ret = name.string + ' : ' + PP.print(quote(maybeType.value.value));
              console.log('In context: ' + ret);
              return [ret]
            }).catch(e => { console.log(e); throw new Error(e.message +
              `\nwhen checking term ${entry.second().show()}\nagainst type ${quote(maybeType.value).show()}`) })

            case maybeType.Nothing: return inferType(ctx, entry.second()).then(type => {
              let value = evalTerm(ctx, entry.second())
              ctx.push(new AST.Signature(name, type), true)
                 .push(new AST.Definition(name, value), true);
              let ret = (entry.first() === 'it' ? PP.print(quote(value)) : entry.first()) +
                ' : ' + PP.print(quote(type.value));
              if (entry.first() !== 'it') console.log('In context: ' + ret);
              return [ret]
            })

            default: throw new Error('Broken lookup')
          }

          default: throw new Error('Broken lookup')
        }

        case AST.DataCon:

        default: throw new Error('Bad declaration argument (typecheckEntry)')
      }
    });
    else Promise.reject(new Error('Bad argument (typecheckEntry)'))
  }

  function inferType (ctx, term, index = 0) { // returns AST.Type
    // TODO: equate/whnf, separate infer and check again
    if (U.testCtor(ctx, Context) && U.testExtendedCtor(term, AST.Term) && U.testInteger(index)) return Promise.resolve().then(() => {
      switch (term.constructor) {
        case AST.TypeLevel:
        return new AST.Type(new AST.VTypeLevel(term.level + 1))

        case AST.Ann:
        return checkType(ctx, term.term2, new AST.VTypeLevel(0), index)
          .then(() => {
            let type = evalTerm(ctx, term.term2);
            return checkType(ctx, term.term1, type, index)
              .then(() => new AST.Type(type))
          })

        case AST.Pi:
        return checkType(ctx, term.term1, new AST.VTypeLevel(0), index)
          .then(() => {
            let type = evalTerm(ctx, term.term1);
            return checkType(
              ctx.cons(new AST.Signature(new AST.Local(index), new AST.Type(type)), true),
              substTerm(new AST.FreeVar(new AST.Local(index)), term.term2, 0), new AST.VTypeLevel(0), index + 1)
              .then(() => new AST.Type(new AST.VTypeLevel(0)))
          })

        case AST.App:
        return inferType(ctx, term.term1, index)
          .then(res => {
            if (U.testCtor(res.value, AST.VPi)) {
              let {value, func} = res.value;
              return checkType(ctx, term.term2, value, index)
                .then(() => new AST.Type(func(evalTerm(ctx, term.term2))))
            } else throw new Error('Illegal application')
          })

        case AST.FreeVar:
        let maybeType = ctx.lookupWith(term.name, AST.Signature);
        switch (maybeType.constructor) {
          case maybeType.Just: return maybeType.value;
          case maybeType.Nothing: throw new Error(`Unknown identifier: ${term.name.string}`);
          default: throw new Error('Broken lookup')
        }

        default: throw new Error('Bad term argument (inferType)')
      }
    }).then(res => {
      if (U.testCtor(res, AST.Type)) return res;
      else throw new Error('Bad result (inferType)')
    });
    else throw new Error('Bad arguments (inferType)')
  }

  function checkType (ctx, term, type, index = 0) { // returns AST.Type
    if (U.testCtor(ctx, Context) && U.testExtendedCtor(term, AST.Term) &&
      U.testExtendedCtor(type, AST.Value) && U.testInteger(index)) return Promise.resolve().then(() => {
      switch (term.constructor) {
        case AST.Lam:
        if (U.testCtor(type, AST.VPi)) {
          return checkType(
            ctx.cons(new AST.Signature(new AST.Local(index), new AST.Type(type.value)), true),
            substTerm(new AST.FreeVar(new AST.Local(index)), term.term, 0), type.func(vfree(new AST.Local(index))), index + 1)
        } else throw new Error(`Lambda has Pi type, not ${type.constructor.name}`)

        default: return inferType(ctx, term, index).then(res => {
          if (!quote(res.value).equal(quote(type))) throw new Error('Type mismatch')
          else return new AST.Type(type)
        });
      }
    });
    else return Promise.reject(new Error('Bad arguments (checkType)'))
  }

  function evalTerm (ctx, term) { // returns AST.Value
    if (U.testCtor(ctx, Context) && U.testExtendedCtor(term, AST.Term)) {
      let value;
      switch (term.constructor) {
        case AST.TypeLevel:
        value = new AST.VTypeLevel(term.level);
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
        value = ctx.getValue(term.distance).second().value;
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

          default: throw new Error('Broken lookup')
        }
        break;

        default: throw new Error('Bad term argument (evalTerm)')
      }
      if (U.testExtendedCtor(value, AST.Value)) return value;
      else throw new Error('Bad result (evalTerm)')
    } else throw new Error('Bad arguments (evalTerm)')
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

        default: throw new Error('Bad term argument (substTerm)')
      }
      if (U.testExtendedCtor(term, AST.Term)) return term;
      else throw new Error('Bad result (substTerm)')
    } else throw new Error('Bad arguments (substTerm)')
  }

  function vfree (name) { // returns AST.Value
    if (U.testExtendedCtor(name, AST.Name)) {
      return new AST.VNeutral(new AST.NFree(name));
    } else throw new Error('Bad argument (vfree)')
  }

  function boundenv (value) { // returns AST.Declaration
    if (U.testExtendedCtor(value, AST.Value)) {
      return new AST.Signature(new AST.Global(''), new AST.Type(value))
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
        case AST.VTypeLevel:
        term = new AST.TypeLevel(value.level);
        break;

        case AST.VPi:
        term = new AST.Pi(quote(value.value, index), quote(value.func(vfree(new AST.Quote(index))), index + 1));
        break;

        case AST.VLambda:
        term = new AST.Lam(quote(value.func(vfree(new AST.Quote(index))), index + 1));
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
      else throw new Error('Bad result (boundfree)')
    } else throw new Error('Bad arguments (boundfree)')
  }


  class Context extends U.ValidatedArray {
    constructor () {
      super(AST.Declaration);
      this.globals = 0;
      let { cons, push } = this;
      [cons, push].forEach(m => this[m.name] = (value, isGlobal) => {
        let res = m.bind(this)(value);
        res.globals = this.globals + isGlobal;
        return res
      })
    }
  }

  return { typecheckEntries, evalTerm, quote, Context }
})();


if (typeof module !== 'undefined') module.exports = TC
