// ============================================================================
//  customIndicatorEngine.js — Özel İndikatör DSL Motoru
//  Güvenli formül parser ve hesaplama (eval kullanmaz)
// ============================================================================

import { calculateSMA, calculateEMA, calculateRSI, calculateATR } from './indicatorService';

// ============================================================================
//  Token Türleri
// ============================================================================

const TokenType = {
  NUMBER: 'NUMBER',
  IDENTIFIER: 'IDENTIFIER',
  OPERATOR: 'OPERATOR',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  COMMA: 'COMMA',
  EOF: 'EOF',
};

// ============================================================================
//  Tokenizer (Lexer)
// ============================================================================

function tokenize(expression) {
  const tokens = [];
  let i = 0;
  const len = expression.length;

  while (i < len) {
    const ch = expression[i];

    // Boşluk atla
    if (/\s/.test(ch)) { i++; continue; }

    // Sayı
    if (/\d/.test(ch) || (ch === '.' && i + 1 < len && /\d/.test(expression[i + 1]))) {
      let num = '';
      while (i < len && (/\d/.test(expression[i]) || expression[i] === '.')) {
        num += expression[i++];
      }
      tokens.push({ type: TokenType.NUMBER, value: parseFloat(num) });
      continue;
    }

    // Tanımlayıcı (fonksiyon/değişken adı)
    if (/[a-zA-Z_]/.test(ch)) {
      let id = '';
      while (i < len && /[a-zA-Z0-9_]/.test(expression[i])) {
        id += expression[i++];
      }
      tokens.push({ type: TokenType.IDENTIFIER, value: id });
      continue;
    }

    // Operatörler
    if ('+-*/'.includes(ch)) {
      tokens.push({ type: TokenType.OPERATOR, value: ch });
      i++;
      continue;
    }

    // Parantezler
    if (ch === '(') { tokens.push({ type: TokenType.LPAREN }); i++; continue; }
    if (ch === ')') { tokens.push({ type: TokenType.RPAREN }); i++; continue; }
    if (ch === ',') { tokens.push({ type: TokenType.COMMA }); i++; continue; }

    throw new Error(`Geçersiz karakter: '${ch}' (pozisyon ${i})`);
  }

  tokens.push({ type: TokenType.EOF });
  return tokens;
}

