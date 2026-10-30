import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import * as engine from "../engine.mjs";

test("switching a paused queued timed turn to step mode permits immediate movement", async () => {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      value: id === "speed" ? "240" : "", textContent: "", disabled: true,
      listeners: {}, classList: { add() {} }, append() {}, focus() {},
      addEventListener(event, handler) { this.listeners[event] = handler; },
    });
    return elements.get(id);
  };
  let state;
  let interval;
  const snapshot = JSON.parse(await readFile(new URL("../contributions.json", import.meta.url)));
  const context = {
    ...engine,
    createGame: (...args) => { state = engine.createGame(...args); return state; },
    document: {
      getElementById: element, createElement: () => element(Symbol()),
      querySelector: element, querySelectorAll: () => [], addEventListener() {},
    },
    window: { addEventListener() {} }, matchMedia: () => ({ matches: false }),
    setInterval: handler => { interval = handler; return 1; },
    clearInterval: () => { interval = undefined; },
    fetch: async () => ({ ok: true, json: async () => snapshot }),
    console, Intl, Date,
  };
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  vm.runInNewContext(source.replace(/^import .*;\n/, ""), context);
  await new Promise(resolve => setImmediate(resolve));
  const key = value => element("game").listeners.keydown({ key: value, preventDefault() {} });
  element("toggle").listeners.click();
  assert.equal(typeof interval, "function");
  key("ArrowUp");
  assert.equal(state.queued, "up");
  key(" ");
  assert.equal(state.status, "paused");
  assert.equal(interval, undefined);
  element("speed").value = "step";
  element("speed").listeners.change();
  assert.equal(state.queued, null);
  element("toggle").listeners.click();
  assert.equal(interval, undefined);
  key("ArrowDown");
  assert.deepEqual(state.snake[0], { x: 4, y: 7 });
  assert.equal(state.queued, null);
  key("ArrowRight");
  assert.deepEqual(state.snake[0], { x: 5, y: 7 });
  assert.equal(element("remaining").textContent, `${state.goal - state.score} pour gagner`);
});
