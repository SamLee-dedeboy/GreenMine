<script lang="ts">
  export let versions: string[] = [];
  export let selectedTitle: string;

  import { createEventDispatcher, onMount } from "svelte";
  const dispatch = createEventDispatcher();

  function handleTitleChange() {
    dispatch("title_change", selectedTitle);
  }

  $: selectedTitle, handleTitleChange();
</script>

<select
  bind:value={selectedTitle}
  class="text-center text-lg font-medium capitalize text-black"
>
  {#each versions as option}
    <option class="capitalize" value={option}>
      {`version ${option.slice(1)}`}</option
    >
  {/each}
</select>
