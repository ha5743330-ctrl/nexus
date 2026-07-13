import { Document } from '../models/Document.js';
import { catchAsync, AppError } from '../utils/AppError.js';

const canAccess = (doc, userId) =>
  String(doc.owner) === String(userId) || doc.sharedWith.some((id) => String(id) === String(userId));

export const uploadDocument = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('No file uploaded.', 400));

  const doc = await Document.create({
    name: req.body.name || req.file.originalname,
    type: req.file.mimetype,
    size: req.file.size,
    url: `/uploads/${req.file.filename}`,
    owner: req.user._id,
    sharedWith: req.body.sharedWith ? JSON.parse(req.body.sharedWith) : [],
  });

  res.status(201).json({ status: 'success', document: doc });
});

export const listMyDocuments = catchAsync(async (req, res) => {
  const docs = await Document.find({
    $or: [{ owner: req.user._id }, { sharedWith: req.user._id }],
  })
    .populate('owner', 'name avatarUrl')
    .sort('-createdAt');

  res.status(200).json({ status: 'success', results: docs.length, documents: docs });
});

export const getDocument = catchAsync(async (req, res, next) => {
  const doc = await Document.findById(req.params.id).populate('owner', 'name avatarUrl');
  if (!doc) return next(new AppError('Document not found.', 404));
  if (!canAccess(doc, req.user._id)) return next(new AppError('Access denied.', 403));
  res.status(200).json({ status: 'success', document: doc });
});

export const shareDocument = catchAsync(async (req, res, next) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return next(new AppError('Document not found.', 404));
  if (String(doc.owner) !== String(req.user._id)) {
    return next(new AppError('Only the owner can share this document.', 403));
  }

  const { userIds } = req.body; // array of user ids to grant access to
  doc.sharedWith = Array.from(new Set([...doc.sharedWith.map(String), ...userIds]));
  doc.status = 'pending_signature';
  await doc.save();

  res.status(200).json({ status: 'success', document: doc });
});

// Signature image is uploaded separately (small image), then linked here
export const signDocument = catchAsync(async (req, res, next) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return next(new AppError('Document not found.', 404));
  if (!canAccess(doc, req.user._id)) return next(new AppError('Access denied.', 403));
  if (!req.file) return next(new AppError('No signature image uploaded.', 400));

  doc.signatures.push({
    signedBy: req.user._id,
    signatureImageUrl: `/uploads/${req.file.filename}`,
  });
  doc.status = 'signed';
  doc.version += 1;
  await doc.save();

  res.status(200).json({ status: 'success', document: doc });
});

export const deleteDocument = catchAsync(async (req, res, next) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return next(new AppError('Document not found.', 404));
  if (String(doc.owner) !== String(req.user._id)) {
    return next(new AppError('Only the owner can delete this document.', 403));
  }
  await doc.deleteOne();
  res.status(204).send();
});
