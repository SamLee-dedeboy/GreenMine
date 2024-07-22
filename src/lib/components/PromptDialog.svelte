<script lang="ts">
  import { createDialog, melt } from "@melt-ui/svelte";
  import { createEventDispatcher } from "svelte";
  import { server_address } from "lib/constants";
  const dispatch = createEventDispatcher();
  import { fade } from "svelte/transition";
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
      Prompt Viewer
    </h2>
    <p use:melt={$description} class="mb-5 mt-2 leading-normal text-zinc-600">
      Some Description
    </p>
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
