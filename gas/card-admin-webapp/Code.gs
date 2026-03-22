var ACTIONS = {
  health: 'health',
  initBackend: 'initBackend',
  getCard: 'getCard',
  saveCard: 'saveCard',
  createRuntimeSheet: 'createRuntimeSheet',
  debugRuntimeAccess: 'debugRuntimeAccess',
};

var DEFAULT_SHEET_NAME = 'cards_runtime';
var DEFAULT_RUNTIME_SLUG = 'default';
var OFFICIAL_RUNTIME_SHEET_ID = '12epmpzbyEzdvygO2K4Qkzpak9EUk0-kSTWIDiI1IqK3g';
var OFFICIAL_RUNTIME_SHEET_NAME = 'cards_runtime';
var REQUIRED_COLUMNS = ['slug', 'config_json', 'updated_at', 'updated_by'];
var SCRIPT_PROPERTY_KEYS = {
  sheetId: 'CARD_RUNTIME_SHEET_ID',
  sheetName: 'CARD_RUNTIME_SHEET_NAME',
  writeToken: 'CARD_ADMIN_WRITE_TOKEN',
};

function doGet(e) {
  try {
    var action = readAction_(e);

    if (action === ACTIONS.health) {
      return successResponse_(action, buildHealthPayload_());
    }

    if (action === ACTIONS.debugRuntimeAccess) {
      return successResponse_(action, buildDebugRuntimeAccessPayload_());
    }

    if (action !== ACTIONS.getCard) {
      return errorResponse_(action, 'Unsupported action.');
    }

    var slug = normalizeSlug_(readQueryParam_(e, 'slug'));
    if (!slug) {
      return errorResponse_(action, 'slug is required.');
    }

    var runtime = getRuntimeContext_();
    var row = findCardRowBySlug_(runtime.sheet, slug);
    if (!row) {
      return errorResponse_(action, 'Card not found.');
    }

    return successResponse_(action, {
      slug: slug,
      config: parseStoredConfig_(row.configJson),
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
      source: 'google-sheets',
    });
  } catch (error) {
    return errorResponse_(readAction_(e), toErrorMessage_(error));
  }
}

function doPost(e) {
  try {
    var payload = parseRequestJson_(e);
    var action = normalizeAction_(payload.action);

    if (action === ACTIONS.initBackend) {
      return successResponse_(action, initBackend_(payload));
    }

    if (action === ACTIONS.createRuntimeSheet) {
      verifyWriteToken_(payload.writeToken);
      return successResponse_(action, createRuntimeSheet_(payload));
    }

    if (action !== ACTIONS.saveCard) {
      return errorResponse_(action, 'Unsupported action.');
    }

    verifyWriteToken_(payload.writeToken);

    var slug = normalizeSlug_(payload.slug);
    if (!slug) {
      return errorResponse_(action, 'slug is required.');
    }

    var config = payload.config;
    assertCardConfigShape_(config);
    if (normalizeSlug_(config.slug) !== slug) {
      return errorResponse_(action, 'config.slug must match slug.');
    }

    var updatedBy = normalizeUserLabel_(payload.updatedBy);
    var updatedAt = new Date().toISOString();
    var runtime = getRuntimeContext_();
    upsertCardRow_(runtime.sheet, slug, JSON.stringify(config), updatedAt, updatedBy);

    return successResponse_(action, {
      slug: slug,
      config: config,
      updatedAt: updatedAt,
      updatedBy: updatedBy,
      source: 'google-sheets',
    });
  } catch (error) {
    return errorResponse_(normalizeAction_(payload && payload.action), toErrorMessage_(error));
  }
}

function initBackend_(payload) {
  if (canBootstrapBackend_(payload)) {
    setupScriptProperties(payload);
  } else {
    verifyWriteToken_(payload.writeToken);
  }

  var runtime = getRuntimeContext_();
  var slug = normalizeSlug_(payload.slug) || DEFAULT_RUNTIME_SLUG;
  var updatedBy = normalizeUserLabel_(payload.updatedBy || 'initBackend');
  var seedDefault = payload.seedDefault !== false;
  var force = payload.force === true;
  var seededDefault = false;
  var replacedExisting = false;
  var config = payload.config || null;

  if (seedDefault) {
    if (!config) {
      throw new Error('config is required when seedDefault is true.');
    }

    assertCardConfigShape_(config);
    if (normalizeSlug_(config.slug) !== slug) {
      throw new Error('config.slug must match slug.');
    }

    var updatedAt = new Date().toISOString();
    var existing = findCardRowBySlug_(runtime.sheet, slug);
    if (!existing) {
      upsertCardRow_(runtime.sheet, slug, JSON.stringify(config), updatedAt, updatedBy);
      seededDefault = true;
    } else if (force) {
      upsertCardRow_(runtime.sheet, slug, JSON.stringify(config), updatedAt, updatedBy);
      seededDefault = true;
      replacedExisting = true;
    }
  }

  return {
    initialized: true,
    slug: slug,
    seededDefault: seededDefault,
    replacedExisting: replacedExisting,
    configured: {
      sheetId: runtime.sheetId,
      sheetName: runtime.sheetName,
    },
    sheetAccessible: true,
    spreadsheetName: runtime.spreadsheet.getName(),
    runningInLiveWebApp: true,
    config: config,
  };
}

