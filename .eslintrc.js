module.exports = {
    root: true,
    overrides: [
        {
            files: ['*.js', '*.ts', '*.cjs'],
        },
    ],
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
        'plugin:import/typescript',
    ],
    rules: {
        // ES
        'linebreak-style': 'off',
        'no-console': 'off',
        indent: ['error', 4, { MemberExpression: 'off', SwitchCase: 1 }],
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['warn'],
        'arrow-parens': ['error', 'as-needed'],
        'brace-style': ['error', 'stroustrup'],
        'nonblock-statement-body-position': ['error', 'below'],
        'max-len': 'off',
        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': ['error'],
        // Import
        'import/prefer-default-export': 'off',
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
        'import/extensions': 'off',
    },
};
