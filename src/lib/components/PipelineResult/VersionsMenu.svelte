<script lang="ts">
  export let versions: string[] = [];
  export let current_version: string;
</script>

<div class="relative flex gap-x-1 px-1 pt-1 text-center font-medium text-black">
  <span class="mr-1 flex items-center font-serif"> Results: Version </span>
  {#each versions as version}
    <button
      class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-600 opacity-80 outline outline-[1.5px] outline-gray-400 hover:bg-green-200 hover:opacity-100"
      class:selected={version === current_version}
      on:click={() => (current_version = version)}
    >
      {+version.slice(1) + 1}
    </button>
  {/each}
</div>

<style lang="postcss">
  .selected {
    @apply bg-green-200 text-black opacity-100 shadow-md outline-2 outline-black;
  }
</style>
