// ─────────────────────────────────────────────────────────────────────────────
// Jugador: input, movimiento con colisiones, salto, cámara en tercera persona,
// combate cuerpo a cuerpo y a distancia, proximidad, recogida de objetos,
// regeneración, ingresos pasivos, nivel de búsqueda y autoguardado.
// Colisiones y altura del suelo: la ciudad de Blender (lib/city.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BUSINESSES, WEAPONS, VEHICLE_CONFIGS, characterByKey } from "../lib/gameData";
import { useGame, isUiBlocking } from "../lib/gameStore";
import { runtime, input, camera as camState, resolveCircle, lineOfSight, dist2D, lerpAngle } from "../lib/world";
import { cameraRayHit, groundHeight } from "../lib/city";
import { sfx, engine, unlockAudio } from "../lib/audio";
import { Character, makeAnim } from "./Characters";
import { talkTo } from "./interactions";
import { allNpcs, damageNpc, npcConfig } from "./npcLogic";

const WALK = 7.5;
const SPRINT_MUL = 1.8;
const GRAVITY = 24;
const JUMP_V = 8;
const RADIUS = 0.5;
const BASE_FOV = 65;
const CAR_CAM_DIST = 7;

export function Player() {
  const selectedCharacter = useGame(s => s.selectedCharacter);
  const ch = useMemo(() => characterByKey(selectedCharacter), [selectedCharacter]);
  const anim = useMemo(() => makeAnim(), []);
  const group = useRef<THREE.Group>(null!);
  const { camera, gl } = useThree();
  const incomeAcc = useRef(0);
  const regenAcc = useRef(0);
  const saveAcc = useRef(0);
  const playAcc = useRef(0);
  const lastMouseMove = useRef(-10);
  const tmp = useMemo(() => ({ dir: new THREE.Vector3(), camPos: new THREE.Vector3(), target: new THREE.Vector3() }), []);
  const cam = useMemo(() => ({ pivot: new THREE.Vector3(1e6, 0, 0), look: new THREE.Vector3(), boom: 6 }), []);

  // ── Input ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = gl.domElement;
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const s = useGame.getState();
      if (["tab", " "].includes(k)) e.preventDefault();
      if (e.repeat) return;
      unlockAudio();

      // Overlays
      if (k === "escape") {
        if (s.dialog.open) { s.closeDialog(); return; }
        if (s.showInventory) { s.toggleInventory(); return; }
        if (s.showEmpire) { s.toggleEmpire(); return; }
        if (s.showHelp) { s.toggleHelp(); return; }
        if (s.phase === "playing") { s.pause(); return; }
        if (s.phase === "paused") { s.resume(); return; }
        return;
      }
      if (s.dialog.open) {
        const idx = parseInt(k, 10);
        if (!Number.isNaN(idx) && idx >= 1 && idx <= s.dialog.options.length) {
          const opt = s.dialog.options[idx - 1];
          if (!opt.disabled) opt.onSelect();
        }
        return;
      }
      if (s.phase !== "playing") return;
      if (k === "i") { s.toggleInventory(); return; }
      if (k === "tab") { s.toggleEmpire(); return; }
      if (k === "h") { s.toggleHelp(); return; }
      if (k === "m") { s.toggleMuted(); return; }
      if (s.showInventory || s.showEmpire || s.showHelp) return;

      input.keys.add(k);
      const p = runtime.player;

      if (k === "e") {
        if (p.inVehicleId) {
          // Salir del vehículo
          const v = runtime.vehicles[p.inVehicleId];
          const side = new THREE.Vector3(Math.cos(v.heading), 0, -Math.sin(v.heading)).multiplyScalar(2.4);
          p.pos.copy(v.pos).add(side);
          resolveCircle(p.pos, RADIUS);
          p.pos.y = groundHeight(p.pos.x, p.pos.z);
          p.onGround = true;
          p.inVehicleId = null;
          v.speed = 0;
          s.setInVehicle(false);
          engine.stop();
          sfx.carExit();
        } else if (s.nearby.vehicleId) {
          const v = runtime.vehicles[s.nearby.vehicleId];
          const cfg = VEHICLE_CONFIGS.find(c => c.id === v.id);
          p.inVehicleId = v.id;
          s.setInVehicle(true, cfg?.name ?? "Coche");
          engine.start();
          sfx.carEnter();
          s.notify(`🚗 ${cfg?.name}: W/S acelerar y frenar, A/D girar, Espacio freno de mano, E salir.`, "info");
        }
        return;
      }
      if (p.inVehicleId) return;
      if (k === "f" && s.nearby.npcId) { talkTo(s.nearby.npcId); return; }
      if (k === "b" && s.nearby.businessId) { s.buyBusiness(s.nearby.businessId); return; }
      if (k === "u" && s.nearby.businessId) { s.upgradeBusiness(s.nearby.businessId); return; }
      if (k === "1") s.setActiveWeapon("fists");
      if (k === "2") s.setActiveWeapon("bat");
      if (k === "3") s.setActiveWeapon("pistol");
      if (k === "q") s.cycleWeapon(1);
      if (k === "r") { const med = s.inventory.find(i => i.type === "health"); if (med) s.useItem(med.id); }
    };
    const onKeyUp = (e: KeyboardEvent) => { input.keys.delete(e.key.toLowerCase()); };
    const onMouseMove = (e: MouseEvent) => {
      if (!input.pointerLocked) return;
      input.mouseDX += e.movementX;
      input.mouseDY += e.movementY;
    };
    const onMouseDown = (e: MouseEvent) => {
      unlockAudio();
      const s = useGame.getState();
      if (isUiBlocking(s)) return;
      if (!input.pointerLocked) { canvas.requestPointerLock?.(); return; }
      if (e.button === 0) { input.attackHeld = true; input.attackPressed = true; }
    };
    const onMouseUp = (e: MouseEvent) => { if (e.button === 0) input.attackHeld = false; };
    const onLockChange = () => { input.pointerLocked = document.pointerLockElement === canvas; if (!input.pointerLocked) { input.keys.clear(); input.attackHeld = false; } };
    const onBlur = () => { input.keys.clear(); input.attackHeld = false; };
    const onWheel = (e: WheelEvent) => { camState.dist = Math.max(3, Math.min(14, camState.dist + Math.sign(e.deltaY) * 1)); };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("blur", onBlur);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: true });
    document.addEventListener("pointerlockchange", onLockChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
      document.removeEventListener("pointerlockchange", onLockChange);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      engine.stop();
    };
  }, [gl]);

  // Sale del pointer lock cuando se abre un overlay
  const blocking = useGame(s => isUiBlocking(s));
  useEffect(() => {
    if (blocking && document.pointerLockElement === gl.domElement) document.exitPointerLock();
    if (blocking) { input.keys.clear(); input.attackHeld = false; }
  }, [blocking, gl]);

  // ── Bucle principal ───────────────────────────────────────────────────────
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = useGame.getState();
    const p = runtime.player;
    runtime.clock += dt;

    // Cámara (ratón)
    if (input.pointerLocked && !isUiBlocking(s)) {
      camState.yaw -= input.mouseDX * 0.0022;
      // below -0.1 the camera digs into the pavement; above 0.95 it is a map view
      camState.pitch = Math.max(-0.1, Math.min(0.95, camState.pitch + input.mouseDY * 0.0018));
      if (Math.abs(input.mouseDX) > 0.5) lastMouseMove.current = runtime.clock;
    }
    input.mouseDX = 0; input.mouseDY = 0;
    // En coche, la cámara se coloca sola detrás del vehículo si no se mueve el ratón
    if (p.inVehicleId && runtime.clock - lastMouseMove.current > 1.2) {
      const v = runtime.vehicles[p.inVehicleId];
      if (v) camState.yaw = lerpAngle(camState.yaw, v.heading + Math.PI, Math.min(1, dt * 2.5));
    }

    const playing = s.phase === "playing" && !isUiBlocking(s);
    p.attackCd = Math.max(0, p.attackCd - dt);
    anim.attack = Math.max(0, anim.attack - dt * 2.6);
    p.hitFlash = Math.max(0, p.hitFlash - dt * 2.5);
    anim.hitFlash = p.hitFlash;
    anim.dead = s.phase === "dead" ? Math.min(1, anim.dead + dt * 2) : 0;

    if (!p.inVehicleId) {
      // Movimiento a pie
      const dir = tmp.dir.set(0, 0, 0);
      if (playing) {
        if (input.keys.has("w") || input.keys.has("arrowup")) dir.z -= 1;
        if (input.keys.has("s") || input.keys.has("arrowdown")) dir.z += 1;
        if (input.keys.has("a") || input.keys.has("arrowleft")) dir.x -= 1;
        if (input.keys.has("d") || input.keys.has("arrowright")) dir.x += 1;
      }
      const moving = dir.lengthSq() > 0;
      const sprint = playing && input.keys.has("shift");
      p.sprinting = sprint && moving;
      if (moving) {
        dir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), camState.yaw);
        const speed = WALK * (sprint ? SPRINT_MUL : 1) * (ch.key === "creativa" ? 1.15 : 1);
        const before = p.pos.clone();
        p.pos.x += dir.x * speed * dt;
        p.pos.z += dir.z * speed * dt;
        resolveCircle(p.pos, RADIUS);
        p.distanceTravelled += dist2D(before, p.pos);
        const targetFacing = Math.atan2(dir.x, dir.z);
        let d = targetFacing - p.facing;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        p.facing += d * Math.min(1, dt * 14);
      }
      anim.moving += ((moving ? 1 : 0) - anim.moving) * Math.min(1, dt * 10);
      anim.speedMul = sprint ? 1.9 : 1.15;

      // Salto y gravedad (el suelo sube 15 cm en aceras y plazas)
      const ground = groundHeight(p.pos.x, p.pos.z);
      if (playing && input.keys.has(" ") && p.onGround) { p.vel.y = JUMP_V; p.onGround = false; }
      if (!p.onGround) {
        p.vel.y -= GRAVITY * dt;
        p.pos.y += p.vel.y * dt;
        if (p.pos.y <= ground) { p.pos.y = ground; p.vel.y = 0; p.onGround = true; }
      } else {
        p.pos.y = THREE.MathUtils.lerp(p.pos.y, ground, 0.35);
      }

      // Ataque
      const weapon = WEAPONS[s.activeWeapon] ?? WEAPONS.fists;
      const wantsAttack = playing && (input.attackPressed || (input.attackHeld && !weapon.ranged));
      // La pulsación se conserva mientras dure el cooldown (buffer de entrada)
      if (!playing || p.attackCd <= 0) input.attackPressed = false;
      if (wantsAttack && p.attackCd <= 0) {
        p.attackCd = weapon.cooldown;
        anim.attack = 1;
        if (weapon.ranged) {
          if (s.consumeAmmo()) {
            sfx.shot();
            camState.shake = 0.25;
            // Dispara en la dirección de la cámara
            const fx = -Math.sin(camState.yaw), fz = -Math.cos(camState.yaw);
            p.facing = Math.atan2(fx, fz);
            let best: { npc: ReturnType<typeof allNpcs>[number]; d: number } | null = null;
            for (const n of allNpcs()) {
              if (n.state === "dead") continue;
              const dx = n.pos.x - p.pos.x, dz = n.pos.z - p.pos.z;
              const d = Math.hypot(dx, dz);
              if (d > weapon.range || d < 0.3) continue;
              const cos = (dx * fx + dz * fz) / d;
              if (cos < Math.cos(0.16 + 0.6 / d)) continue;
              if (!lineOfSight(p.pos.x, p.pos.z, n.pos.x, n.pos.z)) continue;
              if (!best || d < best.d) best = { npc: n, d };
            }
            if (best) damageNpc(best.npc, weapon.damage, "player");
          }
        } else {
          const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
          let hit = false;
          for (const n of allNpcs()) {
            if (n.state === "dead") continue;
            const dx = n.pos.x - p.pos.x, dz = n.pos.z - p.pos.z;
            const d = Math.hypot(dx, dz);
            if (d > weapon.range + 0.4) continue;
            const cos = (dx * fx + dz * fz) / (d || 1);
            if (d > 1 && cos < 0.35) continue;
            damageNpc(n, weapon.damage, "player", p.pos);
            hit = true;
          }
          if (hit) { sfx.punch(); camState.shake = Math.max(camState.shake, 0.12); } else sfx.swing();
        }
      }

      // Proximidad
      let npcId: string | null = null, bestNpc = 3.6;
      for (const n of Object.values(runtime.npcs)) {
        if (n.state === "dead") continue;
        const cfg = npcConfig(n.id);
        if (!cfg || cfg.type === "hostile" || cfg.type === "boss") continue;
        const d = dist2D(n.pos, p.pos);
        if (d < bestNpc) { bestNpc = d; npcId = n.id; }
      }
      let vehicleId: string | null = null, bestV = 4.2;
      for (const v of Object.values(runtime.vehicles)) {
        const d = dist2D(v.pos, p.pos);
        if (d < bestV) { bestV = d; vehicleId = v.id; }
      }
      let businessId: string | null = null, bestB = 4.5;
      for (const b of BUSINESSES) {
        const d = Math.hypot(b.pos[0] - p.pos.x, b.pos[2] - p.pos.z);
        if (d < bestB) { bestB = d; businessId = b.id; }
      }
      s.setNearby({ npcId, vehicleId, businessId });

      // Recogida de objetos
      if (playing) {
        for (const pk of Object.values(runtime.pickups)) {
          if (!pk.active) continue;
          if (dist2D(pk.pos, p.pos) < 1.7) {
            pk.active = false;
            if (pk.kind === "money") { s.addMoney(pk.value); s.notify(`💰 +$${pk.value.toLocaleString("es-ES")}`, "money"); }
            else if (pk.kind === "medkit") { s.addItem({ id: "medkit", name: "Kit Médico CEO", type: "health", quantity: 1, icon: "💊", description: "Recupera 50 puntos de salud." }); sfx.pickup(); s.notify("💊 Kit médico recogido (R para usar).", "success"); }
            else if (pk.kind === "ammo") { useGame.setState(st => ({ ammo: st.ammo + pk.value })); sfx.pickup(); s.notify(`📦 +${pk.value} balas.`, "success"); }
            else if (pk.kind === "data") { s.addMissionCollected(); sfx.pickup(); s.notify(`💾 Chip de datos recuperado (${s.missionCollected + 1}).`, "success"); }
            if (pk.respawnTimer === -1) delete runtime.pickups[pk.id];
            else pk.respawnTimer = 120;
          }
        }
      }
    } else {
      // En vehículo: el jugador sigue al coche (VehicleSystem mueve el coche)
      const v = runtime.vehicles[p.inVehicleId];
      if (v) { p.pos.copy(v.pos); p.facing = v.heading; }
      anim.moving = 0;
      s.setNearby({ npcId: null, vehicleId: null, businessId: null });
    }

    // Regeneración, ingresos, búsqueda, tiempo, autoguardado
    if (s.phase === "playing") {
      regenAcc.current += dt;
      if (regenAcc.current >= 0.5) {
        regenAcc.current = 0;
        if (runtime.clock - p.lastDamageAt > 7 && s.health < s.maxHealth) s.heal(1.2);
      }
      incomeAcc.current += dt;
      if (incomeAcc.current >= 1) {
        incomeAcc.current -= 1;
        const inc = s.incomePerSec();
        if (inc > 0) s.addMoney(Math.round(inc), true);
      }
      if (s.wantedLevel > 0) {
        const policeNear = runtime.police.some(c => c.state !== "dead" && dist2D(c.pos, p.pos) < 28);
        if (!policeNear) {
          runtime.wantedTimer += dt;
          if (runtime.wantedTimer > 22) { runtime.wantedTimer = 0; s.setWantedLevel(s.wantedLevel - 1); if (s.wantedLevel - 1 <= 0) s.notify("La policía ha dejado de buscarte.", "info"); }
        } else runtime.wantedTimer = 0;
      }
      playAcc.current += dt;
      if (playAcc.current >= 1) { s.tickPlayTime(playAcc.current); playAcc.current = 0; }
      saveAcc.current += dt;
      if (saveAcc.current > 45) { saveAcc.current = 0; s.saveGame(); }
    }

    // ── Cámara en tercera persona ───────────────────────────────────────────
    // The followed point (pivot) is smoothed, not the camera: smoothing the
    // camera itself made it trail ~5 m behind a car at speed.
    const inCar = !!p.inVehicleId;
    const car = inCar ? runtime.vehicles[p.inVehicleId!] : null;
    const carCfg = inCar ? VEHICLE_CONFIGS.find(c => c.id === p.inVehicleId) : null;
    const speedK = car && carCfg ? Math.min(1, Math.abs(car.speed) / carCfg.speed) : 0;
    const pivot = tmp.target.set(p.pos.x, p.pos.y + (inCar ? 1.3 : 1.55), p.pos.z);
    if (cam.pivot.distanceToSquared(pivot) > 400) cam.pivot.copy(pivot); // teleport / respawn: no swoop
    cam.pivot.lerp(pivot, 1 - Math.exp(-dt * (inCar ? 14 : 22)));

    const pitch = inCar ? Math.max(camState.pitch, 0.16) : camState.pitch;
    const boomLen = inCar ? CAR_CAM_DIST + speedK * 3 : camState.dist;
    const dir = tmp.camPos.set(Math.sin(camState.yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(camState.yaw) * Math.cos(pitch));
    // Something solid between the player and the camera: pull in at once, ease back out
    const t = cameraRayHit(cam.pivot.x, cam.pivot.y, cam.pivot.z,
      cam.pivot.x + dir.x * boomLen, cam.pivot.y + dir.y * boomLen, cam.pivot.z + dir.z * boomLen);
    const allowed = t < 1 ? Math.max(0.9, t * boomLen - 0.35) : boomLen;
    cam.boom = allowed < cam.boom ? allowed : cam.boom + (allowed - cam.boom) * Math.min(1, dt * 3);

    camera.position.copy(cam.pivot).addScaledVector(dir, cam.boom);
    // Wall right behind the player: crane up and look over the shoulder
    // instead of staring at the back of their head
    if (!inCar && cam.boom < 3.2) camera.position.y += (3.2 - cam.boom) * 1.2;
    const floor = groundHeight(camera.position.x, camera.position.z) + 0.4;
    if (camera.position.y < floor) camera.position.y = floor;
    if (camState.shake > 0) {
      camState.shake = Math.max(0, camState.shake - dt * 1.5);
      camera.position.x += (Math.random() - 0.5) * camState.shake * 0.6;
      camera.position.y += (Math.random() - 0.5) * camState.shake * 0.6;
    }
    // Look a little above the player (on foot) or ahead of the car, so the
    // character sits below the centre and the street ahead stays in view.
    const look = cam.look.copy(cam.pivot);
    look.y += inCar ? 0.5 : 0.45;
    if (car) look.addScaledVector(tmp.dir.set(Math.sin(car.heading), 0, Math.cos(car.heading)), Math.min(Math.abs(car.speed) * 0.25, 6) * Math.sign(car.speed || 1));
    camera.lookAt(look);
    // Wider field of view at speed
    const pc = camera as THREE.PerspectiveCamera;
    const fov = BASE_FOV + speedK * 12;
    if (Math.abs(pc.fov - fov) > 0.05) { pc.fov += (fov - pc.fov) * Math.min(1, dt * 3); pc.updateProjectionMatrix(); }

    // Malla del jugador
    if (group.current) {
      group.current.position.copy(p.pos);
      group.current.rotation.y = p.facing;
      group.current.visible = !inCar;
    }
  });

  return (
    <group ref={group}>
      <Character variant={ch.variant} glb={ch.glb} anim={anim} />
    </group>
  );
}
