import { Card, Suit, Rank } from "@/types/mission";

export function createDeck(): Card[] {
  const deck: Card[] = [];
  const suits = Object.values(Suit);
  const ranks = Object.values(Rank);

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }

  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function drawCards(deck: Card[], count: number): { drawn: Card[]; remaining: Card[] } {
  const drawn = deck.slice(0, count);
  const remaining = deck.slice(count);
  return { drawn, remaining };
}

export function getCardDisplay(card: Card): string {
  const suitSymbols = {
    [Suit.HEARTS]: "♥",
    [Suit.DIAMONDS]: "♦",
    [Suit.CLUBS]: "♣",
    [Suit.SPADES]: "♠",
  };
  return `${card.rank}${suitSymbols[card.suit]}`;
}

export function getCardColor(card: Card): string {
  return card.suit === Suit.HEARTS || card.suit === Suit.DIAMONDS
    ? "#c41e3a" // Red for hearts and diamonds
    : "#2a1810"; // Black for clubs and spades
}
