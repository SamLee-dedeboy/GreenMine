<script lang="ts">
  import { createDialog, melt } from "@melt-ui/svelte";
  import { createEventDispatcher, onMount } from "svelte";
  import { server_address } from "lib/constants";
  import { draggable } from "lib/utils/draggable";
  const dispatch = createEventDispatcher();
  import { fade, slide } from "svelte/transition";
  import type { tServerPipelineData, tServerPromptData } from "lib/types";
  export let data: tServerPromptData | undefined;
  export let tmp_data: tServerPipelineData | undefined;
  let show_var_type_definitions = true;
  let show_prompts = true;

  function highlight_variables(text: string) {
    // replace ${var} with <span class="bg-yellow-200">${var}</span>
    return text.replace(
      /\${(.*?)}/g,
      '<span class="text-yellow-600">${$1}</span>',
    );
  }

  onMount(() => {});
</script>

<div class="">
  <div
    class="relative z-50 flex
    max-h-[85vh] w-[90vw]
            max-w-[450px] flex-col
            bg-gray-100 px-1 shadow-lg"
    transition:fade={{
      duration: 100,
    }}
  >
    <h2 class="text-lg font-medium text-black">Prompt Viewer</h2>
    {#if data}
      <div class="flex flex-col gap-y-1">
        <div class="flex">
          <div
            role="button"
            tabindex="0"
            class="flex-1 rounded-sm bg-green-200 outline outline-1 outline-gray-300 hover:bg-green-300"
            on:click={() => dispatch("fetch_identify_var_types", data)}
            on:keyup={() => {}}
          >
            Run
          </div>
          <div
            role="button"
            tabindex="0"
            class="flex-1 rounded-sm bg-green-200 outline outline-1 outline-gray-300 hover:bg-green-300"
            on:click={() => dispatch("save_identify_var_types", tmp_data)}
            on:keyup={() => {}}
          >
            Save
          </div>
        </div>
        <div class="flex flex-col">
          <div
            tabindex="0"
            role="button"
            class="entry-trigger"
            on:click={() =>
              (show_var_type_definitions = !show_var_type_definitions)}
            on:keyup={() => {}}
          >
            Var Type Definitions
          </div>
          {#if show_var_type_definitions}
            <div
              transition:slide
              class="var-type-definition-content divide-y text-sm"
            >
              {#each Object.entries(data.var_type_definitions) as [var_type, definition], index}
                <div class="flex divide-x">
                  <div
                    class="w-[5rem] shrink-0 pr-2 capitalize italic text-gray-600"
                  >
                    {var_type}
                  </div>
                  <div
                    class="grow pl-2 text-left italic text-gray-500"
                    contenteditable
                  >
                    {definition}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
        <div class="flex flex-col">
          <div
            tabindex="0"
            role="button"
            class="entry-trigger"
            on:click={() => (show_prompts = !show_prompts)}
            on:keyup={() => {}}
          >
            Prompts
          </div>
          {#if show_prompts}
            <div transition:slide class="divide-y text-sm">
              {#each data.system_prompt_blocks as [block_name, block_content], index}
                <div class="flex divide-x">
                  <div
                    class="w-[5rem] shrink-0 pr-2 capitalize italic text-gray-600"
                  >
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
                  <div
                    class="w-[5rem] shrink-0 pr-2 capitalize italic text-gray-600"
                  >
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
      </div>
    {/if}
  </div>
</div>

<style lang="postcss">
  .entry-trigger {
    @apply rounded-sm bg-gray-200 text-gray-700 outline-double outline-1 outline-gray-600 hover:bg-gray-300;
  }
  .var-type-definition-container:focus {
    & .var-type-definition-content {
      display: block;
    }
  }
  [contenteditable="true"]:empty:before {
    content: attr(placeholder);
    pointer-events: none;
    display: block;
  }
  .selected {
    @apply bg-green-200;
  }
  .disabled {
    @apply pointer-events-none opacity-50;
  }
</style>
