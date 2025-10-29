"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card as PlayingCard, GeneratedMission, MissionElement, MissionElementCard, AdditionalElement } from "@/types/mission";
import { createDeck, shuffleDeck, drawCards, getCardDisplay, getCardColor } from "@/lib/generators/deck";
import { generateMission } from "@/lib/generators/missionGenerator";
import { encodeMission, decodeMission, decodeCard } from "@/lib/generators/missionEncoder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GameSelector } from "@/components/GameSelector";
import { getDefaultGame, getGameConfig, GameId } from "@/lib/games";
import type { GameConfig } from "@/lib/games";

export function MissionGenerator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedGame, setSelectedGame] = useState<GameId>(GameId.SECRET_WORLD);
  const [gameConfig, setGameConfig] = useState<GameConfig>(getDefaultGame());
  const [mission, setMission] = useState<GeneratedMission | null>(null);
  const [deck, setDeck] = useState<PlayingCard[]>([]);
  const [showAdditionalDrawPrompt, setShowAdditionalDrawPrompt] = useState(false);
  const [pendingNestedDraws, setPendingNestedDraws] = useState<Map<string, number>>(new Map());
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // Handle game selection changes
  const handleGameChange = (newGameId: GameId) => {
    setSelectedGame(newGameId);
    setGameConfig(getGameConfig(newGameId));
    // Clear mission when switching games
    setMission(null);
    setDeck([]);
    router.push(`?game=${newGameId}`, { scroll: false });
  };

  // Load game from URL on mount
  useEffect(() => {
    const gameParam = searchParams.get("game");
    if (gameParam && Object.values(GameId).includes(gameParam as GameId)) {
      const gameId = gameParam as GameId;
      setSelectedGame(gameId);
      setGameConfig(getGameConfig(gameId));
    }
  }, []);

  // Load mission from URL on mount
  useEffect(() => {
    const cardsParam = searchParams.get("cards");
    const gameParam = searchParams.get("game");

    // Only load mission if the game parameter matches the selected game
    if (cardsParam && gameParam === selectedGame) {
      const loadedMission = decodeMission(cardsParam, gameConfig.missionData, gameConfig.elements);
      if (loadedMission) {
        setMission(loadedMission);

        // Create a fresh deck for redraws, removing the cards already used
        const fullDeck = createDeck();
        const usedCards = cardsParam.split(",").map(decodeCard).filter((c): c is PlayingCard => c !== null);

        // Filter out used cards from deck
        const availableDeck = fullDeck.filter(
          (deckCard) =>
            !usedCards.some(
              (usedCard) => usedCard.suit === deckCard.suit && usedCard.rank === deckCard.rank
            )
        );
        setDeck(shuffleDeck(availableDeck));

        // Only show additional draw prompt if:
        // 1. There are requirements AND
        // 2. The additional elements haven't been drawn yet
        const hasAdditionalElements =
          (loadedMission.additionalLocations?.length || 0) > 0 ||
          (loadedMission.additionalGoals?.length || 0) > 0 ||
          (loadedMission.additionalObjects?.length || 0) > 0 ||
          (loadedMission.additionalObstacles?.length || 0) > 0;

        const shouldShowPrompt = loadedMission.additionalDrawRequirements.length > 0 && !hasAdditionalElements;
        setShowAdditionalDrawPrompt(shouldShowPrompt);

        // Check for pending nested draws
        const newPendingDraws = new Map<string, number>();
        [
          ...(loadedMission.additionalLocations || []),
          ...(loadedMission.additionalGoals || []),
          ...(loadedMission.additionalObjects || []),
          ...(loadedMission.additionalObstacles || []),
        ].forEach((elem) => {
          if (elem.requiresMoreDraws && elem.card.id) {
            newPendingDraws.set(elem.card.id, elem.additionalDrawRequirements.length);
          }
        });
        setPendingNestedDraws(newPendingDraws);
      }
    } else if (!gameParam || gameParam !== selectedGame) {
      // Clear mission if game parameter doesn't match
      setMission(null);
      setDeck([]);
    }
  }, [searchParams, selectedGame, gameConfig.missionData]);

  const updateMissionUrl = (newMission: GeneratedMission) => {
    const encoded = encodeMission(newMission);
    router.push(`?game=${selectedGame}&cards=${encoded}`, { scroll: false });
  };

  const generateNewMission = () => {
    const newDeck = shuffleDeck(createDeck());
    const cardCount = gameConfig.elements.length;
    const { drawn, remaining } = drawCards(newDeck, cardCount);
    const newMission = generateMission(drawn, gameConfig.missionData, [], gameConfig.elements);
    setMission(newMission);
    setDeck(remaining);
    setShowAdditionalDrawPrompt(newMission.additionalDrawRequirements.length > 0);
    setPendingNestedDraws(new Map());
    updateMissionUrl(newMission);
  };

  const shareMission = async () => {
    if (!mission) return;

    const url = `${window.location.origin}?cards=${encodeMission(mission)}`;

    try {
      await navigator.clipboard.writeText(url);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 3000);
    } catch (err) {
      // Fallback: show URL in alert
      alert(`Copy this URL to share:\n\n${url}`);
    }
  };

  const drawAdditionalElements = () => {
    if (!mission) return;

    const numRequired = mission.additionalDrawRequirements.length;
    const { drawn, remaining } = drawCards(deck, numRequired);

    const cards = [mission.location.card, mission.goal.card, mission.object.card];
    if (gameConfig.elements.includes(MissionElement.OBSTACLE)) cards.push(mission.obstacle.card);
    if (gameConfig.elements.includes(MissionElement.TWIST)) cards.push(mission.twist.card);

    const updatedMission = generateMission(
      cards,
      gameConfig.missionData,
      drawn,
      gameConfig.elements
    );

    setMission(updatedMission);
    setDeck(remaining);
    setShowAdditionalDrawPrompt(false);
    updateMissionUrl(updatedMission);

    // Check if any newly drawn additional elements require more draws
    const newPendingDraws = new Map<string, number>();
    [
      ...(updatedMission.additionalLocations || []),
      ...(updatedMission.additionalGoals || []),
      ...(updatedMission.additionalObjects || []),
      ...(updatedMission.additionalObstacles || []),
    ].forEach((elem) => {
      if (elem.requiresMoreDraws && elem.card.id) {
        newPendingDraws.set(elem.card.id, elem.additionalDrawRequirements.length);
      }
    });
    setPendingNestedDraws(newPendingDraws);
  };

  const drawNestedElements = (elementId: string) => {
    if (!mission) return;

    const numRequired = pendingNestedDraws.get(elementId) || 0;
    if (numRequired === 0) return;

    const { drawn, remaining } = drawCards(deck, numRequired);

    // Find the element that needs nested draws
    const allAdditional = [
      ...(mission.additionalLocations || []),
      ...(mission.additionalGoals || []),
      ...(mission.additionalObjects || []),
      ...(mission.additionalObstacles || []),
    ];

    const targetElement = allAdditional.find((elem) => elem.card.id === elementId);
    if (!targetElement) return;

    // Generate nested elements for this additional element
    targetElement.nestedElements = drawn.map((card, idx) => {
      const element = generateMission([card], gameConfig.missionData, [], gameConfig.elements)[targetElement.card.element];
      return {
        card: element,
        requiresMoreDraws: false,
        additionalDrawRequirements: [],
      };
    });

    const updatedMission = { ...mission };
    setMission(updatedMission);
    setDeck(remaining);
    updateMissionUrl(updatedMission);

    // Remove this from pending draws
    const newPendingDraws = new Map(pendingNestedDraws);
    newPendingDraws.delete(elementId);
    setPendingNestedDraws(newPendingDraws);
  };

  const redrawElement = (elementId: string) => {
    if (!mission || deck.length < 1) return;

    const { drawn: newCards, remaining } = drawCards(deck, 1);
    if (newCards.length === 0) return;

    const newCard = newCards[0];

    // Handle primary elements
    if (elementId.startsWith("primary-")) {
      const cards = [
        mission.location.card,
        mission.goal.card,
        mission.object.card,
        mission.obstacle.card,
        mission.twist.card,
      ];

      const elementIndex = {
        "primary-location": 0,
        "primary-goal": 1,
        "primary-object": 2,
        "primary-obstacle": 3,
        "primary-twist": 4,
      };

      const index = elementIndex[elementId as keyof typeof elementIndex];
      if (index !== undefined) {
        cards[index] = newCard;

        // Preserve existing additional elements
        const existingAdditionalCards: PlayingCard[] = [];
        [
          ...(mission.additionalLocations || []),
          ...(mission.additionalGoals || []),
          ...(mission.additionalObjects || []),
          ...(mission.additionalObstacles || []),
        ].forEach((elem) => {
          existingAdditionalCards.push(elem.card.card);
        });

        const newMission = generateMission(cards, gameConfig.missionData, existingAdditionalCards, gameConfig.elements);
        setMission(newMission);
        setDeck(remaining);
        setShowAdditionalDrawPrompt(newMission.additionalDrawRequirements.length > 0);
        updateMissionUrl(newMission);
      }
    } else {
      // Handle additional elements - just swap the card
      const allAdditional = [
        ...(mission.additionalLocations || []),
        ...(mission.additionalGoals || []),
        ...(mission.additionalObjects || []),
        ...(mission.additionalObstacles || []),
      ];

      const targetElement = allAdditional.find((elem) => elem.card.id === elementId);
      if (targetElement) {
        targetElement.card.card = newCard;
        const updatedMission = { ...mission };
        setMission(updatedMission);
        setDeck(remaining);
        updateMissionUrl(updatedMission);
      }
    }
  };

  const renderMissionElement = (
    title: string,
    element: MissionElement,
    cardData: MissionElementCard,
    isAdditional = false,
    hasNestedDraws = false,
    nestedDrawCount = 0,
    onDrawNested?: () => void
  ) => {
    const cardColor = getCardColor(cardData.card);
    const cardClass = isStarbreaker
      ? `relative h-full flex flex-col starbreaker-card ${isAdditional ? 'starbreaker-card-highlight' : ''}`
      : `relative parchment-card h-full flex flex-col ${isAdditional ? 'border-[#8b3a2a] border-[3px]' : ''}`;
    const titleColor = isStarbreaker ? "text-[rgba(0,217,255,0.7)]" : "text-[#2a1810]";
    const contentColor = isStarbreaker ? "text-[#e8f4f8]" : "text-[#3a2a1a]";

    return (
      <Card className={cardClass}>
        <CardHeader className={isStarbreaker ? "starbreaker-card-header pb-3" : "pb-3"}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle
                className="uppercase tracking-wider"
                style={isStarbreaker ? {
                  fontFamily: 'var(--font-cinzel)',
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  color: 'rgba(0, 217, 255, 0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '0.625rem',
                } : {}}
              >
                {title}
              </CardTitle>
              <CardDescription
                className="mt-2"
                style={isStarbreaker ? {
                  fontFamily: 'var(--font-cinzel), Georgia, serif',
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: cardColor === '#ff4466' ? '#ff3355' : '#ffffff',
                  lineHeight: 1,
                  letterSpacing: '0.02em',
                } : {
                  fontFamily: 'var(--font-cinzel), Georgia, serif',
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: cardColor,
                }}
              >
                {getCardDisplay(cardData.card)}
              </CardDescription>
            </div>
          <div className="flex flex-col gap-1.5">
            {hasNestedDraws && onDrawNested && (
              <Button
                variant="default"
                size="sm"
                onClick={onDrawNested}
                className={isStarbreaker
                  ? "starbreaker-btn-primary text-xs px-2 py-1 h-auto"
                  : "secret-world-box text-[#f4ead5] hover:opacity-90 transition-opacity text-xs px-2 py-1 h-auto"
                }
              >
                Draw {nestedDrawCount}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => cardData.id && redrawElement(cardData.id)}
              disabled={deck.length < 1}
              className={isStarbreaker
                ? "starbreaker-btn-secondary text-xs px-2 py-1 h-auto"
                : "border-[#b8a989] hover:bg-[#d4c4a8] text-[#2a1810] text-xs px-2 py-1 h-auto"
              }
            >
              Redraw
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent
        className="pt-0 flex-1"
        style={isStarbreaker ? {
          padding: '1rem 1.25rem 1.25rem',
        } : {}}
      >
        <p
          className="whitespace-pre-line leading-relaxed"
          style={isStarbreaker ? {
            fontFamily: 'var(--font-cormorant)',
            fontSize: '0.9375rem',
            fontWeight: 400,
            lineHeight: 1.6,
            color: '#e8f4f8',
          } : {
            fontSize: '0.875rem',
            color: '#3a2a1a',
          }}
        >
          {cardData.result}
        </p>
      </CardContent>
    </Card>
    );
  };

  const renderNestedElements = (nestedElements: AdditionalElement[]) => {
    if (nestedElements.length === 0) return null;

    return (
      <div className="ml-6 mt-4 space-y-4 border-l-4 border-[#8b3a2a] pl-4">
        <h3 className="text-sm font-semibold text-[#7a2b1f] uppercase tracking-wider">
          Nested Elements
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {nestedElements.map((nested, idx) => (
            <div key={`nested-${nested.card.id}-${idx}`}>
              {renderMissionElement(
                `Nested ${nested.card.element}`,
                nested.card.element,
                nested.card,
                true
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const isStarbreaker = selectedGame === GameId.STARBREAKER;
  const headerBg = isStarbreaker
    ? "bg-gradient-to-b from-[#0a1929] via-[#1a2942] to-[#0d1b2a]"
    : "bg-gradient-to-b from-[#e8e8e8] via-[#f5f5f5] to-white";
  const headerBorder = isStarbreaker ? "border-[#00d9ff]" : "border-[#d0d0d0]";
  const cardBg = isStarbreaker ? "bg-gradient-to-br from-[#1a2942] to-[#0d1b2a]" : "";
  const textColor = isStarbreaker ? "text-[#e8f4f8]" : "text-[#2a1810]";
  const mutedTextColor = isStarbreaker ? "text-[#a0c4d4]" : "text-[#5a4a3a]";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6">
        <div className={`flex items-center justify-center ${headerBg} py-8 -mx-4 px-4 border-b-2 ${headerBorder} shadow-sm`}>
          <img
            src={gameConfig.logo}
            alt={gameConfig.logoAlt}
            className="h-14 md:h-16 w-auto object-contain drop-shadow-md"
          />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <label className={`text-sm font-semibold ${textColor} uppercase tracking-wider`}>Game:</label>
            <GameSelector selectedGame={selectedGame} onGameChange={handleGameChange} />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className={`text-2xl md:text-3xl font-bold ${textColor} occult-header mb-1`}>
                {isStarbreaker ? "Adventure Generator" : "Mission Generator"}
              </h1>
              <p className={`text-sm md:text-base ${mutedTextColor} italic`} style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}>
                {gameConfig.tagline}
              </p>
            </div>
          <div className="flex flex-wrap gap-3">
            {mission && (
              <Button
                onClick={shareMission}
                size="lg"
                variant="outline"
                className={isStarbreaker
                  ? "starbreaker-btn-secondary px-4 py-2 text-sm md:text-base uppercase tracking-wider"
                  : "border-[#7a2b1f] border-2 text-[#7a2b1f] hover:bg-[#7a2b1f] hover:text-[#f4ead5] px-4 py-2 text-sm md:text-base uppercase tracking-wider"
                }
              >
                {showCopySuccess ? "✓ Copied!" : isStarbreaker ? "Share Adventure" : "Share Mission"}
              </Button>
            )}
            <Button
              onClick={generateNewMission}
              size="lg"
              className={isStarbreaker
                ? "starbreaker-btn-primary px-6 py-2 text-sm md:text-base uppercase tracking-wider"
                : "secret-world-box text-[#f4ead5] hover:opacity-90 transition-opacity px-6 py-2 text-sm md:text-base uppercase tracking-wider"
              }
            >
              {mission ? (isStarbreaker ? "New Adventure" : "New Mission") : (isStarbreaker ? "Generate Adventure" : "Generate Mission")}
            </Button>
          </div>
        </div>
        </div>

        {!mission && (
          <Card className={isStarbreaker
            ? "starbreaker-card"
            : "parchment-card"
          }>
            <CardContent className="pt-6 pb-8">
              <div className="max-w-3xl mx-auto space-y-4">
                <p className={`text-center text-lg leading-relaxed ${isStarbreaker ? 'text-[#e8f4f8]' : 'text-[#3a2a1a]'}`}>
                  {isStarbreaker ? (
                    <>Generate adventures using the card-based system from <strong className="text-[#00d9ff]">Starbreaker</strong>.
                    Draw cards to determine your adventure&apos;s Antagonist Faction, Cast of Characters, and Mission Profile.</>
                  ) : (
                    <>Generate missions using the card-based system from the <strong>Secret World RPG</strong>.
                    Draw cards to determine your mission&apos;s Location, Goal, Object, Obstacle, and Twist.</>
                  )}
                </p>
                <p className={`text-center italic ${isStarbreaker ? 'text-[#a8c7d7]' : 'text-[#5a4a3a]'}`}>
                  Click &quot;{isStarbreaker ? 'Generate Adventure' : 'Generate Mission'}&quot; to draw cards and create a new {isStarbreaker ? 'adventure' : 'mission'}.
                  Each element is determined by a card&apos;s suit and value. The generator is a tool to inspire
                  your creativity, not a tyrant.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {mission && showAdditionalDrawPrompt && (
        <Card className={isStarbreaker
          ? "starbreaker-card starbreaker-card-highlight"
          : "secret-world-box border-[#4a1810]"
        }>
          <CardHeader>
            <CardTitle className={`text-xl uppercase tracking-wider ${isStarbreaker ? 'text-[#00d9ff]' : 'text-[#f4ead5]'}`}>
              Additional Draws Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className={`text-base ${isStarbreaker ? 'text-[#e8f4f8]/90' : 'text-[#f4ead5]/90'}`}>
              {isStarbreaker ? 'The twist requires drawing additional details:' : 'The Twist card requires drawing additional elements:'}
            </p>
            <ul className={`space-y-2 ${isStarbreaker ? 'text-[#e8f4f8]/90' : 'text-[#f4ead5]/90'}`}>
              {mission.additionalDrawRequirements.map((req, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className={`mt-1 ${isStarbreaker ? 'text-[#00d9ff]' : 'text-[#c19a6b]'}`}>•</span>
                  <span>
                    <strong className={isStarbreaker ? 'text-[#00d9ff]' : 'text-[#f4ead5]'}>{req.label}</strong>: {req.reason}
                  </span>
                </li>
              ))}
            </ul>
            <Button
              onClick={drawAdditionalElements}
              className={isStarbreaker
                ? "w-full starbreaker-btn-primary font-semibold uppercase tracking-wider"
                : "w-full bg-[#c19a6b] hover:bg-[#a88556] text-[#2a1810] font-semibold uppercase tracking-wider"
              }
            >
              Draw {mission.additionalDrawRequirements.length} Additional Card
              {mission.additionalDrawRequirements.length > 1 ? 's' : ''}
            </Button>
          </CardContent>
        </Card>
      )}

      {mission && (
        <>
          <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${gameConfig.elements.length === 5 ? 'xl:grid-cols-5' : 'xl:grid-cols-3'}`}>
            {gameConfig.elements.includes(MissionElement.LOCATION) && renderMissionElement(isStarbreaker ? "Antagonist Faction" : "Location", MissionElement.LOCATION, mission.location)}
            {gameConfig.elements.includes(MissionElement.GOAL) && renderMissionElement(isStarbreaker ? "Cast Member" : "Goal", MissionElement.GOAL, mission.goal)}
            {gameConfig.elements.includes(MissionElement.OBJECT) && renderMissionElement(isStarbreaker ? "Mission Profile" : "Object", MissionElement.OBJECT, mission.object)}
            {gameConfig.elements.includes(MissionElement.OBSTACLE) && renderMissionElement(isStarbreaker ? "Opposition" : "Obstacle", MissionElement.OBSTACLE, mission.obstacle)}
            {gameConfig.elements.includes(MissionElement.TWIST) && renderMissionElement("Twist", MissionElement.TWIST, mission.twist)}
          </div>
        </>
      )}

      {mission && (mission.additionalLocations || mission.additionalGoals || mission.additionalObjects || mission.additionalObstacles) && (
        <div className="space-y-6">
          <h2 className={`text-2xl md:text-3xl font-bold ${isStarbreaker ? 'text-[#00d9ff]' : 'text-[#7a2b1f]'} occult-header border-b-2 ${isStarbreaker ? 'border-[#00d9ff]' : 'border-[#b8a989]'} pb-2`}>
            {isStarbreaker ? "Additional Details" : "Additional Elements"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {mission.additionalLocations?.map((loc, idx) => {
              const req = mission.additionalDrawRequirements.find(r => r.element === MissionElement.LOCATION);
              const hasPendingDraws = loc.card.id ? pendingNestedDraws.has(loc.card.id) : false;
              return (
                <div key={`additional-location-${idx}`}>
                  {renderMissionElement(
                    req?.label || "Additional Location",
                    MissionElement.LOCATION,
                    loc.card,
                    true,
                    hasPendingDraws,
                    loc.additionalDrawRequirements.length,
                    loc.card.id ? () => drawNestedElements(loc.card.id!) : undefined
                  )}
                  {loc.nestedElements && renderNestedElements(loc.nestedElements)}
                </div>
              );
            })}
            {mission.additionalGoals?.map((goal, idx) => {
              const reqs = mission.additionalDrawRequirements.filter(r => r.element === MissionElement.GOAL);
              const req = reqs[idx] || reqs[0];
              const hasPendingDraws = goal.card.id ? pendingNestedDraws.has(goal.card.id) : false;
              return (
                <div key={`additional-goal-${idx}`}>
                  {renderMissionElement(
                    req?.label || "Additional Goal",
                    MissionElement.GOAL,
                    goal.card,
                    true,
                    hasPendingDraws,
                    goal.additionalDrawRequirements.length,
                    goal.card.id ? () => drawNestedElements(goal.card.id!) : undefined
                  )}
                  {goal.nestedElements && renderNestedElements(goal.nestedElements)}
                </div>
              );
            })}
            {mission.additionalObjects?.map((obj, idx) => {
              const reqs = mission.additionalDrawRequirements.filter(r => r.element === MissionElement.OBJECT);
              const req = reqs[idx] || reqs[0];
              const hasPendingDraws = obj.card.id ? pendingNestedDraws.has(obj.card.id) : false;
              return (
                <div key={`additional-object-${idx}`}>
                  {renderMissionElement(
                    req?.label || "Additional Object",
                    MissionElement.OBJECT,
                    obj.card,
                    true,
                    hasPendingDraws,
                    obj.additionalDrawRequirements.length,
                    obj.card.id ? () => drawNestedElements(obj.card.id!) : undefined
                  )}
                  {obj.nestedElements && renderNestedElements(obj.nestedElements)}
                </div>
              );
            })}
            {mission.additionalObstacles?.map((obs, idx) => {
              const req = mission.additionalDrawRequirements.find(r => r.element === MissionElement.OBSTACLE);
              const hasPendingDraws = obs.card.id ? pendingNestedDraws.has(obs.card.id) : false;
              return (
                <div key={`additional-obstacle-${idx}`}>
                  {renderMissionElement(
                    req?.label || "Additional Obstacle",
                    MissionElement.OBSTACLE,
                    obs.card,
                    true,
                    hasPendingDraws,
                    obs.additionalDrawRequirements.length,
                    obs.card.id ? () => drawNestedElements(obs.card.id!) : undefined
                  )}
                  {obs.nestedElements && renderNestedElements(obs.nestedElements)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={`flex items-center justify-between pt-6 pb-4 mt-8 border-t ${isStarbreaker ? 'border-[#00d9ff]/30' : 'border-[#b8a989] border-t-2'}`}>
        <p className={`text-base font-cormorant ${isStarbreaker ? 'text-[#a8c7d7]' : 'text-[#5a4a3a]'}`}>
          {gameConfig.copyright}
        </p>
        <a
          href={gameConfig.studioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
        >
          <img
            src={gameConfig.studioLogo}
            alt="Star Anvil Studios"
            className="h-20 w-auto object-contain"
          />
        </a>
      </div>
    </div>
  );
}
