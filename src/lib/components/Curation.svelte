<script lang="ts">
  import { createDialog, melt } from "@melt-ui/svelte";
  import { var_type_names } from "lib/constants";
  import { fade } from "svelte/transition";
  import AddVarDialog from "./AddVarDialog.svelte";
  let open_add_dialog: boolean = false;
</script>

<div
  class="curation-container min-w-[10rem] flex flex-col gap-y-1 outline outline-1 outline-gray-200 bg-amber-50 p-2 rounded-sm"
>
  <div
    class="curation-header w-full border-solid border-b border-gray-200 flex"
  >
    Utilities
  </div>
  <div
    role="button"
    tabindex="0"
    class="text-xs w-fit bg-green-100 hover:bg-green-200 py-0.5 px-1 outline outline-1 outline-green-200 rounded"
    on:click={(e) => {
      e.preventDefault();
      open_add_dialog = true;
    }}
    on:keyup={() => {}}
  >
    Add Variable
  </div>
</div>
{#if open_add_dialog}
  <AddVarDialog on:close={() => (open_add_dialog = false)}></AddVarDialog>
{/if}

<style lang="postcss">
</style>
