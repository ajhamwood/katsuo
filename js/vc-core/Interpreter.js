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

  function evaluate (text, context, debug) {
    return P.parse(L.tokenise(text, debug), debug)
      .then(entries => TC.typecheckEntries(context, entries))
      .catch(e => [e])
  }

  return { evaluate }
})();


if (typeof module !== 'undefined') module.exports = I
