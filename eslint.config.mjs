import js from '@eslint/js'
import globals from 'globals'
import hooks from 'eslint-plugin-react-hooks'
export default [
  { ignores: ['node_modules/**', 'dist/**', 'ui-review/**', 'docs/**'] },
  { files: ['src/**/*.{js,jsx}', 'scripts/**/*.mjs', 'tests/**/*.{js,mjs}', '*.config.{js,mjs}'],
    ...js.configs.recommended,
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser, ...globals.node }, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { 'react-hooks': hooks },
    rules: { ...js.configs.recommended.rules, 'react-hooks/rules-of-hooks': 'error', 'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }] },
  },
]
