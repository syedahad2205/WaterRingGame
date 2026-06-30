/**
 * dirtyFlags.ts — Layer dirty-flag optimization for the rendering pipeline.
 *
 * Design principle (Requirement 4.3):
 *   "THE System SHALL use a dirty-flag optimization: layers with no state
 *    changes SHALL NOT be redrawn; in a stable settled state only the water
 *    surface layer SHALL animate."
 *
 * Layer definitions (design.md rendering order):
 *   Layer 1: Water body + surface     — ALWAYS dirty during active gameplay
 *   Layer 2: Water displacement        — dirty when a button is held
 *   Layer 3: Ring wake system          — dirty when rings are moving
 *   Layer 4: Bubble system             — dirty when bubbles are active
 *   Layer 5: Ripple overlay            — dirty when ripples are active
 *   Rings:   Ring renderer             — dirty when ring positions changed
 *   Pegs:    Peg renderer              — dirty when peg states changed
 *
 * Usage
 * ─────
 * 1. Create a DirtyFlagManager (or use the useDirtyFlags hook).
 * 2. Before rendering each layer, call `isLayerDirty(layer)`.
 * 3. After rendering, the manager can reset per-frame flags automatically.
 *
 * Requirements: 4.3
 */

// ---------------------------------------------------------------------------
// Layer enumeration
// ---------------------------------------------------------------------------

/**
 * Rendering layers in draw order (design.md render pipeline, Requirement 4.2).
 * Layer numbers correspond to the design doc's 1-indexed layer list.
 */
export const enum RenderLayer {
  /** Water body + animated surface.  Always dirty when active. */
  WaterBody = 'WaterBody',
  /** Button-press displacement bulge on the surface. */
  WaterDisplacement = 'WaterDisplacement',
  /** V-shaped wakes behind moving rings. */
  RingWake = 'RingWake',
  /** Rising sub-surface bubbles. */
  Bubbles = 'Bubbles',
  /** Surface ripple rings. */
  Ripples = 'Ripples',
  /** Ring sprites (positions, rotation, skins). */
  Rings = 'Rings',
  /** Peg sprites (glow state, occupancy). */
  Pegs = 'Pegs',
}

// ---------------------------------------------------------------------------
// Snapshot types used for change detection
// ---------------------------------------------------------------------------

/** Compact ring position/velocity snapshot for dirty-flag comparison. */
export interface RingSnapshot {
  id: string;
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
}

/** Compact peg state snapshot for dirty-flag comparison. */
export interface PegSnapshot {
  id: string;
  /** Null if unoccupied; ring-id if a ring has settled on this peg. */
  settledRingId: string | null;
}

// ---------------------------------------------------------------------------
// DirtyFlagState
// ---------------------------------------------------------------------------

/**
 * Holds the dirty status of every render layer for the current frame.
 *
 * True  = layer has changed since last draw — redraw required.
 * False = layer is identical to last frame — skip redraw.
 */
export interface DirtyFlagState {
  [RenderLayer.WaterBody]: boolean;
  [RenderLayer.WaterDisplacement]: boolean;
  [RenderLayer.RingWake]: boolean;
  [RenderLayer.Bubbles]: boolean;
  [RenderLayer.Ripples]: boolean;
  [RenderLayer.Rings]: boolean;
  [RenderLayer.Pegs]: boolean;
}

// ---------------------------------------------------------------------------
// DirtyFlagManager
// ---------------------------------------------------------------------------

/**
 * DirtyFlagManager tracks whether each rendering layer needs to be redrawn.
 *
 * ### Water surface (Layer 1)
 * The water surface ALWAYS animates — its waves move even when no input is
 * happening and no rings are moving.  Therefore `WaterBody` is always dirty
 * during active gameplay (`isActive = true`).  When `isActive = false` (pause,
 * menus, victory screen) the surface freezes and the flag is false.
 *
 * ### Ring layer
 * Dirty only when ring positions/velocities differ from the last snapshot.
 * The game loop writes new ring positions via `markRingsDirty(newSnapshot)`.
 *
 * ### Peg layer
 * Dirty only when peg occupancy states differ from the last snapshot.
 * Typically changes only when a ring lands or is dislodged.
 *
 * ### Other layers
 * Managed explicitly via `markDirty` / `markClean`.
 */
export class DirtyFlagManager {
  private flags: DirtyFlagState;
  private lastRingSnapshots: RingSnapshot[] = [];
  private lastPegSnapshots: PegSnapshot[] = [];

  constructor() {
    // Initialise all flags to true so the first frame is always a full draw.
    this.flags = {
      [RenderLayer.WaterBody]: true,
      [RenderLayer.WaterDisplacement]: true,
      [RenderLayer.RingWake]: true,
      [RenderLayer.Bubbles]: true,
      [RenderLayer.Ripples]: true,
      [RenderLayer.Rings]: true,
      [RenderLayer.Pegs]: true,
    };
  }

  // -------------------------------------------------------------------------
  // Query
  // -------------------------------------------------------------------------

  /**
   * Returns true if the specified layer needs to be redrawn this frame.
   *
   * Requirements: 4.3
   */
  public isLayerDirty(layer: RenderLayer): boolean {
    return this.flags[layer];
  }

  /** Returns a shallow copy of the current flag state (useful for debugging). */
  public snapshot(): Readonly<DirtyFlagState> {
    return { ...this.flags };
  }

  // -------------------------------------------------------------------------
  // Water surface management (always dirty when active)
  // -------------------------------------------------------------------------

