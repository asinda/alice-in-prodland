// lib/social-image.ts
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import fs from 'fs'
import path from 'path'

export async function generateSocialImage(post: {
  title: string
  tags: string[]
}): Promise<Buffer> {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          width: '1200px',
          height: '630px',
          backgroundColor: '#0f172a',
          padding: '60px',
          justifyContent: 'space-between',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { color: '#94a3b8', fontSize: '22px', fontFamily: 'monospace' },
              children: '$ alice-in-prodland',
            },
          },
          {
            type: 'div',
            props: {
              style: {
                color: '#f1f5f9',
                fontSize: post.title.length > 60 ? '44px' : '52px',
                fontWeight: 'bold',
                lineHeight: '1.25',
                fontFamily: 'monospace',
              },
              children: post.title,
            },
          },
          {
            type: 'div',
            props: {
              style: { color: '#64748b', fontSize: '20px', fontFamily: 'monospace' },
              children: post.tags.slice(0, 4).map(t => `#${t}`).join('  '),
            },
          },
        ],
      },
    },
    { width: 1200, height: 630, fonts: [] }
  )

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })
  return Buffer.from(resvg.render().asPng())
}

export function saveSocialImage(slug: string, buffer: Buffer): string {
  const dir = path.join(process.cwd(), 'public', 'social')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, `${slug}.png`), buffer)
  return `/social/${slug}.png`
}
