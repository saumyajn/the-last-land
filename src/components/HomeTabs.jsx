import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';

export default function HomeTabs() {
  const location = useLocation();
  
  // Ensure the active tab exactly matches the current route
  const currentPath = location.pathname;

  return (
    <Box sx={{ width: '100%', borderBottom: 1, borderColor: 'divider' }}>
      <Tabs 
        value={currentPath} 
        variant="scrollable" 
        scrollButtons="auto"
      >
        {/* About is now the first tab and maps to the root path */}
        <Tab label="Overview" value="/" component={Link} to="/" />
        <Tab label="Data Upload" value="/stats" component={Link} to="/stats" />
        <Tab label="Analytics" value="/analytics" component={Link} to="/analytics" />
        <Tab label="Formations" value="/formation" component={Link} to="/formation" />
        <Tab label="Reports" value="/report" component={Link} to="/report" />
      </Tabs>
    </Box>
  );
}