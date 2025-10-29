import { Card, MissionElement, MissionElementCard, GeneratedMission, AdditionalDrawRequirement, Suit, Rank } from "@/types/mission";
import { MissionData } from "@/types/game";

export function generateMissionElement(
  element: MissionElement,
  card: Card,
  missionData: MissionData
): MissionElementCard {
  let result = "";
  let suitModifier = "";

  switch (element) {
    case MissionElement.LOCATION:
      result = missionData.locations[card.rank];
      suitModifier = missionData.locationSuitModifiers[card.suit];
      break;

    case MissionElement.GOAL:
      result = missionData.goals[card.rank];
      suitModifier = missionData.goalSuitModifiers[card.suit];
      break;

    case MissionElement.OBJECT:
      const objectType = missionData.objectSuitLabels[card.suit];
      result = missionData.objects[card.suit][card.rank];
      suitModifier = `(${objectType})`;
      break;

    case MissionElement.OBSTACLE:
      result = missionData.obstacles?.[card.rank] || "";
      suitModifier = missionData.obstacleSuitModifiers?.[card.suit] || "";
      break;

    case MissionElement.TWIST:
      result = missionData.twists?.[card.rank] || "";
      suitModifier = missionData.twistSuitModifiers?.[card.suit] || "";
      break;
  }

  return {
    element,
    card,
    result: suitModifier ? `${result}\n${suitModifier}` : result,
  };
}

export function detectAdditionalDrawsSecretWorld(twistCard: Card): AdditionalDrawRequirement[] {
  const requirements: AdditionalDrawRequirement[] = [];

  // Check suit-based additional draws
  switch (twistCard.suit) {
    case Suit.CLUBS:
      requirements.push({
        element: MissionElement.LOCATION,
        reason: "The cabal needs to visit here as well",
        label: "Additional Location"
      });
      break;
    case Suit.DIAMONDS:
      requirements.push({
        element: MissionElement.GOAL,
        reason: "This might replace the original when the Twist comes up",
        label: "Additional Goal"
      });
      break;
    case Suit.HEARTS:
      requirements.push({
        element: MissionElement.OBJECT,
        reason: "The heroes need to deal with this one too",
        label: "Additional Object"
      });
      break;
    case Suit.SPADES:
      requirements.push({
        element: MissionElement.OBSTACLE,
        reason: "Maybe the Obstacles will oppose each other?",
        label: "Additional Obstacle"
      });
      break;
  }

  // Check rank-based additional draws
  switch (twistCard.rank) {
    case Rank.SIX:
      requirements.push({
        element: MissionElement.OBJECT,
        reason: "It's attached to your Object",
        label: "Attached Object"
      });
      break;
    case Rank.JACK:
      requirements.push({
        element: MissionElement.GOAL,
        reason: "Dragon heroes get own Goal",
        label: "Dragon Goal"
      });
      requirements.push({
        element: MissionElement.OBJECT,
        reason: "Dragon heroes get own Object",
        label: "Dragon Object"
      });
      break;
    case Rank.QUEEN:
      requirements.push({
        element: MissionElement.GOAL,
        reason: "Illuminati heroes get own Goal",
        label: "Illuminati Goal"
      });
      requirements.push({
        element: MissionElement.OBJECT,
        reason: "Illuminati heroes get own Object",
        label: "Illuminati Object"
      });
      break;
    case Rank.KING:
      requirements.push({
        element: MissionElement.GOAL,
        reason: "Templar heroes get own Goal",
        label: "Templar Goal"
      });
      requirements.push({
        element: MissionElement.OBJECT,
        reason: "Templar heroes get own Object",
        label: "Templar Object"
      });
      break;
  }

  return requirements;
}

export function detectAdditionalDrawsStarbreaker(objectCard: Card): AdditionalDrawRequirement[] {
  const requirements: AdditionalDrawRequirement[] = [];

  // Face cards in Mission Profile require additional Mission Profile card
  if (objectCard.rank === Rank.JACK || objectCard.rank === Rank.QUEEN || objectCard.rank === Rank.KING) {
    requirements.push({
      element: MissionElement.OBJECT,
      reason: "Draw additional Mission Profile card",
      label: "Additional Mission Profile"
    });
  }

  return requirements;
}

export function detectAdditionalDraws(twistCard: Card): AdditionalDrawRequirement[] {
  // Legacy function for backwards compatibility - defaults to Secret World
  return detectAdditionalDrawsSecretWorld(twistCard);
}

