module.exports = {
    env: {
        browser: true,
        es2021: true,
    },
    extends: [
        'airbnb-base',
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    rules: {
        'no-console': 'off',
        indent: ['error', 4, { MemberExpression: 'off' }],
        'no-unused-vars': 'warn',
        'arrow-parens': ['error', 'as-needed'],
        'import/prefer-default-export': 'off',
    },
};