function createRuntimeSheet_(payload) {
  var title = String(payload.title || 'LIFF Card Runtime v2').trim() || 'LIFF Card Runtime v2';
  var sheetName = sanitizeSheetName_(payload.sheetName || DEFAULT_SHEET_NAME);
  var spreadsheet = SpreadsheetApp.create(title);
  var defaultSheet = spreadsheet.getSheets()[0];

  if (defaultSheet.getName() !== sheetName) {
    defaultSheet.setName(sheetName);
  }

  ensureHeaders_(defaultSheet);

  PropertiesService.getScriptProperties().setProperties(
    {
      CARD_RUNTIME_SHEET_ID: spreadsheet.getId(),
      CARD_RUNTIME_SHEET_NAME: sheetName,
    },
    false,
  );

  return {
    created: true,
    configured: {
      sheetId: spreadsheet.getId(),
      sheetName: sheetName,
    },
    spreadsheetName: spreadsheet.getName(),
    spreadsheetUrl: spreadsheet.getUrl(),
  };
}

function setupScriptProperties(input) {
  var payload = input || {};
  var sheetId = sanitizeSheetId_(payload.sheetId);
  var sheetName = sanitizeSheetName_(payload.sheetName);
  var writeToken = normalizeToken_(payload.writeToken);

  if (!sheetId) {
    throw new Error('sheetId is required.');
  }

  if (!writeToken) {
    throw new Error('writeToken is required.');
  }

  PropertiesService.getScriptProperties().setProperties(
    {
      CARD_RUNTIME_SHEET_ID: sheetId,
      CARD_RUNTIME_SHEET_NAME: sheetName,
      CARD_ADMIN_WRITE_TOKEN: writeToken,
    },
    true,
  );

  return {
    ok: true,
    configured: {
      sheetId: sheetId,
      sheetName: sheetName,
    },
  };
}

function authorizeOfficialRuntimeAccess() {
  var spreadsheet = SpreadsheetApp.openById(OFFICIAL_RUNTIME_SHEET_ID);
  var sheet = spreadsheet.getSheetByName(OFFICIAL_RUNTIME_SHEET_NAME) || spreadsheet.insertSheet(OFFICIAL_RUNTIME_SHEET_NAME);
  ensureHeaders_(sheet);

  return {
    ok: true,
    configured: {
      sheetId: OFFICIAL_RUNTIME_SHEET_ID,
      sheetName: OFFICIAL_RUNTIME_SHEET_NAME,
    },
    spreadsheetName: spreadsheet.getName(),
    sheetAccessible: true,
  };
}

function getRuntimeContext_() {
  var sheetId = sanitizeSheetId_(getScriptProperty_(SCRIPT_PROPERTY_KEYS.sheetId));
  var sheetName = sanitizeSheetName_(getScriptProperty_(SCRIPT_PROPERTY_KEYS.sheetName));
  if (!sheetId) {
    throw new Error('CARD_RUNTIME_SHEET_ID is not configured.');
  }

  var spreadsheet = SpreadsheetApp.openById(sheetId);
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  ensureHeaders_(sheet);

  return {
    sheetId: sheetId,
    sheetName: sheetName,
    spreadsheet: spreadsheet,
    sheet: sheet,
  };
}

function buildHealthPayload_() {
  var configuredSheetId = sanitizeSheetId_(getScriptProperty_(SCRIPT_PROPERTY_KEYS.sheetId));
  var configuredSheetName = sanitizeSheetName_(getScriptProperty_(SCRIPT_PROPERTY_KEYS.sheetName));
  var spreadsheetName = '';
  var sheetAccessible = false;
  var error = '';

  try {
    var runtime = getRuntimeContext_();
    spreadsheetName = runtime.spreadsheet.getName();
    sheetAccessible = true;
  } catch (runtimeError) {
    error = toErrorMessage_(runtimeError);
  }

  return {
    configured: {
      sheetId: configuredSheetId,
      sheetName: configuredSheetName,
    },
    sheetAccessible: sheetAccessible,
    spreadsheetName: spreadsheetName,
    runningInLiveWebApp: true,
    error: error,
  };
}

