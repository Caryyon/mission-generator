"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card as PlayingCard, GeneratedMission, MissionElement, MissionElementCard, AdditionalElement } from "@/types/mission";
import { createDeck, shuffleDeck, drawCards, getCardDisplay, getCardColor } from "@/lib/generators/deck";
import { generateMission } from "@/lib/generators/missionGenerator";
import { encodeMission, decodeMission, decodeCard } from "@/lib/generators/missionEncoder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MissionGenerator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mission, setMission] = useState<GeneratedMission | null>(null);
  const [deck, setDeck] = useState<PlayingCard[]>([]);
  const [showAdditionalDrawPrompt, setShowAdditionalDrawPrompt] = useState(false);
  const [pendingNestedDraws, setPendingNestedDraws] = useState<Map<string, number>>(new Map());
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // Load mission from URL on mount
  useEffect(() => {
    const cardsParam = searchParams.get("cards");
    if (cardsParam) {
      const loadedMission = decodeMission(cardsParam);
      if (loadedMission) {
        setMission(loadedMission);

        // Create a fresh deck for redraws, removing the cards already used
        const fullDeck = createDeck();
        const usedCards = cardsParam.split(",").map(decodeCard).filter((c): c is Card => c !== null);

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
    }
  }, [searchParams]);

  const updateMissionUrl = (newMission: GeneratedMission) => {
    const encoded = encodeMission(newMission);
    router.push(`?cards=${encoded}`, { scroll: false });
  };

  const generateNewMission = () => {
    const newDeck = shuffleDeck(createDeck());
    const { drawn, remaining } = drawCards(newDeck, 5);
    const newMission = generateMission(drawn);
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

    const updatedMission = generateMission(
      [mission.location.card, mission.goal.card, mission.object.card, mission.obstacle.card, mission.twist.card],
      drawn
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
      const element = generateMission([card], [])[targetElement.card.element];
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

        const newMission = generateMission(cards, existingAdditionalCards);
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
    return (
      <Card className={`relative parchment-card ${isAdditional ? 'border-[#8b3a2a] border-[3px]' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="text-base font-semibold text-[#2a1810] uppercase tracking-wider">{title}</CardTitle>
              <CardDescription className="text-3xl font-bold mt-2" style={{ fontFamily: 'var(--font-cinzel), Georgia, serif', color: cardColor }}>
                {getCardDisplay(cardData.card)}
              </CardDescription>
            </div>
          <div className="flex flex-col gap-2">
            {hasNestedDraws && onDrawNested && (
              <Button
                variant="default"
                size="sm"
                onClick={onDrawNested}
                className="secret-world-box text-[#f4ead5] hover:opacity-90 transition-opacity text-xs px-3"
              >
                Draw {nestedDrawCount}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => cardData.id && redrawElement(cardData.id)}
              disabled={deck.length < 1}
              className="border-[#b8a989] hover:bg-[#d4c4a8] text-[#2a1810] text-xs px-3"
            >
              Redraw
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-line text-base leading-relaxed text-[#3a2a1a]">{cardData.result}</p>
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-center">
          <img
            src="/TSW_Logo_1Line.png"
            alt="The Secret World"
            className="h-24 md:h-32 w-auto object-contain"
          />
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#2a1810] occult-header mb-2">
              Mission Generator
            </h1>
            <p className="text-base text-[#5a4a3a] italic" style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}>
              Generate missions using the card-based system
            </p>
          </div>
          <div className="flex gap-3">
            {mission && (
              <Button
                onClick={shareMission}
                size="lg"
                variant="outline"
                className="border-[#7a2b1f] border-2 text-[#7a2b1f] hover:bg-[#7a2b1f] hover:text-[#f4ead5] px-6 py-6 text-base uppercase tracking-wider"
              >
                {showCopySuccess ? "✓ Copied!" : "Share Mission"}
              </Button>
            )}
            <Button
              onClick={generateNewMission}
              size="lg"
              className="secret-world-box text-[#f4ead5] hover:opacity-90 transition-opacity px-8 py-6 text-lg uppercase tracking-wider"
            >
              {mission ? "New Mission" : "Generate Mission"}
            </Button>
          </div>
        </div>

        {!mission && (
          <Card className="parchment-card">
            <CardContent className="pt-6 pb-8">
              <div className="max-w-3xl mx-auto space-y-4">
                <p className="text-center text-[#3a2a1a] text-lg leading-relaxed">
                  Generate missions using the card-based system from the <strong>Secret World RPG</strong>.
                  Draw cards to determine your mission&apos;s Location, Goal, Object, Obstacle, and Twist.
                </p>
                <p className="text-center text-[#5a4a3a] italic">
                  Click &quot;Generate Mission&quot; to draw cards and create a new mission.
                  Each element is determined by a card&apos;s suit and value. The generator is a tool to inspire
                  your creativity, not a tyrant.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {mission && showAdditionalDrawPrompt && (
        <Card className="secret-world-box border-[#4a1810]">
          <CardHeader>
            <CardTitle className="text-[#f4ead5] text-xl uppercase tracking-wider">Additional Draws Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base text-[#f4ead5]/90">
              The Twist card requires drawing additional elements:
            </p>
            <ul className="space-y-2 text-[#f4ead5]/90">
              {mission.additionalDrawRequirements.map((req, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#c19a6b] mt-1">•</span>
                  <span>
                    <strong className="text-[#f4ead5]">{req.label}</strong>: {req.reason}
                  </span>
                </li>
              ))}
            </ul>
            <Button
              onClick={drawAdditionalElements}
              className="w-full bg-[#c19a6b] hover:bg-[#a88556] text-[#2a1810] font-semibold uppercase tracking-wider"
            >
              Draw {mission.additionalDrawRequirements.length} Additional Card
              {mission.additionalDrawRequirements.length > 1 ? 's' : ''}
            </Button>
          </CardContent>
        </Card>
      )}

      {mission && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {renderMissionElement("Location", MissionElement.LOCATION, mission.location)}
          {renderMissionElement("Goal", MissionElement.GOAL, mission.goal)}
          {renderMissionElement("Object", MissionElement.OBJECT, mission.object)}
          {renderMissionElement("Obstacle", MissionElement.OBSTACLE, mission.obstacle)}
          {renderMissionElement("Twist", MissionElement.TWIST, mission.twist)}
        </div>
      )}

      {mission && (mission.additionalLocations || mission.additionalGoals || mission.additionalObjects || mission.additionalObstacles) && (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-[#7a2b1f] occult-header border-b-2 border-[#b8a989] pb-2">Additional Elements</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

      <div className="flex items-center justify-between pt-6 pb-4 mt-8 border-t-2 border-[#b8a989]">
        <p className="text-base text-[#5a4a3a] font-cormorant">
          The Secret World is ©2025 Star Anvil Studios
        </p>
        <a
          href="https://staranvilstudios.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
        >
          <img
            src="/Star Anvil Logo NB.png"
            alt="Star Anvil Studios"
            className="h-20 w-auto object-contain"
          />
        </a>
      </div>
    </div>
  );
}
