var ACTIONS = {
  health: 'health',
  getCard: 'getCard',
  listCards: 'listCards',
  saveCard: 'saveCard',
  publishSnapshot: 'publishSnapshot',
  createAdminSession: 'createAdminSession',
  verifyAdminSession: 'verifyAdminSession',
  uploadImage: 'uploadImage',
};

var DEFAULT_RUNTIME_SHEET_NAME = 'cards_runtime';
var DEFAULT_RUNTIME_SLUG = 'default';
var REQUIRED_COLUMNS = ['slug', 'config_json', 'updated_at', 'updated_by'];
var SCRIPT_PROPERTY_KEYS = {
  adminWriteSecret: 'ADMIN_WRITE_SECRET',
  adminSessionSecret: 'ADMIN_SESSION_SECRET',
  adminSessionTtlSeconds: 'ADMIN_SESSION_TTL_SECONDS',
  driveUploadFolderId: 'DRIVE_UPLOAD_FOLDER_ID',
};
var MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function setupScriptProperties(options) {
  var payload = options || {};
  var scriptProperties = PropertiesService.getScriptProperties();
  var properties = {};
  var updatedBy = normalizeUserLabel_(payload.updatedBy || 'codex-provision');
  var now = new Date().toISOString();

  properties[SCRIPT_PROPERTY_KEYS.adminWriteSecret] = sanitizeBootstrapProperty_(payload.adminWriteSecret, SCRIPT_PROPERTY_KEYS.adminWriteSecret);
  properties[SCRIPT_PROPERTY_KEYS.adminSessionSecret] = sanitizeBootstrapProperty_(payload.adminSessionSecret, SCRIPT_PROPERTY_KEYS.adminSessionSecret);
  properties[SCRIPT_PROPERTY_KEYS.adminSessionTtlSeconds] = String(
    Number(payload.adminSessionTtlSeconds || 3600) || 3600
  );
  properties[SCRIPT_PROPERTY_KEYS.driveUploadFolderId] = sanitizeBootstrapProperty_(payload.driveUploadFolderId, SCRIPT_PROPERTY_KEYS.driveUploadFolderId);
  scriptProperties.setProperties(properties, false);

  var runtime = getRuntimeContext_();
  var slug = normalizeSlug_(payload.slug) || DEFAULT_RUNTIME_SLUG;
  var seedConfig = payload.seedConfig;
  if (!seedConfig || typeof seedConfig !== 'object') {
    throw new Error('seedConfig is required.');
  }

  assertCardConfigShape_(seedConfig);
  if (normalizeSlug_(seedConfig.slug) !== slug) {
    throw new Error('seedConfig.slug must match slug.');
  }

  upsertCardRow_(runtime.sheet, slug, JSON.stringify(seedConfig), now, updatedBy);

  return {
    ok: true,
    slug: slug,
    updatedAt: now,
    updatedBy: updatedBy,
    spreadsheetId: runtime.spreadsheet.getId(),
    sheetName: runtime.sheet.getName(),
    scriptId: ScriptApp.getScriptId(),
    propertyKeys: Object.keys(properties),
  };
}

function doGet(e) {
  try {
    var action = readAction_(e);

    if (action === ACTIONS.health) {
      return successResponse_(action, buildHealthPayload_());
    }

    if (action === ACTIONS.listCards) {
      return successResponse_(action, listCards_());
    }

    if (action !== ACTIONS.getCard) {
      return errorResponse_(action, 'Unsupported action.');
    }

    var slug = normalizeSlug_(readQueryParam_(e, 'slug'));
    if (!slug) {
      throw new Error('slug is required.');
    }

    var runtime = getRuntimeContext_();
    var row = findCardRowBySlug_(runtime.sheet, slug);
    if (!row) {
      throw new Error('Card not found.');
    }

    return successResponse_(action, {
      slug: slug,
      config: parseStoredConfig_(row.configJson),
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
      source: 'bound-spreadsheet',
    });
  } catch (error) {
    return errorResponse_(readAction_(e), toErrorMessage_(error));
  }
}

function doPost(e) {
  var payload = {};
  try {
    payload = parseRequestJson_(e);
    var action = normalizeAction_(payload.action);

    if (action === ACTIONS.createAdminSession) {
      return successResponse_(action, createAdminSession_(payload));
    }

    if (action === ACTIONS.verifyAdminSession) {
      return successResponse_(action, verifyAdminSession_(payload));
    }

    if (action === ACTIONS.uploadImage) {
      return successResponse_(action, uploadImage_(payload));
    }

    if (action === ACTIONS.publishSnapshot) {
      return successResponse_(action, publishSnapshot_(payload));
    }

    if (action !== ACTIONS.saveCard) {
      return errorResponse_(action, 'Unsupported action.');
    }

    return successResponse_(action, saveCard_(payload));
  } catch (error) {
    return errorResponse_(normalizeAction_(payload && payload.action), toErrorMessage_(error));
  }
}

