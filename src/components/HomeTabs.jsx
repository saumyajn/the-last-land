// src/components/HomeTabs.jsx
import { Tabs, Tab, Box } from "@mui/material";
import { useNavigate, useLocation} from "react-router-dom";

export default function HomeTabs() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabIndex = ["/stats", "/formation", "/report", "/analytics", "/about"].indexOf(location.pathname);

  const handleChange = (event, newValue) => {
    const routes = ["/stats", "/formation", "/report", "/analytics", "/about"];
    navigate(routes[newValue]);
  };

  return (
    <Box>
      <Tabs
        value={tabIndex === -1 ? false : tabIndex}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        textColor="secondary"
        indicatorColor="secondary"
        sx={{
          "& .MuiTab-root": {
            fontWeight: "bold",
            fontSize: "1rem",
            textTransform: "none",
            px: 4,
            py: 2
          },
          "& .Mui-selected": {
            color: "#1976d2"
          }
        }}
      >
        <Tab label="Stats" />
        <Tab label="Formation" />
        <Tab label="Report" />
        <Tab label="Analytics" />
        <Tab label="About" />
      </Tabs>
    </Box>
  );
}
