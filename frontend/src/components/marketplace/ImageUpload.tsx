import React, { useState, useRef, DragEvent } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  width: 100%;
`;

const UploadArea = styled.div<{ isDragging: boolean }>`
  border: 3px dashed ${props => props.isDragging ? '#3498db' : '#bdc3c7'};
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  background: ${props => props.isDragging ? '#ebf5fb' : '#f8f9fa'};
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 24px;

  &:hover {
    border-color: #3498db;
    background: #ebf5fb;
  }
`;

const UploadIcon = styled.div`
  font-size: 48px;
  margin-bottom: 12px;
  color: #7f8c8d;
`;

const UploadText = styled.p`
  font-size: 16px;
  color: #2c3e50;
  margin: 0 0 8px 0;
  font-weight: 600;
`;

const UploadSubtext = styled.p`
  font-size: 14px;
  color: #7f8c8d;
  margin: 0;
`;

const HiddenInput = styled.input`
  display: none;
`;

const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  margin-top: 24px;
`;

const ImageCard = styled.div<{ isDragging?: boolean }>`
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: move;
  opacity: ${props => props.isDragging ? 0.5 : 1};
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ImageOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 40%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px;
`;

const TopControls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const PrimaryBadge = styled.div<{ isPrimary: boolean }>`
  background: ${props => props.isPrimary ? '#f39c12' : 'rgba(255, 255, 255, 0.9)'};
  color: ${props => props.isPrimary ? 'white' : '#7f8c8d'};
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.isPrimary ? '#e67e22' : '#3498db'};
    color: white;
  }
`;

const DeleteButton = styled.button`
  background: rgba(231, 76, 60, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  transition: all 0.2s;

  &:hover {
    background: #c0392b;
    transform: scale(1.1);
  }
`;

const BottomInfo = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const OrderBadge = styled.div`
  background: rgba(52, 152, 219, 0.9);
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
`;

const ProgressBar = styled.div<{ progress: number }>`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(0, 0, 0, 0.2);

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: ${props => props.progress}%;
    background: #3498db;
    transition: width 0.3s ease;
  }
`;

const ErrorMessage = styled.div`
  background: #ffe6e6;
  color: #c0392b;
  padding: 12px 16px;
  border-radius: 8px;
  margin-top: 12px;
  font-size: 14px;
`;

const HelpText = styled.p`
  font-size: 13px;
  color: #7f8c8d;
  margin: 12px 0 0 0;
`;

export interface ImageFile {
  id: string;
  file: File;
  preview: string;
  isPrimary: boolean;
  uploadProgress?: number;
  uploaded?: boolean;
  mediaId?: number;
}

interface ImageUploadProps {
  images: ImageFile[];
  onImagesChange: (images: ImageFile[]) => void;
  maxImages?: number;
  maxFileSize?: number; // in MB
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  onImagesChange,
  maxImages = 10,
  maxFileSize = 10
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    setError('');

    // Validate file count
    if (images.length + files.length > maxImages) {
      setError(`You can only upload up to ${maxImages} images`);
      return;
    }

    // Validate and process files
    const validFiles: ImageFile[] = [];
    const maxSizeBytes = maxFileSize * 1024 * 1024;

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} is not an image file`);
        continue;
      }

      // Validate file size
      if (file.size > maxSizeBytes) {
        setError(`${file.name} is too large. Max size is ${maxFileSize}MB`);
        continue;
      }

      // Create preview
      const imageFile: ImageFile = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
        isPrimary: images.length === 0 && validFiles.length === 0, // First image is primary
        uploadProgress: 0,
        uploaded: false
      };

      validFiles.push(imageFile);
    }

    if (validFiles.length > 0) {
      onImagesChange([...images, ...validFiles]);
    }
  };

  const handleRemoveImage = (id: string) => {
    const imageToRemove = images.find(img => img.id === id);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview);
    }

    const newImages = images.filter(img => img.id !== id);

    // If we removed the primary image, make the first remaining image primary
    if (imageToRemove?.isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }

    onImagesChange(newImages);
  };

  const handleSetPrimary = (id: string) => {
    const newImages = images.map(img => ({
      ...img,
      isPrimary: img.id === id
    }));
    onImagesChange(newImages);
  };

  const handleImageDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleImageDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleImageDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];

    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);

    setDraggedIndex(index);
    onImagesChange(newImages);
  };

  const handleUploadAreaClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Container>
      {images.length < maxImages && (
        <UploadArea
          isDragging={isDragging}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleUploadAreaClick}
        >
          <UploadIcon>📷</UploadIcon>
          <UploadText>
            {images.length === 0
              ? 'Add photos to your listing'
              : `Add more photos (${images.length}/${maxImages})`
            }
          </UploadText>
          <UploadSubtext>
            Drag and drop or click to browse
          </UploadSubtext>
          <UploadSubtext>
            Max {maxImages} images, up to {maxFileSize}MB each
          </UploadSubtext>
        </UploadArea>
      )}

      <HiddenInput
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
      />

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {images.length > 0 && (
        <>
          <HelpText>
            Drag images to reorder. Click "Primary" to set the main photo.
          </HelpText>
          <ImageGrid>
            {images.map((image, index) => (
              <ImageCard
                key={image.id}
                isDragging={draggedIndex === index}
                draggable
                onDragStart={() => handleImageDragStart(index)}
                onDragEnd={handleImageDragEnd}
                onDragOver={(e) => handleImageDragOver(e, index)}
              >
                <Image src={image.preview} alt={`Upload ${index + 1}`} />
                <ImageOverlay>
                  <TopControls>
                    <PrimaryBadge
                      isPrimary={image.isPrimary}
                      onClick={() => handleSetPrimary(image.id)}
                    >
                      {image.isPrimary ? '⭐ Primary' : 'Set Primary'}
                    </PrimaryBadge>
                    <DeleteButton onClick={() => handleRemoveImage(image.id)}>
                      ×
                    </DeleteButton>
                  </TopControls>
                  <BottomInfo>
                    <OrderBadge>#{index + 1}</OrderBadge>
                  </BottomInfo>
                </ImageOverlay>
                {image.uploadProgress !== undefined && image.uploadProgress < 100 && (
                  <ProgressBar progress={image.uploadProgress} />
                )}
              </ImageCard>
            ))}
          </ImageGrid>
        </>
      )}
    </Container>
  );
};
