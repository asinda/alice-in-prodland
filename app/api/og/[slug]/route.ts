// app/api/og/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPost } from '@/lib/posts'
import { generateSocialImage } from '@/lib/social-image'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const post = await getPost(slug)
    const buffer = await generateSocialImage({ title: post.title, tags: post.tags })
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
