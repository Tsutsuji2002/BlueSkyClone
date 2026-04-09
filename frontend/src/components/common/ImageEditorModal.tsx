import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiMinus, FiPlus } from 'react-icons/fi';
import Button from './Button';
import { createCroppedImageFile } from '../../utils/imageCrop';

type CropShape = 'round' | 'rect';

interface ImageEditorModalProps {
    isOpen: boolean;
    imageSrc: string;
    title: string;
    aspect: number;
    cropShape?: CropShape;
    fileName: string;
    mimeType?: string;
    outputWidth: number;
    outputHeight: number;
    onCancel: () => void;
    onSave: (file: File, previewUrl: string) => void | Promise<void>;
}

const MAX_ZOOM = 4;

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
    isOpen,
    imageSrc,
    title,
    aspect,
    cropShape = 'rect',
    fileName,
    mimeType = 'image/jpeg',
    outputWidth,
    outputHeight,
    onCancel,
    onSave,
}) => {
    const viewportRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const dragStateRef = useRef<{ pointerId: number; startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);
    const previousPreviewUrlRef = useRef<string | null>(null);
    const skipAutoCenterRef = useRef(false);

    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const target = viewportRef.current;
        if (!target) {
            return;
        }

        const updateSize = () => {
            const rect = target.getBoundingClientRect();
            setViewportSize({
                width: Math.round(rect.width),
                height: Math.round(rect.height),
            });
        };

        updateSize();

        const observer = new ResizeObserver(updateSize);
        observer.observe(target);
        return () => observer.disconnect();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setZoom(1);
    }, [imageSrc, isOpen]);

    useEffect(() => {
        if (!viewportSize.width || !viewportSize.height || !imageSize.width || !imageSize.height) {
            return;
        }

        if (skipAutoCenterRef.current) {
            skipAutoCenterRef.current = false;
            return;
        }

        setOffset(centerOffset(viewportSize.width, viewportSize.height, imageSize.width, imageSize.height, zoom));
    }, [imageSrc, isOpen, zoom, viewportSize.width, viewportSize.height, imageSize.width, imageSize.height]);

    useEffect(() => {
        return () => {
            if (previousPreviewUrlRef.current?.startsWith('blob:')) {
                URL.revokeObjectURL(previousPreviewUrlRef.current);
            }
        };
    }, []);

    if (!isOpen) {
        return null;
    }

    const baseScale = getBaseScale(viewportSize.width, viewportSize.height, imageSize.width, imageSize.height);
    const scale = baseScale * zoom;
    const renderedWidth = imageSize.width * scale;
    const renderedHeight = imageSize.height * scale;

    const clampOffset = (x: number, y: number) => clampPosition(x, y, viewportSize.width, viewportSize.height, renderedWidth, renderedHeight);

    const updateZoom = (nextZoom: number) => {
        if (!viewportSize.width || !viewportSize.height || !imageSize.width || !imageSize.height) {
            setZoom(nextZoom);
            return;
        }

        const boundedZoom = Math.min(MAX_ZOOM, Math.max(1, nextZoom));
        skipAutoCenterRef.current = true;
        const nextScale = baseScale * boundedZoom;
        const centerX = viewportSize.width / 2;
        const centerY = viewportSize.height / 2;
        const imagePointX = (centerX - offset.x) / scale;
        const imagePointY = (centerY - offset.y) / scale;

        const nextOffset = clampPosition(
            centerX - imagePointX * nextScale,
            centerY - imagePointY * nextScale,
            viewportSize.width,
            viewportSize.height,
            imageSize.width * nextScale,
            imageSize.height * nextScale
        );

        setZoom(boundedZoom);
        setOffset(nextOffset);
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!viewportRef.current) {
            return;
        }

        dragStateRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: offset.x,
            offsetY: offset.y,
        };

        viewportRef.current.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const dragState = dragStateRef.current;
        if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
        }

        const nextOffset = clampOffset(
            dragState.offsetX + (event.clientX - dragState.startX),
            dragState.offsetY + (event.clientY - dragState.startY)
        );

        setOffset(nextOffset);
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        if (dragStateRef.current?.pointerId === event.pointerId) {
            dragStateRef.current = null;
            viewportRef.current?.releasePointerCapture(event.pointerId);
        }
    };

    const handleSave = async () => {
        if (!viewportSize.width || !viewportSize.height || !scale) {
            return;
        }

        setSaving(true);

        try {
            const croppedFile = await createCroppedImageFile({
                imageSrc,
                offsetX: offset.x,
                offsetY: offset.y,
                scale,
                viewportWidth: viewportSize.width,
                viewportHeight: viewportSize.height,
                outputWidth,
                outputHeight,
                fileName,
                mimeType,
            });

            const previewUrl = URL.createObjectURL(croppedFile);
            if (previousPreviewUrlRef.current?.startsWith('blob:')) {
                URL.revokeObjectURL(previousPreviewUrlRef.current);
            }
            previousPreviewUrlRef.current = previewUrl;
            await onSave(croppedFile, previewUrl);
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-[680px] rounded-2xl overflow-hidden border border-dark-border bg-black shadow-2xl">
                <div className="flex items-center justify-between border-b border-dark-border px-4 py-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-full px-3 py-1.5 text-[15px] font-bold text-primary-400 transition-colors hover:bg-dark-surface"
                    >
                        Cancel
                    </button>
                    <h3 className="text-[17px] font-black text-white">{title}</h3>
                    <Button
                        size="sm"
                        onClick={() => {
                            void handleSave();
                        }}
                        loading={saving}
                        className="min-w-[84px] bg-primary-500 px-4 text-white hover:bg-primary-600"
                    >
                        Save
                    </Button>
                </div>

                <div className="p-4 sm:p-6">
                    <div
                        ref={viewportRef}
                        className="relative mx-auto overflow-hidden rounded-2xl bg-[#3a3a3a] shadow-inner"
                        style={{
                            width: cropShape === 'round' ? 'min(78vw, 360px)' : 'min(88vw, 520px)',
                            aspectRatio: String(aspect),
                            touchAction: 'none',
                        }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                    >
                        <img
                            ref={imageRef}
                            src={imageSrc}
                            alt="Crop preview"
                            className="absolute max-w-none select-none"
                            draggable={false}
                            onLoad={(event) => {
                                setImageSize({
                                    width: event.currentTarget.naturalWidth,
                                    height: event.currentTarget.naturalHeight,
                                });
                            }}
                            style={{
                                width: renderedWidth || undefined,
                                height: renderedHeight || undefined,
                                transform: `translate(${offset.x}px, ${offset.y}px)`,
                                cursor: 'grab',
                            }}
                        />
                        <div
                            className={`pointer-events-none absolute inset-0 border-2 border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.38)] ${cropShape === 'round' ? 'rounded-full' : 'rounded-xl'}`}
                        />
                    </div>

                    <div className="mx-auto mt-5 flex max-w-[520px] items-center gap-3 px-1">
                        <FiMinus className="text-lg text-dark-text-secondary" />
                        <input
                            type="range"
                            min={1}
                            max={MAX_ZOOM}
                            step={0.01}
                            value={zoom}
                            onChange={(event) => updateZoom(Number(event.target.value))}
                            className="h-2 w-full cursor-pointer accent-primary-500"
                        />
                        <FiPlus className="text-lg text-dark-text-secondary" />
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

function getBaseScale(viewportWidth: number, viewportHeight: number, imageWidth: number, imageHeight: number) {
    if (!viewportWidth || !viewportHeight || !imageWidth || !imageHeight) {
        return 1;
    }

    return Math.max(viewportWidth / imageWidth, viewportHeight / imageHeight);
}

function centerOffset(viewportWidth: number, viewportHeight: number, imageWidth: number, imageHeight: number, zoom: number) {
    const baseScale = getBaseScale(viewportWidth, viewportHeight, imageWidth, imageHeight);
    const renderedWidth = imageWidth * baseScale * zoom;
    const renderedHeight = imageHeight * baseScale * zoom;

    return clampPosition(
        (viewportWidth - renderedWidth) / 2,
        (viewportHeight - renderedHeight) / 2,
        viewportWidth,
        viewportHeight,
        renderedWidth,
        renderedHeight
    );
}

function clampPosition(
    x: number,
    y: number,
    viewportWidth: number,
    viewportHeight: number,
    renderedWidth: number,
    renderedHeight: number
) {
    if (!viewportWidth || !viewportHeight || !renderedWidth || !renderedHeight) {
        return { x, y };
    }

    const minX = Math.min(0, viewportWidth - renderedWidth);
    const minY = Math.min(0, viewportHeight - renderedHeight);
    const maxX = renderedWidth <= viewportWidth ? (viewportWidth - renderedWidth) / 2 : 0;
    const maxY = renderedHeight <= viewportHeight ? (viewportHeight - renderedHeight) / 2 : 0;

    return {
        x: Math.min(maxX, Math.max(minX, x)),
        y: Math.min(maxY, Math.max(minY, y)),
    };
}

export default ImageEditorModal;