  /**
   * Synchronise the water body dirty flag with the active-gameplay state.
   *
   * Design rule (Requirement 4.3):
   *   - `isActive = true`  → surface ALWAYS dirty (waves animate continuously).
   *   - `isActive = false` → surface is frozen; mark it clean to skip redraws.
   *
   * Call this once per frame before checking `isLayerDirty(WaterBody)`.
   */
  public updateWaterBodyFlag(isActive: boolean): void {
    // The water surface layer is unconditionally dirty during active gameplay:
    // waves animate every frame regardless of physics state.
    this.flags[RenderLayer.WaterBody] = isActive;
  }

  // -------------------------------------------------------------------------
  // Ring layer management
  // -------------------------------------------------------------------------

  /**
   * Compare the new ring snapshots against the last known state.
   * Marks the Rings layer dirty only when a position, angle, or velocity
   * differs from the previous snapshot.
   *
   * Also updates the RingWake flag: wakes are dirty whenever any ring is
   * moving (vx or vy above the threshold).
   *
   * @param newSnapshots  Current ring positions/velocities from the game loop.
   */
  public updateRingFlags(newSnapshots: RingSnapshot[]): void {
    const ringsChanged = hasRingStateChanged(this.lastRingSnapshots, newSnapshots);
    this.flags[RenderLayer.Rings] = ringsChanged;

    // Ring wakes are needed only when at least one ring is moving.
    const anyMoving = newSnapshots.some(
      (r) => Math.abs(r.vx) > RING_VELOCITY_THRESHOLD || Math.abs(r.vy) > RING_VELOCITY_THRESHOLD,
    );
    this.flags[RenderLayer.RingWake] = anyMoving;

    if (ringsChanged) {
      this.lastRingSnapshots = newSnapshots.map(cloneRingSnapshot);
    }
  }

  // -------------------------------------------------------------------------
  // Peg layer management
  // -------------------------------------------------------------------------

  /**
   * Compare the new peg snapshots against the last known state.
   * Marks the Pegs layer dirty only when occupancy state has changed.
   *
   * @param newSnapshots  Current peg states from the game loop.
   */
  public updatePegFlags(newSnapshots: PegSnapshot[]): void {
    const pegsChanged = hasPegStateChanged(this.lastPegSnapshots, newSnapshots);
    this.flags[RenderLayer.Pegs] = pegsChanged;

    if (pegsChanged) {
      this.lastPegSnapshots = newSnapshots.map(clonePegSnapshot);
    }
  }

  // -------------------------------------------------------------------------
  // Generic mark helpers
  // -------------------------------------------------------------------------

  /** Explicitly mark a layer as dirty (needs redraw). */
  public markDirty(layer: RenderLayer): void {
    this.flags[layer] = true;
  }

  /** Explicitly mark a layer as clean (skip redraw). */
  public markClean(layer: RenderLayer): void {
    this.flags[layer] = false;
  }

  /**
   * Reset all non-water-surface flags to clean.
   *
   * Called after all layers have been rendered for the current frame.
   * The water body flag is managed by `updateWaterBodyFlag` — not reset here.
   */
  public resetPerFrameFlags(): void {
    this.flags[RenderLayer.WaterDisplacement] = false;
    this.flags[RenderLayer.RingWake] = false;
    this.flags[RenderLayer.Bubbles] = false;
    this.flags[RenderLayer.Ripples] = false;
    // Rings and Pegs are managed by their respective update methods.
    // Water body is managed by updateWaterBodyFlag.
  }
}

// ---------------------------------------------------------------------------
// Helpers — pure functions (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Position/velocity epsilon below which a ring is considered stationary.
 * Below this speed (pixels per second) no wake is generated and the ring
 * layer is not considered dirty.
 */
export const RING_VELOCITY_THRESHOLD = 0.5;

/**
 * Tolerance for ring position comparison (pixels).
 * Changes smaller than this are ignored to avoid redraws from float noise.
 */
export const RING_POSITION_TOLERANCE = 0.1;

/**
 * Compares two ring snapshot arrays for meaningful change.
 * Returns true if any ring's position, angle, or velocity changed beyond
 * the defined tolerances.
 */
export function hasRingStateChanged(
  prev: RingSnapshot[],
  next: RingSnapshot[],
): boolean {
  if (prev.length !== next.length) return true;

  for (let i = 0; i < next.length; i++) {
    const p = prev[i];
    const n = next[i];

    if (p === undefined || p.id !== n.id) return true;

    if (
      Math.abs(p.x - n.x) > RING_POSITION_TOLERANCE ||
      Math.abs(p.y - n.y) > RING_POSITION_TOLERANCE ||
      Math.abs(p.angle - n.angle) > RING_POSITION_TOLERANCE ||
      Math.abs(p.vx - n.vx) > RING_POSITION_TOLERANCE ||
      Math.abs(p.vy - n.vy) > RING_POSITION_TOLERANCE
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Compares two peg snapshot arrays for meaningful change.
 * Returns true if any peg's occupancy state changed.
 */
export function hasPegStateChanged(
  prev: PegSnapshot[],
  next: PegSnapshot[],
): boolean {
  if (prev.length !== next.length) return true;

  for (let i = 0; i < next.length; i++) {
    const p = prev[i];
    const n = next[i];

    if (p === undefined || p.id !== n.id) return true;
    if (p.settledRingId !== n.settledRingId) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Internal snapshot cloning helpers
// ---------------------------------------------------------------------------

function cloneRingSnapshot(r: RingSnapshot): RingSnapshot {
  return { id: r.id, x: r.x, y: r.y, angle: r.angle, vx: r.vx, vy: r.vy };
}

function clonePegSnapshot(p: PegSnapshot): PegSnapshot {
  return { id: p.id, settledRingId: p.settledRingId };
}
