import { useState } from "react";
import { Button } from "@mui/material";
import CreateGrid from '../../components/grid/CreateGrid';
import api from '../../config/axios';
import type { APIError } from '../../types/error';

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateGrid = async (name: string) => {
    setLoading(true);
    try {
      const response = await api.post("/grids", { name });
      console.log("Grid created:", response.data);
      setModalOpen(false);
    } catch (err: unknown) {
      const apiError: APIError = err as unknown as APIError
      console.error("Failed to create grid:", apiError);
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
