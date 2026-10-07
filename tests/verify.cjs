const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const ts = require("typescript");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const storage = new Map();
const element = () => ({
  style: {},
  dataset: {},
  innerHTML: "",
  textContent: "",
  addEventListener() {},
  appendChild() {},
  querySelectorAll() {
    return [];
  },
  querySelector() {
    return element();
  },
  insertAdjacentHTML() {},
  remove() {},
  toDataURL() {
    return "";
  },
  getContext() {
    return {};
  },
});
const doc = {
  getElementById: element,
  querySelector() {
    return null;
  },
  createElement: element,
  addEventListener() {},
};
const phaser = {
  Scene: class {},
  Game: class {},
  CANVAS: 1,
  Scale: { FIT: 1, CENTER_BOTH: 1 },
  Math: {
    Linear: (a, b, t) => a + (b - a) * t,
    Clamp: (x, a, b) => Math.max(a, Math.min(b, x)),
  },
};
const cache = {};
function load(name) {
  if (cache[name]) return cache[name];
  let source = fs.readFileSync(path.join(root, "src", name + ".ts"), "utf8");
  if (name === "main") source += "\nexport {Shift};";
  const module = { exports: {} };
  const context = {
    module,
    exports: module.exports,
    console,
    Math,
    Number,
    Object,
    Array,
    JSON,
    String,
    document: doc,
    window: { addEventListener() {} },
    localStorage: {
      getItem: (k) => storage.get(k) || null,
      setItem: (k, v) => storage.set(k, v),
    },
    AudioContext: class {},
    require: (s) =>
      s === "phaser"
        ? { default: phaser }
        : s.endsWith(".css")
          ? {}
          : s === "./art"
            ? new Proxy({}, { get: () => () => {} })
            : load(s.replace("./", "")),
  };
  vm.runInNewContext(
    ts.transpile(source, {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: false,
    }),
    context,
    { filename: name + ".js" },
  );
  cache[name] = module.exports;
  return module.exports;
}
const { Shift } = load("main"),
  data = load("data");
