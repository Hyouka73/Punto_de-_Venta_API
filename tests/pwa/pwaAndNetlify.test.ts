import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Configuración de PWA y Netlify (F6.1)', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const netlifyTomlPath = path.join(rootDir, 'netlify.toml');
  const indexHtmlPath = path.join(rootDir, 'index.html');
  const publicDir = path.join(rootDir, 'public');

  it('debe tener un archivo netlify.toml con SPA fallback y headers de PWA', () => {
    expect(fs.existsSync(netlifyTomlPath)).toBe(true);
    const content = fs.readFileSync(netlifyTomlPath, 'utf-8');

    // Build configuration
    expect(content).toContain('publish = "dist"');
    expect(content).toContain('command = "npm run build"');

    // SPA redirect
    expect(content).toContain('from = "/*"');
    expect(content).toContain('to = "/index.html"');
    expect(content).toContain('status = 200');

    // PWA cache control
    expect(content).toContain('for = "/sw.js"');
    expect(content).toContain('Cache-Control = "no-cache, no-store, must-revalidate"');
    expect(content).toContain('for = "/manifest.webmanifest"');

    // Security headers
    expect(content).toContain('X-Frame-Options = "DENY"');
    expect(content).toContain('X-Content-Type-Options = "nosniff"');
  });

  it('debe tener los iconos necesarios para PWA en el directorio public', () => {
    expect(fs.existsSync(publicDir)).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'icon.svg'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'favicon.svg'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'apple-touch-icon.png'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'pwa-192x192.png'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'pwa-512x512.png'))).toBe(true);

    const icon192Stats = fs.statSync(path.join(publicDir, 'pwa-192x192.png'));
    const icon512Stats = fs.statSync(path.join(publicDir, 'pwa-512x512.png'));
    expect(icon192Stats.size).toBeGreaterThan(0);
    expect(icon512Stats.size).toBeGreaterThan(0);
  });

  it('debe incluir meta tags de PWA y ergonomía táctil en index.html', () => {
    expect(fs.existsSync(indexHtmlPath)).toBe(true);
    const html = fs.readFileSync(indexHtmlPath, 'utf-8');

    // PWA & mobile viewport
    expect(html).toContain('user-scalable=no');
    expect(html).toContain('name="theme-color"');
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('touch-manipulation');
  });

  it('debe generar el webmanifest con standalone y orientación portrait tras el build', () => {
    const distManifestPath = path.join(rootDir, 'dist/manifest.webmanifest');
    if (fs.existsSync(distManifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(distManifestPath, 'utf-8'));
      expect(manifest.name).toBe('POS Paletería v2');
      expect(manifest.short_name).toBe('Paletería POS');
      expect(manifest.display).toBe('standalone');
      expect(manifest.orientation).toBe('portrait');
      expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
      expect(manifest.icons.some((i: { sizes: string }) => i.sizes === '192x192')).toBe(true);
      expect(manifest.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);
    } else {
      // Si aún no se compiló dist, validamos que la configuración en vite.config.ts exista
      const viteConfig = fs.readFileSync(path.join(rootDir, 'vite.config.ts'), 'utf-8');
      expect(viteConfig).toContain('VitePWA');
      expect(viteConfig).toContain("display: 'standalone'");
      expect(viteConfig).toContain("orientation: 'portrait'");
    }
  });
});