function buildDebugRuntimeAccessPayload_() {
  var health = buildHealthPayload_();
  return {
    configured: health.configured,
    sheetAccessible: health.sheetAccessible,
    spreadsheetName: health.spreadsheetName,
    runningInLiveWebApp: true,
    scriptId: ScriptApp.getScriptId(),
    serviceUrl: ScriptApp.getService().getUrl(),
    error: health.error,
  };
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, REQUIRED_COLUMNS.length).setValues([REQUIRED_COLUMNS]);
    return;
  }

  var headerRow = sheet.getRange(1, 1, 1, REQUIRED_COLUMNS.length).getValues()[0];
  for (var index = 0; index < REQUIRED_COLUMNS.length; index += 1) {
    if (String(headerRow[index] || '').trim() !== REQUIRED_COLUMNS[index]) {
      throw new Error('Sheet header mismatch. Expected columns: ' + REQUIRED_COLUMNS.join(', '));
    }
  }
}

function findCardRowBySlug_(sheet, slug) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return null;
  }

  var headerMap = createHeaderMap_(values[0]);
  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (normalizeSlug_(values[rowIndex][headerMap.slug]) === slug) {
      return {
        rowIndex: rowIndex + 1,
        configJson: String(values[rowIndex][headerMap.config_json] || ''),
        updatedAt: String(values[rowIndex][headerMap.updated_at] || ''),
        updatedBy: String(values[rowIndex][headerMap.updated_by] || ''),
      };
    }
  }

  return null;
}

function upsertCardRow_(sheet, slug, configJson, updatedAt, updatedBy) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var values = sheet.getDataRange().getValues();
    var headerMap = createHeaderMap_(values[0]);
    var existing = findCardRowBySlug_(sheet, slug);

    if (existing) {
      sheet.getRange(existing.rowIndex, headerMap.config_json + 1).setValue(configJson);
      sheet.getRange(existing.rowIndex, headerMap.updated_at + 1).setValue(updatedAt);
      sheet.getRange(existing.rowIndex, headerMap.updated_by + 1).setValue(updatedBy);
      return;
    }

    sheet.appendRow([slug, configJson, updatedAt, updatedBy]);
  } finally {
    lock.releaseLock();
  }
}

function createHeaderMap_(headerRow) {
  var headerMap = {};
  for (var index = 0; index < headerRow.length; index += 1) {
    headerMap[String(headerRow[index] || '').trim()] = index;
  }

  REQUIRED_COLUMNS.forEach(function (columnName) {
    if (typeof headerMap[columnName] !== 'number') {
      throw new Error('Missing required column: ' + columnName);
    }
  });

  return headerMap;
}

function parseRequestJson_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Missing JSON body.');
  }

  return JSON.parse(e.postData.contents);
}

function readAction_(e) {
  return normalizeAction_(readQueryParam_(e, 'action'));
}

function normalizeAction_(value) {
  return String(value || '').trim();
}

function readQueryParam_(e, key) {
  return e && e.parameter ? String(e.parameter[key] || '') : '';
}

function getScriptProperty_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function canBootstrapBackend_(payload) {
  var configuredWriteToken = normalizeToken_(getScriptProperty_(SCRIPT_PROPERTY_KEYS.writeToken));
  return !configuredWriteToken && !!sanitizeSheetId_(payload.sheetId) && !!normalizeToken_(payload.writeToken);
}

function verifyWriteToken_(candidateToken) {
  var configuredToken = normalizeToken_(getScriptProperty_(SCRIPT_PROPERTY_KEYS.writeToken));
  if (!configuredToken) {
    throw new Error('CARD_ADMIN_WRITE_TOKEN is not configured.');
  }

  if (normalizeToken_(candidateToken) !== configuredToken) {
    throw new Error('Invalid write token.');
  }
}

function normalizeSlug_(value) {
  return String(value || '').replace(/^\/+|\/+$/g, '').trim();
}

