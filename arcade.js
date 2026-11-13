const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const modalTag = document.getElementById("modal-tag");
const modalTitle = document.getElementById("modal-title");
const modalDesc = document.getElementById("modal-desc");
const modalControls = document.getElementById("modal-controls");
const finalScoreBox = document.getElementById("final-score-box");
const finalScoreVal = document.getElementById("final-score-val");
const playBtn = document.getElementById("play-btn");
const reticle = document.getElementById("reticle");
const toastEl = document.getElementById("toast");

const labelStat1 = document.getElementById("label-stat1");
const valStat1 = document.getElementById("val-stat1");
const labelStat2 = document.getElementById("label-stat2");
const valStat2 = document.getElementById("val-stat2");
const labelStat3 = document.getElementById("label-stat3");
const valStat3 = document.getElementById("val-stat3");

let W = 800;
let H = 600;
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  W = canvas.width = Math.max(300, Math.floor(rect.width));
  H = canvas.height = Math.max(300, Math.floor(rect.height));
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const keys = {};
const pointer = { x: W / 2, y: H / 2, down: false };

window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "Space" && state.running && state.activeGame === "stack") {
    e.preventDefault();
    games.stack.drop();
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

canvas.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = e.clientX - rect.left;
  pointer.y = e.clientY - rect.top;
  if (state.activeGame === "asteroids") {
    reticle.style.left = pointer.x + "px";
    reticle.style.top = pointer.y + "px";
  }
});

canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = e.clientX - rect.left;
  pointer.y = e.clientY - rect.top;
  pointer.down = true;
  if (!state.running) return;
  if (state.activeGame === "stack") games.stack.drop();
  if (state.activeGame === "asteroids") games.asteroids.fire();
});

window.addEventListener("pointerup", () => {
  pointer.down = false;
});

let toastTimer = null;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 1100);
}

const state = {
  activeGame: "tunnel",
  running: false,
  lastTime: 0
};

function getBest(key) {
  return Number(localStorage.getItem("arcade3d_best_" + key) || 0);
}
function setBest(key, val) {
  const best = Math.max(getBest(key), Math.floor(val));
  localStorage.setItem("arcade3d_best_" + key, best);
  return best;
}

function updateHUD(s1, s2, s3) {
  valStat1.textContent = s1;
  valStat2.textContent = s2;
  valStat3.textContent = s3;
}

function triggerGameOver(score) {
  state.running = false;
  reticle.classList.add("hidden");
  const g = games[state.activeGame];
  const best = setBest(state.activeGame, score);
  valStat3.textContent = best;
  modalTag.textContent = "MISSION COMPLETE";
  modalTitle.textContent = g.title;
  modalDesc.textContent = "Great run! Ready for another round or switch games above.";
  finalScoreVal.textContent = Math.floor(score);
  finalScoreBox.classList.remove("hidden");
  playBtn.textContent = "PLAY AGAIN";
  overlay.classList.remove("hidden");
}