function saveCard_(payload) {
  var session = verifyAdminSessionToken_(payload.adminSession);
  var slug = normalizeSlug_(payload.slug);
  if (!slug) {
    throw new Error('slug is required.');
  }

  var config = payload.config;
  assertCardConfigShape_(config);
  if (normalizeSlug_(config.slug) !== slug) {
    throw new Error('config.slug must match slug.');
  }

  if (!isLiveSlug_(slug, config)) {
    throw new Error('Snapshot cards are immutable. Please switch back to live/default before saving.');
  }

  var runtime = getRuntimeContext_();
  var updatedAt = new Date().toISOString();
  var updatedBy = normalizeUserLabel_(payload.updatedBy || session.subject || 'admin');
  var liveConfig = buildLiveConfig_(config, slug);
  upsertCardRow_(runtime.sheet, slug, JSON.stringify(liveConfig), updatedAt, updatedBy);

  return {
    slug: slug,
    config: liveConfig,
    updatedAt: updatedAt,
    updatedBy: updatedBy,
    source: 'bound-spreadsheet',
  };
}

function publishSnapshot_(payload) {
  var session = verifyAdminSessionToken_(payload.adminSession);
  var slug = normalizeSlug_(payload.slug) || DEFAULT_RUNTIME_SLUG;
  var config = payload.config;
  assertCardConfigShape_(config);
  if (normalizeSlug_(config.slug) !== slug) {
    throw new Error('config.slug must match slug.');
  }

  if (!isLiveSlug_(slug, config)) {
    throw new Error('Only live/default can publish snapshots.');
  }

  var runtime = getRuntimeContext_();
  var updatedAt = new Date().toISOString();
  var updatedBy = normalizeUserLabel_(payload.updatedBy || session.subject || 'admin');
  var liveConfig = buildLiveConfig_(config, slug);
  upsertCardRow_(runtime.sheet, slug, JSON.stringify(liveConfig), updatedAt, updatedBy);

  var versionId = createVersionId_(updatedAt);
  var snapshotSlug = buildSnapshotSlug_(slug, versionId);
  var snapshotConfig = buildSnapshotConfig_(liveConfig, slug, snapshotSlug, versionId, updatedAt);
  upsertCardRow_(runtime.sheet, snapshotSlug, JSON.stringify(snapshotConfig), updatedAt, updatedBy);

  return {
    slug: snapshotSlug,
    config: snapshotConfig,
    updatedAt: updatedAt,
    updatedBy: updatedBy,
    versionId: versionId,
    publishedAt: updatedAt,
    source: 'bound-spreadsheet',
  };
}

function createAdminSession_(payload) {
  var secret = normalizeToken_(payload.secret);
  var configuredSecret = sanitizeRequiredScriptProperty_(SCRIPT_PROPERTY_KEYS.adminWriteSecret);
  if (secret !== configuredSecret) {
    throw new Error('管理員解鎖失敗。');
  }

  return buildAdminSessionPayload_();
}

function verifyAdminSession_(payload) {
  var session = verifyAdminSessionToken_(payload.adminSession);
  return {
    valid: true,
    expiresAt: session.expiresAt,
  };
}

