/**
 * NovaScript Parser
 * Turns tokens into an Abstract Syntax Tree (AST)
 */

import { TokenType } from './Lexer.js';

export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  parse() {
    const program = { type: 'Program', body: [] };
    while (!this._isAtEnd()) {
      const stmt = this._parseStatement();
      if (stmt) program.body.push(stmt);
    }
    return program;
  }

  // ─── UTILITIES ─────────────────────────────────
  _current() { return this.tokens[this.pos]; }
  _isAtEnd() { return this._current().type === TokenType.EOF; }

  _advance() {
    const tok = this.tokens[this.pos];
    this.pos++;
    return tok;
  }

  _expect(type, value = null) {
    const tok = this._current();
    if (tok.type !== type || (value !== null && tok.value !== value)) {
      throw new Error(
        `[NovaScript] Expected ${type}${value ? ` '${value}'` : ''} but got ${tok.type} '${tok.value}' at line ${tok.line}:${tok.col}`
      );
    }
    return this._advance();
  }

  _match(type, value = null) {
    const tok = this._current();
    if (tok.type === type && (value === null || tok.value === value)) {
      return this._advance();
    }
    return null;
  }

  _check(type, value = null) {
    const tok = this._current();
    return tok.type === type && (value === null || tok.value === value);
  }

  // ─── STATEMENTS ────────────────────────────────
  _parseStatement() {
    const tok = this._current();

    if (tok.type === TokenType.KEYWORD) {
      switch (tok.value) {
        case 'entity':    return this._parseEntity();
        case 'fn':        return this._parseFunction();
        case 'var':
        case 'let':
        case 'const':     return this._parseVarDecl();
        case 'if':        return this._parseIf();
        case 'while':     return this._parseWhile();
        case 'for':       return this._parseFor();
        case 'return':    return this._parseReturn();
        case 'import':    return this._parseImport();
        case 'print':     return this._parsePrint();
        case 'spawn':     return this._parseSpawn();
        case 'destroy':   return this._parseDestroy();
        case 'emit':      return this._parseEmit();
        case 'scene':     return this._parseSceneSwitch();
        case 'break':     this._advance(); this._match(TokenType.SEMICOLON); return { type: 'Break' };
        case 'continue':  this._advance(); this._match(TokenType.SEMICOLON); return { type: 'Continue' };
      }
    }

    // Expression statement
    const expr = this._parseExpression();
    this._match(TokenType.SEMICOLON);
    return { type: 'ExpressionStatement', expression: expr };
  }

  _parseEntity() {
    this._expect(TokenType.KEYWORD, 'entity');
    const name = this._expect(TokenType.IDENTIFIER).value;

    let parent = null;
    if (this._match(TokenType.KEYWORD, 'extends')) {
      parent = this._expect(TokenType.IDENTIFIER).value;
    }

    this._expect(TokenType.LBRACE);
    const members = [];
    while (!this._check(TokenType.RBRACE) && !this._isAtEnd()) {
      if (this._check(TokenType.KEYWORD, 'fn')) {
        members.push(this._parseFunction());
      } else if (this._check(TokenType.KEYWORD, 'var') || this._check(TokenType.KEYWORD, 'let')) {
        members.push(this._parseVarDecl());
      } else {
        members.push(this._parseStatement());
      }
    }
    this._expect(TokenType.RBRACE);

    return { type: 'EntityDeclaration', name, parent, members };
  }

  _parseFunction() {
    this._expect(TokenType.KEYWORD, 'fn');
    const name = this._expect(TokenType.IDENTIFIER).value;
    this._expect(TokenType.LPAREN);

    const params = [];
    while (!this._check(TokenType.RPAREN)) {
      const pName = this._expect(TokenType.IDENTIFIER).value;
      let pType = null;
      if (this._match(TokenType.COLON)) {
        pType = this._expect(TokenType.KEYWORD).value;
      }
      params.push({ name: pName, type: pType });
      if (!this._check(TokenType.RPAREN)) this._expect(TokenType.COMMA);
    }
    this._expect(TokenType.RPAREN);

    let returnType = null;
    if (this._match(TokenType.COLON)) {
      returnType = this._advance().value;
    }

    const body = this._parseBlock();
    return { type: 'FunctionDeclaration', name, params, returnType, body };
  }

  _parseVarDecl() {
    const kind = this._advance().value; // var, let, const
    const name = this._expect(TokenType.IDENTIFIER).value;

    let varType = null;
    if (this._match(TokenType.COLON)) {
      varType = this._advance().value;
    }

    let init = null;
    if (this._match(TokenType.ASSIGN)) {
      init = this._parseExpression();
    }

    this._match(TokenType.SEMICOLON);
    return { type: 'VarDeclaration', kind, name, varType, init };
  }

  _parseIf() {
    this._expect(TokenType.KEYWORD, 'if');
    this._expect(TokenType.LPAREN);
    const condition = this._parseExpression();
    this._expect(TokenType.RPAREN);
    const consequent = this._parseBlock();

    let alternate = null;
    if (this._match(TokenType.KEYWORD, 'else')) {
      if (this._check(TokenType.KEYWORD, 'if')) {
        alternate = this._parseIf();
      } else {
        alternate = this._parseBlock();
      }
    }

    return { type: 'IfStatement', condition, consequent, alternate };
  }

  _parseWhile() {
    this._expect(TokenType.KEYWORD, 'while');
    this._expect(TokenType.LPAREN);
    const condition = this._parseExpression();
    this._expect(TokenType.RPAREN);
    const body = this._parseBlock();
    return { type: 'WhileStatement', condition, body };
  }

  _parseFor() {
    this._expect(TokenType.KEYWORD, 'for');
    this._expect(TokenType.LPAREN);
    const init = this._parseVarDecl();
    const condition = this._parseExpression();
    this._expect(TokenType.SEMICOLON);
    const update = this._parseExpression();
    this._expect(TokenType.RPAREN);
    const body = this._parseBlock();
    return { type: 'ForStatement', init, condition, update, body };
  }

  _parseReturn() {
    this._expect(TokenType.KEYWORD, 'return');
    let value = null;
    if (!this._check(TokenType.SEMICOLON) && !this._check(TokenType.RBRACE)) {
      value = this._parseExpression();
    }
    this._match(TokenType.SEMICOLON);
    return { type: 'ReturnStatement', value };
  }

  _parseImport() {
    this._expect(TokenType.KEYWORD, 'import');
    const name = this._expect(TokenType.IDENTIFIER).value;
    this._expect(TokenType.KEYWORD, 'from');
    const path = this._expect(TokenType.STRING).value;
    this._match(TokenType.SEMICOLON);
    return { type: 'ImportStatement', name, path };
  }

  _parsePrint() {
    this._expect(TokenType.KEYWORD, 'print');
    this._expect(TokenType.LPAREN);
    const value = this._parseExpression();
    this._expect(TokenType.RPAREN);
    this._match(TokenType.SEMICOLON);
    return { type: 'PrintStatement', value };
  }

  _parseSpawn() {
    this._expect(TokenType.KEYWORD, 'spawn');
    const entityName = this._expect(TokenType.IDENTIFIER).value;
    let args = {};
    if (this._match(TokenType.LBRACE)) {
      while (!this._check(TokenType.RBRACE)) {
        const key = this._expect(TokenType.IDENTIFIER).value;
        this._expect(TokenType.COLON);
        const value = this._parseExpression();
        args[key] = value;
        this._match(TokenType.COMMA);
      }
      this._expect(TokenType.RBRACE);
    }
    this._match(TokenType.SEMICOLON);
    return { type: 'SpawnStatement', entityName, args };
  }

  _parseDestroy() {
    this._expect(TokenType.KEYWORD, 'destroy');
    this._expect(TokenType.LPAREN);
    const target = this._parseExpression();
    this._expect(TokenType.RPAREN);
    this._match(TokenType.SEMICOLON);
    return { type: 'DestroyStatement', target };
  }

  _parseEmit() {
    this._expect(TokenType.KEYWORD, 'emit');
    const effectName = this._expect(TokenType.STRING).value;
    let position = null;
    if (this._match(TokenType.KEYWORD, 'at')) {
      position = this._parseExpression();
    }
    this._match(TokenType.SEMICOLON);
    return { type: 'EmitStatement', effectName, position };
  }

  _parseSceneSwitch() {
    this._expect(TokenType.KEYWORD, 'scene');
    this._expect(TokenType.DOT);
    const method = this._expect(TokenType.IDENTIFIER).value;
    this._expect(TokenType.LPAREN);
    const arg = this._parseExpression();
    this._expect(TokenType.RPAREN);
    this._match(TokenType.SEMICOLON);
    return { type: 'SceneStatement', method, arg };
  }

  _parseBlock() {
    this._expect(TokenType.LBRACE);
    const statements = [];
    while (!this._check(TokenType.RBRACE) && !this._isAtEnd()) {
      const stmt = this._parseStatement();
      if (stmt) statements.push(stmt);
    }
    this._expect(TokenType.RBRACE);
    return { type: 'Block', statements };
  }

  // ─── EXPRESSIONS ───────────────────────────────
  _parseExpression() {
    return this._parseAssignment();
  }

  _parseAssignment() {
    const left = this._parseOr();
    if (this._match(TokenType.ASSIGN)) return { type: 'Assignment', left, right: this._parseAssignment() };
    if (this._match(TokenType.PLUS_ASSIGN)) return { type: 'Assignment', left, right: { type: 'Binary', op: '+', left, right: this._parseAssignment() } };
    if (this._match(TokenType.MINUS_ASSIGN)) return { type: 'Assignment', left, right: { type: 'Binary', op: '-', left, right: this._parseAssignment() } };
    if (this._match(TokenType.STAR_ASSIGN)) return { type: 'Assignment', left, right: { type: 'Binary', op: '*', left, right: this._parseAssignment() } };
    if (this._match(TokenType.SLASH_ASSIGN)) return { type: 'Assignment', left, right: { type: 'Binary', op: '/', left, right: this._parseAssignment() } };
    return left;
  }

  _parseOr() {
    let left = this._parseAnd();
    while (this._match(TokenType.OR)) {
      left = { type: 'Binary', op: '||', left, right: this._parseAnd() };
    }
    return left;
  }

  _parseAnd() {
    let left = this._parseEquality();
    while (this._match(TokenType.AND)) {
      left = { type: 'Binary', op: '&&', left, right: this._parseEquality() };
    }
    return left;
  }

  _parseEquality() {
    let left = this._parseComparison();
    while (this._check(TokenType.EQUALS) || this._check(TokenType.NOT_EQUALS)) {
      const op = this._advance().value;
      left = { type: 'Binary', op, left, right: this._parseComparison() };
    }
    return left;
  }

  _parseComparison() {
    let left = this._parseAdditive();
    while (this._check(TokenType.LESS) || this._check(TokenType.GREATER) || this._check(TokenType.LESS_EQ) || this._check(TokenType.GREATER_EQ)) {
      const op = this._advance().value;
      left = { type: 'Binary', op, left, right: this._parseAdditive() };
    }
    return left;
  }

  _parseAdditive() {
    let left = this._parseMultiplicative();
    while (this._check(TokenType.PLUS) || this._check(TokenType.MINUS)) {
      const op = this._advance().value;
      left = { type: 'Binary', op, left, right: this._parseMultiplicative() };
    }
    return left;
  }

  _parseMultiplicative() {
    let left = this._parseUnary();
    while (this._check(TokenType.STAR) || this._check(TokenType.SLASH) || this._check(TokenType.PERCENT)) {
      const op = this._advance().value;
      left = { type: 'Binary', op, left, right: this._parseUnary() };
    }
    return left;
  }

  _parseUnary() {
    if (this._match(TokenType.MINUS)) return { type: 'Unary', op: '-', operand: this._parseUnary() };
    if (this._match(TokenType.NOT)) return { type: 'Unary', op: '!', operand: this._parseUnary() };
    return this._parsePostfix();
  }

  _parsePostfix() {
    let expr = this._parsePrimary();

    while (true) {
      if (this._match(TokenType.DOT)) {
        const prop = this._expect(TokenType.IDENTIFIER).value;
        expr = { type: 'MemberAccess', object: expr, property: prop };
      } else if (this._match(TokenType.LPAREN)) {
        const args = [];
        while (!this._check(TokenType.RPAREN)) {
          args.push(this._parseExpression());
          if (!this._check(TokenType.RPAREN)) this._expect(TokenType.COMMA);
        }
        this._expect(TokenType.RPAREN);
        expr = { type: 'FunctionCall', callee: expr, args };
      } else if (this._match(TokenType.LBRACKET)) {
        const index = this._parseExpression();
        this._expect(TokenType.RBRACKET);
        expr = { type: 'IndexAccess', object: expr, index };
      } else if (this._match(TokenType.INCREMENT)) {
        expr = { type: 'PostfixOp', op: '++', operand: expr };
      } else if (this._match(TokenType.DECREMENT)) {
        expr = { type: 'PostfixOp', op: '--', operand: expr };
      } else break;
    }

    return expr;
  }

  _parsePrimary() {
    const tok = this._current();

    if (tok.type === TokenType.NUMBER) { this._advance(); return { type: 'NumberLiteral', value: tok.value }; }
    if (tok.type === TokenType.STRING) { this._advance(); return { type: 'StringLiteral', value: tok.value }; }
    if (tok.type === TokenType.BOOLEAN) { this._advance(); return { type: 'BooleanLiteral', value: tok.value }; }
    if (tok.type === TokenType.NULL) { this._advance(); return { type: 'NullLiteral' }; }

    if (tok.type === TokenType.KEYWORD && tok.value === 'this') {
      this._advance(); return { type: 'ThisExpression' };
    }
    if (tok.type === TokenType.KEYWORD && tok.value === 'new') {
      this._advance();
      const className = this._expect(TokenType.IDENTIFIER).value;
      this._expect(TokenType.LPAREN);
      const args = [];
      while (!this._check(TokenType.RPAREN)) {
        args.push(this._parseExpression());
        if (!this._check(TokenType.RPAREN)) this._expect(TokenType.COMMA);
      }
      this._expect(TokenType.RPAREN);
      return { type: 'NewExpression', className, args };
    }

    if (tok.type === TokenType.IDENTIFIER) {
      this._advance(); return { type: 'Identifier', name: tok.value };
    }

    if (this._match(TokenType.LPAREN)) {
      const expr = this._parseExpression();
      this._expect(TokenType.RPAREN);
      return expr;
    }

    if (this._match(TokenType.LBRACKET)) {
      const elements = [];
      while (!this._check(TokenType.RBRACKET)) {
        elements.push(this._parseExpression());
        this._match(TokenType.COMMA);
      }
      this._expect(TokenType.RBRACKET);
      return { type: 'ArrayLiteral', elements };
    }

    throw new Error(`[NovaScript] Unexpected token ${tok.type} '${tok.value}' at line ${tok.line}:${tok.col}`);
  }
}
