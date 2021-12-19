console.log('NODE_ENV:', process.env.NODE_ENV)

// include all tailwind classes if not building for production
// that way we don't need to watch and regenerate css
// every time components sources change during development
const safelist = process.env.NODE_ENV === 'production' ? [] : [{ pattern: /./ }]

module.exports = {
  content: [
    './dist/index.html',
    './src/**/*.{html,js,tsx}',
  ],
  safelist,
  theme: {
    extend: {}
  },
  plugins: [
    require("@tailwindcss/forms")
  ]
}
