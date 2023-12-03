<script lang="ts">
  import { emotions, emotionColorScale } from "./Colors";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let selectedEmotion: string | undefined = undefined;

  const r = 7;
  const dx = 40;
  const dy = 30;
  const gap_y = 3 * r + 1.5;
</script>

<div class="w-full h-full flex items-cetner justify-center">
  <svg viewBox="0 0 150 150">
    {#each emotions as emotion, index}
      <rect
        role="button"
        tabindex={index}
        class="border hoverable"
        class:selectedEmotion={selectedEmotion === emotion}
        x={dx - 2 * r}
        y={dy - r + index * gap_y - r / 2}
        width="120"
        height={(6 / 2) * r}
        rx="5"
        fill="white"
        cursor="pointer"
        on:keyup={() => {
          if (selectedEmotion === emotion) selectedEmotion = undefined;
          else selectedEmotion = emotion;
          dispatch("selectEmotion", selectedEmotion);
        }}
        on:click={() => {
          if (selectedEmotion === emotion) selectedEmotion = undefined;
          else selectedEmotion = emotion;
          dispatch("selectEmotion", selectedEmotion);
        }}
      >
      </rect>
      <circle
        cx={dx}
        cy={dy + index * gap_y}
        {r}
        fill={emotionColorScale(emotion)}
        stroke="black"
        stroke-width="1"
        pointer-events="none"
      ></circle>
      <text
        x={dx + 2 * r}
        y={dy + index * gap_y + 1.5}
        font-size="0.9rem"
        text-anchor="center"
        pointer-events="none"
        dominant-baseline="middle">{emotion}</text
      >
    {/each}
  </svg>
</div>

<style>
  .shadow {
    box-shadow: 0 0 2px gray;
  }
  .border {
    filter: drop-shadow(0px 0px 2px #5d5d5d);
    stroke-width: 1;
    /* stroke:black;
    stroke-width: 1px; */
  }
  .selectedEmotion {
    fill: #d1d5db;
  }
</style>
