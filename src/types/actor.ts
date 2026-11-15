export interface EnhancedActorProfile {
  name: string;
  canonicalName?: string;
  englishName?: string;
  title: string;
  description?: string;
  extract?: string;
  thumbnail?: string;
  wikiUrl?: string;
  birthday?: string;
  formattedBirthday?: string | null;
  deathday?: string;
  age?: string | null;
  placeOfBirth?: string;
  country?: string;
  roles?: string;
  tags?: string[];
  slug?: string;
  notFound?: boolean;
}

export interface ActorProfile {
  name: string;
  aliases: string[];
  country: string;
}
