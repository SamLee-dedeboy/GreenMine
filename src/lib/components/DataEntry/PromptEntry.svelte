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
  function updateBlockContent(key: string, index: number, newContent: string) {
    const plainText = newContent.replace(/<[^>]*>/g, "").trim();
    data[key + "_prompt_blocks"][index][1] = plainText;
    data = { ...data }; // Trigger reactivity
  }
  function handleSavePrompt(updatedData: tPrompt) {
    dispatch("save", { type: "prompt", data: updatedData });
  }
</script>

<div class="">
  <div class="relative flex flex-col px-1">
    <div
      tabindex="0"
      role="button"
      on:click={() => (show_prompts = !show_prompts)}
      on:keyup={() => {}}
      class="entry-trigger font-serif"
    >
      <span> Prompts </span>
    </div>
    <div
      role="button"
      tabindex="0"
      class="absolute right-2 top-0.5 flex items-center justify-center rounded-sm normal-case italic leading-3 text-gray-600 outline-double outline-1 outline-gray-300 hover:bg-gray-400"
      on:mouseover={(e) => {
        e.preventDefault();
      }}
      on:focus={(e) => {
        e.preventDefault();
      }}
      on:click={(e) => {
        e.preventDefault();
        handleSavePrompt(data);
      }}
      on:keyup={() => {}}
    >
      <img src="save.svg" alt="" class="h-5 w-5" />
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
            on:blur={function (e) {
              updateBlockContent("system", index, e.target.innerHTML);
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
            on:blur={function (e) {
              updateBlockContent("user", index, e.target.innerHTML);
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
    @apply rounded-sm bg-gray-200 text-gray-700 outline-double outline-1 outline-gray-600 hover:bg-gray-300;
  }
</style>