function uploadImage_(payload) {
  var session = verifyAdminSessionToken_(payload.adminSession);

  var folderId = sanitizeRequiredScriptProperty_(SCRIPT_PROPERTY_KEYS.driveUploadFolderId);
  var folder = DriveApp.getFolderById(folderId);
  var slug = normalizeSlug_(payload.slug) || DEFAULT_RUNTIME_SLUG;
  var field = normalizeAssetField_(payload.field);
  var fileName = sanitizeUploadFileName_(payload.fileName);
  var mimeType = sanitizeUploadMimeType_(payload.mimeType);
  var base64Data = String(payload.base64Data || '').trim();
  if (!base64Data) {
    throw new Error('base64Data is required.');
  }

  var bytes = Utilities.base64Decode(base64Data);
  if (!bytes.length) {
    throw new Error('圖片內容為空。');
  }

  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error('圖片檔案過大。');
  }

  var blob = Utilities.newBlob(bytes, mimeType, buildStoredFileName_(slug, field, fileName));
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var publicUrl = buildDrivePublicUrl_(file.getId());
  var runtime = getRuntimeContext_();
  var row = findCardRowBySlug_(runtime.sheet, slug);
  if (!row) {
    throw new Error('Card not found.');
  }

  var config = parseStoredConfig_(row.configJson);
  if (!isLiveSlug_(slug, config)) {
    throw new Error('Snapshot cards are immutable. Please switch back to live/default before uploading.');
  }
  if (field === 'photo') {
    config.photo.src = publicUrl;
  } else {
    config.seo.ogImage = publicUrl;
  }

  assertCardConfigShape_(config);
  var updatedAt = new Date().toISOString();
  var updatedBy = normalizeUserLabel_(session.subject || 'admin');
  var liveConfig = buildLiveConfig_(config, slug);
  upsertCardRow_(runtime.sheet, slug, JSON.stringify(liveConfig), updatedAt, updatedBy);

  return {
    slug: slug,
    fileId: file.getId(),
    publicUrl: publicUrl,
    viewUrl: file.getUrl(),
    downloadUrl: buildDriveDownloadUrl_(file.getId()),
    mimeType: file.getMimeType(),
    config: liveConfig,
    updatedAt: updatedAt,
    updatedBy: updatedBy,
    source: 'bound-spreadsheet',
  };
}

function listCards_() {
  var runtime = getRuntimeContext_();
  var rows = listCardRows_(runtime.sheet);

  return {
    cards: rows
      .map(function(row) {
        var config;
        try {
          config = parseStoredConfig_(row.configJson);
        } catch (error) {
          return null;
        }

        return buildCardSummary_(row, config);
      })
      .filter(Boolean),
    source: 'bound-spreadsheet',
  };
}

function buildHealthPayload_() {
  var runtime = getRuntimeContext_();
  var folderId = getScriptProperty_(SCRIPT_PROPERTY_KEYS.driveUploadFolderId);
  var folderReady = false;
  var folderName = '';

  if (folderId) {
    try {
      var folder = DriveApp.getFolderById(folderId);
      folderName = folder.getName();
      folderReady = true;
    } catch (error) {
      folderName = toErrorMessage_(error);
    }
  }

  return {
    sheetAccessible: true,
    spreadsheetId: runtime.spreadsheet.getId(),
    spreadsheetName: runtime.spreadsheet.getName(),
    sheetName: runtime.sheet.getName(),
    boundScriptId: ScriptApp.getScriptId(),
    runtimeSource: 'bound-spreadsheet',
    configured: {
      adminSessionTtlSeconds: getSessionTtlSeconds_(),
      driveUploadFolderConfigured: Boolean(folderId),
    },
    driveFolderReady: folderReady,
    driveFolderName: folderName,
  };
}

function getRuntimeContext_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('This Apps Script must be bound to the official spreadsheet.');
  }

  var sheetName = sanitizeSheetName_(DEFAULT_RUNTIME_SHEET_NAME);
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  ensureHeaders_(sheet);

  return {
    spreadsheet: spreadsheet,
    sheet: sheet,
  };
}

function ensureHeaders_(sheet) {
  var headerRange = sheet.getRange(1, 1, 1, REQUIRED_COLUMNS.length);
  var currentValues = headerRange.getValues()[0];
  var hasHeaders = REQUIRED_COLUMNS.every(function(header, index) {
    return normalizeCell_(currentValues[index]) === header;
  });

  if (!hasHeaders) {
    headerRange.setValues([REQUIRED_COLUMNS]);
  }
}

function findCardRowBySlug_(sheet, slug) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return null;
  }

  var values = sheet.getRange(2, 1, lastRow - 1, REQUIRED_COLUMNS.length).getValues();
  for (var index = 0; index < values.length; index += 1) {
    if (normalizeSlug_(values[index][0]) === slug) {
      return {
        rowIndex: index + 2,
        slug: normalizeSlug_(values[index][0]),
        configJson: String(values[index][1] || ''),
        updatedAt: String(values[index][2] || ''),
        updatedBy: String(values[index][3] || ''),
      };
    }
  }

  return null;
}

function listCardRows_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  var values = sheet.getRange(2, 1, lastRow - 1, REQUIRED_COLUMNS.length).getValues();
  return values.map(function(row, index) {
    return {
      rowIndex: index + 2,
      slug: normalizeSlug_(row[0]),
      configJson: String(row[1] || ''),
      updatedAt: String(row[2] || ''),
      updatedBy: String(row[3] || ''),
    };
  }).filter(function(row) {
    return Boolean(row.slug);
  });
}

