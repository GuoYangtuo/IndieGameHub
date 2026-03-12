import React from 'react';
import { Box, Collapse, FormControlLabel, Checkbox, Typography } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';

interface FeaturePreviewProps {
  featureKey: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  darkImage: string;
  lightImage: string;
}

const FeaturePreview: React.FC<FeaturePreviewProps> = ({
  featureKey,
  label,
  description,
  checked,
  onChange,
  darkImage,
  lightImage,
}) => {
  const { isDarkMode } = useTheme();
  const imageSrc = isDarkMode ? darkImage : lightImage;

  return (
    <Box sx={{ mb: 1.5 }}>
      <FormControlLabel
        control={
          <Checkbox
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            color="primary"
          />
        }
        label={
          <Typography variant="body1">
            {label}
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              {description}
            </Typography>
          </Typography>
        }
      />
      <Collapse in={checked}>
        <Box
          sx={{
            ml: 0,
            mt: 1,
            mb: 0,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <img
            src={imageSrc}
            alt={`${label} preview`}
            style={{
              width: '100%',
              maxWidth: '600px',
              height: 'auto',
              display: 'block',
              margin: '0 auto',
              borderRadius: 10,
            }}
          />
        </Box>
      </Collapse>
    </Box>
  );
};

export default FeaturePreview;
