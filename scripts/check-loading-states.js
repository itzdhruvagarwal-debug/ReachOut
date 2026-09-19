const fs = require("fs");
const path = require("path");

function walk(dir) {
  let r = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) r = r.concat(walk(p));
    else if (f.endsWith(".tsx")) r.push(p);
  }
  return r;
}

const pages = walk("src/app");
for (const p of pages) {
  const c = fs.readFileSync(p, "utf-8");
  const rel = p.replace(/\\/g, "/");
  const hasSkeleton = c.includes("Skeleton");
  const hasSpinner = c.includes("Spinner");
  const hasCustomLoading = c.includes("Loading") || c.includes("isLoading") || c.includes("loading");

  if (hasCustomLoading) {
    console.log(`${rel}: Skeleton=${hasSkeleton}, Spinner=${hasSpinner}`);
  }
}
