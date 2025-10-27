export enum Suit {
  HEARTS = "hearts",
  DIAMONDS = "diamonds",
  CLUBS = "clubs",
  SPADES = "spades",
}

export enum Rank {
  ACE = "A",
  TWO = "2",
  THREE = "3",
  FOUR = "4",
  FIVE = "5",
  SIX = "6",
  SEVEN = "7",
  EIGHT = "8",
  NINE = "9",
  TEN = "10",
  JACK = "J",
  QUEEN = "Q",
  KING = "K",
}

export interface Card {
  suit: Suit;
  rank: Rank;
}

export enum MissionElement {
  LOCATION = "location",
  GOAL = "goal",
  OBJECT = "object",
  OBSTACLE = "obstacle",
  TWIST = "twist",
}

export interface MissionElementCard {
  element: MissionElement;
  card: Card;
  result: string;
  id?: string;
}

export interface AdditionalDrawRequirement {
  element: MissionElement;
  reason: string;
  label?: string;
}

export interface AdditionalElement {
  card: MissionElementCard;
  requiresMoreDraws: boolean;
  additionalDrawRequirements: AdditionalDrawRequirement[];
  nestedElements?: AdditionalElement[];
}

export interface GeneratedMission {
  location: MissionElementCard;
  goal: MissionElementCard;
  object: MissionElementCard;
  obstacle: MissionElementCard;
  twist: MissionElementCard;
  additionalLocations?: AdditionalElement[];
  additionalGoals?: AdditionalElement[];
  additionalObjects?: AdditionalElement[];
  additionalObstacles?: AdditionalElement[];
  additionalDrawRequirements: AdditionalDrawRequirement[];
  createdAt: Date;
}
