import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "../.carousel-build/artifact-tool/dist/artifact_tool.mjs";

const workspaceDir = "/Users/arsalanahmed993/Documents/ChatGPT/CodeGraph";
const skillDir = "/Users/arsalanahmed993/.codex/plugins/cache/openai-primary-runtime/presentations/26.1015.12040/skills/presentations";
const buildDir = path.join(workspaceDir, ".carousel-build");
const outputDir = path.join(workspaceDir, "artifacts");
const finalPptx = path.join(outputDir, "codegraph-linkedin-carousel.pptx");
const finalPdf = path.join(outputDir, "codegraph-linkedin-carousel.pdf");
const fontFamily = "Aptos";
const W = 1080;
const H = 1350;
const C = { bg: "0A0E17", panel: "121A29", text: "F2F6FC", muted: "9AA7BA", blue: "79A9FF", cyan: "5DE0C6", purple: "AE8CFF", green: "72E2AD", line: "26334A" };

await fs.mkdir(buildDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });

async function bytes(file) {
  const data = await fs.readFile(file);
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}
async function writeBlob(file, blob) {
  await fs.writeFile(file, new Uint8Array(await blob.arrayBuffer()));
}

const deck = Presentation.create({ slideSize: { width: W, height: H } });

function text(slide, value, position, size, color = C.text, bold = false, name = "text") {
  const box = slide.shapes.add({ geometry: "textbox", name, position, fill: "none", line: { fill: "none", width: 0 } });
  box.text = value;
  box.text.style = { fontFamily, fontSize: size, color, bold };
  return box;
}
function base(slide, page, label = "CODEGRAPH") {
  slide.background.fill = C.bg;
  text(slide, label, { left: 70, top: 55, width: 390, height: 34 }, 17, C.blue, true, "section-label");
  text(slide, `${String(page).padStart(2, "0")} / 06`, { left: 875, top: 57, width: 130, height: 28 }, 14, C.muted, false, "page-number");
}
function addTitle(slide, value, top = 145, size = 52) {
  return text(slide, value, { left: 70, top, width: 940, height: 200 }, size, C.text, true, "slide-title");
}
function addBody(slide, value, top, height = 240, size = 27, color = C.muted) {
  return text(slide, value, { left: 70, top, width: 900, height }, size, color, false, "body-copy");
}
function addImage(slide, blob, alt, top = 420, height = 680) {
  slide.images.add({ blob, contentType: "image/png", alt, fit: "cover", position: { left: 70, top, width: 940, height }, geometry: "roundRect", borderRadius: "rounded-xl" });
}

