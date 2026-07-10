# specdrift.omercelik.dev

Landing page and documentation for [specdrift](https://github.com/omercelikdev/specdrift) — deterministic
spec lint for manifest-driven golden paths.

Built with [Astro](https://astro.build/) + [Starlight](https://starlight.astro.build/), styled with the
shared `omercelik.dev` design system, and deployed to Cloudflare Pages.

## Develop

```bash
npm install
npm run dev      # http://localhost:4321
```

## Build

```bash
npm run build    # -> dist/
npm run preview
```

## Structure

```
src/
  content/docs/         one Markdown/MDX file per page; the sidebar is defined in astro.config.mjs
  styles/specdrift.css  design tokens mapped onto Starlight's CSS variables
  assets/logo.svg
astro.config.mjs        site metadata, sidebar, integrations
```

## Deployment

Cloudflare Pages, project `specdrift-omercelik-dev`:

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 22 (see `.nvmrc`) |

Pushes to `main` deploy to production; other branches get preview URLs.

## License

The documentation content is MIT, like specdrift itself.
