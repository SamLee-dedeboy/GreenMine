import type {
  tVariable,
  tVariableType,
  tUtilityHandlers,
  tMention,
  tDPSIR,
  tRectangle,
  tRectObject,
  tLinkObject,
  tVisLink,
  tLink,
} from "../types/variables";
import * as d3 from "d3";
import PriorityQueue from "lib/types/PriorityQueue";
const linkTypeCounts = new Map<string, number>();
export const grid_renderer = {
  // global_grid: [],
  // rows: 0,
  // columns: 0,
  init(columns, rows) {
    this.global_grid = Array.from({ length: columns + 1 }, () =>
      Array(rows + 1).fill("0000"),
    );
    this.rows = rows;
    this.columns = columns;
    // console.log("init grid", this.rows, this.columns);
  },
  reset_global_grid(columns, rows) {
    this.global_grid = Array.from({ length: columns + 1 }, () =>
      Array(rows + 1).fill("0000"),
    );
  },
};

export function radialBboxes(
  groups: string[],
  columns: number,
  rows: number,
  bboxesSizes: { [key: string]: [number, number] },
  padding: { top: number; right: number; bottom: number; left: number },
  cellWidth: number,
  cellHeight: number,
) {
  // change to svg size
  const width = cellWidth * columns - padding?.left - padding?.right;
  const height = cellHeight * rows - padding?.top - padding?.bottom;
  const offset = (234 * Math.PI) / 180;
  //angles adjust the position of the components
  const angles = [
    offset - (Math.PI * 2 * 1) / 20,
    offset + (Math.PI * 2 * 1) / 5.5 + (Math.PI * 2 * 1) / 10,
    offset + (Math.PI * 2 * 2) / 5.5,
    offset + (Math.PI * 2 * 3) / 5.9 - (Math.PI * 2 * 1) / 28,
    offset + (Math.PI * 2 * 4) / 5.4,
  ];
  const scaleFactors = [
    1.1, // D
    1.3, // P
    1, // S
    1.2, // I
    0.9, // R
  ];
  let bboxes: {
    [key: string]: { center: [number, number]; size: [number, number] };
  } = {};
  groups.forEach((group, index) => {
    const angle = angles[index];
    const a = width / 2 - (bboxesSizes[group][0] * cellWidth) / 2; //change to svg size
    const b = height / 2.5 - (bboxesSizes[group][1] * cellHeight) / 2; //change to svg size
    const r =
      ((a * b) /
        Math.sqrt(
          Math.pow(b * Math.cos(angle), 2) + Math.pow(a * Math.sin(angle), 2),
        )) *
      scaleFactors[index];
    const pre_x = width / 2 + r * Math.cos(angle);
    const pre_y = height / 2 + r * Math.sin(angle);

    // Calculate the new center to align with the grid
    const { x, y } = svgToGridCoordinate(pre_x, pre_y, cellWidth, cellHeight);
    // if (group == "impact") {
    //   bboxes[group] = {
    //     center: [x - 7, y + 13],
    //     size: bboxesSizes[group],
    //   };
    // } else if (group == "driver") {
    //   bboxes[group] = {
    //     center: [x - 7, y],
    //     size: bboxesSizes[group],
    //   };
    // } else {
    bboxes[group] = {
      center: [x - 7, y],
      size: bboxesSizes[group],
    };
    // }
  });
  return bboxes;
}

export function gridToSvgCoordinate(
  gridX: number,
  gridY: number,
  cellWidth: number,
  cellHeight: number,
) {
  const svgX = gridX * cellWidth;
  const svgY = gridY * cellHeight;
  return { x: svgX, y: svgY };
}

//top left most as (0,0)
export function svgToGridCoordinate(
  svgX: number,
  svgY: number,
  cellWidth: number,
  cellHeight: number,
) {
  const gridX = Math.ceil(svgX / cellWidth) + 1;
  const gridY = Math.ceil(svgY / cellHeight) + 1;
  return { x: gridX, y: gridY };
}

// Function to mark the occupied grid points
export function markOccupiedGrid(
  global_grid: string[][],
  rects: { x: number; y: number; width: number; height: number }[],
  symbol,
) {
  rects.forEach((rect) => {
    const startX = rect.x;
    const startY = rect.y;
    const endX = startX + rect.width;
    const endY = startY + rect.height;

    // x:columns, y:rows
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (global_grid[x][y] == "0000" || global_grid[x][y] !== "*") {
          global_grid[x][y] = symbol;
        } else {
          continue; // if the grid is already marked, skip
        }
      }
    }
  });
}

// function matrixLayout(
//   regionWidth: number,
//   rectangles: tRectangle[],
//   bbox_origin: number[],
// ): [number, number, number, number, string][] {
//   let padding = 10;
//   let xStart = padding; // Start x-coordinate, will be updated for center alignment
//   let y = padding;
//   let rowMaxHeight = 0;

//   const rectangleCoordinates: [number, number, number, number, string][] = [];

//   // Function to reset for a new row
//   function newRow(): void {
//     y += rowMaxHeight + padding;
//     rowMaxHeight = 0;
//   }

//   // Function to calculate row width (helper function)
//   function calculateRowWidth(rectangles: tRectangle[]): number {
//     return (
//       rectangles.reduce((acc, rect) => acc + rect.width + padding, 0) - padding
//     ); // Minus padding to adjust for extra padding at the end
//   }

//   // Temp array to hold rectangles for current row, to calculate total width for centering
//   let tempRowRectangles: tRectangle[] = [];

//   rectangles.forEach((rect) => {
//     if (
//       xStart + calculateRowWidth(tempRowRectangles) + rect.width + padding >
//       regionWidth
//     ) {
//       // Center align previous row's rectangles before starting a new row
//       let rowWidth = calculateRowWidth(tempRowRectangles);
//       let startX = (regionWidth - rowWidth) / 2 + bbox_origin[0]; // Calculate starting X for center alignment

