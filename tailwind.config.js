/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Instagram-like palette
                'ig-primary': '#0095f6',
                'ig-primary-hover': '#1877f2',
                'ig-secondary': '#fafafa', // Background
                'ig-border': '#dbdbdb',
                'ig-text': '#262626',
                'ig-text-secondary': '#8e8e8e',
                'ig-link': '#00376b',
                'ig-error': '#ed4956',
            },
            fontFamily: {
                sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
