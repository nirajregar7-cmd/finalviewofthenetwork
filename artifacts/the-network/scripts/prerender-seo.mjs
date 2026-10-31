import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const SITE_URL = 'https://the-network.co.in';
const outputDir = path.resolve('dist/public');
const apiOrigin = (process.env.SEO_API_ORIGIN || process.env.VITE_API_URL || '').replace(/\/$/, '');

const staticRoutes = [
  '/',
  '/about',
  '/founding-members',
  '/story',
  '/resources',
  '/colleges',
  '/communities',
  '/students',
  '/events',
  '/opportunities',
  '/blog',
  '/campus-ambassador',
  '/study-partners',
  '/project-teammates',
  '/jee',
  '/neet',
  '/gate',
  '/jee/study-partner',
  '/neet/study-partner',
  '/looking-for/study-partner',
  '/looking-for/project-teammate',
  '/looking-for/hackathon-team',
  '/looking-for/mentor',
  '/looking-for/dsa-partner',
];

const blogSlugs = [
  'best-hackathons-india-2025',
  'how-to-find-startup-cofounder-college',
  'placement-preparation-engineering-students',
  'top-ai-communities-india-students',
];

const opportunitySlugs = [
  'smart-india-hackathon',
  'flipkart-grid',
  'google-summer-of-code',
  'microsoft-engage',
  'amazon-sde-internship',
  'fossasia-hackathon',
  'icpc-asia',
  'tata-imagination-challenge',
  'goldman-sachs-internship',
  'adobe-gensolve',
  'scholarship-prime-minister',
  'kvpy',
];

const landingPages = [
  ['about', 'about'],
  ['story', 'story'],
  ['study-partners', 'study-partners'],
  ['project-teammates', 'project-teammates'],
  ['jee', 'jee'],
  ['neet', 'neet'],
  ['gate', 'gate'],
  ['jee/study-partner', 'jee/study-partner'],
  ['neet/study-partner', 'neet/study-partner'],
  ['looking-for/study-partner', 'looking-for/study-partner'],
  ['looking-for/project-teammate', 'looking-for/project-teammate'],
  ['looking-for/hackathon-team', 'looking-for/hackathon-team'],
  ['looking-for/mentor', 'looking-for/mentor'],
  ['looking-for/dsa-partner', 'looking-for/dsa-partner'],
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(value) {
  return escapeHtml(value);
}

function validSlug(value) {
  return typeof value === 'string' && /^[a-z0-9-]+$/.test(value);
}

function normalizeApiAssetUrl(value) {
  const raw = String(value ?? '');
  if (!raw || !apiOrigin) return raw;

  try {
    const currentApiUrl = new URL(apiOrigin);
    const assetUrl = new URL(raw);
    if (
      assetUrl.pathname.startsWith('/api/') &&
      assetUrl.hostname.endsWith('.replit.app') &&
      assetUrl.origin !== currentApiUrl.origin
    ) {
      return new URL(
        `${assetUrl.pathname}${assetUrl.search}${assetUrl.hash}`,
        currentApiUrl,
      ).toString();
    }
  } catch {
    // Preserve non-URL avatar references.
  }

  return raw;
}

async function getPublicData(resource) {
  const response = await fetch(`${apiOrigin}/api/seo/${resource}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Public SEO data /api/seo/${resource} returned HTTP ${response.status}`);
  }
  if (!(response.headers.get('content-type') || '').includes('application/json')) {
    throw new Error(`Public SEO data /api/seo/${resource} did not return JSON`);
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error(`Public SEO data /api/seo/${resource} was not an array`);
  }
  return data;
}

async function writeJson(relativePath, data) {
  const filePath = path.join(outputDir, 'seo-data', relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data)}\n`, 'utf8');
}

function schemaScript(data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

function buildHead({ title, description, canonical, schema = [] }) {
  const absoluteUrl = `${SITE_URL}${canonical}`;
  const fullTitle = title.includes('The Network') ? title : `${title} | The Network`;
  const schemaTags = schema.map(schemaScript).join('\n');
  return [
    `<title>${escapeHtml(fullTitle)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    '<meta name="robots" content="index, follow" />',
    `<link rel="canonical" href="${escapeHtml(absoluteUrl)}" />`,
    `<meta property="og:title" content="${escapeHtml(fullTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(absoluteUrl)}" />`,
    `<meta property="og:image" content="${SITE_URL}/icons/icon-512x512.png" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="The Network" />',
    '<meta property="og:locale" content="en_IN" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(fullTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${SITE_URL}/icons/icon-512x512.png" />`,
    `<meta name="twitter:url" content="${escapeHtml(absoluteUrl)}" />`,
    ...schemaTags ? [schemaTags] : [],
  ].join('\n');
}

