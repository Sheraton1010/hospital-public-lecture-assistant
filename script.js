"use strict";

const BASIC_SETTINGS_STORAGE_KEY = "publicLectureAssistant.basicSettings.v1";
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const MAIL_SEPARATOR = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

const departmentOptions = [
  "泌尿器科",
  "婦人科",
  "乳腺外科",
  "内科",
  "消化器内科",
  "腎臓内科",
  "消化器外科",
  "循環器内科",
  "呼吸器内科",
  "皮膚科",
  "リハビリテーション科",
  "放射線科",
  "脳神経外科",
  "医療ソーシャルワーカー",
  "入退院支援室"
];

const speakerTitleKeywords = [
  "診療放射線技師",
  "臨床検査技師",
  "医療ソーシャルワーカー",
  "理学療法士",
  "作業療法士",
  "言語聴覚士",
  "管理栄養士",
  "看護部長",
  "薬剤師",
  "看護師",
  "保健師",
  "助産師",
  "技師長",
  "医師",
  "主任",
  "係長",
  "課長",
  "部長",
  "医長"
];

// 入力項目のIDを一元管理し、将来の保存機能追加時に扱いやすくします。
const BASIC_FIELDS = [
  "hospitalName",
  "departmentName",
  "phoneNumber",
  "eventUrl",
  "signatureAddress",
  "senderName"
];

const EVENT_FIELDS = [
  "lectureTitle",
  "lectureDescription",
  "eventDate",
  "dayOfWeek",
  "timeRange",
  "customTimeRange",
  "openingNote",
  "speakerDepartment",
  "speakerName",
  "venueName",
  "venueNote",
  "postalCode",
  "address",
  "access",
  "capacity",
  "notes"
];

const VENUE_FIELD_IDS = [
  "venueName",
  "venueNote",
  "postalCode",
  "address",
  "access"
];

const OUTPUT_DEFINITIONS = [
  ["autoReplyScript", "自動返信メール用 Apps Script"],
  ["reminderScript", "リマインダーメール用 Apps Script"],
  ["autoReplyPreview", "自動返信メール本文プレビュー"],
  ["reminderPreview", "リマインダーメール本文プレビュー"],
  ["formDescription", "Googleフォーム説明文"],
  ["formConfirmation", "Googleフォーム送信完了画面文"],
  ["homepageNotice", "ホームページ掲載用の注意文"]
];

const venueTemplates = {
  highlife1: {
    venueName: "ハイライフプラザいたばし",
    venueNote: "1階会議室",
    postalCode: "〒173-0004",
    address: "東京都板橋区板橋1丁目55-16",
    access: "都営三田線「新板橋駅」から約4分、JR「板橋駅」から約3分"
  },
  highlife2: {
    venueName: "ハイライフプラザいたばし",
    venueNote: "2階Aホール",
    postalCode: "〒173-0004",
    address: "東京都板橋区板橋1丁目55-16",
    access: "都営三田線「新板橋駅」から約4分、JR「板橋駅」から約3分"
  },
  yamato: {
    venueName: "明理会東京大和病院",
    venueNote: "K&Eビル1階",
    postalCode: "〒173-0001",
    address: "東京都板橋区本町36-3",
    access: "都営三田線「板橋本町駅」下車 A2出口より徒歩約3分"
  }
};

const DEFAULT_VALUES = {
  hospitalName: "医療法人財団明理会　明理会東京大和病院",
  departmentName: "地域医療連携室　広報企画担当",
  phoneNumber: "03-5943-2411",
  eventUrl: "https://tokyoyamato-hp.com/event/",
  signatureAddress: "〒173-0001 東京都板橋区本町36-3",
  senderName: "明理会東京大和病院 広報企画担当",
  openingNote: "開場30分前",
  notes: "受講の際は、マスク着用をお願いいたします。"
};

