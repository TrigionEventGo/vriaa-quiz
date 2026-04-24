import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { scoreMultipleChoice, totalScoreForAnswers } from "./scoring";

describe("scoreMultipleChoice", () => {
  it("awards 1 when correct", () => {
    assert.equal(scoreMultipleChoice(2, 2), 1);
  });
  it("awards 0 when wrong", () => {
    assert.equal(scoreMultipleChoice(2, 0), 0);
  });
  it("awards 0 when unanswered", () => {
    assert.equal(scoreMultipleChoice(2, null), 0);
  });
});

describe("totalScoreForAnswers", () => {
  it("sums per-question scores", () => {
    const qs = [{ correct: 0 }, { correct: 1 }, { correct: 2 }];
    const ans: (number | null)[] = [0, 2, 2];
    assert.equal(totalScoreForAnswers(qs, ans), 2);
  });
});
