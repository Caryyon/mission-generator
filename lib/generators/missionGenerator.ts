import { Card, MissionElement, MissionElementCard, GeneratedMission, AdditionalDrawRequirement, Suit, Rank } from "@/types/mission";
import {
  LOCATION_DATA,
  LOCATION_SUIT_MODIFIERS,
  GOAL_DATA,
  GOAL_SUIT_MODIFIERS,
  OBJECT_DATA,
  OBJECT_SUIT_LABELS,
  OBSTACLE_DATA,
  OBSTACLE_SUIT_MODIFIERS,
  TWIST_DATA,
  TWIST_SUIT_MODIFIERS,
} from "./missionData";

export function generateMissionElement(
  element: MissionElement,
  card: Card
): MissionElementCard {
  let result = "";
  let suitModifier = "";

  switch (element) {
    case MissionElement.LOCATION:
      result = LOCATION_DATA[card.rank];
      suitModifier = LOCATION_SUIT_MODIFIERS[card.suit];
      break;

    case MissionElement.GOAL:
      result = GOAL_DATA[card.rank];
      suitModifier = GOAL_SUIT_MODIFIERS[card.suit];
      break;

    case MissionElement.OBJECT:
      const objectType = OBJECT_SUIT_LABELS[card.suit];
      result = OBJECT_DATA[card.suit][card.rank];
      suitModifier = `(${objectType})`;
      break;

    case MissionElement.OBSTACLE:
      result = OBSTACLE_DATA[card.rank];
      suitModifier = OBSTACLE_SUIT_MODIFIERS[card.suit];
      break;

    case MissionElement.TWIST:
      result = TWIST_DATA[card.rank];
      suitModifier = TWIST_SUIT_MODIFIERS[card.suit];
      break;
  }

  return {
    element,
    card,
    result: suitModifier ? `${result}\n${suitModifier}` : result,
  };
}

export function detectAdditionalDraws(twistCard: Card): AdditionalDrawRequirement[] {
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

export function generateMission(cards: Card[], additionalCards?: Card[]): GeneratedMission {
  const [locationCard, goalCard, objectCard, obstacleCard, twistCard] = cards;

  const location = generateMissionElement(MissionElement.LOCATION, locationCard);
  location.id = "primary-location";
  const goal = generateMissionElement(MissionElement.GOAL, goalCard);
  goal.id = "primary-goal";
  const object = generateMissionElement(MissionElement.OBJECT, objectCard);
  object.id = "primary-object";
  const obstacle = generateMissionElement(MissionElement.OBSTACLE, obstacleCard);
  obstacle.id = "primary-obstacle";
  const twist = generateMissionElement(MissionElement.TWIST, twistCard);
  twist.id = "primary-twist";

  const additionalDrawRequirements = detectAdditionalDraws(twistCard);

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
      const element = generateMissionElement(req.element, card);
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
