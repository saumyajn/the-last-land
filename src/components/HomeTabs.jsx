import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import QueryStatsOutlinedIcon from '@mui/icons-material/QueryStatsOutlined';

const tabs = [
  { label: "Overview", value: "/", icon: <AutoAwesomeOutlinedIcon fontSize="small" /> },
  { label: "Data Upload", value: "/stats", icon: <QueryStatsOutlinedIcon fontSize="small" /> },
  { label: "Analytics", value: "/analytics", icon: <AnalyticsOutlinedIcon fontSize="small" /> },
  { label: "Formations", value: "/formation", icon: <GridViewOutlinedIcon fontSize="small" /> },
  { label: "Reports", value: "/report", icon: <AssessmentOutlinedIcon fontSize="small" /> },
];

export default function HomeTabs({ onPrefetchRoute }) {
  const location = useLocation();
  
  // Ensure the active tab exactly matches the current route
  const currentPath = tabs.some(tab => tab.value === location.pathname) ? location.pathname : "/";

  return (
    <Box
      sx={{
        width: '100%',
        borderBottom: '1px solid rgba(15,23,42,0.08)',
        backgroundColor: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(14px)',
        position: 'sticky',
        top: { xs: 60, md: 68 },
        zIndex: 20,
      }}
    >
      <Tabs 
        value={currentPath} 
        variant="scrollable" 
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          minHeight: 48,
          px: { xs: 0.5, md: 3 },
          '& .MuiTab-root': {
            minHeight: 52,
            minWidth: { xs: 108, sm: 128 },
            textTransform: 'none',
            fontWeight: 700,
            color: 'text.secondary',
            borderRadius: 2,
            my: 0.75,
            mx: 0.25,
            transition: 'background-color 180ms ease, color 180ms ease',
            '&:hover': {
              backgroundColor: 'rgba(29,78,216,0.06)',
              color: 'primary.dark',
            },
          },
          '& .Mui-selected': {
            color: 'primary.dark',
            backgroundColor: 'rgba(29,78,216,0.08)',
          },
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: 999,
            backgroundColor: 'secondary.main',
          },
        }}
      >
        {tabs.map(tab => (
          <Tab
            key={tab.value}
            label={tab.label}
            value={tab.value}
            icon={tab.icon}
            iconPosition="start"
            component={Link}
            to={tab.value}
            onMouseEnter={() => onPrefetchRoute?.(tab.value)}
            onFocus={() => onPrefetchRoute?.(tab.value)}
          />
        ))}
      </Tabs>
    </Box>
  );
}