{
  const slide = deck.slides.add(); base(slide, 1, "EXPERIMENTAL PORTFOLIO PROJECT");
  text(slide, "CodeGraph", { left: 70, top: 205, width: 850, height: 110 }, 78, C.text, true, "cover-title");
  text(slide, "A graph based multi-agent development workspace", { left: 70, top: 345, width: 860, height: 180 }, 42, C.blue, true, "cover-subtitle");
  addBody(slide, "A working local experiment that maps application modules, agent roles, file ownership, and validation evidence.", 620, 210, 31, C.muted);
  text(slide, "Built to explore the idea, not to claim general autonomous development.", { left: 70, top: 1060, width: 900, height: 100 }, 24, C.green, true, "disclosure");
}
{
  const slide = deck.slides.add(); base(slide, 2, "THE IDEA");
  addTitle(slide, "Software work has structure. The agent workflow should show it.");
  addBody(slide, "A request becomes connected modules with clear dependencies. Each module gets an owner, focused tasks, and visible checks.", 420, 250, 31);
  text(slide, "PROJECT REQUEST", { left: 70, top: 810, width: 360, height: 40 }, 17, C.purple, true);
  text(slide, "Module graph\nAgent graph\nShared memory\nValidation history", { left: 70, top: 885, width: 820, height: 280 }, 38, C.text, true, "concept-list");
}
{
  const slide = deck.slides.add(); base(slide, 3, "MODULE VIEW");
  addTitle(slide, "The application becomes a living dependency map", 135, 49);
  addBody(slide, "Modules show ownership, status, and how data moves through the project.", 315, 110, 27);
  addImage(slide, await bytes(path.join(workspaceDir, "docs/carousel-assets/codegraph-modules.png")), "CodeGraph module graph showing data source, storage, KPI engine, API, and dashboard", 475, 650);
  text(slide, "Zoom, pan, inspect, and watch the graph change as features are added.", { left: 70, top: 1170, width: 920, height: 80 }, 23, C.green, true);
}
{
  const slide = deck.slides.add(); base(slide, 4, "AGENT VIEW");
  addTitle(slide, "Every active role stays visible", 135, 54);
  addBody(slide, "The project lead coordinates module owners. Coding and testing agents handle focused work and publish results back to the project.", 315, 145, 27);
  addImage(slide, await bytes(path.join(workspaceDir, "docs/carousel-assets/codegraph-agents.png")), "CodeGraph agent hierarchy with project lead, module coordinators, coding agents, and testing agents", 500, 650);
  text(slide, "Agent creation, progress, completion, failure, and cancellation appear in the event stream.", { left: 70, top: 1190, width: 920, height: 86 }, 22, C.green, true);
}
{
  const slide = deck.slides.add(); base(slide, 5, "VALIDATION GATE");
  addTitle(slide, "Generated code needs evidence before acceptance", 145, 50);
  addBody(slide, "The orchestration layer controls file access and keeps changes inside the project workspace.", 350, 130, 29);
  text(slide, "01", { left: 70, top: 590, width: 90, height: 60 }, 34, C.blue, true);
  text(slide, "Compile the source", { left: 175, top: 590, width: 700, height: 60 }, 35, C.text, true);
  text(slide, "02", { left: 70, top: 735, width: 90, height: 60 }, 34, C.cyan, true);
  text(slide, "Run automated tests", { left: 175, top: 735, width: 700, height: 60 }, 35, C.text, true);
  text(slide, "03", { left: 70, top: 880, width: 90, height: 60 }, 34, C.purple, true);
  text(slide, "Record files, hashes, and results", { left: 175, top: 880, width: 780, height: 100 }, 35, C.text, true);
  addBody(slide, "A failed check blocks the module and returns useful diagnostics to the workflow.", 1090, 110, 25, C.muted);
}
{
  const slide = deck.slides.add(); base(slide, 6, "CURRENT MVP");
  addTitle(slide, "A focused experiment with a working end-to-end loop", 145, 50);
  addBody(slide, "Python and SQLite power the local engine. The browser dashboard uses plain JavaScript. A deterministic demo provider lets the workflow run without paid model access.", 350, 255, 29);
  text(slide, "Current boundary", { left: 70, top: 735, width: 440, height: 55 }, 22, C.purple, true);
  text(slide, "One generated application pattern and sequential module execution", { left: 70, top: 810, width: 900, height: 130 }, 34, C.text, true);
  text(slide, "Next experiment", { left: 70, top: 1015, width: 440, height: 55 }, 22, C.cyan, true);
  text(slide, "Constrained model-generated patches behind the same validation gate", { left: 70, top: 1085, width: 900, height: 140 }, 34, C.text, true);
}

const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, "container_tools/artifact_tool_utils.mjs")).href);
const candidatePath = path.join(buildDir, "candidate.pptx");
await (await PresentationFile.exportPptx(deck)).save(candidatePath);
await finalizePresentation({
  workspaceDir,
  candidatePath,
  finalPath: finalPptx,
  pythonExecutable: "/Users/arsalanahmed993/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3",
  integrityValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "10287000,12858750", "--validate-heading-fit"],
  explicitTotalSlideCount: 6,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  fontPolicy: { basis: "design", families: [fontFamily] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(buildDir, "codegraph-linkedin-carousel.validation.json"),
});

console.log(JSON.stringify({ finalPptx, finalPdf, slides: deck.slides.items.length }));
