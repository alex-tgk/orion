import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { documentsApi } from '../services/api';
import { formatBytes } from '../lib/utils';

export function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setError(null);

    try {
      await documentsApi.upload(file);
      setUploadedFile({ name: file.name, size: file.size });
    } catch (err) {
      setError('Failed to upload file');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Upload Document</h1>

      <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary">
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium">Drop file or click to browse</p>
      </div>

      {uploading && <div className="mt-4 text-center">Uploading...</div>}
      {uploadedFile && <div className="mt-4 text-green-600">Uploaded: {uploadedFile.name}</div>}
      {error && <div className="mt-4 text-red-600">{error}</div>}
    </div>
  );
}
