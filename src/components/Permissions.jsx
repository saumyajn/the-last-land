import React, { createContext, useContext, useState } from "react";
import { Snackbar, Alert } from "@mui/material";

const PermissionContext = createContext();

export function usePermissionSnackbar() {
  return useContext(PermissionContext);
}

export function PermissionSnackbarProvider({ children }) {
  const [open, setOpen] = useState(false);

  const showNoPermission = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <PermissionContext.Provider value={{ showNoPermission }}>
      {children}
      <Snackbar open={open} autoHideDuration={4000} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleClose} severity="warning" sx={{ width: "100%" }}>
          You don’t have permission to perform this action.
        </Alert>
      </Snackbar>
    </PermissionContext.Provider>
  );
}
