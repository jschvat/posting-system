import React from 'react';
import styled from 'styled-components';
import * as FaIcons from 'react-icons/fa';

const FaCircle = (FaIcons as any).FaCircle;
const FaCheck = (FaIcons as any).FaCheck;
const FaCheckDouble = (FaIcons as any).FaCheckDouble;

interface ReadReceiptProps {
  status: 'sent' | 'delivered' | 'read';
  readBy?: Array<{ userId: number; username: string; readAt: string }>;
  showTooltip?: boolean;
}

const ReceiptContainer = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.7rem;
  color: ${props => props.theme.colors.text.secondary};
  position: relative;
  margin-left: 4px;
`;

const ReceiptIcon = styled.span<{ isRead?: boolean; isDelivered?: boolean }>`
  display: inline-flex;
  align-items: center;
  color: ${props =>
    props.isRead ? '#4FC3F7' :
    props.isDelivered ? '#90A4AE' :
    '#B0BEC5'
  };
  transition: color 0.3s ease;
  font-size: 0.7rem;

  svg {
    width: 12px;
    height: 12px;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 4px;
  padding: 8px 12px;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  font-size: 0.75rem;
  white-space: nowrap;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    right: 8px;
    border: 4px solid transparent;
    border-top-color: ${props => props.theme.colors.border};
  }
`;

const ReadByList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ReadByItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
`;

export const ReadReceipt: React.FC<ReadReceiptProps> = ({
  status,
  readBy = [],
  showTooltip = false
}) => {
  const [showTooltipState, setShowTooltipState] = React.useState(false);

  const renderIcon = () => {
    switch (status) {
      case 'sent':
        // Single gray checkmark - message sent
        return (
          <ReceiptIcon title="Sent">
            <FaCheck />
          </ReceiptIcon>
        );
      case 'delivered':
        // Double gray checkmarks - message delivered to device
        return (
          <ReceiptIcon isDelivered title="Delivered">
            <FaCheckDouble />
          </ReceiptIcon>
        );
      case 'read':
        // Double blue checkmarks - message read
        return (
          <ReceiptIcon isRead title={`Read by ${readBy?.length || 0} ${readBy?.length === 1 ? 'person' : 'people'}`}>
            <FaCheckDouble />
          </ReceiptIcon>
        );
      default:
        return null;
    }
  };

  const formatReadTime = (readAt: string) => {
    const date = new Date(readAt);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ReceiptContainer
      onMouseEnter={() => setShowTooltipState(true)}
      onMouseLeave={() => setShowTooltipState(false)}
    >
      {renderIcon()}
      {showTooltip && showTooltipState && readBy.length > 0 && (
        <Tooltip>
          <ReadByList>
            {readBy.map((reader) => (
              <ReadByItem key={reader.userId}>
                <FaCircle style={{ width: '10px', height: '10px' }} color="#4CAF50" />
                <span>
                  {reader.username} · {formatReadTime(reader.readAt)}
                </span>
              </ReadByItem>
            ))}
          </ReadByList>
        </Tooltip>
      )}
    </ReceiptContainer>
  );
};

export default ReadReceipt;
