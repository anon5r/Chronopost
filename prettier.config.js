// Chronopost - Prettier Configuration

/** @type {import("prettier").Config} */
export default {
  // Print width
  printWidth: 100,

  // Tab width
  tabWidth: 2,
  useTabs: false,

  // Semicolons
  semi: true,

  // Quotes
  singleQuote: true,
  quoteProps: 'as-needed',

  // JSX
  jsxSingleQuote: true,

  // Trailing commas
  trailingComma: 'es5',

  // Bracket spacing
  bracketSpacing: true,
  bracketSameLine: false,

  // Arrow function parentheses
  arrowParens: 'avoid',

  // Range
  rangeStart: 0,
  rangeEnd: Infinity,

  // Parser
  requirePragma: false,
  insertPragma: false,

  // Prose wrap
  proseWrap: 'preserve',

  // HTML whitespace sensitivity
  htmlWhitespaceSensitivity: 'css',

  // Vue files script and style tags indentation
  vueIndentScriptAndStyle: false,

  // End of line
  endOfLine: 'lf',

  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',

  // Single attribute per line
  singleAttributePerLine: false,

  // Override settings for specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
        tabWidth: 2,
      },
    },
    {
      files: '*.yaml',
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: ['*.js', '*.jsx'],
      options: {
        singleQuote: true,
        semi: true,
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      options: {
        singleQuote: true,
        semi: true,
        parser: 'typescript',
      },
    },
    {
      files: 'package.json',
      options: {
        tabWidth: 2,
        printWidth: 120,
      },
    },
    {
      files: 'pnpm-workspace.yaml',
      options: {
        tabWidth: 2,
      },
    },
    {
      files: '*.prisma',
      options: {
        tabWidth: 2,
        printWidth: 120,
        singleQuote: false,
      },
    },
    {
      files: '.env*',
      options: {
        printWidth: 120,
      },
    },
    {
      files: '*.sql',
      options: {
        tabWidth: 2,
        printWidth: 120,
      },
    },
  ],

  // Plugin settings
  plugins: ['prettier-plugin-organize-imports'],
};
