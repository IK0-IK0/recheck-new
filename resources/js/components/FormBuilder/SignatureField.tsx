import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Pen, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormField, FormFieldValue } from './FormFieldTypes';

type Props = {
    field: FormField;
    value: FormFieldValue;
    onChange: (value: FormFieldValue) => void;
    error?: string;
    disabled?: boolean;
};

export default function SignatureField({
    field,
    value,
    onChange,
    error,
    disabled = false,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        if (typeof value === 'string' && value && canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            if (context) {
                const image = new Image();
                image.onload = () => {
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    context.drawImage(image, 0, 0);
                    setHasSignature(true);
                };
                image.src = value;
            }
        }
    }, [value]);

    const startDrawing = (
        event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    ) => {
        if (disabled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        setIsDrawing(true);

        const rect = canvas.getBoundingClientRect();
        const x =
            'touches' in event
                ? event.touches[0].clientX - rect.left
                : event.nativeEvent.offsetX;
        const y =
            'touches' in event
                ? event.touches[0].clientY - rect.top
                : event.nativeEvent.offsetY;

        context.beginPath();
        context.moveTo(x, y);
    };

    const draw = (
        event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    ) => {
        if (!isDrawing || disabled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const rect = canvas.getBoundingClientRect();
        const x =
            'touches' in event
                ? event.touches[0].clientX - rect.left
                : event.nativeEvent.offsetX;
        const y =
            'touches' in event
                ? event.touches[0].clientY - rect.top
                : event.nativeEvent.offsetY;

        context.lineTo(x, y);
        context.strokeStyle = '#000';
        context.lineWidth = 2;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;

        setIsDrawing(false);
        setHasSignature(true);

        const canvas = canvasRef.current;
        if (canvas) {
            const dataUrl = canvas.toDataURL('image/png');
            onChange(dataUrl);
        }
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (context) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            setHasSignature(false);
            onChange(null);
        }
    };

    return (
        <div className="space-y-3">
            <div>
                <Label className="text-sm font-medium">
                    {field.label}
                    {field.validation?.required ? (
                        <span className="ml-1 text-destructive">*</span>
                    ) : null}
                </Label>
                {field.description ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                        {field.description}
                    </p>
                ) : null}
            </div>
            <div
                className="space-y-2"
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${field.id}-error` : undefined}
            >
                <div className="overflow-hidden rounded-md border-2 border-dashed border-border bg-background">
                    <canvas
                        ref={canvasRef}
                        width={600}
                        height={200}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className={`w-full touch-none ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-crosshair'}`}
                        aria-label={field.label}
                    />
                </div>
                <div className="flex items-center gap-2">
                    {!hasSignature ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Pen className="size-3.5" />
                            <span>Sign above</span>
                        </div>
                    ) : null}
                    {hasSignature ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={clearSignature}
                            disabled={disabled}
                        >
                            <Trash2 className="mr-1.5 size-3.5" />
                            Clear
                        </Button>
                    ) : null}
                </div>
            </div>
            {error ? (
                <p
                    id={`${field.id}-error`}
                    className="text-xs text-destructive"
                >
                    {error}
                </p>
            ) : null}
        </div>
    );
}
