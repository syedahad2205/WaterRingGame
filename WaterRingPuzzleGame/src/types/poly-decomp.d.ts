/**
 * Minimal type declaration for poly-decomp (no official @types package).
 * poly-decomp is used by Matter.Bodies.fromVertices for polygon decomposition.
 */
declare module 'poly-decomp' {
  /** Decomposes a concave polygon into convex sub-polygons. */
  function decomp(polygon: number[][]): number[][][];

  /** Checks if a polygon is convex. */
  function isSimple(polygon: number[][]): boolean;

  /** Makes the polygon vertices go counter-clockwise. */
  function makeCCW(polygon: number[][]): void;

  /** Removes collinear points from a polygon. */
  function removeCollinearPoints(polygon: number[][], thresholddAngle?: number): void;

  export { decomp, isSimple, makeCCW, removeCollinearPoints };
}