function cleanDefaultHead(html) {
  return html
    .replace(/<title\b[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*\/?>/i, '')
    .replace(/<meta\s+name="keywords"[^>]*\/?>/i, '')
    .replace(/<meta\s+name="robots"[^>]*\/?>/i, '')
    .replace(/<link\s+rel="canonical"[^>]*\/?>/i, '')
    .replace(/<meta\s+property="og:[^"]+"[^>]*\/?>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]+"[^>]*\/?>/gi, '')
    .replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');
}

function insertHead(html, head) {
  const cleaned = cleanDefaultHead(html);
  return cleaned.replace('</head>', `${head}\n  </head>`);
}

function replaceRoot(html, body) {
  const rootOpen = '<div id="root">';
  const rootStart = html.indexOf(rootOpen);
  if (rootStart < 0) throw new Error('Built HTML is missing #root.');
  // Vite emits the module script before #root; use the final close tag to
  // preserve the complete root shell and discard only the loading fallback.
  const rootClose = html.lastIndexOf('</div>');
  if (rootClose < rootStart) throw new Error('Could not locate the closing #root element.');
  return `${html.slice(0, rootStart + rootOpen.length)}${body}${html.slice(rootClose)}`;
}

function appendInsideRoot(body, extraHtml) {
  if (!extraHtml) return body;
  const rootClose = body.lastIndexOf('</div>');
  if (rootClose < 0) return `${body}${extraHtml}`;
  return `${body.slice(0, rootClose)}${extraHtml}${body.slice(rootClose)}`;
}

async function writePage(baseHtml, route, { head, body }) {
  const htmlWithHead = head ? insertHead(baseHtml, head) : baseHtml;
  const html = replaceRoot(htmlWithHead, body);
  const relativeRoute = route === '/' ? '' : route.replace(/^\/|\/$/g, '');
  const pageFile = path.join(outputDir, relativeRoute, 'index.html');
  await fs.mkdir(path.dirname(pageFile), { recursive: true });
  await fs.writeFile(pageFile, html, 'utf8');
}

function renderListSection(title, items, renderItem) {
  if (!items.length) return '';
  return `<section class="seo-crawl-list"><h2>${escapeHtml(title)}</h2><ul>${items.map(renderItem).join('')}</ul></section>`;
}

function buildSnapshotSchema(name, description, url, type = 'WebPage') {
  return [
    {
      '@context': 'https://schema.org',
      '@type': type,
      name,
      description,
      url,
      isPartOf: { '@type': 'WebSite', name: 'The Network', url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name, item: url },
      ],
    },
  ];
}

function buildDetailBody({ breadcrumb, heading, description, facts = [], link }) {
  const factList = facts.length
    ? `<ul>${facts.map(fact => `<li>${escapeHtml(fact)}</li>`).join('')}</ul>`
    : '';
  return `<main><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="${escapeHtml(link.parentHref)}">${escapeHtml(link.parentLabel)}</a> / <span>${escapeHtml(breadcrumb)}</span></nav><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(description)}</p>${factList}<p><a href="${escapeHtml(link.parentHref)}">Browse ${escapeHtml(link.parentLabel.toLowerCase())}</a> · <a href="/communities">Explore student communities</a></p></main>`;
}