// ==========================================
// GAME 1: NEON TUNNEL 3D
// ==========================================
const tunnelGame = {
  title: "Neon Tunnel 3D",
  desc: "Steer through an endless 3D wireframe tunnel, dodge neon barriers, and collect cyan energy orbs.",
  controls: "Controls: Left/Right Arrows, A/D, or Click/Tap Left & Right sides",
  labels: ["SCORE", "SPEED", "BEST"],
  playerX: 0,
  speed: 22,
  score: 0,
  objects: [],
  particles: [],
  spawnTimer: 0,
  ringOffset: 0,

  init() {
    this.playerX = 0;
    this.speed = 24;
    this.score = 0;
    this.objects = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.ringOffset = 0;
    updateHUD(0, "1.0x", getBest("tunnel"));
  },

  project(x, y, z) {
    const fov = 340;
    const scale = fov / Math.max(0.2, z);
    return {
      x: W / 2 + x * scale,
      y: H / 2 + y * scale,
      scale
    };
  },

  update(dt) {
    this.speed += dt * 0.55;
    this.score += dt * this.speed * 0.8;
    this.ringOffset = (this.ringOffset + this.speed * dt) % 8;

    let move = 0;
    if (keys["ArrowLeft"] || keys["KeyA"]) move -= 1;
    if (keys["ArrowRight"] || keys["KeyD"]) move += 1;
    if (pointer.down) move += pointer.x < W / 2 ? -1 : 1;

    this.playerX += move * 9.5 * dt;
    this.playerX = Math.max(-3.6, Math.min(3.6, this.playerX));

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(0.28, 0.78 - this.speed * 0.008);
      const laneX = (Math.random() - 0.5) * 6.8;
      const isOrb = Math.random() < 0.28;
      this.objects.push({
        x: laneX,
        y: 1.5,
        z: 55,
        w: isOrb ? 0.6 : 1.35,
        h: isOrb ? 0.6 : 1.5,
        type: isOrb ? "orb" : "block",
        rot: 0
      });
    }

    for (let i = this.objects.length - 1; i >= 0; i--) {
      const o = this.objects[i];
      o.z -= this.speed * dt;
      o.rot += dt * 3;

      if (o.z < 3.2 && o.z > 1.2) {
        if (Math.abs(o.x - this.playerX) < o.w * 0.75 + 0.45) {
          if (o.type === "orb") {
            this.score += 150;
            showToast("+150 ENERGY ORB");
            for (let p = 0; p < 12; p++) {
              this.particles.push({
                x: o.x, y: o.y, z: o.z,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                vz: (Math.random() - 0.5) * 8,
                life: 0.5
              });
            }
            this.objects.splice(i, 1);
            continue;
          } else {
            triggerGameOver(this.score);
            return;
          }
        }
      }
      if (o.z <= 0.4) this.objects.splice(i, 1);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    updateHUD(Math.floor(this.score), (this.speed / 24).toFixed(1) + "x", getBest("tunnel"));
  },

  draw() {
    ctx.fillStyle = "#060814";
    ctx.fillRect(0, 0, W, H);

    // Tunnel rings
    for (let z = 56; z >= 2; z -= 8) {
      const rz = z - this.ringOffset;
      if (rz <= 0.5) continue;
      const tl = this.project(-4.5, -2.8, rz);
      const br = this.project(4.5, 2.5, rz);
      const alpha = Math.max(0.08, 1 - rz / 60);
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.45})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    }

    // Tunnel perspective lines
    const corners = [[-4.5, -2.8], [4.5, -2.8], [4.5, 2.5], [-4.5, 2.5]];
    ctx.strokeStyle = "rgba(168, 85, 247, 0.35)";
    corners.forEach(([cx, cy]) => {
      const p1 = this.project(cx, cy, 1);
      const p2 = this.project(cx, cy, 58);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    // Sort far to near
    this.objects.sort((a, b) => b.z - a.z);
    for (const o of this.objects) {
      const p = this.project(o.x, o.y, o.z);
      const sw = o.w * p.scale;
      const sh = o.h * p.scale;
      if (o.type === "orb") {
        ctx.save();
        ctx.translate(p.x, p.y - sh * 0.4);
        ctx.rotate(o.rot);
        ctx.strokeStyle = "#22d3ee";
        ctx.fillStyle = "rgba(34, 211, 238, 0.25)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -sh);
        ctx.lineTo(sw, 0);
        ctx.lineTo(0, sh);
        ctx.lineTo(-sw, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = "rgba(244, 63, 94, 0.28)";
        ctx.strokeStyle = "#fb7185";
        ctx.lineWidth = 2;
        ctx.fillRect(p.x - sw / 2, p.y - sh, sw, sh);
        ctx.strokeRect(p.x - sw / 2, p.y - sh, sw, sh);
      }
    }

    // Particles
    for (const pt of this.particles) {
      const p = this.project(pt.x, pt.y, pt.z);
      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    }

    // Player hovercraft
    const pl = this.project(this.playerX, 2.1, 2.2);
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.moveTo(pl.x, pl.y - 18);
    ctx.lineTo(pl.x + 24, pl.y + 8);
    ctx.lineTo(pl.x - 24, pl.y + 8);
    ctx.closePath();
    ctx.fill();
  }
};

// ==========================================
// GAME 2: VOXEL STACK 3D
// ==========================================
const stackGame = {
  title: "Voxel Stack 3D",
  desc: "Drop sliding 3D slabs with pinpoint accuracy to build the tallest isometric tower.",
  controls: "Controls: Click, Tap, or Press Spacebar to drop each slab",
  labels: ["FLOORS", "COMBO", "BEST"],
  stack: [],
  debris: [],
  current: null,
  camY: 0,
  combo: 0,
  hue: 195,

  init() {
    this.stack = [{ x: 0, z: 0, w: 3.4, d: 3.4, y: 0, hue: 195 }];
    this.debris = [];
    this.camY = 0;
    this.combo = 0;
    this.hue = 195;
    this.spawnNext();
    updateHUD(0, "0x", getBest("stack"));
  },

  spawnNext() {
    const top = this.stack[this.stack.length - 1];
    const axis = this.stack.length % 2 === 1 ? "x" : "z";
    this.hue = (this.hue + 14) % 360;
    this.current = {
      x: axis === "x" ? -4.5 : top.x,
      z: axis === "z" ? -4.5 : top.z,
      w: top.w,
      d: top.d,
      y: this.stack.length,
      axis,
      dir: 1,
      speed: Math.min(8.5, 4.2 + this.stack.length * 0.12),
      hue: this.hue
    };
  },

  drop() {
    if (!this.current) return;
    const cur = this.current;
    const top = this.stack[this.stack.length - 1];
    const axis = cur.axis;
    const delta = cur[axis] - top[axis];
    const size = axis === "x" ? cur.w : cur.d;
    const overlap = size - Math.abs(delta);

    if (overlap <= 0.05) {
      this.debris.push({ ...cur, vy: 0 });
      this.current = null;
      triggerGameOver(this.stack.length - 1);
      return;
    }

    if (Math.abs(delta) < 0.16) {
      cur[axis] = top[axis];
      this.combo++;
      if (this.combo >= 3) {
        cur.w = Math.min(3.8, cur.w + 0.25);
        cur.d = Math.min(3.8, cur.d + 0.25);
        showToast("PERFECT STREAK! SLAB EXPANDED");
      } else {
        showToast("PERFECT ALIGNMENT!");
      }
    } else {
      this.combo = 0;
      const cutSize = size - overlap;
      const debrisPos = cur[axis] + (delta > 0 ? overlap / 2 + cutSize / 2 : -(overlap / 2 + cutSize / 2));
      this.debris.push({
        x: axis === "x" ? debrisPos : cur.x,
        z: axis === "z" ? debrisPos : cur.z,
        w: axis === "x" ? cutSize : cur.w,
        d: axis === "z" ? cutSize : cur.d,
        y: cur.y,
        hue: cur.hue,
        vy: 0
      });
      if (axis === "x") {
        cur.w = overlap;
        cur.x = top.x + delta / 2;
      } else {
        cur.d = overlap;
        cur.z = top.z + delta / 2;
      }
    }

    this.stack.push({ x: cur.x, z: cur.z, w: cur.w, d: cur.d, y: cur.y, hue: cur.hue });
    updateHUD(this.stack.length - 1, this.combo + "x", getBest("stack"));
    this.spawnNext();
  },

  iso(x, y, z) {
    const scale = Math.min(W, H) * 0.075;
    const sx = W / 2 + (x - z) * scale * 0.86;
    const sy = H * 0.68 + (x + z) * scale * 0.45 - (y - this.camY) * scale * 0.52;
    return { x: sx, y: sy, s: scale };
  },

  drawBox(b) {
    const h = 0.52;
    const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2;
    const z0 = b.z - b.d / 2, z1 = b.z + b.d / 2;
    const y0 = b.y * h, y1 = (b.y + 1) * h;

    const p001 = this.iso(x0, y1, z0);
    const p101 = this.iso(x1, y1, z0);
    const p111 = this.iso(x1, y1, z1);
    const p011 = this.iso(x0, y1, z1);
    const p100 = this.iso(x1, y0, z0);
    const p110 = this.iso(x1, y0, z1);
    const p010 = this.iso(x0, y0, z1);

    // Top face
    ctx.fillStyle = `hsl(${b.hue}, 78%, 62%)`;
    ctx.beginPath();
    ctx.moveTo(p001.x, p001.y);
    ctx.lineTo(p101.x, p101.y);
    ctx.lineTo(p111.x, p111.y);
    ctx.lineTo(p011.x, p011.y);
    ctx.closePath();
    ctx.fill();

    // Right face
    ctx.fillStyle = `hsl(${b.hue}, 75%, 45%)`;
    ctx.beginPath();
    ctx.moveTo(p101.x, p101.y);
    ctx.lineTo(p111.x, p111.y);
    ctx.lineTo(p110.x, p110.y);
    ctx.lineTo(p100.x, p100.y);
    ctx.closePath();
    ctx.fill();

    // Left face
    ctx.fillStyle = `hsl(${b.hue}, 75%, 34%)`;
    ctx.beginPath();
    ctx.moveTo(p011.x, p011.y);
    ctx.lineTo(p111.x, p111.y);
    ctx.lineTo(p110.x, p110.y);
    ctx.lineTo(p010.x, p010.y);
    ctx.closePath();
    ctx.fill();
  },

  update(dt) {
    const targetCam = Math.max(0, (this.stack.length - 4) * 0.52);
    this.camY += (targetCam - this.camY) * Math.min(1, dt * 6);

    if (this.current) {
      const c = this.current;
      c[c.axis] += c.dir * c.speed * dt;
      if (c[c.axis] > 4.5) { c[c.axis] = 4.5; c.dir = -1; }
      if (c[c.axis] < -4.5) { c[c.axis] = -4.5; c.dir = 1; }
    }

    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.vy -= 18 * dt;
      d.y += d.vy * dt;
      if (d.y < this.camY - 12) this.debris.splice(i, 1);
    }
  },

  draw() {
    ctx.fillStyle = "#0b1120";
    ctx.fillRect(0, 0, W, H);
    const startIdx = Math.max(0, this.stack.length - 24);
    for (let i = startIdx; i < this.stack.length; i++) {
      this.drawBox(this.stack[i]);
    }
    if (this.current) this.drawBox(this.current);
    for (const d of this.debris) this.drawBox(d);
  }
};

