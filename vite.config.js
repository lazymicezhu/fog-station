import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    // 支持旧版浏览器
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
  ],

  // 开发服务器配置
  server: {
    port: 3000,
    open: true,
    cors: true,
  },

  // 构建配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',

    // 分块策略
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['./modules/time.js', './modules/login.js'],
          'combat': ['./modules/combat.js', './modules/cultivation.js'],
          'data': ['./data/subjects.js', './data/combat_data.js', './data/paimon_messages.js'],
        },
      },
    },

    // 资源内联阈值（小于4kb的资源会被内联为base64）
    assetsInlineLimit: 4096,

    // 生成sourcemap用于调试
    sourcemap: true,

    // 目标环境
    target: 'es2020',

    // 压缩选项
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // 生产环境可设为true
        drop_debugger: true,
      },
    },
  },

  // 路径别名
  resolve: {
    alias: {
      '@': '/src',
      '@modules': '/modules',
      '@data': '/data',
      '@styles': '/styles',
    },
  },

  // 优化依赖
  optimizeDeps: {
    include: [],
  },

  // 预览服务器配置
  preview: {
    port: 4000,
  },
});
