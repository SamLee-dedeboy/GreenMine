<script lang="ts">
  import { fade, slide } from "svelte/transition";
  import { createEventDispatcher, onMount } from "svelte";
  const dispatch = createEventDispatcher();
  export let title: string = "Prompt Viewer";
</script>

<div
  class="relative z-50 flex flex-col px-1"
  transition:fade={{
    duration: 100,
  }}
>
  <h2 class="text-lg font-medium text-black">{title}</h2>
  <div class="flex flex-col gap-y-1">
    <div class="flex">
      <div
        role="button"
        tabindex="0"
        class="flex-1 rounded-sm bg-green-200 outline outline-1 outline-gray-300 hover:bg-green-300"
        on:click={() => dispatch("run")}
        on:keyup={() => {}}
      >
        Run
      </div>
      <div
        role="button"
        tabindex="0"
        class="flex-1 rounded-sm bg-green-200 outline outline-1 outline-gray-300 hover:bg-green-300"
        on:click={() => dispatch("save")}
        on:keyup={() => {}}
      >
        Save
      </div>
    </div>
  </div>
</div>
