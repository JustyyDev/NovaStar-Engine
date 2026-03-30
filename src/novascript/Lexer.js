/**
 * NovaScript Lexer
 * Tokenizer for the NovaStar scripting language
 *
 * NovaScript syntax is a hybrid of C++, C#, and JavaScript:
 *
 *   entity Player {
 *     var speed: float = 5.0;
 *     var health: int = 100;
 *
 *     fn onUpdate(dt: float) {
 *       let move = Input.getMovement();
 *       this.position.x += move.x * speed * dt;
 *       if (Input.isActionJustPressed("jump") && this.isGrounded) {
 *         this.velocity.y = 12.0;
 *         Audio.play("jump");
 *         Particles.jumpEffect(this.position);
 *       }
 *     }
 *
 *     fn onCollision(other: Entity) {
 *       if (other.tag == "coin") {
 *         Score.add(10);
 *         other.destroy();
 *       }
 *     }
 *   }
 */

export const TokenType = {
  // Literals
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  BOOLEAN: 'BOOLEAN',
  NULL: 'NULL',

  // Identifiers & keywords
  IDENTIFIER: 'IDENTIFIER',
  KEYWORD: 'KEYWORD',

  // Operators
  PLUS: 'PLUS',           // +
  MINUS: 'MINUS',         // -
  STAR: 'STAR',           // *
  SLASH: 'SLASH',         // /
  PERCENT: 'PERCENT',     // %
  ASSIGN: 'ASSIGN',       // =
  EQUALS: 'EQUALS',       // ==
  NOT_EQUALS: 'NOT_EQUALS', // !=
  LESS: 'LESS',           // <
  GREATER: 'GREATER',     // >
  LESS_EQ: 'LESS_EQ',     // <=
  GREATER_EQ: 'GREATER_EQ', // >=
  AND: 'AND',             // &&
  OR: 'OR',               // ||
  NOT: 'NOT',             // !
  PLUS_ASSIGN: 'PLUS_ASSIGN',   // +=
  MINUS_ASSIGN: 'MINUS_ASSIGN', // -=
  STAR_ASSIGN: 'STAR_ASSIGN',   // *=
  SLASH_ASSIGN: 'SLASH_ASSIGN', // /=
  INCREMENT: 'INCREMENT', // ++
  DECREMENT: 'DECREMENT', // --
  ARROW: 'ARROW',         // =>
  DOT: 'DOT',             // .

  // Delimiters
  LPAREN: 'LPAREN',       // (
  RPAREN: 'RPAREN',       // )
  LBRACE: 'LBRACE',       // {
  RBRACE: 'RBRACE',       // }
  LBRACKET: 'LBRACKET',   // [
  RBRACKET: 'RBRACKET',   // ]
  COMMA: 'COMMA',         // ,
  COLON: 'COLON',         // :
  SEMICOLON: 'SEMICOLON', // ;

  // Special
  EOF: 'EOF',
  NEWLINE: 'NEWLINE',
};

const KEYWORDS = new Set([
  // Core language
  'entity', 'component', 'fn', 'var', 'let', 'const',
  'if', 'else', 'while', 'for', 'foreach', 'in', 'return', 'break', 'continue',
  'true', 'false', 'null', 'this', 'new', 'import', 'from', 'export', 'as',
  'class', 'extends', 'super', 'static', 'public', 'private', 'protected',
  'async', 'await', 'yield', 'try', 'catch', 'throw', 'finally',
  'switch', 'case', 'default', 'enum', 'interface', 'type', 'typeof', 'instanceof',

  // Types
  'int', 'float', 'double', 'string', 'bool', 'void', 'any', 'array', 'map',
  'vec2', 'vec3', 'vec4', 'color', 'rect', 'transform',

  // Game engine keywords
  'spawn', 'destroy', 'emit', 'print', 'scene', 'prefab', 'signal',
  'onReady', 'onUpdate', 'onFixedUpdate', 'onDraw', 'onCollision',
  'onTriggerEnter', 'onTriggerExit', 'onDestroy',

  // 2D specific
  'sprite', 'tilemap', 'layer', 'animation', 'collider', 'rigidbody',

  // 3D specific
  'mesh', 'material', 'light', 'camera',

  // Modifiers
  'export', 'readonly', 'override', 'abstract', 'virtual',
]);

export class Token {
  constructor(type, value, line, col) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.col = col;
  }

  toString() {
    return `Token(${this.type}, ${JSON.stringify(this.value)}, L${this.line}:${this.col})`;
  }
}


export class Lexer {
  constructor(source) {
    this.source = source;
    this.pos = 0;
    this.line = 1;
    this.col = 1;
    this.tokens = [];
  }

  tokenize() {
    while (this.pos < this.source.length) {
      this._skipWhitespace();
      if (this.pos >= this.source.length) break;

      const ch = this.source[this.pos];

      // Comments
      if (ch === '/' && this.source[this.pos + 1] === '/') {
        this._skipLineComment();
        continue;
      }
      if (ch === '/' && this.source[this.pos + 1] === '*') {
        this._skipBlockComment();
        continue;
      }

      // Numbers
      if (this._isDigit(ch) || (ch === '.' && this._isDigit(this.source[this.pos + 1]))) {
        this.tokens.push(this._readNumber());
        continue;
      }

      // Strings
      if (ch === '"' || ch === "'") {
        this.tokens.push(this._readString());
        continue;
      }

      // Identifiers / Keywords
      if (this._isAlpha(ch) || ch === '_') {
        this.tokens.push(this._readIdentifier());
        continue;
      }

      // Operators & delimiters
      const op = this._readOperator();
      if (op) {
        this.tokens.push(op);
        continue;
      }

      // Newlines
      if (ch === '\n') {
        this.line++; this.col = 1; this.pos++;
        continue;
      }

      throw new Error(`[NovaScript] Unexpected character '${ch}' at line ${this.line}:${this.col}`);
    }

    this.tokens.push(new Token(TokenType.EOF, null, this.line, this.col));
    return this.tokens;
  }

