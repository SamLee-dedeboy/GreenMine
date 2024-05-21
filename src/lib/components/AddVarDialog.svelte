<script lang="ts">
  import { createDialog, melt } from "@melt-ui/svelte";
  import { createEventDispatcher } from "svelte";
  import { server_address } from "lib/constants";
  const dispatch = createEventDispatcher();
  import { fade } from "svelte/transition";
  import Selection from "lib/components/Selection.svelte";
  import * as Constants from "lib/constants";
  import { getContext } from "svelte";
  export let default_var_type: string = "";
  const fetchData: any = getContext("fetchData");
  let var_type: string = default_var_type;
  let var_name: string | undefined;
  let var_definition: string | undefined;
  let factor_type: string = "social";

  $: input_valid = var_type && var_name && var_definition;
  function handleExtract(e) {
    e.preventDefault();
    console.log({ var_type, var_name, var_definition, factor_type });
    // fetch data from backend
    fetch(server_address + "/var_extraction/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        var_type,
        var_name,
        var_definition,
        factor_type,
      }),
    }).then((res) => {
      console.log({ res });
      dispatch("close");
      fetchData();
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
      Add Variable
    </h2>
    <p use:melt={$description} class="mb-5 mt-2 leading-normal text-zinc-600">
      Add a new variable here. The system will automatically extract the
      variable for you. Click save when you're done.
    </p>
    <div class="inputs-container flex flex-col gap-y-2">
      <div class="flex items-center gap-x-2 font-mono">
        <div>Variable Type:</div>
        <Selection
          options={Constants.var_type_names}
          bind:selected_label={var_type}
        ></Selection>
      </div>
      <div class="flex items-center gap-x-2 font-mono">
        <div>Variable Name:</div>
        <input
          class="rounded-sm px-1 text-sm shadow-sm outline outline-1 outline-gray-200"
          on:input={(e) => {
            var_name = e.target.value;
          }}
        />
      </div>
      <div class="flex gap-x-2 font-mono">
        <div>Variable Definition:</div>
        <div
          contenteditable
          class="flex min-h-[1rem] w-1 grow flex-wrap break-words rounded-sm px-1 text-sm shadow-sm outline outline-1 outline-gray-200"
          on:input={(e) => {
            var_definition = e.target.innerText.trim();
          }}
        ></div>
      </div>
      <div class="flex items-center gap-x-2 font-mono">
        <div>Factor Type:</div>
        <div class="flex items-center gap-x-2">
          <div
            role="button"
            tabindex="0"
            class="flex gap-x-1 rounded-sm px-1 py-0.5 hover:bg-green-200"
            class:selected={factor_type === "social"}
            on:click={(e) => {
              e.preventDefault();
              factor_type = "social";
            }}
            on:keyup={() => {}}
          >
            <img src="social.svg" alt="*" />
            Social
          </div>
          <div
            role="button"
            tabindex="0"
            class="flex gap-x-1 rounded-sm px-1 py-0.5 hover:bg-green-200"
            class:selected={factor_type === "ecological"}
            on:click={(e) => {
              e.preventDefault();
              factor_type = "ecological";
            }}
            on:keyup={() => {}}
          >
            <img src="ecological.svg" alt="*" />
            Ecological
          </div>
        </div>
      </div>
    </div>
    <div class="mt-6 flex justify-end gap-4">
      <button
        use:melt={$close}
        class="inline-flex h-8 items-center justify-center rounded-sm
                    bg-zinc-100
                    px-4 font-medium leading-none text-zinc-600 hover:bg-zinc-200"
        on:click={() => dispatch("close")}
      >
        Cancel
      </button>
      <button
        class="text-magnum-900 inline-flex h-8 items-center justify-center
                    rounded-sm
                    bg-orange-100 px-4 font-medium leading-none hover:bg-orange-200"
        class:disabled={!input_valid}
        on:click={(e) => handleExtract(e)}
      >
        Extract
      </button>
    </div>
    <button
      use:melt={$close}
      aria-label="close"
      class="text-magnum-800 focus:shadow-magnum-400 absolute right-4 top-4 inline-flex h-6
                w-6 appearance-none items-center justify-center rounded-full
                p-1 hover:bg-zinc-200"
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
    @apply bg-green-200;
  }
  .disabled {
    @apply pointer-events-none opacity-50;
  }
</style>