document.addEventListener("DOMContentLoaded", () => {
  loadSavedBasicSettings();
  initializeBasicSettingsPanel();
  initializeDateAutoWeekday();
  initializeTimeRangeSelector();
  initializeDepartmentDatalist();

  document.getElementById("generateButton").addEventListener("click", handleGenerate);
  document.getElementById("clearButton").addEventListener("click", clearEventFields);
  document.getElementById("sampleButton").addEventListener("click", fillSample);
  document.getElementById("saveBasicSettingsButton").addEventListener("click", saveBasicSettings);
  document.getElementById("resetBasicSettingsButton").addEventListener("click", resetBasicSettings);
  document.getElementById("generateCompletionMessageButton").addEventListener("click", generateGoogleFormCompletionMessage);
  document.getElementById("copyCompletionMessageButton").addEventListener("click", copyGoogleFormCompletionMessage);
  initializeVenueTemplateButtons();
});

function getInputValue(id) {
  return document.getElementById(id).value.trim();
}

function setInputValue(id, value) {
  document.getElementById(id).value = value || "";
}

function collectFormData() {
  const data = {};
  [...BASIC_FIELDS, ...EVENT_FIELDS].forEach((id) => {
    data[id] = getInputValue(id);
  });
  data.speakerName = normalizeSpeakerName(data.speakerName);
  return data;
}

function collectBasicSettings() {
  const settings = {};
  BASIC_FIELDS.forEach((id) => {
    settings[id] = getInputValue(id);
  });
  return settings;
}

function initializeBasicSettingsPanel() {
  const toggleButton = document.getElementById("toggleBasicSettingsButton");
  toggleButton.addEventListener("click", toggleBasicSettingsPanel);
  setBasicSettingsPanelOpen(false);
}

function toggleBasicSettingsPanel() {
  const panel = document.getElementById("basicSettingsPanel");
  setBasicSettingsPanelOpen(panel.hidden);
}

function setBasicSettingsPanelOpen(isOpen) {
  const panel = document.getElementById("basicSettingsPanel");
  const toggleButton = document.getElementById("toggleBasicSettingsButton");

  panel.hidden = !isOpen;
  toggleButton.setAttribute("aria-expanded", String(isOpen));
  toggleButton.textContent = isOpen ? "基本設定を閉じる" : "基本設定を開く";
}

function initializeDateAutoWeekday() {
  document.getElementById("eventDate").addEventListener("change", updateWeekdayFromEventDate);
}

function updateWeekdayFromEventDate() {
  const eventDate = getInputValue("eventDate");
  if (!eventDate) return;

  const [year, month, day] = eventDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  setInputValue("dayOfWeek", WEEKDAY_LABELS[date.getDay()]);
}

function initializeTimeRangeSelector() {
  const timeRangeSelect = document.getElementById("timeRange");
  timeRangeSelect.addEventListener("change", updateCustomTimeRangeVisibility);
  updateCustomTimeRangeVisibility();
}

function updateCustomTimeRangeVisibility() {
  const isCustom = getInputValue("timeRange") === "その他";
  document.getElementById("customTimeRangeField").hidden = !isCustom;

  if (!isCustom) {
    setInputValue("customTimeRange", "");
  }
}

function initializeDepartmentDatalist() {
  const departmentList = document.getElementById("departmentOptionsList");
  departmentList.innerHTML = "";

  departmentOptions.forEach((department) => {
    const option = document.createElement("option");
    option.value = department;
    departmentList.append(option);
  });
}

function saveBasicSettings() {
  try {
    localStorage.setItem(BASIC_SETTINGS_STORAGE_KEY, JSON.stringify(collectBasicSettings()));
    showBasicSettingsStatus("保存しました");
  } catch (error) {
    console.error("saveBasicSettings error", error);
    showBasicSettingsStatus("保存できませんでした");
  }
}

function loadSavedBasicSettings() {
  try {
    const savedSettings = localStorage.getItem(BASIC_SETTINGS_STORAGE_KEY);
    if (!savedSettings) return;

    const parsedSettings = JSON.parse(savedSettings);
    BASIC_FIELDS.forEach((id) => {
      if (typeof parsedSettings[id] === "string") {
        setInputValue(id, parsedSettings[id]);
      }
    });
  } catch (error) {
    console.error("loadSavedBasicSettings error", error);
  }
}

