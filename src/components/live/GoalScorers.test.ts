import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseGoalScorers } from "./LivePlayer";
import { MatchKeyEvent } from "@/services/live/football-score/types";

describe("Goal Scorers Parsing & Layout Safeguard Tests", () => {
  it("1. Correctly groups multiple goals by the same player in chronological order", () => {
    const events: MatchKeyEvent[] = [
      {
        id: "1",
        type: "goal",
        typeText: "Goal",
        text: "Erling Haaland goal",
        clock: "12",
        minute: 12,
        playerName: "E. Haaland",
        homeAway: "home",
      },
      {
        id: "2",
        type: "goal",
        typeText: "Goal",
        text: "Liam Delap goal",
        clock: "18",
        minute: 18,
        playerName: "L. Delap",
        homeAway: "away",
      },
      {
        id: "3",
        type: "goal",
        typeText: "Penalty Goal",
        text: "Erling Haaland penalty",
        clock: "34",
        minute: 34,
        playerName: "E. Haaland",
        homeAway: "home",
        isPenalty: true,
      },
      {
        id: "4",
        type: "goal",
        typeText: "Goal",
        text: "Erling Haaland hat-trick",
        clock: "68",
        minute: 68,
        playerName: "E. Haaland",
        homeAway: "home",
      },
    ];

    const homeScorers = parseGoalScorers(events, "home", "Man City", "Manchester City");
    const awayScorers = parseGoalScorers(events, "away", "Ipswich", "Ipswich Town");

    assert.equal(homeScorers.length, 1);
    assert.equal(homeScorers[0].playerName, "E. Haaland");
    assert.deepEqual(homeScorers[0].times, ["12'", "34' (P)", "68'"]);

    assert.equal(awayScorers.length, 1);
    assert.equal(awayScorers[0].playerName, "L. Delap");
    assert.deepEqual(awayScorers[0].times, ["18'"]);
  });

  it("2. Filters out disallowed goals and missed penalties", () => {
    const events: MatchKeyEvent[] = [
      {
        id: "1",
        type: "goal",
        typeText: "Goal",
        text: "Goal - VAR: Disallowed for offside",
        clock: "25",
        minute: 25,
        playerName: "P. Foden",
        homeAway: "home",
      },
      {
        id: "2",
        type: "goal",
        typeText: "Goal",
        text: "Penalty missed by player",
        clock: "40",
        minute: 40,
        playerName: "K. De Bruyne",
        homeAway: "home",
      },
      {
        id: "3",
        type: "goal",
        typeText: "Goal",
        text: "Valid goal",
        clock: "55",
        minute: 55,
        playerName: "J. Doku",
        homeAway: "home",
      },
    ];

    const scorers = parseGoalScorers(events, "home");
    assert.equal(scorers.length, 1);
    assert.equal(scorers[0].playerName, "J. Doku");
    assert.deepEqual(scorers[0].times, ["55'"]);
  });

  it("3. Handles own goals with (OG) label", () => {
    const events: MatchKeyEvent[] = [
      {
        id: "1",
        type: "goal",
        typeText: "Goal",
        text: "Own Goal by Luke Woolfenden",
        clock: "14",
        minute: 14,
        playerName: "L. Woolfenden",
        homeAway: "home",
        isOwnGoal: true,
      },
    ];

    const scorers = parseGoalScorers(events, "home");
    assert.equal(scorers.length, 1);
    assert.equal(scorers[0].playerName, "L. Woolfenden");
    assert.deepEqual(scorers[0].times, ["14' (OG)"]);
  });

  it("4. Falls back gracefully when homeAway is not directly set", () => {
    const events: MatchKeyEvent[] = [
      {
        id: "1",
        type: "goal",
        typeText: "Goal",
        text: "Goal! Manchester City 1, Ipswich Town 0. Erling Haaland (Manchester City) scores.",
        clock: "12'",
        minute: 12,
        playerName: "Erling Haaland",
      },
    ];

    const homeScorers = parseGoalScorers(
      events,
      "home",
      "Man City",
      "Manchester City",
      "Ipswich",
      "Ipswich Town",
    );
    const awayScorers = parseGoalScorers(
      events,
      "away",
      "Ipswich",
      "Ipswich Town",
      "Man City",
      "Manchester City",
    );

    assert.equal(homeScorers.length, 1);
    assert.equal(homeScorers[0].playerName, "Erling Haaland");
    assert.equal(awayScorers.length, 0);
  });

  it("5. Handles high-scoring matches with many distinct scorers without crashing or duplicating", () => {
    const events: MatchKeyEvent[] = [
      { id: "1", type: "goal", typeText: "Goal", text: "G1", clock: "10", minute: 10, playerName: "Player A", homeAway: "home" },
      { id: "2", type: "goal", typeText: "Goal", text: "G2", clock: "20", minute: 20, playerName: "Player B", homeAway: "home" },
      { id: "3", type: "goal", typeText: "Goal", text: "G3", clock: "30", minute: 30, playerName: "Player C", homeAway: "home" },
      { id: "4", type: "goal", typeText: "Goal", text: "G4", clock: "40", minute: 40, playerName: "Player D", homeAway: "home" },
      { id: "5", type: "goal", typeText: "Goal", text: "G5", clock: "50", minute: 50, playerName: "Player E", homeAway: "home" },
      { id: "6", type: "goal", typeText: "Goal", text: "G6", clock: "60", minute: 60, playerName: "Player F", homeAway: "home" },
      { id: "7", type: "goal", typeText: "Goal", text: "G7", clock: "70", minute: 70, playerName: "Player G", homeAway: "home" },
    ];

    const homeScorers = parseGoalScorers(events, "home");
    assert.equal(homeScorers.length, 7);
    assert.equal(homeScorers[0].playerName, "Player A");
    assert.equal(homeScorers[6].playerName, "Player G");
  });

  it("6. Safely returns empty array for empty, null, or undefined events", () => {
    assert.deepEqual(parseGoalScorers(undefined, "home"), []);
    assert.deepEqual(parseGoalScorers([], "home"), []);
    assert.deepEqual(parseGoalScorers(null as unknown as undefined, "away"), []);
  });
});