function upsertCardRow_(sheet, slug, configJson, updatedAt, updatedBy) {
  var existing = findCardRowBySlug_(sheet, slug);
  var values = [[slug, configJson, updatedAt, updatedBy]];
  if (existing) {
    sheet.getRange(existing.rowIndex, 1, 1, REQUIRED_COLUMNS.length).setValues(values);
    return;
  }

  sheet.getRange(sheet.getLastRow() + 1, 1, 1, REQUIRED_COLUMNS.length).setValues(values);
}

function assertCardConfigShape_(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('config must be an object.');
  }

  if (!normalizeSlug_(config.slug)) {
    throw new Error('config.slug is required.');
  }

  if (!config.content || !String(config.content.fullName || '').trim()) {
    throw new Error('config.content.fullName is required.');
  }

  if (!config.photo || !String(config.photo.src || '').trim()) {
    throw new Error('config.photo.src is required.');
  }

  if (!config.seo || !String(config.seo.ogImage || '').trim()) {
    throw new Error('config.seo.ogImage is required.');
  }
}

function buildAdminSessionPayload_() {
  var nowMs = new Date().getTime();
  var ttlSeconds = getSessionTtlSeconds_();
  var expiresAtMs = nowMs + ttlSeconds * 1000;
  var expiresAt = new Date(expiresAtMs).toISOString();
  var payload = {
    exp: expiresAtMs,
    subject: 'admin',
  };

  return {
    adminSession: signSessionPayload_(payload),
    expiresAt: expiresAt,
  };
}

function verifyAdminSessionToken_(token) {
  var parts = String(token || '').split('.');
  if (parts.length !== 2) {
    throw new Error('管理員 session 無效，請重新解鎖。');
  }

  var payloadJson = decodeWebSafeString_(parts[0]);
  var signature = parts[1];
  var expectedSignature = computeSignature_(parts[0]);
  if (signature !== expectedSignature) {
    throw new Error('管理員 session 無效，請重新解鎖。');
  }

  var payload = JSON.parse(payloadJson);
  if (!payload.exp || Number(payload.exp) <= new Date().getTime()) {
    throw new Error('管理員 session 已過期，請重新解鎖。');
  }

  return {
    expiresAt: new Date(Number(payload.exp)).toISOString(),
    subject: String(payload.subject || 'admin'),
  };
}

function signSessionPayload_(payload) {
  var encodedPayload = encodeWebSafeString_(JSON.stringify(payload));
  return encodedPayload + '.' + computeSignature_(encodedPayload);
}

function computeSignature_(encodedPayload) {
  var secret = sanitizeRequiredScriptProperty_(SCRIPT_PROPERTY_KEYS.adminSessionSecret);
  var bytes = Utilities.computeHmacSha256Signature(encodedPayload, secret);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
}

function getSessionTtlSeconds_() {
  var ttl = Number(getScriptProperty_(SCRIPT_PROPERTY_KEYS.adminSessionTtlSeconds) || 3600);
  if (!ttl || ttl < 300) {
    return 3600;
  }

  return Math.floor(ttl);
}

function parseStoredConfig_(configJson) {
  if (!configJson) {
    throw new Error('Stored config is empty.');
  }

  return JSON.parse(configJson);
}

function parseRequestJson_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Missing request body.');
  }

  return JSON.parse(e.postData.contents);
}

function readAction_(e) {
  return normalizeAction_(readQueryParam_(e, 'action'));
}

function readQueryParam_(e, key) {
  return e && e.parameter && key in e.parameter ? e.parameter[key] : '';
}

function normalizeAction_(value) {
  return String(value || '').trim();
}

