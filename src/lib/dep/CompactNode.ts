function Placing_node(bboxWidth, bboxHeight, rectangles, bbox_origin, inLinks) {
    // console.log({inLinks})
  
    const numRectangles = rectangles.length;
    const gridSize = Math.floor(5 * Math.sqrt(numRectangles));
    let grid = Array.from(Array(bboxWidth + 1), (_) =>
      Array(bboxHeight + 1).fill(0),
    );
    // let grid = Array.from({ length: bboxWidth+1 }, () => Array(bboxHeight+1).fill(0));
    // console.log({grid, bboxWidth, bboxHeight})
    let tempInitial = Math.floor(2 * Math.sqrt(numRectangles));
    const tempMin = 0.2;
    const iterationCount = 90 * Math.floor(Math.sqrt(numRectangles));
    const coolingRate = Math.pow(tempMin / tempInitial, 1 / iterationCount);
    let compactedNodes = rectangles;
    let visibilityGraph = generateVisibilityGraph(rectangles);
    let compactionDir = true;
  
    // // Adjust origin
    const originX = bbox_origin[0];
    const originY = bbox_origin[1];
    // console.log({rectangles})
    // place node randomly and treat them all 1*1 sized
    rectangles.forEach((rect, index) => {
      let placed = false;
      while (!placed) {
        const x = Math.floor(Math.random() * (bboxWidth - rect.width + 1));
        const y = Math.floor(Math.random() * (bboxHeight - rect.height + 1));
  
        if (isPlaceable(grid, x, y, 1, 1)) {
          placeRectangle(grid, x, y, 1, 1, 1); // Mark the grid as used with 1
          rect.x = x; // Record the x position
          rect.y = y; // Record the y position
          placed = true;
        }
      }
    });
  
    // console.log(grid.map(row => row.join(' ')).join('\n'));
  
    const neighbors: { [key: string]: string[] } = {};
    rectangles.forEach((rect) => {
      neighbors[rect.name] = inLinks
        .filter(
          (link) =>
            link.source.variable_name === rect.name ||
            link.target.variable_name === rect.name,
        )
        .reduce((acc, link) => {
          const neighborName =
            link.source.variable_name === rect.name
              ? link.target.variable_name
              : link.source.variable_name;
          if (!acc.includes(neighborName)) {
            acc.push(neighborName);
          }
          return acc;
        }, []);
    });
    // // console.log({neighbors})
    // for(let i=0; i<iterationCount/2; i++){
    // console.log(grid.map(row => row.join(' ')).join('\n'));
  
    rectangles.forEach((rect) => {
      const rect_neighbors = neighbors[rect.name] || [];
      // console.log({rect_neighbors})
      const medianPositions = neighborsMedian(
        rectangles,
        rect.name,
        rect_neighbors,
      );
      // const medianPositions = neighborsMedian(rectangles, rect, inLinks);
      const x = clamp(
        Math.floor(
          (Math.random() * 2 - 1) * tempInitial + medianPositions.medianX,
        ),
        0,
        bboxWidth - rect.width + 1,
      );
      const y = clamp(
        Math.floor(
          (Math.random() * 2 - 1) * tempInitial + medianPositions.medianY,
        ),
        0,
        bboxHeight - rect.height + 1,
      );
      // console.log({x,y})
      const { bestX, bestY } = findClosestPlace(
        grid,
        x,
        y,
        1,
        1,
        rectangles,
        rect_neighbors,
        rect.name,
      );
      // // if the place is different from the current place get from previous interation
      if (rect.x !== bestX || rect.y !== bestY) {
        placeRectangle(grid, rect.x!, rect.y!, 1, 1, 0); // Remove from old position
        placeRectangle(grid, bestX, bestY, 1, 1, 1); // Place at new position
        rect.x = bestX; //update
        rect.y = bestY; //update
        rect.unitSize = true;
      } else {
        // console.log("change position")
        // Find the closest occupied node
        let closestNode: any | undefined = undefined;
        let minDistance = Infinity;
  
        rectangles.forEach((otherRect) => {
          if (otherRect !== rect && grid[otherRect.x][otherRect.y] === 1) {
            const distance =
              Math.abs(rect.x - otherRect.x) + Math.abs(rect.y - otherRect.y);
            if (distance < minDistance) {
              minDistance = distance;
              closestNode = otherRect;
            }
          }
        });
        // console.log({closestNode})
  
        if (closestNode) {
          const originalEdgeLength =
            calculateTotalEdgeLength(
              rect.x,
              rect.y,
              rectangles,
              rect_neighbors,
              rect.name,
            ) +
            calculateTotalEdgeLength(
              closestNode.x,
              closestNode.y,
              rectangles,
              rect_neighbors,
              closestNode.name,
            );
          const swappedEdgeLength =
            calculateTotalEdgeLength(
              closestNode.x,
              closestNode.y,
              rectangles,
              rect_neighbors,
              rect.name,
            ) +
            calculateTotalEdgeLength(
              rect.x,
              rect.y,
              rectangles,
              rect_neighbors,
              closestNode.name,
            );
          const gain = originalEdgeLength - swappedEdgeLength;
  
          if (gain > 0 && isPlaceable(grid, closestNode.x, closestNode.y, 1, 1)) {
            // Remove the original values from the grid
            placeRectangle(grid, rect.x, rect.y, 1, 1, 0);
            placeRectangle(grid, closestNode.x, closestNode.y, 1, 1, 0);
  
            // Swap the nodes
            // [rect.x, closestNode.x] = [closestNode.x, rect.x];
            // [rect.y, closestNode.y] = [closestNode.y, rect.y];
            let temp_x = rect.x;
            let temp_y = rect.y;
  
            rect.x = closestNode.x;
            rect.y = closestNode.y;
  
            closestNode.x = temp_x;
            closestNode.y = temp_y;
  
            // Add the new values to the grid
            grid = placeRectangle(grid, rect.x, rect.y, 1, 1, 1);
            grid = placeRectangle(grid, closestNode.x, closestNode.y, 1, 1, 1);
          }
        }
      }
    });
  
    visibilityGraph = generateVisibilityGraph(rectangles);
  
    // if (i % 9 === 0) {
  
    compactedNodes = compact(
      grid,
      visibilityGraph,
      inLinks,
      bboxWidth,
      bboxHeight,
      50,
      5,
      compactionDir,
      false,
    );
    compactionDir = !compactionDir;
    // console.log("compactedNodes",compactedNodes)
    // compactedNodes.forEach(compactedNode => {
    //   // Find the corresponding rectangle in the rectangles array
    //   const rectangle = rectangles.find(rect => rect.name === compactedNode.name);
  
    //   // If the rectangle is found, update its x and y values
    //   if (rectangle) {
    //       rectangle.x = compactedNode.x;
    //       rectangle.y = compactedNode.y;
    //   }
    // });
    // }
    tempInitial *= coolingRate;
    // }
  
    // compact(grid,visibilityGraph, inLinks, bboxWidth,bboxHeight, 50,5,true,true);
    // compact(grid,visibilityGraph, inLinks, bboxWidth,bboxHeight, 50,5,false,true);
  
    // for(let i=iterationCount/2; i<iterationCount; i++){
  
    // rectangles.forEach(rect => {
    //     console.log("grid width", grid.length)
    //     console.log("grid height", grid[0].length)
    //     console.log(rect.name,rect.x, rect.y, rect.width, rect.height); // Remove from old position
  
    //     const rect_neighbors = neighbors[rect.name] || [];
    //     const medianPositions = neighborsMedian(rectangles,rect.name,rect_neighbors);
    //       const x = clamp(Math.floor((Math.random() * 2 - 1) * tempInitial + medianPositions.medianX), 0, bboxWidth - rect.width + 1);
    //       const y = clamp(Math.floor((Math.random() * 2 - 1) * tempInitial + medianPositions.medianY), 0, bboxHeight - rect.height + 1);
    //       // console.log({x,y})
    //       const { bestX, bestY  } = findClosestPlace(grid, x, y, rect.width, rect.height,rectangles,rect_neighbors, rect.name);
    //       console.log({bestX,bestY}) //the position is checked
    //       console.assert(bestX+rect.width <= grid.length, "out of bound")
    //       console.assert(bestY+rect.height <= grid[0].length, "out of bound")
  
    //       // if the place is different from the current place get from previous interation
    //       if (rect.x !== bestX || rect.y !== bestY) {
    //         //remove
    //         if(rect.unitSize){
    //           console.log("before remove unit rect:\n",grid.map(row => row.join(' ')).join('\n'));
    //           placeRectangle(grid, rect.x!, rect.y!, 1, 1, 0); // Remove from old position
    //           console.log("remove unit rect:\n",grid.map(row => row.join(' ')).join('\n'));
    //           rect.unitSize = false;
    //         }
    //         else{
    //           console.log("remove")
    //           // console.log("grid width", grid.length)
    //           // console.log("grid height", grid[0].length)
    //           // console.log(rect.x, rect.y, rect.width, rect.height); // Remove from old position
    //           console.log("before remove sized rect:\n",grid.map(row => row.join(' ')).join('\n'));
    //           placeRectangle(grid, rect.x!, rect.y!, rect.width, rect.height, 0); // Remove from old position
    //           console.log("after remove sized rect:\n",grid.map(row => row.join(' ')).join('\n'));
    //         }
    //         //place
    //         if(isPlaceable(grid, bestX, bestY, rect.width, rect.height)){
    //           placeRectangle(grid, bestX, bestY, rect.width, rect.height, 1); // Place at new position
    //           console.log("after place sized rect:\n",grid.map(row => row.join(' ')).join('\n'));
    //         }
    //         rect.x = bestX; //update
    //         rect.y = bestY; //update
  
    //       } else {
    //         console.log("change position")
    //         // Find the closest occupied node
    //         let closestNode: any | undefined = undefined ;
    //         let minDistance = Infinity;
  
    //         rectangles.forEach(otherRect => {
    //           if (otherRect !== rect && grid[otherRect.x][otherRect.y] === 1) {
    //               const distance = Math.abs(rect.x - otherRect.x) + Math.abs(rect.y - otherRect.y);
    //               if (distance < minDistance) {
    //                   minDistance = distance;
    //                   closestNode = otherRect;
    //               }
    //           }
    //         });
    //         // console.log({closestNode})
  
    //         if (closestNode) {
    //             const originalEdgeLength = calculateTotalEdgeLength(rect.x, rect.y, rectangles, rect_neighbors, rect.name) +
    //                                        calculateTotalEdgeLength(closestNode.x, closestNode.y, rectangles, rect_neighbors, closestNode.name);
    //             const swappedEdgeLength = calculateTotalEdgeLength(closestNode.x, closestNode.y, rectangles, rect_neighbors, rect.name) +
    //                                       calculateTotalEdgeLength(rect.x, rect.y, rectangles, rect_neighbors, closestNode.name);
    //             const gain = originalEdgeLength - swappedEdgeLength;
  
    //             if (gain > 0 && isPlaceable(grid, closestNode.x, closestNode.y, rect.width, rect.height)) {
    //                 // Remove the original values from the grid
    //                 placeRectangle(grid, rect.x, rect.y, rect.width, rect.height, 0);
    //                 placeRectangle(grid, closestNode.x, closestNode.y, closestNode.width, closestNode.height, 0);
    //                 // Swap the nodes
    //                 let temp_x = rect.x;
    //                 let temp_y = rect.y;
  
    //                 rect.x = closestNode.x;
    //                 rect.y = closestNode.y;
  
    //                 closestNode.x = temp_x;
    //                 closestNode.y = temp_y;
  
    //                 // Swap the nodes
    //                 // [rect.x, closestNode.x] = [closestNode.x, rect.x];
    //                 // [rect.y, closestNode.y] = [closestNode.y, rect.y];
  
    //                 // Add the new values to the grid
    //                 placeRectangle(grid, rect.x, rect.y, rect.width, rect.height, 1);
    //                 placeRectangle(grid, closestNode.x, closestNode.y, closestNode.width, closestNode.height, 1);
    //             }
    //       }
    //     }
  
    // });
    //     visibilityGraph = generateVisibilityGraph(rectangles);
    //     if (iterationCount % 9 === 0) {
    //       let alpha = Math.max(1,Math.floor(1+2*(iterationCount-i-30)/0.5*iterationCount))
    //       compactedNodes = compact(visibilityGraph, inLinks, bboxWidth,bboxHeight, 20, alpha,compactionDir,false);
    //       compactionDir = !compactionDir;
    //     }
    //     tempInitial *= coolingRate;
    // }
  
    // console.log(grid.map(row => row.join(' ')).join('\n'));
  
    let rectangleCoordinates: [number, number, number, number, string][] = [];
    compactedNodes.forEach((rect) => {
      const x = rect.x + originX;
      const y = rect.y + originY;
      const width = rect.width;
      const height = rect.height;
      const name = rect.name;
      rectangleCoordinates.push([x, y, width, height, name]);
    });
    return rectangleCoordinates;
  }
  function compact(
    grid,
    visibilityGraph,
    inLinks,
    bboxWidth,
    bboxHeight,
    iterations = 10,
    alpha = 3,
    compactionDir: boolean,
    expandFactor: boolean,
  ) {
    const { nodes, edges } = visibilityGraph; //edges-> S
    // console.log({nodes,edges})
    // console.log({inLinks})
    // const alpha = 1; // Coefficient to define the minimum space between nodes
  
    // // Function to calculate the objective value
    function calculateObjective(nodes) {
      let objectiveValue = 0;
      edges.forEach((edge) => {
        const sourceNode = nodes.find((node) => node.name === edge.source);
        const targetNode = nodes.find((node) => node.name === edge.target);
  
        if (sourceNode && targetNode) {
          const sourceCenterX =
            sourceNode.x +
            0.5 *
              (compactionDir
                ? expandFactor
                  ? sourceNode.width
                  : 1
                : expandFactor
                  ? sourceNode.height
                  : 1);
          const targetCenterX =
            targetNode.x +
            0.5 *
              (compactionDir
                ? expandFactor
                  ? targetNode.width
                  : 1
                : expandFactor
                  ? targetNode.height
                  : 1);
          objectiveValue += Math.pow(sourceCenterX - targetCenterX, 2);
        }
      });
      return objectiveValue;
    }
  
    // // Function to check if constraints are satisfied
  
    let bestNodes: any | undefined = undefined;
    let bestObjective = calculateObjective(nodes); // Calculate the initial objective value for all edge in S
  
    // Try random positions
    // for (let i = 0; i < iterations; i++) {
    //     let newNodes = nodes
  
    //     newNodes.forEach(node => {
    //       if (compactionDir) {
    //         node.x = clamp(Math.floor(Math.random() * (bboxWidth - (expandFactor ? node.width : 1) + 1)), 0, bboxWidth - (expandFactor ? node.width : 1));
    //         node.y = node.y
    //       } else {
    //         node.x = node.x
    //         node.y = clamp(Math.floor(Math.random() * (bboxHeight - (expandFactor ? node.height : 1) + 1)), 0, bboxHeight - (expandFactor ? node.height : 1));
    //       }
    //     });
  
    //     if (areConstraintsSatisfied(nodes)) {
    //         const newObjective = calculateObjective(newNodes);
    //         if (newObjective < bestObjective) {
    //             bestNodes = newNodes;
    //             bestObjective = newObjective;
    //         }
    //     }
    // }
  
    function getRandomPosition(node) {
      if (compactionDir) {
        const x = clamp(
          Math.floor(
            Math.random() * (bboxWidth - (expandFactor ? node.width : 1) + 1),
          ),
          0,
          bboxWidth - (expandFactor ? node.width : 1),
        );
        return x;
      } else {
        const y = clamp(
          Math.floor(
            Math.random() * (bboxHeight - (expandFactor ? node.height : 1) + 1),
          ),
          0,
          bboxHeight - (expandFactor ? node.height : 1),
        );
        return y;
      }
    }
  
    function generatePositionsForAllNodes(nodes) {
      const positions = [];
      for (let i = 0; i < 10; i++) {
        const group = {};
        nodes.forEach((node) => {
          group[node.name] = getRandomPosition(node);
        });
        positions.push(group);
      }
      return positions;
    }
  
    function checkEdges(positions, edges, expandFactor = 1, alpha = 1) {
      return positions.filter((group) => {
        return edges.every((edge) => {
          const sourceNodePos = group[edge.source];
          const targetNodePos = group[edge.target];
          const offset = compactionDir
            ? nodes.find((n) => n.name === edge.source).width
            : nodes.find((n) => n.name === edge.source).height;
          if (sourceNodePos && targetNodePos) {
            const sourceEdge = sourceNodePos + (expandFactor ? offset : 1);
            const targetEdge = targetNodePos;
            const dij = alpha * (expandFactor ? offset : 1);
            return targetEdge - sourceEdge >= dij;
          }
          return false;
        });
      });
    }
  
    const positions = generatePositionsForAllNodes(nodes);
    // console.log(positions);
    const newPositions = checkEdges(positions, edges);
    // console.log('Filtered Positions:', newPositions);
  
    // // Update the positions of the original nodes with the best found positions
    // bestNodes.forEach(bestNode => {
    //     const originalNode = nodes.find(node => node.name === bestNode.name);
    //     const temp_x = originalNode.x;
    //     const temp_y = originalNode.y;
    //     // console.log("original position",originalNode.name,temp_x,temp_y)
    //     // console.log("best node position",bestNode.x,bestNode.y)
  
    //     if (originalNode) {
    //         // console.log("before remove:\n",grid.map(row => row.join(' ')).join('\n'));
    //         // console.log("temp_x",temp_x)
    //         placeRectangle(grid, temp_x, temp_y, 1, 1, 0);
    //         // console.log("after remove:\n",grid.map(row => row.join(' ')).join('\n'));
    //         if (compactionDir) {
    //           originalNode.x = bestNode.x;
    //           // console.log("before place new x:\n",grid.map(row => row.join(' ')).join('\n'));
    //           placeRectangle(grid, bestNode.x, temp_y, 1, 1, 1);
    //           // console.log("after place new x:\n",grid.map(row => row.join(' ')).join('\n'));
    //         } else {
    //           originalNode.y = bestNode.y;
    //           // console.log("before place new y:\n",grid.map(row => row.join(' ')).join('\n'));
    //           placeRectangle(grid, temp_x, bestNode.y, 1, 1, 1);
    //           // console.log("after place new y:\n",grid.map(row => row.join(' ')).join('\n'));
    //         }
    //     }
    // });
  
    // return bestNodes;
    return nodes;
  }
  function generateVisibilityGraph(rectangles) {
    const visibilityGraph = {
      nodes: rectangles,
      edges: [],
    };
  
    // Iterate through each rectangle to determine visibility edges
    for (let i = 0; i < rectangles.length; i++) {
      const rectA = rectangles[i];
  
      for (let j = 0; j < rectangles.length; j++) {
        if (i === j) continue;
  
        const rectB = rectangles[j];
  
        // Ensure rectB is to the right of rectA
        if (
          rectB.x > rectA.x &&
          isHorizontallyVisible(rectA, rectB, rectangles)
        ) {
          visibilityGraph.edges.push({
            source: rectA.name,
            target: rectB.name,
          });
        }
      }
    }
  
    return visibilityGraph;
  }
  
  function isHorizontallyVisible(rectA, rectB, rectangles) {
    // Check if a horizontal line segment from the right edge of rectA to the left edge of rectB
    // intersects any other rectangle
    const rightEdgeA = rectA.x + rectA.width;
    const leftEdgeB = rectB.x;
  
    for (const rect of rectangles) {
      if (rect === rectA || rect === rectB) continue;
  
      const rightEdge = rect.x + rect.width;
      const leftEdge = rect.x;
  
      if (
        leftEdge > rightEdgeA &&
        rightEdge < leftEdgeB &&
        intersects(rectA.y, rectA.y + rectA.height, rect.y, rect.y + rect.height)
      ) {
        return false;
      }
    }
  
    return true;
  }
  
  function intersects(a1, a2, b1, b2) {
    return Math.max(a1, b1) < Math.min(a2, b2);
  }
  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
  
  function MDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }
  function findClosestPlace(
    grid: number[][],
    x: number,
    y: number,
    width: number,
    height: number,
    rectangles,
    rect_neighbors,
    rectName: string,
  ) {
    // let closestX = x;
    // let closestY = y;
    let minDistance = Infinity;
  
    for (let i = 0; i < grid.length; i++) {
      //width
      for (let j = 0; j < grid[i].length; j++) {
        //height
        if (isPlaceable(grid, i, j, width, height)) {
          const distance = MDistance(x, y, i, j);
          if (distance < minDistance) {
            minDistance = distance; //d
            // closestX = i;
            // closestY = j;
          }
        }
      }
    }
    // Check all cells within Manhattan distance d + 1 from (x,y)
    const bestPosition = PositionWithinD1(
      grid,
      x,
      y,
      minDistance + 1,
      width,
      height,
      rectangles,
      rect_neighbors,
      rectName,
    );
    return bestPosition;
  }
  
  function PositionWithinD1(
    grid: number[][],
    x: number,
    y: number,
    maxDistance: number,
    width: number,
    height: number,
    rectangles,
    rect_neighbors,
    rectName: string,
  ) {
    let bestX = x;
    let bestY = y;
    let minEdgeLength = Infinity;
  
    for (
      let i = Math.max(0, x - maxDistance);
      i < Math.min(grid.length, x + maxDistance + 1);
      i++
    ) {
      for (
        let j = Math.max(0, y - maxDistance);
        j < Math.min(grid[0].length, y + maxDistance + 1);
        j++
      ) {
        if (
          MDistance(x, y, i, j) <= maxDistance &&
          isPlaceable(grid, i, j, width, height)
        ) {
          //check if sized rect with new position is placeable
          const edgeLength = calculateTotalEdgeLength(
            i,
            j,
            rectangles,
            rect_neighbors,
            rectName,
          ); // Use the distance function (2)
          if (edgeLength < minEdgeLength) {
            minEdgeLength = edgeLength;
            bestX = i;
            bestY = j;
          }
        }
      }
    }
  
    return {
      bestX,
      bestY,
    };
  }
  function calculateTotalEdgeLength(
    x: number,
    y: number,
    rectangles,
    rect_neighbors,
    rectName: string,
  ): number {
    // Find the current rectangle
    const currentRect = rectangles.find((rect) => rect.name === rectName);
  
    if (!currentRect) return 0;
    if (!rect_neighbors) return 0;
  
    // extract neighbor information from global rectangles
    const neighborRects = rect_neighbors
      .map((name) => rectangles.find((rect) => rect.name === name))
      .filter(Boolean);
  
    let totalEdgeLength = 0;
  
    neighborRects.forEach((neighborRect) => {
      const sourceCenterX = x + 0.5 * currentRect.width;
      const sourceCenterY = y + 0.5 * currentRect.height;
      const targetCenterX = neighborRect.x + 0.5 * neighborRect.width;
      const targetCenterY = neighborRect.y + 0.5 * neighborRect.height;
  
      const euclideanDistance = Math.sqrt(
        Math.pow(targetCenterX - sourceCenterX, 2) +
          Math.pow(targetCenterY - sourceCenterY, 2),
      );
  
      const alignmentTerm =
        (1 / 20) *
        Math.min(
          Math.abs(targetCenterX - sourceCenterX) /
            (currentRect.width + neighborRect.width),
          Math.abs(targetCenterY - sourceCenterY) /
            (currentRect.height + neighborRect.height),
        );
  
      totalEdgeLength += euclideanDistance + alignmentTerm;
    });
  
    return totalEdgeLength;
  }
  function neighborsMedian(rectangles, currentRectName, neighbors) {
    const currentRect = rectangles.find((rect) => rect.name === currentRectName); //name,width,height,x,y
    const neighborRects = neighbors
      .map((name) => rectangles.find((rect) => rect.name === name))
      .filter(Boolean);
    if (neighbors.length === 0) {
      // if no neighbors, return the position of the current rectangle
      return { medianX: currentRect.x!, medianY: currentRect.y! };
    }
    const xPositions = neighborRects.map((neighbor) => neighbor.x!); //x position of all neighbors
    const yPositions = neighborRects.map((neighbor) => neighbor.y!); //y position of all neighbors
  
    const medianX = median(xPositions);
    const medianY = median(yPositions);
    return { medianX, medianY };
  }
  
  function median(values) {
    if (values.length === 0) return 0;
    values.sort((a, b) => a - b);
    const half = Math.floor(values.length / 2);
  
    if (values.length % 2) {
      return values[half];
    } else {
      return (values[half - 1] + values[half]) / 2.0;
    }
  }
  function isPlaceable(grid, x, y, width, height) {
    if (y + height >= grid[0].length || x + width >= grid.length) return false;
    for (let i = x; i < x + width; i++) {
      for (let j = y; j < y + height; j++) {
        if (grid[i][j] !== 0) return false;
      }
    }
    return true;
  }
  
  function placeRectangle(grid, x, y, width, height, value: number) {
    for (let i = x; i < x + width; i++) {
      for (let j = y; j < y + height; j++) {
        grid[i][j] = value;
      }
    }
    return grid;
  }