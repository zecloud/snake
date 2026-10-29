import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createGame, HEIGHT, pointIndex, SIZE, tick, turn, validateCalendar, WIDTH } from "../engine.mjs";

const days = Array.from({ length: SIZE }, () => ({ level: 1 }));
const running = () => ({ ...createGame(days, () => 0), status: "running" });

test("the checked-in snapshot is valid and supplies exactly 364 game cells", async () => {
  const snapshot = JSON.parse(await readFile(new URL("../contributions.json", import.meta.url)));
  assert.equal(validateCalendar(snapshot).length, SIZE);
});

test("malformed, incomplete and nonconsecutive calendars are rejected", async () => {
  const snapshot = JSON.parse(await readFile(new URL("../contributions.json", import.meta.url)));
  assert.throws(() => validateCalendar({ ...snapshot, username: "someone-else" }));
  assert.throws(() => validateCalendar({ ...snapshot, days: [] }));
  assert.throws(() => validateCalendar({ ...snapshot, days: snapshot.days.map((day, i) => i === 3 ? { ...day, level: 5 } : day) }));
  assert.throws(() => validateCalendar({ ...snapshot, days: snapshot.days.map((day, i) => i === 3 ? snapshot.days[2] : day) }));
  assert.throws(() => validateCalendar({ ...snapshot, days: snapshot.days.map((day, i) => i === 3 ? { ...day, date: "2026-02-30" } : day) }));
});

test("column-major coordinates match the contribution grid", () => {
  assert.equal(pointIndex({ x: WIDTH - 1, y: HEIGHT - 1 }), SIZE - 1);
});

test("does not move before play or during pause", () => {
  for (const status of ["ready", "paused", "lost", "won"]) {
    const game = { ...running(), status };
    const before = structuredClone(game);
    tick(game);
    assert.deepEqual(game, before);
    assert.equal(turn(game, "down"), false);
  }
});

test("blocks reversal and accepts only one turn per tick", () => {
  const game = running();
  assert.equal(turn(game, "left"), false);
  assert.equal(turn(game, "up"), true);
  assert.equal(turn(game, "left"), false);
  tick(game);
  assert.deepEqual(game.snake[0], { x: 4, y: 5 });
  assert.equal(game.queued, null);
});

test("eating grows the snake, scores, and chooses an unoccupied target", () => {
  const game = running();
  game.food = pointIndex({ x: 5, y: 6 });
  tick(game, () => .5);
  assert.equal(game.score, 1);
  assert.equal(game.snake.length, 4);
  assert.ok(game.eaten.includes(pointIndex({ x: 5, y: 6 })));
  assert.ok(!game.snake.some(segment => pointIndex(segment) === game.food));
});

test("only contribution days are targets when contributions exist", () => {
  const sparse = days.map((_, index) => ({ level: index === 100 ? 4 : 0 }));
  const game = createGame(sparse);
  assert.equal(game.practice, false);
  assert.equal(game.food, 100);
  assert.deepEqual(game.targets, [100]);
});

test("an empty calendar explicitly creates practice mode", () => {
  const game = createGame(days.map(() => ({ level: 0 })));
  assert.equal(game.practice, true);
  assert.equal(game.targets.length, SIZE);
});

test("colliding with each wall ends the game", () => {
  for (const [head, direction] of [[{ x: 0, y: 2 }, "left"], [{ x: WIDTH - 1, y: 2 }, "right"], [{ x: 2, y: 0 }, "up"], [{ x: 2, y: HEIGHT - 1 }, "down"]]) {
    const game = { ...running(), snake: [head], direction };
    tick(game);
    assert.equal(game.status, "lost");
  }
});

test("body collisions end play but moving into the departing tail is legal", () => {
  const game = running();
  game.snake = [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 1, y: 2 }];
  game.direction = "left";
  tick(game);
  assert.equal(game.status, "running");
  game.snake = [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 1, y: 2 }, { x: 0, y: 2 }];
  tick(game);
  assert.equal(game.status, "lost");
});

test("eating the final target wins", () => {
  const game = running();
  game.targets = [pointIndex({ x: 5, y: 6 })];
  game.food = game.targets[0];
  tick(game);
  assert.equal(game.status, "won");
  assert.equal(game.score, 1);
  assert.equal(game.food, null);
});

test("targets temporarily under the snake are not treated as a win", () => {
  const sparse = days.map((_, index) => ({ level: index === pointIndex({ x: 2, y: 6 }) ? 1 : 0 }));
  const game = createGame(sparse);
  assert.equal(game.food, null);
  game.status = "running";
  tick(game, () => 0);
  assert.equal(game.status, "running");
  assert.equal(game.food, pointIndex({ x: 2, y: 6 }));
});