// ==========================================
// GAME 3: STARFIELD ASTEROIDS 3D
// ==========================================
const asteroidsGame = {
  title: "Starfield Asteroids 3D",
  desc: "Blast incoming 3D asteroids with twin plasma lasers before they breach your hull shields.",
  controls: "Controls: Aim with Mouse/Touch & Click/Tap to Fire",
  labels: ["SCORE", "SHIELD", "BEST"],
  score: 0,
  shield: 100,
  asteroids: [],
  lasers: [],
  stars: [],
  spawnTimer: 0,

  init() {
    this.score = 0;
    this.shield = 100;
    this.asteroids = [];
    this.lasers = [];
    this.spawnTimer = 0;
    this.stars = Array.from({ length: 90 }, () => ({
      x: (Math.random() - 0.5) * 40,
      y: (Math.random() - 0.5) * 30,
      z: Math.random() * 50 + 2
    }));
    updateHUD(0, "100%", getBest("asteroids"));
  },

  project(x, y, z) {
    const scale = 320 / Math.max(0.2, z);
    return { x: W / 2 + x * scale, y: H / 2 + y * scale, scale };
  },

  fire() {
    const tx = (pointer.x - W / 2) / 320;
    const ty = (pointer.y - H / 2) / 320;
    this.lasers.push({ x: -1.4, y: 1.4, z: 1.5, vx: tx * 45, vy: ty * 45, vz: 45 });
    this.lasers.push({ x: 1.4, y: 1.4, z: 1.5, vx: tx * 45, vy: ty * 45, vz: 45 });
  },

  update(dt) {
    for (const s of this.stars) {
      s.z -= 16 * dt;
      if (s.z <= 0.5) s.z = 50;
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(0.45, 1.3 - this.score * 0.0004);
      const isGold = Math.random() < 0.18;
      this.asteroids.push({
        x: (Math.random() - 0.5) * 14,
        y: (Math.random() - 0.5) * 9,
        z: 52,
        r: isGold ? 1.1 : 1.5 + Math.random() * 0.9,
        speed: 12 + Math.min(18, this.score * 0.006),
        rot: Math.random() * Math.PI,
        gold: isGold
      });
    }

    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.z += l.vz * dt;
      if (l.z > 55) {
        this.lasers.splice(i, 1);
        continue;
      }
      for (let j = this.asteroids.length - 1; j >= 0; j--) {
        const a = this.asteroids[j];
        const dist = Math.hypot(l.x - a.x, l.y - a.y, l.z - a.z);
        if (dist < a.r + 0.8) {
          if (a.gold) {
            this.shield = Math.min(100, this.shield + 20);
            this.score += 250;
            showToast("+20% SHIELD REPAIR");
          } else {
            this.score += 100;
          }
          this.asteroids.splice(j, 1);
          this.lasers.splice(i, 1);
          break;
        }
      }
    }

    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i];
      a.z -= a.speed * dt;
      a.rot += dt * 1.8;
      if (a.z <= 1.2) {
        this.shield -= 25;
        this.asteroids.splice(i, 1);
        if (this.shield <= 0) {
          updateHUD(this.score, "0%", getBest("asteroids"));
          triggerGameOver(this.score);
          return;
        }
      }
    }

    updateHUD(this.score, this.shield + "%", getBest("asteroids"));
  },

  draw() {
    ctx.fillStyle = "#04060e";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#e2e8f0";
    for (const s of this.stars) {
      const p = this.project(s.x, s.y, s.z);
      const sz = Math.max(1, 2.5 - s.z / 22);
      ctx.fillRect(p.x, p.y, sz, sz);
    }

    this.asteroids.sort((a, b) => b.z - a.z);
    for (const a of this.asteroids) {
      const p = this.project(a.x, a.y, a.z);
      const rad = a.r * p.scale;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(a.rot);
      ctx.strokeStyle = a.gold ? "#facc15" : "#fb923c";
      ctx.fillStyle = a.gold ? "rgba(250, 204, 21, 0.22)" : "rgba(251, 146, 60, 0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k < 7; k++) {
        const ang = (k / 7) * Math.PI * 2;
        const rr = rad * (k % 2 === 0 ? 1 : 0.78);
        if (k === 0) ctx.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
        else ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    for (const l of this.lasers) {
      const p1 = this.project(l.x, l.y, l.z);
      const p2 = this.project(l.x - l.vx * 0.04, l.y - l.vy * 0.04, Math.max(0.5, l.z - 1.8));
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }
};

// ==========================================
// GAME 4: SKYLINE RACER 3D
// ==========================================
const racerGame = {
  title: "Skyline Racer 3D",
  desc: "Weave through synthwave highway traffic at high speed and collect neon energy crystals.",
  controls: "Controls: Left/Right Arrows, A/D, or Hold Left/Right Side to Steer",
  labels: ["SCORE", "MPH", "BEST"],
  playerX: 0,
  speed: 32,
  score: 0,
  roadOffset: 0,
  traffic: [],
  spawnTimer: 0,

  init() {
    this.playerX = 0;
    this.speed = 32;
    this.score = 0;
    this.roadOffset = 0;
    this.traffic = [];
    this.spawnTimer = 0;
    updateHUD(0, "120", getBest("racer"));
  },

  project(x, y, z) {
    const scale = 300 / Math.max(0.2, z);
    return { x: W / 2 + x * scale, y: H * 0.44 + y * scale, scale };
  },

  update(dt) {
    this.speed += dt * 0.75;
    this.score += dt * this.speed * 1.1;
    this.roadOffset = (this.roadOffset + this.speed * dt) % 4;

    let steer = 0;
    if (keys["ArrowLeft"] || keys["KeyA"]) steer -= 1;
    if (keys["ArrowRight"] || keys["KeyD"]) steer += 1;
    if (pointer.down) steer += pointer.x < W / 2 ? -1 : 1;

    this.playerX += steer * 7.8 * dt;
    this.playerX = Math.max(-3.2, Math.min(3.2, this.playerX));

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(0.32, 0.85 - this.speed * 0.007);
      const lanes = [-2.4, 0, 2.4];
      const lane = lanes[Math.floor(Math.random() * lanes.length)];
      const isGem = Math.random() < 0.25;
      this.traffic.push({
        x: lane,
        z: 60,
        type: isGem ? "gem" : "car",
        color: ["#f43f5e", "#eab308", "#a855f7"][Math.floor(Math.random() * 3)]
      });
    }

    for (let i = this.traffic.length - 1; i >= 0; i--) {
      const t = this.traffic[i];
      t.z -= (t.type === "car" ? this.speed * 0.68 : this.speed) * dt;
      if (t.z < 3.4 && t.z > 1.3 && Math.abs(t.x - this.playerX) < 1.15) {
        if (t.type === "gem") {
          this.score += 200;
          showToast("+200 NITRO GEM");
          this.traffic.splice(i, 1);
          continue;
        } else {
          triggerGameOver(this.score);
          return;
        }
      }
      if (t.z <= 0.5) this.traffic.splice(i, 1);
    }

    updateHUD(Math.floor(this.score), Math.floor(this.speed * 3.8), getBest("racer"));
  },

  draw() {
    // Synthwave sky
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.44);
    sky.addColorStop(0, "#090418");
    sky.addColorStop(1, "#3b0764");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H * 0.44);

    // Retro sun
    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.44, 58, Math.PI, 0);
    ctx.fill();

    // Ground
    ctx.fillStyle = "#080b1a";
    ctx.fillRect(0, H * 0.44, W, H * 0.56);

    // Highway trapezoid
    const farL = this.project(-4.2, 2.2, 60);
    const farR = this.project(4.2, 2.2, 60);
    const nearL = this.project(-4.2, 2.2, 1.2);
    const nearR = this.project(4.2, 2.2, 1.2);

    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.moveTo(farL.x, farL.y);
    ctx.lineTo(farR.x, farR.y);
    ctx.lineTo(nearR.x, nearR.y);
    ctx.lineTo(nearL.x, nearL.y);
    ctx.closePath();
    ctx.fill();

    // Neon road edges
    ctx.strokeStyle = "#ec4899";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(farL.x, farL.y); ctx.lineTo(nearL.x, nearL.y);
    ctx.moveTo(farR.x, farR.y); ctx.lineTo(nearR.x, nearR.y);
    ctx.stroke();

    // Dashed lane dividers
    ctx.strokeStyle = "rgba(56, 189, 248, 0.65)";
    ctx.lineWidth = 2;
    for (let z = 60; z > 2; z -= 4) {
      const z1 = z - this.roadOffset;
      const z2 = z1 - 1.8;
      if (z2 <= 1) continue;
      [-1.3, 1.3].forEach((lx) => {
        const p1 = this.project(lx, 2.2, z1);
        const p2 = this.project(lx, 2.2, z2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });
    }

    // Traffic & gems
    this.traffic.sort((a, b) => b.z - a.z);
    for (const t of this.traffic) {
      const p = this.project(t.x, 2.2, t.z);
      const w = 1.35 * p.scale;
      const h = 0.85 * p.scale;
      if (t.type === "gem") {
        ctx.fillStyle = "#22d3ee";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - h * 1.2);
        ctx.lineTo(p.x + w * 0.4, p.y - h * 0.6);
        ctx.lineTo(p.x, p.y);
        ctx.lineTo(p.x - w * 0.4, p.y - h * 0.6);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = t.color;
        ctx.fillRect(p.x - w / 2, p.y - h, w, h);
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(p.x - w * 0.36, p.y - h * 0.85, w * 0.72, h * 0.35);
      }
    }

    // Player sports car
    const pl = this.project(this.playerX, 2.2, 2.2);
    const pw = 1.45 * pl.scale;
    const ph = 0.8 * pl.scale;
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(pl.x - pw / 2, pl.y - ph, pw, ph);
    ctx.fillStyle = "#f43f5e";
    ctx.fillRect(pl.x - pw * 0.42, pl.y - ph * 0.35, pw * 0.22, ph * 0.18);
    ctx.fillRect(pl.x + pw * 0.2, pl.y - ph * 0.35, pw * 0.22, ph * 0.18);
  }
};

