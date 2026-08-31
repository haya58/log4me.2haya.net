import { Eta } from "eta";
import fs from "fs-extra";
import matter from "gray-matter";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_ROOT = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(SITE_ROOT, "content", "posts");
const TEMPLATES_DIR = path.join(SITE_ROOT, "templates");
const DIST_DIR = path.join(SITE_ROOT, "dist");

type Post = {
  title: string;
  date: string;
  slug: string;
  bodyMarkdown: string;
  bodyHtml: string;
  url: string;
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function build() {
  await fs.remove(DIST_DIR);
  await fs.ensureDir(DIST_DIR);

  const eta = new Eta({
    views: TEMPLATES_DIR,
    autoEscape: false,
  });

  const posts = await loadPosts();
  posts.sort((a, b) => (a.date < b.date ? 1 : -1));

  await generateIndexPage(eta, posts);
  await generateAboutPage(eta);

  for (const post of posts) {
    await generatePostPage(eta, post);
  }

  await copyCssFiles();
  await copyPublicFiles();
}

async function loadPosts(): Promise<Post[]> {
  if (!(await fs.pathExists(CONTENT_DIR))) {
    return [];
  }

  const files = await fs.readdir(CONTENT_DIR);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  const posts: Post[] = [];
  const seenSlugs = new Set<string>();

  for (const file of mdFiles) {
    const filePath = path.join(CONTENT_DIR, file);
    const raw = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(raw);

    if (!data.title) throw new Error(`Missing title in ${file}`);
    if (!data.date) throw new Error(`Missing date in ${file}`);
    if (!data.slug) throw new Error(`Missing slug in ${file}`);

    const dateStr = String(data.date);
    if (isNaN(Date.parse(dateStr))) {
      throw new Error(`Invalid date in ${file}`);
    }

    const slug = String(data.slug);
    if (seenSlugs.has(slug)) {
      throw new Error(`Duplicate slug: ${slug}`);
    }
    seenSlugs.add(slug);

    const rawHtml = marked.parse(content);
    const safeHtml = sanitizeHtml(typeof rawHtml === "string" ? rawHtml : await rawHtml);

    posts.push({
      title: String(data.title),
      date: dateStr,
      slug,
      bodyMarkdown: content,
      bodyHtml: safeHtml,
      url: `/posts/${slug}/`,
    });
  }

  return posts;
}

async function generateIndexPage(eta: Eta, posts: Post[]) {
  const listItems = posts
    .map((p) => {
      const dateStr = formatDate(p.date);
      return `<li><time datetime="${p.date}">${dateStr}</time> <a href="${p.url}">${p.title}</a></li>`;
    })
    .join("\n");

  const content = `
<h2>記事一覧</h2>
${posts.length === 0 ? "<p>記事はまだありません。</p>" : `<ul>\n${listItems}\n</ul>`}
`;

  const html = eta.render("index", { content });
  await fs.outputFile(path.join(DIST_DIR, "index.html"), html);
}

async function generateAboutPage(eta: Eta) {
  const content = `
<h2>このサイトについて</h2>
<p>This is a personal blog powered by Discord bot and static site generator.</p>
`;

  const html = eta.render("about", { content });
  await fs.outputFile(path.join(DIST_DIR, "about", "index.html"), html);
}

async function generatePostPage(eta: Eta, post: Post) {
  const dateStr = formatDate(post.date);

  const content = `
<article>
  <header>
    <h1 class="post-title">${post.title}</h1>
    <time class="post-date" datetime="${post.date}">${dateStr}</time>
  </header>
  ${post.bodyHtml}
</article>
`;

  const html = eta.render("post", { content, post });
  await fs.outputFile(path.join(DIST_DIR, "posts", post.slug, "index.html"), html);
}

async function copyCssFiles() {
  const cssDir = path.join(SITE_ROOT, "node_modules", "sakura.css", "css");
  await fs.copy(path.join(cssDir, "sakura.css"), path.join(DIST_DIR, "sakura.css"));
  await fs.copy(path.join(cssDir, "sakura-dark.css"), path.join(DIST_DIR, "sakura-dark.css"));
}

async function copyPublicFiles() {
  const publicDir = path.join(SITE_ROOT, "public");
  await fs.copy(publicDir, DIST_DIR);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
