import { Box, Button, Dialog, DialogContent, DialogTitle, TextField } from "@mui/material";

interface EditCellProps {
  open: boolean;
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function EditCell({
  open,
  value,
  onChange,
  onClose,
  onSave,
}: EditCellProps) {
  return (
    <Dialog open={open} onClose={onClose}>
			<DialogTitle>Edit Cell</DialogTitle>
			<DialogContent>
				<TextField
					autoFocus
					value={value}
					onChange={(e) => {
            const raw = e.target.value.toUpperCase();
            const filtered = raw.replace(/[^A-Z0-9]/g, "");
            onChange(filtered.slice(0, 3));
          }}
					slotProps={{
						input: {
							inputProps: { maxLength: 3 },
							style: { textAlign: "center" },
						},
					}}
					fullWidth
				/>
				<Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
					<Button onClick={onClose}>Cancel</Button>
					<Button variant="contained" onClick={onSave}>
						Save
					</Button>
				</Box>
			</DialogContent>
		</Dialog>
  );
}