const games = {
  tunnel: tunnelGame,
  stack: stackGame,
  asteroids: asteroidsGame,
  racer: racerGame
};

function selectGame(key) {
  state.activeGame = key;
  state.running = false;
  const g = games[key];

  document.querySelectorAll(".tab-btn, .mini-card").forEach((el) => {
    el.classList.toggle("active", el.dataset.game === key);
  });

  labelStat1.textContent = g.labels[0];
  labelStat2.textContent = g.labels[1];
  labelStat3.textContent = g.labels[2];

  modalTag.textContent = "3D ARCADE COLLECTION";
  modalTitle.textContent = g.title;
  modalDesc.textContent = g.desc;
  modalControls.textContent = g.controls;
  finalScoreBox.classList.add("hidden");
  playBtn.textContent = "PLAY " + g.title.toUpperCase();
  overlay.classList.remove("hidden");
  reticle.classList.add("hidden");

  g.init();
  g.draw();
}

document.querySelectorAll(".tab-btn, .mini-card").forEach((btn) => {
  btn.addEventListener("click", () => selectGame(btn.dataset.game));
});

playBtn.addEventListener("click", () => {
  const g = games[state.activeGame];
  g.init();
  overlay.classList.add("hidden");
  state.running = true;
  state.lastTime = performance.now();
  if (state.activeGame === "asteroids") {
    reticle.classList.remove("hidden");
  } else {
    reticle.classList.add("hidden");
  }
});

function loop(now) {
  const dt = Math.min(0.05, (now - state.lastTime) / 1000);
  state.lastTime = now;
  const g = games[state.activeGame];
  if (state.running) {
    g.update(dt);
  }
  g.draw();
  requestAnimationFrame(loop);
}

selectGame("tunnel");
requestAnimationFrame(loop);