//       // Assign coordinates with center alignment
//       tempRowRectangles.forEach((tempRect) => {
//         rectangleCoordinates.push([
//           startX,
//           y + bbox_origin[1],
//           tempRect.width,
//           tempRect.height,
//           tempRect.name,
//         ]);
//         startX += tempRect.width + padding;
//       });

//       // Reset for new row
//       newRow();
//       tempRowRectangles = [];
//       xStart = padding;
//     }

//     // Add current rectangle to temp row for future processing
//     tempRowRectangles.push(rect);
//     rowMaxHeight = Math.max(rowMaxHeight, rect.height);
//   });

//   // Process the last row, if there are any rectangles left
//   if (tempRowRectangles.length > 0) {
//     let rowWidth = calculateRowWidth(tempRowRectangles);
//     let startX = (regionWidth - rowWidth) / 2 + bbox_origin[0]; // Center align

//     tempRowRectangles.forEach((tempRect) => {
//       rectangleCoordinates.push([
//         startX,
//         y + bbox_origin[1],
//         tempRect.width,
//         tempRect.height,
//         tempRect.name,
//       ]);
//       startX += tempRect.width + padding;
//     });
//   }

//   return rectangleCoordinates;
// }

// layout should be like this:
//   ---
//  -   -
//  -   -
//   ---
// export function squareLayout(
//   varname: string,
//   regionWidth: number,
//   regionHeight: number,
//   rectangles: tRectangle[],
//   bbox_origin: number[],
//   cellWidth: number,
//   cellHeight: number,
// ) {
//   // Calculate the number of rectangles in each row
//   let first_row_rect_number = Math.max(3, Math.floor(regionWidth / rectangles[0].width) - 2);
//   if (rectangles.length < 9) {
//     first_row_rect_number = Math.max(2, Math.floor(regionWidth / rectangles[0].width) - 2);
//   }

//   let middle_row_number =
//     rectangles.length % 2 === 0
//       ? (rectangles.length - first_row_rect_number * 2) / 2
//       : (rectangles.length - first_row_rect_number * 2 - 1) / 2;

//   // Adjust heights based on the new rules
//   const { selectedMiddleRectangles } = adjustRectangleHeights(rectangles, middle_row_number);

//   // Rearrange rectangles to put top 4 at corners and selectedMiddleRectangles in the middle
//   const topFour = rectangles.slice(0, 4);
//   const otherRectangles = rectangles.filter(rect => !topFour.includes(rect) && !selectedMiddleRectangles.includes(rect));

//   const rearrangedRectangles = [
//     topFour[0],
//     ...otherRectangles.slice(0, first_row_rect_number - 2),
//     topFour[1],
//     ...selectedMiddleRectangles,
//     topFour[2],
//     ...otherRectangles.slice(first_row_rect_number - 2),
//     topFour[3]
//   ];

//   const rect_width = cellWidth * rectangles[0].width;
//   const max_rect_per_row = Math.floor(regionWidth / rectangles[0].width);
//   console.log(rearrangedRectangles);
//   let rectangleCoordinates: [
//     number,
//     number,
//     number,
//     number,
//     string,
//     string,
//     number,
//   ][] = [];

//   let last_row_rect_number =
//     rearrangedRectangles.length - first_row_rect_number - middle_row_number * 2;

//   // Calculate total height of all rectangles
//   let total_rect_height = 0;
//   total_rect_height += Math.max(...rearrangedRectangles.slice(0, first_row_rect_number).map(rect => rect.height * cellHeight));
//   for (let i = 0; i < middle_row_number; i++) {
//     total_rect_height += Math.max(
//       rearrangedRectangles[2 * i + first_row_rect_number].height * cellHeight,
//       rearrangedRectangles[2 * i + 1 + first_row_rect_number].height * cellHeight
//     );
//   }
//   total_rect_height += Math.max(...rearrangedRectangles.slice(rearrangedRectangles.length - last_row_rect_number).map(rect => rect.height * cellHeight));

//   // Calculate y_offset
//   let num_gaps = 2 + middle_row_number; // gaps between rows
//   let y_offset = (regionHeight * cellHeight - total_rect_height) / num_gaps;

//   // Ensure y_offset is not negative
//   y_offset = Math.max(y_offset, 0);

//   let first_space_between_rectangles = (regionWidth * cellWidth - rect_width * first_row_rect_number) / (first_row_rect_number - 1);
//   let second_space_between_rectangles = (regionWidth * cellWidth - rect_width * last_row_rect_number) / (last_row_rect_number - 1);

//   let first_row_offset_left =
//     (cellWidth * regionWidth -
//       (first_row_rect_number * rect_width +
//         (first_row_rect_number - 1) * first_space_between_rectangles)) /
//     2;

//   let accumulative_y_offset = 0;

//   // First row
//   for (let i = 0; i < first_row_rect_number; i++) {
//     let x =
//       (bbox_origin[0] - 1) * cellWidth +
//       first_row_offset_left +
//       i * (rect_width + first_space_between_rectangles);
//     let y = bbox_origin[1] * cellHeight + accumulative_y_offset;
//     let Grid = svgToGridCoordinate(x, y, cellWidth, cellHeight);

//     let type = "top";
//     if (i === 0) type = "top-left";
//     if (i === first_row_rect_number - 1) type = "top-right";

//     rectangleCoordinates.push([
//       Grid.x,
//       Grid.y,
//       rearrangedRectangles[i].width,
//       rearrangedRectangles[i].height,
//       rearrangedRectangles[i].name,
//       type,
//       rearrangedRectangles[i].outgroup_degree,
//     ]);
//   }

