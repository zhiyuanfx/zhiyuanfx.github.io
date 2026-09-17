import { getCollection } from 'astro:content';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import type { Root, RootContent } from 'mdast';

// Read the source AST before KaTeX emits visual HTML and accessible MathML.
// Each text, code, or original TeX node therefore enters the index exactly once.
function plainText(node: Root | RootContent): string {
  if (node.type === 'html') return '';
  if (node.type === 'break') return ' ';
  if ('value' in node) return node.value;
  if (node.type === 'image') return node.alt || '';
  if ('children' in node) {
    const inline = ['paragraph', 'heading', 'strong', 'emphasis', 'link', 'delete'].includes(node.type);
    return node.children.map((child) => plainText(child as RootContent)).join(inline ? '' : ' ');
  }
  return '';
}
export async function getPosts() {
  const posts = await getCollection('notes');
  return posts.map((post) => ({
    id: post.id,
    title: post.data.title,
    date: post.data.date.toISOString(),
    keywords: post.data.keywords,
    url: `/notes/${post.id}/`,
    text: plainText(unified().use(remarkParse).use(remarkMath).parse(post.body || '')).replace(/\s+/g, ' ').trim(),
  })).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(date));
}
