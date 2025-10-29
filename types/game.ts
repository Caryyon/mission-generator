import { Suit, Rank } from "./mission";

export enum GameId {
  SECRET_WORLD = "secret-world",
  STARBREAKER = "starbreaker",
}

export interface GameConfig {
  id: GameId;
  name: string;
  logo: string;
  logoAlt: string;
  tagline: string;
  copyright: string;
  studioLogo: string;
  studioUrl: string;
  primaryColor: string;
  accentColor: string;
  missionData: MissionData;
}

export interface MissionData {
  locations: Record<Rank, string>;
  locationSuitModifiers: Record<Suit, string>;
  goals: Record<Rank, string>;
  goalSuitModifiers: Record<Suit, string>;
  objects: Record<Suit, Record<Rank, string>>;
  objectSuitLabels: Record<Suit, string>;
  obstacles: Record<Rank, string>;
  obstacleSuitModifiers: Record<Suit, string>;
  twists: Record<Rank, string>;
  twistSuitModifiers: Record<Suit, string>;
}
