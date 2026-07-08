import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const files = [
  "D:/TaO10-FrontEnd/outputs/downloads/import_de_thi_tieng_anh_11_20_chuan_type.xlsx",
  "D:/TaO10-FrontEnd/outputs/downloads/import_10_de_thi_vao_10_chuan_type.xlsx",
];

for (const file of files) {
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(file));
  const table = await workbook.inspect({
    kind: "table",
    sheetId: "Import",
    range: "A1:S12",
    include: "values",
    tableMaxRows: 12,
    tableMaxCols: 19,
    maxChars: 5000,
  });
  console.log(table.ndjson);

  const errors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 50 },
    summary: "formula error scan",
  });
  console.log(errors.ndjson);

  const preview = await workbook.render({
    sheetName: "Import",
    range: "A1:S20",
    scale: 1,
    format: "png",
  });
  const previewPath = file.replace(/\.xlsx$/i, "_preview.png");
  await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
  console.log(JSON.stringify({ file, previewPath: path.normalize(previewPath) }));
}
