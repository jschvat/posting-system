import React, { useEffect } from 'react';
import styled from 'styled-components';

interface ImageModalProps {
  images: Array<{ id: number; file_url: string }>;
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease-in-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ModalContent = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 80px;

  @media (max-width: 768px) {
    padding: 60px 20px;
  }
`;

const FullImage = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  animation: zoomIn 0.2s ease-in-out;

  @keyframes zoomIn {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

const CloseButton = styled.button`
  position: fixed;
  top: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10001;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
    transform: scale(1.1);
  }

  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
    top: 15px;
    right: 15px;
  }
`;

const NavButton = styled.button<{ direction: 'left' | 'right' }>`
  position: fixed;
  top: 50%;
  ${props => props.direction}: 30px;
  transform: translateY(-50%);
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10001;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-50%) scale(1.1);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    width: 50px;
    height: 50px;
    ${props => props.direction}: 10px;
  }
`;

const Counter = styled.div`
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 10px 24px;
  border-radius: 30px;
  font-size: 16px;
  font-weight: 600;
  z-index: 10001;
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    bottom: 20px;
    padding: 8px 20px;
    font-size: 14px;
  }
`;

const ThumbnailStrip = styled.div`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 12px;
  max-width: 90%;
  overflow-x: auto;
  z-index: 10001;
  backdrop-filter: blur(10px);

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }

  @media (max-width: 768px) {
    bottom: 60px;
    padding: 8px 12px;
    gap: 8px;
  }
`;

const Thumbnail = styled.div<{ active: boolean }>`
  min-width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 3px solid ${props => props.active ? 'white' : 'transparent'};
  opacity: ${props => props.active ? 1 : 0.6};
  transition: all 0.2s;

  &:hover {
    opacity: 1;
    border-color: rgba(255, 255, 255, 0.7);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: 768px) {
    min-width: 50px;
    height: 50px;
  }
`;

export const ImageModal: React.FC<ImageModalProps> = ({
  images,
  currentIndex,
  onClose,
  onNavigate
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
        onNavigate(currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [currentIndex, images.length, onClose, onNavigate]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      onNavigate(currentIndex + 1);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop, not the image
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!images || images.length === 0) return null;

  return (
    <Overlay onClick={handleBackdropClick}>
      <ModalContent onClick={handleBackdropClick}>
        <FullImage
          src={images[currentIndex].file_url}
          alt={`Full size image ${currentIndex + 1}`}
          onClick={(e) => e.stopPropagation()}
        />
      </ModalContent>

      <CloseButton onClick={onClose} aria-label="Close modal">
        ×
      </CloseButton>

      {images.length > 1 && (
        <>
          <NavButton
            direction="left"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            aria-label="Previous image"
          >
            ‹
          </NavButton>
          <NavButton
            direction="right"
            onClick={handleNext}
            disabled={currentIndex === images.length - 1}
            aria-label="Next image"
          >
            ›
          </NavButton>

          <Counter>
            {currentIndex + 1} / {images.length}
          </Counter>

          <ThumbnailStrip>
            {images.map((image, index) => (
              <Thumbnail
                key={image.id}
                active={index === currentIndex}
                onClick={() => onNavigate(index)}
              >
                <img src={image.file_url} alt={`Thumbnail ${index + 1}`} />
              </Thumbnail>
            ))}
          </ThumbnailStrip>
        </>
      )}
    </Overlay>
  );
};
