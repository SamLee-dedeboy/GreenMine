import type { tVisLink } from "lib/types";
/**
 * Calculates the angle between two vectors defined by three 2D points: start, center, and end.
 * The angle calculated is ∠start-center-end, which is the same as ∠end-center-start.
 *
 * @param {[number, number]} startPoint - The [x, y] coordinates of the start point.
 * @param {[number, number]} centerPoint - The [x, y] coordinates of the center point.
 * @param {[number, number]} endPoint - The [x, y] coordinates of the end point.
 * @returns {number} The angle in radians between the vectors (start-center) and (end-center).
 *
 * @example
 * // Example usage:
 * const start = [1, 0];
 * const center = [0, 0];
 * const end = [0, 1];
 * const angle = calculateAngle(start, center, end); // in radian
 */
export function calculateAngle(
  startPoint: [number, number],
  centerPoint: [number, number],
  endPoint: [number, number],
): number {
  const [x1, y1] = startPoint;
  const [x2, y2] = centerPoint;
  const [x3, y3] = endPoint;

  // Calculate vectors
  const vectorA = [x1 - x2, y1 - y2];
  const vectorB = [x3 - x2, y3 - y2];

  // Calculate dot product
  const dotProduct = vectorA[0] * vectorB[0] + vectorA[1] * vectorB[1];

  // Calculate magnitudes
  const magnitudeA = Math.sqrt(vectorA[0] ** 2 + vectorA[1] ** 2);
  const magnitudeB = Math.sqrt(vectorB[0] ** 2 + vectorB[1] ** 2);

  // Calculate the cosine of the angle
  const cosTheta = dotProduct / (magnitudeA * magnitudeB);

  // Calculate the angle in radians
  const angleRadians = Math.acos(cosTheta);

  // Convert the angle to degrees (optional)
  // const angleDegrees = angleRadians * (180 / Math.PI);

  return angleRadians; // Return the angle in degrees
}

// Function to calculate the arc's center
export function calculateArcCenter(
  start: { x: number; y: number },
  end: { x: number; y: number },
  r: number,
  sweepFlag: number,
) {
  const midPoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const d = Math.sqrt(dx * dx + dy * dy);

  const h = Math.sqrt(r * r - (d / 2) * (d / 2));

  // Calculate the unit vector perpendicular to the line between start and end
  const ux = -dy / d;
  const uy = dx / d;

  const cx = midPoint.x + (sweepFlag === 1 ? 1 : -1) * h * ux;
  const cy = midPoint.y + (sweepFlag === 1 ? 1 : -1) * h * uy;

  return { x: cx, y: cy };
}

export function calculateIntersection(
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
  dr: number,
  sweepFlag: number,
  bbox: { center: [number, number]; size: [number, number] },
) {
  const [centerX, centerY] = bbox.center;
  const [width, height] = bbox.size;
  const left = centerX - width / 2;
  const right = centerX + width / 2;
  const top = centerY - height / 2;
  const bottom = centerY + height / 2;

  // Function to check intersection of a line with an ellipse
  function intersectEllipseLine(cx, cy, rx, ry, x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;

    // Transform line coordinates into the ellipse's coordinate system
    const a = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
    const b =
      (2 * (x0 - cx) * dx) / (rx * rx) + (2 * (y0 - cy) * dy) / (ry * ry);
    const c =
      ((x0 - cx) * (x0 - cx)) / (rx * rx) +
      ((y0 - cy) * (y0 - cy)) / (ry * ry) -
      1;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return []; // No intersection

    const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);

    const intersectionPoints: { x: number; y: number }[] = [];
    if (0 <= t1 && t1 <= 1)
      intersectionPoints.push({ x: x0 + t1 * dx, y: y0 + t1 * dy });
    if (0 <= t2 && t2 <= 1)
      intersectionPoints.push({ x: x0 + t2 * dx, y: y0 + t2 * dy });

    return intersectionPoints;
  }

  // Function to calculate tangent direction at a point on the ellipse
  function calculateTangentAtPoint(arcCenter, rx, ry, point) {
    // Convert the point to an angle parameter 't' relative to the arc center
    const t = Math.atan2(
      (point.y - arcCenter.y) / ry,
      (point.x - arcCenter.x) / rx,
    );

    // Calculate the derivatives (tangent vector) at this point
    const dx = -rx * Math.sin(t);
    const dy = ry * Math.cos(t);

    // Calculate the tangent angle
    const tangentAngle = Math.atan2(dy, dx);

    return { dx, dy, tangentAngle };
  }

  // Calculate arc center
  const arcCenter = calculateArcCenter(startPoint, endPoint, dr, sweepFlag);

  // Compute angles for start and end points

  const maxAngle = calculateAngle(
    [startPoint.x, startPoint.y],
    [arcCenter.x, arcCenter.y],
    [endPoint.x, endPoint.y],
  );

  // Collect intersections with all four sides of the rectangle
  const intersections_whole_arc = [
    ...intersectEllipseLine(
      arcCenter.x,
      arcCenter.y,
      dr,
      dr,
      left,
      top,
      right,
      top,
    ), // Top edge
    ...intersectEllipseLine(
      arcCenter.x,
      arcCenter.y,
      dr,
      dr,
      right,
      top,
      right,
      bottom,
    ), // Right edge
    ...intersectEllipseLine(
      arcCenter.x,
      arcCenter.y,
      dr,
      dr,
      left,
      bottom,
      right,
      bottom,
    ), // Bottom edge
    ...intersectEllipseLine(
      arcCenter.x,
      arcCenter.y,
      dr,
      dr,
      left,
      top,
      left,
      bottom,
    ), // Left edge
  ];

  // Filter valid intersections based on angle
  const intersections_curve = intersections_whole_arc.filter((intersection) => {
    const intersectionAngle = calculateAngle(
      [intersection.x, intersection.y],
      [arcCenter.x, arcCenter.y],
      [startPoint.x, startPoint.y],
    );
    return intersectionAngle < maxAngle;
  });
  const intersectionsWithTangents = intersections_curve.map((intersection) => {
    const tangent = calculateTangentAtPoint(arcCenter, dr, dr, intersection);
    return {
      x: intersection.x,
      y: intersection.y,
      tangentDirection: tangent.tangentAngle, // Direction of the tangent in radians
      tangentVector: { dx: tangent.dx, dy: tangent.dy }, // Tangent vector at the intersection
    };
  });
  return intersectionsWithTangents;
  // return intersections_whole_arc;
}

