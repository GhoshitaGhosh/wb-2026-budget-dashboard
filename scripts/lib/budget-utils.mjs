import crypto from 'node:crypto';

export const THOUSAND_RUPEES_PER_CRORE = 10_000;

export function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export function stableId(prefix, ...parts) {
  const readable = slugify(parts[parts.length - 1]).slice(0, 52) || prefix;
  const hash = crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 8);
  return `${prefix}-${readable}-${hash}`;
}

export function lakhRupeesToThousand(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value) * 100) : null;
}

export function croreToThousand(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value) * THOUSAND_RUPEES_PER_CRORE) : null;
}

export function thousandToCrore(value) {
  return Number(value) / THOUSAND_RUPEES_PER_CRORE;
}

export function parseLegacyOutlay(value) {
  const text = String(value || '').trim();
  if (!text) return { status: 'unmatched', announcedAmountThousand: null, displayNote: '' };
  const match = text.replace(/,/g, '').match(/(?:₹|Rs\.?\s*)?([0-9]+(?:\.[0-9]+)?)\s*(crore|lakh)/i);
  if (!match) return { status: 'not_stated', announcedAmountThousand: null, displayNote: text };
  const amount = Number(match[1]);
  const announcedAmountThousand = match[2].toLowerCase() === 'crore'
    ? croreToThousand(amount)
    : Math.round(amount * 100);
  return { status: amount === 0 ? 'zero' : 'stated', announcedAmountThousand, displayNote: text };
}

export function normaliseTag(tag) {
  const aliases = new Map([
    ['IT', 'Digital & Technology'],
    ['IT & Tech', 'Digital & Technology'],
    ['Technology', 'Digital & Technology'],
    ['Digital India', 'Digital & Technology'],
    ['e Governance', 'Digital Governance'],
    ['Law And Order', 'Law & Order'],
    ['Industries', 'Industry & MSME'],
    ['Industry', 'Industry & MSME'],
    ['MSME', 'Industry & MSME'],
    ['Healthcare', 'Health'],
    ['Public Safety', 'Safety & Security'],
    ['Security', 'Safety & Security'],
    ['Tribal Welfare', 'SC/ST & Tribal Welfare'],
    ['Tribal Development', 'SC/ST & Tribal Welfare'],
    ['SC/ST Welfare', 'SC/ST & Tribal Welfare'],
    ['Women Empowerment', 'Women & Gender'],
    ['Gender Budget', 'Women & Gender'],
    ['Youth Development', 'Youth'],
    ['Renewable Energy', 'Energy & Climate'],
    ['Energy', 'Energy & Climate'],
  ]);
  return aliases.get(tag) || tag;
}

export function csvEscape(value) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
