from pathlib import Path
path = Path('script.js')
s = path.read_text(encoding='utf-8')
auto_start = s.index('function buildAutoReplyScript(data)')
auto_end = s.index('\nfunction buildReminderScript(data)', auto_start)
reminder_start = auto_end + 1
reminder_end = s.index('\nfunction createScriptSettings(data)', reminder_start)
auto_func = r"""function buildAutoReplyScript(data) {
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
  return name + " 様\n\n"
    + "お世話になっております。\n"
    + "明理会東京大和病院　広報企画担当です。\n\n"
    + "この度は、明理会東京大和病院の無料公開講座にお申込みいただき、誠にありがとうございます。\n\n"
    + buildAutoReplyLectureInfo_(settings) + "\n\n"
    + "当日はスタッフ一同お待ちしておりますので、お気をつけてお越しください。\n\n"
    + "【公開講座ホームページ】\n"
    + settings.eventUrl + "\n\n"
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
  ].filter(Boolean).join("\n");
}

function buildAutoReplySignature_(settings) {
  return [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    [settings.hospitalName, settings.departmentName].filter(Boolean).join("　"),
    settings.signatureAddress,
    settings.phoneNumber ? "TEL " + settings.phoneNumber : "",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  ].filter(Boolean).join("\n");
}`;
}
"""
reminder_func = r"""function buildReminderScript(data) {
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

      MailApp.sendEmail({
        to: email,
        subject: SUBJECT,
        body: buildReminderBody_(SETTINGS, name, daysLeft),
        name: SETTINGS.senderName
      });

      sheet.getRange(row, reminderStatusCol).setValue("送信済み");
      sheet.getRange(row, reminderDateCol).setValue(new Date());
      sentCount++;
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

  return name + " 様\n\n"
    + "お世話になっております。\n"
    + "明理会東京大和病院　広報企画担当です。\n\n"
    + openingLine + "\n"
    + "当日の内容を改めてご案内いたしますので、ご確認いただけますと幸いです。\n\n"
    + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    + buildReminderLectureInfo_(settings) + "\n"
    + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    + "当日はスタッフ一同お待ちしておりますので、お気をつけてお越しください。\n\n"
    + "【公開講座ホームページ（最新情報はこちら）】\n"
    + settings.eventUrl + "\n\n"
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
  ].filter(Boolean).join("\n");
}

function buildReminderSignature_(settings) {
  return [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    [settings.hospitalName, settings.departmentName].filter(Boolean).join("　"),
    settings.signatureAddress,
    settings.phoneNumber ? "TEL " + settings.phoneNumber : "",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  ].filter(Boolean).join("\n");
}

function logReminderResult_(sentCount, skippedCount, invalidEmailCount) {
  console.log("送信件数: " + sentCount);
  console.log("送信済みスキップ件数: " + skippedCount);
  console.log("メール取得不可件数: " + invalidEmailCount);
}`;
}
"""
s = s[:auto_start] + auto_func + s[auto_end:reminder_start] + reminder_func + s[reminder_end:]
path.write_text(s, encoding='utf-8')
