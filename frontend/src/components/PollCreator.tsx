/**
 * Poll Creator component for creating polls in group posts
 */

import React, { useState } from 'react';
import styled from 'styled-components';

interface PollOption {
  text: string;
  id: string;
}

interface PollCreatorProps {
  onChange: (pollData: {
    question: string;
    options: string[];
    endsAt: string | null;
    allowMultiple: boolean;
  }) => void;
}

const Container = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
`;

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const Input = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: 14px;
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  background: white;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const OptionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const OptionRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: center;
`;

const OptionInput = styled(Input)`
  flex: 1;
`;

const RemoveButton = styled.button`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.error};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const AddButton = styled.button`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.secondary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
  margin-top: ${({ theme }) => theme.spacing.xs};

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
`;

const HelpText = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.muted};
  margin: ${({ theme }) => theme.spacing.xs} 0 0 0;
`;

const PollCreator: React.FC<PollCreatorProps> = ({ onChange }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOption[]>([
    { id: '1', text: '' },
    { id: '2', text: '' }
  ]);
  const [endsAt, setEndsAt] = useState('');
  const [allowMultiple, setAllowMultiple] = useState(false);

  const handleChange = (updatedOptions?: PollOption[]) => {
    const opts = updatedOptions || options;
    onChange({
      question,
      options: opts.filter(o => o.text.trim()).map(o => o.text.trim()),
      endsAt: endsAt || null,
      allowMultiple
    });
  };

  const handleQuestionChange = (value: string) => {
    setQuestion(value);
    setTimeout(() => handleChange(), 0);
  };

  const handleOptionChange = (id: string, value: string) => {
    const updated = options.map(opt =>
      opt.id === id ? { ...opt, text: value } : opt
    );
    setOptions(updated);
    setTimeout(() => handleChange(updated), 0);
  };

  const handleAddOption = () => {
    if (options.length < 10) {
      const newOption = { id: Date.now().toString(), text: '' };
      const updated = [...options, newOption];
      setOptions(updated);
      setTimeout(() => handleChange(updated), 0);
    }
  };

  const handleRemoveOption = (id: string) => {
    if (options.length > 2) {
      const updated = options.filter(opt => opt.id !== id);
      setOptions(updated);
      setTimeout(() => handleChange(updated), 0);
    }
  };

  const handleEndsAtChange = (value: string) => {
    setEndsAt(value);
    setTimeout(() => handleChange(), 0);
  };

  const handleAllowMultipleChange = (checked: boolean) => {
    setAllowMultiple(checked);
    setTimeout(() => handleChange(), 0);
  };

  return (
    <Container>
      <Title>Create Poll</Title>

      <FormGroup>
        <Label htmlFor="poll-question">Poll Question</Label>
        <Input
          id="poll-question"
          type="text"
          placeholder="Ask a question..."
          value={question}
          onChange={(e) => handleQuestionChange(e.target.value)}
          maxLength={500}
        />
        <HelpText>{question.length}/500 characters</HelpText>
      </FormGroup>

      <FormGroup>
        <Label>Poll Options</Label>
        <OptionsList>
          {options.map((option, index) => (
            <OptionRow key={option.id}>
              <OptionInput
                type="text"
                placeholder={`Option ${index + 1}`}
                value={option.text}
                onChange={(e) => handleOptionChange(option.id, e.target.value)}
                maxLength={200}
              />
              <RemoveButton
                type="button"
                onClick={() => handleRemoveOption(option.id)}
                disabled={options.length <= 2}
              >
                Remove
              </RemoveButton>
            </OptionRow>
          ))}
        </OptionsList>
        <AddButton
          type="button"
          onClick={handleAddOption}
          disabled={options.length >= 10}
        >
          + Add Option
        </AddButton>
        <HelpText>Add 2-10 options for your poll</HelpText>
      </FormGroup>

      <FormGroup>
        <Label htmlFor="poll-ends-at">Poll End Date (Optional)</Label>
        <Input
          id="poll-ends-at"
          type="datetime-local"
          value={endsAt}
          onChange={(e) => handleEndsAtChange(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
        />
        <HelpText>Leave empty for polls that don't expire</HelpText>
      </FormGroup>

      <CheckboxContainer>
        <Checkbox
          id="allow-multiple"
          type="checkbox"
          checked={allowMultiple}
          onChange={(e) => handleAllowMultipleChange(e.target.checked)}
        />
        <CheckboxLabel htmlFor="allow-multiple">
          Allow multiple votes
        </CheckboxLabel>
      </CheckboxContainer>
    </Container>
  );
};

export default PollCreator;