//   accumulative_y_offset += Math.max(...rearrangedRectangles.slice(0, first_row_rect_number).map(rect => rect.height * cellHeight)) + y_offset;

//   // Middle rows
//   for (let i = 0; i < middle_row_number; i++) {
//     let x1 = (bbox_origin[0] - 1) * cellWidth;
//     let y1 = bbox_origin[1] * cellHeight + accumulative_y_offset;
//     let Grid1 = svgToGridCoordinate(x1, y1, cellWidth, cellHeight);

//     let x2 = (bbox_origin[0] - 1) * cellWidth + cellWidth * regionWidth - rect_width;
//     let y2 = bbox_origin[1] * cellHeight + accumulative_y_offset;
//     let Grid2 = svgToGridCoordinate(x2, y2, cellWidth, cellHeight);

//     rectangleCoordinates.push([
//       Grid1.x,
//       Grid1.y,
//       rearrangedRectangles[2 * i + first_row_rect_number].width,
//       rearrangedRectangles[2 * i + first_row_rect_number].height,
//       rearrangedRectangles[2 * i + first_row_rect_number].name,
//       "left",
//       rearrangedRectangles[2 * i + first_row_rect_number].outgroup_degree,
//     ]);
//     rectangleCoordinates.push([
//       Grid2.x,
//       Grid2.y,
//       rearrangedRectangles[2 * i + 1 + first_row_rect_number].width,
//       rearrangedRectangles[2 * i + 1 + first_row_rect_number].height,
//       rearrangedRectangles[2 * i + 1 + first_row_rect_number].name,
//       "right",
//       rearrangedRectangles[2 * i + 1 + first_row_rect_number].outgroup_degree,
//     ]);

//     let row_max_height = Math.max(
//       rearrangedRectangles[2 * i + first_row_rect_number].height * cellHeight,
//       rearrangedRectangles[2 * i + 1 + first_row_rect_number].height * cellHeight
//     );
//     accumulative_y_offset += row_max_height + y_offset;
//   }

//   // Last row
//   let last_row_offset_left =
//     (cellWidth * regionWidth -
//       (last_row_rect_number * rect_width +
//         (last_row_rect_number - 1) * second_space_between_rectangles)) /
//     2;

//   for (let i = 0; i < last_row_rect_number; i++) {
//     let x =
//       (bbox_origin[0] - 1) * cellWidth +
//       last_row_offset_left +
//       i * (rect_width + second_space_between_rectangles);
//     let y = bbox_origin[1] * cellHeight + accumulative_y_offset;
//     let Grid = svgToGridCoordinate(x, y, cellWidth, cellHeight);

//     let type = "bottom";
//     if (i === 0) type = "bottom-left";
//     if (i === last_row_rect_number - 1) type = "bottom-right";

//     rectangleCoordinates.push([
//       Grid.x,
//       Grid.y,
//       rearrangedRectangles[i + first_row_rect_number + middle_row_number * 2].width,
//       rearrangedRectangles[i + first_row_rect_number + middle_row_number * 2].height,
//       rearrangedRectangles[i + first_row_rect_number + middle_row_number * 2].name,
//       type,
//       rearrangedRectangles[i + first_row_rect_number + middle_row_number * 2].outgroup_degree,
//     ]);
//   }

