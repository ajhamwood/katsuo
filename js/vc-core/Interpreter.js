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

  class State {
    constructor (ctx, nameEnv) {
      if (U.testCtor(ctx, AST.Context) && U.testCtor(nameEnv, AST.NameEnvironment)) {
        Object.assign(this, { ctx, nameEnv })
      } else throw '?'
    }
  }

  function check (state, string, expr) {
    return TC.initialInferType(state.ctx, state.nameEnv, expr).then(type =>
      ({type, value: TC.inferEvaluate(expr, new AST.Environment(), state.nameEnv)}))
  }

  function evaluate (text, state, debug) {
    return P.parse(L.tokenise(text, debug), debug).then(int => int.reduce((a, stmt) => {
      switch (stmt.constructor) {
        case P.Assume:
        return a.then(val => check(state, stmt.string, new AST.Annotated(stmt.type, new AST.Inferred(new AST.Star())))
          .then(result => {
            state.ctx.setValue(new AST.NameTypePair().setValue(new AST.Global(stmt.string), new AST.Type(result.value)));
            console.log('In context: ' + stmt.string + ' : ' + PP.print(TC.initialQuote(result.value)));
            return val
          }));

        case P.Eval:
        return a.then(val => check(state, stmt.lhs, stmt.rhs)
          .then(result => {
            let type = TC.initialQuote(result.type.value), string = stmt.lhs;
            state.ctx.setValue(new AST.NameTypePair().setValue(new AST.Global(string), result.type));
            state.nameEnv.setValue(new AST.NameValuePair().setValue(new AST.Global(string), result.value));
            let ret = (string === 'it' ? PP.print(TC.initialQuote(result.value)) :  string) + ' : ' + PP.print(type);
            if (string !== 'it') console.log('In context: ' + ret);
            val.push(ret);
            return val
          }))
      }
      return a
    }, Promise.resolve([]))).catch(e => {console.log(e); return [e]})
  }

  return { evaluate, State }
})();


if (typeof module !== 'undefined') module.exports = I
