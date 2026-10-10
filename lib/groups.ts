/** FPSC CSS optional groups (CE-2016 onwards). A candidate picks one subject from each group. */
export const OPTIONAL_GROUPS: { id: number; marks: number; slugs: string[] }[] = [
  {
    id: 1,
    marks: 200,
    slugs: ["accountancy-and-auditing", "economics", "computer-science", "political-science", "international-relations"],
  },
  {
    id: 2,
    marks: 200,
    slugs: ["physics", "chemistry", "applied-mathematics", "pure-mathematics", "statistics", "geology"],
  },
  {
    id: 3,
    marks: 100,
    slugs: ["business-administration", "public-administration", "governance-and-public-policies", "town-planning-and-urban-management"],
  },
  {
    id: 4,
    marks: 100,
    slugs: ["history-of-pakistan-and-india", "islamic-history-and-culture", "islamic-history", "british-history", "european-history", "history-of-usa"],
  },
  {
    id: 5,
    marks: 100,
    slugs: [
      "gender-studies",
      "environmental-sciences",
      "agriculture-and-forestry",
      "botany",
      "zoology",
      "english-literature",
      "urdu-literature",
      "arabic",
      "persian",
      "punjabi",
      "sindhi",
      "pashto",
      "balochi",
    ],
  },
  {
    id: 6,
    marks: 100,
    slugs: ["law", "constitutional-law", "international-law", "muslim-law-and-jurisprudence", "mercantile-law", "criminology", "philosophy"],
  },
  {
    id: 7,
    marks: 100,
    slugs: ["journalism-and-mass-communication", "psychology", "geography", "sociology", "anthropology"],
  },
];

const GROUP_OF = new Map<string, number>();
for (const group of OPTIONAL_GROUPS) {
  for (const slug of group.slugs) GROUP_OF.set(slug, group.id);
}

export function optionalGroupOf(slug: string) {
  return GROUP_OF.get(slug) ?? null;
}
