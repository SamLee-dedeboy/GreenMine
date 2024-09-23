<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { fade, slide } from "svelte/transition";
  import type { tPrompt } from "lib/types";
  export let data: tPrompt;
  const dispatch = createEventDispatcher();
  let show_prompts = true;

  function highlight_variables(text: string) {
    // replace ${var} with <span class="bg-yellow-200">${var}</span>
    return text.replace(
      /\${(.*?)}/g,
      '<span class="text-yellow-600" contenteditable=false>${$1}</span>',
    );
  }

  onMount(() => {});
</script>

<div class="">
  <div class="flex flex-col px-1">
    <div class="entry-trigger font-serif">
      <span> Prompts </span>
    </div>
  </div>
  {#if show_prompts}
    <div transition:slide class="divide-y text-sm">
      {#each data.system_prompt_blocks as [block_name, block_content], index}
        <div class="flex divide-x">
          <div class="w-[5rem] shrink-0 pr-2 capitalize italic text-gray-600">
            {block_name}
          </div>
          <div
            class="grow pl-2 text-left text-sm italic text-gray-500"
            contenteditable
            on:blur={function () {
              this.innerHTML = highlight_variables(this.innerHTML);
            }}
          >
            {@html highlight_variables(block_content)}
          </div>
        </div>
      {/each}
    </div>
    <div transition:slide class="divide-y border-t text-sm">
      {#each data.user_prompt_blocks as [block_name, block_content], index}
        <div class="flex divide-x">
          <div class="w-[5rem] shrink-0 pr-2 capitalize italic text-gray-600">
            {block_name}
          </div>
          <div
            class="grow pl-2 text-left text-sm italic text-gray-500"
            contenteditable
            on:blur={function () {
              this.innerHTML = highlight_variables(this.innerHTML);
            }}
          >
            {@html highlight_variables(block_content)}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="postcss">
  .entry-trigger {
    @apply rounded-sm bg-gray-200 text-gray-700 outline-double outline-1 outline-gray-600;
  }
</style>
