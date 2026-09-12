export type PixelExpressionVariables = {
  r: number;
  g: number;
  b: number;
  a: number;
  x: number;
  y: number;
  width: number;
  height: number;
  amount: number;
};

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'name'; value: string }
  | { kind: 'operator'; value: string }
  | { kind: 'left' | 'right' | 'comma' };

type Node =
  | { kind: 'number'; value: number }
  | { kind: 'variable'; name: keyof PixelExpressionVariables }
  | { kind: 'unary'; operator: '+' | '-'; child: Node }
  | { kind: 'binary'; operator: string; left: Node; right: Node }
  | { kind: 'call'; name: string; arguments: Node[] };

const VARIABLES = new Set<keyof PixelExpressionVariables>([
  'r',
  'g',
  'b',
  'a',
  'x',
  'y',
  'width',
  'height',
  'amount',
]);

const FUNCTIONS: Record<string, { min: number; max: number }> = {
  abs: { min: 1, max: 1 },
  clamp: { min: 1, max: 3 },
  max: { min: 2, max: 8 },
  min: { min: 2, max: 8 },
  mix: { min: 3, max: 3 },
  pow: { min: 2, max: 2 },
  round: { min: 1, max: 1 },
};

const tokenize = (source: string) => {
  if (!source.trim() || source.length > 240)
    throw new Error(
      'A JavaScript channel expression must be 1–240 characters.',
    );
  const tokens: Token[] = [];
  for (let index = 0; index < source.length;) {
    const rest = source.slice(index),
      space = rest.match(/^\s+/),
      number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i),
      name = rest.match(/^[a-z_][a-z0-9_]*/i);
    if (space) {
      index += space[0].length;
      continue;
    }
    if (number) {
      tokens.push({ kind: 'number', value: Number(number[0]) });
      index += number[0].length;
    } else if (name) {
      tokens.push({ kind: 'name', value: name[0] });
      index += name[0].length;
    } else {
      const character = source[index];
      if ('+-*/%'.includes(character))
        tokens.push({ kind: 'operator', value: character });
      else if (character === '(') tokens.push({ kind: 'left' });
      else if (character === ')') tokens.push({ kind: 'right' });
      else if (character === ',') tokens.push({ kind: 'comma' });
      else
        throw new Error(
          `Unsupported token “${character}” in the JavaScript channel expression.`,
        );
      index++;
    }
    if (tokens.length > 120)
      throw new Error('The JavaScript channel expression is too complex.');
  }
  return tokens;
};

const parse = (source: string): Node => {
  const tokens = tokenize(source);
  let position = 0,
    depth = 0;
  const peek = () => tokens[position];
  const expression = (minimumPrecedence = 0): Node => {
    if (++depth > 24)
      throw new Error(
        'The JavaScript channel expression is nested too deeply.',
      );
    let left: Node;
    const first = tokens[position++];
    if (!first)
      throw new Error('The JavaScript channel expression is incomplete.');
    if (first.kind === 'number') left = { kind: 'number', value: first.value };
    else if (first.kind === 'operator' && ['+', '-'].includes(first.value))
      left = {
        kind: 'unary',
        operator: first.value as '+' | '-',
        child: expression(3),
      };
    else if (first.kind === 'left') {
      left = expression();
      if (tokens[position++]?.kind !== 'right')
        throw new Error('The JavaScript channel expression is missing “)”.');
    } else if (first.kind === 'name') {
      if (peek()?.kind === 'left') {
        position++;
        const arguments_: Node[] = [];
        if (peek()?.kind !== 'right')
          while (true) {
            arguments_.push(expression());
            if (peek()?.kind !== 'comma') break;
            position++;
          }
        if (tokens[position++]?.kind !== 'right')
          throw new Error('The JavaScript function call is missing “)”.');
        const signature = FUNCTIONS[first.value];
        if (
          !signature ||
          arguments_.length < signature.min ||
          arguments_.length > signature.max
        )
          throw new Error(
            `The JavaScript function “${first.value}” is not allowed.`,
          );
        left = { kind: 'call', name: first.value, arguments: arguments_ };
      } else {
        if (!VARIABLES.has(first.value as keyof PixelExpressionVariables))
          throw new Error(
            `The JavaScript variable “${first.value}” is not allowed.`,
          );
        left = {
          kind: 'variable',
          name: first.value as keyof PixelExpressionVariables,
        };
      }
    } else throw new Error('The JavaScript channel expression is invalid.');
    while (peek()?.kind === 'operator') {
      const operator = (peek() as Extract<Token, { kind: 'operator' }>).value,
        precedence = operator === '+' || operator === '-' ? 1 : 2;
      if (precedence < minimumPrecedence) break;
      position++;
      left = {
        kind: 'binary',
        operator,
        left,
        right: expression(precedence + 1),
      };
    }
    depth--;
    return left;
  };
  const result = expression();
  if (position !== tokens.length)
    throw new Error('The JavaScript channel expression has unexpected input.');
  return result;
};

const evaluate = (node: Node, variables: PixelExpressionVariables): number => {
  if (node.kind === 'number') return node.value;
  if (node.kind === 'variable') return variables[node.name];
  if (node.kind === 'unary') {
    const value = evaluate(node.child, variables);
    return node.operator === '-' ? -value : value;
  }
  if (node.kind === 'binary') {
    const left = evaluate(node.left, variables),
      right = evaluate(node.right, variables);
    if (node.operator === '+') return left + right;
    if (node.operator === '-') return left - right;
    if (node.operator === '*') return left * right;
    if (node.operator === '/') return right === 0 ? 0 : left / right;
    return right === 0 ? 0 : left % right;
  }
  const values = node.arguments.map((argument) =>
    evaluate(argument, variables),
  );
  if (node.name === 'abs') return Math.abs(values[0]);
  if (node.name === 'round') return Math.round(values[0]);
  if (node.name === 'pow') return Math.pow(values[0], values[1]);
  if (node.name === 'min') return Math.min(...values);
  if (node.name === 'max') return Math.max(...values);
  if (node.name === 'mix')
    return values[0] * (1 - values[2]) + values[1] * values[2];
  return Math.max(values[1] ?? 0, Math.min(values[2] ?? 255, values[0]));
};

export const compilePixelExpression = (source: string) => {
  const ast = parse(source);
  return (variables: PixelExpressionVariables) => {
    const value = evaluate(ast, variables);
    return Number.isFinite(value) ? value : 0;
  };
};
