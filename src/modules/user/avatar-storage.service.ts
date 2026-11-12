import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

export type AvatarFile = { buffer: Buffer; mimetype: string; size: number };

@Injectable()
export class AvatarStorageService {
  private settings() {
    const {
      S3_ENDPOINT,
      S3_REGION,
      S3_ACCESS_KEY_ID,
      S3_SECRET_ACCESS_KEY,
      S3_PUBLIC_BUCKET,
      S3_PUBLIC_BASE_URL,
    } = process.env;
    if (
      !S3_ENDPOINT ||
      !S3_REGION ||
      !S3_ACCESS_KEY_ID ||
      !S3_SECRET_ACCESS_KEY ||
      !S3_PUBLIC_BUCKET ||
      !S3_PUBLIC_BASE_URL
    ) {
      throw new ServiceUnavailableException("Avatar storage is not configured");
    }
    return {
      client: new S3Client({
        endpoint: S3_ENDPOINT,
        region: S3_REGION,
        forcePathStyle: true,
        credentials: {
          accessKeyId: S3_ACCESS_KEY_ID,
          secretAccessKey: S3_SECRET_ACCESS_KEY,
        },
      }),
      bucket: S3_PUBLIC_BUCKET,
      baseUrl: S3_PUBLIC_BASE_URL.replace(/\/+$/, ""),
    };
  }

  async upload(file: AvatarFile | undefined) {
    if (!file || !file.buffer?.length)
      throw new BadRequestException("Avatar file is required");
    const b = file.buffer;
    const type =
      b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
        ? ["image/jpeg", "jpg"]
        : b.length >= 8 &&
            b
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? ["image/png", "png"]
          : b.length >= 12 &&
              b.toString("ascii", 0, 4) === "RIFF" &&
              b.toString("ascii", 8, 12) === "WEBP"
            ? ["image/webp", "webp"]
            : null;
    if (!type || file.mimetype !== type[0])
      throw new BadRequestException(
        "Avatar must be a JPEG, PNG, or WebP image",
      );
    const { client, bucket, baseUrl } = this.settings();
    const key = `avatars/${randomUUID()}.${type[1]}`;
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: b,
          ContentType: type[0],
        }),
      );
    } finally {
      client.destroy();
    }
    return { key, url: `${baseUrl}/${key}` };
  }

  async remove(key: string) {
    const { client, bucket } = this.settings();
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } finally {
      client.destroy();
    }
  }
}
