'use strict';
const { Minimatch } = require('minimatch');

/**
 * @typedef {object} GlobOptions
 * @property {boolean} [dot]
 * @property {boolean} [nocase]
 * @property {boolean} [nobrace]
 * @property {boolean} [noextglob]
 * @property {boolean} [noglobstar]
 * @property {boolean} [nonegate]
 * @property {boolean} [matchBase]
 * @property {boolean} [basename]
 * @property {boolean} [contains]
 * @property {boolean} [windows]
 * @property {boolean} [posix]
 * @property {boolean} [returnIndex] Owned by anymatch, not the underlying predicate.
 * @property {string|string[]} [ignore]
 */
const BOOLEAN_OPTIONS = new Set(['dot', 'nocase', 'nobrace', 'noextglob', 'noglobstar', 'nonegate', 'matchBase', 'basename', 'contains', 'windows', 'posix', 'returnIndex']);
const MAX_PATTERN = 1024;
const MAX_INPUT = 4096;
const MAX_PATTERNS = 256;
const MAX_TOTAL_PATTERN = 8192;

/** @param {unknown} value @returns {asserts value is string} */
function validatePattern(value) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError('A nonempty glob string is required');
  if (value.length > MAX_PATTERN) throw new RangeError('Glob pattern exceeds its length limit');
  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '\\') { i++; continue; }
    if ('([{'.includes(value[i])) {
      if (++depth > 8) throw new RangeError('Glob nesting exceeds its limit');
    } else if (')]}'.includes(value[i])) depth = Math.max(0, depth - 1);
  }
}

/** @param {unknown} value @returns {GlobOptions} */
function validateOptions(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError('Glob options must be an object');
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'ignore') continue;
    if (!BOOLEAN_OPTIONS.has(key) || (entry !== undefined && typeof entry !== 'boolean')) throw new TypeError(`Unsupported glob option: ${key}`);
  }
  return value;
}

/** @param {string} pattern @param {boolean} [nonegate] */
function unwrap(pattern, nonegate = false, noextglob = false) {
  let offset = 0;
  if (!nonegate) while (pattern[offset] === '!' && (noextglob || pattern[offset + 1] !== '(')) offset++;
  const negated = offset % 2 === 1;
  const start = offset;
  if (pattern.slice(offset, offset + 2) === './') offset += 2;
  return { pattern: pattern.slice(offset), prefix: pattern.slice(0, offset), negated, start };
}

/** Convert bare glob alternatives into extglobs, without generating regexes.
 * @param {string} pattern @param {GlobOptions} options */
function normalizeGroups(pattern, options) {
  let output = '';
  let bracket = 0;
  /** @type {boolean[]} */ const literal = [];
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === '\\') { output += char + (pattern[++i] ?? ''); continue; }
    if (char === '[') bracket++;
    if (char === ']') bracket = Math.max(0, bracket - 1);
    if (!bracket && char === '(') {
      const ext = i > 0 && '!?+*@'.includes(pattern[i - 1]);
      const escaped = Boolean(ext && options.noextglob);
      literal.push(escaped);
      output += escaped ? '\\(' : ext ? '(' : '@(';
    } else if (!bracket && char === ')' && literal.length) {
      output += literal.pop() ? '\\)' : ')';
    } else output += char;
  }
  return output;
}

/** @param {GlobOptions} options @returns {import('minimatch').MinimatchOptions} */
function baseOptions(options) {
  return { dot: options.dot, nocase: options.nocase, nobrace: options.nobrace,
    noglobstar: options.noglobstar, nonegate: true, nocomment: true,
    matchBase: options.matchBase ?? options.basename, platform: 'linux',
    preserveMultipleSlashes: true, optimizationLevel: 0,
    braceExpandMax: 257, maxGlobstarRecursion: 16 };
}

