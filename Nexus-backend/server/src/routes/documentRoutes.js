import { Router } from 'express';
import * as documentController from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';
import { upload, uploadSignature } from '../middleware/upload.js';

const router = Router();
router.use(protect);

router.post('/', upload.single('file'), documentController.uploadDocument);
router.get('/', documentController.listMyDocuments);
router.get('/:id', documentController.getDocument);
router.post('/:id/share', documentController.shareDocument);
router.post('/:id/sign', uploadSignature.single('signature'), documentController.signDocument);
router.delete('/:id', documentController.deleteDocument);

export default router;
