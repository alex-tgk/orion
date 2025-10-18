// File entity types
export interface File {
  id: string;
  userId: string;
  filename: string;
  size: number;
  mimeType: string;
  s3Key: string;
  s3Bucket: string;
  uploadedAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FileMetadata {
  id: string;
  fileId: string;
  description: string | null;
  tags: string[];
  customData: any;
  virusScanStatus: string | null;
  virusScanDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type FileWithMetadata = File & {
  metadata?: FileMetadata | null;
};
