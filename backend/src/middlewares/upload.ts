import multer from 'multer';
import { Request } from 'express';

// Configuração de armazenamento em memória (não salva no disco)
const storage = multer.memoryStorage();

// Filtro para aceitar apenas arquivos CSV
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Verifica extensão do arquivo
  if (file.mimetype === 'text/csv' || 
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos CSV são permitidos'));
  }
};

// Configuração do multer
export const uploadCSV = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  }
});

