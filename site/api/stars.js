// GitHub star count for the star bar. Cached at the edge for an hour, so visitors never talk to GitHub.
export const config = { runtime: 'edge' };

export default async function handler() {
  let stars = null;
  try {
    const r = await fetch('https://api.github.com/repos/upstrategylab/cookie-away', {
      headers: { 'User-Agent': 'cookieaway.com', Accept: 'application/vnd.github+json' },
    });
    if (r.ok) stars = (await r.json()).stargazers_count;
  } catch {}
  return new Response(JSON.stringify({ stars }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': stars == null ? 'no-store' : 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
