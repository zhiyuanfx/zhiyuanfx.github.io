import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchPosts, occurrences } from '../src/lib/search.mjs';
const posts = [
  { id: 'old', title: 'Optimization notes', date: '2026-09-01', keywords: ['Math', 'Sampling'], text: 'Sampling sampling banana a+b [matrix] x.* <script>alert(1)</script>' },
  { id: 'new', title: 'SAMPLING', date: '2026-09-10', keywords: ['Probability'], text: 'Some probability and sampling.' },
];
test('latest first by default, oldest first when selected', () => {
  assert.deepEqual(searchPosts(posts).map(p => p.id), ['new', 'old']);
  assert.deepEqual(searchPosts(posts, '', 'asc').map(p => p.id), ['old', 'new']);
});
test('case insensitive occurrence counts across fields, one result per post', () => {
  const results = searchPosts(posts, ' sAmPlInG ');
  assert.equal(results.length, 2);
  assert.equal(results[0].count, 2);
  assert.equal(results[1].count, 3);
  assert.equal(results[0].excerpt, 'SAMPLING');
  assert.equal(results[1].excerpt, 'Sampling');
});
test('finds titles, keywords, and body text; uses the first matching field', () => {
  assert.equal(searchPosts(posts, 'optimization')[0].excerpt, 'Optimization notes');
  assert.equal(searchPosts(posts, 'math')[0].excerpt, 'Math');
  assert.match(searchPosts(posts, 'banana')[0].excerpt, /banana/);
});
test('punctuation and HTML-looking strings are literal', () => {
  for (const q of ['a+b', '[matrix]', 'x.*', '<script>']) assert.equal(searchPosts(posts, q)[0].count, 1);
  assert.equal(searchPosts(posts, '.*')[0].count, 1);
});
test('non-overlapping occurrences and empty queries', () => {
  assert.deepEqual(occurrences('banana', 'ana'), [1]);
  assert.deepEqual(occurrences('aaaa', 'aa'), [0, 2]);
  assert.deepEqual(occurrences('text', ''), []);
  assert.equal(searchPosts(posts, '   ').length, 2);
  assert.equal(searchPosts(posts, 'not present').length, 0);
});
test('excerpt includes a late first match and sort is preserved while searching', () => {
  const result = searchPosts([{ ...posts[0], title: 'A note', keywords: [], text: 'prefix '.repeat(70) + 'needle after' }], 'needle')[0];
  assert.ok(result.excerpt.startsWith('…'));
  assert.ok(result.excerpt.includes('needle'));
  assert.deepEqual(searchPosts(posts, 'sampling', 'asc').map(p => p.id), ['old', 'new']);
});
