export type HomepageSectionKey = "hero" | "selection";

interface BaseHomepageSection {
  sectionKey: HomepageSectionKey;
  imageUrl: string;
  imageAlt: string;
  eyebrow: string;
  headline: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  imageManaged: boolean;
}

export interface HomepageHeroSection extends BaseHomepageSection {
  sectionKey: "hero";
}

export interface HomepageSelectionSection extends BaseHomepageSection {
  sectionKey: "selection";
  kicker: string;
  subheadline: string;
}

export interface HomepageContent {
  hero: HomepageHeroSection;
  selection: HomepageSelectionSection;
}