function resetBasicSettings() {
  BASIC_FIELDS.forEach((id) => setInputValue(id, DEFAULT_VALUES[id]));

  try {
    localStorage.removeItem(BASIC_SETTINGS_STORAGE_KEY);
  } catch (error) {
    console.error("resetBasicSettings error", error);
  }

  showBasicSettingsStatus("初期値に戻しました");
}

function showBasicSettingsStatus(message) {
  const status = document.getElementById("basicSettingsStatus");
  status.textContent = message;
  window.setTimeout(() => {
    status.textContent = "";
  }, 2400);
}

function initializeVenueTemplateButtons() {
  // data-template属性を持つ会場ボタンに、自動入力処理をまとめて設定します。
  document.querySelectorAll('[data-template]').forEach((button) => {
    button.addEventListener("click", (event) => {
      const templateKey = event.currentTarget.getAttribute("data-template");
      applyVenueTemplate(templateKey);
    });
  });
}

function applyVenueTemplate(templateKey) {
  const template = venueTemplates[templateKey];
  if (!template) return;

  VENUE_FIELD_IDS.forEach((id) => {
    setInputValue(id, template[id]);
  });
}

function clearEventFields() {
  EVENT_FIELDS.forEach((id) => setInputValue(id, ""));
  setInputValue("timeRange", "14:00～15:00");
  updateCustomTimeRangeVisibility();
  setInputValue("openingNote", DEFAULT_VALUES.openingNote);
  setInputValue("speakerDepartment", "泌尿器科");
  setInputValue("notes", DEFAULT_VALUES.notes);
  renderEmptyMessage();
}

function fillSample() {
  const sample = {
    lectureTitle: "知っておきたい前立腺がんの基礎知識",
    lectureDescription: "前立腺がんの検査、治療、日常生活で気をつけたいことについて、専門医がわかりやすく解説します。",
    eventDate: "2026-09-12",
    dayOfWeek: "土",
    timeRange: "14:00～15:00",
    customTimeRange: "",
    openingNote: DEFAULT_VALUES.openingNote,
    speakerDepartment: "脳神経外科",
    speakerName: "谷地　一成 医師",
    capacity: "30名",
    notes: DEFAULT_VALUES.notes
  };

  Object.entries(sample).forEach(([id, value]) => setInputValue(id, value));
  updateCustomTimeRangeVisibility();
  applyVenueTemplate("highlife1");
}

function handleGenerate() {
  const data = collectFormData();
  const validationMessage = validateBeforeGenerate(data);
  if (validationMessage) {
    window.alert(validationMessage);
    return;
  }

  setInputValue("speakerName", data.speakerName);
  const outputs = buildOutputs(data);
  renderOutputs(outputs);
}

function validateBeforeGenerate(data) {
  if (!data.speakerName) {
    return "講師名を入力してください。";
  }

  if (data.capacity.includes("定員")) {
    return "定員欄には『30名』のように人数のみを入力してください。";
  }

  return "";
}

function normalizeSpeakerName(name) {
  const trimmedName = (name || "").trim();
  if (!trimmedName) return "";

  for (const title of speakerTitleKeywords) {
    if (!trimmedName.endsWith(title)) continue;

    const namePart = trimmedName.slice(0, -title.length).replace(/[ 　]+$/u, "");
    if (!namePart) return trimmedName;

    return `${namePart} ${title}`;
  }

  return trimmedName;
}

function buildOutputs(data) {
  return {
    autoReplyScript: buildAutoReplyScript(data),
    reminderScript: buildReminderScript(data),
    autoReplyPreview: buildAutoReplyBody(data, "申込者"),
    reminderPreview: buildReminderBody(data, "申込者", 3),
    formDescription: buildFormDescription(data),
    formConfirmation: buildFormConfirmation(data),
    homepageNotice: buildHomepageNotice(data)
  };
}

function buildLectureInfo(data) {
  const dateTime = [formatEventDate(data), getSelectedTimeRange(data)].filter(Boolean).join(" ");
  const openingText = data.openingNote ? `（${data.openingNote}）` : "";
  const speakerText = [data.speakerDepartment, data.speakerName].filter(Boolean).join("　");
  const venueText = data.venueNote ? `${data.venueName}（${data.venueNote}）` : data.venueName;
  const addressText = [data.postalCode, data.address].filter(Boolean).join(" ");

  return [
    "【お申込内容】",
    `●公開講座：『${data.lectureTitle}』`,
    `●日時：${dateTime}${openingText}`,
    `●講師：${speakerText}`,
    data.capacity ? `●定員：${data.capacity}` : "",
    `●場所：${venueText}`,
    `住所：${addressText}`,
    data.access ? `（${data.access}）` : "",
    `備考：${data.notes}`
  ].filter(Boolean).join("\n");
}

