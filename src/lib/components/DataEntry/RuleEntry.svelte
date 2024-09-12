<script lang="ts">
  import { fade, slide } from "svelte/transition";
  import { createEventDispatcher, onMount } from "svelte";
  const dispatch = createEventDispatcher();

  // export let current_version: string;
  export let pipeline_ids: string[] = [];
  console.log(pipeline_ids);
  let show_rules = true;
  const validTypes = ["driver", "pressure", "state", "impact", "response"];
  function handleBlur(key: string, event: FocusEvent) {
  }

  function handleKeydown(key: string, event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      processInput(key, event.target as HTMLElement);
    } else if (event.key === "Escape") {
      (event.target as HTMLElement).blur();
    }
  }

  function handleInput(key: string, event: Event) {
  }

  function processInput(key: string, target: HTMLElement) {
    let inputText = target.textContent?.trim() || "";
    console.log("Input:", inputText);

    // Split the input by comma
    inputText = inputText.replace(/^\(|\)$/g, '').trim();
    const parts = inputText.split(",").map((part) => part.trim());

    if (parts.length !== 2) {
      alert("Invalid input format. Please use the format: ID, indicator");
      return;
    }

    const [rawId, rawIndicator] = parts;
    const id = rawId.toUpperCase();
    const indicator = rawIndicator.toLowerCase();

    console.log("Parsed:", { id, indicator });

    // Validate ID
    if (!pipeline_ids.includes(id)) {
      alert(`Invalid ID: ${id}. Please use one of the valid IDs.`);
      return;
    }

    // Validate indicator
    if (!validTypes.includes(indicator)) {
      alert(
        `Invalid indicator type: ${indicator}. Valid types are: ${validTypes.join(", ")}`,
      );
      return;
    }

    // If we've reached here, both ID and indicator are valid
    if (key === "add") {
      console.log("Adding:", { id, indicator });
      dispatch("add_var_type", { id, indicator });
    } else if (key === "remove") {
      console.log("Removing:", { id, indicator });
      dispatch("remove_var_type", { id, indicator });
    }

    // Clear the input after processing
    target.textContent = "";
  }

</script>

<div
  class="relative z-50 flex flex-col px-1"
  transition:fade={{
    duration: 100,
  }}
>
  <div class="flex flex-col ">
    <div
      tabindex="0"
      role="button"
      class="entry-trigger"
      on:click={() => (show_rules = !show_rules)}
      on:keyup={() => {}}
    >
      Rules (Snippet, Indicators)
    </div>
    {#if show_rules}
      <div transition:slide class="text-sm">
        <div class="flex flex-col divide-y">
            <div class="flex divide-x">
            <div class="w-[5rem] shrink-0 pr-2 capitalize italic text-gray-600">
                Add
            </div>
            <div
                class="grow pl-2 text-left italic text-gray-500"
                contenteditable
                role="textbox"
                tabindex="0"
                aria-label="Enter var type"
                on:input={(event) => handleInput("add", event)}
                on:keydown={(event) => handleKeydown("add", event)}
                on:blur={(event) => handleBlur("add", event)}
            ></div>
            </div>
            <div class="flex divide-x">
            <div class="w-[5rem] shrink-0 pr-2 capitalize italic text-gray-600">
                Remove
            </div>
            <div
                class="grow pl-2 text-left italic text-gray-500"
                contenteditable
                role="textbox"
                tabindex="0"
                aria-label="Enter var type"
                on:input={(event) => handleInput("remove", event)}
                on:keydown={(event) => handleKeydown("remove", event)}
                on:blur={(event) => handleBlur("remove", event)}
            ></div>
            </div>
            <div class="flex flex-wrap justify-center gap-2">
            <button
                class="my-1 capitalize inline-flex items-center px-5 py-0.5 justify-center rounded-sm bg-green-200 outline outline-1 outline-gray-300 hover:bg-green-300"
                on:click={() => dispatch("base_or_new_button_click")}
            >
                update rules
            </button>
            </div>
            <div class="flex grow divide-x ">
                <div class="w-[5rem] shrink-0 pr-2 capitalize italic text-gray-600">
                Log
                </div>
                <div
                class="flex grow pl-2 text-left italic text-gray-500 overflow-y-scroll h-[6.5rem]"
                >
                (TO DO) These changes will create a scrollable log area that fills the remaining vertical space after the "Add", "Remove", and "Update Rules" sections. The log will automatically scroll when new entries are added and the content exceeds the available space. The log will automatically scroll when new entries are added and the content exceeds the available space.
                </div>
            </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style lang="postcss">
  .active {
    @apply bg-green-300;
    transition: all 0.5s;
  }
  .selected {
    @apply bg-blue-700 opacity-100;
  }
  .entry-trigger {
    @apply rounded-sm bg-gray-200 text-gray-700 outline-double outline-1 outline-gray-600 hover:bg-gray-300;
  }
</style>
