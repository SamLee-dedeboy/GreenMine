import type { tBbox, tDPSIR, tVisLink, tRectangle } from "lib/types";
import * as grid_layout from "./grid_layout";
import * as d3 from "d3";
const bbox_order = {
  driver: 0,
  pressure: 1,
  state: 2,
  impact: 3,
  response: 4,
};
export const DPSIRLayout = {
  bboxes: {},
  varCoordinatesDict: {},
  init(svgId: string) {
    this.width = 1550;
    this.height = 950;
    const svg = d3
      .select("#" + svgId)
      .attr("viewBox", `0 0 ${this.width} ${this.height}`);
    this.bboxes = {};
    this.varCoordinatesDict = {};
  },
  update(
    vars: tDPSIR,
    links: tVisLink[],
    var_type_states: Record<string, { revealed: boolean; visible: boolean }>,
  ) {
    const visible_var_types = Object.keys(var_type_states).filter(
      (varType) => var_type_states[varType].visible,
    );
    this.calculateBboxCenters(vars, visible_var_types);
    this.calculateBboxSizes(vars, links, visible_var_types);
    // this.clipBboxCenters();
  },

  //   clipBboxCenters() {
  //     Object.entries(this.bboxes).forEach(([varType, bbox]) => {
  //       const [center_x, center_y] = bbox.center;
  //       const [width, height] = bbox.size;
  //       bbox.center = [
  //         Math.max(width / 2, Math.min(this.width - width / 2, center_x)),
  //         Math.max(height / 2, Math.min(this.height - height / 2, center_y)),
  //       ];
  //       this.bboxes[varType] = bbox;
  //     });
  //   },

  calculateBboxCenters(vars: tDPSIR, var_type_names: string[]) {
    this.bboxes = var_type_names.reduce((acc, varType) => {
      acc[varType] = { center: [0, 0], size: [0, 0] };
      return acc;
    }, {});
    const bboxes_length = Object.keys(this.bboxes).length;
    if (bboxes_length === 0) return;
    if (bboxes_length === 1) {
      this.bboxes[Object.keys(this.bboxes)[0]].center = [
        this.width / 2,
        this.height / 2,
      ];
      return;
    }
    if (bboxes_length === 2) {
      const pair = Object.keys(this.bboxes);
      const left =
        bbox_order[pair[0]] < bbox_order[pair[1]] ? pair[0] : pair[1];
      const right =
        bbox_order[pair[0]] > bbox_order[pair[1]] ? pair[0] : pair[1];
      const pivot_point = calculatePivotPoint([left, right], vars);
      this.bboxes[left].center = [
        (this.width * pivot_point) / 2,
        this.height / 2,
      ];
      this.bboxes[right].center = [
        this.width - (this.width - this.width * pivot_point) / 2,
        this.height / 2,
      ];
      return;
    }
    if (bboxes_length >= 3) {
      const sequence = Object.keys(this.bboxes).sort(
        (a, b) => bbox_order[a] - bbox_order[b],
      );
      const angles = calculateAngles(sequence, vars);

      Object.keys(this.bboxes)
        .sort((a, b) => bbox_order[a] - bbox_order[b])
        .forEach((varType, i) => {
          const angle = angles[i];
          const [x, y] = polarToCartesian(
            this.width / 2, // center x
            this.height / 2, // center y
            this.width * 0.4, // a
            this.height * 0.48, // b
            angle,
          );
          this.bboxes[varType].center = [x, y];
        });
      return;
    }
  },
  calculateBboxSizes(
    vars: tDPSIR,
    links: tVisLink[],
    var_type_names: string[],
  ) {
    const self = this;
    const offsets = {
      1: { x: 30, y: 50 },
      2: { x: 30, y: 50 },
      3: { x: 30, y: 50 },
      4: { x: 30, y: 30 },
      5: { x: 30, y: 30 },
    };
    const offset = offsets[var_type_names.length];
    const categorizedLinks = categorizedLinkByVarType(
      vars,
      links,
      var_type_names,
    );
    Object.values(var_type_names).forEach((varType: string) => {
      let linkCount = categorizedLinks[varType];
      const rectWidth = 100; //(g)
      const rectangles = Object.entries(linkCount)
        .map(([name, counts]) => {
          return {
            name,
            width: rectWidth,
            height: 30, // height might be adjusted later as needed
            outgroup_degree:
              linkCount[name].outGroup_link + linkCount[name].inGroup_link,
          };
        })
        .sort(
          (a, b) =>
            linkCount[b.name].outGroup_link - linkCount[a.name].outGroup_link,
        );
      const { rectangleCoordinates, bbox } = squareLayout(
        rectangles,
        self.bboxes[varType],
        offset.x,
        offset.y,
        this.width,
        this.height,
      );
      self.bboxes[varType] = bbox;
      self.varCoordinatesDict[varType] = rectangleCoordinates;
    });
  },
};

