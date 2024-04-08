import * as d3 from "d3"

export const categoricalColors = [
    "#8dd3c7",
    "#ffffb3",
    "#bebada",
    "#fb8072",
    "#80b1d3",
    "#fdb462",
    "#b3de69",
    "#fccde5",
    "#d9d9d9",
    "#bc80bd",
    "#ccebc5",
    "#ffed6f",
    "#1f78b4",
    "#33a02c",
    "#e31a1c",
    "#ff7f00",
    "#6a3d9a",
    "#b15928",
    "#a6cee3",
    "#b2df8a",
    "#fb9a99",
    "#fdbf6f",
  ];

export const emotions = ["Proud", "Resigned", "Angry", "Worried", "Neutral"];
export const emotionColorScale = d3
    .scaleOrdinal()
    .domain(emotions)
    .range([
      "#fdb66e", // proud
      "#c5d0fb", // resigned
      "#ff5e5e", // anger
      "#fbd4f7", // worried
      "#eeeeee", // neutral
    ]);

// export const emotionColorScale = d3
//     .scaleOrdinal()
//     .domain([
//       "Happiness",
//       "Sadness",
//       "Fear",
//       "Disgust",
//       "Anger",
//       "Surprise",
//       "Neutral",
//     ])
//     .range([
//       "#ff8000", // happy
//       "#839af2", // sad
//       "#ff70ef", // fear
//       "#89b348", // disgust
//       "#d20000", // anger
//       "#ffe87c", // surprise
//       "#eeeeee", // neutral
//     ]);