function buildSignature(data) {
  return [
    MAIL_SEPARATOR,
    [data.hospitalName, data.departmentName].filter(Boolean).join("　"),
    data.signatureAddress,
    `TEL ${data.phoneNumber}`,
    MAIL_SEPARATOR
  ].filter(Boolean).join("\n");
}

function buildAutoReplyBody(data, nameExpression) {
  return `${nameExpression} 様

お世話になっております。
明理会東京大和病院　広報企画担当です。

この度は、明理会東京大和病院の無料公開講座にお申込みいただき、誠にありがとうございます。

${buildLectureInfo(data)}

当日はスタッフ一同お待ちしておりますので、お気をつけてお越しください。

【公開講座ホームページ】
${data.eventUrl}

${buildSignature(data)}`;
}

function buildReminderBody(data, nameExpression, daysLeftExpression) {
  const openingLine = daysLeftExpression === 3
    ? "お申し込みいただいた公開講座の開催まで、あと3日となりました。"
    : "お申し込みいただいた公開講座の開催が近づいてまいりました。";

  return `${nameExpression} 様

お世話になっております。
明理会東京大和病院　広報企画担当です。

${openingLine}
当日の内容を改めてご案内いたしますので、ご確認いただけますと幸いです。

${buildLectureInfo(data)}

当日はスタッフ一同お待ちしておりますので、お気をつけてお越しください。

【公開講座ホームページ（最新情報はこちら）】
${data.eventUrl}

${buildSignature(data)}`;
}

function buildFormDescription(data) {
  return `【お申し込み後のご案内】
お申し込み後、数分以内に受付完了メール（自動返信）をお送りしております。
メールが届かない場合は、まず迷惑メールフォルダをご確認ください。
迷惑メールフォルダにも届いていない場合は、お手数ですが3営業日以内に下記までお問い合わせください。
お問い合わせ：${data.phoneNumber}`;
}

function buildFormConfirmation(data) {
  return buildGoogleFormCompletionMessage(data);
}

function generateGoogleFormCompletionMessage() {
  const message = buildGoogleFormCompletionMessage(collectBasicSettings());
  document.getElementById("googleFormCompletionMessage").value = message;
}

function copyGoogleFormCompletionMessage() {
  const message = document.getElementById("googleFormCompletionMessage").value;
  const status = document.getElementById("completionMessageCopyStatus");

  copyText(message, status);
}

function buildGoogleFormCompletionMessage(data) {
  const hospitalName = getContactHospitalName(data.hospitalName || DEFAULT_VALUES.hospitalName);
  const phoneNumber = data.phoneNumber || DEFAULT_VALUES.phoneNumber;

  return `お申し込みありがとうございました。

受付完了メール（自動返信）を数分以内にお送りしております。

メールが届かない場合は、まず迷惑メールフォルダをご確認ください。

携帯電話会社（docomo・au・SoftBank等）のメールアドレスをご利用の場合は、受信設定により届かないことがあります。

30分以上経過してもメールが届かない場合は、お手数ですが${hospitalName}（TEL：${phoneNumber}）までお問い合わせください。

当日、皆さまのご参加を心よりお待ちしております。`;
}

function getContactHospitalName(hospitalName) {
  return String(hospitalName || "")
    .replace(/^医療法人財団明理会[　\s]*/, "")
    .trim();
}

function buildHomepageNotice(data) {
  return `※お申し込み後、数分以内に受付完了メール（自動返信）をお送りしております。メールが届かない場合は、迷惑メールフォルダをご確認ください。届かない場合は3営業日以内に${data.phoneNumber}までお問い合わせください。`;
}