// ============================================================================
//  Parser (Recursive Descent)
// ============================================================================

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() { return this.tokens[this.pos]; }
  advance() { return this.tokens[this.pos++]; }

  expect(type) {
    const t = this.advance();
    if (t.type !== type) throw new Error(`Beklenen: ${type}, Bulunan: ${t.type}`);
    return t;
  }

  parse() {
    const ast = this.expression();
    this.expect(TokenType.EOF);
    return ast;
  }

  // expression = term (('+' | '-') term)*
  expression() {
    let left = this.term();
    while (this.peek().type === TokenType.OPERATOR && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.advance().value;
      const right = this.term();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  // term = factor (('*' | '/') factor)*
  term() {
    let left = this.unary();
    while (this.peek().type === TokenType.OPERATOR && (this.peek().value === '*' || this.peek().value === '/')) {
      const op = this.advance().value;
      const right = this.unary();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  // unary = '-' unary | factor
  unary() {
    if (this.peek().type === TokenType.OPERATOR && this.peek().value === '-') {
      this.advance();
      const operand = this.unary();
      return { type: 'unary', op: '-', operand };
    }
    return this.factor();
  }

  // factor = NUMBER | IDENTIFIER | IDENTIFIER '(' args ')' | '(' expression ')'
  factor() {
    const tok = this.peek();

    if (tok.type === TokenType.NUMBER) {
      this.advance();
      return { type: 'number', value: tok.value };
    }

    if (tok.type === TokenType.IDENTIFIER) {
      this.advance();
      // Fonksiyon çağrısı mı?
      if (this.peek().type === TokenType.LPAREN) {
        this.advance(); // (
        const args = [];
        if (this.peek().type !== TokenType.RPAREN) {
          args.push(this.expression());
          while (this.peek().type === TokenType.COMMA) {
            this.advance();
            args.push(this.expression());
          }
        }
        this.expect(TokenType.RPAREN);
        return { type: 'call', name: tok.value.toUpperCase(), args };
      }
      // Değişken
      return { type: 'variable', name: tok.value.toLowerCase() };
    }

    if (tok.type === TokenType.LPAREN) {
      this.advance();
      const expr = this.expression();
      this.expect(TokenType.RPAREN);
      return expr;
    }

    throw new Error(`Beklenmeyen token: ${tok.type} (${tok.value ?? ''})`);
  }
}

// ============================================================================
//  Evaluator — AST'yi mum verileri üzerinde değerlendirir
// ============================================================================

const VARIABLE_MAP = {
  open: (candles) => candles.map(c => c.open),
  high: (candles) => candles.map(c => c.high),
  low: (candles) => candles.map(c => c.low),
  close: (candles) => candles.map(c => c.close),
  volume: (candles) => candles.map(c => c.volume),
  hl2: (candles) => candles.map(c => (c.high + c.low) / 2),
  hlc3: (candles) => candles.map(c => (c.high + c.low + c.close) / 3),
  ohlc4: (candles) => candles.map(c => (c.open + c.high + c.low + c.close) / 4),
};

/**
 * AST düğümünü değerlendirir.
 * @param {object} node — AST düğümü
 * @param {Array} candles — Mum verileri
 * @returns {Array<number|null>} — Her mum için hesaplanan değer
 */
function evaluate(node, candles) {
  const n = candles.length;

  switch (node.type) {
    case 'number': {
      return new Array(n).fill(node.value);
    }

    case 'variable': {
      const getter = VARIABLE_MAP[node.name];
      if (!getter) throw new Error(`Bilinmeyen değişken: ${node.name}`);
      return getter(candles);
    }

    case 'binary': {
      const left = evaluate(node.left, candles);
      const right = evaluate(node.right, candles);
      return left.map((l, i) => {
        if (l === null || right[i] === null) return null;
        switch (node.op) {
          case '+': return l + right[i];
          case '-': return l - right[i];
          case '*': return l * right[i];
          case '/': return right[i] !== 0 ? l / right[i] : null;
          default: return null;
        }
      });
    }

    case 'unary': {
      const operand = evaluate(node.operand, candles);
      return operand.map(v => v === null ? null : -v);
    }

    case 'call': {
      return evaluateFunction(node.name, node.args, candles);
    }

    default:
      throw new Error(`Bilinmeyen AST düğümü: ${node.type}`);
  }
}

/**
 * Fonksiyon çağrısını değerlendirir.
 */
function evaluateFunction(name, args, candles) {
  switch (name) {
    case 'SMA': {
      if (args.length !== 2) throw new Error('SMA(series, period) — 2 parametre gerekli');
      const series = evaluate(args[0], candles);
      const period = evaluate(args[1], candles)[0]; // Period sabit sayı olmalı
      return calculateSMA(series, Math.round(period));
    }

    case 'EMA': {
      if (args.length !== 2) throw new Error('EMA(series, period) — 2 parametre gerekli');
      const series = evaluate(args[0], candles);
      const period = evaluate(args[1], candles)[0];
      const pseudoCandles = series.map(v => ({ close: v ?? 0 }));
      return calculateEMA(pseudoCandles, Math.round(period));
    }

    case 'RSI': {
      if (args.length !== 1) throw new Error('RSI(period) — 1 parametre gerekli');
      const period = evaluate(args[0], candles)[0];
      return calculateRSI(candles, Math.round(period));
    }

    case 'ATR': {
      if (args.length !== 1) throw new Error('ATR(period) — 1 parametre gerekli');
      const period = evaluate(args[0], candles)[0];
      return calculateATR(candles, Math.round(period));
    }

    case 'STDEV': {
      if (args.length !== 2) throw new Error('STDEV(series, period) — 2 parametre gerekli');
      const series = evaluate(args[0], candles);
      const period = evaluate(args[1], candles)[0];
      const p = Math.round(period);
      const result = new Array(series.length).fill(null);
      for (let i = p - 1; i < series.length; i++) {
        let sum = 0;
        for (let j = i - p + 1; j <= i; j++) sum += (series[j] ?? 0);
        const mean = sum / p;
        let sqSum = 0;
        for (let j = i - p + 1; j <= i; j++) sqSum += Math.pow((series[j] ?? 0) - mean, 2);
        result[i] = Math.sqrt(sqSum / p);
      }
      return result;
    }

    case 'MAX': {
      if (args.length !== 2) throw new Error('MAX(series, period) — 2 parametre gerekli');
      const series = evaluate(args[0], candles);
      const period = evaluate(args[1], candles)[0];
      const p = Math.round(period);
      const result = new Array(series.length).fill(null);
      for (let i = p - 1; i < series.length; i++) {
        let max = -Infinity;
        for (let j = i - p + 1; j <= i; j++) {
          if (series[j] !== null && series[j] > max) max = series[j];
        }
        result[i] = max === -Infinity ? null : max;
      }
      return result;
    }

    case 'MIN': {
      if (args.length !== 2) throw new Error('MIN(series, period) — 2 parametre gerekli');
      const series = evaluate(args[0], candles);
      const period = evaluate(args[1], candles)[0];
      const p = Math.round(period);
      const result = new Array(series.length).fill(null);
      for (let i = p - 1; i < series.length; i++) {
        let min = Infinity;
        for (let j = i - p + 1; j <= i; j++) {
          if (series[j] !== null && series[j] < min) min = series[j];
        }
        result[i] = min === Infinity ? null : min;
      }
      return result;
    }

    case 'ABS': {
      if (args.length !== 1) throw new Error('ABS(value) — 1 parametre gerekli');
      const series = evaluate(args[0], candles);
      return series.map(v => v === null ? null : Math.abs(v));
    }

    case 'VWAP': {
      if (args.length !== 0) throw new Error('VWAP() — parametre almaz');
      // Inline VWAP calculation
      let cumTPV = 0, cumVol = 0;
      return candles.map(c => {
        const tp = (c.high + c.low + c.close) / 3;
        cumTPV += tp * c.volume;
        cumVol += c.volume;
        return cumVol > 0 ? cumTPV / cumVol : null;
      });
    }

    default:
      throw new Error(`Bilinmeyen fonksiyon: ${name}(). Desteklenen: SMA, EMA, RSI, ATR, STDEV, MAX, MIN, ABS`);
  }
}

// ============================================================================
//  DIŞA AKTARMA
// ============================================================================

/**
 * Özel indikatör formülünü doğrular.
 * @param {string} expression — Formül
 * @returns {{ valid: boolean, error: string|null }}
 */
export const validateFormula = (expression) => {
  try {
    if (!expression || expression.trim().length === 0) {
      return { valid: false, error: 'Formül boş olamaz.' };
    }
    const tokens = tokenize(expression);
    const parser = new Parser(tokens);
    parser.parse();
    return { valid: true, error: null };
  } catch (err) {
    return { valid: false, error: err.message };
  }
};

/**
 * Özel indikatör formülünü hesaplar.
 * @param {string} expression — Formül (örn: "SMA(close, 20) + 2 * ATR(14)")
 * @param {Array} candles — Mum verileri
 * @returns {Array<number|null>} — Hesaplanan değerler
 */
export const computeCustomIndicator = (expression, candles) => {
  const tokens = tokenize(expression);
  const parser = new Parser(tokens);
  const ast = parser.parse();
  return evaluate(ast, candles);
};

/**
 * Desteklenen fonksiyonların listesi (UI yardım paneli için)
 */
export const SUPPORTED_FUNCTIONS = [
  { name: 'SMA', syntax: 'SMA(series, period)', desc: 'Basit Hareketli Ortalama' },
  { name: 'EMA', syntax: 'EMA(series, period)', desc: 'Üssel Hareketli Ortalama' },
  { name: 'RSI', syntax: 'RSI(period)', desc: 'Göreceli Güç Endeksi' },
  { name: 'ATR', syntax: 'ATR(period)', desc: 'Ortalama Gerçek Aralık' },
  { name: 'STDEV', syntax: 'STDEV(series, period)', desc: 'Standart Sapma' },
  { name: 'MAX', syntax: 'MAX(series, period)', desc: 'Periyottaki Maksimum' },
  { name: 'MIN', syntax: 'MIN(series, period)', desc: 'Periyottaki Minimum' },
  { name: 'ABS', syntax: 'ABS(value)', desc: 'Mutlak Değer' },
];

export const SUPPORTED_VARIABLES = [
  { name: 'open', desc: 'Açılış fiyatı' },
  { name: 'high', desc: 'En yüksek fiyat' },
  { name: 'low', desc: 'En düşük fiyat' },
  { name: 'close', desc: 'Kapanış fiyatı' },
  { name: 'volume', desc: 'İşlem hacmi' },
  { name: 'hl2', desc: '(High + Low) / 2' },
  { name: 'hlc3', desc: '(High + Low + Close) / 3' },
  { name: 'ohlc4', desc: '(Open + High + Low + Close) / 4' },
];
