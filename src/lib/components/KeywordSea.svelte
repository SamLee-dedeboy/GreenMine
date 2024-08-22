<script lang="ts">
  import { KeyWordSea } from "lib/renderers/KeywordSea";
  import { varTypeColorScale } from "lib/store";
  import type { tKeywordData } from "lib/types";
  import { onMount } from "svelte";

  export let data: tKeywordData;
  export let key: string = "keyword";
  const svgId = `keyword-sea-${key}-svg`;
  const svgSize = { width: 800, height: 600 };
  const keyword_sea_renderer = new KeyWordSea();

  onMount(() => {
    console.log("keyword sea: ", { data });
    keyword_sea_renderer.init(svgId, svgSize.width, svgSize.height);
    keyword_sea_renderer.update_keywords(data, "tf_idf", 0.5);
  });
</script>

<div class="relative h-full w-full p-2">
  <div
    class="absolute left-2 top-0 w-fit rounded font-serif text-[2rem] font-bold capitalize"
    style={`color: ${$varTypeColorScale(key)}`}
  >
    {key}
  </div>
  <div
    class="tooltip pointer-events-none absolute h-fit w-fit rounded border border-black bg-white py-1 pl-0.5 pr-1 text-xs opacity-0"
  ></div>
  <svg id={svgId} viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}></svg>
</div>
