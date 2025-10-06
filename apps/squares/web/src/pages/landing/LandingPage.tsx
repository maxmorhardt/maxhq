import { Button } from "@mui/material";
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
      console.log("grid created:", grid);
      setModalOpen(false);
      navigate(`/grids/${grid.id}`);
    } catch (err: unknown) {
      const apiError = err as APIError;
      setErrorMessage(apiError.message || "Failed to create grid");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="contained" onClick={() => setModalOpen(true)}>
        Get Started
      </Button>

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
