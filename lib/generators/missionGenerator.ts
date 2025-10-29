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
      result = missionData.obstacles[card.rank];
      suitModifier = missionData.obstacleSuitModifiers[card.suit];
      break;

    case MissionElement.TWIST:
      result = missionData.twists[card.rank];
      suitModifier = missionData.twistSuitModifiers[card.suit];
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

export function generateMission(cards: Card[], missionData: MissionData, additionalCards?: Card[]): GeneratedMission {
  const [locationCard, goalCard, objectCard, obstacleCard, twistCard] = cards;

  const location = generateMissionElement(MissionElement.LOCATION, locationCard, missionData);
  location.id = "primary-location";
  const goal = generateMissionElement(MissionElement.GOAL, goalCard, missionData);
  goal.id = "primary-goal";
  const object = generateMissionElement(MissionElement.OBJECT, objectCard, missionData);
  object.id = "primary-object";
  const obstacle = generateMissionElement(MissionElement.OBSTACLE, obstacleCard, missionData);
  obstacle.id = "primary-obstacle";
  const twist = generateMissionElement(MissionElement.TWIST, twistCard, missionData);
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