export function overviewPathGenerator(
  link: {
    source: string;
    target: string;
    source_center: [number, number];
    target_center: [number, number];
    count: number;
  },
  bboxes: Record<string, { center: [number, number]; size: [number, number] }>,
  svgWidth: number,
  svgHeight: number,
) {
  const startPoint = {
    x: link.source_center[0],
    y: link.source_center[1],
  };
  const endPoint = {
    x: link.target_center[0],
    y: link.target_center[1],
  };

  const sourceBbox = bboxes[link.source];
  const targetBbox = bboxes[link.target];

  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const dr = Math.sqrt(dx * dx + dy * dy) * 0.8; // Increase radius by 20% for more pronounced curves

  const sweepFlag =
    calculateAngle(
      [startPoint.x, startPoint.y],
      [svgWidth / 2, svgHeight / 2],
      [endPoint.x, endPoint.y],
    ) > Math.PI
      ? 1
      : 0;
  const intersection_points = calculateIntersection(
    startPoint,
    endPoint,
    dr,
    sweepFlag,
    sweepFlag ? sourceBbox : targetBbox,
  );

  // Create the partial arc path
  return {
    arc_data: { startPoint, endPoint, dr, sweepFlag },
    arrows: intersection_points.map((point) => {
      return {
        source: link.source,
        target: link.target,
        startX: point.x + 20 * Math.cos(point.tangentDirection),
        startY: point.y + 20 * Math.sin(point.tangentDirection),
        endX: point.x,
        endY: point.y,
        count: link.count,
      };
    }),
  };
}

export function detailPathGenerator(
  link: tVisLink,
  bboxes: Record<string, { center: [number, number]; size: [number, number] }>,
  svgWidth: number,
  svgHeight: number,
) {
  const sourceBbox = bboxes[link.source.var_type];
  const targetBbox = bboxes[link.target.var_type];
  const startPoint = { x: link.source.x, y: link.source.y };
  const endPoint = { x: link.target.x, y: link.target.y };

  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const dr = Math.sqrt(dx * dx + dy * dy) * 0.8; // Increase radius by 20% for more pronounced curves

  const sweepFlag =
    calculateAngle(
      sourceBbox.center,
      [svgWidth / 2, svgHeight / 2],
      targetBbox.center,
    ) > Math.PI
      ? 1
      : 0;
  //   const intersection_points = calculateIntersection(
  //     startPoint,
  //     endPoint,
  //     dr,
  //     sweepFlag,
  //     sweepFlag ? sourceBbox : targetBbox,
  //   );

  // Create the partial arc path
  return {
    arc_data: { startPoint, endPoint, dr, sweepFlag },
    // arrows: intersection_points.map((point) => {
    //   return {
    //     source: link.source,
    //     target: link.target,
    //     startX: point.x + 20 * Math.cos(point.tangentDirection),
    //     startY: point.y + 20 * Math.sin(point.tangentDirection),
    //     endX: point.x,
    //     endY: point.y,
    //     count: link.count,
    //   };
    // }),
  };
}

export function arcGenerator({ startPoint, endPoint, dr, sweepFlag }) {
  return `M${startPoint.x},${startPoint.y}A${dr},${dr} 0 0 ${sweepFlag} ${endPoint.x},${endPoint.y}`;
}

export function interpolate_linear(
  start: { x: number; y: number },
  end: { x: number; y: number },
  t: number,
) {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
}
export function interpolateArc({ startPoint, endPoint, dr, sweepFlag, t }) {
  // interpolate along the arc between (startPoint) and (endPoint), with radius (dr) and sweepFlag indicating its direction (start to end or end to start)
  const arcCenter = calculateArcCenter(startPoint, endPoint, dr, sweepFlag);
  const startAngle = Math.atan2(
    startPoint.y - arcCenter.y,
    startPoint.x - arcCenter.x,
  );
  const endAngle = Math.atan2(
    endPoint.y - arcCenter.y,
    endPoint.x - arcCenter.x,
  );

  // Calculate the total angle covered by the arc, considering sweepFlag
  let totalAngle = endAngle - startAngle;
  if (sweepFlag === 1 && totalAngle < 0) {
    totalAngle += 2 * Math.PI; // Adjust for counterclockwise
  } else if (sweepFlag === 0 && totalAngle > 0) {
    totalAngle -= 2 * Math.PI; // Adjust for clockwise
  }

  // Calculate the interpolated angle at parameter t
  const interpolatedAngle = startAngle + t * totalAngle;

  // Calculate the interpolated (x, y) point on the arc
  const x = arcCenter.x + dr * Math.cos(interpolatedAngle);
  const y = arcCenter.y + dr * Math.sin(interpolatedAngle);

  // Return the interpolated point on the arc
  return { x, y };
}