function categorizedLinkByVarType(
  vars: Record<string, { variable_mentions: Record<string, any> }>,
  links: Array<{
    source: { var_type: string; variable_name: string };
    target: { var_type: string; variable_name: string };
  }>,
  var_type_names: Array<string>,
): Record<
  string,
  Record<string, { inGroup_link: number; outGroup_link: number }>
> {
  type VarTypeNames = string;

  let categorizedLinks: Record<
    VarTypeNames,
    Record<string, { inGroup_link: number; outGroup_link: number }>
  > = {};

  // Initialize categorizedLinks with variable names
  Object.keys(vars).forEach((varType) => {
    const type = vars[varType];
    Object.keys(type.variable_mentions).forEach((varName) => {
      if (!categorizedLinks[varType]) categorizedLinks[varType] = {};
      if (!categorizedLinks[varType][varName]) {
        categorizedLinks[varType][varName] = {
          inGroup_link: 0,
          outGroup_link: 0,
        };
      }
    });
  });

  // Categorize links
  links.forEach((link) => {
    const { source, target } = link;
    const isInGroup = source.var_type === target.var_type;

    // Ensure source and target entries exist
    [source, target].forEach((node) => {
      if (!categorizedLinks[node.var_type][node.variable_name]) {
        categorizedLinks[node.var_type][node.variable_name] = {
          inGroup_link: 0,
          outGroup_link: 0,
        };
      }
    });

    // Increment link counts
    if (isInGroup) {
      categorizedLinks[source.var_type][source.variable_name].inGroup_link += 1;
      categorizedLinks[target.var_type][target.variable_name].inGroup_link += 1;
    } else {
      categorizedLinks[source.var_type][source.variable_name].outGroup_link +=
        1;
      categorizedLinks[target.var_type][target.variable_name].outGroup_link +=
        1;
    }
  });

  return categorizedLinks;
}

function calculatePivotPoint([left, right]: [string, string], vars: tDPSIR) {
  const left_degree = Object.keys(vars[left].variable_mentions).length;
  const right_degree = Object.keys(vars[right].variable_mentions).length;
  const pivot_point = left_degree / (left_degree + right_degree);
  return pivot_point;
}

function calculateAngles(sequence: string[], vars: tDPSIR) {
  const degrees = sequence.map(
    (varType) => Object.keys(vars[varType].variable_mentions).length,
  );
  const total_degree = degrees.reduce((acc, degree) => acc + degree, 0);
  const angles = degrees.map(
    (degree) => (Math.PI * 2 * degree) / total_degree, // -90 degree so that the first element is at the top
  );
  let angle_midpoints: number[] = [];
  let angle_sum = 0;
  angles.forEach((angle) => {
    angle_midpoints.push(angle_sum + angle / 2 - Math.PI);
    angle_sum += angle;
  });
  return angle_midpoints;
}

