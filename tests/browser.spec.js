import { test as base, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const pages = ['index.html', 'about.html', 'produk.html', 'hexohm.html', 'news.html', 'kontak.html', 'faq.html'];

const test = base.extend({
  networkAudit: [async ({ context, page, baseURL }, use, testInfo) => {
    const origin = new URL(baseURL).origin;
    const errors = [];
    const external = [];
    const writes = [];
    const missing = [];
    const failed = [];
    const allowedFailures = new Set();
    page.on('pageerror', (error) => errors.push(error.stack || error.message));
    context.on('requestfailed', (request) => {
      const url = new URL(request.url());
      if (url.origin === origin) failed.push({ path: url.pathname, error: request.failure()?.errorText });
    });
    context.on('response', (response) => {
      if (new URL(response.url()).origin === origin && response.status() >= 400) missing.push(`${response.status()} ${response.url()}`);
    });
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (!['http:', 'https:'].includes(url.protocol)) return route.continue();
      if (!['GET', 'HEAD'].includes(request.method())) {
        writes.push(`${request.method()} ${url.href}`);
        return route.abort('blockedbyclient');
      }
      if (url.origin !== origin) {
        external.push(url.href);
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    await use({ errors, external, writes, missing, failed, allowedFailures });
    await testInfo.attach('network-audit', {
      body: JSON.stringify({ errors, blockedExternalRequests: [...new Set(external)], blockedWrites: writes, missingLocalResources: [...new Set(missing)], failedLocalRequests: failed }, null, 2),
      contentType: 'application/json',
    });
    expect(errors, 'Uncaught browser errors').toEqual([]);
    expect(missing, 'Missing local resources').toEqual([]);
    expect(failed.filter((request) => !allowedFailures.has(request.path)), 'Unexpected failed local requests').toEqual([]);
    expect(writes, 'No form submission or other write may be attempted').toEqual([]);
  }, { auto: true }],
});

async function openPage(page, pathname) {
  await page.goto(`/${pathname}`, { waitUntil: 'load' });
  await expect(page.locator('#navbar')).toBeVisible();
  await expect(page.locator('#navbar a[aria-current="page"]')).toHaveCount(pathname === 'faq.html' ? 0 : 1);
}

async function assertNoOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    width: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.width + 1);
  expect(dimensions.body, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.width + 1);
}

for (const pathname of pages) {
  test(`${pathname}: local resources, images, navigation and inactive forms`, async ({ page }) => {
    await openPage(page, pathname);
    if (pathname !== 'faq.html') {
      const current = page.locator('#navbar a[aria-current="page"]');
      expect(new URL(await current.getAttribute('href'), page.url()).pathname).toBe(`/${pathname}`);
      await expect(current).toHaveClass(/active/);
    }
    const duplicateIDs = await page.locator('[id]').evaluateAll((elements) => {
      const seen = new Set();
      return elements.map((element) => element.id).filter((id) => seen.has(id) || !seen.add(id));
    });
    expect(duplicateIDs).toEqual([]);

    const images = page.locator('img');
    for (let index = 0; index < await images.count(); index += 1) {
      const image = images.nth(index);
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0), {
        message: `Image failed to load: ${await image.getAttribute('src')}`,
      }).toBe(true);
    }

    const forms = page.locator('form');
    for (let index = 0; index < await forms.count(); index += 1) {
      const form = forms.nth(index);
      await expect(form.locator('input:not([type="hidden"]), textarea, button')).not.toHaveCount(0);
      for (const control of await form.locator('input, textarea, select, button').all()) await expect(control).toBeDisabled();
      expect(await form.getAttribute('action')).toBeNull();
    }
    await expect(page.getByText('Pendaftaran newsletter belum tersedia. Data tidak dikirim.', { exact: true })).toBeVisible();
    if (pathname === 'kontak.html') await expect(page.getByText('Formulir ini belum terhubung ke layanan pengiriman. Pesan tidak akan dikirim.', { exact: true })).toBeVisible();
    await assertNoOverflow(page);
  });

  test(`${pathname}: fits 320px, 390px and 768px viewports`, async ({ page }) => {
    await openPage(page, pathname);
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await assertNoOverflow(page);
      const toggle = page.locator('.mobile-nav-toggle');
      await expect(toggle).toBeVisible();
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await assertNoOverflow(page);
      await page.keyboard.press('Escape');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    }
  });
}

test('the directory root marks Home as the current navigation item', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  const current = page.locator('#navbar a[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAttribute('href', 'index.html');
  await expect(current).toHaveClass(/active/);
});

test('the mobile menu supports keyboard activation, Escape and desktop resize', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page, 'index.html');
  const toggle = page.getByRole('button', { name: /menu/i });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#navbar')).toHaveClass(/navbar-mobile/);
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('.mobile-nav-toggle')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.mobile-nav-toggle')).toBeHidden();
  await expect(page.locator('#navbar')).not.toHaveClass(/navbar-mobile/);
});