function buildAutoReplyScript(data) {
  const settings = createScriptSettings(data);

  return `/**
 * Googleフォーム送信時に受付完了メールを送信します。
 * 前提：B列がメールアドレス、C列が名前です。
 */
function autoReply(e) {
  const SETTINGS = ${toSafeScriptObject(settings)};
  const SUBJECT = "【お申込み完了】明理会東京大和病院 無料公開講座";

  try {
    const sheet = e && e.range
      ? e.range.getSheet()
      : SpreadsheetApp.getActiveSheet();

    const row = e && e.range
      ? e.range.getRow()
      : sheet.getLastRow();

    if (row < 2) return;

    const replyStatusCol = getOrCreateAutoReplyColumn_(sheet, "申込返信済み");
    const replyDateCol = getOrCreateAutoReplyColumn_(sheet, "返信日時");
    const email = String(sheet.getRange(row, 2).getValue() || "").trim();
    const name = String(sheet.getRange(row, 3).getValue() || "").trim() || "申込者";

    if (!email || !email.includes("@")) {
      sheet.getRange(row, replyStatusCol).setValue("メール取得不可");
      return;
    }

    if (sheet.getRange(row, replyStatusCol).getValue() === "送信済み") {
      return;
    }

    MailApp.sendEmail({
      to: email,
      subject: SUBJECT,
      body: buildAutoReplyBody_(SETTINGS, name),
      name: SETTINGS.senderName
    });

    sheet.getRange(row, replyStatusCol).setValue("送信済み");
    sheet.getRange(row, replyDateCol).setValue(new Date());
  } catch (error) {
    console.error("autoReply error", error);
  }
}

function getOrCreateAutoReplyColumn_(sheet, headerName) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const index = headers.indexOf(headerName);

  if (index >= 0) {
    return index + 1;
  }

  const newColumn = lastColumn + 1;
  sheet.getRange(1, newColumn).setValue(headerName);
  return newColumn;
}

function buildAutoReplyBody_(settings, name) {
  return name + " 様\\n\\n"
    + "お世話になっております。\\n"
    + "明理会東京大和病院　広報企画担当です。\\n\\n"
    + "この度は、明理会東京大和病院の無料公開講座にお申込みいただき、誠にありがとうございます。\\n\\n"
    + buildAutoReplyLectureInfo_(settings) + "\\n\\n"
    + "当日はスタッフ一同お待ちしておりますので、お気をつけてお越しください。\\n\\n"
    + "【公開講座ホームページ】\\n"
    + settings.eventUrl + "\\n\\n"
    + buildAutoReplySignature_(settings);
}

function buildAutoReplyLectureInfo_(settings) {
  const dateTime = [settings.eventDateText, settings.timeRange].filter(Boolean).join(" ");
  const openingText = settings.openingNote ? "（" + settings.openingNote + "）" : "";
  const speakerText = [settings.speakerDepartment, settings.speakerName].filter(Boolean).join("　");
  const venueText = settings.venueNote ? settings.venueName + "（" + settings.venueNote + "）" : settings.venueName;
  const addressText = [settings.postalCode, settings.address].filter(Boolean).join(" ");

  return [
    "【お申込内容】",
    settings.lectureTitle ? "●公開講座：『" + settings.lectureTitle + "』" : "",
    dateTime || openingText ? "●日時：" + dateTime + openingText : "",
    speakerText ? "●講師：" + speakerText : "",
    settings.capacity ? "●定員：" + settings.capacity : "",
    venueText ? "●場所：" + venueText : "",
    addressText ? "住所：" + addressText : "",
    settings.access ? "（" + settings.access + "）" : "",
    settings.notes ? "備考：" + settings.notes : ""
  ].filter(Boolean).join("\\n");
}

function buildAutoReplySignature_(settings) {
  return [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    [settings.hospitalName, settings.departmentName].filter(Boolean).join("　"),
    settings.signatureAddress,
    settings.phoneNumber ? "TEL " + settings.phoneNumber : "",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  ].filter(Boolean).join("\\n");
}`;
}

