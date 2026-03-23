import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cloneCardConfig } from '../content/cards/draft';
import { defaultCard } from '../content/cards/default';
import { fetchRemoteCardConfig, listRemoteCards, loadRuntimeCard, publishSnapshotCard, uploadRuntimeImage } from '../lib/card-source';

const createJsonResponse = (payload: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });

describe('card source adapter', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses remote config when remote source succeeds', async () => {
    const remoteConfig = cloneCardConfig(defaultCard);
    remoteConfig.content.fullName = '遠端正式姓名';
    remoteConfig.photo.src = 'https://cdn.example.test/remote-hero.jpg';
    remoteConfig.seo.ogImage = 'https://cdn.example.test/remote-og.jpg';
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        ok: true,
        slug: 'default',
        config: remoteConfig,
      }),
    );

    const result = await loadRuntimeCard('default', {
      baseUrl: 'https://example.test/card-api',
      fetchImpl: fetchMock,
    });

    expect(result.source).toBe('remote');
    expect(result.config.content.fullName).toBe('遠端正式姓名');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/card-api?action=getCard&slug=default',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('falls back to bundled config when remote source fails', async () => {
    const result = await loadRuntimeCard('default', {
      baseUrl: 'https://example.test/card-api',
      fetchImpl: vi.fn().mockRejectedValue(new Error('network down')),
    });

    expect(result.source).toBe('bundled');
    expect(result.config.content.fullName).toBe(defaultCard.content.fullName);
    expect(result.message).toContain('network down');
  });

  it('rejects invalid remote config through the existing validator', async () => {
    const invalidConfig = {
      ...cloneCardConfig(defaultCard),
      photo: {
        ...defaultCard.photo,
        src: '',
      },
    };

    await expect(
      fetchRemoteCardConfig('default', {
        baseUrl: 'https://example.test/card-api',
        fetchImpl: vi.fn().mockResolvedValue(
          createJsonResponse({
            ok: true,
            config: invalidConfig,
          }),
        ),
      }),
    ).rejects.toThrow('card.photo.src 必須存在');
  });

  it('returns upload metadata while preserving the existing upload contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        ok: true,
        fileId: 'drive-file-123',
        publicUrl: 'https://drive.google.com/thumbnail?id=drive-file-123&sz=w2000',
        viewUrl: 'https://drive.google.com/file/d/drive-file-123/view',
        downloadUrl: 'https://drive.google.com/uc?export=download&id=drive-file-123',
        updatedAt: '2026-03-22T11:00:00.000Z',
        updatedBy: 'admin',
      }),
    );

    await expect(
      uploadRuntimeImage({
        slug: 'default',
        field: 'photo',
        adminSession: 'session-123',
        fileName: 'runtime-hero.png',
        mimeType: 'image/png',
        base64Data: 'cHJlcGFyZWQ=',
        baseUrl: 'https://example.test/card-api',
        fetchImpl: fetchMock,
      }),
    ).resolves.toEqual({
      fileId: 'drive-file-123',
      publicUrl: 'https://drive.google.com/thumbnail?id=drive-file-123&sz=w2000',
      viewUrl: 'https://drive.google.com/file/d/drive-file-123/view',
      downloadUrl: 'https://drive.google.com/uc?export=download&id=drive-file-123',
      updatedAt: '2026-03-22T11:00:00.000Z',
      updatedBy: 'admin',
      mimeType: undefined,
    });
  });

  it('lists live and snapshot records from the backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        ok: true,
        cards: [
          { slug: 'default', isLive: true, updatedAt: '2026-03-22T10:00:00.000Z', updatedBy: 'admin' },
          { slug: 'default-v-20260322t100000z', isLive: false, versionId: '20260322T100000Z', publishedAt: '2026-03-22T10:00:00.000Z' },
        ],
      }),
    );

    await expect(
      listRemoteCards({
        baseUrl: 'https://example.test/card-api',
        fetchImpl: fetchMock,
      }),
    ).resolves.toEqual([
      { slug: 'default', isLive: true, updatedAt: '2026-03-22T10:00:00.000Z', updatedBy: 'admin', versionId: undefined, publishedAt: undefined },
      { slug: 'default-v-20260322t100000z', isLive: false, versionId: '20260322T100000Z', publishedAt: '2026-03-22T10:00:00.000Z', updatedAt: undefined, updatedBy: undefined },
    ]);
  });

  it('publishes a snapshot while preserving the current live slug contract', async () => {
    const snapshotConfig = cloneCardConfig(defaultCard);
    snapshotConfig.slug = 'default-v-20260322t100000z';
    snapshotConfig.version = {
      kind: 'snapshot',
      versionId: '20260322T100000Z',
      publishedAt: '2026-03-22T10:00:00.000Z',
      liveSlug: 'default',
      sourceSlug: 'default',
    };
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        ok: true,
        slug: snapshotConfig.slug,
        updatedAt: '2026-03-22T10:00:00.000Z',
        updatedBy: 'admin',
        versionId: '20260322T100000Z',
        publishedAt: '2026-03-22T10:00:00.000Z',
        config: snapshotConfig,
      }),
    );

    await expect(
      publishSnapshotCard('default', defaultCard, {
        baseUrl: 'https://example.test/card-api',
        adminSession: 'session-123',
        fetchImpl: fetchMock,
      }),
    ).resolves.toMatchObject({
      slug: 'default-v-20260322t100000z',
      versionId: '20260322T100000Z',
      publishedAt: '2026-03-22T10:00:00.000Z',
    });
  });
});