//   return rectangleCoordinates;
// }
export function adjustRectangleHeights(
  rectangles: tRectangle[],
  middle_row_number: number,
) {
  const defaultHeight = rectangles[0].height;

  // Rule 1: Adjust top four elements
  for (let i = 0; i < 4 && i < rectangles.length; i++) {
    let rect = rectangles[i];
    while (rect.height + rect.width < rect.outgroup_degree) {
      rect.height = Math.round(rect.outgroup_degree - rect.width);
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
      rect.height = Math.round(Math.max(defaultHeight, rect.outgroup_degree));
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

export function squareLayout(
  _rectangles: tRectangle[],
  bboxes: { center: [number, number]; size: [number, number] },
) {
  // create a local rectangle array to avoid modifying the original array
  const rectangles = _rectangles.map((rect) => {
    return {
      ...rect,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  });
  const center = bboxes.center;
  const y_offset = 1;
  const rect_width = rectangles[0].width;

  //TODO: adjust the number of rectangles in the first row based on the ratio of w and h
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
  ];

  let last_row_rect_number =
    rearrangedRectangles.length - first_row_rect_number - middle_row_number * 2;

  // Correct box_height calculation
  let box_height = 0;

  // First row height
  box_height += Math.max(
    ...rearrangedRectangles
      .slice(0, first_row_rect_number)
      .map((r) => r.height),
  );

  // Middle rows height
  for (let i = 0; i < middle_row_number; i++) {
    let leftIndex = first_row_rect_number + i * 2;
    let rightIndex = leftIndex + 1;
    box_height += Math.max(
      rearrangedRectangles[leftIndex].height,
      rearrangedRectangles[rightIndex].height,
    );
  }

  // Last row height
  if (last_row_rect_number > 0) {
    box_height += Math.max(
      ...rearrangedRectangles.slice(-last_row_rect_number).map((r) => r.height),
    );
  }

  // Add y_offset between rows
  box_height +=
    (first_row_rect_number > 0
      ? 1
      : 0 + middle_row_number + (last_row_rect_number > 0 ? 1 : 0) - 1) *
    y_offset;

  box_height = Math.round(box_height);

  const box_width = Math.round(
    Math.max(
      first_row_rect_number * rect_width + (first_row_rect_number - 1) * 2,
      last_row_rect_number * rect_width + (last_row_rect_number - 1) * 2,
    ),
  );
  // console.log(bboxes);
  bboxes.size = [box_width, box_height];

  let first_space_between_rectangles = Math.round(
    (box_width - rect_width * first_row_rect_number) /
      (first_row_rect_number - 1),
  );
  let second_space_between_rectangles = Math.round(
    (box_width - rect_width * last_row_rect_number) /
      (last_row_rect_number - 1),
  );

  const bbox_origin: [number, number] = [
    Math.round(center[0] - box_width / 2),
    Math.round(center[1] - box_height / 2),
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
    let x = Math.round(
      bbox_origin[0] + i * (rect_width + first_space_between_rectangles),
    );
    let y = Math.round(bbox_origin[1] + accumulative_y_offset);
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

  return rectangleCoordinates;
}
export function combineData(
  vars: tVariableType,
  rectangles: [number, number, number, number, string, string, number][],
  global_grid: string[][],
): tRectObject[] {
  // console.log({rectangles})
  const allX = rectangles.map((rect) => rect[0]);
  const allY = rectangles.map((rect) => rect[1]);
  const allXPlusWidth = rectangles.map((rect) => rect[0] + rect[2]);
  const allYPlusHeight = rectangles.map((rect) => rect[1] + rect[3]);

  // const x_value = Array.from(new Set(allX)).sort((a, b) => a - b);
  // const min_x = vars.variable_type === "state" ? x_value[0] : x_value[1]; // if var type is response, choose the third min value
  const min_x = Math.min(...allXPlusWidth);
  const max_x = Math.max(...allX);
  const min_y = Math.min(...allYPlusHeight);
  const max_y = Math.max(...allY);
  // console.log("combine data")
  // mark boundary for outGroup links with "-" in the grid
  let boundary_arr: { x: number; y: number; width: number; height: number }[] =
    [];
  boundary_arr.push({
    x: min_x + 1,
    y: min_y + 1,
    width: max_x - min_x - 1,
    height: max_y - min_y - 1,
  });
  markOccupiedGrid(global_grid, boundary_arr, "-");
  return rectangles.map((rect) => {
    let [x, y, width, height, variable_name, position, degree] = rect;
    // if (variable_name == "珊瑚礁狀態") {
    //   position = "bottom";
    // } else if (
    //   variable_name == "物理和化學品質" ||
    //   variable_name == "漁業減少"
    // ) {
    //   position = "right";
    // } else if (variable_name == "自然棲息地變化") {
    //   position = "left";
    // }
    // else if (variable_name == "漁業減少"){
    //   position = "top"
    // }

    const variable = vars.variable_mentions[variable_name];
    const mentions = variable?.mentions || [];
    const factor_type = variable?.factor_type;
    const definition = variable?.definition;
    const frequency = mentions.length;
    const boundary = { min_x, max_x, min_y, max_y };
    return {
      x,
      y,
      width,
      height,
      variable_name,
      position,
      mentions,
      factor_type,
      frequency,
      definition,
      boundary,
      degree,
    };
  });
}

export function createOrUpdateGradient(svg, link_data: tLinkObject, self) {
  const gradientId = `gradient-${link_data.source.var_name}-${link_data.target.var_name}`;

  // Attempt to select an existing gradient
  let gradient = svg.select(`#${gradientId}`);

  // If the gradient does not exist, create it
  if (gradient.empty()) {
    // console.log("Creating gradient", gradientId);
    gradient = svg
      .select("defs")
      .append("linearGradient")
      .attr("id", gradientId)
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", link_data.source.newX_source)
      .attr("y1", link_data.source.newY_source)
      .attr("x2", link_data.target.newX_target)
      .attr("y2", link_data.target.newY_target)
      .selectAll("stop")
      .data([
        {
          offset: "0%",
          color: self.varTypeColorScale(link_data.source.var_type),
        },
        {
          offset: "100%",
          color: self.varTypeColorScale(link_data.target.var_type),
        },
      ])
      .enter()
      .append("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);
  }

  return `url(#${gradientId})`;
}

export function createArrow(svg, d: tLinkObject, self) {
  const arrowId = `arrow-${d.source.var_name}-${d.target.var_name}`;
  let arrow = svg.select(`#${arrowId}`);
  if (arrow.empty()) {
    svg
      .select("defs")
      .append("marker")
      .attr("id", arrowId)
      .attr("viewBox", [0, 0, 10, 10])
      .attr("refX", 5)
      .attr("refY", 5)
      .attr("markerWidth", 4)
      .attr("markerHeight", 4)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr(
        "d",
        d3.line()([
          [0, 0],
          [10, 5],
          [0, 10],
        ]),
      )
      .attr("fill", self.varTypeColorScale(d.source.var_type));
    // .attr('fill', 'gray')
  }

  return `url(#${arrowId})`;
}

// includes variables frequency and link frequency among all groups
export function calculateFrequencyList(new_links: tVisLink[]) {
  // let { minLength, maxLength } = variables.reduce((result, item) => {
  //     if (item.variable_mentions) {
  //     Object.values(item.variable_mentions).forEach((variable:any) => {
  //         if (variable.mentions) {
  //         const mentionsLength = variable.mentions.length;
  //         result.minLength = Math.min(result.minLength, mentionsLength);
  //         result.maxLength = Math.max(result.maxLength, mentionsLength);
  //         }
  //     });
  //     }
  //     return result;
  // }, { minLength: Infinity, maxLength: -Infinity });

  const maxLinkFrequency = new_links.reduce(
    (max, link) => Math.max(max, link.frequency),
    0,
  );
  const minLinkFrequency = new_links.reduce(
    (min, link) => Math.min(min, link.frequency),
    Infinity,
  );

  const frequencyList = {
    // minLength: minLength,
    // maxLength: maxLength,
    minLinkFrequency: minLinkFrequency,
    maxLinkFrequency: maxLinkFrequency,
  };

  return frequencyList;
}

// text longer than `width` will be in next line
export function wrap(text, width) {
  text.each(function (d, i) {
    var text = d3.select(this),
      // words = text.text().split(/\s+/).reverse(),
      words = text.text().split("").reverse(),
      word,
      line: any[] = [],
      lineNumber = 0,
      lineHeight = 1.1, // ems
      x = text.attr("x"),
      y = text.attr("y"),
      dy = 0, //parseFloat(text.attr("dy")),
      tspan = text
        .text(null)
        .append("tspan")
        .attr("x", x)
        .attr("y", y)
        .attr("dy", dy + "em")
        .attr("text-anchor", "bottom")
        .attr("dominant-baseline", "central");
    while ((word = words.pop())) {
      line.push(word);
      tspan.text(line.join(""));
      if (tspan.node()!.getComputedTextLength() > width && line.length > 1) {
        line.pop();
        tspan.text(line.join(""));
        line = [word];
        tspan = text
          .append("tspan")
          .attr("x", x)
          .attr("y", y)
          .attr("dy", ++lineNumber * lineHeight + dy + "em")
          .attr("dominant-baseline", "central")
          .text(word);
      }
    }
    const line_num = text.selectAll("tspan").nodes().length;
    const em_to_px = 16;
    text
      .selectAll("tspan")
      .attr("y", +y - (em_to_px / 2) * lineHeight * (line_num - 1));
  });
}

export function add_utility_button({
  parent,
  class_name,
  activated_color,
  deactivated_color,
  activated_text_color,
  deactivated_text_color,
  text,
  x,
  y,
  width,
  height,
  onClick,
  stateless = true,
}) {
  const utility_button = parent.append("g").attr("class", class_name);
  const animation_scale_factor = 1.1;
  utility_button
    .append("rect")
    .classed("utility-button", true)
    .attr("x", x)
    .attr("y", y)
    .attr("width", width)
    .attr("height", height)
    .attr("fill", deactivated_color)
    .attr("rx", "0.2%")
    .attr("stroke", "gray")
    .attr("cursor", "pointer")
    .on("mouseover", function () {
      d3.select(this).attr("stroke-width", 2);
      if (stateless) return;
      const activated = d3.select(this).attr("fill") === activated_color;
      d3.select(this).attr("fill", activated ? activated_color : "lightgray");
    })
    .on("mouseout", function () {
      d3.select(this)
        .attr("stroke-width", 1)
        .attr("fill", () => {
          if (stateless) return deactivated_color;
          const activated = d3.select(this).attr("fill") === activated_color;
          return activated ? activated_color : deactivated_color;
        });
    })
    .on("click", function () {
      onClick();
      const button = d3.select(this);
      const activated = button.attr("fill") === activated_color;
      button.attr("fill", activated ? deactivated_color : activated_color);
      button
        .transition()
        .duration(200)
        .attr("x", function () {
          return x - (width * (animation_scale_factor - 1)) / 2;
        })
        .attr("y", function () {
          return y - (height * (animation_scale_factor - 1)) / 2;
        })
        .attr("width", function () {
          return width * animation_scale_factor;
        })
        .attr("height", function () {
          return height * animation_scale_factor;
        })
        .transition()
        .duration(100)
        .attr("x", x)
        .attr("y", y)
        .attr("width", width)
        .attr("height", height)
        .on("end", () => {
          // console.log({ stateless });
          if (stateless) button.attr("fill", deactivated_color);
        });
      if (!stateless) {
        d3.select(this.parentNode)
          .select("text")
          .attr(
            "fill",
            activated ? deactivated_text_color : activated_text_color,
          );
      }
    });
  utility_button
    .append("text")
    .attr("x", x + width / 2)
    .attr("y", y + height / 2)
    .attr("pointer-events", "none")
    .text(text)
    .attr("fill", stateless ? activated_text_color : deactivated_text_color)
    .attr("dominant-baseline", "middle")
    .attr("text-anchor", "middle");
}

export function pathFinding(link, grid: string[][], points) {
  // console.log("dijkstra", start, goal);
  class Cell {
    parent_i: number;
    parent_j: number;
    f: number;
    g: number;
    h: number;

    constructor() {
      this.parent_i = 0;
      this.parent_j = 0;
      this.f = 0;
      this.g = 0;
      this.h = 0;
    }
  }
  let start,
    goal,
    inGroup = false;

  if (link.source.var_type == link.target.var_type) {
    start = getNextStartPoint(link.source.var_name, points, true);
    goal = getNextEndPoint(link.target.var_name, points, true);
    inGroup = true;
    let path = [start, goal];
    return path;
  } else {
    start = getNextStartPoint(link.source.var_name, points, false);
    goal = getNextEndPoint(link.target.var_name, points, false);
    const rows = grid[0].length;
    const cols = grid.length;
    let closedList = new Array(cols);
    for (let i = 0; i < cols; i++) {
      closedList[i] = new Array(rows).fill(false);
    }

    // Declare a 2D array of structure to hold the details
    // of that Cell
    let cellDetails = new Array(cols);
    for (let i = 0; i < cols; i++) {
      cellDetails[i] = new Array(rows);
    }

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        cellDetails[i][j] = new Cell();
        // Initialising the parameters of the starting node
        cellDetails[i][j].f = i === start[0] && j === start[1] ? 0 : 2147483647;
        cellDetails[i][j].g = i === start[0] && j === start[1] ? 0 : 2147483647;
        cellDetails[i][j].h = i === start[0] && j === start[1] ? 0 : 2147483647;
        cellDetails[i][j].parent_i = -1;
        cellDetails[i][j].parent_j = -1;
      }
    }

    let openList = new PriorityQueue();
    openList.enqueue(0, [start[0], start[1]]);
    let foundDest = false;

    while (!openList.isEmpty()) {
      let p = openList.dequeue();

      let i = p[0];
      let j = p[1];
      // console.log("i,j",i,j)

      closedList[i][j] = true;
      let gNew, hNew, fNew;

      const directions = [
        [0, 1],
        [-1, 0],
        [0, -1],
        [1, 0],
      ];
      //North
      for (const [di, dj] of directions) {
        const ni = i + di; // neighbor i
        const nj = j + dj; // neighbor j
        if (isValid(ni, nj, rows, cols)) {
          if (isDestination(ni, nj, goal)) {
            cellDetails[ni][nj].parent_i = i;
            cellDetails[ni][nj].parent_j = j;
            // console.log("The destination cell is found");
            // console.log(cellDetails)
            let path = tracePath(cellDetails, start, goal, grid);
            foundDest = true;
            // console.log({path})
            return path;
          } else if (
            !closedList[ni][nj] &&
            isUnBlocked(grid, ni, nj, inGroup)
          ) {
            let status = parseInt(grid[ni][nj], 2);
            // allow crossing but not overlapping
            if (i == ni) {
              //check if there are vertical obstacles
              const nonWalkableMasks = 0b1010;
              if (status & nonWalkableMasks) {
                continue;
              }
            } else if (j == nj) {
              //check if there are horizontal obstacles
              const nonWalkableMasks = 0b0101;
              if (status & nonWalkableMasks) {
                continue;
              }
            }

            // console.log("if the neighbor not in the closed list and is not blocked")
            if (
              (cellDetails[i][j].parent_i == i && i == ni) ||
              (cellDetails[i][j].parent_j == j && j == nj)
            ) {
              gNew = cellDetails[i][j].g + 1.0;
            } else {
              gNew = cellDetails[i][j].g + 2.0; //add the turn cost
            }
            // gNew = cellDetails[i][j].g + 1.0;
            hNew = calculateHValue(ni, nj, goal);
            fNew = gNew + hNew;

            if (
              cellDetails[ni][nj].f == Number.MAX_VALUE ||
              cellDetails[ni][nj].f > fNew
            ) {
              openList.enqueue(fNew, [ni, nj]);
              cellDetails[ni][nj].f = fNew;
              cellDetails[ni][nj].g = gNew;
              cellDetails[ni][nj].h = hNew;
              cellDetails[ni][nj].parent_i = i;
              cellDetails[ni][nj].parent_j = j;
            }
          }
        }
      }
    }
    if (foundDest == false) {
      let path = [start, goal];

      function incrementLinkTypeCount(sourceType: string, targetType: string) {
        const key = `${sourceType}-${targetType}`;
        linkTypeCounts.set(key, (linkTypeCounts.get(key) || 0) + 1);
      }
      incrementLinkTypeCount(link.source.var_type, link.target.var_type);

      // Calculate total unfound count
      const unfoundCount = Array.from(linkTypeCounts.values()).reduce(
        (sum, count) => sum + count,
        0,
      );

      // Create an object to hold all counts
      const allCounts = {
        total: unfoundCount,
        ...Object.fromEntries(linkTypeCounts),
      };

      // Log all counts in a single console.log statement
      console.log("Unfound Counts:", allCounts);
      // return null;
      return path;
    }
  }

  // console.log({ start, goal });
}

export function isValid(col, row, rows, cols) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}
export function isUnBlocked(grid, col, row, inGroup) {
  if (!inGroup) {
    return grid[col][row] != "*" && grid[col][row] != "-"; //set block for outGroup links
  }
  return grid[col][row] != "*";
}
export function isDestination(col, row, dest) {
  return row == dest[1] && col == dest[0];
}
export function calculateHValue(row, col, dest) {
  return Math.abs(row - dest[1]) + Math.abs(col - dest[0]);
}
export function tracePath(cellDetails, start, goal, grid) {
  // console.log("The Path is ");
  let col = goal[0];
  let row = goal[1];
  // console.log(cellDetails[col][row])
  let Path: [number, number][] = [];
  while (true) {
    // if start is reached, break out of the loop
    if (col == start[0] && row == start[1]) {
      Path.push([start[0], start[1]]);
      break;
    }
    Path.push([col, row]);
    // console.log(Path)
    let temp_col = cellDetails[col][row].parent_i;
    let temp_row = cellDetails[col][row].parent_j;
    console.assert(Math.abs(temp_col - col) + Math.abs(temp_row - row) == 1);
    row = temp_row;
    col = temp_col;
  }
  Path.reverse();

  for (let k = 1; k < Path.length - 1; k++) {
    //skip the start and goal point
    const [cur_col, cur_row] = Path[k];
    const [prev_col, prev_row] = Path[k - 1];
    const [next_col, next_row] = Path[k + 1];

    let status = parseInt(grid[cur_col][cur_row], 2);

    // Handle corners
    if (
      !(prev_col === cur_col && cur_col === next_col) &&
      !(prev_row === cur_row && cur_row === next_row)
    ) {
      if (
        (prev_col > cur_col && next_row > cur_row) ||
        (prev_row > cur_row && next_col > cur_col)
      ) {
        status |= 0b1010;
      }
      if (
        (prev_col > cur_col && next_row < cur_row) ||
        (prev_row < cur_row && next_col > cur_col)
      ) {
        status |= 0b1100;
      }
      if (
        (prev_col < cur_col && next_row > cur_row) ||
        (prev_row > cur_row && next_col < cur_col)
      ) {
        status |= 0b0011;
      }
      if (
        (prev_col < cur_col && next_row < cur_row) ||
        (prev_row < cur_row && next_col < cur_col)
      ) {
        status |= 0b0110;
      }
    }
    if (
      (prev_col > cur_col && prev_row === cur_row) ||
      (next_col > cur_col && next_row === cur_row)
    ) {
      status |= 0b0100; // from or to right
    } else if (
      (prev_col < cur_col && prev_row === cur_row) ||
      (next_col < cur_col && next_row === cur_row)
    ) {
      status |= 0b0001; // from or to left
    } else if (
      (prev_col === cur_col && prev_row > cur_row) ||
      (next_col === cur_col && next_row > cur_row)
    ) {
      status |= 0b1000; // from or to below
    } else if (
      (prev_col === cur_col && prev_row < cur_row) ||
      (next_col === cur_col && next_row < cur_row)
    ) {
      status |= 0b0010; // from or to above
    }

    grid[cur_col][cur_row] = status.toString(2).padStart(4, "0");
    // console.log({cur_col, cur_row, status: grid[cur_col][cur_row]})
  }

  return Path;
}

export function generatePoints(linkCounts) {
  const result: {
    [varName: string]: {
      inGroup_startPoints: [number, number][];
      inGroup_endPoints: [number, number][];
      outGroup_startPoints: [number, number][];
      outGroup_endPoints: [number, number][];
    };
  } = {};

  for (const varName in linkCounts) {
    const {
      InGroup_inLinks,
      InGroup_outLinks,
      OutGroup_inLinks,
      OutGroup_outLinks,
      x,
      y,
      width,
      height,
      position,
    } = linkCounts[varName];

    const inGroup_startPoints: [number, number][] = [];
    const inGroup_endPoints: [number, number][] = [];
    const outGroup_startPoints: [number, number][] = [];
    const outGroup_endPoints: [number, number][] = [];

    // Helper function to add points based on position
    const addPoints = (
      startPoints: [number, number][],
      endPoints: [number, number][],
      outLinks: number,
      inLinks: number,
      primaryStartX: number,
      primaryStartY: number,
      primaryIncrementX: number,
      primaryIncrementY: number,
      primaryMaxX: number,
      primaryMaxY: number,
      secondaryStartX: number,
      secondaryStartY: number,
      secondaryIncrementX: number,
      secondaryIncrementY: number,
      secondaryMaxX: number,
      secondaryMaxY: number,
    ) => {
      let remainingOutLinks = outLinks;
      let usedSecondaryEdge = false;
      let lastPrimaryPoint = [primaryStartX, primaryStartY];
      let lastSecondaryPoint = [secondaryStartX, secondaryStartY];

      // Assign start points for outLinks
      while (remainingOutLinks > 0) {
        let i, j;
        i = primaryStartX;
        j = primaryStartY;
        for (
          ;
          (primaryIncrementX > 0 ? i <= primaryMaxX : i >= primaryMaxX) &&
          (primaryIncrementY > 0 ? j <= primaryMaxY : j >= primaryMaxY) &&
          remainingOutLinks > 0;
          primaryIncrementX
            ? (i += primaryIncrementX)
            : (j += primaryIncrementY)
        ) {
          startPoints.push([i, j]);
          lastPrimaryPoint = [i, j];
          remainingOutLinks--;
        }

        // If primary edge is used up, use secondary edge
        if (remainingOutLinks > 0) {
          usedSecondaryEdge = true;
          for (
            let i = secondaryStartX, j = secondaryStartY;
            (secondaryIncrementX > 0
              ? i <= secondaryMaxX
              : i >= secondaryMaxX) &&
            (secondaryIncrementY > 0
              ? j <= secondaryMaxY
              : j >= secondaryMaxY) &&
            remainingOutLinks > 0;
            secondaryIncrementX
              ? (i += secondaryIncrementX)
              : (j += secondaryIncrementY)
          ) {
            startPoints.push([i, j]);
            lastSecondaryPoint = [i, j];
            remainingOutLinks--;
          }
        }
      }

      // Assign end points for inLinks
      let remainingInLinks = inLinks;
      let i, j;

      if (!usedSecondaryEdge) {
        // Start from the next point of the last point used by start points on the primary edge
        [i, j] = lastPrimaryPoint;
        primaryIncrementX ? (i += primaryIncrementX) : (j += primaryIncrementY);
      }
      // if (varName == "恢復") {
      //   i = secondaryStartX;
      //   j = secondaryStartY;
      // }
      while (remainingInLinks > 0) {
        if (!usedSecondaryEdge) {
          for (
            ;
            (primaryIncrementX > 0 ? i <= primaryMaxX : i >= primaryMaxX) &&
            (primaryIncrementY > 0 ? j <= primaryMaxY : j >= primaryMaxY) &&
            remainingInLinks > 0;
            primaryIncrementX
              ? (i += primaryIncrementX)
              : (j += primaryIncrementY)
          ) {
            endPoints.push([i, j]);
            remainingInLinks--;
          }
        }

        if (remainingInLinks > 0) {
          if (!usedSecondaryEdge) {
            i = secondaryStartX;
            j = secondaryStartY;
            // } else if (varName == "海洋酸化") {
            //   //put all endpoint on the secondary edge
            //   i = secondaryStartX;
            //   j = secondaryStartY;
            // } else if (varName == "管理和規範") {
            //   i = secondaryMaxX;
            //   j = secondaryMaxY - 1;
            //   // secondaryIncrementY = 1;
            //   secondaryMaxY = secondaryMaxY - 4;
          } else {
            [i, j] = lastSecondaryPoint;
            secondaryIncrementX
              ? (i += secondaryIncrementX)
              : (j += secondaryIncrementY);
          }

          for (
            ;
            (secondaryIncrementX > 0
              ? i <= secondaryMaxX
              : i >= secondaryMaxX) &&
            (secondaryIncrementY > 0
              ? j <= secondaryMaxY
              : j >= secondaryMaxY) &&
            remainingInLinks > 0;
            secondaryIncrementX
              ? (i += secondaryIncrementX)
              : (j += secondaryIncrementY)
          ) {
            endPoints.push([i, j]);
            remainingInLinks--;
          }
        }
        //those who needs the third edge
        // if (remainingInLinks > 0) {
        //   if (varName == "教育和意識" || varName == "恢復") {
        //     i = primaryMaxX;
        //     j = varName == "教育和意識" ? secondaryStartY - 1 : secondaryStartY;
        //     for (
        //       ;
        //       (secondaryIncrementY > 0
        //         ? j <= secondaryMaxY
        //         : j >= primaryMaxY) && remainingInLinks > 0;
        //       j += secondaryIncrementY
        //     ) {
        //       endPoints.push([i, j]);
        //       remainingInLinks--;
        //     }
        //   } else if (varName == "生態狀態（生物品質）") {
        //     i = secondaryMaxX;
        //     j = secondaryMaxY;
        //     secondaryIncrementY = 1;
        //     for (
        //       ;
        //       (secondaryIncrementY > 0
        //         ? j <= primaryStartY
        //         : j >= secondaryMaxY) && remainingInLinks > 0;
        //       j += secondaryIncrementY
        //     ) {
        //       endPoints.push([i, j]);
        //       remainingInLinks--;
        //     }
        //   }
        // }
      }
    };

    const addPoints_InGroup = (
      startPoints: [number, number][],
      endPoints: [number, number][],
      outLinks: number,
      inLinks: number,
      centerX: number,
      centerY: number,
    ) => {
      let remainingOutLinks = outLinks;
      let remainingInLinks = inLinks;
      let i = centerX;
      let j = centerY;
      while (remainingOutLinks > 0) {
        startPoints.push([i, j]);
        remainingOutLinks--;
      }
      while (remainingInLinks > 0) {
        endPoints.push([i, j]);
        remainingInLinks--;
      }
    };
    addPoints_InGroup(
      inGroup_startPoints,
      inGroup_endPoints,
      InGroup_outLinks,
      InGroup_inLinks,
      x + width / 2,
      y + height / 2,
    );

    // Set points for outGroup links
    if (position === "top" || position === "top-left") {
      addPoints(
        outGroup_startPoints,
        outGroup_endPoints,
        OutGroup_outLinks,
        OutGroup_inLinks,
        x,
        y,
        1,
        0,
        x + width,
        y, // Primary edge: top )(left to right)
        x,
        y,
        0,
        1,
        x,
        y + height, // Secondary edge: left (top to bottom
      );
    } else if (position === "left") {
      addPoints(
        outGroup_startPoints,
        outGroup_endPoints,
        OutGroup_outLinks,
        OutGroup_inLinks,
        x,
        y,
        0,
        1,
        x,
        y + height, // Primary edge: left (top to bottom)
        x,
        y,
        1,
        0,
        x + width,
        y, // Secondary edge: top (left to right)
      );
    } else if (position === "top-right") {
      addPoints(
        outGroup_startPoints,
        outGroup_endPoints,
        OutGroup_outLinks,
        OutGroup_inLinks,
        x,
        y,
        1,
        0,
        x + width,
        y, // Secondary edge: top (left to right)
        x + width,
        y,
        0,
        1,
        x + width,
        y + height, // Primary edge: right (top to bottom)
      );
    } else if (position === "right") {
      addPoints(
        outGroup_startPoints,
        outGroup_endPoints,
        OutGroup_outLinks,
        OutGroup_inLinks,
        x + width,
        y,
        0,
        1,
        x + width,
        y + height, // Primary edge: right (top to bottom)
        x + width,
        y,
        -1,
        0,
        x,
        y, // Secondary edge: top (right to left)
      );
    } else if (position === "bottom") {
      addPoints(
        outGroup_startPoints,
        outGroup_endPoints,
        OutGroup_outLinks,
        OutGroup_inLinks,
        x,
        y + height,
        1,
        0,
        x + width,
        y + height, // Primary edge: bottom (left to right)
        x,
        y + height,
        0,
        -1,
        x,
        y, // Secondary edge: left (bottom to top)
      );
    } else if (position === "bottom-left") {
      addPoints(
        outGroup_startPoints,
        outGroup_endPoints,
        OutGroup_outLinks,
        OutGroup_inLinks,
        x,
        y,
        0,
        1,
        x,
        y + height, // Primary edge: left (top to bottom)
        x,
        y + height,
        1,
        0,
        x + width,
        y + height, // Secondary edge: bottom (left to right)
      );
    } else if (position === "bottom-right") {
      addPoints(
        outGroup_startPoints,
        outGroup_endPoints,
        OutGroup_outLinks,
        OutGroup_inLinks,
        x + width,
        y,
        0,
        1,
        x + width,
        y + height, // Primary edge: right (top to bottom)
        x,
        y + height,
        1,
        0,
        x + width,
        y + height, // Secondary edge: bottom (left to right)
      );
    }

    result[varName] = {
      inGroup_startPoints,
      inGroup_endPoints,
      outGroup_startPoints,
      outGroup_endPoints,
    };
  }

  return result;
}

export function getNextStartPoint(varName, points, isSameGroup) {
  const pointData = points[varName];
  // console.log({ pointData });
  if (isSameGroup) {
    return pointData.inGroup_startPoints.shift();
  } else {
    return pointData.outGroup_startPoints.shift();
  }
}

export function getNextEndPoint(varName, points, isSameGroup) {
  const pointData = points[varName];
  if (isSameGroup) {
    return pointData.inGroup_endPoints.shift();
  } else {
    return pointData.outGroup_endPoints.shift();
  }
}