let checks = 0;
function check(test, message) {
  assert.ok(test, message);
  checks++;
}
const result = [];
for (let level = 0; level < 12; level++) {
  const game = new Shift();
  game.startLevel(level, false);
  game.mode = "play";
  let frames = 0,
    jumpHold = 0,
    lastX = 0,
    stuck = 0;
  while (game.p.x < game.map.exit - 110 && frames < 36000) {
    const p = game.p;
    const platform = game.map.platforms
      .filter(
        (a) =>
          a.kind === "solid" &&
          p.x >= a.x - 17 &&
          p.x <= a.x + a.w + 17 &&
          Math.abs(p.y - a.y) < 8,
      )
      .sort((a, b) => a.y - b.y)[0];
    const edge = platform ? platform.x + platform.w - p.x : 1000;
    if (p.ground && edge < 42 && !game.prev.jump) jumpHold = 52;
    else if (p.ground && game.prev.jump) jumpHold = 0;
    const input = {
      right: true,
      left: false,
      jump: jumpHold > 0,
      fine: frames % 190 === 0,
      interact: frames % 2 === 0,
      dash: false,
    };
    game.t += 1 / 60;
    game.step(1 / 60, input);
    game.prev = input;
    jumpHold = Math.max(0, jumpHold - 1);
    frames++;
    if (Math.abs(p.x - lastX) < 0.02) stuck++;
    else stuck = 0;
    lastX = p.x;
    if (stuck > 600) break;
    // Boss encounters are covered separately; the route test stops at their arena.
    if (game.bossStarted) break;
  }
  const reached = game.p.x > game.map.exit - 900;
  result.push({
    level: level + 1,
    reached,
    seconds: +(frames / 60).toFixed(1),
    deaths: game.deaths,
    objectives: game.objective,
    required: game.map.objectives,
    coins: game.coins,
  });
  check(
    reached,
    `Level ${level + 1} route failed at x=${game.p.x}, deaths=${game.deaths}`,
  );
  check(
    game.objective === game.map.objectives,
    `Level ${level + 1}: missing objective`,
  );
  if ([2, 3].includes(level))
    check(game.ready(), `Level ${level + 1}: bonus gate`);
}
const g = new Shift();
g.startLevel(0, false);
g.mode = "play";
const input = {
  left: false,
  right: false,
  jump: false,
  dash: false,
  interact: false,
  fine: false,
};
g.p.ground = false;
g.p.coyote = 0.09;
g.p.vy = 40;
g.step(1 / 60, { ...input, jump: true });
check(g.p.vy < 0, "Coyote jump");
g.p.ground = false;
g.p.coyote = 0;
g.prev = {};
g.p.y = 589;
g.p.vy = 100;
g.step(1 / 60, { ...input, jump: true });
g.prev = { jump: true };
g.step(1 / 60, { ...input, jump: true });
check(g.p.vy < 0, "Buffered jump");
g.startLevel(0, false);
g.mode = "play";
g.fine();
const cooldown = g.p.fineCd;
g.fine();
check(g.p.fineCd === cooldown, "Fine cooldown");
g.p.health = 1;
g.p.invuln = 0;
g.hurt();
check(g.p.health === 4 && g.p.x === g.checkpoint, "Instant respawn");
const cp = g.map.items.find((i) => i.kind === "checkpoint");
g.p.x = cp.x;
g.p.y = cp.y + 48;
g.step(1 / 60, input);
g.persist();
const resumed = new Shift();
resumed.startLevel(0, true);
check(
  resumed.checkpoint === cp.x && resumed.p.x === cp.x,
  "Checkpoint persisted",
);
for (const level of [9, 11]) {
  const b = new Shift();
  b.startLevel(level, false);
  const hp = b.bossHP;
  for (let n = 0; n < hp; n++) {
    b.bossInv = 0;
    b.hitBoss();
  }
  check(b.bossDead && b.bossHP === 0, `Boss ${level} phases`);
}
const save = data.freshSave();
const battles=[];
for(const level of [9,11]){
  const battle=new Shift();battle.startLevel(level,false);battle.mode='play';battle.objective=battle.map.objectives;
  battle.p.x=battle.map.exit-650;battle.p.y=530;let frames=0;
  while(!battle.bossDead&&frames<7200){
    const direction=Math.sign(battle.bossX()-battle.p.x);
    const keys={right:direction>0,left:direction<0,jump:!battle.p.ground||!battle.prev.jump,fine:frames%2===0,interact:false,dash:false};
    battle.t+=1/60;battle.step(1/60,keys);battle.prev=keys;frames++;
  }
  check(battle.bossDead,`Boss ${level+1} can be defeated through movement, jumps and fine`);
  battles.push({level:level+1,seconds:+(frames/60).toFixed(1),deaths:battle.deaths});
}
save.total = 77;
data.writeSave(save);
check(data.readSave().total === 77, "Save round trip");
storage.set("only-angels-v1", "broken");
check(data.readSave().level === 0, "Corrupt save fallback");
const campaign = new Shift();
campaign.save = data.freshSave();
for (let level = 0; level < 12; level++) {
  campaign.startLevel(level, false);
  campaign.objective = campaign.map.objectives;
  campaign.coins = 30;
  campaign.bossDead = true;
  campaign.finish();
  while (campaign.mode === "dialogue") campaign.nextDialogue();
  check(
    campaign.save.completed.includes(level),
    `Level ${level + 1} completion saves`,
  );
}
check(campaign.save.team.length === 4, "Whole team recruited");
check(campaign.save.unlocked === 11, "All levels unlocked");
check(
  campaign.mode === "ending" && campaign.save.total >= data.TOTAL.target,
  "Finale without grinding",
);
console.log(
  JSON.stringify(
    {
      checks,
      routes: result,
      battles,
      automatedTraversalSeconds: result.reduce((s, r) => s + r.seconds, 0),
      note: "Simulated deterministic traversal at 60 Hz; not a human duration playtest or browser compatibility test.",
    },
    null,
    2,
  ),
);
