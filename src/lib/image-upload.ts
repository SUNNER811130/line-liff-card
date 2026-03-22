const MAX_IMAGE_DIMENSION = 1600;
const DEFAULT_IMAGE_QUALITY = 0.82;

export const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024;

type PreparedImageUpload = {
  fileName: string;
  mimeType: string;
  base64Data: string;
  previewUrl: string;
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('讀取圖片失敗。'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });

const loadImageElement = (source: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error('載入圖片失敗。'));
    image.onload = () => resolve(image);
    image.src = source;
  });

const normalizeMimeType = (mimeType: string): string =>
  /image\/(png|jpeg|webp)/i.test(mimeType) ? mimeType.toLowerCase() : 'image/jpeg';

const canvasToBlob = (canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('壓縮圖片失敗。'));
        return;
      }

      resolve(blob);
    }, mimeType, quality);
  });

const stripDataUrlPrefix = (dataUrl: string): string => {
  const separatorIndex = dataUrl.indexOf(',');
  return separatorIndex === -1 ? dataUrl : dataUrl.slice(separatorIndex + 1);
};

const getScaledSize = (width: number, height: number) => {
  const maxDimension = Math.max(width, height);
  if (maxDimension <= MAX_IMAGE_DIMENSION) {
    return { width, height };
  }

  const scale = MAX_IMAGE_DIMENSION / maxDimension;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
};

export const prepareImageUpload = async (file: File): Promise<PreparedImageUpload> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('只支援圖片檔案。');
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error(`圖片檔案過大，請改用 ${Math.floor(MAX_UPLOAD_SIZE_BYTES / 1024 / 1024)}MB 以下的圖片。`);
  }

  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageElement(originalDataUrl);
  const targetMimeType = normalizeMimeType(file.type);
  const { width, height } = getScaledSize(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('目前瀏覽器無法處理圖片壓縮。');
  }

  context.drawImage(image, 0, 0, width, height);
  const blob = await canvasToBlob(canvas, targetMimeType, DEFAULT_IMAGE_QUALITY);
  const compressedDataUrl = await readFileAsDataUrl(new File([blob], file.name, { type: blob.type || targetMimeType }));

  return {
    fileName: file.name,
    mimeType: blob.type || targetMimeType,
    base64Data: stripDataUrlPrefix(compressedDataUrl),
    previewUrl: compressedDataUrl,
  };
};
