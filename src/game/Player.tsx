import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../lib/gameStore";
import { BUSINESSES, NPC_CONFIGS } from "../lib/gameData";
import { nextMission } from "../lib/missions";
import { groundHeight, resolveCollision } from "../lib/city";
import { CharacterModel, animateRig, type Rig } from "./Character";
import { runtime, damageNpc } from "./runtime";
import { exitPosition } from "./VehicleSystem";

const MOVE_SPEED   = 5;
const SPRINT_SPEED = 10;
const CAM_HEIGHT   = 3.2;
const CAM_DIST     = 6.5;
const ATTACK_RANGE = 2.6;
const ATTACK_COOLDOWN = 0.6;
const PLAYER_RADIUS = 0.45;

export function Player() {
  const selectedCharacter = useGame(s => s.selectedCharacter);
  const inVehicle = useGame(s => s.inVehicle);

  const groupRef = useRef<THREE.Group>(null!);
  const rig = useRef<Rig | null>(null);
  const walkPhase = useRef(0);
  const punch = useRef(0);
  const attackCooldown = useRef(0);
  const syncTimer = useRef(0);
  const { camera, gl } = useThree();

  // Start from the store's spawn point
  useEffect(() => {
    const [x, , z] = useGame.getState().playerPos;
    runtime.player.set(x, groundHeight(x, z), z);
    runtime.camYaw = Math.PI; // look toward the city centre
    runtime.playerFacing = Math.PI;
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      runtime.keys[k] = true;
      if (k === " ") e.preventDefault();
      const st = useGame.getState();
      if (e.repeat) return;

      if (st.dialogOpen) {
        if (k === "escape") st.closeDialog();
        return;
      }
      if (st.showInventory) {
        if (k === "escape" || k === "i") st.toggleInventory();
        return;
      }

      if (k === "f" && st.nearbyNpcId && !st.inVehicle) {
        const npc = NPC_CONFIGS.find(n => n.id === st.nearbyNpcId);
        if (npc) st.openDialog(npc.id, npc.name, npc.defaultDialogue);
      }
      if (k === "e") {
        if (st.inVehicle && st.activeVehicleId) {
          const p = exitPosition(st.activeVehicleId);
          runtime.player.copy(p);
          st.exitVehicle();
          st.setPlayerPos([p.x, p.y, p.z]);
        } else if (st.nearbyVehicleId) {
          st.enterVehicle(st.nearbyVehicleId);
        } else if (st.nearbyMissionId) {
          st.startMission(st.nearbyMissionId);
        }
      }
      if (k === "b" && st.nearbyBusinessId) {
        const biz = BUSINESSES.find(b => b.id === st.nearbyBusinessId);
        if (biz && st.money >= biz.price) st.buyBusiness(st.nearbyBusinessId);
      }
      if (k === "i") st.toggleInventory();
    };

    const onKeyUp = (e: KeyboardEvent) => { runtime.keys[e.key.toLowerCase()] = false; };
    const onBlur = () => { for (const k in runtime.keys) runtime.keys[k] = false; };

    const onMouseMove = (e: MouseEvent) => {
      if (runtime.pointerLocked) runtime.camYaw -= e.movementX * 0.0025;
    };
    const onMouseDown = (e: MouseEvent) => {
      if (!runtime.pointerLocked) { gl.domElement.requestPointerLock?.(); return; }
      if (e.button === 0) runtime.keys["attack"] = true;
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) runtime.keys["attack"] = false;
    };
    const onLockChange = () => {
      runtime.pointerLocked = document.pointerLockElement === gl.domElement;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("mousemove", onMouseMove);
    gl.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("pointerlockchange", onLockChange);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("mousemove", onMouseMove);
      gl.domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("pointerlockchange", onLockChange);
    };
  }, [gl.domElement]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const st = useGame.getState();
    if (st.inVehicle || st.phase !== "playing") return;
    const paused = st.dialogOpen || st.showInventory;
    const keys = runtime.keys;
    const p = runtime.player;

    attackCooldown.current = Math.max(0, attackCooldown.current - delta);
    punch.current = Math.max(0, punch.current - delta * 4);

    // --- movement (camera-relative) ---------------------------------------
    const dir = new THREE.Vector3();
    if (!paused) {
      if (keys["w"] || keys["arrowup"])    dir.z += 1;
      if (keys["s"] || keys["arrowdown"])  dir.z -= 1;
      if (keys["a"] || keys["arrowleft"])  dir.x += 1;
      if (keys["d"] || keys["arrowright"]) dir.x -= 1;
    }
    const moving = dir.lengthSq() > 0;
    let speed = 0;
    if (moving) {
      speed = keys["shift"] ? SPRINT_SPEED : MOVE_SPEED;
      dir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), runtime.camYaw);
      const q = { x: p.x + dir.x * speed * delta, z: p.z + dir.z * speed * delta };
      resolveCollision(q, PLAYER_RADIUS);
      p.x = q.x;
      p.z = q.z;
      const target = Math.atan2(dir.x, dir.z);
      let diff = target - runtime.playerFacing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      runtime.playerFacing += diff * Math.min(1, delta * 12);
    }
    p.y = THREE.MathUtils.lerp(p.y, groundHeight(p.x, p.z), 0.35);
    runtime.playerSpeed = speed;

    // --- animation ------------------------------------------------------------
    walkPhase.current += delta * speed * 1.9;
    const amt = moving ? Math.min(1, speed / MOVE_SPEED) : 0;
    animateRig(rig.current, walkPhase.current, amt, Math.sin(punch.current * Math.PI));

    const g = groupRef.current;
    if (g) {
      g.position.copy(p);
      g.position.y += moving ? Math.abs(Math.sin(walkPhase.current)) * 0.04 : 0;
      g.rotation.y = runtime.playerFacing;
    }

    // --- camera (third person, orbit with mouse) --------------------------------
    const camTarget = new THREE.Vector3(
      p.x - Math.sin(runtime.camYaw) * CAM_DIST,
      p.y + CAM_HEIGHT,
      p.z - Math.cos(runtime.camYaw) * CAM_DIST,
    );
    camera.position.lerp(camTarget, 1 - Math.pow(0.0005, delta));
    camera.lookAt(p.x, p.y + 1.6, p.z);

    // --- proximity ---------------------------------------------------------------
    let closestNpc: string | null = null; let minNpcD = 3.5;
    for (const n of NPC_CONFIGS) {
      const s = runtime.npcs[n.id];
      if (!s || s.dead) continue;
      const d = Math.hypot(s.pos.x - p.x, s.pos.z - p.z);
      if (d < minNpcD) { minNpcD = d; closestNpc = n.id; }
    }
    if (closestNpc !== st.nearbyNpcId) st.setNearbyNpcId(closestNpc);

    let closestBiz: string | null = null; let minBizD = 6;
    for (const b of BUSINESSES) {
      const d = Math.hypot(b.pos[0] - p.x, b.pos[2] - p.z);
      if (d < minBizD) { minBizD = d; closestBiz = b.id; }
    }
    if (closestBiz !== st.nearbyBusinessId) st.setNearbyBusinessId(closestBiz);

    // Only the next story mission can be started (and none while one is running)
    const next = st.activeMissionId ? null : nextMission(st.completedMissions);
    const closestMission = next && Math.hypot(next.markerPos[0] - p.x, next.markerPos[2] - p.z) < 5 ? next.id : null;
    if (closestMission !== st.nearbyMissionId) st.setNearbyMissionId(closestMission);

    // --- melee ------------------------------------------------------------------
    if (!paused && keys["attack"] && attackCooldown.current <= 0) {
      attackCooldown.current = ATTACK_COOLDOWN;
      punch.current = 1;
      const fwdX = Math.sin(runtime.playerFacing), fwdZ = Math.cos(runtime.playerFacing);
      for (const n of NPC_CONFIGS) {
        const s = runtime.npcs[n.id];
        if (!s || s.dead) continue;
        const dx = s.pos.x - p.x, dz = s.pos.z - p.z;
        const d = Math.hypot(dx, dz);
        if (d > ATTACK_RANGE || (dx * fwdX + dz * fwdZ) / (d || 1) < 0.3) continue;
        const hostile = n.type === "hostile" || n.type === "boss";
        if (damageNpc(n.id, 34)) {
          st.addKill();
          if (!hostile) st.setWantedLevel(st.wantedLevel + 1);
        }
        if (!hostile) st.addKarma(-2);
      }
    }

    // --- sync to store at 10 Hz ---------------------------------------------------
    syncTimer.current -= delta;
    if (syncTimer.current <= 0) {
      syncTimer.current = 0.1;
      st.setPlayerPos([p.x, p.y, p.z]);
      st.setPlayerFacing(runtime.playerFacing);
    }
  });

  return (
    <group ref={groupRef} visible={!inVehicle}>
      <CharacterModel key={selectedCharacter} modelKey={selectedCharacter} onRig={r => { rig.current = r; }} />
    </group>
  );
}
