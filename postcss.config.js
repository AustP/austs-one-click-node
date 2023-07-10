module.exports = {
  plugins: [
    require('tailwindcss'),
    require('postcss-font-magician')({
      foundries: ['google'],
      protocol: 'https:',
      variants: {
        Montserrat: {
          200: [],
          300: [],
          400: [],
          '400 italic': [],
        },
      },
    }),
    require('autoprefixer'),
  ],
};
