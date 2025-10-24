import React, { useState, useCallback, useRef } from 'react';
import { editImage } from './services/geminiService';

const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
  </svg>
);

const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
  </svg>
);

const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
    <p className="text-purple-300">Geminiが考え中...</p>
  </div>
);

interface ImageDisplayProps {
  imageSrc: string | null;
  label: string;
  isLoading?: boolean;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ imageSrc, label, isLoading = false }) => (
  <div className="w-full h-full bg-gray-800/50 rounded-2xl shadow-lg flex flex-col items-center justify-center p-4 aspect-square transition-all duration-300">
    <div className="w-full h-full border-2 border-dashed border-gray-600 rounded-xl flex items-center justify-center relative overflow-hidden">
      {isLoading && <LoadingSpinner />}
      {!isLoading && imageSrc && <img src={imageSrc} alt={label} className="max-w-full max-h-full object-contain" />}
      {!isLoading && !imageSrc && (
        <div className="text-center text-gray-400">
          <SparklesIcon className="w-16 h-16 mx-auto text-gray-500" />
          <p className="mt-2">編集後の画像はここに表示されます</p>
        </div>
      )}
      <div className="absolute top-2 left-2 bg-gray-900/50 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm">{label}</div>
    </div>
  </div>
);

const fileToGenerativePart = async (file: File): Promise<{ mimeType: string; data: string }> => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        resolve(''); // Should not happen with readAsDataURL
      }
    };
    reader.readAsDataURL(file);
  });
  return {
    mimeType: file.type,
    data: await base64EncodedDataPromise,
  };
};


export default function App() {
  const [originalImage, setOriginalImage] = useState<{ file: File; url: string } | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setOriginalImage({ file, url: URL.createObjectURL(file) });
      setEditedImage(null);
      setError(null);
    }
  };

  const handleGenerateClick = useCallback(async () => {
    if (!originalImage || isLoading) {
      if (!originalImage) setError('最初に画像をアップロードしてください。');
      return;
    }

    setIsLoading(true);
    setEditedImage(null);
    setError(null);

    try {
      const imagePart = await fileToGenerativePart(originalImage.file);
      const fullPrompt = `この画像をドット絵に変換してください。 ${prompt}`;
      const resultBase64 = await editImage(imagePart.data, imagePart.mimeType, fullPrompt);
      setEditedImage(`data:${imagePart.mimeType};base64,${resultBase64}`);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : '不明なエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }, [originalImage, prompt, isLoading]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-7xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 font-pixel leading-relaxed">
            ドット絵生成アプリ
          </h1>
          <p className="mt-4 text-lg text-gray-400">AIで写真をレトロなドット絵に変身させよう。</p>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Original Image Uploader */}
          <div className="w-full h-full bg-gray-800/50 rounded-2xl shadow-lg flex flex-col items-center justify-center p-4 aspect-square">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
            <div 
              className="w-full h-full border-2 border-dashed border-gray-600 rounded-xl flex items-center justify-center relative overflow-hidden cursor-pointer hover:border-purple-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const file = e.dataTransfer.files[0];
                  setOriginalImage({ file, url: URL.createObjectURL(file) });
                  setEditedImage(null);
                  setError(null);
                }
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              {originalImage ? (
                <img src={originalImage.url} alt="オリジナル" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-center text-gray-400 p-4">
                  <UploadIcon className="w-16 h-16 mx-auto text-gray-500" />
                  <p className="mt-2 font-semibold">クリックしてアップロードまたはドラッグ＆ドロップ</p>
                  <p className="text-sm text-gray-500">PNG, JPG, WEBP</p>
                </div>
              )}
              <div className="absolute top-2 left-2 bg-gray-900/50 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm">オリジナル</div>
            </div>
          </div>
          
          {/* Edited Image Display */}
          <ImageDisplay imageSrc={editedImage} label="編集済み" isLoading={isLoading} />
        </main>
        
        {/* Controls Section */}
        <footer className="mt-8 p-6 bg-gray-800/50 rounded-2xl shadow-lg sticky bottom-4 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="スタイルを入力... 例: 8ビット, レトロゲーム"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200"
              disabled={isLoading}
            />
            <button
              onClick={handleGenerateClick}
              disabled={isLoading || !originalImage}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 font-pixel text-sm"
            >
              {isLoading ? '生成中...' : '生成'}
              <SparklesIcon className="w-5 h-5" />
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-400 text-center sm:text-left">{error}</p>}
        </footer>

      </div>
    </div>
  );
}