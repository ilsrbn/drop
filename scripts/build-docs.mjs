// Builds the static docs site into docs-site/dist from README.md and AGENTS.md.
// Everything is derived from those sources, so llms-full.txt cannot drift.
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'

const root = fileURLToPath(new URL('..', import.meta.url))

export const pages = [
  { slug: 'index', title: 'Drop', source: 'README.md', html: 'index.html' },
  { slug: 'agents', title: 'Drop for AI coding agents', source: 'AGENTS.md', html: 'agents.html' },
]

export function buildLlmsFull(readme, agents) {
  return `${readme.trimEnd()}\n\n---\n\n${agents.trimEnd()}\n`
}

function rewriteLinks(html) {
  return html
    .replaceAll('href="./AGENTS.md"', 'href="/agents"')
    .replaceAll('href="./README.md"', 'href="/"')
    .replaceAll('src="./logo.png"', 'src="/logo.png"')
}

function layout(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="Tiny opt-in browser behaviors for server-rendered Nuxt routes, without hydrating the page">
<link rel="alternate" type="text/markdown" href="/index.md">
<style>
:root{color-scheme:light dark;--fg:#1a1a1a;--bg:#fff;--mut:#666;--line:#e5e5e5;--acc:#00a86b}
@media (prefers-color-scheme:dark){:root{--fg:#e8e8e8;--bg:#111;--mut:#999;--line:#2a2a2a;--acc:#00dc82}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,sans-serif}
main{max-width:760px;margin:0 auto;padding:16px}
nav{display:flex;gap:16px;padding:12px 16px;border-bottom:1px solid var(--line);flex-wrap:wrap}
a{color:var(--acc)}
pre{overflow:auto;padding:12px;background:color-mix(in srgb,var(--fg) 6%,transparent);border-radius:6px}
code{font-size:.9em}
table{border-collapse:collapse;display:block;overflow:auto}
td,th{border:1px solid var(--line);padding:6px 10px;text-align:left}
img{max-width:100%;height:auto}
</style>
</head>
<body>
<nav><a href="/">Docs</a><a href="/agents">For AI agents</a><a href="/llms.txt">llms.txt</a><a href="/llms-full.txt">llms-full.txt</a><a href="https://github.com/ilsrbn/drop">GitHub</a></nav>
<main>
${body}
</main>
</body>
</html>
`
}

export async function buildDocs(outDir = join(root, 'docs-site/dist')) {
  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })

  const sources = {}
  for (const page of pages) {
    const markdown = await readFile(join(root, page.source), 'utf8')
    sources[page.source] = markdown
    const html = rewriteLinks(await marked.parse(markdown))
    await writeFile(join(outDir, page.html), layout(page.title, html))
    // Plain markdown: <slug>.md plus the original filename so relative links keep working.
    await writeFile(join(outDir, `${page.slug}.md`), markdown)
    await writeFile(join(outDir, page.source), markdown)
  }

  await writeFile(join(outDir, 'llms-full.txt'), buildLlmsFull(sources['README.md'], sources['AGENTS.md']))
  await cp(join(root, 'llms.txt'), join(outDir, 'llms.txt'))
  await cp(join(root, 'logo.png'), join(outDir, 'logo.png'))
  await cp(join(root, 'CHANGELOG.md'), join(outDir, 'CHANGELOG.md'))
  await mkdir(join(outDir, 'skills/drop'), { recursive: true })
  await cp(join(root, 'skills/drop/SKILL.md'), join(outDir, 'skills/drop/SKILL.md'))
  await cp(join(root, 'docs-site/vercel.json'), join(outDir, 'vercel.json'))
  return outDir
}

if (process.argv[1] && dirname(process.argv[1]) === dirname(fileURLToPath(import.meta.url))) {
  const out = await buildDocs()
  console.log(`docs built in ${out}`)
}