function squareLayout(
  rectangles: tRectangle[],
  bbox: { center: [number, number]; size: [number, number] },
  x_offset: number,
  y_offset: number,
  full_width: number,
  full_height: number,
) {
  // create a local rectangle array to avoid modifying the original array
  const rect_width = rectangles[0].width;

  let { first_row_rect_number, middle_row_number } =
    calculate_row_numbers(rectangles);

  const { selectedMiddleRectangles } = adjustRectangleHeights(
    rectangles,
    middle_row_number,
  );

  const topFour = rectangles.slice(0, 4);
  const otherRectangles = rectangles.filter(
    (rect) =>
      !topFour.includes(rect) && !selectedMiddleRectangles.includes(rect),
  );

  const rearrangedRectangles = [
    topFour[0],
    ...otherRectangles.slice(0, first_row_rect_number - 2),
    topFour[1],
    ...selectedMiddleRectangles,
    topFour[2],
    ...otherRectangles.slice(first_row_rect_number - 2),
    topFour[3],
  ].filter((r) => r);
  // return;

  const last_row_rect_number =
    middle_row_number < 0
      ? 0
      : rearrangedRectangles.length -
        first_row_rect_number -
        middle_row_number * 2;

  const box_height =
    rearrangedRectangles[0].height +
    (y_offset + rearrangedRectangles[0].height) * middle_row_number +
    (last_row_rect_number > 0 ? y_offset + rearrangedRectangles[0].height : 0);

  const box_width = Math.round(
    Math.max(
      first_row_rect_number * rect_width +
        (first_row_rect_number - 1) * x_offset,
      last_row_rect_number * rect_width + (last_row_rect_number - 1) * x_offset,
    ),
  );
  bbox.size = [box_width, box_height];
  const [center_x, center_y] = bbox.center;
  bbox.center = [
    Math.max(box_width / 2, Math.min(full_width - box_width / 2, center_x)) -
      10,
    Math.max(box_height / 2, Math.min(full_height - box_height / 2, center_y)),
  ];

  let first_space_between_rectangles = Math.round(
    (box_width - rect_width * first_row_rect_number) /
      (first_row_rect_number - 1),
  );
  let second_space_between_rectangles = Math.round(
    (box_width - rect_width * last_row_rect_number) /
      (last_row_rect_number - 1),
  );

  const bbox_origin: [number, number] = [
    Math.round(bbox.center[0] - box_width / 2),
    Math.round(bbox.center[1] - box_height / 2),
  ];

  let rectangleCoordinates: [
    number,
    number,
    number,
    number,
    string,
    string,
    number,
  ][] = [];
  let accumulative_y_offset = 0;

  // First row
  for (let i = 0; i < first_row_rect_number; i++) {
    const x =
      bbox_origin[0] + i * (rect_width + first_space_between_rectangles);

    const y = bbox_origin[1] + accumulative_y_offset;
    let type =
      i === 0
        ? "top-left"
        : i === first_row_rect_number - 1
          ? "top-right"
          : "top";

    rectangleCoordinates.push([
      x,
      y,
      rearrangedRectangles[i].width,
      rearrangedRectangles[i].height,
      rearrangedRectangles[i].name,
      type,
      rearrangedRectangles[i].outgroup_degree,
    ]);
  }

  accumulative_y_offset +=
    Math.max(
      ...rearrangedRectangles
        .slice(0, first_row_rect_number)
        .map((r) => r.height),
    ) + y_offset;

  // Middle rows
  for (let i = 0; i < middle_row_number; i++) {
    let leftIndex = first_row_rect_number + i * 2;
    let rightIndex = leftIndex + 1;

    rectangleCoordinates.push([
      bbox_origin[0],
      Math.round(bbox_origin[1] + accumulative_y_offset),
      rearrangedRectangles[leftIndex].width,
      rearrangedRectangles[leftIndex].height,
      rearrangedRectangles[leftIndex].name,
      "left",
      rearrangedRectangles[leftIndex].outgroup_degree,
    ]);

    if (rightIndex >= rearrangedRectangles.length) break;
    rectangleCoordinates.push([
      bbox_origin[0] + box_width - rect_width,
      Math.round(bbox_origin[1] + accumulative_y_offset),
      rearrangedRectangles[rightIndex].width,
      rearrangedRectangles[rightIndex].height,
      rearrangedRectangles[rightIndex].name,
      "right",
      rearrangedRectangles[rightIndex].outgroup_degree,
    ]);

    accumulative_y_offset +=
      Math.max(
        rearrangedRectangles[leftIndex].height,
        rearrangedRectangles[rightIndex].height,
      ) + y_offset;
  }

  // Last row
  for (let i = 0; i < last_row_rect_number; i++) {
    let x = Math.round(
      bbox_origin[0] + i * (rect_width + second_space_between_rectangles),
    );
    let y = Math.round(bbox_origin[1] + accumulative_y_offset);
    let type =
      i === 0
        ? "bottom-left"
        : i === last_row_rect_number - 1
          ? "bottom-right"
          : "bottom";

    let index = first_row_rect_number + middle_row_number * 2 + i;
    rectangleCoordinates.push([
      x,
      y,
      rearrangedRectangles[index].width,
      rearrangedRectangles[index].height,
      rearrangedRectangles[index].name,
      type,
      rearrangedRectangles[index].outgroup_degree,
    ]);
  }

  return { rectangleCoordinates, bbox };
}

