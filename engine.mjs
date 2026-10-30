export const WIDTH = 26;
export const HEIGHT = 14;
export const SIZE = WIDTH * HEIGHT;
const vectors = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const opposite = { up: "down", down: "up", left: "right", right: "left" };

export function validateCalendar(data) {
  if (data?.username !== "zecloud" || !Array.isArray(data.days) || data.days.length < SIZE || data.days.length > 371 ||
      typeof data.generatedAt !== "string" || !Number.isFinite(Date.parse(data.generatedAt))) {
    throw new Error("Invalid contribution calendar");
  }
  let previous = null;
  for (const day of data.days) {
    const time = Date.parse(`${day.date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isFinite(time) ||
        new Date(time).toISOString().slice(0, 10) !== day.date ||
        !Number.isInteger(day.level) || day.level < 0 || day.level > 4 ||
        (previous !== null && time - previous !== 86400000)) {
      throw new Error("Invalid contribution day");
    }
    previous = time;
  }
  return data.days.slice(-SIZE);
}

export function pointIndex({ x, y }) {
  return x * HEIGHT + y;
}

export function createGame(days, random = Math.random) {
  const targets = days.flatMap((day, index) => day.level > 0 ? [index] : []);
  const state = {
    snake: [{ x: 4, y: 6 }, { x: 3, y: 6 }, { x: 2, y: 6 }],
    direction: "right", queued: null, status: "ready", score: 0,
    targets: targets.length ? targets : Array.from({ length: SIZE }, (_, index) => index),
    practice: targets.length === 0, eaten: [], food: null,
  };
  state.goal = Math.min(state.targets.length, SIZE - state.snake.length);
  placeFood(state, random);
  return state;
}

function placeFood(state, random) {
  if (state.score >= state.goal) {
    state.food = null;
    state.status = "won";
    return;
  }
  const occupied = new Set(state.snake.map(pointIndex));
  const available = state.targets.filter(index => !state.eaten.includes(index) && !occupied.has(index));
  if (!available.length) {
    // Targets under the snake become available as its tail moves.
    state.food = null;
    if (state.targets.every(index => state.eaten.includes(index))) state.status = "won";
    return;
  }
  state.food = available[Math.min(available.length - 1, Math.floor(random() * available.length))];
}

export function turn(state, direction) {
  if (state.status !== "running" || !vectors[direction] || state.queued || direction === opposite[state.direction]) return false;
  state.queued = direction;
  return true;
}

export function tick(state, random = Math.random) {
  if (state.status !== "running") return;
  state.direction = state.queued ?? state.direction;
  state.queued = null;
  const [dx, dy] = vectors[state.direction];
  const head = { x: state.snake[0].x + dx, y: state.snake[0].y + dy };
  const eating = pointIndex(head) === state.food;
  const body = eating ? state.snake : state.snake.slice(0, -1);
  if (head.x < 0 || head.x >= WIDTH || head.y < 0 || head.y >= HEIGHT ||
      body.some(segment => segment.x === head.x && segment.y === head.y)) {
    state.status = "lost";
    return;
  }
  state.snake.unshift(head);
  if (eating) {
    state.eaten.push(state.food);
    state.score++;
    placeFood(state, random);
  } else {
    state.snake.pop();
    if (state.food === null) placeFood(state, random);
  }
}
