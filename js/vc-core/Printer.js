'use strict';

var PP = (() => {
  let U = this.U, AST = this.AST;
  if (typeof module !== 'undefined') {
    U = require('./Utilities.js');
    AST = require('./AbstractSyntaxTree.js')
  }

  function vars (i) {
    let letters = 'xyzabcdefghijklmnopqrstuvw'.split('')
    return letters[i % 26].repeat(Math.ceil(++i / 26))
  }

  function parensIf (bool, string) {
    return bool ? `(${string})` : string
  }

  function nestedLambda (rhs, int2) {
    if (U.testCtor(rhs, AST.Lam)) return nestedLambda(rhs.term, int2 + 1);
    else return Array(int2).fill(0).reduce((a, _, i) => a += vars(i) + ', ', '').slice(0, -2) + ' => ' + print(rhs, 0, int2)
  }

  function nestedPi (rhs, binds, int2) {
    if (U.testCtor(rhs, AST.Pi)) {
      binds.unshift({b: int2, t: rhs.term1});
      return nestedPi(rhs.term2, binds, int2 + 1)
    } else return binds.reduceRight((a, {b, t}) => a += parensIf(true, vars(b) + ' : ' + print(t, 1, b)) + ', ', '').slice(0, -2) + ' ==> ' + print(rhs, 0, int2)
  }

  function print (term, int1 = 0, int2 = 0) {
    if (U.testExtendedCtor(term, AST.Term) && U.testInteger(int1) && U.testInteger(int2)) {
      switch (term.constructor) {
        case AST.TypeLevel:
        return 'Type' + (term.level ? term.level : '')

        case AST.Ann:
        return parensIf(int1 > 1, print(2, int2, term.term1) + ' : ' + print(0, int2, term.term2))

        case AST.Pi:
        if (U.testCtor(term.term2, AST.Pi)) {
          return parensIf(int1 > 0, nestedPi(term.term2.term2, [{b: int2 + 1, t: term.term2.term1}, {b: int2, t: term.term1}], int2 + 2))
        } else return parensIf(true, vars(int2) + ' : ' + print(term.term1, 0, int2) + ' ==> ' + print(term.term2, 0, int2 + 1))

        case AST.Lam:
        if (U.testCtor(term.term, AST.Lam)) return parensIf(int1 > 0, nestedLambda(term.term.term, int2 + 2));
        else return parensIf(int1 > 0, vars(int2) + ' => ' + print(term.term, 0, int2 + 1))

        case AST.App:
        return parensIf(int1 > 1, print(term.term1, 2, int2) + ' ' + print(term.term2, 3, int2))

        case AST.BoundVar:
        return vars(int2 - term.distance - 1)

        case AST.FreeVar:
        if (U.testCtor(term.name, AST.Global)) return term.name.string

        default: throw new Error('Bad term argument (print)')
      }
    } else throw new Error('Bad arguments (print)')
  }

  return { print }
})();


if (typeof module !== 'undefined') module.exports = PP
