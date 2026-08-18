const SHEET_NAME = "Players";
const MAX_PLAYERS = 100;

function doGet(event) {
    const action = String(event.parameter.action || "list");
    const callback = String(event.parameter.callback || "callback").replace(/[^a-zA-Z0-9_$]/g, "");

    try {
        const result = action === "add"
            ? addPlayer_(event.parameter.playerId)
            : listPlayers_();
        return jsonp_(callback, result);
    } catch (error) {
        return jsonp_(callback, { ok: false, message: error.message });
    }
}

function addPlayer_(rawPlayerId) {
    const playerId = String(rawPlayerId || "").trim();
    if (!/^\d+$/.test(playerId)) {
        return { ok: false, message: "Player IDs can contain numbers only." };
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
        const sheet = getPlayerSheet_();
        const playerIds = getPlayerIds_(sheet);

        if (playerIds.includes(playerId)) {
            return { ok: false, message: `Player ID ${playerId} is already on the list.` };
        }

        if (playerIds.length >= MAX_PLAYERS) {
            return { ok: false, message: "The player list is full." };
        }

        sheet.appendRow([playerId, new Date()]);
        return { ok: true, playerId: playerId, count: playerIds.length + 1 };
    } finally {
        lock.releaseLock();
    }
}

function listPlayers_() {
    const playerIds = getPlayerIds_(getPlayerSheet_());
    return { ok: true, playerIds: playerIds };
}

function getPlayerSheet_() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
        sheet = spreadsheet.insertSheet(SHEET_NAME);
        sheet.appendRow(["Player ID", "Submitted At"]);
        sheet.setFrozenRows(1);
    }

    return sheet;
}

function getPlayerIds_(sheet) {
    if (sheet.getLastRow() < 2) return [];
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
        .getDisplayValues()
        .flat()
        .map(String)
        .map(value => value.trim())
        .filter(Boolean);
}

function jsonp_(callback, data) {
    return ContentService
        .createTextOutput(`${callback}(${JSON.stringify(data)});`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
}