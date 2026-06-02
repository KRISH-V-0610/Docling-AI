// PageMeta — per-page <title> + meta description (Track B3, SEO + a11y).
//
// Drop one at the top of any page:
//   <PageMeta title="Dashboard" description="Your projects and recent work." />
//
// Renders "<title> · Docling" (or just the brand on the home page) and a meta
// description. react-helmet-async hoists these into <head>; the last-mounted
// page wins, so each route sets its own.
import { Helmet } from 'react-helmet-async';

const BRAND = 'Docling';

export function PageMeta({ title, description }) {
  const fullTitle = title ? `${title} · ${BRAND}` : BRAND;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {/* Open Graph (link previews) — title/description mirror the page. */}
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
    </Helmet>
  );
}

export default PageMeta;
