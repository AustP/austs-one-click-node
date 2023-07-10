module.exports = {
  plugins: [
    require('tailwindcss'),
    require('postcss-font-magician')({
      foundries: ['google'],
      protocol: 'https:',
      variants: {
        Montserrat: {
          100: [],
          200: [],
          '200 italic': [],
          300: [],
        },
      },
    }),
    require('autoprefixer'),
  ],
};
