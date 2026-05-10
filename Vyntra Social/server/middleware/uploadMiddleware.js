import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 2
  }
});

export const profileImageUpload = upload.single('profile_image');
export const coverImageUpload = upload.single('cover_image');
export const postMediaUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'pdf', maxCount: 1 }
]);
