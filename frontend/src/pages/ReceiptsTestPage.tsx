import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ReadReceipt } from '../components/messaging/ReadReceipt';
import { TypingIndicator } from '../components/messaging/TypingIndicator';

const Container = styled.div`
  max-width: 800px;
  margin: 40px auto;
  padding: 20px;
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 10px;
`;

const Subtitle = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 30px;
`;

const Section = styled.div`
  margin-bottom: 40px;
  padding: 20px;
  background: ${props => props.theme.colors.surface};
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border};
`;

const SectionTitle = styled.h2`
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 20px;
  font-size: 1.25rem;
`;

const TestGrid = styled.div`
  display: grid;
  gap: 16px;
`;

const TestItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${props => props.theme.colors.background};
  border-radius: 6px;
  border: 1px solid ${props => props.theme.colors.border};
`;

const Label = styled.span`
  flex: 1;
  color: ${props => props.theme.colors.text.primary};
  font-weight: 500;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MessageBubble = styled.div<{ isOwn?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
  margin-bottom: 16px;
`;

const BubbleContent = styled.div<{ isOwn?: boolean }>`
  background: ${props => props.isOwn ? '#007AFF' : '#E5E5EA'};
  color: ${props => props.isOwn ? '#ffffff' : '#000000'};
  border-radius: 18px;
  ${props => props.isOwn ? 'border-bottom-right-radius: 4px;' : 'border-bottom-left-radius: 4px;'}
  padding: 8px 12px;
  max-width: 70%;
`;

const BubbleFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  font-size: 0.688rem;
  color: ${props => props.theme.colors.text.secondary};
`;

const ControlsSection = styled.div`
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid ${props => props.theme.colors.border};
  background: ${props =>
    props.variant === 'primary'
      ? props.theme.colors.primary
      : props.theme.colors.surface
  };
  color: ${props =>
    props.variant === 'primary'
      ? '#ffffff'
      : props.theme.colors.text.primary
  };
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.8;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const CodeBlock = styled.pre`
  background: #f5f5f5;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.875rem;
  margin-top: 12px;
`;

