import Phaser from "phaser";
import "./style.css";
import {
  ABILITIES,
  CHAPTERS,
  DIALOGUES,
  ENEMIES,
  LEVELS,
  ROOMS,
  TOTAL,
  makeLevel,
  readSave,
  writeSave,
  freshSave,
  type Save,
  type Item,
} from "./data";
import { angel, background, palette, round, stas, teammate, text } from "./art";

const ui = document.getElementById("ui")!;
const names: Record<string, string> = {
  marat: "Марат",
  roxy: "Рокси",
  artem: "Артём",
  max: "Макс",
};
const touch: Record<string, boolean> = {};
let gameScene: Shift;

class Music {
  ctx?: AudioContext;
  gain?: GainNode;
  volume = 0.35;
  next = 0;
  beat = 0;
  chapter = 0;
  start() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.gain = this.ctx.createGain();
      this.gain.connect(this.ctx.destination);
    }
    void this.ctx.resume();
    this.setVolume(this.volume);
  }
  setVolume(v: number) {
    this.volume = v;
    if (this.gain) this.gain.gain.value = v * 0.22;
  }
  tone(
    freq: number,
    duration = 0.12,
    type: OscillatorType = "sine",
    amp = 0.4,
  ) {
    if (!this.ctx || !this.gain) return;
    const o = this.ctx.createOscillator(),
      g = this.ctx.createGain(),
      t = this.ctx.currentTime;
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(amp, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.connect(g);
    g.connect(this.gain);
    o.start(t);
    o.stop(t + duration + 0.02);
  }
  update() {
    if (!this.ctx || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    if (now < this.next) return;
    this.next = now + 0.24;
    const melody = [0, 7, 12, 10, 7, 3, 5, 10, 0, 7, 15, 12, 10, 7, 5, 3],
      root = [110, 130.81, 146.83, 123.47, 98, 110][this.chapter];
    this.tone(
      root * Math.pow(2, melody[this.beat % 16] / 12),
      0.35,
      "sine",
      0.18,
    );
    if (this.beat % 4 === 0) this.tone(root / 2, 0.25, "triangle", 0.45);
    this.beat++;
  }
}
const music = new Music();
const logoCanvas = document.createElement("canvas");
logoCanvas.width = 120;
logoCanvas.height = 130;
angel(logoCanvas.getContext("2d")!, 60, 63, 110);
const logo = logoCanvas.toDataURL();

class Shift extends Phaser.Scene {
  surface!: Phaser.Textures.CanvasTexture;
  c!: CanvasRenderingContext2D;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  save: Save = readSave();
  level = 0;
  map = makeLevel(0);
  mode = "menu";
  t = 0;
  hazardTime = 0;
  cameraX = 0;
  p = {
    x: 140,
    y: 590,
    vx: 0,
    vy: 0,
    face: 1,
    health: 4,
    ground: true,
    coyote: 0,
    jumpBuffer: 0,
    invuln: 0,
    dash: 0,
    dashCd: 0,
    fineCd: 0,
    coffee: 0,
    boost: 0,
    chill: 0,
    land: 0,
  };
  prev: Record<string, boolean> = {};
  checkpoint = 140;
  checkpointY = 590;
  coins = 0;
  objective = 0;
  activeSeconds = 0;
  levelSeconds = 0;
  deaths = 0;
  bossHP = 0;
  bossInv = 0;
  bossTimer = 0;
  bossStarted = false;
  bossDead = false;
  projectiles: { x: number; y: number; vx: number; vy: number }[] = [];
  particles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
  }[] = [];
  bubble = "";
  bubbleUntil = 0;
  lastSpeech = -10;
  toastUntil = 0;
  hudTimer = 0;
  dialogueLines: string[] = [];
  dialogueIndex = 0;
  afterDialogue?: () => void;
  endingAt = 0;
  endingStage = 0;
  attackUntil = 0;
  saveWarning = false;
  constructor() {
    super("shift");
  }
  create() {
    this.surface = this.textures.createCanvas("world", 1280, 720)!;
    this.c = this.surface.context;
    this.add.image(0, 0, "world").setOrigin(0);
    this.keys = this.input.keyboard!.addKeys(
      "A,D,LEFT,RIGHT,SPACE,SHIFT,E,F,ESC",
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture(["SPACE", "UP", "DOWN", "LEFT", "RIGHT"]);
    gameScene = this;
    music.setVolume(this.save.volume);
    this.menu();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.mode === "play") this.pause();
    });
    window.addEventListener("blur", () => {
      Object.keys(touch).forEach((k) => (touch[k] = false));
      if (this.mode === "play") this.pause();
    });
    window.addEventListener("beforeunload", () => { if (this.mode === "play") this.persist(); });
  }
  persist() {
    this.save.seconds = this.activeSeconds || this.save.seconds;
    this.save.volume = music.volume;
    if (!writeSave(this.save) && !this.saveWarning) {
      this.saveWarning = true;
      this.toast(
        "Браузер не разрешает сохранение. Прогресс доступен до закрытия вкладки.",
      );
    }
  }
  button(id: string, fn: () => void) {
    document.getElementById(id)?.addEventListener("click", () => {
      music.start();
      fn();
    });
  }
  menu() {
    this.mode = "menu";
    this.persist();
    ui.innerHTML = `<div class="overlay"><div class="brand"><img src="${logo}" alt="Ангел"><span>Only Angels</span></div><div class="eyebrow">Платформер о большой маленькой смене</div><h1 class="hero-title">Собрать команду.<br><em>Пережить смену.</em></h1><p class="lede">Команда разбежалась. Отчёты наступают.<br>Один уставший тимлид и очень длинная ночь.</p><div class="menu-actions"><button class="primary" id="start">${this.save.checkpoint > 140 || this.save.unlocked > 0 ? "Продолжить смену" : "Начать смену"} <span style="margin-left:35px">→</span></button><button id="levels">Выбор уровня</button></div><div class="sub-actions"><button id="settings">⚙ Настройки</button><button id="how">Как играть</button></div><div style="margin-top:20px"><span class="pill"><i class="dot"></i> 6 глав · 12 уровней · одна команда</span></div><div class="hero-note"><b>Стас</b>тимлид · ещё держится</div><div class="footer"><span>ONLY ANGELS / СОБРАТЬ СМЕНУ</span><span>НАДЕНЬ НАУШНИКИ. ЗАВАРИ КОФЕ.</span></div></div>`;
    this.button("start", () => this.startLevel(this.save.level, true));
    this.button("levels", () => this.levelSelect());
    this.button("settings", () => this.settings());
    this.button("how", () => this.how());
  }
  levelSelect() {
    this.mode = "select";
    ui.innerHTML = `<div class="modal"><section class="panel"><div class="eyebrow">Карта смены</div><h1>У каждого свой хаос</h1><p>Новые уровни открываются по порядку. Собранная команда остаётся с тобой.</p><div class="levels">${LEVELS.map((l, i) => `<button id="level-${i}" ${i > this.save.unlocked ? "disabled" : ""}><small>${String(i + 1).padStart(2, "0")} / ${CHAPTERS[Math.floor(i / 2)].short}</small><span>${i > this.save.unlocked ? "🔒 " : this.save.completed.includes(i) ? "✓ " : ""}${l.name}</span></button>`).join("")}</div><div class="row"><button id="back">← Главное меню</button></div></section></div>`;
    LEVELS.forEach((_, i) =>
      this.button(`level-${i}`, () => this.startLevel(i, false)),
    );
    this.button("back", () => this.menu());
  }
  settings() {
    const was = this.mode;
    this.mode = "settings";
    ui.innerHTML = `<div class="modal"><section class="panel"><h1>Настройки</h1><p>Громкость музыки и эффектов</p><input class="volume" id="volume" aria-label="Громкость" type="range" min="0" max="1" step=".05" value="${music.volume}"><p>Прогресс сохраняется в этом браузере. Попытки не ограничены.</p><div class="row"><button class="primary" id="back">Готово</button><button id="reset">Новая смена с нуля</button></div></section></div>`;
    document.getElementById("volume")!.addEventListener("input", (e) => {
      music.start();
      music.setVolume(Number((e.target as HTMLInputElement).value));
      this.persist();
    });
    this.button("back", () => (was === "pause" ? this.pause() : this.menu()));
    this.button("reset", () => {
      ui.innerHTML = `<div class="modal"><section class="panel"><h1>Начать заново?</h1><p>Открытые уровни и прогресс этой смены будут сброшены.</p><div class="row"><button id="cancel">Оставить прогресс</button><button id="confirm">Начать новую смену</button></div></section></div>`;
      this.button("cancel", () => this.settings());
      this.button("confirm", () => {
        this.save = freshSave();
        this.activeSeconds = 0;
        this.persist();
        this.startLevel(0, false);
      });
    });
  }
  how() {
    this.mode = "help";
    ui.innerHTML = `<div class="modal"><section class="panel"><h1>Смена сама себя не соберёт</h1><p><b>A / D или ← / →</b> — движение · <b>Пробел</b> — прыжок<br><b>Shift</b> — рывок · <b>F</b> — «Штраф» · <b>E</b> — взаимодействие<br><b>Esc</b> — пауза</p><p>Удерживай прыжок, чтобы подняться выше. Прыгай на уведомления сверху или отталкивай их «Штрафом». Светящиеся флажки сохраняют контрольную точку. После падения ты быстро появишься рядом.</p><p>Розовые искры наполняют тотал. Кофе ускоряет. Командные точки ✦ дают усиления найденных коллег. Объекты с отметкой E нужно активировать рядом. На телефоне используй экранные кнопки; удобнее повернуть экран горизонтально.</p><div class="row"><button class="primary" id="back">Понятно</button></div></section></div>`;
    this.button("back", () => this.menu());
  }
  startLevel(index: number, resume = false) {
    this.level = index;
    this.map = makeLevel(index);
    this.mode = "play";
    this.t = 0;
    this.hazardTime = 0;
    this.coins = 0;
    this.objective = 0;
    this.levelSeconds = 0;
    this.deaths = 0;
    this.bossStarted = false;
    this.bossDead = false;
    this.bossHP = index === 9 ? 9 : index === 11 ? 12 : 0;
    this.bossInv = 0;
    this.bossTimer = 0;
    this.projectiles = [];
    this.particles = [];
    this.cameraX = 0;
    this.lastSpeech = -10;
    this.bubble = "";
    this.prev = {};
    Object.keys(touch).forEach((k) => (touch[k] = false));
    this.checkpoint = resume ? this.save.checkpoint : 140;
    const platform = this.map.platforms.find(
      (p) =>
        this.checkpoint >= p.x &&
        this.checkpoint <= p.x + p.w &&
        p.kind === "solid",
    );
    this.checkpointY = platform?.y ?? 590;
    this.p = {
      x: this.checkpoint,
      y: this.checkpointY,
      vx: 0,
      vy: 0,
      face: 1,
      health: 4,
      ground: true,
      coyote: 0,
      jumpBuffer: 0,
      invuln: 1,
      dash: 0,
      dashCd: 0,
      fineCd: 0,
      coffee: 0,
      boost: 0,
      chill: 0,
      land: 0,
    };
    this.map.items.forEach((item) => {
      if (
        resume &&
        this.save.collected.includes(item.id) &&
        !["checkpoint", "laser", "fog", "wind", "team"].includes(item.kind)
      ) {
        item.taken = true;
        if (item.kind === "coin") this.coins++;
        if (
          ["alarm", "metric", "speaker", "page", "signal"].includes(item.kind)
        )
          this.objective++;
      }
    });
    this.save.level = index;
    this.save.checkpoint = this.checkpoint;
    this.activeSeconds = this.save.seconds;
    this.persist();
    music.chapter = Math.floor(index / 2);
    this.hud();
    this.cameraX = Math.max(0, this.p.x - 350);
    if (!resume || this.checkpoint === 140) {
      if (index === 0) this.dialogue(DIALOGUES.start);
      else if (index === 8) this.dialogue(DIALOGUES.report);
      else if (index === 10) this.dialogue(DIALOGUES.final);
      else this.toast(CHAPTERS[Math.floor(index / 2)].name);
    }
  }
  hud() {
    ui.innerHTML = `<div class="hud"><div class="hud-block"><div class="health" id="health"></div><div class="meter-label"><span>ТОТАЛ СМЕНЫ</span><b id="total"></b></div><div class="meter"><i id="meter"></i></div></div><div class="hud-block objective"><small>ГЛАВА ${Math.floor(this.level / 2) + 1} · ${LEVELS[this.level].name.toUpperCase()}</small><b id="objective"></b><div class="team">${Object.entries(
      names,
    )
      .map(
        ([id, n]) =>
          `<span class="${this.save.team.includes(id) ? "found" : ""}">${this.save.team.includes(id) ? "●" : "○"} ${n}</span>`,
      )
      .join(
        "",
      )}</div></div><button id="pause" aria-label="Пауза">Ⅱ</button></div><div class="bottom-hint"><span><b class="key">A D</b>движение</span><span><b class="key">SPACE</b>прыжок</span><span><b class="key">SHIFT</b>рывок</span><span><b class="key">E</b>действие</span></div><div class="ability" id="ability"></div><div class="touch">${["left", "right", "jump", "fine", "dash", "interact"].map((k, i) => `<button data-key="${k}" aria-label="${["Влево", "Вправо", "Прыжок", "Штраф", "Рывок", "Действие"][i]}">${["◀", "▶", "↑", "Штраф", "↠", "E"][i]}</button>`).join("")}</div><div class="rotate">↻ В горизонтальном режиме удобнее</div>`;
    this.button("pause", () => this.pause());
    ui.querySelectorAll<HTMLButtonElement>("[data-key]").forEach((b) => {
      const key = b.dataset.key!;
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        music.start();
        b.setPointerCapture(e.pointerId);
        touch[key] = true;
      });
      for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
        b.addEventListener(event, () => (touch[key] = false));
    });
    this.updateHUD();
  }
  updateHUD() {
    const health = document.getElementById("health");
    if (!health) return;
    health.innerHTML =
      "♥".repeat(Math.max(0, this.p.health)) +
      `<span>${"♥".repeat(4 - Math.max(0, this.p.health))}</span>`;
    const percent = Math.min(
      100,
      Math.floor((this.save.total / TOTAL.target) * 100),
    );
    document.getElementById("total")!.textContent = `${percent}%`;
    document.getElementById("meter")!.style.width = `${percent}%`;
    let suffix = this.map.objectives
      ? ` · ${this.objective}/${this.map.objectives}`
      : [2, 3].includes(this.level)
        ? ` · ${Math.min(this.coins, this.level === 2 ? 12 : 24)}/${this.level === 2 ? 12 : 24}`
        : "";
    document.getElementById("objective")!.textContent =
      LEVELS[this.level].task + suffix;
    const buffs = [
      this.p.coffee > 0 ? "Кофе" : null,
      this.p.boost > 0 ? "Тотал ×2" : null,
      this.p.chill > 0 ? "Чилл" : null,
    ]
      .filter(Boolean)
      .join(" · ");
    document.getElementById("ability")!.textContent =
      `F  ШТРАФ ${this.p.fineCd > 0 ? this.p.fineCd.toFixed(1) + " c" : "готов"}${buffs ? "  /  " + buffs : ""}`;
  }
  toast(message: string) {
    document.querySelector(".toast")?.remove();
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    ui.appendChild(el);
    this.toastUntil = this.t + 4;
  }
  speak(message: string) {
    if (this.t - this.lastSpeech < 4) return;
    this.bubble = message;
    this.bubbleUntil = this.t + 2.4;
    this.lastSpeech = this.t;
  }
  dialogue(lines: string[], after?: () => void) {
    this.mode = "dialogue";
    this.dialogueLines = [...lines];
    this.dialogueIndex = 0;
    this.afterDialogue = after;
    this.showDialogue();
  }
  showDialogue() {
    document.querySelector(".dialogue")?.remove();
    const el = document.createElement("div");
    el.className = "dialogue";
    el.innerHTML = `<small>${this.dialogueIndex % 2 === 0 ? "СТАС" : "КОМАНДА"}</small><p>${this.dialogueLines[this.dialogueIndex]}</p><button id="dialog-next">${this.dialogueIndex === this.dialogueLines.length - 1 ? "Погнали →" : "Дальше →"}</button>`;
    ui.appendChild(el);
    this.button("dialog-next", () => this.nextDialogue());
  }
  nextDialogue() {
    this.dialogueIndex++;
    if (this.dialogueIndex < this.dialogueLines.length) this.showDialogue();
    else {
      document.querySelector(".dialogue")?.remove();
      this.mode = "play";
      this.prev = { jump: true, interact: true };
      this.afterDialogue?.();
    }
  }
  pause() {
    this.mode = "pause";
    this.persist();
    ui.innerHTML = `<div class="modal"><section class="panel"><div class="eyebrow">Пять минут на кофе</div><h1>Смена подождёт</h1><p>${LEVELS[this.level].name} · контрольная точка сохранена</p><div class="row"><button class="primary" id="resume">Продолжить →</button><button id="checkpoint">К контрольной точке</button><button id="settings">Настройки</button><button id="menu">В меню</button></div></section></div>`;
    this.button("resume", () => {
      this.mode = "play";
      this.hud();
    });
    this.button("checkpoint", () => {
      this.mode = "play";
      this.respawn();
      this.hud();
    });
    this.button("settings", () => this.settings());
    this.button("menu", () => this.menu());
  }
  inputState() {
    return {
      left: this.keys.A.isDown || this.keys.LEFT.isDown || !!touch.left,
      right: this.keys.D.isDown || this.keys.RIGHT.isDown || !!touch.right,
      jump: this.keys.SPACE.isDown || !!touch.jump,
      dash: this.keys.SHIFT.isDown || !!touch.dash,
      fine: this.keys.F.isDown || !!touch.fine,
      interact: this.keys.E.isDown || !!touch.interact,
      esc: this.keys.ESC.isDown,
    };
  }
  burst(x: number, y: number, color = "#e9b4ff", count = 12) {
    for (let i = 0; i < count; i++)
      this.particles.push({
        x,
        y,
        vx: Math.cos(i * 2.4) * 80,
        vy: Math.sin(i * 2.4) * 90 - 40,
        life: 0.5 + Math.random() * 0.3,
        color,
      });
  }
  reward(item: Item, points: number) {
    item.taken = true;
    if (!this.save.collected.includes(item.id)) {
      this.save.collected.push(item.id);
      this.save.total += points * (this.p.boost > 0 ? TOTAL.boost : 1);
    }
    this.burst(item.x, item.y);
    music.tone(item.kind === "secret" ? 880 : 660, 0.1);
  }
  interact(item: Item) {
    if (item.taken) return;
    if (["alarm", "metric", "speaker", "page", "signal"].includes(item.kind)) {
      this.reward(item, 4);
      this.objective++;
      this.persist();
      this.toast(
        {
          alarm: "Будильник включён. Марат пока держится.",
          metric: "Метрика найдена. Артём одобряет.",
          speaker: "Колонка в ритме. Чилл активирован.",
          page: "Часть отчёта собрана.",
          signal: "Проверка пройдена. Команда на связи.",
        }[item.kind]!,
      );
      if (item.kind === "speaker") this.p.chill = ABILITIES.chillDuration;
    } else if (item.kind === "team") {
      if (this.save.team.includes("max")) {
        this.p.chill = ABILITIES.chillDuration;
        this.toast("Макс: спокойно. Чилл-режим включён.");
      }
      if (this.save.team.includes("roxy")) {
        this.p.boost = ABILITIES.boostDuration;
        this.toast("Рокси: Абоба. Тотал ×2!");
      }
      if (!this.save.team.length)
        this.toast("Собери команду, чтобы открыть усиления.");
      else {
        item.taken = true;
        this.burst(item.x, item.y);
      }
    }
  }
  hurt() {
    if (this.p.invuln > 0) return;
    this.p.health--;
    this.p.invuln = 1.5;
    this.p.vy = -320;
    this.p.vx = -this.p.face * 180;
    music.tone(90, 0.2, "sawtooth", 0.2);
    this.burst(this.p.x, this.p.y - 50, "#ff81a9");
    if (this.p.health <= 0) this.respawn();
  }
  respawn() {
    this.deaths++;
    this.p.x = this.checkpoint;
    this.p.y = this.checkpointY;
    this.p.vx = 0;
    this.p.vy = 0;
    this.p.health = 4;
    this.p.invuln = 2;
    this.p.ground = true;
    this.projectiles = [];
    if (this.bossStarted && !this.bossDead) {
      this.bossHP = this.level === 9 ? 9 : 12;
      this.bossStarted = false;
      this.bossTimer = 0;
    }
    this.cameraX = Math.max(0, this.p.x - 350);
    this.speak("Пупупу");
    this.toast("Снова в деле. Попытки не заканчиваются.");
  }
  ready() {
    return (
      this.objective >= this.map.objectives &&
      (!(this.level === 2 || this.level === 3) ||
        this.coins >= (this.level === 2 ? 12 : 24))
    );
  }
  finish() {
    if (!this.ready()) {
      this.toast(
        "Остались задания. Ориентируйся по указателю ближайшего объекта.",
      );
      return;
    }
    if ((this.level === 9 || this.level === 11) && !this.bossDead) {
      this.toast(
        "Сначала разберись с завалом. Прыгай сверху и используй «Штраф».",
      );
      return;
    }
    const recruit = (
      { 1: "marat", 3: "roxy", 5: "artem", 7: "max" } as Record<number, string>
    )[this.level];
    const complete = () => {
      if (!this.save.completed.includes(this.level)) {
        this.save.completed.push(this.level);
        this.save.total += TOTAL.level;
      }
      if (recruit && !this.save.team.includes(recruit))
        this.save.team.push(recruit);
      this.save.unlocked = Math.max(
        this.save.unlocked,
        Math.min(11, this.level + 1),
      );
      this.save.checkpoint = 140;
      this.save.level = Math.min(11, this.level + 1);
      this.persist();
      if (this.level === 11) {
        this.save.total = Math.max(TOTAL.target, this.save.total);
        this.persist();
        this.mode = "ending";
        this.endingAt = this.t;
        this.endingStage = 0;
        ui.innerHTML = "";
        return;
      }
      this.mode = "complete";
      ui.innerHTML = `<div class="modal"><section class="panel"><div class="eyebrow">Уровень ${this.level + 1} / 12</div><h1>${recruit ? `${names[recruit]} на смене` : "Ещё на шаг ближе"}</h1><p>${recruit ? { marat: "Проснулся. Ну, почти. Комната отдыха найдена.", roxy: "Рокси, тотал. Абоба. Усилитель тотала открыт.", artem: "Метрики проверены. Теперь секреты подсвечиваются.", max: "Вся команда в сборе. Чилл-режим открыт." }[recruit] : "Контрольная точка сохранена. Можно выдохнуть."}</p><div class="stats"><div><b>${Math.floor(this.levelSeconds / 60)}:${String(Math.floor(this.levelSeconds % 60)).padStart(2, "0")}</b><small>на уровне</small></div><div><b>${this.coins}</b><small>бонусов</small></div><div><b>${this.deaths}</b><small>возрождений</small></div></div><div class="row"><button class="primary" id="next">Следующий уровень →</button><button id="menu">В меню</button></div></section></div>`;
      this.button("next", () => this.startLevel(this.level + 1, false));
      this.button("menu", () => this.menu());
    };
    if (recruit && !this.save.team.includes(recruit))
      this.dialogue(DIALOGUES[recruit as "marat"], complete);
    else complete();
  }
  fine() {
    if (this.p.fineCd > 0) return;
    this.p.fineCd = ABILITIES.fineCooldown;
    this.attackUntil = this.t + 0.28;
    this.speak("Штраф");
    music.tone(160, 0.16, "triangle");
    this.map.enemies.forEach((e) => {
      if (
        e.alive &&
        Math.abs(e.x - this.p.x) < ABILITIES.fineRange &&
        Math.abs(e.y - (this.p.y - 40)) < 100
      ) {
        e.alive = false;
        this.burst(e.x, e.y, "#f4aacd");
      }
    });
    if (
      this.bossStarted &&
      Math.abs(this.bossX() - this.p.x) < 220 &&
      Math.abs(this.p.y - 500) < 140
    )
      this.hitBoss();
    this.projectiles = this.projectiles.filter(
      (q) => Math.abs(q.x - this.p.x) > 170,
    );
  }
  bossX() {
    return this.map.exit - 360 + Math.sin(this.bossTimer * 0.65) * 150;
  }
  hitBoss() {
    if (this.bossInv > 0 || this.bossDead) return;
    this.bossHP--;
    this.bossInv = 0.8;
    this.burst(this.bossX(), 440, "#fff0b9", 22);
    music.tone(260, 0.15, "sawtooth", 0.2);
    if (this.bossHP <= 0) {
      this.bossDead = true;
      this.projectiles = [];
      this.toast(
        this.level === 9
          ? "Отчёты сданы. Терминал открыт!"
          : "Завал разобран. Вся команда справилась!",
      );
    } else if (this.bossHP % 3 === 0) {
      const phase = Math.floor(((this.level === 9 ? 9 : 12) - this.bossHP) / 3);
      this.toast(
        this.level === 11
          ? [
              "Рокси: Абоба. Тотал-буст!",
              "Артём: слабое место подсвечено.",
              "Марат: я не сплю! Лови кофе.",
              "Макс: спокойно. Чилл.",
            ][Math.min(phase - 1, 3)]
          : ["Фаза 2: летающие ячейки", "Фаза 3: бумажная лавина"][phase - 1],
      );
      if (this.level === 11) {
        this.p.health = 4;
        if (phase === 1) this.p.boost = 12;
        if (phase === 2) this.bossInv = 0.3;
        if (phase === 3) {
          this.p.coffee = 9;
          this.p.chill = 9;
        }
      }
    }
  }
  update(_time: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.033);
    if (["play", "menu", "ending"].includes(this.mode)) {
      this.t += dt;
      music.update();
    }
    const input = this.inputState();
    if (input.esc && !this.prev.esc) {
      if (this.mode === "play") this.pause();
      else if (this.mode === "pause") {
        this.mode = "play";
        this.hud();
      }
    }
    if (this.mode === "dialogue" && input.interact && !this.prev.interact)
      this.nextDialogue();
    if (this.mode === "play") this.step(dt, input);
    if (this.mode === "ending") this.ending();
    this.prev = input;
    this.draw();
    this.surface.refresh();
    if (this.t > this.toastUntil) document.querySelector(".toast")?.remove();
  }
  step(dt: number, input: Record<string, boolean>) {
    this.activeSeconds += dt;
    this.levelSeconds += dt;
    this.save.seconds = this.activeSeconds;
    const p = this.p;
    for (const key of [
      "invuln",
      "dash",
      "dashCd",
      "fineCd",
      "coffee",
      "boost",
      "chill",
      "land",
    ] as const)
      p[key] = Math.max(0, p[key] - dt);
    this.bossInv = Math.max(0, this.bossInv - dt);
    const slow = p.chill > 0 ? 0.4 : 1;
    const previousHazardTime = this.hazardTime;
    this.hazardTime += dt * slow;
    for (const plat of this.map.platforms) {
      if (plat.kind === "moving") {
        const oldX = plat.x;
        plat.x = plat.baseX + Math.sin(this.hazardTime * 0.8 + plat.phase) * 45;
        plat.y = plat.baseY + Math.sin(this.hazardTime * 0.65 + plat.phase) * 22;
        if (
          p.ground &&
          Math.abs(p.y - plat.y) < 10 &&
          p.x > plat.x - 15 &&
          p.x < plat.x + plat.w + 15
        ) {
          p.x += plat.x - oldX;
          p.y = plat.y;
        }
      }
    }
    if (input.jump && !this.prev.jump) p.jumpBuffer = 0.14;
    else p.jumpBuffer -= dt;
    if (p.ground) p.coyote = 0.12;
    else p.coyote -= dt;
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir) p.face = dir;
    if (input.dash && !this.prev.dash && p.dashCd <= 0) {
      p.dash = ABILITIES.dashDuration;
      p.dashCd = ABILITIES.dashCooldown;
      this.burst(p.x, p.y - 40, "#ba9fff", 6);
    }
    const max = p.coffee > 0 ? 380 : 280;
    p.vx = Phaser.Math.Linear(
      p.vx,
      dir * max,
      Math.min(1, dt * (p.ground ? 12 : 7)),
    );
    if (p.dash > 0) p.vx = p.face * 630;
    if (p.jumpBuffer > 0 && p.coyote > 0) {
      p.vy = -760;
      p.ground = false;
      p.coyote = 0;
      p.jumpBuffer = 0;
      music.tone(350, 0.1, "sine", 0.15);
    }
    if (!input.jump && p.vy < -290) p.vy += 2000 * dt;
    const oldY = p.y;
    p.vy = Math.min(1000, p.vy + 1750 * dt);
    p.x = Math.max(20, Math.min(this.map.width - 20, p.x + p.vx * dt));
    p.y += p.vy * dt;
    p.ground = false;
    for (const plat of this.map.platforms) {
      if (plat.kind === "beat" && !this.beatOn(plat.phase)) continue;
      if (
        p.x + 17 > plat.x &&
        p.x - 17 < plat.x + plat.w &&
        p.vy >= 0 &&
        oldY <= plat.y + 12 &&
        p.y >= plat.y
      ) {
        p.y = plat.y;
        p.vy = 0;
        p.ground = true;
        if (oldY < plat.y - 4) p.land = 0.12;
      }
    }
    if (p.y > 800) this.respawn();
    if (input.fine && !this.prev.fine) this.fine();
    for (const item of this.map.items) {
      if (item.taken) continue;
      if (item.kind === "printer" && Math.abs(item.x - p.x) < 700 &&
          Math.floor(previousHazardTime / 3.6) < Math.floor(this.hazardTime / 3.6)) {
        this.projectiles.push({x:item.x,y:item.y-30,vx:p.x<item.x?-115:115,vy:-25});
      }
      const near =
        Math.abs(item.x - p.x) < 48 && Math.abs(item.y - (p.y - 35)) < 75;
      if (!near) continue;
      if (item.kind === "coin") {
        this.reward(item, TOTAL.coin);
        this.coins++;
      } else if (item.kind === "secret") {
        this.reward(item, TOTAL.secret);
        this.speak("Абоба");
      } else if (item.kind === "coffee") {
        this.reward(item, 0);
        p.coffee = ABILITIES.coffeeDuration;
        p.health = Math.min(4, p.health + 1);
        this.toast("Кофе: ускорение и +1 здоровье");
      } else if (
        item.kind === "checkpoint" &&
        item.x > this.checkpoint &&
        p.ground
      ) {
        this.checkpoint = item.x;
        this.checkpointY = item.y + 48;
        this.save.checkpoint = item.x;
        this.persist();
        p.health = 4;
        this.toast("Контрольная точка · прогресс сохранён");
        music.tone(880, 0.25);
      } else if (item.kind === "laser" && this.laserOn(item.id)) {
        this.hurt();
      } else if (item.kind === "fog") {
        p.vx *= 0.9;
      } else if (item.kind === "wind" && input.jump) {
        p.vy = Math.min(p.vy, -400);
      } else if (input.interact && !this.prev.interact) this.interact(item);
    }
    for (const enemy of this.map.enemies) {
      if (!enemy.alive) continue;
      enemy.x =
        enemy.baseX +
        Math.sin(
          this.hazardTime * (ENEMIES[enemy.kind].speed / 65) + enemy.phase,
        ) *
          68;
      enemy.y =
        enemy.baseY +
        (enemy.kind === "cell" ? Math.sin(this.hazardTime * 2 + enemy.phase) * 12 : 0);
      if (Math.abs(enemy.x - p.x) < 36 && Math.abs(enemy.y - (p.y - 25)) < 43) {
        if (p.vy > 90 && oldY < enemy.y + 6) {
          enemy.alive = false;
          p.vy = -500;
          this.burst(enemy.x, enemy.y);
          music.tone(220, 0.1);
        } else this.hurt();
      }
    }
    if (
      (this.level === 9 || this.level === 11) &&
      p.x > this.map.exit - 800 &&
      this.ready() &&
      !this.bossStarted &&
      !this.bossDead
    ) {
      this.bossStarted = true;
      this.bossTimer = 0;
      this.checkpoint = this.map.exit - 780;
      this.checkpointY = 530;
      this.save.checkpoint = this.checkpoint;
      this.persist();
      this.speak("Пупупу");
      this.toast("Прыгай на босса сверху или подойди и нажми F");
    }
    if (this.bossStarted && !this.bossDead) {
      const previous = this.bossTimer;
      this.bossTimer += dt * slow;
      const phase = Math.floor(((this.level === 9 ? 9 : 12) - this.bossHP) / 3);
      if (
        Math.floor(previous / (1.5 - phase * 0.2)) <
        Math.floor(this.bossTimer / (1.5 - phase * 0.2))
      ) {
        const x = this.bossX();
        this.projectiles.push({
          x,
          y: 470,
          vx: (p.x < x ? -1 : 1) * (150 + phase * 30),
          vy: phase === 2 ? -90 : 0,
        });
        if (phase >= 1)
          this.projectiles.push({ x: p.x + 160, y: 120, vx: -25, vy: 200 });
      }
      const bx = this.bossX();
      if (Math.abs(p.x - bx) < 65 && p.y > 400 && p.y < 540) {
        if (p.vy > 100 && oldY < 430) {
          this.hitBoss();
          p.vy = -680;
        } else this.hurt();
      }
    }
    this.projectiles = this.projectiles.filter(
      (q) => q.y < 750 && Math.abs(q.x - p.x) < 1500,
    );
    this.projectiles.forEach((q) => {
      q.x += q.vx * dt * slow;
      q.y += q.vy * dt * slow;
      if (Math.abs(q.x - p.x) < 25 && Math.abs(q.y - (p.y - 40)) < 45)
        this.hurt();
    });
    if (p.x > this.map.exit - 90 && input.interact && !this.prev.interact)
      this.finish();
    this.cameraX = Phaser.Math.Linear(
      this.cameraX,
      Phaser.Math.Clamp(p.x - 430 + p.vx * 0.2, 0, this.map.width - 1280),
      Math.min(1, dt * 5),
    );
    this.particles = this.particles.filter((q) => q.life > 0);
    this.particles.forEach((q) => {
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += 180 * dt;
    });
    this.hudTimer += dt;
    if (this.hudTimer > 0.12) {
      this.updateHUD();
      this.hudTimer = 0;
    }
  }
  beatOn(phase: number) {
    return (this.hazardTime + phase) % 2.4 < 1.75;
  }
  laserOn(id: string) {
    return (this.hazardTime + Number(id.split("-")[1]) * 0.2) % 3.6 > 2.3;
  }
  ending() {
    const elapsed = this.t - this.endingAt;
    if (elapsed > 1 && this.endingStage === 0) {
      this.endingStage = 1;
      ui.innerHTML =
        '<div class="ending" style="background:transparent;justify-content:flex-start;padding-top:90px"><p>Смена собрана<br>Тотал достигнут<br>Отчёты сданы<br>ОКК пройден</p></div>';
    }
    if (elapsed > 8 && this.endingStage === 1) {
      this.endingStage = 2;
      ui.innerHTML = '<div class="ending"><h1>бонус ?</h1></div>';
    }
    if (elapsed > 11 && this.endingStage === 2) {
      this.endingStage = 3;
      ui.querySelector(".ending")!.insertAdjacentHTML(
        "beforeend",
        '<div class="row"><button id="replay">Повторить прохождение</button><button id="select">Выбор уровней</button></div>',
      );
      this.button("replay", () => this.startLevel(0, false));
      this.button("select", () => this.levelSelect());
    }
  }
  draw() {
    const c = this.c;
    const menu = ["menu", "select", "settings", "help"].includes(this.mode);
    const chapter = menu ? 0 : Math.floor(this.level / 2);
    background(c, menu ? 300 : this.cameraX, this.t, chapter);
    if (menu) {
      this.drawMenu(c);
      return;
    }
    if (this.mode === "ending") {
      this.drawEnding(c);
      return;
    }
    c.save();
    c.translate(-this.cameraX, 0);
    const accent = palette[chapter];
    const firstSection = Math.max(1, Math.floor((this.cameraX - 780) / 440 / 12));
    for (let section=firstSection;section<=firstSection+1;section++) {
      const x=780+section*5280;
      const room=Math.min(3,Math.floor(section*12/LEVELS[this.level].segments*4));
      round(c,x,204,420,91,12,"#241d32ee","#6f557d");
      text(c,ROOMS[chapter][room].toUpperCase(),x+25,237,14,accent);
      text(c,["Марат где-то спит →","Рокси, тотал. — Абоба.","Стас, посмотри метрики.","Макс: всё спокойно. Лови ритм.","Отчёт сам себя не сдаст.","Команда на связи. Держимся."][chapter],x+25,267,14,"#d6c1e1");
    }
    for (const p of this.map.platforms) {
      if (p.x + p.w < this.cameraX - 100 || p.x > this.cameraX + 1380) continue;
      const on = p.kind !== "beat" || this.beatOn(p.phase);
      c.globalAlpha = on ? 1 : 0.28;
      round(c, p.x, p.y, p.w, 26, 6, "#42384f", "#756482");
      const g = c.createLinearGradient(p.x, p.y, p.x, p.y + 60);
      g.addColorStop(0, "#362d45");
      g.addColorStop(1, "#1b192a");
      round(c, p.x + 5, p.y + 23, p.w - 10, 75, 3, g as unknown as string);
      round(c, p.x + 2, p.y, p.w - 4, 5, 2, accent);
      if (this.level===1 && p.w<500) {
        round(c,p.x+8,p.y+7,p.w-16,15,7,"#8d7fa1");
        for(let px=p.x+25;px<p.x+p.w-20;px+=65)text(c,"✧",px,p.y+20,13,"#c8b5df");
      }
      if(chapter===2){
        c.strokeStyle="#73e1ed33";c.lineWidth=1;
        for(let y=p.y+32;y<700;y+=25){c.beginPath();c.moveTo(p.x+8,y);c.lineTo(p.x+p.w-8,y);c.stroke();}
        text(c,`${Math.round((590-p.y)/2+25)}%`,p.x+20,p.y+59,15,"#88d1d3");
      }
      if(chapter===4){
        for(let px=p.x+20;px<p.x+p.w-20;px+=55){round(c,px,p.y+35,42,20,2,"#9a819455");text(c,"—",px+20,p.y+49,10,"#d9c4d0","center");}
      }
      for (let x = p.x + 20; x < p.x + p.w - 10; x += 60) {
        round(c, x, p.y + 37, 37, 5, 2, "#61506b66");
      }
      if (p.kind === "moving")
        text(c, "↔", p.x + p.w / 2, p.y + 21, 18, "#f3e6ff", "center");
      if (p.kind === "beat")
        text(c, "♪", p.x + p.w / 2, p.y + 21, 18, "#f3e6ff", "center");
      c.globalAlpha = 1;
    }
    for (const item of this.map.items) {
      if (item.taken || Math.abs(item.x - this.cameraX - 640) > 750) continue;
      this.drawItem(c, item);
    }
    for (const e of this.map.enemies) {
      if (!e.alive || Math.abs(e.x - this.cameraX - 640) > 740) continue;
      const bob = Math.sin(this.t * 4 + e.phase) * 3;
      round(
        c,
        e.x - 23,
        e.y - 23 + bob,
        46,
        35,
        9,
        chapter === 4 ? "#c7b4a2" : "#a16591",
        "#efb4d4",
      );
      text(
        c,
        chapter === 4 ? "▤" : "!",
        e.x,
        e.y + 2 + bob,
        22,
        "#fff",
        "center",
      );
      text(c, "•  •", e.x, e.y - 10 + bob, 11, "#422b47", "center");
      c.strokeStyle = "#d5a0be";
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(e.x - 13, e.y + 12);
      c.lineTo(e.x - 19, e.y + 20 + Math.sin(this.t * 12) * 3);
      c.moveTo(e.x + 13, e.y + 12);
      c.lineTo(e.x + 19, e.y + 20 - Math.sin(this.t * 12) * 3);
      c.stroke();
    }
    // Start signage and branded wall plaque.
    if (this.cameraX < 600) {
      round(c, 85, 220, 475, 105, 14, "#211b30dd", "#796285");
      angel(c, 140, 267, 65);
      text(c, "Only Angels", 195, 265, 33, "#eec4ef", "left", "700");
      text(c, CHAPTERS[chapter].short.toUpperCase(), 198, 293, 11, "#b5a3c7");
      text(
        c,
        this.level === 0
          ? "A / D — движение     ПРОБЕЛ — прыжок"
          : "Смена продолжается. Ты справишься.",
        135,
        385,
        17,
        "#ecdaff",
      );
      if (this.level === 0)
        text(
          c,
          "Удерживай прыжок, чтобы подняться выше.",
          135,
          415,
          12,
          "#b8a7c8",
        );
    }
    const exit = this.map.exit;
    round(c, exit - 52, 365, 95, 165, 14, "#322844", "#b79ccd");
    round(c, exit - 44, 374, 78, 149, 9, "#463651");
    text(c, "→", exit - 4, 460, 42, "#eac6ff", "center");
    text(c, "E · ДАЛЬШЕ", exit - 4, 350, 13, "#edd2fc", "center");
    const recruit = (
      { 1: "marat", 3: "roxy", 5: "artem", 7: "max" } as Record<number, string>
    )[this.level];
    if (recruit) teammate(c, exit - 115, 530, recruit, this.t, 0.8);
    if ((this.level === 9 || this.level === 11) && !this.bossDead) {
      const x = this.bossX();
      c.save();
      c.translate(x, 460);
      c.rotate(Math.sin(this.t * 2) * 0.04);
      round(
        c,
        -67,
        -73,
        134,
        120,
        13,
        this.bossInv > 0 ? "#e5aac5" : "#958397",
        "#e4c7e8",
      );
      for (let i = 0; i < 3; i++)
        round(c, -47, -51 + i * 20, 90, 7, 2, "#eee4ec");
      text(c, "⌐  ⌐", 0, -5, 34, "#382438", "center");
      text(c, "▰", 0, 31, 24, "#54374e", "center");
      c.restore();
      text(
        c,
        this.level === 9 ? "НЕСДАННЫЙ ОТЧЁТ" : "ЗАВАЛ СМЕНЫ",
        x,
        347,
        13,
        "#efc5e6",
        "center",
      );
      round(c, x - 70, 360, 140, 6, 3, "#4a354d");
      round(
        c,
        x - 70,
        360,
        (140 * this.bossHP) / (this.level === 9 ? 9 : 12),
        6,
        3,
        "#f2acd0",
      );
    }
    for (const q of this.projectiles) {
      round(c, q.x - 15, q.y - 12, 30, 24, 3, "#f3c4d5");
      text(c, "!", q.x, q.y + 6, 18, "#734a67", "center");
    }
    if (this.p.invuln <= 0 || Math.sin(this.t * 30) > 0)
      stas(
        c,
        this.p.x,
        this.p.y,
        this.t,
        this.p.vx,
        this.p.vy,
        this.p.face,
        this.attackUntil > this.t
          ? "fine"
          : this.p.land > 0
            ? "land"
            : Math.abs(this.p.vx) < 5 && this.t % 9 > 6
              ? "phone"
              : "idle",
        0.72,
      );
    if (this.attackUntil > this.t) {
      c.save();
      c.translate(this.p.x + this.p.face * 90, this.p.y - 57);
      c.rotate(-0.15);
      round(c, -62, -24, 124, 48, 6, "#ffb4d626", "#ffc4e8");
      text(c, "ШТРАФ", 0, 8, 24, "#ffcee8", "center", "800");
      c.restore();
    }
    if (this.t < this.bubbleUntil) {
      const w = this.bubble.length * 10 + 26;
      round(c, this.p.x - w / 2, this.p.y - 148, w, 32, 10, "#f5e6f8");
      text(c, this.bubble, this.p.x, this.p.y - 127, 15, "#49334f", "center");
    }
    for (const q of this.particles) {
      c.globalAlpha = Math.max(0, q.life);
      c.fillStyle = q.color;
      c.fillRect(q.x - 3, q.y - 3, 6, 6);
    }
    c.globalAlpha = 1;
    c.restore();
    if (!this.ready()) {
      const missing = this.map.items
        .filter(
          (i) =>
            !i.taken &&
            ["alarm", "metric", "speaker", "page", "signal"].includes(i.kind),
        )
        .sort((a, b) => Math.abs(a.x - this.p.x) - Math.abs(b.x - this.p.x))[0];
      if (missing && Math.abs(missing.x - this.p.x) > 600) {
        text(
          c,
          `${missing.x < this.p.x ? "←" : "→"}  ${Math.round(Math.abs(missing.x - this.p.x) / 100)} м до задания`,
          640,
          147,
          12,
          "#e5c4f7",
          "center",
        );
      }
    }
    const progress = this.p.x / this.map.exit;
    round(c, 35, 701, 1210, 3, 1, "#a786ba22");
    round(c, 35, 701, 1210 * progress, 3, 1, accent + "88");
    const room = Math.min(3, Math.floor(progress * 4));
    text(
      c,
      `${ROOMS[chapter][room]}  /  ${Math.floor(progress * 100)}% маршрута`,
      1245,
      678,
      11,
      "#c2a9d3",
      "right",
    );
  }
  drawItem(c: CanvasRenderingContext2D, i: Item) {
    const bob = Math.sin(this.t * 3 + i.x) * 4,
      x = i.x,
      y = i.y + bob;
    const near =
      Math.abs(x - this.p.x) < 65 && Math.abs(y - (this.p.y - 35)) < 100;
    if (i.kind === "coin" || i.kind === "secret") {
      const secret = i.kind === "secret";
      c.save();
      if(secret && !this.save.team.includes("artem") && !near)c.globalAlpha=.38;
      c.translate(x, y);
      c.rotate(Math.PI / 4);
      c.shadowColor = secret ? "#a7f3e4" : "#f6b3e5";
      c.shadowBlur = secret ? 18 : 10;
      round(
        c,
        -(secret ? 10 : 7),
        -(secret ? 10 : 7),
        secret ? 20 : 14,
        secret ? 20 : 14,
        3,
        secret ? "#9bebd4" : "#eeb5de",
      );
      c.shadowBlur = 0;
      c.restore();
      if (secret && this.save.team.includes("artem")) {
        text(c, "МЕТРИКИ ↓", x, y - 25, 10, "#9af1de", "center");
      }
    } else if (i.kind === "printer") {
      const warning=this.hazardTime%3.6>2.6;
      round(c,x-28,y-10,56,38,5,"#8c7b90","#d6bfd7");
      round(c,x-19,y-28,38,27,3,"#ebdfec");
      round(c,x-20,y+10,40,8,2,"#352b43");
      round(c,x+17,y-3,5,5,2,warning?"#ff92b9":"#91ddc3");
      if(warning)text(c,"ПЕЧАТЬ!",x,y-42,11,"#ffb4d2","center");
    } else if (i.kind === "checkpoint") {
      c.strokeStyle = "#ac9bbe";
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(x, y + 48);
      c.lineTo(x, y - 42);
      c.stroke();
      round(
        c,
        x,
        y - 42,
        40,
        27,
        4,
        i.x <= this.checkpoint ? "#ace6d2" : "#b693d2",
      );
      text(c, "✓", x + 20, y - 23, 16, "#2e293b", "center");
    } else if (i.kind === "laser") {
      const active = this.laserOn(i.id);
      round(c, x - 14, y + 12, 28, 16, 4, "#776078");
      c.globalAlpha = active ? 0.9 : 0.2;
      round(c, x - 4, y - 112, 8, 128, 3, active ? "#ff80ac" : "#a9ebd4");
      c.globalAlpha = 1;
      text(
        c,
        active ? "!" : "○",
        x,
        y - 125,
        16,
        active ? "#ffb5d0" : "#a9ebd4",
        "center",
      );
    } else if (i.kind === "fog") {
      const g = c.createRadialGradient(x, y, 0, x, y, 85);
      g.addColorStop(0, "#d2cbff55");
      g.addColorStop(1, "#d2cbff00");
      c.fillStyle = g;
      c.fillRect(x - 85, y - 85, 170, 170);
      text(c, "z z z", x, y, 16, "#d8cef7", "center");
    } else if (i.kind === "wind") {
      text(
        c,
        "↑ ↑",
        x,
        y - 20 - Math.sin(this.t * 5) * 8,
        27,
        "#a9ecdf",
        "center",
      );
      round(c, x - 25, y + 16, 50, 15, 4, "#554366");
    } else {
      const symbols: Record<string, string> = {
        coffee: "☕",
        alarm: "◷",
        metric: "▥",
        speaker: "♫",
        page: "▤",
        signal: "✓",
        team: "✦",
      };
      round(
        c,
        x - 19,
        y - 21,
        38,
        40,
        10,
        i.kind === "coffee" ? "#765840" : "#594168",
        "#c8a3dc",
      );
      text(c, symbols[i.kind] || "✦", x, y + 7, 24, "#f6dafa", "center");
      if (near && i.kind !== "coffee") {
        round(c, x - 18, y - 54, 36, 24, 6, "#f4e3fa");
        text(c, "E", x, y - 37, 14, "#48304e", "center");
      } else if (
        ["alarm", "metric", "speaker", "page", "signal"].includes(i.kind)
      )
        text(c, "↓", x, y - 35, 17, "#e9c3fa", "center");
    }
  }
  drawMenu(c: CanvasRenderingContext2D) {
    round(c, 760, 573, 420, 26, 8, "#594661", "#c6a3d7");
    round(c, 767, 599, 406, 120, 5, "#221c30");
    for (let i = 0; i < 6; i++)
      round(c, 789 + i * 66, 617, 42, 5, 2, "#6a4d7744");
    const glow = c.createRadialGradient(980, 360, 40, 980, 360, 310);
    glow.addColorStop(0, "#cf91ff20");
    glow.addColorStop(1, "#cf91ff00");
    c.fillStyle = glow;
    c.fillRect(650, 0, 630, 690);
    stas(c, 975, 575, this.t, 0, 0, 1, this.t % 9 > 6 ? "phone" : "idle", 2.12);
    round(c, 1112, 527, 32, 46, 5, "#d4b4ca");
    text(c, "☕", 1128, 554, 19, "#fff", "center");
    for (let i = 0; i < 7; i++) {
      const x = 800 + ((i * 83) % 400),
        y = 160 + ((i * 77) % 320) + Math.sin(this.t + i) * 9;
      c.save();
      c.translate(x, y);
      c.rotate(0.8);
      round(c, -4, -4, 8, 8, 2, "#e2b1ff77");
      c.restore();
    }
    round(c, 786, 145, 150, 39, 11, "#35263dd9", "#83618f");
    text(c, "Пупупу", 861, 170, 17, "#efd9f8", "center");
  }
  drawEnding(c: CanvasRenderingContext2D) {
    round(c, 200, 600, 890, 30, 7, "#52415f", "#bd9ad3");
    teammate(c, 330, 600, "roxy", this.t, 1.2);
    teammate(c, 475, 600, "artem", this.t, 1.2);
    stas(c, 640, 600, this.t, 0, 0, 1, "idle", 1.4);
    teammate(c, 800, 600, "marat", this.t, 1.2);
    teammate(c, 965, 600, "max", this.t, 1.2);
    round(c, 908, 546, 120, 18, 5, "#292033", "#d8aef0");
    text(c, "♫", 968, 541, 22, "#e1b4f1", "center");
  }
}
new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "game",
  width: 1280,
  height: 720,
  backgroundColor: "#11101b",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: Shift,
  render: { antialias: true },
  input: { activePointers: 4 },
});
// Read-only diagnostic snapshot for reproducible local QA.
Object.defineProperty(window, "onlyAngels", {
  get: () => ({
    mode: gameScene?.mode,
    level: gameScene?.level,
    position: { x: gameScene?.p.x, y: gameScene?.p.y },
    health: gameScene?.p.health,
    checkpoint: gameScene?.checkpoint,
    total: gameScene?.save.total,
    unlocked: gameScene?.save.unlocked,
    objective: gameScene?.objective,
    coins: gameScene?.coins,
    seconds: gameScene?.activeSeconds,
  }),
});