test('existing hero carousel controls change slides and expose working indicators', async ({ page }) => {
  for (const pathname of ['index.html', 'about.html', 'produk.html', 'hexohm.html', 'news.html', 'kontak.html']) {
    await openPage(page, pathname);
    const carousel = page.locator('#heroCarousel');
    const slides = carousel.locator('.carousel-item');
    const count = await slides.count();
    if (count < 2) continue;
    await carousel.evaluate((element) => window.bootstrap.Carousel.getOrCreateInstance(element).pause());
    await expect(carousel.locator('.carousel-indicators [data-bs-slide-to]')).toHaveCount(count);
    await carousel.locator('[data-bs-slide="next"]').click();
    await expect(slides.nth(1)).toHaveClass(/active/);
    await carousel.locator('[data-bs-slide="prev"]').click();
    await expect(slides.nth(0)).toHaveClass(/active/);
  }
});

test('empty, placeholder and missing scroll targets do not throw', async ({ page }) => {
  const source = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const anchors = '<a class="scrollto" id="test-empty" href="">Empty</a><a class="scrollto" id="test-hash" href="#">Top</a><a class="scrollto" id="test-missing" href="#missing-test-target">Missing</a>';
  const html = source.replace(/(<script\s+src=["']assets\/js\/main\.js["'])/, `${anchors}$1`);
  expect(html).not.toBe(source);
  await page.route('**/index.html', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await openPage(page, 'index.html');
  for (const id of ['test-empty', 'test-hash', 'test-missing']) {
    await page.locator(`#${id}`).evaluate((element) => {
      element.addEventListener('click', (event) => event.preventDefault(), { once: true });
      element.click();
    });
  }
});

test('page content stays readable when the optional animation script fails to load', async ({ page, networkAudit }) => {
  networkAudit.allowedFailures.add('/assets/vendor/aos/aos.js');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/assets/vendor/aos/aos.js', (route) => route.abort('failed'));
  await openPage(page, 'index.html');
  const content = page.locator('main [data-aos]');
  await expect(content).not.toHaveCount(0);
  const invisible = await content.evaluateAll((elements) => elements
    .filter((element) => getComputedStyle(element).opacity !== '1' || getComputedStyle(element).visibility === 'hidden')
    .map((element) => element.tagName + '.' + element.className));
  expect(invisible, 'Animation failures must not hide static page content').toEqual([]);
});

test('FAQ answers expand and collapse using the keyboard', async ({ page }) => {
  await openPage(page, 'faq.html');
  const question = page.locator('.faq-question').nth(1);
  const answer = page.locator(await question.getAttribute('data-bs-target'));
  await expect(question).toHaveAttribute('aria-expanded', 'false');
  await expect(answer).not.toBeVisible();
  await question.scrollIntoViewIfNeeded();
  await question.focus();
  await page.keyboard.press('Enter');
  await expect(question).toHaveAttribute('aria-expanded', 'true');
  await expect(answer).toBeVisible();
  await page.keyboard.press('Space');
  await expect(question).toHaveAttribute('aria-expanded', 'false');
  await expect(answer).not.toBeVisible();
});

test('mobile navigation text has readable contrast against its opaque menu panel', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page, 'index.html');
  await page.getByRole('button', { name: /menu/i }).click();
  const links = page.locator('#navbar .nav-link');
  await expect(links).not.toHaveCount(0);
  for (const link of await links.all()) await expect(link).toBeVisible();
  const contrast = await page.locator('#navbar > ul').evaluate((panel) => {
    const parseColor = (value) => {
      if (!/^rgba?\(/.test(value)) throw new Error(`Unexpected computed color: ${value}`);
      const values = value.match(/[\d.]+/g).map(Number);
      return { rgb: values.slice(0, 3), alpha: values[3] ?? 1 };
    };
    const luminance = (rgb) => rgb
      .map((value) => value / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const style = getComputedStyle(panel);
    const background = parseColor(style.backgroundColor);
    const backgroundLuminance = luminance(background.rgb);
    return {
      panelAlpha: background.alpha,
      panelOpacity: Number(style.opacity),
      links: [...panel.querySelectorAll('.nav-link')].map((link) => {
        const foreground = parseColor(getComputedStyle(link).color);
        const composited = foreground.rgb.map((value, index) => value * foreground.alpha + background.rgb[index] * (1 - foreground.alpha));
        const foregroundLuminance = luminance(composited);
        return {
          label: link.textContent.trim(),
          foreground: getComputedStyle(link).color,
          background: style.backgroundColor,
          ratio: (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05),
        };
      }),
    };
  });
  await testInfo.attach('menu-contrast', { body: JSON.stringify(contrast, null, 2), contentType: 'application/json' });
  expect(contrast.panelAlpha, 'The actual menu background must be opaque').toBe(1);
  expect(contrast.panelOpacity, 'The menu panel must not fade its text').toBe(1);
  for (const link of contrast.links) expect(link.ratio, `${link.label}: ${link.foreground} on ${link.background}`).toBeGreaterThanOrEqual(4.5);
});
