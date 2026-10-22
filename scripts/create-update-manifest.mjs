import { readFile, writeFile, access } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

const archiveName = "Key-Aquarium-macOS-universal.app.tar.gz";

/** 为两个 macOS 架构生成同一份通用签名包索引，固定使用版本化下载地址。 */
export function createUpdateManifest(version, signature, date = new Date().toISOString()) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("发布版本必须为正式语义版本号");
  if (!signature.trim() || !/^[A-Za-z0-9+/=\s]+$/.test(signature)) throw new Error("缺少有效的 Tauri 签名内容");
  const artifact = {
    url: `https://github.com/zJaming/key-aquarium/releases/download/v${version}/${archiveName}`,
    signature: signature.trim(),
  };
  return {
    version,
    notes: "See the GitHub Release for version notes.",
    pub_date: date,
    platforms: { "darwin-aarch64": artifact, "darwin-x86_64": artifact },
  };
}

/** 从发布目录读取真实包和签名，拒绝为缺失产物生成可发布索引。 */
async function main() {
  if (!process.argv[2]) throw new Error("用法：pnpm release:manifest <发布目录>");
  const directory = resolve(process.argv[2]);
  const packageInfo = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  await access(join(directory, archiveName));
  const signature = await readFile(join(directory, `${archiveName}.sig`), "utf8");
  const manifest = createUpdateManifest(packageInfo.version, signature);
  await writeFile(join(directory, "latest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`已生成 v${packageInfo.version} 的双架构更新索引`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
