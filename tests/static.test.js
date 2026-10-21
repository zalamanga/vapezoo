import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const pages = ['index.html', 'about.html', 'produk.html', 'hexohm.html', 'news.html', 'kontak.html', 'faq.html'];
const documents = new Map(await Promise.all(pages.map(async (file) => [file, (await readFile(path.join(root, file), 'utf8')).replace(/<!--[\s\S]*?-->/g, '')])));
const localOrigin = 'http://static.invalid';
const directoryEntries = new Map();

function localURL(reference, source) {
  if (!reference || /^(?:data:|mailto:|tel:|javascript:)/i.test(reference)) return null;
  const url = new URL(reference.replaceAll('&amp;', '&'), `${localOrigin}/${source}`);
  return url.origin === localOrigin ? url : null;
}

async function exactFile(relative) {
  const parts = relative.split('/').filter(Boolean);
  let directory = root;
  for (const part of parts) {
    if (!directoryEntries.has(directory)) directoryEntries.set(directory, readdir(directory, { withFileTypes: true }));
    const entries = await directoryEntries.get(directory);
    const entry = entries.find((candidate) => candidate.name === part);
    assert.ok(entry, `Missing file or filename case mismatch: ${relative}`);
    directory = path.join(directory, part);
  }
}

function ids(html) {
  return [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
}

test('the seven pages contain unique element IDs', () => {
  for (const [file, html] of documents) {
    assert.match(html, /<!doctype html>/i, file);
    assert.match(html, /<meta\s+charset=["']utf-8["']/i, file);
    const values = ids(html);
    assert.equal(new Set(values).size, values.length, `${file}: duplicate element IDs`);
  }
});

test('local HTML assets resolve with portable filename casing', async () => {
  for (const [file, html] of documents) {
    const refs = [...html.matchAll(/<(?:script|img|link|iframe)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
    const inlineImages = [...html.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gi)].map((match) => match[1]);
    for (const ref of [...refs, ...inlineImages]) {
      const url = localURL(ref, file);
      if (url) await exactFile(decodeURIComponent(url.pathname));
    }
  }
});

test('local links and fragment targets point to real pages and elements', async () => {
  for (const [file, html] of documents) {
    for (const match of html.matchAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"']*)["']/gi)) {
      const url = localURL(match[1], file);
      if (!url) continue;
      const target = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html';
      await exactFile(target);
      if (url.hash.length > 1) {
        const targetHTML = documents.get(target);
        assert.ok(targetHTML, `${file}: expected HTML fragment target: ${match[1]}`);
        assert.ok(ids(targetHTML).includes(decodeURIComponent(url.hash.slice(1))), `${file}: missing fragment target ${match[1]}`);
      }
    }
  }
});

test('stylesheet image and font files resolve with portable filename casing', async () => {
  async function walk(directory) {
    const output = [];
    for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
      const relative = path.posix.join(directory, entry.name);
      if (entry.isDirectory()) output.push(...await walk(relative));
      else if (entry.name.endsWith('.css')) output.push(relative);
    }
    return output;
  }
  for (const file of await walk('assets')) {
    const css = (await readFile(path.join(root, file), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const match of css.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gi)) {
      const url = localURL(match[1], file);
      if (url && !match[1].startsWith('#')) await exactFile(decodeURIComponent(url.pathname));
    }
  }
});
