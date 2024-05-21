<script lang="ts">
  import { createSelect, melt } from "@melt-ui/svelte";
  import { fade } from "svelte/transition";
  import { writable } from "svelte/store";
  export let options;
  export let selected_label: string | undefined;
  let selected_label_store: any = writable(undefined);

  $: select_options = options.concat("None");
  $: selected_label_store.set({ value: selected_label, label: selected_label });
  selected_label_store.subscribe((value) => {
    if (value) selected_label = value.value;
  });
  const {
    elements: { trigger, menu, option, group, groupLabel, label },
    states: { open },
    helpers: { isSelected },
  } = createSelect<string>({
    selected: selected_label_store,
    forceVisible: true,
    positioning: {
      placement: "bottom",
      fitViewport: true,
      sameWidth: true,
      gutter: 2,
    },
  });
</script>

<div class="flex flex-col gap-1 font-mono">
  <button
    class="flex h-5 min-w-[7rem] w-fit items-center justify-center rounded bg-white hover:bg-gray-200 px-1 py-2
      text-magnum-700 capitalize shadow-md outline outline-1 outline-gray-200 transition-opacity hover:opacity-90"
    use:melt={$trigger}
    aria-label="select-trigger"
  >
    {$selected_label_store.label || "Select"}
  </button>
  {#if $open}
    <div
      class={`z-10 flex max-h-[7rem] flex-col text-sm
        overflow-y-auto bg-white p-1
        divide-y divide-neutral-200
        shadow-md focus:!ring-0
        `}
      use:melt={$menu}
      transition:fade={{ duration: 150 }}
    >
      {#each select_options as item}
        <div
          class="relative cursor-pointer px-0.5 py-1 text-center text-neutral-800
            capitalize
              hover:bg-gray-100 focus:z-10
              focus:text-gray-700
              data-[highlighted]:bg-magnum-200 data-[highlighted]:text-magnum-900
              data-[disabled]:opacity-50"
          class:checked={$isSelected(item)}
          use:melt={$option({
            value: item === "None" ? null : item,
            label: item,
          })}
        >
          {item}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="postcss">
  .checked {
    @apply bg-green-100;
  }
  .check {
    position: absolute;
    left: theme(spacing.2);
    top: 50%;
    z-index: theme(zIndex.20);
    translate: 0 calc(-50% + 1px);
  }
</style>
