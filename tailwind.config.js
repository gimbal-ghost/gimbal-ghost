/* eslint-disable global-require */
module.exports = {
    content: [
        './packages/renderer/index.html',
        './packages/renderer/src/**/*.{vue,js,ts,jsx,tsx}',
    ],
    safelist: [
        // Dynamic classes for StyledButton
        'bg-neutral-100',
        'outline-neutral-100',
        'bg-green-600',
        'outline-green-600',
    ],
    theme: {
        extend: {},
    },
    plugins: [
        require('tailwind-scrollbar'),
        require('@tailwindcss/line-clamp'),
        require('@tailwindcss/forms'),
    ],
};