function buildReminderScript(data) {
  const settings = createScriptSettings(data);

  return `/**
 * 開催日の3日前から当日まで、未送信の申込者へリマインドメールを送信します。
 * 前提：B列がメールアドレス、C列が名前です。
 */
function sendReminder() {
  const SETTINGS = ${toSafeScriptObject(settings)};
  const SHEET_NAME = "フォームの回答 1";
  const SUBJECT = "【確認】無料公開講座の開催が近づいてまいりました";

  let sentCount = 0;
  let skippedCount = 0;
  let invalidEmailCount = 0;

  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      throw new Error("回答シート「" + SHEET_NAME + "」が見つかりません。");
    }

    const eventDate = parseReminderDate_(SETTINGS.eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysLeft = Math.floor((eventDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    if (daysLeft < 0 || daysLeft > 3) {
      logReminderResult_(sentCount, skippedCount, invalidEmailCount);
      return;
    }

    const reminderStatusCol = getOrCreateReminderColumn_(sheet, "リマインド送信済み");
    const reminderDateCol = getOrCreateReminderColumn_(sheet, "リマインド日時");
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      logReminderResult_(sentCount, skippedCount, invalidEmailCount);
      return;
    }

    for (let row = 2; row <= lastRow; row++) {
      const email = String(sheet.getRange(row, 2).getValue() || "").trim();
      const name = String(sheet.getRange(row, 3).getValue() || "").trim() || "申込者";
      const status = sheet.getRange(row, reminderStatusCol).getValue();

      if (status === "送信済み") {
        skippedCount++;
        continue;
      }

      if (!email || !email.includes("@")) {
        sheet.getRange(row, reminderStatusCol).setValue("メール取得不可");
        invalidEmailCount++;
        continue;
      }

      try {
        const sentAt = new Date();

        MailApp.sendEmail({
          to: email,
          subject: SUBJECT,
          body: buildReminderBody_(SETTINGS, name, daysLeft),
          name: SETTINGS.senderName
        });

        sheet.getRange(row, reminderStatusCol).setValue("送信済み");
        sheet.getRange(row, reminderDateCol).setValue(sentAt);
        sentCount++;
      } catch (sendError) {
        sheet.getRange(row, reminderStatusCol).setValue("送信エラー");
        console.error("sendReminder row error", {
          row: row,
          email: email,
          error: sendError
        });
      }
    }

    logReminderResult_(sentCount, skippedCount, invalidEmailCount);
  } catch (error) {
    console.error("sendReminder error", error);
  }
}

function getOrCreateReminderColumn_(sheet, headerName) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const index = headers.indexOf(headerName);

  if (index >= 0) {
    return index + 1;
  }

  const newColumn = lastColumn + 1;
  sheet.getRange(1, newColumn).setValue(headerName);
  return newColumn;
}

function parseReminderDate_(dateText) {
  const parts = String(dateText).split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function buildReminderBody_(settings, name, daysLeft) {
  const openingLine = daysLeft === 3
    ? "お申し込みいただいた公開講座の開催まで、あと3日となりました。"
    : "お申し込みいただいた公開講座の開催が近づいてまいりました。";

  return name + " 様\\n\\n"
    + "お世話になっております。\\n"
    + "明理会東京大和病院　広報企画担当です。\\n\\n"
    + openingLine + "\\n"
    + "当日の内容を改めてご案内いたしますので、ご確認いただけますと幸いです。\\n\\n"
    + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n"
    + buildReminderLectureInfo_(settings) + "\\n"
    + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\\n"
    + "当日はスタッフ一同お待ちしておりますので、お気をつけてお越しください。\\n\\n"
    + "【公開講座ホームページ（最新情報はこちら）】\\n"
    + settings.eventUrl + "\\n\\n"
    + buildReminderSignature_(settings);
}

function buildReminderLectureInfo_(settings) {
  const dateTime = [settings.eventDateText, settings.timeRange].filter(Boolean).join(" ");
  const openingText = settings.openingNote ? "（" + settings.openingNote + "）" : "";
  const speakerText = [settings.speakerDepartment, settings.speakerName].filter(Boolean).join("　");
  const venueText = settings.venueNote ? settings.venueName + "（" + settings.venueNote + "）" : settings.venueName;
  const addressText = [settings.postalCode, settings.address].filter(Boolean).join(" ");

  return [
    "【お申込内容（再送）】",
    settings.lectureTitle ? "●公開講座：『" + settings.lectureTitle + "』" : "",
    dateTime || openingText ? "●日時：" + dateTime + openingText : "",
    speakerText ? "●講師：" + speakerText : "",
    settings.capacity ? "●定員：" + settings.capacity : "",
    venueText ? "●場所：" + venueText : "",
    addressText ? "住所：" + addressText : "",
    settings.access ? "（" + settings.access + "）" : "",
    settings.notes ? "備考：" + settings.notes : ""
  ].filter(Boolean).join("\\n");
}

function buildReminderSignature_(settings) {
  return [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    [settings.hospitalName, settings.departmentName].filter(Boolean).join("　"),
    settings.signatureAddress,
    settings.phoneNumber ? "TEL " + settings.phoneNumber : "",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  ].filter(Boolean).join("\\n");
}

function logReminderResult_(sentCount, skippedCount, invalidEmailCount) {
  console.log("送信件数: " + sentCount);
  console.log("送信済みスキップ件数: " + skippedCount);
  console.log("メール取得不可件数: " + invalidEmailCount);
}`;
}

