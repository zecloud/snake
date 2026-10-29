import { createGame, HEIGHT, pointIndex, SIZE, tick, turn, validateCalendar } from "./engine.mjs";

const $ = id => document.getElementById(id);
const board = $("game");
const speed = $("speed");
const toggle = $("toggle");
const restart = $("restart");
const status = $("game-status");
const cells = Array.from({ length: SIZE }, () => {
  const cell = document.createElement("span");
  cell.className = "cell level-0";
  $("grid").append(cell);
  return cell;
});
let days;
let game;
let timer;
let readCount = 0;
const dateFormat = new Intl.DateTimeFormat("fr", { dateStyle: "long", timeZone: "UTC" });
if (matchMedia("(prefers-reduced-motion: reduce)").matches) speed.value = "step";

function position() {
  const head = game.snake[0];
  const target = game.food === null ? "Cible momentanément sous le serpent." :
    `Cible : colonne ${Math.floor(game.food / HEIGHT) + 1}, ligne ${game.food % HEIGHT + 1}.`;
  return `Tête : colonne ${head.x + 1}, ligne ${head.y + 1}. Direction : ${{ up: "haut", right: "droite", down: "bas", left: "gauche" }[game.direction]}. ${target}`;
}

function render() {
  cells.forEach((cell, index) => {
    cell.className = `cell level-${days[index].level}`;
    if (game.eaten.includes(index)) cell.className = "cell level-0";
    if (index === game.food) cell.classList.add("food");
  });
  game.snake.forEach((segment, index) => {
    cells[pointIndex(segment)].classList.add(index === 0 ? "head" : "snake");
  });
  $("score").textContent = game.score;
  $("remaining").textContent = `${game.targets.length - game.score} à croquer`;
  $("position").textContent = position();
  $("overlay").hidden = game.status === "running";
  const text = {
    ready: ["Une petite pause dans le code ?", "Choisissez votre rythme, puis lancez la partie."],
    paused: ["Pause. Le code peut attendre.", "Reprenez quand vous voulez."],
    lost: ["Fin de la balade.", `${game.score} case(s) croquée(s). Une autre tentative ?`],
    won: ["Une grille bien digérée !", "Toutes les cibles sont croquées. Bien joué."],
  }[game.status];
  if (text) {
    $("overlay-title").textContent = text[0];
    $("overlay-copy").textContent = text[1];
  }
  toggle.textContent = game.status === "running" ? "Pause" : game.status === "paused" ? "Reprendre" : game.status === "ready" ? "Jouer" : "Rejouer";
}

function stopTimer() {
  clearInterval(timer);
  timer = undefined;
}

function schedule() {
  stopTimer();
  if (game.status === "running" && speed.value !== "step") timer = setInterval(advance, Number(speed.value));
}

function advance() {
  const score = game.score;
  const target = game.food;
  tick(game);
  if (game.status === "lost") {
    stopTimer();
    status.textContent = `Partie terminée : collision. Score : ${game.score}. Rejouez avec le bouton ou la touche Espace.`;
  } else if (game.status === "won") {
    stopTimer();
    status.textContent = `Bravo ! Toutes les cibles sont croquées. Score : ${game.score}.`;
  } else if (game.score !== score) {
    status.textContent = game.practice ? `Case d’entraînement croquée. Score : ${game.score}.` :
      `${dateFormat.format(new Date(`${days[target].date}T00:00:00Z`))} croqué. Score : ${game.score}.`;
  }
  render();
}

function reset() {
  stopTimer();
  game = createGame(days);
  status.textContent = "Nouvelle partie prête. Choisissez Jouer ou appuyez sur Espace sur le plateau.";
  render();
}

function playPause() {
  if (!game) return;
  if (game.status === "lost" || game.status === "won") reset();
  if (game.status === "running") {
    game.status = "paused";
    status.textContent = "Partie en pause.";
  } else {
    game.status = "running";
    status.textContent = speed.value === "step" ? "Mode pas à pas. Chaque direction avance d’une case." : "À vous de jouer. Espace pour mettre en pause.";
  }
  schedule();
  render();
}

function pauseForFocus() {
  if (game?.status === "running") {
    game.status = "paused";
    stopTimer();
    status.textContent = "Partie en pause après avoir quitté les commandes.";
    render();
  }
}

function direct(direction) {
  if (!game || game.status !== "running") return;
  if (turn(game, direction) && speed.value === "step") advance();
}

toggle.addEventListener("click", () => { playPause(); board.focus({ preventScroll: true }); });
restart.addEventListener("click", () => { reset(); board.focus({ preventScroll: true }); });
speed.addEventListener("change", () => {
  pauseForFocus();
  status.textContent = "Rythme modifié. Lancez ou reprenez la partie.";
});
document.querySelectorAll("[data-direction]").forEach(button => {
  button.addEventListener("click", () => direct(button.dataset.direction));
});
$("read-position").addEventListener("click", () => {
  $("position-announcement").textContent = `Position ${++readCount}. ${position()}`;
});
board.addEventListener("keydown", event => {
  if (event.altKey || event.ctrlKey || event.metaKey || !game) return;
  const key = event.key.toLowerCase();
  const directions = { arrowup: "up", w: "up", arrowright: "right", d: "right", arrowdown: "down", s: "down", arrowleft: "left", a: "left" };
  if (directions[key] || key === " " || key === "escape" || key === "r") {
    event.preventDefault();
    if (event.repeat) return;
    if (directions[key]) direct(directions[key]);
    else if (key === " ") playPause();
    else if (key === "escape") pauseForFocus();
    else reset();
  }
});
// Moving between game controls is safe; leaving them pauses timed play.
document.querySelector(".arcade").addEventListener("focusout", event => {
  if (!event.relatedTarget || !event.relatedTarget.closest(".arcade")) pauseForFocus();
});
window.addEventListener("blur", pauseForFocus);
document.addEventListener("visibilitychange", () => { if (document.hidden) pauseForFocus(); });

async function load() {
  try {
    const response = await fetch("./contributions.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`Contribution calendar: HTTP ${response.status}`);
    const data = await response.json();
    days = validateCalendar(data);
    const generated = dateFormat.format(new Date(data.generatedAt));
    const stale = Date.now() - Date.parse(data.generatedAt) > 8 * 86400000;
    $("data-status").textContent = `Calendrier public de @zecloud · instantané du ${generated}${stale ? " (historique, non actualisé)" : ""} · ${dateFormat.format(new Date(`${days[0].date}T00:00:00Z`))} — ${dateFormat.format(new Date(`${days.at(-1).date}T00:00:00Z`))}.`;
  } catch (error) {
    console.error("Impossible de charger les contributions GitHub.", error);
    days = Array.from({ length: SIZE }, () => ({ level: 0 }));
    $("data-status").textContent = "Contributions indisponibles : grille neutre d’entraînement, sans données GitHub. Rechargez la page pour réessayer.";
    $("data-status").classList.add("error");
  }
  reset();
  if (game.practice) {
    $("data-status").textContent += " Mode entraînement : les cibles sont des cases neutres, pas des contributions.";
  }
  document.querySelectorAll(".arcade button, .arcade select").forEach(control => { control.disabled = false; });
  status.textContent = "Prêt. Jouer pour commencer ; Pas à pas pour avancer sans chrono.";
}
load();
