import { Card, Suit, Rank, GeneratedMission } from "@/types/mission";
import { MissionData } from "@/types/game";
import { generateMission } from "./missionGenerator";

// Convert card to short string (e.g., "2H" for 2 of Hearts)
export function encodeCard(card: Card): string {
  const suitCodes = {
    [Suit.HEARTS]: "H",
    [Suit.DIAMONDS]: "D",
    [Suit.CLUBS]: "C",
    [Suit.SPADES]: "S",
  };
  return `${card.rank}${suitCodes[card.suit]}`;
}

// Convert short string back to Card
export function decodeCard(encoded: string): Card | null {
  if (!encoded || encoded.length < 2) return null;

  const suitChar = encoded[encoded.length - 1];
  const rank = encoded.slice(0, -1) as Rank;

  const suitMap: Record<string, Suit> = {
    H: Suit.HEARTS,
    D: Suit.DIAMONDS,
    C: Suit.CLUBS,
    S: Suit.SPADES,
  };

  const suit = suitMap[suitChar];
  if (!suit) return null;

  // Validate rank
  const validRanks = Object.values(Rank);
  if (!validRanks.includes(rank)) return null;

  return { suit, rank };
}

// Encode entire mission to URL-friendly string
export function encodeMission(mission: GeneratedMission): string {
  const primaryCards = [
    mission.location.card,
    mission.goal.card,
    mission.object.card,
    mission.obstacle.card,
    mission.twist.card,
  ];

  const additionalCards: Card[] = [];

  // Collect all additional cards in order
  [
    ...(mission.additionalLocations || []),
    ...(mission.additionalGoals || []),
    ...(mission.additionalObjects || []),
    ...(mission.additionalObstacles || []),
  ].forEach((elem) => {
    additionalCards.push(elem.card.card);
  });

  const allCards = [...primaryCards, ...additionalCards];
  const encoded = allCards.map(encodeCard).join(",");

  return encoded;
}

// Decode URL string back to mission
export function decodeMission(encoded: string, missionData: MissionData): GeneratedMission | null {
  if (!encoded) return null;

  const cardStrings = encoded.split(",");
  if (cardStrings.length < 5) return null;

  const cards = cardStrings.map(decodeCard).filter((c): c is Card => c !== null);
  if (cards.length < 5) return null;

  const primaryCards = cards.slice(0, 5);
  const additionalCards = cards.slice(5);

  return generateMission(primaryCards, missionData, additionalCards.length > 0 ? additionalCards : undefined);
}

// Generate shareable URL for current mission
export function generateShareableUrl(mission: GeneratedMission, baseUrl: string): string {
  const encoded = encodeMission(mission);
  return `${baseUrl}?cards=${encoded}`;
}
