import { GameConfig, GameId } from "@/types/game";
import { secretWorldConfig } from "./secretWorld";
import { starbreakerConfig } from "./starbreaker";

export const GAMES: Record<GameId, GameConfig> = {
  [GameId.SECRET_WORLD]: secretWorldConfig,
  [GameId.STARBREAKER]: starbreakerConfig,
};

export const getGameConfig = (gameId: GameId): GameConfig => {
  return GAMES[gameId];
};

export const getDefaultGame = (): GameConfig => {
  return secretWorldConfig;
};

export { GameId } from "@/types/game";
export type { GameConfig } from "@/types/game";
