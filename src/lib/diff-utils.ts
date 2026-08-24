export type DiffLine = { type: "added"|"removed"|"unchanged", text: string };
export function computeDiff(oldStr: string, newStr: string): DiffLine[] {
  if (oldStr === "" && newStr === "") return [];
  const a = oldStr ? oldStr.split("\n") : [], b = newStr ? newStr.split("\n") : [];
  const result: DiffLine[] = [];
  let i=0,j=0;
  while (i<a.length || j<b.length) {
    if (i>=a.length) result.push({type:"added", text:b[j++]});
    else if (j>=b.length) result.push({type:"removed", text:a[i++]});
    else if (a[i]===b[j]) { result.push({type:"unchanged", text:a[i]}); i++; j++; }
    else {
      // simple: cek next match
      const nextA = a.indexOf(b[j], i);
      const nextB = b.indexOf(a[i], j);
      if (nextA!==-1 && (nextB===-1 || nextA - i < nextB - j)) {
        result.push({type:"removed", text:a[i++]}); 
      } else if (nextB!==-1) {
        result.push({type:"added", text:b[j++]});
      } else {
        result.push({type:"removed", text:a[i++]}); result.push({type:"added", text:b[j++]});
      }
    }
  }
  return result;
}