/** @param {string} pattern @param {GlobOptions} options */
function compile(pattern, options) {
  const unwrapped = unwrap(pattern, options.nonegate, options.noextglob);
  const normalized = normalizeGroups(unwrapped.pattern, options);
  const settings = baseOptions(options);
  // The compatibility surface historically permits one trailing slash for
  // simple wildcard/extension patterns, but not for negations or extglobs.
  const simple = /^(?:\*\*\/)?\*(?:\.(?:\*|[a-zA-Z0-9_-]+))?$/.test(normalized);
  
  const patterns = [normalized];
  if (simple && settings.noglobstar && normalized.startsWith('**/')) patterns.push(normalized.slice(3));
  if (!settings.noglobstar && normalized.endsWith('/**')) patterns.push(normalized.slice(0, -3));
  if (options.contains && !unwrapped.negated) {
    for (const value of [normalized]) {
      const anywhere = `**/*${value}*`;
      patterns.push(anywhere, `${anywhere}/**`);
      if (value.startsWith('**/')) patterns.push(`${value.slice(3)}*`);
      if (value.endsWith('/**') && !settings.noglobstar) patterns.push(`**/*${value.slice(0, -3)}`);
    }
  }
  const compiled = patterns.map(value => {
    const result = new Minimatch(value, settings);
    if (result.globSet.length > 256) throw new RangeError('Glob expansion exceeds its limit');
    return result;
  });
  return /** @param {string} input */ (input) => {
    const trailingAllowed = options.contains || normalized === '**' || normalized.endsWith('/') || normalized.endsWith('/**') || (simple && !unwrapped.negated);
    const result = (!input.endsWith('/') || trailingAllowed) && compiled.some(matcher => matcher.match(input));
    return unwrapped.negated ? !result : Boolean(result);
  };
}

/** @param {string|string[]} patterns @param {GlobOptions} [options] */
function glob(patterns, options = {}) {
  const settings = validateOptions(options);
  const list = Array.isArray(patterns) ? patterns : [patterns];
  const ignores = settings.ignore === undefined ? [] : Array.isArray(settings.ignore) ? settings.ignore : [settings.ignore];
  if (list.length + ignores.length > MAX_PATTERNS) throw new RangeError('Too many glob patterns');
  let total = 0;
  for (const pattern of [...list, ...ignores]) {
    validatePattern(pattern);
    total += pattern.length;
    if (total > MAX_TOTAL_PATTERN) throw new RangeError('Glob compilation exceeds its aggregate limit');
  }
  const matches = list.map(pattern => compile(pattern, settings));
  const excluded = ignores.map(pattern => compile(pattern, settings));
  return /** @param {string} candidate */ (candidate) => {
    if (typeof candidate !== 'string') throw new TypeError('A glob candidate must be a string');
    if (candidate.length > MAX_INPUT) throw new RangeError('Glob candidate exceeds its length limit');
    if (candidate.length === 0) return false;
    const input = settings.windows ? candidate.replace(/\\/g, '/') : candidate;
    return matches.some(match => match(input)) && !excluded.some(match => match(input));
  };
}

/** @param {string} input @param {string|string[]} patterns @param {GlobOptions} [options] */
function isMatch(input, patterns, options) { return glob(patterns, options)(input); }

/** Only structural scanning is needed; no regular expression is compiled.
 * @param {string} pattern @param {{parts?: boolean, nonegate?: boolean}} [options] */
function scan(pattern, options = {}) {
  validatePattern(pattern);
  for (const [key, value] of Object.entries(options)) {
    if (!['parts', 'nonegate'].includes(key) || (value !== undefined && typeof value !== 'boolean')) throw new TypeError(`Unsupported scan option: ${key}`);
  }
  const value = unwrap(pattern, options.nonegate);
  /** @type {string[]} */ const parts = [];
  let partStart = 0;
  let firstMagic = -1;
  let bracket = 0;
  let brace = 0;
  let paren = 0;
  for (let i = 0; i < value.pattern.length; i++) {
    const char = value.pattern[i];
    if (char === '\\') { i++; continue; }
    if ('*?[('.includes(char) || (char === '{' && /,|\.\./.test(value.pattern.slice(i)))) {
      if (firstMagic < 0) firstMagic = partStart;
    }
    if (char === '[') bracket++;
    if (char === ']') bracket = Math.max(0, bracket - 1);
    if (!bracket) {
      if (char === '{') brace++;
      if (char === '}') brace = Math.max(0, brace - 1);
      if (char === '(') paren++;
      if (char === ')') paren = Math.max(0, paren - 1);
    }
    if (char === '/' && !bracket && !brace && !paren) {
      parts.push(value.pattern.slice(partStart, i));
      partStart = i + 1;
    }
  }
  parts.push(value.pattern.slice(partStart));
  return { prefix: value.prefix, input: pattern, start: value.prefix.length,
    base: firstMagic < 0 ? value.pattern : value.pattern.slice(0, Math.max(0, firstMagic - 1)),
    glob: firstMagic < 0 ? '' : value.pattern.slice(firstMagic),
    isGlob: firstMagic >= 0, negated: value.start > 0,
    negatedExtglob: value.pattern.startsWith('!('),
    ...(options.parts ? { parts } : {}) };
}

/** Arbitrary regex compilation would restore the vulnerability class.
 * @returns {never} */
function makeRe() { throw new TypeError('Glob-to-RegExp compilation is unsupported; use the matcher or an explicit reviewed RegExp filter'); }

module.exports = Object.assign(glob, { isMatch, scan, makeRe });
