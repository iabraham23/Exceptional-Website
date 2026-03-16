const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const configPath = path.join(rootDir, "seo.config.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureLeadingSlash(value) {
  if (!value) return "/";
  return value.startsWith("/") ? value : `/${value}`;
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function buildAbsoluteUrl(siteUrl, pathname) {
  const normalizedPath = ensureLeadingSlash(pathname);
  if (normalizedPath === "/") return `${siteUrl}/`;
  return `${siteUrl}${normalizedPath}`;
}

function replaceTagContent(html, pattern, replacement, filePath, label) {
  if (!pattern.test(html)) {
    throw new Error(`Missing ${label} in ${filePath}`);
  }
  return html.replace(pattern, replacement);
}

function syncHtmlPage(
  filePath,
  pageConfig,
  siteUrl,
  siteName,
  businessName,
  ogImageUrl,
  faviconUrl,
  financialServiceUrl
) {
  let html = fs.readFileSync(filePath, "utf8");

  const canonicalUrl = buildAbsoluteUrl(siteUrl, pageConfig.canonicalPath);
  const ogUrl = buildAbsoluteUrl(siteUrl, pageConfig.ogPath || pageConfig.canonicalPath);

  html = replaceTagContent(
    html,
    /<link rel="canonical" href="[^"]*">/,
    `<link rel="canonical" href="${canonicalUrl}">`,
    filePath,
    "canonical tag"
  );

  html = replaceTagContent(
    html,
    /<meta property="og:site_name" content="[^"]*">/,
    `<meta property="og:site_name" content="${siteName}">`,
    filePath,
    "og:site_name meta tag"
  );

  html = replaceTagContent(
    html,
    /<meta property="og:url" content="[^"]*">/,
    `<meta property="og:url" content="${ogUrl}">`,
    filePath,
    "og:url meta tag"
  );

  html = replaceTagContent(
    html,
    /<meta property="og:image" content="[^"]*">/,
    `<meta property="og:image" content="${ogImageUrl}">`,
    filePath,
    "og:image meta tag"
  );

  html = replaceTagContent(
    html,
    /<meta name="twitter:image" content="[^"]*">/,
    `<meta name="twitter:image" content="${ogImageUrl}">`,
    filePath,
    "twitter:image meta tag"
  );

  html = replaceTagContent(
    html,
    /<link rel="icon" type="image\/svg\+xml" href="[^"]*">/,
    `<link rel="icon" type="image/svg+xml" href="${faviconUrl}">`,
    filePath,
    "icon link tag"
  );

  html = replaceTagContent(
    html,
    /<link rel="shortcut icon" href="[^"]*">/,
    `<link rel="shortcut icon" href="${faviconUrl}">`,
    filePath,
    "shortcut icon link tag"
  );

  html = replaceTagContent(
    html,
    /("@type": "FinancialService"[\s\S]*?"name":\s*")[^"]*(")/,
    `$1${businessName}$2`,
    filePath,
    "FinancialService name field"
  );

  html = replaceTagContent(
    html,
    /("@type": "FinancialService"[\s\S]*?"url":\s*")[^"]*(")/,
    `$1${financialServiceUrl}$2`,
    filePath,
    "FinancialService url field"
  );

  html = replaceTagContent(
    html,
    /("@type": "FinancialService"[\s\S]*?"image":\s*")[^"]*(")/,
    `$1${ogImageUrl}$2`,
    filePath,
    "FinancialService image field"
  );

  const robotsPattern = /<meta name="robots" content="[^"]*">\n?/;
  const desiredRobots = pageConfig.robots || null;

  if (desiredRobots) {
    const robotsTag = `<meta name="robots" content="${desiredRobots}">`;
    if (robotsPattern.test(html)) {
      html = html.replace(robotsPattern, `${robotsTag}\n`);
    } else {
      html = html.replace(
        /(<meta name="description" content="[^"]*">\n)/,
        `$1  ${robotsTag}\n`
      );
    }
  } else {
    html = html.replace(robotsPattern, "");
  }

  fs.writeFileSync(filePath, html);
}

function buildSitemap(siteUrl, entries, defaultLastmod) {
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  entries.forEach((entry) => {
    const loc = buildAbsoluteUrl(siteUrl, entry.path);
    const lastmod = entry.lastmod || defaultLastmod;
    lines.push("  <url>");
    lines.push(`    <loc>${loc}</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    lines.push(`    <priority>${entry.priority}</priority>`);
    lines.push("  </url>");
  });

  lines.push("</urlset>");
  return `${lines.join("\n")}\n`;
}

function buildRobots(siteUrl) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

function main() {
  const config = readJson(configPath);
  const siteUrl = stripTrailingSlash(config.siteUrl);
  const siteName = config.siteName;
  const businessName = config.businessName || siteName;
  const ogImageUrl = buildAbsoluteUrl(siteUrl, config.ogImagePath);
  const faviconUrl = ensureLeadingSlash(config.faviconPath || config.ogImagePath);
  const financialServiceUrl = buildAbsoluteUrl(
    siteUrl,
    config.financialServiceUrlPath || "/"
  );

  Object.entries(config.pages).forEach(([fileName, pageConfig]) => {
    const filePath = path.join(rootDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Configured file not found: ${fileName}`);
    }
    syncHtmlPage(
      filePath,
      pageConfig,
      siteUrl,
      siteName,
      businessName,
      ogImageUrl,
      faviconUrl,
      financialServiceUrl
    );
  });

  const sitemapXml = buildSitemap(siteUrl, config.sitemap, config.defaultLastmod);
  fs.writeFileSync(path.join(rootDir, "sitemap.xml"), sitemapXml);

  const robotsTxt = buildRobots(siteUrl);
  fs.writeFileSync(path.join(rootDir, "robots.txt"), robotsTxt);

  console.log("SEO sync complete.");
}

main();
