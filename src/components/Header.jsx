import { useContext, useState, useEffect } from "react";
import {
  Box, Avatar, AppBar, Toolbar, IconButton, Typography, Button,
  useMediaQuery, Menu, MenuItem, Chip
} from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VisibilityIcon from '@mui/icons-material/Visibility';
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
  const roleLabel = isAdmin ? "Admin" : "View only";
  const roleIcon = isAdmin ? <AdminPanelSettingsIcon /> : <VisibilityIcon />;

  return (
    <Box sx={{ backgroundColor: 'background.paper' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          top: 0,
          zIndex: 30,
          color: 'text.primary',
          background: 'rgba(230, 202, 235, 0.92)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(15,23,42,0.08)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: { xs: 60, md: 68 } }}>
          <Box display="flex" alignItems="center" sx={{ flexGrow: 1 }}>
            <Avatar
              src="/logo192.png"
              alt="Logo"
              sx={{
                width: 42,
                height: 42,
                mr: 1.5,
                cursor: 'pointer',
                border: '1px solid rgba(15,23,42,0.1)',
                boxShadow: '0 8px 20px rgba(15,23,42,0.1)',
              }}
              onClick={() => navigate("/")}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" noWrap sx={{ fontWeight: 900, lineHeight: 1.1, color: 'text.primary' }}>
                The Last Land
              </Typography>
              <Typography variant="caption" noWrap sx={{ display: { xs: 'none', sm: 'block' }, color: 'text.secondary', fontWeight: 650 }}>
                OCR analytics workspace
              </Typography>
            </Box>
          </Box>

          {user ? (
            isMobile ? (
              <>
                <IconButton edge="end" color="primary" onClick={handleMenuOpen} aria-label="Open account menu">
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
                  <MenuItem disabled>{user.displayName} ({roleLabel})</MenuItem>
                  <MenuItem onClick={() => { logout(); handleMenuClose(); }}>
                    <LogoutIcon sx={{ mr: 1 }} /> Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Typography variant="body2" sx={{ mr: 1.5, maxWidth: 280, color: 'text.secondary', fontWeight: 650 }} noWrap>
                  {user.displayName}
                </Typography>
                <Chip
                  icon={roleIcon}
                  label={roleLabel}
                  size="small"
                  sx={{
                    mr: 2,
                    color: isAdmin ? 'secondary.dark' : 'primary.dark',
                    backgroundColor: isAdmin ? 'secondary.light' : 'primary.light',
                    border: '1px solid rgba(15,23,42,0.08)',
                    '& .MuiChip-icon': { color: 'inherit' },
                  }}
                />
                <Button variant="outlined" size="small" color="primary" onClick={logout}>
                  <LogoutIcon sx={{ mr: 1 }} /> Logout
                </Button>
              </>
            )
          ) : (
            <Button variant="contained" size="small" color="primary" onClick={signInWithGoogle}>
              <LoginIcon sx={{ mr: 1 }} /> Login
            </Button>
          )}
        </Toolbar>
      </AppBar>
    </Box>
  );
}
