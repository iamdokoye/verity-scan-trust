import { supabase } from '../config/supabase';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

export class StorageService {
  async uploadFile(
    institutionId: string,
    studentId: string,
    documentId: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<string> {
    const filePath = `${institutionId}/${studentId}/${documentId}/${fileName}`;

    const { error } = await supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new AppError(`Storage upload failed: ${error.message}`, 500);
    }

    return filePath;
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    const { data, error } = await supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .download(filePath);

    if (error || !data) {
      throw new AppError(`Storage download failed: ${error?.message ?? 'unknown'}`, 500);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async getSignedUrl(filePath: string, expiresInSeconds = 300): Promise<string> {
    const { data, error } = await supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error || !data) {
      throw new AppError('Could not generate download URL', 500);
    }

    return data.signedUrl;
  }

  async deleteFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .remove([filePath]);
    if (error) {
      throw new AppError(`Storage delete failed: ${error.message}`, 500);
    }
  }
}

export const storageService = new StorageService();
