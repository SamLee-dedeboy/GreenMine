<script lang="ts">
  import AddVarDialog from "./AddVarDialog.svelte";
  import RemoveVarDialog from "./RemoveVarDialog.svelte";
  import type { tMetadata } from "lib/types";
  export let metadata: tMetadata;
  let open_add_dialog: boolean = false;
  let open_remove_dialog: boolean = false;
  let open_edit_dialog: boolean = false;
  let default_var_type: string = "";
  export function handleAddVar(_default_var_type: string) {
    default_var_type = _default_var_type;
    open_add_dialog = true;
  }
  export function handleRemoveVar(_default_var_type: string) {
    default_var_type = _default_var_type;
    open_remove_dialog = true;
  }
  export function handleEditVar(_default_var_type: string) {
    default_var_type = _default_var_type;
    open_edit_dialog = true;
  }
</script>

<!-- <div
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
</div> -->
{#if open_add_dialog}
  <AddVarDialog {default_var_type} on:close={() => (open_add_dialog = false)}
  ></AddVarDialog>
{/if}
{#if open_remove_dialog}
  <RemoveVarDialog
    var_type={default_var_type}
    var_name_options={Object.keys(metadata[default_var_type])}
    on:close={() => (open_remove_dialog = false)}
  ></RemoveVarDialog>
{/if}

<!-- {#if open_edit_dialog}
  <AddVarDialog on:close={() => (open_add_dialog = false)}></AddVarDialog>
{/if} -->

<style lang="postcss">
</style>
