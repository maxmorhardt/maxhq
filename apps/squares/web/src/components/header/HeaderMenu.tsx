import HowToRegIcon from '@mui/icons-material/HowToReg';
import LoginIcon from '@mui/icons-material/Login';
import MenuIcon from '@mui/icons-material/Menu';
import { Divider } from '@mui/material';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import type { JSX } from 'react';
import { useAuth } from 'react-oidc-context';

interface HeaderMenuProps {
	handleOpenNavMenu: (event: React.MouseEvent<HTMLElement>) => void
	handleCloseNavMenu: () => void
	handleRegister: () => void
	anchorElNav: null | HTMLElement
	pages: { name: string, icon: JSX.Element}[]
}

export default function HeaderMenu({
	handleOpenNavMenu,
	handleCloseNavMenu,
	handleRegister,
	anchorElNav,
	pages
}: HeaderMenuProps) {
	const auth = useAuth();

	return (
		<Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
			<IconButton
				size="large"
				aria-label="menu"
				onClick={handleOpenNavMenu}
				color="inherit"
			>
				<MenuIcon />
			</IconButton>
			<Menu
				id="menu-appbar"
				anchorEl={anchorElNav}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
				transformOrigin={{ vertical: 'top', horizontal: 'left' }}
				open={Boolean(anchorElNav)}
				onClose={handleCloseNavMenu}
				sx={{ display: { xs: 'block', md: 'none' } }}
			>
				{pages.map(page => (
					<MenuItem key={page.name} onClick={handleCloseNavMenu}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							{page.icon}
							<Typography>{page.name}</Typography>
						</Box>
					</MenuItem>
				))}

				{/* Mobile Login/Register */}
				{!auth.isAuthenticated && <Divider />}
				{!auth.isAuthenticated && (
					<MenuItem onClick={() => { 
						auth.signinRedirect(); 
						handleCloseNavMenu();
					}}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<LoginIcon fontSize="small" />
							<Typography>Login</Typography>
						</Box>
					</MenuItem>
				)}
				{!auth.isAuthenticated && (
					<MenuItem onClick={() => { 
						handleRegister(); 
						handleCloseNavMenu(); 
					}}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<HowToRegIcon fontSize="small" />
							<Typography>Register</Typography>
						</Box>
					</MenuItem>
				)}
			</Menu>
		</Box>
	)
}