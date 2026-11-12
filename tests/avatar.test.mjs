import { test } from 'node:test';
import assert from 'node:assert/strict';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { AvatarStorageService } from '../dist/modules/user/avatar-storage.service.js';
import { UsersService } from '../dist/modules/user/users.service.js';

const png = Buffer.from([137,80,78,71,13,10,26,10,0]);
test('avatar storage validates content and writes to the configured public bucket', async () => {
  Object.assign(process.env, { S3_ENDPOINT: 'http://localhost:3900', S3_REGION: 'garage', S3_ACCESS_KEY_ID: 'key', S3_SECRET_ACCESS_KEY: 'secret', S3_PUBLIC_BUCKET: 'public', S3_PUBLIC_BASE_URL: 'https://images.example.com/' });
  const original = S3Client.prototype.send;
  let command;
  S3Client.prototype.send = async function (value) { command = value; return {}; };
  try {
    const storage = new AvatarStorageService();
    await assert.rejects(storage.upload({ buffer: Buffer.from('not an image'), mimetype: 'image/png', size: 12 }), { status: 400 });
    await assert.rejects(storage.upload({ buffer: png, mimetype: 'image/jpeg', size: png.length }), { status: 400 });
    const result = await storage.upload({ buffer: png, mimetype: 'image/png', size: png.length });
    assert.ok(command instanceof PutObjectCommand);
    assert.equal(command.input.Bucket, 'public');
    assert.equal(command.input.ContentType, 'image/png');
    assert.equal(result.url, `https://images.example.com/${result.key}`);
    await storage.remove(result.key);
    assert.ok(command instanceof DeleteObjectCommand);
  } finally { S3Client.prototype.send = original; }
});

test('profile update records the URL and cleans up if the transaction fails', async () => {
  let removed;
  const avatars = { upload: async () => ({ key: 'avatars/a.png', url: 'https://images.example.com/avatars/a.png' }), remove: async (key) => { removed = key; } };
  const prisma = { user: { findFirst: async () => ({ id: 'u' }) }, $transaction: async (fn) => fn({ user: { updateMany: async ({ data }) => { assert.equal(data.image, 'https://images.example.com/avatars/a.png'); return { count: 1 }; }, findUniqueOrThrow: async () => ({ id: 'u', image: 'https://images.example.com/avatars/a.png' }) }, auditLog: { create: async () => ({}) } }) };
  const service = new UsersService(prisma, avatars);
  assert.equal((await service.updateAvatar('u', {})).image, 'https://images.example.com/avatars/a.png');
  prisma.$transaction = async () => { throw new Error('database failure'); };
  await assert.rejects(service.updateAvatar('u', {}), /database failure/);
  assert.equal(removed, 'avatars/a.png');
});