function normalizeSlug_(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeToken_(value) {
  return String(value || '').trim();
}

function normalizeCell_(value) {
  return String(value || '').trim();
}

function normalizeUserLabel_(value) {
  var trimmed = String(value || '').trim();
  return trimmed || 'admin';
}

function getVersionMeta_(config) {
  var version = config && config.version && typeof config.version === 'object' ? config.version : null;
  return {
    kind: version && (version.kind === 'live' || version.kind === 'snapshot') ? version.kind : null,
    versionId: version && version.versionId ? String(version.versionId).trim() : '',
    publishedAt: version && version.publishedAt ? String(version.publishedAt).trim() : '',
    liveSlug: version && version.liveSlug ? normalizeSlug_(version.liveSlug) : '',
    sourceSlug: version && version.sourceSlug ? normalizeSlug_(version.sourceSlug) : '',
  };
}

function isLiveSlug_(slug, config) {
  var normalizedSlug = normalizeSlug_(slug);
  if (normalizedSlug === DEFAULT_RUNTIME_SLUG) {
    return true;
  }

  return getVersionMeta_(config).kind === 'live';
}

function buildLiveConfig_(config, slug) {
  var nextConfig = JSON.parse(JSON.stringify(config));
  nextConfig.slug = normalizeSlug_(slug) || DEFAULT_RUNTIME_SLUG;
  nextConfig.version = {
    kind: 'live',
    liveSlug: nextConfig.slug,
    sourceSlug: nextConfig.slug,
  };
  return nextConfig;
}

function buildSnapshotConfig_(config, liveSlug, snapshotSlug, versionId, publishedAt) {
  var nextConfig = JSON.parse(JSON.stringify(config));
  nextConfig.slug = snapshotSlug;
  nextConfig.version = {
    kind: 'snapshot',
    versionId: versionId,
    publishedAt: publishedAt,
    liveSlug: normalizeSlug_(liveSlug) || DEFAULT_RUNTIME_SLUG,
    sourceSlug: normalizeSlug_(liveSlug) || DEFAULT_RUNTIME_SLUG,
  };
  return nextConfig;
}

function createVersionId_(publishedAt) {
  return Utilities.formatDate(new Date(publishedAt), 'UTC', "yyyyMMdd'T'HHmmss'Z'");
}

function buildSnapshotSlug_(liveSlug, versionId) {
  return [normalizeSlug_(liveSlug) || DEFAULT_RUNTIME_SLUG, 'v', normalizeSlug_(versionId).replace(/[^a-z0-9]+/g, '-')].join('-');
}

function buildCardSummary_(row, config) {
  var version = getVersionMeta_(config);
  var isLive = row.slug === DEFAULT_RUNTIME_SLUG || version.kind === 'live';

  return {
    slug: row.slug,
    isLive: isLive,
    versionId: version.versionId || '',
    publishedAt: version.publishedAt || '',
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

function normalizeAssetField_(value) {
  var trimmed = String(value || '').trim();
  if (trimmed !== 'photo' && trimmed !== 'ogImage') {
    throw new Error('Unsupported image field.');
  }

  return trimmed;
}

function sanitizeUploadFileName_(value) {
  var trimmed = String(value || '').trim();
  if (!trimmed) {
    return 'upload.jpg';
  }

  return trimmed.replace(/[^\w.\-]+/g, '-');
}

function sanitizeUploadMimeType_(value) {
  var trimmed = String(value || '').trim().toLowerCase();
  if (!/^image\/(png|jpeg|jpg|webp)$/.test(trimmed)) {
    throw new Error('Unsupported image mime type.');
  }

  return trimmed === 'image/jpg' ? 'image/jpeg' : trimmed;
}

function buildStoredFileName_(slug, field, fileName) {
  var timestamp = Utilities.formatDate(new Date(), 'UTC', "yyyyMMdd'T'HHmmss'Z'");
  return [slug, field, timestamp, fileName].join('-');
}

function sanitizeSheetName_(value) {
  var trimmed = String(value || DEFAULT_RUNTIME_SHEET_NAME).trim();
  return trimmed || DEFAULT_RUNTIME_SHEET_NAME;
}

function getScriptProperty_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function sanitizeRequiredScriptProperty_(key) {
  var value = getScriptProperty_(key);
  if (!String(value || '').trim()) {
    throw new Error('Missing Script Property: ' + key);
  }

  return String(value).trim();
}

function sanitizeBootstrapProperty_(value, key) {
  var trimmed = String(value || '').trim();
  if (!trimmed) {
    throw new Error('Missing bootstrap property: ' + key);
  }

  return trimmed;
}

function encodeWebSafeString_(value) {
  return Utilities.base64EncodeWebSafe(Utilities.newBlob(value).getBytes()).replace(/=+$/g, '');
}

function decodeWebSafeString_(value) {
  var bytes = Utilities.base64DecodeWebSafe(value);
  return Utilities.newBlob(bytes).getDataAsString();
}

function buildDrivePublicUrl_(fileId) {
  return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w2000';
}

function buildDriveDownloadUrl_(fileId) {
  return 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(fileId);
}

function successResponse_(action, payload) {
  return ContentService
    .createTextOutput(JSON.stringify(mergeObjects_({ ok: true, action: action }, payload)))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse_(action, message) {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: false,
      action: action || '',
      error: message,
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function mergeObjects_(left, right) {
  var result = {};
  var key;
  for (key in left) {
    if (Object.prototype.hasOwnProperty.call(left, key)) {
      result[key] = left[key];
    }
  }
  for (key in right) {
    if (Object.prototype.hasOwnProperty.call(right, key)) {
      result[key] = right[key];
    }
  }

  return result;
}

function toErrorMessage_(error) {
  return error && error.message ? error.message : String(error || 'Unknown error.');
}
