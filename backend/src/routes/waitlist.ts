import express from 'express';
import { subscribe } from '../controllers/waitlistController';

const router = express.Router();

// POST /api/waitlist - Cadastrar na lista de espera
router.post('/', subscribe);

export default router;

