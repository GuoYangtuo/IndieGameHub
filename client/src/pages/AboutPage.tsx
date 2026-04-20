import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Paper, Chip, Divider, Alert, CircularProgress } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// Custom components for rendering markdown elements with MUI styling
const MarkdownComponents = {
  h1: (props: any) => {
    const { isDarkMode } = useTheme();
    return (
      <Typography
        variant="h4"
        component="h1"
        sx={{
          fontWeight: 800,
          mt: 4,
          mb: 2,
          color: 'text.primary',
          borderBottom: `2px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          pb: 1,
        }}
        {...props}
      />
    );
  },
  h2: (props: any) => {
    const { isDarkMode } = useTheme();
    return (
      <Typography
        variant="h5"
        component="h2"
        sx={{
          fontWeight: 700,
          mt: 4,
          mb: 2,
          color: 'text.primary',
          borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          pb: 0.5,
        }}
      >
        {props.children}
      </Typography>
    );
  },
  p: (props: any) => (
    <Typography
      variant="body1"
      component="p"
      sx={{ mb: 2, lineHeight: 1.8, color: 'text.secondary' }}
      {...props}
    />
  ),
  ul: (props: any) => (
    <Box component="ul" sx={{ pl: 3, mb: 2, color: 'text.secondary' }}>
      {props.children}
    </Box>
  ),
  li: (props: any) => (
    <Box component="li" sx={{ mb: 0.5, lineHeight: 1.7 }}>
      <Typography variant="body2" component="span" sx={{ color: 'text.secondary' }}>
        {props.children}
      </Typography>
    </Box>
  ),
  strong: (props: any) => (
    <Typography
      component="strong"
      sx={{ fontWeight: 700, color: 'text.primary' }}
    >
      {props.children}
    </Typography>
  ),
};

const AboutPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/网站介绍.md')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load markdown file');
        return res.text();
      })
      .then(text => {
        setMarkdown(text);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Markdown Content */}
      <Box sx={{ position: 'relative' }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={MarkdownComponents as any}
        >
          {markdown}
        </ReactMarkdown>
      </Box>
    </Container>
  );
};

export default AboutPage;
