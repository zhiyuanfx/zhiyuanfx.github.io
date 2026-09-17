import { test, expect } from '@playwright/test';
for (const width of [320, 375, 768, 919, 1440, 1920]) {
  test(`homepage and math article fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.locator('section[data-section]')).toHaveCount(6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const order = await page.locator('section[data-section]').evaluateAll(nodes => nodes.map(n => n.id));
    expect(order).toEqual(['about','research','projects','experience','publications','notes']);
    if (width < 760) {
      const portrait = await page.locator('.portrait-frame').boundingBox();
      const intro = await page.locator('.intro').boundingBox();
      expect(portrait!.y + portrait!.height).toBeLessThan(intro!.y + 1);
      await page.locator('.site-header').getByRole('button', { name: 'Menu' }).click();
      await expect(page.locator('#primary-nav')).toBeVisible();
      await page.locator('#primary-nav').getByRole('link', { name: 'Projects' }).click();
      await expect(page.locator('#primary-nav')).not.toBeVisible();
      await expect(page).toHaveURL(/#projects$/);
    }
    await page.goto('/notes/notes-on-guided-sampling/');
    await expect(page.locator('.katex-display')).toHaveCount(4);
    await expect(page.locator('.katex-error')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const displays = await page.locator('.katex-display').evaluateAll(nodes => nodes.map(n => getComputedStyle(n).overflowX));
    expect(displays.every(value => value === 'auto')).toBe(true);
  });
}
test('search, counts, literal input, sorting, and article return state', async ({ page }) => {
  await page.goto('/#notes');
  const search = page.getByRole('searchbox');
  await expect(page.locator('.note-card')).toHaveCount(6);
  await expect(page.locator('.note-card').first()).toContainText('Sep 16, 2026');
  await page.locator('#note-sort').click();
  await expect(page.locator('.note-card').first()).toContainText('Sep 1, 2026');
  await search.fill('probability in motion');
  await expect(page.locator('.note-card')).toHaveCount(1);
  await expect(page.locator('.match-count')).toContainText('occurrence');
  await expect(page.locator('.note-excerpt')).toContainText('sampling');
  await page.locator('.note-card h3 a').click();
  await expect(page).toHaveURL(/q=probability\+in\+motion&sort=asc/);
  await page.goBack();
  await expect(search).toHaveValue('probability in motion');
  await page.goForward();
  await expect(page.locator('.prose')).toBeVisible();
  await page.locator('.back-link').first().click();
  await expect(search).toHaveValue('probability in motion');
  await expect(page.locator('#note-sort')).toHaveAttribute('data-order', 'asc');
  await expect(page.locator('.note-card')).toHaveCount(1);
  await search.fill('a+b');
  await expect(page.locator('.note-card')).toHaveCount(1);
  await expect(page.locator('.match-count')).toHaveText('1 occurrence');
  await search.fill('<img src=x onerror=alert(1)>');
  await expect(page.locator('#note-empty')).toBeVisible();
  await expect(page.locator('#note-list img')).toHaveCount(0);
  await search.fill('   ');
  await expect(page.locator('.note-card')).toHaveCount(6);
});
test('keyboard navigation, reduced motion, and all local resources', async ({ page, request }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  for (const image of await page.locator('img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(n => (n as HTMLImageElement).complete && (n as HTMLImageElement).naturalWidth > 0)).toBe(true);
  }
  const resume = await page.getByRole('link', { name: 'Download résumé' }).getAttribute('href');
  expect((await request.get(resume!)).status()).toBe(200);
  expect((await request.get('/favicon.png')).status()).toBe(200);
  await expect(page.locator('.contact-card a[href*="linkedin.com/in/zhiyuan-jia-241533295"]')).toHaveCount(1);
  await expect(page.locator('#publications a[href="https://arxiv.org/abs/2503.15878"]')).toHaveCount(1);
});

test('articles and all notes remain readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4322/');
  await expect(page.locator('.note-card')).toHaveCount(6);
  await expect(page.locator('#primary-nav')).toBeVisible();
  await page.goto('http://127.0.0.1:4322/notes/notes-on-optimization/');
  await expect(page.locator('.katex-display')).toHaveCount(4);
  await expect(page.locator('.katex-error')).toHaveCount(0);
  await context.close();
});

test('annotations: compact headings, contact, monthly news, and aligned resume at 919px', async ({ page }) => {
  await page.setViewportSize({ width: 919, height: 859 });
  await page.goto('/');
  await expect(page.locator('#contact-heading')).toHaveText('Contact');
  await expect(page.locator('.portrait-frame figcaption, .contact-card img')).toHaveCount(0);
  await expect(page.locator('.contact-card svg')).toHaveCount(3);
  await expect(page.locator('.news time')).toHaveText(['Sep 2026', 'Jun 2026', 'Mar 2025']);
  await expect(page.locator('.numbered-heading h2')).toHaveText(['01 / Research', '02 / Projects', '03 / Experience', '04 / Publications', '05 / Notes']);
  await expect(page.locator('.research-row .eyebrow, .research-art>span, .fine-print')).toHaveCount(0);
  await expect(page.locator('#note-status')).toHaveText('6 notes');
  await expect(page.locator('.last-updated')).toContainText('Sep 16, 2026');
  const affiliation = await page.locator('.affiliation').boundingBox();
  const resume = await page.locator('.hero-actions .button').boundingBox();
  expect(resume!.x).toBeGreaterThan(affiliation!.x + affiliation!.width);
  expect(Math.abs(resume!.y + resume!.height / 2 - affiliation!.y - affiliation!.height / 2)).toBeLessThan(2);
});
test('linked research, project, experience, and publication cards share the correct notes', async ({ page, request }) => {
  await page.goto('/');
  const expected = [
    ['#llm-sparsity', '/notes/llm-sparsity/'],
    ['#guided-sampling', '/notes/guided-llm-sampling/'],
    ['#quantum-optimization', '/notes/quantum-hamiltonian-descent/'],
    ['.project-card', '/notes/ai-art-detection/'],
    ['.timeline-row:nth-child(1)', '/notes/guided-llm-sampling/'],
    ['.timeline-row:nth-child(2)', '/notes/llm-sparsity/'],
    ['.timeline-row:nth-child(3)', '/notes/quantum-hamiltonian-descent/'],
    ['.publication', '/notes/quantum-hamiltonian-descent/'],
  ];
  for (const [selector, href] of expected) {
    await expect(page.locator(selector + ' .card-link')).toHaveAttribute('href', href);
    expect((await request.get(href)).status()).toBe(200);
  }
  await page.locator('#llm-sparsity').click({ position: { x: 25, y: 25 } });
  await expect(page).toHaveURL(/\/notes\/llm-sparsity\//);
  await page.locator('.back-link').first().click();
  await expect(page).toHaveURL(/#research$/);
  const arxiv = page.locator('.publication .tag-link');
  await expect(arxiv).toHaveAttribute('href', 'https://arxiv.org/abs/2503.15878');
  await expect(arxiv).toHaveAttribute('target', '_blank');
  expect(await arxiv.evaluate(el => getComputedStyle(el).zIndex)).toBe('2');
});
test('whole note card opens article and restores exact position repeatedly, including browser back', async ({ page }) => {
  await page.goto('/?sort=asc#notes');
  await page.locator('.note-card').nth(2).scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => scrollY);
  for (let visit = 0; visit < 2; visit++) {
    await page.locator('.note-card').nth(2).click({ position: { x: 20, y: 20 } });
    await expect(page.locator('.prose')).toBeVisible();
    await page.locator('.back-link').first().click();
    await expect(page.locator('#note-sort')).toHaveAttribute('data-order', 'asc');
    await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(y, 0);
  }
  await page.locator('.note-card').nth(2).click({ position: { x: 20, y: 20 } });
  await page.goBack();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(y, 0);
});
