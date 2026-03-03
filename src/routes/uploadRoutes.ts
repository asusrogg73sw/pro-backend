import { Router, Request, Response } from 'express';
import upload from '../utils/fileUpload';
import { admin, protect } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', protect, admin, upload.single('image'), (req: Request, res: Response) => {
  res.send({
    message: 'Image Uploaded',
    image: `/${req.file?.path}`, // Ye path hum database mein save karenge
  });
});

export default router;