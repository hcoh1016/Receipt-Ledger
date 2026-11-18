// Prefer a detailed receipt image while keeping it within the OCR resource limit.
export function choosePictureSize(sizes:string[]):string|undefined {
  const valid=sizes.map(size=>{const match=/^(\d+)x(\d+)$/.exec(size);return {size,pixels:match?Number(match[1])*Number(match[2]):0};}).filter(v=>v.pixels>0&&v.pixels<=20_000_000).sort((a,b)=>b.pixels-a.pixels);
  return (valid.find(v=>v.pixels<=12_000_000)??valid[valid.length-1])?.size;
}
