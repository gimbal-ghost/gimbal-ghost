module.exports = {
    parser: 'vue-eslint-parser',
    parserOptions: {
        parser: '@typescript-eslint/parser',
        tsconfigRootDir: __dirname,
        ecmaVersion: 'latest',
    },
    extends: [
        'plugin:vue/vue3-recommended',
    ],
    rules: {
        'vue/html-indent': ['error', 4, { alignAttributesVertically: false }],
    },
};