function calculate_row_numbers(rectangles: tRectangle[]) {
  if (rectangles.length === 0)
    return { first_row_rect_number: 0, middle_row_number: 0 };
  if (rectangles.length === 1)
    return { first_row_rect_number: 1, middle_row_number: 0 };
  if (rectangles.length === 2)
    return { first_row_rect_number: 2, middle_row_number: 0 };
  if (rectangles.length === 3)
    return { first_row_rect_number: 2, middle_row_number: 1 };
  let first_row_rect_number = rectangles.length <= 7 ? 2 : 4;
  let middle_row_number: number;
  // Adjust first_row_rect_number until middle_row_number is 3 or less
  do {
    middle_row_number = Math.floor(
      rectangles.length % 2 === 0
        ? (rectangles.length - first_row_rect_number * 2) / 2
        : (rectangles.length - first_row_rect_number * 2 - 1) / 2,
    );

    if (middle_row_number > 3) {
      first_row_rect_number++;
    }
  } while (middle_row_number > 3);
  return { first_row_rect_number, middle_row_number };
}
function adjustRectangleHeights(
  rectangles: tRectangle[],
  middle_row_number: number,
) {
  const defaultHeight = rectangles[0].height;
  const max_height = 20;

  // Rule 1: Adjust top four elements
  for (let i = 0; i < 4 && i < rectangles.length; i++) {
    let rect = rectangles[i];
    if (rect.height + rect.width < rect.outgroup_degree) {
      rect.height = Math.min(
        max_height,
        Math.round(rect.outgroup_degree - rect.width),
      );
    }
  }

  // Rule 2: Adjust middle rows
  const middleRowCount = middle_row_number * 2;

  // Sort the remaining rectangles by the difference between height and outgroup_degree
  const sortedRemainingRectangles = rectangles.slice(4).sort((a, b) => {
    const aLessThanHeight = a.outgroup_degree < a.height;
    const bLessThanHeight = b.outgroup_degree < b.height;

    if (aLessThanHeight && !bLessThanHeight) return -1;
    if (!aLessThanHeight && bLessThanHeight) return 1;

    if (aLessThanHeight && bLessThanHeight) {
      return a.outgroup_degree - b.outgroup_degree;
    }

    return (
      Math.abs(a.height - a.outgroup_degree) -
      Math.abs(b.height - b.outgroup_degree)
    );
  });

  // Select the middleRowCount number of rectangles from the sorted list
  const selectedMiddleRectangles = sortedRemainingRectangles.slice(
    0,
    middleRowCount,
  );
  for (let rect of selectedMiddleRectangles) {
    if (rect.outgroup_degree !== 0) {
      rect.height = Math.min(
        max_height,
        Math.round(Math.max(defaultHeight, rect.outgroup_degree)),
      );
    } else {
      rect.height = defaultHeight;
    }
  }

  // Rule 3: Set remaining rectangles to default height
  const remainingRectangles = sortedRemainingRectangles.slice(middleRowCount);
  for (let rect of remainingRectangles) {
    rect.height = defaultHeight;
  }

  return { selectedMiddleRectangles };
}

function polarToCartesian(centerX, centerY, radius_a, radius_b, angle) {
  return [
    centerX + radius_a * Math.cos(angle),
    centerY + radius_b * Math.sin(angle),
  ];
}
