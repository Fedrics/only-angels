export const TOTAL = { target: 5400, coin: 1, secret: 8, level: 360, boost: 2 };
export const ABILITIES = {
  fineCooldown: 3,
  fineRange: 150,
  dashCooldown: 1.15,
  dashDuration: 0.18,
  coffeeDuration: 9,
  boostDuration: 12,
  chillDuration: 9,
};
export const ENEMIES = {
  notification: { speed: 65 },
  cell: { speed: 90 },
  paper: { speed: 110 },
};
export const DIALOGUES = {
  start: [
    "Смена через пять минут. Команда где-то здесь.",
    "Сначала найду Марата. Главное — самому не уснуть.",
  ],
  marat: ["Марат… Марат! Смена!", "Ещё пять мину… Ладно, я с вами."],
  roxy: ["Рокси, тотал.", "Абоба.", "Вот теперь другое дело."],
  artem: ["Стас, посмотри метрики.", "Смотрю. Они опять выше меня."],
  max: ["Макс, у нас тут рабочий хаос.", "Всё спокойно. Сейчас поставлю бит."],
  report: ["Отчёт сам себя не сдаст.", "Пупупу."],
  final: ["Команда в сборе. Последний рывок.", "Переживём этот разбор вместе."],
};
export const CHAPTERS = [
  { name: "Смена через пять минут", short: "Ночной офис", color: "#c7a2ff" },
  { name: "Рокси, сделай тотал", short: "Комната чатов", color: "#ff9bc9" },
  { name: "Стас, посмотри метрики", short: "Город метрик", color: "#73e1ed" },
  { name: "Макс на чилле", short: "Музыкальная крыша", color: "#ba9bff" },
  {
    name: "Отчёт сам себя не сдаст",
    short: "Фабрика отчётов",
    color: "#ffc68c",
  },
  { name: "Разбор ОКК", short: "Зал разбора", color: "#ff8cab" },
];
export const LEVELS = [
  {
    name: "После полуночи",
    task: "Найди комнату отдыха",
    kind: "office",
    segments: 76,
  },
  {
    name: "Ещё пять минуточек",
    task: "Включи 3 будильника и разбуди Марата",
    kind: "sleep",
    segments: 82,
  },
  {
    name: "Входящие не спят",
    task: "Собери цепочку из 12 бонусов",
    kind: "chat",
    segments: 90,
  },
  {
    name: "Абоба. И ещё раз",
    task: "Наполни локальный тотал: 24 бонуса",
    kind: "roxy",
    segments: 96,
  },
  {
    name: "Вверх по графику",
    task: "Найди 4 верные метрики",
    kind: "metrics",
    segments: 92,
  },
  {
    name: "Правильный маршрут",
    task: "Собери 4 метрики для Артёма",
    kind: "artem",
    segments: 96,
  },
  {
    name: "На одной волне",
    task: "Пройди крышу в ритме музыки",
    kind: "music",
    segments: 94,
  },
  {
    name: "Чилл перед бурей",
    task: "Включи 3 колонки и найди Макса",
    kind: "max",
    segments: 98,
  },
  {
    name: "Бумажный понедельник",
    task: "Собери 4 части отчёта",
    kind: "paper",
    segments: 100,
  },
  {
    name: "Несданный отчёт",
    task: "Доставь 3 части к терминалу и победи отчёт",
    kind: "report",
    segments: 96,
  },
  {
    name: "Всё под контролем",
    task: "Пройди 4 зоны проверки ОКК",
    kind: "okk",
    segments: 104,
  },
  {
    name: "Завал смены",
    task: "Собери 4 командных сигнала и останови завал",
    kind: "final",
    segments: 104,
  },
] as const;
export type Platform = {
  x: number;
  y: number;
  w: number;
  kind: string;
  baseX: number;
  baseY: number;
  phase: number;
};
export type Item = {
  id: string;
  x: number;
  y: number;
  kind: string;
  taken: boolean;
};
export type Enemy = {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  alive: boolean;
  phase: number;
  kind: "notification" | "cell" | "paper";
};
export const ROOMS = [
  ["Ресепшен", "Опенспейс", "Кофе-поинт", "Комната отдыха"],
  ["Новые подписки", "Непрочитанные", "Цепочка бонусов", "Тотал команды"],
  ["Входящие данные", "Графики роста", "Скрытая аналитика", "Проверка метрик"],
  ["Выход на крышу", "Звуковая волна", "Световая дорожка", "DJ-зона"],
  ["Очередь печати", "Летающие ячейки", "Архив смены", "Терминал отчётности"],
  [
    "Фрагменты чатов",
    "Зона замечаний",
    "Командная проверка",
    "Последний рывок",
  ],
];
export function makeLevel(index: number) {
  const level = LEVELS[index],
    chapter = Math.floor(index / 2),
    platforms: Platform[] = [],
    items: Item[] = [],
    enemies: Enemy[] = [];
  const add = (x: number, y: number, w: number, kind = "solid", phase = 0) =>
    platforms.push({ x, y, w, kind, baseX: x, baseY: y, phase });
  const item = (x: number, y: number, kind: string) =>
    items.push({ id: `${index}-${items.length}`, x, y, kind, taken: false });
  add(0, 590, 780);
  let end = 780;
  const objectives =
    index === 1 || index === 7 || index === 9
      ? 3
      : [4, 5, 8, 10, 11].includes(index)
        ? 4
        : 0;
  const objectiveSegments = Array.from(
    { length: objectives },
    (_, i) =>
      4 + Math.floor((i * (level.segments - 7)) / Math.max(1, objectives - 1)),
  );
  for (let i = 0; i < level.segments; i++) {
    const x = 780 + i * 440,
      y = 530 - [0, 40, 100, 40, 0, 70][(i + index) % 6];
    // A broad, stable landing exists in every section; upper routes are optional.
    add(x, y, 330);
    end = x + 330;
    const special = i % 5 === 2;
    if (special)
      add(
        x + 325,
        y - 30,
        112,
        chapter === 3 ? "beat" : chapter === 2 ? "moving" : "solid",
        i,
      );
    if (i % 3 === 0 && !objectiveSegments.includes(i)) {
      add(x + 90, y - 120, 150, chapter === 2 ? "moving" : "solid", i);
      item(x + 160, y - 155, "secret");
    }
    for (let c = 0; c < 3; c++) item(x + 65 + c * 78, y - 48, "coin");
    if (objectiveSegments.includes(i))
      item(
        x + 160,
        y - 42,
        index === 1
          ? "alarm"
          : chapter === 2
            ? "metric"
            : chapter === 3
              ? "speaker"
              : chapter === 4
                ? "page"
                : "signal",
      );
    if (i % 6 === 3) item(x + 55, y - 38, "coffee");
    if (i % 7 === 5) item(x + 175, y - 42, "team");
    if (i > 1 && i % 3 === 1 && !objectiveSegments.includes(i))
      enemies.push({
        x: x + 220,
        y: y - 21,
        baseX: x + 220,
        baseY: y - 21,
        alive: true,
        phase: i,
        kind: chapter === 4 ? "paper" : chapter === 2 ? "cell" : "notification",
      });
    if (i % 18 === 11) item(x + 290, y - 48, "checkpoint");
    if (chapter === 3 && i % 4 === 3) item(x + 260, y - 25, "laser");
    if (index === 1 && i % 4 === 1) item(x + 160, y - 30, "fog");
    if (chapter === 3 && i % 4 === 1) item(x + 100, y - 30, "wind");
    if (chapter === 4 && i % 8 === 4 && !objectiveSegments.includes(i))
      item(x + 150, y - 30, "printer");
  }
  add(end + 90, 530, 1000);
  const exit = end + 940;
  return { platforms, items, enemies, exit, width: exit + 120, objectives };
}
export type Save = {
  version: 1;
  unlocked: number;
  level: number;
  checkpoint: number;
  total: number;
  team: string[];
  completed: number[];
  collected: string[];
  seconds: number;
  volume: number;
};
export const freshSave = (): Save => ({
  version: 1,
  unlocked: 0,
  level: 0,
  checkpoint: 140,
  total: 0,
  team: [],
  completed: [],
  collected: [],
  seconds: 0,
  volume: 0.35,
});
export function readSave(): Save {
  try {
    const s = JSON.parse(localStorage.getItem("only-angels-v1") || "null");
    if (s?.version === 1 && Array.isArray(s.team) && Array.isArray(s.collected))
      return {
        ...freshSave(),
        ...s,
        level: Math.max(0, Math.min(11, Number(s.level) || 0)),
        unlocked: Math.max(0, Math.min(11, Number(s.unlocked) || 0)),
      };
  } catch {}
  return freshSave();
}
export function writeSave(s: Save) {
  try {
    localStorage.setItem("only-angels-v1", JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
