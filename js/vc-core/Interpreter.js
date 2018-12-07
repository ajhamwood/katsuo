'use strict';

var I = (() => {
  let U = this.U, AST = this.AST, L = this.L, P = this.P, PP = this.PP, TC = this.TC;
  if (typeof module !== 'undefined') {
    U = require('./Utilities.js');
    AST = require('./AbstractSyntaxTree.js');
    L = require('./Lexer.js');
    P = require('./Parser.js');
    PP = require('./Printer.js')
    TC = require('./Typecheck.js')
  }

  function check (context, expr) {
    return TC.initialInferType(context, expr).then(type =>
      ({type, value: TC.inferEvaluate(expr, new TC.Environment(), context)}))
  }

  function evaluate (text, context, debug) {
    return P.parse(L.tokenise(text, debug), debug).then(int => int.reduce((acc, stmt) => {
      switch (stmt.constructor) {
        case P.SigHint:
        return acc.then(val => check(context, new AST.Annotated(stmt.second(), new AST.Inferred(new AST.Star())))
          .then(result => {
            context.setValue(new AST.Signature().setValue(new AST.Global(stmt.first()), new AST.Type(result.value)));
            console.log('In context: ' + stmt.first() + ' : ' + PP.print(TC.initialQuote(result.value)));
            return val
          }));

        case P.DefHint:
        return acc.then(val => check(context, stmt.second())
          .then(result => {
            context.setValue(new AST.Signature().setValue(new AST.Global(stmt.first()), result.type));
            context.setValue(new AST.Definition().setValue(new AST.Global(stmt.first()), result.value));
            let ret = (stmt.first() === 'it' ? PP.print(TC.initialQuote(result.value)) : stmt.first()) +
              ' : ' + PP.print(TC.initialQuote(result.type.value));
            if (stmt.first() !== 'it') console.log('In context: ' + ret);
            val.push(ret);
            return val
          }))

        default: throw new Error('?')
      }
    }, Promise.resolve([]))).catch(e => [e])
  }

  return { evaluate }
})();


if (typeof module !== 'undefined') module.exports = I
