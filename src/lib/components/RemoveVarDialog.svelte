<script lang="ts">
  import { createDialog, melt } from "@melt-ui/svelte";
  import { createEventDispatcher } from "svelte";
  import { server_address } from "lib/constants";
  const dispatch = createEventDispatcher();
  import { fade } from "svelte/transition";
  import Selection from "lib/components/Selection.svelte";
  import * as Constants from "lib/constants";
  import { getContext } from "svelte";
  import { varTypeColorScale } from "lib/store";
  export let var_type: string = "";
  export let var_name_options: string[];
  const fetchData: any = getContext("fetchData");
  let var_names: string[] = [];
  function handleRemove(e) {
    e.preventDefault();
    console.log({ var_type, var_names });
    fetch(server_address + "/curation/remove/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        var_type,
        var_names,
      }),
    }).then((res) => {
      console.log({ res });
      fetchData();
      dispatch("close");
    });
  }

  const {
    elements: {
      trigger,
      overlay,
      content,
      title,
      description,
      close,
      portalled,
    },
  } = createDialog({
    forceVisible: true,
  });
</script>

<div class="" use:melt={$portalled}>
  <div
    use:melt={$overlay}
    class="fixed inset-0 z-50 bg-black/50"
    transition:fade={{ duration: 150 }}
  />
  <div
    class="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[90vw]
              max-w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white
              p-6 shadow-lg"
    transition:fade={{
      duration: 150,
    }}
    use:melt={$content}
  >
    <h2 use:melt={$title} class="m-0 text-lg font-medium text-black">
      Remove Variable
    </h2>
    <!-- <p use:melt={$description} class="mb-5 mt-2 leading-normal text-zinc-600">
        Remove a variable here. 
      </p> -->
    <div class="inputs-container flex flex-col gap-y-2">
      <div class="flex gap-x-2 items-center font-mono">
        <div>
          Variable Type:
          <span class="capitalize">
            {var_type}
          </span>
        </div>
      </div>
      <div class="flex gap-x-2 gap-y-1 items-center font-mono flex-wrap">
        {#each var_name_options as var_name}
          <div
            role="button"
            tabindex="0"
            class="flex items-center font-mono outline outline-1 outline-gray-200
                       hover:bg-red-200 hover:outline-2 hover:outline-black
                        px-1 py-0.5 text-magnum-700
                      rounded shadow-md transition-opacity hover:opacity-90"
            on:click={() => {
              if (var_names.includes(var_name)) {
                var_names = var_names.filter((name) => name !== var_name);
              } else {
                var_names = [...var_names, var_name];
              }
            }}
            class:selected={var_names.includes(var_name)}
            on:keyup={() => {}}
          >
            {var_name}
          </div>
        {/each}
      </div>
    </div>
    <div class="mt-6 flex justify-end gap-4">
      <button
        use:melt={$close}
        class="inline-flex h-8 items-center justify-center rounded-sm
                      hover:bg-zinc-200
                      bg-zinc-100 px-4 font-medium leading-none text-zinc-600"
        on:click={() => dispatch("close")}
      >
        Cancel
      </button>
      <button
        class="inline-flex h-8 items-center justify-center rounded-sm
                      hover:bg-red-200
                      bg-red-100 px-4 font-medium leading-none text-magnum-900"
        class:disabled={var_names.length === 0}
        on:click={(e) => handleRemove(e)}
      >
        Submit
      </button>
    </div>
    <button
      use:melt={$close}
      aria-label="close"
      class="absolute right-4 top-4 inline-flex h-6 w-6 appearance-none
                  items-center justify-center rounded-full p-1 text-magnum-800
                  hover:bg-zinc-200 focus:shadow-magnum-400"
      on:click={() => dispatch("close")}
    >
      <img src="X.svg" alt="x" class="pointer-events-none" />
    </button>
  </div>
</div>

<style lang="postcss">
  [contenteditable="true"]:empty:before {
    content: attr(placeholder);
    pointer-events: none;
    display: block; /* For Firefox */
  }
  .selected {
    @apply bg-red-200;
  }
  .disabled {
    @apply pointer-events-none opacity-50;
  }
</style>
