import { Box, Button } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CreateGrid from "../../components/grid/CreateGrid";

export default function LandingPage() {
	const navigate = useNavigate();

  const [open, setOpen] = useState(false);

	const handleOnClose = (id: string) => {
		setOpen(false)

		if (id) {
			navigate(`/grids/${id}`)
		}
	};

  return (
    <>
			<Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
				<Button variant="contained" onClick={() => setOpen(true)}>
					Get Started
				</Button>
			</Box>
		
      <CreateGrid
        open={open}
        onClose={id => handleOnClose(id)}
      />
    </>
  );
}
