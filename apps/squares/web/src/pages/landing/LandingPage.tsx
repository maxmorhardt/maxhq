import { Box, Button } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CreateGrid from "../../components/grid/CreateGrid";
import { createGrid } from "../../service/gridService";
import type { APIError } from "../../types/error";

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();

  const handleCreateGrid = async (name: string) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const grid = await createGrid(name);
      setModalOpen(false);
      navigate(`/grids/${grid.id}`);
    } catch (err: unknown) {
      const apiError = err as APIError;
      setErrorMessage(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
			<Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
				<Button variant="contained" onClick={() => setModalOpen(true)}>
					Get Started
				</Button>
			</Box>
		
      <CreateGrid
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreateGrid}
        loading={loading}
        errorMessage={errorMessage}
      />
    </>
  );
}
