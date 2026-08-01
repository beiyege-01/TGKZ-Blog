/**
 * 从 Obsidian 导入 Markdown 文章到博客
 *
 * 用法：
 *   1. 直接运行（交互式）：npm run import
 *   2. 传文件路径（支持拖拽）：npm run import -- "C:\Users\xxx\笔记.md"
 *
 * 自动完成：
 *   1. 解析/补全 frontmatter（title / description / pubDate / updatedDate / heroImage）
 *   2. 将 Obsidian 的 ![[图片.png]] 语法转换为标准 Markdown 图片
 *   3. 把图片文件复制到 public/images/tutorials/
 *   4. 以安全的文件名保存到 src/content/blog/
 */
import { readFile, writeFile, copyFile, access, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const contentDir = path.join(projectRoot, 'src', 'content', 'blog');
const imagesDir = path.join(projectRoot, 'public', 'images', 'tutorials');
const placeholders = [
  '../../assets/blog-placeholder-1.jpg',
  '../../assets/blog-placeholder-2.jpg',
  '../../assets/blog-placeholder-3.jpg',
  '../../assets/blog-placeholder-4.jpg',
  '../../assets/blog-placeholder-5.jpg',
];
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

const rl = createInterface({ input: stdin, output: stdout });

async function ask(question) {
  const answer = await rl.question(question);
  return answer.trim();
}

function nowDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayForFilename() {
  return nowDate().replace(/-/g, '');
}

/** 安全文件名：保留中文/字母/数字，其他转 - */
function slugify(name) {
  const stem = name.replace(/\.md$/i, '').trim();
  return (
    stem
      .replace(/[^a-zA-Z0-9\u4e00-\u9fff._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'post'
  );
}

/** 从正文第一段提取一句话描述 */
function extractDescription(body) {
  const lines = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('!') && !l.startsWith('>') && !l.startsWith('```'));
  if (lines.length === 0) return '';
  return lines[0].slice(0, 60);
}

/** 解析 frontmatter，返回 { data, body } */
function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: content };
  const data = {};
  const raw = m[1];
  for (const line of raw.split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) {
      let val = kv[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (val) data[kv[1]] = val;
    }
  }
  return { data, body: content.slice(m[0].length) };
}

/** 序列化 frontmatter（保持博客需要的字段顺序） */
function buildFrontmatter(data) {
  const order = ['title', 'description', 'pubDate', 'updatedDate', 'heroImage'];
  const lines = ['---'];
  for (const key of order) {
    if (data[key] !== undefined && data[key] !== '') {
      lines.push(`${key}: '${String(data[key]).replace(/'/g, "\\'")}'`);
    }
  }
  // 其余字段（如 tags）追加
  for (const key of Object.keys(data)) {
    if (!order.includes(key) && data[key] !== undefined && data[key] !== '') {
      lines.push(`${key}: '${String(data[key]).replace(/'/g, "\\'")}'`);
    }
  }
  lines.push('---');
  return lines.join('\n') + '\n';
}

/** 递归在目录里找图片 */
async function findImage(dir, filename) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = await findImage(full, filename);
        if (found) return found;
      } else if (entry.name.toLowerCase() === filename.toLowerCase()) {
        return full;
      }
    }
  } catch {
    // 目录不存在则跳过
  }
  return null;
}