function sanitizeSheetId_(value) {
  return String(value || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

function sanitizeSheetName_(value) {
  return String(value || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim() || DEFAULT_SHEET_NAME;
}

function normalizeToken_(value) {
  return String(value || '').trim();
}

function normalizeUserLabel_(value) {
  return String(value || '').trim();
}

function parseStoredConfig_(configJson) {
  if (!configJson) {
    throw new Error('config_json is empty.');
  }

  return JSON.parse(configJson);
}

function successResponse_(action, data) {
  var payload = {
    ok: true,
    action: action,
  };

  copyFields_(payload, data);
  return jsonResponse_(payload);
}

function errorResponse_(action, message) {
  return jsonResponse_({
    ok: false,
    action: action || '',
    error: message,
  });
}

function copyFields_(target, source) {
  if (!source) {
    return target;
  }

  Object.keys(source).forEach(function (key) {
    target[key] = source[key];
  });
  return target;
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function toErrorMessage_(error) {
  if (!error) {
    return 'Unknown error.';
  }

  if (error && error.message) {
    return String(error.message);
  }

  return String(error);
}

function assertCardConfigShape_(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('config must be an object.');
  }

  assertNonEmptyString_(config.id, 'config.id');
  assertNonEmptyString_(config.slug, 'config.slug');
  assertBoolean_(config.isPrimary, 'config.isPrimary');
  assertStringArray_(config.legacySlugs, 'config.legacySlugs');

  assertObject_(config.appearance, 'config.appearance');
  assertNonEmptyString_(config.appearance.theme, 'config.appearance.theme');
  assertNonEmptyString_(config.appearance.layout, 'config.appearance.layout');

  assertObject_(config.modules, 'config.modules');
  assertBoolean_(config.modules.showHighlights, 'config.modules.showHighlights');
  assertBoolean_(config.modules.showSharePanel, 'config.modules.showSharePanel');
  assertBoolean_(config.modules.showQrCode, 'config.modules.showQrCode');

  assertObject_(config.photo, 'config.photo');
  assertNonEmptyString_(config.photo.src, 'config.photo.src');
  assertNonEmptyString_(config.photo.alt, 'config.photo.alt');
  if (config.photo.link !== undefined) {
    assertNonEmptyString_(config.photo.link, 'config.photo.link');
  }

  assertObject_(config.content, 'config.content');
  assertNonEmptyString_(config.content.brandName, 'config.content.brandName');
  assertNonEmptyString_(config.content.fullName, 'config.content.fullName');
  assertNonEmptyString_(config.content.title, 'config.content.title');
  assertNonEmptyString_(config.content.headline, 'config.content.headline');
  assertNonEmptyString_(config.content.subheadline, 'config.content.subheadline');
  assertNonEmptyString_(config.content.intro, 'config.content.intro');
  assertNonEmptyString_(config.content.highlightsTitle, 'config.content.highlightsTitle');
  assertStringArray_(config.content.highlights, 'config.content.highlights');
  assertNonEmptyString_(config.content.actionsTitle, 'config.content.actionsTitle');
  assertNonEmptyString_(config.content.actionsDescription, 'config.content.actionsDescription');
  assertNonEmptyString_(config.content.sharePanelTitle, 'config.content.sharePanelTitle');

  if (!Array.isArray(config.actions)) {
    throw new Error('config.actions must be an array.');
  }

  config.actions.forEach(function (action, index) {
    assertObject_(action, 'config.actions[' + index + ']');
    assertNonEmptyString_(action.id, 'config.actions[' + index + '].id');
    assertNonEmptyString_(action.label, 'config.actions[' + index + '].label');
    if (action.url !== undefined) {
      assertNonEmptyString_(action.url, 'config.actions[' + index + '].url');
    }
    if (action.tone !== undefined) {
      assertNonEmptyString_(action.tone, 'config.actions[' + index + '].tone');
    }
    if (action.enabled !== undefined) {
      assertBoolean_(action.enabled, 'config.actions[' + index + '].enabled');
    }
  });

  assertObject_(config.share, 'config.share');
  if (config.share.title !== undefined) {
    assertNonEmptyString_(config.share.title, 'config.share.title');
  }
  if (config.share.text !== undefined) {
    assertNonEmptyString_(config.share.text, 'config.share.text');
  }
  if (config.share.buttonLabel !== undefined) {
    assertNonEmptyString_(config.share.buttonLabel, 'config.share.buttonLabel');
  }

  assertObject_(config.seo, 'config.seo');
  assertNonEmptyString_(config.seo.title, 'config.seo.title');
  assertNonEmptyString_(config.seo.description, 'config.seo.description');
  assertNonEmptyString_(config.seo.ogTitle, 'config.seo.ogTitle');
  assertNonEmptyString_(config.seo.ogDescription, 'config.seo.ogDescription');
  assertNonEmptyString_(config.seo.ogImage, 'config.seo.ogImage');
}

function assertObject_(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(label + ' must be an object.');
  }
}

function assertNonEmptyString_(value, label) {
  if (String(value || '').trim() === '') {
    throw new Error(label + ' must be a non-empty string.');
  }
}

function assertBoolean_(value, label) {
  if (typeof value !== 'boolean') {
    throw new Error(label + ' must be a boolean.');
  }
}

function assertStringArray_(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(label + ' must be an array.');
  }

  value.forEach(function (item, index) {
    if (String(item || '').trim() === '') {
      throw new Error(label + '[' + index + '] must be a non-empty string.');
    }
  });
}