export function generateMission(cards: Card[], missionData: MissionData, additionalCards?: Card[], elements?: MissionElement[]): GeneratedMission {
  // Default to all 5 elements if not specified (for backwards compatibility)
  const elementsToUse = elements || [
    MissionElement.LOCATION,
    MissionElement.GOAL,
    MissionElement.OBJECT,
    MissionElement.OBSTACLE,
    MissionElement.TWIST,
  ];

  const location = generateMissionElement(MissionElement.LOCATION, cards[0], missionData);
  location.id = "primary-location";

  const goal = generateMissionElement(MissionElement.GOAL, cards[1], missionData);
  goal.id = "primary-goal";

  const object = generateMissionElement(MissionElement.OBJECT, cards[2], missionData);
  object.id = "primary-object";

  // Only generate obstacle and twist if they're in the elements list
  const obstacle = elementsToUse.includes(MissionElement.OBSTACLE) && cards[3]
    ? generateMissionElement(MissionElement.OBSTACLE, cards[3], missionData)
    : { element: MissionElement.OBSTACLE, card: { suit: Suit.CLUBS, rank: Rank.TWO }, result: "", id: "primary-obstacle" };
  if (elementsToUse.includes(MissionElement.OBSTACLE)) {
    obstacle.id = "primary-obstacle";
  }

  const twistIndex = elementsToUse.includes(MissionElement.OBSTACLE) ? 4 : 3;
  const twist = elementsToUse.includes(MissionElement.TWIST) && cards[twistIndex]
    ? generateMissionElement(MissionElement.TWIST, cards[twistIndex], missionData)
    : { element: MissionElement.TWIST, card: { suit: Suit.CLUBS, rank: Rank.TWO }, result: "", id: "primary-twist" };
  if (elementsToUse.includes(MissionElement.TWIST)) {
    twist.id = "primary-twist";
  }

  // Detect additional draws based on the game type
  let additionalDrawRequirements: AdditionalDrawRequirement[] = [];

  if (elementsToUse.includes(MissionElement.TWIST) && twist.card) {
    // Secret World: Check twist card for additional draws
    additionalDrawRequirements = detectAdditionalDrawsSecretWorld(twist.card);
  } else if (!elementsToUse.includes(MissionElement.TWIST) && !elementsToUse.includes(MissionElement.OBSTACLE)) {
    // Starbreaker: Check object (Mission Profile) card for additional draws
    additionalDrawRequirements = detectAdditionalDrawsStarbreaker(object.card);
  }

  const mission: GeneratedMission = {
    location,
    goal,
    object,
    obstacle,
    twist,
    additionalDrawRequirements,
    createdAt: new Date(),
  };

  // Process additional cards if provided
  if (additionalCards && additionalCards.length > 0) {
    let cardIndex = 0;

    for (let reqIndex = 0; reqIndex < additionalDrawRequirements.length; reqIndex++) {
      if (cardIndex >= additionalCards.length) break;

      const req = additionalDrawRequirements[reqIndex];
      const card = additionalCards[cardIndex];
      const element = generateMissionElement(req.element, card, missionData);
      element.id = `additional-${req.element}-${reqIndex}-${cardIndex}`;

      // Check if this additional element requires more draws (only if it's a twist-like element)
      const nestedRequirements = req.element === MissionElement.TWIST
        ? detectAdditionalDraws(card)
        : [];

      const additionalElement = {
        card: element,
        requiresMoreDraws: nestedRequirements.length > 0,
        additionalDrawRequirements: nestedRequirements,
      };

      switch (req.element) {
        case MissionElement.LOCATION:
          if (!mission.additionalLocations) mission.additionalLocations = [];
          mission.additionalLocations.push(additionalElement);
          break;
        case MissionElement.GOAL:
          if (!mission.additionalGoals) mission.additionalGoals = [];
          mission.additionalGoals.push(additionalElement);
          break;
        case MissionElement.OBJECT:
          if (!mission.additionalObjects) mission.additionalObjects = [];
          mission.additionalObjects.push(additionalElement);
          break;
        case MissionElement.OBSTACLE:
          if (!mission.additionalObstacles) mission.additionalObstacles = [];
          mission.additionalObstacles.push(additionalElement);
          break;
      }

      cardIndex++;
    }
  }

  return mission;
}
