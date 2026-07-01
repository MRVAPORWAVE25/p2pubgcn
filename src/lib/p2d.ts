export type P2DFile = {
  version: 1;
  nickname?: string;
  avatar?: string;
  customSites?: Array<{ name: string; html: string }>;
  exportedAt: string;
};

const KEYS = {
  nick: "p2p_nick",
  avatar: "p2p_avatar",
  sites: "p2p_custom_sites",
};

export function readCustomSites(): Array<{ name: string; html: string }> {
  try {
    return JSON.parse(localStorage.getItem(KEYS.sites) ?? "[]");
  } catch {
    return [];
  }
}
export function writeCustomSites(sites: Array<{ name: string; html: string }>) {
  localStorage.setItem(KEYS.sites, JSON.stringify(sites));
}
export function addCustomSite(name: string, html: string) {
  const sites = readCustomSites();
  sites.push({ name, html });
  writeCustomSites(sites);
}

export function exportP2D(): P2DFile {
  return {
    version: 1,
    nickname: localStorage.getItem(KEYS.nick) ?? undefined,
    avatar: localStorage.getItem(KEYS.avatar) ?? undefined,
    customSites: readCustomSites(),
    exportedAt: new Date().toISOString(),
  };
}

export function downloadP2D() {
  const blob = new Blob([JSON.stringify(exportP2D(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `p2p-backup-${Date.now()}.p2d`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importP2DFile(file: File): Promise<P2DFile> {
  const text = await file.text();
  const data = JSON.parse(text) as P2DFile;
  if (data.version !== 1) throw new Error("Unsupported .p2d version");
  if (data.nickname) localStorage.setItem(KEYS.nick, data.nickname);
  if (data.avatar) localStorage.setItem(KEYS.avatar, data.avatar);
  if (Array.isArray(data.customSites)) writeCustomSites(data.customSites);
  return data;
}

export function downloadHtml(html: string, filename = "site.html") {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}