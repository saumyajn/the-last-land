import React, { useContext, useState, useEffect } from "react";
import {
  Box, Avatar, AppBar, Toolbar, IconButton, Typography, Button,
  useMediaQuery, Menu, MenuItem
} from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import { useTheme } from "@mui/material/styles";
import { useLocation, useNavigate } from "react-router-dom";
import { signInWithGoogle, logout } from "../utils/auth";
import { AuthContext } from "../utils/authContext"

export default function Header() {
  const { user, isAdmin } = useContext(AuthContext);
  const [anchorEl, setAnchorEl] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setAnchorEl(null); // Close menu on route change
  }, [location.pathname]);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const isMenuOpen = Boolean(anchorEl);

  return (
    <Box sx={{ backgroundColor: '#360652', borderBottom: '1px solid #ddd' }}>
      <AppBar position="static" elevation={0} sx={{ borderBottom: '1px solid #ddd', backgroundColor: '#360652' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box display="flex" alignItems="center" sx={{ flexGrow: 1 }}>
            <Avatar
              src="/logo192.png"
              alt="Logo"
              sx={{ width: 36, height: 36, mr: 1, cursor: 'pointer' }}
              onClick={() => navigate("/about")}
            />
            <Typography variant="h6" noWrap sx={{ fontWeight: 'bold' }}>
              The Last Land
            </Typography>
          </Box>

          {user ? (
            isMobile ? (
              <>
                <IconButton edge="end" color="inherit" onClick={handleMenuOpen}>
                  <MenuIcon />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={isMenuOpen}
                  onClose={handleMenuClose}
                  anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  keepMounted
                >
                  <MenuItem disabled>{user.displayName} ({isAdmin ? "Admin" : "View only"})</MenuItem>
                  <MenuItem onClick={() => { logout(); handleMenuClose(); }}>
                    <LogoutIcon sx={{ mr: 1 }} /> Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Typography variant="body1" sx={{ mr: 2 }}>
                  {user.displayName} ({isAdmin ? "Admin" : "View only"})
                </Typography>
                <Button variant="outlined" size="small" color="inherit" onClick={logout}>
                  <LogoutIcon sx={{ mr: 1 }} /> Logout
                </Button>
              </>
            )
          ) : (
            <Button variant="outlined" size="small" color="inherit" onClick={signInWithGoogle}>
              <LoginIcon sx={{ mr: 1 }} /> Login
            </Button>
          )}
        </Toolbar>
      </AppBar>
    </Box>
  );
}
