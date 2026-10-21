export interface Searchable {
  label: string;
  keywords?: string[];
}

function toWords(text: string) {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function matchScore(
  query: string,
  { label, keywords = [] }: Searchable,
): number {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return 0;
  }
  const normalizedLabel = label.toLowerCase();
  const labelWords = toWords(label);
  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());
  const keywordWords = keywords.flatMap(toWords);

  let score = 0;
  for (const token of normalizedQuery.split(/\s+/)) {
    let best = 0;
    if (labelWords.includes(token)) {
      best = 30;
    } else if (labelWords.some((word) => word.startsWith(token))) {
      best = 20;
    } else if (keywordWords.includes(token)) {
      best = 15;
    } else if (normalizedLabel.includes(token)) {
      best = 12;
    } else if (keywordWords.some((word) => word.startsWith(token))) {
      best = 10;
    } else if (normalizedKeywords.some((keyword) => keyword.includes(token))) {
      best = 6;
    }
    if (best === 0) {
      return 0;
    }
    score += best;
  }

  if (normalizedLabel === normalizedQuery) {
    score += 50;
  } else if (normalizedLabel.startsWith(normalizedQuery)) {
    score += 25;
  }
  return score;
}
