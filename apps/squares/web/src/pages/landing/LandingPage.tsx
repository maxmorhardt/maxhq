import { useState } from "react";
import { Button } from "@mui/material";
import CreateGrid from "../../components/grid/CreateGrid";
import type { APIError } from "../../types/error";
import { createGrid } from '../../service/gridService';

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateGrid = async (name: string) => {
    setLoading(true);
    try {
      const grid = await createGrid(name);
      console.log("grid created:", grid);
      setModalOpen(false);
    } catch (err: unknown) {
      const apiError = err as APIError;
      alert(apiError.message);
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
      />
    </>
  );
}
