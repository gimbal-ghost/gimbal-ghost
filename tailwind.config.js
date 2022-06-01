/* eslint-disable global-require */
module.exports = {
    content: [
        './packages/renderer/index.html',
        './packages/renderer/src/**/*.{vue,js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {},
    },
    plugins: [
        require('tailwind-scrollbar'),
        require('@tailwindcss/line-clamp'),
    ],
};
