import { describe, it, expect, beforeAll } from "vitest";
import { S3Client, CreateBucketCommand } from "@aws-sdk/client-s3";

/**
 * Real integration test against a local MinIO (Phase 12b) - gated by
 * S3_TEST_ENDPOINT so this never runs (and never requires MinIO to be up)
 * in an environment that hasn't opted in, same as this project treats any
 * other optional local infra dependency.
 */
describe.skipIf(!process.env.S3_TEST_ENDPOINT)("s3Storage (integration)", () => {
  const bucket = process.env.S3_BUCKET || "rfs-test-bucket";

  beforeAll(async () => {
    process.env.S3_ENDPOINT = process.env.S3_TEST_ENDPOINT;
    process.env.S3_BUCKET = bucket;
    process.env.S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || "rfsminioadmin";
    process.env.S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || "rfsminioadmin";

    const setupClient = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });
    try {
      await setupClient.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (err) {
      const code = (err as { name?: string }).name;
      if (code !== "BucketAlreadyOwnedByYou" && code !== "BucketAlreadyExists") throw err;
    }
  });

  it("writes, reads back the same bytes, then deletes", async () => {
    const { s3Storage } = await import("./s3");
    const relPath = `s3-integration-test/${Date.now()}.txt`;
    const content = Buffer.from("hello from the s3 integration test");

    await s3Storage.write(relPath, content);
    const readBack = await s3Storage.read(relPath);
    expect(readBack.equals(content)).toBe(true);

    await s3Storage.delete(relPath);
    await expect(s3Storage.read(relPath)).rejects.toThrow();
  });
});
