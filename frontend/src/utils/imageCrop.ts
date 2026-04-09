export interface CroppedImageOptions {
    imageSrc: string;
    offsetX: number;
    offsetY: number;
    scale: number;
    viewportWidth: number;
    viewportHeight: number;
    outputWidth: number;
    outputHeight: number;
    fileName: string;
    mimeType?: string;
    quality?: number;
}

export function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
    });
}

export async function createCroppedImageFile(options: CroppedImageOptions): Promise<File> {
    const {
        imageSrc,
        offsetX,
        offsetY,
        scale,
        viewportWidth,
        viewportHeight,
        outputWidth,
        outputHeight,
        fileName,
        mimeType = 'image/jpeg',
        quality = 0.92,
    } = options;

    const image = await loadImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Unable to initialize the image editor.');
    }

    const sourceX = Math.max(0, -offsetX / scale);
    const sourceY = Math.max(0, -offsetY / scale);
    const sourceWidth = Math.min(image.naturalWidth, viewportWidth / scale);
    const sourceHeight = Math.min(image.naturalHeight, viewportHeight / scale);

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputWidth,
        outputHeight
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
            if (result) {
                resolve(result);
                return;
            }
            reject(new Error('Failed to export the edited image.'));
        }, mimeType, quality);
    });

    return new File([blob], fileName, {
        type: blob.type || mimeType,
        lastModified: Date.now(),
    });
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to load the selected image.'));
        image.src = src;
    });
}
