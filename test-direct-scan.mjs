import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { FileSystemProjectRepository } from "./src/adapters/repositories/FileSystemProjectRepository.js";

const home = mkdtempSync("/tmp/atlas-test-");
const proj = join(home, "proj");
mkdirSync(join(proj, "manu"), { recursive: true });
writeFileSync(join(proj, "manu", ".STATUS"), "status: active\nkind: manuscript\ntarget: JASA\n");

const repo = new FileSystemProjectRepository("/tmp/test-projects-debug.json");
const projects = await repo.scan(proj, { useCache: false, forceRefresh: true });
console.log("Direct scan:", projects.length);
for (const p of projects) {
  console.log(" -", p.name, p.type.value, p.path);
}

rmSync(home, { recursive: true, force: true });