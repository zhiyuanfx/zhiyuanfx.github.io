/** @typedef {{ id: string, title: string, date: string, keywords: string[], text: string, url: string }} SearchPost */
/** Literal, non-overlapping matches. Never interpret user input as a regex or HTML. */
/** @param {string} text @param {string} query @returns {number[]} */
export function occurrences(text, query) {
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  if (!needle) return [];
  const matches = [];
  let offset = 0;
  while ((offset = haystack.indexOf(needle, offset)) !== -1) {
    matches.push(offset);
    offset += needle.length;
  }
  return matches;
}
/** @param {string} text @param {number} index @param {number} queryLength */
export function excerpt(text, index = 0, queryLength = 0) {
  const start = Math.max(0, index - 65);
  const end = Math.min(text.length, Math.max(start + 210, index + queryLength + 65));
  return `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}
/** @param {SearchPost[]} posts @param {string} input @param {string} order */
export function searchPosts(posts, input = '', order = 'desc') {
  const query = input.trim();
  return posts.flatMap((post) => {
    const fields = [post.title, ...post.keywords, post.text];
    const matches = fields.map((field) => occurrences(field, query));
    const count = matches.reduce((sum, values) => sum + values.length, 0);
    if (query && !count) return [];
    const firstField = matches.findIndex((values) => values.length);
    return [{ ...post, count, excerpt: query ? excerpt(fields[firstField], matches[firstField][0], query.length) : excerpt(post.text) }];
  }).sort((a, b) => (order === 'asc' ? 1 : -1) * (Date.parse(a.date) - Date.parse(b.date)) || a.id.localeCompare(b.id));
}
