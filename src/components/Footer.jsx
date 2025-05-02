import { Box, Typography, Link, useTheme } from '@mui/material';
import React from 'react';

export default function Footer() {
  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
      
        mt: 6,
        py: 3,
        px: { xs: 2, md: 4 },
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: { xs: 2, md: 0 },
          textAlign: { xs: 'center', md: 'left' },
        }}
      >
        <Typography variant="body2">
          Built with <strong>React</strong>, <strong>Firebase Auth</strong>, <strong>FireStore</strong>, <strong>Google Vision API</strong>, <strong>Material UI</strong>
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', alignItems:'center' }}>
          <Link href="https://github.com/saumyajn" target="_blank" underline="hover" color="text.primary">
            GitHub
          </Link>
          <Link href="https://www.linkedin.com/in/saumya-jain06/" target="_blank" underline="hover" color="text.primary">
            LinkedIn
          </Link>
          <Link href="mailto:saumyajn1994@gmail.com" underline="hover" color="text.primary">
            Email
          </Link>
        </Box>

        <Box sx={{ textAlign: { xs: 'center', md: 'right' } }}>
          <Typography variant="body2" color="text.secondary">
            Designed & developed by Saumya Jain
          </Typography>
          <Typography variant="body2" color="text.secondary">
            &copy; {new Date().getFullYear()} All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}