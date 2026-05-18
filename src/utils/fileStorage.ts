import fs from 'fs/promises';
import os from 'os';
import path from 'path';

export type StorageProvider = 'local' | 'drive';

const DEFAULT_BACKUP_DIR = process.env.BACKUP_STORAGE_DIR || 'backups';
const DEFAULT_DRIVE_DIR = process.env.DRIVE_STORAGE_DIR || path.join(DEFAULT_BACKUP_DIR, 'drive');
const STORAGE_PROVIDER = (process.env.BACKUP_STORAGE_PROVIDER || 'local') as StorageProvider;

export const isValidEmail = (value?: string): boolean => {
  if (!value) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

const safePathSegment = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-');

export const getLocalStoragePath = (): string => {
  return path.resolve(process.cwd(), DEFAULT_BACKUP_DIR);
};

const resolveDestinationDirectory = (destinationPath?: string): string => {
  if (!destinationPath || destinationPath.trim() === '') {
    return getLocalStoragePath();
  }

  let rawDestination = destinationPath.trim();

  if (rawDestination.startsWith('~')) {
    rawDestination = path.join(os.homedir(), rawDestination.slice(1));
  }

  return path.isAbsolute(rawDestination)
    ? rawDestination
    : path.resolve(os.homedir(), rawDestination);
};

export const ensureLocalStorage = async (): Promise<void> => {
  await fs.mkdir(getLocalStoragePath(), { recursive: true });
};

const verifySavedFile = async (
  filePath: string,
  expectedSize: number
): Promise<{ verified: boolean; accessible: boolean; message: string }> => {
  try {
    const stat = await fs.stat(filePath);
    const handle = await fs.open(filePath, 'r');
    await handle.close();

    const verified = stat.isFile() && stat.size === expectedSize;
    return {
      verified,
      accessible: true,
      message: verified
        ? 'Backup file was exported and verified successfully.'
        : 'Backup file was saved but did not match the expected size.',
    };
  } catch (error) {
    return {
      verified: false,
      accessible: false,
      message: error instanceof Error ? error.message : 'Unable to verify exported file.',
    };
  }
};

export const saveFileToLocal = async (
  fileName: string,
  content: Buffer,
  destinationPath?: string
): Promise<{ filePath: string; fileSize: number; verification: any }> => {
  const targetDirectory = resolveDestinationDirectory(destinationPath);

  await fs.mkdir(targetDirectory, { recursive: true });
  const filePath = path.join(targetDirectory, fileName);
  await fs.writeFile(filePath, content);
  const stat = await fs.stat(filePath);
  const verification = await verifySavedFile(filePath, content.length);

  return { filePath, fileSize: stat.size, verification };
};

export const saveFileToDrive = async (
  fileName: string,
  content: Buffer,
  driveEmail?: string
): Promise<{ filePath: string; fileSize: number; verification: any }> => {
  if (!isValidEmail(driveEmail)) {
    throw new Error('A valid Drive email address is required.');
  }

  const targetDirectory = path.resolve(
    process.cwd(),
    DEFAULT_DRIVE_DIR,
    safePathSegment(driveEmail!)
  );
  await fs.mkdir(targetDirectory, { recursive: true });

  const filePath = path.join(targetDirectory, fileName);
  await fs.writeFile(filePath, content);
  const stat = await fs.stat(filePath);
  const verification = await verifySavedFile(filePath, content.length);

  if (!verification.verified || !verification.accessible) {
    throw new Error(verification.message || 'Drive export verification failed.');
  }

  return {
    filePath: `drive://${driveEmail}/${fileName}`,
    fileSize: stat.size,
    verification,
  };
};

export const saveFile = async (
  fileName: string,
  content: Buffer,
  storageProvider: StorageProvider = STORAGE_PROVIDER,
  destinationPath?: string,
  driveEmail?: string
): Promise<{ filePath: string; fileSize: number; verification: any }> => {
  if (storageProvider === 'drive') {
    return saveFileToDrive(fileName, content, driveEmail);
  }

  return saveFileToLocal(fileName, content, destinationPath);
};
