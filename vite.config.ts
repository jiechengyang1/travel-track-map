import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // 将 media/ 目录作为一个虚拟静态目录，映射到 /media/ 路径
      {
        name: 'serve-media-dir',
        configureServer(server) {
          server.middlewares.use('/media', (req, res, next) => {
            const url = new URL(req.url || '/', `http://${req.headers.host}`);
            // 防止路径遍历
            const safePath = path.normalize(url.pathname).replace(/^\/+/, '');
            const filePath = path.resolve(__dirname, 'media', safePath);
            // 确保仍在 media/ 目录内
            const mediaDir = path.resolve(__dirname, 'media');
            if (!filePath.startsWith(mediaDir)) {
              res.statusCode = 403;
              res.end('Forbidden');
              return;
            }
            // 检查文件是否存在
            try {
              const stat = fs.statSync(filePath);
              if (stat.isFile()) {
                const ext = path.extname(filePath).toLowerCase();
                const mimeTypes: Record<string, string> = {
                  '.jpg': 'image/jpeg',
                  '.jpeg': 'image/jpeg',
                  '.png': 'image/png',
                  '.gif': 'image/gif',
                  '.webp': 'image/webp',
                  '.mp4': 'video/mp4',
                  '.webm': 'video/webm',
                  '.mov': 'video/quicktime',
                  '.txt': 'text/plain; charset=utf-8',
                };
                res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
                res.setHeader('Cache-Control', 'public, max-age=86400');
                fs.createReadStream(filePath).pipe(res);
                return;
              }
            } catch {
              // 文件不存在
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
