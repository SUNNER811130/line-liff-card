var ACTION_GET_CARD = 'getCard';
var ACTION_SAVE_CARD = 'saveCard';
var DEFAULT_SHEET_NAME = 'cards_runtime';
var REQUIRED_COLUMNS = ['slug', 'config_json', 'updated_at', 'updated_by'];

function doGet(e) {
  try {
    var action = getParameter_(e, 'action');
    if (action !== ACTION_GET_CARD) {
      return jsonResponse_(false, null, 'Unsupported action.');
    }

    var slug = normalizeSlug_(getParameter_(e, 'slug'));
    if (!slug) {
      return jsonResponse_(false, null, 'slug is required.');
    }

    var row = getCardRowBySlug_(slug);
    if (!row) {
      return jsonResponse_(false, null, 'Card not found.');
    }

    var config = parseConfigJson_(row.config_json);
    assertCardConfigShape_(config);

    return jsonResponse_(true, {
      slug: slug,
      config: config,
      updatedAt: row.updated_at || '',
      updatedBy: row.updated_by || '',
      source: 'google-sheets',
    });
  } catch (error) {
    return jsonResponse_(false, null, toErrorMessage_(error));
  }
}

function doPost(e) {
  try {
    var payload = parseRequestBody_(e);
    if (payload.action !== ACTION_SAVE_CARD) {
      return jsonResponse_(false, null, 'Unsupported action.');
    }

    var writeToken = getScriptProperty_('CARD_ADMIN_WRITE_TOKEN');
    if (!writeToken) {
      throw new Error('CARD_ADMIN_WRITE_TOKEN is not configured.');
    }

    if (String(payload.writeToken || '') !== writeToken) {
      return jsonResponse_(false, null, 'Invalid write token.');
    }

    var slug = normalizeSlug_(payload.slug);
    if (!slug) {
      return jsonResponse_(false, null, 'slug is required.');
    }

    var config = payload.config;
    assertCardConfigShape_(config);
    if (String(config.slug || '') !== slug) {
      return jsonResponse_(false, null, 'config.slug must match slug.');
    }

    var updatedBy = String(payload.updatedBy || '').trim();
    var updatedAt = new Date().toISOString();
    saveCardRow_(slug, JSON.stringify(config), updatedAt, updatedBy);

    return jsonResponse_(true, {
      slug: slug,
      config: config,
      updatedAt: updatedAt,
      updatedBy: updatedBy,
      source: 'google-sheets',
    });
  } catch (error) {
    return jsonResponse_(false, null, toErrorMessage_(error));
  }
}

function getCardRowBySlug_(slug) {
  var sheet = getRuntimeSheet_();
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return null;
  }

  var headerMap = createHeaderMap_(values[0]);
  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (String(values[rowIndex][headerMap.slug] || '').trim() === slug) {
      return {
        rowIndex: rowIndex + 1,
        slug: String(values[rowIndex][headerMap.slug] || ''),
        config_json: String(values[rowIndex][headerMap.config_json] || ''),
        updated_at: String(values[rowIndex][headerMap.updated_at] || ''),
        updated_by: String(values[rowIndex][headerMap.updated_by] || ''),
      };
    }
  }

  return null;
}

function saveCardRow_(slug, configJson, updatedAt, updatedBy) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var sheet = getRuntimeSheet_();
    var values = sheet.getDataRange().getValues();
    var headerMap = createHeaderMap_(values[0]);
    var existing = getCardRowBySlug_(slug);

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

function getRuntimeSheet_() {
  var sheetId = getScriptProperty_('CARD_RUNTIME_SHEET_ID');
  if (!sheetId) {
    throw new Error('CARD_RUNTIME_SHEET_ID is not configured.');
  }

  var sheetName = getScriptProperty_('CARD_RUNTIME_SHEET_NAME') || DEFAULT_SHEET_NAME;
  var spreadsheet = SpreadsheetApp.openById(sheetId);
  var sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('Sheet "' + sheetName + '" was not found.');
  }

  ensureHeaders_(sheet);
  return sheet;
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(REQUIRED_COLUMNS);
    return;
  }

  var headerRow = sheet.getRange(1, 1, 1, REQUIRED_COLUMNS.length).getValues()[0];
  var existingHeaders = headerRow.map(function (value) {
    return String(value || '').trim();
  });

  for (var index = 0; index < REQUIRED_COLUMNS.length; index += 1) {
    if (existingHeaders[index] !== REQUIRED_COLUMNS[index]) {
      throw new Error('Sheet header mismatch. Expected columns: ' + REQUIRED_COLUMNS.join(', '));
    }
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

function parseRequestBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Missing JSON body.');
  }

  return JSON.parse(e.postData.contents);
}

function parseConfigJson_(configJson) {
  if (!configJson) {
    throw new Error('config_json is empty.');
  }

  return JSON.parse(configJson);
}

function getParameter_(e, key) {
  return e && e.parameter ? String(e.parameter[key] || '') : '';
}

function getScriptProperty_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function normalizeSlug_(slug) {
  return String(slug || '').replace(/^\/+|\/+$/g, '').trim();
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
  });

  assertObject_(config.share, 'config.share');
  assertObject_(config.seo, 'config.seo');
  assertNonEmptyString_(config.seo.title, 'config.seo.title');
  assertNonEmptyString_(config.seo.description, 'config.seo.description');
  assertNonEmptyString_(config.seo.ogTitle, 'config.seo.ogTitle');
  assertNonEmptyString_(config.seo.ogDescription, 'config.seo.ogDescription');
  assertNonEmptyString_(config.seo.ogImage, 'config.seo.ogImage');
}

function assertObject_(value, fieldName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(fieldName + ' must be an object.');
  }
}

function assertNonEmptyString_(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(fieldName + ' must be a non-empty string.');
  }
}

function assertBoolean_(value, fieldName) {
  if (typeof value !== 'boolean') {
    throw new Error(fieldName + ' must be a boolean.');
  }
}

function assertStringArray_(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(fieldName + ' must be an array.');
  }

  value.forEach(function (item) {
    if (typeof item !== 'string' || item.trim() === '') {
      throw new Error(fieldName + ' must contain non-empty strings.');
    }
  });
}

function jsonResponse_(ok, data, errorMessage) {
  var payload = {
    ok: ok,
  };

  if (data) {
    Object.keys(data).forEach(function (key) {
      payload[key] = data[key];
    });
  }

  if (!ok) {
    payload.error = errorMessage || 'Unknown error.';
  }

  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function toErrorMessage_(error) {
  return error && error.message ? error.message : 'Unknown server error.';
}
