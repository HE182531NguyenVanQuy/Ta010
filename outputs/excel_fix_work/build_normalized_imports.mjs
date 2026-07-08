import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const files = [
  {
    input: "D:/TaO10-FrontEnd/outputs/import_de_thi_tieng_anh_11_20.xlsx",
    output: "D:/TaO10-FrontEnd/outputs/downloads/import_de_thi_tieng_anh_11_20_chuan_type.xlsx",
  },
  {
    input: "D:/import_10_de_thi_vao_10.xlsx",
    output: "D:/TaO10-FrontEnd/outputs/downloads/import_10_de_thi_vao_10_chuan_type.xlsx",
  },
];

const typeAliases = new Map([
  ["phat am", "Phát âm"],
  ["trong am", "Trọng âm"],
  ["ngu phap", "Ngữ pháp"],
  ["tu vung", "Từ vựng"],
  ["chon dap an dung", "Chọn đáp án đúng"],
  ["giao tiep", "Giao tiếp"],
  ["tu dong nghia", "Từ đồng nghĩa"],
  ["tu trai nghia", "Từ trái nghĩa"],
  ["tu dong nghia trai nghia", "Từ đồng nghĩa / trái nghĩa"],
  ["doc hieu dien tu", "Đọc hiểu - điền từ"],
  ["dien tu vao doan van", "Đọc hiểu - điền từ"],
  ["dien cau vao doan van", "Điền câu vào đoạn văn"],
  ["doc hieu", "Đọc hiểu"],
  ["bien bao thong bao", "Biển báo/Thông báo"],
  ["nghe hieu", "Nghe hiểu"],
  ["viet", "Viết"],
  ["viet lai cau gan nghia", "Viết lại câu (gần nghĩa)"],
  ["viet lai cau tu cho san", "Viết lại câu (từ cho sẵn)"],
  ["sap xep hoan thanh doan van", "Sắp xếp/hoàn thành đoạn văn"],
  ["tim loi sai", "Tìm lỗi sai"],
  ["de tong hop", "Đề tổng hợp"],
  ["khac", "Khác"],
]);

const knownTypes = new Set(typeAliases.values());

function lookupKey(value) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeType(value, questionNumber) {
  const trimmed = String(value ?? "").trim();
  if (knownTypes.has(trimmed)) return trimmed;

  const key = lookupKey(trimmed);
  if (typeAliases.has(key)) return typeAliases.get(key);

  const number = Number(questionNumber);
  if (!Number.isFinite(number) || number <= 0) return "Khác";
  if (number <= 4) return number <= 2 ? "Phát âm" : "Trọng âm";
  if (number <= 18) return "Chọn đáp án đúng";
  if (number <= 20) return "Giao tiếp";
  if (number <= 24) return "Từ đồng nghĩa / trái nghĩa";
  if (number <= 30) return "Đọc hiểu - điền từ";
  if (number <= 34) return "Đọc hiểu";
  if (number <= 40) return "Viết lại câu (gần nghĩa)";
  return "Khác";
}

function normalizeAnswer(value, hasOptions) {
  const answer = String(value ?? "").trim().toUpperCase();
  if (["A", "B", "C", "D", "N/A"].includes(answer)) return answer;
  if (!hasOptions) return "N/A";
  return "";
}

function hasOption(value) {
  const text = String(value ?? "").trim();
  return text !== "" && text.toUpperCase() !== "N/A";
}

function colToLetter(col) {
  let result = "";
  while (col > 0) {
    const rem = (col - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    col = Math.floor((col - 1) / 26);
  }
  return result;
}

async function normalizeWorkbook({ input, output }) {
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(input));
  const sheet = workbook.worksheets.getItem("Import") ?? workbook.worksheets.getItemAt(0);
  const used = sheet.getUsedRange(true);
  const values = used.values;
  const headers = values[0].map((value) => String(value ?? "").trim());
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const required = ["QuestionNumber", "Section", "OptionA", "OptionB", "OptionC", "OptionD", "CorrectAnswer"];

  for (const header of required) {
    if (!headerIndex.has(header)) throw new Error(`${input} thiếu cột ${header}`);
  }

  const sectionCol = headerIndex.get("Section") + 1;
  const answerCol = headerIndex.get("CorrectAnswer") + 1;
  const questionNumberIndex = headerIndex.get("QuestionNumber");
  const sectionValues = [];
  const answerValues = [];
  let missingAnswerCount = 0;
  let normalizedTypeCount = 0;

  for (let row = 1; row < values.length; row++) {
    const current = values[row];
    const options = ["OptionA", "OptionB", "OptionC", "OptionD"].map((header) => current[headerIndex.get(header)]);
    const hasOptions = options.some(hasOption);
    const normalizedType = normalizeType(current[headerIndex.get("Section")], current[questionNumberIndex]);
    const normalizedAnswer = normalizeAnswer(current[headerIndex.get("CorrectAnswer")], hasOptions);

    if (normalizedType !== String(current[headerIndex.get("Section")] ?? "").trim()) normalizedTypeCount++;
    if (hasOptions && !normalizedAnswer) missingAnswerCount++;

    sectionValues.push([normalizedType]);
    answerValues.push([normalizedAnswer]);
  }

  sheet.getRange(`${colToLetter(sectionCol)}2:${colToLetter(sectionCol)}${values.length}`).values = sectionValues;
  sheet.getRange(`${colToLetter(answerCol)}2:${colToLetter(answerCol)}${values.length}`).values = answerValues;

  const answerRange = sheet.getRange(`${colToLetter(answerCol)}2:${colToLetter(answerCol)}${values.length}`);
  answerRange.dataValidation = { rule: { type: "list", values: ["A", "B", "C", "D", "N/A"] } };

  const sectionRange = sheet.getRange(`${colToLetter(sectionCol)}2:${colToLetter(sectionCol)}${values.length}`);
  sectionRange.dataValidation = { rule: { type: "list", values: [...knownTypes] } };

  await fs.mkdir(path.dirname(output), { recursive: true });
  const exported = await SpreadsheetFile.exportXlsx(workbook);
  await exported.save(output);
  return { input, output, rows: values.length - 1, normalizedTypeCount, missingAnswerCount };
}

const results = [];
for (const file of files) {
  results.push(await normalizeWorkbook(file));
}

console.log(JSON.stringify(results, null, 2));