/** 转换 Obsidian 图片语法并复制图片，返回 { body, copiedCount } */
async function convertWikiImages(body, sourceDir, attachDirs) {
  let copiedCount = 0;
  const errors = [];
  const usedNames = new Set();

  // 逐段处理 Obsidian ![[...]] 引用（每次处理第一个匹配）
  const wikiRegex = /!\[\[([^\]]+)\]\]/;
  let m;
  while ((m = body.match(wikiRegex))) {
    const raw = m[1];
    // 去掉 Obsidian 尺寸参数如 "|300"
    const filename = raw.split('|')[0].trim();
    if (!filename) {
      body = body.replace(m[0], '');
      continue;
    }
    const alt = filename.replace(/\.[^.]+$/, '');

    let src = path.join(sourceDir, filename);
    try {
      await access(src);
    } catch {
      // 源目录没有，去附件目录找
      src = null;
      for (const dir of attachDirs) {
        const found = await findImage(dir, filename);
        if (found) {
          src = found;
          break;
        }
      }
    }

    if (!src) {
      errors.push(`⚠️  找不到图片: ${filename}`);
      body = body.replace(m[0], `![${alt}](/images/tutorials/${encodeURIComponent(filename)})`);
      continue;
    }

    // 复制到图片目录（重名则加序号）
    const ext = path.extname(filename).toLowerCase();
    const base = slugify(filename.replace(ext, ''));
    let targetName = `${base}${ext}`;
    let n = 2;
    while (usedNames.has(targetName.toLowerCase())) {
      targetName = `${base}-${n}${ext}`;
      n++;
    }
    usedNames.add(targetName.toLowerCase());
    try {
      await copyFile(src, path.join(imagesDir, targetName));
      copiedCount++;
      body = body.replace(m[0], `![${alt}](/images/tutorials/${targetName})`);
    } catch (err) {
      errors.push(`❌ 复制失败: ${filename} (${err.message})`);
    }
  }

  // 处理标准 markdown 图片但使用本地路径的情况（相对源文件目录）
  const mdImgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const mdMatches = [...body.matchAll(mdImgRegex)];
  for (const match of mdMatches) {
    const rawPath = match[2];
    if (/^(https?:)?\/\//.test(rawPath) || rawPath.startsWith('/images/')) continue;
    const alt = match[1] || 'image';
    const filename = path.basename(rawPath);
    const candidate = path.resolve(sourceDir, rawPath);
    try {
      await access(candidate);
      const ext = path.extname(candidate).toLowerCase();
      if (!IMAGE_EXT.includes(ext)) continue;
      const base = slugify(filename.replace(ext, ''));
      let targetName = `${base}${ext}`;
      let n = 2;
      while (usedNames.has(targetName.toLowerCase())) {
        targetName = `${base}-${n}${ext}`;
        n++;
      }
      usedNames.add(targetName.toLowerCase());
      await copyFile(candidate, path.join(imagesDir, targetName));
      copiedCount++;
      body = body.replace(match[0], `![${alt}](/images/tutorials/${targetName})`);
    } catch {
      // 本地文件不存在则跳过（可能是占位或远程路径）
    }
  }

  return { body, copiedCount, errors };
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  📥 从 Obsidian 导入文章到博客');
  console.log('═══════════════════════════════════════════\n');

  // 1. 获取源文件路径（命令行参数或交互输入，支持拖拽）
  let sourceArg = process.argv.slice(2).find((a) => !a.startsWith('-'));
  let sourcePath = sourceArg ? sourceArg.trim().replace(/^"|"$/g, '') : '';

  if (!sourcePath) {
    console.log('👉 请把 Obsidian 里的 .md 文件拖到窗口，或直接输入完整路径');
    console.log('   （也可以带参数运行：npm run import -- "C:\\路径\\文章.md"）\n');
    sourcePath = await ask('文件路径: ');
  }

  if (!path.isAbsolute(sourcePath)) {
    sourcePath = path.resolve(process.cwd(), sourcePath);
  }
  if (!sourcePath.toLowerCase().endsWith('.md')) {
    console.error('❌ 文件必须是 .md 格式');
    rl.close();
    process.exit(1);
  }

  let content;
  try {
    content = await readFile(sourcePath, 'utf8');
  } catch {
    console.error(`❌ 无法读取文件: ${sourcePath}`);
    rl.close();
    process.exit(1);
  }

  const sourceDir = path.dirname(sourcePath);
  const sourceName = path.basename(sourcePath);
  console.log(`\n📄 已读取: ${sourceName}\n`);

  // 2. 解析并补全 frontmatter
  const { data, body } = parseFrontmatter(content);

  // 标题：已有则用，否则用文件名
  let title = data.title || sourceName.replace(/\.md$/i, '');
  console.log(`🏷️  标题: ${title}`);
  const useTitle = await ask('使用这个标题？(回车确认 / 输入新标题): ');
  if (useTitle) title = useTitle;

  const today = nowDate();
  const description = data.description || extractDescription(body);
  const pubDate = data.pubDate || today;
  const updatedDate = data.updatedDate || today;
  const heroIndex = parseInt(data.heroImage?.match(/placeholder-(\d)/)?.[1] || '1', 10);
  const heroImage = data.heroImage || placeholders[Math.min(heroIndex, placeholders.length) - 1];

  console.log(`📝 描述: ${description || '(自动从正文提取)'}`);
  console.log(`📅 日期: ${pubDate}`);
  console.log(`🖼  封面: ${heroImage}\n`);

  // 3. 处理图片
  const attachDirs = [];
  // 询问附件目录（Obsidian 可能把图片放在别的文件夹）
  if (/!\[\[/.test(body)) {
    console.log('🖼  检测到 Obsidian 图片引用 (![[...]])');
    const attachInput = await ask('图片附件目录（与 md 同目录可留空回车）: ');
    if (attachInput) {
      const attachPath = path.isAbsolute(attachInput.trim())
        ? attachInput.trim()
        : path.resolve(sourceDir, attachInput.trim());
      attachDirs.push(attachPath);
    }
  }

  const { body: newBody, copiedCount, errors } = await convertWikiImages(body, sourceDir, attachDirs);
  if (errors.length > 0) {
    console.log('\n' + errors.join('\n'));
  }
  console.log(`\n📦 已复制图片: ${copiedCount} 张`);

  // 4. 生成文件名并写入
  const slug = slugify(title);
  let targetFile = `${slug}.md`;
  let seq = 2;
  while (true) {
    try {
      await access(path.join(contentDir, targetFile));
      targetFile = `${slug}-${seq}.md`;
      seq++;
    } catch {
      break;
    }
  }

  const finalContent = buildFrontmatter({
    ...data,
    title,
    description,
    pubDate,
    updatedDate,
    heroImage,
  }) + newBody.trim() + '\n';

  await mkdir(contentDir, { recursive: true });
  await writeFile(path.join(contentDir, targetFile), finalContent, 'utf8');

  console.log(`\n✅ 导入完成！`);
  console.log(`   📁 文件: src/content/blog/${targetFile}`);
  console.log(`   🔗 预览: http://localhost:4321/blog/${targetFile.replace(/\.md$/, '')}/`);
  console.log(`\n   💡 如果开发服务器正在运行，刷新浏览器即可看到新文章。`);
  console.log(`      若图片未显示，请重启 dev server：npx astro dev stop && npx astro dev --host --background\n`);

  rl.close();
}

main().catch((err) => {
  console.error('❌ 出错:', err.message);
  rl.close();
  process.exit(1);
});
