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
    const projectCards = await page.locator('.project-card').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    }));
    for (let i = 1; i < projectCards.length; i++) {
      expect(projectCards[i].top - projectCards[i - 1].bottom).toBeGreaterThanOrEqual(24);
    }
    await page.goto('/notes/webull-auto-trading/');
    await expect(page.locator('.trading-framework')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('.framework-node-live')).toContainText('Webull');
    if (width === 375 || width === 1440) {
      await page.locator('.trading-framework').screenshot({ path: test.info().outputPath(`trading-framework-${width}.png`) });
    }
    await page.goto('/notes/turboquant/');
    await expect(page.locator('.katex-display')).toHaveCount(28);
    await expect(page.locator('.katex-error')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const displays = await page.locator('.katex-display').evaluateAll(nodes => nodes.map(n => getComputedStyle(n).overflowX));
    expect(displays.every(value => value === 'auto')).toBe(true);
    await page.goto('/notes/guided-llm-sampling/');
    await expect(page.locator('.prose table')).toHaveCount(6);
    await expect(page.locator('.katex-error')).toHaveCount(0);
    expect(await page.locator('.katex-display').count()).toBeGreaterThan(10);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('.article-subtitle')).toHaveCount(0);
    await expect(page.locator('.article-meta time')).toHaveText('Mar 15, 2026');
    await expect(page.locator('.article-header .tags span')).toHaveText(['Power Sampling', 'MCMC', 'LLM']);
    await expect(page.locator('.sampling-figure img')).toHaveCount(2);
    const diagram = page.locator('.sampling-figure img').first();
    await diagram.scrollIntoViewIfNeeded();
    await expect.poll(() => diagram.evaluate(n => (n as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    if (width === 375 || width === 1440) {
      await page.screenshot({ path: test.info().outputPath(`sampling-diagram-${width}.png`) });
    }
    const figure = page.locator('.sampling-figure img').last();
    await figure.scrollIntoViewIfNeeded();
    await expect.poll(() => figure.evaluate(n => (n as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    if (width === 375 || width === 1440) {
      await page.screenshot({ path: test.info().outputPath(`sampling-figure-${width}.png`) });
      await page.getByRole('heading', { name: 'Problems 30–39: 12 MCMC steps, 12 seeds' }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: test.info().outputPath(`sampling-results-${width}.png`) });
    }
  });
}
test('search, counts, literal input, sorting, and article return state', async ({ page }) => {
  await page.goto('/#notes');
  const search = page.getByRole('searchbox');
  await expect(page.locator('.note-card')).toHaveCount(8);
  await expect(page.locator('.note-card').first()).toContainText('Sep 16, 2026');
  await page.locator('#note-sort').click();
  await expect(page.locator('.note-card').first()).toContainText('Nov 1, 2023');
  await search.fill('better reasoning');
  await expect(page.locator('.note-card')).toHaveCount(1);
  await expect(page.locator('.match-count')).toContainText('occurrence');
  await expect(page.locator('.note-excerpt')).toContainText('sampling');
  await page.locator('.note-card h3 a').click();
  await expect(page).toHaveURL(/q=better\+reasoning&sort=asc/);
  await page.goBack();
  await expect(search).toHaveValue('better reasoning');
  await page.goForward();
  await expect(page.locator('.prose')).toBeVisible();
  await page.locator('.back-link').first().click();
  await expect(search).toHaveValue('better reasoning');
  await expect(page.locator('#note-sort')).toHaveAttribute('data-order', 'asc');
  await expect(page.locator('.note-card')).toHaveCount(1);
  await search.fill('Q^{-1}');
  await expect(page.locator('.note-card')).toHaveCount(1);
  await expect(page.locator('.match-count')).toHaveText(/\d+ occurrences/);
  await search.fill('<img src=x onerror=alert(1)>');
  await expect(page.locator('#note-empty')).toBeVisible();
  await expect(page.locator('#note-list img')).toHaveCount(0);
  await search.fill('   ');
  await expect(page.locator('.note-card')).toHaveCount(8);
});
test('desktop preview titles, descriptions, and arrows share baselines', async ({ page }) => {
  for (const width of [919, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    for (const selector of ['h3', 'p', '.work-arrow']) {
      const boxes = await page.locator('.work-card ' + selector).evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().y));
      expect(Math.max(...boxes) - Math.min(...boxes)).toBeLessThan(1);
    }
    await page.locator('.selected-work').scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath(`research-previews-${width}.png`) });
  }
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
  const resume = await page.getByRole('link', { name: 'Resume Download ↓' }).getAttribute('href');
  expect((await request.get(resume!)).status()).toBe(200);
  expect((await request.get('/favicon.png')).status()).toBe(200);
  await expect(page.locator('.contact-card a[href*="linkedin.com/in/zhiyuan-jia-241533295"]')).toHaveCount(1);
  await expect(page.locator('#publications a[href="https://arxiv.org/abs/2503.15878"]')).toHaveCount(1);
});

test('articles and all notes remain readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4322/');
  await expect(page.locator('.note-card')).toHaveCount(8);
  await expect(page.locator('#primary-nav')).toBeVisible();
  await page.goto('http://127.0.0.1:4322/notes/turboquant/');
  await expect(page.locator('.katex-display')).toHaveCount(28);
  await expect(page.locator('.katex-error')).toHaveCount(0);
  await context.close();
});

test('linked research, project, experience, and publication cards share the correct notes', async ({ page, request }) => {
  await page.goto('/');
  const expected = [
    ['#llm-sparsity', '/notes/llm-sparsity/'],
    ['#guided-sampling', '/notes/guided-llm-sampling/'],
    ['#quantum-optimization', '/notes/quantum-hamiltonian-descent/'],
    ['.project-card:nth-of-type(1)', '/notes/webull-auto-trading/'],
    ['.project-card:nth-of-type(2)', '/notes/ai-art-detection/'],
    ['.project-card:nth-of-type(3)', '/notes/gptcheck/'],
    ['.project-card:nth-of-type(4)', '/notes/yourplan/'],
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
