<script lang="ts">
  import * as d3 from "d3";
  import { ScatterSummary } from "lib/components/ScatterSummary";
  import { onMount, tick } from "svelte";
  import * as Constants from "lib/constants";
  import { createSelect, melt } from "@melt-ui/svelte";
  import { fade } from "svelte/transition";
  import type {
    tMention,
    tVariableType,
    tTranscript,
    tLink,
    tServerData,
    tVariable,
    tChunk,
  } from "lib/types";

  export let id: string;
  export let summary_interviews: tChunk[] | undefined = undefined;

  let emotion_hidden = true;
  let topic_hidden = true;
  const svgId = {
    emotion: "scatter-svg-emotion",
    topic: "scatter-svg-topic",
  };

  // let selectedAttr: string  = "emotion";
  const paddings = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  };
  const width = 380;
  const height = 300;
  let emotion_scatter = new ScatterSummary(
    svgId.emotion,
    width,
    height,
    paddings,
    Constants.emotionColorScale,
    Constants.emotionname
  );
  let topic_scatter = new ScatterSummary(
    svgId.topic,
    width,
    height,
    paddings,
    Constants.topicColorScale,
    Constants.topicname
  );

  $: update_summary(summary_interviews);

  onMount(() => {
    // scattersummary.init(svgId.topic, width, height, paddings,"topic");
    emotion_scatter.init();
    topic_scatter.init();

  });

  async function update_summary(summary_interviews: tChunk[] | undefined) {
    await tick();
    // console.log({ summary_interviews });
    if (summary_interviews) {
      const emotion_data = summary_interviews.map((d) => {
        return {
          attr: d.emotion,
          x: 0,
          y: 0,
        };
      });
      const topic_data = summary_interviews.map((d) => {
        return {
          attr: d.topic,
          x: 0,
          y: 0,
        };
      });
      emotion_scatter.draw(emotion_data);
      topic_scatter.draw(topic_data);
    } else {
    }
  }
</script>

<div class="flex flex-col gap-x-1">
  <div id="svg-container-emotion" class="flex-1 flex flex-col px-0.5">
    <div
      role="button"
      tabindex="0"
      class="summary-header select-none hover:bg-gray-300"
      on:click={() => (emotion_hidden = !emotion_hidden)}
      on:keyup={() => {}}
    >
      Emotions
    </div>
    <svg
      id={svgId.emotion}
      class={`${emotion_hidden ? "hidden" : ""} w-full border border-gray-300 rounded p-2 text-sm`}
      viewBox="0 0 500 300"
    >
    </svg>
  </div>
  <div id="svg-container-topic" class="flex-1 flex flex-col px-0.5">
    <div
      role="button"
      tabindex="0"
      class="summary-header select-none hover:bg-gray-300"
      on:click={() => (topic_hidden = !topic_hidden)}
      on:keyup={() => {}}
    >
      Topics
    </div>
    <svg
      id={svgId.topic}
      class={`${topic_hidden ? "hidden" : ""} w-full border border-gray-300 rounded p-2 text-sm`}
      viewBox="0 0 500 300"
    >
    </svg>
  </div>
</div>

<style lang="postcss">
  .summary-header {
    @apply border border-gray-200 rounded shadow m-1 text-xl font-bold text-center flex items-center justify-center;
    font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  }

</style>