function createScriptSettings(data) {
  return {
    hospitalName: data.hospitalName,
    departmentName: data.departmentName,
    phoneNumber: data.phoneNumber,
    eventUrl: data.eventUrl,
    signatureAddress: data.signatureAddress,
    senderName: data.senderName,
    lectureTitle: data.lectureTitle,
    eventDate: data.eventDate,
    eventDateText: formatEventDate(data),
    timeRange: getSelectedTimeRange(data),
    openingNote: data.openingNote,
    speakerDepartment: data.speakerDepartment,
    speakerName: data.speakerName,
    venueName: data.venueName,
    venueNote: data.venueNote,
    postalCode: data.postalCode,
    address: data.address,
    access: data.access,
    capacity: data.capacity,
    notes: data.notes
  };
}

function toSafeScriptObject(value) {
  // JSON.stringifyを使うことで、改行や引用符をApps Script内で安全に扱える文字列にします。
  return JSON.stringify(value, null, 2);
}

function formatEventDate(data) {
  if (!data.eventDate) return "";

  const [year, month, day] = data.eventDate.split("-");
  const dateText = `${Number(year)}年${Number(month)}月${Number(day)}日`;
  return data.dayOfWeek ? `${dateText}（${data.dayOfWeek}）` : dateText;
}

function getSelectedTimeRange(data) {
  if (data.timeRange === "その他") {
    return data.customTimeRange || "";
  }

  return data.timeRange || "";
}

function joinWithSpace(...values) {
  return values.filter(Boolean).join(" ");
}

function renderOutputs(outputs) {
  const outputList = document.getElementById("outputList");
  outputList.innerHTML = "";

  OUTPUT_DEFINITIONS.forEach(([key, title]) => {
    outputList.appendChild(createOutputBox(title, outputs[key]));
  });
}

function renderEmptyMessage() {
  document.getElementById("outputList").innerHTML = '<p class="empty-message">講座情報を入力し、「コードを生成」を押してください。</p>';
}

function createOutputBox(title, content) {
  const box = document.createElement("article");
  box.className = "output-box";

  const header = document.createElement("div");
  header.className = "output-header";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const copyArea = document.createElement("div");
  copyArea.className = "copy-area";

  const status = document.createElement("span");
  status.className = "copy-status";
  status.setAttribute("aria-live", "polite");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "copy-button secondary-button";
  button.textContent = "コピー";
  button.addEventListener("click", () => copyText(content, status));

  const pre = document.createElement("pre");
  pre.textContent = content || "";

  copyArea.append(status, button);
  header.append(heading, copyArea);
  box.append(header, pre);

  return box;
}

async function copyText(text, statusElement) {
  try {
    await navigator.clipboard.writeText(text);
    showCopyStatus(statusElement, "コピーしました");
  } catch (error) {
    fallbackCopyText(text);
    showCopyStatus(statusElement, "コピーしました");
  }
}

function fallbackCopyText(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function showCopyStatus(statusElement, message) {
  statusElement.textContent = message;
  window.setTimeout(() => {
    statusElement.textContent = "";
  }, 2200);
}
