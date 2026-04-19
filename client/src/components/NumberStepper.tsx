import React from 'react';
import { Box, IconButton, Typography, Paper } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';

interface NumberStepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  helperText?: string;
}

export const NumberStepper: React.FC<NumberStepperProps> = ({
  label,
  value,
  onChange,
  min = 1,
  max = 999,
  helperText,
}) => {
  const handleDecrement = () => {
    onChange(Math.max(min, value - 1));
  };

  const handleIncrement = () => {
    onChange(Math.min(max, value + 1));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || min;
    onChange(Math.min(max, Math.max(min, newValue)));
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          display: 'flex',
          alignItems: 'center',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <IconButton
          onClick={handleDecrement}
          disabled={value <= min}
          sx={{
            borderRadius: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            px: 1.5,
            '&:disabled': {
              opacity: 0.4,
            },
          }}
        >
          <Remove fontSize="small" />
        </IconButton>
        <Box
          component="input"
          type="number"
          value={value}
          onChange={handleInputChange}
          sx={{
            flex: 1,
            border: 'none',
            outline: 'none',
            textAlign: 'center',
            py: 0.75,
            fontSize: '0.95rem',
            fontFamily: 'inherit',
            width: '100%',
            minWidth: 0,
            '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
              WebkitAppearance: 'none',
              margin: 0,
            },
            '&[type=number]': {
              MozAppearance: 'textfield',
            },
          }}
        />
        <IconButton
          onClick={handleIncrement}
          disabled={value >= max}
          sx={{
            borderRadius: 0,
            borderLeft: '1px solid',
            borderColor: 'divider',
            px: 1.5,
            '&:disabled': {
              opacity: 0.4,
            },
          }}
        >
          <Add fontSize="small" />
        </IconButton>
      </Paper>
      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

export default NumberStepper;