export const ReceiptsTestPage: React.FC = () => {
  const [receiptStatus, setReceiptStatus] = useState<'sent' | 'delivered' | 'read'>('sent');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showTyping, setShowTyping] = useState(false);

  // Simulate typing animation cycle
  useEffect(() => {
    if (!showTyping) return;

    const interval = setInterval(() => {
      setTypingUsers(prev => {
        if (prev.length === 0) return ['Alice'];
        if (prev.length === 1) return ['Alice', 'Bob'];
        if (prev.length === 2) return ['Alice', 'Bob', 'Charlie'];
        return [];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [showTyping]);

  const sampleReadBy = [
    { userId: 2, username: 'Alice', readAt: new Date(Date.now() - 120000).toISOString() },
    { userId: 3, username: 'Bob', readAt: new Date(Date.now() - 60000).toISOString() },
    { userId: 4, username: 'Charlie', readAt: new Date(Date.now() - 30000).toISOString() },
  ];

  return (
    <Container>
      <Title>📬 Delivery Receipts & Typing Indicators Test</Title>
      <Subtitle>
        Test and visualize delivery receipts and typing indicators with WhatsApp/iMessage style
      </Subtitle>

      {/* Delivery Receipts Section */}
      <Section>
        <SectionTitle>✅ Delivery Receipts (WhatsApp Style)</SectionTitle>

        <TestGrid>
          <TestItem>
            <Label>Sent (Single Gray Check)</Label>
            <IconWrapper>
              <ReadReceipt status="sent" />
            </IconWrapper>
          </TestItem>

          <TestItem>
            <Label>Delivered (Double Gray Checks)</Label>
            <IconWrapper>
              <ReadReceipt status="delivered" />
            </IconWrapper>
          </TestItem>

          <TestItem>
            <Label>Read (Double Blue Checks)</Label>
            <IconWrapper>
              <ReadReceipt status="read" readBy={[sampleReadBy[0]]} showTooltip />
            </IconWrapper>
          </TestItem>

          <TestItem>
            <Label>Read by Multiple (Hover for details)</Label>
            <IconWrapper>
              <ReadReceipt status="read" readBy={sampleReadBy} showTooltip />
            </IconWrapper>
          </TestItem>
        </TestGrid>

        <ControlsSection>
          <Button
            variant={receiptStatus === 'sent' ? 'primary' : 'secondary'}
            onClick={() => setReceiptStatus('sent')}
          >
            Sent
          </Button>
          <Button
            variant={receiptStatus === 'delivered' ? 'primary' : 'secondary'}
            onClick={() => setReceiptStatus('delivered')}
          >
            Delivered
          </Button>
          <Button
            variant={receiptStatus === 'read' ? 'primary' : 'secondary'}
            onClick={() => setReceiptStatus('read')}
          >
            Read
          </Button>
        </ControlsSection>

        <div style={{ marginTop: '20px' }}>
          <strong>Message Preview:</strong>
          <MessageBubble isOwn={true}>
            <BubbleContent isOwn={true}>
              Hey! How are you doing today?
            </BubbleContent>
            <BubbleFooter>
              <span>12:34 PM</span>
              <ReadReceipt
                status={receiptStatus}
                readBy={receiptStatus === 'read' ? sampleReadBy : []}
                showTooltip
              />
            </BubbleFooter>
          </MessageBubble>
        </div>

        <CodeBlock>{`<ReadReceipt
  status="${receiptStatus}"
  readBy={${receiptStatus === 'read' ? '[...users]' : '[]'}}
  showTooltip={true}
/>`}</CodeBlock>
      </Section>

      {/* Typing Indicators Section */}
      <Section>
        <SectionTitle>⌨️ Typing Indicators (iMessage Style)</SectionTitle>

        <div>
          <ControlsSection>
            <Button
              variant={showTyping ? 'primary' : 'secondary'}
              onClick={() => setShowTyping(!showTyping)}
            >
              {showTyping ? 'Stop Animation' : 'Start Animation'}
            </Button>
            <Button onClick={() => setTypingUsers(['Alice'])}>
              1 Person Typing
            </Button>
            <Button onClick={() => setTypingUsers(['Alice', 'Bob'])}>
              2 People Typing
            </Button>
            <Button onClick={() => setTypingUsers(['Alice', 'Bob', 'Charlie'])}>
              3+ People Typing
            </Button>
            <Button onClick={() => setTypingUsers([])}>
              Clear
            </Button>
          </ControlsSection>

          <div style={{ marginTop: '20px' }}>
            <strong>Current State:</strong>
            {typingUsers.length > 0 ? (
              <TypingIndicator usernames={typingUsers} />
            ) : (
              <p style={{ color: '#8E8E93', fontStyle: 'italic', marginTop: '12px' }}>
                No one is typing
              </p>
            )}
          </div>

          <div style={{ marginTop: '20px' }}>
            <strong>In Context:</strong>
            <MessageBubble>
              <BubbleContent>Hi there! What's up?</BubbleContent>
            </MessageBubble>
            {typingUsers.length > 0 && <TypingIndicator usernames={typingUsers} />}
          </div>
        </div>

        <CodeBlock>{`<TypingIndicator
  usernames={${JSON.stringify(typingUsers)}}
/>`}</CodeBlock>
      </Section>

      {/* Usage Documentation */}
      <Section>
        <SectionTitle>📖 Usage Documentation</SectionTitle>

        <h3 style={{ marginBottom: '12px', fontSize: '1rem' }}>Delivery Receipts</h3>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          <strong>Status Types:</strong>
        </p>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
          <li><strong>sent:</strong> Single gray checkmark ✓ - Message sent to server</li>
          <li><strong>delivered:</strong> Double gray checkmarks ✓✓ - Delivered to recipient's device</li>
          <li><strong>read:</strong> Double blue checkmarks ✓✓ - Read by recipient(s)</li>
        </ul>

        <h3 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '1rem' }}>Typing Indicators</h3>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          <strong>Display Logic:</strong>
        </p>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
          <li><strong>1 person:</strong> "Alice is typing..."</li>
          <li><strong>2 people:</strong> "Alice and Bob are typing..."</li>
          <li><strong>3+ people:</strong> "3 people are typing..."</li>
        </ul>

        <h3 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '1rem' }}>WebSocket Integration</h3>
        <CodeBlock>{`// Listen for message read events
socket.on('message:read', (data) => {
  updateMessageStatus(data.messageId, 'read');
});

// Listen for typing events
socket.on('user:typing', (data) => {
  showTypingIndicator(data.username);
});

socket.on('user:stop-typing', (data) => {
  hideTypingIndicator(data.username);
});`}</CodeBlock>
      </Section>

      {/* Real-world Example */}
      <Section>
        <SectionTitle>💬 Real-world Chat Example</SectionTitle>

        <div>
          <MessageBubble>
            <BubbleContent>
              Hey! Did you see my message?
            </BubbleContent>
            <BubbleFooter>
              <span>Yesterday</span>
              <ReadReceipt status="read" readBy={sampleReadBy} showTooltip />
            </BubbleFooter>
          </MessageBubble>

          <MessageBubble isOwn={true}>
            <BubbleContent isOwn={true}>
              Yes! Let's meet tomorrow at 3pm
            </BubbleContent>
            <BubbleFooter>
              <span>10:15 AM</span>
              <ReadReceipt status="delivered" />
            </BubbleFooter>
          </MessageBubble>

          <MessageBubble isOwn={true}>
            <BubbleContent isOwn={true}>
              Does that work for you?
            </BubbleContent>
            <BubbleFooter>
              <span>10:15 AM</span>
              <ReadReceipt status="sent" />
            </BubbleFooter>
          </MessageBubble>

          {showTyping && typingUsers.length > 0 && (
            <TypingIndicator usernames={typingUsers} />
          )}
        </div>
      </Section>

      {/* Testing Instructions */}
      <Section>
        <SectionTitle>🧪 How to Test in Real Messaging</SectionTitle>

        <ol style={{ marginLeft: '20px', lineHeight: '1.8' }}>
          <li>Open two browser windows (or use incognito mode for second user)</li>
          <li>Login as different users in each window</li>
          <li>Start a conversation between the two users</li>
          <li><strong>Test Delivery Receipts:</strong>
            <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
              <li>Send a message from User 1 - should show single checkmark (sent)</li>
              <li>Wait for WebSocket delivery - should show double gray checks (delivered)</li>
              <li>Switch to User 2 window and read the message</li>
              <li>Back to User 1 - should see double blue checks (read)</li>
            </ul>
          </li>
          <li><strong>Test Typing Indicators:</strong>
            <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
              <li>In User 2 window, start typing in the message box</li>
              <li>User 1 should see "User2 is typing..." with animated dots</li>
              <li>Stop typing - indicator should disappear after 3-5 seconds</li>
            </ul>
          </li>
        </ol>

        <p style={{ marginTop: '16px', padding: '12px', background: '#e3f2fd', borderRadius: '6px' }}>
          <strong>Note:</strong> Make sure the WebSocket server is running on port 3002 for real-time features to work!
        </p>
      </Section>
    </Container>
  );
};

export default ReceiptsTestPage;
