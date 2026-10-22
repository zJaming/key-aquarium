import { test } from "node:test";
import assert from "node:assert/strict";
import { createUpdateManifest } from "./create-update-manifest.mjs";

/** 防止索引引用 latest 下载地址而在下个版本发布后漂移。 */
test("两个架构引用固定版本的通用更新包，并嵌入签名内容", () => {
  const manifest = createUpdateManifest("0.1.2", "YWJjZA==\n", "2026-10-22T08:00:00Z");
  assert.equal(manifest.platforms["darwin-aarch64"].url, "https://github.com/zJaming/key-aquarium/releases/download/v0.1.2/Key-Aquarium-macOS-universal.app.tar.gz");
  assert.deepEqual(manifest.platforms["darwin-aarch64"], manifest.platforms["darwin-x86_64"]);
  assert.equal(manifest.platforms["darwin-aarch64"].signature, "YWJjZA==");
});

/** 无签名或包含路径字符的版本不能进入发布索引。 */
test("拒绝空签名、签名文件名和异常版本号", () => {
  assert.throws(() => createUpdateManifest("0.1.2", ""));
  assert.throws(() => createUpdateManifest("0.1.2", "archive.sig"));
  assert.throws(() => createUpdateManifest("../latest", "YWJjZA=="));
});
