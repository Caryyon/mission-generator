"use client";

import { GameId, GAMES } from "@/lib/games";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GameSelectorProps {
  selectedGame: GameId;
  onGameChange: (gameId: GameId) => void;
}

export function GameSelector({ selectedGame, onGameChange }: GameSelectorProps) {
  const isStarbreaker = selectedGame === GameId.STARBREAKER;

  return (
    <Select value={selectedGame} onValueChange={(value) => onGameChange(value as GameId)}>
      <SelectTrigger className={isStarbreaker
        ? "w-[200px] border border-[#00d9ff] bg-[#1a2f47] text-[#e8f4f8]"
        : "w-[200px] border-2 border-[#b8a989] bg-white text-[#2a1810]"
      }>
        <SelectValue placeholder="Select a game" />
      </SelectTrigger>
      <SelectContent className={isStarbreaker
        ? "bg-[#1a2f47] border-[#00d9ff] text-[#e8f4f8]"
        : ""
      }>
        {Object.values(GAMES).map((game) => (
          <SelectItem
            key={game.id}
            value={game.id}
            className={isStarbreaker
              ? "text-[#e8f4f8] focus:bg-[#2a4a6a] focus:text-[#00d9ff]"
              : ""
            }
          >
            {game.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
