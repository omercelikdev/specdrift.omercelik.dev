import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

// Landing (splash) + docs in one Starlight site, deployed to Cloudflare Pages.
// Same design standard as the rest of omercelik.dev — see src/styles/specdrift.css.
export default defineConfig({
  site: 'https://specdrift.omercelik.dev',
  integrations: [
    starlight({
      title: 'specdrift',
      description: 'Deterministic spec lint for manifest-driven golden paths. Schema and cross-field invariant validation, manifest-vs-repository drift detection, and an MCP server. It never calls an LLM — LLMs call it.',
      logo: { src: './src/assets/logo.svg', replacesTitle: false },
      social: {
        github: 'https://github.com/qorpe/specdrift',
      },
      customCss: ['./src/styles/specdrift.css'],
      editLink: { baseUrl: 'https://github.com/qorpe/specdrift.omercelik.dev/edit/main/' },
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Getting started', slug: 'getting-started' },
            { label: 'Why specdrift', slug: 'why-specdrift' },
            { label: 'CLI reference', slug: 'cli' },
          ],
        },
        {
          label: 'Core concepts',
          items: [
            { label: 'Schema validation', slug: 'schema-validation' },
            { label: 'Invariant rules', slug: 'invariant-rules' },
            { label: 'Drift detection', slug: 'drift-detection' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'MCP server', slug: 'mcp' },
            { label: 'CI integration', slug: 'ci' },
            { label: 'The determinism contract', slug: 'determinism' },
          ],
        },
      ],
    }),
  ],
})
