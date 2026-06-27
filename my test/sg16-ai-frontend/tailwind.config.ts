import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sg16: {
          green: '#00FF88',
          'green-glow': '#22FFAA',
          cyan: '#00E5FF',
          dark: '#050505',
          card: '#0F0F0F',
          'card-light': '#1A1A1A',
        },
      },
      boxShadow: {
        'neon-green': '0 0 25px #00FF88, 0 0 50px #00FF8844',
        'neon-cyan': '0 0 25px #00E5FF',
        'glow-green': '0 0 30px rgba(0, 255, 136, 0.6)',
      },
      textShadow: {
        'glow': '0 0 10px rgba(0, 255, 136, 0.8)',
      },
    },
  },
  plugins: [],
}
export default config