  _advance() {
    const ch = this.source[this.pos];
    this.pos++;
    this.col++;
    return ch;
  }

  _peek(offset = 0) {
    return this.source[this.pos + offset];
  }

  _skipWhitespace() {
    while (this.pos < this.source.length) {
      const ch = this.source[this.pos];
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        this.pos++; this.col++;
      } else if (ch === '\n') {
        break; // Let newlines be handled in main loop
      } else break;
    }
  }

  _skipLineComment() {
    while (this.pos < this.source.length && this.source[this.pos] !== '\n') this.pos++;
  }

  _skipBlockComment() {
    this.pos += 2; // skip /*
    while (this.pos < this.source.length - 1) {
      if (this.source[this.pos] === '\n') { this.line++; this.col = 0; }
      if (this.source[this.pos] === '*' && this.source[this.pos + 1] === '/') {
        this.pos += 2; this.col += 2;
        return;
      }
      this.pos++; this.col++;
    }
  }

  _isDigit(ch) { return ch >= '0' && ch <= '9'; }
  _isAlpha(ch) { return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'; }
  _isAlphaNum(ch) { return this._isAlpha(ch) || this._isDigit(ch); }

  _readNumber() {
    const startCol = this.col;
    let num = '';
    let isFloat = false;
    while (this.pos < this.source.length && (this._isDigit(this.source[this.pos]) || this.source[this.pos] === '.')) {
      if (this.source[this.pos] === '.') {
        if (isFloat) break;
        isFloat = true;
      }
      num += this._advance();
    }
    return new Token(TokenType.NUMBER, isFloat ? parseFloat(num) : parseInt(num), this.line, startCol);
  }

  _readString() {
    const startCol = this.col;
    const quote = this._advance();
    let str = '';
    while (this.pos < this.source.length && this.source[this.pos] !== quote) {
      if (this.source[this.pos] === '\\') {
        this._advance();
        const esc = this._advance();
        switch (esc) {
          case 'n': str += '\n'; break;
          case 't': str += '\t'; break;
          case '\\': str += '\\'; break;
          default: str += esc;
        }
      } else {
        str += this._advance();
      }
    }
    if (this.pos < this.source.length) this._advance(); // closing quote
    return new Token(TokenType.STRING, str, this.line, startCol);
  }

  _readIdentifier() {
    const startCol = this.col;
    let id = '';
    while (this.pos < this.source.length && this._isAlphaNum(this.source[this.pos])) {
      id += this._advance();
    }

    if (id === 'true') return new Token(TokenType.BOOLEAN, true, this.line, startCol);
    if (id === 'false') return new Token(TokenType.BOOLEAN, false, this.line, startCol);
    if (id === 'null') return new Token(TokenType.NULL, null, this.line, startCol);

    if (KEYWORDS.has(id)) {
      return new Token(TokenType.KEYWORD, id, this.line, startCol);
    }

    return new Token(TokenType.IDENTIFIER, id, this.line, startCol);
  }

  _readOperator() {
    const startCol = this.col;
    const ch = this.source[this.pos];
    const next = this.source[this.pos + 1];

    // Two-character operators
    const twoChar = ch + (next || '');
    const twoCharMap = {
      '==': TokenType.EQUALS, '!=': TokenType.NOT_EQUALS,
      '<=': TokenType.LESS_EQ, '>=': TokenType.GREATER_EQ,
      '&&': TokenType.AND, '||': TokenType.OR,
      '+=': TokenType.PLUS_ASSIGN, '-=': TokenType.MINUS_ASSIGN,
      '*=': TokenType.STAR_ASSIGN, '/=': TokenType.SLASH_ASSIGN,
      '++': TokenType.INCREMENT, '--': TokenType.DECREMENT,
      '=>': TokenType.ARROW,
    };
    if (twoCharMap[twoChar]) {
      this._advance(); this._advance();
      return new Token(twoCharMap[twoChar], twoChar, this.line, startCol);
    }

    // Single-character operators
    const oneCharMap = {
      '+': TokenType.PLUS, '-': TokenType.MINUS,
      '*': TokenType.STAR, '/': TokenType.SLASH, '%': TokenType.PERCENT,
      '=': TokenType.ASSIGN, '<': TokenType.LESS, '>': TokenType.GREATER,
      '!': TokenType.NOT, '.': TokenType.DOT,
      '(': TokenType.LPAREN, ')': TokenType.RPAREN,
      '{': TokenType.LBRACE, '}': TokenType.RBRACE,
      '[': TokenType.LBRACKET, ']': TokenType.RBRACKET,
      ',': TokenType.COMMA, ':': TokenType.COLON, ';': TokenType.SEMICOLON,
    };
    if (oneCharMap[ch]) {
      this._advance();
      return new Token(oneCharMap[ch], ch, this.line, startCol);
    }

    return null;
  }
}
