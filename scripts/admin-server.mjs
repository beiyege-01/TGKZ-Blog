import http from 'node:http';
import { readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multiparty from 'multiparty';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const contentDir = path.join(projectRoot, 'src', 'content', 'blog');
const adminHtmlPath = path.join(__dirname, 'admin.html');
const port = Number(process.env.PORT || 4322);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function sendJson(res, payload, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sanitizeFileName(name) {
  const base = path.basename(name || 'untitled.md');
  const ext = base.toLowerCase().endsWith('.md') ? '.md' : '.md';
  const stem = base.replace(/\.md$/i, '').replace(/[^a-zA-Z0-9\u4e00-\u9fff._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${stem || 'post'}${ext}`;
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

async function parseMultipart(req) {
  const form = new multiparty.Form({ maxFilesSize: 5 * 1024 * 1024 });
  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ fields, files });
    });
  });
}

async function listPosts() {
  const entries = await readdir(contentDir);
  const files = entries.filter((entry) => entry.toLowerCase().endsWith('.md')).sort();
  const posts = [];
  for (const file of files) {
    const fullPath = path.join(contentDir, file);
    const stats = await stat(fullPath);
    let title = file.replace(/\.md$/i, '');
    try {
      const content = await readFile(fullPath, 'utf8');
      const match = content.match(/^title:\s*['"]?(.+?)['"]?\s*$/m);
      if (match) {
        title = match[1].trim();
      }
    } catch (error) {
      // ignore
    }
    posts.push({
      file,
      title,
      updatedAt: stats.mtime.toISOString(),
    });
  }
  return posts;
}

async function readPost(file) {
  const safe = sanitizeFileName(file);
  const fullPath = path.join(contentDir, safe);
  const content = await readFile(fullPath, 'utf8');
  return { file: safe, content };
}

async function savePost(file, content) {
  const safe = sanitizeFileName(file);
  const fullPath = path.join(contentDir, safe);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, 'utf8');
  return { file: safe };
}

async function handleStaticFile(req, res, urlPath) {
  const requestPath = decodeURIComponent(urlPath);
  // 仅提供后台管理页面（scripts/admin.html），不暴露 public 目录
  const filePath = path.join(__dirname, 'admin.html');

  try {
    const fileContent = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fileContent);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname === '/health') {
    sendJson(res, { ok: true, contentDir });
    return;
  }

  if (pathname === '/api/posts') {
    if (req.method === 'GET') {
      const posts = await listPosts();
      sendJson(res, { posts });
      return;
    }
  }

  if (pathname.startsWith('/api/posts/')) {
    const file = decodeURIComponent(pathname.split('/').pop() || '');
    if (req.method === 'GET') {
      const post = await readPost(file);
      sendJson(res, { post });
      return;
    }
    if (req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const content = body.content ?? '';
        const result = await savePost(file, content);
        sendJson(res, { ok: true, ...result });
      } catch (error) {
        sendJson(res, { ok: false, message: error.message }, 500);
      }
      return;
    }
  }

  if (pathname === '/api/upload') {
    if (req.method === 'POST') {
      try {
        const { files } = await parseMultipart(req);
        const uploaded = files.file?.[0] || files['file']?.[0] || files[0];
        if (!uploaded) {
          sendJson(res, { ok: false, message: 'No file uploaded' }, 400);
          return;
        }
        const fileName = sanitizeFileName(uploaded.originalFilename || 'uploaded.md');
        const targetPath = path.join(contentDir, fileName);
        const fileContent = await readFile(uploaded.path, 'utf8');
        await writeFile(targetPath, fileContent, 'utf8');
        sendJson(res, { ok: true, file: fileName });
      } catch (error) {
        sendJson(res, { ok: false, message: error.message }, 500);
      }
      return;
    }
  }

  if (pathname === '/admin' || pathname === '/admin/') {
    await handleStaticFile(req, res, '/admin.html');
    return;
  }

  if (pathname === '/') {
    res.writeHead(302, { Location: '/admin' });
    res.end();
    return;
  }

  await handleStaticFile(req, res, pathname);
});

// 只监听本机回环地址，公网无法直接访问后台服务
server.listen(port, '127.0.0.1', () => {
  console.log(`Admin server running at http://localhost:${port}/admin`);
});
