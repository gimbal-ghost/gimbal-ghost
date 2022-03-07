module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: __dirname,
        ecmaVersion: 'latest',
    },
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'airbnb-base',
        'airbnb-typescript/base',
        'plugin:node/recommended',
    ],
    rules: {
        'no-console': 'off',
        indent: ['error', 4, { MemberExpression: 'off' }],
        'no-unused-vars': 'warn',
        'arrow-parens': ['error', 'as-needed'],
        'import/prefer-default-export': 'off',
    },
};
