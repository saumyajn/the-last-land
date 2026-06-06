import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper, Fade, Grow, Chip } from '@mui/material';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import SecurityIcon from '@mui/icons-material/Security';
import BarChartIcon from '@mui/icons-material/BarChart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

export default function AboutPage() {
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const FeatureCard = ({ icon, title, subtitle, delay, color }) => (
    <Grow in={mounted} style={{ transformOrigin: 'top center' }} timeout={1000 + delay}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          textAlign: 'center',
          flex: 1,
          minWidth: { xs: '100%', sm: '200px' },
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: `0 10px 30px ${color}20`,
            borderColor: `${color}50`
          }
        }}
      >
        <Box 
          sx={{ 
            mb: 2, width: 56, height: 56, borderRadius: '50%', 
            backgroundColor: `${color}15`, border: `1px solid ${color}50`,
            color: color, display: 'flex', alignItems: 'center',
            justifyContent: 'center', boxShadow: `0 0 20px ${color}30`
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
          {subtitle}
        </Typography>
      </Paper>
    </Grow>
  );

  const ProofCard = ({ title, detail, tags }) => (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        textAlign: 'left',
        backgroundColor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 3,
        minHeight: '100%',
      }}
    >
      <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, mb: 2 }}>
        {detail}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {tags.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            size="small"
            sx={{
              color: '#bfdbfe',
              backgroundColor: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.24)',
              fontWeight: 700,
            }}
          />
        ))}
      </Box>
    </Paper>
  );

  return (
    <Box
      sx={{
        minHeight: '75vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#050505',
        p: { xs: 3, md: 6 },
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '800px', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(168,85,247,0.1) 40%, rgba(0,0,0,0) 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '1000px', width: '100%' }}>
        <Fade in={mounted} timeout={800}>
          <Box sx={{ mb: 6 }}>
            <Typography variant="overline" sx={{ px: 2, py: 0.5, borderRadius: '20px', border: '1px solid rgba(59,130,246,0.3)', backgroundColor: 'rgba(59,130,246,0.1)', color: '#93c5fd', letterSpacing: 2, mb: 3, display: 'inline-block', fontWeight: 'bold' }}>
              The Last Land Companion
            </Typography>
            <Typography variant="h2" sx={{ fontWeight: 900, mb: 3, letterSpacing: '-0.02em', color: '#fff', fontSize: { xs: '2.5rem', md: '4rem' } }}>
              Dominate with <br /> Data-Driven Strategy.
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', maxWidth: '700px', mx: 'auto', lineHeight: 1.6, fontSize: { md: '1.1rem' } }}>
              The ultimate tool for your alliance. Upload game screenshots to instantly extract player stats, optimize your troop formations, and generate comprehensive battle reports.
            </Typography>
          </Box>
        </Fade>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', justifyContent: 'center', gap: 3, mb: 8 }}>
          <FeatureCard icon={<QueryStatsIcon />} title="Stat Extraction" subtitle="Upload screenshots to automatically parse and digitize raw player data." delay={0} color="#3b82f6" />
          <FeatureCard icon={<BarChartIcon />} title="Visual Analytics" subtitle="Track power progression, resource metrics, and alliance growth over time." delay={200} color="#a855f7" />
          <FeatureCard icon={<SecurityIcon />} title="Formations" subtitle="Build, evaluate, and save optimal troop setups for maximum combat efficiency." delay={400} color="#10b981" />
          <FeatureCard icon={<AssessmentIcon />} title="Export Reports" subtitle="Generate beautiful, structured reports to share with your alliance leaders." delay={600} color="#f59e0b" />
        </Box>

        <Box sx={{ mb: 8, textAlign: 'left' }}>
          <Typography variant="overline" sx={{ color: '#93c5fd', letterSpacing: 2, fontWeight: 800 }}>
            Engineering proof
          </Typography>
          <Typography variant="h4" sx={{ color: '#fff', fontWeight: 900, mt: 1, mb: 2 }}>
            Built for messy screenshots, real users, and protected data workflows.
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.62)', maxWidth: 850, lineHeight: 1.7, mb: 3 }}>
            The app combines OCR, OpenCV template matching, deterministic parsing, Firebase-backed analytics, admin controls, and spreadsheet exports. Local emulator mode and fixture tests let development continue without touching production Firebase data.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            <ProofCard
              title="Extraction pipeline"
              detail="Google Vision OCR and OpenCV.js convert screenshot evidence into structured stats and battle report rows."
              tags={['OCR', 'OpenCV', 'Parsing']}
            />
            <ProofCard
              title="Data contract"
              detail="Stats, reports, settings, formations, and analytics are documented so refactors do not change live Firebase shapes by accident."
              tags={['Firestore', 'Analytics', 'Exports']}
            />
            <ProofCard
              title="Safe development"
              detail="Emulator scripts and synthetic fixtures support local testing while real users continue using the production dataset."
              tags={['Emulators', 'Fixtures', 'Regression tests']}
            />
          </Box>
        </Box>

        <Fade in={mounted} timeout={2000}>
          <Box>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/stats')} 
              startIcon={<PlayArrowIcon />}
              sx={{
                backgroundColor: '#fff', color: '#000', fontWeight: 'bold', px: 6, py: 1.5,
                borderRadius: '50px', textTransform: 'none', fontSize: '1.1rem',
                boxShadow: '0 0 20px rgba(255,255,255,0.15)', transition: 'all 0.3s ease',
                '&:hover': { backgroundColor: '#3b82f6', color: '#fff', boxShadow: '0 0 40px rgba(59,130,246,0.4)', transform: 'translateY(-2px)' }
              }}
            >
              Start Extracting Data
            </Button>
          </Box>
        </Fade>
      </Box>
    </Box>
  );
}
