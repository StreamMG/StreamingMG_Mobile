// components/index.ts — StreamMG
// Exports centralisés — importer depuis '@/components' plutôt que les chemins directs

// UI atomiques
export { Badge } from './ui/Badge';
export type { BadgeProps, AccessType } from './ui/Badge';

export { StarRating } from './ui/StarRating';
export type { StarRatingProps } from './ui/StarRating';

export { ProgressBar } from './ui/ProgressBar';
export type { ProgressBarProps } from './ui/ProgressBar';

// Contenu
export { ContentCard } from './content/ContentCard';
export type { ContentCardProps, ContentItem } from './content/ContentCard';

export { HeroBanner } from './content/HeroBanner';
export type { HeroBannerProps, HeroContent } from './content/HeroBanner';

export { SectionRow } from './content/SectionRow';
export type { SectionRowProps } from './content/SectionRow';
