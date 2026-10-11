export const SITE = 'https://ivforge.top';
export const SITE_NAME = 'IVXray';
export const LAST_UPDATED = '2026-10-11';
/** [ASSUMPTION] placeholder contact - change to a mailbox you actually read. */
export const CONTACT_EMAIL = 'hello@ivforge.top';

export interface Crumb {
  name: string;
  path?: string;
}

export function breadcrumbList(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.path ? { item: `${SITE}${c.path}` } : {}),
    })),
  };
}

export function webApplication(app: {
  name: string;
  path: string;
  description: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${SITE}${app.path}#app`,
    name: app.name,
    url: `${SITE}${app.path}`,
    description: app.description,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
}

export function organizationGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE}/#organization`,
        name: SITE_NAME,
        url: `${SITE}/`,
        logo: `${SITE}/icons/icon-512.png`,
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: CONTACT_EMAIL,
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        name: SITE_NAME,
        url: `${SITE}/`,
        publisher: { '@id': `${SITE}/#organization` },
      },
    ],
  };
}
