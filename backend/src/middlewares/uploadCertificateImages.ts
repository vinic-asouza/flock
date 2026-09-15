import multer from 'multer';
import { Request } from 'express';

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const ALLOWED_EXT = /\.(png|jpe?g|webp)$/i;

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const mimeOk = ALLOWED_MIME.has(file.mimetype);
  const extOk = ALLOWED_EXT.test(file.originalname || '');
  if (mimeOk || extOk) {
    cb(null, true);
    return;
  }
  cb(new Error('Apenas imagens PNG, JPEG ou WebP são permitidas'));
};

/** Uploads efêmeros de logos para emissão de certificados (memória). */
export const uploadCertificateImages = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 3,
  },
});
