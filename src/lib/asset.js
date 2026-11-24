// Public files live under the site's base path when it is hosted in a sub-folder (GitHub Pages serves /<repo>/).
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const asset = (p) => BASE + p;