async function main() {
  let snapshotData;
  try {
    if (!apiOrigin) {
      throw new Error('SEO_API_ORIGIN or VITE_API_URL is not set');
    }
    snapshotData = await Promise.all([
      getPublicData('colleges'),
      getPublicData('communities'),
      getPublicData('events'),
      getPublicData('students'),
    ]);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(
      `[seo-prerender] Live API data is unavailable; skipping data-backed snapshots for this build. Pages will load data from the API at runtime. Reason: ${reason}`,
    );
  }
  const [collegesRaw, communitiesRaw, eventsRaw, studentsRaw] =
    snapshotData ?? [[], [], [], []];

  const colleges = collegesRaw
    .filter(item => item && validSlug(item.slug) && typeof item.name === 'string')
    .map(item => ({
      name: item.name,
      slug: item.slug,
      studentCount: Number(item.studentCount) || 0,
      communityCount: Number(item.communityCount) || 0,
    }));
  const communities = communitiesRaw
    .filter(item => item && validSlug(item.slug) && typeof item.name === 'string')
    .filter(item => item.id !== 'college-k-ramakrishnan-college-of-engineering'
      && item.name.trim().toLowerCase() !== 'k ramakrishnan college of engineering')
    .map(item => ({
      id: String(item.id || item.slug),
      name: item.name,
      slug: item.slug,
      description: String(item.description || '').slice(0, 1000),
      category: String(item.category || 'General'),
      memberCount: Number(item.memberCount) || 0,
      college: item.college || null,
    }));
  const events = eventsRaw
    .filter(item => item && item.title)
    .map(item => ({
      id: String(item.id || ''),
      title: String(item.title),
      description: String(item.description || '').slice(0, 1200),
      category: String(item.category || 'General'),
      date: String(item.date || ''),
      venue: String(item.venue || ''),
      college: String(item.college || ''),
      isOnline: Boolean(item.isOnline),
      organizer: String(item.organizer || ''),
      link: /^https?:\/\//i.test(item.link || '') ? item.link : '',
    }));
  const students = studentsRaw
    .filter(item => item && item.id && item.fullName)
    .map(item => ({
      id: String(item.id),
      fullName: String(item.fullName),
      college: String(item.college || ''),
      branch: String(item.branch || ''),
      avatar: normalizeApiAssetUrl(item.avatar),
      skills: Array.isArray(item.skills) ? item.skills.filter(skill => typeof skill === 'string').slice(0, 20) : [],
      isVerified: Boolean(item.isVerified),
    }));

  if (snapshotData) {
    await Promise.all([
      writeJson('colleges.json', colleges),
      writeJson('communities.json', communities),
      writeJson('events.json', events),
      writeJson('students.json', students),
    ]);
  }

  for (const community of communities) {
    const description = community.description || `A ${community.category.toLowerCase()} community for students across India.`;
    const snapshot = {
      ...community,
      // Student names and profiles are intentionally omitted from public static snapshots.
      members: [],
    };
    await writeJson(`community-details/${community.slug}.json`, snapshot);
    const heading = community.name;
    const title = `${heading} Community | Student Network India | The Network`;
    const pageDescription = `Join the ${heading} community on The Network. ${description.slice(0, 100)}.`;
    const body = buildDetailBody({
      breadcrumb: heading,
      heading,
      description,
      facts: [
        `${community.category} student community`,
        `${community.memberCount} members`,
        ...(community.college ? [`Community at ${community.college}`] : []),
      ],
      link: { parentHref: '/communities', parentLabel: 'Communities' },
    });
    const schema = buildSnapshotSchema(title, pageDescription, `${SITE_URL}/community/${community.slug}`, 'Organization');
    await writePage(await fs.readFile(path.join(outputDir, 'index.html'), 'utf8'), `/community/${community.slug}`, {
      head: buildHead({ title, description: pageDescription, canonical: `/community/${community.slug}`, schema }),
      body,
    });
  }

  for (const college of colleges) {
    const title = `${college.name} Student Community | The Network`;
    const description = `Connect with students from ${college.name}. Discover student communities, campus opportunities and people to learn and build with.`;
    const snapshot = {
      name: college.name,
      slug: college.slug,
      studentCount: college.studentCount,
      communityCount: college.communityCount,
      communities: [],
      recentEvents: [],
      topStudents: [],
    };
    await writeJson(`college-details/${college.slug}.json`, snapshot);
    const body = buildDetailBody({
      breadcrumb: college.name,
      heading: `${college.name} Student Community`,
      description: `Connect with ${college.studentCount} students from ${college.name}. Discover communities and opportunities across The Network.`,
      facts: [
        `${college.studentCount} students`,
        `${college.communityCount} communities`,
      ],
      link: { parentHref: '/colleges', parentLabel: 'Colleges' },
    });
    const schema = buildSnapshotSchema(title, description, `${SITE_URL}/college/${college.slug}`, 'EducationalOrganization');
    await writePage(await fs.readFile(path.join(outputDir, 'index.html'), 'utf8'), `/college/${college.slug}`, {
      head: buildHead({ title, description, canonical: `/college/${college.slug}`, schema }),
      body,
    });
  }

  const vite = await createServer({
    configFile: path.resolve('vite.config.ts'),
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: 'silent',
  });

  try {
    const moduleCache = new Map();
    const loadComponent = async file => {
      if (!moduleCache.has(file)) {
        const loaded = await vite.ssrLoadModule(file);
        moduleCache.set(file, loaded.default);
      }
      return moduleCache.get(file);
    };
    const renderComponent = async (route, component, props = {}, routePattern = null) => {
      const element = React.createElement(component, props);
      const routedElement = routePattern
        ? React.createElement(Routes, null, React.createElement(Route, { path: routePattern, element }))
        : element;
      const tree = React.createElement(
        HelmetProvider,
        null,
        React.createElement(MemoryRouter, { initialEntries: [route] }, routedElement),
      );
      const rendered = renderToString(tree);
      const bodyStart = rendered.search(/<(?:div|main|header|article|nav|section|form|h1|p|footer)\b/i);
      if (bodyStart < 0) throw new Error(`Could not render page body for ${route}`);
      return { head: rendered.slice(0, bodyStart), body: rendered.slice(bodyStart) };
    };

    const baseHtml = await fs.readFile(path.join(outputDir, 'index.html'), 'utf8');
    const routeComponents = [
      ['/', '/src/components/LandingPage.tsx', { onJoin: () => {}, onLogin: () => {} }],
      ['/resources', '/src/seo/ResourcesPage.tsx'],
      ['/colleges', '/src/seo/CollegesPage.tsx'],
      ['/communities', '/src/seo/CommunitiesPage.tsx'],
      ['/students', '/src/seo/StudentsPage.tsx'],
      ['/events', '/src/seo/EventsPage.tsx'],
      ['/opportunities', '/src/seo/OpportunitiesPage.tsx'],
      ['/blog', '/src/seo/BlogPage.tsx'],
      ['/campus-ambassador', '/src/seo/CampusAmbassadorPage.tsx'],
      ['/founding-members', '/src/seo/FoundingMembersPage.tsx'],
    ];

    for (const [route, file, props = {}] of routeComponents) {
      const component = await loadComponent(file);
      const rendered = await renderComponent(route, component, props);
      let extra = '';
      if (route === '/colleges') {
        extra = renderListSection('Browse colleges', colleges, college =>
          `<li><a href="/college/${escapeHtml(college.slug)}">${escapeHtml(college.name)}</a> — ${college.studentCount} students</li>`,
        );
      } else if (route === '/communities') {
        extra = renderListSection('Browse student communities', communities, community =>
          `<li><a href="/community/${escapeHtml(community.slug)}">${escapeHtml(community.name)}</a> — ${escapeHtml(community.category)}. ${escapeHtml(community.description)}</li>`,
        );
      } else if (route === '/events') {
        extra = renderListSection('Student events', events, event =>
          `<li><strong>${escapeHtml(event.title)}</strong> — ${escapeHtml(event.date)}. ${escapeHtml(event.description)}</li>`,
        );
      } else if (route === '/students') {
        extra = '<section><h2>Profile visibility</h2><p>This directory includes only students who have not hidden their profile from public search. Individual student profiles are not listed in the sitemap.</p></section>';
      }
      await writePage(baseHtml, route, {
        head: route === '/' ? '' : rendered.head,
        body: appendInsideRoot(rendered.body, extra),
      });
    }

    const seoLanding = await loadComponent('/src/seo/SeoLandingPage.tsx');
    for (const [routeSuffix, pageKey] of landingPages) {
      const route = `/${routeSuffix}`;
      const rendered = await renderComponent(route, seoLanding, { page: pageKey });
      await writePage(baseHtml, route, rendered);
    }

    const blogPostPage = await loadComponent('/src/seo/BlogPostPage.tsx');
    for (const slug of blogSlugs) {
      const route = `/blog/${slug}`;
      const rendered = await renderComponent(route, blogPostPage, {}, '/blog/:slug');
      await writePage(baseHtml, route, rendered);
    }

    const opportunityPage = await loadComponent('/src/seo/OpportunityPage.tsx');
    for (const slug of opportunitySlugs) {
      const route = `/opportunity/${slug}`;
      const rendered = await renderComponent(route, opportunityPage, {}, '/opportunity/:slug');
      await writePage(baseHtml, route, rendered);
    }
  } finally {
    await vite.close();
  }

  const sitemapRoutes = new Set([
    ...staticRoutes,
    ...blogSlugs.map(slug => `/blog/${slug}`),
    ...opportunitySlugs.map(slug => `/opportunity/${slug}`),
    ...colleges.map(college => `/college/${college.slug}`),
    ...communities.map(community => `/community/${community.slug}`),
  ]);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...sitemapRoutes]
    .map(route => `  <url><loc>${escapeXml(`${SITE_URL}${route}`)}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  await fs.writeFile(path.join(outputDir, 'sitemap.xml'), sitemap, 'utf8');
  console.log(`SEO prerender generated ${sitemapRoutes.size} canonical URLs, ${colleges.length} college snapshots, ${communities.length} community snapshots.`);
}

main().catch(error => {
  console.error('[seo-prerender] Failed:', error);
  process.exitCode = 1;
});
